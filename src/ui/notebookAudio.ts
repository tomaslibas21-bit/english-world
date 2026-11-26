import { NPCS } from "../content/npcs";
import { coachVoice, npcVoice } from "../content/voices";
import { cardKey, type Card } from "../state/cards";

export type NotebookLine = Pick<Card, "en" | "sentence" | "speakerId">;
type Clip = { kind: "phrase" | "source"; text: string; voice: string; speed: number };

export function notebookClips(line: NotebookLine, gender: "f" | "m" | undefined,
  hasClip: (voice: string, speed: number, text: string) => boolean): Clip[] {
  const npc = line.speakerId && Object.hasOwn(NPCS, line.speakerId) ? NPCS[line.speakerId] : undefined;
  const voice = npc ? npcVoice(npc) : coachVoice(gender);
  const speed = npc?.speed ?? 1;
  const source = line.sentence.say || line.sentence.en;
  const whole = cardKey(line.en) === cardKey(line.sentence.en);
  const clips: Clip[] = [];
  const phrase = whole ? source : line.en;
  if (hasClip(voice, speed, phrase)) clips.push({ kind: "phrase", text: phrase, voice, speed });
  if (!whole && hasClip(voice, speed, source)) clips.push({ kind: "source", text: source, voice, speed });
  return clips;
}
