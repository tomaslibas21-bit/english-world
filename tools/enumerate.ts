// Enumerates every sentence the game can speak, for IPA and pre-generated audio:
//  • every NPC line variant without placeholders, in the voice of each NPC of its situation;
//  • lines whose only placeholders are values with a declared domain;
//  • every hint example with every suitable entity (the coach voice);
//  • plus a fuzzing pass: many random conversations per situation (test utterances,
//    simulation turns and hint examples as input) whose NPC lines are collected. This finds
//    dynamic renderings (prices, chosen items) and crash-tests every handler.
import { PHOTO_WALK_SITUATION } from "../src/content/photo-walk-lines";
import { SITUATIONS } from "../src/content/situations";
import { isBaristaCoachLine } from "../src/content/barista-lines";
import { MEETING_LINES } from "../src/content/phoneMeeting";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { AMBIENT_LINES, STAFF_LINES, VENDOR_LINES } from "../src/content/ambient";
import { RIDE_OWNERS, RIDE_SHOUTS } from "../src/content/rides";
import { VOICES_V2, ambientVoice, coachVoices, npcVoice, rideVoice, shoutVoice } from "../src/content/voices";
import { withoutAddressedNames } from "../src/audio-key";
import { Conversation, type SpokenLine } from "../src/convo/dialogue";
import { compose, placeholders, type Sentence } from "../src/convo/compose";
import type { EntityDef, SentSrc, SituationDef } from "../src/content/types";
import type { NpcDef } from "../src/content/npcs";
import { soundKey } from "../src/convo/soundalike";
import { itemsFor, referenced } from "./line-reach";
import { playSim } from "./sim-play";

export interface Utt { voice: string; speed: number; say: string; en: string; where: string }
/** A line simulated play never reached (the random runs and the sims): `named` false when no code names it either. */
export interface Unreached { sit: string; line: string; named: boolean; items?: number }

/** The learner's own lines in the kit's mini-games (23 Nov 2026). A tapped answer is said for the learner in the coach
 *  voice of their gender, speed 1 (src/game/kit/dialogue.ts), composed as src/game/kit/lines.ts conversationLine does.
 *  `only`: the learner says it, never the person (the taxi's answers and fares, the pool hall's answers, the phone
 *  meeting's two answers); `both`: the person says it too (Go Fish's asks and replies, the pool calls, played as pieces).
 *  The barista's (isBaristaCoachLine) and the road's rd_a_ lines keep their own cases below. */
export const KIT_LEARNER: Record<string, { only?: RegExp; both?: RegExp }> = {
  "s66-taxi": { only: /^tx_(r\d_)?a_/ },
  "s85-dinner": { both: /^gf_(ask_[a-z_]+|yes|nope|pair)$/ },
  "x01-pool-hall": { only: /^h_(solids|stripes|gg|fun)$/, both: /^bl_(b\d+|p_[a-z]+)$/ },
  "s83-invite-call": { only: /^phone_meet_(ready|tickets)$/ },
  [PHOTO_WALK_SITUATION]: { only: /^pw_a_/ },
};
/** Lines a mini-game says in a conversation's name that are not among that conversation's own lines. */
const KIT_EXTRA_LINES: Record<string, Record<string, SentSrc[]>> = {
  "s83-invite-call": MEETING_LINES,
};

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

/** `v2`: the voice ids of the Gemini voices (src/content/voices.ts) instead of the ones the game plays now. */
export function enumerateAll(opts: { fuzzRuns?: number; only?: string[]; sits?: SituationDef[]; log?: (s: string) => void; v2?: boolean } = {}): { utts: Utt[]; errors: string[]; unreached: Unreached[]; unfilled: string[] } {
  const unreached: Unreached[] = [];
  /** item lines no play said and no code could be read for: not voiced with every item list any more (18 Nov 2026) */
  const unfilled: string[] = [];
  const voiceOf = (n: NpcDef) => npcVoice(n, opts.v2);
  const out = new Map<string, Utt>();
  const errors: string[] = [];
  const add = (voice: string, speed: number, s: Sentence, where: string, example = false) => {
    if (!s.say.trim()) return;
    if (/\s[.,!?]/.test(s.say)) return; // a value was missing (e.g. "My last name is .")
    // lines that address the (simulated) player by name are voiced without the name
    const alt = withoutAddressedNames(s.say, ["Tomas", "Mikalauskas"]);
    const say = alt ?? s.say;
    // the name is part of the content: no clip (browser voice), but for a hint example, whose name is the fixed
    // example learner's (src/convo/suggest.ts exampleVars, 17 Nov 2026)
    if (!example && alt === null && /\b(Tomas|Mikalauskas)\b/.test(say)) return;
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
    const usedLists = new Map<string, Set<string>>(), usedBy = new Map<string, Set<string>>(), usedIds = new Map<string, Set<string>>();
    const addTo = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
    errors.push(...fuzzSituation(sit, look, opts.fuzzRuns ?? 120, (voice, speed, sentence, line) => {
      add(voice, speed, sentence, `${sit.id}:fuzz`);
      if (!line) return;
      addTo(usedBy, line.lineId, line.npc);
      for (const v of Object.values(line.vars ?? {})) {
        const id = typeof v === "string" ? v : (v as { id?: string } | null)?.id;
        const ln = id ? listOf.get(id) : undefined;
        if (ln) { addTo(usedLists, line.lineId, ln); addTo(usedIds, line.lineId, id!); }
      }
    }, voiceOf));
    // the sims too (every seed of tools/sim-play.ts's turn-taking, both genders): what simulated play reaches
    // (not when the caller asks for no play at all: fuzzRuns 0, the tests' quick list)
    if ((opts.fuzzRuns ?? 120) > 0) for (const sim of sit.sims ?? []) for (let seed = 1; seed <= 6; seed++) {
      try {
        playSim(sit, sim, seed, { gender: seed % 2 ? "m" : "f", onTurn: (_c, _t, o) => {
          for (const l of o.lines) {
            addTo(usedBy, l.lineId, l.npc);
            for (const v of Object.values(l.vars ?? {})) {
              const id = typeof v === "string" ? v : (v as { id?: string } | null)?.id;
              const ln = id ? listOf.get(id) : undefined;
              if (ln) { addTo(usedLists, l.lineId, ln); addTo(usedIds, l.lineId, id!); }
            }
          }
        } });
      } catch { /* a sim that throws is check-content's to report */ }
    }
    // 1. static lines and value-domain lines
    for (const [lid, variants] of Object.entries({ ...sit.lines, ...KIT_EXTRA_LINES[sit.id] })) {
      const speakers = usedBy.has(lid) ? voices.filter((n) => usedBy.get(lid)!.has(n.id)) : voices;
      const lists = usedLists.get(lid);
      if (!usedBy.has(lid)) unreached.push({ sit: sit.id, line: lid, named: referenced(sit, lid) });
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
          // {X} only with the line's own items (18 Nov 2026): the lists simulated play said it with, as before; for a
          // line play never reached, the items its code says it with (line-reach.ts). Before, such a line was
          // voiced with every item of every list (s87's ask_years_field2 ×105, said only with customer_service).
          const pool = new Set<string>(usedIds.get(lid) ?? []);
          const own = lists ? undefined : itemsFor(sit, lid, ph.entities[0]);
          if (lists) for (const [ln, list] of Object.entries(sit.entities || {})) if (lists.has(ln)) for (const e of list) pool.add(e.id);
          else if (own) for (const e of own) pool.add(e.id);
          // read nowhere: every list, as before (its item comes from the state: c.s.win2, retDay(c)…), and reported
          if (!pool.size) { unfilled.push(`${sit.id}:${lid}`); for (const list of Object.values(sit.entities || {})) for (const e of list) pool.add(e.id); }
          for (const id of pool) bindings.push({ [ph.entities[0]]: id });
          const u = unreached.find((x) => x.sit === sit.id && x.line === lid);
          if (u) u.items = pool.size;
        }
        if (sit.id === "s72-cafe" && isBaristaCoachLine(lid)) {
          for (const coach of coachVoices(opts.v2)) {
            add(coach, 1, compose(src, {}, { look, formal: true }), `${sit.id}:${lid}[${i}]`);
          }
          return;
        }
        const kit = KIT_LEARNER[sit.id];
        if (kit && (kit.only?.test(lid) || kit.both?.test(lid))) {
          for (const voice of coachVoices(opts.v2)) {
            const learner = voice.endsWith("_m") ? "m" : "f";
            const npc = NPCS[sit.npc];
            try { add(voice, 1, compose(src, {}, { look: () => undefined, addressee: npc?.gender ?? "f", speaker: learner, formal: !npc?.informal }), `${sit.id}:${lid}[${i}]`, true); } catch { /* skip */ }
          }
          if (kit.only?.test(lid)) return;
        }
        if (sit.id === "s66-taxi" && /^rd_a_/.test(lid)) {
          for (const voice of coachVoices(opts.v2)) {
            add(voice, 1, compose(src, {}, { look }), `${sit.id}:${lid}[${i}]`, true);
          }
          return;
        }
        for (const b of bindings) for (const n of speakers) {
          try { add(voiceOf(n), n.speed ?? 1, compose(src, b, { look, addressee: "m", speaker: n.gender, formal: !n.informal }), `${sit.id}:${lid}[${i}]`); }
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
        for (const b of binds) for (const formal of [true, false]) for (const coach of coachVoices(opts.v2)) {
          try { add(coach, 1, compose(it.s, { ...b, name: "Tomas", surname: "Mikalauskas", letters: "Mikalauskas" }, { look, formal }), `${sit.id}:hint:${gid}.${it.id}`, true); } catch { /* skip */ }
        }
      }
    }
    opts.log?.(`${sit.id}: ${out.size} sentences so far`);
    // 3. "Sorry, a latte?" (convo/soundalike.ts): the check-back for every name a learner can say, in the voices of
    //    this conversation's people. Only names a sound-alike can be heard for (two or more consonant sounds).
    const checks = GLOBAL.lines.g_soundcheck ?? [];
    for (const list of Object.values(sit.entities || {})) for (const e of list) {
      const names = [e.en.split(" | ").join(" "), ...(e.forms ?? [])];
      if (!names.some((nm) => soundKey(nm).length >= 2 && nm.replace(/[^a-z]/gi, "").length >= 4)) continue;
      for (const n of voices) checks.forEach((src, ci) => {
        try { add(voiceOf(n), n.speed ?? 1, compose(src, { X: e.id }, { look, speaker: n.gender, formal: !n.informal }), `${sit.id}:soundcheck:${e.id}[${ci}]`); } catch { /* skip */ }
      });
    }
  }
  return { ...finishEnumeration(out, errors, allNpcIds, opts), unreached, unfilled };
}

/** The reachability report: lines no simulated play reaches, item lines with no static fill. */
export function reachReport(unreached: Unreached[], unfilled: string[]): string {
  const dead = unreached.filter((u) => !u.named), quiet = unreached.filter((u) => u.named);
  const lines = [
    `${unreached.length} lines simulated play never reached: ${dead.length} no code names (never said), ${quiet.length} named but not reached (rare paths: check by hand)`,
    `${unfilled.length} item lines read nowhere (no code read, never played), filled with every list as before: check by hand: ${unfilled.slice(0, 12).join(", ")}${unfilled.length > 12 ? " …" : ""}`,
  ];
  if (dead.length) lines.push(`never named: ${dead.slice(0, 20).map((u) => `${u.sit}:${u.line}`).join(", ")}${dead.length > 20 ? " …" : ""}`);
  return lines.join("\n");
}

/** Random-order conversations built from a situation's tests, sims and hint examples. Returns
 *  handler crashes; `take` receives every NPC sentence spoken. */
export function fuzzSituation(sit: SituationDef, look: (id: string) => EntityDef | undefined, runs: number,
  take?: (voice: string, speed: number, s: Sentence, line?: SpokenLine) => void, voiceOf: (n: NpcDef) => string = (n) => n.voice): string[] {
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
        for (const l of o.lines) { const n = NPCS[l.npc]; if (n && take) take(voiceOf(n), n.speed ?? 1, l.sentence, l); }
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

function finishEnumeration(out: Map<string, Utt>, errors: string[], allNpcIds: Set<string>, opts: { only?: string[]; sits?: SituationDef[]; v2?: boolean }): { utts: Utt[]; errors: string[] } {
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
        try { add(npcVoice(n, opts.v2), n.speed ?? 1, compose(src, {}, { look: () => undefined, speaker: n.gender, formal: !n.informal }), `global:${lid}[${i}]`); } catch { /* skip */ }
      });
    }
  }
  // global hints (coach)
  for (const [gid, g] of Object.entries(GLOBAL.hints)) for (const it of g.items) for (const formal of [true, false]) for (const coach of coachVoices(opts.v2)) {
    try { add(coach, 1, compose(it.s, {}, { look: () => undefined, formal }), `global:hint:${gid}.${it.id}`); } catch { /* skip */ }
  }
  // passers-by in the town
  if (!opts.only?.length && !opts.sits) for (const l of AMBIENT_LINES) for (const g of ["f", "m"] as const) add(ambientVoice(g, opts.v2), 1, { say: l.en, en: l.en } as Sentence, "ambient");
  // the market vendors and the rooms' staff with one line to say (content/ambient.ts), in the same voices
  if (!opts.only?.length && !opts.sits) for (const l of [...VENDOR_LINES, ...Object.values(STAFF_LINES)]) {
    for (const g of ["f", "m"] as const) {
      if ("female" in l && l.female !== undefined && l.female !== (g === "f")) continue;
      add(ambientVoice(g, opts.v2), 1, { say: l.en, en: l.en } as Sentence, "ambient:staff");
    }
  }
  // the convertibles' owners, each in a voice of their own, and what passers-by call after a car (the Gemini voices
  // only: with the first voices they speak as the passers-by do, and those lines were never made for them)
  if ((opts.v2 ?? VOICES_V2) && !opts.only?.length && !opts.sits) {
    for (const cast of Object.values(RIDE_OWNERS)) for (const o of cast) for (const l of [...o.take, ...o.back]) add(rideVoice(o.id, o.female, true), 1, { say: l.en, en: l.en } as Sentence, "rides");
    for (const l of RIDE_SHOUTS) for (const female of [true, false]) for (const n of [0, 1]) add(shoutVoice(female, n, true), 1, { say: l.en, en: l.en } as Sentence, "rides:shout");
  }
  return { utts: [...out.values()], errors };
}

export function sentencesForIpa(): string[] {
  // one coach voice (v1): with the Gemini voices' two, every example answer would come twice
  const { utts } = enumerateAll({ fuzzRuns: 40, v2: false });
  const extra: string[] = [];
  for (const sit of SITUATIONS) for (const list of Object.values(sit.entities || {})) for (const e of list) {
    extra.push(e.en.split(" | ").join(" "));
    if (e.pl) extra.push(e.pl.split(" | ").join(" "));
  }
  return [...utts.map((u) => u.en), ...extra];
}

void (null as unknown as SentSrc);
