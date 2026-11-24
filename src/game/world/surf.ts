// Harbor Surf on Maple Harbor's west beach. The layout is shared by the town, map and walking guide.
export interface SurfSpot {
  /** The lane the lesson uses: its middle along the beach (x) and the waterline (z); out to sea is −z. */
  x: number; z: number;
  /** Where the lesson is started from and where the learner stands after it (by the school's boards), and how near
   *  one must be for its prompt (m). */
  start: { x: number; z: number; rot: number; r: number };
  /** Every place with the school's boards where the lesson's prompt shows too (x, z, how near one must be, m): the
   *  rack, the paddleboards, a kayak on the sand. The start's ring marks the first. */
  boards?: [number, number, number][];
  /** How near the school the first-time hint about the lesson comes up (m). */
  hintWithin?: number;
  /** The wave's colours: its face in the light, the water behind it. */
  face: string; deep: string;
}

const SHACK = { x: -99.8, z: -65.6, w: 4.8, d: 2.8, eave: 2.35, ridge: 3.05 };

export const HARBOR_SURF = {
  location: "harbor-surf",
  shack: SHACK,
  counter: { z: -67, w: 3.1, d: 0.42, top: 1.02 },
  coach: { x: SHACK.x, z: -66.45, rot: Math.PI },
  approach: { x: SHACK.x, z: -68.55, rot: 0 },
};

export const SURF_SPOT = {
  x: -94.5, z: -72.2,
  start: { x: -104.2, z: -69.9, rot: Math.PI, r: 2.6 },
  boards: [[-104.2, -68.6, 2.8], [-104.5, -65.8, 2.4], [-108, -68.9, 2.6]],
  hintWithin: 15,
  face: "#81c5d0", deep: "#2a93ad",
} satisfies SurfSpot;
