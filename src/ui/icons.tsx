// English World icon set: hand-drawn 24×24 line icons (1.75 stroke, round caps and joins,
// currentColor) with optional soft fills. They replace the emojis the UI used to show, and
// `iconForEmoji` maps the emojis that still come from content and game data (place icons,
// items people hand you, toast and banner titles) to these icons at render time.
import type { CSSProperties, ReactNode } from "react";

// ---------------------------------------------------------------------------------------------
// geometry helpers

const n = (v: number) => String(Math.round(v * 1000) / 1000);
/** A circle as a path. */
const c = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
/** A rounded rectangle as a path. */
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}` +
  `h${n(-(w - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
/** A round dot (a zero-length stroke with round caps). */
const dot = (x: number, y: number) => `M${n(x)} ${n(y)}h.01`;
/** A 5-point star. */
const star = (cx: number, cy: number, R: number, r: number) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180, rad = i % 2 ? r : R;
    d += (i ? "L" : "M") + n(cx + rad * Math.cos(a)) + " " + n(cy + rad * Math.sin(a));
  }
  return d + "Z";
};

const GEAR = "M10.1 5.16L10.29 2.76A9.4 9.4 0 0 1 13.71 2.76L13.9 5.16A7.1 7.1 0 0 1 15.5 5.82L17.32 4.25A9.4 9.4 0 0 1 19.75 6.68L18.18 8.5A7.1 7.1 0 0 1 18.84 10.1L21.24 10.29A9.4 9.4 0 0 1 21.24 13.71L18.84 13.9A7.1 7.1 0 0 1 18.18 15.5L19.75 17.32A9.4 9.4 0 0 1 17.32 19.75L15.5 18.18A7.1 7.1 0 0 1 13.9 18.84L13.71 21.24A9.4 9.4 0 0 1 10.29 21.24L10.1 18.84A7.1 7.1 0 0 1 8.5 18.18L6.68 19.75A9.4 9.4 0 0 1 4.25 17.32L5.82 15.5A7.1 7.1 0 0 1 5.16 13.9L2.76 13.71A9.4 9.4 0 0 1 2.76 10.29L5.16 10.1A7.1 7.1 0 0 1 5.82 8.5L4.25 6.68A9.4 9.4 0 0 1 6.68 4.25L8.5 5.82A7.1 7.1 0 0 1 10.1 5.16Z";
const PENCIL = "M18.1 3.9a1.9 1.9 0 0 1 2.7 2.7l-7.3 7.3-3.6.9.9-3.6z";
const carBody = (y: number) =>
  `M4.25 ${n(y + 9.75)}v-3.5c0-.6.2-1.2.5-1.7l1.9-3.4A2 2 0 0 1 8.4 ${n(y)}h7.2a2 2 0 0 1 1.75 1.15l1.9 3.4c.3.5.5 1.1.5 1.7v3.5z`;
const carParts = (y: number) => [
  { d: carBody(y), k: "soft" as const },
  `M5.25 ${n(y + 4.5)}h13.5`,
  `M6.25 ${n(y + 9.75)}v1.75c0 .4.35.75.75.75h1.5c.4 0 .75-.35.75-.75v-1.75`,
  `M14.75 ${n(y + 9.75)}v1.75c0 .4.35.75.75.75h1.5c.4 0 .75-.35.75-.75v-1.75`,
  dot(7.75, y + 7.25), dot(16.25, y + 7.25),
];

// ---------------------------------------------------------------------------------------------
// the icons

/** A plain string is a stroked path; `soft` adds a light fill, `solid` a full fill (both keep the
 *  stroke), `tint` / `fill` are fills without a stroke. */
type Part = string | { d: string; k: "soft" | "solid" | "tint" | "fill" };
type Def = Part[] | { rot: number; parts: Part[] };

const ICONS = {
  // ---- talking
  mic: [{ d: rr(9, 2.75, 6, 11.5, 3), k: "soft" }, "M5.5 11.25a6.5 6.5 0 0 0 13 0", "M12 17.75v3.5", "M8.75 21.25h6.5"],
  stop: [{ d: rr(6.5, 6.5, 11, 11, 2.5), k: "solid" }],
  keyboard: [{ d: rr(2.5, 5.5, 19, 13, 2.75), k: "soft" }, dot(6.5, 9.5), dot(9.25, 9.5), dot(12, 9.5), dot(14.75, 9.5), dot(17.5, 9.5),
    dot(7.875, 12.25), dot(16.125, 12.25), "M10.5 12.25h3", "M8.25 15.25h7.5"],
  speaker: [{ d: "M5 9.5h3.25L13 5.25v13.5L8.25 14.5H5z", k: "soft" }, "M16 9a4.25 4.25 0 0 1 0 6", "M18.66 6.34a8 8 0 0 1 0 11.32"],
  turtle: [{ d: "M3 15a7.5 7.5 0 0 1 15 0z", k: "soft" }, "M6 15l-.75 2.75", "M15 15l.75 2.75", "M3 15l-1.25 1",
    { d: "M17.25 12.5c.6-1.5 1.6-2.25 2.75-2.25a1.75 1.75 0 0 1 0 3.5h-2.25", k: "soft" }],
  bulb: [{ d: "M9.25 17.75v-1c0-1.2-.5-2-1.3-2.9A6 6 0 1 1 16.05 13.85c-.8.9-1.3 1.7-1.3 2.9v1z", k: "soft" }, "M10 20.75h4"],
  next: [{ d: c(12, 12, 9.25), k: "soft" }, "M7.75 12h8.5", "M12.75 8.5 16.25 12l-3.5 3.5"],
  restart: ["M12 5.25A7.5 7.5 0 1 1 4.76 10.81", "M14.25 3 12 5.25l2.25 2.25"],
  list: ["M4.5 7h15", "M4.5 12h15", "M4.5 17h15"],
  close: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
  check: ["M5 12.75 9.5 17.25 19 7.25"],
  checkCircle: [{ d: c(12, 12, 9.25), k: "soft" }, "M8 12.5l2.75 2.75 5.25-5.5"],
  ring: [c(12, 12, 4.5)],
  clipboard: [{ d: "M8.75 4.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-13a2 2 0 0 0-2-2h-1.75", k: "soft" },
    rr(8.75, 2.75, 6.5, 3.5, 1.25), "M8.75 11.25h6.5", "M8.75 14.75h4.5"],
  pencil: [{ d: "M15.2 4.8a1.9 1.9 0 0 1 2.7 0l1.3 1.3a1.9 1.9 0 0 1 0 2.7L8.5 19.5h-4v-4z", k: "soft" }, "M13.5 6.5l4 4"],
  note: [{ d: "M16.5 13.5v5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h5", k: "soft" }, "M8 8.5h3", "M8 16.5h5", { d: PENCIL, k: "soft" }],
  chevronDown: ["M6.5 9.5l5.5 5.5 5.5-5.5"],
  chevronUp: ["M6.5 14.5 12 9l5.5 5.5"],
  chevronRight: ["M9.5 6.5 15 12l-5.5 5.5"],
  arrowRight: ["M4.5 12h15", "M13.5 6l6 6-6 6"],
  arrowLeft: ["M19.5 12h-15", "M10.5 6l-6 6 6 6"],
  arrowUp: ["M12 19.5v-15", "M6 10.5l6-6 6 6"],
  arrowDown: ["M12 4.5v15", "M6 13.5l6 6 6-6"],

  // ---- calls
  phoneCall: [{ d: "M6.2 3.5h2.6c.5 0 .9.3 1 .8l.9 3.6c.1.4 0 .8-.3 1.1l-1.8 1.6a12 12 0 0 0 5 5l1.6-1.8c.3-.3.7-.4 1.1-.3l3.6.9c.5.1.8.5.8 1v2.6c0 1.2-1 2.1-2.2 2A16.6 16.6 0 0 1 4.3 5.7c-.1-1.2.8-2.2 1.9-2.2z", k: "soft" }],
  video: [{ d: rr(2.5, 6.5, 13, 11, 2.5), k: "soft" }, "M15.5 10.25l4.4-2.65a1 1 0 0 1 1.6.85v7.1a1 1 0 0 1-1.6.85l-4.4-2.65"],
  smartphone: [{ d: rr(6.5, 2.5, 11, 19, 2.75), k: "soft" }, "M10.75 18.25h2.5"],

  // ---- HUD and panels
  clapper: [{ d: "M3.5 10h17v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z", k: "soft" }, "M3.5 10 20.13 6.47l-.78-3.67L2.72 6.33z",
    "M6.83 9.29 8.04 5.2", "M11.32 8.34l1.21-4.09", "M15.81 7.39l1.21-4.09"],
  map: [{ d: "M9 4.75 3.5 6.9v12.35L9 17.1l6 2.15 5.5-2.15V4.75L15 6.9z", k: "soft" }, "M9 4.75V17.1", "M15 6.9v12.35"],
  journal: [{ d: rr(5, 3, 14.5, 18, 2.25), k: "soft" }, "M8.75 3v18", "M12 8h4", "M12 11.5h4"],
  bookOpen: [{ d: "M12 6.75C10.2 5.4 7.75 4.75 4.75 4.75H3.5v13h1.25c3 0 5.45.65 7.25 2 1.8-1.35 4.25-2 7.25-2h1.25v-13h-1.25c-3 0-5.45.65-7.25 2z", k: "soft" }, "M12 6.75v13"],
  settings: [{ d: GEAR + c(12, 12, 3), k: "soft" }],
  party: [{ d: "M3.75 20.25 8.4 8.6l7 7z", k: "soft" }, "M12.25 8.25c-.2-2 .7-3.6 2.5-4.5", "M15.75 11.75c2-.2 3.6.7 4.5 2.5", "M14 10l3.5-3.5",
    dot(19.25, 3.75), dot(20.5, 8.75), dot(16.5, 3.25)],
  target: [c(12, 12, 9.25), { d: c(12, 12, 5.5), k: "soft" }, { d: c(12, 12, 1.75), k: "fill" }],
  star: [{ d: star(12, 12.6, 9.4, 4.3), k: "solid" }],
  walk: [{ d: c(13.25, 4.5, 2), k: "fill" }, "M12.5 8.25 11 13.5", "M11 13.5l-1.75 3.25L7 20.5", "M11 13.5l2.5 3 1.25 4",
    "M8.75 12.25l1-3.25 2.75-.75 1.75 2.5 2.5 1"],
  tap: [{ d: c(12, 12, 2.5), k: "soft" }, "M7.76 7.76a6 6 0 0 0 0 8.48", "M16.24 7.76a6 6 0 0 1 0 8.48", "M4.93 4.93a10 10 0 0 0 0 14.14", "M19.07 4.93a10 10 0 0 1 0 14.14"],
  home: [{ d: "M4 10.25 12 3.75l8 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.25z", k: "soft" }, "M9.75 20.75v-5.5h4.5v5.5"],
  pin: [{ d: "M12 21.25s-6.75-6-6.75-11.5a6.75 6.75 0 0 1 13.5 0c0 5.5-6.75 11.5-6.75 11.5z", k: "soft" }, c(12, 9.75, 2.5)],
  play: [{ d: "M8 5.6v12.8a1 1 0 0 0 1.53.85l10.1-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6z", k: "solid" }],
  help: [{ d: c(12, 12, 9.25), k: "soft" }, "M9.5 9.5a2.6 2.6 0 1 1 3.9 2.25c-.85.5-1.4 1.1-1.4 2.1v.4", dot(12, 17)],
  info: [{ d: c(12, 12, 9.25), k: "soft" }, "M12 11.25v5.25", dot(12, 7.75)],
  medal: ["M8.25 3.25 10.75 9", "M15.75 3.25 13.25 9", { d: c(12, 14.75, 5.75), k: "soft" }, { d: star(12, 15, 2.9, 1.3), k: "solid" }],

  // ---- places
  plane: { rot: 45, parts: [{ d: "M12 2.5c.97 0 1.75.9 1.75 2V9.6l7 4.3v2l-7-2v4.3L16 19.9v1.35l-4-1.15-4 1.15V19.9l2.25-1.7v-4.3l-7 2v-2l7-4.3V4.5c0-1.1.78-2 1.75-2z", k: "soft" }] },
  taxi: [...carParts(7.5), { d: rr(9.75, 4.25, 4.5, 3.25, 0.75), k: "soft" }],
  car: carParts(6.25),
  train: [{ d: rr(5.5, 2.75, 13, 15, 3.25), k: "soft" }, "M5.5 10.75h13", dot(9, 14.25), dot(15, 14.25), "M8.75 17.75 6.5 21", "M15.25 17.75 17.5 21"],
  bus: [{ d: rr(5, 3, 14, 15.25, 2.5), k: "soft" }, "M5 12h14", "M9 6h6", dot(8.25, 15), dot(15.75, 15), "M7.25 18.25v2.25", "M16.75 18.25v2.25", "M3 8.5v3", "M21 8.5v3"],
  fuel: [{ d: "M4.5 20.5V5.5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 2 2v15", k: "soft" }, "M3 20.5h12.5", rr(6.75, 6.5, 5, 4, 1),
    "M14 11.5h1.5a1.5 1.5 0 0 1 1.5 1.5v3.25a1.5 1.5 0 0 0 3 0V8.5l-2.5-2.5"],
  bed: ["M3.5 4.5v15", "M3.5 15.25h17", "M20.5 13.25v6.25", { d: "M11 15.25v-5h6.5a3 3 0 0 1 3 3v2z", k: "soft" }, { d: c(7.25, 12.25, 1.9), k: "soft" }],
  frame: [{ d: rr(3.5, 6.75, 17, 13.5, 1.75), k: "soft" }, "M9 6.75l3-3 3 3", "M6.5 17.25l3.75-4 2.75 2.75 1.75-1.75 2.75 3", dot(15.25, 10.25)],
  coffee: [{ d: "M4.5 9h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z", k: "soft" }, "M16.5 10.5h1.25a2.5 2.5 0 0 1 0 5h-1.6", "M3.5 21h14",
    "M8.5 6c-.6-.7-.6-1.7 0-2.5", "M12.5 6c-.6-.7-.6-1.7 0-2.5"],
  restaurant: ["M6.5 3v5a2.5 2.5 0 0 0 5 0V3", "M9 3v18", { d: "M17.5 21V3c-1.6.85-3 3.1-3 6.5v4h3", k: "soft" }],
  shirt: [{ d: "M8.75 3.75c.5 1.25 1.75 2 3.25 2s2.75-.75 3.25-2l4.75 2 1.25 4.5-3.5 1v9H6.25v-9l-3.5-1L4 5.75z", k: "soft" }],
  pill: { rot: -45, parts: [rr(3.5, 8.5, 17, 7, 3.5), { d: "M12 8.5H7a3.5 3.5 0 0 0 0 7h5z", k: "solid" }] },
  scissors: [c(6.75, 17.5, 2.75), c(17.25, 17.5, 2.75), "M8.7 15.55 18.25 4.25", "M15.3 15.55 5.75 4.25"],
  bank: [{ d: "M3.5 9.25 12 4.25l8.5 5z", k: "soft" }, "M6 12v5.5", "M10 12v5.5", "M14 12v5.5", "M18 12v5.5", "M3.5 20.25h17"],
  mail: [{ d: rr(3, 5.5, 18, 13, 2.25), k: "soft" }, "M3.75 7.25 12 13l8.25-5.75"],
  flower: [{ d: "M12 4.9A2.1 2.1 0 1 1 15.12 6.7A2.1 2.1 0 1 1 15.12 10.3A2.1 2.1 0 1 1 12 12.1A2.1 2.1 0 1 1 8.88 10.3A2.1 2.1 0 1 1 8.88 6.7A2.1 2.1 0 1 1 12 4.9Z", k: "soft" },
    { d: c(12, 8.5, 1.6), k: "fill" }, "M12 12.1V21", { d: "M12 18.25c0-2.25 1.75-3.75 4.25-3.75 0 2.25-1.75 3.75-4.25 3.75z", k: "soft" }],
  police: [{ d: "M12 3 19 5.75v5.5c0 4.5-3 8-7 9.75-4-1.75-7-5.25-7-9.75v-5.5z", k: "soft" }, { d: star(12, 11.9, 3.5, 1.55), k: "solid" }],
  building: [{ d: rr(5.5, 3, 13, 18, 1.75), k: "soft" }, dot(9.5, 7), dot(14.5, 7), dot(9.5, 10.5), dot(14.5, 10.5), dot(9.5, 14), dot(14.5, 14), "M10.5 21v-3h3v3"],
  briefcase: [{ d: rr(3, 7, 18, 13, 2.25), k: "soft" }, "M9 7V5.25c0-.7.55-1.25 1.25-1.25h3.5c.7 0 1.25.55 1.25 1.25V7", "M3 12.75h18", "M10.5 12.75v1.5h3v-1.5"],
  sunset: [{ d: "M7 13a5 5 0 0 1 10 0z", k: "soft" }, "M3 13h18", "M12 6.5V4.75", "M7.4 8.4 6.17 7.17", "M16.6 8.4l1.23-1.23", "M6 16.25h12", "M9 19.25h6"],

  // ---- things people hand you
  headphones: ["M4 15v-3a8 8 0 0 1 16 0v3", { d: rr(3, 13.5, 4.5, 7, 2), k: "soft" }, { d: rr(16.5, 13.5, 4.5, 7, 2), k: "soft" }],
  document: [{ d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", k: "soft" }, "M14 3v5h5", "M8.75 13h6.5", "M8.75 16.5h4.5"],
  ticket: { rot: -12, parts: [{ d: "M5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4V7.5A1.5 1.5 0 0 1 5 6z", k: "soft" },
    dot(15.25, 8.25), dot(15.25, 12), dot(15.25, 15.75)] },
  calendar: [{ d: rr(3.5, 5, 17, 15.5, 2.5), k: "soft" }, "M3.5 9.75h17", "M8 3v4", "M16 3v4", dot(8, 13.5), dot(12, 13.5), dot(16, 13.5), dot(8, 17), dot(12, 17)],
  key: [{ d: c(7.75, 16.25, 4), k: "soft" }, "M10.6 13.4 20 4", "M17.25 6.75 19.75 9.25", "M14.5 9.5 16.5 11.5", dot(6.75, 17.25)],
  cash: [{ d: rr(2.5, 6, 19, 12, 2), k: "soft" }, c(12, 12, 2.75), dot(6.25, 12), dot(17.75, 12)],
  bottle: [{ d: rr(6.5, 10, 11, 11, 2.75), k: "soft" }, "M10 10V7.5h4V10", "M12 7.5V4", "M9.25 4h5.25a1.5 1.5 0 0 1 1.5 1.5v.5", "M9.5 15.5h5"],
  package: [{ d: "M12 2.75 20 7.25v9.5L12 21.25l-8-4.5v-9.5z", k: "soft" }, "M4 7.25 12 11.75l8-4.5", "M12 11.75v9.5", "M8 5 16 9.5"],
  passport: [{ d: rr(5, 3, 14, 18, 2.25), k: "soft" }, c(12, 10.5, 3.25), "M8.75 10.5h6.5", "M12 7.25c-1.1 1-1.6 2.1-1.6 3.25s.5 2.25 1.6 3.25c1.1-1 1.6-2.1 1.6-3.25S13.1 8.25 12 7.25z", "M9.5 17h5"],
  receipt: [{ d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-2-1.25L14 21l-2-1.25L10 21l-2-1.25z", k: "soft" }, "M9 7.75h6", "M9 11.25h6", "M9 14.75h3.5"],
  card: [{ d: rr(2.5, 5.5, 19, 13, 2.25), k: "soft" }, "M2.5 10h19", "M6 14.75h3.5"],
  drop: [{ d: "M12 3.25c3.6 4.1 5.9 7.4 5.9 10.5a5.9 5.9 0 0 1-11.8 0C6.1 10.65 8.4 7.35 12 3.25z", k: "soft" }, "M9.25 14.25a2.75 2.75 0 0 0 2.5 2.5"],
  laptop: [{ d: rr(4.5, 4.5, 15, 10.75, 1.75), k: "soft" }, "M4.5 15.25 2.75 19.25h18.5l-1.75-4"],
  idCard: [{ d: rr(2.5, 5, 19, 14, 2.25), k: "soft" }, c(8.5, 10.75, 1.9), "M5.75 16a2.85 2.85 0 0 1 5.5 0", "M14 10.25h4.5", "M14 13.75h3"],
  lock: [{ d: rr(5, 10.5, 14, 10.5, 2.25), k: "soft" }, "M8 10.5V7.5a4 4 0 0 1 8 0v3", "M12 14.75v2"],
  signature: [{ d: PENCIL, k: "soft" }, "M3.5 19.5c1.2-1.5 2.2-2.25 3-2.25 1.25 0 .5 2.25 1.75 2.25.85 0 1.6-1 2.5-1 .65 0 .95.75 1.75.75"],
  bag: [{ d: "M5.25 8.5h13.5l-.9 11.1a1.5 1.5 0 0 1-1.5 1.4H7.65a1.5 1.5 0 0 1-1.5-1.4z", k: "soft" }, "M9 11V7a3 3 0 0 1 6 0v4"],
  gift: [{ d: rr(4.25, 10.5, 15.5, 10, 1.5), k: "soft" }, rr(3, 7, 18, 3.5, 1.25), "M12 7v13.5",
    "M12 7C10.6 4.2 7.5 3.8 7.5 5.6c0 1.2 2.2 1.4 4.5 1.4z", "M12 7c1.4-2.8 4.5-3.2 4.5-1.4 0 1.2-2.2 1.4-4.5 1.4z"],
} satisfies Record<string, Def>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

function parts(def: Def): { rot: number; parts: Part[] } {
  return Array.isArray(def) ? { rot: 0, parts: def } : def;
}

const SOFT = 0.16;

function renderPart(p: Part, i: number) {
  if (typeof p === "string") return <path key={i} d={p} />;
  switch (p.k) {
    case "soft": return <path key={i} d={p.d} className="i-soft" fill="currentColor" fillOpacity={SOFT} fillRule="evenodd" />;
    case "solid": return <path key={i} d={p.d} fill="currentColor" />;
    case "tint": return <path key={i} d={p.d} className="i-soft" fill="currentColor" fillOpacity={SOFT} stroke="none" />;
    case "fill": return <path key={i} d={p.d} fill="currentColor" stroke="none" />;
  }
}

export interface IconProps {
  name: IconName;
  /** Pixels, or any CSS length (e.g. "1.2em" for icons inside text). */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  /** Accessible name; without it the icon is decorative (hidden from screen readers). */
  label?: string;
}

export function Icon({ name, size = 20, className, style, strokeWidth = 1.75, label }: IconProps) {
  const def = parts(ICONS[name]);
  return (
    <svg className={"ui-icon" + (className ? " " + className : "")} style={style} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      focusable="false" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      {def.rot ? <g transform={`rotate(${def.rot} 12 12)`}>{def.parts.map(renderPart)}</g> : def.parts.map(renderPart)}
    </svg>
  );
}

/** An icon that sits inside a line of text (e.g. „Spausk [mic] ir kalbėk“). */
export function InlineIcon({ name, label }: { name: IconName; label?: string }) {
  return <Icon name={name} size="1.2em" className="ico-inline" label={label} />;
}

/** Star rating: `n` gold stars of `of` (read out as "n iš of" unless another label is given). */
export function Stars({ n: filled, of = 3, size = 16, label }: { n: number; of?: number; size?: number | string; label?: string | false }) {
  const name = label === undefined ? `${filled} iš ${of}` : label;
  return (
    <span className="stars" {...(name ? { role: "img", "aria-label": name } : { "aria-hidden": true })}>
      {Array.from({ length: of }, (_, i) => <Icon key={i} name="star" size={size} className={i < filled ? "on" : "off"} />)}
    </span>
  );
}

/** Draws an icon on a 2D canvas (e.g. the minimap), centred on (x, y). */
export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number, color: string) {
  const def = parts(ICONS[name]);
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  if (def.rot) { ctx.translate(12, 12); ctx.rotate((def.rot * Math.PI) / 180); ctx.translate(-12, -12); }
  ctx.lineWidth = 1.75; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = color; ctx.fillStyle = color;
  for (const p of def.parts) {
    const path = new Path2D(typeof p === "string" ? p : p.d);
    const k = typeof p === "string" ? "stroke" : p.k;
    if (k === "soft" || k === "tint") { ctx.globalAlpha = SOFT; ctx.fill(path, "evenodd"); ctx.globalAlpha = 1; }
    if (k === "solid" || k === "fill") ctx.fill(path);
    if (k !== "tint" && k !== "fill") ctx.stroke(path);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// emojis that still arrive in data, mapped to icons (written as code points so this file stays emoji-free)

const EMOJI: Record<string, IconName> = {
  // places (src/content/locations.ts)
  "\u{2708}": "plane", "\u{1F695}": "taxi", "\u{1F686}": "train", "\u{1F68C}": "bus", "\u{1F697}": "car", "\u{26FD}": "fuel",
  "\u{1F3E8}": "bed", "\u{2139}": "info", "\u{1F5BC}": "frame", "\u{2615}": "coffee", "\u{1F35D}": "restaurant", "\u{1F455}": "shirt",
  "\u{1F48A}": "pill", "\u{2702}": "scissors", "\u{1F3E6}": "bank", "\u{1F4EE}": "mail", "\u{1F33B}": "flower", "\u{1F693}": "police",
  "\u{1F3E2}": "building", "\u{1F389}": "party", "\u{1F3E1}": "home", "\u{1F3E0}": "home", "\u{1F4BC}": "briefcase", "\u{1F305}": "sunset",
  "\u{1F4F1}": "smartphone", "\u{1F4DE}": "phoneCall", "\u{1F3A5}": "video", "\u{1F4CD}": "pin",
  // things people hand you, and other toasts (src/game/Game.ts, src/game/session.ts)
  "\u{1F3A7}": "headphones", "\u{1F4C4}": "document", "\u{1F3AB}": "ticket", "\u{1F39F}": "ticket", "\u{1F5D3}": "calendar", "\u{1F4C5}": "calendar",
  "\u{1F511}": "key", "\u{1F4B5}": "cash", "\u{1F5FA}": "map", "\u{1F9F4}": "bottle", "\u{1F4E6}": "package", "\u{1F6C2}": "passport",
  "\u{1F9FE}": "receipt", "\u{1F4B3}": "card", "\u{1F4A7}": "drop", "\u{1F4BB}": "laptop", "\u{1FAAA}": "idCard", "\u{1F4C7}": "idCard",
  "\u{1F510}": "lock", "\u{1F512}": "lock", "\u{1F4DD}": "note", "\u{1F6CD}": "bag", "\u{1F381}": "gift", "\u{270D}": "signature",
  "\u{2713}": "check", "\u{2714}": "check", "\u{2705}": "checkCircle", "\u{2605}": "star", "\u{2B50}": "star",
  // the UI's former emojis, in case they turn up in data too
  "\u{1F3A4}": "mic", "\u{1F50A}": "speaker", "\u{1F422}": "turtle", "\u{1F4A1}": "bulb", "\u{2328}": "keyboard", "\u{1F4CB}": "clipboard",
  "\u{270F}": "pencil", "\u{1F3AC}": "clapper", "\u{1F4D2}": "journal", "\u{1F4D6}": "bookOpen", "\u{2699}": "settings", "\u{1F3AF}": "target",
  "\u{1F6B6}": "walk", "\u{1F3C5}": "medal", "\u{2753}": "help", "\u{2754}": "help", "\u{1F449}": "next", "\u{27A1}": "arrowRight",
};

const PICTO = /^\p{Extended_Pictographic}/u;
const VS16 = /\u{FE0F}/gu;

/** The icon for an emoji string from data (e.g. a place's `icon`), if there is one. */
export function iconForEmoji(e: string | undefined): IconName | undefined {
  if (!e) return undefined;
  return EMOJI[e.replace(VS16, "").trim()];
}

/** Splits a leading emoji (or a run of stars) off a title such as "<ticket> Gavai: bilietą" or "<star><star> Ordering Coffee". */
export function splitLead(text: string): { icon?: IconName; stars: number; rest: string } {
  let s = text, stars = 0;
  while (s.startsWith("\u{2605}")) { stars++; s = s.slice(1); }
  if (stars) return { stars, rest: s.trimStart() };
  const first = String.fromCodePoint(s.codePointAt(0) ?? 32);
  const icon = EMOJI[first];
  if (icon || PICTO.test(first)) {
    s = s.slice(first.length).replace(/^\u{FE0F}/u, "").trimStart();
    return { icon, stars: 0, rest: s };
  }
  return { stars: 0, rest: text };
}

/** Text with any emojis inside it swapped for inline icons. */
export function withIcons(text: string): ReactNode {
  if (!/[\p{Extended_Pictographic}\u{2605}\u{2713}]/u.test(text)) return text;
  const out: ReactNode[] = [];
  let buf = "";
  for (const ch of text.replace(VS16, "")) {
    const icon = EMOJI[ch];
    if (icon) { if (buf) out.push(buf); buf = ""; out.push(<InlineIcon key={out.length} name={icon} />); }
    else if (!PICTO.test(ch)) buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
