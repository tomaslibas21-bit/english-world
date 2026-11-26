import { mp3Frame } from "../../src/radio/mp3Windows";
import type { TalkOutput, TalkTrack } from "../../src/radio/talkPlayer";

export const SAMPLE_RATE = 24_000;
export const FRAME_SAMPLES = 576;
export const FRAME_BYTES = 288;
export const samplesToSeconds = (samples: number) => samples / SAMPLE_RATE;
export const fixtureFrame = (bitrate = 10, sampling = 1, flags = 0xc4) => {
  const header = Uint8Array.of(0xff, 0xf3, bitrate * 16 + sampling * 4, flags);
  const bytes = new Uint8Array(mp3Frame(header)!.length);
  bytes.set(header);
  return bytes;
};

export function cbr(frames: number, id3 = 0): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(id3 + FRAME_BYTES * frames);
  if (id3) data.set([73, 68, 51, 4, 0, 0, 0, 0, (id3 - 10) >> 7, (id3 - 10) & 127]);
  for (let i = 0; i < frames; i++) data.set(fixtureFrame(), id3 + i * FRAME_BYTES);
  return data;
}

export const rangeFetcher = (data: Uint8Array, calls: string[] = []): typeof fetch => async (_, init) => {
  const range = new Headers(init?.headers).get("Range")!;
  calls.push(range);
  const [, from, to] = /^bytes=(\d*)-(\d+)$/.exec(range)!;
  const start = from ? Number(from) : Math.max(0, data.length - Number(to));
  const end = from ? Math.min(data.length - 1, Number(to)) : data.length - 1;
  return start > end ? new Response(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } }) :
    new Response(Uint8Array.from(data.subarray(start, end + 1)), {
      status: 206, headers: { "Content-Range": `bytes ${start}-${end}/${data.length}` },
    });
};

export class BufferDouble {
  readonly data: Float32Array<ArrayBuffer>[];
  constructor(readonly numberOfChannels: number, readonly length: number, readonly sampleRate: number) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() { return this.length / this.sampleRate; }
  get bytes() { return this.numberOfChannels * this.length * 4; }
  getChannelData(ch: number) { return this.data[ch]; }
  copyToChannel(samples: Float32Array, ch: number) { this.data[ch].set(samples); }
  get buffer() { return this as unknown as AudioBuffer; }
}

export class ContextDouble extends EventTarget {
  currentTime = 0;
  state = "running";
  destination = {};
  active = new Set<ReturnType<ContextDouble["createBufferSource"]>>();
  starts = 0;
  gains = new Set<{ gain: { value: number } }>();
  peak = 0;
  get context() { return this as unknown as AudioContext; }
  get pcmBytes() { return [...this.active].reduce((bytes, source) => bytes + source.buffer!.bytes, 0); }
  createBuffer = (channels: number, length: number, rate: number) => new BufferDouble(channels, length, rate);
  createGain() {
    const param = { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect: () => this.gains.add(param), disconnect: () => this.gains.delete(param) };
    return param;
  }
  createBufferSource() {
    const source = {
      buffer: null as BufferDouble | null, onended: null as null | (() => void), startsAt: Infinity,
      connect() {}, disconnect: () => this.active.delete(source), stop() {},
      start: (at: number) => { source.startsAt = at; this.active.add(source); this.starts++; this.peak = Math.max(this.peak, this.active.size); },
    };
    return source;
  }
  advanceTo(at: number) {
    this.currentTime = at;
    for (const source of [...this.active]) if (source.startsAt + source.buffer!.duration <= at) source.onended?.();
  }
}

export function decodeFrames(data: ArrayBuffer, rate: number) {
  const bytes = new Uint8Array(data);
  let pcm = 0, channels = 0;
  for (let at = 0; at < bytes.length;) {
    const frame = mp3Frame(bytes, at)!;
    pcm += frame.samples;
    channels = frame.channels;
    at += frame.length;
  }
  return new BufferDouble(channels, pcm, rate);
}

export type BookRequest = Parameters<TalkOutput["start"]>[0];
export function bookRequest(duration: number, position = 0): BookRequest {
  const track: TalkTrack = { mode: "target", duration, audioVersion: "a", recording: () => "/test.mp3",
    cues: [{ language: "en", start: 0, end: duration, sentenceId: "s1", textHash: "line", text: "A long sentence" }] };
  return { item: { selection: { itemKey: "book/b/author", chapterId: "c" }, tracks: { target: track } }, track, position,
    rates: {}, signal: new AbortController().signal, onTime() {}, onEnded() {}, onError() {} };
}
