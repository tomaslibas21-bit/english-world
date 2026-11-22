import { TAXI } from "../game/world/layout";
import type { TaxiRoute } from "../game/taxi/route";

export const TAXI_CONVERSATION = { situation: "s66-taxi", npc: "vinnie" };
export const TAXI_CAR = { ...TAXI, id: "taxi", speedLimit: 3.15 };

export const TAXI_ROUTES: TaxiRoute[] = [];
