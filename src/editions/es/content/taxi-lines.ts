// The ride-along taxi's spoken lines (G1, 22 Nov 2026). Don Rigo, the taxista of the Sitio de Taxis, sits in the back
// of his own taxi today and tells the learner the way; the learner drives. He says usted, as in s66. One key `tx_<id>`
// per line (the engine in src/game/taxi/ looks them up by id); `tx_a_…` and `tx_rN_a_…` are the learner's own lines.
// Mexico is the base text, like s62's directions (dé vuelta, derecho, cuadra); `spain:` where a Spaniard says it
// otherwise (gire, recto, conduce, the perfect for what just happened, Correos). The situation s66-taxi spreads
// TAXI_LINES into its lines and TAXI_MERGES into its merges.

import type { MergeRecord } from "@/content/merges";
import type { SentSrc } from "@/content/types";
import { t } from "@/content/dsl";

const LEX = (split: string, minimal = "All words form the expression."): MergeRecord => ({ reason: "lexical_expression", split, minimal, code: "S-LEX" });

const F_SEGUNDA = "la segunda: the second (street); Spanish leaves out calle, as English leaves out street.";
const F_PRIMERA = "la primera: the first (street); calle can be left out once it is clear.";
const F_PASARSE = "pasarse: to go past, to overshoot (pasamos + nos).";
const F_VAYA = "Que le vaya bien: “may it go well for you”, an everyday goodbye.";
const F_PESOS = "Mexican prices are in pesos; the sign is $ too.";

export const TAXI_MERGES: Record<string, MergeRecord> = {
  "dé vuelta": LEX("dé → give + vuelta → turn (noun) is false; dar vuelta = to turn.", "Verb and noun only."),
  "enfrente de": LEX("enfrente → in front + de → of misreads the preposition: across from.", "Two words."),
  "frente al": LEX("frente → front + al → to the; = in front of the.", "Two words."),
  "junto al": LEX("junto → together + al → to the; = next to the.", "Two words."),
  "al lado del": LEX("al → to the + lado → side + del → of the; = next to the.", "Three words."),
  "al lado de": LEX("al → to the + lado → side + de → of; = next to.", "Three words."),
  "hacia atrás": LEX("hacia → toward + atrás → behind; = backward.", "Two words."),
  "un poco": LEX("un → a + poco → little: the degree adverb = a little, a bit.", "Two words."),
  "ciento veinte": LEX("One number: 120.", "Two words."),
  "ciento veinticinco": LEX("One number: 125.", "Two words."),
  "ciento treinta": LEX("One number: 130.", "Two words."),
  "ciento cuarenta": LEX("One number: 140.", "Two words."),
  "ciento diez": LEX("One number: 110.", "Two words."),
  "ciento cinco": LEX("One number: 105.", "Two words."),
};

export const TAXI_LINES: Record<string, SentSrc[]> = {
  // ---- shared
  tx_hello: [t("¡Buenas! | Hoy | maneja | usted, | y | yo | soy | el | pasajero.", "Hi! | Today | drive | you, | and | I | am | the | passenger.", "Hi! Today you drive, and I'm the passenger.",
    { spain: t("¡Buenas! | Hoy | conduce | usted, | y | yo | soy | el | pasajero.", "Hi! | Today | drive | you, | and | I | am | the | passenger.", "Hi! Today you drive, and I'm the passenger.") })],
  tx_a_where: [t("¿A | dónde | vamos?", "To | where | we-go?", "Where to?")],
  tx_wrong: [t("¡Uy, | por | ahí | no! | Vamos | otra vez.", "Oops, | by | there | not! | Let's-go | again.", "Oops, not that way! Let's try again.")],
  tx_passed: [t("¡Uy, | nos | pasamos! | Vaya | un poco | hacia atrás.", "Oops, | ourselves | we-went-past! | Go | a little | backward.", "Oops, we went past it! Back up a little.",
    { flags: { 2: F_PASARSE }, spain: t("¡Uy, | nos | hemos | pasado! | Vaya | un poco | hacia atrás.", "Oops, | ourselves | we-have | gone-past! | Go | a little | backward.", "Oops, we went past it! Back up a little.", { flags: { 1: F_PASARSE } }) })],
  tx_a_here: [t("Ya | llegamos.", "Already | we-arrived.", "Here we are.",
    { spain: t("Ya | hemos | llegado.", "Already | we-have | arrived.", "Here we are.") })],
  tx_owe: [t("¡Gracias! | ¿Cuánto | le | debo?", "Thanks! | How-much | to-you | I-owe?", "Thanks! What do I owe you?")],
  tx_a_bye: [t("¡Gracias! | Que | le | vaya | bien.", "Thanks! | That | to-you | it-goes | well.", "Thanks! Have a good one.", { flags: { 1: F_VAYA } })],
  tx_bye: [t("¡Qué | buen | viaje! | Nos | vemos.", "What | good | ride! | Each-other | we-see.", "What a nice ride! See you.")],

  // ---- route 1: Hotel Mar Azul, $120
  tx_r1_dest: [t("Al | Hotel | Mar | Azul, | por favor. | Yo | le | digo | por | dónde.", "To-the | Hotel | Sea | Blue, | please. | I | to-you | tell | by | where.", "To the Hotel Mar Azul, please. I'll tell you the way.")],
  tx_r1_c1: [t("Dé vuelta | a la izquierda | en | el | Banco | del | Puerto.", "Turn | to the left | at | the | Bank | of-the | Harbor.", "Turn left at Banco del Puerto.",
    { spain: t("Gire | a la izquierda | en | el | Banco | del | Puerto.", "Turn | to the left | at | the | Bank | of-the | Harbor.", "Turn left at Banco del Puerto.") })],
  tx_r1_c2: [t("Tome | la | segunda | calle | a la derecha: | la | calle | Uxmal.", "Take | the | second | street | to the right: | the | street | Uxmal.", "Take the second street on the right: Calle Uxmal.")],
  tx_r1_c3: [t("Ahora | dé vuelta | a la derecha, | en | la | calle | Flamboyán.", "Now | turn | to the right, | onto | the | street | Flamboyán.", "Now turn right, onto Calle Flamboyán.",
    { spain: t("Ahora | gire | a la derecha, | en | la | calle | Flamboyán.", "Now | turn | to the right, | onto | the | street | Flamboyán.", "Now turn right, onto Calle Flamboyán.") })],
  tx_r1_c4: [t("Siga | derecho, | pasando | los | Departamentos | Las | Palmas.", "Keep-going | straight, | passing | the | Apartments | The | Palms.", "Go straight, past the Las Palmas apartments.",
    { spain: t("Siga | recto, | pasando | los | Departamentos | Las | Palmas.", "Keep-going | straight, | passing | the | Apartments | The | Palms.", "Go straight, past the Las Palmas apartments.") })],
  tx_r1_c5: [t("Dé vuelta | a la izquierda | en | la | farmacia, | en | la | avenida | Juárez.", "Turn | to the left | at | the | pharmacy, | onto | the | avenue | Juárez.", "Turn left at the pharmacy, onto Avenida Juárez.",
    { spain: t("Gire | a la izquierda | en | la | farmacia, | en | la | avenida | Juárez.", "Turn | to the left | at | the | pharmacy, | onto | the | avenue | Juárez.", "Turn left at the pharmacy, onto Avenida Juárez.") })],
  tx_r1_c6: [t("Pare | aquí, | frente al | hotel. | Está | enfrente de | la | farmacia.", "Stop | here, | in front of the | hotel. | It's | across from | the | pharmacy.", "Stop here, in front of the hotel. It's across from the pharmacy.")],
  tx_r1_a_fare: [t("Son | ciento veinte | pesos.", "They-are | one hundred twenty | pesos.", "That's 120 pesos.", { flags: { 2: F_PESOS } })],
  tx_r1_tip_great: [t("¡Qué | bien | maneja! | Tenga | ciento cuarenta. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred forty. | Keep | with | the | change.", "You drive so well! Here's 140. Keep the change.",
    { spain: t("¡Qué | bien | conduce! | Tenga | ciento cuarenta. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred forty. | Keep | with | the | change.", "You drive so well! Here's 140. Keep the change.") })],
  tx_r1_tip_good: [t("¡Muy | bien! | Tenga | ciento treinta. | Quédese | con | el | cambio.", "Very | good! | Have | one hundred thirty. | Keep | with | the | change.", "Very good! Here's 130. Keep the change.")],
  tx_r1_tip_ok: [t("¡Llegamos! | Tenga | ciento veinticinco. | Quédese | con | el | cambio.", "We-arrived! | Have | one hundred twenty-five. | Keep | with | the | change.", "We made it! Here's 125. Keep the change.",
    { spain: t("¡Hemos | llegado! | Tenga | ciento veinticinco. | Quédese | con | el | cambio.", "We-have | arrived! | Have | one hundred twenty-five. | Keep | with | the | change.", "We made it! Here's 125. Keep the change.") })],

  // ---- route 2: Mercado Municipal, $100
  tx_r2_dest: [t("Al | Mercado | Municipal, | por favor. | Yo | le | digo | por | dónde.", "To-the | Market | Municipal, | please. | I | to-you | tell | by | where.", "To the town market, please. I'll tell you the way.")],
  tx_r2_c1: [t("Tome | la | primera | a la izquierda: | la | calle | Itzamná.", "Take | the | first | to the left: | the | street | Itzamná.", "Take the first left: Calle Itzamná.", { flags: { 2: F_PRIMERA } })],
  tx_r2_c2: [t("Dé vuelta | a la derecha | en | la | calle | Hidalgo.", "Turn | to the right | onto | the | street | Hidalgo.", "Turn right onto Calle Hidalgo.",
    { spain: t("Gire | a la derecha | en | la | calle | Hidalgo.", "Turn | to the right | onto | the | street | Hidalgo.", "Turn right onto Calle Hidalgo.") })],
  tx_r2_c3: [t("Tome | la | segunda | a la derecha: | la | calle | Flamboyán.", "Take | the | second | to the right: | the | street | Flamboyán.", "Take the second right: Calle Flamboyán.", { flags: { 2: F_SEGUNDA } })],
  tx_r2_c4: [t("Siga | derecho, | cruzando | la | avenida | Juárez.", "Keep-going | straight, | crossing | the | avenue | Juárez.", "Go straight, across Avenida Juárez.",
    { spain: t("Siga | recto, | cruzando | la | avenida | Juárez.", "Keep-going | straight, | crossing | the | avenue | Juárez.", "Go straight, across Avenida Juárez.") })],
  tx_r2_c5: [t("En | el | mercado, | dé vuelta | a la derecha.", "At | the | market, | turn | to the right.", "At the market, turn right.",
    { spain: t("En | el | mercado, | gire | a la derecha.", "At | the | market, | turn | to the right.", "At the market, turn right.") })],
  tx_r2_c6: [t("Pare | aquí, | frente al | mercado. | El | malecón | está | enfrente.", "Stop | here, | in front of the | market. | The | seafront | is | across.", "Stop here, in front of the market. The malecón is across the street.")],
  tx_r2_a_fare: [t("Son | cien | pesos.", "They-are | one hundred | pesos.", "That's 100 pesos.", { flags: { 2: F_PESOS } })],
  tx_r2_tip_great: [t("¡Qué | bien | maneja! | Tenga | ciento veinte. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred twenty. | Keep | with | the | change.", "You drive so well! Here's 120. Keep the change.",
    { spain: t("¡Qué | bien | conduce! | Tenga | ciento veinte. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred twenty. | Keep | with | the | change.", "You drive so well! Here's 120. Keep the change.") })],
  tx_r2_tip_good: [t("¡Muy | bien! | Tenga | ciento diez. | Quédese | con | el | cambio.", "Very | good! | Have | one hundred ten. | Keep | with | the | change.", "Very good! Here's 110. Keep the change.")],
  tx_r2_tip_ok: [t("¡Llegamos! | Tenga | ciento cinco. | Quédese | con | el | cambio.", "We-arrived! | Have | one hundred five. | Keep | with | the | change.", "We made it! Here's 105. Keep the change.",
    { spain: t("¡Hemos | llegado! | Tenga | ciento cinco. | Quédese | con | el | cambio.", "We-have | arrived! | Have | one hundred five. | Keep | with | the | change.", "We made it! Here's 105. Keep the change.") })],

  // ---- route 3: Banco del Puerto, $100
  tx_r3_dest: [t("Al | Banco | del | Puerto, | por favor. | Yo | le | digo | por | dónde.", "To-the | Bank | of-the | Harbor, | please. | I | to-you | tell | by | where.", "To Banco del Puerto, please. I'll tell you the way.")],
  tx_r3_c1: [t("Dé vuelta | a la derecha | en | la | Policía | Municipal.", "Turn | to the right | at | the | Police | Municipal.", "Turn right at the police station.",
    { spain: t("Gire | a la derecha | en | la | Policía | Municipal.", "Turn | to the right | at | the | Police | Municipal.", "Turn right at the police station.") })],
  tx_r3_c2: [t("Luego | dé vuelta | a la izquierda, | en | la | avenida | del | Puerto.", "Then | turn | to the left, | onto | the | avenue | of-the | Harbor.", "Then turn left, onto Avenida del Puerto.",
    { spain: t("Luego | gire | a la izquierda, | en | la | avenida | del | Puerto.", "Then | turn | to the left, | onto | the | avenue | of-the | Harbor.", "Then turn left, onto Avenida del Puerto.") })],
  tx_r3_c3: [t("Tome | la | segunda | a la izquierda, | junto al | mercado.", "Take | the | second | to the left, | next to the | market.", "Take the second left, by the market.", { flags: { 2: F_SEGUNDA } })],
  tx_r3_c4: [t("Dé vuelta | a la izquierda | en | el | hotel, | en | la | avenida | Juárez.", "Turn | to the left | at | the | hotel, | onto | the | avenue | Juárez.", "Turn left at the hotel, onto Avenida Juárez.",
    { spain: t("Gire | a la izquierda | en | el | hotel, | en | la | avenida | Juárez.", "Turn | to the left | at | the | hotel, | onto | the | avenue | Juárez.", "Turn left at the hotel, onto Avenida Juárez.") })],
  tx_r3_c5: [t("Siga | derecho, | pasando | el | museo.", "Keep-going | straight, | passing | the | museum.", "Go straight, past the museum.",
    { spain: t("Siga | recto, | pasando | el | museo.", "Keep-going | straight, | passing | the | museum.", "Go straight, past the museum.") })],
  tx_r3_c6: [t("Pare | aquí, | frente al | banco. | Está | al lado del | correo.", "Stop | here, | in front of the | bank. | It's | next to the | post office.", "Stop here, in front of the bank. It's next to the post office.",
    { spain: t("Pare | aquí, | frente al | banco. | Está | al lado de | Correos.", "Stop | here, | in front of the | bank. | It's | next to | the-post-office.", "Stop here, in front of the bank. It's next to the post office.") })],
  tx_r3_a_fare: [t("Son | cien | pesos.", "They-are | one hundred | pesos.", "That's 100 pesos.", { flags: { 2: F_PESOS } })],
  tx_r3_tip_great: [t("¡Qué | bien | maneja! | Tenga | ciento veinte. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred twenty. | Keep | with | the | change.", "You drive so well! Here's 120. Keep the change.",
    { spain: t("¡Qué | bien | conduce! | Tenga | ciento veinte. | Quédese | con | el | cambio.", "How | well | you-drive! | Have | one hundred twenty. | Keep | with | the | change.", "You drive so well! Here's 120. Keep the change.") })],
  tx_r3_tip_good: [t("¡Muy | bien! | Tenga | ciento diez. | Quédese | con | el | cambio.", "Very | good! | Have | one hundred ten. | Keep | with | the | change.", "Very good! Here's 110. Keep the change.")],
  tx_r3_tip_ok: [t("¡Llegamos! | Tenga | ciento cinco. | Quédese | con | el | cambio.", "We-arrived! | Have | one hundred five. | Keep | with | the | change.", "We made it! Here's 105. Keep the change.",
    { spain: t("¡Hemos | llegado! | Tenga | ciento cinco. | Quédese | con | el | cambio.", "We-have | arrived! | Have | one hundred five. | Keep | with | the | change.", "We made it! Here's 105. Keep the change.") })],
};

/** What else the learner may say for each of their own lines (lower case, no accents or punctuation). */
export const TAXI_ACCEPT: Record<string, string[]> = {
  tx_a_where: ["a donde vamos", "adonde vamos", "a donde", "a donde lo llevo", "a donde la llevo", "a donde le llevo", "a donde va"],
  tx_a_here: ["ya llegamos", "llegamos", "aqui estamos", "ya hemos llegado", "hemos llegado"],
  tx_a_bye: ["gracias que le vaya bien", "que le vaya bien", "gracias", "muchas gracias", "gracias adios", "adios", "que le vaya muy bien"],
  tx_r1_a_fare: ["son ciento veinte pesos", "ciento veinte pesos", "son ciento veinte", "ciento veinte", "son 120 pesos", "120 pesos", "120"],
  tx_r2_a_fare: ["son cien pesos", "cien pesos", "son cien", "cien", "son 100 pesos", "100 pesos", "100"],
  tx_r3_a_fare: ["son cien pesos", "cien pesos", "son cien", "cien", "son 100 pesos", "100 pesos", "100"],
};
