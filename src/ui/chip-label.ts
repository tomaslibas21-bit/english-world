// The label on an answer chip (src/ui/Conversation.tsx): what the learner can pick, in the learner's language, or
// the practised language's own word where the entity gives one (`chip`).
import type { EntityDef } from "../content/types";
import { variety } from "../convo/compose";

/** An entity's natural name in the learner's language (`attrs.nat`), in the nominative: Puerto Colibrí for Lithuanians
 *  gives it as six case forms ("vietinis maistas/vietinio maisto/…"). */
function natName(e: EntityDef): string | undefined {
  const nat = e.attrs?.nat;
  if (typeof nat !== "string" || !nat) return undefined;
  const forms = nat.split("/");
  return forms.length === 6 ? forms[0].trim() : nat;
}

export function chipLabel(e: EntityDef, fem = false): string {
  if (fem && e.ltF) return e.ltF.split(" | ").map((p) => p.split("/")[0]).join(" ");
  // the Spanish edition's neutral or Spain text: the entity's own word there (attrs.neutralChip / spainChip, else its
  // neutral / Spain noun), so a learner who chose España sees "pequeña", "coche" on the chips
  const a = e.attrs as Record<string, unknown> | undefined, v = variety();
  const alt = v === "spain" ? a?.spainChip ?? a?.spain ?? a?.neutralChip ?? a?.neutral : v === "neutral" ? a?.neutralChip ?? a?.neutral : undefined;
  if (e.chip && typeof alt === "string") return alt;
  if (e.chip) return e.chip;
  // the natural name ("Yucatecan food"), never the word-by-word gloss in the practised language's order ("food
  // Yucatecan"); a one-word gloss is the name itself
  const nat = natName(e);
  if (nat) return nat;
  return e.lt.split(" | ").map((p) => p.split("/")[0]).join(" ");
}
