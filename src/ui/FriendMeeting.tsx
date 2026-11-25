import { speechSupported } from "../convo/speech";
import { NPCS } from "../content/npcs";
import { game } from "../game/gameRef";
import { useMeeting } from "../game/phone/meeting";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";

export default function FriendMeeting() {
  const { line, choices, mic, micOn } = useMeeting();
  const gloss = useStore((s) => s.settings.lt);
  const answerGloss = useStore((s) => s.settings.sayLt);
  return (
    <section className="friend-meeting" data-pad-scope="meeting" aria-label={NPCS.lizzie.name}>
      <header>
        <b>{NPCS.lizzie.name}</b>
        {choices.length > 0 && speechSupported() && (
          <button className={"icon-btn" + (mic.status === "listening" ? " listening" : "")}
            aria-label={micOn ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")} aria-pressed={micOn}
            onClick={() => game?.modeAction("friend-meeting", "mic", !micOn)}>
            <Icon name="mic" size={20} />
          </button>
        )}
      </header>
      {line && <div data-meeting-line={line.key}><GlossLine sentence={line.sentence} gloss={gloss} /></div>}
      {choices.map(({ key, sentence }) => (
        <button className="btn soft" key={key} data-meeting-answer={key} data-pad-answer={key} onClick={() => game?.modeAction("friend-meeting", "answer", key)}>
          <GlossLine sentence={sentence} gloss={answerGloss} />
        </button>
      ))}
      {mic.heard && <small lang={TL} aria-live="polite">{mic.heard}</small>}
    </section>
  );
}
