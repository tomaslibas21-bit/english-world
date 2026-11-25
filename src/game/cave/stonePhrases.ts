import { compose, type Sentence } from "../../convo/compose";
import { rand } from "../world/util";
import { loadSituation } from "../../content/situations/catalog";
import { CHAMBERS, SLATE_CAVE } from "../world/slateCave";

export interface StonePhrase { id: string; chamber: number; en: string; lt: string; s: Sentence }

export const firstLine = (stoneId: string) => stoneId.replace(/-(\d+)$/, (_, n: string) => "_" + n.padStart(2, "0"));
export const stoneGroup = (chamber: string) => "p_" + chamber;
export const TREE_SIT = SLATE_CAVE.treeSituation;

let cached: Promise<readonly StonePhrase[][]> | undefined;
export function stonePhrases() {
  return cached ??= loadSituation(TREE_SIT).then((def) => {
    if (!def) throw new Error(TREE_SIT);
    return CHAMBERS.map((chamber, i) => def.hints[stoneGroup(chamber.id)].items.map((item) => {
      const s = compose(item.s, {}, { look: () => undefined });
      return { id: item.id, chamber: i, en: s.say, lt: s.nat, s };
    }));
  }).catch((error) => { cached = undefined; throw error; });
}

export function nextLine(lines: readonly StonePhrase[][], chamber: number, heard: ReadonlySet<string>, taken: ReadonlySet<string>, rnd: () => number) {
  const own = lines[chamber] ?? [], all = lines.flat();
  for (const [pool, fresh] of [[own, true], [all, true], [own, false], [all, false]] as const) {
    const choices = pool.filter((line) => !taken.has(line.id) && (!fresh || !heard.has(line.id)));
    if (choices.length) return choices[Math.floor(rnd() * choices.length)];
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
