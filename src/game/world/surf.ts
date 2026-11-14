// Where one surfs in this town (the engine is src/game/surf/; the instructor's words are the edition's lines,
// src/content/surf.ts). Maple Harbor has no surf school yet: null. Puerto Colibrí's is src/editions/es/game/world/surf.ts.
export interface SurfSpot {
  /** The lane the lesson uses: its middle along the beach (x) and the waterline (z); out to sea is −z. */
  x: number; z: number;
  /** Where the lesson is started from and where the learner stands after it (by the school's boards), and how near
   *  one must be for its prompt (m). */
  start: { x: number; z: number; rot: number; r: number };
  /** The wave's colours: its face in the light, the water behind it. */
  face: string; deep: string;
}

export const SURF_SPOT: SurfSpot | null = null;
