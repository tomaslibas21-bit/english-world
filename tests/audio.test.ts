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
  pause = vi.fn();
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
  setAttribute = vi.fn();
  removeAttribute = vi.fn();
  constructor(public src = "") { players.push(this); }
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
    players[0].onended?.(); await done;
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
      player.onended?.();
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
    players[0].onended?.(); await done;
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
    players[0].onended?.(); await done;
  });

  it("does not count download time as spoken time or let a stopped line play later", async () => {
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush();
    await vi.advanceTimersByTimeAsync(4000); // longer than the old 1-second clip + 1.5-second timer
    expect(settled).toBe(false);
    players[0].onplaying?.();
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
    players[0].onplaying?.();
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
    players[0].onplaying?.(); players[0].onended?.(); await done;
    expect(fetcher).toHaveBeenCalledTimes(downloads);
    audio.repairVersions[key] = "new-recording";
    done = audio.play(voice, 1, line); await flush();
    expect(players[0].src).toContain("v=new-recordin");
    players[0].onended?.(); await done;
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
    players[0].onplaying?.(); players[0].onended?.();
    await done;
    expect(settled).toBe(true);
  });
});


describe("mobile media ownership", () => {
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
      players[0].onplaying?.();
      players[0].onended?.();
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
    players[0].onplaying?.();
    rejectOld(new DOMException("Old source", "AbortError")); await flush();
    expect(audio.getState()).toBe("playing");
    players[0].onended?.(); expect(await next).toBe(true);
  });

  it("keeps a paused or stalled recording pending until resumed instead of opening the mic", async () => {
    let settled = false;
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush(); players[0].onplaying?.();
    players[0].currentTime = 0.4;
    players[0].onpause?.();
    await vi.advanceTimersByTimeAsync(30000);
    expect(audio.getState()).toBe("blocked");
    expect(settled).toBe(false);
    audio.retry();
    expect(players[0].currentTime).toBe(0.4);
    players[0].onplaying?.(); players[0].onended?.(); await done;
    expect(settled).toBe(true);
  });
});
