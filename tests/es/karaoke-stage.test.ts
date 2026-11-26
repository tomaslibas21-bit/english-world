import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { KARAOKE_UI } from "../../src/content/karaokeCopy";
import { LOCATIONS } from "../../src/content/locations";
import { KaraokePractice, echoGap, lineGap, wordGap } from "../../src/game/karaoke/practice";
import { useKaraoke } from "../../src/game/karaoke/store";
import { buildTimeline, karaokeReading, karaokeWordAt, withSungTranslations } from "../../src/radio/lyrics";
import { KaraokeSession } from "../../src/radio/karaokeSession";
import type { RadioOutput } from "../../src/radio/output";
import { readSongLines } from "../../src/radio/songs";
import { KaraokePicker } from "../../src/ui/KaraokePicker";
import { KaraokeLyricLine, KaraokeNextLine, KaraokeSpeed, KaraokeStage } from "../../src/ui/KaraokeStage";
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

  it("offers word mode and formats speed in the active learner layer", () => {
    const html = renderToStaticMarkup(createElement(KaraokePicker, {
      view: { ...useKaraoke.getState(), phase: "picker", detail: "SG01", mode: "word" },
      entries: [{ song: course.songs.SG01.meta, thumbnail: null, jacket: null }], favorites: [], act() {},
    }));
    expect(html).toContain('value="word" selected=""');
    expect(html).toContain(lithuanian ? "Atspėti praleistą žodį" : "Fill in a word");
    expect(html).toContain(lithuanian ? "Klausykis ir pabandyk atspėti praleistą žodį." : "Think of the missing word as you listen.");
    const speed = renderToStaticMarkup(createElement(KaraokeSpeed, {
      take: { status: "paused", song: null, timeline: null, held: false, issue: null, rate: 0.8, canSlow: true }, act() {},
    }));
    expect(speed).toContain(lithuanian ? 'aria-label="Greitis"' : 'aria-label="Speed"');
    expect(speed).toContain(lithuanian ? "0,8×" : "0.8×");
  });

  it("masks a Spanish word from each course and restores that layer's gloss after reveal", async () => {
    let at = 0;
    const output: RadioOutput = {
      play: async (_url, offset) => { at = offset; return true; },
      pause() {}, position: () => at, duration: () => course.songs.SG01.meta.d,
      setVolume() {}, unlock() {}, onEnded: null, onStopped: null,
    };
    const session = new KaraokeSession({
      config: { index: "/songs/index.json", files: null, recordings: null },
      output, song: () => course.songs.SG01.meta, token: () => null,
      fetchJson: async () => ({ L: [course.songs.SG01.first] }), level: () => 1,
      held: false, resumeDelay: 0, close() {},
    });
    await session.start("SG01", "word");
    const state = () => session.store.getState();
    const line = state().timeline!.lines[0], gap = wordGap(line)!;
    expect(line.wt[gap.word]).toBe(gap.prefix + gap.answer + gap.suffix);
    expect(wordGap(structuredClone(line))).toEqual(gap);
    at = line.s + 0.1;
    session.tick();
    const render = () => renderToStaticMarkup(createElement(KaraokeStage, { take: state(), session }));
    const hidden = render();
    expect(hidden).toContain('class="karaoke-accessible" lang="es-MX"');
    expect(hidden).toContain(lithuanian ? "Praleistas žodis" : "Missing word");
    expect(hidden).not.toContain(gap.answer);
    expect(hidden).not.toContain(line.lt);
    expect(hidden).not.toContain("karaoke-natural");
    session.revealWord();
    expect(render()).toContain(gap.answer);
    expect(state().practice?.completed).toBe(0);
    const revealed = renderToStaticMarkup(createElement(KaraokeLyricLine, {
      line, word: -1, meaning: true, gap: lineGap(line, 0, state().practice, at),
    }));
    expect(revealed).toContain(`class="karaoke-natural" lang="${EDITION.helper}"`);
    expect(revealed).toContain(line.u[gap.unit][1]);
    expect(revealed).toContain(line.lt);
    await session.replayLine();
    expect(render()).not.toContain(gap.answer);
    at = line.e;
    session.tick();
    expect(state().practice).toMatchObject({ completed: 1, total: 1, revealed: [0] });
    expect(render()).not.toContain("karaoke-blank");
    expect(render()).toContain(gap.answer);
    session.close();
  });

  it.each(["señor!", "canción."])("preserves Spanish letters and punctuation around the blank for %s", (word) => {
    const [line] = readSongLines({ L: [{
      s: 1, e: 4, src: "¡Qué bien, " + word, lt: lithuanian ? "Vertimas." : "Translation.",
      wt: ["¡Qué", "bien,", word], w: [[1, 2], [2, 3], [3, 4]],
      u: [["¡Qué bien,", lithuanian ? "Kaip gerai," : "How nice,", 2], [word, lithuanian ? "reikšmė" : "meaning", 1]],
    }] }, true);
    const gap = wordGap(line)!;
    expect(gap).toMatchObject({ word: 2, answer: word.slice(0, -1), suffix: word.at(-1) });
    const hidden = renderToStaticMarkup(createElement(KaraokeLyricLine, {
      line, word: 2, meaning: true, gap: { gap, hidden: true },
    }));
    expect(hidden).toContain('lang="es-MX"');
    expect(hidden).not.toContain(gap.answer);
    expect(hidden).not.toContain(line.lt);
    expect(hidden).toContain(gap.suffix);
  });

  it.skipIf(lithuanian)("hides SB helper previews until sung and masks only the Spanish target", () => {
    const lines = withSungTranslations(readSongLines({ L: [fixture.sme.songs.SB01.first] }, true));
    const take = {
      status: "paused" as const, song: fixture.sme.songs.SB01.meta, timeline: buildTimeline(lines),
      held: false, issue: null, practice: new KaraokePractice(lines, "word").snapshot(),
    };
    const preview = (row: number) => renderToStaticMarkup(createElement(KaraokeNextLine, { take, row, seconds: 0 }));
    expect(preview(0)).toBe("");
    const gap = wordGap(lines[1])!;
    expect(preview(1)).not.toContain(gap.answer);
    expect(preview(1)).toContain("Missing word");
    expect(preview(1)).toContain('lang="es-MX"');
    expect(wordGap(lines[0])).toBeNull();
    const sung = renderToStaticMarkup(createElement(KaraokeStage, {
      take, session: { position: () => 5.29 } as KaraokeSession,
    }));
    expect(sung).toContain('lang="en">Hello, how are you?');
    expect(sung).not.toContain("karaoke-blank");
    const target = renderToStaticMarkup(createElement(KaraokeStage, {
      take, session: { position: () => 8.09 } as KaraokeSession,
    }));
    expect(target).toContain("karaoke-blank");
    expect(target).not.toContain(gap.answer);
    expect(target).not.toContain("Hello, how are you?");
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
