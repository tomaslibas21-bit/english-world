// NEEDS: None. Vocabulary, merges and the seat and bag helpers are local.
// Song 64 "Window or Aisle?" (part 1 of 3) → Puerto Colibrí: "¿Ventana o pasillo?".
// Emilio at the airline's check-in counter of Puerto Colibrí's small airport (usted). A domestic flight, PC 223 to
// Mexico City at 8:10 a.m.: the destination, the passport (or a resident card) as ID, "¿Documenta equipaje?", the bag
// on the báscula (25 kilos per bag; Mexico weighs in kilos, the learner may ask about pounds), a safety question
// (lithium batteries / power banks, or "¿Usted mismo hizo su maleta?"), window, aisle or middle, the boarding pass
// (pase de abordar), the gate (sala 4, as the gate conversation s64c has it), boarding at 7:30, and the way to security.
// Twists: the bag is 2 kilos over (more likely after the first visit): $600 overweight fee or move things to the
// carry-on; no window seats left (visits ≥ 1); a power bank in the checked bag (learner-driven).
// Research (2 Nov 2026), kept vague where unsure: Mexican domestic fares usually allow 25 kg per checked bag;
// overweight is charged at the counter (the real fee depends on the airline and the kilos: $600 here is a round
// invented figure); lithium power banks must travel in the cabin; "documentar" is the Mexican verb for checking a bag,
// "sala" is often said for the gate, "filtro de seguridad" for the security checkpoint. The flight code PC is invented.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const CITIES: EntityDef[] = [
  ent("cdmx", "Ciudad de México", "Mexico City", "f", { forms: ["la ciudad de mexico", "ciudad de mexico", "cdmx", "la cdmx", "el df", "df", "mexico df",
    "el de efe", "de efe", "la capital", "mexico", "el aeropuerto de la ciudad de mexico", "ciudad mexico"] }),
  ent("guadalajara", "Guadalajara", "Guadalajara", "f"),
  ent("monterrey", "Monterrey", "Monterrey", "m"),
  ent("merida", "Mérida", "Mérida", "f"),
  ent("cancun", "Cancún", "Cancún", "m"),
  ent("oaxaca", "Oaxaca", "Oaxaca", "f"),
  ent("tijuana", "Tijuana", "Tijuana", "f"),
  ent("puerto_vallarta", "Puerto Vallarta", "Puerto Vallarta", "m", { forms: ["vallarta"] }),
  ent("houston", "Houston", "Houston", "m"),
  ent("dallas", "Dallas", "Dallas", "m"),
  ent("toronto", "Toronto", "Toronto", "m"),
  ent("new_york", "Nueva York", "New York", "f", { forms: ["new york", "nueva yor"] }),
  ent("los_angeles", "Los Ángeles", "Los Angeles", "m", { forms: ["los angeles"] }),
  ent("chicago", "Chicago", "Chicago", "m"),
  ent("miami", "Miami", "Miami", "m"),
  ent("madrid", "Madrid", "Madrid", "m"),
];

// Seats: Mexicans say "¿Ventana o pasillo?" with a bare noun; the middle seat is "en medio" ("el de en medio").
const SEATS: EntityDef[] = [
  ent("window", "ventana", "window", "f", { chip: "ventana",
    forms: ["la ventana", "ventanas", "ventanilla", "la ventanilla", "junto a la ventana", "del lado de la ventana", "lado de la ventana", "en la ventana",
      "asiento de ventana", "un asiento de ventana", "el de la ventana", "la de la ventana", "ventanita", "cerca de la ventana", "pegado a la ventana"] }),
  ent("aisle", "pasillo", "aisle", "m", { chip: "pasillo",
    forms: ["el pasillo", "del lado del pasillo", "lado del pasillo", "en el pasillo", "junto al pasillo", "asiento de pasillo", "un asiento de pasillo",
      "el del pasillo", "cerca del pasillo", "pasillos"] }),
  ent("middle", "en medio", "middle", "m", { chip: "en medio",
    forms: ["medio", "el de en medio", "el de medio", "en el medio", "el del medio", "asiento de en medio", "asiento del medio", "el centro", "en el centro",
      "el del centro", "uno en medio", "un asiento en medio"] }),
];

const SEAT_NO: Record<string, { en: string; lt: string; say: string }> = {
  window: { en: "12A", lt: "12A", say: "doce a" },
  aisle: { en: "14C", lt: "14C", say: "catorce ce" },
  middle: { en: "23B", lt: "23B", say: "veintitrés be" },
};

/** The seats as Emilio says them back ("Perdón, ¿pasillo o en medio?"): values with a list, so the voice line list has
 *  every pair (a line with two entities, {X} and {Y}, was voiced only with the pairs random talk happened to reach). */
const SEAT_WORD: Record<string, { en: string; lt: string; say: string }> = {
  window: { en: "ventana", lt: "window", say: "ventana" },
  aisle: { en: "pasillo", lt: "aisle", say: "pasillo" },
  middle: { en: "en medio", lt: "middle", say: "en medio" },
};
const seatPair = (a: string, b: string) => ({ sa: SEAT_WORD[a], sb: SEAT_WORD[b] });

const NUM_WORD: Record<number, { en: string; lt: string; say: string }> = {
  2: { en: "Dos", lt: "Two", say: "Dos" },
  3: { en: "Tres", lt: "Three", say: "Tres" },
  4: { en: "Cuatro", lt: "Four", say: "Cuatro" },
  5: { en: "Cinco", lt: "Five", say: "Cinco" },
  6: { en: "Seis", lt: "Six", say: "Seis" },
};

const FEE = 60000; // $600 overweight fee (invented round figure)

const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

/** Documents the learner may hand over. */
const DOCS = [
  L("passport", ["pasaporte", "pasaportes", "el pasaporte"]),
  L("resident", ["tarjeta de residente", "tarjeta de residencia", "residencia", "credencial de residente", "mi residencia", "tarjeta de residente temporal",
    "tarjeta de residente permanente"]),
  L("id", ["identificacion", "credencial", "licencia", "licencia de manejo", "licencia de conducir", "ine", "id"]),
  L("booking", ["reservacion", "reserva", "boleto", "pase de abordar", "tarjeta de embarque", "confirmacion", "itinerario", "boletos"]),
  L("card", ["tarjeta", "tarjeta de credito", "tarjeta de debito"]),
];

/** Things a learner can move out of a heavy bag. */
const THINGS = [
  L("sweater", ["jersey", "jerseis", "jerseys", "sueter", "sueteres", "sudadera", "sudaderas", "chamarra", "chamarras", "chaqueta", "chaquetas", "abrigo", "chaleco", "rompevientos"]),
  L("shoes", ["zapatos", "tenis", "botas", "sandalias", "huaraches"]),
  L("books", ["libros", "libro"]),
  L("clothes", ["ropa", "playeras", "camisas", "pantalones", "jeans", "vestidos", "camisetas"]),
  L("laptop", ["laptop", "computadora", "tableta", "camara"]),
  L("gifts", ["regalos", "recuerdos", "artesanias", "souvenirs"]),
  L("toiletries", ["cosmeticos", "perfume", "shampoo", "cremas"]),
];

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  hello: "Sí, quisiera hacer el check-in.",
  dest: "A la Ciudad de México, por favor.",
  dest_confirm: "Sí, ese es mi vuelo.",
  passport: "Aquí tiene.",
  bags: "Solo una maleta.",
  bag_count: "Solo una.",
  packed: "Sí, claro.",
  packed_follow: "Sí.",
  battery: "No, no traigo nada de eso.",
  battery_move: "Claro.",
  scale: "Claro.",
  overweight: "Voy a pasar unas cosas a mi equipaje de mano.",
  moving: "Listo, ¿y ahora?",
  fee: "Aquí tiene mi tarjeta.",
  seat: "Ventana, por favor.",
  seat_clarify: "Sí, por favor.",
  no_window: "Sí, está bien.",
  no_window_middle: "No, gracias.",
  bp: "No, es todo, gracias.",
};

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** The learner's words, folded and without punctuation ("Sí, tengo." → "si tengo"). */
const words = (heard: string) => fold(heard).replace(/[^a-z0-9]+/g, " ").trim();
/** A "no" in the answer ("Listo, ya no quiero pagar"), not counting a tag question ("Listo, ¿no?"). */
const saysNo = (heard: string) => /\bno\b/.test(words(heard.replace(/[,¿\s]*no\s*\?+\s*$/i, "")));
const plainAck = (heard: string) =>
  /^\s*(ok|okey|vale|sale|va|bueno|muy bien|perfecto|listo|claro|gracias|muchas gracias|esta bien)\b/.test(fold(heard)) && !/pregunta|duda/.test(fold(heard));

const FLIGHT = 223;
/** The flight number said: "223", "doscientos veintitrés", or digit by digit and in pairs ("dos dos tres",
 *  "dos veintitrés", "veintidós tres": the `code` digits slot). */
const flightNo = (slots: any): number | undefined =>
  typeof slots.number === "number" ? slots.number : typeof slots.code === "string" ? parseInt(slots.code, 10) : undefined;
/** "El vuelo de las ocho y diez": 8:10 a.m. (or a rounded 8:00–8:15) is this booking; another time is not. */
const flightTimeOk = (t: any) => !!t && t.h === 8 && t.m <= 15 && t.ampm !== "pm";

/** Per-turn memory (one learner utterance may arrive as several segments). */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };

// ---------------------------------------------------------------------------
// Flow helpers

/** c.expect() that also takes "Sí, ese es mi vuelo" / "No, ese no es" (affirm / deny) as yes / no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

function setDest(c: Ctx, city: string) {
  c.s.hello = true;
  const T = turn(c);
  if (T.destDone) return;
  T.destDone = true;
  if (city === "cdmx") {
    const first = !c.s.dest;
    c.s.dest = "cdmx";
    if (first && !c.s.passport && !/pasaporte|aqui/.test(fold(c.heard))) c.say("dest_ack", { X: "cdmx" });
    else if (!first) c.say("flight_ack");
    return;
  }
  if (c.s.passport) { c.say("flight_wrong"); return; }
  c.say("dest_wrong", { X: city });
  c.say("dest_only_cdmx");
  expectDestConfirm(c);
}

function expectDestConfirm(c: Ctx) {
  c.say("dest_confirm_q");
  ask(c, {
    id: "dest_confirm", optional: true, expects: ["dest_ans", "dest_ctx", "affirm", "deny"], hints: ["confirm"],
    suggest: [{ lt: "Confirm you're flying to Mexico City", hint: "confirm" }],
    yes: (cc) => { cc.s.dest = "cdmx"; cc.say("ack"); },
    no: (cc) => { cc.s.lookup = true; cc.say("check_passport"); },
    on: { dest_ans: (cc, sl) => {
      if (sl.city && sl.city !== "cdmx") { cc.say("dest_only_cdmx"); expectDestConfirm(cc); return; }
      cc.s.dest = "cdmx"; cc.say("ack");
    }, dest_ctx: (cc, sl) => { flightSaid(cc, sl); } },
    ask: (cc) => cc.say("dest_confirm_q"),
  });
}

/** A flight named by its number, or by its time (`byTime`: a wrong time gets the right one, never "perfecto"). */
function setFlight(c: Ctx, n: number, byTime = false) {
  c.s.hello = true;
  const T = turn(c);
  if (T.destDone) return;
  T.destDone = true;
  c.s.dest = "cdmx";
  if (n !== FLIGHT && byTime) c.s.timeTold = true;
  c.say(n === FLIGHT ? "flight_ack" : byTime ? "flight_time" : "flight_wrong");
}

/** What the learner said about the flight: a wrong city first (the booking is to Mexico City), then the number, the
 *  time ("el vuelo de las nueve" is not this one), the city. */
function flightSaid(c: Ctx, slots: any): boolean {
  if (slots.city && slots.city !== "cdmx") { setDest(c, slots.city); return true; }
  const n = flightNo(slots);
  if (n !== undefined) { setFlight(c, n); return true; }
  if (slots.time) { setFlight(c, flightTimeOk(slots.time) ? FLIGHT : 0, true); return true; }
  if (slots.city) { setDest(c, slots.city); return true; }
  return false;
}

function passportGiven(c: Ctx) {
  c.s.passport = true;
  c.s.hello = true;
  c.say("pp_thanks");
  const lookup = !c.s.dest || c.s.lookup;
  c.s.dest = "cdmx";
  // the departure time was just given ("el vuelo de las nueve"): not again (rule 13)
  c.say(lookup || c.s.timeTold ? "found_lookup" : "found_booking");
}

function weigh(c: Ctx) {
  // the overweight choice is open: a "Tenga" / "Aquí está" / "Listo" doesn't weigh the bag (and say the twist) again;
  // the open question is asked again instead
  if (c.s.owShown && !c.s.owDone) return;
  if (c.s.overweight && !c.s.owDone) {
    c.twist("overweight");
    c.s.owShown = true;
    c.s.kg = 27;
    c.say(c.s.bags >= 2 ? "ow_result_many" : "ow_result");
    c.say("ow_options", { price: FEE });
    expectOverweight(c);
    return;
  }
  c.s.weighed = true;
  if (c.s.bags >= 3) c.say("weigh_ok_many");
  else if (c.s.bags === 2) c.say("weigh_ok_two");
  else c.say("weigh_ok", { kg: c.s.kg });
}

function expectOverweight(c: Ctx) {
  ask(c, {
    id: "overweight", expects: ["move_items", "move_items_ctx", "pay_fee", "pay_fee_ctx", "pay_card", "pay_cash", "pay_other_ctx", "ask_fee", "ask_over", "ask_limit"],
    hints: ["ow_move", "ow_pay", "ow_ask"],
    suggest: [
      { lt: "Move a few things to your carry-on", hint: "ow_move" },
      { lt: "Pay the overweight fee", hint: "ow_pay" },
      { lt: "Ask how much it is or what the limit is", hint: "ow_ask" },
    ],
    on: {
      move_items: (cc) => { startMoving(cc); },
      move_items_ctx: (cc) => { startMoving(cc); },
      pay_fee: (cc) => { startFee(cc); },
      pay_fee_ctx: (cc) => { startFee(cc); },
      pay_card: (cc) => { startFee(cc); },
      pay_cash: (cc) => { cashOk(cc); },
      pay_other_ctx: (cc, sl, sg) => { payOther(cc, sg); },
      // "Aquí tiene mi tarjeta" chooses the fee (Emilio says the amount again before he charges it); another
      // hand-over is no answer, and the question is asked again
      give: (cc) => { if (/\btarjeta\b/.test(words(cc.heard)) && !/residen/.test(words(cc.heard))) { startFee(cc); return; } return false; },
    },
    yes: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    no: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    ask: (cc) => cc.say("ow_ask"),
  });
}

function startMoving(c: Ctx) { c.say("ow_move_ok"); expectMoving(c); }
function expectMoving(c: Ctx) {
  // "Ya no quiero sacar nada" may arrive as "ya" (done) + a refusal: a "listo" / "ya" with a no in it isn't done
  const moved = (cc: Ctx) => { if (saysNo(cc.heard)) return false; reweigh(cc); };
  ask(c, {
    id: "moving", expects: ["ack_done", "give", "give_ctx", "move_items", "pay_fee_ctx"], hints: ["moving"],
    suggest: [{ lt: "Say you've moved the things", hint: "moving" }],
    on: {
      ack_done: moved,
      give: moved,
      give_ctx: moved,
      g_ok: moved,
      move_items: (cc) => { reweigh(cc); },
      pay_fee: (cc) => { startFee(cc); },
      // "No quiero sacar nada" after all: the fee (its price was said with the options)
      pay_fee_ctx: (cc) => { startFee(cc); },
    },
    yes: (cc) => { reweigh(cc); },
    no: (cc) => { cc.say("g_take_time"); expectMoving(cc); },
    ask: (cc) => cc.say("ow_moving_ask"),
  });
}
function reweigh(c: Ctx) {
  c.s.owDone = true; c.s.weighed = true; c.s.kg = 24;
  c.say("ow_reweigh", { kg: 24 });
}

function startFee(c: Ctx) { c.s.payCash = false; c.say("ow_fee_card", { price: FEE }); expectFee(c); }
function cashOk(c: Ctx) { c.s.payCash = true; c.say("ow_cash_ok", { price: FEE }); expectFee(c); }
/** "No tengo tarjeta" / "No quiero pagar en efectivo": the other way to pay is offered; nothing is paid yet. */
function payOther(c: Ctx, sg: Segment) {
  if (sg.tags.includes("nocash")) { startFee(c); return; }
  c.s.payCash = true; c.say("ow_cash_offer", { price: FEE }); expectFee(c);
}
function expectFee(c: Ctx) {
  const paid = (cc: Ctx) => {
    if (cc.s.feePaid) return;
    cc.s.owDone = true; cc.s.weighed = true; cc.s.feePaid = true;
    cc.event("pay", { method: cc.s.payCash ? "cash" : "card", amount: FEE });
    cc.say("ow_fee_paid");
  };
  // "No, ya no quiero pagar" may arrive as "ya" + a refusal: a "listo" / "ok" with a no in it never pays (and when the
  // refusal itself was understood, it answers: "Listo, ya no quiero pagar" moves things)
  const done = (cc: Ctx) => {
    if (saysNo(cc.heard)) { if (/\b(pagar|pago|sacar|saco)\b/.test(words(cc.heard))) return false; cc.say("ow_ask"); expectOverweight(cc); return; }
    paid(cc);
  };
  ask(c, {
    id: "fee", expects: ["give", "give_ctx", "pay_card", "pay_cash", "pay_other_ctx", "ack_done", "move_items", "move_items_ctx"], hints: ["fee"],
    suggest: [{ lt: "Pay by card or in cash", hint: "fee" }, { lt: "Move things after all", hint: "ow_move" }],
    on: {
      give: (cc) => { paid(cc); }, give_ctx: (cc) => { paid(cc); }, ack_done: done, g_ok: done,
      pay_fee: (cc) => { paid(cc); }, pay_fee_ctx: (cc) => { paid(cc); },
      pay_card: (cc) => { cc.s.payCash = false; paid(cc); },
      pay_cash: (cc) => { if (cc.s.payCash) { paid(cc); return; } cashOk(cc); },
      pay_other_ctx: (cc, sl, sg) => { payOther(cc, sg); },
      move_items: (cc) => { startMoving(cc); },
      move_items_ctx: (cc) => { startMoving(cc); },
    },
    yes: (cc) => { paid(cc); },
    no: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    // asked again after a side question: in cash it's the amount ("Acerque su tarjeta" asked a cash payer for a card)
    ask: (cc) => { if (cc.s.payCash) cc.say("ow_cash_ask", { price: FEE }); else cc.say("ow_fee_ask"); },
  });
}

/** Assign a seat now (returns false if the twist took over with its own question). */
function assignSeat(c: Ctx, pref: string): boolean {
  if (pref === "window" && c.s.noWindow) { noWindowTwist(c); return false; }
  if (pref === "window" && c.s.windowTaken) { c.say("no_window"); c.say("no_window_q"); expectNoWindow(c); return false; }
  const changed = !!c.s.seatNo && c.s.seat !== pref;
  c.s.seat = pref;
  c.s.seatNo = SEAT_NO[pref];
  c.say("seat_" + pref);
  if (changed && c.s.bpGiven) c.say("bp_updated");
  return true;
}

function noWindowTwist(c: Ctx) {
  c.twist("no_window");
  c.s.noWindow = false;
  c.s.windowTaken = true;
  c.say("no_window");
  c.say("no_window_q");
  expectNoWindow(c);
}
function expectNoWindow(c: Ctx) {
  ask(c, {
    id: "no_window", expects: ["seat_ans", "seat_any", "seat_neg"], hints: ["g_yesno", "seat"],
    suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Choose another seat", hint: "seat", options: ["aisle", "middle"] }],
    yes: (cc) => { assignSeat(cc, "aisle"); },
    no: (cc) => { expectMiddle(cc); },
    on: {
      seat_ans: (cc, sl) => {
        if (sl.seat === "window") { cc.say("no_window"); cc.say("no_window_q"); expectNoWindow(cc); return; }
        assignSeat(cc, sl.seat);
      },
      seat_any: (cc) => { assignSeat(cc, "aisle"); },
      // "No, en medio" / "No, ventana" refuse the aisle (rule 10: the comma is lost, so it reads "no en medio"):
      // Emilio offers the middle seat and asks; "En medio no" / "No quiero en medio" keep the aisle
      seat_neg: (cc, sl) => {
        const w = words(cc.heard);
        if (sl.seat === "aisle" || (/^no\b/.test(w) && !/^no (quiero|quisiera|me gusta)\b/.test(w))) expectMiddle(cc);
        else assignSeat(cc, "aisle");
      },
    },
    ask: (cc) => cc.say("no_window_q"),
  });
}

/** "Perdón, ¿ventana o pasillo?": two seats heard where the lost commas can mean either (rule 10). `lead` says another
 *  line first ("Claro. Entonces, ¿ventana o pasillo?" after "No quiero en medio"); asked again, it's the short question
 *  (a bare "Sí" once got "Claro. Entonces, ¿ventana o pasillo?" plus the seat step's own question). */
function seatWhich(c: Ctx, a: string, b: string, lead?: string) {
  if (lead) c.say(lead); else c.say("seat_which", seatPair(a, b));
  ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["seat"],
    suggest: [{ lt: "Choose a seat", hint: "seat", options: [a, b] }],
    on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
    ask: (cc) => cc.say("seat_which", seatPair(a, b)) });
}

/** "No quiero ventana." — "Entonces, ¿pasillo?" — "No.": the seat that's left, asked ("¿Ventana o pasillo?" again
 *  ignored both refusals, and came twice: once from here, once from the seat step). */
function seatNegMiddle(c: Ctx) {
  c.say("seat_neg_middle");
  ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["g_yesno", "seat"],
    suggest: [{ lt: "Agree or choose another seat", hint: "seat", options: "seat" }],
    yes: (cc) => { if (cc.s.passport) assignSeat(cc, "middle"); else { cc.s.seatPref = "middle"; cc.say("ack"); } },
    // a "no" to the last seat too: the seat step asks its question again
    no: () => {},
    on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
    ask: (cc) => cc.say("seat_neg_middle") });
}

function expectMiddle(c: Ctx) {
  c.say("no_window_middle");
  ask(c, {
    id: "no_window_middle", expects: ["seat_ans", "seat_neg"], hints: ["g_yesno"],
    suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
    yes: (cc) => { assignSeat(cc, "middle"); },
    no: (cc) => { cc.s.seat = "aisle"; cc.s.seatNo = SEAT_NO.aisle; cc.say("no_window_last"); },
    on: {
      seat_ans: (cc, sl) => { assignSeat(cc, sl.seat === "window" ? "aisle" : sl.seat); },
      seat_neg: (cc) => { cc.s.seat = "aisle"; cc.s.seatNo = SEAT_NO.aisle; cc.say("no_window_last"); },
    },
    ask: (cc) => cc.say("no_window_middle"),
  });
}

function expectBagCount(c: Ctx, line = "bags_how_many") {
  c.say(line);
  ask(c, {
    id: "bag_count", expects: ["bags_ans", "bags_num_ctx", "bags_none", "bags_none_ctx"], hints: ["bags"],
    suggest: [{ lt: "Say how many bags you're checking", hint: "bags" }],
    on: {
      bags_ans: (cc, sl, sg) => { checkin.handlers.bags_ans(cc, sl, sg); },
      bags_num_ctx: (cc, sl, sg) => { checkin.handlers.bags_num_ctx(cc, sl, sg); },
      bags_none: (cc) => { setBags(cc, 0); },
      bags_none_ctx: (cc) => { setBags(cc, 0); },
    },
    // a bare "Sí" to "¿Cuántas?" doesn't say how many: ask once more, then take one
    yes: (cc) => { if (line === "bags_count_q") { setBags(cc, 1); return; } expectBagCount(cc, "bags_count_q"); },
    no: (cc) => { setBags(cc, 0); },
    ask: (cc) => cc.say("bags_how_many"),
  });
}

function setBags(c: Ctx, n: number) {
  // one answer read as two pieces ("solo esta" + "una maleta") is acknowledged once
  const T = turn(c);
  if (T.bagsSaid && c.s.bags === n) return;
  T.bagsSaid = true;
  c.s.bags = n;
  if (n === 0) c.say("bags_none_ack");
  else if (n === 1) c.say("bags_ack_one");
  else c.say("bags_ack_n", { num: NUM_WORD[n] });
}

function expectPacked(c: Ctx) {
  const ok = (cc: Ctx) => { cc.s.safetyDone = true; cc.say("packed_ok"); };
  const follow = (cc: Ctx) => {
    cc.say("packed_follow");
    ask(cc, { id: "packed_follow", optional: true, hints: ["g_yesno"], suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); },
      no: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); },
      on: { g_dontknow: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); } },
      ask: (c3) => c3.say("packed_follow") });
  };
  ask(c, {
    id: "packed", expects: ["packed_yes", "packed_no", "packed_yes_ctx", "packed_no_ctx"], hints: ["packed"],
    suggest: [{ lt: "Say you packed it yourself", hint: "packed" }],
    yes: ok, no: follow,
    on: { packed_yes: (cc) => { ok(cc); }, packed_no: (cc) => { follow(cc); }, packed_yes_ctx: (cc) => { ok(cc); }, packed_no_ctx: (cc) => { follow(cc); } },
    ask: (cc) => cc.say(cc.s.bags >= 2 ? "ask_packed_many" : "ask_packed"),
  });
}

function expectBattery(c: Ctx) {
  const none = (cc: Ctx) => { cc.s.safetyDone = true; cc.say("battery_ok"); };
  const has = (cc: Ctx, again = false) => {
    if (!again) { cc.twist("power_bank"); cc.say("battery_move"); }
    else { cc.say("battery_must"); cc.say("battery_move_q"); } // a refusal gets the reason and a short re-ask, not the whole line again
    ask(cc, { id: "battery_move", expects: ["ack_done", "give", "give_ctx"], hints: ["g_yesno"], suggest: [{ lt: "Agree to move it", hint: "g_yesno" }],
      yes: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      no: (c3) => { has(c3, true); },
      on: {
        ack_done: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        give: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        give_ctx: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        g_ok: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      },
      ask: (c3) => c3.say("battery_move_q") });
  };
  ask(c, {
    id: "battery", expects: ["battery_no", "battery_no_ctx", "battery_yes", "battery_yes_ctx", "powerbank_q", "what_ctx"], hints: ["battery"],
    suggest: [{ lt: "Say whether there are batteries in the bag", hint: "battery" }],
    yes: (cc) => { has(cc); }, no: none,
    on: {
      battery_no: (cc) => { none(cc); },
      battery_no_ctx: (cc) => { none(cc); },
      battery_yes: (cc) => { has(cc); },
      battery_yes_ctx: (cc) => { has(cc); },
      g_dontknow: (cc) => { cc.s.safetyDone = true; cc.say("battery_unsure"); },
    },
    ask: (cc) => cc.say(cc.s.bags >= 2 ? "ask_battery_many" : "ask_battery"),
  });
}

// ---------------------------------------------------------------------------

export const checkin: SituationDef = {
  id: "s64a-checkin",
  song: 64,
  songTitle: "Window or Aisle?",
  title: { en: "¿Ventana o pasillo?", lt: "Window or aisle?" },
  topic: { en: "Documentación en el aeropuerto", lt: "Airport check-in" },
  chapter: 6,
  order: 5,
  location: "airport",
  npc: "kevin",
  goal: "Check in for your flight: show your passport, check your bag, choose a seat, and find out your gate and boarding time.",
  intro: "Puerto Colibrí's little airport. Today you're flying to Mexico City (flight 223). You have one suitcase and a backpack. Emilio is at the airline's check-in counter. In Mexico bags are weighed in kilos: 25 kilos is about 55 pounds.",
  entities: { city: CITIES, seat: SEATS },

  grammar: {
    macros: {
      city_to: "(a | para | al | hacia) {city}",
      for_flight: "(para | de | en) (mi | el | nuestro) vuelo [pc | pe ce] [numero] [{number}] [@city_to]",
      ci: "(check in | checkin | chequin | chek in | check)",
      carry: "[mi | la | el | a mi | a la] (equipaje de mano | mochila | maleta de mano | bolsa | otra maleta | maleta chica | maletita | backpack | carry on)",
      things: "(unas cosas | algunas cosas | un par de cosas | algo | cosas | unas cositas | algunas cositas | [mi | mis | el | la | los | las | unos | unas | un | una] {thing})",
      bagword: "(maleta | maletas | valija | valijas | pieza | piezas | bulto | bultos)",
      carry_only: "[mi | una | un | el | la | esta] (equipaje de mano | mochila | maleta de mano | bolsa | maleta chica | backpack | maletita | mochilita)",
      doc_verb: "(documentar | documento | voy a documentar | quiero documentar | quisiera documentar | facturar | facturo | voy a facturar | quiero facturar)",
      gate: "(sala | puerta)",
      batt: "(baterias | bateria | pilas | pila | cargadores | cargador | power bank | power banks | powerbank | cargador portatil | cargadores portatiles | bateria portatil | baterias portatiles | bateria externa | baterias de litio | bateria de litio)",
      in_carry: "en (mi | la | el) (mochila | bolsa | equipaje de mano | maleta de mano | bolsillo | bolsa de mano)",
      reason: "(porque | para) (quiero ver [el mar | la vista | el paisaje] | me gusta ver [el mar | la vista] | tengo las piernas largas | me levanto mucho | me paro mucho | voy mucho al bano | quiero dormir | duermo mejor | estirar las piernas | ver el mar | ver la vista | dormir | levantarme)",
    },
    slots: {
      doc: { lexicon: DOCS },
      thing: { lexicon: THINGS },
      bagnum: { lexicon: [
        { id: "1", forms: ["una", "uno", "1"] }, { id: "2", forms: ["dos", "2"] }, { id: "3", forms: ["tres", "3"] }, { id: "4", forms: ["cuatro", "4"] },
        { id: "5", forms: ["cinco", "5"] }, { id: "6", forms: ["seis", "6"] },
      ] },
    },
  },

  intents: {
    checkin: { patterns: [
      "(quisiera | quiero | me gustaria | necesito | vengo a | voy a | puedo) hacer [el | mi] @ci #h:checkin_simple",
      "(quisiera | quiero | me gustaria | necesito | vengo a | voy a) hacer [el | mi] @ci @for_flight #h:dest_checkin",
      "(quiero | quisiera | necesito | vengo a | voy a | puedo) (documentar | registrarme) #h:checkin_doc",
      "(quiero | quisiera | necesito | vengo a | voy a | puedo) (documentar | registrarme) @for_flight",
      "(quiero | quisiera | necesito | vengo a | voy a) (documentar | facturar) (mi | una | la) (maleta | valija) [@for_flight] #bag",
      "(quiero | quisiera | necesito | vengo a | voy a) (documentar | facturar) (mis | las | unas) (maletas | valijas) [@for_flight]",
      "(quiero | quisiera | necesito | vengo a | voy a) (documentar | facturar) [mi | el] equipaje [@for_flight]",
      "(quiero | quisiera | necesito | vengo a | voy a) facturar [@for_flight]",
      "(quiero | quisiera | vengo a) (dejar | entregar) (mi | la | una) maleta [@for_flight] #bag",
      "(vengo | estoy aqui) (para | por) (mi | el) vuelo [@city_to]",
      "@ci [@for_flight]", "(documentar | documentacion) [@for_flight]",
      "(es | aqui es | es aqui | este es) [el] (@ci | mostrador | fila | linea | cola) [(de | para) [el] vuelo [@city_to] | (de | para) {city} | @city_to] #isthis",
      "(aqui | es aqui | aqui es) donde (se documenta | se hace el @ci | documento | hago el @ci | se factura) [@for_flight] #isthis",
      "(es | aqui es) (la fila | el mostrador | la linea) (para | de) (documentar | el @ci) #isthis",
      "(es aqui | aqui es | es aca) (para | de) [el | mi] (vuelo [@city_to] | @ci | {city}) #isthis",
    ] },
    dest_ans: { patterns: [
      "@city_to #h:dest_to",
      "{city}",
      "(vuelo | volamos) @city_to [hoy] #h:dest_flying",
      "(voy | vamos) @city_to [hoy] #h:dest_going",
      "(viajo | viajamos | me voy | nos vamos | salgo | regreso | vuelvo | voy de regreso | me regreso) @city_to [hoy]",
      "(mi destino es | el destino es | mi vuelo es | mi vuelo va) [a | para] {city}",
      "(tengo | traigo) [un | mi] (vuelo | boleto | reservacion | reserva) @city_to [a {time} | hoy | en la manana]",
      "[mi vuelo es | es | tengo] [el] vuelo [pc | pe ce] [numero] {number} [@city_to]",
      // the number digit by digit or in pairs: "dos dos tres", "dos veintitrés" ("El vuelo dos dos tres" was flight 2
      // and three bags; "dos veintitrés" got "su reservación es para el vuelo 223")
      "[mi vuelo es | es | tengo | traigo] [el] (vuelo | pc | pe ce | vuelo pc | vuelo pe ce) [numero] {code:digits} [@city_to]",
      "(mi vuelo es | es) el {code:digits} [@city_to]",
      "{number} @city_to",
      "[es | tengo | traigo] el vuelo de {time} [@city_to] #time",
      "(mi vuelo | el vuelo) (sale | es) a {time} [@city_to] #time",
      // "Tomo el vuelo de las ocho y diez": tomar, not the hand-over "tome" (the o/a slip once recorded the passport)
      "(tomo | voy a tomar | tengo que tomar) [el | un | mi] (vuelo | avion) [@city_to] [(a | de) {time} | hoy]",
      "(tomo | voy a tomar | tengo que tomar) [el | un | mi] (vuelo | avion) de {time} [@city_to] #time",
      "@city_to (de ida | solo de ida | redondo | de ida y vuelta | por trabajo | de vacaciones | por negocios)",
      "(perdon | disculpe) [quise decir | quiero decir] [a] {city}",
      "(quise decir | quiero decir | digo | mejor dicho) [a] {city}",
      "{city} (es mi destino | es correcto)",
      // a correction: the second city is the answer ("No voy a Guadalajara, voy a la Ciudad de México"; rule 10)
      "no [voy | viajo | vuelo] (a | para) {bad:city} [sino] [(voy | viajo | vuelo)] @city_to #fix",
      "(a | para) {bad:city} no [sino] [(voy | viajo | vuelo)] @city_to #fix",
    ] },
    // "El de las ocho y diez": a bare time names the flight only where the flight is asked (rule 2)
    dest_ctx: { patterns: ["[es] el de {time} #time"] },
    dest_unknown: { patterns: [
      "(vuelo | viajo | volamos | viajamos) (a | para) {w:any}",
      "mi destino es {w:any}",
    ] },
    // "¿Lo puede buscar?": Emilio looks the booking up with the passport (as the destination step's help does)
    lookup: { patterns: [
      "(me lo | lo | la | me la) (puede | podria) (buscar | revisar | checar) [con mi pasaporte]",
      "(puede | podria) (buscarlo | revisarlo | buscarla | revisarla | checarlo | buscar mi (vuelo | reservacion) | revisar mi (vuelo | reservacion)) [con mi pasaporte]",
      "(busquelo | busquela | reviselo) con mi pasaporte",
      "no (me acuerdo | recuerdo | se) (del | el | de mi | mi) (numero de vuelo | vuelo | destino | numero)",
      "(olvidé | se me olvidó) (el numero de vuelo | el numero | mi destino | el destino)",
    ] },
    // a bare "No me acuerdo" answers "¿A dónde viaja?" only there
    lookup_ctx: { patterns: ["[no] no (me acuerdo | recuerdo | lo recuerdo | estoy seguro | estoy segura)", "se me olvidó", "(lo | la) olvidé"] },
    dest_neg: { patterns: [
      "no @city_to", "no (voy | viajo | vuelo | vamos) @city_to", "no (quiero | voy a) (ir | viajar | volar) @city_to", "{city} no",
    ] },
    affirm: { patterns: ["[si] (ese | este) es mi vuelo #h:yes_right", "[si] es mi vuelo", "[si] ese es", "[si] es ese vuelo", "[si] ese mero"] },
    deny: { patterns: [
      "(ese | este) no es [mi vuelo] #h:no_wrong", "no (es | era) (ese | este | mi vuelo | ese vuelo)", "[no] (esta mal | hay un error | es un error)",
    ] },
    give: { patterns: [
      "aqui tiene #h:pp_here",
      "aqui esta #h:scale_here",
      "(tenga | tome | ten | toma #tip:tu_staff | aqui lo tiene | aqui la tiene | aqui las tiene | aqui los tiene | ahi esta | ahi tiene | aqui va | aqui tienes #tip:tu_staff)",
      "aqui esta mi pasaporte #h:pp_heres",
      "aqui tiene mi tarjeta de residente #h:pp_card",
      "aqui tiene mi tarjeta #h:fee_here",
      "(aqui tiene | aqui esta | tenga | tome | ten | toma | le doy | le entrego | aqui tienes) [mi | el | la | su] {doc} [y [mi | el | la] {doc2:doc}]",
      "(este | esta) es [mi] {doc}", "mi {doc} [y mi {doc2:doc}]", "pasaporte",
      "(solo) tengo [mi | una | la] {doc}",
      // "No tengo pasaporte, pero tengo mi tarjeta de residente" (not understood)
      "no (tengo | traigo) [mi | el] pasaporte [pero] (tengo | traigo | aqui tiene | aqui esta) [mi | la | una] {doc}",
      "(tengo | traigo) mi (reservacion | boleto | pase de abordar) en (el | mi) celular",
    ] },
    // a bare "¿Aquí?" / "Ahí" hands over or puts the bag down only where something is being handed over
    give_ctx: { patterns: ["(aqui | ahi | aca)", "(aqui | ahi) (va | la pongo | se la doy)"] },
    passport_q: { patterns: [
      "(necesita | ocupa | quiere) (mi | el) (pasaporte | identificacion) #h:pp_q",
      "(necesita | ocupa) (ver | algo) [mas]",
      "(le sirve | sirve | esta bien | puedo usar) [mi | la | con mi] (tarjeta de residente | licencia | credencial | identificacion | ine)",
      "(pasaporte | identificacion) o (licencia | tarjeta de residente | credencial | identificacion)",
      "(tambien) (necesita | ocupa) [mi | el] (pase de abordar | boleto | reservacion | tarjeta de embarque)",
      "(necesita | ocupa) [mi | el] (pase de abordar | boleto | reservacion | tarjeta de embarque) [tambien]",
      "(necesitas | quieres) mi pasaporte #tip:tu_staff",
    ] },
    find_it: { patterns: [
      "(dejeme | dejame | permitame | permiteme) (buscarlo | buscarla | sacarlo | sacarla | encontrarlo | encontrarla)",
      "(un momento | un segundo | un momentito) (lo | la) (busco | saco | encuentro)",
      "(lo | la) (busco | saco) [de (mi | la) (mochila | bolsa)]",
      "donde (esta | dejé | puse) mi pasaporte", "(lo | la) (tengo | traigo) en (mi | la) (mochila | bolsa | bolsa de mano)",
      "[un momento | un segundo | un momentito] (lo | la) estoy buscando", "[un momento | un segundo] estoy buscando (mi | el) pasaporte",
      "(tengo | traigo) (el | mi) pasaporte en (mi | la) (mochila | bolsa | bolsa de mano)",
      "(ahorita | ahora | enseguida | ya) se lo (doy | paso | entrego)",
    ] },
    bags_ans: { patterns: [
      // a bare "Solo una" is bags_num_ctx: at "¿Algo más?" it means "just one question"
      "(solo | nada mas | nomas | solamente) una (maleta | valija) #h:bags_one #one",
      "(solo | nada mas | nomas | solamente) (esta | esta maleta | esta de aqui | esta grande | la grande | mi maleta) #h:bags_this #one",
      "(voy a documentar | documento | quiero documentar | quisiera documentar | voy a facturar | facturo | quiero facturar) {number} [@bagword] #h:bags_checking",
      "(voy a documentar | documento | quiero documentar | voy a facturar | facturo) (esta | esta maleta | mi maleta | la maleta | esta de aqui) #one",
      "{number} @bagword [para documentar] #h:bags_two",
      "(traigo | tengo | llevo | son | voy a llevar | voy a mandar) {number} @bagword [para documentar]",
      "[traigo | tengo | llevo] {number} @bagword y [una | mi | un] (mochila | equipaje de mano | maleta de mano | bolsa | backpack | mochila de mano)",
      "(esta maleta | esta de aqui | la grande | esta grande | la maleta grande) [nada mas | nomas | solamente] #one",
      "(las dos | ambas | estas dos | los dos | las tres) #two",
      // "Una grande y una chica" is two bags, not one
      "[{number} [@bagword]] [una] (grande | mediana | chica | pequena) y [una | otra] (grande | mediana | chica | pequena) #pair",
    ] },
    // a bare number answers "¿Cuántas?" / "¿Documenta equipaje?" only there; a correction keeps the last number
    bags_num_ctx: { patterns: ["[solo | nada mas | nomas] {n:bagnum} [nada mas | nomas]", "{n:bagnum} de ellas",
      "no (es | son) (una | uno | dos | tres | cuatro | cinco | seis) [@bagword] son {n:bagnum} [@bagword]", "(son | mejor) {n:bagnum} [@bagword]"] },
    bags_none: { patterns: [
      "[no] (solo | nada mas | nomas | solamente) (traigo | llevo | tengo | voy con) @carry_only #h:bags_none",
      "[no] (solo | nada mas | nomas | solamente) @carry_only [nada mas | nomas]",
      "no (documento | voy a documentar | traigo | llevo | tengo | voy a facturar | quiero documentar | necesito documentar) (nada | maletas | maleta | equipaje | ninguna maleta | equipaje para documentar | maletas para documentar | nada para documentar)",
      "[no] (viajo | voy) (solo | nada mas | nomas) con @carry_only",
      "no (voy a | quiero | necesito) (documentar | facturar) [nada | maletas]",
      "(nada | ninguna) (para documentar | que documentar)",
    ] },
    // a bare "Ninguna" / "Nada" answers "¿Documenta equipaje?" only there
    bags_none_ctx: { patterns: ["(ninguna | ninguno | nada | cero) [maletas]"] },
    packed_yes: { patterns: [
      "[si] yo (mismo | misma) (la hice | la empaqué | las hice | la prepare | hice mi maleta) #h:packed_yes",
      "[si] (la | las) (hice | empaqué | prepare | armé) (yo | yo mismo | yo misma | yo solo | yo sola) #h:packed_did",
      "[si] (yo | yo mismo | yo misma) (la | las) (hice | empaqué | prepare | armé)",
      "[si] yo (mismo | misma)", "[si] (la hice | la empaqué | las hice) [sola | solo]", "si es mi maleta",
      // Spain's perfect: "Sí, la he hecho yo (misma)"
      "[si] (la | las) he (hecho | preparado) (yo | yo mismo | yo misma)", "[si] (yo | yo mismo | yo misma) (la | las) he (hecho | preparado)", "[si] (la | las) he hecho [yo] [sola | solo]",
    ] },
    packed_no: { patterns: [
      "(mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | mi familia | mi hermana | mi hermano) (la hizo | me ayudó | me la hizo | la empaco | las hizo)",
      "(la hizo | las hizo | la empaco) (mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | otra persona | alguien mas)",
      "no (la | las) hice yo", "no (la | las) hice", "me (ayudaron | ayudó alguien)",
      // "No, yo no la hice": the "yo" is not "Sí, yo"
      "[no] yo no (la | las) (hice | empaqué | prepare | armé)",
      "(me la hizo | me las hizo | me la empaco) (mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | mi familia | mi hermana | mi hermano | otra persona)",
    ] },
    // bare "Sí, yo" / "No, mi esposa" answer "¿Usted mismo hizo su maleta?" only there
    packed_yes_ctx: { patterns: ["[si] (yo | yo mismo | yo misma | yo sola | yo solo)"] },
    packed_no_ctx: { patterns: ["[no] (mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | mi familia | mi hermana | mi hermano | otra persona | alguien mas)"] },
    battery_no: { patterns: [
      "no (traigo | llevo | tengo | hay | lleva) [ningun | ninguna | ningunas | ningunos | un | una | unas | unos] @batt [en (la maleta | ella | mi maleta)]",
      "(mi | el | la) (cargador portatil | power bank | bateria portatil | cargador | bateria) (esta | va) @in_carry #h:battery_carryon_x",
      "(mis | las | los) (baterias | pilas | cargadores) (estan | van) @in_carry",
      "[no] (ningun | ninguna) @batt",
    ] },
    // "Lo traigo en mi mochila", "Nada de eso", "Solo ropa": answers to the battery question only
    battery_no_ctx: { patterns: [
      "[no] no (traigo | llevo | tengo) nada (de eso | asi | parecido) [en la maleta] #h:battery_no",
      "(lo | la | los | las) (traigo | llevo | tengo) @in_carry #h:battery_carryon",
      // "En la maleta no, la batería la traigo en la mochila"
      "(en la maleta no | no en la maleta | en la maleta nada)", "[mi | el | la] @batt (lo | la | los | las) (traigo | llevo | tengo) @in_carry",
      "(esta | estan | va | van) @in_carry",
      // "Sí, traigo un cargador portátil en la mochila": it's already in the carry-on (it got the power-bank twist)
      "[si] [pero] (traigo | llevo | tengo) (uno | una | unos | unas | [un | una | mi | mis | unos | unas | dos] @batt) [pero] @in_carry",
      "[no] (nada | ninguno | ninguna) [de eso]",
      "[no] (solo | nada mas | nomas) (ropa | mi ropa | ropa y zapatos | el cargador del celular | un cargador | cables | libros | zapatos)",
      "[no] no (traigo | llevo)", "[no] no (lo | la | los | las) (traigo | llevo | tengo) [en la maleta]",
    ] },
    battery_yes: { patterns: [
      "[si] (traigo | llevo | tengo | hay | creo que traigo | creo que tengo | creo que hay) (un | una | mi | unas | unos | dos) @batt [en (la maleta | ella | mi maleta)] #h:battery_yes",
      "[si] (un | una | mi) (cargador portatil | power bank | bateria portatil | bateria externa)",
      "(hay | traigo | va) (una laptop | mi laptop | una computadora | mi computadora | una camara | una tableta) en (la maleta | ella)",
    ] },
    // a bare "Sí, traigo uno" answers the battery question only there (at "¿Alguna duda?" it was "Sí, tengo otra pregunta")
    battery_yes_ctx: { patterns: ["si (traigo | tengo | llevo) (uno | una)", "(traigo | tengo | llevo) (uno | una)"] },
    powerbank_q: { patterns: [
      "que es (un | una | el | la) (power bank | cargador portatil | bateria portatil | bateria de litio | bateria externa) #h:q_powerbank",
      "que (significa | quiere decir) (power bank | cargador portatil | bateria portatil)",
      "(a que | que) se refiere con (power bank | cargador portatil | bateria portatil)",
    ] },
    what_ctx: { patterns: ["que es (eso | esto)", "a que se refiere", "como que"] },
    ack_done: { patterns: [
      "(listo | lista | ya esta | ya quedó | ya terminé | terminé | ya acabé) #h:moving_done",
      "[ya esta] ya (lo | la | los | las) he (cambiado | pasado | sacado | puesto | quitado)", "ya he terminado",
      "asi #h:scale_like_this",
      "(y ahora | que tal ahora | y asi | asi esta bien) #h:moving_now",
      "ya (esta bien | pesa menos | se ve bien) [ahora] #h:moving_ok",
      "(ya | ahora) (pesa | va a pesar) menos", "ya (la | lo | las) (puse | subi) [en la bascula]",
      "ya (saqué | pasé | movi | cambié | quité) (@things | lo | la | los | las)",
      "(ahorita | ya | enseguida) (lo | la | los) (saco | cambio | paso | quito | cambié | saqué | pasé)",
      "(ya | ahora) (deberia | debe) (estar bien | pesar menos)",
    ] },
    scale_where: { patterns: [
      "donde (la | lo | las | los) (pongo | subo | dejo | coloco) #h:scale_where_h", "donde (esta | queda) la bascula", "(en | sobre) la bascula", "aqui en la bascula",
    ] },
    move_items: { patterns: [
      "(voy a | puedo | dejeme | dejame | quiero | prefiero | mejor) (pasar | cambiar | mover | poner | meter) @things (a | en) @carry #h:ow_move",
      "(paso | cambio | muevo | meto | pongo) @things (a | en) @carry",
      "(puedo | voy a | dejeme | dejame | prefiero | mejor) (sacar | quitar) @things [de la maleta] [y (meterlas | meterlos | pasarlas | pasarlos | ponerlas | ponerlos) (a | en) @carry] #h:ow_take_out",
      "(mejor | entonces) (saco | quito) @things [de la maleta] [y (las | los) (meto | paso | pongo) (a | en) @carry]", "(saco | quito) @things [de la maleta]",
      "(es mucho | es mucho dinero | esta caro | ni modo) [mejor | entonces] (saco | quito | paso) @things [(a | en) @carry]",
      "(me pongo | me voy a poner | voy a ponerme | puedo ponerme | mejor me pongo) @things #h:ow_wear",
      "(voy a | puedo | dejeme | dejame) (reacomodar | acomodar | arreglar) (la maleta | mi maleta | las cosas)",
      "(es | esta) (muy | demasiado) caro (mejor | entonces | asi que) (saco | paso | quito) @things [(a | en) @carry]",
      "(prefiero | mejor) (sacar | pasar) (cosas | algo)",
    ] },
    // "No quiero pagar": a refusal of the fee only while the overweight question is open
    move_items_ctx: { patterns: [
      "[ya] no (quiero | voy a | puedo) pagar [nada | el sobrepeso | el cargo | eso | extra | tanto | el exceso]", "(prefiero | mejor) no pagar [el sobrepeso | eso]",
      "no pago [nada] [mejor] (saco | quito | paso) @things [(a | en) @carry]",
      "[ya] no (pago | lo pago | lo voy a pagar | voy a pagarlo | quiero pagarlo) [nada | eso | el sobrepeso]",
    ] },
    // "No quiero pagar con tarjeta" / "No tengo tarjeta": the other way to pay is offered, nothing is paid (it was read
    // as "no quiero pagar" + "con tarjeta", and the "con tarjeta" paid the $600 at the fee)
    pay_other_ctx: { patterns: [
      "[ya] no (quiero | voy a | puedo) pagar con (tarjeta | tarjeta de credito | tarjeta de debito | mi tarjeta | el celular) #nocard",
      "no pago con (tarjeta | tarjeta de credito | tarjeta de debito) #nocard", "no (tengo | traigo) (tarjeta | tarjeta de credito | tarjeta de debito) #nocard",
      "[ya] no (quiero | voy a | puedo) pagar en efectivo #nocash", "no pago en efectivo #nocash", "no (tengo | traigo) (efectivo | dinero en efectivo | suficiente efectivo) #nocash",
    ] },
    pay_fee: { patterns: [
      "(prefiero | quiero | voy a | mejor | puedo) pagar [el | ese] (sobrepeso | cargo | exceso | extra) #h:ow_pay",
      "(pago | mejor pago) [el | ese] (sobrepeso | cargo | exceso | extra)",
      "(lo pago | se lo pago | mejor lo pago | prefiero pagarlo | voy a pagarlo | lo voy a pagar | mejor pago)",
      "(prefiero | mejor) pagar", "(esta bien | bueno) [lo] pago", "ni modo [lo | se lo] (pago | pagamos)",
    ] },
    // "No quiero sacar nada": then the fee, only while the overweight question is open
    pay_fee_ctx: { patterns: [
      // "Ya no quiero sacar nada" with its "ya" (read as "ya" = done, it re-weighed the bag at 24 kilos, then charged it)
      "[ya] no (quiero | voy a) (sacar | mover | pasar | abrir) (nada | la maleta | mi maleta)", "[ya] (prefiero | mejor) no (sacar | abrir | mover) [nada | la maleta]",
    ] },
    pay_card: { patterns: [
      "[puedo] pagar con tarjeta #h:fee_card", "(pago | puedo pagar | quiero pagar) con (tarjeta | tarjeta de credito | tarjeta de debito | mi tarjeta)",
      "con (tarjeta | tarjeta de credito | tarjeta de debito | mi tarjeta)", "tarjeta", "(aceptan | acepta | reciben) tarjeta",
      "(puedo pagar | pago) con (el celular | apple pay | google pay)",
      // "¿Tiene terminal?": Mexico's way to ask whether cards are taken (s31)
      "(tiene | tienen | hay) terminal",
      // rule 10: in "No en efectivo, con tarjeta" the second is the answer
      "no (en efectivo | efectivo) [sino] [mejor] (con tarjeta | tarjeta)",
    ] },
    pay_cash: { patterns: [
      "en efectivo #h:fee_cash", "[puedo] pagar en efectivo", "(pago | quiero pagar | prefiero pagar) en efectivo", "efectivo",
      "(aceptan | acepta | reciben) efectivo", "solo (tengo | traigo) efectivo", "(pago | puedo pagar) con (efectivo | dinero | billetes)",
      "no (con tarjeta | tarjeta) [sino] [mejor] (en efectivo | efectivo)",
    ] },
    ask_fee: { patterns: [
      "cuanto (es | cuesta | seria | sale | cobran) [el sobrepeso | el cargo | eso | el exceso] #h:ow_how_much",
      "cuanto (tengo que | hay que) pagar", "cuanto (le debo | es el cargo | cobran por el sobrepeso | cobran por kilo)",
      "(es | esta) (muy | demasiado) caro",
    ] },
    ask_over: { patterns: [
      "(por cuanto | cuanto) (se pasa | me paso | esta pasada | pasa) [del limite] #h:ow_over", "cuanto pesa [mi maleta | la maleta]",
      "(esta | pesa) (muy | demasiado) (pesada | pesado)", "(se pasa | me pasé | esta pasada) [del peso | del limite]", "cuantos kilos (pesa | son | tiene)",
      "cuantos kilos de mas",
    ] },
    ask_limit: { patterns: [
      "cual es el (limite | peso maximo | limite de peso | maximo) [por maleta] #h:q_limit",
      "cuanto (puede pesar | puedo llevar | se puede llevar | me permiten) [la maleta | cada maleta]",
      "cuantos kilos (puedo llevar | se pueden llevar | puede pesar | son permitidos | me permiten | se permiten)",
      "(son | es en | es) (kilos | libras) o (libras | kilos)", "cuanto es (eso | 25 kilos | veinticinco kilos) en libras", "cuantas libras son",
    ] },
    seat_ans: { patterns: [
      "{seat} #h:seat_please",
      "(quisiera | quiero | me gustaria) [un] (asiento | lugar) [de | en | junto a | del lado de] {seat} #h:seat_id_like",
      "(quisiera | quiero | me gustaria) {seat}",
      "(prefiero | preferiria) {seat} #h:seat_prefer",
      "(prefiero | preferiria) [un] (asiento | lugar) [de | en | junto a] {seat}",
      "(me da | me puede dar | me podria dar | deme) [un] [asiento | lugar] [de | en] {seat} #h:seat_can_i",
      "(me das | dame | me puedes dar) [un] [asiento | lugar] [de | en] {seat} #tip:tu_staff",
      "(ponme | me pone | pongame | me pones) [en] {seat}",
      "(hay | tiene | le queda | quedan | todavia hay | tienen) [algun | un] [asiento | asientos | lugar | lugares] [de | en] {seat} [disponible | disponibles | libre | libres]",
      "(me gusta | siempre me siento en | siempre pido | me encanta) {seat}",
      "{seat} [por favor] @reason", "(quisiera | prefiero | me da) {seat} @reason",
      "(mejor | entonces) {seat}", "{seat} (mejor | entonces)", "no (mejor | mas bien) {seat}",
      "(me puede | me podria | puede) (cambiar | poner | pasar) (a | en) {seat}", "(puedo | podria) cambiar (a | de asiento a) {seat}",
      "(puedo | podria) (cambiarme | sentarme) (a | en) {seat}",
      // rule 10: in "No pasillo, ventana" the second is the answer
      "no {bad:seat} [sino | mejor | mas bien] {seat} [por favor]",
    ] },
    seat_any: { patterns: [
      "me da igual #h:seat_either",
      "(cualquiera | cualquier asiento | cualquier lugar | lo que sea | el que sea | donde sea) [esta bien | me sirve] #h:seat_either2",
      "no (importa | me importa)", "no tengo preferencia", "(ventana o pasillo | cualquiera de los dos) (me da igual | da igual | no importa)",
      // "Pasillo o ventana, me da igual" (in either order) was two seats booked and a third
      "{seat} o {other:seat} (me da igual | da igual | no importa | no me importa | lo que sea | el que sea | cualquiera | me es indiferente)",
      "(me da igual | da igual | no importa | no me importa) [si es] {seat} o {other:seat}",
      "lo que tenga [disponible]", "(el que | como) usted (quiera | diga)", "(da | es) igual", "me es indiferente",
    ] },
    // Lost commas (rule 10): "Ventana no, pasillo" and "Ventana, no pasillo" sound the same, so Emilio asks which
    seat_amb: { patterns: ["{seat} no [mejor] {other:seat} [por favor] #amb", "no {seat} no [mejor] {other:seat} [por favor] #amb"] },
    // "¿Cuál me recomienda?": Emilio explains window and aisle
    seat_rec: { patterns: ["(cual | que) me (recomienda | recomiendas #tip:tu_staff | sugiere)", "(cual | que) es mejor [ventana o pasillo]", "(ventana o pasillo) cual es mejor",
      // "¿Ventana o pasillo?" said back booked the window and then the aisle in one turn
      "{seat} o {other:seat}"] },
    seat_neg: { patterns: [
      "no {seat} [por favor]",
      "no (quiero | quisiera | me gusta | me gustan) [un | el | la | los | asientos de | asiento de | el asiento de | estar en] {seat}",
      "(cualquiera | cualquier asiento | lo que sea | todo) menos {seat}",
      // "Me da igual, pero no en medio" (read as "me da igual" + a refusal, it booked the aisle and then asked again)
      "(cualquiera | cualquier asiento | cualquier lugar | lo que sea | el que sea | donde sea | me da igual | da igual | no importa | no me importa) [pero] (no | menos) [el | la] {seat}",
      "{seat} no",
      "(mejor | prefiero) no {seat}",
    ] },
    more_no: { patterns: [
      "(es todo | eso es todo | seria todo | eso seria todo) #h:more_all",
      "(todo claro | todo esta claro | todo bien | ya entendi todo | todo perfecto) [gracias] #h:more_good",
      "no tengo (mas preguntas | otra pregunta | preguntas | dudas | ninguna pregunta | ninguna duda)",
      "(ninguna | ninguna pregunta | ninguna duda)", "(es | seria) todo por ahora",
    ] },
    more_q: { patterns: ["(tengo | una) (una pregunta | pregunta | duda | una duda)", "(otra | una) pregunta [mas]", "(le puedo | puedo) preguntar algo", "si una pregunta",
      // "No, solo tengo una pregunta" (with or without the comma) still has a question
      "[no] (solo | nada mas | nomas | solamente) [tengo] (una | otra) (pregunta | duda) [mas]", "(todavia | aun) tengo (una | otra) (pregunta | duda)", "[si] tengo otra (pregunta | duda)"] },
    ask_ontime: { patterns: [
      "[el vuelo | mi vuelo] (sale | va | esta | llega) a tiempo #h:q_ontime", "(sale | va) a tiempo [el vuelo | mi vuelo]", "(el vuelo | mi vuelo) (sale | va) a la hora",
      "(sale | va) puntual [el vuelo]", "(va | esta) en horario [el vuelo]",
    ] },
    ask_delayed: { patterns: [
      "(hay | tiene) (retraso | algun retraso | demora | alguna demora)", "(el vuelo | mi vuelo) (viene | esta | va) (retrasado | atrasado | demorado | con retraso)",
      "(viene | esta | va) (retrasado | atrasado | con retraso | demorado)", "se va a (retrasar | atrasar)",
    ] },
    ask_gate: { patterns: [
      "cual es (mi | la) @gate #h:q_gate", "(en | de | por) (que | cual) @gate (sale | abordo | es | sale el vuelo | sale mi vuelo | embarco)",
      "(que | cual) @gate [es | era]", "@gate [numero] {number} [verdad | correcto | cierto]",
      // where it is, not which ("¿Dónde está la sala 4?" got "Es la sala 4")
      "(donde | por donde) (esta | queda) (la | mi) @gate [numero] [{number}] #where", "como (llego | voy) a (la | mi) @gate [numero] [{number}] #where",
      "(que | cual) @gate (me dijo | dijo)", "[es] (la | mi) @gate [numero] {number} [verdad | correcto | cierto]", "(me repite | me puede repetir | cual era) (la | mi | el numero de) @gate", "por donde (abordo | embarco)", "(cual | que) es (el numero de | mi) @gate",
    ] },
    ask_boarding_time: { patterns: [
      "a que hora (empieza el abordaje | abordamos | abordo | se aborda | empiezan a abordar | es el abordaje | sale el vuelo | sale | salimos | despega | empieza el embarque | embarcamos) #h:q_boarding",
      "cuando (abordamos | empieza el abordaje | sale el vuelo | sale | salimos | despega)", "(el abordaje | abordamos) (es | empieza) a {time} [verdad | cierto | correcto]",
      "a que hora (debo | tengo que) estar en la @gate", "(el vuelo | mi vuelo) sale a {time} [verdad | cierto | correcto]",
    ] },
    ask_security: { patterns: [
      "donde (esta | queda) (seguridad | el filtro | el filtro de seguridad | el control de seguridad | la revision | la revision de seguridad | el control) [de seguridad]",
      "por donde (paso | voy | es) [a | para] (seguridad | el filtro | el control | la revision) #h:q_security",
      "(a donde | adonde | por donde) (voy | sigo | paso) (ahora | despues)", "que hago ahora",
    ] },
    ask_duration: { patterns: [
      "cuanto (dura | tarda | tiempo dura | tiempo es) [el vuelo]", "a que hora (llegamos | llega el vuelo | aterrizamos | llego) [a la ciudad de mexico] #arrive",
      "cuanto (se hace | se tarda) [a la ciudad de mexico]", "cuantas horas (son | es) [de vuelo]",
    ] },
    ask_carryon: { patterns: [
      "puedo (llevar | subir | meter) (esta | mi | la) (mochila | bolsa | maleta | maleta de mano | maletita) (conmigo | al avion | a bordo | en la cabina) #h:q_carryon",
      "(esta | mi) (mochila | bolsa | maleta de mano) (esta bien | cuenta | pasa | sirve) como equipaje de mano", "puedo llevar (esto | esta) conmigo",
      "(la mochila | mi mochila | esta mochila) (va | puede ir) conmigo",
      // "¿Tengo que documentar la mochila?": no (it was not understood)
      "(tengo que | hay que | debo | necesito) (documentar | facturar) (la | mi | esta) (mochila | bolsa | maleta de mano | maletita | mochilita) #must",
      "(la | mi | esta) (mochila | bolsa | maleta de mano) [tambien] (se documenta | se tiene que documentar | la tengo que documentar) #must",
    ] },
    ask_seatnum: { patterns: ["cual es mi asiento", "(que | cual) asiento (tengo | me toco | me dio | es)", "donde me (siento | toco)", "(que | cual) numero de asiento [tengo]",
      "cual es el numero de mi asiento", "(que | cual) es mi lugar"] },
    ask_bagfee: { patterns: [
      "(tengo que | hay que) pagar (por | la | el) (maleta | equipaje | mi maleta) #h:q_fee", "(la maleta | el equipaje | mi maleta) (tiene costo | cuesta | se paga | esta incluida | esta incluido)",
      "(cuesta | cuanto cuesta) documentar [la maleta | una maleta]", "(esta incluida | incluye) la maleta",
      "cuantas maletas (puedo | se pueden | me dejan) (llevar | documentar | facturar)", "cuantas maletas (incluye | estan incluidas) [mi tarifa | mi boleto]",
    ] },
    ask_restroom: { patterns: [
      "donde (esta | estan | queda | quedan) (el bano | los banos | los sanitarios | el sanitario | el servicio | los servicios | el aseo | el wc)",
      "hay (un bano | banos | sanitarios) (por aqui | cerca)",
    ] },
    // side questions a learner may ask here (audit, 5 Nov 2026): each had no answer
    ask_dollars: { patterns: [
      "(acepta | aceptan | toma | toman | recibe | reciben) (dolares | dolares americanos) [en efectivo]", "(puedo | se puede) pagar (en | con) dolares",
      "(pago | le pago | le puedo pagar) (en | con) dolares", "(solo | nada mas | nomas) (tengo | traigo | llevo) dolares",
    ] },
    // "¿Me da un recibo?" after the fee (or the bag's claim tag)
    ask_receipt: { patterns: [
      "(me da | me puede dar | me podria dar | me das #tip:tu_staff | quisiera | necesito) [un | el | mi | su] (recibo | ticket | comprobante) [de pago | del pago | de mi maleta | de la maleta | de mi equipaje | del equipaje]",
      "(me da | me puede dar | me podria dar) (los | mis) comprobantes [de mis maletas | de las maletas | del equipaje]",
      "(y | donde esta) (el | mi) (recibo | ticket | comprobante) [de pago | del pago | de mi maleta | de la maleta | del equipaje]",
    ] },
    ask_flightno: { patterns: [
      "(cual | que) es (mi | el) (numero de vuelo | vuelo)", "(cual | que) es el numero de (mi | el) vuelo", "(que | cual) numero de vuelo (es | tengo)", "(que | cual) vuelo (es | tengo)",
    ] },
    ask_direct: { patterns: [
      "(es | el vuelo es | mi vuelo es) [un vuelo] directo", "(el vuelo | mi vuelo) (hace | tiene) (escala | escalas)", "(hace | tiene | hay) [alguna] (escala | escalas)",
      "(es | va) sin escalas",
    ] },
    ask_pickup: { patterns: [
      "(donde | en donde) (recojo | recogo | recupero) (mi maleta | la maleta | mi equipaje | mis maletas | las maletas | el equipaje)",
      "(donde | en donde) (la | las | lo) (recojo | recogo | recupero)", "(la | las | lo) (recojo | recupero) en {city}",
    ] },
    ask_liquids: { patterns: [
      "(puedo | se puede | se pueden) (llevar | subir | pasar | meter) (liquidos | agua | una botella de agua) [en (la | mi | el) (mochila | bolsa | equipaje de mano | maleta de mano)]",
      "(y | que pasa con) los liquidos", "los liquidos (pueden | van) en [la | mi | el] (mochila | equipaje de mano | maleta de mano | bolsa)",
    ] },
    // "¿Puedo cambiar de asiento?" with no seat named
    seat_change: { patterns: [
      "(puedo | podria) (cambiar | cambiarme) (de | el | mi) (asiento | lugar)", "(me puede | me podria) cambiar (el | mi) (asiento | lugar)",
      "(quiero | quisiera) cambiar (de | mi | el) (asiento | lugar)",
    ] },
    // "No traigo mi pasaporte" at "¿Me permite su pasaporte?": what works instead
    passport_none_ctx: { patterns: ["no (tengo | traigo) [mi | el] pasaporte [conmigo | aqui]", "(se me olvidó | olvidé) [mi | el] pasaporte"] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | Pase, | por favor.", "Good morning! | Come forward, | please.", "Good morning! Please come forward."),
      t("¡Hola, | buenos días!", "Hi, | good morning!", "Hi, good morning!"),
      t("¡Siguiente, | por favor!", "Next, | please!", "Next, please!"),
    ],
    greet_howareyou: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?"),
      t("¡Hola! | ¿Cómo | le | va?", "Hi! | How | (for) you | it-goes?", "Hi! How's it going?"),
    ],
    greet_checkin: [
      t("¡Buenos días! | ¿Viene | a | hacer | su | check-in?", "Good morning! | Are you coming | to | do | your | check-in?", "Good morning! Checking in?"),
      t("¡Hola! | ¿Va | a | documentar?", "Hi! | Are you going | to | check in?", "Hi! Are you checking in?",
        { flags: { 3: "documentar: to check in (and check your bags) at the airline counter." }, spain: t("¡Hola! | ¿Va | a | facturar?", "Hi! | Are you going | to | check in?", "Hi! Are you checking in?") }),
    ],
    ask_checkin: [
      t("¿Va | a | hacer | su | check-in?", "Are you going | to | do | your | check-in?", "Are you checking in?"),
    ],
    yes_right_here: [t("Sí, | aquí | es.", "Yes, | here | it is.", "Yes, right here!")],
    weigh_first: [t("Primero | vamos | a | pesar | su | maleta.", "First | we're going | to | weigh | your | suitcase.", "Let's weigh your bag first.")],
    delayed_no: [
      t("No, | hoy | sale | a tiempo.", "No, | today | it leaves | on time.", "No, it's on time today."),
      t("No, | por ahora | va | a tiempo.", "No, | for now | it's going | on time.", "No, right now it's on time."),
    ],
    hello_great: [t("¡Perfecto!", "Perfect!", "Great!"), t("¡Muy | bien!", "Very | good!", "Great!")],
    checkin_ack: [t("¡Claro!", "Sure!", "Sure!"), t("¡Con gusto!", "With pleasure!", "Of course!"), t("¡Perfecto!", "Perfect!", "Great!")],
    no_help: [t("Muy | bien. | Aquí | estoy | si | me | necesita.", "Very | good. | Here | I am | if | me | you-need.", "No problem. I'm here if you need me.")],
    ask_dest: [
      t("¿A | dónde | viaja | hoy?", "To | where | are you traveling | today?", "Where are you flying today?"),
      t("¿Cuál | es | su | destino?", "What | is | your | destination?", "What's your destination?"),
      t("¿A | dónde | vuela | hoy?", "To | where | are you flying | today?", "Where are you headed today?"),
    ],
    ask_dest_again: [t("¿Y | a | dónde | viaja?", "And | to | where | are you traveling?", "And where are you flying?")],
    dest_ack: [
      t("{X}, | perfecto.", "{X}, | perfect.", "{X}, great."),
      t("Perfecto.", "Perfect.", "Great."),
      t("Muy | bien.", "Very | good.", "Okay."),
    ],
    dest_wrong: [
      t("Mmm, | no veo | ninguna | reservación | a | {X} | para | hoy.", "Hmm, | I don't see | any | reservation | to | {X} | for | today.", "Hmm, I don't see a reservation to {X} today.", { spain: t("Mmm, | no veo | ninguna | reserva | a | {X} | para | hoy.", "Hmm, | I don't see | any | reservation | to | {X} | for | today.", "Hmm, I don't see a reservation to {X} today.") }),
    ],
    dest_only_cdmx: [
      t("Solo | veo | una | a | la | Ciudad de México.", "Only | I-see | one | to | — | Mexico City.", "I only see one to Mexico City.",
        { flags: { 4: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    dest_confirm_q: [
      t("¿Viaja | a | la | Ciudad de México?", "Are you traveling | to | — | Mexico City?", "Are you flying to Mexico City?",
        { flags: { 2: "la: Spanish says la Ciudad de México; English has no article here." } }),
      t("¿Es | este | su | vuelo?", "Is | this | your | flight?", "Is this your flight?"),
    ],
    check_passport: [
      t("Muy | bien. | Lo | reviso | con | su | pasaporte.", "Very | good. | It | I-check | with | your | passport.", "Okay. I'll check with your passport.",
        { flags: { 2: "lo: it, the matter in general (your booking)." } }),
    ],
    flight_ack: [
      t("Vuelo | 223 | a | la | Ciudad de México, | perfecto.", "Flight | 223 | to | — | Mexico City, | perfect.", "Flight 223 to Mexico City, great.",
        { say: "Vuelo doscientos veintitrés a la Ciudad de México, perfecto.", flags: { 3: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    flight_wrong: [
      t("Mmm, | su | reservación | es | para | el | vuelo | 223 | a | la | Ciudad de México.", "Hmm, | your | reservation | is | for | — | flight | 223 | to | — | Mexico City.",
        "Hmm, your reservation is for flight 223 to Mexico City.",
        { say: "Mmm, su reservación es para el vuelo doscientos veintitrés a la Ciudad de México.",
          flags: { 5: "el: Spanish puts an article before vuelo here; English has none.", 9: "la: Spanish says la Ciudad de México; English has no article here." }, spain: t("Mmm, | su | reserva | es | para | el | vuelo | 223 | a | la | Ciudad de México.", "Hmm, | your | reservation | is | for | — | flight | 223 | to | — | Mexico City.", "Hmm, your reservation is for flight 223 to Mexico City.", {flags: {5: "el: Spanish puts an article before vuelo here; English has none.",9: "la: Spanish says la Ciudad de México; English has no article here."},say: "Mmm, su reserva es para el vuelo doscientos veintitrés a la Ciudad de México."}) }),
    ],
    // "El vuelo de las nueve": the booking's time, not "perfecto"
    flight_time: [
      t("Mmm, | el | vuelo | a | la | Ciudad de México | sale | a | las | 8:10 | de la mañana.", "Hmm, | the | flight | to | — | Mexico City | leaves | at | — | 8:10 | a.m.",
        "Hmm, the Mexico City flight leaves at 8:10 a.m.",
        { say: "Mmm, el vuelo a la Ciudad de México sale a las ocho y diez de la mañana.",
          flags: { 4: "la: Spanish says la Ciudad de México; English has no article here.", 8: "las: Spanish puts an article before clock times." } }),
    ],
    dest_neg_ack: [t("¡Ay, | perdón! | ¿A | dónde | viaja, | entonces?", "Oh, | sorry! | To | where | are you traveling, | then?", "Oh, sorry! Where are you flying, then?")],
    lookup_help: [t("No se preocupe. | Busco | su | vuelo | con | su | pasaporte.", "Don't worry. | I-look-up | your | flight | with | your | passport.", "No problem. I can find your flight with your passport.")],
    ask_passport: [
      t("¿Me | permite | su | pasaporte, | por favor?", "(To) me | you-allow | your | passport, | please?", "May I see your passport, please?", { spain: t("¿Me | deja | su | pasaporte, | por favor?", "(To) me | you-let-have | your | passport, | please?", "May I see your passport, please?") }),
      t("¿Me | da | su | pasaporte, | por favor?", "(To) me | you-give | your | passport, | please?", "Can I have your passport, please?"),
      t("¿Me | presta | su | pasaporte | o | su | tarjeta | de | residente?", "(To) me | you-lend | your | passport | or | your | card | of | resident?",
        "Could I see your passport or your resident card?", { flags: { 1: "prestar: to lend; Mexicans use it for handing something over for a moment." }, spain: t("¿Me | deja | su | pasaporte | o | su | tarjeta | de | residente?", "(To) me | you-let-have | your | passport | or | your | card | of | resident?", "Could I see your passport or your resident card?") }),
    ],
    pp_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thanks a lot."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    found_booking: [
      t("Muy | bien: | vuelo | 223 | a | la | Ciudad de México, | sale | a | las | 8:10.", "Very | good: | flight | 223 | to | — | Mexico City, | it leaves | at | — | 8:10.",
        "Okay: flight 223 to Mexico City, departing at 8:10.",
        { say: "Muy bien: vuelo doscientos veintitrés a la Ciudad de México, sale a las ocho y diez.",
          flags: { 5: "la: Spanish says la Ciudad de México; English has no article here.", 9: "las: Spanish puts an article before clock times." } }),
      t("Listo, | ya | encontré | su | reservación: | vuelo | 223 | a | la | Ciudad de México.", "Done, | already | I-found | your | reservation: | flight | 223 | to | — | Mexico City.",
        "All right, I found your reservation: flight 223 to Mexico City.",
        { say: "Listo, ya encontré su reservación: vuelo doscientos veintitrés a la Ciudad de México.", flags: { 8: "la: Spanish says la Ciudad de México; English has no article here." }, spain: t("Muy | bien, | ya | he | encontrado | su | reserva: | vuelo | 223 | a | la | Ciudad de México.", "Very | well, | already | I-have | found | your | reservation: | flight | 223 | to | — | Mexico City.", "All right, I found your reservation: flight 223 to Mexico City.", {flags: {10: "la: Spanish says la Ciudad de México; English has no article here."},say: "Muy bien, ya he encontrado su reserva: vuelo doscientos veintitrés a la Ciudad de México."}) }),
    ],
    found_lookup: [
      t("Muy | bien, | veo | que | hoy | viaja | a | la | Ciudad de México.", "Very | good, | I-see | that | today | you're traveling | to | — | Mexico City.",
        "Okay, I see you're flying to Mexico City today.", { flags: { 7: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    pp_yes: [t("Sí, | su | pasaporte, | por favor.", "Yes, | your | passport, | please.", "Yes, your passport, please.")],
    pp_only: [t("Por ahora | solo | necesito | su | pasaporte.", "For now | only | I-need | your | passport.", "For now I just need your passport.")],
    pp_resident_ok: [t("Sí, | claro, | su | tarjeta | de | residente | también | sirve.", "Yes, | of course, | your | card | of | resident | also | works.",
      "Yes, of course, your resident card works too.")],
    // a driver's license or an INE isn't ID for a foreigner's domestic flight
    pp_need: [t("Necesito | su | pasaporte | o | su | tarjeta | de | residente.", "I-need | your | passport | or | your | card | of | resident.",
      "I need your passport or your resident card.")],
    bp_updated: [
      t("Ya | le | cambié | el | pase de abordar.", "Already | (for) you | I-changed | the | boarding pass.", "I've updated your boarding pass.",
        { flags: { 4: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Ya | le | cambié | la | tarjeta de embarque.", "Already | (for) you | I-changed | the | boarding pass.", "I've updated your boarding pass."), spain: t("Ya | le | he | cambiado | la | tarjeta de embarque.", "Already | (for) you | I-have | changed | the | boarding pass.", "I've updated your boarding pass.") }),
    ],
    pp_have: [t("Ya | lo | tengo, | gracias.", "Already | it | I-have, | thanks.", "I already have it, thanks.", { flags: { 1: "lo: it, the passport (el pasaporte)." } })],
    find_first: [t("Primero | déjeme | encontrar | su | reservación.", "First | let me | find | your | reservation.", "Let me find your reservation first.", { spain: t("Primero | déjeme | encontrar | su | reserva.", "First | let me | find | your | reservation.", "Let me find your reservation first.") })],
    ask_bags: [
      t("¿Documenta | equipaje?", "Are you checking | luggage?", "Are you checking any bags?",
        { flags: { 0: "documentar: to check (a bag) at the airline counter; the Mexican word." }, spain: t("¿Factura | equipaje?", "Are you checking | luggage?", "Are you checking any bags?") }),
      t("¿Trae | maletas | para | documentar?", "Do you have | suitcases | to | check?", "Do you have any bags to check?", { spain: t("¿Lleva | maletas | para | facturar?", "Do you have | suitcases | to | check?", "Do you have any bags to check?") }),
    ],
    ask_bags_n: [t("¿Cuántas | maletas | va | a | documentar?", "How many | suitcases | are you going | to | check?", "How many bags are you checking?", { spain: t("¿Cuántas | maletas | va | a | facturar?", "How many | suitcases | are you going | to | check?", "How many bags are you checking?") })],
    bags_count_q: [t("¿Cuántas, | entonces?", "How many, | then?", "How many, then?")],
    bags_how_many: [
      t("Muy | bien. | ¿Cuántas?", "Very | good. | How many?", "Great. How many?"),
      t("Claro. | ¿Cuántas | maletas?", "Sure. | How many | suitcases?", "Sure. How many bags?"),
    ],
    bags_ack_one: [
      t("Muy | bien, | una | maleta.", "Very | good, | one | suitcase.", "Okay, one bag."),
      t("Una | maleta. | Perfecto.", "One | suitcase. | Perfect.", "One bag. Got it."),
    ],
    bags_ack_n: [t("{$num} | maletas, | muy | bien.", "{$num} | suitcases, | very | good.", "{$num} bags, okay.")],
    bags_none_ack: [t("Muy | bien, | solo | equipaje de mano.", "Very | good, | only | carry-on.", "Okay, carry-on only.")],
    ask_packed: [
      t("¿Usted | {m:mismo|f:misma} | hizo | su | maleta?", "You | yourself | packed | your | suitcase?", "Did you pack your bag yourself?",
        { flags: { 1: "mismo / misma: yourself; it agrees with you (a man or a woman)." }, spain: t("¿Ha | hecho | usted | {m:mismo|f:misma} | su | maleta?", "Have | packed | you | yourself | your | suitcase?", "Did you pack your bag yourself?", {flags: {3: "mismo / misma: yourself; it agrees with you (a man or a woman)."}}) }),
    ],
    ask_packed_many: [
      t("¿Usted | {m:mismo|f:misma} | hizo | sus | maletas?", "You | yourself | packed | your | suitcases?", "Did you pack your bags yourself?",
        { flags: { 1: "mismo / misma: yourself; it agrees with you (a man or a woman)." }, spain: t("¿Ha | hecho | usted | {m:mismo|f:misma} | sus | maletas?", "Have | packed | you | yourself | your | suitcases?", "Did you pack your bags yourself?", {flags: {3: "mismo / misma: yourself; it agrees with you (a man or a woman)."}}) }),
    ],
    packed_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you."), t("Muy | bien.", "Very | good.", "Okay.")],
    packed_follow: [t("Muy | bien. | ¿Sabe | qué | lleva | adentro?", "Very | good. | Do you know | what | you carry | inside?", "Okay. Do you know what's inside?", { spain: t("Muy | bien. | ¿Sabe | qué | lleva | dentro?", "Very | good. | Do you know | what | you carry | inside?", "Okay. Do you know what's inside?") })],
    packed_follow_ok: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Okay, thanks.")],
    ask_battery: [
      t("¿Lleva | baterías | de | litio | o | cargadores | portátiles | en | la | maleta?", "Do you carry | batteries | of | lithium | or | chargers | portable | in | the | suitcase?",
        "Are there any lithium batteries or power banks in the bag?"),
      t("¿Trae | alguna | batería | portátil | en | la | maleta?", "Do you have | any | battery | portable | in | the | suitcase?", "Any power banks in your bag?", { spain: t("¿Lleva | alguna | batería | portátil | en | la | maleta?", "Do you have | any | battery | portable | in | the | suitcase?", "Any power banks in your bag?") }),
    ],
    ask_battery_many: [
      t("¿Lleva | baterías | de | litio | o | cargadores | portátiles | en | las | maletas?", "Do you carry | batteries | of | lithium | or | chargers | portable | in | the | suitcases?",
        "Are there any lithium batteries or power banks in the bags?"),
    ],
    battery_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thanks."), t("Muy | bien, | perfecto.", "Very | good, | perfect.", "Okay, great.")],
    battery_move: [
      t("Los | cargadores | portátiles | tienen | que | ir | en | el | equipaje de mano. | ¿Lo | puede | sacar, | por favor?",
        "The | chargers | portable | have | to | go | in | the | carry-on. | It | can you | take out, | please?",
        "Power banks have to go in your carry-on. Could you take it out, please?", { flags: { 9: "lo: it, the power bank (el cargador)." } }),
    ],
    battery_move_q: [t("¿Lo | puede | pasar | a | su | equipaje de mano, | por favor?", "It | can you | move | to | your | carry-on, | please?", "Could you move it to your carry-on, please?")],
    battery_must: [t("Lo siento, | no puede | ir | en | la | maleta | documentada.", "I'm sorry, | it can't | go | in | the | suitcase | checked.", "Sorry, it can't go in a checked bag.", { spain: t("Lo siento, | no puede | ir | en | la | maleta | facturada.", "I'm sorry, | it can't | go | in | the | suitcase | checked.", "Sorry, it can't go in a checked bag.") })],
    battery_thanks: [t("¡Gracias!", "Thanks!", "Thank you!"), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    battery_unsure: [
      t("No hay problema. | Si | lleva | un | cargador | portátil, | llévelo | en | su | equipaje de mano.", "No problem. | If | you carry | a | charger | portable, | carry it | in | your | carry-on.",
        "That's okay. If you have a power bank, please keep it in your carry-on."),
    ],
    powerbank_what: [t("Es | una | batería | para | cargar | el | celular.", "It's | a | battery | to | charge | the | cell phone.", "It's a battery for charging your phone.", { spain: t("Es | una | batería | para | cargar | el | móvil.", "It's | a | battery | to | charge | the | phone.", "It's a battery for charging your phone.") })],
    ask_scale: [
      t("Póngala | en | la | báscula, | por favor.", "Put it | on | the | scale, | please.", "Please put it on the scale.", { flags: { 0: "Póngala: put it; la is the bag (la maleta)." } }),
      t("¿La | sube | a | la | báscula, | por favor?", "It | you-lift | onto | the | scale, | please?", "Could you put it on the scale, please?", { flags: { 0: "la: it, the bag (la maleta)." } }),
    ],
    ask_scale_many: [t("Póngalas | en | la | báscula, | una por una, | por favor.", "Put them | on | the | scale, | one at a time, | please.", "Please put them on the scale one at a time.")],
    scale_where: [t("Aquí, | junto | al | mostrador.", "Here, | next | to the | counter.", "Right here, next to the counter.")],
    weigh_ok: [
      t("{$kg} | kilos. | Todo | bien.", "{$kg} | kilos. | All | good.", "{$kg} kilos. You're all set."),
      t("Perfecto, | {$kg} | kilos.", "Perfect, | {$kg} | kilos.", "Perfect, {$kg} kilos."),
      t("Son | {$kg} | kilos. | No hay problema.", "It's | {$kg} | kilos. | No problem.", "That's {$kg} kilos. No problem."),
    ],
    weigh_ok_two: [t("Las | dos | pesan | menos | de | 25 | kilos. | Perfecto.", "The | two | weigh | less | than | 25 | kilos. | Perfect.", "Both are under 25 kilos. Perfect.",
      { say: "Las dos pesan menos de veinticinco kilos. Perfecto." })],
    weigh_ok_many: [t("Todas | pesan | menos | de | 25 | kilos. | Perfecto.", "All | weigh | less | than | 25 | kilos. | Perfect.", "They're all under 25 kilos. Perfect.",
      { say: "Todas pesan menos de veinticinco kilos. Perfecto." })],
    ow_result: [
      t("Mmm, | pesa | 27 | kilos. | El | límite | es | de | 25.", "Hmm, | it weighs | 27 | kilos. | The | limit | is | — | 25.", "Hmm, it's 27 kilos. The limit is 25.",
        { say: "Mmm, pesa veintisiete kilos. El límite es de veinticinco.", flags: { 7: "de: Spanish says el límite es de 25; English has no word here." } }),
      t("Ay, | se pasa | por | 2 | kilos: | pesa | 27 | y | el | límite | es | 25.", "Oh, | it's over | by | 2 | kilos: | it weighs | 27 | and | the | limit | is | 25.",
        "Oh, it's 2 kilos over: it weighs 27, and the limit is 25.", { say: "Ay, se pasa por dos kilos: pesa veintisiete y el límite es veinticinco." }),
    ],
    ow_result_many: [
      t("Mmm, | esta | pesa | 27 | kilos. | El | límite | es | de | 25.", "Hmm, | this one | weighs | 27 | kilos. | The | limit | is | — | 25.", "Hmm, this one is 27 kilos. The limit is 25.",
        { say: "Mmm, esta pesa veintisiete kilos. El límite es de veinticinco.", flags: { 8: "de: Spanish says el límite es de 25; English has no word here." } }),
    ],
    ow_options: [
      t("Hay | un | cargo | de | {$price} | por | sobrepeso, | o | puede | pasar | algunas | cosas | a | su | equipaje de mano.",
        "There is | a | charge | of | {$price} | for | excess weight, | or | you can | move | some | things | to | your | carry-on.",
        "There's an overweight fee of {$price}, or you can move a few things to your carry-on."),
      t("Puede | pasar | algunas | cosas | a | su | equipaje de mano | o | pagar | {$price} | de | sobrepeso.",
        "You can | move | some | things | to | your | carry-on | or | pay | {$price} | of | excess weight.",
        "You can move a few things to your carry-on or pay an overweight fee of {$price}."),
    ],
    ow_ask: [t("¿Prefiere | sacar | algunas | cosas | o | pagar | el | sobrepeso?", "Do you prefer | to take out | some | things | or | to pay | the | excess weight?",
      "Would you rather take a few things out or pay the fee?")],
    ow_move_ok: [t("Claro, | con calma.", "Sure, | take your time.", "Sure, take your time."), t("No hay problema. | Adelante.", "No problem. | Go ahead.", "No problem. Go ahead.")],
    ow_moving_ask: [t("Me | avisa | cuando | esté | {m:listo|f:lista}.", "(To) me | you-let-know | when | you are | ready.", "Let me know when you're ready.")],
    ow_reweigh: [
      t("Muy | bien, | {$kg} | kilos. | ¡Perfecto!", "Very | good, | {$kg} | kilos. | Perfect!", "Okay, {$kg} kilos. Perfect!"),
      t("A ver... | {$kg} | kilos. | ¡Ya está!", "Let's see... | {$kg} | kilos. | All set!", "Let's see… {$kg} kilos. You're good!"),
    ],
    ow_fee_card: [t("Muy | bien, | son | {$price}. | Puede | pagar | con | tarjeta | aquí.", "Very | good, | it's | {$price}. | You can | pay | with | card | here.",
      "Okay, that's {$price}. You can pay by card right here.")],
    ow_fee_ask: [t("Acerque | su | tarjeta | aquí, | por favor.", "Bring close | your | card | here, | please.", "Just tap your card here, please.")],
    // the fee in cash, asked again after a side question (it was "Acerque su tarjeta aquí")
    ow_cash_ask: [t("Son | {$price}, | por favor.", "It's | {$price}, | please.", "That's {$price}, please.")],
    ow_cash_ok: [t("Sí, | también | aceptamos | efectivo. | Son | {$price}.", "Yes, | also | we-accept | cash. | It's | {$price}.", "Yes, we take cash too. That's {$price}.")],
    // "No tengo tarjeta" / "No quiero pagar con tarjeta" (not "Sí, también…", which answers "¿Aceptan efectivo?")
    ow_cash_offer: [t("No hay problema, | también | aceptamos | efectivo. | Son | {$price}.", "No problem, | also | we-accept | cash. | It's | {$price}.",
      "No problem, we take cash too. That's {$price}.")],
    ow_fee_paid: [t("Gracias. | Listo, | todo | en orden.", "Thank you. | Done, | everything | in order.", "Thank you. You're all set.", { spain: t("Gracias. | Ya está, | todo | en orden.", "Thank you. | Done, | everything | in order.", "Thank you. You're all set.") })],
    // the fee is for the two kilos over ("¿Cuánto cobran por kilo?" got a bare "Son $600")
    ow_fee_amount: [t("Son | {$price} | por | los | dos | kilos.", "It's | {$price} | for | the | two | kilos.", "It's {$price} for the two kilos.")],
    ow_over: [t("Solo | 2 | kilos.", "Only | 2 | kilos.", "Just 2 kilos.", { say: "Solo dos kilos." })],
    weight_is: [t("Pesa | {$kg} | kilos.", "It weighs | {$kg} | kilos.", "It's {$kg} kilos.")],
    limit: [
      t("El | límite | es | de | 25 | kilos | por | maleta, | unas | 55 | libras.", "The | limit | is | — | 25 | kilos | per | suitcase, | about | 55 | pounds.",
        "The limit is 25 kilos per bag, about 55 pounds.",
        { say: "El límite es de veinticinco kilos por maleta, unas cincuenta y cinco libras.",
          flags: { 3: "de: Spanish says el límite es de 25; English has no word here.", 8: "unas before a number means about." } }),
    ],
    no_need_bag: [t("No hace falta. | Su | maleta | pesa | menos | de | 25 | kilos.", "No need. | Your | suitcase | weighs | less | than | 25 | kilos.", "No need. Your bag is under 25 kilos.",
      { say: "No hace falta. Su maleta pesa menos de veinticinco kilos." })],
    no_need_bags: [t("No hace falta. | Sus | maletas | pesan | menos | de | 25 | kilos.", "No need. | Your | suitcases | weigh | less | than | 25 | kilos.", "No need. Your bags are under 25 kilos.",
      { say: "No hace falta. Sus maletas pesan menos de veinticinco kilos." })],
    // the fee is paid: moving things, paying or "¿Cuánto es?" again (it was "Su maleta pesa menos de 25 kilos" at 27,
    // and "Hoy no tiene que pagar nada" after $600)
    fee_already: [t("No hace falta, | ya | pagó | el | sobrepeso.", "No need, | already | you-paid | the | excess weight.", "No need, you've already paid the overweight fee.", { spain: t("No hace falta, | ya | ha | pagado | el | sobrepeso.", "No need, | already | you-have | paid | the | excess weight.", "No need, you've already paid the overweight fee.") })],
    fee_receipt: [t("Claro, | aquí tiene | su | recibo.", "Sure, | here's | your | receipt.", "Sure, here's your receipt.")],
    // "¿Aceptan dólares?" (as the town's other cashiers answer it)
    pesos_only: [t("Lo siento, | solo | aceptamos | pesos. | También | puede | pagar | con | tarjeta.", "I'm sorry, | only | we-accept | pesos. | Also | you can | pay | with | card.",
      "Sorry, we only take pesos. You can also pay by card.")],
    nothing_to_pay: [t("Hoy | no tiene | que | pagar | nada.", "Today | you don't have | to | pay | anything.", "There's nothing to pay today.")],
    // asked before the bag is weighed: the fee isn't known yet, so no "nothing to pay"
    pay_methods: [t("Sí, | aceptamos | tarjeta | y | efectivo.", "Yes, | we-accept | card | and | cash.", "Yes, we take cards and cash.")],
    ask_seat: [
      t("¿Ventana | o | pasillo?", "Window | or | aisle?", "Window or aisle?"),
      t("¿Prefiere | ventana | o | pasillo?", "Do you prefer | window | or | aisle?", "Would you like a window or an aisle seat?"),
      t("¿Tiene | alguna | preferencia | de | asiento?", "Do you have | any | preference | of | seat?", "Do you have a seat preference?"),
    ],
    seat_help: [
      t("En | la | ventana | tiene | la | vista, | y | en | el | pasillo | se levanta | más | fácil.", "At | the | window | you have | the | view, | and | on | the | aisle | you get up | more | easily.",
        "A window seat has the view, and an aisle seat is easier if you want to get up."),
    ],
    seat_window: [
      t("Muy | bien, | asiento | 12A, | en | la | ventana.", "Very | good, | seat | 12A, | at | the | window.", "Okay, seat 12A, by the window.", { say: "Muy bien, asiento doce a, en la ventana." }),
      t("Le | doy | ventana: | el | 12A.", "(To) you | I-give | window: | — | 12A.", "I have a window seat for you: 12A.",
        { say: "Le doy ventana: el doce a.", flags: { 3: "el (asiento): Spanish puts an article before the seat number." } }),
    ],
    seat_aisle: [
      t("Muy | bien, | asiento | 14C, | en | el | pasillo.", "Very | good, | seat | 14C, | on | the | aisle.", "Okay, seat 14C, on the aisle.", { say: "Muy bien, asiento catorce ce, en el pasillo." }),
      t("Le | doy | pasillo: | el | 14C.", "(To) you | I-give | aisle: | — | 14C.", "I have an aisle seat for you: 14C.",
        { say: "Le doy pasillo: el catorce ce.", flags: { 3: "el (asiento): Spanish puts an article before the seat number." } }),
    ],
    seat_middle: [t("Muy | bien, | asiento | 23B, | en medio.", "Very | good, | seat | 23B, | in the middle.", "Okay, seat 23B, in the middle.", { say: "Muy bien, asiento veintitrés be, en medio." })],
    seat_any_ack: [t("No hay problema.", "No problem.", "No problem."), t("Claro, | no hay problema.", "Sure, | no problem.", "Sure, no problem.")],
    seat_pref_window: [t("Claro, | le | busco | ventana.", "Sure, | (for) you | I-look-for | window.", "Sure, I'll find you a window seat.")],
    seat_pref_aisle: [t("Claro, | le | busco | pasillo.", "Sure, | (for) you | I-look-for | aisle.", "Sure, I'll find you an aisle seat.")],
    seat_pref_middle: [t("Claro, | le | busco | uno | en medio.", "Sure, | (for) you | I-look-for | one | in the middle.", "Sure, I'll find you a middle seat.")],
    seat_neg_window: [t("Entonces, | ¿pasillo?", "Then, | aisle?", "So, an aisle seat?")],
    seat_neg_aisle: [t("Entonces, | ¿ventana?", "Then, | window?", "So, a window seat?")],
    seat_neg_middle: [t("Entonces, | ¿en medio?", "Then, | in the middle?", "So, a middle seat?")],
    seat_which: [t("Perdón, | ¿{$sa} | o | {$sb}?", "Sorry, | {$sa} | or | {$sb}?", "Sorry, {$sa} or {$sb}?")],
    seat_neg_both: [t("Claro. | Entonces, | ¿ventana | o | pasillo?", "Sure. | Then, | window | or | aisle?", "Sure. Window or aisle, then?")],
    no_window: [t("Lo siento, | ya | no hay | asientos | de | ventana.", "I'm sorry, | already | there are no | seats | of | window.", "Sorry, the window seats are all taken.")],
    no_window_q: [t("¿Le | doy | uno | de | pasillo?", "(To) you | I-give | one | of | aisle?", "Is an aisle seat okay?")],
    no_window_middle: [
      t("Lo | único | que | queda | es | en medio, | el | 23B. | ¿Está bien?", "The | only (thing) | that | remains | is | in the middle, | — | 23B. | Is that okay?",
        "The only other seat is a middle seat, 23B. Is that okay?",
        { say: "Lo único que queda es en medio, el veintitrés be. ¿Está bien?", flags: { 6: "el (asiento): Spanish puts an article before the seat number." } }),
    ],
    no_window_last: [
      t("Muy | bien, | le | dejo | el | pasillo: | el | 14C.", "Very | good, | (for) you | I-leave | the | aisle: | — | 14C.", "Okay, I'll keep you on the aisle, in 14C.",
        { say: "Muy bien, le dejo el pasillo: el catorce ce.", flags: { 6: "el (asiento): Spanish puts an article before the seat number." } }),
    ],
    bp_give: [
      t("Aquí tiene | su | pase de abordar.", "Here's | your | boarding pass.", "Here's your boarding pass.",
        { flags: { 2: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Aquí tiene | su | tarjeta de embarque.", "Here's | your | boarding pass.", "Here's your boarding pass.") }),
      t("Y | aquí está | su | pase de abordar.", "And | here is | your | boarding pass.", "And here's your boarding pass.",
        { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Y | aquí está | su | tarjeta de embarque.", "And | here is | your | boarding pass.", "And here's your boarding pass.") }),
    ],
    bp_info: [
      t("El | abordaje | empieza | a | las | 7:30 | en | la | sala | 4.", "The | boarding | starts | at | — | 7:30 | at | the | gate | 4.", "Boarding starts at 7:30 at gate 4.",
        { say: "El abordaje empieza a las siete y media en la sala cuatro.",
          flags: { 4: "las: Spanish puts an article before clock times.", 8: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("El | abordaje | empieza | a | las | 7:30 | en | la | puerta | 4.", "The | boarding | starts | at | — | 7:30 | at | the | gate | 4.", "Boarding starts at 7:30 at gate 4.",
            { say: "El abordaje empieza a las siete y media en la puerta cuatro.", flags: { 4: "las: Spanish puts an article before clock times." } }), spain: t("El | embarque | empieza | a | las | 7:30 | en | la | puerta | 4.", "The | boarding | starts | at | — | 7:30 | at | the | gate | 4.", "Boarding starts at 7:30 at gate 4.", {flags: {4: "las: Spanish puts an article before clock times."},say: "El embarque empieza a las siete y media en la puerta cuatro."}) }),
      t("Su | sala | es | la | 4 | y | abordamos | a | las | 7:30.", "Your | gate | is | — | 4 | and | we-board | at | — | 7:30.", "Your gate is 4, and boarding starts at 7:30.",
        { say: "Su sala es la cuatro y abordamos a las siete y media.",
          flags: { 1: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta.", 3: "la (sala): Spanish puts an article before the number.", 8: "las: Spanish puts an article before clock times." },
          neutral: t("Su | puerta | es | la | 4 | y | abordamos | a | las | 7:30.", "Your | gate | is | — | 4 | and | we-board | at | — | 7:30.", "Your gate is 4, and boarding starts at 7:30.",
            { say: "Su puerta es la cuatro y abordamos a las siete y media.", flags: { 3: "la (puerta): Spanish puts an article before the number.", 8: "las: Spanish puts an article before clock times." } }), spain: t("Su | puerta | es | la | 4 | y | embarcamos | a | las | 7:30.", "Your | gate | is | — | 4 | and | we-board | at | — | 7:30.", "Your gate is 4, and boarding starts at 7:30.", {flags: {3: "la (puerta): Spanish puts an article before the number.",8: "las: Spanish puts an article before clock times."},say: "Su puerta es la cuatro y embarcamos a las siete y media."}) }),
    ],
    bag_tag: [
      t("Y | este | es | el | comprobante | de | su | maleta.", "And | this | is | the | claim tag | of | your | suitcase.", "And here's your bag tag."),
      t("Aquí está | el | comprobante | de | su | equipaje.", "Here is | the | claim tag | of | your | luggage.", "Here's your baggage claim tag."),
    ],
    bag_tag_many: [t("Y | estos | son | los | comprobantes | de | sus | maletas.", "And | these | are | the | claim tags | of | your | suitcases.", "And here are your bag tags.")],
    ask_questions: [t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Do you have any questions?"), t("¿Alguna | duda?", "Any | question?", "Any questions?")],
    ask_more: [t("¿Algo | más?", "Something | else?", "Anything else?"), t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?")],
    what_q: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    ontime_yes: [
      t("Sí, | por ahora | va | a tiempo.", "Yes, | for now | it's going | on time.", "Yes, right now it's on time."),
      t("Sí, | hoy | sale | a tiempo.", "Yes, | today | it leaves | on time.", "Yes, it's on time today."),
    ],
    gate_is: [
      t("Es | la | sala | 4.", "It's | — | gate | 4.", "It's gate 4.",
        { say: "Es la sala cuatro.", flags: { 1: "la: Spanish puts an article here; English has none.", 2: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta." },
          neutral: t("Es | la | puerta | 4.", "It's | — | gate | 4.", "It's gate 4.", { say: "Es la puerta cuatro.", flags: { 1: "la: Spanish puts an article here; English has none." } }) }),
    ],
    boarding_time: [
      t("El | abordaje | empieza | a | las | 7:30 | y | el | vuelo | sale | a | las | 8:10.", "The | boarding | starts | at | — | 7:30 | and | the | flight | leaves | at | — | 8:10.",
        "Boarding starts at 7:30, and the flight leaves at 8:10.",
        { say: "El abordaje empieza a las siete y media y el vuelo sale a las ocho y diez.",
          flags: { 4: "las: Spanish puts an article before clock times.", 11: "las: Spanish puts an article before clock times." }, spain: t("El | embarque | empieza | a | las | 7:30 | y | el | vuelo | sale | a | las | 8:10.", "The | boarding | starts | at | — | 7:30 | and | the | flight | leaves | at | — | 8:10.", "Boarding starts at 7:30, and the flight leaves at 8:10.", {flags: {4: "las: Spanish puts an article before clock times.",11: "las: Spanish puts an article before clock times."},say: "El embarque empieza a las siete y media y el vuelo sale a las ocho y diez."}) }),
    ],
    security_dir: [
      // the 3D hall: the scanner is east of the counter, on the learner's right (Emilio's left) as they face him
      t("El | filtro de seguridad | está | por allá, | a | su | derecha.", "The | security checkpoint | is | over there, | on | your | right.", "Security is over there, on your right.",
        { flags: { 1: "Mexican: el filtro de seguridad = the security checkpoint; elsewhere el control de seguridad." },
          neutral: t("El | control de seguridad | está | por allá, | a | su | derecha.", "The | security checkpoint | is | over there, | on | your | right.", "Security is over there, on your right.") }),
      // the same way as the first (asked twice, the rotation says both); no café is built in the hall
      t("Seguridad | está | a | su | derecha, | por allá.", "Security | is | on | your | right, | over there.", "Security is to your right, over there."),
    ],
    // "¿Dónde está la sala 4?" got "Es la sala 4": where it is (after security, as s64b's officer says)
    gate_where: [
      t("La | sala | 4 | está | pasando | el | filtro de seguridad.", "The | gate | 4 | is | past | the | security checkpoint.", "Gate 4 is just past security.",
        { say: "La sala cuatro está pasando el filtro de seguridad.",
          flags: { 1: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta.", 6: "Mexican: el filtro de seguridad = the security checkpoint; elsewhere el control de seguridad." },
          neutral: t("La | puerta | 4 | está | pasando | el | control de seguridad.", "The | gate | 4 | is | past | the | security checkpoint.", "Gate 4 is just past security.",
            { say: "La puerta cuatro está pasando el control de seguridad." }) }),
    ],
    duration: [t("Son | más o menos | dos | horas.", "It's | more or less | two | hours.", "It's about two hours.")],
    // "¿A qué hora llegamos?" gets a when, kept vague (the flight time and the time zones aren't stated)
    arrive: [t("Son | más o menos | dos | horas | de | vuelo, | así que | llega | a | media mañana.", "It's | more or less | two | hours | of | flight, | so | you arrive | at | mid-morning.",
      "It's about a two-hour flight, so you'll get there mid-morning.")],
    carryon_ok: [t("Sí, | esa | mochila | está bien | como | equipaje de mano.", "Yes, | that | backpack | is fine | as | carry-on.", "Sure, that backpack is fine as a carry-on.")],
    // "¿Tengo que documentar la mochila?" (a "Sí, …" would say yes, check it)
    carryon_no: [t("No, | la | puede | llevar | como | equipaje de mano.", "No, | it | you-can | take | as | carry-on.", "No, you can take it as a carry-on.",
      { flags: { 1: "la: it, the bag you asked about (la mochila, la bolsa)." } })],
    liquids: [t("En | el | equipaje de mano, | solo | en | envases | de | 100 | mililitros | o | menos.", "In | the | carry-on, | only | in | containers | of | 100 | milliliters | or | less.",
      "In your carry-on, only in containers of 100 milliliters or less.", { say: "En el equipaje de mano, solo en envases de cien mililitros o menos." })],
    flight_no: [t("Es | el | vuelo | 223, | a | la | Ciudad de México.", "It's | — | flight | 223, | to | — | Mexico City.", "It's flight 223, to Mexico City.",
      { say: "Es el vuelo doscientos veintitrés, a la Ciudad de México.",
        flags: { 1: "el: Spanish puts an article before vuelo here; English has none.", 5: "la: Spanish says la Ciudad de México; English has no article here." } })],
    // "¿Dónde recojo mi maleta?" (s64c's gate agent says the same: at baggage claim, when you land)
    bag_pickup: [t("En | la | Ciudad de México, | al | llegar.", "In | — | Mexico City, | upon | arriving.", "In Mexico City, when you land.",
      { flags: { 1: "la: Spanish says la Ciudad de México; English has no article here." } })],
    // "¿Es directo?" and "¿Hace escala?" both (no sí / no that answers only one of them)
    direct: [t("Es | un | vuelo | directo, | sin | escalas.", "It's | a | flight | direct, | without | layovers.", "It's a nonstop flight.")],
    seatnum: [t("Su | asiento | es | el | {$seat}.", "Your | seat | is | — | {$seat}.", "Your seat is {$seat}.", { flags: { 3: "el (asiento): Spanish puts an article before the seat number." } })],
    bagfee_info: [t("Su | tarifa | incluye | una | maleta | documentada, | así que | no tiene | costo.", "Your | fare | includes | one | suitcase | checked, | so | it doesn't have | cost.",
      "Your fare includes one checked bag, so there's no charge.", { spain: t("Su | tarifa | incluye | una | maleta | facturada, | así que | no tiene | coste.", "Your | fare | includes | one | suitcase | checked, | so | it doesn't have | cost.", "Your fare includes one checked bag, so there's no charge.") })],
    bagfee_many: [t("Su | reservación | ya | incluye | sus | maletas.", "Your | reservation | already | includes | your | suitcases.", "Your reservation already includes your bags.", { spain: t("Su | reserva | ya | incluye | sus | maletas.", "Your | reservation | already | includes | your | suitcases.", "Your reservation already includes your bags.") })],
    restroom: [t("Los | baños | están | por allá, | junto | a | la | cafetería.", "The | restrooms | are | over there, | next | to | the | café.", "The restrooms are over there, next to the café.", { spain: t("Los | aseos | están | por allá, | junto | a | la | cafetería.", "The | restrooms | are | over there, | next | to | the | café.", "The restrooms are over there, next to the café.") })],
    bye_flight: [t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"), t("¡Que | tenga | buen | vuelo!", "May | you have | good | flight!", "Have a good flight!", { neutral: t("¡Que | tenga | un | buen | vuelo!", "May | you have | a | good | flight!", "Have a good flight!") })],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto.", "Perfect.", "Great.")],
    thanks_short: [t("Gracias.", "Thank you.", "Thanks.")],
  },

  domains: {
    kg: () => [18, 20, 22, 23, 24, 27],
    num: () => Object.values(NUM_WORD),
    seat: () => Object.values(SEAT_NO),
    price: () => [FEE],
    // "Perdón, ¿{$sa} o {$sb}?": the two seats heard (seatWhich); a seat is never asked against itself
    sa: () => Object.values(SEAT_WORD),
    sb: () => Object.values(SEAT_WORD),
  },

  hints: {
    hello: {
      lt: "Say you'd like to check in",
      items: [
        { id: "checkin_simple", s: t("Quisiera | hacer | el | check-in.", "I'd like | to do | the | check-in.", "I'd like to check in.") },
        { id: "checkin_doc", s: t("Vengo | a | documentar.", "I come | to | check in.", "I'm here to check in.", { spain: t("Vengo | a | facturar.", "I come | to | check in.", "I'm here to check in.") }),
          note: "In Mexico, documentar is what you do at the airline counter: check in and drop off your bags.", noteSpain: "Facturar: to check in and drop off your bags at the airline counter (Mexico: documentar)." },
        { id: "dest_checkin", s: t("Quisiera | hacer | el | check-in | para | mi | vuelo | a | la | Ciudad de México.", "I'd like | to do | the | check-in | for | my | flight | to | — | Mexico City.",
          "I'd like to check in for my flight to Mexico City.", { flags: { 8: "la: Spanish says la Ciudad de México; English has no article here." } }) },
      ],
    },
    dest: {
      lt: "Say where you're flying",
      items: [
        { id: "dest_to", s: t("A | la | Ciudad de México, | por favor.", "To | — | Mexico City, | please.", "To Mexico City, please.",
          { flags: { 1: "la: Spanish says la Ciudad de México; English has no article here." } }) },
        { id: "dest_flying", s: t("Vuelo | a | la | Ciudad de México.", "I fly | to | — | Mexico City.", "I'm flying to Mexico City.",
          { flags: { 2: "la: Spanish says la Ciudad de México; English has no article here." } }) },
        { id: "dest_going", s: t("Voy | a | la | Ciudad de México.", "I'm going | to | — | Mexico City.", "I'm going to Mexico City.",
          { flags: { 2: "la: Spanish says la Ciudad de México; English has no article here." } }) },
        { id: "dest_checkin", s: t("Quisiera | hacer | el | check-in | para | mi | vuelo | a | la | Ciudad de México.", "I'd like | to do | the | check-in | for | my | flight | to | — | Mexico City.",
          "I'd like to check in for my flight to Mexico City.", { flags: { 8: "la: Spanish says la Ciudad de México; English has no article here." } }) },
      ],
    },
    confirm: {
      lt: "Confirm your flight",
      items: [
        { id: "yes_right", s: t("Sí, | ese | es | mi | vuelo.", "Yes, | that | is | my | flight.", "Yes, that's my flight.") },
        { id: "no_wrong", s: t("No, | ese | no es | mi | vuelo.", "No, | that | isn't | my | flight.", "No, that's not my flight.") },
      ],
    },
    passport: {
      lt: "Hand over your passport",
      items: [
        { id: "pp_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "pp_heres", s: t("Aquí está | mi | pasaporte.", "Here is | my | passport.", "Here's my passport.") },
        { id: "pp_card", s: t("Aquí tiene | mi | tarjeta | de | residente.", "Here you have | my | card | of | resident.", "Here's my resident card."),
          note: "If you live in Mexico, your resident card works as ID too." },
        { id: "pp_q", s: t("¿Necesita | mi | pasaporte?", "Do you need | my | passport?", "Do you need my passport?") },
      ],
    },
    bags: {
      lt: "Say how many bags you're checking",
      items: [
        { id: "bags_one", s: t("Solo | una | maleta.", "Only | one | suitcase.", "Just one bag.") },
        { id: "bags_this", s: t("Solo | esta.", "Only | this one.", "Just this one.") },
        { id: "bags_checking", s: t("Voy | a | documentar | una | maleta.", "I'm going | to | check | one | suitcase.", "I'm checking one bag.", { spain: t("Voy | a | facturar | una | maleta.", "I'm going | to | check | one | suitcase.", "I'm checking one bag.") }) },
        { id: "bags_two", s: t("Dos | maletas.", "Two | suitcases.", "Two bags.") },
        { id: "bags_none", s: t("No, | solo | traigo | equipaje de mano.", "No, | only | I-bring | carry-on.", "No, just a carry-on.", { spain: t("No, | solo | llevo | equipaje de mano.", "No, | only | I-carry | carry-on.", "No, just a carry-on.") }) },
      ],
    },
    packed: {
      lt: "Say you packed it yourself",
      items: [
        { id: "packed_yes", s: t("Sí, | yo | {m:mismo|f:misma} | la | hice.", "Yes, | I | myself | it | packed.", "Yes, I packed it myself.",
          { flags: { 2: "mismo / misma: myself; it agrees with you.", 3: "la: it, the bag (la maleta)." }, spain: t("Sí, | yo | {m:mismo|f:misma} | la | he | hecho.", "Yes, | I | myself | it | I-have | packed.", "Yes, I packed it myself.", {flags: {2: "mismo / misma: myself; it agrees with you.",3: "la: it, the bag (la maleta)."}}) }) },
        { id: "packed_did", s: t("Sí, | la | hice | yo.", "Yes, | it | I-packed | myself.", "Yes, I did it myself.", { flags: { 1: "la: it, the bag (la maleta)." }, spain: t("Sí, | la | he | hecho | yo.", "Yes, | it | I-have | packed | myself.", "Yes, I did it myself.", {flags: {1: "la: it, the bag (la maleta)."}}) }) },
      ],
    },
    battery: {
      lt: "Answer about batteries",
      items: [
        { id: "battery_no", s: t("No, | no traigo | nada | de | eso.", "No, | I don't have | anything | of | that.", "No, nothing like that.", { spain: t("No, | no llevo | nada | de | eso.", "No, | I don't have | anything | of | that.", "No, nothing like that.") }) },
        { id: "battery_carryon", s: t("Lo | traigo | en | mi | mochila.", "It | I-carry | in | my | backpack.", "It's in my backpack.", { flags: { 0: "lo: it, the charger (el cargador)." }, spain: t("Lo | llevo | en | mi | mochila.", "It | I-carry | in | my | backpack.", "It's in my backpack.", {flags: {0: "lo: it, the charger (el cargador)."}}) }) },
        { id: "battery_carryon_x", s: t("Mi | cargador | portátil | está | en | mi | mochila.", "My | charger | portable | is | in | my | backpack.", "My power bank is in my backpack.") },
        { id: "battery_yes", s: t("Sí, | traigo | un | cargador | portátil.", "Yes, | I-have | a | charger | portable.", "Yes, I have a power bank.", { spain: t("Sí, | llevo | un | cargador | portátil.", "Yes, | I-have | a | charger | portable.", "Yes, I have a power bank.") }) },
        { id: "q_powerbank", s: t("¿Qué | es | un | cargador | portátil?", "What | is | a | charger | portable?", "What's a power bank?") },
      ],
    },
    scale: {
      lt: "Put your bag on the scale",
      items: [
        { id: "scale_like_this", s: t("¿Así?", "Like this?", "Like this?") },
        { id: "scale_here", s: t("Aquí está.", "Here it is.", "Here it is.") },
        { id: "scale_where_h", s: t("¿Dónde | la | pongo?", "Where | it | do I put?", "Where do I put it?", { flags: { 1: "la: it, the bag (la maleta)." } }) },
      ],
    },
    ow_move: {
      lt: "Move things to your carry-on",
      items: [
        { id: "ow_move", s: t("Voy | a | pasar | unas | cosas | a | mi | equipaje de mano.", "I'm going | to | move | some | things | to | my | carry-on.", "I'll move a few things to my carry-on.") },
        { id: "ow_take_out", s: t("¿Puedo | sacar | algunas | cosas?", "Can I | take out | some | things?", "Can I take a few things out?") },
        { id: "ow_wear", s: t("Me | pongo | el | suéter.", "(On) myself | I-put | the | sweater.", "I'll wear my sweater.", { flags: { 0: "me pongo: I put on (myself); ponerse = to put on clothes." }, spain: t("Me | pongo | el | jersey.", "(On) myself | I-put | the | sweater.", "I'll wear my sweater.", {flags: {0: "me pongo: I put on (myself); ponerse = to put on clothes."}}) }) },
      ],
    },
    ow_pay: {
      lt: "Pay the fee",
      items: [{ id: "ow_pay", s: t("Prefiero | pagar | el | sobrepeso.", "I prefer | to pay | the | excess weight.", "I'd rather pay the overweight fee.") }],
    },
    ow_ask: {
      lt: "Ask about the fee or the limit",
      items: [
        { id: "ow_how_much", s: t("¿Cuánto | es?", "How much | is it?", "How much is it?") },
        { id: "ow_over", s: t("¿Por | cuánto | se pasa?", "By | how much | is it over?", "How much over is it?") },
        { id: "q_limit", s: t("¿Cuál | es | el | límite | de | peso?", "What | is | the | limit | of | weight?", "What's the weight limit?") },
      ],
    },
    moving: {
      lt: "Say you've moved things",
      items: [
        { id: "moving_done", s: t("Listo.", "Ready.", "Done.", { spain: t("Ya está.", "Done.", "Done.") }) },
        { id: "moving_now", s: t("¿Y | ahora?", "And | now?", "How about now?") },
        { id: "moving_ok", s: t("¿Ya | está bien?", "Now | is it okay?", "Is it okay now?") },
      ],
    },
    fee: {
      lt: "Pay the fee",
      items: [
        { id: "fee_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "fee_here", s: t("Aquí tiene | mi | tarjeta.", "Here you have | my | card.", "Here's my card.") },
        { id: "fee_cash", s: t("En efectivo, | por favor.", "In cash, | please.", "Cash, please.") },
      ],
    },
    seat: {
      lt: "Choose a seat", slot: "seat", examples: ["window", "aisle"],
      items: [
        { id: "seat_please", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "seat_id_like", s: t("Quisiera | un | asiento | de | {X}.", "I'd like | a | seat | of | {X}.", "I'd like a {X} seat.") },
        { id: "seat_prefer", s: t("Prefiero | {X}.", "I prefer | {X}.", "I'd prefer the {X}.") },
        { id: "seat_can_i", s: t("¿Me | da | {X}, | por favor?", "(To) me | you-give | {X}, | please?", "Can I have the {X}, please?"), only: (e) => e.id !== "middle",
          note: "Very common in Mexico: “¿Me da…?” for asking for something." },
        { id: "seat_either", s: t("Me | da | igual.", "(To) me | it's | the same.", "I don't mind.") },
        { id: "seat_either2", s: t("Cualquiera | está bien.", "Any | is fine.", "Either is fine.") },
      ],
    },
    questions: {
      lt: "Ask about your flight",
      items: [
        { id: "q_ontime", s: t("¿El | vuelo | sale | a tiempo?", "The | flight | leaves | on time?", "Is the flight on time?") },
        { id: "q_gate", s: t("¿Cuál | es | mi | sala?", "What | is | my | gate?", "What's my gate?",
          { flags: { 3: "Mexican: la sala = the gate; elsewhere la puerta." }, neutral: t("¿Cuál | es | mi | puerta?", "What | is | my | gate?", "What's my gate?") }) },
        { id: "q_boarding", s: t("¿A | qué | hora | empieza | el | abordaje?", "At | what | time | starts | the | boarding?", "What time does boarding start?", { spain: t("¿A | qué | hora | empieza | el | embarque?", "At | what | time | starts | the | boarding?", "What time does boarding start?") }) },
        { id: "q_security", s: t("¿Por | dónde | paso | a | seguridad?", "Through | where | do I go | to | security?", "Which way to security?") },
        { id: "q_carryon", s: t("¿Puedo | llevar | esta | mochila | conmigo?", "Can I | take | this | backpack | with me?", "Can I take this backpack on board?") },
        { id: "q_fee", s: t("¿Tengo | que | pagar | por | la | maleta?", "Do I have | to | pay | for | the | suitcase?", "Do I have to pay for the bag?") },
        { id: "q_limit", s: t("¿Cuál | es | el | límite | de | peso?", "What | is | the | limit | of | weight?", "What's the weight limit?") },
      ],
    },
    more: {
      lt: "Say you have no more questions",
      items: [
        { id: "more_all", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.") },
        { id: "more_good", s: t("Todo | claro, | gracias.", "All | clear, | thanks.", "Everything's clear, thanks.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With airline staff, usted is more polite: tenga, me da (toma and dame are for friends).", better: "Aquí tiene." },
  },

  merges: {
    "check-in": { reason: "lexical_expression", split: "One hyphenated loanword from English, used as is in Mexico: check-in.", minimal: "One word." },
    "ciudad de méxico": { reason: "lexical_expression", split: "ciudad → city + de → of + méxico → Mexico is the city's proper name: Mexico City.", minimal: "The three-word name." },
    "equipaje de mano": { reason: "lexical_expression", split: "equipaje → luggage + de → of + mano → hand would hide the compound noun: carry-on.", minimal: "Three words, one noun." },
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board would hide the compound noun: boarding pass.", minimal: "Three words, one noun." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding is the compound noun boarding pass.", minimal: "Three words, one noun." },
    "filtro de seguridad": { reason: "lexical_expression", split: "filtro → filter + de → of + seguridad → security misreads the compound noun: security checkpoint.", minimal: "Three words, one noun." },
    "control de seguridad": { reason: "lexical_expression", split: "control → control + de → of + seguridad → security is the compound noun security checkpoint.", minimal: "Three words, one noun." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time misreads the fixed phrase: on time.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now is the fixed adverb: for now.", minimal: "Two words." },
    "por allá": { reason: "lexical_expression", split: "por → through + allá → there is the fixed adverb: over there.", minimal: "Two words." },
    "en medio": { reason: "lexical_expression", split: "en → in + medio → half/middle misreads the fixed phrase: in the middle.", minimal: "Two words." },
    "en orden": { reason: "lexical_expression", split: "en → in + orden → order is the fixed phrase: in order (all set).", minimal: "Two words." },
    "con calma": { reason: "lexical_expression", split: "con → with + calma → calm is the fixed phrase: take your time.", minimal: "Two words." },
    "una por una": { reason: "lexical_expression", split: "una → one + por → by + una → one is the distributive adverb: one at a time.", minimal: "Three words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is the fixed adverb roughly.", minimal: "Three words." },
    "media mañana": { reason: "lexical_expression", split: "media → half + mañana → morning misreads the fixed phrase: mid-morning.", minimal: "Two words." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that misreads the connector: so.", minimal: "Two words." },
    "no hace falta": { reason: "lexical_expression", split: "no → not + hace → makes + falta → lack misreads the fixed phrase: no need.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Say where you're flying" },
    { step: "passport", lt: "Show your passport" },
    { lt: "Check your bag", optional: true, when: (c) => c.s.bags !== 0, done: (c) => !!c.s.weighed || !!c.s.owShown },
    { lt: "Sort out the overweight bag", optional: true, when: (c) => !!c.s.owShown, done: (c) => !!c.s.owDone },
    { step: "seat", lt: "Choose your seat" },
    { lt: "Find out your gate and boarding time", done: (c) => !!c.s.bpGiven },
  ],

  steps: [
    { id: "hello", when: (c) => !!c.s.helloQ, done: (c) => !!c.s.hello,
      ask: (c) => { c.say(c.s.helloAsked ? "ask_checkin" : "greet_checkin"); c.s.helloAsked = true; },
      expects: ["checkin", "dest_ans", "dest_ctx", "give"],
      suggest: [{ lt: "Say you'd like to check in", hint: "hello" }, { lt: "Say where you're flying", hint: "dest" }],
      yes: (c) => { c.s.hello = true; c.say("hello_great"); },
      no: (c) => { c.s.hello = true; c.say("no_help"); c.hold(); } },
    { id: "dest", done: (c) => !!c.s.dest || !!c.s.lookup,
      // asked again (after "Quiero hacer el check-in"): a short "¿Y a dónde viaja?", not the same question
      ask: (c) => { c.say(c.s.destAsked ? "ask_dest_again" : "ask_dest"); c.s.destAsked = true; },
      expects: ["dest_ans", "dest_ctx", "checkin", "lookup", "lookup_ctx"],
      suggest: [{ lt: "Say where you're flying", hint: "dest" }],
      help: (c) => { c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); } },
    { id: "passport", done: (c) => !!c.s.passport,
      ask: (c) => c.say("ask_passport"),
      expects: ["give", "give_ctx", "passport_q", "find_it", "passport_none_ctx"],
      suggest: [{ lt: "Hand over your passport", hint: "passport" }],
      yes: (c) => { passportGiven(c); } },
    { id: "bags", done: (c) => c.s.bags !== undefined,
      // "¿Documenta equipaje?" (yes / no) or "¿Cuántas maletas va a documentar?"; a bare "Sí" to the second gets "¿Cuántas, entonces?"
      ask: (c) => { c.s.bagsQ = c.s.bagsQ ?? (c.chance(0.3) ? "n" : "yn"); c.say(c.s.bagsQ === "n" ? "ask_bags_n" : "ask_bags"); },
      expects: ["bags_ans", "bags_num_ctx", "bags_none", "bags_none_ctx"],
      suggest: [{ lt: "Say how many bags you're checking", hint: "bags" }, { lt: "Ask about the weight limit", hint: "ow_ask" }],
      yes: (c) => { expectBagCount(c, c.s.bagsQ === "n" ? "bags_count_q" : "bags_how_many"); },
      no: (c) => { setBags(c, 0); } },
    { id: "safety", when: (c) => !!c.s.askSafety && c.s.bags > 0 && !!c.s.passport, done: (c) => !!c.s.safetyDone,
      ask: (c) => {
        const many = c.s.bags >= 2;
        if (c.s.safetyKind === "packed") { c.say(many ? "ask_packed_many" : "ask_packed"); expectPacked(c); }
        else { c.say(many ? "ask_battery_many" : "ask_battery"); expectBattery(c); }
      } },
    { id: "scale", when: (c) => c.s.bags > 0 && !!c.s.passport, done: (c) => !!c.s.weighed,
      ask: (c) => c.say(c.s.bags >= 2 ? "ask_scale_many" : "ask_scale"),
      expects: ["give", "give_ctx", "ack_done", "scale_where"],
      suggest: [{ lt: "Put your bag on the scale", hint: "scale" }, { lt: "Ask about the weight limit", hint: "ow_ask" }],
      yes: (c) => { weigh(c); } },
    { id: "seat", when: (c) => !!c.s.passport, done: (c) => !!c.s.seatNo,
      ask: (c) => {
        const pref = c.s.seatPref as string | undefined;
        if (pref) {
          if (pref === "any") { c.say("seat_any_ack"); assignSeat(c, "aisle"); c.ask("bp"); return; }
          if (assignSeat(c, pref)) c.ask("bp");
          return;
        }
        c.say("ask_seat");
      },
      expects: ["seat_ans", "seat_any", "seat_neg", "seat_rec", "seat_amb"],
      suggest: [{ lt: "Choose a seat: window or aisle", hint: "seat", options: "seat" }],
      help: (c) => { c.say("seat_help"); c.say("ask_seat"); } },
    { id: "bp", when: (c) => !!c.s.seatNo, done: (c) => !!c.s.moreDone,
      ask: (c) => {
        if (!c.s.bpGiven) {
          c.s.bpGiven = true;
          c.say("bp_give");
          c.event("give", { item: "boarding-pass" });
          c.say("bp_info");
          // (not again if the learner already asked for it)
          if (c.s.bags > 0 && !c.s.tagGiven && c.chance(0.45)) { c.s.tagGiven = true; c.say(c.s.bags >= 2 ? "bag_tag_many" : "bag_tag"); }
          c.say("ask_questions");
        } else c.say("ask_more");
      },
      expects: ["more_no", "more_q", "ask_ontime", "ask_delayed", "ask_gate", "ask_boarding_time", "ask_security", "ask_duration", "ask_carryon", "ask_seatnum", "ask_limit", "ask_bagfee", "ask_restroom"],
      suggest: [
        { lt: "Say you have no more questions", hint: "more" },
        { lt: "Ask about your flight", hint: "questions" },
      ],
      yes: (c) => { if (plainAck(c.heard)) { c.s.moreDone = true; return; } c.say("what_q"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.greetKind = c.chance(0.3) ? "howareyou" : c.chance(0.43) ? "checkin" : "plain";
    c.s.askSafety = c.chance(0.7);
    c.s.safetyKind = c.chance(0.55) ? "battery" : "packed";
    c.s.overweight = c.visits >= 1 ? c.chance(0.5) : c.chance(0.3);
    c.s.noWindow = c.visits >= 1 && c.chance(0.3);
    c.s.kg = c.pick([18, 20, 22, 23]);
  },

  start: (c) => {
    if (c.s.greetKind === "howareyou") { c.say("greet_howareyou"); expectHowAreYou(c); return; }
    if (c.s.greetKind === "checkin") { c.s.helloQ = true; return; } // the "hello" step asks "¿Viene a hacer su check-in?"
    c.say("greet");
  },

  handlers: {
    affirm(c) { const st = checkin.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); else c.say("ack"); },
    deny(c) { const st = checkin.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    checkin(c, slots, seg) {
      const already = !!c.s.hello;
      c.s.hello = true;
      if (seg.tags.includes("isthis")) {
        c.say("yes_right_here");
        if (slots.city === "cdmx") c.s.dest = "cdmx";
        else if (slots.city) setDest(c, slots.city);
        return;
      }
      if (seg.tags.includes("bag") && c.s.bags === undefined) c.s.bags = 1;
      if (flightSaid(c, slots)) return;
      if (/\b(ciudad de mexico|cdmx|df|guadalajara|monterrey|cancun|merida|oaxaca|vuelo \d+|\d{3})\b/.test(fold(c.heard))) return;
      if (!already || c.step === "hello" || !c.s.dest) c.say("checkin_ack");
    },
    // a wrong city, then the number ("dos dos tres" too), then the time: "el vuelo de las nueve" is not "perfecto"
    dest_ans(c, slots) { flightSaid(c, slots); },
    dest_ctx(c, slots) { flightSaid(c, slots); },
    dest_unknown(c) {
      c.s.hello = true;
      if (c.s.passport) { c.say("flight_wrong"); return; }
      c.say("dest_only_cdmx");
      expectDestConfirm(c);
    },
    dest_neg(c, slots) {
      if (c.s.dest === slots.city) c.s.dest = undefined;
      c.say("dest_neg_ack");
      c.hold();
    },
    give(c, slots) {
      const docs = [slots.doc, slots.doc2].filter(Boolean) as string[];
      // the engine forgives o/a slips, so "Tengo…" can reach the pattern "Tenga" and "Tomo el vuelo…" the pattern "Tome":
      // that hands nothing over (a bare "Tomo." still does: a slip for "Tome")
      if (!docs.length && /^((si|no|bueno|pues) )?(tengo\b|tomo \w)/.test(words(c.heard))) return;
      // a foreigner's domestic flight in Mexico takes a passport or a resident card, not a driver's license or an INE
      if (!c.s.passport && docs.length && docs.every((d) => d === "id") && /licencia|\bine\b/.test(words(c.heard))) { c.say("pp_need"); c.hold(); return; }
      const isId = docs.some((d) => d === "passport" || d === "resident" || d === "id");
      if (!c.s.passport && docs.length && !isId) { c.say("pp_only"); c.hold(); return; }
      if (!c.s.passport) { passportGiven(c); return; }
      if (c.step === "scale" && c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      c.say("thanks_short");
    },
    give_ctx(c) {
      if (!c.s.passport) { passportGiven(c); return; }
      if (c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      c.say("thanks_short");
    },
    passport_q(c) {
      if (c.s.passport) { c.say("pp_have"); return; }
      // every reply answers its question (rule 11): "¿Le sirve mi tarjeta de residente?" is a yes, a license is not, and
      // "¿Necesita mi pase de abordar?" is not "Sí, su pasaporte"
      const w = words(c.heard);
      if (/residen/.test(w)) c.say("pp_resident_ok");
      else if (/licencia|\bine\b|credencial|\bo\b/.test(w)) c.say("pp_need");
      else if (/pase de abordar|boleto|reservacion|tarjeta de embarque/.test(w)) c.say("pp_only");
      else c.say("pp_yes");
      c.hold();
    },
    find_it(c) { c.say("g_take_time"); c.hold(); },
    bags_ans(c, slots, seg) {
      const tags: string[] = seg.tags || [];
      // once the bags are on the scale, a stray "una maleta" changes nothing
      if (c.s.bags !== undefined && (c.s.weighed || c.s.owShown) && c.step !== "bags") { c.say("ack"); return; }
      // "Las dos" / "Ambas" (the engine also hears a bare "dos" there) count bags only at the bag question (rule 4):
      // "Dos dos tres" at "¿A dónde viaja?" once recorded two bags
      if (tags.includes("two") && c.step !== "bags") { c.say("ack"); return; }
      const said = typeof slots.number === "number" ? slots.number : undefined;
      const n = tags.includes("pair") ? Math.max(said ?? 2, 2) : said ?? (tags.includes("two") ? (/tres/.test(fold(c.heard)) ? 3 : 2) : 1);
      if (n < 1 || n > 6) { expectBagCount(c); return; }
      setBags(c, n);
    },
    bags_num_ctx(c, slots) {
      const n = slots.n ? parseInt(slots.n, 10) : 1;
      if (!(n >= 1 && n <= 6)) { expectBagCount(c); return; }
      setBags(c, n);
    },
    bags_none(c) { setBags(c, 0); },
    bags_none_ctx(c) { setBags(c, 0); },
    packed_yes(c) { if (c.s.safetyKind === "packed" && !c.s.safetyDone) { c.s.safetyDone = true; c.say("packed_ok"); } else c.say("ack"); },
    packed_no(c) { if (c.s.safetyKind === "packed" && !c.s.safetyDone) { c.s.safetyDone = true; c.say("packed_follow_ok"); } else c.say("ack"); },
    battery_no(c) {
      if (c.s.safetyKind === "battery" && !c.s.safetyDone && c.s.bags > 0) { c.s.safetyDone = true; c.say("battery_ok"); return; }
      c.say("ack");
    },
    battery_no_ctx(c) { c.s.safetyDone = true; c.say("battery_ok"); },
    battery_yes_ctx(c) { c.say("ack"); },
    packed_yes_ctx(c, slots, seg) { checkin.handlers.packed_yes(c, slots, seg); },
    packed_no_ctx(c, slots, seg) { checkin.handlers.packed_no(c, slots, seg); },
    // volunteered outside the battery question: the rule, without a question nobody can answer
    battery_yes(c) { c.say(c.s.bags > 0 ? "battery_unsure" : "ack"); },
    powerbank_q(c) { c.say("powerbank_what"); },
    what_ctx(c) { c.say("powerbank_what"); },
    ack_done(c) {
      if (c.step === "scale" && c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      if (c.step === "bp") { c.s.moreDone = true; return; }
      c.say("ack");
    },
    g_ok(c) {
      if (c.step === "scale" && c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      if (c.step === "bp") { c.s.moreDone = true; return; }
      if (c.step === "hello") { c.s.hello = true; c.say("hello_great"); }
    },
    scale_where(c) { c.say("scale_where"); },
    move_items(c) {
      if (c.s.owShown && !c.s.owDone) { startMoving(c); return; }
      if (c.s.bags !== 0 && !c.s.weighed) { c.say("weigh_first"); return; }
      // the fee paid, the bag still weighs 27 ("Su maleta pesa menos de 25 kilos" was wrong); carry-on only, no bag
      if (c.s.feePaid) { c.say("fee_already"); return; }
      if (!c.s.bags) { c.say("ack"); return; }
      c.say(c.s.bags >= 2 ? "no_need_bags" : "no_need_bag");
    },
    move_items_ctx(c) { if (c.s.owShown && !c.s.owDone) startMoving(c); else c.say(c.s.feePaid ? "fee_already" : "nothing_to_pay"); },
    pay_fee(c) {
      if (c.s.owShown && !c.s.owDone) { startFee(c); return; }
      c.say(c.s.feePaid ? "fee_already" : "nothing_to_pay");
    },
    pay_fee_ctx(c) { if (c.s.owShown && !c.s.owDone) startFee(c); else c.say(c.s.feePaid ? "fee_already" : "nothing_to_pay"); },
    // "¿Puedo pagar con tarjeta?" while the overweight question is open = I'll pay the fee; after paying, not again
    // ("Hoy no tiene que pagar nada" after $600); before the bag is weighed (or asked about) the ways to pay, not "nothing
    // to pay" (the bag may be over)
    pay_card(c) {
      if (c.s.owShown && !c.s.owDone) { startFee(c); return; }
      c.say(c.s.feePaid ? "fee_already" : c.s.bags !== 0 && !c.s.weighed ? "pay_methods" : "nothing_to_pay");
    },
    pay_cash(c) {
      if (c.s.owShown && !c.s.owDone) { cashOk(c); return; }
      c.say(c.s.feePaid ? "fee_already" : c.s.bags !== 0 && !c.s.weighed ? "pay_methods" : "nothing_to_pay");
    },
    pay_other_ctx(c, _slots, seg) { if (c.s.owShown && !c.s.owDone) payOther(c, seg); else c.say(c.s.feePaid ? "fee_already" : "nothing_to_pay"); },
    // pesos only, as the town's other cashiers say; the open fee question is asked again by itself
    ask_dollars(c) {
      if (c.s.feePaid) { c.say("fee_already"); return; }
      c.say((c.s.owShown && !c.s.owDone) || (c.s.bags !== 0 && !c.s.weighed) ? "pesos_only" : "nothing_to_pay");
    },
    // the fee's receipt once it's paid; else the bag's claim tag (once the bag is checked); else nothing was paid
    ask_receipt(c) {
      if (c.s.feePaid && !/maleta|equipaje/.test(words(c.heard))) { c.say("fee_receipt"); return; }
      if (c.s.bags > 0 && (c.s.weighed || c.s.owDone)) { c.s.tagGiven = true; c.say(c.s.bags >= 2 ? "bag_tag_many" : "bag_tag"); return; }
      c.say(c.s.bags > 0 ? "weigh_first" : "nothing_to_pay");
    },
    lookup(c) {
      if (c.s.dest || c.s.passport) { c.say("flight_ack"); return; }
      c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); c.hold();
    },
    lookup_ctx(c, slots, seg) { checkin.handlers.lookup(c, slots, seg); },
    ask_fee(c) {
      // "Es muy caro" at the fee is a complaint, not a question: the choice again (moving things costs nothing)
      if (c.s.owShown && !c.s.owDone && /\bcaro\b|mucho dinero/.test(words(c.heard))) { c.say("ow_ask"); expectOverweight(c); return; }
      if (c.s.owShown && !c.s.owDone) { c.say("ow_fee_amount", { price: FEE }); return; }
      if (c.s.feePaid) { c.say("fee_already"); return; }
      // "¿Cuánto cuesta el sobrepeso?" with nothing over got "Su tarifa incluye una maleta… no tiene costo": the limit
      // before the scale, nothing to pay after it
      if (/sobrepeso|exceso|por kilo/.test(words(c.heard))) { c.say(c.s.weighed ? "nothing_to_pay" : "limit"); return; }
      c.say(c.s.bags >= 2 ? "bagfee_many" : "bagfee_info");
    },
    ask_over(c) {
      if (c.s.owShown && !c.s.owDone) { c.say("ow_over"); return; }
      if (c.s.weighed || c.s.owShown) { c.say("weight_is", { kg: c.s.kg }); return; }
      // "¿Cuánto pesa mi maleta?" before the scale got the limit: the bag is weighed first
      c.say(c.s.bags !== 0 ? "weigh_first" : "limit");
    },
    ask_limit(c) { c.say("limit"); },
    seat_ans(c, slots) {
      const pref = slots.seat as string;
      if (!c.s.passport) { c.s.seatPref = pref; c.say("seat_pref_" + pref); return; }
      assignSeat(c, pref);
    },
    seat_any(c) {
      // "Me da igual" / "Cualquiera" chooses a seat only when seats are the topic (at the overweight choice it booked an aisle seat)
      if (c.step !== "seat" && !/ventana|pasillo|medio|asiento|lugar/.test(fold(c.heard))) return;
      c.say("seat_any_ack");
      if (!c.s.passport) { c.s.seatPref = "any"; return; }
      assignSeat(c, "aisle");
    },
    seat_neg(c, slots) {
      const bad = slots.seat as string;
      // "No quiero en medio": "Claro. Entonces, ¿ventana o pasillo?", asked again as "Perdón, ¿ventana o pasillo?"
      if (bad === "middle") { seatWhich(c, "window", "aisle", "seat_neg_both"); return; }
      const other = bad === "window" ? "aisle" : "window";
      c.say(bad === "window" ? "seat_neg_window" : "seat_neg_aisle");
      ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["g_yesno", "seat"],
        suggest: [{ lt: "Agree or choose another seat", hint: "seat", options: "seat" }],
        yes: (cc) => { if (cc.s.passport) assignSeat(cc, other); else { cc.s.seatPref = other; cc.say("ack"); } },
        // both window and aisle refused: the middle seat is what's left
        no: (cc) => { seatNegMiddle(cc); },
        on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); },
          // "¿Pasillo?" — "No, en medio" (rule 10: it reads "no en medio"): the third seat, asked, not "¿ventana o pasillo?"
          seat_neg: (cc, sl) => { if (sl.seat === bad || sl.seat === other || !/^no\b/.test(words(cc.heard))) return false; seatWhich(cc, other, sl.seat); } },
        ask: (cc) => cc.say(bad === "window" ? "seat_neg_window" : "seat_neg_aisle") });
    },
    seat_amb(c, slots) {
      const a = slots.seat as string, b = slots.other as string;
      if (a === b) { checkin.handlers.seat_ans(c, { seat: a }, { intent: "seat_ans", slots: { seat: a }, tags: [] }); return; }
      seatWhich(c, a, b);
    },
    more_no(c) { if (c.step === "bp" || c.s.bpGiven) c.s.moreDone = true; else c.say("ack"); },
    more_q(c) { c.say("what_q"); c.hold(); },
    ask_ontime(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("ontime_yes"); },
    ask_delayed(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("delayed_no"); },
    ask_gate(c, _slots, seg) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say(seg.tags.includes("where") ? "gate_where" : "gate_is"); },
    ask_boarding_time(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("boarding_time"); },
    ask_security(c) { c.s.securityTold = true; c.say("security_dir"); },
    ask_duration(c, _slots, seg) { c.say(seg.tags.includes("arrive") ? "arrive" : "duration"); },
    ask_carryon(c, _slots, seg) { c.say(seg.tags.includes("must") ? "carryon_no" : "carryon_ok"); },
    ask_seatnum(c) {
      if (c.s.seatNo) { c.say("seatnum", { seat: c.s.seatNo }); return; }
      if (c.s.passport) c.ask("seat");
      else c.say("find_first");
    },
    // at the overweight choice it isn't free ("no tiene costo" contradicted the $600 just quoted)
    ask_bagfee(c) {
      if (c.s.owShown && !c.s.owDone) { c.say("ow_fee_amount", { price: FEE }); return; }
      if (c.s.feePaid) { c.say("fee_already"); return; }
      c.say(c.s.bags >= 2 ? "bagfee_many" : "bagfee_info");
    },
    // "¿Cuál es mi vuelo?" before the booking is found: Emilio looks it up with the passport
    ask_flightno(c, slots, seg) { if (!c.s.dest && !c.s.passport) { checkin.handlers.lookup(c, slots, seg); return; } c.say("flight_no"); },
    ask_direct(c) { c.say("direct"); },
    ask_liquids(c) { c.say("liquids"); },
    ask_pickup(c) { c.say("bag_pickup"); },
    seat_change(c) {
      if (!c.s.passport) { c.say("find_first"); return; }
      if (!c.s.seatNo) return; // the seat step asks its own question
      c.say("seat_any_ack"); c.say("ask_seat"); c.hold();
    },
    passport_none_ctx(c) { c.say("pp_need"); c.hold(); },
    ask_restroom(c) { c.say("restroom"); },
    // the open question (the seat step, or a seat question) is asked again by itself: saying it here asked it twice
    seat_rec(c) { c.say("seat_help"); },
  },

  finish: (c) => {
    c.complete();
    if (!c.s.securityTold) c.say("security_dir");
    c.say("bye_flight");
    ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // every hint construction
    { say: "Quisiera hacer el check-in.", intent: "checkin" },
    { say: "Vengo a documentar.", intent: "checkin" },
    { say: "Quisiera hacer el check-in para mi vuelo a la Ciudad de México.", intent: "checkin", slots: { city: "cdmx" } },
    { say: "A la Ciudad de México, por favor.", intent: "dest_ans", step: "dest", slots: { city: "cdmx" } },
    { say: "Vuelo a la Ciudad de México.", intent: "dest_ans", slots: { city: "cdmx" } },
    { say: "Voy a la Ciudad de México.", intent: "dest_ans", slots: { city: "cdmx" } },
    { say: "Aquí tiene.", intent: "give", step: "passport" },
    { say: "Aquí está mi pasaporte.", intent: "give", step: "passport" },
    { say: "Aquí tiene mi tarjeta de residente.", intent: "give", step: "passport" },
    { say: "¿Necesita mi pasaporte?", intent: "passport_q" },
    { say: "Solo una maleta.", intent: "bags_ans", step: "bags" },
    { say: "Solo esta.", intent: "bags_ans", step: "bags" },
    { say: "Voy a documentar una maleta.", intent: "bags_ans", step: "bags" },
    { say: "Dos maletas.", intent: "bags_ans", slots: { number: 2 } },
    { say: "No, solo traigo equipaje de mano.", intent: "bags_none", step: "bags" },
    { say: "Sí, yo mismo la hice.", intent: "packed_yes" },
    { say: "Sí, la hice yo.", intent: "packed_yes" },
    { say: "Mi cargador portátil está en mi mochila.", intent: "battery_no" },
    { say: "Sí, traigo un cargador portátil.", intent: "battery_yes" },
    { say: "¿Qué es un cargador portátil?", intent: "powerbank_q" },
    { say: "¿Así?", intent: "ack_done", step: "scale" },
    { say: "¿Dónde la pongo?", intent: "scale_where", step: "scale" },
    { say: "Voy a pasar unas cosas a mi equipaje de mano.", intent: "move_items" },
    { say: "¿Puedo sacar algunas cosas?", intent: "move_items" },
    { say: "Me pongo el suéter.", intent: "move_items" },
    { say: "Prefiero pagar el sobrepeso.", intent: "pay_fee" },
    { say: "¿Cuánto es?", intent: "ask_fee" },
    { say: "¿Por cuánto se pasa?", intent: "ask_over" },
    { say: "¿Cuál es el límite de peso?", intent: "ask_limit" },
    { say: "Listo.", intent: "ack_done", step: "scale" },
    { say: "¿Ya está bien?", intent: "ack_done", step: "scale" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card" },
    { say: "En efectivo, por favor.", intent: "pay_cash" },
    { say: "Ventana, por favor.", intent: "seat_ans", step: "seat", slots: { seat: "window" } },
    { say: "Quisiera un asiento de pasillo.", intent: "seat_ans", slots: { seat: "aisle" } },
    { say: "Prefiero ventana.", intent: "seat_ans", slots: { seat: "window" } },
    { say: "¿Me da pasillo, por favor?", intent: "seat_ans", slots: { seat: "aisle" } },
    { say: "Me da igual.", intent: "seat_any", step: "seat" },
    { say: "Cualquiera está bien.", intent: "seat_any", step: "seat" },
    { say: "¿El vuelo sale a tiempo?", intent: "ask_ontime" },
    { say: "¿Cuál es mi sala?", intent: "ask_gate" },
    { say: "¿Cuál es mi puerta?", intent: "ask_gate" },
    { say: "¿A qué hora empieza el abordaje?", intent: "ask_boarding_time" },
    { say: "¿Por dónde paso a seguridad?", intent: "ask_security" },
    { say: "¿Puedo llevar esta mochila conmigo?", intent: "ask_carryon" },
    { say: "¿Tengo que pagar por la maleta?", intent: "ask_bagfee" },
    { say: "Todo claro, gracias.", intent: "more_no", step: "bp" },
    // natural alternatives, short answers, accentless typing, tú to staff
    { say: "hola vengo a documentar mi maleta", intent: "checkin" },
    { say: "¿Aquí es el check-in para la Ciudad de México?", intent: "checkin", slots: { city: "cdmx" } },
    { say: "ciudad de mexico", intent: "dest_ans", step: "dest", slots: { city: "cdmx" } },
    { say: "Al DF", intent: "dest_ans", step: "dest", slots: { city: "cdmx" } },
    { say: "El vuelo 223 a la Ciudad de México", intent: "dest_ans", slots: { code: "223", city: "cdmx" } },
    { say: "Voy a Guadalajara", intent: "dest_ans", slots: { city: "guadalajara" } },
    { say: "Viajo a Narnia", intent: "dest_unknown" },
    { say: "No me acuerdo del número de vuelo", intent: "lookup" },
    { say: "Toma", intent: "give", step: "passport" },
    { say: "Una", intent: "bags_num_ctx", step: "bags" },
    { say: "Ninguna", intent: "bags_none_ctx", step: "bags" },
    { say: "Traigo tres maletas", intent: "bags_ans", slots: { number: 3 } },
    { say: "Mi esposa la hizo", intent: "packed_no" },
    { say: "Lo traigo en mi mochila", intent: "find_it", step: "passport", not: ["battery_yes", "give"] },
    { say: "Me pongo la chamarra", intent: "move_items" },
    { say: "Mejor saco los zapatos", intent: "move_items" },
    { say: "Ya saqué unas cosas", intent: "ack_done" },
    { say: "Pasillo, porque tengo las piernas largas", intent: "seat_ans", step: "seat", slots: { seat: "aisle" } },
    { say: "El de en medio está bien", intent: "seat_ans", step: "seat", slots: { seat: "middle" } },
    { say: "Dame ventana", intent: "seat_ans", step: "seat", slots: { seat: "window" } },
    { say: "¿El vuelo viene retrasado?", intent: "ask_delayed", not: ["ask_ontime"] },
    { say: "Sala 4, ¿verdad?", intent: "ask_gate" },
    { say: "¿Cuánto dura el vuelo?", intent: "ask_duration" },
    { say: "¿Cuál es mi asiento?", intent: "ask_seatnum" },
    { say: "¿Dónde están los sanitarios?", intent: "ask_restroom" },
    { say: "Es todo", intent: "more_no", step: "bp" },
    { say: "Perdón, mejor pasillo", intent: "seat_ans", step: "bp", slots: { seat: "aisle" } },
    // Spain forms are correct answers
    { say: "Quiero facturar mi maleta", intent: "checkin" },
    { say: "Voy a facturar una maleta", intent: "bags_ans", step: "bags" },
    { say: "Ventanilla, por favor", intent: "seat_ans", step: "seat", slots: { seat: "window" } },
    { say: "Ponme en la ventana", intent: "seat_ans", step: "seat", slots: { seat: "window" } },
    { say: "¿Dónde está el aseo?", intent: "ask_restroom" },
    { say: "Vale", intent: "yn:yes", step: "scale" },
    // meaning safety: no meaning may flip
    { say: "No voy a Guadalajara", intent: "dest_neg", not: ["dest_ans"] },
    { say: "No quiero ir a Guadalajara", intent: "dest_neg", step: "dest", not: ["dest_ans"] },
    { say: "No tengo pasaporte", intent: "passport_none_ctx", step: "passport", not: ["give", "give_ctx"] },
    { say: "No voy a documentar nada", intent: "bags_none", step: "bags", not: ["bags_ans"] },
    { say: "Nada más esta mochila", intent: "bags_none", step: "bags", not: ["bags_ans"] },
    { say: "No la hice yo", intent: "packed_no", not: ["packed_yes"] },
    { say: "No traigo un cargador portátil", intent: "battery_no", not: ["battery_yes"] },
    { say: "No quiero pagar el sobrepeso", intent: "none", not: ["pay_fee"] },
    { say: "No quiero sacar nada", intent: "none", not: ["move_items"] },
    { say: "No quiero ventana", intent: "seat_neg", step: "seat", not: ["seat_ans"] },
    { say: "Cualquiera menos en medio", intent: "seat_neg", step: "seat", not: ["seat_ans", "seat_any"] },
    { say: "No me gusta el pasillo", intent: "seat_neg", step: "seat", not: ["seat_ans"] },
    { say: "No quiero hacer el check-in", intent: "none", not: ["checkin"] },
    { say: "No tengo tarjeta", intent: "none", step: "scale", not: ["pay_card", "give"] },
    { say: "No puedo levantarla", intent: "none", step: "scale", not: ["ack_done", "give"] },
    // review: traps and gaps
    { say: "No voy a Guadalajara, voy a la Ciudad de México", intent: "dest_ans", step: "dest", slots: { city: "cdmx" }, not: ["dest_neg"] },
    { say: "A Guadalajara no, a la Ciudad de México", intent: "dest_ans", step: "dest", slots: { city: "cdmx" }, not: ["dest_neg"] },
    { say: "Tengo el vuelo de las ocho y diez", intent: "dest_ans", step: "dest" },
    { say: "Pasillo no, ventana", intent: "seat_amb", step: "seat", not: ["seat_ans", "seat_neg"] },
    { say: "Ventana no pasillo", intent: "seat_amb", step: "seat", not: ["seat_ans", "seat_neg"] },
    { say: "Una grande y una chica", intent: "bags_ans", step: "bags" },
    { say: "No, solo tengo una pregunta", intent: "more_q", step: "bp", not: ["more_no"] },
    { say: "No, solo una pregunta", intent: "more_q", step: "bp", not: ["more_no", "bags_ans", "bags_num_ctx"] },
    { say: "Sí, tengo otra pregunta", intent: "more_q", step: "bp", not: ["battery_yes", "battery_yes_ctx"] },
    { say: "¿Es aquí para el vuelo a México?", intent: "checkin", step: "hello" },
    { say: "Un momento, lo estoy buscando", intent: "find_it", step: "passport" },
    { say: "Voy a sacar unas cosas y meterlas en mi mochila", intent: "move_items" },
    { say: "Ni modo, lo pago", intent: "pay_fee" },
    { say: "¿Cuál es el número de mi asiento?", intent: "ask_seatnum", step: "bp" },
    { say: "¿A qué hora llegamos?", intent: "ask_duration", step: "bp" },
    // lead's check: numbers, the o/a slip, payment and seat refusals
    { say: "Tomo el vuelo de las ocho y diez", intent: "dest_ans", step: "dest", slots: { time: { h: 8, m: 10 } }, not: ["give", "give_ctx"] },
    { say: "Sí, tomo el vuelo a la Ciudad de México", intent: "dest_ans", step: "hello", slots: { city: "cdmx" }, not: ["give"] },
    { say: "El vuelo dos dos tres", intent: "dest_ans", step: "dest", slots: { code: "223" }, not: ["bags_ans", "bags_num_ctx"] },
    { say: "Vuelo dos veintitrés a la Ciudad de México", intent: "dest_ans", step: "dest", slots: { code: "223", city: "cdmx" } },
    { say: "Mi vuelo es el veintidós tres", intent: "dest_ans", step: "dest", slots: { code: "223" } },
    { say: "El vuelo de las nueve", intent: "dest_ans", step: "dest", slots: { time: { h: 9, m: 0 } } },
    { say: "Mi vuelo sale a las ocho y diez", intent: "dest_ans", step: "dest", slots: { time: { h: 8, m: 10 } } },
    { say: "Tengo el pasaporte en la mochila", intent: "find_it", step: "passport", not: ["give", "give_ctx"] },
    { say: "¿Le sirve mi tarjeta de residente?", intent: "passport_q", step: "passport" },
    { say: "No, yo no la hice", intent: "packed_no", not: ["packed_yes"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", not: ["pay_card"] },
    { say: "No en efectivo, con tarjeta", intent: "pay_card", not: ["pay_cash"] },
    { say: "Me da igual, pero no en medio", intent: "seat_neg", step: "seat", not: ["seat_any", "seat_ans"] },
    { say: "Pasillo o ventana, me da igual", intent: "seat_any", step: "seat", not: ["seat_ans"] },
    { say: "No, ventana no, pasillo", intent: "seat_amb", step: "seat", not: ["seat_neg", "seat_ans"] },
    { say: "No pasillo, ventana", intent: "seat_ans", step: "seat", slots: { seat: "window" }, not: ["seat_neg"] },
    { say: "¿La sala 4?", intent: "ask_gate", step: "bp" },
    { say: "¿El vuelo sale a las ocho?", intent: "ask_boarding_time", step: "bp" },
    { say: "Cinco maletas", intent: "bags_ans", step: "bags", slots: { number: 5 } },
    { say: "El de las ocho y diez", intent: "dest_ctx", step: "dest", slots: { time: { h: 8, m: 10 } } },
    { say: "El de las siete y media", intent: "none" },
    { say: "¿Ventana o pasillo?", intent: "seat_rec", step: "seat", not: ["seat_ans"] },
    // audit (5 Nov 2026): side questions, the fee once paid, refusals
    { say: "¿Dónde está la sala 4?", intent: "ask_gate", step: "bp", slots: { number: 4 } },
    { say: "¿Cómo llego a la sala?", intent: "ask_gate", step: "bp" },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", not: ["pay_cash", "pay_card", "give"] },
    { say: "Solo traigo dólares", intent: "ask_dollars", not: ["pay_cash", "give"] },
    { say: "¿Me da un recibo?", intent: "ask_receipt", step: "bp" },
    { say: "¿Me da el comprobante de mis maletas?", intent: "ask_receipt", step: "bp" },
    { say: "¿Cuál es el número de mi vuelo?", intent: "ask_flightno", step: "bp", not: ["ask_seatnum", "ask_gate"] },
    { say: "¿Es un vuelo directo?", intent: "ask_direct", step: "bp" },
    { say: "¿Hace escala?", intent: "ask_direct", step: "bp" },
    { say: "¿Puedo llevar líquidos en la mochila?", intent: "ask_liquids", not: ["ask_carryon", "move_items"] },
    { say: "¿Tengo que documentar la mochila?", intent: "ask_carryon", step: "bags", not: ["checkin", "bags_ans", "bags_none"] },
    { say: "¿Cuántas maletas puedo llevar?", intent: "ask_bagfee", step: "bags", not: ["bags_ans", "bags_num_ctx"] },
    { say: "¿Tiene terminal?", intent: "pay_card" },
    { say: "¿Dónde recojo mi maleta?", intent: "ask_pickup", step: "bp", not: ["bags_ans"] },
    { say: "¿Puedo cambiar de asiento?", intent: "seat_change", step: "bp", not: ["seat_ans", "seat_any"] },
    { say: "No traigo mi pasaporte", intent: "passport_none_ctx", step: "passport", not: ["give", "give_ctx", "find_it"] },
    { say: "No tengo pasaporte, pero tengo mi tarjeta de residente", intent: "give", step: "passport", slots: { doc: "resident" } },
    { say: "Sí, la empaqué yo sola", intent: "packed_yes", not: ["packed_no"] },
    { say: "No quiero cambiar de asiento", intent: "none", step: "bp", not: ["seat_change"] },
    { say: "No traigo líquidos", intent: "none", step: "bp", not: ["ask_liquids"] },
    // not understood
    { say: "Mi perro come tacos en la playa", intent: "none" },
    { say: "Quiero un café con leche", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["Hola, quisiera hacer el check-in.", "A la Ciudad de México.", "Aquí está mi pasaporte.", "Solo una maleta.", "Ventana, por favor.", "No, es todo, gracias."],
      expect: { complete: true, state: { seat: "window", dest: "cdmx" } }, auto: AUTO, setup: (s) => { s.overweight = false; s.noWindow = false; } },
    { name: "all at once, then questions", turns: ["Hola, voy a la Ciudad de México y traigo una maleta. Aquí tiene mi pasaporte.", "Quisiera un asiento de pasillo, por favor.",
      "¿El vuelo sale a tiempo?", "¿Por dónde paso a seguridad?", "Es todo, gracias."],
      expect: { complete: true, state: { seat: "aisle", bags: 1, securityTold: true } }, auto: AUTO, setup: (s) => { s.overweight = false; } },
    // wrong city first, two bags (overweight fee), a seat refused, then a change of mind after the boarding pass
    { name: "wrong city, overweight fee, change of seat", turns: ["Voy a Guadalajara.", "Ah, sí, perdón, a la Ciudad de México.", "Aquí tiene.", "Dos maletas.",
      "No quiero ventana.", "Sí.", "Perdón, mejor ventana.", "¿A qué hora empieza el abordaje?", "No, es todo."],
      expect: { complete: true, state: { bags: 2, feePaid: true, seat: "window" } },
      auto: { ...AUTO, overweight: "Prefiero pagar el sobrepeso.", fee: "Aquí tiene mi tarjeta." },
      setup: (s) => { s.overweight = true; s.noWindow = false; s.greetKind = "plain"; } },
    { name: "don't know the destination, no bags", turns: ["No sé.", "Aquí está.", "No, solo traigo equipaje de mano.", "Me da igual.", "¿Cuál es el límite de peso?", "Es todo."],
      expect: { complete: true, state: { bags: 0, lookup: true } }, auto: { ...AUTO, dest: "" }, setup: (s) => { s.greetKind = "plain"; } },
    // twist: 2 kilos over, the learner asks the price and moves things to the carry-on
    { name: "twist: overweight, move things", turns: ["Buenos días, vengo a documentar.", "A la Ciudad de México.", "Aquí tiene.", "Una maleta.", "Claro.", "¿Cuánto es?",
      "Mejor saco unas cosas.", "Listo, ¿y ahora?", "Pasillo, por favor.", "¿Cuál es mi sala?", "No, es todo."],
      expect: { complete: true, state: { owDone: true, weighed: true, seat: "aisle" } }, auto: AUTO, setup: (s) => { s.overweight = true; s.noWindow = false; s.askSafety = false; } },
    // twist: no window seats left; the learner refuses the aisle and takes the middle seat
    { name: "twist: no window seats", turns: ["Hola, quisiera hacer el check-in para mi vuelo a la Ciudad de México.", "Aquí está mi pasaporte.", "Solo una maleta.", "Ventana, por favor.",
      "No, gracias.", "Sí, está bien.", "¿Cuál es mi asiento?", "Es todo, gracias."],
      expect: { complete: true, state: { seat: "middle", windowTaken: true } }, auto: AUTO, setup: (s) => { s.noWindow = true; s.overweight = false; } },
    // twist: a power bank in the checked bag
    { name: "twist: a power bank in the bag", turns: ["Hola, vengo a documentar.", "A la Ciudad de México.", "Tenga.", "Solo una maleta.", "Sí, traigo un cargador portátil.",
      "Claro, ahorita lo saco.", "Pasillo.", "Es todo."],
      expect: { complete: true, state: { safetyDone: true, seat: "aisle" } }, auto: AUTO,
      setup: (s) => { s.askSafety = true; s.safetyKind = "battery"; s.overweight = false; s.noWindow = false; } },
    // short answers all the way
    { name: "short answers", turns: ["Sí.", "Ciudad de México.", "Tenga.", "Sí.", "Una.", "Pasillo.", "No, gracias."],
      expect: { complete: true, state: { seat: "aisle", bags: 1 } }, auto: AUTO,
      setup: (s) => { s.greetKind = "checkin"; s.overweight = false; s.askSafety = false; s.bagsQ = "yn"; } },
    // review: a refusal at the fee ("ya no quiero pagar" must not pay), a lost comma at the seat, "solo una pregunta"
    { name: "review: fee refused, seat said without commas", turns: ["Hola, quisiera hacer el check-in.", "A la Ciudad de México.", "Aquí tiene.", "Una maleta.", "Claro.",
      "¿Aceptan efectivo?", "No, ya no quiero pagar.", "Listo.", "Pasillo no, ventana.", "Ventana.", "No, solo una pregunta.", "¿A qué hora llegamos?", "No, es todo."],
      expect: { complete: true, state: { seat: "window", kg: 24, owDone: true } }, auto: AUTO,
      setup: (s) => { s.overweight = true; s.askSafety = false; s.noWindow = false; s.greetKind = "plain"; } },
    // review: "¿Cuántas?" answered "Sí", two bags described, someone else packed them
    { name: "review: bag count, packed by someone else", turns: ["Buenos días, vengo a documentar.", "No voy a Guadalajara, voy a la Ciudad de México.", "Tenga.", "Sí.", "Sí.",
      "Una grande y una chica.", "No, mi esposa.", "Sí.", "Me da igual.", "Es todo."],
      expect: { complete: true, state: { bags: 2, safetyDone: true, seat: "aisle" } }, auto: AUTO,
      setup: (s) => { s.greetKind = "plain"; s.bagsQ = "yn"; s.askSafety = true; s.safetyKind = "packed"; s.overweight = false; s.noWindow = false; } },
    // review: the power bank is in the backpack (no twist), then a power bank refused once and moved
    { name: "review: battery in the backpack", turns: ["Hola, vengo a documentar.", "Voy a la Ciudad de México.", "Aquí está mi pasaporte.", "Solo una maleta.",
      "En la maleta no, la batería la traigo en la mochila.", "Pasillo.", "No, es todo."],
      expect: { complete: true, state: { safetyDone: true, seat: "aisle" } }, auto: AUTO,
      setup: (s) => { s.askSafety = true; s.safetyKind = "battery"; s.overweight = false; s.noWindow = false; s.greetKind = "plain"; } },
    { name: "review: power bank refused once", turns: ["Hola, vengo a documentar.", "A la Ciudad de México.", "Tenga.", "Solo una maleta.", "Sí, traigo uno.", "No.", "Bueno, sí.",
      "Ventana.", "Es todo."],
      expect: { complete: true, state: { safetyDone: true, seat: "window" } }, auto: AUTO,
      setup: (s) => { s.askSafety = true; s.safetyKind = "battery"; s.overweight = false; s.noWindow = false; s.greetKind = "plain"; } },
    // lead's check: "tomo" is not "tome", a wrong flight time, a license, the card handed over at the overweight choice,
    // "No tengo tarjeta" offers cash (nothing paid until the yes)
    { name: "lead: wrong time, license, card at the choice", turns: ["Tomo el vuelo de las nueve.", "Aquí tiene mi licencia.", "Aquí está mi pasaporte.", "Una maleta.",
      "Aquí está.", "Aquí tiene mi tarjeta.", "No tengo tarjeta.", "Sí.", "Pasillo, por favor.", "Es todo."],
      expect: { complete: true, state: { timeTold: true, feePaid: true, payCash: true, seat: "aisle" } }, auto: AUTO,
      setup: (s) => { s.overweight = true; s.askSafety = false; s.noWindow = false; s.greetKind = "plain"; s.bagsQ = "n"; } },
    // lead's check: the flight number digit by digit, "Ya no quiero sacar nada" (no re-weighing, no charge), "No, en medio"
    // at "¿Le doy uno de pasillo?" (the middle seat, asked), never the aisle
    { name: "lead: digits, a refusal while moving, no window", turns: ["Hola, quisiera hacer el check-in.", "El vuelo dos dos tres.", "Aquí tiene.", "Una maleta.",
      "Aquí está.", "Mejor saco unas cosas.", "Ya no quiero sacar nada.", "No, gracias.", "Voy a pasar unas cosas a mi equipaje de mano.", "Listo.", "Ventana.",
      "No, en medio.", "Sí.", "Es todo."],
      expect: { complete: true, state: { seat: "middle", kg: 24, owDone: true, feePaid: undefined, windowTaken: true } }, auto: AUTO,
      setup: (s) => { s.overweight = true; s.noWindow = true; s.askSafety = false; s.greetKind = "plain"; s.bagsQ = "n"; } },
    // audit: no passport (the resident card instead), side questions the learner may ask, the fee in cash asked again
    // after a side question ("Son $600, por favor", not "Acerque su tarjeta"), window and aisle refused (the middle
    // seat offered), the fee's receipt, where the gate is
    { name: "audit: side questions, cash fee, both seats refused", turns: ["A la Ciudad de México.", "No traigo mi pasaporte.",
      "Aquí tiene mi tarjeta de residente.", "¿Tengo que documentar la mochila?", "Una maleta.", "¿Cuánto pesa mi maleta?", "Aquí está.", "¿Aceptan dólares?",
      "Lo pago.", "En efectivo.", "¿Dónde está el baño?", "Aquí tiene.", "No quiero ventana.", "No.", "Sí.", "¿Me da un recibo?", "¿Dónde está la sala 4?",
      "¿Es un vuelo directo?", "Es todo."],
      expect: { complete: true, state: { feePaid: true, payCash: true, seat: "middle", bags: 1 } }, auto: AUTO,
      setup: (s) => { s.overweight = true; s.noWindow = false; s.askSafety = false; s.greetKind = "plain"; s.bagsQ = "yn"; } },
  ],
};

export default checkin;
