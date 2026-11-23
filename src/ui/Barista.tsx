import { BARISTA_ORDERS, BARISTA_UI as words, priceText, type Row } from "../content/barista";
import { speechSupported } from "../convo/speech";
import { useBarista } from "../game/barista/store";
import { matchesPick, trayRows } from "../game/barista/tray";
import { game } from "../game/gameRef";
import { HL, L, TL } from "./i18n";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard } from "./kit/ScoreCard";
import { STRINGS } from "./strings";
import "./barista.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("barista", name, value);
const total = BARISTA_ORDERS.length;
const priceLabel = STRINGS[`barista:${words.price}`] ?? words.price;

export function BaristaOffer() {
  const offered = useBarista((s) => s.offered);
  const line = useBarista((s) => s.line);
  if (!offered || !line) return null;
  return (
    <section className="barista-offer barista-panel" lang={HL}>
      <div data-line={line.key}><GlossLine sentence={line.sentence} gloss /></div>
      <button type="button" className="btn" onClick={() => act("start")}>{L(words.start)}</button>
    </section>
  );
}

function OrderTray({ touch }: { touch: boolean }) {
  const { built, row, page, highlight: target, step, ready, menu, line } = useBarista();
  const highlight = line?.key === "bs_c_sorry" ? null : target;
  if (!menu) return null;

  return (
    <div className="barista-tray barista-panel" data-shortcuts={!touch}>
      {trayRows(built).map((kind: Row) => {
        const selected = kind === row;
        return (
          <div key={kind} className={`barista-row${selected ? " barista-row-active" : ""}`} data-row={kind}>
            <button className="barista-row-label" type="button" onClick={() => act("row", kind)} aria-pressed={selected}>
              {L(words[kind])}{!touch && selected && <span className="barista-row-keys" aria-hidden>↑ ↓{menu[kind].length > 4 && " · ← →"}</span>}
            </button>
            <div className="barista-chips" role="group" aria-label={L(words[kind])}>
              {menu[kind].map(({ id, en, lt }, i) => {
                const marked = highlight?.row === kind && highlight.id === id;
                const pressed = matchesPick(built, { row: kind, id });
                return (
                  <button key={id} type="button" data-chip={id}
                    className={`barista-chip${marked ? " barista-chip-glow" : ""}`}
                    aria-pressed={pressed} aria-disabled={!ready}
                    onClick={() => act(kind, id)}>
                    {!touch && selected && Math.floor(i / 4) === page && <kbd>{i % 4 + 1}</kbd>}
                    <span lang={TL}>{en}</span><small lang={HL}>{lt}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="barista-give">
        <button type="button" className="btn" disabled={step !== "build" || !ready} onClick={() => act("give")}>
          {L(words.give)}{!touch && <kbd>Enter</kbd>}
        </button>
      </div>
    </div>
  );
}

export function BaristaOverlay({ touch }: { touch: boolean }) {
  const { line, hiddenOrder, revealed, choices, mic, micOn, customer, tray, step, ready, repair, price, result } = useBarista();
  if (result) return (
    <div className="barista-result" lang={HL}>
      <ScoreCard title={L(words.title)} ratio={result.firstTime / result.served}
        rows={[
          { label: L(words.orders), value: `${result.served}/${total}` },
          { label: L(words.firstTime), value: `${result.firstTime}/${total}` },
        ]}
        phrases={{ label: L(words.cards), count: result.cards }}
        again={{ label: L(words.again), run: () => act("again") }}
        done={{ label: L(words.done), run: () => game?.modeExit() }}
      />
    </div>
  );

  const listening = mic.status === "starting" || mic.status === "listening";
  const concealed = hiddenOrder.length > 0 && !repair;
  return (
    <div className="barista-overlay" lang={HL}>
      <header className="barista-header">
        {customer > 0 && <div className="barista-counter barista-panel">{L(words.customer)} <b>{L(`{n} ${words.of} {of}`, { n: customer, of: total })}</b></div>}
        <button className="barista-exit barista-panel" type="button" onClick={() => game?.modeExit()}>{L(words.exit)}</button>
      </header>
      {!concealed && line && (
        <div className="barista-cue" data-line={line.key} aria-live="polite">
          <div className="barista-cue-text barista-panel"><GlossLine sentence={line.sentence} gloss /></div>
        </div>
      )}
      <div className="barista-bottom">
        {price !== null && <div className="barista-price barista-panel"><span>{priceLabel}</span><strong>{priceText(price)}</strong></div>}
        {concealed && (
          <div className="barista-listen barista-panel">
            {revealed && (
              <ul className="barista-order-text" role="list" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") e.stopPropagation(); }}>
                {hiddenOrder.map(({ key, sentence }) => (
                  <li key={key} data-line={key}>
                    <span lang={TL}>{sentence.en}</span>
                    <small lang={HL}>{sentence.nat}</small>
                  </li>
                ))}
              </ul>
            )}
            <div className="barista-listen-actions">
              <button type="button" disabled={step !== "build" || !ready} onClick={() => act("hear")}><Icon name="speaker" size={18} /> {L(words.hear)}</button>
              {!revealed && <button type="button" onClick={() => act("show")}>{L(words.show)}</button>}
            </div>
          </div>
        )}
        {!!choices.length && (
          <div className="barista-choices barista-panel">
            <div className="barista-turn">
              {speechSupported() && <button className={`mic${listening ? " listening" : ""}`} aria-label={L(micOn && listening ? words.micOff : words.micOn)}
                onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={24} /></button>}
              <div>
                <b>{L(mic.status === "unclear" ? words.retry : words.turn)}</b>
        <small>{mic.heard ? <span lang={TL}>„{mic.heard}“</span> : L(listening ? words.listen : words.answer)}{/* i18n-ok: quotes around recognized speech */}</small>
              </div>
            </div>
            {choices.map(({ key, sentence }, i) => (
              <button className="barista-choice" type="button" key={key} data-line={key} onClick={() => act("choose", key)}>
                {!touch && <kbd>{i + 1}</kbd>}
                <span lang={TL}>{sentence.en}</span><small lang={HL}>{sentence.nat}</small>
              </button>
            ))}
          </div>
        )}
        {tray && <OrderTray touch={touch} />}
      </div>
    </div>
  );
}
