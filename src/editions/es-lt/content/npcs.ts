// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's module with its learner text in
// Lithuanian, from the town-wide table (src/editions/es-lt/tables/_shared.json).
import { NPCS } from "@/content/npcs";
import { applyLearner } from "../../es/learner/walk";
import { SHARED } from "../tables/loaded";

applyLearner({ npcs: NPCS }, SHARED);
// The bios are not in the walk (learnerItems), so they are written here.
NPCS.memo.bio = "Laiko barą „La Buchaca“, kurį atidarė jo tėvas, ir vis dar kasvakar žaidžia biliardą.";
NPCS.tona.bio = "Nepraleidžia nė vieno penktadienio loterijos vakaro centrinėje aikštėje ir visada atsineša atliekamą lentelę.";
NPCS.beto.bio = "Jau dvidešimt metų šaukia kortas aikštės loterijoje – beveik kiekvienai turi eilėraštuką.";
NPCS.ines.bio = "Užaugo Puerto Colibrí miestelyje ir mėgsta palaukti, kol kas nors pastebės antrą vėžlį.";
export * from "@/content/npcs";
