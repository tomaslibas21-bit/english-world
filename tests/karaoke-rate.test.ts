import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KaraokeSession } from "../src/radio/karaokeSession";
import { BufferOutput, HtmlOutput, type RadioOutput } from "../src/radio/output";
import { Radio } from "../src/radio/radio";
import { karaokeWordAt } from "../src/radio/lyrics";
import { KaraokeSpeed } from "../src/ui/KaraokeStage";
import { KARAOKE_UI } from "../src/content/karaokeCopy";

const song = { id: "G01", t: "Home", tl: "", c: "g", n: 1, tp: "", g: "", d: 12, a: "/G01.mp3" };
const data = { L: [1, 6].map((s) => ({ s, e: s + 3, src: "Sing every night", lt: "Dainuok kasnakt", wt: ["Sing", "every", "night"],
  w: [[s, s + 1], [s + 1, s + 2], [s + 2, s + 3]], u: [["Sing", "Dainuok", 1], ["every", "kiekvieną", 1], ["night", "naktį", 1]] })) };
class Output implements RadioOutput {
  onEnded = null; onStopped = null;
  rate = 1; wall = 0; base = 0; since = 0; sounding = false; capable = true;
  position = () => this.base + (this.sounding ? (this.wall - this.since) * this.rate : 0);
  play = vi.fn(async (_url: string, at: number) => { this.base = at; this.since = this.wall; this.sounding = true; return true; });
  pause = vi.fn(() => { this.base = this.position(); this.sounding = false; });
  playbackRate = () => this.rate;
  setPlaybackRate = vi.fn((rate: number) => { this.base = this.position(); this.since = this.wall; this.rate = rate; });
  canPreservePitch = () => this.capable;
  duration = () => 12;
  unlock() {} setVolume() {}
}
async function fixture(mode: "along" | "echo" | "word" = "along", capable = true) {
  const output = new Output(); output.capable = capable;
  const session = new KaraokeSession({
    config: { index: "/index.json", files: null, recordings: null }, output, song: () => song,
    token: () => null, fetchJson: async () => data, level: () => 1, held: false, resumeDelay: 700, close() {},
  });
  await session.start("G01", mode);
  return { session, output, step(wall: number) { output.wall += wall; session.tick(wall); } };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("pitch-preserved booth speed", () => {
  it("changes speed without restarting, seeking or shifting the media clock and word timing", async () => {
    const f = await fixture("word");
    f.step(1.4);
    const plays = f.output.play.mock.calls.length, pauses = f.output.pause.mock.calls.length;
    f.session.setRate(0.8);
    expect(f.session.position()).toBeCloseTo(1.4);
    expect(f.output.play).toHaveBeenCalledTimes(plays);
    expect(f.output.pause).toHaveBeenCalledTimes(pauses);
    f.step(1);
    expect(f.session.position()).toBeCloseTo(2.2);
    expect(karaokeWordAt(f.session.store.getState().timeline!.lines[0], f.session.position())).toBe(1);
    expect(f.session.store.getState()).toMatchObject({ rate: 0.8, canSlow: true, practice: { mode: "word", completed: 0 } });
    f.session.setRate(1); f.step(0.5);
    expect(f.session.position()).toBeCloseTo(2.7);
    f.session.close();
  });

  it("lengthens future Echo gaps, leaving an already running quiet turn in wall time", async () => {
    const f = await fixture("echo");
    f.session.setRate(0.8); f.step(5);
    expect(f.session.position()).toBe(4);
    expect(f.session.store.getState().practice).toMatchObject({ remaining: 5.2, turn: { end: 4 } });
    f.session.setRate(1);
    expect(f.session.store.getState().practice?.remaining).toBe(5.2);
    f.session.tick(1);
    expect(f.session.store.getState().practice?.remaining).toBe(4.2);
    await f.session.continueTurn(); f.step(5);
    expect(f.session.store.getState().practice).toMatchObject({ remaining: 4.3, turn: { end: 9 } });
    f.session.close();
  });

  it("keeps speed through pause, replay and holds, then starts the next performance and closes at 1×", async () => {
    const f = await fixture();
    f.step(1.4); f.session.pause(); f.session.setRate(0.8);
    expect(f.session.store.getState().status).toBe("paused");
    expect(f.session.position()).toBeCloseTo(1.4);
    await f.session.replayLine();
    expect(f.session.position()).toBe(1);
    expect(f.output.rate).toBe(0.8);
    f.session.setHeld(true); const plays = f.output.play.mock.calls.length;
    f.session.setRate(1); f.session.setRate(0.8);
    expect(f.output.play).toHaveBeenCalledTimes(plays);
    expect(f.session.store.getState()).toMatchObject({ held: true, status: "paused", rate: 0.8 });
    await f.session.start("G01", "echo");
    expect(f.output.rate).toBe(1);
    expect(f.session.store.getState().rate).toBe(1);
    f.session.setRate(0.8); f.session.close();
    expect(f.output.rate).toBe(1);
  });

  it.each([1, 0.9])("returns the street's original %s rate after a slow take", async (rate) => {
    const output = new Output(); output.rate = rate;
    const radio = new Radio({
      config: { index: "/index.json", files: null, recordings: null }, output, token: () => null, volume: () => 1,
      storageKey: "karaoke-rate-test", stations: [{ id: "all", name: "Songs", lt: "", freq: 94, has: () => true }],
      fetchJson: async (url) => url === "/index.json" ? { songs: [song] } : data,
    });
    await radio.init();
    const take = radio.openKaraoke()!;
    await take.start("G01"); take.setRate(0.8); take.close(false);
    expect(output.rate).toBe(rate);
    expect(radio.store.getState()).toMatchObject({ karaoke: null, on: false, playing: false });
    radio.shutdown();
  });

  it("offers only normal speed on BufferOutput and unverified outputs, and rejects invalid rates", async () => {
    const context = vi.fn();
    expect(new BufferOutput(context).canPreservePitch()).toBe(false);
    expect(context).not.toHaveBeenCalled();
    const f = await fixture("along", false);
    for (const rate of [0.8, 0.5, NaN, Infinity]) f.session.setRate(rate);
    expect(f.output.rate).toBe(1);
    expect(f.output.setPlaybackRate).not.toHaveBeenCalledWith(0.8);
    const html = renderToStaticMarkup(createElement(KaraokeSpeed, { take: f.session.store.getState(), act() {} }));
    expect(html).toContain('disabled=""'); expect(html).not.toContain('value="0.8"');
    expect(html).toContain(KARAOKE_UI.normalOnly);
    f.session.close();
  });

  it("falls back to normal speed if the output refuses the selected rate", async () => {
    const f = await fixture();
    f.output.setPlaybackRate.mockImplementation(() => {});
    f.session.setRate(0.8);
    expect(f.session.store.getState()).toMatchObject({ rate: 1, canSlow: false, status: "playing" });
    f.session.close();
  });

  it("verifies HTML pitch preservation by readback, changes one element and leaves its position untouched", () => {
    const play = vi.fn();
    const el = { src: "/G01.mp3", currentTime: 7.1, playbackRate: 1, defaultPlaybackRate: 1, preservesPitch: false,
      addEventListener() {}, play };
    const Audio = vi.fn(function () { return el; });
    vi.stubGlobal("Audio", Audio);
    const output = new HtmlOutput();
    expect(output.canPreservePitch()).toBe(true);
    output.setPlaybackRate(0.8);
    expect(el).toMatchObject({ preservesPitch: true, playbackRate: 0.8, defaultPlaybackRate: 0.8, currentTime: 7.1 });
    expect(output.position()).toBe(7.1);
    expect(Audio).toHaveBeenCalledTimes(1); expect(play).not.toHaveBeenCalled();
    Object.defineProperty(el, "preservesPitch", { get: () => false, set() {} });
    expect(output.canPreservePitch()).toBe(false);
  });

  it("renders the native controller-adjustable speed selector with Lithuanian decimal formatting", async () => {
    const f = await fixture(); f.session.setRate(0.8);
    const html = renderToStaticMarkup(createElement(KaraokeSpeed, { take: f.session.store.getState(), act() {} }));
    expect(html).toContain('aria-label="Greitis"'); expect(html).toContain('data-pad-adjust="true"');
    expect(html).toContain('value="0.8" selected=""'); expect(html).toContain("0,8×");
    expect(html).not.toContain(KARAOKE_UI.normalOnly);
    f.session.close();
  });
});
