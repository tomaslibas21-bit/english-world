import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KaraokePractice, lineGap, wordGap, type KaraokePracticeMode } from "../src/game/karaoke/practice";
import { buildTimeline, withSungTranslations } from "../src/radio/lyrics";
import { KaraokeSession, type KaraokeState } from "../src/radio/karaokeSession";
import type { RadioOutput } from "../src/radio/output";
import type { SongLine } from "../src/radio/songs";
import { KaraokeLyricLine, KaraokeNextLine, KaraokeStage, karaokeDialogKeys } from "../src/ui/KaraokeStage";
import { KARAOKE_UI } from "../src/content/karaokeCopy";

const line: SongLine = {
  i: 0, s: 1, e: 4, src: "Hear the “night,”", lt: "Išgirsk naktį.",
  wt: ["Hear", "the", "“night,”"], w: [[1, 1.5], [1.5, 2], [2, 4]],
  u: [["Hear the", "Išgirsk", 2], ["“night,”", "naktį", 1]],
};
const next = { ...line, i: 1, s: 6, e: 9, w: line.w.map(([s, e]) => [s + 5, e + 5]) as SongLine["w"] };
const take = (lines: SongLine[] = [line, next]): KaraokeState => ({
  status: "paused", held: false, issue: null, song: null, timeline: buildTimeline(lines),
  practice: new KaraokePractice(lines, "word").snapshot(),
});
const renderStage = (state: KaraokeState, seconds = 2.5) => renderToStaticMarkup(createElement(KaraokeStage, {
  take: state, session: { position: () => seconds } as KaraokeSession,
}));

describe("Fill in a word", () => {
  it("chooses one aligned single-word unit repeatably, preserving its punctuation", () => {
    const gap = wordGap(line)!;
    expect(gap).toEqual({ word: 2, unit: 1, prefix: "“", answer: "night", suffix: ",”" });
    expect(wordGap(structuredClone(line))).toEqual(gap);
    const many = { ...line, src: "Hear every night", wt: ["Hear", "every", "night"], u: [["Hear", "Išgirsk", 1], ["every", "kiekvieną", 1], ["night", "naktį", 1]] as SongLine["u"] };
    expect(new Set(Array.from({ length: 12 }, () => wordGap(many)!.word)).size).toBe(1);
    expect(wordGap(many)?.word).toBeGreaterThanOrEqual(0);
    expect(wordGap(many)?.word).toBeLessThan(3);
  });

  it("leaves short, helper, partial, mismatched and multiword-only rows intact", () => {
    const invalid: SongLine[] = [
      { ...line, part: "translation" }, { ...line, wt: ["Hear", "night"] }, { ...line, w: line.w.slice(1) },
      { ...line, w: [[1, 1.5], [1.5, 2], [2, 10]] },
      { ...line, u: [["Hear the", "Išgirsk", 2], ["different", "kita", 1]] },
      { ...line, u: [[line.src, line.lt, 3]] }, { ...line, u: [[line.src, line.lt, 0]] },
    ];
    for (const row of invalid) expect(wordGap(row)).toBeNull();
    const html = renderStage(take([{ ...line, u: [[line.src, line.lt, 3]] }]));
    expect(html).not.toContain("karaoke-blank");
    expect(html).toContain("night,");
    expect(html).not.toContain(KARAOKE_UI.reveal);
    for (const mode of ["along", "echo"] as const) expect(lineGap(line, 0, { ...take().practice!, mode }, 2)).toBeUndefined();
  });

  it("reserves the same slot and hides the answer from DOM, accessible text, glosses and translation", () => {
    const gap = wordGap(line)!;
    const render = (hidden: boolean) => renderToStaticMarkup(createElement(KaraokeLyricLine, {
      line, word: 2, meaning: true, gap: { gap, hidden },
    }));
    const blank = render(true), revealed = render(false);
    for (const answer of ["night", "naktį", line.src, line.lt]) expect(blank).not.toContain(answer);
    expect(blank).toContain(KARAOKE_UI.missing);
    expect(blank).toContain('lang="lt">Praleistas žodis');
    expect(blank).toContain('style="width:5ch"');
    expect(revealed).toContain('style="width:5ch"');
    expect(blank).toContain("“"); expect(blank).toContain(",”");
    expect(revealed).toContain("night"); expect(revealed).toContain("naktį");
    expect(revealed).toContain("karaoke-natural");
    expect(blank).not.toContain("visibility:hidden");
  });

  it("masks future target previews, suppresses an answering helper preview, and shows a helper when sung", () => {
    const state = take();
    const preview = renderToStaticMarkup(createElement(KaraokeNextLine, { take: state, row: 1, seconds: 0 }));
    expect(preview).toContain(KARAOKE_UI.missing);
    expect(preview).not.toContain("night");
    const bilingual = withSungTranslations([{ ...line, s: 3, e: 6, w: line.w.map(([s, e]) => [s + 2, e + 2]) as SongLine["w"],
      lt: "The answer is night", en: { s: 1, e: 2.5 } }]);
    const sb = take(bilingual);
    expect(renderToStaticMarkup(createElement(KaraokeNextLine, { take: sb, row: 0, seconds: 0 }))).toBe("");
    expect(renderStage(sb, 1.5)).toContain("The answer is night");
    const hidden = renderStage(state);
    expect(hidden).not.toContain("karaoke-next");
    expect(hidden).not.toContain("night");
    expect(hidden).not.toContain(KARAOKE_UI.showMeaning);
    expect(hidden).toContain(KARAOKE_UI.reveal);
  });

  it("reveals by tap or sung end with the same tally, resets on replay and never counts a reveal or seek", async () => {
    let at = 0;
    const output: RadioOutput = {
      play: vi.fn(async (_url, offset) => { at = offset; return true; }), pause() {}, position: () => at,
      duration: () => 12, setVolume() {}, unlock() {}, onEnded: null, onStopped: null,
    };
    const session = new KaraokeSession({
      config: { index: "/index.json", files: null, recordings: null }, output,
      song: () => ({ id: "G01", t: "Home", tl: "", c: "g", n: 1, g: "", tp: "", d: 12, a: "/G01.mp3" }),
      token: () => null, fetchJson: async () => ({ L: [line, next] }), level: () => 1, held: false, resumeDelay: 700, close() {},
    });
    await session.start("G01", "word");
    expect(session.store.getState().practice?.revealed).toEqual([]);
    at = 2.5; session.tick(); session.revealWord();
    expect(session.store.getState().practice).toMatchObject({ revealed: [0], completed: 0 });
    expect(renderStage(session.store.getState())).toContain("night");
    const stable = session.store.getState().practice;
    session.revealWord(); expect(session.store.getState().practice).toBe(stable);
    at = 4; session.tick();
    expect(session.store.getState().practice?.completed).toBe(1);
    await session.replayLine();
    expect(lineGap(line, 0, session.store.getState().practice, session.position())?.hidden).toBe(true);
    at = 4; session.tick();
    expect(session.store.getState().practice).toMatchObject({ completed: 1, revealed: [0] });
    expect(renderStage(session.store.getState(), 4)).not.toContain("karaoke-blank");
    await session.seek(8); at = 9; session.tick();
    expect(session.store.getState().practice).toMatchObject({ completed: 1, revealed: [1] });
    expect(lineGap(next, 1, session.store.getState().practice, 9)?.hidden).toBe(false);
    session.close();
    expect(session.store.getState().practice).toBeUndefined();
  });

  it("auto-reveals at the line end even when its final timed word ended earlier", () => {
    const early = { ...line, w: [[1, 1.5], [1.5, 2], [2, 3]] as SongLine["w"] };
    for (const mode of ["along", "word"] as KaraokePracticeMode[]) {
      const practice = new KaraokePractice([early], mode);
      practice.advance(0, 3.5);
      expect(lineGap(early, 0, practice.snapshot(), 3.5)?.hidden).toBe(mode === "word" ? true : undefined);
      practice.advance(3.5, 4);
      expect(practice.snapshot().completed).toBe(1);
      if (mode === "word") expect(practice.snapshot().revealed).toEqual([0]);
    }
  });

  it("allows the next native Tab after Reveal focuses the readable sentence, while trapping the dialog edges", () => {
    const first = { focus: vi.fn() }, last = { focus: vi.fn() }, sentence = {};
    const preventDefault = vi.fn();
    const currentTarget = { querySelectorAll: () => [first, last], contains: (node: unknown) => node === sentence };
    const event = { key: "Tab", shiftKey: false, stopPropagation() {}, preventDefault, currentTarget };
    const document = { activeElement: sentence };
    vi.stubGlobal("document", document);
    try {
      karaokeDialogKeys(event as never, () => {});
      expect(preventDefault).not.toHaveBeenCalled();
      document.activeElement = last;
      karaokeDialogKeys(event as never, () => {});
      expect(preventDefault).toHaveBeenCalledOnce();
      expect(first.focus).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});
