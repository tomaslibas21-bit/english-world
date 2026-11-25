import type { Sentence } from "../../convo/compose";
import { HL, TL } from "../i18n";
import { Interlinear } from "../Interlinear";
import type { PhraseSource } from "./phraseLine";
import "./glossLine.css";

export function GlossLine({ sentence, gloss, compact, source, portalHost }: {
  sentence: Sentence; gloss: boolean; compact?: boolean; source?: PhraseSource; portalHost?: HTMLElement;
}) {
  if (compact || !sentence.units.length) return <span className="kit-gloss-compact">
    <span lang={TL}>{sentence.en}</span>
    {gloss && <small lang={HL}>{sentence.nat}</small>}
  </span>;
  const bare = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = bare(sentence.units.map((unit) => unit.lt).join(" ")) === bare(sentence.nat ?? "");
  return <Interlinear s={sentence} lt={gloss} ipa={false} nat={gloss && !same} source={source} portalHost={portalHost} />;
}
