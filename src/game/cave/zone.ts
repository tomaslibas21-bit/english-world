import type { Interior } from "../world/interiors";
import { THEME } from "../world/theme";
import { buildCave } from "./Cave";
import * as P from "./plan";

export { CaveQuest } from "./quest";
export { caveGateGrid, caveGateTarget } from "./routing";

export function buildCaveZone(id: string) {
  const view = buildCave();
  const interior: Interior = {
    id, group: view.group, colliders: view.colliders,
    w: P.BOUNDS.maxX - P.BOUNDS.minX, d: P.BOUNDS.maxZ - P.BOUNDS.minZ,
    exit: P.EXIT, spawn: P.ENTRY,
    npcs: P.ALUXES.map((a) => ({ npc: a.npc, x: a.x, z: a.z, rot: a.rot, ax: a.ax, az: a.az, sit: a.sit, seat: a.seat })),
    wild: {
      fog: view.fog, background: "#05232c", hemi: ["#a8eef2", "#1d5560", 1.55], sun: ["#fff1d0", 1.25],
      space: view.space, floor: P.floorY, walkable: P.walkable, bounds: P.BOUNDS,
      exits: THEME.cenote?.open ? P.EXITS : P.EXITS.slice(0, 1), spawns: P.SPAWNS,
      camera: { pitch: 0.3, dist: 9.5 },
      frame: (t, dt, cam, at, h) => view.update(t, dt, cam, at, h),
    },
  };
  return { interior, view };
}
