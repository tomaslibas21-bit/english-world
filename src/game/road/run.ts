import { dueCards, useCards } from "../../state/cards";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { keepPhrases, PhraseRun } from "../kit/phrases";
import { SayItRound, sayItWords } from "../kit/sayIt";
import { pickPrompt, updateRecentMisses, type GateAnswer } from "./review";
import { gateAnswerEntry, gateOptions } from "./phraseEntries";
import { recentMisses, type PlayWay } from "./save";
import { loadPool, wordPrompts, type Prompt, type PromptPool } from "./words";

export const DRIVE_SECONDS = 150;
export const FIRST_GATE = 75;
export const nextGate = (distance: number, total: number) => distance + 172 - Math.min(20, total * 1.15);
export const gateWord = (prompt: Prompt) => prompt.gap ? prompt.options[prompt.right] : prompt.word.en;
export const gateSayItTarget = (prompt: Prompt) => sayItWords([gateWord(prompt)],
  prompt.gap || prompt.phrase ? prompt.options.filter((_, i) => i !== prompt.right) : []);

export async function loadWordPrompts(): Promise<PromptPool> {
  const { progress } = useStore.getState(), { cards } = useCards.getState();
  try {
    await audio.init();
    return wordPrompts(await loadPool(progress, cards, (...clip) => audio.hasClip(...clip)));
  } catch {
    return { listen: [], gaps: [] };
  }
}

export function runPicker(pool: PromptPool, town: string, way: PlayWay) {
  const misses = recentMisses(useStore.getState().progress, town, way);
  const due = dueCards(useCards.getState().cards, Date.now());
  return (history: readonly GateAnswer[], remaining: number) => pickPrompt(pool, misses, due, history, remaining, Math.random);
}

export function rememberRun(town: string, way: PlayWay, history: readonly GateAnswer[]) {
  if (!history.length) return;
  useStore.getState().updateProgress((progress) => {
    const save = (progress.wordGames ??= {})[town] ??= {};
    (save.recentMisses ??= {})[way] = updateRecentMisses(recentMisses(progress, town, way), history);
  });
}

export class RunScore {
  elapsed = 0;
  private gatePoints = 0;
  readonly sayIt = new SayItRound();
  get points() { return this.gatePoints + this.sayIt.count; }
  right = 0;
  total = 0;
  streak = 0;
  bestStreak = 0;
  readonly missed = new Map<string, Prompt>();
  readonly learned = new Map<string, Prompt>();
  readonly recovered = new Map<string, Prompt>();
  readonly history: GateAnswer[] = [];

  constructor(readonly duration = DRIVE_SECONDS, readonly title = "", readonly review = new PhraseRun("")) {}

  show(prompt: Prompt) {
    this.review.entries(gateOptions(prompt, this.title));
  }

  advance(dt: number) {
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    // Avoid an extra frame due to accumulated floating-point error.
    if (this.duration - this.elapsed < 1e-8) this.elapsed = this.duration;
    return this.elapsed >= this.duration;
  }

  answer(prompt: Prompt, lane: number) {
    this.review.entries(gateOptions(prompt, this.title, true));
    const correct = lane === prompt.right;
    const id = `${prompt.word.situation}|${prompt.word.en.toLowerCase()}`;
    this.history.push({ prompt, correct });
    this.total++;
    if (correct) {
      this.right++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.gatePoints += 100 + 25 * (this.streak - 1);
      this.learned.set(id, prompt);
      if (prompt.practice === "firstRetry" || prompt.practice === "lastRetry") this.recovered.set(id, prompt);
    } else {
      this.streak = 0;
      if (this.missed.size < 3) this.missed.set(id, prompt);
    }
    return correct;
  }
}


export function keepRunPhrases(score: RunScore, title?: string) {
  const before = useCards.getState().cards.length;
  for (const prompt of score.learned.values()) {
    const { word, gap } = prompt;
    if (gap) keepPhrases(word.situation, [gap.full]);
    else {
      const say = prompt.phrase ? prompt.phrase.f : prompt.word.clip.say;
      keepPhrases(word.situation, [{ en: word.en, nat: word.lt, say, units: [{ en: word.en, lt: word.lt }] }], word.situation ? undefined : title);
    }
  }
  return useCards.getState().cards.length - before;
}

export function practiceResult(score: RunScore, way: PlayWay) {
  const missed = [...score.missed.values()];
  const recovered = [...score.recovered.values()];
  const phrases = way === "phrases" ? [...score.learned.values()] : undefined;
  return {
    missed: missed.map(({ word }) => word), recovered: recovered.map(({ word }) => word), phrases: phrases?.map(({ word }) => word),
    missedEntries: missed.map((prompt) => gateAnswerEntry(prompt, score.title)),
    practiceEntries: (phrases ?? [...score.recovered].flatMap(([id, prompt]) => score.missed.has(id) ? [] : [prompt]))
      .map((prompt) => gateAnswerEntry(prompt, score.title)),
  };
}
