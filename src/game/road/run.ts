import { useCards } from "../../state/cards";
import { keepPhrases } from "../kit/phrases";
import type { Prompt, Word } from "./words";

export const DRIVE_SECONDS = 150;
export const FIRST_GATE = 75;
export const nextGate = (distance: number, total: number) => distance + 172 - Math.min(20, total * 1.15);

export class RunScore {
  elapsed = 0;
  points = 0;
  right = 0;
  total = 0;
  streak = 0;
  bestStreak = 0;
  readonly missed = new Map<string, Word>();
  readonly learned = new Map<string, Prompt>();

  constructor(readonly duration = DRIVE_SECONDS) {}

  advance(dt: number) {
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    // Avoid an extra frame due to accumulated floating-point error.
    if (this.duration - this.elapsed < 1e-8) this.elapsed = this.duration;
    return this.elapsed >= this.duration;
  }

  answer(prompt: Prompt, lane: number) {
    const correct = lane === prompt.right;
    const id = `${prompt.word.situation}|${prompt.word.en.toLowerCase()}`;
    this.total++;
    if (correct) {
      this.right++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.points += 100 + 25 * (this.streak - 1);
      this.learned.set(id, prompt);
    } else {
      this.streak = 0;
      if (this.missed.size < 3) this.missed.set(id, prompt.word);
    }
    return correct;
  }
}


export function keepRunPhrases(score: RunScore) {
  const before = useCards.getState().cards.length;
  for (const { word, gap } of score.learned.values()) {
    if (gap) keepPhrases(word.situation, [gap.full]);
    else keepPhrases(word.situation, [{ en: word.en, nat: word.lt, say: word.clip.say, units: [{ en: word.en, lt: word.lt }] }]);
  }
  return useCards.getState().cards.length - before;
}
