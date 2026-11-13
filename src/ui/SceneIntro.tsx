// The scene (SituationDef.intro): where you are and who you are here, shown when a conversation opens, before the
// person's first line (src/game/session.ts introRead waits for it); one tap closes it, and it stays under "i"
// (Conversation.tsx NpcInfo).
import { useStore } from "../state/store";
import type { SituationDef } from "../content/types";
import { Icon } from "./icons";
import { L } from "./i18n";
import { EDITION } from "../edition";
import { genderChoice } from "../convo/lt-morph";

export function SceneIntro({ sit }: { sit: SituationDef }) {
  const open = useStore((s) => s.conv.introOpen);
  const gender = useStore((s) => s.progress.profile?.gender) ?? "m";
  if (!open || !sit.intro) return null;
  const close = () => useStore.getState().setConv({ introOpen: false });
  return <div className="scene-intro" role="region" aria-label={L("Scena")}>
    <div className="scene-intro-head"><b>{L("Scena")}</b>
      <button className="close-x" onClick={close} aria-label={L("Uždaryti sceną")}><Icon name="close" size={18} /></button>
    </div>
    <p lang={EDITION.helper}>{sceneText(sit.intro, gender)}</p>
    <button className="btn small" onClick={close}>{L("Pradėti")}</button>
  </div>;
}

/** The intro as this learner reads it: a role written for both ("{m:virėjas|f:virėja}") in the learner's gender. */
export const sceneText = (intro: string, gender: "m" | "f") => genderChoice(intro, gender);
