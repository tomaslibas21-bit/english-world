import { audioKey } from "../../audio-key";
import { EDITION } from "../../edition";
import { NPCS, type NpcDef } from "../npcs";
import { coachVoice, npcVoice } from "../voices";

/** PC's broadcasts always use the Mexican cast, independent of Settings. */
export const sceneNpcVoice = (npc: NpcDef | undefined): string =>
  EDITION.id === "es" ? (npc ? `es_${npc.id}` : "es_coach_f") : npcVoice(npc, true);

const sceneCoachVoice = (gender: "m" | "f"): string =>
  EDITION.id === "es" ? `es_coach_${gender}` : coachVoice(gender, true);

export type LearnerVoice = (npcId: string) => readonly string[];

/** A visitor voice can replace this policy without changing a scene's authored text. */
export const learnerVoices: LearnerVoice = (npcId) => {
  const gender = NPCS[npcId]?.gender;
  if (!gender) return [];
  return gender === "f"
    ? [sceneCoachVoice("m"), sceneCoachVoice("f")]
    : [sceneCoachVoice("f"), sceneCoachVoice("m")];
};

export function learnerTake(
  npcId: string,
  speed: number,
  text: string,
  manifest: Readonly<Record<string, number>>,
  learnerVoice: LearnerVoice = learnerVoices,
): { voice: string; clipKey: string; duration: number } | null {
  for (const voice of learnerVoice(npcId)) {
    const clipKey = audioKey(voice, speed, text);
    const duration = manifest[clipKey];
    if (Number.isFinite(duration) && duration > 0) return { voice, clipKey, duration };
  }
  return null;
}
