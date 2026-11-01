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

const NUM_WORD: Record<number, { en: string; lt: string; say: string }> = {
  2: { en: "Dos", lt: "Two", say: "Dos" },
  3: { en: "Tres", lt: "Three", say: "Tres" },
  4: { en: "Cuatro", lt: "Four", say: "Cuatro" },
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
  L("sweater", ["sueter", "sueteres", "sudadera", "sudaderas", "chamarra", "chamarras", "chaqueta", "chaquetas", "abrigo", "chaleco", "rompevientos"]),
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
const plainAck = (heard: string) =>
  /^\s*(ok|okey|vale|sale|va|bueno|muy bien|perfecto|listo|claro|gracias|muchas gracias|esta bien)\b/.test(fold(heard)) && !/pregunta|duda/.test(fold(heard));

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
    id: "dest_confirm", optional: true, expects: ["dest_ans", "affirm", "deny"], hints: ["confirm"],
    suggest: [{ lt: "Confirm you're flying to Mexico City", hint: "confirm" }],
    yes: (cc) => { cc.s.dest = "cdmx"; cc.say("ack"); },
    no: (cc) => { cc.s.lookup = true; cc.say("check_passport"); },
    on: { dest_ans: (cc, sl) => {
      if (sl.city && sl.city !== "cdmx") { cc.say("dest_only_cdmx"); expectDestConfirm(cc); return; }
      cc.s.dest = "cdmx"; cc.say("ack");
    } },
    ask: (cc) => cc.say("dest_confirm_q"),
  });
}

function setFlight(c: Ctx, n: number) {
  c.s.hello = true;
  const T = turn(c);
  if (T.destDone) return;
  T.destDone = true;
  c.s.dest = "cdmx";
  c.say(n === 223 ? "flight_ack" : "flight_wrong");
}

function passportGiven(c: Ctx) {
  c.s.passport = true;
  c.s.hello = true;
  c.say("pp_thanks");
  const lookup = !c.s.dest || c.s.lookup;
  c.s.dest = "cdmx";
  c.say(lookup ? "found_lookup" : "found_booking");
}

function weigh(c: Ctx) {
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
    id: "overweight", expects: ["move_items", "move_items_ctx", "pay_fee", "pay_fee_ctx", "pay_card", "pay_cash", "ask_fee", "ask_over", "ask_limit"],
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
    },
    yes: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    no: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    ask: (cc) => cc.say("ow_ask"),
  });
}

function startMoving(c: Ctx) { c.say("ow_move_ok"); expectMoving(c); }
function expectMoving(c: Ctx) {
  ask(c, {
    id: "moving", expects: ["ack_done", "give", "give_ctx", "move_items"], hints: ["moving"],
    suggest: [{ lt: "Say you've moved the things", hint: "moving" }],
    on: {
      ack_done: (cc) => { reweigh(cc); },
      give: (cc) => { reweigh(cc); },
      give_ctx: (cc) => { reweigh(cc); },
      g_ok: (cc) => { reweigh(cc); },
      move_items: (cc) => { reweigh(cc); },
      pay_fee: (cc) => { startFee(cc); },
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

function startFee(c: Ctx) { c.say("ow_fee_card", { price: FEE }); expectFee(c); }
function cashOk(c: Ctx) { c.s.payCash = true; c.say("ow_cash_ok", { price: FEE }); expectFee(c); }
function expectFee(c: Ctx) {
  const paid = (cc: Ctx) => {
    if (cc.s.feePaid) return;
    cc.s.owDone = true; cc.s.weighed = true; cc.s.feePaid = true;
    cc.event("pay", { method: cc.s.payCash ? "cash" : "card", amount: FEE });
    cc.say("ow_fee_paid");
  };
  ask(c, {
    id: "fee", expects: ["give", "give_ctx", "pay_card", "pay_cash", "ack_done", "move_items"], hints: ["fee"],
    suggest: [{ lt: "Pay by card or in cash", hint: "fee" }, { lt: "Move things after all", hint: "ow_move" }],
    on: {
      give: (cc) => { paid(cc); }, give_ctx: (cc) => { paid(cc); }, ack_done: (cc) => { paid(cc); }, g_ok: (cc) => { paid(cc); },
      pay_fee: (cc) => { paid(cc); }, pay_fee_ctx: (cc) => { paid(cc); },
      pay_card: (cc) => { cc.s.payCash = false; paid(cc); },
      pay_cash: (cc) => { if (cc.s.payCash) { paid(cc); return; } cashOk(cc); },
      move_items: (cc) => { startMoving(cc); },
      move_items_ctx: (cc) => { startMoving(cc); },
    },
    yes: (cc) => { paid(cc); },
    no: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    ask: (cc) => cc.say("ow_fee_ask"),
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
      seat_neg: (cc, sl) => { if (sl.seat === "aisle") expectMiddle(cc); else assignSeat(cc, "aisle"); },
    },
    ask: (cc) => cc.say("no_window_q"),
  });
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
    yes: (cc) => { setBags(cc, 1); },
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
    id: "packed", expects: ["packed_yes", "packed_no"], hints: ["packed"],
    suggest: [{ lt: "Say you packed it yourself", hint: "packed" }],
    yes: ok, no: follow,
    on: { packed_yes: (cc) => { ok(cc); }, packed_no: (cc) => { follow(cc); } },
    ask: (cc) => cc.say(cc.s.bags >= 2 ? "ask_packed_many" : "ask_packed"),
  });
}

function expectBattery(c: Ctx) {
  const none = (cc: Ctx) => { cc.s.safetyDone = true; cc.say("battery_ok"); };
  const has = (cc: Ctx) => {
    cc.twist("power_bank");
    cc.say("battery_move");
    ask(cc, { id: "battery_move", expects: ["ack_done", "give", "give_ctx"], hints: ["g_yesno"], suggest: [{ lt: "Agree to move it", hint: "g_yesno" }],
      yes: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      no: (c3) => { c3.say("battery_must"); has(c3); },
      on: {
        ack_done: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        give: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        give_ctx: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        g_ok: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      },
      ask: (c3) => c3.say("battery_move_q") });
  };
  ask(c, {
    id: "battery", expects: ["battery_no", "battery_no_ctx", "battery_yes", "powerbank_q", "what_ctx"], hints: ["battery"],
    suggest: [{ lt: "Say whether there are batteries in the bag", hint: "battery" }],
    yes: has, no: none,
    on: {
      battery_no: (cc) => { none(cc); },
      battery_no_ctx: (cc) => { none(cc); },
      battery_yes: (cc) => { has(cc); },
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
      "{number} @city_to",
      "[es] el vuelo de {time} [@city_to] #time",
      "@city_to (de ida | solo de ida | redondo | de ida y vuelta | por trabajo | de vacaciones | por negocios)",
      "(perdon | disculpe) [quise decir | quiero decir] [a] {city}",
      "(quise decir | quiero decir | digo | mejor dicho) [a] {city}",
      "{city} (es mi destino | es correcto)",
    ] },
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
      "(olvide | se me olvido) (el numero de vuelo | el numero | mi destino | el destino)",
    ] },
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
      "donde (esta | deje | puse) mi pasaporte", "(lo | la) (tengo | traigo) en (mi | la) (mochila | bolsa | bolsa de mano)",
    ] },
    bags_ans: { patterns: [
      "(solo | nada mas | nomas | solamente) una [maleta | valija] #h:bags_one #one",
      "(solo | nada mas | nomas | solamente) (esta | esta maleta | esta de aqui | esta grande | la grande | mi maleta) #h:bags_this #one",
      "(voy a documentar | documento | quiero documentar | quisiera documentar | voy a facturar | facturo | quiero facturar) {number} [@bagword] #h:bags_checking",
      "(voy a documentar | documento | quiero documentar | voy a facturar | facturo) (esta | esta maleta | mi maleta | la maleta | esta de aqui) #one",
      "{number} @bagword [para documentar] #h:bags_two",
      "(traigo | tengo | llevo | son | voy a llevar | voy a mandar) {number} @bagword [para documentar]",
      "[traigo | tengo | llevo] {number} @bagword y [una | mi | un] (mochila | equipaje de mano | maleta de mano | bolsa | backpack | mochila de mano)",
      "(esta maleta | esta de aqui | la grande | esta grande | la maleta grande) [nada mas | nomas | solamente] #one",
      "(las dos | ambas | estas dos | los dos | las tres) #two",
      "{number} [@bagword] [una] (grande | mediana | chica | pequena) y [una | otra] (grande | mediana | chica | pequena)",
    ] },
    // a bare number answers "¿Cuántas?" / "¿Documenta equipaje?" only there
    bags_num_ctx: { patterns: ["[solo | nada mas | nomas] {n:bagnum} [nada mas | nomas]", "{n:bagnum} de ellas"] },
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
      "[si] yo (mismo | misma) (la hice | la empaque | las hice | la prepare | hice mi maleta) #h:packed_yes",
      "[si] (la | las) (hice | empaque | prepare | arme) (yo | yo mismo | yo misma) #h:packed_did",
      "[si] (yo | yo mismo | yo misma) (la | las) (hice | empaque | prepare | arme)",
      "[si] yo (mismo | misma)", "[si] (la hice | la empaque | las hice) [sola | solo]", "si es mi maleta",
    ] },
    packed_no: { patterns: [
      "(mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | mi familia | mi hermana | mi hermano) (la hizo | me ayudo | me la hizo | la empaco | las hizo)",
      "(la hizo | las hizo | la empaco) (mi esposa | mi esposo | mi mama | mi pareja | mi novia | mi novio | un amigo | una amiga | mi hijo | mi hija | otra persona | alguien mas)",
      "no (la | las) hice yo", "no (la | las) hice", "me (ayudaron | ayudo alguien)",
    ] },
    battery_no: { patterns: [
      "no (traigo | llevo | tengo | hay | lleva) [ningun | ninguna | ningunas | ningunos | un | una | unas | unos] @batt [en (la maleta | ella | mi maleta)]",
      "(mi | el | la) (cargador portatil | power bank | bateria portatil | cargador | bateria) (esta | va) @in_carry #h:battery_carryon_x",
      "(mis | las | los) (baterias | pilas | cargadores) (estan | van) @in_carry",
      "[no] (ningun | ninguna) @batt",
    ] },
    // "Lo traigo en mi mochila", "Nada de eso", "Solo ropa": answers to the battery question only
    battery_no_ctx: { patterns: [
      "[no] no (traigo | llevo | tengo) nada (de eso | asi | parecido) #h:battery_no",
      "(lo | la | los | las) (traigo | llevo | tengo) @in_carry #h:battery_carryon",
      "(esta | estan | va | van) @in_carry",
      "[no] (nada | ninguno | ninguna) [de eso]",
      "[no] (solo | nada mas | nomas) (ropa | mi ropa | ropa y zapatos | el cargador del celular | un cargador | cables | libros | zapatos)",
      "[no] no (traigo | llevo)", "[no] no (lo | la | los | las) (traigo | llevo | tengo) [en la maleta]",
    ] },
    battery_yes: { patterns: [
      "[si] (traigo | llevo | tengo | hay | creo que traigo | creo que tengo | creo que hay) (un | una | mi | unas | unos | dos) @batt [en (la maleta | ella | mi maleta)] #h:battery_yes",
      "[si] (un | una | mi) (cargador portatil | power bank | bateria portatil | bateria externa)",
      "si (traigo | tengo | llevo) (uno | una)",
      "(hay | traigo | va) (una laptop | mi laptop | una computadora | mi computadora | una camara | una tableta) en (la maleta | ella)",
    ] },
    powerbank_q: { patterns: [
      "que es (un | una | el | la) (power bank | cargador portatil | bateria portatil | bateria de litio | bateria externa) #h:q_powerbank",
      "que (significa | quiere decir) (power bank | cargador portatil | bateria portatil)",
      "(a que | que) se refiere con (power bank | cargador portatil | bateria portatil)",
    ] },
    what_ctx: { patterns: ["que es (eso | esto)", "a que se refiere", "como que"] },
    ack_done: { patterns: [
      "(listo | lista | ya esta | ya quedo | ya termine | termine | ya acabe) #h:moving_done",
      "asi #h:scale_like_this",
      "(y ahora | que tal ahora | y asi | asi esta bien) #h:moving_now",
      "ya (esta bien | pesa menos | se ve bien) [ahora] #h:moving_ok",
      "(ya | ahora) (pesa | va a pesar) menos", "ya (la | lo | las) (puse | subi) [en la bascula]",
      "ya (saque | pase | movi | cambie | quite) (@things | lo | la | los | las)",
      "(ahorita | ya | enseguida) (lo | la | los) (saco | cambio | paso | quito | cambie | saque | pase)",
      "(ya | ahora) (deberia | debe) (estar bien | pesar menos)",
    ] },
    scale_where: { patterns: [
      "donde (la | lo | las | los) (pongo | subo | dejo | coloco) #h:scale_where_h", "donde (esta | queda) la bascula", "(en | sobre) la bascula", "aqui en la bascula",
    ] },
    move_items: { patterns: [
      "(voy a | puedo | dejeme | dejame | quiero | prefiero | mejor) (pasar | cambiar | mover | poner | meter) @things (a | en) @carry #h:ow_move",
      "(paso | cambio | muevo | meto | pongo) @things (a | en) @carry",
      "(puedo | voy a | dejeme | dejame | prefiero | mejor) (sacar | quitar) @things [de la maleta] #h:ow_take_out",
      "(mejor | entonces) (saco | quito) @things [de la maleta]", "(saco | quito) @things [de la maleta]",
      "(me pongo | me voy a poner | voy a ponerme | puedo ponerme | mejor me pongo) @things #h:ow_wear",
      "(voy a | puedo | dejeme | dejame) (reacomodar | acomodar | arreglar) (la maleta | mi maleta | las cosas)",
      "(es | esta) (muy | demasiado) caro (mejor | entonces | asi que) (saco | paso | quito) @things [(a | en) @carry]",
      "(prefiero | mejor) (sacar | pasar) (cosas | algo)",
    ] },
    // "No quiero pagar": a refusal of the fee only while the overweight question is open
    move_items_ctx: { patterns: [
      "no (quiero | voy a) pagar [el sobrepeso | el cargo | eso | extra | tanto | el exceso]", "(prefiero | mejor) no pagar [el sobrepeso | eso]",
    ] },
    pay_fee: { patterns: [
      "(prefiero | quiero | voy a | mejor | puedo) pagar [el | ese] (sobrepeso | cargo | exceso | extra) #h:ow_pay",
      "(pago | mejor pago) [el | ese] (sobrepeso | cargo | exceso | extra)",
      "(lo pago | se lo pago | mejor lo pago | prefiero pagarlo | voy a pagarlo | lo voy a pagar | mejor pago)",
      "(prefiero | mejor) pagar", "(esta bien | bueno) [lo] pago",
    ] },
    // "No quiero sacar nada": then the fee, only while the overweight question is open
    pay_fee_ctx: { patterns: [
      "no (quiero | voy a) (sacar | mover | pasar | abrir) (nada | la maleta | mi maleta)", "(prefiero | mejor) no (sacar | abrir) [nada | la maleta]",
    ] },
    pay_card: { patterns: [
      "[puedo] pagar con tarjeta #h:fee_card", "(pago | puedo pagar | quiero pagar) con (tarjeta | tarjeta de credito | tarjeta de debito | mi tarjeta)",
      "con (tarjeta | tarjeta de credito | tarjeta de debito | mi tarjeta)", "tarjeta", "(aceptan | acepta | reciben) tarjeta",
      "(puedo pagar | pago) con (el celular | apple pay | google pay)",
    ] },
    pay_cash: { patterns: [
      "en efectivo #h:fee_cash", "[puedo] pagar en efectivo", "(pago | quiero pagar | prefiero pagar) en efectivo", "efectivo",
      "(aceptan | acepta | reciben) efectivo", "solo (tengo | traigo) efectivo", "(pago | puedo pagar) con (efectivo | dinero | billetes)",
    ] },
    ask_fee: { patterns: [
      "cuanto (es | cuesta | seria | sale | cobran) [el sobrepeso | el cargo | eso | el exceso] #h:ow_how_much",
      "cuanto (tengo que | hay que) pagar", "cuanto (le debo | es el cargo | cobran por el sobrepeso | cobran por kilo)",
      "(es | esta) (muy | demasiado) caro",
    ] },
    ask_over: { patterns: [
      "(por cuanto | cuanto) (se pasa | me paso | esta pasada | pasa) [del limite] #h:ow_over", "cuanto pesa [mi maleta | la maleta]",
      "(esta | pesa) (muy | demasiado) (pesada | pesado)", "(se pasa | me pase | esta pasada) [del peso | del limite]", "cuantos kilos (pesa | son | tiene)",
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
    ] },
    seat_any: { patterns: [
      "me da igual #h:seat_either",
      "(cualquiera | cualquier asiento | cualquier lugar | lo que sea | el que sea | donde sea) [esta bien | me sirve] #h:seat_either2",
      "no (importa | me importa)", "no tengo preferencia", "(ventana o pasillo | cualquiera de los dos) (me da igual | da igual | no importa)",
      "lo que tenga [disponible]", "(el que | como) usted (quiera | diga)", "(da | es) igual", "me es indiferente",
    ] },
    // "¿Cuál me recomienda?": Emilio explains window and aisle
    seat_rec: { patterns: ["(cual | que) me (recomienda | recomiendas #tip:tu_staff | sugiere)", "(cual | que) es mejor [ventana o pasillo]", "(ventana o pasillo) cual es mejor"] },
    seat_neg: { patterns: [
      "no {seat} [por favor]",
      "no (quiero | quisiera | me gusta | me gustan) [un | el | la | los | asientos de | asiento de | el asiento de | estar en] {seat}",
      "(cualquiera | cualquier asiento | lo que sea | todo) menos {seat}",
      "{seat} no",
      "(mejor | prefiero) no {seat}",
    ] },
    more_no: { patterns: [
      "(es todo | eso es todo | seria todo | eso seria todo) #h:more_all",
      "(todo claro | todo esta claro | todo bien | ya entendi todo | todo perfecto) [gracias] #h:more_good",
      "no tengo (mas preguntas | otra pregunta | preguntas | dudas | ninguna pregunta | ninguna duda)",
      "(ninguna | ninguna pregunta | ninguna duda)", "(es | seria) todo por ahora",
    ] },
    more_q: { patterns: ["(tengo | una) (una pregunta | pregunta | duda | una duda)", "(otra | una) pregunta [mas]", "(le puedo | puedo) preguntar algo", "si una pregunta"] },
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
      "(que | cual) @gate [es | era]", "donde esta (la | mi) @gate [{number}]", "@gate [numero] {number} [verdad | correcto | cierto]",
      "(que | cual) @gate (me dijo | dijo)", "(me repite | me puede repetir | cual era) (la | mi | el numero de) @gate", "por donde (abordo | embarco)", "(cual | que) es (el numero de | mi) @gate",
    ] },
    ask_boarding_time: { patterns: [
      "a que hora (empieza el abordaje | abordamos | abordo | se aborda | empiezan a abordar | es el abordaje | sale el vuelo | sale | salimos | despega | empieza el embarque | embarcamos) #h:q_boarding",
      "cuando (abordamos | empieza el abordaje | sale el vuelo | sale | salimos | despega)", "(el abordaje | abordamos) (es | empieza) a {time} [verdad | cierto | correcto]",
      "a que hora (debo | tengo que) estar en la @gate",
    ] },
    ask_security: { patterns: [
      "donde (esta | queda) (seguridad | el filtro | el filtro de seguridad | el control de seguridad | la revision | la revision de seguridad | el control) [de seguridad]",
      "por donde (paso | voy | es) [a | para] (seguridad | el filtro | el control | la revision) #h:q_security",
      "(a donde | adonde | por donde) (voy | sigo | paso) (ahora | despues)", "que hago ahora",
    ] },
    ask_duration: { patterns: [
      "cuanto (dura | tarda | tiempo dura | tiempo es) [el vuelo]", "a que hora (llegamos | llega el vuelo | aterrizamos) [a la ciudad de mexico]",
      "cuanto (se hace | se tarda) [a la ciudad de mexico]", "cuantas horas (son | es) [de vuelo]",
    ] },
    ask_carryon: { patterns: [
      "puedo (llevar | subir | meter) (esta | mi | la) (mochila | bolsa | maleta | maleta de mano | maletita) (conmigo | al avion | a bordo | en la cabina) #h:q_carryon",
      "(esta | mi) (mochila | bolsa | maleta de mano) (esta bien | cuenta | pasa | sirve) como equipaje de mano", "puedo llevar (esto | esta) conmigo",
      "(la mochila | mi mochila | esta mochila) (va | puede ir) conmigo",
    ] },
    ask_seatnum: { patterns: ["cual es mi asiento", "(que | cual) asiento (tengo | me toco | me dio | es)", "donde me (siento | toco)", "(que | cual) numero de asiento [tengo]"] },
    ask_bagfee: { patterns: [
      "(tengo que | hay que) pagar (por | la | el) (maleta | equipaje | mi maleta) #h:q_fee", "(la maleta | el equipaje | mi maleta) (tiene costo | cuesta | se paga | esta incluida | esta incluido)",
      "(cuesta | cuanto cuesta) documentar [la maleta | una maleta]", "(esta incluida | incluye) la maleta",
    ] },
    ask_restroom: { patterns: [
      "donde (esta | estan | queda | quedan) (el bano | los banos | los sanitarios | el sanitario | el servicio | los servicios | el aseo | el wc)",
      "hay (un bano | banos | sanitarios) (por aqui | cerca)",
    ] },
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
        { flags: { 3: "documentar: to check in (and check your bags) at the airline counter." } }),
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
      t("Mmm, | no veo | ninguna | reservación | a | {X} | para | hoy.", "Hmm, | I don't see | any | reservation | to | {X} | for | today.", "Hmm, I don't see a reservation to {X} today."),
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
          flags: { 5: "el: Spanish puts an article before vuelo here; English has none.", 9: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    dest_neg_ack: [t("¡Ay, | perdón! | ¿A | dónde | viaja, | entonces?", "Oh, | sorry! | To | where | are you traveling, | then?", "Oh, sorry! Where are you flying, then?")],
    lookup_help: [t("No se preocupe. | Busco | su | vuelo | con | su | pasaporte.", "Don't worry. | I-look-up | your | flight | with | your | passport.", "No problem. I can find your flight with your passport.")],
    ask_passport: [
      t("¿Me | permite | su | pasaporte, | por favor?", "(To) me | you-allow | your | passport, | please?", "May I see your passport, please?"),
      t("¿Me | da | su | pasaporte, | por favor?", "(To) me | you-give | your | passport, | please?", "Can I have your passport, please?"),
      t("¿Me | presta | su | pasaporte | o | su | tarjeta | de | residente?", "(To) me | you-lend | your | passport | or | your | card | of | resident?",
        "Could I see your passport or your resident card?", { flags: { 1: "prestar: to lend; Mexicans use it for handing something over for a moment." } }),
    ],
    pp_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thanks a lot."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    found_booking: [
      t("Muy | bien: | vuelo | 223 | a | la | Ciudad de México, | sale | a | las | 8:10.", "Very | good: | flight | 223 | to | — | Mexico City, | it leaves | at | — | 8:10.",
        "Okay: flight 223 to Mexico City, departing at 8:10.",
        { say: "Muy bien: vuelo doscientos veintitrés a la Ciudad de México, sale a las ocho y diez.",
          flags: { 5: "la: Spanish says la Ciudad de México; English has no article here.", 9: "las: Spanish puts an article before clock times." } }),
      t("Listo, | ya | encontré | su | reservación: | vuelo | 223 | a | la | Ciudad de México.", "Done, | already | I-found | your | reservation: | flight | 223 | to | — | Mexico City.",
        "All right, I found your reservation: flight 223 to Mexico City.",
        { say: "Listo, ya encontré su reservación: vuelo doscientos veintitrés a la Ciudad de México.", flags: { 8: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    found_lookup: [
      t("Muy | bien, | veo | que | hoy | viaja | a | la | Ciudad de México.", "Very | good, | I-see | that | today | you're traveling | to | — | Mexico City.",
        "Okay, I see you're flying to Mexico City today.", { flags: { 7: "la: Spanish says la Ciudad de México; English has no article here." } }),
    ],
    pp_yes: [t("Sí, | su | pasaporte, | por favor.", "Yes, | your | passport, | please.", "Yes, your passport, please.")],
    pp_only: [t("Por ahora | solo | necesito | su | pasaporte.", "For now | only | I-need | your | passport.", "For now I just need your passport.")],
    bp_updated: [
      t("Ya | le | cambié | el | pase de abordar.", "Already | (for) you | I-changed | the | boarding pass.", "I've updated your boarding pass.",
        { flags: { 4: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("Ya | le | cambié | la | tarjeta de embarque.", "Already | (for) you | I-changed | the | boarding pass.", "I've updated your boarding pass.") }),
    ],
    pp_have: [t("Ya | lo | tengo, | gracias.", "Already | it | I-have, | thanks.", "I already have it, thanks.", { flags: { 1: "lo: it, the passport (el pasaporte)." } })],
    find_first: [t("Primero | déjeme | encontrar | su | reservación.", "First | let me | find | your | reservation.", "Let me find your reservation first.")],
    ask_bags: [
      t("¿Documenta | equipaje?", "Are you checking | luggage?", "Are you checking any bags?",
        { flags: { 0: "documentar: to check (a bag) at the airline counter; the Mexican word." } }),
      t("¿Trae | maletas | para | documentar?", "Do you have | suitcases | to | check?", "Do you have any bags to check?"),
    ],
    ask_bags_n: [t("¿Cuántas | maletas | va | a | documentar?", "How many | suitcases | are you going | to | check?", "How many bags are you checking?")],
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
        { flags: { 1: "mismo / misma: yourself; it agrees with you (a man or a woman)." } }),
    ],
    ask_packed_many: [
      t("¿Usted | {m:mismo|f:misma} | hizo | sus | maletas?", "You | yourself | packed | your | suitcases?", "Did you pack your bags yourself?",
        { flags: { 1: "mismo / misma: yourself; it agrees with you (a man or a woman)." } }),
    ],
    packed_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you."), t("Muy | bien.", "Very | good.", "Okay.")],
    packed_follow: [t("Muy | bien. | ¿Sabe | qué | lleva | adentro?", "Very | good. | Do you know | what | it carries | inside?", "Okay. Do you know what's inside?")],
    packed_follow_ok: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Okay, thanks.")],
    ask_battery: [
      t("¿Lleva | baterías | de | litio | o | cargadores | portátiles | en | la | maleta?", "Do you carry | batteries | of | lithium | or | chargers | portable | in | the | suitcase?",
        "Are there any lithium batteries or power banks in the bag?"),
      t("¿Trae | alguna | batería | portátil | en | la | maleta?", "Do you have | any | battery | portable | in | the | suitcase?", "Any power banks in your bag?"),
    ],
    ask_battery_many: [
      t("¿Lleva | baterías | de | litio | o | cargadores | portátiles | en | las | maletas?", "Do you carry | batteries | of | lithium | or | chargers | portable | in | the | suitcases?",
        "Are there any lithium batteries or power banks in the bags?"),
    ],
    battery_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thanks."), t("Muy | bien, | perfecto.", "Very | good, | perfect.", "Okay, great.")],
    battery_move: [
      t("Los | cargadores | portátiles | tienen | que | ir | en | el | equipaje de mano. | ¿Lo | puede | cambiar, | por favor?",
        "The | chargers | portable | have | to | go | in | the | carry-on. | It | can you | move, | please?",
        "Power banks have to go in your carry-on. Could you move it, please?", { flags: { 9: "lo: it, the power bank (el cargador)." } }),
    ],
    battery_move_q: [t("¿Lo | puede | pasar | a | su | equipaje de mano, | por favor?", "It | can you | move | to | your | carry-on, | please?", "Could you move it to your carry-on, please?")],
    battery_must: [t("Lo siento, | no puede | ir | en | la | maleta | documentada.", "I'm sorry, | it can't | go | in | the | suitcase | checked.", "Sorry, it can't go in a checked bag.")],
    battery_thanks: [t("¡Gracias!", "Thanks!", "Thank you!"), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    battery_unsure: [
      t("No hay problema. | Si | lleva | un | cargador | portátil, | llévelo | en | su | equipaje de mano.", "No problem. | If | you carry | a | charger | portable, | carry it | in | your | carry-on.",
        "That's okay. If you have a power bank, please keep it in your carry-on."),
    ],
    powerbank_what: [t("Es | una | batería | para | cargar | el | celular.", "It's | a | battery | to | charge | the | cell phone.", "It's a battery for charging your phone.")],
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
        "There's a {$price} overweight fee, or you can move a few things to your carry-on."),
      t("Puede | pasar | algunas | cosas | a | su | equipaje de mano | o | pagar | {$price} | de | sobrepeso.",
        "You can | move | some | things | to | your | carry-on | or | pay | {$price} | of | excess weight.",
        "You can move a few things to your carry-on or pay a {$price} overweight fee."),
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
    ow_cash_ok: [t("Sí, | también | aceptamos | efectivo. | Son | {$price}.", "Yes, | also | we-accept | cash. | It's | {$price}.", "Yes, we take cash too. That's {$price}.")],
    ow_fee_paid: [t("Gracias. | Listo, | todo | en orden.", "Thank you. | Done, | everything | in order.", "Thank you. You're all set.")],
    ow_fee_amount: [t("Son | {$price}.", "It's | {$price}.", "It's {$price}.")],
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
    nothing_to_pay: [t("Hoy | no tiene | que | pagar | nada.", "Today | you don't have | to | pay | anything.", "There's nothing to pay today.")],
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
            { say: "El abordaje empieza a las siete y media en la puerta cuatro.", flags: { 4: "las: Spanish puts an article before clock times." } }) }),
      t("Su | sala | es | la | 4 | y | abordamos | a | las | 7:30.", "Your | gate | is | — | 4 | and | we-board | at | — | 7:30.", "Your gate is 4, and boarding starts at 7:30.",
        { say: "Su sala es la cuatro y abordamos a las siete y media.",
          flags: { 1: "Mexican: la sala = the gate (literally the lounge); elsewhere la puerta.", 3: "la (sala): Spanish puts an article before the number.", 8: "las: Spanish puts an article before clock times." },
          neutral: t("Su | puerta | es | la | 4 | y | abordamos | a | las | 7:30.", "Your | gate | is | — | 4 | and | we-board | at | — | 7:30.", "Your gate is 4, and boarding starts at 7:30.",
            { say: "Su puerta es la cuatro y abordamos a las siete y media.", flags: { 3: "la (puerta): Spanish puts an article before the number.", 8: "las: Spanish puts an article before clock times." } }) }),
    ],
    bag_tag: [
      t("Y | este | es | el | comprobante | de | su | maleta.", "And | this | is | the | claim tag | of | your | suitcase.", "And here's your bag tag."),
      t("Aquí está | el | comprobante | de | su | equipaje.", "Here is | the | claim tag | of | your | luggage.", "Here's your baggage claim tag."),
    ],
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
          flags: { 4: "las: Spanish puts an article before clock times.", 11: "las: Spanish puts an article before clock times." } }),
    ],
    security_dir: [
      t("El | filtro de seguridad | está | por allá, | a la izquierda.", "The | security checkpoint | is | over there, | on the left.", "Security is over there, on the left.",
        { flags: { 1: "Mexican: el filtro de seguridad = the security checkpoint; elsewhere el control de seguridad." },
          neutral: t("El | control de seguridad | está | por allá, | a la izquierda.", "The | security checkpoint | is | over there, | on the left.", "Security is over there, on the left.") }),
      t("Seguridad | está | derecho, | pasando | la | cafetería.", "Security | is | straight ahead, | past | the | café.", "Security is straight ahead, past the café."),
    ],
    duration: [t("Son | más o menos | dos | horas.", "It's | more or less | two | hours.", "It's about two hours.")],
    carryon_ok: [t("Sí, | esa | mochila | está bien | como | equipaje de mano.", "Yes, | that | backpack | is fine | as | carry-on.", "Sure, that backpack is fine as a carry-on.")],
    seatnum: [t("Su | asiento | es | el | {$seat}.", "Your | seat | is | — | {$seat}.", "Your seat is {$seat}.", { flags: { 3: "el (asiento): Spanish puts an article before the seat number." } })],
    bagfee_info: [t("Su | tarifa | incluye | una | maleta | documentada, | así que | no tiene | costo.", "Your | fare | includes | one | suitcase | checked, | so | it doesn't have | cost.",
      "Your fare includes one checked bag, so there's no charge.")],
    bagfee_many: [t("Su | reservación | ya | incluye | sus | maletas.", "Your | reservation | already | includes | your | suitcases.", "Your reservation already includes your bags.")],
    restroom: [t("Los | baños | están | por allá, | junto | a | la | cafetería.", "The | restrooms | are | over there, | next | to | the | café.", "The restrooms are over there, next to the café.")],
    bye_flight: [t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"), t("¡Que | tenga | buen | vuelo!", "May | you have | good | flight!", "Have a good flight!")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto.", "Perfect.", "Great.")],
    thanks_short: [t("Gracias.", "Thank you.", "Thanks.")],
  },

  domains: {
    kg: () => [18, 20, 22, 23, 24, 27],
    num: () => Object.values(NUM_WORD),
    seat: () => Object.values(SEAT_NO),
    price: () => [FEE],
  },

  hints: {
    hello: {
      lt: "Say you'd like to check in",
      items: [
        { id: "checkin_simple", s: t("Quisiera | hacer | el | check-in.", "I'd like | to do | the | check-in.", "I'd like to check in.") },
        { id: "checkin_doc", s: t("Vengo | a | documentar.", "I come | to | check in.", "I'm here to check in."),
          note: "In Mexico, documentar is what you do at the airline counter: check in and drop off your bags." },
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
        { id: "bags_checking", s: t("Voy | a | documentar | una | maleta.", "I'm going | to | check | one | suitcase.", "I'm checking one bag.") },
        { id: "bags_two", s: t("Dos | maletas.", "Two | suitcases.", "Two bags.") },
        { id: "bags_none", s: t("No, | solo | traigo | equipaje de mano.", "No, | only | I-bring | carry-on.", "No, just a carry-on.") },
      ],
    },
    packed: {
      lt: "Say you packed it yourself",
      items: [
        { id: "packed_yes", s: t("Sí, | yo | {m:mismo|f:misma} | la | hice.", "Yes, | I | myself | it | packed.", "Yes, I packed it myself.",
          { flags: { 2: "mismo / misma: myself; it agrees with you.", 3: "la: it, the bag (la maleta)." } }) },
        { id: "packed_did", s: t("Sí, | la | hice | yo.", "Yes, | it | I-packed | myself.", "Yes, I did it myself.", { flags: { 1: "la: it, the bag (la maleta)." } }) },
      ],
    },
    battery: {
      lt: "Answer about batteries",
      items: [
        { id: "battery_no", s: t("No, | no traigo | nada | de | eso.", "No, | I don't have | anything | of | that.", "No, nothing like that.") },
        { id: "battery_carryon", s: t("Lo | traigo | en | mi | mochila.", "It | I-carry | in | my | backpack.", "It's in my backpack.", { flags: { 0: "lo: it, the charger (el cargador)." } }) },
        { id: "battery_carryon_x", s: t("Mi | cargador | portátil | está | en | mi | mochila.", "My | charger | portable | is | in | my | backpack.", "My power bank is in my backpack.") },
        { id: "battery_yes", s: t("Sí, | traigo | un | cargador | portátil.", "Yes, | I-have | a | charger | portable.", "Yes, I have a power bank.") },
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
        { id: "ow_wear", s: t("Me | pongo | el | suéter.", "(On) myself | I-put | the | sweater.", "I'll wear my sweater.", { flags: { 0: "me pongo: I put on (myself); ponerse = to put on clothes." } }) },
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
        { id: "moving_done", s: t("Listo.", "Ready.", "Done.") },
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
        { id: "q_boarding", s: t("¿A | qué | hora | empieza | el | abordaje?", "At | what | time | starts | the | boarding?", "What time does boarding start?") },
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
      expects: ["checkin", "dest_ans", "give"],
      suggest: [{ lt: "Say you'd like to check in", hint: "hello" }, { lt: "Say where you're flying", hint: "dest" }],
      yes: (c) => { c.s.hello = true; c.say("hello_great"); },
      no: (c) => { c.s.hello = true; c.say("no_help"); c.hold(); } },
    { id: "dest", done: (c) => !!c.s.dest || !!c.s.lookup,
      // asked again (after "Quiero hacer el check-in"): a short "¿Y a dónde viaja?", not the same question
      ask: (c) => { c.say(c.s.destAsked ? "ask_dest_again" : "ask_dest"); c.s.destAsked = true; },
      expects: ["dest_ans", "checkin", "lookup"],
      suggest: [{ lt: "Say where you're flying", hint: "dest" }],
      help: (c) => { c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); } },
    { id: "passport", done: (c) => !!c.s.passport,
      ask: (c) => c.say("ask_passport"),
      expects: ["give", "give_ctx", "passport_q", "find_it"],
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
      expects: ["seat_ans", "seat_any", "seat_neg", "seat_rec"],
      suggest: [{ lt: "Choose a seat: window or aisle", hint: "seat", options: "seat" }],
      help: (c) => { c.say("seat_help"); c.say("ask_seat"); } },
    { id: "bp", when: (c) => !!c.s.seatNo, done: (c) => !!c.s.moreDone,
      ask: (c) => {
        if (!c.s.bpGiven) {
          c.s.bpGiven = true;
          c.say("bp_give");
          c.event("give", { item: "boarding-pass" });
          c.say("bp_info");
          if (c.s.bags > 0 && c.chance(0.45)) c.say("bag_tag");
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
      if (slots.city) { setDest(c, slots.city); return; }
      if (typeof slots.number === "number") { setFlight(c, slots.number); return; }
      if (/\b(ciudad de mexico|cdmx|df|guadalajara|monterrey|cancun|merida|oaxaca|vuelo \d+|\d{3})\b/.test(fold(c.heard))) return;
      if (!already || c.step === "hello" || !c.s.dest) c.say("checkin_ack");
    },
    dest_ans(c, slots, seg) {
      if (slots.city) { setDest(c, slots.city); return; }
      if (typeof slots.number === "number") { setFlight(c, slots.number); return; }
      if (seg.tags.includes("time")) setFlight(c, 223); // "el vuelo de las 8:10"
    },
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
      c.say("pp_yes"); c.hold();
    },
    find_it(c) { c.say("g_take_time"); c.hold(); },
    bags_ans(c, slots, seg) {
      const tags: string[] = seg.tags || [];
      const n = typeof slots.number === "number" ? slots.number : tags.includes("two") ? (/tres/.test(fold(c.heard)) ? 3 : 2) : 1;
      if (n < 1 || n > 4) { expectBagCount(c); return; }
      setBags(c, n);
    },
    bags_num_ctx(c, slots) {
      const n = slots.n ? parseInt(slots.n, 10) : 1;
      if (!(n >= 1 && n <= 4)) { expectBagCount(c); return; }
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
    battery_yes(c) { c.twist("power_bank"); c.say("battery_move"); },
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
      c.say("no_need_bag");
    },
    move_items_ctx(c) { if (c.s.owShown && !c.s.owDone) startMoving(c); else c.say("nothing_to_pay"); },
    pay_fee(c) {
      if (c.s.owShown && !c.s.owDone) { startFee(c); return; }
      c.say("nothing_to_pay");
    },
    pay_fee_ctx(c) { if (c.s.owShown && !c.s.owDone) startFee(c); else c.say("nothing_to_pay"); },
    // "¿Puedo pagar con tarjeta?" while the overweight question is open = I'll pay the fee
    pay_card(c) { if (c.s.owShown && !c.s.owDone) { startFee(c); return; } c.say("nothing_to_pay"); },
    pay_cash(c) { if (c.s.owShown && !c.s.owDone) { cashOk(c); return; } c.say("nothing_to_pay"); },
    lookup(c) {
      if (c.s.dest || c.s.passport) { c.say("flight_ack"); return; }
      c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); c.hold();
    },
    ask_fee(c) {
      if (c.s.owShown && !c.s.owDone) { c.say("ow_fee_amount", { price: FEE }); return; }
      c.say(c.s.bags >= 2 ? "bagfee_many" : "bagfee_info");
    },
    ask_over(c) {
      if (c.s.owShown && !c.s.owDone) { c.say("ow_over"); return; }
      if (c.s.weighed || c.s.owShown) { c.say("weight_is", { kg: c.s.kg }); return; }
      c.say("limit");
    },
    ask_limit(c) { c.say("limit"); },
    seat_ans(c, slots) {
      const pref = slots.seat as string;
      if (!c.s.passport) { c.s.seatPref = pref; c.say("seat_pref_" + pref); return; }
      assignSeat(c, pref);
    },
    seat_any(c) {
      c.say("seat_any_ack");
      if (!c.s.passport) { c.s.seatPref = "any"; return; }
      assignSeat(c, "aisle");
    },
    seat_neg(c, slots) {
      const bad = slots.seat as string;
      if (bad === "middle") {
        c.say("seat_neg_both");
        ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["seat"],
          suggest: [{ lt: "Choose a seat", hint: "seat", options: ["window", "aisle"] }],
          on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
          yes: (cc) => { cc.say("seat_neg_both"); }, ask: (cc) => cc.say("seat_neg_both") });
        return;
      }
      const other = bad === "window" ? "aisle" : "window";
      c.say(bad === "window" ? "seat_neg_window" : "seat_neg_aisle");
      ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["g_yesno", "seat"],
        suggest: [{ lt: "Agree or choose another seat", hint: "seat", options: "seat" }],
        yes: (cc) => { if (cc.s.passport) assignSeat(cc, other); else { cc.s.seatPref = other; cc.say("ack"); } },
        no: (cc) => { cc.say("ask_seat"); },
        on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
        ask: (cc) => cc.say(bad === "window" ? "seat_neg_window" : "seat_neg_aisle") });
    },
    more_no(c) { if (c.step === "bp" || c.s.bpGiven) c.s.moreDone = true; else c.say("ack"); },
    more_q(c) { c.say("what_q"); c.hold(); },
    ask_ontime(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("ontime_yes"); },
    ask_delayed(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("delayed_no"); },
    ask_gate(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("gate_is"); },
    ask_boarding_time(c) { if (!c.s.dest && !c.s.passport) { c.say("find_first"); return; } c.say("boarding_time"); },
    ask_security(c) { c.s.securityTold = true; c.say("security_dir"); },
    ask_duration(c) { c.say("duration"); },
    ask_carryon(c) { c.say("carryon_ok"); },
    ask_seatnum(c) {
      if (c.s.seatNo) { c.say("seatnum", { seat: c.s.seatNo }); return; }
      if (c.s.passport) c.ask("seat");
      else c.say("find_first");
    },
    ask_bagfee(c) { c.say(c.s.bags >= 2 ? "bagfee_many" : "bagfee_info"); },
    ask_restroom(c) { c.say("restroom"); },
    seat_rec(c) { if (c.s.seatNo) { c.say("seat_help"); return; } c.say("seat_help"); c.say("ask_seat"); },
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
    { say: "El vuelo 223 a la Ciudad de México", intent: "dest_ans", slots: { number: 223, city: "cdmx" } },
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
    { say: "No tengo pasaporte", intent: "none", step: "passport", not: ["give", "give_ctx"] },
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
  ],
};

export default checkin;
