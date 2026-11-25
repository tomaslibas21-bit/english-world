// Which recorded voices the game plays (docs/VOICING-PLAN.md).
//   v1: the local Kokoro voices in audio/: 60 characters share 18 voices, one coach voice.
//   v2: the Gemini voices in audio-v2/: characters generally have their own voice id (g_<npcId>), and the example
//       answers come in a female or a male coach voice, matching the learner.
// Clip keys are audioKey(voice id, speed, text), so the two sets never mix. A build can choose with
// VITE_VOICES=v1|v2; tools read the same variable from the environment.
import { COACH_VOICE, KEEPER_NPC, type NpcDef } from "./npcs";
import { AMBIENT_VOICES } from "./ambient";

/** v2 since 28 Oct 2026: every clip recorded, checked with Whisper and uploaded (docs/VOICING-PLAN.md). */
const DEFAULT_VOICES: "v1" | "v2" = "v2";
const chosen = import.meta.env?.VITE_VOICES || (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITE_VOICES;
export const VOICES_V2 = (chosen || DEFAULT_VOICES) === "v2";

/** The clip folder next to the game and on R2 (`fluent-steps/game/<dir>`). */
export const audioDir = (v2 = VOICES_V2) => (v2 ? "audio-v2/" : "audio/");

/** A character's voice id. */
export const npcVoice = (n: NpcDef | undefined, v2 = VOICES_V2): string => {
  if (!n) return v2 ? "g_coach_f" : "af_bella";
  if (n.id === KEEPER_NPC) return ambientVoice("m", v2);
  return v2 ? `g_${n.id}` : n.voice;
};

/** The voice of the example answers: the learner's own gender in v2. */
export const coachVoice = (gender: "m" | "f" | undefined, v2 = VOICES_V2): string => (v2 ? (gender === "m" ? "g_coach_m" : "g_coach_f") : COACH_VOICE);

/** Every coach voice a hint must be recorded in. */
export const coachVoices = (v2 = VOICES_V2): string[] => (v2 ? ["g_coach_f", "g_coach_m"] : [COACH_VOICE]);

/** Passers-by in the town. */
export const ambientVoice = (g: "f" | "m", v2 = VOICES_V2): string => (v2 ? `g_amb_${g}` : AMBIENT_VOICES[g]);

/** Someone who sits in a convertible (content/rides.ts RIDE_OWNERS: `id`): a voice of their own (v2 only; with the
 *  first voices they speak as the passers-by do). */
export const rideVoice = (id: string, female: boolean, v2 = VOICES_V2): string => (v2 ? `g_ride_${id}` : AMBIENT_VOICES[female ? "f" : "m"]);

/** A passer-by calling after a car that went by too close (content/rides.ts RIDE_SHOUTS): two women's and two men's
 *  voices, `n` 0 or 1 (v2 only; with the first voices, the passers-by's own). */
export const shoutVoice = (female: boolean, n: number, v2 = VOICES_V2): string => (v2 ? `g_shout_${female ? "f" : "m"}${n % 2}` : AMBIENT_VOICES[female ? "f" : "m"]);
