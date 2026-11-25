import { lazy } from "react";
import { GOFISH_CONVERSATION, GOFISH_UI as words } from "../content/gofish";
import { NPCS } from "../content/npcs";
import { game } from "../game/gameRef";
import { useGoFish } from "../game/gofish/store";
import { GlossLine } from "./kit/GlossLine";
import { PhraseSave } from "./kit/PhraseSave";
import "./gofish.css";

const source = { situationId: GOFISH_CONVERSATION.situation };
const act = (name: string) => game?.modeAction("gofish", name);
const exit = () => game?.modeExit();

export const GoFishOverlay = lazy(() => import("./GoFishOverlay"));

export function GoFishOffer() {
  const offered = useGoFish((s) => s.offered);
  const line = useGoFish((s) => s.line);
  if (!offered || !line) return null;
  return <section className="gofish-offer gofish-paper" data-pad-scope="gofish-offer" lang="lt">
    <b lang="en">{NPCS.dan.name}</b>
    <div className="phrase-save-row" data-line={line.key}>
      <GlossLine sentence={line.sentence} gloss source={source} />
      <PhraseSave sentence={line.sentence} {...source} iconOnly />
    </div>
    <div className="gofish-offer-actions">
      <button type="button" className="btn" onClick={() => act("start")}>{words.start}</button>
      <button type="button" className="btn soft" data-pad-back onClick={exit}>{words.done}</button>
    </div>
  </section>;
}
