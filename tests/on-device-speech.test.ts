import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpeechRecognizer } from "../src/convo/speech";

async function speechOn(userAgent: string, brand: string) {
  vi.resetModules();
  const available = vi.fn(async () => "available" as const);
  const install = vi.fn(async () => true);
  vi.stubGlobal("navigator", { userAgent, userAgentData: { brands: [{ brand }] } });
  vi.stubGlobal("window", { SpeechRecognition: { available, install } });
  const speech = await import("../src/convo/speech");
  return { speech, available, install };
}

let privateInstances: SpeechRecognizer[] = [];
afterEach(() => {
  for (const rec of privateInstances) rec.onend?.();
  privateInstances = [];
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

async function privateBrowser() {
  vi.useFakeTimers(); vi.resetModules();
  privateInstances = [];
  class Recognition implements SpeechRecognizer {
    static available = vi.fn(async (_options: unknown): Promise<string> => "available");
    static install = vi.fn();
    static autoStart = true;
    lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
    private local = false;
    get processLocally() { return this.local; }
    set processLocally(value: boolean) { this.local = value; }
    onstart: SpeechRecognizer["onstart"] = null; onend: SpeechRecognizer["onend"] = null;
    onresult: SpeechRecognizer["onresult"] = null; onerror: SpeechRecognizer["onerror"] = null;
    onspeechstart: SpeechRecognizer["onspeechstart"] = null; onspeechend: SpeechRecognizer["onspeechend"] = null;
    start = vi.fn(() => { if (this.processLocally !== true || this.lang !== "en-US") throw new Error("nonlocal"); if (Recognition.autoStart) this.onstart?.(); });
    abort = vi.fn();
    constructor() { privateInstances.push(this); }
  }
  vi.stubGlobal("navigator", { userAgent: "Chrome/143.0", userAgentData: { brands: [{ brand: "Google Chrome" }] } });
  vi.stubGlobal("window", { SpeechRecognition: Recognition });
  const speech = await import("../src/convo/speech"), focus = await import("../src/convo/audioFocus");
  const onWords = vi.fn(), onStatus = vi.fn(), onReleased = vi.fn();
  const turn = () => speech.createPrivateSpeechTurn({ lang: "en-US", onWords, onStatus, onReleased });
  return { Recognition, speech, focus, onWords, onStatus, onReleased, turn, last: () => privateInstances.at(-1)! };
}

describe("on-device speech service", () => {
  it.each([
    ["Chrome/143.0 SamsungBrowser/30.0", "Samsung Internet"],
    ["Chrome/143.0 SamsungBrowser/30.0", "Google Chrome"],
    ["HeadlessChrome/143.0", "Google Chrome"],
    ["Chrome/143.0", "Chromium"],
  ])("avoids the native service on %s with brand %s", async (ua, brand) => {
    const { speech, available, install } = await speechOn(ua, brand);
    expect(await speech.refreshLocalState()).toBe("unsupported");
    expect(await speech.privateSpeechAvailable()).toBe(false);
    expect(await speech.installLocal()).toBe(false);
    expect(available).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
    expect(speech.speechSupported()).toBe(true);
  });

  it("allows an eligible browser to check and install its language pack", async () => {
    const { speech, available, install } = await speechOn("Chrome/143.0", "Google Chrome");
    expect(await speech.refreshLocalState()).toBe("available");
    expect(await speech.installLocal()).toBe(true);
    expect(available).toHaveBeenCalledWith({ langs: ["en-US"], processLocally: true });
    expect(install).toHaveBeenCalledWith({ langs: ["en-US"], processLocally: true });
  });
});

describe("a strict private speech turn", () => {
  it("probes only the exact installed pack and a real setter/readback, with no capture, install or start", async () => {
    const f = await privateBrowser();
    expect(await f.speech.privateSpeechAvailable("en-US")).toBe(true);
    expect(f.Recognition.available).toHaveBeenCalledExactlyOnceWith({ langs: ["en-US"], processLocally: true });
    expect(f.last().processLocally).toBe(true); expect(f.last().lang).toBe("en-US");
    expect(f.last().start).not.toHaveBeenCalled(); expect(f.last().abort).not.toHaveBeenCalled();
    expect(f.Recognition.install).not.toHaveBeenCalled(); expect(f.focus.microphoneHandoffState().captures).toBe(0);
    f.Recognition.available.mockClear();
    expect(await f.speech.privateSpeechAvailable("en")).toBe(false);
    expect(f.Recognition.available).not.toHaveBeenCalled();
  });

  it.each(["downloadable", "downloading", "unavailable", "unsupported"])("hides the action for %s instead of installing or falling back", async (state) => {
    const f = await privateBrowser(); f.Recognition.available.mockResolvedValue(state);
    expect(await f.speech.privateSpeechAvailable()).toBe(false);
    expect(await f.turn().start()).toBe(false);
    expect(privateInstances).toHaveLength(0); expect(f.Recognition.install).not.toHaveBeenCalled();
    expect(f.onReleased).toHaveBeenCalledOnce();
  });

  it.each(["missing", "data-property", "false", "throws"])("rejects an unverifiable local setting: %s", async (kind) => {
    const f = await privateBrowser();
    if (kind === "missing") delete (f.Recognition.prototype as { processLocally?: boolean }).processLocally;
    else if (kind === "data-property") Object.defineProperty(f.Recognition.prototype, "processLocally", { value: true, writable: true });
    else Object.defineProperty(f.Recognition.prototype, "processLocally", { get: () => false, set: () => { if (kind === "throws") throw new Error("refused"); } });
    expect(await f.speech.privateSpeechAvailable()).toBe(false);
    expect(await f.turn().start()).toBe(false);
    for (const rec of privateInstances) expect(rec.start).not.toHaveBeenCalled();
    expect(f.focus.microphoneHandoffState().captures).toBe(0);
    expect(f.Recognition.install).not.toHaveBeenCalled();
  });

  it("re-verifies availability after opt-in and cancels an unfinished query without starting later", async () => {
    const f = await privateBrowser();
    expect(await f.speech.privateSpeechAvailable()).toBe(true);
    f.Recognition.available.mockResolvedValueOnce("unavailable");
    expect(await f.turn().start()).toBe(false);
    expect(f.last().start).not.toHaveBeenCalled();
    let answer!: (state: string) => void;
    f.Recognition.available.mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
    const turn = f.turn(), starting = turn.start();
    turn.stop(); expect(f.onReleased).toHaveBeenCalledTimes(2);
    answer("available"); expect(await starting).toBe(false);
    for (const rec of privateInstances) expect(rec.start).not.toHaveBeenCalled();
  });

  it.each(["not-allowed", "language-not-supported", "service-not-allowed", "network", "no-speech"])("never reconnects or starts remotely after %s", async (error) => {
    const f = await privateBrowser(), turn = f.turn();
    expect(await turn.start()).toBe(true);
    const rec = f.last(); rec.onerror?.({ error });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await turn.start()).toBe(false);
    expect(privateInstances).toHaveLength(1); expect(rec.start).toHaveBeenCalledOnce();
    expect(rec.processLocally).toBe(true); expect(f.Recognition.install).not.toHaveBeenCalled();
    expect(f.onReleased).not.toHaveBeenCalled(); expect(f.focus.playbackRoute()).toBe(false);
    rec.onend?.(); expect(f.onReleased).toHaveBeenCalledOnce();
  });

  it("stops after ten quiet seconds, drops late words and refuses to treat audioend or a timer as release", async () => {
    const f = await privateBrowser(), turn = f.turn(); await turn.start();
    const rec = f.last(), late = rec.onresult!;
    rec.onresult?.({ results: [Object.assign([{ transcript: "every evening" }], { isFinal: false })] });
    expect(f.onWords).toHaveBeenCalledExactlyOnceWith(["every evening"]);
    await vi.advanceTimersByTimeAsync(9999); expect(rec.abort).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(rec.abort).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1200);
    late({ results: [Object.assign([{ transcript: "late secret" }], { isFinal: true })] });
    rec.onaudioend?.();
    expect(f.onWords).toHaveBeenCalledTimes(1); expect(f.onReleased).not.toHaveBeenCalled();
    expect(f.onStatus).toHaveBeenLastCalledWith("waiting");
    rec.onend?.(); expect(f.onReleased).toHaveBeenCalledOnce();
    expect(f.focus.microphoneHandoffState()).toMatchObject({ captures: 0, unconfirmed: 0 });
  });

  it("cancels during permission/startup and ignores a late start, while waiting for the real end", async () => {
    const f = await privateBrowser(); f.Recognition.autoStart = false;
    const turn = f.turn(); await turn.start();
    const rec = f.last(), lateStart = rec.onstart!;
    turn.stop(); lateStart();
    expect(rec.abort).toHaveBeenCalledOnce();
    expect(f.onStatus.mock.calls.filter(([status]) => status === "listening")).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1200);
    expect(f.onReleased).not.toHaveBeenCalled();
    rec.onend?.(); expect(f.onReleased).toHaveBeenCalledOnce();
  });

  it("does not let unchanged interim events reset ten quiet seconds", async () => {
    const f = await privateBrowser(), turn = f.turn(); await turn.start();
    const rec = f.last(), result = { results: [Object.assign([{ transcript: "every evening" }], { isFinal: false })] };
    rec.onresult?.(result);
    await vi.advanceTimersByTimeAsync(9000); rec.onresult?.(result);
    await vi.advanceTimersByTimeAsync(1000); expect(rec.abort).toHaveBeenCalledOnce();
    rec.onend?.();
  });

  it("stops on a revoked readback and never uses recording, storage, networking or transcript diagnostics", async () => {
    const f = await privateBrowser(), turn = f.turn();
    const fetch = vi.fn(), record = vi.fn(), store = vi.fn(), log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetch); vi.stubGlobal("MediaRecorder", record); vi.stubGlobal("localStorage", { setItem: store });
    await turn.start();
    const rec = f.last(); rec.processLocally = false;
    rec.onresult?.({ results: [Object.assign([{ transcript: "private transcript" }], { isFinal: true })] });
    expect(f.onWords).not.toHaveBeenCalled(); expect(rec.abort).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled(); expect(store).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
    rec.onend?.(); log.mockRestore();
  });
});
