import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureAudio, waitForMicrophone, CAPTURE_RELEASE_TIMEOUT } from "../src/convo/audioFocus";
import { createSpeechAttempt, type SpeechRecognizer } from "../src/convo/speech";

let routes: string[];
beforeEach(() => {
  vi.useFakeTimers();
  routes = [];
  vi.stubGlobal("navigator", { audioSession: { set type(value: string) { routes.push(value); } } });
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
});
