import { useSyncExternalStore } from "react";
import { bookLocale, bookWord as w } from "./bookCopy";
import { NPCS } from "../content/npcs";
import { RADIO_SKIN, SCENE_STATION } from "../content/radio";
import { radio, useRadio } from "../radio";
import type { SceneCue, SceneItem } from "../radio/sceneProgram";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { SitIcon } from "./SitIcon";

function SceneLine({ cue, folded }: { cue: SceneCue; folded: boolean }) {
  const show = useRadio((s) => s.sceneTranslation);
  return <>
    {!folded && <div className="walk-meta"><b lang={TL}><Icon name="speaker" size={15} />{SCENE_STATION.name}</b><span>{w("es")}</span></div>}
    <div className="spoken">
      <b className="scene-speaker" lang={cue.speaker === "learner" ? HL : TL}>{cue.speaker === "learner" ? L("Tu") : NPCS[cue.speaker]?.name}</b>
      <p lang={TL}>{cue.text}</p>
      {show && <p className="walk-translation" lang={HL}>{cue.translation}</p>}
    </div>
    <button className="translate" aria-expanded={show} onClick={() => radio.toggleSceneTranslation()}>{w(show ? "hideTranslation" : "showTranslation")}</button>
  </>;
}

function SpokenScene({ folded = false }: { folded?: boolean }) {
  const player = radio.talk!.player;
  const current = () => player.getSnapshot().cue as SceneCue | null;
  const cue = useSyncExternalStore(player.subscribe, current, current);
  if (!cue) return null;
  return <SceneLine cue={cue} folded={folded} />;
}

export function WalkingSceneLine() {
  return <section className={`radio-strip book-walking scene-walking radio-skin-${RADIO_SKIN}`} aria-label={SCENE_STATION.name}><SpokenScene /></section>;
}

export function SceneRadioControls() {
  const player = radio.talk!.player;
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  const showText = useRadio((s) => s.showTalkText);
  const item = state.item as SceneItem | null;
  const cue = state.cue as SceneCue | null;
  const total = item?.tracks.target.cues.length ?? 0;
  const pos = cue && L("Replika {n}/{total}", { n: cue.number, total });
  const note = state.status === "loading" ? L("Įkeliamas pokalbis…") : state.error ? w("audioError") : state.status === "ended" ? w("finished") : null;
  const browse = L("Rinktis pokalbį");
  const title = item?.title.lt ?? browse;
  const toggle = w(state.playIntent ? "pause" : "play");
  return <>
    <div className="rs-display">
      <div className="rs-line"><span className="rs-spectrum" aria-hidden><i /><i /><i /><i /><i /><i /><i /></span>
        <span className="rs-station" lang={TL}>{SCENE_STATION.name}</span><span>{SCENE_STATION.freq.toLocaleString(bookLocale)}</span></div>
      <div className="rs-song">
        <div className="rs-now"><b lang={HL}>{title}</b>{pos && <span className="rs-sub">{pos}</span>}{note && <em>{note}</em>}</div>
        <button className="rs-heart" onClick={() => radio.browse()} aria-label={browse}>
          {item ? <SitIcon id={item.selection.chapterId} /> : <Icon name="list" />}</button>
      </div>
      <i className="rs-progress" aria-hidden><i style={{ width: `${cue ? 100 * cue.number / total : 0}%` }} /></i>
    </div>
    <div className="rs-keys">
      <button className="rs-key" title={browse} aria-label={browse} onClick={() => radio.browse()}><Icon name="list" size={22} /></button>
      <button className="rs-key" title={w("previous")} aria-label={w("previous")} disabled={!cue} onClick={() => radio.previous()}><Icon name="skipBack" size={22} /></button>
      <button className="rs-key rs-knob" title={toggle} aria-label={toggle} aria-pressed={state.playIntent} onClick={() => state.playIntent ? radio.pause() : radio.play()}>
        <Icon name={state.playIntent ? "pause" : "play"} size={26} /></button>
      <button className="rs-key" title={w("next")} aria-label={w("next")} disabled={!cue} onClick={() => radio.next()}><Icon name="skipNext" size={22} /></button>
      <button className={"rs-key" + (showText ? " on" : "")} title={w("showText")} aria-label={w("showText")} aria-pressed={showText}
        onClick={() => radio.setTalkText(!showText)}><Icon name="lyrics" size={22} /></button>
    </div>
    {!showText && cue && <div className="book-folded"><SpokenScene folded /></div>}
    {state.error && <div className="rs-opts book-errors"><button className="rs-opt" onClick={() => radio.play()}>{w("retry")}</button></div>}
  </>;
}
