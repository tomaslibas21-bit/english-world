import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bookSource } from "../../src/content/bookSource";
import { BOOK_STATION, RADIO_NAME, RADIO_SKIN, STATIONS } from "../../src/content/radio";
import { EDITION } from "../../src/edition";
import { createBookChannel } from "../../src/radio/bookChannel";
import type { BookItem, BookSentence } from "../../src/radio/books";
import { Radio } from "../../src/radio/radio";
import type { TalkOutput, TalkSnapshot } from "../../src/radio/talkPlayer";
import { useStore } from "../../src/state/store";
import { BookInterlinear, readerUnits, readerWord } from "../../src/ui/BookInterlinear";
import { BookDetail, BookPicker, Jacket } from "../../src/ui/BookPicker";
import { BookCourseLink, BookReader, ReaderPage } from "../../src/ui/BookReader";
import { ListeningForm, TalkSettings } from "../../src/ui/TalkSettings";
import { bookWord, chapterCount } from "../../src/ui/bookCopy";
import { ReaderFollow } from "../../src/ui/bookReaderFollow";
import { chapterPlace, continueEntry, coverButtonId, loadShelf, pickerFocus, shelfEntries } from "../../src/ui/bookShelf";
import { STRINGS } from "../../src/ui/strings";
import { spanishBookUiFixture } from "./spanish-book-ui-fixture";
import { SITE, SME_FILES, SM_FILES } from "./spanish-books";

type Request = Parameters<TalkOutput["start"]>[0];
interface ExpectedCopy {
  library: string;
  start: string;
  resume: string;
  replay: string;
  introduction: string;
  chapters: string[];
  titleHelper: string;
  firstGloss: string;
  nextLine: string;
  paired: string;
  targetSpeed: string;
  helperSpeed: string;
  off: string;
  play: string;
  meanings: string;
  settings: string;
  retry: string;
  translate: string;
  stoppedHere: string;
  listeningOptions: string;
  browse: string;
  reader: string;
  rates: [string, string, string];
  minutes: string;
  route: string;
  bilingualStation: boolean;
}

export function spanishBookUiTests(helper: "en" | "lt", fixtures: URL, copy: ExpectedCopy) {
  const { catalog, book: volume, chapter, item } = spanishBookUiFixture(fixtures, helper);
  const entries = shelfEntries(catalog);
  const book = entries.find((entry) => entry.id === volume.id)!;
  const story = entries.find((entry) => entry.id === "HIS-SG01")!;
  const first = item.paragraphs.find((row) => row.kind !== "break")!.sentences[0];
  const target = item.tracks.paired!.cues[1];
  const mark = { sentence: "BK01-01-title", leg: helper, offsetSec: 1, fraction: 0.36, audioVersion: "123abc", complete: false } as const;
  const sourceFor = () => bookSource({ VITE_RADIO_FILES: helper === "en" ? SME_FILES : SM_FILES }, SITE)!;

  function shelf() {
    const source = sourceFor();
    const channel = createBookChannel(source, { setRates() {}, stop() {}, start: async () => {}, position: () => null });
    const snapshot = channel.progress.getSnapshot;
    const detail = (entry = book) => renderToStaticMarkup(createElement(BookDetail, { channel, entry, listen() {} }));
    return { channel, snapshot, detail };
  }

  describe("Book FM shelf and chapter detail", () => {
    it("keeps the source order and gives a fresh book a single start action and a focusable introduction", () => {
      const { detail, snapshot } = shelf();
      expect(continueEntry(entries, snapshot())).toBeUndefined();
      expect(chapterPlace(book, snapshot())).toMatchObject({ chapter: book.chapters[0], started: false, action: "start" });
      const html = detail();
      expect(html).toContain('id="chapter-BK01-00" class="chapter" data-pad-default="true"');
      expect(html).toContain(`class="chapter-kind">${copy.introduction}<`);
      expect(html.indexOf("chapter-BK01-00")).toBeLessThan(html.indexOf("chapter-BK01-01"));
      expect(html.match(/class="primary"/g)).toHaveLength(1);
      expect(html).toContain(copy.start);
      expect(html).toContain(chapterCount(book.chapters.length));
      expect(html).toContain("BK01.65adb81f.320.webp");
    });

    it("continues the most recently started unfinished chapter or story, ignoring removed items and editions", () => {
      let time = 0;
      const clock = vi.spyOn(Date, "now").mockImplementation(() => ++time);
      try {
        const { channel, snapshot } = shelf();
        const save = channel.progress.checkpoint.bind(channel.progress);
        save(book.chapters[1].selection, mark);
        save(story.chapters[0].selection, mark);
        expect(continueEntry(entries, snapshot())).toMatchObject({ entry: story, fraction: 0.36 });
        save(story.chapters[0].selection, { ...mark, complete: true, fraction: 1 });
        save({ ...book.chapters[1].selection, itemKey: "book/BK01/easy" }, mark);
        expect(continueEntry(entries, snapshot())).toMatchObject({ entry: book, chapter: book.chapters[1] });
        expect(continueEntry([story], snapshot())).toBeUndefined();
      } finally { clock.mockRestore(); }
    });

    it("marks current and finished chapters, focuses the bookmark, and offers replay after completion", () => {
      const { channel, detail } = shelf();
      channel.progress.checkpoint(book.chapters[0].selection, { ...mark, complete: true, fraction: 1 });
      channel.progress.checkpoint(book.chapters[1].selection, mark);
      const html = detail();
      expect(html).toContain('id="chapter-BK01-01" class="chapter current" data-pad-default="true" aria-current="true"');
      expect(html).toContain(copy.stoppedHere);
      expect(html).not.toContain(bookWord("current"));
      const paused = channel.player.getSnapshot();
      const playback = vi.spyOn(channel.player, "getSnapshot");
      try {
        playback.mockReturnValue({ ...paused, status: "playing", selection: book.chapters[1].selection });
        expect(detail()).toContain(bookWord("current"));
        expect(detail()).not.toContain(copy.stoppedHere);
        playback.mockReturnValue({ ...paused, status: "playing", selection: story.chapters[0].selection });
        expect(detail()).toContain(copy.stoppedHere);
      } finally { playback.mockRestore(); }
      expect(html).toContain(bookWord("finished"));
      expect(html).toContain(copy.resume);
      for (const row of book.chapters) channel.progress.checkpoint(row.selection, { ...mark, complete: true, fraction: 1 });
      expect(detail()).toContain(copy.replay);
      expect(detail()).not.toContain(bookWord("current"));
    });

    it("treats a story as one listening item and supplies a cloth spine when a cover is missing", () => {
      const { detail } = shelf();
      expect(story.chapters).toHaveLength(1);
      expect(story.chapters[0].selection.nextChapterId).toBeUndefined();
      const html = detail(story);
      expect(html).toContain(story.title);
      expect(html).toContain('id="chapter-HIS-SG01"');
      expect(html).toContain("cloth-spine");
      const cover = renderToStaticMarkup(createElement(Jacket, { urls: {}, size: 160 }));
      expect(cover).toContain("aspect-ratio:160 / 241");
      expect(cover).not.toContain("<img");
    });

    it("reports offline, retries the catalog, and distinguishes an empty shelf from a canceled request", async () => {
      const source = { catalog: vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(catalog)
        .mockResolvedValue({ books: [], stories: [], modules: [] }) };
      const publish = vi.fn();
      const signal = new AbortController().signal;
      await loadShelf(source, signal, publish);
      expect(publish).toHaveBeenLastCalledWith({ failed: true });
      await loadShelf(source, signal, publish);
      expect(publish).toHaveBeenLastCalledWith({ failed: false, entries });
      await loadShelf(source, signal, publish);
      expect(publish).toHaveBeenLastCalledWith({ failed: false, entries: [] });
      await loadShelf(source, AbortSignal.abort(), publish);
      expect(publish).toHaveBeenCalledTimes(3);
    });

    it("returns to the same cover after reordering, with a default when the item was removed", () => {
      const buttons = entries.map((entry) => ({ id: coverButtonId(entry.id) }));
      const opened = buttons[0].id;
      buttons.reverse();
      const root = { querySelector: (selector: string) => selector === "[data-pad-default]" ? buttons[0] : buttons.find((el) => "#" + el.id === selector) };
      expect(pickerFocus(root as ParentNode, opened)?.id).toBe(opened);
      buttons.pop();
      expect(pickerFocus(root as ParentNode, opened)?.id).toBe(buttons[0].id);
    });

    it("inflects the chapter count and uses a localized retry action", () => {
      expect(bookWord("retry")).toBe(copy.retry);
      expect([1, 8, 10, 11, 21].map(chapterCount)).toEqual(copy.chapters);
    });
  });

  function setup() {
    const source = sourceFor();
    const load = vi.spyOn(source, "load").mockResolvedValue(item);
    const output = {
      start: vi.fn(async (_request: Request) => {}), stop: vi.fn(), setRates: vi.fn(), position: vi.fn(() => null as number | null),
    };
    const channel = createBookChannel(source, output);
    const player = channel.player;
    const renderPage = (changes: Partial<TalkSnapshot> = {}, chosen: BookItem = item) => renderToStaticMarkup(createElement(ReaderPage, {
      item: chosen, state: { ...player.getSnapshot(), ...changes }, word: -1, roving: "", setRoving() {}, seek() {}, expanded: true, translation: false,
    }));
    return { channel, player, output, load, renderPage };
  }

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); useStore.setState({ settings: { ...useStore.getState().settings, textSize: 1 } }); });

  describe("Book FM reader", () => {
    it("underlines the verified word inside a multiword unit and keeps its gloss whole", () => {
      const sentence = item.paragraphs.flatMap((row) => row.kind === "paragraph" ? row.sentences : [])
        .find((row) => row.target.startsWith("Había una vez"))!;
      const words = sentence.target.split(/\s+/).map((_, i) => [i, i + 1] as const);
      const cue = { sentenceId: sentence.id, textHash: sentence.textHash, language: "es" as const,
        text: sentence.target, start: 0, end: words.length, words };
      const word = readerWord(sentence, cue, 2, "es");
      expect(word).toBe(2); // The shared boundary belongs to "vez".
      const html = renderToStaticMarkup(createElement(BookInterlinear, { sentence, language: "es", helper, expanded: true, word }));
      expect(html).toContain('lang="es"');
      expect(html).toContain('Había una <u data-book-word="2">vez</u>');
      expect(html).toContain(`<small lang="${helper}">${copy.firstGloss}</small>`);
      expect(html.split(copy.firstGloss)).toHaveLength(2);
    });

    it("preserves a blank gloss and falls back to sentence emphasis with missing or mismatched clocks", () => {
      const sentence: BookSentence = { ...first, units: [[first.target, "", ""]] };
      expect(readerUnits(sentence).aligned).toBe(true);
      const html = renderToStaticMarkup(createElement(BookInterlinear, { sentence, language: "es", helper, expanded: true }));
      expect(html).toContain(`<small lang="${helper}"> </small>`);
      expect(html).not.toContain("<u ");
      expect(readerWord(first, { ...target, words: undefined }, target.start, "es")).toBe(-1);
      expect(readerWord(first, { ...target, textHash: "ffff" }, target.start, "es")).toBe(-1);
      expect(readerWord(first, { ...target, language: helper }, target.start, "es")).toBe(-1);
      expect(readerWord(first, target, target.end, "es")).toBe(-1);
      expect(readerUnits({ ...first, units: [["Wrong text", "Other meaning", ""]] })).toMatchObject({ aligned: false, units: [[first.target, "", ""]] });
    });

    it("preserves paragraph breaks and emphasizes the audible leg with the natural helper below the target", async () => {
      const { player, renderPage } = setup();
      await player.select(chapter.selection);
      const withBreak: BookItem = { ...item, paragraphs: [item.paragraphs[0], { kind: "break" }, ...item.paragraphs.slice(1)] };
      const paired = renderPage({}, withBreak);
      expect(paired).toContain('data-narrated-title="true"');
      expect(paired).toMatch(/data-reader-line="BK01-01-title"[^>]*aria-disabled="false"/);
      expect(paired).toContain('class="natural audible"');
      expect(paired).toContain("data-paragraph-break");
      expect(paired).toContain(`class="il expanded" lang="es"`);
      expect(paired).toContain(`lang="${helper}" class="natural audible">${copy.titleHelper}`);
      expect(paired.indexOf('class="target-leg"')).toBeLessThan(paired.indexOf('class="natural audible"'));
      const targetPage = renderPage({ cue: target });
      expect(targetPage).toContain('class="target-leg audible"');
      expect(targetPage.match(/tabindex="0"/g)).toHaveLength(1);
      expect(targetPage).toContain(`aria-label="${copy.nextLine}"`);
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
      expect(player.getSnapshot()).toMatchObject({ playIntent: false, status: "paused", cue: { sentenceId: last.sentenceId, language: helper } });
      expect(output.start).not.toHaveBeenCalled();
      expect(channel.progress.get(chapter.selection)?.complete).toBe(false);
      player.changeMode("target");
      player.seekSentence(first.id);
      expect(player.getSnapshot().cue).toMatchObject({ sentenceId: first.id, language: "es" });
    });

    it("presents three modes, independent language speeds and the defaults, then persists choices for reopening", async () => {
      const { channel, player } = setup();
      const html = () => renderToStaticMarkup(createElement(ListeningForm, { channel }));
      const initial = html();
      expect(initial.match(/role="radio"/g)).toHaveLength(3);
      expect(initial).toContain('aria-checked="true" tabindex="0" data-pad-default="true"');
      expect(initial).toContain(copy.paired);
      expect(initial).toContain(copy.targetSpeed);
      expect(initial).toContain(copy.helperSpeed);
      expect(initial).toContain(`<option value="0.75" selected="">${copy.rates[0]}</option>`);
      expect(initial).toContain('<option value="1" selected="">1×</option>');
      expect(initial).toContain(`<option value="off" selected="">${copy.off}</option>`);
      player.changeMode("target");
      player.setRate("es", 0.9);
      player.setRate(helper, 1.75);
      player.setAutoplay(false);
      expect(html()).toContain(`<option value="0.9" selected="">${copy.rates[1]}</option>`);
      expect(html()).toContain(`<option value="1.75" selected="">${copy.rates[2]}</option>`);
      expect(channel.progress.getSnapshot().prefs).toMatchObject({ mode: "target", rates: { es: 0.9, [helper]: 1.75 }, autoplay: false });
      await player.select(chapter.selection);
      player.changeMode("paired");
      expect(player.getSnapshot().prefs.rates).toEqual({ es: 0.9, [helper]: 1.75 });
    });

    it("places a single listening settings heading beside Back", () => {
      const { channel } = setup();
      const html = renderToStaticMarkup(createElement(TalkSettings, { channel }));
      expect(html.match(/<h1>/g)).toHaveLength(1);
      expect(html).toContain(`<h1>${copy.settings}</h1></header><form class="settings-form scroll"><fieldset>`);
    });

    it.each([15, 30] as const)("expires a %s minute wall-clock sleep ahead of hold release, even when page timers were delayed", async (minutes) => {
      vi.useFakeTimers();
      const { channel, player, output } = setup();
      await player.select(chapter.selection, true);
      player.setSleep(minutes);
      expect(renderToStaticMarkup(createElement(ListeningForm, { channel }))).toContain(`<option value="${minutes}" selected="">${minutes} ${copy.minutes}</option>`);
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
        expect(html).toContain(`href="${copy.route}/audio/BK01-01?mode=${legacy}" referrerPolicy="no-referrer"`);
        expect(html).not.toMatch(/target=|token=|[?&]t=|offset=|timestamp=/);
      });

    it.each([1, 1.15, 1.3])("renders reader controls, body and settings at text size %s", async (textSize) => {
      const { channel, player, output } = setup();
      await player.select(chapter.selection);
      useStore.setState({ settings: { ...useStore.getState().settings, textSize } });
      const html = renderToStaticMarkup(createElement(BookReader, { channel }));
      expect(html).toContain("Cuentos de la selva");
      expect(html).toContain('data-pad-scope="book-reader"');
      expect(html).toContain(`data-pad-default="true" aria-label="${copy.play}"`);
      expect(html).toContain(copy.meanings);
      expect(html).toContain(copy.settings);
      expect(html).toContain('aria-describedby="reader-BK01-01-title-target reader-BK01-01-title-helper"');
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

    it("keeps the station and library names, accents, language tags and localized visible and ARIA copy", () => {
      expect(EDITION.target).toBe("es-MX");
      expect(EDITION.helper).toBe(helper);
      expect(RADIO_NAME).toBe("Radio Puerto Colibrí");
      expect(RADIO_SKIN).toBe("colibri");
      expect(BOOK_STATION).toMatchObject({ name: "Libros FM", freq: 91.3, source: "books" });
      expect(STATIONS.some(({ name }) => name === "Bilingüe FM")).toBe(copy.bilingualStation);
      const { channel } = setup();
      const picker = renderToStaticMarkup(createElement(BookPicker, { channel }));
      expect(picker).toContain(`aria-label="${copy.library}"`);
      expect(picker).toContain('<span class="brand" lang="es">');
      expect(picker).toContain('class="book-picker radio-skin-colibri"');
      expect(bookWord("showTranslation")).toBe(copy.translate);
      expect(bookWord("listeningOptions")).toBe(copy.listeningOptions);
      expect(bookWord("browse")).toBe(copy.browse);
      expect(bookWord("reader")).toBe(copy.reader);
      const source = readFileSync(new URL("../../src/ui/bookCopy.ts", import.meta.url), "utf8");
      for (const [, key] of source.matchAll(/\bL\("([^"]+)"/g)) {
        if (helper === "en") expect(STRINGS[key], key).toBeTruthy();
        else expect(STRINGS[key] ?? key).toBe(key === "Meipl Harboro viešoji biblioteka" ? copy.library : key);
      }
    });

    it("enables only the current learner's review source", () => {
      vi.stubEnv("VITE_BOOK_REVIEW", "1");
      const profile = helper === "lt" ? "sm-lt" : "sme-en";
      const other = helper === "lt" ? "sme-en" : "sm-lt";
      const config = (id: string) => ({ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: id, VITE_RADIO_FILES: `/__files/${id}` });
      try {
        expect(bookSource(config(profile), SITE)?.profile).toBe(profile);
        expect(bookSource(config(other), SITE)).toBeNull();
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
}
