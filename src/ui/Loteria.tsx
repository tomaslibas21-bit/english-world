import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { LOTERIA_SITUATION, LOTERIA_UI as words, TONA_LT, type LoteriaCard } from "../editions/es/content/loteria";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import type { KitLine } from "../game/kit/dialogue";
import { phraseEntries } from "../game/kit/phrases";
import { BOARD_SIZE, CORNERS } from "../game/loteria/logic";
import { loteriaNames, useLoteria, type CardLabel } from "../game/loteria/store";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { PhraseChooser } from "./kit/PhraseChooser";
import { PhraseSave } from "./kit/PhraseSave";
import { SayIt } from "./kit/SayIt";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import { STRINGS } from "./strings";
import "./loteria.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("loteria", name, value);
const source = { situationId: LOTERIA_SITUATION };
const palette = ["#f2d3ac", "#e2bbbd", "#c8dcbd", "#c3d8df", "#e5ccdd", "#ecdba0"];
const isCorner = (index: number) => CORNERS.some((corner) => corner === index);
const picture = (card: LoteriaCard) => `${import.meta.env.BASE_URL}loteria/${card.id}.webp`;

const missingPictures = new Set<string>();
/** The deck's own back (public/loteria/back.webp) over the drawn pattern, which shows if the picture is missing. */
const BACK_ART = { "--card-back-art": `url("${import.meta.env.BASE_URL}loteria/back.webp")` } as CSSProperties;

export function LoteriaTile({ card, label, pictureUrl, bean }: {
  card: LoteriaCard;
  label: CardLabel;
  pictureUrl?: string;
  bean?: ReactNode;
}) {
  const [missing, setMissing] = useState<string>();
  return (
    <span className="loteria-tile">
      <span className="loteria-art" style={{ backgroundColor: palette[(card.n - 1) % palette.length] }}>
        <span className="loteria-number">{card.n}</span>
        {pictureUrl && missing !== pictureUrl && !missingPictures.has(pictureUrl)
          ? <img src={pictureUrl} alt="" decoding="async" onError={() => { missingPictures.add(pictureUrl); setMissing(pictureUrl); }} />
          : <span className="loteria-icon" aria-hidden="true">{card.icon}</span>}
        {bean}
      </span>
      <strong lang={TL}>{label.name}</strong>
      <small lang={HL}>{label.gloss}</small>
    </span>
  );
}

function Line({ line, kind }: { line: KitLine | null; kind: "caller" | "verse" | "neighbor" }) {
  return line && <div className={`loteria-line loteria-${kind}`} data-line={line.key}
    data-card-name={kind === "caller" && line.key.startsWith("lt_c_") || undefined}>
    {kind === "neighbor" && <b className="loteria-speaker">{TONA_LT.nom}</b>}
    <div className="phrase-save-row">
      <GlossLine sentence={line.sentence} gloss source={source} />
      <PhraseSave sentence={line.sentence} {...source} />
    </div>
  </div>;
}

function Shortcut({ children, touch }: { children: ReactNode; touch: boolean }) {
  return !touch && <kbd aria-hidden="true">{children}</kbd>;
}

export function LoteriaOverlay({ touch }: { touch: boolean }) {
  const {
    phase, kind, next, labels, board, covered, current, called, faceDown, caller, verse, neighbor,
    focus, glow, bounce, tip, ready, shoutSentence, winningCells, replay, sayIt, choices, read, mic, micOn, result,
  } = useLoteria();
  const names = useMemo(() => phraseEntries(source.situationId, loteriaNames([...board, ...called], labels)), [board, called, labels]);

  if (result) return (
    <div className="loteria-score" lang={HL}>
      <div className="loteria-score-scene" aria-hidden="true" />
      <ScoreCard title={L(words.title)} said={result.said} celebrate={result.winner === "learner"} score={result.winner === "learner" ? L(words.won) : L(words.wonBy, { nom: TONA_LT.nom })}
        rows={[
          { label: L(words.calls), value: <ScoreNumber value={result.calls} /> },
          { label: L(words.marked), value: L("{n} iš {of}", { n: result.covered, of: BOARD_SIZE }) },
          { label: L(words.heard), value: <ScoreNumber value={result.heard} /> },
        ]}
        phrases={{ label: L(words.cards), count: result.phrases }} review={result.review}
        again={{ label: STRINGS[`loteria:${words.again}`] ?? words.again, run: () => act("again") }}
        done={{ label: L(words.done), run: () => act("exit") }}>
        <p className="loteria-next">{L(words.next, { round: L(words.round[next]).toLowerCase() })}</p>
      </ScoreCard>
    </div>
  );
  if (!board.length) return null;

  const playable = phase === "calling" || phase === "waiting";
  const reading = phase === "reading";
  const hint = ready ? L(words.tipShout) : tip ? L(words[tip]) : "";
  const showCard = current && !reading && phase !== "leaving";
  const visibleCaller = faceDown && caller?.key.startsWith("lt_c_") ? null : caller;
  return (
    <main className="loteria-play" data-phase={phase} lang={HL}>
      <div className="loteria-stage">
        <div className="loteria-scene" aria-hidden="true" />
        <div className="loteria-stage-actions">
          <button type="button" className="loteria-exit" onClick={() => act("exit")}>
            <Icon name="walk" size={17} /> {L(words.exit)} <Shortcut touch={touch}>Esc</Shortcut>
          </button>
          <PhraseChooser entries={names} targetOnly={false} />
        </div>
      </div>
      <section className="loteria-draw" aria-live="polite">
        {showCard && <div className="loteria-current" data-face-down={faceDown}>
          {faceDown ? <span className="loteria-card-back" role="img" aria-label={L(words.listenFirst)} style={BACK_ART} />
            : <LoteriaTile key={current.id} card={current} label={labels[current.id]} pictureUrl={picture(current)} />}
        </div>}
        <div className="loteria-spoken">
          {reading ? <>
            <div className="loteria-read-heading"><b>{L(words.readOut)}</b><span>{L(words.tipRead)}</span></div>
            <div className="loteria-read">
              {read.map((card) => {
                const i = choices.findIndex((choice) => choice.key === `lt_c_${card.id}`);
                return <button type="button" key={card.id} className="loteria-read-chip"
                  data-line={`lt_c_${card.id}`} disabled={i < 0} onClick={() => act("read", `lt_c_${card.id}`)}>
                  <Icon name="speaker" size={15} /><span lang={TL}>{labels[card.id].name}</span>
                  {i >= 0 && <Shortcut touch={touch}>{i + 1}</Shortcut>}
                </button>;
              })}
            </div>
          </> : <>
            {showCard && faceDown && <div className="loteria-listen-first">{L(words.listenFirst)}</div>}
            {neighbor ? <Line line={neighbor} kind="neighbor" /> : <>
              <Line line={verse} kind="verse" />
              <Line line={visibleCaller} kind="caller" />
            </>}
            <div className="loteria-replay">
              <SayIt game="loteria" cue={sayIt} />
              <button type="button" className="loteria-small-button" disabled={!replay} onClick={() => act("replay")}>
                <Icon name="speaker" size={16} /> {L("Klausyti dar kartą")} <Shortcut touch={touch}>R</Shortcut>
              </button>
            </div>
          </>}
        </div>
      </section>
      <section className="loteria-board-panel">
        <header className="loteria-board-heading">
          <span>{L(words.board)}</span>
          <strong>{L(words.round[kind])}</strong>
        </header>
        <p className="loteria-help" role="status">
          {phase === "opening" ? L(words.roundHelp[kind]) : hint}
        </p>
        <div className="loteria-board" role="group" aria-label={L(words.board)}>
          {board.map((card, index) => {
            const marked = covered.includes(index);
            return <button type="button" key={card.id} className="loteria-cell" data-card={card.id}
              data-focus={!touch && focus === index} data-glow={glow === index} data-winning={ready && winningCells.includes(index)} data-corner={kind === "esquinas" && isCorner(index)}
              aria-pressed={marked} disabled={!playable} onClick={() => act("cover", String(index))}>
              <LoteriaTile card={card} label={labels[card.id]} pictureUrl={picture(card)} bean={marked
                ? <span className="loteria-bean" aria-hidden="true" />
                : bounce?.index === index && <span key={bounce.count} className="loteria-bean loteria-bounce" aria-hidden="true" />} />
            </button>;
          })}
        </div>
        <footer className="loteria-footer">
          <div className="loteria-history">
            <span>{L(words.calledCount, { n: called.length })}</span>
            <div tabIndex={called.length ? 0 : undefined} className="loteria-history-strip"
              aria-label={L(words.called)} onKeyDown={(e) => { if (e.key.startsWith("Arrow")) e.stopPropagation(); }}>
              {called.map((card) => <span key={card.id} title={labels[card.id].name} aria-label={labels[card.id].name}>{card.icon}</span>)}
            </div>
          </div>
          {speechSupported() && reading &&
            <button type="button" className="loteria-mic" aria-pressed={micOn} aria-label={micOn ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")}
              data-listening={mic.status === "listening" || mic.status === "starting"} onClick={() => act("mic", !micOn)}>
              <Icon name="mic" size={19} />
            </button>}
          {shoutSentence && <PhraseSave sentence={shoutSentence} {...source} className="loteria-shout-save" />}
          <button type="button" className="loteria-shout" data-ready={ready} disabled={!playable}
            onClick={() => act("shout")}>{L(words.shout)} <Shortcut touch={touch}>L</Shortcut></button>
        </footer>
        <div className="loteria-keys">{!touch && <><kbd>← ↑ ↓ →</kbd><kbd>Space / Enter</kbd></>}</div>
      </section>
    </main>
  );
}
