import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTimeline, karaokeReading, karaokeWordAt, karaokeWordTiming } from "../src/radio/lyrics";
import { readSongLines, type SongLine } from "../src/radio/songs";
import { KaraokeFinish, KaraokeLyricLine, KaraokeStage } from "../src/ui/KaraokeStage";
import { KaraokeSession } from "../src/radio/karaokeSession";
import type { RadioOutput } from "../src/radio/output";
import { KARAOKE_UI } from "../src/content/karaokeCopy";

const line: SongLine = {
  i: 0, s: 6.27, e: 9.15, src: "Every evening, every evening,", lt: "Kiekvieną vakarą, kiekvieną vakarą,",
  u: [["Every evening,", "Kiekvieną vakarą,", 2], ["every evening,", "kiekvieną vakarą,", 2]],
  wt: ["Every", "evening,", "every", "evening,"], w: [[6.27, 6.7], [6.8, 7.4], [7.5, 8.1], [8.2, 9.15]],
};

describe("the booth's lyric card", () => {
  it("renders the G01 word and controls immediately after loading, seeking and pausing, without an animation frame", async () => {
    let at = 0;
    const output: RadioOutput = {
      play: async (_url, seconds) => { at = seconds; return true; }, pause() {}, position: () => at,
      duration: () => 252.84, unlock() {}, setVolume() {}, onEnded: null, onStopped: null,
    };
    // G01's real first row, including its four single-word gloss units and source timing.
    const first = { ...line, u: [["Every", "Kiekvieną", 1], ["evening,", "vakarą,", 1], ["every", "kiekvieną", 1], ["evening,", "vakarą,", 1]],
      w: [[6.27, 6.67], [6.69, 7.29], [7.31, 7.71], [7.73, 9.15]] };
    const fetchJson = vi.fn(async () => ({ L: [first, { ...line, s: 11.16, e: 14.73 }] }));
    const session = new KaraokeSession({
      config: { index: "/songs/index.json", files: "/karaoke-files", recordings: null }, output,
      song: (id) => ({ id, c: "g", n: 1, t: "The Long Way Home", tl: "", tp: "", g: "", d: 252.84, a: "/songs/audio/G01.mp3" }),
      token: () => "fixture", fetchJson, level: () => 1, held: false, resumeDelay: 700, close() {},
    });
    const render = () => renderToStaticMarkup(createElement(KaraokeStage, { session, take: session.store.getState() }));
    await session.start("G01");
    session.pause();
    expect(render()).not.toContain('class="karaoke-current-line"');
    await session.resume();
    await session.seek(7.1);
    session.pause();
    expect(session.position()).toBe(7.1);
    expect(session.store.getState().status).toBe("paused");
    const html = render();
    expect(html).toContain('class="karaoke-current-line" data-line="0" data-word="1"');
    expect(html).toContain('class="karaoke-word now">evening,</span>');
    expect(html).toContain(KARAOKE_UI.showMeaning);
    expect(html).toContain(KARAOKE_UI.replay);
    expect(html).toContain(KARAOKE_UI.resume);
    expect(fetchJson).toHaveBeenCalledExactlyOnceWith("/karaoke-files/songs/data/G01.json?t=fixture", expect.any(AbortSignal));
    // A paused seek deliberately does not move the audio output: the session's parked clock owns the reader.
    await session.seek(12);
    expect(at).toBe(7.1);
    expect(render()).toContain('data-line="1"');
    session.close();
  });

  it("uses each word's media clock, its 50 ms lead and its own end", () => {
    expect(karaokeWordTiming(line)).toBe(true);
    expect(karaokeWordAt(line, 6.2)).toBe(-1);
    expect(karaokeWordAt(line, 6.23)).toBe(0);
    expect(karaokeWordAt(line, 6.71)).toBe(-1);
    expect(karaokeWordAt(line, 7.6)).toBe(2);
    expect(karaokeWordAt(line, 9.15)).toBe(-1);
  });

  it("leaves the intro, long breaks and outro clear with no preview floating by itself", () => {
    const next = { ...line, i: 1, s: 20, e: 23 };
    const timeline = buildTimeline([line, next]);
    expect(karaokeReading(timeline, 4)).toEqual({ current: -1, next: -1 });
    expect(karaokeReading(timeline, 6.27)).toEqual({ current: 0, next: 1 });
    expect(karaokeReading(timeline, 12)).toEqual({ current: -1, next: -1 });
    expect(karaokeReading(timeline, 26)).toEqual({ current: -1, next: -1 });
  });

  it("keeps the current singer visible when the radio timeline previews the following row early", () => {
    const next = { ...line, i: 1, s: 9.47, e: 12 };
    const timeline = buildTimeline([line, next]);
    expect(karaokeReading(timeline, 9.1)).toEqual({ current: 0, next: 1 });
    expect(karaokeReading(timeline, 9.47).current).toBe(1);
  });

  it("falls back to a whole readable row when word data is partial, invalid or belongs to different words", () => {
    for (const invalid of [
      { ...line, w: line.w.slice(1) }, { ...line, wt: ["Other", ...line.wt.slice(1)] },
      { ...line, w: [[NaN, 6.7], ...line.w.slice(1)] as [number, number][] },
      { ...line, w: [[6.27, 30], ...line.w.slice(1)] as [number, number][] },
    ]) {
      expect(karaokeWordTiming(invalid)).toBe(false);
      expect(karaokeWordAt(invalid, 6.4)).toBe(-1);
      const html = renderToStaticMarkup(createElement(KaraokeLyricLine, { line: invalid, word: -1, meaning: false }));
      expect(html).toContain(line.src);
      expect(html).not.toContain('class="karaoke-word now"');
    }
    expect(readSongLines({ L: [{ s: 1, e: 2, src: "Still readable" }] }, true)[0].src).toBe("Still readable");
  });

  it("lays one gloss under its complete unit, keeps punctuation and reveals the natural translation", () => {
    const html = renderToStaticMarkup(createElement(KaraokeLyricLine, { line, word: 2, meaning: true }));
    expect(html.match(/class="karaoke-word now"/g)).toHaveLength(1);
    expect(html.match(/class="karaoke-unit"/g)).toHaveLength(2);
    expect(html).toContain("evening,");
    expect(html).toContain('class="karaoke-accessible" lang="en"');
    expect(html).toContain('class="karaoke-natural" lang="lt"');
    expect(html).toContain(line.lt);
    expect(html).not.toContain('aria-live="polite"');
    const hidden = renderToStaticMarkup(createElement(KaraokeLyricLine, { line, word: 2, meaning: false }));
    expect(hidden).not.toContain(line.lt);
    const helper = renderToStaticMarkup(createElement(KaraokeLyricLine, { line: { ...line, part: "translation" }, word: 0, meaning: true }));
    expect(helper).not.toContain('class="karaoke-natural"');
  });

  it("renders the warm result with a distinct-line tally and both exit actions", () => {
    const html = renderToStaticMarkup(createElement(KaraokeFinish, {
      take: { status: "ended", song: { id: "G01", t: "Home" } as never, timeline: null, held: false, issue: null,
        practice: { mode: "along", turn: null, remaining: 0, completed: 2, total: 3 } }, act() {},
    }));
    expect(html).toContain(KARAOKE_UI.applause);
    expect(html).toContain("Pakartotos eilutės · 2 iš 3");
    expect(html).toContain(KARAOKE_UI.another);
    expect(html).toContain(KARAOKE_UI.leave);
  });
});
