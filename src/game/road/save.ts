import type { Progress } from "../../state/progress";
import type { RecentMiss } from "./review";

export type WordGame = "road" | "sea";
export type PlayWay = "words" | "phrases";
export type WordGameProgress = {
  choices?: Partial<Record<WordGame, PlayWay>>;
  recentMisses?: Partial<Record<PlayWay, RecentMiss[]>>;
};

export const isPlayWay = (way: unknown): way is PlayWay => way === "words" || way === "phrases";

export function playWay(progress: Progress, town: string, game: WordGame): PlayWay {
  return progress.wordGames?.[town]?.choices?.[game] === "phrases" ? "phrases" : "words";
}

export function setPlayWay(progress: Progress, town: string, game: WordGame, way: PlayWay) {
  const save = (progress.wordGames ??= {})[town] ??= {};
  (save.choices ??= {})[game] = way;
}

export function recentMisses(progress: Progress, town: string, way: PlayWay): readonly RecentMiss[] {
  return progress.wordGames?.[town]?.recentMisses?.[way] ?? [];
}

