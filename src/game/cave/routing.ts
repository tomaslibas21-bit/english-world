import type { NavGrid } from "../nav";
import { CHAMBERS, GATES, KEEPERS, SLATE_CAVE } from "../world/slateCave";
import { chamberAt, TREES, type Gate, type Stone } from "./plan";
import { gateOpen, type CaveSave } from "./quest";

type Point = { x: number; z: number };
export type CaveTarget = Point & { kind: "npc" | "glyph" | "point" | "tree"; id: string; person?: Point };

const gateLines = GATES.map((g) => ({ sin: Math.sin(g.rot), cos: Math.cos(g.rot), reach: g.w / 2 + 1 }));
const keepers = KEEPERS.map((a): CaveTarget => ({ kind: "npc", id: a.npc, x: a.ax, z: a.az, person: a }));
const stones = CHAMBERS.map((room) => room.stones.map(stoneTarget));
const tree = TREES[1];
const oak: CaveTarget = { kind: "tree", id: SLATE_CAVE.treeNpc, x: tree.x, z: tree.z + 3.2, person: tree };

function stoneTarget(stone: Stone): CaveTarget {
  return { kind: "glyph", id: stone.id, person: stone,
    x: stone.x + 1.35 * Math.sin(stone.rot), z: stone.z + 1.35 * Math.cos(stone.rot) };
}

function nextStone(room: number, from: Point, save: CaveSave, waiting?: (id: string) => boolean) {
  let best: CaveTarget | null = null, distance = Infinity;
  for (const target of stones[room]) {
    if (waiting ? !waiting(target.id) : save.lit.includes(target.id)) continue;
    const d = Math.hypot(target.x - from.x, target.z - from.z);
    if (d < distance) { best = target; distance = d; }
  }
  return best;
}

export function caveQuestTarget(from: Point, save: CaveSave, all = false, replayWaiting?: (id: string) => boolean, npc?: string): CaveTarget | null {
  if (npc === keepers[0].id || (!all && !save.passed.includes(KEEPERS[0].gate))) return keepers[0];
  const tide = nextStone(0, from, save);
  if (!all && tide) return tide;
  const count = save.lit.length;
  if (!all && count < SLATE_CAVE.goals.riverEntry) return nextStone(1, from, save);
  if (npc === keepers[1].id || (!all && !save.passed.includes(KEEPERS[1].gate))) return keepers[1];
  if (!all && count < SLATE_CAVE.goals.oak) return nextStone(2, from, save);
  if (npc === oak.id || !save.tree) return oak;
  if (!replayWaiting) return null;
  const here = chamberAt(from.x, from.z);
  const local = nextStone(here, from, save, replayWaiting);
  if (local) return local;
  let best: CaveTarget | null = null, nearest = Infinity;
  for (let i = 0; i < stones.length; i++) {
    const candidate = nextStone(i, from, save, replayWaiting);
    if (!candidate) continue;
    const distance = Math.hypot(candidate.x - from.x, candidate.z - from.z);
    if (distance < nearest) { best = candidate; nearest = distance; }
  }
  return best;
}

function gateSide(g: Gate, i: number, p: Point) {
  const dz = p.z - g.z;
  const { sin, cos } = gateLines[i];
  return Math.abs(dz) > g.w ? dz : (p.x - g.x) * sin + dz * cos;
}

export function firstClosedGate(from: Point, to: Point, save: CaveSave, all = false) {
  if (all) return undefined;
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i];
    if (gateSide(g, i, from) >= 0 && gateSide(g, i, to) < 0 && !gateOpen(g, save)) return g;
  }
}

export function caveGateTarget(from: Point, to: Point, save: CaveSave, all = false) {
  return firstClosedGate(from, to, save, all) ? caveQuestTarget(from, save, all) : null;
}

/** An attempted inward crossing. Outward traffic always has a dry route home. */
export function gateStops(i: number, ax: number, az: number, bx: number, bz: number, clearance = 0) {
  const gate = GATES[i], { sin, cos, reach } = gateLines[i];
  if (Math.min(az, bz) > gate.z + reach + clearance || Math.max(az, bz) < gate.z - reach - clearance) return false;
  const a = (ax - gate.x) * sin + (az - gate.z) * cos;
  const b = (bx - gate.x) * sin + (bz - gate.z) * cos;
  if (a < -0.04 || b >= clearance || b >= a) return false;
  const t = Math.max(0, (a - clearance) / (a - b));
  const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
  return Math.abs((x - gate.x) * cos - (z - gate.z) * sin) <= reach;
}

/** Cache the closed-gate edges over the permanent grid. The geometric check also protects straightened paths. */
const edgeCache = new Map<string, Uint8Array>();
function gateEdges(nav: NavGrid) {
  const key = [nav.minX, nav.minZ, nav.cols, nav.rows, nav.cell].join("/");
  const cached = edgeCache.get(key);
  if (cached) return cached;
  const edges = new Uint8Array(nav.blocked.length * 8);
  const dc = [1, -1, 0, 0, 1, 1, -1, -1], dr = [0, 0, 1, -1, 1, -1, 1, -1];
  for (let i = 0; i < GATES.length; i++) {
    const gate = GATES[i], bit = 1 << i, reach = gateLines[i].reach + 1;
    const c0 = Math.max(0, Math.floor((gate.x - reach - nav.minX) / nav.cell));
    const c1 = Math.min(nav.cols - 1, Math.floor((gate.x + reach - nav.minX) / nav.cell));
    const r0 = Math.max(0, Math.floor((gate.z - reach - nav.minZ) / nav.cell));
    const r1 = Math.min(nav.rows - 1, Math.floor((gate.z + reach - nav.minZ) / nav.cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const at = r * nav.cols + c, [x, z] = nav.center(at);
      for (let d = 0; d < 8; d++) {
        if (gateStops(i, x, z, x + dc[d] * nav.cell, z + dr[d] * nav.cell, 0.38)) edges[at * 8 + d] |= bit;
      }
    }
  }
  edgeCache.set(key, edges);
  return edges;
}

export function caveGateGrid(nav: NavGrid) {
  const edges = gateEdges(nav);
  let closed = (1 << GATES.length) - 1;
  nav.blockedStep = (cell, direction) => !!(closed & edges[cell * 8 + direction]);
  nav.blockedLine = (ax, az, bx, bz) => {
    for (let i = 0; i < GATES.length; i++) if ((closed & (1 << i)) && gateStops(i, ax, az, bx, bz, 0.38)) return true;
    return false;
  };
  return (open: number) => { closed = ((1 << GATES.length) - 1) & ~open; };
}
