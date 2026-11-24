export const targetLang = "en-US";
export const learnerLang = "lt";

export const GYM_UI = {
  readyTitle: "Treniruotė su Jordan",
  readyTouch: "Klausykite ir bakstelėkite tinkamą paveikslėlį.",
  readyKeys: "Klausykite. Judesį pasirinkite spausdami rodyklę arba skaičių nuo 1 iki 4.",
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
  jacks: "Pašokti, išskėsti kojas ir pakelti rankas",
  toes: "Paliesti kojų pirštus",
  squats: "Pritūpti",
  circles: "Sukti rankas ratu",
  run: "Bėgti vietoje",
  reach: "Ištiesti rankas aukštyn",
  lunges: "Daryti įtūpstą",
  pushups: "Daryti atsispaudimą",
} as const;

export type GyMoveId = keyof typeof GYM_MOVE_LABELS;
