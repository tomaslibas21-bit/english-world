import type { CaveGate } from "./cave-copy";
import type { ConversationCopy, Ctx, HintGroup, SentSrc } from "./types";

// The cave's chats use MH's own conversation labels (tu, like every other chat); only the Oak adds its Ending.
export const caveConversationCopy = {} satisfies ConversationCopy;

export function caveHints<M extends Record<string, SentSrc>>(
  models: M, lt: string, ids: (keyof M & string)[],
): HintGroup {
  return { lt, items: ids.map((id) => ({ id, s: models[id] })) };
}

export function cavePass(ctx: Ctx, gate: CaveGate) {
  ctx.event("cave-pass", { gate });
}
