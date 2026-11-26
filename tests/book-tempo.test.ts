import { afterEach, describe, expect, it, vi } from "vitest";
import { captureAudio, watchMicrophone } from "../src/convo/audioFocus";
import { BookBufferOutput, bookBufferSpan } from "../src/radio/bookBufferOutput";
import { SpeechTempo, type SpeechWindow } from "../src/radio/speechTempo.worker";
import { TalkPlayer, type TalkClock, type TalkTrack } from "../src/radio/talkPlayer";
import { TalkProgress } from "../src/radio/talkProgress";
import { bookRequest, cbr, ContextDouble, decodeFrames, rangeFetcher, SAMPLE_RATE } from "./fixtures/book-audio";

function tone(seconds: number, voiced = false) {
  return Float32Array.from({ length: SAMPLE_RATE * seconds }, (_, i) => {
    const phase = i * 2 * Math.PI * 200 / SAMPLE_RATE;
    const base = Math.sin(phase);
    return voiced ? (0.72 * base + 0.18 * Math.sin(3 * phase) + 0.1 * Math.sin(5 * phase)) *
      (0.65 + 0.3 * Math.sin(2 * Math.PI * i * 3 / SAMPLE_RATE)) : base;
  });
}

function stretch(tempo: SpeechTempo, source: Float32Array<ArrayBuffer>, from: number, to: number, rate: number, join = false) {
  const guard = Math.round(0.035 * SAMPLE_RATE);
  const left = Math.max(0, from - guard);
  return tempo.stretch({ channels: [source.slice(left, to + guard)], sampleRate: SAMPLE_RATE, start: from - left,
    length: to - from, outputLength: Math.round(to / rate) - Math.round(from / rate), rate, join })[0];
}

function pitch(samples: Float32Array) {
  const guard = 0.08 * SAMPLE_RATE;
  let crossed = 0;
  for (let i = guard; i < samples.length - guard; i++) if (samples[i - 1] <= 0 && samples[i] > 0) crossed++;
  return crossed * SAMPLE_RATE / (samples.length - 2 * guard);
}

describe("speech tempo", () => {
  it("passes unity PCM through sample-exactly", () => {
    const input = tone(1, true);
    expect(stretch(new SpeechTempo(), input, 532, 17657, 1)).toEqual(input.slice(532, 17657));
  });

  it.each([0.75, 0.8 / 0.75, 1.25, 1.5, 1.75, 2])("keeps duration and pitch at %f×", (rate) => {
    for (const voiced of [false, true]) {
      const input = tone(1.8, voiced);
      const result = stretch(new SpeechTempo(), input, 0, input.length, rate);
      expect(result.length).toBe(Math.round(input.length / rate));
      expect(pitch(result)).toBeCloseTo(200, -1);
    }
  });

  it("carries a partial overlap across adjoining windows without a restart or extra samples", () => {
    const input = tone(2.7, true);
    const split = 30531;
    for (const rate of [0.75, 2]) {
      const tempo = new SpeechTempo();
      const a = stretch(tempo, input, 0, split, rate);
      const b = stretch(tempo, input, split, input.length, rate, true);
      expect(a.length + b.length).toBe(Math.round(input.length / rate));
      expect(Math.abs(a.at(-1)! - b[0])).toBeLessThan(0.1);
      expect(pitch(b)).toBeCloseTo(200, -1);
      expect(b[0]).not.toBe(input[split]); // The continued crossfade determines the seam sample.
      expect(Math.max(...b.subarray(0, 2400))).toBeGreaterThan(0.25);
    }
  });
});

function paired() {
  const request = bookRequest(12);
  const target = request.track;
  const helper: TalkTrack = { ...target, mode: "helper", cues: [{ ...target.cues[0], language: "lt", start: 1, end: 7 }] };
  const track: TalkTrack = {
    ...target, mode: "paired", cues: [
      { ...helper.cues[0], start: 0, end: 3 }, { ...target.cues[0], start: 3, end: 12 },
    ], rateSwitches: [{ from: 0, until: 0, language: "lt" }, { from: 2.752, until: 2.93, language: "en" }],
  };
  return { ...request, item: { ...request.item, tracks: { paired: track, target, helper } }, track,
    rates: { lt: 2, en: 0.75 } };
}

class WorkerDouble {
  private tempo = new SpeechTempo();
  onmessage?: (event: { data: Float32Array[] }) => void;
  terminate = vi.fn();
  constructor(private readonly jobs: SpeechWindow[], private readonly inspect = (_input: SpeechWindow) => {}) {}
  postMessage(input: SpeechWindow) {
    this.inspect(input);
    this.jobs.push({ ...input, channels: [] });
    queueMicrotask(() => this.onmessage?.({ data: this.tempo.stretch(input) }));
  }
  get worker() { return this as unknown as Worker; }
}

const dispose: Array<() => void> = [];
afterEach(() => { for (const stop of dispose.splice(0).reverse()) stop(); });

describe("book tempo and focus", () => {
  it("fits stereo decode, processing, playback and transfer buffers under 8 MiB at the slowest rate", async () => {
    const ctx = new ContextDouble();
    const frame = new Uint8Array(960);
    frame.set([0xff, 0xfb, 0xe4, 0]); // 320 kb/s, 48 kHz stereo, 1,152 samples.
    const data = new Uint8Array(500 * frame.length);
    for (let offset = 0; offset < data.length; offset += frame.length) data.set(frame, offset);
    let decoded = 0, packet = 0, peak = 0;
    const output = new BookBufferOutput(() => ctx.context, rangeFetcher(data), async (bytes, rate) => {
      const pcm = decodeFrames(bytes, rate);
      decoded = pcm.bytes;
      packet = Math.max(packet, bytes.byteLength);
      return pcm.buffer;
    }, () => new WorkerDouble([], ({ channels, outputLength }) => {
      // Include decoder PCM, the transferred input, the worker result, the game
      // buffer and a conservative extra Web Audio copy of the queued playback.
      const result = outputLength * channels.length * 4;
      peak = Math.max(peak, ctx.pcmBytes * 2 + decoded + channels.reduce((sum, ch) => sum + ch.byteLength, 0) + 3 * result);
    }).worker);
    dispose.push(() => output.stop());
    await output.start({ ...bookRequest(12, 3.5), rates: { en: 0.75 } });
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    expect(peak).toBeGreaterThan(4 * 1024 * 1024);
    expect(peak).toBeLessThan(8 * 1024 * 1024);
    expect(packet * 3).toBeLessThan(512 * 1024);
  });

  it("lands measured switches exactly and uses the matching mono cue when they are unavailable", () => {
    const request = paired();
    const switchAt = 2.752;
    expect(bookBufferSpan(request, 2, request.rates)).toMatchObject({ to: switchAt, rate: 2 });
    expect(bookBufferSpan(request, switchAt, request.rates)).toMatchObject({ from: switchAt, rate: 0.75 });
    const unsafe = { ...request, track: { ...request.track, rateSwitches: undefined } };
    expect(bookBufferSpan(unsafe, 1.5, unsafe.rates)).toMatchObject({ from: 4, to: 6.25, chapterTo: 2.625, rate: 2 });
    expect(bookBufferSpan(unsafe, 3, unsafe.rates)).toMatchObject({ from: 0, chapterFrom: 3, rate: 0.75 });
  });

  it("schedules both rates at unity, compensates source time and restarts rate edits at the audible place", async () => {
    const ctx = new ContextDouble();
    const jobs: SpeechWindow[] = [];
    const output = new BookBufferOutput(() => ctx.context, rangeFetcher(cbr(500)), async (bytes, rate) => decodeFrames(bytes, rate).buffer,
      () => new WorkerDouble(jobs).worker);
    dispose.push(() => output.stop());
    const request = paired();
    await output.start(request);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    const [first, lastHelper] = [...ctx.active];
    expect(first.buffer!.duration).toBe(2.25 / 2);
    ctx.advanceTo(lastHelper.startsAt + 0.1);
    expect(output.position()).toBeCloseTo(2.45, 5);
    await vi.waitFor(() => expect(jobs).toHaveLength(3));
    expect(jobs.map((job) => [job.rate, job.join])).toEqual([[2, false], [2, true], [0.75, false]]);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    const target = [...ctx.active][1];
    expect(target.startsAt).toBeCloseTo(lastHelper.startsAt + lastHelper.buffer!.duration, 8);
    ctx.advanceTo(target.startsAt + 0.4);
    expect(output.position()).toBeCloseTo(2.752 + 0.3, 4);
    const before = output.position();
    output.setRates({ lt: 2, en: 1.25 });
    expect(ctx.active.size).toBe(0);
    expect(output.position()).toBe(before);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    output.setVolume(0);
    expect([...ctx.gains][0].gain.value).toBe(0);
    expect(jobs.at(-1)?.rate).toBe(1.25);
  });

  it("silences capture during decode, waits for both holds and honors a manual pause during the delay", async () => {
    const ctx = new ContextDouble();
    let finishDecode!: () => void;
    let first = true;
    const output = new BookBufferOutput(() => ctx.context, rangeFetcher(cbr(500)), async (bytes, rate) => {
      if (first) { first = false; await new Promise<void>((resolve) => { finishDecode = resolve; }); }
      return decodeFrames(bytes, rate).buffer;
    });
    let now = 0;
    const callbacks = new Map<() => void, number>();
    const clock: TalkClock = { now: () => now, setTimeout: (cb, delay) => {
      callbacks.set(cb, now + delay);
      return () => { callbacks.delete(cb); };
    } };
    const step = (ms: number) => { now += ms; for (const [cb, deadline] of callbacks) if (deadline <= now) { callbacks.delete(cb); cb(); } };
    const request = bookRequest(12);
    const player = new TalkPlayer({ load: async () => request.item, clock, output, progress: new TalkProgress("em-lt") });
    const unwatch = watchMicrophone((listening) => listening ? player.hold("microphone") : player.release("microphone"));
    dispose.push(() => player.dispose(), unwatch);
    player.changeMode("target");
    await player.select(request.item.selection, true);
    await vi.waitFor(() => expect(finishDecode).toBeTypeOf("function"));
    const microphone = captureAudio();
    dispose.push(microphone.ended);
    player.hold("voice");
    finishDecode();
    expect(player.getSnapshot().status).toBe("held");
    expect(ctx.starts).toBe(0);
    player.release("voice");
    step(1500);
    expect(player.getSnapshot().status).toBe("held");
    microphone.ended();
    step(699);
    expect(player.getSnapshot().status).toBe("held");
    step(1);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    const secondCapture = captureAudio();
    dispose.push(secondCapture.ended);
    expect(ctx.active.size).toBe(0);
    expect(ctx.gains.size).toBe(0);
    secondCapture.ended();
    player.pause();
    step(700);
    expect(player.getSnapshot().status).toBe("paused");
    expect(ctx.starts).toBe(2);
  });
});
