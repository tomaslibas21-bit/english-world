// The heart: the learner's favorite songs. They are the course's own favorites, the ones its Songs page shows and
// its account keeps (fluent-steps src/lib/songs/favorites.ts, the same file in the Spanish courses): one note in
// this browser's storage, which the game's page shares with the course because it is a page of the same site.
//   fluentsteps.songs.favorites.v1   { "<song id>": { liked: true | false, at: <ms> }, … }
// A heart taken back stays in the note as `liked: false` with its time: that is how the course's account sync
// (its src/lib/sync/merge.ts mergeSongFavorites) knows the later of two devices' choices, so the note is written
// here exactly as the course writes it. The sync itself runs in the course's pages: a heart given in the game goes
// to the account when a page of the course is next open in this browser (at once, if one is open in another tab),
// the same way the game's own progress does.

/** The course's note, and the event its pages listen to. */
export const FAVORITES_KEY = "fluentsteps.songs.favorites.v1";
export const FAVORITES_EVENT = "fluentsteps:song-favorites";

export type Favorites = Record<string, { liked: boolean; at: number }>;

/** A song id as the course's note takes it. */
const ID = /^[A-Z]+\d{2,3}$/;

/** The note's entries that are well-formed (the course reads it the same way). */
export function readFavorites(raw: string | null): Favorites {
  const out: Favorites = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out;
    for (const [id, value] of Object.entries(parsed as Record<string, { liked?: unknown; at?: unknown } | null>)) {
      if (ID.test(id) && value && typeof value === "object" && typeof value.liked === "boolean" && typeof value.at === "number" && Number.isFinite(value.at)) {
        out[id] = { liked: value.liked, at: value.at };
      }
    }
  } catch { /* an unreadable note counts as no hearts; the next heart writes a good one */ }
  return out;
}

/** The songs with a heart. */
export const likedSongs = (favorites: Favorites): string[] => Object.keys(favorites).filter((id) => favorites[id].liked);

/** The note with `id`'s heart given or taken back at `now`: always later than the entry it replaces, so that the
 *  account's merge takes this choice. Null for an id the course's note wouldn't keep. */
export function withToggled(favorites: Favorites, id: string, now: number): Favorites | null {
  if (!ID.test(id)) return null;
  const before = favorites[id];
  return { ...favorites, [id]: { liked: !before?.liked, at: Math.max(now, (before?.at ?? 0) + 1) } };
}

/** The hearts as the radio uses them. */
export interface FavoriteStore {
  /** the ids of the songs with a heart, as they are now */
  list(): string[];
  /** give `id` a heart, or take it back; whether it has one now */
  toggle(id: string): boolean;
}

/** The course's favorites in this browser. Without storage (a private window) the hearts last for the visit. */
export function courseFavorites(key = FAVORITES_KEY): FavoriteStore {
  let memory: Favorites | null = null;
  const read = (): Favorites => {
    if (memory) return memory;
    try { return readFavorites(localStorage.getItem(key)); } catch { return {}; }
  };
  return {
    list: () => likedSongs(read()),
    toggle(id) {
      const before = read(), next = withToggled(before, id, Date.now());
      if (!next) return !!before[id]?.liked;
      try { localStorage.setItem(key, JSON.stringify(next)); memory = null; } catch { memory = next; }
      // a course page in this window would hear this; its other tabs hear the storage event by themselves
      try { window.dispatchEvent(new Event(FAVORITES_EVENT)); } catch { /* no window: a test */ }
      return next[id].liked;
    },
  };
}
