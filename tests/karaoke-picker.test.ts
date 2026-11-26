import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KARAOKE_COPY } from "../src/content/karaokeCopy";
import { STATIONS } from "../src/content/radio";
import { karaokeSongs, karaokeStations, resetKaraokeUi, useKaraoke } from "../src/game/karaoke/store";
import { karaokeCatalog, readSongList } from "../src/radio/songs";
import { KaraokePicker, karaokeDuration } from "../src/ui/KaraokePicker";

const entries = karaokeCatalog({ index: "/songs/index.json", files: null, recordings: null }, readSongList({ songs: [
  { id: "G01", c: "g", n: 1, t: "The Long Way Home", tl: "Ilguoju keliu namo", d: 252.84, a: "/G01.mp3" },
  { id: "V32", c: "v", n: 32, t: "Family", tl: "Šeima", d: 184, a: "/V32.mp3" },
  { id: "P13", c: "p", n: 13, t: "A long title with punctuation & a question?", tl: "Ilgas pavadinimas", d: 61, a: "/P13.mp3" },
] }));
afterEach(resetKaraokeUi);
const render = (patch = {}) => renderToStaticMarkup(createElement(KaraokePicker, {
  entries, favorites: ["V32"], view: { ...useKaraoke.getState(), phase: "picker", ...patch }, act() {},
}));

describe("the silent song stand", () => {
  it("keeps course order and filters with radio categories, including advanced idioms", () => {
    expect(karaokeStations(entries, STATIONS).map((s) => s.id)).toEqual(["grammar", "vocab", "idioms"]);
    expect(karaokeSongs(entries, "all", STATIONS, []).map((e) => e.song.id)).toEqual(["G01", "V32", "P13"]);
    expect(karaokeSongs(entries, "idioms", STATIONS, []).map((e) => e.song.id)).toEqual(["P13"]);
    const favorites = Object.freeze(["missing", "V32"]);
    expect(karaokeSongs(entries, "favorites", STATIONS, favorites).map((e) => e.song.id)).toEqual(["V32"]);
    expect(favorites).toEqual(["missing", "V32"]);
    expect(karaokeSongs(entries, "unavailable", STATIONS, [])).toEqual([]);
  });

  it("renders one labeled list of jackets, both titles and durations without audio or favorite mutation controls", () => {
    const html = render();
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('data-pad-scope="karaoke"');
    expect(html).toContain('data-pad-adjust="true"');
    expect(html).toContain('data-song="G01"');
    expect(html).toContain('G01.adb9ab38.160.webp');
    expect(html).toContain("Ilguoju keliu namo");
    expect(html).toContain("4:12");
    expect(html.indexOf('data-song="G01"')).toBeLessThan(html.indexOf('data-song="V32"'));
    expect(html).not.toMatch(/<audio|<video|toggleFavorite|aria-pressed/);
  });

  it("gives selection a full jacket, all three practice modes and a start action", () => {
    const html = render({ detail: "G01", selected: "G01", scroll: 418 });
    expect(html).toContain('data-song-detail="G01"');
    expect(html).toContain('G01.adb9ab38.320.webp');
    expect(html.match(/<option[^>]*value="along"[^>]*>/)?.[0]).toContain('selected=""');
    expect(html.match(/<option[^>]*value="echo"[^>]*>/)?.[0]).not.toContain('disabled=""');
    expect(html).toContain(KARAOKE_COPY.lt.alongHelp);
    expect(html).not.toContain(KARAOKE_COPY.lt.echoHelp);
    const echo = render({ detail: "G01", mode: "echo" });
    expect(echo.match(/<option[^>]*value="echo"[^>]*>/)?.[0]).toContain('selected=""');
    expect(echo).toContain(KARAOKE_COPY.lt.echoHelp); expect(echo).not.toContain(KARAOKE_COPY.lt.alongHelp);
    const word = render({ detail: "G01", mode: "word" });
    expect(word.match(/<option[^>]*value="word"[^>]*>/)?.[0]).toContain('selected=""');
    expect(word).toContain(KARAOKE_COPY.lt.wordHelp);
    expect(word).not.toContain(KARAOKE_COPY.lt.echoHelp);
    expect(html).toContain(KARAOKE_COPY.lt.start);
    expect(html).not.toContain('data-song="V32"');
  });

  it("renders loading, catalog failure, empty favorites and an empty course distinctly", () => {
    expect(render({ loading: true })).toContain(KARAOKE_COPY.lt.loading);
    expect(render({ failed: true })).toContain(KARAOKE_COPY.lt.catalogError);
    expect(render({ failed: true })).toContain(KARAOKE_COPY.lt.retry);
    const view = { ...useKaraoke.getState(), phase: "picker" as const, filter: "favorites" };
    expect(renderToStaticMarkup(createElement(KaraokePicker, { entries, favorites: [], view, act() {} })))
      .toContain(KARAOKE_COPY.lt.emptyFavorites);
    expect(renderToStaticMarkup(createElement(KaraokePicker, { entries: [], favorites: [], view: { ...view, filter: "all" }, act() {} })))
      .toContain(KARAOKE_COPY.lt.empty);
    expect(karaokeDuration(Number.NaN)).toBe("0:00");
  });

  it("provides matching EN/LT copy keys and infinitive action labels", () => {
    expect(Object.keys(KARAOKE_COPY.en)).toEqual(Object.keys(KARAOKE_COPY.lt));
    expect(KARAOKE_COPY.lt).toMatchObject({ enter: "Dainuoti karaokę", start: "Pradėti dainą", back: "Grįžti", leave: "Nulipti nuo scenos", replay: "Klausytis dar kartą" });
  });
});
