import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "../src/game/audio";
import { audioKey } from "../src/audio-key";

const voice = "test-voice", line = "Hello!", key = audioKey(voice, 1, line);
const players: FakeAudio[] = [];
class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  volume = 1;
  preservesPitch = true;
  playbackRate = 1;
  currentTime = 0;
  ended = false;
  pause = vi.fn();
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
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

  it("retries the recording with the current token, then falls back on real failure", async () => {
    const done = audio.play(voice, 1, line);
    await flush();
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ token: "renewed", exp: Date.now() / 1000 + 3600 }) });
    players[0].onerror?.();
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(2);
    expect(players[0].src).toContain("t=renewed");
    expect(synth.speak).not.toHaveBeenCalled();
    players[0].onerror?.(); await flush(); await done;
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled download and stops its media element before falling back", async () => {
    const done = audio.play(voice, 1, line);
    await flush();
    await vi.advanceTimersByTimeAsync(20000); await done;
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(2);
    expect(players.every((p) => p.pause.mock.calls.length && p.removeAttribute.mock.calls.length)).toBe(true);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("never switches to browser speech halfway through a line", async () => {
    const done = audio.play(voice, 1, line); await flush();
    players[0].onplaying?.();
    players[0].onerror?.(); await done;
    expect(players).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("reuses downloaded clips offline and keeps repair versions separate", async () => {
    await audio.prefetch([{ voice, speed: 1, text: line }]);
    const downloads = fetcher.mock.calls.length;
    vi.stubGlobal("navigator", { onLine: false });
    let done = audio.play(voice, 1, line); await flush();
    expect(players[0].src).toMatch(/^blob:/);
    players[0].onplaying?.(); players[0].onended?.(); await done;
    expect(fetcher).toHaveBeenCalledTimes(downloads);
    audio.repairVersions[key] = "new-recording";
    done = audio.play(voice, 1, line); await flush();
    expect(players[0].src).toContain("v=new-recordin");
    players[0].onended?.(); await done;
  });

  it("keeps a permission-blocked line pending until a tap, without skipping or switching voices", async () => {
    let allowed = false, settled = false;
    class BlockedAudio extends FakeAudio { play = vi.fn(() => allowed ? Promise.resolve() : Promise.reject(new DOMException("Tap to play", "NotAllowedError"))); }
    vi.stubGlobal("Audio", BlockedAudio);
    const done = audio.play(voice, 1, line).then(() => { settled = true; });
    await flush();
    await vi.advanceTimersByTimeAsync(30000);
    expect(settled).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    allowed = true;
    audio.unlock();
    expect(players[0].play).toHaveBeenCalledTimes(2);
    players[0].onplaying?.(); players[0].onended?.(); await done;
    expect(settled).toBe(true);
  });

  it("unlocks one player during the title tap and keeps authorization across delayed NPC lines", async () => {
    // Model Safari's per-element permission, rather than a page-wide 'has interacted' flag.
    let gesture = false;
    class SafariAudio extends FakeAudio {
      authorized = false;
      play = vi.fn(() => {
        if (gesture) this.authorized = true;
        return this.authorized ? Promise.resolve() : Promise.reject(new DOMException("Tap to play", "NotAllowedError"));
      });
    }
    vi.stubGlobal("Audio", SafariAudio);
    const target = new EventTarget(), unbind = audio.bindUserGestures(target);
    let release!: (r: Response) => void;
    const next = "How are you?", nextKey = audioKey(voice, 1, next);
    fetcher.mockImplementation((url: string) => url.endsWith("manifest.json") ? new Promise((r) => { release = r; }) : Promise.resolve(Response.json({})));
    const init = audio.init();
    gesture = true;
    target.dispatchEvent(new Event("touchend"));
    gesture = false;
    expect(players).toHaveLength(1);
    expect(players[0].src).toMatch(/^data:audio\/wav/);
    release(Response.json({ [key]: 1, [nextKey]: 1 })); await init; await flush();
    for (const text of [line, next, line]) {
      const done = audio.play(voice, 1, text);
      await flush();
      players[0].onplaying?.(); players[0].onended?.(); await done;
      await vi.advanceTimersByTimeAsync(160);
    }
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(4);
    expect(synth.speak).not.toHaveBeenCalled();
    unbind();
  });

  it("starts a ready recording synchronously inside a replay tap", async () => {
    await audio.init();
    let gesture = true;
    class GestureAudio extends FakeAudio {
      play = vi.fn(() => gesture ? Promise.resolve() : Promise.reject(new DOMException("Tap to play", "NotAllowedError")));
    }
    vi.stubGlobal("Audio", GestureAudio);
    const done = audio.play(voice, 1, line);
    gesture = false;
    expect(players[0].play).toHaveBeenCalledTimes(1);
    await flush(); players[0].onended?.(); await done;
  });

  it("cannot resume a stopped blocked line on a later gesture", async () => {
    class BlockedAudio extends FakeAudio { play = vi.fn(() => Promise.reject(new DOMException("Tap to play", "NotAllowedError"))); }
    vi.stubGlobal("Audio", BlockedAudio);
    const done = audio.play(voice, 1, line); await flush();
    audio.stop(); await done;
    audio.unlock(); await flush();
    expect(players[0].src).toMatch(/^data:audio\/wav/);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("ignores a stopped line's delayed play rejection after the next line has started", async () => {
    const old = audio.play(voice, 1, line); await flush();
    let reject!: (error: Error) => void;
    players[0].play.mockImplementationOnce(() => new Promise((_, rej) => { reject = rej; }));
    audio.stop(); await old;
    const second = audio.play(voice, 1, line); await flush();
    audio.stop(); await second;
    const third = audio.play(voice, 1, line); await flush();
    players[0].onplaying?.();
    const pauses = players[0].pause.mock.calls.length;
    reject(new DOMException("old attempt", "NotAllowedError")); await flush();
    expect(players[0].pause).toHaveBeenCalledTimes(pauses);
    audio.unlock();
    expect(players[0].play).toHaveBeenCalledTimes(3);
    players[0].onended?.(); await third;
  });

  it("returns from the microphone audio route before playing a recording", async () => {
    const session = { type: "play-and-record" };
    vi.stubGlobal("navigator", { onLine: true, audioSession: session });
    const done = audio.play(voice, 1, line); await flush();
    expect(session.type).toBe("playback");
    players[0].onended?.(); await done;
  });
});
