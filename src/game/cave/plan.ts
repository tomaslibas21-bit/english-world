// The grotto under Cenote Ka'an (Puerto Colibrí): its plan and its rules, with no three.js in it (tested alone,
// tests/es/cave.test.ts). A hidden Maya world one swims into through the cave's mouth at the cenote's far side: five
// chambers along an old sacbé, each with three glyph stones that speak a phrase the learner already knows (found by
// ear: quest.ts), two aluxes one talks with to get through (the conversations x02 and x03), and a gate to the next
// chamber that opens once the chamber's stones are lit and the learner has finished enough of the town's
// conversations: the first chamber is open to everyone, one more for every ten conversations finished.
//
// The zone has its own coordinates (m): the way in at about (0, 2), the water one came through behind it, the chambers on towards −z (ahead of someone coming in),
// +x to the right.

import type { Sentence } from "../../convo/compose";
export interface Stone { id: string; x: number; z: number; /** Its glyph faces this way (radians, 0: +z). */ rot: number }
export interface Chamber {
  id: string; n: number;
  /** Its name in Spanish (what its own sign would say) and what that means, in the learner's language through L(). */
  name: string; lt: string;
  x: number; z: number; rx: number; rz: number;
  /** How high its roof is in the middle (m). */
  ceil: number;
  stones: Stone[];
}
/** A way through that is shut until its condition holds: `alux`: the alux there has let the learner pass (their
 *  conversation's "alux-pass" event); `stones`: that chamber's three stones are all lit (the chamber's own puzzle is
 *  its key: nothing from the town is asked for). */
export interface Gate { id: string; x: number; z: number; rot: number; w: number; alux?: string; stones?: number; to?: number }
export interface Passage { ax: number; az: number; bx: number; bz: number; w: number }
export interface Pool { x: number; z: number; rx: number; rz: number; /** One wades through it (a ford); else its rim keeps one out. */ ford?: boolean;
  /** Water that is only drawn (under a bridge's deck): nothing of the ground plan. */ deck?: boolean }

const S = (id: string, x: number, z: number, rot: number): Stone => ({ id, x, z, rot });

export const CHAMBERS: Chamber[] = [
  // the hall under the cenote's eye: the ceiba in the light, the lagoon on the right, the falls at the far end
  // (Kin's directions, x02: "a la izquierda del árbol", "a la derecha, cerca del agua", "al fondo, junto a la cascada")
  { id: "agua", n: 1, name: "La Sala del Agua", lt: "Vandens salė", x: 0, z: -25, rx: 17, rz: 17.5, ceil: 15,
    stones: [S("agua-1", -8.2, -24.5, Math.PI / 2), S("agua-2", 7.2, -31.6, -0.5), S("agua-3", 1.6, -39.4, 0.25)] },
  // hanging roots as thick as trees, mushrooms that glow, fireflies everywhere
  { id: "raices", n: 2, name: "El Jardín de Raíces", lt: "Šaknų sodas", x: -15, z: -64, rx: 13.5, rz: 13, ceil: 11,
    stones: [S("raices-1", -24.2, -60.5, 1.2), S("raices-2", -8.4, -70.6, -0.9), S("raices-3", -19.5, -73.2, 0.6)] },
  // an underground river with a bridge of roots over it, where Nikté asks her riddles
  { id: "rio", n: 3, name: "El Río Escondido", lt: "Paslėpta upė", x: -6, z: -101, rx: 15, rz: 14, ceil: 12,
    stones: [S("rio-1", -15.6, -106.4, 1.1), S("rio-2", 3.6, -108.2, -0.8), S("rio-3", -6.8, -112.2, 0)] },
  // crystals, a wall of old glyphs, glow-worms on the roof like a night sky
  { id: "estrellas", n: 4, name: "La Sala de las Estrellas", lt: "Žvaigždžių salė", x: 14, z: -137, rx: 13.5, rz: 12.5, ceil: 13,
    stones: [S("estrellas-1", 5.4, -131.6, 1.0), S("estrellas-2", 22.6, -135.4, -1.3), S("estrellas-3", 13.2, -146.4, 0.1)] },
  // the heart: a still round lake, an island, and the Yaxché, the tree that holds up the world, in flower
  { id: "corazon", n: 5, name: "El Corazón de Ka'an", lt: "Ka'an širdis", x: 6, z: -177, rx: 17, rz: 16, ceil: 17,
    stones: [S("corazon-1", -6.6, -172.4, 1.25), S("corazon-2", 18.4, -173.6, -1.2), S("corazon-3", 6.2, -191.2, 0)] },
];

/** The ways between the chambers (and the way in), as wide as given (m). */
export const PASSAGES: Passage[] = [
  { ax: 0, az: 11.5, bx: 0, bz: -10, w: 6.6 },         // from the water one came through, in
  { ax: -6, az: -40, bx: -12, bz: -53, w: 5.2 },       // 1 → 2
  { ax: -14, az: -75, bx: -9, bz: -89, w: 5.2 },       // 2 → 3
  { ax: 0, az: -113, bx: 9, bz: -126, w: 5.2 },        // 3 → 4
  { ax: 13, az: -148, bx: 8, bz: -162, w: 5.4 },       // 4 → 5
  { ax: 2.4, az: -0.4, bx: 9.8, bz: -2.3, w: 3.3 },    // the cleft off the way in: out to La Grieta (grounds.ts)
];

export const GATES: Gate[] = [
  { id: "kin", x: 0, z: -7.6, rot: 0, w: 6.4, alux: "kin" },
  { id: "g2", x: -9, z: -46.5, rot: 0.43, w: 5.2, stones: 0, to: 1 },
  { id: "g3", x: -11.5, z: -82, rot: -0.34, w: 5.2, stones: 1, to: 2 },
  // (the bridge of roots over the river: Nikté sits in the middle of it)
  { id: "nikte", x: -6, z: -101.4, rot: 0, w: 3.0, alux: "nikte" },
  { id: "g4", x: 4.5, z: -119.5, rot: -0.6, w: 5.2, stones: 2, to: 3 },
  { id: "g5", x: 10.5, z: -155, rot: 0.34, w: 5.4, stones: 3, to: 4 },
];

/** Where the aluxes stand (their conversations: x02, x03): beside the way they keep, and where one stands to talk. */
export const ALUXES: { npc: string; gate: string; x: number; z: number; rot: number; ax: number; az: number; sit?: boolean; seat?: number }[] = [
  { npc: "alux_kin", gate: "kin", x: 1.9, z: -4.3, rot: -0.5, ax: 0.3, az: -2.5 },
  // (Nikté sits on her bridge's rail, half way over: there is room to walk past her once she lets one cross)
  { npc: "alux_nikte", gate: "nikte", x: -4.62, z: -100.3, rot: -Math.PI / 2, ax: -6.3, az: -99.5, sit: true, seat: 0.74 },
];

/** Water that glows: the lagoon of the first hall, pools, the river (a chain of pools: its bridge is its ford), the
 *  heart's lake (its stepping stones are its ford). */
export const POOLS: Pool[] = [
  // the water one came up through (and wades back into to leave)
  { x: 0, z: 8.6, rx: 3.6, rz: 5.2, ford: true },
  { x: 10.2, z: -22.5, rx: 5.6, rz: 7.2 },
  { x: 5.6, z: -38.2, rx: 2.6, rz: 2.0 },
  { x: -22.5, z: -67.5, rx: 3.4, rz: 2.6 },
  { x: -10.4, z: -57.6, rx: 2.4, rz: 3.0 },
  // the river across the third chamber, wall to wall, and the water under the bridge of roots (BRIDGE)
  { x: -15.8, z: -101.2, rx: 8.2, rz: 2.4 }, { x: 4.8, z: -101.6, rx: 9.2, rz: 2.5 }, { x: -6, z: -101.4, rx: 3, rz: 2.0, deck: true },
  { x: 20.2, z: -142.8, rx: 3.0, rz: 2.4 },
  // the heart's lake round the island (the island is the tree's, in the middle)
  { x: 6, z: -180, rx: 11.2, rz: 9.2, ford: true },
];
/** The bridge of roots over the river (its deck: x from … to, z from … to). */
export const BRIDGE = { x0: -7.5, x1: -4.5, z0: -104.6, z1: -98.2 };
/** The island in the heart's lake, and the great trees (the first hall's ceiba; the Yaxché on its island). */
export const ISLAND = { x: 6, z: -180, r: 4.3 };
export const TREES = [{ x: 0, z: -25, r: 1.15, h: 13.5 }, { x: 6, z: -180, r: 1.5, h: 10.5 }];
/** The cenote's eye: the hole in the first hall's roof the light comes down through, over the ceiba. */
export const EYE = { x: 0, z: -25, r: 4.2 };
/** The falls (where their water lands, how wide, how high they start). */
export const FALLS = [{ x: 5.6, z: -41.2, w: 2.6, h: 8.5, rot: 0 }, { x: -27.2, z: -66.5, w: 1.6, h: 6.5, rot: Math.PI / 2 }, { x: 6, z: -193.6, w: 3.2, h: 11, rot: 0 }];
/** The sacbé: the old white road through it all, as a line of points. */
export const SACBE: [number, number][] = [
  [0, 3.2], [0, -7.6], [-0.4, -14], [-2.6, -21], [-3.4, -29], [-5.2, -36], [-6, -40], [-9, -46.5], [-12, -53], [-14.5, -60], [-15, -68],
  [-14, -75], [-11.5, -82], [-9, -89], [-6.5, -95], [-6, -101.4], [-5, -107], [0, -113], [4.5, -119.5], [9, -126], [13, -134], [14, -142],
  [13, -148], [10.5, -155], [8, -162], [6.4, -168],
];

/** Where one comes in, and where the way back out is (the turquoise water of the cave's mouth). */
export const ENTRY = { x: 0, z: 2.2, rot: Math.PI };
export const EXIT = { x: 0, z: 6.4 };
/** The ways out (grounds.ts has where each comes up in the town): the water one came through, the cleft's slit of
 *  daylight. `reach`: from how near it is offered; `push`: walking on into it within this goes out (towards `dir`). */
export const EXITS: { id: "agua" | "grieta"; x: number; z: number; reach: number; push: number; dir: [number, number] }[] = [
  { id: "agua", x: EXIT.x, z: EXIT.z, reach: 2.6, push: 1.5, dir: [0, 1] },
  { id: "grieta", x: 9.2, z: -2.2, reach: 2.4, push: 1.0, dir: [1, -0.25] },
];
/** Where each way in puts one (grounds.ts `ways`): swum in by the cave's mouth, walked in through La Grieta's cleft,
 *  dropped through El Ojo into the water (`drop`: from how high, m). */
export const SPAWNS: Record<string, { x: number; z: number; rot: number; drop?: number }> = {
  boca: ENTRY,
  // (out of the cleft's inner end and turned towards Kin: the camera has the way in's length behind them, as from the
  // water; in the cleft itself it was boxed in and came round to their face)
  grieta: { x: 1.2, z: -0.7, rot: Math.PI },
  ojo: { x: 0, z: 9.0, rot: Math.PI, drop: 6.2 },
};
/** The sinkhole seen from below: a small eye in the roof over the water one comes up through. */
export const EYE2 = { x: 0, z: 9.2, r: 1.8 };
export const BOUNDS = { minX: -34, maxX: 34, minZ: -198, maxZ: 16 };

// ------------------------------------------------------------------------------------------------- the ground plan

const segDist = (x: number, z: number, p: Passage) => {
  const dx = p.bx - p.ax, dz = p.bz - p.az, t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (z - p.az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - p.ax - dx * t, z - p.az - dz * t);
};
/** How far inside the cave (x, z) is (m; negative: in the rock): the chambers' ovals and the passages between them. */
export function inside(x: number, z: number) {
  let best = -99;
  for (const c of CHAMBERS) {
    if (Math.abs(z - c.z) > c.rz + 2 || Math.abs(x - c.x) > c.rx + 2) continue;
    const k = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    best = Math.max(best, (1 - k) * Math.min(c.rx, c.rz));
  }
  for (const p of PASSAGES) best = Math.max(best, p.w / 2 - segDist(x, z, p));
  return best;
}
/** The chamber (x, z) is in or nearest to (its index). */
export function chamberAt(x: number, z: number) {
  let best = 0, bd = Infinity;
  CHAMBERS.forEach((c, i) => {
    const d = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
/** The roof over (x, z) (m): low at the walls, high in the middle of a chamber, a passage's own height. */
export function roofY(x: number, z: number) {
  const d = Math.max(0, inside(x, z));
  let top = 5.2;
  for (const c of CHAMBERS) {
    const k = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    if (k < 1) top = Math.max(top, 5.2 + (c.ceil - 5.2) * (1 - k * k) ** 0.8);
  }
  const lip = Math.min(1, d / 4.5);
  return 3.9 + (top - 3.9) * lip * (2 - lip) + 0.5 * Math.sin(x * 0.7 + z * 0.33) * Math.cos(z * 0.52 - x * 0.21);
}
/** The pool at (x, z), if any (`grow`: metres added to its rim). */
export function poolAt(x: number, z: number, grow = 0): Pool | null {
  for (const p of POOLS) if (!p.deck && ((x - p.x) / (p.rx + grow)) ** 2 + ((z - p.z) / (p.rz + grow)) ** 2 < 1) return p;
  return null;
}
/** What is underfoot (m): the cave's floor, ankle-deep under a ford's water, the island a little proud of its lake. */
export function floorY(x: number, z: number) {
  if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r) return 0.12;
  const p = poolAt(x, z);
  if (!p?.ford) return 0;
  const k = Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
  return -0.2 * Math.min(1, (1 - k) * 5);
}
/** One can stand at (x, z) with `r` m to spare: inside the rock's walls, out of the deep pools, off the trees. */
export function walkable(x: number, z: number, r = 0.38) {
  if (inside(x, z) < r) return false;
  const p = poolAt(x, z, r * 0.6);
  if (p && !p.ford && !(x > BRIDGE.x0 + r * 0.5 && x < BRIDGE.x1 - r * 0.5 && z > BRIDGE.z0 && z < BRIDGE.z1)) return false;
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < t.r + r) return false;
  return true;
}

// ------------------------------------------------------------------------------------------------- the rules

/** What the learner has done down here (saved with their progress). */
export interface CaveSave { lit: string[]; passed: string[]; /** Seen the way in's first message; found the heart. */ seen?: boolean; heart?: boolean;
  /** Heard the tree out (x04: its "tree-heard"). The stones' lines understood in this round (their ids), and how many
   *  rounds are behind (every line heard once: the stones start again). */
  tree?: boolean; heard?: string[]; rounds?: number;
  /** (Until 16 Nov 2026: how many chambers the town's conversations had opened when last told. Kept in old saves,
   *  read by nothing.) */ told?: number }
export const emptyCave = (): CaveSave => ({ lit: [], passed: [] });

export const stonesLit = (save: CaveSave, chamber: number) => CHAMBERS[chamber].stones.filter((s) => save.lit.includes(s.id)).length;

/** How many chambers are open (1–5): the first for everyone, and each next one once every stone of the chamber before
 *  it is lit. (Until 16 Nov 2026 a chamber also waited for 10/20/30/40 of the town's conversations: a learner who had
 *  done everything in the room found the way shut. The owner: the room's own puzzle should open it.) */
export function chambersOpen(save: CaveSave, all = false) {
  if (all) return CHAMBERS.length;
  let n = 1;
  while (n < CHAMBERS.length && stonesLit(save, n - 1) >= CHAMBERS[n - 1].stones.length) n++;
  return n;
}

/** Is this gate open? And if not, why: "alux" (talk to them) or "stones" (light this chamber's stones first). */
export function gateState(g: Gate, save: CaveSave, all = false): { open: boolean; why?: "alux" | "stones" } {
  if (g.alux) return save.passed.includes(g.alux) || all ? { open: true } : { open: false, why: "alux" };
  const ch = g.stones!;
  return stonesLit(save, ch) >= CHAMBERS[ch].stones.length || all ? { open: true } : { open: false, why: "stones" };
}

/** What comes next, for the little card that stands in for the map down here. */
export function nextStep(chamber: number, save: CaveSave, all = false):
  { kind: "alux"; npc: string } | { kind: "stones"; left: number } | { kind: "on"; name: string } | { kind: "heart" } | { kind: "done" } {
  for (const a of ALUXES) {
    const g = GATES.find((q) => q.alux === a.gate)!;
    if (chamberAt(g.x, g.z) === chamber && !gateState(g, save, all).open) return { kind: "alux", npc: a.npc };
  }
  const left = CHAMBERS[chamber].stones.length - stonesLit(save, chamber);
  if (left > 0) return { kind: "stones", left };
  const next = CHAMBERS[chamber + 1];
  if (!next) return save.heart ? { kind: "done" } : { kind: "heart" };
  return { kind: "on", name: next.name };
}

// ------------------------------------------------------------------------------------------------- the stones' phrases

/** `en`: what is said (Spanish here: the field keeps the town's phrasebook's name); `lt`: its meaning in the learner's
 *  language. A stone's own line (x04-yaxche's hint groups, content/stones.ts) also has its `id` there, the chamber
 *  it belongs to and the whole sentence `s` (its units, glosses and notes, for the card once the stone is lit). */
export interface Phrase { en: string; lt: string; id?: string; chamber?: number; s?: Sentence }

/** The stone's first line: the nth stone of a chamber says the nth line of that chamber's group ("agua-2" → "agua_02"). */
export const firstLine = (stoneId: string) => stoneId.replace(/-(\d+)$/, (_, n: string) => "_" + n.padStart(2, "0"));
/** The hint group of a chamber's stones in the tree's conversation (content/stones.ts stoneGroup). */
export const stoneGroup = (chamberId: string) => "p_" + chamberId;
/** The conversation that holds the tree's talk and the stones' lines. */
export const TREE_SIT = "x04-yaxche";

/** Once the heart is found the stones speak again, whenever the learner comes back: which line a stone of `chamber`
 *  says next. One of its own chamber's lines not heard yet in this round; if there is none, another chamber's not heard
 *  yet; and when every line has been heard, the round starts again (any of its own). Never a line another stone is
 *  saying now (`taken`). `byChamber`: the lines that can be said (those with a recording), by chamber. */
export function nextLine(byChamber: string[][], chamber: number, heard: readonly string[], taken: readonly string[], rnd: () => number): string | null {
  const free = (ids: string[]) => ids.filter((id) => !taken.includes(id));
  const fresh = (ids: string[]) => free(ids).filter((id) => !heard.includes(id));
  const own = byChamber[chamber] ?? [];
  const pools = [fresh(own), fresh(byChamber.flat()), free(own), free(byChamber.flat())];
  const pool = pools.find((q) => q.length);
  return pool ? pool[Math.floor(rnd() * pool.length) % pool.length] : null;
}
/** Has every line been heard (the round is over)? */
export const allHeard = (byChamber: string[][], heard: readonly string[]) => { const all = byChamber.flat(); return all.length > 0 && all.every((id) => heard.includes(id)); };

/** The phrases the stones speak: the learner's own (their phrasebook, the ones said last and most first), then the
 *  greetings everyone starts with, each once, only those that have a recording (`has`), and none too long to say back.
 *  Stable for the same phrasebook: the stones keep their phrases from visit to visit. */
export function pickPhrases(book: { en: string; lt: string; count: number; last: number }[], starters: Phrase[], n: number, has: (en: string) => boolean): Phrase[] {
  const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const seen = new Set<string>(), out: Phrase[] = [];
  const take = (p: Phrase) => {
    const k = key(p.en), words = k.split(/\s+/).length;
    if (!k || seen.has(k) || words > 9 || p.en.length > 60 || !p.lt.trim() || /[{}|]/.test(p.en) || !has(p.en)) return;
    seen.add(k); out.push({ en: p.en, lt: p.lt });
  };
  for (const p of [...book].sort((a, b) => b.last - a.last || b.count - a.count)) { if (out.length >= n) break; take(p); }
  for (const p of starters) { if (out.length >= n) break; take(p); }
  return out;
}

/** Three meanings to choose from for `right`: its own and two others', in an order drawn with `rnd`. */
export function meaningChoices(right: Phrase, others: Phrase[], rnd: () => number): { options: string[]; answer: number } {
  const pool = [...new Set(others.map((o) => o.lt).filter((lt) => lt !== right.lt))];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const options = [right.lt, ...pool.slice(0, 2)];
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { options, answer: options.indexOf(right.lt) };
}

/** Was the phrase said back? What was heard against what the stone said: the same words but for accents, capitals,
 *  punctuation and an extra or a missing little word (at least four words in five, in order). */
export function saidBack(heard: string, phrase: string) {
  const words = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(Boolean);
  const a = words(heard), b = words(phrase);
  if (!a.length || !b.length) return false;
  // the longest run of the phrase's words found in order in what was heard
  const m = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = a[i - 1] === b[j - 1] ? m[i - 1][j - 1] + 1 : Math.max(m[i - 1][j], m[i][j - 1]);
  const hit = m[a.length][b.length];
  return hit / b.length >= (b.length <= 2 ? 1 : 0.8) && hit / a.length >= 0.6;
}

/** How loud a stone is heard from `d` m away (0–1), and where between the ears (−1 left … 1 right) for someone
 *  looking along `yaw` (radians, 0: +z) from (px, pz). */
export function heard(px: number, pz: number, yaw: number, sx: number, sz: number) {
  const dx = sx - px, dz = sz - pz, d = Math.hypot(dx, dz);
  const k = Math.max(0, 1 - d / 30);
  const gain = 0.06 + 0.94 * k * k * k;
  // (to the listener's right: the direction turned by the way they look)
  const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const pan = d < 0.6 ? 0 : Math.max(-1, Math.min(1, (-right / d) * Math.min(1, d / 3)));
  return { gain: d > 34 ? 0 : gain, pan, d };
}
