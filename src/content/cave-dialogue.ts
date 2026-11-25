import type { CaveGate } from "./cave-copy";
import type { Ctx, HintGroup, SentSrc } from "./types";

export function caveHints<M extends Record<string, SentSrc>>(
  models: M, lt: string, ids: (keyof M & string)[],
): HintGroup {
  return { lt, items: ids.map((id) => ({ id, s: models[id] })) };
}

export function cavePass(ctx: Ctx, gate: CaveGate) {
  ctx.event("cave-pass", { gate });
}

export type CaveStoryEvent =
  | { name: "cave-pass"; data: { gate: CaveGate } }
  | { name: "tree-heard"; data: Record<string, never> };
