// Puerto Colibrí's radio (src/editions/es/content/radio.ts): the stations are the Spanish course's kinds of song, the
// course song of each conversation, and the stations' lines in English.
import { describe, expect, it } from "vitest";
import { RADIO_NAME, RADIO_SKIN, STATIONS, songOfSituation } from "@/content/radio";
import { SITUATIONS } from "@/content/situations";
import { STRINGS } from "@/ui/strings";
import { nextStation, stationSongs } from "@/radio/playlist";
import type { SongMeta } from "@/radio/songs";

/** A course's song list as its /songs/index.json has it: the collections in this order, each in the course's. */
const list = (kinds: [string, string, number][]): SongMeta[] =>
  kinds.flatMap(([c, prefix, count]) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}${String(i + 1).padStart(2, "0")}`, c, n: i + 1, t: "", tl: "", tp: "", g: "cumbia", d: 0, a: "" })));
const SME = list([["g", "SG", 30], ["v", "SV", 65], ["s", "SS", 35], ["b", "SB", 56]]); // Spanish Master English
const SM = list([["g", "SG", 30], ["v", "SV", 65], ["s", "SS", 35]]); // Spanish Master: no bilingual songs
const ids = (songs: SongMeta[], station: string) => stationSongs(songs, STATIONS.find((s) => s.id === station)!).map((s) => s.id);
const counts = (songs: SongMeta[]) => Object.fromEntries(STATIONS.map((s) => [s.id, stationSongs(songs, s).length]));

describe("Puerto Colibrí's radio", () => {
  it("is Radio Puerto Colibrí, the town's own radio set, with each station at a place of its own on the dial", () => {
    expect(RADIO_NAME).toBe("Radio Puerto Colibrí");
    expect(RADIO_SKIN).toBe("colibri");
    const places = STATIONS.map((s) => s.freq);
    expect(places.every((f, i) => f >= 88.5 && f <= 107.5 && (i === 0 || f - places[i - 1] >= 3))).toBe(true);
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  it("its stations are the course's kinds of song, grammar first, each in the course's order; then the mix and the favorites", () => {
    expect(STATIONS.map((s) => [s.name, s.kind ?? "kind"])).toEqual([
      ["Gramática FM", "kind"], ["Vocabulario FM", "kind"], ["Situaciones FM", "kind"], ["Bilingüe FM", "kind"], ["Al Azar FM", "mix"], ["Favoritas FM", "favorites"],
    ]);
    expect(ids(SME, "grammar")[0]).toBe("SG01"); // where a new listener starts
    expect(ids(SME, "grammar")).toEqual(SME.filter((s) => s.c === "g").map((s) => s.id));
    expect(counts(SME)).toEqual({ grammar: 30, vocab: 65, situations: 35, bilingual: 56, random: 186, favorites: 0 });
    for (const s of SME) expect(STATIONS.filter((k) => !k.kind && k.has(s)).map((k) => k.id), s.id).toHaveLength(1); // every song on exactly one
    expect(stationSongs(SME, STATIONS[5], new Set(["SB03", "SG02"])).map((s) => s.id)).toEqual(["SG02", "SB03"]);
  });

  it("moves on from one station to the next; Spanish Master, without bilingual songs, has no Bilingüe FM in the round", () => {
    const round = (songs: SongMeta[]) => { const c = counts(songs), out = ["grammar"]; for (let i = 0; i < 4; i++) out.push(nextStation(STATIONS, c, out[out.length - 1])!.id); return out; };
    expect(round(SME)).toEqual(["grammar", "vocab", "situations", "bilingual", "grammar"]);
    expect(counts(SM)).toEqual({ grammar: 30, vocab: 65, situations: 35, bilingual: 0, random: 130, favorites: 0 });
    expect(round(SM)).toEqual(["grammar", "vocab", "situations", "grammar", "vocab"]);
  });

  it("every conversation built on a situation song names the Spanish course's own (SS01–SS35)", () => {
    expect(songOfSituation({ song: 62 })).toBe("SS01");
    expect(songOfSituation({ song: 65 })).toBe("SS04");
    expect(songOfSituation({ song: 91 })).toBe("SS30");
    expect(songOfSituation({ song: 31 })).toBe("SS31");
    expect(songOfSituation({ song: 35 })).toBe("SS35");
    expect(songOfSituation({ song: "P25" })).toBeNull();
    for (const sit of SITUATIONS) {
      const id = songOfSituation(sit);
      if (typeof sit.song === "number") expect(id, sit.id).toMatch(/^SS(0[1-9]|[12]\d|3[0-5])$/);
      else expect(id, sit.id).toBeNull();
    }
  });

  it("says in English what each station plays", () => {
    for (const station of STATIONS) expect(STRINGS[station.lt], station.id).toBeTruthy();
  });
});
