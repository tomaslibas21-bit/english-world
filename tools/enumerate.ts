// Enumerates every sentence the game can speak, for IPA and pre-generated audio:
//  • every NPC line variant without placeholders, in the voice of each NPC of its situation;
//  • lines whose only placeholders are values with a declared domain;
//  • every hint example with every suitable entity (the coach voice);
//  • plus a fuzzing pass: many random conversations per situation (test utterances,
//    simulation turns and hint examples as input) whose NPC lines are collected. This finds
//    dynamic renderings (prices, chosen items) and crash-tests every handler.
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS, COACH_VOICE } from "../src/content/npcs";
import { AMBIENT_LINES, AMBIENT_VOICES } from "../src/content/ambient";
import { withoutAddressedNames } from "../src/audio-key";
import { Conversation, type SpokenLine } from "../src/convo/dialogue";
import { compose, placeholders, type Sentence } from "../src/convo/compose";
import type { EntityDef, SentSrc, SituationDef } from "../src/content/types";

export interface Utt { voice: string; speed: number; say: string; en: string; where: string }

function lookFor(sit: SituationDef) {
  return (id: string): EntityDef | undefined => {
    for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
    return undefined;
  };
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function enumerateAll(opts: { fuzzRuns?: number; only?: string[]; sits?: SituationDef[]; log?: (s: string) => void } = {}): { utts: Utt[]; errors: string[] } {
  const out = new Map<string, Utt>();
  const errors: string[] = [];
  const add = (voice: string, speed: number, s: Sentence, where: string) => {
    if (!s.say.trim()) return;
    if (/\s[.,!?]/.test(s.say)) return; // a value was missing (e.g. "My last name is .")
    // lines that address the (simulated) player by name are voiced without the name
    const alt = withoutAddressedNames(s.say, ["Tomas", "Mikalauskas"]);
    const say = alt ?? s.say;
    if (alt === null && /\b(Tomas|Mikalauskas)\b/.test(say)) return; // the name is part of the content: no clip (browser voice)
    const k = `${voice}|${speed}|${say}`;
    if (!out.has(k)) out.set(k, { voice, speed, say, en: s.en, where });
  };
  const sits = opts.sits ?? SITUATIONS.filter((s) => !opts.only?.length || opts.only.some((o) => s.id.startsWith(o)));
  const allNpcIds = new Set<string>();
  for (const sit of sits) {
    const look = lookFor(sit);
    const npcIds = [sit.npc, ...(sit.npcs || [])].filter((id) => NPCS[id]);
    npcIds.forEach((id) => allNpcIds.add(id));
    const voices = npcIds.map((id) => NPCS[id]);
    // 0. random-order conversations first: they show which item lists and which speakers each line
    //    is really used with, so static lines aren't voiced with every list and every NPC
    const listOf = new Map<string, string>();
    for (const [ln, list] of Object.entries(sit.entities || {})) for (const e of list) listOf.set(e.id, ln);
    const usedLists = new Map<string, Set<string>>(), usedBy = new Map<string, Set<string>>();
    const addTo = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
    errors.push(...fuzzSituation(sit, look, opts.fuzzRuns ?? 120, (voice, speed, sentence, line) => {
      add(voice, speed, sentence, `${sit.id}:fuzz`);
      if (!line) return;
      addTo(usedBy, line.lineId, line.npc);
      for (const v of Object.values(line.vars ?? {})) {
        const id = typeof v === "string" ? v : (v as { id?: string } | null)?.id;
        const ln = id ? listOf.get(id) : undefined;
        if (ln) addTo(usedLists, line.lineId, ln);
      }
    }));
    // 1. static lines and value-domain lines
    for (const [lid, variants] of Object.entries(sit.lines)) {
      const speakers = usedBy.has(lid) ? voices.filter((n) => usedBy.get(lid)!.has(n.id)) : voices;
      const lists = usedLists.get(lid);
      variants.forEach((src, i) => {
        const ph = placeholders(src);
        const bindings: Record<string, any>[] = [];
        if (!ph.entities.length && !ph.values.length) bindings.push({});
        else if (!ph.entities.length && ph.values.every((v) => sit.domains?.[v])) {
          let combos: Record<string, any>[] = [{}];
          for (const v of ph.values) {
            const dom = sit.domains![v]();
            const next: Record<string, any>[] = [];
            for (const c of combos) for (const d of dom) next.push({ ...c, [v]: d });
            combos = next.slice(0, 800);
          }
          bindings.push(...combos);
        } else if (ph.entities.length === 1 && !ph.values.length) {
          for (const [ln, list] of Object.entries(sit.entities || {})) if (!lists || lists.has(ln)) for (const e of list) bindings.push({ [ph.entities[0]]: e.id });
        }
        for (const b of bindings) for (const n of speakers) {
          try { add(n.voice, n.speed ?? 1, compose(src, b, { look, addressee: "m", speaker: n.gender, formal: !n.informal }), `${sit.id}:${lid}[${i}]`); }
          catch { /* this entity type doesn't fit this line */ }
        }
      });
    }
    // 2. hints (coach voice): every item with every suitable entity
    for (const [gid, g] of Object.entries(sit.hints)) {
      const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
      for (const it of g.items) {
        const pool = ents.filter((e) => !it.only || it.only(e));
        const binds = pool.length ? pool.map((e) => ({ X: e.id })) : [{}];
        for (const b of binds) for (const formal of [true, false]) {
          try { add(COACH_VOICE, 1, compose(it.s, { ...b, name: "Tomas" }, { look, formal }), `${sit.id}:hint:${gid}.${it.id}`); } catch { /* skip */ }
        }
      }
    }
    opts.log?.(`${sit.id}: ${out.size} sentences so far`);
  }
  return finishEnumeration(out, errors, allNpcIds, opts);
}

/** Random-order conversations built from a situation's tests, sims and hint examples. Returns
 *  handler crashes; `take` receives every NPC sentence spoken. */
export function fuzzSituation(sit: SituationDef, look: (id: string) => EntityDef | undefined, runs: number,
  take?: (voice: string, speed: number, s: Sentence, line?: SpokenLine) => void): string[] {
  const errors: string[] = [];
  {
    const inputs: string[] = [];
    for (const t of sit.tests || []) if (t.intent !== "none") inputs.push(t.say);
    for (const sim of sit.sims || []) { inputs.push(...sim.turns); inputs.push(...Object.values(sim.auto || {})); }
    for (const g of Object.values(sit.hints)) {
      const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
      for (const it of g.items) {
        const pool = ents.filter((e) => !it.only || it.only(e)).slice(0, 12);
        for (const e of pool.length ? pool : [null]) {
          try { inputs.push(compose(it.s, e ? { X: e.id, name: "Tomas" } : { name: "Tomas" }, { look }).en); } catch { /* skip */ }
        }
      }
    }
    for (let r = 0; r < runs; r++) {
      const rand = rng(r * 7919 + sit.id.length);
      const partner = rand() < 0.5 ? "sam" : "emma";
      let conv: Conversation;
      const visits = Math.floor(rand() * 4);
      try {
        conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: rand() < 0.5 ? "m" : "f", datePartner: partner }, visits, seed: r + 1, memory: r % 3 === 0 ? {} : undefined });
      } catch (e: any) { errors.push(`${sit.id}: constructor: ${e.message}`); break; }
      const collect = (o: { lines: SpokenLine[] }) => {
        for (const l of o.lines) { const n = NPCS[l.npc]; if (n && take) take(n.voice, n.speed ?? 1, l.sentence, l); }
      };
      try { collect(conv.start()); } catch (e: any) { errors.push(`${sit.id}: start: ${e.message}`); continue; }
      for (let t = 0; t < 16 && !conv.ended; t++) {
        const say = inputs[Math.floor(rand() * inputs.length)] ?? "yes";
        try { collect(conv.input(say)); }
        catch (e: any) { errors.push(`${sit.id}: input "${say}" (seed ${r + 1}, visits ${visits}): ${e.message}`); break; }
      }
    }
  }
  return errors;
}

function finishEnumeration(out: Map<string, Utt>, errors: string[], allNpcIds: Set<string>, opts: { only?: string[]; sits?: SituationDef[] }): { utts: Utt[]; errors: string[] } {
  const add = (voice: string, speed: number, s: Sentence, where: string) => {
    if (!s.say.trim() || /\s[.,!?]/.test(s.say)) return;
    const alt = withoutAddressedNames(s.say, ["Tomas", "Mikalauskas"]);
    const say = alt ?? s.say;
    if (alt === null && /\b(Tomas|Mikalauskas)\b/.test(say)) return;
    const k = `${voice}|${speed}|${say}`;
    if (!out.has(k)) out.set(k, { voice, speed, say, en: s.en, where });
  };
  // 4. global lines in every NPC's voice
  for (const id of allNpcIds) {
    const n = NPCS[id];
    for (const [lid, variants] of Object.entries(GLOBAL.lines)) {
      variants.forEach((src, i) => {
        const ph = placeholders(src);
        if (ph.entities.length || ph.values.length) return;
        try { add(n.voice, n.speed ?? 1, compose(src, {}, { look: () => undefined, speaker: n.gender, formal: !n.informal }), `global:${lid}[${i}]`); } catch { /* skip */ }
      });
    }
  }
  // global hints (coach)
  for (const [gid, g] of Object.entries(GLOBAL.hints)) for (const it of g.items) for (const formal of [true, false]) {
    try { add(COACH_VOICE, 1, compose(it.s, {}, { look: () => undefined, formal }), `global:hint:${gid}.${it.id}`); } catch { /* skip */ }
  }
  // passers-by in the town
  if (!opts.only?.length && !opts.sits) for (const l of AMBIENT_LINES) for (const v of Object.values(AMBIENT_VOICES)) add(v, 1, { say: l.en, en: l.en } as Sentence, "ambient");
  return { utts: [...out.values()], errors };
}

export function sentencesForIpa(): string[] {
  const { utts } = enumerateAll({ fuzzRuns: 40 });
  const extra: string[] = [];
  for (const sit of SITUATIONS) for (const list of Object.values(sit.entities || {})) for (const e of list) {
    extra.push(e.en.split(" | ").join(" "));
    if (e.pl) extra.push(e.pl.split(" | ").join(" "));
  }
  return [...utts.map((u) => u.en), ...extra];
}

void (null as unknown as SentSrc);
