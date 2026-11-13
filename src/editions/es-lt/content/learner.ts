// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): a label a handler builds at run time (its English, written
// in the conversation's code) in Lithuanian, from the conversation's table or the town-wide one.
import { TABLES } from "../tables/tables.gen";

export const learnerLabel = (sit: string, s: string): string => TABLES[sit]?.text[s] ?? TABLES._shared?.text[s] ?? s;
