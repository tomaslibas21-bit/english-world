import { REACT_LINES } from "@/content/reacts";
import { applyLearner } from "../tables/loaded";
import TOWN_LIFE from "../tables/town-life.json";

applyLearner(REACT_LINES, TOWN_LIFE);
export * from "@/content/reacts";
