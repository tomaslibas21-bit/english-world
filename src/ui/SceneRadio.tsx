import { useSyncExternalStore } from "react";
import { bookLocale, bookWord as w } from "../content/bookCopy";
import { NPCS } from "../content/npcs";
import { RADIO_SKIN, SCENE_STATION } from "../content/radio";
import { radio, useRadio } from "../radio";
import type { SceneCue, SceneItem } from "../radio/sceneProgram";
import { Icon } from "./icons";
import { SitIcon } from "./SitIcon";
import { useBookMedia } from "./bookHooks";

const noPlayer = () => () => {};
/** Keep the task folded across clip handoffs, while respecting pause, text visibility and open pickers. */
export function useScenePlayback() {
  const player = radio.talk?.player;
  const read = () => radio.onScenes && player?.getSnapshot().playIntent === true;
  const intent = useSyncExternalStore(player?.subscribe ?? noPlayer, read, read);
  return useRadio((s) => intent && radio.onScenes && s.on && s.showTalkText && !s.shelfOpen && !s.readerOpen && !s.settingsOpen);
}

function SceneLine({ cue, title, folded }: { cue: SceneCue; title: string; folded: boolean }) {
  const show = useRadio((s) => s.sceneTranslation);
  const landscape = useBookMedia("(max-height: 500px) and (orientation: landscape)");
  const translate = <button className="translate" aria-expanded={show} onClick={() => radio.toggleSceneTranslation()}>{w(show ? "hideTranslation" : "showTranslation")}</button>;
  return <>
    {!folded && <div className="walk-meta"><b lang="en"><Icon name="speaker" size={15} />{SCENE_STATION.name}</b>{landscape ? translate : <span>{w("en")}</span>}</div>}
    <div className="spoken">
      <b className="scene-speaker">{cue.speaker === "learner" ? w("learner") : NPCS[cue.speaker]?.name}<span className="scene-title" lang="en"> · {title}</span></b>
      <p lang="en">{cue.text}</p>
      {show && <p className="walk-translation" lang="lt">{cue.translation}</p>}
    </div>
    {(!landscape || folded) && translate}
  </>;
}

function SpokenScene({ folded = false }: { folded?: boolean }) {
  const player = radio.talk!.player;
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  const cue = state.cue as SceneCue | null;
  if (!cue) return null;
  return <SceneLine cue={cue} title={(state.item as SceneItem | null)?.title.en ?? ""} folded={folded} />;
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
  const pos = cue && w("turn", { n: cue.number, total });
  const note = state.status === "loading" ? w("sceneLoading") : state.error ? w("audioError") : state.status === "ended" ? w("finished") : null;
  const title = item?.title[bookLocale] ?? w("browseScenes");
  const toggle = w(state.playIntent ? "pause" : "play");
  return <>
    <div className="rs-display">
      <div className="rs-line"><span className="rs-spectrum" aria-hidden><i /><i /><i /><i /><i /><i /><i /></span>
        <span className="rs-station" lang="en">{SCENE_STATION.name}</span><span>{SCENE_STATION.freq.toLocaleString(bookLocale)}</span></div>
      <div className="rs-song">
        <div className="rs-now"><b lang={bookLocale}>{title}</b>{pos && <span className="rs-sub">{pos}</span>}{note && <em>{note}</em>}</div>
        <button className="rs-heart" onClick={() => radio.browse()} aria-label={w("browseScenes")}>
          {item ? <SitIcon id={item.selection.chapterId} /> : <Icon name="list" />}</button>
      </div>
      <i className="rs-progress" aria-hidden><i style={{ width: `${cue ? 100 * cue.number / total : 0}%` }} /></i>
    </div>
    <div className="rs-keys">
      <button className="rs-key" title={w("browseScenes")} aria-label={w("browseScenes")} onClick={() => radio.browse()}><Icon name="list" size={22} /></button>
      <button className="rs-key" title={w("previousTurn")} aria-label={w("previousTurn")} disabled={!cue} onClick={() => radio.previous()}><Icon name="skipBack" size={22} /></button>
      <button className="rs-key rs-knob" title={toggle} aria-label={toggle} aria-pressed={state.playIntent} onClick={() => state.playIntent ? radio.pause() : radio.play()}>
        <Icon name={state.playIntent ? "pause" : "play"} size={26} /></button>
      <button className="rs-key" title={w("nextTurn")} aria-label={w("nextTurn")} disabled={!cue} onClick={() => radio.next()}><Icon name="skipNext" size={22} /></button>
      <button className={"rs-key" + (showText ? " on" : "")} title={w("showText")} aria-label={w("showText")} aria-pressed={showText}
        onClick={() => radio.setTalkText(!showText)}><Icon name="lyrics" size={22} /></button>
    </div>
    {!showText && cue && <div className="book-folded"><SpokenScene folded /></div>}
    {state.status === "error" && <div className="rs-opts book-errors"><button className="rs-opt" onClick={() => radio.play()}>{w("sceneRetry")}</button></div>}
  </>;
}
