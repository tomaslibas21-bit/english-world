import { t } from "./dsl";
import type { MergeRecord } from "./merges";
import type { SentSrc } from "./types";

export const ROAD_LINES: Record<string, SentSrc[]> = {
  rd_lift: [t("Need | a | lift? | Hop in, | you | drive!", "Reikia | — | pavežti? | Sėskite – | Jūs | vairuosite!", "Gal Jus pavežti? Sėskite – vairuosite Jūs!")],
  rd_a_yes: [t("Sure, | thanks!", "Žinoma, | ačiū!", "Žinoma, ačiū!")],
  rd_a_no: [t("No | thanks, | I'll | walk.", "Ne, | ačiū, | — | eisiu pėsčiomis.", "Ne, ačiū, eisiu pėsčiomis.")],
  rd_start: [t("Okay, | let's | hit the road!", "Gerai, | — | leidžiamės į kelią!", "Gerai, leidžiamės į kelią!")],
  rd_end: [t("Nice | drive! | Let's | head back | to | town.", "Puikiai | pavairavote! | — | Grįžtame | į | miestą.", "Puikiai pavairavote! Grįžtame į miestą.")],
};

export const ROAD_MERGES: Record<string, MergeRecord> = {
  "hop in": { reason: "lexical_expression", split: "The invitation to get in the car is Sėskite.", minimal: "Verb and particle." },
  "hit the road": { reason: "lexical_expression", split: "The idiom means to set out, leidžiamės į kelią.", minimal: "The idiom." },
  "head back": { reason: "lexical_expression", split: "Together they mean return, grįžtame.", minimal: "Verb and particle." },
};

export const ROAD_ACCEPT: Record<string, string[]> = {
  rd_a_yes: ["sure", "yes", "yes please", "yes thanks", "sure thank you"],
  rd_a_no: ["no", "no thank you", "no thanks", "i'll walk", "i will walk", "no thanks i will walk"],
};
