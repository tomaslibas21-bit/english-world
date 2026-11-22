import { BARISTA_UI, type HintRef, type OrderPiece } from "../../content/barista";
import { GLOBAL_HINTS } from "../../content/global";
import type { SituationDef } from "../../content/types";
import { modelAnswers } from "../../convo/suggest";

function hintLine(cafe: SituationDef, ref: HintRef, gender: "f" | "m") {
  const group = cafe.hints[ref.group] ?? GLOBAL_HINTS[ref.group];
  const item = group?.items.filter(({ id }) => id === ref.item)[ref.variant ?? 0];
  const sentence = item && modelAnswers(cafe, { ...group, items: [item] }, ref.entity, {
    formal: true, gender: "f", npcGender: gender, vars: {},
  }, 1)[0];
  if (!sentence) throw new Error(`Missing barista hint ${ref.group}.${ref.item}`);
  return { key: `${ref.group}.${ref.item}.${ref.entity ?? ref.variant ?? 0}`, sentence };
}

export const baristaPieceLine = (cafe: SituationDef, piece: OrderPiece, gender: "f" | "m") => hintLine(cafe, piece.hint, gender);
export const baristaThanks = (cafe: SituationDef, gender: "f" | "m") => hintLine(cafe, { group: "g_social", item: "s_thanks" }, gender);
export function baristaMenu(cafe: SituationDef) {
  const chip = (group: string, id: string) => {
    const e = cafe.entities![group].find((entity) => entity.id === id)!;
    return { id, en: e.en.split(" | ").join(" "), lt: e.chip ?? e.lt.split(" | ").map((unit) => unit.split("/")[0]).join(" ") };
  };
  return {
    size: ["small", "medium", "large"].map((id) => chip("size", id)),
    // Latte is ordered twice. The remaining menu items fill out the eight drink choices.
    drink: ["latte", "cappuccino", "americano", "hot_chocolate", "mocha", "espresso", "drip_coffee", "flat_white"].map((id) => chip("drink", id)),
    milk: [...["whole", "skim", "oat", "almond"].map((id) => chip("milk", id)), { id: "none", ...BARISTA_UI.noMilk }],
    extras: [chip("temp", "iced"), ...["croissant", "blueberry_muffin", "cookie", "cinnamon_roll"].map((id) => chip("food", id))],
    dine: [{ id: "here", ...BARISTA_UI.here }, { id: "togo", ...BARISTA_UI.toGo }],
  };
}
