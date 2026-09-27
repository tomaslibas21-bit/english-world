// „Mano kortelės“: the word popover of interlinear sentences (tap a word → save it, or the whole
// sentence, as a flashcard) and the cards tab of the phrasebook (the list, and a short review:
// the Lithuanian first, try to say it, then reveal the English). Store and schedule: state/cards.ts.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Sentence } from "../convo/compose";
import { useStore } from "../state/store";
import { useCards, unitInput, sentenceInput, cardKey, cleanText, isDashGloss, dueCards, daysUntil, nextDue, exportCardsJSON, type Card } from "../state/cards";
import { NPCS, COACH_VOICE } from "../content/npcs";
import { SITUATION_BY_ID } from "../content/situations";
import { audio } from "../game/audio";
import { Icon } from "./icons";
import { ltCount } from "./lt";
import "./cards.css";

// ---------------------------------------------------------------------------------------------
// glyphs the icon set doesn't have, drawn the same way (24×24, 1.75 stroke, round caps, soft fills)

type GlyphPart = string | { d: string };
const GLYPHS = {
  plus: ["M12 5.75v12.5", "M5.75 12h12.5"],
  trash: [{ d: "M6.25 7.25l.85 11.9a1.75 1.75 0 0 0 1.75 1.6h6.3a1.75 1.75 0 0 0 1.75-1.6l.85-11.9z" }, "M4.5 7.25h15",
    "M9.5 7.25v-2c0-.7.55-1.25 1.25-1.25h2.5c.7 0 1.25.55 1.25 1.25v2", "M10.25 11v5.5", "M13.75 11v5.5"],
  cards: [{ d: "M3.75 9.5a2 2 0 0 1 2-2h9.25a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2z" },
    "M7 5.5a2 2 0 0 1 2-2h9.25a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2", "M7 12.25h6.75", "M7 15.75h4.25"],
  download: ["M12 4v11", "M7.5 10.75 12 15.25l4.5-4.5", "M5 19.75h14"],
} satisfies Record<string, GlyphPart[]>;

export function Glyph({ name, size = 18 }: { name: keyof typeof GLYPHS; size?: number | string }) {
  return (
    <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {(GLYPHS[name] as GlyphPart[]).map((p, i) => typeof p === "string" ? <path key={i} d={p} />
        : <path key={i} d={p.d} className="i-soft" fill="currentColor" fillOpacity={0.16} />)}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// the word popover

let NAMES: Set<string> | null = null;
/** Words whose capital isn't just the start of a sentence: people's names (and the player's). */
function keepCaps(word: string): boolean {
  if (!NAMES) {
    NAMES = new Set();
    for (const n of Object.values(NPCS)) for (const w of n.name.split(/\s+/)) NAMES.add(w.replace(/\.$/, "").toLowerCase());
  }
  const w = word.toLowerCase(), p = useStore.getState().progress.profile;
  return NAMES.has(w) || (!!p && (w === p.name.trim().toLowerCase() || w === p.surname.trim().toLowerCase()));
}

interface Spot { left: number; top: number; below: boolean; arrow: number }

/** Below the word (above it for words low on the screen, when it fits there); inside the window. */
function place(r: DOMRect, w: number, h: number): Spot {
  const m = 8, gap = 9, vw = window.innerWidth, vh = window.innerHeight;
  const cx = r.left + r.width / 2;
  const left = Math.round(Math.max(m, Math.min(vw - m - w, cx - w / 2)));
  const fitsBelow = r.bottom + gap + h <= vh - m, fitsAbove = r.top - gap - h >= m;
  const below = fitsBelow ? r.bottom < vh * 0.7 || !fitsAbove : !fitsAbove;
  const top = Math.round(below ? Math.min(r.bottom + gap, vh - m - h) : r.top - gap - h);
  return { left, top, below, arrow: Math.round(Math.max(16, Math.min(w - 16, cx - left))) };
}

/** Is the word still visible (not scrolled out of the transcript or the hints)? */
function inView(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return false;
  let top = 0, bottom = window.innerHeight, left = 0, right = window.innerWidth;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const pr = p.getBoundingClientRect();
    top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); left = Math.max(left, pr.left); right = Math.min(right, pr.right);
  }
  const y = r.top + Math.min(r.height, 28) / 2; // the English word's line
  return y >= top && y <= bottom && r.right > left && r.left < right;
}

/** What a tapped word offers: the word with its Lithuanian, „+ Į korteles“ and „+ Visą sakinį“
 *  (only the sentence for words glossed "—"). Closes on an outside tap, Esc, or when the word
 *  scrolls away. */
export function WordPopover({ s, index, anchor, onClose }: { s: Sentence; index: number; anchor: HTMLElement; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const keys = useCards((c) => c.keys);
  const sitId = useStore((st) => st.conv.sitId);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [saved, setSaved] = useState(false);
  const u = s.units[index];
  const word = useMemo(() => unitInput(s, index, sitId, keepCaps), [s, index, sitId]);
  const whole = useMemo(() => sentenceInput(s, sitId), [s, sitId]);
  const dash = !u || isDashGloss(u.lt) || !word;

  // follow the word (scrolling, new lines, the LT/IPA toggles), close when it's gone
  useLayoutEffect(() => {
    let raf = 0, last = "";
    const tick = () => {
      const el = ref.current;
      if (!el) return;
      const r = anchor.getBoundingClientRect();
      const sig = [r.left, r.top, r.width, r.height, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight].join("|");
      if (sig !== last) {
        last = sig;
        if (!inView(anchor)) { closeRef.current(); return; }
        setSpot(place(r, el.offsetWidth, el.offsetHeight));
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [anchor]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return; // the word itself toggles
      closeRef.current();
    };
    // capture, so Esc closes only the popover (not the conversation)
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeRef.current(); } };
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, [anchor]);

  if (!u) return null;
  const add = (x: typeof whole | null) => { if (x && useCards.getState().add(x)) setSaved(true); };
  const wordIn = !!word && keys.has(cardKey(word.en));
  const sentIn = keys.has(cardKey(whole.en));
  const shown = word?.en ?? cleanText(u.en);
  return createPortal(
    <div ref={ref} className={"wpop" + (spot && !spot.below ? " above" : "")} role="dialog" aria-label={`Žodis „${shown}“`}
      style={(spot ? { left: spot.left, top: spot.top, "--arrow": spot.arrow + "px" } : { left: 0, top: 0, visibility: "hidden" }) as CSSProperties}>
      <div className="wpop-en" lang="en">{shown}</div>
      {dash ? <div className="wpop-none">Atskirai neverčiama – išsaugok visą sakinį.</div> : <div className="wpop-lt" lang="lt">{word.lt}</div>}
      {!dash && word.ipa && <div className="wpop-ipa">{word.ipa}</div>}
      <div className="wpop-acts">
        {!dash && (wordIn
          ? <span className="wpop-in"><Icon name="check" size={16} strokeWidth={2.25} /> Kortelėse</span>
          : <button className="btn small" onClick={() => add(word)}><Glyph name="plus" size={16} /> Į korteles</button>)}
        {sentIn
          ? <span className="wpop-in"><Icon name="check" size={16} strokeWidth={2.25} /> Sakinys kortelėse</span>
          : <button className={"btn small" + (dash ? "" : " soft")} onClick={() => add(whole)}><Glyph name="plus" size={16} /> Visą sakinį</button>}
      </div>
      {saved && <div className="wpop-hint">Kortelę rasi „Frazių knygelėje“.</div>}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------------------------
// the cards tab

const ROUND = 20;

function whenLt(days: number): string {
  return days <= 0 ? "šiandien" : days === 1 ? "rytoj" : days === 2 ? "poryt" : `po ${days} d.`;
}

const listen = (text: string) => { audio.play(COACH_VOICE, 1, text); };
const cardSay = (c: Card) => (c.en === c.sentence.en && c.sentence.say ? c.sentence.say : c.en);

function Pips({ box }: { box: number }) {
  return (
    <span className="cd-pips" role="img" aria-label={`Lygis ${box} iš 5`} title={`Lygis ${box} iš 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= box ? "on" : ""} />)}
    </span>
  );
}

function download(name: string, text: string) {
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { /* nothing to do: the browser blocked it */ }
}

/** „Mano kortelės“: today's review, then every saved card (newest first). */
export function MyCards() {
  const cards = useCards((c) => c.cards);
  const [round, setRound] = useState<{ n: number; ids: string[] } | null>(null);
  const now = Date.now();
  const due = dueCards(cards, now);
  const start = () => setRound((r) => ({ n: (r?.n ?? 0) + 1, ids: dueCards(useCards.getState().cards, Date.now()).slice(0, ROUND).map((c) => c.id) }));
  if (round) return <Review key={round.n} ids={round.ids} onExit={() => setRound(null)} onMore={start} />;

  if (!cards.length) {
    return (
      <div className="cards-empty">
        <span className="cards-empty-ico"><Glyph name="cards" size={30} /></span>
        <b>Kol kas kortelių nėra</b>
        <p>Pokalbyje paspausk anglišką žodį – pamatysi jo vertimą ir galėsi išsaugoti jį ar visą sakinį. Frazes iš knygelės pridėsi mygtuku <span className="cards-plus"><Glyph name="plus" size="1em" /></span>.</p>
      </div>
    );
  }
  const next = nextDue(cards, now);
  const list = [...cards].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="my-cards">
      <div className={"cards-hero" + (due.length ? "" : " done")}>
        <span className="hero-ico">{due.length ? <Glyph name="cards" size={26} /> : <Icon name="checkCircle" size={26} />}</span>
        <div className="hero-txt">
          {due.length ? (
            <><b>Šiandien kartoti: {due.length}</b><span>Pamatysi lietuviškai – pasakyk angliškai ir pasitikrink.</span></>
          ) : (
            <><b>Šiandien viskas pakartota!</b><span>{next ? `Kitos kortelės laukia ${whenLt(daysUntil(next, now))}.` : "Puikiai sekasi."}</span></>
          )}
        </div>
        {due.length > 0 && <button className="btn" onClick={start}><Icon name="play" size={15} /> Kartoti</button>}
      </div>
      <h3 className="cards-h">Visos kortelės · {cards.length}</h3>
      <div className="cd-list">{list.map((c) => <CardRow key={c.id} c={c} now={now} />)}</div>
      <button className="cards-export" onClick={() => download("english-world-korteles.json", exportCardsJSON(useCards.getState().cards))}>
        <Glyph name="download" size={16} /> Atsisiųsti korteles (JSON)
      </button>
    </div>
  );
}

function CardRow({ c, now }: { c: Card; now: number }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 4000); return () => clearTimeout(t); }, [confirm]);
  const days = daysUntil(c.due, now);
  return (
    <div className="cd-row">
      <div className="cd-txt">
        <div className="cd-en" lang="en">{c.en}</div>
        <div className="cd-lt" lang="lt">{c.lt}</div>
      </div>
      <div className="cd-meta">
        <Pips box={c.box} />
        <span className={"cd-when" + (days <= 0 ? " now" : "")}>{whenLt(days)}</span>
      </div>
      <button className="cd-btn" onClick={() => listen(cardSay(c))} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={19} /></button>
      {confirm
        ? <button className="cd-btn del sure" onClick={() => useCards.getState().remove(c.id)} aria-label="Taip, ištrinti">Ištrinti?</button>
        : <button className="cd-btn del" onClick={() => setConfirm(true)} title="Ištrinti kortelę" aria-label="Ištrinti kortelę"><Glyph name="trash" size={19} /></button>}
    </div>
  );
}

/** The English of the source sentence with the card's words marked. */
function marked(sentence: string, part: string): ReactNode {
  const i = part ? sentence.toLowerCase().indexOf(part.toLowerCase()) : -1;
  if (i < 0) return sentence;
  return <>{sentence.slice(0, i)}<mark>{sentence.slice(i, i + part.length)}</mark>{sentence.slice(i + part.length)}</>;
}

/** One round: the Lithuanian → try to say it → reveal → „Mokėjau“ (box up) or „Dar kartą“ (box 1;
 *  seen again at the end of the round, which doesn't change its schedule again). */
function Review({ ids, onExit, onMore }: { ids: string[]; onExit: () => void; onMore: () => void }) {
  const cards = useCards((c) => c.cards);
  const [queue, setQueue] = useState(ids);
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [stats, setStats] = useState({ knew: 0, again: 0 });
  const failed = useRef(new Set<string>());
  const repeats = useRef(new Map<string, number>());
  const handled = useRef(-1);
  const focusRef = useRef<HTMLButtonElement>(null);
  const byId = new Map(cards.map((c) => [c.id, c]));
  let p = pos;
  while (p < queue.length && !byId.has(queue[p])) p++; // deleted meanwhile (another tab)
  const card = p < queue.length ? byId.get(queue[p])! : null;
  useEffect(() => { focusRef.current?.focus({ preventScroll: true }); }, [p, shown]);

  const answer = (knew: boolean) => {
    if (!card || handled.current === p) return; // a double tap answers once
    handled.current = p;
    const id = card.id;
    if (!failed.current.has(id)) {
      useCards.getState().answer(id, knew);
      setStats((s) => (knew ? { ...s, knew: s.knew + 1 } : { ...s, again: s.again + 1 }));
      if (!knew) failed.current.add(id);
    }
    const n = repeats.current.get(id) ?? 0;
    if (!knew && n < 2) { repeats.current.set(id, n + 1); setQueue((q) => [...q, id]); }
    setShown(false);
    setPos(p + 1);
  };

  if (!card) {
    const done = stats.knew + stats.again;
    const more = dueCards(cards, Date.now()).length;
    return (
      <div className="rv-done">
        <div className="rv-badge"><Icon name="check" size={30} strokeWidth={2.5} /></div>
        <b>{more ? "Puiku!" : "Šiandien viskas!"}</b>
        <p>Pakartojai {done} {ltCount(done, "kortelę", "korteles", "kortelių")}.{done > 0 && <> Mokėjai – {stats.knew}, dar kartą – {stats.again}.</>}</p>
        <div className="rv-done-acts">
          {more > 0 && <button className="btn" onClick={onMore} ref={focusRef}><Icon name="play" size={15} /> Kartoti dar ({more})</button>}
          <button className={"btn " + (more ? "ghost" : "soft")} onClick={onExit} ref={more ? undefined : focusRef}>Grįžti į korteles</button>
        </div>
      </div>
    );
  }

  const sit = SITUATION_BY_ID[card.situationId];
  const isSentence = cardKey(card.en) === cardKey(card.sentence.en);
  const long = card.lt.length > 42 || card.en.length > 42;
  return (
    <div className="review">
      <div className="rv-top">
        <button className="btn ghost small" onClick={onExit}><Icon name="arrowLeft" size={16} /> Baigti</button>
        <div className="rv-progress" aria-hidden><i style={{ width: `${(p / queue.length) * 100}%` }} /></div>
        <span className="rv-count" aria-label={`Kortelė ${p + 1} iš ${queue.length}`}>{p + 1}/{queue.length}</span>
      </div>
      <div className={"rv-card" + (shown ? " shown" : "") + (long ? " long" : "")} onClick={() => !shown && setShown(true)}>
        <div className="rv-label">Pasakyk angliškai{sit ? <span className="rv-sit"> · {sit.title.lt}</span> : null}</div>
        <div className="rv-lt" lang="lt">{card.lt}</div>
        {shown ? (
          <div className="rv-answer">
            <div className="rv-en-row">
              <span className="rv-en" lang="en">{card.en}</span>
              <button className="rv-play" onClick={(e) => { e.stopPropagation(); listen(cardSay(card)); }} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={21} /></button>
            </div>
            {card.ipa && <div className="rv-ipa">{card.ipa}</div>}
            {!isSentence && (
              <div className="rv-src">
                <div className="rv-src-en" lang="en">{marked(card.sentence.en, card.en)}</div>
                <div className="rv-src-lt" lang="lt">{card.sentence.lt}</div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn soft rv-reveal" ref={focusRef} onClick={(e) => { e.stopPropagation(); setShown(true); }}>Rodyti atsakymą</button>
        )}
      </div>
      {shown && (
        <div className="rv-acts">
          <button className="btn ghost" onClick={() => answer(false)}><Icon name="restart" size={17} /> Dar kartą</button>
          <button className="btn" onClick={() => answer(true)} ref={focusRef}><Icon name="check" size={17} strokeWidth={2.25} /> Mokėjau</button>
        </div>
      )}
    </div>
  );
}
