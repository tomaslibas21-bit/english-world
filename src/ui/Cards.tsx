// „Mano kortelės“: the word popover of interlinear sentences (tap a word → save it, or the whole
// sentence, as a flashcard) and the cards tab of the phrasebook (the list, and a short review:
// the Lithuanian first, try to say it, then reveal the English). Store and schedule: state/cards.ts.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Sentence } from "../convo/compose";
import { useStore } from "../state/store";
import { useCards, unitInput, sentenceInput, cardKey, cleanText, isDashGloss, dueCards, daysUntil, nextDue, exportCardsJSON, type Card } from "../state/cards";
import { NPCS } from "../content/npcs";
import { coachVoice } from "../content/voices";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { SitIcon } from "./SitIcon";
import { audio } from "../game/audio";
import { Icon } from "./icons";
import { ltCount } from "./lt";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import { placeTip, type Box, type TipSpot } from "./natTip";
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

/** Below the word (above it for words low on the screen, when it fits there); inside the window. */
function place(r: DOMRect, w: number, h: number): TipSpot {
  const m = 8, gap = 9, vw = window.innerWidth, vh = window.innerHeight;
  const cx = r.left + r.width / 2;
  const left = Math.round(Math.max(m, Math.min(vw - m - w, cx - w / 2)));
  const fitsBelow = r.bottom + gap + h <= vh - m, fitsAbove = r.top - gap - h >= m;
  const below = fitsBelow ? r.bottom < vh * 0.7 || !fitsAbove : !fitsAbove;
  const top = Math.round(below ? Math.min(r.bottom + gap, vh - m - h) : r.top - gap - h);
  return { left, top, below, arrow: Math.round(Math.max(16, Math.min(w - 16, cx - left))) };
}

/** Is the word still visible (not scrolled out of the transcript or the hints)? Also the asterisk's tooltip
 *  (Interlinear.tsx NatTip). */
export function inView(el: HTMLElement, bounds?: Box): boolean {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return false;
  let top = bounds?.top ?? 0, bottom = bounds?.bottom ?? window.innerHeight;
  let left = bounds?.left ?? 0, right = bounds?.right ?? window.innerWidth;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const pr = p.getBoundingClientRect();
    top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); left = Math.max(left, pr.left); right = Math.min(right, pr.right);
  }
  const y = r.top + Math.min(r.height, 28) / 2; // the target word's line
  return y >= top && y <= bottom && r.right > left && r.left < right;
}

/** Follow an open portal with the page's layout and scroll events. Write geometry directly so smooth
 *  scrolling doesn't rerender the word or tooltip. */
export function trackPopover(anchor: HTMLElement, popup: HTMLElement, onClose: () => void, flipClass: "above" | "below",
  placeInViewport: (r: DOMRect, w: number, h: number) => TipSpot) {
  const panel = anchor.closest(".convo");
  const viewport = window.visualViewport;
  const inset = 8, gap = flipClass === "above" ? 9 : 8;
  let frame = 0, maxWidth = 0, maxHeight = 0;
  let previous: TipSpot | undefined;
  popup.toggleAttribute("data-in-convo", !!panel);

  const update = () => {
    frame = 0;
    const r = anchor.getBoundingClientRect();
    const p = panel?.getBoundingClientRect();
    const vx = viewport?.offsetLeft ?? 0, vy = viewport?.offsetTop ?? 0;
    const box = p && {
      left: Math.ceil(Math.max(p.left, vx, 0)), top: Math.ceil(Math.max(p.top, vy, 0)),
      right: Math.floor(Math.min(p.right, vx + (viewport?.width ?? window.innerWidth), window.innerWidth)),
      bottom: Math.floor(Math.min(p.bottom, vy + (viewport?.height ?? window.innerHeight), window.innerHeight)),
    };
    if (!inView(anchor, box)) { onClose(); return; }
    if (box) {
      const width = box.right - box.left - 2 * inset;
      const height = Math.floor(Math.max(r.top - box.top, box.bottom - r.bottom) - inset - gap);
      if (width <= 0 || height <= 0) { onClose(); return; }
      if (width !== maxWidth) {
        maxWidth = width;
        popup.style.setProperty("--popover-max-width", `${width}px`);
      }
      if (height !== maxHeight) {
        maxHeight = height;
        popup.style.setProperty("--popover-max-height", `${height}px`);
      }
    }

    const { width, height } = popup.getBoundingClientRect();
    const spot = box ? placeTip(r, Math.ceil(width), Math.ceil(height), box, inset, gap) : placeInViewport(r, width, height);
    if (previous && spot.left === previous.left && spot.top === previous.top && spot.arrow === previous.arrow && spot.below === previous.below) return;
    previous = spot;
    popup.classList.toggle(flipClass, flipClass === "below" ? spot.below : !spot.below);
    popup.style.left = `${spot.left}px`;
    popup.style.top = `${spot.top}px`;
    popup.style.setProperty("--arrow", `${spot.arrow}px`);
    popup.style.visibility = "visible";
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const onScroll = (e: Event) => { if (!(e.target instanceof Element) || e.target.contains(anchor)) schedule(); };

  update();
  const resize = new ResizeObserver(schedule);
  resize.observe(popup);
  for (let el: HTMLElement | null = anchor; el && el !== document.body; el = el.parentElement) resize.observe(el);
  const content = new MutationObserver(schedule);
  content.observe(panel ?? anchor.closest(".il") ?? anchor, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["class", "style", "hidden", "data-phase", "data-call-opening"],
  });
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  viewport?.addEventListener("scroll", onScroll);
  viewport?.addEventListener("resize", schedule);
  panel?.addEventListener("animationend", schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    content.disconnect();
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", schedule);
    viewport?.removeEventListener("scroll", onScroll);
    viewport?.removeEventListener("resize", schedule);
    panel?.removeEventListener("animationend", schedule);
    document.fonts.removeEventListener("loadingdone", schedule);
  };
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
  const [saved, setSaved] = useState(false);
  const u = s.units[index];
  const word = useMemo(() => unitInput(s, index, sitId, keepCaps), [s, index, sitId]);
  const whole = useMemo(() => sentenceInput(s, sitId), [s, sitId]);
  const dash = !u || isDashGloss(u.lt) || !word;

  useLayoutEffect(() => {
    if (ref.current) return trackPopover(anchor, ref.current, () => closeRef.current(), "above", place);
  }, [anchor]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      const onWord = anchor.contains(t) && !(t instanceof Element && t.closest(".nat-star"));
      if (ref.current?.contains(t) || onWord) return; // the word itself toggles
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
    <div ref={ref} className="wpop" role="dialog" aria-label={L("Žodis „{word}“", { word: shown })} style={{ left: 0, top: 0, visibility: "hidden" }}>
      <div className="wpop-body">
        <div className="wpop-en" lang={TL}>{shown}</div>
        {!dash && word.ipa && <div className="wpop-ipa">{word.ipa}</div>}
        {dash ? <div className="wpop-none">{L("Atskirai neverčiama – išsaugok visą sakinį.")}</div> : <div className="wpop-lt" lang={EDITION.helper}>{word.lt}</div>}
        <div className="wpop-acts">
          {!dash && (wordIn
            ? <span className="wpop-in"><Icon name="check" size={16} strokeWidth={2.25} /> {L("Kortelėse")}</span>
            : <button className="btn small" onClick={() => add(word)}><Glyph name="plus" size={16} /> {L("Į korteles")}</button>)}
          {sentIn
            ? <span className="wpop-in"><Icon name="check" size={16} strokeWidth={2.25} /> {L("Sakinys kortelėse")}</span>
            : <button className={"btn small" + (dash ? "" : " soft")} onClick={() => add(whole)}><Glyph name="plus" size={16} /> {L("Visą sakinį")}</button>}
        </div>
        {saved && <div className="wpop-hint">{L("Kortelę rasi „Frazių knygelėje“.")}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------------------------
// the cards tab

const ROUND = 20;

function whenLt(days: number): string {
  return days <= 0 ? L("šiandien") : days === 1 ? L("rytoj") : days === 2 ? L("poryt") : L("po {n} d.", { n: days });
}

const listen = (text: string) => { audio.play(coachVoice(useStore.getState().progress.profile?.gender), 1, text); };
const cardSay = (c: Card) => (c.en === c.sentence.en && c.sentence.say ? c.sentence.say : c.en);

function Pips({ box }: { box: number }) {
  return (
    <span className="cd-pips" role="img" aria-label={L("Lygis {n} iš 5", { n: box })} title={L("Lygis {n} iš 5", { n: box })}>
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
        <b>{L("Kol kas kortelių nėra")}</b>
        <p>{Lx("Pokalbyje paspausk anglišką žodį – pamatysi jo vertimą ir galėsi išsaugoti jį ar visą sakinį. Frazes iš knygelės pridėsi mygtuku {plus}.", { plus: <span className="cards-plus"><Glyph name="plus" size="1em" /></span> })}</p>
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
            <><b>{L("Šiandien kartoti: {n}", { n: due.length })}</b><span>{L("Pamatysi lietuviškai – pasakyk angliškai ir pasitikrink.")}</span></>
          ) : (
            <><b>{L("Šiandien viskas pakartota!")}</b><span>{next ? L("Kitos kortelės laukia {when}.", { when: whenLt(daysUntil(next, now)) }) : L("Puikiai sekasi.")}</span></>
          )}
        </div>
        {due.length > 0 && <button className="btn" onClick={start}><Icon name="play" size={15} /> {L("Kartoti")}</button>}
      </div>
      <h3 className="cards-h">{L("Visos kortelės · {n}", { n: cards.length })}</h3>
      <div className="cd-list">{list.map((c) => <CardRow key={c.id} c={c} now={now} />)}</div>
      <button className="cards-export" onClick={() => download(L("english-world-korteles.json"), exportCardsJSON(useCards.getState().cards))}>
        <Glyph name="download" size={16} /> {L("Atsisiųsti korteles (JSON)")}
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
        <div className="cd-en" lang={TL}>{c.en}</div>
        <div className="cd-lt" lang={EDITION.helper}>{c.lt}</div>
      </div>
      <div className="cd-meta">
        <Pips box={c.box} />
        <span className={"cd-when" + (days <= 0 ? " now" : "")}>{whenLt(days)}</span>
      </div>
      <button className="cd-btn" onClick={() => listen(cardSay(c))} title={L("Klausyti")} aria-label={L("Klausyti")}><Icon name="speaker" size={19} /></button>
      {confirm
        ? <button className="cd-btn del sure" onClick={() => useCards.getState().remove(c.id)} aria-label={L("Taip, ištrinti")}>{L("Ištrinti?")}</button>
        : <button className="cd-btn del" onClick={() => setConfirm(true)} title={L("Ištrinti kortelę")} aria-label={L("Ištrinti kortelę")}><Glyph name="trash" size={19} /></button>}
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
        <b>{more ? L("Puiku!") : L("Šiandien viskas!")}</b>
        <p>{L("Pakartojai {done} {cards}.", { done, cards: ltCount(done, "kortelę", "korteles", "kortelių") })}{done > 0 && <> {L("Mokėjai – {knew}, dar kartą – {again}.", { knew: stats.knew, again: stats.again })}</>}</p>
        <div className="rv-done-acts">
          {more > 0 && <button className="btn" onClick={onMore} ref={focusRef}><Icon name="play" size={15} /> {L("Kartoti dar ({n})", { n: more })}</button>}
          <button className={"btn " + (more ? "ghost" : "soft")} onClick={onExit} ref={more ? undefined : focusRef}>{L("Grįžti į korteles")}</button>
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
        <button className="btn ghost small" onClick={onExit}><Icon name="arrowLeft" size={16} /> {L("Baigti")}</button>
        <div className="rv-progress" aria-hidden><i style={{ width: `${(p / queue.length) * 100}%` }} /></div>
        <span className="rv-count" aria-label={L("Kortelė {n} iš {total}", { n: p + 1, total: queue.length })}>{p + 1}/{queue.length}</span>
      </div>
      <div className={"rv-card" + (shown ? " shown" : "") + (long ? " long" : "")} onClick={() => !shown && setShown(true)}>
        <div className="rv-label">{L("Pasakyk angliškai")}{sit ? <span className="rv-sit"> · <SitIcon id={sit.id} size="1.15em" />{"\u00a0"}{sit.title.lt}</span> : null}</div>
        <div className="rv-lt" lang={EDITION.helper}>{card.lt}</div>
        {shown ? (
          <div className="rv-answer">
            <div className="rv-en-row">
              <span className="rv-en" lang={TL}>{card.en}</span>
              <button className="rv-play" onClick={(e) => { e.stopPropagation(); listen(cardSay(card)); }} title={L("Klausyti")} aria-label={L("Klausyti")}><Icon name="speaker" size={21} /></button>
            </div>
            {card.ipa && <div className="rv-ipa">{card.ipa}</div>}
            {!isSentence && (
              <div className="rv-src">
                <div className="rv-src-en" lang={TL}>{marked(card.sentence.en, card.en)}</div>
                <div className="rv-src-lt" lang={EDITION.helper}>{card.sentence.lt}</div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn soft rv-reveal" ref={focusRef} onClick={(e) => { e.stopPropagation(); setShown(true); }}>{L("Rodyti atsakymą")}</button>
        )}
      </div>
      {shown && (
        <div className="rv-acts">
          <button className="btn ghost" onClick={() => answer(false)}><Icon name="restart" size={17} /> {L("Dar kartą")}</button>
          <button className="btn" onClick={() => answer(true)} ref={focusRef}><Icon name="check" size={17} strokeWidth={2.25} /> {L("Mokėjau")}</button>
        </div>
      )}
    </div>
  );
}
