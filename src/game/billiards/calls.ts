import { BALL_WORDS } from "../../content/billiards-lines";
import type { Pocket } from "./physics";

export interface Call { ball: number; pocket: Pocket }

export function parseCall(text: string): Call | null {
  const words = text.toLowerCase().match(/[a-z]+|\d+/g)?.join(" ") ?? "";
  const match = /^(?:(?:the|ball) )*(\w+)(?: (?:the|ball))*(?: (?:in|into|to)(?: the)?)? (.+)$/.exec(words);
  if (!match) return null;
  const ball = /^\d+$/.test(match[1]) ? Number(match[1]) : BALL_WORDS.indexOf(match[1]) + 1;
  if (ball < 1 || ball > 15) return null;
  const pocket = match[2].replace(/\btop\b/g, "far").replace(/\bbottom\b/g, "near");
  const side = /^(left|right) side(?: pocket)?$/.exec(pocket);
  if (side) return { ball, pocket: side[1] === "left" ? "ls" : "rs" };
  const corner = /^(?:(far|near) (left|right)|(left|right) (far|near)) corner(?: pocket)?$/.exec(pocket);
  if (!corner) return null;
  const end = corner[1] || corner[4], edge = corner[2] || corner[3];
  return { ball, pocket: `${end[0]}${edge[0]}` as Pocket };
}
