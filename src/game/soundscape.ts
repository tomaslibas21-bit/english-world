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
export const BIRDSONG = { file: "birds.mp3", length: 9.5, gain: 0.085 } as const;

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

// ---- Recorded effects, the mini-games' rooms and music (batch 1–4 media, 23 Nov 2026; docs/SOUNDS.md).

/** The synthesized effects (audio.ts sfx): what plays until a recording is loaded, or without one. */
export type SynthName = "success" | "seaBell" | "pop" | "door" | "cheer" | "soft" | "listen" | "coin" | "car" | "error" | "ring" | "beep" | "knock" | "tick" | "horn" | "hornReply"
  | "doubleHonk" | "chirp" | "glass" | "hazardTick" | "ding" | "loteriaFlip" | "loteriaBean" | "cueStrike" | "poolClick" | "poolCushion" | "poolDrop";

/** A recorded effect: its takes in public/sfx/ (mono MP3, peak −3 dB), one picked at random each time with its speed
 *  varied a little, so a run of them never sounds copied. `gain`: its level on the effects bus (the synthesized effects
 *  peak at about 0.18 × the volume). `synth`: the synthesized sound that stands in until the takes are loaded, offline
 *  or when a file is missing; a name of the synthesized set stands in for itself; null: nothing (the caller may play
 *  its own stand-in, see audio.sample). */
export interface SampleDef { files: readonly string[]; gain: number; synth?: SynthName | null }

const takes = (stem: string, n: number) => Array.from({ length: n }, (_, i) => `${stem}-${i + 1}.mp3`);

export const SAMPLES = {
  // the pool hall (both towns)
  cueStrike: { files: takes("cue-strike", 4), gain: 0.42 },
  poolClick: { files: takes("pool-clack", 5), gain: 0.5 },
  poolCushion: { files: ["pool-cushion.mp3"], gain: 0.42 },
  poolDrop: { files: ["pool-drop.mp3"], gain: 0.45 },
  breakShot: { files: ["pool-break.mp3"], gain: 0.5, synth: "poolClick" },
  chalk: { files: ["chalk.mp3"], gain: 0.3, synth: null },
  winSting: { files: ["win-sting.mp3"], gain: 0.4, synth: "cheer" },
  // the cards: Go Fish (Maple Harbor) and Lotería (Puerto Colibrí)
  cardShuffle: { files: ["card-shuffle.mp3"], gain: 0.4, synth: null },
  cardSlide: { files: takes("card-slide", 3), gain: 0.35, synth: "tick" },
  cardFlip: { files: takes("card-flip", 2), gain: 0.35, synth: "loteriaFlip" },
  pairChime: { files: ["pair-chime.mp3"], gain: 0.38, synth: "success" },
  bloop: { files: ["bloop.mp3"], gain: 0.38, synth: null },
  winJingle: { files: ["win-jingle.mp3"], gain: 0.38, synth: "listen" },
  cardSlap: { files: takes("card-slap", 2), gain: 0.4, synth: "loteriaFlip" },
  beanDrop: { files: ["bean.mp3"], gain: 0.32, synth: "loteriaBean" },
  crowdCheer: { files: ["crowd-cheer.mp3"], gain: 0.4, synth: "cheer" },
  // the open water (both towns)
  seaBell: { files: ["buoy-bell.mp3"], gain: 0.45 },
  buoyBonk: { files: takes("buoy-bonk", 2), gain: 0.45, synth: null },
  bowSplash: { files: ["bow-splash.mp3"], gain: 0.35, synth: null },
  gull: { files: takes("gull", 3), gain: 0.22, synth: null },
  boatTurn: { files: ["boat-turn.mp3"], gain: 0.35, synth: null },
  gateWhoosh: { files: ["gate-whoosh.mp3"], gain: 0.3, synth: null },
  // the road game
  paperBurst: { files: ["paper-burst.mp3"], gain: 0.32, synth: null },
  // a car that crashes (rides/crash.ts)
  carBump: { files: ["car-bump.mp3"], gain: 0.45, synth: null },
  carCrunch: { files: ["car-crunch.mp3"], gain: 0.5, synth: null },
  paintChips: { files: ["paint-chips.mp3"], gain: 0.3, synth: null },
  steamHiss: { files: ["steam-hiss.mp3"], gain: 0.3, synth: null },
  glass: { files: ["glass.mp3"], gain: 0.32 },
  doubleHonk: { files: ["honk.mp3"], gain: 0.35 },
  chirp: { files: ["alarm-chirp.mp3"], gain: 0.25 },
  // (the hazard relay stays synthesized: two generations came out as a steady rattle, not a tick and a tock)
  ding: { files: ["repair-ding.mp3"], gain: 0.35 },
} as const satisfies Record<string, SampleDef>;
export type SampleName = keyof typeof SAMPLES;
export const isSample = (name: string): name is SampleName => Object.prototype.hasOwnProperty.call(SAMPLES, name);

/** The takes a mini-game loads as it starts (audio.preload), so its first move already sounds recorded. */
export const MODE_SAMPLES: Record<string, readonly SampleName[]> = {
  billiards: ["cueStrike", "poolClick", "poolCushion", "poolDrop", "breakShot", "chalk", "winSting"],
  gofish: ["cardShuffle", "cardSlide", "cardFlip", "pairChime", "bloop", "winJingle"],
  loteria: ["cardShuffle", "cardFlip", "cardSlap", "beanDrop", "crowdCheer"],
  sea: ["seaBell", "buoyBonk", "bowSplash", "gull", "boatTurn", "gateWhoosh"],
  road: ["paperBurst", "carBump", "carCrunch"],
};

/** One loop of a mini-game's bed, played between `start` and `end` (seconds) inside its file, with a little of the
 *  loop before and after them, so the seam is silent whatever padding the decoder adds. `gain`: its level beside the
 *  effects. A room's file is in public/sfx/ (small, in git); music is in the clip folder (R2 in the courses: kept out
 *  of git and the courses' builds), named without ".mp3". */
export interface BedLoop { file: string; start: number; end: number; gain: number }
/** What a mini-game sounds like under its voices (TOWN_SOUNDS.beds, by mode id): its room and its music. Both play
 *  on the effects side, a little lower while a voice speaks or the microphone listens (never cut, so a caller's
 *  every line doesn't pump them), and the radio waits while the music plays (radio hold "bed"). */
export interface Bed { room?: BedLoop; music?: BedLoop }
/** How much a bed drops while a voice speaks or the microphone listens (about −7 dB). */
export const BED_DUCK = 0.45;
