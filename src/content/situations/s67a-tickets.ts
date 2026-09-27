// Song 67 "Single or Return?" → American: "One-Way or Round-Trip?"
// Union Station ticket office, agent Walter (Amtrak-style regional line along the coast).
// The learner buys a train ticket (destination, one-way or round-trip, return day, how many,
// coach or business class on the long routes, senior / student discount, card or cash) and
// finds out when and from which track the train leaves (asking, or Walter tells them).
// Twist (visits ≥ 1): "Heads up: the 10:15 is running about twenty minutes late today."
// Closing extra: "Is this seat taken?" is the question to ask on the train.
//
// NEEDS (engine, not changed here): the NLU gives the expected-intent bonus to every segment,
// so one answer can be cut into several segments ("round trip" → "round trip" + …, "medium rare"
// → "medium" + "rare"). Handlers here are idempotent and read the heard text where it matters;
// a single bonus per parse (or a larger per-segment penalty) would make this unnecessary.

import type { Ctx, EntityDef, Handler, Pending, SituationDef, Tip } from "../types";
import type { SlotFn } from "../../convo/grammar";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";
import { numberSlot } from "../../convo/slots";

/** A number of 10 or more that was really said as a number (an age: "I'm 67"; "to"/"too" are not 2). */
const bigNumber: SlotFn = (toks, pos, prefix) => numberSlot(toks, pos, prefix).filter((r) => !r.cost && typeof r.value === "number" && r.value >= 10);

// ---------------------------------------------------------------------------
// Destinations and schedule

interface Dest { fare: number; time: { h: number; m: number }; track: number; dur: string; direct: boolean; long: boolean; arr: string }

export const DESTS: EntityDef[] = [
  ent("seaside", "Seaside", "Seaside", "m", {
    forms: ["sea side", "the seaside", "the beach", "the sea", "the coast", "the shore", "seaside station"], chip: "Seaside (pajūris)",
    attrs: { fare: 1200, time: { h: 10, m: 15 }, track: 2, dur: "dur_seaside", direct: true, long: false, arr: "10:55" } }),
  ent("portland", "Portland", "Portlandas/Portlando/Portlandui/Portlandą/Portlandu/Portlande", "m", {
    forms: ["portland maine"], attrs: { fare: 1900, time: { h: 10, m: 40 }, track: 3, dur: "dur_portland", direct: true, long: false, arr: "11:50" } }),
  ent("boston", "Boston", "Bostonas/Bostono/Bostonui/Bostoną/Bostonu/Bostone", "m", {
    forms: ["south station", "boston south station"], attrs: { fare: 3800, time: { h: 11, m: 5 }, track: 1, dur: "dur_boston", direct: true, long: true, arr: "1:50" } }),
  ent("new_york", "New York", "Niujorkas/Niujorko/Niujorkui/Niujorką/Niujorku/Niujorke", "m", {
    forms: ["new york city", "nyc", "manhattan", "penn station"], chip: "Niujorkas",
    attrs: { fare: 8900, time: { h: 11, m: 5 }, track: 1, dur: "dur_new_york", direct: false, long: true, arr: "5:35" } }),
];

/** Days, only for echoing the return day in Lithuanian. (The grammar uses the built-in {day}.) */
const WEEKDAYS: EntityDef[] = [
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m"),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m"),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m"),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m"),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m"),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m"),
  ent("sunday", "Sunday", "sekmadienis/sekmadienio/sekmadieniui/sekmadienį/sekmadieniu/sekmadienyje", "m"),
  ent("today", "today", "šiandien", "m"),
  ent("tomorrow", "tomorrow", "rytoj", "m"),
];

const dest = (id: string) => DESTS.find((e) => e.id === id)!.attrs as Dest;
const addMin = (t: { h: number; m: number }, min: number) => ({ h: t.h + Math.floor((t.m + min) / 60), m: (t.m + min) % 60 });
const DELAY = 20;
const BUSINESS = 2000; // per ride
const DISCOUNT: Record<string, number> = { senior: 0.1, student: 0.15 };

// ---------------------------------------------------------------------------
// State helpers

const depTime = (c: Ctx) => (c.s.dest ? (c.s.delayTold ? addMin(dest(c.s.dest).time, DELAY) : dest(c.s.dest).time) : undefined);
const count = (c: Ctx) => (c.s.count as number | undefined) ?? 1;

function price(destId: string, trip: string, cls: string | undefined, disc: string | undefined, n: number): number {
  const d = dest(destId);
  const rides = trip === "round" ? 2 : 1;
  const one = (d.fare + (cls === "business" ? BUSINESS : 0)) * rides;
  const off = disc ? Math.round(one * DISCOUNT[disc]) : 0;
  return one * n - off; // the discount is for the learner's own ticket
}
const total = (c: Ctx) => price(c.s.dest, c.s.trip ?? "oneway", c.s.cls, c.s.disc, count(c));

function countOf(tags: string[], num?: number): number | undefined {
  if (typeof num === "number" && num >= 1 && num <= 9) return num;
  for (const [tag, n] of [["n1", 1], ["n2", 2], ["n3", 3], ["n4", 4]] as const) if (tags.includes(tag)) return n;
  return undefined;
}
function tripOf(tags: string[]): "oneway" | "round" | undefined {
  if (tags.includes("round")) return "round";
  if (tags.includes("oneway")) return "oneway";
  return undefined;
}
function clsOf(tags: string[]): "coach" | "business" | undefined {
  if (tags.includes("business")) return "business";
  if (tags.includes("coach")) return "coach";
  return undefined;
}
/** Collect all tags of a segment, including the ones inside slot values. */
function allTags(slots: any, seg: { tags: string[] }): string[] {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
}

const TIPS: Record<string, Tip> = {
  uk_single: { key: "uk_single", lt: "Suprasta! Amerikoje bilietas į vieną pusę – „one-way“.", better: "One-way, please." },
  uk_return: { key: "uk_return", lt: "Suprasta! Amerikoje bilietas į abi puses – „round-trip“ („return“ čia skamba britiškai).", better: "Round-trip, please." },
  uk_platform: { key: "uk_platform", lt: "Suprasta! JAV stotyse sakoma „track“ (kelias), pvz., „Track 2“.", better: "Which track does it leave from?" },
  uk_timetable: { key: "uk_timetable", lt: "Suprasta! Amerikoje tvarkaraštis – „schedule“.", better: "Could I get a schedule?" },
  uk_standard: { key: "uk_standard", lt: "Suprasta! Amerikos traukiniuose ekonominė klasė vadinama „coach“.", better: "Coach, please." },
};

// Automatic answers the simulation uses when Walter asks an optional question.
const AUTO: Record<string, string> = {
  dest: "A ticket to Seaside, please.", count: "Just one, please.", trip: "Round-trip, please.", ret: "On Sunday.",
  travel_day: "Yes, today.", cls: "Coach is fine.", discount: "No, I'm not.", student_id: "Here you go.", pay: "Card, please.",
  ticket: "Thank you!", delay: "Okay, thanks for telling me.", info: "No, that's all, thanks.",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const tickets: SituationDef = {
  id: "s67a-tickets",
  song: 67,
  songTitle: "Single or Return?",
  title: { en: "One-Way or Round-Trip?", lt: "Į vieną pusę ar į abi?" },
  topic: { en: "Buying a train ticket", lt: "Traukinio bilietas" },
  chapter: 6,
  order: 1,
  location: "station",
  npc: "walter",
  goal: "Nusipirk traukinio bilietą į pajūrį ir sužinok, kada ir iš kurio kelio išvyksta traukinys.",
  intro: "Union Station – miesto traukinių stotis. Prie bilietų kasos langelio dirba Walter. Amerikoje bilietas į abi puses vadinamas „round-trip“, o traukiniai išvyksta iš kelio („track“), ne nuo perono.",
  entities: { dest: DESTS, weekday: WEEKDAYS },

  grammar: {
    macros: {
      buy_prefix: [
        "i would like #h:buy_like", "i would like to (buy | get) #h:buy_like", "i need", "i want #blunt", "give me #blunt",
        "can i (get | have | buy) #h:buy_can", "could i (get | have | buy) #h:buy_can", "may i have", "i will take", "i will have", "i will get",
        "let me (get | have)", "we would like", "we need", "can we (get | have | buy)", "could we (get | have | buy)",
        "i am looking for", "i would like to book", "(can | could) you give me",
      ],
      cnt: "(a #n1 | one #n1 | two #n2 | three #n3 | four #n4 | just one #n1 | just a #n1 | one adult #n1 | two adults #n2 | three adults #n3 | one person #n1 | two people #n2 | two persons #n2 | three people #n3 | four people #n4)",
      trip: "(one way #oneway | a one way #oneway | single #oneway #tip:uk_single | a single #oneway #tip:uk_single | round trip #round | a round trip #round | return #round #tip:uk_return | a return #round #tip:uk_return | there and back #round)",
      cls: "(coach #coach | economy #coach | standard #coach #tip:uk_standard | second class #coach #tip:uk_standard | (normal | regular | ordinary | basic) class #coach | business #business | business class #business | first class #business | first #business)",
      tix: "[@cnt] [@trip] [@cls] [train] (ticket | tickets | fare | seat | seats) [@trip] [(in | for) @cls [class]]",
      // "a ticket for the 10:15", "the 11:05 train"
      train_time: "(for | on) the {time} [train]",
      to: "(to | for | going to)",
      when: "(for today #today | today #today | for tomorrow #tomorrow | tomorrow #tomorrow | this morning #today | right now #today | for the next train #today | on the next train #today | now #today | this afternoon #today | this evening #today | tonight #today | in the (morning | afternoon | evening) #today | [for] tomorrow (morning | afternoon | evening | night) #tomorrow | in (an | one) hour #today | in a few minutes #today | soon #today | later today #today)",
      back: "(coming back | returning | back) [on] {day}",
    },
    slots: { bignum: { fn: bigNumber } },
  },

  intents: {
    buy: { patterns: [
      "@buy_prefix @tix [@to {dest}] [@when] [@trip] [@back]",
      "@buy_prefix [@cnt] [@trip] @to {dest} [@when] [please]",
      "@buy_prefix @cnt [@trip] (to | for) {dest}",
      "[just] (a | one) (round trip | return #tip:uk_return) (ticket | tickets) @to {dest} [@when] [@back] #round #h:buy_round",
      "[just] @tix @to {dest} [@when] [@trip] [@back] #h:buy_short",
      "[just] @cnt [@trip] (to | for) {dest} [@when] #h:buy_two",
      "[just] @trip [@tix] @to {dest} #h:buy_oneway",
      "(i am | we are) (going | headed | heading | traveling) to {dest} [@when] #h:buy_going",
      "(i | we) (need | want | would like) to (go | get | travel) to {dest} [@when]",
      // more ways: "Do you have tickets to Boston?", "The train to Seaside, one way", "To New York, one person"
      "@buy_prefix @tix @train_time [@to {dest}] [@when] [@trip]", "[just] @tix @train_time @to {dest} [@trip] #h:buy_short",
      "do you (have | sell) [any] (tickets | a ticket | seats) (to | for) {dest} [@when] [here]",
      "[the] (train | next train) (to | for) {dest} [@trip] [@when]", "[to] {dest} [for] @cnt",
      "(i | we) (need | want | would like) to (go | get | travel) to {dest} [@when] [and] (come back | return | be back) [on] {day} #round",
      "@buy_prefix @tix (for | on) the [next] train (to | for) {dest} [@when]", "[@buy_prefix] [@tix] [to] {dest} and back [@when] #round",
      "[just] @tix (for | on) the [next] train (to | for) {dest} [@when]",
    ] },
    // (the word "ticket" or a verb of going stays: "I want to sleep" / "I need a doctor" are not destinations)
    buy_unknown: { patterns: ["@buy_prefix [@cnt] [@trip] (ticket | tickets) to {w:any}", "(i am | we are) going to {w:any}", "(i | we) (need | want | would like) to (go | travel) to {w:any}"] },
    dest_ctx: { patterns: ["[to] {dest}", "{dest} please", "{dest} [@trip]"] },
    trip_ans: { patterns: [
      "@trip [please | ticket] #h:trip_short",
      "(make it | i will take | i will have | i would like) @trip",
      "(it is | i need) @trip",
      "(i am | we are) not coming back #oneway",
      "(i am | we are) (coming back | returning) [on] {day} #round #h:ret_coming",
      "(i am | we are) coming back #round",
      "[i am | we are] (coming back | returning) [on] {day} #round", "@trip [ticket] [i am | we are] (coming back | returning) [on] {day}",
      "(i | we) (need to | have to | want to | will | would like to) (come back | return | be back) [by train] [on] {day} #round",
      "(both ways | both directions | go and back | to and from | back and forth) #round", "(only | just) (there | one direction) #oneway",
      "@trip (is enough | is fine | is good | will do | is okay)", "(i will need | i need | i will take | i will get) a @trip",
      "[i want to] go there and come back (the same day | on {day} | {day}) #round",
      "@trip [ticket] back [on] {day}", "[@trip] (i am | we are) staying there [for a while] #oneway", "only @trip [ticket]", "@trip [ticket] only",
      // (literal words, one tag: "not round trip, one way" must never read as round-trip)
      "not (one way | a one way | single | a single) [ticket] [but] (round trip | a round trip | return | a return) [ticket] #round",
      "not (round trip | a round trip | return | a return) [ticket] [but] (one way | a one way | single | a single) [ticket] #oneway",
    ] },
    count_ctx: { patterns: [
      "{number} [tickets | please | of us | people] #h:just_one", "(just | only) (one | me | myself) #n1 #h:just_one",
      "there are {number} [of us]", "(for | just for) (me | myself) #n1", "(two #n2 | three #n3) of us",
      "[for | just for] me and my (wife | husband | friend | son | daughter | mother | mom | father | dad | partner | girlfriend | boyfriend | colleague | sister | brother) #n2",
      "{number} (adults | adult | persons | person)", "(we are | there are) {number} [of us]", "one for me and one for my (wife | husband | friend | son | daughter | mother | father | partner) #n2",
    ] },
    ret_ctx: { patterns: [
      "[on] {day} #h:ret_day", "[on] {date}", "(i will | we will) (come back | be back | return) [on] {day}",
      "(the same day | today) #sameday", "(i am | we are) not sure yet #open #h:ret_not_sure", "i (do not | don't) know yet #open",
      "(leave it | it is) open #open", "(in | after) (a week | two days | three days | a few days) #later",
      "[on] {day} (morning | afternoon | evening | night) [(at | around | about) {time}]", "[on] {day} [(at | around | about) {time}]",
      "[on] the {ordinal}", "(in | after) (one week | two weeks | a month | one month | a couple of days | {number} days) #later",
      "(the next day | the day after) #nextday", "not {wrong:day} [but] [on] {day}", "[maybe] {day} or {day2:day} #open",
      "[i am | we are] (coming back | returning | back) [on] {day} [(morning | afternoon | evening | night)]",
    ] },
    travel_ctx: { patterns: ["[for] {day} #h:travel_day", "(i am | we are) (traveling | going | leaving) {day}", "i want to (go | travel | leave) {day}", "@when",
      "(i want to | i will | i am going to | i would like to) (go | travel | leave) (@when | soon)", "not today [but] [on] {day}"] },
    cls_ans: { patterns: [
      "@cls [class] [please] #h:coach", "@cls [class] is fine #h:coach", "(i will | we will) (take | go with) @cls [class]",
      "(i would like | can i get) @cls [class]", "the cheaper one #coach", "the cheapest (one | ticket) #coach",
      "@cls [class] (is okay | is good | is ok | works) [for me]", "the (cheapest | cheaper | cheap) [option | one | ticket] #coach",
      "not (business | first class | business class | first) [class] [but] (coach #coach | economy #coach)", "not (coach | economy) [class] [but] (business #business | first class #business | business class #business)",
    ] },
    discount_ask: { patterns: [
      "(is there | do you have | are there) [a | any] (student #student | senior #senior | child #child | kids #child) (discount | discounts | fare | fares | price) #h:q_student",
      "(do you have | is there) [a | any] (discount | discounts) (for (students #student | seniors #senior | senior citizens #senior | children #child))",
      "(do | can) (i | we) get a discount", "(is there | do you have | are there) [a | any] (discount | discounts)",
      "do (seniors #senior | students #student | kids #child | children #child) get a discount",
    ] },
    discount_claim: { patterns: [
      "i am a (student #student | college student #student) #h:im_student", "i am a (senior #senior | senior citizen #senior) #h:im_senior",
      "(i am | i am over) sixty five #senior", "we are (students #student | seniors #senior)",
      "i am a (university | college | high school | graduate | phd) student #student", "i am (retired #senior | a pensioner #senior | a retiree #senior)",
      "i am {age:bignum} [years old]",
    ] },
    no_discount_ctx: { patterns: ["(i am | we are) not [a student | a senior | students | seniors] #h:no_discount", "neither", "no discount [please | thanks]", "(i am | we are) not",
      "(i am | we are) (just | only) [a | an] [normal | regular] (adult | adults | person | passenger | passengers)", "(i am | we are) [an] (adult | adults)",
      "unfortunately not", "no unfortunately [not]", "[no] neither [one | of them]"] },
    no_id: { patterns: ["[sorry] i (do not | don't) have (it | my id | my student id | my student card | one | an id) [with me] #h:no_id", "i (forgot | left) (it | my id | my student id) [at home]", "i (forgot | left) my (student card | card | university id | id card) [at home | at the hotel]"] },
    show_id: { patterns: ["here is my (student id #h:here_id | id | student card | card)", "(this is | here is) my (id | student id)",
      "here is my (university | college | school) (id | card | student card)", "[i (only | just)] have it on my phone [here]", "here it is on my phone", "it is on my phone"] },
    pay_card: { patterns: [
      "[can | could] (i | we) pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card",
      "card #h:pay_card_short", "(i will | i would like to | i am going to) pay (by | with) card", "do you (take | accept) (cards | credit cards | visa | mastercard)",
      "(can | could) i (use | tap) my (card | phone)", "[a] (credit | debit) card", "(can | could) i pay with (my phone | apple pay | google pay)",
      "[can | could] (i | we) pay (by | with) (visa | mastercard | amex | american express | contactless | phone)", "[can | could] (i | we) pay (by | with) (card | credit card | debit card) here", "do you (take | accept) (apple pay | google pay | contactless | american express | amex)",
      "(i will | i would like to | i am going to) pay (by | with) (credit card | debit card | my phone | phone | visa | contactless | apple pay)",
      "(contactless | tap | visa | mastercard | apple pay | google pay)", "(can | could) i [just] tap [my card | my phone]",
      "[sorry] no cash [(only | just) (card | a card | my card)]", "[sorry] i do not have (cash | any cash) [(can | could) i pay (by | with) card]",
    ] },
    pay_cash: { patterns: ["[can | could] (i | we) pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash",
      "cash (is fine | is okay | is good)", "i (have | will give you) cash", "[sorry] i do not have a (card | credit card | bank card) [(only | just) cash]", "[sorry] no card [(only | just) cash]"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is (the | my) money", "here is {price}", "here"] },
    ask_next: { patterns: [
      "when is the next train [to {dest}] #h:q_next", "what time is the next train [to {dest}]", "(when | what time) does the [next] train [to {dest}] (leave | depart | go)",
      "(when | what time) does it (leave | depart | go) #h:q_time", "(is there | when is there) a train to {dest} [today | this morning | soon]",
      "(when | what time) is (it | my train | the train | our train)", "what time do (i | we) leave",
      "(when | what time) does (my | our | the) train (leave | depart | go)", "(when | what time) (do | does) (i | we | it) (leave | depart | go)",
    ] },
    ask_track: { patterns: [
      "which track does (it | the train) (leave | depart | go) from #h:q_track", "(which | what) track [is (it | the train) on | does it leave from | please | number]",
      "where does (it | the train) (leave | depart | go) from", "where do (i | we) (get | catch | board | take) (it | the train)",
      "(which | what) platform #tip:uk_platform [does (it | the train) leave from | is (it | the train) on | is it | please]", "(which | what) track is it", "which track",
      "from (which | what) track [does (it | the train) (leave | depart | go)]", "from (which | what) platform #tip:uk_platform [does (it | the train) (leave | depart | go)]",
      "where is (the | my | our) train",
    ] },
    ask_change: { patterns: [
      "do (i | we) (have | need) to change [trains] #h:q_change", "do (i | we) (have | need) to (switch | transfer) [trains]",
      "is (it | the train) (a direct train | direct | nonstop | non stop) #h:q_direct", "is (it | this) a direct train #h:q_direct",
      "is there a (change | connection | transfer)", "(do | will) (i | we) change trains",
    ] },
    ask_duration: { patterns: [
      "how long does it take [to get there] #h:q_long", "how long does it take to (get to | go to | reach) {dest}", "how long (is the (trip | ride | journey) | will it take | does the (trip | ride) take)",
      "what time (does it | will it | do we | do i) (get | arrive) [there | in]", "when does it (arrive | get in | get there)", "what time does it get in",
      "(when | what time) does (it | the train) (arrive | get) (in | at | to) {dest}",
    ] },
    ask_price: { patterns: [
      "how much is (it | a ticket | the ticket | that | a round trip | a one way) [ticket] [to {dest}]", "how much (does it | will it) cost",
      "what is the fare [to {dest}]", "how much for (a | one | two) [@trip] (ticket | tickets) [to {dest}]", "how much (is | are) (the | a) (ticket | tickets) to {dest}",
    ] },
    // "What's the difference?": the price of round-trip vs one-way, or of business vs coach (at the class question)
    ask_diff: { patterns: ["what is the (difference | price difference) [in price]", "what is the difference between them", "how much (more | is the difference)"] },
    // "What trains do you have?", "Where can I go from here?"
    ask_dests: { patterns: ["(what | which) (trains | destinations | routes) do you have", "where (can i | can we | do you) go from here", "where do (the | your) trains go",
      "(what | which) (cities | places | destinations) (do you go to | can i go to | do the trains go to)", "where does the train go"] },
    ask_ontime: { patterns: ["is (it | the train) on time #h:q_ontime", "is (it | the train) (late | delayed | running late) [again]", "(is there | are there) any delays",
      "(the train | it) is (late | delayed | running late) again"] },
    ask_cancelled: { patterns: ["is (it | the train) (cancelled | canceled) #h:q_cancelled", "(it is | the train is) not cancelled"] },
    ask_newtime: { patterns: ["what time will it (leave | go) [now] #h:q_when_now", "(so | then) when does it leave [now]", "when will it leave [now]", "what is the new time",
      "[so] it (leaves | will leave | goes) at {time} [now]", "what is the new (departure time | departure | time)", "how late (is it | is the train | will it be)"] },
    ask_wait: { patterns: ["where can (i | we) wait #h:q_wait", "(is there | where is) a (waiting room | waiting area | place to wait)", "where (should | do) (i | we) wait"] },
    ask_coffee: { patterns: ["(is there | where is | where can i get) (a | some) (coffee | coffee shop | cafe | place to eat | snack bar)", "where can i get (coffee | something to eat)"] },
    ask_seat: { patterns: ["do (i | we) need a (seat reservation | reservation | seat number) #h:q_seat", "(do i have | is there) a (seat number | reserved seat)", "(can | where can) (i | we) sit anywhere", "are [the] seats reserved" ] },
    ask_wifi: { patterns: ["is there (wi fi | wifi | internet) on the train", "does the train have (wi fi | wifi)", "(wi fi | wifi) on the train"] },
    ask_food: { patterns: ["is there (a cafe car | a café car | a cafe | a café | food | a snack bar | a dining car) [on the train | on board]", "can (i | we) (buy | get) (food | coffee | snacks) on the train", "does the train have (a cafe car | food)"] },
    ask_schedule: { patterns: ["(can | could | may) (i | we) (have | get) a (schedule | timetable #tip:uk_timetable) [please]", "do you have a (schedule | timetable #tip:uk_timetable)"] },
    ask_restroom: { patterns: ["where is the (restroom | bathroom | mens room | ladies room)", "where is the (toilet | toilets) #tip:uk_platform_toilet", "(is there | do you have) a (restroom | bathroom)"] },
    seat_taken: { patterns: ["is this seat (taken | free | available) #h:seat_taken", "is anyone sitting here #h:seat_anyone", "(can | may) i sit here", "do you mind if i sit here"] },
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for now]", "[no] that is it", "nothing else", "[no] (i am | we are) (good | fine | all set)",
      "i think that is (all | it)", "(that is | it is) all i need",
    ] },
    ok_thanks: { patterns: ["(okay | all right | good | great) thanks for (telling me | letting me know | the heads up)", "(thanks | thank you) for (telling me | letting me know | the heads up) #h:thanks_heads_up", "good to know", "no problem", "that is okay",
      "(thanks | thank you) for the (information | info | update | warning)", "[no problem] i (will | can) wait [here]", "(oh no | oh well | oh okay | never mind | no worries | it is okay | it is fine | that is fine)",
      "[only] {number} minutes [late]"] },
    // the learner repeats the time / track back ("Track 2, okay.", "So, 10:15 from Track 2.")
    echo_info: { patterns: ["[so] track {number} [at {time}]", "[so] [at] {time} (from | on) track {number}", "[so] (at | the) {time} [train]"] },
    change_trip: { patterns: [
      "[actually] (can | could) i (change | make) (it | that) [to | into] @trip", "[actually] make (it | that) @trip", "actually @trip [please]",
      "[actually] (i | we) (need | want | would like) @trip [instead]",
    ] },
    change_dest: { patterns: ["[actually] (can | could) i (change | make) (it | that) (to | for) {dest}", "actually (to | for) {dest} [instead]", "[actually] {dest} instead", "no (to | for) {dest}"] },
    // the number of tickets changes, at any step: "Actually, just one.", "Only one ticket, please.", "Make it two tickets."
    change_count: { patterns: [
      "(just | only) (one | a single) [ticket | adult | person] #n1", "(i | we) (only | just) need (one | a single) [ticket] #n1", "(i | we) need (just | only) (one | a single) [ticket] #n1",
      "[(can | could) (i | you | we)] (make | change) (it | that) [to] {number} [ticket | tickets]", "[just | only] {number} (tickets | ticket) [instead]",
      "(i | we) (only | just) need {number} (tickets | ticket)", "i meant {number} [ticket | tickets]",
      "{number} (tickets | ticket) not {wrong:number}", "(just | only) one not {wrong:number} #n1", "not {wrong:number} [tickets] [but] [just | only] {number} [ticket | tickets]",
    ] },
    not_dest: { patterns: ["not [to] {dest}", "(i | we) (do not | don't) want to go to {dest}", "not {dest} [but] {dest}"] },
  },

  lines: {
    greet: [
      t("Good | morning! | Where | are | you | headed | today?", "Labas | rytas! | Kur | — | jūs | keliaujate | šiandien?", "Labas rytas! Kur šiandien keliaujate?",
        { flags: { 3: "“are … headed”: no separate Lithuanian word for “are”; the present of keliaujate carries it (linked to “headed”)." } }),
      t("Next | in line, | please! | Where to?", "Kitas | eilėje, | prašom! | Kur važiuojate?", "Kitas, prašom! Kur važiuojate?"),
      t("Hi there. | What | can | I | do | for you?", "Sveiki. | Ką | galiu | aš | padaryti | jums?", "Sveiki. Kuo galiu padėti?"),
    ],
    greet_hay: [
      t("Morning! | How | are | you | doing | today?", "Labas rytas! | Kaip | — | jums | sekasi | šiandien?", "Labas rytas! Kaip jums šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
    ],
    ask_dest: [
      t("Where | are | you | headed?", "Kur | — | jūs | keliaujate?", "Kur keliaujate?",
        { flags: { 1: "“are … headed”: no separate Lithuanian word for “are”; the present of keliaujate carries it (linked to “headed”)." } }),
      t("Where | would | you | like | to go?", "Kur | — | jūs | norėtumėte | važiuoti?", "Kur norėtumėte važiuoti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    dest_list: [
      t("We | go | to | Seaside, | Portland, | Boston | and | New York.", "Mes | važiuojame | į | Seaside, | Portlandą, | Bostoną | ir | Niujorką.",
        "Mūsų traukiniai važiuoja į Seaside, Portlandą, Bostoną ir Niujorką."),
    ],
    dest_unknown: [
      t("Sorry, | we | don't go | there.", "Atsiprašau, | mes | nevažiuojame | ten.", "Atsiprašau, ten traukiniai nevažiuoja."),
    ],
    ask_count: [
      t("Just | one | ticket?", "Tik | vienas | bilietas?", "Tik vienas bilietas?"),
    ],
    ask_how_many: [
      t("How many | tickets?", "Kiek | bilietų?", "Kiek bilietų?"),
    ],
    count_one: [
      t("Okay, | just | one | ticket.", "Gerai, | tik | vienas | bilietas.", "Gerai, tik vienas bilietas."),
    ],
    ask_trip: [
      t("One-way | or | round-trip?", "Į vieną pusę | ar | į abi puses?", "Į vieną pusę ar į abi puses?"),
      t("Sure. | One-way | or | round-trip?", "Žinoma. | Į vieną pusę | ar | į abi puses?", "Žinoma. Į vieną pusę ar į abi puses?"),
      t("Will | that | be | one-way | or | round-trip?", "Ar | tai | bus | į vieną pusę | ar | į abi puses?", "Bilietas į vieną pusę ar į abi?",
        { flags: { 0: "Question “Will” = the particle ar; the future sits on bus (linked to “be”)." } }),
    ],
    ask_return: [
      t("And | when | are | you | coming | back?", "O | kada | — | jūs | grįšite | atgal?", "O kada grįšite?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; the future grįšite carries it (linked to “coming”)." } }),
      t("What | day | are | you | coming | back?", "Kurią | dieną | — | jūs | grįšite | atgal?", "Kurią dieną grįšite?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; the future grįšite carries it (linked to “coming”)." } }),
    ],
    ret_ok_on: [t("Okay, | returning | on {X}.", "Gerai, | grįžtate | {X:acc}.", "Gerai, grįžtate {X:acc}.")],
    ret_ok_rel: [t("Okay, | returning | {X}.", "Gerai, | grįžtate | {X:acc}.", "Gerai, grįžtate {X:acc}.")],
    ret_ok_date: [t("Okay, | got it.", "Gerai, | supratau.", "Gerai, supratau.")],
    ret_open: [
      t("No | problem. | You | can | use | the | return | ticket | any | day | this | month.", "Jokių | problemų. | Jūs | galite | panaudoti | — | grįžimo | bilietą | bet kurią | dieną | šį | mėnesį.",
        "Jokių problemų. Grįžimo bilietą galite panaudoti bet kurią šio mėnesio dieną."),
    ],
    ask_travel_day: [
      t("Are | you | traveling | today?", "Ar | jūs | keliaujate | šiandien?", "Ar keliaujate šiandien?",
        { flags: { 0: "Question “Are” = the particle ar; the present of keliaujate carries the progressive (linked to “traveling”)." } }),
    ],
    ask_when_travel: [
      t("When | would | you | like | to travel?", "Kada | — | jūs | norėtumėte | keliauti?", "Kada norėtumėte keliauti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    ask_class: [
      t("Coach | or | business | class? | Business | is | twenty | dollars | more.", "Ekonominė klasė | ar | verslo | klasė? | Verslo | yra | dvidešimt | dolerių | brangesnė.",
        "Ekonominė ar verslo klasė? Verslo klasė dvidešimčia dolerių brangesnė.",
        { say: "Coach or business class? Business is twenty dollars more." }),
      t("Would | you | like | coach | or | business | class?", "Ar | jūs | norėtumėte | ekonominės klasės | ar | verslo | klasės?", "Norėtumėte ekonominės ar verslo klasės?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    business_more: [
      t("Business | is | twenty | dollars | more | each | way.", "Verslo klasė | yra | dvidešimt | dolerių | brangesnė | kiekviena | kryptimi.", "Verslo klasė kiekviena kryptimi dvidešimčia dolerių brangesnė."),
    ],
    ask_discount: [
      t("Are | you | a | senior | or | a | student?", "Ar esate | jūs | — | {m:senjoras|f:senjorė} | ar | — | {m:studentas|f:studentė}?", "Ar esate {m:senjoras|f:senjorė} ar {m:studentas|f:studentė}?"),
    ],
    discount_info: [
      t("Yes! | Seniors | get | ten | percent | off, | and | students | get | fifteen | percent | off.", "Taip! | Senjorai | gauna | dešimt | procentų | nuolaidą, | ir | studentai | gauna | penkiolika | procentų | nuolaidą.",
        "Taip! Senjorams – dešimt procentų nuolaida, studentams – penkiolika procentų."),
    ],
    ask_student_id: [
      t("Great! | Can | I | see | your | student | ID?", "Puiku! | Ar galiu | aš | pamatyti | jūsų | studento | pažymėjimą?", "Puiku! Ar galiu pamatyti jūsų studento pažymėjimą?"),
    ],
    ask_senior_id: [
      t("Sure. | Can | I | see | a | photo | ID?", "Žinoma. | Ar galiu | aš | pamatyti | — | asmens | dokumentą?", "Žinoma. Ar galiu pamatyti asmens dokumentą?"),
    ],
    discount_ok: [
      t("Thanks! | You | get | fifteen | percent | off.", "Ačiū! | Jūs | gaunate | penkiolika | procentų | nuolaidą.", "Ačiū! Jums taikoma penkiolikos procentų nuolaida."),
    ],
    discount_ok_senior: [
      t("Thank | you! | That's | ten | percent | off.", "Dėkoju | jums! | Tai yra | dešimt | procentų | nuolaida.", "Ačiū! Tai dešimties procentų nuolaida."),
    ],
    no_id: [
      t("That's | okay, | but | I | can't give | you | the | discount | without | it.", "Tai yra | gerai, | bet | aš | negaliu suteikti | jums | — | nuolaidos | be | jo.",
        "Nieko tokio, bet be jo nuolaidos suteikti negaliu."),
    ],
    say_total: [
      t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."),
      t("Okay, | that | comes | to | {$price}.", "Gerai, | tai | sudaro | — | {$price}.", "Gerai, iš viso {$price}.",
        { flags: { 3: "“to” (comes to): sudaro takes the sum directly; no separate word." } }),
    ],
    ask_pay: [
      t("How | would | you | like | to pay?", "Kaip | — | jūs | norėtumėte | sumokėti?", "Kaip norėtumėte sumokėti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?"),
    ],
    card_ok: [
      t("Sure, | just | tap | or | insert | your | card.", "Žinoma, | tiesiog | pridėkite | arba | įkiškite | savo | kortelę.", "Žinoma, tiesiog pridėkite arba įkiškite kortelę."),
    ],
    card_later: [
      t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele."),
    ],
    cash_ok: [
      t("Thank | you. | And | here's | your | change.", "Dėkoju | jums. | Ir | štai | jūsų | grąža.", "Ačiū. Štai jūsų grąža."),
    ],
    cash_later: [
      t("Sure, | cash | is | fine.", "Žinoma, | grynieji | yra | gerai.", "Žinoma, galima ir grynaisiais."),
    ],
    ticket_one: [
      t("Here's | your | ticket.", "Štai | jūsų | bilietas.", "Štai jūsų bilietas."),
      t("All right, | here's | your | ticket.", "Gerai, | štai | jūsų | bilietas.", "Gerai, štai jūsų bilietas."),
    ],
    ticket_many: [
      t("Here | are | your | tickets.", "Štai | — | jūsų | bilietai.", "Štai jūsų bilietai.", { flags: { 1: "“are” (here are): no Lithuanian word; štai presents them." } }),
    ],
    train_info: [
      t("Your | train | leaves | at | {$time} | from | Track | {$num}.", "Jūsų | traukinys | išvyksta | — | {$time} | iš | kelio | {$num}.",
        "Jūsų traukinys išvyksta {$time} iš {$num} kelio.", { flags: { 3: "Clock “at”: Lithuanian gives the time without a preposition." } }),
      t("The | train | leaves | at | {$time}, | Track | {$num}.", "— | Traukinys | išvyksta | — | {$time}, | kelias | {$num}.",
        "Traukinys išvyksta {$time}, {$num} kelias.", { flags: { 3: "Clock “at”: Lithuanian gives the time without a preposition." } }),
    ],
    next_train: [
      t("The | next | train | leaves | at | {$time}.", "— | Kitas | traukinys | išvyksta | — | {$time}.", "Kitas traukinys išvyksta {$time}.",
        { flags: { 4: "Clock “at”: Lithuanian gives the time without a preposition." } }),
      t("There's | one | at | {$time}.", "Yra | vienas | — | {$time}.", "Yra traukinys {$time}.",
        { flags: { 2: "Clock “at”: Lithuanian gives the time without a preposition." } }),
    ],
    track_is: [
      t("It | leaves | from | Track | {$num}.", "Jis | išvyksta | iš | kelio | {$num}.", "Jis išvyksta iš {$num} kelio."),
      t("Track | {$num}. | Just | follow | the | signs.", "Kelias | {$num}. | Tiesiog | sekite | — | ženklus.", "{$num} kelias. Tiesiog sekite ženklus."),
    ],
    which_dest_first: [
      t("Sure. | Where | are | you | going?", "Žinoma. | Kur | — | jūs | važiuojate?", "Žinoma. Kur važiuojate?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; the present of važiuojate carries it (linked to “going”)." } }),
    ],
    direct_yes: [
      t("No, | it's | a | direct | train.", "Ne, | tai yra | — | tiesioginis | traukinys.", "Ne, tai tiesioginis traukinys."),
    ],
    change_boston: [
      t("Yes, | you'll change | trains | in Boston.", "Taip, | persėsite | į kitą traukinį | Bostone.", "Taip, Bostone reikės persėsti į kitą traukinį."),
    ],
    dur_seaside: [t("It | takes | about | forty | minutes.", "Kelionė | trunka | maždaug | keturiasdešimt | minučių.", "Kelionė trunka maždaug keturiasdešimt minučių.")],
    dur_portland: [t("It | takes | about | an | hour | and | ten | minutes.", "Kelionė | trunka | maždaug | — | valandą | ir | dešimt | minučių.", "Kelionė trunka maždaug valandą ir dešimt minučių.")],
    dur_boston: [t("It | takes | about | two | hours | and | forty-five | minutes.", "Kelionė | trunka | maždaug | dvi | valandas | ir | keturiasdešimt penkias | minutes.", "Kelionė trunka maždaug dvi valandas ir keturiasdešimt penkias minutes.")],
    dur_new_york: [t("It | takes | about | six | and | a | half | hours.", "Kelionė | trunka | maždaug | šešias | su | — | puse | valandos.", "Kelionė trunka maždaug šešias su puse valandos.")],
    arrives: [
      t("It | gets in | at | {$arr}.", "Jis | atvyksta | — | {$arr}.", "Jis atvyksta {$arr}.", { flags: { 2: "Clock “at”: Lithuanian gives the time without a preposition." } }),
    ],
    price_is: [
      t("A | one-way | ticket | is | {$price}.", "— | Į vieną pusę | bilietas | kainuoja | {$price}.", "Bilietas į vieną pusę kainuoja {$price}."),
    ],
    price_round: [
      t("Round-trip | is | {$price}.", "Į abi puses | kainuoja | {$price}.", "Į abi puses – {$price}."),
    ],
    ontime_yes: [
      t("Yes, | it's | on time | today.", "Taip, | jis yra | laiku | šiandien.", "Taip, šiandien jis vyksta laiku."),
    ],
    delay_news: [
      t("Oh, | and | heads up: | the | {$time} | is running | about | twenty | minutes | late | today.",
        "O, | ir | dėmesio: | — | {$time} traukinys | vėluoja | maždaug | dvidešimt | minučių | — | šiandien.",
        "O, ir dėmesio: {$time} traukinys šiandien vėluoja maždaug dvidešimt minučių.",
        { flags: { 9: "“late”: vėluoja (is running late) already contains it (linked to “is running”)." } }),
    ],
    not_cancelled: [
      t("No, | it's | not canceled, | just | late.", "Ne, | jis yra | neatšauktas, | tik | vėluoja.", "Ne, jis neatšauktas, tik vėluoja."),
    ],
    new_time: [
      t("It | should | leave | at | about | {$time}.", "Jis | turėtų | išvykti | — | apie | {$time}.", "Jis turėtų išvykti apie {$time}.",
        { flags: { 3: "Clock “at”: Lithuanian gives the time without a preposition (apie carries “about”)." } }),
    ],
    waiting_area: [
      t("The | waiting | area | is | right | over | there.", "— | Laukimo | salė | yra | štai | — | ten.", "Laukimo salė – štai ten.",
        { flags: { 5: "“over” (over there): no separate word; ten carries it." } }),
    ],
    coffee_shop: [
      t("There's | a | coffee shop | next to | Track | 1.", "Yra | — | kavinė | šalia | kelio | 1.", "Šalia pirmojo kelio yra kavinė.",
        { say: "There's a coffee shop next to Track one." }),
    ],
    seat_info: [
      t("No, | coach | seats | aren't | reserved. | Just | sit | anywhere.", "Ne, | ekonominės klasės | vietos | nėra | rezervuotos. | Tiesiog | sėskite | bet kur.", "Ne, ekonominės klasės vietos nerezervuojamos. Tiesiog sėskite bet kur."),
    ],
    wifi_yes: [
      t("Yes, | there's | free | Wi-Fi | on board.", "Taip, | yra | nemokamas | „Wi-Fi“ | traukinyje.", "Taip, traukinyje yra nemokamas „Wi-Fi“."),
    ],
    cafe_car: [
      t("Yes, | there's | a | café car | with | snacks | and | coffee.", "Taip, | yra | — | vagonas-kavinė | su | užkandžiais | ir | kava.", "Taip, yra vagonas-kavinė su užkandžiais ir kava."),
    ],
    schedule: [t("Sure, | here's | a | schedule.", "Žinoma, | štai | — | tvarkaraštis.", "Žinoma, štai tvarkaraštis.")],
    restroom: [t("The | restrooms | are | by | Track | 1.", "— | Tualetai | yra | prie | kelio | 1.", "Tualetai – prie pirmojo kelio.", { say: "The restrooms are by Track one." })],
    anything_else: [
      t("Anything | else | I | can | help | you | with?", "Kuo nors | daugiau | aš | galiu | padėti | jums | —?", "Ar dar kuo nors galiu padėti?",
        { flags: { 6: "Stranded “with”: padėti takes the dative jums directly; no separate word." } }),
      t("Anything | else?", "Ką nors | daugiau?", "Dar kas nors?"),
    ],
    just_so_you_know: [
      t("Okay! | Just | so | you | know:", "Gerai! | Tik | kad | jūs | žinotumėte:", "Gerai! Tik kad žinotumėte:"),
    ],
    have_trip: [
      t("Have | a | great | trip!", "Linkiu | — | puikios | kelionės!", "Geros kelionės!"),
      t("Enjoy | your | trip!", "Mėgaukitės | savo | kelione!", "Geros kelionės!"),
      t("Have | a | good | one, | and | enjoy | the | ride!", "Linkiu | — | geros | dienos, | ir | mėgaukitės | — | kelione!", "Geros dienos ir malonios kelionės!",
        { flags: { 3: "“one” (have a good one): a stand-in for “day”; Lithuanian names it (dienos)." } }),
    ],
    seat_joke: [
      t("Ha! | Not | at | my | window! | But | on the train, | that's | the | perfect | question.", "Cha! | Ne | prie | mano | langelio! | Bet | traukinyje, | tai yra | — | puikus | klausimas.",
        "Cha! Ne prie mano langelio! Bet traukinyje – puikus klausimas."),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("Perfect.", "Puiku.", "Puiku.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    changed: [t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų.")],
    change_that: [t("Sure, | let | me | change | that.", "Žinoma, | leiskite | man | pakeisti | tai.", "Žinoma, tuoj pakeisiu.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      for (const d of DESTS) for (const trip of ["oneway", "round"]) for (const cls of [undefined, "business"]) for (const disc of [undefined, "senior", "student"]) for (let n = 1; n <= 4; n++) {
        if (cls && !(d.attrs as Dest).long) continue;
        s.add(price(d.id, trip, cls, disc, n));
      }
      for (const d of DESTS) { s.add((d.attrs as Dest).fare); s.add((d.attrs as Dest).fare * 2); }
      return [...s].sort((a, b) => a - b);
    },
    time: () => {
      const out: { h: number; m: number }[] = [];
      const seen = new Set<string>();
      for (const d of DESTS) for (const t0 of [(d.attrs as Dest).time, addMin((d.attrs as Dest).time, DELAY)]) {
        const k = `${t0.h}:${t0.m}`; if (!seen.has(k)) { seen.add(k); out.push(t0); }
      }
      return out;
    },
    num: () => [1, 2, 3],
    arr: () => DESTS.map((d) => arrValue((d.attrs as Dest).arr)),
  },

  hints: {
    buy: {
      lt: "Nusipirkti bilietą", slot: "dest", examples: ["seaside", "boston", "portland", "new_york"],
      items: [
        { id: "buy_short", s: t("A | ticket | to | {X}, | please.", "— | Bilietą | į | {X:acc}, | prašau.", "Bilietą į {X:acc}, prašau.") },
        { id: "buy_like", s: t("I'd like | a | ticket | to | {X}, | please.", "Norėčiau | — | bilieto | į | {X:acc}, | prašau.", "Norėčiau bilieto į {X:acc}.") },
        { id: "buy_round", s: t("A | round-trip | ticket | to | {X}, | please.", "— | Į abi puses | bilietą | į | {X:acc}, | prašau.", "Bilietą į {X:acc} ir atgal, prašau.") },
        { id: "buy_oneway", s: t("One-way | to | {X}, | please.", "Į vieną pusę | į | {X:acc}, | prašau.", "Į {X:acc} į vieną pusę, prašau.") },
        { id: "buy_can", s: t("Can | I | get | a | ticket | to | {X}?", "Ar galiu | aš | gauti | — | bilietą | į | {X:acc}?", "Ar galiu gauti bilietą į {X:acc}?") },
        { id: "buy_two", s: t("Two | to | {X}, | please.", "Du | į | {X:acc}, | prašau.", "Du bilietus į {X:acc}, prašau."), note: "Trumpai: „Two to Boston“ – du bilietai į Bostoną." },
        { id: "buy_going", s: t("I'm going | to | {X}.", "Važiuoju | į | {X:acc}.", "Važiuoju į {X:acc}.") },
      ],
    },
    trip: {
      lt: "Į vieną pusę ar į abi",
      items: [
        { id: "trip_short", s: t("Round-trip, | please.", "Į abi puses, | prašau.", "Į abi puses, prašau."), note: "„Round-trip“ – į abi puses, „one-way“ – į vieną pusę." },
        { id: "trip_short", s: t("One-way, | please.", "Į vieną pusę, | prašau.", "Į vieną pusę, prašau.") },
        { id: "ret_coming", s: t("I'm coming | back | on Sunday.", "Grįšiu | atgal | sekmadienį.", "Grįšiu sekmadienį.") },
      ],
    },
    ret: {
      lt: "Pasakyti, kada grįši",
      items: [
        { id: "ret_day", s: t("On Sunday.", "Sekmadienį.", "Sekmadienį.") },
        { id: "ret_coming", s: t("I'm coming | back | on Friday.", "Grįšiu | atgal | penktadienį.", "Grįšiu penktadienį.") },
        { id: "ret_day", s: t("Tomorrow | evening.", "Rytoj | vakare.", "Rytoj vakare.") },
        { id: "ret_not_sure", s: t("I'm | not sure | yet.", "Aš | nesu {m:tikras|f:tikra} | dar.", "Dar nesu {m:tikras|f:tikra}.",
          { flags: { 0: "“I'm … not sure”: the copula sits in nesu (linked to “not sure”); no separate word here." } }) },
      ],
    },
    count: {
      lt: "Pasakyti, kiek bilietų",
      items: [
        { id: "just_one", s: t("Just | one, | please.", "Tik | vieną, | prašau.", "Tik vieną, prašau.") },
        { id: "just_one", s: t("Two, | please.", "Du, | prašau.", "Du, prašau.") },
      ],
    },
    cls: {
      lt: "Pasirinkti klasę",
      items: [
        { id: "coach", s: t("Coach | is fine.", "Ekonominė klasė | tinka.", "Tinka ekonominė klasė."), note: "„Coach“ – ekonominė klasė Amerikos traukiniuose." },
        { id: "coach", s: t("Business | class, | please.", "Verslo | klasę, | prašau.", "Verslo klasę, prašau.") },
      ],
    },
    discount_ans: {
      lt: "Atsakyti apie nuolaidą",
      items: [
        { id: "im_student", s: t("I'm | a | student.", "Aš esu | — | {m:studentas|f:studentė}.", "Esu {m:studentas|f:studentė}.") },
        { id: "no_discount", s: t("No, | I'm not.", "Ne, | nesu.", "Ne, nesu.") },
        { id: "im_senior", s: t("I'm | a | senior.", "Aš esu | — | {m:senjoras|f:senjorė}.", "Esu {m:senjoras|f:senjorė}."), note: "„Senior“ – 65 metų ir vyresnis keleivis." },
      ],
    },
    show_id: {
      lt: "Parodyti pažymėjimą",
      items: [
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "here_id", s: t("Here's | my | student | ID.", "Štai | mano | studento | pažymėjimas.", "Štai mano studento pažymėjimas.") },
        { id: "no_id", s: t("Sorry, | I | don't have | it | with | me.", "Atsiprašau, | aš | neturiu | jo | su | savimi.", "Atsiprašau, neturiu jo su savimi.") },
      ],
    },
    travel: {
      lt: "Pasakyti, kada keliauji",
      items: [
        { id: "travel_day", s: t("Yes, | today.", "Taip, | šiandien.", "Taip, šiandien.") },
        { id: "travel_day", s: t("No, | tomorrow.", "Ne, | rytoj.", "Ne, rytoj.") },
      ],
    },
    discount: {
      lt: "Paklausti apie nuolaidą",
      items: [
        { id: "q_student", s: t("Is | there | a | student | discount?", "Ar yra | — | — | studentų | nuolaida?", "Ar yra nuolaida studentams?",
          { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "q_student", s: t("Do | you | have | a | senior | discount?", "Ar | jūs | turite | — | senjorų | nuolaidą?", "Ar turite nuolaidą senjorams?",
          { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "im_student", s: t("I'm | a | student.", "Aš esu | — | {m:studentas|f:studentė}.", "Esu {m:studentas|f:studentė}.") },
        { id: "here_id", s: t("Here's | my | student | ID.", "Štai | mano | studento | pažymėjimas.", "Štai mano studento pažymėjimas.") },
      ],
    },
    next_train: {
      lt: "Paklausti, kada kitas traukinys", slot: "dest", examples: ["seaside", "boston", "portland", "new_york"],
      items: [
        { id: "q_next", s: t("When's | the | next | train | to | {X}?", "Kada yra | — | kitas | traukinys | į | {X:acc}?", "Kada kitas traukinys į {X:acc}?") },
      ],
    },
    info: {
      lt: "Sužinoti apie traukinį",
      items: [
        { id: "q_time", s: t("What time | does | it | leave?", "Kelintą valandą | — | jis | išvyksta?", "Kada jis išvyksta?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “leave”)." } }) },
        { id: "q_track", s: t("Which | track | does | it | leave | from?", "Iš kurio | kelio | — | jis | išvyksta | —?", "Iš kurio kelio jis išvyksta?",
          { flags: { 0: "Stranded “from” (… leave from?): Lithuanian puts the preposition iš before the question word, so it is glossed here.", 2: "Question “does” has no Lithuanian word (linked to “leave”).", 5: "“from”: carried by iš at the front (linked to “Which”)." } }) },
        { id: "q_next", s: t("When's | the | next | train?", "Kada yra | — | kitas | traukinys?", "Kada kitas traukinys?") },
        { id: "q_change", s: t("Do | I | need | to change?", "Ar | man | reikia | persėsti?", "Ar reikės persėsti?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "q_direct", s: t("Is | it | a | direct | train?", "Ar | tai | — | tiesioginis | traukinys?", "Ar tai tiesioginis traukinys?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
        { id: "q_long", s: t("How long | does | it | take?", "Kiek laiko | — | tai | trunka?", "Kiek laiko trunka kelionė?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “take”)." } }) },
        { id: "q_ontime", s: t("Is | the | train | on time?", "Ar | — | traukinys | laiku?", "Ar traukinys vyksta laiku?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
        { id: "q_seat", s: t("Do | I | need | a | seat | reservation?", "Ar | man | reikia | — | vietos | rezervacijos?", "Ar reikia rezervuoti vietą?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    delay: {
      lt: "Paklausti apie vėlavimą",
      items: [
        { id: "q_when_now", s: t("What time | will | it | leave?", "Kelintą valandą | — | jis | išvyks?", "Kada jis išvyks?", { flags: { 1: "“will”: the future ending of išvyks carries it." } }) },
        { id: "q_wait", s: t("Where | can | I | wait?", "Kur | galiu | aš | palaukti?", "Kur galiu palaukti?") },
        { id: "thanks_heads_up", s: t("Thanks | for | letting me know.", "Ačiū | kad | pranešėte.", "Ačiū, kad pranešėte.") },
        { id: "q_cancelled", s: t("Is | it | canceled?", "Ar | jis | atšauktas?", "Ar jis atšauktas?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
      ],
    },
    on_train: {
      lt: "Paklausti, ar vieta traukinyje laisva",
      items: [
        { id: "seat_taken", s: t("Is | this | seat | taken?", "Ar | ši | vieta | užimta?", "Ar ši vieta užimta?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
        { id: "seat_anyone", s: t("Is | anyone | sitting | here?", "Ar | kas nors | sėdi | čia?", "Ar kas nors čia sėdi?",
          { flags: { 0: "Question “Is” = the particle ar; the present of sėdi carries the progressive (linked to “sitting”)." } }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "where to": { reason: "lexical_expression", split: "where → kur + to → į leaves a bare preposition; the ellipsis of “where are you going to” = kur važiuojate.", minimal: "Two words." },
    "new york": { reason: "lexical_expression", split: "A city name: new → naujas + york names no place; = Niujorkas.", minimal: "Two words, one name." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking for a number = kiek.", minimal: "Two words, both needed." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgas is false; asking about duration = kiek laiko.", minimal: "Two words, both needed." },
    "what time": { reason: "lexical_expression", split: "what → kas + time → laikas is false; asking for the clock time = kelintą valandą.", minimal: "Two words." },
    "heads up": { reason: "lexical_expression", split: "heads → galvos + up → aukštyn is false; a warning = dėmesio.", minimal: "Two words." },
    "not canceled": { reason: "grammatical_fusion", split: "not → ne + canceled → atšauktas: Lithuanian writes the negated participle as one word (neatšauktas).", minimal: "Two words (C-NEG)." },
    "not sure": { reason: "grammatical_fusion", split: "not → ne + sure → tikras: Lithuanian negates the copula (nesu tikras), which also carries “am”.", minimal: "Two words (C-NEG)." },
    "gets in": { reason: "lexical_expression", split: "gets → gauna + in → į is false; a train gets in = atvyksta.", minimal: "Two words (C-PHR)." },
    "all right": { reason: "lexical_expression", split: "all → visi + right → teisingas is false; agreement / acknowledgement = gerai.", minimal: "Two words (C-LEX)." },
    "coffee shop": { reason: "lexical_expression", split: "coffee → kava + shop → parduotuvė names a shop that sells coffee, not a café; = kavinė.", minimal: "Two words, one noun." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; position beside = šalia.", minimal: "Two words (C-LEX)." },
    "café car": { reason: "lexical_expression", split: "café → kavinė + car → automobilis is false; the train car with food = vagonas-kavinė.", minimal: "Two words, one noun." },
    "letting me know": { reason: "lexical_expression", split: "letting → leidžiant, me → man, know → žinoti is a calque; = pranešėte.", minimal: "Three words form the phrase." },
    "i'm not": { reason: "grammatical_fusion", split: "I'm → aš esu + not → ne: Lithuanian negates the copula as one word (nesu).", minimal: "Two words (C-NEG)." },
    "in line": { reason: "grammatical_fusion", split: "in → į + line → eilė: the locative eilėje carries “in”.", minimal: "Two words (C-CASE)." },
  },

  mission: [
    { step: "dest", lt: "Pasakyk, kur važiuoji" },
    { step: "trip", lt: "Pasirink: į vieną pusę ar į abi" },
    { step: "ret", lt: "Pasakyk, kada grįši", optional: true },
    { step: "pay", lt: "Susimokėk už bilietą" },
    { lt: "Sužinok išvykimo laiką", done: (c) => !!c.s.knowTime },
    { lt: "Sužinok kelio numerį", done: (c) => !!c.s.knowTrack },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "student_id", when: (c) => !!c.s.discPending && c.s.disc === undefined, done: (c) => c.s.disc !== undefined,
      ask: (c) => c.say(c.s.discPending === "senior" ? "ask_senior_id" : "ask_student_id"),
      expects: ["show_id", "here_you_go", "no_id"],
      suggest: [{ lt: "Parodyti pažymėjimą", hint: "show_id" }],
      yes: (c) => { applyDiscount(c); },
      no: (c) => { c.s.disc = ""; c.s.discPending = undefined; c.say("no_id"); } },
    { id: "discount", when: (c) => (!!c.s.trip || !!c.s.discAsked) && c.s.askDiscount && c.s.disc === undefined && !c.s.discPending && !c.s.paid, done: (c) => c.s.disc !== undefined,
      ask: (c) => c.say("ask_discount"), expects: ["discount_claim", "no_discount_ctx"],
      suggest: [{ lt: "Pasakyti, ar esi studentas ar senjoras", hint: "discount_ans" }],
      no: (c) => { c.s.disc = ""; } },
    { id: "dest", done: (c) => !!c.s.dest,
      ask: (c) => {
        if (!c.s.greeted) {
          c.s.greeted = true;
          if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
          c.say("greet");
          return;
        }
        c.say("ask_dest");
      },
      expects: ["buy", "dest_ctx", "ask_next"],
      suggest: [
        { lt: "Paprašyti bilieto į norimą miestą", hint: "buy", options: "dest" },
        { lt: "Paklausti, kada kitas traukinys", hint: "next_train" },
      ],
      help: (c) => { c.say("dest_list"); } },
    { id: "count", when: (c) => !!c.s.dest && c.s.askCount && c.s.count === undefined, done: (c) => c.s.count !== undefined,
      ask: (c) => { if (c.s.countOpen) c.say("ask_how_many"); else c.say("ask_count"); },
      expects: ["count_ctx"],
      suggest: [{ lt: "Pasakyti, kiek bilietų", hint: "count" }],
      yes: (c) => { c.s.count = 1; },
      no: (c) => { c.s.countOpen = true; } },
    { id: "trip", when: (c) => !!c.s.dest, done: (c) => !!c.s.trip,
      ask: (c) => c.say("ask_trip"), expects: ["trip_ans", "buy"],
      suggest: [{ lt: "Pasirinkti: į vieną pusę ar į abi", hint: "trip" }] },
    { id: "ret", when: (c) => c.s.trip === "round", done: (c) => c.s.ret !== undefined,
      ask: (c) => c.say("ask_return"), expects: ["ret_ctx"],
      suggest: [{ lt: "Pasakyti, kada grįši", hint: "ret" }] },
    { id: "travel_day", when: (c) => !!c.s.trip && c.s.askDay && c.s.travel === undefined, done: (c) => c.s.travel !== undefined,
      ask: (c) => c.say(c.s.travelOpen ? "ask_when_travel" : "ask_travel_day"), expects: ["travel_ctx"],
      suggest: [{ lt: "Pasakyti, kada keliauji", hint: "travel" }],
      yes: (c) => { c.s.travel = "today"; },
      no: (c) => { c.s.travelOpen = true; } },
    { id: "cls", when: (c) => !!c.s.trip && c.s.askClass && dest(c.s.dest).long && !c.s.cls, done: (c) => !!c.s.cls,
      ask: (c) => c.say("ask_class"), expects: ["cls_ans"],
      suggest: [{ lt: "Pasirinkti klasę (ekonominė – „coach“)", hint: "cls" }] },
    { id: "pay", when: (c) => !!c.s.trip, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          c.say("say_total", { price: total(c) });
          if (c.s.payWith) { finishPay(c, c.s.payWith); return; }
          if (c.chance(0.5)) c.say("ask_pay");
          return;
        }
        c.say("ask_pay");
      },
      expects: ["pay_card", "pay_cash", "here_you_go", "discount_ask"],
      suggest: [{ lt: "Susimokėti kortele ar grynaisiais", hint: "pay" }, { lt: "Paklausti apie nuolaidą", hint: "discount" }] },
    { id: "ticket", when: (c) => !!c.s.paid, done: (c) => !!c.s.ticketGiven,
      ask: (c) => {
        c.s.ticketGiven = true;
        c.say(count(c) > 1 ? "ticket_many" : "ticket_one");
        if (c.s.volunteer) tellInfo(c);
      },
      suggest: [
        { lt: "Padėkoti", hint: "g_social" },
        { lt: "Paklausti, kada ir iš kurio kelio išvyksta traukinys", hint: "info" },
      ] },
    { id: "delay", when: (c) => !!c.s.ticketGiven && c.s.delayTwist && !c.s.delayTold, done: (c) => !!c.s.delayTold,
      ask: (c) => {
        c.twist("delay");
        c.s.delayTold = true;
        c.say("delay_news", { time: dest(c.s.dest).time });
      },
      expects: ["ask_cancelled", "ask_newtime", "ask_wait", "ask_coffee", "ok_thanks"],
      suggest: [{ lt: "Paklausti, kada traukinys išvyks", hint: "delay" }] },
    { id: "info", when: (c) => !!c.s.ticketGiven && (!c.s.knowTime || !c.s.knowTrack), done: () => false,
      ask: (c) => c.say("anything_else"),
      expects: ["ask_next", "ask_track", "ask_change", "ask_duration", "more_no", "ask_ontime"],
      suggest: [
        { lt: "Paklausti, kada ir iš kurio kelio išvyksta traukinys", hint: "info" },
        { lt: "Pasakyti, kad tai viskas", hint: "g_yesno" },
      ],
      yes: (c) => { c.s.infoYes = true; c.say("which_dest_first"); c.hold(); },
      no: (c) => { c.say("just_so_you_know"); tellInfo(c); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.25);
    c.s.askCount = c.chance(0.4);
    c.s.askDay = c.chance(0.3);
    c.s.askClass = c.chance(0.7);
    c.s.askDiscount = c.chance(0.3);
    c.s.volunteer = c.chance(0.4);
    c.s.delayTwist = c.visits >= 1 && c.chance(0.5);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    buy(c, slots, seg) {
      const tags = allTags(slots, seg);
      // a new destination, number, trip or class after the total was said: Walter says the new total
      const order = () => `${c.s.dest}|${count(c)}|${c.s.trip}|${c.s.cls}`;
      const before = order();
      if (slots.dest && !c.s.paid) setDest(c, slots.dest);
      const n = countOf(tags);
      if (n && !c.s.paid) c.s.count = n;
      const trip = tripOf(tags);
      if (trip && !c.s.paid) c.s.trip = trip;
      const cls = clsOf(tags);
      if (cls && !c.s.paid) c.s.cls = cls;
      if (tags.includes("today")) c.s.travel = "today";
      if (tags.includes("tomorrow")) c.s.travel = "tomorrow";
      if (slots.day && c.s.trip === "round" && c.s.ret === undefined) setReturn(c, slots.day);
      if (c.s.totalSaid && !c.s.paid && order() !== before) c.s.totalSaid = false;
    },
    buy_unknown(c) { c.say("dest_unknown"); c.say("dest_list"); },
    dest_ctx(c, slots, seg) {
      if (c.s.paid) return;
      setDest(c, slots.dest);
      const trip = tripOf(allTags(slots, seg));
      if (trip) c.s.trip = trip;
    },
    trip_ans(c, slots, seg) {
      if (c.s.paid) return;
      const tags = allTags(slots, seg);
      const trip = tripOf(tags);
      if (trip && c.s.totalSaid && trip !== c.s.trip) { c.s.totalSaid = false; c.say("changed"); } // the pay step says the new total
      if (trip) c.s.trip = trip;
      if (slots.day && c.s.trip === "round") setReturn(c, slots.day);
    },
    count_ctx(c, slots, seg) {
      const n = countOf(allTags(slots, seg), slots.number);
      if (n) c.s.count = n;
    },
    change_count(c, slots, seg) {
      const n = countOf(allTags(slots, seg), slots.number);
      if (!n) return;
      if (c.s.paid) {
        if (n === count(c)) { c.say(n === 1 ? "count_one" : "ack"); return; }
        c.s.count = n; reRing(c); return;
      }
      if (n !== count(c)) c.s.totalSaid = false; // the pay step says the new total
      c.s.count = n;
      c.say(n === 1 ? "count_one" : "changed");
    },
    ret_ctx(c, slots, seg) {
      if (c.s.ret !== undefined) return;
      const tags = allTags(slots, seg);
      if (tags.includes("open") || tags.includes("later")) { c.s.ret = "open"; c.say("ret_open"); return; }
      if (tags.includes("sameday")) { setReturn(c, "today"); return; }
      if (tags.includes("nextday")) { setReturn(c, "tomorrow"); return; }
      if (slots.day) { setReturn(c, slots.day); return; }
      if (slots.date) { c.s.ret = slots.date; c.say("ret_ok_date"); return; }
      if (typeof slots.ordinal === "number") { c.s.ret = { day: slots.ordinal }; c.say("ret_ok_date"); }
    },
    travel_ctx(c, slots, seg) {
      const tags = allTags(slots, seg);
      c.s.travel = slots.day ?? (tags.includes("tomorrow") ? "tomorrow" : "today");
      c.say("ack");
    },
    cls_ans(c, slots, seg) {
      const cls = clsOf(allTags(slots, seg)) ?? "coach";
      c.s.cls = cls;
      if (cls === "business" && c.s.trip === "round") c.say("business_more");
    },
    discount_ask(c) {
      c.say("discount_info");
      if (c.s.disc === undefined && !c.s.paid && !c.s.discPending) { c.s.askDiscount = true; c.s.discAsked = true; }
    },
    discount_claim(c, slots, seg) {
      if (c.s.disc !== undefined || c.s.paid) return;
      const tags = allTags(slots, seg);
      // "I'm 67 (years old)": seniors get the discount; a younger adult simply doesn't
      if (typeof slots.age === "number" && !tags.includes("senior") && !tags.includes("student")) {
        if (slots.age >= 60) c.s.discPending = "senior"; else if (c.step === "discount") c.s.disc = "";
        return;
      }
      c.s.discPending = tags.includes("senior") ? "senior" : "student";
    },
    no_discount_ctx(c) { if (c.s.disc === undefined) c.s.disc = ""; },
    show_id(c) { if (c.s.discPending && c.s.disc === undefined) applyDiscount(c); },
    no_id(c) { if (c.s.discPending && c.s.disc === undefined) { c.s.disc = ""; c.s.discPending = undefined; c.say("no_id"); } },
    pay_card(c) { pay(c, "card"); },
    pay_cash(c) { pay(c, "cash"); },
    here_you_go(c) {
      if (c.s.discPending && c.s.disc === undefined) { applyDiscount(c); return; }
      if (c.s.totalSaid && !c.s.paid) finishPay(c, "card");
    },
    ask_next(c, slots) {
      const said = slots.dest ?? destFromText(c.heard);
      if (said && !c.s.dest) setDest(c, said);
      const d = said ?? c.s.dest;
      if (!d) { destFirst(c); return; }
      const time = d === c.s.dest ? depTime(c)! : dest(d).time;
      c.say("next_train", { time });
      if (d === c.s.dest) c.s.knowTime = true;
      checkDone(c);
    },
    ask_track(c) {
      if (!c.s.dest && destFromText(c.heard)) setDest(c, destFromText(c.heard)!);
      if (!c.s.dest) { destFirst(c); return; }
      c.say("track_is", { num: dest(c.s.dest).track });
      c.s.knowTrack = true;
      checkDone(c);
    },
    ask_change(c) {
      if (!c.s.dest && destFromText(c.heard)) setDest(c, destFromText(c.heard)!);
      if (!c.s.dest) { destFirst(c); return; }
      if (!dest(c.s.dest).direct) c.s.changeTold = true;
      c.say(dest(c.s.dest).direct ? "direct_yes" : "change_boston");
    },
    ask_duration(c) {
      if (!c.s.dest && destFromText(c.heard)) setDest(c, destFromText(c.heard)!);
      if (!c.s.dest) { destFirst(c); return; }
      if (/\b(arrive|get in|get there)\b/i.test(c.heard)) c.say("arrives", { arr: arrValue(dest(c.s.dest).arr) });
      else c.say(dest(c.s.dest).dur);
    },
    ask_price(c, slots) {
      const said = slots.dest ?? destFromText(c.heard);
      const d = said ?? c.s.dest;
      if (!d) { destFirst(c); return; }
      if (said && !c.s.dest) setDest(c, said);
      c.say("price_is", { price: dest(d).fare });
      c.say("price_round", { price: dest(d).fare * 2 });
    },
    ask_diff(c, slots, seg) {
      if (c.step === "cls") { c.say("business_more"); c.hold(); return; } // (the class question itself repeats the price)
      tickets.handlers.ask_price(c, slots, seg);
    },
    ask_dests(c) { c.say("dest_list"); },
    ask_ontime(c) {
      if (c.s.delayTwist && c.s.ticketGiven && !c.s.delayTold) return; // the delay step tells it now
      if (c.s.delayTold) { c.say("new_time", { time: depTime(c)! }); return; }
      c.say("ontime_yes");
    },
    ask_cancelled(c) { if (c.s.delayTold) c.say("not_cancelled"); else c.say("ontime_yes"); },
    ask_newtime(c) { if (c.s.dest) { c.say("new_time", { time: depTime(c)! }); c.s.knowTime = true; checkDone(c); } },
    ask_wait(c) { c.say("waiting_area"); },
    ask_coffee(c) { c.say("coffee_shop"); },
    ask_seat(c) { c.say("seat_info"); },
    ask_wifi(c) { c.say("wifi_yes"); },
    ask_food(c) { c.say("cafe_car"); },
    ask_schedule(c) { c.say("schedule"); },
    ask_restroom(c) { c.say("restroom"); },
    seat_taken(c) { c.say("seat_joke"); },
    more_no(c) {
      if (c.step === "info" && (!c.s.knowTime || !c.s.knowTrack)) { c.say("just_so_you_know"); tellInfo(c); }
    },
    ok_thanks() { /* acknowledged; Walter moves on */ },
    echo_info(c, slots) {
      if (!c.s.dest) { c.say("ack"); return; }
      const d = dest(c.s.dest);
      let said = false;
      if (typeof slots.number === "number") {
        if (slots.number === d.track) c.s.knowTrack = true; else { c.say("track_is", { num: d.track }); said = true; }
      }
      if (slots.time) {
        const t = depTime(c)!;
        if (slots.time.h % 12 === t.h % 12 && slots.time.m === t.m) c.s.knowTime = true; else { c.say("next_train", { time: t }); said = true; }
      }
      if (!said) c.say("ack");
      checkDone(c);
    },
    change_trip(c, slots, seg) {
      const trip = tripOf(allTags(slots, seg));
      if (c.s.paid) {
        if (!trip || trip === c.s.trip) { c.say("ack"); return; }
        c.s.trip = trip; if (trip === "oneway") c.s.ret = undefined; reRing(c); return;
      }
      if (trip && trip !== c.s.trip) { c.s.trip = trip; if (trip === "oneway") c.s.ret = undefined; c.s.totalSaid = false; c.say("changed"); }
    },
    change_dest(c, slots) {
      if (c.s.paid) {
        if (!slots.dest || slots.dest === c.s.dest) { c.say("ack"); return; }
        setDest(c, slots.dest); c.s.cls = undefined; reRing(c); return;
      }
      setDest(c, slots.dest); c.s.totalSaid = false; c.s.cls = undefined; c.say("changed");
    },
    not_dest(c, slots) {
      const list = Array.isArray(slots.dest) ? slots.dest : [slots.dest];
      if (c.s.paid) {
        if (list.length > 1 && list[1] !== c.s.dest) { setDest(c, list[1]); c.s.cls = undefined; reRing(c); return; }
        if (list.length === 1 && c.s.dest === list[0]) { reRing(c); c.s.dest = undefined; c.s.trip = undefined; c.s.ret = undefined; c.say("ask_dest"); c.hold(); return; }
        c.say("ack"); return;
      }
      if (list.length > 1) { setDest(c, list[1]); c.s.totalSaid = false; c.say("changed"); return; }
      if (c.s.dest === list[0]) { c.s.dest = undefined; c.s.trip = undefined; c.s.ret = undefined; c.s.totalSaid = false; c.say("ask_dest"); c.hold(); }
    },
  },

  finish: (c) => {
    c.complete();
    c.event("give", { item: "train-ticket", dest: c.s.dest, trip: c.s.trip });
    c.remember({ lastDest: c.s.dest });
    c.say("have_trip");
    // "Actually, just one." after the ticket: Walter rings the order up again (reRing); if nothing
    // changes, the goodbye stays open
    const change = (id: string): Handler => (cc, sl, sg) => {
      tickets.handlers[id](cc, sl, sg);
      if (cc.s.paid) cc.expect(closing);
    };
    const closing: Pending = {
      id: "closing", hints: ["g_social", "on_train"],
      suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }, { lt: "Paklausti, ar vieta traukinyje laisva", hint: "on_train" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        seat_taken: (cc) => { cc.say("seat_joke"); cc.end(); },
        change_count: change("change_count"), change_trip: change("change_trip"), change_dest: change("change_dest"), not_dest: change("not_dest"),
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    };
    c.expect(closing);
  },

  tests: [
    { say: "I'd like a ticket to Seaside, please.", intent: "buy", slots: { dest: "seaside" } },
    { say: "A round-trip ticket to Boston, please.", intent: "buy", slots: { dest: "boston" } },
    { say: "One-way to Portland, please.", intent: "buy", slots: { dest: "portland" } },
    { say: "Two to New York, please.", intent: "buy", slots: { dest: "new_york" } },
    { say: "Can I get a ticket to the beach?", intent: "buy", slots: { dest: "seaside" } },
    { say: "I'm going to Boston.", intent: "buy", slots: { dest: "boston" } },
    { say: "A return to Portland, please.", intent: "buy" },
    { say: "I want a ticket to Chicago", intent: "buy_unknown" },
    { say: "Boston", intent: "dest_ctx", step: "dest" },
    { say: "Boston", intent: "none" },
    { say: "Round-trip, please.", intent: "trip_ans", step: "trip" },
    { say: "One way", intent: "trip_ans", step: "trip" },
    { say: "Single, please.", intent: "trip_ans", step: "trip" },
    { say: "I'm coming back on Sunday.", intent: "trip_ans", step: "trip", slots: { day: "sunday" } },
    { say: "I'm not coming back.", intent: "trip_ans", step: "trip", not: ["buy"] },
    { say: "On Sunday.", intent: "ret_ctx", step: "ret", slots: { day: "sunday" } },
    { say: "Tomorrow evening", intent: "ret_ctx", step: "ret" },
    { say: "I'm not sure yet.", intent: "ret_ctx", step: "ret" },
    { say: "Just one, please.", intent: "count_ctx", step: "count" },
    { say: "Three", intent: "count_ctx", step: "count" },
    { say: "Coach is fine.", intent: "cls_ans", step: "cls" },
    { say: "Business class, please.", intent: "cls_ans", step: "cls" },
    { say: "Is there a student discount?", intent: "discount_ask" },
    { say: "I'm a student.", intent: "discount_claim" },
    { say: "No, I'm not.", intent: "no_discount_ctx", step: "discount", not: ["discount_claim"] },
    { say: "Here's my student ID.", intent: "show_id" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Cash", intent: "pay_cash", step: "pay" },
    { say: "When's the next train to Boston?", intent: "ask_next" },
    { say: "Which track does it leave from?", intent: "ask_track" },
    { say: "What platform is it?", intent: "ask_track" },
    { say: "Do I need to change trains?", intent: "ask_change" },
    { say: "Is it a direct train?", intent: "ask_change" },
    { say: "How long does it take?", intent: "ask_duration" },
    { say: "What time does it get in?", intent: "ask_duration" },
    { say: "How much is a ticket to Portland?", intent: "ask_price" },
    { say: "Is the train on time?", intent: "ask_ontime" },
    { say: "Is it cancelled?", intent: "ask_cancelled" },
    { say: "Where can I wait?", intent: "ask_wait" },
    { say: "Do I need a seat reservation?", intent: "ask_seat" },
    { say: "Is this seat taken?", intent: "seat_taken" },
    { say: "Could I get a timetable?", intent: "ask_schedule" },
    { say: "No, that's all, thanks.", intent: "more_no", step: "info" },
    { say: "Actually, make it round-trip.", intent: "change_trip" },
    { say: "I don't want to go to Portland.", intent: "not_dest", not: ["buy", "dest_ctx"] },
    { say: "Not Portland, Boston.", intent: "not_dest", not: ["buy"] },
    { say: "the train eats blue windows", intent: "none" },
    { say: "banana ticket purple", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s67a-tickets.json)
    { say: "Hi, one adult to Portland, please.", intent: "buy", slots: { dest: "portland" } },
    { say: "Do you have tickets to Boston?", intent: "buy", slots: { dest: "boston" } },
    { say: "I need a ticket for the 10:15 to Seaside.", intent: "buy", slots: { dest: "seaside" } },
    { say: "Can I buy a ticket for the train to Portland?", intent: "buy", slots: { dest: "portland" } },
    { say: "To Seaside and back, please.", intent: "buy", slots: { dest: "seaside" } },
    { say: "Both ways, please.", intent: "trip_ans", step: "trip" },
    { say: "Go and back.", intent: "trip_ans", step: "trip" },
    { say: "I'll come back by train on Sunday.", intent: "trip_ans", step: "trip", slots: { day: "sunday" } },
    { say: "Sunday evening.", intent: "ret_ctx", step: "ret", slots: { day: "sunday" } },
    { say: "The next day.", intent: "ret_ctx", step: "ret" },
    { say: "For me and my wife.", intent: "count_ctx", step: "count" },
    { say: "Second class.", intent: "cls_ans", step: "cls" },
    { say: "I'm retired.", intent: "discount_claim" },
    { say: "I'm just a normal adult.", intent: "no_discount_ctx", step: "discount" },
    { say: "Here's my university ID.", intent: "show_id" },
    { say: "Contactless, please.", intent: "pay_card", step: "pay" },
    { say: "Track 2, okay.", intent: "echo_info" },
    { say: "Thanks for the information.", intent: "ok_thanks" },
    { say: "From which track does it leave?", intent: "ask_track" },
    { say: "How late is it?", intent: "ask_newtime" },
    // meaning must not flip
    { say: "Not Sunday, Saturday.", intent: "ret_ctx", step: "ret", slots: { day: "saturday" } },
    { say: "Not business, coach.", intent: "cls_ans", step: "cls" },
    { say: "No cash, only card.", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "I don't have a card.", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "I'm not a student.", intent: "no_discount_ctx", step: "discount", not: ["discount_claim"] },
    // the number of tickets changes at any step (BUG-REVIEW s62–s75 #3)
    { say: "Actually, just one.", intent: "change_count", step: "trip" },
    { say: "Only one ticket, please.", intent: "change_count", step: "trip" },
    { say: "Make it three tickets.", intent: "change_count", step: "pay", slots: { number: 3 } },
    { say: "Sorry, I meant one ticket.", intent: "change_count", step: "pay", slots: { number: 1 } },
    { say: "Not two, three.", intent: "change_count", step: "pay", slots: { number: 3 } },
    { say: "Only one way.", intent: "trip_ans", step: "trip" },
    { say: "Just one way, please.", intent: "trip_ans", step: "trip", not: ["change_count"] },
    { say: "Not one way, round trip.", intent: "trip_ans", step: "trip" },
    { say: "I don't need two tickets.", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "A ticket for the next train to Boston.", intent: "buy", step: "dest", slots: { dest: "boston" } },
    { say: "What trains do you have?", intent: "ask_dests", step: "dest" },
    { say: "One way only.", intent: "trip_ans", step: "trip" },
    { say: "What's the difference in price?", intent: "ask_diff", step: "trip" },
    { say: "What's the difference?", intent: "ask_diff", step: "cls" },
  ],

  sims: [
    { name: "seaside round-trip, asks time and track",
      turns: ["Hi! I'd like a ticket to Seaside, please.", "Round-trip, please.", "On Sunday.", "Can I pay by card?",
        "When's the next train?", "Which track does it leave from?", "Thank you!"],
      auto: omit(AUTO, ["dest", "trip", "ret", "pay", "info"]), expect: { complete: true } },
    { name: "two one-way tickets to Boston, questions first",
      turns: ["Good morning! How much is a ticket to Boston?", "Do I need to change trains?", "How long does it take?", "Two one-way tickets to Boston, please.",
        "Coach is fine.", "Cash.", "No, that's all, thanks.", "Is this seat taken?"],
      auto: omit(AUTO, ["dest", "trip", "pay", "info"]), expect: { complete: true } },
    { name: "student discount, New York, delay",
      turns: ["Hello. Is there a student discount?", "I'm a student.", "Here's my student ID.", "I need a ticket to New York.", "One-way, please.",
        "Business class, please.", "Card, please.", "Is it cancelled?", "Where can I wait?", "What time will it leave?", "Which platform is it?", "Thanks, bye!"],
      auto: omit(AUTO, ["dest", "trip", "pay"]), expect: { complete: true } },
    { name: "British words and a change of mind",
      turns: ["A single to Portland, please.", "Actually, make it round-trip.", "Tomorrow evening.", "Card", "Which platform does it leave from?", "When's the train?", "Bye!"],
      auto: omit(AUTO, ["dest", "ret", "pay", "info"]), expect: { complete: true } },
    { name: "fewer tickets after paying (rung up again)",
      turns: ["Two one-way tickets to Portland, please.", "Card.", "Actually, just one.", "Cash.", "When does it leave?", "Which track does it leave from?", "Thanks, bye!"],
      auto: omit(AUTO, ["dest", "trip", "pay", "ticket", "info"]), expect: { complete: true } },
  ],
};

// ---------------------------------------------------------------------------

function arrValue(a: string) {
  const [h, m] = a.split(":").map(Number);
  const pm = h < 10; // 1:50 and 5:35 are in the afternoon
  return { en: pm ? `${a} PM` : a, lt: pm ? `${h + 12}:${String(m).padStart(2, "0")}` : a, say: `${sayClock(h, m)}${pm ? " p.m." : ""}` };
}
function sayClock(h: number, m: number) {
  const W = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty"];
  const mm = m === 0 ? "o'clock" : m < 10 ? `oh ${W[m]}` : m < 13 ? W[m] : m < 20 ? ["thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"][m - 13] : `${tens[Math.floor(m / 10)]}${m % 10 ? "-" + W[m % 10] : ""}`;
  return `${W[h]} ${mm}`;
}

/** A destination named anywhere in the utterance (the NLU may put "to Boston" in its own segment). */
function destFromText(heard: string): string | undefined {
  const h = " " + heard.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ") + " ";
  for (const e of DESTS) for (const f of [e.en, ...(e.forms || [])]) if (h.includes(" " + f.toLowerCase() + " ")) return e.id;
  return undefined;
}

function setDest(c: Ctx, id: string) {
  if (!id) return;
  if (c.s.dest && c.s.dest !== id) { c.s.cls = undefined; c.s.knowTime = false; c.s.knowTrack = false; }
  c.s.dest = id;
}

function setReturn(c: Ctx, day: string) {
  c.s.ret = day;
  if (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day)) c.say("ret_ok_on", { X: day });
  else if (day === "today" || day === "tomorrow") c.say("ret_ok_rel", { X: day });
  else c.say("ret_ok_date");
}

function applyDiscount(c: Ctx) {
  const kind = c.s.discPending as string;
  c.s.disc = kind; c.s.discPending = undefined; c.s.totalSaid = false;
  c.say(kind === "senior" ? "discount_ok_senior" : "discount_ok");
}

function pay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  if (!c.s.trip) { c.s.payWith = method; c.say(method === "card" ? "card_later" : "cash_later"); return; }
  if (!c.s.totalSaid) { c.s.payWith = method; return; } // the pay step says the total first
  finishPay(c, method);
}

function finishPay(c: Ctx, method: "card" | "cash") {
  c.s.paid = true;
  checkDone(c);
  c.s.payWith = method;
  c.say(method === "card" ? "card_ok" : "cash_ok");
  c.event("pay", { method, amount: total(c) });
}

/** "Where are you going?" before a question about the train, said once per turn ("When does it leave
 *  and from which track?" is two questions). */
function destFirst(c: Ctx) {
  const turn = ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
  if (c.s.__destFirst !== turn) { c.s.__destFirst = turn; c.say("which_dest_first"); }
  c.hold();
}

/** A change after paying ("Actually, just one."): Walter changes the order and rings it up again. The
 *  pay step says the new total, the learner pays again (the first payment is refunded) and gets the new
 *  ticket, and the goodbye comes again. */
function reRing(c: Ctx) {
  c.s.paid = false; c.s.totalSaid = false; c.s.ticketGiven = false; c.s.payWith = undefined;
  c.s.__finished = false;
  c.say("change_that");
}

/** The goal: a ticket, and the learner knows when and from which track the train leaves. */
function checkDone(c: Ctx) {
  if (c.s.paid && c.s.knowTime && c.s.knowTrack) c.complete();
}

function tellInfo(c: Ctx) {
  c.say("train_info", { time: depTime(c)!, num: dest(c.s.dest).track });
  if (!dest(c.s.dest).direct && !c.s.changeTold) { c.s.changeTold = true; c.say("change_boston"); }
  c.s.knowTime = true;
  c.s.knowTrack = true;
  checkDone(c);
}

export default tickets;
