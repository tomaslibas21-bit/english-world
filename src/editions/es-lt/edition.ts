// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition with Lithuanian as the learner's
// language. Everything else is the Spanish edition's.
import type { Edition } from "../../edition";
import { EDITION as ES } from "../es/edition";

export const EDITION: Edition = { ...ES, helper: "lt" };
