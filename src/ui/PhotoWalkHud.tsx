import { PHOTO_THINGS, PHOTO_WALK_UI as words } from "../content/photo-walk-lines";
import { game } from "../game/gameRef";
import { EMPTY_WALK } from "../game/photowalk/state";
import { useTownQuests } from "../game/photowalk/store";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { L } from "./i18n";
import "./townQuests.css";

export const useWalk = () => useStore((s) => s.progress.photoWalk ?? EMPTY_WALK);

export function PhotoChip() {
  const camera = useTownQuests((s) => s.camera);
  const near = useTownQuests((s) => s.near);
  const { found } = useWalk();
  if (!camera) return null;
  return <button type="button" className="photo-chip" data-near={near ?? undefined} aria-label={near ? L(words.shoot) : L(words.open)}
    title={near ? L(words.shoot) : L(words.open)} onClick={() => game?.modeStart?.("photowalk", "camera")}>
    <span><Icon name="camera" size={18} />{found.length}/{PHOTO_THINGS.length}</span>
    {near && <small>{L(words.shoot)}</small>}
  </button>;
}

export function PhotoBookContact({ close }: { close(): void }) {
  const { status, found } = useWalk();
  const light = useStore((s) => s.settings.play === "light");
  if (light || (status !== "paused" && status !== "found" && status !== "done")) return null;
  return <button type="button" className="contact photo-contact" onClick={() => { close(); game?.modeStart?.("photowalk", "book"); }}>
    <span className="avatar"><Icon name="camera" size={21} /></span>
    <span className="txt"><b>{L(words.phone)}</b><span>{found.length}/{PHOTO_THINGS.length}</span></span>
  </button>;
}

export function QuestArrival() {
  const arrival = useTownQuests((s) => s.arrival);
  return arrival > 0 ? <Icon key={arrival} name="sparkles" className="quest-arrival quest-sparkle" size={32} /> : null;
}
