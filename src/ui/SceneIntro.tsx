// The scene card shown before the first line.
import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import type { SituationDef } from "../content/types";
import { NPCS } from "../content/npcs";
import { Icon } from "./icons";
import { genderChoice } from "../convo/lt-morph";

export function SceneIntro({ sit }: { sit: SituationDef }) {
  const open = useStore((s) => s.conv.introOpen);
  const run = useStore((s) => s.conv.run);
  const npc = useStore((s) => NPCS[s.conv.hostId]);
  const gender = useStore((s) => s.progress.profile?.gender) ?? "m";
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) start.current?.focus({ preventScroll: true }); }, [open, run]);
  if (!open) return null;
  const intro = sit.intro?.trim() ? sit.intro : undefined;
  const close = () => useStore.getState().setConv({ introOpen: false });
  return <div className="scene-intro" role="region" aria-label="Scena">
    <div className="scene-intro-head"><b>{intro ? "Scena" : sit.title.lt || sit.title.en}</b>
      <button className="close-x" onClick={close} aria-label="Uždaryti sceną"><Icon name="close" size={18} /></button>
    </div>
    {intro ? <p>{sceneText(intro, gender)}</p> : <>
      {npc && <p>{npc.name}</p>}
      {sit.goal && <p>{sceneText(sit.goal, gender)}</p>}
    </>}
    <button ref={start} className="btn small scene-start" onClick={close}>Pradėti</button>
  </div>;
}

/** The intro as this learner reads it: a role written for both ("{m:virėjas|f:virėja}") in the learner's gender. */
export const sceneText = (intro: string, gender: "m" | "f") => genderChoice(intro, gender);
