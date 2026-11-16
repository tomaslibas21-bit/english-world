// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): a label a handler builds at run time (its English, written
// in the conversation's code) in Lithuanian, from the conversation's table (loaded with it: tables/loaded.ts) or the town-wide one.
import { LOADED, SHARED } from "../tables/loaded";

export const learnerLabel = (sit: string, s: string): string => LOADED[sit]?.text[s] ?? SHARED.text[s] ?? s;
