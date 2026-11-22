import { BARISTA_MENU, BARISTA_UI, type HintRef, type OrderPiece } from "../../content/barista";
import { GLOBAL_HINTS } from "../../content/global";
import type { SituationDef } from "../../content/types";
import { modelAnswers } from "../../convo/suggest";
import { EDITION } from "../../edition";
import { chipGloss, chipLabel } from "../../ui/chip-label";
import { L } from "../../ui/i18n";

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
  const fixedChip = (id: string, { en, lt }: { en: string; lt: string }) => ({ id, en, lt: L(lt) });
  const chip = (group: string, id: string) => {
    const e = cafe.entities![group].find((entity) => entity.id === id)!;
    const text = e.en.split(" | ").join(" ");
    if (EDITION.id === "es") {
      const label = id === "whole" ? "entera" : e.chip ?? text;
      return { id, en: chipLabel({ ...e, chip: label }).split(" | ").join(" "), lt: chipGloss(e) };
    }
    return { id, en: text, lt: e.chip ?? e.lt.split(" | ").map((unit) => unit.split("/")[0]).join(" ") };
  };
  return {
    size: BARISTA_MENU.size.map((id) => chip("size", id)),
    drink: BARISTA_MENU.drink.map((id) => chip("drink", id)),
    milk: [...BARISTA_MENU.milk.map((id) => chip("milk", id)), fixedChip("none", BARISTA_UI.noMilk)],
    extras: [chip("temp", "iced"), ...BARISTA_MENU.food.map((id) => chip("food", id))],
    dine: [fixedChip("here", BARISTA_UI.here), fixedChip("togo", BARISTA_UI.toGo)],
  };
}
