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

  advance(dt: number) {
    this.elapsed = Math.min(DRIVE_SECONDS, this.elapsed + dt);
    // Avoid an extra frame at 150 seconds due to accumulated floating-point error.
    if (DRIVE_SECONDS - this.elapsed < 1e-8) this.elapsed = DRIVE_SECONDS;
    return this.elapsed >= DRIVE_SECONDS;
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
