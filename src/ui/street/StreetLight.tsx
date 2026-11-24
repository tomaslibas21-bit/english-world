import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS as words } from "../../game/street/words";
import { PhraseSave } from "../kit/PhraseSave";
import { StreetCard, StreetIconButton, StreetTextButton } from "./StreetCard";

export function StreetLight() {
  const chatter = useStreet((s) => s.lightChatter);
  return <>
    <StreetCard light />
    {chatter && <section className="street-light street-light-chatter" key={chatter.key} aria-label={words.overheard}>
      <header className="street-head">
        <h2>{words.overheard}</h2>
        <StreetIconButton icon="play" label={words.replay} onClick={chatter.play} />
        <StreetIconButton icon="close" label={words.dismiss} onClick={chatter.dismiss} />
      </header>
      {chatter.lines.map(({ key, sentence }) => <div className="phrase-save-row" key={key}>
        <StreetTextButton sentence={sentence} />
        <PhraseSave sentence={sentence} situationId="street" sourceLabel={words.overheard} iconOnly />
      </div>)}
    </section>}
  </>;
}
