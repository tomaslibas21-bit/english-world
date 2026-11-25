import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "three";
import { AudioSystem } from "../src/game/audio";
import { audioKey } from "../src/audio-key";
import { captureAudio } from "../src/convo/audioFocus";
import type { GameCharacter } from "../src/game/characters";
import { VoiceMouth } from "../src/game/talkNatural/mouth";

const voice = "test-voice", line = "Hello!", key = audioKey(voice, 1, line);
const players: FakeAudio[] = [];
class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  volume = 1;
  preservesPitch = true;
  playbackRate = 1;
  currentTime = 0;
  readyState = 4;
  muted = false;
  ended = false;
  paused = true;
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn();
  play = vi.fn(() => { this.paused = false; this.ended = false; return Promise.resolve(); });
  setAttribute = vi.fn();
  removeAttribute = vi.fn();
  constructor(public src = "") { players.push(this); }
  emitPlaying() { this.paused = false; this.ended = false; this.onplaying?.(); }
  emitPause() { this.paused = true; this.onpause?.(); }
  emitEnded() { this.paused = true; this.ended = true; this.onended?.(); }
}
let audio: AudioSystem;
let fetcher: ReturnType<typeof vi.fn>;
let synth: { getVoices: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
const flush = () => vi.advanceTimersByTimeAsync(0);
const mp3 = () => new Response(new Blob(["audio bytes"], { type: "audio/mpeg" }), { headers: { "content-type": "audio/mpeg" } });
beforeEach(() => {
  vi.useFakeTimers();
  players.length = 0;
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("localStorage", { getItem: () => null });
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  synth = { getVoices: vi.fn(() => [{ lang: "en-US", name: "Samantha", localService: true }]), speak: vi.fn((u) => queueMicrotask(() => u.onend?.())), cancel: vi.fn() };
  vi.stubGlobal("speechSynthesis", synth);
  fetcher = vi.fn(async (url: string) => url.endsWith("manifest.json") ? Response.json({ [key]: 1 }) : url.endsWith("repair-versions.json") ? Response.json({}) : mp3());
  vi.stubGlobal("fetch", fetcher);
  audio = new AudioSystem();
});
afterEach(() => { audio.stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("recorded voice reliability", () => {
  it("plays an authored MP3 by filename and keeps its clock without fetching the manifest or using browser speech", async () => {
    audio.base = "/voices/";
    const clip = audio.playFile("ph-123456789a.mp3"), player = players[0];
    expect(player.src).toBe("/voices/ph-123456789a.mp3");
    expect(clip.status).toBe("loading");
    player.emitPlaying();
    player.currentTime = 1.2;
    expect(clip.status).toBe("playing");
    expect(clip.currentTime).toBe(1.2);
    player.emitEnded();
    expect(clip.status).toBe("ended");
    const blocked = audio.playFile("ph-abcdef1234.mp3");
    player.onerror?.();
    player.currentTime = 0;
    expect(blocked.status).toBe("unavailable");
    expect(clip.currentTime).toBe(1.2);
    expect(fetcher).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("does not mistake an unavailable manifest for an unrecorded NPC, and retries on request", async () => {
    fetcher.mockResolvedValue(new Response("offline", { status: 503 }));
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush();
    expect(audio.getState()).toBe("unavailable");
    expect(settled).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    fetcher.mockImplementation(async (url: string) => url.endsWith("manifest.json") ? Response.json({ [key]: 1 }) : Response.json({}));
    audio.retry(); await flush();
    expect(players).toHaveLength(1);
    players[0].emitEnded(); await done;
    expect(settled).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("tries the recording despite a false offline flag, including between lines", async () => {
    for (const online of [true, false, true]) {
      vi.stubGlobal("navigator", { onLine: online });
      const done = audio.play(voice, 1, line);
      await flush();
      const player = players.at(-1)!;
      expect(player).toBeDefined();
      player.emitEnded();
      await done;
    }
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(3);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("waits for a slow manifest and shares initialization with the game", async () => {
    let release!: (r: Response) => void;
    fetcher.mockImplementation((url: string) => url.endsWith("manifest.json") ? new Promise((r) => { release = r; }) : Promise.resolve(Response.json({})));
    const init = audio.init();
    const done = audio.play(voice, 1, line);
    await flush();
    expect(players).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.filter(([u]) => u.endsWith("manifest.json"))).toHaveLength(1);
    release(Response.json({ [key]: 1 }));
    await init; await flush();
    expect(players).toHaveLength(1);
    players[0].emitEnded(); await done;
  });

  it("a clip list that arrives slowly but steadily is taken, however long it takes (a slow phone connection)", async () => {
    // 25 s in all, a piece every 5 s: longer than any stall, never one itself
    const body = new TextEncoder().encode(JSON.stringify({ [key]: 1 }));
    let asked = 0;
    fetcher.mockImplementation(async (url: string) => {
      if (!url.endsWith("manifest.json")) return Response.json({});
      asked++;
      let i = 0;
      return new Response(new ReadableStream({
        async pull(c) {
          await new Promise((r) => setTimeout(r, 5000));
          if (i < body.length) c.enqueue(body.slice(i, (i += Math.ceil(body.length / 5)))); else c.close();
        },
      }));
    });
    const init = audio.init();
    await vi.advanceTimersByTimeAsync(40000);
    await init;
    expect(asked).toBe(1);
    expect(audio.ready).toBe(true);
    expect(audio.hasClip(voice, 1, line)).toBe(true);
  });

  it("a clip list that stands still is given up after the stall time and asked for once more", async () => {
    let asked = 0;
    fetcher.mockImplementation((url: string, opts?: { signal?: AbortSignal }) => {
      if (!url.endsWith("manifest.json")) return Promise.resolve(Response.json({}));
      // the first answer never comes; the second is there at once
      if (asked++ > 0) return Promise.resolve(Response.json({ [key]: 1 }));
      return new Promise((_, reject) => opts?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    });
    const init = audio.init();
    await vi.advanceTimersByTimeAsync(7000);
    expect(asked).toBe(1);
    await vi.advanceTimersByTimeAsync(2000);
    await init;
    expect(asked).toBe(2);
    expect(audio.ready).toBe(true);
  });

  it("retries a failed manifest instead of permanently choosing browser voices", async () => {
    let failures = 1;
    fetcher.mockImplementation(async (url: string) => {
      if (url.endsWith("manifest.json")) {
        if (failures-- > 0) throw new TypeError("connection interrupted");
        return Response.json({ [key]: 1 });
      }
      return Response.json({});
    });
    const done = audio.play(voice, 1, line);
    await flush();
    expect(audio.ready).toBe(true);
    expect(players).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
    players[0].emitEnded(); await done;
  });

  it("does not count download time as spoken time or let a stopped line play later", async () => {
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush();
    await vi.advanceTimersByTimeAsync(4000); // longer than the old 1-second clip + 1.5-second timer
    expect(settled).toBe(false);
    players[0].emitPlaying();
    await vi.advanceTimersByTimeAsync(1500);
    expect(settled).toBe(false);
    audio.stop(); await done;
    expect(players[0].pause).toHaveBeenCalled();
    expect(players[0].onplaying).toBeNull();
    expect(players[0].load).toHaveBeenCalled();
  });

  it("cancels immediately while the manifest is loading", async () => {
    let release!: (r: Response) => void;
    fetcher.mockImplementation((url: string) => url.endsWith("manifest.json") ? new Promise((r) => { release = r; }) : Promise.resolve(Response.json({})));
    const done = audio.play(voice, 1, line);
    audio.stop(); await done;
    release(Response.json({ [key]: 1 })); await flush();
    expect(players).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("retries with the current token and offers an explicit browser-voice choice on real failure", async () => {
    const done = audio.play(voice, 1, line);
    await flush();
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ token: "renewed", exp: Date.now() / 1000 + 3600 }) });
    players[0].onerror?.();
    expect(players).toHaveLength(1);
    expect(players[0].src).toContain("t=renewed");
    expect(synth.speak).not.toHaveBeenCalled();
    players[0].onerror?.(); await flush();
    expect(audio.getState()).toBe("unavailable");
    expect(synth.speak).not.toHaveBeenCalled();
    audio.useBrowserVoice(); await flush(); await done;
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled download without silently switching voice or advancing the turn", async () => {
    const done = audio.play(voice, 1, line);
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    expect(audio.getState()).toBe("unavailable");
    expect(players).toHaveLength(1);
    expect(players.every((p) => p.pause.mock.calls.length && p.removeAttribute.mock.calls.length)).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
    audio.stop(); expect(await done).toBe(false);
  });

  it("never switches to browser speech halfway through a line", async () => {
    const done = audio.play(voice, 1, line); await flush();
    players[0].emitPlaying();
    players[0].onerror?.();
    expect(audio.getState()).toBe("unavailable");
    audio.stop(); expect(await done).toBe(false);
    expect(players).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("reuses downloaded clips offline and keeps repair versions separate", async () => {
    await audio.prefetch([{ voice, speed: 1, text: line }]);
    const downloads = fetcher.mock.calls.length;
    vi.stubGlobal("navigator", { onLine: false });
    let done = audio.play(voice, 1, line); await flush();
    expect(players[0].src).toMatch(/^data:audio\/mpeg;base64,/);
    players[0].emitPlaying(); players[0].emitEnded(); await done;
    expect(fetcher).toHaveBeenCalledTimes(downloads);
    audio.repairVersions[key] = "new-recording";
    done = audio.play(voice, 1, line); await flush();
    expect(players[0].src).toContain("v=new-recordin");
    players[0].emitEnded(); await done;
  });

  it("does not treat playback permission as an offline failure", async () => {
    class BlockedAudio extends FakeAudio { play = vi.fn(() => Promise.reject(new DOMException("Tap to play", "NotAllowedError"))); }
    vi.stubGlobal("Audio", BlockedAudio);
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush();
    await vi.advanceTimersByTimeAsync(30000);
    expect(audio.getState()).toBe("blocked");
    expect(settled).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    players[0].play.mockImplementation(() => Promise.resolve());
    audio.retry();
    players[0].emitPlaying(); players[0].emitEnded();
    await done;
    expect(settled).toBe(true);
  });
});


describe("mobile media ownership", () => {
  it("does not change the audio category after a post-microphone recording has started", async () => {
    const activeChanges: { type: string; time: number }[] = [];
    let type = "auto";
    vi.stubGlobal("navigator", { onLine: true, audioSession: {
      get type() { return type; },
      set type(value: string) {
        const player = players[0];
        if (value !== type && player && !player.paused && !player.ended) activeChanges.push({ type: value, time: player.currentTime });
        type = value;
      },
    } });
    const mic = captureAudio(); mic.ended();
    const done = audio.play(voice, 1, line); await flush();
    const player = players[0];
    player.currentTime = 0.2;
    player.emitPlaying();
    expect(activeChanges).toEqual([]);
    player.emitEnded(); expect(await done).toBe(true);
  });

  it("does not reroute an audible recording when recognition ends after its timeout", async () => {
    const activeChanges: string[] = [];
    let type = "auto";
    vi.stubGlobal("navigator", { onLine: true, audioSession: {
      get type() { return type; },
      set type(value: string) {
        const player = players[0];
        if (value !== type && player && !player.paused && !player.ended) activeChanges.push(value);
        type = value;
      },
    } });
    const mic = captureAudio(); mic.stopping();
    const done = audio.play(voice, 1, line);
    await vi.advanceTimersByTimeAsync(1200);
    const player = players[0];
    player.emitPlaying();
    activeChanges.length = 0;
    player.currentTime = 0.4;
    mic.ended();
    expect(activeChanges).toEqual([]);
    expect(player.currentTime).toBe(0.4);
    expect(player.play).toHaveBeenCalledOnce();
    player.emitEnded(); expect(await done).toBe(true);

    const afterLateEnd: string[] = [];
    Object.defineProperty((navigator as Navigator & { audioSession: object }).audioSession, "type", {
      get() { return type; },
      set(value: string) { if (value !== type) afterLateEnd.push(value); type = value; },
      configurable: true,
    });
    const next = audio.play(voice, 1, line); await flush();
    expect(afterLateEnd).toEqual(["auto", "playback"]);
    player.emitPlaying(); player.emitEnded(); expect(await next).toBe(true);
    const third = audio.play(voice, 1, line); await flush();
    expect(afterLateEnd).toEqual(["auto", "playback"]); // consumed, not every later sentence
    player.emitPlaying(); player.emitEnded(); expect(await third).toBe(true);
  });

  it("restores speaker routing for repeated answers and delayed media starts without changing gain or replaying", async () => {
    let type = "auto", nativeRoute = "auto", resets = 0;
    const routesAtPlay: string[] = [];
    vi.stubGlobal("navigator", { onLine: true, audioSession: {
      get type() { return type; },
      set type(value: string) { if (type !== value) { nativeRoute = value; resets++; } type = value; },
    } });
    class RoutedAudio extends FakeAudio {
      play = vi.fn(() => { routesAtPlay.push(nativeRoute); return Promise.resolve(); });
    }
    vi.stubGlobal("Audio", RoutedAudio);
    for (let i = 0; i < 4; i++) {
      const mic = captureAudio(); mic.stopping();
      const done = audio.play(voice, 1, line); await flush();
      expect(routesAtPlay).toHaveLength(i);
      mic.ended();
      nativeRoute = "quiet-capture"; // delayed native cleanup after our release callback
      await flush();
      const player = players[0];
      expect(routesAtPlay.at(-1)).toBe("playback");
      expect(player.volume).toBe(0.9);
      player.currentTime = 0.2;
      const atStart = resets;
      player.emitPlaying();
      expect(nativeRoute).toBe("playback");
      expect(player.currentTime).toBe(0.2);
      expect(player.play).toHaveBeenCalledTimes(i + 1);
      expect(resets).toBe(atStart); // first playing is already too late to change category
      player.emitPlaying(); // buffering/resume must not repeatedly reset the category
      expect(resets).toBe(atStart);
      player.emitEnded(); expect(await done).toBe(true);
    }
    expect(players).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("waits for a newer microphone opened while initialization was pending", async () => {
    let release!: (r: Response) => void;
    fetcher.mockImplementation((url: string) => url.endsWith("manifest.json") ? new Promise((r) => { release = r; }) : Promise.resolve(Response.json({})));
    const done = audio.play(voice, 1, line); await flush();
    const mic = captureAudio();
    release(Response.json({ [key]: 1 })); await flush();
    expect(players.every((player) => !player.play.mock.calls.length)).toBe(true);
    mic.ended(); await flush();
    expect(players[0].play).toHaveBeenCalledOnce();
    players[0].emitEnded(); expect(await done).toBe(true);
  });

  it("cancels a queued reply while the microphone is releasing, without late playback", async () => {
    const mic = captureAudio(); mic.stopping();
    const done = audio.play(voice, 1, line);
    await flush();
    expect(players).toHaveLength(0);
    audio.stop(); expect(await done).toBe(false);
    mic.ended(); await flush();
    expect(players).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("unlocks one player synchronously and plays consecutive lines without a second tap", async () => {
    let gesture = true;
    class MobileAudio extends FakeAudio {
      granted = false;
      play = vi.fn(() => {
        if (gesture) this.granted = true;
        return this.granted ? Promise.resolve() : Promise.reject(new DOMException("Tap", "NotAllowedError"));
      });
    }
    vi.stubGlobal("Audio", MobileAudio);
    audio.unlock(); // actual click: no manifest/fetch/microphone await before play()
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(1);
    gesture = false;
    await flush();
    for (let i = 0; i < 3; i++) {
      const done = audio.play(voice, 1, line);
      await flush();
      expect(audio.getState()).not.toBe("blocked");
      players[0].emitPlaying();
      players[0].emitEnded();
      expect(await done).toBe(true);
    }
    expect(players).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("does not let a late rejected play promise block a replacement line", async () => {
    let reject!: (error: Error) => void;
    class DelayedAudio extends FakeAudio {
      play = vi.fn(() => new Promise<void>((_, r) => { reject = r; }));
    }
    vi.stubGlobal("Audio", DelayedAudio);
    const old = audio.play(voice, 1, line); await flush();
    const rejectOld = reject;
    const next = audio.play(voice, 1, line); await flush();
    expect(await old).toBe(false);
    players[0].emitPlaying();
    rejectOld(new DOMException("Old source", "AbortError")); await flush();
    expect(audio.getState()).toBe("playing");
    players[0].emitEnded(); expect(await next).toBe(true);
  });

  it("ignores a queued pause after resume while retaining genuine pause recovery", async () => {
    let settled = false;
    const done = audio.play(voice, 1, line).then((completed) => { settled = true; return completed; });
    await flush();
    const player = players[0];
    player.emitPlaying();
    player.currentTime = 0.4;
    // pause() queues an event; an immediate user retry resumes before it dispatches.
    player.pause();
    audio.retry();
    expect(player.paused).toBe(false);
    player.onpause?.();
    expect(audio.getState()).toBe("loading");
    expect(settled).toBe(false);
    expect(player.currentTime).toBe(0.4);
    player.emitPlaying();
    player.emitPause();
    expect(audio.getState()).toBe("blocked");
    expect(settled).toBe(false);
    audio.retry();
    player.emitPlaying();
    player.emitEnded();
    expect(await done).toBe(true);
    expect(players).toHaveLength(1);
  });

  it("does not complete a replacement recording on an ended event while it is still playing", async () => {
    const secondLine = "The next sentence.";
    audio.ready = true;
    audio.manifest = { [key]: 1, [audioKey(voice, 1, secondLine)]: 1 };
    const old = audio.play(voice, 1, line);
    await flush();
    const player = players[0];
    player.emitPlaying();
    let settled = false;
    const next = audio.play(voice, 1, secondLine).then((completed) => { settled = true; return completed; });
    await flush();
    expect(await old).toBe(false);
    player.emitPlaying();
    player.currentTime = 0.2;
    player.pause.mockClear();
    // Dispatch reaches the element's new handler, but its current source has not ended.
    player.onended?.();
    await flush();
    expect(settled).toBe(false);
    expect(audio.getState()).toBe("playing");
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.currentTime).toBe(0.2);
    player.emitEnded();
    expect(await next).toBe(true);
    expect(audio.getState()).toBe("idle");
    expect(players).toHaveLength(1);
  });

  it("keeps a paused or stalled recording pending until resumed instead of opening the mic", async () => {
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush(); players[0].emitPlaying();
    players[0].currentTime = 0.4;
    players[0].emitPause();
    await vi.advanceTimersByTimeAsync(30000);
    expect(audio.getState()).toBe("blocked");
    expect(settled).toBe(false);
    audio.retry();
    expect(players[0].currentTime).toBe(0.4);
    players[0].emitPlaying(); players[0].emitEnded(); await done;
    expect(settled).toBe(true);
  });
});

describe("owned HTML and browser voice playback", () => {
  function mounted() {
    const root = new Group();
    new Group().add(root);
    return { root } as GameCharacter;
  }

  it.each([30, 60])("closes through Mariana's 205 ms pause on a misaligned %i Hz update", async (hz) => {
    const owner = { actor: mounted(), line: 1 }, mouth = new VoiceMouth();
    const envelope = new Float32Array(55).fill(1);
    // Observed 30 Hz bins around the 0.791–0.996 s pause in 342ff2b33d8d.
    envelope.set([0.961, 0.735, 0.293, 0.0302, 0, 0, 0, 0, 0, 0], 20);
    audio["envelopes"].set(key, envelope);
    const done = audio.play(voice, 1, line, { visual: owner, recordingOnly: true });
    await flush();
    const player = players[0], dt = 1 / hz;
    player.emitPlaying();
    const frames = [];
    for (let time = 0.007; time < 1.14; time += dt) {
      player.currentTime = time;
      mouth.read(dt, audio, owner);
      frames.push({ time, mouth: mouth.mouth, level: mouth.level });
    }
    expect(frames.filter((f) => f.time < 0.791 && f.mouth > 0.22).length).toBeGreaterThan(3);
    const gap = frames.filter((f) => f.time >= 0.791 && f.time <= 0.996);
    expect(gap.every((f) => f.level! <= 0.05)).toBe(true);
    expect(gap[0].mouth).toBeGreaterThan(0.25);
    expect(gap.slice(1).every((f, i) => f.mouth <= gap[i].mouth)).toBe(true);
    const firstClosed = gap.findIndex((f) => f.mouth === 0);
    expect(gap[firstClosed].time - 23 / 30).toBeGreaterThanOrEqual(0.12);
    expect(gap[firstClosed].time - 23 / 30).toBeLessThanOrEqual(0.155);
    expect(0.996 - gap[firstClosed].time).toBeGreaterThanOrEqual(1 / 30);
    expect(gap.slice(firstClosed).every((f) => f.mouth === 0)).toBe(true);
    expect(frames.find((f) => f.time > 1 && f.level === 1)?.mouth).toBeCloseTo(1 - Math.exp(-dt / 0.045));
    player.emitEnded();
    expect(await done).toBe(true);
  });

  it("reads gain and vowel from one finite native clock even across a bin boundary", async () => {
    const owner = { actor: mounted(), line: 1 }, mouth = new VoiceMouth();
    audio["envelopes"].set(key, Float32Array.from([0, 0.8, 0.2]));
    audio["vowels"].set(key, Float32Array.from([0, 0.25, 0.9]));
    const done = audio.play(voice, 1, line, { visual: owner });
    await flush();
    const player = players[0];
    player.emitPlaying();
    const now = vi.fn(() => 0.067).mockReturnValueOnce(0.066);
    Object.defineProperty(player, "currentTime", { get: now });
    mouth.read(0.045, audio, owner);
    expect(now).toHaveBeenCalledOnce();
    expect(mouth.level).toBeCloseTo(0.8);
    expect(mouth.roundness).toBeCloseTo(0.3 + (0.25 - 0.3) * (1 - Math.exp(-1)));
    now.mockReturnValue(NaN);
    mouth.read(0.045, audio, owner);
    expect(mouth).toMatchObject({ sample: "unknown", level: null, mouth: 0 });
    player.emitEnded();
    expect(await done).toBe(true);
  });

  it.each([30, 60])("reads the slow clip's cached 30 Hz samples and drops a replaced request at %i Hz", async (hz) => {
    const actor = mounted(), owner = { actor, line: 4 }, replay = { actor, line: 4 };
    const mouth = new VoiceMouth();
    const pcm = Float32Array.from({ length: 30 }, (_, i) => i < 6 || (i >= 15 && i < 18) ? 0.8 : 0);
    audio["envelopes"].set(key, pcm);
    audio["vowels"].set(key, Float32Array.from({ length: 30 }, (_, i) => i < 6 ? 0.2 : 0.75));
    const first = audio.play(voice, 1, line, { slow: true, visual: owner });
    expect(audio.visualOwner).toBe(owner);
    await flush();
    const player = players[0];
    const read = (seconds: number, request = owner) => {
      for (let i = 0; i < Math.round(seconds * hz); i++) mouth.read(1 / hz, audio, request);
    };
    read(0.3);
    expect(mouth).toMatchObject({ sample: "loading", mouth: 0 });
    player.emitPlaying();
    player.currentTime = 0.1;
    expect(player.playbackRate).toBe(0.82);
    expect(audio.visualElapsed(owner)).toBeCloseTo(0.1 / 0.82);
    read(0.25);
    expect(mouth.mouth).toBeGreaterThan(0.75);
    expect(mouth.roundness).toBeCloseTo(0.2, 2);

    player.currentTime = 0.33;
    read(0.24);
    expect(mouth).toMatchObject({ sample: "quiet", mouth: 0, level: 0 });
    player.currentTime = 0.55;
    read(0.2);
    expect(mouth.roundness).toBeCloseTo(0.75, 1);
    player.emitPause();
    read(1 / hz);
    expect(mouth).toMatchObject({ sample: "blocked", mouth: 0 });
    audio.retry();
    expect(audio.visualElapsed(owner)).toBeCloseTo(0.55 / 0.82);
    expect(audio.visualState(owner)).toBe("loading");
    player.emitPlaying();
    read(0.2);
    expect(mouth.mouth).toBeGreaterThan(0.75);
    player.currentTime = 0.75;
    read(0.24);
    expect(mouth).toMatchObject({ sample: "quiet", mouth: 0 });

    const second = audio.play(voice, 1, line, { visual: replay });
    expect(await first).toBe(false);
    read(1 / hz);
    expect(mouth).toMatchObject({ sample: "interrupt", mouth: 0 });
    expect(audio.visualElapsed(replay)).toBe(0);
    await flush();
    player.emitPlaying();
    player.currentTime = 0.1;
    player.muted = true;
    read(0.3, replay);
    expect(mouth).toMatchObject({ sample: "muted", mouth: 0, level: 0 });
    player.muted = false;
    player.volume = 0;
    expect(audio.visualState(replay)).toBe("muted");
    player.volume = 0.9;
    player.readyState = 2;
    expect(audio.visualState(replay)).toBe("loading");
    player.readyState = 4;
    actor.root.parent!.visible = false;
    expect(audio.visualState(replay)).toBe("blocked");
    actor.root.parent!.visible = true;
    vi.stubGlobal("document", { hidden: true });
    expect(audio.visualState(replay)).toBe("blocked");
    vi.stubGlobal("document", { hidden: false });
    read(0.25, replay);
    expect(mouth.mouth).toBeGreaterThan(0.75);
    player.emitEnded();
    expect(await second).toBe(true);
    read(1 / hz, replay);
    expect(mouth).toMatchObject({ sample: "ended", mouth: 0, level: -1 });
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("decodes the existing cache fill for an owned HTML request without another fetch", async () => {
    audio.ready = true;
    audio.manifest[key] = 1;
    const decode = vi.fn((_bytes: ArrayBuffer, done: (pcm: Pick<AudioBuffer, "sampleRate" | "getChannelData">) => void) => {
      done({ sampleRate: 300, getChannelData: () => Float32Array.from({ length: 300 }, () => 0.4) });
    });
    vi.stubGlobal("window", { OfflineAudioContext: class { decodeAudioData = decode; } });
    const owner = { actor: mounted(), line: 1 };
    const played = audio.play(voice, 1, line, { visual: owner, recordingOnly: true });
    await flush();
    players[0].emitPlaying();
    await audio.prefetch([{ voice, speed: 1, text: line }]);
    await flush();
    expect(decode).toHaveBeenCalledOnce();
    expect(audio.level(false)).toBeGreaterThan(0.95);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toContain(key);
    players[0].emitEnded();
    expect(await played).toBe(true);
  });

  it("requires a browser utterance start and preserves fallback language and recording-only behavior", async () => {
    audio.ready = true;
    synth.speak.mockImplementation(() => {});
    const owner = { actor: mounted(), line: 1 }, mouth = new VoiceMouth();
    const done = audio.play(voice, 1, line, { visual: owner, fallbackLang: "es-MX" });
    await flush();
    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.lang).toBe("es-MX");
    expect(audio.getState()).toBe("playing");
    expect(audio.visualState(owner)).toBe("loading");
    mouth.read(0.2, audio, owner);
    expect(mouth.mouth).toBe(0);
    (utterance.onstart as () => void)();
    mouth.read(0.2, audio, owner);
    expect(mouth.sample).toBe("unknown");
    expect(mouth.mouth).toBeGreaterThan(0.08);
    expect(mouth.mouth).toBeLessThanOrEqual(0.36);
    audio.continueReading();
    expect(await done).toBe(true);
    expect(audio.visualState(owner)).toBe("interrupt");
    const missing = { actor: owner.actor, line: 2 };
    expect(await audio.play(voice, 1, line, { visual: missing, recordingOnly: true, optional: true })).toBe(false);
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(audio.visualState(missing)).toBe("interrupt");
  });
});
