export const GYM_MAT = { x: -6.4, z: 2.4, width: 3.6, depth: 2.6, radius: 1.65 };

export const GYM_STAGE = {
  player: { x: GYM_MAT.x, z: 3.22, heading: Math.PI / 2 },
  trainer: { x: GYM_MAT.x, z: 1.58, heading: Math.PI / 2 },
  look: { x: GYM_MAT.x, y: 0.72, z: GYM_MAT.z },
  portrait: { x: -0.5, y: 1.55, z: GYM_MAT.z, fov: 62 },
  desktop: { x: -1.9, y: 1.55, z: GYM_MAT.z, fov: 44 },
  shiftY: 0,
  turn: { toes: 0.45, squats: 0.45, lunges: -0.45, pushups: 0.45 },
};
