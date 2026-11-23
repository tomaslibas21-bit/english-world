import type { Sentence } from "../../convo/compose";
import { Interlinear } from "../Interlinear";
import "./glossLine.css";

export function GlossLine({ sentence, gloss, compact }: { sentence: Sentence; gloss: boolean; compact?: boolean }) {
  if (compact) return <span className="kit-gloss-compact">
    <span lang="en">{sentence.en}</span>
    {gloss && <small lang="lt">{sentence.nat}</small>}
  </span>;
  const bare = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = bare(sentence.units.map((unit) => unit.lt).join(" ")) === bare(sentence.nat ?? "");
  return <Interlinear s={sentence} lt={gloss} ipa={false} nat={gloss && !same} />;
}
