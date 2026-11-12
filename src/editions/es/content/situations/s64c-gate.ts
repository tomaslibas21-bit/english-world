// NEEDS: None. The city lexicon, the merges and the gate words (sala / puerta) are local.
// Song 64 "Window or Aisle?" (part 3 of 3) → Puerto Colibrí: "¿Es esta la sala?".
// Daniela, the gate agent at Puerto Colibrí's little airport (usted). The learner is on flight 223 to Mexico City,
// boarding zone 3, at gate ("sala") 4. In Mexico the gate is "la sala" (also "la puerta"; both are accepted; the
// neutral twins say "la puerta", as s64a and s64b do), the boarding pass "el pase de abordar" (neutral twin: "la
// tarjeta de embarque"), carry-ons are "equipaje de mano" and a
// bag is "documentada" (checked). A Mexican gate: confirm the gate ("¿De aquí sale el vuelo a…?"), on time or
// delayed ("el vuelo viene retrasado"), the boarding time, boarding by zones, the carry-on, Wi-Fi, a coffee, the
// restrooms, outlets ("contactos", neutral "enchufes"), a seat change at the gate, then the boarding call
// ("Vuelo 223 con destino a la Ciudad de México: iniciamos el abordaje de la zona 3") and the scan of the boarding
// pass with an ID (Mexican domestic flights check an ID at the gate).
// Variation: a 20-minute delay with a reason (the plane is late from Mexico City, the crew, bad weather there);
// zone 2 is called before the learner's zone.
// Twists (visits ≥ 1): a gate change to sala 7 ("Fíjese que hubo un cambio de sala"); a full flight, so carry-ons
// are checked at the gate at no cost ("estamos documentando el equipaje de mano sin costo").
// The intent ids are the English edition's (ask_gate12 = "where's the new gate", here sala 7).
// Kept vague (1 Nov 2026): no airline name, no Wi-Fi on board (as on Mexico's low-cost airlines), the flight time
// "unas dos horas y cuarto"; the flight, gate and zone should match s64a-checkin and s64b-security.

import type { Ctx, Pending, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const AUTO: Record<string, string> = {
  gate: "¿Es esta la sala del vuelo 223 a la Ciudad de México?",
  board: "Aquí está mi pase de abordar.",
  which_flight: "El vuelo 223 a la Ciudad de México.",
  wrong_flight: "Aquí tiene mi pase de abordar.",
  time: "¿El vuelo va a tiempo?",
  help: "No, es todo. Gracias.",
  wait: "Gracias.",
  offer: "No, gracias.",
  seat_offer: "No, gracias.",
  early: "¿Ya puedo abordar? Voy en la zona 3.",
  scan: "Aquí tiene.",
};

const T = (h: number, m: number) => ({ h, m });
const TIMES = { boarding: T(7, 30), boardingLate: T(7, 50), departure: T(8, 10), departureLate: T(8, 30) };

// ---------------------------------------------------------------------------

/** c.expect() that also accepts "Sí, la ventanilla sería perfecta" / "No, me quedo en mi asiento" (affirm/deny) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

const reason = (c: Ctx) => c.say("delay_reason_" + c.s.reason);
const boardingInfo = (c: Ctx) => {
  if (!c.s.boardingTold) { c.s.boardingTold = true; c.say(c.s.delay ? "boarding_late" : "boarding_time", { time: c.s.delay ? TIMES.boardingLate : TIMES.boarding }); }
};

const QUESTIONS = ["more_no", "more_q", "ask_ontime", "ask_delayed", "ask_delay_reason", "ask_boarding_time", "ask_departure", "ask_group",
  "ask_carryon", "ask_wifi", "ask_coffee", "ask_food", "ask_restroom", "ask_charge", "ask_duration", "ask_full", "ask_seat_change", "ask_gate12", "can_board",
  "ask_my_seat", "ask_id"];
/** "Ok" / "Perfecto, gracias" to "¿Algo más?" means no more questions (but not "Ok, una pregunta"). */
const plainAck = (heard: string) => /^\s*(ok|okay|vale|sale|va|bueno|perfecto|muy bien|esta bien|claro|gracias|muchas gracias)\b/.test(fold(heard)) && !/pregunta|duda/.test(fold(heard));
/** "Gracias" / "Ok, muchas gracias" and nothing else. */
const PLAIN_THANKS = /^\s*((ok|okay|vale|sale|va|bueno|perfecto|muy bien|esta bien|ah|oh)[\s,.!]*)*(muchas |mil |muchisimas )?gracias[\s,.!]*$/;
/** "¡Ay, qué bien, gracias!" (an enthusiastic yes). */
const GREAT = /^\s*((ay|ah|oh)[\s,.!]*)?(que bien|perfecto|genial|excelente|que padre|super|maravilloso|buenisimo|me encantaria)\b/;

const QUESTION_LINES: Record<string, (c: Ctx) => void> = {
  ontime: (c) => {
    if (c.s.delay) { c.say("ontime_no"); c.say("delay"); reason(c); } else c.say("ontime");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  delay_reason: (c) => {
    if (c.s.delay) { reason(c); if (!c.s.delayTold) { c.say("delay"); c.s.delayTold = true; } } else c.say("delay_none");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  delayed: (c) => {
    // "¿Cuánto es el retraso?" is not a yes/no question: no "Sí," / "No," in front (rule 11)
    const wh = /\bcuanto\b/.test(fold(c.s.qHeard ?? c.heard));
    if (c.s.delay) { if (!wh) c.say("delayed_yes"); c.say("delay"); reason(c); } else c.say(wh ? "delay_none" : "delayed_no");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  boarding: (c) => {
    c.s.boardingTold = true;
    c.say(c.s.delay ? "boarding_late" : "boarding_time", { time: c.s.delay ? TIMES.boardingLate : TIMES.boarding });
    if (c.s.delay && !c.s.delayTold) { c.say("delay"); c.s.delayTold = true; }
    c.s.timeKnown = true;
  },
  departure: (c) => {
    c.say(c.s.delay ? "departure_late" : "departure", { time: c.s.delay ? TIMES.departureLate : TIMES.departure });
    if (c.s.delay && !c.s.delayTold) { c.say("delay"); c.s.delayTold = true; }
    c.s.timeKnown = true;
  },
};

/** Flight-specific questions need the flight first ("¿En qué vuelo viaja?"), then get answered. */
function withFlight(c: Ctx, key: string, slots: any = {}) {
  c.s.qHeard = c.heard; // the question itself, for the answer's form after "¿En qué vuelo viaja?"
  if (c.s.gateOk) { QUESTION_LINES[key](c); if (key !== "boarding" && key !== "departure") c.s.delayTold = true; return; }
  c.s.afterFlight = key;
  // "¿El vuelo 223 va a tiempo?": the flight is in the question itself, so it isn't asked for
  if (flightNumber(slots) !== undefined || slots.city) { flightGiven(c, slots); return; }
  c.say("which_flight");
  expectFlight(c);
}

function expectFlight(c: Ctx) {
  ask(c, {
    id: "which_flight", expects: ["flight_info_ctx", "ask_gate", "give_bp", "give_bp_ctx", "flight_dunno_ctx"], hints: ["flight"],
    suggest: [{ lt: "Say your flight (223 to Mexico City)", hint: "flight" }],
    on: {
      // "Un momento", "Una pregunta": the article, not flight 1 (the wait or the question is answered on its own)
      flight_info_ctx: (cc, sl) => { if (articleOne(cc, sl)) { expectFlight(cc); return; } flightGiven(cc, sl); },
      ask_gate: (cc, sl) => { flightGiven(cc, sl); },
      give_bp: (cc) => { cc.say("bp_thanks"); confirmGate(cc); },
      give_bp_ctx: (cc) => { cc.say("bp_thanks"); confirmGate(cc); },
      g_dontknow: (cc) => { cc.say("flight_help"); expectFlight(cc); },
      flight_dunno_ctx: (cc) => { cc.say("flight_help"); expectFlight(cc); },
      // the learner looks for the pass, or has a question first: the flight question stays open
      g_wait: (cc) => { cc.say("g_take_time"); expectFlight(cc); },
      more_q: (cc) => { cc.say("what_q"); expectFlight(cc); },
    },
    ask: (cc) => cc.say("which_flight"),
  });
}

function flightNumber(slots: any): number | undefined {
  if (typeof slots.number === "number") return slots.number;
  if (slots.f) return 223;
  return undefined;
}

/** "Un momento", "Un segundo", "Una pregunta": "un" / "una" read as the number 1 is the article, never a flight (rule 4). */
const articleOne = (c: Ctx, slots: any) => slots.number === 1 && !slots.f && !slots.city && !/\b(1|uno)\b/.test(fold(c.heard));

function expectWrongFlight(c: Ctx) {
  ask(c, {
    id: "wrong_flight", expects: ["give_bp", "give_bp_ctx", "flight_info_ctx", "ask_gate"], hints: ["show_bp"],
    suggest: [{ lt: "Show your boarding pass", hint: "show_bp" }],
    on: {
      give_bp: (cc) => { cc.say("bp_you_are_223"); confirmGate(cc, true); },
      give_bp_ctx: (cc) => { cc.say("bp_you_are_223"); confirmGate(cc, true); },
      flight_info_ctx: (cc, sl) => { if (articleOne(cc, sl)) { expectWrongFlight(cc); return; } flightGiven(cc, sl); },
      ask_gate: (cc, sl) => { flightGiven(cc, sl); },
      g_wait: (cc) => { cc.say("g_take_time"); expectWrongFlight(cc); },
    },
    yes: (cc) => { cc.say("bp_you_are_223"); confirmGate(cc, true); },
    ask: (cc) => cc.say("see_bp"),
  });
}

function flightGiven(c: Ctx, slots: any) {
  const n = flightNumber(slots);
  const city = slots.city as string | undefined;
  if ((n !== undefined && n !== 223 && n !== 4) || (city && city !== "cdmx")) {
    c.say("not_this_flight");
    c.say("see_bp");
    expectWrongFlight(c);
    return;
  }
  confirmGate(c);
}

/** The flight is confirmed: the gate change twist or "you're in the right place", then any stored question. */
function confirmGate(c: Ctx, quiet = false) {
  if ((c as any)._gateConfirmed) return; // one utterance parsed as two segments: confirm once per turn
  (c as any)._gateConfirmed = true;
  const first = !c.s.gateOk;
  c.s.gateOk = true;
  if (first && c.s.gateChange) {
    c.twist("gate_change");
    c.s.moved = true;
    c.say("gate_changed");
    c.say("gate7_where");
    c.say("heading_there");
  } else if (!quiet) c.say(c.s.moved ? "gate7_yes" : c.s.afterFlight ? "gate_here_short" : "gate_yes");
  const q = c.s.afterFlight as string | undefined;
  c.s.afterFlight = undefined;
  if (q) QUESTION_LINES[q](c);
}

function announce(c: Ctx, zone: number) {
  c.s.called = zone;
  c.say(c.s.announced ? "announce_again" : "announce_hello");
  c.s.announced = true;
  c.say("announce_group", { num: zone });
}

function boardingOk(c: Ctx) {
  c.s.boarded = true;
  c.event("board", { flight: 223 });
  c.say("scanned");
}

function expectScan(c: Ctx, quiet = false) {
  if (!quiet) c.say("scan_ask");
  ask(c, {
    id: "scan", expects: ["give_bp", "give_bp_ctx", "ask_id"], hints: ["board"],
    suggest: [{ lt: "Hand over your boarding pass and ID", hint: "board" }],
    on: {
      give_bp: (cc) => { boardingOk(cc); }, give_bp_ctx: (cc) => { boardingOk(cc); }, g_ok: (cc) => { boardingOk(cc); },
      // "¿Sirve mi pasaporte?": answered, then the pass and the ID are still asked for (without the same line again)
      ask_id: (cc) => { cc.say("id_passport"); expectScan(cc, true); },
    },
    yes: (cc) => { boardingOk(cc); },
    ask: (cc) => cc.say("scan_ask"),
  });
}

/** "¿Dónde la recojo?" gets the place; "¿La recojo en la Ciudad de México?" gets "Sí, …" (rule 11). */
/** "¿Es gratis?" → "Sí, es sin costo."; "¿Tengo que pagar algo?" / "¿Tiene costo?" → "No, no tiene costo."; "¿Cuánto cuesta?" →
 *  "No cuesta nada." (rule 11: never "Sí, es sin costo" to "Do I have to pay?"). */
const freeAnswer = (c: Ctx) => {
  const h = fold(c.heard);
  c.say(/gratis|sin costo/.test(h) ? "free_yes" : /\bcuanto\b/.test(h) ? "free_how" : "free_no");
};
const bagWhere = (c: Ctx) => c.say(/\bdonde\b/.test(fold(c.heard)) ? "bag_back_cdmx_short" : "bag_back_yes");
const checkBag = (cc: Ctx) => { cc.s.bagChecked = true; cc.say("bag_tagged"); cc.say("bag_back_cdmx"); };
const keepBag = (cc: Ctx) => { cc.s.bagChecked = false; cc.say("no_problem"); };
/** "No traigo maleta", "Solo traigo una mochila": nothing to check (the backpack goes with the learner). */
const noBag = (cc: Ctx) => { cc.s.bagChecked = false; cc.say("no_bag"); };

function offerGateCheck(c: Ctx, fromQuestion = false) {
  c.s.offerDone = true;
  c.twist("full_flight");
  c.say(fromQuestion ? "full_offer_short" : "full_offer");
  c.say("full_offer_q");
  ask(c, {
    id: "offer", expects: ["bag_check_q", "keep_bag", "keep_bag_ctx", "offer_yes", "ask_free", "bag_amb_ctx", "no_bag_ctx", "must_q_ctx"], hints: ["g_yesno", "offer"],
    suggest: [{ lt: "Say yes or no", hint: "offer" }],
    yes: checkBag,
    no: keepBag,
    on: {
      keep_bag: keepBag,
      keep_bag_ctx: keepBag,
      offer_yes: checkBag,
      no_bag_ctx: noBag,
      bag_check_q: (cc) => { cc.say("bag_back_cdmx"); ask(cc, offerPending()); },
      ask_free: (cc) => { freeAnswer(cc); ask(cc, offerPending()); },
      must_q_ctx: (cc) => { cc.say("offer_optional"); ask(cc, offerPending()); },
      bag_amb_ctx: (cc) => { cc.say("bag_which"); ask(cc, offerPending()); },
    },
    ask: (cc) => cc.say("full_offer_q"),
  });
}
const offerPending = (): Pending => ({
  id: "offer", expects: ["keep_bag", "keep_bag_ctx", "offer_yes", "ask_free", "bag_check_q", "bag_amb_ctx", "no_bag_ctx", "must_q_ctx"], hints: ["g_yesno", "offer"],
  suggest: [{ lt: "Say yes or no", hint: "offer" }],
  yes: checkBag,
  no: keepBag,
  on: {
    keep_bag: keepBag,
    keep_bag_ctx: keepBag,
    offer_yes: checkBag,
    no_bag_ctx: noBag,
    // a second question: answered, and the offer stays open without repeating the whole question
    bag_check_q: (cc) => { bagWhere(cc); ask(cc, offerPending()); },
    ask_free: (cc) => { freeAnswer(cc); ask(cc, offerPending()); },
    must_q_ctx: (cc) => { cc.say("offer_optional"); ask(cc, offerPending()); },
    bag_amb_ctx: (cc) => { cc.say("bag_which"); ask(cc, offerPending()); },
  },
  ask: (cc) => cc.say("full_offer_q"),
});

// ---------------------------------------------------------------------------

export const gate: SituationDef = {
  id: "s64c-gate",
  song: 64,
  songTitle: "Window or Aisle?",
  title: { en: "¿Es esta la sala?", lt: "Is This the Right Gate?" },
  topic: { en: "En la sala de abordar", lt: "At the gate" },
  chapter: 6,
  order: 7,
  location: "airport",
  npc: "nina",
  goal: "Check that you're at the right gate and when your flight leaves, then board the plane.",
  intro: "The departure area at Puerto Colibrí's little airport, by gate 4 (in Mexico the gate is “la sala”). Your flight: 223 to Mexico City, boarding zone 3 (it's on your boarding pass). Daniela is at the gate desk.",

  grammar: {
    macros: {
      sala: "(sala | puerta | sala de abordar | sala de abordaje | puerta de abordar | puerta de abordaje | puerta de embarque | sala de embarque | sala de espera)",
      flt: "[el] vuelo [pc | pe ce] ({number} | {f:fnum})",
      dest: "(a | para | hacia | con destino a | rumbo a) {city}",
      thecity: "(@dest | el vuelo @dest | el de {city} | el vuelo de {city})",
      bp: "(pase de abordar | pase de abordaje | pase | tarjeta de embarque | tarjeta de abordar | tarjeta | boleto | billete | boarding pass)",
      board_v: "(abordar | subir | pasar | embarcar | entrar | subirme | subir al avion | abordar el avion)",
      leaves: "(sale | aborda | se aborda | va a salir | esta saliendo | despega | embarca)",
      here: "(de aqui | aqui | de esta sala | de esta puerta | por aqui | en esta sala | en esta puerta)",
      bag_noun: "(maleta | mochila | bolsa | maleta de mano | equipaje de mano | equipaje | maletita | valija | carry on)",
      wifi: "(wifi | wi fi | internet | uifi | guaifai | guifi | wai fai)",
      phone_thing: "(celular | telefono | cel | laptop | computadora | tableta | ipad | compu)",
      eat: "(algo de comer | algo de tomar | comida | botanas | una botana | snacks | un snack | bebidas | refrescos | agua | algo)",
      zone: "(zona | grupo)",
      // the flight (or gate 4) said first, then "¿va a tiempo?" with its subject left out: one question, since a piece
      // can't start with "va" / "sale" / "está" (the engine reads them as the previous piece's verb)
      fl_given: "((voy | viajo | estoy) en (el | mi) vuelo ({number} | {f:fnum}) [@dest] | (tengo | traigo) (el | mi) vuelo ({number} | {f:fnum}) [@dest] | mi vuelo es [el] ({number} | {f:fnum}) [@dest] | es [esta] la @sala (del | de | para el) @flt [@dest] | (es | esta es) [esta] la @sala (4 | cuatro) | (voy | viajo) @dest | es aqui [el vuelo @dest | @flt])",
    },
    slots: {
      fnum: { lexicon: [{ id: "223", forms: ["doscientos veintitres", "dos veintitres", "dos dos tres", "pc223", "dos veinte tres"] }] },
      city: { lexicon: [
        { id: "cdmx", forms: ["ciudad de mexico", "la ciudad de mexico", "cdmx", "la cdmx", "ce de eme equis", "mexico", "el df", "df", "la capital", "mexico city", "ciudad mexico", "mexico df"] },
        { id: "monterrey", forms: ["monterrey"] }, { id: "guadalajara", forms: ["guadalajara"] }, { id: "cancun", forms: ["cancun"] },
        { id: "merida", forms: ["merida"] }, { id: "tijuana", forms: ["tijuana"] }, { id: "oaxaca", forms: ["oaxaca"] },
        { id: "houston", forms: ["houston"] }, { id: "dallas", forms: ["dallas"] }, { id: "miami", forms: ["miami"] }, { id: "toronto", forms: ["toronto"] },
        { id: "new_york", forms: ["nueva york", "new york"] }, { id: "los_angeles", forms: ["los angeles"] }, { id: "chicago", forms: ["chicago"] },
      ] },
    },
  },

  intents: {
    affirm: { patterns: [
      "[si] (la ventanilla | ese asiento | el 16a | junto a la ventanilla) (seria | estaria | esta) (perfecto | perfecta | genial | muy bien | bien | padre)",
      "si (cambiemelo | me lo cambia | me lo puede cambiar | por favor cambiemelo | cambiamelo #tip:tu_staff)",
      "si (soy yo | es el mio | ese es mi vuelo | es mi vuelo)",
      "(claro | si) me (encantaria | gustaria) [la ventanilla | cambiarme]",
    ] },
    deny: { patterns: [
      "[no] [gracias] (me quedo | prefiero quedarme) (en | con) (mi asiento | el mismo asiento | mi lugar | donde estoy)",
      "[no] [gracias] (asi | asi estoy) bien (con mi asiento | en mi asiento | con mi lugar)",
      "[no] [gracias] (me gusta | prefiero) (mi asiento | el pasillo | mi lugar)",
      "[no] [gracias] no (me lo | lo) (cambie | cambien)", "[no] [gracias] me quedo (en el pasillo | en la ventanilla | aqui | con el mio | con el que tengo | como estoy)",
      "[no] [gracias] (asi esta bien | esta bien asi)",
    ] },
    ask_gate: { patterns: [
      "es [esta] la @sala (del | de | para el) @flt [@dest] #h:q_gate",
      "es [esta] la @sala (del | de | para el) vuelo @dest",
      "(es | esta es) [esta] la @sala {number} [para @flt | @dest | para el vuelo @dest] #h:q_gate4",
      "(esta es | es esta | es) la @sala (correcta | buena) [para @flt | para el vuelo @dest | @dest]",
      "(esta es | es esta | es) la @sala (@dest | para {city} | de {city})",
      "(de aqui | aqui | de esta sala | de esta puerta | por aqui) (sale | aborda | se aborda | sale el avion) (@flt | el vuelo @dest | el vuelo de {city} | mi vuelo) [@dest] #h:q_gate_city",
      "(sale | aborda | se aborda) (de aqui | aqui | de esta sala | de esta puerta) (@flt | el vuelo @dest | mi vuelo) [@dest]",
      "(@flt | el vuelo @dest | mi vuelo) (sale | aborda | se aborda | va a salir) @here",
      "(@flt | el vuelo @dest) (es | esta) aqui",
      "(es aqui | aqui es) [el vuelo @dest | @flt | para @flt | para el vuelo @dest | @dest]",
      "(de | en | por) (que | cual) (sala | puerta) (sale | aborda | se aborda) (@flt | el vuelo @dest | el vuelo de {city} | mi vuelo) [@dest]",
      "cual es la @sala (del | de | para el) (@flt | vuelo @dest) [@dest]",
      "estoy en la @sala (correcta | buena) [para @flt | para el vuelo @dest | @dest] #h:q_right",
      "estoy en el lugar (correcto | indicado) [para @flt | para el vuelo @dest]",
      "(voy | viajo | estoy) en (el | mi) vuelo ({number} | {f:fnum}) [@dest] #h:fl_on",
      "(tengo | traigo) (el | mi) vuelo ({number} | {f:fnum}) [@dest]",
      "@flt @dest #h:fl_223", "@flt", "@flt (verdad | cierto | no)",
      "(voy | viajo | vuelo) @dest", "(tengo | traigo) un vuelo @dest [a {time} | hoy]",
      "(busco | estoy buscando | donde esta | ando buscando) la @sala (4 | cuatro)",
      "es [esta] la @sala de abordar [@dest | para @flt]",
      "(aqui | aqui es donde) (abordo | se aborda | subo) [@flt | el vuelo @dest]",
      "(donde | en donde) (abordo | se aborda | sale) (@flt | el vuelo @dest | mi vuelo) [@dest]",
      "(puede | podria | me puede | me podria) (decir | decirme) si (esta es | es) la @sala (del | de | para el) (@flt | vuelo @dest)",
      "(puedes | me puedes | podrias | me podrias) (decir | decirme) si (esta es | es) la @sala (del | de | para el) (@flt | vuelo @dest) #tip:tu_staff",
      "es (el vuelo | este el vuelo) @dest", "este es el vuelo @dest",
      // "¿Cuál es mi sala?" (s64a's hint): the flight is asked for, or the gate is named once it's known
      "cual es (mi | la) @sala [correcta]",
      "aqui es la @sala {number}", "(es | sera) aqui donde (sale | aborda | se aborda) (@flt | el vuelo @dest | mi vuelo) [@dest]",
      "mi vuelo es [el] ({number} | {f:fnum}) [@dest]", "mi vuelo (va | es) @dest",
      "(busco | estoy buscando | ando buscando) (@flt | el vuelo @dest | la @sala (del | de | para el) (@flt | vuelo @dest))",
      "(es | esta) (correcta | bien) esta @sala [para @flt | para el vuelo @dest]",
      "(tienen | tiene) (el vuelo @dest | @flt) aqui",
    ] },
    need_help: { patterns: ["(me puede | me podria | puede | podria) ayudar", "(me puedes | puedes) ayudar #tip:tu_staff", "(puede | podria) ayudarme", "ayudeme", "(necesito | ocupo) ayuda", "una consulta"] },
    flight_info_ctx: { patterns: [
      "[es | es el | mi vuelo es [el] | voy en el | viajo en el | tengo el] @flt [@dest] #h:fl_223",
      "[es] el ({number} | {f:fnum}) [@dest]",
      "{f:fnum} [@dest]",
      "[voy | viajo | vuelo] @dest",
      "(el vuelo | el de) @dest",
      "{city}", "{number} [@dest]",
      "(perdon | me equivoqué | quise decir | digo | perdon quise decir | perdon me equivoqué) [es] [el] (@flt | {number} | {f:fnum}) [@dest]",
      // "No es el 225, es el 223": in "No X, Y" the second number is the answer (rule 10)
      "no (es | era) [el] [vuelo] {neg:number} [es | sino] [el] [vuelo] ({number} | {f:fnum}) [@dest]",
    ] },
    give_bp: { patterns: [
      "aqui (esta | tiene) [mi | el] @bp #h:bd_bp",
      "(este | ese | esta) es mi @bp",
      "(lo | la) tengo en (el | mi) (celular | telefono | app | aplicacion)",
      "(esta | lo tengo | la tengo) en (mi celular | el celular | la app | la aplicacion | mi telefono)",
      "(me lo | lo | me la | la) (puede | podria) escanear [del celular | aqui]",
      "aqui (tiene | esta) [mi] @bp y mi (identificacion | pasaporte | ine | credencial | documentacion | dni)",
      "aqui (tiene | esta) mi (identificacion | pasaporte | ine | credencial) [y mi @bp]",
      "(mi | el) @bp y mi (identificacion | pasaporte)",
      "le (doy | paso | muestro | enseno) mi @bp",
      "aqui (lo | la) tiene",
    ] },
    // a bare "Aquí tiene" / "Tome" only where a pass is asked for (rule 12)
    give_bp_ctx: { patterns: ["aqui tiene #h:bd_here", "aqui esta", "aqui", "tome", "tenga", "claro aqui tiene", "si aqui (tiene | esta)", "aqui (lo | la) tiene", "toma #tip:tu_staff",
      // "Tenga mi pasaporte", "Mi pasaporte": the ID handed over with the pass
      "(tenga | tome) (mi | el) (pasaporte | identificacion | ine | pase | pase de abordar)", "(mi | el) (pasaporte | identificacion) [y (mi | el) (pase | pase de abordar)]"] },
    ask_ontime: { patterns: [
      "[el vuelo | mi vuelo | el avion] (va | sale | esta | viene) a tiempo [el vuelo | mi vuelo | el avion] #h:q_ontime",
      "(va | sale | esta | viene) (en tiempo | en horario | puntual | a la hora) [el vuelo | mi vuelo]",
      "(vamos | salimos | estamos) (a tiempo | en tiempo | puntuales | en horario)",
      "(todo | todo esta) bien con el vuelo", "(todo | todo va) en orden con el vuelo",
      "(va a | vamos a) salir a tiempo", "(el vuelo | mi vuelo) (sale | va a salir) a (tiempo | la hora)",
      "sigue a tiempo [el vuelo]", "el vuelo esta (a tiempo | en tiempo | puntual) [verdad]",
      // "¿El vuelo 223 va a tiempo?": one question with the flight in it (never the gate question with "a tiempo" dropped)
      "(@flt | el vuelo @dest | el de {city}) (va | sale | esta | viene) (a tiempo | en tiempo | en horario | puntual | a la hora) [verdad]",
      "(va | sale | esta | viene) (a tiempo | en tiempo | en horario | puntual | a la hora) (@flt | el vuelo @dest)",
      "@fl_given (va | sale | esta | viene | vamos | salimos) (a tiempo | en tiempo | en horario | puntual | puntuales | a la hora) [verdad]",
    ] },
    ask_delayed: { patterns: [
      "[el vuelo | mi vuelo | el avion] (esta | viene | va) (retrasado | atrasado | demorado | con retraso | con demora | con atraso) [el vuelo | el avion] #h:q_delayed",
      "(hay | tiene | trae) (retraso | algun retraso | demora | alguna demora | atraso | algun atraso)",
      "(cuanto | cuanto tiempo) (de retraso | de atraso | se va a retrasar | se retrasa | trae de retraso | es el retraso | va a tardar)",
      "(cuanto | de cuanto) es el retraso", "(cuanto | cuanto tiempo) de (retraso | atraso | demora) (hay | trae | tiene | lleva | traen | tienen)",
      "(se va a retrasar | se retrasó | se atrasó | se demoró | se va a atrasar) [el vuelo]",
      "(vamos a | va a) salir tarde", "(sale | salimos) tarde", "(va | viene) tarde [el vuelo | el avion]",
      // "¿No está retrasado?", "¿El vuelo no va a tiempo?": questions about the delay all the same
      "[el vuelo] no (esta | viene | va) (retrasado | atrasado | demorado) [el vuelo | verdad]", "no hay (retraso | demora | atraso) [verdad]",
      "[el vuelo] no (va | sale | esta) a tiempo [el vuelo | verdad]",
      "(@flt | el vuelo @dest) (esta | viene | va) (retrasado | atrasado | demorado | con retraso | con demora | con atraso)",
      "(@flt | el vuelo @dest) (sale | va | viene) tarde", "(@flt | el vuelo @dest) (tiene | trae) (retraso | algun retraso | demora | atraso)",
      "@fl_given (esta | viene | va) (retrasado | atrasado | demorado | con retraso | con demora | con atraso)", "@fl_given (sale | va | viene) tarde",
    ] },
    ask_delay_reason: { patterns: [
      "por que (esta | viene | va) (retrasado | atrasado | demorado | tarde) [el vuelo | el avion] #h:q_why",
      "por que (el retraso | hay retraso | se retrasó | se atrasó | la demora)",
      "que (pasó | pasa | sucede | sucedio)", "que pasó con el (vuelo | avion)",
      "cual es el (motivo | problema | razon)", "(cual | que) fue el (motivo | problema)",
      "por que (vamos a salir | salimos | sale) tarde",
    ] },
    why_short: { patterns: ["por que [sera]", "y eso"] },
    ask_boarding_time: { patterns: [
      "a que hora (empieza | comienza | inicia | es) el (abordaje | embarque) #h:q_boarding",
      "a que hora (abordamos | se aborda | podemos abordar | empiezan a abordar | empezamos a abordar | empezamos a subir | subimos | embarcamos | empiezan a pasar)",
      "cuando (abordamos | empieza el abordaje | empieza el embarque | podemos abordar | empiezan a abordar | subimos [al avion] | embarcamos | se aborda)",
      "cuanto (falta | tiempo falta) para (abordar | el abordaje | el embarque | subir)",
      "cuanto (tiempo) (tengo que | hay que | tenemos que) esperar", "cuanto (hay que | tengo que) esperar",
      "a que hora puedo abordar", "cuando puedo abordar", "cuanto tiempo (tengo | tenemos) [antes de abordar | para abordar]",
      "cual es la hora de (abordaje | abordar | embarque)", "cuanto falta [todavia]",
      "a que hora (aborda | se aborda | empieza a abordar | empiezan a abordar) (@flt | el vuelo @dest)",
      "a que hora (empieza | comienza | inicia | es) el (abordaje | embarque) (del | de | para el) (@flt | vuelo @dest)",
    ] },
    ask_departure: { patterns: [
      "a que hora (sale el vuelo | sale el avion | salimos | despegamos | sale | despega el avion | despega) #h:q_departure",
      "cuando (sale el vuelo | salimos | despegamos | sale el avion)",
      "a que hora es la salida", "a que hora (sale | es) (mi vuelo | el vuelo | nuestro vuelo | el avion)", "cual es la hora de salida", "no se a que hora (salimos | sale el vuelo | sale)",
      "a que hora (sale | despega) (@flt | el vuelo @dest)", "cuando sale (@flt | el vuelo @dest)",
    ] },
    ask_group: { patterns: [
      "en que @zone (voy | estoy | me toca | ando) #h:q_group",
      "(cual | que) es mi @zone", "(que | cual) @zone (soy | tengo | me toca)",
      "cuando (aborda | pasa | sube | le toca a) la @zone {number}",
      "(que | cual) @zone (esta abordando | estan abordando | esta pasando | pasa | va) [ahora | ahorita] #now",
      "que (significa | quiere decir) [la] @zone {number}",
      "cuando (me toca | le toca a mi @zone | pasa mi @zone)", "mi @zone es la {number}",
    ] },
    ask_carryon: { patterns: [
      "puedo (subir | llevar | pasar | meter) (esta | mi | la) @bag_noun (al avion | conmigo | a bordo | a la cabina | arriba) #h:q_carryon",
      "puedo (subir | llevar | pasar) (esta | mi) @bag_noun",
      "(esta | mi | la) @bag_noun (cabe | entra | pasa) [en el compartimento | arriba | en el avion]",
      "puedo (llevar | subir) dos (maletas | piezas | bultos | cosas | mochilas) [de mano]", "cuantas (maletas | piezas | bolsas | mochilas) (puedo | se pueden) (llevar | subir) [de mano | al avion]",
      "cuanto equipaje de mano (puedo llevar | se permite | se puede llevar)",
      "(esta | mi) @bag_noun (esta bien | esta permitida | se permite)",
      "puedes subir mi maleta #tip:tu_staff",
    ] },
    ask_wifi: { patterns: [
      "hay @wifi (en el avion | a bordo | en el vuelo) #h:q_wifi",
      "(el avion | el vuelo) tiene @wifi", "hay @wifi [aqui | en la sala]", "(tienen | tiene) @wifi [en el avion | a bordo]", "no hay @wifi [a bordo | en el avion]",
      "el @wifi es gratis", "puedo usar (el @wifi | @wifi) (en el avion | a bordo)",
      "cuanto (cuesta | cobran) [por] el @wifi", "(se paga | hay que pagar) el @wifi", "hay @wifi en el aeropuerto",
    ] },
    ask_coffee: { patterns: [
      "donde (puedo comprar | compro | venden | hay | puedo conseguir | consigo) [un | una] (cafe | cafecito) #h:q_coffee",
      "hay (una cafeteria | un cafe | un starbucks | donde comer | una tienda | algo para comer | un restaurante) [por aqui | cerca | aqui]",
      "donde (puedo | se puede) (comprar | conseguir) @eat",
      "(tengo | me da | hay) tiempo (de | para) (comprar | ir por | tomar) (un cafe | @eat)",
      "donde (esta | queda) la (cafeteria | tienda | zona de comida)",
      "puedo ir (a comprar | por) (un cafe | @eat)",
      "(hay | sabe si hay) (algun lugar | un lugar | algo) (para | donde) (comer | tomar un cafe | comprar comida | comprar algo)",
      "donde (venden | compro | hay | puedo comprar) @eat",
      "(tengo | traigo) (hambre | sed | mucha hambre | mucha sed)", "(quiero | quisiera | necesito) (un cafe | un cafecito | algo de comer | comer algo | tomar algo | agua | un agua)",
      "(tengo | me da | hay) tiempo (de | para) (un cafe | un cafecito | comer [algo] | @eat)",
    ] },
    ask_food: { patterns: [
      "(dan | sirven | hay | venden | ofrecen) @eat (en el avion | a bordo | en el vuelo)",
      "(dan | sirven) (de comer | algo) [en el avion | a bordo]",
      "puedo (subir | llevar | meter) (mi | un | el | este) (cafe | comida | agua | torta | sandwich | botella de agua) (al avion | a bordo) #bring",
      "(el vuelo | el boleto) incluye (comida | algo de comer | bebidas | snacks | botanas)",
    ] },
    ask_restroom: { patterns: [
      "donde (esta | estan | queda | quedan) (el bano | los banos | el sanitario | los sanitarios | el servicio | los servicios | el aseo | los aseos | el wc) #h:q_restroom",
      "hay (un bano | banos | sanitarios | aseos) (por aqui | cerca | aqui)", "donde hay (un bano | banos | sanitarios | un sanitario)",
      "(el bano | los banos) (por favor | donde)", "puedo ir al bano", "(tengo | me da) tiempo (de | para) ir al bano", "(me (dice | puede decir | podria decir) | sabe) donde (esta | estan | queda) (el bano | los banos | el sanitario)",
    ] },
    ask_charge: { patterns: [
      "donde (puedo | se puede) cargar (mi | el) @phone_thing #h:q_charge",
      "hay (un contacto | contactos | enchufes | un enchufe | donde cargar | tomas de corriente | una toma de corriente) [por aqui | cerca | aqui]",
      "donde (hay | estan) (contactos | enchufes | tomas de corriente)",
      "puedo cargar (mi | el) @phone_thing [aqui | en algun lado | en algun lugar]",
      "donde (hay | esta) (un enchufe | un contacto | una toma de corriente)", "necesito cargar (mi | el) @phone_thing", "hay donde cargar [(el | mi) @phone_thing]",
      "hay (algun lugar | un lugar | algun sitio | un sitio) (para | donde) cargar [(el | mi) @phone_thing]",
    ] },
    ask_duration: { patterns: ["cuanto (dura | tarda | se tarda) [el vuelo]", "cuanto tiempo (dura | es | tarda) el vuelo", "a que hora (llegamos | aterrizamos | llega el vuelo) [a {city}]", "cuantas horas (son | es el vuelo | de vuelo)"] },
    ask_full: { patterns: ["(el vuelo | el avion) (va | esta | viene) lleno", "(va | viene) lleno [el vuelo | el avion]", "(hay | quedan) (asientos | lugares) (libres | vacios | disponibles)", "esta lleno [el vuelo]"] },
    ask_seat_change: { patterns: [
      "puedo cambiar (de asiento | mi asiento | de lugar | mi lugar) #h:q_seat",
      "(hay | tiene | queda) (un | algun) (asiento | lugar) (de | en | junto a la) (ventanilla | pasillo | ventana) [libre | disponible]",
      "(me puede | puede | me podria) (cambiar | dar) (de asiento | otro asiento | un asiento (de | en) (ventanilla | pasillo | la ventanilla | el pasillo) | la ventanilla | el pasillo)",
      "(me puedes | puedes) cambiar de asiento #tip:tu_staff",
      "puedo (sentarme | ir) (en la ventanilla | en el pasillo | junto a la ventanilla | junto a la ventana | en otro lugar | con mi (esposa | esposo | familia | amigo | amiga | hijo | hija))",
      "(quisiera | me gustaria | quiero) (cambiar de asiento | cambiarme de asiento | un asiento de ventanilla | un asiento de pasillo | la ventanilla | el pasillo)",
      "(me puede | puede | me podria) cambiar a (la ventanilla | el pasillo | otro asiento | un asiento de ventanilla | ventanilla | pasillo)",
      "(hay | tiene | quedan) asientos (de | en) (ventanilla | pasillo) [libres | disponibles]",
      "(quiero | quisiera | me gustaria) sentarme (con | junto a) mi (esposa | esposo | familia | amigo | amiga | hijo | hija | pareja | novio | novia)",
      "prefiero (ventanilla | la ventanilla | pasillo | el pasillo)",
      "(me puede | puede | me podria | podria) (cambiar | cambiarme) a (un asiento (de | en) (ventanilla | pasillo) | la ventanilla | el pasillo | otro asiento | ventanilla | pasillo)",
      "(me puedes | puedes | me podrias | podrias) (cambiar | cambiarme) (a | de) (un asiento (de | en) (ventanilla | pasillo) | la ventanilla | el pasillo | otro asiento | asiento | lugar) #tip:tu_staff",
      "(puedo | podemos | quiero | quisiera | me gustaria) (sentarme | sentarnos) (junto a | con | al lado de) mi (esposa | esposo | familia | amigo | amiga | hijo | hija | pareja | novio | novia)",
      // the other side, when a seat is offered: "¿No tiene uno de pasillo?", "¿Y uno de ventanilla?", "Mejor de pasillo"
      "[no] (tiene | hay | queda) (uno | alguno | otro) (de | en | junto a la) (ventanilla | pasillo | ventana) [libre | disponible]",
      "(y | mejor) (uno | otro) (de | en) (ventanilla | pasillo | la ventanilla | el pasillo)",
      "mejor (de | en) (ventanilla | pasillo | la ventanilla | el pasillo)",
    ] },
    // "¿Cuál es mi asiento?": the new seat after a change, or "it's on your boarding pass"
    ask_my_seat: { patterns: [
      "(cual | que) es mi (asiento | lugar | numero de asiento) [ahora]", "cual es mi nuevo (asiento | lugar)",
      "(que | cual) (asiento | lugar) (tengo | me toca | me dio | me dieron | me queda) [ahora]",
      "en que (asiento | lugar) (voy | estoy | me toca)", "(cual | que) asiento es el mio",
    ] },
    // "¿Sirve mi pasaporte?": the foreign learner's ID for boarding (asked for with the pass at the scan)
    ask_id: { patterns: [
      "(sirve | le sirve | esta bien | puede ser | vale) (mi | el) pasaporte [como identificacion]",
      "(mi | el) pasaporte (sirve | le sirve | esta bien | vale) [como identificacion]",
      "(necesita | quiere | ocupa) (mi | el) pasaporte", "(necesito | ocupo) (mi | el) pasaporte [para abordar | para subir]",
      "con (mi | el) pasaporte (esta bien | sirve | le sirve)",
    ] },
    ask_gate12: { patterns: [
      "(donde esta | donde queda | como llego a | por donde (es | queda) | hacia donde (es | queda) | para donde es) la @sala (7 | siete) #h:q_gate12",
      "(la @sala | @sala) (7 | siete)", "(la @sala | @sala) (7 | siete) (donde esta | por donde es)",
      "(la @sala | @sala) (7 | siete) (esta | queda) (lejos | cerca)", "(esta | queda) (lejos | cerca) la @sala (7 | siete)",
    ] },
    can_board: { patterns: [
      "ya puedo (abordar | pasar | subir | embarcar) #h:bd_can",
      "puedo (abordar | pasar | subir | embarcar) [ya | ahora]",
      "ya (me toca | es mi turno | es mi zona | le toca a mi zona)",
      "(ya | ahora) (estan abordando | estan llamando | pasa | estan pasando) [a] la @zone {number}",
      "(voy | estoy | soy) (en | de) la @zone {number} #h:bd_group",
      "(tengo | traigo) la @zone {number}",
      "@zone {number}",
      "(esa | esta) es mi @zone", "(esa | esta) es la mia",
      "(es | esa es) la @zone {number}",
      "(me toca | mi turno | es mi turno)",
      "(podemos | puedo) pasar ya", "ya (llamaron | pasaron | pasó | estan llamando) [a] la @zone {number}", "soy [de] [la] @zone {number}", "ya (estan abordando | empezó el abordaje | empezaron a abordar | estan pasando)",
    ] },
    keep_bag: { patterns: [
      "[no gracias] (la | lo) (llevo | voy a llevar | prefiero llevar | quiero llevar) conmigo #h:of_keep",
      "(prefiero | quiero | me gustaria) (llevarla | llevarlo | quedarmela | quedarmelo | tenerla | tenerlo) conmigo",
      "(prefiero | quiero) (llevarla | llevarlo) (a bordo | en el avion | arriba)",
      "no (la | lo) quiero documentar", "no quiero documentar(la | lo)?", "no (la | lo) documente", "no me (la | lo) documente",
      "[es que] (traigo | llevo | tengo) (mi laptop | mi computadora | medicinas | mis medicinas | cosas de valor | mi camara | cosas fragiles | mis documentos) (adentro | ahi | en la maleta | en la mochila)",
      "(es | esta) (chica | pequena | ligera | chiquita) [la llevo conmigo]",
      "mejor (la | lo) llevo [conmigo]",
      "mejor no (la | lo) documento", "prefiero no documentarla", "[no gracias] (me la | me lo) (llevo | quedo) [conmigo]",
    ] },
    // "Es que traigo cosas frágiles": a reason to keep the bag, only as an answer to the offer
    // "La necesito en el avión" only at the offer: with a "no" in front it's ambiguous (bag_amb_ctx), never a plain keep
    keep_bag_ctx: { patterns: ["(la | lo) necesito (en el avion | conmigo | a bordo | durante el vuelo)", "[es que] (traigo | llevo | tengo) (mi laptop | mi computadora | medicinas | mis medicinas | cosas de valor | mi camara | cosas fragiles | mis documentos | algo fragil | algo de valor)",
      "(puedo | podria) (llevarla | llevarlo | quedarmela | quedarmelo | tenerla | tenerlo) conmigo"] },
    // at the offer: no bag to check ("No traigo maleta", "Solo traigo una mochila")
    no_bag_ctx: { patterns: [
      "no (traigo | tengo | llevo) [ninguna] (maleta | maletas | equipaje | maleta de mano | equipaje de mano | valija)",
      "no (traigo | tengo | llevo) nada [de equipaje]",
      "(solo | nada mas | nomas | solamente) (traigo | tengo | llevo) (una | mi | esta) (mochila | bolsa | mochilita | bolsita)",
      "(solo | nada mas | nomas | solamente) (es | traigo) (una | mi | esta) (mochila | bolsa | mochilita)",
      "(solo | nada mas | nomas | solamente) (una | mi | esta) (mochila | bolsa | mochilita)",
      "(es | nada mas es) (una | mi) (mochila | bolsa) [nada mas]",
      "no es (una | mi) maleta [es (una | mi) (mochila | bolsa | mochilita)]",
    ] },
    // at the offer: "¿Es obligatorio?", "¿Tengo que documentarla?" (no, it's optional)
    must_q_ctx: { patterns: [
      "(es | seria) (obligatorio | necesario | forzoso)",
      "(tengo | hay) que (documentarla | documentarlo | documentar [la | mi] (maleta | mochila))", "(la | lo) tengo que documentar",
    ] },
    // "¿La tres?" right after a zone is called: only at the boarding call (a bare "la cuatro" elsewhere is the gate or a time)
    zone_ctx: { patterns: ["[y] la {number}", "[y] (la | mi) @zone {number}"] },
    // "¡Ya voy!" (I'm coming) at a boarding call: never the goodbye "ya me voy"
    coming_ctx: { patterns: ["(ya | ahi | ahorita) voy [para alla]", "voy para alla", "(ya | ahi) vamos"] },
    // "No la necesito en el avión" (check it) and "No, la necesito en el avión" (keep it) read the same (rule 10)
    bag_amb_ctx: { patterns: ["no (la | lo) necesito (en el avion | conmigo | a bordo | arriba | durante el vuelo) #amb"] },
    flight_dunno_ctx: { patterns: ["no (me acuerdo | recuerdo) [del numero | el numero | de que vuelo | cual es]", "no se (el numero | cual es | de que vuelo)", "no se (el | mi) numero (de | del) vuelo", "no se (que | cual) (vuelo | numero) [es]", "[no se] (no lo tengo | no lo traigo) a la mano"] },
    offer_yes: { patterns: [
      "[si] (seria | estaria) (genial | perfecto | muy bien | bien | excelente) #h:of_yes",
      "[si] (documentela | documentelo | documentenla | llevesela | llevensela | facturela | facturemela) [por favor]",
      "[si] (la | se la) (documento | dejo | encargo)",
      "[no] mejor (si | documentela | documentelo | documentenla | llevesela | llevensela | facturela | se la dejo | la documento | si la documento) [por favor]",
      "[si] (quiero | me gustaria) documentarla",
      "[si] (es | me parece) (buena idea | bien)", "buena idea",
      "[si] (puede | pueden) (llevarsela | documentarla)",
      "[si] documentela [por favor] #h:of_yes",
    ] },
    ask_free: { patterns: ["(es | seria | sale) gratis #h:of_free", "(tiene | lleva) (costo | algun costo | cargo | algun cargo)", "(tengo | hay) que pagar [algo | por eso | extra]", "cuanto (cuesta | es | cobran | sale)", "no (cuesta | tiene costo | tiene coste) nada", "es sin (costo | coste)", "[no] (tiene | lleva) (coste | algun coste)"] },
    bag_check_q: { patterns: [
      "(donde | en donde) (la | lo) (recojo | recogo | recupero | recibo)",
      "(llega | va | se va) [directo] a {city}", "(la | lo) (recojo | recupero | entregan) en {city}",
      "(donde | en donde) (recojo | recogo | recupero) (mi maleta | la maleta | mi equipaje)",
      "(me la | me lo) (regresan | dan | entregan) en {city}", "va directo a {city}",
      "(me la | me lo) (regresan | dan | entregan) [al bajar | al llegar]",
    ] },
    more_no: { patterns: [
      "(eso seria | seria | eso es) todo [por ahora | por el momento] #h:more_all", "(por ahora | por el momento | de momento) (es | seria | eso es) todo",
      "[ya] no tengo [mas | otras | ninguna otra | ninguna] (preguntas | pregunta | dudas | duda) #h:more_none", "nada [por ahora | por el momento]",
      "ninguna (otra) (pregunta | duda)", "(ya | asi) (estoy | quedé) bien", "(ya | asi) esta todo",
      "(voy a | me voy a) (esperar | sentar) [aqui | alla | por alla | ahi]",
      "[ok | bueno | perfecto] (espero | lo espero | me siento | me espero) (aqui | alla | ahi | por alla)",
      "(no | ya no) (gracias) (eso es todo | es todo)",
      "(todo | ya) (claro | entendido)", "ya es todo", "estoy bien asi [gracias]", "ya esta [gracias]", "no necesito nada [mas]", "[no] todo bien [gracias]",
      "(puedo | me puedo) (esperar | sentar | sentarme) (aqui | alla | ahi | por aqui)", "hay donde sentarse",
    ] },
    more_q: { patterns: ["tengo (una | otra) (pregunta | duda)", "una pregunta [mas]", "(puedo | le puedo) hacer (una | otra) pregunta", "otra (cosa | pregunta)", "(le | te) puedo preguntar (algo | otra cosa)", "puedo preguntar (algo | otra cosa)"] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | ¿En | qué | le | puedo | ayudar?", "Good morning! | In | what | (to) you | can I | help?", "Good morning! How can I help you?"),
      t("¡Hola, | buenos días! | ¿Qué | se le ofrece?", "Hi, | good morning! | What | do you need?", "Hi, good morning! What can I do for you?",
        { flags: { 3: "se le ofrece: the polite service formula, literally is offered to you." }, spain: t("¡Hola, | buenos días! | ¿Qué | desea?", "Hi, | good morning! | What | do you need?", "Hi, good morning! What can I do for you?") }),
      t("¡Buenos días! | ¿Le | ayudo | en | algo?", "Good morning! | (To) you | I-help | in | something?", "Good morning! Can I help you with anything?"),
    ],
    ask_help: [
      t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?"),
      t("Dígame, | ¿en | qué | le | ayudo?", "Tell me, | in | what | (to) you | I-help?", "Yes, how can I help?"),
    ],
    gate_yes: [
      t("Sí, | aquí | sale | el | vuelo | 223 | a | la | Ciudad de México.", "Yes, | here | leaves | the | flight | 223 | to | — | Mexico City.", "Yes, flight 223 to Mexico City leaves from here.",
        { say: "Sí, aquí sale el vuelo doscientos veintitrés a la Ciudad de México.", flags: { 7: "Spanish says la Ciudad de México; English has no article." } }),
      t("Sí, | está | en | el | lugar | correcto.", "Yes, | you are | in | the | place | right.", "Yes, you're in the right place."),
    ],
    gate7_yes: [
      t("Sí, | ahora | el | vuelo | 223 | sale | de | aquí, | de | la | sala | 7.", "Yes, | now | the | flight | 223 | leaves | from | here, | from | the | gate | 7.",
        "Yes, flight 223 boards here now, at gate 7.", { say: "Sí, ahora el vuelo doscientos veintitrés sale de aquí, de la sala siete.",
          flags: { 10: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Sí, | ahora | el | vuelo | 223 | sale | de | aquí, | de | la | puerta | 7.", "Yes, | now | the | flight | 223 | leaves | from | here, | from | the | gate | 7.",
            "Yes, flight 223 boards here now, at gate 7.", { say: "Sí, ahora el vuelo doscientos veintitrés sale de aquí, de la puerta siete." }) }),
    ],
    gate_changed: [
      t("Fíjese que | hubo | un | cambio | de | sala: | el | vuelo | 223 | ahora | sale | de | la | sala | 7.",
        "Actually, | there was | a | change | of | gate: | the | flight | 223 | now | leaves | from | the | gate | 7.",
        "Actually, there's been a gate change: flight 223 now leaves from gate 7.",
        { say: "Fíjese que hubo un cambio de sala: el vuelo doscientos veintitrés ahora sale de la sala siete.",
          flags: { 0: "Fíjese que…: a polite way to bring up news, literally notice that.", 5: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Fíjese que | hubo | un | cambio | de | puerta: | el | vuelo | 223 | ahora | sale | de | la | puerta | 7.",
            "Actually, | there was | a | change | of | gate: | the | flight | 223 | now | leaves | from | the | gate | 7.",
            "Actually, there's been a gate change: flight 223 now leaves from gate 7.",
            { say: "Fíjese que hubo un cambio de puerta: el vuelo doscientos veintitrés ahora sale de la puerta siete.", flags: { 0: "Fíjese que…: a polite way to bring up news, literally notice that." } }), spain: t("Mire, | ha habido | un | cambio | de | puerta: | el | vuelo | 223 | ahora | sale | de | la | puerta | 7.", "Look, | there has been | a | change | of | gate: | the | flight | 223 | now | leaves | from | the | gate | 7.", "Actually, there's been a gate change: flight 223 now leaves from gate 7.", {say: "Mire, ha habido un cambio de puerta: el vuelo doscientos veintitrés ahora sale de la puerta siete."}) }),
    ],
    gate7_where: [
      t("Está | a | unos | pasos | de | aquí, | a la izquierda.", "It's | at | a few | steps | from | here, | on the left.", "It's a few steps from here, on the left."),
    ],
    heading_there: [
      t("Nosotros | también | vamos | para | allá | ahorita.", "We | too | are going | toward | there | right now.", "We're heading over there right now, too.",
        { flags: { 5: "Mexican: ahorita = right now; elsewhere ahora mismo." },
          neutral: t("Nosotros | también | vamos | para | allá | ahora mismo.", "We | too | are going | toward | there | right now.", "We're heading over there right now, too.") }),
    ],
    which_flight: [
      t("¿En | qué | vuelo | viaja?", "On | what | flight | are you traveling?", "Which flight are you on?"),
      t("¿Cuál | es | su | número | de | vuelo?", "What | is | your | number | of | flight?", "What's your flight number?"),
    ],
    not_this_flight: [
      t("Mmm, | de | esta | sala | sale | el | vuelo | 223 | a | la | Ciudad de México.", "Hmm, | from | this | gate | leaves | the | flight | 223 | to | — | Mexico City.",
        "Hmm, this gate is for flight 223 to Mexico City.",
        { say: "Mmm, de esta sala sale el vuelo doscientos veintitrés a la Ciudad de México.",
          flags: { 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta.", 9: "Spanish says la Ciudad de México; English has no article." },
          neutral: t("Mmm, | de | esta | puerta | sale | el | vuelo | 223 | a | la | Ciudad de México.", "Hmm, | from | this | gate | leaves | the | flight | 223 | to | — | Mexico City.",
            "Hmm, this gate is for flight 223 to Mexico City.",
            { say: "Mmm, de esta puerta sale el vuelo doscientos veintitrés a la Ciudad de México.", flags: { 9: "Spanish says la Ciudad de México; English has no article." } }) }),
    ],
    see_bp: [
      t("¿Me | permite | su | pase de abordar?", "(To) me | you-allow | your | boarding pass?", "Can I see your boarding pass?",
        { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¿Me | permite | su | tarjeta de embarque?", "(To) me | you-allow | your | boarding pass?", "Can I see your boarding pass?"), spain: t("¿Me | deja | su | tarjeta de embarque?", "(To) me | you-let-have | your | boarding pass?", "Can I see your boarding pass?") }),
    ],
    bp_you_are_223: [
      t("Ah, | usted | va | en | el | vuelo | 223. | ¡Está | en | el | lugar | correcto!", "Oh, | you | are going | on | the | flight | 223. | You're | in | the | place | right!",
        "Oh, you're on flight 223. You're in the right place!", { say: "Ah, usted va en el vuelo doscientos veintitrés. ¡Está en el lugar correcto!" }),
    ],
    bp_thanks: [t("Gracias.", "Thank you.", "Thanks.")],
    flight_help: [
      t("Viene | en | su | pase de abordar.", "It comes | on | your | boarding pass.", "It's on your boarding pass.",
        { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Viene | en | su | tarjeta de embarque.", "It comes | on | your | boarding pass.", "It's on your boarding pass.") }),
    ],
    gate_here_short: [
      t("Perfecto, | es | aquí.", "Perfect, | it's | here.", "Great, it's here."),
      t("Muy | bien, | es | aquí | mismo.", "Very | good, | it's | here | right.", "Okay, it's right here."),
    ],
    ontime_no: [
      t("Lamentablemente, | no.", "Unfortunately, | no.", "Unfortunately, no."),
      t("Fíjese que | no.", "Actually, | no.", "Actually, no.", { flags: { 0: "Fíjese que…: a polite way to bring up news, literally notice that." }, spain: t("Pues | no.", "Well, | no.", "Actually, no.") }),
    ],
    delayed_yes: [
      t("Sí, | lamentablemente.", "Yes, | unfortunately.", "Yes, unfortunately."),
    ],
    delayed_no: [
      t("No, | hoy | vamos | a tiempo.", "No, | today | we're going | on time.", "No, we're on time today."),
    ],
    delay_none: [
      t("Mmm, | no viene | retrasado: | hoy | vamos | a tiempo.", "Hmm, | it isn't coming | delayed: | today | we're going | on time.", "Actually, it isn't delayed: we're on time today."),
    ],
    ontime: [
      t("Sí, | hoy | vamos | a tiempo.", "Yes, | today | we're going | on time.", "Yes, we're on time today."),
      t("Sí, | todo | en | orden: | salimos | a tiempo.", "Yes, | all | in | order: | we leave | on time.", "Yes, everything's on schedule: we're leaving on time."),
    ],
    boarding_time: [
      t("El | abordaje | empieza | a | {$time}.", "The | boarding | starts | at | {$time}.", "Boarding starts at {$time}.", { spain: t("El | embarque | empieza | a | {$time}.", "The | boarding | starts | at | {$time}.", "Boarding starts at {$time}.") }),
      t("Comenzamos | el | abordaje | a | {$time}.", "We begin | the | boarding | at | {$time}.", "We'll start boarding at {$time}.", { spain: t("Comenzamos | el | embarque | a | {$time}.", "We begin | the | boarding | at | {$time}.", "We'll start boarding at {$time}.") }),
    ],
    delay: [
      t("Traemos | un | retraso | de | unos | 20 | minutos.", "We have | a | delay | of | some | 20 | minutes.", "We're running about 20 minutes late.",
        { say: "Traemos un retraso de unos veinte minutos.", spain: t("Llevamos | un | retraso | de | unos | 20 | minutos.", "We have | a | delay | of | some | 20 | minutes.", "We're running about 20 minutes late.", {say: "Llevamos un retraso de unos veinte minutos."}) }),
      t("Son | unos | 20 | minutos | de | retraso.", "It's | some | 20 | minutes | of | delay.", "It's about a 20-minute delay.",
        { say: "Son unos veinte minutos de retraso." }),
    ],
    delay_reason_plane: [
      t("El | avión | todavía | no llega | de | la | Ciudad de México.", "The | plane | still | hasn't arrived | from | — | Mexico City.",
        "The plane hasn't come in from Mexico City yet.",
        { flags: { 3: "todavía no llega: Mexican Spanish uses the present here (it hasn't arrived yet).", 5: "Spanish says la Ciudad de México; English has no article." }, spain: t("El | avión | todavía | no ha llegado | de | la | Ciudad de México.", "The | plane | still | hasn't arrived | from | — | Mexico City.", "The plane hasn't come in from Mexico City yet.", {flags: {5: "Spanish says la Ciudad de México; English has no article."}}) }),
    ],
    delay_reason_crew: [
      t("Estamos | esperando | a | la | tripulación.", "We are | waiting | for | the | crew.", "We're waiting for the crew."),
    ],
    delay_reason_weather: [
      t("Hay | mal | tiempo | en | la | Ciudad de México.", "There's | bad | weather | in | — | Mexico City.", "There's bad weather in Mexico City.",
        { flags: { 4: "Spanish says la Ciudad de México; English has no article." } }),
    ],
    boarding_late: [
      t("El | abordaje | empieza | como | a | {$time}.", "The | boarding | starts | around | at | {$time}.", "Boarding starts at around {$time}.", { spain: t("El | embarque | empieza | como | a | {$time}.", "The | boarding | starts | around | at | {$time}.", "Boarding starts at around {$time}.") }),
    ],
    departure: [
      t("Salimos | a | {$time}.", "We leave | at | {$time}.", "We leave at {$time}."),
    ],
    departure_late: [
      t("Salimos | como | a | {$time}.", "We leave | around | at | {$time}.", "We should leave at around {$time}."),
    ],
    group_info: [
      t("Usted | va | en | la | zona | 3. | Viene | en | su | pase de abordar.", "You | are going | in | — | zone | 3. | It comes | on | your | boarding pass.",
        "You're in zone 3. It's on your boarding pass.",
        { say: "Usted va en la zona tres. Viene en su pase de abordar.", flags: { 3: "Spanish says la zona 3; English has no article.", 9: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Usted | va | en | la | zona | 3. | Viene | en | su | tarjeta de embarque.", "You | are going | in | — | zone | 3. | It comes | on | your | boarding pass.",
            "You're in zone 3. It's on your boarding pass.", { say: "Usted va en la zona tres. Viene en su tarjeta de embarque.", flags: { 3: "Spanish says la zona 3; English has no article." } }) }),
    ],
    group_after: [
      t("La | zona | 3 | pasa | justo | después de | la | 2.", "— | Zone | 3 | goes | right | after | — | 2.", "Zone 3 boards right after zone 2.",
        { say: "La zona tres pasa justo después de la dos.", flags: { 0: "Spanish says la zona 3; English has no article.", 6: "la 2 = la zona 2; English says zone 2." } }),
    ],
    carryon_ok: [
      t("Sí, | puede | llevar | una | maleta de mano | y | un | artículo | personal, | como | una | bolsa | o | una | mochila.",
        "Yes, | you can | take | one | carry-on | and | one | item | personal, | like | a | purse | or | a | backpack.",
        "Yes, you can bring one carry-on and one personal item, like a purse or a backpack.", { spain: t("Sí, | puede | llevar | una | maleta de mano | y | un | artículo | personal, | como | un | bolso | o | una | mochila.", "Yes, | you can | take | one | carry-on | and | one | item | personal, | like | a | purse | or | a | backpack.", "Yes, you can bring one carry-on and one personal item, like a purse or a backpack.") }),
    ],
    carryon_how: [
      t("Puede | llevar | una | maleta de mano | y | un | artículo | personal, | como | una | bolsa | o | una | mochila.",
        "You can | take | one | carry-on | and | one | item | personal, | like | a | purse | or | a | backpack.",
        "You can bring one carry-on and one personal item, like a purse or a backpack.", { spain: t("Puede | llevar | una | maleta de mano | y | un | artículo | personal, | como | un | bolso | o | una | mochila.", "You can | take | one | carry-on | and | one | item | personal, | like | a | purse | or | a | backpack.", "You can bring one carry-on and one personal item, like a purse or a backpack.") }),
    ],
    carryon_full: [
      t("Sí, | pero | hoy | el | vuelo | va | lleno | y | casi | no hay | espacio | arriba.", "Yes, | but | today | the | flight | is going | full | and | almost | there's no | space | overhead.",
        "Yes, but the flight is full today, so overhead space is tight."),
    ],
    wifi: [
      t("En | este | avión | no hay | wifi, | lo siento. | Aquí | en | la | sala | sí | hay.", "On | this | plane | there's no | Wi-Fi, | I'm sorry. | Here | in | the | gate area | indeed | there is.",
        "There's no Wi-Fi on this plane, I'm sorry. There is Wi-Fi here at the gate, though.", { flags: { 10: "sí before a verb stresses it: there IS (here)." } }),
    ],
    wifi_here: [
      t("Sí, | aquí | en | la | sala | hay | wifi. | En | el | avión, | no.", "Yes, | here | in | the | gate area | there is | Wi-Fi. | On | the | plane, | no.",
        "Yes, there's Wi-Fi here at the gate. Not on the plane, though."),
    ],
    free_wifi: [
      t("El | de | la | sala | es | gratis. | En | el | avión | no hay.", "The one | of | the | gate area | is | free. | On | the | plane | there isn't any.",
        "The Wi-Fi here at the gate is free. There's none on the plane."),
    ],
    coffee: [
      t("Hay | una | cafetería | enfrente de | la | sala | 2.", "There's | a | coffee shop | across from | the | gate | 2.", "There's a coffee shop across from gate 2.",
        { say: "Hay una cafetería enfrente de la sala dos.", flags: { 5: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Hay | una | cafetería | enfrente de | la | puerta | 2.", "There's | a | coffee shop | across from | the | gate | 2.", "There's a coffee shop across from gate 2.",
            { say: "Hay una cafetería enfrente de la puerta dos." }) }),
    ],
    coffee_time: [
      t("Tiene | tiempo: | el | abordaje | todavía | no empieza.", "You have | time: | the | boarding | still | doesn't start.", "You have time: boarding hasn't started yet.",
        { flags: { 5: "todavía no empieza: Mexican Spanish uses the present here (it hasn't started yet)." }, spain: t("Tiene | tiempo: | el | embarque | todavía | no ha empezado.", "You have | time: | the | boarding | still | hasn't started.", "You have time: boarding hasn't started yet.") }),
    ],
    food_onboard: [
      t("A bordo | venden | bebidas | y | algo | de | comer.", "On board | they sell | drinks | and | something | to | eat.", "They sell drinks and snacks on board."),
    ],
    food_bring: [
      t("Sí, | claro, | lo | puede | subir | al | avión.", "Yes, | of course, | it | you can | take up | onto the | plane.", "Yes, of course, you can take it on the plane."),
    ],
    food_bring_f: [
      t("Sí, | claro, | la | puede | subir | al | avión.", "Yes, | of course, | it | you can | take up | onto the | plane.", "Yes, of course, you can take it on the plane.",
        { flags: { 2: "la: it, for a feminine noun (la comida, el agua, la botella)." } }),
    ],
    restroom: [
      t("Los | baños | están | aquí | a la derecha, | junto | a | la | sala | 3.", "The | restrooms | are | here | on the right, | next | to | the | gate | 3.",
        "The restrooms are right here on the right, next to gate 3.", { say: "Los baños están aquí a la derecha, junto a la sala tres.",
          flags: { 8: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Los | baños | están | aquí | a la derecha, | junto | a | la | puerta | 3.", "The | restrooms | are | here | on the right, | next | to | the | gate | 3.",
            "The restrooms are right here on the right, next to gate 3.", { say: "Los baños están aquí a la derecha, junto a la puerta tres." }), spain: t("Los | aseos | están | aquí | a la derecha, | junto | a | la | puerta | 3.", "The | restrooms | are | here | on the right, | next | to | the | gate | 3.", "The restrooms are right here on the right, next to gate 3.", {say: "Los aseos están aquí a la derecha, junto a la puerta tres."}) }),
    ],
    charge: [
      t("Hay | contactos | junto | a | las | ventanas.", "There are | outlets | next | to | the | windows.", "There are outlets by the windows.",
        { flags: { 1: "Mexican: contacto = (power) outlet; elsewhere enchufe." },
          neutral: t("Hay | enchufes | junto | a | las | ventanas.", "There are | outlets | next | to | the | windows.", "There are outlets by the windows.") }),
    ],
    duration: [
      t("Son | unas | dos | horas | y cuarto, | más o menos.", "It's | some | two | hours | and a quarter, | more or less.", "About two and a quarter hours."),
    ],
    arrival: [
      t("Llegamos | en | unas | dos | horas | y cuarto, | más o menos.", "We arrive | in | some | two | hours | and a quarter, | more or less.", "It takes about two and a quarter hours to get there."),
    ],
    full_seats_no: [
      t("No, | hoy | va | lleno.", "No, | today | it's going | full.", "No, the flight's full today."),
    ],
    full_yes: [
      t("Sí, | hoy | va | lleno.", "Yes, | today | it's going | full.", "Yes, it's a full flight today."),
    ],
    full_no: [
      t("Va | casi | lleno, | pero | quedan | unos | lugares | libres.", "It's going | almost | full, | but | there remain | some | seats | free.", "It's pretty full, but there are a few empty seats.", { spain: t("Va | casi | lleno, | pero | quedan | algunos | asientos | libres.", "It's going | almost | full, | but | there remain | some | seats | free.", "It's pretty full, but there are a few empty seats.") }),
    ],
    seat_offer: [
      t("Déjeme | ver… | Le | puedo | dar | el | 16A, | junto | a | la | ventanilla.", "Let me | see… | (to) you | I can | give | the | 16A, | next | to | the | window.",
        "Let me see… I can give you 16A, a window seat.", { say: "Déjeme ver… Le puedo dar el dieciséis A, junto a la ventanilla." }),
    ],
    seat_offer_aisle: [
      t("Déjeme | ver… | Le | puedo | dar | el | 14C, | en | el | pasillo.", "Let me | see… | (to) you | I can | give | the | 14C, | on | the | aisle.",
        "Let me see… I can give you 14C, an aisle seat.", { say: "Déjeme ver… Le puedo dar el catorce C, en el pasillo." }),
    ],
    seat_offer_q: [
      t("¿Se lo | cambio?", "It for you | I-change?", "Shall I switch it for you?"),
    ],
    seat_changed: [
      t("¡Listo! | Aquí tiene | su | nuevo | pase de abordar.", "Done! | Here you have | your | new | boarding pass.", "Done! Here's your new boarding pass.",
        { flags: { 4: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¡Listo! | Aquí tiene | su | nueva | tarjeta de embarque.", "Done! | Here you have | your | new | boarding pass.", "Done! Here's your new boarding pass."), spain: t("¡Ya está! | Aquí tiene | su | nueva | tarjeta de embarque.", "Done! | Here you have | your | new | boarding pass.", "Done! Here's your new boarding pass.") }),
    ],
    seat_now: [
      t("Ahora | su | asiento | es | el | 16A.", "Now | your | seat | is | the | 16A.", "Your seat is 16A now.", { say: "Ahora su asiento es el dieciséis A." }),
    ],
    seat_now_aisle: [
      t("Ahora | su | asiento | es | el | 14C.", "Now | your | seat | is | the | 14C.", "Your seat is 14C now.", { say: "Ahora su asiento es el catorce C." }),
    ],
    gate7_is: [
      t("Sí, | ahora | es | la | sala | 7.", "Yes, | now | it's | — | gate | 7.", "Yes, it's gate 7 now.",
        { say: "Sí, ahora es la sala siete.", flags: { 3: "Spanish says la sala 7; English has no article.", 4: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Sí, | ahora | es | la | puerta | 7.", "Yes, | now | it's | — | gate | 7.", "Yes, it's gate 7 now.",
            { say: "Sí, ahora es la puerta siete.", flags: { 3: "Spanish says la puerta 7; English has no article." } }) }),
    ],
    gate7_dir: [
      t("La | sala | 7 | está | aquí | adelante, | a la izquierda.", "The | gate | 7 | is | here | ahead, | on the left.", "Gate 7 is just up ahead, on the left.",
        { say: "La sala siete está aquí adelante, a la izquierda.", flags: { 1: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("La | puerta | 7 | está | aquí | adelante, | a la izquierda.", "The | gate | 7 | is | here | ahead, | on the left.", "Gate 7 is just up ahead, on the left.",
            { say: "La puerta siete está aquí adelante, a la izquierda." }), spain: t("La | puerta | 7 | está | aquí | delante, | a la izquierda.", "The | gate | 7 | is | here | ahead, | on the left.", "Gate 7 is just up ahead, on the left.", {say: "La puerta siete está aquí delante, a la izquierda."}) }),
    ],
    gate4_for_223: [
      t("Sí, | es | la | sala | 4. | Aquí | sale | el | vuelo | 223 | a | la | Ciudad de México.", "Yes, | it's | — | gate | 4. | Here | leaves | the | flight | 223 | to | — | Mexico City.",
        "Yes, this is gate 4. Flight 223 to Mexico City leaves from here.",
        { say: "Sí, es la sala cuatro. Aquí sale el vuelo doscientos veintitrés a la Ciudad de México.",
          flags: { 2: "Spanish says la sala 4; English has no article.", 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta.", 11: "Spanish says la Ciudad de México; English has no article." },
          neutral: t("Sí, | es | la | puerta | 4. | Aquí | sale | el | vuelo | 223 | a | la | Ciudad de México.", "Yes, | it's | — | gate | 4. | Here | leaves | the | flight | 223 | to | — | Mexico City.",
            "Yes, this is gate 4. Flight 223 to Mexico City leaves from here.",
            { say: "Sí, es la puerta cuatro. Aquí sale el vuelo doscientos veintitrés a la Ciudad de México.",
              flags: { 2: "Spanish says la puerta 4; English has no article.", 11: "Spanish says la Ciudad de México; English has no article." } }) }),
    ],
    gate7_not4: [
      t("No, | ahora | estamos | en | la | sala | 7.", "No, | now | we are | at | — | gate | 7.", "No, we're at gate 7 now.",
        { say: "No, ahora estamos en la sala siete.", flags: { 4: "Spanish says la sala 7; English has no article.", 5: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("No, | ahora | estamos | en | la | puerta | 7.", "No, | now | we are | at | — | gate | 7.", "No, we're at gate 7 now.",
            { say: "No, ahora estamos en la puerta siete.", flags: { 4: "Spanish says la puerta 7; English has no article." } }) }),
    ],
    gate4_here: [
      t("Esta | es | la | sala | 4.", "This | is | — | gate | 4.", "This is gate 4.", { say: "Esta es la sala cuatro.",
        flags: { 2: "Spanish says la sala 4; English has no article.", 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
        neutral: t("Esta | es | la | puerta | 4.", "This | is | — | gate | 4.", "This is gate 4.", { say: "Esta es la puerta cuatro.", flags: { 2: "Spanish says la puerta 4; English has no article." } }) }),
    ],
    clarify_what: [
      t("Perdón, | ¿a | qué | se refiere?", "Sorry, | to | what | are you referring?", "Sorry, what do you mean?"),
    ],
    ask_more: [
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Le | ayudo | con | algo | más?", "(To) you | I-help | with | something | else?", "Can I help you with anything else?"),
    ],
    what_q: [
      t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead."),
    ],
    have_seat: [
      t("¡Perfecto! | Tome asiento, | por favor. | Ahorita | los | llamamos | por | zonas.", "Perfect! | Have a seat, | please. | In a moment | you (all) | we-call | by | zones.",
        "Great! Please have a seat. We'll call you by zone shortly.",
        { flags: { 3: "Mexican: ahorita = in a moment; elsewhere en un momento.", 4: "los: all of you, the passengers." },
          neutral: t("¡Perfecto! | Tome asiento, | por favor. | En un momento | los | llamamos | por | zonas.", "Perfect! | Have a seat, | please. | In a moment | you (all) | we-call | by | zones.",
            "Great! Please have a seat. We'll call you by zone shortly.", { flags: { 4: "los: all of you, the passengers." } }) }),
      t("Muy | bien. | Siéntese, | por favor; | abordamos | por | zonas.", "Very | good. | Sit down, | please; | we board | by | zones.", "Okay. Please have a seat; we board by zone.", { spain: t("Muy | bien. | Siéntese, | por favor; | embarcamos | por | zonas.", "Very | good. | Sit down, | please; | we board | by | zones.", "Okay. Please have a seat; we board by zone.") }),
    ],
    have_seat_wait: [
      t("Tome asiento, | por favor. | Le | avisamos | cuando | sea | su | turno.", "Have a seat, | please. | (To) you | we-let-know | when | it is | your | turn.",
        "Please have a seat. We'll let you know when it's your turn."),
    ],
    full_offer: [
      t("Ah, | otra | cosa: | hoy | el | vuelo | va | lleno, | así que | estamos | documentando | el | equipaje de mano | sin | costo.",
        "Oh, | another | thing: | today | the | flight | is going | full, | so | we are | checking | the | carry-on luggage | without | cost.",
        "Oh, one more thing: the flight is full today, so we're checking carry-on bags for free.", { spain: t("Ah, | otra | cosa: | hoy | el | vuelo | va | lleno, | así que | estamos | facturando | el | equipaje de mano | sin | coste.", "Oh, | another | thing: | today | the | flight | is going | full, | so | we are | checking | the | carry-on luggage | without | cost.", "Oh, one more thing: the flight is full today, so we're checking carry-on bags for free.") }),
      t("Hoy | el | vuelo | va | lleno, | así que | estamos | documentando | el | equipaje de mano | sin | costo.",
        "Today | the | flight | is going | full, | so | we are | checking | the | carry-on luggage | without | cost.",
        "The flight is full today, so we're checking carry-on bags for free.", { spain: t("Hoy | el | vuelo | va | lleno, | así que | estamos | facturando | el | equipaje de mano | sin | coste.", "Today | the | flight | is going | full, | so | we are | checking | the | carry-on luggage | without | cost.", "The flight is full today, so we're checking carry-on bags for free.") }),
    ],
    full_offer_short: [
      t("Hoy | estamos | documentando | el | equipaje de mano | sin | costo.", "Today | we are | checking | the | carry-on luggage | without | cost.", "Today we're checking carry-on bags for free.", { spain: t("Hoy | estamos | facturando | el | equipaje de mano | sin | coste.", "Today | we are | checking | the | carry-on luggage | without | cost.", "Today we're checking carry-on bags for free.") }),
    ],
    full_offer_q: [
      t("¿Quiere | documentar | su | maleta?", "Do you want | to check | your | suitcase?", "Would you like to check yours?", { spain: t("¿Quiere | facturar | su | maleta?", "Do you want | to check | your | suitcase?", "Would you like to check yours?") }),
    ],
    free_yes: [
      t("Sí, | es | sin | costo.", "Yes, | it's | without | cost.", "Yes, it's free.", { spain: t("Sí, | es | sin | coste.", "Yes, | it's | without | cost.", "Yes, it's free.") }),
    ],
    free_no: [
      t("No, | no tiene | costo.", "No, | it doesn't have | cost.", "No, there's no charge.", { spain: t("No, | no tiene | coste.", "No, | it doesn't have | cost.", "No, there's no charge.") }),
    ],
    free_how: [
      t("No cuesta | nada.", "It doesn't cost | anything.", "It doesn't cost anything."),
    ],
    offer_optional: [
      t("No, | es | opcional.", "No, | it's | optional.", "No, it's optional."),
    ],
    no_bag: [
      t("Ah, | entonces | no se preocupe.", "Oh, | then | don't worry.", "Oh, then don't worry about it."),
    ],
    bag_tagged: [
      t("¡Perfecto! | Aquí está | su | comprobante.", "Perfect! | Here is | your | claim tag.", "Great! Here's your claim tag."),
    ],
    bag_back_cdmx: [
      t("La | recoge | en | la | Ciudad de México, | en | la | banda | de | equipaje.", "It | you-pick-up | in | — | Mexico City, | at | the | belt | of | baggage.",
        "You'll pick it up in Mexico City, at baggage claim.",
        { flags: { 0: "la: it, your bag (la maleta).", 3: "Spanish says la Ciudad de México; English has no article." }, spain: t("La | recoge | en | la | Ciudad de México, | en | la | cinta | de | equipajes.", "It | you-pick-up | in | — | Mexico City, | at | the | belt | of | baggage.", "You'll pick it up in Mexico City, at baggage claim.", {flags: {0: "la: it, your bag (la maleta).",3: "Spanish says la Ciudad de México; English has no article."}}) }),
    ],
    bag_which: [
      t("Perdón, | ¿se la | documento | o | la | lleva | con | usted?", "Sorry, | it for you | I-check | or | it | you-take | with | you?",
        "Sorry, should I check it, or are you keeping it with you?", { flags: { 1: "se la: it (la maleta) for you; le becomes se before la.", 4: "la: it, your bag (la maleta)." }, spain: t("Perdón, | ¿se la | facturo | o | la | lleva | con | usted?", "Sorry, | it for you | I-check | or | it | you-take | with | you?", "Sorry, should I check it, or are you keeping it with you?", {flags: {1: "se la: it (la maleta) for you; le becomes se before la.",4: "la: it, your bag (la maleta)."}}) }),
    ],
    bag_back_yes: [
      t("Sí, | en | la | banda | de | equipaje, | al | llegar.", "Yes, | at | the | belt | of | baggage, | upon | arriving.", "Yes, at baggage claim, when you land.", { spain: t("Sí, | en | la | cinta | de | equipajes, | al | llegar.", "Yes, | at | the | belt | of | baggage, | upon | arriving.", "Yes, at baggage claim, when you land.") }),
    ],
    bag_back_cdmx_short: [
      t("En | la | banda | de | equipaje, | al | llegar.", "At | the | belt | of | baggage, | upon | arriving.", "At baggage claim, when you land.", { spain: t("En | la | cinta | de | equipajes, | al | llegar.", "At | the | belt | of | baggage, | upon | arriving.", "At baggage claim, when you land.") }),
    ],
    no_problem: [
      t("No hay problema.", "No problem.", "No problem."),
      t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem."),
    ],
    announce_hello: [
      t("¡Buenos días | a | todos!", "Good morning | to | everyone!", "Good morning, everyone!"),
    ],
    announce_again: [
      t("Atención, | por favor.", "Attention, | please.", "Your attention, please."),
    ],
    announce_group: [
      t("Vuelo | 223 | con destino a | la | Ciudad de México: | iniciamos | el | abordaje | de | la | zona | {$num}.",
        "Flight | 223 | bound for | — | Mexico City: | we begin | the | boarding | of | — | zone | {$num}.",
        "Flight 223 to Mexico City: we're now boarding zone {$num}.",
        { say: "Vuelo doscientos veintitrés con destino a la Ciudad de México: iniciamos el abordaje de la zona {$num}.",
          flags: { 3: "Spanish says la Ciudad de México; English has no article.", 9: "Spanish says la zona; English has no article." }, spain: t("Vuelo | 223 | con destino a | la | Ciudad de México: | iniciamos | el | embarque | de | la | zona | {$num}.", "Flight | 223 | bound for | — | Mexico City: | we begin | the | boarding | of | — | zone | {$num}.", "Flight 223 to Mexico City: we're now boarding zone {$num}.", {flags: {3: "Spanish says la Ciudad de México; English has no article.",9: "Spanish says la zona; English has no article."},say: "Vuelo doscientos veintitrés con destino a la Ciudad de México: iniciamos el embarque de la zona {$num}."}) }),
    ],
    zone_now: [
      t("Ahora | está | pasando | la | zona | {$num}.", "Now | is | going through | — | zone | {$num}.", "Zone {$num} is boarding now.",
        { flags: { 3: "Spanish says la zona; English has no article." } }),
    ],
    boarding_not_started: [
      t("El | abordaje | todavía | no empieza.", "The | boarding | still | doesn't start.", "Boarding hasn't started yet.",
        { flags: { 3: "todavía no empieza: Mexican Spanish uses the present here (it hasn't started yet)." }, spain: t("El | embarque | todavía | no ha empezado.", "The | boarding | still | hasn't started.", "Boarding hasn't started yet.") }),
    ],
    not_yet_short: [
      t("Todavía no.", "Not yet.", "Not yet."),
    ],
    not_yet: [
      t("Todavía no. | Ahora | está | pasando | la | zona | 2, | y | después | sigue | la | 3.", "Not yet. | Now | is | going through | the | zone | 2, | and | after | comes | the | 3.",
        "Not yet. Zone 2 is boarding now, and zone 3 is next.", { say: "Todavía no. Ahora está pasando la zona dos, y después sigue la tres." }),
    ],
    yes_board: [
      t("Sí, | adelante.", "Yes, | go ahead.", "Yes, go ahead!"),
      t("Sí, | ya | le toca.", "Yes, | now | it's your turn.", "Yes, that's you!"),
    ],
    scan_ask: [
      t("Su | pase de abordar | y | una | identificación, | por favor.", "Your | boarding pass | and | an | ID, | please.", "Your boarding pass and an ID, please.",
        { flags: { 1: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Su | tarjeta de embarque | y | una | identificación, | por favor.", "Your | boarding pass | and | an | ID, | please.", "Your boarding pass and an ID, please."), spain: t("Su | tarjeta de embarque | y | su | documentación, | por favor.", "Your | boarding pass | and | your | ID, | please.", "Your boarding pass and an ID, please.") }),
      t("¿Me | permite | su | pase de abordar | y | su | identificación?", "(To) me | you-allow | your | boarding pass | and | your | ID?", "May I see your boarding pass and ID?",
        { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¿Me | permite | su | tarjeta de embarque | y | su | identificación?", "(To) me | you-allow | your | boarding pass | and | your | ID?", "May I see your boarding pass and ID?"), spain: t("¿Me | deja | su | tarjeta de embarque | y | su | documentación?", "(To) me | you-let-have | your | boarding pass | and | your | ID?", "May I see your boarding pass and ID?") }),
    ],
    id_passport: [
      t("Sí, | su | pasaporte | sirve | como | identificación.", "Yes, | your | passport | works | as | ID.", "Yes, your passport works as ID.", { spain: t("Sí, | su | pasaporte | sirve | como | documentación.", "Yes, | your | passport | works | as | ID.", "Yes, your passport works as ID.") }),
    ],
    scanned: [
      t("Gracias. | ¡Buen | viaje!", "Thank you. | Good | trip!", "Thank you. Have a good flight!"),
      t("¡Gracias! | Que tenga | un | buen | vuelo.", "Thanks! | May you have | a | good | flight.", "Thanks! Have a great flight."),
    ],
  },

  domains: {
    num: () => [2, 3],
    time: () => [TIMES.boarding, TIMES.boardingLate, TIMES.departure, TIMES.departureLate],
  },

  hints: {
    gate: {
      lt: "Ask if this is the right gate",
      items: [
        { id: "q_gate", s: t("¿Es | esta | la | sala | del | vuelo | 223?", "Is it | this | the | gate | of the | flight | 223?", "Is this the gate for flight 223?",
          { say: "¿Es esta la sala del vuelo doscientos veintitrés?", flags: { 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
            neutral: t("¿Es | esta | la | puerta | del | vuelo | 223?", "Is it | this | the | gate | of the | flight | 223?", "Is this the gate for flight 223?",
              { say: "¿Es esta la puerta del vuelo doscientos veintitrés?" }) }), note: "At Mexican airports the gate is usually la sala; la puerta works too." },
        { id: "q_gate_city", s: t("¿De | aquí | sale | el | vuelo | a | la | Ciudad de México?", "From | here | leaves | the | flight | to | — | Mexico City?",
          "Does the flight to Mexico City leave from here?", { flags: { 6: "Spanish says la Ciudad de México; English has no article." } }) },
        { id: "q_gate4", s: t("¿Es | la | sala | 4?", "Is it | — | gate | 4?", "Is this gate 4?", { say: "¿Es la sala cuatro?",
          flags: { 1: "Spanish says la sala 4; English has no article.", 2: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("¿Es | la | puerta | 4?", "Is it | — | gate | 4?", "Is this gate 4?", { say: "¿Es la puerta cuatro?", flags: { 1: "Spanish says la puerta 4; English has no article." } }) }) },
        { id: "q_right", s: t("¿Estoy | en | la | sala | correcta?", "Am I | in | the | gate | right?", "Am I at the right gate?",
          { flags: { 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
            neutral: t("¿Estoy | en | la | puerta | correcta?", "Am I | in | the | gate | right?", "Am I at the right gate?") }) },
      ],
    },
    flight: {
      lt: "Say your flight",
      items: [
        { id: "fl_223", s: t("Vuelo | 223 | a | la | Ciudad de México.", "Flight | 223 | to | — | Mexico City.", "Flight 223 to Mexico City.",
          { say: "Vuelo doscientos veintitrés a la Ciudad de México.", flags: { 3: "Spanish says la Ciudad de México; English has no article." } }) },
        { id: "fl_on", s: t("Voy | en | el | vuelo | 223.", "I'm going | on | the | flight | 223.", "I'm on flight 223.", { say: "Voy en el vuelo doscientos veintitrés." }) },
        { id: "bd_bp", s: t("Aquí está | mi | pase de abordar.", "Here is | my | boarding pass.", "Here's my boarding pass.",
          { flags: { 2: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
            neutral: t("Aquí está | mi | tarjeta de embarque.", "Here is | my | boarding pass.", "Here's my boarding pass.") }) },
      ],
    },
    time: {
      lt: "Ask about the time",
      items: [
        { id: "q_ontime", s: t("¿El | vuelo | va | a tiempo?", "The | flight | is going | on time?", "Is the flight on time?") },
        { id: "q_delayed", s: t("¿Viene | retrasado | el | vuelo?", "Is coming | delayed | the | flight?", "Is the flight delayed?") },
        { id: "q_boarding", s: t("¿A | qué | hora | empieza | el | abordaje?", "At | what | time | starts | the | boarding?", "What time does boarding start?", { spain: t("¿A | qué | hora | empieza | el | embarque?", "At | what | time | starts | the | boarding?", "What time does boarding start?") }) },
        { id: "q_departure", s: t("¿A | qué | hora | salimos?", "At | what | time | do we leave?", "What time do we leave?") },
        { id: "q_why", s: t("¿Por qué | viene | retrasado?", "Why | is it coming | delayed?", "Why is it delayed?") },
        { id: "q_group", s: t("¿En | qué | zona | voy?", "In | what | zone | am I going?", "What zone am I in?"), note: "Mexican airlines board by zones (zona 1, 2, 3…); it's on your boarding pass." },
      ],
    },
    more: {
      lt: "Ask something else",
      items: [
        { id: "q_carryon", s: t("¿Puedo | subir | esta | maleta | al | avión?", "Can I | take up | this | suitcase | onto the | plane?", "Can I take this bag on the plane?") },
        { id: "q_wifi", s: t("¿Hay | wifi | a bordo?", "Is there | Wi-Fi | on board?", "Is there Wi-Fi on board?") },
        { id: "q_coffee", s: t("¿Dónde | puedo | comprar | un | café?", "Where | can I | buy | a | coffee?", "Where can I get a coffee?") },
        { id: "q_restroom", s: t("¿Dónde | están | los | baños?", "Where | are | the | restrooms?", "Where's the restroom?", { spain: t("¿Dónde | están | los | aseos?", "Where | are | the | restrooms?", "Where's the restroom?") }) },
        { id: "q_charge", s: t("¿Dónde | puedo | cargar | mi | celular?", "Where | can I | charge | my | cell phone?", "Where can I charge my phone?", { spain: t("¿Dónde | puedo | cargar | mi | móvil?", "Where | can I | charge | my | phone?", "Where can I charge my phone?") }) },
        { id: "q_seat", s: t("¿Puedo | cambiar | de | asiento?", "Can I | change | — | seat?", "Can I change my seat?", { flags: { 2: "cambiar de asiento: Spanish uses de here; English says my seat." } }) },
        { id: "q_gate12", s: t("¿Dónde | está | la | sala | 7?", "Where | is | — | gate | 7?", "Where's gate 7?", { say: "¿Dónde está la sala siete?",
          flags: { 2: "Spanish says la sala 7; English has no article.", 3: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("¿Dónde | está | la | puerta | 7?", "Where | is | — | gate | 7?", "Where's gate 7?", { say: "¿Dónde está la puerta siete?", flags: { 2: "Spanish says la puerta 7; English has no article." } }) }) },
      ],
    },
    thanks: {
      lt: "Say thank you",
      items: [
        { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you very much!") },
        { id: "s_thanks_help", s: t("Gracias | por | su | ayuda.", "Thanks | for | your | help.", "Thanks for your help.") },
      ],
    },
    done: {
      lt: "Say you have no more questions",
      items: [
        { id: "more_all", s: t("Eso | es | todo, | gracias.", "That | is | all, | thanks.", "That's all, thank you.") },
        { id: "more_none", s: t("No, | no tengo | más | preguntas.", "No, | I don't have | more | questions.", "No, no more questions.") },
      ],
    },
    offer: {
      lt: "Answer about checking your bag for free",
      items: [
        { id: "of_yes", s: t("Sí, | documéntela, | por favor.", "Yes, | check it, | please.", "Sure, please check it.", { flags: { 1: "documéntela: check it; la is the bag (la maleta)." }, spain: t("Sí, | factúrela, | por favor.", "Yes, | check it, | please.", "Sure, please check it.") }) },
        { id: "of_yes", s: t("Sí, | buena | idea.", "Yes, | good | idea.", "Sure, good idea.") },
        { id: "of_keep", s: t("No, | gracias, | la | llevo | conmigo.", "No, | thanks, | it | I-take | with me.", "No, thanks, I'll keep it with me.", { flags: { 2: "la: it, the bag (la maleta)." } }) },
        { id: "of_free", s: t("¿Es | gratis?", "Is it | free?", "Is it free?") },
      ],
    },
    board: {
      lt: "Board the plane",
      items: [
        { id: "bd_bp", s: t("Aquí está | mi | pase de abordar.", "Here is | my | boarding pass.", "Here's my boarding pass.",
          { flags: { 2: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
            neutral: t("Aquí está | mi | tarjeta de embarque.", "Here is | my | boarding pass.", "Here's my boarding pass.") }) },
        { id: "bd_here", s: t("Aquí tiene.", "Here you have.", "Here you go.") },
        { id: "bd_can", s: t("¿Ya | puedo | abordar?", "Already | can I | board?", "Can I board now?", { spain: t("¿Ya | puedo | embarcar?", "Already | can I | board?", "Can I board now?") }) },
      ],
    },
    board_early: {
      lt: "Ask if you can board yet",
      items: [
        { id: "bd_can", s: t("¿Ya | puedo | abordar?", "Already | can I | board?", "Can I board now?", { spain: t("¿Ya | puedo | embarcar?", "Already | can I | board?", "Can I board now?") }) },
        { id: "bd_group", s: t("Voy | en | la | zona | 3.", "I'm going | in | — | zone | 3.", "I'm in zone 3.", { say: "Voy en la zona tres.", flags: { 2: "Spanish says la zona 3; English has no article." } }) },
      ],
    },
    show_bp: {
      lt: "Show your boarding pass",
      items: [
        { id: "bd_bp", s: t("Aquí está | mi | pase de abordar.", "Here is | my | boarding pass.", "Here's my boarding pass.",
          { flags: { 2: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
            neutral: t("Aquí está | mi | tarjeta de embarque.", "Here is | my | boarding pass.", "Here's my boarding pass.") }) },
        { id: "bd_here", s: t("Aquí tiene.", "Here you have.", "Here you go.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With airport staff, usted is more polite: puede (puedes is for friends).", better: "¿Me puede cambiar de asiento?" },
  },

  merges: {
    // Spain's twins (11 Nov 2026)
    "ha habido": { reason: "grammatical_fusion", split: "ha → have/has + habido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "no ha llegado": { reason: "grammatical_fusion", split: "ha → have/has + llegado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "no ha empezado": { reason: "grammatical_fusion", split: "ha → have/has + empezado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → offers misreads the service formula: what can I do for you.", minimal: "Three words; qué stays separate." },
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board would hide the compound noun: boarding pass.", minimal: "Three words, one noun." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding is the compound noun boarding pass.", minimal: "Three words, one noun." },
    "ciudad de méxico": { reason: "lexical_expression", split: "ciudad → city + de → of + méxico → Mexico is the city's proper name: Mexico City.", minimal: "The three-word name; la stays separate." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time misreads the fixed adverb: on time.", minimal: "Two words." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that misreads the connector: so.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is the fixed adverb roughly.", minimal: "Three words." },
    "fíjese que": { reason: "lexical_expression", split: "fíjese → notice + que → that is a polite discourse opener: actually / I'm afraid.", minimal: "Two words." },
    "enfrente de": { reason: "lexical_expression", split: "enfrente → in front + de → of is the preposition across from.", minimal: "Two words." },
    "equipaje de mano": { reason: "lexical_expression", split: "equipaje → luggage + de → of + mano → hand is the compound noun carry-on luggage.", minimal: "Three words, one noun." },
    "maleta de mano": { reason: "lexical_expression", split: "maleta → suitcase + de → of + mano → hand is the compound noun carry-on.", minimal: "Three words, one noun." },
    "tome asiento": { reason: "lexical_expression", split: "tome → take + asiento → seat is the fixed invitation have a seat.", minimal: "Two words." },
    "a bordo": { reason: "lexical_expression", split: "a → to + bordo → board(side) misreads the adverb: on board.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → afterwards + de → of is the preposition after.", minimal: "Two words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → not reads backwards in English: not yet.", minimal: "Two words, as a short answer." },
    "que tenga": { reason: "lexical_expression", split: "que → that + tenga → you have is the wish formula: have (a good…).", minimal: "Two words; the wished thing stays separate." },
    "con destino a": { reason: "lexical_expression", split: "con → with + destino → destination + a → to is the fixed travel phrase bound for.", minimal: "Three words; the city stays separate." },
    "y cuarto": { reason: "lexical_expression", split: "y → and + cuarto → quarter: in a length of time it is and a quarter (dos horas y cuarto).", minimal: "Two words." },
    "en un momento": { reason: "lexical_expression", split: "en → in + un → a + momento → moment is the fixed adverb in a moment (the neutral twin of ahorita).", minimal: "Three words." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same is the fixed adverb right now.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "gate", lt: "Ask if this is the right gate" },
    { lt: "Find out when your flight leaves", done: (c) => !!c.s.timeKnown },
    { step: "offer", lt: "Answer about your bag", optional: true },
    { step: "board", lt: "Board the plane" },
  ],

  steps: [
    { id: "gate", done: (c) => !!c.s.gateOk,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      // the time questions are suggested here too: expected, so "¿A qué hora sale el vuelo 223?" is one question with its flight
      expects: ["ask_gate", "give_bp", "ask_ontime", "ask_delayed", "ask_delay_reason", "ask_boarding_time", "ask_departure"],
      suggest: [{ lt: "Ask if this is the right gate", hint: "gate" }, { lt: "Ask if the flight is on time", hint: "time" }],
      help: (c) => { c.say("gate4_here"); c.say("which_flight"); expectFlight(c); } },
    { id: "time", when: (c) => !!c.s.gateOk, done: (c) => !!c.s.timeKnown || !!c.s.helpDone,
      ask: (c) => c.say("ask_more"),
      expects: QUESTIONS,
      suggest: [
        { lt: "Ask if the flight is on time", hint: "time" },
        { lt: "Ask about your bag, Wi-Fi, coffee…", hint: "more" },
      ],
      yes: (c) => { if (plainAck(c.heard)) { helpDone(c); return; } c.say("what_q"); c.hold(); },
      no: (c) => { helpDone(c); } },
    { id: "help", when: (c) => !!c.s.gateOk && !!c.s.timeKnown, done: (c) => !!c.s.helpDone,
      ask: (c) => c.say("ask_more"),
      expects: QUESTIONS,
      suggest: [
        { lt: "Say you have no more questions", hint: "done" },
        { lt: "Ask something else", hint: "more" },
      ],
      yes: (c) => { if (plainAck(c.heard)) { helpDone(c); return; } c.say("what_q"); c.hold(); },
      no: (c) => { helpDone(c); } },
    { id: "offer", when: (c) => !!c.s.fullFlight && !!c.s.helpDone, done: (c) => !!c.s.offerDone,
      ask: (c) => { offerGateCheck(c); } },
    { id: "board", when: (c) => !!c.s.helpDone, done: (c) => !!c.s.boarded,
      ask: (c) => {
        if (c.s.earlyGroup && !c.s.earlyDone) {
          c.s.earlyDone = true;
          announce(c, 2);
          expectEarly(c);
          return;
        }
        if (c.s.called !== 3) { announce(c, 3); return; }
        c.say("scan_ask");
      },
      expects: ["give_bp", "give_bp_ctx", "can_board", "zone_ctx", "ask_id", "coming_ctx"],
      suggest: [{ lt: "Hand over your boarding pass", hint: "board" }],
      yes: (c) => { expectScan(c); } },
  ],

  init: (c) => {
    c.s.delay = c.chance(0.5);
    c.s.reason = c.pick(["plane", "crew", "weather"]);
    c.s.gateChange = c.visits >= 1 && c.chance(0.45);
    c.s.fullFlight = c.visits >= 1 && c.chance(0.35);
    c.s.earlyGroup = c.chance(0.35);
  },

  start: (c) => {
    c.s.greeted = true;
    c.say("greet");
    c.hold(); // the greeting asks "¿En qué le puedo ayudar?" for the "gate" step
  },

  handlers: {
    affirm(c) { const st = gate.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); },
    deny(c) { const st = gate.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    g_bye(c) {
      // "¡Ya voy!" / "Ahí voy" (I'm coming) at the boarding call is read as "ya me voy" by the tolerance: no goodbye there
      const h = fold(c.heard);
      if (c.step === "board" && !c.s.boarded && /^\s*((ya|ahi|ahorita)\s+)?voy\b/.test(h) && !/\bme voy\b/.test(h)) { gate.handlers.g_ok(c, {}, undefined as any); return; }
      c.say("g_bye"); c.end(); c.hold();
    },
    ask_gate(c, slots) {
      const h = fold(c.heard);
      const asksGate4 = /\b(sala|puerta) (4|cuatro)\b/.test(h) && !slots.city && (slots.number === 4 || slots.number === undefined);
      if (asksGate4) {
        if (c.s.gateOk) { c.say(c.s.moved ? "gate7_not4" : "gate4_for_223"); return; }
        if (c.s.gateChange) { c.say("gate4_here"); confirmGate(c); return; }
        c.say("gate4_for_223"); confirmGate(c, true);
        return;
      }
      // "¿Es la sala 7?": a gate number, not a flight number ("Mmm, de esta sala sale el vuelo 223" was wrong after the change)
      const gm = h.match(/\b(?:sala|puerta) (\d{1,2}|uno|dos|tres|cinco|seis|siete|ocho|nueve|diez)\b/);
      if (gm && !slots.city && !slots.f && !/223|doscientos|vuelo|ciudad de mexico|cdmx|\bmexico\b|\bdf\b/.test(h)) {
        const seven = gm[1] === "7" || gm[1] === "siete";
        if (seven && c.s.gateChange && !c.s.gateOk) { confirmGate(c); return; }
        if (c.s.moved) { c.say(seven ? "gate7_is" : "gate7_not4"); return; }
        c.say("gate4_here");
        if (!c.s.gateOk) { c.say("which_flight"); expectFlight(c); }
        return;
      }
      if (slots.number === undefined && !slots.f && !slots.city) {
        // "¿Es aquí? Voy en el vuelo 223.": the flight comes in another part of the same turn, which answers it
        if (/\d|doscientos|ciudad de mexico|cdmx|\bmexico\b|\bdf\b/.test(h)) { if (/223|doscientos veintitres|ciudad de mexico|cdmx|\bmexico\b|\bdf\b/.test(h)) confirmGate(c); return; }
        // "¿Cuál es mi sala?" once the flight is known: the gate, without a "Sí" (rule 11)
        if (c.s.gateOk && /\bcual\b/.test(h)) { c.say(c.s.moved ? "gate7_dir" : "gate4_here"); return; }
        if (c.s.gateOk) { c.say(c.s.moved ? "gate7_yes" : "gate_yes"); return; }
        c.say("which_flight"); expectFlight(c); return;
      }
      flightGiven(c, slots);
    },
    flight_info_ctx(c, slots) { if (articleOne(c, slots)) return; flightGiven(c, slots); },
    need_help(c) { c.say("what_q"); c.hold(); },
    give_bp(c) {
      if (c.step === "board" || c.s.called === 3) { boardingOk(c); return; }
      if (c.s.called === 2) { c.say("not_yet"); return; }
      if (!c.s.gateOk) { c.say("bp_thanks"); confirmGate(c); return; }
      c.say("bp_thanks");
    },
    give_bp_ctx(c) { gate.handlers.give_bp(c, {}, undefined as any); },
    ask_ontime(c, slots) { withFlight(c, "ontime", slots); },
    ask_delayed(c, slots) { withFlight(c, "delayed", slots); },
    ask_delay_reason(c) { withFlight(c, "delay_reason"); },
    why_short(c) { if (c.s.gateOk && c.s.timeKnown) QUESTION_LINES.delay_reason(c); else c.say("clarify_what"); },
    // (once boarding has started, "¿Cuándo puedo abordar?" is about the learner's zone)
    ask_boarding_time(c, slots, seg) {
      if (c.s.called && /\b(puedo|podemos) (abordar|pasar|subir)\b/.test(fold(c.heard))) { gate.handlers.can_board(c, slots, seg); return; }
      withFlight(c, "boarding", slots);
    },
    ask_departure(c, slots) { withFlight(c, "departure", slots); },
    ask_group(c, _slots, seg) {
      // "¿Qué zona está pasando?" asks about the call, not the learner's own zone
      if ((seg?.tags || []).includes("now")) {
        if (c.s.called) { c.say("zone_now", { num: c.s.called }); if (c.s.called === 2) c.say("group_after"); }
        else { c.say("boarding_not_started"); boardingInfo(c); }
        return;
      }
      // "¿Cuándo me toca?" asks when, not which zone (rule 11): zone 3 goes right after zone 2
      if (/\bcuando\b/.test(fold(c.heard))) {
        if (c.s.called === 3) { c.say("zone_now", { num: 3 }); expectScan(c); return; }
        c.say("group_after");
        // before the call, the boarding time too (with the delay, if it hasn't been said)
        if (!c.s.called && c.s.gateOk && !c.s.boardingTold) QUESTION_LINES.boarding(c);
        return;
      }
      c.say("group_info");
    },
    ask_carryon(c) {
      c.s.topic = "carryon";
      // "¿Cuántas maletas puedo llevar?" gets the allowance, not "Sí, …" (rule 11)
      const wh = /\bcuant[oa]s?\b/.test(fold(c.heard));
      if (c.s.fullFlight && !c.s.offerDone) { if (wh) { c.say("carryon_how"); offerGateCheck(c); } else { c.say("carryon_full"); offerGateCheck(c, true); } return; }
      c.say(wh ? "carryon_how" : "carryon_ok");
    },
    ask_wifi(c) {
      c.s.topic = "wifi";
      const h = fold(c.heard);
      // "¿El wifi es gratis?" / "¿Hay wifi aquí?" get their own answers (rule 11)
      if (/gratis|cuanto|cobran|pagar|se paga/.test(h)) c.say("free_wifi");
      else if (/\b(aqui|sala|aeropuerto)\b/.test(h) && !/avion|bordo|vuelo/.test(h)) c.say("wifi_here");
      else c.say("wifi");
    },
    ask_coffee(c) { c.say("coffee"); if (!c.s.helpDone) c.say("coffee_time"); },
    // lo / la agree with what's taken on board: mi café → lo, mi agua / mi comida / mi torta → la (rule 9)
    ask_food(c, _slots, seg) {
      if (!(seg?.tags || []).includes("bring")) { c.say("food_onboard"); return; }
      c.say(/\b(comida|agua|torta|botella|bebida)\b/.test(fold(c.heard)) ? "food_bring_f" : "food_bring");
    },
    ask_restroom(c) { c.say("restroom"); },
    ask_charge(c) { c.say("charge"); },
    ask_duration(c) { c.say(/a que hora|cuando/.test(fold(c.heard)) ? "arrival" : "duration"); },
    // "¿Hay asientos libres?" on a full flight is "No, …", not "Sí, hoy va lleno" (rule 11)
    ask_full(c) { c.say(!c.s.fullFlight ? "full_no" : /\b(hay|quedan)\b/.test(fold(c.heard)) ? "full_seats_no" : "full_yes"); },
    ask_seat_change(c) {
      c.s.topic = "seat";
      if (c.s.seatChanged) { c.say(c.s.newSeat === "aisle" ? "seat_now_aisle" : "seat_now"); return; }
      // an aisle seat when the learner asks for the aisle (the window seat 16A otherwise)
      const aisle = /pasillo/.test(fold(c.heard));
      c.say(aisle ? "seat_offer_aisle" : "seat_offer"); c.say("seat_offer_q");
      const seatYes = (cc: Ctx) => { cc.s.seatChanged = true; cc.s.newSeat = aisle ? "aisle" : "window"; cc.say("seat_changed"); cc.event("give", { item: "boarding-pass" }); };
      ask(c, { id: "seat_offer", hints: ["g_yesno"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
        yes: seatYes,
        no: (cc) => { cc.say("no_problem"); },
        // "¡Ay, qué bien, gracias!" = yes; "No, así estoy bien" = no (not "no more questions")
        on: {
          more_no: (cc) => { if (GREAT.test(fold(cc.heard))) seatYes(cc); else cc.say("no_problem"); },
          g_thanks: (cc) => { if (GREAT.test(fold(cc.heard))) seatYes(cc); else cc.say("no_problem"); },
          g_ok: (cc) => { seatYes(cc); },
        },
        ask: (cc) => cc.say("seat_offer_q") });
    },
    // "¿Dónde está la sala 7?" (a hint even without the gate change) gets the way there, never "Esta es la sala 4"
    ask_gate12(c) { c.say("gate7_dir"); },
    ask_my_seat(c) { c.say(!c.s.seatChanged ? "flight_help" : c.s.newSeat === "aisle" ? "seat_now_aisle" : "seat_now"); },
    ask_id(c) { c.say("id_passport"); },
    no_bag_ctx(c) { noBag(c); },
    must_q_ctx(c) { c.say("offer_optional"); },
    coming_ctx(c) { gate.handlers.g_ok(c, {}, undefined as any); },
    can_board(c) {
      if (c.s.called === 3) { c.say("yes_board"); expectScan(c); return; }
      if (c.s.called === 2) { c.say("not_yet"); return; }
      if (c.s.gateOk && !c.s.helpDone) { c.say("not_yet_short"); if (c.s.timeKnown && !c.s.boardingTold) boardingInfo(c); helpDone(c, true); return; }
      c.say(c.s.delay ? "boarding_late" : "boarding_time", { time: c.s.delay ? TIMES.boardingLate : TIMES.boarding });
      c.s.timeKnown = true;
    },
    keep_bag(c) { if (c.s.bagChecked) { c.s.bagChecked = false; } c.say("no_problem"); },
    zone_ctx(c, slots, seg) { gate.handlers.can_board(c, slots, seg); },
    bag_amb_ctx(c) { c.say("bag_which"); },
    keep_bag_ctx(c) { gate.handlers.keep_bag(c, {}, undefined as any); },
    flight_dunno_ctx(c) { c.say("flight_help"); },
    offer_yes(c) {
      if (c.s.offerDone && !c.s.bagChecked) { checkBag(c); return; }
      c.say("no_problem");
    },
    bag_check_q(c) { if (c.s.offerDone) bagWhere(c); else c.say("bag_back_cdmx"); },
    ask_free(c) {
      const topic = c.s.topic as string | undefined;
      if (topic === "wifi") c.say("free_wifi");
      else if (topic === "carryon" || topic === "seat" || c.s.offerDone) freeAnswer(c);
      else c.say("clarify_what");
    },
    more_no(c) { if (c.s.gateOk && !c.s.helpDone) helpDone(c); },
    // a plain "Gracias" to "¿Algo más?" = no more questions (otherwise the ordinary thanks)
    g_thanks(c, slots) {
      if ((c.step === "help" || c.step === "time") && c.s.gateOk && !c.s.helpDone && PLAIN_THANKS.test(fold(c.heard))) { c.say("g_welcome"); helpDone(c); return; }
      GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
    },
    more_q(c) { c.say("what_q"); c.hold(); },
    g_ok(c) {
      if (c.step === "help" || c.step === "time") { helpDone(c); return; }
      if (c.step === "board" && c.s.called === 3) { expectScan(c); }
    },
  },

  finish: (c) => {
    c.complete();
    ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // every hint construction
    { say: "¿Es esta la sala del vuelo 223?", intent: "ask_gate", step: "gate", slots: { number: 223 } },
    { say: "¿De aquí sale el vuelo a la Ciudad de México?", intent: "ask_gate", slots: { city: "cdmx" } },
    { say: "¿Es la sala 4?", intent: "ask_gate", slots: { number: 4 } },
    { say: "¿Estoy en la sala correcta?", intent: "ask_gate" },
    { say: "Vuelo 223 a la Ciudad de México.", intent: "ask_gate", step: "gate", slots: { number: 223, city: "cdmx" } },
    { say: "Voy en el vuelo 223.", intent: "ask_gate", slots: { number: 223 } },
    { say: "Aquí está mi pase de abordar.", intent: "give_bp" },
    { say: "¿El vuelo va a tiempo?", intent: "ask_ontime" },
    { say: "¿Viene retrasado el vuelo?", intent: "ask_delayed", not: ["ask_ontime"] },
    { say: "¿A qué hora empieza el abordaje?", intent: "ask_boarding_time" },
    { say: "¿A qué hora salimos?", intent: "ask_departure" },
    { say: "¿Por qué viene retrasado?", intent: "ask_delay_reason" },
    { say: "¿En qué zona voy?", intent: "ask_group" },
    { say: "¿Puedo subir esta maleta al avión?", intent: "ask_carryon" },
    { say: "¿Hay wifi a bordo?", intent: "ask_wifi" },
    { say: "¿Dónde puedo comprar un café?", intent: "ask_coffee" },
    { say: "¿Dónde están los baños?", intent: "ask_restroom" },
    { say: "¿Dónde puedo cargar mi celular?", intent: "ask_charge" },
    { say: "¿Puedo cambiar de asiento?", intent: "ask_seat_change" },
    { say: "¿Dónde está la sala 7?", intent: "ask_gate12", not: ["ask_gate"] },
    { say: "Eso es todo, gracias.", intent: "more_no", step: "help" },
    { say: "No, no tengo más preguntas.", intent: "more_no", step: "help" },
    { say: "Sí, buena idea.", intent: "offer_yes" },
    { say: "No, gracias, la llevo conmigo.", intent: "keep_bag", not: ["offer_yes"] },
    { say: "¿Es gratis?", intent: "ask_free" },
    { say: "¿Ya puedo abordar?", intent: "can_board" },
    { say: "Voy en la zona 3.", intent: "can_board", slots: { number: 3 } },
    // natural alternatives, short answers, no accents, tú to staff
    { say: "disculpe es la sala del vuelo 223 a la ciudad de mexico", intent: "ask_gate", slots: { number: 223, city: "cdmx" } },
    { say: "¿El vuelo 223 sale de aquí?", intent: "ask_gate", slots: { number: 223 } },
    { say: "¿De qué sala sale el vuelo a México?", intent: "ask_gate", slots: { city: "cdmx" } },
    { say: "¿Es la sala del vuelo 225?", intent: "ask_gate", slots: { number: 225 } },
    { say: "¿Me puedes decir si esta es la sala del vuelo 223?", intent: "ask_gate" },
    { say: "¿Salimos a tiempo?", intent: "ask_ontime" },
    { say: "¿Hay algún retraso?", intent: "ask_delayed" },
    { say: "¿Cuánto falta para abordar?", intent: "ask_boarding_time" },
    { say: "¿Me da tiempo de comprar algo de comer?", intent: "ask_coffee", not: ["can_board"] },
    { say: "¿Hay contactos por aquí?", intent: "ask_charge" },
    { say: "¿Venden algo de comer a bordo?", intent: "ask_food" },
    { say: "¿Cuánto dura el vuelo?", intent: "ask_duration" },
    { say: "¿El vuelo va lleno?", intent: "ask_full" },
    { say: "¿Me puedes cambiar de asiento?", intent: "ask_seat_change" },
    { say: "Bueno, me siento allá.", intent: "more_no", step: "help" },
    { say: "Tengo otra pregunta.", intent: "more_q", step: "help" },
    { say: "Muchas gracias", intent: "g_thanks", step: "help" },
    { say: "Prefiero llevarla conmigo.", intent: "keep_bag" },
    { say: "No la necesito en el avión.", intent: "none", not: ["offer_yes", "keep_bag"] },
    { say: "¿Dónde la recojo?", intent: "bag_check_q" },
    { say: "Esa es mi zona.", intent: "can_board" },
    { say: "Lo tengo en el celular.", intent: "give_bp" },
    // Spain forms (understood, never said by the town's people)
    { say: "¿Dónde puedo cargar el móvil?", intent: "ask_charge" },
    { say: "¿Dónde están los aseos?", intent: "ask_restroom" },
    { say: "¿Tenéis wifi en el avión?", intent: "ask_wifi" },
    { say: "Vale, factúrela, por favor.", intent: "offer_yes" },
    // meaning kept
    { say: "Esta no es mi sala.", intent: "none" },
    { say: "No necesito wifi.", intent: "none" },
    { say: "No quiero cambiar de asiento.", intent: "none" },
    { say: "No estoy en la zona 3.", intent: "none", step: "board" },
    { say: "No me la documente.", intent: "keep_bag", not: ["offer_yes"] },
    { say: "No es buena idea.", intent: "none" },
    { say: "No, mejor documéntela.", intent: "offer_yes", not: ["keep_bag"] },
    { say: "No tengo hambre.", intent: "none" },
    { say: "¿No hay retraso?", intent: "ask_delayed", not: ["ask_ontime"] },
    { say: "Tengo hambre, ¿hay algún lugar para comer?", intent: "ask_coffee" },
    // review: breadth and meaning safety
    { say: "¿Cuánto cuesta el wifi?", intent: "ask_wifi" },
    { say: "¿Dónde hay un baño?", intent: "ask_restroom" },
    { say: "¿Cuál es la hora de abordaje?", intent: "ask_boarding_time" },
    { say: "¿Puedo sentarme junto a mi esposa?", intent: "ask_seat_change" },
    { say: "¿Puedes cambiarme a un asiento de ventanilla?", intent: "ask_seat_change" },
    { say: "¿Hay algún lugar para cargar el móvil?", intent: "ask_charge" },
    { say: "¿Me puede dar un asiento de pasillo?", intent: "ask_seat_change" },
    { say: "No, no me lo cambie.", intent: "deny", not: ["affirm"] },
    { say: "No, me quedo en el pasillo.", intent: "deny", not: ["affirm"] },
    { say: "No, gracias, me la llevo.", intent: "keep_bag", not: ["offer_yes"] },
    { say: "No la documente, traigo mi computadora adentro.", intent: "keep_bag", not: ["offer_yes"] },
    { say: "¿La cuatro?", intent: "none", not: ["can_board"] },
    { say: "No encuentro mi pase de abordar.", intent: "none", not: ["give_bp", "give_bp_ctx"] },
    { say: "Todavía no encuentro mi pase.", intent: "none", not: ["give_bp", "give_bp_ctx"] },
    { say: "No quiero cambiar de asiento, solo quería saber si hay retraso.", intent: "none", not: ["ask_seat_change"] },
    // audit (5 Nov 2026): side questions, the counter-request at the seat offer, "¡Ya voy!" at the boarding call
    { say: "¿Cuál es mi asiento?", intent: "ask_my_seat" },
    { say: "¿Qué asiento tengo?", intent: "ask_my_seat" },
    { say: "¿Sirve mi pasaporte?", intent: "ask_id" },
    { say: "¿Necesito mi pasaporte?", intent: "ask_id" },
    { say: "Aquí tiene mi pasaporte.", intent: "give_bp", not: ["ask_id"] },
    { say: "No necesito mi pasaporte.", intent: "none", not: ["ask_id"] },
    { say: "¿No tiene uno de pasillo?", intent: "ask_seat_change" },
    { say: "¿Cuándo me toca?", intent: "ask_group" },
    { say: "¿Cuál es mi sala?", intent: "ask_gate", step: "gate" },
    { say: "¿Cuánto tiempo de retraso hay?", intent: "ask_delayed" },
    { say: "¡Ya voy!", intent: "coming_ctx", step: "board", not: ["g_bye"] },
    { say: "Ya me voy, adiós.", intent: "g_bye" },
    // the flight and the time question in one turn: never the gate question alone ("Sí, aquí sale…" to "¿va a tiempo?")
    { say: "¿El vuelo 223 va a tiempo?", intent: "ask_ontime", step: "gate", slots: { number: 223 }, not: ["ask_gate"] },
    { say: "Voy en el vuelo 223, ¿va a tiempo?", intent: "ask_ontime", step: "gate", slots: { number: 223 }, not: ["ask_gate"] },
    { say: "¿A qué hora sale el vuelo 223?", intent: "ask_departure", step: "gate", slots: { number: 223 } },
    // not understood
    { say: "Me gustan los aviones azules.", intent: "none" },
    { say: "El perro come pizza en la luna.", intent: "none" },
    { say: "Mi abuela toca la guitarra.", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["¿Es esta la sala del vuelo 223 a la Ciudad de México?", "¿El vuelo va a tiempo?", "No, es todo. Gracias.", "¡Gracias!", "Aquí está mi pase de abordar."],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = false; } },
    { name: "questions first, the flight asked back", turns: ["¿El vuelo va a tiempo?", "El 223, a la Ciudad de México.", "¿En qué zona voy?", "¿Hay wifi a bordo?", "¿Es gratis?", "¿Dónde puedo comprar un café?", "Eso es todo, gracias.", "Ok.", "Aquí tiene."],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = false; } },
    { name: "wrong flight number, seat change, early boarding", turns: ["¿Es la sala del vuelo 225?", "Aquí está mi pase de abordar.", "¿Puedo cambiar de asiento?", "Sí, por favor.", "¿Por qué viene retrasado?", "No, no tengo más preguntas.", "Gracias.", "¿Ya puedo abordar? Voy en la zona 3.", "Aquí tiene."],
      expect: { complete: true, state: { seatChanged: true } }, auto: { ...AUTO, seat_offer: "Sí, por favor." }, setup: (s) => { s.gateChange = false; s.fullFlight = false; } },
    { name: "change of mind: no seat change after all, then the bag questions", turns: ["¿De aquí sale el vuelo a la Ciudad de México?", "¿A qué hora empieza el abordaje?", "Quisiera cambiar de asiento.", "No, gracias, me quedo en mi asiento.", "¿Puedo subir esta maleta al avión?", "¿Dónde están los baños?", "Nada más, gracias.", "Gracias.", "Aquí tiene."],
      expect: { complete: true, state: { seatChanged: undefined } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = false; } },
    { name: "twist: gate change", turns: ["¿Es la sala 4?", "¿Es la sala 7?", "¿Dónde está la sala 7?", "¿Va a tiempo?", "Es todo, gracias.", "Gracias.", "Aquí está mi pase de abordar."],
      expect: { complete: true, state: { moved: true } }, auto: AUTO, setup: (s) => { s.gateChange = true; s.fullFlight = false; } },
    { name: "twist: full flight, the bag is checked at the gate", turns: ["Voy en el vuelo 223 a la Ciudad de México.", "¿El vuelo viene retrasado?", "¿Puedo subir esta maleta al avión?", "¿Tengo que pagar algo?", "Sí, documéntela, por favor.", "¿La recojo en la Ciudad de México?", "¿Hay asientos libres?", "Eso es todo, gracias.", "Gracias.", "Aquí tiene."],
      expect: { complete: true, state: { bagChecked: true, offerDone: true } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = true; } },
    { name: "twist: full flight offered at the end, kept", turns: ["¿Estoy en la sala correcta? Voy en el vuelo 223.", "¿A qué hora salimos?", "No, no tengo más preguntas.", "No, gracias, la llevo conmigo. Traigo mi laptop adentro.", "Aquí tiene mi pase y mi pasaporte."],
      expect: { complete: true, state: { offerDone: true, bagChecked: false } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = true; } },
    { name: "twist: full flight, an ambiguous no is asked again", turns: ["¿Es la sala del vuelo 223?", "¿A qué hora empieza el abordaje?", "Eso es todo, gracias.", "Gracias.", "No la necesito en el avión.", "Documéntela, por favor.", "Aquí tiene."],
      expect: { complete: true, state: { bagChecked: true, offerDone: true } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = true; s.earlyGroup = false; } },
    { name: "a corrected flight, an aisle seat, zone 2 called first", turns: ["¿El vuelo va a tiempo?", "No es el 225, es el 223.", "¿Me puede dar un asiento de pasillo?", "¿Tiene costo?", "Sí, por favor.", "¿Cuántas maletas puedo llevar?", "No, todo bien.", "Gracias.", "¿La tres?", "¿Qué zona está pasando?", "Aquí tiene."],
      expect: { complete: true, state: { seatChanged: true, newSeat: "aisle" } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = false; s.earlyGroup = true; } },
    { name: "short answers", turns: ["¿Es aquí?", "El 223.", "¿A tiempo?", "Nada más.", "Ok.", "Tenga."],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = false; } },
    // audit (5 Nov 2026): "Un momento" is no flight 1; no bag to check; "¡Ya voy!" is no goodbye; the passport as ID
    { name: "twist: full flight, only a backpack, the passport", turns: ["¿El vuelo va a tiempo?", "Un momento.", "El 223.", "¿Cuál es mi asiento?", "Eso es todo, gracias.", "Gracias.", "Solo traigo una mochila.", "¡Ya voy!", "¿Sirve mi pasaporte?", "Aquí tiene."],
      expect: { complete: true, state: { offerDone: true, bagChecked: false } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = true; s.earlyGroup = false; } },
    { name: "twist: gate change, the flight and the time in one turn", turns: ["Hola, ¿es la sala del vuelo 223? ¿Va a tiempo?", "¿Cuál es mi sala?", "¿A qué hora salimos?", "No, gracias.", "Gracias.", "Aquí tiene."],
      expect: { complete: true, state: { moved: true, timeKnown: true } }, auto: AUTO, setup: (s) => { s.gateChange = true; s.fullFlight = false; s.earlyGroup = false; } },
    { name: "twist: full flight, an aisle seat asked back, optional gate check, no bag", turns: ["¿Cuál es mi sala?", "Vuelo 223.", "¿Puedo cambiar de asiento?", "¿No tiene uno de pasillo?", "Sí, por favor.", "¿Cuál es mi nuevo asiento?", "¿Cuándo me toca?", "No, gracias.", "Gracias.", "¿Tengo que documentarla?", "No traigo maleta.", "Aquí tiene."],
      expect: { complete: true, state: { seatChanged: true, newSeat: "aisle", offerDone: true, bagChecked: false } }, auto: AUTO, setup: (s) => { s.gateChange = false; s.fullFlight = true; s.earlyGroup = false; } },
  ],
};

function expectEarly(c: Ctx) {
  const notYet = (cc: Ctx) => { if (!cc.s.notYetTold) { cc.s.notYetTold = true; cc.say("not_yet"); expectEarly(cc); } };
  ask(c, {
    id: "early", hints: ["board_early"], expects: ["can_board", "zone_ctx", "give_bp", "give_bp_ctx", "ask_group", "coming_ctx"],
    suggest: [{ lt: "Ask if you can board yet", hint: "board_early" }],
    on: {
      can_board: (cc) => { notYet(cc); },
      zone_ctx: (cc) => { notYet(cc); },
      coming_ctx: (cc) => { notYet(cc); },
      give_bp: (cc) => { notYet(cc); },
      give_bp_ctx: (cc) => { notYet(cc); },
      ask_group: (cc, _sl, seg) => {
        // "¿Cuándo me toca?" gets only "La zona 3 pasa justo después de la 2"
        if ((seg?.tags || []).includes("now")) cc.say("zone_now", { num: 2 }); else if (!/\bcuando\b/.test(fold(cc.heard))) cc.say("group_info");
        cc.say("group_after"); expectEarly(cc);
      },
      g_ok: () => {}, g_thanks: () => {}, more_no: () => {}, g_howareyou_answer: () => {},
    },
    yes: () => {}, no: () => {},
  });
}

function helpDone(c: Ctx, afterNotYet = false) {
  c.s.helpDone = true;
  if (!c.s.timeKnown) {
    c.s.timeKnown = true;
    if (c.s.delay) { c.say("delay"); c.s.delayTold = true; }
    boardingInfo(c);
  } else if (!c.s.boardingTold) boardingInfo(c);
  c.say(afterNotYet ? "have_seat_wait" : "have_seat");
  ask(c, {
    id: "wait", hints: ["thanks", "more"], expects: ["can_board"],
    suggest: [{ lt: "Say thanks and wait", hint: "thanks" }, { lt: "Ask something else", hint: "more" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); },
      g_ok: () => {}, more_no: () => {}, g_howareyou_answer: () => {},
      can_board: (cc) => { cc.say("not_yet_short"); },
    },
    yes: () => {}, no: () => {},
  });
}

export default gate;
