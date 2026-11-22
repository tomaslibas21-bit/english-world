import { t } from "@/content/dsl";
import type { MergeRecord } from "@/content/merges";
import type { SentSrc } from "@/content/types";

export const ROAD_LINES: Record<string, SentSrc[]> = {
  rd_lift: [t("¿Le | doy un aventón? | Súbase, | ¡hoy | maneja | usted!",
    "To-you | I-give-a-ride? | Get-in, | today | drive | you!", "Can I give you a ride? Get in, you're driving today!", {
      flags: { 4: "Mexico says manejar where Spain says conducir." },
      spain: t("¿Le | llevo? | Suba, | ¡hoy | conduce | usted!",
        "You | I-take? | Get-in, | today | drive | you!", "Can I give you a ride? Get in, you're driving today!"),
    })],
  rd_a_yes: [t("¡Sí, | gracias!", "Yes, | thanks!", "Yes, thanks!")],
  rd_a_no: [t("No, | gracias, | me | voy | caminando.", "No, | thanks, | myself | I-go | walking.", "No thanks, I'll walk.")],
  rd_start: [t("¡Órale, | vámonos | a | la | carretera!", "All-right, | let's-go | to | the | road!", "All right, let's hit the road!", {
    flags: { 0: "Órale is Mexican for “all right” or “let’s go”." },
    spain: t("¡Venga, | vámonos | a | la | carretera!", "All-right, | let's-go | to | the | road!", "All right, let's hit the road!"),
  })],
  rd_end: [t("¡Muy | bien | manejado! | Ya | regresamos | al | pueblo.",
    "Very | well | driven! | Now | we-return | to-the | town.", "Nicely driven! Now we head back to town.", {
      spain: t("¡Muy | bien | conducido! | Ya | volvemos | al | pueblo.",
        "Very | well | driven! | Now | we-return | to-the | town.", "Nicely driven! Now we head back to town."),
    })],
};

export const ROAD_MERGES: Record<string, MergeRecord> = {
  "doy un aventón": { reason: "lexical_expression", split: "Doy un aventón = I give a ride.", minimal: "Verb and its object.", code: "S-LEX" },
};

export const ROAD_ACCEPT: Record<string, string[]> = {
  rd_a_yes: ["sí", "sí gracias", "claro"],
  rd_a_no: ["no", "no gracias", "me voy caminando", "voy caminando"],
};
