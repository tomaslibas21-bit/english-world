import type { WordKind } from "../game/road/wordKinds";

export const ROAD_FUNCTION_WORDS = new Set("a an the i you he she it we they my your our their me him her them is are was were to at in of on from for and or not can do did does have has that this with but as if okay ok fine good great nice right yeah sure exactly too just very really".split(" "));

export const classifyRoadWord: (word: string, gap: boolean, previous: string) => WordKind | undefined = () => undefined;
