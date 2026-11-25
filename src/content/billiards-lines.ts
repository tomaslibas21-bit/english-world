import { t } from "./dsl";
import type { SentSrc } from "./types";

export const BILLIARDS_SITUATION = "x01-pool-hall";

const ballWords = [
  ["One", "Pirmas"], ["Two", "Antras"], ["Three", "Trečias"], ["Four", "Ketvirtas"],
  ["Five", "Penktas"], ["Six", "Šeštas"], ["Seven", "Septintas"], ["Eight", "Aštuntas"],
  ["Nine", "Devintas"], ["Ten", "Dešimtas"], ["Eleven", "Vienuoliktas"], ["Twelve", "Dvyliktas"],
  ["Thirteen", "Tryliktas"], ["Fourteen", "Keturioliktas"], ["Fifteen", "Penkioliktas"],
];

export const BALL_WORDS = ballWords.map(([english]) => english.toLowerCase());

export const BILLIARDS_LINES: Record<string, SentSrc[]> = {
  ...Object.fromEntries(ballWords.map(([en, lt], i) => [
    `bl_b${i + 1}`, [t(`${en} | ball,`, `${lt} | kamuolys,`, `${lt} kamuolys,`)],
  ])),
  bl_p_fl: [t("far | left | corner.", "tolimasis | kairysis | kampas.", "į tolimąjį kairįjį kampą.")],
  bl_p_fr: [t("far | right | corner.", "tolimasis | dešinysis | kampas.", "į tolimąjį dešinįjį kampą.")],
  bl_p_ls: [t("left | side pocket.", "kairioji | vidurinė kišenė.", "į kairiąją vidurinę kišenę.")],
  bl_p_rs: [t("right | side pocket.", "dešinioji | vidurinė kišenė.", "į dešiniąją vidurinę kišenę.")],
  bl_p_nl: [t("near | left | corner.", "artimasis | kairysis | kampas.", "į artimąjį kairįjį kampą.")],
  bl_p_nr: [t("near | right | corner.", "artimasis | dešinysis | kampas.", "į artimąjį dešinįjį kampą.")],
  bl_which: [t("Solids | or | stripes?", "Vienspalviai | ar | dryžuoti?", "Vienspalviai ar dryžuoti?")],
  bl_solids: [t("OK, | you're | solids.", "Gerai, | Jūs esate | vienspalviai.", "Gerai, Jūs žaidžiate vienspalviais.")],
  bl_stripes: [t("OK, | you're | stripes.", "Gerai, | Jūs esate | dryžuoti.", "Gerai, Jūs žaidžiate dryžuotais.")],
  bl_break: [t("Your | break. | Hit them | hard!", "Jūsų | pradinis smūgis. | Muškite | stipriai!", "Jūs pradedate – muškite stipriai!")],
  bl_call: [t("Call | your | shot.", "Paskelbkite | savo | smūgį.", "Paskelbkite smūgį.")],
  bl_your_turn: [t("Your | turn.", "Jūsų | eilė.", "Jūsų eilė.")],
  bl_my_turn: [t("My | turn.", "Mano | eilė.", "Mano eilė.")],
  bl_nice: [t("Nice | shot!", "Gražus | smūgis!", "Gražus smūgis!")],
  bl_close: [t("Oh, | so | close!", "Oi, | taip | arti!", "Oi, beveik!")],
  bl_again: [t("Shoot | again!", "Muškite | vėl!", "Muškite dar kartą!")],
  bl_wrong_pocket: [t("Wrong | pocket!", "Ne ta | kišenė!", "Ne ta kišenė!")],
  bl_wrong_ball: [t("Wrong | ball!", "Ne tas | kamuolys!", "Ne tas kamuolys!")],
  bl_scratch: [t("Oops, | scratch!", "Oi, | baltasis įkrito!", "Oi, baltasis įkrito!")],
  bl_missed: [t("Oh, | I | missed!", "Oi, | aš | nepataikiau!", "Oi, nepataikiau!")],
  bl_yes: [t("Yes!", "Yra!", "Yra!")],
  bl_eight: [t("Now | the eight ball.", "Dabar | aštuntasis.", "Dabar – aštuntasis kamuolys.")],
  bl_eight_back: [t("No worries, | I'll put | the eight | back.", "Nieko tokio, | padėsiu | aštuntąjį | atgal.", "Nieko tokio, aštuntąjį padėsiu atgal.")],
  bl_you_win: [t("You | win! | Good | game!", "Jūs | laimėjote! | Gera | partija!", "Jūs laimėjote! Gera partija!")],
  bl_i_win: [t("I | win | this time. | Good | game!", "Aš | laimėjau | šįkart. | Gera | partija!", "Šįkart laimėjau aš. Gera partija!")],
  bl_tie: [t("It's | a tie! | Good | game!", "Tai | lygiosios! | Gera | partija!", "Lygiosios! Gera partija!")],
  bl_time: [t("Time's up! | Let's count | the balls.", "Laikas baigėsi! | Suskaičiuokime | kamuolius.", "Laikas baigėsi! Suskaičiuokime kamuolius.")],
  bl_rematch: [t("One | more | game?", "Dar | vieną | partiją?", "Dar vieną partiją?")],
  bl_thanks: [t("Thanks | for | the game!", "Ačiū | už | partiją!", "Ačiū už partiją!")],
  h_gg: [t("Good | game!", "Gera | partija!", "Gera partija!")],
  h_fun: [t("Thanks, | that | was | fun!", "Ačiū, | tai | buvo | smagu!", "Ačiū, buvo smagu!")],
  h_solids: [t("Solids, | please.", "Vienspalvius, | prašau.", "Vienspalvius, prašau.")],
  h_stripes: [t("I'll take | stripes.", "Imsiu | dryžuotus.", "Imsiu dryžuotus.")],
  rules_ex: [t("Like this: | Seven | ball, | corner | pocket.", "Štai taip: | Septintas | kamuolys, | kampinė | kišenė.", "Štai taip: „Septintas kamuolys – į kampinę kišenę.“")],
};
