// Switching between the 3D town and the light mode: remember the choice and reload the page, which
// then starts straight in the other mode (no title screen in between).
import { useStore, type PlayMode } from "../state/store";

const KEY = "ew-play-now";

export function switchPlayMode(to: PlayMode) {
  useStore.getState().setSettings({ play: to });
  try { sessionStorage.setItem(KEY, "1"); } catch { /* the title screen will ask again */ }
  location.reload();
}

/** After a switch: the mode to start in at once (null: show the title screen). */
export function takeAutoStart(): PlayMode | null {
  let flag = false;
  try { flag = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch { /* no storage */ }
  const st = useStore.getState();
  return flag && st.progress.profile ? st.settings.play : null;
}
