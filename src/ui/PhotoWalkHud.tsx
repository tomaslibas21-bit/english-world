import { PHOTO_THINGS, PHOTO_WALK_UI as words } from "../content/photo-walk-lines";
import { game } from "../game/gameRef";
import { EMPTY_WALK } from "../game/photowalk/state";
import { useTownQuests } from "../game/photowalk/store";
import { ASK_WAY_UI as directions } from "../content/ask-way-lines";
import { useStore, type Toast } from "../state/store";
import { TownToast } from "./Toasts";
import { Icon } from "./icons";
import { L } from "./i18n";
import "./townQuests.css";

export const useWalk = () => useStore((s) => s.progress.photoWalk ?? EMPTY_WALK);

export function PhotoChip() {
  const camera = useTownQuests((s) => s.camera);
  const near = useTownQuests((s) => s.near);
  const { found } = useWalk();
  if (!camera) return null;
  return <button type="button" className="photo-chip" data-pad-tool="photo-chip" data-near={near ?? undefined} aria-label={near ? L(words.shoot) : L(words.open)}
    title={near ? L(words.shoot) : L(words.open)} onClick={() => game?.modeStart?.("photowalk", "camera")}>
    <span><Icon name="camera" size={18} />{found.length}/{PHOTO_THINGS.length}</span>
    {near && <small>{L(words.shoot)}</small>}
  </button>;
}

export function PhotoBookContact({ close }: { close(): void }) {
  const { status, found } = useWalk();
  const light = useStore((s) => s.settings.play === "light");
  if (light || (status !== "paused" && status !== "found" && status !== "done")) return null;
  return <button type="button" className="contact photo-contact" data-pad-tool="photo-book" onClick={() => { close(); game?.modeStart?.("photowalk", "book"); }}>
    <span className="avatar"><Icon name="camera" size={21} /></span>
    <span className="txt"><b>{L(words.phone)}</b><span>{found.length}/{PHOTO_THINGS.length}</span></span>
  </button>;
}

export function QuestArrival({ toast }: { toast: Toast | null }) {
  if (toast?.kind !== "success" || toast.title !== L(directions.arrived)) return <TownToast toast={toast} />;
  const arrival = { ...toast, icon: "sparkles" as const };
  return <div className="quest-arrival"><TownToast toast={arrival} /></div>;
}
