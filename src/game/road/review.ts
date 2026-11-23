import { cardKey, type Card } from "../../state/cards";
import { shufflePrompt, type Prompt, type PromptPool } from "./words";

export type RecentMiss = { id: string; rights: number };
export type GateAnswer = { prompt: Prompt; correct: boolean };
export const promptId = ({ phrase, word }: Prompt) => phrase?.id ?? cardKey(word.en);

export function updateRecentMisses(recent: readonly RecentMiss[], history: readonly GateAnswer[]): RecentMiss[] {
  const outcomes = new Map<string, boolean>();
  for (const { prompt, correct } of history) {
    const id = promptId(prompt);
    // Any miss starts a new interval. A correct comeback in this run earns the score tag only.
    if (!correct) outcomes.delete(id); // keep the most recent miss at the end of the list
    outcomes.set(id, correct && outcomes.get(id) !== false);
  }
  const retained = recent.flatMap(({ id, rights }) => {
    const outcome = outcomes.get(id);
    const next = rights + Number(outcome === true);
    return outcome === false || next >= 2 ? [] : [{ id, rights: next }];
  });
  for (const [id, correct] of outcomes) if (!correct) retained.push({ id, rights: 0 });
  return retained.slice(-30);
}

/** Estimated gates left, including the gate being picked. The timer and pace can change after this pick. */
export function gatesLeft(distanceToGate: number, travelLeft: number, spacing: number) {
  return Math.max(1, 1 + Math.floor((travelLeft - distanceToGate) / spacing));
}

/** Choose solely from the supplied pool and completed gates. Review slots accrue once per three gates. */
export function pickPrompt(pool: PromptPool, recent: readonly RecentMiss[], due: readonly Card[],
  history: readonly GateAnswer[], remaining: number, rng: () => number): Prompt | undefined {
  const index = history.length;
  const seen = new Map<string, { answer: GateAnswer; index: number }>();
  const used = new Set<string>();
  for (const [at, answer] of history.entries()) {
    const id = promptId(answer.prompt);
    used.add(id);
    if (answer.prompt.practice !== "repeat") seen.set(id, { answer, index: at });
  }
  const first = [...seen.values()].find(({ answer, index: at }) => !answer.correct && index - at >= 2
    && index - at <= 4 && (!answer.prompt.practice || answer.prompt.practice === "review"));
  const last = remaining <= 4 && [...seen.values()].find(({ answer, index: at }) =>
    !answer.correct && index - at >= 2 && answer.prompt.practice === "firstRetry");
  if (first && (index - first.index >= 4 || !last)) {
    return shufflePrompt({ ...first.answer.prompt, practice: "firstRetry" }, rng);
  }
  if (last) return shufflePrompt({ ...last.answer.prompt, practice: "lastRetry" }, rng);

  const ordinary = index >= 7 && pool.gaps.length ? pool.gaps : pool.listen;
  const fresh = (p: Prompt) => !used.has(promptId(p));
  const missedIds = new Set(recent.map(({ id }) => id));
  const dueKeys = new Set(due.map(({ en }) => cardKey(en)));
  const missed = (p: Prompt) => missedIds.has(promptId(p));
  const dueCard = (p: Prompt) => dueKeys.has(cardKey(p.word.en));
  const candidates = ordinary === pool.listen ? ordinary : [...ordinary, ...pool.listen];
  const choose = (items: readonly Prompt[]) => items.length ? items[Math.floor(rng() * items.length)] : undefined;
  const reviews = history.filter(({ prompt }) => prompt.practice === "review").length;
  if (reviews < Math.floor((index + 1) / 3) && history.at(-1)?.prompt.practice !== "review") {
    const preferences = reviews % 2 === 0 ? [missed, dueCard] : [dueCard, missed];
    for (const prefer of preferences) {
      const match = choose(candidates.filter((p) => fresh(p) && prefer(p)));
      if (match) return shufflePrompt({ ...match, practice: "review" }, rng);
    }
  }
  const newItem = (p: Prompt) => fresh(p) && !missed(p) && !dueCard(p);
  const next = choose(ordinary.filter(newItem))
    ?? (ordinary !== pool.listen ? choose(pool.listen.filter(newItem)) : undefined);
  if (next) return shufflePrompt(next, rng);

  // Small word pools can run out. Keep the current exercise style and avoid immediate repeats.
  const lastPrompt = history.at(-1)?.prompt;
  const available = candidates.filter((p) => !lastPrompt || promptId(p) !== promptId(lastPrompt));
  const repeat = choose(available.filter((p) => !missed(p) && !dueCard(p)))
    ?? choose(available.filter(fresh)) ?? choose(available) ?? choose(candidates);
  return repeat && shufflePrompt({ ...repeat, practice: used.has(promptId(repeat)) ? "repeat" : undefined }, rng);
}

