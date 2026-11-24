// Switching between the 3D town and the light mode: remember the choice and reload the page, which
// then starts straight in the other mode (no title screen in between). A link to one situation starts
// straight in it.
import { useStore, type PlayMode } from "../state/store";
import { SITUATION_BY_ID, prefetchSituations } from "../content/situations/catalog";

const KEY = "ew-play-now";
export const debugBilliardsLink = import.meta.env.DEV && new URLSearchParams(location.search).get("billiards") === "1";
export const debugBaristaLink = import.meta.env.DEV && new URLSearchParams(location.search).get("barista") === "1";
export const debugGoFishLink = import.meta.env.DEV && new URLSearchParams(location.search).get("gofish") === "1";

export function switchPlayMode(to: PlayMode) {
  useStore.getState().setSettings({ play: to });
  try { sessionStorage.setItem(KEY, "1"); } catch { /* the title screen will ask again */ }
  location.reload();
}

/** After a switch, or when the address names a situation: the mode to start in at once (null: show the
 *  title screen, which creates the profile first). */
export function takeAutoStart(): PlayMode | null {
  let flag = false;
  try { flag = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch { /* no storage */ }
  const st = useStore.getState();
  return (flag || linked || debugBaristaLink || debugGoFishLink || debugBilliardsLink) && st.progress.profile ? st.settings.play : null;
}

// A link to one situation (?sit=s72-cafe: the course links its situations this way). It is read once and
// taken out of the address, so a reload or the phone's back button leads to the situation list as usual.
let linked: string | null = (() => {
  try {
    const url = new URL(location.href);
    const id = url.searchParams.get("sit");
    if (id === null) return null;
    url.searchParams.delete("sit");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    if (!SITUATION_BY_ID[id]) return null;
    // (its file, at once: it opens as soon as the game is ready, src/content/situations/catalog.ts)
    prefetchSituations([id]);
    return id;
  } catch { return null; }
})();

export function linkedSituation() { return linked; }

/** The linked situation, once: started as soon as the game is ready. */
export function takeLinkedSituation(): string | null {
  const id = linked;
  linked = null;
  return id;
}
