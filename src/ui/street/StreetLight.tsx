import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS as words } from "../../game/street/words";
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
      {chatter.lines.map(({ key, sentence }) => <StreetTextButton key={key} sentence={sentence} />)}
    </section>}
  </>;
}
