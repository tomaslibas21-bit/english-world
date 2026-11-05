// Interlinear sentence: each English unit with its optional IPA right under it and its Lithuanian gloss
// below that, centred together; wrapping between units (a unit wider than the line wraps inside itself);
// natural Lithuanian as a separate line (LT toggle). On the other person's lines with that line off, a natural
// sentence that tells more than the glosses waits behind a small "*" after the last word (NatTip, natTip.ts).
// Tapping a unit opens a small popover to save it (or the whole sentence) as a card (Cards.tsx);
// saved units get a tiny dot.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Sentence } from "../convo/compose";
import { ipaForUnit } from "../convo/ipa";
import { natSaysMore, placeTip, type TipSpot } from "./natTip";
import { useCards, cardKey } from "../state/cards";
import { WordPopover, inView } from "./Cards";
import { L, TL } from "./i18n";
import { EDITION } from "../edition";

const unitOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>(".u[data-i]") : null);

/** `natTip`: the other person's lines; with the natural sentence off (`nat` false), it can sit behind an asterisk. */
export function Interlinear({ s, lt, ipa, nat, natTip, highlight }: { s: Sentence; lt: boolean; ipa: boolean; nat?: boolean; natTip?: boolean; highlight?: boolean }) {
  const plain = !lt && !ipa;
  const saved = useCards((c) => c.keys);
  const [open, setOpen] = useState<{ i: number; el: HTMLElement } | null>(null);
  const down = useRef<HTMLElement | null>(null);
  const close = useCallback(() => setOpen(null), []);
  useEffect(() => { setOpen(null); }, [s.en]); // another sentence in the same place
  const saysMore = useMemo(() => natSaysMore(s), [s]);
  const star = !!natTip && lt && nat === false && saysMore;
  // only a deliberate tap on a word opens the popover (not a text selection or a drag)
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = unitOf(e.target), from = down.current;
    down.current = null;
    if (!el || (from && from !== el) || !e.currentTarget.contains(el)) return;
    if (window.getSelection()?.toString().trim()) return;
    const i = Number(el.dataset.i);
    setOpen((o) => (o && o.i === i ? null : { i, el }));
  };
  return (
    <div>
      <div className={"il" + (plain ? " plain" : "") + (highlight ? " hl" : "")} lang={TL} onPointerDown={(e) => { down.current = unitOf(e.target); }} onClick={onClick}>
        {s.units.map((u, i) => {
          const dash = u.lt.startsWith("—");
          const isSaved = !dash && saved.has(cardKey(u.en));
          const unit = (
            <span className={"u tap" + (isSaved ? " saved" : "") + (open?.i === i ? " open" : "")} key={i} data-i={i}>
              <span className="en">{u.en}{isSaved && <span className="u-dot" aria-hidden />}</span>
              {ipa && <span className="ipa">{ipaForUnit(u.en) || " "}</span>}
              {lt && <span className={"lt" + (dash ? " dash" : "") + (u.flag ? " flag" : "")} title={u.flag || undefined} lang={EDITION.helper}>{u.lt}</span>}
            </span>
          );
          // the asterisk right after the last word, beside its unit rather than in it (so a tap on it is not a tap
          // on the word), the two kept on one line
          return star && i === s.units.length - 1 ? <span className="nat-last" key={i}>{unit}<NatTip key={s.en} text={s.nat} /></span> : unit;
        })}
      </div>
      {lt && nat !== false && s.nat && <div className="nat" lang={EDITION.helper}>{s.nat}</div>}
      {open && open.i < s.units.length && <WordPopover s={s} index={open.i} anchor={open.el} onClose={close} />}
    </div>
  );
}

/** Focus from the keyboard (a tap or a click also focuses a button in some browsers; that shouldn't count). */
function keyboardFocus(el: Element): boolean {
  try { return el.matches(":focus-visible"); } catch { return true; }
}

/** The natural sentence behind a small "*". A mouse over it, keyboard focus or a tap shows it; a second tap, a tap
 *  elsewhere or Esc hides it. The tooltip floats above the asterisk (below it when there's no room above), inside
 *  the conversation panel, so opening it never moves the sentence. Like the word popover it lives at the end of
 *  the page: the transcript doesn't clip it, and screen readers don't announce it as a new transcript line (they
 *  read it as the asterisk's description). */
function NatTip({ text }: { text: string }) {
  const id = useId();
  const starRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  const [tapped, setTapped] = useState(false); // opened with a tap or a click: stays until closed
  const [hover, setHover] = useState(false); // a mouse over the asterisk or the tooltip
  const [focused, setFocused] = useState(false); // keyboard focus on the asterisk
  const [spot, setSpot] = useState<TipSpot | null>(null);
  const leaving = useRef(0);
  const open = tapped || hover || focused;
  const close = useCallback(() => { setTapped(false); setHover(false); setFocused(false); }, []);

  // a mouse may cross the small gap between the asterisk and the tooltip without it closing (touch has no hover)
  const enter = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; clearTimeout(leaving.current); setHover(true); };
  const leave = () => { clearTimeout(leaving.current); leaving.current = window.setTimeout(() => setHover(false), 150); };
  useEffect(() => () => clearTimeout(leaving.current), []);

  // follow the asterisk (scrolling, new lines, the toggles), close when it's scrolled out of sight
  useLayoutEffect(() => {
    if (!open) { setSpot(null); return; }
    let raf = 0, last = "";
    const tick = () => {
      const a = starRef.current, el = boxRef.current;
      if (!a || !el) return;
      const r = a.getBoundingClientRect();
      const p = a.closest(".convo")?.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const sig = [r.left, r.top, r.width, r.height, el.offsetWidth, el.offsetHeight, p?.left, p?.top, p?.right, p?.bottom, vw, vh].join("|");
      if (sig !== last) {
        last = sig;
        if (!inView(a)) { close(); return; }
        const panel = { left: Math.max(0, p?.left ?? 0), top: Math.max(0, p?.top ?? 0), right: Math.min(vw, p?.right ?? vw), bottom: Math.min(vh, p?.bottom ?? vh) };
        setSpot(placeTip(r, el.offsetWidth, el.offsetHeight, panel));
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [open, close]);

  // a tap elsewhere closes what a tap opened; Esc closes it however it opened (capture: only the tooltip, not the
  // conversation)
  useEffect(() => {
    if (!open) return;
    const down = (e: globalThis.PointerEvent) => {
      const t = e.target as Node;
      if (starRef.current?.contains(t) || boxRef.current?.contains(t)) return; // the asterisk itself toggles
      setTapped(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, [open, close]);

  const tip = (
    <span ref={boxRef} id={id} role="tooltip" lang={EDITION.helper} className={"nat-tipbox" + (spot?.below ? " below" : "")} hidden={!open}
      onPointerEnter={enter} onPointerLeave={leave}
      style={(spot ? { left: spot.left, top: spot.top, "--arrow": spot.arrow + "px" } : { left: 0, top: 0, visibility: "hidden" }) as CSSProperties}>
      {text}
    </span>
  );
  return (
    <>
      <button ref={starRef} type="button" className="nat-star" aria-label={L("Natūralus vertimas")} aria-expanded={open} aria-describedby={id}
        onClick={() => setTapped((v) => !v)} onPointerEnter={enter} onPointerLeave={leave}
        onFocus={(e) => setFocused(keyboardFocus(e.currentTarget))}
        onBlur={(e) => {
          setFocused(false);
          // Tab to something else closes it too; a tap on nothing in particular is the outside tap above
          const to = e.relatedTarget as Node | null;
          if (to && !boxRef.current?.contains(to)) setTapped(false);
        }}>*</button>
      {/* the tests' server renderer has no page to put it in: there it stays in place */}
      {typeof document === "undefined" ? tip : createPortal(tip, document.body)}
    </>
  );
}
