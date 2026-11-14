// The stations, the order each plays its songs in, and what the radio remembers in this browser.
//
// A station is a playlist of the course's songs. Most are one of the course's own kinds of song (its grammar songs,
// its vocabulary songs…): together they hold every song once, each in the course's order, and when one has played
// to its end the radio moves on to the next (nextStation). Two are different:
//   "mix"        every song of the course, always shuffled (the fair mix below); it never ends
//   "favorites"  the songs the learner gave a heart (src/radio/favorites.ts); it starts over at its end
import type { SongMeta } from "./songs";

/** A station: a name the town shows, what it is in the learner's language, and which songs it plays. */
export interface Station {
  id: string;
  name: string;
  lt: string;
  /** its place on the radio set's FM dial (88–108): where the needle goes */
  freq: number;
  /** none: one of the course's kinds of song, played in the course's order unless the learner shuffles it */
  kind?: "mix" | "favorites";
  /** the songs it plays ("favorites": never asked, the hearts decide) */
  has(song: SongMeta): boolean;
}

const NONE: ReadonlySet<string> = new Set();

/** The station's songs, in the list's order (the course's). */
export function stationSongs(songs: SongMeta[], station: Station, favorites: ReadonlySet<string> = NONE): SongMeta[] {
  return songs.filter((s) => (station.kind === "favorites" ? favorites.has(s.id) : station.has(s)));
}

/** A station that is always shuffled; the others follow the learner's shuffle key. */
export const shuffled = (station: Station | undefined, key: boolean) => (station?.kind === "mix" ? true : key);

/** The station the radio moves on to when `from` has played to its end (`dir` 1), or the one before it (-1): the
 *  next of the course's kinds of song that has songs, round and round. From a station outside that round (the
 *  favorites, once the last heart is gone) it is the first. Null: nowhere to go (the round is empty, or is `from`
 *  alone). */
export function nextStation(stations: Station[], counts: Record<string, number>, from: string, dir: 1 | -1 = 1): Station | null {
  const round = stations.filter((s) => !s.kind && (counts[s.id] ?? 0) > 0);
  if (!round.length) return null;
  const i = round.findIndex((s) => s.id === from);
  if (i < 0) return round[0];
  const next = round[(i + dir + round.length) % round.length];
  return next.id === from ? null : next;
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
export function stationOrder(songs: SongMeta[], station: Station, shuffle: boolean, seed: number, favorites: ReadonlySet<string> = NONE): string[] {
  const mine = stationSongs(songs, station, favorites);
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
 *  the order was gone through to its end (the radio then moves on to the next station, or takes a new shuffle);
 *  `before`: the step went back from the first song (to the station before). */
export function step(order: string[], current: string | null, dir: 1 | -1): { id: string | null; wrapped: boolean; before: boolean } {
  if (!order.length) return { id: null, wrapped: false, before: false };
  const i = current === null ? -1 : order.indexOf(current);
  if (i < 0) return { id: order[0], wrapped: false, before: false };
  const j = i + dir;
  return { id: order[(j + order.length) % order.length], wrapped: j >= order.length, before: j < 0 };
}

/** What the radio keeps between visits (this browser only). */
export interface RadioSaved {
  on: boolean;
  station: string;
  /** the learner's shuffle key: the station's songs in a shuffled order (the mix is shuffled without it) */
  shuffle: boolean;
  seed: number;
  /** the song the station is at, and how far into it */
  song: string | null;
  at: number;
  /** where each station was left, so that coming back to it goes on from there (station id → song id) */
  places: Record<string, string>;
  /** the lyric strip is shown */
  lyrics: boolean;
  /** the radio set has opened by itself once, the first time the radio was turned on */
  introduced: boolean;
}

export const RADIO_DEFAULTS: RadioSaved = { on: false, station: "", shuffle: false, seed: 1, song: null, at: 0, places: {}, lyrics: true, introduced: false };

export function readSaved(raw: string | null): RadioSaved {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<RadioSaved> | null;
    if (!v || typeof v !== "object") return { ...RADIO_DEFAULTS, places: {} };
    const places: Record<string, string> = {};
    if (v.places && typeof v.places === "object" && !Array.isArray(v.places)) {
      for (const [station, id] of Object.entries(v.places)) if (typeof id === "string" && id) places[station] = id;
    }
    return {
      on: v.on === true,
      station: typeof v.station === "string" ? v.station : "",
      shuffle: v.shuffle === true,
      seed: Number.isFinite(v.seed) ? Number(v.seed) >>> 0 : 1,
      song: typeof v.song === "string" ? v.song : null,
      at: Number.isFinite(v.at) && Number(v.at) > 0 ? Number(v.at) : 0,
      places,
      lyrics: v.lyrics !== false,
      introduced: v.introduced === true,
    };
  } catch { return { ...RADIO_DEFAULTS, places: {} }; }
}

/** What is remembered under `key`. A first visit after the radio of 13 Nov 2026 (`before`: its note, with other
 *  stations and a shuffle that started on) keeps only that the radio was on and whether the strip was shown: the
 *  radio starts at the first station's first song, and its set opens once more to show the stations. */
export function loadSaved(key: string, before?: string): RadioSaved {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null || !before) return readSaved(raw);
    const old = readSaved(localStorage.getItem(before));
    return { ...RADIO_DEFAULTS, places: {}, on: old.on, lyrics: old.lyrics };
  } catch { return { ...RADIO_DEFAULTS, places: {} }; }
}

export function storeSaved(key: string, saved: RadioSaved): void {
  try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* no storage: remembered for this visit only */ }
}
