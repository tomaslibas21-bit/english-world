import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SpeechRecognizer } from "../src/convo/speech";
import type { RadioOutput } from "../src/radio/output";
import { heardWordMatches } from "../src/game/karaoke/practice";
import { KaraokeMic, KaraokeLyricLine } from "../src/ui/KaraokeStage";
import { EDITION } from "../src/edition";
import { KARAOKE_UI } from "../src/content/karaokeCopy";

const row = (s: number) => EDITION.id === "es" ? ({
  s, e: s + 3, src: "Mañana, sí, mañana, sí.", lt: EDITION.helper === "lt" ? "Rytoj, taip, rytoj, taip." : "Tomorrow, yes, tomorrow, yes.",
  wt: ["Mañana,", "sí,", "mañana,", "sí."], w: [[s, s + 0.5], [s + 0.5, s + 1.5], [s + 1.5, s + 2], [s + 2, s + 3]],
  u: [["Mañana,", EDITION.helper === "lt" ? "Rytoj," : "Tomorrow,", 1], ["sí,", EDITION.helper === "lt" ? "taip," : "yes,", 1],
    ["mañana,", EDITION.helper === "lt" ? "rytoj," : "tomorrow,", 1], ["sí.", EDITION.helper === "lt" ? "taip." : "yes.", 1]],
}) : ({ s, e: s + 3, src: "Every evening, every evening,", lt: "Kiekvieną vakarą, kiekvieną vakarą,",
  wt: ["Every", "evening,", "every", "evening,"], w: [[s, s + 0.5], [s + 0.5, s + 1.5], [s + 1.5, s + 2], [s + 2, s + 3]],
  u: [["Every", "Kiekvieną", 1], ["evening,", "vakarą,", 1], ["every", "kiekvieną", 1], ["evening,", "vakarą,", 1]] });
const transcript = EDITION.id === "es" ? "mañana sí mañana sí" : "every evening every evening";
const partial = EDITION.id === "es" ? "mañana sí" : "every evening";
let instances: SpeechRecognizer[] = [], cleanups: (() => void)[] = [];
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
afterEach(async () => {
  for (const cleanup of cleanups) cleanup();
  for (const rec of instances) rec.onend?.();
  await flush();
  instances = []; cleanups = [];
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

async function fixture({ available = "available", street = false, bilingual = false } = {}) {
  vi.resetModules(); vi.useFakeTimers();
  let quiet = false, at = 0, sounding = false;
  class Recognition implements SpeechRecognizer {
    static available = vi.fn(async () => available);
    static install = vi.fn();
    lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
    private local = false;
    get processLocally() { return this.local; }
    set processLocally(value: boolean) { this.local = value; }
    onstart: SpeechRecognizer["onstart"] = null; onend: SpeechRecognizer["onend"] = null;
    onresult: SpeechRecognizer["onresult"] = null; onerror: SpeechRecognizer["onerror"] = null;
    onspeechstart: SpeechRecognizer["onspeechstart"] = null; onspeechend: SpeechRecognizer["onspeechend"] = null;
    start = vi.fn(() => { expect(quiet).toBe(true); expect(sounding).toBe(false); expect(this.processLocally).toBe(true); expect(this.lang).toBe(EDITION.target); this.onstart?.(); });
    abort = vi.fn();
    constructor() { instances.push(this); }
  }
  const win = Object.assign(new EventTarget(), { SpeechRecognition: Recognition });
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const saved = vi.fn();
  vi.stubGlobal("window", win); vi.stubGlobal("document", doc);
  vi.stubGlobal("navigator", { userAgent: "Chrome/143.0", userAgentData: { brands: [{ brand: "Google Chrome" }] } });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: saved });
  const { Radio } = await import("../src/radio/radio");
  const { KaraokeMicrophone } = await import("../src/game/karaoke/microphone");
  const focus = await import("../src/convo/audioFocus");
  const output: RadioOutput = {
    play: vi.fn(async (_url, seconds) => { at = seconds; sounding = true; return true; }),
    pause: vi.fn(() => { sounding = false; }), position: () => at, duration: () => 12,
    unlock() {}, setVolume() {}, onEnded: null, onStopped: null,
  };
  const radio = new Radio({
    config: { index: "/index.json", files: null, recordings: null }, output, token: () => null, volume: () => 1,
    storageKey: "karaoke-mic-test", stations: [{ id: "all", name: "Songs", lt: "", freq: 94, has: () => true }],
    fetchJson: async (url) => url === "/index.json" ? { songs: [{ id: "G01", t: "Home", c: "g", n: 1, a: "/G01.mp3", d: 12 }] } : { L: [row(1), row(6)].map((line) => bilingual ? {
      ...line, en: { s: line.s - 0.8, e: line.s - 0.1 }, lt: "The helper voice",
    } : line) },
  });
  await radio.init();
  if (street) { radio.setOn(true); await flush(); }
  const take = radio.openKaraoke()!;
  const silence = vi.fn(() => { quiet = true; return () => { quiet = false; }; });
  const mic = new KaraokeMicrophone(take, {
    silence,
    hold: () => { radio.hold("karaoke-private-1", true); return () => radio.release("karaoke-private-1"); },
  });
  cleanups.push(() => { mic.dispose(); take.close(false); radio.shutdown(); });
  await take.start("G01", "echo"); at = 4; take.tick(); await flush();
  const start = async () => { mic.start(); await flush(); return instances.find((rec) => vi.mocked(rec.start).mock.calls.length > 0)!; };
  return { mic, take, radio, output, Recognition, win, doc, saved, focus, silence, start,
    quiet: () => quiet, sounding: () => sounding,
    step: async (seconds: number) => { at = seconds; take.tick(); await flush(); },
    next: async () => { await take.continueTurn(); at = 9; take.tick(); await flush(); } };
}

describe("the optional private Echo microphone", () => {
  it("matches one alternative in word order, preserves repeats and keeps ñ distinct", () => {
    expect(heardWordMatches(["Every", "evening", "every", "evening"], ["every evening"])).toEqual([0, 1]);
    expect(heardWordMatches(["Every", "evening", "every", "evening"], ["evening every evening"])).toEqual([1, 2, 3]);
    expect(heardWordMatches(["one", "two"], ["one", "two"])).toEqual([0]); // no union of contradictory alternatives
    expect(heardWordMatches(["¡Mañana!", "año", "niño"], ["mañana ano nino"])).toEqual([0]);
    expect(heardWordMatches(["don't", "twenty-one"], ["don’t twenty one"])).toEqual([0, 1]);
  });

  it("uses the exact installed target pack with the learner's labels", async () => {
    const f = await fixture();
    expect(f.Recognition.available).toHaveBeenCalledExactlyOnceWith({ langs: [EDITION.target], processLocally: true });
    const optin = renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }));
    expect(optin).toContain(EDITION.helper === "lt" ? "Naudoti mikrofoną šiai eilutei" : "Use microphone for this line");
    const rec = await f.start();
    expect(rec.lang).toBe(EDITION.target);
    expect(f.Recognition.available).toHaveBeenCalledTimes(2);
    const listening = renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }));
    expect(listening).toContain(EDITION.helper === "lt" ? "Klausau…" : "Listening on this device…");
    expect(listening).toContain(EDITION.helper === "lt" ? "Išjungti mikrofoną" : "Stop listening");
    expect(f.Recognition.install).not.toHaveBeenCalled();
  });

  it.skipIf(EDITION.id !== "es")("normalizes composed Spanish accents while keeping ñ and accented vowels distinct", () => {
    expect(heardWordMatches(["¡MAÑANA!", "sí,", "canción", "año"], ["mañana sí canción año"])).toEqual([0, 1, 2, 3]);
    expect(heardWordMatches(["mañana", "sí", "canción", "año"], ["manana si cancion ano"])).toEqual([]);
  });

  it.skipIf(EDITION.id !== "es")("lights only Spanish target words after a bilingual helper and clears matches for the next turn", async () => {
    const f = await fixture({ bilingual: true }), rec = await f.start();
    rec.onresult?.({ results: [Object.assign([{ transcript: "The helper voice" }], { isFinal: true })] });
    expect(f.take.store.getState().microphone?.matches).toEqual([]);
    rec.onresult?.({ results: [Object.assign([{ transcript }], { isFinal: true })] });
    const take = f.take.store.getState();
    expect(take.microphone?.matches).toEqual([0, 1, 2, 3].map((word) => ({ row: 1, word })));
    const line = take.timeline!.lines[1];
    const html = renderToStaticMarkup(createElement(KaraokeLyricLine, { line, word: -1, meaning: true, heard: [0, 1, 2, 3] }));
    expect(html).toContain('lang="es-MX"');
    expect(html).toContain('lang="' + EDITION.helper + '"');
    expect(html).toContain("Mañana,");
    expect(html).toContain("sí.");
    expect(html.match(/karaoke-word heard/g)).toHaveLength(4);
    expect(take.practice?.completed).toBe(1);
    rec.onend?.(); await flush();
    await f.next();
    expect(f.take.store.getState().microphone?.matches).toEqual([]);
  });

  it("hides an unverifiable action and leaves Echo fully usable without the mic", async () => {
    const f = await fixture({ available: "downloadable" });
    expect(renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }))).toBe("");
    f.mic.start(); await flush();
    expect(f.Recognition.install).not.toHaveBeenCalled(); expect(f.silence).not.toHaveBeenCalled();
    await f.take.continueTurn(); expect(f.sounding()).toBe(true);
  });

  it("freezes a focused opt-in, requests once, lights matches warmly, and keeps transcripts out of state and saves", async () => {
    const f = await fixture();
    const optin = renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }));
    expect(optin).toContain(KARAOKE_UI.microphone); expect(optin).toContain(KARAOKE_UI.privacy);
    f.take.focusMicrophone(true); const remaining = f.take.store.getState().practice?.remaining;
    f.take.tick(8); expect(f.take.store.getState().practice?.remaining).toBe(remaining);
    f.take.focusMicrophone(false);
    const rec = await f.start();
    rec.onresult?.({ results: [Object.assign([{ transcript: "private filler " + transcript }], { isFinal: true })] });
    expect(f.take.store.getState().microphone?.matches).toHaveLength(4);
    expect(f.take.store.getState().practice?.completed).toBe(1);
    const html = renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }));
    expect(html).toContain(KARAOKE_UI.heard); expect(html).toContain(KARAOKE_UI.stopMicrophone);
    expect(html).not.toMatch(/score|grade|percent|private filler/i);
    const lyric = f.take.store.getState().timeline!.lines[0];
    expect(renderToStaticMarkup(createElement(KaraokeLyricLine, { line: lyric, meaning: false, word: -1, heard: [0, 1, 2, 3] })).match(/karaoke-word heard/g)).toHaveLength(4);
    expect(JSON.stringify(f.take.store.getState())).not.toContain("private filler");
    expect(JSON.stringify(f.saved.mock.calls)).not.toContain("private filler");
    f.mic.start(); expect(rec.start).toHaveBeenCalledOnce();
    f.take.resume(); f.take.tick(30); await f.take.continueTurn();
    expect(f.sounding()).toBe(false); expect(f.take.store.getState().practice?.turn).not.toBeNull();
    rec.onend?.(); await flush();
    expect(f.quiet()).toBe(false); expect(f.take.store.getState().status).toBe("paused");
    expect(f.take.store.getState().turnPaused).toBe(true);
    expect(f.take.store.getState().microphone?.matches).toHaveLength(4);
    await f.take.replayLine(); await f.step(4);
    expect(f.take.store.getState().microphone).toMatchObject({ used: true, available: false, matches: [] });
    f.mic.start(); expect(rec.start).toHaveBeenCalledOnce();
    await f.next();
    expect(f.take.store.getState().microphone).toMatchObject({ available: true, used: false, matches: [] });
    expect(f.Recognition.install).not.toHaveBeenCalled();
  });

  it.each(["blur", "pagehide", "popstate", "hashchange", "visibilitychange"])("cancels and clears on %s, releasing only after onend", async (event) => {
    const f = await fixture(), rec = await f.start(), late = rec.onresult!;
    rec.onresult?.({ results: [Object.assign([{ transcript: partial }], { isFinal: true })] });
    if (event === "visibilitychange") { f.doc.hidden = true; f.doc.dispatchEvent(new Event(event)); }
    else f.win.dispatchEvent(new Event(event));
    expect(rec.abort).toHaveBeenCalledOnce(); expect(f.take.store.getState().microphone?.matches).toEqual([]);
    late({ results: [Object.assign([{ transcript }], { isFinal: true })] });
    expect(f.take.store.getState().microphone?.matches).toEqual([]);
    await vi.advanceTimersByTimeAsync(1200);
    expect(f.quiet()).toBe(true); expect(f.take.store.getState().microphone?.phase).toBe("waiting");
    rec.onend?.(); await flush();
    expect(f.quiet()).toBe(false); expect(f.sounding()).toBe(false);
  });

  it("keeps the street and further sounds blocked after leaving with a missing end, then restores once on real release", async () => {
    const f = await fixture({ street: true }), rec = await f.start();
    await vi.advanceTimersByTimeAsync(11_200);
    expect(f.take.store.getState().microphone?.phase).toBe("waiting");
    f.mic.dispose(); f.take.close();
    const calls = vi.mocked(f.output.play).mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.quiet()).toBe(true); expect(f.sounding()).toBe(false);
    expect(f.output.play).toHaveBeenCalledTimes(calls);
    rec.onend?.(); await flush();
    expect(f.quiet()).toBe(false);
    await vi.advanceTimersByTimeAsync(700);
    expect(f.sounding()).toBe(true); expect(f.output.play).toHaveBeenCalledTimes(calls + 1);
    rec.onend?.(); await flush(); expect(f.output.play).toHaveBeenCalledTimes(calls + 1);
  });

  it("returns denial to a held lyric with Continue, with no retry or automatic next-line capture", async () => {
    const f = await fixture(), rec = await f.start();
    rec.onerror?.({ error: "not-allowed" }); rec.onend?.(); await flush();
    expect(f.take.store.getState().microphone).toMatchObject({ available: false, used: true, phase: "unavailable", matches: [] });
    expect(renderToStaticMarkup(createElement(KaraokeMic, { take: f.take.store.getState(), act() {} }))).toContain(KARAOKE_UI.microphoneOff);
    expect(f.take.store.getState().practice?.turn).not.toBeNull(); expect(f.sounding()).toBe(false);
    await f.next();
    expect(instances.filter((item) => vi.mocked(item.start).mock.calls.length > 0)).toHaveLength(1);
    expect(f.take.store.getState().microphone?.available).toBe(true);
  });

  it("cuts both audio buses immediately, cancels voice, blocks new effects/voice, and restores overlapping silence leases once", async () => {
    vi.resetModules();
    const { AudioSystem } = await import("../src/game/audio");
    const sys = new AudioSystem();
    const gain = () => ({ value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
    const world = gain(), effects = gain(), finish = vi.fn();
    Object.assign(sys, { busCtx: { currentTime: 7, state: "running" }, worldBus: { gain: world }, fxBus: { gain: effects }, request: { finish }, bedNow: { id: "cafe", parts: [], music: true } });
    const first = sys.silenceForPrivateCapture(), second = sys.silenceForPrivateCapture();
    expect(finish).toHaveBeenCalledWith(false);
    expect(world.setValueAtTime).toHaveBeenCalledWith(0, 7); expect(effects.setValueAtTime).toHaveBeenCalledWith(0, 7);
    expect(sys.playingBed).toBe("cafe");
    const media = vi.spyOn(sys as never, "media" as never);
    expect(await sys.play("mia", 1, "Hello")).toBe(false);
    expect(sys.playFile("/hello.mp3").status).toBe("unavailable");
    expect(media).not.toHaveBeenCalled();
    sys.sfx("crowdCheer"); expect(sys.sample("crowdCheer")).toBe(false);
    sys.sounds = 0.4;
    expect(effects.setTargetAtTime).toHaveBeenLastCalledWith(0, 7, expect.any(Number));
    first(); first(); expect(effects.setTargetAtTime).toHaveBeenLastCalledWith(0, 7, expect.any(Number));
    second(); expect(effects.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 7, expect.any(Number));
  });
});
