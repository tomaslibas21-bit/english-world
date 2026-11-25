import { NPCS } from "../content/npcs";
import { npcVoice } from "../content/voices";
import { audio } from "../game/audio";
import { game } from "../game/gameRef";
import type { TranscriptLine } from "../state/store";

export async function replayNpc(lines: readonly TranscriptLine[], slow: boolean) {
  const session = game?.activeSession;
  session?.stopListening();
  for (const line of lines) {
    if (game?.activeSession !== session || (session && !session.active)) return;
    if (line.who !== "npc" || !line.npc || !line.sentence) continue;
    const npc = NPCS[line.npc];
    const visual = session?.replayVoice(line.npc, line.id);
    const args: Parameters<typeof audio.play> = [npcVoice(npc), npc?.speed ?? 1, line.sentence.say,
      { slow, male: npc?.gender === "m", ...(visual ? { visual } : {}) }];
    if (!(await (session?.playVoice(...args) ?? audio.play(...args)))) return;
  }
}
