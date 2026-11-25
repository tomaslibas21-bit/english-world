import type { CaveGate } from "./cave-copy";
import type { ConversationCopy, Ctx, HintGroup, SentSrc } from "./types";

export const caveConversationCopy = {
  guides: { g_howareyou: "Pasakykite, kaip Jums sekasi, ir paklauskite, kaip sekasi pašnekovui." },
  ownName: "Pasakykite savo vardą.",
  clarification: "Visada pravers: paprašyti pakartoti, kalbėti lėčiau ar pasakyti žodį paraidžiui.",
  bestPhrase: { spoken: "Geriausiai pasakėte", typed: "Jūsų frazė" },
  received: "Gavote",
} satisfies ConversationCopy;

export function caveHints<M extends Record<string, SentSrc>>(
  models: M, lt: string, ids: (keyof M & string)[],
): HintGroup {
  return { lt, items: ids.map((id) => ({ id, s: models[id] })) };
}

export function cavePass(ctx: Ctx, gate: CaveGate) {
  ctx.event("cave-pass", { gate });
}
