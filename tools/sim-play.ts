// Plays a situation's scripted sims (`sims` in the situation file) the same way in every tool:
// check-content, scene-walk, contexts and review.
//
// The learner says the next scripted turn. A moment can also have an auto answer: the sim's `auto`
// (keyed by step or pending id, for questions that come up on some seeds only) or the defaults for
// "howareyou" and "closing". At such a moment the next scripted turn is said, except:
// - A generic answer (a bare yes/no, "okay", "thanks") waits when this moment doesn't take it, and the
//   auto answer is said instead. It can't show which question it answers: when an optional question
//   would take it on some seeds, pin that question on or off with `setup`.
// - A turn that answers a moment still to come waits, and the auto answer is said instead. "Still to
//   come" means an intent expected by a step not done yet, or by a pending question; this includes a
//   turn understood only there, like a bare "Blueberry.".
// A question (a turn ending in "?") never waits: the learner may ask at any time. A turn that answers
// this moment, a change of mind about an earlier step, or a sentence nobody understands is said too.
// An auto answer that changed nothing (same moment, same state) isn't repeated while scripted turns
// are left. Answers are recognized from the steps' `expects` and from `expects: […]` lists in the
// situation's file; a list passed to a helper function under another name isn't seen, so pin such
// a question with `setup` when a sim's turns depend on it.
// When the script runs out, auto answers carry the conversation to its end. Turns never said are
// counted in `unused`: check-content warns about them, because the sim didn't test them.
//
// A sim can force a twist or a choice on every seed with `setup(s)`, which runs right after `init`.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Conversation, type TurnOut } from "../src/convo/dialogue";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import type { SimTest, SituationDef } from "../src/content/types";

export const DEFAULT_AUTO: Record<string, string> = { howareyou: "Good, thanks. And you?", closing: "Thank you, bye!" };
const SOFT = new Set(["g_ok", "g_thanks", "g_sorry"]);
const ROOT = path.resolve(import.meta.dirname, "..");

const pendingCache = new Map<string, Set<string>>();
/** Intents that only pending questions expect: every `expects: […]` list written in the situation's
 *  file and in global.ts (pending questions are built in code), minus the steps' own `expects`. */
function pendingOnlyIntents(sit: SituationDef): Set<string> {
  const hit = pendingCache.get(sit.id);
  if (hit) return hit;
  const stepIntents = new Set(sit.steps.flatMap((s) => s.expects ?? []));
  const set = new Set<string>();
  for (const f of [path.join(ROOT, "src/content/situations", sit.id + ".ts"), path.join(ROOT, "src/content/global.ts")]) {
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/expects:\s*\[([^\]]*)\]/g)) {
      for (const q of m[1].matchAll(/"([A-Za-z0-9_]+)"/g)) if (!stepIntents.has(q[1])) set.add(q[1]);
    }
  }
  pendingCache.set(sit.id, set);
  return set;
}

/** Intents that answer a moment still to come: the steps not done yet, and the pending questions. */
function laterIntents(conv: Conversation, sit: SituationDef): Set<string> {
  const set = new Set(pendingOnlyIntents(sit));
  for (const st of conv.stepsLeft()) for (const i of st.expects ?? []) set.add(i);
  return set;
}

/** Does this moment take a bare yes (or no): does its pending question or its step handle it? */
function takesYesNo(conv: Conversation, yn: "yes" | "no"): boolean {
  return !!(conv.pending?.[yn] || conv.effectiveStep()?.[yn]);
}

/** Does this turn fit the current moment: an expected intent, a yes/no this moment takes, or a polite
 *  remark ("Thanks!", "Okay.", "Sorry."), which the person answers at any moment? */
function fits(conv: Conversation, text: string): boolean {
  const exp = conv.expectedIntents();
  const p = conv.nlu.parse(text, exp).best;
  if (!p) return false;
  if (!p.yn && p.segments.length && p.segments.every((s) => SOFT.has(s.intent))) return true;
  return (!!p.yn && takesYesNo(conv, p.yn)) || p.segments.some((s) => exp.includes(s.intent));
}

/** Should this scripted turn wait for a later moment, with the auto answer said now? */
function waits(conv: Conversation, sit: SituationDef, text: string): boolean {
  if (/\?[\s"”')]*$/.test(text)) return false;
  const exp = conv.expectedIntents();
  const p = conv.nlu.parse(text, exp).best;
  const segs = p?.segments ?? [];
  // "Yes." "Okay." "No, thanks." "Got it.": a generic answer
  if (p && (p.yn || segs.length) && segs.every((s) => SOFT.has(s.intent))) {
    return !((!!p.yn && takesYesNo(conv, p.yn)) || segs.some((s) => exp.includes(s.intent)));
  }
  if (segs.some((s) => exp.includes(s.intent))) return false;
  const later = laterIntents(conv, sit);
  if (segs.some((s) => later.has(s.intent))) return true;
  if (!p) return !!conv.nlu.parse(text, [...later]).best?.segments.some((s) => later.has(s.intent));
  return false;
}

export interface SimTurn {
  say: string;
  /** An auto answer, not a scripted turn. */
  auto: boolean;
  /** The pending question or step the turn answered. */
  waiting: string;
  /** The situation's state changed (the conversation moved on). */
  moved: boolean;
  out: TurnOut;
}

export interface SimRun {
  conv: Conversation;
  start: TurnOut;
  turns: SimTurn[];
  /** Scripted turns never said (the conversation ended first). */
  unused: number;
  /** The first scripted turn never said: usually the one that waited for a moment that never came. */
  firstUnused?: string;
  /** Scripted turns that waited for their moment and were said at last where they don't fit: the
   *  moment never came on this seed, and every later turn may be out of step. */
  misplaced: string[];
  /** Checklist items still open when the task was completed. */
  openAtCompletion: string[];
}

export interface PlayOptions {
  gender?: "m" | "f";
  /** Default: seed % 3 (0 = first visit). */
  visits?: number;
  datePartner?: string;
  /** Called after the opening (turn null) and after every turn. */
  onTurn?: (conv: Conversation, turn: SimTurn | null, out: TurnOut) => void;
}

export function playSim(sit: SituationDef, sim: SimTest, seed: number, opt: PlayOptions = {}): SimRun {
  const setup = sim.setup;
  const def: SituationDef = setup ? { ...sit, init: (c) => { sit.init?.(c); setup(c.s); } } : sit;
  const conv = new Conversation(def, {
    global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: opt.gender ?? "m", datePartner: opt.datePartner },
    visits: opt.visits ?? seed % 3, seed, memory: {},
  });
  const defaults: Record<string, string> = { ...DEFAULT_AUTO, ...(sim.auto ?? {}) };
  const start = conv.start();
  opt.onTurn?.(conv, null, start);
  const run: SimRun = { conv, start, turns: [], unused: 0, openAtCompletion: [], misplaced: [] };
  let i = 0;
  let held = -1; // the scripted turn that last waited for its moment
  for (let guard = 0; guard < sim.turns.length + 40 && !conv.ended; guard++) {
    const waiting = conv.pending?.id ?? conv.step ?? "";
    const next = i < sim.turns.length ? sim.turns[i] : undefined;
    const last = run.turns[run.turns.length - 1];
    const stuck = !!last?.auto && last.waiting === waiting && !last.moved; // the last auto answer changed nothing
    let say: string, auto = false;
    if (defaults[waiting] && (next === undefined || (!stuck && waits(conv, sit, next)))) {
      say = defaults[waiting]; auto = true;
      if (next !== undefined) held = i;
    } else if (next !== undefined) {
      if (held === i && !/\?[\s"”')]*$/.test(next) && !fits(conv, next)) run.misplaced.push(next);
      say = next; i++;
    }
    else break;
    const wasCompleted = conv.completed;
    const before = snapshot(conv);
    const out = conv.input(say);
    // the checklist as the learner sees it at the moment the task is completed
    if (!wasCompleted && conv.completed) run.openAtCompletion = conv.checklist().filter((x) => !x.done).map((x) => x.lt);
    const turn: SimTurn = { say, auto, waiting, moved: snapshot(conv) !== before, out };
    run.turns.push(turn);
    opt.onTurn?.(conv, turn, out);
    if (conv.completed && i >= sim.turns.length && !conv.pending) break;
  }
  run.unused = sim.turns.length - i;
  if (run.unused) run.firstUnused = sim.turns[i];
  return run;
}

/** The situation's state and the open question, to tell whether a turn changed anything. */
let unserializable = 0;
function snapshot(conv: Conversation): string {
  try { return JSON.stringify([conv.s, conv.step, conv.pending?.id ?? null, conv.completed]); } catch { return `unserializable ${unserializable++}`; }
}
