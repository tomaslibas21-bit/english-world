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
// What the conversations really say comes first (runs-es.ts: random runs, the sims, and probes where a conversation
// has more than one speaker), played once and made in both Spanishes; it shows each line's speakers, the item lists
// it is said with and how its items are bound (one or two: "los papadzules"). Then every line's text is made with
// what that showed:
//  • a line in the voice of everyone heard saying it (a line held by whoever has the floor was asked again where each
//    other person has it: Luis's side answers at the table); one nobody was heard saying, in the voice of whoever
//    says the lines around it, or of everyone in the conversation;
//  • an item line with the item lists it was heard with (all lists when it never was: reported), and each item bound
//    as the line binds the items of its kind: the quantity heard with them, else as most of the conversation's item
//    lines bind that kind, else two for an item that is always plural (attrs.plural / attrs.many, as the conversations
//    bind them: B(), taskVar(), tv(), bind()) and one for the rest;
//  • a value line with the values reach-es.ts lets through; a line with two items, or an item and a value, with the
//    bindings reach-es.ts BINDINGS reads in its code (else only as heard: warned about).
// Each line also records the conversations it is said in, for the setting's direction (casting-es.ts SCENES), and how
// the list found it (`why`: "heard", or the kind of line and what was not heard: who? list? qty?), for the checks.
// Run with the edition overlay: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/…
import { SITUATIONS } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS, type NpcDef } from "../../src/content/npcs";
import { AMBIENT_LINES } from "../../src/content/ambient";
import { ambientVoice, coachVoice, npcVoice } from "../../src/content/voices";
import { withoutAddressedNames } from "../../src/audio-key";
import { addressInformal, compose, placeholders, setVariety, type Sentence } from "../../src/convo/compose";
import { soundKey } from "../../src/convo/soundalike";
import { EDITION } from "../../src/edition";
import type { EntityDef, SituationDef } from "../../src/content/types";
import { hintBinding } from "../../src/convo/target";
import { lookFor, observe, usesPartner, type Heard, type ObserveStats } from "./runs-es";
import { BINDINGS, LISTS, codeSpeakers, idOf, reachFilter, reachOf } from "./reach-es";

/** The learner the tools play: lines that address them by name are voiced without the name (as the game does). */
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];
const NAMES_RE = new RegExp(`\\b(${NAMES.join("|")})\\b`);
const GENDERS = ["m", "f"] as const;
const VARIETIES = ["default", "neutral", "spain"] as const;

export interface EsUtt {
  voice: string; speed: number;
  /** What is said (the clip's text) and what the line shows (digits, "$85.50"). */
  say: string; shown: string;
  /** Where it was first found ("s72-cafe:greet[0]", "s72-cafe:sim", "global:…", "ambient"). */
  where: string;
  /** The conversations it is said in (none for global lines found outside one, and for passers-by). */
  sits: string[];
  /** In the neutral Latin American set (an esn_ voice). */
  neutral?: boolean;
  /** In Spain's set (an esp_ voice). */
  spain?: boolean;
  /** How the list found it: "heard" (a run, a sim or a probe said it), or the kind of line it was made from ("line",
   *  "item", "value", "pair", "hint", "soundcheck", "global", "ambient") and what of it nobody was heard saying:
   *  "who?" (the speaker), "list?" (the item list), "qty?" (one or two of this kind of item); "pl": an item bound in the
   *  plural; "+probe" / "+code": a speaker heard only in a probe, or only read in the code. */
  why?: string;
}
export interface LinesResult { utts: EsUtt[]; errors: string[]; warnings: string[]; stats: Record<string, ObserveStats> }

/** An item always said in the plural ("los papadzules", "los pantalones"): the conversations bind it with qty 2. */
const pluralItem = (e: EntityDef | undefined) => !!(e?.attrs?.plural || e?.attrs?.many);
/** What the runs showed about one line: who said it (and how they were heard: run, sim, probe), with which item lists,
 *  and how many of each kind of item ("<placeholder>|sg" / "|pl"). */
interface Said { by: Set<string>; how: Map<string, Set<string>>; lists: Map<string, Set<string>>; qty: Map<string, Set<number>> }

/** `part` [k, n]: only every n-th conversation from the k-th (the passers-by in part 0), for workers running side by
 *  side; their lists merge into the whole one (mergeUtts). */
export function enumerateEs(opts: { fuzzRuns?: number; only?: string[]; part?: [number, number]; probes?: boolean; log?: (s: string) => void } = {}): LinesResult {
  if (EDITION.id !== "es") throw new Error("the Spanish lines need the Spanish edition: EDITION=es npx tsx --import ./tools/edition-hook.mjs …");
  const out = new Map<string, EsUtt>();
  const errors: string[] = [], warnings: string[] = [];
  const stats: Record<string, ObserveStats> = {};
  const add = (voice: string, speed: number, s: Sentence, where: string, sit: string | undefined, why: string): EsUtt | undefined => {
    if (!s.say.trim()) return;
    if (/\s[.,!?]/.test(s.say)) return; // a value was missing ("Me llamo .")
    const alt = withoutAddressedNames(s.say, NAMES);
    const say = alt ?? s.say;
    if (alt === null && NAMES_RE.test(say)) return; // the learner's name is part of the line: the browser voice says it
    const k = `${voice}|${speed}|${say}`;
    let u = out.get(k);
    if (!u) out.set(k, (u = { voice, speed, say, shown: s.en, where, sits: [], ...(voice.startsWith("esn_") ? { neutral: true } : voice.startsWith("esp_") ? { spain: true } : {}), why }));
    else u.why = betterWhy(u.why, why);
    if (sit && !u.sits.includes(sit)) u.sits.push(sit);
    return u;
  };
  const sits = SITUATIONS.filter((s, i) => (!opts.only?.length || opts.only.some((o) => s.id.startsWith(o))) && (!opts.part || i % opts.part[1] === opts.part[0]));
  const speakersSeen = new Set<string>();
  const sitsOf = new Map<string, Set<string>>(); // npc id → the conversations they speak in
  // npc id → the conversations where they can say the global lines (g_ack, g_repeat…: said by whoever holds the floor
  // when the learner speaks): they held it at a learner's turn, or were heard saying one, or were never heard at all.
  // p26's recorded message (harbor_bot) speaks only between Jorge's and Brenda's lines, never holds it: none for it.
  const globalIn = new Map<string, Set<string>>();
  const addTo = <T,>(m: Map<string, Set<T>>, k: string, v: T) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };

  for (const sit of sits) {
    const look = lookFor(sit);
    const cast = [sit.npc, ...(sit.npcs || [])].filter((id) => NPCS[id]);
    const listOf = new Map<string, string>();
    for (const [ln, list] of Object.entries(sit.entities || {})) for (const e of list) listOf.set(e.id, ln);
    // 0. what the game says (runs-es.ts), made at once in both Spanishes: the same line, vars and learner
    const said = new Map<string, Said>();
    const saidOf = (lid: string) => { let s = said.get(lid); if (!s) said.set(lid, (s = { by: new Set(), how: new Map(), lists: new Map(), qty: new Map() })); return s; };
    // s84: the date is the learner's choice (Santiago or Camila), and the one chosen says every line
    const anyone = usesPartner(sit) ? cast.map((id) => NPCS[id]) : null;
    const heardBy = new Set<string>();
    const heard = (h: Heard) => {
      if (h.input !== null) addTo(globalIn, h.floor, sit.id);
      if (GLOBAL.lines[h.line.lineId] && !sit.lines[h.line.lineId]) addTo(globalIn, h.line.npc, sit.id);
      heardBy.add(h.line.npc);
      if (anyone?.some((n) => n.id === h.line.npc)) {
        for (const other of anyone) if (other.id !== h.line.npc) say(h, other);
      }
      say(h, NPCS[h.line.npc]);
    };
    const say = (h: Heard, n: NpcDef) => {
      const src = (sit.lines[h.line.lineId] ?? GLOBAL.lines[h.line.lineId])?.[h.line.variant];
      const where = `${sit.id}:${h.how === "run" ? "fuzz" : h.how}`;
      const own = n.id === h.line.npc;
      // the sentence the conversation made, and (for the other date) the same line, vars and learner in their voice
      const opts = { look, addressee: h.gender, speaker: n.gender ?? "f", formal: !addressInformal(n) };
      if (own) add(npcVoice(n), n.speed ?? 1, h.line.sentence, where, sit.id, "heard");
      else if (src) { try { add(npcVoice(n), n.speed ?? 1, compose(src, h.line.vars, opts), where, sit.id, "heard"); } catch { /* skip */ } }
      if (src) for (const v of ["neutral", "spain"] as const) {
        setVariety(v);
        try { add(npcVoice(n), n.speed ?? 1, compose(src, h.line.vars, { ...opts, formal: !addressInformal(n) }), where, sit.id, "heard"); }
        catch { /* the twin doesn't take these vars */ }
        finally { setVariety("default"); }
      }
      if (!own) return;
      const s = saidOf(h.line.lineId);
      s.by.add(h.line.npc);
      addTo(s.how, h.line.npc, h.how);
      speakersSeen.add(h.line.npc);
      addTo(sitsOf, h.line.npc, sit.id);
      for (const [ph, v] of Object.entries(h.line.vars ?? {})) {
        const id = idOf(v);
        const ln = id ? listOf.get(id) : undefined;
        if (!ln) continue;
        addTo(s.lists, ph, ln);
        const qty = typeof v === "object" && v ? Number((v as { qty?: number }).qty ?? 1) : 1;
        addTo(s.qty, `${ph}|${pluralItem(look(id!)) ? "pl" : "sg"}`, qty);
      }
    };
    const res = observe(sit, { fuzzRuns: opts.fuzzRuns ?? 120, probes: opts.probes, onLine: heard });
    errors.push(...res.errors);
    stats[sit.id] = res.stats;
    for (const id of cast) { speakersSeen.add(id); addTo(sitsOf, id, sit.id); if (!heardBy.has(id)) addTo(globalIn, id, sit.id); }
    const people = cast.map((id) => NPCS[id]);
    // a line nobody was heard saying belongs to whoever says the lines around it (the lines come grouped by speaker:
    // Agente Medina's customs lines after Itzel's), when both neighbours agree on one person; else to everyone here
    const ids = Object.keys(sit.lines);
    const single = (lid: string | undefined) => (lid && said.get(lid)?.by.size === 1 ? [...said.get(lid)!.by][0] : undefined);
    const near = (i: number, step: number) => { for (let j = i + step; j >= 0 && j < ids.length; j += step) if (said.has(ids[j])) return single(ids[j]); return undefined; };
    const code = codeSpeakers(sit);
    const guessed = new Map<string, string>();
    ids.forEach((lid, i) => { if (!said.has(lid)) { const a = near(i, -1), b = near(i, 1); if (a && a === b) guessed.set(lid, a); } });

    // how this conversation binds items of each kind in the lines heard (s32 binds its produce in the plural: "¿Cuántos
    // aguacates?"): the quantity most of its item lines use, for an item line never heard with that kind
    const kindQty = new Map<string, number>();
    for (const kind of ["sg", "pl"]) {
      const votes = new Map<number, number>();
      for (const sd of said.values()) for (const [k, qs] of sd.qty) if (k.endsWith(`|${kind}`)) for (const q of qs) votes.set(q, (votes.get(q) ?? 0) + 1);
      const best = [...votes].sort((a, b) => b[1] - a[1])[0];
      kindQty.set(kind, best ? best[0] : kind === "pl" ? 2 : 1);
    }
    // 1. every line variant, with what the runs showed: its speakers, item lists, quantities and values
    const plan: { lid: string; i: number; binds: { b: Record<string, unknown>; why: string }[]; speakers: NpcDef[]; who: string; tag: Map<string, string> }[] = [];
    for (const [lid, variants] of Object.entries(sit.lines)) {
      const s = said.get(lid);
      // everyone heard saying it, and everyone the code makes say it (reach-es.ts codeSpeakers); else a guess
      const known = new Set([...(s?.by ?? []), ...(code.get(lid) ?? [])]);
      const speakers = anyone ?? (known.size ? [...known].map((id) => NPCS[id]).filter(Boolean) : guessed.has(lid) ? [NPCS[guessed.get(lid)!]] : people);
      const who = known.size || anyone || people.length === 1 ? "" : "who?";
      // how each speaker came in, for the comparison with the old list: heard only in a probe, or only from the code
      const tag = new Map(speakers.map((n) => {
        const how = s?.how.get(n.id);
        return [n.id, how?.has("run") || how?.has("sim") ? "" : how?.has("probe") ? "+probe" : code.get(lid)?.has(n.id) ? "+code" : ""];
      }));
      const reach = reachFilter(sit, lid);
      const pairs = BINDINGS[`${sit.id}:${lid}`] as ((s: SituationDef) => Record<string, unknown>[]) | undefined;
      variants.forEach((src, i) => {
        const ph = placeholders(src);
        const binds: { b: Record<string, unknown>; why: string }[] = [];
        // a value with no list of its own: the fixed values its calls give (reach-es.ts reachOf), if they all do
        const fixed = reachOf(sit).get(lid);
        const domOf = (v: string): unknown[] | undefined => (sit.domains?.[v] ? sit.domains[v]() : fixed?.how === "fixed" ? fixed.values?.[v] : undefined);
        const valuesListed = ph.values.every((v) => domOf(v));
        // a BINDINGS entry that no longer binds every placeholder (the line changed since it was read) is not used
        const need = [...ph.entities, ...ph.values];
        const listed = pairs?.(sit) ?? [];
        const stale = pairs && !(listed.length && listed.every((b) => need.every((n) => n in b)));
        if (stale) warnings.push(`${sit.id}:${lid}: reach-es.ts BINDINGS doesn't bind ${need.filter((n) => !listed.length || listed.some((b) => !(n in b))).join(", ")} (the line changed?): made without it`);
        if (pairs && !stale) {
          for (const b of listed) binds.push({ b, why: "pair" });
        } else if (!ph.entities.length && !ph.values.length) binds.push({ b: {}, why: "line" });
        else if (!ph.entities.length && valuesListed) {
          // only the values the line can really be said with (reach-es.ts: fixed values from its calls, rules)
          let combos: Record<string, unknown>[] = [{}];
          for (const v of ph.values) {
            const dom = domOf(v)!;
            const next: Record<string, unknown>[] = [];
            for (const c of combos) for (const d of dom) next.push({ ...c, [v]: d });
            combos = reach ? next : next.slice(0, 800);
          }
          // a rule that keeps none of the values reads the line as it was (its values renamed?): every value stays
          const kept = reach ? combos.filter(reach) : combos;
          if (reach && combos.length && !kept.length) warnings.push(`${sit.id}:${lid}: reach-es.ts keeps none of its values (the line changed?): every value kept`);
          for (const b of (kept.length ? kept : combos).slice(0, 800)) binds.push({ b, why: "value" });
        } else if (ph.entities.length === 1 && !ph.values.length) {
          // the item lists it was heard with (else every list), each item bound as the line binds items of its kind
          const P = ph.entities[0];
          const read = LISTS[`${sit.id}:${lid}`];
          const lists = read ? new Set([...read, ...(s?.lists.get(P) ?? [])]) : s?.lists.get(P);
          // a line and its "_pl" twin heard with the two kinds apart (one for the always-plural items, the other for
          // the rest: s74's sayN, s73's veg_no) keep them apart
          const kinds = (l: string) => new Set(["sg", "pl"].filter((k) => said.get(l)?.qty.has(`${P}|${k}`)));
          const mine = kinds(lid), theirs = kinds(lid.endsWith("_pl") ? lid.slice(0, -3) : `${lid}_pl`);
          const apart = mine.size > 0 && theirs.size > 0 && [...mine].every((k) => !theirs.has(k));
          for (const [ln, list] of Object.entries(sit.entities || {})) {
            if (lists && !lists.has(ln)) continue;
            for (const e of list) {
              const kind = pluralItem(e) ? "pl" : "sg";
              if (apart && !mine.has(kind)) continue;
              const qs = s?.qty.get(`${P}|${kind}`);
              const flags = [...(lists ? [] : ["list?"]), ...(qs ? [] : ["qty?"])];
              for (const q of qs ?? [kindQty.get(kind)!]) {
                const b = { [P]: q === 1 ? e.id : { id: e.id, qty: q } };
                if (!reach || reach(b)) binds.push({ b, why: ["item", ...(q > 1 ? ["pl"] : []), ...flags].join(" ") });
              }
            }
          }
        } else if (i === 0 || !variants.slice(0, i).some((v) => sameShape(v, src))) {
          warnings.push(`${sit.id}:${lid}: ${ph.entities.length > 1 ? `${ph.entities.length} items` : ph.entities.length ? "an item and a value" : "a value with no list"} (${[...ph.entities, ...ph.values.map((v) => "$" + v)].join(", ")}): voiced only as heard (${s ? "heard" : "never heard"}); a reach-es.ts BINDINGS entry would list every binding`);
        }
        plan.push({ lid, i, binds, speakers, who, tag });
      });
    }
    for (const variety of VARIETIES) {
      setVariety(variety); // the text (neutral or Spain twins) and the voice ids (es_ / esn_ / esp_) of this Spanish
      for (const { lid, i, binds, speakers, who, tag } of plan) {
        const src = sit.lines[lid][i];
        for (const { b, why } of binds) for (const n of speakers) for (const g of GENDERS) {
          try { add(npcVoice(n), n.speed ?? 1, compose(src, b, { look, addressee: g, speaker: n.gender, formal: !addressInformal(n) }), `${sit.id}:${lid}[${i}]`, sit.id, [why, who, tag.get(n.id)].filter(Boolean).join(" ")); }
          catch { /* this entity doesn't fit this line */ }
        }
      }
      // 2. the example answers: the coach of the learner's gender, the register and gender of whom they speak to
      const registers = [...new Set(people.map((n) => !addressInformal(n)))];
      const npcGenders = [...new Set(people.map((n) => n.gender))];
      for (const [gid, g] of Object.entries(sit.hints)) {
        const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
        for (const it of g.items) {
          const pool = ents.filter((e) => !it.only || it.only(e));
          // as the game binds the item in a hint (target.ts hintBinding: an always-plural item with two)
          const binds = pool.length ? pool.map((e) => ({ X: hintBinding(e, e.id) })) : [{}];
          for (const b of binds) for (const formal of registers) for (const learner of GENDERS) for (const sp of npcGenders) {
            try { add(coachVoice(learner), 1, compose(it.s, { ...b, name: NAMES[0] }, { look, addressee: learner, speaker: sp, formal }), `${sit.id}:hint:${gid}.${it.id}`, sit.id, "hint"); } catch { /* skip */ }
          }
        }
      }
      // 3. "Perdón, ¿un latte?" (convo/soundalike.ts) for every name a learner can say, in this conversation's voices
      const checks = GLOBAL.lines.g_soundcheck ?? [];
      for (const list of Object.values(sit.entities || {})) for (const e of list) {
        const names = [e.en.split(" | ").join(" "), ...(e.forms ?? [])];
        if (!names.some((nm) => soundKey(nm).length >= 2 && nm.replace(/[^a-záéíóúüñ]/gi, "").length >= 4)) continue;
        for (const n of people) for (const g of GENDERS) checks.forEach((src, ci) => {
          try { add(npcVoice(n), n.speed ?? 1, compose(src, { X: e.id }, { look, addressee: g, speaker: n.gender, formal: !addressInformal(n) }), `${sit.id}:soundcheck:${e.id}[${ci}]`, sit.id, "soundcheck"); } catch { /* skip */ }
        });
      }
    }
    setVariety("default");
    const st = res.stats;
    opts.log?.(`${sit.id}: ${out.size} lines so far (${st.runs} runs, ${st.sims} sims${st.probes ? `, ${st.probes} probes where ${st.floors.join(" / ")} hold the floor` : ""})`);
  }
  for (const variety of VARIETIES) {
    setVariety(variety);
    // 4. the global lines in the voice of everyone who can hold the floor in a conversation (globalIn)
    for (const id of speakersSeen) {
      const n = NPCS[id];
      if (!n || !globalIn.get(id)?.size) continue;
      for (const [lid, variants] of Object.entries(GLOBAL.lines)) variants.forEach((src, i) => {
        const ph = placeholders(src);
        if (ph.entities.length || ph.values.length) return;
        for (const g of GENDERS) {
          try {
            // said wherever this person speaks
            const u = add(npcVoice(n), n.speed ?? 1, compose(src, {}, { look: () => undefined, addressee: g, speaker: n.gender, formal: !addressInformal(n) }), `global:${lid}[${i}]`, undefined, "global");
            if (u) for (const sid of globalIn.get(id) ?? []) if (!u.sits.includes(sid)) u.sits.push(sid);
          } catch { /* skip */ }
        }
      });
    }
    // the global example answers (asking to repeat, to slow down…)
    for (const [gid, g] of Object.entries(GLOBAL.hints)) for (const it of g.items) for (const formal of [true, false]) for (const learner of GENDERS) for (const sp of GENDERS) {
      try { add(coachVoice(learner), 1, compose(it.s, {}, { look: () => undefined, addressee: learner, speaker: sp, formal }), `global:hint:${gid}.${it.id}`, undefined, "global-hint"); } catch { /* skip */ }
    }
    // passers-by in the town
    if (!opts.only?.length && (!opts.part || opts.part[0] === 0)) for (const l of AMBIENT_LINES) for (const g of GENDERS) add(ambientVoice(g), 1, { say: l.en, en: l.en } as Sentence, "ambient", undefined, "ambient");
  }
  setVariety("default");
  return { utts: [...out.values()], errors, warnings: [...new Set(warnings)], stats };
}

/** Two variants with the same placeholders (one warning per line). */
const sameShape = (a: Parameters<typeof placeholders>[0], b: Parameters<typeof placeholders>[0]) => JSON.stringify(placeholders(a)) === JSON.stringify(placeholders(b));

/** Heard beats made; among made ones, fewer guesses. */
export function betterWhy(a: string | undefined, b: string | undefined): string | undefined {
  if (a === "heard" || b === "heard") return "heard";
  if (!a) return b;
  if (!b) return a;
  const doubts = (w: string) => (w.match(/\?/g) ?? []).length;
  return doubts(b) < doubts(a) ? b : a;
}

/** The workers' lists as one: a line found by several keeps every conversation it is said in. */
export function mergeUtts(parts: EsUtt[][]): EsUtt[] {
  const out = new Map<string, EsUtt>();
  for (const list of parts) for (const u of list) {
    const k = `${u.voice}|${u.speed}|${u.say}`;
    const have = out.get(k);
    if (!have) { out.set(k, { ...u, sits: [...u.sits] }); continue; }
    for (const s of u.sits) if (!have.sits.includes(s)) have.sits.push(s);
    have.why = betterWhy(have.why, u.why);
  }
  return [...out.values()];
}
