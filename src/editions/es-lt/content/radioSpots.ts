import { RADIO_SPOTS } from "@/content/radioSpots";
import { applyLearner } from "../../es/learner/walk";
import TOWN_LIFE from "../tables/town-life.json";

applyLearner(RADIO_SPOTS, TOWN_LIFE);
export * from "@/content/radioSpots";
