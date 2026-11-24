import { groundsBounds } from "@/game/cave/groundsPlan";
import { WORLD } from "@/game/world/layout";
import { THEME } from "@/game/world/theme";
import { CAR } from "@/game/rides/drive";
import type { CarWaterPlan } from "@/game/world/rides";

const cenote = THEME.cenote;
const west = cenote?.walk && cenote.open ? groundsBounds(cenote.x, cenote.z, WORLD.minX) : null;
const inset = CAR.wide + 0.4;

export const CAR_WATER_PLAN: CarWaterPlan = {
  mainland: { x0: WORLD.minX, x1: WORLD.maxX, z1: WORLD.maxZ },
  extraRects: west ? [{ x0: west.minX + inset, x1: west.maxX + 3, z0: west.minZ + inset, z1: west.maxZ - inset }] : [],
  areas: [
    {
      id: "coast",
      approaches: [{ x: 84, z: -55, rot: Math.PI }, { x: 128, z: -55, rot: Math.PI }, { x: -96, z: -55, rot: Math.PI }],
      landings: [{ x: 84, z: -63, rot: 0 }, { x: 108, z: -63, rot: 0 }, { x: 128, z: -64, rot: 0 }],
    },
    {
      id: "hotel",
      approaches: [{ x: -104.65, z: -20, rot: Math.PI }],
      landings: [{ x: -104.65, z: -20, rot: 0 }, { x: -116, z: -20, rot: 0 }],
    },
    {
      id: "cenote",
      approaches: [{ x: -128.726, z: -14.251, rot: -0.72257 }, { x: -128.726, z: 2.251, rot: -2.41903 }],
      landings: [{ x: -127, z: -18, rot: Math.PI / 2 }, { x: -119, z: 6, rot: Math.PI / 2 }],
    },
  ],
};
