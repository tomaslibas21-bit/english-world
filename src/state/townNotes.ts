import type { HudState, Toast } from "./store";

export function townNote(hud: Pick<HudState, "zoneBanner" | "coach" | "phoneCard" | "textArrival">) {
  return hud.phoneCard ? "phone" : hud.zoneBanner ? "banner" : hud.coach ? "guide" : hud.textArrival ? "text" : "toast";
}

export function toastDuration(t: Omit<Toast, "id">) {
  return t.ms ?? (t.kind === "tip" ? 9000 : t.kind === "stamp" ? 7000 : 4500);
}

export interface TownToast {
  toast: Toast;
  queuedAt: number | null;
  startedAt: number | null;
  remaining: number;
}

export function enqueueTownToasts(queue: TownToast[], toasts: Toast[], now: number): TownToast[] {
  return [...queue, ...toasts.map((toast) => ({ toast, queuedAt: now, startedAt: null, remaining: Math.max(3000, toastDuration(toast)) }))];
}

/** Only the first toast can be on screen. Pause its time if another note takes over. */
export function advanceTownToasts(queue: TownToast[], canShow: boolean, now: number): TownToast[] {
  const head = queue[0];
  if (!head) return queue;
  if (head.startedAt !== null) {
    const remaining = head.remaining - (now - head.startedAt);
    if (remaining <= 0) return advanceTownToasts(queue.slice(1), canShow, now);
    if (!canShow) return [{ ...head, startedAt: null, remaining }, ...queue.slice(1)];
    return queue;
  }
  if (!canShow) return queue;
  const ready = queue.findIndex(({ toast, queuedAt }) =>
    toast.kind === "stamp" || toast.kind === "success" || queuedAt === null || now - queuedAt <= 20000);
  if (ready === -1) return [];
  return [{ ...queue[ready], queuedAt: null, startedAt: now }, ...queue.slice(ready + 1)];
}
