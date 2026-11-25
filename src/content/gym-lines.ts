import { t } from "./dsl";
import type { GyMoveId } from "./gym";
import type { SentSrc } from "./types";

export type GyLineId = `gy_${GyMoveId}` | "gy_intro" | "gy_right_a" | "gy_right_b" | "gy_retry" | "gy_end";

export const GYM_LINES = {
  gy_jacks: [t("Jumping jacks!", "Šuoliukai išskečiant kojas!", "Pašok, išskėsk kojas ir pakelk rankas!")],
  gy_toes: [t("Touch | your | toes!", "Paliesk | savo | kojų pirštus!", "Pasilenk ir paliesk kojų pirštus!")],
  gy_squats: [t("Do | a | squat!", "Padaryk | — | pritūpimą!", "Pritūpk!")],
  gy_circles: [t("Do | arm circles!", "Daryk | ratus rankomis!", "Ištiesk rankas į šonus ir suk jas ratu!")],
  gy_run: [t("Run | in place!", "Bėk | vietoje!", "Bėk vietoje!")],
  gy_reach: [t("Reach | up!", "Tieskis | aukštyn!", "Ištiesk rankas virš galvos!")],
  gy_lunges: [t("Do | a | lunge!", "Padaryk | — | įtūpstą!", "Ženk pirmyn ir padaryk įtūpstą!")],
  gy_pushups: [t("Do | a | push-up!", "Padaryk | — | atsispaudimą!", "Padaryk atsispaudimą!")],
  gy_intro: [t("Move | with | me!", "Judėk | su | manimi!", "Pajudėk kartu su manimi!")],
  gy_right_a: [t("That's it!", "Štai taip!", "Štai taip!")],
  gy_right_b: [t("Nice work!", "Puikiai padirbėjai!", "Puikiai!")],
  gy_retry: [t("Let's try | again.", "Pabandykime | dar kartą.", "Pabandykime dar kartą.")],
  gy_end: [t("We | did | it!", "Mes | padarėme | tai!", "Mums pavyko!")],
} satisfies Record<GyLineId, SentSrc[]>;
