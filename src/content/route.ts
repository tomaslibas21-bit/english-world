// The town's route: the conversations that are tasks, counted and listed (all but the ones off the route:
// SituationDef.bonus, Puerto Colibrí's aluxes). Tools and checks go through every conversation (SITUATIONS); the
// interface and the tasks through these.
import { SITUATIONS } from "./situations";

export const ROUTE = SITUATIONS.filter((s) => !s.bonus);
