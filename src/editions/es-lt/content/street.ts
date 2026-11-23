import { STREET_CHATTER as ES_CHATTER, STREET_MOMENTS as ES_MOMENTS } from "@/content/street";
import { streetLearnerContent } from "../../es/learner/street";
import { applyLearner } from "../../es/learner/walk";
import table from "../tables/street.json";

export const STREET_CHATTER = structuredClone(ES_CHATTER);
export const STREET_MOMENTS = structuredClone(ES_MOMENTS);

applyLearner(streetLearnerContent(STREET_MOMENTS, STREET_CHATTER), table);
