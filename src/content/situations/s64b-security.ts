// Song 64 "Window or Aisle?" (part 2 of 3): TSA security checkpoint at Maple Harbor Airport, Officer Grant.
// Real 2026 US screening: boarding pass + ID at the podium (sometimes a photo: "Look at the camera"),
// laptops and liquids out (3-1-1: containers of 3.4 oz / 100 ml or less in one clear quart-size bag),
// jackets and belts in the bin, empty pockets. Shoes stay on: TSA ended the shoes-off rule in July 2025,
// so shoes come off only if the scanner keeps alarming. Body scanner ("Feet on the footprints, arms up")
// or walk-through metal detector ("Step through, please").
// Twists: the scanner alarms → "Do you have anything in your pockets?" (→ belt / watch → shoes);
// bag check: "Is this your bag? I need to check it" (a water bottle) → "Oh, sorry, I forgot".

import type { Ctx, Pending, SituationDef } from "../types";
import { t } from "../dsl";

const AUTO: Record<string, string> = {
  docs: "Here you go.",
  docs_more: "It's on my phone.",
  camera: "Okay.",
  divest: "Okay, done.",
  walk: "Okay.",
  pockets: "Just my keys.",
  belt_watch: "Oh, my belt.",
  shoes_off: "Sure.",
  again: "Okay.",
  check_pockets: "Oh, my phone!",
  bag_q: "Yes, it is.",
  bottle_found: "Oh, sorry, I forgot.",
  bottle: "You can throw it away.",
  bottle_keep: "Okay, I'll empty it.",
  collect: "Can I have my bag back?",
};

// ---------------------------------------------------------------------------

/** c.expect() that also accepts "Yes, it is" / "No, it isn't" style answers (affirm/deny) as yes/no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

function docsGiven(c: Ctx, tags: string[]) {
  const both = tags.includes("both") || (!tags.includes("id") && !tags.includes("bp"));
  if (both || tags.includes("id")) c.s.id = true;
  if (both || tags.includes("bp")) c.s.bp = true;
  if (tags.includes("phone")) { c.s.bp = true; c.say("phone_scan"); }
  if (c.s.id && c.s.bp) { c.s.docsDone = true; if (!c.s.camera) c.say("docs_ok"); return; }
  c.say(c.s.id ? "docs_need_bp" : "docs_need_id");
  ask(c, {
    id: "docs_more", expects: ["give_docs"], hints: ["docs"],
    suggest: [{ lt: "Paduoti trūkstamą dokumentą", hint: "docs" }],
    on: { give_docs: (cc, _sl, sg) => { docsGiven(cc, sg.tags.includes("both") || sg.tags.includes("id") || sg.tags.includes("bp") ? sg.tags : [cc.s.id ? "bp" : "id"]); } },
    yes: (cc) => { docsGiven(cc, [cc.s.id ? "bp" : "id"]); },
    ask: (cc) => cc.say(cc.s.id ? "docs_need_bp" : "docs_need_id"),
  });
}

function walkThrough(c: Ctx) {
  if (c.s.alarm && !c.s.alarmDone) {
    c.twist("alarm");
    c.s.alarmDone = true;
    c.say(c.s.scanner ? "alarm_scanner" : "alarm_beep");
    c.say("ask_pockets");
    expectPockets(c);
    return;
  }
  c.s.walked = true;
  c.say(c.s.scanner ? "scan_done" : "walk_clear");
}

function expectPockets(c: Ctx) {
  ask(c, {
    id: "pockets", expects: ["pockets_item", "pockets_nothing"], hints: ["pockets"],
    suggest: [{ lt: "Pasakyti, kas kišenėje (arba kad nieko)", hint: "pockets" }],
    on: {
      pockets_item: (cc, sl, sg) => { removeItem(cc, sl, sg); },
      pockets_nothing: (cc) => { askBeltWatch(cc); },
      g_dontknow: (cc) => { cc.say("check_pockets"); expectCheckPockets(cc); },
    },
    yes: (cc) => { cc.say("what_is_it"); expectPockets(cc); },
    no: (cc) => { askBeltWatch(cc); },
    ask: (cc) => cc.say("ask_pockets"),
  });
}

function expectCheckPockets(c: Ctx) {
  ask(c, {
    id: "check_pockets", expects: ["pockets_item", "pockets_nothing"], hints: ["pockets"],
    suggest: [{ lt: "Pasakyti, ką radai kišenėje", hint: "pockets" }],
    on: {
      pockets_item: (cc, sl, sg) => { removeItem(cc, sl, sg); },
      pockets_nothing: (cc) => { askBeltWatch(cc); },
    },
    yes: (cc) => { cc.say("what_is_it"); expectPockets(cc); },
    no: (cc) => { askBeltWatch(cc); },
    ask: (cc) => cc.say("check_pockets"),
  });
}

function removeItem(c: Ctx, slots: any, seg: { tags: string[] }) {
  const plural = seg.tags.includes("pl") || (slots.pocket && ["keys", "coins", "earbuds"].includes(slots.pocket));
  c.say(plural ? "put_them_bin" : "put_it_bin");
  expectAgain(c);
}

function askBeltWatch(c: Ctx) {
  c.say("ask_belt_watch");
  ask(c, {
    id: "belt_watch", expects: ["pockets_item", "pockets_nothing"], hints: ["beltwatch"],
    suggest: [{ lt: "Atsakyti apie diržą ar laikrodį", hint: "beltwatch" }],
    on: {
      pockets_item: (cc) => { cc.say("put_it_bin_too"); expectAgain(cc); },
      pockets_nothing: (cc) => { shoesOff(cc); },
    },
    yes: (cc) => { cc.say("put_it_bin_too"); expectAgain(cc); },
    no: (cc) => { shoesOff(cc); },
    ask: (cc) => cc.say("ask_belt_watch"),
  });
}

function shoesOff(c: Ctx) {
  c.twist("shoes_off");
  c.say("shoes_alarm");
  ask(c, {
    id: "shoes_off", expects: ["ack_done"], hints: ["ok_short"],
    suggest: [{ lt: "Nusiauti batus", hint: "ok_short" }],
    on: { ack_done: (cc) => { cc.s.shoesOff = true; cc.say("again_ask"); expectAgain(cc, true); }, g_ok: (cc) => { cc.s.shoesOff = true; cc.say("again_ask"); expectAgain(cc, true); } },
    yes: (cc) => { cc.s.shoesOff = true; cc.say("again_ask"); expectAgain(cc, true); },
    no: (cc) => { cc.say("shoes_must"); shoesOff(cc); },
    ask: (cc) => cc.say("shoes_alarm"),
  });
}

function expectAgain(c: Ctx, asked = false) {
  const clear = (cc: Ctx) => { cc.s.walked = true; cc.say("walk_clear"); };
  void asked;
  ask(c, {
    id: "again", expects: ["ack_done"], hints: ["walk"],
    suggest: [{ lt: "Praeiti dar kartą", hint: "walk" }],
    on: { ack_done: (cc) => { clear(cc); }, g_ok: (cc) => { clear(cc); }, pockets_item: (cc) => { clear(cc); } },
    yes: (cc) => { clear(cc); },
    ask: (cc) => cc.say("again_ask"),
  });
}

function startBottle(c: Ctx) {
  c.twist("bag_check");
  c.s.bagHeld = true;
  c.say("need_check");
  c.say("found_bottle");
  // An optional reaction ("Oh, sorry, I forgot"); the "bottle" step then explains the rule and the options.
  ask(c, {
    id: "bottle_found", optional: true, expects: ["forgot", "bottle_drink", "bottle_throw", "bottle_empty", "bottle_keep"], hints: ["bottle_sorry", "bottle"],
    suggest: [{ lt: "Atsiprašyti: pamiršai", hint: "bottle_sorry" }, { lt: "Pasakyti, ką daryti su buteliu", hint: "bottle" }],
    on: {
      forgot: (cc) => { cc.say("no_worries"); },
      g_sorry: (cc) => { cc.say("no_worries"); },
      g_ok: () => {},
      ask_what: () => {},
    },
    yes: () => {},
    no: () => {},
  });
}

function bottleDone(c: Ctx, line: string) {
  c.s.bagChecked = true;
  c.say(line);
}

// ---------------------------------------------------------------------------

export const security: SituationDef = {
  id: "s64b-security",
  song: 64,
  songTitle: "Window or Aisle?",
  title: { en: "Laptops Out, Please", lt: "Nešiojamuosius kompiuterius išimkite" },
  topic: { en: "Airport security", lt: "Saugumo patikra" },
  chapter: 6,
  order: 6,
  location: "airport",
  npc: "grant",
  goal: "Praeik saugumo patikrą.",
  intro: "Saugumo patikra (TSA). Pareigūnas Grantas tikrina dokumentus ir bagažą. Batų JAV nusiauti nebereikia, bet šiame oro uoste nešiojamąjį kompiuterį ir skysčius (talpos iki 3,4 uncijos, t. y. 100 ml, viename skaidriame maišelyje) reikia išimti į dėžę.",

  grammar: {
    macros: {
      bp: "(boarding pass | boarding card #tip:uk_boardingcard | ticket)",
      id: "(passport | id | driver's license | license)",
      comp: "(laptop | computer | tablet | ipad | kindle | e reader)",
    },
    slots: {
      pocket: { lexicon: [
        { id: "keys", forms: ["keys", "key", "car keys", "house keys"], tags: ["pl"] },
        { id: "phone", forms: ["phone", "cell phone", "cellphone", "smartphone", "iphone"] },
        { id: "phone", forms: ["mobile", "mobile phone"], tags: ["tip:us_phone"] },
        { id: "wallet", forms: ["wallet", "purse"] },
        { id: "coins", forms: ["coins", "some coins", "change", "some change", "loose change"], tags: ["pl"] },
        { id: "belt", forms: ["belt"] },
        { id: "watch", forms: ["watch", "smartwatch", "smart watch"] },
        { id: "lighter", forms: ["lighter"] },
        { id: "pen", forms: ["pen"] },
        { id: "earbuds", forms: ["earbuds", "airpods", "headphones"], tags: ["pl"] },
        { id: "gum", forms: ["gum", "chewing gum"] },
        { id: "tissue", forms: ["tissue", "tissues", "napkin", "paper", "receipt", "a receipt"] },
        { id: "money", forms: ["money", "cash", "some money", "dollars", "bills"] },
        { id: "glasses", forms: ["glasses", "sunglasses", "reading glasses"], tags: ["pl"] },
        { id: "jewelry", forms: ["ring", "bracelet", "necklace", "jewelry", "earrings"] },
      ] },
    },
  },

  intents: {
    affirm: { patterns: [
      "(yes | yeah | yep | yup) (it is | that is) (mine | my bag) #h:bq_mine",
      // "Yes, is there a problem?" / "Yes. Why?": yes, and the bag check follows
      "(yes | yeah) [it is | that is | it is mine] (is there a problem | is something wrong | what is wrong | what is the problem | why)",
      "(yes | yeah) mine", "(yes | yeah) the (black | blue | red | gray | grey | green | brown | small | big | little) one [is mine]", "(it is | that is) my (backpack | bag | suitcase) [yes]",
      "(yes | yeah | yep | yup) (it is | that is) (right | correct)",
      "(yes | yeah) (that is | it is) [my bag] #h:bq_yes",
      "(it is | that is) (mine | my bag)",
    ] },
    deny: { patterns: [
      "no (it is not | that is not) (mine | my bag)",
      "(it is not | that is not) (mine | my bag)",
      "not mine",
    ] },
    give_docs: { patterns: [
      "here you (go | are) #h:docs_here",
      "here (they are | it is) #both",
      "here is my @id and [my] @bp #h:docs_both #both",
      "here is my @bp and [my] @id #both",
      "here is my @id #id",
      "here is my @bp #bp",
      "(my | the) @bp is on my phone #h:docs_phone #bp #phone",
      "(it is | my boarding pass is) on my (phone | cell phone) #bp #phone",
      "i have (it | my boarding pass) on my phone #bp #phone",
      "(this is | that is) my @id #id",
      "[my] @id and [my] @bp #both",
      "here (are | is) both [of them] #both", "take (it | them) #both", "(this is | here is) my @id and (this is | here is) my @bp #both", "(this is | here is) my @bp #bp",
      "i have (a | an | my) (electronic | digital | mobile | e) (boarding pass | ticket) [on my phone] #bp #phone", "(my | the) @bp is (in the app | on the app | in my phone) #bp #phone",
      "[here is] my @id and [my] @bp is on my phone #both #phone",
    ] },
    docs_q: { patterns: [
      "do you need my (passport | id | boarding pass) #h:docs_q",
      "is my (passport | phone | driver's license) (okay | fine)",
      "(can | may) i (use | show) my (phone | passport)",
      "which (id | one) do you need",
      "(can | may) i show (it | my @bp | my ticket) on my (phone | cell phone)", "do you need (my | the) @bp [too | as well]", "is (a | my) driver's license (okay | enough)",
    ] },
    is_this_line: { patterns: [
      "is this the (line | queue #tip:uk_queue) for security",
      "is this (security | the security line | the line)",
      "(where | where is) the (line | queue #tip:uk_queue) [for security]",
    ] },
    ack_done: { patterns: [
      "(okay | all right) [no problem] #h:ok_okay",
      "sure [no problem] #h:ok_sure",
      "all done #h:div_done",
      "(do | should | can) i (walk through | go through | go in | step in) [now]",
      "(done | i am done | i am ready | ready | will do | got it | finished | all set)",
      "everything is in the (bin | bins | tray #tip:uk_tray | trays #tip:uk_tray)",
      "(i put | i have put) everything in the (bin | bins)",
      "like this #h:walk_like_this",
      "(is | is it) (like this | okay | right)",
      "(arms | hands) up",
      "(here | right here)",
      "my @comp is in the (bin | tray #tip:uk_tray)", "(everything | it) is in [the] (bin | bins)", "(should | do) i go (in | through) [now]", "(now | go now | i go now)",
      "(can | should) i (go | walk | step) (through | again) [now]", "(i will | let me) try again", "(okay | sure) again", "(i will | let me) take them off",
    ] },
    // "Where do I stand?" / "What do I do now?": Grant repeats the scanner instruction
    where_stand: { patterns: ["where (do | should) i (stand | put my feet | go)", "(what | how) (do | should) i do [now | here]", "what now", "(is it | is this) the right (place | spot)"] },
    ask_shoes: { patterns: [
      "do i (need | have) to take off my shoes #h:div_shoes",
      "(should | do) i take (off my shoes | my shoes off)",
      "(what about | and) my shoes",
      "can i (keep | leave) my shoes on",
      "shoes (on | off)",
      "do i have to take my shoes off",
      "(my | the) shoes too", "shoes too", "(must | should) i take (off my shoes | my shoes off)", "do (the | my) shoes (need to | have to) come off",
    ] },
    ask_laptop: { patterns: [
      "(should | do) i take out my @comp #h:div_laptop",
      "(do | should) i (need | have) to take (out my @comp | my @comp out)",
      "(what about | and) my @comp",
      "can i (leave | keep) my @comp in (the | my) (bag | backpack)",
      "does my @comp (need to | have to) come out",
      "(the | my) @comp (too | also | as well)", "(must | do) i take out (the | my) @comp", "(should | do) i put my @comp in (a | the) (bin | tray #tip:uk_tray)",
      "does (my | the) @comp go in (a separate | its own | a different) (bin | tray #tip:uk_tray)", "(should | do) i put my @comp in a separate (bin | tray #tip:uk_tray)",
    ] },
    no_laptop: { patterns: ["i do not have a (laptop | computer) #h:div_no_laptop", "no laptop", "i do not have (a laptop | any electronics)", "i do not have (a | any) (laptop | computer | tablet | ipad) with me"] },
    ask_liquids: { patterns: [
      "(what about | and) (my | the) liquids",
      "(where | how) do i (put | pack) my liquids",
      "do (my | the) liquids (need to | have to) be in a (bag | plastic bag) #h:div_liquids",
      "is (this | toothpaste | shampoo | perfume) a liquid",
      "how much liquid can i (take | bring)", "(do | should) i (need to | have to) take out (my | the) liquids", "(should | do) i take (out my liquids | my liquids out)",
      "is (my | the | this) (toothpaste | shampoo | perfume | cream | lotion | deodorant) a liquid", "(what about | and) my (toothpaste | shampoo | perfume | cream)",
    ] },
    no_liquids: { patterns: [
      "i do not have any liquids", "no liquids",
      "i do not have [any] liquids [with me]", "no liquids at all", "(my | the) liquids are [already] in a (plastic | clear | ziploc) bag [already]", "i have my liquids in a (plastic | clear) bag",
      "my liquids are in my (checked bag | suitcase)",
      "(i have | there are) no liquids",
    ] },
    no_plastic_bag: { patterns: [
      "i do not have a (plastic | clear | ziploc | zip lock) bag",
      "where (do | can) i get a (plastic | clear | ziploc) bag",
      "(where can i get | do you have) a (plastic | clear) bag",
    ] },
    ask_phone: { patterns: [
      "where do i put my (phone | cell phone | wallet | keys) #h:div_phone",
      "(what about | and) my (phone | cell phone | wallet | keys)",
      "where do i put my mobile #tip:us_phone",
      "(should | do) i (take | put) everything (out of | from) my pockets [in the bin]", "(should | do | must) i empty my pockets",
    ] },
    ask_jacket: { patterns: [
      "do i (need | have) to take off my (jacket | coat | sweater | hoodie)",
      "(what about | and) my (jacket | coat | sweater | hoodie)",
      "(should | do) i take (off my (jacket | coat) | my (jacket | coat) off)",
      "what about my jumper #tip:uk_jumper",
      "(must | do) i take off my (jacket | coat | sweater | hoodie)", "(my | the) (jacket | coat) too",
    ] },
    ask_belt: { patterns: ["do i (need | have) to take off my belt", "(what about | and) my belt", "(should | do) i take (off my belt | my belt off)"] },
    ask_watch: { patterns: ["(what about | and) my (watch | smartwatch)", "do i (need | have) to take off my watch", "(should | do) i take (off my watch | my watch off)", "can i keep my (watch | smartwatch) on", "(my | the) watch too"] },
    ask_bins: { patterns: [
      "where are the (bins | trays #tip:uk_tray) #h:div_bins",
      "(can | could) i (have | get) a (bin | tray #tip:uk_tray)",
      "where do i put my (things | stuff | bag)",
      "where is a bin",
      "where (do | should) i put my @comp", "(can | could | may) i (take | use | grab) (a | this | that | one) (bin | tray #tip:uk_tray)",
    ] },
    ask_food: { patterns: ["can i (bring | take) (food | snacks | a sandwich)", "is food (okay | allowed)", "(what about | and) my (food | snacks | sandwich)", "can i (bring | take) my (food | snacks | sandwich | lunch | apple)"] },
    ask_water: { patterns: [
      "can i (bring | take) (my | a) water bottle",
      "can i (bring | take) (water | my water) [with me]",
      "(what about | and) my water [bottle]",
      "(is | is the) water not allowed", "(can i not | i can not) (take | bring) water",
      "i (only | just) have a [small | little] (bottle of water | water bottle)", "is (a | my) [small | little] (bottle of water | water bottle) okay",
    ] },
    pockets_item: { patterns: [
      "(just | only) my {pocket} #h:pk_keys",
      "[oh] (my | the) {pocket} #h:pk_phone",
      "i have (my | a | some) {pocket} [in my pocket]",
      "(i think | maybe) it is my {pocket} #h:pk_belt",
      "(yes | yeah | oh yes) (my | a | some) {pocket} #h:pk_yes_my",
      "there is (a | my) {pocket} in my pocket",
      "(sorry | oh sorry) i forgot (my | the) {pocket}",
      "i forgot (my | the) {pocket}",
      "{pocket}",
      "(it is | that is) (my | the) {pocket}",
      "(a | an | some) {pocket}", "(only | just) (a | an | some) {pocket}", "(my | the) {pocket} (is | are) in my pocket", "(maybe | probably) (my | the | a) {pocket}",
    ] },
    pockets_nothing: { patterns: [
      "no nothing #h:pk_nothing",
      "nothing",
      "(my pockets are | they are) empty",
      "(i do not | i do not think i) have anything [in my pockets]",
      "there is nothing in my pockets",
      "nothing in my pockets",
      "i am not wearing (a belt | a watch | anything like that)",
      "no belt [and no watch]",
      "i have nothing [in my pockets]", "(neither | none of them | neither one)", "no {pocket} [and | or] no {pocket}", "(nothing | none) at all",
    ] },
    forgot: { patterns: [
      "i forgot #h:bt_forgot",
      "i forgot (about it | it was there | it was in there | to take it out)",
      "i forgot (about | ) (the | my) (water | bottle | water bottle) [was (there | in there | in my bag)]", "(it is | that is) (just | only) water",
      "i am so sorry i forgot",
      "i totally forgot",
      "[sorry] my (mistake | bad)", "i did not know [that | about the rule | it was not allowed]",
    ] },
    ask_what: { patterns: ["what is (it | the problem | wrong)", "is there a problem", "is something wrong", "what did you find", "why [not]", "(is that | is it) a problem", "what is wrong with (it | that)"] },
    bottle_drink: { patterns: [
      "i will drink it [now | here | right now] #h:bt_drink",
      "(can | could) i drink it [now | here]",
      "let me drink it [now]",
      "i will just drink it",
      "i would like to drink it",
      "i will drink it (quickly | fast) [now]", "i will drink it [now | here] it is (only | just) water", "drink it", "(i will | let me) finish it [now]",
    ] },
    bottle_throw: { patterns: [
      "you can throw it (away | out) #h:bt_throw",
      "[please | just] (throw | toss) it [away | out]",
      "you can (keep | have | toss) it",
      "i do not need it",
      "(that is | it is) (okay | fine) [you can] (throw | toss) it [away | out]",
      "get rid of it",
      "(keep | take) it", "(no problem | sure | okay) (take | keep | toss) it", "(throw | toss | put) it in the (trash | garbage | bin | trash can)",
    ] },
    bottle_empty: { patterns: [
      "(can | could) i [just] empty it #h:bt_empty",
      "(i will | let me) [just] empty it",
      "(can | could) i pour it out",
      "(i will | let me) pour it out",
      "(can | could) i empty it and keep (it | the bottle)", "(can | could) i pour out (the water | it)", "(i will | let me) pour out (the water | it)", "(i will | let me) empty the bottle",
    ] },
    bottle_keep: { patterns: ["(can | could) i keep (it | the bottle) #h:bt_keep", "i (want | would like) to keep the bottle", "i (want | would like) to keep my bottle", "(can | could) i keep my bottle"] },
    bag_back: { patterns: [
      "(can | could | may) i (have | get) my bag back #h:bag_back",
      "(can | could | may) i (have | get | take) my (bag | backpack | things | stuff | laptop) [back | now]",
      "(am i | are we) (done | all set | good) #h:all_set",
      "can i go [now]",
      "is that (all | everything | it)", "where (is | are) my (bag | backpack | things | stuff)",
      "(is | is everything) okay",
      "so i can go [now]", "(may | can) i go then", "is (it | everything) (fine | good) now",
    ] },
    shoes_on: { patterns: [
      "where can i put my shoes [back] on #h:shoes_bench",
      "where can i put on my shoes #h:shoes_bench",
      "(is there | where is) (somewhere | a place | a bench) to sit [down]",
      "where can i sit [down]",
    ] },
    ask_gate: { patterns: [
      "where is gate {number} #h:gate_dir",
      "how do i get to (gate {number} | my gate | the gates)",
      "which way (is | to) (gate {number} | the gates)",
      "where are the gates",
    ] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | men's room | ladies room)",
      "where is the toilet #tip:us_restroom",
      "is there a (restroom | bathroom) [after security]",
    ] },
  },

  lines: {
    greet_docs: [
      t("Next! | Boarding | pass | and | ID, | please.", "Kitas! | Įlaipinimo | kortelę | ir | asmens dokumentą, | prašau.", "Kitas! Įlaipinimo kortelę ir asmens dokumentą, prašau."),
      t("Hi there. | Can | I | see | your | boarding | pass | and | ID?", "Sveiki. | Ar galiu | aš | pamatyti | jūsų | įlaipinimo | kortelę | ir | asmens dokumentą?", "Sveiki. Ar galiu pamatyti jūsų įlaipinimo kortelę ir asmens dokumentą?"),
      t("Good | morning. | ID | and | boarding | pass, | please.", "Labas | rytas. | Asmens dokumentą | ir | įlaipinimo | kortelę, | prašau.", "Labas rytas. Asmens dokumentą ir įlaipinimo kortelę, prašau."),
    ],
    ask_docs: [
      t("Boarding | pass | and | ID, | please.", "Įlaipinimo | kortelę | ir | asmens dokumentą, | prašau.", "Įlaipinimo kortelę ir asmens dokumentą, prašau."),
      t("Can | I | see | your | ID | and | boarding | pass?", "Ar galiu | aš | pamatyti | jūsų | asmens dokumentą | ir | įlaipinimo | kortelę?", "Ar galiu pamatyti jūsų asmens dokumentą ir įlaipinimo kortelę?"),
    ],
    docs_need_bp: [
      t("And | your | boarding | pass?", "O | jūsų | įlaipinimo | kortelė?", "O jūsų įlaipinimo kortelė?"),
    ],
    docs_need_id: [
      t("And | your | ID?", "O | jūsų | asmens dokumentas?", "O jūsų asmens dokumentas?"),
    ],
    phone_scan: [
      t("Sure, | just | scan | it | here.", "Žinoma, | tiesiog | nuskenuokite | ją | čia.", "Žinoma, tiesiog nuskenuokite ją čia."),
    ],
    docs_yes: [
      t("Yes, | please.", "Taip, | prašau.", "Taip, prašau."),
      t("Yes, | your | passport | is | perfect.", "Taip, | jūsų | pasas | yra | puikus.", "Taip, pasas puikiai tinka."),
    ],
    line_yes: [
      t("Yes, | right | here.", "Taip, | štai | čia.", "Taip, čia."),
    ],
    camera: [
      t("Please | look | at | the | camera.", "Prašau, | pažiūrėkite | į | — | kamerą.", "Prašom pažiūrėti į kamerą."),
      t("Look | into | the | camera | for | a | second, | please.", "Pažiūrėkite | į | — | kamerą | — | — | akimirką, | prašau.", "Akimirkai pažiūrėkite į kamerą.",
        { flags: { 4: "“for” has no separate word: the accusative akimirką carries the duration (linked to “second”)." } }),
    ],
    docs_ok: [
      t("Thank | you. | Go ahead.", "Dėkoju | jums. | Praeikite.", "Ačiū, praeikite."),
      t("You're | good. | Go ahead.", "Jums | viskas gerai. | Praeikite.", "Viskas gerai, praeikite."),
      t("Thanks. | Have | a | good | one.", "Ačiū. | Linkiu | — | geros | dienos.", "Ačiū, geros dienos.",
        { flags: { 4: "Prop-word “one” (have a good one) = a good day: dienos." } }),
    ],
    divest: [
      t("Laptops | and | liquids | out | of | your | bag, | please.", "Nešiojamuosius kompiuterius | ir | skysčius | išimkite | iš | savo | krepšio, | prašau.", "Nešiojamuosius kompiuterius ir skysčius išimkite iš krepšio, prašau.",
        { flags: { 3: "Verbless command: “out” is rendered by the imperative išimkite (take out)." } }),
      t("Take out | your | laptop | and | liquids, | please.", "Išimkite | savo | nešiojamąjį kompiuterį | ir | skysčius, | prašau.", "Išimkite nešiojamąjį kompiuterį ir skysčius, prašau."),
    ],
    divest2: [
      t("Jackets | and | belts | go | in | the | bin, | and | empty | your | pockets.", "Striukės | ir | diržai | keliauja | į | — | dėžę, | ir | ištuštinkite | savo | kišenes.", "Striukes ir diržus – į dėžę, o kišenes ištuštinkite."),
      t("Jackets, | belts | and | everything | from | your | pockets | in | the | bin.", "Striukes, | diržus | ir | viską | iš | savo | kišenių | į | — | dėžę.", "Striukes, diržus ir viską iš kišenių – į dėžę."),
    ],
    shoes_stay: [
      t("Your | shoes | can | stay | on.", "Jūsų | batai | gali | likti | apauti.", "Batų nusiauti nereikia."),
    ],
    divest_ask: [
      t("Go ahead | and | put | everything | in | the | bins.", "Prašom | — | sudėti | viską | į | — | dėžes.", "Prašom viską sudėti į dėžes.",
        { flags: { 1: "“and” joins “go ahead” to the next verb; Lithuanian uses the infinitive after prašom (linked to “put”)." } }),
      t("Just | let | me | know | when | you're | ready.", "Tiesiog | — | man | praneškite, | kai | būsite | {m:pasiruošęs|f:pasiruošusi}.", "Tiesiog praneškite, kai būsite {m:pasiruošęs|f:pasiruošusi}.",
        { flags: { 1: "“let … know” = praneškite; “let” has no separate word (linked to “know”).", 5: "“you're” refers to the future here: Lithuanian uses būsite after kai." } }),
    ],
    shoes_on_ok: [
      t("No, | your | shoes | can | stay | on.", "Ne, | jūsų | batai | gali | likti | apauti.", "Ne, batų nusiauti nereikia."),
      t("Nope, | shoes | stay | on | now.", "Ne, | batai | lieka | apauti | dabar.", "Ne, dabar batų nusiauti nereikia."),
    ],
    laptop_out: [
      t("Yes, | laptops | go | in | a | bin | by themselves.", "Taip, | nešiojamieji kompiuteriai | keliauja | į | — | dėžę | atskirai.", "Taip, nešiojamieji kompiuteriai dedami į atskirą dėžę."),
      t("Yes. | Anything | bigger | than | a | phone | goes | in | its | own | bin.", "Taip. | Viskas, kas | didesnis | už | — | telefoną, | keliauja | į | savo | atskirą | dėžę.", "Taip. Viskas, kas didesnis už telefoną, dedama į atskirą dėžę."),
    ],
    laptop_no_stay: [
      t("Sorry, | not | here. | Laptops | have | to come out.", "Atsiprašau, | ne | čia. | Nešiojamuosius kompiuterius | reikia | išimti.", "Atsiprašau, čia ne. Nešiojamuosius kompiuterius reikia išimti."),
    ],
    no_problem: [
      t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų."),
      t("That's | fine.", "Tai | gerai.", "Nieko tokio."),
    ],
    liquids_info: [
      t("Liquids | go | in | one | clear | quart-size | bag.", "Skysčiai | keliauja | į | vieną | skaidrų | litro talpos | maišelį.", "Skysčiai – į vieną skaidrų maždaug litro talpos maišelį.",
        { flags: { 5: "A US quart is about 0.95 l; in Europe this is the 1-litre bag." } }),
    ],
    liquids_info2: [
      t("Each | container | has | to be | 3.4 | ounces | or | less.", "Kiekviena | talpa | turi | būti | 3,4 | uncijos | ar | mažiau.", "Kiekviena talpa – ne daugiau kaip 3,4 uncijos (100 ml).",
        { say: "Each container has to be three point four ounces or less." }),
    ],
    plastic_bags: [
      t("There | are | bags | right | here. | Take | one.", "— | Yra | maišelių | štai | čia. | Paimkite | vieną.", "Maišelių yra štai čia – paimkite vieną.",
        { flags: { 0: "Existential “there” has no Lithuanian word: yra carries it (linked to “are”)." } }),
    ],
    phone_where: [
      t("In | the | bin, | with | your | keys | and | wallet.", "Į | — | dėžę, | kartu su | jūsų | raktais | ir | pinigine.", "Į dėžę, kartu su raktais ir pinigine."),
    ],
    jacket_yes: [
      t("Jackets | go | in | the | bin, | too.", "Striukės | keliauja | į | — | dėžę, | irgi.", "Striukes irgi dėkite į dėžę."),
    ],
    belt_yes: [
      t("Yes, | belts | off, | please.", "Taip, | diržus | nusijuoskite, | prašau.", "Taip, diržus nusijuoskite, prašau.",
        { flags: { 2: "Verbless command: “off” is rendered by the imperative nusijuoskite (take off a belt)." } }),
    ],
    watch_yes: [
      t("Yes, | put | it | in | the | bin | too.", "Taip, | dėkite | jį | į | — | dėžę | irgi.", "Taip, dėkite jį į dėžę irgi."),
    ],
    bins_here: [
      t("Right | here. | Grab | a | couple.", "Štai | čia. | Pasiimkite | — | kelias.", "Štai čia – pasiimkite kelias."),
    ],
    food_ok: [
      t("Solid | food | is fine.", "Kietas | maistas | tinka.", "Kietą maistą vežtis galima."),
    ],
    water_rule: [
      t("Only | if | it's | empty.", "Tik | jei | jis yra | tuščias.", "Tik jei jis tuščias."),
    ],
    gate_dir: [
      t("The | gates | are | to the left, | past | the | shops.", "— | Vartai | yra | kairėje, | už | — | parduotuvių.", "Vartai – kairėje, už parduotuvių."),
    ],
    restroom: [
      t("There's | a | restroom | right | after | security, | on the right.", "Yra | — | tualetas | iškart | po | saugumo patikros, | dešinėje.", "Iškart po patikros, dešinėje, yra tualetas."),
    ],
    scanner: [
      t("Okay, | step | into | the | scanner, | please.", "Gerai, | įženkite | į | — | skenerį, | prašau.", "Gerai, įženkite į skenerį."),
      t("Next, | please. | Step in | here.", "Kitas, | prašau. | Įženkite | čia.", "Kitas, prašau. Įženkite čia."),
    ],
    scanner2: [
      t("Feet | on | the | yellow | footprints, | and | arms | up.", "Pėdas | ant | — | geltonų | pėdsakų, | ir | rankas | aukštyn.", "Pėdas ant geltonų pėdsakų ir rankas aukštyn."),
      t("Stand | on | the | footprints | and | put | your | hands | above | your | head.", "Atsistokite | ant | — | pėdsakų | ir | pakelkite | savo | rankas | virš | savo | galvos.", "Atsistokite ant pėdsakų ir pakelkite rankas virš galvos."),
    ],
    walkthrough: [
      t("Okay, | step through, | please.", "Gerai, | praeikite, | prašau.", "Gerai, praeikite."),
      t("Come on through.", "Praeikite.", "Praeikite."),
    ],
    walk_ask: [
      t("Go ahead | and | step through.", "Prašom | — | praeiti.", "Prašom praeiti.",
        { flags: { 1: "“and” joins “go ahead” to the next verb; Lithuanian uses the infinitive after prašom (linked to “step through”)." } }),
    ],
    scan_done: [
      t("Perfect. | Hold still... | Okay, | you're | good.", "Puiku. | Nejudėkite... | Gerai, | jums | viskas gerai.", "Puiku. Nejudėkite… Gerai, viskas tvarkoje."),
      t("Okay, | step out. | You're | all clear.", "Gerai, | išeikite. | Jums | viskas gerai.", "Gerai, išeikite. Viskas tvarkoje."),
    ],
    walk_clear: [
      t("All clear. | Thank | you.", "Viskas gerai. | Dėkoju | jums.", "Viskas gerai, ačiū."),
      t("Okay, | you're | good.", "Gerai, | jums | viskas gerai.", "Gerai, viskas tvarkoje."),
    ],
    alarm_scanner: [
      t("Hmm, | the | scanner | found | something.", "Hmm, | — | skeneris | rado | kažką.", "Hmm, skeneris kažką aptiko."),
    ],
    alarm_beep: [
      t("Oops, | it | beeped.", "Oi, | jis | supypsėjo.", "Oi, supypsėjo."),
    ],
    ask_pockets: [
      t("Do | you | have | anything | in | your | pockets?", "Ar | jūs | turite | ką nors | — | savo | kišenėse?", "Ar turite ką nors kišenėse?",
        { flags: { 0: "Question “Do” = the particle ar.", 4: "“in” has no separate word: the locative kišenėse carries it across “your”." } }),
      t("Anything | in | your | pockets?", "Ką nors | — | jūsų | kišenėse?", "Ką nors turite kišenėse?",
        { flags: { 1: "“in” has no separate word: the locative kišenėse carries it across “your”." } }),
    ],
    what_is_it: [
      t("What | is | it?", "Kas | yra | tai?", "Kas tai?"),
    ],
    check_pockets: [
      t("Could | you | check | your | pockets, | please?", "Ar galėtumėte | jūs | patikrinti | savo | kišenes, | prašau?", "Ar galėtumėte patikrinti kišenes?"),
    ],
    put_it_bin: [
      t("Okay, | put | it | in | the | bin | and | step through | again.", "Gerai, | įdėkite | jį | į | — | dėžę | ir | praeikite | dar kartą.", "Gerai, įdėkite jį į dėžę ir praeikite dar kartą."),
      t("No | problem. | Put | it | in | a | bin | and | try | again.", "Jokių | problemų. | Įdėkite | jį | į | — | dėžę | ir | bandykite | dar kartą.", "Jokių problemų. Įdėkite jį į dėžę ir pabandykite dar kartą."),
    ],
    put_them_bin: [
      t("Okay, | put | them | in | the | bin | and | step through | again.", "Gerai, | įdėkite | juos | į | — | dėžę | ir | praeikite | dar kartą.", "Gerai, įdėkite juos į dėžę ir praeikite dar kartą."),
      t("No | problem. | Put | them | in | a | bin | and | try | again.", "Jokių | problemų. | Įdėkite | juos | į | — | dėžę | ir | bandykite | dar kartą.", "Jokių problemų. Įdėkite juos į dėžę ir pabandykite dar kartą."),
    ],
    ask_belt_watch: [
      t("Are | you | wearing | a | belt | or | a | watch?", "Ar | jūs | dėvite | — | diržą | ar | — | laikrodį?", "Ar dėvite diržą ar laikrodį?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar (C-Q); dėvite carries the progressive (linked to “wearing”)." } }),
    ],
    put_it_bin_too: [
      t("Please | put | it | in | the | bin | too, | and | step through | again.", "Prašau, | įdėkite | jį | į | — | dėžę | irgi | ir | praeikite | dar kartą.", "Prašom įdėti jį į dėžę ir praeiti dar kartą."),
    ],
    shoes_alarm: [
      t("It | might | be | your | shoes. | Could | you | take | them | off, | please?", "Tai | gali | būti | jūsų | batai. | Ar galėtumėte | jūs | nusiauti | juos | —, | prašau?", "Galbūt tai jūsų batai. Ar galėtumėte juos nusiauti?",
        { flags: { 9: "Discontinuous “take … off”: the prefix nu- of nusiauti carries “off” (linked to “take”)." } }),
    ],
    shoes_must: [
      t("Sorry, | I | need | you | to take | them | off | for | the | scanner.", "Atsiprašau, | man | reikia, | kad | nusiautumėte | juos | — | — | — | skeneriui.", "Atsiprašau, dėl skenerio batus reikia nusiauti.",
        { flags: { 3: "“you to take” = kad nusiautumėte: the subjunctive clause carries the subject (linked to “to take”).", 6: "Discontinuous “take … off”: the prefix nu- of nusiautumėte carries “off”.", 7: "“for” has no separate word: the dative skeneriui carries it (linked to “scanner”)." } }),
    ],
    again_ask: [
      t("Okay, | step through | again, | please.", "Gerai, | praeikite | dar kartą, | prašau.", "Gerai, praeikite dar kartą."),
    ],
    ask_your_bag: [
      t("Is | this | your | bag?", "Ar | tai | jūsų | krepšys?", "Ar tai jūsų krepšys?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
      t("Excuse me, | is | this | your | bag?", "Atsiprašau, | ar | tai | jūsų | krepšys?", "Atsiprašau, ar tai jūsų krepšys?", { flags: { 1: "“is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    need_check: [
      t("I | need | to check | it.", "Aš | turiu | patikrinti | jį.", "Turiu jį patikrinti."),
      t("Okay. | I | need | to take | a | quick | look | inside.", "Gerai. | Aš | turiu | — | — | greitai | pažvelgti | vidun.", "Gerai. Turiu greitai pažvelgti vidun.",
        { flags: { 3: "“to take a look” = pažvelgti: the infinitive sits on pažvelgti (linked to “look”).", 4: "Article: no separate Lithuanian word." } }),
    ],
    found_bottle: [
      t("There's | a | water | bottle | in | your | bag.", "Yra | — | vandens | butelis | — | jūsų | krepšyje.", "Jūsų krepšyje yra vandens butelis.",
        { flags: { 4: "“in” has no separate word: the locative krepšyje carries it across “your”." } }),
      t("You | have | a | water | bottle | in | here.", "Jūs | turite | — | vandens | butelį | — | čia.", "Čia yra jūsų vandens butelis.",
        { flags: { 5: "“in here” = čia (inside): “in” has no separate word (linked to “here”)." } }),
    ],
    no_worries: [
      t("No | worries.", "Jokių | rūpesčių.", "Nieko tokio."),
      t("It | happens | all | the | time.", "Tai | nutinka | visą | — | laiką.", "Taip nutinka nuolat."),
    ],
    bottle_rule: [
      t("Liquids | over | 3.4 | ounces | can't go | through.", "Skysčiai | virš | 3,4 | uncijos | negali keliauti | per patikrą.", "Daugiau nei 3,4 uncijos (100 ml) skysčio per patikrą neštis negalima.",
        { say: "Liquids over three point four ounces can't go through." }),
    ],
    bottle_options: [
      t("You | can | drink | it, | or | I | can | throw | it | away.", "Jūs | galite | išgerti | jį, | arba | aš | galiu | išmesti | jį | —.", "Galite jį išgerti arba aš jį išmesiu.",
        { flags: { 9: "Discontinuous “throw … away”: the prefix iš- of išmesti carries “away” (linked to “throw”)." } }),
      t("You | can | drink | it | here, | or | leave | it | with | me.", "Jūs | galite | išgerti | jį | čia | arba | palikti | jį | — | man.", "Galite jį išgerti čia arba palikti man.",
        { flags: { 8: "“with” has no separate word: the dative man carries it." } }),
    ],
    drink_ok: [
      t("Sure, | go ahead.", "Žinoma, | prašom.", "Žinoma, prašom."),
    ],
    toss_ok: [
      t("Okay, | I'll toss | it.", "Gerai, | išmesiu | jį.", "Gerai, išmesiu."),
      t("No | problem. | I'll take care | of it.", "Jokių | problemų. | Pasirūpinsiu | juo.", "Jokių problemų, pasirūpinsiu."),
    ],
    empty_ok: [
      t("Sure. | You | can | empty | it | right | here | and | refill | it | after | security.", "Žinoma. | Jūs | galite | ištuštinti | jį | štai | čia | ir | vėl pripildyti | jį | po | saugumo patikros.", "Žinoma. Galite jį ištuštinti čia ir po patikros vėl prisipilti."),
    ],
    not_mine_ok: [
      t("Oh, | sorry. | My | mistake.", "O, | atsiprašau. | Mano | klaida.", "O, atsiprašau, suklydau."),
    ],
    rest_fine: [
      t("Okay, | everything | else | looks | fine.", "Gerai, | visa | kita | atrodo | gerai.", "Gerai, visa kita tvarkoje."),
    ],
    bag_back: [
      t("Sure, | here's | your | bag.", "Žinoma, | štai | jūsų | krepšys.", "Žinoma, štai jūsų krepšys."),
      t("Here you go. | That's | your | bag.", "Prašom. | Tai yra | jūsų | krepšys.", "Prašom, štai jūsų krepšys."),
    ],
    all_set: [
      t("You're | all set.", "Jums | viskas sutvarkyta.", "Viskas, galite eiti."),
      t("You're | good | to go.", "Jūs | galite | eiti.", "Galite eiti.", { flags: { 1: "“good” (good to go) = galite: the permission sits on the modal verb (linked to “to go”)." } }),
    ],
    bag_later: [
      t("You'll get | it | back | at the end | of the belt.", "Atgausite | jį | — | gale | juostos.", "Jį atgausite juostos gale.",
        { flags: { 2: "“back”: the prefix at- of atgausite carries it (linked to “You'll get”)." } }),
    ],
    docs_done_already: [
      t("No, | I | already | checked | it, | thanks.", "Ne, | aš | jau | patikrinau | jį, | ačiū.", "Ne, jau patikrinau, ačiū."),
    ],
    bags_end_belt: [
      t("Your | bags | are | at the end | of the belt.", "Jūsų | krepšiai | yra | gale | juostos.", "Jūsų krepšiai – juostos gale."),
    ],
    shoes_bench: [
      t("There's | a | bench | right | over | there.", "Yra | — | suolelis | štai | — | ten.", "Štai ten yra suolelis.",
        { flags: { 4: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
    ],
    bye: [
      t("Have | a | good | flight!", "Linkiu | — | gero | skrydžio!", "Gero skrydžio!"),
      t("Safe | travels!", "Saugių | kelionių!", "Saugios kelionės!"),
      t("Enjoy | your | trip!", "Mėgaukitės | savo | kelione!", "Geros kelionės!"),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Thank | you.", "Dėkoju | jums.", "Ačiū."),
    ],
  },

  hints: {
    docs: {
      lt: "Paduoti dokumentus",
      items: [
        { id: "docs_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "docs_both", s: t("Here's | my | passport | and | boarding | pass.", "Štai | mano | pasas | ir | įlaipinimo | kortelė.", "Štai mano pasas ir įlaipinimo kortelė.") },
        { id: "docs_phone", s: t("My | boarding | pass | is | on | my | phone.", "Mano | įlaipinimo | kortelė | yra | — | mano | telefone.", "Įlaipinimo kortelė – mano telefone.",
          { flags: { 4: "“on” has no separate word: the locative telefone carries it across “my”." } }) },
        { id: "docs_q", s: t("Do | you | need | my | passport?", "Ar | jums | reikia | mano | paso?", "Ar reikia mano paso?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    ok_cmd: {
      lt: "Sutikti",
      items: [
        { id: "ok_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "ok_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "div_done", s: t("Okay, | all | done.", "Gerai, | viskas | padaryta.", "Gerai, viskas.") },
      ],
    },
    ok_short: {
      lt: "Sutikti",
      items: [
        { id: "ok_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "ok_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
      ],
    },
    divest: {
      lt: "Paklausti apie batus, kompiuterį ar skysčius",
      items: [
        { id: "div_shoes", s: t("Do | I | need | to take off | my | shoes?", "Ar | man | reikia | nusiauti | savo | batus?", "Ar reikia nusiauti batus?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "div_laptop", s: t("Should | I | take out | my | laptop?", "Ar | man | išimti | savo | nešiojamąjį kompiuterį?", "Ar man išimti nešiojamąjį kompiuterį?",
          { flags: { 0: "“Should” in a yes/no question = the particle ar; the dative man + infinitive carries the modal sense." } }) },
        { id: "div_no_laptop", s: t("I | don't have | a | laptop.", "Aš | neturiu | — | nešiojamojo kompiuterio.", "Neturiu nešiojamojo kompiuterio.") },
        { id: "div_liquids", s: t("Do | my | liquids | need | to be | in | a | bag?", "Ar | mano | skysčiai | turi | būti | — | — | maišelyje?", "Ar skysčiai turi būti maišelyje?",
          { flags: { 0: "Question “Do” = the particle ar.", 5: "“in” has no separate word: the locative maišelyje carries it." } }) },
        { id: "div_phone", s: t("Where | do | I | put | my | phone?", "Kur | — | man | dėti | savo | telefoną?", "Kur man dėti telefoną?",
          { flags: { 1: "Question “do” has no Lithuanian word; the dative man + infinitive carries the question (linked to “put”)." } }) },
        { id: "div_bins", s: t("Where | are | the | bins?", "Kur | yra | — | dėžės?", "Kur dėžės?") },
      ],
    },
    walk: {
      lt: "Praeiti pro skenerį",
      items: [
        { id: "ok_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "walk_like_this", s: t("Like | this?", "Štai | taip?", "Štai taip?") },
        { id: "ok_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
      ],
    },
    beltwatch: {
      lt: "Atsakyti apie diržą ar laikrodį",
      items: [
        { id: "pk_yes_my", s: t("Oh, | yes, | my | belt.", "O, | taip, | mano | diržas.", "O, taip, mano diržas.") },
        { id: "pk_no_im_not", s: t("No, | I'm | not.", "Ne, | aš | [nedėviu].", "Ne, nedėviu.",
          { flags: { 2: "Elliptical “I'm not”: Lithuanian repeats the verb in the negative (nedėviu)." } }) },
      ],
    },
    bag_q: {
      lt: "Atsakyti, ar tai tavo krepšys",
      items: [
        { id: "bq_mine", s: t("Yes, | it's | mine.", "Taip, | jis yra | mano.", "Taip, mano.") },
        { id: "bq_yes", s: t("Yes, | it | is.", "Taip, | jis | [mano].", "Taip, mano.",
          { flags: { 2: "Elliptical “is”: Lithuanian repeats the predicate (mano)." } }) },
      ],
    },
    bottle_sorry: {
      lt: "Atsiprašyti: pamiršai",
      items: [
        { id: "bt_forgot", s: t("Oh, | sorry, | I | forgot.", "O, | atsiprašau, | aš | pamiršau.", "O, atsiprašau, pamiršau.") },
      ],
    },
    pockets: {
      lt: "Pasakyti, kas kišenėse",
      items: [
        { id: "pk_keys", s: t("Just | my | keys.", "Tik | mano | raktai.", "Tik raktai.") },
        { id: "pk_phone", s: t("Oh, | my | phone!", "O, | mano | telefonas!", "O, mano telefonas!") },
        { id: "pk_nothing", s: t("No, | nothing.", "Ne, | nieko.", "Ne, nieko.") },
        { id: "pk_belt", s: t("I | think | it's | my | belt.", "Aš | manau, | tai yra | mano | diržas.", "Manau, tai mano diržas.") },
      ],
    },
    bottle: {
      lt: "Pasakyti, ką daryti su buteliu",
      items: [
        { id: "bt_throw", s: t("You | can | throw | it | away.", "Jūs | galite | išmesti | jį | —.", "Galite jį išmesti.",
          { flags: { 4: "Discontinuous “throw … away”: the prefix iš- of išmesti carries “away” (linked to “throw”)." } }) },
        { id: "bt_drink", s: t("I'll drink | it | now.", "Išgersiu | jį | dabar.", "Išgersiu jį dabar.") },
        { id: "bt_empty", s: t("Can | I | just | empty | it?", "Ar galiu | aš | tiesiog | ištuštinti | jį?", "Ar galiu jį tiesiog ištuštinti?") },
        { id: "bt_keep", s: t("Can | I | keep | the | bottle?", "Ar galiu | aš | pasilikti | — | butelį?", "Ar galiu pasilikti butelį?") },
      ],
    },
    after: {
      lt: "Atsiimti daiktus ir paklausti, kur toliau",
      items: [
        { id: "bag_back", s: t("Can | I | have | my | bag | back?", "Ar galiu | aš | gauti | savo | krepšį | atgal?", "Ar galiu atgauti savo krepšį?") },
        { id: "all_set", s: t("Am | I | all set?", "Ar | man | viskas sutvarkyta?", "Ar jau galiu eiti?",
          { flags: { 0: "“Am” in a yes/no question = the particle ar; the dative man + viskas sutvarkyta replaces the copula (linked to “all set”)." } }) },
        { id: "gate_dir", s: t("Where's | gate | 8?", "Kur yra | vartai | 8?", "Kur aštuntieji vartai?", { say: "Where's gate eight?" }) },
        { id: "shoes_bench", s: t("Where | can | I | put on | my | shoes?", "Kur | galiu | aš | apsiauti | savo | batus?", "Kur galėčiau apsiauti batus?"), note: "Jei teko nusiauti batus." },
      ],
    },
  },

  tips: {
    uk_boardingcard: { key: "uk_boardingcard", lt: "Suprasta! Amerikoje sakoma „boarding pass“ (įlaipinimo kortelė).", better: "Here's my boarding pass." },
    uk_queue: { key: "uk_queue", lt: "Suprasta! Amerikoje eilė – „line“.", better: "Is this the line for security?" },
    uk_tray: { key: "uk_tray", lt: "Suprasta! JAV patikroje dėžės vadinamos „bins“.", better: "Where are the bins?" },
    uk_jumper: { key: "uk_jumper", lt: "Suprasta! Amerikoje sakoma „sweater“ (megztinis).", better: "What about my sweater?" },
    us_phone: { key: "us_phone", lt: "Suprasta! Amerikoje sakoma „phone“ arba „cell phone“.", better: "Where do I put my phone?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
  },

  merges: {
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is misleading; permission to proceed through a checkpoint = praeikite / prašom.", minimal: "Two words (C-LEX)." },
    "take out": { reason: "lexical_expression", split: "take → imti + out → lauk is false; the particle is carried by the prefix of išimti (C-PHR).", minimal: "Two words." },
    "to take off": { reason: "grammatical_fusion", split: "to → į + take → imti + off → nuo is false; infinitive “to” is the ending -ti and “take off” (shoes) = nusiauti (C-INF + C-PHR).", minimal: "Three words; none can be removed." },
    "to come out": { reason: "grammatical_fusion", split: "to → į + come → ateiti + out → lauk is false; here = be taken out (išimti) (C-INF + C-PHR).", minimal: "Three words; none can be removed." },
    "step through": { reason: "lexical_expression", split: "step → žengti + through → pro is a calque; walking through a scanner = praeiti (the prefix pra- carries “through”) (C-PHR).", minimal: "Two words." },
    "come on through": { reason: "lexical_expression", split: "come → ateikite, on → —, through → pro is false; the invitation = praeikite.", minimal: "Three words forming one formula." },
    "step in": { reason: "lexical_expression", split: "step → žengti + in → į: the prefix į- of įženkite carries “in” (C-PHR).", minimal: "Two words." },
    "step out": { reason: "lexical_expression", split: "step → žengti + out → lauk is false; = išeikite (the prefix iš- carries “out”) (C-PHR).", minimal: "Two words." },
    "hold still": { reason: "lexical_expression", split: "hold → laikykite + still → vis dar is false; = nejudėkite.", minimal: "Two words." },
    "all clear": { reason: "lexical_expression", split: "all → visi + clear → aiškus is false; the security “all clear” = viskas gerai.", minimal: "Two words." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatytas is false; “all set” = everything is done (viskas sutvarkyta).", minimal: "Two words." },
    "put on": { reason: "lexical_expression", split: "put → dėti + on → ant is false; putting on shoes = apsiauti (C-PHR).", minimal: "Two words." },
    "i'll take care": { reason: "grammatical_fusion", split: "I'll → aš + take → imsiu + care → rūpestis is false; “take care of” = pasirūpinti, future on the verb (C-FUT).", minimal: "“of it” stays outside (C-CASE: juo)." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → man is a literal reading of an attention formula (= atsiprašau).", minimal: "Two words (C-LEX)." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "docs", lt: "Parodyk dokumentus" },
    { step: "camera", lt: "Pažiūrėk į kamerą", optional: true },
    { step: "divest", lt: "Susidėk daiktus į dėžes" },
    { step: "walk", lt: "Praeik pro skenerį" },
    { step: "bottle", lt: "Pasakyk, ką daryti su buteliu", optional: true },
    { step: "collect", lt: "Atsiimk krepšį", optional: true },
  ],

  steps: [
    { id: "docs", done: (c) => !!c.s.docsDone,
      ask: (c) => c.say("ask_docs"),
      expects: ["give_docs", "docs_q"],
      suggest: [{ lt: "Paduoti įlaipinimo kortelę ir pasą", hint: "docs" }],
      yes: (c) => { docsGiven(c, ["both"]); } },
    { id: "camera", when: (c) => !!c.s.camera, done: (c) => !!c.s.cameraDone,
      ask: (c) => c.say("camera"),
      expects: ["ack_done"],
      suggest: [{ lt: "Pažiūrėti į kamerą", hint: "ok_short" }],
      yes: (c) => { c.s.cameraDone = true; c.say("docs_ok"); } },
    { id: "divest", done: (c) => !!c.s.divested,
      ask: (c) => {
        if (!c.s.divestAsked) {
          c.s.divestAsked = true;
          c.say("divest");
          c.say("divest2");
          if (c.s.shoesNote) c.say("shoes_stay");
        } else c.say("divest_ask");
      },
      expects: ["ack_done", "ask_shoes", "ask_laptop", "no_laptop", "ask_liquids", "no_liquids", "no_plastic_bag", "ask_phone", "ask_jacket", "ask_belt", "ask_watch", "ask_bins", "ask_food", "ask_water"],
      suggest: [{ lt: "Sutikti ir susidėti daiktus", hint: "ok_cmd" }, { lt: "Paklausti apie batus, kompiuterį ar skysčius", hint: "divest" }],
      yes: (c) => { c.s.divested = true; } },
    { id: "walk", done: (c) => !!c.s.walked,
      ask: (c) => {
        if (!c.s.walkAsked) {
          c.s.walkAsked = true;
          if (c.s.scanner) { c.say("scanner"); c.say("scanner2"); } else c.say("walkthrough");
        } else c.say("walk_ask");
      },
      expects: ["ack_done"],
      suggest: [{ lt: "Praeiti pro skenerį", hint: "walk" }],
      yes: (c) => { walkThrough(c); } },
    { id: "bag_q", when: (c) => !!c.s.bagCheck, done: (c) => !!c.s.bagChecked || !!c.s.bagHeld,
      ask: (c) => c.say("ask_your_bag"),
      expects: ["affirm", "deny"],
      suggest: [{ lt: "Atsakyti: taip, tai mano krepšys", hint: "bag_q" }],
      yes: (c) => { startBottle(c); },
      no: (c) => { c.s.bagChecked = true; c.say("not_mine_ok"); } },
    { id: "bottle", when: (c) => !!c.s.bagHeld, done: (c) => !!c.s.bagChecked,
      ask: (c) => {
        if (!c.s.bottleExplained) { c.s.bottleExplained = true; c.say("bottle_rule"); }
        c.say("bottle_options");
      },
      expects: ["bottle_drink", "bottle_throw", "bottle_empty", "bottle_keep"],
      suggest: [{ lt: "Pasakyti, ką daryti su buteliu", hint: "bottle" }] },
    { id: "collect", when: (c) => !!c.s.bagHeld && !!c.s.bagChecked, done: (c) => !!c.s.collected,
      ask: (c) => c.say("rest_fine"),
      expects: ["bag_back"],
      suggest: [{ lt: "Paprašyti grąžinti krepšį", hint: "after" }],
      yes: (c) => { c.s.collected = true; c.say("bag_back"); },
      no: (c) => { c.s.collected = true; c.say("bag_back"); } },
  ],

  init: (c) => {
    c.s.camera = c.chance(0.4);
    c.s.shoesNote = c.chance(0.5);
    c.s.scanner = c.chance(0.6);
    c.s.alarm = c.visits >= 1 ? c.chance(0.55) : c.chance(0.35);
    c.s.bagCheck = c.visits >= 1 ? c.chance(0.6) : c.chance(0.3);
  },

  start: (c) => {
    c.say("greet_docs");
    c.hold(); // the greeting asks for the documents; the "docs" step is the one being answered
  },

  handlers: {
    affirm(c) { const st = security.steps.find((x) => x.id === c.step); if (st?.yes) st.yes(c); },
    deny(c) { const st = security.steps.find((x) => x.id === c.step); if (st?.no) st.no(c); },
    g_bye(c) { c.say("g_bye"); c.end(); c.hold(); },
    give_docs(c, _slots, seg) {
      if (c.s.docsDone) { c.say("ack"); return; }
      docsGiven(c, seg.tags);
    },
    docs_q(c) {
      if (c.s.docsDone) { c.say("docs_done_already"); return; }
      c.say("docs_yes"); c.hold();
    },
    is_this_line(c) { c.say("line_yes"); },
    ack_done(c) {
      if (c.s.__finished) { c.say("all_set"); return; }
      const st = security.steps.find((x) => x.id === c.step);
      if (st?.yes && !st.done(c)) st.yes(c);
    },
    g_ok(c) {
      const st = security.steps.find((x) => x.id === c.step);
      if (st?.yes && !st.done(c) && c.step !== "bag_q") st.yes(c);
    },
    ask_shoes(c) { c.say("shoes_on_ok"); },
    ask_laptop(c) { c.say(/leave|keep/.test(c.heard.toLowerCase()) ? "laptop_no_stay" : "laptop_out"); },
    no_laptop(c) { c.say("no_problem"); },
    ask_liquids(c) { c.say("liquids_info"); c.say("liquids_info2"); },
    no_liquids(c) { c.say("no_problem"); },
    no_plastic_bag(c) { c.say("plastic_bags"); },
    ask_phone(c) { c.say("phone_where"); },
    ask_jacket(c) { c.say("jacket_yes"); },
    ask_belt(c) { c.say("belt_yes"); },
    ask_watch(c) { c.say("watch_yes"); },
    ask_bins(c) { c.say("bins_here"); },
    ask_food(c) { c.say("food_ok"); },
    ask_water(c) { c.say("water_rule"); },
    pockets_item(c) { if (c.s.__finished) c.say("all_set"); else if (c.step === "walk") c.say("ack"); },
    pockets_nothing(c) { if (c.s.__finished) c.say("all_set"); },
    forgot(c) { c.say("no_worries"); },
    g_thanks(c) {
      if (c.step === "collect" && !c.s.collected) { c.s.collected = true; c.say("bag_back"); return; }
      c.say("g_welcome");
    },
    ask_what(c) { c.say(c.s.bagHeld ? "found_bottle" : "no_problem"); },
    where_stand(c) { c.say(c.s.scanner ? "scanner2" : "walkthrough"); c.hold(); },
    bottle_drink(c) { if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "drink_ok"); else c.say(c.s.__finished ? "all_set" : "ack"); },
    bottle_throw(c) { if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "toss_ok"); else c.say(c.s.__finished ? "all_set" : "ack"); },
    bottle_empty(c) { if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "empty_ok"); else c.say("water_rule"); },
    bottle_keep(c) {
      if (!c.s.bagHeld || c.s.bagChecked) { c.say("water_rule"); return; }
      c.say("water_rule");
      ask(c, {
        id: "bottle_keep", expects: ["bottle_empty", "bottle_throw", "bottle_drink"], hints: ["bottle"],
        suggest: [{ lt: "Ištuštinti, išgerti ar išmesti", hint: "bottle" }],
        on: {
          bottle_empty: (cc) => { bottleDone(cc, "empty_ok"); },
          bottle_throw: (cc) => { bottleDone(cc, "toss_ok"); },
          bottle_drink: (cc) => { bottleDone(cc, "drink_ok"); },
        },
        yes: (cc) => { bottleDone(cc, "empty_ok"); },
        no: (cc) => { bottleDone(cc, "toss_ok"); },
        ask: (cc) => cc.say("bottle_options"),
      });
    },
    bag_back(c) {
      if (c.s.bagHeld && !c.s.bagChecked) { c.say("found_bottle"); return; }
      if (c.s.bagHeld && !c.s.collected) { c.s.collected = true; c.say("bag_back"); return; }
      if (c.s.walked) { c.say("bags_end_belt"); return; }
      c.say("bag_later");
    },
    shoes_on(c) { c.say("shoes_bench"); },
    ask_gate(c) { c.say("gate_dir"); },
    ask_restroom(c) { c.say("restroom"); },
  },

  finish: (c) => {
    c.complete();
    if (!c.s.bagHeld) { c.say("all_set"); c.say("bags_end_belt"); }
    else c.say("all_set");
    if (c.s.shoesOff) c.say("shoes_bench");
    c.say("bye");
    ask(c, { id: "closing", hints: ["g_social", "after"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }, { lt: "Paklausti, kur vartai", hint: "after" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Here you go.", intent: "give_docs", step: "docs" },
    { say: "Here's my passport and boarding pass.", intent: "give_docs", step: "docs" },
    { say: "My boarding pass is on my phone.", intent: "give_docs" },
    { say: "Here's my passport.", intent: "give_docs" },
    { say: "Here's my boarding card", intent: "give_docs" },
    { say: "Do you need my passport?", intent: "docs_q" },
    { say: "Is this the queue for security?", intent: "is_this_line" },
    { say: "Okay, no problem.", intent: "ack_done", step: "divest" },
    { say: "Do I need to take off my shoes?", intent: "ask_shoes" },
    { say: "Should I take out my laptop?", intent: "ask_laptop" },
    { say: "Can I leave my laptop in the bag?", intent: "ask_laptop" },
    { say: "I don't have a laptop.", intent: "no_laptop", not: ["ask_laptop"] },
    { say: "Do my liquids need to be in a bag?", intent: "ask_liquids" },
    { say: "I don't have any liquids", intent: "no_liquids", not: ["ask_liquids"] },
    { say: "Where do I put my phone?", intent: "ask_phone" },
    { say: "Where are the bins?", intent: "ask_bins" },
    { say: "Where are the trays?", intent: "ask_bins" },
    { say: "Done", intent: "ack_done", step: "divest" },
    { say: "Like this?", intent: "ack_done", step: "walk" },
    { say: "Just my keys.", intent: "pockets_item", slots: { pocket: "keys" } },
    { say: "Oh, my phone!", intent: "pockets_item", slots: { pocket: "phone" } },
    { say: "I think it's my belt.", intent: "pockets_item", slots: { pocket: "belt" } },
    { say: "No, nothing.", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "There's nothing in my pockets", intent: "pockets_nothing" },
    { say: "Oh, sorry, I forgot.", intent: "forgot" },
    { say: "You can throw it away.", intent: "bottle_throw" },
    { say: "I'll drink it now.", intent: "bottle_drink" },
    { say: "Can I just empty it?", intent: "bottle_empty" },
    { say: "Can I keep the bottle?", intent: "bottle_keep" },
    { say: "Yes, it's mine.", intent: "affirm" },
    { say: "No, that's not my bag", intent: "deny", not: ["affirm"] },
    { say: "Can I have my bag back?", intent: "bag_back" },
    { say: "Am I all set?", intent: "bag_back" },
    { say: "Where can I put my shoes on?", intent: "shoes_on" },
    { say: "Where's gate 8?", intent: "ask_gate", slots: { number: 8 } },
    { say: "Where is the toilet?", intent: "ask_restroom" },
    { say: "Where do I put my mobile?", intent: "ask_phone" },
    // more ways to say it (dev corpus tests/corpus/s64b-security.json)
    { say: "Here are both", intent: "give_docs", step: "docs" },
    { say: "I have an electronic boarding pass", intent: "give_docs" },
    { say: "Can I show it on my phone?", intent: "docs_q" },
    { say: "Shoes too?", intent: "ask_shoes" },
    { say: "The laptop also?", intent: "ask_laptop" },
    { say: "Is my toothpaste a liquid?", intent: "ask_liquids" },
    { say: "I don't have liquids", intent: "no_liquids", step: "divest", not: ["ask_liquids"] },
    { say: "Where do I stand?", intent: "where_stand" },
    { say: "Should I go in now?", intent: "ack_done", step: "walk" },
    { say: "A pen", intent: "pockets_item", slots: { pocket: "pen" } },
    { say: "Only a tissue", intent: "pockets_item", slots: { pocket: "tissue" } },
    { say: "Neither", intent: "pockets_nothing" },
    { say: "Yes, is there a problem?", intent: "affirm", step: "bag_q" },
    { say: "Sorry, my mistake", intent: "forgot" },
    { say: "Just throw it in the trash", intent: "bottle_throw", step: "bottle" },
    { say: "Can I pour out the water?", intent: "bottle_empty" },
    { say: "I want to keep my bottle", intent: "bottle_keep" },
    { say: "So I can go?", intent: "bag_back" },
    // meaning kept
    { say: "No keys, no phone", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "It isn't mine", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "Don't throw it away", intent: "none", step: "bottle" },
    { say: "I don't want to keep it", intent: "none", step: "bottle" },
    { say: "I'm not ready yet", intent: "none", step: "walk" },
    { say: "my laptop is a banana", intent: "none" },
    { say: "I like green trains very much", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "Where do I put my laptop?", intent: "ask_bins", step: "divest" },
    { say: "Does my laptop go in a separate bin?", intent: "ask_laptop", step: "divest" },
    { say: "Do I need to take out my liquids?", intent: "ask_liquids", step: "divest" },
    { say: "I only have a small bottle of water.", intent: "ask_water", step: "divest" },
    { say: "Do I walk through now?", intent: "ack_done", step: "walk" },
    { say: "Oh, sorry, I forgot about the water.", intent: "forgot" },
    { say: "Where is my bag?", intent: "bag_back", step: "collect" },
    { say: "I don't need to take out my liquids.", intent: "none", step: "divest" },
  ],

  sims: [
    { name: "happy path", turns: ["Here's my passport and boarding pass.", "Okay, no problem.", "Okay.", "Can I have my bag back?"],
      expect: { complete: true }, auto: AUTO },
    { name: "partial documents and questions", turns: ["Here's my passport.", "It's on my phone.", "Do I need to take off my shoes?", "Should I take out my laptop?", "Where do I put my phone?", "Okay, done.", "Like this?", "Where's gate 8?"],
      expect: { complete: true }, auto: AUTO },
    { name: "alarm with nothing in pockets, bottle emptied", turns: ["Here you go", "Done", "Okay"],
      expect: { complete: true }, auto: { ...AUTO, pockets: "No, nothing.", belt_watch: "No.", bottle: "Can I just empty it?" } },
    { name: "bottle: can I keep it, not my bag", turns: ["Here you go", "I don't have a laptop.", "Okay, done", "Like this?"],
      expect: { complete: true }, auto: { ...AUTO, bottle: "Can I keep the bottle?", bag_q: "No, that's not my bag." } },
  ],
};

export default security;
