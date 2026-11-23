import { PHONE_CALLS } from "../../content/phoneCalls";
import type { SituationMeta } from "../../content/types";
import type { Progress } from "../../state/progress";

export const PHONE_WAIT = { initial: 120, between: 240, calm: 10, answer: 25, retry: 360 };
export const MAX_PRESENTATIONS = 3;

export interface PhoneSnapshot {
  town: boolean;
  onFoot: boolean;
  grounded: boolean;
  visible: boolean;
  enabled: boolean;
  conversation: boolean;
  panel: boolean;
  dialog: boolean;
  guide: boolean;
  banner: boolean;
  cardOpen: boolean;
  flight: boolean;
  loading: boolean;
  transition: boolean;
  mode: boolean;
}

export interface PhoneTimers {
  active: number;
  sinceCard: number;
  calm: number;
  forceDue?: boolean;
}

export function freeToWalk(s: PhoneSnapshot) {
  return s.town && s.onFoot && s.grounded && !s.conversation && !s.panel && !s.dialog && !s.flight && !s.loading && !s.transition && !s.mode;
}

export function canShowPhoneCard(s: PhoneSnapshot, t: PhoneTimers) {
  return s.enabled && s.visible && !s.guide && !s.banner && !s.cardOpen && freeToWalk(s) && t.calm >= PHONE_WAIT.calm
    && (t.forceDue || (t.active >= PHONE_WAIT.initial && t.sinceCard >= PHONE_WAIT.between));
}

export type RouteEntry = Pick<SituationMeta, "id" | "chapter" | "order">;
export const routeOrder = (a: RouteEntry, b: RouteEntry) => a.chapter - b.chapter || a.order - b.order;

export function nextPhoneCall(route: readonly RouteEntry[], progress: Pick<Progress, "sits" | "phone">, played: number) {
  let chapter = -Infinity, firstOrder = Infinity;
  for (const entry of route) {
    if (!progress.sits[entry.id]?.completions) continue;
    if (entry.chapter > chapter) {
      chapter = entry.chapter;
      firstOrder = entry.order;
    } else if (entry.chapter === chapter) firstOrder = Math.min(firstOrder, entry.order);
  }
  let next: RouteEntry | undefined;
  for (const entry of route) {
    if (!Object.hasOwn(PHONE_CALLS, entry.id) || progress.sits[entry.id]?.completions) continue;
    if (entry.chapter > chapter || (entry.chapter === chapter && entry.order <= firstOrder)) continue;
    const missed = progress.phone?.missed[entry.id];
    if (missed && (missed.presentations >= MAX_PRESENTATIONS || played < missed.retryAt)) continue;
    if (!next || routeOrder(entry, next) < 0) next = entry;
  }
  return next?.id ?? null;
}
