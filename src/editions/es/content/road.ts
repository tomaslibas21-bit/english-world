export { ROAD_CONES, ROAD_UI } from "../../../content/road";

// Calle Ceiba continues inland past Calle Uxmal.
export const ROAD_EDITION = {
  id: "puerto-colibri",
  walkAnywhere: false,
  sign: "Carretera del Desierto",
  driver: { npc: "vinnie", situation: "s66-taxi" },
  edge: {
    street: "Center Street", x: 0, z: 93.7, width: 9, outward: 0,
    sign: { x: -7, z: 91, rot: Math.PI },
    return: { x: 1.65, z: 88.5, rot: Math.PI },
  },
} as const;
