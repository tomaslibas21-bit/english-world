import type { CenoteRoute } from "@/game/world/cenoteTour";

export const CENOTE_ROUTE: CenoteRoute | null = {
  deck: [-129.1, -6],
  deckLook: [-135, 0.04, -6],
  deckGuide: [-131.25, -6.59],
  shore: [-76, -75.8],
  swimStart: [-73, -94],
  fishStop: [-68, -99],
  fishBend: [-65.5, -102.5],
  turtleStop: [-61.2, -105],
  returnBend: [-67, -104],
  returnEnd: [-72, -96],
  fish: {
    center: [-65, -100.5], radii: [1.25, 0.65], period: 12, count: 12,
    lengths: [0.25, 0.38], depths: [1.05, 1.35], side: "#77c7c0", tail: "#e4b860",
  },
  turtles: {
    center: [-57.5, -106],
    paths: [
      { radii: [1.4, 0.14], offset: [0.65, -0.20], period: 19, length: 0.90, depth: 0.95 },
      { radii: [1.2, 0.12], offset: [0.3, 1.28], period: 23, length: 0.72, depth: 1.22 },
    ],
    shell: "#688357", flipper: "#989a6a", underside: "#dbcc96",
  },
};
