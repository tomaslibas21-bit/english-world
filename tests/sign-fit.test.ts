import { expect, it, vi } from "vitest";
import { textTexture } from "../src/game/world/util";

type Options = NonNullable<Parameters<typeof textTexture>[1]>;
type Width = (size: number, text: string) => number;
type Draw = { text: string; x: number; y: number; font: string };

function recordingCanvas(measure: Width) {
  const draws: Draw[] = [];
  let measurements = 0;
  const noop = () => {};
  const ctx = {
    font: "10px sans-serif",
    beginPath: noop, moveTo: noop, arcTo: noop, closePath: noop, fill: noop, stroke: noop,
    measureText(text: string) {
      measurements++;
      return { width: measure(Number(this.font.split(" ")[1].slice(0, -2)), text) };
    },
    fillText(text: string, x: number, y: number) {
      draws.push({ text, x, y, font: this.font });
    },
  };
  return { ctx, draws, get measurements() { return measurements; } };
}

// The original row selection and size scan, run on the same metrics as the painter.
function drawReference(x: ReturnType<typeof recordingCanvas>["ctx"], text: string, opts: Options) {
  const w = opts.w ?? 512, h = opts.h ?? 128;
  const family = opts.font ?? (opts.script ? "'Georgia', serif" : "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif");
  const widest = (rows: string[]) => Math.max(...rows.map((r) => x.measureText(r).width));
  const fit = (rows: string[], size: number) => {
    x.font = `800 ${size}px ${family}`;
    while (widest(rows) > w * 0.9 && size > 10) { size -= 2; x.font = `800 ${size}px ${family}`; }
    return size;
  };
  let rows = [text], size = fit(rows, h * 0.52), wide = widest(rows);
  const words = text.split(" ").reduce<string[]>((a, word) => (a.length && /^[–-]$/.test(a[a.length - 1]) ? (a[a.length - 1] += " " + word) : a.push(word), a), []);
  for (let n = 2; n <= Math.min(opts.lines ?? 1, words.length); n++) {
    const cuts = (from: number, left: number): number[][] => left === 0 ? [[]] : Array.from({ length: words.length - from - left }, (_, i) => from + 1 + i).flatMap((k) => cuts(k, left - 1).map((r) => [k, ...r]));
    for (const cut of cuts(0, n - 1)) {
      const r = [0, ...cut].map((a, i) => words.slice(a, [...cut, words.length][i]).join(" ").replace(/^· | ·$/g, ""));
      const s = fit(r, (h * 0.84) / (n * 1.06)), wd = widest(r);
      if (s > size || (s === size && n === rows.length && wd < wide)) { size = s; rows = r; wide = wd; }
    }
  }
  x.font = `800 ${size}px ${family}`;
  rows.forEach((r, i) => x.fillText(r, w / 2, h / 2 + (i - (rows.length - 1) / 2) * size * 1.06 + size * 0.04));
}

const roundedWidth: Width = (size, text) => Math.round(Array.from(text).length * size * 0.56 / 4) * 4;

function compare(text: string, opts: Options, measure = roundedWidth) {
  const reference = recordingCanvas(measure);
  drawReference(reference.ctx, text, opts);
  const actual = recordingCanvas(measure);
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => actual.ctx }) });
  try {
    textTexture(text, opts).dispose();
  } finally {
    vi.unstubAllGlobals();
  }
  expect(actual.draws).toStrictEqual(reference.draws);
  return { actual, reference };
}

it("matches the four-line museum banner with far fewer measurements", () => {
  const { actual, reference } = compare("The Colors of the Night", { w: 256, h: 512, lines: 4 });
  expect(actual.draws).toHaveLength(4);
  expect(actual.measurements).toBeLessThan(reference.measurements / 4);
});

it("matches the Spanish museum banner and its fractional 2 px lattice", () => {
  const { actual, reference } = compare("Colores de la noche", { w: 256, h: 512, lines: 4 });
  expect(actual.draws.map((draw) => draw.text)).toEqual(["Colores", "de", "la", "noche"]);
  expect(actual.measurements).toBeLessThan(reference.measurements / 4);
});

it("matches wraps across canvas widths, including separators and dashes", () => {
  for (const w of [96, 192, 384, 512]) {
    compare("The Colors of the Night", { w, h: 512, lines: 4 });
    compare("2 for $5 · Weekly Deals", { w, h: 122, lines: 2 });
    compare("Café · Menú del día", { w, h: 122, lines: 2 });
    compare("Entry - upstairs – staff · exit", { w, h: 176, lines: 3 });
  }
  const { actual } = compare("2 for $5 · Weekly Deals", { w: 512, h: 122, lines: 2 });
  expect(actual.draws.map((draw) => draw.text)).toEqual(["2 for $5", "Weekly Deals"]);
});

it("keeps the old grid for small starts and a word that never fits", () => {
  for (const h of [18, 21, 24, 256]) {
    const { actual } = compare("Unbreakable", { w: 4, h, lines: 4 });
    const size = Number(actual.draws[0].font.split(" ")[1].slice(0, -2));
    expect(size).toBeLessThan(10);
    expect(Number.isInteger(size)).toBe(false);
  }
});

it("keeps the first cut on a width tie and accepts exactly 90% of the board", () => {
  const { actual } = compare("AA BB CC", { w: 100, h: 128, lines: 3 }, (_, text) => text.length > 5 ? 91 : 90);
  expect(actual.draws.map((draw) => draw.text)).toEqual(["AA", "BB CC"]);
});

it("scans scripted and custom faces with nonmonotonic widths", () => {
  const h = 128, start = h * 0.52;
  const width: Width = (size) => size === start - 2 ? 10 : 100;
  for (const face of [{ script: true }, { font: "'Custom Display', serif" }]) {
    const { actual } = compare("Test", { w: 100, h, ...face }, width);
    expect(actual.draws[0].font).toContain(`${start - 2}px`);
  }
});

it("falls back when search probes encounter unordered or non-finite metrics", () => {
  const h = 128, start = h * 0.52;
  for (const unexpected of [150, NaN]) {
    compare("Test", { w: 100, h }, (size) => {
      if (size === start) return 100;
      if (size === start - 2) return 10;
      return unexpected;
    });
  }
});
