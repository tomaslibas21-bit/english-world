import { localDay } from "../../state/playStats";

type Deck = typeof import("../../content/phrases/phrase-game.mh.json");
export type BoardRow = Pick<Deck["items"][number], "id" | "f" | "p" | "fClip" | "pClip" | "src">;
const strip = ["mh-001", "mh-005", "mh-036", "mh-010", "mh-029", "mh-003", "mh-008",
  "mh-004", "mh-018", "mh-009", "mh-022", "mh-020", "mh-026", "mh-030"] as const;

export function postedId(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const days = (Date.UTC(year, month - 1, date) - Date.UTC(2026, 10, 26)) / 86_400_000;
  return strip[((days % strip.length) + strip.length) % strip.length];
}

async function loadDeck() {
  return (await import("../../content/phrases/phrase-game.mh.json")).default.items;
}

interface Posting { day: string; loading: boolean; row?: BoardRow }

/** One town visit. Only the approach loads the deck. The board and the open paper share one posting. */
export class DailyBoard {
  private rows?: readonly BoardRow[];
  private loading = false;
  private nearby = false;
  private pinned = false;
  private midnight?: ReturnType<typeof setTimeout>;
  private post: Posting = { day: "", loading: true };
  private listeners = new Set<() => void>();

  constructor(private paint: (phrase: string) => void, private load: () => Promise<readonly BoardRow[]> = loadDeck) {}

  snapshot = () => this.post;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  setNearby(nearby: boolean) {
    if (nearby === this.nearby) return;
    this.nearby = nearby;
    if (nearby) {
      window.addEventListener("focus", this.refresh);
      document.addEventListener("visibilitychange", this.refresh);
      this.refresh();
    } else {
      window.removeEventListener("focus", this.refresh);
      document.removeEventListener("visibilitychange", this.refresh);
      clearTimeout(this.midnight);
    }
  }

  open() {
    this.refresh();
    this.pinned = true;
    clearTimeout(this.midnight);
  }

  close() {
    this.pinned = false;
    this.refresh();
  }

  private refresh = () => {
    clearTimeout(this.midnight);
    if (!this.nearby || document.hidden) return;
    const now = new Date();
    const day = this.pinned ? this.post.day : localDay(now.getTime());
    if (!this.pinned) {
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      this.midnight = setTimeout(this.refresh, next.getTime() - now.getTime());
    }
    if (!this.rows && !this.loading) {
      this.loading = true;
      void this.load().then((rows) => { this.rows = rows; }, () => { /* allow retry on the next visit or focus */ })
        .then(() => {
          this.loading = false;
          if (this.nearby) this.publish(this.post.day);
        });
    }
    this.publish(day);
  };

  private publish(day: string) {
    const row = this.rows?.find((item) => item.id === postedId(day));
    if (this.post.day === day && this.post.row === row && this.post.loading === this.loading) return;
    this.post = { day, row, loading: this.loading };
    if (!this.loading) this.paint(row?.f ?? "No phrase is posted today.");
    this.listeners.forEach((listener) => listener());
  }
}
