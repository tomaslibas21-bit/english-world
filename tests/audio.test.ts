import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "../src/game/audio";
import { audioKey } from "../src/audio-key";
import { captureAudio } from "../src/convo/audioFocus";

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
