import type { TalkLineId } from "./contract";

/** Used once when choosing a cue, off the animation tick. */
export function lineSeed(actor: string, run: number, line: TalkLineId, salt = 0) {
  const key = `${actor}:${run}:${line}:${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
