// Asking a local the way (batch 5, item 5; words by Claude, 23 Nov 2026). Earl has lived in Maple Harbor all his life;
// he stands on the square's south-west corner (Main Street and Center Street) and is happy to help anyone who looks
// lost. The learner asks him the way to one of three places; he tells it in two short lines (the taxi's phrases: turn
// left, go straight, next to, across from, on your right…), and the learner walks there. Optional and chill: no timer,
// nothing lost by wandering off, and „Nuvesk mane“ always there (x03-ask-the-way). Lines `aw_<id>`; the directions
// `aw_<place>_1`, `aw_<place>_2`.
//
// The ways, from Earl's corner (north is the harbor): the post office is across Main Street, east of the bank; Sunny
// Cup is west along Main Street's south side, past Lucia's; the Pier Restaurant is north up Center Street to Harbor
// Road, then west, on the pier.

import type { SentSrc } from "./types";
import { t } from "./dsl";

export const ASK_WAY_SITUATION = "x03-ask-the-way";
export const ASK_WAY_NPC = "earl";

export const ASK_WAY_META = {
  title: { en: "Ask the Way", lt: "Paklausk kelio" },
  topic: { en: "On the street", lt: "Gatvėje" },
  goal: "Paklausk Earlo, kaip nueiti į vieną vietą mieste, ir eik pagal jo nurodymus.",
  intro: "Earlas visą gyvenimą gyvena Maple Harbor. Jis stovi aikštės kampe ir mielai padeda praeiviams.",
  mission: [{ step: "where", lt: "Paklausk, kaip nueiti" }, { step: "thanks", lt: "Padėkok Earlui" }],
  suggestWhere: "Paklausti kelio",
  suggestThanks: "Padėkoti",
} as const;

/** The three places, their location ids (the guide, the arrival) and their lines. */
export const ASK_WAY_PLACES = [
  { id: "post", location: "post-office", lines: ["aw_post_1", "aw_post_2"] },
  { id: "cafe", location: "sunny-cup", lines: ["aw_cafe_1", "aw_cafe_2"] },
  { id: "pier", location: "the-pier", lines: ["aw_pier_1", "aw_pier_2"] },
] as const;

export const ASK_WAY_LINES: Record<string, SentSrc[]> = {
  aw_greet: [t("Hi there! | Are you | looking for | something?", "Labas! | Ar Jūs | ieškote | kažko?", "Labas! Ar ko nors ieškote?")],
  aw_offer: [t("I | can | tell | you | the | way.", "Aš | galiu | pasakyti | Jums | — | kelią.", "Galiu pasakyti, kaip nueiti.")],
  aw_again: [t("Hello again! | Where to | this time?", "Sveiki dar kartą! | Kur | šįkart?", "Sveiki dar kartą! Kur šįkart?")],

  aw_post_1: [t("Cross | Main Street | and | turn | left.", "Pereikite | Main Street gatvę | ir | sukite | kairėn.", "Pereikite Main Street gatvę ir sukite kairėn.")],
  aw_post_2: [t("The | post office | is | next to | the | bank.", "— | Paštas | yra | šalia | — | banko.", "Paštas – šalia banko.")],
  aw_cafe_1: [t("Cross | Main Street | and | turn | right. | Go | straight.", "Pereikite | Main Street gatvę | ir | sukite | dešinėn. | Eikite | tiesiai.", "Pereikite Main Street gatvę ir sukite dešinėn. Eikite tiesiai.")],
  aw_cafe_2: [t("Sunny Cup | is | on your left, | next to | Lucia's Trattoria.", "Kavinė „Sunny Cup“ | yra | kairėje, | šalia | restorano „Lucia's“.", "Kavinė „Sunny Cup“ bus kairėje, šalia restorano „Lucia's“.")],
  aw_pier_1: [t("Walk down | Center Street | toward | the | water.", "Eikite | Center Street gatve | link | — | vandens.", "Eikite Center Street gatve link vandens.")],
  aw_pier_2: [t("At | Harbor Road, | turn | left. | The Pier Restaurant | is | on your right.", "Prie | Harbor Road kelio | sukite | kairėn. | Restoranas „The Pier“ | yra | dešinėje.", "Prie Harbor Road kelio sukite kairėn. Restoranas „The Pier“ bus dešinėje.")],

  aw_easy: [t("You | can't | miss | it!", "Jūs | negalite | nepastebėti | jo!", "Tikrai nepražiūrėsite!")],
  aw_bye: [t("You're welcome. | Enjoy | your | walk!", "Prašom. | Mėgaukitės | savo | pasivaikščiojimu!", "Prašom. Gero pasivaikščiojimo!")],
};

export const ASK_WAY_HINTS = {
  where: { lt: "Paklausti kelio", items: [
    { id: "h_post", s: t("Excuse me, | how | do I | get | to | the | post office?", "Atsiprašau, | kaip | man | nueiti | į | — | paštą?", "Atsiprašau, kaip nueiti į paštą?") },
    { id: "h_cafe", s: t("Excuse me, | how | do I | get | to | Sunny Cup?", "Atsiprašau, | kaip | man | nueiti | į | kavinę „Sunny Cup“?", "Atsiprašau, kaip nueiti į kavinę „Sunny Cup“?") },
    { id: "h_pier", s: t("Excuse me, | how | do I | get | to | the Pier Restaurant?", "Atsiprašau, | kaip | man | nueiti | į | restoraną „The Pier“?", "Atsiprašau, kaip nueiti į restoraną „The Pier“?") },
  ] },
  thanks: { lt: "Padėkoti", items: [
    { id: "h_thanks", s: t("Thank you | so much!", "Ačiū | labai!", "Labai ačiū!") },
  ] },
};

const ASK = "[excuse me] (how do i get to | how can i get to | how do i find | where is | where's | which way is | which way to | can you tell me the way to | could you tell me the way to | can you tell me how to get to | i am looking for | i'm looking for | i need to get to)";

export const ASK_WAY_INTENTS = {
  way_post: { patterns: [`${ASK} the post office [please] #h:h_post`, "[the] post office [please]"] },
  way_cafe: { patterns: [`${ASK} [the] sunny cup [cafe] [please] #h:h_cafe`, "[the] sunny cup [cafe] [please]", `${ASK} the (cafe | coffee shop) [please]`] },
  way_pier: { patterns: [`${ASK} the pier [restaurant] [please] #h:h_pier`, "[the] pier [restaurant] [please]"] },
  way_thanks: { patterns: ["thank you [so much | very much] #h:h_thanks", "thanks [a lot | so much]", "(great | perfect | ok | okay | got it) thanks", "(great | perfect | got it) thank you"] },
};

/** The interface (Lithuanian): the small directions card while the learner walks there. */
export const ASK_WAY_UI = {
  card: "Kelio nurodymai",
  to: (place: string) => `Tikslas: ${place}`,
  replay: "Klausyti dar kartą",
  guide: "Nuvesk mane",
  close: "Užverti nurodymus",
  arrived: "Radote!",
} as const;

