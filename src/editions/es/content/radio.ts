// Puerto Colibrí's radio (src/radio/): the stations, and which course song each place's conversation is built on.
// Replaces src/content/radio.ts in this edition. The songs are the Spanish course's own (its /songs/index.json:
// Spanish Master English's 186 with the bilingual ones, Spanish Master's 130); a station picks among them by the
// list's genre.
import type { Station } from "../../../radio/playlist";
import type { SituationDef } from "../../../content/types";

/** The sounds of the Caribbean coast the town is on, and their close kin. Not reggaetón: "reggae" as a whole word. */
const CARIBBEAN = /cumbia|bachata|bolero|salsa|guaracha|vallenato|merengue|\bson\b|mambo|champeta|plena|\breggae\b|bossa|cha-cha|guajira|boogaloo/i;

/** The first one is where a new listener starts. The names are Spanish, like the town's signs; `lt` says what plays,
 *  in Lithuanian like every interface string, and is shown through L() (src/editions/es/ui/strings.ts has its English). */
export const STATIONS: Station[] = [
  { id: "colibri", name: "Radio Colibrí", lt: "Karibų ritmai: kumbija, bačata, salsa", shuffle: true, has: (song) => CARIBBEAN.test(song.g) },
  { id: "todas", name: "Todas las canciones", lt: "visos kurso dainos", shuffle: false, has: () => true },
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
