import type { GyMoveId } from "@/content/gym";

export type { GyMoveId };
export const targetLang = "es-MX";
export const learnerLang = "lt";

export const GYM_UI = {
  readyTitle: "Mónica kviečia į treniruotę",
  readyTouch: "Klausykite ir bakstelėkite tinkamą paveikslėlį.",
  readyKeys: "Klausykite. Judesį pasirinkite rodyklių arba skaičių klavišais (1–4).",
  start: "Pradėti",
  progress: (current: number, total: number) => `Judesys ${current} iš ${total}`,
  exit: "Išeiti iš treniruotės",
  replay: "Klausyti dar kartą",
  reveal: "Rodyti žodžius",
  choices: "Pasirinkti judesį",
  scoreTitle: "Treniruotė baigta",
  completed: "Atlikti judesiai",
  firstTry: "Teisingai iš pirmo karto",
  again: "Dar kartą",
  done: "Grįžti į sporto klubą",
} as const;

export const GYM_MOVE_LABELS = {
  jacks: "Šokinėti skėčiant kojas ir keliant rankas",
  toes: "Paliesti pėdas",
  squats: "Pritūpti",
  circles: "Sukti rankas ratu",
  run: "Bėgti vietoje",
  reach: "Pakelti rankas aukštyn",
  lunges: "Daryti įtūpstą",
  pushups: "Daryti atsispaudimą",
} as const satisfies Record<GyMoveId, string>;
