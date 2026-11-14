// Maple Harbor's radio (src/radio/): its name, the stations, and which course song each place's conversation is
// built on. The songs are English Master's own (its /songs/index.json), every one of them: the radio is the course's
// songs, as its Songs page has them.
import type { Station } from "../radio/playlist";
import type { SongMeta } from "../radio/songs";
import type { SituationDef } from "./types";

/** The radio set's look (src/ui/radio.css): Maple Harbor's is a navy tabletop set with brass trim. */
export const RADIO_SKIN: "maple" | "colibri" = "maple";

/** The player's name, on the set. Like the stations' names and the town's signs, it stays as it is in every learner
 *  language. */
export const RADIO_NAME = "Maple Harbor Radio";

/** A song of the course's second half (collection p, "Pažengusiems"), by its number there. The course itself has
 *  them in three parts (its atlas: "Gramatika · Antra dalis" P01–P12, "Idiomos" P13–P24; P25–P30 are the harder
 *  conversations the game's own advanced places are built on), and each part is on the station of its kind. */
const advanced = (from: number, to: number) => (song: SongMeta) => song.c === "p" && song.n >= from && song.n <= to;

/** The course's kinds of song, one station each, in the course's order; then the mix and the learner's favorites.
 *  The first one is where a new listener starts: the first grammar song. Every song is on exactly one of the first
 *  four (tests/radio.test.ts), and when one has played to its end the radio moves on to the next. `lt` says what
 *  plays; `freq` is the station's place on the set's dial. */
export const STATIONS: Station[] = [
  { id: "grammar", name: "Grammar FM", freq: 89.5, lt: "Gramatika", has: (song) => song.c === "g" || advanced(1, 12)(song) },
  { id: "vocab", name: "Vocab FM", freq: 93.1, lt: "Žodynas", has: (song) => song.c === "v" },
  { id: "situations", name: "Situations FM", freq: 96.7, lt: "Situacijos", has: (song) => song.c === "s" || advanced(25, 30)(song) },
  { id: "idioms", name: "Idioms FM", freq: 100.3, lt: "Idiomos ir šnekamoji kalba", has: advanced(13, 24) },
  { id: "random", name: "Random FM", freq: 103.9, lt: "Visos dainos, sumaišytos", kind: "mix", has: () => true },
  { id: "favorites", name: "Favorites FM", freq: 106.9, lt: "Tavo mėgstamos dainos", kind: "favorites", has: () => false },
];

/** The course's song a conversation is built on: songs 31–35 are the course's S96–S100, 62–91 its S62–S91, and the
 *  advanced ones carry the course's own id ("P25"). */
export function songOfSituation(sit: Pick<SituationDef, "song">): string | null {
  const s = sit.song;
  if (typeof s === "string") return s || null;
  if (s >= 31 && s <= 35) return `S${s + 65}`;
  if (s >= 62 && s <= 91) return `S${s}`;
  return null;
}
