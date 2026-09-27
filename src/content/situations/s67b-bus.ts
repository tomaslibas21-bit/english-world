// Song 67 "Single or Return?" (part 2 of 2): the city bus at Union Station, driver Denise (route 7).
// A US city bus: ask whether the bus goes where you need, the fare ($2.50, exact change or tap a card /
// phone, $5 day pass, free transfers with a card), ask the driver to tell you when to get off,
// "Pull the cord / press the button", "Is this my stop?", thanks.
// Variation: Denise may ask "Do you know where to get off?"; a stop is announced before yours.
// Twist (visits ≥ 1): "Sorry, this bus is out of service. Take the 12 — it's right behind me."

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Destinations. `stops` 3–9 and `mins` 10/15/20/30 keep Lithuanian number agreement fixed
// ("7 stotelės", "20 minučių"). `stop` is the name of the stop the driver calls out.

const S = (en: string, say = en) => ({ en, lt: `„${en}“`, say });

const DESTS: EntityDef[] = [
  ent("downtown", "downtown", "centras/centro/centrui/centrą/centru/centre", "m", { chip: "centras",
    forms: ["downtown area", "down town"], attrs: { served: true, stops: 3, mins: 10, stop: S("Main Street"), bare: true } }),
  ent("old_town", "Old Town", "senamiestis/senamiesčio/senamiesčiui/senamiestį/senamiesčiu/senamiestyje", "m", { chip: "senamiestis",
    forms: ["old town", "the old town", "oldtown", "the old city", "old city", "the historic district"], attrs: { served: true, stops: 7, mins: 20, stop: S("Water Street") } }),
  ent("town_square", "Town | Square", "miesto | aikštė/aikštės/aikštei/aikštę/aikšte/aikštėje", "f", { chip: "miesto aikštė",
    forms: ["the town square", "the square", "the main square", "main square", "the farmers market", "farmers market"], attrs: { served: true, stops: 5, mins: 15, stop: S("Town Square"), loc: "town-square" } }),
  ent("museum", "the | museum", "— | muziejus/muziejaus/muziejui/muziejų/muziejumi/muziejuje", "m", { chip: "muziejus",
    forms: ["museum", "the art museum", "art museum", "the museum of art", "museum of art"], attrs: { served: true, stops: 6, mins: 15, stop: S("Museum"), loc: "museum" } }),
  ent("library", "the | library", "— | biblioteka/bibliotekos/bibliotekai/biblioteką/biblioteka/bibliotekoje", "f", { chip: "biblioteka",
    forms: ["library", "the public library", "public library"], attrs: { served: true, stops: 4, mins: 10, stop: S("Oak Avenue") } }),
  ent("hospital", "the | hospital", "— | ligoninė/ligoninės/ligoninei/ligoninę/ligonine/ligoninėje", "f", { chip: "ligoninė",
    forms: ["hospital"], attrs: { served: true, stops: 8, mins: 20, stop: S("Hospital") } }),
  ent("harbor", "the | harbor", "— | uostas/uosto/uostui/uostą/uostu/uoste", "m", { chip: "uostas",
    forms: ["harbor", "harbour", "the pier", "pier", "the port", "the waterfront", "waterfront", "the marina"], attrs: { served: true, stops: 8, mins: 20, stop: S("Pier"), loc: "the-pier" } }),
  ent("beach", "the | beach", "— | paplūdimys/paplūdimio/paplūdimiui/paplūdimį/paplūdimiu/paplūdimyje", "m", { chip: "paplūdimys",
    forms: ["beach", "the seaside", "seaside", "the sea", "the ocean", "the shore"], attrs: { served: true, stops: 9, mins: 30, stop: S("Beach Road"), last: true } }),
  ent("hotel", "the | hotel", "— | viešbutis/viešbučio/viešbučiui/viešbutį/viešbučiu/viešbutyje", "m", { chip: "viešbutis",
    forms: ["hotel", "the harborview hotel", "harborview hotel", "the harborview"], attrs: { served: true, stops: 3, mins: 10, stop: S("Main Street"), loc: "hotel" } }),
  ent("airport", "the | airport", "— | oro uostas/oro uosto/oro uostui/oro uostą/oro uostu/oro uoste", "m", { chip: "oro uostas",
    forms: ["airport"], attrs: { served: false } }),
  ent("mall", "the | mall", "— | prekybos centras/prekybos centro/prekybos centrui/prekybos centrą/prekybos centru/prekybos centre", "m", { chip: "prekybos centras",
    forms: ["mall", "the shopping mall", "shopping mall", "the shopping center", "shopping center"], attrs: { served: false } }),
];
const D = (id: string) => DESTS.find((e) => e.id === id)!;
const notBare = (e: EntityDef) => !e.attrs?.bare;
const onlyBare = (e: EntityDef) => !!e.attrs?.bare;

const AUTO: Record<string, string> = {
  dest: "Does this bus go to Old Town?",
  dest_again: "Old Town.",
  fare: "Can I pay by card?",
  card_tap: "Okay.",
  daypass: "Yes, please.",
  known: "No, could you tell me when to get off?",
  seated: "Thank you.",
  mid: "Is this my stop?",
  ride: "Thank you!",
  oos_dest: "Does the 12 go to Old Town?",
  oos_stop: "Where should I get off?",
};

// ---------------------------------------------------------------------------

/** c.expect() that also accepts "Yes, that's right" / "No" style answers (affirm/deny) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

/** The place a learner named: an entity, or "the city center" (tagged, American tip). */
const placeOf = (slots: any): string | undefined => {
  const p = slots.place;
  if (!p) return slots.dest;
  return p.dest ?? ((p.__tags || []).includes("downtown") ? "downtown" : undefined);
};

function setDest(c: Ctx, id: string, statement = false) {
  const e = D(id);
  if (!e.attrs?.served) {
    c.s.unserved = id;
    c.say(c.s.oos ? "oos_no" : "goes_no", { X: id });
    if (!c.s.oos) c.say("goes_no_where");
    c.hold();
    return;
  }
  const first = !c.s.dest;
  if (c.s.dest && c.s.dest !== id) c.s.stopsTold = false;
  c.s.dest = id;
  if (c.s.oos) { c.say("oos_goes"); return; }
  const isQ = /^\s*(hi|hello|excuse me|sorry|oh|okay)?[\s,]*is\b/i.test(c.heard);
  c.say(!first ? "goes_yes_short" : statement ? "goes_yes_stmt" : isQ ? "goes_yes_is" : "goes_yes");
}

function stopInfo(c: Ctx, withOffer = true, afterNo = false) {
  const e = D(c.s.dest);
  c.s.stopAsked = true;
  if (c.s.oos) {
    c.say("stop_name", { stop: e.attrs!.stop });
    c.say("oos_ask_driver");
    return;
  }
  if (withOffer) c.say(afterNo ? "stop_ok_no" : "stop_ok");
  if (!c.s.stopsTold) { c.s.stopsTold = true; c.say("stops_count", { stops: e.attrs!.stops }); }
  if (!c.s.cordTold) { c.s.cordTold = true; c.say("cord"); }
}

function expectSeated(c: Ctx) {
  // A beat for the ride: questions are answered, "thanks" / "okay" lets the bus go on.
  ask(c, {
    id: "seated", hints: ["thanks", "ride_q"],
    suggest: [{ lt: "Padėkoti ir atsisėsti", hint: "thanks" }, { lt: "Paklausti, kiek laiko važiuoti ar kiek stotelių", hint: "ride_q" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); },
      g_ok: () => {},
      ack: () => {},
      is_my_stop: (cc) => { cc.say("not_yet_tell"); expectSeated(cc); },
      ask_stops_count: (cc, sl, sg) => { bus.handlers.ask_stops_count(cc, sl, sg); expectSeated(cc); },
      ask_time: (cc, sl, sg) => { bus.handlers.ask_time(cc, sl, sg); expectSeated(cc); },
      ask_button: (cc, sl, sg) => { bus.handlers.ask_button(cc, sl, sg); expectSeated(cc); },
    },
    yes: () => {}, no: () => {},
  });
}

function closing(c: Ctx) {
  ask(c, { id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
      g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

function arrive(c: Ctx) {
  c.s.arrived = true;
  c.complete();
  c.say("arrive", { X: c.s.dest, stop: D(c.s.dest).attrs!.stop });
  c.s.byeSaid = true;
  c.say("bye");
  closing(c);
  // World hook (not handled yet): a location id where the destination is a real place in town.
  c.event("bus-ride", { dest: c.s.dest, to: D(c.s.dest).attrs!.loc });
}

// ---------------------------------------------------------------------------

export const bus: SituationDef = {
  id: "s67b-bus",
  song: 67,
  songTitle: "Single or Return?",
  title: { en: "Does This Bus Go Downtown?", lt: "Ar šis autobusas važiuoja į centrą?" },
  topic: { en: "Taking the bus", lt: "Autobusu po miestą" },
  chapter: 6,
  order: 2,
  location: "station",
  npc: "denise",
  goal: "Sužinok, ar autobusas važiuoja ten, kur reikia, ir paprašyk pasakyti, kur išlipti.",
  intro: "Autobusų aikštelė prie stoties. Prie durų – 7-ojo maršruto autobusas, vairuotoja Denise. Bilietas kainuoja 2,50 $. JAV autobuse vairuotojas grąžos neduoda: mokama tikslia suma arba pridedant kortelę ar telefoną.",
  entities: { dest: DESTS },

  grammar: {
    macros: {
      thisbus: "(this bus | this one | this | the seven | the 7 | number seven | the number seven)",
      twelve: "(the twelve | the 12 | twelve | 12 | number twelve | the number twelve)",
      goes: "(go | stop | get)",
    },
    slots: {
      place: { pattern: ["{dest}", "[the] (city | town) (centre | center) #downtown #tip:us_downtown", "center of town #downtown", "[the] (center | centre) of (the city | town) #downtown #tip:us_downtown"] },
      bill: { lexicon: [
        { id: "500", forms: ["five", "a five", "five dollar bill", "a five dollar bill", "5", "5 dollar bill", "five dollars"] },
        { id: "1000", forms: ["ten", "a ten", "ten dollar bill", "a ten dollar bill", "10", "ten dollars"] },
        { id: "2000", forms: ["twenty", "a twenty", "twenty dollar bill", "a twenty dollar bill", "20", "twenty dollars"] },
      ] },
    },
  },

  intents: {
    affirm: { patterns: ["(yes | yeah | yep) (that is | it is) (right | correct | me)", "(yes | yeah) (correct | exactly)", "yes i do", "i think so",
      "[yes | yeah] i know [where | where to get off]", "(good | great) idea"] },
    deny: { patterns: ["no (that is | it is) (wrong | not right)", "not really", "no i do not",
      "[no] (this is | it is) my first time [here | on this bus | in the city]", "[no] (no idea | i have no idea)", "[no] i do not know", "not exactly"] },
    ask_goes: { patterns: [
      "does @thisbus go to {place} #h:goes",
      "does @thisbus go {place} #h:goes_downtown",
      "is this the (bus | right bus | one) (to | for) {place} #h:is_this_bus",
      "is this the (bus | right bus | one) {place} #h:is_this_bus_dt",
      "is @thisbus going to {place}",
      "(do | does) (you | it) go to {place}",
      "(does | will) @thisbus stop (at | near | by) {place}",
      "can i take @thisbus to {place}",
      "does @thisbus go (to | near | by) {place}",
      "does @twelve go (to | near) {place} #twelve #h:goes12",
      "does @twelve go {place} #twelve #h:goes12_dt",
      "is @twelve going to {place} #twelve",
      "which bus goes to {place}",
      // more ways: "Going to the beach, is this right?", "The hospital, does this bus go there?"
      "[i am] going to {place} is (this | that | it) (right | the right bus | correct | okay)", "(can | could) i (get | go) to {place} (with | on | by) @thisbus",
      "{place} does @thisbus (go | stop) there", "i am looking for the bus (to | for) {place}",
      "[and] @twelve goes (to | near) {place} #twelve", "[and] @twelve goes {place} #twelve",
      "which bus (do | should | can) i take (to | for) {place}", "[the] bus goes (to | near) {place}", "{place} is (it | that) @thisbus",
    ] },
    going_to: { patterns: [
      "i am going to {place} #h:going_to",
      "i am going {place} #h:going_downtown",
      "(i need to | i want to | i would like to | i have to) go to {place}",
      // "One ticket to the town square, please." (one request, not a fare question plus a place)
      "[i would like | i need | (can | could) i (have | get)] (one | a) (ticket | ride) to {place}",
      "(i need to | i want to | i would like to) go {place}",
      "(i am trying to | i need to | i want to) get to {place}",
      "how do i get to {place} #h:how_get",
      "how (can | do) i get {place}",
      "(can | could) you take me to {place}", "i have to get to {place}",
    ] },
    dest_ctx: { patterns: ["[to] {place}", "{place} [please]", "to the {place}"] },
    dest_unknown: { patterns: [
      "does @thisbus go to {w:any}",
      "is this the bus to {w:any}",
      "(i am going | i need to go | i want to go) to {w:any}",
    ] },
    dest_neg: { patterns: [
      "not [to] {place}", "i am not going to {place}", "i do not (want | need) to go to {place}",
    ] },
    ask_fare: { patterns: [
      "how much is (it | the fare | a ticket | the bus | a ride | one ride) #h:fare",
      "how much does it cost", "what is the fare",
      "how much (do | should) i pay", "how much for (one | a ticket | a ride | one ride)", "(do | should) i pay (now | here)",
      "how much is the bus fare",
      "is it {price} [for (one ride | a ride | one trip | one person)]", "how much [is it]", "one (ticket | ride) [please]",
    ] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card) #h:pay_card",
      "(can | could) i (tap | use) my (card | credit card) #h:tap",
      "do you (take | accept) (cards | credit cards | card)",
      "(by | with) card", "card", "i will tap my card", "i will pay (by | with) card",
      "(visa | mastercard | credit card | debit card | card) [is] (okay | ok | fine | good)", "(can | do) i tap here",
      "[sorry] i do not have (cash | any cash) [(can | could) i pay (by | with) (card | my card)]", "[sorry] no cash [(only | just) card]",
    ] },
    pay_phone: { patterns: [
      "(can | could) i (pay with | use | tap) my phone", "(apple pay | google pay)",
      "do you (take | accept) (apple pay | google pay)", "can i pay with (apple pay | google pay)",
      "(i will | let me) (use | pay with | tap) my phone", "(i will | let me) pay (by | with) [my] phone",
    ] },
    pay_cash: { patterns: [
      "(can | could) i pay (in | with) cash", "(i will | i would like to) pay (in | with) cash", "cash", "i have cash",
      "here is {price} #h:here_price", "here is (the | my) money",
      "i have (exact change | the exact amount)",
      "here is (the exact change | exact change | the exact amount)", "(can | could) i pay (with | in) coins", "do you (take | accept) cash", "[sorry] i do not have a (card | credit card | bank card) [(only | just) cash]", "[sorry] no card [(only | just) cash]",
    ] },
    // an amount on its own while paying: "Two fifty, here."
    cash_ctx: { patterns: ["{price} [here | here you go | here you are]"] },
    give: { patterns: ["here you (go | are) #h:here", "there you go", "here it is", "here"] },
    no_change: { patterns: [
      "i (only | just) have (a | one) {bill} [dollar bill] #h:only_five",
      "i (only | just) have {bill} #h:only_five",
      "i do not have (exact change | change | small bills | coins | the exact amount) #h:no_exact",
      "(can | could) you (give me | make) change",
      "do you (give | have) change [for (a | one) {bill}] #h:give_change",
      "do i get change",
      "i (only | just) have (big bills | a big bill)",
      "(can | could) i pay with (a | one) {bill} [dollar bill]", "i have (a | one) {bill} [dollar bill] [is that (okay | ok | fine)]",
    ] },
    day_pass: { patterns: [
      "(can | could) i (get | buy | have) a day pass #h:day_pass",
      "(can | could) i (get | buy | have) a day ticket #tip:us_daypass",
      "do you (have | sell) day passes", "(is there | do you have) a day pass",
      "how much is a day pass",
      "i would like a day pass",
      "a day pass",
      "(i will | let me) (get | take) (a day pass | one | that)",
      "a day pass (is good | is fine | is okay | sounds good)", "what is a day pass",
    ] },
    no_day_pass: { patterns: ["i do not need a day pass", "no day pass [thanks]", "just one ride"] },
    transfer: { patterns: ["can i get a transfer", "do i need a transfer", "is the transfer free", "how do transfers work", "(can | do) i (change | transfer) for free"] },
    ask_stop: { patterns: [
      "(can | could | would) you tell me when to get off #h:tell_me",
      "(can | could | would) you (tell me | let me know) when we (get there | arrive | are there)",
      "(can | could | would) you (tell | let) me know when (we get | we are) (to | at) {place} #h:let_me_know",
      "(can | could | would) you (tell | let) me know when we get {place}",
      "(can | could | would) you tell me when (we get | we are) (to | at) {place}",
      "where (do | should) i get off #h:where_off",
      "where (do | should) i get off for {place} #h:where_off_x",
      "(can | could | would) you tell me where to get off #h:tell_where",
      "which stop (is | for) {place}",
      "what stop (do i get off at | is it | is {place})",
      "(can | could) you call out my stop",
      "(will | can | could) you (tell | let) me know when it is my stop",
      "tell me when to get off",
      "i do not know where to get off",
      "which stop is it",
      // more ways: "Please tell me when we arrive", "Where is my stop?", "Can you say me where I get off?"
      "[please] (tell me | let me know) when we (arrive | get there | are there | get close)", "(can | could | would) you (tell | let) me know my stop",
      "(can | could | would) you tell me the stop (for | to) {place}", "[please] call [out] my stop", "when (do | should | must) i get off",
      "where is my stop", "tell me [please] when (is | we are at | we reach) {place}", "(can | could | would) you [please] tell me when (it is | is) my stop",
      "(can | could) you say me (where | when) [i (get off | must get off | should get off)]", "(can | could) you help me (find my stop | with my stop | with the stop)",
      "[please] let me know when to get off",
    ] },
    // "Do you know where to get off?" — "No, could you tell me?"
    tell_me_ctx: { patterns: ["[please] tell me [when | where]", "(can | could | would) you tell me [when | where]"] },
    ask_stops_count: { patterns: [
      "how many stops [is it | to {place}] #h:how_many_stops",
      "how many stops (is it | until) {place}", "how many more stops [is it | to {place}]",
      "is it far #h:is_far",
      "how far is it",
    ] },
    ask_time: { patterns: [
      "how long does it take [to get (to {place} | there | {place})] #h:how_long",
      "how long is the (ride | trip)",
      "how long (until | till) we get there", "how many minutes [is it | does it take]",
    ] },
    ask_frequency: { patterns: [
      "how often (does the bus | do the buses | do buses) (come | run) #h:how_often",
      "when is the next bus",
      "(is there | do you have) a (schedule | timetable #tip:us_schedule)",
    ] },
    ask_last: { patterns: ["(when | what time) is the last bus [back] #h:last_bus", "when does the last bus (leave | go) [back]"] },
    ask_back: { patterns: ["where do i (catch | get | take) the bus back #h:bus_back", "how do i get back", "where is the stop (back | for the way back)"] },
    ask_button: { patterns: [
      "do i (press | push) the button #h:button",
      "do i pull the cord", "should i (press | push) the button", "should i pull the cord", "how do i ask (to stop | for a stop | the driver to stop)",
      "how do i (tell you | let you know) (to stop | i want to get off)",
      "what do i do when i want to get off",
      "where is the (cord | button | red button)",
    ] },
    is_my_stop: { patterns: [
      "is this my stop #h:my_stop",
      "is this {place}",
      "is this the stop for {place}",
      "are we (at | near) {place} [yet]",
      "(do | should) i get off here",
      "is (it | my stop) the next (stop | one)", "is the next (stop | one) {place}",
      "are we there yet",
      "is (it | that) my stop", "(do | should) i get off [here | now]", "not yet right", "is {place} (next | the next stop | the next one)",
    ] },
    sit_q: { patterns: ["can i sit anywhere", "where (can | should) i sit"] },
    ack: { patterns: ["(okay | all right) (thanks | thank you)", "got it [thanks | thank you]", "okay great", "sounds good [thanks | thank you]", "(great | perfect | awesome | cool | wonderful) (thanks | thank you)",
      "[okay | all right] i will sit [down | here | there]", "i will (pull the cord | press the button | pull it | press it)", "(done | all done | okay done | like this | is that okay | did it work)",
      "[okay] i will wait"] },
  },

  lines: {
    greet: [
      t("Hi there!", "Sveiki!", "Sveiki!"),
      t("Morning!", "Labas rytas!", "Labas rytas!"),
      t("Hi! | Come on in.", "Sveiki! | Užlipkite.", "Sveiki! Užlipkite."),
    ],
    greet_howareyou: [
      t("Hey, | how's it going?", "Labas, | kaip sekasi?", "Labas, kaip sekasi?"),
    ],
    ask_dest: [
      t("Where | are | you | headed?", "Kur | — | jūs | važiuojate?", "Kur važiuojate?",
        { flags: { 1: "“are … headed” = važiuojate; “are” has no separate word (linked to “headed”)." } }),
      t("Where | are | you | going?", "Kur | — | jūs | važiuojate?", "Kur važiuojate?",
        { flags: { 1: "Progressive “are” has no Lithuanian word; važiuojate carries the tense (linked to “going”)." } }),
    ],
    goes_yes: [
      t("Yep, | this | bus | goes | there.", "Taip, | šis | autobusas | važiuoja | ten.", "Taip, šis autobusas ten važiuoja."),
      t("Sure | does! | Hop on.", "Žinoma, | važiuoja! | Lipkite.", "Žinoma, važiuoja! Lipkite.",
        { flags: { 1: "Elliptical “does”: Lithuanian repeats the verb važiuoja." } }),
      t("Yes, | it | does.", "Taip, | jis | važiuoja.", "Taip, važiuoja.", { flags: { 2: "Elliptical “does”: Lithuanian repeats the verb važiuoja." } }),
    ],
    goes_yes_is: [
      t("Yes, | this | is | the | right | bus.", "Taip, | tai | yra | — | reikiamas | autobusas.", "Taip, tai tas autobusas."),
      t("Yep, | this | bus | goes | there.", "Taip, | šis | autobusas | važiuoja | ten.", "Taip, šis autobusas ten važiuoja."),
    ],
    goes_yes_again: [
      t("Yes, | it | does.", "Taip, | jis | važiuoja.", "Taip, važiuoja.", { flags: { 2: "Elliptical “does”: Lithuanian repeats the verb važiuoja." } }),
      t("Yep, | this | bus | goes | there.", "Taip, | šis | autobusas | važiuoja | ten.", "Taip, šis autobusas ten važiuoja."),
    ],
    goes_yes_stmt: [
      t("Perfect, | this | bus | goes | right | there.", "Puiku, | šis | autobusas | važiuoja | tiesiai | ten.", "Puiku, šis autobusas ten ir važiuoja."),
      t("Great, | hop on!", "Puiku, | lipkite!", "Puiku, lipkite!"),
    ],
    goes_yes_short: [
      t("Yep, | we | go | there | too.", "Taip, | mes | važiuojame | ten | irgi.", "Taip, ir ten važiuojame."),
    ],
    goes_no: [
      t("Sorry, | this | bus | doesn't go | to | {X}.", "Atsiprašau, | šis | autobusas | nevažiuoja | į | {X:acc}.", "Atsiprašau, šis autobusas į {X:acc} nevažiuoja."),
    ],
    goes_no_where: [
      t("You | want | the | 20. | It | leaves | from | the | other | side | of the station.", "Jums | reikia | — | 20-ojo. | Jis | išvyksta | iš | — | kitos | pusės | stoties.", "Jums reikia 20-ojo autobuso – jis išvyksta iš kitos stoties pusės.",
        { say: "You want the twenty. It leaves from the other side of the station." }),
    ],
    dest_unknown: [
      t("Hmm, | I | don't know | that | place.", "Hmm, | aš | nežinau | tos | vietos.", "Hmm, tokios vietos nežinau."),
    ],
    dest_neg_ack: [
      t("Oh, | okay. | Where | are | you | headed, | then?", "O, | gerai. | Kur | — | jūs | važiuojate, | tada?", "O, gerai. Tai kur važiuojate?",
        { flags: { 3: "“are … headed” = važiuojate; “are” has no separate word (linked to “headed”)." } }),
    ],
    fare_is: [
      t("It's | $2.50.", "Tai kainuoja | 2,50 $.", "Kaina – 2,50 $.", { say: "It's two fifty." }),
      t("That's | $2.50.", "Tai kainuoja | 2,50 $.", "Bilietas kainuoja 2,50 $.", { say: "That's two fifty." }),
      t("The | fare | is | $2.50.", "— | Bilietas | kainuoja | 2,50 $.", "Bilietas kainuoja 2,50 $.", { say: "The fare is two fifty." }),
    ],
    fare_how: [
      t("You | can | tap | a | card | or | pay | cash. | It | has | to be | exact | change.", "Jūs | galite | pridėti | — | kortelę | arba | mokėti | grynaisiais. | Tai | turi | būti | tiksli | suma.", "Galite pridėti kortelę arba mokėti grynaisiais – tik tikslia suma."),
    ],
    fare_ask: [
      t("That's | $2.50, | please.", "Tai kainuoja | 2,50 $, | prašau.", "Bilietas – 2,50 $, prašau.", { say: "That's two fifty, please." }),
    ],
    card_ok: [
      t("Sure, | just | tap | it | on | the | reader.", "Žinoma, | tiesiog | pridėkite | ją | prie | — | skaitytuvo.", "Žinoma, tiesiog pridėkite ją prie skaitytuvo."),
      t("Yep, | tap | right | here.", "Taip, | pridėkite | štai | čia.", "Taip, pridėkite štai čia."),
    ],
    phone_ok: [
      t("Sure, | you | can | tap | your | phone | too.", "Žinoma, | jūs | galite | pridėti | savo | telefoną | irgi.", "Žinoma, galima pridėti ir telefoną."),
    ],
    cash_ok: [
      t("Sure. | Just | put | it | in | the | farebox.", "Žinoma. | Tiesiog | įmeskite | juos | į | — | aparatą.", "Žinoma, tiesiog įmeskite pinigus į aparatą.",
        { flags: { 3: "“it” = the cash: Lithuanian uses the plural juos (pinigus)." } }),
    ],
    paid: [
      t("Thanks!", "Ačiū!", "Ačiū!"),
      t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
      t("You're | all set.", "Jums | viskas sutvarkyta.", "Viskas tvarkoje."),
    ],
    paid_already: [
      t("You | already | paid. | You're | all set.", "Jūs | jau | sumokėjote. | Jums | viskas sutvarkyta.", "Jūs jau sumokėjote, viskas tvarkoje."),
    ],
    no_change: [
      t("Sorry, | I | can't give | change.", "Atsiprašau, | aš | negaliu duoti | grąžos.", "Atsiprašau, grąžos duoti negaliu."),
      t("Sorry, | the | machine | doesn't give | change.", "Atsiprašau, | — | aparatas | neduoda | grąžos.", "Atsiprašau, aparatas grąžos neduoda."),
    ],
    no_change_options: [
      t("You | can | tap | a | card, | or | get | a | day | pass | for | $5.", "Jūs | galite | pridėti | — | kortelę, | arba | nusipirkti | — | dienos | bilietą | už | 5 $.", "Galite pridėti kortelę arba nusipirkti dienos bilietą už 5 $.",
        { say: "You can tap a card, or get a day pass for five dollars." }),
    ],
    daypass_info: [
      t("A | day | pass | is | $5. | You | can | ride | all | day.", "— | Dienos | bilietas | kainuoja | 5 $. | Jūs | galite | važinėti | visą | dieną.", "Dienos bilietas kainuoja 5 $ – galite važinėti visą dieną.",
        { say: "A day pass is five dollars. You can ride all day." }),
    ],
    daypass_q: [
      t("Would | you | like | one?", "Ar | jūs | norėtumėte | vieno?", "Norėtumėte?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    daypass_sold: [
      t("Here's | your | day | pass.", "Štai | jūsų | dienos | bilietas.", "Štai jūsų dienos bilietas."),
    ],
    transfer: [
      t("With | a | card, | transfers | are | free | for | two | hours.", "Su | — | kortele, | persėdimai | yra | nemokami | — | dvi | valandas.", "Su kortele persėsti galima nemokamai dvi valandas.",
        { flags: { 6: "“for” has no separate word: the accusative dvi valandas carries the duration." } }),
    ],
    stop_ok: [
      t("Sure! | I'll let | you | know.", "Žinoma! | Pranešiu | jums | —.", "Žinoma! Pranešiu jums.",
        { flags: { 3: "“know” (let … know) = pranešti: the verb pranešiu carries it (linked to “I'll let”)." } }),
      t("No | problem. | I'll tell | you | when | we | get | there.", "Jokių | problemų. | Pasakysiu | jums, | kai | mes | atvažiuosime | ten.", "Jokių problemų. Pasakysiu, kai atvažiuosime."),
    ],
    stop_ok_no: [
      t("No | problem, | I'll let | you | know.", "Jokių | problemų, | pranešiu | jums | —.", "Jokių problemų, pranešiu jums.",
        { flags: { 4: "“know” (let … know) = pranešti: the verb pranešiu carries it (linked to “I'll let”)." } }),
      t("That's | okay. | I'll tell | you | when | we | get | there.", "Tai | gerai. | Pasakysiu | jums, | kai | mes | atvažiuosime | ten.", "Nieko tokio. Pasakysiu, kai atvažiuosime."),
    ],
    stop_ok_short: [
      t("Sit | back | and | relax.", "Atsisėskite | patogiai | ir | atsipalaiduokite.", "Atsisėskite patogiai ir atsipalaiduokite.",
        { flags: { 1: "“back” (sit back) = patogiai: the adverb carries the sense of leaning back and relaxing." } }),
    ],
    stops_count: [
      t("It's | about | {$stops} | stops.", "Tai yra | maždaug | {$stops} | stotelės.", "Važiuoti maždaug {$stops} stoteles."),
    ],
    ride_time: [
      t("It | takes | about | {$mins} | minutes.", "Tai | užtrunka | maždaug | {$mins} | minučių.", "Važiuoti maždaug {$mins} minučių."),
    ],
    stop_name: [
      t("It's | the | {$stop} | stop.", "Tai yra | — | {$stop} | stotelė.", "Tai {$stop} stotelė."),
    ],
    last_stop: [
      t("It's | the | last | stop.", "Tai yra | — | paskutinė | stotelė.", "Tai paskutinė stotelė."),
    ],
    cord: [
      t("Just | pull | the | cord | when | we | get | close.", "Tiesiog | patraukite | — | virvelę, | kai | mes | būsime | arti.", "Tiesiog patraukite virvelę, kai būsime arti."),
      t("Press | the | red | button | when | you | want | to get off.", "Paspauskite | — | raudoną | mygtuką, | kai | jūs | norėsite | išlipti.", "Paspauskite raudoną mygtuką, kai norėsite išlipti."),
    ],
    ask_known: [
      t("Do | you | know | where | to get off?", "Ar | jūs | žinote, | kur | išlipti?", "Ar žinote, kur išlipti?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    known_great: [
      t("Great.", "Puiku.", "Puiku."),
    ],
    have_seat: [
      t("Have a seat.", "Prisėskite.", "Prisėskite."),
      t("Go ahead | and | have a seat.", "Prašom | — | prisėsti.", "Prašom prisėsti.",
        { flags: { 1: "“and” joins “go ahead” to the next verb; Lithuanian uses the infinitive after prašom (linked to “have a seat”)." } }),
    ],
    mid_stop: [
      t("Next | stop: | Riverside.", "Kita | stotelė: | „Riverside“.", "Kita stotelė – „Riverside“."),
    ],
    not_yet_next: [
      t("Not | yet. | Yours | is | the | next | stop.", "Dar | ne. | Jūsų | yra | — | kita | stotelė.", "Dar ne. Jūsų – kita stotelė."),
    ],
    not_yet_tell: [
      t("Not | yet. | I'll let | you | know.", "Dar | ne. | Pranešiu | jums | —.", "Dar ne. Pranešiu jums.",
        { flags: { 4: "“know” (let … know) = pranešti: the verb pranešiu carries it (linked to “I'll let”)." } }),
    ],
    arrive: [
      t("Okay, | this | is | {X}! | This | is | your | stop.", "Gerai, | tai | yra | {X:nom}! | Tai | yra | jūsų | stotelė.", "Gerai, štai {X:nom}! Čia jūsų stotelė."),
      t("{$stop}! | This | is | your | stop.", "{$stop}! | Tai | yra | jūsų | stotelė.", "{$stop}! Čia jūsų stotelė."),
    ],
    my_stop_yes: [
      t("Yep, | this | is | your | stop!", "Taip, | tai | yra | jūsų | stotelė!", "Taip, čia jūsų stotelė!"),
    ],
    frequency: [
      t("Every | 20 | minutes.", "Kas | 20 | minučių.", "Kas 20 minučių.", { say: "Every twenty minutes." }),
      t("They | come | every | 20 | minutes.", "Jie | važiuoja | kas | 20 | minučių.", "Autobusai važiuoja kas 20 minučių.", { say: "They come every twenty minutes." }),
    ],
    last_bus: [
      t("The | last | bus | back | leaves | at | 11:30.", "— | Paskutinis | autobusas | atgal | išvyksta | — | 23:30.", "Paskutinis autobusas atgal išvyksta 23.30.",
        { say: "The last bus back leaves at eleven thirty.", flags: { 5: "Clock-time “at” has no separate Lithuanian word; Lithuanian uses the 24-hour time." } }),
    ],
    bus_back: [
      t("The | bus | back | stops | across | the | street.", "— | Autobusas | atgal | sustoja | kitoje | — | gatvės pusėje.", "Autobusas atgal sustoja kitoje gatvės pusėje."),
    ],
    button: [
      t("Yep. | Pull | the | cord | or | press | the | red | button.", "Taip. | Patraukite | — | virvelę | arba | paspauskite | — | raudoną | mygtuką.", "Taip. Patraukite virvelę arba paspauskite raudoną mygtuką."),
    ],
    sit_anywhere: [
      t("Sure, | anywhere | you | like.", "Žinoma, | bet kur, | kur | norite.", "Žinoma, kur tik norite.",
        { flags: { 2: "“you like” = kur norite: Lithuanian repeats kur and drops the pronoun (linked to “like”)." } }),
    ],
    no_problem: [
      t("No | problem.", "Jokių | problemų.", "Jokių problemų."),
    ],
    bye: [
      t("Have | a | good one!", "Linkiu | — | geros dienos!", "Geros dienos!"),
      t("Take care!", "Laikykitės!", "Laikykitės!"),
      t("Enjoy | your | day!", "Mėgaukitės | savo | diena!", "Geros dienos!"),
    ],
    oos: [
      t("Sorry, | this | bus | is out of service.", "Atsiprašau, | šis | autobusas | neveža keleivių.", "Atsiprašau, šis autobusas keleivių neveža."),
    ],
    oos_take12: [
      t("Take | the | 12. | It's | right | behind | me.", "Važiuokite | — | 12-uoju. | Jis yra | iškart | už | manęs.", "Važiuokite 12-uoju – jis iškart už manęs.",
        { say: "Take the twelve. It's right behind me." }),
    ],
    oos_goes: [
      t("Yep, | the | 12 | goes | there | too.", "Taip, | — | 12-asis | važiuoja | ten | irgi.", "Taip, 12-asis irgi ten važiuoja.", { say: "Yep, the twelve goes there too." }),
    ],
    oos_this_no: [
      t("This | bus | isn't running, | but | the | 12 | goes | there.", "Šis | autobusas | nevažiuoja, | bet | — | 12-asis | važiuoja | ten.", "Šis autobusas nevažiuoja, bet 12-asis ten važiuoja.", { say: "This bus isn't running, but the twelve goes there." }),
    ],
    oos_no: [
      t("The | 12 | doesn't go | to | {X}.", "— | 12-asis | nevažiuoja | į | {X:acc}.", "12-asis į {X:acc} nevažiuoja.", { say: "The twelve doesn't go to {X}." }),
    ],
    oos_pay: [
      t("You | can | pay | on | the | 12.", "Jūs | galite | sumokėti | — | — | 12-ajame.", "Sumokėsite 12-ajame autobuse.",
        { say: "You can pay on the twelve.", flags: { 3: "“on” has no separate word: the locative 12-ajame carries it." } }),
    ],
    oos_fare: [
      t("It's | the | same | fare, | $2.50.", "Tai yra | — | ta pati | kaina, | 2,50 $.", "Kaina ta pati – 2,50 $.", { say: "It's the same fare, two fifty." }),
    ],
    oos_ask_driver: [
      t("Just | ask | the | driver | to tell | you | where | to get off.", "Tiesiog | paprašykite | — | vairuotojo | pasakyti | jums, | kur | išlipti.", "Tiesiog paprašykite vairuotojo pasakyti, kur išlipti."),
    ],
    oos_bye: [
      t("Better | hurry, | it's leaving | soon!", "Geriau | paskubėkite, | jis išvažiuoja | netrukus!", "Paskubėkite, jis netrukus išvažiuoja!"),
    ],
  },

  domains: {
    stops: () => [3, 4, 5, 6, 7, 8, 9],
    mins: () => [10, 15, 20, 30],
    stop: () => [...new Set(DESTS.filter((e) => e.attrs?.stop).map((e) => JSON.stringify(e.attrs!.stop)))].map((x) => JSON.parse(x)),
  },

  hints: {
    ask_bus: {
      lt: "Paklausti, ar autobusas važiuoja ten, kur reikia", slot: "dest", examples: ["old_town", "downtown", "museum", "beach"],
      items: [
        { id: "goes", s: t("Does | this | bus | go | to | {X}?", "Ar | šis | autobusas | važiuoja | į | {X:acc}?", "Ar šis autobusas važiuoja į {X:acc}?", { flags: { 0: "Question “Does” = the particle ar." } }), only: notBare },
        { id: "goes_downtown", s: t("Does | this | bus | go | downtown?", "Ar | šis | autobusas | važiuoja | į centrą?", "Ar šis autobusas važiuoja į centrą?", { flags: { 0: "Question “Does” = the particle ar." } }), only: onlyBare },
        { id: "is_this_bus", s: t("Is | this | the | bus | to | {X}?", "Ar | tai | — | autobusas | į | {X:acc}?", "Ar tai autobusas į {X:acc}?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }), only: notBare },
        { id: "is_this_bus_dt", s: t("Is | this | the | bus | downtown?", "Ar | tai | — | autobusas | į centrą?", "Ar tai autobusas į centrą?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }), only: onlyBare },
        { id: "going_to", s: t("I'm going | to | {X}.", "Važiuoju | į | {X:acc}.", "Važiuoju į {X:acc}."), only: notBare },
        { id: "going_downtown", s: t("I'm going | downtown.", "Važiuoju | į centrą.", "Važiuoju į centrą."), only: onlyBare },
        { id: "how_get", s: t("How | do | I | get | to | {X}?", "Kaip | — | man | nuvažiuoti | į | {X:acc}?", "Kaip man nuvažiuoti į {X:acc}?",
          { flags: { 1: "Question “do” has no Lithuanian word; the dative man + infinitive carries the question (linked to “get”)." } }), only: notBare },
      ],
    },
    fare: {
      lt: "Susimokėti už bilietą",
      items: [
        { id: "here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "tap", s: t("Can | I | tap | my | card?", "Ar galiu | aš | pridėti | savo | kortelę?", "Ar galiu pridėti kortelę?") },
        { id: "only_five", s: t("I | only | have | a | five.", "Aš | tik | turiu | — | penkinę.", "Turiu tik penkių dolerių banknotą.") },
        { id: "no_exact", s: t("I | don't have | exact | change.", "Aš | neturiu | tikslios | sumos.", "Neturiu tikslios sumos.") },
      ],
    },
    fare_q: {
      lt: "Paklausti kainos ar dienos bilieto",
      items: [
        { id: "fare", s: t("How much | is | the | fare?", "Kiek | kainuoja | — | bilietas?", "Kiek kainuoja bilietas?") },
        { id: "day_pass", s: t("Can | I | get | a | day | pass?", "Ar galiu | aš | gauti | — | dienos | bilietą?", "Ar galiu nusipirkti dienos bilietą?") },
        { id: "give_change", s: t("Do | you | give | change?", "Ar | jūs | duodate | grąžą?", "Ar duodate grąžą?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    ask_12: {
      lt: "Paklausti, ar 12-asis važiuoja ten, kur reikia", slot: "dest", examples: ["old_town", "downtown", "museum", "beach"],
      items: [
        { id: "goes12", s: t("Does | the | 12 | go | to | {X}?", "Ar | — | 12-asis | važiuoja | į | {X:acc}?", "Ar 12-asis važiuoja į {X:acc}?",
          { say: "Does the twelve go to {X}?", flags: { 0: "Question “Does” = the particle ar." } }), only: notBare },
        { id: "goes12_dt", s: t("Does | the | 12 | go | downtown?", "Ar | — | 12-asis | važiuoja | į centrą?", "Ar 12-asis važiuoja į centrą?",
          { say: "Does the twelve go downtown?", flags: { 0: "Question “Does” = the particle ar." } }), only: onlyBare },
      ],
    },
    stop: {
      lt: "Paprašyti pasakyti, kur išlipti", slot: "dest", examples: ["old_town", "museum", "beach"],
      items: [
        { id: "tell_me", s: t("Could | you | tell | me | when | to get off?", "Ar galėtumėte | jūs | pasakyti | man, | kada | išlipti?", "Ar galėtumėte pasakyti, kada man išlipti?") },
        { id: "tell_where", s: t("Could | you | tell | me | where | to get off?", "Ar galėtumėte | jūs | pasakyti | man, | kur | išlipti?", "Ar galėtumėte pasakyti, kur man išlipti?") },
        { id: "where_off", s: t("Where | should | I | get off?", "Kur | turėčiau | aš | išlipti?", "Kur turėčiau išlipti?") },
        { id: "let_me_know", s: t("Could | you | let | me | know | when | we | get | to | {X}?", "Ar galėtumėte | jūs | — | man | pranešti, | kai | mes | atvažiuosime | į | {X:acc}?", "Ar galėtumėte pranešti, kai atvažiuosime į {X:acc}?",
          { flags: { 2: "“let … know” = pranešti: “let” has no separate word (linked to “know”)." } }), only: notBare },
        { id: "where_off_x", s: t("Where | should | I | get off | for | {X}?", "Kur | turėčiau | aš | išlipti | prie | {X:gen}?", "Kur turėčiau išlipti, kad patekčiau į {X:acc}?") },
      ],
    },
    ride_q: {
      lt: "Paklausti, kiek stotelių ar kiek laiko",
      items: [
        { id: "how_many_stops", s: t("How many | stops | is | it?", "Kiek | stotelių | yra | iki ten?", "Kiek stotelių važiuoti?",
          { flags: { 3: "“it” (the distance): Lithuanian says iki ten (to there)." } }) },
        { id: "how_long", s: t("How long | does | it | take?", "Kiek laiko | — | tai | užtrunka?", "Kiek laiko važiuoti?",
          { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on užtrunka (linked to “take”)." } }) },
        { id: "is_far", s: t("Is | it | far?", "Ar | tai | toli?", "Ar toli?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    thanks: {
      lt: "Padėkoti",
      items: [
        { id: "s_thanks", s: t("Thank | you | very much!", "Dėkoju | jums | labai!", "Labai ačiū!") },
        { id: "s_thanks_help", s: t("Thanks | for | your | help!", "Ačiū | už | jūsų | pagalbą!", "Ačiū už pagalbą!") },
      ],
    },
    ride: {
      lt: "Važiuojant: paklausti, ar jau tavo stotelė",
      items: [
        { id: "my_stop", s: t("Is | this | my | stop?", "Ar | tai | mano | stotelė?", "Ar čia mano stotelė?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "button", s: t("Do | I | press | the | button?", "Ar | man | spausti | — | mygtuką?", "Ar man spausti mygtuką?", { flags: { 0: "Question “Do” = the particle ar; the dative man + infinitive carries it." } }) },
      ],
    },
    more: {
      lt: "Kiti naudingi klausimai",
      items: [
        { id: "how_often", s: t("How | often | does | the | bus | come?", "Kaip | dažnai | — | — | autobusas | važiuoja?", "Kaip dažnai važiuoja autobusas?",
          { flags: { 2: "Question “does” has no Lithuanian word; the tense sits on važiuoja (linked to “come”)." } }) },
        { id: "last_bus", s: t("When's | the | last | bus | back?", "Kada yra | — | paskutinis | autobusas | atgal?", "Kada paskutinis autobusas atgal?") },
        { id: "bus_back", s: t("Where | do | I | catch | the | bus | back?", "Kur | — | man | sėsti į | — | autobusą | atgal?", "Kur sėsti į autobusą atgal?",
          { flags: { 1: "Question “do” has no Lithuanian word; the dative man + infinitive carries the question (linked to “catch”)." } }) },
      ],
    },
  },

  tips: {
    us_downtown: { key: "us_downtown", lt: "Suprasta! Amerikoje miesto centras dažniausiai vadinamas „downtown“.", better: "Does this bus go downtown?" },
    us_daypass: { key: "us_daypass", lt: "Suprasta! Amerikoje sakoma „day pass“ (dienos bilietas).", better: "Can I get a day pass?" },
    us_schedule: { key: "us_schedule", lt: "Suprasta! Amerikoje tvarkaraštis – „schedule“.", better: "Is there a schedule?" },
  },

  merges: {
    "old town": { reason: "lexical_expression", split: "Old → senas + Town → miestas gives “an old town”; the district name = senamiestis (one Lithuanian compound).", minimal: "Two words forming one name." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatytas is false; “all set” = everything is done (viskas sutvarkyta).", minimal: "Two words." },
    "hop on": { reason: "lexical_expression", split: "hop → šokti + on → ant is false; the invitation to board = lipkite.", minimal: "Two words (C-PHR)." },
    "come on in": { reason: "lexical_expression", split: "come → ateikite, on → —, in → į is false; the invitation to board = užlipkite.", minimal: "Three words." },
    "to get off": { reason: "grammatical_fusion", split: "to → į + get → gauti + off → nuo is false; infinitive “to” is the ending -ti and “get off” (a bus) = išlipti (C-INF + C-PHR).", minimal: "Three words; none can be removed." },
    "get off": { reason: "lexical_expression", split: "get → gauti + off → nuo is false; leaving a bus = išlipti (C-PHR).", minimal: "Two words." },
    "is out of service": { reason: "lexical_expression", split: "is → yra, out → lauke, of → —, service → aptarnavimas is false; a bus “out of service” = neveža keleivių.", minimal: "Four words forming one predicate (as “is down” → neveikia)." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is misleading; an invitation = prašom.", minimal: "Two words (C-LEX)." },
    "good one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word “one” in “have a good one” = a good day (geros dienos) (C-ONE).", minimal: "Two words." },
    "have a seat": { reason: "lexical_expression", split: "have → turėkite, a → —, seat → vietą is false; = prisėskite.", minimal: "Three words (C-LEX)." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgai gives an unnatural “kaip ilgai”; asking a duration = kiek laiko.", minimal: "Two words (C-LEX)." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug gives “kaip daug”; asking a number = kiek.", minimal: "Two words (C-LEX)." },
    "isn't running": { reason: "grammatical_fusion", split: "isn't → nėra + running → bėgantis is false; a bus that isn't running = nevažiuoja (C-NEG + C-PROG).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Paklausk, ar važiuoja ten" },
    { lt: "Susimokėk už bilietą", optional: true, when: (c) => !c.s.oos, done: (c) => !!c.s.paid },
    { lt: "Paprašyk pasakyti, kur išlipti", done: (c) => !!c.s.stopAsked },
    { lt: "Išlipk savo stotelėje", optional: true, when: (c) => !c.s.oos, done: (c) => !!c.s.arrived },
  ],

  steps: [
    { id: "dest", done: (c) => !!c.s.dest,
      ask: (c) => c.say("ask_dest"),
      expects: ["ask_goes", "going_to", "dest_ctx"],
      suggest: [{ lt: "Paklausti, ar autobusas važiuoja ten, kur tau reikia", hint: "ask_bus", options: "dest" }, { lt: "Paklausti kainos", hint: "fare_q" }],
      help: (c) => { c.say("dest_unknown"); c.say("ask_dest"); } },
    { id: "fare", when: (c) => !c.s.oos && !!c.s.dest, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is"); if (c.s.fareHow) c.say("fare_how"); }
        else c.say("fare_ask");
      },
      expects: ["pay_card", "pay_phone", "pay_cash", "give", "no_change", "day_pass", "ask_fare", "cash_ctx"],
      suggest: [{ lt: "Susimokėti (kortele, telefonu ar grynaisiais)", hint: "fare" }, { lt: "Paklausti apie grąžą ar dienos bilietą", hint: "fare_q" }] },
    { id: "known", when: (c) => !!c.s.dest && (c.s.oos || !!c.s.paid) && !!c.s.askKnown, done: (c) => !!c.s.stopAsked,
      ask: (c) => c.say("ask_known"),
      expects: ["ask_stop", "affirm", "deny", "tell_me_ctx"],
      suggest: [{ lt: "Paprašyti pasakyti, kur išlipti", hint: "stop" }],
      yes: (c) => { c.s.stopAsked = true; c.say("known_great"); if (!c.s.cordTold && !c.s.oos) { c.s.cordTold = true; c.say("cord"); } },
      no: (c) => { stopInfo(c, true, true); } },
    { id: "stop", when: (c) => !!c.s.dest && (c.s.oos || !!c.s.paid), done: (c) => !!c.s.stopAsked,
      ask: (c) => {
        if (!c.s.oos && !c.s.seatSaid) { c.s.seatSaid = true; c.say("have_seat"); return; }
        c.s.askKnown = true;
        c.ask("known");
      },
      expects: ["ask_stop", "ask_stops_count", "ask_time"],
      suggest: [{ lt: "Paprašyti pasakyti, kur išlipti", hint: "stop" }, { lt: "Paklausti, kiek stotelių ar kiek laiko", hint: "ride_q" }] },
    { id: "ride", when: (c) => !c.s.oos && !!c.s.stopAsked, done: (c) => !!c.s.arrived,
      ask: (c) => {
        if (!c.s.seatedAsked) { c.s.seatedAsked = true; if (!c.s.seatSaid) c.say("have_seat"); else c.say("stop_ok_short"); expectSeated(c); return; }
        if (c.s.midStop && !c.s.midSaid) {
          c.s.midSaid = true;
          c.say("mid_stop");
          ask(c, {
            id: "mid", hints: ["ride"], expects: ["is_my_stop"],
            suggest: [{ lt: "Paklausti, ar čia tavo stotelė", hint: "ride" }],
            on: {
              is_my_stop: (cc) => { cc.say("not_yet_next"); },
              g_thanks: (cc) => { cc.say("g_welcome"); },
              g_ok: () => {}, ack: () => {},
            },
            yes: () => {}, no: () => {},
          });
          return;
        }
        arrive(c);
      },
      expects: ["is_my_stop", "ask_button", "ack"],
      suggest: [{ lt: "Padėkoti", hint: "thanks" }, { lt: "Paklausti, ar čia tavo stotelė", hint: "ride" }] },
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
        suggest: [{ lt: "Paklausti, ar 12-asis važiuoja ten, kur reikia", hint: "ask_12", options: "dest" }],
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
    g_bye(c) { c.say("g_bye"); c.end(); c.hold(); },
    ask_goes(c, slots, seg) {
      const d = placeOf(slots);
      if (!d) return;
      if (c.s.oos && !seg.tags.includes("twelve") && D(d).attrs?.served && !c.s.dest) { c.s.dest = d; c.say("oos_this_no"); return; }
      if (c.s.dest && c.s.dest === d) { c.say("goes_yes_again"); return; }
      setDest(c, d);
    },
    going_to(c, slots) {
      const d = placeOf(slots);
      if (d) setDest(c, d, true);
    },
    dest_ctx(c, slots) { const d = placeOf(slots); if (d) setDest(c, d, true); },
    dest_unknown(c) { c.say("dest_unknown"); c.say("ask_dest"); c.hold(); },
    dest_neg(c, slots) {
      const d = placeOf(slots);
      if (d && c.s.dest === d) { c.s.dest = undefined; c.s.paid = c.s.paid; }
      c.say("dest_neg_ack"); c.hold();
    },
    ask_fare(c) {
      if (c.s.oos) { c.say("oos_fare"); return; }
      c.s.fareSaid = true;
      c.say("fare_is");
      if (!c.s.dest) c.say("ask_dest");
      c.hold();
    },
    pay_card(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      c.say("card_ok");
      ask(c, { id: "card_tap", hints: ["fare"], expects: ["give"], suggest: [{ lt: "Pridėti kortelę", hint: "fare" }],
        on: { give: (cc) => { paid(cc, "card"); }, g_ok: (cc) => { paid(cc, "card"); }, ack: (cc) => { paid(cc, "card"); } },
        yes: (cc) => { paid(cc, "card"); }, ask: (cc) => cc.say("card_ok") });
    },
    pay_phone(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      c.say("phone_ok");
      paid(c, "phone");
    },
    pay_cash(c, slots) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.paid) { c.say("paid_already"); return; }
      if (typeof slots.price === "number" && slots.price > 250) {
        c.say("no_change");
        if (slots.price === 500) { c.say("daypass_info"); c.say("daypass_q"); expectDayPass(c); return; }
        c.say("no_change_options"); c.hold(); return;
      }
      if (typeof slots.price === "number" && slots.price < 250) { c.say("fare_is"); return; }
      c.say("cash_ok");
      paid(c, "cash");
    },
    cash_ctx(c, slots, seg) { bus.handlers.pay_cash(c, slots, seg); },
    tell_me_ctx(c, slots, seg) { bus.handlers.ask_stop(c, slots, seg); },
    give(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.dest && !c.s.paid) { paid(c, c.s.payMethod || "cash"); return; }
      c.say("no_problem");
    },
    no_change(c, slots) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      c.say("no_change");
      if (slots.bill === "500") { c.say("daypass_info"); c.say("daypass_q"); expectDayPass(c); return; }
      c.say("no_change_options");
      c.hold();
    },
    day_pass(c) {
      if (c.s.arrived) { c.say("no_problem"); return; }
      if (c.s.oos) { c.say("oos_pay"); return; }
      if (c.s.dayPass) { c.say("no_problem"); return; }
      c.say("daypass_info"); c.say("daypass_q"); expectDayPass(c);
    },
    no_day_pass(c) { c.say("no_problem"); },
    transfer(c) { c.say("transfer"); },
    ask_stop(c, slots) {
      const d = placeOf(slots);
      if (d && d !== c.s.dest) { setDest(c, d, true); if (c.s.dest !== d) return; }
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      if (/which stop|what stop/i.test(c.heard)) {
        const e = D(c.s.dest);
        c.s.stopAsked = true;
        c.say(e.attrs!.last ? "last_stop" : "stop_name", { stop: e.attrs!.stop });
        c.say(c.s.oos ? "oos_ask_driver" : "stop_ok");
        return;
      }
      stopInfo(c);
    },
    ask_stops_count(c) {
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      c.s.stopsTold = true;
      c.say("stops_count", { stops: D(c.s.dest).attrs!.stops });
    },
    ask_time(c) {
      if (!c.s.dest) { c.say("ask_dest"); c.hold(); return; }
      c.say("ride_time", { mins: D(c.s.dest).attrs!.mins });
    },
    ask_frequency(c) { c.say("frequency"); },
    ask_last(c) { c.say("last_bus"); },
    ask_back(c) { c.say("bus_back"); },
    ask_button(c) { c.s.cordTold = true; c.say("button"); },
    is_my_stop(c) {
      if (c.s.arrived) { c.say("my_stop_yes"); return; }
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
    { say: "Does this bus go to Old Town?", intent: "ask_goes", step: "dest", slots: { place: { dest: "old_town" } } },
    { say: "Does this bus go downtown?", intent: "ask_goes", slots: { place: { dest: "downtown" } } },
    { say: "Is this the bus to the beach?", intent: "ask_goes", slots: { place: { dest: "beach" } } },
    { say: "Is this the bus downtown?", intent: "ask_goes" },
    { say: "Does this bus go to the city centre?", intent: "ask_goes" },
    { say: "I'm going to the museum.", intent: "going_to", slots: { place: { dest: "museum" } } },
    { say: "I'm going downtown", intent: "going_to" },
    { say: "How do I get to Town Square?", intent: "going_to", slots: { place: { dest: "town_square" } } },
    { say: "The museum", intent: "dest_ctx", step: "dest" },
    { say: "Does this bus go to Springfield?", intent: "dest_unknown" },
    { say: "Not the airport", intent: "dest_neg", not: ["ask_goes", "dest_ctx"] },
    { say: "Does the 12 go to the beach?", intent: "ask_goes" },
    { say: "How much is the fare?", intent: "ask_fare" },
    { say: "Can I pay by card?", intent: "pay_card", step: "fare" },
    { say: "Can I tap my card?", intent: "pay_card" },
    { say: "Can I pay with my phone?", intent: "pay_phone" },
    { say: "Do you give change?", intent: "no_change" },
    { say: "I only have a five.", intent: "no_change", slots: { bill: "500" } },
    { say: "I don't have exact change.", intent: "no_change", not: ["pay_cash"] },
    { say: "Can I get a day pass?", intent: "day_pass" },
    { say: "Can I get a day ticket?", intent: "day_pass" },
    { say: "I don't need a day pass", intent: "no_day_pass", not: ["day_pass"] },
    { say: "Here you go.", intent: "give", step: "fare" },
    { say: "Here's $2.50", intent: "pay_cash", slots: { price: 250 } },
    { say: "Could you tell me when to get off?", intent: "ask_stop" },
    { say: "Could you let me know when we get to Old Town?", intent: "ask_stop" },
    { say: "Where should I get off for the museum?", intent: "ask_stop" },
    { say: "Which stop is it?", intent: "ask_stop" },
    { say: "How many stops is it?", intent: "ask_stops_count" },
    { say: "How long does it take?", intent: "ask_time" },
    { say: "Is it far?", intent: "ask_stops_count" },
    { say: "Is this my stop?", intent: "is_my_stop" },
    { say: "Do I press the button?", intent: "ask_button" },
    { say: "How often does the bus come?", intent: "ask_frequency" },
    { say: "When's the last bus back?", intent: "ask_last" },
    { say: "Where do I catch the bus back?", intent: "ask_back" },
    { say: "Is there a timetable?", intent: "ask_frequency" },
    { say: "Can I sit anywhere?", intent: "sit_q" },
    { say: "Yellow potatoes sing on Tuesday", intent: "none" },
    { say: "the bus is a very old dog", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s67b-bus.json)
    { say: "Is this the right bus for the museum?", intent: "ask_goes", slots: { place: { dest: "museum" } } },
    { say: "Can I get to the museum with this bus?", intent: "ask_goes", slots: { place: { dest: "museum" } } },
    { say: "The hospital, does this bus go there?", intent: "ask_goes", slots: { place: { dest: "hospital" } } },
    { say: "Which bus do I take to the beach?", intent: "ask_goes" },
    { say: "I want to go to the center of the city.", intent: "going_to" },
    { say: "The twelve goes to the museum?", intent: "ask_goes" },
    { say: "Two dollars fifty, here.", intent: "cash_ctx", step: "fare" },
    { say: "Can I pay with a twenty?", intent: "no_change", step: "fare" },
    { say: "I have a five, is that okay?", intent: "no_change", slots: { bill: "500" } },
    { say: "Visa okay?", intent: "pay_card", step: "fare" },
    { say: "Please tell me when we arrive.", intent: "ask_stop" },
    { say: "Can you say me where I get off?", intent: "ask_stop" },
    { say: "Where is my stop?", intent: "ask_stop" },
    { say: "No, could you tell me?", intent: "tell_me_ctx", step: "known" },
    { say: "No, this is my first time.", intent: "deny", step: "known" },
    { say: "Where is the cord?", intent: "ask_button" },
    { say: "Should I get off now?", intent: "is_my_stop" },
    { say: "Is Old Town next?", intent: "is_my_stop" },
    { say: "What is a day pass?", intent: "day_pass" },
    { say: "Okay, I'll sit here.", intent: "ack" },
    // meaning must not flip
    { say: "I don't have cash.", intent: "pay_card", step: "fare", not: ["pay_cash"] },
    { say: "I don't have a card.", intent: "pay_cash", step: "fare", not: ["pay_card"] },
    { say: "No, I don't know.", intent: "deny", step: "known", not: ["affirm"] },
    { say: "I'm not going to the airport.", intent: "dest_neg", not: ["going_to"] },
    // more ways (played paths, 25 Sep 2026)
    { say: "One ticket to the town square, please.", intent: "going_to", step: "dest", not: ["ask_fare"] },
    { say: "Is there a day pass?", intent: "day_pass", step: "fare" },
    { say: "Do I pay now?", intent: "ask_fare", step: "fare" },
    { say: "Can you tell me when we get there?", intent: "ask_stop", step: "known" },
    { say: "How many more stops?", intent: "ask_stops_count" },
    { say: "Should I press the button?", intent: "ask_button" },
    { say: "Is the next stop the museum?", intent: "is_my_stop" },
  ],

  sims: [
    { name: "happy path, card", turns: ["Does this bus go to Old Town?", "Can I pay by card?", "Could you tell me when to get off?", "Thank you!", "Thanks a lot!"],
      expect: { complete: true }, auto: AUTO },
    { name: "no exact change, day pass, questions", turns: ["I'm going to the beach.", "I only have a five.", "Yes, please.", "How long does it take?", "Where should I get off?", "Is this my stop?", "Thank you so much!"],
      expect: { complete: true }, auto: AUTO },
    { name: "wrong bus first, then downtown", turns: ["Is this the bus to the airport?", "Does this bus go downtown?", "How much is it?", "Here you go.", "How many stops is it?", "Could you tell me when to get off?", "Okay, thanks."],
      expect: { complete: true }, auto: AUTO },
  ],
};

function paid(c: Ctx, method: string) {
  c.s.paid = true;
  c.s.payMethod = method;
  c.event("pay", { method, amount: c.s.dayPass ? 500 : 250 });
  c.say("paid");
}

function expectDayPass(c: Ctx) {
  ask(c, {
    id: "daypass", hints: ["g_yesno", "fare"], expects: ["day_pass", "no_day_pass", "give", "pay_card"],
    suggest: [{ lt: "Sutikti arba atsisakyti", hint: "g_yesno" }],
    on: {
      day_pass: (cc) => { sellDayPass(cc); },
      give: (cc) => { sellDayPass(cc); },
      pay_card: (cc) => { cc.say("card_ok"); paid(cc, "card"); },
      no_day_pass: (cc) => { cc.say("no_problem"); },
    },
    yes: (cc) => { sellDayPass(cc); },
    no: (cc) => { cc.say("no_problem"); },
    ask: (cc) => cc.say("daypass_q"),
  });
}

function sellDayPass(c: Ctx) {
  c.s.dayPass = true;
  c.say("daypass_sold");
  c.event("give", { item: "day-pass" });
  paid(c, "cash");
}

export default bus;
