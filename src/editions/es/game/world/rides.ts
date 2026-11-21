// What one can drive in Puerto Colibrí, and where it stands (replaces src/game/world/rides.ts; the engine is
// src/game/rides/): three convertibles at the curb with their owners in them, a lancha afloat off the beach by El
// Muelle. Headings as everywhere: 0 faces +Z (south), π/2 east, π north (the sea), −π/2 west.
import type { RidesPlan } from "@/game/world/rides";
import { THEME } from "@/game/world/theme";
import { GAS_FORECOURT, PARKING_LOTS } from "@/game/world/layout";
export type { CarSpot, BoatSpot, RidesPlan } from "@/game/world/rides";

export const RIDES: RidesPlan = {
  cars: [
    // avenida Juárez's north curb by the park, down the avenue from the airport's door, the road ahead of it clear
    // (one person in it: the avenue is among the town's busiest views; the pair sits in the quiet one on Flamboyán)
    { id: "park", x: 80.5, z: -11.8, rot: -Math.PI / 2, paint: "#f0508f", inside: "#fff4e3", people: 1 },
    // calle Itzamná's last block, looking out over avenida del Puerto to the sea
    { id: "east", x: 72.8, z: -42, rot: Math.PI, paint: "#18b7ae", people: 1 },
    // calle Flamboyán beside the mercado, facing the sea
    { id: "west", x: -67.2, z: -41, rot: Math.PI, paint: "#f6b21b", inside: "#fff4e3", people: 2 },
  ],
  // two lanchas lie in the shallows off the beach, each straight down a flight of the malecón's steps (x −12, by El
  // Muelle, and x 12) and a few steps from the dry sand, their bows out to sea: walked up to and taken
  boats: [
    { id: "muelle", x: -11.5, z: -74.3, rot: Math.PI - 0.25, stripe: "#f6a800" },
    { id: "playa", x: 11.5, z: -74.5, rot: Math.PI + 0.3, stripe: "#e4007c" },
  ],
  // the airport's, Brotecito's and the gas station's forecourts, and the asphalt parking bays
  lots: [{ x0: 126, x1: 134, z0: -30, z1: 14 }, { x0: 126, x1: 137, z0: -59.5, z1: -50.5 }, GAS_FORECOURT, ...PARKING_LOTS],
  // the lighthouse's rocks
  rocks: [[104, -88, 7.5]],
  deep: "#1fb3c6",
  // the topes across avenida Juárez at the zócalo's ends and across avenida del Puerto (theme.ts `topes`)
  bumps: (THEME.topes?.at ?? []).map(([x1, z1, x2, z2]) => [x1, z1, x2, z2]),
};
