import { useState } from "react";
import { ASK_WAY_LINES, ASK_WAY_NPC, ASK_WAY_SITUATION, ASK_WAY_UI as directions } from "../content/ask-way-lines";
import { LOCATIONS } from "../content/locations";
import { PHOTO_THINGS, PHOTO_WALK_LINES, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_WALK_UI as words } from "../content/photo-walk-lines";
import { HL, L, TL } from "./i18n";
import { STRINGS } from "./strings";
import type { PhotoThingId } from "../content/townQuests";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { conversationLine } from "../game/kit/lines";
import { readPhoto } from "../game/photowalk/photos";
import { EMPTY_WALK } from "../game/photowalk/state";
import { useTownQuests, type Destination } from "../game/photowalk/store";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import "./townQuests.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("photowalk", name, value);
const openBook = () => game?.modeStart?.("photowalk", "book");
const photoSource = { situationId: PHOTO_WALK_SITUATION };
const photoLine = (key: string) => conversationLine(PHOTO_WALK_SITUATION, PHOTO_WALK_NPC, key, PHOTO_WALK_LINES, false)!;
const stopLabel = STRINGS[`photowalk:${words.quit}`] ?? L(words.quit);
const useWalk = () => useStore((s) => s.progress.photoWalk ?? EMPTY_WALK);

export function PhotoChip() {
  const camera = useTownQuests((s) => s.camera);
  const near = useTownQuests((s) => s.near);
  const { found } = useWalk();
  if (!camera) return null;
  return <button type="button" className="photo-chip" data-near={near ?? undefined} aria-label={near ? L(words.shoot) : L(words.open)}
    title={near ? L(words.shoot) : L(words.open)} onClick={() => game?.modeStart?.("photowalk", "camera")}>
    <span><Icon name="camera" size={18} />{found.length}/{PHOTO_THINGS.length}</span>
    {near && <small>{L(words.shoot)}</small>}
  </button>;
}

export function PhotoBookContact({ close }: { close(): void }) {
  const { status, found } = useWalk();
  const light = useStore((s) => s.settings.play === "light");
  if (light || (status !== "paused" && status !== "found" && status !== "done")) return null;
  return <button type="button" className="contact photo-contact" onClick={() => { close(); openBook(); }}>
    <span className="avatar"><Icon name="camera" size={21} /></span>
    <span className="txt"><b>{L(words.phone)}</b><span>{found.length}/{PHOTO_THINGS.length}</span></span>
  </button>;
}

function PhotoPage({ thing, found }: { thing: typeof PHOTO_THINGS[number]; found: boolean }) {
  const [showNote, setShowNote] = useState(false);
  const name = photoLine(`pw_n_${thing.id}`);
  const photo = found ? readPhoto(thing.id) : null;
  return <li className="photo-page" data-thing={thing.id} data-found={found}>
    {photo ? <img src={photo} alt="" width={160} height={120} /> : <span className="photo-placeholder" aria-hidden>{thing.icon}</span>}
    {found
      ? <GlossLine sentence={name} gloss compact />
      : <>
        <span lang={HL}>{name.nat}</span>
        <button type="button" className="btn ghost small" aria-expanded={showNote} onClick={() => setShowNote((value) => !value)}>{L(words.where)}</button>
        {showNote && <GlossLine sentence={photoLine(`pw_w_${thing.id}`)} gloss source={photoSource} />}
      </>}
  </li>;
}

function PhotoBook() {
  const { status, found } = useWalk();
  const { visit, line } = useTownQuests();
  const [confirm, setConfirm] = useState(false);
  const title = status === "done" ? L(words.done) : L(words.book);
  return <section className="photo-sheet photo-book" role="dialog" aria-modal="true" aria-label={title}>
    <header>
      <Icon name="camera" size={23} />
      <div><h2>{title}</h2><p>{L(words.found, { n: found.length, of: PHOTO_THINGS.length })}</p></div>
      <button type="button" className="quest-close" aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {visit && line && <div className="photo-visit" data-line={line.key}><GlossLine sentence={line.sentence} gloss source={photoSource} /></div>}
    <ol className="photo-pages">
      {PHOTO_THINGS.map((thing) => <PhotoPage key={thing.id} thing={thing} found={found.includes(thing.id)} />)}
    </ol>
    <footer>
      {confirm ? <>
        <div className="photo-confirm">{L(words.quitAsk)}</div>
        <button className="btn small" type="button" onClick={() => act("quit")}>{stopLabel}</button>
        <button className="btn soft small" type="button" onClick={() => setConfirm(false)}>{L(words.quitNo)}</button>
      </> : <>
        {status === "on" && <button className="btn soft small" type="button" onClick={() => act("pause")}>{L(words.pause)}</button>}
        {status === "paused" && <button className="btn small" type="button" onClick={() => act("resume")}>{L(words.resume)}</button>}
        {status !== "done" && <button className="btn ghost small" type="button" onClick={() => setConfirm(true)}>{stopLabel}</button>}
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
  if (!quiz) return null;
  const title = quiz.got ? L(words.got) : L(words.whatIsIt);
  const pick = (id: PhotoThingId) => act("pick", id);
  return <>
    <div className="photo-flash" aria-hidden />
    <section className="photo-sheet photo-quiz" role="dialog" aria-modal="true" aria-label={title} data-thing={quiz.id}>
      <header>
        {quiz.got && <Icon name="sparkles" className="quest-sparkle" size={23} />}
        {!quiz.got && quiz.jpeg && <img className="photo-preview" src={quiz.jpeg} alt="" width={160} height={120} />}
        <div aria-live="polite"><h2>{title}</h2>{!quiz.got && <p>{L(words.sayOrPick)}</p>}</div>
        <button type="button" className="quest-close" aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
      </header>
      {quiz.got ? <>
        {line && <div data-line={line.key}><GlossLine sentence={line.sentence} gloss source={photoSource} /></div>}
        <button type="button" className="btn small" onClick={() => act("book")}>{L(words.open)}</button>
      </> : <>
        <div className="photo-choices">
          {quiz.choices.map((id) => <button type="button" className="btn soft" key={id} data-choice={id} lang={TL}
            disabled={quiz.misses.includes(id)} onClick={() => pick(id)}>{photoLine(`pw_n_${id}`).en}</button>)}
        </div>
        <div className="photo-quiz-mic"><PhotoMic />{mic.heard && <span lang={TL}>{mic.heard}</span>}</div>
        {quiz.wrong && <p role="status">{L(words.wrong)}</p>}
      </>}
    </section>
  </>;
}

function PhotoFinale() {
  const { line, choices, mic } = useTownQuests();
  return <section className="photo-sheet photo-finale" role="dialog" aria-modal="true" aria-label={L(words.book)}>
    <header>
      <h2>{L(words.book)}</h2>
      <button type="button" className="quest-close" aria-label={L(words.close)} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {line && <div aria-live="polite" data-line={line.key}><GlossLine sentence={line.sentence} gloss source={photoSource} /></div>}
    {choices.length > 0 && <div className="photo-choices">
      {choices.map(({ key, sentence }) => <button key={key} data-line={key} type="button" className="btn soft" onClick={() => act("choose", key)}>
        <GlossLine sentence={sentence} gloss compact />
      </button>)}
      <div className="photo-quiz-mic"><PhotoMic finale />{mic.heard && <span lang={TL}>{mic.heard}</span>}</div>
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
      return sentence && <button key={key} type="button" data-line={key} aria-expanded={gloss}
        onClick={() => setRevealed((ids) => gloss ? ids.filter((id) => id !== key) : [...ids, key])}>
        <GlossLine sentence={sentence} gloss={gloss} compact />
      </button>;
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
      <button type="button" className="btn soft small" onClick={() => action("guide")}><Icon name="walk" size={15} />{L(directions.guide)}</button>
    </footer>
  </section>;
}

export function QuestArrival() {
  const arrival = useTownQuests((s) => s.arrival);
  return arrival > 0 ? <Icon key={arrival} name="sparkles" className="quest-arrival quest-sparkle" size={32} /> : null;
}
