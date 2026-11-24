// What one can drive in this town, and where it stands (src/game/rides/): convertibles parked at the curb with their
// owners in them, a small boat at the pier. Maple Harbor's; the Spanish edition has its own file of this name for
// Puerto Colibrí. Headings as everywhere: 0 faces +Z (south), π/2 east, π north (the sea), −π/2 west.
import type { Rect } from "../rides/drive";
import { LIGHTHOUSE, PARKING_LOTS, WORLD } from "./layout";
import type { IslandPlan } from "./island";

export interface CarSpot {
  id: string; x: number; z: number; rot: number;
  /** The body's colour and the seats'. */
  paint: string; inside?: string;
  model?: string; speedLimit?: number;
  /** Who sits in it (one or two; one in the simple quality). */
  people: 1 | 2;
}
export interface BoatSpot { id: string; x: number; z: number; rot: number; stripe: string; hull?: string }

interface CarWaterSite { x: number; z: number; rot: number }

export interface CarWaterPlan {
  /** Mainland world edges. The driving ground takes its north edge from the current bay. */
  mainland: Pick<Rect, "x0" | "x1" | "z1">;
  extraRects: readonly Rect[];
  approach: CarWaterSite;
  /** Mainland candidates for a dry car and a person beside it. Check occupancy before use. */
  landings: readonly CarWaterSite[];
}

export interface RidesPlan {
  cars: CarSpot[];
  boats: BoatSpot[];
  carWater: CarWaterPlan;
  /** Asphalt beside the streets themselves (layout.ts ROADS): forecourts and lots (a car goes anywhere open and dry;
   *  on asphalt it may pick up speed, and where asphalt ends is a kerb it feels). */
  lots: Rect[];
  /** Rocks in the bay (x, z, radius): a boat and a swimmer go round them. */
  rocks: [number, number, number][];
  island?: IslandPlan;
  /** The sea's colour seen from under it (a dive). */
  deep: string;
  /** Speed bumps across the streets (each from x1, z1 to x2, z2): a car pitches and bounces over them and slows. */
  bumps: [number, number, number, number][];
}

export const RIDES: RidesPlan = {
  cars: [
    // Main Street's north curb by the park, down the street from the airport's door, the road ahead of it clear
    // (one person in it: the street is among the town's busiest views; the pair sits in the quiet west one)
    { id: "park", x: 80.5, z: -11.8, rot: -Math.PI / 2, paint: "#22b8b0", people: 1 },
    // East Street's last block, looking out over Harbor Road to the sea
    { id: "east", x: 72.8, z: -42, rot: Math.PI, paint: "#f4b63a", inside: "#fbf3e1", people: 1 },
    // West Street beside the market, facing the sea
    { id: "west", x: -67.2, z: -41, rot: Math.PI, paint: "#ff7a59", people: 2 },
  ],
  // one moored at the foot of the pier, along its east edge, its bow out to sea: taken from the sand beside the pier
  // (the restaurant and its railed walk fill the pier: there are no boards to stand on beside a boat); one lying in
  // the shallows off the beach further east. Both a few steps from the dry sand: walked up to and taken
  boats: [
    { id: "pier", x: -17.15, z: -75, rot: Math.PI, stripe: "#2f6db5" },
    { id: "beach", x: -6.5, z: -74.3, rot: Math.PI - 0.3, stripe: "#e2483d" },
  ],
  carWater: {
    mainland: { x0: WORLD.minX, x1: WORLD.maxX, z1: WORLD.maxZ },
    extraRects: [],
    approach: { x: 24, z: -55, rot: Math.PI },
    landings: [{ x: 24, z: -64, rot: 0 }, { x: 76, z: -64, rot: 0 }, { x: -96, z: -64, rot: 0 }],
  },
  // the airport's and Sproutly's forecourts, and the asphalt parking lots
  lots: [{ x0: 126, x1: 134, z0: -30, z1: 14 }, { x0: 126, x1: 137, z0: -59.5, z1: -50.5 }, ...PARKING_LOTS],
  rocks: [],
  island: {
    name: "Lighthouse",
    lt: "Švyturys",
    center: LIGHTHOUSE,
    outline: [[-13, -2], [-11, -7], [-6, -10], [3, -10.5], [10, -8.5], [14, -4.5], [15, 0],
      [12, 4.5], [7, 6.6], [0, 7], [-7, 6.5], [-11, 4.6], [-13, 1.5]]
      .map(([x, z]) => ({ x: LIGHTHOUSE.x + x, z: LIGHTHOUSE.z + z })),
    y: 0.72,
    jetty: { x0: 85, x1: 95, z0: -85.05, z1: -81.25, y: 0.78 },
    berth: { x: 82.6, z: -83.1, rot: Math.PI / 2 },
    cottage: { x: 111.7, z: -88, w: 4.6, d: 3.8 },
    bench: { x: 113.9, z: -84.45 },
    keeper: { x: 110, z: -85.05, approach: { x: 108.4, z: -83.55 }, says: "lighthouse_keeper", repeat: "lighthouse_keeper_2" },
  },
  deep: "#2a93ad",
  // (Maple Harbor has none in its streets; the kerbs are felt everywhere)
  bumps: [],
};
