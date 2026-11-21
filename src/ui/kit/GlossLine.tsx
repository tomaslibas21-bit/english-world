import type { Sentence } from "../../convo/compose";
import { Interlinear } from "../Interlinear";

export function GlossLine({ sentence, gloss }: { sentence: Sentence; gloss: boolean }) {
  const bare = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = bare(sentence.units.map((unit) => unit.lt).join(" ")) === bare(sentence.nat ?? "");
  return <Interlinear s={sentence} lt={gloss} ipa={false} nat={gloss && !same} />;
}
