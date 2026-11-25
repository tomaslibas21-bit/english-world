// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { MERGES } from "@/content/merges";
import { applyLearner, SHARED } from "../tables/loaded";

applyLearner({ merges: MERGES }, SHARED);
export * from "@/content/merges";
