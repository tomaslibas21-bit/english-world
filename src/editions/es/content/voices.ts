// Which recorded voices the Spanish edition plays (replaces src/content/voices.ts). Every character has a voice id
// of its own (es_<npcId>), the example answers a female or a male coach voice matching the learner, and the clips
// live in audio-es/ (docs/es/PLAN.md "Voices": recorded later with Gemini, by the owner's key). Until a clip
// exists, the browser speaks the line in Spanish (src/game/audio.ts).
import type { NpcDef } from "./npcs";

/** The Spanish edition has one set of voices. */
export const VOICES_V2 = true;

/** The clip folder next to the game and on R2. */
export const audioDir = (_v2 = VOICES_V2) => "audio-es/";

/** A character's voice id. */
export const npcVoice = (n: NpcDef | undefined, _v2 = VOICES_V2): string => (n ? `es_${n.id}` : "es_coach_f");

/** The voice of the example answers: the learner's own gender. */
export const coachVoice = (gender: "m" | "f" | undefined, _v2 = VOICES_V2): string => (gender === "m" ? "es_coach_m" : "es_coach_f");

/** Every coach voice a hint must be recorded in. */
export const coachVoices = (_v2 = VOICES_V2): string[] => ["es_coach_f", "es_coach_m"];

/** Passers-by in the town. */
export const ambientVoice = (g: "f" | "m", _v2 = VOICES_V2): string => `es_amb_${g}`;
