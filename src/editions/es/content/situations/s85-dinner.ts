// Song 85 "Thanks for Having Me" → Puerto Colibrí: "Gracias por invitarme". Dinner at Diego and Natalia's (both tú,
// as friends say in Mexico). The learner is the guest: says hello and thanks, gives a small gift ("Les traje un
// detallito"), answers "¿Qué te ofrezco de tomar?", offers to help ("¿Les ayudo en algo?"), praises the house, the
// smell and the food ("¡Está riquísima!"), asks for the salt or the tortillas ("¿Me pasas la sal?"), says yes or no to
// seconds ("¿Te sirvo otro poquito?" – "No, gracias, estoy lleno/llena") and to dessert (flan), and leaves politely
// ("Ya me voy, que es tarde", "Gracias por todo"). Diego (m) and Natalia (f) take turns.
// The meal is the coast's own: cochinita pibil (Yucatán-style pork with achiote) with tortillas, red onion, lime and
// habanero salsa; agua de jamaica to drink; flan for dessert.
// Mexico, not Maple Harbor: nobody takes a coat on the Caribbean coast, so the "coat" step is the host's "Siéntate,
// estás en tu casa"; hosts answer "Gracias por invitarme" with "¡Al contrario!"; a gift gets "No te hubieras
// molestado"; a guest who is a little late hears "Llegaste justo a tiempo"; the sobremesa (staying at the table to
// talk after the meal) is why Natalia asks you to stay; hosts pack food to take home ("para llevar": here always,
// cochinita, or flan for a guest who eats no meat) and ask "Avísanos cuando llegues".
// Twists (later visits, as in the English): Diego asks for the tortillas, Natalia burns the rice, Michi the cat (are
// you allergic?), a dietary question at the door, and "¿Ya te vas? ¡Quédate otro ratito, estamos en la sobremesa!".
// The learner speaks to both hosts: the hints use ustedes ("Les traje…", "¿Les ayudo?"); tú to one host and
// vosotros (Spain) are understood too.
// Mexican-only words (each with a neutral twin): pásale, órale, ahorita, ándale, recámara; puerco (twin: cerdo).
// Who cooked what: Diego the cochinita (Natalia's mom's recipe), Natalia the flan (her grandma's) and the rice.
// Facts kept vague: no prices, no clock times except "casi las once"; the allergy reply promises only to say what is
// in each dish.
//
// NEEDS: global.ts g_bye takes "igualmente" as a goodbye: at the table ("¡Buen provecho!" – "Igualmente") that would
// end the visit; handled here in provecho and g_bye. global.ts @greet reads "buenas noches" as a hello at any time;
// handled here in good_night (a goodbye once dinner has been served).

import type { Ctx, EntityDef, Handler, Pending, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const ART_GEN = "The article before a noun in general has no English word here.";
const ART_TIME = "The article before a clock time has no English word.";
const AHORITA = "Mexican: ahorita = right now, in a moment.";
const JAMAICA = "agua de jamaica: a cold drink of hibiscus flowers, water and sugar.";
const PIBIL = "cochinita pibil: pork marinated in achiote and sour-orange juice, slow-cooked in banana leaves; from the Yucatán peninsula.";
const HABANERO = "habanero: the very hot chili of the Yucatán peninsula.";
const AGRIA = "naranja agria: sour (Seville) orange, the Yucatán's everyday souring juice.";
const SOBREMESA = "sobremesa: the long chat at the table after a meal; Mexican hosts love it.";
const AL_CONTRARIO = "al contrario: the usual reply to “thanks for inviting me”.";

// ---------------------------------------------------------------------------
// Entities

const GIFTS: EntityDef[] = [
  ent("flowers", "flores", "flowers", "f", { art: "", forms: ["flor", "unas flores", "un ramo", "un ramo de flores", "rosas", "unas rosas", "florecitas"], chip: "flores" }),
  ent("wine", "vino", "wine", "m", { forms: ["botella de vino", "una botella de vino", "vinito", "un vinito", "vino tinto", "vino blanco"], chip: "un vino" }),
  ent("chocolates", "chocolates", "chocolates", "m", { art: "", forms: ["chocolate", "bombones", "unos bombones", "caja de chocolates", "una caja de chocolates", "chocolatitos"], chip: "chocolates" }),
  ent("cake", "pastel", "cake", "m", { forms: ["pastelito", "un pastel", "pastel de chocolate", "pastel de tres leches", "tres leches", "tarta"], chip: "un pastel" }),
  ent("pie", "pay", "pie", "m", { forms: ["pay de limon", "pay de queso", "un pay"], chip: "un pay" }),
  ent("dessert", "postre", "dessert", "m", { forms: ["un postre", "postrecito", "algo dulce"], chip: "un postre" }),
  ent("cookies", "galletas", "cookies", "f", { art: "", forms: ["galleta", "galletitas", "unas galletas"], chip: "galletas" }),
  ent("pan_dulce", "pan | dulce", "bread | sweet", "m", { art: "", forms: ["pan de dulce", "conchas", "unas conchas", "panecitos"], chip: "pan dulce", attrs: { nat: "pan dulce (sweet bread)" } }),
  ent("mezcal", "mezcal", "mezcal", "m", { forms: ["un mezcal", "botella de mezcal", "una botella de mezcal", "tequila", "un tequila", "botella de tequila", "una botella de tequila"], chip: "un mezcal" }),
];

const DRINKS: EntityDef[] = [
  ent("water", "agua", "water", "f", { art: "", def: "el", forms: ["agua natural", "agua simple", "agua sin gas", "un vaso de agua", "vaso de agua", "agua de la llave", "aguita"], chip: "agua" }),
  ent("sparkling_water", "agua | mineral", "water | sparkling", "f", { art: "", def: "el", forms: ["agua con gas", "mineral", "agua gasificada", "una mineral"], chip: "agua mineral", attrs: { nat: "sparkling water" } }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "", def: "el", forms: ["jamaica", "agua de flor de jamaica", "aguita de jamaica"], chip: "agua de jamaica", attrs: { nat: "agua de jamaica (hibiscus water)" } }),
  ent("lemonade", "limonada", "lemonade", "f", { forms: ["agua de limon", "limonada natural"], chip: "una limonada" }),
  ent("red_wine", "vino | tinto", "wine | red", "m", { forms: ["tinto", "copa de vino tinto", "vinito tinto", "copa de tinto"], chip: "un vino tinto", attrs: { nat: "red wine" } }),
  ent("white_wine", "vino | blanco", "wine | white", "m", { forms: ["blanco", "copa de vino blanco", "vinito blanco", "copa de blanco"], chip: "un vino blanco", attrs: { nat: "white wine" } }),
  ent("wine_glass", "vino", "wine", "m", { forms: ["copa de vino", "una copa de vino", "vinito", "un vinito", "una copita"], chip: "un vino" }),
  ent("beer", "cerveza", "beer", "f", { forms: ["chela", "una chela", "cheve", "cervecita", "una cervecita", "cana", "birra", "cervezas", "chelas"], chip: "una cerveza" }),
  ent("soda", "refresco", "soda", "m", { forms: ["coca", "una coca", "coca cola", "refresquito", "soda", "gaseosa", "refresco de cola"], chip: "un refresco" }),
  ent("juice", "jugo", "juice", "m", { forms: ["jugo de naranja", "juguito", "un juguito"], chip: "un jugo" }),
  ent("tea", "té", "tea", "m", { forms: ["te", "tecito", "un tecito"], chip: "un té" }),
  ent("coffee", "café", "coffee", "m", { forms: ["cafe", "cafecito", "un cafecito", "cafe de olla"], chip: "un café" }),
  ent("tequila", "tequila", "tequila", "m", { forms: ["tequilita", "un tequilita", "mezcal", "un mezcal", "mezcalito", "un mezcalito", "caballito"], chip: "un tequila" }),
];

// The article is part of the head ("la | sal"): "¿Me pasas la sal?", "¿Me pasas las tortillas?"
const PASS: EntityDef[] = [
  ent("salt", "la | sal", "the | salt", "f", { art: "", forms: ["sal", "salecita", "el salero", "salero"], chip: "la sal" }),
  ent("pepper", "la | pimienta", "the | pepper", "f", { art: "", forms: ["pimienta"], chip: "la pimienta" }),
  ent("tortillas", "las | tortillas", "the | tortillas", "f", { art: "", forms: ["tortillas", "tortilla", "tortillitas", "una tortilla", "otra tortilla", "el tortillero", "la tortilla"], chip: "las tortillas" }),
  ent("salsa", "la | salsa", "the | salsa", "f", { art: "", forms: ["salsa", "salsita", "la salsita", "salsa de habanero", "salsa verde", "salsa roja", "chile", "el chile", "habanero", "el habanero", "la salsa picante"], chip: "la salsa" }),
  ent("lime", "el | limón", "the | lime", "m", { art: "", forms: ["limon", "limones", "los limones", "limoncito", "limoncitos"], chip: "el limón" }),
  ent("onion", "la | cebolla", "the | onion", "f", { art: "", forms: ["cebolla", "cebollita", "cebolla morada", "cebollitas", "la cebolla morada", "las cebollitas"], chip: "la cebolla" }),
  ent("water_jug", "el | agua", "the | water", "f", { art: "", forms: ["agua", "la jarra", "jarra de agua", "la jarra de agua", "el agua de jamaica", "la jamaica"], chip: "el agua" }),
  ent("bread", "el | pan", "the | bread", "m", { art: "", forms: ["pan", "bolillo", "bolillos", "el bolillo", "los bolillos"], chip: "el pan" }),
  ent("rice", "el | arroz", "the | rice", "m", { art: "", forms: ["arroz"], chip: "el arroz" }),
  ent("beans", "los | frijoles", "the | beans", "m", { art: "", forms: ["frijoles", "frijol", "frijolitos", "los frijolitos"], chip: "los frijoles" }),
];

// ---------------------------------------------------------------------------
// Helpers

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open leave the list (their `when` checks goalMet). */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };
const dan = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("dan"); c.say(line, vars); };
const nora = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("nora"); c.say(line, vars); };
const hi = (c: Ctx) => { c.s.greeted = true; };
const seg0 = (intent: string) => ({ intent, slots: {}, tags: [] as string[] });

/** "Thanks" for a dinner or the evening (not for the salt). */
const THANKS_EVENING = /\bpor (todo|la cena|esta cena|la comida|invitar|recibir|la invitacion|una (noche|cena|velada)|esta noche)\b/;
/** "Igualmente", "Gracias, igualmente": an answer to "¡Buen provecho!" or a wish, never a goodbye by itself. */
const LIKEWISE = /^\W*(gracias\W*)?(igualmente|tu tambien|ustedes tambien|usted tambien)\W*(gracias)?\W*$/;

/** Pending questions: "Claro" / "Con gusto" count as yes, "No, perdón" as no. */
function yn(p: Pending): Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}

/** A step's question has its answer on record. A step asked twice counts as done (asked >= 2) so the visit moves on,
 *  but "¡Claro!" or "Con gusto" to that second ask still answers it, as a plain "Sí" does. */
const SETTLED: Record<string, (c: Ctx) => boolean> = {
  diet: (c) => !!c.s.diet, drink: (c) => !!c.s.drink, cat: (c) => !!c.s.cat, salad: (c) => !!c.s.saladDone, pass: (c) => !!c.s.passDone,
  seconds: (c) => c.s.seconds !== undefined, dessert: (c) => c.s.dessert !== undefined,
};
function stepYes(c: Ctx) {
  const st = dinner.steps.find((x) => x.id === c.step);
  if (st?.yes && !(SETTLED[st.id] ? SETTLED[st.id](c) : st.done(c))) st.yes(c);
}
function stepNo(c: Ctx) {
  const st = dinner.steps.find((x) => x.id === c.step);
  if (st?.no && !(SETTLED[st.id] ? SETTLED[st.id](c) : st.done(c))) st.no(c);
}

/** Goal: food praised, hosts thanked, left politely. */
function checkGoal(c: Ctx) {
  if (c.s.foodPraised && c.s.thanked && c.s.leaving) win(c);
}

// Answers the simulations give to the hosts' optional questions.
const AUTO: Record<string, string> = {
  drink: "Agua de jamaica, por favor.", diet: "No, como de todo.", cat: "No, me encantan los gatos.", salad: "¡Claro!",
  pass: "¡Claro, aquí tienes!", seconds: "Sí, un poquito.", dessert: "¡Sí! Un pedacito, por favor.", stay: "Me encantaría, pero mañana trabajo.",
  howisit: "¡Está riquísima!", burnt: "¡No te preocupes, está rico!", closing: "¡Gracias por todo! ¡Buenas noches!",
  howareyou: "Bien, gracias, ¿y ustedes?",
};
/** Sims without a twist: the visit's optional moments are off unless the sim turns one on. */
const PLAIN = (s: Record<string, any>) => {
  s.catTwist = false; s.passTwist = false; s.burntTwist = false; s.stayTwist = false; s.dietTwist = false; s.saladTask = false;
};

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) { hi(c); },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  g_howareyou(c, slots) { hi(c); GLOBAL_HANDLERS.g_howareyou(c as any, slots); },
  greet_back(c) { hi(c); },
  time_flies(c) { hi(c); if (once(c, "flies")) dan(c, /rapido|vuela|se (pasa|paso|va)/.test(heard(c)) ? "it_sure_does" : "i_know"); },
  thanks_invite(c) {
    hi(c);
    c.s.thanked = true;
    if (c.s.leaving) { goodbyeThanks(c); return; }
    if (once(c, "thx")) dan(c, "our_pleasure");
  },
  gift(c, slots) {
    hi(c);
    if (c.s.gift) { if (once(c, "gift")) nora(c, "thanks_again"); return; }
    const g = toArr(slots.gift)[0] as string | undefined;
    c.s.gift = g || "something";
    if (!once(c, "gift")) return;
    if (g === "flowers") nora(c, "gift_flowers");
    else if (g === "wine") dan(c, "gift_wine");
    else if (g === "mezcal") dan(c, "gift_mezcal");
    else if (g === "chocolates") nora(c, "gift_chocolates");
    else if (g === "cookies") nora(c, "gift_cookies");
    else if (g === "pan_dulce") nora(c, "gift_pan");
    else if (g === "dessert" || g === "cake" || g === "pie") nora(c, "gift_dessert");
    else nora(c, "gift_any");
  },
  // "Perdón, no traje nada": what matters is that you came
  no_gift(c) { hi(c); if (!c.s.gift && once(c, "nogift")) { c.s.noGiftSaid = true; nora(c, "no_gift_ok"); } },
  // drinks
  drink_ans(c, slots) {
    hi(c);
    const d = toArr(slots.drink)[0];
    // "Sí, un cafecito" to "¿Te sirvo algo más?": the after-dinner coffee, not the evening's drink
    if (c.step === "leave" && c.s.drink) { c.s.coffee = d || "coffee"; c.s.coffeeSettled = true; }
    else c.s.drink = d || "same";
    if (once(c, "drink")) dan(c, "drink_ok");
  },
  no_drink(c) {
    hi(c);
    // "Nada, gracias" to the after-dinner coffee keeps the evening's drink on record
    if (c.step === "leave" && c.s.drink) { c.s.coffeeSettled = true; if (c.s.stayed || asked(c, "leave") >= 2) { H.leave(c, {}, seg0("leave")); return; } }
    else c.s.drink = "none";
    if (once(c, "drink")) dan(c, "just_say");
  },
  ask_drinks(c, _slots, seg) {
    hi(c);
    c.s.listed = true;
    if (!once(c, "list")) return;
    dan(c, seg.tags.includes("noalc") ? "soft_list" : "drink_list");
  },
  // "No quiero cerveza", "No me gusta el vino": nothing is poured; Diego names the choices
  drink_neg(c) { hi(c); c.s.listed = true; if (once(c, "list")) dan(c, "drink_list"); },
  // at the table and around the house
  offer_help(c) {
    hi(c);
    if (!once(c, "help")) return;
    if (c.s.helpDone) { nora(c, "relax"); return; }
    c.s.helpDone = true;
    // the agua de jamaica goes to the table before dinner; offered after it, the guest is told to relax
    if (c.s.saladTask && !c.s.dinnerSaid) { c.s.saladAsked = true; c.ask("salad"); return; }
    nora(c, "relax");
  },
  praise_smell(c, _slots, seg) {
    hi(c);
    if (!once(c, "smell")) return;
    const what = seg.tags.includes("what"); // "¿Qué estás cocinando?" gets the dish, no "gracias"
    // "Ahorita la pruebas" only before dinner, and not to a guest who eats no meat (they have the rajas tacos)
    if (c.s.smellSaid) { dan(c, what ? (c.s.dinnerSaid || c.s.diet === "veg" ? "dish_is" : "dish_again") : "glad_you_like"); return; }
    c.s.smellSaid = true;
    dan(c, what ? "dish_is" : "smell_dish");
  },
  praise_home(c, _slots, seg) {
    hi(c);
    if (!once(c, "home")) return;
    if (seg.tags.includes("pictures")) nora(c, "pictures");
    // "La acabamos de pintar" is the house's answer; the view, the garden or the hammock get a plain thank-you
    else if (/\b(casa|cocina|sala)\b/.test(heard(c))) nora(c, "home_thanks");
    else nora(c, "glad_you_like");
  },
  praise_food(c, _slots, seg) {
    hi(c);
    // "No, está picante" typed with its comma answers "¿Te gusta?" with a no (by voice it stays "not spicy", rule 10)
    if (/^[\s¡¿]*no\s*[,.;!]\s*(esta|es)\s+(muy |un poco |algo |bien )?(picante|picos|salad|fuerte)/.test(heard(c))) { H.food_meh(c, {}, { ...seg, intent: "food_meh" }); return; }
    // "Sí, está buenísima" answering "¿Te sirvo otro poquito?" is a yes as well.
    if ((c.step === "seconds" || c.step === "dessert") && /^\W*(si|claro|pues si|ay si)\b|\bsi\W*$/.test(heard(c))) H.more_yes(c, {}, seg0("more_yes"));
    c.s.foodPraised = true;
    // Diego cooked the cochinita: "Cocinas muy bien" is his to answer
    if (once(c, "food")) { if (!/cocin|chef/.test(heard(c)) && c.chance(0.5)) nora(c, "glad_you_like"); else dan(c, "glad_you_like"); }
    checkGoal(c);
  },
  food_meh(c, _slots, seg) {
    hi(c);
    if (!once(c, "meh")) return;
    // "¿Esto pica?" is a question: an answer, not an apology
    if (/\?\s*$/.test(c.heard || "") && /pica|picant|picos/.test(heard(c))) { nora(c, "spicy_answer"); return; }
    if (seg.tags.includes("nospicy")) { nora(c, "no_spicy_ok"); return; }
    if (seg.tags.includes("bad")) { badFood(c); return; }
    // Diego cooked the cochinita: "Se me pasó la sal" is his to say
    if (/salad/.test(heard(c))) { dan(c, "sorry_salty"); return; }
    nora(c, "sorry_water");
  },
  made_yourself(c, _slots, seg) {
    hi(c);
    if (!once(c, "made")) return;
    const who = seg.tags.includes("who"); // "¿Quién cocinó?": "¡Yo!", not "¡Sí, yo!"
    if (seg.tags.includes("flan")) nora(c, who ? "flan_who" : "flan_mine");
    else dan(c, who ? "i_did_who" : "i_did");
    flanSaid(c);
  },
  // "¿Me das la receta?": Natalia texts it (her mom's); "¿Qué lleva?", "¿Qué es la cochinita?": Diego, who cooked it,
  // says what is in it (the salsa has its own answer; the flan's stays the recipe by text)
  recipe(c, _slots, seg) {
    hi(c);
    if (!once(c, "recipe")) return;
    if (!seg.tags.includes("what") || c.step === "dessert" || /flan|postre/.test(heard(c))) { nora(c, "recipe_ok"); return; }
    dan(c, /salsa/.test(heard(c)) ? "salsa_what" : "recipe_what");
  },
  pass(c, slots) {
    hi(c);
    const it = toArr(slots.pass)[0] as string | undefined;
    if (!once(c, "pass")) return;
    dan(c, it === "water_jug" ? "here_water" : "here_you_go");
  },
  late_sorry(c) { hi(c); if (!c.s.lateSorry && once(c, "late")) { c.s.lateSorry = true; dan(c, "on_time"); } },
  done_ctx(c) { H.here_you_go(c, {}, seg0("here_you_go")); },
  here_you_go(c) {
    hi(c);
    if (c.step === "pass" && !c.s.passDone) { c.s.passDone = true; dan(c, "thanks_pass"); return; }
    if (c.step === "salad" && !c.s.saladDone) { c.s.saladDone = true; nora(c, "star"); }
  },
  // "¡Buen provecho!" – "¡Igualmente!"; a bare "Igualmente" needs no answer
  provecho(c) { hi(c); if (/provecho/.test(heard(c)) && !c.s.provechoSaid && once(c, "provecho")) { c.s.provechoSaid = true; dan(c, "provecho_back"); } },
  cheers(c) { hi(c); if (!c.s.cheersSaid && once(c, "cheers")) { c.s.cheersSaid = true; dan(c, "cheers_back"); } },
  restroom(c) { hi(c); if (once(c, "wc")) nora(c, "restroom_where"); },
  // seconds and dessert
  more_yes(c, _slots, seg) {
    hi(c);
    // "¿Me sirves más?" asked by the guest at the table, before or after Natalia's offer: more of the dinner (once the
    // flan is in play, a bare "más" is the flan; "más cochinita" is always the dinner)
    const askMore = seg.tags.includes("ask") && !!c.s.dinnerSaid && (/cochinita/.test(heard(c)) || (c.step !== "dessert" && !c.s.dessertAsked));
    // a change of mind counts: "No, gracias" to the flan, then "Bueno, un pedacito"
    if (!askMore && (c.step === "dessert" || (c.s.dessertAsked && c.s.dessert !== "yes"))) {
      if (c.s.dessert === "no") { c.s.dessert = "yes"; if (once(c, "more")) nora(c, "changed_mind"); return; }
      c.s.dessert = "yes"; if (once(c, "more")) nora(c, seg.tags.includes("little") ? "small_piece" : "here_cake");
      return;
    }
    if (!askMore && c.step !== "seconds" && !(c.s.secondsAsked && c.s.seconds !== "yes")) return;
    if (c.s.seconds === "no") { c.s.seconds = "yes"; if (once(c, "more")) nora(c, "changed_mind"); return; }
    c.s.seconds = "yes";
    if (once(c, "more")) nora(c, seg.tags.includes("little") ? "just_a_little" : "here_more");
  },
  more_no(c) {
    hi(c);
    if (c.step === "dessert" || (c.s.dessertAsked && c.s.dessert === undefined)) {
      c.s.dessert = "no"; if (once(c, "more")) nora(c, "more_for_dan");
      return;
    }
    // "No, ya estoy bien" at "¿Te sirvo algo más?": a plain no to that question
    if (c.step !== "seconds" && !(c.s.secondsAsked && c.s.seconds === undefined)) { stepNo(c); return; }
    c.s.seconds = "no";
    if (once(c, "more")) saveRoom(c);
  },
  // twists
  reassure(c) {
    hi(c);
    if (c.step === "burnt" || (c.s.burntSaid && !c.s.burntOk)) { c.s.burntOk = true; if (once(c, "burnt")) nora(c, "youre_sweet"); }
  },
  diet_ok_ctx(c) { hi(c); c.s.diet = "all"; if (once(c, "diet")) dan(c, "diet_great"); },
  // No meat or no pork: the cochinita is pork, so the rajas tacos. No fish, seafood, chicken or beef: there is none
  // tonight, so Diego says what is in each dish (rajas would suggest the cochinita had it)
  diet_veg_ctx(c) {
    hi(c);
    const noPork = !/\b(pescado|mariscos|pollo|res)\b/.test(heard(c)) || /\b(carne|puerco|cerdo|vegetarian[oa]|vegan[oa])\b/.test(heard(c));
    c.s.diet = noPork ? "veg" : "other";
    if (once(c, "diet")) dan(c, noPork ? "diet_veg_ok" : "diet_allergy_ok");
  },
  diet_allergy_ctx(c) { hi(c); c.s.diet = "allergy"; if (once(c, "diet")) dan(c, "diet_allergy_ok"); },
  cat_ok_ctx(c) { hi(c); c.s.cat = "ok"; if (once(c, "cat")) dan(c, "cat_good"); },
  // "No me gustan los gatos" and "No, me encantan los gatos" sound the same (rule 10): a typed comma decides; by voice
  // Diego asks whether to shut Michi in, which settles it either way
  cat_dislike_ctx(c) {
    hi(c);
    if (/^[\s¡¿]*no\s*[,.;!]/i.test(c.heard || "")) { H.cat_ok_ctx(c, {}, seg0("cat_ok_ctx")); return; }
    if (!once(c, "cat")) return;
    c.s.cat = "unsure";
    dan(c, "cat_lock_q");
    c.expect(yn({
      id: "cat_lock", expects: ["cat_ok_ctx", "cat_allergic_ctx"], hints: ["cat_lock"], suggest: [{ lt: "Say if Michi should go to the bedroom", hint: "cat_lock" }],
      yes: (cc) => { cc.s.cat = "dislike"; dan(cc, "cat_lock_ok"); },
      no: (cc) => { cc.s.cat = "ok"; dan(cc, "cat_good"); },
      on: { cat_ok_ctx: (cc) => { cc.s.cat = "ok"; dan(cc, "cat_good"); }, cat_allergic_ctx: (cc) => { cc.s.cat = "allergic"; dan(cc, "cat_lock_ok"); } },
    }));
  },
  cat_allergic_ctx(c) { hi(c); c.s.cat = "allergic"; if (once(c, "cat")) dan(c, "cat_away"); },
  // leaving
  leave(c) {
    hi(c);
    if (!once(c, "leave")) return; // "Ya me voy, mañana trabajo temprano" is one wish to leave
    // "Se me hizo tarde, perdón" at the door: I'm late, not I must go
    if (!c.s.dinnerSaid && /se me hizo tarde|llegue tarde/.test(heard(c)) && (c.step === "arrive" || c.step === "coat" || !c.s.drink)) { H.late_sorry(c, {}, seg0("late_sorry")); return; }
    if (c.s.leaving) { goodbyeThanks(c); return; }
    // before dinner, or with the main course on the table: Natalia protests once
    const eating = !!c.s.dinnerSaid && !c.s.dessertAsked && !c.s.lateSaid;
    if ((!c.s.dinnerSaid || eating) && !c.s.earlyLeave) { c.s.earlyLeave = true; nora(c, eating ? "but_eating" : "but_dinner"); return; }
    // "¡Quédate otro ratito, estamos en la sobremesa!" only once dinner is over
    if (c.s.stayTwist && !c.s.stayAsked && c.s.lateSaid) {
      c.s.stayAsked = true; c.twist("stay_longer");
      nora(c, "stay_longer");
      const go = (cc: Ctx) => {
        if (cc.s.leaving) return;
        if (/gracias/.test(heard(cc))) cc.s.thanked = true;
        letGo(cc);
        if (/buenas noches|adios|hasta luego|nos vemos|bye/.test(heard(cc))) goodbyeThanks(cc);
      };
      c.expect(yn({
        id: "stay", expects: ["leave", "stay", "thanks_end", "no_sorry"], hints: ["stay"],
        suggest: [{ lt: "Stay a little, or say no politely", hint: "stay" }],
        yes: (cc) => H.stay(cc, {}, seg0("stay")),
        no: go,
        on: { leave: go, thanks_end: go, thanks_invite: go, g_bye: go, good_night: go, no_sorry: go,
          // "Está bien, gracias" / "Bueno, gracias" could be "okay, I'll stay" or "no, thanks": the question again (rule 17)
          g_thanks: (cc) => { if (/^\W*(esta bien|bueno|ok|okay|vale|va|sale)\W+gracias\W*$/.test(heard(cc)) && !cc.s.stayReasked) return false; go(cc); }, stay: (cc, sl, sg) => H.stay(cc, sl, sg), agree: (cc, sl, sg) => H.stay(cc, sl, sg) },
        ask: (cc) => { if (cc.s.stayReasked) { letGo(cc); return; } cc.s.stayReasked = true; nora(cc, "stay_reask"); },
      }));
      return;
    }
    letGo(c);
  },
  stay(c) {
    hi(c);
    if (c.s.leaving || !c.s.stayAsked || c.s.stayed) return;
    c.s.stayed = true;
    nora(c, "yay_stay");
  },
  thanks_end(c) {
    hi(c);
    c.s.thanked = true;
    // "Todo estuvo delicioso" praises the food too
    if (/estuvo|estaba|delicios|riquisim/.test(heard(c))) c.s.foodPraised = true;
    if (c.s.leaving) { goodbyeThanks(c); return; }
    // "La pasé muy bien. Ya me tengo que ir": the goodbye that follows answers both
    if (/me voy|me tengo que ir|irme|es tarde|temprano/.test(heard(c))) { checkGoal(c); return; }
    if (once(c, "thx")) dan(c, c.s.dinnerSaid ? "thanks_dinner" : "our_pleasure");
    checkGoal(c);
  },
  thanks_back_ctx(c) { H.thanks_end(c, {}, seg0("thanks_end")); },
  // "Les aviso cuando llegue": Natalia is glad
  will_text(c) {
    hi(c);
    c.s.willText = true;
    if (c.s.leaving) { goodbyeThanks(c); return; }
    if (once(c, "text")) nora(c, "yes_please");
  },
  // "¡Buenas noches!" is a hello at the door and a goodbye after dinner
  good_night(c) {
    hi(c);
    if (!c.s.dinnerSaid) return;
    if (!c.s.leaving) { H.leave(c, {}, seg0("leave")); return; }
    goodbyeThanks(c);
  },
  g_thanks(c) {
    hi(c);
    // "Gracias por todo" is thanks for the evening; a plain "Gracias" for a drink or the salt needs no reply
    if (THANKS_EVENING.test(heard(c))) { H.thanks_end(c, {}, seg0("thanks_end")); return; }
    if (c.s.leaving) { c.s.thanked = true; goodbyeThanks(c); }
  },
  // "Bueno…" to "¿Te gusta?" is a hesitation, not praise: the question stays open
  g_ok(c) { hi(c); if (c.step === "howisit") return; stepYes(c); },
  agree(c) { hi(c); stepYes(c); },
  no_sorry(c) { hi(c); stepNo(c); },
  g_bye(c) {
    hi(c);
    if (LIKEWISE.test(heard(c))) { if (c.s.leaving) goodbyeThanks(c); return; } // "Igualmente" at the table
    if (!c.s.leaving) { H.leave(c, {}, seg0("leave")); return; }
    goodbyeThanks(c);
  },
};

/** The hosts accept that the guest is leaving. */
function letGo(c: Ctx) {
  c.s.leaving = true;
  dan(c, "thanks_for_coming");
  // Mexican hosts pack food for the road, every time (as the closing picture shows; the lead's decision, 5 Nov 2026):
  // cochinita, or flan for a guest who eats no meat
  nora(c, c.s.diet === "veg" ? "for_the_road_flan" : "for_the_road");
  checkGoal(c);
  c.expect({
    id: "closing", expects: ["thanks_end", "thanks_invite", "will_text", "good_night", "thanks_back_ctx"], hints: ["goodbye"],
    suggest: [{ lt: "Say thanks and good night", hint: "goodbye" }],
    on: Object.fromEntries([...Object.keys(dinner.intents).filter((k) => !k.endsWith("_ctx")), "thanks_back_ctx", "g_bye", "g_thanks", "g_ok", "g_hello"].map((k) => [k, (cc: Ctx) => {
      if (/^(thanks_end|thanks_invite|g_thanks|thanks_back_ctx)$/.test(k) || /gracias/.test(heard(cc))) cc.s.thanked = true;
      if (k === "will_text") cc.s.willText = true;
      goodbyeThanks(cc);
    }])),
    yes: (cc) => goodbyeThanks(cc), no: (cc) => goodbyeThanks(cc),
  });
}

/** "No me gusta mucho", "Más o menos", a "No" to "¿Te gusta?": sorry and the rice and beans, once; that answers
 *  "¿Te gusta?" (it isn't asked again) and no seconds are pressed on the guest; at "¿Quieres más?" it is a no, at the
 *  flan a no to the flan; said again: Diego's "Si se te antoja algo, me dices". */
function badFood(c: Ctx) {
  if (c.step === "dessert" && c.s.dessert === undefined) { c.s.dessert = "no"; nora(c, "more_for_dan"); return; }
  if (c.step === "seconds" && c.s.seconds === undefined) c.s.seconds = "no";
  if (!c.s.secondsAsked) c.s.askSeconds = false;
  if (c.s.badSaid) { dan(c, "just_say"); return; }
  c.s.badSaid = true;
  nora(c, "sorry_bad");
}

/** "¿Qué tal la cochinita?" or "¿Y? ¿Te gusta?"; a guest who eats no meat has the rajas tacos: only the second. */
function howIsIt(c: Ctx) {
  if (c.s.diet === "veg") (c as ConvCtx).conv.pushLine("how_is_it", 1, {});
  else c.say("how_is_it");
}

/** "Deja lugar para el postre": the flan, once promised, is offered. */
function saveRoom(c: Ctx) {
  nora(c, "save_room");
  flanSaid(c);
}

/** The flan was mentioned (by Diego, Natalia or "deja lugar para el postre"): it comes before the evening ends. */
function flanSaid(c: Ctx) { if (!c.s.lateSaid) c.s.askDessert = true; }

/** Last lines at the door. */
function goodbyeThanks(c: Ctx) {
  if (c.s.byeSaid) return;
  c.s.byeSaid = true;
  checkGoal(c);
  if (c.s.thanked) dan(c, "anytime_come_again");
  nora(c, c.s.willText ? "get_home_will" : "get_home_safe");
  c.end();
}

// ---------------------------------------------------------------------------

export const dinner: SituationDef = {
  id: "s85-dinner",
  song: 85,
  songTitle: "Thanks for Having Me",
  title: { en: "Gracias por invitarme", lt: "Thanks for Having Me" },
  topic: { en: "Una cena en casa de amigos", lt: "Being a dinner guest" },
  chapter: 5,
  order: 4,
  location: "dans-house",
  npc: "dan",
  npcs: ["nora"],
  goal: "Be a good dinner guest: thank your friends, praise the food and say goodbye politely.",
  intro: "Your friends Diego and Natalia have invited you to dinner. It's eight o'clock and you're at their door with a little gift. Friends say tú to each other; when you talk to both of them, use ustedes.",
  entities: { gift: GIFTS, drink: DRINKS, pass: PASS },

  grammar: {
    macros: {
      gift_np: "[(un | una | unos | unas | unas cuantas | una botella de | una botellita de | un poquito de | una caja de | un ramo de | una cajita de | un poco de | este | esta | estos | estas)] {gift}",
      drink_np: "[(un | una | otro | otra | un vaso de | una copa de | otra copa de | otro vaso de | un poco de | una botella de | un vasito de | una copita de | una lata de | mas)] {drink} [(bien fria | bien frio | fria | frio | helada | con hielo | sin hielo)]",
      pass_np: "[(el | la | los | las | un poco de | mas | otra | otro | otras | unas | un poquito de)] {pass}",
      great: "(rico | rica | riquisimo | riquisima | delicioso | deliciosa | deliciosisimo | buenisimo | buenisima | sabroso | sabrosa | sabrosisimo | exquisito | exquisita | increible | espectacular | perfecto | perfecta | de lujo | muy rico | muy rica | muy bueno | muy buena | super rico | super rica | bien rico | bien rica | muy sabroso | muy sabrosa)",
      food: "(la cochinita | la cochinita pibil | la comida | todo | esto | la cena | el flan | el arroz | la salsa | los frijoles | las tortillas | el postre | los tacos | la carne)",
      casa: "(casa | depa | departamento | cocina | sala | jardin | terraza | patio | comedor)",
      pretty: "(bonita | bonito | linda | lindo | hermosa | hermoso | preciosa | precioso | acogedora | acogedor | padre | padrisima | padrisimo | bella | bello | grande | comoda | comodo)",
      full: "(lleno | llena | satisfecho | satisfecha | muy lleno | muy llena | super lleno | super llena | llenisimo | llenisima)",
      little: "(una probadita | nada mas una probadita | un poquito | un poquitito | poquito | un poco | tantito | un pedacito | un trocito | un trozo pequeno | un pedazo chiquito | un pedazo pequeno | poquitito | un taquito | un poquito mas | un poco mas | otro poquito | otro taquito | otro taco | uno mas | un taquito mas)",
      go: "(ya me voy | me voy | me tengo que ir | ya me tengo que ir | tengo que irme | ya tengo que irme | ya me voy yendo | me voy yendo)",
      why: "[porque | es que | pero | y] (manana (trabajo | tengo que trabajar | me levanto | entro | tengo trabajo) [muy] [temprano] | (ya)? es (tarde | muy tarde | bien tarde) | se me hizo tarde | (mi taxi | mi uber) ya (llegó | llego) | ya (llegó | llego) mi (taxi | uber) | tengo que (levantarme | despertarme | trabajar) temprano [manana])",
      sweet_thing: "(lo dulce | el dulce | dulce | dulces | el postre | postre | postres | el flan | flan | azucar | el azucar | nada dulce)",
    },
  },

  intents: {
    voc: { patterns: ["(diego | natalia | diego y natalia | natalia y diego | chicos | amigos | hola a todos | hola chicos | michi)"] },
    greet_back: { patterns: [
      "(que | me da mucho | me da | mucho) gusto (verlos | verte | verlas | veros) #h:gr_glad", "(que)? (bueno | padre | bonito | lindo) (verlos | verte | verlas)",
      "(mucho gusto | encantado | encantada | un placer) [de conocerte | conocerte] [natalia | diego]", "(que alegria | que ilusion) (veros | verte | verlos | verlas)", "(igualmente | igual) (que gusto | mucho gusto)",
    ] },
    time_flies: { patterns: [
      "(ay | uy)? que tarde (es | se hizo | se nos hizo)",
      "(ya)? es (tan | tan tan) tarde", "(ya)? son las (diez | once | doce)",
      "(que | como) rapido (se pasa | se paso | se pasó | pasa | paso | pasó | se va | se fue) el tiempo", "(mira | miren) la hora", "(ay | uy | uf)? (mira | miren) que hora es",
      "(como | que rapido) vuela el tiempo", "el tiempo vuela", "(se nos | se me) (paso | pasó | fue) el tiempo",
    ] },
    thanks_invite: { patterns: [
      "[muchas | mil | muchisimas] gracias por (invitarme | la invitacion | invitarnos | recibirme | recibirnos | tenerme aqui) #h:gr_thanks",
      "[muchas | mil | muchisimas] gracias por (invitarme | la invitacion) (a cenar | a su casa | a tu casa | hoy | esta noche)",
      "[muchas | mil] gracias por (abrirme | abrirnos) (las puertas de)? (su | tu) casa", "(que | me da mucho) gusto estar aqui", "(estoy | estoy muy) (contento | contenta | feliz) de estar aqui",
      "gracias por (el | la)? (invitarme | invitación | invitacion) [diego | natalia]",
    ] },
    gift: { patterns: [
      "(les | te | os)? (traje | he traido | trajimos | traigo) @gift_np [de regalo] [para (ustedes | ti | vosotros | la cena | el postre | el cafecito)] #h:gf_brought",
      "(esto | este | esta | estos | estas) (es | son) para (ustedes | ti | vosotros | los dos) #h:gf_for_you",
      "(les | te)? (traje | traigo) (esto | algo | un detalle | un detallito | un regalito | un regalo) [para (ustedes | ti)]",
      "no (traje | les traje) {no:gift} (pero | sino) [les]? (traje | traigo) @gift_np", "pero (les | te)? (traje | traigo) @gift_np",
      "(es | son)? (un | una)? (detalle | detallito | regalito | regalo | cosita) para (ustedes | ti) #h:gf_short", "(es | aqui tienen | aqui tienes) un (detallito | detalle | regalito) [para (ustedes | ti)] #h:gf_short",
      "@gift_np para (ustedes | ti | vosotros) [@gift_np]", "(tomen | toma | ten | tengan) (esto | estas | este) (es | son) para (ustedes | ti)", "(tomen | toma | ten | tengan) [esto] [es] (un | una)? (detalle | detallito | regalito)",
      "(les | te)? (hice | compre | compré | prepare | preparé | horneé | hornee) @gift_np [para (ustedes | ti | el postre)]",
      "(espero | ojala) que (les | te) (guste | gusten)", "(aqui | aca) (les | te) (dejo | traigo) @gift_np",
    ] },
    no_gift: { patterns: [
      "[perdon | lo siento | ay] no (traje | les traje | te traje | traigo) nada", "[perdon | ay] (se me olvidó | se me olvido | olvidé | olvide) (traer algo | el vino | el postre | las flores | el regalo | traerles algo)",
      "(vine | llegué | llegue) con las manos vacias", "[perdon | perdonad | lo siento | ay] no (he traido | os he traido | te he traido) nada", "no (sabia | supe) que traer [perdon]",
    ] },
    drink_ans: { patterns: [
      "@drink_np #h:dr_please", "(solo | nada mas | nomas | solamente) @drink_np [por ahora] #h:dr_just",
      "(quiero | quisiera | voy a querer | me das | me da | me puedes dar | me pones | ponme | dame | tomo | voy a tomar | me tomo | prefiero | me gustaria | se me antoja | me sirves | me puedes servir | sirveme) @drink_np #h:dr_want",
      "@drink_np (esta bien | estaria bien | estaria muy bien | suena bien | perfecto | esta perfecto | estaria perfecto) #h:dr_would_be",
      "(tienes | tienen | hay | teneis) @drink_np", "(un | una)? @drink_np si (hay | tienen | tienes)",
      "(voy manejando | estoy manejando | tengo que manejar | vengo manejando | no tomo alcohol | no tomo | no bebo alcohol) [asi que | entonces | mejor | pero] [solo | nomas] @drink_np",
      "lo que (sea | tengas | tengan | haya) [esta bien]", "lo (mismo )?que (tu | ustedes) (tomes | tomen | vayas a tomar | vayan a tomar | estes tomando | esten tomando | tomas | toman)", "lo mismo que (tu | ustedes)",
      "no [quiero] {no:drink} (mejor | sino | prefiero) @drink_np", "[un | una] {no:drink} no [mejor | sino] @drink_np", "@drink_np pero (sin hielo | con hielo | bien fria | bien frio | sin gas)", "(mejor | mas bien) @drink_np",
    ] },
    late_sorry: { patterns: [
      "(perdon | perdona | perdonen | disculpa | disculpen | lo siento) (por llegar tarde | por la tardanza | la tardanza | por el retraso | el retraso | la demora | por hacerlos esperar)",
      "(perdon | lo siento) (llegué | llegue) [un poco] tarde", "(siento | sentimos) llegar tarde", "(perdon | perdonen) (se me hizo tarde | habia mucho trafico | habia trafico)", "se me hizo (un poco)? tarde [perdon | lo siento | perdonen]",
      "(perdon | perdona | perdonen | disculpa | disculpen | lo siento) por llegar tarde [es que]? (habia (mucho)? trafico | se me hizo tarde | no encontraba la casa)",
      "(perdon | perdona | perdonen | disculpa | disculpen) (la tardanza | el retraso | la demora) [es que]? habia (mucho)? trafico",
      // arriving early is the faux pas in Mexico: "¿Llegué muy temprano?"
      "(llegué | llegue) (muy | demasiado)? temprano", "(soy | fui) (el primero | la primera)",
    ] },
    no_drink: { patterns: [
      "(estoy | ando) bien (por ahora | asi | ahorita | por el momento) [gracias] #h:dr_nothing", "(nada | nada por ahora | por ahora nada | ahorita nada | nada todavia) [gracias]",
      "(ahorita | ahora | por ahora | todavia) no [gracias]", "(mas tarde | al rato | luego | despues) [tal vez] [gracias]", "[no] no quiero nada [por ahora | ahorita] [gracias]", "[no] no tengo sed [todavia]",
    ] },
    ask_drinks: { patterns: [
      "que (tienes | tienen | hay | me ofreces | ofreces | me recomiendas) [de tomar | para tomar]", "que (opciones | bebidas) (hay | tienen | tienes)", "que (cerveza | cervezas | vino | vinos | refresco | refrescos | jugo) (tienes | tienen | hay)",
      "(hay | tienen | tienes) algo sin alcohol #noalc", "algo sin alcohol #noalc", "(nada de | sin) alcohol [para mi] #noalc", "[no] no (tomo | bebo) (alcohol | nada de alcohol | bebidas alcoholicas) #noalc", "[no] no puedo tomar alcohol #noalc",
    ] },
    drink_neg: { patterns: ["no (quiero | tomo | bebo | me gusta | me gustan) {drink} [gracias]", "(nada de | sin) {drink} [gracias]", "{drink} no [gracias]"] },
    offer_help: { patterns: [
      "(te | les | os)? ayudo [en algo | con algo | con la mesa | con los platos | con los trastes | en la cocina] #h:hp_can_i",
      "(puedo | podria) (ayudar | ayudarte | ayudarles | ayudarlos | ayudaros) [en algo | con algo | con la mesa | con la cena | en la cocina]",
      "(necesitas | necesitan | necesitais | quieres | quieren) (ayuda | que (te | les) ayude) [en la cocina | con algo | con la cena]",
      "(que | en que) (puedo | te puedo | les puedo) (hacer | ayudar | ayudarte | ayudarles) #h:hp_what", "hay algo que (pueda | puedo) hacer", "en que (te | les) ayudo",
      "(pongo | quieres que ponga | quieren que ponga | pongo yo | te ayudo a poner | les ayudo a poner) la mesa #h:hp_table",
      "(dejame | dejenme | dejadme) (ayudar | ayudarte | ayudarles)", "(lavo | quieres que lave | yo lavo | te ayudo a lavar | les ayudo a lavar) (los platos | los trastes)",
      "(llevo | quieres que lleve) (algo | los platos | las tortillas) a la mesa", "(te | les)? (echo | puedo echar | podria echar) (la | una) mano", "(puedo | podria) hacer algo [para ayudar]",
      // after dinner: "¿Les ayudo a recoger la mesa?"
      "(te | les | os)? ayudo a (recoger | levantar | limpiar | lavar | fregar) [(la mesa | los platos | los trastes)]", "(recojo | levanto | quito) (la mesa | los platos | los trastes)",
      "(quieres | quieren) que (recoja | levante | quite | lave) (la mesa | los platos | los trastes)",
    ] },
    praise_smell: { patterns: [
      "(que)? (rico | bien | delicioso | sabroso | riquisimo) huele [aqui] #h:cm_smells", "huele (muy | super | bien)? (rico | delicioso | bien | riquisimo | increible | sabroso) [aqui]",
      "(algo | todo | la comida | eso | esto | la cocina) huele (muy | super | bien)? (rico | delicioso | bien | riquisimo | increible)",
      "que (estas | estan | estais) (cocinando | haciendo | preparando) #what", "que (hiciste | hicieron | hay | preparaste | prepararon) de (cenar | comer) #what", "que vamos a (cenar | comer) #what",
      "que (rico | buen) olor", "(que es | que sera) lo que huele (tan)? rico #what", "que es (esto | eso) #what",
    ] },
    praise_home: { patterns: [
      "que @pretty (es | esta)? (su | tu) @casa #h:cm_home", "que @casa (tan | mas) @pretty", "que @pretty @casa",
      "(tienen | tienes | teneis) (una)? @casa (muy | super | bien)? @pretty", "(su | tu | la) @casa (esta | es) (muy | super | bien)? @pretty",
      "me (encanta | gusta | encantan | gustan) (su | tu | la)? (@casa | decoracion | vista)",
      "me (encantan | gustan) (los | sus | tus)? (cuadros | pinturas) #pictures", "que (bonitos | lindos | padres) (cuadros | pinturas) #pictures", "(los | sus | tus) (cuadros | pinturas) (son | estan) (muy | super)? (bonitos | lindos | preciosos | padres | increibles) #pictures",
      "que (bonita | linda | padre | hermosa) vista", "(tienen | tienes) (una)? vista (muy)? (bonita | linda | padre | hermosa | increible | preciosa | espectacular)", "que @casa (tan | mas) @pretty (tienen | tienes)", "que @pretty @casa (tienen | tienes)",
      // what the room shows (the hammock, the plants in clay pots, the family altar)
      "que (bonita | linda | padre | hermosa | comoda) (hamaca | ventana)", "me (encanta | gusta) (la | su | tu) (hamaca | ventana)",
      "que (bonitas | lindas | padres | hermosas) (plantas | macetas)", "me (encantan | gustan) (las | sus | tus)? (plantas | macetas)",
      "que (bonito | lindo | padre | hermoso) altar", "me (encanta | gusta) (el | su | tu) altar",
    ] },
    praise_food: { patterns: [
      "[pero | eso si] [@food] (esta | estan | es) [muy | super | bien]? @great [@food] #h:cm_delicious",
      "(que | pero que) (rico | rica | delicioso | deliciosa | sabroso | sabrosa) [esta | estan] [@food] #h:cm_que_rico", "que (bueno | buena) (esta | estan) @food", "[mmm] @great",
      "(me encanta | me gusta | me gusta mucho | me encantó | me encanto) [@food]",
      "(cocinas | cocinan | guisas | cocinais) (muy | super | bien)? (bien | rico | delicioso) #h:cm_cook", "(eres | son) (un | una | unos)? (gran | buen | buena | excelente | muy buen | muy buena) (cocinero | cocinera | cocineros | chef)",
      "que (rico | rica | delicioso | deliciosa | bien) se (ve | ven) [@food]", "(se ve | se ven | huele | sabe) (muy | super | bien)? (rico | rica | delicioso | deliciosa | riquisimo | riquisima | buenisimo | buenisima | bien) [@food]",
      "nunca (he comido | habia comido | comí | comi | he probado) (algo | nada) tan (rico | bueno | delicioso | sabroso)", "es la mejor cochinita (que he comido | que he probado | de mi vida)",
      "(esta | es) (de)? (para chuparse los dedos | chuparse los dedos)", "no pica [nada | mucho | tanto] [esta (perfecta | perfecto | rica | rico)]", "no (esta | es) [nada | para nada] (picante | picosa | picoso | salada | salado | fuerte) [nada | para nada] [(y | pero)] [(esta | es) [muy | super | bien] @great]",
      // "Bueno" alone is a filler, never praise: "buena / bueno" needs the dish named
      "(esta | es) (normal | aceptable) #tip:weak_praise", "@food (esta | es) (buena | bueno | bien) #tip:weak_praise", "(no esta | nada | no esta nada | no esta tan) mal #tip:weak_praise",
    ] },
    food_meh: { patterns: [
      "(esta | es) [un poco | un poquito | algo | muy | bien | demasiado] (picante | picosa | picoso | salada | salado | fuerte)", "pica [un poco | un poquito | mucho | bastante | demasiado]",
      "(esta | es) (rica | rico | deliciosa | delicioso | buena | sabrosa) pero (pica | esta) [un poco | mucho | muy | demasiado] [picante | picosa | salada]", "me (enchilé | enchile)", "(uf | uy | ay)? (pica | pica mucho)", "(mas o menos | regular) #bad",
      // "¿Esto pica?", "¿Pica mucho la salsa?": a question (answered, not apologized for)
      "(esto | eso | la salsa | la cochinita | la comida) pica [mucho]", "pica [mucho | poco] (la salsa | la cochinita | esto | eso)", "(es | esta) (picante | picosa | picoso) (la salsa | la cochinita | esto)?",
      "no (aguanto | soporto) (el picante | lo picante | el chile | el habanero)", "(esta | es) (un poco | muy | demasiado) (salada | salado)",
      // "No está rica", "No me gusta mucho": never praise
      "no (esta | es | estaba) [muy | tan | nada] (rico | rica | bueno | buena | sabroso | sabrosa | delicioso | deliciosa) #bad", "no me (gusta | gustó | gusto | encanta) [mucho | tanto | nada] [@food] #bad",
      "[no] no me gusta [mucho] (el picante | lo picante | el chile | la comida picante) #nospicy", "[no] no como (picante | chile | cosas picantes) #nospicy",
    ] },
    made_yourself: { patterns: [
      "(tu | ustedes) (lo | la)? (hiciste | hicieron | cocinaste | cocinaron | preparaste | prepararon) [todo | la cochinita | la comida | esto] #h:cm_made",
      "(tu | ustedes) (hiciste | hicieron | preparaste | prepararon) (el flan | el postre) #flan", "(el flan | el postre) (lo hiciste | lo hicieron) (tu | ustedes)? #flan", "(es | este flan es) casero #flan",
      "(lo | la) (hiciste | cocinaste | preparaste | hicieron | cocinaron) (tu | ustedes)", "(tu | ustedes) (cocinaste | cocinaron)", "(es | esta es) (casera | hecha en casa)", "(es | esto es) (casero | hecho en casa)",
      // "¿Quién cocinó?" is answered "¡Yo!", never "¡Sí, yo!"
      "quien (cocinó | cocino | hizo | preparó | preparo) [(la cochinita | la comida | esto | todo | la cena)] #who", "quien (hizo | preparó | preparo) (el flan | el postre) #flan #who",
      // Spain's present perfect
      "quien ha (cocinado | hecho | preparado) [(la cochinita | la comida | esto | todo | la cena)] #who", "(lo | la) (has | habeis) (hecho | cocinado | preparado) (tu | vosotros | vosotras)", "(tu | vosotros) (lo | la)? (has | habeis) (hecho | cocinado | preparado) [todo | la cochinita | la comida | esto]",
    ] },
    recipe: { patterns: [
      "(me das | me pasas | me compartes | me puedes dar | me podrias dar | me mandas | me regalas | me escribes) la receta #h:cm_recipe", "(puedo tener | quiero | me encantaria tener) la receta",
      // what is in it: Diego says (the salsa: its own answer)
      "que (lleva | tiene | le pusiste | le pusieron | le echaste) [la cochinita | la salsa | esto] #what", "como (la | lo)? (preparas | haces | preparan | hacen | hiciste | preparaste) #what", "cual es (el secreto | la receta) #what",
      "que es (la)? cochinita [pibil] #what", "(de que es | de que esta hecha | con que se hace) (la cochinita | la salsa | esto) #what",
      "tienes que (darme | pasarme | mandarme) la receta",
    ] },
    pass: { patterns: [
      "(me pasas | me pasan | me das | me da | me sirves | me sirven | me puedes pasar | me podrias pasar | me pueden pasar | podrias pasarme | puedes pasarme | me acercas | me alcanzas | me pasarias | me pasais) @pass_np #h:ps_pasas",
      "(me podrias | podrias) pasar @pass_np #h:ps_podrias", "(pasame | pasenme | pasadme | dame | acercame | alcanzame) @pass_np",
      "(hay | tienes | tienen) @pass_np", "(donde esta | donde estan) @pass_np", "(quiero | quisiera | me gustaria) @pass_np",
    ] },
    here_you_go: { patterns: [
      "[claro] (aqui tienes | aqui tienen | aqui esta | aqui estan | ahi esta | ahi estan | aqui va | ahi va | ahi te va | aqui te las paso | ahi te van) #h:ps_here",
      "(toma | ten) #h:ps_toma", "(claro | si) (toma | ten)",
    ] },
    // "Listo", "Ya está": only where Natalia asked for help (ya está ≈ ya es: "¿Ya es tan tarde?")
    done_ctx: { patterns: ["(listo | ya esta | ya quedó | ya quedo | ya la puse | ya lo puse | ya las puse | hecho) [ya esta]"] },
    cheers: { patterns: ["salud", "(a tu | a su | a la) salud", "salud por (ustedes | los amigos | nosotros | la cena | los anfitriones)", "brindo por (ustedes | los amigos | la cena)"] },
    restroom: { patterns: ["(donde | por donde) (esta | estan | queda) (el aseo | el servicio | los servicios)", "(puedo | podria) (usar | pasar a | pasar al) (el aseo | aseo | los servicios)", "(donde | por donde) (esta | queda) el (bano | bañito | banito)", "(puedo | podria) (usar | pasar a | pasar al) [el] bano", "me (prestas | prestan) el bano", "(donde | cual) es el bano"] },
    provecho: { patterns: ["que aproveche [a todos]", "(buen | muy buen)? provecho [a todos]", "[gracias] igualmente [buen provecho]", "(gracias)? (ustedes | tu) tambien"] },
    more_yes: { patterns: [
      "[si] [(solo | nomas | nada mas)] @little [de (flan | cochinita | arroz | postre | eso | frijoles)] [nada mas | nomas | por favor] #little #h:mo_little", "[si] [un poco] mas [por favor]",
      "[si] (me encantaria | con gusto | claro que si) [gracias] #h:mo_love",
      "[bueno | va | sale | ok | esta bien | venga | vale] @little #little",
      // a bare "No estoy lleno" is heard as "No, estoy lleno" (rule 10): the yes needs todavía / aún / tan
      "(todavia | aun) no estoy @full", "no estoy @full (todavia | aun)", "no estoy tan @full",
      "yo [quiero] [uno | postre]", "yo si [quiero]", "(me encanta | me encantan) (el flan | el postre | lo dulce | los postres)",
      "(para el postre siempre hay | siempre hay) (lugar | espacio) [para el postre]", "si (flan | el flan) [por favor]", "(flan | el flan) si", "como (decir | les digo | te digo) que no",
      "[si] (un pedacito | un pedazo) (chiquito | pequeno)? [por favor] #little #h:mo_small",
      // the guest asks for more at the table, offered or not ("¿Me sirves más cochinita?"; rice and beans are `pass`)
      "[si] (me sirves | me das | me puedes servir | me podrias servir | me pones | sirveme | dame | ponme) (mas | un poco mas | otro poquito | otro poco | un poquito mas) [de] [(cochinita | esto | eso)] [por favor] #ask",
      "(quiero | quisiera | me gustaria) (mas | otro poco | un poco mas | otro poquito) [de] [(cochinita | esto | eso)] #ask", "(hay | queda) (mas | otro poquito de) cochinita #ask",
    ] },
    more_no: { patterns: [
      "[no] [gracias] (estoy | ya estoy | quedé | quede) @full [gracias] #h:mo_full", "[no] [gracias] (estoy | ya estoy) bien [gracias]",
      "[no] ya no (puedo | puedo mas | puedo comer mas | quepo) [gracias] #h:mo_cant", "estoy que reviento", "ya no me cabe (nada | nada mas | ni un taco | otro taco)",
      "[no] [gracias] ya (comí | comi | cené | cene) (mucho | bastante | demasiado) [gracias]", "[no] no (quiero | puedo) (mas | nada mas | comer mas) [gracias]",
      "[no] (nada mas | no mas | ya no) para mi [gracias]", "ya no [gracias]",
      "no [gracias] (estuvo | estaba) @great [pero estoy @full]", "(estuvo | estaba) @great pero (estoy | ya estoy) @full",
      "(mas tarde | luego | al rato) [tal vez | quizas | quiza]", "(tal vez | quizas | quiza | a lo mejor) (mas tarde | luego | al rato)",
      "[no] no (como | me gusta | me gustan | me gusta mucho) @sweet_thing", "[no] (estoy | ando) a dieta", "ya no [gracias] (estoy | ando) a dieta", "[no] (ya)? no tengo (hambre | espacio | lugar)",
      "(ahorita | ahora) no [gracias]", "[no] (me encantaria | quisiera) pero (estoy | ya estoy) @full", "[no] (me encantaria | quisiera) pero ya no (puedo | quepo) [mas]",
      "[no] (postre | el postre | flan | el flan) no [gracias] [(estoy | ya estoy) @full] [gracias]", "[no] no (quiero | voy a querer) [mas] (postre | flan | el flan | nada de postre | cochinita | tacos | comida | arroz)",
    ] },
    reassure: { patterns: [
      "no te preocupes [por eso] [(esta | sigue) (rico | rica | delicioso | bien | bueno)] #h:tw_dont_worry", "[no pasa nada] (asi | igual) (esta | sabe | queda) (bien | rico | rica | bueno)",
      "(esta | sabe) (rico | rica | bien | bueno) (igual | asi)", "(tranquila | tranquilo) [no pasa nada]", "no (pasa | importa) nada #h:tw_no_pasa", "no importa [hay mucha comida]",
      "(no hay | sin) problema", "(todavia | aun | igual) (esta | sabe) (rico | rica | delicioso | deliciosa | bueno | buena | riquisimo)", "asi me gusta", "me gusta [el arroz] (asi | dorado | doradito | crujiente | tostadito)",
      "(hay | tenemos) (mucha | suficiente | bastante) comida", "le pasa a (todos | cualquiera)", "a todos nos pasa", "(nadie | no) se (nota | va a notar) [nada]",
    ] },
    diet_ok_ctx: { patterns: [
      "[no] (como | comemos) (de todo | todo) #h:dt_all", "[no] (nada | ninguna | ninguno) [gracias]", "[no] no (tengo | tenemos) (alergias | ninguna alergia | restricciones)",
      "[no] no soy (delicado | delicada | especial | quisquilloso | quisquillosa | mañoso | mañosa | manoso | manosa)", "[no] (puedo comer | me como) (lo que sea | de todo | todo)", "(todo | lo que sea) esta bien",
      "[no] no soy (vegetariano | vegetariana | vegano | vegana)", "[no] no soy (alergico | alergica) a nada",
    ] },
    diet_veg_ctx: { patterns: [
      "(soy | somos) (vegetariano | vegetariana | vegano | vegana) #h:dt_veg", "[no] no (como | comemos) (carne | puerco | cerdo | res | pollo | pescado | mariscos | carne roja) [pero (todo lo demas | lo demas | lo otro) (si | esta bien)]",
      "nada de (carne | puerco | cerdo) para mi", "(como | me como) (todo | de todo) (menos | excepto | pero no) (carne | puerco | cerdo | res | pollo | pescado | mariscos)",
    ] },
    diet_allergy_ctx: { patterns: [
      "(soy | estoy) (alergico | alergica) (a | al | a la | a los | a las)? (nueces | nuez | cacahuate | cacahuates | mani | gluten | lacteos | leche | mariscos | camaron | camarones | huevo | pescado | chile) #h:dt_allergic",
      "tengo alergia (a | al | a la | a los | a las)? (nueces | cacahuate | cacahuates | mani | gluten | lacteos | mariscos | camarones | huevo | pescado)",
      "no (puedo comer | como) (gluten | lacteos | leche | nueces | cacahuate | huevo)", "soy intolerante a la lactosa", "soy (celiaco | celiaca)",
    ] },
    cat_ok_ctx: { patterns: [
      // "No, me encantan los gatos": the typed comma keeps the "No" apart; "No me gustan los gatos" is cat_dislike_ctx
      "me (encantan | gustan) los gatos #h:ct_love", "me (encantan | gustan) [mucho] los (gatos | animales)", "[no] (para nada | nada) #h:ct_not_at_all", "[no] no (soy | estoy) (alergico | alergica) [a los gatos]",
      "[no] que (bonita | linda | preciosa | chula | hermosa | bonito | lindo)", "(hola | ay) michi", "[no] (yo)? tengo (un gato | gatos | dos gatos | una gata) [en casa]", "[no] (no hay problema | no pasa nada)",
    ] },
    cat_dislike_ctx: { patterns: ["no me (gustan | encantan) [mucho | tanto] los gatos", "no me (llevo | llevo bien) con los gatos", "(les tengo miedo | me dan miedo) los gatos"] },
    cat_allergic_ctx: { patterns: [
      "[si] (soy | estoy) [un poco | un poquito | muy | algo] (alergico | alergica) [a los gatos] [la verdad] #h:ct_allergic", "[si] (un poco | un poquito) [la verdad]",
      "[si] (la verdad | desafortunadamente | por desgracia) [si]", "[si] tengo alergia a los gatos",
    ] },
    leave: { patterns: [
      "[bueno] ya me voy [que es tarde | porque ya es tarde | ya es tarde | que ya es tarde] #h:lv_late", "[bueno] @go @why", "no (quiero | me quiero) (irme | ir) pero @why", "pero @why", "[bueno | creo que] (ya)? (me tengo que ir | tengo que irme | me voy a ir) #h:lv_should",
      "[bueno] ya me voy yendo #h:lv_yendo", "(ya)? (es | se hizo | se me hizo) (tarde | muy tarde | bien tarde | super tarde)",
      "(ya)? es hora de (irme | irnos | que me vaya)", "manana (trabajo | tengo que trabajar | me levanto | entro | tengo trabajo) [muy] temprano #h:lv_work_tmrw",
      "(tengo que | me tengo que) (levantar | levantarme | despertar | trabajar) temprano [manana]", "(me pides | puedo pedir | me pueden pedir | voy a pedir | me llamas | me puedes pedir) un (taxi | uber)",
      "ya (llegó | llego) mi (taxi | uber)", "(bueno | con permiso)? ya me retiro", "de verdad (me tengo que ir | tengo que irme | ya me voy) #h:lv_really",
    ] },
    stay: { patterns: [
      "[bueno | va | ok | sale | orale | esta bien | vale | venga] [solo | nomas]? (un ratito | un rato | un ratito mas | un rato mas | cinco minutos mas | otro cafecito | un cafecito mas | un cafe mas | otro rato | otro ratito) #h:st_ok",
      "[bueno | va | ok | esta bien | vale] me quedo [un (rato | ratito) (mas)?]", "(por que no | como no)", "[bueno] (me voy a quedar | me quedo) (un rato | un ratito | otro rato | otro ratito) [mas]",
      "[bueno | va | ok] (cinco | diez) minutos [mas]",
    ] },
    thanks_end: { patterns: [
      "[muchas | mil] gracias por (la cena | esta cena | la comida | todo lo de hoy | esta noche) [estuvo @great] #h:gb_dinner", "[muchas | mil] gracias por todo #h:gb_everything",
      "[muchas | mil] gracias por (una noche | una cena | una velada) (maravillosa | increible | muy bonita | padrisima | deliciosa | muy agradable | tan bonita)",
      "la (pasé | pase) (muy bien | super bien | increible | padrisimo | de maravilla | genial) [hoy] #h:gb_great", "(me lo he pasado | lo he pasado | me lo pase) (muy bien | super bien | genial | de maravilla | fenomenal) [hoy | esta noche]",
      "(todo | la cena | la comida) (estuvo | estaba) @great", "(fue | que) (una noche | una cena | una velada) (maravillosa | increible | muy bonita | padrisima | deliciosa)",
      "me encantaria pero (manana trabajo | tengo que trabajar manana | me tengo que levantar temprano | tengo que irme | no puedo | ya es tarde) #h:lv_work",
      "la proxima (en mi casa | vienen a mi casa | los invito yo | yo invito)",
      // the food to take home, every visit (the follow-up pass, 5 Nov 2026): "¡Gracias por el flan!", "No se hubieran molestado"
      "[ay | uy] [muchas | mil] gracias (por | por el | por la | por los) (flan | cochinita | comida | taco | tacos | itacate | taper | tupper | comida para llevar | para llevar) [@great] [no se hubieran molestado | no te hubieras molestado]",
      "[ay | uy] [muchas | mil] gracias [que (rico | amables | lindos | lindas)] (no se hubieran molestado | no te hubieras molestado | no hacia falta | no era necesario)",
      "[ay] (no se hubieran molestado | no te hubieras molestado | no hacia falta | no era necesario) [muchas gracias | mil gracias | gracias]",
      "[ay] [que rico] me (lo | la) como manana [gracias | muchas gracias]", "[ay] (que | muy) (amables | lindos | lindas) [muchas gracias | gracias]",
    ] },
    // "Gracias a ustedes": only as the answer to "¡Gracias por venir!"
    thanks_back_ctx: { patterns: ["[no] [muchas] gracias a (ustedes | ti | vosotros) [por todo | por la invitacion]"] },
    will_text: { patterns: ["(te | les | os) (aviso | escribo | mando un mensaje | marco) (cuando llegue | al llegar | en cuanto llegue) #h:gb_text", "[si] [claro] (te | les) aviso"] },
    good_night: { patterns: ["buenas noches [a todos] #h:gb_night", "nos vemos (pronto | luego | otro dia | la proxima)", "(que)? (pasen | pases) (buena noche | buenas noches)", "que descansen"] },
    agree: { patterns: [
      "claro #h:ag_sure", "con (mucho)? gusto #h:ag_happy", "(claro que si | por supuesto | como no)",
      "[si] (claro | por supuesto) [donde (la | lo) pongo]", "[si] donde (la | lo) pongo #h:ag_where", "(va | sale | orale | dale) [claro]",
    ] },
    no_sorry: { patterns: ["[no] de verdad [gracias | no puedo]", "[no] (no me puedo quedar | no puedo quedarme) [perdon | lo siento | hoy]", "la proxima (vez)? me quedo [mas]", "[no] no me quedo [perdon | lo siento | hoy]", "[no] (lo siento | perdon | perdona) [no puedo]", "(perdon | lo siento) no puedo", "[no] de verdad no puedo", "(la proxima | la proxima vez | otro dia) [sera]", "[no] no puedo [perdon | lo siento]"] },
  },

  lines: {
    // at the door
    door_dan: [
      t("¡Hola! | ¡Qué | bueno | que | viniste! | ¡Pásale!", "Hi! | How | good | that | you-came! | Come in!", "Hi! So glad you made it! Come on in!",
        { flags: { 5: "Mexican: pásale = come in." },
          neutral: t("¡Hola! | ¡Qué | bueno | que | viniste! | ¡Pasa!", "Hi! | How | good | that | you-came! | Come in!", "Hi! So glad you made it! Come on in!"), spain: t("¡Hola! | ¡Qué | bien | que | hayas venido! | ¡Pasa!", "Hi! | How | good | that | you've come! | Come in!", "Hi! So glad you made it! Come on in!") }),
      t("¡Hola! | ¡Qué | gusto | verte! | ¡Pasa, | pasa!", "Hi! | What | pleasure | to-see-you! | Come in, | come in!", "Hi! Great to see you! Come on in!", { spain: t("¡Hola! | ¡Qué | alegría | verte! | ¡Pasa, | pasa!", "Hi! | What | a joy | to see you! | Come in, | come in!", "Hi! Great to see you! Come on in!") }),
    ],
    door_nora: [
      t("¡Hola! | ¡Bienvenid{m:o|f:a}!", "Hi! | Welcome!", "Hi! Welcome!"),
      t("¡Hola! | ¡Qué | gusto | que | estés | aquí!", "Hi! | What | joy | that | you-are | here!", "Hi! We're so happy you're here!", { spain: t("¡Hola! | ¡Qué | alegría | que | estés | aquí!", "Hi! | What | a joy | that | you're | here!", "Hi! We're so happy you're here!") }),
    ],
    coat: [
      t("Siéntate, | siéntate. | Estás en tu casa.", "Sit down, | sit down. | Make yourself at home.", "Have a seat! Make yourself at home.",
        { flags: { 2: "estás en tu casa: “you're in your own home”, the Mexican welcome." } }),
      t("Ponte | cómod{m:o|f:a}, | ¿eh? | Estás en tu casa.", "Get | comfortable, | okay? | Make yourself at home.", "Get comfortable, okay? Make yourself at home.",
        { flags: { 3: "estás en tu casa: “you're in your own home”, the Mexican welcome." } }),
    ],
    our_pleasure: [
      t("¡Al contrario! | ¡Qué gusto | tenerte | aquí!", "On the contrary! | What a pleasure | to have you | here!", "Oh, please! It's so nice to have you here!", { flags: { 0: AL_CONTRARIO }, spain: t("¡Al contrario! | ¡Qué alegría | tenerte | aquí!", "On the contrary! | What a pleasure | to have you | here!", "Oh, please! It's so nice to have you here!") }),
      t("¡Nada | que | agradecer!", "Nothing | to | thank-for!", "Don't mention it!"),
    ],
    // "Gracias por la cena" before the goodbye
    thanks_dinner: [
      t("¡Al contrario! | ¡Qué | bueno | que | te | gustó!", "On the contrary! | How | good | that | (to) you | it-pleased!", "Oh, please! I'm so glad you liked it!", { flags: { 0: AL_CONTRARIO }, spain: t("¡Al contrario! | ¡Qué | bien | que | te | haya gustado!", "On the contrary! | How | good | that | (to) you | it has pleased!", "Oh, please! I'm so glad you liked it!") }),
    ],
    gift_flowers: [
      t("¡Ay, | no te hubieras molestado! | ¡Están | preciosas!", "Oh, | you shouldn't have! | They're | beautiful!", "Oh, you shouldn't have! They're beautiful!",
        { flags: { 1: "no te hubieras molestado: “you shouldn't have bothered”, the polite reply to a gift." }, spain: t("¡Ay, | no tenías que haberte molestado! | ¡Están | preciosas!", "Oh, | you shouldn't have bothered! | They're | gorgeous!", "Oh, you shouldn't have! They're beautiful!") }),
    ],
    gift_wine: [
      t("¡Órale, | qué | rico! | Lo | abrimos | con | la | cena.", "Wow, | how | nice! | It | we'll-open | with | — | dinner.", "Ooh, nice! We'll open it with dinner.",
        { flags: { 0: "Mexican: órale = wow, all right.", 6: ART_GEN },
          neutral: t("¡Ay, | qué | rico! | Lo | abrimos | con | la | cena.", "Oh, | how | nice! | It | we'll-open | with | — | dinner.", "Ooh, nice! We'll open it with dinner.", { flags: { 6: ART_GEN } }) }),
    ],
    gift_mezcal: [
      t("¡Órale! | Ese | lo | probamos | en | la | sobremesa.", "Wow! | That one | it | we'll-try | in | the | after-dinner chat.", "Wow! We'll try that one after dinner, at the table.",
        { flags: { 0: "Mexican: órale = wow, all right.", 1: "ese … lo: the object comes first, and lo repeats it.", 6: SOBREMESA },
          neutral: t("¡Qué | bien! | Ese | lo | probamos | en | la | sobremesa.", "How | great! | That one | it | we'll-try | in | the | after-dinner chat.",
            "Great! We'll try that one after dinner, at the table.", { flags: { 2: "ese … lo: the object comes first, and lo repeats it.", 7: SOBREMESA } }) }),
    ],
    gift_chocolates: [
      t("¡Chocolates! | ¡Qué | rico, | gracias!", "Chocolates! | How | yummy, | thanks!", "Chocolates! Yum, thank you!"),
    ],
    gift_cookies: [
      t("¡Galletas! | ¡Qué | rico, | gracias!", "Cookies! | How | yummy, | thanks!", "Cookies! Yum, thank you!"),
    ],
    gift_dessert: [
      t("¿Trajiste | postre? | ¡Eres | {m:el|f:la} | mejor!", "You-brought | dessert? | You-are | the | best!", "You brought dessert? You're the best!", { spain: t("¿Has traído | postre? | ¡Eres | {m:el|f:la} | mejor!", "You've brought | dessert? | You're | the | best!", "You brought dessert? You're the best!") }),
    ],
    gift_pan: [
      t("¡Pan | dulce! | Perfecto | para | el | cafecito.", "Bread | sweet! | Perfect | for | the | little coffee.", "Pan dulce! Perfect with coffee later.",
        { flags: { 0: "pan dulce: Mexican sweet rolls, eaten with coffee or hot chocolate." }, spain: t("¡Pan | dulce! | Perfecto | para | el | café.", "Sweet | bread! | Perfect | for | the | coffee.", "Pan dulce! Perfect with coffee later.") }),
    ],
    gift_any: [
      t("¡Ay, | gracias! | No te hubieras molestado.", "Oh, | thanks! | You shouldn't have.", "Oh, thank you! You shouldn't have.", { spain: t("¡Ay, | gracias! | No tenías que haberte molestado.", "Aw, | thanks! | You shouldn't have bothered.", "Oh, thank you! You shouldn't have.") }),
    ],
    thanks_again: [
      t("¡Gracias | otra vez!", "Thanks | again!", "Thanks again!"),
    ],
    no_gift_ok: [
      t("¡Ay, | no te preocupes! | Lo | importante | es | que | viniste.", "Oh, | don't worry! | The | important (thing) | is | that | you-came.", "Oh, don't worry! What matters is that you're here.",
        { flags: { 2: "lo + adjective: “the … thing”." }, spain: t("¡Ay, | no te preocupes! | Lo | importante | es | que | has venido.", "Oh, | don't worry! | The | important thing | is | that | you've come.", "Oh, don't worry! What matters is that you're here.") }),
    ],
    on_time: [
      t("¡Para nada! | Llegaste | justo | a tiempo.", "Not at all! | You-arrived | just | on time.", "Not at all! You're right on time.", { spain: t("¡Para nada! | Has llegado | justo | a tiempo.", "Not at all! | You've arrived | just | in time.", "Not at all! You're right on time.") }),
    ],
    ask_diet: [
      t("Oye, | se me olvidó | preguntarte: | ¿hay | algo | que | no comas?", "Hey, | I forgot | to ask you: | is-there | something | that | you-don't-eat?",
        "Hey, I forgot to ask: is there anything you don't eat?", { flags: { 1: "se me olvidó: “it slipped my mind”, the everyday way to say I forgot." }, spain: t("Oye, | se me ha olvidado | preguntarte: | ¿hay | algo | que | no comas?", "Hey, | I've forgotten | to ask you: | is there | anything | that | you don't eat?", "Hey, I forgot to ask: is there anything you don't eat?") }),
    ],
    diet_reask: [
      t("Entonces, | ¿algo | que | no comas?", "So, | something | that | you-don't-eat?", "So, anything you don't eat?"),
    ],
    diet_great: [
      t("¡Perfecto!", "Perfect!", "Great!"),
    ],
    diet_veg_ok: [
      t("¡No hay problema! | También | hice | tacos | de | rajas | con | queso.", "No problem! | Also | I-made | tacos | of | pepper strips | with | cheese.",
        "No problem! I also made tacos with poblano strips and cheese.", { flags: { 5: "rajas: strips of roasted poblano pepper." }, spain: t("¡No hay problema! | También | he hecho | tacos | de | rajas | con | queso.", "No problem! | Also | I've made | tacos | of | pepper strips | with | cheese.", "No problem! I also made tacos with poblano strips and cheese.") }),
    ],
    diet_allergy_ok: [
      t("¡Qué | bueno | que | me | dices! | Te | digo | qué | lleva | cada | plato.", "How | good | that | (to) me | you-tell! | (To) you | I'll-tell | what | it-has-in-it | each | dish.",
        "Good thing you told me! I'll tell you what's in each dish.", { spain: t("¡Menos mal | que | me lo | dices! | Te | digo | qué | lleva | cada | plato.", "Thank goodness | that | (to) me it | you tell! | (To) you | I'll tell | what | has | each | dish.", "Good thing you told me! I'll tell you what's in each dish.") }),
    ],
    ask_drink: [
      t("¿Qué | te | ofrezco | de | tomar? | Hay | cerveza, | vino, | agua de jamaica | o | refresco.",
        "What | (to) you | I-offer | — | to drink? | There's | beer, | wine, | hibiscus water | or | soda.",
        "What can I get you to drink? There's beer, wine, agua de jamaica or soda.",
        { flags: { 3: "de tomar: “to drink” (tomar is the everyday verb for drinking); de has no English word.", 8: JAMAICA }, spain: t("¿Qué | te | pongo | de | beber? | Hay | cerveza, | vino, | agua de jamaica | o | refresco.", "What | (to) you | do I get | to | drink? | There's | beer, | wine, | hibiscus water | or | soda.", "What can I get you to drink? There's beer, wine, agua de jamaica or soda.") }),
      t("¿Qué | te | sirvo | de | tomar?", "What | (to) you | I-serve | — | to drink?", "What can I get you to drink?",
        { flags: { 3: "de tomar: “to drink”; de has no English word." }, spain: t("¿Qué | te | pongo | de | beber?", "What | (to) you | do I get | to | drink?", "What can I get you to drink?") }),
    ],
    what_can_i_get: [
      t("Entonces, | ¿qué | te | sirvo?", "So, | what | (to) you | I-serve?", "So, what can I get you?", { spain: t("Entonces, | ¿qué | te | pongo?", "So, | what | (to) you | do I get?", "So, what can I get you?") }),
    ],
    drink_list: [
      t("Hay | cerveza, | vino | tinto | y | blanco, | agua de jamaica, | refresco | o | agua | natural.", "There's | beer, | wine | red | and | white, | hibiscus water, | soda | or | water | plain.",
        "There's beer, red and white wine, agua de jamaica, soda or plain water.", { flags: { 6: JAMAICA } }),
    ],
    soft_list: [
      t("¡No hay problema! | Hay | agua de jamaica, | refresco | o | agua | natural.", "No problem! | There's | hibiscus water, | soda | or | water | plain.",
        "No problem! There's agua de jamaica, soda or plain water.", { flags: { 2: JAMAICA } }),
    ],
    drink_ok: [
      t("¡Claro! | Ahorita | te | sirvo.", "Sure! | Right now | (to) you | I-serve.", "Sure! Coming right up.",
        { flags: { 1: AHORITA }, neutral: t("¡Claro! | Enseguida | te | sirvo.", "Sure! | Right away | (to) you | I-serve.", "Sure! Coming right up.") }),
      t("¡Con gusto!", "With pleasure!", "You got it!", { spain: t("¡Claro!", "Sure!", "You got it!") }),
    ],
    just_say: [
      t("¡Bueno! | Si | se te antoja | algo, | me | dices.", "Okay! | If | you-feel-like | something, | (to) me | you-tell.", "Okay! If you want anything, just let me know.",
        { flags: { 2: "antojarse: to feel like having something." }, spain: t("¡Vale! | Si | te apetece | algo, | me | dices.", "Okay! | If | you feel like | something, | (to) me | you-tell.", "Okay! If you want anything, just let me know.") }),
    ],
    cat_intro: [
      t("Ah, | y | ella | es | Michi. | ¿Eres | {m:alérgico|f:alérgica} | a | los | gatos?", "Oh, | and | she | is | Michi. | Are-you | allergic | to | — | cats?",
        "Oh, and this is Michi. Are you allergic to cats?", { flags: { 4: "Michi: a typical cat's name (michi = kitty).", 8: ART_GEN } }),
    ],
    cat_reask: [
      // the same polarity as "¿Eres alérgico?": sí = they bother you (Michi goes out), no = fine
      t("Entonces, | ¿te | molestan | los | gatos?", "So, | (to) you | they-bother | — | cats?", "So, do cats bother you?", { flags: { 3: ART_GEN } }),
    ],
    cat_good: [
      t("¡Qué | bueno! | Le encantan | las | visitas.", "How | good! | She loves | — | visitors.", "Good! She loves visitors.", { flags: { 3: ART_GEN }, spain: t("¡Qué | bien! | Le encantan | las | visitas.", "How | great! | She loves | — | visitors.", "Good! She loves visitors.", { flags: { 3: "las: Spanish uses the article for things in general; English has none." } }) }),
    ],
    cat_lock_q: [
      t("Ah, | ¿quieres | que | la | encierre | en | la | recámara?", "Oh, | do-you-want | that | her | I-shut-in | in | the | bedroom?", "Oh, do you want me to shut her in the bedroom?",
        { flags: { 3: "la here is a pronoun: her (Michi).", 7: "Mexican: recámara = bedroom." },
          neutral: t("Ah, | ¿quieres | que | la | encierre | en | la | habitación?", "Oh, | do-you-want | that | her | I-shut-in | in | the | bedroom?", "Oh, do you want me to shut her in the bedroom?",
            { flags: { 3: "la here is a pronoun: her (Michi)." } }) }),
    ],
    cat_lock_ok: [
      t("¡Claro! | Ven, | Michi.", "Sure! | Come, | Michi.", "Sure! Come on, Michi."),
    ],
    cat_away: [
      t("¡Ay, | no! | Ahorita | la | encierro | en | la | recámara.", "Oh, | no! | Right now | her | I'll-shut-in | in | the | bedroom.", "Oh no! I'll shut her in the bedroom right away.",
        { flags: { 2: AHORITA, 3: "la here is a pronoun: her (Michi).", 7: "Mexican: recámara = bedroom." },
          neutral: t("¡Ay, | no! | Ahora | la | encierro | en | la | habitación.", "Oh, | no! | Now | her | I'll-shut-in | in | the | bedroom.", "Oh no! I'll shut her in the bedroom right away.",
            { flags: { 3: "la here is a pronoun: her (Michi)." } }) }),
    ],
    almost_ready: [
      t("La | cena | ya | casi | está | lista.", "— | Dinner | now | almost | is | ready.", "Dinner's almost ready.", { flags: { 0: ART_GEN } }),
      t("En | cinco | minutos | cenamos.", "In | five | minutes | we-have-dinner.", "Dinner in five minutes!"),
    ],
    relax: [
      t("¡No, | no! | Tú | siéntate | y | relájate.", "No, | no! | You | sit down | and | relax.", "No, no! You just sit down and relax."),
      t("¡Nada de eso! | Hoy | eres | {m:el|f:la} | {m:invitado|f:invitada}.", "None of that! | Today | you-are | the | guest.", "None of that! Tonight you're the guest."),
    ],
    salad_task: [
      t("¡Ay, | gracias! | ¿Me | ayudas | a | llevar | el | agua de jamaica | a | la | mesa?", "Oh, | thanks! | Me | you-help | to | carry | the | hibiscus water | to | the | table?",
        "Oh, thanks! Could you help me take the agua de jamaica to the table?", { flags: { 7: JAMAICA } }),
    ],
    salad_reask: [
      t("¿Me | ayudas | con | el | agua?", "Me | you-help | with | the | water?", "Could you help me with the water?"),
    ],
    star: [
      t("¡Gracias! | Eres | un | amor.", "Thanks! | You-are | a | love.", "Thanks! You're a sweetheart."),
    ],
    smell_dish: [
      t("¡Gracias! | Es | cochinita pibil, | la | receta | de | la | mamá | de | Natalia.", "Thanks! | It's | cochinita pibil, | the | recipe | of | the | mom | of | Natalia.",
        "Thanks! It's cochinita pibil, Natalia's mom's recipe.", { flags: { 2: PIBIL }, spain: t("¡Gracias! | Es | cochinita pibil, | la | receta | de | la | madre | de | Natalia.", "Thanks! | It's | cochinita pibil, | the | recipe | of | the | mom | of | Natalia.", "Thanks! It's cochinita pibil, Natalia's mom's recipe.") }),
    ],
    dish_is: [
      t("Es | cochinita pibil, | la | receta | de | la | mamá | de | Natalia.", "It's | cochinita pibil, | the | recipe | of | the | mom | of | Natalia.",
        "It's cochinita pibil, Natalia's mom's recipe.", { flags: { 1: PIBIL }, spain: t("Es | cochinita pibil, | la | receta | de | la | madre | de | Natalia.", "It's | cochinita pibil, | the | recipe | of | the | mom | of | Natalia.", "It's cochinita pibil, Natalia's mom's recipe.") }),
    ],
    dish_again: [
      t("¡Cochinita pibil! | Ahorita | la | pruebas.", "Cochinita pibil! | In a moment | it | you-try.", "Cochinita pibil! You'll taste it in a minute.",
        { flags: { 1: AHORITA, 2: "la here is a pronoun: it (la cochinita)." },
          neutral: t("¡Cochinita pibil! | Enseguida | la | pruebas.", "Cochinita pibil! | In a moment | it | you-try.", "Cochinita pibil! You'll taste it in a minute.", { flags: { 2: "la here is a pronoun: it (la cochinita)." } }) }),
    ],
    home_thanks: [
      t("¡Ay, | gracias! | La | acabamos de | pintar.", "Aw, | thanks! | It | we-just | painted.", "Aw, thanks! We just painted it.",
        { flags: { 2: "La: it (la casa).", 3: "acabar de + verb: to have just done it." } }),
    ],
    pictures: [
      t("¡Gracias! | Los | pintó | mi | hermana.", "Thanks! | Them | painted | my | sister.", "Thanks! My sister painted them.", { flags: { 1: "The object comes first here: Los (them) … mi hermana (my sister) painted." } }),
    ],
    dinner_ready: [
      t("¡A | la | mesa! | La | cena | está | lista.", "To | the | table! | — | Dinner | is | ready.", "Come to the table! Dinner's ready.", { flags: { 3: ART_GEN } }),
      t("¡Listo! | ¡A cenar! | ¡Buen provecho!", "Ready! | Dinner time! | Enjoy your meal!", "Okay, dinner time! Enjoy!",
        { flags: { 2: "buen provecho: said to people about to eat (enjoy your meal)." }, spain: t("¡Ya está! | ¡A cenar! | ¡Que aproveche!", "All set! | Dinner's on! | Enjoy your meal!", "Okay, dinner time! Enjoy!") }),
    ],
    cheers_back: [
      t("¡Salud!", "Cheers!", "Cheers!"),
    ],
    restroom_where: [
      t("Al fondo, | a la derecha.", "At the back, | on the right.", "In the back, on the right."),
    ],
    provecho_back: [
      t("¡Igualmente!", "Likewise!", "You too!"),
    ],
    how_is_it: [
      t("¿Qué tal | la | cochinita?", "How's | the | cochinita?", "So, how's the cochinita?"),
      t("¿Y? | ¿Te gusta?", "And? | Do-you-like-it?", "So? Do you like it?"),
    ],
    glad_you_like: [
      t("¡Qué | bueno | que | te guste!", "How | good | that | you like it!", "I'm so glad you like it!", { spain: t("¡Qué | bien | que | te guste!", "How | good | that | you like it!", "I'm so glad you like it!") }),
      t("¡Ay, | gracias! | ¡Qué | gusto!", "Aw, | thanks! | What | joy!", "Aw, thanks! That makes me so happy!", { spain: t("¡Ay, | gracias! | ¡Qué | alegría!", "Aw, | thanks! | What | a joy!", "Aw, thanks! That makes me so happy!") }),
    ],
    sorry_water: [
      t("¡Ay, | perdón! | Es | el | habanero. | Toma | un | poco | de | agua.", "Oh, | sorry! | It's | the | habanero. | Have | a | little | of | water.",
        "Oh, sorry! That's the habanero. Have some water.", { flags: { 4: HABANERO } }),
    ],
    spicy_answer: [
      t("La | cochinita | no, | pero | la | salsa | de | habanero | sí | pica | mucho.", "The | cochinita | no, | but | the | salsa | of | habanero | yes | it-burns | a lot.",
        "The cochinita isn't, but the habanero salsa is really hot.", { flags: { 7: HABANERO, 8: "sí here stresses the contrast: “it does”." } }),
    ],
    no_spicy_ok: [
      t("¡Entonces | sin | salsa! | La | cochinita | sola | no pica.", "Then | without | salsa! | The | cochinita | alone | doesn't burn.", "Then skip the salsa! The cochinita on its own isn't spicy."),
    ],
    sorry_bad: [
      t("¿No? | ¡Ay, | perdón! | También | hay | arroz | y | frijoles.", "No? | Oh, | sorry! | Also | there's | rice | and | beans.", "No? Oh, sorry! There's rice and beans too.", { spain: t("¿No? | ¡Ay, | perdón! | También | hay | arroz | y | judías.", "No? | Oh, | sorry! | Also | there's | rice | and | beans.", "No? Oh, sorry! There's rice and beans too.") }),
    ],
    sorry_salty: [
      t("¡Ay, | perdón! | Se me pasó | la | sal.", "Oh, | sorry! | I-overdid | the | salt.", "Oh, sorry! I went overboard with the salt.",
        { flags: { 2: "se me pasó: “it got away from me”, said of too much of something." }, spain: t("¡Ay, | perdón! | Se me ha ido la mano | con | la | sal.", "Oh, | sorry! | I've overdone it | with | the | salt.", "Oh, sorry! I went overboard with the salt.") }),
    ],
    i_did: [
      t("¡Sí, | yo! | Bueno, | el | flan | lo | hizo | Natalia.", "Yes, | me! | Well, | the | flan | it | made | Natalia.", "Yep, me! Well, Natalia made the flan.",
        { flags: { 5: "lo repeats the flan: the object comes first for emphasis." }, spain: t("¡Sí, | yo! | Bueno, | el | flan | lo | ha hecho | Natalia.", "Yes, | me! | Well, | the | flan | it | has made | Natalia.", "Yep, me! Well, Natalia made the flan.", { flags: { 5: "lo repeats the flan: the object comes first for emphasis." } }) }),
    ],
    // "¿Quién cocinó?"
    i_did_who: [
      t("¡Yo! | Bueno, | el | flan | lo | hizo | Natalia.", "Me! | Well, | the | flan | it | made | Natalia.", "I did! Well, Natalia made the flan.",
        { flags: { 4: "lo repeats the flan: the object comes first for emphasis." }, spain: t("¡Yo! | Bueno, | el | flan | lo | ha hecho | Natalia.", "Me! | Well, | the | flan | it | has made | Natalia.", "I did! Well, Natalia made the flan.", { flags: { 4: "lo repeats the flan: the object comes first for emphasis." } }) }),
    ],
    flan_mine: [
      t("¡Sí, | yo! | Es | la | receta | de | mi | abuela.", "Yes, | me! | It's | the | recipe | of | my | grandma.", "Yep, I did! It's my grandma's recipe."),
    ],
    // "¿Quién hizo el flan?"
    flan_who: [
      t("¡Yo! | Es | la | receta | de | mi | abuela.", "Me! | It's | the | recipe | of | my | grandma.", "I did! It's my grandma's recipe."),
    ],
    recipe_ok: [
      t("¡Claro! | Te la | mando | por | mensaje.", "Sure! | It to you | I'll-send | by | message.", "Sure! I'll text it to you."),
    ],
    // "¿Qué lleva?", "¿Qué es la cochinita?", "¿Cómo la preparas?"
    recipe_what: [
      t("Es | puerco | adobado | con | achiote | y | naranja agria, | cocido | en | hoja de plátano.",
        "It's | pork | marinated | with | achiote | and | sour orange, | cooked | in | banana leaf.",
        "It's pork marinated in achiote and sour orange, cooked in banana leaves.",
        { flags: { 4: "achiote: a red paste of annatto seeds, the base of Yucatecan cooking.", 6: AGRIA },
          neutral: t("Es | cerdo | adobado | con | achiote | y | naranja agria, | cocido | en | hoja de plátano.",
            "It's | pork | marinated | with | achiote | and | sour orange, | cooked | in | banana leaf.",
            "It's pork marinated in achiote and sour orange, cooked in banana leaves.",
            { flags: { 4: "achiote: a red paste of annatto seeds, the base of Yucatecan cooking.", 6: AGRIA } }) }),
    ],
    // "¿Qué lleva la salsa?"
    salsa_what: [
      t("Chile | habanero, | naranja agria | y | sal. | ¡Cuidado, | que | pica!", "Chili | habanero, | sour orange | and | salt. | Careful, | since | it-burns!",
        "Habanero chili, sour orange and salt. Careful, it's hot!", { flags: { 1: HABANERO, 2: AGRIA, 6: "que here: “since”, “because”." } }),
    ],
    here_you_go: [
      t("¡Claro! | Aquí tienes.", "Sure! | Here you go.", "Sure, here you go."),
      t("¡Toma!", "Here!", "Here you go!"),
    ],
    here_water: [
      t("¡Claro! | Aquí | está | el | agua.", "Sure! | Here | is | the | water.", "Sure! Here's the water."),
    ],
    ask_pass: [
      t("Oye, | ¿me | pasas | las | tortillas?", "Hey, | (to) me | you-pass | the | tortillas?", "Hey, could you pass the tortillas?"),
    ],
    // asked again after a side remark (as every other question here has its second wording)
    pass_reask: [
      t("¿Me | pasas | las | tortillas, | porfa?", "(To) me | you-pass | the | tortillas, | please?", "Could you pass the tortillas, please?",
        { flags: { 4: "porfa: short for por favor." } }),
    ],
    thanks_pass: [
      t("¡Gracias!", "Thanks!", "Thanks!"),
    ],
    burnt: [
      t("¡Ay, | no! | ¡Se me quemó | el | arroz!", "Oh, | no! | I burned | the | rice!", "Oh no! I burned the rice!",
        { flags: { 2: "se me quemó: “it got burned on me”, an accident." }, spain: t("¡Ay, | no! | ¡Se me ha quemado | el | arroz!", "Oh, | no! | I've burned | the | rice!", "Oh no! I burned the rice!") }),
    ],
    youre_sweet: [
      t("¡Ay, | qué | {m:lindo|f:linda}! | Gracias.", "Aw, | how | sweet! | Thanks.", "Aw, that's sweet of you. Thanks.", { spain: t("¡Ay, | qué | {m:majo|f:maja}! | Gracias.", "Aw, | how | sweet! | Thanks.", "Aw, that's sweet of you. Thanks.") }),
    ],
    ask_seconds: [
      t("¿Te | sirvo | otro | poquito?", "(To) you | I-serve | another | little bit?", "Can I get you a little more?", { flags: { 3: "poquito: poco with the diminutive, a softer “a bit”." } }),
      t("¡Hay | mucha! | ¿Quieres | más?", "There's | lots! | Do-you-want | more?", "There's plenty! Want some more?"),
    ],
    here_more: [
      t("¡Ándale! | Aquí tienes.", "That's it! | Here you go.", "That's the spirit! Here you go.",
        { flags: { 0: "Mexican: ándale = that's it, go on." }, neutral: t("¡Muy | bien! | Aquí tienes.", "Very | good! | Here you go.", "That's the spirit! Here you go.") }),
    ],
    just_a_little: [
      t("Un | poquito, | entonces. | Aquí tienes.", "A | little bit, | then. | Here you go.", "Just a little, then. Here you go."),
    ],
    save_room: [
      t("¡Bueno! | Pero | deja | lugar | para | el | postre.", "Okay! | But | leave | room | for | — | dessert.", "Okay! But save room for dessert!", { flags: { 5: ART_GEN }, spain: t("¡Vale! | Pero | deja | sitio | para | el | postre.", "Okay! | But | leave | room | for | the | dessert.", "Okay! But save room for dessert!") }),
    ],
    seconds_reask: [
      t("Entonces, | ¿te | sirvo | más?", "So, | (to) you | I-serve | more?", "So, can I get you some more?"),
    ],
    dessert_reask: [
      t("Entonces, | ¿un | poquito | de | flan?", "So, | a | little bit | of | flan?", "So, a little flan?"),
    ],
    ask_dessert: [
      t("¿Quién | quiere | postre? | ¡Hice | flan!", "Who | wants | dessert? | I-made | flan!", "Who wants dessert? I made flan!", { spain: t("¿Quién | quiere | postre? | ¡He hecho | flan!", "Who | wants | dessert? | I've made | flan!", "Who wants dessert? I made flan!") }),
    ],
    here_cake: [
      t("¡Aquí | está! | ¡Buen provecho!", "Here | it-is! | Enjoy!", "Here you go! Enjoy!", { spain: t("¡Aquí | está! | ¡Que aproveche!", "Here | it is! | Enjoy!", "Here you go! Enjoy!") }),
    ],
    changed_mind: [
      t("¡Ándale! | Ahí | va | un | poquito.", "That's it! | There | it-goes | a | little bit.", "That's the spirit! Here's a little.",
        { flags: { 0: "Mexican: ándale = that's it, go on." }, neutral: t("¡Muy | bien! | Ahí | va | un | poquito.", "Very | good! | There | it-goes | a | little bit.", "That's the spirit! Here's a little.") }),
    ],
    small_piece: [
      t("Un | pedacito, | ¡ahí | va!", "A | little piece, | there | it-goes!", "A small piece, coming right up!", { spain: t("Un | trocito, | ¡ahí | va!", "A | little piece, | there | it-goes!", "A small piece, coming right up!") }),
    ],
    more_for_dan: [
      t("¡No pasa nada! | Más | para | Diego.", "No worries! | More | for | Diego.", "No problem! More for Diego."),
    ],
    it_sure_does: [
      t("¡Sí, | vuela!", "Yes, | it-flies!", "It sure does!"),
    ],
    i_know: [
      t("¡Ya | sé!", "Already | I-know!", "I know!", { flags: { 0: "ya here adds emphasis: “I know!”." }, spain: t("¡Ya | lo sé!", "Already | I-know-it!", "I know!", { flags: { 0: "ya here adds emphasis: “I know!”." } }) }),
    ],
    late: [
      t("¡Uy, | ya | casi | son | las | once!", "Whoa, | already | almost | it's | — | eleven!", "Whoa, it's almost eleven already!", { flags: { 4: ART_TIME } }),
      t("¡Cómo | se pasa | el | tiempo!", "How | it-passes | — | time!", "Wow, where did the time go?", { flags: { 2: ART_GEN } }),
    ],
    anything_else: [
      t("¿Te | sirvo | algo | más? | ¿Un | cafecito?", "(To) you | I-serve | something | more? | A | little coffee?", "Can I get you anything else? A coffee?",
        { flags: { 5: "cafecito: café with the diminutive, friendly." }, spain: t("¿Te | pongo | algo | más? | ¿Un | café?", "(To) you | do I get | something | more? | A | coffee?", "Can I get you anything else? A coffee?") }),
      t("¿Quieres | un | cafecito?", "Do-you-want | a | little coffee?", "Would you like a coffee?", { spain: t("¿Quieres | un | café?", "Do you want | a | coffee?", "Would you like a coffee?") }),
    ],
    chat_then: [
      t("¡Bueno! | Entonces | seguimos | con | la | sobremesa.", "Okay! | Then | we-continue | with | the | after-dinner chat.", "Okay! Then let's just keep chatting.",
        { flags: { 5: SOBREMESA }, spain: t("¡Vale! | Entonces | seguimos | con | la | sobremesa.", "Okay! | Then | we-continue | with | the | after-dinner chat.", "Okay! Then let's just keep chatting.") }),
    ],
    // after the sobremesa coffee
    more_coffee: [
      t("¿Otro | cafecito?", "Another | little coffee?", "More coffee?", { spain: t("¿Otro | café?", "Another | coffee?", "More coffee?") }),
    ],
    stay_longer: [
      t("¿Ya | te vas? | ¡Quédate | otro | ratito, | estamos | en | la | sobremesa!", "Already | you're-leaving? | Stay | another | little while, | we-are | in | the | after-dinner chat!",
        "Leaving already? Stay a little longer, we're just getting to the good part!", { flags: { 8: SOBREMESA } }),
    ],
    stay_reask: [
      t("Entonces, | ¿te quedas | otro | ratito?", "So, | are-you-staying | another | little while?", "So, will you stay a bit longer?"),
    ],
    yay_stay: [
      t("¡Qué | bueno! | La | sobremesa | es | lo | mejor.", "How | great! | The | after-dinner chat | is | the | best (part).", "Yay! The after-dinner chat is the best part.",
        { flags: { 3: SOBREMESA, 5: "lo + adjective: “the … part”." }, spain: t("¡Qué | bien! | La | sobremesa | es | lo | mejor.", "How | great! | The | after-dinner chat | is | the | best (part).", "Yay! The after-dinner chat is the best part.") }),
    ],
    but_dinner: [
      t("¿Ya | te vas? | ¡Pero | la | cena | ya | casi | está | lista!", "Already | you're-leaving? | But | — | dinner | now | almost | is | ready!", "Leaving already? But dinner's almost ready!",
        { flags: { 3: ART_GEN } }),
    ],
    // "Ya me voy" with dinner on the table
    but_eating: [
      t("¿Ya | te vas? | ¡Pero | si | apenas | estamos | cenando!", "Already | you're-leaving? | But | — | just | we-are | having-dinner!",
        "Leaving already? But we've only just sat down to eat!", { flags: { 3: "pero si…: an emphatic protest; si here has no English word." }, spain: t("¿Ya | te vas? | ¡Pero | si | acabamos de | empezar | a cenar!", "Already | you're leaving? | But | — | we've just | started | eating dinner!", "Leaving already? But we've only just sat down to eat!", { flags: { 3: "si (no accent) adds protest here, like English “why…”; it isn't “if”." } }) }),
    ],
    thanks_for_coming: [
      t("¡Claro! | ¡Gracias | por | venir!", "Sure! | Thanks | for | coming!", "Of course! Thanks so much for coming!"),
      t("Bueno, | ¡nos | dio | mucho | gusto | verte!", "Well, | (to) us | it-gave | much | pleasure | to-see-you!", "Well, it was so good to see you!", { spain: t("Bueno, | ¡nos | ha encantado | verte!", "Well, | (to) us | it has delighted | to see you!", "Well, it was so good to see you!") }),
    ],
    for_the_road: [
      t("¡Espérate! | Te | pongo | un | poco | de | cochinita | para llevar.", "Wait! | (For) you | I-put | a | little | of | cochinita | to go.", "Wait! Let me pack you some cochinita to take home.", { spain: t("¡Espera! | Te | pongo | un | poco | de | cochinita | para llevar.", "Wait! | (To) you | I'll put | a | bit | of | cochinita | to take away.", "Wait! Let me pack you some cochinita to take home.") }),
    ],
    // a guest who eats no meat takes flan home
    for_the_road_flan: [
      t("¡Espérate! | Te | pongo | un | pedazo | de | flan | para llevar.", "Wait! | (For) you | I-put | a | piece | of | flan | to go.", "Wait! Let me pack you a piece of flan to take home.", { spain: t("¡Espera! | Te | pongo | un | trozo | de | flan | para llevar.", "Wait! | (For) you | I-put | a | piece | of | flan | to go.", "Wait! Let me pack you a piece of flan to take home.") }),
    ],
    yes_please: [
      t("¡Sí, | porfa!", "Yes, | please!", "Yes, please do!", { flags: { 1: "porfa: short for por favor." } }),
    ],
    anytime_come_again: [
      t("¡Cuando | quieras! | Aquí | tienes | tu | casa.", "Whenever | you-want! | Here | you-have | your | home.", "Anytime! You're always welcome here.",
        { flags: { 2: "aquí tienes tu casa: the Mexican “my home is your home”." } }),
    ],
    get_home_safe: [
      t("¡Que | descanses! | Avísanos | cuando | llegues.", "— | May-you-rest! | Let us know | when | you-arrive.", "Sleep well! Text us when you get home.",
        { flags: { 0: "que + verb: a wish." } }),
      t("¡Buenas noches! | Nos | avisas | cuando | llegues, | ¿eh?", "Good night! | (To) us | you-let-know | when | you-arrive, | okay?", "Good night! Let us know when you get home, okay?"),
    ],
    get_home_will: [
      t("¡Sí, | porfa! | ¡Que | llegues | bien!", "Yes, | please! | — | May-you-arrive | well!", "Yes, please! Get home safe!", { flags: { 1: "porfa: short for por favor.", 2: "que + verb: a wish." } }),
    ],
  },

  hints: {
    door: {
      lt: "Say hello and thank them for inviting you",
      items: [
        { id: "gr_thanks", s: t("¡Gracias | por | invitarme!", "Thanks | for | inviting me!", "Thanks for inviting me!") },
        { id: "gr_glad", s: t("¡Qué | gusto | verlos!", "What | pleasure | to-see-you-all!", "So good to see you!", { spain: t("¡Qué | alegría | veros!", "What | a joy | to see you (all)!", "So good to see you!") }), note: "Verlos: “to see you” when you speak to both hosts." },
        { id: "gf_for_you", s: t("Esto | es | para | ustedes.", "This | is | for | you all.", "This is for you.", { spain: t("Esto | es | para | vosotros.", "This | is | for | you all.", "This is for you.") }), note: "Ustedes: you're speaking to both hosts." },
        { id: "gf_brought", s: t("Les | traje | unas | flores.", "(To) you all | I-brought | some | flowers.", "I brought you some flowers.", { spain: t("Os | he traído | unas | flores.", "(To) you (all) | I've brought | some | flowers.", "I brought you some flowers.") }) },
      ],
    },
    coat: {
      lt: "Say thanks, or give your gift",
      items: [
        { id: "s_thanks", s: t("¡Gracias!", "Thanks!", "Thanks!") },
        { id: "gf_for_you", s: t("Esto | es | para | ustedes.", "This | is | for | you all.", "This is for you.", { spain: t("Esto | es | para | vosotros.", "This | is | for | you all.", "This is for you.") }) },
        { id: "cm_home", s: t("¡Qué | bonita | casa!", "What | pretty | house!", "What a lovely home!") },
      ],
    },
    gift: {
      lt: "Give your gift", slot: "gift", examples: ["flowers", "wine", "chocolates", "cake"],
      items: [
        { id: "gf_brought", s: t("Les | traje | {X.np}.", "(To) you all | I-brought | {X.np}.", "I brought you {X.np}.", { spain: t("Os | he traído | {X.np}.", "(To) you (all) | I've brought | {X.np}.", "I brought you {X.np}.") }) },
        { id: "gf_for_you", s: t("Esto | es | para | ustedes.", "This | is | for | you all.", "This is for you.", { spain: t("Esto | es | para | vosotros.", "This | is | for | you all.", "This is for you.") }) },
        { id: "gf_short", s: t("Es | un | detallito | para | ustedes.", "It's | a | little gift | for | you all.", "Just a little something for you.",
          { flags: { 2: "detallito: a small gift (detalle with the diminutive)." }, spain: t("Es | un | detallito | para | vosotros.", "It's | a | little gift | for | you all.", "Just a little something for you.") }) },
      ],
    },
    drinks: {
      lt: "Choose a drink", slot: "drink", examples: ["jamaica", "beer", "red_wine", "water"],
      items: [
        { id: "dr_please", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "dr_want", s: t("Quiero | {X.np}, | gracias.", "I-want | {X.np}, | thanks.", "I'll have {X.np}, thanks."), note: "Among friends, “quiero” is perfectly polite." },
        { id: "dr_just", s: t("Solo | {X}, | gracias.", "Just | {X}, | thanks.", "Just {X}, thanks."), only: (e) => e.art === "" },
        { id: "dr_would_be", s: t("{X.np} | estaría | muy | bien.", "{X.np} | would-be | very | good.", "{X.np} would be great.") },
        { id: "dr_nothing", s: t("Estoy | bien | por ahora, | gracias.", "I-am | fine | for now, | thanks.", "I'm good for now, thanks.") },
      ],
    },
    help: {
      lt: "Offer to help",
      items: [
        { id: "hp_can_i", s: t("¿Les | ayudo | en | algo?", "(To) you all | I-help | in | something?", "Can I help with anything?", { spain: t("¿Os | ayudo | en | algo?", "(To) you (all) | do I help | in | anything?", "Can I help with anything?") }), note: "Les: to both hosts. To one of them: ¿Te ayudo?" },
        { id: "hp_what", s: t("¿Qué | puedo | hacer?", "What | I-can | do?", "What can I do?") },
        { id: "hp_table", s: t("¿Pongo | la | mesa?", "I-set | the | table?", "Should I set the table?") },
      ],
    },
    food: {
      lt: "Praise the food",
      items: [
        { id: "cm_delicious", s: t("¡Está | riquísima!", "It-is | super tasty!", "It's delicious!", { flags: { 1: "riquísima: rico (tasty) + -ísimo; it agrees with la cochinita." } }) },
        { id: "cm_que_rico", s: t("¡Mmm, | qué | rico!", "Mmm, | how | tasty!", "Mmm, so good!") },
        { id: "cm_cook", s: t("¡Cocinas | muy | bien!", "You-cook | very | well!", "You're a great cook!") },
      ],
    },
    compliments: {
      lt: "Compliment the home or the food",
      items: [
        { id: "cm_smells", s: t("¡Qué | rico | huele!", "How | nice | it-smells!", "Something smells amazing!") },
        { id: "cm_home", s: t("¡Qué | bonita | casa!", "What | pretty | house!", "What a lovely home!") },
        { id: "cm_made", s: t("¿Tú | cocinaste?", "You | cooked?", "Did you cook all this?", { spain: t("¿Has cocinado | tú?", "Have you cooked | you?", "Did you cook all this?") }) },
        { id: "cm_recipe", s: t("¿Me | das | la | receta?", "(To) me | you-give | the | recipe?", "Can I have the recipe?") },
      ],
    },
    table: {
      lt: "Ask them to pass something", slot: "pass", examples: ["salt", "tortillas", "salsa", "lime"],
      items: [
        { id: "ps_pasas", s: t("¿Me | pasas | {X}?", "(To) me | you-pass | {X}?", "Could you pass {X}?") },
        { id: "ps_podrias", s: t("¿Me | podrías | pasar | {X}, | por favor?", "(To) me | could-you | pass | {X}, | please?", "Could you pass {X}, please?") },
      ],
    },
    more: {
      lt: "Say if you'd like more",
      items: [
        { id: "mo_little", s: t("Sí, | un | poquito, | gracias.", "Yes, | a | little bit, | thanks.", "Yes, just a little, thanks.") },
        { id: "mo_full", s: t("No, | gracias, | estoy | {m:lleno|f:llena}.", "No, | thanks, | I-am | full.", "No thanks, I'm full.") },
        { id: "mo_love", s: t("¡Sí, | me encantaría!", "Yes, | I'd love to!", "Yes, I'd love some!") },
        { id: "mo_cant", s: t("¡Ya | no puedo | más!", "Already | I-can't | more!", "I couldn't eat another bite!", { flags: { 0: "ya no: “not anymore”." } }) },
      ],
    },
    dessert: {
      lt: "Answer about dessert",
      items: [
        { id: "mo_small", s: t("Un | pedacito, | por favor.", "A | little piece, | please.", "Just a small piece, please.", { spain: t("Un | trocito, | por favor.", "A | little piece, | please.", "Just a small piece, please.") }) },
        { id: "mo_love", s: t("¡Sí, | me encantaría!", "Yes, | I'd love to!", "Yes, I'd love some!") },
        { id: "mo_full", s: t("No, | gracias, | estoy | {m:lleno|f:llena}.", "No, | thanks, | I-am | full.", "No thanks, I'm full.") },
      ],
    },
    salad_yes: {
      lt: "Say you'll help",
      items: [
        { id: "ag_sure", s: t("¡Claro!", "Sure!", "Sure!") },
        { id: "ag_happy", s: t("¡Con gusto!", "With pleasure!", "Happy to!", { spain: t("¡Claro que sí!", "Of course!", "Happy to!") }) },
        { id: "ag_where", s: t("Sí, | ¿dónde | la | pongo?", "Yes, | where | it | I-put?", "Sure, where should I put it?", { flags: { 2: "la here is a pronoun: it (el agua, a feminine noun)." } }) },
      ],
    },
    pass_bread: {
      lt: "Pass the tortillas",
      items: [
        { id: "ps_here", s: t("¡Claro, | aquí tienes!", "Sure, | here you go!", "Sure, here you go!") },
        { id: "ps_toma", s: t("¡Toma!", "Here!", "Here you go!"), note: "Toma (take it) is how friends hand something over." },
      ],
    },
    burnt: {
      lt: "Reassure your host",
      items: [
        { id: "tw_dont_worry", s: t("¡No te preocupes, | está | rico!", "Don't worry, | it-is | tasty!", "Don't worry, it's still good!") },
        { id: "tw_no_pasa", s: t("¡No pasa nada!", "No worries!", "It's no big deal!") },
      ],
    },
    diet: {
      lt: "Say if there's anything you don't eat",
      items: [
        { id: "dt_all", s: t("No, | como | de | todo.", "No, | I-eat | of | everything.", "No, I eat everything.", { flags: { 2: "de todo: “a bit of everything”." } }) },
        { id: "dt_veg", s: t("Soy | {m:vegetariano|f:vegetariana}.", "I-am | vegetarian.", "I'm vegetarian.") },
        { id: "dt_allergic", s: t("Soy | {m:alérgico|f:alérgica} | a | los | mariscos.", "I-am | allergic | to | — | shellfish.", "I'm allergic to shellfish.", { flags: { 3: ART_GEN } }) },
      ],
    },
    cat: {
      lt: "Say if you're allergic to cats",
      items: [
        { id: "ct_love", s: t("¡Me encantan | los | gatos!", "I love | — | cats!", "I love cats!", { flags: { 1: ART_GEN } }) },
        { id: "ct_not_at_all", s: t("No, | para nada.", "No, | not at all.", "No, not at all.") },
        { id: "ct_allergic", s: t("Soy | un | poco | {m:alérgico|f:alérgica}, | la verdad.", "I-am | a | little | allergic, | honestly.", "I'm a little allergic, actually.") },
      ],
    },
    cat_lock: {
      lt: "Say if Michi should go to the bedroom",
      items: [
        { id: "yn_yes_please", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "ct_no_fine", s: t("No, | está bien | así.", "No, | it's fine | like this.", "No, she's fine.") },
      ],
    },
    stay: {
      lt: "Stay a little, or say no politely",
      items: [
        { id: "lv_work", s: t("Me encantaría, | pero | mañana | trabajo.", "I'd love to, | but | tomorrow | I-work.", "I'd love to, but I have work tomorrow.") },
        { id: "lv_really", s: t("De verdad | me tengo que ir.", "Really | I have to go.", "I really have to go.") },
        { id: "st_ok", s: t("¡Bueno, | otro | ratito!", "Okay, | another | little while!", "Okay, just a little longer!", { spain: t("¡Vale, | un | ratito | más!", "Okay, | a | little while | more!", "Okay, just a little longer!") }) },
      ],
    },
    leave: {
      lt: "Say it's time to go",
      items: [
        { id: "lv_late", s: t("Ya | me voy, | que | es | tarde.", "Now | I'm-going, | since | it's | late.", "I should get going, it's late.", { flags: { 2: "que here: “since”, “because”." } }) },
        { id: "lv_should", s: t("Ya | me tengo que ir.", "Now | I have to go.", "I have to go now.") },
        { id: "lv_yendo", s: t("Ya | me voy yendo.", "Now | I'll-get-going.", "I'd better get going."), note: "Very Mexican: a soft way to start leaving." },
        { id: "lv_work_tmrw", s: t("Mañana | trabajo | temprano.", "Tomorrow | I-work | early.", "I have work early tomorrow.") },
      ],
    },
    goodbye: {
      lt: "Say thanks and good night",
      items: [
        { id: "gb_everything", s: t("¡Gracias | por | todo!", "Thanks | for | everything!", "Thanks for everything!") },
        { id: "gb_dinner", s: t("Gracias | por | la | cena, | ¡estuvo | deliciosa!", "Thanks | for | — | dinner, | it-was | delicious!", "Thanks for dinner, it was delicious!", { flags: { 2: ART_GEN }, spain: t("Gracias | por | la | cena, | ¡estaba | buenísima!", "Thanks | for | the | dinner, | it was | delicious!", "Thanks for dinner, it was delicious!") }) },
        { id: "gb_great", s: t("¡La pasé | muy | bien!", "I-had-a-time | very | good!", "I had a great time!", { spain: t("¡Me lo he pasado | muy | bien!", "I-had-a-time | very | good!", "I had a great time!") }) },
        { id: "gb_text", s: t("Les | aviso | cuando | llegue.", "(To) you all | I'll-let-know | when | I-arrive.", "I'll text you when I get home.", { spain: t("Os | aviso | cuando | llegue.", "(To) you (all) | I'll let know | when | I arrive.", "I'll text you when I get home.") }), note: "Mexican hosts like to know you got home safe." },
        { id: "gb_night", s: t("¡Buenas noches!", "Good night!", "Good night!") },
      ],
    },
  },

  tips: {
    weak_praise: { key: "weak_praise", lt: "Understood! “Está bien” sounds a bit cool for a friend's cooking: “¡Está riquísima!” makes the cook happy.", better: "¡Está riquísima!" },
  },

  merges: {
    // Spain's twins (12 Nov 2026)
    "hayas venido": { reason: "grammatical_fusion", split: "hayas → you have (subjunctive) + venido (participle): qué bien que hayas venido = so glad you've come; one English verb phrase.", minimal: "Auxiliary and participle." },
    "qué alegría": { reason: "lexical_expression", split: "qué → what + alegría → joy: an exclamation = how lovely, so glad.", minimal: "Two words." },
    "haya gustado": { reason: "grammatical_fusion", split: "haya → has (subjunctive) + gustado (participle): que te haya gustado = that you liked it; one English verb phrase.", minimal: "Auxiliary and participle." },
    "no tenías que haberte molestado": { reason: "lexical_expression", split: "no → not + tenías → you had + que → to + haberte → have yourself + molestado → bothered: a fixed thank-you = you shouldn't have.", minimal: "The phrase." },
    "has traído": { reason: "grammatical_fusion", split: "has → you have + traído (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "has venido": { reason: "grammatical_fusion", split: "has → you have + venido (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "has llegado": { reason: "grammatical_fusion", split: "has → you have + llegado (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "se me ha olvidado": { reason: "grammatical_fusion", split: "se → itself + me → on me + ha → has + olvidado → forgotten: = I've forgotten; one English verb phrase.", minimal: "Pronouns, auxiliary and participle." },
    "he hecho": { reason: "grammatical_fusion", split: "he → have + hecho (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "menos mal": { reason: "lexical_expression", split: "menos → less + mal → bad is a fixed phrase = thank goodness.", minimal: "Two words." },
    "te apetece": { reason: "grammatical_fusion", split: "te → to you + apetece → appeals: si te apetece algo = if you feel like something (Spain); one English verb.", minimal: "Pronoun and verb." },
    "que aproveche": { reason: "lexical_expression", split: "que → may + aproveche → it do good: Spain's wish at a meal = enjoy your meal.", minimal: "Two words." },
    "se me ha ido la mano": { reason: "lexical_expression", split: "se me ha ido la mano → my hand has got away from me: = I've overdone it (with salt, spice).", minimal: "The idiom." },
    "se me ha quemado": { reason: "grammatical_fusion", split: "se → itself + me → on me + ha → has + quemado → burned: = I've burned (it by accident); one English verb phrase.", minimal: "Pronouns, auxiliary and participle." },
    "lo sé": { reason: "grammatical_fusion", split: "lo → it + sé → I know: ya lo sé = I know; English drops the object.", minimal: "Pronoun and verb." },
    "ha encantado": { reason: "grammatical_fusion", split: "ha → has + encantado (participle): nos ha encantado = we've loved it; one English verb phrase.", minimal: "Auxiliary and participle." },
    "he traído": { reason: "grammatical_fusion", split: "he → have + traído (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "has cocinado": { reason: "grammatical_fusion", split: "has → you have + cocinado (participle): Spain's present perfect; one English verb phrase.", minimal: "Auxiliary and participle." },
    "me lo he pasado": { reason: "grammatical_fusion", split: "me → myself + lo → it + he → have + pasado → spent: pasárselo bien = to have a good time (Spain); one English verb phrase.", minimal: "Pronouns, auxiliary and participle." },
    "estás en tu casa": { reason: "lexical_expression", split: "estás → you are + en → in + tu → your + casa → home; the welcome = make yourself at home.", minimal: "The whole formula." },
    "al fondo": { reason: "lexical_expression", split: "al → to the + fondo → bottom; = at the back, down the hall.", minimal: "Two words." },
    "al contrario": { reason: "lexical_expression", split: "al → to the + contrario → contrary; the reply = on the contrary, thank YOU.", minimal: "Two words." },
    "qué gusto": { reason: "lexical_expression", split: "qué → what + gusto → taste is false; = what a pleasure.", minimal: "Two words." },
    "no te hubieras molestado": { reason: "lexical_expression", split: "no → not + te hubieras molestado → you had bothered yourself; the courtesy = you shouldn't have.", minimal: "The whole formula." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "a tiempo": { reason: "lexical_expression", split: "a → at + tiempo → time; = on time.", minimal: "Two words." },
    "se me olvidó": { reason: "grammatical_fusion", split: "se → itself + me → to me + olvidó → forgot; the accidental se = I forgot.", minimal: "Three words." },
    "agua de jamaica": { reason: "lexical_expression", split: "agua → water + de → of + jamaica → hibiscus; the drink = hibiscus water.", minimal: "Three words." },
    "se te antoja": { reason: "grammatical_fusion", split: "se → itself + te → to you + antoja → craves; = you feel like (having).", minimal: "Three words." },
    "le encantan": { reason: "grammatical_fusion", split: "le → to her + encantan → delight; = she loves.", minimal: "Two words." },
    "nada de eso": { reason: "lexical_expression", split: "nada → nothing + de → of + eso → that; the refusal = none of that.", minimal: "Three words." },
    "cochinita pibil": { reason: "lexical_expression", split: "cochinita → little pig + pibil → (Maya) cooked in a pit; the dish's name.", minimal: "Two words." },
    "naranja agria": { reason: "lexical_expression", split: "naranja → orange + agria → sour; the fruit = sour (Seville) orange.", minimal: "Two words." },
    "hoja de plátano": { reason: "lexical_expression", split: "hoja → leaf + de → of + plátano → banana; = banana leaf (the wrapping).", minimal: "Three words." },
    "acabamos de": { reason: "grammatical_fusion", split: "acabamos → we finish + de → of is false; acabar de + verb = to have just done.", minimal: "Two words." },
    "a cenar": { reason: "lexical_expression", split: "a → to + cenar → have dinner; the call to the table = dinner time.", minimal: "Two words." },
    "te guste": { reason: "grammatical_fusion", split: "te → to you + guste → it pleases; = you like it.", minimal: "Two words." },
    "se me pasó": { reason: "grammatical_fusion", split: "se → itself + me → to me + pasó → passed; = I overdid (it).", minimal: "Three words." },
    "te la": { reason: "grammatical_fusion", split: "te → to you + la → it; two object pronouns glossed together.", minimal: "Two words." },
    "se me quemó": { reason: "grammatical_fusion", split: "se → itself + me → to me + quemó → burned; the accidental se = I burned (it).", minimal: "Three words." },
    "te vas": { reason: "grammatical_fusion", split: "te → yourself + vas → you go; irse = leave.", minimal: "Two words." },
    "te quedas": { reason: "grammatical_fusion", split: "te → yourself + quedas → you remain; quedarse = stay.", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now; = for now.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; the hedge = honestly, actually.", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth; = really.", minimal: "Two words." },
    "me tengo que ir": { reason: "grammatical_fusion", split: "me → myself + tengo → I have + que → that + ir → go; irse with the obligation = I have to go.", minimal: "The verb phrase." },
    "me voy": { reason: "grammatical_fusion", split: "me → myself + voy → I go; irse = leave.", minimal: "Two words." },
    "me voy yendo": { reason: "lexical_expression", split: "me voy → I leave + yendo → going; the soft goodbye = I'd better get going.", minimal: "Three words." },
    "la pasé": { reason: "grammatical_fusion", split: "la → it + pasé → I spent; pasarla (bien) = to have a (good) time.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Thank them for inviting you", done: (c) => !!c.s.thanked },
    { lt: "Give your gift", optional: true, when: (c) => (!c.s.dinnerSaid || !!c.s.gift) && !c.s.goalMet && !c.s.noGiftSaid, done: (c) => !!c.s.gift },
    // shown from the start; if the guest leaves before choosing, the item simply drops out
    { step: "drink", lt: "Choose a drink", optional: true, when: (c) => !c.s.goalMet },
    { lt: "Praise the food", done: (c) => !!c.s.foodPraised },
    { lt: "Say it's time to go", done: (c) => !!c.s.leaving },
  ],
  steps: [
    { id: "arrive", done: (c) => !!c.s.greeted,
      ask: (c) => { if (c.s.skipAsk) { c.s.skipAsk = false; return; } dan(c, "door_dan"); },
      expects: ["thanks_invite", "gift", "late_sorry", "greet_back", "no_gift"],
      suggest: [{ lt: "Say hello and thank them for inviting you", hint: "door" }, { lt: "Give your gift", hint: "gift", options: "gift" }] },
    { id: "coat", done: (c) => !!c.s.coatSaid,
      ask: (c) => { c.s.coatSaid = true; dan(c, "coat"); },
      expects: ["gift", "thanks_invite", "praise_home"],
      suggest: [{ lt: "Say thanks", hint: "coat" }, { lt: "Give your gift", hint: "gift", options: "gift" }] },
    { id: "diet", when: (c) => !!c.s.dietTwist, done: (c) => !!c.s.diet || asked(c, "diet") >= 2,
      ask: (c) => { bump(c, "diet"); if (asked(c, "diet") > 1) { dan(c, "diet_reask"); return; } c.twist("diet"); dan(c, "ask_diet"); },
      expects: ["diet_ok_ctx", "diet_veg_ctx", "diet_allergy_ctx"],
      suggest: [{ lt: "Say if there's anything you don't eat", hint: "diet" }],
      no: (c) => { c.s.diet = "all"; dan(c, "diet_great"); } },
    { id: "drink", done: (c) => !!c.s.drink || asked(c, "drink") >= 2,
      ask: (c) => { bump(c, "drink"); dan(c, c.s.listed ? "what_can_i_get" : "ask_drink"); },
      expects: ["drink_ans", "no_drink", "ask_drinks", "drink_neg"],
      suggest: [{ lt: "Choose a drink", hint: "drinks", options: "drink" }],
      yes: (c) => { c.s.listed = true; dan(c, "drink_list"); }, no: (c) => { c.s.drink = "none"; dan(c, "just_say"); } },
    { id: "cat", when: (c) => !!c.s.catTwist, done: (c) => !!c.s.cat || asked(c, "cat") >= 2,
      ask: (c) => { bump(c, "cat"); if (asked(c, "cat") > 1) { dan(c, "cat_reask"); return; } c.twist("cat"); dan(c, "cat_intro"); },
      expects: ["cat_ok_ctx", "cat_allergic_ctx", "cat_dislike_ctx"],
      suggest: [{ lt: "Say if you're allergic to cats", hint: "cat" }],
      yes: (c) => { c.s.cat = "allergic"; dan(c, "cat_away"); }, no: (c) => { c.s.cat = "ok"; dan(c, "cat_good"); } },
    { id: "salad", when: (c) => !!c.s.saladAsked, done: (c) => !!c.s.saladDone || asked(c, "salad") >= 2,
      ask: (c) => { bump(c, "salad"); nora(c, asked(c, "salad") > 1 ? "salad_reask" : "salad_task"); },
      expects: ["here_you_go", "agree", "done_ctx"],
      suggest: [{ lt: "Say you'll help", hint: "salad_yes" }],
      yes: (c) => { c.s.saladDone = true; nora(c, "star"); }, no: (c) => { c.s.saladDone = true; nora(c, "relax"); } },
    { id: "ready_soon", done: (c) => !!c.s.readySaid,
      ask: (c) => { c.s.readySaid = true; nora(c, "almost_ready"); },
      expects: ["offer_help", "praise_home", "praise_smell"],
      suggest: [{ lt: "Offer to help", hint: "help" }, { lt: "Compliment the home or the smell", hint: "compliments" }] },
    { id: "dinner", done: (c) => !!c.s.dinnerSaid,
      ask: (c) => { c.s.dinnerSaid = true; dan(c, "dinner_ready"); },
      expects: ["praise_food", "praise_smell", "pass", "provecho"],
      suggest: [{ lt: "Praise the food", hint: "food" }, { lt: "Ask them to pass something", hint: "table", options: "pass" }] },
    { id: "pass", when: (c) => !!c.s.passTwist, done: (c) => !!c.s.passDone || asked(c, "pass") >= 2,
      ask: (c) => { bump(c, "pass"); if (asked(c, "pass") > 1) { dan(c, "pass_reask"); return; } c.twist("pass_bread"); dan(c, "ask_pass"); },
      expects: ["here_you_go"],
      suggest: [{ lt: "Pass the tortillas", hint: "pass_bread" }],
      yes: (c) => { c.s.passDone = true; dan(c, "thanks_pass"); } },
    { id: "burnt", when: (c) => !!c.s.burntTwist, done: (c) => !!c.s.burntSaid,
      ask: (c) => { c.s.burntSaid = true; c.twist("burnt_bread"); nora(c, "burnt"); },
      expects: ["reassure"],
      suggest: [{ lt: "Reassure your host", hint: "burnt" }] },
    // asked again after a side question, at most three times in all (once to a guest who eats no meat: their one
    // question has no second wording); a "no" or "más o menos" answers it (badFood)
    { id: "howisit", when: (c) => !c.s.foodPraised,
      done: (c) => !!c.s.foodPraised || !!c.s.badSaid || asked(c, "howisit") >= (c.s.diet === "veg" ? 1 : 3),
      ask: (c) => { bump(c, "howisit"); c.speaker(c.chance(0.5) ? "nora" : "dan"); howIsIt(c); },
      expects: ["praise_food", "food_meh", "made_yourself", "recipe"],
      suggest: [{ lt: "Praise the food", hint: "food" }],
      yes: (c) => { c.s.foodPraised = true; nora(c, "glad_you_like"); checkGoal(c); }, no: (c) => badFood(c) },
    { id: "seconds", when: (c) => !!c.s.askSeconds, done: (c) => c.s.seconds !== undefined || asked(c, "seconds") >= 2,
      ask: (c) => { bump(c, "seconds"); nora(c, c.s.secondsAsked ? "seconds_reask" : "ask_seconds"); c.s.secondsAsked = true; },
      expects: ["more_yes", "more_no"],
      suggest: [{ lt: "Say if you'd like more", hint: "more" }],
      yes: (c) => { c.s.seconds = "yes"; nora(c, "here_more"); }, no: (c) => { c.s.seconds = "no"; saveRoom(c); } },
    { id: "dessert", when: (c) => !!c.s.askDessert, done: (c) => c.s.dessert !== undefined || asked(c, "dessert") >= 2,
      ask: (c) => { bump(c, "dessert"); nora(c, c.s.dessertAsked ? "dessert_reask" : "ask_dessert"); c.s.dessertAsked = true; },
      expects: ["more_yes", "more_no"],
      suggest: [{ lt: "Answer about dessert", hint: "dessert" }],
      yes: (c) => { c.s.dessert = "yes"; nora(c, "here_cake"); }, no: (c) => { c.s.dessert = "no"; nora(c, "more_for_dan"); } },
    { id: "late", when: (c) => !c.s.leaving, done: (c) => !!c.s.lateSaid,
      ask: (c) => { c.s.lateSaid = true; dan(c, "late"); },
      expects: ["leave", "thanks_end", "time_flies"],
      suggest: [{ lt: "Say it's time to go", hint: "leave" }, { lt: "Thank them for the evening", hint: "goodbye" }] },
    { id: "leave", when: (c) => !c.s.leaving, done: (c) => !!c.s.leaving,
      // once the coffee is settled (served or declined), no new offer: the hints show how to say goodbye
      ask: (c) => { bump(c, "leave"); if (c.s.coffeeSettled) return; dan(c, c.s.stayed ? "more_coffee" : "anything_else"); },
      expects: ["leave", "thanks_end", "no_drink", "drink_ans"],
      suggest: [{ lt: "Say it's time to go", hint: "leave" }, { lt: "Thank them for the evening", hint: "goodbye" }],
      yes: (c) => { c.s.coffee = "coffee"; c.s.coffeeSettled = true; dan(c, "drink_ok"); },
      // "No, gracias" to another coffee after the sobremesa is the goodbye; the first one just declines it
      no: (c) => { c.s.coffeeSettled = true; if (c.s.stayed || asked(c, "leave") >= 2) { H.leave(c, {}, seg0("leave")); return; } nora(c, "chat_then"); } },
  ],

  init: (c) => {
    c.s.askSeconds = c.chance(0.7);
    c.s.askDessert = c.chance(0.6);
    c.s.saladTask = c.chance(0.4);
    c.s.catTwist = c.chance(0.3);
    c.s.passTwist = c.visits >= 1 && c.chance(0.45);
    c.s.burntTwist = c.visits >= 1 && c.chance(0.35);
    c.s.stayTwist = c.visits >= 1 && c.chance(0.45);
    c.s.dietTwist = c.visits >= 2 && c.chance(0.4);
  },

  start: (c) => {
    dan(c, "door_dan");
    nora(c, "door_nora");
    c.s.skipAsk = true;
  },

  handlers: H,

  finish: (c) => {
    // Every step is done only once the guest is leaving; the closing pending ends the visit.
    if (!c.s.leaving) letGo(c);
  },

  tests: [
    // at the door
    { say: "¡Hola! ¡Gracias por invitarme!", intent: "thanks_invite", step: "arrive" },
    { say: "Muchas gracias por la invitación", intent: "thanks_invite", step: "arrive" },
    { say: "¡Qué gusto verlos!", intent: "greet_back", step: "arrive", not: ["thanks_invite"] },
    { say: "Perdón por llegar tarde", intent: "late_sorry", step: "arrive" },
    { say: "Esto es para ustedes", intent: "gift", step: "coat" },
    { say: "Les traje unas flores", intent: "gift", step: "coat", slots: { gift: "flowers" } },
    { say: "Les traje un vino", intent: "gift", slots: { gift: "wine" } },
    { say: "Es un detallito para ustedes", intent: "gift" },
    { say: "Te traje un pastel de tres leches", intent: "gift", slots: { gift: "cake" } },
    { say: "Perdón, no traje nada", intent: "no_gift", step: "arrive", not: ["gift"] },
    // drinks
    { say: "Agua de jamaica, por favor", intent: "drink_ans", step: "drink", slots: { drink: "jamaica" } },
    { say: "Quiero una cerveza, gracias", intent: "drink_ans", step: "drink", slots: { drink: "beer" } },
    { say: "Una chela bien fría", intent: "drink_ans", step: "drink", slots: { drink: "beer" } },
    { say: "Solo agua, gracias", intent: "drink_ans", step: "drink", slots: { drink: "water" } },
    { say: "Un vino tinto estaría muy bien", intent: "drink_ans", step: "drink", slots: { drink: "red_wine" } },
    { say: "Voy manejando, solo un refresco", intent: "drink_ans", step: "drink", slots: { drink: "soda" } },
    { say: "Estoy bien por ahora, gracias", intent: "no_drink", step: "drink", not: ["drink_ans"] },
    { say: "¿Qué tienen?", intent: "ask_drinks", step: "drink" },
    { say: "No tomo alcohol", intent: "ask_drinks", step: "drink", not: ["drink_ans"] },
    { say: "No quiero cerveza", intent: "drink_neg", step: "drink", not: ["drink_ans"] },
    { say: "No, cerveza no, mejor agua de jamaica", intent: "drink_ans", step: "drink", slots: { drink: "jamaica" } },
    // around the house
    { say: "¿Les ayudo en algo?", intent: "offer_help", step: "ready_soon" },
    { say: "¿Te ayudo?", intent: "offer_help" },
    { say: "¿Pongo la mesa?", intent: "offer_help" },
    { say: "¿Qué puedo hacer?", intent: "offer_help", step: "ready_soon" },
    { say: "¡Qué rico huele!", intent: "praise_smell" },
    { say: "¡Qué bonita casa!", intent: "praise_home" },
    { say: "Me encantan los cuadros", intent: "praise_home" },
    { say: "No necesito ayuda", intent: "none", not: ["offer_help"] },
    { say: "No me gustan los cuadros", intent: "none", not: ["praise_home"] },
    // at the table
    { say: "¡Está riquísima!", intent: "praise_food", step: "howisit" },
    { say: "¡Mmm, qué rico!", intent: "praise_food", step: "howisit" },
    { say: "¡Cocinas muy bien!", intent: "praise_food" },
    { say: "Nunca he comido algo tan rico", intent: "praise_food", step: "howisit" },
    { say: "Está bien", intent: "praise_food", step: "howisit", not: ["food_meh"] },
    { say: "Bueno", intent: "g_ok", step: "howisit", not: ["praise_food"] },
    { say: "¿Tú hiciste el flan?", intent: "made_yourself", step: "dessert", not: ["more_yes"] },
    { say: "No quiero postre", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "Bueno, otro taquito", intent: "more_yes", step: "seconds", not: ["praise_food", "more_no"] },
    { say: "No pica", intent: "praise_food", step: "howisit", not: ["food_meh"] },
    { say: "¿Esto pica?", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "No me gusta el picante", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "Ya no, estoy a dieta", intent: "more_no", step: "seconds", not: ["more_yes"] },
    { say: "¿Ya es tan tarde?", intent: "time_flies", step: "late", not: ["leave", "here_you_go"] },
    { say: "Mañana no trabajo", intent: "none", step: "late", not: ["leave"] },
    { say: "No me puedo quedar, perdón", intent: "no_sorry", not: ["stay"] },
    { say: "¡Salud!", intent: "cheers" },
    { say: "¿Dónde está el baño?", intent: "restroom" },
    { say: "¿Les echo la mano?", intent: "offer_help" },
    { say: "Pica un poco", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "Está rica, pero pica mucho", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "No está rica", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "No me gusta mucho", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "¿Tú cocinaste?", intent: "made_yourself" },
    { say: "¿Me das la receta?", intent: "recipe" },
    { say: "¿Me pasas la sal?", intent: "pass", step: "dinner", slots: { pass: "salt" } },
    { say: "¿Me podrías pasar las tortillas, por favor?", intent: "pass", slots: { pass: "tortillas" } },
    { say: "Pásame el limón, porfa", intent: "pass", slots: { pass: "lime" } },
    { say: "No necesito sal", intent: "none", not: ["pass"] },
    { say: "¡Buen provecho!", intent: "provecho", step: "dinner" },
    { say: "Gracias, igualmente", intent: "provecho", step: "dinner", not: ["g_bye", "leave"] },
    { say: "¡Claro, aquí tienes!", intent: "here_you_go", step: "pass" },
    { say: "Toma", intent: "here_you_go", step: "pass" },
    { say: "Tomo una tortilla", intent: "none", step: "pass", not: ["here_you_go"] },
    { say: "¡No te preocupes, está rico!", intent: "reassure", step: "burnt" },
    { say: "No pasa nada", intent: "reassure", step: "burnt" },
    // seconds and dessert
    { say: "Sí, un poquito, gracias", intent: "more_yes", step: "seconds" },
    { say: "No, gracias, estoy llena", intent: "more_no", step: "seconds", not: ["more_yes"] },
    { say: "¡Ya no puedo más!", intent: "more_no", step: "seconds", not: ["more_yes"] },
    { say: "Todavía no estoy lleno", intent: "more_yes", step: "seconds", not: ["more_no"] },
    { say: "Estoy bien, gracias", intent: "more_no", step: "seconds", not: ["g_howareyou_answer"] },
    { say: "Un pedacito, por favor", intent: "more_yes", step: "dessert" },
    { say: "No gracias, no como dulce", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "Para el postre siempre hay lugar", intent: "more_yes", step: "dessert" },
    { say: "Sí, por favor", intent: "yn:yes", step: "seconds", not: ["more_no"] },
    // leaving
    { say: "Ya me voy, que es tarde", intent: "leave", step: "late" },
    { say: "Ya me voy yendo", intent: "leave", step: "late" },
    { say: "Mañana trabajo temprano", intent: "leave", step: "late" },
    { say: "Se me hizo tarde", intent: "leave", step: "leave" },
    { say: "¡Qué rápido se pasa el tiempo!", intent: "time_flies", step: "late" },
    { say: "¡Gracias por todo!", intent: "thanks_end", step: "late" },
    { say: "Gracias por la cena, ¡estuvo deliciosa!", intent: "thanks_end" },
    { say: "¡La pasé muy bien!", intent: "thanks_end" },
    { say: "Les aviso cuando llegue", intent: "will_text" },
    { say: "No me quiero ir", intent: "none", step: "late", not: ["leave", "g_bye"] },
    { say: "Todavía no me voy", intent: "none", step: "late", not: ["leave", "g_bye"] },
    // twists
    { say: "No, como de todo", intent: "diet_ok_ctx", step: "diet" },
    { say: "Soy vegetariana", intent: "diet_veg_ctx", step: "diet" },
    { say: "No como cerdo, pero todo lo demás está bien", intent: "diet_veg_ctx", step: "diet", not: ["diet_ok_ctx"] },
    { say: "Soy alérgico a los mariscos", intent: "diet_allergy_ctx", step: "diet" },
    { say: "¡Me encantan los gatos!", intent: "cat_ok_ctx", step: "cat", not: ["cat_allergic_ctx"] },
    { say: "No me gustan los gatos", intent: "cat_dislike_ctx", step: "cat", not: ["cat_ok_ctx"] },
    { say: "No soy alérgica", intent: "cat_ok_ctx", step: "cat", not: ["cat_allergic_ctx"] },
    { say: "Sí, un poco, la verdad", intent: "cat_allergic_ctx", step: "cat" },
    // Spain forms are right answers too: vosotros, zumo, vale
    { say: "Os he traído unos bombones", intent: "gift", slots: { gift: "chocolates" } },
    { say: "¿Queréis que os ayude?", intent: "offer_help" },
    { say: "Un zumo de naranja", intent: "drink_ans", step: "drink", slots: { drink: "juice" } },
    { say: "Vale, un poquito", intent: "more_yes", step: "seconds" },
    // usted to a friend is understood too
    { say: "¿Me da la pimienta?", intent: "pass", slots: { pass: "pepper" } },
    // reviewer's traps (blind set and probes)
    { say: "Se me hizo tarde, perdón", intent: "late_sorry", step: "arrive", not: ["leave"] },
    { say: "Perdón por llegar tarde, había mucho tráfico", intent: "late_sorry", step: "arrive" },
    { say: "Cerveza no, gracias", intent: "drink_neg", step: "drink", not: ["drink_ans"] },
    { say: "No, estoy lleno", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "No estoy llena", intent: "more_no", step: "seconds", not: ["more_yes"] },
    { say: "Postre no, gracias, estoy llena", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "Me encantaría, pero ya no puedo", intent: "more_no", step: "dessert", not: ["more_yes", "thanks_end"] },
    { say: "No está nada picante, está muy rico", intent: "praise_food", step: "howisit", not: ["food_meh"] },
    { say: "No me quiero ir, pero ya es tarde", intent: "leave", step: "late", not: ["stay"] },
    { say: "No, no soy alérgica", intent: "cat_ok_ctx", step: "cat", not: ["cat_allergic_ctx"] },
    { say: "No traje nada, perdón", intent: "no_gift", step: "arrive", not: ["gift"] },
    // audit (5 Nov 2026): who cooked, what's in it, more at the table, the room
    { say: "¿Quién cocinó?", intent: "made_yourself", step: "howisit" },
    { say: "¿Quién hizo el flan?", intent: "made_yourself", step: "dessert", not: ["more_yes"] },
    { say: "¿Qué lleva?", intent: "recipe", step: "howisit" },
    { say: "¿Qué es la cochinita pibil?", intent: "recipe", step: "howisit" },
    { say: "¿Qué lleva la salsa?", intent: "recipe", step: "howisit", not: ["food_meh"] },
    { say: "¿Me das otra cerveza?", intent: "drink_ans", step: "dinner", slots: { drink: "beer" } },
    { say: "No quiero otra cerveza", intent: "none", step: "dinner", not: ["drink_ans"] },
    { say: "¿Me sirves más cochinita?", intent: "more_yes", step: "howisit", not: ["pass"] },
    { say: "¿Me sirves más arroz?", intent: "pass", step: "howisit", slots: { pass: "rice" }, not: ["more_yes"] },
    { say: "No me sirvas más", intent: "none", step: "dinner", not: ["more_yes"] },
    { say: "¿Les ayudo a recoger la mesa?", intent: "offer_help", step: "late" },
    { say: "¡Qué bonita hamaca!", intent: "praise_home" },
    { say: "No me gusta la hamaca", intent: "none", not: ["praise_home"] },
    { say: "No como pescado", intent: "diet_veg_ctx", step: "diet", not: ["diet_ok_ctx"] },
    // not understood
    { say: "El elefante morado baila en la cocina", intent: "none" },
    { say: "Mi tía vive en Guadalajara", intent: "none" },
    { say: "tractor banana jueves", intent: "none" },
  ],

  sims: [
    // "No, me encantan los gatos" typed with its comma is a yes to cats; said without it, Diego asks whether to shut Michi in
    { name: "Michi: no, I love cats (typed comma)", setup: (s) => { PLAIN(s); s.catTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Esto es para ustedes.", "Una cerveza.", "No, me encantan los gatos.", "¡Qué rico huele!", "¡Está riquísima!",
        "Ya me voy, que es tarde.", "¡Gracias por todo!"],
      expect: { complete: true, state: { cat: "ok" } }, auto: AUTO },
    { name: "Michi: no me gustan los gatos", setup: (s) => { PLAIN(s); s.catTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Esto es para ustedes.", "Una cerveza.", "No me gustan los gatos.", "Sí, por favor.", "¡Qué rico huele!", "¡Está riquísima!",
        "Ya me voy, que es tarde.", "¡Gracias por todo!"],
      expect: { complete: true, state: { cat: "dislike" } }, auto: AUTO },
    { name: "perfect guest", setup: (s) => { PLAIN(s); },
      turns: ["¡Hola! ¡Gracias por invitarme!", "Esto es para ustedes.", "Agua de jamaica, por favor.", "¿Les ayudo en algo?", "¡Qué rico huele!",
        "¡Está riquísima!", "Ya me voy, que es tarde.", "¡Gracias por todo! ¡Buenas noches!"],
      expect: { complete: true }, auto: AUTO },
    // "No, gracias, estoy llena" answers "¿Te sirvo otro poquito?", asked on every seed here
    // "Deja lugar para el postre" brings the flan even on a visit without dessert planned
    { name: "quiet guest, short answers", setup: (s) => { PLAIN(s); s.askSeconds = true; s.askDessert = false; },
      turns: ["¡Hola!", "¡Gracias!", "Una cerveza.", "¡Qué rico!", "No, gracias, estoy llena.", "No, gracias.", "Ya es tarde.", "Gracias por la cena. ¡Adiós!"],
      expect: { complete: true, state: { seconds: "no", dessert: "no" } }, auto: { ...AUTO, ready_soon: "¡Gracias!" } },
    { name: "chatty guest", setup: (s) => { PLAIN(s); },
      turns: ["Hola Diego, hola Natalia. Les traje unos chocolates.", "¿Qué tienen?", "Una limonada, por favor.", "¡Qué bonita casa!", "¿Me pasas la sal?",
        "¡Cocinas muy bien! ¿Tú cocinaste?", "¿Me das la receta?", "Bueno, ya me voy yendo. Mañana trabajo temprano.", "¡Gracias por todo!"],
      expect: { complete: true }, auto: AUTO },
    // questions and changes of mind: a beer, no, agua de jamaica; no dessert, then a bit after all
    { name: "changes of mind", setup: (s) => { PLAIN(s); s.askSeconds = false; s.askDessert = true; },
      turns: ["Hola, perdón por llegar tarde.", "Perdón, no traje nada.", "No tomo alcohol.", "No, cerveza no, mejor agua de jamaica.", "¿Qué estás cocinando?",
        "¡Buen provecho!", "Pica un poco.", "Mmm, pero está riquísima.", "No, gracias.", "Bueno, un pedacito.", "La pasé muy bien. Ya me tengo que ir.", "Les aviso cuando llegue."],
      expect: { complete: true, state: { drink: "jamaica", willText: true } }, auto: AUTO },
    // the learner helps in the kitchen (the agua de jamaica) and says vosotros and vale
    { name: "helping out (Spain forms)", setup: (s) => { PLAIN(s); s.saladTask = true; s.askSeconds = true; s.askDessert = false; },
      turns: ["¡Hola! Os he traído unos bombones.", "Un zumo de naranja.", "¿Queréis que os ayude?", "Listo.", "¡Qué rico!",
        "Vale, un poquito.", "Se me hizo tarde.", "¡Gracias por todo!"],
      expect: { complete: true, state: { saladDone: true, seconds: "yes" } }, auto: AUTO },
    // late at the door is an apology, not a goodbye; "No, estoy llena" twice; the after-dinner coffee declined once
    { name: "late at the door, full, no coffee", setup: (s) => { PLAIN(s); s.askSeconds = true; s.askDessert = true; },
      turns: ["Se me hizo tarde, perdón.", "Gracias por invitarme.", "Cerveza no, gracias.", "Agua natural.", "¡Qué rico huele!", "No, está picante.", "Pero está muy rica.",
        "No, estoy llena.", "Postre no, gracias.", "Gracias.", "No, gracias.", "Bueno, ya me voy.", "¡Gracias por todo!"],
      expect: { complete: true, state: { lateSorry: true, drink: "water", seconds: "no", dessert: "no", coffeeSettled: true } }, auto: AUTO },
    // a yes to the after-dinner coffee is served once; "Está bien, gracias" to "¡Quédate!" gets the question again
    { name: "coffee yes, stay asked again", setup: (s) => { PLAIN(s); s.stayTwist = true; s.askSeconds = false; s.askDessert = false; },
      turns: ["¡Hola! Gracias por invitarme.", "Una limonada.", "¡Qué bonita casa!", "¡Está riquísima!", "Ya me voy, que es tarde.", "Está bien, gracias.", "Sí, un ratito.",
        "Sí, por favor.", "Ya me tengo que ir.", "¡Gracias por todo!"],
      expect: { complete: true, state: { stayed: true, coffee: "coffee", drink: "lemonade" } }, auto: AUTO },
    // Twists, forced on every seed (they happen on returning visits)
    { name: "twist: Michi the cat", setup: (s) => { PLAIN(s); s.catTwist = true; },
      turns: ["¡Hola! Gracias por la invitación.", "Les traje flores.", "Una cerveza, por favor.", "Sí, un poco, la verdad.", "¿Te ayudo?", "¡Está deliciosa!",
        "Ya me voy, que es tarde.", "¡Gracias por todo!"],
      expect: { complete: true, state: { cat: "allergic" } }, auto: AUTO },
    { name: "twist: what don't you eat", setup: (s) => { PLAIN(s); s.dietTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Les traje un vino.", "Soy vegetariana.", "Agua natural, gracias.", "¡Qué rico huele!", "¡Qué rico!",
        "Mañana trabajo temprano.", "¡Gracias por todo!"],
      expect: { complete: true, state: { diet: "veg" } }, auto: AUTO },
    { name: "twist: pass the tortillas, the rice is burned", setup: (s) => { PLAIN(s); s.passTwist = true; s.burntTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Esto es para ustedes.", "Un refresco.", "¡Qué bonita casa!", "¿Me pasas la salsa?", "¡Claro, aquí tienes!",
        "¡No te preocupes, está rico!", "¡Está buenísima!", "Ya me voy, que es tarde.", "Gracias por todo."],
      expect: { complete: true, state: { passDone: true, burntOk: true } }, auto: AUTO },
    { name: "twist: stay for the sobremesa, then go", setup: (s) => { PLAIN(s); s.stayTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Les traje pan dulce.", "Agua de jamaica.", "¿Les ayudo en algo?", "¡Está riquísima!", "Ya me voy, que es tarde.",
        "Bueno, un ratito más.", "Ahora sí, de verdad me tengo que ir.", "¡Gracias por todo! ¡Buenas noches!"],
      expect: { complete: true, state: { stayed: true } }, auto: AUTO },
    { name: "twist: stay? no, thanks", setup: (s) => { PLAIN(s); s.stayTwist = true; },
      turns: ["¡Hola! Gracias por invitarme.", "Esto es para ustedes.", "Una cerveza.", "¡Qué rico huele!", "¡Qué rico!", "Ya me tengo que ir.",
        "Me encantaría, pero mañana trabajo.", "¡Buenas noches!"],
      expect: { complete: true, state: { leaving: true } }, auto: AUTO },
    // Each host says their own side answers here (the voice line list records each line in the voice it hears):
    // Diego cooked (who cooked, what's in it, the salsa, too much salt), Natalia the flan and the house's answers.
    { name: "Diego's own answers: late, mezcal, no fish, who cooked, what's in it", setup: (s) => { PLAIN(s); s.dietTwist = true; s.askSeconds = false; s.askDessert = false; },
      turns: ["Perdón por llegar tarde.", "Les traje una botella de mezcal. ¿Qué estás cocinando?", "No como pescado.", "Agua de jamaica, por favor.",
        "¿Qué es lo que huele tan rico? ¿Quién cocinó?", "¡Salud!", "¿Qué lleva?", "¿Qué lleva la salsa?", "Está rica, pero está un poco salada.", "¿Tú hiciste el flan?",
        "Sí, un pedacito.", "¡Qué rápido se pasa el tiempo!", "Gracias por la cena, ¡estuvo deliciosa!", "No, gracias, ya me voy.", "¡Gracias por todo!"],
      expect: { complete: true, state: { lateSorry: true, gift: "mezcal", diet: "other", dessert: "yes" } }, auto: AUTO },
    { name: "Natalia's own answers: two gifts, the restroom, the pictures, spicy, who made the flan", setup: (s) => { PLAIN(s); s.saladTask = true; s.askSeconds = true; s.askDessert = true; },
      turns: ["¡Hola! Gracias por invitarme. Les traje galletas.", "Y les traje un pastel.", "Nada por ahora, gracias.", "¿Les ayudo en algo?", "¿Dónde está el baño?",
        "¡Claro! ¿Dónde la pongo?", "Me encantan los cuadros.", "¿Esto pica?", "No me gusta el picante.", "¡Pero está riquísima!", "Sí, por favor.", "¿Quién hizo el flan?",
        "Sí, por favor.", "Ya me voy, que es tarde.", "Les aviso cuando llegue."],
      expect: { complete: true, state: { gift: "cookies", saladDone: true, seconds: "yes", dessert: "yes", willText: true } }, auto: AUTO },
    // A guest who eats no meat has the rajas tacos: "¿Y? ¿Te gusta?" (never "¿Qué tal la cochinita?"), more on asking
    // ("¿Me sirves un poco más?" before Natalia offers), and flan to take home, never cochinita
    { name: "no meat: the tacos, more on asking, flan to go", setup: (s) => { PLAIN(s); s.dietTwist = true; s.askSeconds = false; s.askDessert = false; },
      turns: ["Hola, gracias por invitarme.", "Gracias.", "Soy vegetariano.", "Una limonada.", "¿Qué es esto?", "¡Salud!", "¿Me sirves un poco más?", "¡Qué rico!",
        "Ya me voy, que es tarde.", "¡Gracias por todo!"],
      expect: { complete: true, state: { diet: "veg", seconds: "yes", foodPraised: true } }, auto: AUTO },
    // "Ya me voy" as dinner is served: Natalia protests once ("¡Pero si apenas estamos cenando!"), no "sobremesa" yet
    { name: "leaving as dinner is served", setup: (s) => { PLAIN(s); s.stayTwist = true; s.askSeconds = false; s.askDessert = false; },
      turns: ["¡Hola! Gracias por invitarme.", "Una cerveza.", "¡Qué rico huele!", "Ya me voy, que es tarde.", "¡Está riquísima!", "Ya me voy, que es tarde.",
        "Bueno, un ratito más.", "Ahora sí, me tengo que ir.", "¡Gracias por todo!"],
      expect: { complete: true, state: { earlyLeave: true, stayed: true } }, auto: AUTO },
    // "Más o menos" answers "¿Te gusta?": sorry and the rice and beans once, not asked again, no seconds pressed
    { name: "so-so: answered once, no seconds pressed", setup: (s) => { PLAIN(s); s.askSeconds = true; s.askDessert = false; },
      turns: ["¡Hola! Gracias por invitarme.", "Una cerveza.", "¡Qué rico huele!", "¿Me pasas la sal?", "Más o menos.", "Gracias por la cena, ¡estuvo deliciosa!", "No, gracias.",
        "Bueno, ya me voy.", "¡Gracias por todo!"],
      expect: { complete: true, state: { badSaid: true, seconds: undefined, coffeeSettled: true } }, auto: AUTO },
  ],
};

export default dinner;
