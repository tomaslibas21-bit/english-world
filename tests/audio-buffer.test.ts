import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem, usesBufferRecordings } from "../src/game/audio";
import { captureAudio } from "../src/convo/audioFocus";
import { audioKey } from "../src/audio-key";

class PCM {
  numberOfChannels: number; length: number; sampleRate: number; duration: number;
  channels: Float32Array[];
  constructor(channels = 1, length = 44100, rate = 44100) {
    this.numberOfChannels = channels; this.length = length; this.sampleRate = rate; this.duration = length / rate;
    this.channels = Array.from({ length: channels }, () => Float32Array.from({ length }, (_, i) => 0.25 * Math.sin(2 * Math.PI * 180 * i / rate)));
  }
  getChannelData(i: number) { return this.channels[i]; }
}
class Context extends EventTarget {
  static initial = "running";
  static resumeWork: (() => Promise<void>) | undefined;
  state = Context.initial; currentTime = 0; sampleRate = 44100; destination = {};
  sources: any[] = []; gains: any[] = [];
  resume = vi.fn(() => Context.resumeWork?.() ?? Promise.resolve().then(() => { this.state = "running"; }));
  createBufferSource() {
    const s = { buffer: null, playbackRate: { value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null };
    this.sources.push(s); return s;
  }
  createGain() { const g = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }; this.gains.push(g); return g; }
  constructor() { super(); contexts.push(this); }
  change(state: string) { this.state = state; this.dispatchEvent(new Event("statechange")); }
  finish() { const s = this.sources.at(-1); this.currentTime += s.buffer.duration - (s.start.mock.calls[0]?.[1] ?? 0); s.onended?.(); }
}
const contexts: Context[] = [];
const voice = "test", lines = ["Pretty good, thanks!", "What can I get you?"];
let audio: AudioSystem, fetcher: ReturnType<typeof vi.fn>, decode: ReturnType<typeof vi.fn>;
let doc: EventTarget & { hidden: boolean }, win: EventTarget;
let html: ReturnType<typeof vi.fn>, synth: ReturnType<typeof vi.fn>;
const tick = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => {
  vi.useFakeTimers(); contexts.length = 0; Context.initial = "running"; Context.resumeWork = undefined;
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)", onLine: true, audioSession: { type: "auto" } });
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ token: "private-token", exp: Date.now() / 1000 + 3600 }) });
  doc = Object.assign(new EventTarget(), { hidden: false }); vi.stubGlobal("document", doc);
  decode = vi.fn(async () => new PCM());
  win = Object.assign(new EventTarget(), { AudioContext: Context, OfflineAudioContext: class { decodeAudioData = decode; createBuffer(c: number, n: number, r: number) { return new PCM(c, n, r); } } });
  vi.stubGlobal("window", win);
  html = vi.fn(function () { throw new Error("iOS must not use HTMLAudio"); }); vi.stubGlobal("Audio", html);
  synth = vi.fn(); vi.stubGlobal("speechSynthesis", { getVoices: () => [], speak: synth, cancel: vi.fn() });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } })); vi.stubGlobal("fetch", fetcher);
  audio = new AudioSystem(); audio.ready = true;
  for (const text of lines) audio.manifest[audioKey(voice, 1, text)] = 1;
});
afterEach(() => { audio.stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("iOS recorded Web Audio", () => {
  it("selects iPhone/iPad independently of version and retains desktop/Android HTML", () => {
    expect(usesBufferRecordings()).toBe(true);
    for (const [userAgent, platform, maxTouchPoints, expected] of [
      ["Mozilla Macintosh", "MacIntel", 5, true], ["Mozilla Macintosh", "MacIntel", 0, false],
      ["Mozilla Android", "Linux armv8l", 5, false], ["Mozilla iPad", "iPad", 5, true],
    ] as const) { vi.stubGlobal("navigator", { userAgent, platform, maxTouchPoints }); expect(usesBufferRecordings()).toBe(expected); }
  });

  it("unlocks the context synchronously in a gesture without priming media", () => {
    Context.initial = "suspended";
    audio.unlock();
    expect(contexts).toHaveLength(1); expect(contexts[0].resume).toHaveBeenCalledOnce(); expect(html).not.toHaveBeenCalled();
  });

  it("plays both post-microphone sentences once through one context with exact PCM and gain", async () => {
    audio.volume = 0.37; audio.unlock();
    const mic = captureAudio(); mic.stopping();
    const first = audio.play(voice, 1, lines[0]); await tick();
    expect(contexts[0].sources).toHaveLength(0);
    mic.ended(); await tick();
    const ctx = contexts[0], pcm = await decode.mock.results[0].value;
    expect(ctx.sources[0].buffer).toBe(pcm); expect(ctx.sources[0].playbackRate.value).toBe(1); expect(ctx.gains[0].gain.value).toBe(0.37);
    ctx.finish(); expect(await first).toBe(true);
    await vi.advanceTimersByTimeAsync(160);
    const second = audio.play(voice, 1, lines[1]); await tick(); ctx.finish(); expect(await second).toBe(true);
    expect(contexts).toHaveLength(1); expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources.every(s => s.start.mock.calls.length === 1)).toBe(true);
    expect(html).not.toHaveBeenCalled(); expect(synth).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.some(([url]) => url.includes("t=private-token"))).toBe(true);
  });

  it("resumes interrupted output from its real offset, without replaying the prefix", async () => {
    const done = audio.play(voice, 1, lines[0]); await tick();
    const ctx = contexts[0], old = ctx.sources[0]; ctx.currentTime = 0.43;
    const lateEnd = old.onended;
    ctx.change("interrupted"); expect(audio.getState()).toBe("blocked"); expect(old.stop).toHaveBeenCalledOnce();
    audio.retry(); expect(ctx.resume).toHaveBeenCalledOnce(); await tick();
    expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 0.43);
    lateEnd?.(); expect(audio.getState()).toBe("playing");
    ctx.finish(); expect(await done).toBe(true); expect(html).not.toHaveBeenCalled();
  });

  it("does not advance a line when ended fires before the audio clock reached the end", async () => {
    let settled = false;
    const done = audio.play(voice, 1, lines[0]).then(v => { settled = true; return v; }); await tick();
    contexts[0].currentTime = 0.25; contexts[0].sources[0].onended?.();
    expect(audio.getState()).toBe("blocked"); expect(settled).toBe(false);
    audio.retry(); await tick(); expect(contexts[0].sources[1].start).toHaveBeenCalledWith(0, 0.25);
    contexts[0].finish(); expect(await done).toBe(true);
  });

  it("freezes on hiding and waits for explicit retry after visibility returns", async () => {
    const done = audio.play(voice, 1, lines[0]); await tick();
    const ctx = contexts[0]; ctx.currentTime = 0.3; doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
    expect(audio.getState()).toBe("blocked");
    ctx.currentTime = 9; doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange")); await tick();
    expect(ctx.sources).toHaveLength(1);
    audio.retry(); expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 0.3);
    ctx.finish(); expect(await done).toBe(true);
  });

  it("cannot start a canceled late decode or pending resume", async () => {
    let resolveDecode!: (v: PCM) => void;
    decode.mockImplementationOnce(() => new Promise(r => { resolveDecode = r; }));
    const first = audio.play(voice, 1, lines[0]); await tick(); audio.stop(); expect(await first).toBe(false);
    resolveDecode(new PCM()); await tick(); expect(contexts).toHaveLength(0);
    Context.initial = "suspended"; let resume!: () => void;
    Context.resumeWork = () => new Promise(r => { resume = r; });
    const second = audio.play(voice, 1, lines[1]); await tick(); audio.stop(); expect(await second).toBe(false);
    contexts[0].state = "running"; resume(); await tick(); expect(contexts[0].sources).toHaveLength(0);
  });

  it("expires a hanging resume without letting its late completion play", async () => {
    Context.initial = "suspended"; let resume!: () => void;
    Context.resumeWork = () => new Promise(r => { resume = r; });
    const done = audio.play(voice, 1, lines[0]); await tick();
    await vi.advanceTimersByTimeAsync(5000); expect(audio.getState()).toBe("blocked");
    contexts[0].state = "running"; resume(); await tick(); expect(contexts[0].sources).toHaveLength(0);
    audio.stop(); expect(await done).toBe(false);
  });

  it("a microphone acquired while resume is pending must release before the source starts", async () => {
    Context.initial = "suspended"; let resume!: () => void;
    Context.resumeWork = () => new Promise(r => { resume = r; });
    const done = audio.play(voice, 1, lines[0]); await tick(); const mic = captureAudio();
    contexts[0].state = "running"; resume(); await tick(); expect(contexts[0].sources).toHaveLength(0);
    mic.ended(); await tick(); expect(contexts[0].sources).toHaveLength(1);
    contexts[0].finish(); expect(await done).toBe(true);
  });

  it("uses cached decoded recordings offline and separates repair versions", async () => {
    let done = audio.play(voice, 1, lines[0]); await tick(); contexts[0].finish(); await done;
    const downloads = fetcher.mock.calls.length; fetcher.mockRejectedValue(new TypeError("offline"));
    done = audio.play(voice, 1, lines[0]); await tick(); contexts[0].finish(); await done;
    expect(fetcher).toHaveBeenCalledTimes(downloads); expect(decode).toHaveBeenCalledOnce();
    audio.repairVersions[audioKey(voice, 1, lines[0])] = "new-version";
    done = audio.play(voice, 1, lines[0]); await tick(); expect(audio.getState()).toBe("unavailable");
    expect(html).not.toHaveBeenCalled(); expect(synth).not.toHaveBeenCalled(); audio.stop(); expect(await done).toBe(false);
  });

  it("preserves slow-mode pitch with a longer buffer played at native rate", async () => {
    const done = audio.play(voice, 1, lines[0], { slow: true }); await tick();
    const ctx = contexts[0], source = ctx.sources[0], original = await decode.mock.results[0].value;
    expect(source.buffer.duration).toBeCloseTo(original.duration / 0.82, 4); expect(source.playbackRate.value).toBe(1);
    const samples = source.buffer.getChannelData(0), start = 4410, end = samples.length - 4410;
    let crossings = 0; for (let i = start; i < end; i++) if (samples[i - 1] <= 0 && samples[i] > 0) crossings++;
    expect(crossings / ((end - start) / 44100)).toBeCloseTo(180, 0);
    ctx.finish(); expect(await done).toBe(true);
  });

  it("decode failure remains visible and never silently switches playback backend or voice", async () => {
    decode.mockRejectedValue(new DOMException("bad MP3", "EncodingError"));
    const done = audio.play(voice, 1, lines[0]); await tick();
    expect(audio.getState()).toBe("unavailable"); expect(html).not.toHaveBeenCalled(); expect(synth).not.toHaveBeenCalled();
    audio.continueReading(); expect(await done).toBe(true);
  });
});
