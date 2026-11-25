import type { Vector3 } from "three";
import { NavGrid } from "../nav";
import { Colliders } from "../world/util";
import type { Interior } from "../world/interiors";
import { CAVE_COPY } from "../../content/cave-copy";
import { CHAMBERS, KEEPERS, SLATE_CAVE } from "../world/slateCave";
import { CAVE_ZONE } from "../world/slateCovePlan";
import { buildCave } from "./Cave";
import * as P from "./plan";
import { CaveQuest, type CaveSave } from "./quest";
import { caveGateGrid } from "./routing";

const noProps = new Colliders();
let permanentCells: Uint8Array | undefined;

export function caveWaterLevel(x: number, z: number) {
  let level = 0;
  for (const fall of P.FALLS) {
    const near = Math.max(0, 1 - Math.hypot(x - fall.x, z - fall.z) / 16);
    level = Math.max(level, near * near * 0.28);
  }
  return level;
}

export function buildCaveZone(initial: CaveSave | undefined, persist: (save: CaveSave) => void) {
  const view = buildCave(), bounds = P.BOUNDS;
  const { colliders, group } = view;
  for (const keeper of KEEPERS) colliders.addCircle(keeper.x, keeper.z, 0.36);
  const nav = new NavGrid(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ, 0.55, permanentCells ? noProps : colliders, 0.38);
  if (permanentCells) nav.blocked.set(permanentCells);
  else {
    for (let i = 0; i < nav.blocked.length; i++) {
      const [x, z] = nav.center(i);
      if (!P.walkable(x, z, 0.4)) nav.blocked[i] = 1;
    }
    permanentCells = nav.blocked.slice();
  }
  const quest = new CaveQuest(view, initial, persist, caveGateGrid(nav));
  for (const room of CHAMBERS) for (const stone of room.stones) {
    if (quest.save.lit.includes(stone.id)) view.setStone(stone.id, true);
  }
  const interior: Interior = {
    id: CAVE_ZONE, group, colliders, w: bounds.maxX - bounds.minX, d: bounds.maxZ - bounds.minZ,
    exit: P.EXIT, spawn: P.ENTRY, npcs: KEEPERS,
    wild: {
      fog: view.fog, background: SLATE_CAVE.fog, hemi: SLATE_CAVE.hemi, sun: SLATE_CAVE.sun,
      space: view.space, floor: P.floorY, walkable: P.walkable, bounds, exits: P.EXITS, spawns: P.SPAWNS,
      camera: SLATE_CAVE.camera, frame: view.update,
    },
  };
  function safeSpawn(spawn: { x: number; z: number; rot: number }) {
    return Number.isFinite(spawn.x) && Number.isFinite(spawn.z) && Number.isFinite(spawn.rot) && P.walkable(spawn.x, spawn.z) && !colliders.blocked(spawn.x, spawn.z, 0.37) ? spawn : P.ENTRY;
  }
  const resolveStep = (at: Vector3, previous: Vector3, radius: number) => colliders.resolveStep(at, previous, radius);
  const oak = P.TREES[1];
  const nearOak = (at: { x: number; z: number }, r = 4.7) => quest.mask === (1 << P.GATES.length) - 1 && Math.hypot(oak.x - at.x, oak.z - at.z) < r;
  return { id: CAVE_ZONE, oak, nearOak, group, interior, colliders, nav, view, quest, safeSpawn, resolveStep };
}

export { CHAMBERS, SLATE_CAVE } from "../world/slateCave";
export type CaveZone = ReturnType<typeof buildCaveZone>;

export { aimTree, fitTalkWild, wildPersonY } from "./framing";
export { CAVE_COPY } from "../../content/cave-copy";
export { caveQuestTarget } from "./routing";

import { countPlay } from "../../state/playStats";
export function countCaveVisit() {
  countPlay("games", "slate-cove-cave");
}

export { drawCaveMap } from "./map";

export { updateKeeper } from "./keepers";
const exitLabel = CAVE_COPY.door.dryExit.en;
export const CAVE_PROMPTS = {
  main: { kind: "exit", id: "main", label: exitLabel, prompt: { kind: "exit", label: exitLabel, lt: CAVE_COPY.action.exit.lt } },
  cleft: { kind: "exit", id: "cleft", label: exitLabel, prompt: { kind: "exit", label: exitLabel, lt: CAVE_COPY.action.exit.lt } },
  oak: { kind: "tree", id: SLATE_CAVE.treeNpc, label: CAVE_COPY.action.oak.lt, prompt: { kind: "talk", label: CAVE_COPY.action.oak.lt } },
} as const;
