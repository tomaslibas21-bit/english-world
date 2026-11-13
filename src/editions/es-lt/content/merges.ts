// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { MERGES } from "@/content/merges";
import { applyLearner } from "../../es/learner/walk";
import { TABLES } from "../tables/tables.gen";

if (TABLES._shared) applyLearner({ merges: MERGES }, TABLES._shared);
export * from "@/content/merges";
