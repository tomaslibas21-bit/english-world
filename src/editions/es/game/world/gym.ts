import { GYM_MAT, GYM_STAGE as BASE } from "../../../../game/world/gym";

export { GYM_MAT };
export const GYM_STAGE: typeof BASE = {
  player: { x: -7.66, z: 2.64, heading: 0 },
  trainer: { x: -5.78, z: 2.64, heading: 0 },
  look: { x: -6.72, y: 0.72, z: 2.64 },
  // The east sightline crosses the boxing ring. Shoot from the south aisle.
  portrait: { x: -6.72, y: 1.55, z: 6.64, fov: 62 },
  desktop: { x: -6.72, y: 1.55, z: 6.40, fov: 44 },
  shiftY: 0,
  turn: { toes: 0.65, squats: 0.65, lunges: -0.95, pushups: 0.70 },
};
