// Song 64 "Window or Aisle?" (part 3 of 3): at the gate, gate agent Nina. The learner is on flight 223
// to Boston, boarding group 3 (as on the boarding pass from check-in).
// Real US gate interaction: confirm the gate, on time or delayed (and why), boarding time and groups,
// carry-on rules, Wi-Fi on board, coffee / restrooms / outlets nearby, a seat change at the gate,
// then the boarding announcements ("Now boarding group 3") and the boarding-pass scan.
// Variation: a 20-minute delay with a reason; group 2 is called before the learner's group.
// Twists (visits ≥ 1): the flight moves to gate 12 (the gate agents move with it); a full flight, so
// carry-on bags can be checked at the gate for free.

import type { Ctx, Pending, SituationDef } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

const AUTO: Record<string, string> = {
  gate: "Is this the right gate for flight 223 to Boston?",
  board: "Here's my boarding pass.",
  which_flight: "Flight 223 to Boston.",
  wrong_flight: "Here's my boarding pass.",
  time: "Is the flight on time?",
  help: "No, that's all. Thank you.",
  wait: "Thank you.",
  offer: "No, thanks.",
  seat_offer: "No, thanks.",
  early: "Can I board now? I'm in group 3.",
  boarding: "Here's my boarding pass.",
  scan: "Here you go.",
};

// ---------------------------------------------------------------------------

/** c.expect() that also accepts "Yes, that's right" / "No, that's wrong" (affirm/deny) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

const reason = (c: Ctx) => c.say("delay_reason_" + c.s.reason);
const boardingInfo = (c: Ctx) => { if (!c.s.boardingTold) { c.s.boardingTold = true; c.say(c.s.delay ? "boarding_late" : "boarding_time"); } };

const QUESTIONS = ["more_no", "more_q", "ask_ontime", "ask_delayed", "ask_delay_reason", "ask_boarding_time", "ask_departure", "ask_group",
  "ask_carryon", "ask_wifi", "ask_coffee", "ask_food", "ask_restroom", "ask_charge", "ask_duration", "ask_full", "ask_seat_change", "ask_gate12", "can_board"];
const plainAck = (heard: string) => /^\s*(ok|okay|all right|sure|great|perfect|thanks|thank you)\b/i.test(heard) && !/question/i.test(heard);
/** "Thank you" / "Okay, thanks so much" and nothing else. */
const PLAIN_THANKS = /^\s*((ok|okay|great|perfect|oh|all right|alright)[\s,.!]*)*(thank you|thanks)(\s+(very|so)\s+much|\s+a lot)?[\s,.!]*$/i;
/** "Oh, great, thank you!" (an enthusiastic yes). */
const GREAT = /^\s*(oh[\s,.!]*)?(great|perfect|wonderful|awesome|lovely|excellent|amazing)\b/i;

const QUESTION_LINES: Record<string, (c: Ctx) => void> = {
  ontime: (c) => {
    if (c.s.delay) { c.say("ontime_no"); c.say("delay"); reason(c); } else c.say("ontime");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  delay_reason: (c) => {
    if (c.s.delay) reason(c); else c.say("delayed_no");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  delayed: (c) => {
    if (c.s.delay) { c.say("delayed_yes"); c.say("delay"); reason(c); } else c.say("delayed_no");
    boardingInfo(c);
    c.s.timeKnown = true;
  },
  boarding: (c) => { c.s.boardingTold = true; c.say(c.s.delay ? "boarding_late" : "boarding_time"); if (c.s.delay && !c.s.delayTold) c.say("delay"); c.s.timeKnown = true; },
  departure: (c) => { c.say(c.s.delay ? "departure_late" : "departure"); c.s.timeKnown = true; },
};

/** Flight-specific questions need the flight first ("Which flight are you on?"), then get answered. */
function withFlight(c: Ctx, key: string) {
  if (c.s.gateOk) { QUESTION_LINES[key](c); if (key !== "boarding" && key !== "departure") c.s.delayTold = true; return; }
  c.s.afterFlight = key;
  c.say("which_flight");
  expectFlight(c);
}

function expectFlight(c: Ctx) {
  ask(c, {
    id: "which_flight", expects: ["flight_info_ctx", "ask_gate", "give_bp"], hints: ["flight"],
    suggest: [{ lt: "Pasakyti savo skrydį (223 į Bostoną)", hint: "flight" }],
    on: {
      flight_info_ctx: (cc, sl) => { flightGiven(cc, sl); },
      ask_gate: (cc, sl) => { flightGiven(cc, sl); },
      give_bp: (cc) => { cc.say("bp_thanks"); confirmGate(cc); },
    },
    ask: (cc) => cc.say("which_flight"),
  });
}

function flightGiven(c: Ctx, slots: any) {
  const n = typeof slots.number === "number" ? slots.number : slots.f ? parseInt(slots.f, 10) : undefined;
  const city = slots.city as string | undefined;
  if ((n !== undefined && n !== 223 && n !== 8) || (city && city !== "boston")) {
    c.say("not_this_flight");
    c.say("see_bp");
    ask(c, {
      id: "wrong_flight", expects: ["give_bp", "flight_info_ctx", "ask_gate"], hints: ["show_bp"],
      suggest: [{ lt: "Parodyti įlaipinimo kortelę", hint: "show_bp" }],
      on: {
        give_bp: (cc) => { cc.say("bp_you_are_223"); confirmGate(cc, true); },
        flight_info_ctx: (cc, sl) => { flightGiven(cc, sl); },
        ask_gate: (cc, sl) => { flightGiven(cc, sl); },
      },
      yes: (cc) => { cc.say("bp_you_are_223"); confirmGate(cc, true); },
      ask: (cc) => cc.say("see_bp"),
    });
    return;
  }
  confirmGate(c);
}

/** The flight is confirmed: gate change twist or "you're in the right place", then any stored question. */
function confirmGate(c: Ctx, quiet = false) {
  if ((c as any)._gateConfirmed) return; // one utterance parsed as two segments: confirm once per turn
  (c as any)._gateConfirmed = true;
  const first = !c.s.gateOk;
  c.s.gateOk = true;
  if (first && c.s.gateChange) {
    c.twist("gate_change");
    c.s.moved = true;
    c.say("gate_changed");
    c.say("gate12_where");
    c.say("heading_there");
  } else if (!quiet) c.say(c.s.moved ? "gate12_yes" : "gate_yes");
  const q = c.s.afterFlight as string | undefined;
  c.s.afterFlight = undefined;
  if (q) QUESTION_LINES[q](c);
}

function announce(c: Ctx, group: number) {
  c.s.called = group;
  c.say(c.s.announced ? "announce_again" : "announce_hello");
  c.s.announced = true;
  c.say("announce_group", { grp: group });
}

function boardingOk(c: Ctx) {
  c.s.boarded = true;
  c.event("board", { flight: 223 });
  c.say("scanned");
}

function expectScan(c: Ctx) {
  c.say("scan_ask");
  ask(c, {
    id: "scan", expects: ["give_bp"], hints: ["board"],
    suggest: [{ lt: "Paduoti įlaipinimo kortelę", hint: "board" }],
    on: { give_bp: (cc) => { boardingOk(cc); }, g_ok: (cc) => { boardingOk(cc); } },
    yes: (cc) => { boardingOk(cc); },
    ask: (cc) => cc.say("scan_ask"),
  });
}

function offerGateCheck(c: Ctx, fromQuestion = false) {
  c.s.offerDone = true;
  c.twist("full_flight");
  c.say(fromQuestion ? "full_offer_short" : "full_offer");
  c.say("full_offer_q");
  ask(c, {
    id: "offer", expects: ["bag_check_q", "keep_bag", "offer_yes", "ask_free"], hints: ["g_yesno", "offer"],
    suggest: [{ lt: "Sutikti arba atsisakyti", hint: "offer" }],
    yes: (cc) => { cc.s.bagChecked = true; cc.say("bag_tagged"); cc.say("bag_back_boston"); },
    no: (cc) => { cc.say("no_problem"); },
    on: {
      keep_bag: (cc) => { cc.say("no_problem"); },
      offer_yes: (cc) => { cc.s.bagChecked = true; cc.say("bag_tagged"); cc.say("bag_back_boston"); },
      bag_check_q: (cc) => { cc.say("bag_back_boston"); ask(cc, { ...offerPending(), id: "offer" }); },
      ask_free: (cc) => { cc.say("free_yes"); ask(cc, { ...offerPending(), id: "offer" }); },
    },
    ask: (cc) => cc.say("full_offer_q"),
  });
}
const offerPending = (): Pending => ({
  id: "offer", expects: ["keep_bag", "offer_yes"], hints: ["g_yesno", "offer"],
  suggest: [{ lt: "Sutikti arba atsisakyti", hint: "offer" }],
  yes: (cc) => { cc.s.bagChecked = true; cc.say("bag_tagged"); cc.say("bag_back_boston"); },
  no: (cc) => { cc.say("no_problem"); },
  on: {
    keep_bag: (cc) => { cc.say("no_problem"); },
    offer_yes: (cc) => { cc.s.bagChecked = true; cc.say("bag_tagged"); cc.say("bag_back_boston"); },
  },
  ask: (cc) => cc.say("full_offer_q"),
});

// ---------------------------------------------------------------------------

export const gate: SituationDef = {
  id: "s64c-gate",
  song: 64,
  songTitle: "Window or Aisle?",
  title: { en: "Is This the Right Gate?", lt: "Ar tai tie vartai?" },
  topic: { en: "At the gate", lt: "Prie išvykimo vartų" },
  chapter: 6,
  order: 7,
  location: "airport",
  npc: "nina",
  goal: "Pasitikslink vartus ir skrydžio laiką, tada įlipk į lėktuvą.",
  intro: "Išvykimo zona prie 8-ųjų vartų. Tavo skrydis – 223 į Bostoną, įlaipinimo grupė – 3 (taip parašyta įlaipinimo kortelėje). Prie vartų stalelio – darbuotoja Nina.",

  grammar: {
    macros: {
      flt: "(flight | flight number) {number}",
      bp: "(boarding pass | boarding card #tip:uk_boardingcard | ticket)",
      thecity: "(to {city} | for {city} | the {city} flight | the flight to {city})",
    },
    slots: {
      fnum: { lexicon: [{ id: "223", forms: ["223", "two twenty three", "two two three", "two hundred twenty three", "two hundred and twenty three"] }] },
      city: { lexicon: [
        { id: "boston", forms: ["boston", "bostin", "logan"] },
        { id: "chicago", forms: ["chicago"] }, { id: "new_york", forms: ["new york", "nyc"] }, { id: "miami", forms: ["miami"] },
        { id: "denver", forms: ["denver"] }, { id: "seattle", forms: ["seattle"] }, { id: "atlanta", forms: ["atlanta"] },
      ] },
    },
  },

  intents: {
    affirm: { patterns: ["(yes | yeah | yep) (that is | it is) (right | correct | me | it)", "(yes | yeah) (correct | exactly)", "(yes | yeah) [please] (a | the) window seat would be (great | nice | perfect)", "(yes | yeah) i would (love | like) that"] },
    deny: { patterns: ["no (that is | it is) (wrong | not right | not me)", "[no] (i am | i am fine | i am happy | i am good) (where i am | with my seat)"] },
    ask_gate: { patterns: [
      "is this the (right | correct) gate for @flt [to {city}] #h:q_gate",
      "is this the (right | correct) gate [@thecity]",
      "is this the gate (for | to) {city} #h:q_gate_city",
      "is this the gate for @flt [to {city}]",
      "is this gate {number} #h:q_gate8",
      "is this @flt [to {city}]",
      "is this the (flight | plane) to {city}",
      "is this where i board [@flt | the flight to {city} | the {city} flight]",
      "am i at the (right | correct) gate [for @flt | @thecity]",
      "(does | is) (@flt | the {city} flight | the flight to {city}) (leave | board | depart | leaving | boarding | departing) (from here | from this gate | here)",
      "(which | what) gate (is | does) @flt [to {city}] (at | leave from | board at | depart from)",
      "(which | what) gate is (the {city} flight | the flight to {city}) [at]",
      "where does @flt board",
      "is @flt [to {city}] (here | at this gate)",
      "is the {city} flight (here | at this gate)",
      "i am on @flt [to {city}] #h:fl_223",
      "@flt to {city} #h:fl_223",
      // other ways: "I'm flying to Boston", "Where's the flight to Boston?", "Am I in the right place?"
      "@flt", "(i am flying | i fly | i am going | i am traveling) to {city}", "is it (here | this gate)", "this is gate {number} [right | correct | is it]",
      "where is (the | my) (flight | plane) to {city}", "where (does | is) (the | my) (flight | plane) to {city} (board | boarding | leave | leaving)",
      "[the] {city} flight (this gate | here) [right]", "is the (plane | flight) to {city} (here | at this gate | from this gate)",
      "(i am looking for | where is | i need) gate (8 | eight)", "am i in the (right | correct) place [for @flt | @thecity]",
      "where (do | can) i board [for {city} | for @flt | the (flight | plane) to {city}]", "(does | is) the {city} flight (leave | board | leaving | boarding) (from this gate | from here | here)",
    ] },
    flight_info_ctx: { patterns: [
      "[it is | my flight is | i am on | i am on the] @flt [to {city}] #h:fl_223",
      "[it is | my flight is | i am on] {f:fnum} [to {city}]",
      "[i am flying] to {city}",
      "the {city} flight",
      "[it is | i am on] the flight to {city}",
      "{number} to {city}",
      "i am (going | flying | traveling) to {city}", "{city} [flight] {number}", "{city} @flt", "i have a flight to {city} [at {time} | today]",
      "(sorry | my mistake | my bad | i mean | i meant) [it is] (@flt | {f:fnum} | {number}) [to {city}]",
    ] },
    give_bp: { patterns: [
      "here you (go | are) #h:bd_here",
      "here is my @bp #h:bd_bp",
      "here (it is | they are)",
      "(it is | my boarding pass is) on my phone",
      "(this is | that is) my @bp",
      "(can | could) you scan (my phone | it | this)",
      "here", "(it is | my boarding pass is) in the app",
    ] },
    ask_ontime: { patterns: [
      "is the flight on time #h:q_ontime",
      "is (it | my flight | flight 223 | the boston flight) on time",
      "are we (on time | leaving on time | on schedule)",
      "is everything on time",
      "will (it | we | the flight) (leave | be) on time",
      "(is | is everything) (okay | fine | good) with the flight", "everything (okay | fine) with the flight", "do we leave on time", "(does | will) the (flight | plane) (leave | depart) on time",
    ] },
    ask_delayed: { patterns: [
      "is (the | my) flight delayed #h:q_delayed",
      "is (it | the plane) delayed",
      "is there (a | any) delay",
      "(are | will) we (going to be)? late",
      "how (late | long is the delay)",
      "how long (is | will be) the delay",
      "is the (plane | flight) late", "(is | will) (it | the plane | the flight) (be | going to be) late",
    ] },
    ask_delay_reason: { patterns: [
      "why is (it | the flight | the plane) (delayed | late) #h:q_why",
      "why the delay",
      "what (is | was) the (problem | reason)",
      "what happened",
      "why (are we | is it) late",
    ] },
    why_short: { patterns: ["why [is that]"] },
    ask_boarding_time: { patterns: [
      "when does boarding start #h:q_boarding",
      "what time (does boarding start | is boarding | do we board | does it board | can i board | do we start boarding)",
      "when (do we board | is boarding | can we board | do you start boarding | does it board | will we board | can i board)",
      "how long until boarding",
      "when will boarding start",
      "how long (do i | will i | do we) (have to | need to) wait", "how long (is the wait | until we board)",
    ] },
    ask_departure: { patterns: [
      "what time (does the flight leave | do we leave | does it leave | is departure | do we take off | does the plane leave)",
      "when (does the flight leave | do we leave | does it leave | do we take off | does the plane leave)",
    ] },
    ask_group: { patterns: [
      "what (group | boarding group) am i in #h:q_group",
      "what is my (group | boarding group)",
      "which group am i [in]",
      "when does group {number} board",
      "(what | which) group (is boarding | are you boarding) [now]",
      "what does group {number} mean",
      "when is group {number}", "when (does | will) (my group | group {number}) (board | go)",
    ] },
    ask_carryon: { patterns: [
      "can i take this (bag | suitcase | backpack) on board #h:q_carryon",
      "can i (take | bring) (this | my) (bag | suitcase | backpack | carry on) (on board | on the plane | with me)",
      "is (this | my) (bag | suitcase | backpack) (okay | fine) [for the overhead bin | for the cabin]",
      "can i take two bags [on board]",
      "does this (bag | suitcase) fit",
      "can i take my (hand luggage #tip:uk_handluggage | carry on) [on board]",
    ] },
    ask_wifi: { patterns: [
      "is there (wi fi | wifi | internet) on (board | the plane | the flight) #h:q_wifi",
      "does the plane have (wi fi | wifi)",
      "is there (wi fi | wifi) [on board]",
      "is the (wi fi | wifi) free",
      "can i use (wi fi | wifi | the internet) on the plane",
    ] },
    ask_coffee: { patterns: [
      "where can i (get | buy) [a | some] coffee #h:q_coffee",
      "is there a (coffee shop | cafe | starbucks) [near here | nearby | around here]",
      "where can i get something to (eat | drink)",
      "is there (somewhere | a place) to (eat | get coffee)", "do i have [enough] time (to get | for) [a | some] (coffee | snack | something to eat)",
      "where is the (coffee shop | cafe | food court)",
      "where can i (get | buy) (water | a snack | snacks | something to drink | a sandwich | food)", "can i (go | go and) (get | buy) (a | some) (coffee | water | food | snack)",
    ] },
    ask_food: { patterns: [
      "is there food on (the plane | board | the flight)",
      "do you serve (food | snacks | drinks) [on board]",
      "(will | do) we get (food | snacks | a snack | drinks)",
      "can i (bring | take) (my | a) (coffee | food | drink | sandwich) on (the plane | board)", "do (they | you) (give | serve | have) (food | snacks | drinks) on (the plane | board)",
    ] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | men's room | ladies room) #h:q_restroom",
      "where is the toilet #tip:us_restroom",
      "is there a (restroom | bathroom) (near here | nearby)",
    ] },
    ask_charge: { patterns: [
      "where can i charge my (phone | laptop)",
      "is there (an outlet | a charging station | somewhere to charge my phone) [near here]",
      "where (is | are) the (outlets | charging stations)",
      "is there (a place | somewhere) to charge my (phone | laptop)", "(can | could) i charge my (phone | laptop) [somewhere | here | near here]",
    ] },
    ask_duration: { patterns: ["how long is the flight", "how long does the flight take", "what time do we (land | arrive | get to boston)", "when do we (land | arrive)"] },
    ask_full: { patterns: ["is the flight full", "is it a full flight", "how full is the flight", "are there (any)? empty seats"] },
    ask_seat_change: { patterns: [
      "can i change my seat #h:q_seat",
      "is there a window seat [available | free | left]",
      "(can | could) i (get | have) a (window | aisle) seat",
      "can i sit (by the window | on the aisle | somewhere else)",
      "do you have (a window seat | an aisle seat | any window seats)",
    ] },
    ask_gate12: { patterns: [
      "where is gate (12 | twelve) #h:q_gate12",
      "how do i get to gate (12 | twelve)",
      "which way (is | to) gate (12 | twelve)",
      "gate (12 | twelve)",
    ] },
    can_board: { patterns: [
      "can i board [now] #h:bd_can",
      "is it my turn",
      "(is | are) (it | you | we) (boarding | calling) group {number} [now]",
      "i am in group {number} #h:bd_group",
      "group {number}",
      "can i (get on | go on | go through | go in) [the plane] [now]",
      "is (this | that) my group",
      "(can | may) i go [now]",
      "is (that | this) group {number}",
      "(that is | it is) me [group {number}]", "group {number} (that is | it is) (my group | me)", "(my turn | it is my turn)", "that is my group",
    ] },
    keep_bag: { patterns: [
      "i will keep it [with me] #h:of_keep", "i would like to keep it [with me]", "i want to keep it [with me] #blunt",
      "i will take it (with me | on board)",
      "i do not (want | need) to check (it | my bag | my suitcase)", "[sorry] i need it (on the plane | on board | with me | during the flight)",
      "(i have | there is) my (laptop | computer | medicine | valuables | camera) in (it | there)", "it is (small | not big | light) [i will take it with me]",
    ] },
    offer_yes: { patterns: [
      "[yes | sure] (that would be great | that would be nice) #h:of_yes",
      "[yes | sure] [you can] check it",
      "[yes] i would like to check it",
      "[yes] (that is | it is) a good idea", "(good | great) idea", "[okay] you can take it",
    ] },
    ask_free: { patterns: ["is it free #h:of_free", "is there a (fee | charge)", "do i (have | need) to pay [for it]", "how much is it"] },
    bag_check_q: { patterns: [
      "will it go to boston", "where do i (get | pick up) (it | my bag)", "where can i get it [back]", "where do i pick (it | my bag) up",
      "do i get it back in boston",
      "will i get it [back] in {city}", "(will | does) it go to {city}",
    ] },
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) #h:more_all",
      "no that is (all | it | everything)",
      "nothing else", "[no] i am (good | fine | all set) #h:more_good",
      "no (more)? questions",
      "(great | perfect | okay) (thank you | thanks)",
      "i will (wait | sit) (here | over there | there)", "[okay] i will wait", "i do not have (any | any more | more | other) questions",
    ] },
    more_q: { patterns: ["i have (a | one) question", "one more (thing | question)", "can i ask (a | one) question"] },
  },

  lines: {
    greet: [
      t("Hi there! | How | can | I | help | you?", "Sveiki! | Kuo | galiu | aš | padėti | jums?", "Sveiki! Kuo galiu jums padėti?"),
      t("Good | morning! | What | can | I | do | for you?", "Labas | rytas! | Ką | galiu | aš | padaryti | jums?", "Labas rytas! Kuo galiu padėti?"),
      t("Hi! | Can | I | help | you?", "Sveiki! | Ar galiu | aš | padėti | jums?", "Sveiki! Ar galiu jums padėti?"),
    ],
    ask_help: [
      t("How | can | I | help?", "Kuo | galiu | aš | padėti?", "Kuo galiu padėti?"),
      t("What | can | I | do | for you?", "Ką | galiu | aš | padaryti | jums?", "Kuo galiu padėti?"),
    ],
    gate_yes: [
      t("Yes, | this | is | flight | 223 | to | Boston.", "Taip, | tai | yra | skrydis | 223 | į | Bostoną.", "Taip, čia skrydis 223 į Bostoną.", { say: "Yes, this is flight two twenty-three to Boston." }),
      t("Yes, | you're | in | the | right | place.", "Taip, | jūs esate | — | — | reikiamoje | vietoje.", "Taip, jūs ten, kur reikia.",
        { flags: { 2: "“in” has no separate word: the locative vietoje carries it across “right”." } }),
    ],
    gate12_yes: [
      t("Yes, | we're boarding | flight | 223 | here, | at | gate | 12.", "Taip, | įlaipiname | skrydį | 223 | čia, | prie | vartų | 12.", "Taip, skrydį 223 įlaipiname čia, prie 12-ųjų vartų.",
        { say: "Yes, we're boarding flight two twenty-three here, at gate twelve." }),
    ],
    gate_changed: [
      t("Actually, | flight | 223 | just | moved | to | gate | 12.", "Tiesą sakant, | skrydis | 223 | ką tik | persikėlė | prie | vartų | 12.", "Tiesą sakant, skrydis 223 ką tik perkeltas prie 12-ųjų vartų.",
        { say: "Actually, flight two twenty-three just moved to gate twelve." }),
    ],
    gate12_where: [
      t("It's | just | down | the | hall, | on the left.", "Jie yra | čia pat | — | — | koridoriumi, | kairėje.", "Jie čia pat, koridoriumi, kairėje pusėje.",
        { flags: { 2: "“down” (down the hall): no separate word; the instrumental koridoriumi carries the direction." } }),
    ],
    heading_there: [
      t("We're heading | over | there | now, | too.", "Einame | — | ten | dabar | irgi.", "Mes irgi dabar einame ten.",
        { flags: { 1: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
    ],
    which_flight: [
      t("What's | your | flight | number?", "Koks yra | jūsų | skrydžio | numeris?", "Koks jūsų skrydžio numeris?"),
      t("Which | flight | are | you | on?", "Kuriuo | skrydžiu | — | jūs | skrendate?", "Kuriuo skrydžiu skrendate?",
        { flags: { 2: "“are … on” (be on a flight) = skrendate: “are” has no separate word (linked to “on”).", 4: "“on” (be on a flight): the verb skrendate carries it." } }),
    ],
    not_this_flight: [
      t("Hmm, | this | gate | is | for flight | 223 | to | Boston.", "Hmm, | šie | vartai | yra | skrydžiui | 223 | į | Bostoną.", "Hmm, šie vartai skirti skrydžiui 223 į Bostoną.",
        { say: "Hmm, this gate is for flight two twenty-three to Boston." }),
    ],
    see_bp: [
      t("Can | I | see | your | boarding | pass?", "Ar galiu | aš | pamatyti | jūsų | įlaipinimo | kortelę?", "Ar galiu pamatyti jūsų įlaipinimo kortelę?"),
    ],
    bp_you_are_223: [
      t("Oh, | you're | on | flight | 223. | You're | in | the | right | place!", "O, | jūs skrendate | — | skrydžiu | 223. | Jūs esate | — | — | reikiamoje | vietoje!", "O, jūs skrendate skrydžiu 223. Jūs ten, kur reikia!",
        { say: "Oh, you're on flight two twenty-three. You're in the right place!", flags: { 2: "“on” (be on a flight): the instrumental skrydžiu carries it.", 6: "“in” has no separate word: the locative vietoje carries it across “right”." } }),
    ],
    bp_thanks: [
      t("Thanks.", "Ačiū.", "Ačiū."),
    ],
    ontime_no: [
      t("Not | quite.", "Ne | visai.", "Ne visai."),
      t("Unfortunately, | no.", "Deja, | ne.", "Deja, ne."),
    ],
    delayed_yes: [
      t("Yes, | unfortunately.", "Taip, | deja.", "Taip, deja."),
    ],
    delayed_no: [
      t("No, | we're | on time | today.", "Ne, | mes skrendame | laiku | šiandien.", "Ne, šiandien skrendame laiku.",
        { flags: { 1: "“we're” (we're on time): the copula is rendered by skrendame (we fly)." } }),
    ],
    ontime: [
      t("Yes, | we're | on time | today.", "Taip, | mes skrendame | laiku | šiandien.", "Taip, šiandien skrendame laiku.",
        { flags: { 1: "“we're” (we're on time): the copula is rendered by skrendame (we fly)." } }),
      t("Yes, | we're | right | on time.", "Taip, | mes skrendame | tiksliai | laiku.", "Taip, skrendame tiksliai laiku.",
        { flags: { 1: "“we're” (we're on time): the copula is rendered by skrendame (we fly)." } }),
    ],
    boarding_time: [
      t("Boarding | starts | at | 7:30.", "Įlaipinimas | prasideda | — | 7:30.", "Įlaipinimas prasidės pusę aštuonių.",
        { say: "Boarding starts at seven thirty.", flags: { 2: "Clock-time “at” has no separate Lithuanian word: the time follows the verb directly (linked to 7:30)." } }),
      t("We'll start | boarding | at | 7:30.", "Pradėsime | įlaipinimą | — | 7:30.", "Įlaipinimą pradėsime pusę aštuonių.",
        { say: "We'll start boarding at seven thirty.", flags: { 2: "Clock-time “at” has no separate Lithuanian word (linked to 7:30)." } }),
    ],
    delay: [
      t("We | have | about | a | 20-minute | delay.", "Mes | turime | maždaug | — | 20 minučių | vėlavimą.", "Skrydis vėluoja maždaug 20 minučių.",
        { say: "We have about a twenty-minute delay." }),
      t("We're | running | about | 20 | minutes | late.", "Mes | vėluojame | maždaug | 20 | minučių | —.", "Vėluojame maždaug 20 minučių.",
        { say: "We're running about twenty minutes late.", flags: { 1: "“running … late” = vėluojame (linked to “late”).", 5: "“late”: carried by vėluojame (linked to “running”)." } }),
    ],
    delay_reason_plane: [
      t("The | plane | is coming | in | late | from | Chicago.", "— | Lėktuvas | atskrenda | — | vėlai | iš | Čikagos.", "Lėktuvas vėluoja atskristi iš Čikagos.",
        { flags: { 3: "“in” (come in): the prefix at- of atskrenda carries it (linked to “is coming”)." } }),
    ],
    delay_reason_crew: [
      t("We're waiting | for the crew.", "Laukiame | įgulos.", "Laukiame įgulos."),
    ],
    delay_reason_weather: [
      t("There's | some | bad | weather | in Boston.", "Yra | — | blogo | oro | Bostone.", "Bostone blogas oras.",
        { flags: { 1: "Partitive “some”: the genitive blogo oro carries it." } }),
    ],
    boarding_late: [
      t("We'll start | boarding | at | about | 7:50.", "Pradėsime | įlaipinimą | — | maždaug | 7:50.", "Įlaipinimą pradėsime maždaug 7:50.",
        { say: "We'll start boarding at about seven fifty.", flags: { 2: "Clock-time “at” has no separate Lithuanian word (linked to 7:50)." } }),
    ],
    departure: [
      t("We | leave | at | 8:10.", "Mes | išskrendame | — | 8:10.", "Išskrendame 8:10.", { say: "We leave at eight ten.", flags: { 2: "Clock-time “at” has no separate Lithuanian word (linked to 8:10)." } }),
    ],
    departure_late: [
      t("We | should | leave | at | about | 8:30.", "Mes | turėtume | išskristi | — | maždaug | 8:30.", "Turėtume išskristi maždaug 8:30.",
        { say: "We should leave at about eight thirty.", flags: { 3: "Clock-time “at” has no separate Lithuanian word (linked to 8:30)." } }),
    ],
    group_info: [
      t("You're | in group | 3. | It's | on | your | boarding | pass.", "Jūs esate | grupėje | 3. | Tai yra | — | jūsų | įlaipinimo | kortelėje.", "Jūs – 3 grupėje. Tai parašyta jūsų įlaipinimo kortelėje.",
        { say: "You're in group three. It's on your boarding pass.", flags: { 4: "“on” has no separate word: the locative kortelėje carries it across “your boarding”." } }),
    ],
    group_after: [
      t("Group | 3 | boards | right | after | group | 2.", "Grupė | 3 | įlipa | iškart | po | grupės | 2.", "Trečioji grupė įlipa iškart po antrosios.", { say: "Group three boards right after group two." }),
    ],
    carryon_ok: [
      t("Yes, | you | can | bring | one | carry-on | and | one | personal | item.", "Taip, | jūs | galite | atsinešti | vieną | rankinį bagažą | ir | vieną | asmeninį | daiktą.", "Taip, galite atsinešti vieną rankinio bagažo krepšį ir vieną asmeninį daiktą."),
    ],
    carryon_full: [
      t("Yes, | but | the | flight | is | full | today, | so | overhead | space | is | tight.", "Taip, | bet | — | skrydis | yra | pilnas | šiandien, | todėl | viršutinėse lentynose | vietos | yra | mažai.", "Taip, bet šiandien skrydis pilnas, todėl viršutinėse lentynose vietos mažai.",
        { flags: { 8: "“overhead” (overhead bins) = viršutinėse lentynose (the locative carries the place)." } }),
    ],
    wifi: [
      t("Yes, | there's | Wi-Fi | on board, | and | messaging | is | free.", "Taip, | yra | „Wi-Fi“ | lėktuve, | ir | žinutės | yra | nemokamos.", "Taip, lėktuve yra „Wi-Fi“, o žinutės nemokamos."),
    ],
    coffee: [
      t("There's | a | coffee shop | right | across from | gate | 10.", "Yra | — | kavinė | iškart | priešais | vartus | 10.", "Iškart priešais 10-uosius vartus yra kavinė.", { say: "There's a coffee shop right across from gate ten." }),
    ],
    coffee_time: [
      t("You | have | about | 20 | minutes.", "Jūs | turite | maždaug | 20 | minučių.", "Turite maždaug 20 minučių.", { say: "You have about twenty minutes." }),
    ],
    food_onboard: [
      t("We | have | free | snacks | and | drinks | on board.", "Mes | turime | nemokamų | užkandžių | ir | gėrimų | lėktuve.", "Lėktuve yra nemokamų užkandžių ir gėrimų."),
    ],
    restroom: [
      t("The | restrooms | are | right | across | the | hall.", "— | Tualetai | yra | iškart | kitoje | — | koridoriaus pusėje.", "Tualetai – iškart kitoje koridoriaus pusėje."),
    ],
    charge: [
      t("There | are | outlets | by | the | windows.", "— | Yra | lizdų | prie | — | langų.", "Prie langų yra elektros lizdų.",
        { flags: { 0: "Existential “there” has no Lithuanian word: yra carries it (linked to “are”)." } }),
    ],
    duration: [
      t("It's | about | an | hour | and | a | half.", "Tai yra | maždaug | — | valanda | ir | — | pusė.", "Maždaug pusantros valandos."),
    ],
    full_yes: [
      t("Yes, | it's | a | full | flight | today.", "Taip, | tai yra | — | pilnas | skrydis | šiandien.", "Taip, šiandien skrydis pilnas."),
    ],
    full_no: [
      t("It's | pretty | full, | but | there | are | a | few | empty | seats.", "Jis yra | gana | pilnas, | bet | — | yra | — | kelios | laisvos | vietos.", "Skrydis gana pilnas, bet yra kelios laisvos vietos.",
        { flags: { 4: "Existential “there” has no Lithuanian word: yra carries it (linked to “are”)." } }),
    ],
    seat_offer: [
      t("Let | me | see... | I | can | move | you | to | 16A, | a | window | seat.", "Leiskite | man | pažiūrėti... | Aš | galiu | perkelti | jus | į | 16A, | — | prie lango | vietą.", "Tuoj pažiūrėsiu… Galiu jus perkelti į 16A – vietą prie lango.",
        { say: "Let me see... I can move you to sixteen A, a window seat." }),
    ],
    seat_offer_q: [
      t("Would | you | like | that?", "Ar | jūs | norėtumėte | to?", "Ar norėtumėte?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    seat_changed: [
      t("Done! | Here's | your | new | boarding | pass.", "Padaryta! | Štai | jūsų | nauja | įlaipinimo | kortelė.", "Padaryta! Štai jūsų nauja įlaipinimo kortelė."),
    ],
    gate12_dir: [
      t("Gate | 12 | is | just | down | the | hall, | on the left.", "Vartai | 12 | yra | čia pat | — | — | koridoriumi, | kairėje.", "12-ieji vartai čia pat, koridoriumi, kairėje.",
        { say: "Gate twelve is just down the hall, on the left.", flags: { 4: "“down” (down the hall): no separate word; the instrumental koridoriumi carries the direction." } }),
    ],
    gate8_for_223: [
      t("Yes, | this | is | gate | 8, | for flight | 223 | to | Boston.", "Taip, | tai | yra | vartai | 8, | skrydžiui | 223 | į | Bostoną.", "Taip, čia 8-ieji vartai, skrydžiui 223 į Bostoną.",
        { say: "Yes, this is gate eight, for flight two twenty-three to Boston." }),
    ],
    gate12_not8: [
      t("No, | this | is | gate | 12 | now.", "Ne, | tai | yra | vartai | 12 | dabar.", "Ne, dabar čia 12-ieji vartai.", { say: "No, this is gate twelve now." }),
    ],
    free_wifi: [
      t("Yes, | messaging | is | free.", "Taip, | žinutės | yra | nemokamos.", "Taip, žinutės nemokamos."),
    ],
    clarify_what: [
      t("Sorry, | what | do | you | mean?", "Atsiprašau, | ką | — | jūs | turite omenyje?", "Atsiprašau, ką turite omenyje?",
        { flags: { 2: "Question “do” has no Lithuanian word; the tense sits on turite omenyje (linked to “mean”)." } }),
    ],
    seat_now: [
      t("Your | seat | is | 16A | now.", "Jūsų | vieta | yra | 16A | dabar.", "Dabar jūsų vieta – 16A.", { say: "Your seat is sixteen A now." }),
    ],
    gate8_here: [
      t("This | is | gate | 8.", "Tai | yra | vartai | 8.", "Čia aštuntieji vartai.", { say: "This is gate eight." }),
    ],
    ask_more: [
      t("Anything | else?", "Ką nors | daugiau?", "Dar ko nors?"),
      t("Can | I | help | with | anything | else?", "Ar galiu | aš | padėti | — | kuo nors | dar?", "Ar galiu dar kuo nors padėti?",
        { flags: { 3: "“with” has no separate word: the instrumental kuo nors carries it (linked to “anything”)." } }),
    ],
    what_q: [
      t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite."),
    ],
    have_seat: [
      t("Okay! | Please | have a seat. | We'll call | your | group.", "Gerai! | Prašau, | prisėskite. | Pakviesime | jūsų | grupę.", "Gerai! Prašom prisėsti, jūsų grupę pakviesime."),
      t("Great. | Have a seat, | and | we'll call | your | group | soon.", "Puiku. | Prisėskite, | ir | pakviesime | jūsų | grupę | netrukus.", "Puiku. Prisėskite, netrukus pakviesime jūsų grupę."),
    ],
    full_offer: [
      t("Oh, | one | more | thing: | this | flight | is | full | today, | so | we're checking | carry-on | bags | for free.", "O, | dar | vienas | dalykas: | šis | skrydis | yra | pilnas | šiandien, | todėl | registruojame | rankinio bagažo | krepšius | nemokamai.", "O, dar vienas dalykas: šiandien skrydis pilnas, todėl rankinio bagažo krepšius registruojame nemokamai."),
      t("This | flight | is | full | today, | so | we're checking | carry-on | bags | for free.", "Šis | skrydis | yra | pilnas | šiandien, | todėl | registruojame | rankinio bagažo | krepšius | nemokamai.", "Šiandien skrydis pilnas, todėl rankinio bagažo krepšius registruojame nemokamai."),
    ],
    full_offer_short: [
      t("We're checking | carry-on | bags | for free | today.", "Registruojame | rankinio bagažo | krepšius | nemokamai | šiandien.", "Šiandien rankinio bagažo krepšius registruojame nemokamai."),
    ],
    free_yes: [
      t("Yes, | it's | free.", "Taip, | tai yra | nemokama.", "Taip, nemokamai."),
    ],
    full_offer_q: [
      t("Would | you | like | to check | yours?", "Ar | jūs | norėtumėte | užregistruoti | savąjį?", "Ar norėtumėte užregistruoti savąjį?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    bag_tagged: [
      t("Great! | Here's | your | tag.", "Puiku! | Štai | jūsų | žymė.", "Puiku! Štai jūsų bagažo žymė."),
    ],
    bag_back_boston: [
      t("You'll get | it | back | in Boston, | at | baggage | claim.", "Atgausite | jį | — | Bostone, | — | bagažo | atsiėmimo salėje.", "Atgausite jį Bostone, bagažo atsiėmimo salėje.",
        { flags: { 2: "“back”: the prefix at- of atgausite carries it (linked to “You'll get”).", 4: "“at” has no separate word: the locative salėje carries it (linked to “claim”)." } }),
    ],
    no_problem: [
      t("No | problem.", "Jokių | problemų.", "Jokių problemų."),
    ],
    announce_hello: [
      t("Good | morning, | everyone!", "Labas | rytas, | visiems!", "Labas rytas visiems!"),
    ],
    announce_again: [
      t("Okay, | everyone!", "Gerai, | visi!", "Dėmesio visiems!"),
    ],
    announce_group: [
      t("Now | boarding | group | {$grp} | for flight | 223 | to | Boston.", "Dabar | įlaipinama | grupė | {$grp} | skrydžiui | 223 | į | Bostoną.", "Dabar į skrydį 223 į Bostoną įlaipinama {$grp} grupė.",
        { say: "Now boarding group {$grp} for flight two twenty-three to Boston." }),
    ],
    have_seat_wait: [
      t("Please | have a seat. | We'll call | your | group.", "Prašau, | prisėskite. | Pakviesime | jūsų | grupę.", "Prašom prisėsti, jūsų grupę pakviesime."),
    ],
    not_yet_short: [
      t("Not | yet.", "Dar | ne.", "Dar ne."),
    ],
    not_yet: [
      t("Not | yet. | We're boarding | group | 2 | right now. | Group | 3 | is | next.", "Dar | ne. | Įlaipiname | grupę | 2 | šiuo metu. | Grupė | 3 | yra | kita.", "Dar ne. Šiuo metu įlaipiname antrąją grupę, trečioji – kita.",
        { say: "Not yet. We're boarding group two right now. Group three is next." }),
    ],
    yes_board: [
      t("Yes, | go ahead!", "Taip, | prašom!", "Taip, prašom!"),
      t("Yes, | that's | you!", "Taip, | tai yra | jūs!", "Taip, tai jūsų grupė!"),
    ],
    scan_ask: [
      t("Can | I | scan | your | boarding | pass?", "Ar galiu | aš | nuskenuoti | jūsų | įlaipinimo | kortelę?", "Ar galiu nuskenuoti jūsų įlaipinimo kortelę?"),
      t("Boarding | pass, | please.", "Įlaipinimo | kortelę, | prašau.", "Įlaipinimo kortelę, prašau."),
    ],
    scanned: [
      t("Thank | you. | Enjoy | your | flight!", "Dėkoju | jums. | Mėgaukitės | savo | skrydžiu!", "Ačiū. Malonaus skrydžio!"),
      t("Thanks! | Have | a | great | flight!", "Ačiū! | Linkiu | — | puikaus | skrydžio!", "Ačiū! Puikaus skrydžio!"),
    ],
  },

  domains: {
    grp: () => [2, 3],
  },

  hints: {
    gate: {
      lt: "Pasitikslinti, ar tai tie vartai",
      items: [
        { id: "q_gate", s: t("Is | this | the | right | gate | for flight | 223?", "Ar | tai | — | reikiami | vartai | skrydžiui | 223?", "Ar čia tie vartai skrydžiui 223?",
          { say: "Is this the right gate for flight two twenty-three?", flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_gate_city", s: t("Is | this | the | gate | to | Boston?", "Ar | tai | — | vartai | į | Bostoną?", "Ar čia vartai į Bostoną?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_gate8", s: t("Is | this | gate | 8?", "Ar | tai | vartai | 8?", "Ar čia aštuntieji vartai?",
          { say: "Is this gate eight?", flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    flight: {
      lt: "Pasakyti savo skrydį",
      items: [
        { id: "fl_223", s: t("Flight | 223 | to | Boston.", "Skrydis | 223 | į | Bostoną.", "Skrydis 223 į Bostoną.", { say: "Flight two twenty-three to Boston." }) },
        { id: "bd_bp", s: t("Here's | my | boarding | pass.", "Štai | mano | įlaipinimo | kortelė.", "Štai mano įlaipinimo kortelė.") },
      ],
    },
    time: {
      lt: "Paklausti apie laiką",
      items: [
        { id: "q_ontime", s: t("Is | the | flight | on time?", "Ar | — | skrydis | laiku?", "Ar skrydis laiku?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_delayed", s: t("Is | the | flight | delayed?", "Ar | — | skrydis | vėluoja?", "Ar skrydis vėluoja?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the verb vėluoja carries “is delayed” (linked to “delayed”)." } }) },
        { id: "q_boarding", s: t("When | does | boarding | start?", "Kada | — | įlaipinimas | prasideda?", "Kada prasideda įlaipinimas?",
          { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on prasideda (linked to “start”)." } }) },
        { id: "q_why", s: t("Why | is | it | delayed?", "Kodėl | — | jis | vėluoja?", "Kodėl jis vėluoja?",
          { flags: { 1: "“is … delayed” = vėluoja: “is” has no separate word (linked to “delayed”)." } }) },
        { id: "q_group", s: t("What | group | am | I | in?", "Kokioje | grupėje | — | aš | —?", "Kokioje grupėje aš esu?",
          { flags: { 2: "“am” has no separate word here; natural Lithuanian adds esu at the end (linked to “I”).", 4: "Stranded “in”: the locative grupėje carries it (linked to “group”)." } }) },
      ],
    },
    more: {
      lt: "Paklausti dar ko nors",
      items: [
        { id: "q_carryon", s: t("Can | I | take | this | bag | on board?", "Ar galiu | aš | pasiimti | šį | krepšį | į lėktuvą?", "Ar galiu pasiimti šį krepšį į lėktuvą?") },
        { id: "q_wifi", s: t("Is | there | Wi-Fi | on board?", "Ar yra | — | „Wi-Fi“ | lėktuve?", "Ar lėktuve yra „Wi-Fi“?",
          { flags: { 1: "Existential “there” has no Lithuanian word: yra carries it (linked to “Is”)." } }) },
        { id: "q_coffee", s: t("Where | can | I | get | a | coffee?", "Kur | galiu | aš | gauti | — | kavos?", "Kur galėčiau nusipirkti kavos?") },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur tualetas?") },
        { id: "q_seat", s: t("Can | I | change | my | seat?", "Ar galiu | aš | pakeisti | savo | vietą?", "Ar galiu pasikeisti vietą?") },
        { id: "q_gate12", s: t("Where's | gate | 12?", "Kur yra | vartai | 12?", "Kur 12-ieji vartai?", { say: "Where's gate twelve?" }) },
      ],
    },
    thanks: {
      lt: "Padėkoti",
      items: [
        { id: "s_thanks", s: t("Thank | you | very much!", "Dėkoju | jums | labai!", "Labai ačiū!") },
        { id: "s_thanks_help", s: t("Thanks | for | your | help!", "Ačiū | už | jūsų | pagalbą!", "Ačiū už pagalbą!") },
      ],
    },
    done: {
      lt: "Pasakyti, kad klausimų nebeturi",
      items: [
        { id: "more_all", s: t("That's | all, | thank | you.", "Tai yra | viskas, | dėkoju | jums.", "Tai viskas, ačiū.") },
        { id: "more_good", s: t("No, | I'm | good, | thanks.", "Ne, | man | viskas gerai, | ačiū.", "Ne, viskas gerai, ačiū."), note: "„I'm good“ čia reiškia mandagų „ne, ačiū“." },
      ],
    },
    offer: {
      lt: "Atsakyti dėl nemokamos bagažo registracijos",
      items: [
        { id: "of_yes", s: t("Sure, | that | would | be | great.", "Žinoma, | tai | — | būtų | puiku.", "Žinoma, būtų puiku.", { flags: { 2: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
        { id: "of_keep", s: t("No, | I'll keep | it | with | me.", "Ne, | pasiliksiu | jį | su | savimi.", "Ne, pasiliksiu jį su savimi.") },
        { id: "of_free", s: t("Is | it | free?", "Ar | tai | nemokama?", "Ar tai nemokama?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    board: {
      lt: "Įlipti į lėktuvą",
      items: [
        { id: "bd_bp", s: t("Here's | my | boarding | pass.", "Štai | mano | įlaipinimo | kortelė.", "Štai mano įlaipinimo kortelė.") },
        { id: "bd_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "bd_can", s: t("Can | I | board | now?", "Ar galiu | aš | įlipti | dabar?", "Ar jau galiu įlipti?") },
      ],
    },
    board_early: {
      lt: "Paklausti, ar jau gali įlipti",
      items: [
        { id: "bd_can", s: t("Can | I | board | now?", "Ar galiu | aš | įlipti | dabar?", "Ar jau galiu įlipti?") },
        { id: "bd_group", s: t("I'm | in group | 3.", "Aš esu | grupėje | 3.", "Aš – trečioje grupėje.", { say: "I'm in group three." }) },
      ],
    },
    show_bp: {
      lt: "Parodyti įlaipinimo kortelę",
      items: [
        { id: "bd_bp", s: t("Here's | my | boarding | pass.", "Štai | mano | įlaipinimo | kortelė.", "Štai mano įlaipinimo kortelė.") },
        { id: "bd_here", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
  },

  tips: {
    uk_boardingcard: { key: "uk_boardingcard", lt: "Suprasta! Amerikoje sakoma „boarding pass“ (įlaipinimo kortelė).", better: "Here's my boarding pass." },
    uk_handluggage: { key: "uk_handluggage", lt: "Suprasta! Amerikoje dažniau sakoma „carry-on“ (rankinis bagažas).", better: "Can I take my carry-on?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
  },

  merges: {
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is misleading; an invitation to proceed = prašom / klauskite.", minimal: "Two words (C-LEX)." },
    "coffee shop": { reason: "lexical_expression", split: "coffee → kavos + shop → parduotuvė gives a shop selling coffee beans; a coffee shop is a café (kavinė).", minimal: "Two words forming one noun." },
    "across from": { reason: "lexical_expression", split: "across → skersai + from → iš is false; = priešais (C-LEX).", minimal: "Two words." },
    "we're heading": { reason: "grammatical_fusion", split: "we're → mes esame + heading → einantys gives a false stative reading; = einame (C-PROG).", minimal: "Two words." },
    "on board": { reason: "lexical_expression", split: "on → ant + board → lenta is false; “on board” = in/into the plane (lėktuve / į lėktuvą).", minimal: "Two words." },
    "have a seat": { reason: "lexical_expression", split: "have → turėkite, a → —, seat → vietą is false; = prisėskite.", minimal: "Three words (C-LEX)." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "gate", lt: "Paklausk, ar tai tie vartai" },
    { lt: "Sužinok skrydžio laiką", done: (c) => !!c.s.timeKnown },
    { step: "offer", lt: "Atsakyk dėl krepšio", optional: true },
    { step: "board", lt: "Įlipk į lėktuvą" },
  ],

  steps: [
    { id: "gate", done: (c) => !!c.s.gateOk,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      expects: ["ask_gate", "give_bp"],
      suggest: [{ lt: "Paklausti, ar tai tie vartai", hint: "gate" }, { lt: "Paklausti, ar skrydis laiku", hint: "time" }],
      help: (c) => { c.say("gate8_here"); c.say("which_flight"); expectFlight(c); } },
    { id: "time", when: (c) => !!c.s.gateOk, done: (c) => !!c.s.timeKnown || !!c.s.helpDone,
      ask: (c) => c.say("ask_more"),
      expects: QUESTIONS,
      suggest: [
        { lt: "Paklausti, ar skrydis laiku", hint: "time" },
        { lt: "Paklausti apie bagažą, „Wi-Fi“, kavą…", hint: "more" },
      ],
      yes: (c) => { if (plainAck(c.heard)) { helpDone(c); return; } c.say("what_q"); c.hold(); },
      no: (c) => { helpDone(c); } },
    { id: "help", when: (c) => !!c.s.gateOk && !!c.s.timeKnown, done: (c) => !!c.s.helpDone,
      ask: (c) => c.say("ask_more"),
      expects: QUESTIONS,
      suggest: [
        { lt: "Pasakyti, kad klausimų nebeturi", hint: "done" },
        { lt: "Paklausti dar ko nors", hint: "more" },
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
      expects: ["give_bp", "can_board"],
      suggest: [{ lt: "Paduoti įlaipinimo kortelę", hint: "board" }],
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
    c.hold(); // the greeting asks "How can I help you?" for the "gate" step
  },

  handlers: {
    affirm(c) { const st = gate.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); },
    deny(c) { const st = gate.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    g_bye(c) { c.say("g_bye"); c.end(); c.hold(); },
    ask_gate(c, slots) {
      const asksGate8 = /\bgate (8|eight)\b/i.test(c.heard) && !slots.city && (slots.number === 8 || slots.number === undefined);
      if (asksGate8) {
        if (c.s.gateOk) { c.say(c.s.moved ? "gate12_not8" : "gate8_for_223"); return; }
        if (c.s.gateChange) { c.say("gate8_here"); confirmGate(c); return; }
        c.say("gate8_for_223"); confirmGate(c, true);
        return;
      }
      if (!slots.number && !slots.city && !/boston|223/i.test(c.heard)) {
        if (c.s.gateOk) { c.say(c.s.moved ? "gate12_yes" : "gate_yes"); return; }
        c.say("which_flight"); expectFlight(c); return;
      }
      flightGiven(c, slots);
    },
    flight_info_ctx(c, slots) { flightGiven(c, slots); },
    give_bp(c) {
      if (c.step === "board" || c.s.called === 3) { boardingOk(c); return; }
      if (c.s.called === 2) { c.say("not_yet"); return; }
      if (!c.s.gateOk) { c.say("bp_thanks"); confirmGate(c); return; }
      c.say("bp_thanks");
    },
    ask_ontime(c) { withFlight(c, "ontime"); },
    ask_delayed(c) { withFlight(c, "delayed"); },
    ask_delay_reason(c) { withFlight(c, "delay_reason"); },
    why_short(c) { if (c.s.gateOk && c.s.timeKnown) QUESTION_LINES.delay_reason(c); else c.say("what_q"); },
    // (once boarding has started, "When can I board?" is about the learner's group)
    ask_boarding_time(c, slots, seg) { if (c.s.called && /\bcan i board\b/i.test(c.heard)) { gate.handlers.can_board(c, slots, seg); return; } withFlight(c, "boarding"); },
    ask_departure(c) { withFlight(c, "departure"); },
    ask_group(c) { c.say("group_info"); },
    ask_carryon(c) {
      c.s.topic = "carryon";
      if (c.s.fullFlight && !c.s.offerDone) { c.say("carryon_full"); offerGateCheck(c, true); return; }
      c.say("carryon_ok");
    },
    ask_wifi(c) { c.s.topic = "wifi"; c.say("wifi"); },
    ask_coffee(c) { c.say("coffee"); if (!c.s.helpDone) c.say("coffee_time"); },
    ask_food(c) { c.say("food_onboard"); },
    ask_restroom(c) { c.say("restroom"); },
    ask_charge(c) { c.say("charge"); },
    ask_duration(c) { c.say("duration"); },
    ask_full(c) { c.say(c.s.fullFlight ? "full_yes" : "full_no"); },
    ask_seat_change(c) {
      if (c.s.seatChanged) { c.say("seat_now"); return; }
      c.say("seat_offer"); c.say("seat_offer_q");
      const seatYes = (cc: Ctx) => { cc.s.seatChanged = true; cc.say("seat_changed"); cc.event("give", { item: "boarding-pass" }); };
      ask(c, { id: "seat_offer", hints: ["g_yesno"], suggest: [{ lt: "Sutikti arba atsisakyti", hint: "g_yesno" }],
        yes: seatYes,
        no: (cc) => { cc.say("no_problem"); },
        // "Oh, great, thank you!" = yes; "No, I'm good" = no (not "no more questions")
        on: { more_no: (cc) => { if (GREAT.test(cc.heard)) seatYes(cc); else cc.say("no_problem"); } },
        ask: (cc) => cc.say("seat_offer_q") });
    },
    ask_gate12(c) { c.say(c.s.moved ? "gate12_dir" : "gate8_here"); },
    can_board(c) {
      if (c.s.called === 3) { c.say("yes_board"); expectScan(c); return; }
      if (c.s.called === 2) { c.say("not_yet"); return; }
      if (c.s.gateOk && !c.s.helpDone) { c.say("not_yet_short"); if (c.s.timeKnown && !c.s.boardingTold) boardingInfo(c); helpDone(c, true); return; }
      c.say(c.s.delay ? "boarding_late" : "boarding_time");
      c.s.timeKnown = true;
    },
    keep_bag(c) { c.say("no_problem"); },
    offer_yes(c) {
      if (c.s.offerDone && !c.s.bagChecked) { c.s.bagChecked = true; c.say("bag_tagged"); c.say("bag_back_boston"); return; }
      c.say("no_problem");
    },
    bag_check_q(c) { c.say("bag_back_boston"); },
    ask_free(c) {
      const topic = c.s.topic as string | undefined;
      if (topic === "wifi") c.say("free_wifi");
      else if (topic === "carryon" || c.s.offerDone) c.say("free_yes");
      else c.say("clarify_what");
    },
    more_no(c) { if (c.s.gateOk && !c.s.helpDone) helpDone(c); },
    // a plain "Thank you" to "Anything else?" = no more questions (otherwise the ordinary thanks)
    g_thanks(c, slots) {
      if ((c.step === "help" || c.step === "time") && c.s.gateOk && !c.s.helpDone && PLAIN_THANKS.test(c.heard)) { c.say("g_welcome"); helpDone(c); return; }
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
    ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Is this the right gate for flight 223?", intent: "ask_gate", step: "gate", slots: { number: 223 } },
    { say: "Is this the gate to Boston?", intent: "ask_gate", slots: { city: "boston" } },
    { say: "Is this gate 8?", intent: "ask_gate", slots: { number: 8 } },
    { say: "Excuse me, is this the right gate for flight 223 to Boston?", intent: "ask_gate" },
    { say: "Am I at the right gate?", intent: "ask_gate" },
    { say: "Does flight 223 leave from here?", intent: "ask_gate" },
    { say: "I'm on flight 223 to Boston", intent: "ask_gate", slots: { number: 223 } },
    { say: "Flight 223 to Boston", intent: "ask_gate", step: "gate", slots: { number: 223 } },
    { say: "Here's my boarding pass.", intent: "give_bp" },
    { say: "Here's my boarding card", intent: "give_bp" },
    { say: "Is the flight on time?", intent: "ask_ontime" },
    { say: "Is the flight delayed?", intent: "ask_delayed", not: ["ask_ontime"] },
    { say: "Why is it delayed?", intent: "ask_delay_reason" },
    { say: "When does boarding start?", intent: "ask_boarding_time" },
    { say: "What time do we leave?", intent: "ask_departure" },
    { say: "What group am I in?", intent: "ask_group" },
    { say: "Can I take this bag on board?", intent: "ask_carryon" },
    { say: "Is there Wi-Fi on board?", intent: "ask_wifi" },
    { say: "Where can I get a coffee?", intent: "ask_coffee" },
    { say: "Where's the restroom?", intent: "ask_restroom" },
    { say: "Where can I charge my phone?", intent: "ask_charge" },
    { say: "Can I change my seat?", intent: "ask_seat_change" },
    { say: "Where's gate 12?", intent: "ask_gate12" },
    { say: "Can I board now?", intent: "can_board" },
    { say: "I'm in group 3.", intent: "can_board", slots: { number: 3 } },
    { say: "No, I'll keep it with me.", intent: "keep_bag", not: ["affirm"] },
    { say: "Is it free?", intent: "ask_free" },
    { say: "Yes, please check it.", intent: "offer_yes" },
    { say: "I don't want to check my bag", intent: "keep_bag", not: ["offer_yes"] },
    { say: "No, that's wrong", intent: "yn:no", not: ["affirm"] },
    { say: "Is this the right gate for flight 225?", intent: "ask_gate", slots: { number: 225 } },
    { say: "That's all, thank you.", intent: "more_no", step: "help" },
    { say: "No, I'm good.", intent: "more_no", step: "help" },
    { say: "Where is the toilet?", intent: "ask_restroom" },
    // more ways to say it (dev corpus tests/corpus/s64c-gate.json)
    { say: "Where is the flight to Boston?", intent: "ask_gate", slots: { city: "boston" } },
    { say: "Am I in the right place?", intent: "ask_gate" },
    { say: "Flight 223?", intent: "ask_gate", step: "gate", slots: { number: 223 } },
    { say: "I'm looking for gate 8", intent: "ask_gate" },
    { say: "Where do I board for Boston?", intent: "ask_gate", slots: { city: "boston" } },
    { say: "Where is gate 12?", intent: "ask_gate12", not: ["ask_gate"] },
    { say: "Is the plane late?", intent: "ask_delayed" },
    { say: "Do we leave on time?", intent: "ask_ontime" },
    { say: "How long do I have to wait?", intent: "ask_boarding_time" },
    { say: "Can I go get a coffee?", intent: "ask_coffee", not: ["can_board"] },
    { say: "Is there a place to charge my laptop?", intent: "ask_charge" },
    { say: "That's me, group 3", intent: "can_board", slots: { number: 3 } },
    { say: "My turn!", intent: "can_board" },
    { say: "Yes, that's a good idea", intent: "offer_yes" },
    { say: "No, I have my laptop in it", intent: "keep_bag", not: ["offer_yes"] },
    { say: "Will I get it in Boston?", intent: "bag_check_q" },
    { say: "Great, I'll wait here", intent: "more_no", step: "help" },
    { say: "I don't have any more questions", intent: "more_no", step: "help", not: ["more_q"] },
    { say: "Thank you so much", intent: "g_thanks", step: "help" },
    // meaning kept
    { say: "This is not my gate", intent: "none" },
    { say: "I'm not in group 3", intent: "none", step: "board" },
    { say: "No, don't check it", intent: "none" },
    { say: "Bananas fly over the gate", intent: "none" },
    { say: "My grandmother likes purple", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "Can I charge my phone somewhere?", intent: "ask_charge", step: "help" },
    { say: "Do I have time to get a coffee?", intent: "ask_coffee", step: "help" },
    { say: "When can I board?", intent: "ask_boarding_time", step: "help" },
    { say: "No, I need it on the plane.", intent: "keep_bag", step: "offer", not: ["offer_yes"] },
    { say: "Where do I pick it up?", intent: "bag_check_q", step: "offer" },
    { say: "I don't need it on the plane.", intent: "none", step: "offer" },
  ],

  sims: [
    { name: "happy path", turns: ["Is this the right gate for flight 223 to Boston?", "Is the flight on time?", "No, that's all. Thank you.", "Thanks!", "Here's my boarding pass."],
      expect: { complete: true }, auto: AUTO },
    { name: "questions first, flight asked back", turns: ["Is the flight on time?", "Flight 223 to Boston.", "What group am I in?", "Is there Wi-Fi on board?", "Where can I get a coffee?", "That's all, thanks.", "Okay.", "Here you go."],
      expect: { complete: true }, auto: AUTO },
    { name: "wrong flight number, seat change, early boarding", turns: ["Is this the gate for flight 225?", "Here's my boarding pass.", "Can I change my seat?", "Yes, please.", "Why is it delayed?", "No, I'm good.", "Thank you.", "Can I board now? I'm in group 3.", "Here you go."],
      expect: { complete: true }, auto: { ...AUTO, seat_offer: "Yes, please." } },
  ],
};

function expectEarly(c: Ctx) {
  const notYet = (cc: Ctx) => { if (!cc.s.notYetTold) { cc.s.notYetTold = true; cc.say("not_yet"); expectEarly(cc); } };
  ask(c, {
    id: "early", hints: ["board_early"], expects: ["can_board", "give_bp", "ask_group"],
    suggest: [{ lt: "Paklausti, ar jau gali įlipti", hint: "board_early" }],
    on: {
      can_board: (cc) => { notYet(cc); },
      give_bp: (cc) => { notYet(cc); },
      ask_group: (cc) => { cc.say("group_info"); cc.say("group_after"); expectEarly(cc); },
      g_ok: () => {}, g_thanks: () => {}, more_no: () => {}, g_howareyou_answer: () => {},
    },
    yes: () => {}, no: () => {},
  });
}

function helpDone(c: Ctx, afterNotYet = false) {
  c.s.helpDone = true;
  if (!c.s.timeKnown) {
    c.s.timeKnown = true;
    if (c.s.delay) { c.say("delay"); c.say("boarding_late"); } else c.say("boarding_time");
  } else if (!c.s.boardingTold) boardingInfo(c);
  c.say(afterNotYet ? "have_seat_wait" : "have_seat");
  ask(c, {
    id: "wait", hints: ["thanks", "more"], expects: ["can_board"],
    suggest: [{ lt: "Padėkoti ir palaukti", hint: "thanks" }, { lt: "Dar ko nors paklausti", hint: "more" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); },
      g_ok: () => {}, more_no: () => {}, g_howareyou_answer: () => {},
      can_board: (cc) => { cc.say(cc.s.delay ? "boarding_late" : "boarding_time"); },
    },
    yes: () => {}, no: () => {},
  });
}

export default gate;
