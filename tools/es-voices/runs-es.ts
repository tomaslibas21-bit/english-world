// What Puerto Colibrí's conversations really say, for the voice list (lines-es.ts) and its checks (check-list-es.ts):
// every line a conversation speaks, with who said it, who held the floor and the learner's gender, from
//  • random conversations: the same runs as tools/enumerate.ts's fuzzSituation (its seeds, inputs and order), which
//    that file (shared with Maple Harbor and its fingerprint) keeps as they are;
//  • the scripted sims, for both learner genders (and with each date partner where a conversation has one: s84);
//  • probes, in a conversation with more than one speaker: a line said by whoever holds the floor ("held": no
//    c.speaker() before it in that turn, so its code doesn't choose the speaker) is asked again, with the words that
//    made it, at the moments where each other person holds the floor (forks of the runs' and sims' own moments). Luis
//    answers at the table what Lucía answered at her stand; Lucía, at the step questions only she asks, never does.
// Nothing here changes the game: the tools wrap the engine's methods while they run, to tell held lines from chosen
// ones, and share one language model per conversation as the game does (src/game/session.ts: sharedNlu), reading each
// sentence only once at each moment (Nlu.parse gives the same answer to the same question).
import fs from "node:fs";
import path from "node:path";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { Conversation, type SpokenLine, type TurnOut } from "../../src/convo/dialogue";
import { Nlu } from "../../src/convo/nlu";
import { compose } from "../../src/convo/compose";
import { EDITION } from "../../src/edition";
import type { EntityDef, SituationDef } from "../../src/content/types";
import { playSim } from "../sim-play";

const ROOT = path.resolve(import.meta.dirname, "../..");
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];

/** One line the game said. */
export interface Heard {
  line: SpokenLine;
  /** The learner's gender in that conversation. */
  gender: "m" | "f";
  how: "run" | "sim" | "probe";
  /** Said by whoever held the floor when the turn began (no c.speaker() before it in that turn). */
  held: boolean;
  /** Who held the floor when the turn began. */
  floor: string;
  /** What the learner said (null: the opening). */
  input: string | null;
}
export interface ObserveOpts {
  fuzzRuns?: number;
  /** The first random run (another set of runs than the list's, for a check). */
  firstRun?: number;
  /** Sim seeds per learner gender (the list: [1] for a male learner, [2] for a female one; a check can play more). */
  simSeeds?: (gender: "m" | "f") => number[];
  probes?: boolean;
  onLine: (h: Heard) => void;
}
export interface ObserveStats { runs: number; sims: number; moments: number; probes: number; misrouted: number; floors: string[] }

export const lookFor = (sit: SituationDef) => (id: string): EntityDef | undefined => {
  for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
  return GLOBAL.entities.find((e) => e.id === id);
};

/** The sentences random conversations say, as fuzzSituation builds them: the tests, the sims' turns and auto
 *  answers, and the hint examples. */
export function inputsOf(sit: SituationDef): string[] {
  const look = lookFor(sit);
  const inputs: string[] = [];
  for (const t of sit.tests || []) if (t.intent !== "none") inputs.push(t.say);
  for (const sim of sit.sims || []) { inputs.push(...sim.turns); inputs.push(...Object.values(sim.auto || {})); }
  for (const g of Object.values(sit.hints)) {
    const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
    for (const it of g.items) {
      const pool = ents.filter((e) => !it.only || it.only(e)).slice(0, 12);
      for (const e of pool.length ? pool : [null]) {
        try { inputs.push(compose(it.s, e ? { X: e.id, name: NAMES[0] } : { name: NAMES[0] }, { look }).en); } catch { /* skip */ }
      }
    }
  }
  return inputs;
}

// ---------------------------------------------------------------- the engine, watched
const TAG = new WeakMap<SpokenLine, { held: boolean; floor: string }>();
/** One language model per conversation, as the game keeps them (src/game/session.ts nluCache). */
const NLUS = new Map<string, Nlu>();
let watching = false;
/** Wraps the engine's methods (once, in the tool's process): which lines the floor holder says, and one parse per
 *  sentence and moment. */
function watch() {
  if (watching) return;
  watching = true;
  const P = Conversation.prototype as any;
  const { start, input, pushLine, ctx } = P;
  P.start = function (this: any) {
    // the sims build their own (playSim): the shared one instead, before anything is read
    const shared = NLUS.get(this.sit.id);
    if (shared) this.nlu = shared; else NLUS.set(this.sit.id, this.nlu);
    this.__floor = this.speakerId; this.__switched = false;
    return start.call(this);
  };
  P.input = function (this: any, text: string) { this.__floor = this.speakerId; this.__switched = false; return input.call(this, text); };
  P.ctx = function (this: any, heard?: string) {
    const c = ctx.call(this, heard);
    const speaker = c.speaker;
    c.speaker = (id: string) => { this.__switched = true; speaker(id); };
    return c;
  };
  P.pushLine = function (this: any, ...a: unknown[]) {
    pushLine.apply(this, a);
    const l = this.out.lines[this.out.lines.length - 1];
    if (l) TAG.set(l, { held: !this.__switched, floor: this.__floor ?? this.speakerId });
  };
  // the same sentence at the same moment reads the same: a copy of the first reading (the engine marks its pieces)
  const parse = Nlu.prototype.parse;
  const memo = new WeakMap<object, Map<string, unknown>>();
  Nlu.prototype.parse = function (this: Nlu, text: string, expected: string[] = [], primary: string[] = []) {
    let m = memo.get(this);
    if (!m) memo.set(this, (m = new Map()));
    const k = `${text}\u0000${expected.join(",")}\u0000${primary.join(",")}`;
    const hit = m.get(k);
    if (hit) return structuredClone(hit) as ReturnType<typeof parse>;
    const r = parse.call(this, text, expected, primary);
    if (m.size < 20000) { try { m.set(k, structuredClone(r)); } catch { /* not copyable: read it again next time */ } }
    return r;
  };
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- forks
/** A copy of the conversation's state: plain objects, arrays, maps and sets are copied; the items themselves (entity
 *  definitions), functions and class instances are shared. */
function copyState(v: any, keep: Set<object>, seen = new Map<any, any>()): any {
  if (v === null || typeof v !== "object" || keep.has(v)) return v;
  if (seen.has(v)) return seen.get(v);
  if (Array.isArray(v)) { const a: any[] = []; seen.set(v, a); for (const x of v) a.push(copyState(x, keep, seen)); return a; }
  if (v instanceof Map) { const m = new Map(); seen.set(v, m); for (const [k, x] of v) m.set(k, copyState(x, keep, seen)); return m; }
  if (v instanceof Set) { const s = new Set(); seen.set(v, s); for (const x of v) s.add(copyState(x, keep, seen)); return s; }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return v;
  const o: any = Object.create(proto);
  seen.set(v, o);
  for (const k of Object.keys(v)) o[k] = copyState(v[k], keep, seen);
  return o;
}
/** The same conversation at the same moment, to go on from separately (its own state and random numbers). */
export function fork(conv: Conversation, keep: Set<object>, seed: number): Conversation {
  const c = conv as any;
  const k = Object.create(Object.getPrototypeOf(conv));
  Object.assign(k, conv);
  k.s = copyState(c.s, keep);
  k.memoryOut = copyState(c.memoryOut, keep);
  k.lastVariant = new Map(c.lastVariant);
  k.tipShown = new Set(c.tipShown);
  k.twists = new Set(c.twists);
  k.seenSteps = new Set(c.seenSteps);
  k.lastTurn = c.lastTurn.slice();
  k.history = c.history.slice();
  k.soundCheck = c.soundCheck ? { ...c.soundCheck } : null;
  k.rng = rng(seed);
  return k;
}

/** Does the conversation pick its speaker from the learner's date partner (s84)? Then the sims play both. */
const partnerCache = new Map<string, boolean>();
export function usesPartner(sit: SituationDef): boolean {
  if (!partnerCache.has(sit.id)) {
    const f = path.join(ROOT, EDITION.contentDir, "situations", `${sit.id}.ts`);
    partnerCache.set(sit.id, fs.existsSync(f) && fs.readFileSync(f, "utf8").includes("datePartner"));
  }
  return partnerCache.get(sit.id)!;
}

interface Moment { conv: Conversation; origin: Conversation; step: string; pending: string; done: boolean; key: string }
const MOMENTS_KEPT = 64, MOMENTS_PROBED = 24, TRIGGERS = 4;

/** Plays a conversation every way the list knows: random runs, the sims, and (with more than one speaker) the probes.
 *  Returns the handler errors (as fuzzSituation does). */
export function observe(sit: SituationDef, opts: ObserveOpts): { errors: string[]; stats: ObserveStats } {
  watch();
  NLUS.clear(); // the last conversation's model (and what it read) can go
  const errors: string[] = [];
  const stats: ObserveStats = { runs: 0, sims: 0, moments: 0, probes: 0, misrouted: 0, floors: [] };
  const keep = new Set<object>();
  for (const l of Object.values(sit.entities || {})) for (const e of l) keep.add(e);
  const multi = [sit.npc, ...(sit.npcs || [])].filter((id) => NPCS[id]).length > 1;
  // the moments where each person holds the floor (forks), and the held lines with the words that made them
  const moments = new Map<string, Map<string, Moment>>();
  const heldBy = new Map<string, Set<string>>();
  const triggers = new Map<string, string[]>();
  // (every moment a sim reaches is kept; random runs' only up to MOMENTS_KEPT a person)
  const snap = (conv: Conversation, fromSim = false) => {
    if (!multi || conv.ended) return;
    const floor = conv.speakerId;
    const key = `${conv.step ?? ""}|${conv.pending?.id ?? ""}|${conv.completed ? 1 : 0}`;
    let m = moments.get(floor);
    if (!m) moments.set(floor, (m = new Map()));
    if (m.has(key) || (!fromSim && m.size >= MOMENTS_KEPT)) return;
    m.set(key, { conv: fork(conv, keep, m.size + 1), origin: conv, step: conv.step ?? "", pending: conv.pending?.id ?? "", done: conv.completed, key });
  };
  // `floor`: who held the floor when the turn began, for lines said again from an earlier turn ("¿Puede repetir?"
  // replays them untagged): p26's recorded message, replayed, still never holds the floor
  const take = (o: TurnOut, gender: "m" | "f", how: Heard["how"], input: string | null, floor: string) => {
    const turnFloor = o.lines.map((l) => TAG.get(l)?.floor).find(Boolean) ?? floor;
    for (const line of o.lines) {
      if (!NPCS[line.npc]) continue;
      const tag = TAG.get(line);
      const h: Heard = { line, gender, how, held: !!tag?.held, floor: tag?.floor ?? turnFloor, input };
      if (h.held && input) {
        let s = heldBy.get(line.lineId);
        if (!s) heldBy.set(line.lineId, (s = new Set()));
        s.add(h.floor);
        const t = triggers.get(line.lineId) ?? [];
        if (t.length < TRIGGERS && !t.includes(input)) { t.push(input); triggers.set(line.lineId, t); }
      }
      opts.onLine(h);
    }
  };

  // 1. random conversations (fuzzSituation's, run for run)
  const inputs = inputsOf(sit);
  const first = opts.firstRun ?? 0;
  for (let r = first; r < first + (opts.fuzzRuns ?? 120); r++) {
    const rand = rng(r * 7919 + sit.id.length);
    const partner = rand() < 0.5 ? "sam" : "emma";
    const visits = Math.floor(rand() * 4);
    let conv: Conversation;
    let gender: "m" | "f" = "m";
    try {
      gender = rand() < 0.5 ? "m" : "f";
      conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: EDITION.simPlayer.name, surname: EDITION.simPlayer.surname, gender, datePartner: partner }, visits, seed: r + 1, memory: r % 3 === 0 ? {} : undefined, sharedNlu: NLUS });
    } catch (e: any) { errors.push(`${sit.id}: constructor: ${e.message}`); break; }
    stats.runs++;
    try { take(conv.start(), gender, "run", null, conv.speakerId); } catch (e: any) { errors.push(`${sit.id}: start: ${e.message}`); continue; }
    for (let t = 0; t < 16 && !conv.ended; t++) {
      const say = inputs[Math.floor(rand() * inputs.length)] ?? "yes";
      snap(conv);
      const floor = conv.speakerId;
      try { take(conv.input(say), gender, "run", say, floor); }
      catch (e: any) { errors.push(`${sit.id}: input "${say}" (seed ${r + 1}, visits ${visits}): ${e.message}`); break; }
    }
  }

  // 2. the scripted sims, for both learner genders (and both date partners where there is one)
  const partners = usesPartner(sit) ? ["sam", "emma"] : [undefined];
  for (const sim of sit.sims ?? []) for (const [k, g] of (["m", "f"] as const).entries()) for (const seed of opts.simSeeds?.(g) ?? [k + 1]) for (const datePartner of partners) {
    try {
      stats.sims++;
      let floor = sit.npc; // who holds the floor as each turn begins
      playSim(sit, sim, seed, { gender: g, datePartner, onTurn: (conv, turn, o) => { take(o, g, "sim", turn?.say ?? null, floor); floor = conv.speakerId; snap(conv, true); } });
    } catch (e: any) { errors.push(`${sit.id}: sim ${sim.name}: ${e.message}`); }
  }

  // 3. probes: each held line, with the words that made it, where each other person holds the floor
  const floors = [...moments.keys()].filter((f) => moments.get(f)!.size);
  stats.floors = floors;
  stats.moments = floors.reduce((a, f) => a + moments.get(f)!.size, 0);
  if (opts.probes !== false && floors.length > 1) {
    // a spread of moments per person: one for each step, then for each open question, then the goodbye (the task done:
    // Lucía answers the bill question when she said goodbye last), then the rest
    const chosen = new Map<string, Moment[]>();
    for (const f of floors) {
      const all = [...moments.get(f)!.values()];
      const picked: Moment[] = [];
      const round = (by: (m: Moment) => string) => { const seen = new Set(picked.map(by)); for (const m of all) if (!picked.includes(m) && !seen.has(by(m))) { seen.add(by(m)); picked.push(m); } };
      round((m) => m.step); round((m) => m.pending); round((m) => String(m.done));
      chosen.set(f, [...picked, ...all.filter((m) => !picked.includes(m))].slice(0, MOMENTS_PROBED));
    }
    const done = new Set<string>();
    let n = 0;
    const probe = (m: Moment, text: string) => {
      const k = `${m.key}|${m.conv.speakerId}|${text}`;
      if (done.has(k)) return;
      done.add(k);
      const p = fork(m.conv, keep, 1000 + n++);
      // a question left open by an earlier turn may still name that turn's ctx: what it says then lands in the run it
      // came from, not in this fork; such a probe counts for nothing
      const origin = (m.origin as any).out as TurnOut | undefined;
      const before = origin?.lines.length ?? 0;
      let o: TurnOut;
      try { o = p.input(text); } catch { return; }
      stats.probes++;
      if ((origin?.lines.length ?? 0) !== before) { stats.misrouted++; return; }
      take(o, p.opt.player.gender as "m" | "f", "probe", text, m.conv.speakerId);
    };
    for (const lid of [...heldBy.keys()]) {
      if (!sit.lines[lid]) continue; // the global lines are voiced for everyone who speaks
      for (const f of floors) {
        if (heldBy.get(lid)!.has(f)) continue;
        for (const m of chosen.get(f)!) {
          for (const text of triggers.get(lid) ?? []) probe(m, text);
          if (heldBy.get(lid)!.has(f)) break;
        }
      }
    }
  }
  return { errors, stats };
}
