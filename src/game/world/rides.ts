// What one can drive in this town, and where it stands (src/game/rides/): convertibles parked at the curb with their
// owners in them, a small boat at the pier. Maple Harbor's; the Spanish edition has its own file of this name for
// Puerto Colibrí. Headings as everywhere: 0 faces +Z (south), π/2 east, π north (the sea), −π/2 west.
import type { Rect } from "../rides/drive";

export interface CarSpot {
  id: string; x: number; z: number; rot: number;
  /** The body's colour and the seats'. */
  paint: string; inside?: string;
  /** Who sits in it (one or two; one in the simple quality). */
  people: 1 | 2;
}
export interface BoatSpot { id: string; x: number; z: number; rot: number; stripe: string; hull?: string }

export interface RidesPlan {
  cars: CarSpot[];
  boats: BoatSpot[];
  /** Asphalt beside the streets themselves (layout.ts ROADS): forecourts and lots (a car goes anywhere open and dry;
   *  on asphalt it may pick up speed, and where asphalt ends is a kerb it feels). */
  lots: Rect[];
  /** Rocks in the bay (x, z, radius): a boat and a swimmer go round them. */
  rocks: [number, number, number][];
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
  // the airport's forecourt at the end of Main Street, Sproutly's at the end of Harbor Road
  lots: [{ x0: 126, x1: 134, z0: -30, z1: 14 }, { x0: 126, x1: 137, z0: -59.5, z1: -50.5 }],
  // the lighthouse's rocks
  rocks: [[104, -88, 7.5]],
  deep: "#2a93ad",
  // (Maple Harbor has none in its streets; the kerbs are felt everywhere)
  bumps: [],
};
