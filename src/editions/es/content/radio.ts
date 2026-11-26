// Puerto Colibrí's radio (src/radio/): its name, the stations, and which course song each place's conversation is
// built on. Replaces src/content/radio.ts in this edition. The songs are the Spanish course's own (its
// /songs/index.json: Spanish Master English's 186 with the bilingual ones, Spanish Master's 130), every one of them:
// the radio is the course's songs, as its Songs page has them.
import { EDITION } from "../../../edition";
import type { Station, TalkStation } from "../../../radio/playlist";
import type { SituationDef } from "../../../content/types";

/** The radio set's look (src/ui/radio.css): Puerto Colibrí's is a hand-painted teal set under papel picado. */
export const RADIO_SKIN: "maple" | "colibri" = "colibri";

/** The player's name, on the set. Spanish, like the stations' names and the town's signs, in every learner language. */
export const RADIO_NAME = "Radio Puerto Colibrí";

/** The course's kinds of song, one station each, in the course's order; then the mix and the learner's favorites.
 *  The first one is where a new listener starts: the first grammar song. Every song is on exactly one of the first
 *  four (tests/es/radio.test.ts), and when one has played to its end the radio moves on to the next. Spanish Master
 *  (Lithuanian learners) has no bilingual songs. The names are Spanish and
 *  stay as they are in every learner language; `lt` says what plays, in Lithuanian like every interface string, and
 *  is shown through L() (src/editions/es/ui/strings.ts has its English). `freq` is the station's place on the dial. */
const musicStations: Station[] = [
  { source: "songs", id: "grammar", name: "Gramática FM", freq: 89.5, lt: "Gramatika", has: (song) => song.c === "g" },
  { source: "songs", id: "vocab", name: "Vocabulario FM", freq: 93.1, lt: "Žodynas", has: (song) => song.c === "v" },
  { source: "songs", id: "situations", name: "Situaciones FM", freq: 96.7, lt: "Situacijos", has: (song) => song.c === "s" },
  { source: "songs", id: "bilingual", name: "Bilingüe FM", freq: 100.3, lt: "Dvikalbės: angliškai, tada ispaniškai", has: (song) => song.c === "b" },
  { source: "songs", id: "random", name: "Al Azar FM", freq: 103.9, lt: "Visos dainos, sumaišytos", kind: "mix", has: () => true },
  { source: "songs", id: "favorites", name: "Favoritas FM", freq: 106.9, lt: "Tavo mėgstamos dainos", kind: "favorites", has: () => false },
];

export const STATIONS = EDITION.helper === "lt" ? musicStations.filter(({ id }) => id !== "bilingual") : musicStations;

export const BOOK_STATION = { source: "books", id: "books", freq: 91.3, name: "Libros FM", lt: "Garsinės knygos ir istorijos" } as const satisfies TalkStation;

/** The course's song a conversation is built on. The game's song numbers are English Master's; its situation songs
 *  S62–S91 and S96–S100 (numbers 31–35) are SS01–SS35 in the Spanish courses, in the same order (the course's
 *  scripts/game/game-links.json). The advanced conversations have no song of their own here. */
export function songOfSituation(sit: Pick<SituationDef, "song">): string | null {
  const s = sit.song;
  if (typeof s !== "number") return null;
  if (s >= 62 && s <= 91) return `SS${String(s - 61).padStart(2, "0")}`;
  if (s >= 31 && s <= 35) return `SS${s}`;
  return null;
}
