// Conversation files on demand (phone loading, 16 Nov 2026; src/content/situations/catalog.ts). A conversation opens
// once its file is here (whenLoaded); the files the learner will likely open next are fetched in the background
// before they are needed, so opening one isn't slower than before: the task's, the ones of the people within ~25 m
// (indoors: everyone in the room), the phone's calls while the phone is open, and the ones whose cards are on the
// screen in a list (the light mode's home, the situation picker, the journal: any element with data-sit), and in a
// conversation the one its end box offers next. A course's link to one conversation (?sit=) fetches it at once
// (src/ui/playMode.ts).
import { useStore } from "../state/store";
import { L } from "../ui/i18n";
import { SITUATIONS, getSituation, loadSituation, prefetchSituations } from "../content/situations/catalog";
import type { SituationDef } from "../content/types";
import type { GameApi } from "./gameRef";

let ticket = 0;

/** `go` with the conversation's whole definition: at once when its file is loaded, else when it arrives (if `still()`
 *  then holds, and no other conversation was asked for meanwhile). A file that can't be fetched (offline) says so. */
export function whenLoaded(sitId: string, go: (def: SituationDef) => void, still: () => boolean = () => true, settled?: () => void) {
  const def = getSituation(sitId);
  const mine = ++ticket;
  if (def) { try { go(def); } finally { settled?.(); } return; }
  const slow = setTimeout(() => useStore.getState().toast({ kind: "info", title: L("Kraunamas pokalbis…"), ms: 2000 }), 600);
  loadSituation(sitId).then(
    (d) => { clearTimeout(slow); if (d && mine === ticket && still()) go(d); },
    () => { clearTimeout(slow); useStore.getState().toast({ kind: "info", title: L("Nepavyko atsisiųsti pokalbio"), body: L("Patikrink interneto ryšį ir pabandyk dar kartą.") }); },
  ).finally(() => settled?.());
}

const CALLS = SITUATIONS.filter((s) => s.mode === "phone" || s.mode === "video" || s.location === "phone").map((s) => s.id);
let timer: ReturnType<typeof setInterval> | null = null;

/** Keeps fetching the conversations the learner is near (gameRef.setGame starts it for each game, and stops it). */
export function watchSituations(g: GameApi | null) {
  if (timer) { clearInterval(timer); timer = null; }
  if (!g) return;
  const tick = () => {
    const ids: string[] = [];
    const o = g.currentObjective();
    if (o) ids.push(o.id);
    const st = useStore.getState();
    const task = st.hud.objective?.sitId;
    if (task) ids.push(task);
    if (st.hud.panel === "phone") ids.push(...CALLS);
    // in a conversation: the one its end box offers next ("Kita situacija")
    if (st.conv.active) { const next = g.nextScenarioId(st.conv.sitId); if (next) ids.push(next); }
    ids.push(...(g.nearSituations?.() ?? []));
    prefetchSituations(ids);
  };
  setTimeout(tick, 0);
  timer = setInterval(tick, 1500);
  watchCards();
}

/** A conversation's card on the screen (any element with data-sit="<id>"): its file is fetched, so that a tap opens it
 *  at once; a press fetches it too, if it is not on its way yet. Watches the page once, for as long as it lives. */
let watching = false;
function watchCards() {
  if (watching || typeof document === "undefined" || typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;
  watching = true;
  const seen = new IntersectionObserver((entries) => {
    const ids: string[] = [];
    for (const e of entries) { const id = (e.target as HTMLElement).dataset.sit; if (e.isIntersecting && id) ids.push(id); }
    if (ids.length) prefetchSituations(ids);
  });
  const observed = new WeakSet<Element>();
  let pendingScan: ReturnType<typeof setTimeout> | null = null;
  const scan = () => {
    pendingScan = null;
    document.querySelectorAll<HTMLElement>("[data-sit]").forEach((el) => { if (!observed.has(el)) { observed.add(el); seen.observe(el); } });
  };
  // (the interface changes often while one plays: a look at most every 300 ms)
  new MutationObserver(() => { pendingScan ??= setTimeout(scan, 300); }).observe(document.body, { childList: true, subtree: true });
  scan();
  document.addEventListener("pointerdown", (e) => {
    const id = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-sit]")?.dataset.sit;
    if (id) prefetchSituations([id]);
  }, { capture: true, passive: true });
}
