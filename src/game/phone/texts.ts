import { SITUATIONS } from "../../content/situations/catalog";
import { TEXT_THREADS, type TextThread } from "../../content/texts";
import type { Progress, TextProgress } from "../../state/progress";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { freeToWalk, routeOrder, type PhoneSnapshot, type RouteEntry } from "./schedule";

export const TEXT_WAIT = { later: 480, initial: 180, between: 1800, calm: 45, cardGap: 60, arrival: 8 };

export function localDay(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
}

/** Returns a new value only when there is something to save. An absent texts section is a legacy save. */
export function queueTexts(threads: readonly TextThread[], progress: Pick<Progress, "sits" | "texts">, day: string, played: number) {
  const existing = progress.texts;
  const newlyCompleted = threads.filter(({ id, after }) =>
    progress.sits[after]?.completions && !existing?.pending[id] && !existing?.got[id]);
  if (existing && !newlyCompleted.length) return existing;
  const pending = { ...existing?.pending };
  for (const { id } of newlyCompleted) pending[id] = existing ? { day, played } : { day: "", played: 0 };
  return { ...existing, pending, got: existing?.got ?? {} } satisfies TextProgress;
}

export function eligibleText(thread: TextThread, pending: TextProgress["pending"][string], day: string, played: number, previousSession: boolean) {
  if (!pending.day) return true;
  return thread.wait === "nextDay" ? day > pending.day : previousSession || played - pending.played >= TEXT_WAIT.later;
}

export function nextText(ordered: readonly TextThread[], progress: TextProgress | undefined, day: string, played: number, previous: ReadonlySet<string>, force = false) {
  return ordered.find((thread) => {
    const pending = progress?.pending[thread.id];
    return pending && !progress?.got[thread.id] && (force || eligibleText(thread, pending, day, played, previous.has(thread.id)));
  });
}

export function textsInRoute(threads: readonly TextThread[], route: readonly RouteEntry[]) {
  const order = new Map([...route].sort(routeOrder).map(({ id }, i) => [id, i]));
  return [...threads].sort((a, b) => (order.get(a.after) ?? Infinity) - (order.get(b.after) ?? Infinity));
}

function freeForText(s: PhoneSnapshot) {
  return s.visible && freeToWalk(s) && !s.cardOpen;
}

export function canDeliverText(s: PhoneSnapshot, t: { enabled: boolean; active: number; calm: number; sinceCall: number; sinceText: number; force?: boolean }) {
  return t.enabled && freeForText(s) && !s.guide && !s.banner && t.sinceCall >= TEXT_WAIT.cardGap &&
    (t.force || (t.active >= TEXT_WAIT.initial && t.calm >= TEXT_WAIT.calm && t.sinceText >= TEXT_WAIT.between));
}

export function unreadTexts(texts: TextProgress | undefined) {
  return TEXT_THREADS.filter(({ id }) => texts?.got[id] && !texts.got[id].read).length;
}

const ordered = textsInRoute(TEXT_THREADS, SITUATIONS);

export class TownTexts {
  private previous = new Set(Object.keys(useStore.getState().progress.texts?.pending ?? {}));
  private checked?: Progress;
  private count = 0;
  private last = -Infinity;
  private remaining = 0;
  private force = false;

  dueNow() { this.force = true; }

  private sync(played: number, day: string) {
    const st = useStore.getState();
    if (this.checked === st.progress) return;
    const texts = queueTexts(ordered, st.progress, day, played);
    if (texts !== st.progress.texts) {
      st.updateProgress((p) => {
        p.texts = texts;
        if (Object.keys(texts.pending).length) {
          p.phone ??= { played, missed: {} };
          p.phone.played = played;
        }
      });
    }
    this.checked = useStore.getState().progress;
  }

  private clear(played: number) {
    const st = useStore.getState();
    this.remaining = 0;
    st.setHud({ textArrival: null });
    st.updateProgress((p) => { if (p.phone) p.phone.played = p.phone.lastText = played; });
  }

  observe(snapshot: PhoneSnapshot, played: number) {
    const st = useStore.getState();
    if (this.remaining > 0 && (!st.hud.textArrival || !freeForText({ ...snapshot, grounded: true }) || !st.settings.textMessages)) this.clear(played);
  }

  tick(snapshot: PhoneSnapshot, dt: number, played: number, active: number, calm: number, sinceCall: number) {
    const day = localDay();
    this.sync(played, day);
    this.observe(snapshot, played);
    const st = useStore.getState();
    if (st.hud.textArrival) {
      this.remaining -= dt;
      if (this.remaining <= 0) this.clear(played);
      return;
    }
    if (!canDeliverText(snapshot, { enabled: st.settings.textMessages, active, calm, sinceCall, sinceText: played - this.last, force: this.force })) return;
    const thread = nextText(ordered, st.progress.texts, day, played, this.previous, this.force);
    if (!thread) return;
    this.force = false;
    this.count++;
    this.last = played;
    this.remaining = TEXT_WAIT.arrival;
    st.updateProgress((p) => {
      const texts = p.texts!;
      delete texts.pending[thread.id];
      texts.got[thread.id] = { at: Date.now() };
      p.phone ??= { played, missed: {} };
      p.phone.played = p.phone.lastText = played;
    });
    st.setHud({ textArrival: thread.id });
    audio.sfx("message");
    navigator.vibrate?.(60);
  }

  state(played: number) {
    const { progress } = useStore.getState();
    return { pending: progress.texts?.pending ?? {}, got: progress.texts?.got ?? {}, unread: unreadTexts(progress.texts),
      sessionCount: this.count, due: nextText(ordered, progress.texts, localDay(), played, this.previous, this.force)?.id ?? null };
  }
}
