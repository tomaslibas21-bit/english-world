import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import type { Sentence } from "../../convo/compose";
import { ipaForSentence } from "../../convo/ipa";
import { useStore } from "../../state/store";
import { Icon } from "../icons";
import { Interlinear } from "../Interlinear";
import { resolvePhrase, type PhraseLine } from "./phraseLine";
import { PhraseSave, type PhraseSaveLabels, type PhraseSource } from "./PhraseSave";
import "./stonePhraseCard.css";

type StoneLabels = PhraseSaveLabels & {
  close: string; replay: string; translation: string; translationTitle: string; ipa: string; ipaTitle: string;
};
type StoneClassNames = Partial<Record<"veil" | "card" | "heading" | "close" | "reading" | "replay" | "text" | "line", string>>;

export type StonePhraseCardProps = {
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

function flip(key: "lt" | "ltNatural" | "ipa") {
  const { settings, setSettings } = useStore.getState();
  setSettings({ [key]: !settings[key] });
}

/** The revealed quiz cue and unaligned pairs have no tappable or translated units. */
function ReadingText({ sentence, ipa, targetLang }: { sentence: Sentence; ipa: boolean; targetLang: string }) {
  const line = useMemo(() => {
    if (!ipa) return null;
    const units = sentence.units.length ? sentence.units.map((unit) => unit.en) : sentence.en.trim().split(/\s+/);
    const sounds = ipaForSentence(units, sentence.say);
    return units.map((text, index) => ({ text, sound: sounds[index] }));
  }, [sentence, ipa]);
  if (!line) return <div className="il plain" lang={targetLang}>{sentence.en}</div>;
  return <div className="il" lang={targetLang}>
    {line.map(({ text, sound }, index) => <span className="u" key={index}>
      <span className="en">{text}</span><span className="ipa">{sound || " "}</span>
    </span>)}
  </div>;
}

/** Mount this dialog for one stone opening. The caller owns quiz and playback state. */
export default function StonePhraseCard({ title, labels = PHRASE_CARD_UI, classNames = {}, targetLang = "en", helperLang = "lt",
  source, phrase, shown, solved, onReplay, onDismiss, returnFocus, quizKeys, heading, reveal, quiz, mic }: StonePhraseCardProps) {
  const [veil, setVeil] = useState<HTMLDialogElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const invoker = useRef(returnFocus);
  const dismissed = useRef(false);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const backdropClick = useRef(false);

  const lt = useStore((s) => s.settings.lt);
  const nat = useStore((s) => s.settings.ltNatural);
  const ipa = useStore((s) => s.settings.ipa);
  const sentence = useMemo(() => resolvePhrase(phrase), [phrase]);
  const reading = (shown || solved) && sentence;
  const interlinear = solved && reading && sentence.units.length > 0;

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss();
  }, [onDismiss]);

  useLayoutEffect(() => {
    if (!veil) return;
    const previous = invoker.current ?? document.activeElement;
    veil.showModal();
    panel.current?.focus({ preventScroll: true });
    return () => {
      veil.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [veil]);

  useLayoutEffect(() => {
    if (!veil) return;
    // WordPopover and NatTip handle Esc at window capture. The stone receives it at document capture next.
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) dismiss();
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (!veil.contains(target)) event.stopPropagation();
      if (event.altKey || event.ctrlKey || event.metaKey || target?.closest("input, select, textarea, [contenteditable]:not([contenteditable=false])")) return;
      if (key === " " && target?.closest("button, a, summary, [role=button]")) return;
      const digit = Number(key);
      const choice = !solved && quizKeys && /^[1-3]$/.test(key) && digit <= quizKeys.count;
      if (!(key === "l" || key === "n" || key === "i" || key === "r" || (!solved && key === " ") || choice)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (key === "l") flip("lt");
      else if (key === "n") flip("ltNatural");
      else if (key === "i") flip("ipa");
      else if (choice) quizKeys.pick(digit - 1);
      else onReplay();
    };
    document.addEventListener("keydown", keyDown, true);
    return () => document.removeEventListener("keydown", keyDown, true);
  }, [veil, solved, quizKeys, dismiss, onReplay]);

  const dialog = <dialog ref={setVeil} className={withClass("stone-phrase-veil", classNames.veil)} aria-label={title}
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
    onPointerDown={(event) => {
      event.stopPropagation();
      if (!event.isPrimary) return;
      backdropClick.current = false;
      start.current = event.target === event.currentTarget && event.button === 0
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }}
    onPointerUp={(event) => {
      event.stopPropagation();
      const down = start.current;
      if (!down || down.id !== event.pointerId) return;
      start.current = null;
      backdropClick.current = event.target === event.currentTarget
        && Math.hypot(event.clientX - down.x, event.clientY - down.y) <= 8
        && document.elementFromPoint(event.clientX, event.clientY) === event.currentTarget;
    }}
    onPointerCancel={(event) => {
      event.stopPropagation();
      if (event.isPrimary) { start.current = null; backdropClick.current = false; }
    }}
    onClick={(event) => {
      event.stopPropagation();
      const outside = backdropClick.current && event.target === event.currentTarget;
      backdropClick.current = false;
      if (outside) { event.preventDefault(); dismiss(); }
    }}>
    <section ref={panel} tabIndex={-1} data-pad-scope="glyph" className={withClass("stone-phrase-card", classNames.card) + (solved ? " solved" : "")}>
      <header className="stone-phrase-header">
        <div className={withClass("stone-phrase-heading", classNames.heading)}>{heading ?? <h2>{title}</h2>}</div>
        <button type="button" className={withClass("stone-phrase-close", classNames.close)} data-pad-back aria-label={labels.close} title={labels.close}
          onClick={(event) => { event.stopPropagation(); dismiss(); }}><Icon name="close" size={20} /></button>
      </header>
      <div className={withClass("stone-phrase-reading", classNames.reading)}>
        <div className="stone-phrase-controls">
          <button type="button" className={withClass("stone-phrase-replay", classNames.replay)} aria-label={labels.replay} title={labels.replay}
            onClick={onReplay}><Icon name="speaker" size={20} /></button>
          <div className="toggles">
            <button type="button" className={"toggle" + (lt ? " on" : "")} onClick={() => flip("lt")}
              title={labels.translationTitle} aria-pressed={lt}>{labels.translation}</button>
            <button type="button" className={"toggle" + (ipa ? " on" : "")} onClick={() => flip("ipa")}
              title={labels.ipaTitle} aria-pressed={ipa}>{labels.ipa}</button>
          </div>
        </div>
        {reading ? <>
          <div className={withClass(withClass("stone-phrase-text", classNames.text), interlinear ? classNames.line : undefined)}>
            {interlinear ? <Interlinear s={reading} lt={lt} nat={nat} ipa={ipa} natTip source={source} portalHost={veil ?? undefined} /> : <>
              <ReadingText sentence={reading} ipa={ipa} targetLang={targetLang} />
              {solved && lt && nat && <div className="nat" lang={helperLang}>{reading.nat}</div>}
            </>}
          </div>
          <PhraseSave sentence={reading} {...source} labels={labels} />
        </> : !shown && !solved && reveal}
      </div>
      {!solved && quiz}
      {!solved && mic}
    </section>
  </dialog>;
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}
