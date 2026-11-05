// Checks the voice list (<work>/lines.json, lines-es.ts) against what the game says in other runs than the list's own:
// random runs from another seed (--first=1000), every sim on more seeds, and the probes (runs-es.ts), in both Spanishes.
//  • coverage: every clip they say is in the list (a clip missing plays in the device's robot voice); a missing one
//    is told apart as a speaker the list lacks for that line (the text is there in another voice: "who"), a value
//    ("value"), an item ("item") or anything else;
//  • speakers: every (line, speaker) pair said is in the list in that speaker's voice;
//  • junk: the list's clips nobody was heard saying and made from a guess (lines-es.ts `why`): a speaker nobody was
//    heard saying that line with ("who?"), an item list it was never heard with ("list?"), one or two of an item kind
//    never heard ("qty?"); per conversation, with examples. Values made by reach-es.ts are not junk: they are the point.
// It proves nothing alone (a run can miss a moment); it shows where the list and the game disagree.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/check-list-es.ts [s31 s73 …] [--lines=<lines.json>]
//     [--runs=120] [--first=1000] [--seeds=3] [--json=<out>]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SITUATIONS } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { npcVoice } from "../../src/content/voices";
import { withoutAddressedNames } from "../../src/audio-key";
import { compose, placeholders, setVariety, type Sentence } from "../../src/convo/compose";
import { EDITION } from "../../src/edition";
import { lookFor, observe } from "./runs-es";
import { reachFilter } from "./reach-es";
import type { EsUtt } from "./lines-es";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = args.filter((a) => !a.startsWith("--"));
const WORK = process.env.PC_VOICING ?? path.join(os.homedir(), "puerto-colibri-voicing");
const FILE = flag("lines") ?? path.join(WORK, "lines.json");
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];
const NAMES_RE = new RegExp(`\\b(${NAMES.join("|")})\\b`);
const list: EsUtt[] = JSON.parse(fs.readFileSync(FILE, "utf8"));
const keyOf = (voice: string, speed: number, say: string) => `${voice}|${speed}|${say}`;
const have = new Map(list.map((u) => [keyOf(u.voice, u.speed, u.say), u]));
/** The texts each voice says in the list, to tell a missing speaker from a missing text. */
const textsAnyVoice = new Map<string, Set<string>>();
for (const u of list) { const t = `${u.neutral ? "n" : "m"}|${u.say}`; if (!textsAnyVoice.has(t)) textsAnyVoice.set(t, new Set()); textsAnyVoice.get(t)!.add(u.voice); }

/** The clip the game plays for a sentence (null: none, the browser speaks it; as lines-es.ts's add). */
function clipKey(voice: string, speed: number, s: Sentence): string | null {
  if (!s.say.trim() || /\s[.,!?]/.test(s.say)) return null;
  const alt = withoutAddressedNames(s.say, NAMES);
  const say = alt ?? s.say;
  if (alt === null && NAMES_RE.test(say)) return null;
  return keyOf(voice, speed, say);
}

type Kind = "who" | "value" | "item" | "other";
interface Report { heard: number; clips: number; missing: Record<Kind, Map<string, string>>; pairs: number; pairsMissing: Set<string> }
const reports = new Map<string, Report>();
const runs = Number(flag("runs") ?? 120), first = Number(flag("first") ?? 1000), seeds = Number(flag("seeds") ?? 3);
const heardKeys = new Set<string>();
const t0 = Date.now();
for (const sit of SITUATIONS.filter((s) => !only.length || only.some((o) => s.id.startsWith(o)))) {
  const look = lookFor(sit);
  const r: Report = { heard: 0, clips: 0, missing: { who: new Map(), value: new Map(), item: new Map(), other: new Map() }, pairs: 0, pairsMissing: new Set() };
  reports.set(sit.id, r);
  const pairs = new Map<string, boolean>(); // "line|voice" → every clip of it in the list
  const { errors } = observe(sit, {
    fuzzRuns: runs, firstRun: first, simSeeds: (g) => Array.from({ length: seeds }, (_, i) => i * 10 + (g === "m" ? 1 : 2)),
    onLine: (h) => {
      r.heard++;
      const n = NPCS[h.line.npc];
      const src = (sit.lines[h.line.lineId] ?? GLOBAL.lines[h.line.lineId])?.[h.line.variant];
      for (const variety of ["default", "neutral"] as const) {
        setVariety(variety);
        try {
          const s = variety === "default" ? h.line.sentence : src ? compose(src, h.line.vars, { look, addressee: h.gender, speaker: n.gender ?? "f", formal: !n.informal }) : null;
          if (!s) continue;
          const voice = npcVoice(n), k = clipKey(voice, n.speed ?? 1, s);
          if (!k) continue;
          heardKeys.add(k);
          r.clips++;
          const pk = `${h.line.lineId}|${voice}`;
          const ok = have.has(k);
          pairs.set(pk, (pairs.get(pk) ?? true) && ok);
          if (ok) continue;
          const ph = src ? placeholders(src) : { entities: [], values: [] };
          const say = k.split("|").slice(2).join("|");
          const elsewhere = textsAnyVoice.get(`${variety === "neutral" ? "n" : "m"}|${say}`);
          const kind: Kind = elsewhere?.size ? "who" : ph.values.length ? "value" : ph.entities.length ? "item" : "other";
          let note = `${h.line.lineId} [${h.how}${h.held ? ", held" : ""}] ${voice}: “${say}”`;
          if (kind === "who") note += ` (in the list for ${[...elsewhere!].join(", ")})`;
          if (kind === "value") {
            const f = reachFilter(sit, h.line.lineId);
            const b = Object.fromEntries(ph.values.map((v) => [v, h.line.vars?.[v]]));
            const inList = ph.values.every((v) => sit.domains?.[v]?.().some((d) => JSON.stringify(d) === JSON.stringify(b[v])));
            note += !ph.values.every((v) => sit.domains?.[v]) ? " (a value with no list)" : !inList ? ` (${JSON.stringify(b)} is not in the value list)` : f && !f(b) ? ` (${JSON.stringify(b)} cut by reach-es.ts)` : "";
          }
          r.missing[kind].set(`${h.line.lineId}|${voice}|${say}`, note);
        } finally { setVariety("default"); }
      }
    },
  });
  if (errors.length) console.log(`${sit.id}: ${errors.length} handler errors, e.g. ${errors[0]}`);
  r.pairs = pairs.size;
  for (const [pk, ok] of pairs) if (!ok) r.pairsMissing.add(pk);
  const miss = Object.values(r.missing).reduce((a, m) => a + m.size, 0);
  process.stdout.write(`${sit.id.padEnd(22)} ${String(r.clips).padStart(6)} clips heard, ${miss ? `${miss} not in the list` : "all in the list"}\n`);
}

// ---------------------------------------------------------------- junk: made from a guess, never heard
const doubtful = new Map<string, { n: number; who: number; list: number; qty: number; examples: string[] }>();
for (const u of list) {
  if (!u.why || u.why === "heard" || !/\?/.test(u.why) || heardKeys.has(keyOf(u.voice, u.speed, u.say))) continue;
  const sit = u.where.split(":")[0];
  if (only.length && !only.some((o) => sit.startsWith(o))) continue;
  const d = doubtful.get(sit) ?? { n: 0, who: 0, list: 0, qty: 0, examples: [] };
  d.n++;
  if (u.why.includes("who?")) d.who++;
  if (u.why.includes("list?")) d.list++;
  if (u.why.includes("qty?")) d.qty++;
  if (d.examples.length < 4 && (u.why.includes("who?") || u.why.includes("list?"))) d.examples.push(`${u.where} ${u.voice} “${u.say}” (${u.why})`);
  doubtful.set(sit, d);
}

// ---------------------------------------------------------------- the report
const total = (k: Kind) => [...reports.values()].reduce((a, r) => a + r.missing[k].size, 0);
console.log(`\n${[...reports.values()].reduce((a, r) => a + r.clips, 0)} clips heard in ${Math.round((Date.now() - t0) / 1000)} s (${runs} runs from #${first}, the sims on ${seeds} seeds, the probes), checked against ${FILE} (${list.length} clips)`);
console.log(`not in the list: ${total("who")} a speaker it lacks for that line, ${total("value")} a value, ${total("item")} an item, ${total("other")} other`);
for (const [id, r] of reports) for (const k of ["who", "value", "item", "other"] as Kind[]) for (const note of [...r.missing[k].values()].slice(0, 12)) console.log(`  ${k.padEnd(5)} ${id}: ${note}`);
const pm = [...reports.values()].reduce((a, r) => a + r.pairsMissing.size, 0);
console.log(`\nspeakers: ${[...reports.values()].reduce((a, r) => a + r.pairs, 0)} (line, voice) pairs said; ${pm ? `${pm} with a clip missing in that voice` : "every one in the list in that voice"}`);
for (const [id, r] of reports) if (r.pairsMissing.size) console.log(`  ${id}: ${[...r.pairsMissing].slice(0, 20).join(" ")}`);
const dt = [...doubtful.values()].reduce((a, d) => a + d.n, 0);
console.log(`\njunk check: ${dt} clips made from a guess and not heard here (who? ${[...doubtful.values()].reduce((a, d) => a + d.who, 0)}, list? ${[...doubtful.values()].reduce((a, d) => a + d.list, 0)}, qty? ${[...doubtful.values()].reduce((a, d) => a + d.qty, 0)})`);
for (const [id, d] of [...doubtful].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${id.padEnd(22)} ${String(d.n).padStart(5)}  who? ${d.who}  list? ${d.list}  qty? ${d.qty}${d.examples.length ? "\n      " + d.examples.join("\n      ") : ""}`);
if (flag("json")) fs.writeFileSync(flag("json")!, JSON.stringify({ file: FILE, reports: Object.fromEntries([...reports].map(([id, r]) => [id, { heard: r.heard, clips: r.clips, pairs: r.pairs, pairsMissing: [...r.pairsMissing], missing: Object.fromEntries(Object.entries(r.missing).map(([k, m]) => [k, [...m.values()]])) }])), doubtful: Object.fromEntries(doubtful) }, null, 1));
process.exit(total("who") + total("value") + total("item") + total("other") ? 1 : 0);
