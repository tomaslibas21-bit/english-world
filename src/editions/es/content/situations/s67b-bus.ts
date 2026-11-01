// Song 67 "Single or Return?" (part 2 of 2) → Puerto Colibrí: "¿Este camión va al centro?"
// The city bus (el camión, route 7) at the stop outside the bus terminal; Ana is the driver. As in a small town on
// Mexico's Caribbean coast: you ask whether it goes where you need ("¿Pasa por el centro?"), pay the driver on
// boarding ($12, cash only; the driver gives change for small bills, not for a 500), ask her to tell you where to get
// off ("¿Me avisa dónde me bajo?"), and get off by pressing the buzzer or calling out "¡Bajan!".
// No day passes, no cards, no free transfers: those questions get honest Mexican answers.
// Variation: Ana may ask "¿Sabe dónde bajarse?"; she may call out another stop before yours ("¡Iglesia! ¿Bajan?").
// Twists: a 500-peso bill with no change (the learner's choice: she gives the change later, on the way);
// visits ≥ 1: "Perdón, voy fuera de servicio. Súbase al 12, viene atrás de mí."
// Mexican-only words in Ana's lines (camión, nomás, pásele) have neutral twins; she mostly says "la ruta" and "el 12".

// NEEDS: lang.ts yes/no — "no traigo" (= no tengo, "I don't have any on me") in the `no` list; covered here by
//        no_smaller_ctx at "¿No trae algo más chico?".

import type { Ctx, EntityDef, Pending, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Where the route goes. `stops` and `mins` are what Ana says ("como 4 paradas", "como 10 minutos"); `stop` is the
// stop the learner gets off at (an entity of its own: the museum's stop is the zócalo, which it faces).
// Unserved places name the line that says how to get there instead (`where`).

const P = (id: string, es: string, en: string, g: "m" | "f", forms: string[], attrs: Record<string, any>) =>
  ent(id, es, en, g, { forms, art: "", attrs });

const DESTS: EntityDef[] = [
  P("centro", "centro", "center", "m", ["el centro", "zocalo", "el zocalo", "la plaza", "plaza principal", "la plaza principal", "centro del pueblo", "el centro del pueblo", "kiosco", "el kiosco"],
    { served: true, stops: 4, mins: 10, stop: "p_zocalo", nat: "town center", loc: "town-square" }),
  P("mercado", "mercado", "market", "m", ["el mercado", "mercado municipal", "el mercado municipal"],
    { served: true, stops: 3, mins: 10, stop: "p_mercado", loc: "market" }),
  P("museo", "museo", "museum", "m", ["el museo", "museo de la costa maya", "el museo de la costa maya"],
    { served: true, stops: 4, mins: 10, stop: "p_zocalo", loc: "museum" }),
  P("clinica", "clínica", "clinic", "f", ["la clinica", "clinica familiar", "la clinica familiar", "hospital", "el hospital", "centro de salud", "el centro de salud"],
    { served: true, stops: 6, mins: 15, stop: "p_clinica", loc: "clinic" }),
  P("malecon", "malecón", "seafront", "m", ["el malecon", "muelle", "el muelle", "el puerto", "puerto"],
    { served: true, stops: 6, mins: 15, stop: "p_muelle", nat: "malecón", loc: "the-pier" }),
  P("hotel", "Hotel | Mar Azul", "Hotel | Mar Azul", "m", ["hotel mar azul", "el hotel mar azul", "mar azul", "el mar azul", "el hotel", "hotel"],
    { served: true, stops: 7, mins: 20, stop: "p_hotel", nat: "Hotel Mar Azul", loc: "hotel" }),
  P("playa", "playa", "beach", "f", ["la playa", "playa publica", "la playa publica"],
    { served: true, stops: 8, mins: 20, stop: "p_playa", last: true }),
  P("aeropuerto", "aeropuerto", "airport", "m", ["el aeropuerto"], { served: false, where: "where_airport" }),
  P("cenote", "cenote", "cenote", "m", ["el cenote", "los cenotes", "cenotes", "un cenote"], { served: false, where: "where_cenote" }),
];

/** The stops Ana names ("Se baja en el zócalo"). */
const STOPS: EntityDef[] = [
  ent("p_zocalo", "zócalo", "town square", "m", { art: "" }),
  ent("p_mercado", "mercado", "market", "m", { art: "" }),
  ent("p_clinica", "clínica", "clinic", "f", { art: "" }),
  ent("p_muelle", "muelle", "pier", "m", { art: "" }),
  ent("p_hotel", "hotel", "hotel", "m", { art: "" }),
  ent("p_playa", "playa", "beach", "f", { art: "" }),
];

const D = (id: string) => DESTS.find((e) => e.id === id)!;
const FARE = 1200;
/** Bills and coins Ana gives change for (paid − fare, in cents). Above $100 she has no change. */
const CHANGE: Record<number, number> = { 1500: 300, 2000: 800, 5000: 3800, 10000: 8800 };
const BIG = [20000, 50000, 100000];

const AUTO: Record<string, string> = {
  dest: "¿Este camión va al mercado?",
  fare: "Aquí tiene",
  smaller: "No, no traigo",
  known: "No, ¿me avisa?",
  stop: "Gracias",
  seated: "Gracias",
  mid: "¿Aquí me bajo?",
  next: "¡Bajan!",
  oos_dest: "¿El 12 va al mercado?",
};

// ---------------------------------------------------------------------------

/** c.expect() that also takes "Sí, ya sé" / "No, es mi primera vez" (affirm/deny) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}


const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Does the learner's sentence name a place? ("¿Cuánto cuesta al centro?" is read as two pieces: the question, then
 *  the place; the question waits for the place.) */
function mentionsDest(c: Ctx): boolean {
  const heard = ` ${fold(c.heard).replace(/[^a-z0-9ñ ]+/g, " ")} `;
  return DESTS.some((e) => [e.en.replace(/ \| /g, " "), ...(e.forms ?? [])].some((f) => heard.includes(` ${fold(f)} `)));
}

/** A question about the fare, the stops or the time that waited for the place. */
function answerDeferred(c: Ctx, q: string) {
  const e = D(c.s.dest);
  if (q === "fare") { c.s.fareSaid = true; c.s.fareQuiet = true; c.say("fare_is", { fare: FARE }); }
  else if (q === "stops") { c.s.stopsTold = true; c.say("stops_count", { num: e.attrs!.stops }); }
  else c.say("ride_time", { num: e.attrs!.mins });
}

/** The destination: "q" a question ("¿Va al centro?"), "is" ("¿Este es el del centro?"), "stmt" ("Voy al centro"). */
function setDest(c: Ctx, id: string, kind: "q" | "is" | "stmt" = "q") {
  const e = D(id);
  const deferred = c.s.deferQ as string | undefined;
  c.s.deferQ = undefined;
  if (!e.attrs?.served) {
    c.s.unserved = id;
    // "¿Cuánto cuesta al aeropuerto?" gets no "No,"
    c.say(c.s.oos ? "oos_no" : deferred ? "goes_no_plain" : "goes_no", { X: id });
    c.say(e.attrs!.where);
    c.hold();
    return;
  }
  const first = !c.s.dest;
  if (c.s.dest && c.s.dest !== id) c.s.stopsTold = false;
  c.s.dest = id;
  if (c.s.oos) { c.say("oos_goes"); return; }
  if (deferred && first) { c.say("goes_by"); answerDeferred(c, deferred); return; }
  c.say(!first ? "goes_yes_short" : kind === "stmt" ? "goes_yes_stmt" : kind === "is" ? "goes_yes_is" : "goes_yes");
}

function stopInfo(c: Ctx, withOffer = true, afterNo = false) {
  const e = D(c.s.dest);
  c.s.stopAsked = true;
  if (c.s.oos) {
    c.say(e.attrs!.last ? "last_stop" : "stop_name", { X: e.attrs!.stop });
    if (c.s.dest === "museo") c.say("museum_across");
    c.say("oos_ask_driver");
    return;
  }
  if (withOffer) c.say(afterNo ? "stop_ok_no" : "stop_ok");
  if (!c.s.stopsTold) { c.s.stopsTold = true; c.say("stops_count", { num: e.attrs!.stops }); }
  if (!c.s.cordTold) { c.s.cordTold = true; c.say("cord"); }
}

/** Paid. `given`: what the learner handed over (cents), for the change. */
function pay(c: Ctx, given?: number) {
  c.s.paid = true;
  if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { fare: FARE }); }
  c.event("pay", { method: "cash", amount: FARE });
  if (given !== undefined && given > FARE) {
    if (CHANGE[given] !== undefined) c.say("change_back", { amount: CHANGE[given] });
    else c.say("change_back_plain");
  } else c.say("paid");
}

/** A bill too big to change: "¿No trae algo más chico?" (twist). */
function bigBill(c: Ctx, bill?: number) {
  c.twist("no_change");
  c.s.bill = bill;
  if (bill !== undefined && BIG.includes(bill)) c.say("no_change", { amount: bill });
  else c.say("no_change_big");
  ask(c, {
    id: "smaller", expects: ["pay_cash", "cash_ctx", "give", "no_change", "no_smaller_ctx"], hints: ["fare"],
    suggest: [{ lt: "Pay with coins, or say you don't have any", hint: "fare" }],
    on: {
      pay_cash: (cc, sl) => { payOrLater(cc, sl.price, sl); },
      // "¿Doce pesos?" checks the price (the handler below answers it); the question stays open
      cash_ctx: (cc, sl) => { if (/\?\s*$/.test(cc.heard)) return false; payOrLater(cc, sl.price, sl); },
      give: (cc) => { pay(cc); },
      no_smaller_ctx: (cc) => { changeLater(cc); },
      no_change: (cc, sl) => {
        const p = sl.price as number | undefined;
        if (typeof p === "number" && p > FARE && p <= 10000) pay(cc, p); else changeLater(cc);
      },
    },
    yes: (cc) => { pay(cc); },
    no: (cc) => { changeLater(cc); },
    ask: (cc) => cc.say("smaller_q"),
  });
  c.say("smaller_q");
}

function payOrLater(c: Ctx, price: number | undefined, sl: any) {
  if (sl?.__tags?.includes?.("ask")) { pay(c); return; }
  if (typeof price === "number" && price > 10000) { changeLater(c); return; }
  if (typeof price === "number" && price < FARE) { c.say("fare_short", { fare: FARE }); c.hold(); return; }
  pay(c, price);
}

/** No smaller money: she takes the big bill and gives the change on the way. */
function changeLater(c: Ctx) {
  c.s.paid = true;
  c.s.changeOwed = true;
  c.event("pay", { method: "cash", amount: FARE });
  c.say("change_later");
}

/** "¿Está lejos la playa?" before saying where they're going: the place named is where they're going. */
function placeFromQuestion(c: Ctx, slots: any, q: string): boolean {
  const d = slots?.dest as string | undefined;
  if (!d && !c.s.dest && mentionsDest(c)) { c.s.deferQ = q; return false; }
  if (d && !c.s.dest) {
    if (!D(d).attrs?.served) { setDest(c, d); return false; }
    c.s.dest = d;
  }
  if (!c.s.dest) { c.say("ask_dest"); c.hold(); return false; }
  return true;
}

function expectSeated(c: Ctx) {
  // A beat for the ride: questions are answered; "gracias" / "ok" lets the bus go on.
  ask(c, {
    id: "seated", hints: ["thanks", "ride_q", "more"],
    suggest: [{ lt: "Say thanks and sit down", hint: "thanks" }, { lt: "Ask how long or how many stops", hint: "ride_q" }, { lt: "Ask about the way back", hint: "more" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); },
      g_ok: () => {},
      ack: () => {},
      is_my_stop: (cc) => { cc.say("not_yet_tell"); expectSeated(cc); },
      bajan: (cc) => { cc.say("not_yet_tell"); expectSeated(cc); },
      ask_stops_count: (cc, sl, sg) => { bus.handlers.ask_stops_count(cc, sl, sg); expectSeated(cc); },
      ask_time: (cc, sl, sg) => { bus.handlers.ask_time(cc, sl, sg); expectSeated(cc); },
      ask_button: (cc, sl, sg) => { bus.handlers.ask_button(cc, sl, sg); expectSeated(cc); },
      ask_frequency: (cc, sl, sg) => { bus.handlers.ask_frequency(cc, sl, sg); expectSeated(cc); },
      ask_last: (cc, sl, sg) => { bus.handlers.ask_last(cc, sl, sg); expectSeated(cc); },
      ask_back: (cc, sl, sg) => { bus.handlers.ask_back(cc, sl, sg); expectSeated(cc); },
    },
    yes: () => {}, no: () => {},
  });
}

/** The learner's stop is next: "Ahí viene el zócalo, su parada. ¿Le paro?" */
function expectNext(c: Ctx) {
  const stopHere = (cc: Ctx) => { arrive(cc); return true; };
  ask(c, {
    id: "next", hints: ["ride"], expects: ["bajan", "is_my_stop"],
    suggest: [{ lt: "Ask her to stop: “¡Bajan!”", hint: "ride" }],
    on: {
      bajan: stopHere,
      // "No, la siguiente" is a no, never "Sí, aquí es"
      is_my_stop: (cc) => { if (/^\s*no\b/.test(fold(cc.heard))) { cc.say("next_no"); expectNext(cc); return true; } cc.say("my_stop_yes"); arrive(cc, true); return true; },
      g_thanks: stopHere,
      g_ok: stopHere,
      ack: stopHere,
    },
    yes: (cc) => { arrive(cc); },
    no: (cc) => { cc.say("next_no"); expectNext(cc); },
    ask: (cc) => cc.say("next_again"),
  });
}

function closing(c: Ctx) {
  ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
      g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

/** At the stop. `confirmed`: Ana has just said "Sí, aquí es." */
function arrive(c: Ctx, confirmed = false) {
  c.s.arrived = true;
  c.complete();
  if (!confirmed) c.say("arrive");
  if (c.s.changeOwed) {
    c.s.changeOwed = false;
    const amt = typeof c.s.bill === "number" ? c.s.bill - FARE : undefined;
    if (amt !== undefined && [18800, 48800, 98800].includes(amt)) c.say("change_later_give", { amount: amt });
    else c.say("change_later_give_plain");
  }
  c.s.byeSaid = true;
  c.say("bye");
  closing(c);
  // World hook (not handled yet): where the bus left the learner.
  c.event("bus-ride", { dest: c.s.dest, to: D(c.s.dest).attrs!.loc });
}

// ---------------------------------------------------------------------------

export const bus: SituationDef = {
  id: "s67b-bus",
  song: 67,
  songTitle: "Single or Return?",
  title: { en: "¿Este camión va al centro?", lt: "Does this bus go downtown?" },
  topic: { en: "En camión", lt: "Taking the bus" },
  chapter: 6,
  order: 2,
  location: "station",
  npc: "denise",
  goal: "Find out whether the bus goes where you need, pay the fare, and ask the driver to tell you where to get off.",
  intro: "The city bus stop outside the bus terminal. Route 7 is at the curb and Ana is at the wheel. You pay the driver as you get on: $12 (12 pesos), cash only. Drivers give change for coins and small bills, not for a 500.",
  entities: { dest: DESTS, stop: STOPS },

  grammar: {
    macros: {
      thisbus: "(este | este camion | este autobus | este bus | esta ruta | el siete | la siete | la ruta siete | el 7 | la ruta 7 | el camion siete | este de aqui)",
      doce: "(el doce | el 12 | la doce | la ruta doce | la ruta 12 | el camion doce | el autobus doce | el numero doce | el de atras | el que viene atras)",
      to: "(a | al | a la | hasta | para | por | hacia | rumbo a)",
      goes: "(va | van | vas #tip:tu_staff | pasa | pasan | pasas #tip:tu_staff | llega | llegan | para | se para | sale)",
      bill: "(un billete | uno | billetes | un billetito | billete)",
      getoff: "(me bajo | bajarme | bajar | me tengo que bajar | tengo que bajarme | tengo que bajar | debo bajarme | me debo bajar | me bajaria | me voy a bajar)",
      tellme: "(me avisa | me puede avisar | me podria avisar | puede avisarme | podria avisarme | me dice | me puede decir | me podria decir | digame | me avisas #tip:tu_staff | me dices #tip:tu_staff | me puedes avisar #tip:tu_staff)",
    },
  },

  intents: {
    affirm: { patterns: [
      "[si] [ya] se (donde | en donde | en que parada) @getoff", "[si] [ya] conozco (la parada | el lugar | el camino | aqui | el pueblo)", "[si] ya se donde es",
      "si ya (se | lo se)", "si (ya he venido | ya vine antes | vengo seguido)", "creo que si se", "si si se", "si (lo | la) conozco",
    ] },
    deny: { patterns: [
      "[no] es mi primera vez [aqui | en el camion | en puerto colibri | en el pueblo]", "[no] (no conozco | no lo conozco | no conozco aqui | no conozco el pueblo | no soy de aqui)",
      "no la verdad no", "no ni idea", "no no se", "[no] no se (donde | cual) [es]",
      "[no] es (mi | la) primera vez que (vengo | vengo aqui | lo tomo | tomo este camion | tomo esta ruta)", "[no] (nunca he venido | nunca he estado aqui | acabo de llegar)",
    ] },
    ask_goes: { patterns: [
      "[@thisbus] @goes @to {dest} [@thisbus] #h:goes", "[@thisbus] @goes @to {dest} [@thisbus] (o no | verdad | si o no)",
      "(sabe | sabes #tip:tu_staff | sabe usted) si @thisbus @goes @to {dest}",
      "@thisbus (me deja | me lleva | me acerca) (en | cerca de | cerca del | a | al | a la | hasta) {dest}",
      "[@thisbus] (para | se para | se detiene) (en | cerca de | cerca del) {dest}",
      "[@thisbus] (pasa | pasan) (por | cerca de) {dest} [@thisbus] #h:passes",
      "(ustedes | vosotros) @goes @to {dest}",
      "(usted | tu) (va | vas #tip:tu_staff) @to {dest}",
      "(este es | es este | es) el (que va | camion que va | autobus que va | bueno | correcto) (a | al | a la | para) {dest} #is #h:is_this",
      "(este es | es este) el (camion | autobus) (de | del | para | a | al) {dest} #is",
      "(este | este camion | esta ruta) es (la | el) (de | del | para) {dest} #is",
      "el (camion | autobus) (del | de la | para el | para la | al | a la | que va al | que va a la) {dest} es este #is", "(es este | este es) el (del | de la) {dest} #is",
      "(me sirve | sirve) (este | este camion | este autobus | esta ruta) para (ir a | ir al | llegar a | llegar al) {dest}",
      "@thisbus (me sirve | sirve | me funciona) para (ir | llegar) @to {dest}",
      "(puedo | se puede | debo) (tomar | agarrar) @thisbus [para ir | para llegar] @to {dest}",
      // "¿Este no va al centro?" = "Doesn't this one go downtown?": a question, never "I'm not going"
      // (only with "este": a bare "No va al centro" may be a learner's "No voy", rule 10)
      "@thisbus no (va | pasa | llega) @to {dest} #h:goes", "no (va | pasa | llega) @to {dest} @thisbus #h:goes",
      "(puedo | se puede) (ir | llegar) @to {dest} (en | con) @thisbus",
      "(que | cual) (camion | autobus | ruta | numero) (va | pasa | me lleva | tomo | me sirve) @to {dest}",
      "(que | cual) (camion | autobus | ruta) (tomo | agarro) para (ir | llegar) @to {dest}",
      "(busco | ando buscando | estoy buscando) el (camion | autobus) (que va | para | de | del) @to {dest}",
      "(busco | ando buscando) el (camion | autobus) (que va a | que va al | para el | para la | del | de la) {dest}",
      "(voy | quiero ir | necesito ir) @to {dest} (es este | este es | es aqui | me sirve este | va este | este va | este sirve)",
      "{dest} (va | pasa) [@thisbus]",
      "[y] @doce @goes @to {dest} #twelve #h:goes12",
      "[y] @doce (pasa | pasan) (por | cerca de) {dest} #twelve",
      "[y] (va | pasa) @doce @to {dest} #twelve",
    ] },
    going_to: { patterns: [
      "(voy | vamos) @to {dest} #h:going_to",
      "(quiero | necesito | tengo que | quisiera | me gustaria) ir @to {dest}",
      "(quiero | necesito | tengo que) (llegar | ir) @to {dest}",
      "(quiero | necesito | tengo que) tomar (el | un | este) (camion | autobus) @to {dest}",
      "como (llego | puedo llegar | le hago para llegar | hago para llegar | me voy) @to {dest} #h:how_get",
      "(me lleva | me puede llevar | lleveme) @to {dest}", "(me deja | me puede dejar | me baja) (en | cerca de | cerca del) {dest}",
      "(me bajo | voy a bajarme | me voy a bajar) en {dest}",
      "(un | me da un | deme un | me pone un | ponme un) (boleto | billete | pasaje) @to {dest}",
      "mejor [voy] @to {dest}",
      "(no | perdon) mejor @to {dest}",
    ] },
    dest_ctx: { patterns: ["[y] @to {dest}", "{dest}", "(es | seria) @to {dest}"] },
    dest_fix: { patterns: [
      "no (a | al | a la | voy a | voy al) {dest} (sino | mas bien) (a | al | a la) {to:dest}",
      "no (a | al | a la | voy a | voy al) {dest} (a | al | a la | voy a | voy al) {to:dest}",
      "no (voy | quiero ir) (a | al | a la) {dest} (voy | quiero ir) (a | al | a la) {to:dest}",
      "(a | al | a la) {dest} no [sino] (a | al | a la) {to:dest}",
    ] },
    dest_unknown: { patterns: [
      "[@thisbus] (va | pasa) (a | al | a la | hasta | por) {w:any}",
      "(voy | quiero ir | necesito ir) (al | a la | hasta | a casa de | a la casa de) {w:any}",
    ] },
    dest_neg: { patterns: [
      "[ya] no (voy | vamos) @to {dest}", "[ya] no (quiero | necesito | tengo que) ir @to {dest}", "{dest} no",
    ] },
    ask_fare: { patterns: [
      "cuanto (es | cuesta | cobra | le debo | se paga | vale | sale | seria) [el pasaje | el boleto | el viaje | la tarifa | el camion | el autobus | la vuelta] #h:fare",
      "cuanto (es | cuesta | cobra) [el pasaje | el viaje] @to {dest}",
      "cuanto me cobra", "cuanto te debo #tip:tu_staff", "cuanto (le doy | le pago | pago | le tengo que dar | tengo que pagar | hay que pagar)",
      "(tengo que | hay que | debo) pagar [ahora | aqui | ya | al subir | a usted] #when", "que precio tiene [el pasaje | el boleto]",
      "(es | son | cuesta | vale) {price} [verdad | no] #check",
      "cuanto (es | cuesta | sale | cobra) [para] (ir | llegar) @to {dest}",
      "(un | me da un | deme un | me vende un) (boleto | pasaje) [por favor]",
      "(le pago | pago | se paga | le pago a usted) (aqui | ahora | ya | al subir | al bajar | a usted) #when",
      "(le pago | pago) a usted #when", "donde (pago | se paga) #when", "(le pago | pago | se paga) (ahora | al subir) o (al bajar | despues | al final) #when",
      "cuanto (es | cuesta) (en | el) @doce", "(es | cuesta | vale) lo mismo [en @doce] #same", "(es | seria) el mismo precio [en @doce] #same",
    ] },
    pay_card: { patterns: [
      "(acepta | aceptan | toma | toman | recibe) tarjeta [de credito | de debito] #h:pay_card",
      "(puedo | se puede) pagar con tarjeta [de credito | de debito]", "(con | pago con | le pago con) tarjeta", "tarjeta",
      "(acepta | aceptan) (visa | mastercard | tarjetas)", "aceptas tarjeta #tip:tu_staff",
      "(no traigo | no tengo | no cargo) efectivo #nocash", "(no traigo | no tengo) (dinero | cash) #nocash",
    ] },
    // a visitor's dollars: pesos only
    pay_dollars: { patterns: [
      "(acepta | aceptan | toma | toman | recibe) (dolares | dolar) #h:dollars", "aceptas dolares #tip:tu_staff",
      "(puedo | se puede) pagar (con | en) dolares", "(le pago | pago) (con | en) dolares", "(solo | nomas) (traigo | tengo) dolares",
      "(no traigo | no tengo) pesos",
    ] },
    ask_atm: { patterns: ["(donde | en donde) (hay | esta | queda) (un | el) cajero [por aqui | cerca]", "hay (un)? cajero [por aqui | cerca]"] },
    pay_phone: { patterns: [
      "(puedo | se puede) pagar con (el celular | mi celular | el telefono | mi telefono | apple pay | google pay | el reloj)",
      "(acepta | aceptan) (apple pay | google pay | transferencia | pago con celular)",
      "(le puedo hacer | puedo hacer | le hago) (una)? transferencia", "(pago | le pago) con (el celular | transferencia | apple pay)",
    ] },
    pay_cash: { patterns: [
      "(aqui tiene | tenga | tome | aqui esta | ahi va | le doy | le pago | aqui le doy | aqui van) {price} #h:here_price",
      "(aqui tiene | aqui esta | ahi va | tenga) (el pasaje | lo exacto | el cambio exacto | mi pasaje | las monedas | el dinero)",
      "(traigo | tengo) (cambio exacto | lo exacto | el cambio exacto | monedas | cambio | feria | el exacto)",
      "(si)? (traigo | tengo) (unas)? monedas",
      "(pago | le pago) en efectivo", "en efectivo", "(le pago | pago | se lo pago) con {price}",
      "(aqui tiene | tenga | le doy | le pago con | aqui le doy) (un billete de | uno de | un billetito de) {price}",
      "(aqui tiene | tenga) (son | es) {price} [verdad | no]",
      "no (pago | le pago | puedo pagar) con tarjeta [entonces] (pago | le pago) en efectivo",
      "(puedo pagar | se puede pagar | le pago | puedo pagarle) (en | con) (efectivo | monedas) #ask",
      "(acepta | aceptan) (efectivo | monedas) #ask",
      "(no traigo | no tengo) (tarjeta | tarjetas) #nocard",
    ] },
    cash_ctx: { patterns: ["{price} [aqui tiene | tenga]"] },
    // "¿No trae algo más chico?" — "No, no traigo" / "Nomás ese"
    no_smaller_ctx: { patterns: [
      "[no] no (traigo | tengo | cargo) [nada | nada mas | nada mas chico | otro | otro billete | mas chico | mas pequeno | mas | otra cosa]",
      "(solo | nomas) (ese | este | el de {price} | ese billete | este billete)", "[no] (solo | nomas) (traigo | tengo) (ese | este | ese billete | este billete | eso)", "(no | nada) lo siento", "es (todo | lo unico) (lo que)? (traigo | tengo)",
    ] },
    give: { patterns: ["[aqui tiene | tenga] (quedese con el cambio | asi esta bien | asi esta bien gracias)", "aqui tiene #h:here", "tenga", "tome", "aqui esta", "ahi va", "aqui le dejo", "aqui le doy", "aqui va"] },
    no_change: { patterns: [
      "(solo | nomas) (traigo | tengo) @bill (de | grande de) {price} #h:only_big",
      "(solo | nomas) (traigo | tengo) [el] (de | uno de) {price}", "(solo | nomas) (traigo | tengo) {price}", "(solo | nomas) @bill (de | grande de) {price}",
      "(no tengo | no traigo) (cambio | monedas | cambio exacto) (solo | nomas) [tengo | traigo] @bill de {price}",
      "(traigo | tengo) @bill de {price}",
      "(solo | nomas) (traigo | tengo) (billetes grandes | un billete grande) #big",
      "(no traigo | no tengo) (cambio | monedas | cambio exacto | lo exacto | suelto | sencillo | feria | morralla | billetes chicos) #h:no_exact",
      "(me da | me puede dar | da | dan | me das #tip:tu_staff) cambio #ask #h:give_change",
      "(tiene | trae | tienes #tip:tu_staff) cambio (de | para) {price} #ask",
      "(me da | me puede dar) cambio de {price} #ask",
      "(puedo pagar | le pago | pago | se puede pagar) con (un billete de | uno de | un billete de a) {price} #ask",
      "(puedo pagar | puedo pagarle | le puedo pagar | se puede pagar) con {price} #ask",
      "(hay | tiene) cambio #ask", "(me puede | puede | me podria | podria) cambiar (un billete de | uno de | un billete grande de) {price} #ask",
    ] },
    day_pass: { patterns: [
      "(hay | tiene | venden | tienen) (pase | boleto | boletos | pases) (de dia | del dia | diario | diarios | por dia | para todo el dia) #h:day_pass",
      "(puedo comprar | quiero | quisiera | me da) un (pase | boleto) (de dia | para todo el dia | diario)",
      "(hay | tienen | venden) (tarjeta | abono | tarjeta de prepago)", "cuanto (cuesta | es) el (pase | boleto) (de dia | diario)",
    ] },
    no_day_pass: { patterns: ["no (quiero | necesito) [el | un] (pase | boleto) [de dia | diario]", "(solo | nomas) (un viaje | un boleto | uno | una vuelta | ida)", "(solo | nomas) voy de ida"] },
    transfer: { patterns: [
      "(hay | tiene) (transbordo | transbordos)", "[el] transbordo es gratis", "(puedo | se puede) (cambiar | transbordar) (de camion | de ruta)? gratis",
      "si (cambio | me cambio) de (camion | ruta | autobus) (pago | tengo que pagar | le pago) otra vez", "(sirve | vale) (el boleto | el pasaje) para otro (camion | autobus)",
    ] },
    ask_stop: { patterns: [
      "@tellme (donde | en donde | cuando | en que parada) @getoff #h:tell_me",
      "@tellme cuando (lleguemos | llegue | estemos) [cerca] #h:tell_when",
      "@tellme cuando (lleguemos | estemos) (a | al | a la | en | cerca de | cerca del) {dest} #h:let_me_know",
      "@tellme (mi parada | la parada)", "@tellme en {dest}",
      "no se (donde | en donde) (esta | queda) {dest} [@tellme]", "(me avisa | aviseme | me avisas #tip:tu_staff | avisame #tip:tu_staff) [cuando | donde]",
      "(donde | en donde | en que parada) @getoff #where #h:where_off",
      "(donde | en donde | en que parada) @getoff (para | para ir a | para ir al | para el | para la) {dest} #where #h:where_off_x",
      "(donde | en donde | en que parada) @getoff (si voy a | si voy al) {dest} #where",
      "(cual | que) es la parada (de | del | de la | para | para el | para la) {dest} #where", "(cual | que) parada es [la mia | para {dest}] #where",
      "(cual | que | en que) parada (de | del | para | para el) {dest} #where",
      "no se (donde | en donde | en que parada) @getoff", "(cuando | a que hora) @getoff", "donde (es | esta) mi parada #where", "(cual | que) es mi parada #where",
      "(me ayuda | me puede ayudar) con (la parada | mi parada)",
      "(me avisa | me puede avisar | me podria avisar | puede avisarme | podria avisarme | me avisas #tip:tu_staff | me puedes avisar #tip:tu_staff) [por favor]",
    ] },
    // "¿Sabe dónde bajarse?" — "Sí, en el mercado"
    known_place_ctx: { patterns: ["[si] [ya se] [me bajo] (en | cerca de) {dest}", "si (me bajo | bajo) en {dest}"] },
    // "¿Sabe dónde bajarse?" — "No, ¿me avisa?" (no comma heard: "no me avisa")
    tell_me_ctx: { patterns: ["[si] mas o menos", "no (me avisa | me puede avisar | me podria avisar | me dice | me puede decir | me avisas | me dices) [donde | cuando | usted] [@getoff]", "[no] (aviseme | avisame) [usted]"] },
    ask_stops_count: { patterns: [
      "cuantas paradas (son | faltan | hay | quedan) [hasta {dest} | para {dest} | al {dest} | a la {dest}] #h:how_many_stops",
      "(esta | queda) (lejos | cerca) [{dest}] #h:is_far", "es lejos", "(esta | queda) (muy | muy muy) lejos [{dest}]", "que tan lejos (esta | queda) [{dest}]",
      "(falta | faltan | queda | quedan) (mucho | muchas paradas | poco)", "cuanto falta [para {dest}]",
    ] },
    ask_time: { patterns: [
      "cuanto (tiempo)? (tarda | se tarda | se hace | hace | dura | hacemos | tardamos | es) [el viaje | hasta {dest} | en llegar | @to {dest}] #h:how_long",
      "cuantos minutos (son | se hace | tarda | hace) [@to {dest}]", "en cuanto tiempo (llegamos | se llega) [@to {dest}]",
    ] },
    ask_frequency: { patterns: [
      "cada cuanto (pasa | pasan | sale | salen | viene | vienen | hay) [el camion | los camiones | el autobus | los autobuses | la ruta] #h:how_often",
      "cuando (pasa | sale | viene) el (siguiente | proximo | otro) [camion | autobus]", "[y] (cuando | a que hora) (pasa | sale | viene | llega) @doce", "(hay | tiene | tienen) (un)? horario",
    ] },
    ask_last: { patterns: [
      "a que hora (pasa | sale) el ultimo [camion | autobus] [de regreso] #h:last_bus",
      "(hasta que hora | hasta cuando) (hay | pasan | trabajan | corren | salen) (camiones | autobuses)", "(hasta que hora | hasta cuando) (pasa | trabaja | sale) [el camion | la ruta]",
      "a que hora es el ultimo [camion | autobus]",
    ] },
    ask_back: { patterns: [
      "(donde | en donde) (lo tomo | tomo el camion | tomo el autobus | agarro el camion) (de regreso | para regresar) #h:bus_back",
      "como (regreso | me regreso | vuelvo | me vuelvo)", "[y] para (regresar | volver | el regreso)", "(donde | en donde) se toma (el camion | el autobus)? (de regreso | para regresar)",
      "(donde | en donde) pasa el (camion | autobus) de regreso", "(donde | en donde) pasa el (de regreso | que regresa)",
    ] },
    ask_button: { patterns: [
      "(toco | aprieto | presiono | uso) el timbre #h:button", "(hay | donde esta) [el] timbre",
      "como (le pido | le digo) (que pare | que se pare | la parada)", "como (pido | hago) la parada",
      "que hago (para bajarme | cuando me quiera bajar | para que pare)", "como (le hago | hago | le pido) para (bajarme | bajar | que pare | que se pare)", "(grito | digo) bajan",
    ] },
    is_my_stop: { patterns: [
      "(es | ya es) (aqui | mi parada) #h:my_stop", "(aqui | ya) me bajo", "aqui me bajo #h:my_stop2", "(me bajo | bajo) aqui",
      "(ya)? (llegamos | estamos) [a | en] {dest}", "(es | ya es | esto es | este es) {dest}",
      "(ya)? llegamos", "ya casi (llegamos | estamos)", "la (siguiente | que sigue | proxima) es (la mia | {dest})", "es la (mia | siguiente | proxima)", "ya es la mia", "(es | ya es) (esta | este)",
    ] },
    bajan: { patterns: [
      "bajan #h:bajan", "(bajan | baja) [aqui | en la esquina]",
      "(en | a) la esquina [por favor]", "(aqui | ahi) (me deja | me baja | me bajo | bajo | por favor)",
      "(pare | pareme | parele | se puede parar) [aqui | ahi | en la esquina]", "(me puede | puede | me podria | podria) (bajar | parar) (aqui | ahi | en la esquina)", "me baja (aqui | ahi | en la esquina)",
    ] },
    route_q: { patterns: ["(es | este es) (el | la) (siete | 7 | ruta siete | ruta 7)", "(que | cual) (ruta | numero) es [este | esta]"] },
    sit_q: { patterns: [
      "(puedo | me puedo | se puede) (sentar | sentarme) [donde sea | en cualquier lugar | aqui | atras | adelante]",
      "(donde | en donde) me siento", "(esta | este lugar esta | este asiento esta) (libre | ocupado)", "(esta | este) (lugar | asiento) (libre | ocupado)", "(esta)? (libre | ocupado) (este | ese) (asiento | lugar)",
    ] },
    ack: { patterns: [
      "(perfecto | muy bien | sale | va | bueno | ok | orale) (gracias | muchas gracias)",
      "(ok | bueno | va)? me (siento | voy a sentar) [aqui | alla atras | atras | adelante]",
      "(ok | bueno | va)? (toco | voy a tocar) el timbre", "(ok | bueno)? (espero | me espero)", "(listo | ya esta)",
    ] },
  },

  lines: {
    greet: [
      t("¡Buenas!", "Hi!", "Hi there!"),
      t("¡Buenos días!", "Good morning!", "Morning!"),
      t("¡Pásele!", "Come in!", "Come on in!", { flags: { 0: "Mexican: pásele = come in, go ahead." }, neutral: t("¡Adelante!", "Come in!", "Come on in!") }),
    ],
    greet_howareyou: [
      t("¡Buenas! | ¿Cómo | está?", "Hi! | How | are you?", "Hi! How are you doing?"),
    ],
    ask_dest: [
      t("¿A | dónde | va?", "To | where | you-go?", "Where are you headed?"),
      t("¿Para | dónde | va?", "To | where | you-go?", "Where are you going?"),
    ],
    goes_yes: [
      t("Sí, | sí | va.", "Yes, | it does | go.", "Yep, it goes there."),
      t("Sí, | pasamos | por | ahí. | Súbase.", "Yes, | we-pass | by | there. | Get on.", "Yes, we go by there. Hop on."),
      t("Claro, | va | para allá.", "Sure, | it-goes | that way.", "Sure, it goes there."),
    ],
    goes_yes_is: [
      t("Sí, | es | este.", "Yes, | it's | this one.", "Yes, this is the one."),
      t("Sí, | este | es.", "Yes, | this one | it-is.", "Yep, this is it."),
    ],
    goes_yes_again: [
      t("Así es, | por | ahí | pasamos.", "That's right, | by | there | we-pass.", "That's right, we go by there."),
    ],
    goes_yes_stmt: [
      t("Muy | bien, | súbase.", "Very | good, | get on.", "Okay, hop on."),
      t("Perfecto, | por | ahí | pasamos.", "Perfect, | by | there | we-pass.", "Perfect, we go right by there."),
    ],
    goes_by: [
      t("Por | ahí | pasamos.", "By | there | we-pass.", "We go by there."),
    ],
    goes_yes_short: [
      t("Por | ahí | también | pasamos.", "By | there | also | we-pass.", "We go by there too."),
    ],
    goes_no: [
      t("No, | este | no va | a | {X.the}.", "No, | this one | doesn't go | to | {X.the}.", "No, this one doesn't go to the {X}."),
    ],
    goes_no_plain: [
      t("Este | camión | no va | a | {X.the}.", "This | bus | doesn't go | to | {X.the}.", "This bus doesn't go to the {X}.",
        { flags: { 1: "Mexican: camión = city bus. Elsewhere: autobús." }, neutral: t("Este | autobús | no va | a | {X.the}.", "This | bus | doesn't go | to | {X.the}.", "This bus doesn't go to the {X}.") }),
    ],
    where_airport: [
      t("Para | el | aeropuerto | salen | autobuses | de | la | terminal, | aquí | adentro.", "For | the | airport | leave | buses | from | the | terminal, | here | inside.",
        "For the airport, buses leave from inside the terminal, right here."),
    ],
    where_cenote: [
      t("Para | los | cenotes | mejor | tome | un | colectivo | en | la | avenida.", "For | the | cenotes | better | take | a | shared van | on | the | avenue.",
        "For the cenotes, you're better off taking a colectivo on the avenue.", { flags: { 6: "colectivo: a shared minivan with a fixed route; you flag it down on the street." } }),
    ],
    // any place not on the route (Cancún, Tulum, a friend's house): honest, and the route's stops
    dest_unknown: [
      t("Mmm, | no, | esta | ruta | no va | para allá. | Pasa | por | el | mercado, | el | centro, | la | clínica | y | el | malecón, | y | termina | en | la | playa.",
        "Hmm, | no, | this | route | doesn't go | that way. | It-passes | by | the | market, | the | center, | the | clinic | and | the | seafront, | and | it-ends | at | the | beach.",
        "Hmm, no, this route doesn't go out there. It goes past the market, the center, the clinic and the malecón, and ends at the beach."),
    ],
    // the learner doesn't know where to go ("No sé"): the route's main stops
    dest_help: [
      t("Sin problema. | Esta | ruta | pasa | por | el | mercado, | el | centro, | la | clínica | y | el | malecón, | y | termina | en | la | playa.",
        "No problem. | This | route | goes | through | the | market, | the | center, | the | clinic | and | the | seafront, | and | it-ends | at | the | beach.",
        "No problem. This route goes past the market, the center, the clinic and the malecón, and ends at the beach."),
    ],
    dest_neg_ack: [
      t("Ah, | bueno. | ¿Entonces | a | dónde | va?", "Oh, | okay. | Then | to | where | you-go?", "Oh, okay. So where are you headed?"),
    ],
    fare_is: [
      t("Son | {$fare}.", "That's | {$fare}.", "That's {$fare}."),
      t("Serían | {$fare}.", "It'd-be | {$fare}.", "That'll be {$fare}."),
    ],
    fare_yes: [
      t("Sí, | {$fare}.", "Yes, | {$fare}.", "Yes, {$fare}."),
    ],
    fare_no_is: [
      t("No, | son | {$fare}.", "No, | it's | {$fare}.", "No, it's {$fare}."),
    ],
    pay_when: [
      t("Aquí | conmigo, | al subir: | son | {$fare}.", "Here | with me, | when getting on: | it's | {$fare}.", "Right here with me, when you get on: it's {$fare}."),
    ],
    fare_short: [
      t("Son | {$fare}; | no le alcanza.", "It's | {$fare}; | it's not enough.", "It's {$fare}; that's not enough."),
    ],
    fare_how: [
      t("Solo | efectivo. | Si | tiene | cambio | exacto, | mejor.", "Only | cash. | If | you-have | change | exact, | better.", "Cash only. Exact change if you have it."),
    ],
    fare_ask: [
      t("Son | {$fare}, | por favor.", "That's | {$fare}, | please.", "That's {$fare}, please."),
    ],
    card_no: [
      t("No, | perdón, | nomás | efectivo.", "No, | sorry, | only | cash.", "Sorry, cash only.",
        { flags: { 2: "Mexican: nomás = only." }, neutral: t("No, | perdón, | solo | efectivo.", "No, | sorry, | only | cash.", "Sorry, cash only.") }),
      t("Aquí | no se aceptan | tarjetas, | solo | efectivo.", "Here | aren't accepted | cards, | only | cash.", "We don't take cards here, cash only."),
    ],
    nocash: [
      t("Uy, | aquí | es | solo | efectivo.", "Oops, | here | it's | only | cash.", "Oh, it's cash only here."),
    ],
    dollars_no: [
      t("Perdón, | solo | pesos.", "Sorry, | only | pesos.", "Sorry, pesos only."),
    ],
    route_7: [
      t("Sí, | es | la | ruta | 7.", "Yes, | it's | the | route | 7.", "Yes, this is route 7.", { say: "Sí, es la ruta siete." }),
    ],
    phone_no: [
      t("Con | el | celular | no, | perdón. | Solo | efectivo.", "With | the | phone | no, | sorry. | Only | cash.", "Not by phone, sorry. Cash only."),
    ],
    atm: [
      t("Hay | un | cajero | en | la | terminal, | ahí | adentro.", "There's | an | ATM | in | the | terminal, | there | inside.", "There's an ATM inside the terminal."),
    ],
    cash_yes: [
      t("Sí, | claro, | en efectivo.", "Yes, | sure, | in cash.", "Yes, sure, cash is fine."),
    ],
    cash_fine: [
      t("No se preocupe, | aquí | es | solo | efectivo.", "Don't worry, | here | it's | only | cash.", "Don't worry, it's cash only here."),
    ],
    paid: [
      t("Gracias.", "Thanks.", "Thanks."),
      t("Gracias, | pásele.", "Thanks, | go on in.", "Thanks, go on in.",
        { flags: { 1: "Mexican: pásele = go ahead, come in." }, neutral: t("Gracias, | adelante.", "Thanks, | go ahead.", "Thanks, go on in.") }),
      t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thanks."),
    ],
    change_back: [
      t("Gracias. | Aquí tiene | su | cambio, | {$amount}.", "Thanks. | Here's | your | change, | {$amount}.", "Thanks. Here's your change, {$amount}."),
    ],
    change_back_plain: [
      t("Gracias. | Aquí tiene | su | cambio.", "Thanks. | Here's | your | change.", "Thanks. Here's your change."),
    ],
    paid_already: [
      t("Ya | pagó, | no se preocupe.", "Already | you-paid, | don't worry.", "You've already paid, don't worry."),
    ],
    no_change: [
      t("Uy, | no traigo | cambio | de | {$amount}.", "Oops, | I don't have | change | for | {$amount}.", "Oh, I don't have change for {$amount}."),
    ],
    no_change_big: [
      t("Uy, | de | billetes | grandes | no traigo | cambio.", "Oops, | for | bills | big | I don't have | change.", "Oh, I don't have change for big bills."),
    ],
    smaller_q: [
      t("¿No trae | algo | más | chico?", "Don't you have | something | more | small?", "Don't you have anything smaller?"),
    ],
    change_later: [
      t("Bueno, | súbase. | En el camino | le | doy | su | cambio.", "Okay, | get on. | On the way | (to) you | I-give | your | change.", "Okay, hop on. I'll give you your change on the way."),
    ],
    change_later_give: [
      t("Ah, | y | aquí tiene | su | cambio: | {$amount}.", "Oh, | and | here's | your | change: | {$amount}.", "Oh, and here's your change: {$amount}."),
    ],
    change_later_give_plain: [
      t("Ah, | y | aquí tiene | su | cambio.", "Oh, | and | here's | your | change.", "Oh, and here's your change."),
    ],
    change_yes: [
      t("Sí, | claro.", "Yes, | sure.", "Sure."),
    ],
    change_ok: [
      t("Sí, | le | doy | cambio, | pero | no | de | billetes | grandes.", "Yes, | (to) you | I-give | change, | but | not | for | bills | big.", "Sure, I give change, just not for big bills."),
    ],
    no_exact_ok: [
      t("No se preocupe, | yo | le | doy | cambio.", "Don't worry, | I | (to) you | I-give | change.", "Don't worry, I'll give you change."),
    ],
    no_pass: [
      t("Aquí | no hay | pase | de | día: | se paga | cada | viaje.", "Here | there isn't | pass | of | day: | you pay | each | ride.", "There's no day pass here: you pay for each ride."),
    ],
    transfer: [
      t("No, | cada | viaje | se paga | aparte.", "No, | each | ride | is paid | separately.", "No, each ride is paid separately."),
    ],
    stop_ok: [
      t("¡Claro! | Yo | le | aviso.", "Sure! | I | (to) you | I-let-know.", "Sure! I'll let you know."),
      t("Sí, | no se preocupe, | yo | le | aviso | cuando | lleguemos.", "Yes, | don't worry, | I | (to) you | I-let-know | when | we-arrive.", "Sure, don't worry, I'll tell you when we get there."),
    ],
    stop_ok_no: [
      t("No hay problema, | yo | le | aviso.", "No problem, | I | (to) you | I-let-know.", "No problem, I'll let you know."),
    ],
    stop_ok_short: [
      t("Vaya | tranquil{m:o|f:a}.", "Go | relaxed.", "Just sit back and relax.", { flags: { 1: "tranquilo / tranquila: agrees with you, a man / a woman." } }),
    ],
    stops_count: [
      t("Son | como | {$num} | paradas.", "It's | about | {$num} | stops.", "It's about {$num} stops."),
    ],
    ride_time: [
      t("Son | como | {$num} | minutos.", "It's | about | {$num} | minutes.", "About {$num} minutes."),
      t("Se hace | como | {$num} | minutos.", "It takes | about | {$num} | minutes.", "It takes about {$num} minutes."),
    ],
    stop_name: [
      t("Se baja | en | {X.the}.", "You get off | at | {X.the}.", "You get off at the {X}."),
    ],
    last_stop: [
      t("Es | la | última | parada: | {X.the}.", "It's | the | last | stop: | {X.the}.", "It's the last stop: the {X}."),
    ],
    cord: [
      t("Cuando | quiera | bajarse, | toque | el | timbre | o | diga | “¡Bajan!”.", "When | you-want | to get off, | press | the | buzzer | or | say | “Getting off!”.",
        "When you want to get off, press the buzzer or call out “¡Bajan!”.", { flags: { 8: "¡Bajan!: “(people) getting off!”, what you call out to the driver in Mexico." } }),
    ],
    ask_known: [
      t("¿Sabe | dónde | bajarse?", "You-know | where | to get off?", "Do you know where to get off?"),
      t("¿Ya | sabe | dónde | se baja?", "Already | you-know | where | you get off?", "Do you know where you're getting off?"),
    ],
    known_great: [
      t("Muy | bien.", "Very | good.", "Okay, great."),
      t("Perfecto.", "Perfect.", "Perfect."),
    ],
    have_seat: [
      t("Siéntese | donde | guste.", "Sit down | where | you-like.", "Have a seat wherever you like."),
      t("Pase, | siéntese.", "Come in, | sit down.", "Go ahead and have a seat."),
    ],
    mid_stop: [
      t("¡Iglesia! | ¿Bajan?", "Church! | Getting off?", "The church! Anyone getting off?", { flags: { 1: "¿Bajan?: “anyone getting off?”, the driver's call at a stop." } }),
    ],
    not_yet_next: [
      t("Todavía no. | Su | parada | es | la que sigue.", "Not yet. | Your | stop | is | the next one.", "Not yet. Yours is the next one."),
    ],
    not_yet_tell: [
      t("Todavía no. | Yo | le | aviso.", "Not yet. | I | (to) you | I-let-know.", "Not yet. I'll let you know."),
    ],
    next_yours: [
      t("Ahí | viene | {X.the}, | su | parada.", "There | comes | {X.the}, | your | stop.", "Here comes the {X}, your stop."),
    ],
    next_now: [
      t("Ahora | sí, | ya | llegamos.", "Now | yes, | already | we-arrived.", "Okay, now we're here."),
    ],
    le_paro: [
      t("¿Le | paro?", "(For) you | I-stop?", "Shall I stop?"),
    ],
    museum_across: [
      t("El | museo | está | enfrente.", "The | museum | is | opposite.", "The museum's right across from it."),
    ],
    i_tell: [
      t("Yo | le | aviso.", "I | (to) you | I-let-know.", "I'll let you know."),
    ],
    next_again: [
      t("¿Le | paro | aquí?", "(For) you | I-stop | here?", "Shall I stop here?"),
    ],
    next_no: [
      t("Bueno, | me | avisa.", "Okay, | (to) me | you-let-know.", "Okay, just let me know."),
    ],
    arrive: [
      t("Listo, | aquí | es.", "Ready, | here | it-is.", "Okay, here you are."),
      t("Aquí | le | paro.", "Here | (for) you | I-stop.", "I'll stop right here."),
    ],
    my_stop_yes: [
      t("Sí, | aquí | es.", "Yes, | here | it-is.", "Yes, this is it."),
    ],
    frequency: [
      t("Pasa | cada | quince | minutos, | más o menos.", "It-comes | every | fifteen | minutes, | more or less.", "It comes every fifteen minutes or so."),
    ],
    last_bus: [
      t("El | último | pasa | como | a las diez | de la noche.", "The | last one | comes | around | at ten | at night.", "The last one comes around ten at night."),
    ],
    bus_back: [
      t("Para | regresar, | tómelo | enfrente, | del | otro | lado | de | la | calle.", "To | come back, | take it | across, | on the | other | side | of | the | street.",
        "To come back, catch it across the street, on the other side."),
    ],
    button: [
      t("Sí, | toque | el | timbre | o | diga | “¡Bajan!”.", "Yes, | press | the | buzzer | or | say | “Getting off!”.", "Yes, press the buzzer or call out “¡Bajan!”."),
    ],
    sit_anywhere: [
      t("Sí, | donde | guste.", "Yes, | where | you-like.", "Sure, wherever you like."),
    ],
    no_problem: [
      t("No hay problema.", "No problem.", "No problem."),
    ],
    bye: [
      t("¡Que | le | vaya | bien!", "(May) | (to) you | it-go | well!", "Take care!"),
      t("¡Que | disfrute | su | día!", "(May) | you-enjoy | your | day!", "Enjoy your day!"),
    ],
    oos: [
      t("Perdón, | voy | fuera de servicio.", "Sorry, | I'm going | out of service.", "Sorry, I'm out of service."),
    ],
    oos_take12: [
      t("Súbase | al | 12, | viene | atrás de | mí.", "Get on | the | 12, | it's coming | behind | me.", "Take the 12, it's right behind me.", { say: "Súbase al doce, viene atrás de mí." }),
    ],
    oos_goes: [
      t("Sí, | el | 12 | va | para allá.", "Yes, | the | 12 | goes | that way.", "Yes, the 12 goes there.", { say: "Sí, el doce va para allá." }),
    ],
    oos_this_no: [
      t("Este | no, | voy | fuera de servicio. | Pero | el | 12 | sí | va | para allá.", "This one | no, | I'm going | out of service. | But | the | 12 | does | go | that way.",
        "Not this one, I'm out of service. But the 12 goes there.", { say: "Este no, voy fuera de servicio. Pero el doce sí va para allá." }),
    ],
    oos_no: [
      t("El | 12 | no va | a | {X.the}.", "The | 12 | doesn't go | to | {X.the}.", "The 12 doesn't go to the {X}.", { say: "El doce no va a {X.the}." }),
    ],
    oos_pay: [
      t("Le | paga | al | chofer | del | 12.", "(To) him | you-pay | to the | driver | of the | 12.", "You pay the driver on the 12.", { say: "Le paga al chofer del doce." }),
    ],
    oos_fare: [
      t("En | el | 12 | son | {$fare}.", "On | the | 12 | it's | {$fare}.", "On the 12 it's {$fare}.", { say: "En el doce son {$fare}." }),
    ],
    oos_same: [
      t("Sí, | es | lo | mismo, | {$fare}.", "Yes, | it's | the | same, | {$fare}.", "Yes, same fare, {$fare}."),
    ],
    oos_ask_driver: [
      t("Pídale | al | chofer | que | le | avise.", "Ask | the | driver | that | (to) you | he-lets-know.", "Ask the driver to let you know."),
    ],
    oos_bye: [
      t("¡Suerte! | Ahí | viene | el | 12.", "Good luck! | There | comes | the | 12.", "Good luck! Here comes the 12.", { say: "¡Suerte! Ahí viene el doce." }),
    ],
  },

  domains: {
    fare: () => [FARE],
    amount: () => [...Object.values(CHANGE), ...BIG, ...BIG.map((b) => b - FARE)],
    num: () => [3, 4, 6, 7, 8, 10, 15, 20],
  },

  hints: {
    ask_bus: {
      lt: "Ask if the bus goes where you need", slot: "dest", examples: ["centro", "mercado", "playa", "clinica"],
      items: [
        { id: "goes", s: t("¿Este | camión | va | a | {X.the}?", "This | bus | goes | to | {X.the}?", "Does this bus go to the {X}?",
          { flags: { 1: "Mexican: camión = city bus. Elsewhere: autobús." }, neutral: t("¿Este | autobús | va | a | {X.the}?", "This | bus | goes | to | {X.the}?", "Does this bus go to the {X}?") }),
          note: "In Mexico a city bus is el camión." },
        { id: "passes", s: t("¿Pasa | por | {X.the}?", "Does it pass | by | {X.the}?", "Does it go past the {X}?") },
        { id: "is_this", s: t("¿Este | es | el | que | va | a | {X.the}?", "This | is | the one | that | goes | to | {X.the}?", "Is this the one that goes to the {X}?") },
        { id: "going_to", s: t("Voy | a | {X.the}.", "I'm going | to | {X.the}.", "I'm going to the {X}.") },
        { id: "how_get", s: t("¿Cómo | llego | a | {X.the}?", "How | I-get | to | {X.the}?", "How do I get to the {X}?") },
      ],
    },
    fare: {
      lt: "Pay the fare",
      items: [
        { id: "here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "here_price", s: t("Tenga, | doce | pesos.", "Here, | twelve | pesos.", "Here's twelve pesos.") },
        { id: "pay_card", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "only_big", s: t("Solo | traigo | un | billete | de | quinientos.", "Only | I-carry | a | bill | of | five hundred.", "I only have a 500-peso bill."),
          note: "Drivers can't change big bills: carry coins and small bills." },
        { id: "no_exact", s: t("No traigo | cambio.", "I don't have | change.", "I don't have any change."), note: "traer (to carry) is how Mexicans say what they have on them." },
      ],
    },
    fare_q: {
      lt: "Ask the fare, change, a day pass or dollars",
      items: [
        { id: "fare", s: t("¿Cuánto | es?", "How much | is it?", "How much is it?") },
        { id: "give_change", s: t("¿Me | da | cambio?", "(To) me | you-give | change?", "Can you give me change?") },
        { id: "day_pass", s: t("¿Hay | pase | de | día?", "Is there | pass | of | day?", "Is there a day pass?") },
        { id: "dollars", s: t("¿Acepta | dólares?", "Do you accept | dollars?", "Do you take dollars?"), note: "City buses take pesos, in cash." },
      ],
    },
    ask_12: {
      lt: "Ask if the 12 goes where you need", slot: "dest", examples: ["centro", "mercado", "playa", "clinica"],
      items: [
        { id: "goes12", s: t("¿El | 12 | va | a | {X.the}?", "The | 12 | goes | to | {X.the}?", "Does the 12 go to the {X}?", { say: "¿El doce va a {X.the}?" }) },
      ],
    },
    stop: {
      lt: "Ask her to tell you where to get off", slot: "dest", examples: ["centro", "mercado", "playa"],
      items: [
        { id: "tell_me", s: t("¿Me | avisa | dónde | me bajo?", "(To) me | you-let-know | where | I get off?", "Could you tell me where to get off?") },
        { id: "tell_when", s: t("¿Me | avisa | cuando | lleguemos?", "(To) me | you-let-know | when | we-arrive?", "Could you let me know when we get there?") },
        { id: "where_off", s: t("¿Dónde | me bajo?", "Where | I get off?", "Where do I get off?") },
        { id: "let_me_know", s: t("¿Me | avisa | cuando | lleguemos | a | {X.the}?", "(To) me | you-let-know | when | we-arrive | to | {X.the}?", "Could you let me know when we get to the {X}?") },
        { id: "where_off_x", s: t("¿Dónde | me bajo | para | {X.the}?", "Where | I get off | for | {X.the}?", "Where do I get off for the {X}?") },
      ],
    },
    ride_q: {
      lt: "Ask how many stops or how long",
      items: [
        { id: "how_many_stops", s: t("¿Cuántas | paradas | son?", "How many | stops | are they?", "How many stops is it?") },
        { id: "how_long", s: t("¿Cuánto | tarda?", "How long | does it take?", "How long does it take?") },
        { id: "is_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
      ],
    },
    thanks: {
      lt: "Say thanks",
      items: [
        { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you so much!") },
        { id: "s_thanks_help", s: t("¡Gracias | por | su | ayuda!", "Thanks | for | your | help!", "Thanks for your help!") },
      ],
    },
    ride: {
      lt: "On the ride: your stop",
      items: [
        { id: "my_stop2", s: t("¿Aquí | me bajo?", "Here | I get off?", "Is this my stop?") },
        { id: "my_stop", s: t("¿Ya | es | mi | parada?", "Already | is it | my | stop?", "Is this my stop yet?") },
        { id: "button", s: t("¿Toco | el | timbre?", "I-press | the | buzzer?", "Should I press the buzzer?") },
        { id: "bajan", s: t("¡Bajan!", "Getting off!", "Getting off, please!"), note: "What Mexicans call out so the driver stops: literally “(people) are getting off!”." },
      ],
    },
    more: {
      lt: "Other useful questions",
      items: [
        { id: "how_often", s: t("¿Cada | cuánto | pasa?", "Every | how much | it-comes?", "How often does it come?") },
        { id: "last_bus", s: t("¿A | qué | hora | pasa | el | último?", "At | what | time | comes | the | last one?", "What time's the last bus?") },
        { id: "bus_back", s: t("¿Dónde | lo | tomo | de | regreso?", "Where | it | I-catch | on | return?", "Where do I catch it back?") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a driver, usted is more polite: “¿Me avisa…?”, “¿Va al centro?” (avisas / vas is for friends).", better: "¿Me avisa dónde me bajo?" },
  },

  merges: {
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name instead of naming it.", minimal: "Only the two-word name; Hotel stays separate." },
    "para allá": { reason: "lexical_expression", split: "para → for + allá → over there misreads the direction adverb: that way / there.", minimal: "Two words." },
    "así es": { reason: "lexical_expression", split: "así → like this + es → is misreads the fixed agreement: that's right.", minimal: "Two words." },
    "en el camino": { reason: "lexical_expression", split: "en → in + el → the + camino → road misreads the time adverb: on the way.", minimal: "Three words." },
    "la que sigue": { reason: "lexical_expression", split: "la → the + que → that + sigue → follows is the fixed phrase for the next one (stop).", minimal: "Three words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → not reads “still not”; the answer = not yet.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is the fixed adverb roughly.", minimal: "Three words." },
    "a las diez": { reason: "grammatical_fusion", split: "a → to + las → the + diez → ten: a clock time takes the article; English says at ten (S-TIME).", minimal: "Three words." },
    "fuera de servicio": { reason: "lexical_expression", split: "fuera → outside + de → of + servicio → service is the fixed phrase out of service.", minimal: "Three words." },
    "me bajo": { reason: "grammatical_fusion", split: "me → myself + bajo → I lower is a word-for-word reading of the reflexive verb: I get off (S-SE).", minimal: "Two words." },
    "al subir": { reason: "grammatical_fusion", split: "al → to the + subir → to go up misreads the time clause: when (you) get on.", minimal: "Two words." },
    "atrás de": { reason: "lexical_expression", split: "atrás → back + de → of is the compound preposition behind.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Ask if the bus goes there" },
    { lt: "Pay the fare", optional: true, when: (c) => !c.s.oos, done: (c) => !!c.s.paid },
    { lt: "Ask her to tell you where to get off", done: (c) => !!c.s.stopAsked },
    { lt: "Get off at your stop", optional: true, when: (c) => !c.s.oos, done: (c) => !!c.s.arrived },
  ],

  steps: [
    { id: "dest", done: (c) => !!c.s.dest,
      ask: (c) => c.say("ask_dest"),
      expects: ["ask_goes", "going_to", "dest_ctx", "dest_fix"],
      suggest: [{ lt: "Ask if the bus goes where you need", hint: "ask_bus", options: "dest" }, { lt: "Ask the fare", hint: "fare_q" }],
      help: (c) => { c.say("dest_help"); c.say("ask_dest"); },
      no: (c) => { c.say("dest_help"); c.say("ask_dest"); } },
    { id: "fare", when: (c) => !c.s.oos && !!c.s.dest, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (c.s.fareQuiet) { c.s.fareQuiet = false; return; } // the fare was just said
        if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { fare: FARE }); if (c.s.fareHow) c.say("fare_how"); }
        else c.say("fare_ask", { fare: FARE });
      },
      expects: ["pay_cash", "give", "cash_ctx", "pay_card", "pay_dollars", "pay_phone", "no_change", "day_pass", "ask_fare"],
      suggest: [{ lt: "Pay (cash only)", hint: "fare" }, { lt: "Ask about change or a day pass", hint: "fare_q" }] },
    { id: "known", when: (c) => !!c.s.dest && (c.s.oos || !!c.s.paid) && !!c.s.askKnown, done: (c) => !!c.s.stopAsked,
      ask: (c) => c.say("ask_known"),
      expects: ["ask_stop", "affirm", "deny", "tell_me_ctx", "known_place_ctx"],
      suggest: [{ lt: "Ask her to tell you where to get off", hint: "stop" }],
      help: (c) => { stopInfo(c, true, true); },
      yes: (c) => { c.s.stopAsked = true; c.say("known_great"); if (!c.s.cordTold && !c.s.oos) { c.s.cordTold = true; c.say("cord"); } },
      no: (c) => { stopInfo(c, true, true); } },
    { id: "stop", when: (c) => !!c.s.dest && (c.s.oos || !!c.s.paid), done: (c) => !!c.s.stopAsked,
      ask: (c) => {
        if (!c.s.oos && !c.s.seatSaid) { c.s.seatSaid = true; c.say("have_seat"); return; }
        c.s.askKnown = true;
        c.ask("known");
      },
      expects: ["ask_stop", "ask_stops_count", "ask_time", "sit_q"],
      suggest: [{ lt: "Ask her to tell you where to get off", hint: "stop" }, { lt: "Ask how many stops or how long", hint: "ride_q" }] },
    { id: "ride", when: (c) => !c.s.oos && !!c.s.stopAsked, done: (c) => !!c.s.arrived,
      ask: (c) => {
        if (!c.s.seatedAsked) { c.s.seatedAsked = true; if (!c.s.seatSaid) { c.s.seatSaid = true; c.say("have_seat"); } else c.say("stop_ok_short"); expectSeated(c); return; }
        if (c.s.midStop && !c.s.midSaid) {
          c.s.midSaid = true;
          c.say("mid_stop");
          ask(c, {
            id: "mid", hints: ["ride"], expects: ["is_my_stop"],
            suggest: [{ lt: "Ask if this is your stop", hint: "ride" }],
            on: {
              // the bus drives on: the learner speaks again before the next stop
              is_my_stop: (cc) => { cc.s.toldNext = true; cc.say("not_yet_next"); cc.hold(); },
              bajan: (cc) => { cc.s.toldNext = true; cc.say("not_yet_next"); cc.hold(); },
              g_thanks: (cc) => { cc.say("g_welcome"); },
              g_ok: () => {}, ack: () => {},
            },
            // "¿Bajan?" — "Sí" means "I'm getting off here": not yet
            yes: (cc) => { cc.s.toldNext = true; cc.say("not_yet_next"); cc.hold(); }, no: () => {},
          });
          return;
        }
        if (!c.s.nextSaid) {
          c.s.nextSaid = true;
          if (c.s.toldNext) c.say("next_now");
          else { c.say("next_yours", { X: D(c.s.dest).attrs!.stop }); if (c.s.dest === "museo") c.say("museum_across"); }
          c.say("le_paro");
          expectNext(c);
          return;
        }
        arrive(c);
      },
      expects: ["is_my_stop", "ask_button", "ack", "bajan"],
      suggest: [{ lt: "Say thanks", hint: "thanks" }, { lt: "Ask if this is your stop", hint: "ride" }] },
  ],

  init: (c) => {
    c.s.oos = c.visits >= 1 && c.chance(0.35);
    c.s.fareHow = c.chance(0.5);
    c.s.askKnown = c.s.oos || c.chance(0.5);
    c.s.midStop = c.chance(0.5);
  },

  start: (c) => {
    if (c.s.oos) {
      c.twist("out_of_service");
      c.say("oos");
      c.say("oos_take12");
      ask(c, {
        id: "oos_dest", optional: true, expects: ["ask_goes", "going_to", "dest_ctx"], hints: ["ask_12"],
        suggest: [{ lt: "Ask if the 12 goes where you need", hint: "ask_12", options: "dest" }],
        on: {
          ask_goes: (cc, sl, sg) => { bus.handlers.ask_goes(cc, sl, sg); },
          going_to: (cc, sl, sg) => { bus.handlers.going_to(cc, sl, sg); },
          dest_ctx: (cc, sl, sg) => { bus.handlers.dest_ctx(cc, sl, sg); },
        },
      });
      return;
    }
    const r = c.rng();
    if (r < 0.25) { c.say("greet_howareyou"); expectHowAreYou(c); return; }
    c.say("greet");
    if (r < 0.6) c.hold(); // the learner starts; the "dest" step is what they answer
  },

  handlers: {
    affirm(c) { const st = bus.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); },
    deny(c) { const st = bus.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    ask_goes(c, slots, seg) {
      const d = slots.dest as string | undefined;
      if (!d) return;
      if (c.s.oos && !seg.tags.includes("twelve") && D(d).attrs?.served && !c.s.dest) { c.s.dest = d; c.say("oos_this_no"); return; }
      if (c.s.dest && c.s.dest === d) { c.say("goes_yes_again"); return; }
      setDest(c, d, seg.tags.includes("is") ? "is" : "q");
    },
    going_to(c, slots) { const d = slots.dest as string | undefined; if (d) setDest(c, d, "stmt"); },
    // "¿Y al museo?" is a question; "Al museo" says where they're going
    dest_ctx(c, slots) { const d = slots.dest as string | undefined; if (d) setDest(c, d, /\?\s*$/.test(c.heard) ? "q" : "stmt"); },
    dest_fix(c, slots) {
      const d = slots.to as string | undefined;
      if (!d) return;
      if (c.s.dest === slots.dest) c.s.dest = undefined;
      setDest(c, d, "stmt");
    },
    dest_unknown(c) { c.say("dest_unknown"); c.say("ask_dest"); c.hold(); },
    dest_neg(c, slots) {
      const d = slots.dest as string | undefined;
      if (d && c.s.dest === d) c.s.dest = undefined;
      c.say("dest_neg_ack"); c.hold();
    },
    ask_fare(c, slots, seg) {
      if (c.s.oos) { c.say(seg.tags.includes("same") ? "oos_same" : "oos_fare", { fare: FARE }); return; }
      if (!slots.dest && !c.s.dest && mentionsDest(c)) { c.s.deferQ = "fare"; return; }
      // "¿Cuánto cuesta ir a la playa?": the place first ("Por ahí pasamos"), then the price; no "Sí, sí va"
      if (slots.dest && !c.s.dest) { c.s.deferQ = "fare"; setDest(c, slots.dest, "q"); c.s.deferQ = undefined; return; }
      // "¿Le pago al bajar?" / "¿Dónde pago?" gets when and where, not only the price
      if (seg.tags.includes("when")) {
        c.say(c.s.paid ? "paid_already" : "pay_when", { fare: FARE });
        if (!c.s.paid) { c.s.fareSaid = true; c.hold(); }
        return;
      }
      c.s.fareSaid = true;
      // "¿Son doce pesos?" gets a yes or a no
      if (seg.tags.includes("check") && typeof slots.price === "number") c.say(slots.price === FARE ? "fare_yes" : "fare_no_is", { fare: FARE });
      else c.say("fare_is", { fare: FARE });
      if (!c.s.dest) c.say("ask_dest");
      c.hold();
    },
    pay_card(c, _slots, seg) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      c.twist("cash_only");
      // "No traigo efectivo" is not a question: no "No, perdón…"
      if (seg.tags.includes("nocash")) { c.say("nocash"); c.say("atm"); c.hold(); return; }
      c.say("card_no");
    },
    pay_dollars(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      c.twist("cash_only");
      c.say("dollars_no");
      c.say("atm");
      c.hold();
    },
    ask_atm(c) { c.say("atm"); c.hold(); },
    route_q(c) { c.say(c.s.oos ? "oos" : "route_7"); },
    pay_phone(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      c.twist("cash_only");
      c.say("phone_no");
    },
    pay_cash(c, slots, seg) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      if (seg.tags.includes("ask")) { c.say("cash_yes"); if (!c.s.fareSaid && c.s.dest) { c.s.fareSaid = true; c.say("fare_is", { fare: FARE }); c.hold(); } return; }
      if (seg.tags.includes("nocard")) { c.say("cash_fine"); return; }
      const price = slots.price as number | undefined;
      if (typeof price === "number" && price > 10000) { bigBill(c, price); return; }
      if (typeof price === "number" && price < FARE) { c.say("fare_short", { fare: FARE }); c.s.fareSaid = true; c.hold(); return; }
      pay(c, price);
    },
    cash_ctx(c, slots, seg) {
      // "¿Doce pesos?" / "Doce, ¿verdad?" checks the price; it doesn't pay
      if (/\?\s*$/.test(c.heard) && typeof slots.price === "number" && !c.s.paid && !c.s.oos) {
        c.s.fareSaid = true;
        c.say(slots.price === FARE ? "fare_yes" : "fare_no_is", { fare: FARE });
        c.hold();
        return;
      }
      bus.handlers.pay_cash(c, slots, seg);
    },
    known_place_ctx(c, slots) {
      const d = slots.dest as string | undefined;
      // "Sí, en el zócalo" on the way to the museum: the same stop, not a new destination
      if (d && c.s.dest && D(d).attrs?.stop && D(d).attrs!.stop === D(c.s.dest).attrs?.stop) { bus.steps.find((x) => x.id === "known")?.yes?.(c); return; }
      if (d && d !== c.s.dest) { setDest(c, d, "stmt"); if (c.s.dest !== d) return; }
      bus.steps.find((x) => x.id === "known")?.yes?.(c);
    },
    tell_me_ctx(c, slots, seg) { bus.handlers.ask_stop(c, slots, seg); },
    give(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      pay(c);
    },
    no_change(c, slots, seg) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      const price = slots.price as number | undefined;
      const q = seg.tags.includes("ask");
      if (typeof price === "number" && price > 10000) { bigBill(c, price); return; }
      if (seg.tags.includes("big")) { bigBill(c); return; }
      if (typeof price === "number" && price < FARE) { c.s.fareSaid = true; c.say("fare_short", { fare: FARE }); c.hold(); return; }
      if (typeof price === "number") { if (q) c.say("change_yes"); else pay(c, price); return; }
      if (q) { c.say("change_ok"); return; }
      c.say("no_exact_ok");
    },
    day_pass(c) {
      if (c.s.oos) { c.say("oos_fare", { fare: FARE }); return; }
      c.say("no_pass");
    },
    no_smaller_ctx(c) { if (!c.s.paid && !c.s.oos) changeLater(c); },
    no_day_pass(c) { if (c.s.paid) c.say("no_problem"); },
    transfer(c) { c.say("transfer"); },
    ask_stop(c, slots, seg) {
      const d = slots.dest as string | undefined;
      if (d && d !== c.s.dest) { setDest(c, d, "stmt"); if (c.s.dest !== d) return; }
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      // "¿Dónde me bajo?" / "¿Cuál es la parada?" gets the stop; "¿Me avisa…?" gets "Yo le aviso"
      if (seg.tags.includes("where")) {
        const e = D(c.s.dest);
        c.s.stopAsked = true;
        c.say(e.attrs!.last ? "last_stop" : "stop_name", { X: e.attrs!.stop });
        if (c.s.dest === "museo") c.say("museum_across");
        if (c.s.oos) c.say("oos_ask_driver");
        else { c.say("i_tell"); if (!c.s.cordTold) { c.s.cordTold = true; c.say("cord"); } }
        return;
      }
      stopInfo(c);
    },
    ask_stops_count(c, slots) {
      if (!placeFromQuestion(c, slots, "stops")) return;
      c.s.stopsTold = true;
      c.say("stops_count", { num: D(c.s.dest).attrs!.stops });
    },
    ask_time(c, slots) {
      if (!placeFromQuestion(c, slots, "time")) return;
      c.say("ride_time", { num: D(c.s.dest).attrs!.mins });
    },
    ask_frequency(c) { c.say("frequency"); },
    ask_last(c) { c.say("last_bus"); },
    ask_back(c) { c.say("bus_back"); },
    ask_button(c) { c.s.cordTold = true; c.say("button"); },
    is_my_stop(c) {
      if (c.s.arrived) { c.say("my_stop_yes"); return; }
      if (c.s.toldNext && c.s.paid) { c.say("my_stop_yes"); arrive(c, true); return; }
      c.say("not_yet_tell");
    },
    bajan(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (!c.s.paid && !c.s.oos) { if (!c.s.dest) { c.say("ask_dest"); c.hold(); } return; }
      if (c.s.toldNext && !c.s.oos) { arrive(c); return; } // "Su parada es la que sigue" — and here it is
      c.say("not_yet_tell");
    },
    sit_q(c) { c.say("sit_anywhere"); },
    ack(c) { if (c.step === "known") { const st = bus.steps.find((x) => x.id === "known"); st?.yes?.(c); } },
    g_ok(c) { if (c.step === "known") { const st = bus.steps.find((x) => x.id === "known"); st?.yes?.(c); } },
  },

  finish: (c) => {
    c.complete();
    if (c.s.oos) c.say("oos_bye");
    else if (!c.s.byeSaid) c.say("bye");
    closing(c);
  },

  tests: [
    // the bus: every hint pattern and more
    { say: "¿Este camión va al centro?", intent: "ask_goes", step: "dest", slots: { dest: "centro" } },
    { say: "¿Este autobús va a la playa?", intent: "ask_goes", slots: { dest: "playa" } },
    { say: "¿Pasa por el mercado?", intent: "ask_goes", slots: { dest: "mercado" } },
    { say: "¿Este es el que va a la clínica?", intent: "ask_goes", slots: { dest: "clinica" } },
    { say: "¿Va al zócalo este camión?", intent: "ask_goes", slots: { dest: "centro" } },
    { say: "¿Qué camión me lleva al museo?", intent: "ask_goes", slots: { dest: "museo" } },
    { say: "Voy al mercado", intent: "going_to", slots: { dest: "mercado" } },
    { say: "¿Cómo llego a la playa?", intent: "going_to", slots: { dest: "playa" } },
    { say: "Necesito ir al Hotel Mar Azul", intent: "going_to", slots: { dest: "hotel" } },
    { say: "Al malecón", intent: "dest_ctx", step: "dest", slots: { dest: "malecon" } },
    { say: "¿Vas al centro?", intent: "ask_goes", slots: { dest: "centro" } },
    { say: "¿Este camión va a Cancún?", intent: "dest_unknown" },
    { say: "¿El 12 va al mercado?", intent: "ask_goes", slots: { dest: "mercado" } },
    { say: "No al centro, al mercado", intent: "dest_fix", step: "dest", slots: { to: "mercado" } },
    // the fare
    { say: "¿Cuánto es?", intent: "ask_fare" },
    { say: "¿Cuánto es en el doce?", intent: "ask_fare" },
    { say: "Aquí tiene", intent: "give", step: "fare" },
    { say: "Tenga, doce pesos", intent: "pay_cash", step: "fare", slots: { price: 1200 } },
    { say: "Doce pesos", intent: "cash_ctx", step: "fare", slots: { price: 1200 } },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "fare" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_phone", step: "fare" },
    { say: "Solo traigo un billete de quinientos", intent: "no_change", step: "fare", slots: { price: 50000 } },
    { say: "No traigo cambio", intent: "no_change", step: "fare" },
    { say: "¿Me da cambio?", intent: "no_change", step: "fare" },
    { say: "¿Hay pase de día?", intent: "day_pass", step: "fare" },
    { say: "¿Hay transbordo?", intent: "transfer" },
    // where to get off
    { say: "¿Me avisa dónde me bajo?", intent: "ask_stop" },
    { say: "¿Me avisa cuando lleguemos?", intent: "ask_stop" },
    { say: "¿Me avisa cuando lleguemos al mercado?", intent: "ask_stop", slots: { dest: "mercado" } },
    { say: "¿Dónde me bajo?", intent: "ask_stop" },
    { say: "¿Dónde me bajo para la clínica?", intent: "ask_stop", slots: { dest: "clinica" } },
    { say: "¿Me avisas dónde me bajo?", intent: "ask_stop" },
    { say: "No, ¿me avisa?", intent: "tell_me_ctx", step: "known" },
    { say: "No, es mi primera vez", intent: "deny", step: "known" },
    { say: "Sí, ya sé dónde bajarme", intent: "affirm", step: "known" },
    { say: "¿Cuántas paradas son?", intent: "ask_stops_count" },
    { say: "¿Cuánto tarda?", intent: "ask_time" },
    { say: "¿Está lejos?", intent: "ask_stops_count" },
    { say: "¿Aquí me bajo?", intent: "is_my_stop" },
    { say: "¿Ya es mi parada?", intent: "is_my_stop" },
    { say: "¿Toco el timbre?", intent: "ask_button" },
    { say: "¡Bajan!", intent: "bajan" },
    { say: "En la esquina, por favor", intent: "bajan" },
    { say: "¿Cada cuánto pasa?", intent: "ask_frequency" },
    { say: "¿A qué hora pasa el último?", intent: "ask_last" },
    { say: "¿Dónde lo tomo de regreso?", intent: "ask_back" },
    { say: "¿Puedo sentarme donde sea?", intent: "sit_q" },
    // learners' Spain forms: vosotros, coger, el móvil, vale
    { say: "¿Vosotros vais al centro?", intent: "ask_goes", slots: { dest: "centro" } },
    { say: "Quiero coger el autobús a la playa", intent: "going_to", slots: { dest: "playa" } },
    { say: "¿Puedo pagar con el móvil?", intent: "pay_phone", step: "fare" },
    { say: "¿Vale doce pesos?", intent: "ask_fare" },
    // never flip the meaning
    { say: "No voy al centro", intent: "dest_neg", not: ["going_to", "ask_goes", "dest_ctx"] },
    { say: "No quiero ir a la playa", intent: "dest_neg", not: ["going_to"] },
    { say: "No traigo efectivo", intent: "pay_card", step: "fare", not: ["pay_cash", "give"] },
    { say: "No tengo tarjeta", intent: "pay_cash", step: "fare", not: ["pay_card"] },
    { say: "No quiero pase de día", intent: "no_day_pass", not: ["day_pass"] },
    { say: "No pare aquí", intent: "none" },
    { say: "No me avise", intent: "none" },
    { say: "El doce no va al centro", intent: "none" },
    { say: "No, a la playa", intent: "dest_ctx", step: "dest", slots: { dest: "playa" }, not: ["dest_neg"] },
    { say: "Al centro no, al mercado", intent: "dest_fix", step: "dest", slots: { to: "mercado" }, not: ["dest_neg"] },
    { say: "No traigo monedas", intent: "no_change", step: "fare", not: ["pay_cash"] },
    { say: "No sé dónde bajarme", intent: "ask_stop", step: "known", not: ["affirm"] },
    { say: "No me bajo aquí", intent: "none" },
    // more ways to say it
    { say: "¿Este camión me deja cerca de la playa?", intent: "ask_goes", slots: { dest: "playa" } },
    { say: "¿Este para en el muelle?", intent: "ask_goes", slots: { dest: "malecon" } },
    { say: "¿Cuál es la parada del mercado?", intent: "ask_stop", slots: { dest: "mercado" } },
    { say: "Le doy un billete de cincuenta", intent: "pay_cash", step: "fare", slots: { price: 5000 } },
    { say: "¿Tiene cambio de doscientos?", intent: "no_change", step: "fare", slots: { price: 20000 } },
    { say: "¿Tengo que pagar ahora?", intent: "ask_fare", step: "fare" },
    { say: "¿Son doce pesos?", intent: "ask_fare", step: "fare", slots: { price: 1200 } },
    { say: "¿Cómo le hago para bajarme?", intent: "ask_button" },
    { say: "Sí, en el mercado", intent: "known_place_ctx", step: "known", slots: { dest: "mercado" } },
    // review: traps and gaps
    { say: "¿Este no va al centro?", intent: "ask_goes", step: "dest", slots: { dest: "centro" }, not: ["dest_neg"] },
    { say: "Disculpe, ¿este camión me sirve para ir al hospital?", intent: "ask_goes", slots: { dest: "clinica" } },
    { say: "¿Cuánto cuesta ir a la playa?", intent: "ask_fare", step: "dest", slots: { dest: "playa" } },
    { say: "¿Puedo tomar este camión para ir al centro?", intent: "ask_goes", slots: { dest: "centro" } },
    { say: "¿Es el siete?", intent: "route_q", step: "dest", not: ["ask_fare"] },
    { say: "Son doce, ¿no?", intent: "ask_fare", step: "fare", slots: { price: 1200 } },
    { say: "Un boleto, por favor", intent: "ask_fare", step: "fare" },
    { say: "¿Le pago al bajar?", intent: "ask_fare", step: "fare" },
    { say: "¿Puedo pagar con cien?", intent: "no_change", step: "fare", slots: { price: 10000 }, not: ["pay_cash"] },
    { say: "¿Aceptan dólares?", intent: "pay_dollars", step: "fare" },
    { say: "No tengo pesos", intent: "pay_dollars", step: "fare", not: ["pay_cash", "give"] },
    { say: "¿Dónde hay un cajero?", intent: "ask_atm", step: "fare" },
    { say: "No, es la primera vez que vengo", intent: "deny", step: "known", not: ["affirm"] },
    { say: "No, no sé dónde", intent: "deny", step: "known", not: ["affirm"] },
    { say: "Sí, sí sé", intent: "affirm", step: "known", not: ["deny"] },
    { say: "Más o menos", intent: "tell_me_ctx", step: "known" },
    { say: "¿Puede avisarme?", intent: "ask_stop", step: "stop" },
    { say: "¿Es lejos?", intent: "ask_stops_count", step: "stop" },
    { say: "¿Es la próxima?", intent: "is_my_stop", step: "ride" },
    { say: "¿Me puede bajar aquí?", intent: "bajan", step: "ride" },
    { say: "No sé a dónde voy", intent: "deny", step: "dest", not: ["going_to", "ask_goes"] },
    // not understood
    { say: "Mi perro come mangos en la playa", intent: "none" },
    { say: "La lavadora de mi tía es azul", intent: "none" },
    { say: "camión ventana banana", intent: "none" },
  ],

  sims: [
    // (the bus runs on every seed in these; the out-of-service twist has its own sim)
    { name: "happy path: the center, exact fare, tell me where", turns: ["¿Este camión va al centro?", "Tenga, doce pesos", "¿Me avisa dónde me bajo?", "Gracias", "¡Bajan!", "¡Gracias, adiós!"],
      expect: { complete: true, state: { dest: "centro", paid: true, arrived: true } }, auto: AUTO, setup: (s) => { s.oos = false; s.midStop = false; } },
    { name: "questions and a change of mind: card first, then cash", turns: ["Voy a la playa", "¿Cuánto es?", "Mejor al mercado", "¿Acepta tarjeta?", "Aquí tiene veinte pesos", "¿Cuántas paradas son?", "¿Dónde me bajo?", "¿Cada cuánto pasa?", "Gracias", "¿Aquí me bajo?", "¡Bajan!", "¡Muchas gracias!"],
      expect: { complete: true, state: { dest: "mercado", paid: true, arrived: true } }, auto: AUTO, setup: (s) => { s.oos = false; s.midStop = true; s.askKnown = false; } },
    { name: "twist: a 500 bill, no change, she pays it back on the way", turns: ["Voy al centro", "Solo traigo un billete de quinientos", "No, no traigo", "¿Cuánto tarda?", "¿Me avisa cuando lleguemos?", "Gracias", "En la esquina, por favor", "Gracias, que tenga buen día"],
      expect: { complete: true, state: { dest: "centro", paid: true, changeOwed: false } }, auto: AUTO, setup: (s) => { s.oos = false; s.askKnown = false; s.midStop = false; } },
    { name: "twist: out of service, take the 12", turns: ["Ah, ok. ¿El 12 va al mercado?", "¿Cuánto es en el doce?", "No, no sé", "¡Gracias!"],
      expect: { complete: true, state: { dest: "mercado", stopAsked: true } }, auto: AUTO, setup: (s) => { s.oos = true; s.askKnown = true; } },
    { name: "short answers", turns: ["Al mercado", "Tenga", "No", "Gracias", "Sí", "Adiós"],
      expect: { complete: true, state: { dest: "mercado", paid: true, arrived: true } }, auto: AUTO, setup: (s) => { s.oos = false; s.midStop = false; s.askKnown = false; } },
    { name: "the wrong bus first, then the museum", turns: ["¿Este camión va al aeropuerto?", "Ah, ok. ¿Y al museo?", "¿Puedo pagar en efectivo?", "Aquí tiene", "Sí, ya sé dónde bajarme", "Gracias", "¡Bajan!", "¡Gracias!"],
      expect: { complete: true, state: { dest: "museo", paid: true, unserved: "aeropuerto" } }, auto: AUTO, setup: (s) => { s.oos = false; s.askKnown = true; s.midStop = false; } },
    { name: "checking the price, dollars, and not getting off yet", turns: ["¿Cuánto cuesta ir a la playa?", "¿Doce pesos?", "¿Aceptan dólares?", "Tome, veinte", "¿Me avisa cuando lleguemos?", "Gracias", "No, la siguiente", "¡Bajan!", "Gracias"],
      expect: { complete: true, state: { dest: "playa", paid: true, arrived: true } }, auto: AUTO, setup: (s) => { s.oos = false; s.askKnown = false; s.midStop = false; } },
    { name: "the fare first, with the place in the same question", turns: ["¿Cuánto cuesta al aeropuerto?", "¿Cuánto cuesta al centro?", "Tenga, veinte pesos", "Sí, en el zócalo", "Gracias", "¡Bajan!", "Gracias"],
      expect: { complete: true, state: { dest: "centro", paid: true, unserved: "aeropuerto" } }, auto: AUTO, setup: (s) => { s.oos = false; s.askKnown = true; s.midStop = false; } },
  ],
};

export default bus;
