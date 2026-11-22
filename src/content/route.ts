// Bonus conversations can be played and reviewed without affecting the town's route or totals.
import { SITUATIONS } from "./situations/catalog";

export const ROUTE = SITUATIONS.filter((s) => !s.bonus);
