// Puerto Colibrí's radio (src/editions/es/content/radio.ts): what Radio Colibrí plays, the course song of each
// conversation, and the stations' lines in English.
import { describe, expect, it } from "vitest";
import { RADIO_SKIN, STATIONS, songOfSituation } from "@/content/radio";
import { SITUATIONS } from "@/content/situations";
import { STRINGS } from "@/ui/strings";
import type { SongMeta } from "@/radio/songs";

const song = (g: string): SongMeta => ({ id: "X", c: "g", n: 1, t: "", tl: "", tp: "", g, d: 0, a: "" });

describe("Puerto Colibrí's radio", () => {
  const [colibri, todas] = STATIONS;

  it("starts on Radio Colibrí, shuffled; the other station plays everything in the course's order", () => {
    expect([colibri.name, colibri.shuffle, todas.name, todas.shuffle]).toEqual(["Radio Colibrí", true, "Todas las canciones", false]);
    expect(todas.has(song("ranchera"))).toBe(true);
  });

  it("has the town's own radio set, with each station at a place of its own on the dial", () => {
    expect(RADIO_SKIN).toBe("colibri");
    const places = STATIONS.map((s) => s.freq);
    for (const f of places) { expect(f).toBeGreaterThan(88); expect(f).toBeLessThan(108); }
    expect(new Set(places).size).toBe(places.length);
  });

  it("Radio Colibrí plays the Caribbean genres of the course's song list", () => {
    for (const g of ["cumbia", "cumbia sonidera", "electrocumbia", "bachata", "bolero", "bolero-jazz", "salsa dura", "guaracha", "vallenato", "merengue",
      "son cubano", "son jarocho", "mambo", "champeta", "plena", "reggae", "reggae español", "bossa nova", "cha-cha-chá", "guajira", "boogaloo"]) {
      expect(colibri.has(song(g)), g).toBe(true);
    }
    // reggaetón is not reggae, a "sonidera" is no "son", and the north and Spain are another station's
    for (const g of ["reggaetón", "afro-reggaetón", "corrido tumbado", "ranchera", "rumba flamenca", "tango", "pop-rock", "dembow", "sea shanty"]) {
      expect(colibri.has(song(g)), g).toBe(false);
    }
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
