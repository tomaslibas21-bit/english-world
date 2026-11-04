// Every line Puerto Colibrí can speak, for its Gemini voices (tools/es-voices/voice-batch-es.ts, docs/es/VOICES.md).
// It is tools/enumerate.ts's list made for Spanish, which that file (shared with Maple Harbor and its fingerprint)
// leaves as it is:
//  • both Spanishes, each in its own voice set: Mexican (es_…, the default) and neutral Latin American (esn_…), each
//    line as the learner who chose it hears it (compose's variety picks the text, a line's neutral twin, and
//    src/editions/es/content/voices.ts the voice ids), so every line is recorded once per accent;
//  • both learner genders: Spanish shows the learner's gender in what people say to them ("¿Está listo?" /
//    "¿Está lista?"), so every line is made for a male and a female learner;
//  • the example answers in the coach voice of the learner's own gender ({m:…|f:…} in a hint is the learner, who
//    hears es_coach_f or es_coach_m), with the register and the gender of the people in that conversation;
//  • speakers a conversation switches to (c.speaker("aduana") in s65b) and their global lines.
// Each line also records the conversations it is said in, for the setting's direction (casting-es.ts SCENES).
// Run with the edition overlay: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/…
import { SITUATIONS } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS, type NpcDef } from "../../src/content/npcs";
import { AMBIENT_LINES } from "../../src/content/ambient";
import { ambientVoice, coachVoice, npcVoice } from "../../src/content/voices";
import { withoutAddressedNames } from "../../src/audio-key";
import { compose, placeholders, setVariety, type Sentence } from "../../src/convo/compose";
import { soundKey } from "../../src/convo/soundalike";
import { EDITION } from "../../src/edition";
import type { EntityDef, SituationDef } from "../../src/content/types";
import { fuzzSituation } from "../enumerate";
import { playSim } from "../sim-play";

/** The learner the tools play: lines that address them by name are voiced without the name (as the game does). */
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];
const NAMES_RE = new RegExp(`\\b(${NAMES.join("|")})\\b`);
const GENDERS = ["m", "f"] as const;

export interface EsUtt {
  voice: string; speed: number;
  /** What is said (the clip's text) and what the line shows (digits, "$85.50"). */
  say: string; shown: string;
  /** Where it was first found ("s72-cafe:greet[0]", "global:…", "ambient"). */
  where: string;
  /** The conversations it is said in (none for global lines found outside one, and for passers-by). */
  sits: string[];
  /** In the neutral Latin American set (an esn_ voice). */
  neutral?: boolean;
}

function lookFor(sit: SituationDef) {
  return (id: string): EntityDef | undefined => {
    for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
    return undefined;
  };
}

/** `part` [k, n]: only every n-th conversation from the k-th (the passers-by in part 0), for workers running side by
 *  side; their lists merge into the whole one (mergeUtts). */
export function enumerateEs(opts: { fuzzRuns?: number; only?: string[]; part?: [number, number]; log?: (s: string) => void } = {}): { utts: EsUtt[]; errors: string[] } {
  if (EDITION.id !== "es") throw new Error("the Spanish lines need the Spanish edition: EDITION=es npx tsx --import ./tools/edition-hook.mjs …");
  const out = new Map<string, EsUtt>();
  const errors: string[] = [];
  const add = (voice: string, speed: number, s: Sentence, where: string, sit?: string): EsUtt | undefined => {
    if (!s.say.trim()) return;
    if (/\s[.,!?]/.test(s.say)) return; // a value was missing ("Me llamo .")
    const alt = withoutAddressedNames(s.say, NAMES);
    const say = alt ?? s.say;
    if (alt === null && NAMES_RE.test(say)) return; // the learner's name is part of the line: the browser voice says it
    const k = `${voice}|${speed}|${say}`;
    let u = out.get(k);
    if (!u) out.set(k, (u = { voice, speed, say, shown: s.en, where, sits: [], ...(voice.startsWith("esn_") ? { neutral: true } : {}) }));
    if (sit && !u.sits.includes(sit)) u.sits.push(sit);
    return u;
  };
  const sits = SITUATIONS.filter((s, i) => (!opts.only?.length || opts.only.some((o) => s.id.startsWith(o))) && (!opts.part || i % opts.part[1] === opts.part[0]));
  const speakersSeen = new Set<string>();
  const sitsOf = new Map<string, Set<string>>(); // npc id → the conversations they speak in

  for (const variety of ["default", "neutral"] as const) {
    setVariety(variety); // the text (neutral twins) and the voice ids (es_ / esn_) of this Spanish
    for (const sit of sits) {
      const look = lookFor(sit);
      const cast = [sit.npc, ...(sit.npcs || [])].filter((id) => NPCS[id]);
      // 0. random conversations: which lines each speaker really says, and with which item lists
      const listOf = new Map<string, string>();
      for (const [ln, list] of Object.entries(sit.entities || {})) for (const e of list) listOf.set(e.id, ln);
      const usedLists = new Map<string, Set<string>>(), usedBy = new Map<string, Set<string>>();
      const addTo = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
      errors.push(...fuzzSituation(sit, look, opts.fuzzRuns ?? 120, (voice, speed, sentence, line) => {
        add(voice, speed, sentence, `${sit.id}:fuzz`, sit.id);
        if (!line) return;
        addTo(usedBy, line.lineId, line.npc);
        speakersSeen.add(line.npc);
        addTo(sitsOf, line.npc, sit.id);
        for (const v of Object.values(line.vars ?? {})) {
          const id = typeof v === "string" ? v : (v as { id?: string } | null)?.id;
          const ln = id ? listOf.get(id) : undefined;
          if (ln) addTo(usedLists, line.lineId, ln);
        }
      }, (n: NpcDef) => npcVoice(n)));
      // 0b. the scripted sims, in order, for both learner genders: they reach parts random talk rarely does (customs
      //     after the baggage desk in s65b) and show who says each line there
      for (const sim of sit.sims ?? []) for (const [k, g] of GENDERS.entries()) {
        try {
          playSim(sit, sim, k + 1, { gender: g, onTurn: (_conv, _turn, o) => {
            for (const line of o.lines) {
              const n = NPCS[line.npc];
              if (!n) continue;
              add(npcVoice(n), n.speed ?? 1, line.sentence, `${sit.id}:sim`, sit.id);
              addTo(usedBy, line.lineId, line.npc);
              speakersSeen.add(line.npc);
              addTo(sitsOf, line.npc, sit.id);
            }
          } });
        } catch (e: any) { errors.push(`${sit.id}: sim ${sim.name}: ${e.message}`); }
      }
      for (const id of cast) { speakersSeen.add(id); addTo(sitsOf, id, sit.id); }
      const people = cast.map((id) => NPCS[id]);
      // a line nobody was heard saying belongs to whoever says the lines around it (the lines come grouped by speaker:
      // Agente Medina's customs lines after Itzel's), when both neighbours agree on one person; else to everyone here
      const ids = Object.keys(sit.lines);
      const single = (lid: string | undefined) => (lid && usedBy.get(lid)?.size === 1 ? [...usedBy.get(lid)!][0] : undefined);
      const near = (i: number, step: number) => { for (let j = i + step; j >= 0 && j < ids.length; j += step) if (usedBy.has(ids[j])) return single(ids[j]); return undefined; };
      const guessed = new Map<string, string>();
      ids.forEach((lid, i) => { if (!usedBy.has(lid)) { const a = near(i, -1), b = near(i, 1); if (a && a === b) guessed.set(lid, a); } });
      // 1. every line variant: without placeholders, with value domains, or with one entity from the lists it is used with
      for (const [lid, variants] of Object.entries(sit.lines)) {
        const speakers = usedBy.has(lid) ? [...usedBy.get(lid)!].map((id) => NPCS[id]).filter(Boolean) : guessed.has(lid) ? [NPCS[guessed.get(lid)!]] : people;
        const lists = usedLists.get(lid);
        variants.forEach((src, i) => {
          const ph = placeholders(src);
          const bindings: Record<string, unknown>[] = [];
          if (!ph.entities.length && !ph.values.length) bindings.push({});
          else if (!ph.entities.length && ph.values.every((v) => sit.domains?.[v])) {
            let combos: Record<string, unknown>[] = [{}];
            for (const v of ph.values) {
              const dom = sit.domains![v]();
              const next: Record<string, unknown>[] = [];
              for (const c of combos) for (const d of dom) next.push({ ...c, [v]: d });
              combos = next.slice(0, 800);
            }
            bindings.push(...combos);
          } else if (ph.entities.length === 1 && !ph.values.length) {
            for (const [ln, list] of Object.entries(sit.entities || {})) if (!lists || lists.has(ln)) for (const e of list) bindings.push({ [ph.entities[0]]: e.id });
          }
          for (const b of bindings) for (const n of speakers) for (const g of GENDERS) {
            try { add(npcVoice(n), n.speed ?? 1, compose(src, b, { look, addressee: g, speaker: n.gender, formal: !n.informal }), `${sit.id}:${lid}[${i}]`, sit.id); }
            catch { /* this entity doesn't fit this line */ }
          }
        });
      }
      // 2. the example answers: the coach of the learner's gender, the register and gender of whom they speak to
      const registers = [...new Set(people.map((n) => !n.informal))];
      const npcGenders = [...new Set(people.map((n) => n.gender))];
      for (const [gid, g] of Object.entries(sit.hints)) {
        const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
        for (const it of g.items) {
          const pool = ents.filter((e) => !it.only || it.only(e));
          const binds = pool.length ? pool.map((e) => ({ X: e.id })) : [{}];
          for (const b of binds) for (const formal of registers) for (const learner of GENDERS) for (const sp of npcGenders) {
            try { add(coachVoice(learner), 1, compose(it.s, { ...b, name: NAMES[0] }, { look, addressee: learner, speaker: sp, formal }), `${sit.id}:hint:${gid}.${it.id}`, sit.id); } catch { /* skip */ }
          }
        }
      }
      opts.log?.(`${variety === "neutral" ? "neutral " : ""}${sit.id}: ${out.size} lines so far`);
      // 3. "Perdón, ¿un latte?" (convo/soundalike.ts) for every name a learner can say, in this conversation's voices
      const checks = GLOBAL.lines.g_soundcheck ?? [];
      for (const list of Object.values(sit.entities || {})) for (const e of list) {
        const names = [e.en.split(" | ").join(" "), ...(e.forms ?? [])];
        if (!names.some((nm) => soundKey(nm).length >= 2 && nm.replace(/[^a-záéíóúüñ]/gi, "").length >= 4)) continue;
        for (const n of people) for (const g of GENDERS) checks.forEach((src, ci) => {
          try { add(npcVoice(n), n.speed ?? 1, compose(src, { X: e.id }, { look, addressee: g, speaker: n.gender, formal: !n.informal }), `${sit.id}:soundcheck:${e.id}[${ci}]`, sit.id); } catch { /* skip */ }
        });
      }
    }
    // 4. the global lines in the voice of everyone who speaks in a conversation
    for (const id of speakersSeen) {
      const n = NPCS[id];
      if (!n) continue;
      for (const [lid, variants] of Object.entries(GLOBAL.lines)) variants.forEach((src, i) => {
        const ph = placeholders(src);
        if (ph.entities.length || ph.values.length) return;
        for (const g of GENDERS) {
          try {
            // said wherever this person speaks
            const u = add(npcVoice(n), n.speed ?? 1, compose(src, {}, { look: () => undefined, addressee: g, speaker: n.gender, formal: !n.informal }), `global:${lid}[${i}]`);
            if (u) for (const sid of sitsOf.get(id) ?? []) if (!u.sits.includes(sid)) u.sits.push(sid);
          } catch { /* skip */ }
        }
      });
    }
    // the global example answers (asking to repeat, to slow down…)
    for (const [gid, g] of Object.entries(GLOBAL.hints)) for (const it of g.items) for (const formal of [true, false]) for (const learner of GENDERS) for (const sp of GENDERS) {
      try { add(coachVoice(learner), 1, compose(it.s, {}, { look: () => undefined, addressee: learner, speaker: sp, formal }), `global:hint:${gid}.${it.id}`); } catch { /* skip */ }
    }
    // passers-by in the town
    if (!opts.only?.length && (!opts.part || opts.part[0] === 0)) for (const l of AMBIENT_LINES) for (const g of GENDERS) add(ambientVoice(g), 1, { say: l.en, en: l.en } as Sentence, "ambient");
  }
  setVariety("default");
  return { utts: [...out.values()], errors };
}

/** The workers' lists as one: a line found by several keeps every conversation it is said in. */
export function mergeUtts(parts: EsUtt[][]): EsUtt[] {
  const out = new Map<string, EsUtt>();
  for (const list of parts) for (const u of list) {
    const k = `${u.voice}|${u.speed}|${u.say}`;
    const have = out.get(k);
    if (!have) { out.set(k, { ...u, sits: [...u.sits] }); continue; }
    for (const s of u.sits) if (!have.sits.includes(s)) have.sits.push(s);
  }
  return [...out.values()];
}
