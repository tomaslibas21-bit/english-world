import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioSystem } from "../src/game/audio";
import { audioKey } from "../src/audio-key";

let audio: AudioSystem | undefined;
const players: TestAudio[] = [],
  contexts: TestContext[] = [];
class TestAudio extends EventTarget {
  src = "";
  volume = 1;
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  duration = 0.4;
  muted = false;
  paused = true;
  ended = false;
  readyState = 4;
  error = null;
  onended: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onpause: (() => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  setAttribute = vi.fn();
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  constructor() {
    super();
    players.push(this);
  }
  finish() {
    this.ended = true;
    this.onended?.();
    this.dispatchEvent(new Event("ended"));
  }
}
const makeSource = () => ({
  buffer: null as AudioBuffer | null,
  playbackRate: { value: 1 },
  onended: null as (() => void) | null,
  start: vi.fn(),
  stop: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
});
const makeGain = () => ({
  gain: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
});
class TestContext extends EventTarget {
  static initialState = "running";
  static resumeWork: (() => Promise<void>) | undefined;
  state = TestContext.initialState;
  sampleRate = 44100;
  currentTime = 0;
  destination = {};
  sources: ReturnType<typeof makeSource>[] = [];
  gains: ReturnType<typeof makeGain>[] = [];
  resume = vi.fn(() => TestContext.resumeWork?.() ?? Promise.resolve());
  createBufferSource() {
    const source = makeSource();
    this.sources.push(source);
    return source;
  }
  createGain() {
    const gain = makeGain();
    this.gains.push(gain);
    return gain;
  }
  constructor() {
    super();
    contexts.push(this);
  }
}
const decoded = { duration: 0.4, sampleRate: 44100 } as AudioBuffer;
let decode: ReturnType<typeof vi.fn>;
let fetcher: ReturnType<typeof vi.fn>;
const tick = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  players.length = contexts.length = 0;
  TestContext.initialState = "running";
  TestContext.resumeWork = undefined;
  vi.stubGlobal("location", {
    search: "?audioDebug=1&t=PAGE_TOKEN_SECRET",
    href: "https://example.invalid/game/?audioDebug=1&t=PAGE_TOKEN_SECRET",
  });
  vi.stubGlobal("navigator", {
    onLine: true,
    userAgent: "device-test",
    audioSession: { type: "auto", state: "active" },
  });
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        token: "STORED_TOKEN_SECRET",
        exp: Date.now() / 1000 + 3600,
      }),
  });
  vi.stubGlobal("Audio", TestAudio);
  decode = vi.fn(async () => decoded);
  vi.stubGlobal("window", {
    AudioContext: TestContext,
    OfflineAudioContext: class {
      decodeAudioData = decode;
    },
  });
  fetcher = vi.fn(
    async () =>
      new Response(new Blob(["same-recording-bytes"], { type: "audio/mpeg" }), {
        headers: { "content-type": "audio/mpeg" },
      }),
  );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  audio?.stop();
  audio?.stopDiagnostic();
  audio = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function sample() {
  const { AudioSystem } = await import("../src/game/audio");
  audio = new AudioSystem();
  audio.ready = true;
  const key = audioKey("voice", 1, "Hello there");
  audio.manifest[key] = 0.4;
  const normal = audio.play("voice", 1, "Hello there");
  await tick();
  players[0].finish();
  expect(await normal).toBe(true);
  await audio.prepareDiagnosticComparison();
  expect(audio.getDiagnosticState().status).toBe("ready");
  return { audio, key };
}

describe("opt-in local audio evidence", () => {
  it("does no logging, capture, decoding or live context work without the exact flag", async () => {
    vi.stubGlobal("location", { search: "?audioDebug=0" });
    const diagnostics = await import("../src/convo/audioDiagnostics");
    const { AudioSystem } = await import("../src/game/audio");
    audio = new AudioSystem();
    diagnostics.audioDiagnostic("diagnostic.quiet", { volume: 0.9 });
    diagnostics.createRecognitionDiagnostics().event("start");
    diagnostics.pauseAudioDiagnostics(true);
    await audio.prepareDiagnosticComparison();
    expect(audio.playDiagnostic("buffer")).toBe(false);
    expect(diagnostics.audioDiagnosticsPaused()).toBe(false);
    expect(diagnostics.audioDiagnosticsReport().events).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(players).toHaveLength(0);
    expect(contexts).toHaveLength(0);
  });

  it("bounds the report and excludes speech, signed URLs, arbitrary strings and tokens", async () => {
    const d = await import("../src/convo/audioDiagnostics");
    d.audioDiagnostic("recognition.result", {
      resultIndex: 2,
      resultSlots: 3,
      transcript: "PRIVATE_SPEECH",
      source: "https://private.invalid/?t=SECRET",
      type: "https://private.invalid/?t=SECRET",
      error: "Error with SECRET",
    });
    expect(d.audioDiagnosticsReport().events[0].detail).toEqual({
      resultIndex: 2,
      resultSlots: 3,
    });
    for (let i = 0; i < 450; i++)
      d.audioDiagnostic("comparison.stage", { stage: "after-mic" });
    const report = d.audioDiagnosticsReport();
    expect(report.totalEvents).toBe(451);
    expect(report.events).toHaveLength(400);
    expect(report.events[0].sequence).toBe(52);
    expect(JSON.stringify(report)).not.toMatch(
      /SECRET|PRIVATE_SPEECH|https:|data:|blob:/,
    );
  });

  it("distinguishes watchdog release, service end and a later capture-end event", async () => {
    const d = await import("../src/convo/audioDiagnostics");
    const { captureAudio, microphoneHandoffState } =
      await import("../src/convo/audioFocus");
    const trace = d.createRecognitionDiagnostics(),
      lease = captureAudio(trace.id);
    trace.event("audiostart");
    lease.stopping();
    await vi.advanceTimersByTimeAsync(1200);
    expect(microphoneHandoffState()).toEqual({ captures: 0, unconfirmed: 1 });
    expect(
      d
        .audioDiagnosticsReport()
        .events.some(
          (e) =>
            e.event === "capture.release" &&
            e.detail.reason === "timeout-unknown",
        ),
    ).toBe(true);
    expect(
      d
        .audioDiagnosticsReport()
        .events.some((e) => e.event === "recognition.end"),
    ).toBe(false);
    trace.event("end");
    lease.ended();
    trace.event("audioend");
    const events = d.audioDiagnosticsReport().events;
    expect(
      events.findIndex((e) => e.event === "recognition.audioend"),
    ).toBeGreaterThan(events.findIndex((e) => e.event === "recognition.end"));
    expect(microphoneHandoffState()).toEqual({ captures: 0, unconfirmed: 0 });
  });

  it("keeps an abort exception unknown until the existing watchdog, without inventing an end", async () => {
    const d = await import("../src/convo/audioDiagnostics");
    const { captureAudio, microphoneHandoffState } =
      await import("../src/convo/audioFocus");
    const lease = captureAudio(7);
    lease.stopping();
    lease.failed(new DOMException("private details", "InvalidStateError"));
    expect(microphoneHandoffState().captures).toBe(1);
    await vi.advanceTimersByTimeAsync(1200);
    const report = d.audioDiagnosticsReport();
    expect(
      report.events.some(
        (e) =>
          e.event === "capture.release" &&
          e.detail.reason === "abort-error-unknown",
      ),
    ).toBe(true);
    expect(
      report.events.some((e) => e.event === "capture.recognition-end"),
    ).toBe(false);
    expect(JSON.stringify(report)).not.toContain("private details");
    lease.ended();
  });

  it("records optional audio-session setter failures instead of claiming they succeeded", async () => {
    const d = await import("../src/convo/audioDiagnostics");
    const { playbackRoute } = await import("../src/convo/audioFocus");
    vi.stubGlobal("navigator", {
      audioSession: {
        get type() {
          return "playback";
        },
        set type(_value) {
          throw new DOMException("secret", "NotSupportedError");
        },
      },
    });
    playbackRoute();
    expect(d.audioDiagnosticsReport().events.at(-1)).toMatchObject({
      event: "session.error",
      detail: { error: "NotSupportedError" },
    });
  });
});

describe("same-recording comparison ownership", () => {
  it("prepares offline, retains the same bytes and requested volume, and never completes a game turn", async () => {
    const { audio, key } = await sample();
    expect(contexts).toHaveLength(0); // offline decoding did not activate hardware output
    const selected = audio.getDiagnosticState();
    audio.volume = 0.3;
    expect(audio.playDiagnostic("html")).toBe(true);
    const source = players[0].src;
    expect(source).toMatch(/^data:audio\/mpeg;base64,/);
    expect(players[0].volume).toBe(selected.volume);
    players[0].finish();
    expect(audio.getState()).toBe("idle");
    expect(audio.getDiagnosticState().status).toBe("ready");
    expect(audio.playDiagnostic("buffer")).toBe(true);
    expect(contexts[0].sources[0].buffer).toBe(decoded);
    expect(contexts[0].gains[0].gain.value).toBe(selected.volume);
    expect(contexts[0].sources[0].playbackRate.value).toBe(1);
    contexts[0].sources[0].onended?.();
    expect(audio.getState()).toBe("idle");
    expect(audio.getDiagnosticState().clipId).toBe(key);
    const { audioDiagnosticsReport } =
      await import("../src/convo/audioDiagnostics");
    const json = JSON.stringify(audioDiagnosticsReport());
    expect(json).not.toMatch(/TOKEN_SECRET|same-recording-bytes|data:|https:/);
  });

  it("cancels the previous output when switching A/B and keeps the comparison frozen across normal lines", async () => {
    const { audio, key } = await sample();
    audio.playDiagnostic("buffer");
    const buffer = contexts[0].sources[0];
    audio.playDiagnostic("html");
    expect(buffer.stop).toHaveBeenCalledOnce();
    expect(buffer.disconnect).toHaveBeenCalledOnce();
    const secondKey = audioKey("voice", 1, "Next line");
    audio.manifest[secondKey] = 0.4;
    const next = audio.play("voice", 1, "Next line");
    expect(audio.getDiagnosticState().status).toBe("ready");
    await tick();
    players[0].finish();
    expect(await next).toBe(true);
    expect(audio.getDiagnosticState().clipId).toBe(key);
    expect(audio.playDiagnostic("html")).toBe(true);
    expect(players).toHaveLength(1);
  });

  it("does not start a canceled Web Audio resume after closing or normal playback", async () => {
    const { audio } = await sample();
    let resume!: () => void;
    TestContext.initialState = "suspended";
    TestContext.resumeWork = () =>
      new Promise<void>((resolve) => {
        resume = resolve;
      });
    audio.playDiagnostic("buffer");
    expect(contexts[0].resume).toHaveBeenCalledOnce();
    audio.stopDiagnostic("close");
    resume();
    await tick();
    expect(contexts[0].sources[0].start).not.toHaveBeenCalled();
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
  });

  it("discards delayed preparation after normal audio takes ownership", async () => {
    const { audio } = await sample();
    let finishDecode!: (value: AudioBuffer) => void;
    decode.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDecode = resolve;
        }),
    );
    const preparing = audio.prepareDiagnosticComparison();
    await vi.waitFor(() => expect(finishDecode).toBeTypeOf("function"));
    const next = audio.play("voice", 1, "Hello there");
    await tick();
    finishDecode(decoded);
    await preparing;
    expect(audio.getDiagnosticState().status).toBe("empty");
    expect(audio.playDiagnostic("buffer")).toBe(false);
    players[0].finish();
    await next;
  });

  it("does not take output from a current game line or an active capture", async () => {
    const { audio } = await sample();
    const { captureAudio } = await import("../src/convo/audioFocus");
    const lease = captureAudio();
    expect(audio.playDiagnostic("html")).toBe(false);
    lease.ended();
    const normal = audio.play("voice", 1, "Hello there");
    await tick();
    expect(audio.playDiagnostic("buffer")).toBe(false);
    expect(contexts).toHaveLength(0);
    audio.stop();
    expect(await normal).toBe(false);
  });
});
