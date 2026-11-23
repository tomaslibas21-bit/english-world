import { PHOTO_THINGS } from "../../content/photo-walk-lines";
import type { PhotoThingId } from "../../content/townQuests";
import { tokenizeInput } from "../../convo/normalize";
import { learnerTurn } from "../kit/lines";

export interface PhotoWalkProgress {
  status: "off" | "on" | "paused" | "found" | "done";
  found: PhotoThingId[];
}

type Action = { type: "accept" | "pause" | "resume" | "quit" | "finish" } | { type: "find"; id: PhotoThingId };
export const EMPTY_WALK: PhotoWalkProgress = { status: "off", found: [] };

export function photoWalkTransition(walk: PhotoWalkProgress, action: Action): PhotoWalkProgress {
  const { found, status } = walk;
  switch (action.type) {
    case "accept": return status === "off" ? { found, status: found.length === PHOTO_THINGS.length ? "found" : "on" } : walk;
    case "pause": return status === "on" ? { found, status: "paused" } : walk;
    case "resume": return status === "paused" ? { found, status: "on" } : walk;
    case "quit": return status === "on" || status === "paused" || status === "found" ? { found, status: "off" } : walk;
    case "finish": return status === "found" ? { found, status: "done" } : walk;
    case "find":
      if (status !== "on" || found.includes(action.id)) return walk;
      return { found: [...found, action.id], status: found.length + 1 === PHOTO_THINGS.length ? "found" : "on" };
  }
}

const LEAD = /^(?:(?:it is|that is|this is|look|an?|the)(?: |$))+/;

export function photoNameMatcher(id: PhotoThingId) {
  const thing = PHOTO_THINGS.find((thing) => thing.id === id)!;
  const match = learnerTurn([{ key: id, sentence: { en: thing.say[0] } }], { [id]: thing.say });
  return {
    phrases: match.phrases,
    read(text: string) {
      const variants = tokenizeInput(text).variants.map((words) => words.join(" ").replace(LEAD, ""));
      const results = variants.map((name) => match.read(name));
      return results.find((result) => result.answer) ?? results.find((result) => result.verdict === "prefix") ?? { answer: undefined, verdict: "none" as const };
    },
  };
}
