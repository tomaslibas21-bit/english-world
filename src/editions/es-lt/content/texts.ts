import { TEXT_THREADS } from "@/content/texts";
import { applyLearner } from "../tables/loaded";
import TOWN_LIFE from "../tables/town-life.json";

applyLearner(TEXT_THREADS, TOWN_LIFE);
export * from "@/content/texts";
