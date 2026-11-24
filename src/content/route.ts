import { SITUATIONS } from "./situations/catalog";
import { isTownQuest } from "./townQuests";
import type { SituationMeta } from "./types";

// Bonus chats are outside the town's recommended route and its progress totals.
export const ROUTE = SITUATIONS.filter((s) => !s.bonus);
export function orderRoute(route: readonly SituationMeta[]) {
  return [...route].sort((a, b) => a.chapter - b.chapter || a.order - b.order || a.id.localeCompare(b.id));
}

export const ORDERED_ROUTE = orderRoute(ROUTE);
export const LIGHT_ROUTE = ORDERED_ROUTE.filter((s) => !isTownQuest(s.id));
export const CENOTE_TOUR = SITUATIONS.find((s) => s.id === "x14-cenote" && s.bonus);

export function pickerSituations(light = false) {
  const route = light ? LIGHT_ROUTE : ORDERED_ROUTE;
  return CENOTE_TOUR ? [...route, CENOTE_TOUR] : [...route];
}
