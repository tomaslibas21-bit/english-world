// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { NPCS } from "@/content/npcs";
import { applyLearner } from "../../es/learner/walk";
import { SHARED } from "../tables/loaded";

applyLearner({ npcs: NPCS }, SHARED);
NPCS.memo.role.lt = "Baro savininkas";
NPCS.memo.bio = "Laiko barą „La Buchaca“, kurį atidarė jo tėvas, ir vis dar kasvakar žaidžia biliardą.";
export * from "@/content/npcs";
