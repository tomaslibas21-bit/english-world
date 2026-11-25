import { useMemo } from "react";
import { BARISTA_CONVERSATION, BARISTA_ORDERS, BARISTA_UI as words, priceText, type Row } from "../content/barista";
import { speechSupported } from "../convo/speech";
import { useBarista } from "../game/barista/store";
import { matchesPick, trayRows } from "../game/barista/tray";
import { game } from "../game/gameRef";
import { phraseEntries } from "../game/kit/phrases";
import { HL, L, TL } from "./i18n";
import { Icon } from "./icons";
import { FeedbackBadge } from "./kit/FeedbackBadge";
import { GlossLine } from "./kit/GlossLine";
import { PhraseChooser } from "./kit/PhraseChooser";
import { PhraseSave } from "./kit/PhraseSave";
import { ScoreCard } from "./kit/ScoreCard";
import { STRINGS } from "./strings";
import "./barista.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("barista", name, value);
const total = BARISTA_ORDERS.length;
const priceLabel = STRINGS[`barista:${words.price}`] ?? words.price;
const source = { situationId: BARISTA_CONVERSATION.situation };

export function BaristaOffer() {
  const offered = useBarista((s) => s.offered);
  const line = useBarista((s) => s.line);
  if (!offered || !line) return null;
  return (
    <section className="barista-offer barista-panel" data-pad-scope="choice" lang={HL}>
      <div className="phrase-save-row" data-line={line.key}><GlossLine sentence={line.sentence} gloss source={source} /><PhraseSave sentence={line.sentence} {...source} /></div>
      <button type="button" className="btn" onClick={() => act("start")}>{L(words.start)}</button>
    </section>
  );
}

function OrderTray({ touch }: { touch: boolean }) {
  const { built, row, page, highlight: target, correctionSelected, step, ready, menu, line, trayReview } = useBarista();
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
            <button className="barista-row-label" type="button" onClick={() => act("row", kind)} aria-pressed={selected}>
              {L(words[kind])}
              {!touch && selected && <span className="barista-row-keys" aria-hidden>↑ ↓{menu[kind].length > 4 && " · ← →"}</span>}
            </button>
            <div className="barista-chips" role="group" aria-label={L(words[kind])}>
              {menu[kind].map(({ id, en, lt }, i) => {
                const marked = highlight?.row === kind && highlight.id === id;
                const pressed = matchesPick(built, { row: kind, id });
                return (
                  <button key={id} type="button" data-chip={id} data-pad-answer
                    className={`barista-chip${marked ? " barista-chip-glow" : ""}`}
                    data-repair={marked ? marker : undefined} aria-pressed={pressed} aria-disabled={!ready}
                    onClick={() => act(kind, id)}>
                    {!touch && selected && Math.floor(i / 4) === page && <kbd>{i % 4 + 1}</kbd>}
                    {marked && marker && <span className="barista-repair-mark">{marker === "add" ? "+" : "−"}</span>}
                    <span lang={TL}>{en}</span><small lang={HL}>{lt}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="barista-tray-actions">
        {trayReview && <PhraseChooser entries={trayReview} targetOnly={false} />}
        <div className="barista-give">
          <button type="button" className="btn" disabled={step !== "build" || !ready} onClick={() => act("give")}>
            {L(words.give)}{!touch && <kbd>Enter</kbd>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BaristaOverlay({ touch }: { touch: boolean }) {
  const { line, hiddenOrder, revealed, choices, mic, micOn, customer, tray, step, ready, repair, price, result } = useBarista();
  const replies = useMemo(() => phraseEntries(source.situationId, choices), [choices]);
  const orderEntries = useMemo(() => revealed ? phraseEntries(source.situationId, hiddenOrder) : [], [revealed, hiddenOrder]);
  if (result) return (
    <div className="barista-result" lang={HL}>
      <ScoreCard title={L(words.title)} ratio={result.firstTime / result.served} review={result.review}
        rows={[
          { label: L(words.orders), value: `${result.served}/${total}` },
          { label: L(words.firstTime), value: <FeedbackBadge correct={result.firstTime === total}
            label={L(result.firstTime === total ? "Teisingai!" : words.retry)}>{result.firstTime}/{total}</FeedbackBadge> },
        ]}
        phrases={{ label: L(words.cards), count: result.cards }}
        again={{ label: L(words.again), run: () => act("again") }}
        done={{ label: L(words.done), run: () => game?.modeExit() }}
      />
    </div>
  );

  const listening = mic.status === "starting" || mic.status === "listening";
  const concealed = hiddenOrder.length > 0 && !repair;
  const served = step === "handover" || step === "price" || step === "thanks" || step === "reply";
  return (
    <div className="barista-overlay" data-pad-scope="choice" data-pad-phase={step} lang={HL}>
      <header className="barista-header">
        {customer > 0 && <div className="barista-counter barista-panel">{L(words.customer)} <b>{L(`{n} ${words.of} {of}`, { n: customer, of: total })}</b>
          {(repair || served) && <FeedbackBadge correct={served} label={L(served ? "Teisingai!" : words.retry)} />}
        </div>}
        <button className="barista-exit barista-panel" type="button" data-pad-back onClick={() => game?.modeExit()}>{L(words.exit)}</button>
      </header>
      {!concealed && line && (
        <div className="barista-cue" data-line={line.key} aria-live="polite">
          <div className="barista-cue-text barista-panel phrase-save-row"><GlossLine sentence={line.sentence} gloss source={source} /><PhraseSave sentence={line.sentence} {...source} /></div>
        </div>
      )}
      <div className="barista-bottom">
        {price !== null && <div className="barista-price barista-panel"><span>{priceLabel}</span><strong>{priceText(price)}</strong></div>}
        {concealed && (
          <div className="barista-listen barista-panel">
            {revealed && (
              <ul className="barista-order-text" role="list" tabIndex={0} data-pad-scroll
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
              {revealed && <PhraseChooser entries={orderEntries} targetOnly={false} />}
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
              <PhraseChooser entries={replies} targetOnly={false} />
            </div>
            {choices.map(({ key, sentence }, i) => (
              <button className="barista-choice" type="button" key={key} data-line={key} data-pad-answer={key} onClick={() => act("choose", key)}>
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
