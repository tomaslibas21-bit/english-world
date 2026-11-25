import { rand } from "../world/util";
import * as P from "./plan";

interface AssignmentInput {
  pool: ReadonlyMap<string, P.Phrase>;
  previous: ReadonlyMap<string, P.Phrase>;
  book: (P.Phrase & { count: number; last: number })[];
  starters: P.Phrase[];
  heard: readonly string[];
  replay: boolean;
  opening: { id: string; phrase: P.Phrase } | null;
  waking?: string;
  has: (text: string) => boolean;
}

export interface StoneMeanings {
  preferred: P.Phrase[];
  extra: P.Phrase[];
}

/** Rebuild the assignments when the lines or recordings arrive, the round starts, or a stone wakes. */
export function assignStonePhrases({ pool, previous, book, starters, heard, replay, opening, waking, has }: AssignmentInput) {
  const stones = P.CHAMBERS.flatMap((chamber, ci) => chamber.stones.map((stone) => ({ stone, ci })));
  const borrowable = book.filter((line) => line.sitId !== P.TREE_SIT);
  const limit = stones.length + 6;
  const spare = P.pickPhrases(borrowable, starters, limit, has);
  const texts = P.pickPhrases(borrowable, starters, limit, () => true);
  const authored = [...pool.values()];
  const recorded = authored.filter((line) => has(line.en));
  // Recorded borrowings take priority over text-only authored lines. With no recordings, the authored text makes a round.
  const candidates = recorded.length || spare.length ? recorded : authored;
  const lines: string[][] = P.CHAMBERS.map(() => []);
  for (const line of candidates) lines[line.chamber!].push(line.id!);

  const taken = opening?.phrase.id ? [opening.phrase.id] : [];
  const fallback = spare.length ? spare : texts;
  const previousLine = waking ? previous.get(waking) : undefined;
  const picked = stones.map(({ stone, ci }) => {
    if (opening?.id === stone.id) return opening.phrase;
    const had = previous.get(stone.id);
    const wakes = stone.id === waking;
    const first = P.firstLine(stone.id);
    let id: string | null = null;
    if (!wakes && had?.id && lines[had.chamber!].includes(had.id) && !taken.includes(had.id) && (replay || had.id === first)) {
      id = had.id;
    } else if (replay) {
      const avoid = wakes ? previousLine?.id : undefined;
      if (avoid) id = P.nextLine(lines, ci, heard, [...taken, avoid], Math.random);
      id ??= P.nextLine(lines, ci, heard, taken, Math.random);
    } else if (lines[ci].includes(first)) id = first;
    if (id) { taken.push(id); return pool.get(id); }
    if (!wakes && had && fallback.some((line) => line.en === had.en)) return had;
  });

  const used = new Set(picked.flatMap((line) => line ? [line.en] : []));
  const phrases = new Map<string, P.Phrase>();
  stones.forEach(({ stone }, i) => {
    const avoid = stone.id === waking ? previousLine?.en : undefined;
    const line = picked[i] ?? fallback.find((line) => !used.has(line.en) && line.en !== avoid)
      ?? fallback.find((line) => line.en !== avoid) ?? fallback[0];
    if (line) { phrases.set(stone.id, line); used.add(line.en); }
  });

  const meanings: StoneMeanings = {
    preferred: [...phrases.values(), ...candidates, ...spare],
    extra: [...authored, ...texts, ...starters],
  };
  return { phrases, lines, meanings };
}

/** Draw real distractors, using the text pool when recordings supply too few distinct meanings. */
export function stoneMeaningChoices(id: string, phrase: P.Phrase, lit: number, meanings: StoneMeanings) {
  const seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
    + lit * 977 + [...phrase.en].reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) >>> 0, 5);
  const others = meanings.preferred.filter((line) => line.en !== phrase.en);
  const preferred = P.meaningChoices(phrase, others, rand(seed));
  if (preferred.options.length === 3) return preferred;
  return P.meaningChoices(phrase, [...others, ...meanings.extra.filter((line) => line.en !== phrase.en)], rand(seed));
}
