// The world's sounds, the part that is plain arithmetic (the sounds themselves: audio.ts): what the player walks
// on, how each surface sounds underfoot, how loud a place's quiet loop is where they stand, and the three short
// recordings in public/sfx/.
//
// Everything here is meant to sit under the voices: a soft sea near the shore, a murmur by the market, steps that
// change from stone to sand to boards. Nothing plays in a conversation, while a voice speaks or while the
// microphone listens (audio.ts: hush), and the "Sounds" setting scales all of it.

/** What is underfoot. */
export type Surface = "stone" | "sand" | "grass" | "wood" | "tile";

/** Where the player stands, as far as the ground's sound goes. */
export interface Footing {
  /** in a room (its floor: boards if the room is a warm one, else tiles) */
  indoor: boolean;
  warm?: boolean;
  /** on something raised: a pier's or a terrace's boards, a bench (ledges.ts) */
  raised: boolean;
  x: number;
  z: number;
  /** the beach starts seaward of this line (layout.ts BEACH_Z; the sea is at smaller z) */
  beachZ: number;
  /** the park's lawn (layout.ts PARK) */
  park: { x1: number; z1: number; x2: number; z2: number };
}

export function surfaceAt(f: Footing): Surface {
  if (f.indoor) return f.warm ? "wood" : "tile";
  if (f.raised) return "wood";
  if (f.z < f.beachZ) return "sand";
  if (f.x > f.park.x1 && f.x < f.park.x2 && f.z > f.park.z1 && f.z < f.park.z2) return "grass";
  return "stone";
}

/** One footstep on a surface: a short burst of noise through a band (`f` Hz, `q`), `len` seconds long after an
 *  `attack`, at `vol` (of the volume setting); `rate` is how fast the noise plays (lower: duller). `grain` adds a
 *  faint high rustle (sand, grass), `knock` a short low note (boards), `click` a tiny bright tap (tiles). */
export interface StepSound {
  f: number; q: number; len: number; attack: number; vol: number; rate: number;
  grain?: { f: number; vol: number };
  knock?: { f: number; vol: number };
  click?: { f: number; vol: number };
}
export const STEPS: Record<Surface, StepSound> = {
  stone: { f: 1150, q: 1.1, len: 0.09, attack: 0.006, vol: 0.07, rate: 1 },
  sand: { f: 520, q: 0.6, len: 0.15, attack: 0.014, vol: 0.06, rate: 0.75, grain: { f: 3000, vol: 0.012 } },
  grass: { f: 760, q: 0.5, len: 0.13, attack: 0.012, vol: 0.05, rate: 0.85, grain: { f: 4200, vol: 0.014 } },
  wood: { f: 420, q: 2.2, len: 0.1, attack: 0.005, vol: 0.07, rate: 0.8, knock: { f: 150, vol: 0.018 } },
  tile: { f: 650, q: 1.1, len: 0.09, attack: 0.006, vol: 0.09, rate: 1, click: { f: 1900, vol: 0.012 } },
};

/** The short recordings (public/sfx/, about 70 kB each, fetched the first time they are wanted). A loop repeats
 *  between `start` and `end` seconds: the file carries a little of the loop before and after those points, so the
 *  seam is silent whatever padding the MP3 decoder adds. `gain`: its loudness at full level, of the volume setting. */
export const LOOPS = {
  /** small waves on sand */
  sea: { file: "sea.mp3", start: 0.15, end: 7.75, gain: 0.5 },
  /** a market's far-off murmur, no words */
  market: { file: "market.mp3", start: 0.15, end: 7.95, gain: 0.26 },
} as const;
export type LoopName = keyof typeof LOOPS;
/** Tropical birds, nine and a half seconds of them: a few seconds are played now and then, never the whole. */
export const BIRDSONG = { file: "birds.mp3", length: 9.5, gain: 0.11 } as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** How loud the surf is `metres` from the waterline (negative: in the water): full in the shallows, gone by 38 m. */
export function surfLevel(metres: number): number {
  return Math.pow(clamp01(1 - metres / 38), 1.5);
}

/** How loud a place's murmur is `metres` from its door: full at the door, gone by `reach`. */
export function nearLevel(metres: number, reach = 26): number {
  const k = clamp01(1 - metres / reach);
  return k * k * (3 - 2 * k);
}
