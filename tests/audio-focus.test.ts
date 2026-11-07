import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureAudio, playbackRoute, waitForMicrophone, CAPTURE_RELEASE_TIMEOUT } from "../src/convo/audioFocus";
import { createSpeechAttempt, type SpeechRecognizer } from "../src/convo/speech";

let routes: string[];
beforeEach(() => {
  vi.useFakeTimers();
  routes = [];
  let type = "auto";
  vi.stubGlobal("navigator", { audioSession: { get type() { return type; }, set type(value: string) { type = value; routes.push(value); } } });
});
afterEach(async () => {
  await vi.runAllTimersAsync();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("microphone to speaker handoff", () => {
  it("waits for recognition's actual onend after committing, with no late transcript callback", async () => {
    const rec = { start: vi.fn(), abort: vi.fn() } as unknown as SpeechRecognizer;
    const committed = vi.fn();
    const attempt = createSpeechAttempt({ evaluate: () => "complete", onUpdate() {}, onCommit: committed, createRecognition: () => rec });
    attempt.start(); rec.onstart?.();
    rec.onresult?.({ results: [Object.assign([{ transcript: "Yes" }], { isFinal: true })] });
    attempt.finish();
    expect(committed).toHaveBeenCalledOnce();
    expect(rec.abort).toHaveBeenCalledOnce();
    expect(rec.onresult).toBeNull();
    let ready = false;
    const next = waitForMicrophone().then(() => { ready = true; });
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).toBe(false);
    expect(routes.at(-1)).toBe("auto");
    rec.onend?.(); await next;
    expect(ready).toBe(true);
    expect(routes.at(-1)).toBe("playback");
    attempt.dispose();
  });

  it("does not switch a newer microphone to playback when an older aborted one ends", async () => {
    const old = captureAudio(); old.stopping();
    const current = captureAudio();
    old.ended();
    expect(routes).toEqual(["auto", "auto"]);
    current.ended();
    await waitForMicrophone();
    expect(routes.at(-1)).toBe("playback");
  });

  it("bounds an engine that omits onend after abort without delaying a normal end", async () => {
    const mic = captureAudio(); mic.stopping();
    let ready = false;
    const next = waitForMicrophone().then(() => { ready = true; });
    await vi.advanceTimersByTimeAsync(CAPTURE_RELEASE_TIMEOUT - 1);
    expect(ready).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await next;
    expect(ready).toBe(true);
    mic.ended(); // late end is harmless
  });

  it("repairs a stale native capture route even when the DOM override still says playback", () => {
    let type = "auto", nativeRoute = "auto";
    vi.stubGlobal("navigator", { audioSession: {
      get type() { return type; },
      set type(value: string) { if (type !== value) nativeRoute = value; type = value; },
    } });
    const mic = captureAudio(); mic.ended();
    expect(type).toBe("playback");
    nativeRoute = "quiet-capture"; // the native service finishes changing routes after onend
    playbackRoute();
    expect(nativeRoute).toBe("quiet-capture"); // an unchanged override is a WebKit no-op
    expect(playbackRoute(true)).toBe(true);
    expect(nativeRoute).toBe("playback");
  });

  it("handles a late real end after timeout once, without taking audio from a newer mic", async () => {
    const old = captureAudio(); old.stopping();
    await vi.advanceTimersByTimeAsync(CAPTURE_RELEASE_TIMEOUT);
    const before = routes.length;
    old.ended();
    expect(routes.slice(before)).toEqual(["auto", "playback"]);
    old.ended(); expect(routes).toHaveLength(before + 2);

    const delayed = captureAudio(); delayed.stopping();
    await vi.advanceTimersByTimeAsync(CAPTURE_RELEASE_TIMEOUT);
    const current = captureAudio();
    const duringCapture = routes.length;
    delayed.ended();
    expect(playbackRoute(true)).toBe(false);
    expect(routes).toHaveLength(duringCapture);
    current.ended();
    expect(routes.at(-1)).toBe("playback");
  });
});
