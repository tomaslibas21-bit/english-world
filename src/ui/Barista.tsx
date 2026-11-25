import { BARISTA_ORDERS, BARISTA_UI as words, priceText, type Row } from "../content/barista";
import { speechSupported } from "../convo/speech";
import { useBarista } from "../game/barista/store";
import { matchesPick, trayRows } from "../game/barista/tray";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { FeedbackBadge } from "./kit/FeedbackBadge";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard } from "./kit/ScoreCard";
import "./barista.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("barista", name, value);
const total = BARISTA_ORDERS.length;

export function BaristaOffer() {
  const offered = useBarista((s) => s.offered);
  const line = useBarista((s) => s.line);
  if (!offered || !line) return null;
  return (
    <section className="barista-offer barista-panel">
      <div data-line={line.key}><GlossLine sentence={line.sentence} gloss /></div>
      <button type="button" className="btn" onClick={() => act("start")}>{words.start}</button>
    </section>
  );
}

function OrderTray({ touch }: { touch: boolean }) {
  const { built, row, page, highlight: target, correctionSelected, step, ready, menu, line } = useBarista();
  const highlight = line?.key === "bs_c_sorry" ? null : target;
  if (!menu) return null;

  return (
    <div className="barista-tray barista-panel" data-shortcuts={!touch}>
      {trayRows(built).map((kind: Row) => {
        const selected = kind === row;
        const repair = highlight?.row === kind && correctionSelected !== null;
        const marker = repair ? (correctionSelected ? "add" : "remove") : undefined;
        return (
          <div key={kind} className={`barista-row${selected ? " barista-row-active" : ""}`} data-row={kind}>
            {touch ? <span className="barista-row-label">{words[kind]}</span> : (
              <button className="barista-row-label" type="button" onClick={() => act("row", kind)} aria-pressed={selected}>
                {words[kind]}{selected && <span className="barista-row-keys" aria-hidden>↑ ↓{menu[kind].length > 4 && " · ← →"}</span>}
              </button>
            )}
            <div className="barista-chips" role="group" aria-label={words[kind]}>
              {menu[kind].map(({ id, en, lt }, i) => {
                const marked = highlight?.row === kind && highlight.id === id;
                const pressed = matchesPick(built, { row: kind, id });
                return (
                  <button key={id} type="button" data-chip={id}
                    className={`barista-chip${marked ? " barista-chip-glow" : ""}`}
                    data-repair={marked ? marker : undefined} aria-pressed={pressed} aria-disabled={!ready}
                    onClick={() => act(kind, id)}>
                    {!touch && selected && Math.floor(i / 4) === page && <kbd>{i % 4 + 1}</kbd>}
                    {marked && marker && <span className="barista-repair-mark">{marker === "add" ? "+" : "−"}</span>}
                    <span lang="en">{en}</span><small lang="lt">{lt}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="barista-give">
        <button type="button" className="btn" disabled={step !== "build" || !ready} onClick={() => act("give")}>
          {words.give}{!touch && <kbd>Enter</kbd>}
        </button>
      </div>
    </div>
  );
}

export function BaristaOverlay({ touch }: { touch: boolean }) {
  const { line, hiddenOrder, revealed, choices, mic, micOn, customer, tray, step, ready, repair, price, result } = useBarista();
  if (result) return <div className="barista-result"><ScoreCard title={words.title}
    ratio={result.firstTime / result.served}
    rows={[
      { label: words.orders, value: `${result.served}/${total}` },
      { label: words.firstTime, value: <FeedbackBadge correct={result.firstTime === total}>{result.firstTime}/{total}</FeedbackBadge> },
    ]}
    phrases={{ label: words.cards, count: result.cards }}
    again={{ label: words.again, run: () => act("again") }}
    done={{ label: words.done, run: () => game?.modeExit() }}
  /></div>;

  const listening = mic.status === "starting" || mic.status === "listening";
  const concealed = hiddenOrder.length > 0 && !repair;
  const served = step === "handover" || step === "price" || step === "thanks" || step === "reply";
  return (
    <div className="barista-overlay" lang="lt">
      <header className="barista-header">
        {customer > 0 && <div className="barista-counter barista-panel">{words.customer} <b>{customer} {words.of} {total}</b>
          {(repair || served) && <FeedbackBadge correct={served} label={served ? words.orders : words.retry} />}
        </div>}
        <button className="barista-exit barista-panel" type="button" onClick={() => game?.modeExit()}>{words.exit}</button>
      </header>
      {!concealed && line && (
        <div className="barista-cue" data-line={line.key} aria-live="polite">
          <div className="barista-cue-text barista-panel"><GlossLine sentence={line.sentence} gloss /></div>
        </div>
      )}
      <div className="barista-bottom">
        {price !== null && <div className="barista-price barista-panel"><span>{words.price}</span><strong>{priceText(price)}</strong></div>}
        {concealed && (
          <div className="barista-listen barista-panel">
            {revealed && (
              <ul className="barista-order-text" role="list" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") e.stopPropagation(); }}>
                {hiddenOrder.map(({ key, sentence }) => (
                  <li key={key} data-line={key}>
                    <span lang="en">{sentence.en}</span>
                    <small lang="lt">{sentence.nat}</small>
                  </li>
                ))}
              </ul>
            )}
            <div className="barista-listen-actions">
              <button type="button" disabled={step !== "build" || !ready} onClick={() => act("hear")}><Icon name="speaker" size={18} /> {words.hear}</button>
              {!revealed && <button type="button" onClick={() => act("show")}>{words.show}</button>}
            </div>
          </div>
        )}
        {!!choices.length && (
          <div className="barista-choices barista-panel">
            <div className="barista-turn">
              {speechSupported() && <button className={`mic${listening ? " listening" : ""}`} aria-label={micOn && listening ? words.micOff : words.micOn}
                onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={24} /></button>}
              <div>
                <b>{mic.status === "unclear" ? words.retry : words.turn}</b>
                <small>{mic.heard ? <span lang="en">„{mic.heard}“</span> : listening ? words.listen : words.answer}</small>
              </div>
            </div>
            {choices.map(({ key, sentence }, i) => (
              <button className="barista-choice" type="button" key={key} data-line={key} onClick={() => act("choose", key)}>
                {!touch && <kbd>{i + 1}</kbd>}
                <span lang="en">{sentence.en}</span><small lang="lt">{sentence.nat}</small>
              </button>
            ))}
          </div>
        )}
        {tray && <OrderTray touch={touch} />}
      </div>
    </div>
  );
}
