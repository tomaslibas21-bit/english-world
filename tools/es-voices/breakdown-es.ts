// Where the clips come from (docs/es/VOICES.md "The lines"): every key of the line list (<work>/lines.json) labelled by
// what made it: a conversation's plain line, a line with an item, a line with a value (and which value list), a
// rendering only random conversations or sims make, an example answer (coach), a global line, a sound-alike check,
// a passer-by. Per accent set, with the value lists by size and conversation, and per conversation and kind.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/breakdown-es.ts [--lines=<lines.json>] [--json=<out>]
//     [--diff=<an earlier lines.json>]   per conversation and kind: before → after, clips added and removed
// It also runs on Maple Harbor's list for the comparison (no EDITION; --lines=~/english-world/voicing/lines.json).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SITUATIONS } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS, type NpcDef } from "../../src/content/npcs";
import { AMBIENT_LINES } from "../../src/content/ambient";
import { ambientVoice, coachVoices, npcVoice } from "../../src/content/voices";
import { withoutAddressedNames } from "../../src/audio-key";
import { compose, placeholders, setVariety, type Sentence } from "../../src/convo/compose";
import { EDITION } from "../../src/edition";
import type { EntityDef, SituationDef } from "../../src/content/types";
import { BINDINGS, reachOf } from "./reach-es";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const ES = EDITION.id === "es";
const FILE = flag("lines") ?? path.join(os.homedir(), ES ? "puerto-colibri-voicing/lines.json" : "english-world/voicing/lines.json");
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];

interface U { voice: string; speed: number; say: string; where: string; sits?: string[]; neutral?: boolean; why?: string }
const utts: U[] = JSON.parse(fs.readFileSync(FILE, "utf8"));
const BEFORE = flag("diff");
const before: U[] = BEFORE ? JSON.parse(fs.readFileSync(BEFORE, "utf8")) : [];
const keyOf = (voice: string, speed: number, say: string) => `${voice}|${speed}|${say}`;
const have = new Map([...before, ...utts].map((u) => [keyOf(u.voice, u.speed, u.say), u]));

type Cat = "plain" | "entity" | "value" | "hint" | "global" | "global-hint" | "soundcheck" | "ambient";
interface Label { cat: Cat; sit?: string; lid?: string; domains?: string[] }
const PRIORITY: Cat[] = ["plain", "entity", "hint", "global", "global-hint", "soundcheck", "ambient", "value"];
const labels = new Map<string, Label>();
const label = (voice: string, speed: number, s: Sentence, l: Label) => {
  if (!s.say.trim() || /\s[.,!?]/.test(s.say)) return;
  const say = withoutAddressedNames(s.say, NAMES) ?? s.say;
  const k = keyOf(voice, speed, say);
  if (!have.has(k)) return;
  const old = labels.get(k);
  if (!old || PRIORITY.indexOf(l.cat) < PRIORITY.indexOf(old.cat)) labels.set(k, l);
};
const lookFor = (sit: SituationDef) => (id: string): EntityDef | undefined => {
  for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
  return undefined;
};
const v2 = (n: NpcDef) => npcVoice(n, true);
// who speaks in each conversation, as the line list found it
const speakersIn = new Map<string, Set<string>>();
for (const u of [...before, ...utts]) for (const s of u.sits ?? [u.where.split(":")[0]]) { if (!speakersIn.has(s)) speakersIn.set(s, new Set()); speakersIn.get(s)!.add(u.voice); }
const domainSize: Record<string, number> = {};

for (const variety of ES ? (["default", "neutral"] as const) : (["default"] as const)) {
  setVariety(variety);
  for (const sit of SITUATIONS) {
    const look = lookFor(sit);
    const voices = speakersIn.get(sit.id) ?? new Set<string>();
    const people = Object.values(NPCS).filter((n) => voices.has(v2(n)));
    for (const [lid, variants] of Object.entries(sit.lines)) variants.forEach((src) => {
      const ph = placeholders(src);
      const fixed = reachOf(sit).get(lid);
      const domOf = (v: string): unknown[] | undefined => (sit.domains?.[v] ? sit.domains[v]() : fixed?.how === "fixed" ? fixed.values?.[v] : undefined);
      let cat: Cat, binds: Record<string, unknown>[] = [];
      if (BINDINGS[`${sit.id}:${lid}`]) { cat = "entity"; binds = BINDINGS[`${sit.id}:${lid}`](sit); }
      else if (!ph.entities.length && !ph.values.length) { cat = "plain"; binds = [{}]; }
      else if (!ph.entities.length && ph.values.every((v) => domOf(v))) {
        cat = "value";
        let combos: Record<string, unknown>[] = [{}];
        for (const v of ph.values) {
          const dom = domOf(v)!;
          domainSize[`${sit.id}:${v}`] = dom.length;
          const next: Record<string, unknown>[] = [];
          for (const c of combos) for (const d of dom) next.push({ ...c, [v]: d });
          combos = next.slice(0, 800);
        }
        binds = combos;
      } else if (ph.entities.length === 1 && !ph.values.length) { cat = "entity"; for (const list of Object.values(sit.entities || {})) for (const e of list) binds.push({ [ph.entities[0]]: e.id }, { [ph.entities[0]]: { id: e.id, qty: 2 } }); }
      else return;
      for (const b of binds) for (const n of people) for (const g of ["m", "f"] as const) {
        try { label(v2(n), n.speed ?? 1, compose(src, b, { look, addressee: g, speaker: n.gender, formal: !n.informal }), { cat, sit: sit.id, lid, ...(cat === "value" ? { domains: ph.values } : {}) }); } catch { /* doesn't fit */ }
      }
    });
    for (const [gid, g] of Object.entries(sit.hints)) {
      const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
      for (const it of g.items) {
        const pool = ents.filter((e) => !it.only || it.only(e));
        for (const b of pool.length ? pool.map((e) => ({ X: e.id })) : [{}]) for (const formal of [true, false]) for (const [k, coach] of coachVoices(true).entries()) for (const sp of ["m", "f"] as const) {
          const learner = ES ? (k === 0 ? "f" : "m") : "m";
          try { label(coach, 1, compose(it.s, { ...b, name: NAMES[0] }, { look, addressee: learner, speaker: sp, formal }), { cat: "hint", sit: sit.id, lid: gid }); } catch { /* skip */ }
        }
      }
    }
    for (const list of Object.values(sit.entities || {})) for (const e of list) for (const n of people) for (const g of ["m", "f"] as const) (GLOBAL.lines.g_soundcheck ?? []).forEach((src) => {
      try { label(v2(n), n.speed ?? 1, compose(src, { X: e.id }, { look, addressee: g, speaker: n.gender, formal: !n.informal }), { cat: "soundcheck", sit: sit.id }); } catch { /* skip */ }
    });
  }
  for (const n of Object.values(NPCS)) for (const [lid, variants] of Object.entries(GLOBAL.lines)) variants.forEach((src) => {
    if (placeholders(src).entities.length || placeholders(src).values.length) return;
    for (const g of ["m", "f"] as const) try { label(v2(n), n.speed ?? 1, compose(src, {}, { look: () => undefined, addressee: g, speaker: n.gender, formal: !n.informal }), { cat: "global", lid }); } catch { /* skip */ }
  });
  for (const [gid, g] of Object.entries(GLOBAL.hints)) for (const it of g.items) for (const formal of [true, false]) for (const [k, coach] of coachVoices(true).entries()) for (const sp of ["m", "f"] as const) {
    const learner = ES ? (k === 0 ? "f" : "m") : "m";
    try { label(coach, 1, compose(it.s, {}, { look: () => undefined, addressee: learner, speaker: sp, formal }), { cat: "global-hint", lid: gid }); } catch { /* skip */ }
  }
  for (const l of AMBIENT_LINES) for (const g of ["f", "m"] as const) label(ambientVoice(g, true), 1, { say: l.en, en: l.en } as Sentence, { cat: "ambient" });
}
setVariety("default");

// ---------------------------------------------------------------- the counts
const setOf = (voice: string) => (voice.startsWith("esn_") ? "neutral" : "mx");
const rows = new Map<string, { mx: number; neutral: number }>();
const bump = (k: string, set: string) => { const r = rows.get(k) ?? { mx: 0, neutral: 0 }; (r as any)[set]++; rows.set(k, r); };
const byDomain = new Map<string, { mx: number; neutral: number; size: number; lines: Set<string> }>();
const byLine = new Map<string, { mx: number; neutral: number; domains: string }>();
for (const u of utts) {
  const set = setOf(u.voice);
  const l = labels.get(keyOf(u.voice, u.speed, u.say));
  const cat = l?.cat ?? (/coach/.test(u.voice) ? "hint" : "dynamic");
  bump(cat, set);
  if (l?.cat === "value") {
    for (const d of l.domains!) {
      const k = `${l.sit}:${d}`;
      const r = byDomain.get(k) ?? { mx: 0, neutral: 0, size: domainSize[k] ?? 0, lines: new Set() };
      (r as any)[set]++; r.lines.add(l.lid!); byDomain.set(k, r);
    }
    const lk = `${l.sit}:${l.lid}`;
    const r = byLine.get(lk) ?? { mx: 0, neutral: 0, domains: l.domains!.map((d) => `${d}(${domainSize[`${l.sit}:${d}`]})`).join(" × ") };
    (r as any)[set]++; byLine.set(lk, r);
  }
}
// the neutral set's own texts: a neutral clip whose speaker never says that text in the Mexican set
const mxSay = new Set(utts.filter((u) => setOf(u.voice) === "mx").map((u) => u.voice.replace(/^es_/, "") + "|" + u.say));
const twins = utts.filter((u) => u.voice.startsWith("esn_") && !mxSay.has(u.voice.replace(/^esn_/, "") + "|" + u.say)).length;
// exact duplicates can't be (a clip's key is its voice, speed and text); near ones: the same voice and words, only the
// punctuation or capitals differ ("¿Algo más?" / "¿Algo más?." / "Algo más."): the game looks a clip up by its exact
// text, so they stay, but they are counted
const near = new Map<string, string[]>();
for (const u of utts) { const k = u.voice + "|" + u.say.toLowerCase().replace(/[¿¡.,!?;:…"“”'«»()—-]/g, "").replace(/\s+/g, " ").trim(); if (!near.has(k)) near.set(k, []); near.get(k)!.push(u.say); }
const nearDup = [...near.values()].filter((v) => v.length > 1);
// per conversation and kind (a global line, a global example answer or a passer-by: "(shared)")
const convOf = (u: U, l: Label | undefined) => l?.sit ?? (l && ["global", "global-hint", "ambient"].includes(l.cat) ? "(shared)" : u.sits?.length === 1 ? u.sits[0] : u.sits?.length ? "(several)" : "(shared)");
const kindOf = (u: U, l: Label | undefined) => l?.cat ?? (/coach/.test(u.voice) ? "hint" : "dynamic");
type Cell = { mx: number; neutral: number };
const table = (list: U[]) => {
  const t = new Map<string, Map<string, Cell>>();
  for (const u of list) {
    const l = labels.get(keyOf(u.voice, u.speed, u.say));
    const c = convOf(u, l), k = kindOf(u, l);
    if (!t.has(c)) t.set(c, new Map());
    const cell = t.get(c)!.get(k) ?? { mx: 0, neutral: 0 };
    cell[setOf(u.voice) as "mx" | "neutral"]++;
    t.get(c)!.set(k, cell);
  }
  return t;
};
const byConv = table(utts);
const diff = BEFORE ? (() => {
  const was = table(before);
  const nowKeys = new Set(utts.map((u) => keyOf(u.voice, u.speed, u.say))), wasKeys = new Set(before.map((u) => keyOf(u.voice, u.speed, u.say)));
  const moved = (list: U[], other: Set<string>) => table(list.filter((u) => !other.has(keyOf(u.voice, u.speed, u.say))));
  return { was, added: moved(utts, wasKeys), removed: moved(before, nowKeys) };
})() : null;
const out = { file: FILE, total: utts.length, rows: Object.fromEntries(rows), twins, nearDuplicates: nearDup.reduce((a, v) => a + v.length - 1, 0), nearExamples: nearDup.slice(0, 8), byDomain: Object.fromEntries([...byDomain].map(([k, v]) => [k, { ...v, lines: [...v.lines] }])), byLine: Object.fromEntries(byLine),
  byConversation: Object.fromEntries([...byConv].map(([c, m]) => [c, Object.fromEntries(m)])),
  ...(diff ? { before: BEFORE, beforeTotal: before.length, diff: Object.fromEntries(["was", "added", "removed"].map((k) => [k, Object.fromEntries([...(diff as any)[k] as Map<string, Map<string, Cell>>].map(([c, m]) => [c, Object.fromEntries(m)]))])) } : {}) };
if (flag("json")) fs.writeFileSync(flag("json")!, JSON.stringify(out, null, 1));
console.log(`${utts.length} clips in ${FILE}`);
for (const [k, r] of [...rows].sort((a, b) => b[1].mx + b[1].neutral - a[1].mx - a[1].neutral)) console.log(`  ${k.padEnd(12)} ${String(r.mx).padStart(6)} ${ES ? String(r.neutral).padStart(6) : ""}`);
console.log(`neutral twins' own texts: ${twins}; near duplicates (only punctuation differs): ${out.nearDuplicates}`);
if (diff) {
  // before → after per conversation and kind, both sets together (+ added, − removed)
  const cell = (t: Map<string, Map<string, Cell>> | undefined, c: string, k: string) => { const x = t?.get(c)?.get(k); return x ? x.mx + x.neutral : 0; };
  const convs = [...new Set([...diff.was.keys(), ...byConv.keys()])].sort();
  const kinds = [...new Set([...convs.flatMap((c) => [...(diff.was.get(c)?.keys() ?? []), ...(byConv.get(c)?.keys() ?? [])])])];
  const sum = (t: Map<string, Map<string, Cell>>) => [...t.values()].reduce((a, m) => a + [...m.values()].reduce((b, x) => b + x.mx + x.neutral, 0), 0);
  console.log(`\nbefore ${before.length} (${BEFORE}) → after ${utts.length}: +${sum(diff.added)} −${sum(diff.removed)} (both sets)`);
  console.log(`${"conversation".padEnd(22)} ${"kind".padEnd(12)} ${"before".padStart(7)} ${"after".padStart(7)} ${"added".padStart(7)} ${"removed".padStart(7)}`);
  for (const c of convs) for (const k of kinds) {
    const b = cell(diff.was, c, k), a = cell(byConv, c, k), ad = cell(diff.added, c, k), rm = cell(diff.removed, c, k);
    if (b || a) console.log(`${c.padEnd(22)} ${k.padEnd(12)} ${String(b).padStart(7)} ${String(a).padStart(7)} ${("+" + ad).padStart(7)} ${("−" + rm).padStart(7)}`);
  }
}
console.log("value lists (conversation:value, size, clips Mexican/neutral, lines):");
for (const [k, r] of [...byDomain].sort((a, b) => b[1].mx - a[1].mx)) console.log(`  ${k.padEnd(28)} ${String(r.size).padStart(4)} values  ${String(r.mx).padStart(6)} ${String(r.neutral).padStart(6)}  ${[...r.lines].join(", ")}`);
