// What the surf lesson shows on the screen (src/ui/Surf.tsx), kept by Game.ts as the lesson goes.
import { create } from "zustand";
import type { Sentence } from "../../convo/compose";
import type { Level, Phase, Score } from "./logic";

export interface SurfLine { cue: string; s: Sentence }
export interface SurfUi {
  active: boolean;
  /** The level is being chosen (the lesson was started from the palapa, not from the conversation). */
  picking: boolean;
  level: Level | null;
  phase: Phase | null;
  /** What the instructor says now (it stays on show until her next line). */
  line: SurfLine | null;
  /** How much help the line gets: 0 the Spanish with its glosses and its meaning, 1 the Spanish alone, 2 only her
   *  voice (tap to read it). It fades as waves are ridden. */
  support: 0 | 1 | 2;
  /** A question with answers to tap. */
  choice: { id: string; options: SurfLine[] } | null;
  /** In a ride: what is left of the balance (0–1), and whether a command waits for its answer. */
  balance: number;
  asked: boolean;
  /** The last command: followed in time, or not (for a moment). */
  mark: "ok" | "no" | null;
  score: Score;
  /** The lesson is over: its score card is on show. */
  over: boolean;
  /** Before this lesson: waves ridden and seconds on them, ever. */
  best: { waves: number; seconds: number };
}

export const EMPTY_SCORE: Score = { waves: 0, seconds: 0, followed: 0, asked: 0, falls: 0 };
const EMPTY: SurfUi = { active: false, picking: false, level: null, phase: null, line: null, support: 0, choice: null, balance: 1, asked: false, mark: null, score: EMPTY_SCORE, over: false, best: { waves: 0, seconds: 0 } };

export const useSurf = create<SurfUi & { set(p: Partial<SurfUi>): void; reset(): void }>((set) => ({
  ...EMPTY,
  set: (p) => set(p),
  reset: () => set(EMPTY),
}));
