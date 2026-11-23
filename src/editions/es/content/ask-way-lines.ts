// Asking a local the way in Puerto Colibrí (batch 5, item 5; words by Claude, 23 Nov 2026). Doña Queta has lived in
// Puerto Colibrí all her life; she stands on the zócalo's south-west corner (avenida Juárez and calle Ceiba) and is
// happy to help anyone who looks lost. She says usted, and the learner says usted to her. The learner asks the way to
// one of three places; she tells it in two short lines (the taxi's phrases come back: dé vuelta, siga derecho, junto
// al, a su derecha…), and the learner walks there. Mexico is the base text; `spain:` where a Spaniard says it
// otherwise (gire, recto, Correos, perdone) (x13-por-donde).
//
// The ways, from her corner (north is the sea): the post office is across avenida Juárez, east of the bank; Café La
// Ceiba is west along avenida Juárez's south side, past La Cocina de Lucía; El Muelle is down calle Ceiba to avenida
// del Puerto, then west, on the pier.

import type { SentSrc } from "@/content/types";
import { t } from "@/content/dsl";

export const ASK_WAY_SITUATION = "x13-por-donde";
export const ASK_WAY_NPC = "queta";

const F_DE_VUELTA = "dar vuelta: to turn (Mexico); Spain says girar.";
const F_DERECHO = "derecho: straight on (Mexico); Spain says recto.";

export const ASK_WAY_META = {
  title: { en: "¿Por dónde?", lt: "Which way?" },
  topic: { en: "En la calle", lt: "On the street" },
  goal: "Ask Doña Queta how to get somewhere in town, then follow her directions.",
  intro: "Doña Queta has lived in Puerto Colibrí all her life. She stands on the corner of the zócalo and is happy to help anyone who looks lost.",
  mission: [{ step: "where", lt: "Ask how to get there" }, { step: "thanks", lt: "Thank Doña Queta" }],
  suggestWhere: "Ask the way",
  suggestThanks: "Say thank you",
} as const;

export const ASK_WAY_PLACES = [
  { id: "post", location: "post-office", lines: ["aw_post_1", "aw_post_2"] },
  { id: "cafe", location: "sunny-cup", lines: ["aw_cafe_1", "aw_cafe_2"] },
  { id: "pier", location: "the-pier", lines: ["aw_pier_1", "aw_pier_2"] },
] as const;

export const ASK_WAY_LINES: Record<string, SentSrc[]> = {
  aw_greet: [t("¡Buenas! | ¿Busca | algo?", "Hi! | Are-you-looking-for | something?", "Hi! Are you looking for something?")],
  aw_offer: [t("Yo | le | digo | por | dónde.", "I | to-you | tell | by | where.", "I'll tell you the way.")],
  aw_again: [t("¿Otra vez | por aquí? | ¿Adónde | va | ahora?", "Again | around-here? | Where-to | you-go | now?", "Back again? Where to now?")],

  aw_post_1: [t("Cruce | la | avenida Juárez | y | dé vuelta | a la izquierda.", "Cross | the | avenue Juárez | and | turn | to the left.", "Cross Avenida Juárez and turn left.",
    { flags: { 4: F_DE_VUELTA }, spain: t("Cruce | la | avenida Juárez | y | gire | a la izquierda.", "Cross | the | avenue Juárez | and | turn | to the left.", "Cross Avenida Juárez and turn left.") })],
  aw_post_2: [t("El | correo | está | junto al | banco.", "The | post-office | is | next to the | bank.", "The post office is next to the bank.",
    { spain: t("Correos | está | junto al | banco.", "Post-Office | is | next to the | bank.", "The post office is next to the bank.", { flags: { 0: "Correos: the post office (Spain), without an article." } }) })],
  aw_cafe_1: [t("Cruce | la | avenida Juárez | y | dé vuelta | a la derecha. | Siga | derecho.", "Cross | the | avenue Juárez | and | turn | to the right. | Keep-going | straight.", "Cross Avenida Juárez and turn right. Go straight.",
    { flags: { 4: F_DE_VUELTA, 7: F_DERECHO }, spain: t("Cruce | la | avenida Juárez | y | gire | a la derecha. | Siga | recto.", "Cross | the | avenue Juárez | and | turn | to the right. | Keep-going | straight.", "Cross Avenida Juárez and turn right. Go straight.") })],
  aw_cafe_2: [t("El | café | La Ceiba | está | a | su | izquierda, | junto a | La Cocina de Lucía.", "The | café | La Ceiba | is | on | your | left, | next to | La Cocina de Lucía.", "Café La Ceiba is on your left, next to La Cocina de Lucía.")],
  aw_pier_1: [t("Baje | por | la | calle Ceiba | hacia | el | mar.", "Go-down | along | the | street Ceiba | toward | the | sea.", "Go down Calle Ceiba toward the sea.")],
  aw_pier_2: [t("En | la | avenida del Puerto, | dé vuelta | a la izquierda. | El Muelle | está | a | su | derecha.", "At | the | avenue of-the Harbor, | turn | to the left. | El Muelle | is | on | your | right.", "At Avenida del Puerto, turn left. El Muelle is on your right.",
    { flags: { 3: F_DE_VUELTA }, spain: t("En | la | avenida del Puerto, | gire | a la izquierda. | El Muelle | está | a | su | derecha.", "At | the | avenue of-the Harbor, | turn | to the left. | El Muelle | is | on | your | right.", "At Avenida del Puerto, turn left. El Muelle is on your right.") })],

  aw_easy: [t("¡No | tiene | pierde!", "Not | it-has | loss!", "You can't miss it!",
    { flags: { 2: "no tiene pierde: you can't go wrong, you can't miss it (Mexico)." },
      neutral: t("¡Es | muy | fácil!", "It's | very | easy!", "It's very easy!"),
      spain: t("¡No | tiene | pérdida!", "Not | it-has | loss!", "You can't miss it!", { flags: { 2: "no tiene pérdida: you can't miss it (Spain)." } }) })],
  aw_bye: [t("¡De nada! | Que | le | vaya | bien.", "Of-nothing! | That | to-you | it-goes | well.", "You're welcome! Take care.")],
};

export const ASK_WAY_HINTS = {
  where: { lt: "Ask the way", items: [
    { id: "h_post", s: t("Disculpe, | ¿cómo | llego | al | correo?", "Excuse-me, | how | I-get | to-the | post-office?", "Excuse me, how do I get to the post office?",
      { spain: t("Perdone, | ¿cómo | llego | a | Correos?", "Excuse-me, | how | I-get | to | Post-Office?", "Excuse me, how do I get to the post office?") }) },
    { id: "h_cafe", s: t("Disculpe, | ¿cómo | llego | al | café | La Ceiba?", "Excuse-me, | how | I-get | to-the | café | La Ceiba?", "Excuse me, how do I get to Café La Ceiba?",
      { spain: t("Perdone, | ¿cómo | llego | al | café | La Ceiba?", "Excuse-me, | how | I-get | to-the | café | La Ceiba?", "Excuse me, how do I get to Café La Ceiba?") }) },
    { id: "h_pier", s: t("Disculpe, | ¿cómo | llego | al | restaurante | El Muelle?", "Excuse-me, | how | I-get | to-the | restaurant | El Muelle?", "Excuse me, how do I get to El Muelle restaurant?",
      { spain: t("Perdone, | ¿cómo | llego | al | restaurante | El Muelle?", "Excuse-me, | how | I-get | to-the | restaurant | El Muelle?", "Excuse me, how do I get to El Muelle restaurant?") }) },
  ] },
  thanks: { lt: "Say thank you", items: [
    { id: "h_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you so much!") },
  ] },
};

const ASK = "[disculpe | perdone | oiga | disculpa | perdona | oye] (como llego | como le hago para llegar | como hago para llegar | por donde queda | donde queda | donde esta | por donde se va | como se llega | busco | estoy buscando)";

export const ASK_WAY_INTENTS = {
  way_post: { patterns: [`${ASK} (al correo | a correos | a la oficina de correos | a la oficina de correo) [por favor] #h:h_post`, `${ASK} (el correo | correos | la oficina de correos)`, "[el] correo [por favor]", "correos"] },
  way_cafe: { patterns: [`${ASK} al cafe [la ceiba] [por favor] #h:h_cafe`, `${ASK} (el cafe | la ceiba | el cafe la ceiba | la cafeteria)`, "[el] cafe la ceiba [por favor]", "la ceiba"] },
  way_pier: { patterns: [`${ASK} al [restaurante] [el] muelle [por favor] #h:h_pier`, `${ASK} (el muelle | el restaurante el muelle)`, "[el] [restaurante] [el] muelle [por favor]"] },
  way_thanks: { patterns: ["[muchas | mil] gracias [senora | dona queta] #h:h_thanks", "(muy amable | que amable) [gracias]", "(perfecto | ok | entendido | va) gracias", "gracias"] },
};

export const ASK_WAY_UI = {
  card: "Kelio nurodymai",
  to: "Tikslas: {place}",
  replay: "Klausyti dar kartą",
  guide: "Nuvesk mane",
  close: "Užverti nurodymus",
  arrived: "Radote!",
} as const;
