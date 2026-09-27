// Song 64 "Window or Aisle?" (part 1 of 3): airline check-in at Maple Harbor Airport, agent Kevin.
// A US counter check-in for a domestic flight (flight 223 to Boston): destination, passport as ID,
// checked bag on the scale (50-pound limit, $100 overweight fee or move things to the carry-on),
// a safety question (spare batteries / power banks, or "Did you pack it yourself?"), window or aisle,
// boarding pass with gate and boarding time, and the way to security.
// Twists: the bag is 3 pounds over (more likely after the first visit); no window seats left (visits ≥ 1);
// a power bank in the checked bag (learner-driven).

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

const CITIES: EntityDef[] = [
  ent("boston", "Boston", "Bostonas/Bostono/Bostonui/Bostoną/Bostonu/Bostone", "m", { forms: ["boston logan", "logan", "bostin", "boston massachusetts", "boston mass", "boston ma", "boston airport", "bostonas"] }),
  ent("new_york", "New York", "Niujorkas/Niujorko/Niujorkui/Niujorką/Niujorku/Niujorke", "m", { forms: ["new york city", "nyc", "jfk", "la guardia", "laguardia"] }),
  ent("chicago", "Chicago", "Čikaga/Čikagos/Čikagai/Čikagą/Čikaga/Čikagoje", "f", { forms: ["o'hare"] }),
  ent("washington", "Washington", "Vašingtonas/Vašingtono/Vašingtonui/Vašingtoną/Vašingtonu/Vašingtone", "m", { forms: ["washington dc", "washington d c", "d c"] }),
  ent("miami", "Miami", "Majamis/Majamio/Majamiui/Majamį/Majamiu/Majamyje", "m"),
  ent("atlanta", "Atlanta", "Atlanta/Atlantos/Atlantai/Atlantą/Atlanta/Atlantoje", "f"),
  ent("denver", "Denver", "Denveris/Denverio/Denveriui/Denverį/Denveriu/Denveryje", "m"),
  ent("seattle", "Seattle", "Sietlas/Sietlo/Sietlui/Sietlą/Sietlu/Sietle", "m"),
  ent("orlando", "Orlando", "Orlandas/Orlando/Orlandui/Orlandą/Orlandu/Orlande", "m"),
  ent("philadelphia", "Philadelphia", "Filadelfija/Filadelfijos/Filadelfijai/Filadelfiją/Filadelfija/Filadelfijoje", "f", { forms: ["philly"] }),
  ent("vilnius", "Vilnius", "Vilnius/Vilniaus/Vilniui/Vilnių/Vilniumi/Vilniuje", "m"),
];

// Seat types. Lithuanian forms are indeclinable prepositional phrases (vieta prie lango …).
const SEATS: EntityDef[] = [
  ent("window", "window", "prie lango", "f", { chip: "prie lango",
    forms: ["window seat", "window seats", "by the window", "next to the window", "the window side", "window side", "windows", "near the window", "close to the window", "at the window"] }),
  ent("aisle", "aisle", "prie praėjimo", "f", { chip: "prie praėjimo",
    forms: ["aisle seat", "aisle seats", "on the aisle", "by the aisle", "aisle side", "isle", "isle seat", "near the aisle", "close to the aisle", "next to the aisle", "aisles"] }),
  ent("middle", "middle", "viduryje", "f", { chip: "viduryje",
    forms: ["middle seat", "middle seats", "in the middle", "center seat", "centre seat"] }),
];

const SEAT_NO: Record<string, { en: string; lt: string; say: string }> = {
  window: { en: "12A", lt: "12A", say: "twelve A" },
  aisle: { en: "14C", lt: "14C", say: "fourteen C" },
  middle: { en: "23B", lt: "23B", say: "twenty-three B" },
};

// Automatic answers for the simulations (keyed by step or pending id).
const NUM_WORD: Record<number, { en: string; lt: string; say: string }> = {
  2: { en: "Two", lt: "Du", say: "two" },
  3: { en: "Three", lt: "Trys", say: "three" },
  4: { en: "Four", lt: "Keturi", say: "four" },
};

const AUTO: Record<string, string> = {
  hello: "Yes, I'd like to check in.",
  dest: "To Boston, please.",
  dest_confirm: "Yes, that's right.",
  passport: "Here you go.",
  bags: "Just one bag.",
  bag_count: "Just one.",
  packed: "Yes, I packed it myself.",
  packed_follow: "Yes, I do.",
  battery: "No, there aren't.",
  battery_move: "Sure, no problem.",
  scale: "Sure.",
  overweight: "I'll move some things to my carry-on.",
  moving: "Okay, how about now?",
  fee: "Here's my card.",
  seat: "Window, please.",
  seat_clarify: "Yes, please.",
  no_window: "Yes, that's fine.",
  no_window_middle: "No, thanks.",
  bp: "No, that's all. Thanks!",
};

const plainAck = (heard: string) =>
  /^\s*(ok|okay|all right|alright|sure|fine|great|perfect|cool|got it|thanks|thank you)\b/i.test(heard) && !/question|ask/i.test(heard);

// ---------------------------------------------------------------------------
// Flow helpers

/** c.expect() that also accepts "Yes, that's right" / "No, that's wrong" (affirm/deny intents) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

function setDest(c: Ctx, city: string) {
  c.s.hello = true;
  if ((c as any)._destDone) return; // one utterance parsed as two segments
  (c as any)._destDone = true;
  if (city === "boston") {
    const first = !c.s.dest;
    c.s.dest = "boston";
    if (first && !c.s.passport && !/passport|here/i.test(c.heard)) c.say("dest_ack", { X: "boston" });
    else if (!first && !(c as any)._destAcked) c.say("flight_ack");
    (c as any)._destAcked = true;
    return;
  }
  if (c.s.passport) { c.say("flight_wrong"); return; }
  c.say("dest_wrong", { X: city });
  c.say("dest_only_boston");
  expectDestConfirm(c);
}

function expectDestConfirm(c: Ctx) {
  c.say("dest_confirm_q");
  ask(c, {
    id: "dest_confirm", optional: true, expects: ["dest_ans"], hints: ["confirm"],
    suggest: [{ lt: "Patvirtinti, kad skrendi į Bostoną", hint: "confirm" }],
    yes: (cc) => { cc.s.dest = "boston"; cc.say("ack"); },
    no: (cc) => { cc.s.lookup = true; cc.say("check_passport"); },
    on: { dest_ans: (cc, sl) => {
      if (sl.city && sl.city !== "boston") { cc.say("dest_only_boston"); expectDestConfirm(cc); return; }
      cc.s.dest = "boston"; cc.say("ack");
    } },
    ask: (cc) => cc.say("dest_confirm_q"),
  });
}

function setFlight(c: Ctx, n: number) {
  c.s.hello = true;
  if ((c as any)._destDone) return;
  (c as any)._destDone = true;
  c.s.dest = "boston";
  c.say(n === 223 ? "flight_ack" : "flight_wrong");
}

function passportGiven(c: Ctx) {
  c.s.passport = true;
  c.s.hello = true;
  c.say("pp_thanks");
  const lookup = !c.s.dest || c.s.lookup;
  c.s.dest = "boston";
  c.say(lookup ? "found_lookup" : "found_booking");
}

function weigh(c: Ctx) {
  if (c.s.overweight && !c.s.owDone) {
    c.twist("overweight");
    c.s.owShown = true;
    c.say(c.s.bags >= 2 ? "ow_result_many" : "ow_result");
    c.say("ow_options");
    expectOverweight(c);
    return;
  }
  c.s.weighed = true;
  if (c.s.bags >= 3) c.say("weigh_ok_many");
  else if (c.s.bags === 2) c.say("weigh_ok_two");
  else c.say("weigh_ok", { lbs: c.s.lbs });
}

function expectOverweight(c: Ctx) {
  ask(c, {
    id: "overweight", expects: ["move_items", "pay_fee", "ask_fee", "ask_over", "ask_limit"], hints: ["ow_move", "ow_pay", "ow_ask"],
    suggest: [
      { lt: "Perkelti kelis daiktus į rankinį bagažą", hint: "ow_move" },
      { lt: "Sumokėti mokestį", hint: "ow_pay" },
      { lt: "Paklausti, kiek kainuoja ar koks limitas", hint: "ow_ask" },
    ],
    on: {
      move_items: (cc) => { startMoving(cc); },
      pay_fee: (cc) => { startFee(cc); },
    },
    yes: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    no: (cc) => { cc.say("ow_ask"); expectOverweight(cc); },
    ask: (cc) => cc.say("ow_ask"),
  });
}

function startMoving(c: Ctx) { c.say("ow_move_ok"); expectMoving(c); }
function expectMoving(c: Ctx) {
  ask(c, {
    id: "moving", expects: ["ack_done", "give"], hints: ["moving"],
    suggest: [{ lt: "Pasakyti, kad jau perkėlei daiktus", hint: "moving" }],
    on: {
      ack_done: (cc) => { reweigh(cc); },
      give: (cc) => { reweigh(cc); },
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
  c.s.owDone = true; c.s.weighed = true;
  c.say("ow_reweigh", { lbs: 49 });
}

function startFee(c: Ctx) { c.say("ow_fee_card"); expectFee(c); }
function expectFee(c: Ctx) {
  const paid = (cc: Ctx) => {
    cc.s.owDone = true; cc.s.weighed = true; cc.s.feePaid = true;
    cc.event("pay", { method: "card", amount: 10000 });
    cc.say("ow_fee_paid");
  };
  ask(c, {
    id: "fee", expects: ["give", "pay_card", "ack_done"], hints: ["fee"],
    suggest: [{ lt: "Susimokėti kortele", hint: "fee" }, { lt: "Vis dėlto perkelti daiktus", hint: "ow_move" }],
    on: {
      give: (cc) => { paid(cc); }, pay_card: (cc) => { paid(cc); }, ack_done: (cc) => { paid(cc); }, g_ok: (cc) => { paid(cc); },
      pay_fee: (cc) => { paid(cc); },
      pay_cash: (cc) => { cc.say("ow_card_only"); expectFee(cc); },
      move_items: (cc) => { startMoving(cc); },
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
    id: "no_window", expects: ["seat_ans", "seat_any", "seat_neg"], hints: ["yesno", "seat"],
    suggest: [{ lt: "Sutikti arba atsisakyti", hint: "yesno" }, { lt: "Pasirinkti kitą vietą", hint: "seat", options: ["aisle", "middle"] }],
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
    id: "no_window_middle", expects: ["seat_ans", "seat_neg"], hints: ["yesno"],
    suggest: [{ lt: "Sutikti arba atsisakyti", hint: "yesno" }],
    yes: (cc) => { assignSeat(cc, "middle"); },
    no: (cc) => { cc.s.seat = "aisle"; cc.s.seatNo = SEAT_NO.aisle; cc.say("no_window_last"); },
    on: {
      seat_ans: (cc, sl) => { assignSeat(cc, sl.seat === "window" ? "aisle" : sl.seat); },
      seat_neg: (cc) => { cc.s.seat = "aisle"; cc.s.seatNo = SEAT_NO.aisle; cc.say("no_window_last"); },
    },
    ask: (cc) => cc.say("no_window_middle"),
  });
}

function expectBagCount(c: Ctx) {
  c.say("bags_how_many");
  ask(c, {
    id: "bag_count", expects: ["bags_ans", "bags_num_ctx", "bags_none"], hints: ["bags"],
    suggest: [{ lt: "Pasakyti, kiek lagaminų", hint: "bags" }],
    on: {
      bags_ans: (cc, sl, sg) => { checkin.handlers.bags_ans(cc, sl, sg); },
      bags_num_ctx: (cc, sl, sg) => { checkin.handlers.bags_ans(cc, sl, sg); },
      bags_none: (cc, sl, sg) => { checkin.handlers.bags_none(cc, sl, sg); },
    },
    yes: (cc) => { setBags(cc, 1); },
    no: (cc) => { setBags(cc, 0); },
    ask: (cc) => cc.say("bags_how_many"),
  });
}

/** Contexts (one per learner turn) whose bag count was already acknowledged. */
const BAGS_ACKED = new WeakSet<object>();
function setBags(c: Ctx, n: number) {
  // one answer read as two pieces ("just this" + "one suitcase") is acknowledged once
  if (BAGS_ACKED.has(c) && c.s.bags === n) return;
  BAGS_ACKED.add(c);
  c.s.bags = n;
  if (n === 0) c.say("bags_none_ack");
  else if (n === 1) c.say("bags_ack_one");
  else c.say("bags_ack_n", { num: NUM_WORD[n] });
}

function expectPacked(c: Ctx) {
  const ok = (cc: Ctx) => { cc.s.safetyDone = true; cc.say("packed_ok"); };
  const follow = (cc: Ctx) => {
    cc.say("packed_follow");
    ask(cc, { id: "packed_follow", optional: true, hints: ["yesno"], suggest: [{ lt: "Atsakyti: taip arba ne", hint: "yesno" }],
      yes: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); },
      no: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); },
      on: { g_dontknow: (c3) => { c3.s.safetyDone = true; c3.say("packed_follow_ok"); } },
      ask: (c3) => c3.say("packed_follow") });
  };
  ask(c, {
    id: "packed", expects: ["packed_yes", "packed_no"], hints: ["packed"],
    suggest: [{ lt: "Atsakyti, kad lagaminą susikrovei pats", hint: "packed" }],
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
    ask(cc, { id: "battery_move", expects: ["ack_done", "give"], hints: ["ok"], suggest: [{ lt: "Sutikti ją perkelti", hint: "ok" }],
      yes: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      no: (c3) => { c3.say("battery_must"); has(c3); },
      on: {
        ack_done: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        give: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
        g_ok: (c3) => { c3.s.safetyDone = true; c3.say("battery_thanks"); },
      },
      ask: (c3) => c3.say("battery_move_q") });
  };
  ask(c, {
    id: "battery", expects: ["battery_no", "battery_yes", "powerbank_q", "what_ctx"], hints: ["battery"],
    suggest: [{ lt: "Atsakyti, ar lagamine yra baterijų", hint: "battery" }],
    yes: has, no: none,
    on: {
      battery_no: (cc) => { none(cc); },
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
  title: { en: "Window or Aisle?", lt: "Prie lango ar prie praėjimo?" },
  topic: { en: "Airport check-in", lt: "Registracija skrydžiui" },
  chapter: 6,
  order: 5,
  location: "airport",
  npc: "kevin",
  goal: "Užsiregistruok skrydžiui: parodyk pasą, priduok lagaminą, išsirink vietą ir sužinok vartus.",
  intro: "Maple Harbor oro uostas. Šiandien skrendi į Bostoną (skrydis 223). Turi vieną lagaminą ir kuprinę. Prie registracijos stalo – aviakompanijos darbuotojas Kevinas. JAV bagažas sveriamas svarais: 50 svarų – maždaug 23 kg.",
  entities: { city: CITIES, seat: SEATS },

  grammar: {
    macros: {
      my_flight: "(my | the | our | a) flight",
      for_flight: "(for | on) (my | the | our) flight [number] [{number}] [to {city}]",
      carry: "(my | the) (carry on | carry on bag | backpack | hand luggage #tip:uk_handluggage | handbag | personal item | other bag)",
      things: "(some things | a few things | a couple of things | a couple things | something | some stuff | some of my things | stuff | things | some clothes | a few clothes | {thing} | my {thing} | some {thing} | a few {thing} | some of my {thing} | the {thing})",
      bagword: "(bag | bags | suitcase | suitcases | checked bag | checked bags | piece of luggage | pieces of luggage | piece | pieces)",
      trip: "(one way | round trip | for (a | my) (business trip | vacation | work | conference | wedding | meeting | visit | holiday #tip:us_vacation))",
      reason: "[because | since] i (have long legs | like to (look outside | see the view | sleep | walk | stretch my legs) | (need to | have to) get up [often | a lot] | get up (often | a lot) | like the view | want to sleep)",
    },
    slots: {
      bagnum: { lexicon: [
        { id: "1", forms: ["one", "1"] }, { id: "2", forms: ["two", "2"] }, { id: "3", forms: ["three", "3"] }, { id: "4", forms: ["four", "4"] },
      ] },
      thing: { lexicon: [
        { id: "sweater", forms: ["sweater", "sweaters", "hoodie", "sweatshirt", "fleece"] },
        { id: "sweater", forms: ["jumper", "jumpers"], tags: ["tip:uk_jumper"] },
        { id: "jacket", forms: ["jacket", "jackets", "coat", "coats", "raincoat"] },
        { id: "shoes", forms: ["shoes", "boots", "sneakers"] },
        { id: "shoes", forms: ["trainers"], tags: ["tip:uk_trainers"] },
        { id: "books", forms: ["books", "book"] },
        { id: "clothes", forms: ["clothes", "t shirts", "t shirt", "shirts", "jeans", "pants"] },
        { id: "laptop", forms: ["laptop", "computer", "tablet", "camera"] },
        { id: "souvenirs", forms: ["souvenirs", "gifts", "presents"] },
      ] },
    },
  },

  intents: {
    checkin: { patterns: [
      "i would like to check in #h:checkin_simple",
      "i would like to check in (for | on) (my | the) flight to {city} #h:dest_checkin",
      "i would like to check in (for | on) (my | the) flight [number] {number} [to {city}]",
      "i would like to check in (for | on) (my | the) flight #h:dest_checkin",
      "i would like to check in [my | a | one] (bag | suitcase | luggage) #bag",
      "i want to check in [@for_flight] #blunt",
      "(i need | i have) to check in [@for_flight]",
      "(can | could | may) i check in [here] [@for_flight]",
      "(i am | we are) here to check in [@for_flight]",
      "[i am | we are] checking in [@for_flight] [today]",
      "check in",
      "is this [the] (check in | check in counter | check in desk | line for check in | check in line) [for {city} | for (the | my) flight to {city}] #isthis",
      "i am here for (my | the) flight [to {city}]",
      "is this [the] (line | counter | desk | queue #tip:us_line) for {city} #isthis", "is this [the] (line | counter | desk) for (the | my) flight to {city} #isthis", "is this where i check in #isthis",
      "i would like to (drop off | leave) (my | a | the) (bag | suitcase | luggage) #bag", "(i want | i need) to (drop off | check) (my | a | the) (bag | suitcase | luggage) #bag", "(bag drop | baggage drop) [off] #bag",
    ] },
    dest_ans: { patterns: [
      "to {city} #h:dest_to",
      "{city}",
      "i am flying to {city} [today | this morning] #h:dest_flying",
      "i am going to {city} [today | this morning] #h:dest_going",
      "(i am | we are) (heading | headed | traveling | travelling | off | on my way) to {city} [today]",
      "(we are flying | i will be flying | i fly | i will fly | we are going) to {city} [today]",
      "(my flight is | the flight is | it is | my destination is | i have a flight | i have a ticket | i have a reservation | i am booked | i am on a flight | i am on the flight) to {city} [today]",
      "(my | the | a) flight to {city}",
      "[it is | my flight is | i am on] flight [number] {number} [to {city}]",
      "{number} to {city}",
      "[i am on] the {city} flight",
      // other ways: "going home to …", "a flight to … at 8:10", "the 8:10 flight", "… one way / for a business trip"
      "i am going (home | back) to {city}", "(i have | i have got) a flight to {city} (at {time} | today | this morning | this afternoon)",
      "(my | the) destination is {city}", "{city} [flight] [number] {number}", "[i am on] the {time} flight [to {city}] #time",
      "[to] {city} @trip", "(i am flying | i am going | i fly) to {city} @trip", "[yes] {city} (is | is the) (right | correct | my destination)",
      "(sorry | my mistake | my bad) [i mean | i meant] [to] {city}", "(i mean | i meant) [to] {city}", "yes {city}",
    ] },
    dest_unknown: { patterns: [
      "[i am] (flying | going | heading | headed | traveling) to {w:any}",
      "to {w:any}",
      "(my flight is | it is | my destination is) to {w:any}",
    ] },
    // "Can you check?": the agent looks the booking up (as the destination step's help does)
    lookup: { patterns: ["(can | could) you (check | look it up | look | find it | find my (flight | booking | reservation)) [for me] [please]", "(please | can you) check (my | the) (booking | reservation | flight)", "you can (check | find it) (with | by) my passport", "(i forgot | i do not remember) (my | the) (destination | flight number | flight)"] },
    dest_neg: { patterns: [
      "not [to] {city}", "i am not (flying | going) to {city}", "i do not (want | need) to (fly | go) to {city}",
    ] },
    affirm: { patterns: [
      "(yes | yeah | yep | yup) (that is | it is) (right | correct | it | me | true) #h:yes_right",
      "(yes | yeah | yep) (correct | exactly | right)",
      "(that is | it is) (me | it | my flight | the one)",
      "yes that is my flight",
    ] },
    deny: { patterns: [
      "no (that is | it is) (not right | wrong | not correct | not it | not me)",
      "(that is | it is) (not right | wrong | not correct | not my flight)",
    ] },
    give: { patterns: [
      "here you (go | are) #h:pp_here",
      "here it is", "here they are", "there you go", "there you are", "here",
      "here is my (passport | id | driver's license | license | ticket | reservation) #h:pp_heres",
      "here is my (card | credit card | debit card) #h:fee_here",
      "here is my passport and [my] (ticket | reservation | confirmation)",
      "(this is | that is) my (passport | id)",
      "my passport [is here]",
      "passport",
      "take it", "(here is | this is) my (passport | id) and my (ticket | booking | reservation | boarding pass)", "i (only | just) have (my | an) (id card | id | driver's license | national id | passport card)",
      "i have my (booking | reservation | ticket | confirmation) [here | on my phone]", "(here | this) is my (booking | reservation | confirmation) [on my phone]",
    ] },
    passport_q: { patterns: [
      "do you need my (passport | id)",
      "do you need [to see] (my | an | some) (id | passport)",
      "(is | would) my (passport | id | driver's license | license) (be)? (okay | fine | work)",
      "(passport | id) or (id | driver's license | license)",
      "do you need my (boarding pass | ticket | booking | reservation | confirmation) [too | as well]", "do you need (anything | something) else",
    ] },
    find_it: { patterns: [
      "(let me | i will | i need to) (find | get) (it | my passport | my id)",
      "(just a | one | wait a) (second | moment | minute) (let me | i need to) (find | get) (it | my passport | my id)",
      "where is my passport",
    ] },
    bags_ans: { patterns: [
      "just one bag #h:bags_one #one",
      "just (this | this one | this suitcase | this bag | the one | one suitcase | the suitcase | my suitcase) [here] #h:bags_this #one",
      "(just | only) this one (suitcase | bag) [here] #one",
      "i am checking (one | a) (bag | suitcase) #h:bags_checking #one",
      "{number} bags #h:bags_two",
      "[i am checking | i will check | i will be checking | i would like to check | i want to check | i need to check | i have | i have got | i am going to check | we have | we are checking] {number} @bagword [to check] [today]",
      "[i am checking | i will check | i would like to check | i want to check | i need to check | i have | i have got] (a | one) (bag | suitcase | checked bag | piece of luggage) [to check] [today] #one",
      "(only | just) (one | this one | one bag | one suitcase | this) #one",
      "(this | this one | this suitcase | this bag) [here] #one",
      "(my | the) suitcase #one",
      "i have (one | a) (suitcase | bag) and [a | my | one] (carry on | backpack | small bag | hand luggage #tip:uk_handluggage) #one",
      "(one | a) (suitcase | bag) and [a | my | one] (carry on | backpack | small bag | hand luggage #tip:uk_handluggage) #one",
      "(both | both of them | two of them | these two) #two",
      "just {number} @bagword",
      "(one | a) (big | large | small | medium) (bag | suitcase) [to check] #one", "i will check (this | this one | this bag | this suitcase | it | one) #one", "(only | just) one (big | large) (bag | suitcase) #one",
    ] },
    bags_num_ctx: { patterns: ["[just | only] {n:bagnum}", "{n:bagnum} of them"] },
    bags_none: { patterns: [
      "[no] just (a | my) (carry on | carry on bag | backpack) #h:bags_none", "[no] only (a | my) (carry on | carry on bag | backpack)",
      "[no] (just | only) [my | a] hand luggage #tip:uk_handluggage",
      "no (bags | checked bags | luggage | suitcases) [today]",
      "(i do not | i will not) (have | need to check) (any | a) (bags | bag | luggage | checked bags | suitcase) [to check] [today]",
      "i am not checking (any bags | a bag | anything | any luggage | a suitcase) [today]",
      "(nothing | none) [to check] [today]",
      "i only have (a | my) (carry on | backpack | carry on bag)",
      "(just | only) carry on",
      // one piece, not "None | only…" (a reading may not end in a negation)
      "(none | nothing | zero) [bags] [just | only] [my | a] (hand luggage #tip:uk_handluggage | carry on | backpack | small bag | carry on bag)",
      "no (bags | checked bags | luggage | suitcases) [just | only] [my | a] (carry on | backpack | hand luggage #tip:uk_handluggage | small bag)", "zero [bags]",
      "(i do not | i will not) (have | need to check) [any] checked (luggage | bags | bag)", "i am (only | just) traveling with (a | my) (carry on | backpack)",
    ] },
    packed_yes: { patterns: [
      "i packed (it | this | the bag | the suitcase | everything) [myself | by myself] #h:packed_yes",
      "i (did | did it) [myself | by myself] #h:packed_did",
      "(myself | by myself | all by myself)", "(it is | this is) my (bag | suitcase) [i packed it [myself]]", "i packed it [all] (alone | on my own)",
    ] },
    packed_no: { patterns: [
      "(my | a) (wife | husband | friend | partner | mother | mom | mum | son | daughter | family | girlfriend | boyfriend) (did | packed it | packed it for me | helped me)",
      "i did not [pack it] [myself]",
      "not (me | myself)",
      "someone else [did | packed it]",
    ] },
    battery_no: { patterns: [
      "no (batteries | power banks | power bank | nothing like that)",
      "there (are | is) no (batteries | power banks | power bank)",
      "(i do not | we do not) have (any | one) #h:battery_no",
      "(i do not | we do not) have (any | a) (batteries | spare batteries | power bank | power banks) [in (it | there | the bag)]",
      "no i do not think so", "(nothing | none) [like that]", "not that i know of", "i do not think so",
      "no there (are | is) not", "there (are | is) not (any | one)",
      "(it is | they are | my power bank is | the power bank is) in my (carry on | backpack | other bag) #h:battery_carryon",
      "no (batteries | power banks | power bank) (in there | in it | in the bag | in the suitcase | inside)", "[no] (only | just) (my | a) (phone charger | charger | cable | charging cable)",
      "[no] (only | just) (clothes | clothing | my clothes | books | shoes | clothes and shoes)", "i have (it | them | my power bank | my batteries) in my (carry on | backpack | hand luggage #tip:uk_handluggage | other bag | pocket)",
    ] },
    battery_yes: { patterns: [
      "[yes] (i have | there is | i think i have | i think there is | maybe) (a | one | my) (power bank | spare battery | battery | portable charger) [in (it | there | the bag | the suitcase)] #h:battery_yes",
      "[yes] (my | a) (power bank | portable charger | spare battery | camera battery)",
      "yes (there is | i have) one",
      "(there are | i have) (some | two | a few) (batteries | spare batteries)",
      "(there is | i have) (a | my) (laptop | camera | tablet | electric toothbrush) (in it | in there | in the bag | in the suitcase | inside)",
    ] },
    powerbank_q: { patterns: [
      "what is a (power bank | portable charger) #h:q_powerbank",
      "what (are | is) power banks",
      "what do you mean by [a] power bank",
      "what does power bank mean",
    ] },
    what_ctx: { patterns: ["what is (that | it)", "what is that exactly"] },
    ack_done: { patterns: [
      "sure [no problem] #h:ok_sure",
      "(okay | all right) [no problem] #h:ok_okay",
      "(done | all done | i am done | finished | i am finished | ready | i am ready | all set | there | there it is | i did it) #h:moving_done",
      "like this #h:scale_like_this",
      "(is this okay | is that okay | is it okay | is that right)",
      "how about now #h:moving_now",
      "(what about now | how is it now | is it better now)",
      "is it okay now #h:moving_ok",
      "it is on the scale",
      "i moved (some things | a few things | them | it | my {thing})",
      "i took (some things | a few things | them | it | my {thing}) out",
      "i took out @things", "i (moved | put) @things (to | into | in) @carry", "(now | it) should be (okay | fine | good | better | under) [now]",
      "[sure] i will put it (there | on the scale | on it | up there)", "(no problem | sure thing) [here | here you go | here it is]",
    ] },
    scale_where: { patterns: ["where [is it | is the scale | should i put it | do i put it]", "on the scale", "where (do | should) i put (it | my bag | my suitcase)"] },
    move_items: { patterns: [
      "(i will | let me | i can | i am going to | i could | i would like to | i will just) (move | put) @things (to | into | in) @carry #h:ow_move",
      "(i will | let me | i can | i am going to | i could | i will just) (take | move) @things (out | out of it)",
      "(i will | let me | i am going to) take out @things",
      "(can | could | may) i take out @things #h:ow_take_out",
      "(i will | let me | i can | i am going to) repack (it | my bag | my suitcase | the bag | the suitcase)", "(can | could) i repack (it | my bag | my suitcase)",
      "(can | could | may) i (take | move | put) @things (out | to @carry | into @carry | in @carry)",
      "(i will | let me | i am going to) (wear | put on) @things #h:ow_wear",
      "(can | could) i (wear | put on) @things",
      "(i will | let me) (take | move) (them | it | some) out",
      "i do not want to pay [the fee | a fee | for it | that | extra | a hundred dollars]",
      "(move | take out) @things",
      "i would rather (move | take out) @things",
      "[actually] (i will | let me | i am going to | i can) (move | take out | remove) @things [instead]", "(that is | it is) too (expensive | much) [(i will | let me) (move | take out) @things]",
      "i (will | can) put @things in (my | the) (other bag | backpack | carry on | hand luggage #tip:uk_handluggage)",
    ] },
    pay_fee: { patterns: [
      "i will pay [the fee | it | that | for it | the hundred dollars | a hundred dollars | the overweight fee] #h:ow_pay",
      "i will just pay [the fee | it | that]",
      "i would rather pay [the fee]",
      "(can | could) i [just] pay (the fee | for it)", "(can | could) i just pay [extra]",
      "i will pay (by | with) card",
      "i (do not want to | can not | would rather not) (take | move) anything [out]",
      "i do not want to open (it | my bag | my suitcase | the suitcase)",
      "pay the fee",
      "i (will not | am not going to) (take | move) anything [out]", "(it is | that is) (fine | okay) i will pay [it | the fee]", "i will pay (the fee | it) (by | with) card",
    ] },
    pay_card: { patterns: ["[can | could] i pay (by | with) (card | credit card | my card | debit card) #h:fee_card", "(by | with) card", "card", "do you (take | accept) (cards | credit cards)", "(can | could) i (use | pay with) (apple pay | google pay | my phone)", "do you (take | accept) (apple pay | google pay)"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(i will | i would like to) pay (in | with) cash", "cash", "[can | could] i pay cash", "i (only | just) have cash"] },
    ask_fee: { patterns: [
      "how much is (it | that | the fee | the overweight fee) #h:ow_how_much",
      "how much (do | would | will) i (have to | need to) pay",
      "what is the fee", "how much does it cost", "how much (would be | will be) the fee",
    ] },
    ask_over: { patterns: ["how much (over | too heavy) is it", "how many pounds over [is it]", "how much is it over", "how (heavy | much) is it", "what does it weigh", "is it too heavy", "is it (over | overweight | over the limit)", "how much does (it | my bag | my suitcase) weigh", "how heavy is (my | the) (bag | suitcase)"] },
    ask_limit: { patterns: [
      "what is the (weight | bag | baggage) limit #h:q_limit",
      "what is the limit",
      "how (much | heavy) can (it | my bag | a bag | the bag | my suitcase) (weigh | be)",
      "how many (pounds | kilos #tip:us_pounds | kilograms #tip:us_pounds) can i (take | have | check | bring)",
      "is (that | it) in (pounds | kilos #tip:us_pounds | kilograms #tip:us_pounds)",
      "(what is | how much is) (that | it | fifty pounds) in (kilos | kilograms)",
      "how many (kilos | kilograms) is (that | it | fifty pounds)",
      "did you say pounds", "(is it | is that) (pounds | kilos) or (kilos | pounds)",
    ] },
    seat_ans: { patterns: [
      "[a | an | the] {seat} [seat] #h:seat_please",
      "(i would like | i would love) [a | an | the] {seat} seat #h:seat_id_like",
      "(i would like | i would love) to sit {seat}",
      "(can | could | may) i (have | get) [a | an | the] {seat} [seat] #h:seat_can_i",
      "(i would prefer | i prefer) [a | an | the] {seat} [seat] #h:seat_prefer",
      "(i will | let me) (take | have | go with | do) [a | an | the] {seat} [seat]",
      "[a | the] {seat} [seat] (is | would be) (great | good | better | fine | nice | perfect)",
      "[a] seat {seat}",
      "(i want | give me) [a | an | the] {seat} [seat] #blunt",
      "(do you have | is there | are there any | have you got) [a | an | any] {seat} [seat | seats] [available | left | free]",
      "i (like | love | always sit | usually sit | prefer to sit) {seat} [seats]",
      "(can | could | may) i sit {seat}", "i (always | usually) (take | get | choose | sit) [a | an | the] {seat} [seat]", "let us (do | go with) [a | an | the] {seat} [seat]",
      "(what about | how about) [a | an | the] {seat} [seat]", "[a | an | the] {seat} [seat] [please] @reason", "(i would like | i prefer | can i have | i would prefer) [a | an | the] {seat} [seat] @reason",
      "(i will | i would) (take | go with | choose) the {seat} [seat] (then | please)",
    ] },
    seat_any: { patterns: [
      "i do not mind #h:seat_either",
      "(either | any | either one | anything | whatever | both) (is fine | is okay | works | is good) #h:seat_either2",
      "it does not matter", "no preference", "(i have no | i do not have a) preference", "whatever (you have | is available | is free)",
      "i do not care #blunt", "surprise me", "either", "any seat [is fine]", "i am not picky",
      "{seat} or {seat} (it does not matter | i do not mind | i do not care #blunt | either is fine | whatever)", "(anything | any) is fine", "(whatever | anything) you (have | recommend)",
    ] },
    seat_neg: { patterns: [
      "not [a | an | the] {seat} [seat]",
      "no {seat} [seat | seats]",
      "(i do not want | i would rather not have | i would prefer not to have) [a | an | the] {seat} [seat]",
      "anything but [a | an | the] {seat} [seat]",
      "i do not like {seat} seats", "i do not like [the | a] {seat} [seat | seats]",
      "just not [a | an | the] {seat} [seat]",
    ] },
    more_no: { patterns: [
      "(that is | that will be | that would be) (all | it | everything) #h:more_all",
      "no that is (all | it | everything)",
      "nothing else", "[no] i am (good | fine | all set | okay) #h:more_good",
      "no (more | other) questions", "no questions", "i think that is (all | it | everything)",
      "i do not have any [more | other] questions", "that is all i need",
      "(great | perfect | awesome | wonderful | that is great) (thank you | thanks)",
      "(everything is | it is all | all) clear [now]", "[no] i think i am (good | fine | all set | okay)", "[no] i (know | understand) everything", "[no] (that is | it is) (enough | perfect)",
    ] },
    more_q: { patterns: ["i have (a | one) question", "one more (thing | question)", "(actually | yes) one question", "can i ask (a | one) question", "just one question"] },
    ask_ontime: { patterns: [
      "is (the | my | our) flight on time #h:q_ontime",
      "is it on time",
      "(are we | is it | is the flight | is my flight) (on schedule | leaving on time | going to be on time)",
      "will (it | the flight) (be | leave) on time", "(are we | is it) on time",
    ] },
    ask_delayed: { patterns: [
      "is (the | my | our) flight delayed", "is it delayed", "is there (a | any) delay", "(will | is) (it | the flight) (be | going to be) (late | delayed)",
    ] },
    ask_gate: { patterns: [
      "what is my gate #h:q_gate",
      "(what | which) gate [is it | is that | is my flight | do i go to | am i at | number]",
      "where is my gate", "what is the gate [number]", "where is gate [number] {number}", "gate [number] {number} [right | correct | is that right]", "(what | which) gate [number] (again | was it)",
      "(what | which) gate (is | does) (the | my) flight (at | leave from | depart from | board at)",
      "(what | which) gate does (it | my flight | the flight) (leave | depart | board) from",
    ] },
    ask_boarding_time: { patterns: [
      "what time (does boarding start | is boarding | do we board | do i board | does the flight leave | is my flight | does it leave | do we leave | is departure | does the plane leave) #h:q_boarding",
      "when (does boarding start | is boarding | do we board | does the flight leave | does it leave | can i board | do i need to be at the gate | does the plane leave | do we leave)",
      "what time should i be at the gate", "when (should | do) i (be | get) at the gate", "what time is (boarding | the flight)", "boarding (is | starts) at {time} [right | correct | is that right]", "boarding at {time} [right | correct]",
    ] },
    ask_security: { patterns: [
      "where is security #h:q_security",
      "where is (the security check | the security checkpoint | security control | the security line | the tsa checkpoint | the tsa)",
      "how do i get to security", "where do i go (now | next | from here)", "which way (to | is) security", "where should i go (now | next)",
    ] },
    ask_duration: { patterns: [
      "how long is the flight", "how long does the flight take", "how long does it take [to get to {city}]",
      "what time do we (get | arrive) (in | to) {city}", "when do we (land | arrive) [in {city}]", "what time do we land",
    ] },
    ask_carryon: { patterns: [
      "can i (take | bring | keep) (this | my) (bag | backpack | suitcase) (on board | on the plane | with me) #h:q_carryon",
      "can i take (this | it) on (board | the plane)",
      "is (this | my) (backpack | bag) (okay | fine) (as a carry on | for the cabin)",
      "can i take my (carry on | backpack | hand luggage #tip:uk_handluggage) (on board | with me | on the plane)",
      "is this (okay | fine) as a carry on",
    ] },
    ask_seatnum: { patterns: ["what is my seat [number]", "where am i sitting", "(which | what) seat (am i in | is it | do i have)"] },
    ask_bagfee: { patterns: [
      "is there a (fee | charge) for (the | my) (bag | suitcase | luggage) #h:q_fee",
      "do i (have | need) to pay for (the | my) (bag | suitcase | luggage)",
      "how much (is it | does it cost) to check (a | my) (bag | suitcase)",
      "is (the | my) (bag | suitcase) (free | included)",
    ] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | men's room | ladies room)", "where is the toilet #tip:us_restroom",
      "is there a (restroom | bathroom) (near here | nearby)", "where can i find (a | the) (restroom | bathroom)", "where can i find (a | the) toilet #tip:us_restroom",
    ] },
  },

  lines: {
    greet: [
      t("Good | morning!", "Labas | rytas!", "Labas rytas!"),
      t("Hi there!", "Sveiki!", "Sveiki!"),
      t("Hi! | I | can | help | you | over | here.", "Sveiki! | Aš | galiu | padėti | jums | — | čia.", "Sveiki! Prieikite, aš jums padėsiu.",
        { flags: { 5: "“over” (over here): no separate Lithuanian word; čia carries the place." } }),
    ],
    greet_howareyou: [
      t("Hi there! | How | are | you | today?", "Sveiki! | Kaip | sekasi | jums | šiandien?", "Sveiki! Kaip jums šiandien sekasi?"),
      t("Good | morning! | How | are | you | doing?", "Labas | rytas! | Kaip | — | jums | sekasi?", "Labas rytas! Kaip sekasi?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
    ],
    greet_checkin: [
      t("Hi! | Checking in?", "Sveiki! | Registruojatės?", "Sveiki! Registruojatės skrydžiui?"),
      t("Good | morning! | Are | you | checking in?", "Labas | rytas! | Ar | jūs | registruojatės?", "Labas rytas! Registruojatės skrydžiui?",
        { flags: { 2: "“Are” in a yes/no question = the particle ar (C-Q); registruojatės carries the progressive (linked to “checking in”)." } }),
    ],
    ask_checkin: [
      t("Are | you | checking in?", "Ar | jūs | registruojatės?", "Registruojatės skrydžiui?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar (C-Q); registruojatės carries the progressive (linked to “checking in”)." } }),
    ],
    yes_right_here: [
      t("Yes, | right | here!", "Taip, | štai | čia!", "Taip, čia!"),
    ],
    weigh_first: [
      t("Let's | weigh | it | first.", "— | Pasverkime | jį | pirmiausia.", "Pirmiausia jį pasverkime.",
        { flags: { 0: "“Let's” has no separate word: the first-person plural imperative pasverkime carries it (linked to “weigh”)." } }),
    ],
    delayed_no: [
      t("No, | it's | on time | today.", "Ne, | jis vyksta | laiku | šiandien.", "Ne, šiandien skrydis vyksta laiku."),
      t("No, | right now | it's | on time.", "Ne, | šiuo metu | jis vyksta | laiku.", "Ne, šiuo metu skrydis vyksta laiku."),
    ],
    hello_great: [
      t("Great!", "Puiku!", "Puiku!"),
      t("Perfect!", "Puiku!", "Puiku!"),
    ],
    checkin_ack: [
      t("Sure!", "Žinoma!", "Žinoma!"),
      t("Of course!", "Žinoma!", "Žinoma!"),
      t("Great!", "Puiku!", "Puiku!"),
    ],
    no_help: [
      t("No | problem. | I'm | here | if | you | need | me.", "Jokių | problemų. | Aš esu | čia, | jei | jums | prireiks | manęs.", "Jokių problemų. Jei prireiks, aš čia."),
    ],
    ask_dest: [
      t("Where | are | you | flying | today?", "Kur | — | jūs | skrendate | šiandien?", "Kur šiandien skrendate?",
        { flags: { 1: "Progressive “are” has no Lithuanian word; skrendate carries the tense (linked to “flying”)." } }),
      t("Where | are | you | headed | today?", "Kur | — | jūs | keliaujate | šiandien?", "Kur šiandien keliaujate?",
        { flags: { 1: "“are … headed” = keliaujate; “are” has no separate Lithuanian word (linked to “headed”)." } }),
      t("Where | are | you | flying | to | today?", "Kur | — | jūs | skrendate | — | šiandien?", "Kur šiandien skrendate?",
        { flags: { 1: "Progressive “are” has no Lithuanian word; skrendate carries the tense (linked to “flying”).", 4: "Stranded “to”: its meaning sits in the question word kur (linked to “Where”)." } }),
    ],
    dest_ack: [
      t("{X}, | great.", "{X:nom}, | puiku.", "{X:nom} – puiku."),
      t("Great.", "Puiku.", "Puiku."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    dest_wrong: [
      t("Hmm, | I | don't see | a | reservation | to | {X} | today.", "Hmm, | aš | nematau | — | rezervacijos | į | {X:acc} | šiandien.", "Hmm, šiandien nematau rezervacijos į {X:acc}."),
    ],
    dest_only_boston: [
      t("I | only | see | one | to | Boston.", "Aš | tik | matau | vieną | į | Bostoną.", "Matau tik rezervaciją į Bostoną."),
    ],
    dest_confirm_q: [
      t("Are | you | flying | to | Boston?", "Ar | jūs | skrendate | į | Bostoną?", "Ar skrendate į Bostoną?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar (C-Q); skrendate carries the progressive (linked to “flying”)." } }),
      t("Is | that | your | flight?", "Ar | tai | jūsų | skrydis?", "Ar tai jūsų skrydis?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    check_passport: [
      t("Okay. | I'll check | with | your | passport.", "Gerai. | Patikrinsiu | pagal | jūsų | pasą.", "Gerai. Patikrinsiu pagal jūsų pasą."),
    ],
    flight_ack: [
      t("Flight | 223 | to | Boston, | great.", "Skrydis | 223 | į | Bostoną, | puiku.", "Skrydis 223 į Bostoną – puiku.", { say: "Flight two twenty-three to Boston, great." }),
    ],
    flight_wrong: [
      t("Hmm, | your | reservation | is | for flight | 223 | to | Boston.", "Hmm, | jūsų | rezervacija | yra | skrydžiui | 223 | į | Bostoną.", "Hmm, jūsų rezervacija – skrydžiui 223 į Bostoną.",
        { say: "Hmm, your reservation is for flight two twenty-three to Boston." }),
    ],
    dest_neg_ack: [
      t("Oh, | sorry! | Where | are | you | flying, | then?", "O, | atsiprašau! | Kur | — | jūs | skrendate, | tada?", "O, atsiprašau! Tai kur skrendate?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; skrendate carries the tense (linked to “flying”)." } }),
    ],
    lookup_help: [
      t("No | problem. | I | can | find | your | flight | with | your | passport.", "Jokių | problemų. | Aš | galiu | rasti | jūsų | skrydį | pagal | jūsų | pasą.", "Jokių problemų, skrydį rasiu pagal jūsų pasą."),
    ],
    ask_passport: [
      t("Can | I | see | your | passport, | please?", "Ar galiu | aš | pamatyti | jūsų | pasą, | prašau?", "Ar galiu pamatyti jūsų pasą?"),
      t("May | I | see | your | ID, | please?", "Ar galėčiau | aš | pamatyti | jūsų | asmens dokumentą, | prašau?", "Ar galėčiau pamatyti jūsų asmens dokumentą?"),
      t("Could | I | get | your | passport, | please?", "Ar galėčiau | aš | gauti | jūsų | pasą, | prašau?", "Ar galėčiau gauti jūsų pasą?"),
    ],
    pp_thanks: [
      t("Thank | you.", "Dėkoju | jums.", "Ačiū."),
      t("Thanks!", "Ačiū!", "Ačiū!"),
      t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
    ],
    found_booking: [
      t("Okay, | flight | 223 | to | Boston, | departing | at | 8:10.", "Gerai, | skrydis | 223 | į | Bostoną, | išskrenda | — | 8:10.", "Gerai, skrydis 223 į Bostoną, išskrenda 8:10.",
        { say: "Okay, flight two twenty-three to Boston, departing at eight ten.", flags: { 6: "Clock-time “at” has no separate Lithuanian word: the time follows the verb directly (linked to 8:10)." } }),
      t("Great, | I | found | your | reservation: | flight | 223 | to | Boston.", "Puiku, | aš | radau | jūsų | rezervaciją: | skrydis | 223 | į | Bostoną.", "Puiku, radau jūsų rezervaciją: skrydis 223 į Bostoną.",
        { say: "Great, I found your reservation: flight two twenty-three to Boston." }),
    ],
    found_lookup: [
      t("Okay, | I | see | you're flying | to | Boston | today.", "Gerai, | aš | matau, | skrendate | į | Bostoną | šiandien.", "Gerai, matau, kad šiandien skrendate į Bostoną."),
    ],
    pp_yes: [
      t("Yes, | your | passport, | please.", "Taip, | jūsų | pasą, | prašau.", "Taip, pasą, prašau."),
    ],
    pp_only: [
      t("I | just | need | your | passport | for now.", "Man | tik | reikia | jūsų | paso | kol kas.", "Kol kas man reikia tik jūsų paso."),
    ],
    bp_updated: [
      t("I | updated | your | boarding | pass.", "Aš | atnaujinau | jūsų | įlaipinimo | kortelę.", "Atnaujinau jūsų įlaipinimo kortelę."),
    ],
    pp_have: [
      t("I | already | have | it, | thanks.", "Aš | jau | turiu | jį, | ačiū.", "Jį jau turiu, ačiū."),
    ],
    find_first: [
      t("Let | me | find | your | reservation | first.", "Leiskite | man | rasti | jūsų | rezervaciją | pirmiausia.", "Pirmiausia surasiu jūsų rezervaciją."),
    ],
    ask_bags: [
      t("Are | you | checking | any | bags | today?", "Ar | jūs | registruojate | kokį nors | bagažą | šiandien?", "Ar šiandien registruojate bagažą?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar (C-Q); registruojate carries the progressive (linked to “checking”)." } }),
      t("How many | bags | are | you | checking?", "Kiek | lagaminų | — | jūs | registruojate?", "Kiek lagaminų registruojate?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; registruojate carries the tense (linked to “checking”)." } }),
      t("Do | you | have | any | bags | to check?", "Ar | jūs | turite | kokių nors | lagaminų | registruoti?", "Ar turite bagažo, kurį registruosite?",
        { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    bags_how_many: [
      t("Great. | How many?", "Puiku. | Kiek?", "Puiku. Kiek?"),
      t("Sure. | How many | bags?", "Gerai. | Kiek | lagaminų?", "Gerai. Kiek lagaminų?"),
    ],
    bags_ack_one: [
      t("Okay, | one | bag.", "Gerai, | vienas | lagaminas.", "Gerai, vienas lagaminas."),
      t("One | bag. | Got it.", "Vienas | lagaminas. | Supratau.", "Vienas lagaminas. Supratau."),
    ],
    bags_ack_n: [
      t("{$num} | bags, | okay.", "{$num} | lagaminai, | gerai.", "{$num} lagaminai – gerai."),
    ],
    bags_none_ack: [
      t("Okay, | no | checked | bags.", "Gerai, | jokio | registruoto | bagažo.", "Gerai, bagažo neregistruojate."),
    ],
    ask_packed: [
      t("Did | you | pack | this | bag | yourself?", "Ar | jūs | susikrovėte | šį | lagaminą | {m:pats|f:pati}?", "Ar šį lagaminą susikrovėte {m:pats|f:pati}?",
        { flags: { 0: "“Did” in a yes/no question = the particle ar; the past tense sits on susikrovėte (linked to “pack”)." } }),
    ],
    ask_packed_many: [
      t("Did | you | pack | these | bags | yourself?", "Ar | jūs | susikrovėte | šiuos | lagaminus | {m:pats|f:pati}?", "Ar šiuos lagaminus susikrovėte {m:pats|f:pati}?",
        { flags: { 0: "“Did” in a yes/no question = the particle ar; the past tense sits on susikrovėte (linked to “pack”)." } }),
    ],
    packed_ok: [
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    packed_follow: [
      t("Okay. | Do | you | know | what's | inside?", "Gerai. | Ar | jūs | žinote, | kas yra | viduje?", "Gerai. Ar žinote, kas viduje?",
        { flags: { 1: "Question “Do” = the particle ar." } }),
    ],
    packed_follow_ok: [
      t("Okay, | thanks.", "Gerai, | ačiū.", "Gerai, ačiū."),
    ],
    ask_battery: [
      t("Are | there | any | spare | batteries | or | power banks | in the bag?", "Ar yra | — | kokių nors | atsarginių | baterijų | ar | išorinių baterijų | lagamine?", "Ar lagamine yra atsarginių baterijų ar išorinių baterijų?",
        { flags: { 1: "Existential “there” has no Lithuanian word: yra carries it (linked to “Are”)." } }),
      t("Any | power banks | or | lithium | batteries | in it?", "Kokių nors | išorinių baterijų | ar | ličio | baterijų | jame?", "Ar jame yra išorinių baterijų ar ličio baterijų?"),
    ],
    ask_battery_many: [
      t("Are | there | any | spare | batteries | or | power banks | in the bags?", "Ar yra | — | kokių nors | atsarginių | baterijų | ar | išorinių baterijų | lagaminuose?", "Ar lagaminuose yra atsarginių baterijų ar išorinių baterijų?",
        { flags: { 1: "Existential “there” has no Lithuanian word: yra carries it (linked to “Are”)." } }),
    ],
    battery_ok: [
      t("Great, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
      t("Okay, | perfect.", "Gerai, | puiku.", "Gerai, puiku."),
    ],
    battery_move: [
      t("Power banks | need | to go | in | your | carry-on. | Could | you | move | it, | please?", "Išorinės baterijos | turi | keliauti | — | jūsų | rankiniame bagaže. | Ar galėtumėte | jūs | perkelti | ją, | prašau?", "Išorinės baterijos turi keliauti rankiniame bagaže. Ar galėtumėte ją perkelti?",
        { flags: { 3: "“in” has no separate word: the locative rankiniame bagaže carries it across “your”." } }),
    ],
    battery_move_q: [
      t("Could | you | move | it | to | your | carry-on, | please?", "Ar galėtumėte | jūs | perkelti | ją | į | savo | rankinį bagažą, | prašau?", "Ar galėtumėte ją perkelti į rankinį bagažą?"),
    ],
    battery_must: [
      t("Sorry, | it | can't go | in | a | checked | bag.", "Atsiprašau, | ji | negali keliauti | — | — | registruotame | bagaže.", "Atsiprašau, jos negalima vežti registruotame bagaže.",
        { flags: { 3: "“in” has no separate word: the locative registruotame bagaže carries it across “checked”." } }),
    ],
    battery_thanks: [
      t("Thank | you!", "Dėkoju | jums!", "Ačiū!"),
      t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
    ],
    battery_unsure: [
      t("That's | okay. | If | you | have | a | power bank, | please | keep | it | in | your | carry-on.", "Tai | gerai. | Jei | jūs | turite | — | išorinę bateriją, | prašau, | laikykite | ją | — | savo | rankiniame bagaže.", "Nieko tokio. Jei turite išorinę bateriją, laikykite ją rankiniame bagaže.",
        { flags: { 10: "“in” has no separate word: the locative rankiniame bagaže carries it across “your”." } }),
    ],
    powerbank_what: [
      t("It's | a | portable | charger | for | your | phone.", "Tai yra | — | nešiojamasis | įkroviklis | — | jūsų | telefonui.", "Tai nešiojamasis telefono įkroviklis.",
        { flags: { 4: "“for” has no separate word: the dative telefonui carries it across “your”." } }),
    ],
    ask_scale: [
      t("Could | you | put | it | on | the | scale, | please?", "Ar galėtumėte | jūs | padėti | jį | ant | — | svarstyklių, | prašau?", "Ar galėtumėte padėti jį ant svarstyklių?"),
      t("Go ahead | and | put | your | bag | on | the | scale.", "Prašom | — | padėti | savo | lagaminą | ant | — | svarstyklių.", "Prašom padėti lagaminą ant svarstyklių.",
        { flags: { 1: "“and” joins “go ahead” to the next verb; Lithuanian uses the infinitive after prašom (linked to “put”)." } }),
      t("Can | you | put | it | on | the | scale | for me?", "Ar galite | jūs | padėti | jį | ant | — | svarstyklių | man?", "Ar galite padėti jį ant svarstyklių?"),
    ],
    ask_scale_many: [
      t("Could | you | put | them | on | the | scale, | one at a time?", "Ar galėtumėte | jūs | padėti | juos | ant | — | svarstyklių, | po vieną?", "Ar galėtumėte dėti juos ant svarstyklių po vieną?"),
    ],
    scale_where: [
      t("Right | here, | next to | the | counter.", "Štai | čia, | šalia | — | stalo.", "Štai čia, šalia stalo."),
    ],
    weigh_ok: [
      t("{$lbs} | pounds. | You're | good.", "{$lbs} | svarai. | Jums | viskas gerai.", "{$lbs} svarai – viskas gerai."),
      t("Perfect, | {$lbs} | pounds.", "Puiku, | {$lbs} | svarai.", "Puiku, {$lbs} svarai."),
      t("That's | {$lbs} | pounds. | No | problem.", "Tai yra | {$lbs} | svarai. | Jokių | problemų.", "{$lbs} svarai – jokių problemų."),
    ],
    weigh_ok_two: [
      t("Both | are | under | 50 | pounds. | Perfect.", "Abu | sveria | mažiau nei | 50 | svarų. | Puiku.", "Abu sveria mažiau nei 50 svarų. Puiku.", { say: "Both are under fifty pounds. Perfect." }),
    ],
    weigh_ok_many: [
      t("They're | all | under | 50 | pounds. | Perfect.", "Jie sveria | visi | mažiau nei | 50 | svarų. | Puiku.", "Visi sveria mažiau nei 50 svarų. Puiku.", { say: "They're all under fifty pounds. Perfect." }),
    ],
    ow_result: [
      t("Hmm, | it's | 53 | pounds. | The | limit | is | 50.", "Hmm, | jis sveria | 53 | svarus. | — | Limitas | yra | 50.", "Hmm, jis sveria 53 svarus, o limitas – 50.",
        { say: "Hmm, it's fifty-three pounds. The limit is fifty." }),
      t("Oh, | it's | 3 | pounds | over: | 53, | and | the | limit | is | 50.", "O, | jis sveria | 3 | svarais | per daug: | 53, | o | — | limitas | yra | 50.", "O, jis 3 svarais per sunkus: sveria 53, o limitas – 50.",
        { say: "Oh, it's three pounds over: fifty-three, and the limit is fifty." }),
    ],
    ow_result_many: [
      t("Hmm, | this one | is | 53 | pounds. | The | limit | is | 50.", "Hmm, | šis | sveria | 53 | svarus. | — | Limitas | yra | 50.", "Hmm, šis sveria 53 svarus, o limitas – 50.",
        { say: "Hmm, this one is fifty-three pounds. The limit is fifty." }),
    ],
    ow_options: [
      t("There's | a | $100 | fee | for | overweight | bags, | or | you | can | move | a | few | things | to | your | carry-on.", "Yra | — | 100 $ | mokestis | už | per sunkius | lagaminus, | arba | jūs | galite | perkelti | — | kelis | daiktus | į | savo | rankinį bagažą.", "Už per sunkų lagaminą imamas 100 $ mokestis, arba galite perkelti kelis daiktus į rankinį bagažą.",
        { say: "There's a hundred-dollar fee for overweight bags, or you can move a few things to your carry-on." }),
      t("You | can | move | a | few | things | to | your | carry-on, | or | pay | a | $100 | fee.", "Jūs | galite | perkelti | — | kelis | daiktus | į | savo | rankinį bagažą, | arba | sumokėti | — | 100 $ | mokestį.", "Galite perkelti kelis daiktus į rankinį bagažą arba sumokėti 100 $ mokestį.",
        { say: "You can move a few things to your carry-on, or pay a hundred-dollar fee." }),
    ],
    ow_ask: [
      t("Would | you | like | to move | some | things, | or | pay | the | fee?", "Ar | jūs | norėtumėte | perkelti | kelis | daiktus, | ar | sumokėti | — | mokestį?", "Norėtumėte perkelti kelis daiktus ar sumokėti mokestį?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    ow_move_ok: [
      t("Sure, | take your time.", "Žinoma, | neskubėkite.", "Žinoma, neskubėkite."),
      t("No | problem. | Go ahead.", "Jokių | problemų. | Prašom.", "Jokių problemų, prašom."),
    ],
    ow_moving_ask: [
      t("Tell | me | when | you're | ready.", "Pasakykite | man, | kai | būsite | {m:pasiruošęs|f:pasiruošusi}.", "Pasakykite, kai būsite {m:pasiruošęs|f:pasiruošusi}.",
        { flags: { 3: "“you're” refers to the future here: Lithuanian uses būsite after kai." } }),
    ],
    ow_reweigh: [
      t("Okay, | {$lbs} | pounds. | Perfect!", "Gerai, | {$lbs} | svarai. | Puiku!", "Gerai, {$lbs} svarai. Puiku!"),
      t("Let's | try | again... | {$lbs} | pounds. | You're | good!", "— | Pabandykime | dar kartą... | {$lbs} | svarai. | Jums | viskas gerai!", "Pabandykime dar kartą… {$lbs} svarai. Viskas gerai!",
        { flags: { 0: "“Let's” has no separate word: the first-person plural imperative pabandykime carries it (linked to “try”)." } }),
    ],
    ow_fee_card: [
      t("Okay, | that'll be | $100. | You | can | tap | your | card | here.", "Gerai, | tai bus | 100 $. | Jūs | galite | pridėti | savo | kortelę | čia.", "Gerai, tai bus 100 $. Galite pridėti kortelę čia.",
        { say: "Okay, that'll be a hundred dollars. You can tap your card here." }),
    ],
    ow_fee_ask: [
      t("Just | tap | your | card | here.", "Tiesiog | pridėkite | savo | kortelę | čia.", "Tiesiog pridėkite kortelę čia."),
    ],
    ow_fee_paid: [
      t("Thank | you. | You're | all set.", "Dėkoju | jums. | Jums | viskas sutvarkyta.", "Ačiū, viskas sutvarkyta."),
    ],
    ow_card_only: [
      t("Sorry, | we | only | take | cards.", "Atsiprašau, | mes | tik | priimame | korteles.", "Atsiprašau, priimame tik korteles."),
    ],
    ow_fee_amount: [
      t("It's | $100.", "Tai kainuoja | 100 $.", "Tai kainuoja 100 $.", { say: "It's a hundred dollars." }),
    ],
    ow_over: [
      t("Just | 3 | pounds.", "Tik | 3 | svarais.", "Tik trimis svarais.", { say: "Just three pounds." }),
    ],
    limit: [
      t("The | limit | is | 50 | pounds, | about | 23 | kilos.", "— | Limitas | yra | 50 | svarų, | maždaug | 23 | kilogramai.", "Limitas – 50 svarų, tai yra maždaug 23 kilogramai.",
        { say: "The limit is fifty pounds, about twenty-three kilos." }),
    ],
    no_need_bag: [
      t("No need. | Your | bag | is | under | 50 | pounds.", "Nereikia. | Jūsų | lagaminas | sveria | mažiau nei | 50 | svarų.", "Nereikia – jūsų lagaminas sveria mažiau nei 50 svarų.",
        { say: "No need. Your bag is under fifty pounds." }),
    ],
    nothing_to_pay: [
      t("There's | nothing | to pay | today.", "Nėra | nieko | mokėti | šiandien.", "Šiandien nieko mokėti nereikia.",
        { flags: { 0: "Negative concord: nėra takes its ne- from “nothing” (linked to “nothing”)." } }),
    ],
    ask_seat: [
      t("Window | or | aisle?", "Prie lango | ar | prie praėjimo?", "Prie lango ar prie praėjimo?"),
      t("Would | you | like | a | window | or | an | aisle | seat?", "Ar | jūs | norėtumėte | — | prie lango | ar | — | prie praėjimo | vietos?", "Ar norėtumėte vietos prie lango ar prie praėjimo?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Do | you | have | a | seat | preference?", "Ar | jūs | turite | — | vietos | pageidavimą?", "Ar turite pageidavimų dėl vietos?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    seat_help: [
      t("A | window | seat | has | a | nice | view, | and | an | aisle | seat | is | easier | if | you | want | to get up.", "— | Prie lango | vieta | turi | — | gražų | vaizdą, | o | — | prie praėjimo | vieta | yra | patogesnė, | jei | jūs | norite | atsistoti.", "Prie lango – gražus vaizdas, o prie praėjimo patogiau, jei norite atsistoti."),
    ],
    seat_window: [
      t("Okay, | seat | 12A, | by | the | window.", "Gerai, | vieta | 12A, | prie | — | lango.", "Gerai, vieta 12A, prie lango.", { say: "Okay, seat twelve A, by the window." }),
      t("I | have | a | window | seat | for you: | 12A.", "Aš | turiu | — | prie lango | vietą | jums: | 12A.", "Turiu jums vietą prie lango – 12A.", { say: "I have a window seat for you: twelve A." }),
    ],
    seat_aisle: [
      t("Okay, | seat | 14C, | on | the | aisle.", "Gerai, | vieta | 14C, | prie | — | praėjimo.", "Gerai, vieta 14C, prie praėjimo.", { say: "Okay, seat fourteen C, on the aisle." }),
      t("I | have | an | aisle | seat | for you: | 14C.", "Aš | turiu | — | prie praėjimo | vietą | jums: | 14C.", "Turiu jums vietą prie praėjimo – 14C.", { say: "I have an aisle seat for you: fourteen C." }),
    ],
    seat_middle: [
      t("Okay, | seat | 23B, | in the middle.", "Gerai, | vieta | 23B, | viduryje.", "Gerai, vieta 23B, viduryje.", { say: "Okay, seat twenty-three B, in the middle." }),
    ],
    seat_any_ack: [
      t("No | problem.", "Jokių | problemų.", "Jokių problemų."),
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
    ],
    seat_pref_ack: [
      t("Sure, | I'll find | you | {X.np} | seat.", "Žinoma, | surasiu | jums | {X.np:acc} | vietą.", "Žinoma, surasiu jums vietą {X:acc}."),
    ],
    seat_neg_q: [
      t("So, | {X.np} | seat?", "Tai | {X.np:nom} | vieta?", "Tai vieta {X:nom}?"),
    ],
    seat_neg_both: [
      t("Sure. | Window | or | aisle, | then?", "Žinoma. | Prie lango | ar | prie praėjimo, | tada?", "Žinoma. Tai prie lango ar prie praėjimo?"),
    ],
    no_window: [
      t("Sorry, | the | window | seats | are | all | taken.", "Atsiprašau, | — | prie lango | vietos | yra | visos | užimtos.", "Atsiprašau, visos vietos prie lango užimtos."),
    ],
    no_window_q: [
      t("Is | an | aisle | seat | okay?", "Ar | — | prie praėjimo | vieta | tinka?", "Ar tiks vieta prie praėjimo?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }),
    ],
    no_window_middle: [
      t("The | only | other | seat | is | a | middle | seat, | 23B. | Is | that | okay?", "— | Vienintelė | kita | vieta | yra | — | vidurinė | vieta, | 23B. | Ar | tai | tinka?", "Vienintelė kita laisva vieta – viduryje, 23B. Ar tiks?",
        { say: "The only other seat is a middle seat, twenty-three B. Is that okay?", flags: { 9: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }),
    ],
    no_window_last: [
      t("Okay, | I'll keep | you | on | the | aisle, | 14C.", "Gerai, | paliksiu | jus | prie | — | praėjimo, | 14C.", "Gerai, paliksiu jus prie praėjimo – 14C.", { say: "Okay, I'll keep you on the aisle, fourteen C." }),
    ],
    bp_give: [
      t("Here's | your | boarding | pass.", "Štai | jūsų | įlaipinimo | kortelė.", "Štai jūsų įlaipinimo kortelė."),
      t("And | here's | your | boarding | pass.", "O | štai | jūsų | įlaipinimo | kortelė.", "O štai jūsų įlaipinimo kortelė."),
    ],
    bp_info: [
      t("Boarding | starts | at | 7:30 | at | gate | 8.", "Įlaipinimas | prasideda | — | 7:30 | prie | vartų | 8.", "Įlaipinimas prasidės pusę aštuonių prie 8-ųjų vartų.",
        { say: "Boarding starts at seven thirty at gate eight.", flags: { 2: "Clock-time “at” has no separate Lithuanian word: the time follows the verb directly (linked to 7:30)." } }),
      t("Your | gate | is | 8, | and | boarding | starts | at | 7:30.", "Jūsų | vartai | yra | 8, | o | įlaipinimas | prasideda | — | 7:30.", "Jūsų vartai – aštuntieji, o įlaipinimas prasidės pusę aštuonių.",
        { say: "Your gate is eight, and boarding starts at seven thirty.", flags: { 7: "Clock-time “at” has no separate Lithuanian word: the time follows the verb directly (linked to 7:30)." } }),
    ],
    bag_tag: [
      t("And | here's | your | bag | tag.", "O | štai | jūsų | bagažo | kvitas.", "O štai jūsų bagažo kvitas."),
      t("Here's | your | baggage | claim | tag.", "Štai | jūsų | bagažo | atsiėmimo | kvitas.", "Štai jūsų bagažo kvitas."),
    ],
    ask_questions: [
      t("Do | you | have | any | questions?", "Ar | jūs | turite | kokių nors | klausimų?", "Ar turite klausimų?", { flags: { 0: "Question “Do” = the particle ar." } }),
      t("Any | questions?", "Kokių nors | klausimų?", "Turite klausimų?"),
    ],
    ask_more: [
      t("Anything | else?", "Ką nors | daugiau?", "Dar ko nors?"),
      t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Dar kokių nors klausimų?"),
    ],
    what_q: [
      t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite."),
    ],
    ontime_yes: [
      t("Yes, | right now | it's | on time.", "Taip, | šiuo metu | jis vyksta | laiku.", "Taip, šiuo metu skrydis vyksta laiku."),
      t("Yes, | it's | on time | today.", "Taip, | jis vyksta | laiku | šiandien.", "Taip, šiandien skrydis vyksta laiku."),
    ],
    gate_is: [
      t("It's | gate | 8.", "Tai yra | vartai | 8.", "Aštuntieji vartai.", { say: "It's gate eight." }),
    ],
    boarding_time: [
      t("Boarding | starts | at | 7:30, | and | departure | is | at | 8:10.", "Įlaipinimas | prasideda | — | 7:30, | o | išvykimas | yra | — | 8:10.", "Įlaipinimas prasidės pusę aštuonių, o lėktuvas išskris 8:10.",
        { say: "Boarding starts at seven thirty, and departure is at eight ten.", flags: {
          2: "Clock-time “at” has no separate Lithuanian word: the time follows the verb directly (linked to 7:30).",
          7: "Clock-time “at” has no separate Lithuanian word (linked to 8:10)." } }),
    ],
    security_dir: [
      t("Security | is | over | there, | on the left.", "Saugumo patikra | yra | — | ten, | kairėje.", "Saugumo patikra – ten, kairėje.",
        { flags: { 2: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
      t("Security | is | straight | ahead, | past | the | café.", "Saugumo patikra | yra | tiesiai | priekyje, | už | — | kavinės.", "Saugumo patikra – tiesiai, už kavinės."),
    ],
    duration: [
      t("It's | about | an | hour | and | a | half.", "Tai yra | maždaug | — | valanda | ir | — | pusė.", "Maždaug pusantros valandos."),
    ],
    carryon_ok: [
      t("Sure, | that | backpack | is fine | as | a | carry-on.", "Žinoma, | ta | kuprinė | tinka | kaip | — | rankinis bagažas.", "Žinoma, ta kuprinė tinka kaip rankinis bagažas."),
    ],
    seatnum: [
      t("Your | seat | is | {$seat}.", "Jūsų | vieta | yra | {$seat}.", "Jūsų vieta – {$seat}."),
    ],
    bagfee_info: [
      t("No, | one | checked | bag | is | included | with | your | ticket.", "Ne, | vienas | registruotas | lagaminas | yra | įskaičiuotas | į | jūsų | bilietą.", "Ne, vienas registruotas lagaminas įskaičiuotas į bilieto kainą."),
    ],
    restroom: [
      t("The | restrooms | are | over | there, | next to | the | café.", "— | Tualetai | yra | — | ten, | šalia | — | kavinės.", "Tualetai – ten, šalia kavinės.",
        { flags: { 3: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
    ],
    bye_flight: [
      t("Have | a | nice | flight!", "Linkiu | — | malonaus | skrydžio!", "Malonaus skrydžio!"),
      t("Have | a | great | trip!", "Linkiu | — | puikios | kelionės!", "Puikios kelionės!"),
      t("Enjoy | your | flight!", "Mėgaukitės | savo | skrydžiu!", "Malonaus skrydžio!"),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    thanks_short: [
      t("Thanks.", "Ačiū.", "Ačiū."),
    ],
  },

  domains: {
    lbs: () => [44, 46, 47, 49],
    num: () => Object.values(NUM_WORD),
    seat: () => Object.values(SEAT_NO),
  },

  hints: {
    dest: {
      lt: "Pasakyti, kur skrendi", slot: "city", examples: ["boston"],
      items: [
        { id: "dest_to", s: t("To | {X}, | please.", "Į | {X:acc}, | prašau.", "Į {X:acc}, prašau.") },
        { id: "dest_flying", s: t("I'm flying | to | {X}.", "Skrendu | į | {X:acc}.", "Skrendu į {X:acc}.") },
        { id: "dest_checkin", s: t("I'd like | to check in | for | my | flight | to | {X}.", "Norėčiau | užsiregistruoti | — | savo | skrydžiui | į | {X:acc}.", "Norėčiau užsiregistruoti skrydžiui į {X:acc}.",
          { flags: { 2: "“for” has no separate word: the dative skrydžiui carries it across “my”." } }) },
        { id: "checkin_simple", s: t("Hi! | I'd like | to check in, | please.", "Sveiki! | Norėčiau | užsiregistruoti, | prašau.", "Sveiki! Norėčiau užsiregistruoti.") },
        { id: "dest_going", s: t("I'm going | to | {X}.", "Vykstu | į | {X:acc}.", "Vykstu į {X:acc}.") },
      ],
    },
    hello: {
      lt: "Pasakyti, kad nori užsiregistruoti",
      items: [
        { id: "checkin_simple", s: t("Yes, | I'd like | to check in.", "Taip, | norėčiau | užsiregistruoti.", "Taip, norėčiau užsiregistruoti.") },
        { id: "dest_checkin", s: t("I'd like | to check in | for | my | flight | to | Boston.", "Norėčiau | užsiregistruoti | — | savo | skrydžiui | į | Bostoną.", "Norėčiau užsiregistruoti skrydžiui į Bostoną.",
          { flags: { 2: "“for” has no separate word: the dative skrydžiui carries it across “my”." } }) },
      ],
    },
    confirm: {
      lt: "Patvirtinti skrydį",
      items: [
        { id: "yes_right", s: t("Yes, | that's | right.", "Taip, | tai yra | teisinga.", "Taip, teisingai.") },
        { id: "dest_to", s: t("Yes, | to | Boston.", "Taip, | į | Bostoną.", "Taip, į Bostoną.") },
      ],
    },
    passport: {
      lt: "Paduoti pasą",
      items: [
        { id: "pp_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "pp_heres", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "pp_here", s: t("Sure, | here | you | are.", "Žinoma, | štai | jums | —.", "Žinoma, prašom.",
          { flags: { 3: "“are” (here you are): no Lithuanian word; Štai jums hands it over." } }) },
      ],
    },
    bags: {
      lt: "Pasakyti, kiek lagaminų registruosi",
      items: [
        { id: "bags_one", s: t("Just | one | bag.", "Tik | vieną | lagaminą.", "Tik vieną lagaminą.") },
        { id: "bags_this", s: t("Just | this | suitcase.", "Tik | šį | lagaminą.", "Tik šį lagaminą.") },
        { id: "bags_checking", s: t("I'm checking | one | bag.", "Registruoju | vieną | lagaminą.", "Registruoju vieną lagaminą.") },
        { id: "bags_two", s: t("Two | bags.", "Du | lagaminus.", "Du lagaminus.") },
        { id: "bags_none", s: t("No, | just | a | carry-on.", "Ne, | tik | — | rankinį bagažą.", "Ne, tik rankinį bagažą.") },
      ],
    },
    packed: {
      lt: "Atsakyti, kad lagaminą susikrovei pats",
      items: [
        { id: "packed_yes", s: t("Yes, | I | packed | it | myself.", "Taip, | aš | susikroviau | jį | {m:pats|f:pati}.", "Taip, susikroviau {m:pats|f:pati}.") },
        { id: "packed_did", s: t("Yes, | I | did.", "Taip, | aš | [susikroviau].", "Taip, susikroviau.",
          { flags: { 2: "Elliptical “did”: Lithuanian repeats the verb (susikroviau)." } }) },
      ],
    },
    battery: {
      lt: "Atsakyti apie baterijas",
      items: [
        { id: "battery_no", s: t("No, | I | don't have | any.", "Ne, | aš | neturiu | jokių.", "Ne, neturiu jokių.") },
        { id: "battery_carryon", s: t("My | power bank | is | in | my | backpack.", "Mano | išorinė baterija | yra | — | mano | kuprinėje.", "Išorinė baterija – mano kuprinėje.",
          { flags: { 3: "“in” has no separate word: the locative kuprinėje carries it across “my”." } }) },
        { id: "battery_yes", s: t("I | have | a | power bank | in it.", "Aš | turiu | — | išorinę bateriją | jame.", "Jame yra mano išorinė baterija.") },
        { id: "q_powerbank", s: t("What's | a | power bank?", "Kas yra | — | išorinė baterija?", "Kas yra „power bank“?") },
      ],
    },
    ok: {
      lt: "Sutikti",
      items: [
        { id: "ok_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "ok_okay", s: t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.") },
      ],
    },
    yesno: {
      lt: "Atsakyti: taip arba ne",
      items: [
        { id: "yn_fine", s: t("Yes, | that's | fine.", "Taip, | tai | tinka.", "Taip, tinka.") },
        { id: "yn_no_thanks", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      ],
    },
    scale: {
      lt: "Padėti lagaminą ant svarstyklių",
      items: [
        { id: "ok_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "pp_here", s: t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.") },
        { id: "scale_like_this", s: t("Like | this?", "Štai | taip?", "Štai taip?") },
      ],
    },
    ow_move: {
      lt: "Perkelti daiktus į rankinį bagažą",
      items: [
        { id: "ow_move", s: t("I'll move | some | things | to | my | carry-on.", "Perkelsiu | kelis | daiktus | į | savo | rankinį bagažą.", "Perkelsiu kelis daiktus į rankinį bagažą.") },
        { id: "ow_take_out", s: t("Can | I | take out | a | few | things?", "Ar galiu | aš | išimti | — | kelis | daiktus?", "Ar galiu išimti kelis daiktus?") },
        { id: "ow_wear", s: t("I'll wear | my | jacket.", "Apsivilksiu | savo | striukę.", "Apsivilksiu striukę."), note: "Kaip dainoje: apsivilk, ir lagaminas lengvesnis!" },
      ],
    },
    ow_pay: {
      lt: "Sumokėti mokestį",
      items: [
        { id: "ow_pay", s: t("I'll pay | the | fee.", "Sumokėsiu | — | mokestį.", "Sumokėsiu mokestį.") },
        { id: "fee_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
      ],
    },
    ow_ask: {
      lt: "Paklausti apie mokestį ar limitą",
      items: [
        { id: "ow_how_much", s: t("How much | is | it?", "Kiek | kainuoja | tai?", "Kiek tai kainuoja?") },
        { id: "q_limit", s: t("What's | the | weight | limit?", "Koks yra | — | svorio | limitas?", "Koks svorio limitas?") },
      ],
    },
    moving: {
      lt: "Pasakyti, kad jau perkėlei daiktus",
      items: [
        { id: "moving_done", s: t("Done!", "Baigiau!", "Baigiau!") },
        { id: "moving_now", s: t("Okay, | how about | now?", "Gerai, | o kaip | dabar?", "Gerai, o dabar?") },
        { id: "moving_ok", s: t("Is | it | okay | now?", "Ar | jis | tinka | dabar?", "Ar dabar tinka?", { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }) },
      ],
    },
    fee: {
      lt: "Susimokėti kortele",
      items: [
        { id: "fee_here", s: t("Here's | my | card.", "Štai | mano | kortelė.", "Štai mano kortelė.") },
        { id: "pp_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "fee_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
      ],
    },
    seat: {
      lt: "Pasirinkti vietą", slot: "seat", examples: ["window", "aisle"],
      items: [
        { id: "seat_please", s: t("Window, | please.", "Prie lango, | prašau.", "Prie lango, prašau."), only: (e) => e.id === "window" },
        { id: "seat_please", s: t("Aisle, | please.", "Prie praėjimo, | prašau.", "Prie praėjimo, prašau."), only: (e) => e.id === "aisle" },
        { id: "seat_id_like", s: t("I'd like | {X.np} | seat, | please.", "Norėčiau | {X.np:gen} | vietos, | prašau.", "Norėčiau vietos {X:gen}, prašau.") },
        { id: "seat_can_i", s: t("Can | I | have | {X.np} | seat?", "Ar galiu | aš | gauti | {X.np:acc} | vietą?", "Ar galiu gauti vietą {X:acc}?") },
        { id: "seat_prefer", s: t("I'd prefer | {X.np} | seat.", "Norėčiau | {X.np:gen} | vietos.", "Norėčiau vietos {X:gen}."), note: "„I'd prefer“ – mandagiai pasakyti, ką renkiesi." },
        { id: "seat_either", s: t("I | don't mind.", "Man | nesvarbu.", "Man nesvarbu.") },
        { id: "seat_either2", s: t("Either | is fine.", "Bet kuri | tinka.", "Tinka bet kuri.") },
      ],
    },
    questions: {
      lt: "Paklausti apie skrydį",
      items: [
        { id: "q_ontime", s: t("Is | the | flight | on time?", "Ar | — | skrydis | laiku?", "Ar skrydis laiku?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_gate", s: t("What's | my | gate?", "Kokie yra | mano | vartai?", "Kokie mano vartai?") },
        { id: "q_boarding", s: t("What | time | does | boarding | start?", "Kokiu | laiku | — | įlaipinimas | prasideda?", "Kada prasideda įlaipinimas?",
          { flags: { 2: "Question “does” has no Lithuanian word; the tense sits on prasideda (linked to “start”)." } }) },
        { id: "q_security", s: t("Where's | security?", "Kur yra | saugumo patikra?", "Kur saugumo patikra?") },
        { id: "q_carryon", s: t("Can | I | take | this | bag | on board?", "Ar galiu | aš | pasiimti | šį | krepšį | į lėktuvą?", "Ar galiu pasiimti šį krepšį į lėktuvą?") },
        { id: "q_fee", s: t("Is | there | a | fee | for | the | bag?", "Ar yra | — | — | mokestis | už | — | lagaminą?", "Ar reikia mokėti už lagaminą?",
          { flags: { 1: "Existential “there” has no Lithuanian word: yra carries it (linked to “Is”)." } }) },
      ],
    },
    more: {
      lt: "Pasakyti, kad klausimų nebeturi",
      items: [
        { id: "more_all", s: t("That's | all, | thanks.", "Tai yra | viskas, | ačiū.", "Tai viskas, ačiū.") },
        { id: "more_good", s: t("No, | I'm | good, | thanks.", "Ne, | man | viskas gerai, | ačiū.", "Ne, viskas gerai, ačiū."), note: "„I'm good“ čia reiškia mandagų „ne, ačiū“." },
      ],
    },
  },

  tips: {
    uk_handluggage: { key: "uk_handluggage", lt: "Suprasta! Amerikoje dažniau sakoma „carry-on“ (rankinis bagažas).", better: "Just a carry-on." },
    uk_jumper: { key: "uk_jumper", lt: "Suprasta! Amerikoje sakoma „sweater“ (megztinis).", better: "I'll wear my sweater." },
    uk_trainers: { key: "uk_trainers", lt: "Suprasta! Amerikoje sportbačiai – „sneakers“.", better: "I'll wear my sneakers." },
    us_pounds: { key: "us_pounds", lt: "Suprasta! JAV svoris matuojamas svarais (pounds): 50 svarų – maždaug 23 kg.", better: "What's the weight limit?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    us_line: { key: "us_line", lt: "Suprasta! Amerikoje eilė – „line“.", better: "Is this the line for Boston?" },
    us_vacation: { key: "us_vacation", lt: "Suprasta! Amerikoje sakoma „on vacation“.", better: "I'm going on vacation." },
  },

  merges: {
    "checking in": { reason: "lexical_expression", split: "checking → tikrinant + in → į is false; “check in” (at an airport) = registruotis, and the progressive sits on the verb.", minimal: "Two words; the particle has no truthful gloss (C-PHR)." },
    "to check in": { reason: "grammatical_fusion", split: "to → į + check → patikrinti + in → į is false; infinitive “to” is the ending -ti and “check in” = užsiregistruoti (C-INF + C-PHR).", minimal: "Three words; none can be removed." },
    "power banks": { reason: "lexical_expression", split: "power → galia/energija + banks → bankai is false; a power bank is an external battery (išorinė baterija).", minimal: "Two words forming one device name." },
    "power bank": { reason: "lexical_expression", split: "power → galia + bank → bankas is false; = išorinė baterija.", minimal: "Two words forming one device name." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug gives “kaip daug”; asking a number = kiek.", minimal: "Two words (C-LEX)." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn suggests walking away; an invitation to act = prašom / klauskite.", minimal: "Two words (C-LEX)." },
    "one at a time": { reason: "lexical_expression", split: "one → vienas, at → prie, a → —, time → laikas is false; distributive “one at a time” = po vieną.", minimal: "Four words forming one adverbial." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia (C-LEX).", minimal: "Two words." },
    "this one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; prop-word “one” is absorbed by the demonstrative šis (C-ONE).", minimal: "Two words." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatytas is false; “all set” = everything is done (viskas sutvarkyta).", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie is false; a suggestion or check = o kaip.", minimal: "Two words (C-LEX)." },
    "no need": { reason: "lexical_expression", split: "no → ne + need → poreikis is a calque; = nereikia (one Lithuanian word).", minimal: "Two words." },
    "on board": { reason: "lexical_expression", split: "on → ant + board → lenta is false; “on board” = in/into the plane (lėktuve / į lėktuvą).", minimal: "Two words." },
    "take out": { reason: "lexical_expression", split: "take → imti + out → lauk is false; the particle is carried by the prefix of išimti (C-PHR).", minimal: "Two words." },
    "to get up": { reason: "grammatical_fusion", split: "to → į + get → gauti + up → aukštyn is false; infinitive “to” is the ending -ti and “get up” = atsistoti (C-INF + C-PHR).", minimal: "Three words; none can be removed." },
    "i'd prefer": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional ending of norėčiau carries would + prefer (as I'd like).", minimal: "Object stays outside." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Pasakyk, kur skrendi" },
    { step: "passport", lt: "Parodyk pasą" },
    { lt: "Priduok lagaminą", optional: true, when: (c) => c.s.bags !== 0, done: (c) => !!c.s.weighed || !!c.s.owShown },
    { lt: "Išspręsk viršsvorį", optional: true, when: (c) => !!c.s.owShown, done: (c) => !!c.s.owDone },
    { step: "seat", lt: "Išsirink vietą" },
    { lt: "Sužinok vartus ir laiką", done: (c) => !!c.s.bpGiven },
  ],

  steps: [
    { id: "hello", when: (c) => !!c.s.helloQ, done: (c) => !!c.s.hello,
      ask: (c) => { c.say(c.s.helloAsked ? "ask_checkin" : "greet_checkin"); c.s.helloAsked = true; },
      expects: ["checkin", "dest_ans", "give"],
      suggest: [{ lt: "Pasakyti, kad nori užsiregistruoti", hint: "hello" }, { lt: "Pasakyti, kur skrendi", hint: "dest", options: ["boston"] }],
      yes: (c) => { c.s.hello = true; c.say("hello_great"); },
      no: (c) => { c.s.hello = true; c.say("no_help"); c.hold(); } },
    { id: "dest", done: (c) => !!c.s.dest || !!c.s.lookup,
      ask: (c) => c.say("ask_dest"),
      expects: ["dest_ans", "checkin"],
      suggest: [{ lt: "Pasakyti, kur skrendi", hint: "dest", options: ["boston"] }],
      help: (c) => { c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); } },
    { id: "passport", done: (c) => !!c.s.passport,
      ask: (c) => c.say("ask_passport"),
      expects: ["give"],
      suggest: [{ lt: "Paduoti pasą", hint: "passport" }],
      yes: (c) => { passportGiven(c); } },
    { id: "bags", done: (c) => c.s.bags !== undefined,
      ask: (c) => c.say("ask_bags"),
      expects: ["bags_ans", "bags_num_ctx", "bags_none"],
      suggest: [{ lt: "Pasakyti, kiek lagaminų registruosi", hint: "bags" }, { lt: "Paklausti apie svorį ar mokestį", hint: "ow_ask" }],
      yes: (c) => { expectBagCount(c); },
      no: (c) => { setBags(c, 0); } },
    { id: "safety", when: (c) => !!c.s.askSafety && c.s.bags > 0 && !!c.s.passport, done: (c) => !!c.s.safetyDone,
      ask: (c) => {
        const many = c.s.bags >= 2;
        if (c.s.safetyKind === "packed") { c.say(many ? "ask_packed_many" : "ask_packed"); expectPacked(c); }
        else { c.say(many ? "ask_battery_many" : "ask_battery"); expectBattery(c); }
      } },
    { id: "scale", when: (c) => c.s.bags > 0 && !!c.s.passport, done: (c) => !!c.s.weighed,
      ask: (c) => c.say(c.s.bags >= 2 ? "ask_scale_many" : "ask_scale"),
      expects: ["give", "ack_done"],
      suggest: [{ lt: "Padėti lagaminą ant svarstyklių", hint: "scale" }, { lt: "Paklausti, koks svorio limitas", hint: "ow_ask" }],
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
      expects: ["seat_ans", "seat_any", "seat_neg"],
      suggest: [{ lt: "Pasirinkti vietą: prie lango ar prie praėjimo", hint: "seat", options: "seat" }],
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
        { lt: "Pasakyti, kad klausimų nebeturi", hint: "more" },
        { lt: "Paklausti apie skrydį, vartus ar saugumo patikrą", hint: "questions" },
      ],
      yes: (c) => { if (plainAck(c.heard)) { c.s.moreDone = true; return; } c.say("what_q"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.askSafety = c.chance(0.7);
    c.s.safetyKind = c.chance(0.55) ? "battery" : "packed";
    c.s.overweight = c.visits >= 1 ? c.chance(0.5) : c.chance(0.3);
    c.s.noWindow = c.visits >= 1 && c.chance(0.3);
    c.s.lbs = c.pick([44, 46, 47]);
  },

  start: (c) => {
    const r = c.rng();
    if (r < 0.3) { c.say("greet_howareyou"); expectHowAreYou(c); return; }
    if (r < 0.6) { c.s.helloQ = true; return; } // the "hello" step asks "Checking in?"
    c.say("greet");
  },

  handlers: {
    affirm(c) { const st = checkin.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); },
    g_bye(c) { c.say("g_bye"); c.end(); c.hold(); },
    deny(c) { const st = checkin.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    checkin(c, slots, seg) {
      const already = !!c.s.hello;
      c.s.hello = true;
      if (seg.tags.includes("isthis")) {
        c.say("yes_right_here");
        if (slots.city === "boston") c.s.dest = "boston";
        else if (slots.city) setDest(c, slots.city);
        return;
      }
      if (seg.tags.includes("bag") && c.s.bags === undefined) c.s.bags = 1;
      if (slots.city) { setDest(c, slots.city); return; }
      if (typeof slots.number === "number") { setFlight(c, slots.number); return; }
      if (/\b(boston|chicago|new york|miami|denver|seattle|atlanta|orlando|philadelphia|washington|vilnius|flight \d+|\d{3})\b/i.test(c.heard)) return;
      if (!already || c.step === "hello" || !c.s.dest) c.say("checkin_ack");
    },
    dest_ans(c, slots, seg) {
      if (slots.city) { setDest(c, slots.city); return; }
      if (typeof slots.number === "number") { setFlight(c, slots.number); return; }
      if (seg.tags.includes("time")) setFlight(c, 223); // "I'm on the 8:10 flight"
    },
    dest_unknown(c) {
      c.s.hello = true;
      if (c.s.passport) { c.say("flight_wrong"); return; }
      c.say("dest_only_boston");
      expectDestConfirm(c);
    },
    dest_neg(c, slots) {
      if (c.s.dest === slots.city) c.s.dest = undefined;
      c.say("dest_neg_ack");
      c.hold();
    },
    give(c) {
      if (!c.s.passport && /\bcard\b/i.test(c.heard)) { c.say("pp_only"); c.hold(); return; }
      if (!c.s.passport) { passportGiven(c); return; }
      if (c.step === "scale" && c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      c.say("thanks_short");
    },
    passport_q(c) {
      if (c.s.passport) { c.say("pp_have"); return; }
      c.say("pp_yes"); c.hold();
    },
    find_it(c) { c.say("g_take_time"); c.hold(); },
    bags_ans(c, slots, seg) {
      const tags: string[] = seg.tags || [];
      let n = typeof slots.number === "number" ? slots.number : tags.includes("two") ? 2 : 1;
      if (n > 4) { expectBagCount(c); return; }
      setBags(c, n);
    },
    bags_num_ctx(c, slots) {
      const n = parseInt(slots.n, 10);
      if (!(n >= 1 && n <= 4)) { expectBagCount(c); return; }
      setBags(c, n);
    },
    bags_none(c) { setBags(c, 0); },
    packed_yes(c) { if (c.s.safetyKind === "packed") { c.s.safetyDone = true; c.say("packed_ok"); } },
    packed_no(c) { if (c.s.safetyKind === "packed") { c.s.safetyDone = true; c.say("packed_follow_ok"); } },
    battery_no(c) {
      if (c.step === "bp") { c.s.moreDone = true; return; }
      c.s.safetyDone = true; c.say("battery_ok");
    },
    battery_yes(c) { c.twist("power_bank"); c.say("battery_move"); },
    powerbank_q(c) { c.say("powerbank_what"); },
    what_ctx(c) { c.say("powerbank_what"); },
    ack_done(c) {
      if (c.step === "scale" && c.s.bags > 0 && !c.s.weighed) { weigh(c); return; }
      if (c.step === "bp") { c.s.moreDone = true; return; }
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
    pay_fee(c) {
      if (c.s.owShown && !c.s.owDone) { startFee(c); return; }
      c.say("nothing_to_pay");
    },
    // "Can I pay by card?" while the overweight options are open = I'll pay the fee
    pay_card(c) { if (c.s.owShown && !c.s.owDone) { startFee(c); return; } c.say("nothing_to_pay"); },
    pay_cash(c) { if (c.s.owShown && !c.s.owDone) { c.say("ow_card_only"); expectFee(c); return; } c.say("nothing_to_pay"); },
    lookup(c) {
      if (c.s.dest || c.s.passport) { c.say("flight_ack"); return; }
      c.s.lookup = true; c.say("lookup_help"); c.say("ask_passport"); c.hold();
    },
    ask_fee(c) { c.say(c.s.owShown ? "ow_fee_amount" : "bagfee_info"); },
    ask_over(c) {
      if (c.s.owShown && !c.s.owDone) { c.say("ow_over"); return; }
      c.say("limit");
    },
    ask_limit(c) { c.say("limit"); },
    seat_ans(c, slots) {
      const pref = slots.seat as string;
      if (!c.s.passport) { c.s.seatPref = pref; c.say("seat_pref_ack", { X: pref }); return; }
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
          suggest: [{ lt: "Pasirinkti vietą", hint: "seat", options: ["window", "aisle"] }],
          on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
          yes: (cc) => { cc.say("seat_neg_both"); }, ask: (cc) => cc.say("seat_neg_both") });
        return;
      }
      const other = bad === "window" ? "aisle" : "window";
      c.say("seat_neg_q", { X: other });
      ask(c, { id: "seat_clarify", expects: ["seat_ans", "seat_any"], hints: ["yesno", "seat"],
        suggest: [{ lt: "Sutikti arba pasirinkti kitą vietą", hint: "seat", options: "seat" }],
        yes: (cc) => { if (cc.s.passport) assignSeat(cc, other); else { cc.s.seatPref = other; cc.say("ack"); } },
        no: (cc) => { cc.say("ask_seat"); },
        on: { seat_ans: (cc, sl, sg) => { checkin.handlers.seat_ans(cc, sl, sg); }, seat_any: (cc, sl, sg) => { checkin.handlers.seat_any(cc, sl, sg); } },
        ask: (cc) => cc.say("seat_neg_q", { X: other }) });
    },
    more_no(c) { if (c.step === "bp" || c.s.bpGiven) c.s.moreDone = true; },
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
    ask_bagfee(c) { c.say("bagfee_info"); },
    ask_restroom(c) { c.say("restroom"); },
  },

  finish: (c) => {
    c.complete();
    if (!c.s.securityTold) c.say("security_dir");
    c.say("bye_flight");
    ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // destination and opening
    { say: "Hi! I'd like to check in, please.", intent: "checkin" },
    { say: "I'd like to check in for my flight to Boston.", intent: "checkin", slots: { city: "boston" } },
    { say: "To Boston, please.", intent: "dest_ans", step: "dest", slots: { city: "boston" } },
    { say: "I'm flying to Boston.", intent: "dest_ans", slots: { city: "boston" } },
    { say: "I'm going to Boston today", intent: "dest_ans" },
    { say: "Boston", intent: "dest_ans", step: "dest" },
    { say: "Flight 223 to Boston", intent: "dest_ans", slots: { number: 223, city: "boston" } },
    { say: "I'm headed to Chicago", intent: "dest_ans", slots: { city: "chicago" } },
    { say: "I'm flying to Paris", intent: "dest_unknown" },
    { say: "Not Chicago", intent: "dest_neg", not: ["dest_ans"] },
    { say: "Checking in", intent: "checkin" },
    // passport
    { say: "Here you go.", intent: "give", step: "passport" },
    { say: "Here's my passport.", intent: "give" },
    { say: "Sure, here you are.", intent: "give", step: "passport" },
    { say: "Do you need my passport?", intent: "passport_q" },
    // bags
    { say: "Just one bag.", intent: "bags_ans", step: "bags" },
    { say: "Just this suitcase.", intent: "bags_ans", step: "bags" },
    { say: "I'm checking one bag.", intent: "bags_ans" },
    { say: "Two bags.", intent: "bags_ans", slots: { number: 2 } },
    { say: "One", intent: "bags_num_ctx", step: "bags" },
    { say: "No, just a carry-on.", intent: "bags_none", step: "bags" },
    { say: "I don't have any bags to check", intent: "bags_none", not: ["bags_ans"] },
    { say: "Just hand luggage", intent: "bags_none", step: "bags" },
    // safety, scale, overweight
    { say: "Yes, I packed it myself.", intent: "packed_yes" },
    { say: "No, I don't have any.", intent: "battery_no" },
    { say: "No batteries", intent: "battery_no" },
    { say: "My power bank is in my backpack.", intent: "battery_no" },
    { say: "I have a power bank in it.", intent: "battery_yes" },
    { say: "What's a power bank?", intent: "powerbank_q" },
    { say: "Like this?", intent: "ack_done", step: "scale" },
    { say: "Sure, here you go.", intent: "give", step: "scale" },
    { say: "I'll move some things to my carry-on.", intent: "move_items" },
    { say: "Can I take out a few things?", intent: "move_items" },
    { say: "I'll wear my jacket", intent: "move_items" },
    { say: "I'll put on my jumper", intent: "move_items" },
    { say: "I'll pay the fee.", intent: "pay_fee" },
    { say: "I don't want to pay the fee", intent: "move_items", not: ["pay_fee"] },
    { say: "I don't want to take anything out", intent: "pay_fee", not: ["move_items"] },
    { say: "How much is it?", intent: "ask_fee" },
    { say: "What's the weight limit?", intent: "ask_limit" },
    { say: "How many kilos can I take?", intent: "ask_limit" },
    { say: "Okay, how about now?", intent: "ack_done" },
    { say: "Is it okay now?", intent: "ack_done" },
    // seat
    { say: "Window, please.", intent: "seat_ans", step: "seat", slots: { seat: "window" } },
    { say: "I'd like an aisle seat, please.", intent: "seat_ans", slots: { seat: "aisle" } },
    { say: "Can I have a window seat?", intent: "seat_ans", slots: { seat: "window" } },
    { say: "I'd prefer an aisle seat.", intent: "seat_ans", slots: { seat: "aisle" } },
    { say: "Aisle", intent: "seat_ans", step: "seat" },
    { say: "I don't mind.", intent: "seat_any", step: "seat" },
    { say: "Either is fine.", intent: "seat_any", step: "seat" },
    { say: "No middle seat, please", intent: "seat_neg", step: "seat", not: ["seat_ans"] },
    { say: "I don't want a window seat", intent: "seat_neg", not: ["seat_ans"] },
    // questions and closing
    { say: "Is the flight on time?", intent: "ask_ontime" },
    { say: "What's my gate?", intent: "ask_gate" },
    { say: "What time does boarding start?", intent: "ask_boarding_time" },
    { say: "Where's security?", intent: "ask_security" },
    { say: "Can I take this bag on board?", intent: "ask_carryon" },
    { say: "Is there a fee for the bag?", intent: "ask_bagfee" },
    { say: "Where is the toilet?", intent: "ask_restroom" },
    { say: "That's all, thanks.", intent: "more_no", step: "bp" },
    { say: "No, I'm good, thanks.", intent: "more_no", step: "bp" },
    { say: "Yes, that's right.", intent: "yn:yes" }, // the built-in yes list covers it now (affirm still maps to yes)
    { say: "Is the flight delayed?", intent: "ask_delayed", not: ["ask_ontime"] },
    { say: "I have one suitcase and hand luggage", intent: "bags_ans", step: "bags" },
    { say: "Is this the check-in for Boston?", intent: "checkin" },
    { say: "How many kilos is that?", intent: "ask_limit" },
    { say: "Here's my card.", intent: "give" },
    // more ways to say it (dev corpus tests/corpus/s64a-checkin.json)
    { say: "Is this the line for Boston?", intent: "checkin", slots: { city: "boston" } },
    { say: "I'd like to drop off my bag", intent: "checkin" },
    { say: "I'm going home to Boston", intent: "dest_ans", slots: { city: "boston" } },
    { say: "My destination is Boston", intent: "dest_ans", slots: { city: "boston" } },
    { say: "I'm on the 8:10 flight to Boston", intent: "dest_ans", step: "dest" },
    { say: "Take it", intent: "give", step: "passport" },
    { say: "Do you need my boarding pass too?", intent: "passport_q" },
    { say: "One big bag", intent: "bags_ans", step: "bags" },
    { say: "None, only hand luggage", intent: "bags_none", step: "bags" },
    { say: "Zero", intent: "bags_none", step: "bags" },
    { say: "Yes, myself", intent: "packed_yes" },
    { say: "Only my phone charger", intent: "battery_no" },
    { say: "There's a laptop in it", intent: "battery_yes" },
    { say: "Is it too heavy?", intent: "ask_over" },
    { say: "That's too expensive, I'll move some things", intent: "move_items" },
    { say: "Can I pay cash?", intent: "pay_cash" },
    { say: "Can I sit next to the window?", intent: "seat_ans", slots: { seat: "window" } },
    { say: "Aisle, because I have long legs", intent: "seat_ans", step: "seat", slots: { seat: "aisle" } },
    { say: "Window or aisle, I don't care", intent: "seat_any", step: "seat" },
    { say: "Where is gate 8?", intent: "ask_gate" },
    { say: "Boarding at 7:30, right?", intent: "ask_boarding_time" },
    { say: "Everything is clear, thank you", intent: "more_no", step: "bp" },
    // meaning kept
    { say: "I won't take anything out", intent: "pay_fee", not: ["move_items"] },
    { say: "The power bank is not in my backpack", intent: "none" },
    { say: "I don't want to check in", intent: "none", not: ["checkin"] },
    { say: "I can't put it there", intent: "none", step: "scale" },
    // gibberish / unrelated
    { say: "purple elephant banana window", intent: "none" },
    { say: "The weather is nice in Vilnius", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "Just this one suitcase.", intent: "bags_ans", step: "bags" },
    { say: "Only my backpack.", intent: "bags_none", step: "bags", not: ["bags_ans"] },
    { say: "Can I just pay?", intent: "pay_fee" },
    { say: "I'll repack it.", intent: "move_items" },
    { say: "I won't repack it.", intent: "none" },
    { say: "When should I be at the gate?", intent: "ask_boarding_time", step: "bp" },
  ],

  sims: [
    { name: "happy path", turns: ["I'd like to check in, please.", "To Boston.", "Here's my passport.", "Just one bag.", "Window, please.", "No, that's all, thanks."],
      expect: { complete: true }, auto: AUTO },
    { name: "all at once, then questions", turns: ["Hi, I'm flying to Boston and I have one bag. Here's my passport.", "I'd like an aisle seat, please.", "Is the flight on time?", "Where's security?", "That's all, thanks."],
      expect: { complete: true }, auto: AUTO },
    { name: "wrong city, seat changes, overweight fee", turns: ["I'm flying to Chicago", "Yes, that's right", "Here you go", "Two bags", "I don't want a window seat", "What time does boarding start?", "No, I'm good"],
      expect: { complete: true }, auto: { ...AUTO, overweight: "I'll pay the fee.", fee: "Here's my card." } },
    { name: "don't know the destination, no bags", turns: ["I don't know", "Here it is", "No, just a carry-on.", "I don't mind", "What's the weight limit?", "That's all"],
      expect: { complete: true }, auto: { ...AUTO, dest: "" } },
  ],
};

export default checkin;
