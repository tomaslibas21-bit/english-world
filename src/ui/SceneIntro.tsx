// The scene card the learner dismisses before the first line.
import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import type { SituationDef } from "../content/types";
import { NPCS } from "../content/npcs";
import { Icon } from "./icons";
import { L } from "./i18n";
import { EDITION } from "../edition";
import { genderChoice } from "../convo/lt-morph";

export function SceneIntro({ sit }: { sit: SituationDef }) {
  const open = useStore((s) => s.conv.introOpen);
  const run = useStore((s) => s.conv.run);
  const npc = useStore((s) => NPCS[s.conv.hostId]);
  const gender = useStore((s) => s.progress.profile?.gender) ?? "m";
  const intro = useStore((s) => s.conv.introOverride) ?? sit.intro;
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) start.current?.focus({ preventScroll: true }); }, [open, run]);
  if (!open) return null;
  const close = () => useStore.getState().setConv({ introOpen: false });
  return <div className="scene-intro" data-pad-scope="intro" role="region" aria-label={L("Scena")}>
    <div className="scene-intro-head"><b>{intro ? L("Scena") : sit.title.lt || sit.title.en}</b>
      <button className="close-x" data-pad-back onClick={close} aria-label={L("Uždaryti sceną")}><Icon name="close" size={18} /></button>
    </div>
    {intro ? <p lang={EDITION.helper}>{sceneText(intro, gender)}</p> : <>
      {npc && <p>{npc.name}</p>}
      {sit.goal && <p lang={EDITION.helper}>{sceneText(sit.goal, gender)}</p>}
    </>}
    <button ref={start} className="btn scene-start" data-pad-default onClick={close}>{L("Pradėti")}</button>
  </div>;
}

/** The intro as this learner reads it: a role written for both ("{m:virėjas|f:virėja}") in the learner's gender. */
export const sceneText = (intro: string, gender: "m" | "f") => genderChoice(intro, gender);
