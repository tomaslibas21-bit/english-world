import { useMemo, useState } from "react";
import { ASK_WAY_LINES, ASK_WAY_NPC, ASK_WAY_SITUATION, ASK_WAY_UI as directions } from "../content/ask-way-lines";
import { LOCATIONS } from "../content/locations";
import { PHOTO_THINGS, PHOTO_WALK_LINES, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_WALK_UI as words } from "../content/photo-walk-lines";
import { HL, L, TL } from "./i18n";
import { STRINGS } from "./strings";
import type { PhotoThingId } from "../content/townQuests";
import type { Sentence } from "../convo/compose";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { conversationLine } from "../game/kit/lines";
import { phraseEntries } from "../game/kit/phrases";
import { readPhoto } from "../game/photowalk/photos";
import { useTownQuests, type Destination } from "../game/photowalk/store";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import { PhraseChooser } from "./kit/PhraseChooser";
import { PhraseSave } from "./kit/PhraseSave";
import { useWalk } from "./PhotoWalkHud";

const act = (name: string, value?: string | boolean) => game?.modeAction("photowalk", name, value);
const photoSource = { situationId: PHOTO_WALK_SITUATION };
const directionSource = { situationId: ASK_WAY_SITUATION };
const photoLine = (key: string) => conversationLine(PHOTO_WALK_SITUATION, PHOTO_WALK_NPC, key, PHOTO_WALK_LINES, false)!;
const stopLabel = STRINGS[`photowalk:${words.quit}`] ?? L(words.quit);

/** An empty page's sticker (public/photowalk/<id>.webp, batch 5 media); the icon until it loads, or if it is missing. */
function Sticker({ id, icon }: { id: string; icon: string }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  return <span className="photo-placeholder" aria-hidden data-sticker={state}>
    {state !== "ok" && icon}
    {state !== "missing" && <img src={`${import.meta.env.BASE_URL}photowalk/${id}.webp`} alt="" hidden={state !== "ok"}
      onLoad={() => setState("ok")} onError={() => setState("missing")} />}
  </span>;
}

function PhotoPage({ thing, found }: { thing: typeof PHOTO_THINGS[number]; found: boolean }) {
  const [showNote, setShowNote] = useState(false);
  const name = photoLine(`pw_n_${thing.id}`);
  const photo = found ? readPhoto(thing.id) : null;
  return <li className="photo-page" data-thing={thing.id} data-found={found}>
    {photo ? <img src={photo} alt="" width={160} height={120} /> : <Sticker id={thing.id} icon={thing.icon} />}
    {found
      ? <PhotoPhrase sentence={name} compact />
      : <>
        <span lang={HL}>{name.nat}</span>
        <button type="button" className="btn ghost small" aria-expanded={showNote} onClick={() => setShowNote((value) => !value)}>{L(words.where)}</button>
        {showNote && <PhotoPhrase sentence={photoLine(`pw_w_${thing.id}`)} />}
      </>}
  </li>;
}

function PhotoPhrase({ sentence, compact }: { sentence: Sentence; compact?: boolean }) {
  return <div className="phrase-save-row">
    <GlossLine sentence={sentence} gloss compact={compact} source={photoSource} />
    <PhraseSave sentence={sentence} {...photoSource} />
  </div>;
}

function PhotoBook() {
  const { status, found } = useWalk();
  const { visit, line } = useTownQuests();
  const [confirm, setConfirm] = useState(false);
  const title = status === "done" ? L(words.done) : L(words.book);
  return <section className="photo-sheet photo-book" data-pad-scope="modal" role="dialog" aria-modal="true" aria-label={title}>
    <img className="photo-book-cover" src={`${import.meta.env.BASE_URL}photowalk/cover.webp`} alt="" aria-hidden
      onError={(e) => { e.currentTarget.hidden = true; }} />
    <header>
      <Icon name="camera" size={23} />
      <div><h2>{title}</h2><p>{L(words.found, { n: found.length, of: PHOTO_THINGS.length })}</p></div>
      <button type="button" className="quest-close" data-pad-back aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {visit && line && <div className="photo-visit" data-line={line.key}><PhotoPhrase sentence={line.sentence} /></div>}
    <ol className="photo-pages">
      {PHOTO_THINGS.map((thing) => <PhotoPage key={thing.id} thing={thing} found={found.includes(thing.id)} />)}
    </ol>
    <footer data-pad-scope={confirm ? "photo-confirm" : undefined}>
      {confirm ? <>
        <div className="photo-confirm">{L(words.quitAsk)}</div>
        <button className="btn small" type="button" data-pad-no-default onClick={() => act("quit")}>{stopLabel}</button>
        <button className="btn soft small" type="button" data-pad-back data-pad-default onClick={() => setConfirm(false)}>{L(words.quitNo)}</button>
      </> : <>
        {status === "on" && <button className="btn soft small" type="button" onClick={() => act("pause")}>{L(words.pause)}</button>}
        {status === "paused" && <button className="btn small" type="button" onClick={() => act("resume")}>{L(words.resume)}</button>}
        {status !== "done" && <button className="btn ghost small" type="button" data-pad-tool="photo-stop" onClick={() => setConfirm(true)}>{stopLabel}</button>}
        <button className="btn ghost small" type="button" onClick={() => game?.modeExit()}>{L(words.close)}</button>
      </>}
    </footer>
  </section>;
}
function PhotoMic({ finale = false }: { finale?: boolean }) {
  const mic = useTownQuests((s) => s.mic);
  if (!speechSupported()) return null;
  const listening = mic.status === "starting" || mic.status === "listening";
  return <button type="button" className={`mic${listening ? " listening" : ""}`} aria-label={listening ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")}
    aria-pressed={listening} onClick={() => act("mic", finale ? !listening : undefined)}><Icon name="mic" size={23} /></button>;
}

function PhotoQuiz() {
  const { quiz, line, mic } = useTownQuests();
  const options = useMemo(() => quiz?.choices.map((id) => ({ id, sentence: photoLine(`pw_n_${id}`) })) ?? [], [quiz?.choices]);
  const entries = useMemo(() => phraseEntries(photoSource.situationId, options), [options]);
  if (!quiz) return null;
  const title = quiz.got ? L(words.got) : L(words.whatIsIt);
  const pick = (id: PhotoThingId) => act("pick", id);
  return <>
    <div className="photo-flash" aria-hidden />
    <section className="photo-sheet photo-quiz" data-pad-scope="modal" data-pad-phase={quiz.got ? "found" : "quiz"} role="dialog" aria-modal="true" aria-label={title} data-thing={quiz.id}>
      <header>
        {quiz.got && <Icon name="sparkles" className="quest-sparkle" size={23} />}
        {!quiz.got && quiz.jpeg && <img className="photo-preview" src={quiz.jpeg} alt="" width={160} height={120} />}
        <div aria-live="polite"><h2>{title}</h2>{!quiz.got && <p>{L(words.sayOrPick)}</p>}</div>
        <button type="button" className="quest-close" data-pad-back aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
      </header>
      {quiz.got ? <>
        {line && <div data-line={line.key}><PhotoPhrase sentence={line.sentence} /></div>}
        <button type="button" className="btn small" onClick={() => act("book")}>{L(words.open)}</button>
      </> : <>
        <div className="photo-choices">
          {options.map(({ id, sentence }) => <button type="button" className="btn soft" key={id} data-choice={id} lang={TL}
            disabled={quiz.misses.includes(id)} onClick={() => pick(id)}>{sentence.en}</button>)}
        </div>
        <div className="photo-quiz-mic"><PhotoMic />{mic.heard && <span lang={TL}>{mic.heard}</span>}<PhraseChooser entries={entries} /></div>
        {quiz.wrong && <p role="status">{L(words.wrong)}</p>}
      </>}
    </section>
  </>;
}

function PhotoFinale() {
  const { line, choices, mic } = useTownQuests();
  const entries = useMemo(() => phraseEntries(photoSource.situationId, choices), [choices]);
  return <section className="photo-sheet photo-finale" data-pad-scope="modal" role="dialog" aria-modal="true" aria-label={L(words.book)}>
    <header>
      <h2>{L(words.book)}</h2>
      <button type="button" className="quest-close" data-pad-back aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {line && <div aria-live="polite" data-line={line.key}><PhotoPhrase sentence={line.sentence} /></div>}
    {choices.length > 0 && <div className="photo-choices">
      {choices.map(({ key, sentence }) => <button key={key} data-line={key} type="button" className="btn soft" onClick={() => act("choose", key)}>
        <GlossLine sentence={sentence} gloss compact />
      </button>)}
      <div className="photo-quiz-mic"><PhotoMic finale />{mic.heard && <span lang={TL}>{mic.heard}</span>}<PhraseChooser entries={entries} targetOnly={false} /></div>
      {mic.status === "unclear" && <p role="status">{L(words.wrong)}</p>}
    </div>}
  </section>;
}

export function PhotoWalkOverlay() {
  const screen = useTownQuests((s) => s.screen);
  if (!screen) return null;
  return <div className="photo-backdrop">
    {screen === "book" ? <PhotoBook /> : screen === "quiz" ? <PhotoQuiz /> : <PhotoFinale />}
  </div>;
}

function DirectionLines({ place }: { place: Destination }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  return <div className="direction-lines">
    {place.lines.map((key) => {
      const sentence = conversationLine(ASK_WAY_SITUATION, ASK_WAY_NPC, key, ASK_WAY_LINES, false);
      const gloss = revealed.includes(key);
      return sentence && <div className="phrase-save-row" key={key}>
        <button type="button" data-line={key} aria-expanded={gloss}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}
          onClick={() => setRevealed((ids) => gloss ? ids.filter((id) => id !== key) : [...ids, key])}>
          <GlossLine sentence={sentence} gloss={gloss} compact />
        </button>
        <PhraseSave sentence={sentence} {...directionSource} />
      </div>;
    })}
  </div>;
}

export function DirectionsCard() {
  const place = useTownQuests((s) => s.directions);
  const replaying = useTownQuests((s) => s.replaying);
  if (!place) return null;
  const action = (name: string) => game?.modeAction("directions", name);
  return <section className="directions-card" aria-label={L(directions.card)} data-destination={place.id}>
    <header>
      <Icon name="pin" size={19} />
      <div><h2>{L(directions.card)}</h2><p>{L(directions.to, { place: LOCATIONS[place.location].lt })}</p></div>
      <button type="button" className="quest-close" aria-label={L(directions.close)} onClick={() => action("close")}><Icon name="close" size={19} /></button>
    </header>
    <DirectionLines key={place.id} place={place} />
    <footer>
      <button type="button" className="btn ghost small" disabled={replaying} onClick={() => action("replay")}><Icon name="speaker" size={15} />{L(directions.replay)}</button>
      <button type="button" className="btn small" onClick={() => action("guide")}><Icon name="walk" size={15} />{L(directions.guide)}</button>
    </footer>
  </section>;
}
