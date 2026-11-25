import { picturesOn, useStore, type ConvUI } from "../../state/store";
import type { SessionReaction } from "./feedback";
import type { NaturalOptions, NaturalSession } from "./session";

const loadSession = () => import("./session");
interface Visibility {
  hasArt: boolean;
  valid(): boolean;
  ready(): boolean;
  blocked(): boolean;
}

/** Listen for presentation edges and hydrate only while the staged view is usable. */
export function bindNaturalTalk(options: NaturalOptions, visibility: Visibility, load = loadSession) {
  const page = window, doc = document;
  const motion = page.matchMedia?.("(prefers-reduced-motion: reduce)");
  let natural: NaturalSession | undefined;
  let shown = false, pageHidden = false, suppressCurrent = false, generation = 0, disposed = false;
  let pending: { id: string; kind: SessionReaction; at: number } | undefined;

  function covered(state: ReturnType<typeof useStore.getState>) {
    const { conv, hud, settings } = state;
    return pageHidden || doc.hidden || conv.introOpen || !!hud.panel || !!hud.glyph || !!hud.fade ||
      !!hud.modeScreen || settings.play === "light" || (visibility.hasArt && picturesOn(settings));
  }

  function present(version: number) {
    void load().then(({ NaturalSession }) => {
      const state = useStore.getState();
      if (!unsubscribe || version !== generation || !shown || !visibility.valid() ||
        covered(state) || visibility.blocked() || !visibility.ready()) return;
      natural = new NaturalSession(options);
      natural.present(state.conv, !suppressCurrent && !motion?.matches);
      if (pending && !motion?.matches && performance.now() - pending.at < 500) natural.feedback(pending.id, pending.kind);
      pending = undefined;
    }).catch(() => { if (version === generation) pending = undefined; });
  }

  function sync(state = useStore.getState()) {
    if (!unsubscribe) return;
    if (!visibility.valid()) { stop(); return; }
    const hidden = covered(state) || visibility.blocked();
    const next = !hidden && visibility.ready();
    if (hidden && (shown || state.conv.speaking !== null)) suppressCurrent = true;
    if (next === shown) return;
    shown = next;
    const version = ++generation;
    if (!shown) {
      pending = undefined;
      natural?.suspend();
    } else if (natural) {
      natural.present(state.conv, !suppressCurrent && !motion?.matches);
    } else present(version);
  }

  function motionChanged() {
    if (!motion?.matches) return;
    pending = undefined;
    suppressCurrent = true;
    natural?.discardPending(useStore.getState().conv);
  }

  function pageVisibility() {
    if (natural?.releasing && (pageHidden || doc.hidden)) stop();
    else sync();
  }

  function hidePage() { pageHidden = true; pageVisibility(); }
  function showPage() { pageHidden = false; pageVisibility(); }

  function stop(release = false) {
    if (disposed) return false;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
      pending = undefined;
      generation++;
      motion?.removeEventListener("change", motionChanged);
      if (release && natural && shown && !pageHidden && !doc.hidden && !visibility.blocked()) natural.close();
      shown = false;
    }
    // Page visibility can still interrupt the release until its last pose is gone.
    if (release && natural?.releasing) return true;
    disposed = true;
    doc.removeEventListener("visibilitychange", pageVisibility);
    page.removeEventListener("pagehide", hidePage);
    page.removeEventListener("pageshow", showPage);
    natural?.dispose();
    natural = undefined;
    return false;
  }

  let unsubscribe: (() => void) | undefined = useStore.subscribe((next, prev) => {
    if (next.conv.run !== prev.conv.run || next.conv.active !== prev.conv.active ||
      next.conv.introOpen !== prev.conv.introOpen || next.hud.panel !== prev.hud.panel ||
      next.hud.glyph !== prev.hud.glyph || !!next.hud.fade !== !!prev.hud.fade ||
      next.hud.modeScreen !== prev.hud.modeScreen || next.settings.play !== prev.settings.play ||
      picturesOn(next.settings) !== picturesOn(prev.settings)) sync(next);
  });
  motion?.addEventListener("change", motionChanged);
  doc.addEventListener("visibilitychange", pageVisibility);
  page.addEventListener("pagehide", hidePage);
  page.addEventListener("pageshow", showPage);
  sync();

  return {
    update(conv: ConvUI, dt: number) {
      if (disposed) return false;
      // The presenter and transition can reach readiness on the existing game loop.
      if (unsubscribe) sync();
      else if (visibility.blocked() || covered(useStore.getState())) return stop();
      if (natural && !natural.update(conv, dt)) return stop();
      return !!unsubscribe || !!natural;
    },
    aim(id: string) {
      if (!unsubscribe) return;
      natural?.aim(id);
      if (shown && !natural) {
        pending = pending?.id === id ? pending : undefined;
        present(++generation);
      } else sync();
    },
    feedback(id: string, kind: SessionReaction) {
      if (!unsubscribe || !shown || motion?.matches) return;
      if (natural) natural.feedback(id, kind);
      else pending = { id, kind, at: performance.now() };
    },
    stop,
  };
}
