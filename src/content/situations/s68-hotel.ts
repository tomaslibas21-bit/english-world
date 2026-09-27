// Song 68 "Late Check-Out": checking in at the Harborview Hotel with Olivia at the front desk.
// Reservation and last name (spelled out), nights, photo ID, a credit card for incidentals,
// signing, keys, room number and floor; then the learner's questions: what's included, breakfast,
// Wi-Fi password, check-out time, late check-out (noon free, 2 p.m. for $30), luggage storage,
// a taxi, extra towels, a room with a view, parking, gym, elevator… A walk-in without a
// reservation is handled too. Twists (visits ≥ 1): a free upgrade, and a problem visit — the
// learner comes back to the desk because the air conditioning (or the key card, hot water…)
// isn't working → apology, a fan, or a room change.
// Hint examples use {$surname} / {$letters}, which the conversation UI binds to the player's surname.

import type { Ctx, Pending, Segment, SituationDef } from "../types";
import { t } from "../dsl";

// ---------------------------------------------------------------------------
// Helpers

const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
function ack(c: Ctx, p = 0.5, line = "ack") { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say(line); }
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};
const tagVal = (tags: string[], prefix: string) => tags.find((x) => x.startsWith(prefix))?.slice(prefix.length);

function nightsFrom(slots: any, seg?: Segment): number | undefined {
  const n = slots?.nights;
  if (!n) return undefined;
  const tags = allTags(n, seg);
  const fixed = tagVal(tags, "n:");
  if (fixed) return Number(fixed);
  if (typeof n.number === "number") return n.number;
  return undefined;
}

function askNext(c: Ctx) {
  for (const st of hotel.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return true;
  }
  return false;
}

/** Walk-in: the room on offer ("king" by default, "two" queen beds, or the "cheap" smaller one). */
const OFFER_LINE: Record<string, string> = { two: "walkin_twobeds", cheap: "walkin_cheaper" };
const OFFER_ROOM: Record<string, string> = { two: "207", cheap: "305" };
function takeRoom(c: Ctx) { c.s.roomChosen = true; if (OFFER_ROOM[c.s.offer]) c.s.room = OFFER_ROOM[c.s.offer]; }
/** "That's too expensive." / "Anything cheaper?" / "No, thanks.": a smaller room; after that, it's the cheapest. */
function offerCheaper(c: Ctx) {
  if (c.s.offer === "cheap") { c.say("walkin_cheapest"); c.hold(); return; }
  c.s.offer = "cheap"; c.say("walkin_cheaper"); c.hold();
}

/** Choosing between noon (free) and 2 p.m. ($30). */
function lateChoicePending(): Pending {
  const noon = (cc: Ctx) => { cc.s.late = "noon"; once(cc, "late", "late_noon_ok"); };
  const two = (cc: Ctx) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); };
  return {
    id: "late", expects: ["late_noon", "late_two", "too_expensive_ctx", "cheaper_ctx"], hints: ["late_choice"],
    suggest: [{ lt: "Pasirinkti: vidurdienis (nemokamai) ar 14 val. (už 30 $)", hint: "late_choice" }],
    on: { late_noon: noon, late_two: two, too_expensive_ctx: noon, cheaper_ctx: noon },
    yes: two, no: noon,
    ask: (cc) => cc.say("late_offer"),
  };
}

/** Offering an ocean-view room for $20 more. */
function viewPending(): Pending {
  return {
    id: "view", hints: ["g_yesno"], suggest: [{ lt: "Atsakyti, ar nori kambario su vaizdu", hint: "g_yesno" }],
    yes: (cc) => { cc.s.room = "518"; cc.s.view = true; cc.say("view_ok"); if (cc.s.roomSaid) cc.say("room_518"); },
    no: (cc) => { cc.say("no_problem"); },
    ask: (cc) => cc.say("view_offer"),
  };
}

/** "Anything else?" after a question: now the simplest reply is "No, that's all, thanks." */
function anyElsePending(): Pending {
  return {
    id: "anything", optional: true, hints: ["done", "ask", "late"],
    suggest: [
      { lt: "Pasakyti, kad daugiau klausimų nėra", hint: "done" },
      { lt: "Paklausti dar ko nors", hint: "ask" },
      { lt: "Paprašyti vėlesnio išsiregistravimo", hint: "late" },
    ],
  };
}

/** Problem visit: a fan or a different room. */
function fanOrRoomPending(): Pending {
  const fan = (cc: Ctx) => { cc.s.fixed = "fan"; once(cc, "fix", "fan_ok"); cc.say("fix_tomorrow"); };
  const move = (cc: Ctx) => { cc.s.fixed = "move"; cc.s.room = "518"; once(cc, "fix", "move_ok"); cc.say("new_key"); cc.event("give", { item: "key card" }); };
  return {
    id: "fan_or_room", expects: ["ch_fan", "ch_move"], hints: ["choice"],
    suggest: [{ lt: "Pasirinkti ventiliatorių arba kitą kambarį", hint: "choice" }],
    on: { ch_fan: fan, ch_move: move },
    yes: fan, no: move,
    ask: (cc) => cc.say("fan_or_room"),
  };
}

function quietPending(): Pending {
  return {
    id: "quiet", hints: ["g_yesno", "choice"], suggest: [{ lt: "Sutikti persikelti arba likti", hint: "g_yesno" }],
    on: { ch_move: (cc) => { cc.s.fixed = "move"; cc.s.room = "518"; cc.say("move_ok"); cc.say("new_key"); } },
    yes: (cc) => { cc.s.fixed = "move"; cc.s.room = "518"; cc.say("move_ok"); cc.say("new_key"); cc.event("give", { item: "key card" }); },
    no: (cc) => { cc.s.fixed = "stay"; cc.say("earplugs"); },
    ask: (cc) => cc.say("quiet_offer"),
  };
}

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Answers the simulation gives when Olivia asks an optional question.
const HT_AUTO: Record<string, string> = {
  arrive: "Hi, I have a reservation.", name: "Mikalauskas.", spell: "M-I-K-A-L-A-U-S-K-A-S.", found: "Yes.",
  nights: "Three nights.", walk_nights: "Two nights.", walk_offer: "Yes, I'll take it.", id: "Here's my passport.", card: "Here you go.",
  sign: "Sure.", keys: "Just one, please.", anything: "No, that's all, thanks.", late: "Noon is fine, thanks.", view: "Yes, please.",
  taxi_time: "At noon.", p_report: "The air conditioning isn't working.", fan_or_room: "A fan is fine.", quiet: "Yes, please.",
};

// ---------------------------------------------------------------------------

export const hotel: SituationDef = {
  id: "s68-hotel",
  song: 68,
  songTitle: "Late Check-Out",
  title: { en: "Late Check-Out", lt: "Vėlesnis išsiregistravimas" },
  topic: { en: "At the hotel", lt: "Viešbutyje" },
  chapter: 1,
  order: 4,
  location: "hotel",
  npc: "olivia",
  goal: "Užsiregistruok viešbutyje ir sužinok, kas įskaičiuota.",
  intro: "„Harborview“ viešbutis. Prie registratūros stalo tave pasitinka Olivia. Kambarys tau užsakytas trims naktims (arba gali paklausti, ar yra laisvų kambarių).",

  grammar: {
    macros: {
      res: "(a reservation | a booking | a room booked | a room reserved)",
      checkout: "(check out | checkout | check-out)",
      wifi: "(wi fi | wifi | the internet | internet)",
      ac: "(air conditioning | air conditioner | ac | a c | the ac | the air conditioning | the air conditioner | the a c | air con | the air con)",
      towels: "(towels | extra towels | more towels | clean towels | fresh towels)",
    },
    slots: {
      nights: { pattern: [
        "(one | a) night #n:1", "{number} nights", "[just] tonight #n:1", "the weekend #n:2", "a week #n:7", "(two | a couple of) nights #n:2",
      ] },
    },
  },

  intents: {
    checkin: { patterns: [
      "(i have | we have | i made | i booked) @res [(under | in) [the name] {name}] [for {nights}] #h:ci_res",
      "(i have | we have) @res under {name} #h:ci_under", "(i have | we have) @res for {nights} #h:ci_nights",
      "i would like to check in [please] #h:ci_like", "(i am | we are) checking in", "i am here to check in", "i want to check in",
      "(i booked | i have booked | i reserved) a room [online | for {nights}]", "check in [please]", "[yes] checking in",
      "i have a reservation [and] my name is {name}",
      // more ways: "My name is …, I have a reservation", "Reservation for …", "I booked through Booking.com"
      "my name is {name} [and] (i have | we have) @res", "[yes] (checking in | check in) [for | under] {name}", "[a] (reservation | booking) (for | under) [the name] {name}",
      "(i have | we have | i) got @res",
      "i (would like | want) to check in [and] my name is {name}", "i would like to check in [and] (the reservation is | it is) under [the name] {name}",
      "(i booked | we booked | i reserved | i made the reservation) [it | the room] (through | on | with | via) (booking com | booking | expedia | airbnb | your website | the website | the internet | the app | a travel agency | my company)",
      "my (wife | husband | company | boss | friend | partner | colleague) (made | booked) the (reservation | booking) [for (me | us)]",
    ] },
    walkin: { patterns: [
      "(do you have | have you got | is there) (any rooms | a room | anything) (available | free) [for (tonight | {nights})] #h:ci_walkin",
      "(do you have | have you got) (any | a) (free | available) (rooms | room) [for (tonight | {nights})]",
      "[no] i do not have a (reservation | booking) #h:wk_none", "i need a room [for (tonight | {nights})] #h:wk_need", "(can | could) i get a room [for (tonight | {nights})]",
      "i would like a room [for (tonight | {nights})]",
      "(is there | do you have | have you got) (a room | any rooms | a free room) for (tonight | {nights})", "(do you have | have you got | are there) any rooms left [for (tonight | {nights})]",
      "(do you have | have you got) a room [for (tonight | {nights})]",
      "(do you have | have you got) a room for (two people | two persons | two | a couple | one person | {number} people)", "i would like to (book | get | rent) a room [for (tonight | {nights})]",
    ] },
    nights_ctx: { patterns: ["[for] {nights} #h:nt_short", "(i am | we are | i will be) staying [for] {nights}", "{number}", "[i booked] {nights}",
      "i need it for {nights}", "(only | just) {nights}", "(i | we) (will | want to | would like to) stay [for] {nights}", "(that is | it is) (correct | right) {nights}"] },
    name_ctx: { patterns: [
      "[it is | my name is | the name is | the last name is | my last name is | it is under | the reservation is under | under] {name} #h:nm_its",
      "under the name {name}", "{name} {letters}", "[it is | the last name is] {letters} #h:nm_its",
      // "My surname is …", "Family name …", "The reservation should be under …"
      "(my | the) (surname | family name) is {name}", "(family name | surname | last name) {name}", "(the reservation | it) (should be | might be | is probably) under [the name] {name}",
      "(it is | the reservation is) under my name {name}", "it should be {name}",
    ] },
    letters_ctx: { patterns: ["[sure] [it is | that is] {letters} #h:sp_its", "it is spelled {letters}", "{letters} [thank you]", "{name} {letters}", "it is a lithuanian name [it is] {letters}", "{letters} {name}"] },
    nights_fix: { patterns: ["[no] (it is | it should be | i booked | i have | i need) {nights} [not (three | 3) [nights]] #h:nt_fix", "[no] (only | just) {nights}", "[no] not three [nights] {nights}",
      "[no] i think it is {number} [nights]"] },
    hand_over: { patterns: [
      "here you go #h:idc_here", "here you are", "there you go", "here it is", "here",
      "here is my (passport | id | driver s license | license) #h:idc_passport", "here is my (card | credit card | debit card | visa card) #h:idc_card",
      "this is my (passport | id | card | credit card)", "[sure] (my passport | the passport)",
      "here is my (id card | identity card | drivers license | visa | mastercard | amex | american express) [card]",
      "here is my (passport | id) and [my] (credit card | card) #both",
      "(can | could) i (show | give) you my (driver s license | drivers license | license | id card | passport | id)",
    ] },
    id_q: { patterns: ["is (a | my) passport (okay | fine | ok) #h:idc_ok", "can i use my passport", "do you need my passport", "i only have my passport",
      "(lithuanian | european | eu | my) passport (is that | is it) (okay | fine | ok)", "[do you need] (my passport | a passport) or (my | an) (id | id card)"] },
    incidentals_q: { patterns: ["what are incidentals #h:idc_what", "what (is | does) incidentals mean", "what is (it | that | the card) for", "why do you need my (card | credit card)",
      "why do you need a (card | credit card)", "(will | do) you charge (my card | it | me)", "is there a deposit", "how much is the deposit", "how much will you (charge | hold | block)"] },
    cash_q: { patterns: ["(can | could) i pay (in | with) cash #h:idc_cash", "(can | could) i leave a cash deposit", "i do not have a credit card", "is cash (okay | possible)"] },
    debit_q: { patterns: ["is a debit card (okay | fine | ok) #h:idc_debit", "can i use a debit card", "i only have a debit card", "(can | could) i use my debit card"] },
    sign_where: { patterns: ["where do i sign #h:sg_where", "where (should | do) i sign [it]", "where", "sign where", "here", "(do | should) i sign here", "sign here", "right here"] },
    // "Please sign here." → "Sure."
    sign_ok_ctx: { patterns: ["(sure | okay | ok | all right) #h:sg_sure", "(sure | okay) (no problem | here you go | done)", "(done | all done | there you go | here you go | here you are)"] },
    keys_ctx: { patterns: ["(just | only) one [key] #h:k_one", "two [keys] #h:k_two", "one [key] is (fine | enough)", "{number} [keys]", "one for (me | each of us)",
      "two [keys] one for (my wife | my husband | my friend | my partner | me) #h:k_two", "one for me and one for (my wife | my husband | my friend | my partner | my son | my daughter) #h:k_two", "(we are | there are) {number} [people | of us]"] },
    ask_breakfast: { patterns: ["is breakfast included #h:q_breakfast", "does (it | the room | the price) include breakfast", "do you (serve | have) breakfast", "is there breakfast", "breakfast included", "is breakfast free"] },
    ask_breakfast_time: { patterns: ["what time is breakfast #h:q_breakfast_time", "when is breakfast", "where is breakfast", "where (can | do) i have breakfast", "(when | where) do you serve breakfast", "where is the (breakfast room | dining room | restaurant)"] },
    ask_wifi: { patterns: ["what is the @wifi password #h:q_wifi", "do you have @wifi", "is there @wifi", "is the @wifi free", "(can | could) i (have | get) the @wifi password", "@wifi password",
      "how (do | can) i connect to the @wifi", "what is the password for the @wifi"] },
    ask_checkout: { patterns: ["what time is @checkout #h:q_checkout", "when is @checkout", "when do i have to (check out | leave)", "what time do i have to (check out | leave)"] },
    ask_late: { patterns: [
      "(could | can | may) i (have | get) a late @checkout #h:q_late", "(could | can) i check out (later | late) [tomorrow]", "is [a] late @checkout possible",
      "(could | can) i stay (until | till) {time} #h:q_until", "(could | can) i check out at {time}", "late @checkout [please]",
    ] },
    late_noon: { patterns: ["noon is (fine | great | good | enough | perfect) #h:lt_noon", "(until | at) noon [please]", "noon [please]", "[i will take] noon",
      "then noon", "(twelve | 12) [o clock | pm | p m] is (fine | okay | enough | good)", "(until | at) (twelve | 12)",
      "[no] i do not want to pay [thirty dollars | 30 dollars | extra | more]"] },
    take_it: { patterns: ["[yes] i will take it", "[yes] i will take (the | that) (room | one | king room)", "[yes] (the king room | the first one) [please]", "[yes] sounds good i will take it", "[yes] (that is | it is) (fine | okay | perfect) i will take it",
      "[yes] i would like (it | the room | that room)", "[yes] i want (it | the room)"] },
    late_two: { patterns: ["(until | at) (two | 2) [pm | o clock] [please] #h:lt_two", "(two | 2) [pm | o clock] [please]", "i will take (two | 2 | the later one)", "[yes] thirty dollars is fine",
      "(thirty dollars | 30 dollars) is (fine | okay | ok | good)", "[yes] i will pay [the] (thirty dollars | 30 dollars | extra)", "[okay] (two | 2) p m [then]", "(two | 2) [pm | p m | o clock] is (fine | okay | good)",
      "[yes] (that is | that sounds) (fine | okay | good | great) #h:lt_fine"] },
    ask_included: { patterns: ["what is included [in the price] #h:q_included", "is anything included", "what does the price include"] },
    ask_luggage: { patterns: [
      "(can | could) i leave my (luggage | bags | suitcase | bag) here [after @checkout] #h:q_luggage", "(can | could) you (keep | hold) my (luggage | bags | suitcase)",
      "do you have (luggage storage | a luggage room)", "where can i leave my (luggage | bags | suitcase | bag)",
    ] },
    ask_taxi: { patterns: ["(could | can | would) you call me a (taxi | cab) #h:q_taxi", "(could | can) you (call | order | book) a (taxi | cab) [for me]", "i need a (taxi | cab) [tomorrow]",
      "(could | can) you (call | order | book) [me] a (taxi | cab) [for me] for (tomorrow | tomorrow morning | tonight | the morning)"] },
    taxi_time_ctx: { patterns: ["(in the morning | at noon) #h:tt_noon", "[at] {time} [please] #h:tt_at", "(tomorrow | tomorrow morning) [at {time}] #h:tt_tomorrow", "[for] {time} [tomorrow]",
      "in (an | one | two | half an) (hour | hours)", "in {number} minutes", "(right now | now | as soon as possible | asap)", "[at] (around | about) {time}"] },
    ask_towels: { patterns: ["(could | can | may) i (get | have) (some | a few) @towels #h:q_towels", "(could | can) i (get | have) @towels", "i need (some | more) @towels", "(can | could) you (send | bring) (some | more) towels"] },
    ask_pillow: { patterns: ["(could | can | may) i (get | have) (an extra | another | one more) (pillow | blanket)", "i need (another | an extra) (pillow | blanket)"] },
    ask_elevator: { patterns: ["where is the elevator #h:q_elevator", "where are the elevators", "where is the lift #tip:uk_lift", "is there an elevator"] },
    ask_gym: { patterns: ["(is there | do you have) a (gym | fitness center)", "where is the gym"] },
    ask_pool: { patterns: ["(is there | do you have) a (pool | swimming pool)", "where is the pool"] },
    ask_parking: { patterns: ["do you have parking #h:q_parking", "is there parking", "how much is parking", "where can i park [my car]", "is parking free", "do i (have to | need to) pay for parking"] },
    ask_view: { patterns: [
      "(could | can | may) i (have | get) a room with (a view #h:q_view | an ocean view | a sea view | a view of the (ocean | sea | harbor | water))",
      "is there a room with (a view | an ocean view | a sea view)", "(do you have | have you got) a room with a view",
    ] },
    ask_quiet: { patterns: ["(could | can) i (have | get) a quiet (room | room please)", "i would like a quiet room", "is the room quiet"] },
    ask_twobeds: { patterns: ["(could | can) i (have | get) a room with two beds", "we need two beds", "(could | can) we have two beds", "(do you have | have you got) a room with two beds", "(could | can) i (have | get) two beds"] },
    ask_nonsmoking: { patterns: ["(could | can) i (have | get) a non smoking room", "is (it | the room) non smoking", "can i smoke in the room"] },
    ask_restaurant: { patterns: ["can you recommend a (restaurant | good restaurant | place to eat) [nearby]", "where can i (eat | get dinner) [nearby]", "is there a (good )?restaurant nearby", "is there a restaurant (in the hotel | here)"] },
    ask_roomservice: { patterns: ["do you have room service", "is there room service"] },
    ask_wakeup: { patterns: ["(could | can) i (get | have) a wake up call [at {time}]", "(could | can) you wake me up [at {time}]"] },
    ask_room: { patterns: ["what is my room number", "which room [is it]", "what floor is (it | my room) on", "what floor", "what floor is my room", "which floor [is it]"] },
    ask_checkin_time: { patterns: ["what time is check in", "can i check in now"] },
    done: { patterns: [
      "[no] (that is | that will be) (all | it | everything) [for now] #h:dn_all", "[no] i am (good | fine | okay) #h:dn_good", "nothing else", "no more questions",
      "[no] i think that is (all | it)", "[no] i do not have any [more] questions",
      "[no] i do not need anything [else]", "(that is | that will be) everything",
    ] },
    // Problem visit (twist)
    pr_ac: { patterns: [
      "[the] @ac (is not working | does not work | is broken | stopped working) [in my room] #h:pr_ac", "my @ac (is not working | does not work)",
      "it is (too hot | very hot | really hot) in my room", "(my | the) room is too hot",
    ] },
    pr_hotwater: { patterns: ["there is no hot water [in (the shower | my room | the bathroom)] #h:pr_hotwater", "the (shower | water) is (cold | not hot)", "i do not have hot water",
      "the shower (does not work | is not working | is broken)"] },
    pr_key: { patterns: ["my key [card] (does not work | is not working) #h:pr_key", "i can not (open | get into) my room", "the key [card] (does not work | is not working)",
      "my key [card] (does not open | will not open) (the door | my room | my door)"] },
    pr_noisy: { patterns: ["my room is (very | too | really) noisy #h:pr_noisy", "it is (too | very | really) noisy", "the room is (noisy | loud)", "it is too loud",
      "it is (very | really | so) loud", "i can not sleep [because] (it is | the room is) (too | very | so | really) (noisy | loud)"] },
    pr_wifi: { patterns: ["the @wifi (is not working | does not work) [in my room] #h:pr_wifi", "i can not connect to the @wifi"] },
    pr_tv: { patterns: ["the tv (is not working | does not work)", "my tv (is not working | does not work)", "(the | my) tv is broken"] },
    pr_towels: { patterns: ["there are no towels [in (my room | the bathroom)]", "i need (some | more) towels #h:pr_towels"] },
    // "That's too expensive": noon instead of 2 p.m. (while the $30 late check-out is on the table), or a
    // cheaper room for a walk-in
    too_expensive_ctx: { patterns: ["(that is | it is) (too | a bit too | a little too) expensive [for me] #h:wk_expensive", "[that is | it is] too much [money]", "i can not afford (that | it)",
      "(that is | it is) (a bit | a little | quite | very | really) (expensive | pricey) [for me]", "(that is | it is) (too | a bit too) pricey [for me]", "(that is | it is) too much for me",
      "(that is | it is) (more than | over) my budget", "i can not pay that much", "(that is | it is) out of my budget"] },
    // "Do you have anything cheaper?" (walk-in room, or the late check-out)
    cheaper_ctx: { patterns: [
      "(do you have | have you got | is there) (anything | something | one) cheaper #h:wk_cheaper", "(do you have | have you got | is there) (a | any) cheaper (room | one | option | rooms)",
      "(anything | something | a room) cheaper", "[a | any] cheaper (room | one | option)", "(do you have | is there) (anything | something | a room) less expensive",
      "(can | could) i (get | have) a cheaper (room | one)", "(do you have | is there) a smaller room", "what is your cheapest room",
    ] },
    // A walk-in turns the room down politely
    walk_leave_ctx: { patterns: [
      "i will think about it #h:wk_think", "i (need | have) to think about it", "let me think about it",
      "i will (look | try) (somewhere else | elsewhere)", "i will (try | look for | find) (another | a different | a cheaper) hotel", "i will come back later",
    ] },
    // "There's a problem with my room." → "What's the problem?"
    pr_vague_ctx: { patterns: ["(there is | i have) a problem with (my room | the room)", "something is wrong with (my room | the room)"] },
    // (a bare "i am in {number}" could shrink to "I … to" = "I like to …": the word "room" stays)
    room_no: { patterns: ["[i am in | my room is | this is] room {number}", "(i am | we are) in (room | number) {number}", "(my room | my room number | the room) is {number}"] },
    p_fine: { patterns: ["everything is (great | fine | perfect | good | wonderful) [thanks] #h:pf_fine", "it is (great | fine | perfect | lovely)", "no problems", "the room is (great | lovely | perfect)"] },
    ch_fan: { patterns: ["a fan is fine #h:ch_fan", "a fan [please]", "(i will take | i would like) a fan", "the fan [please]", "(a | the) fan is (okay | ok | good | enough)", "[just] a fan for (tonight | now)"] },
    ch_move: { patterns: ["i would like to change rooms #h:ch_move", "(can | could) i (change | move) rooms", "(a different | another) room [please]", "i want (another | a different) room",
      "(can | could) i (move | change) to (another | a different | a new) room", "a new room", "i (prefer | would prefer) (a different | another | a new) room",
      "[no] i do not want a fan [(i would like | give me | can i have) (a different | another | a new) room]"] },
  },

  lines: {
    greet: [
      t("Good | evening! | Welcome | to | the | Harborview. | Checking in?", "Labas | vakaras! | Sveiki atvykę | į | — | „Harborview“. | Registruojatės?", "Labas vakaras! Sveiki atvykę į „Harborview“. Registruojatės?"),
      t("Hello! | Welcome | to | the | Harborview | Hotel. | How | can | I | help | you?", "Sveiki! | Sveiki atvykę | į | — | „Harborview“ | viešbutį. | Kuo | galiu | aš | padėti | jums?", "Sveiki atvykę į „Harborview“ viešbutį! Kuo galiu padėti?"),
      t("Good | evening! | Checking in?", "Labas | vakaras! | Registruojatės?", "Labas vakaras! Registruojatės?"),
    ],
    ask_help: [t("How | can | I | help | you?", "Kuo | galiu | aš | padėti | jums?", "Kuo galiu padėti?")],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Perfect.", "Puiku.", "Puiku."), t("Great.", "Puiku.", "Puiku.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    thank_you: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Thanks.", "Ačiū.", "Ačiū.")],
    // Name and spelling
    ask_name: [
      t("Great! | What's | the | last name | on the reservation?", "Puiku! | Kokia yra | — | pavardė | rezervacijoje?", "Puiku! Kokia pavardė nurodyta rezervacijoje?"),
      t("Under | what | name?", "— | Kokia | pavarde?", "Kokia pavarde?", { flags: { 0: "“Under”: no separate word; the instrumental pavarde carries it." } }),
      t("Can | I | have | your | last name, | please?", "Ar galiu | aš | gauti | jūsų | pavardę, | prašau?", "Gal galite pasakyti savo pavardę?"),
    ],
    ask_name_walkin: [t("Can | I | have | your | last name, | please?", "Ar galiu | aš | gauti | jūsų | pavardę, | prašau?", "Gal galite pasakyti savo pavardę?")],
    ask_spell: [
      t("Thanks! | Could | you | spell | your | last name?", "Ačiū! | Ar galėtumėte | jūs | pasakyti paraidžiui | savo | pavardę?", "Ačiū! Gal galėtumėte pasakyti pavardę paraidžiui?"),
      t("How | do | you | spell | that?", "Kaip | — | jūs | rašote | tai?", "Kaip tai rašoma?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “spell”)." } }),
    ],
    spelled_ok: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Got it, | thanks.", "Supratau, | ačiū.", "Supratau, ačiū.")],
    // Reservation found
    found_full: [
      t("Perfect, | I | found | it: | a | room | with | a | king | bed | for | three | nights. | Is | that | right?", "Puiku, | aš | radau | ją: | — | kambarys | su | — | didele dvigule | lova | — | trims | naktims. | Ar | tai | teisinga?",
        "Puiku, radau: kambarys su didele dvigule lova trims naktims. Ar teisingai?",
        { flags: { 10: "“for”: no separate word; the dative trims naktims carries it.", 13: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    found_short: [
      t("Perfect, | I | found | your | reservation. | A | room | with | a | king | bed.", "Puiku, | aš | radau | jūsų | rezervaciją. | — | Kambarys | su | — | didele dvigule | lova.", "Puiku, radau jūsų rezervaciją. Kambarys su didele dvigule lova."),
    ],
    ask_nights: [t("How many | nights?", "Kiek | naktų?", "Kiek naktų?")],
    nights_fixed: [t("No | problem, | I'll change | that.", "Jokių | problemų, | pakeisiu | tai.", "Jokių problemų, pataisysiu.")],
    // Walk-in
    walkin_check: [t("Let | me | check. | Yes, | we | have | a | few | rooms | left.", "Leiskite | man | patikrinti. | Taip, | mes | turime | — | kelis | kambarius | likusius.", "Tuoj patikrinsiu. Taip, dar turime kelis laisvus kambarius.")],
    walkin_nights: [t("For | how many | nights?", "— | Kiek | naktų?", "Kiek naktų?", { flags: { 0: "“For”: no separate word; the genitive/duration question kiek naktų carries it." } })],
    walkin_offer: [
      t("A | room | with | a | king | bed | is | $159 | a | night, | plus | tax. | Would | you | like | it?", "— | Kambarys | su | — | didele dvigule | lova | kainuoja | 159 $ | — | už naktį, | plius | mokesčiai. | Ar | jūs | norėtumėte | jo?",
        "Kambarys su didele dvigule lova kainuoja 159 $ už naktį, plius mokesčiai. Ar norėtumėte jo?",
        { say: "A room with a king bed is a hundred and fifty-nine dollars a night, plus tax. Would you like it?", flags: { 6: "“is”: kainuoja (costs) carries the copula here.", 12: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    walkin_twobeds: [
      t("We | also | have | a | room | with | two | queen | beds | for | $179.", "Mes | taip pat | turime | — | kambarį | su | dviem | dvigulėmis | lovomis | už | 179 $.", "Taip pat turime kambarį su dviem dvigulėmis lovomis už 179 $.",
        { say: "We also have a room with two queen beds for a hundred and seventy-nine dollars." }),
    ],
    walkin_sorry: [t("I | understand. | Let me know | if | you | change | your | mind.", "Aš | suprantu. | Praneškite, | jei | jūs | pakeisite | savo | nuomonę.", "Suprantu. Praneškite, jei persigalvosite.")],
    walkin_great: [t("Perfect.", "Puiku.", "Puiku."), t("Wonderful.", "Nuostabu.", "Puiku.")],
    walkin_cheaper: [
      t("We | also | have | a | smaller | room | with | a | queen | bed | for | $129.", "Mes | taip pat | turime | — | mažesnį | kambarį | su | — | dvigule | lova | už | 129 $.", "Taip pat turime mažesnį kambarį su dvigule lova už 129 $.",
        { say: "We also have a smaller room with a queen bed for a hundred and twenty-nine dollars." }),
      t("I | can | offer | you | a | smaller | room | with | a | queen | bed | for | $129.", "Aš | galiu | pasiūlyti | jums | — | mažesnį | kambarį | su | — | dvigule | lova | už | 129 $.", "Galiu pasiūlyti mažesnį kambarį su dvigule lova už 129 $.",
        { say: "I can offer you a smaller room with a queen bed for a hundred and twenty-nine dollars." }),
    ],
    walkin_cheapest: [t("Sorry, | that's | our | cheapest | room.", "Atsiprašau, | tai yra | mūsų | pigiausias | kambarys.", "Atsiprašau, tai mūsų pigiausias kambarys.")],
    // ID, card, signature
    ask_id: [
      t("Can | I | see | your | ID, | please?", "Ar galiu | aš | pamatyti | jūsų | asmens dokumentą, | prašau?", "Ar galiu pamatyti jūsų asmens dokumentą?"),
      t("May | I | see | your | passport?", "Ar galėčiau | aš | pamatyti | jūsų | pasą?", "Ar galėčiau pamatyti jūsų pasą?"),
    ],
    passport_fine: [t("Yes, | a | passport | is fine.", "Taip, | — | pasas | tinka.", "Taip, pasas tinka.")],
    ask_card: [
      t("And | I'll need | a | credit | card | for incidentals.", "Ir | man reikės | — | kredito | kortelės | papildomoms išlaidoms.", "Dar man reikės kredito kortelės papildomoms išlaidoms."),
      t("Could | I | also | have | a | credit | card, | please?", "Ar galėčiau | aš | taip pat | gauti | — | kredito | kortelę, | prašau?", "Ar galėčiau gauti ir kredito kortelę?"),
    ],
    incidentals: [
      t("It's | for | extras, | like | the | minibar.", "Tai yra | — | papildomoms išlaidoms, | pavyzdžiui, | — | mini barui.", "Tai papildomoms išlaidoms, pavyzdžiui, mini barui.",
        { flags: { 1: "“for”: no separate word; the dative papildomoms išlaidoms carries the purpose." } }),
    ],
    hold: [
      t("We | put | a | $50 | hold | on | your | card | per | night.", "Mes | rezervuojame | — | 50 $ | sumą | — | jūsų | kortelėje | už | naktį.", "Jūsų kortelėje rezervuojame po 50 $ už naktį.",
        { say: "We put a fifty-dollar hold on your card per night.", flags: { 5: "“on”: no separate word; the locative kortelėje carries it." } }),
    ],
    hold_back: [
      t("You | get | it | back | at check-out.", "Jūs | atgausite | ją | — | išsiregistruojant.", "Išsiregistruojant suma atblokuojama.",
        { flags: { 3: "Discontinuous “get … back”: the prefix at- of atgausite carries “back”." } }),
    ],
    prepaid: [t("Your | room | is | already | paid.", "Jūsų | kambarys | yra | jau | apmokėtas.", "Jūsų kambarys jau apmokėtas.")],
    cash_deposit: [
      t("For | extras, | we | need | a | card | or | a | $100 | deposit.", "— | Papildomoms išlaidoms | mums | reikia | — | kortelės | arba | — | 100 $ | užstato.", "Papildomoms išlaidoms reikia kortelės arba 100 $ užstato.",
        { say: "For extras, we need a card or a hundred-dollar deposit.", flags: { 0: "“For”: no separate word; the dative papildomoms išlaidoms carries it." } }),
    ],
    debit_ok: [t("Yes, | that's | fine.", "Taip, | tai yra | gerai.", "Taip, tinka.")],
    ask_sign: [
      t("Please | sign | here.", "Prašau | pasirašyti | čia.", "Prašau pasirašyti čia."),
      t("Could | you | sign | here, | please?", "Ar galėtumėte | jūs | pasirašyti | čia, | prašau?", "Gal galėtumėte čia pasirašyti?"),
    ],
    sign_where: [t("Right here, | at the bottom.", "Čia pat, | apačioje.", "Čia pat, apačioje.")],
    ask_keys: [t("How many | keys | would | you | like?", "Kiek | raktų | — | jūs | norėtumėte?", "Kiek raktų norėtumėte?", { flags: { 2: "“would”: no separate word; the conditional ending of norėtumėte carries it." } })],
    // Room
    upgrade: [t("Good | news: | we've upgraded | you | to | a | room | with | an | ocean | view!", "Geros | naujienos: | perkėlėme | jus | į | — | kambarį | su | — | vandenyno | vaizdu!",
      "Geros naujienos: perkėlėme jus į geresnį kambarį – su vaizdu į vandenyną!")],
    room_412: [t("You're | in | room | 412, | on | the | fourth | floor.", "Jūs esate | — | kambaryje | 412, | — | — | ketvirtame | aukšte.", "Jūsų kambarys – 412, ketvirtame aukšte.",
      { say: "You're in room four-twelve, on the fourth floor.", flags: { 1: "“in”: no separate word; the locative kambaryje carries it.", 4: "“on”: no separate word; the locative ketvirtame aukšte carries it." } })],
    room_518: [t("You're | in | room | 518, | on | the | fifth | floor.", "Jūs esate | — | kambaryje | 518, | — | — | penktame | aukšte.", "Jūsų kambarys – 518, penktame aukšte.",
      { say: "You're in room five-eighteen, on the fifth floor.", flags: { 1: "“in”: no separate word; the locative kambaryje carries it.", 4: "“on”: no separate word; the locative penktame aukšte carries it." } })],
    room_207: [t("You're | in | room | 207, | on | the | second | floor.", "Jūs esate | — | kambaryje | 207, | — | — | antrame | aukšte.", "Jūsų kambarys – 207, antrame aukšte.",
      { say: "You're in room two-oh-seven, on the second floor.", flags: { 1: "“in”: no separate word; the locative kambaryje carries it.", 4: "“on”: no separate word; the locative antrame aukšte carries it." } })],
    room_305: [t("You're | in | room | 305, | on | the | third | floor.", "Jūs esate | — | kambaryje | 305, | — | — | trečiame | aukšte.", "Jūsų kambarys – 305, trečiame aukšte.",
      { say: "You're in room three-oh-five, on the third floor.", flags: { 1: "“in”: no separate word; the locative kambaryje carries it.", 4: "“on”: no separate word; the locative trečiame aukšte carries it." } })],
    keys_here: [
      t("Here | are | your | key | cards.", "Štai | — | jūsų | raktų | kortelės.", "Štai jūsų raktų kortelės.", { flags: { 1: "“are”: no copula after štai." } }),
      t("Here's | your | key | card.", "Štai | jūsų | rakto | kortelė.", "Štai jūsų rakto kortelė."),
    ],
    elevators: [t("The | elevators | are | right | over | there.", "— | Liftai | yra | štai | — | ten.", "Liftai – štai ten.", { flags: { 4: "“over” (over there): no separate Lithuanian word; ten carries the direction." } })],
    // Information
    breakfast_incl: [t("Yes, | breakfast | is | included.", "Taip, | pusryčiai | yra | įskaičiuoti.", "Taip, pusryčiai įskaičiuoti.")],
    breakfast_time: [t("It's | from | 6:30 | to | 10, | in | the | Harbor | Room, | on | the | first | floor.", "Tai yra | nuo | 6:30 | iki | 10:00, | — | — | „Harbor“ | salėje, | — | — | pirmame | aukšte.",
      "Pusryčiai – nuo 6.30 iki 10 val. „Harbor“ salėje, pirmame aukšte.",
      { say: "It's from six-thirty to ten, in the Harbor Room, on the first floor.", flags: { 5: "“in”: no separate word; the locative salėje carries it.", 9: "“on”: no separate word; the locative pirmame aukšte carries it." } })],
    breakfast_volunteer: [t("Breakfast | is | included, | from | 6:30 | to | 10.", "Pusryčiai | yra | įskaičiuoti, | nuo | 6:30 | iki | 10:00.", "Pusryčiai įskaičiuoti, nuo 6.30 iki 10 val.",
      { say: "Breakfast is included, from six-thirty to ten." })],
    also_breakfast: [t("Oh, | and | breakfast | is | included, | from | 6:30 | to | 10.", "O, | ir | pusryčiai | yra | įskaičiuoti, | nuo | 6:30 | iki | 10:00.", "O, ir pusryčiai įskaičiuoti, nuo 6.30 iki 10 val.",
      { say: "Oh, and breakfast is included, from six-thirty to ten." })],
    wifi: [t("The | Wi-Fi | is | free. | The | password | is | harborview, | all | lowercase.", "— | „Wi-Fi“ | yra | nemokamas. | — | Slaptažodis | yra | harborview, | viskas | mažosiomis raidėmis.",
      "„Wi-Fi“ nemokamas. Slaptažodis – harborview, viskas mažosiomis raidėmis.",
      { say: "The Wi-Fi is free. The password is harbor view, all lowercase.", spell: "harborview", write: "Wi-Fi: Harborview Guest · password: harborview" })],
    included: [t("Breakfast | and | Wi-Fi | are | included. | Parking | is | $15 | a | night.", "Pusryčiai | ir | „Wi-Fi“ | yra | įskaičiuoti. | Automobilio statymas | kainuoja | 15 $ | — | už naktį.",
      "Pusryčiai ir „Wi-Fi“ įskaičiuoti. Automobilio statymas – 15 $ už naktį.",
      { say: "Breakfast and Wi-Fi are included. Parking is fifteen dollars a night.", flags: { 6: "“is”: kainuoja (costs) carries the copula here." } })],
    checkout_time: [t("Check-out | is | at | 11.", "Išsiregistravimas | yra | — | 11 val.", "Išsiregistruoti reikia iki 11 val.",
      { say: "Check-out is at eleven.", flags: { 2: "“at”: clock times take no preposition in Lithuanian." } })],
    late_free: [t("Sure! | You | can | stay | until | noon | at no charge.", "Žinoma! | Jūs | galite | likti | iki | vidurdienio | nemokamai.", "Žinoma! Galite likti iki vidurdienio nemokamai.")],
    late_offer: [t("I | can | give | you | until | noon | for free, | or | until | 2 | for | $30.", "Aš | galiu | duoti | jums | iki | vidurdienio | nemokamai, | arba | iki | 14 val. | už | 30 $.",
      "Galiu duoti iki vidurdienio nemokamai arba iki 14 val. už 30 $.", { say: "I can give you until noon for free, or until two for thirty dollars." })],
    late_two_q: [t("Until | 2 | is | $30. | Is | that | okay?", "Iki | 14 val. | kainuoja | 30 $. | Ar | tai | tinka?", "Iki 14 val. – 30 $. Ar tinka?",
      { say: "Until two is thirty dollars. Is that okay?", flags: { 2: "“is”: kainuoja (costs) carries the copula here.", 4: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } })],
    late_noon_free: [t("Then | noon, | at no charge.", "Tada | vidurdienį, | nemokamai.", "Tada vidurdienį, nemokamai.")],
    late_noon_ok: [t("Great, | check-out | at | noon | then.", "Puiku, | išsiregistravimas | — | vidurdienį | tada.", "Puiku, tada išsiregistruosite vidurdienį.",
      { flags: { 2: "“at”: no separate word; the accusative of time vidurdienį carries it." } })],
    late_two_ok: [t("No | problem, | check-out | at | 2 | then.", "Jokių | problemų, | išsiregistravimas | — | 14 val. | tada.", "Jokių problemų, tada išsiregistruosite 14 val.",
      { say: "No problem, check-out at two then.", flags: { 3: "“at”: clock times take no preposition in Lithuanian." } })],
    luggage_ok: [t("Of course. | We | can | keep | it | behind | the | desk.", "Žinoma. | Mes | galime | laikyti | jį | už | — | registratūros.", "Žinoma. Galime jį palaikyti už registratūros.")],
    taxi_when: [t("Of course. | What | time | do | you | need | it?", "Žinoma. | Kuriuo | laiku | — | jums | reikia | jo?", "Žinoma. Kuriuo laiku jo reikia?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “need”)." } })],
    taxi_ok: [t("Perfect. | I'll book | it | for you.", "Puiku. | Užsakysiu | jį | jums.", "Puiku. Užsakysiu jį jums.")],
    towels_ok: [t("Of course. | I'll send | some | up | to | your | room.", "Žinoma. | Atsiųsiu | keletą | — | į | jūsų | kambarį.", "Žinoma. Atsiųsiu keletą į jūsų kambarį.",
      { flags: { 3: "“up”: no separate word; atsiųsiu (send to you) carries it." } })],
    pillow_ok: [t("Of course. | I'll send | one | to | your | room.", "Žinoma. | Atsiųsiu | vieną | į | jūsų | kambarį.", "Žinoma. Atsiųsiu vieną į jūsų kambarį.")],
    elevator: [t("Right | over | there, | on the left.", "Štai | — | ten, | kairėje.", "Štai ten, kairėje.", { flags: { 1: "“over” (over there): no separate Lithuanian word; ten carries the direction." } })],
    gym: [t("Yes, | on | the | second | floor. | It's | open | 24 | hours.", "Taip, | — | — | antrame | aukšte. | Jis yra | atidarytas | 24 | valandas.", "Taip, antrame aukšte. Jis veikia visą parą.",
      { say: "Yes, on the second floor. It's open twenty-four hours.", flags: { 1: "“on”: no separate word; the locative antrame aukšte carries it." } })],
    pool: [t("Sorry, | we | don't have | a | pool.", "Atsiprašau, | mes | neturime | — | baseino.", "Atsiprašau, baseino neturime.")],
    parking: [t("Yes, | parking | is | $15 | a | night.", "Taip, | automobilio statymas | kainuoja | 15 $ | — | už naktį.", "Taip, automobilio statymas – 15 $ už naktį.",
      { say: "Yes, parking is fifteen dollars a night.", flags: { 2: "“is”: kainuoja (costs) carries the copula here." } })],
    view_offer: [t("I | have | a | room | with | an | ocean | view | for | $20 | more | per | night. | Would | you | like | it?", "Aš | turiu | — | kambarį | su | — | vandenyno | vaizdu | už | 20 $ | daugiau | už | naktį. | Ar | jūs | norėtumėte | jo?",
      "Turiu kambarį su vaizdu į vandenyną – 20 $ daugiau už naktį. Ar norėtumėte?",
      { say: "I have a room with an ocean view for twenty dollars more per night. Would you like it?", flags: { 13: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } })],
    view_ok: [t("Great, | I've changed | it.", "Puiku, | aš pakeičiau | tai.", "Puiku, pakeičiau.")],
    quiet_ok: [t("Of course. | I'll put | you | on | a | higher | floor.", "Žinoma. | Apgyvendinsiu | jus | — | — | aukštesniame | aukšte.", "Žinoma. Apgyvendinsiu jus aukštesniame aukšte.",
      { flags: { 3: "“on”: no separate word; the locative aukštesniame aukšte carries it." } })],
    twobeds_ok: [t("Sure. | I | can | give | you | a | room | with | two | queen | beds.", "Žinoma. | Aš | galiu | duoti | jums | — | kambarį | su | dviem | dvigulėmis | lovomis.", "Žinoma. Galiu duoti kambarį su dviem dvigulėmis lovomis.")],
    nonsmoking: [t("All | our | rooms | are | non-smoking.", "Visi | mūsų | kambariai | yra | nerūkantiesiems.", "Visi mūsų kambariai – nerūkantiesiems.")],
    restaurant: [t("Lucia's | Trattoria | is | great. | It's | just | two | blocks | away.", "„Lucia's“ | restoranas | yra | puikus. | Jis yra | tik | už dviejų | kvartalų | —.", "„Lucia's“ restoranas puikus – vos už dviejų kvartalų.",
      { flags: { 8: "“away”: no separate word; už + genitive (už dviejų kvartalų) carries the distance." } })],
    roomservice: [t("Yes, | until | 10 | at | night. | The | menu | is | in | your | room.", "Taip, | iki | 10 val. | — | vakaro. | — | Meniu | yra | — | jūsų | kambaryje.", "Taip, iki 10 val. vakaro. Meniu rasite savo kambaryje.",
      { say: "Yes, until ten at night. The menu is in your room.", flags: { 3: "“at”: no separate word; the genitive vakaro carries it.", 8: "“in”: no separate word; the locative kambaryje carries it." } })],
    wakeup: [t("Sure, | I'll set | that | up | for you.", "Žinoma, | nustatysiu | tai | — | jums.", "Žinoma, nustatysiu.", { flags: { 3: "Discontinuous “set … up”: the prefix nu- of nustatysiu carries it." } })],
    room_is: [t("It's | on | your | key | card | envelope.", "Jis yra | ant | jūsų | rakto | kortelės | voko.", "Numeris užrašytas ant rakto kortelės voko.")],
    checkin_now: [t("Check-in | is | from | 3, | but | your | room | is | ready.", "Registracija | yra | nuo | 15 val., | bet | jūsų | kambarys | yra | paruoštas.", "Registruotis galima nuo 15 val., bet jūsų kambarys jau paruoštas.",
      { say: "Check-in is from three, but your room is ready." })],
    ask_any: [
      t("Do | you | have | any | questions?", "Ar | jūs | turite | kokių nors | klausimų?", "Ar turite klausimų?"),
      t("Anything | else | I | can | do | for you?", "Ką nors | dar | aš | galiu | padaryti | jums?", "Ar dar ką nors galiu dėl jūsų padaryti?"),
    ],
    ask_any_else: [t("Anything | else?", "Ką nors | daugiau?", "Dar kas nors?"), t("Can | I | help | with | anything | else?", "Ar galiu | aš | padėti | — | kuo nors | dar?", "Ar dar kuo nors galiu padėti?",
      { flags: { 3: "“with”: no separate word; the instrumental kuo nors carries it." } })],
    enjoy: [
      t("Enjoy | your | stay!", "Mėgaukitės | savo | viešnage!", "Malonios viešnagės!"),
      t("Have | a | wonderful | stay!", "Linkiu | — | nuostabios | viešnagės!", "Nuostabios viešnagės!"),
    ],
    you_welcome: [t("You're welcome! | Enjoy | your | stay!", "Prašom! | Mėgaukitės | savo | viešnage!", "Prašom! Malonios viešnagės!")],
    // Problem visit
    p_greet: [
      t("Hi | again! | How's | everything | with | your | room?", "Sveiki | vėl! | Kaip yra | viskas | su | jūsų | kambariu?", "Sveiki vėl! Ar viskas gerai su kambariu?"),
      t("Hello | again! | Is | everything | okay | with | your | room?", "Sveiki | vėl! | Ar | viskas | gerai | su | jūsų | kambariu?", "Sveiki vėl! Ar viskas gerai su jūsų kambariu?",
        { flags: { 2: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    p_what: [t("What's | the | problem?", "Kokia yra | — | problema?", "Kokia problema?")],
    room_noted: [t("Okay, | thank | you.", "Gerai, | dėkoju | jums.", "Gerai, ačiū.")],
    ac_sorry: [t("Oh, | I'm | so | sorry! | I'll send | someone | from | maintenance | right away.", "O, | aš | labai | atsiprašau! | Atsiųsiu | ką nors | iš | techninės priežiūros | tuoj pat.",
      "O, labai atsiprašau! Tuoj atsiųsiu ką nors iš techninės priežiūros.")],
    fan_or_room: [t("Would | you | like | a | fan | for now, | or | a | different | room?", "Ar | jūs | norėtumėte | — | ventiliatoriaus | kol kas, | ar | — | kito | kambario?", "Ar kol kas norėtumėte ventiliatoriaus, ar kito kambario?",
      { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } })],
    fan_ok: [t("I'll send | a | fan | up | right away.", "Atsiųsiu | — | ventiliatorių | — | tuoj pat.", "Tuoj atsiųsiu ventiliatorių.", { flags: { 3: "“up”: no separate word; atsiųsiu (send to you) carries it." } })],
    fix_tomorrow: [t("And | we'll fix | the | AC | tomorrow | morning.", "Ir | sutaisysime | — | kondicionierių | rytoj | ryte.", "O kondicionierių sutaisysime rytoj ryte.")],
    move_ok: [t("No | problem. | I | can | move | you | to | room | 518.", "Jokių | problemų. | Aš | galiu | perkelti | jus | į | kambarį | 518.", "Jokių problemų. Galiu perkelti jus į 518 kambarį.", { say: "No problem. I can move you to room five-eighteen." })],
    new_key: [t("Here's | your | new | key.", "Štai | jūsų | naujas | raktas.", "Štai jūsų naujas raktas.")],
    hotwater: [t("I'm sorry | about | that. | Maintenance | will | check | it | right away.", "Atsiprašau | dėl | to. | Techninė priežiūra | — | patikrins | tai | tuoj pat.", "Atsiprašau. Techninė priežiūra tuoj pat patikrins.",
      { flags: { 4: "“will”: no separate word; the future ending of patikrins carries it." } })],
    key_fix: [t("Let | me | fix | it | for you. | There | you | go, | it | should | work | now.", "Leiskite | man | sutaisyti | ją | jums. | Štai | jums | —, | ji | turėtų | veikti | dabar.", "Tuoj sutvarkysiu. Prašom, dabar turėtų veikti.",
      { flags: { 7: "“go” (there you go): no Lithuanian word; Štai jums hands it back." } })],
    quiet_offer: [t("I'm sorry. | Would | you | like | a | quieter | room?", "Atsiprašau. | Ar | jūs | norėtumėte | — | tylesnio | kambario?", "Atsiprašau. Ar norėtumėte tylesnio kambario?",
      { flags: { 1: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } })],
    earplugs: [t("Okay. | Here | are | some | earplugs, | just in case.", "Gerai. | Štai | — | — | ausų kamštukai, | dėl viso pikto.", "Gerai. Štai ausų kamštukai, dėl viso pikto.",
      { flags: { 2: "“are”: no copula after štai.", 3: "“some”: no separate word here (plural ausų kamštukai)." } })],
    wifi_fix: [t("Try | reconnecting. | The | password | is | harborview.", "Pabandykite | prisijungti iš naujo. | — | Slaptažodis | yra | harborview.", "Pabandykite prisijungti iš naujo. Slaptažodis – harborview.",
      { say: "Try reconnecting. The password is harbor view.", spell: "harborview", write: "Wi-Fi: Harborview Guest · password: harborview" })],
    tv_fix: [t("I'll send | someone | up | to look | at | it.", "Atsiųsiu | ką nors | — | pažiūrėti | į | jį.", "Atsiųsiu ką nors pažiūrėti.", { flags: { 2: "“up”: no separate word; atsiųsiu (send to you) carries it." } })],
    glad: [t("Glad | to hear | it! | Let me know | if | you | need | anything.", "Smagu | girdėti | tai! | Praneškite, | jei | jums | reikės | ko nors.", "Smagu girdėti! Praneškite, jei ko nors reikės.")],
    sorry_trouble: [t("Again, | I'm sorry | for | the | trouble.", "Dar kartą | atsiprašau | dėl | — | nepatogumų.", "Dar kartą atsiprašau dėl nepatogumų.")],
  },

  domains: {},

  hints: {
    checkin: {
      lt: "Pasakyti, kad turi rezervaciją",
      items: [
        { id: "ci_res", s: t("I | have | a | reservation.", "Aš | turiu | — | rezervaciją.", "Turiu rezervaciją.") },
        { id: "ci_like", s: t("I'd like | to check in, | please.", "Norėčiau | užsiregistruoti, | prašau.", "Norėčiau užsiregistruoti.") },
        { id: "ci_under", s: t("I | have | a | reservation | under | {$surname}.", "Aš | turiu | — | rezervaciją | pavarde | {$surname}.", "Turiu rezervaciją pavarde {$surname}.") },
        { id: "ci_nights", s: t("I | have | a | reservation | for | three | nights.", "Aš | turiu | — | rezervaciją | — | trims | naktims.", "Turiu rezervaciją trims naktims.",
          { flags: { 4: "“for”: no separate word; the dative trims naktims carries it." } }) },
        { id: "ci_walkin", s: t("Do | you | have | any | rooms | available?", "Ar | jūs | turite | kokių nors | kambarių | laisvų?", "Ar turite laisvų kambarių?") },
      ],
    },
    name: {
      lt: "Pasakyti pavardę",
      items: [
        { id: "nm_its", s: t("It's | {$surname}.", "Tai yra | {$surname}.", "Pavardė – {$surname}.") },
        { id: "nm_its", s: t("Under | {$surname}.", "Pavarde | {$surname}.", "Pavarde {$surname}.") },
      ],
    },
    spell: {
      lt: "Pasakyti pavardę paraidžiui",
      items: [
        { id: "sp_its", s: t("It's | {$letters}.", "Tai yra | {$letters}.", "Rašoma taip: {$letters}."), note: "Amerikiečiai dažnai prašo pasakyti pavardę paraidžiui – išmokite angliškų raidžių pavadinimus." },
      ],
    },
    // "Perfect, I found it: … for three nights. Is that right?"
    confirm: {
      lt: "Patvirtinti rezervaciją",
      items: [
        { id: "cf_right", s: t("Yes, | that's | right.", "Taip, | tai yra | teisinga.", "Taip, teisingai.") },
        { id: "nt_fix", s: t("No, | it's | four | nights.", "Ne, | tai yra | keturios | naktys.", "Ne, keturioms naktims.") },
      ],
    },
    // No reservation
    walkin: {
      lt: "Paklausti, ar yra laisvų kambarių",
      items: [
        { id: "ci_walkin", s: t("Do | you | have | any | rooms | available?", "Ar | jūs | turite | kokių nors | kambarių | laisvų?", "Ar turite laisvų kambarių?") },
        { id: "wk_none", s: t("I | don't have | a | reservation.", "Aš | neturiu | — | rezervacijos.", "Neturiu rezervacijos.") },
        { id: "wk_need", s: t("I | need | a | room | for | two | nights.", "Man | reikia | — | kambario | — | dviem | naktims.", "Man reikia kambario dviem naktims.",
          { flags: { 4: "“for”: no separate word; the dative dviem naktims carries it." } }) },
      ],
    },
    // "A room with a king bed is $159 a night … Would you like it?"
    walk_price: {
      lt: "Pasakyti, kad per brangu",
      items: [
        { id: "wk_expensive", s: t("That's | too | expensive.", "Tai yra | per | brangu.", "Tai per brangu.") },
        { id: "wk_cheaper", s: t("Do | you | have | anything | cheaper?", "Ar | jūs | turite | ko nors | pigesnio?", "Ar turite ko nors pigesnio?") },
        { id: "wk_think", s: t("I'll think | about | it.", "Pagalvosiu | apie | tai.", "Dar pagalvosiu.") },
      ],
    },
    nights: {
      lt: "Pasakyti, kiek naktų",
      items: [
        { id: "nt_short", s: t("Three | nights.", "Trims | naktims.", "Trims naktims.") },
        { id: "nt_short", s: t("Just | tonight.", "Tik | šiąnakt.", "Tik šiąnakt.") },
      ],
    },
    idcard: {
      lt: "Paduoti dokumentą ir kortelę",
      items: [
        { id: "idc_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "idc_passport", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "idc_ok", s: t("Is | a | passport | okay?", "Ar | — | pasas | tinka?", "Ar tinka pasas?", { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }) },
        { id: "idc_what", s: t("What | are | incidentals?", "Kas | yra | papildomos išlaidos?", "Kas yra papildomos išlaidos?") },
        { id: "idc_cash", s: t("Can | I | pay | in cash?", "Ar galiu | aš | sumokėti | grynaisiais?", "Ar galiu sumokėti grynaisiais?") },
        { id: "idc_debit", s: t("Is | a | debit | card | okay?", "Ar | — | debetinė | kortelė | tinka?", "Ar tinka debetinė kortelė?", { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }) },
      ],
    },
    // "And I'll need a credit card for incidentals."
    card: {
      lt: "Paduoti kredito kortelę",
      items: [
        { id: "idc_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "idc_card", s: t("Here's | my | card.", "Štai | mano | kortelė.", "Štai mano kortelė.") },
        { id: "idc_what", s: t("What | are | incidentals?", "Kas | yra | papildomos išlaidos?", "Kas yra papildomos išlaidos?") },
      ],
    },
    card_q: {
      lt: "Paklausti apie kortelę",
      items: [
        { id: "idc_what", s: t("What | are | incidentals?", "Kas | yra | papildomos išlaidos?", "Kas yra papildomos išlaidos?") },
        { id: "idc_cash", s: t("Can | I | pay | in cash?", "Ar galiu | aš | sumokėti | grynaisiais?", "Ar galiu sumokėti grynaisiais?") },
        { id: "idc_debit", s: t("Is | a | debit | card | okay?", "Ar | — | debetinė | kortelė | tinka?", "Ar tinka debetinė kortelė?", { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }) },
      ],
    },
    // "Please sign here." (a command: the first reply is the simplest)
    sign: {
      lt: "Pasirašyti",
      items: [
        { id: "sg_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "sg_where", s: t("Where | do | I | sign?", "Kur | — | man | pasirašyti?", "Kur pasirašyti?", { flags: { 1: "Question “do” has no Lithuanian word; man + infinitive carries the question." } }) },
      ],
    },
    keys: {
      lt: "Pasakyti, kiek raktų",
      items: [
        { id: "k_one", s: t("Just | one, | please.", "Tik | vieną, | prašau.", "Tik vieną, prašau.") },
        { id: "k_two", s: t("Two, | please.", "Du, | prašau.", "Du, prašau.") },
      ],
    },
    ask: {
      lt: "Paklausti apie viešbutį",
      items: [
        { id: "q_breakfast", s: t("Is | breakfast | included?", "Ar | pusryčiai | įskaičiuoti?", "Ar pusryčiai įskaičiuoti?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_included", s: t("What's | included?", "Kas yra | įskaičiuota?", "Kas įskaičiuota?") },
        { id: "q_wifi", s: t("What's | the | Wi-Fi | password?", "Koks yra | — | „Wi-Fi“ | slaptažodis?", "Koks „Wi-Fi“ slaptažodis?") },
        { id: "q_checkout", s: t("What | time | is | check-out?", "Kuriuo | laiku | yra | išsiregistravimas?", "Iki kada reikia išsiregistruoti?") },
        { id: "q_late", s: t("Could | I | have | a | late | check-out?", "Ar galėčiau | aš | gauti | — | vėlesnį | išsiregistravimą?", "Ar galėčiau išsiregistruoti vėliau?") },
        { id: "q_breakfast_time", s: t("What | time | is | breakfast?", "Kuriuo | laiku | yra | pusryčiai?", "Kada pusryčiai?") },
        { id: "q_luggage", s: t("Can | I | leave | my | luggage | here | after | check-out?", "Ar galiu | aš | palikti | savo | bagažą | čia | po | išsiregistravimo?", "Ar galiu palikti bagažą čia po išsiregistravimo?") },
        { id: "q_taxi", s: t("Could | you | call | me | a | taxi?", "Ar galėtumėte | jūs | iškviesti | man | — | taksi?", "Ar galėtumėte man iškviesti taksi?") },
        { id: "q_towels", s: t("Could | I | get | some | extra | towels?", "Ar galėčiau | aš | gauti | — | papildomų | rankšluosčių?", "Ar galėčiau gauti papildomų rankšluosčių?",
          { flags: { 3: "Partitive “some”: no separate word; the genitive papildomų rankšluosčių carries it." } }) },
        { id: "q_elevator", s: t("Where's | the | elevator?", "Kur yra | — | liftas?", "Kur liftas?") },
        { id: "q_view", s: t("Could | I | have | a | room | with | a | view?", "Ar galėčiau | aš | gauti | — | kambarį | su | — | vaizdu?", "Ar galėčiau gauti kambarį su vaizdu?") },
        { id: "q_parking", s: t("Do | you | have | parking?", "Ar | jūs | turite | automobilių stovėjimo aikštelę?", "Ar turite automobilių stovėjimo aikštelę?") },
      ],
    },
    late: {
      lt: "Susitarti dėl vėlesnio išsiregistravimo",
      items: [
        { id: "q_late", s: t("Could | I | have | a | late | check-out?", "Ar galėčiau | aš | gauti | — | vėlesnį | išsiregistravimą?", "Ar galėčiau išsiregistruoti vėliau?") },
        { id: "q_until", s: t("Could | I | stay | until | 2?", "Ar galėčiau | aš | pabūti | iki | 14 val.?", "Ar galėčiau pabūti iki 14 val.?", { say: "Could I stay until two?" }) },
      ],
    },
    // "I can give you until noon for free, or until 2 for $30."
    late_choice: {
      lt: "Pasirinkti išsiregistravimo laiką",
      items: [
        { id: "lt_noon", s: t("Noon | is fine, | thanks.", "Vidurdienis | tinka, | ačiū.", "Vidurdienis tinka, ačiū.") },
        { id: "lt_two", s: t("Until | 2, | please.", "Iki | 14 val., | prašau.", "Iki 14 val., prašau.", { say: "Until two, please." }) },
      ],
    },
    // "Until 2 is $30. Is that okay?"
    late_two: {
      lt: "Sutikti arba pasirinkti vidurdienį",
      items: [
        { id: "lt_fine", s: t("Yes, | that's | fine.", "Taip, | tai yra | gerai.", "Taip, tinka.") },
        { id: "lt_noon", s: t("Noon | is fine, | thanks.", "Vidurdienis | tinka, | ačiū.", "Vidurdienis tinka, ačiū.") },
      ],
    },
    // "Of course. What time do you need it?"
    taxi_time: {
      lt: "Pasakyti, kuriuo laiku",
      items: [
        { id: "tt_at", s: t("At | 7, | please.", "— | 7 val., | prašau.", "7 valandą, prašau.", { say: "At seven, please.", flags: { 0: "“At”: no separate word; the time phrase 7 val. (valandą) carries it." } }) },
        { id: "tt_tomorrow", s: t("Tomorrow | at | 8.", "Rytoj | — | 8 val.", "Rytoj 8 valandą.", { say: "Tomorrow at eight.", flags: { 1: "“at”: no separate word; the time phrase 8 val. (valandą) carries it." } }) },
        { id: "tt_noon", s: t("At | noon.", "— | Vidurdienį.", "Vidurdienį.", { flags: { 0: "“At”: no separate word; the accusative of time vidurdienį carries it." } }) },
      ],
    },
    done: {
      lt: "Pasakyti, kad klausimų nebeturi",
      items: [
        { id: "dn_all", s: t("No, | that's | all, | thanks.", "Ne, | tai yra | viskas, | ačiū.", "Ne, tai viskas, ačiū.") },
        { id: "dn_good", s: t("I'm | good, | thanks.", "Man | užtenka, | ačiū.", "Man nieko nereikia, ačiū."), note: "„I'm good“ čia reiškia mandagų „ne, ačiū“." },
      ],
    },
    problem: {
      lt: "Pranešti apie problemą kambaryje",
      items: [
        { id: "pr_ac", s: t("The | air | conditioning | isn't working.", "— | Oro | kondicionierius | neveikia.", "Neveikia oro kondicionierius.") },
        { id: "pr_hotwater", s: t("There's | no | hot | water.", "Nėra | jokio | karšto | vandens.", "Nėra karšto vandens.", { flags: { 1: "“no”: Lithuanian negative concord – the existential is negated (nėra) and “no” becomes jokio." } }) },
        { id: "pr_key", s: t("My | key | card | doesn't work.", "Mano | rakto | kortelė | neveikia.", "Mano rakto kortelė neveikia.") },
        { id: "pr_noisy", s: t("My | room | is | very | noisy.", "Mano | kambarys | yra | labai | triukšmingas.", "Mano kambarys labai triukšmingas.") },
        { id: "pr_wifi", s: t("The | Wi-Fi | isn't working.", "— | „Wi-Fi“ | neveikia.", "Neveikia „Wi-Fi“.") },
        { id: "pr_towels", s: t("I | need | some | towels.", "Man | reikia | — | rankšluosčių.", "Man reikia rankšluosčių.", { flags: { 2: "Partitive “some”: no separate word; the genitive rankšluosčių carries it." } }) },
        { id: "pf_fine", s: t("Everything's | great, | thanks!", "Viskas yra | puiku, | ačiū!", "Viskas puiku, ačiū!") },
      ],
    },
    choice: {
      lt: "Pasirinkti: ventiliatorius ar kitas kambarys",
      items: [
        { id: "ch_fan", s: t("A | fan | is fine.", "— | Ventiliatorius | tinka.", "Ventiliatorius tiks.") },
        { id: "ch_move", s: t("I'd like | to change | rooms.", "Norėčiau | pakeisti | kambarį.", "Norėčiau pakeisti kambarį.") },
      ],
    },
  },

  tips: {
    uk_lift: { key: "uk_lift", lt: "Suprasta! Amerikoje liftas – „elevator“ („lift“ – britiškai).", better: "Where's the elevator?" },
  },

  merges: {
    "checking in": { reason: "lexical_expression", split: "checking → tikrinate + in → į is false; checking in at a hotel = registruojatės.", minimal: "Verb + particle." },
    "to check in": { reason: "grammatical_fusion", split: "to → į is false (the infinitive ending -ti carries it) and check → tikrinti + in → į is false; = užsiregistruoti.", minimal: "Infinitive marker + phrasal verb." },
    "last name": { reason: "lexical_expression", split: "last → paskutinis + name → vardas is false; = pavardė.", minimal: "Two words, one noun." },
    "right here": { reason: "lexical_expression", split: "right → dešinė/teisingai is false; right here = čia pat (the particle follows in Lithuanian).", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking a number = kiek.", minimal: "Two words, one question word." },
    "at no charge": { reason: "lexical_expression", split: "at → prie + no → jokio + charge → mokestis is a calque; = nemokamai.", minimal: "Three words, one adverb." },
    "right away": { reason: "lexical_expression", split: "right → dešinė + away → toli is false; = tuoj pat.", minimal: "Two words." },
    "let me know": { reason: "lexical_expression", split: "let → leiskite + me → man + know → žinoti is a calque; the request = praneškite.", minimal: "Three words, one verb form." },
    "in the meantime": { reason: "lexical_expression", split: "in → į + the → — + meantime → tarpinis laikas is false; = kol kas / tuo tarpu.", minimal: "Three words, one adverbial." },
    "for now": { reason: "lexical_expression", split: "for → už + now → dabar is false; = kol kas.", minimal: "Two words." },
    "i've changed": { reason: "grammatical_fusion", split: "I've → aš turiu + changed is false; the present perfect = the Lithuanian past (pakeičiau).", minimal: "The object stays outside." },
    "just in case": { reason: "lexical_expression", split: "just → tik + in → į + case → atvejis is false; = dėl viso pikto.", minimal: "Three words, one idiom." },
    "we've upgraded": { reason: "grammatical_fusion", split: "We've → mes turime + upgraded is false; the present perfect = the Lithuanian past (perkėlėme – moved you up to a better room).", minimal: "The object stays outside." },
  },

  // -------------------------------------------------------------------------

  // The learner's plan (check-in, or the problem visit): items of the other mode stay hidden.
  mission: [
    { lt: "Pasakyk, kad turi rezervaciją", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind !== "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "res" },
    { lt: "Išsirink kambarį", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "walkin" && !!c.s.nights && !!c.s.roomChosen },
    { lt: "Pasakyk savo pavardę", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.name },
    { lt: "Pasakyk pavardę paraidžiui", optional: true, when: (c) => c.s.mode === "checkin" && !!c.s.askSpell, done: (c) => c.s.mode === "checkin" && !!c.s.askSpell && !!c.s.spelled },
    { lt: "Patvirtink rezervaciją", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind !== "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "res" && !!c.s.confirmed },
    { lt: "Paduok pasą ir kortelę", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.idShown && !!c.s.cardGiven },
    { lt: "Pasirašyk", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.signed },
    { lt: "Sužinok, kas įskaičiuota", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.breakfastSaid },
    { step: "p_report", lt: "Pranešk, kas neveikia", optional: true },
    { lt: "Susitark dėl sprendimo", optional: true, when: (c) => c.s.mode === "problem",
      done: (c) => c.s.mode === "problem" && !!c.s.reported && (!["ac", "noise"].includes(c.s.reported) || !!c.s.fixed) },
  ],

  steps: [
    { id: "arrive", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.kind,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      expects: ["checkin", "walkin"],
      suggest: [{ lt: "Pasakyti, kad turi rezervaciją", hint: "checkin" }, { lt: "Paklausti, ar yra laisvų kambarių", hint: "walkin" }],
      yes: (c) => { c.s.kind = "res"; } },
    { id: "walk_nights", when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => !!c.s.nights,
      ask: (c) => c.say(c.s.walkChecked ? "ask_nights" : "walkin_nights"),
      expects: ["nights_ctx"],
      suggest: [{ lt: "Pasakyti, kiek naktų", hint: "nights" }] },
    { id: "walk_offer", when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => !!c.s.roomChosen,
      ask: (c) => c.say(OFFER_LINE[c.s.offer] ?? "walkin_offer"),
      expects: ["take_it", "ask_twobeds", "ask_breakfast", "ask_included", "too_expensive_ctx", "cheaper_ctx", "walk_leave_ctx"],
      suggest: [{ lt: "Sutikti (arba paklausti apie kitą kambarį)", hint: "g_yesno" }, { lt: "Pasakyti, kad per brangu", hint: "walk_price" }, { lt: "Paklausti, kas įskaičiuota", hint: "ask" }],
      yes: (c) => { takeRoom(c); c.say("walkin_great"); },
      // "No, thanks": first a cheaper room, then a polite goodbye
      no: (c) => {
        if (c.s.offer !== "cheap") { offerCheaper(c); return; }
        c.say("walkin_sorry"); c.end();
      } },
    { id: "name", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.name,
      ask: (c) => c.say(c.s.kind === "walkin" ? "ask_name_walkin" : "ask_name"),
      expects: ["name_ctx"],
      suggest: [{ lt: "Pasakyti savo pavardę", hint: "name" }] },
    { id: "spell", when: (c) => c.s.mode === "checkin" && c.s.askSpell, done: (c) => !!c.s.spelled,
      ask: (c) => c.say("ask_spell"),
      expects: ["letters_ctx"],
      suggest: [{ lt: "Pasakyti pavardę paraidžiui", hint: "spell" }] },
    { id: "found", when: (c) => c.s.mode === "checkin" && c.s.kind === "res", done: (c) => !!c.s.confirmed,
      ask: (c) => {
        if (c.s.nights) { c.s.confirmed = true; c.say("found_short"); askNext(c); return; }
        c.say("found_full");
      },
      expects: ["nights_fix", "nights_ctx"],
      suggest: [{ lt: "Patvirtinti (arba pataisyti naktų skaičių)", hint: "confirm" }, { lt: "Pasakyti, kiek naktų", hint: "nights" }],
      yes: (c) => { c.s.confirmed = true; c.s.nights = 3; ack(c, 0.8, "ack"); },
      no: (c) => { c.say("ask_nights"); c.expect({ id: "nights", expects: ["nights_ctx", "nights_fix"], hints: ["nights"], suggest: [{ lt: "Pasakyti, kiek naktų", hint: "nights" }],
        on: { nights_ctx: (cc, sl, sg) => { hotel.handlers.nights_ctx(cc, sl, sg); }, nights_fix: (cc, sl, sg) => { hotel.handlers.nights_fix(cc, sl, sg); } },
        ask: (cc) => cc.say("ask_nights") }); } },
    { id: "id", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.idShown,
      ask: (c) => c.say("ask_id"),
      expects: ["hand_over", "id_q"],
      suggest: [{ lt: "Paduoti pasą", hint: "idcard" }],
      yes: (c) => { c.s.idShown = true; ack(c, 1, "thank_you"); } },
    { id: "card", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.cardGiven,
      ask: (c) => { if (c.s.kind === "res" && !c.s.prepaidSaid && c.chance(0.3)) { c.s.prepaidSaid = true; c.say("prepaid"); } c.say("ask_card"); },
      expects: ["hand_over", "incidentals_q", "cash_q", "debit_q"],
      suggest: [{ lt: "Paduoti kredito kortelę", hint: "card" }, { lt: "Paklausti apie kortelę", hint: "card_q" }],
      yes: (c) => { c.s.cardGiven = true; ack(c, 1, "thank_you"); } },
    { id: "sign", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.signed,
      ask: (c) => c.say("ask_sign"),
      expects: ["sign_where", "sign_ok_ctx"],
      suggest: [{ lt: "Pasirašyti ir pasakyti „Sure“", hint: "sign" }],
      yes: (c) => { c.s.signed = true; ack(c, 1, "thank_you"); } },
    { id: "keys", when: (c) => c.s.mode === "checkin" && c.s.askKeys, done: (c) => !!c.s.keys,
      ask: (c) => c.say("ask_keys"),
      expects: ["keys_ctx"],
      suggest: [{ lt: "Pasakyti, kiek raktų", hint: "keys" }] },
    { id: "room", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.roomSaid,
      ask: (c) => {
        c.s.roomSaid = true;
        if (c.s.upgradeTwist && c.s.room === "412") { c.twist("upgrade"); c.s.room = "518"; c.say("upgrade"); }
        c.say("room_" + c.s.room);
        c.say("keys_here");
        c.event("give", { item: "key card", room: c.s.room });
        if (c.chance(0.5)) c.say("elevators");
        if (c.s.volunteerBreakfast) { c.s.breakfastSaid = true; c.say("breakfast_volunteer"); }
        if (c.s.volunteerCheckout) { c.s.checkoutSaid = true; c.say("checkout_time"); }
        askNext(c);
      } },
    { id: "p_report", when: (c) => c.s.mode === "problem", done: (c) => !!c.s.reported,
      ask: (c) => c.say(c.s.pGreeted ? "p_what" : "p_greet"),
      expects: ["pr_ac", "pr_hotwater", "pr_key", "pr_noisy", "pr_wifi", "pr_tv", "pr_towels", "p_fine", "room_no", "pr_vague_ctx"],
      suggest: [{ lt: "Pranešti, kas neveikia kambaryje", hint: "problem" }],
      yes: (c) => { c.s.reported = "fine"; c.say("glad"); },
      no: (c) => { c.say("p_what"); c.hold(); } },
    // The fix for the AC or the noise (usually already offered by the report handler; asked again if still open)
    { id: "p_fix", when: (c) => c.s.mode === "problem" && (c.s.reported === "ac" || c.s.reported === "noise"), done: (c) => !!c.s.fixed,
      ask: (c) => {
        if (c.s.reported === "ac") { c.say("fan_or_room"); c.expect(fanOrRoomPending()); }
        else { c.say("quiet_offer"); c.expect(quietPending()); }
      },
      expects: ["ch_fan", "ch_move"],
      suggest: [{ lt: "Pasirinkti ventiliatorių arba kitą kambarį", hint: "choice" }] },
    { id: "anything", done: (c) => !!c.s.noMore,
      ask: (c) => {
        if (c.s.anyAsked) { c.say("ask_any_else"); c.expect(anyElsePending()); return; }
        c.say("ask_any"); c.s.anyAsked = true;
      },
      expects: ["done", "ask_breakfast", "ask_breakfast_time", "ask_wifi", "ask_checkout", "ask_late", "ask_included", "ask_luggage", "ask_taxi", "ask_towels", "ask_view", "ask_parking", "ask_elevator"],
      suggest: [
        { lt: "Paklausti, kas įskaičiuota, apie pusryčius ar „Wi-Fi“", hint: "ask" },
        { lt: "Paprašyti vėlesnio išsiregistravimo", hint: "late" },
        { lt: "Pasakyti, kad daugiau klausimų nėra", hint: "done" },
      ],
      yes: (c) => { c.say("ask_help"); c.hold(); },
      no: (c) => { c.s.noMore = true; } },
  ],

  init: (c) => {
    c.s.mode = c.visits >= 1 && c.chance(0.35) ? "problem" : "checkin";
    c.s.room = "412";
    c.s.askSpell = c.chance(0.85);
    c.s.askKeys = c.chance(0.5);
    c.s.volunteerBreakfast = c.chance(0.4);
    c.s.volunteerCheckout = c.chance(0.4);
    c.s.upgradeTwist = c.visits >= 1 && c.chance(0.25);
  },

  start: (c) => {
    c.s.greeted = true;
    if (c.s.mode === "problem") { c.s.pGreeted = true; c.twist("problem_visit"); c.say("p_greet"); c.hold(); return; }
    c.say("greet");
    c.hold();
  },

  handlers: {
    checkin(c, slots, seg) {
      c.s.kind = c.s.kind ?? "res";
      if (slots.name) { c.s.name = slots.name; }
      const n = nightsFrom(slots, seg);
      if (n) c.s.nights = n;
    },
    walkin(c, slots, seg) {
      c.s.kind = "walkin";
      const n = nightsFrom(slots, seg);
      if (n) c.s.nights = n;
      c.s.walkChecked = true;
      once(c, "walk", "walkin_check");
    },
    nights_ctx(c, slots, seg) {
      const n = nightsFrom(slots, seg) ?? (typeof slots.number === "number" ? slots.number : undefined);
      if (!n) return;
      const changed = c.s.confirmed === undefined && c.s.kind === "res" && n !== 3;
      c.s.nights = n;
      if (c.s.kind === "res") { c.s.confirmed = true; once(c, "nights", changed ? "nights_fixed" : "ack"); }
      else ack(c, 0.6);
    },
    nights_fix(c, slots, seg) {
      const n = nightsFrom(slots, seg) ?? (typeof slots.number === "number" ? slots.number : undefined);
      if (n) { c.s.nights = n; c.s.confirmed = true; once(c, "nights", "nights_fixed"); }
    },
    name_ctx(c, slots, seg) {
      // "Mikalauskas" typed as one word is read by {letters} as a "joined" spelling: it is a name, not a spelling.
      const joined = seg.tags.includes("joined");
      const name = slots.name ?? (slots.letters ? String(slots.letters) : undefined);
      if (!name || /^(under|in|on|for|by)$/i.test(name)) return;
      c.s.name = c.s.name ?? name;
      if (slots.letters && !joined && (slots.name || String(slots.letters).length >= 3)) { c.s.spelled = true; once(c, "sp", "spelled_ok"); }
    },
    letters_ctx(c) {
      // A long spelling may reach us in several segments ("M I" + "K A L …"): they all mean "spelled".
      c.s.name = c.s.name ?? "guest";
      c.s.spelled = true;
      once(c, "sp", "spelled_ok");
    },
    hand_over(c, _slots, seg) {
      if (seg.tags.includes("both")) { c.s.idShown = true; c.s.cardGiven = true; once(c, "ho", "thank_you"); return; }
      if (c.step === "card" || (c.s.idShown && !c.s.cardGiven)) { c.s.cardGiven = true; once(c, "ho", "thank_you"); return; }
      if (!c.s.idShown) { c.s.idShown = true; once(c, "ho", "thank_you"); return; }
      once(c, "ho", "thank_you");
    },
    id_q(c) { c.say("passport_fine"); },
    incidentals_q(c) { c.say("incidentals"); c.say("hold"); c.say("hold_back"); },
    cash_q(c) { if (c.s.kind === "res") c.say("prepaid"); c.say("cash_deposit"); },
    debit_q(c) { c.say("debit_ok"); },
    sign_ok_ctx(c) { if (!c.s.signed) { c.s.signed = true; ack(c, 1, "thank_you"); } },
    sign_where(c) {
      // She shows the line, the learner signs.
      c.say("sign_where");
      c.s.signed = true;
      c.say("thank_you");
    },
    keys_ctx(c, slots, seg) {
      c.s.keys = seg.tags.includes("h:k_two") ? 2 : typeof slots.number === "number" ? slots.number : 1;
      ack(c, 0.7, "ack");
    },
    ask_breakfast(c) { c.s.breakfastSaid = true; c.say("breakfast_incl"); c.say("breakfast_time"); },
    ask_breakfast_time(c) { c.s.breakfastSaid = true; c.say("breakfast_time"); },
    ask_wifi(c) { c.s.wifiSaid = true; c.say("wifi"); },
    ask_checkout(c) { c.s.checkoutSaid = true; c.say("checkout_time"); },
    ask_late(c, slots) {
      // "Could I have a late check-out? Until two?" may arrive as two segments: read the time from the whole utterance.
      const T = turn(c);
      T.lateHandled = true;
      const tm = slots.time as { h: number; m: number } | undefined;
      let h = tm?.h;
      if (h === undefined) {
        const said = c.heard.toLowerCase();
        if (/\b(noon|12)\b/.test(said)) h = 12;
        else if (/\b(one|1)\b/.test(said)) h = 13;
        else if (/\b(two|2)\b/.test(said)) h = 14;
        else if (/\b(three|four|3|4)\b/.test(said)) h = 15;
      }
      if (h !== undefined && h < 7) h += 12;
      if (h === undefined) { c.say("late_offer"); c.expect(lateChoicePending()); return; }
      if (h <= 12) { c.s.late = "noon"; c.say("late_free"); return; }
      c.say("late_two_q");
      c.expect({
        id: "late", expects: ["late_noon", "late_two", "too_expensive_ctx", "cheaper_ctx"], hints: ["late_two"], suggest: [{ lt: "Sutikti (30 $) arba pasirinkti vidurdienį", hint: "late_two" }],
        on: { late_noon: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_ok"); }, late_two: (cc) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); },
          too_expensive_ctx: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); }, cheaper_ctx: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); } },
        yes: (cc) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); },
        no: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); },
        ask: (cc) => cc.say("late_two_q"),
      });
    },
    late_noon(c) { if (turn(c).lateHandled) return; c.s.late = "noon"; once(c, "late", "late_noon_ok"); },
    late_two(c) { if (turn(c).lateHandled) return; c.s.late = "two"; once(c, "late", "late_two_ok"); },
    take_it(c) { if (c.step === "walk_offer" || (c.s.kind === "walkin" && !c.s.roomChosen)) { takeRoom(c); once(c, "take", "walkin_great"); } else ack(c, 1); },
    ask_included(c) { c.s.breakfastSaid = true; c.s.wifiSaid = true; c.say("included"); },
    ask_luggage(c) { c.say("luggage_ok"); },
    ask_taxi(c) {
      c.say("taxi_when");
      c.expect({ id: "taxi_time", expects: ["taxi_time_ctx"], hints: ["taxi_time"], suggest: [{ lt: "Pasakyti, kuriuo laiku reikia taksi", hint: "taxi_time" }],
        on: { taxi_time_ctx: (cc) => { cc.s.taxi = true; once(cc, "taxi", "taxi_ok"); } },
        yes: (cc) => { cc.s.taxi = true; cc.say("taxi_ok"); }, no: (cc) => { cc.say("no_problem"); },
        ask: (cc) => cc.say("taxi_when") });
    },
    taxi_time_ctx(c) { c.s.taxi = true; once(c, "taxi", "taxi_ok"); },
    ask_towels(c) { c.say("towels_ok"); },
    ask_pillow(c) { c.say("pillow_ok"); },
    ask_elevator(c) { c.say("elevator"); },
    ask_gym(c) { c.say("gym"); },
    ask_pool(c) { c.say("pool"); },
    ask_parking(c) { c.say("parking"); },
    ask_view(c) { if (c.s.room === "518") { c.say("room_518"); return; } c.say("view_offer"); c.expect(viewPending()); },
    ask_quiet(c) { c.say("quiet_ok"); },
    ask_twobeds(c) {
      if (c.step === "walk_offer") { c.s.offer = "two"; c.say("walkin_twobeds"); c.hold(); return; }
      c.s.room = "207"; c.say("twobeds_ok"); if (c.s.roomSaid) c.say("room_207");
    },
    ask_nonsmoking(c) { c.say("nonsmoking"); },
    ask_restaurant(c) { c.say("restaurant"); },
    ask_roomservice(c) { c.say("roomservice"); },
    ask_wakeup(c) { c.say("wakeup"); },
    ask_room(c) { c.say(c.s.roomSaid ? "room_" + c.s.room : "room_is"); },
    ask_checkin_time(c) { c.say("checkin_now"); },
    done(c) { c.s.noMore = true; },
    pr_ac(c) { c.s.reported = "ac"; c.s.anyAsked = true; once(c, "pr", "ac_sorry"); c.say("fan_or_room"); c.expect(fanOrRoomPending()); },
    pr_hotwater(c) { c.s.reported = "water"; c.s.anyAsked = true; once(c, "pr", "hotwater"); },
    pr_key(c) { c.s.reported = "key"; c.s.anyAsked = true; once(c, "pr", "key_fix"); },
    pr_noisy(c) { c.s.reported = "noise"; c.s.anyAsked = true; c.say("quiet_offer"); c.expect(quietPending()); },
    pr_wifi(c) { c.s.reported = "wifi"; c.s.anyAsked = true; once(c, "pr", "wifi_fix"); },
    pr_tv(c) { c.s.reported = "tv"; c.s.anyAsked = true; once(c, "pr", "tv_fix"); },
    pr_towels(c) { if (c.s.mode === "problem") c.s.reported = c.s.reported ?? "towels"; c.say("towels_ok"); },
    pr_vague_ctx(c) { c.say("p_what"); c.hold(); },
    too_expensive_ctx(c) {
      if (c.step === "walk_offer" && !c.s.roomChosen) { offerCheaper(c); return; }
      c.s.late = "noon"; once(c, "late", "late_noon_free");
    },
    cheaper_ctx(c, slots, seg) { hotel.handlers.too_expensive_ctx(c, slots, seg); },
    walk_leave_ctx(c) { c.say("walkin_sorry"); c.end(); },
    room_no(c) { c.s.roomNo = true; once(c, "rn", "room_noted"); },
    p_fine(c) { c.s.reported = "fine"; c.say("glad"); },
    ch_fan(c) { if (c.s.reported === "ac" && !c.s.fixed) { c.s.fixed = "fan"; c.say("fan_ok"); } else c.say("no_problem"); },
    ch_move(c) { c.s.fixed = "move"; c.s.room = "518"; c.say("move_ok"); c.say("new_key"); },
  },

  finish: (c) => {
    c.complete();
    if (c.s.mode === "checkin") {
      if (!c.s.breakfastSaid) { c.s.breakfastSaid = true; c.say("also_breakfast"); }
      c.say("enjoy");
      c.remember({ room: c.s.room });
    } else if (c.s.reported && c.s.reported !== "fine") c.say("sorry_trouble");
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", cc.s.mode === "checkin" ? "you_welcome" : "g_welcome"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "enjoy"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    { say: "Hi, I have a reservation.", intent: "checkin" },
    { say: "I'd like to check in, please.", intent: "checkin" },
    { say: "I have a reservation under Tomas Mikalauskas.", intent: "checkin", slots: { name: "Tomas Mikalauskas" } },
    { say: "I have a reservation for three nights.", intent: "checkin", slots: { nights: { number: 3 } } },
    { say: "Do you have any rooms available?", intent: "walkin" },
    { say: "I don't have a reservation.", intent: "walkin", not: ["checkin"] },
    { say: "Mikalauskas.", intent: "name_ctx", step: "name" },
    { say: "It's Mikalauskas.", intent: "name_ctx", step: "name" },
    { say: "Mikalauskas", intent: "none" },
    { say: "M-I-K-A-L-A-U-S-K-A-S.", intent: "letters_ctx", step: "spell" },
    { say: "It's M I K A L A U S K A S.", intent: "letters_ctx", step: "spell" },
    { say: "No, four nights.", intent: "nights_ctx", step: "found", slots: { nights: { number: 4 } } },
    { say: "No, I booked four nights.", intent: "nights_fix", step: "found" },
    { say: "Two nights.", intent: "nights_ctx", step: "walk_nights" },
    { say: "Here's my passport.", intent: "hand_over", step: "id" },
    { say: "Is a passport okay?", intent: "id_q" },
    { say: "What are incidentals?", intent: "incidentals_q" },
    { say: "Can I pay in cash?", intent: "cash_q" },
    { say: "Where do I sign?", intent: "sign_where" },
    { say: "Just one, please.", intent: "keys_ctx", step: "keys" },
    { say: "Is breakfast included?", intent: "ask_breakfast" },
    { say: "What's the Wi-Fi password?", intent: "ask_wifi" },
    { say: "What time is check-out?", intent: "ask_checkout" },
    { say: "Could I have a late check-out?", intent: "ask_late" },
    { say: "Could I stay until two?", intent: "ask_late" },
    { say: "Noon is fine, thanks.", intent: "late_noon" },
    { say: "What's included?", intent: "ask_included" },
    { say: "Can I leave my luggage here after check-out?", intent: "ask_luggage" },
    { say: "Could you call me a taxi?", intent: "ask_taxi" },
    { say: "Could I get some extra towels?", intent: "ask_towels" },
    { say: "Where's the lift?", intent: "ask_elevator" },
    { say: "Could I have a room with a view?", intent: "ask_view" },
    { say: "No, that's all, thanks.", intent: "done", step: "anything" },
    { say: "I'm good, thanks.", intent: "done", step: "anything" },
    { say: "The air conditioning isn't working.", intent: "pr_ac" },
    { say: "There's no hot water.", intent: "pr_hotwater" },
    { say: "My key card doesn't work.", intent: "pr_key" },
    { say: "Everything's great, thanks!", intent: "p_fine" },
    { say: "A fan is fine.", intent: "ch_fan" },
    { say: "I'd like to change rooms.", intent: "ch_move" },
    { say: "The Wi-Fi is working fine.", intent: "none" },
    { say: "purple hotel banana dance", intent: "none" },
    { say: "My cat likes the moon", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s68-hotel.json)
    { say: "Hello, my name is Tomas Mikalauskas, I have a reservation.", intent: "checkin", slots: { name: "Tomas Mikalauskas" } },
    { say: "Reservation for Mikalauskas.", intent: "checkin", slots: { name: "Mikalauskas" } },
    { say: "Yes, I booked through Booking.com.", intent: "checkin" },
    { say: "Is there a room for tonight?", intent: "walkin" },
    { say: "I'd like to book a room.", intent: "walkin" },
    { say: "My surname is Mikalauskas.", intent: "name_ctx", step: "name", slots: { name: "Mikalauskas" } },
    { say: "Family name Mikalauskas.", intent: "name_ctx", step: "name", slots: { name: "Mikalauskas" } },
    { say: "M, I, K, A, L, A, U, S, K, A, S. Mikalauskas.", intent: "letters_ctx", step: "spell" },
    { say: "No, I think it's four.", intent: "nights_fix", step: "found" },
    { say: "Only one night.", intent: "nights_ctx", step: "walk_nights" },
    { say: "Can I show you my driver's license?", intent: "hand_over", step: "id" },
    { say: "Here's my passport and my credit card.", intent: "hand_over" },
    { say: "Why do you need a credit card?", intent: "incidentals_q" },
    { say: "Do I sign here?", intent: "sign_where", step: "sign" },
    { say: "Two keys, one for my wife.", intent: "keys_ctx", step: "keys" },
    { say: "How do I connect to the Wi-Fi?", intent: "ask_wifi" },
    { say: "No, twelve is fine.", intent: "late_noon" },
    { say: "The Wi-Fi doesn't work in my room.", intent: "pr_wifi" },
    { say: "The air con is broken.", intent: "pr_ac" },
    { say: "Can I move to another room?", intent: "ch_move" },
    { say: "There is a problem with my room.", intent: "pr_vague_ctx", step: "p_report" },
    // a walk-in turning the room down
    { say: "No, that's too expensive.", intent: "too_expensive_ctx", step: "walk_offer" },
    { say: "It's a bit pricey for me.", intent: "too_expensive_ctx", step: "walk_offer" },
    { say: "Do you have anything cheaper?", intent: "cheaper_ctx", step: "walk_offer" },
    { say: "Is there a cheaper room?", intent: "cheaper_ctx", step: "walk_offer" },
    { say: "I'll think about it, thanks.", intent: "walk_leave_ctx", step: "walk_offer" },
    { say: "It's not too expensive.", intent: "none", step: "walk_offer" },
    // meaning must not flip
    { say: "I don't want a fan.", intent: "ch_move", not: ["ch_fan"] },
    { say: "No, I don't want to pay thirty dollars.", intent: "late_noon", not: ["late_two"] },
    { say: "I don't need anything else.", intent: "done", step: "anything" },
    { say: "The air conditioning is working fine.", intent: "none" },
  ],

  sims: [
    { name: "happy path: reservation, spelling, questions", turns: ["Hi, I have a reservation.", "Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "Yes.", "Here's my passport.", "Here you go.", "Sure.", "Is breakfast included?", "What's the Wi-Fi password?", "No, that's all, thanks."],
      expect: { complete: true }, auto: HT_AUTO },
    { name: "late check-out, correction and more questions", turns: ["Hi, I have a reservation under Tomas Mikalauskas.", "M I K A L A U S K A S", "No, four nights.", "Here you go. What are incidentals?", "Here's my card.", "Where do I sign?", "Could I have a late check-out? Until two?", "Two, please.", "Can I leave my luggage here after check-out?", "That's all, thanks."],
      expect: { complete: true }, auto: omit(HT_AUTO, ["name", "spell", "found", "card", "sign", "late", "anything"]) },
    { name: "walk-in without a reservation", turns: ["Hi! Do you have any rooms available?", "Two nights.", "Yes, I'll take it.", "Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "Here you go.", "Here's my card.", "Sure.", "What's included?", "Could you call me a taxi?", "Tomorrow at noon.", "No, thanks. That's all."],
      expect: { complete: true }, auto: omit(HT_AUTO, ["walk_nights", "walk_offer", "name", "spell", "id", "card", "sign", "anything", "taxi_time"]) },
    { name: "walk-in: too expensive, a cheaper room", turns: ["Do you have any rooms available?", "Two nights.", "That's too expensive.", "Okay, I'll take it.", "No, thanks. That's all."],
      expect: { complete: true }, auto: omit(HT_AUTO, ["walk_nights", "walk_offer", "anything"]) },
  ],
};

export default hotel;
