import { CAVE_COPY } from "../content/cave-copy";
import type { CaveQuest, GlyphQuiz } from "../game/cave/quest";
import { Icon } from "./icons";
import StonePhraseCard from "./kit/StonePhraseCard";

const classes = {
  veil: "glyph-veil", card: "glyph-card", heading: "glyph-head", close: "glyph-x", replay: "glyph-play",
  reading: "glyph-say", text: "glyph-text", line: "glyph-line",
};

export default function CaveGlyphReader({ g, cave }: { g: GlyphQuiz; cave: CaveQuest }) {
  const copy = CAVE_COPY.quiz, listening = g.mic === "listening";
  const pick = (index: number) => cave.pick(index, g.opening);
  return <StonePhraseCard title={copy.title.lt} classNames={classes}
    source={g.source} phrase={{ sentence: g.s }} shown={g.shown} solved={g.solved}
    onReplay={() => cave.say(g.opening)} onDismiss={() => cave.close(g.opening)}
    returnFocus={document.querySelector<HTMLElement>(".act-btn, .stage canvas")}
    quizKeys={{ count: g.options.length, pick }}
    heading={<div lang="lt"><h2>{g.solved ? copy.solved.lt : copy.question.lt}</h2>
      {g.solved && g.unavailable && <small>{copy.replayUnavailable.lt}</small>}</div>}
    reveal={<button className="btn soft glyph-show" type="button" onClick={() => cave.showWords(g.opening)}>{copy.reveal.lt}</button>}
    quiz={<>
      <p className="glyph-q" lang="lt">{g.wrong.length ? copy.wrong.lt : g.unavailable ? copy.unrecorded.lt : copy.pick.lt}</p>
      <div className="glyph-opts">
        {g.options.map((option, index) => {
          const wrong = g.wrong.includes(index);
          return <button type="button" key={index} data-pad-answer={index} className={"glyph-opt" + (wrong ? " wrong" : "")}
            disabled={wrong} lang="lt" aria-label={copy.option(index + 1, option).lt} onClick={() => pick(index)}>
            <kbd aria-hidden="true">{index + 1}</kbd><span>{option}</span>
          </button>;
        })}
      </div>
    </>}
    mic={g.mic !== "unsupported" && <div className="glyph-mic">
      <span>{copy.or.lt}</span>
      <button type="button" className={"btn small" + (listening ? "" : " soft")}
        aria-label={listening ? copy.stopListening.lt : copy.speak.lt} onClick={() => cave.listen(g.opening)}>
        <Icon name={listening ? "stop" : "mic"} size={18} /> {listening ? copy.listening.lt : copy.speak.lt}
      </button>
      {g.heard && <span className="glyph-heard" lang="en">{copy.heard(g.heard).en}</span>}
      {g.mic === "missed" && <span className="glyph-heard" lang="lt">{copy.missed.lt}</span>}
    </div>}
  />;
}
