import type { TurnOut } from "../../convo/dialogue";

export type SessionReaction = "nod" | "puzzled" | "repeat" | "clap";

export function turnReaction(out: TurnOut): Exclude<SessionReaction, "clap"> {
  if (out.understood && out.parse?.segments.some(({ intent }) =>
    intent === "g_repeat" || intent === "g_slower" || intent === "g_dont_understand")) return "repeat";
  return out.understood && !out.checking && !out.checkNo ? "nod" : "puzzled";
}
