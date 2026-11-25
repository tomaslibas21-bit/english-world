import { picturesOn, useStore, type ConvUI } from "../../state/store";
import type { NaturalSession, SessionReaction } from "./session";

/** Own visibility and input events until the 3D presentation can attach. */
export function bindNaturalTalk(
  options: ConstructorParameters<typeof NaturalSession>[0],
  hasArt: boolean,
  valid: () => boolean,
  blocked: () => boolean,
) {
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let natural: NaturalSession | undefined;
  let shown = false, loading = false, allowCurrent = !motion?.matches, pageHidden = false;
  let wasBlocked = blocked();
  let pending: { id: string; kind: SessionReaction; at: number } | undefined;

  function visible() {
    const { settings, hud } = useStore.getState();
    return !pageHidden && !document.hidden && !blocked() && !hud.panel &&
      settings.play !== "light" && !(hasArt && picturesOn(settings));
  }

  function suppressPendingWave() {
    if (!shown || !motion?.matches || natural) return;
    for (const { ch } of options.cast) {
      if (ch.anim === "wave") { ch.setAnim("idle"); ch.update(0); }
    }
  }

  function motionChanged() {
    if (!motion?.matches) return;
    allowCurrent = false;
    pending = undefined;
    natural?.discardPending(useStore.getState().conv);
    suppressPendingWave();
  }

  function sync() {
    if (!unsubscribe) return;
    wasBlocked = blocked();
    if (!valid() || !visible()) {
      if (shown) natural?.suspend();
      shown = allowCurrent = false;
      pending = undefined;
      return;
    }
    if (shown) return;
    shown = true;
    suppressPendingWave();
    if (natural) { natural.present(useStore.getState().conv, false); return; }
    if (loading) return;
    loading = true;
    void import("./session").then(({ NaturalSession }) => {
      loading = false;
      if (!unsubscribe || !shown || !valid() || !visible()) return;
      natural = new NaturalSession(options);
      const { conv } = useStore.getState();
      natural.present(conv, allowCurrent && !motion?.matches);
      const owner = options.audio.visualOwner;
      const repeating = owner?.replay === "turn" && owner.line === conv.speaking;
      if (pending && !motion?.matches && (performance.now() - pending.at < 500 || (pending.kind === "repeat" && repeating))) {
        natural.feedback(pending.id, pending.kind);
      }
      pending = undefined;
    }).catch(() => { loading = false; pending = undefined; });
  }

  function visibility() {
    if (natural?.releasing && (pageHidden || document.hidden)) stop();
    else sync();
  }

  function hidePage() { pageHidden = true; visibility(); }
  function showPage() { pageHidden = false; visibility(); }

  function stop(release = false) {
    unsubscribe?.();
    unsubscribe = undefined;
    pending = undefined;
    motion?.removeEventListener("change", motionChanged);
    if (release && natural && !pageHidden && !document.hidden) {
      natural.close();
      return true;
    }
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", hidePage);
    window.removeEventListener("pageshow", showPage);
    natural?.dispose();
    natural = undefined;
    return false;
  }

  let unsubscribe: (() => void) | undefined = useStore.subscribe((next, previous) => {
    if (next.conv.run !== previous.conv.run || next.conv.active !== previous.conv.active ||
      next.settings !== previous.settings || next.hud.panel !== previous.hud.panel) sync();
  });
  motion?.addEventListener("change", motionChanged);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", hidePage);
  window.addEventListener("pageshow", showPage);
  sync();

  return {
    get presentation() { return natural; },
    update(conv: ConvUI, dt: number) {
      if (unsubscribe && wasBlocked !== blocked()) sync();
      if (natural && !natural.update(conv, dt)) return stop();
      return !!unsubscribe || !!natural;
    },
    feedback(id: string, kind: SessionReaction) {
      if (!unsubscribe || !shown || !visible() || motion?.matches) return;
      if (natural) natural.feedback(id, kind);
      else pending = { id, kind, at: performance.now() };
    },
    stop,
  };
}
