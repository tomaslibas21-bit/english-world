import type { NavGrid } from "../nav";
import {
  ALUXES, CHAMBERS, GATES, SACBE, TREES, chamberAt, gateState, nextStep,
  type CaveSave, type Gate, type Stone,
} from "./plan";

type Point = { x: number; z: number };
export type CaveTarget = Point & {
  kind: "npc" | "glyph" | "point" | "tree";
  id: string;
  person?: Point;
};

function aluxTarget(id: string): CaveTarget | null {
  const a = ALUXES.find((a) => a.npc === id);
  return a ? { kind: "npc", id, x: a.ax, z: a.az, person: { x: a.x, z: a.z } } : null;
}

function stoneTarget(stone: Stone): CaveTarget {
  return {
    kind: "glyph", id: stone.id, person: stone,
    x: stone.x + 1.35 * Math.sin(stone.rot), z: stone.z + 1.35 * Math.cos(stone.rot),
  };
}

function nextStone(chamber: number, from: Point, waiting: (id: string) => boolean) {
  let nearest: CaveTarget | null = null, best = Infinity;
  for (const stone of CHAMBERS[chamber].stones) {
    if (!waiting(stone.id)) continue;
    const target = stoneTarget(stone);
    const distance = Math.hypot(target.x - from.x, target.z - from.z);
    if (distance < best) { nearest = target; best = distance; }
  }
  return nearest;
}

export function caveQuestTarget(
  from: Point, save: CaveSave, all = false, replayWaiting?: (id: string) => boolean,
): CaveTarget | null {
  const here = chamberAt(from.x, from.z);
  if (replayWaiting) return nextStone(here, from, replayWaiting);
  const step = nextStep(here, save, all);
  if (step.kind === "alux") return aluxTarget(step.npc);
  if (step.kind === "stones") return nextStone(here, from, (id) => !save.lit.includes(id));
  if (step.kind === "on") {
    const gate = GATES.find((g) => g.to === here + 1)!;
    const next = SACBE.findIndex(([x, z]) => x === gate.x && z === gate.z) + 1;
    const [x, z] = SACBE[next];
    return { kind: "point", id: gate.id, x, z };
  }
  if (save.heart && !save.tree) {
    const tree = TREES[1];
    return { kind: "tree", id: "yaxche", x: tree.x, z: tree.z + 3.2, person: tree };
  }
  return null;
}

function gateSide(gate: Gate, p: Point) {
  const dz = p.z - gate.z;
  // Away from the passage, the gate separates whole chambers, regardless of its angle.
  return Math.sign(Math.abs(dz) > gate.w ? dz : (p.x - gate.x) * Math.sin(gate.rot) + dz * Math.cos(gate.rot));
}

export function firstClosedGate(from: Point, to: Point, save: CaveSave, all = false) {
  const gates = to.z < from.z ? GATES : [...GATES].reverse();
  return gates.find((g) => gateSide(g, from) !== gateSide(g, to) && !gateState(g, save, all).open);
}

/** A shut gate is a prerequisite on the way in. On the way out, mark the near side if the player is behind it. */
export function caveGateTarget(from: Point, to: Point, save: CaveSave, all = false): CaveTarget | null {
  const gate = firstClosedGate(from, to, save, all);
  if (!gate) return null;
  const side = gateSide(gate, from);
  if (side > 0) {
    const alux = ALUXES.find((a) => a.gate === gate.alux);
    const prerequisite = alux ? aluxTarget(alux.npc) : gate.stones === undefined ? null : nextStone(gate.stones, from, (id) => !save.lit.includes(id));
    if (prerequisite) return prerequisite;
  }
  return {
    kind: "point", id: gate.id, person: gate,
    x: gate.x + side * 1.5 * Math.sin(gate.rot), z: gate.z + side * 1.5 * Math.cos(gate.rot),
  };
}

/** Overlay the closed veils on the permanent cave grid. Reopening a gate restores the underlying cells. */
export function caveGateGrid(nav: NavGrid) {
  const base = nav.blocked.slice();
  const cells = GATES.map((g) => {
    const indices: number[] = [];
    const reach = g.w / 2 + 1, sin = Math.sin(g.rot), cos = Math.cos(g.rot);
    const startX = Math.floor((g.x - reach - nav.minX) / nav.cell);
    const startZ = Math.floor((g.z - reach - nav.minZ) / nav.cell);
    for (let r = startZ; r < startZ + 2 * reach / nav.cell + 1; r++) {
      for (let c = startX; c < startX + 2 * reach / nav.cell + 1; c++) {
        if (r < 0 || c < 0 || r >= nav.rows || c >= nav.cols) continue;
        const i = r * nav.cols + c, [x, z] = nav.center(i);
        const dx = x - g.x, dz = z - g.z;
        if (Math.abs(dx * cos - dz * sin) <= reach && Math.abs(dx * sin + dz * cos) <= 0.65) indices.push(i);
      }
    }
    return { gate: g, indices };
  });
  return (save: CaveSave, all: boolean) => {
    nav.blocked.set(base);
    for (const { gate, indices } of cells) {
      if (!gateState(gate, save, all).open) for (const i of indices) nav.blocked[i] = 1;
    }
  };
}
