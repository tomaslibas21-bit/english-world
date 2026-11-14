// Where one surfs in Puerto Colibrí (replaces src/game/world/surf.ts): off the beach west of El Muelle's pier, in
// front of the palapas there, clear of the pier (x −39 and east), of the lancha one takes out (east of the pier) and
// of the lanchas at anchor (theme.ts `lanchas.afloat`). The lesson starts beside La Ola's board rack (theme.ts
// `surfShack`), at the water's edge.
import type { SurfSpot } from "@/game/world/surf";
export type { SurfSpot } from "@/game/world/surf";

export const SURF_SPOT: SurfSpot | null = {
  x: -60, z: -72.2,
  start: { x: -44.6, z: -70.85, rot: Math.PI, r: 1.7 },
  face: "#9af2e4", deep: "#3fc9c6",
};
