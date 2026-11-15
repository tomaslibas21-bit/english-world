// What one can drive in Puerto Colibrí, and where it stands (replaces src/game/world/rides.ts; the engine is
// src/game/rides/): three convertibles at the curb with their owners in them, a lancha afloat off the beach by El
// Muelle. Headings as everywhere: 0 faces +Z (south), π/2 east, π north (the sea), −π/2 west.
import type { RidesPlan } from "@/game/world/rides";
import { THEME } from "@/game/world/theme";
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
  // afloat just past where one wades, off the beach east of El Muelle, its bow out to sea (where a lancha of the
  // theme's `lanchas.afloat` lay)
  boats: [{ id: "muelle", x: -13.5, z: -79.7, rot: Math.PI - 0.25, stripe: "#f6a800" }],
  // the airport's forecourt at the end of avenida Juárez, Brotecito's at the end of avenida del Puerto
  lots: [{ x0: 126, x1: 134, z0: -30, z1: 14 }, { x0: 126, x1: 137, z0: -59.5, z1: -50.5 }],
  // the lighthouse's rocks
  rocks: [[104, -88, 7.5]],
  deep: "#1fb3c6",
  // the topes across avenida Juárez at the zócalo's ends and across avenida del Puerto (theme.ts `topes`)
  bumps: (THEME.topes?.at ?? []).map(([x1, z1, x2, z2]) => [x1, z1, x2, z2]),
};
