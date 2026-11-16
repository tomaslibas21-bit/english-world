// Where one surfs in Puerto Colibrí (replaces src/game/world/surf.ts): off the beach west of El Muelle's pier, in
// front of the palapas there, clear of the pier (x −39 and east), of the lancha one takes out (east of the pier) and
// of the lanchas at anchor (theme.ts `lanchas.afloat`). The lesson starts beside La Ola's board rack (theme.ts
// `surfShack`), at the water's edge.
import type { SurfSpot } from "@/game/world/surf";
export type { SurfSpot } from "@/game/world/surf";

export const SURF_SPOT: SurfSpot | null = {
  x: -60, z: -72.2,
  start: { x: -44.6, z: -70.85, rot: Math.PI, r: 2.6 },
  // (16 Nov 2026, the owner: "no notification when I'm at the board": he stood on the yellow kayak) the rack along the
  // palapa's seaward side, the paddleboards behind it, the kayak on the sand (theme.ts surfShack), each with room
  boards: [[-44.3, -70.2, 2.8], [-41.7, -68.2, 2.4], [-49.6, -69.75, 2.6]],
  hintWithin: 15,
  face: "#9af2e4", deep: "#3fc9c6",
};
