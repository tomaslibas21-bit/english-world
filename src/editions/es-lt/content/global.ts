// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { GLOBAL_HINTS, GLOBAL_LINES, GLOBAL_TIPS } from "@/content/global";
import { applyLearner } from "../../es/learner/walk";
import { TABLES } from "../tables/tables.gen";

if (TABLES._shared) applyLearner({ lines: GLOBAL_LINES, hints: GLOBAL_HINTS, tips: GLOBAL_TIPS }, TABLES._shared);
export * from "@/content/global";
