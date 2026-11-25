export const GYM_MAT = { x: -6.4, z: 2.4, width: 3.6, depth: 2.6, radius: 1.65 };

const heading = Math.PI / 2;
export const GYM_STAGE = {
  player: { x: GYM_MAT.x, z: 3.22, heading },
  trainer: { x: GYM_MAT.x, z: 1.58, heading },
  look: { x: GYM_MAT.x, y: 0.72, z: GYM_MAT.z },
  portrait: { x: -0.5, y: 1.55, z: GYM_MAT.z, fov: 62 },
  desktop: { x: -1.9, y: 1.55, z: GYM_MAT.z, fov: 44 },
  shiftY: 0,
};
