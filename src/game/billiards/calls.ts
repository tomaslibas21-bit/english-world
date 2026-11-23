import { BALL_WORDS } from "../../content/billiards-lines";
import { tokenizeInput, tokenSimilarity } from "../../convo/normalize";
import { sayItWords, type SayItTarget } from "../kit/sayIt";
import type { Pocket } from "./physics";

export interface Call { ball: number; pocket: Pocket }

type PocketKind = "corner" | "side";

function readCall(text: string, listen = false): { ball: number; pocket: Pocket | PocketKind } | null {
  const words = text.toLowerCase().match(/[a-z]+|\d+/g)?.join(" ") ?? "";
  const match = /^(?:(?:the|ball) )*(\w+)(?: (?:the|ball))*(?: (?:in|into|to)(?: the)?)? (.+)$/.exec(words);
  if (!match) return null;
  const ball = /^\d+$/.test(match[1]) ? Number(match[1]) : BALL_WORDS.findIndex((word) =>
    listen ? tokenSimilarity(match[1], word) >= 0.9 : match[1] === word) + 1;
  if (ball < 1 || ball > 15) return null;
  const pocket = match[2].replace(/\btop\b/g, "far").replace(/\bbottom\b/g, "near");
  if (listen && /^(corner|side)(?: pocket)?$/.test(pocket)) return { ball, pocket: pocket.startsWith("corner") ? "corner" : "side" };
  const side = /^(left|right) side(?: pocket)?$/.exec(pocket);
  if (side) return { ball, pocket: side[1] === "left" ? "ls" : "rs" };
  const corner = /^(?:(far|near) (left|right)|(left|right) (far|near)) corner(?: pocket)?$/.exec(pocket);
  if (!corner) return null;
  const end = corner[1] || corner[4], edge = corner[2] || corner[3];
  return { ball, pocket: `${end[0]}${edge[0]}` as Pocket };
}

export function parseCall(text: string): Call | null {
  const call = readCall(text);
  return call && call.pocket !== "corner" && call.pocket !== "side" ? { ball: call.ball, pocket: call.pocket } : null;
}

export function sayItCall(target: Call, phrase: string): SayItTarget {
  const words = sayItWords([phrase]);
  const kind = target.pocket.endsWith("s") ? "side" : "corner";
  return {
    phrases: words.phrases,
    evaluate(text) {
      const calls = tokenizeInput(text).variants.map((tokens) =>
        readCall(tokens.join(" ").replace(/^it is /, ""), true));
      if (calls.some((call) => call?.ball === target.ball && (call.pocket === target.pocket || call.pocket === kind))) return "complete";
      return calls.some(Boolean) || words.evaluate(text) !== "prefix" ? "none" : "prefix";
    },
  };
}
