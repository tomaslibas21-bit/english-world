import { RADIO_SPOTS } from "@/content/radioSpots";
import { applyLearner } from "../tables/loaded";
import TOWN_LIFE from "../tables/town-life.json";

applyLearner(RADIO_SPOTS, TOWN_LIFE);
export * from "@/content/radioSpots";
