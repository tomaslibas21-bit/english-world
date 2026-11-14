import { useStore } from "../state/store";
import { sceneFor } from "./scenes";
import { L } from "./i18n";

/** In a conversation in the 3D town, where the place has a picture: talk in front of the picture or with the person
 *  in 3D (their lips follow the voice). The same setting as „Iliustruotos scenos“ in Nustatymai, here in the corner
 *  of the picture where the learner looks for it (owner, 14 Nov 2026); P switches it too. The pictures-only mode has
 *  no 3D town, so it has no switch. */
export function ViewSwitch() {
  const active = useStore((s) => s.conv.active);
  const sitId = useStore((s) => s.conv.sitId);
  const hostId = useStore((s) => s.conv.hostId);
  const light = useStore((s) => s.settings.play === "light");
  const pictures = useStore((s) => s.settings.scenes !== false);
  const panel = useStore((s) => s.hud.panel);
  if (!active || light || panel || !sceneFor(sitId, hostId)) return null;
  const set = (scenes: boolean) => { if (scenes !== pictures) useStore.getState().setSettings({ scenes }); };
  return (
    <div className="view-switch" role="group" aria-label={L("Pokalbio vaizdas")}>
      <button type="button" className={pictures ? "on" : ""} aria-pressed={pictures} onClick={() => set(true)} title={L("Pokalbis prie piešinio (P)")}>{L("Piešinys")}</button>
      <button type="button" className={pictures ? "" : "on"} aria-pressed={!pictures} onClick={() => set(false)} title={L("Kalbėtis su žmogumi 3D mieste – lūpos juda pagal balsą (P)")}>3D</button>
    </div>
  );
}
