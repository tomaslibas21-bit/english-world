// Dialogue manager: runs one conversation for a situation.
//
// Each learner utterance is parsed (NLU), then:
//   1. a pending question (set by ctx.expect) gets the first chance to handle it;
//   2. each intent segment runs its situation handler (or the global one);
//   3. a bare yes/no goes to the pending question or the current step;
//   4. unless a handler held the turn, the NPC asks the next unfinished step.
// Nothing here is generative: every NPC sentence is an authored line.

import type { Ctx, EntityDef, Handler, HintGroup, Pending, SentSrc, SituationDef, StepDef, Suggestion, Tip } from "../content/types";
import { compose, type Sentence, type Vars } from "./compose";
import { Nlu, type NluResult, type Parse, type ParsedSegment } from "./nlu";
import type { Gender } from "./lt-morph";


/** Global intents that carry no content of their own ("okay", "thanks", "sorry"). */
const SOFT_INTENTS = new Set(["g_ok", "g_thanks", "g_sorry"]);
export interface GlobalContent {
  intents: Record<string, { patterns: string[] }>;
  lines: Record<string, SentSrc[]>;
  hints: Record<string, HintGroup>;
  tips: Record<string, Tip>;
  entities: EntityDef[];
  handlers: Record<string, (c: ConvCtx, slots: any) => void>;
  macros: Record<string, string | string[]>;
}

export interface NpcInfo { id: string; name: string; gender: Gender; voice: string; speed?: number; /** addresses the player with "tu" */ informal?: boolean }

export interface SpokenLine {
  npc: string;
  lineId: string;
  variant: number;
  vars: Vars;
  sentence: Sentence;
  slow?: boolean;
}

export interface TurnOut {
  lines: SpokenLine[];
  understood: boolean;
  heard?: string;
  parse?: Parse;
  /** Consecutive failures (first one is shown only in the UI, no NPC reaction). */
  failures: number;
  prefix?: boolean;
  tips: Tip[];
  hintsUsed: string[];
  completed: boolean;
  ended: boolean;
  events: { name: string; data?: any }[];
  note?: { en: string; lt?: string };
  showMeaning?: boolean;
}

export interface ConvOptions {
  global: GlobalContent;
  npcs: Record<string, NpcInfo>;
  player: { name: string; surname: string; gender: Gender; datePartner?: string };
  visits: number;
  seed?: number;
  sharedNlu?: Map<string, Nlu>;
  /** Memory saved from earlier visits of this situation. */
  memory?: Record<string, any>;
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build (and cache) the NLU for a situation: situation intents + global intents. With `npcs`, the
 *  learner may also address the situation's people by name ("Hi Mia, …", "Thank you, Officer Diaz"). */
export function buildNlu(sit: SituationDef, global: GlobalContent, npcs?: Record<string, NpcInfo>): Nlu {
  const nlu = new Nlu();
  if (npcs) nlu.setVocatives([sit.npc, ...(sit.npcs || [])].map((id) => npcs[id]?.name).filter(Boolean) as string[]);
  const g = nlu.g;
  // entities → lexicon slots
  const allEnts: Record<string, EntityDef[]> = { ...(sit.entities || {}) };
  const lex: Record<string, { lexicon: { id: string; forms: string[] }[] }> = {};
  for (const [type, list] of Object.entries(allEnts)) {
    lex[type] = { lexicon: list.map((e) => ({ id: e.id, forms: entityForms(e) })) };
  }
  g.defineSlots(lex);
  for (const [name, p] of Object.entries(global.macros)) g.defineMacro(name, p);
  if (sit.grammar?.macros) for (const [name, p] of Object.entries(sit.grammar.macros)) g.defineMacro(name, p);
  if (sit.grammar?.slots) g.defineSlots(sit.grammar.slots);
  for (const [id, def] of Object.entries(sit.intents)) nlu.addIntent(id, def.patterns, { catchAll: id.endsWith("_unknown"), contextual: id.endsWith("_ctx") });
  for (const [id, def] of Object.entries(global.intents)) if (!sit.intents[id]) nlu.addIntent(id, def.patterns, { global: true });
  return nlu;
}

export function entityForms(e: EntityDef): string[] {
  const f = new Set<string>();
  f.add(e.en.split(" | ").join(" "));
  if (e.pl) f.add(e.pl.split(" | ").join(" "));
  for (const x of e.forms || []) f.add(x);
  return [...f];
}

export interface ConvCtx extends Ctx {
  conv: Conversation;
}

export class Conversation {
  sit: SituationDef;
  opt: ConvOptions;
  nlu: Nlu;
  s: Record<string, any> = {};
  step: string | null = null;
  pending: Pending | null = null;
  completed = false;
  ended = false;
  speakerId: string;
  slow = false;
  failures = 0;
  lastTurn: SpokenLine[] = [];
  history: { who: "npc" | "you"; text: string }[] = [];
  private rng: () => number;
  private out!: TurnOut;
  private held = false;
  /** This turn replays the previous one ("Say that again", "Slower"): it never becomes the last turn. */
  private replayed = false;
  /** A later piece of an intent already handled this turn: its lines never repeat one already said. */
  private quietRepeats = false;
  private lastVariant = new Map<string, number>();
  private tipShown = new Set<string>();
  private entIndex = new Map<string, EntityDef>();
  twists = new Set<string>();
  /** Values to persist for the next visit. */
  memoryOut: Record<string, any> = {};

  constructor(sit: SituationDef, opt: ConvOptions) {
    this.sit = sit;
    this.opt = opt;
    this.rng = mulberry32(opt.seed ?? (Date.now() & 0xffffffff));
    const cache = opt.sharedNlu;
    const cached = cache?.get(sit.id);
    this.nlu = cached ?? buildNlu(sit, opt.global, opt.npcs);
    if (cache && !cached) cache.set(sit.id, this.nlu);
    this.speakerId = sit.npc;
    for (const list of Object.values(sit.entities || {})) for (const e of list) this.entIndex.set(e.id, e);
    for (const e of opt.global.entities) if (!this.entIndex.has(e.id)) this.entIndex.set(e.id, e);
  }

  look = (id: string) => this.entIndex.get(id);
  entities(type: string): EntityDef[] { return this.sit.entities?.[type] || []; }

  private newOut(): TurnOut {
    return { lines: [], understood: true, failures: this.failures, tips: [], hintsUsed: [], completed: false, ended: false, events: [] };
  }

  private ctx(heard = ""): ConvCtx {
    const self = this;
    const c: ConvCtx = {
      conv: self,
      s: self.s,
      visits: self.opt.visits,
      player: self.opt.player,
      get step() { return self.step; },
      heard,
      rng: () => self.rng(),
      chance: (p) => self.rng() < p,
      pick: <T,>(arr: readonly T[]) => arr[Math.floor(self.rng() * arr.length)],
      say: (lineId, vars) => self.say(lineId, vars || {}),
      speaker: (id) => { self.speakerId = id; },
      ask: (stepId) => {
        const st = self.sit.steps.find((x) => x.id === stepId);
        if (!st) throw new Error(`Unknown step ${stepId}`);
        self.step = st.id; st.ask(c); self.held = true;
      },
      hold: () => { self.held = true; },
      expect: (p) => { self.pending = p; self.held = true; },
      tip: (t) => self.tip(t),
      complete: () => { if (!self.completed) { self.completed = true; self.out.completed = true; } },
      end: () => { self.ended = true; self.out.ended = true; },
      twist: (id) => { self.twists.add(id); },
      event: (name, data) => { self.out.events.push({ name, data }); },
      memory: self.opt.memory || {},
      remember: (patch) => { Object.assign(self.memoryOut, patch); },
    };
    return c;
  }

  say(lineId: string, vars: Vars = {}) {
    const variants = this.sit.lines[lineId] ?? this.opt.global.lines[lineId];
    if (!variants || !variants.length) throw new Error(`Unknown line "${lineId}" in ${this.sit.id}`);
    if (this.quietRepeats && this.out.lines.some((l) => l.lineId === lineId && sameValue(l.vars, vars))) return;
    let idx = Math.floor(this.rng() * variants.length);
    const last = this.lastVariant.get(lineId);
    if (variants.length > 1 && idx === last) idx = (idx + 1) % variants.length;
    this.lastVariant.set(lineId, idx);
    this.pushLine(lineId, idx, vars);
  }

  /** Say a specific variant (used by tools and repeats). */
  pushLine(lineId: string, idx: number, vars: Vars, slow = false) {
    const variants = this.sit.lines[lineId] ?? this.opt.global.lines[lineId];
    const npc = this.opt.npcs[this.speakerId];
    const sentence = compose(variants[idx], vars, { look: this.look, addressee: this.opt.player.gender, speaker: npc?.gender ?? "f", formal: !npc?.informal });
    const line: SpokenLine = { npc: this.speakerId, lineId, variant: idx, vars, sentence, slow: slow || this.slow };
    this.out.lines.push(line);
  }

  private tip(t: Tip) {
    if (this.tipShown.has(t.key)) return;
    this.tipShown.add(t.key);
    this.out.tips.push(t);
  }

  // ---------------------------------------------------------------------

  start(): TurnOut {
    this.out = this.newOut();
    const c = this.ctx();
    this.sit.init?.(c);
    this.sit.start(c);
    if (!this.held) this.advance(c);
    return this.finishTurn();
  }

  /** The learner said/typed something. */
  input(text: string): TurnOut {
    this.out = this.newOut();
    this.held = false;
    this.replayed = false;
    this.quietRepeats = false;
    const expected = this.expectedIntents();
    const primary = this.pending ? [...(this.pending.expects || []), ...Object.keys(this.pending.on || {})] : [];
    const res: NluResult = this.nlu.parse(text, expected, primary);
    this.out.heard = text;
    if (!res.ok || !res.best) {
      this.failures++;
      this.out.understood = false;
      this.out.failures = this.failures;
      this.out.prefix = res.prefix;
      if (this.failures >= 2) {
        this.say("g_not_understood");
        this.failures = 0;
      }
      return this.out;
    }
    this.failures = 0;
    const p = res.best;
    this.out.parse = p;
    this.history.push({ who: "you", text });
    this.collectTags(p);
    const c = this.ctx(text);

    // "Yes, perfect." / "No, sorry.": a yes/no plus only soft words still answers the question
    const softOnly = !!p.yn && p.segments.length > 0 && p.segments.every((sg) => SOFT_INTENTS.has(sg.intent) && !this.sit.handlers[sg.intent]);
    const bareYn = !!p.yn && (!p.segments.length || softOnly);
    const consumeSoft = () => { if (softOnly) for (const sg of p.segments) sg.slots.__handled = true; };

    // 1. pending question
    const pend = this.pending;
    let handled = false;
    const done: ParsedSegment[] = []; // pieces handled this turn
    if (pend) {
      this.pending = null;
      if (bareYn && !(softOnly && p.segments.some((sg) => pend.on?.[sg.intent]))) {
        const f = p.yn === "yes" ? pend.yes : pend.no;
        if (f) { f(c); handled = true; consumeSoft(); }
      }
      if (!handled && pend.on) {
        for (const seg of p.segments) {
          const h = pend.on[seg.intent];
          if (h && this.runPiece(seg, done, () => h(c, seg.slots, seg) !== false)) { handled = true; seg.slots.__handled = true; }
        }
      }
      if (!handled && p.yn && p.segments.length) {
        const f = p.yn === "yes" ? pend.yes : pend.no;
        if (f && !pend.on) { f(c); handled = true; }
      }
      if (!handled && !pend.optional) this.pending = pend; // keep it if the learner did something else
    }

    // a yes/no (with only soft words) for the current step's question
    if (!handled && softOnly) {
      const st = this.effectiveStep();
      const f = st ? (p.yn === "yes" ? st.yes : st.no) : undefined;
      if (f) { f(c); handled = true; consumeSoft(); }
    }

    // 2. intents
    for (const seg of p.segments) {
      if (seg.slots.__handled) continue;
      const h: Handler | undefined = this.sit.handlers[seg.intent];
      if (h) { this.runPiece(seg, done, () => { h(c, seg.slots, seg); return true; }); handled = true; continue; }
      const gh = this.opt.global.handlers[seg.intent];
      if (gh) { this.runPiece(seg, done, () => { gh(c, seg.slots); return true; }); handled = true; continue; }
    }

    // 3. bare yes/no for the current step
    if (!handled && p.yn && !p.segments.length) {
      const st = this.effectiveStep();
      const f = st ? (p.yn === "yes" ? st.yes : st.no) : undefined;
      if (f) { f(c); handled = true; }
      else if (!st && !this.pending) { this.say(p.yn === "yes" ? "g_yes_what" : "g_no_ok"); handled = true; }
      else if (this.pending?.ask) { this.pending.ask(c); this.held = true; handled = true; }
    }

    // a side question was handled while a question is still open: ask it again
    if (handled && pend && this.pending === pend && !this.held && pend.ask) { pend.ask(c); this.held = true; }

    // politeness: greeting/thanks flags
    if (p.flags.has("greet") && !this.s.__greeted) this.s.__greeted = true;

    if (!this.held && !this.ended) this.advance(c);

    // never leave an understood answer without a reply (e.g. something already said, repeated at the
    // goodbye): ask the open question again, or at least acknowledge it
    if (!this.out.lines.length && !this.ended && !this.out.note && !this.out.events.length) {
      if (this.pending?.ask) { this.pending.ask(c); this.held = true; }
      if (!this.out.lines.length) this.say("g_ack");
    }
    return this.finishTurn();
  }

  /** Run one piece's handler (`run` returns false if the handler declined it). A piece identical to one
   *  already handled this turn is skipped ("Goodbye, see you soon"); another piece of the same intent
   *  still runs for what it adds ("Tomas. My last name is Mikalauskas"), but a line already said this
   *  turn isn't said again ("4.5.6" is not "You can pay when we arrive" twice). */
  private runPiece(seg: ParsedSegment, done: ParsedSegment[], run: () => boolean): boolean {
    if (done.some((d) => d.intent === seg.intent && sameValue(d.slots, seg.slots) && sameValue(d.tags, seg.tags))) return true;
    this.quietRepeats = done.some((d) => d.intent === seg.intent);
    try {
      if (!run()) return false;
      done.push(seg);
      return true;
    } finally { this.quietRepeats = false; }
  }

  /** Ask the next unfinished step, or finish. */
  advance(c: ConvCtx) {
    if (this.pending) return;
    const st = this.nextStep(c);
    if (st) {
      this.step = st.id;
      st.ask(c);
      return;
    }
    if (!this.s.__finished) {
      this.s.__finished = true;
      this.step = null;
      this.sit.finish?.(c);
    }
  }

  nextStep(c: ConvCtx): StepDef | null {
    for (const st of this.sit.steps) {
      if (st.when && !st.when(c)) continue;
      if (st.done(c)) continue;
      return st;
    }
    return null;
  }

  currentStep(): StepDef | null {
    return this.step ? this.sit.steps.find((x) => x.id === this.step) ?? null : null;
  }

  /** The steps not done yet, whose questions may still come (the scripted sims use it: tools/sim-play.ts). */
  stepsLeft(): StepDef[] {
    const c = this.ctx();
    return this.sit.steps.filter((st) => { try { return !st.done(c); } catch { return true; } });
  }

  /** The step whose answer we are waiting for: the last one asked, or (after an opener that asked
   *  implicitly) the next unfinished one. */
  effectiveStep(): StepDef | null {
    const cur = this.currentStep();
    if (cur) return cur;
    try { return this.nextStep(this.ctx()); } catch { return null; }
  }

  expectedIntents(): string[] {
    const e: string[] = [];
    if (this.pending?.expects) e.push(...this.pending.expects);
    if (this.pending?.on) e.push(...Object.keys(this.pending.on));
    const st = this.effectiveStep();
    if (st?.expects) e.push(...st.expects);
    return e;
  }

  /** Suggestions and hint groups for the learner's current turn. */
  /** The mission checklist: the situation's steps that apply in this conversation, in order
   *  (a situation may name its own `mission` steps and labels). Items appear as they become relevant. */
  private seenSteps = new Set<string>();
  checklist(): { id: string; lt: string; done: boolean; current: boolean }[] {
    const c = this.ctx();
    const safe = (f: () => boolean, dflt: boolean) => { try { return f(); } catch { return dflt; } };
    const out: { id: string; lt: string; done: boolean; current: boolean }[] = [];
    // steps that have been asked and no longer apply count as resolved (e.g. the size was given)
    for (const st of this.sit.steps) {
      const applies = safe(() => !st.when || st.when(c), false);
      if (applies && !safe(() => st.done(c), false)) this.seenSteps.add(st.id);
    }
    const stepState = (st: StepDef) => {
      const applies = safe(() => !st.when || st.when(c), false);
      let done = safe(() => st.done(c), false);
      if (!applies && !done && this.seenSteps.has(st.id)) done = true;
      return { applies, done };
    };
    if (this.sit.mission?.length) {
      this.sit.mission.forEach((m, i) => {
        const st = m.step ? this.sit.steps.find((x) => x.id === m.step) : undefined;
        const ss = st ? stepState(st) : { applies: true, done: false };
        const applies = ss.applies && (m.when ? safe(() => m.when!(c), false) : true);
        const done = (m.done ? safe(() => m.done!(c), false) : false) || (st ? ss.done : false);
        if (m.optional && !applies && !done) return;
        out.push({ id: m.step ?? `m${i}`, lt: m.lt, done, current: false });
      });
    } else {
      for (const st of this.sit.steps) {
        const { applies, done } = stepState(st);
        if (!applies && !done) continue;
        const lt = st.label ?? st.suggest?.[0]?.lt;
        if (lt) out.push({ id: st.id, lt, done, current: false });
      }
    }
    const cur = out.find((x) => !x.done);
    if (cur && !this.completed) cur.current = true;
    return out;
  }

  support(): { suggest: Suggestion[]; hints: string[] } {
    const st = this.effectiveStep();
    const suggest = this.pending?.suggest ?? st?.suggest ?? this.sit.suggest ?? [];
    const hints = this.pending?.hints ?? st?.hints ?? suggest.map((x) => x.hint).filter(Boolean) as string[];
    return { suggest, hints: [...new Set(hints)] };
  }

  /** Repeat the NPC's last turn (UI button or "Could you say that again?"). */
  repeat(slow = false): TurnOut {
    this.out = this.newOut();
    for (const l of this.lastTurn) this.out.lines.push({ ...l, slow: slow || l.slow || this.slow });
    return this.out;
  }

  private collectTags(p: Parse) {
    const all = new Set<string>(p.tags);
    for (const s of p.segments) for (const t of s.tags) all.add(t);
    const used: string[] = [];
    for (const t of all) {
      if (t.startsWith("h:")) used.push(t.slice(2));
      if (t.startsWith("tip:")) {
        const key = t.slice(4);
        const tip = this.opt.global.tips[key] ?? this.sit.tips?.[key];
        if (tip) this.tip(tip);
      }
      if (t === "blunt") { const tip = this.opt.global.tips.blunt; if (tip) this.tip(tip); }
    }
    this.out.hintsUsed = used;
  }

  private finishTurn(): TurnOut {
    if (this.out.lines.length) {
      // a replay keeps the earlier turn, so "Slower, please" twice doesn't repeat its own intro
      if (!this.replayed) this.lastTurn = this.out.lines.slice();
      for (const l of this.out.lines) this.history.push({ who: "npc", text: l.sentence.en });
    }
    this.replayed = false;
    this.out.completed = this.completed;
    this.out.ended = this.ended;
    return this.out;
  }

  /** For global handlers. */
  get lastLines() { return this.lastTurn; }
  markSlow() { this.slow = true; }
  addNote(note: { en: string; lt?: string }) { this.out.note = note; }
  showMeaning() { this.out.showMeaning = true; }
  replayLast(slow: boolean) {
    this.replayed = true;
    // (after "Slower, please" the conversation stays slow, also for lines said before it)
    for (const l of this.lastTurn) this.out.lines.push({ ...l, slow: slow || l.slow || this.slow });
  }
}

/** Same slot values / tags / line variables (ignoring the dialogue's own "__handled" mark). */
function sameValue(a: unknown, b: unknown): boolean {
  const key = (v: unknown) => JSON.stringify(v, (k, x) => (k === "__handled" ? undefined : x));
  return key(a) === key(b);
}
