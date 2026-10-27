// Which of the speech recogniser's readings of one answer to use. The recogniser's best guess comes first, but a
// learner's accent can make it hear "I'd like a lot of" where another of its guesses was "I'd like a latte".
import type { Nlu } from "./nlu";

/** 3: understood; 2: understood only loosely (extra words dropped); 1: understood only as a catch-all ("Sorry, we
 *  don't have that"); 0: not understood. */
export function readingScore(nlu: Nlu, expected: string[], text: string): number {
  const r = nlu.parse(text, expected);
  if (!r.ok || !r.best) return 0;
  if (r.best.segments.length && r.best.segments.every((sg) => nlu.isCatchAll(sg.intent))) return 1;
  return r.best.flags.has("approx") ? 2 : 3;
}

/** The most useful reading: the best guess unless another one scores higher. Ties keep the recogniser's order. */
export function bestReading(nlu: Nlu, expected: string[], text: string, alts: string[]): string {
  let best = text, top = readingScore(nlu, expected, text);
  for (const a of alts.slice(0, 7)) {
    if (top === 3) break;
    const s = readingScore(nlu, expected, a);
    if (s > top) { best = a; top = s; }
  }
  return best;
}
