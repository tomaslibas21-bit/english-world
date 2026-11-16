// Puerto Colibrí's conversations for a Lithuanian learner (docs/es/LEARNER-LT.md): the Spanish edition's, with each
// conversation's Lithuanian table put in place of its English help text. Missing translations stay English and are
// listed by tools/es-learner/check.ts.
import { SITUATIONS as ES } from "@/content/situations";
import type { SituationDef } from "@/content/types";
import { applyLearner } from "../../../es/learner/walk";
import { TABLES } from "../../tables/tables.gen";
import { LOADED, learnerApplied, mergeValueText, setValueText } from "../../tables/loaded";

/** What each conversation found no Lithuanian for (the checker and the tests read it). */
export const LEARNER_MISSING: Record<string, string[]> = {};
for (const sit of ES) { LEARNER_MISSING[sit.id] = TABLES[sit.id] ? applyLearner(sit, TABLES[sit.id]) : ["(no table)"]; learnerApplied.add(sit); }

// (the game loads each table with its conversation, content/situations/meta.gen.ts; here all of them are, at once)
Object.assign(LOADED, TABLES);
setValueText(mergeValueText(TABLES));

export const SITUATIONS: SituationDef[] = ES;
export const SITUATION_BY_ID: Record<string, SituationDef> = Object.fromEntries(SITUATIONS.map((s) => [s.id, s]));
