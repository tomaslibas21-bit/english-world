import { ROAD_EDITION } from "../../content/road";
import type { SkyLook } from "../kit/openSky";

// How the desert looks in each town. A run starts in the late afternoon and ends as the sun reaches the far ranges:
// the timer is the time of day.

export type RoadLook = {
  sky: SkyLook[];
  /** The sun stands ahead and a little to one side: you drive toward the evening. Radians from straight ahead. */
  sunAzimuth: number;
  /** The rock of the mesas, in the light and in shade. */
  rock: [string, string];
  /** The desert floor's tones, the gravel shoulder, and the scrub. */
  sand: [string, string, string]; shoulder: string; scrub: [string, string];
  dust: string;
};

const MAPLE_HARBOR: RoadLook = {
  sky: [
    { zenith: "#1359c9", mid: "#55a4ee", horizon: "#ffdfa6", sun: "#fffbe9", halo: "#ffcd82", elevation: 9.5,
      ridgeFar: "#b9a4c2", ridgeNear: "#c58d7c", streak: "#fff6e6", streaks: 0.55, cloud: "#ffffff",
      light: "#ffe9c4", lightPower: 2.1, fillSky: "#eaf0f3", fillGround: "#d0a678", fill: 1.3 },
    { zenith: "#1f50bd", mid: "#f3a877", horizon: "#ffb85c", sun: "#fff0bd", halo: "#ff9f4f", elevation: 6.5,
      ridgeFar: "#a985ac", ridgeNear: "#b56f66", streak: "#ffd9b0", streaks: 0.75, cloud: "#ffe9d2",
      light: "#ffd39a", lightPower: 2.0, fillSky: "#e6dfe6", fillGround: "#cf9a70", fill: 1.26 },
    { zenith: "#2a3a96", mid: "#ec7868", horizon: "#ff9148", sun: "#ffd894", halo: "#ff6f3d", elevation: 3.6,
      ridgeFar: "#8a6aa0", ridgeNear: "#9a5560", streak: "#ffb08e", streaks: 0.9, cloud: "#ffc9b4",
      light: "#ffbd88", lightPower: 1.85, fillSky: "#d5c9e6", fillGround: "#c88a6c", fill: 1.24 },
  ],
  sunAzimuth: -0.24,
  rock: ["#d9825a", "#8a4a4c"],
  sand: ["#e4b077", "#d39a63", "#ecc089"], shoulder: "#c7a17b", scrub: ["#8f9c68", "#b0a66c"],
  dust: "#f3dcb8",
};

// Puerto Colibrí's desierto: a turquoise afternoon that turns pink and violet, ochre ground, purple ranges.
const PUERTO_COLIBRI: RoadLook = {
  sky: [
    { zenith: "#0668c4", mid: "#4cc3e2", horizon: "#ffe2a8", sun: "#fffbe9", halo: "#ffd27e", elevation: 9.5,
      ridgeFar: "#a79ccb", ridgeNear: "#b98a8c", streak: "#fff8ea", streaks: 0.5, cloud: "#ffffff",
      light: "#ffe6bb", lightPower: 2.1, fillSky: "#e3f1f3", fillGround: "#d3a66c", fill: 1.3 },
    { zenith: "#2247b6", mid: "#f78a8e", horizon: "#ffa652", sun: "#fff0bd", halo: "#ff8e55", elevation: 6.5,
      ridgeFar: "#9a78b8", ridgeNear: "#a8647c", streak: "#ffc9b8", streaks: 0.75, cloud: "#ffe1d6",
      light: "#ffcd98", lightPower: 2.0, fillSky: "#e7d9e6", fillGround: "#d0966a", fill: 1.26 },
    { zenith: "#2b2788", mid: "#e04a90", horizon: "#ff7c44", sun: "#ffd28c", halo: "#ff5f4a", elevation: 3.6,
      ridgeFar: "#7b5aa6", ridgeNear: "#8c4a72", streak: "#ff9fa0", streaks: 0.9, cloud: "#ffb9c0",
      light: "#ffb48c", lightPower: 1.85, fillSky: "#d3c1e8", fillGround: "#c9846a", fill: 1.24 },
  ],
  sunAzimuth: 0.22,
  rock: ["#cf9160", "#7f5466"],
  sand: ["#e3b06d", "#d1975a", "#eec381"], shoulder: "#c9a276", scrub: ["#84a06c", "#b3ad68"],
  dust: "#f5ddb6",
};

export const ROAD_LOOK: RoadLook = (ROAD_EDITION.id as string) === "puerto-colibri" ? PUERTO_COLIBRI : MAPLE_HARBOR;
