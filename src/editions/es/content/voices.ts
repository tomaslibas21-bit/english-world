// Which recorded voices the Spanish edition plays (replaces src/content/voices.ts). Every character has a voice id
// of its own, the example answers a female or a male coach voice matching the learner, and the clips live in
// audio-es/ (docs/es/VOICES.md: recorded with Gemini). Until a clip exists, the browser speaks the line in Spanish
// (src/game/audio.ts).
// Two accents, one switch: the Settings choice of Mexican or neutral Latin American Spanish (src/state/variety.ts,
// compose's variety) picks both the text (a line's neutral twin) and the voices: es_<npcId> speak Mexican Spanish,
// esn_<npcId> neutral Latin American Spanish, with the same Gemini voice and manner. One manifest holds both sets
// (the voice id is part of every clip's key), so text and pronunciation always match.
import type { NpcDef } from "./npcs";
import { variety } from "../../../convo/compose";

/** The Spanish edition has one kind of voices. */
export const VOICES_V2 = true;

/** The clip folder next to the game. */
export const audioDir = (_v2 = VOICES_V2) => "audio-es/";

/** The voice set of the Spanish the learner chose: "es" (Mexican, the default) or "esn" (neutral). */
const set = () => (variety() === "neutral" ? "esn" : "es");

/** A character's voice id. */
export const npcVoice = (n: NpcDef | undefined, _v2 = VOICES_V2): string => (n ? `${set()}_${n.id}` : `${set()}_coach_f`);

/** The voice of the example answers: the learner's own gender. */
export const coachVoice = (gender: "m" | "f" | undefined, _v2 = VOICES_V2): string => `${set()}_coach_${gender === "m" ? "m" : "f"}`;

/** Every coach voice a hint must be recorded in (in the Spanish chosen now). */
export const coachVoices = (_v2 = VOICES_V2): string[] => [`${set()}_coach_f`, `${set()}_coach_m`];

/** Passers-by in the town. */
export const ambientVoice = (g: "f" | "m", _v2 = VOICES_V2): string => `${set()}_amb_${g}`;
