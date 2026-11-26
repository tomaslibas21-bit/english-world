import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { KARAOKE_UI } from "../../src/content/karaokeCopy";
import { LOCATIONS } from "../../src/content/locations";
import { KaraokePractice, echoGap } from "../../src/game/karaoke/practice";
import { useKaraoke } from "../../src/game/karaoke/store";
import { buildTimeline, karaokeReading, karaokeWordAt, withSungTranslations } from "../../src/radio/lyrics";
import { readSongLines } from "../../src/radio/songs";
import { KaraokePicker } from "../../src/ui/KaraokePicker";
import { KaraokeLyricLine } from "../../src/ui/KaraokeStage";
import fixture from "../fixtures/karaoke-pc.json";

const lithuanian = EDITION.helper === "lt";
const course = lithuanian ? fixture.sm : fixture.sme;

describe("Café La Ceiba performance", () => {
  it("labels the picker and its actions in the learner's language, with Spanish titles", () => {
    const view = { ...useKaraoke.getState(), phase: "picker" as const, detail: "SG01" };
    const html = renderToStaticMarkup(createElement(KaraokePicker, {
      view, entries: [{ song: course.songs.SG01.meta, thumbnail: null, jacket: null }], favorites: [], act() {},
    }));
    expect(EDITION.target).toBe("es-MX");
    expect(LOCATIONS["sunny-cup"].name).toBe("Café La Ceiba");
    expect(html).toContain(`lang="${EDITION.helper}" data-pad-scope="karaoke"`);
    expect(html).toContain('lang="es-MX">La cumbia del panadero');
    expect(html).toContain(lithuanian ? "Kepėjo kumbija" : "The Baker’s Cumbia");
    expect(html).toContain(lithuanian ? 'aria-label="Grįžti"' : 'aria-label="Go back"');
    expect(html).toContain(lithuanian ? 'aria-label="Praktikos būdas"' : 'aria-label="Practice mode"');
    expect(html).toContain(lithuanian ? "Pradėti dainą" : "Start song");
    expect(KARAOKE_UI.enter).toBe(lithuanian ? "Dainuoti karaokę" : "Sing karaoke");
    expect(KARAOKE_UI.lyrics).toBe(lithuanian ? "Dainos tekstas" : "Lyrics");
  });

  it("preserves accents, ñ and punctuation while keeping glosses and natural text hidden until revealed", () => {
    const [line] = readSongLines({ L: [{
      ...course.songs.SG01.first,
      src: "¡Qué bien, señor!", wt: ["¡Qué", "bien,", "señor!"],
      w: [[6.79, 7.82], [8.89, 9.01], [9.03, 10.41]],
      u: course.songs.SG01.first.u.slice(0, 3),
    }] }, true);
    const render = (meaning: boolean) => renderToStaticMarkup(
      createElement(KaraokeLyricLine, { line, word: karaokeWordAt(line, 9.03), meaning }),
    );
    expect(render(false)).toContain('class="karaoke-accessible" lang="es-MX">¡Qué bien, señor!');
    expect(render(false)).toContain('class="karaoke-word now">señor!');
    expect(render(false)).not.toContain(line.lt);
    expect(render(false)).not.toContain(line.u[0][1]);
    expect(render(true)).toContain(`class="karaoke-natural" lang="${EDITION.helper}"`);
    expect(render(true)).toContain(line.lt);
    expect(render(true)).toContain(line.u[0][1]);
  });

  it.skipIf(lithuanian)("renders SB01 helper and target on their own clocks, with one target-only Echo turn", () => {
    const lines = withSungTranslations(readSongLines({ L: [fixture.sme.songs.SB01.first] }, true));
    const [helper, target] = lines;
    const timeline = buildTimeline(lines);
    expect(karaokeReading(timeline, 5.29).current).toBe(0);
    expect(karaokeReading(timeline, 8.09).current).toBe(1);
    expect(karaokeWordAt(helper, 6.23)).toBe(1);
    expect(karaokeWordAt(target, 8.72)).toBe(1);
    const render = (line: typeof helper) => renderToStaticMarkup(createElement(KaraokeLyricLine, { line, word: 0, meaning: true }));
    expect(render(helper)).toContain('lang="en">Hello, how are you?');
    expect(render(helper)).not.toContain("karaoke-natural");
    expect(render(target)).toContain('lang="es-MX">Hola, ¿cómo estás?');
    const practice = new KaraokePractice(lines, "echo");
    expect(practice.advance(0, 6.75)).toBeNull();
    expect(practice.snapshot()).toMatchObject({ turn: null, completed: 0, total: 1 });
    expect(practice.advance(6.75, 9.25)).toBe(9.25);
    expect(practice.snapshot()).toMatchObject({ turn: { start: 5.29, rows: [1] }, completed: 1, total: 1 });
    expect(echoGap(practice.snapshot().turn!)).toBeCloseTo(2.2);
    const broken = { ...fixture.sme.songs.SB01.first, en: { s: 5.29, e: 6.75, w: [[5.29, 5.53]] } };
    const [fallback] = withSungTranslations(readSongLines({ L: [broken] }, true));
    expect(karaokeWordAt(fallback, 5.29)).toBe(-1);
    expect(render(fallback)).toContain("Hello, how are you?");
  });
});
