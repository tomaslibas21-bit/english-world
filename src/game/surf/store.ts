// What the surf lesson shows on the screen (src/ui/Surf.tsx), kept by Game.ts as the lesson goes.
import { create } from "zustand";
import type { Sentence } from "../../convo/compose";
import type { Do, Level, Phase, Score } from "./logic";
import type { SurfArrow } from "./controls";

/** One of her lines (or an answer), and the picture of what it asks for where the edition has one (its URL). */
export interface SurfLine { cue: string; s: Sentence; pic?: string }
export interface SurfUi {
  active: boolean;
  /** The level is being chosen (the lesson was started from the palapa, not from the conversation). */
  picking: boolean;
  level: Level | null;
  phase: Phase | null;
  /** What the instructor says now (it stays on show until her next line). */
  line: SurfLine | null;
  /** Familiarity of the current cue. Its words stay visible at every level. */
  support: 0 | 1 | 2;
  /** The learner's turn to speak: the lines they may answer with (said aloud, or tapped). */
  choice: { id: string; options: SurfLine[] } | null;
  /** The learner's turn to act: the move her line asks for (`cue`), the strokes left of how many, what is left of the
   *  time where the sea won't wait (1 → 0), and whether the move is shown (a command heard often shows only when the
   *  learner hesitates). */
  todo: { do: Do; cue: string; left: number | null; of: number | null; time: number | null; show: boolean } | null;
  /** What the learner has just answered (until her next line). */
  said: SurfLine | null;
  /** The microphone in the learner's turn: "unclear" = something else was heard (`heard`), it listens again. */
  mic: { status: "off" | "starting" | "listening" | "unclear" | "nothing" | "denied" | "error" | "unsupported"; heard: string; error?: string };
  /** The learner wants to answer aloud (the mic button; off: the answers are tapped). */
  micOn: boolean;
  /** In a ride: what is left of the balance (0–1), and whether a command waits for its answer. */
  balance: number;
  asked: boolean;
  keyFlash: SurfArrow | null;
  pressed: number;
  finishedStrokes: number;
  /** The last command: followed in time, or not (for a moment). */
  mark: "ok" | "no" | null;
  score: Score;
  /** The lesson is over: its score card is on show. */
  over: boolean;
  /** Before this lesson: waves ridden and seconds on them, ever. */
  best: { waves: number; seconds: number };
}

export const EMPTY_SCORE: Score = { waves: 0, seconds: 0, followed: 0, asked: 0, falls: 0 };
export const NO_MIC: SurfUi["mic"] = { status: "off", heard: "" };
const EMPTY: SurfUi = { active: false, picking: false, level: null, phase: null, line: null, support: 0, choice: null, todo: null, said: null, mic: NO_MIC, micOn: true, balance: 1, asked: false, keyFlash: null, pressed: 0, finishedStrokes: 0, mark: null, score: EMPTY_SCORE, over: false, best: { waves: 0, seconds: 0 } };

export const useSurf = create<SurfUi & { set(p: Partial<SurfUi>): void; reset(): void }>((set) => ({
  ...EMPTY,
  set: (p) => set(p),
  // (the learner's choice of answering aloud or by taps outlives a lesson)
  reset: () => set((s) => ({ ...EMPTY, micOn: s.micOn })),
}));
