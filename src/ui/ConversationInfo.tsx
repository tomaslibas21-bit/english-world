import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NPCS } from "../content/npcs";
import { placeLtNamed } from "../content/locations";
import type { SituationDef } from "../content/types";
import { Icon } from "./icons";
import { ReportProblem } from "./ReportProblem";

/** Extra context floats over the picture instead of pushing the dialogue and answers down. */
export function ConversationInfo({ npcId, sit }: { npcId: string; sit: SituationDef }) {
  const npc = NPCS[npcId];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const roleLt = npc && npc.role.lt.toLowerCase() !== npc.role.en.toLowerCase() ? npc.role.lt : null;
  const close = (returnFocus = false) => {
    clearTimeout(leaving.current);
    setOpen(false);
    if (returnFocus) {
      skipFocus.current = true;
      trigger.current?.focus({ preventScroll: true });
      skipFocus.current = false;
    }
  };
  useEffect(() => () => clearTimeout(leaving.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); e.stopPropagation(); close(true);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside, true); window.removeEventListener("keydown", escape, true); };
  }, [open]);
  return createPortal(
    <div ref={root} className="convo-info"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { clearTimeout(leaving.current); setOpen(true); } }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") leaving.current = setTimeout(() => setOpen(false), 160); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={trigger} type="button" className="convo-info-toggle" aria-label="Apie pašnekovą ir vietą" aria-expanded={open} aria-controls={id}
        onClick={() => { clearTimeout(leaving.current); setOpen((v) => !v); }}
        onFocus={(e) => { if (!skipFocus.current && e.currentTarget.matches(":focus-visible")) setOpen(true); }}>
        <Icon name="info" size={22} /><span>Apie pokalbį</span>
      </button>
      <div id={id} className="convo-info-box" role="region" aria-label="Pašnekovas ir vieta" hidden={!open}>
        <button type="button" className="close-x" onClick={() => close(true)} aria-label="Uždaryti informaciją"><Icon name="close" size={20} /></button>
        <b>{npc?.name}</b>
        <div className="convo-info-role"><span lang="en">{npc?.role.en}</span>{roleLt && <span lang="lt">{roleLt}</span>}</div>
        <p lang="lt">{sit.mode === "video" ? "Vaizdo skambutis" : placeLtNamed(sit.location)}</p>
        <ReportProblem />
      </div>
    </div>, document.body,
  );
}
