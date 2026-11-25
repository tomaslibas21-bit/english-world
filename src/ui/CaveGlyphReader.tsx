import type { GlyphQuiz } from "../game/cave/quest";
import type { GameApi } from "../game/gameRef";
import { L } from "./i18n";
import StonePhraseCard from "./kit/StonePhraseCard";
import type { StoneReading } from "./kit/stoneReading";
import "./caveGlyphReader.css";

const classes = {
  veil: "glyph-veil", card: "glyph-card", heading: "glyph-head", close: "glyph-x", replay: "glyph-play",
  reading: "glyph-say", text: "glyph-text", line: "glyph-line",
};

export default function CaveGlyphReader({ g, cave, reader }: { g: GlyphQuiz; cave: NonNullable<GameApi["cave"]>; reader: StoneReading }) {
  const { targetLang, helperLang, Icon, labels } = reader;
  const listening = g.mic === "listening";
  const pick = (index: number) => cave.pick(index);
  return <StonePhraseCard reader={reader} title={L("Kalbantis akmuo")} labels={labels} classNames={classes}
    {...{ targetLang, helperLang }} source={g.source} phrase={g.s ? { sentence: g.s } : { targetText: g.text, helperText: g.lt }}
    shown={g.shown} solved={g.solved} onReplay={() => cave.say()} onDismiss={() => cave.close()}
    returnFocus={document.querySelector<HTMLElement>(".stage canvas")}
    quizKeys={{ count: g.options.length, pick }}
    heading={<>
      <span className="glyph-rune" aria-hidden><i /><i /><i /></span>
      <h2>{g.solved ? L("Akmuo užsidegė!") : L("Akmuo kalba. Ką jis sako?")}</h2>
    </>}
    reveal={<button type="button" className="glyph-show" onClick={() => cave.showWords()}><span aria-hidden>· · ·</span> {L("Rodyti žodžius")}</button>}
    quiz={<>
      <p className="glyph-q">{L("Pasirink, ką tai reiškia:")}</p>
      <div className="glyph-opts">
        {g.options.map((option, index) => {
          const wrong = g.wrong.includes(index);
          return <button type="button" key={index} className={wrong ? "glyph-opt wrong" : "glyph-opt"} disabled={wrong} lang={helperLang} onClick={() => pick(index)}>
            <kbd>{index + 1}</kbd><span>{option}</span>
          </button>;
        })}
      </div>
    </>}
    mic={g.mic !== "unsupported" && <div className="glyph-mic">
      <span className="glyph-or">{L("arba")}</span>
      <button type="button" className={"btn small" + (listening ? "" : " soft")} onClick={() => cave.listen()}>
        <Icon name={listening ? "stop" : "mic"} size={18} /> {listening ? L("Klausau…") : L("Pasakyk tai balsu")}
      </button>
      {g.heard && <span className={"glyph-heard" + (g.mic === "missed" ? " miss" : "")} lang={targetLang}>{L("„{line}“", { line: g.heard })}</span>}
      {g.mic === "missed" && !g.heard && <span className="glyph-heard miss">{L("Neišgirdau. Bandyk dar kartą.")}</span>}
    </div>}
  />;
}
