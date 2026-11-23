import { t } from "@/content/dsl";
import type { SentSrc } from "@/content/types";

export const BILLIARDS_SITUATION = "x11-billar";
export const BILLIARDS_NPC = "memo";
export const GROUP_KEYS = ["h_lisas", "h_rayadas"] as const;
export const REPLY_KEYS = ["h_buena", "h_gracias"] as const;
export const GROUP_ANSWERS = { h_lisas: ["lisa", "lisas"], h_rayadas: ["rayada", "rayadas"] };

const ballWords = [
  ["uno", "One"], ["dos", "Two"], ["tres", "Three"], ["cuatro", "Four"],
  ["cinco", "Five"], ["seis", "Six"], ["siete", "Seven"], ["ocho", "Eight"],
  ["nueve", "Nine"], ["diez", "Ten"], ["once", "Eleven"], ["doce", "Twelve"],
  ["trece", "Thirteen"], ["catorce", "Fourteen"], ["quince", "Fifteen"],
];
export const BALL_WORDS = ballWords.map(([es]) => es);

export const BILLIARDS_LINES: Record<string, SentSrc[]> = {
  ...Object.fromEntries(ballWords.map(([es, en], i) => [
    `bl_b${i + 1}`, [t(`La | ${es},`, `The | ${en.toLowerCase()},`, `${en} ball,`)],
  ])),
  bl_p_fl: [t("a | la esquina | de allá, | a la izquierda.", "to | the corner | over-there, | to-the-left.", "far left corner.", { spain: t("a | la esquina | del fondo, | a la izquierda.", "to | the corner | at-the-back, | to-the-left.", "far left corner.") })],
  bl_p_fr: [t("a | la esquina | de allá, | a la derecha.", "to | the corner | over-there, | to-the-right.", "far right corner.", { spain: t("a | la esquina | del fondo, | a la derecha.", "to | the corner | at-the-back, | to-the-right.", "far right corner.") })],
  bl_p_ls: [t("a | la de en medio, | a la izquierda.", "to | the-one-in-the-middle, | to-the-left.", "left side pocket.", { spain: t("a | la del medio, | a la izquierda.", "to | the-one-in-the-middle, | to-the-left.", "left side pocket.") })],
  bl_p_rs: [t("a | la de en medio, | a la derecha.", "to | the-one-in-the-middle, | to-the-right.", "right side pocket.", { spain: t("a | la del medio, | a la derecha.", "to | the-one-in-the-middle, | to-the-right.", "right side pocket.") })],
  bl_p_nl: [t("a | la esquina | de acá, | a la izquierda.", "to | the corner | over-here, | to-the-left.", "near left corner.", { spain: t("a | la esquina | de aquí, | a la izquierda.", "to | the corner | over-here, | to-the-left.", "near left corner.") })],
  bl_p_nr: [t("a | la esquina | de acá, | a la derecha.", "to | the corner | over-here, | to-the-right.", "near right corner.", { spain: t("a | la esquina | de aquí, | a la derecha.", "to | the corner | over-here, | to-the-right.", "near right corner.") })],
  bl_which: [t("¿Lisas | o | rayadas?", "Solids | or | stripes?", "Solids or stripes?")],
  bl_solids: [t("Muy bien, | usted | lleva | las lisas.", "Very well, | you | carry | the solids.", "All right, you're solids.")],
  bl_stripes: [t("Muy bien, | usted | lleva | las rayadas.", "Very well, | you | carry | the stripes.", "All right, you're stripes.")],
  bl_break: [t("Usted | rompe. | ¡Duro!", "You | break. | Hard!", "Your break. Hit them hard!")],
  bl_call: [t("Cante | su | tiro.", "Call | your | shot.", "Call your shot.")],
  bl_your_turn: [t("Le | toca.", "(To) you | it-touches.", "Your turn.", { flags: { 1: "tocar: here, to be someone's turn." } })],
  bl_my_turn: [t("Me | toca.", "(To) me | it-touches.", "My turn.")],
  bl_nice: [t("¡Buen | tiro!", "Good | shot!", "Nice shot!")],
  bl_close: [t("¡Uy, | casi!", "Oops, | almost!", "Oh, so close!")],
  bl_again: [t("Tire | otra vez.", "Shoot | another-time.", "Shoot again.")],
  bl_wrong_pocket: [t("¡Esa | no | era | la buchaca!", "That-one | not | was | the pocket!", "Wrong pocket!", { neutral: t("¡Esa | no | era | la tronera!", "That-one | not | was | the pocket!", "Wrong pocket!") })],
  bl_wrong_ball: [t("¡Esa | no | era | la bola!", "That-one | not | was | the ball!", "Wrong ball!")],
  bl_scratch: [t("¡Uy, | se metió | la blanca!", "Oops, | it-went-in | the white!", "Oops, scratch!")],
  bl_missed: [t("¡Ay, | la fallé!", "Oh, | I-missed-it!", "Oh, I missed!")],
  bl_yes: [t("¡Eso!", "That!", "Yes!", { flags: { 0: "¡Eso!: “that's it!”" } })],
  bl_eight: [t("Ahora, | la ocho.", "Now, | the eight.", "Now the eight ball.")],
  bl_eight_back: [t("No pasa nada, | la ocho | regresa | a | la mesa.", "It's-nothing, | the eight | goes-back | to | the table.", "No worries, the eight goes back on the table.")],
  bl_you_win: [t("¡Ganó | usted! | ¡Buena | partida!", "Won | you! | Good | game!", "You win! Good game!")],
  bl_i_win: [t("Esta vez | gané | yo. | ¡Buena | partida!", "This-time | won | I. | Good | game!", "I win this time. Good game!")],
  bl_tie: [t("¡Empate! | ¡Buena | partida!", "Tie! | Good | game!", "It's a tie! Good game!")],
  bl_time: [t("¡Se acabó | el tiempo! | A | contar | bolas.", "It-ran-out | the time! | To | count | balls.", "Time's up! Let's count the balls.")],
  bl_rematch: [t("¿Otra | partida?", "Another | game?", "One more game?")],
  bl_thanks: [t("¡Gracias | por | la partida!", "Thanks | for | the game!", "Thanks for the game!")],
  h_lisas: [t("Las | lisas, | por favor.", "The | solids, | please.", "Solids, please.")],
  h_rayadas: [t("Yo | quiero | las | rayadas.", "I | want | the | stripes.", "I'll take stripes.")],
  h_buena: [t("¡Buena | partida!", "Good | game!", "Good game!")],
  h_gracias: [t("¡Gracias, | estuvo | divertido!", "Thanks, | it-was | fun!", "Thanks, that was fun!")],
  rules_ex: [t("Así: | la siete, | a | la buchaca | de | la esquina.", "Like-this: | the seven, | to | the pocket | of | the corner.", "Like this: seven ball, corner pocket.", { neutral: t("Así: | la siete, | a | la tronera | de | la esquina.", "Like-this: | the seven, | to | the pocket | of | the corner.", "Like this: seven ball, corner pocket.") })],
};
