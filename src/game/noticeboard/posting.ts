import { EDITION } from "../../edition";
import { loadPcPhraseDeck } from "../../editions/es/content/phrases/deck";
import { localDay } from "../../state/playStats";

type Deck = Awaited<ReturnType<typeof loadPcPhraseDeck>>;
export type BoardRow = Pick<Deck[number], "id" | "f" | "p" | "fClip" | "pClip" | "src">;
const strip = ["001", "006", "005", "129", "009", "002", "018", "012", "021", "014", "016", "024", "025", "040"];

export function postedId(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const days = (Date.UTC(year, month - 1, date) - Date.UTC(2026, 10, 26)) / 86_400_000;
  const slot = ((days % strip.length) + strip.length) % strip.length;
  return `pc-${EDITION.helper}-${strip[slot]}`;
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

  constructor(private paint: (phrase: string) => void, private load: () => Promise<readonly BoardRow[]> = loadPcPhraseDeck) {}

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
    if (!this.loading) this.paint(row?.f ?? "Hoy no hay frase en el tablero.");
    this.listeners.forEach((listener) => listener());
  }
}
