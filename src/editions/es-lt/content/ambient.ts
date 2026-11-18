// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { AMBIENT_LINES, STAFF_LINES, VENDOR_LINES } from "@/content/ambient";
import { applyLearner } from "../../es/learner/walk";
import { SHARED } from "../tables/loaded";

applyLearner({ ambient: AMBIENT_LINES, staff: STAFF_LINES, vendors: VENDOR_LINES }, SHARED);
export * from "@/content/ambient";
