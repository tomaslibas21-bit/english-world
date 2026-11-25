import type { TurnOut } from "../../convo/dialogue";
import type { VoiceVisualOwner } from "./contract";

export type SessionReaction = "nod" | "puzzled" | "repeat" | "clap";

function turnReaction(out: TurnOut): Exclude<SessionReaction, "clap"> {
  if (out.understood && out.parse?.segments.some(({ intent }) =>
    intent === "g_repeat" || intent === "g_slower" || intent === "g_dont_understand")) return "repeat";
  return out.understood && !out.checking && !out.checkNo ? "nod" : "puzzled";
}

export interface TalkFeedback {
  npcReact?(id: string, kind: Exclude<SessionReaction, "repeat">, repeat?: boolean): void;
  npcVoice?(id: string, line: number, replay?: VoiceVisualOwner["replay"]): VoiceVisualOwner | undefined;
}

export function notifyTurnReaction(hooks: TalkFeedback, id: string, out?: TurnOut) {
  const reaction = out ? turnReaction(out) : "repeat";
  if (reaction === "repeat") {
    if (hooks.npcVoice) hooks.npcReact?.(id, "nod", true);
    else if (out) hooks.npcReact?.(id, "nod");
    return true;
  }
  hooks.npcReact?.(id, reaction);
  return false;
}

export function trackNpcVoice(hooks: TalkFeedback, id: string, line: number, repeat: boolean, skipped: boolean) {
  const visual = hooks.npcVoice?.(id, line, repeat ? "turn" : undefined);
  if (skipped) visual?.onUnavailable?.();
  else if (visual) return { visual };
}
