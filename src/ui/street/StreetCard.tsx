import { useState } from "react";
import type { Sentence } from "../../convo/compose";
import { speechSupported } from "../../convo/speech";
import { TAXI_UI } from "../../content/taxi";
import { useStreet } from "../../game/street/StreetLife";
import type { StreetProp } from "../../game/street/types";
import { STREET_WORDS as words } from "../../game/street/words";
import { picturesOn, useStore } from "../../state/store";
import { Icon, type IconName } from "../icons";
import { GlossLine } from "../kit/GlossLine";
import { sceneUrl } from "../scenes";
import "./street.css";

const propIcons: Partial<Record<StreetProp, IconName>> = {
  coffee_cup: "coffee", postcard: "card", pie: "restaurant", bracelet: "ring", fruit_cup: "restaurant",
  wallet: "card", keys: "key", glove: "bag", sunglasses: "sunset", map: "map", phone: "smartphone",
  guidebook: "bookOpen", camera: "clapper", tablet: "laptop", guitar: "radio", small_guitar: "radio",
  easel: "frame", kite: "arrowUp", clipboard: "clipboard", microphone: "mic",
  water_bottle: "bottle", water_jug: "bottle", mailbag: "bag", market_bags: "bag",
  box: "package", package: "package", cake_box: "gift", fruit: "bag",
};

export function StreetTextButton({ sentence, hint = false }: { sentence: Sentence; hint?: boolean }) {
  const [translated, setTranslated] = useState(false);
  return (
    <button type="button" className="street-line" aria-expanded={translated} onClick={() => setTranslated(true)}>
      <GlossLine sentence={sentence} gloss={false} compact />
      {translated ? <small className="street-tr" lang="lt">{sentence.nat}</small>
        : hint ? <small className="street-hint" lang="lt">{words.translation}</small> : null}
    </button>
  );
}

export function StreetIconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick(): void }) {
  return <button type="button" className="street-icon-btn" aria-label={label} title={label} onClick={onClick}>
    <Icon name={icon} size={19} />
  </button>;
}

function StreetPicture({ id, cast, prop }: { id: string; cast: string; prop?: StreetProp }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="street-picture" aria-hidden="true">
      {!loaded && <div className="street-picture-art">
        <span><Icon name="walk" size={28} /></span>
        {prop && <span><Icon name={propIcons[prop] ?? "bag"} size={28} /></span>}
      </div>}
      {attempt < 2 && <img key={attempt} src={sceneUrl(`street/${id}${attempt === 0 ? `-${cast}` : ""}`)} alt=""
        hidden={!loaded} onLoad={() => setLoaded(true)} onError={() => setAttempt((index) => index + 1)} />}
    </div>
  );
}

export function StreetCard({ light = false }: { light?: boolean }) {
  const view = useStreet((s) => s.moment);
  const illustrated = useStore((s) => picturesOn(s.settings));
  const sayLt = useStore((s) => s.settings.sayLt);
  if (!view) return null;
  const { cast, moment, scriptName } = view.draw;
  const listening = view.mic.status === "listening" || view.mic.status === "starting";
  return (
    <section className={"street-card" + (light ? " street-light" : "")} key={view.key} data-moment={moment.id}
      data-cast={cast.id} data-script={scriptName} data-step={view.step} data-exchange={view.exchange} data-kind={moment.kind}
      aria-label={light ? words.light : view.role}>
      {light && <h2>{words.light}</h2>}
      {(light || illustrated) && <StreetPicture id={moment.id} cast={cast.id} prop={cast.prop} />}
      <header className="street-head">
        <span className="street-face" aria-hidden="true"><Icon name="walk" size={23} /></span>
        <strong lang="lt">{view.named && cast.name ? `${cast.name} · ${view.role}` : view.role}</strong>
        <StreetIconButton icon="close" label={words.dismiss} onClick={view.dismiss} />
      </header>
      {view.scene && <p className="street-scene" lang="lt">{view.scene}</p>}
      {view.line && <div className="street-current" aria-live="polite">
        <StreetTextButton key={view.line.key} sentence={view.line.sentence} hint={view.hint} />
        <StreetIconButton icon="speaker" label={words.replay} onClick={view.replay} />
      </div>}
      {!!view.choices.length && <div className="street-turn">
        <div className="street-choices" role="group" aria-label={words.answer}>
          {view.choices.map(({ key, sentence }) => <button type="button" className="btn soft street-choice" data-translated={sayLt || undefined} key={key} onClick={() => view.choose(key)}>
            <GlossLine sentence={sentence} gloss={sayLt} compact />
          </button>)}
        </div>
        {speechSupported() && <button type="button" className={`street-icon-btn${listening ? " listening" : ""}`}
          aria-label={listening ? TAXI_UI.micOff : TAXI_UI.micOn} aria-pressed={listening} onClick={view.toggleMic}>
          <Icon name="mic" size={21} />
        </button>}
      </div>}
      {view.mic.heard && <small className="street-heard" lang="en" aria-live="polite">{view.mic.heard}</small>}
    </section>
  );
}
