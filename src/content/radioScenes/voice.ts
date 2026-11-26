import { audioKey } from "../../audio-key";
import { NPCS } from "../npcs";
import { coachVoice } from "../voices";

export type LearnerVoice = (npcId: string) => readonly string[];

/** A visitor voice can replace this policy without changing a scene's authored text. */
export const learnerVoices: LearnerVoice = (npcId) => {
  const gender = NPCS[npcId]?.gender;
  if (!gender) return [];
  return gender === "f"
    ? [coachVoice("m", true), coachVoice("f", true)]
    : [coachVoice("f", true), coachVoice("m", true)];
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
