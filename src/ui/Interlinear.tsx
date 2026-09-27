// Interlinear sentence: each English unit with its Lithuanian gloss and optional IPA centred
// together; wrapping only between units; natural Lithuanian as a separate line (LT toggle).
// Tapping a unit opens a small popover to save it (or the whole sentence) as a card (Cards.tsx);
// saved units get a tiny dot.
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { Sentence } from "../convo/compose";
import { ipaForUnit } from "../convo/ipa";
import { useCards, cardKey } from "../state/cards";
import { WordPopover } from "./Cards";

const unitOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>(".u[data-i]") : null);

export function Interlinear({ s, lt, ipa, nat, highlight }: { s: Sentence; lt: boolean; ipa: boolean; nat?: boolean; highlight?: boolean }) {
  const plain = !lt && !ipa;
  const saved = useCards((c) => c.keys);
  const [open, setOpen] = useState<{ i: number; el: HTMLElement } | null>(null);
  const down = useRef<HTMLElement | null>(null);
  const close = useCallback(() => setOpen(null), []);
  useEffect(() => { setOpen(null); }, [s.en]); // another sentence in the same place
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
      <div className={"il" + (plain ? " plain" : "") + (highlight ? " hl" : "")} lang="en" onPointerDown={(e) => { down.current = unitOf(e.target); }} onClick={onClick}>
        {s.units.map((u, i) => {
          const dash = u.lt.startsWith("—");
          const isSaved = !dash && saved.has(cardKey(u.en));
          return (
            <span className={"u tap" + (isSaved ? " saved" : "") + (open?.i === i ? " open" : "")} key={i} data-i={i}>
              <span className="en">{u.en}{isSaved && <span className="u-dot" aria-hidden />}</span>
              {lt && <span className={"lt" + (dash ? " dash" : "") + (u.flag ? " flag" : "")} title={u.flag || undefined} lang="lt">{u.lt}</span>}
              {ipa && <span className="ipa">{ipaForUnit(u.en) || " "}</span>}
            </span>
          );
        })}
      </div>
      {lt && nat !== false && s.nat && <div className="nat" lang="lt">{s.nat}</div>}
      {open && open.i < s.units.length && <WordPopover s={s} index={open.i} anchor={open.el} onClose={close} />}
    </div>
  );
}
