import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookSource, EM_BOOK_PROFILE } from "../src/content/bookSource";
import { BOOK_STATION, STATIONS } from "../src/content/radio";
import { normalizeBookCatalog, normalizeBookItem } from "../src/radio/books";
import { createBookChannel } from "../src/radio/bookChannel";
import type { RadioOutput } from "../src/radio/output";
import { Radio, type RadioState } from "../src/radio/radio";
import type { TalkOutput } from "../src/radio/talkPlayer";
import { LyricStrip, RadioSetLayer } from "../src/ui/Radio";

let active: Radio;
vi.mock("../src/radio", () => ({
  get radio() { return active; }, bindRadio() {},
  useRadio: <T,>(pick: (state: RadioState) => T) => pick(active.store.getState()),
}));
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
const config = { index: "/songs/index.json", files: null, recordings: null };
const songs = ["G01", "G02", "V01"].map((id) => ({ id, n: 1, c: id[0].toLowerCase(), t: id, a: `/songs/audio/${id}.mp3` }));
const book = normalizeBookCatalog(EM_BOOK_PROFILE, fixture("knygos-index"), fixture("stories-index")).books[0];
const chapter = book.chapters[0];
const item = { ...normalizeBookItem(EM_BOOK_PROFILE, chapter, {
  text: fixture("BOOK-CANT-01-data"), timing: { paired: fixture("BOOK-CANT-01-timing") }, recording: () => ({ open: () => "recording", key: "recording" }),
}), book };
const settle = () => vi.advanceTimersByTimeAsync(0);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup({ music = true, books = true, songList = async () => ({ songs }) } = {}) {
  const source = bookSource({ VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/fluent-steps" }, "https://course.test")!;
  const load = vi.spyOn(source, "load").mockResolvedValue(item);
  const catalog = vi.spyOn(source, "catalog");
  const songOutput = {
    play: vi.fn(async () => true), pause: vi.fn(), unlock: vi.fn(), position: () => 0, setVolume: vi.fn(),
    onEnded: null as RadioOutput["onEnded"], onStopped: null as RadioOutput["onStopped"],
  };
  const output: TalkOutput = { start: vi.fn(async () => {}), stop: vi.fn(), position: () => null, setRates: vi.fn() };
  const channel = createBookChannel(source, output);
  const fetchJson = vi.fn(async (url) => url === config.index ? songList() : { L: [] });
  const radio = active = new Radio({
    books: books ? { station: BOOK_STATION, channel } : undefined, config: music ? config : null,
    stations: STATIONS, fetchJson, output: songOutput, volume: () => 0.5, token: () => null, storageKey: "radio",
    spotRecording: (spot) => ({ spot, url: spot.id, duration: 3 }),
    favorites: { list: () => [], toggle: () => true },
  });
  return { radio, channel, songOutput, output, load, catalog, fetchJson, state: () => radio.store.getState() };
}

beforeEach(() => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
});
afterEach(() => { active?.shutdown(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Book FM in the radio", () => {
  it("keeps a legacy song-only save and starts a new listener on Grammar", async () => {
    expect(setup().state().station).toBe("grammar");
    localStorage.setItem("radio", JSON.stringify({ station: "vocab", song: "V01", at: 12, places: { grammar: "G02" } }));
    const { radio, state } = setup({ books: false });
    await radio.init();
    expect(state()).toMatchObject({ station: "vocab", song: { id: "V01" }, on: false, counts: { favorites: 0 } });
    expect(radio.position()).toBe(12);
    radio.setStation("books");
    expect(state().station).toBe("vocab");
    expect(setup({ music: false, books: false }).state().available).toBe(false);
  });

  it("offers a silent books-only set and opens the shelf on tuning, with no requests at boot", async () => {
    const { radio, state, load, catalog, fetchJson } = setup({ music: false });
    await radio.init();
    radio.power();
    expect(state()).toMatchObject({ station: "books", open: true, playing: false, musicAvailable: false });
    const html = renderToStaticMarkup(createElement(RadioSetLayer));
    expect(html).toContain('aria-label="Stočių grupės"');
    expect(html).toContain('data-station="books"');
    expect(html).not.toMatch(/data-station="grammar"|Conversation FM|VOA|<img/);
    expect(html.match(/class="rs-key[ "]/g)).toHaveLength(5);
    radio.setStation("books");
    expect(state().shelfOpen).toBe(true);
    expect(load).not.toHaveBeenCalled();
    expect(catalog).not.toHaveBeenCalled();
    expect(fetchJson).not.toHaveBeenCalled();
    radio.setOpen(false);
    expect(state()).toMatchObject({ shelfOpen: false, open: false });
  });

  it("keeps song and spot ends inside music and preserves the station's place through a talk visit", async () => {
    const { radio, songOutput, state } = setup();
    radio.setOn(true); await settle();
    radio.setStation("favorites");
    songOutput.onEnded!(); await settle();
    expect(state().song?.id).toBe("G02");
    songOutput.onEnded!(); await settle();
    expect(state().spot?.spot.kind).toBe("jingle");
    songOutput.onEnded!(); await settle();
    expect(state().station).toBe("vocab");
    radio.suggest(["G01"]);
    radio.setStation("books");
    expect(state()).toMatchObject({ station: "books", upNext: null, spot: null, timeline: null, song: null, liked: false, linePictures: null, lineNotes: null });
    radio.listen(chapter.selection); await settle();
    songOutput.onEnded!(); songOutput.onStopped!("error"); radio.suggest(["G01"]);
    expect(state()).toMatchObject({ station: "books", playing: true, upNext: null });
    radio.setStation("vocab"); await settle();
    expect(state()).toMatchObject({ station: "vocab", song: { id: "V01" }, playing: true });
    expect(JSON.parse(localStorage.getItem("radio")!).places.grammar).toBeUndefined(); // rotation finished it
    expect(state().counts.favorites).toBe(0);
  });

  it("ignores late list arrivals and late song starts after the learner has tuned away", async () => {
    const list = deferred<{ songs: typeof songs }>();
    const { radio, state, songOutput } = setup({ songList: () => list.promise });
    radio.setOn(true);
    radio.setStation("books");
    list.resolve({ songs }); await settle();
    expect(state()).toMatchObject({ station: "books", song: null, shelfOpen: true, ready: true });
    const start = deferred<boolean>();
    songOutput.play.mockImplementationOnce(() => start.promise);
    radio.setStation("grammar");
    radio.setStation("books");
    start.resolve(true); await settle();
    expect(state()).toMatchObject({ station: "books", song: null, playing: false, upNext: null });
    expect(JSON.parse(localStorage.getItem("radio")!).places.grammar).toBe("G01");
  });

  it("dispatches previous/next to sentences, keeps browsing silent and restores the unfinished selection", async () => {
    const { radio, channel, load, output, state } = setup();
    radio.setOn(true); await settle();
    radio.setStation("books"); radio.listen(chapter.selection); await settle();
    expect(state()).toMatchObject({ playing: true, open: false, on: true });
    const { player } = channel;
    radio.next(); await settle();
    expect(player.getSnapshot().cue).toMatchObject({ sentenceId: "BOOK-CANT-01-S002", language: "lt" });
    radio.previous(); await settle();
    expect(player.getSnapshot().cue?.sentenceId).toBe("BOOK-CANT-01-S001");
    const starts = vi.mocked(output.start).mock.calls.length;
    radio.browse(); radio.closeShelf();
    expect(output.start).toHaveBeenCalledTimes(starts);
    radio.hold("microphone", true); radio.pause(); radio.release("microphone");
    await vi.advanceTimersByTimeAsync(710);
    expect(state().playing).toBe(false);
    radio.setStation("grammar"); await settle();
    expect(player.getSnapshot().item).toBeNull();
    radio.setStation("books"); await settle();
    expect(player.getSnapshot()).toMatchObject({ playIntent: true, item: { selection: chapter.selection } });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shows the voiced leg, reveals translations only in target mode, and folds text independently of music", async () => {
    const { radio, channel } = setup({ music: false });
    radio.listen(chapter.selection); await settle();
    const strip = () => renderToStaticMarkup(createElement(LyricStrip, { sidewaysPhone: true }));
    expect(strip()).toContain(item.tracks.paired!.cues[0].text);
    expect(strip()).not.toContain("<button");
    channel.player.changeMode("target"); await settle();
    expect(strip()).toContain('lang="en"');
    expect(strip()).toContain(item.tracks.target!.cues[0].text);
    expect(strip().match(/<button/g)).toHaveLength(1);
    expect(strip()).toContain('aria-expanded="false">Rodyti vertimą');
    const styles = readFileSync(new URL("../src/ui/radio.css", import.meta.url), "utf8");
    expect(styles).toMatch(/\.hud \.book-walking\s*\{[^}]*pointer-events: none/);
    expect(styles).toMatch(/\.translate\s*\{[^}]*pointer-events: auto/);
    radio.setTalkText(false);
    expect(strip()).toBe("");
    expect(radio.store.getState().lyrics).toBe(true);
    radio.setOpen(true);
    expect(renderToStaticMarkup(createElement(RadioSetLayer))).toContain("Rodyti vertimą");
  });
});
