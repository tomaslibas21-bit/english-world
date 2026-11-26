import { afterEach, describe, expect, it, vi } from "vitest";
import { BookBufferOutput } from "../src/radio/bookBufferOutput";
import { BookOutput, createBookOutput } from "../src/radio/bookOutput";
import { bookRateSwitches, englishBookCues } from "../src/radio/bookTiming";
import { TalkPlayer, type TalkCue, type TalkItem, type TalkOutput, type TalkTrack } from "../src/radio/talkPlayer";
import { TalkProgress, type TalkMode } from "../src/radio/talkProgress";

type Request = Parameters<TalkOutput["start"]>[0];
const selection = { itemKey: "book/BOOK-CANT/author", chapterId: "BOOK-CANT-01" } as const;
const mixed = { lt: 1.5, en: 1 / 0.75 };
const starts = { paired: [0, 3, 7, 10, 15, 18], target: [0, 3.05, 6.1], helper: [0, 3.5, 7] };
const mediaDuration = { paired: 21, target: 9, helper: 10 };

function chapter(token = () => "sample", measured = true): TalkItem {
  const track = (mode: TalkMode): TalkTrack => {
    const cues: TalkCue[] = starts[mode].map((start, index) => {
      const line = Math.floor(index / (mode === "paired" ? 2 : 1)) + 1;
      return { sentenceId: `line-${line}`, start, end: start + 2.5,
        language: mode === "helper" || (mode === "paired" && index % 2 === 0) ? "lt" : "en",
        text: `Speech ${line}`, textHash: String(line) };
    });
    return {
      mode, cues, duration: mediaDuration[mode], audioVersion: "abc",
      recording: () => `https://audio.test/${mode}.mp3?t=${token()}`,
      rateSwitches: mode === "paired" && measured ? cues.map((cue, index) => ({
        language: cue.language, from: index ? cue.start - 0.3 : 0, until: index ? cue.start - 0.08 : 0,
      })) : undefined,
    };
  };
  return { selection, tracks: { paired: track("paired"), target: track("target"), helper: track("helper") } };
}

class AudioDouble extends EventTarget {
  src = "";
  currentTime = 0;
  preservesPitch = false;
  playbackRate = 1;
  muted = false;
  paused = true;
  seeking = false;
  readyState = 0;
  ended = false;
  error: unknown;
  get duration() { return mediaDuration[new URL(this.src).pathname.slice(1, -4) as TalkMode]; }
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn(() => { this.src = ""; });
  load = vi.fn();
  at(seconds: number) {
    this.currentTime = seconds;
    this.dispatchEvent(new Event("timeupdate"));
  }
  end() {
    this.ended = true;
    this.dispatchEvent(new Event("ended"));
  }
}

function setup(fetcher = vi.fn<typeof fetch>()) {
  const parts: AudioDouble[] = [];
  const initialPlay: Array<() => Promise<void>> = [];
  const output = new BookOutput(() => {
    const media = new AudioDouble();
    const play = initialPlay.shift();
    if (play) media.play.mockImplementationOnce(play);
    parts.push(media);
    return media as unknown as HTMLAudioElement;
  }, fetcher);
  disposables.push(() => output.stop());
  const request = (item: TalkItem, track: TalkMode = "paired", position = 0, rates = mixed) => {
    const controller = new AbortController();
    return { controller, item, track: item.tracks[track]!, position, rates, signal: controller.signal,
      onTime: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
  };
  return { output, parts, initialPlay, fetcher, request };
}

const disposables: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposables.splice(0)) dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe("HTML chapter output", () => {
  it("fades timed sleep, then closes its source, while capture can cut the fade immediately", async () => {
    vi.useFakeTimers();
    const { output, parts, request } = setup();
    const start = request(chapter(), "target");
    await output.start(start);
    const media = parts[0];
    output.stop("sleep");
    start.controller.abort(); // The player's canceled request must allow the requested fade to finish.
    expect(media.paused).toBe(false);
    await vi.advanceTimersByTimeAsync(90);
    expect((media as unknown as HTMLAudioElement).volume).toBeLessThan(1);
    output.stop("capture");
    expect(media.paused).toBe(true);
    expect(media.src).toBe("");
    await vi.advanceTimersByTimeAsync(200);
    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it("finishes the sleep fade and silences background playback without waiting for a visible-page fade", async () => {
    vi.useFakeTimers();
    const { output, parts, request } = setup();
    await output.start(request(chapter(), "target"));
    output.stop("sleep");
    await vi.advanceTimersByTimeAsync(180);
    expect(parts[0].paused).toBe(true);
    expect(parts[0].src).toBe("");
    vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: true }));
    await output.start(request(chapter(), "target"));
    output.stop("sleep");
    expect(parts[1].paused).toBe(true);
    expect(parts[1].src).toBe("");
  });

  it.each([
    ["helper", 0.75, 0.75], ["helper", 2, 2], ["target", 0.75, 1], ["target", 1, 1 / 0.75],
  ] as const)("uses the %s master at %s requested rate, including exact first/middle/last cue seeks", async (mode, rate, mediaRate) => {
    const { output, parts } = setup();
    const progress = new TalkProgress("em-lt");
    const player = new TalkPlayer({ progress, output, load: async () => chapter(), clock: {
      now: () => 0, setTimeout: () => () => {},
    } });
    disposables.push(() => player.dispose());
    player.changeMode(mode);
    player.setRate(mode === "helper" ? "lt" : "en", rate);
    await player.select(selection);
    player.play();
    await settle();
    for (const [index, start] of starts[mode].entries()) {
      if (index) player.seekSentence(`line-${index + 1}`);
      await settle();
      const media = parts.at(-1)!;
      expect(media).toMatchObject({ currentTime: start, playbackRate: mediaRate, preservesPitch: true, muted: false });
      expect(media.src).toContain(`/${mode}.mp3`);
      media.at(start + 0.34);
      expect(player.getSnapshot()).toMatchObject({
        position: start + 0.34, cue: { sentenceId: `line-${index + 1}`, text: `Speech ${index + 1}` },
      });
      expect(player.getSnapshot().cue?.words).toBeUndefined();
    }
  });

  it("switches during both measured silent boundaries and restores the landing leg rate on a precise seek", async () => {
    vi.useFakeTimers();
    const { output, parts, request } = setup();
    const item = chapter();
    await output.start(request(item));
    const media = parts[0];
    media.at(2.69);
    expect(media.playbackRate).toBe(mixed.lt);
    media.currentTime = 2.71;
    vi.advanceTimersByTime(12);
    expect(media.playbackRate).toBe(mixed.en);
    media.at(6.73);
    expect(media.playbackRate).toBe(mixed.lt);
    await output.start(request(item, "paired", 10.24));
    expect(parts[1]).toMatchObject({ currentTime: 10.24, playbackRate: mixed.en });
    output.setRates({ lt: 2, en: 1 });
    expect(parts[1]).toMatchObject({ currentTime: 10.24, playbackRate: 1 });
  });

  it("stays on the continuous master with uniform rates even without switch measurements", async () => {
    const { output, parts, request } = setup();
    await output.start(request(chapter(undefined, false), "paired", 10.21, { lt: 1, en: 1 }));
    expect(parts).toHaveLength(1);
    expect(parts[0].src).toContain("/paired.mp3");
    expect(parts[0].currentTime).toBe(10.21);
  });

  it("reapplies a precise seek when metadata arrives after play was requested", async () => {
    const { output, parts, initialPlay, request } = setup();
    let finish!: () => void;
    initialPlay.push(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = output.start(request(chapter(), "target", 6.34));
    const media = parts[0];
    media.currentTime = 0;
    media.readyState = 1;
    media.dispatchEvent(new Event("loadedmetadata"));
    expect(media.currentTime).toBe(6.34);
    expect(media.playbackRate).toBe(mixed.en);
    finish();
    await pending;
    expect(output.position()).toBe(6.34);
  });

  it("opens exact mono fragments and precues the next leg silently, reporting on the paired clock", async () => {
    const { output, parts, request } = setup();
    const options = request(chapter(undefined, false), "paired", 7.25);
    await output.start(options);
    const [helper, target] = parts;
    expect(helper.src).toContain("/helper.mp3?t=sample#t=3.750000,6.000000");
    expect(target.src).toContain("/target.mp3?t=sample#t=3.050000,5.550000");
    expect(target.muted).toBe(true);
    expect(target.play).not.toHaveBeenCalled();
    expect(helper.playbackRate).toBe(mixed.lt);
    helper.at(4);
    expect(output.position()).toBe(7.5);
    helper.at(6);
    await settle();
    expect(helper).toMatchObject({ paused: true, muted: true, src: "" });
    expect(target).toMatchObject({ paused: false, muted: false, playbackRate: mixed.en });
    target.at(3.3);
    expect(output.position()).toBeCloseTo(10.25);
    expect(options.onEnded).not.toHaveBeenCalled();
  });

  it("changes to a correctly positioned mono leg after a late background timer, without changing the paired rate in speech", async () => {
    vi.useFakeTimers();
    const { output, parts, request } = setup();
    await output.start(request(chapter()));
    parts[0].currentTime = 3.4;
    vi.advanceTimersByTime(1800);
    await settle();
    expect(parts[0]).toMatchObject({ paused: true, playbackRate: mixed.lt });
    expect(parts[1].currentTime).toBeCloseTo(0.4);
    expect(parts[1].playbackRate).toBe(mixed.en);
    expect(parts[1].src).toContain("/target.mp3");
    expect(output.position()).toBeCloseTo(3.4);
  });

  it("ends the last mono excerpt once and discards later events from it", async () => {
    const { output, parts, request } = setup();
    const options = request(chapter(undefined, false), "paired", 18.1);
    await output.start(options);
    expect(parts).toHaveLength(1);
    parts[0].at(8.6);
    parts[0].end();
    expect(options.onEnded).toHaveBeenCalledTimes(1);
    expect(output.position()).toBeNull();
    expect(parts[0]).toMatchObject({ paused: true, muted: true, src: "" });
  });

  it("handles a native end that arrives before the play promise settles", async () => {
    const { output, parts, initialPlay, request } = setup();
    let finish!: () => void;
    initialPlay.push(() => new Promise<void>((resolve) => { finish = resolve; }));
    const options = request(chapter(), "target", 8.59);
    const pending = output.start(options);
    parts[0].end();
    finish();
    await pending;
    expect(options.onEnded).toHaveBeenCalledTimes(1);
    expect(output.position()).toBeNull();
  });

  it("stops a mixed-rate fallback if its matching mono track is missing", async () => {
    const { output, parts, request } = setup();
    const item = chapter(undefined, false);
    delete item.tracks.helper;
    await expect(output.start(request(item))).rejects.toMatchObject({ kind: "unavailable" });
    expect(parts).toHaveLength(0);
  });

  it("rereads the token on a media 401 and only probes one byte on the same address", async () => {
    const { output, parts, request, fetcher, initialPlay } = setup();
    let token = "expired";
    let canceled = false;
    initialPlay.push(() => new Promise(() => {}));
    fetcher.mockImplementationOnce(async () => {
      token = "renewed";
      return new Response(new ReadableStream({ cancel: () => { canceled = true; } }), { status: 401 });
    });
    const pending = output.start(request(chapter(() => token), "target", 6.34));
    parts[0].error = { code: 4 };
    parts[0].dispatchEvent(new Event("error"));
    await pending;
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("https://audio.test/target.mp3?t=expired", expect.objectContaining({
      headers: { Range: "bytes=0-0" }, redirect: "error", referrerPolicy: "no-referrer",
    }));
    expect(canceled).toBe(true);
    expect(parts[0]).toMatchObject({ muted: true, src: "" });
    expect(parts[1]).toMatchObject({ src: "https://audio.test/target.mp3?t=renewed", currentTime: 6.34 });
  });

  it("aborts an in-flight status check on hold and ignores its late 401", async () => {
    const { output, parts, request, fetcher, initialPlay } = setup();
    let finish!: (response: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    initialPlay.push(async () => { throw new DOMException("load failed", "NotSupportedError"); });
    const options = request(chapter());
    const pending = output.start(options);
    await settle();
    options.controller.abort();
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    finish(new Response(null, { status: 401 }));
    await pending;
    expect(parts).toHaveLength(1);
    expect(output.position()).toBeNull();
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("mutes the current and precued sources on capture and rejects their late events", async () => {
    const { output, parts } = setup();
    const player = new TalkPlayer({ progress: new TalkProgress("em-lt"), output,
      load: async () => chapter(undefined, false), clock: { now: () => 0, setTimeout: () => () => {} } });
    disposables.push(() => player.dispose());
    player.setRate("lt", 1.5);
    await player.select(selection, true);
    await settle();
    expect(parts).toHaveLength(2);
    parts[0].at(1.2);
    player.hold("microphone");
    for (const media of parts) {
      expect(media).toMatchObject({ paused: true, muted: true, src: "" });
      media.end();
      media.dispatchEvent(new Event("loadedmetadata"));
    }
    expect(player.getSnapshot()).toMatchObject({ position: 1.2, held: true, status: "held" });
    expect(parts[1].play).not.toHaveBeenCalled();
  });

  it("discards late metadata, play and ended after two quick mode changes and a station change", async () => {
    const { output, parts, initialPlay } = setup();
    const finish: Array<() => void> = [];
    initialPlay.push(...[0, 1].map(() => () => new Promise<void>((resolve) => { finish.push(resolve); })));
    const player = new TalkPlayer({ progress: new TalkProgress("em-lt"), output, load: async () => chapter(),
      clock: { now: () => 0, setTimeout: () => () => {} } });
    disposables.push(() => player.dispose());
    await player.select(selection, true);
    player.changeMode("helper");
    player.changeMode("target");
    for (const part of parts.slice(0, 2)) {
      part.dispatchEvent(new Event("loadedmetadata"));
      part.end();
    }
    finish.forEach((resolve) => resolve());
    await settle();
    expect(player.getSnapshot()).toMatchObject({ status: "playing", prefs: { mode: "target" }, cue: { language: "en" } });
    expect(parts.slice(0, 2).every((part) => part.muted && part.src === "")).toBe(true);
    player.clear();
    parts[2].end();
    expect(player.getSnapshot()).toMatchObject({ status: "idle", selection: null });
  });

  it("rejects mismatched metadata while preserving the loaded cue", async () => {
    const { output, parts, initialPlay, fetcher } = setup();
    initialPlay.push(() => new Promise(() => {}));
    const item = chapter();
    item.tracks.paired!.duration = 25;
    const player = new TalkPlayer({ progress: new TalkProgress("em-lt"), output, load: async () => item,
      clock: { now: () => 0, setTimeout: () => () => {} } });
    disposables.push(() => player.dispose());
    await player.select(selection, true);
    parts[0].dispatchEvent(new Event("loadedmetadata"));
    await settle();
    expect(player.getSnapshot()).toMatchObject({ status: "error", error: "invalid", cue: { text: "Speech 1" } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports autoplay refusal as paused and allows one Play gesture to start normally", async () => {
    const { output, parts, initialPlay, fetcher } = setup();
    initialPlay.push(async () => { throw new DOMException("gesture needed", "NotAllowedError"); });
    const player = new TalkPlayer({ progress: new TalkProgress("em-lt"), output, load: async () => chapter(),
      clock: { now: () => 0, setTimeout: () => () => {} } });
    disposables.push(() => player.dispose());
    await player.select(selection, true);
    await settle();
    expect(player.getSnapshot()).toMatchObject({ status: "paused", error: "blocked", playIntent: false });
    player.play();
    await settle();
    expect(player.getSnapshot().status).toBe("playing");
    expect(parts[1].play).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("selects book buffers on the existing iPad branch without constructing media elements", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 5 });
    const audio = vi.fn();
    vi.stubGlobal("Audio", audio);
    expect(createBookOutput()).toBeInstanceOf(BookBufferOutput);
    expect(audio).not.toHaveBeenCalled();
  });

  it("allows only dev or review builds to force buffer output on desktop", () => {
    vi.stubGlobal("location", { search: "?bookOutput=buffer" });
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_BOOK_REVIEW", "0");
    try {
      expect(createBookOutput(false)).toBeInstanceOf(BookOutput);
      vi.stubEnv("VITE_BOOK_REVIEW", "1");
      expect(createBookOutput(false)).toBeInstanceOf(BookBufferOutput);
    } finally { vi.unstubAllEnvs(); }
  });
});

describe("book clocks", () => {
  it("assembles the EM English clock with sample-rounded take lengths and exactly 13,200 samples of silence", () => {
    const paired = chapter().tracks.paired!;
    const targets = paired.cues.filter((cue) => cue.language === "en");
    targets[0].end = 5.43457;
    const english = englishBookCues(targets);
    expect(english[0].end * 24_000).toBe(Math.round(2.43457 * 24_000));
    expect((english[1].start - english[0].end) * 24_000).toBeCloseTo(13_200);
    expect(english.map((cue) => cue.sentenceId)).toEqual(targets.map((cue) => cue.sentenceId));
  });

  it("rejects stale and unsafe rate measurements", () => {
    const { cues, rateSwitches } = chapter().tracks.paired!;
    const data = { version: 1, audio_sha256: "abc", sw: rateSwitches!.map((row) => row.from),
      speech: cues.map(({ start, end }) => [start, end]) };
    expect(bookRateSwitches(cues, data, "abc")).toEqual(expect.arrayContaining([expect.objectContaining({ from: 2.7 })]));
    expect(bookRateSwitches(cues, data, "stale")).toBeUndefined();
    data.sw[1] = 2.97;
    expect(bookRateSwitches(cues, data, "abc")).toBeUndefined();
  });
});
