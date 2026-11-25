import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PhraseLine, PhraseSource } from "./phraseLine";
import type { StoneReading } from "./stoneReading";
import "./stonePhraseCard.css";

type StoneLabels = Pick<StoneReading["labels"], "add" | "inCards" | "close" | "replay" |
  "translation" | "translationTitle" | "ipa" | "ipaTitle">;
type StoneClassNames = Partial<Record<"veil" | "card" | "heading" | "close" | "reading" | "replay" | "text" | "line", string>>;

export type StonePhraseCardProps = {
  reader: StoneReading;
  title: string;
  labels?: StoneLabels;
  classNames?: StoneClassNames;
  targetLang?: string;
  helperLang?: string;
  source: PhraseSource;
  phrase: PhraseLine;
  shown: boolean;
  solved: boolean;
  onReplay(): void;
  onDismiss(): void;
  returnFocus?: HTMLElement | null;
  quizKeys?: { count: number; pick(index: number): void };
  heading?: ReactNode;
  reveal?: ReactNode;
  quiz?: ReactNode;
  mic?: ReactNode;
};

const withClass = (base: string, extra?: string) => extra ? `${base} ${extra}` : base;
const editable = "input, select, textarea, [contenteditable]:not([contenteditable=false])";
const activator = "button, a, summary, [role=button]";
const focusable = "button, a[href], input, select, textarea, summary, [tabindex], [contenteditable=true]";
const selectedText = () => !!window.getSelection()?.toString();

/** Mount once per opening. The caller supplies the quiz and owns playback. */
export default function StonePhraseCard({ reader, title, labels = reader.labels, classNames = {},
  targetLang = reader.targetLang, helperLang = reader.helperLang,
  source, phrase, shown, solved, onReplay, onDismiss, returnFocus, quizKeys, heading, reveal, quiz, mic }: StonePhraseCardProps) {
  const { Icon, Interlinear, PhraseSave, resolvePhrase, ipaForSentence, useSetting, toggle } = reader;
  const [veil, setVeil] = useState<HTMLDialogElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const fallback = useRef(returnFocus);
  const dismissed = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; released: boolean } | null>(null);
  const lt = useSetting("lt");
  const nat = useSetting("ltNatural");
  const ipa = useSetting("ipa");
  const sentence = useMemo(() => resolvePhrase(phrase), [resolvePhrase, phrase]);
  const reading = (shown || solved) && sentence;
  const aligned = !!(solved && reading && reading.units.length);
  const sounds = useMemo(() => {
    if (!reading || !ipa || aligned) return "";
    const units = reading.units.length ? reading.units.map((unit) => unit.en) : reading.en.trim().split(/\s+/);
    return ipaForSentence(units, reading.say).filter(Boolean).join(" ");
  }, [reading, ipa, aligned, ipaForSentence]);
  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss();
  };

  useLayoutEffect(() => {
    if (!veil) return;
    const previous = document.activeElement;
    veil.showModal();
    panel.current?.focus({ preventScroll: true });
    return () => {
      veil.close();
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected && previous.getClientRects().length) {
        previous.focus({ preventScroll: true });
      }
      const surface = fallback.current;
      if (surface?.isConnected && (!document.activeElement || document.activeElement === document.body)) {
        if (surface.tabIndex < 0) surface.tabIndex = -1;
        surface.focus({ preventScroll: true });
      }
    };
  }, [veil]);

  useLayoutEffect(() => {
    if (!veil) return;
    // WordPopover and NatTip consume Escape during window capture, before this listener.
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) dismiss();
        return;
      }
      if (key === "tab") {
        const items = [...veil.querySelectorAll<HTMLElement>(focusable)]
          .filter((el) => el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length);
        const active = items.indexOf(document.activeElement as HTMLElement);
        if (active < 0 || (event.shiftKey ? active === 0 : active === items.length - 1)) {
          event.preventDefault();
          (items[event.shiftKey ? items.length - 1 : 0] ?? panel.current)?.focus();
        }
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || target?.closest(editable)) return;
      if (key === " " && target?.closest(activator)) return;
      const digit = Number(key);
      const choice = !solved && quizKeys && /^[1-3]$/.test(key) && digit <= quizKeys.count;
      if (!(key === "l" || key === "n" || key === "i" || key === "r" || (!solved && key === " ") || choice)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (key === "l") toggle("lt");
      else if (key === "n") toggle("ltNatural");
      else if (key === "i") toggle("ipa");
      else if (choice) quizKeys.pick(digit - 1);
      else onReplay();
    };
    document.addEventListener("keydown", keyDown, true);
    return () => document.removeEventListener("keydown", keyDown, true);
  });

  const clearGesture = () => { gesture.current = null; };
  return <dialog ref={setVeil} className={withClass("stone-phrase-veil", classNames.veil)} aria-label={title}
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
    onPointerDown={(event) => {
      event.stopPropagation();
      gesture.current = event.isPrimary && event.button === 0 && event.target === event.currentTarget && !selectedText()
        ? { id: event.pointerId, x: event.clientX, y: event.clientY, released: false } : null;
    }}
    onPointerMove={(event) => {
      const start = gesture.current;
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) clearGesture();
    }}
    onPointerUp={(event) => {
      event.stopPropagation();
      const start = gesture.current;
      if (!start || start.id !== event.pointerId || event.button !== 0 || event.target !== event.currentTarget ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
        document.elementFromPoint(event.clientX, event.clientY) !== event.currentTarget) {
        clearGesture();
      } else start.released = true;
    }}
    onPointerCancel={clearGesture} onScrollCapture={clearGesture} onWheel={clearGesture}
    onClick={(event) => {
      event.stopPropagation();
      const start = gesture.current;
      clearGesture();
      if (start?.released && event.target === event.currentTarget && event.button === 0 && event.detail > 0 &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8 && !selectedText()) {
        event.preventDefault();
        dismiss();
      }
    }}>
    <section ref={panel} tabIndex={-1} className={withClass("stone-phrase-card", classNames.card) + (solved ? " solved" : "")}>
      <header className="stone-phrase-header">
        <div className={classNames.heading}>{heading ?? <h2>{title}</h2>}</div>
        <button type="button" className={withClass("stone-phrase-close", classNames.close)} aria-label={labels.close} title={labels.close}
          onClick={dismiss}><Icon name="close" size={20} /></button>
      </header>
      <div className={withClass("stone-phrase-reading", classNames.reading)}>
        <div className="stone-phrase-controls">
          <button type="button" className={withClass("stone-phrase-replay", classNames.replay)} aria-label={labels.replay} title={labels.replay}
            onClick={onReplay}><Icon name="speaker" size={24} /></button>
          <div className="toggles">
            <button type="button" className={"toggle" + (lt ? " on" : "")} onClick={() => toggle("lt")}
              title={labels.translationTitle} aria-pressed={lt}>{labels.translation}</button>
            <button type="button" className={"toggle" + (ipa ? " on" : "")} onClick={() => toggle("ipa")}
              title={labels.ipaTitle} aria-pressed={ipa}>{labels.ipa}</button>
          </div>
        </div>
        {reading ? <div className="phrase-save-row">
          <div className={withClass(withClass("stone-phrase-text", classNames.text), aligned ? classNames.line : undefined)} lang={targetLang}>
            {aligned ? <Interlinear s={reading} lt={lt} nat={nat} ipa={ipa} natTip source={source} portalHost={veil ?? undefined} {...{ targetLang, helperLang }} /> : <>
              <div lang={targetLang} className="stone-phrase-target">{reading.en}</div>
              {sounds && <div className="ipa stone-phrase-ipa">{sounds}</div>}
              {solved && lt && nat && <div className="nat" lang={helperLang}>{reading.nat}</div>}
            </>}
          </div>
          <PhraseSave sentence={reading} {...source} labels={labels} />
        </div> : !shown && !solved && reveal}
      </div>
      {!solved && quiz}
      {!solved && mic}
    </section>
  </dialog>;
}
