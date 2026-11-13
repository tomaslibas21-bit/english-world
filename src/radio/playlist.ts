// The order a station plays its songs in, and what the radio remembers in this browser.
import type { SongMeta } from "./songs";

/** A station: a name the town shows, what it is in the learner's language, and which songs it plays. */
export interface Station {
  id: string;
  name: string;
  lt: string;
  /** its place on the radio set's FM dial (88–108): where the needle goes */
  freq: number;
  /** starts shuffled (the learner can change it) */
  shuffle: boolean;
  has(song: SongMeta): boolean;
}

/** A small seeded generator (mulberry32): the same seed gives the same shuffle, so the place in it survives a reload. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The station's songs in playing order: the list's own order, or a shuffle of it by `seed`. */
export function stationOrder(songs: SongMeta[], station: Station, shuffle: boolean, seed: number): string[] {
  const ids = songs.filter((s) => station.has(s)).map((s) => s.id);
  if (!shuffle) return ids;
  const random = rng(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** The song after (`dir` 1) or before (-1) `current` in `order`; the first one when `current` isn't in it. `wrapped`:
 *  the order was gone through to its end (a shuffled station then takes a new shuffle). */
export function step(order: string[], current: string | null, dir: 1 | -1): { id: string | null; wrapped: boolean } {
  if (!order.length) return { id: null, wrapped: false };
  const i = current === null ? -1 : order.indexOf(current);
  if (i < 0) return { id: order[0], wrapped: false };
  const j = i + dir;
  return { id: order[(j + order.length) % order.length], wrapped: j >= order.length };
}

/** What the radio keeps between visits (this browser only). */
export interface RadioSaved {
  on: boolean;
  station: string;
  /** null: as the station starts */
  shuffle: boolean | null;
  seed: number;
  /** the song the station is at, and how far into it */
  song: string | null;
  at: number;
  /** the lyric strip is shown */
  lyrics: boolean;
  /** the radio set has opened by itself once, the first time the radio was turned on */
  introduced: boolean;
}

export const RADIO_DEFAULTS: RadioSaved = { on: false, station: "", shuffle: null, seed: 1, song: null, at: 0, lyrics: true, introduced: false };

export function readSaved(raw: string | null): RadioSaved {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<RadioSaved> | null;
    if (!v || typeof v !== "object") return { ...RADIO_DEFAULTS };
    return {
      on: v.on === true,
      station: typeof v.station === "string" ? v.station : "",
      shuffle: typeof v.shuffle === "boolean" ? v.shuffle : null,
      seed: Number.isFinite(v.seed) ? Number(v.seed) >>> 0 : 1,
      song: typeof v.song === "string" ? v.song : null,
      at: Number.isFinite(v.at) && Number(v.at) > 0 ? Number(v.at) : 0,
      lyrics: v.lyrics !== false,
      introduced: v.introduced === true,
    };
  } catch { return { ...RADIO_DEFAULTS }; }
}

export function loadSaved(key: string): RadioSaved {
  try { return readSaved(localStorage.getItem(key)); } catch { return { ...RADIO_DEFAULTS }; }
}

export function storeSaved(key: string, saved: RadioSaved): void {
  try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* no storage: remembered for this visit only */ }
}
