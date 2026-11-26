import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bookSourceConfigured, BOOK_FILES_ROOT } from "../src/content/bookCapability";
import { bookSource, EM_BOOK_PROFILE } from "../src/content/bookSource";
import { hasLibraryShelf } from "../src/content/library";
import { BOOK_STATION, STATIONS } from "../src/content/radio";
import type { GameApi } from "../src/game/gameRef";
import { createBookChannel } from "../src/radio/bookChannel";
import { normalizeBookCatalog, normalizeBookItem } from "../src/radio/books";
import type { RadioOutput } from "../src/radio/output";
import { Radio, type RadioState } from "../src/radio/radio";
import type { TalkOutput } from "../src/radio/talkPlayer";
import { bindLibraryBookFM, type LibraryBookHost } from "../src/ui/libraryBookFM";
import { RadioSetLayer, LyricStrip } from "../src/ui/Radio";

let active: Radio;
vi.mock("../src/radio", () => ({
  get radio() { return active; }, bindRadio() {},
  useRadio: <T,>(pick: (state: RadioState) => T) => pick(active.store.getState()),
}));
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
const book = normalizeBookCatalog(EM_BOOK_PROFILE, fixture("knygos-index"), fixture("stories-index")).books.find((b) => b.id === "BOOK-CANT")!;
const chapter = book.chapters.find((c) => c.id === "BOOK-CANT-01")!;
const selection = chapter.selection;
const item = { ...normalizeBookItem(EM_BOOK_PROFILE, chapter, {
  text: fixture("BOOK-CANT-01-data"), timing: { paired: fixture("BOOK-CANT-01-timing") },
  recording: () => ({ open: () => "recording", key: "recording" }),
}), book };
const cleanup: (() => void)[] = [];
const settle = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => {
  vi.useFakeTimers(); vi.stubEnv("VITE_BOOK_REVIEW", "");
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers();
});

function setup({ music = false, books = true } = {}) {
  const source = bookSource({ VITE_RADIO_FILES: BOOK_FILES_ROOT }, "https://course.test")!;
  const load = vi.spyOn(source, "load").mockResolvedValue(item);
  let at: number | null = null, playing: Parameters<TalkOutput["start"]>[0] | undefined;
  const output: TalkOutput = {
    start: vi.fn(async (request) => { playing = request; at = request.position; }),
    stop: vi.fn(() => { at = null; }), position: () => at, setRates: vi.fn(),
  };
  const channel = createBookChannel(source, output);
  const songOutput = {
    play: vi.fn(async () => true), pause: vi.fn(), position: () => 12, unlock: vi.fn(), setVolume: vi.fn(),
    onEnded: null as RadioOutput["onEnded"], onStopped: null as RadioOutput["onStopped"],
  };
  const radio = active = new Radio({
    books: books ? { station: BOOK_STATION, channel } : undefined,
    config: music ? { index: "/songs/index.json", files: null, recordings: null } : null,
    stations: STATIONS, output: songOutput, token: () => null, volume: () => 0.5, storageKey: "library-radio",
    fetchJson: async () => ({ songs: [{ id: "G01", n: 1, c: "g", t: "Song", a: "/song.mp3" }] }),
  });
  let chair: number | null = null, zone = "library", focusAllowed = true;
  const world = new Set<() => void>(), jobs: (() => void)[] = [];
  const game = { light: false, get libraryChair() { return chair; } } as unknown as GameApi;
  const host: LibraryBookHost = {
    zone: () => zone, subscribe: (update) => { world.add(update); return () => { world.delete(update); }; },
    defer: (job) => jobs.push(job), canFocus: () => focusAllowed, focusStand: vi.fn(), focusWorld: vi.fn(),
  };
  const emit = () => { for (const update of world) update(); };
  const dispose = bindLibraryBookFM(game, radio, host);
  cleanup.push(() => { radio.shutdown(); channel.player.dispose(); }, dispose);
  return { radio, channel, load, output, songOutput, game, host, dispose, state: () => radio.store.getState(),
    browse: () => game.onLibraryShelf?.(),
    sit: (index: number) => { chair = index; emit(); game.onLibraryReader?.(index); },
    stand: () => { chair = null; emit(); },
    zone: (id: string) => { zone = id; emit(); },
    allowFocus: (allowed: boolean) => { focusAllowed = allowed; emit(); },
    flushFocus: () => { while (jobs.length) jobs.shift()!(); },
    advance: (seconds: number) => { at = seconds; playing?.onTime(); },
  };
}

it("uses the same pure capability for the library, Book FM and review profiles without making requests", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  expect(hasLibraryShelf).toBe(bookSourceConfigured);
  const cases: [Record<string, string>, boolean][] = [
    [{}, false], [{ VITE_RADIO_FILES: BOOK_FILES_ROOT + "/" }, true],
    [{ VITE_RADIO_FILES: "https://other.test/music" }, false],
    ...["em-lt", "sm-lt", "sme-en"].map((id): [Record<string, string>, boolean] =>
      [{ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: id, VITE_RADIO_FILES: `/__files/${id}` }, true]),
    [{ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: "em-lt", VITE_RADIO_FILES: "/__files/sm-lt" }, false],
  ];
  for (const [env, enabled] of cases) {
    vi.stubEnv("VITE_BOOK_REVIEW", env.VITE_BOOK_REVIEW ?? "");
    expect(hasLibraryShelf(env)).toBe(enabled);
    expect(!!bookSource(env, "https://course.test")).toBe(enabled);
  }
  expect(fetch).not.toHaveBeenCalled();
});

it("opens the actual shelf over the room while leaving music and the player's intent alone", async () => {
  const f = setup({ music: true }); await f.radio.init();
  f.radio.setOn(true); await settle();
  const before = f.state(), starts = f.songOutput.play.mock.calls.length, stops = f.songOutput.pause.mock.calls.length;
  f.browse();
  expect(f.state()).toMatchObject({ open: true, libraryOpen: true, shelfOpen: true, station: before.station, on: true });
  expect(f.load).not.toHaveBeenCalled();
  const html = renderToStaticMarkup(createElement(RadioSetLayer));
  expect(html).toContain('data-pad-scope="book-shelf"');
  expect(html).not.toContain('class="radio-set');
  f.radio.closeShelf(); f.flushFocus();
  expect(f.state()).toMatchObject({ open: false, libraryOpen: false });
  expect(f.songOutput.play).toHaveBeenCalledTimes(starts);
  expect(f.songOutput.pause).toHaveBeenCalledTimes(stops);
  expect(f.host.focusWorld).toHaveBeenCalledOnce();
});

it("uses the radio picker command for a chapter and hands music over exactly once", async () => {
  const f = setup({ music: true }); await f.radio.init(); f.radio.setOn(true); await settle();
  const tune = vi.spyOn(f.radio, "setStation");
  f.browse(); f.radio.read(selection); await settle();
  expect(tune).toHaveBeenCalledExactlyOnceWith("books", false);
  expect(f.load).toHaveBeenCalledTimes(1);
  expect(f.state()).toMatchObject({ station: "books", libraryOpen: true, readerOpen: true, on: true, playing: true });
  expect(f.channel.player.getSnapshot()).toMatchObject({ selection, playIntent: true, status: "playing" });
});

it.each([0, 1])("opens the shelf on chair %i for a first visit without playing anything", (index) => {
  const f = setup(); f.sit(index);
  expect(f.state()).toMatchObject({ libraryOpen: true, shelfOpen: true, readerOpen: false, on: false });
  expect(f.output.start).not.toHaveBeenCalled();
  expect(f.load).not.toHaveBeenCalled();
  f.radio.closeShelf(); f.flushFocus();
  expect(f.game.libraryChair).toBe(index);
  expect(f.host.focusStand).toHaveBeenCalledOnce();
});

it("joins a paused book at the same sentence, position and bookmark without issuing Play", async () => {
  const f = setup(); f.browse(); f.radio.read(selection); await settle();
  f.advance(1.25); f.radio.pause(); f.radio.closeReader();
  const before = f.channel.player.getSnapshot(), ledger = f.channel.progress.getSnapshot(), on = f.state().on;
  const play = vi.spyOn(f.channel.player, "play"), select = vi.spyOn(f.channel.player, "select");
  const starts = vi.mocked(f.output.start).mock.calls.length, stops = vi.mocked(f.output.stop).mock.calls.length;
  f.sit(0); await settle();
  expect(f.channel.player.getSnapshot()).toBe(before);
  expect(f.channel.progress.getSnapshot()).toBe(ledger);
  expect(f.state()).toMatchObject({ libraryOpen: true, readerOpen: true, shelfOpen: false, on });
  expect(play).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
  expect(f.output.start).toHaveBeenCalledTimes(starts); expect(f.output.stop).toHaveBeenCalledTimes(stops);
  f.radio.closeReader(); f.flushFocus();
  expect(f.host.focusStand).toHaveBeenCalledOnce();
  f.stand(); f.flushFocus();
  expect(f.host.focusWorld).toHaveBeenCalledOnce();
  expect(f.channel.player.getSnapshot()).toBe(before);
});

it("keeps one playing clock through shelf, chair, Back, standing and the street strip", async () => {
  const f = setup(); f.browse(); f.radio.read(selection); await settle(); f.radio.closeReader();
  const player = f.channel.player, progress = f.channel.progress;
  const cue = item.tracks.paired!.cues[0]; f.advance(cue.start + 0.1);
  const before = player.getSnapshot(), starts = vi.mocked(f.output.start).mock.calls.length;
  f.sit(1);
  expect(player.getSnapshot()).toBe(before);
  const reader = renderToStaticMarkup(createElement(RadioSetLayer));
  expect(reader).toContain(`data-reader-pair="${before.cue!.sentenceId}"`);
  expect(reader).toContain('data-current="true"');
  f.radio.closeReader(); f.flushFocus();
  expect(f.game.libraryChair).toBe(1);
  expect(f.host.focusStand).toHaveBeenCalledOnce();
  f.stand(); f.zone("town"); f.flushFocus();
  const next = item.tracks.paired!.cues.find((c) => c.sentenceId !== before.cue!.sentenceId)!;
  f.advance(next.start + 0.05);
  const after = player.getSnapshot();
  expect(after).toMatchObject({ playIntent: true, status: "playing", cue: { sentenceId: next.sentenceId } });
  expect(f.radio.books!.player).toBe(player); expect(f.radio.books!.progress).toBe(progress);
  expect(f.output.start).toHaveBeenCalledTimes(starts);
  const strip = renderToStaticMarkup(createElement(LyricStrip, { sidewaysPhone: false }));
  expect(strip).toContain("book-walking");
  expect(strip).toContain(after.cue!.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;"));
});

it("restores a saved book silently and never reopens a reader after standing during its load", async () => {
  const f = setup();
  const cue = item.tracks.paired!.cues[0];
  f.channel.progress.checkpoint(selection, { sentence: cue.sentenceId, leg: cue.language, offsetSec: 0.2,
    fraction: cue.start / item.tracks.paired!.duration, complete: false, audioVersion: item.tracks.paired!.audioVersion, textHash: cue.textHash });
  let resolve!: (value: typeof item) => void;
  f.load.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  f.sit(0);
  expect(f.channel.player.getSnapshot()).toMatchObject({ status: "loading", playIntent: false });
  f.stand(); f.flushFocus(); resolve(item); await settle();
  expect(f.state()).toMatchObject({ open: false, libraryOpen: false, readerOpen: false, on: false });
  expect(f.channel.player.getSnapshot()).toMatchObject({ status: "paused", playIntent: false });
  expect(f.output.start).not.toHaveBeenCalled();
  expect(f.host.focusWorld).toHaveBeenCalledOnce();
});

it("opens the last completed book quietly rather than treating a returning reader as a first visit", async () => {
  const f = setup(), track = item.tracks.paired!, cue = track.cues.at(-1)!;
  f.channel.progress.checkpoint(selection, { sentence: cue.sentenceId, leg: cue.language, offsetSec: 0,
    fraction: 1, complete: true, audioVersion: track.audioVersion, textHash: cue.textHash });
  f.sit(1); await settle();
  expect(f.state()).toMatchObject({ libraryOpen: true, readerOpen: true, shelfOpen: false });
  // The bookmark identifies the chapter. Forward navigation comes from the loaded catalog item.
  const restored = f.channel.player.getSnapshot();
  expect(restored).toMatchObject({ selection: { itemKey: selection.itemKey, chapterId: selection.chapterId }, playIntent: false, status: "paused" });
  expect(restored.item?.selection.nextChapterId).toBe(selection.nextChapterId);
  expect(f.output.start).not.toHaveBeenCalled();
});

it("cancels a stale chair hook on zone change and restores hooks on disposal", () => {
  const f = setup(); const lateReader = f.game.onLibraryReader!;
  f.sit(0); f.zone("town"); f.flushFocus(); lateReader(0);
  expect(f.state().open).toBe(false);
  f.zone("library"); f.sit(1); f.radio.closeShelf();
  f.dispose(); f.flushFocus();
  expect(f.game.onLibraryReader).toBeUndefined(); expect(f.game.onLibraryShelf).toBeUndefined();
  expect(f.host.focusStand).not.toHaveBeenCalled();
  lateReader(1); expect(f.state().open).toBe(false);
});

it("waits for a blocking panel before restoring chair focus", () => {
  const f = setup(); f.sit(0); f.allowFocus(false); f.radio.closeShelf(); f.flushFocus();
  expect(f.host.focusStand).not.toHaveBeenCalled();
  f.allowFocus(true); f.flushFocus(); expect(f.host.focusStand).toHaveBeenCalledOnce();
});

it("unwinds library children when the radio cabinet or an ordinary station takes over", async () => {
  const f = setup({ music: true }); await f.radio.init();
  f.browse(); f.radio.setOpen(true);
  expect(f.state()).toMatchObject({ open: true, libraryOpen: false, shelfOpen: false, readerOpen: false });
  f.browse(); f.radio.read(selection); await settle();
  f.radio.setStation("grammar");
  expect(f.state()).toMatchObject({ libraryOpen: false, shelfOpen: false, readerOpen: false });
});

it("leaves the radio's own nested Back behavior intact", async () => {
  const f = setup(); f.radio.setStation("books"); f.radio.read(selection); await settle();
  f.radio.closeReader();
  expect(f.state()).toMatchObject({ open: true, libraryOpen: false, shelfOpen: true, readerOpen: false });
});

it("does not attach library hooks without a configured book channel", () => {
  const f = setup({ books: false });
  expect(f.game.onLibraryShelf).toBeUndefined(); expect(f.game.onLibraryReader).toBeUndefined();
  expect(f.radio.openLibraryShelf()).toBe(false); expect(f.radio.openLibraryReader()).toBe(false);
});
