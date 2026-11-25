import type { TurnOut } from "../../convo/dialogue";
import type { SessionReaction } from "./session";

export function turnReaction(out: TurnOut): SessionReaction {
  if (out.understood && out.parse?.segments.some(({ intent }) =>
    intent === "g_repeat" || intent === "g_slower" || intent === "g_dont_understand")) return "repeat";
  return out.understood && !out.checking && !out.checkNo ? "nod" : "puzzled";
}
