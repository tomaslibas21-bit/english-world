import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EM_BOOK_PROFILE } from "../src/content/bookSource";
import { BOOK_STATION, STATIONS } from "../src/content/radio";
import { bookCopy } from "../src/content/bookCopy";
import { createBookChannel } from "../src/radio/bookChannel";
import { createBookSource, normalizeBookCatalog, normalizeBookItem, type BookItem, type BookSentence } from "../src/radio/books";
import { Radio } from "../src/radio/radio";
import type { TalkOutput, TalkSnapshot } from "../src/radio/talkPlayer";
import { TALK_LANGUAGES } from "../src/radio/talkProgress";
import { BookInterlinear, readerUnits, readerWord } from "../src/ui/BookInterlinear";
import { BookCourseLink, BookReader, ReaderPage } from "../src/ui/BookReader";
import { ReaderFollow } from "../src/ui/bookReaderFollow";
import { ListeningForm } from "../src/ui/TalkSettings";
import { useStore } from "../src/state/store";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
const book = normalizeBookCatalog(EM_BOOK_PROFILE, fixture("knygos-index"), fixture("stories-index")).books[0];
const chapter = book.chapters[0];
const recording = () => ({ open: () => "/recording.mp3", key: "local-master" });
const item: BookItem = { ...normalizeBookItem(EM_BOOK_PROFILE, chapter, {
  text: fixture("BOOK-CANT-01-data"), words: fixture("BOOK-CANT-01-word-timing"),
  timing: { paired: fixture("BOOK-CANT-01-timing"), helper: fixture("BOOK-CANT-01-lithuanian-timing") }, recording,
}), book };
const first = item.paragraphs.find((row) => row.kind !== "break")!.sentences[0];
const target = item.tracks.paired!.cues[1];
type Request = Parameters<TalkOutput["start"]>[0];

function setup() {
  const source = createBookSource({ profile: EM_BOOK_PROFILE, site: "https://course.test", files: "https://files.test/course" });
  const load = vi.spyOn(source, "load").mockResolvedValue({ ...item, book });
  const output = {
    start: vi.fn(async (_request: Request) => {}), stop: vi.fn(), setRates: vi.fn(), position: vi.fn(() => null as number | null),
  };
  const channel = createBookChannel(source, output);
  const player = channel.player;
  const renderPage = (changes: Partial<TalkSnapshot> = {}, chosen = item) => renderToStaticMarkup(createElement(ReaderPage, {
    item: chosen, state: { ...player.getSnapshot(), ...changes }, word: -1, roving: "", setRoving() {}, seek() {}, expanded: true, translation: false,
  }));
  return { channel, player, output, load, renderPage };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); useStore.setState({ settings: { ...useStore.getState().settings, textSize: 1 } }); });

describe("Book FM reader", () => {
  it("underlines the verified word inside a multiword unit and keeps its gloss whole", () => {
    const sentence: BookSentence = { id: "one", textHash: "123a", target: "He wanted to buy a house.",
      helper: "Jis norėjo nusipirkti namą.", units: [["He", "Jis", ""], ["wanted to buy", "norėjo nusipirkti", ""], ["a house.", "namą.", ""]] };
    const cue = { sentenceId: "one", textHash: "123a", language: "en" as const, text: sentence.target, start: 0, end: 6,
      words: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] as const };
    const word = readerWord(sentence, cue, 3, "en");
    expect(word).toBe(3); // The shared boundary belongs to "buy".
    const html = renderToStaticMarkup(createElement(BookInterlinear, { sentence, language: "en", helper: "lt", expanded: true, word }));
    expect(html).toContain('wanted to <u data-book-word="3">buy</u>');
    expect(html.match(/norėjo nusipirkti/g)).toHaveLength(1);
    expect(html).toContain('<small lang="lt">norėjo nusipirkti</small>');
    expect(html.match(/class="u"/g)).toHaveLength(3);
  });

  it("preserves a blank gloss and falls back to sentence emphasis with missing or mismatched clocks", () => {
    const sentence: BookSentence = { ...first, units: [[first.target, "", ""]] };
    expect(readerUnits(sentence).aligned).toBe(true);
    const html = renderToStaticMarkup(createElement(BookInterlinear, { sentence, language: "en", helper: "lt", expanded: true }));
    expect(html).toContain('<small lang="lt"> </small>');
    expect(html).not.toContain("<u ");
    expect(readerWord(first, { ...target, words: undefined }, 8, "en")).toBe(-1);
    expect(readerWord(first, { ...target, textHash: "ffff" }, 8, "en")).toBe(-1);
    expect(readerWord(first, { ...target, language: "lt" }, 8, "en")).toBe(-1);
    expect(readerWord(first, target, target.end, "en")).toBe(-1);
    expect(readerUnits({ ...first, units: [["Wrong text", "Other meaning", ""]] })).toMatchObject({ aligned: false, units: [[first.target, "", ""]] });
  });

  it("preserves paragraph breaks and emphasizes the audible leg with the natural helper below the target", async () => {
    const { player, renderPage } = setup();
    await player.select(chapter.selection);
    const withBreak: BookItem = { ...item, paragraphs: [item.paragraphs[0], { kind: "break" }, ...item.paragraphs.slice(1)] };
    const helper = renderPage({}, withBreak);
    expect(helper).toContain('class="natural audible"');
    expect(helper).toContain("data-paragraph-break");
    expect(helper.indexOf(first.target.split(" ")[0])).toBeLessThan(helper.indexOf(first.helper));
    const targetPage = renderPage({ cue: target });
    expect(targetPage).toContain('class="target-leg audible"');
    expect(targetPage.match(/tabindex="0"/g)).toHaveLength(1);
    expect(targetPage).toContain('aria-label="Pereiti į 1 eilutę"');
    expect(targetPage).not.toContain("aria-live");
  });

  it("makes helper-only text the primary row and keeps the target mode's translation folded", async () => {
    const { player, renderPage } = setup();
    await player.select(chapter.selection);
    player.changeMode("helper");
    const helper = renderPage();
    expect(helper).toContain('class="helper-primary audible"');
    expect(helper).toContain(first.helper);
    expect(helper).not.toContain('class="target-leg');
    expect(helper).not.toContain('class="il');
    player.changeMode("target");
    expect(renderPage()).not.toContain('class="natural');
  });

  it("releases following on manual scroll and rejoins without focusing the automatic sentence", () => {
    const follow = new ReaderFollow();
    let lineTop = 420;
    const pane = {
      scrollTop: 0, scrollHeight: 1200, clientHeight: 300,
      getBoundingClientRect: () => ({ top: 100, bottom: 400, height: 300 }) as DOMRect,
      scrollTo: vi.fn((options: ScrollToOptions) => { pane.scrollTop = options.top!; }),
    };
    const line = { getBoundingClientRect: () => ({ top: lineTop, bottom: lineTop + 60, height: 60 }) as DOMRect, focus: vi.fn() };
    follow.move(pane, line);
    expect(pane.scrollTop).toBe(88);
    expect(follow.scrolled(88)).toBe(true);
    follow.suspend();
    lineTop = 650;
    follow.move(pane, line);
    expect(pane.scrollTo).toHaveBeenCalledTimes(1);
    follow.rejoin();
    follow.move(pane, line);
    expect(pane.scrollTo).toHaveBeenCalledTimes(2);
    expect(line.focus).not.toHaveBeenCalled();
    expect(follow.scrolled(700)).toBe(false); // Dragging the scrollbar is manual too.
  });

  it("seeks a paused sentence at its helper leg without starting output or completing a skipped ending", async () => {
    const { player, output, channel } = setup();
    await player.select(chapter.selection);
    const last = item.tracks.paired!.cues.at(-1)!;
    player.seekSentence(last.sentenceId);
    expect(player.getSnapshot()).toMatchObject({ playIntent: false, status: "paused", cue: { sentenceId: last.sentenceId, language: "lt" } });
    expect(output.start).not.toHaveBeenCalled();
    expect(channel.progress.get(chapter.selection)?.complete).toBe(false);
    player.changeMode("target");
    player.seekSentence(first.id);
    expect(player.getSnapshot().cue).toMatchObject({ sentenceId: first.id, language: "en" });
  });

  it("presents three modes, independent language speeds and the defaults, then persists choices for reopening", async () => {
    const { channel, player } = setup();
    const html = () => renderToStaticMarkup(createElement(ListeningForm, { channel }));
    const initial = html();
    expect(initial.match(/role="radio"/g)).toHaveLength(3);
    expect(initial).toContain('aria-checked="true" tabindex="0" data-pad-default="true"');
    expect(initial).toContain("Lietuviškai, tada angliškai");
    expect(initial).toContain("Anglų kalbos greitis");
    expect(initial).toContain("Lietuvių kalbos greitis");
    expect(initial).toContain('<option value="0.75" selected="">0,75×</option>');
    expect(initial).toContain('<option value="1" selected="">1×</option>');
    expect(initial).toContain('<option value="off" selected="">Išjungta</option>');
    player.changeMode("target");
    player.setRate("en", 0.9);
    player.setRate("lt", 1.75);
    player.setAutoplay(false);
    expect(html()).toContain('<option value="0.9" selected="">0,9×</option>');
    expect(html()).toContain('<option value="1.75" selected="">1,75×</option>');
    expect(channel.progress.getSnapshot().prefs).toMatchObject({ mode: "target", rates: { en: 0.9, lt: 1.75 }, autoplay: false });
    await player.select(chapter.selection);
    player.changeMode("paired");
    expect(player.getSnapshot().prefs.rates).toEqual({ en: 0.9, lt: 1.75 });
  });

  it.each([15, 30] as const)("expires a %s minute wall-clock sleep ahead of hold release, even when page timers were delayed", async (minutes) => {
    vi.useFakeTimers();
    const { channel, player, output } = setup();
    await player.select(chapter.selection, true);
    player.setSleep(minutes);
    expect(renderToStaticMarkup(createElement(ListeningForm, { channel }))).toContain(`<option value="${minutes}" selected="">${minutes} min.</option>`);
    player.hold("voice");
    vi.setSystemTime(Date.now() + minutes * 60_000 + 1);
    player.tick();
    player.release("voice");
    await vi.advanceTimersByTimeAsync(710);
    expect(player.getSnapshot()).toMatchObject({ sleep: null, playIntent: false, status: "paused" });
    expect(output.start).toHaveBeenCalledTimes(1);
    player.dispose();
  });

  it("gives end-of-chapter sleep precedence over autoplay and marks natural completion", async () => {
    const { player, output, channel, load } = setup();
    await player.select(chapter.selection, true);
    player.setSleep("end");
    output.start.mock.lastCall![0].onEnded();
    expect(player.getSnapshot()).toMatchObject({ sleep: null, playIntent: false, status: "ended" });
    expect(channel.progress.get(chapter.selection)).toMatchObject({ complete: true, fraction: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it.each([["paired", "bilingual"], ["target", "english"], ["helper", "lithuanian"]] as const)(
    "hands %s to the canonical course route with %s and a private same-tab referrer", async (mode, legacy) => {
      const { channel, player } = setup();
      await player.select(chapter.selection);
      player.changeMode(mode);
      const html = renderToStaticMarkup(createElement(BookCourseLink, { channel, state: player.getSnapshot() }));
      expect(html).toContain(`href="/knygos/audio/BOOK-CANT-01?mode=${legacy}" referrerPolicy="no-referrer"`);
      expect(html).not.toMatch(/target=|token=|[?&]t=|offset=|timestamp=/);
    });

  it.each([1, 1.15, 1.3])("renders reader controls, body and settings at text size %s", async (textSize) => {
    const { channel, player, output } = setup();
    await player.select(chapter.selection);
    useStore.setState({ settings: { ...useStore.getState().settings, textSize } });
    const html = renderToStaticMarkup(createElement(BookReader, { channel }));
    expect(html).toContain("The Canterville Ghost");
    expect(html).toContain('data-pad-scope="book-reader"');
    expect(html).toContain('data-pad-default="true" aria-label="Leisti"');
    expect(html).toContain("Žodžių reikšmės");
    expect(html).toContain("Klausymo nustatymai");
    expect(html).toContain('aria-describedby="reader-BOOK-CANT-01-S001-target reader-BOOK-CANT-01-S001-helper"');
    expect(output.start).not.toHaveBeenCalled();
  });

  it("keeps one player and the picker below the reader and settings, unwinding one level at a time", async () => {
    const { channel, output } = setup();
    const music = { play: vi.fn(async () => true), pause() {}, position: () => 0, setVolume() {}, unlock() {}, onEnded: null, onStopped: null };
    const radio = new Radio({ config: null, stations: STATIONS, books: { station: BOOK_STATION, channel },
      output: music, token: () => null, volume: () => 0.5, storageKey: "test", fetchJson: async () => ({}) });
    radio.setStation("books");
    radio.read(chapter.selection);
    await Promise.resolve();
    const state = () => radio.store.getState();
    expect(state()).toMatchObject({ shelfOpen: true, readerOpen: true, open: true });
    radio.openSettings();
    expect(state().settingsOpen).toBe(true);
    radio.closeSettings();
    expect(state()).toMatchObject({ settingsOpen: false, readerOpen: true, shelfOpen: true });
    radio.closeReader();
    expect(state()).toMatchObject({ readerOpen: false, shelfOpen: true });
    radio.closeShelf();
    radio.openReader();
    expect(output.start).toHaveBeenCalledTimes(1);
    radio.openSettings();
    radio.setOpen(false);
    expect(state()).toMatchObject({ settingsOpen: false, readerOpen: false, shelfOpen: false, open: false });
    expect(music.play).not.toHaveBeenCalled();
    radio.shutdown();
  });

  it("supplies EN/LT copy and retains Claude's language-tag copy", () => {
    expect(Object.values(bookCopy).every(({ en, lt }) => en.trim() && lt.trim())).toBe(true);
    expect(bookCopy.en.lt).toBe("Angliškai");
    expect(bookCopy.lt.lt).toBe("Lietuviškai");
    expect(bookCopy.es.lt).toBe("Ispaniškai");
    expect(TALK_LANGUAGES["em-lt"]).toEqual({ target: "en", helper: "lt" });
  });
});
