import { useLayoutEffect, useRef } from "react";
import { bookLocale, bookWord as w } from "./bookCopy";
import { LOCATIONS } from "../content/locations";
import { RADIO_SKIN, SCENE_STATION } from "../content/radio";
import { radio } from "../radio";
import { playableScenes } from "../radio/scenes";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { SitIcon } from "./SitIcon";
import "./books.css";

const places = Object.values(LOCATIONS).map((place) => ({
  place, scenes: playableScenes.filter((scene) => scene.location === place.id),
})).filter((group) => group.scenes.length);

export function ScenePicker() {
  const dialog = useRef<HTMLDialogElement>(null);
  const any = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const el = dialog.current!;
    el.showModal();
    any.current?.focus({ preventScroll: true });
    return () => el.close();
  }, []);
  const close = () => radio.closeShelf();
  return <dialog ref={dialog} className={`book-picker scene-picker radio-skin-${RADIO_SKIN}`} data-pad-scope="book-shelf"
    aria-labelledby="scene-picker-title" onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    onKeyDown={(event) => { if (event.key.toLowerCase() !== "r") event.stopPropagation(); }}>
    <section className="book-sheet">
      <header className="mast">
        <button className="round back" data-pad-back aria-label={L("Uždaryti")} onClick={close}><Icon name="arrowLeft" /></button>
        <span className="brand" lang={TL}><Icon name="mic" />{SCENE_STATION.name}</span>
        <span className="frequency">{SCENE_STATION.freq.toLocaleString(bookLocale)} <small>{w("mhz")}</small></span>
      </header>
      <div className="scene-layout">
        <header className="scene-intro">
          <h1 id="scene-picker-title">{L("Rinktis pokalbį")}</h1>
          <button ref={any} className="primary" data-pad-default onClick={() => radio.playAnyScene()}><Icon name="shuffle" />{L("Leisti atsitiktinį pokalbį")}</button>
        </header>
        <div className="scene-places scroll">
          {places.map(({ place, scenes }) => <section key={place.id} data-place={place.id} aria-labelledby={`scene-place-${place.id}`}>
            <h2 id={`scene-place-${place.id}`} lang={TL}>{place.name}</h2>
            {scenes.map((scene) => <button key={scene.id} data-scene={scene.id}
              className="scene-row" aria-label={`${w("play")} · ${scene.title.lt}`} onClick={() => radio.listenScene(scene.id)}>
              <span className="scene-icon"><SitIcon id={scene.id} size={24} /></span>
              <span className="scene-titles"><span className="target-title" lang={TL}>{scene.title.en}</span>
                <span className="translation" lang={HL}>{scene.title.lt}</span></span>
              <span className="scene-play"><Icon name="play" size={14} />{w("play")}</span>
            </button>)}
          </section>)}
        </div>
      </div>
    </section>
  </dialog>;
}
