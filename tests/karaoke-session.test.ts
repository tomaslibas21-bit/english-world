import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FADE_OUT_MS, Radio, RESUME_AFTER_MS, type RadioDeps } from "../src/radio/radio";
import { BufferOutput, HtmlOutput, NeedsTap, type RadioOutput } from "../src/radio/output";

const config = { index: "/songs/index.json", files: "/worker", recordings: null };
const ids = ["G01", "G02", "V01"];
const songs = ids.map((id) => ({ id, c: id[0], n: 1, t: id, tl: "", g: "", tp: "", d: 20, a: `/songs/audio/${id}.mp3` }));
const timing = { L: [{ s: 6.27, e: 9.15, src: "Every evening", u: [["Every evening", "Kiekvieną vakarą", 2]], w: [[6.27, 7], [7.1, 9.15]], wt: ["Every", "evening"] }] };

class Output implements RadioOutput {
  onEnded: (() => void) | null = null;
  onStopped: ((reason: "error" | "interrupted") => void) | null = null;
  at = 0;
  sounding = false;
  rate = 1;
  prepare = vi.fn();
  reject: (url: string) => Error | undefined = () => undefined;
  pending: Promise<boolean> | null = null;
  play = vi.fn(async (url: string, at: number, _exact?: boolean) => {
    this.at = at;
    if (this.pending) return this.pending;
    const error = this.reject(url);
    if (error) throw error;
    this.sounding = true;
    return true;
  });
  pause() { this.sounding = false; }
  position() { return this.at; }
  duration() { return 20; }
  playbackRate() { return this.rate; }
  setPlaybackRate(rate: number) { this.rate = rate; }
  setVolume = vi.fn();
  unlock = vi.fn();
}

let out: Output, token: string, saved: Record<string, string>;
function fixture(overrides: Partial<RadioDeps> = {}) {
  return new Radio({
    config, output: out, token: () => token, volume: () => 0.8, storageKey: "karaoke-test", random: () => 0.4,
    stations: [
      { id: "grammar", name: "Grammar", freq: 94, lt: "", has: (s) => s.c === "G" },
      { id: "vocab", name: "Vocab", freq: 100, lt: "", has: (s) => s.c === "V" },
    ],
    fetchJson: async (url) => url === config.index ? { songs } : timing,
    ...overrides,
  });
}

const settle = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  out = new Output();
  token = "old";
  saved = {};
  vi.stubGlobal("localStorage", { getItem: (key: string) => saved[key] ?? null, setItem: (key: string, value: string) => { saved[key] = value; } });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("a single booth take on the street output", () => {
  it("requires an available catalog before lending the output", async () => {
    const unavailable = fixture({ config: null });
    await unavailable.init();
    expect(unavailable.openKaraoke()).toBeNull();
    const radio = fixture();
    expect(radio.openKaraoke()).toBeNull();
    await radio.init();
    const booth = radio.openKaraoke()!;
    expect(radio.openKaraoke()).toBe(booth);
    await booth.start("missing");
    expect(out.play).not.toHaveBeenCalled();
    booth.close();
  });

  it("leaves an initially off radio off, ends once and never advances the street", async () => {
    const radio = fixture();
    await radio.init();
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    expect(booth.store.getState()).toMatchObject({ status: "playing", song: { id: "G02" } });
    const ended = out.onEnded!;
    ended();
    ended();
    expect(booth.store.getState().status).toBe("ended");
    expect(booth.position()).toBe(20);
    expect(out.sounding).toBe(false);
    expect(radio.store.getState()).toMatchObject({ karaoke: booth, on: false, playing: false, song: null });
    expect(out.prepare).not.toHaveBeenCalled();
    await booth.start("V01");
    booth.close();
    booth.close();
    expect(radio.store.getState()).toMatchObject({ karaoke: null, on: false, playing: false });
    expect(out.play).toHaveBeenCalledTimes(2);
    expect(JSON.parse(saved["karaoke-test"])).toMatchObject({ song: null, at: 0, on: false });
  });

  it("preserves a paused radio and its subsecond position until the street requests play", async () => {
    const radio = fixture();
    await radio.init();
    radio.setOn(true);
    await settle();
    out.at = 4.736;
    radio.setOn(false);
    await settle(FADE_OUT_MS);
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    booth.close();
    expect(radio.position()).toBe(4.736);
    expect(radio.store.getState().playing).toBe(false);
    expect(out.play).toHaveBeenCalledTimes(2);
    radio.setOn(true);
    await settle();
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G01.mp3?t=old", 4.736, true);
  });

  it("freezes the active program, walk strip, shuffle, queue and recording rate", async () => {
    const radio = fixture();
    await radio.init();
    radio.power();
    radio.setLyrics(true);
    radio.setShuffle(true);
    radio.suggest(["V01"]);
    await settle();
    out.at = 2.8;
    out.rate = 0.8;
    const before = radio.store.getState();
    const oldEnded = out.onEnded!;
    const prepare = out.prepare.mock.calls.length;
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    expect(out.rate).toBe(1);
    oldEnded();
    radio.power();
    radio.next();
    radio.setStation("vocab");
    radio.setShuffle(false);
    radio.setLyrics(false);
    radio.suggest(["G02"]);
    expect(radio.position()).toBe(2.8);
    expect(out.prepare).toHaveBeenCalledTimes(prepare);
    expect(radio.store.getState()).toMatchObject({ on: true, playing: false, station: before.station, song: before.song, upNext: before.upNext, shuffle: true, lyrics: true, open: true });
    booth.close();
    await settle();
    expect(out.rate).toBe(0.8);
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G01.mp3?t=old", 2.8, true);
    expect(radio.store.getState().playing).toBe(true);
    booth.pause();
    expect(out.sounding).toBe(true);
  });

  it("restores a spot at its exact offset and continues the queued street program afterward", async () => {
    const radio = fixture({ spotRecording: (spot) => ({ spot, url: `/spot/${spot.id}.mp3`, duration: 4 }) });
    radio.setOn(true);
    await settle();
    out.onEnded?.();
    await settle();
    out.onEnded?.();
    await settle();
    const spot = radio.store.getState().spot!;
    expect(spot).toBeTruthy();
    radio.suggest(["V01"]);
    out.at = 1.238;
    const booth = radio.openKaraoke()!;
    await booth.start("G01");
    expect(radio.spotPosition()).toBe(1.238);
    expect(radio.spotDuration()).toBe(4);
    booth.close();
    await settle();
    expect(out.play).toHaveBeenLastCalledWith(spot.url, 1.238, true);
    out.onEnded?.();
    await settle();
    expect(radio.store.getState()).toMatchObject({ spot: null, song: { id: "V01" }, upNext: null });
  });

  it("blocks start under overlapping holds, cuts synchronously and cancels a held resume on pause", async () => {
    const radio = fixture();
    await radio.init();
    radio.hold("bed");
    radio.hold("microphone", true);
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    radio.release("bed");
    await settle(RESUME_AFTER_MS);
    expect(out.play).not.toHaveBeenCalled();
    radio.release("microphone");
    await settle(RESUME_AFTER_MS);
    expect(out.sounding).toBe(true);
    out.at = 6.456;
    radio.hold("microphone", true);
    expect(out.sounding).toBe(false);
    expect(booth.position()).toBe(6.456);
    radio.hold("voice");
    radio.release("microphone");
    booth.pause();
    radio.release("voice");
    await settle(RESUME_AFTER_MS);
    expect(out.play).toHaveBeenCalledTimes(1);
    await booth.resume();
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G02.mp3?t=old", 6.456, true);
    booth.close();
  });

  it("restores street play intent only after the last hold releases", async () => {
    const radio = fixture();
    radio.setOn(true);
    await settle();
    out.at = 3.122;
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    radio.hold("voice");
    radio.hold("microphone", true);
    booth.close();
    radio.release("microphone");
    await settle(RESUME_AFTER_MS);
    expect(out.sounding).toBe(false);
    radio.release("voice");
    await settle(RESUME_AFTER_MS);
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G01.mp3?t=old", 3.122, true);
  });

  it("cancels a delayed resume when paused or hidden after the hold clears", async () => {
    const radio = fixture();
    await radio.init();
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    radio.hold("conversation");
    radio.release("conversation");
    booth.pause();
    await settle(RESUME_AFTER_MS);
    expect(out.play).toHaveBeenCalledTimes(1);
    await booth.resume();
    radio.hold("microphone", true);
    radio.release("microphone");
    booth.interrupt();
    await settle(RESUME_AFTER_MS);
    expect(out.play).toHaveBeenCalledTimes(2);
    expect(booth.store.getState().status).toBe("paused");
    booth.close();
  });

  it("seeks exactly while playing and while paused, and needs explicit resume after interruption", async () => {
    const radio = fixture();
    await radio.init();
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    out.at = 6.2;
    await booth.seek(6.27);
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G02.mp3?t=old", 6.27, true);
    out.onStopped?.("interrupted");
    await booth.seek(6.4);
    radio.gesture();
    await settle(3000);
    expect(booth.position()).toBe(6.4);
    expect(booth.store.getState().status).toBe("paused");
    expect(out.play).toHaveBeenCalledTimes(2);
    await booth.resume();
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G02.mp3?t=old", 6.4, true);
    await booth.seek(20);
    expect(booth.store.getState().status).toBe("paused");
    expect(out.sounding).toBe(false);
    await booth.seek(19.98);
    await booth.resume();
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G02.mp3?t=old", 19.98, true);
    booth.close();
  });

  it("aborts pending data and ignores late media load, stopped and ended callbacks after exit", async () => {
    let deliver!: (data: unknown) => void;
    let signal: AbortSignal | undefined;
    const radio = fixture({ fetchJson: async (url, abort) => {
      if (url === config.index) return { songs };
      if (!abort) return timing;
      signal = abort;
      return new Promise((resolve) => { deliver = resolve; });
    } });
    radio.setOn(true);
    await settle();
    const first = radio.openKaraoke()!;
    const loading = first.start("G02");
    first.close();
    expect(signal?.aborted).toBe(true);
    deliver(timing);
    await loading;
    await settle();
    expect(out.play.mock.calls.map(([url]) => url)).toEqual(Array(2).fill("/worker/songs/audio/G01.mp3?t=old"));

    const second = radio.openKaraoke()!;
    let finish!: (playing: boolean) => void;
    out.pending = new Promise((resolve) => { finish = resolve; });
    const starting = second.start("G02");
    deliver(timing);
    await settle();
    const ended = out.onEnded!;
    const stopped = out.onStopped!;
    out.pending = null;
    second.close();
    await settle();
    ended();
    stopped("error");
    finish(true);
    await starting;
    expect(second.store.getState()).toMatchObject({ status: "closed", song: null });
    expect(radio.store.getState()).toMatchObject({ song: { id: "G01" }, playing: true });
    expect(out.sounding).toBe(true);
  });

  it("asks for a new gesture on rejected play and retries a failed recording with the current token", async () => {
    const radio = fixture();
    await radio.init();
    const booth = radio.openKaraoke()!;
    out.reject = () => new NeedsTap();
    await booth.start("G02");
    expect(booth.store.getState().status).toBe("blocked");
    expect(out.play).toHaveBeenCalledTimes(1);
    radio.gesture();
    expect(out.play).toHaveBeenCalledTimes(1);
    out.reject = (url) => url.endsWith("t=fresh%2B%26") ? undefined : new Error("403");
    await booth.resume();
    expect(out.play).toHaveBeenLastCalledWith("/songs/audio/G02.mp3", 0, true);
    expect(booth.store.getState()).toMatchObject({ status: "error", issue: "audio" });
    token = "fresh+&";
    await booth.retry();
    expect(booth.store.getState().status).toBe("playing");
    expect(out.play).toHaveBeenLastCalledWith("/worker/songs/audio/G02.mp3?t=fresh%2B%26", 0, true);
    booth.close();
  });

  it("uses unsigned data and audio fallbacks for free examples and reports missing timings separately", async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url === config.index) return { songs };
      if (url.startsWith(config.files)) throw new Error("404");
      return url.includes("G01") ? { L: [{ s: 6.27, e: 9.15, src: "Every evening" }] } : { L: [] };
    });
    const radio = fixture({ fetchJson });
    await radio.init();
    const booth = radio.openKaraoke()!;
    out.reject = (url) => url.startsWith(config.files) ? new Error("404") : undefined;
    await booth.start("G01");
    expect(fetchJson.mock.calls.map(([url]) => url)).toEqual([config.index, "/worker/songs/data/G01.json?t=old", "/songs/data/G01.json"]);
    expect(out.play).toHaveBeenLastCalledWith("/songs/audio/G01.mp3", 0, true);
    expect(booth.store.getState().timeline?.lines[0]).toMatchObject({ src: "Every evening", s: 6.27, e: 9.15, w: [] });
    await booth.start("G02");
    expect(booth.store.getState()).toMatchObject({ status: "error", issue: "timing" });
    expect(out.play).toHaveBeenCalledTimes(2);
    booth.close();
    expect(radio.store.getState().karaoke).toBeNull();
  });

  it("retries failed lyrics with a fresh token and can exit the access error", async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url === config.index) return { songs };
      if (!url.endsWith("t=fresh")) throw new Error("403");
      return timing;
    });
    const radio = fixture({ fetchJson });
    await radio.init();
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    expect(booth.store.getState()).toMatchObject({ status: "error", issue: "audio" });
    expect(out.play).not.toHaveBeenCalled();
    token = "fresh";
    await booth.retry();
    expect(fetchJson).toHaveBeenLastCalledWith("/worker/songs/data/G02.json?t=fresh", expect.any(AbortSignal));
    expect(booth.store.getState().status).toBe("playing");
    out.onStopped?.("error");
    expect(booth.store.getState().status).toBe("error");
    booth.close();
    expect(radio.store.getState().karaoke).toBeNull();
  });

  it("shuts down without restarting the street or saving booth progress", async () => {
    const radio = fixture();
    radio.setOn(true);
    await settle();
    out.at = 3.75;
    const booth = radio.openKaraoke()!;
    await booth.start("G02");
    await booth.seek(8.4);
    radio.shutdown();
    expect(out.sounding).toBe(false);
    expect(out.play).toHaveBeenCalledTimes(3);
    expect(JSON.parse(saved["karaoke-test"])).toMatchObject({ song: "G01", at: 3, on: true });
  });
});

describe("the shared audio outputs", () => {
  it("settles an exact HTML seek before an immediate booth pause, and cancels a pending seek quietly", async () => {
    const listeners = new Map<string, Set<() => void>>();
    let at = 0, target = 0;
    const emit = (name: string) => { for (const listener of [...listeners.get(name) ?? []]) listener(); };
    const element = {
      src: "", duration: 252.8, paused: true, ended: false, readyState: 4, seeking: false, error: null,
      get currentTime() { return at; },
      set currentTime(seconds: number) { target = seconds; element.seeking = true; },
      addEventListener(name: string, callback: () => void) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(callback);
      },
      removeEventListener(name: string, callback: () => void) { listeners.get(name)?.delete(callback); },
      play: async () => { element.paused = false; },
      pause: () => { element.paused = true; },
      removeAttribute: () => { element.src = ""; }, load() {},
    };
    vi.stubGlobal("Audio", class { constructor() { return element; } });
    const output = new HtmlOutput();
    const radio = fixture({ output });
    await radio.init();
    const booth = radio.openKaraoke()!;
    const starting = booth.start("G01");
    await settle();
    at = target; element.seeking = false; emit("seeked");
    await starting;
    const sought = booth.seek(7.1);
    await settle();
    expect(booth.store.getState().status).toBe("loading");
    expect(output.position()).toBe(0);
    at = target; element.seeking = false; emit("seeked");
    await sought;
    booth.pause();
    expect(booth.position()).toBe(7.1);
    expect(booth.store.getState()).toMatchObject({ status: "paused", timeline: { lines: [{ i: 0 }] } });
    const resumed = booth.resume();
    await settle();
    at = target; element.seeking = false; emit("seeked");
    await resumed;
    const pending = booth.seek(8);
    await settle();
    booth.pause();
    await pending;
    expect(booth.position()).toBe(8);
    expect(booth.store.getState().status).toBe("paused");
    expect(listeners.get("seeked")?.size).toBe(0);
    booth.close();
  });

  it("ignores an older HTML play rejection when the same source is resumed", async () => {
    let rejectFirst!: (error: Error) => void;
    const first = new Promise<void>((_, reject) => { rejectFirst = reject; });
    const element = {
      src: "", currentTime: 0, duration: 20, paused: true, ended: false, readyState: 4,
      addEventListener() {},
      play: vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined),
      pause() {},
    };
    vi.stubGlobal("Audio", class { constructor() { return element; } });
    const output = new HtmlOutput();
    const pending = output.play("/a.mp3", 0, true);
    output.pause();
    expect(await output.play("/a.mp3", 0.25, true)).toBe(true);
    rejectFirst(new DOMException("old request", "NotAllowedError"));
    expect(await pending).toBe(false);
    expect(output.position()).toBe(0.25);
    output.pause();
  });

  it("seeks HTML on the same source even for offsets below one second", async () => {
    const listeners = new Map<string, () => void>();
    const element = {
      src: "", currentTime: 0, duration: 20, paused: true, ended: false, readyState: 4,
      addEventListener: (name: string, callback: () => void) => { listeners.set(name, callback); },
      play: async () => { element.paused = false; },
      pause: () => { element.paused = true; },
    };
    vi.stubGlobal("Audio", class { constructor() { return element; } });
    const output = new HtmlOutput();
    await output.play("/a.mp3", 6.27, true);
    expect(output.position()).toBe(6.27);
    await output.play("/a.mp3", 6.4, true);
    expect(output.position()).toBe(6.4);
    await output.play("/a.mp3", 6.5);
    expect(output.position()).toBe(6.4);
    output.pause();
    const ended = output.onEnded = vi.fn();
    listeners.get("ended")?.();
    expect(ended).not.toHaveBeenCalled();
  });

  it("seeks Web Audio inside the last 50 ms and ignores the previous source's late end", async () => {
    const source = () => ({ buffer: null, onended: null as (() => void) | null, start: vi.fn(), stop: vi.fn(), connect() {}, disconnect() {} });
    const old = source(), current = source();
    const context = {
      currentTime: 5, state: "running", addEventListener() {},
      createBufferSource: vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(current),
      createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    };
    vi.stubGlobal("OfflineAudioContext", class { async decodeAudioData() { return { duration: 20 }; } });
    const output = new BufferOutput(() => context as unknown as AudioContext, async () => new ArrayBuffer(8));
    await output.play("/a.mp3", 5, true);
    const oldEnded = old.onended!;
    const ended = output.onEnded = vi.fn();
    await output.play("/a.mp3", 19.98, true);
    expect(current.start).toHaveBeenCalledWith(0, 19.98);
    context.currentTime = 5.02;
    oldEnded();
    expect(ended).not.toHaveBeenCalled();
    current.onended!();
    expect(ended).toHaveBeenCalledOnce();
  });
});
