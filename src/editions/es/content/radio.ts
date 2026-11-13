// Puerto Colibrí's radio (src/radio/): the stations, and which course song each place's conversation is built on.
// Replaces src/content/radio.ts in this edition. The songs are the Spanish course's own (its /songs/index.json:
// Spanish Master English's 186 with the bilingual ones, Spanish Master's 130); a station picks among them by the
// list's genre.
import type { Station } from "../../../radio/playlist";
import type { SituationDef } from "../../../content/types";

/** The sounds of the Caribbean coast the town is on, and their close kin. Not reggaetón: "reggae" as a whole word. */
const CARIBBEAN = /cumbia|bachata|bolero|salsa|guaracha|vallenato|merengue|\bson\b|mambo|champeta|plena|\breggae\b|bossa|cha-cha|guajira|boogaloo/i;

/** The radio set's look (src/ui/radio.css): Puerto Colibrí's is a hand-painted teal set under papel picado. */
export const RADIO_SKIN: "maple" | "colibri" = "colibri";

/** The first one is where a new listener starts. The names are Spanish and stay as they are in every learner
 *  language, like the town's signs; `lt` says what plays, in Lithuanian like every interface string, and is shown
 *  through L() (src/editions/es/ui/strings.ts has its English). `freq` is the station's place on the set's dial. */
export const STATIONS: Station[] = [
  { id: "colibri", name: "Radio Colibrí", freq: 96.5, lt: "Karibų ritmai: kumbija, bačata, salsa", shuffle: true, has: (song) => CARIBBEAN.test(song.g) },
  { id: "todas", name: "Todas las canciones", freq: 103.1, lt: "visos kurso dainos", shuffle: false, has: () => true },
];

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
