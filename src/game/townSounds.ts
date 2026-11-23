// What this edition's town sounds like (the Spanish edition has its own file with the same path under
// src/editions/es/): read by Game.ts for audio.ambience (soundscape.ts, audio.ts, docs/SOUNDS.md).
import type { Bed } from "./soundscape";

export const TOWN_SOUNDS = {
  /** Tropical birds and a marimba's far-off notes, instead of small-town chirps and a music box. */
  tropical: false,
  /** The market is a market hall with stalls, heard from the street around its door (Maple Harbor's is a
   *  supermarket: its murmur is indoors only). */
  marketOutdoors: false,
  /** The mini-games' beds, by mode id (audio.bed; batch 1–4 media, 23 Nov 2026): a room loop from public/sfx/ and
   *  music from the clip folder (R2 fluent-steps/game/audio-v2/ in English Master), with the loop points inside each
   *  file (tools: ~/claude-work/batch4/media/tools/loop_music.py). */
  beds: {
    gofish: { music: { file: "bed_gofish", start: 0.15, end: 29.565, gain: 0.16 } },
    billiards: {
      room: { file: "room-poolhall-mh.mp3", start: 0.15, end: 9.876, gain: 0.16 },
      music: { file: "bed_billiards", start: 0.15, end: 27.769, gain: 0.13 },
    },
    sea: {
      room: { file: "open-sea.mp3", start: 0.15, end: 9.206, gain: 0.18 },
      music: { file: "bed_sea", start: 0.15, end: 31.346, gain: 0.15 },
    },
  } satisfies Record<string, Bed>,
};
