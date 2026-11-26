import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookSource, EM_BOOK_PROFILE } from "../src/content/bookSource";
import { LOCATIONS } from "../src/content/locations";
import { BOOK_STATION, SCENE_STATION, STATIONS } from "../src/content/radio";
import { audio } from "../src/game/audio";
import { createTalkChannel } from "../src/radio/bookChannel";
import { normalizeBookCatalog, normalizeBookItem } from "../src/radio/books";
import type { RadioOutput } from "../src/radio/output";
import { Radio, type RadioState } from "../src/radio/radio";
import { SceneOutput } from "../src/radio/sceneOutput";
import { sceneSelection, type SceneItem } from "../src/radio/sceneProgram";
import { loadScene, playableScenes } from "../src/radio/scenes";
import { LyricStrip, RadioSetLayer } from "../src/ui/Radio";

let radio: Radio;
vi.mock("../src/radio", () => ({
  get radio() { return radio; }, bindRadio() {},
  useRadio: <T,>(pick: (state: RadioState) => T) => pick(radio.store.getState()),
}));

const manifest = JSON.parse(readFileSync("public/audio-v2/manifest.json", "utf8"));
const cafe = "s72-cafe";
const selection = sceneSelection(cafe);
const set = () => renderToStaticMarkup(createElement(RadioSetLayer));
const strip = () => renderToStaticMarkup(createElement(LyricStrip, { sidewaysPhone: false }));

function setup({ booksAvailable = false } = {}) {
  const output = {
    onEnded: null as RadioOutput["onEnded"], onStopped: null as RadioOutput["onStopped"],
    play: vi.fn(async (_url: string, _offset: number) => true), position: vi.fn(() => 0),
    pause: vi.fn(), setVolume: vi.fn(), unlock: vi.fn(),
  };
  const source = bookSource({ VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/fluent-steps" }, "https://course.test")!;
  const bookOut = {
    unavailable: booksAvailable ? undefined : "unavailable" as const,
    start: vi.fn(async () => {}), stop: vi.fn(), setRates: vi.fn(), position: () => null,
  };
  const talk = createTalkChannel(source, bookOut, new SceneOutput(output));
  radio = new Radio({
    scenes: { station: SCENE_STATION, channel: talk }, books: { station: BOOK_STATION, channel: { ...talk, source } },
    stations: STATIONS, config: null, fetchJson: vi.fn(), output, token: () => null, volume: () => 0.65, storageKey: "radio",
  });
  const state = talk.player.getSnapshot;
  const item = () => state().item as SceneItem;
  const saved = () => talk.progress.getSnapshot().items[selection.itemKey];
  const pick = async () => {
    radio.listenScene(cafe);
    await vi.waitFor(() => expect(state().status).toBe("playing"), { interval: 1 });
    return item().routeId;
  };
  return { output, bookOut, source, talk, state, item, saved, pick };
}

beforeEach(async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  vi.spyOn(audio, "init").mockResolvedValue();
  audio.manifest = manifest;
  await loadScene(cafe);
});
afterEach(() => { radio?.shutdown(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Conversation FM in the radio set", () => {
  it("tunes 98.5 silently and groups just the recorded situations under their town places", () => {
    const { output, saved } = setup();
    radio.setStation("scenes");
    const html = set();
    expect(html).toContain('data-station="scenes"');
    expect(html).toContain("98,5");
    expect(html).toContain("Leisti atsitiktinį pokalbį");
    expect(html.match(/class="rs-key[ "]/g)).toHaveLength(5);
    expect(html).not.toMatch(/data-scene="(?:p26-complaint|p28-kitchen)"|<img/);
    expect(html.match(/data-scene="/g)).toHaveLength(playableScenes.length);
    for (const scene of playableScenes) {
      const section = html.split(`data-place="${scene.location}"`)[1]?.split("</section>")[0];
      expect(section).toContain(renderToStaticMarkup(createElement("h2", { id: `scene-place-${scene.location}` }, LOCATIONS[scene.location].lt)));
      expect(section).toContain(`data-scene="${scene.id}"`);
    }
    expect(html).toContain('data-sit-icon="coffee"');
    expect(html).toContain("Čia ar išsinešti?");
    expect(output.play).not.toHaveBeenCalled();
    expect(audio.init).not.toHaveBeenCalled();
    expect(saved()).toBeUndefined();
  });

  it("shuffles Play any across the playable situations", () => {
    setup();
    radio.setStation("scenes");
    const choose = vi.spyOn(radio, "listenScene").mockImplementation(() => {});
    for (const _ of playableScenes) radio.playAnyScene();
    expect(new Set(choose.mock.calls.flat())).toEqual(new Set(playableScenes.map((s) => s.id)));
  });

  it("draws on each explicit play, resumes the route on retune and exhausts all 40 before repeating across reload", async () => {
    let run = setup();
    radio.setStation("scenes");
    const ids = [await run.pick()];
    radio.next();
    radio.browse();
    radio.closeShelf();
    radio.setStation("books");
    radio.setStation("scenes");
    await vi.waitFor(() => expect(run.state().status).toBe("playing"), { interval: 1 });
    expect(run.state().cue?.sentenceId).toBe("turn-2");
    expect(run.item().routeId).toBe(ids[0]);
    expect(run.saved()?.sceneBag?.position).toBe(1);
    for (let i = 1; i < 40; i++) {
      if (i === 20) { radio.shutdown(); run = setup(); radio.setStation("scenes"); }
      ids.push(await run.pick());
    }
    expect(new Set(ids).size).toBe(40);
    expect(run.saved()?.sceneBag?.position).toBe(40);
    expect(await run.pick()).not.toBe(ids.at(-1));
    expect(run.saved()?.sceneBag?.position).toBe(1);
    expect(run.talk.progress.continueListening()).toBeNull();
  });

  it("shows the cast and actual spoken line, and folds the translation on every turn including a step back", async () => {
    const { output, state, item } = setup();
    radio.setStation("scenes"); radio.listenScene(cafe);
    await vi.waitFor(() => expect(state().status).toBe("playing"), { interval: 1 });
    const [npc, learner] = item().tracks.target.cues;
    expect(output.play).toHaveBeenLastCalledWith(npc.recording(), 0, true);
    expect(strip()).toContain("Mia");
    expect(strip()).toContain('aria-expanded="false"');
    radio.toggleSceneTranslation();
    expect(strip()).toContain('aria-expanded="true"');
    expect(strip()).toContain(npc.translation);
    output.onEnded!();
    expect(output.play).toHaveBeenLastCalledWith(learner.recording(), 0, true);
    expect(strip()).toContain('class="scene-speaker">Tu');
    expect(strip()).toContain('aria-expanded="false"');
    radio.toggleSceneTranslation(); radio.toggleSceneTranslation();
    expect(strip()).not.toContain("walk-translation");
    radio.toggleSceneTranslation(); radio.previous();
    expect(strip()).not.toContain("walk-translation");
    radio.setOpen(true); radio.setTalkText(false);
    expect(set()).toContain(`Replika 1/${item().tracks.target.cues.length}`);
    expect(set()).toContain("Čia ar išsinešti?");
    expect(set()).toContain("Rodyti vertimą");
    expect(strip()).toBe("");
  });

  it("hands playback and the strip between Book FM and Conversation FM in both directions", async () => {
    const { output, bookOut, source, talk, pick } = setup({ booksAvailable: true });
    const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
    const book = normalizeBookCatalog(EM_BOOK_PROFILE, fixture("knygos-index"), fixture("stories-index")).books[0];
    const chapter = book.chapters[0];
    vi.spyOn(source, "load").mockResolvedValue({ ...normalizeBookItem(EM_BOOK_PROFILE, chapter, {
      text: fixture("BOOK-CANT-01-data"), timing: { paired: fixture("BOOK-CANT-01-timing") },
      recording: () => ({ open: () => "recording", key: "recording" }),
    }), book });
    radio.read(chapter.selection);
    await vi.waitFor(() => expect(radio.store.getState().playing).toBe(true));
    expect(strip()).toBe("");
    radio.closeReader();
    expect(strip()).toContain(BOOK_STATION.name);

    radio.openReader();
    radio.openSettings();
    radio.setStation("scenes");
    expect(radio.store.getState()).toMatchObject({ readerOpen: false, settingsOpen: false, shelfOpen: true });
    expect(radio.books!.player).toBe(talk.player);
    expect(bookOut.stop).toHaveBeenCalledWith("change");
    await pick();
    expect(bookOut.stop.mock.invocationCallOrder.at(-1)).toBeLessThan(output.play.mock.invocationCallOrder[0]);
    expect(strip()).toContain(SCENE_STATION.name);

    radio.setStation("books");
    await vi.waitFor(() => expect(radio.store.getState().playing).toBe(true));
    expect(output.pause.mock.invocationCallOrder.at(-1)).toBeLessThan(bookOut.start.mock.invocationCallOrder.at(-1)!);
    expect(talk.player.getSnapshot().item?.selection).toEqual(chapter.selection);
    expect(strip()).toContain(BOOK_STATION.name);
    expect(strip()).not.toContain("scene-speaker");
  });

  it("stops even a pending clip for capture and waits for every hold before starting the same turn", async () => {
    const { output, bookOut, state, item } = setup();
    let finish!: (ok: boolean) => void;
    output.play.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    radio.setStation("scenes"); radio.listenScene(cafe);
    await vi.waitFor(() => expect(output.play).toHaveBeenCalledTimes(1), { interval: 1 });
    const lateEnd = output.onEnded!;
    const previousStops = output.pause.mock.calls.length;
    radio.hold("microphone"); radio.hold("voice");
    expect(output.pause).toHaveBeenCalledTimes(previousStops + 1);
    finish(true); lateEnd();
    expect(state().status).toBe("held");
    vi.useFakeTimers();
    radio.release("microphone"); await vi.advanceTimersByTimeAsync(800);
    expect(output.play).toHaveBeenCalledTimes(1);
    radio.release("voice"); await vi.advanceTimersByTimeAsync(710);
    expect(output.play).toHaveBeenCalledTimes(2);
    expect(output.play).toHaveBeenLastCalledWith(item().tracks.target.cues[0].recording(), 0, true);
    expect(state().status).toBe("playing");
    expect(bookOut.start).not.toHaveBeenCalled();
  });

  it("ends in silence with book autoplay enabled, and an explicit replay draws a fresh route", async () => {
    const { talk, output, state, saved, item, pick } = setup();
    radio.setStation("scenes");
    const first = await pick();
    expect(state().prefs.autoplay).toBe(true);
    talk.player.setSleep("end");
    talk.player.seekSentence(item().tracks.target.cues.at(-1)!.sentenceId);
    const started = output.play.mock.calls.length;
    output.onEnded!();
    expect(state()).toMatchObject({ status: "ended", playIntent: false, sleep: null });
    expect(output.play).toHaveBeenCalledTimes(started);
    expect(talk.progress.continueScene()).toBeNull();
    radio.play();
    await vi.waitFor(() => expect(state().status).toBe("playing"), { interval: 1 });
    expect(item().routeId).not.toBe(first);
    expect(state().cue?.sentenceId).toBe("turn-1");
    expect(saved()?.sceneBag?.position).toBe(2);
    expect(talk.progress.get(selection)?.complete).toBe(false);
  });

  it("keeps the bag intact on failed validation or a station change during loading", async () => {
    const { talk, output, state, saved, pick } = setup();
    radio.setStation("scenes"); await pick();
    const before = saved()?.sceneBag;
    radio.listenScene(cafe); radio.setStation("books");
    await vi.dynamicImportSettled();
    expect(saved()?.sceneBag).toEqual(before);
    expect(state().item).toBeNull();
    radio.setStation("scenes");
    await vi.waitFor(() => expect(state().status).toBe("playing"), { interval: 1 });
    const starts = output.play.mock.calls.length;
    audio.manifest = {};
    await talk.player.select(selection, true, true);
    expect(state().status).toBe("error");
    expect(output.play).toHaveBeenCalledTimes(starts);
    expect(saved()?.sceneBag).toEqual(before);
    audio.manifest = manifest;
    await talk.player.retry(true);
    expect(saved()?.sceneBag?.position).toBe(2);
  });
});
