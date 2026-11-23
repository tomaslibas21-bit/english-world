import { useState, type CSSProperties } from "react";
import { BARISTA_UI } from "../content/barista";
import { GOFISH_DECKS, GOFISH_NAMES, GOFISH_UI as words, GOFISH_WORDS, type GoFishWord } from "../content/gofish";
import { GOFISH_SPEAKER_NAMES } from "../content/gofish-lines";
import { NPCS } from "../content/npcs";
import { ROAD_UI } from "../content/road";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { nextDeck } from "../game/gofish/logic";
import { useGoFish } from "../game/gofish/store";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import "./gofish.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("gofish", name, value);
const exit = () => game?.modeExit();
const pictureFor = (id: string) => `/gofish/${id}.webp`;
const labelUnits = (text: string) => Math.max(...text.split(/\s+/u).map((part) => part.length)) * 0.64;

export function GoFishOffer() {
  const offered = useGoFish((s) => s.offered);
  const line = useGoFish((s) => s.line);
  if (!offered || !line) return null;
  return <section className="gofish-offer gofish-paper" lang="lt">
    <b lang="en">{NPCS.dan.name}</b>
    <div data-line={line.key}><GlossLine sentence={line.sentence} gloss /></div>
    <div className="gofish-offer-actions">
      <button type="button" className="btn" onClick={() => act("start")}>{words.start}</button>
      <button type="button" className="btn soft" onClick={exit}>{words.done}</button>
    </div>
  </section>;
}

export function PictureCard({ word, picture }: { word: GoFishWord; picture?: string }) {
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const showPicture = !!picture && loaded === picture && failed !== picture;
  return <span className="gofish-word" style={{
    "--en-label-units": labelUnits(word.en), "--lt-label-units": labelUnits(word.lt),
  } as CSSProperties}>
    <span className="gofish-art" aria-hidden="true">
      {!showPicture && word.icon}
      {picture && failed !== picture && <img alt="" src={picture} hidden={!showPicture}
        onLoad={() => setLoaded(picture)} onError={() => setFailed(picture)} />}
    </span>
    <strong lang="en">{word.en}</strong>
    <small lang="lt">{word.lt}</small>
  </span>;
}

function CardBack() { return <span className="gofish-back" aria-hidden="true" />; }

export function GoFishOverlay({ touch }: { touch: boolean }) {
  const { round, step, line, choices, gloss, busy, target, picked, hintCard, hintReply, tip, mic, micOn, drawn, result } = useGoFish();
  const learner = useStore((s) => s.progress.profile?.name);
  if (result && round) {
    const { winner, right, replies, cards } = result;
    return <div className="gofish-result"><ScoreCard title={words.title} celebrate={winner === "learner"}
      score={winner === "learner" ? words.youWin : winner ? words.winner(GOFISH_NAMES[winner].nom) : words.tie}
      rows={[
        { label: words.yourPairs, value: <ScoreNumber value={round.pairs.learner.length} /> },
        ...GOFISH_SPEAKER_NAMES.map((id) => ({ label: words.pairsOf(GOFISH_NAMES[id].gen), value: <ScoreNumber value={round.pairs[id].length} /> })),
        { label: words.rightReplies, value: `${right} ${words.of} ${replies}` },
      ]}
      phrases={{ label: words.cards, count: cards }}
      again={{ label: words.again, subtitle: words.nextDeck(GOFISH_DECKS[nextDeck(round.deck)].lt), run: () => act("again") }}
      done={{ label: words.done, run: exit }}
    /></div>;
  }

  const deck = GOFISH_DECKS[round?.deck ?? 0];
  const hand = round?.hands.learner ?? [];
  const asking = step === "ask" && !!choices.length && !busy;
  const visibleChoices = step === "ask" ? choices.filter(({ key }) => key === `gf_ask_${picked}`) : choices;
  const listening = mic.status === "starting" || mic.status === "listening";
  const coach = mic.status === "unclear" ? BARISTA_UI.retry : tip;
  const cueName = line?.speaker === "learner" ? learner : line && NPCS[line.speaker].name;
  return <div className="gofish-overlay" lang="lt" data-deck={deck.id}>
    <header className="gofish-header">
      <span className="gofish-deck gofish-paper"><CardBack />{deck.lt}</span>
      <button type="button" className="gofish-exit gofish-paper" onClick={exit}>
        {words.exit}{!touch && <kbd>Esc</kbd>}
      </button>
    </header>
    {line && <div className="gofish-top gofish-cue gofish-paper" data-line={line.key} data-speaker={line.speaker}>
      <div className="gofish-sentence" aria-live="polite">
        {cueName && <b className="gofish-speaker" lang={line.speaker === "learner" ? undefined : "en"}>{cueName}</b>}
        <GlossLine sentence={line.sentence} gloss={gloss} />
      </div>
      <div className="gofish-replay">
        <button type="button" title={ROAD_UI.replay} aria-label={ROAD_UI.replay} disabled={busy} onClick={() => act("hear")}>
          <Icon name="speaker" size={18} />
        </button>
        {!gloss && <button type="button" onClick={() => act("show")}>{BARISTA_UI.show}</button>}
      </div>
    </div>}
    {drawn && <div className="gofish-drawn" data-word={drawn} aria-hidden="true">
      <PictureCard word={GOFISH_WORDS[drawn]} picture={pictureFor(drawn)} />
    </div>}
    {round && <div className="gofish-opponents" role="group" aria-label={words.askWhom}>
      {GOFISH_SPEAKER_NAMES.map((id) => {
        const count = round.hands[id].length, pairs = round.pairs[id].length;
        return <button type="button" key={id} data-target={id} className="gofish-person gofish-paper"
          disabled={!asking || count === 0} aria-pressed={target === id}
          onClick={() => act("target", id)}>
          <strong lang="en">{NPCS[id].name}</strong>
          <span className="gofish-count"><CardBack />{count}</span>
          <span className="gofish-count" aria-label={`${words.pairsOf(GOFISH_NAMES[id].gen)} ${pairs}`}>
            <i className="gofish-pair-icon" aria-hidden="true" />{pairs}
          </span>
          {!touch && asking && count > 0 && <kbd>{id === "dan" ? "← / D" : "→ / N"}</kbd>}
        </button>;
      })}
    </div>}
    {round && <div className="gofish-bottom">
      {coach && <div className="gofish-tip gofish-paper" role="status">{coach}</div>}
      <div className="gofish-console gofish-paper">
        <div className="gofish-hand-caption">
          <span>{words.hand}</span>
          <span className="gofish-count"><i className="gofish-pair-icon" aria-hidden="true" />{words.yourPairs} <strong>{round.pairs.learner.length}</strong></span>
        </div>
        {hand.length > 0 && <div className="gofish-hand" data-count={hand.length} role="group" aria-label={words.hand}>
          {hand.map((id, index) => <button type="button" key={`${id}-${index}`} data-word={id} disabled={!asking}
            aria-pressed={asking ? picked === id : undefined} className={`gofish-card${hintCard === id ? " gofish-glow" : ""}`}
            onClick={() => act("card", id)}>
            {!touch && asking && <kbd>{(index + 1) % 10}</kbd>}
            <PictureCard word={GOFISH_WORDS[id]} picture={pictureFor(id)} />
          </button>)}
        </div>}
        <div className="gofish-actions">
          {step === "fish" ? <button type="button" className="gofish-fish" disabled={busy} onClick={() => act("fish")}>
            <CardBack /><span>{words.fish}<small>{words.pondLeft(round.pond.length)}</small></span>{!touch && <kbd>F</kbd>}
          </button> : <>
            {!!choices.length && speechSupported() && <button type="button" className={`mic${listening ? " listening" : ""}`}
              aria-label={micOn ? BARISTA_UI.micOff : BARISTA_UI.micOn} aria-pressed={micOn} disabled={busy}
              onClick={() => act("mic", !micOn)}><Icon name="mic" size={22} /></button>}
            {!!visibleChoices.length ? visibleChoices.map(({ key, sentence }) => (
              <button type="button" key={key} data-line={key} disabled={busy}
                className={`gofish-choice${hintReply === key || tip && (step === "ask" || step === "pair") ? " gofish-glow" : ""}`}
                onClick={() => act("choose", key)}>
                {!touch && <kbd>{key === "gf_yes" ? "Y" : key === "gf_nope" ? "N" : "Enter"}</kbd>}
                <span lang="en">{sentence.en}</span>{gloss && <small lang="lt">{sentence.nat}</small>}
              </button>
            )) : <span className="gofish-status">
              {step === "ask" && !tip ? words.pickCard
                : round.turn !== "learner" && !tip ? words.turnOf(GOFISH_NAMES[round.turn].gen) : null}
            </span>}
            <span className="gofish-pond"><CardBack />{words.pondLeft(round.pond.length)}</span>
          </>}
        </div>
      </div>
    </div>}
  </div>;
}
