import { t } from "./dsl";
import type { GyMoveId } from "./gym";
import type { SentSrc } from "./types";

export type GyLineId = `gy_${GyMoveId}` | "gy_intro" | "gy_right_a" | "gy_right_b" | "gy_retry" | "gy_end";

export const GYM_LINES = {
  gy_jacks: [t("Jumping jacks!", "Šuoliukai žergtai!", "Per šuoliuką praskėskite kojas ir pakelkite rankas virš galvos!")],
  gy_toes: [t("Touch | your | toes!", "Palieskite | savo | kojų pirštus!", "Pasilenkite ir palieskite kojų pirštus!")],
  gy_squats: [t("Do | a | squat!", "Padarykite | — | pritūpimą!", "Pritūpkite!")],
  gy_circles: [t("Make | arm circles!", "Darykite | ratus rankomis!", "Ištieskite rankas į šonus ir sukite jas ratu!")],
  gy_run: [t("Run | in place!", "Bėkite | vietoje!", "Bėkite vietoje!")],
  gy_reach: [t("Reach | up!", "Tieskitės | aukštyn!", "Ištieskite rankas virš galvos!")],
  gy_lunges: [t("Do | a | lunge!", "Padarykite | — | įtūpstą!", "Ženkite pirmyn ir padarykite įtūpstą!")],
  gy_pushups: [t("Do | a | push-up!", "Padarykite | — | atsispaudimą!", "Padarykite atsispaudimą!")],
  gy_intro: [t("Move | with | me!", "Judėkite | su | manimi!", "Pajudėkime kartu!")],
  gy_right_a: [t("That's it!", "Štai taip!", "Štai taip!")],
  gy_right_b: [t("Nice work!", "Puikiai padirbėjote!", "Puikiai!")],
  gy_retry: [t("Let's try | again.", "Pabandykime | dar kartą.", "Pabandykime dar kartą.")],
  gy_end: [t("We | did | it!", "Mes | padarėme | tai!", "Mums pavyko!")],
} satisfies Record<GyLineId, SentSrc[]>;
