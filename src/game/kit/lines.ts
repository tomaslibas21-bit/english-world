import { NPCS } from "../../content/npcs";
import { getSituation } from "../../content/situations/catalog";
import type { SentSrc } from "../../content/types";
import { compose } from "../../convo/compose";
import { foldAccents, tokenizeInput } from "../../convo/normalize";
import type { Verdict } from "../../convo/speech";
import { useStore } from "../../state/store";

export function conversationLine(situation: string, npcId: string, key: string, fallback: Record<string, SentSrc[]> | undefined, learner: boolean) {
  const source = getSituation(situation)?.lines[key]?.[0] ?? fallback?.[key]?.[0];
  if (!source) return null;
  const npc = NPCS[npcId], me = useStore.getState().progress.profile?.gender ?? "f", other = npc?.gender ?? "f";
  return compose(source, {}, {
    look: () => undefined, addressee: learner ? other : me, speaker: learner ? me : other, formal: !npc?.informal,
  });
}

/** Match complete utterances for an authored learner turn, including short or numeric alternatives. */
export function learnerTurn<T extends { key: string; sentence: { en: string } }>(options: T[], accept: Readonly<Record<string, readonly string[]>>) {
  // Fold accents before the language pack can use them to mark verb forms.
  const variantsOf = (text: string) => tokenizeInput(foldAccents(text)).variants.filter((tokens) => tokens.length);
  const entries = options.flatMap((option) => [option.sentence.en, ...(accept[option.key] ?? [])]
    .map((phrase) => ({ option, phrase, variants: variantsOf(phrase) })));
  const phrases = [...new Set(entries.map(({ phrase }) => phrase))];
  function read(text: string): { answer: T | undefined; verdict: Verdict } {
    const heard = variantsOf(text);
    let answer: T | undefined;
    let prefix = false;
    for (const { option, variants } of entries) for (const expected of variants) for (const words of heard) {
      if (words.length > expected.length || !words.every((word, i) => word === expected[i])) continue;
      if (words.length === expected.length) answer ??= option;
      else prefix = true;
    }
    return { answer, verdict: answer ? (prefix ? "open" : "complete") : prefix ? "prefix" : "none" };
  }
  return { phrases, read };
}
