import { describe, expect, it } from "vitest";
import { stretchSpeech } from "../src/game/timeStretch";

const RATE = .82;
function tone(hz: number, seconds: number, sr: number, amp = .7) {
  return Float32Array.from({ length: Math.round(seconds * sr) }, (_, i) => amp * Math.sin(2 * Math.PI * hz * i / sr));
}
function peak(x: Float32Array) { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p; }
function rms(x: Float32Array, a = 0, b = x.length) { let e = 0; for (let i = a; i < b; i++) e += x[i] ** 2; return Math.sqrt(e / (b - a)); }
function frequency(x: Float32Array, sr: number, from = .2, to = .8) {
  const a = Math.floor(x.length * from), b = Math.floor(x.length * to), crossings: number[] = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] <= 0 && x[i] > 0) crossings.push(i - x[i] / (x[i] - x[i - 1]));
  return sr * (crossings.length - 1) / (crossings.at(-1)! - crossings[0]);
}
function blocks(x: Float32Array, sr: number, threshold: number) {
  const step = Math.round(sr * .01), active: number[] = [];
  for (let i = 0; i + step <= x.length; i += step) if (rms(x, i, i + step) > threshold) active.push(i / sr);
  return active;
}

describe("offline speech slowdown", () => {
  it.each([8000, 16000, 24000, 44100, 48000, 96000])("preserves a 220Hz fundamental and level at %iHz", sr => {
    const input = tone(220, 1, sr), copy = input.slice(), [slow] = stretchSpeech([input], sr);
    expect(slow.length).toBe(Math.round(input.length / RATE));
    // A playbackRate-only slowdown would give 180.4Hz and fails this check.
    expect(frequency(slow, sr)).toBeCloseTo(220, 0);
    expect(rms(slow) / rms(input)).toBeGreaterThan(.94);
    expect(rms(slow) / rms(input)).toBeLessThan(1.03);
    expect(peak(slow)).toBeLessThanOrEqual(peak(input));
    expect(input).toEqual(copy);
  });

  it.each([95, 140, 310, 650])("preserves the %iHz voice range and its harmonics", hz => {
    const sr = 24000;
    const input = Float32Array.from({ length: sr }, (_, i) => .5 * Math.sin(2 * Math.PI * hz * i / sr) + .16 * Math.sin(4 * Math.PI * hz * i / sr));
    const [slow] = stretchSpeech([input], sr);
    expect(Math.abs(frequency(slow, sr) - hz)).toBeLessThan(1.5);
    expect(rms(slow) / rms(input)).toBeGreaterThan(.9);
  });

  it("keeps opposite-phase stereo and silent-channel alignment", () => {
    const left = tone(173, .8, 48000), right = Float32Array.from(left, v => -v * .6);
    const [a, b] = stretchSpeech([left, right], 48000);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(Math.abs(b[i] + a[i] * .6)).toBeLessThan(2e-7);
    const [silent, voiced] = stretchSpeech([new Float32Array(left.length), left], 48000);
    expect(peak(silent)).toBe(0);
    expect(Math.abs(frequency(voiced, 48000) - 173)).toBeLessThan(1);
  });

  it("preserves silence without noise or nonfinite samples", () => {
    const [slow] = stretchSpeech([new Float32Array(24000)], 24000);
    expect(peak(slow)).toBe(0);
    expect(slow.every(Number.isFinite)).toBe(true);
    expect(stretchSpeech([], 24000)).toEqual([]);
    expect(stretchSpeech([new Float32Array()], 24000)[0].length).toBe(0);
  });

  it("retains quiet initial/final consonant-like bursts and an internal pause", () => {
    const sr = 24000, input = new Float32Array(sr * 2);
    // Deterministic broadband bursts around voiced speech, with a clear mid-sentence pause.
    let seed = 39;
    for (let i = 0; i < input.length; i++) {
      const t = i / sr;
      if ((t >= .04 && t < .11) || (t >= 1.87 && t < 1.96)) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; input[i] = (seed / 2147483648) * .09; }
      if ((t >= .12 && t < .75) || (t >= 1.2 && t < 1.86)) input[i] = .5 * Math.sin(2 * Math.PI * 190 * t);
    }
    const [slow] = stretchSpeech([input], sr), active = blocks(slow, sr, .02);
    expect(active[0]).toBeLessThan(.09);
    expect(active.at(-1)).toBeGreaterThan(1.96 / RATE - .07);
    expect(rms(slow, Math.round(.9 / RATE * sr), Math.round(1.1 / RATE * sr))).toBe(0);
    expect(peak(slow)).toBeLessThanOrEqual(peak(input));
    expect(slow[0]).toBe(input[0]);
    expect(slow.at(-1)).toBe(input.at(-1));
  });

  it("does not duplicate an isolated transient into separate audible bursts", () => {
    const sr = 24000, input = new Float32Array(sr);
    input.set(tone(1900, .02, sr), Math.round(.5 * sr));
    const [slow] = stretchSpeech([input], sr), active = blocks(slow, sr, .05);
    expect(active.length).toBeGreaterThan(0);
    expect(active.at(-1)! - active[0]).toBeLessThan(.08);
    expect(active[0]).toBeGreaterThan(.5 / RATE - .05);
    expect(active.at(-1)).toBeLessThan(.52 / RATE + .05);
  });

  it("preserves all samples of a sub-window burst instead of pitching it down", () => {
    const input = Float32Array.from([.1, -.7, .2, .8, -.2]);
    const [slow] = stretchSpeech([input], 24000);
    expect(slow.length).toBe(Math.round(input.length / RATE));
    const start = Math.floor((slow.length - input.length) / 2);
    expect(slow.slice(start, start + input.length)).toEqual(input);
    expect(peak(slow)).toBe(peak(input));
  });

  it("returns an independent unchanged copy at normal speed", () => {
    const input = tone(220, .1, 24000), [copy] = stretchSpeech([input], 24000, 1);
    expect(copy).toEqual(input);
    expect(copy).not.toBe(input);
  });

  it.each([.5, .82, .95])("keeps duration and pitch finite at supported rate %f", rate => {
    const input = tone(220, .4, 16000), [slow] = stretchSpeech([input], 16000, rate);
    expect(slow.length).toBe(Math.round(input.length / rate));
    expect(slow.every(Number.isFinite)).toBe(true);
    expect(Math.abs(frequency(slow, 16000) - 220)).toBeLessThan(2);
  });

  it("rejects invalid geometry or unbounded work before output allocation", () => {
    const x = new Float32Array(10);
    for (const rate of [0, NaN, Infinity, .49, 1.1]) expect(() => stretchSpeech([x], 24000, rate)).toThrow(RangeError);
    for (const sr of [0, NaN, 1000, 100000]) expect(() => stretchSpeech([x], sr)).toThrow(RangeError);
    expect(() => stretchSpeech([x, new Float32Array(11)], 24000)).toThrow(RangeError);
    expect(() => stretchSpeech([x, x, x], 24000)).toThrow(RangeError);
    expect(() => stretchSpeech([Float32Array.of(NaN)], 24000)).toThrow(RangeError);
    expect(() => stretchSpeech([Float32Array.of(Infinity)], 24000)).toThrow(RangeError);
    expect(() => stretchSpeech([new Float32Array(4_000_001)], 24000, .5)).toThrow(RangeError);
    expect(() => stretchSpeech([new Float32Array(8000 * 61)], 8000)).toThrow(RangeError);
  });

  it("processes a realistic 12-second stereo clip with bounded output storage and time", () => {
    const input = tone(173, 12, 48000), started = performance.now();
    const output = stretchSpeech([input, input], 48000);
    const elapsed = performance.now() - started;
    expect(output[0].length).toBe(Math.round(input.length / RATE));
    expect(output.reduce((n, c) => n + c.byteLength, 0)).toBe(Math.round(input.length / RATE) * 8);
    expect(elapsed).toBeLessThan(2500); // generous regression budget; this is not a phone benchmark
  });
});
