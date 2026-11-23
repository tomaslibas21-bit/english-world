import type { StreetChatter, StreetMoment } from "../../../game/street/types";

export function streetLearnerContent(moments: StreetMoment[], chatter: StreetChatter[]) {
  return {
    moments: Object.fromEntries(moments.map((moment) => [moment.id, moment])),
    chatter: Object.fromEntries(chatter.map((snippet) => [snippet.id, snippet])),
  };
}
