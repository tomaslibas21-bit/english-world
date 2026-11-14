// Anonymous counts for the course's statistics page, sent the way the course sends its own (fluent-steps and the
// Spanish courses: src/lib/stats/track.ts): an event's name, a few plain properties, the page and a random id of this
// open tab, kept in memory only. Small batches go straight to the course database's public insert (events table,
// insert only). No account, no cookie, nothing stored about the learner.
//
// The game has no address or key of its own: the course writes its public ones into this site's storage under
// ENDPOINT_KEY, and only where it counts at all (its published site, not a browser that asks not to be tracked).
// Without them (the game's own dev server, another site, a learner who never opened the course here) nothing is sent.

export const ENDPOINT_KEY = "ew-stats-endpoint";

type Props = Record<string, string | number | boolean>;
type Row = { name: string; props: Props; session: string; path: string };

const session = Math.random().toString(36).slice(2, 12).padEnd(8, "0");
let queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let attached = false;

/** The course's public address and key, when the course left them here. */
export function endpoint(): { url: string; key: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return null;
    const v = JSON.parse(localStorage.getItem(ENDPOINT_KEY) || "null");
    if (!v || typeof v.url !== "string" || typeof v.key !== "string") return null;
    if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(v.url.replace(/\/+$/, "")) || !v.key) return null;
    return { url: v.url.replace(/\/+$/, ""), key: v.key };
  } catch {
    return null;
  }
}

function flush() {
  clearTimeout(timer);
  timer = undefined;
  const to = endpoint();
  const rows = queue;
  queue = [];
  if (!rows.length || !to) return;
  // keepalive: a batch sent as the page closes still arrives
  void fetch(`${to.url}/rest/v1/events`, {
    method: "POST",
    keepalive: true,
    headers: { apikey: to.key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  }).catch(() => { /* counts are a nice-to-have: a lost batch is not retried */ });
}

/** Counts one event. `name`: lowercase letters, digits and "._:-" (the course's table checks it). */
export function sendStat(name: string, props: Props = {}) {
  if (!endpoint()) return;
  if (!attached) {
    attached = true;
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    window.addEventListener("pagehide", flush);
  }
  queue.push({ name, props, session, path: location.pathname.slice(0, 200) });
  if (queue.length >= 20) flush();
  else timer ??= setTimeout(flush, 10_000);
}
