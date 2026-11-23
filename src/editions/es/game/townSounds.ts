// What Puerto Colibrí sounds like (the Spanish edition's file for src/game/townSounds.ts): read by Game.ts for
// audio.ambience (soundscape.ts, audio.ts, docs/SOUNDS.md).
import type { Bed } from "../../../game/soundscape";

export const TOWN_SOUNDS = {
  /** Tropical birds (a few seconds of a recording now and then) and a marimba's far-off notes on the square. */
  tropical: true,
  /** The Mercado Municipal is a market hall: its murmur reaches the street around its door. */
  marketOutdoors: true,
  /** The mini-games' beds, by mode id (audio.bed; batch 1–4 media, 23 Nov 2026): a room loop from public/sfx/ and
   *  music from the clip folder (R2 spanish-master-en/game/audio-es/, which Spanish Master reads too), with the loop
   *  points inside each file (tools: ~/claude-work/batch4/media/tools/loop_music.py). */
  beds: {
    loteria: {
      room: { file: "plaza-night.mp3", start: 0.15, end: 10.098, gain: 0.16 },
      music: { file: "bed_loteria", start: 0.15, end: 34.95, gain: 0.13 },
    },
    billiards: {
      room: { file: "room-cantina.mp3", start: 0.15, end: 9.862, gain: 0.16 },
      music: { file: "bed_billiards", start: 0.15, end: 27.943, gain: 0.12 },
    },
    sea: {
      room: { file: "open-sea.mp3", start: 0.15, end: 9.206, gain: 0.18 },
      music: { file: "bed_sea", start: 0.15, end: 31.642, gain: 0.14 },
    },
  } satisfies Record<string, Bed>,
};
