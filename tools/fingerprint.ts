// A fingerprint of what an edition does, to show that a change to the shared engine leaves it unchanged: every NLU
// test's reading, every sim's whole transcript on 12 seeds, every corpus and held-out sentence's reading, and every
// sentence the game can speak (tools/enumerate.ts, with its random conversations). Each part is hashed per situation.
//
//   npx tsx tools/fingerprint.ts --out=before.json          (before the change)
//   npx tsx tools/fingerprint.ts --diff=before.json         (after it: lists every situation and part that differs)
//   npx tsx tools/fingerprint.ts s72 --part=sims --dump     (prints the records themselves, to find the difference)
//
// For the Spanish edition, run it the same way with EDITION=es (docs/es/EDITIONS.md).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { buildNlu } from "../src/convo/dialogue";
import { setKnownNames } from "../src/convo/slots";
import { EDITION } from "../src/edition";
import { playSim } from "./sim-play";
import { situationContexts } from "./contexts";
import { enumerateAll } from "./enumerate";
import type { SituationDef } from "../src/content/types";

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith("--out="))?.slice(6);
const diff = args.find((a) => a.startsWith("--diff="))?.slice(7);
const only = args.find((a) => a.startsWith("--part="))?.slice(7);
const dump = args.includes("--dump");
const filters = args.filter((a) => !a.startsWith("--"));
const sits = SITUATIONS.filter((s) => !filters.length || filters.some((f) => s.id.startsWith(f)));

setKnownNames([EDITION.simPlayer.name, EDITION.simPlayer.surname]);

const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
const round = (n: number) => Math.round(n * 1e6) / 1e6;
const parsed = (p: any) => p ? { segs: p.segments.map((s: any) => [s.intent, s.slots, s.tags]), yn: p.yn ?? null, flags: [...p.flags].sort(), cost: round(p.cost) } : null;

function tests(sit: SituationDef) {
  const nlu = buildNlu(sit, GLOBAL, NPCS);
  return (sit.tests ?? []).map((t) => {
    const st = t.step ? sit.steps.find((x) => x.id === t.step) : undefined;
    const exp = t.step ? [...(st?.expects || []), ...Object.keys(sit.intents).filter((k) => k.endsWith("_ctx") && (st?.expects || []).includes(k))] : [];
    const r = nlu.parse(t.say, exp);
    return [t.say, t.step ?? null, r.ok, parsed(r.best), r.alternatives.map(parsed), r.prefix, nlu.probe(t.say, exp)];
  });
}

function sims(sit: SituationDef) {
  const recs: unknown[] = [];
  for (const sim of sit.sims ?? []) for (let seed = 1; seed <= 12; seed++) {
    const r = playSim(sit, sim, seed);
    const lines = (o: any) => o.lines.map((l: any) => [l.npc, l.lineId, l.variant, l.sentence.en, l.sentence.nat, l.sentence.say, l.sentence.units]);
    recs.push([sim.name, seed, lines(r.start), r.turns.map((t) => [t.say, t.auto, t.waiting, t.moved, t.out.understood, lines(t.out)]),
      r.conv.completed, r.unused, r.misplaced, r.openAtCompletion, JSON.stringify(r.conv.s)]);
  }
  return recs;
}

function corpus(dir: string) {
  const bySit: Record<string, unknown[]> = {};
  if (!existsSync(dir)) return bySit;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const c = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    const sit = sits.find((s) => s.id === c.situation);
    if (!sit) continue;
    const nlu = buildNlu(sit, GLOBAL, NPCS);
    const { contexts } = situationContexts(sit);
    (bySit[sit.id] ??= []).push(...c.items.map((it: any) => {
      const exp = it.ctx ? contexts[it.ctx]?.expects ?? [] : [];
      const r = nlu.parse(it.say, exp);
      return [it.say, it.ctx ?? null, r.ok, parsed(r.best)];
    }));
  }
  return bySit;
}

const parts: Record<string, Record<string, unknown[]>> = {};
const want = (p: string) => !only || only === p;
if (want("tests")) parts.tests = Object.fromEntries(sits.map((s) => [s.id, tests(s)]));
if (want("sims")) parts.sims = Object.fromEntries(sits.map((s) => [s.id, sims(s)]));
if (want("corpus")) parts.corpus = corpus(EDITION.corpusDir);
if (want("heldout")) parts.heldout = corpus(EDITION.heldoutDir);
if (want("speak")) {
  // every sentence the game can speak, with its voice and where it was found
  const { utts, errors } = enumerateAll({ fuzzRuns: 40, sits });
  const bySit: Record<string, unknown[]> = {};
  for (const u of utts) (bySit[u.where.split(":")[0]] ??= []).push([u.voice, u.speed, u.say, u.en, u.where]);
  for (const k of Object.keys(bySit)) bySit[k].sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
  bySit.__errors = errors;
  parts.speak = bySit;
}

if (dump) { console.log(JSON.stringify(parts, null, 1)); process.exit(0); }

const print: Record<string, Record<string, string>> = {};
for (const [p, bySit] of Object.entries(parts)) {
  print[p] = {};
  for (const [id, recs] of Object.entries(bySit)) print[p][id] = `${recs.length}:${hash(recs)}`;
}
if (out) { writeFileSync(out, JSON.stringify({ edition: EDITION.id, parts: print }, null, 1)); console.log(`wrote ${out}`); }
if (diff) {
  const before = JSON.parse(readFileSync(diff, "utf8")).parts as typeof print;
  let n = 0;
  for (const p of Object.keys(print)) {
    const ids = new Set([...Object.keys(before[p] ?? {}), ...Object.keys(print[p])]);
    for (const id of ids) if (before[p]?.[id] !== print[p][id]) { n++; console.log(`✗ ${p} ${id}: ${before[p]?.[id] ?? "—"} → ${print[p][id] ?? "—"}`); }
  }
  console.log(n ? `\n✗ ${n} parts differ` : "✓ identical");
  process.exit(n ? 1 : 0);
}
if (!out && !diff) for (const [p, m] of Object.entries(print)) console.log(p, Object.keys(m).length, hash(m));
