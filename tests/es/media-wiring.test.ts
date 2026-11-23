// Batch 1–4 media (23 Nov 2026): the recorded effects stand in for the synthesized ones once loaded (and the synth
// stays the stand-in), every listed file is there, and a mini-game's bed starts, steps back under a voice, holds the
// radio while its music plays, and stops.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "../../src/game/audio";
import { BED_DUCK, MODE_SAMPLES, SAMPLES, isSample, type Bed } from "../../src/game/soundscape";
import { TOWN_SOUNDS } from "../../src/game/townSounds";
import { LOTERIA_DECK } from "../../src/editions/es/content/loteria";

const PUBLIC = join(import.meta.dirname, "../../public");

class Param {
  value = 0; targets: number[] = [];
  setTargetAtTime(v: number) { this.targets.push(v); this.value = v; }
  cancelScheduledValues() {}
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
}
class Node { connect<T>(n: T) { return n; } disconnect() {} }
class Gain extends Node { gain = new Param(); }
class Source extends Node {
  buffer: { duration: number } | null = null; loop = false; loopStart = 0; loopEnd = 0; playbackRate = new Param();
  started: number[] | null = null; stopped = false; onended: (() => void) | null = null;
  start(...a: number[]) { this.started = a; }
  stop() { this.stopped = true; }
}
class Osc extends Node { type = "sine"; frequency = new Param(); start() {} stop() {} }
class Ctx {
  state = "running"; currentTime = 0; destination = new Node(); sources: Source[] = []; oscillators = 0;
  createGain() { return new Gain(); }
  createBufferSource() { const s = new Source(); this.sources.push(s); return s; }
  createOscillator() { this.oscillators++; return new Osc(); }
  createBiquadFilter() { return Object.assign(new Node(), { type: "", frequency: new Param(), Q: new Param() }); }
  resume() { return Promise.resolve(); }
  addEventListener() {}
  decodeAudioData(_b: ArrayBuffer, ok?: (b: { duration: number }) => void) { const b = { duration: 40 }; ok?.(b); return Promise.resolve(b); }
}

let ctx: Ctx, fetched: string[];
beforeEach(() => {
  ctx = new Ctx(); fetched = [];
  vi.stubGlobal("window", { AudioContext: function () { return ctx; } });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("localStorage", { getItem: () => null });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => { fetched.push(url); return new Response(new ArrayBuffer(8)); }));
});
afterEach(() => vi.unstubAllGlobals());
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("recorded effects", () => {
  it("lists only files that are in public/sfx, small enough to fetch on the spot", () => {
    for (const [name, def] of Object.entries(SAMPLES)) for (const f of def.files) {
      const p = join(PUBLIC, "sfx", f);
      expect(existsSync(p), `${name}: ${f}`).toBe(true);
      expect(statSync(p).size, f).toBeLessThan(60_000);
    }
    for (const [mode, names] of Object.entries(MODE_SAMPLES)) for (const n of names) expect(isSample(n), `${mode}: ${n}`).toBe(true);
  });
  it("plays the synthesized stand-in until the takes are loaded, then a take", async () => {
    const a = new AudioSystem();
    a.sfx("pairChime");                          // nothing loaded yet: the synthesized "success"
    expect(ctx.oscillators).toBeGreaterThan(0);
    expect(fetched.some((u) => u.endsWith("sfx/pair-chime.mp3"))).toBe(true);
    await settle();
    const oscillators = ctx.oscillators, sources = ctx.sources.length;
    a.sfx("pairChime");
    expect(ctx.oscillators).toBe(oscillators);    // no synth now
    expect(ctx.sources.length).toBe(sources + 1);
    expect(ctx.sources.at(-1)!.started).not.toBeNull();
  });
  it("keeps silent (no stand-in) for a recorded-only effect until it is loaded", () => {
    const a = new AudioSystem();
    a.sfx("gull");
    expect(ctx.oscillators).toBe(0);
    expect(a.sample("gull")).toBe(false);
  });
  it("loads a mode's takes ahead (preload)", () => {
    const a = new AudioSystem();
    a.context(); // the game makes the context on the first gesture
    a.preload(MODE_SAMPLES.billiards);
    expect(fetched.filter((u) => u.includes("/sfx/pool-clack-")).length).toBe(SAMPLES.poolClick.files.length);
  });
});

describe("mini-game beds", () => {
  const beds = (TOWN_SOUNDS as { beds?: Record<string, Bed> }).beds ?? {};
  it("has a room file in public/sfx for each bed, loop points inside it", () => {
    expect(Object.keys(beds)).toEqual(expect.arrayContaining(["loteria", "billiards", "sea"]));
    for (const [id, bed] of Object.entries(beds)) {
      if (bed.room) expect(existsSync(join(PUBLIC, "sfx", bed.room.file)), `${id} room`).toBe(true);
      for (const loop of [bed.room, bed.music]) if (loop) expect(loop.end - loop.start, id).toBeGreaterThan(8);
      // music lives in the clip folder (R2 in the courses), never in git
      if (bed.music) expect(existsSync(join(PUBLIC, "sfx", bed.music.file + ".mp3")), `${id} music`).toBe(false);
    }
  });
  it("starts, steps back under a voice, holds the radio for its music, and stops", async () => {
    const [id, bed] = Object.entries(beds).find(([, b]) => b.room && b.music)!;
    const a = new AudioSystem();
    const music: boolean[] = [];
    a.subscribeBed((on) => music.push(on));
    a.bed(id);
    await settle(); await settle();
    expect(a.playingBed).toBe(id);
    expect(fetched.some((u) => u.endsWith(`sfx/${bed.room!.file}`))).toBe(true);
    expect(fetched.some((u) => u.includes(`${bed.music!.file}.mp3`))).toBe(true);
    const parts = ctx.sources.filter((s) => s.loop);
    expect(parts).toHaveLength(2);
    expect(parts.every((s) => s.loopEnd > s.loopStart && s.started)).toBe(true);
    expect(music).toEqual([true]);
    const before = ctx.sources.length;
    a.hush("voice", true);
    a.hush("voice", false);
    expect(ctx.sources.length).toBe(before); // ducked, never restarted
    a.bed(null);
    expect(a.playingBed).toBeNull();
    expect(parts.every((s) => s.stopped)).toBe(true);
    expect(music).toEqual([true, false]);
    expect(BED_DUCK).toBeLessThan(1);
  });
  it("plays nothing for a mode without a bed", () => {
    const a = new AudioSystem();
    a.bed("no-such-mode");
    expect(a.playingBed).toBeNull();
    expect(fetched).toHaveLength(0);
  });
});

describe("card pictures", () => {
  it("has a Lotería picture for every card and the back, small WebPs", () => {
    const ids = LOTERIA_DECK.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [...ids, "back"]) {
      const p = join(PUBLIC, "loteria", `${id}.webp`);
      expect(existsSync(p), id).toBe(true);
      expect(statSync(p).size, id).toBeLessThan(60_000);
    }
  });
});
