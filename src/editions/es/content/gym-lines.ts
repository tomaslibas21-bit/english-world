import { t } from "@/content/dsl";
import type { GyLineId } from "@/content/gym-lines";
import type { SentSrc } from "@/content/types";

export type { GyLineId };

export const GYM_LINES = {
  gy_jacks: [t("¡Haga | saltos de tijera!", "Do | jumping jacks!", "Do jumping jacks!")],
  gy_toes: [t("¡Tóquese | los | pies!", "Touch | your | feet!", "Bend down and touch your feet!")],
  gy_squats: [t("¡Haga | una | sentadilla!", "Do | a | squat!", "Do a squat!")],
  gy_circles: [t("¡Haga | círculos | con | los | brazos!", "Make | circles | with | your | arms!", "Circle your arms!")],
  gy_run: [t("¡Corra | en | su | lugar!", "Run | in | your | spot!", "Run in place!")],
  gy_reach: [t("¡Levante | los | brazos!", "Raise | your | arms!", "Raise your arms!")],
  gy_lunges: [t("¡Haga | un | desplante!", "Do | a | lunge!", "Do a lunge!")],
  gy_pushups: [t("¡Haga | una | lagartija!", "Do | a | push-up!", "Do a push-up!")],
  gy_intro: [t("¡Muévase | conmigo!", "Move | with me!", "Move with me!")],
  gy_right_a: [t("¡Eso es!", "That’s it!", "That’s it!")],
  gy_right_b: [t("¡Muy | bien!", "Very | well!", "Nice work!")],
  gy_retry: [t("Pruebe | otra | vez.", "Try | one more | time.", "Try again.")],
  gy_end: [t("¡Terminamos!", "We finished!", "We’re done!")],
} satisfies Record<GyLineId, SentSrc[]>;
