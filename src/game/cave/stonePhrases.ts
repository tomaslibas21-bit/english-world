import { compose, type Sentence } from "../../convo/compose";
import { rand } from "../world/util";
import { loadSituation } from "../../content/situations/catalog";
import type { Chamber } from "./plan";

export interface StonePhrase { id: string; chamber: number; en: string; lt: string; s: Sentence }

export const firstLine = (stoneId: string) => stoneId.replace(/-(\d+)$/, (_, n: string) => "_" + n.padStart(2, "0"));
export const stoneGroup = (chamber: string) => "p_" + chamber;
export function createStoneLibrary(sitId: string, chambers: readonly Chamber[]) {
  let cached: Promise<readonly StonePhrase[][]> | undefined;
  return () => cached ??= loadSituation(sitId).then((def) => {
    if (!def) throw new Error(sitId);
    return chambers.map((chamber, i) => def.hints[stoneGroup(chamber.id)].items.map((item) => {
      const s = compose(item.s, {}, { look: () => undefined });
      return { id: item.id, chamber: i, en: s.say, lt: s.nat, s };
    }));
  }).catch((error) => { cached = undefined; throw error; });
}

export function nextLine(lines: readonly StonePhrase[][], chamber: number, heard: ReadonlySet<string>,
  taken: ReadonlySet<string>, rnd: () => number, choices: StonePhrase[]) {
  for (let pass = 0; pass < 4; pass++) {
    const own = pass % 2 === 0, fresh = pass < 2;
    let count = 0;
    for (let i = own ? chamber : 0; i < (own ? chamber + 1 : lines.length); i++) {
      const group = lines[i];
      if (!group) continue;
      for (let j = 0; j < group.length; j++) {
        const line = group[j];
        if (!taken.has(line.id) && (!fresh || !heard.has(line.id))) choices[count++] = line;
      }
    }
    if (count) return choices[Math.floor(rnd() * count)];
  }
}

export function allHeard(lines: readonly StonePhrase[][], heard: ReadonlySet<string>) {
  return lines.length > 0 && lines.every((group) => group.length && group.every((line) => heard.has(line.id)));
}

export function stoneMeaningChoices(id: string, phrase: StonePhrase, lit: number, lines: readonly StonePhrase[][]) {
  let seed = lit * 977 + 7;
  for (const letter of id + phrase.id) seed = (seed * 31 + letter.charCodeAt(0)) >>> 0;
  const rnd = rand(seed), options = [phrase.lt];
  const pool = [...new Set(lines.flat().map((line) => line.lt))].filter((lt) => lt !== phrase.lt);
  while (options.length < 3 && pool.length) options.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer: options.indexOf(phrase.lt) };
}
