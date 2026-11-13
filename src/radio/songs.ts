// The course's songs, as the radio reads them. The game makes no song files of its own: it plays the ones the course
// it sits in already has (fluent-steps src/lib/songs/types.ts describes them, and the Spanish courses' are the same):
//   the list         <site>/songs/index.json            public; each song's id, title, genre, length and recording
//   a song's words   <files>/songs/data/<id>.json       the lines with their timing and word glosses; course file
//   its recording    the list's `a`                     an MP3 on the files host; course file
// Course files come from the course's files Worker with the files token the game already has (src/game/audio.ts
// filesToken(); fluent-steps docs/FILE-PROTECTION.md). A course's free examples are not in that folder: their copies
// stay on the course's site (its src/lib/files/rules.ts says which, and the game doesn't know), so a file the folder
// doesn't have is asked for once more at the same path on the site. The build says where they are:
//   VITE_RADIO_INDEX        the list's address, e.g. "/songs/index.json". Without it the game has no radio.
//   VITE_RADIO_FILES        the files Worker's folder, e.g. "https://audio.dvikalbesdainos.lt/fluent-steps". Without
//                           it the songs' files are read from the list's own site, with no token (a local trial).
//   VITE_RADIO_RECORDINGS   another folder the list's recordings may be named in, which the files Worker reads for
//                           this course (Spanish Master English: "https://audio.dvikalbesdainos.lt/spanish-master").

/** One song of the list (public/songs/index.json). */
export interface SongMeta {
  id: string;
  /** collection: g grammar, v vocabulary, s situations, and a course's own (p advanced, b bilingual) */
  c: string;
  n: number;
  /** the title in the song's language, and in the learner's */
  t: string;
  tl: string;
  /** topic and genre */
  tp: string;
  g: string;
  /** length in seconds */
  d: number;
  /** the recording: a path of the course's site, or an address on the files host */
  a: string;
}

/** [the sung words, their gloss (may hold a "(literal meaning)"), how many words] */
export type SongUnit = [string, string, number];

export interface SongLine {
  /** sung from / to (seconds) */
  s: number;
  e: number;
  src: string;
  /** the line in the learner's language */
  lt: string;
  u: SongUnit[];
  /** each word's [start, end], and its text */
  w: [number, number][];
  wt: string[];
  /** A bilingual song (the Spanish courses' collection b): the line is first sung in the learner's language, `lt`
   *  word by word, then in the song's. This is that first singing: its start, end and each word's [start, end], one
   *  per word of `lt`. `s`, `e` and `w` stay the second singing's. */
  en?: { s: number; e: number; w?: [number, number][] };
  /** set by the radio on a row it makes for that first singing (lyrics.ts withSungTranslations) */
  part?: "translation";
}

export interface Song extends SongMeta { L: SongLine[] }

export interface RadioConfig { index: string; files: string | null; recordings: string | null }

const trimmed = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/\/+$/, "") : null);

/** Where this build's songs are, or null: no radio. */
export function radioConfig(env: Record<string, unknown> = import.meta.env ?? {}): RadioConfig | null {
  const index = typeof env.VITE_RADIO_INDEX === "string" ? env.VITE_RADIO_INDEX.trim() : "";
  if (!index) return null;
  return { index, files: trimmed(env.VITE_RADIO_FILES), recordings: trimmed(env.VITE_RADIO_RECORDINGS) };
}

const withToken = (url: string, token?: string | null) =>
  token ? `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}` : url;

/** The list's site, for a song file read from there (no files folder: a local trial). */
const site = (cfg: RadioConfig) => cfg.index.replace(/\/songs\/[^/]*$/, "");

/** Where a song's words and timing are: the addresses to try, in order. */
export function songDataUrls(cfg: RadioConfig, id: string, token?: string | null): string[] {
  const path = `/songs/data/${encodeURIComponent(id)}.json`;
  return cfg.files ? [withToken(cfg.files + path, token), site(cfg) + path] : [site(cfg) + path];
}

/** Where a song's recording is: the addresses to try, in order. The token goes only to the course's files folder,
 *  never to another address. */
export function songAudioUrls(cfg: RadioConfig, song: Pick<SongMeta, "a">, token?: string | null): string[] {
  const a = song.a;
  if (a.startsWith("/") && !a.startsWith("//")) return cfg.files ? [withToken(cfg.files + a, token), site(cfg) + a] : [site(cfg) + a];
  if (cfg.files) {
    for (const root of [cfg.files, cfg.recordings]) {
      if (root && a.startsWith(root + "/")) return [withToken(cfg.files + a.slice(root.length), token)];
    }
  }
  return [a];
}

/** The songs of a list file that can be played (anything else in it is skipped). */
export function readSongList(data: unknown): SongMeta[] {
  const songs = (data as { songs?: unknown } | null)?.songs;
  if (!Array.isArray(songs)) return [];
  return songs.filter((s): s is SongMeta =>
    !!s && typeof s.id === "string" && typeof s.a === "string" && typeof s.t === "string")
    .map((s) => ({ ...s, tl: typeof s.tl === "string" ? s.tl : "", tp: typeof s.tp === "string" ? s.tp : "", g: typeof s.g === "string" ? s.g : "", d: Number(s.d) || 0 }));
}

/** A song file's lines, with the ones that can't be shown in time left out. */
export function readSongLines(data: unknown): SongLine[] {
  const lines = (data as { L?: unknown } | null)?.L;
  if (!Array.isArray(lines)) return [];
  return lines.filter((l): l is SongLine =>
    !!l && Number.isFinite(l.s) && Number.isFinite(l.e) && Array.isArray(l.u) && l.u.length > 0 && Array.isArray(l.w));
}
