// Maple Harbor's radio (src/radio/): the stations, and which course song each place's conversation is built on.
// The songs are English Master's own (its /songs/index.json); a station picks among them by the list's genre text.
import type { Station } from "../radio/playlist";
import type { SituationDef } from "./types";

const genre = (re: RegExp): Station["has"] => (song) => re.test(song.g);

/** The radio set's look (src/ui/radio.css): Maple Harbor's is a navy tabletop set with brass trim. */
export const RADIO_SKIN: "maple" | "colibri" = "maple";

/** The first one is where a new listener starts. The names stay as they are in every learner language, like the
 *  town's signs; `lt` says what plays. `freq` is the station's place on the set's dial. */
export const STATIONS: Station[] = [
  { id: "town", name: "Maple FM", freq: 98.7, lt: "visos kurso dainos", shuffle: true, has: () => true },
  {
    id: "soul", name: "Soul & Funk", freq: 101.5, lt: "soulas, fankas ir disko", shuffle: true,
    has: genre(/soul|funk|motown|r&b|gospel|disco|doo-wop|blues|hip-hop/i),
  },
  {
    id: "sunny", name: "Sunny Side", freq: 104.3, lt: "regis, bosanova ir afro ritmai", shuffle: true,
    has: genre(/reggae|ska|rocksteady|bossa|samba|afro|highlife|amapiano|calypso|cumbia|dancehall|latin|tropical|ukulele|lovers rock|palm-wine/i),
  },
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
