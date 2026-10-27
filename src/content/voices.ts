// Which recorded voices the game plays (docs/VOICING-PLAN.md).
//   v1: the local Kokoro voices in audio/: 60 characters share 18 voices, one coach voice.
//   v2: the Gemini voices in audio-v2/: every character has a voice id of its own (g_<npcId>), and the example
//       answers come in a female or a male coach voice, matching the learner.
// Clip keys are audioKey(voice id, speed, text), so the two sets never mix. A build can choose with
// VITE_VOICES=v1|v2; tools read the same variable from the environment.
import { COACH_VOICE, type NpcDef } from "./npcs";
import { AMBIENT_VOICES } from "./ambient";

/** v2 goes on only after the new clips are recorded, checked and uploaded. */
const DEFAULT_VOICES: "v1" | "v2" = "v1";
const chosen = import.meta.env?.VITE_VOICES || (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITE_VOICES;
export const VOICES_V2 = (chosen || DEFAULT_VOICES) === "v2";

/** The clip folder next to the game and on R2 (`fluent-steps/game/<dir>`). */
export const audioDir = (v2 = VOICES_V2) => (v2 ? "audio-v2/" : "audio/");

/** A character's voice id. */
export const npcVoice = (n: NpcDef | undefined, v2 = VOICES_V2): string => (n ? (v2 ? `g_${n.id}` : n.voice) : v2 ? "g_coach_f" : "af_bella");

/** The voice of the example answers: the learner's own gender in v2. */
export const coachVoice = (gender: "m" | "f" | undefined, v2 = VOICES_V2): string => (v2 ? (gender === "m" ? "g_coach_m" : "g_coach_f") : COACH_VOICE);

/** Every coach voice a hint must be recorded in. */
export const coachVoices = (v2 = VOICES_V2): string[] => (v2 ? ["g_coach_f", "g_coach_m"] : [COACH_VOICE]);

/** Passers-by in the town. */
export const ambientVoice = (g: "f" | "m", v2 = VOICES_V2): string => (v2 ? `g_amb_${g}` : AMBIENT_VOICES[g]);
