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

/** The station's songs in playing order: the list's own order, or a shuffle of it by `seed`.
 *
 *  The shuffle is a fair mix of the course's kinds of song (its collections: grammar, vocabulary, situations,
 *  bilingual…). A plain shuffle can put five songs of one kind at the start by chance; here each kind is shuffled by
 *  itself and then spread evenly through the whole order, each from a random starting point. Any stretch of the order
 *  holds the kinds in about the station's own proportions, and two songs of a small kind are never close together. */
export function stationOrder(songs: SongMeta[], station: Station, shuffle: boolean, seed: number): string[] {
  const mine = songs.filter((s) => station.has(s));
  if (!shuffle) return mine.map((s) => s.id);
  const random = rng(seed);
  const kinds = new Map<string, string[]>();
  for (const s of mine) { const k = s.c || ""; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k)!.push(s.id); }
  const placed: { id: string; at: number }[] = [];
  for (const ids of kinds.values()) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    // this kind's songs at even steps through the order, the first one anywhere within a step, each a little off
    // its mark so that the kinds don't fall into a fixed pattern
    const start = random();
    ids.forEach((id, k) => placed.push({ id, at: (k + start + (random() - 0.5) * 0.4) / ids.length }));
  }
  return placed.sort((a, b) => a.at - b.at).map((p) => p.id);
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
