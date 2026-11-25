// How the town works in this edition. The engine is shared with the Spanish edition (branch spanish-edition), whose
// file of this name has many more switches, all off for Maple Harbor, and whose src/editions/es/game/world/theme.ts
// sets them for Puerto Colibrí. Maple Harbor takes two of them (5 Nov 2026): the conversation's camera, and the spots
// that bring far speakers into their conversation's picture.

import type { FlyKey } from "../flyover";

type TalkLens = [x: number, y: number, z: number];

export interface TownTheme {
  /** The first visit's flight over the town (game/flyover.ts): the points the camera glides along and what it looks at
   *  from each, ending in front of the airport. Empty: no flight. */
  flyover: FlyKey[];
  /** The conversation's face fitter. `reach` limits which cast members can take the camera from the host.
   *  `max` limits the lens distance. `hints` adds room-space lens positions by room and actor. */
  talkCamera: { reach: number; max: number; hints?: Record<string, Record<string, [TalkLens, ...TalkLens[]]>> } | null;
  /** Where people stand in the rooms instead of where interiors.ts puts them, by room id and character (`ax`/`az`:
   *  where the player stands to talk to them): a conversation's other speaker near enough to share its picture. */
  roomSpots: Record<string, Record<string, { x: number; z: number; rot: number; ax?: number; az?: number }>>;
  /** The daylight (Game.setupLights and the town's haze; the rooms keep their own strengths): the sky's fill from
   *  above (`sky`) and what the ground throws back (`ground`) with their strength outdoors, the sun and its strength
   *  outdoors, the sky dome from the zenith down to the horizon, and the haze far things fade into. */
  light: { sky: string; ground: string; fill: number; sun: string; sunPower: number; dome: [string, string, string]; haze: string };
}

export const THEME: TownTheme = {
  // in from the bay over the beach, along the shore with the square and its fountain below, and down to the airport
  flyover: [
    { pos: [-95, 62, -165], look: [-30, 0, -30] },
    { pos: [-20, 46, -125], look: [25, 0, -30] },
    { pos: [60, 30, -85], look: [105, 2, -15] },
    { pos: [104, 13, -30], look: [140, 4, -8] },
  ],
  talkCamera: {
    reach: 12,
    max: 30,
    hints: {
      // Customer side, high enough for the chin ray to clear the teller strip above the 2.30 m glass.
      bank: { aaron: [[1.9, 2.98, -3.02], [-1.9, 2.98, -3.02]] },
    },
  },
  // and the two who stood too far away come nearer, where Puerto Colibrí's Don Arturo and Doña Lupita stand: Harold
  // watches over the statue by the gallery's entrance, near Ben's desk (s70: his "Please don't touch the paintings!"),
  // and Rita is in the hallway by the vacant apartment's door (s82: the new neighbor's door), with Mr. Patel just
  // inside it (s81), so that she can back the learner up from there on p29 (with him by the window, the door's leaf
  // hid her from a camera on his side)
  roomSpots: {
    museum: { harold: { x: -4.5, z: 0.3, rot: -0.53 } },
    apartments: { patel: { x: -1.2, z: 2.4, rot: 0.25 }, rita: { x: -4.4, z: 0.9, rot: 0.1, ax: -4.2, az: 3.1 } },
  },
  // an October afternoon (16 Nov 2026): a warmer sun and a little more of it, the fill from above no longer blue, the
  // ground's bounce the colour of dry leaves and not of a lawn, a cream horizon, a warm haze. (Before: sky #e4f3ff,
  // ground #8fbf6a, fill 1.4, sun #fff0d8 at 2.75, dome #5fb0e8 / #a9d8f5 / #fdf0d8, haze #cfe8f5.)
  light: { sky: "#eef1ee", ground: "#a9ac84", fill: 1.38, sun: "#ffe7c2", sunPower: 2.9, dome: ["#67a3d3", "#b9d7e5", "#fcebd2"], haze: "#e3e6e0" },
};
