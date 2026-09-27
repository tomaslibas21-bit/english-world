// Song 71 "Fill It Up" (part 1) → an American car-rental counter: Harbor Car Rental, agent Jake.
// Picking up a reserved car (or renting one without a reservation): last name (and spelling it),
// driver's license and credit card, an upgrade offer, insurance (basic liability included, full
// coverage extra), the $300 hold on the card, the fuel policy (full to full, or prepay), unlimited
// mileage, GPS / child seat, the return day and time (grace period, drop-off at the airport),
// signing, the keys and where the car is parked. All US rental cars are automatics.
// Twists (visits ≥ 1): no compacts left → a free upgrade; the reservation is under the first name.
//
// NEEDS (engine, not changed here): the NLU gives the expected-intent bonus to every segment, so
// one answer can be cut into several segments. Handlers are idempotent so this is harmless here.

import type { Ctx, EntityDef, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Cars, extras, days

const SIZES: EntityDef[] = [
  ent("economy", "economy | car", "ekonominės klasės | automobilis/automobilio/automobiliui/automobilį/automobiliu/automobilyje", "m", {
    forms: ["economy", "economy car", "the cheapest car", "the cheapest one", "cheapest", "something cheap", "a cheap car", "cheap car", "cheap one", "the smallest", "smallest one", "the smallest one", "the smallest car"], chip: "ekonominės klasės", attrs: { rate: 3900, car: "car_economy" } }),
  ent("compact", "compact | car", "kompaktiškas/kompaktiško/kompaktiškam/kompaktišką/kompaktišku/kompaktiškame | automobilis/automobilio/automobiliui/automobilį/automobiliu/automobilyje", "m", {
    forms: ["compact", "compact car", "small car", "a small car", "something small", "small one", "the small one", "smaller car", "normal car", "a normal car", "regular car", "a regular car"], chip: "kompaktiškas", attrs: { rate: 4500, car: "car_compact" } }),
  ent("midsize", "midsize | car", "vidutinės klasės | automobilis/automobilio/automobiliui/automobilį/automobiliu/automobilyje", "m", {
    forms: ["midsize", "mid size", "mid size car", "medium car", "medium size car", "medium sized car", "something bigger", "medium", "medium one", "medium size", "middle size", "intermediate", "standard car"], chip: "vidutinės klasės", attrs: { rate: 5500, car: "car_midsize" } }),
  ent("suv", "SUV", "visureigis/visureigio/visureigiui/visureigį/visureigiu/visureigyje", "m", {
    forms: ["suv", "an suv", "s u v", "four by four", "4x4", "jeep", "big car", "a big car", "big one", "a big one", "something big", "something large", "large car", "a large car"], chip: "visureigis", attrs: { rate: 7500, car: "car_suv" } }),
  ent("minivan", "minivan", "vienatūris/vienatūrio/vienatūriui/vienatūrį/vienatūriu/vienatūryje", "m", {
    forms: ["minivan", "van", "mini van", "a van", "people carrier"], chip: "vienatūris", attrs: { rate: 8500, car: "car_minivan" } }),
];

const EXTRAS: EntityDef[] = [
  ent("gps", "GPS", "GPS navigacija/GPS navigacijos/GPS navigacijai/GPS navigaciją/GPS navigacija/GPS navigacijoje", "f", {
    forms: ["gps", "a gps", "navigation", "a navigation system", "sat nav", "satnav"], chip: "GPS navigacija", attrs: { rate: 1200 } }),
  ent("child_seat", "child | seat", "vaikiška/vaikiškos/vaikiškai/vaikišką/vaikiška/vaikiškoje | kėdutė/kėdutės/kėdutei/kėdutę/kėdute/kėdutėje", "f", {
    forms: ["child seat", "car seat", "baby seat", "booster seat", "kids seat", "a seat for my kid", "a seat for my child"], chip: "vaikiška kėdutė", attrs: { rate: 1000 } }),
];

const WEEKDAYS: EntityDef[] = [
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m"),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m"),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m"),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m"),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m"),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m"),
  ent("sunday", "Sunday", "sekmadienis/sekmadienio/sekmadieniui/sekmadienį/sekmadieniu/sekmadienyje", "m"),
];
const DAY_IDS = WEEKDAYS.map((d) => d.id);

const byId = (id: string) => [...SIZES, ...EXTRAS, ...WEEKDAYS].find((e) => e.id === id)!;
const FULL_COVERAGE = 2500; // per day
const UPGRADE = 1000; // per day, compact → midsize
const DEPOSIT = 30000;
const DROP_FEE = 5000;

// ---------------------------------------------------------------------------
// State helpers

const size = (c: Ctx) => (c.s.size as string | undefined) ?? "compact";
const days = (c: Ctx) => (c.s.days as number | undefined) ?? 3;
/** Keys handed over: insurance, deposit and return time are settled, so the task is complete. */
function giveKeys(c: Ctx) {
  c.s.keysGiven = true;
  c.complete();
  c.remember({ lastCar: size(c) });
  c.say("keys");
  if (c.s.tellSpot) { c.s.spotKnown = true; c.say(byId(size(c)).attrs!.car); }
  c.say("check_car");
  c.event("give", { item: "car-keys", car: size(c) });
}
/** The learner signs the rental agreement (once): the world shows a "signed" toast. */
const sign = (c: Ctx) => { if (!c.s.signed) { c.s.signed = true; c.event("sign"); } };
const allTags = (slots: any, seg: { tags: string[] }): string[] => {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
};

const TIPS: Record<string, Tip> = {
  uk_licence: { key: "uk_licence", lt: "Suprasta! Amerikoje sakoma „driver's license“ (vairuotojo pažymėjimas).", better: "Here's my driver's license." },
  uk_petrol: { key: "uk_petrol", lt: "Suprasta! Amerikoje degalai – „gas“, degalinė – „gas station“.", better: "Is there a gas station nearby?" },
  uk_satnav: { key: "uk_satnav", lt: "Suprasta! Amerikoje dažniau sakoma „GPS“.", better: "Do you have a GPS?" },
  uk_car_park: { key: "uk_car_park", lt: "Suprasta! Amerikoje automobilių aikštelė – „parking lot“.", better: "Where's the parking lot?" },
  manual: { key: "manual", lt: "JAV beveik visi nuomojami automobiliai – su automatine pavarų dėže.", better: "Is it an automatic?" },
  uk_hire: { key: "uk_hire", lt: "Suprasta! Amerikoje sakoma „rent a car“ (išsinuomoti automobilį).", better: "I'd like to rent a car." },
};

// Automatic answers the simulation uses when Jake asks an optional question.
const AUTO: Record<string, string> = {
  resv: "Hi, I have a reservation.", name: "It's Mikalauskas.", spell: "M-I-K-A-L-A-U-S-K-A-S.", size: "A compact, please.", days: "Three days.",
  license: "Here you go.", upgrade: "No, thanks. The compact is fine.", insurance: "Just the basic, please.", deposit: "Okay, no problem.",
  fuel: "No, thanks. I'll bring it back full.", extras: "No, thanks. I'll use my phone.", ret: "Yes, that's right.", sign: "Sure.",
  keys: "Great, thank you!", where_car: "Where's the car?", anything: "No, that's all. Thank you!", free_up: "Great, thanks!", keys_spot: "Great, thank you!",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const rental: SituationDef = {
  id: "s71a-rental",
  song: 71,
  songTitle: "Fill It Up",
  title: { en: "I've Booked a Car", lt: "Esu užsisakęs automobilį" },
  topic: { en: "Renting a car", lt: "Automobilio nuoma" },
  chapter: 6,
  order: 3,
  location: "car-rental",
  npc: "jake",
  goal: "Išsinuomok automobilį: pasitikslink draudimą, užstatą ir grąžinimo laiką.",
  intro: "„Harbor Car Rental“ – automobilių nuomos punktas. Už prekystalio – Jake. JAV nuomojant automobilį reikia vairuotojo pažymėjimo ir kredito kortelės, o kortelėje dažnai užblokuojamas užstatas.",
  entities: { size: SIZES, extra: EXTRAS, weekday: WEEKDAYS },

  grammar: {
    macros: {
      license: "(license | driver's license | drivers license | driving license #tip:uk_licence | driving licence #tip:uk_licence | licence #tip:uk_licence | id)",
      car: "(car | rental | rental car | reservation)",
      // "A … would be great": restating the answer as a wish
      nice_: "(would be (great | nice | good | perfect | fine | lovely | wonderful) | sounds (good | great | nice | perfect) | is (fine | good | great | perfect | okay))",
    },
    slots: {
      // numbers of days without the recognizer homophones of {number} ("for" = 4, "to" = 2)
      ndays: { lexicon: [
        ["1", "one"], ["2", "two"], ["3", "three"], ["4", "four"], ["5", "five"], ["6", "six"], ["7", "seven"], ["8", "eight"], ["9", "nine"],
        ["10", "ten"], ["11", "eleven"], ["12", "twelve"], ["13", "thirteen"], ["14", "fourteen"],
      ].map(([d, w]) => ({ id: d, forms: [d, w] })) },
    },
  },

  intents: {
    have_resv: { patterns: [
      "(i | we) (have | made) a reservation [for a car] [(under | in the name of) {name}] #h:have_resv", "(i | we) (have | made) a (reservation | booking) for (a | an) {size}",
      "(i | we) (have | made) [a] (reservation | booking) (on | in | under | for) [the] name [of] {name}", "(i | we) (reserved | booked) [a] car (in | on) [the] internet",
      // "I reserved a car for three days", "I made a reservation on your website", "Picking up my car"
      "(i | we) [have] (booked | reserved) a car for (a week | the weekend | {ndays} days)", "(i | we) (have | made) a (reservation | booking) (on | through) (your | the) (website | site | app)",
      "(i | we) (booked | reserved) [a car] (on | through) (your | the) (website | site | app)", "(i | we) have got a (reservation | booking | car booked)", "i got a reservation",
      "picking up [my | a | the] @car", "(i | we) [have] rented a car [online | from you]",
      "[yes] (i | we) have (one | it) [online]", "(i | we) (booked | reserved) [a car | it] (with | through | on | at) (expedia | kayak | priceline | booking com | a travel agency | my travel agent | the app | a website)",
      "(i | we) have (a | the | my) (reservation | booking | confirmation) (number | code | email)", "here is my (reservation | booking | confirmation) (number | code | email)", "(i | we) (want | need | have come) to pick up (my | a | the) @car", "(i | we) (came | have come) (for | to get) (my | a | the) @car",
      "[a | the | my] (reservation | booking) (for | under) {name}",
      "(i | we) [have] (booked | reserved) a car [online] [(under | in the name of) {name}] #h:booked",
      "(i | we) have a (booking | car booked | car reserved) [online]", "(i | we) have a car (booked | reserved) [online]",
      "(i am | we are) (here to pick up | picking up) [my | a | the] @car #h:pick_up", "(i would like | i am here) to pick up (my | a | the) @car #h:pick_up",
      "(i am | we are) here for (my | a) (car | rental | reservation)",
    ] },
    rent_walkin: { patterns: [
      "(i would like | i want | i need) to rent a car [for {number} days] #h:rent", "(can | could) (i | we) rent a car [please]",
      "(can | could) (i | we) (get | have) a car [for (a week #week | the weekend #weekend | {ndays} days)]", "(i would like | i want | i need) to hire a car #tip:uk_hire",
      // "I need a car", "Do you have cars?", "No reservation"
      "(i | we) (need | would like | want) a car [for (a week #week | the weekend #weekend | {ndays} days)]", "do you have [any] (cars | a car) [available | for rent | for today | free]",
      "(is there | are there) [any] (a car | cars) (available | free | left)", "[no] no (reservation | booking)", "(i | we) have no (reservation | booking)",
      "[no] but (i | we) (need | would like | want) (a car | to rent a car)",
      "(i | we) (would like | want | need) to rent a car for (a week #week | the weekend #weekend)",
      "do you have [any] cars (available | for today | for rent) #h:rent_have", "do you have any cars available",
      "(i | we) (do not | did not) have a reservation #h:no_resv", "(i | we) (did not | do not) (book | reserve) [a car] [online]",
    ] },
    // "No, we don't." to "Do you have a reservation?" (the built-in no-forms only have "no, I don't")
    resv_no_ctx: { patterns: ["[no] (we | i) (do not | did not) [have [one | it | any]]"] },
    name_ctx: { patterns: [
      "[it is | my name is | my last name is | the last name is | the name is | it should be] [under] {name} #h:name_its",
      "it is under {name} #h:name_its",
      "[my | the] (surname | family name | last name) [is] {name}", "the (reservation | booking) is (under | for) {name}", "(i am | this is) {name}",
      "[maybe | it might be | it could be] under my (first name | name) [{name}]", "(you can find it | look | try | check) under {name}",
      // "It's Mikalauskas. M-I-K-A-L-A-U-S-K-A-S" (spelled right away)
      "[it is | my name is | my last name is | my surname is | the last name is] {name} [that is | it is spelled | spelled] {letters}",
      "{name} [it is] a (lithuanian | foreign) (name | surname | last name)",
    ] },
    letters_ctx: { patterns: ["{letters} #h:spell", "it is {letters} #h:spell", "(that is | it is spelled) {letters}"] },
    here_docs: { patterns: [
      "here is my @license [and [my] [credit] card] #h:here_license", "here is my (credit card | card) [and [my] @license]",
      "(here | this is) my (passport | id)", "here (they are | it is)", "here you (go | are) #h:here_you_go", "there you go",
      "here", "this is my [lithuanian | european | international] @license [and [my] [credit] card]", "here is my (lithuanian | european | international) @license [and [my] [credit] card]",
      "my @license and my (card | credit card | visa | mastercard)", "here (are | is) my (documents | papers | license and card | passport and license)", "i will (pay with | pay by | use) (this | my) (card | credit card | visa | mastercard)", "(here | this) is my signature",
    ] },
    license_q: { patterns: [
      "is my (lithuanian | european | foreign | eu | international) @license (okay | valid | fine | good | all right) #h:q_license",
      "(can | could) i (drive | rent a car) with (my | a) (lithuanian | foreign | european) @license",
      "do i need an international (driving permit | license | driver's license)", "i have a (lithuanian | european) @license",
      "i have an international (driving permit | driving license | license | permit | @license)", "(can | could) i use (my | a) (lithuanian | european | foreign | eu | international) @license [here]",
      "is (my | a) [lithuanian | european | foreign | eu | international] @license (okay | valid | fine | good | all right) [here | in (america | the us | the usa | the states)]",
    ] },
    size_ctx: { patterns: ["[a | an] {size} [please] #h:size_short", "(i would like | i will take | can i get | can i have | i need) [a | an] {size} #h:size_want", "{size} (is fine | please | would be great)", "[a | an] {size} @nice_",
      "[a | an] {size} (for | we are) ({n:number} [people | persons | of us] | my family | the family)", "[i think] [a | an] {size} [car] [would be good | is good]"] },
    // "What do you have?" (the sizes)
    sizes_q: { patterns: ["what (cars | sizes | kind of cars | types of cars | kinds of cars) do you have", "what do you have", "what are the (options | choices)", "what (cars | sizes) are (there | available)"] },
    days_ctx: { patterns: [
      "[for] {ndays} days #h:days", "[for] {ndays}", "[for] (a week #week | one week #week | the week #week) #h:days", "[for] (the weekend #weekend | a weekend #weekend)",
      "(until | till) {day}", "[for] (a day #one | one day #one | just today #one)",
      "[for] {ndays} nights", "[for] (two | 2) weeks #twoweeks", "[for] (about | around | maybe) a week #week", "to {day}",
      "(only | just) [for] {ndays} days", "from (today | now) (until | till | to) {day}",
      "(i | we) need (it | a car | the car) (for {ndays} days | for a week #week | until {day})",
    ] },
    ins_full: { patterns: [
      "(i will take | i would like | i will get | i will have | i want | can i get) [the] full (coverage | protection | insurance) #h:ins_full", "[the] full [one] [please]", "[the] full (coverage | protection | insurance | one) @nice_",
      "[yes] [please] add [the] full (coverage | protection | insurance | one)", "[yes] (i would like | i want) to add [the] full (coverage | protection | insurance)",
      "full (coverage | protection | insurance) [please]", "(i will take | i would like) the (protection | insurance | full package)",
      "(i | we) want to be fully covered", "(yes | yeah) [please] [the] full coverage", "i will take it",
    ] },
    ins_basic: { patterns: [
      "(just | only) [the] basic [coverage | insurance | one | protection] #h:ins_basic", "[the] basic (coverage | insurance | one) [is fine | please]",
      "(i do not | i don't) need (extra | full | additional | any more) (insurance | coverage | protection)", "no (full coverage | extra insurance) [thanks]",
      "basic is fine", "i will stay with the basic",
      "[the] basic [please | is fine | is enough | is okay]", "[the] (cheaper | cheapest) (one | option) [please]",
      "(i will take | i will have | i would like | i will go with) [just] the basic [one | coverage | insurance]",
      // "Full coverage would be too expensive": one piece, never "full coverage" + …
      "[the] full (coverage | protection | insurance) (would be | is) [a bit | a little] (too expensive | expensive | too much)",
      "(i do not | i don't) (want | need) (extra | full | additional | any more | any) (insurance | coverage | protection)", "[the] basic (coverage | insurance | one) is enough", "i will go without [it | insurance | full coverage]", "no (full coverage | extra insurance | extra coverage) [thanks]",
    ] },
    // "No, I don't need it": only as an answer to the insurance offer
    ins_no_ctx: { patterns: ["[no] i do not (need | want) (it | that | any)", "[no] (it is | that is) (too expensive | not necessary)", "[no] i will pass", "[no] not (today | this time)"] },
    ins_own: { patterns: [
      "(my credit card | my card) (covers | has) (it | insurance | rental insurance) #h:ins_card", "i am covered by my (credit card | card | insurance | own insurance)",
      "i (have | already have) (my own insurance | insurance) [through my (card | credit card)]",
      "(my credit card | my card) covers (rental cars | car rentals | rentals | cars)", "i (have | already have) insurance (through | from | with) my (card | credit card | bank)",
      "i am covered by my travel insurance", "i (have | already have) travel insurance",
    ] },
    ins_what: { patterns: [
      "what does (it | the full coverage | full coverage | the insurance | the protection) cover #h:q_cover", "what is (included | covered)",
      "is (insurance | basic insurance | any insurance) included #h:q_ins_included", "how much is [the] (full coverage | insurance | protection) [per day | a day]",
      "is there a deductible", "what if i (have an accident | damage the car | scratch the car)",
      "what does [the] (full coverage | insurance | protection | it) include", "what is the difference", "do i need (it | full coverage | the full coverage | insurance | extra insurance)",
      "is (it | full coverage | the full coverage) (necessary | required | mandatory | a good idea)",
    ] },
    deposit_q: { patterns: [
      "is there a deposit #h:q_deposit", "how much is the (deposit | hold)", "do (i | you) (need | take) a deposit",
      "when (will | do) i get (it | the deposit | my deposit | the money | my money) back #h:q_deposit_back", "(when | how soon) is the (hold | deposit) released",
      "is the deposit refundable",
      "how long (does it | will it) take [to get (it | my money | the money | the deposit) back]", "how long until i get (it | my money | the money | the deposit) back",
      "why (do you need | is there) (a | the) (deposit | hold)", "is it (charged | a charge | blocked | just a hold) [or (just)? (blocked | a hold | charged)]",
      "(will | do) you (charge | block) my card", "is (it | the hold | the deposit) refundable", "when (will | does) (the money | my money | it | the deposit | the hold) come back",
      "when is (it | the hold | the deposit | the money) released", "is it a (hold | charge) [or a (charge | hold)]",
    ] },
    fuel_q: { patterns: [
      "(do | should) i (have | need) to (fill it up | return it full | bring it back full) #h:q_fuel", "what is the (fuel | gas) policy",
      "(is | does) it [come with] a full tank", "is the tank full", "what is the (fuel | petrol #tip:uk_petrol) policy",
      "(is there | where is) (a | the nearest) (gas station #h:q_gas_station | petrol station #tip:uk_petrol) [nearby | near here | close by]",
      "where can i (get | buy) (gas | fuel | petrol #tip:uk_petrol)",
    ] },
    fuel_full: { patterns: ["[okay] (i will | we will) (bring | return) it [back] full #h:full_to_full", "full to full [is fine]", "(i will | we will) fill it up [myself | before i return it]",
      "(i will | we will) fill (it | the tank) [up] [myself | before i (return | bring back) it]", "(i will | we will) (bring | return) (it | the car | car) [back] with [a] full tank",
      "[a] full tank [is] [okay | fine | no problem]", "[no] full [please]", "[no] (i | we) [will] (bring | return) [it] back full"] },
    prepay_yes: { patterns: ["(i will | i would like to) prepay [for the gas] #h:prepay", "i (prefer | want) to prepay [for the gas]", "(yes | yeah) [i will] prepay", "prepay [please]"] },
    mileage_q: { patterns: [
      "is there a mileage limit #h:q_mileage", "(is | do you have | is it | is there) unlimited mileage", "how many miles can (i | we) drive",
      "(is | are) the (miles | mileage) (unlimited | limited)", "can i drive as (much | far) as i (want | like)",
      "(is | does it have) a (mileage | kilometer | mile) limit", "is there a limit on (miles | mileage)",
    ] },
    auto_q: { patterns: [
      "is it (an automatic | automatic | a manual | manual | a stick shift | a stick) #h:q_automatic", "[an] automatic [car] [please]", "(do you have | can i get | i would like) (a manual | a stick shift | an automatic | a manual car)",
      "(can | could) i (have | get) a (manual | stick shift) [instead]", "i (can not | can't) drive (an automatic | a manual)",
    ] },
    extras_yes: { patterns: [
      "(i would like | can i get | could i get | i need | i will take | do you have) a {extra} #h:extra_want", "[a] {extra} [please]",
      "(i would like | can i get | could i get | i need | i will take) a {extra} for my (son | daughter | kid | child | baby | little one)", "[yes] both [please] #both",
      "[yes] [a] gps and [a] (child seat | car seat | baby seat) #both",
      "[a] {extra} would be (great | good | nice | helpful)", "i have a (child | kid | baby | son | daughter) [so] [i need] [a] {extra}",
      "(yes | yeah) [a] {extra} [please]", "how much is (a | the) {extra} [per day | a day]",
    ] },
    extras_no: { patterns: [
      "(no | no thanks) i (will use | have | can use) my phone #h:extra_phone", "i (will | can) use my phone", "(i | we) do not need (a {extra} | anything else | any extras | extras)",
      "no extras [please | thanks]", "nothing else",
      "no {extra} [please | thanks]", "[no] nothing [thanks]", "[no] i do not need (them | it | that)", "[no] i have my own (navigation | gps | {extra})",
      "[no] i (no | not) need [a] {extra}", "[no] i do not need {extra}", "[no] i do not want [a | the] {extra}", "[no] i have (google maps | maps | navigation | a gps | waze) [on my phone]", "[no] (i | we) do not need anything [else]",
      "[no] (i | we) (will | can) use (google maps | waze | maps) [on my phone]",
    ] },
    // "No, on Saturday": another day
    ret_day_ctx: { patterns: ["[no] [on] {day} [please | instead]", "[no] (i need it | i would like it | i want it) until {day}", "[no] (i will bring it | i will return it | i want to bring it | i would like to return it) [back] on {day}"] },
    ret_change: { patterns: [
      "(can | could) i keep (it | the car) (one more day | an extra day | another day | one day longer | a day longer) #extra_day",
      "(can | could) i (bring | return) (it | the car) [back] (a day later | one day later | a day longer | one more day) #extra_day",
      "(can | could) i (return | bring) (it | the car) [back] (at | to) the airport #airport #h:q_airport", "(can | could) i (drop | leave) (it | the car) [off] at the airport #airport",
      "(can | could) i keep (it | the car) (until | till) {day} #h:keep_until", "i would like to (return | bring back) (it | the car) (on {day} | at the airport #airport)",
      "(can | could) i (return | bring) (it | the car) [back] (on | a day later on) {day} [instead]",
      "(can | could) i (return | drop off | leave | drop) (it | the car) [off] (at | in) (another | a different) (location | place | office | city)",
    ] },
    ret_q: { patterns: [
      "(when | what time) (do | should) i (return | bring back | bring) (it | the car) [back]", "when is it due [back]",
      "(when | what time) (do | should) i (need | have) to (return | bring back | bring) (it | the car) [back] #h:q_return", "when (does it | does the car) (need | have) to be back",
      "where do i (return | drop off | bring) (it | the car) [back]", "what if (i am | i'm) late #h:q_late", "is there a grace period",
      "what time (does it | do i have to) (go back | come back)",
      "what happens if (i am | i'm) late", "what if i (come | bring it back | return it) late", "where is the drop off [place | location | area | point]",
      "what if i (come back | return it | bring it back) (later | late)",
    ] },
    // "No, thank you, it's okay": a polite no to the offer on the table (upgrade, insurance, prepaying, extras)
    polite_no_ctx: { patterns: ["[no] [thank you | thanks] (it is | that is) (okay | fine | all right) [thanks | thank you]"] },
    // "Where?" right after the keys: where the car is
    where_car_ctx: { patterns: ["where [is it | exactly]", "where is (that | it)"] },
    // "Where?" right after "Just sign here"
    sign_where_ctx: { patterns: ["where [exactly | here]", "where do i put my (name | signature | initials)"] },
    sign_q: { patterns: ["where do i sign #h:q_sign", "where (i must | must i | i should | i | i need to) sign", "(where | what) should i sign", "where do i (initial | put my initials)", "(do | should) i sign here", "where exactly", "(here | there) or (here | there)"] },
    where_car: { patterns: [
      "where is (the | my) car #h:q_where_car", "where (is | can i find) [the] (car | spot b4 | spot b 4 | parking spot)", "where do i (pick up | find | get) the car",
      "which car is it", "where is the parking (lot | garage)", "where is the car park #tip:uk_car_park",
      "which (car | one) is (mine | my car | it)", "what (color | colour | model | car | kind of car) is it",
      "which (spot | parking spot | space | parking space | row)", "where is (it | the car) parked", "is it far", "where do i find (it | the car)", "where is (spot | parking spot) {w:any}",
    ] },
    scratch_q: { patterns: [
      "what if (i see | there is | i find) a (scratch | dent) #h:q_scratch", "there is a (scratch | dent) [on the car | on the door]",
      "(should | do) i check the car [first]", "what should i do if (i see | there is | i find) a (scratch | dent)",
    ] },
    price_q: { patterns: ["how much is it [per day | a day]", "how much (more | extra) [is it | per day | a day]", "how much (does it | will it) cost [per day | in total]", "what is the [daily] rate", "how much is that [per day]",
      "how much (is | does) (a | an | the) {size} [cost] [per day | a day]", "what is the price (of | for) (a | an | the) {size}"] },
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for now]", "[no] that is it", "nothing else [thanks]", "[no] (i am | we are) (good | fine | all set)",
      "(i think | i guess) that is (all | it | everything)", "[no] (you have been | you were) (very | really | so)? helpful",
    ] },
    keep_size: { patterns: ["[no thanks] [the] {size} is (fine | okay | good | perfect) #h:keep_size",
      "[the] {size} is enough", "[no] i prefer the {size}", "[no] i do not need (it | that | the upgrade | an upgrade)", "[no] i do not need a (bigger | larger) (car | one)", "no upgrade [thanks | please]", "[no] i do not want (to upgrade | an upgrade | a bigger car)", "(i will | i would like to) (keep | stay with | take) the {size}", "(i am | i'm) happy with the {size}", "(i am | i'm) (fine | good) with the {size}"] },
    upgrade_yes: { patterns: ["(yes | sure | okay) [i will | let us] upgrade [please] #h:upgrade_yes", "(i will | i would like to) upgrade", "upgrade [me] [please]",
      "[yes] (i will take | i would like | give me | let us do | i will go with) the (midsize | mid size | bigger one | bigger car | larger one | larger car)", "(yes | sure | okay) [please] upgrade me",
      "[the] car is (small | too small) [so] [i (want | would like | need) (a bigger (car | one) | bigger)]", "[yes] (i want | i would like | i need) (a bigger (car | one) | bigger [car] | more space)",
      "[yes] [a | the] (midsize | mid size | bigger (car | one) | larger (car | one) | bigger) @nice_"] },
    yes_right: { patterns: ["[yes | yeah | yep] (that is | it is) (right | correct) #h:yes_right", "[yes] exactly", "(yes | yeah) correct", "(yes | yeah) (on | by) friday",
      "[yes | okay] [on] friday [(by | at) (five | 5 | 5 pm | five pm)] [is] [okay | fine | good | great | perfect]", "[yes | okay] (five | 5) (pm | o'clock) [on friday] [is] [okay | fine | good | great | perfect]"] },
    ok_ack: { patterns: [
      "(okay | ok | sure | fine | great | perfect | no problem) [no problem | that is fine | thanks] #h:ok_ack", "(that is | that sounds) (fine | good | okay | great)",
      "(got it | understood | will do | i will | i understand)", "(okay | sure) will do",
      "all right [no problem | that is fine]", "[okay] (done | all done | signed)", "{price} [is] (okay | ok | fine | no problem)", "(that is | it is) no problem",
      "[okay] i will (check | look at | look around) (it | the car)", "[okay] i will take (photos | pictures | a photo)",
    ] },
  },

  lines: {
    // --- greeting and reservation
    greet: [
      t("Hi there! | Welcome | to | Harbor Car Rental. | Are | you | picking up | a | car | today?",
        "Sveiki! | Sveiki atvykę | į | „Harbor Car Rental“. | Ar | jūs | atsiimate | — | automobilį | šiandien?",
        "Sveiki atvykę į „Harbor Car Rental“! Ar šiandien atsiimate automobilį?",
        { flags: { 4: "Question “Are” = the particle ar; the present of atsiimate carries the progressive (linked to “picking up”)." } }),
      t("Next, | please! | Do | you | have | a | reservation | with | us?", "Kitas, | prašom! | Ar | jūs | turite | — | rezervaciją | pas | mus?",
        "Kitas, prašom! Ar esate {m:rezervavęs|f:rezervavusi} automobilį pas mus?", { flags: { 2: "Question “Do” = the particle ar." } }),
      t("Good | morning! | How | can | I | help | you?", "Labas | rytas! | Kaip | galiu | aš | padėti | jums?", "Labas rytas! Kuo galiu padėti?"),
    ],
    greet_hay: [
      t("Hey, | good | morning! | How's it going?", "Labas, | geras | rytas! | Kaip sekasi?", "Labas rytas! Kaip sekasi?"),
    ],
    ask_resv: [
      t("Do | you | have | a | reservation?", "Ar | jūs | turite | — | rezervaciją?", "Ar esate {m:rezervavęs|f:rezervavusi} automobilį?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    ask_name: [
      t("Great. | Can | I | get | your | last name?", "Puiku. | Ar galiu | aš | gauti | jūsų | pavardę?", "Puiku. Kokia jūsų pavardė?"),
      t("Sure. | What's | the | last name | on the reservation?", "Žinoma. | Kokia yra | — | pavardė | rezervacijoje?", "Žinoma. Kokia pavardė nurodyta rezervacijoje?"),
    ],
    ask_spell: [
      t("Could | you | spell | that | for me?", "Ar galėtumėte | jūs | pasakyti paraidžiui | tai | man?", "Ar galėtumėte man pasakyti paraidžiui?"),
      t("And | how | do | you | spell | that?", "O | kaip | — | jūs | rašote | tai?", "O kaip rašoma?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “spell”)." } }),
    ],
    found: [
      t("Thanks! | Here | it | is: | a | compact | car | for | three | days.", "Ačiū! | Štai | ji | —: | — | kompaktiškas | automobilis | — | trims | dienoms.",
        "Ačiū! Štai ji: kompaktiškas automobilis trims dienoms.",
        { flags: { 3: "“is” (here it is): no Lithuanian word; štai presents it.", 7: "“for”: the dative trims dienoms carries it (C-CASE-DASH, “three” intervenes)." } }),
    ],
    found_details: [
      t("It's | a | compact | car | for | three | days.", "Tai yra | — | kompaktiškas | automobilis | — | trims | dienoms.", "Tai kompaktiškas automobilis trims dienoms.",
        { flags: { 4: "“for”: the dative trims dienoms carries it (C-CASE-DASH, “three” intervenes)." } }),
    ],
    not_found: [
      t("Hmm, | I | don't see | it | under | that | name...", "Hmm, | aš | nematau | jos | — | ta | pavarde...", "Hmm, nematau rezervacijos šia pavarde...",
        { flags: { 4: "“under”: the instrumental ta pavarde carries it (C-CASE-DASH, “that” intervenes)." } }),
    ],
    found_first: [
      t("Oh, | here | it | is! | It | was | under | your | first name.", "O, | štai | ji | —! | Ji | buvo | — | jūsų | vardu.", "O, štai ji! Rezervacija buvo jūsų vardu.",
        { flags: { 3: "“is” (here it is): no Lithuanian word; štai presents it.", 6: "“under”: the instrumental vardu carries it (C-CASE-DASH, “your” intervenes)." } }),
    ],
    // --- walk-in
    walkin_ok: [
      t("No | problem! | We | have | cars | available.", "Jokių | problemų! | Mes | turime | automobilių | laisvų.", "Jokių problemų! Turime laisvų automobilių."),
    ],
    ask_size: [
      t("What | size | car | are | you | looking | for?", "Kokio | dydžio | automobilio | — | jūs | ieškote | —?", "Kokio dydžio automobilio ieškote?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; the present of ieškote carries it (linked to “looking”).", 6: "“for” (looking for): ieškoti takes the genitive directly." } }),
    ],
    size_list: [
      t("We | have | economy, | compact, | midsize, | SUVs | and | minivans.", "Mes | turime | ekonominės klasės, | kompaktiškų, | vidutinės klasės, | visureigių | ir | vienatūrių.",
        "Turime ekonominės klasės, kompaktiškų, vidutinės klasės automobilių, visureigių ir vienatūrių."),
    ],
    ask_days: [
      t("And | for | how many | days?", "O | — | kiek | dienų?", "O kelioms dienoms?", { flags: { 1: "“for”: the question kiek dienų carries the duration; no separate word." } }),
    ],
    rate_is: [
      t("That's | {$price} | a | day.", "Tai yra | {$price} | — | per dieną.", "Tai kainuoja {$price} per dieną.",
        { flags: { 2: "“a” (a day = per day): per dieną carries it (linked to “day”)." } }),
    ],
    // --- documents
    ask_docs: [
      t("Can | I | see | your | driver's | license | and | the | credit | card | you'd | like | to use?",
        "Ar galiu | aš | pamatyti | jūsų | vairuotojo | pažymėjimą | ir | — | kredito | kortelę | kuria jūs | norėtumėte | mokėti?",
        "Ar galiu pamatyti jūsų vairuotojo pažymėjimą ir kredito kortelę, kuria norėtumėte mokėti?",
        { flags: { 10: "“you'd”: Lithuanian adds the relative kuria (the card you'd like to use = the card with which you'd pay); the conditional sits on norėtumėte (linked to “like”)." } }),
      t("I'll need | your | driver's | license | and | a | credit | card.", "Man reikės | jūsų | vairuotojo | pažymėjimo | ir | — | kredito | kortelės.",
        "Man reikės jūsų vairuotojo pažymėjimo ir kredito kortelės."),
    ],
    docs_ok: [
      t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("Great, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
    ],
    license_fine: [
      t("Yes, | your | license | is | fine.", "Taip, | jūsų | pažymėjimas | yra | tinkamas.", "Taip, jūsų pažymėjimas tinka."),
    ],
    // --- upgrade
    ask_upgrade: [
      t("Would | you | like | to upgrade | to | a | midsize | for | just | ten | dollars | more | a | day?",
        "Ar | jūs | norėtumėte | pasikeisti | į | — | vidutinės klasės | už | tik | dešimt | dolerių | daugiau | — | per dieną?",
        "Gal norėtumėte vidutinės klasės automobilio? Tik dešimčia dolerių daugiau per dieną.",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”).", 12: "“a” (a day = per day): per dieną carries it (linked to “day”)." } }),
    ],
    free_upgrade: [
      t("Good | news: | we're out of | compacts | today, | so | I'm giving | you | a | free | upgrade | to | a | midsize.",
        "Geros | naujienos: | mums baigėsi | kompaktiški | šiandien, | todėl | aš suteikiu | jums | — | nemokamą | pakeitimą | į | — | vidutinės klasės.",
        "Geros naujienos: šiandien baigėsi kompaktiški automobiliai, todėl nemokamai duodu jums vidutinės klasės automobilį."),
    ],
    upgrade_ok: [t("Great! | I'll switch | you | to | a | midsize.", "Puiku! | Pakeisiu | jums | į | — | vidutinės klasės.", "Puiku! Pakeisiu jums į vidutinės klasės automobilį.")],
    // --- insurance
    ask_insurance: [
      t("Basic | liability | is | included. | Would | you | like | to add | full | coverage | for | {$price} | a | day?",
        "Bazinis | civilinės atsakomybės draudimas | yra | įskaičiuotas. | Ar | jūs | norėtumėte | pridėti | visišką | draudimą | už | {$price} | — | per dieną?",
        "Bazinis civilinės atsakomybės draudimas įskaičiuotas. Gal norėtumėte visiško draudimo už {$price} per dieną?",
        { flags: { 4: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”).", 12: "“a” (a day = per day): per dieną carries it (linked to “day”)." } }),
      t("Do | you | want | full | coverage? | It's | {$price} | a | day.", "Ar | jūs | norite | visiško | draudimo? | Tai yra | {$price} | — | per dieną.",
        "Ar norite visiško draudimo? Jis kainuoja {$price} per dieną.",
        { flags: { 0: "Question “Do” = the particle ar.", 7: "“a” (a day = per day): per dieną carries it (linked to “day”)." } }),
    ],
    cover_info: [
      t("It | covers | any | damage | to | the | car, | and | you | won't pay | anything | extra.",
        "Jis | apima | bet kokią | žalą | — | — | automobiliui, | ir | jūs | nemokėsite | nieko | papildomai.",
        "Jis apima bet kokią žalą automobiliui, ir jums nieko papildomai mokėti nereikės.",
        { flags: { 4: "“to the car”: the dative automobiliui carries “to”." } }),
    ],
    ins_included: [
      t("Basic | liability | is | included, | but | not | damage | to | the | car.", "Bazinis | civilinės atsakomybės draudimas | yra | įskaičiuotas, | bet | ne | žala | — | — | automobiliui.",
        "Bazinis civilinės atsakomybės draudimas įskaičiuotas, bet žala automobiliui – ne.", { flags: { 7: "“to the car”: the dative automobiliui carries “to”." } }),
    ],
    ins_full_ok: [t("Perfect, | you're | fully | covered.", "Puiku, | jūs esate | visiškai | {m:apdraustas|f:apdrausta}.", "Puiku, esate visiškai {m:apdraustas|f:apdrausta}.")],
    ins_basic_ok: [t("No | problem. | Just | the | basic.", "Jokių | problemų. | Tik | — | bazinis.", "Jokių problemų. Tik bazinis draudimas.")],
    ins_card_ok: [t("Okay, | you're | covered | by | your | card, | then.", "Gerai, | jūs esate | {m:apdraustas|f:apdrausta} | — | savo | kortele, | vadinasi.", "Gerai, vadinasi, jus draudžia jūsų kortelė.",
      { flags: { 3: "“by”: the instrumental kortele carries it (C-CASE-DASH, “your” intervenes)." } })],
    // --- deposit
    deposit: [
      t("We'll put | a | {$deposit} | hold | on | your | card. | You'll get | it | back | when | you | return | the | car.",
        "Mes užblokuosime | — | {$deposit} | užstatą | — | jūsų | kortelėje. | Jūs atgausite | jį | — | kai | jūs | grąžinsite | — | automobilį.",
        "Jūsų kortelėje užblokuosime {$deposit} užstatą. Jį atgausite, kai grąžinsite automobilį.",
        { flags: { 4: "“on”: the locative kortelėje carries it (C-CASE-DASH, “your” intervenes).", 9: "“back” (get … back): the prefix at- of atgausite carries it." } }),
    ],
    deposit_back: [
      t("It | usually | takes | three | to | five | business | days | after | you | return | the | car.",
        "Tai | paprastai | užtrunka | nuo trijų | iki | penkių | darbo | dienų | po to, kai | jūs | grąžinate | — | automobilį.",
        "Paprastai tai užtrunka nuo trijų iki penkių darbo dienų po to, kai grąžinate automobilį.",
        { flags: { 3: "“three” = nuo trijų: Lithuanian adds nuo for the range." } }),
    ],
    // --- fuel
    fuel: [
      t("It | comes | with | a | full | tank. | Please | bring | it | back | full.", "Jis | yra | su | — | pilnu | baku. | Prašom | grąžinti | jį | atgal | su pilnu baku.",
        "Automobilis su pilnu baku. Prašom grąžinti jį su pilnu baku."),
    ],
    ask_prepay: [
      t("Or | would | you | like | to prepay | for | the | gas?", "Ar | — | jūs | norėtumėte | iš anksto sumokėti | už | — | degalus?",
        "O gal norėtumėte iš anksto sumokėti už degalus?", { flags: { 1: "“would”: the question is marked by ar (“Or” is glossed as ar); the conditional sits on norėtumėte." } }),
    ],
    prepay_ok: [t("Sure. | Then | you | can | bring | it | back | empty.", "Žinoma. | Tada | jūs | galite | grąžinti | jį | atgal | tuščią.", "Žinoma. Tada galite grąžinti jį tuščiu baku.")],
    full_ok: [t("Great, | full | to | full.", "Puiku, | pilnas | į | pilną.", "Puiku, gaunate pilną baką ir grąžinate pilną.")],
    gas_station: [
      t("There's | a | gas station | right | on | this | street.", "Yra | — | degalinė | čia pat | — | šioje | gatvėje.", "Degalinė yra čia pat, šioje gatvėje.",
        { flags: { 4: "“on”: the locative gatvėje carries it (C-CASE-DASH, “this” intervenes)." } }),
    ],
    mileage: [t("No, | it's | unlimited | mileage.", "Ne, | tai yra | neribota | rida.", "Ne, rida neribota.")],
    automatic: [t("All | our | cars | are | automatics.", "Visi | mūsų | automobiliai | yra | su automatine pavarų dėže.", "Visi mūsų automobiliai – su automatine pavarų dėže.")],
    // --- extras
    ask_extras: [
      t("Do | you | need | a | GPS | or | a | child | seat?", "Ar | jums | reikia | — | GPS navigacijos | ar | — | vaikiškos | kėdutės?", "Ar jums reikia GPS navigacijos ar vaikiškos kėdutės?",
        { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    extra_price: [t("Sure, | that's | {$price} | a | day.", "Žinoma, | tai yra | {$price} | — | per dieną.", "Žinoma, tai kainuoja {$price} per dieną.",
      { flags: { 3: "“a” (a day = per day): per dieną carries it (linked to “day”)." } })],
    no_extras: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    // --- return
    ret_confirm: [
      t("You're bringing | it | back | on Friday | by | 5 PM, | right?", "Grąžinsite | jį | atgal | penktadienį | iki | 17:00, | tiesa?",
        "Grąžinsite jį penktadienį iki 17 val., tiesa?", { say: "You're bringing it back on Friday by five PM, right?" }),
      t("And | the | car | is | due | back | on Friday | by | 5 PM.", "O | — | automobilį | reikia | grąžinti | atgal | penktadienį | iki | 17:00.",
        "O automobilį reikia grąžinti penktadienį iki 17 val.", { say: "And the car is due back on Friday by five PM." }),
    ],
    ret_confirm_day: [
      t("So | you're bringing | it | back | on {X} | by | 5 PM.", "Taigi | grąžinsite | jį | atgal | {X:acc} | iki | 17:00.",
        "Taigi grąžinsite jį {X:acc} iki 17 val.", { say: "So you're bringing it back on {X} by five PM." }),
    ],
    ret_answer: [
      t("On Friday, | by | 5 PM, | right here.", "Penktadienį, | iki | 17:00, | čia pat.", "Penktadienį iki 17 val., čia pat.",
        { say: "On Friday, by five PM, right here." }),
    ],
    ret_where: [t("Right here, | at | this | office.", "Čia pat, | — | šiame | biure.", "Čia pat, šiame biure.",
      { flags: { 1: "“at”: the locative biure carries it (C-CASE-DASH, “this” intervenes)." } })],
    ret_airport: [
      t("Sure, | but | there's | a | {$price} | drop-off | fee.", "Žinoma, | bet | yra | — | {$price} | grąžinimo kitoje vietoje | mokestis.",
        "Žinoma, bet už grąžinimą kitoje vietoje taikomas {$price} mokestis."),
    ],
    ret_changed: [t("Sure, | I'll change | it | to | {X}.", "Žinoma, | pakeisiu | tai | į | {X:acc}.", "Žinoma, pakeisiu į {X:acc}.")],
    late_info: [
      t("There's | a | thirty-minute | grace | period. | After | that, | we | charge | for | an | extra | day.",
        "Yra | — | trisdešimties minučių | lengvatinis | laikotarpis. | Po | to, | mes | imame mokestį | už | — | papildomą | dieną.",
        "Yra trisdešimties minučių lengvata. Po to skaičiuojame papildomą dieną."),
    ],
    // --- signing and keys
    ask_sign: [
      t("Great. | Just | sign | here, | and | initial | here.", "Puiku. | Tiesiog | pasirašykite | čia, | ir | pasirašykite inicialais | čia.", "Puiku. Pasirašykite čia ir parašykite inicialus čia."),
      t("Okay, | I | just | need | your | signature | here | and | here.", "Gerai, | man | tik | reikia | jūsų | parašo | čia | ir | čia.", "Gerai, man tik reikia jūsų parašo čia ir čia."),
    ],
    sign_where: [t("Right | here, | at | the | bottom.", "Štai | čia, | — | — | apačioje.", "Štai čia, apačioje.", { flags: { 2: "“at the bottom”: the locative apačioje carries “at”." } })],
    keys: [
      t("Here | are | your | keys.", "Štai | — | jūsų | raktai.", "Štai jūsų raktai.", { flags: { 1: "“are” (here are): no Lithuanian word; štai presents them." } }),
      t("All right, | here | are | your | keys.", "Gerai, | štai | — | jūsų | raktai.", "Gerai, štai jūsų raktai.", { flags: { 2: "“are” (here are): no Lithuanian word; štai presents them." } }),
    ],
    car_compact: [t("It's | the | silver | Toyota | Corolla | in | spot | B4.", "Tai yra | — | sidabrinė | Toyota | Corolla | — | vietoje | B4.", "Tai sidabrinė Toyota Corolla, vietoje B4.",
      { say: "It's the silver Toyota Corolla in spot B four.", flags: { 5: "“in”: the locative vietoje carries it (C-CASE-DASH)." } })],
    car_economy: [t("It's | the | red | Nissan | Versa | in | spot | B2.", "Tai yra | — | raudonas | Nissan | Versa | — | vietoje | B2.", "Tai raudonas Nissan Versa, vietoje B2.",
      { say: "It's the red Nissan Versa in spot B two.", flags: { 5: "“in”: the locative vietoje carries it (C-CASE-DASH)." } })],
    car_midsize: [t("It's | the | blue | Toyota | Camry | in | spot | C2.", "Tai yra | — | mėlyna | Toyota | Camry | — | vietoje | C2.", "Tai mėlyna Toyota Camry, vietoje C2.",
      { say: "It's the blue Toyota Camry in spot C two.", flags: { 5: "“in”: the locative vietoje carries it (C-CASE-DASH)." } })],
    car_suv: [t("It's | the | black | Ford | Explorer | in | spot | D1.", "Tai yra | — | juodas | Ford | Explorer | — | vietoje | D1.", "Tai juodas Ford Explorer, vietoje D1.",
      { say: "It's the black Ford Explorer in spot D one.", flags: { 5: "“in”: the locative vietoje carries it (C-CASE-DASH)." } })],
    car_minivan: [t("It's | the | white | Honda | Odyssey | in | spot | D3.", "Tai yra | — | baltas | Honda | Odyssey | — | vietoje | D3.", "Tai baltas Honda Odyssey, vietoje D3.",
      { say: "It's the white Honda Odyssey in spot D three.", flags: { 5: "“in”: the locative vietoje carries it (C-CASE-DASH)." } })],
    lot_where: [t("The | lot | is | right | outside, | on | the | left.", "— | Aikštelė | yra | tiesiai | lauke, | — | — | kairėje.", "Aikštelė – tiesiai lauke, kairėje.",
      { flags: { 5: "“on the left”: the locative kairėje carries “on”." } })],
    check_car: [
      t("Take a look around | the | car | before | you | go. | If | you | see | any | scratches, | just | let us know.",
        "Apžiūrėkite | — | automobilį | prieš | jums | išvažiuojant. | Jei | jūs | pamatysite | kokių nors | įbrėžimų, | tiesiog | praneškite mums.",
        "Prieš išvažiuodami apžiūrėkite automobilį. Jei pamatysite įbrėžimų, tiesiog praneškite mums.",
        { flags: { 4: "“you go”: Lithuanian uses the dative + participle construction jums išvažiuojant." } }),
    ],
    scratch_info: [t("Just | take | a | photo | and | show | us | when | you | get back.", "Tiesiog | padarykite | — | nuotrauką | ir | parodykite | mums | kai | jūs | grįšite.",
      "Tiesiog nufotografuokite ir parodykite mums, kai grįšite.")],
    anything_else: [
      t("Anything | else | I | can | do | for you?", "Ką nors | daugiau | aš | galiu | padaryti | jums?", "Ar dar kuo nors galiu padėti?"),
    ],
    drive_safe: [
      t("Have | a | great | trip!", "Linkiu | — | puikios | kelionės!", "Geros kelionės!"),
      t("Drive | safe!", "Vairuokite | atsargiai!", "Saugaus kelio!"),
      t("Enjoy | the | car, | and | drive | safe!", "Mėgaukitės | — | automobiliu, | ir | vairuokite | atsargiai!", "Mėgaukitės automobiliu ir saugaus kelio!"),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("Perfect.", "Puiku.", "Puiku.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    which_extra: [t("Sure! | What | do | you | need?", "Žinoma! | Ko | — | jums | reikia?", "Žinoma! Ko jums reikia?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “need”)." } })],
  },

  domains: {
    price: () => {
      const s = new Set<number>([FULL_COVERAGE, UPGRADE, DROP_FEE]);
      for (const e of [...SIZES, ...EXTRAS]) s.add(e.attrs!.rate);
      return [...s].sort((a, b) => a - b);
    },
    deposit: () => [DEPOSIT],
  },

  hints: {
    pickup: {
      lt: "Pasakyti, kad esi užsisakęs automobilį",
      items: [
        { id: "have_resv", s: t("I | have | a | reservation.", "Aš | turiu | — | rezervaciją.", "Turiu rezervaciją.") },
        { id: "booked", s: t("Hi, | I've | booked | a | car | online.", "Sveiki, | aš esu | {m:užsisakęs|f:užsisakiusi} | — | automobilį | internetu.", "Sveiki, esu {m:užsisakęs|f:užsisakiusi} automobilį internetu.",
          { flags: { 1: "“I've” (perfect): the auxiliary is carried by esu + the participle (linked to “booked”)." } }) },
        { id: "pick_up", s: t("I'm | here | to pick up | my | car.", "Aš esu | čia | kad atsiimčiau | savo | automobilį.", "Atvykau atsiimti savo automobilio.") },
      ],
    },
    walkin: {
      lt: "Išsinuomoti automobilį be rezervacijos",
      items: [
        { id: "rent", s: t("I'd like | to rent | a | car, | please.", "Norėčiau | išsinuomoti | — | automobilį, | prašau.", "Norėčiau išsinuomoti automobilį.") },
        { id: "no_resv", s: t("I | don't have | a | reservation.", "Aš | neturiu | — | rezervacijos.", "Neturiu rezervacijos.") },
        { id: "rent_have", s: t("Do | you | have | any | cars | available?", "Ar | jūs | turite | kokių nors | automobilių | laisvų?", "Ar turite laisvų automobilių?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    name: {
      lt: "Pasakyti pavardę",
      items: [
        { id: "name_its", s: t("It's | {$surname}.", "Tai | {$surname}.", "{$surname}."), note: "Pasakykite pavardę, kuria užsakėte automobilį." },
        { id: "name_its", s: t("My | last name | is | {$surname}.", "Mano | pavardė | yra | {$surname}.", "Mano pavardė – {$surname}.") },
      ],
    },
    spell: {
      lt: "Pasakyti pavardę paraidžiui",
      items: [
        { id: "spell", s: t("It's | {$letters}.", "Tai | {$letters}.", "{$letters}."), note: "Paraidžiui: pasakykite pavardės raides angliškai." },
        { id: "spell", s: t("{$letters}.", "{$letters}.", "{$letters}.") },
      ],
    },
    size: {
      lt: "Pasirinkti automobilio dydį", slot: "size", examples: ["compact", "economy", "midsize", "suv"],
      items: [
        { id: "size_short", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "size_want", s: t("I'd like | {X.np}, | please.", "Norėčiau | {X.np:gen}, | prašau.", "Norėčiau {X.np:gen}.") },
      ],
    },
    days: {
      lt: "Pasakyti, kelioms dienoms",
      items: [
        { id: "days", s: t("For | three | days.", "— | Trims | dienoms.", "Trims dienoms.", { flags: { 0: "“For”: the dative trims dienoms carries it (C-CASE-DASH, “three” intervenes)." } }) },
        { id: "days", s: t("For a week.", "Savaitei.", "Savaitei.") },
      ],
    },
    docs: {
      lt: "Paduoti dokumentus",
      items: [
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "here_license", s: t("Here's | my | driver's | license.", "Štai | mano | vairuotojo | pažymėjimas.", "Štai mano vairuotojo pažymėjimas.") },
        { id: "q_license", s: t("Is | my | Lithuanian | license | okay?", "Ar | mano | lietuviškas | pažymėjimas | tinka?", "Ar tinka mano lietuviškas pažymėjimas?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka carries the verb (linked to “okay”)." } }) },
      ],
    },
    upgrade: {
      lt: "Atsakyti dėl didesnio automobilio",
      items: [
        { id: "keep_size", s: t("No, | thanks. | The | compact | is fine.", "Ne, | ačiū. | — | Kompaktiškas | tinka.", "Ne, ačiū. Kompaktiškas tinka.") },
        { id: "upgrade_yes", s: t("Sure, | I'll upgrade.", "Žinoma, | imsiu didesnį.", "Žinoma, imsiu didesnį automobilį.") },
      ],
    },
    insurance: {
      lt: "Pasirinkti draudimą",
      items: [
        { id: "ins_basic", s: t("Just | the | basic, | please.", "Tik | — | bazinį, | prašau.", "Tik bazinį draudimą, prašau.") },
        { id: "ins_full", s: t("I'll take | full | coverage, | please.", "Imsiu | visišką | draudimą, | prašau.", "Imsiu visišką draudimą.") },
        { id: "q_cover", s: t("What | does | it | cover?", "Ką | — | jis | apima?", "Ką jis apima?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “cover”)." } }) },
        { id: "q_ins_included", s: t("Is | insurance | included?", "Ar | draudimas | įskaičiuotas?", "Ar draudimas įskaičiuotas?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here (linked to “included”)." } }) },
        { id: "ins_card", s: t("My | credit | card | covers | it.", "Mano | kredito | kortelė | padengia | tai.", "Draudimą suteikia mano kredito kortelė.") },
      ],
    },
    deposit: {
      lt: "Sutikti arba paklausti apie užstatą",
      items: [
        { id: "ok_ack", s: t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.") },
        { id: "q_deposit_back", s: t("When | do | I | get | it | back?", "Kada | — | aš | atgausiu | jį | —?", "Kada jį atgausiu?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “get”).", 5: "“back” (get … back): the prefix at- of atgausiu carries it." } }) },
      ],
    },
    fuel: {
      lt: "Atsakyti dėl degalų",
      items: [
        { id: "full_to_full", s: t("I'll bring | it | back | full.", "Grąžinsiu | jį | atgal | su pilnu baku.", "Grąžinsiu su pilnu baku.") },
        { id: "q_gas_station", s: t("Is | there | a | gas station | nearby?", "Ar yra | — | — | degalinė | netoliese?", "Ar netoliese yra degalinė?", { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "prepay", s: t("I'd like | to prepay.", "Norėčiau | iš anksto sumokėti.", "Norėčiau už degalus sumokėti iš anksto.") },
      ],
    },
    sign: {
      lt: "Pasirašyti sutartį",
      items: [
        { id: "ok_ack", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "q_sign", s: t("Where | do | I | sign?", "Kur | — | aš | pasirašau?", "Kur pasirašyti?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “sign”)." } }) },
      ],
    },
    questions: {
      lt: "Pasitikslinti sąlygas",
      items: [
        { id: "q_mileage", s: t("Is | there | a | mileage | limit?", "Ar yra | — | — | ridos | apribojimas?", "Ar yra ridos apribojimas?", { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "q_automatic", s: t("Is | it | an | automatic?", "Ar | tai | — | automatinė?", "Ar automobilis su automatine pavarų dėže?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
        { id: "q_fuel", s: t("Do | I | need | to bring | it | back | full?", "Ar | man | reikia | grąžinti | jį | atgal | pilną?", "Ar reikia grąžinti su pilnu baku?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "q_deposit", s: t("Is | there | a | deposit?", "Ar yra | — | — | užstatas?", "Ar reikia užstato?", { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "q_deposit_back", s: t("When | do | I | get | it | back?", "Kada | — | aš | atgausiu | jį | —?", "Kada jį atgausiu?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “get”).", 5: "“back” (get … back): the prefix at- of atgausiu carries it." } }) },
        { id: "q_gas_station", s: t("Is | there | a | gas station | nearby?", "Ar yra | — | — | degalinė | netoliese?", "Ar netoliese yra degalinė?", { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
      ],
    },
    extras: {
      lt: "Papildomi dalykai", slot: "extra", examples: ["gps", "child_seat"],
      items: [
        { id: "extra_phone", s: t("No, | thanks. | I'll use | my | phone.", "Ne, | ačiū. | Naudosiu | savo | telefoną.", "Ne, ačiū. Naudosiu telefoną.") },
        { id: "extra_want", s: t("Can | I | get | a | {X}?", "Ar galiu | aš | gauti | — | {X:acc}?", "Ar galiu gauti {X:acc}?") },
      ],
    },
    ret: {
      lt: "Patvirtinti ar pasitikslinti grąžinimą",
      items: [
        { id: "yes_right", s: t("Yes, | that's | right.", "Taip, | tai | teisinga.", "Taip, teisingai.") },
        { id: "q_airport", s: t("Can | I | return | it | at the airport?", "Ar galiu | aš | grąžinti | jį | oro uoste?", "Ar galiu jį grąžinti oro uoste?") },
        { id: "q_late", s: t("What | if | I'm | late?", "O | jei | aš | vėluosiu?", "O jei vėluosiu?",
          { flags: { 0: "“What” (what if): o carries the question (linked to “if”).", 2: "“I'm … late” = vėluosiu: the copula has no separate word (linked to “late”)." } }) },
        { id: "q_return", s: t("When | do | I | need | to return | it?", "Kada | — | man | reikia | grąžinti | jį?", "Kada reikia jį grąžinti?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “need”)." } }) },
        { id: "keep_until", s: t("Could | I | keep | it | until | Saturday?", "Ar galėčiau | aš | pasilikti | jį | iki | šeštadienio?", "Ar galėčiau jį pasilikti iki šeštadienio?") },
      ],
    },
    car: {
      lt: "Paklausti apie automobilį",
      items: [
        { id: "q_where_car", s: t("Where's | the | car?", "Kur yra | — | automobilis?", "Kur automobilis?") },
        { id: "q_scratch", s: t("What | if | I | see | a | scratch?", "O | jei | aš | pamatysiu | — | įbrėžimą?", "O jei pamatysiu įbrėžimą?",
          { flags: { 0: "“What” (what if): o carries the question (linked to “if”)." } }) },
        { id: "q_automatic", s: t("Is | it | an | automatic?", "Ar | tai | — | automatinė?", "Ar automobilis su automatine pavarų dėže?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "how's it going": { reason: "lexical_expression", split: "How's → kaip yra, it → tai, going → einantis is a literal reading of a set greeting (= kaip sekasi).", minimal: "Set phrase." },
    "picking up": { reason: "lexical_expression", split: "picking → renkantis + up → aukštyn is false; to pick up a car = atsiimti.", minimal: "Two words (C-PHR)." },
    "to pick up": { reason: "lexical_expression", split: "to → į, pick → rinkti, up → aukštyn is false; here purpose + phrasal verb = kad atsiimčiau.", minimal: "Infinitive and particle (C-INF + C-PHR)." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking for a number = kiek.", minimal: "Two words, both needed." },
    "we're out of": { reason: "lexical_expression", split: "we're → mes esame, out → lauke, of → — is false; “be out of something” = baigėsi.", minimal: "The noun stays outside." },
    "i'm giving": { reason: "grammatical_fusion", split: "I'm → aš esu + giving → duodantis gives a false stative reading; Lithuanian uses one finite verb.", minimal: "Two words (C-PROG)." },
    "gas station": { reason: "lexical_expression", split: "gas → dujos/benzinas + station → stotis is false; = degalinė.", minimal: "Two words, one noun." },
    "let us know": { reason: "lexical_expression", split: "let → leiskite, us → mums, know → žinoti is a calque; = praneškite mums.", minimal: "Three words form the request." },
    "get back": { reason: "lexical_expression", split: "get → gauti + back → atgal is false; to return = grįžti.", minimal: "Two words (C-PHR)." },
    "harbor car rental": { reason: "lexical_expression", split: "A company name; harbor → uostas, car → automobilis, rental → nuoma would translate a proper name.", minimal: "One name." },
    "last name": { reason: "lexical_expression", split: "last → paskutinis + name → vardas is false; = pavardė.", minimal: "Two words, one noun." },
    "first name": { reason: "lexical_expression", split: "first → pirmas + name → vardas is a calque; = vardas.", minimal: "Two words, one noun." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "take a look around": { reason: "lexical_expression", split: "take → imkite, a → —, look → žvilgsnį, around → aplink is a calque; = apžiūrėkite.", minimal: "The four words form the request." },
    "5 pm": { reason: "lexical_expression", split: "5 → 5 + PM → po pietų: Lithuanian writes the 24-hour time (17 val.).", minimal: "A clock time." },
    "all right": { reason: "lexical_expression", split: "all → visi + right → teisingas is false; acknowledgement = gerai.", minimal: "Two words (C-LEX)." },
    "i'll switch": { reason: "grammatical_fusion", split: "I'll → aš + switch → keisti drops “will”; the Lithuanian future is the verb ending (pakeisiu).", minimal: "Object stays outside (C-FUT)." },
    "drop-off": { reason: "lexical_expression", split: "One hyphenated word in English; drop → numesti + off → nuo is false; = grąžinimas kitoje vietoje.", minimal: "One word." },
  },

  mission: [
    { lt: "Pasakyk apie rezervaciją", done: (c) => c.s.resv !== undefined || !!c.s.walkin },
    { step: "name", lt: "Pasakyk pavardę", optional: true },
    { step: "size", lt: "Pasirink automobilį", optional: true },
    { step: "license", lt: "Paduok pažymėjimą ir kortelę" },
    { step: "insurance", lt: "Pasirink draudimą" },
    { lt: "Išsiaiškink užstatą ir grąžinimą", done: (c) => !!c.s.depositTold && !!c.s.retTold },
    { lt: "Pasirašyk ir pasiimk raktus", done: (c) => !!c.s.keysGiven },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "resv", when: (c) => !c.s.walkin, done: (c) => c.s.resv !== undefined,
      ask: (c) => {
        if (!c.s.greeted) {
          c.s.greeted = true;
          if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
          c.say("greet"); return;
        }
        c.say("ask_resv");
      },
      expects: ["have_resv", "rent_walkin", "resv_no_ctx", "name_ctx"],
      suggest: [{ lt: "Pasakyti, kad esi užsisakęs automobilį", hint: "pickup" }, { lt: "Išsinuomoti automobilį be rezervacijos", hint: "walkin" }],
      yes: (c) => { c.s.resv = true; },
      no: (c) => { c.s.resv = false; c.s.walkin = true; c.say("walkin_ok"); } },
    { id: "name", when: (c) => c.s.resv === true, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Pasakyti pavardę", hint: "name" }] },
    { id: "spell", when: (c) => c.s.resv === true && !!c.s.name && c.s.askSpell && !c.s.spelled, done: (c) => !!c.s.spelled,
      ask: (c) => c.say("ask_spell"), expects: ["letters_ctx", "name_ctx"],
      suggest: [{ lt: "Pasakyti pavardę paraidžiui", hint: "spell" }] },
    { id: "size", when: (c) => !!c.s.walkin, done: (c) => !!c.s.size,
      ask: (c) => c.say("ask_size"), expects: ["size_ctx", "sizes_q"],
      suggest: [{ lt: "Pasirinkti automobilio dydį", hint: "size", options: "size" }],
      help: (c) => { c.say("size_list"); } },
    { id: "days", when: (c) => !!c.s.walkin && !!c.s.size, done: (c) => !!c.s.days,
      ask: (c) => c.say("ask_days"), expects: ["days_ctx"],
      suggest: [{ lt: "Pasakyti, kelioms dienoms", hint: "days" }] },
    { id: "license", when: (c) => !!c.s.name || (!!c.s.walkin && !!c.s.days), done: (c) => !!c.s.docs,
      ask: (c) => {
        if (c.s.resv && !c.s.foundSaid) {
          c.s.foundSaid = true;
          if (c.s.firstNameTwist && !c.s.twistDone) { c.s.twistDone = true; c.twist("first_name"); c.say("not_found"); c.say("found_first"); c.say("found_details"); }
          else c.say("found");
        }
        if (c.s.walkin && !c.s.rateSaid) { c.s.rateSaid = true; c.say("rate_is", { price: byId(size(c)).attrs!.rate }); }
        c.say("ask_docs");
      },
      expects: ["here_docs", "license_q"],
      suggest: [{ lt: "Paduoti vairuotojo pažymėjimą ir kortelę", hint: "docs" }],
      yes: (c) => { c.s.docs = true; c.say("docs_ok"); } },
    { id: "free_up", when: (c) => !!c.s.docs && size(c) === "compact" && c.s.freeUpgrade && c.s.upgrade === undefined, done: (c) => c.s.upgrade !== undefined,
      ask: (c) => { c.twist("free_upgrade"); c.s.upgrade = "free"; c.s.size = "midsize"; c.say("free_upgrade"); },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    { id: "upgrade", when: (c) => !!c.s.docs && size(c) === "compact" && c.s.askUpgrade && !c.s.freeUpgrade && c.s.upgrade === undefined, done: (c) => c.s.upgrade !== undefined,
      ask: (c) => c.say("ask_upgrade"),
      expects: ["keep_size", "upgrade_yes", "polite_no_ctx"],
      suggest: [{ lt: "Atsisakyti arba sutikti su didesniu automobiliu", hint: "upgrade" }],
      yes: (c) => { c.s.upgrade = "paid"; c.s.size = "midsize"; c.say("upgrade_ok"); },
      no: (c) => { c.s.upgrade = "no"; c.say("no_problem"); } },
    { id: "insurance", when: (c) => !!c.s.docs, done: (c) => !!c.s.ins,
      ask: (c) => c.say("ask_insurance", { price: FULL_COVERAGE }),
      expects: ["ins_full", "ins_basic", "ins_own", "ins_what", "ins_no_ctx", "polite_no_ctx"],
      suggest: [{ lt: "Pasirinkti draudimą", hint: "insurance" }],
      yes: (c) => { c.s.ins = "full"; c.say("ins_full_ok"); },
      no: (c) => { c.s.ins = "basic"; c.say("ins_basic_ok"); } },
    { id: "deposit", when: (c) => !!c.s.ins, done: (c) => !!c.s.depositTold,
      ask: (c) => { c.s.depositTold = true; c.say("deposit", { deposit: DEPOSIT }); },
      expects: ["deposit_q", "ok_ack"],
      suggest: [{ lt: "Sutikti arba paklausti, kada atgausi užstatą", hint: "deposit" }, { lt: "Paklausti apie sąlygas", hint: "questions" }] },
    { id: "fuel", when: (c) => !!c.s.depositTold, done: (c) => !!c.s.fuelTold,
      ask: (c) => {
        c.s.fuelTold = true;
        c.say("fuel");
        if (c.s.askPrepay) { c.s.prepayAsked = true; c.say("ask_prepay"); }
      },
      expects: ["fuel_full", "prepay_yes", "fuel_q", "ok_ack", "mileage_q", "polite_no_ctx"],
      suggest: [{ lt: "Pažadėti grąžinti su pilnu baku", hint: "fuel" }, { lt: "Paklausti apie sąlygas", hint: "questions" }],
      yes: (c) => { if (c.s.prepayAsked) { c.s.fuel = "prepaid"; c.say("prepay_ok"); } },
      no: (c) => { if (c.s.prepayAsked) { c.s.fuel = "full"; c.say("full_ok"); } } },
    { id: "extras", when: (c) => !!c.s.fuelTold && c.s.askExtras && c.s.extras === undefined, done: (c) => c.s.extras !== undefined,
      ask: (c) => c.say("ask_extras"), expects: ["extras_yes", "extras_no", "polite_no_ctx"],
      suggest: [{ lt: "Atsakyti, ar reikia GPS ar vaikiškos kėdutės", hint: "extras", options: "extra" }],
      yes: (c) => { c.s.extras = []; c.say("which_extra"); c.hold(); },
      no: (c) => { c.s.extras = []; c.say("no_extras"); } },
    { id: "ret", when: (c) => !!c.s.fuelTold, done: (c) => !!c.s.retTold,
      ask: (c) => {
        c.s.retTold = true;
        if (c.s.retDay && c.s.retDay !== "friday") c.say("ret_confirm_day", { X: c.s.retDay });
        else c.say("ret_confirm");
      },
      expects: ["ret_change", "ret_q", "ok_ack", "yes_right", "ret_day_ctx"],
      suggest: [{ lt: "Patvirtinti grąžinimo laiką", hint: "ret" }],
      yes: () => { /* confirmed */ },
      no: (c) => { c.say("ret_answer"); } },
    { id: "sign", when: (c) => !!c.s.retTold, done: (c) => !!c.s.signed,
      ask: (c) => { c.say("ask_sign"); },
      expects: ["sign_q", "ok_ack", "here_docs", "sign_where_ctx"],
      suggest: [{ lt: "Pasirašyti sutartį", hint: "sign" }],
      yes: (c) => { sign(c); },
      no: (c) => { c.say("sign_where"); c.hold(); } },
    // Two variants of the same moment: Jake says where the car is (keys_spot) or not (keys → ask him).
    { id: "keys", when: (c) => !!c.s.signed && !c.s.tellSpot, done: (c) => !!c.s.keysGiven,
      ask: (c) => giveKeys(c),
      expects: ["where_car", "scratch_q", "ok_ack", "where_car_ctx"],
      suggest: [{ lt: "Paklausti, kur automobilis", hint: "car" }, { lt: "Padėkoti", hint: "g_social" }] },
    { id: "keys_spot", when: (c) => !!c.s.signed && !!c.s.tellSpot, done: (c) => !!c.s.keysGiven,
      ask: (c) => giveKeys(c),
      expects: ["where_car", "scratch_q", "ok_ack", "where_car_ctx"],
      suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }, { lt: "Paklausti apie automobilį", hint: "car" }] },
    { id: "anything", when: (c) => !!c.s.keysGiven && !c.s.spotKnown, done: (c) => !!c.s.spotKnown,
      ask: (c) => c.say("anything_else"),
      expects: ["where_car", "more_no", "scratch_q", "where_car_ctx"],
      suggest: [{ lt: "Paklausti, kur automobilis", hint: "car" }],
      no: (c) => { c.s.spotKnown = true; c.say("ack"); c.say(byId(size(c)).attrs!.car); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.3);
    c.s.askSpell = c.chance(0.5);
    c.s.askUpgrade = c.chance(0.45);
    c.s.askPrepay = c.chance(0.4);
    c.s.askExtras = c.chance(0.5);
    c.s.tellSpot = c.chance(0.5);
    c.s.freeUpgrade = c.visits >= 1 && c.chance(0.3);
    c.s.firstNameTwist = c.visits >= 1 && !c.s.freeUpgrade && c.chance(0.3);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    have_resv(c, slots) {
      if (c.s.resv !== undefined) return;
      c.s.resv = true;
      if (slots.name) { c.s.name = slots.name; }
    },
    rent_walkin(c, slots, seg) {
      if (c.s.resv === true) return;
      c.s.resv = false; c.s.walkin = true;
      if (typeof slots.number === "number" && slots.number > 0 && slots.number <= 30) c.s.days = slots.number;
      if (slots.ndays && Number(slots.ndays) > 0) c.s.days = Number(slots.ndays);
      const tags = allTags(slots, seg);
      if (tags.includes("week")) c.s.days = 7;
      if (tags.includes("weekend")) c.s.days = 2;
      c.say("walkin_ok");
    },
    resv_no_ctx(c) {
      if (c.s.resv !== undefined) return;
      c.s.resv = false; c.s.walkin = true;
      c.say("walkin_ok");
    },
    name_ctx(c, slots) {
      if (c.step === "spell") { c.s.spelled = true; c.say("ack"); return; }
      if (c.s.name || !slots.name) return;
      c.s.resv = true; c.s.name = slots.name;
      if (slots.letters) c.s.spelled = true;
    },
    letters_ctx(c, slots) {
      if (!c.s.name) { c.s.resv = true; c.s.name = String(slots.letters ?? "").toUpperCase() || "—"; c.s.spelled = true; return; }
      c.s.spelled = true;
    },
    here_docs(c) {
      if (c.step === "sign") { sign(c); return; }
      if (c.s.docs) return;
      if (c.step === "license" || c.s.name || c.s.days) { c.s.docs = true; c.say("docs_ok"); }
    },
    license_q(c) { c.say("license_fine"); },
    size_ctx(c, slots) {
      if (!c.s.walkin) { if (slots.size && c.s.resv === undefined) { c.s.walkin = true; c.s.resv = false; } else return; }
      c.s.size = slots.size;
    },
    days_ctx(c, slots, seg) {
      const tags = allTags(slots, seg);
      if ((c as any).__daysSet) return; // "for" + "three days" may come as two segments
      (c as any).__daysSet = true;
      let n = daysFromText(c.heard) ?? (slots.ndays ? Number(slots.ndays) : undefined);
      if (tags.includes("week")) n = 7;
      if (tags.includes("twoweeks")) n = 14;
      if (tags.includes("weekend")) n = 2;
      if (tags.includes("one")) n = 1;
      if (!n && slots.day) n = 3;
      if (n && n > 0 && n <= 30) c.s.days = n;
    },
    ins_full(c) { if (!c.s.ins && c.s.docs) { c.s.ins = "full"; c.say("ins_full_ok"); } },
    ins_basic(c) { if (!c.s.ins && c.s.docs) { c.s.ins = "basic"; c.say("ins_basic_ok"); } },
    ins_own(c) { if (!c.s.ins && c.s.docs) { c.s.ins = "card"; c.say("ins_card_ok"); } },
    ins_no_ctx(c) { if (!c.s.ins && c.s.docs) { c.s.ins = "basic"; c.say("ins_basic_ok"); } },
    ins_what(c) {
      if (/\b(included|include)\b/i.test(c.heard)) c.say("ins_included");
      else if (/\bhow much\b/i.test(c.heard)) c.say("extra_price", { price: FULL_COVERAGE });
      else c.say("cover_info");
    },
    deposit_q(c) {
      if (/\bback\b|\breleased\b|\brefund/i.test(c.heard)) { c.say("deposit_back"); return; }
      c.s.depositTold = true;
      c.say("deposit", { deposit: DEPOSIT });
    },
    fuel_q(c) {
      if (/\bstation\b|\bwhere\b/i.test(c.heard)) { c.say("gas_station"); return; }
      c.s.fuelTold = true; c.say("fuel");
    },
    fuel_full(c) { if (!c.s.fuel) { c.s.fuel = "full"; c.say("full_ok"); } },
    prepay_yes(c) { if (!c.s.fuel) { c.s.fuel = "prepaid"; c.say("prepay_ok"); } },
    mileage_q(c) { c.say("mileage"); },
    auto_q(c) { c.say("automatic"); if (/\b(manual|stick)\b/i.test(c.heard)) c.tip(TIPS.manual); },
    extras_yes(c, slots, seg) {
      c.s.extras ??= [];
      // "Both, please": the GPS and the child seat
      if (allTags(slots, seg).includes("both")) {
        for (const x of ["gps", "child_seat"]) if (!c.s.extras.includes(x)) c.s.extras.push(x);
        c.say("extra_price", { price: byId("gps").attrs!.rate + byId("child_seat").attrs!.rate });
        return;
      }
      const id = (Array.isArray(slots.extra) ? slots.extra[0] : slots.extra) as string | undefined;
      if (id && !c.s.extras.includes(id) && !/\bhow much\b/i.test(c.heard)) c.s.extras.push(id);
      if (id) c.say("extra_price", { price: byId(id).attrs!.rate });
      if (/sat ?nav/i.test(c.heard)) c.tip(TIPS.uk_satnav);
    },
    extras_no(c) { if (c.s.extras === undefined) { c.s.extras = []; c.say("no_extras"); } },
    ret_change(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("airport")) { c.s.retPlace = "airport"; c.say("ret_airport", { price: DROP_FEE }); return; }
      // "Can I keep it one more day?": Saturday instead of Friday
      if (tags.includes("extra_day")) { const next = DAY_IDS[(DAY_IDS.indexOf(c.s.retDay ?? "friday") + 1) % 7]; c.s.retDay = next; c.say("ret_changed", { X: next }); return; }
      if (slots.day && DAY_IDS.includes(slots.day)) { c.s.retDay = slots.day; c.say("ret_changed", { X: slots.day }); return; }
      c.say("ret_answer");
    },
    ret_day_ctx(c, slots, seg) {
      if (slots.day === "friday" || !slots.day || !DAY_IDS.includes(slots.day)) { rental.handlers.yes_right(c, slots, seg); return; }
      rental.handlers.ret_change(c, slots, seg);
    },
    ret_q(c) {
      if (/\blate\b|\bgrace\b/i.test(c.heard)) { c.say("late_info"); return; }
      if (/\bwhere\b/i.test(c.heard)) { c.say("ret_where"); return; }
      c.s.retTold = true;
      if (c.s.retDay && c.s.retDay !== "friday") c.say("ret_confirm_day", { X: c.s.retDay }); else c.say("ret_answer");
    },
    sign_q(c) { c.say("sign_where"); if (c.step === "sign") sign(c); },
    sign_where_ctx(c) { rental.handlers.sign_q(c, {}, { intent: "sign_q", slots: {}, tags: [] }); },
    where_car(c) {
      if (!c.s.keysGiven) { c.say("lot_where"); return; }
      c.s.spotKnown = true;
      c.say(byId(size(c)).attrs!.car);
      if (c.chance(0.5)) c.say("lot_where");
    },
    scratch_q(c) { c.say("scratch_info"); },
    where_car_ctx(c, slots, seg) { rental.handlers.where_car(c, slots, seg); },
    price_q(c, slots) {
      // "How much more?" about the upgrade
      if (c.step === "upgrade" && /\b(more|extra)\b/i.test(c.heard)) { c.say("rate_is", { price: UPGRADE }); return; }
      c.say("rate_is", { price: byId((slots.size as string) || size(c)).attrs!.rate });
    },
    sizes_q(c) { c.say("size_list"); },
    polite_no_ctx(c) { rental.steps.find((x) => x.id === c.step)?.no?.(c); },
    more_no(c) {
      if (c.step === "anything" && !c.s.spotKnown) { c.s.spotKnown = true; c.say("ack"); c.say(byId(size(c)).attrs!.car); }
      if (c.step === "extras" && c.s.extras === undefined) { c.s.extras = []; c.say("no_extras"); }
    },
    keep_size(c, slots, seg) {
      // "I'll take the midsize" is a yes to the upgrade
      if (slots.size === "midsize") { rental.handlers.upgrade_yes(c, slots, seg); return; }
      if (c.step === "upgrade" && c.s.upgrade === undefined) { c.s.upgrade = "no"; c.say("no_problem"); }
    },
    upgrade_yes(c) {
      if (c.s.upgrade === undefined && size(c) === "compact") { c.s.upgrade = "paid"; c.s.size = "midsize"; c.say("upgrade_ok"); }
    },
    yes_right(c) {
      // "Yes, that's right." (the global yes/no layer has no "yes" + "that's right")
      const st = rental.steps.find((x) => x.id === c.step);
      if (st?.yes) st.yes(c);
    },
    ok_ack(c) {
      // "Okay / sure / sounds good": agreement with what Jake just said.
      if (c.step === "sign") sign(c);
      if (c.step === "fuel" && c.s.prepayAsked && !c.s.fuel) { c.s.fuel = "full"; c.say("full_ok"); }
    },
  },

  finish: (c) => {
    c.complete();
    c.say("drive_safe");
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    { say: "No, we don't.", intent: "resv_no_ctx", step: "resv" },
    { say: "Hi, I've booked a car online.", intent: "have_resv" },
    { say: "I have a reservation under Mikalauskas.", intent: "have_resv", slots: { name: "Mikalauskas" } },
    { say: "I'm here to pick up my car.", intent: "have_resv" },
    { say: "I'd like to rent a car, please.", intent: "rent_walkin" },
    { say: "We don't have a reservation.", intent: "rent_walkin", not: ["have_resv"] },
    { say: "Mikalauskas", intent: "name_ctx", step: "name" },
    { say: "My last name is Mikalauskas.", intent: "name_ctx", step: "name" },
    { say: "Mikalauskas", intent: "none" },
    { say: "M I K A L A U S K A S", intent: "letters_ctx", step: "spell" },
    { say: "Here's my driver's license.", intent: "here_docs" },
    { say: "Here's my driving licence.", intent: "here_docs" },
    { say: "Here you go.", intent: "here_docs", step: "license" },
    { say: "Is my Lithuanian license okay?", intent: "license_q" },
    { say: "A compact, please.", intent: "size_ctx", step: "size", slots: { size: "compact" } },
    { say: "An SUV", intent: "size_ctx", step: "size", slots: { size: "suv" } },
    { say: "For three days.", intent: "days_ctx", step: "days" },
    { say: "Five days", intent: "days_ctx", step: "days", slots: { ndays: "5" } },
    { say: "A week", intent: "days_ctx", step: "days" },
    { say: "I'll take full coverage, please.", intent: "ins_full", step: "insurance" },
    { say: "Just the basic, please.", intent: "ins_basic", step: "insurance" },
    { say: "I don't need extra insurance.", intent: "ins_basic", step: "insurance", not: ["ins_full"] },
    { say: "My credit card covers it.", intent: "ins_own" },
    { say: "What does it cover?", intent: "ins_what" },
    { say: "Is insurance included?", intent: "ins_what" },
    { say: "Is there a deposit?", intent: "deposit_q" },
    { say: "When do I get it back?", intent: "deposit_q" },
    { say: "Do I need to bring it back full?", intent: "fuel_q" },
    { say: "Is there a gas station nearby?", intent: "fuel_q" },
    { say: "Where's the nearest petrol station?", intent: "fuel_q" },
    { say: "I'll bring it back full.", intent: "fuel_full" },
    { say: "Is there a mileage limit?", intent: "mileage_q" },
    { say: "Is it an automatic?", intent: "auto_q" },
    { say: "Can I get a manual instead?", intent: "auto_q" },
    { say: "Can I get a GPS?", intent: "extras_yes", slots: { extra: "gps" } },
    { say: "A child seat, please.", intent: "extras_yes", step: "extras", slots: { extra: "child_seat" } },
    { say: "No, thanks. I'll use my phone.", intent: "extras_no", step: "extras" },
    { say: "I don't need a GPS.", intent: "extras_no", not: ["extras_yes"] },
    { say: "Can I return it at the airport?", intent: "ret_change" },
    { say: "Could I keep it until Saturday?", intent: "ret_change", slots: { day: "saturday" } },
    { say: "When do I need to return it?", intent: "ret_q" },
    { say: "What if I'm late?", intent: "ret_q" },
    { say: "Where do I sign?", intent: "sign_q" },
    { say: "No, thanks. The compact is fine.", intent: "keep_size", step: "upgrade" },
    { say: "Yes, that's right.", intent: "yes_right", step: "ret" },
    { say: "Where's the car?", intent: "where_car" },
    { say: "What if I see a scratch?", intent: "scratch_q" },
    { say: "the car is a banana window", intent: "none" },
    { say: "purple mileage sings loudly", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s71a-rental.json)
    { say: "Picking up my car", intent: "have_resv" },
    { say: "I booked with Expedia", intent: "have_resv" },
    { say: "I have a reservation number", intent: "have_resv", step: "resv", not: ["name_ctx"] },
    { say: "Is there a car available?", intent: "rent_walkin", step: "resv", not: ["name_ctx"] },
    { say: "No reservation", intent: "rent_walkin", step: "resv", not: ["name_ctx", "have_resv"] },
    { say: "I would like to hire a car", intent: "rent_walkin", step: "resv" },
    { say: "My surname is Mikalauskas", intent: "name_ctx", step: "name", slots: { name: "Mikalauskas" } },
    { say: "Here are my documents", intent: "here_docs", step: "license" },
    { say: "Can I use my Lithuanian license?", intent: "license_q" },
    { say: "No, the small one is fine", intent: "keep_size", step: "upgrade" },
    { say: "Yes, I'll take the midsize", intent: "upgrade_yes", step: "upgrade", not: ["keep_size"] },
    { say: "No upgrade, thanks", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "Basic, please", intent: "ins_basic", step: "insurance" },
    { say: "No, I don't need it", intent: "ins_no_ctx", step: "insurance", not: ["ins_full"] },
    { say: "What does full coverage include?", intent: "ins_what", step: "insurance", not: ["ins_full"] },
    { say: "My card covers rental cars", intent: "ins_own", step: "insurance" },
    { say: "How long until I get my money back?", intent: "deposit_q", step: "deposit" },
    { say: "No, I'll fill it myself", intent: "fuel_full", step: "fuel" },
    { say: "No GPS, thanks", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "Both, please", intent: "extras_yes", step: "extras" },
    { say: "Friday is good", intent: "yes_right", step: "ret" },
    { say: "No, on Saturday", intent: "ret_day_ctx", step: "ret", slots: { day: "saturday" } },
    { say: "Can I keep it one more day?", intent: "ret_change", step: "ret" },
    { say: "Sure, where?", intent: "sign_where_ctx", step: "sign" },
    { say: "Which car is mine?", intent: "where_car", step: "keys" },
    { say: "Something cheap", intent: "size_ctx", step: "size", slots: { size: "economy" } },
    { say: "What cars do you have?", intent: "sizes_q", step: "size" },
    { say: "How much is an SUV?", intent: "price_q", step: "size", slots: { size: "suv" }, not: ["size_ctx"] },
    { say: "Two weeks", intent: "days_ctx", step: "days" },
    // learner English
    { say: "I have reservation on name Mikalauskas", intent: "have_resv", slots: { name: "Mikalauskas" } },
    { say: "I no need GPS", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "Where I must sign?", intent: "sign_q", step: "sign" },
    { say: "Car is small, I want bigger", intent: "upgrade_yes", step: "upgrade" },
    { say: "No thank you, it's okay", intent: "polite_no_ctx", step: "insurance", not: ["ins_full"] },
    { say: "Full coverage would be too expensive", intent: "ins_basic", step: "insurance", not: ["ins_full"] },
    { say: "I don't want a child seat", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "A midsize would be nice", intent: "upgrade_yes", step: "upgrade" },
    { say: "Where is spot C2?", intent: "where_car", step: "keys" },
  ],

  sims: [
    { name: "reservation, basic insurance, asks deposit and return",
      turns: ["Hi, I've booked a car online.", "It's Mikalauskas.", "Here's my driver's license.", "Just the basic, please.", "When do I get it back?",
        "Okay.", "When do I need to return it?", "Sure.", "Where's the car?", "Thank you!"],
      auto: omit(AUTO, ["resv", "name", "license", "insurance"]), expect: { complete: true } },
    { name: "walk-in, SUV, full coverage, extras, airport",
      turns: ["Hello! I'd like to rent a car, please.", "An SUV, please.", "For five days.", "Here you go.", "What does it cover?", "I'll take full coverage.",
        "Okay.", "Is there a gas station nearby?", "I'll bring it back full.", "Can I return it at the airport?", "Where do I sign?", "Okay.", "Thanks!"],
      auto: omit(AUTO, ["resv", "size", "days", "license", "insurance"]), expect: { complete: true } },
    { name: "questions: license, automatic, mileage, keep it longer",
      turns: ["Hi, I have a reservation under Mikalauskas.", "Is my Lithuanian license okay?", "Here you go.", "Is it an automatic?", "Is there a mileage limit?",
        "My credit card covers it.", "Could I keep it until Saturday?", "Yes.", "What if I see a scratch?", "No, that's all. Thank you!"],
      auto: omit(AUTO, ["resv", "license", "insurance"]), expect: { complete: true } },
  ],
};

/** Number of days from the words said ("for four days", "3 days", "a week"). */
function daysFromText(heard: string): number | undefined {
  const W: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14 };
  const m = heard.toLowerCase().match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\s+days?\b/);
  if (m) return /\d/.test(m[1]) ? Number(m[1]) : W[m[1]];
  return undefined;
}

export default rental;
