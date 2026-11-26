import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookBufferOutput, bookBufferSpan } from "../src/radio/bookBufferOutput";
import { MP3_RANGE_BYTES, MP3_WINDOW_SECONDS, Mp3Recording, mp3Frame, mp3Id3End, mp3SeekTag, readMp3Range } from "../src/radio/mp3Windows";
import { bookRequest, cbr, ContextDouble, decodeFrames, fixtureFrame, FRAME_BYTES, FRAME_SAMPLES, rangeFetcher,
  SAMPLE_RATE, samplesToSeconds } from "./fixtures/book-audio";

const signal = () => new AbortController().signal;
const file = "/test.mp3";

describe("bounded chapter bytes", () => {
  it("validates the MPEG and ID3 headers, including synchsafe size and footer", () => {
    expect(mp3Frame(fixtureFrame())).toMatchObject({ sampleRate: SAMPLE_RATE, channels: 1, length: FRAME_BYTES, samples: FRAME_SAMPLES });
    expect(mp3Frame(Uint8Array.of(0xff, 0xfb, 0x92, 0))).toMatchObject({ sampleRate: 44100, channels: 2, length: 418, samples: 1152 });
    expect(mp3Frame(Uint8Array.of(0xff, 0xff, 0xa4, 0xc0))).toBeNull();
    expect(mp3Frame(Uint8Array.of(0xff, 0xf3, 0x04, 0xc0))).toBeNull();
    expect(mp3Id3End(Uint8Array.of(73, 68, 51, 4, 0, 16, 0, 0, 1, 6))).toBe(154);
    expect(() => mp3Id3End(Uint8Array.of(73, 68, 51, 4, 0, 0, 0, 0, 128, 1))).toThrow("Malformed ID3");
  });

  it("checks 206 including suffix and truncation at EOF, cancels 200 and rejects 416 or mismatched sizes", async () => {
    const data = Uint8Array.of(1, 2, 3, 4, 5);
    const get = rangeFetcher(data);
    expect((await readMp3Range(get, file, { suffix: 2 }, signal())).bytes).toEqual(data.slice(-2));
    expect((await readMp3Range(get, file, { start: 2, end: 10 }, signal())).bytes).toEqual(data.slice(2));
    await expect(readMp3Range(get, file, { start: 5, end: 9 }, signal())).rejects.toMatchObject({ status: 416 });
    await expect(readMp3Range(get, file, { suffix: 2 }, signal(), 10)).rejects.toMatchObject({ status: 206 });
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }));
    await expect(readMp3Range(async () => response, file, { suffix: 2 }, signal())).rejects.toMatchObject({ status: 200 });
    expect(cancel).toHaveBeenCalledTimes(1);
    const oversize = new Response(data, { status: 206, headers: { "Content-Range": "bytes 0-1/5" } });
    await expect(readMp3Range(async () => oversize, file, { start: 0, end: 1 }, signal())).rejects.toThrow("Oversized");
    const short = new Response(data.slice(0, 1), { status: 206, headers: { "Content-Range": "bytes 0-1/5" } });
    await expect(readMp3Range(async () => short, file, { start: 0, end: 1 }, signal())).rejects.toThrow("Truncated");
  });

  it("skips an ID3 tag larger than the probe, lands on exact preroll frames and trims the last partial window", async () => {
    const id3 = 9_300;
    const calls: string[] = [];
    const data = cbr(1000, id3);
    const mp3 = await Mp3Recording.open(rangeFetcher(data, calls), file, signal());
    const from = mp3.samples - 17_013;
    const window = await mp3.window(from, mp3.samples, signal());
    const preroll = Math.floor((from + 529) / FRAME_SAMPLES) - 8;
    expect(calls).toEqual(["bytes=0-8191", `bytes=${id3}-${id3 + 8191}`, `bytes=${data.length - 128}-${data.length - 1}`,
      `bytes=${id3 + preroll * FRAME_BYTES}-${data.length - 1}`]);
    const pcm = decodeFrames(window.bytes, SAMPLE_RATE);
    expect(window.length).toBe(17_013);
    expect(mp3.trim(window, pcm)).toBe(window.trim);
    expect((window.trim + window.length) / SAMPLE_RATE).toBeLessThan(1);
    const trimmed = await Mp3Recording.open(rangeFetcher(data), file, signal());
    expect(trimmed.trim(window, { ...pcm, length: pcm.length - 529 })).toBe(window.trim - 529);
    expect(() => trimmed.trim(window, pcm)).toThrow("align");
    await expect(mp3.window(0, 8 * SAMPLE_RATE, signal())).rejects.toThrow("Invalid PCM window");
  });

  it("counts variable frames from Xing checkpoints and validates local frame alignment", async () => {
    const tag = fixtureFrame();
    const xing = mp3Frame(tag)!.xing;
    const frames = Array.from({ length: 1400 }, (_, i) => fixtureFrame(i % 2 ? 9 : 11));
    const offsets = [tag.length];
    for (const frame of frames) offsets.push(offsets.at(-1)! + frame.length);
    const data = new Uint8Array(offsets.at(-1)!);
    const view = new DataView(tag.buffer);
    tag.set([88, 105, 110, 103], xing);
    view.setUint32(xing + 4, 7);
    view.setUint32(xing + 8, frames.length);
    view.setUint32(xing + 12, data.length);
    for (let i = 0; i < 100; i++) tag[xing + 16 + i] = Math.floor(i * 2.56);
    data.set(tag);
    frames.forEach((frame, i) => data.set(frame, offsets[i]));
    const calls: string[] = [];
    const mp3 = await Mp3Recording.open(rangeFetcher(data, calls), file, signal());
    const from = 1234 * FRAME_SAMPLES;
    const to = 1292 * FRAME_SAMPLES;
    const window = await mp3.window(from, to, signal());
    expect(calls.at(-1)).toBe(`bytes=${offsets[1226]}-${offsets[1301] - 1}`);
    expect(decodeFrames(window.bytes, SAMPLE_RATE).length).toBe(window.decodedSamples);
    data[offsets[1250]] = 0;
    await expect(mp3.window(from, to, signal())).rejects.toThrow("alignment");
  });

  it("reads VBRI byte distances into frame-aligned checkpoints", () => {
    const bytes = fixtureFrame();
    const view = new DataView(bytes.buffer);
    bytes.set([86, 66, 82, 73], 36);
    view.setUint16(40, 1);
    view.setUint32(46, 90_000);
    view.setUint32(50, 300);
    view.setUint16(54, 3);
    view.setUint16(56, 2);
    view.setUint16(58, 2);
    view.setUint16(60, 100);
    [15000, 15100, 14900].forEach((n, at) => view.setUint16(62 + 2 * at, n));
    expect(mp3SeekTag(bytes, mp3Frame(bytes)!)).toMatchObject({ type: "VBRI", frames: 299, size: 90000,
      anchors: [{ frame: 99, byte: 30000 }, { frame: 199, byte: 60200 }] });
  });
});

const reviewFixture = new URL("../.b8/review/derived/em-lt/english/BOOK-CANT-01.mp3", import.meta.url);
const ffmpeg = (data: Uint8Array) => spawnSync("ffmpeg", ["-v", "error", "-f", "mp3", "-i", "pipe:0", "-f", "f32le", "pipe:1"],
  { input: data, maxBuffer: 24 * 1024 * 1024 });
it.skipIf(!existsSync(reviewFixture) || spawnSync("ffmpeg", ["-version"]).status !== 0)(
  "matches continuous PCM at the first, adjoining middle and last windows of the local review recording", async () => {
    const data = readFileSync(reviewFixture);
    const recording = await Mp3Recording.open(rangeFetcher(data), file, signal());
    const decode = (bytes: Uint8Array) => {
      const result = ffmpeg(bytes);
      expect(result.stderr.toString()).toBe("");
      expect(result.status).toBe(0);
      return new Float32Array(Uint8Array.from(result.stdout).buffer);
    };
    const reference = decode(data);
    // A piped reference may miss the end padding, but its first sample is gapless.
    expect(reference.length).toBeGreaterThanOrEqual(recording.samples);
    const step = Math.round(SAMPLE_RATE * MP3_WINDOW_SECONDS);
    const middle = Math.floor(recording.samples / 2);
    for (const from of [0, middle, middle + step, recording.samples - 19123]) {
      const window = await recording.window(from, Math.min(recording.samples, from + step), signal());
      expect(window.bytes.byteLength).toBeLessThan(MP3_RANGE_BYTES);
      const decoded = decode(new Uint8Array(window.bytes));
      const offset = recording.trim(window, { sampleRate: SAMPLE_RATE, numberOfChannels: 1, length: decoded.length });
      let delta = 0;
      for (let i = 0; i < window.length; i++) delta = Math.max(delta, Math.abs(decoded[offset + i] - reference[from + i]));
      expect(delta).toBeLessThan(0.0001);
    }
  }, 15_000);

const dispose: Array<() => void> = [];
afterEach(() => { for (const stop of dispose.splice(0)) stop(); });

describe("window scheduling", () => {
  it("rereads an expired URL, plays the final partial window and signals natural end once", async () => {
    const ctx = new ContextDouble();
    const get = rangeFetcher(cbr(250));
    let url = "/stale.mp3";
    const output = new BookBufferOutput(() => ctx.context, async (resource, init) => {
      if (resource === "/stale.mp3") { url = file; return new Response(null, { status: 401 }); }
      return get(resource, init);
    }, async (bytes, rate) => decodeFrames(bytes, rate).buffer);
    dispose.push(() => output.stop());
    const request = bookRequest(6, 5.6);
    request.track.recording = () => url;
    const onEnded = vi.fn();
    await output.start({ ...request, onEnded });
    const only = [...ctx.active][0];
    expect(only.buffer!.duration).toBeCloseTo(0.4, 6);
    ctx.advanceTo(only.startsAt + 0.5);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(ctx.active.size).toBe(0);
  });

  it("splits one long cue, schedules exactly against the previous AudioContext span and disposes", async () => {
    const ctx = new ContextDouble();
    const request = bookRequest(samplesToSeconds(600 * FRAME_SAMPLES));
    const output = new BookBufferOutput(() => ctx.context, rangeFetcher(cbr(600)), async (bytes, rate) => decodeFrames(bytes, rate).buffer);
    dispose.push(() => output.stop());
    expect(bookBufferSpan(request, 0, {})).toMatchObject({ from: 0, to: MP3_WINDOW_SECONDS });
    await output.start(request);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    const [current, next] = [...ctx.active];
    expect(next.startsAt).toBe(current.startsAt + current.buffer!.duration);
    ctx.advanceTo(current.startsAt + 1.2);
    expect(output.position()).toBeCloseTo(1.2, 5);
    ctx.advanceTo(next.startsAt + 0.3);
    expect(output.position()).toBeCloseTo(MP3_WINDOW_SECONDS + 0.3, 5);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    expect(ctx.peak).toBe(2);
    output.stop();
    expect(ctx.active.size).toBe(0);
    expect(ctx.gains.size).toBe(0);
    expect(output.position()).toBeNull();
  });

  it("serializes an orphaned native decode across 30 rapid seeks", async () => {
    const ctx = new ContextDouble();
    let complete!: () => void;
    let decodes = 0, maxPacket = 0, peakPcm = 0;
    const output = new BookBufferOutput(() => ctx.context, rangeFetcher(cbr(3000)), async (bytes, rate) => {
      const pcm = decodeFrames(bytes, rate);
      maxPacket = Math.max(maxPacket, bytes.byteLength);
      peakPcm = Math.max(peakPcm, ctx.pcmBytes + pcm.bytes * 2);
      if (++decodes === 1) await new Promise<void>((resolve) => { complete = resolve; });
      return pcm.buffer;
    });
    dispose.push(() => output.stop());
    const original = output.start(bookRequest(72));
    await vi.waitFor(() => expect(complete).toBeTypeOf("function"));
    const seeks = Array.from({ length: 30 }, (_, index) => output.start(bookRequest(72, index + 1)));
    expect(ctx.starts).toBe(0);
    expect(decodes).toBe(1);
    complete();
    await Promise.all([original, ...seeks]);
    await vi.waitFor(() => expect(ctx.active.size).toBe(2));
    expect(decodes).toBe(3);
    expect(output.position()).toBe(30);
    expect(peakPcm).toBeLessThan(8 * 1024 * 1024);
    expect(maxPacket * 3).toBeLessThan(512 * 1024);
  });
});
