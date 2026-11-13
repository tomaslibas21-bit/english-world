// The scene (SituationDef.intro): where you are and who you are here, shown when a conversation opens, before the
// person's first line (src/game/session.ts introRead waits for it); one tap closes it, and it stays under "i"
// (Conversation.tsx NpcInfo).
import { useStore } from "../state/store";
import type { SituationDef } from "../content/types";
import { Icon } from "./icons";

export function SceneIntro({ sit }: { sit: SituationDef }) {
  const open = useStore((s) => s.conv.introOpen);
  if (!open || !sit.intro) return null;
  const close = () => useStore.getState().setConv({ introOpen: false });
  return <div className="scene-intro" role="region" aria-label="Scena">
    <div className="scene-intro-head"><b>Scena</b>
      <button className="close-x" onClick={close} aria-label="Uždaryti sceną"><Icon name="close" size={18} /></button>
    </div>
    <p>{sit.intro}</p>
    <button className="btn small" onClick={close}>Pradėti</button>
  </div>;
}
