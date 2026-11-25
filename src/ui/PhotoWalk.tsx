import { useState } from "react";
import { ASK_WAY_LINES, ASK_WAY_NPC, ASK_WAY_SITUATION, ASK_WAY_UI as directions } from "../content/ask-way-lines";
import { LOCATIONS } from "../content/locations";
import { PHOTO_THINGS, PHOTO_WALK_LINES, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_WALK_UI as words } from "../content/photo-walk-lines";
import { TAXI_UI } from "../content/taxi";
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
import { PhraseSave } from "./kit/PhraseSave";
import "./townQuests.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("photowalk", name, value);
const openBook = () => game?.modeStart("photowalk", "book");
const photoSource = { situationId: PHOTO_WALK_SITUATION };
const photoLine = (key: string) => conversationLine(PHOTO_WALK_SITUATION, PHOTO_WALK_NPC, key, PHOTO_WALK_LINES, false)!;
const useWalk = () => useStore((s) => s.progress.photoWalk ?? EMPTY_WALK);

export function PhotoChip() {
  const camera = useTownQuests((s) => s.camera);
  const near = useTownQuests((s) => s.near);
  const { found } = useWalk();
  if (!camera) return null;
  return <button type="button" className="photo-chip" data-pad-aux data-near={near ?? undefined} aria-label={near ? words.shoot : words.open}
    title={near ? words.shoot : words.open} onClick={() => game?.modeStart("photowalk", "camera")}>
    <span><Icon name="camera" size={18} />{found.length}/{PHOTO_THINGS.length}</span>
    {near && <small>{words.shoot}</small>}
  </button>;
}

export function PhotoBookContact({ close }: { close(): void }) {
  const { status, found } = useWalk();
  const light = useStore((s) => s.settings.play === "light");
  if (light || (status !== "paused" && status !== "found" && status !== "done")) return null;
  return <button type="button" className="contact photo-contact" onClick={() => { close(); openBook(); }}>
    <span className="avatar"><Icon name="camera" size={21} /></span>
    <span className="txt"><b>{words.phone}</b><span>{found.length}/{PHOTO_THINGS.length}</span></span>
  </button>;
}

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
      ? <div className="phrase-save-row"><GlossLine sentence={name} gloss compact /><PhraseSave sentence={name} situationId={PHOTO_WALK_SITUATION} iconOnly /></div>
      : <>
        <span lang="lt">{name.nat}</span>
        <button type="button" className="btn ghost small" aria-expanded={showNote} onClick={() => setShowNote((value) => !value)}>{words.where}</button>
        {showNote && <PhotoPhrase sentence={photoLine(`pw_w_${thing.id}`)} />}
      </>}
  </li>;
}

function PhotoPhrase({ sentence, lineKey }: { sentence: ReturnType<typeof photoLine>; lineKey?: string }) {
  return <div className="phrase-save-row" data-line={lineKey}>
    <GlossLine sentence={sentence} gloss source={photoSource} />
    <PhraseSave sentence={sentence} {...photoSource} iconOnly />
  </div>;
}

function PhotoBook() {
  const { status, found } = useWalk();
  const { visit, line } = useTownQuests();
  const [confirm, setConfirm] = useState(false);
  const title = status === "done" ? words.done : words.book;
  return <section className="photo-sheet photo-book" data-pad-scope="photo" role="dialog" aria-modal="true" aria-label={title}>
    <img className="photo-book-cover" src={`${import.meta.env.BASE_URL}photowalk/cover.webp`} alt="" aria-hidden
      onError={(e) => { e.currentTarget.hidden = true; }} />
    <header>
      <Icon name="camera" size={23} />
      <div><h2>{title}</h2><p>{words.found(found.length, PHOTO_THINGS.length)}</p></div>
      <button type="button" className="quest-close" data-pad-back aria-label={words.close} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {visit && line && <div className="photo-visit"><PhotoPhrase sentence={line.sentence} lineKey={line.key} /></div>}
    <ol className="photo-pages">
      {PHOTO_THINGS.map((thing) => <PhotoPage key={thing.id} thing={thing} found={found.includes(thing.id)} />)}
    </ol>
    <footer data-pad-scope={confirm ? "photo-confirm" : undefined}>
      {confirm ? <>
        <div className="photo-confirm">{words.quitAsk}</div>
        <button className="btn small" type="button" onClick={() => act("quit")}>{words.quitYes}</button>
        <button className="btn soft small" data-pad-default data-pad-back type="button" onClick={() => setConfirm(false)}>{words.quitNo}</button>
      </> : <>
        {status === "on" && <button className="btn soft small" type="button" onClick={() => act("pause")}>{words.pause}</button>}
        {status === "paused" && <button className="btn small" type="button" onClick={() => act("resume")}>{words.resume}</button>}
        {status !== "done" && <button className="btn ghost small" type="button" onClick={() => setConfirm(true)}>{words.quit}</button>}
        <button className="btn ghost small" type="button" onClick={() => game?.modeExit()}>{words.close}</button>
      </>}
    </footer>
  </section>;
}

function PhotoMic({ finale = false }: { finale?: boolean }) {
  const mic = useTownQuests((s) => s.mic);
  if (!speechSupported()) return null;
  const listening = mic.status === "starting" || mic.status === "listening";
  return <button type="button" className={`mic${listening ? " listening" : ""}`} aria-label={listening ? TAXI_UI.micOff : TAXI_UI.micOn}
    aria-pressed={listening} onClick={() => act("mic", finale ? !listening : undefined)}><Icon name="mic" size={23} /></button>;
}

function PhotoQuiz() {
  const { quiz, line, mic } = useTownQuests();
  if (!quiz) return null;
  const title = quiz.got ? words.got : words.whatIsIt;
  const pick = (id: PhotoThingId) => act("pick", id);
  return <>
    <div className="photo-flash" aria-hidden />
    <section className="photo-sheet photo-quiz" data-pad-scope="photo" data-pad-phase={quiz.got ? "found" : "quiz"} role="dialog" aria-modal="true" aria-label={title} data-thing={quiz.id}>
      <header>
        {!quiz.got && quiz.jpeg && <img className="photo-quiz-preview" src={quiz.jpeg} alt="" width={160} height={120} />}
        {quiz.got && <Icon name="sparkles" className="quest-sparkle" size={23} />}
        <div aria-live="polite"><h2>{title}</h2>{!quiz.got && <p>{words.sayOrPick}</p>}</div>
        <button type="button" className="quest-close" data-pad-back aria-label={words.close} onClick={() => game?.modeExit()}><Icon name="close" /></button>
      </header>
      {quiz.got ? <>
        {line && <PhotoPhrase sentence={line.sentence} lineKey={line.key} />}
        <button type="button" className="btn small" onClick={() => act("book")}>{words.open}</button>
      </> : <>
        <div className="photo-choices">
          {quiz.choices.map((id) => {
            const sentence = photoLine(`pw_n_${id}`);
            return <div className="phrase-save-row" key={id}>
              <button type="button" className="btn soft" data-choice={id} lang="en"
                disabled={quiz.misses.includes(id)} onClick={() => pick(id)}>{sentence.en}</button>
              <PhraseSave sentence={sentence} situationId={PHOTO_WALK_SITUATION} iconOnly />
            </div>;
          })}
        </div>
        <div className="photo-quiz-mic"><PhotoMic />{mic.heard && <span lang="en">{mic.heard}</span>}</div>
        {quiz.wrong && <p role="status">{words.wrong}</p>}
      </>}
    </section>
  </>;
}

function PhotoFinale() {
  const { line, choices, mic } = useTownQuests();
  return <section className="photo-sheet photo-finale" data-pad-scope="photo" role="dialog" aria-modal="true" aria-label={words.book}>
    <header>
      <h2>{words.book}</h2>
      <button type="button" className="quest-close" data-pad-back aria-label={words.close} onClick={() => game?.modeExit()}><Icon name="close" /></button>
    </header>
    {line && <div aria-live="polite"><PhotoPhrase sentence={line.sentence} lineKey={line.key} /></div>}
    {choices.length > 0 && <div className="photo-choices">
      {choices.map(({ key, sentence }) => <div className="phrase-save-row" key={key}>
        <button data-line={key} type="button" className="btn soft" onClick={() => act("choose", key)}>
          <GlossLine sentence={sentence} gloss compact />
        </button>
        <PhraseSave sentence={sentence} situationId={PHOTO_WALK_SITUATION} iconOnly />
      </div>)}
      <div className="photo-quiz-mic"><PhotoMic finale />{mic.heard && <span lang="en">{mic.heard}</span>}</div>
      {mic.status === "unclear" && <p role="status">{words.wrong}</p>}
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
          onClick={() => setRevealed((ids) => gloss ? ids.filter((id) => id !== key) : [...ids, key])}>
          <GlossLine sentence={sentence} gloss={gloss} compact />
        </button>
        <PhraseSave sentence={sentence} situationId={ASK_WAY_SITUATION} iconOnly />
      </div>;
    })}
  </div>;
}

export function DirectionsCard() {
  const place = useTownQuests((s) => s.directions);
  const replaying = useTownQuests((s) => s.replaying);
  if (!place) return null;
  const action = (name: string) => game?.modeAction("directions", name);
  return <section className="directions-card" data-pad-aux aria-label={directions.card} data-destination={place.id}>
    <header>
      <Icon name="pin" size={19} />
      <div><h2>{directions.card}</h2><p>{directions.to(LOCATIONS[place.location].lt)}</p></div>
      <button type="button" className="quest-close" aria-label={directions.close} onClick={() => action("close")}><Icon name="close" size={19} /></button>
    </header>
    <DirectionLines key={place.id} place={place} />
    <footer>
      <button type="button" className="btn ghost small" disabled={replaying} onClick={() => action("replay")}><Icon name="speaker" size={15} />{directions.replay}</button>
      <button type="button" className="btn small" onClick={() => action("guide")}><Icon name="walk" size={15} />{directions.guide}</button>
    </footer>
  </section>;
}

export function QuestArrival() {
  const arrival = useTownQuests((s) => s.arrival);
  return arrival > 0 ? <Icon key={arrival} name="sparkles" className="quest-arrival quest-sparkle" size={32} /> : null;
}
