import { shufflePrompt, type Phrase, type Prompt, type PromptPool } from "./words";

const form = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function phrasePrompt(phrase: Phrase, pool: readonly Phrase[], rng: () => number): Prompt | undefined {
  const seen = new Set([form(phrase.f)]);
  const promptForm = form(phrase.p);
  const candidates = pool.filter((other) => Math.abs(other.words.length - phrase.words.length) <= 2
    && form(other.p) !== promptForm);
  const options = [phrase.f];
  const optionPhrases = new Map([[phrase.f, phrase]]);
  for (const sameTopic of [false, true]) {
    const choices = candidates.filter((other) => (other.topic === phrase.topic) === sameTopic);
    while (choices.length && options.length < 3) {
      const [other] = choices.splice(Math.floor(rng() * choices.length), 1);
      const key = form(other.f);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push(other.f);
      optionPhrases.set(other.f, other);
    }
    if (options.length === 3) break;
  }
  if (options.length === 3) return shufflePrompt({
    phrase, word: { en: phrase.f, lt: phrase.p, situation: "" }, options, optionPhrases, right: 0,
  }, rng);
}

export async function loadPhrasePool(rng = Math.random): Promise<PromptPool> {
  const { default: { items } } = await import("../../content/phrases/phrase-game.mh.json");
  const phrases: Phrase[] = items.map((item) => ({ ...item, t: item.t.map(([start, end]) => [start, end]) }));
  return { listen: phrases.flatMap((phrase) => phrasePrompt(phrase, phrases, rng) ?? []), gaps: [] };
}
