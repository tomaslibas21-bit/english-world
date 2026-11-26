import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookSource } from "../../src/content/bookSource";
import { LOCATIONS } from "../../src/content/locations";
import { NPCS } from "../../src/content/npcs";
import { BOOK_STATION, SCENE_STATION, STATIONS } from "../../src/content/radio";
import { EDITION } from "../../src/edition";
import { audio } from "../../src/game/audio";
import { createTalkChannel } from "../../src/radio/bookChannel";
import type { RadioOutput } from "../../src/radio/output";
import { Radio, type RadioState } from "../../src/radio/radio";
import { SceneOutput } from "../../src/radio/sceneOutput";
import { sceneSelection, type SceneItem } from "../../src/radio/sceneProgram";
import { loadScene, playableScenes, routeTurns } from "../../src/radio/scenes";
import { TalkProgress } from "../../src/radio/talkProgress";
import { LyricStrip, RadioSetLayer } from "../../src/ui/Radio";
import { spanishBookUiFixture } from "../support/spanish-book-ui-fixture";
import { SITE, SME_FILES, SM_FILES } from "../support/spanish-books";

let radio: Radio;
vi.mock("../../src/radio", () => ({
  get radio() { return radio; }, bindRadio() {},
  useRadio: <T,>(pick: (state: RadioState) => T) => pick(radio.store.getState()),
}));

const manifest = JSON.parse(readFileSync("public/audio-es/manifest.json", "utf8"));
const lithuanian = EDITION.helper === "lt";
const helper = lithuanian ? "lt" : "en";
const profile = lithuanian ? "sm-lt" : "sme-en";
const copy = lithuanian
  ? { frequency: "98,5", random: "Leisti atsitiktinį pokalbį", turn: "Replika", learner: "Tu",
    translation: "Rodyti vertimą", previous: "Ankstesnė eilutė", next: "Kita eilutė" }
  : { frequency: "98.5", random: "Play a random conversation", turn: "Turn", learner: "You",
    translation: "Show translation", previous: "Previous line", next: "Next line" };
const cafe = "s72-cafe";
const selection = sceneSelection(cafe);
const set = () => renderToStaticMarkup(createElement(RadioSetLayer));
const strip = () => renderToStaticMarkup(createElement(LyricStrip, { sidewaysPhone: false }));

function setup({ booksAvailable = false } = {}) {
  const output = {
    onEnded: null as RadioOutput["onEnded"], onStopped: null as RadioOutput["onStopped"],
    play: vi.fn(async (_url: string, _offset: number, _exact?: boolean) => true), position: vi.fn(() => 0),
    pause: vi.fn(), setVolume: vi.fn(), unlock: vi.fn(),
  };
  const source = bookSource({ VITE_RADIO_FILES: lithuanian ? SM_FILES : SME_FILES }, SITE)!;
  const bookOut = {
    unavailable: booksAvailable ? undefined : "unavailable" as const,
    start: vi.fn(async () => {}), stop: vi.fn(), setRates: vi.fn(), position: () => null,
  };
  const talk = createTalkChannel(source.profile, source, bookOut, new SceneOutput(output));
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

describe("Conversaciones FM in the radio set", () => {
  it("tunes 98.5 silently and groups just the recorded situations under their town places", () => {
    const { output, saved } = setup();
    radio.setStation("scenes");
    const html = set();
    expect(html).toContain('data-station="scenes"');
    expect(html).toContain("Conversaciones FM");
    expect(html).toContain("radio-skin-colibri");
    expect(html).toContain(copy.frequency);
    expect(html).toContain(copy.random);
    expect(html.match(/class="rs-key[ "]/g)).toHaveLength(5);
    expect(html.match(/data-scene="/g)).toHaveLength(64);
    for (const scene of playableScenes) {
      const section = html.split(`data-place="${scene.location}"`)[1]?.split("</section>")[0];
      expect(section).toContain(renderToStaticMarkup(createElement("h2", { id: `scene-place-${scene.location}`, lang: "es" }, LOCATIONS[scene.location].name)));
      expect(section).toContain(`data-scene="${scene.id}"`);
    }
    expect(html).toContain('data-sit-icon="coffee"');
    expect(html).toContain(`lang="${helper}">${lithuanian ? "Čia ar išsinešti?" : "For here or to go?"}`);
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
    expect(run.talk.progress.key).toBe(`ew-talk-v1:${profile}`);
    expect(JSON.parse(localStorage.getItem(run.talk.progress.key)!).lastScene).toBe(`scene/${cafe}/pc`);
    const otherLayer = new TalkProgress(lithuanian ? "sme-en" : "sm-lt");
    expect(otherLayer.continueScene()).toBeNull();
    otherLayer.dispose();
  });

  it("shows the cast and actual spoken line, and folds the translation on every turn including a step back", async () => {
    const { output, state, item } = setup();
    radio.setStation("scenes"); radio.listenScene(cafe);
    await vi.waitFor(() => expect(state().status).toBe("playing"), { interval: 1 });
    const [npc, learner] = item().tracks.target.cues;
    const scene = (await loadScene(cafe))!;
    const route = scene.routes[item().routeId];
    const first = scene.turns[route[0]];
    const [, learnerTake] = routeTurns(scene, item().routeId)!;
    expect(npc.translation).toBe(lithuanian ? first.translationLt : first.translation);
    expect(learner.recording()).toContain(`${learnerTake.clipKey}.mp3`);
    expect(output.play).toHaveBeenLastCalledWith(npc.recording(), 0, true);
    expect(strip()).toContain(`class="scene-speaker" lang="es">${NPCS[npc.speaker].name}`);
    expect(strip()).toContain(renderToStaticMarkup(createElement("p", { lang: "es" }, npc.text)));
    expect(strip()).toContain('aria-expanded="false"');
    radio.toggleSceneTranslation();
    expect(strip()).toContain('aria-expanded="true"');
    expect(strip()).toContain(renderToStaticMarkup(createElement("p", { className: "walk-translation", lang: helper }, npc.translation)));
    output.onEnded!();
    expect(output.play).toHaveBeenLastCalledWith(learner.recording(), 0, true);
    expect(strip()).toContain(`class="scene-speaker" lang="${helper}">${copy.learner}`);
    expect(strip()).toContain('aria-expanded="false"');
    radio.toggleSceneTranslation(); radio.toggleSceneTranslation();
    expect(strip()).not.toContain("walk-translation");
    radio.toggleSceneTranslation(); radio.previous();
    expect(strip()).not.toContain("walk-translation");
    radio.setOpen(true); radio.setTalkText(false);
    expect(set()).toContain(`${copy.turn} 1/${item().tracks.target.cues.length}`);
    expect(set()).toContain(copy.translation);
    expect(set()).toContain(`aria-label="${copy.previous}"`);
    expect(set()).toContain(`aria-label="${copy.next}"`);
    expect(strip()).toBe("");
  });

  it("hands playback and the strip between Libros FM and Conversaciones FM in both directions", async () => {
    const { output, bookOut, source, talk, pick } = setup({ booksAvailable: true });
    const { chapter, item } = spanishBookUiFixture(new URL(lithuanian ? "../es-lt/fixtures/books/" : "./fixtures/books/", import.meta.url), helper);
    vi.spyOn(source, "load").mockResolvedValue(item);
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

  it("keeps the scene through a library browse, then restores a saved book only for the chair", async () => {
    const { source, talk, state, output, bookOut, pick } = setup({ booksAvailable: true });
    const { chapter, item } = spanishBookUiFixture(new URL(lithuanian ? "../es-lt/fixtures/books/" : "./fixtures/books/", import.meta.url), helper);
    const loadBook = vi.spyOn(source, "load").mockResolvedValue(item);
    radio.setStation("scenes");
    await pick();
    const scene = state();
    const pauses = output.pause.mock.calls.length;
    radio.openLibraryReader();
    expect(radio.store.getState()).toMatchObject({ station: "scenes", library: {}, shelfOpen: true, readerOpen: false });
    radio.closeShelf();
    expect(state()).toBe(scene);

    const track = item.tracks.paired!;
    const cue = track.cues[0];
    talk.progress.checkpoint(chapter.selection, { sentence: cue.sentenceId, leg: cue.language, offsetSec: 0,
      fraction: 0, complete: false, audioVersion: track.audioVersion, textHash: cue.textHash });
    radio.openLibraryShelf("BK01");
    expect(set()).toContain('data-pad-scope="book-detail"');
    expect(set()).not.toContain("scene-picker");
    expect(loadBook).not.toHaveBeenCalled();
    radio.closeShelf();
    expect(state()).toBe(scene);
    expect(output.pause).toHaveBeenCalledTimes(pauses);

    radio.openLibraryReader();
    await vi.waitFor(() => expect(state().status).toBe("paused"), { interval: 1 });
    expect(radio.store.getState()).toMatchObject({ station: "books", on: false, readerOpen: true });
    expect(state().selection?.chapterId).toBe(chapter.id);
    expect(bookOut.start).not.toHaveBeenCalled();
    expect(loadBook).toHaveBeenCalledTimes(1);
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
