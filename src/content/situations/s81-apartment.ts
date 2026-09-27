// Song 81 "Are the Bills Included?" → American: "Are Utilities Included?"
// Maple Street Apartments, the landlord Mr. Patel (formal: jūs). The learner views a
// one-bedroom apartment: asks about the rent, utilities, security deposit, lease, pets,
// parking and laundry, answers Mr. Patel's own questions (move-in date, how many people,
// pets) and decides: take it (ID, sign the lease, keys) or think about it.
// Returning players may instead come back as tenants to report a problem
// (twist: no heat / a leaking kitchen faucet → someone can come tomorrow at ten).
// A second twist: someone else is coming to see the apartment tomorrow.
//
// The learner's own gender: {m:…|f:…} (the player is the addressee in Mr. Patel's lines
// and the speaker in hints; both resolve to the player's gender).

import type { Ctx, EntityDef, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { readInt } from "../../convo/slots";
import type { SlotFn, SlotResult } from "../../convo/grammar";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_DOES_Q = "Question “Does” = the particle ar.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_ARE_Q = "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_WOULD = "“would” has no separate word: the conditional ending of the verb carries it (linked to “like”).";
const F_YOUD = "“'d” (would) is carried by the conditional ending of the verb (linked to the next unit).";
const F_THERE = "Existential “there” has no Lithuanian word; yra (under “Is”) carries it.";
const F_CONCORD = "Negative concord: nėra takes the ne- from “no” (C-CONCORD).";
const F_AT_CLOCK = "Clock “at”: the accusative dešimtą carries it.";
const F_A_PER = "Distributive “a” (a month) = per.";
const F_KNOW = "“know” is part of “let … know”; pranešti (under “let”) carries it.";

// ---------------------------------------------------------------------------
// Entities (used to compose Mr. Patel's answers about utilities and appliances)

const VANDUO = "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje";

const UTILITIES: EntityDef[] = [
  ent("water", "water", VANDUO, "m", { chip: "vanduo" }),
  ent("heat", "heat", "šildymas/šildymo/šildymui/šildymą/šildymu/šildyme", "m", { forms: ["heating", "the heat", "the heating", "heater"], chip: "šildymas" }),
  ent("hot_water", "hot | water", `karštas/karšto/karštam/karštą/karštu/karštame | ${VANDUO}`, "m", { chip: "karštas vanduo" }),
  ent("electricity", "electricity", "elektra/elektros/elektrai/elektrą/elektra/elektroje", "f",
    { forms: ["electric", "power", "the electricity", "the electric", "the electric bill", "electric bill", "electricity bill", "the power", "light", "lights"], chip: "elektra" }),
  ent("internet", "internet", "internetas/interneto/internetui/internetą/internetu/internete", "m",
    { forms: ["the internet", "wi fi", "wifi", "the wi fi", "the wifi", "cable", "cable tv"], chip: "internetas" }),
  ent("trash", "trash", "šiukšlių išvežimas/šiukšlių išvežimo/šiukšlių išvežimui/šiukšlių išvežimą/šiukšlių išvežimu/šiukšlių išvežime", "m",
    { forms: ["garbage", "trash pickup", "garbage pickup", "the trash", "the garbage", "trash collection"], chip: "šiukšlių išvežimas" }),
];
const INCLUDED = ["water", "heat", "hot_water", "trash"];

const APPLIANCES: EntityDef[] = [
  ent("fridge", "fridge", "šaldytuvas/šaldytuvo/šaldytuvui/šaldytuvą/šaldytuvu/šaldytuve", "m", { forms: ["refrigerator", "fridges"], attrs: { kitchen: true } }),
  ent("stove", "stove", "viryklė/viryklės/viryklei/viryklę/virykle/viryklėje", "f", { forms: ["oven", "an oven", "cooker", "gas stove"], attrs: { kitchen: true } }),
  ent("dishwasher", "dishwasher", "indaplovė/indaplovės/indaplovei/indaplovę/indaplove/indaplovėje", "f", { forms: ["dish washer"], attrs: { kitchen: true } }),
  ent("microwave", "microwave", "mikrobangų krosnelė/mikrobangų krosnelės/mikrobangų krosnelei/mikrobangų krosnelę/mikrobangų krosnele/mikrobangų krosnelėje", "f",
    { forms: ["microwave oven"] }),
  ent("washer", "washer", "skalbimo mašina/skalbimo mašinos/skalbimo mašinai/skalbimo mašiną/skalbimo mašina/skalbimo mašinoje", "f",
    { forms: ["washing machine", "washers", "washing machines", "washer and dryer", "a washer and dryer", "washer dryer"] }),
  ent("dryer", "dryer", "džiovyklė/džiovyklės/džiovyklei/džiovyklę/džiovykle/džiovyklėje", "f", { forms: ["dryers", "tumble dryer", "clothes dryer"] }),
  ent("ac", "AC", "kondicionierius/kondicionieriaus/kondicionieriui/kondicionierių/kondicionieriumi/kondicionieriuje", "m",
    { forms: ["a c", "air conditioning", "air conditioner", "air con", "an air conditioner", "central air"] }),
];

// ---------------------------------------------------------------------------
// Money amounts ("$1,300", "thirteen hundred", "1300 dollars"). The shared tokenizer turns
// "$1,300" into "1 dollars 300", so thousands written with a comma are read here.

const isDollar = (w?: string) => w === "dollars" || w === "dollar" || w === "bucks";
const amountSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  for (const r of readInt(tokens, pos)) {
    const v = r.value, i = r.end;
    out.push({ end: i, value: v });
    if (r.words) continue;
    if (isDollar(tokens[i]) && /^\d{3}$/.test(tokens[i + 1] ?? "")) out.push({ end: i + 2, value: v * 1000 + parseInt(tokens[i + 1], 10) });
    if (/^\d{3}$/.test(tokens[i] ?? "")) out.push({ end: i + 1, value: v * 1000 + parseInt(tokens[i], 10) });
    if (tokens[i] === "thousand" || tokens[i] === "k" || tokens[i] === "grand") out.push({ end: i + 1, value: v * 1000 });
  }
  return out;
};

// ---------------------------------------------------------------------------
// State helpers

type Topic = "rent" | "utilities" | "deposit" | "furnished" | "pets" | "lease" | "movein" | "parking" | "laundry"
  | "quiet" | "bus" | "floor" | "smoking" | "size" | "see" | "payrent" | "apply" | "landlord" | "lower";
const CORE: Topic[] = ["rent", "utilities", "deposit", "lease"];
const CORE_LINE: Record<string, string> = { rent: "rent_full", utilities: "utilities_all", deposit: "deposit_full", lease: "lease_full" };

const view = (c: Ctx) => c.s.mode === "view";

/** The learner asked about a topic: note it (and, if they skipped the greeting, let them in). */
function asked(c: Ctx, topic: Topic) {
  if (view(c) && !c.s.purpose) { c.s.purpose = true; c.say("come_in"); }
  if (!c.s.asked[topic]) c.s.qCount++;
  c.s.asked[topic] = true;
  if (c.s.qCount >= 2 && c.chance(0.15)) c.say("good_q");
}

/** Mr. Patel mentions the key terms the learner did not ask about. */
function volunteer(c: Ctx) {
  const missing = CORE.filter((k) => !c.s.asked[k]);
  if (!missing.length) return;
  c.say("fyi");
  for (const k of missing) { c.say(CORE_LINE[k]); c.s.asked[k] = true; }
}

/** "Yes, …" / "No, …" at the start of what the learner said. */
function ynLead(c: Ctx): "yes" | "no" | null {
  const h = c.heard.toLowerCase();
  if (/^\s*(yes|yeah|yep|sure|ok|okay|of course)\b/.test(h)) return "yes";
  if (/^\s*(no|nope|nah)\b/.test(h)) return "no";
  return null;
}

const AUTO: Record<string, string> = {
  purpose: "Hi, I'm here to see the apartment.", movein_q: "On the first, if possible.", movein_take: "On the first, if possible.", people_q: "It's just me.",
  how_many: "Just me.", pets_q: "No, I don't have any pets.", pet_which: "A cat.", questions: "No, that's all, thanks.",
  decision: "I'll take it!", docs: "Here's my passport.", sign: "Sure. Where do I sign?", hurry: "Okay, I'll call you tonight.",
  problem: "The heating isn't working.", visit: "Yes, I'll be home.", key_ok: "Yes, that's fine.", other_time: "After five, please.",
};

// ---------------------------------------------------------------------------

export const apartment: SituationDef = {
  id: "s81-apartment",
  song: 81,
  songTitle: "Are the Bills Included?",
  title: { en: "Are Utilities Included?", lt: "Ar komunaliniai įskaičiuoti?" },
  topic: { en: "Renting an apartment", lt: "Buto nuoma" },
  chapter: 3,
  order: 1,
  location: "apartments",
  npc: "patel",
  goal: "Apžiūrėk butą ir išsiaiškink nuomos sąlygas.",
  intro: "Daugiabutis Maple gatvėje. Savininkas ponas Patelis aprodo išnuomojamą vieno miegamojo butą antrame aukšte.",
  entities: { utility: UTILITIES, appliance: APPLIANCES },

  grammar: {
    macros: {
      apt: "(apartment | apartments | place | unit | studio | one bedroom | one bedroom apartment | flat #tip:uk_flat | room)",
      the_apt: "[the | this | your | that | my] @apt [on maple street | on maple | in this building]",
      incl: "(included | including | part of the rent | in the rent | included in the (rent | price) | in the price | inclusive)",
      // "utilities" and the words learners use for them (LT „komunaliniai mokesčiai“ → "communal payments")
      util_all: "(utilities | utility bills | utility costs | utility payments | communal (payments | fees | bills | services | charges | utilities | costs))",
      per_month: "((a | per | every | each | one | for a | for one | in a) month | monthly)",
      broken: "(is not working | does not work | is not on | will not turn on | stopped working | is broken | is not working properly | does not work properly | has stopped working | not working | broken | does not work anymore | is not working anymore | (is | are) off | broke | broke down | has broken | is broken down)",
      // where / since when (an optional detail after a problem)
      where_when: "(in the (kitchen | bathroom | bedroom | living room | apartment) | in my (apartment | kitchen | bathroom | room | bedroom) | at all | again | today | anymore | since (yesterday | this morning | last night | morning | the morning | {day}))",
      month: "(january | february | march | april | may | june | july | august | september | october | november | december)",
      when_mv: [
        "as soon as possible #h:asap", "asap", "right away", "immediately", "[right] now", "today", "tomorrow", "this weekend",
        "next (week | month | weekend) #h:next_month", "this month", "[at | in] the end of (the | this | next) month", "in a (week | month | couple of weeks | few weeks)",
        "in {number} (days | weeks | months)", "in (one | a) (day | week | month)", "[on | from | by] the (first | 1st) [of (the | next | this) month] #h:movein_first",
        "[on | from | by] {date}", "[on | from | by] the {ordinal} [of (the | next | this) month]", "{day}", "next {day}",
        "[at | in] the (beginning | start) of (the | this | next) month", "(beginning | start | end) of (this | next) month",
        "[in | from | by | early | late | (at the | in the) (beginning | start | end) of] @month", "the sooner the better",
        "from next (week | month)", "(early | late) (next | this) month", "[in] the middle of (next | this | the) month", "as soon as (i can | we can)", "as early as possible",
        "after (two | three | a couple of | a few | {number}) (days | weeks)", "after (a | one) (week | month)", "any day [(next | this) week]",
      ],
      fam: "(wife | husband | partner | girlfriend | boyfriend | son | daughter | kids | children | child | family | friend | baby | mother | father | mom | dad | sister | brother | two kids | two children | sons | daughters)",
      pet_desc: "(he | she | it | they) (is | are) [very | really | so] (quiet | small | friendly | calm | old | clean | nice | good | little | trained | well trained)",
      like_pre: "(i [really] (love | like) it [very much | a lot | so much] | it is (perfect | great | nice | lovely | beautiful | really nice | very nice | exactly what i need))",
      think_core: [
        "i need to think about it #h:think", "i (would like | want) to think about it", "(can | could) i think about it", "let me think about it",
        "(can | could) i let you know [tomorrow | later | tonight | {day}] #h:let_know", "i will (call you | let you know) [tomorrow | later | tonight | {day}]",
        "(can | could) i (tell you | call you | give you an answer | decide) [tomorrow | later | tonight | {day}]",
        "i need to (talk to | ask) my (wife | husband | partner | family)", "i think about it", "i (must | have to | need to | should) think [about it | a little | a bit | more]",
        "(let me | i will) get back to you [tomorrow | later | {day}]", "i need [some] [more] time [to think | to decide]", "i am not sure yet",
        "i (must | have to | need to | should | want to) (talk | speak) (to | with) my @fam [first | about it]", "i (must | have to | need to) discuss (it | this) with my @fam [first]",
        "i have (a few | some | a couple of | two | three) (other | more) (apartments | places | flats) to see", "i need to sleep on it", "(can | could) i sleep on it", "let me sleep on it", "i will think about it",
        "i (want | would like | need) to think (one more day | a little | a bit | a little bit | until tomorrow)", "i need (one more day | a day | a few days | a couple of days) [to think | to decide]",
        "i (need | want | would like) to see (other | more | some other | a few other | a few more | some more) (apartments | places) [first]", "give me (one | a | a few | two) (day | days | more days)",
        "let me (talk | speak) (to | with) my @fam [first]", "i (need | have) to talk it over with my @fam [first]", "i am not ready (to decide | to take it | yet) [yet]",
      ],
    },
    slots: {
      amount: { fn: amountSlot },
      pet: { lexicon: [
        { id: "cat", forms: ["cat", "cats", "kitten", "kitty", "two cats", "kittens", "small cat", "little cat", "old cat"] },
        { id: "dog", forms: ["dog", "dogs", "puppy", "small dog", "little dog", "small dogs", "old dog", "puppies"] },
        { id: "bigdog", forms: ["big dog", "large dog", "big dogs", "german shepherd", "labrador"] },
        { id: "other", forms: ["bird", "birds", "fish", "hamster", "rabbit", "parrot", "turtle", "guinea pig", "little fish", "small fish", "goldfish", "gold fish", "fishes", "hamsters", "rabbits", "snake", "lizard"] },
      ] },
      room: { lexicon: [
        { id: "bedroom", forms: ["bedroom", "bedrooms"] }, { id: "bathroom", forms: ["bathroom", "bathrooms", "restroom"] },
        { id: "kitchen", forms: ["kitchen"] }, { id: "living", forms: ["living room", "lounge"] }, { id: "closet", forms: ["closet", "closets"] },
        { id: "rest", forms: ["rest", "rest of the apartment", "other rooms", "whole apartment"] },
      ] },
      fix: { lexicon: [
        { id: "heat", forms: ["heating", "heat", "heater", "radiator", "radiators", "boiler", "thermostat"] },
        { id: "hotwater", forms: ["hot water", "water heater"] },
        { id: "faucet", forms: ["faucet", "kitchen faucet", "bathroom faucet", "sink", "kitchen sink", "bathroom sink", "pipe", "pipes"] },
        { id: "faucet", forms: ["tap", "kitchen tap", "bathroom tap"], tags: ["tip:uk_tap"] },
        { id: "toilet", forms: ["toilet"] },
        { id: "shower", forms: ["shower", "bathtub", "tub", "bath"] },
        { id: "appliance", forms: ["fridge", "refrigerator", "stove", "oven", "dishwasher", "washing machine", "washer", "dryer", "microwave"] },
        { id: "lights", forms: ["lights", "light", "electricity", "power", "outlet", "outlets"] },
        { id: "window", forms: ["window", "windows", "door", "front door", "lock", "door lock", "smoke alarm", "smoke detector"] },
      ] },
    },
  },

  intents: {
    // --- arriving -----------------------------------------------------------
    see_apartment: { patterns: [
      "[i am] here to (see | look at | view) @the_apt [for rent] #h:here_see",
      "i am here (about | for) @the_apt [for rent] #h:here_about",
      "i (came | have come) to (see | look at | view) @the_apt", "i (come | came | am coming) (about | for) @the_apt",
      "(i | we) would like to (see | look at | view) (@the_apt | it) #h:like_see",
      "(i | we) want to (see | look at | view) (@the_apt | it) #blunt",
      "(i | we) (would like | want) to rent @the_apt",
      "(can | could | may) (i | we) (see | look at | have a look at | take a look at) (@the_apt | it)",
      "i am (interested in | calling about) @the_apt [for rent]", "i am interested in renting @the_apt",
      "i am looking for (a | an) @apt [to rent | for rent]",
      "(i | we) spoke on the phone [yesterday] #h:spoke_phone",
      "i called [you] [yesterday] about @the_apt", "i (called | emailed | texted | wrote) [to] you [yesterday | this morning | last week | on {day}]",
      "(i | we) have an appointment [to see @the_apt | at {time}]",
      "i am here for the (viewing | showing | appointment | apartment viewing)",
      "i saw (your | the) (ad | advert | advertisement | listing | post | announcement) [online | on the internet | on facebook | on craigslist | on zillow | on the website]",
      "i am (calling | here) about (your | the) (ad | advertisement | listing | announcement)", "i (came | come) about (your | the) (ad | advertisement | listing | announcement)",
      "is (this | that | it) the @apt [for rent]", "(i | we) have a (viewing | showing | appointment) [at {time}]",
      "is @the_apt still (available | free) #h:still_avail",
      "is it still (available | free)",
      "[yes] (for | about) (@the_apt | the @apt for rent)",
      "[the] @apt [for rent]",
    ] },
    my_name: { patterns: ["my name is {name} #h:my_name", "[yes | yeah] (i am | that is right | that is me | that is correct) my name is {name}"] },
    intro_name_ctx: { patterns: ["i am {name}", "it is {name}"] },
    vocative: { patterns: ["(mister | missus) patel", "sir"] },

    // --- the learner's questions --------------------------------------------
    ask_rent: { patterns: [
      "how much is the rent #h:q_rent", "what is the [monthly] rent", "how much is (it | @the_apt) [@per_month]",
      "how much does (it | @the_apt) cost [@per_month]", "how much (do you want | are you asking) for (it | @the_apt)",
      "how much is the rent [@per_month]", "(what about | and) the rent", "how much [for] @per_month", "what is the price [of @the_apt] [(for | per) (a | one | the) month]",
      "is the rent {amount} [dollars] [@per_month]", "is it {amount} [dollars] @per_month", "how much do i pay [@per_month]",
      "how much (do i | i) (must | have to | need to | should) pay [@per_month]", "how much is the monthly (payment | price | fee)",
      "what is the monthly (payment | price | cost | fee)", "what does it cost [@per_month]", "how much (cost | costs) (the rent | it | @the_apt) [@per_month]", "how much (will | would) i pay [@per_month]",
    ] },
    ask_utilities: { patterns: [
      "are [the] @util_all @incl #h:q_util", "are [the] @util_all (extra | separate | not included)", "are the bills @incl #tip:uk_bills",
      "(is | are) included [the] ({utility} | @util_all)", "do [the] @util_all come with (it | @the_apt | the rent)", "is [the] {utility} @incl #h:q_util2", "are [the] {utility} @incl", "is [the] {utility} extra", "(is | are) [the] {utility} and [the] {utility} @incl",
      "what is included [in the (rent | price)]", "what does the (rent | price) include", "does the (rent | price) include [the] (@util_all | {utility} [and [the] {utility}])",
      "do i (have to | need to) pay (for | extra for) [the] (@util_all | {utility})", "do i pay (for | extra for) [the] (@util_all | {utility}) [separately | myself | extra]",
      "do i pay [the] (@util_all | {utility}) (separately | myself | extra)",
      "who pays (for | the) [the] (@util_all | {utility} [bill])", "(what about | and) [the] (@util_all | bills #tip:uk_bills | {utility})",
      "how much are [the] (@util_all | bills #tip:uk_bills) [usually | @per_month]", "how much is [the] {utility} [bill] [usually] [@per_month]",
      "(is | are) [the] (@util_all | {utility}) (included | extra) or not",
    ] },
    ask_deposit: { patterns: [
      "is there a [security | damage] deposit #h:q_deposit", "how much is the [security] deposit #h:q_deposit",
      "do i (have to | need to) (pay | leave) a [security] deposit", "(what about | and) the [security] deposit",
      "is the deposit (refundable | returnable)", "(do | will) i get [my | the] deposit back", "how much do i (have to | need to) pay (up front | upfront | to move in | at the start)",
      "what do i (have to | need to) pay (up front | upfront | to move in)", "is there (a | any) deposit [to pay]",
      "do i (have to | need to) pay [the] first and last month [rent]",
      "how (big | large) is the [security] deposit", "do you (need | want | take | ask for) a [security | damage] deposit",
    ] },
    ask_furnished: { patterns: [
      "is (it | @the_apt) furnished #h:q_furnished", "does (it | @the_apt) come (furnished | with furniture)", "is there [any | some] furniture [in @the_apt]",
      "(what about | and) [the] furniture", "is (it | @the_apt) (unfurnished | empty)", "do i need to bring [my own] furniture",
      "is the furniture included", "is (it | @the_apt) with furniture", "is (it | @the_apt) furnished or (unfurnished | empty | not)", "does (it | @the_apt) have furniture",
      "(is there | does it have | does @the_apt have | do you have) [a | an | any] (bed | beds | sofa | couch | table | chairs | desk | wardrobe | dresser) [in the (bedroom | living room | apartment)]",
    ] },
    ask_appliance: { patterns: [
      "is there [a | an | any] {appliance} [in the kitchen]", "does (it | @the_apt | the kitchen) (have | come with) [a | an] {appliance}",
      "(what about | and) [a | an | the] {appliance}", "do you have [a | an] {appliance}", "is the {appliance} included",
    ] },
    ask_pets: { patterns: [
      "are (pets | animals) allowed #h:q_pets", "(can | may) i have (a pet | pets | animals | an animal | [a | an] {pet}) [here | in @the_apt]", "do you (allow | accept) (pets | animals | {pet})",
      "is it okay (to have | if i have) [a | an] {pet}", "(what about | and) (pets | animals | {pet})", "are {pet} (allowed | okay | ok | fine)",
      "is it pet friendly", "can i (bring | keep) (my {pet} | my pet | a pet | pets | [a | an] {pet})", "is a {pet} (okay | ok | fine | allowed)", "is it (okay | ok) to have (pets | animals | a pet)",
      "are (pets | animals) (okay | ok | fine | welcome | permitted)", "[it is | is it] possible to have (a pet | pets | animals | [a | an] {pet}) [here]",
    ] },
    have_pet: { patterns: [
      "[yes] i have (a | an | one | two) {pet} [is that (okay | ok | a problem | all right)] #h:have_cat",
      "[yes] i have {pet} [is that (okay | ok | a problem | all right)]", "[yes] (just | only) (a | one) {pet}",
      "[yes] (a | an | one | two) {pet} #h:have_dog", "we have (a | an | one | two) {pet}", "my {pet}",
      "[yes] (i | we) have (a | an | one | two) {pet} [but] @pet_desc",
    ] },
    no_pets: { patterns: [
      "[no] i do not have [any] (pets | animals) #h:no_pets", "[no] i have no (pets | animals)", "no (pets | animals)", "[no] i do not have (a | an) (pet | cat | dog | animal)",
      "[no] we do not have [any] (pets | animals)", "[no] none", "[no] (i am | we are) allergic [to (cats | dogs | animals | pets)]", "[no] i have no (pets | animals) at all", "[no] not at the moment",
    ] },
    ask_lease: { patterns: [
      "how long is the lease [for] #h:q_lease", "how long is the (contract | rental agreement | rental contract) [for] #tip:us_lease", "for how long is the (lease | contract #tip:us_lease)",
      "is it a (one year | 1 year | twelve month | 12 month) (lease | contract)", "what is the minimum [lease | stay | rental period | rental time | period]",
      "(can | could) i (sign | rent [it]) (for (six | three | two | 6 | 3) months | month to month | for a shorter time | for (a | one) month | for half a year)",
      "is a (six | 6) month lease (possible | okay)", "(can | could) i sign a (six | 6) month lease",
      "(is there | do i need to sign) a lease", "(what about | and) the (lease | contract #tip:us_lease)", "how long do i (have to | need to) stay",
      "is it (month to month | a long term lease)", "what are the (terms | conditions) [of the (lease | contract)]", "do i (have to | need to) sign for (a year | one year | twelve months | a whole year | 12 months)",
    ] },
    ask_movein: { patterns: [
      "when can i move in #h:q_movein", "when is (it | @the_apt) (available | free)", "is it available (now | right away | immediately)",
      "when can i (get the keys | move)", "(can | could) i move in @when_mv", "how soon can i move in", "when would i be able to move in",
      "from when (is it available | is it free | can i move in)", "when i can (move in | get the keys)",
    ] },
    ask_parking: { patterns: [
      "is there parking [for (my | a) car] #h:q_parking", "where i can (park | leave my car | put my car)", "is parking included", "where (can | do | should) i (park | leave | put) [my car]", "do i get a parking (space | spot | place)",
      "is there a (garage | parking lot | parking space | parking spot)", "(what about | and) parking", "is there (a place | somewhere | a spot | space) (to park [my car] | for my car | for a car)",
      "can i park [my car] (here | on the street | behind the building | in front)", "is parking free", "do you have parking",
    ] },
    ask_laundry: { patterns: [
      "where is the laundry room #h:q_laundry", "is there a laundry room", "where (can | do) i (do | wash) [my | the] (laundry | clothes)",
      "(what about | and) [the] laundry", "is there a laundromat [nearby]", "is there laundry in the building",
      "is there a (place | room) (to | where i can) (wash | do) [my] (clothes | laundry)", "(is there | are there) laundry (facilities | machines) [in the building]", "is there a laundry [room] [in the building]",
    ] },
    ask_quiet: { patterns: [
      "is it a quiet building #h:q_quiet", "is it quiet [at night]", "is (it | the building | the street) (noisy | loud | quiet) [at night]",
      "are the neighbors (nice | quiet | noisy | friendly)", "what are the neighbors like", "(how are | what about) the neighbors",
      "is (it | this) a (safe | quiet | nice) (neighborhood | area | street)", "is (this | the) (neighborhood | area | street) (safe | quiet | nice)",
      "is it (safe | quiet) (here | at night | around here)", "what is the (neighborhood | area | building) like",
    ] },
    ask_bus: { patterns: [
      "is there a bus stop (nearby | near here | close by) #h:q_bus", "is it close to (the | a) (bus stop | station | train station)",
      "how far is (the | it to the) (bus stop | station | train station)", "is it near (the | a) (bus stop | station)",
      "is there public (transportation | transport) (nearby | near here)", "how do i get (downtown | to town | to the center)",
      "is it far from (downtown | the center | town | the city center)", "where is the [nearest] bus stop",
      "is the (bus stop | station | train station) (far | close | near) [from here]",
      "how far is it (to | from) (downtown | the center | the city center | the city | town | the bus stop | the station | the train station)",
      "is there a (bus | train | station | train station) (nearby | near here | close by | near | close)",
    ] },
    ask_floor: { patterns: [
      "(what | which) floor is (it | @the_apt) on #h:q_floor", "(what | which) floor is it", "is there an elevator [in the building] #h:q_elevator",
      "is there a lift #tip:uk_lift", "is it on the (first | second | top) floor", "is it on the ground floor #tip:uk_ground", "(what | which) floor (are we on | is this)",
    ] },
    ask_smoke: { patterns: [
      "(can | may) i smoke (here | inside | in @the_apt | on the balcony | in the building)", "is smoking allowed [here | inside | in @the_apt | on the balcony | in the building]",
      "do you allow smoking", "is it (okay | ok) to smoke [here | inside | on the balcony]",
    ] },
    ask_size: { patterns: [
      "how many (bedrooms | rooms | bathrooms) [are there | does it have | is it]", "how big is (it | @the_apt | the {room})", "is it a (one | two) bedroom",
      "how many square (feet | meters | metres) [is it | is @the_apt | does it have]", "how many rooms", "what is the size of (it | @the_apt | the {room})",
    ] },
    ask_see: { patterns: [
      "(can | could | may) i (see | look at | have a look at | take a look at) the {room} #h:q_see",
      "(can | could | may) i (look | have a look | take a look) around", "where is the {room}", "can i see the rest [of @the_apt]",
      "(can | could) you show me the {room}",
    ] },
    ask_payrent: { patterns: [
      "when is the rent due #h:q_payrent", "how do i pay [the | my] rent", "(can | could) i pay [the rent] (online | by card | by check | in cash | by bank transfer)",
      "when do i pay [the] rent", "how can i pay [the rent]",
    ] },
    ask_apply: { patterns: [
      "what do i need to (apply | rent it | rent @the_apt)", "do you need [any | my] (documents | references | id | papers)",
      "is there an application [fee]", "how do i apply", "do i need to fill out an application", "what (documents | papers | paperwork) do (you | i) need", "what do you need from me", "what is the application process", "is there a (credit check | background check)",
      "do you need [a | any | my] (reference | references | documents | papers) from my (employer | boss | work | last landlord)",
    ] },
    ask_landlord: { patterns: [
      "do you live (here | in the building)", "who do i call if something (breaks | goes wrong)", "who (fixes | takes care of) (repairs | things)", "who (takes care of | handles | does | is responsible for) [the] (maintenance | repairs)",
    ] },
    ask_lower: { patterns: [
      "is the (rent | price) (negotiable | fixed | final | firm)", "(can | could) we (talk about | discuss | negotiate) the (price | rent)",
      "is it possible to (pay less | get a discount | lower the (rent | price))", "(can | could) you (lower | reduce) the rent [a little | a bit] #h:q_lower", "is there any flexibility (on | with) the rent",
      "(can | could | would) you (do | take | accept) {amount} [dollars]", "(can | could) i pay less", "what about {amount} [dollars]",
      "(could | can) you make it {amount} [dollars]", "(can | could) you make it (cheaper | a little cheaper | a bit cheaper | lower)",
      "(can | could) you give me a (discount | better price | lower price)", "(can | could) you go down [a little | a bit] [on the (price | rent)]", "is there a discount", "can we negotiate [the (rent | price)]",
    ] },
    too_x: { patterns: [
      "(it | that) is [a bit | a little | really | quite | very] too (expensive | small | big | far | dark) [for me] #h:too_expensive",
      "(it | that) is [a bit | a little | really | quite | very] too (expensive | small | big | far | dark) (for (us | my family | two people | me and my wife) | from (my work | work | my job | the city | downtown | the center | town))",
      "(it | that) is [a little | a bit | way | slightly] (out of | over | above) my (budget | price range)", "i (would prefer | want | need) something (bigger | cheaper | smaller | closer | brighter | quieter)", "(it | that) is more than i (wanted | want | can | planned | expected) to (pay | spend)",
      "(it | that) is [a bit | a little | really | quite | very] (expensive | small | far) [for (me | us | my family)]", "@like_pre but [it is] [a bit | a little | really] too (expensive | small | big | far | dark) [for (me | us)]", "that is a lot [of money]", "it is (too much | a lot) [for me]",
    ] },
    ask_unknown: { patterns: ["(is there | do you have | does it have) [a | an | any] {w:any}", "(can | may) i (have | bring | use) [a | an | my] {w:any}"] },

    // --- deciding -------------------------------------------------------------
    no_more: { patterns: [
      "(that is | i think that is) (all | it | everything) [for now] #h:that_all", "[no] i think that is (all | it | everything)",
      "[no] that is all #h:no_more_q", "[no] no more questions", "[no] i do not have [any] (more | other | further) questions", "[no] nothing else", "[no] i have no [more | other] questions",
      "you [have] answered (everything | all my questions)", "[no] i am good", "[no] i think i know everything",
      "[no] that is (all | everything) i (wanted | want | need | needed) to know", "no [other | further] questions", "[no] not at the moment",
      "[no] i am (fine | okay)", "(everything | it | all) is clear [now]", "(that is | i think that is) about (it | all)", "i understand everything",
    ] },
    take: { patterns: [
      "[yes] i will take it #h:take_it", "[yes] i take it", "i am going to (take | rent) (it | @the_apt)", "i will go ahead and (take | rent) it", "[yes] i will take @the_apt", "i want to take it #blunt", "i would like to sign the (lease | contract #tip:us_lease)", "[actually] i will take it #h:take_now", "[yes] we will take it", "i would like to (rent | take) (it | @the_apt) #h:like_to_rent",
      "where do i sign #h:where_sign", "i want (it | to rent it) #blunt", "[yes] i am interested #h:interested",
      "let us do it", "(can | could) i (rent | take) it", "i would like to sign the lease", "i am ready to sign [the lease]",
      "@like_pre [so] i will (take | rent) it", "sign me up", "[yes] i will rent it",
    ] },
    like_it: { patterns: [
      "i [really] (love | like) it [very much | a lot | so much]", "it is (perfect | great | lovely | beautiful | really nice | very nice | nice)", "(what a | it is a) (nice | lovely | great) (place | apartment)",
      "i [really] like the (kitchen | bedroom | apartment | light | place)", "[it | everything | that] looks (good | great | nice | fine | okay) [to me]",
    ] },
    think: { patterns: [
      "@think_core", "@like_pre but @think_core",
    ] },
    decline: { patterns: [
      "i do not think it is [right] for me #h:not_for_me", "it is not (for me | what i am looking for | right for me)", "i will not take it",
      "i am not interested", "i do not want (it | to rent it)", "i do not want to (take | rent) (it | @the_apt)", "i (can not | will not) (take | rent) (it | @the_apt)", "i am going to pass", "i will pass", "i do not like it",
      "no thank you i will pass", "i do not think so", "i (am going to | will) keep looking", "i will look for something else",
    ] },
    // "Maybe." / "I'm still thinking." only as an answer to "So, what do you think?"
    // "Yes, I have a few questions." (to "Do you have any questions?")
    have_questions: { patterns: ["[yes] i have (a few | some | a couple of | one | two | a lot of | many) questions", "[yes] i have a [small] question"] },
    think_ctx: { patterns: ["(maybe | perhaps | possibly | probably)", "i am [still] thinking [about it]"] },
    call_back: { patterns: [
      "[okay] i will call you (tonight | later | tomorrow | this evening | soon) #h:call_tonight", "[okay] i will let you know (tonight | today | soon)",
      "i will (call | phone | text | message | email) [you] (tonight | later | later today | this evening | in the evening | this afternoon | today | soon | in an hour | in (a couple of | a few | two) hours | before (tonight | the evening | evening | {time}) | by (tonight | this evening | {time}))",
      "i will let you know (later today | this evening | by tonight | before tonight | before evening | in an hour)",
      "i will (decide | make a decision | tell you | give you (an | my) answer | get back to you) (tonight | today | soon | by tonight | before tonight | this evening | later today | in an hour)",
      "[okay] i promise", "you will hear from me (tonight | today | soon)",
    ] },

    // --- Mr. Patel's questions ------------------------------------------------
    movein_ans_ctx: { patterns: [
      "@when_mv", "@when_mv if (possible | that is possible | that is okay | i can | it is possible | you can | that works)", "(i would like to | i want to | i am hoping to | i hope to | we would like to | i need to) move in @when_mv",
      "i (need | would need | want) (it | a place | the apartment) @when_mv", "i am (flexible | not sure yet)", "[i am] not sure [yet] [maybe | probably] @when_mv", "i do not know [yet] (maybe | probably) @when_mv",
      "(ideally | preferably | hopefully | probably | around | about | approximately) @when_mv",
      "@when_mv (would be (great | good | perfect | ideal | best) | is (good | fine | great | perfect | best)) [for me]",
      "whenever [(it | that) is (okay | good | fine | convenient | possible) [for you]]", "i am hoping (for | to move in) @when_mv", "any time [is (fine | okay | good)]",
    ] },
    people_ans: { patterns: [
      "[it is] (just | only) me #h:just_me", "i [will] live alone", "(me | it is me) and my @fam #h:with_family",
      "my @fam and (i | me)", "the two of us", "(it will be | there will be) (two | three | four) of us",
      "(with | and) my @fam", "[just] (my wife | my husband) and (i | me)", "(just | only) for me", "(just | only) myself",
      "(me | i) [and] my @fam and (my | our) @fam", "my (wife | husband | partner) and (my | our | two | three | my two | our two) @fam",
      "i (am going to | will) live alone", "i [will] live with my @fam", "i will be alone", "(only | just) (me | i) will live (here | there)",
    ] },
    people_num_ctx: { patterns: ["(two | three | four | five) [people | of us | persons]", "{number} [people | persons]", "(we are | it is) a family of (two | three | four | five)", "(we are | there are | we will be | there will be) (two | three | four | five) [people | of us | persons]", "(two | three | four) adults"] },

    // --- documents and the lease ------------------------------------------------
    here_you_go: { patterns: [
      "here you (go | are) #h:here_you_go", "there you go", "here it is",
      "here is my [lithuanian | european | eu] (passport | id | driver's license | license | id card | offer letter | job offer | bank statement | pay stub | pay stubs) #h:here_passport",
      "(done | all done | finished)", "here is the [signed] (lease | contract)", "here is (the | my) letter [from my (employer | boss | company | work)]", "i (signed | have signed) (it | the lease)", "i (have | just) signed [the lease]", "[okay] i will sign (it | the lease | here) [now]",
    ] },
    passport_ok: { patterns: [
      "is (a | my) (passport | european id | id card | driver's license | lithuanian passport) (okay | ok | fine | all right) #h:passport_ok",
      "(can | could) i (use | show you | show) my [lithuanian | european | eu] passport", "will (a | my) (passport | driver's license | id | id card | license) (work | do | be okay)", "i [only] have (a | my) passport",
      "do you need my (passport | id | id card | driver's license)",
    ] },
    have_job: { patterns: [
      "i (have | just got) a (job | new job) [at brightline]", "i have a (job offer | offer letter | work contract)", "i work (at | for) brightline",
      "i (can | could) show you my (pay stubs | bank statement | contract | job offer | offer letter)", "i have a letter from my (employer | boss | company | work)",
      "(i can | i will | can i) (send | email | bring) [you] (the | my | a) (letter | contract | offer letter | job offer) [to you] [by email | tomorrow | later]",
      "i have a job offer letter", "i have a (contract | work contract | job) (with | at) brightline", "i have my (bank statements | bank statement | pay stubs | work contract)",
    ] },
    no_job: { patterns: [
      "i do not have a job [yet | right now]", "i am [still] looking for a job", "i am not working (yet | right now | at the moment)",
      "i do not have (a letter | the letter | pay stubs | an offer letter) [yet]",
    ] },
    where_sign: { patterns: [
      "where (do | should) i sign #h:where_sign", "(do | should) i [need to | have to] sign (here | on every page | on each page | at the bottom | both copies | all the pages | every page) [too]", "where", "sign here",
      "where (do | should | can) i put my (signature | name)", "where exactly [do i sign]", "where does my signature go",
    ] },
    // just the document's name while handing it over ("Passport.")
    id_ctx: { patterns: ["[my] [lithuanian | european | eu] (passport | id | id card | driver's license | license)"] },
    // a bare "Here?" only while Mr. Patel is holding out the lease
    sign_here_ctx: { patterns: ["[right | just | is it] here", "here at the bottom"] },
    read_first: { patterns: [
      "(can | could | may) i read it first #h:read_first", "i would like to read it first", "let me read it first",
      "(can | could) i take it home [and read it]", "(can | could) i have a (moment | minute) to read it",
      "(let me | i want to | i would like to | i need to) read (it | the lease | the contract | this) (first | before i sign [it] | before signing)",
    ] },
    copy: { patterns: [
      "(can | could | may) i (get | have) a copy #h:copy", "will i get a copy", "(can | could | will) you (email | send) me a copy [by email]",
      "(can | could) i (get | have) a copy (for me | for myself | of the lease | of the contract)", "(can | could | may) i take a (photo | picture) [of (it | the lease | the contract)]",
    ] },
    pen: { patterns: ["(do you have | can i (have | borrow | get)) a pen", "i need a pen", "(could | can) you give me a pen"] },

    // --- tenant mode: reporting a problem --------------------------------------
    report_problem: { patterns: [
      "[the | my] [kitchen | bathroom] {fix} @broken [@where_when] #h:not_working",
      "[the | my] [kitchen | bathroom] {fix} is (leaking | dripping) [@where_when] #h:leaking",
      "[the | my] [kitchen | bathroom] {fix} is (clogged | blocked) [@where_when] #h:clogged",
      "[the | my] {fix} (keeps running | will not flush | keeps beeping | will not close | will not lock | is stuck | does not close | does not lock | does not flush | does not open)",
      "[the | my] {fix} is (cold | not warm | not hot | freezing) [@where_when]",
      "there is no (heat | heating | hot water | electricity | power | water) [@where_when] #h:no_hot", "(i | we) have no (heat | heating | hot water | electricity | power | water) [@where_when]",
      "[the | my] {fix} has no (hot water | water | power)",
      "(i have | there is | we have) a problem with (the | my) [kitchen | bathroom] {fix} #h:problem_with",
      "(there is | i have | we have) a leak (in the kitchen | in the bathroom | under the sink)", "water is (going | running | coming) (from | out of) the {fix}",
      "[the | my] [kitchen | bathroom] {fix} (drips | leaks)", "no (heat | heating | hot water | electricity | power) [@where_when]", "it is freezing (in here | in @the_apt | inside)", "there is water (on the floor | everywhere | under the sink | in the bathroom | in the kitchen)", "water is (leaking | dripping) [from the (faucet | ceiling | sink | pipe)]",
      "[it] is (really | very | so | too | freezing) cold (in @the_apt | in here | inside)", "@the_apt is (really | very | so | freezing) cold",
      "something is wrong with (the | my) {fix}",
    ] },
    all_good: { patterns: [
      "everything is (fine | good | great | perfect | okay | working)", "no problems [at all]", "all good", "i love it here", "(everything | it) is going (well | great | fine)",
      "everything works", "everything (works | is working) [fine | now | perfectly]", "[the] {fix} (works | is working | is fine | is okay) [fine | now | again]", "nothing is (broken | wrong)",
    ] },
    have_problem: { patterns: [
      "(not great | not so good | not really | not very good | not so great) [actually]", "actually not (great | so good | really)",
      "[actually] (there is | i have | we have) a (problem | small problem | little problem) [actually]", "[actually] something is (wrong | broken)",
    ] },
    sorry_bother: { patterns: ["[i am] sorry to bother you #h:sorry_bother", "sorry for bothering you", "i hate to bother you"] },
    fix_request: { patterns: [
      "(could | can) you send someone [to fix it | to look at it] #h:fix", "(could | can) you (fix | repair) it", "(can | could) someone [come and] (fix | look at) it",
      "(can | could) you call (a | the) (plumber | repairman | electrician)", "i need (a | the) (plumber | repairman | electrician | handyman)", "(could | can) you send (a | the) (plumber | repairman | electrician)",
    ] },
    home_yes: { patterns: [
      "[yes] i will be (home | there | at home) [all day | all morning | tomorrow] #h:home_yes", "[yes] i am (home | at home) [all day] [tomorrow]", "[yes] i work from home",
      "[yes] i am free [tomorrow] [morning]",
    ] },
    at_work: { patterns: [
      "[no] i will be at work [until {time} | all day | tomorrow | in the morning] #h:at_work", "[no] i (work | am working) [tomorrow] [(at ten | in the morning)]", "[no] i will not be (home | there | at home) [tomorrow | in the morning | at ten | tomorrow morning]",
      "[no] i have to work [tomorrow]", "[tomorrow] i (am | will be) at work [tomorrow]", "[no] i am working (until | till) {time}", "[no] i am busy [tomorrow] [morning]", "[no] i am not (home | at home) [tomorrow] [in the morning | until {time}]",
    ] },
    time_pref: { patterns: [
      "(could | can) (he | they | someone) come (after | at | before) {time} #h:after_five", "(could | can) (he | they | someone) come (in the afternoon | in the evening | later | on {day} | {day})",
      "(could | can) (he | they | someone) come (on the weekend | at the weekend | this weekend | after work)", "is (the afternoon | the evening | later | {day}) possible", "any time after {time}",
      "after {time} [is better | would be better]", "(in the | tomorrow) (afternoon | evening) [is better | would be better] #h:afternoon", "{day} [is better | would be better] #h:saturday",
      "[in the] (morning | afternoon | evening) (is better | would be better | is good | works better) [for me]",
      "(what | how) about (at)? ({time} | the afternoon | the evening | {day})", "later (is better | would be better | is good | is fine) [for me]",
      "(is it possible | would it be possible) [for him to come] (later | after {time} | at {time} | in the (afternoon | evening) | on {day} | {day}) [at {time}]",
    ] },
    use_key: { patterns: [
      "[sure | yes] you can (use your key | let him in | go in) #h:use_key", "(could | can) you let him in", "let him in", "you have a key",
      "you can (go in | come in | open the door | let him in) with your key", "[no] but you can (use your key | let him in | go in)",
    ] },
    // "Ten isn't good for me." → Mr. Patel asks for another time
    time_bad: { patterns: [
      "(ten | tomorrow | tomorrow at ten | ten o clock | ten oclock | that | that time | the morning) (is not | does not | will not) (good | work | okay | possible | fine | great) [for me]",
      "(ten | tomorrow | that time | the morning) (is | will be) (bad | difficult | a problem | too early) [for me]", "i can not (do | make) (ten | tomorrow | it | that) [tomorrow]", "[no] not (at ten | tomorrow)",
    ] },
    time_ok: { patterns: ["(tomorrow at ten | ten | tomorrow | ten o clock | ten oclock | tomorrow morning | the morning | morning) (is fine | is good | works | is perfect | is okay) #h:ten_fine", "that works [for me]"] },
  },

  lines: {
    // --- arriving ---------------------------------------------------------------
    greet_must_be: [
      t("Hi! | You | must | be | here | about | the | apartment.", "Sveiki! | Jūs | turbūt | esate | čia | dėl | — | buto.", "Sveiki! Jūs turbūt dėl buto?"),
      t("Good | afternoon! | Are | you | here | about | the | apartment?", "Laba | diena! | Ar | jūs | čia | dėl | — | buto?", "Laba diena! Jūs dėl buto?",
        { flags: { 2: F_ARE_Q } }),
    ],
    greet_help: [
      t("Hello! | Can | I | help | you?", "Sveiki! | Ar galiu | aš | padėti | jums?", "Sveiki! Kuo galiu padėti?"),
      t("Hi there! | Can | I | help | you | with something?", "Sveiki! | Ar galiu | aš | padėti | jums | kuo nors?", "Sveiki! Ar galiu kuo nors padėti?"),
    ],
    purpose_again: [
      t("Are | you | here | about | the | apartment?", "Ar | jūs | čia | dėl | — | buto?", "Jūs dėl buto?", { flags: { 0: F_ARE_Q } }),
    ],
    how_help: [
      t("Oh, | sorry! | How | can | I | help | you?", "O, | atsiprašau! | Kuo | galiu | aš | padėti | jums?", "O, atsiprašau! Kuo galiu padėti?"),
    ],
    come_in: [
      t("Come on in!", "Užeikite!", "Užeikite!"),
      t("Great, | come on in!", "Puiku, | užeikite!", "Puiku, užeikite!"),
      t("Yes, | of course. | Come on in!", "Taip, | žinoma. | Užeikite!", "Taip, žinoma. Užeikite!"),
    ],
    still_yes: [t("Yes, | it | is! | Come on in.", "Taip, | jis | [laisvas]! | Užeikite.", "Taip, laisvas! Užeikite.",
      { flags: { 2: "Elliptical “is”: Lithuanian repeats the predicate laisvas." } })],
    tour: [
      t("So, | this | is | the | living room, | and | the | kitchen | is | on the right.", "Taigi, | tai | yra | — | svetainė, | o | — | virtuvė | yra | dešinėje.",
        "Taigi, čia svetainė, o virtuvė – dešinėje."),
      t("This | is | the | living room. | The | bedroom | is | at the end | of the hall.", "Čia | yra | — | svetainė. | — | Miegamasis | yra | gale | koridoriaus.",
        "Čia svetainė. Miegamasis – koridoriaus gale."),
    ],
    tour_extra: [
      t("The | apartment | is | very | bright.", "— | Butas | yra | labai | šviesus.", "Butas labai šviesus."),
      t("The | kitchen | is | brand | new.", "— | Virtuvė | yra | visiškai | nauja.", "Virtuvė visiškai nauja."),
    ],
    nice_to_meet: [
      t("Nice | to meet | you!", "Malonu | susipažinti | su jumis!", "Malonu susipažinti!"),
    ],

    // --- Mr. Patel's questions ----------------------------------------------------
    ask_movein_q: [
      t("So, | when | are | you | looking | to move in?", "Tai | kada | — | jūs | planuojate | įsikelti?", "Tai kada planuojate įsikelti?",
        { flags: { 2: "Progressive “are”: the present tense of planuojate carries it (linked to “looking”)." } }),
      t("When | would | you | like | to move in?", "Kada | — | jūs | norėtumėte | įsikelti?", "Kada norėtumėte įsikelti?", { flags: { 1: F_WOULD } }),
    ],
    movein_ack: [
      t("That | works.", "Tai | tinka.", "Tinka."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    movein_info: [
      t("You | can | move in | on the first | of the month.", "Jūs | galite | įsikelti | pirmąją | mėnesio.", "Įsikelti galėsite mėnesio pirmąją."),
    ],
    ask_people: [
      t("Will | it | be | just | you?", "Ar | tai | bus | tik | jūs?", "Gyvensite {m:vienas|f:viena}?", { flags: { 0: "“Will” in a yes/no question = the particle ar; the future sits on bus (linked to “be”)." } }),
      t("Is | it | just | for you?", "Ar | tai | tik | jums?", "Ar butas tik jums?", { flags: { 0: F_IS_Q } }),
    ],
    ask_how_many: [
      t("How many | people, | then?", "Kiek | žmonių, | tada?", "Kiek tada žmonių gyventų?"),
    ],
    people_ack: [
      t("Okay, | great.", "Gerai, | puiku.", "Gerai, puiku."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    people_small: [
      t("Hmm, | it's | a | one-bedroom, | so | it | might | be | a little | small | for four.",
        "Hmm, | tai yra | — | vieno miegamojo butas, | tad | jis | gali | būti | truputį | mažas | keturiems.",
        "Hmm, tai vieno miegamojo butas, tad keturiems gali būti kiek ankšta."),
    ],
    ask_pets_q: [
      t("Do | you | have | any | pets?", "Ar | jūs | turite | kokių nors | gyvūnų?", "Ar turite gyvūnų?", { flags: { 0: F_DO_Q } }),
      t("Any | pets?", "Kokių nors | gyvūnų?", "Gyvūnų turite?"),
    ],
    ask_pet_which: [
      t("Oh, | what | pet | do | you | have?", "O, | kokį | gyvūną | — | jūs | turite?", "O, kokį gyvūną turite?", { flags: { 3: F_WH_DO } }),
    ],
    pets_policy: [
      t("Cats | are | allowed, | and | small | dogs | too.", "Katės | yra | leidžiamos, | ir | maži | šunys | irgi.", "Katės leidžiamos, maži šunys – irgi."),
    ],
    pet_cat_ok: [t("A | cat | is fine.", "— | Katė | tinka.", "Katę laikyti galima.")],
    pet_dog_ok: [t("A | small | dog | is fine | too.", "— | Mažas | šuo | irgi | tinka.", "Mažą šunį – irgi galima.")],
    pet_bigdog: [t("Sorry, | only | small | dogs | are | allowed.", "Atsiprašau, | tik | maži | šunys | yra | leidžiami.", "Atsiprašau, leidžiami tik maži šunys.")],
    pet_other_ok: [t("That's | no | problem.", "Tai | ne | problema.", "Tai ne problema.")],

    // --- the learner's questions -----------------------------------------------------
    ask_questions_first: [
      t("So, | what | would | you | like | to know?", "Tai | ką | — | jūs | norėtumėte | žinoti?", "Tai ką norėtumėte sužinoti?", { flags: { 2: F_WOULD } }),
      t("Do | you | have | any | questions?", "Ar | jūs | turite | kokių nors | klausimų?", "Ar turite klausimų?", { flags: { 0: F_DO_Q } }),
    ],
    ask_questions_more: [
      t("Anything | else | you'd | like | to know?", "Ką nors | dar | jūs | norėtumėte | žinoti?", "Ar dar ką nors norėtumėte sužinoti?", { flags: { 2: F_YOUD } }),
      t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Dar klausimų turite?"),
      t("What | else | can | I | tell | you?", "Ką | dar | galiu | aš | pasakyti | jums?", "Ką dar galiu jums papasakoti?"),
    ],
    go_ahead: [t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite.")],
    good_q: [t("Good | question.", "Geras | klausimas.", "Geras klausimas.")],
    rent: [
      t("The | rent | is | $1,400 | a | month.", "— | Nuoma | yra | 1 400 dolerių | per | mėnesį.", "Nuoma – 1 400 dolerių per mėnesį.",
        { say: "The rent is fourteen hundred dollars a month.", flags: { 4: F_A_PER } }),
      t("It's | $1,400 | a | month.", "Tai yra | 1 400 dolerių | per | mėnesį.", "1 400 dolerių per mėnesį.", { say: "It's fourteen hundred a month.", flags: { 2: F_A_PER } }),
    ],
    rent_full: [
      t("The | rent | is | $1,400 | a | month.", "— | Nuoma | yra | 1 400 dolerių | per | mėnesį.", "Nuoma – 1 400 dolerių per mėnesį.",
        { say: "The rent is fourteen hundred dollars a month.", flags: { 4: F_A_PER } }),
    ],
    deposit_full: [
      t("The | security | deposit | is | one | month's | rent.", "— | Garantinis | užstatas | yra | vieno | mėnesio | nuoma.", "Garantinis užstatas – vieno mėnesio nuoma."),
    ],
    lease_full: [
      t("The | lease | is | for | twelve | months.", "— | Sutartis | yra | — | dvylikai | mėnesių.", "Sutartis sudaroma dvylikai mėnesių.",
        { flags: { 3: "“for” (duration): the dative dvylikai carries it." } }),
    ],
    rent_due: [
      t("Rent | is | due | on the first | of the month.", "Nuoma | yra | mokėtina | pirmąją | mėnesio.", "Nuoma mokama kiekvieno mėnesio pirmąją dieną."),
    ],
    rent_pay_how: [
      t("You | can | pay | online | or | by check.", "Jūs | galite | mokėti | internetu | arba | čekiu.", "Galite mokėti internetu arba čekiu."),
    ],
    rent_firm: [
      t("Sorry, | the | rent | is | firm. | But | heat | and | water | are | included.", "Atsiprašau, | — | nuoma | yra | galutinė. | Bet | šildymas | ir | vanduo | yra | įskaičiuoti.",
        "Atsiprašau, dėl nuomos nesiderame. Bet šildymas ir vanduo įskaičiuoti."),
      t("I'm afraid | the | price | is | fixed. | But | heat | and | water | are | included.", "Deja, | — | kaina | yra | fiksuota. | Bet | šildymas | ir | vanduo | yra | įskaičiuoti.",
        "Deja, kaina fiksuota. Bet šildymas ir vanduo įskaičiuoti."),
    ],
    utilities_all: [
      t("Heat | and | water | are | included. | You'd | pay | for | electricity | and | internet.",
        "Šildymas | ir | vanduo | yra | įskaičiuoti. | Jūs | mokėtumėte | už | elektrą | ir | internetą.",
        "Šildymas ir vanduo įskaičiuoti. Už elektrą ir internetą mokėtumėte patys.", { flags: { 5: F_YOUD } }),
      t("Water | and | heat, | yes. | Electricity | and | internet, | no.", "Vanduo | ir | šildymas, | taip. | Elektra | ir | internetas, | ne.",
        "Vanduo ir šildymas – taip. Elektra ir internetas – ne."),
    ],
    util_yes: [
      t("Yes, | {X} | is | included.", "Taip, | {X:nom} | yra | {įskaičiuotas@X:nom}.", "Taip, {X:nom} {įskaičiuotas@X:nom}."),
    ],
    util_no: [
      t("No, | {X} | isn't included.", "Ne, | {X:nom} | {neįskaičiuotas@X:nom}.", "Ne, {X:nom} {neįskaičiuotas@X:nom}."),
    ],
    util_separate: [
      t("You'd | pay | for | it | separately.", "Jūs | mokėtumėte | už | {jis@X:acc} | atskirai.", "Už {jis@X:acc} mokėtumėte atskirai.", { flags: { 0: F_YOUD } }),
    ],
    util_internet: [
      t("Most | tenants | use | NetWave.", "Dauguma | nuomininkų | naudoja | „NetWave“.", "Dauguma nuomininkų naudojasi „NetWave“."),
    ],
    util_cost: [
      t("Electricity | is | usually | about | $60 | a | month.", "Elektra | yra | paprastai | apie | 60 dolerių | per | mėnesį.", "Už elektrą paprastai tenka apie 60 dolerių per mėnesį.",
        { say: "Electricity is usually about sixty dollars a month.", flags: { 5: F_A_PER } }),
    ],
    deposit: [
      t("The | security | deposit | is | one | month's | rent.", "— | Garantinis | užstatas | yra | vieno | mėnesio | nuoma.", "Garantinis užstatas – vieno mėnesio nuoma."),
      t("It's | one | month's | rent, | so | $1,400.", "Tai yra | vieno | mėnesio | nuoma, | taigi | 1 400 dolerių.", "Tai vieno mėnesio nuoma, taigi 1 400 dolerių.",
        { say: "It's one month's rent, so fourteen hundred dollars." }),
    ],
    deposit_first: [
      t("And | the | first | month's | rent | when | you | sign | the | lease.", "Ir | — | pirmojo | mėnesio | nuoma | kai | jūs | pasirašysite | — | sutartį.",
        "Ir pirmojo mėnesio nuoma, kai pasirašysite sutartį."),
    ],
    deposit_back: [
      t("You | get | it | back | when | you | move out.", "Jūs | gausite | jį | atgal | kai | jūs | išsikraustysite.", "Jį atgausite, kai išsikraustysite."),
    ],
    furnished: [
      t("No, | it's | unfurnished, | but | the | kitchen | has | a | fridge, | a | stove | and | a | dishwasher.",
        "Ne, | jis yra | be baldų, | bet | — | virtuvėje | yra | — | šaldytuvas, | — | viryklė | ir | — | indaplovė.",
        "Ne, butas be baldų, bet virtuvėje yra šaldytuvas, viryklė ir indaplovė."),
      t("No, | it's | unfurnished. | But | all | the | appliances | are | new.", "Ne, | jis yra | be baldų. | Bet | visa | — | buitinė technika | yra | nauja.",
        "Ne, butas be baldų. Bet visa buitinė technika nauja."),
    ],
    app_kitchen: [
      t("Yes, | there's | {X.np} | in the kitchen.", "Taip, | yra | {X.np:nom} | virtuvėje.", "Taip, virtuvėje yra {X.np:nom}."),
    ],
    app_microwave: [
      t("No, | there's | no | microwave, | sorry.", "Ne, | nėra | jokios | mikrobangų krosnelės, | atsiprašau.", "Ne, mikrobangų krosnelės nėra, atsiprašau.",
        { flags: { 1: F_CONCORD } }),
    ],
    app_ac: [
      t("No, | there's | no | AC, | but | the | apartment | stays | pretty | cool.", "Ne, | nėra | jokio | kondicionieriaus, | bet | — | butas | išlieka | gana | vėsus.",
        "Ne, kondicionieriaus nėra, bet bute būna gana vėsu.", { say: "No, there's no A C, but the apartment stays pretty cool.", flags: { 1: F_CONCORD } }),
    ],
    lease: [
      t("The | lease | is | for | twelve | months.", "— | Sutartis | yra | — | dvylikai | mėnesių.", "Sutartis sudaroma dvylikai mėnesių.",
        { flags: { 3: "“for” (duration): the dative dvylikai carries it." } }),
      t("It's | a | one-year | lease.", "Tai yra | — | vienerių metų | sutartis.", "Tai vienerių metų nuomos sutartis."),
    ],
    lease_min: [
      t("The | minimum | is | twelve | months, | sorry.", "— | Minimumas | yra | dvylika | mėnesių, | atsiprašau.", "Mažiausiai dvylika mėnesių, atsiprašau."),
    ],
    parking: [
      t("You | get | one | parking | space | behind | the | building.", "Jūs | gaunate | vieną | stovėjimo | vietą | už | — | pastato.",
        "Jums priklauso viena stovėjimo vieta už pastato."),
      t("Yes, | there's | free | parking | behind | the | building.", "Taip, | yra | nemokama | stovėjimo aikštelė | už | — | pastato.",
        "Taip, už pastato yra nemokama stovėjimo aikštelė."),
    ],
    laundry: [
      t("There's | a | laundry room | in the basement.", "Yra | — | skalbykla | rūsyje.", "Rūsyje yra skalbykla."),
      t("The | washers | and | dryers | are | in the basement.", "— | Skalbimo mašinos | ir | džiovyklės | yra | rūsyje.", "Skalbimo mašinos ir džiovyklės – rūsyje."),
    ],
    quiet: [
      t("Yes, | it's | a | very | quiet | building.", "Taip, | tai yra | — | labai | ramus | namas.", "Taip, namas labai ramus."),
      t("Very | quiet. | Most | of the neighbors | are | retired.", "Labai | ramu. | Dauguma | kaimynų | yra | pensininkai.", "Labai ramu. Dauguma kaimynų – pensininkai."),
    ],
    safe: [
      t("Yes, | it's | a | safe | neighborhood.", "Taip, | tai yra | — | saugus | rajonas.", "Taip, rajonas saugus."),
    ],
    bus: [
      t("The | bus | stop | is | right | on | the | corner.", "— | Autobusų | stotelė | yra | visai | prie | — | kampo.", "Autobusų stotelė – visai prie kampo."),
      t("It's | a | two-minute | walk | to | the | bus | stop.", "Tai yra | — | dviejų minučių | kelias | iki | — | autobusų | stotelės.", "Iki autobusų stotelės – dvi minutės pėsčiomis."),
    ],
    bus_downtown: [
      t("The | bus | goes | downtown | every | fifteen | minutes.", "— | Autobusas | važiuoja | į centrą | kas | penkiolika | minučių.", "Autobusas į centrą važiuoja kas penkiolika minučių."),
    ],
    floor: [
      t("It's | on | the | second | floor.", "Jis yra | — | — | antrame | aukšte.", "Butas antrame aukšte.",
        { flags: { 1: "Locative: the ending of antrame aukšte carries “on” (C-CASE-DASH)." } }),
    ],
    elevator: [
      t("There's | no | elevator, | just | the | stairs.", "Nėra | jokio | lifto, | tik | — | laiptai.", "Lifto nėra, tik laiptai.", { flags: { 0: F_CONCORD } }),
    ],
    smoking: [
      t("Sorry, | smoking | isn't allowed | in the building.", "Atsiprašau, | rūkyti | neleidžiama | pastate.", "Atsiprašau, pastate rūkyti negalima."),
    ],
    size: [
      t("It's | a | one-bedroom, | and | the | bedroom | is | pretty | big.", "Tai yra | — | vieno miegamojo butas, | o | — | miegamasis | yra | gana | didelis.",
        "Tai vieno miegamojo butas, o miegamasis gana didelis."),
    ],
    see_room: [
      t("Of course! | Follow | me.", "Žinoma! | Sekite | paskui mane.", "Žinoma! Eikite paskui mane."),
      t("Sure, | take your time.", "Žinoma, | neskubėkite.", "Žinoma, neskubėkite."),
    ],
    apply_info: [
      t("I'll need | your | ID | and | a | letter | from | your | employer.", "Man reikės | jūsų | asmens dokumento | ir | — | pažymos | iš | jūsų | darbdavio.",
        "Man reikės jūsų asmens dokumento ir pažymos iš darbdavio."),
    ],
    landlord_here: [
      t("I | live | on | the | first | floor, | so | just | knock | on | my | door.", "Aš | gyvenu | — | — | pirmame | aukšte, | tad | tiesiog | pasibelskite | į | mano | duris.",
        "Gyvenu pirmame aukšte, tad tiesiog pasibelskite į mano duris.", { flags: { 2: "Locative: the ending of pirmame aukšte carries “on” (C-CASE-DASH)." } }),
    ],
    unknown_q: [
      t("Hmm, | good | question. | I'll have | to check.", "Hmm, | geras | klausimas. | Turėsiu | patikrinti.", "Hmm, geras klausimas. Turėsiu pasitikslinti."),
    ],
    like_it_ack: [
      t("I'm | glad | you | like | it!", "Man | malonu, kad | jums | patinka | butas!", "Džiaugiuosi, kad butas jums patinka!"),
    ],
    what_can_do: [t("So, | what | can | I | do | for you?", "Tai | ką | galiu | aš | padaryti | jums?", "Tai kuo galiu padėti?")],
    understand: [t("I | understand.", "Aš | suprantu.", "Suprantu.")],
    fyi: [
      t("Oh, | and | by the way:", "O, | ir | beje:", "O, beje:"),
      t("Just so you know:", "Kad žinotumėte:", "Kad žinotumėte:"),
    ],

    // --- deciding -------------------------------------------------------------------
    decision_ask: [
      t("So, | what | do | you | think?", "Tai | ką | — | jūs | manote?", "Tai ką manote?", { flags: { 2: F_WH_DO } }),
      t("So, | are | you | interested?", "Tai | ar | jūs | {m:suinteresuotas|f:suinteresuota}?", "Tai ar jus domina?", { flags: { 1: F_ARE_Q } }),
      t("Well, | what | do | you | think | of | the | apartment?", "Na, | ką | — | jūs | manote | apie | — | butą?", "Na, ką manote apie butą?", { flags: { 2: F_WH_DO } }),
    ],
    take_ok: [
      t("Wonderful! | I | think | you'll be | very | happy | here.", "Nuostabu! | Aš | manau, | jūs būsite | labai | {m:laimingas|f:laiminga} | čia.",
        "Nuostabu! Manau, jums čia labai patiks."),
      t("Great! | I'm | glad | you | like | it.", "Puiku! | Man | malonu, kad | jums | patinka | butas.", "Puiku! Džiaugiuosi, kad butas jums patinka."),
    ],
    docs_ask: [
      t("I'll need | your | ID | and | a | letter | from | your | employer.", "Man reikės | jūsų | asmens dokumento | ir | — | pažymos | iš | jūsų | darbdavio.",
        "Man reikės jūsų asmens dokumento ir pažymos iš darbdavio."),
      t("First, | can | I | see | your | ID, | please?", "Pirmiausia, | ar galiu | aš | pamatyti | jūsų | asmens dokumentą, | prašau?", "Pirmiausia, ar galėčiau pamatyti jūsų asmens dokumentą?"),
    ],
    docs_ok: [
      t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("That's | great, | thanks.", "Tai | puiku, | ačiū.", "Puiku, ačiū."),
    ],
    passport_ok: [t("A | passport | is fine.", "— | Pasas | tinka.", "Pasas tinka.")],
    no_job_ok: [
      t("That's | okay. | A | bank | statement | works | too.", "Tai | gerai. | — | Banko | išrašas | tinka | irgi.", "Nieko tokio. Tiks ir banko išrašas."),
    ],
    sign_ask: [
      t("Here's | the | lease. | Please | sign | at the bottom.", "Štai | — | sutartis. | Prašom | pasirašyti | apačioje.", "Štai sutartis. Prašom pasirašyti apačioje."),
      t("So, | here's | the | lease. | Just | sign | here, | please.", "Taigi, | štai | — | sutartis. | Tiesiog | pasirašykite | čia, | prašau.", "Taigi, štai sutartis. Tiesiog pasirašykite čia."),
    ],
    sign_where: [t("Right | here, | at the bottom.", "Štai | čia, | apačioje.", "Štai čia, apačioje.")],
    read_ok: [t("Of course. | Take your time.", "Žinoma. | Neskubėkite.", "Žinoma. Neskubėkite.")],
    copy_ok: [t("Of course. | I'll email | you | a | copy.", "Žinoma. | Atsiųsiu el. paštu | jums | — | kopiją.", "Žinoma. Kopiją atsiųsiu jums el. paštu.")],
    keys: [
      t("And | here | are | your | keys. | Welcome | home!", "Ir | štai | — | jūsų | raktai. | Sveiki atvykę | namo!", "O štai jūsų raktai. Sveiki atvykę į naujus namus!",
        { flags: { 2: "“are” (here are): no Lithuanian word; štai presents the keys." } }),
    ],
    think_ok: [
      t("Of course. | Take your time.", "Žinoma. | Neskubėkite.", "Žinoma. Neskubėkite."),
      t("Sure, | no | problem. | Here's | my | number.", "Žinoma, | jokių | problemų. | Štai | mano | numeris.", "Žinoma. Štai mano numeris."),
      t("That's | fine. | Just | call | me | by | Friday.", "Tai | gerai. | Tiesiog | paskambinkite | man | iki | penktadienio.", "Gerai. Tiesiog paskambinkite man iki penktadienio."),
    ],
    someone_else: [
      t("Just so you know, | someone | else | is coming | tomorrow | to see | it.", "Kad žinotumėte, | kažkas | kitas | ateina | rytoj | apžiūrėti | jo.",
        "Kad žinotumėte, rytoj jo apžiūrėti ateina dar vienas žmogus."),
    ],
    hurry: [
      t("Could | you | let | me | know | by | tonight?", "Ar galėtumėte | jūs | pranešti | man | — | iki | vakaro?", "Ar galėtumėte man pranešti iki vakaro?",
        { flags: { 4: F_KNOW } }),
    ],
    wait_call: [
      t("Great. | I'll wait | for | your | call.", "Puiku. | Lauksiu | — | jūsų | skambučio.", "Puiku. Lauksiu jūsų skambučio.",
        { flags: { 2: "“for”: the genitive skambučio after laukti carries it." } }),
    ],
    decline_ok: [
      t("No | problem. | Good luck | with | your | search!", "Jokių | problemų. | Sėkmės | su | jūsų | paieškomis!", "Jokių problemų. Sėkmės ieškant buto!"),
      t("I | understand. | Thanks | for | coming!", "Aš | suprantu. | Ačiū, | kad | atėjote!", "Suprantu. Ačiū, kad atėjote!"),
    ],
    bye_take: [
      t("If | you | need | anything, | I | live | on | the | first | floor.", "Jei | jums | reikės | ko nors, | aš | gyvenu | — | — | pirmame | aukšte.",
        "Jei ko prireiks, aš gyvenu pirmame aukšte.", { flags: { 6: "Locative: the ending of pirmame aukšte carries “on” (C-CASE-DASH)." } }),
    ],
    bye_think: [
      t("Hope | to hear | from | you | soon!", "Tikiuosi | išgirsti | iš | jūsų | greitai!", "Tikiuosi, greitai susisieksite!"),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Sure.", "Žinoma.", "Žinoma."),
    ],

    // --- tenant mode: a problem in the apartment -------------------------------------
    howis: [
      t("Oh, | hi! | How's | everything | with | the | apartment?", "O, | sveiki! | Kaip | viskas | su | — | butu?", "O, sveiki! Kaip sekasi naujame bute?",
        { flags: { 2: "“'s” (is): Lithuanian needs no copula here." } }),
      t("Hi there! | How | are | you | settling in?", "Sveiki! | Kaip | — | jūs | įsikuriate?", "Sveiki! Kaip įsikuriate?",
        { flags: { 2: "Progressive “are”: the present tense of įsikuriate carries it (linked to “settling in”)." } }),
    ],
    problem_reask: [
      t("Is | everything | working | okay?", "Ar | viskas | veikia | gerai?", "Ar viskas veikia gerai?",
        { flags: { 0: "“Is” (progressive) in a question = the particle ar; veikia carries the tense (linked to “working”)." } }),
    ],
    problem_what: [
      t("Oh | no! | What's | wrong?", "O | ne! | Kas yra | negerai?", "O ne! Kas nutiko?"),
    ],
    all_good_ack: [
      t("Good | to hear! | If | anything | breaks, | just | let | me | know.", "Gera | girdėti! | Jei | kas nors | suges, | tiesiog | praneškite | man | —.",
        "Gera girdėti! Jei kas nors suges, tiesiog praneškite.", { flags: { 8: F_KNOW } }),
    ],
    no_bother: [t("Not at all!", "Nieko tokio!", "Nieko tokio!")],
    sorry_problem: [
      t("Oh | no, | sorry | about | that!", "O | ne, | atsiprašau | dėl | to!", "O ne, atsiprašau!"),
      t("Oh, | I'm | sorry | to hear | that.", "O, | man | gaila | girdėti | tai.", "O, gaila tai girdėti."),
    ],
    plan_repairman: [t("I'll call | the | repairman | right away.", "Paskambinsiu | — | meistrui | tuoj pat.", "Tuoj pat paskambinsiu meistrui.")],
    plan_plumber: [t("I'll call | the | plumber | right away.", "Paskambinsiu | — | santechnikui | tuoj pat.", "Tuoj pat paskambinsiu santechnikui.")],
    plan_electrician: [t("I'll call | the | electrician | right away.", "Paskambinsiu | — | elektrikui | tuoj pat.", "Tuoj pat paskambinsiu elektrikui.")],
    plan_someone: [t("I'll send | someone | to look | at | it.", "Atsiųsiu | ką nors | pažiūrėti | — | jo.", "Atsiųsiu ką nors jo pažiūrėti.",
      { flags: { 3: "“at” (look at): no Lithuanian word; after a verb of sending the purpose infinitive takes the genitive jo." } })],
    visit_time: [
      t("He | can | come | tomorrow | at | ten. | Will | you | be | home?", "Jis | gali | ateiti | rytoj | — | dešimtą. | Ar | jūs | būsite | namie?",
        "Jis gali ateiti rytoj dešimtą. Ar būsite namie?", { flags: { 4: F_AT_CLOCK, 6: "“Will” in a yes/no question = the particle ar; the future sits on būsite (linked to “be”)." } }),
      t("He's | free | tomorrow | at | ten. | Will | you | be | home?", "Jis yra | laisvas | rytoj | — | dešimtą. | Ar | jūs | būsite | namie?",
        "Rytoj dešimtą jis laisvas. Ar būsite namie?", { flags: { 3: F_AT_CLOCK, 5: "“Will” in a yes/no question = the particle ar; the future sits on būsite (linked to “be”)." } }),
    ],
    meantime_heat: [
      t("In the meantime, | I | can | bring | you | a | space heater.", "Kol kas | aš | galiu | atnešti | jums | — | šildytuvą.", "Kol kas galiu jums atnešti šildytuvą."),
    ],
    meantime_leak: [
      t("In the meantime, | you | can | turn off | the | water | under | the | sink.", "Kol kas | jūs | galite | užsukti | — | vandenį | po | — | kriaukle.",
        "Kol kas galite užsukti vandenį po kriaukle."),
    ],
    home_yes_ok: [
      t("Perfect. | He'll be | there | at | ten.", "Puiku. | Jis bus | ten | — | dešimtą.", "Puiku. Jis bus dešimtą.", { flags: { 3: F_AT_CLOCK } }),
    ],
    home_no: [
      t("No | problem. | I | can | let | him | in | with | my | key.", "Jokių | problemų. | Aš | galiu | įleisti | jį | — | su | savo | raktu.",
        "Jokių problemų. Galiu jį įleisti su savo raktu.", { flags: { 6: "“in” (let … in): the prefix į- of įleisti carries it." } }),
    ],
    key_ok_q: [t("Is | that | okay | with you?", "Ar | tai | gerai | jums?", "Ar jums tai tinka?", { flags: { 0: F_IS_Q } })],
    other_time_q: [t("What | time | works | for you?", "Koks | laikas | tinka | jums?", "Koks laikas jums tinka?")],
    time_noted: [t("Okay, | I'll ask | him | to come | then.", "Gerai, | paprašysiu | jo | ateiti | tada.", "Gerai, paprašysiu jo tada ateiti.")],
    key_done: [t("Great. | I'll let | him | in | at | ten.", "Puiku. | Įleisiu | jį | — | — | dešimtą.", "Puiku. Dešimtą jį įleisiu.",
      { flags: { 3: "“in” (let … in): the prefix į- of įleisiu carries it.", 4: F_AT_CLOCK } })],
    also_check: [t("Okay, | he'll check | that | too.", "Gerai, | jis patikrins | tai | irgi.", "Gerai, jis patikrins ir tai.")],
    works_here: [t("Don't worry, | everything | here | works.", "Nesijaudinkite, | viskas | čia | veikia.", "Nesijaudinkite, čia viskas veikia.")],
    thanks_telling: [t("Thanks | for | telling | me!", "Ačiū, | kad | pasakėte | man!", "Ačiū, kad pasakėte!")],
    what_problem: [t("Of course. | What's | the | problem?", "Žinoma. | Kokia yra | — | problema?", "Žinoma. Kokia problema?")],
  },

  hints: {
    purpose: {
      lt: "Pasakyti, kad atėjai apžiūrėti buto",
      items: [
        { id: "here_see", s: t("Hi, | I'm | here | to see | the | apartment.", "Sveiki, | aš esu | čia | apžiūrėti | — | butą.", "Sveiki, atėjau apžiūrėti buto.") },
        { id: "here_about", s: t("I'm | here | about | the | apartment | for rent.", "Aš esu | čia | dėl | — | buto | nuomai.", "Atėjau dėl nuomojamo buto.") },
        { id: "like_see", s: t("I'd like | to see | the | apartment, | please.", "Norėčiau | pamatyti | — | butą, | prašau.", "Norėčiau pamatyti butą.") },
        { id: "spoke_phone", s: t("We | spoke | on the phone | yesterday.", "Mes | kalbėjome | telefonu | vakar.", "Vakar kalbėjomės telefonu.") },
        { id: "still_avail", s: t("Is | the | apartment | still | available?", "Ar | — | butas | dar | laisvas?", "Ar butas dar laisvas?", { flags: { 0: F_IS_Q } }) },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    ask_terms: {
      lt: "Paklausti apie nuomos sąlygas",
      items: [
        { id: "q_rent", s: t("How much | is | the | rent?", "Kiek | kainuoja | — | nuoma?", "Kiek kainuoja nuoma?") },
        { id: "q_util", s: t("Are | utilities | included?", "Ar | komunaliniai mokesčiai | įskaičiuoti?", "Ar komunaliniai mokesčiai įskaičiuoti?", { flags: { 0: F_ARE_Q } }),
          note: "„Utilities“ – vanduo, šildymas, elektra, šiukšlių išvežimas." },
        { id: "q_deposit", s: t("How much | is | the | security | deposit?", "Kiek | sudaro | — | garantinis | užstatas?", "Kokio dydžio garantinis užstatas?") },
        { id: "q_lease", s: t("How long | is | the | lease?", "Kokiam laikui | sudaroma | — | sutartis?", "Kokiam laikui sudaroma nuomos sutartis?"),
          note: "„Lease“ – buto nuomos sutartis." },
        { id: "q_util2", s: t("Is | electricity | included?", "Ar | elektra | įskaičiuota?", "Ar elektra įskaičiuota?", { flags: { 0: F_IS_Q } }) },
        { id: "q_furnished", s: t("Is | it | furnished?", "Ar | jis | su baldais?", "Ar butas su baldais?", { flags: { 0: F_IS_Q } }) },
        { id: "q_pets", s: t("Are | pets | allowed?", "Ar | gyvūnai | leidžiami?", "Ar galima laikyti gyvūnų?", { flags: { 0: F_ARE_Q } }) },
        { id: "q_movein", s: t("When | can | I | move in?", "Kada | galiu | aš | įsikelti?", "Kada galėčiau įsikelti?") },
        { id: "q_parking", s: t("Is | there | parking?", "Ar yra | — | stovėjimo vieta?", "Ar yra kur pastatyti automobilį?", { flags: { 1: F_THERE } }) },
        { id: "q_laundry", s: t("Where's | the | laundry room?", "Kur yra | — | skalbykla?", "Kur yra skalbykla?") },
      ],
    },
    ask_more: {
      lt: "Paklausti apie namą ir apylinkes",
      items: [
        { id: "q_quiet", s: t("Is | it | a | quiet | building?", "Ar | tai | — | ramus | namas?", "Ar namas ramus?", { flags: { 0: F_IS_Q } }) },
        { id: "q_bus", s: t("Is | there | a | bus | stop | nearby?", "Ar yra | — | — | autobusų | stotelė | netoliese?", "Ar netoliese yra autobusų stotelė?", { flags: { 1: F_THERE } }) },
        { id: "q_floor", s: t("What | floor | is | it | on?", "Kuriame | aukšte | yra | jis | [kuriame]?", "Kuriame aukšte butas?",
          { flags: { 4: "Stranded “on”: the locative kuriame aukšte (at the start) carries it." } }) },
        { id: "q_elevator", s: t("Is | there | an | elevator?", "Ar yra | — | — | liftas?", "Ar yra liftas?", { flags: { 1: F_THERE } }) },
        { id: "q_see", s: t("Can | I | see | the | bedroom?", "Ar galiu | aš | pamatyti | — | miegamąjį?", "Ar galiu pamatyti miegamąjį?") },
        { id: "q_payrent", s: t("When | is | the | rent | due?", "Kada | yra | — | nuoma | mokėtina?", "Iki kada reikia sumokėti nuomą?") },
        { id: "q_lower", s: t("Could | you | lower | the | rent | a little?", "Ar galėtumėte | jūs | sumažinti | — | nuomą | truputį?", "Ar galėtumėte truputį sumažinti nuomą?") },
      ],
    },
    done_asking: {
      lt: "Pasakyti, kad klausimų nebėra",
      items: [
        { id: "that_all", s: t("I | think | that's | all.", "Aš | manau, | tai yra | viskas.", "Manau, tai viskas.") },
        { id: "no_more_q", s: t("No, | that's | all, | thanks.", "Ne, | tai yra | viskas, | ačiū.", "Ne, tai viskas, ačiū.") },
        { id: "take_it", s: t("I'll take | it!", "Imsiu | jį!", "Imsiu!") },
      ],
    },
    decide: {
      lt: "Priimti sprendimą",
      items: [
        { id: "take_it", s: t("I'll take | it!", "Imsiu | jį!", "Imsiu!") },
        { id: "think", s: t("I | need | to think | about | it.", "Man | reikia | pagalvoti | apie | tai.", "Turiu pagalvoti.") },
        { id: "not_for_me", s: t("I | don't think | it's | right | for me.", "Aš | nemanau, | kad jis | tinka | man.", "Nemanau, kad jis man tinka.",
          { flags: { 2: "“it's” = kad jis; the verb tinka (under “right”) takes over the copula." } }) },
        { id: "like_to_rent", s: t("I'd like | to rent | it.", "Norėčiau | išsinuomoti | jį.", "Norėčiau jį išsinuomoti.") },
        { id: "let_know", s: t("Can | I | let | you | know | tomorrow?", "Ar galiu | aš | pranešti | jums | — | rytoj?", "Ar galėčiau jums pranešti rytoj?", { flags: { 4: F_KNOW } }) },
        { id: "too_expensive", s: t("It's | a little | too | expensive | for me.", "Jis yra | truputį | per | brangus | man.", "Man jis kiek per brangus.") },
      ],
    },
    hurry: {
      lt: "Pažadėti atsakyti iki vakaro",
      items: [
        { id: "call_tonight", s: t("Okay, | I'll call | you | tonight.", "Gerai, | paskambinsiu | jums | šįvakar.", "Gerai, paskambinsiu jums šįvakar.") },
        { id: "take_now", s: t("Actually, | I'll take | it!", "Tiesą sakant, | imsiu | jį!", "Tiesą sakant, imsiu!") },
      ],
    },
    movein: {
      lt: "Pasakyti, kada norėtum įsikelti",
      items: [
        { id: "movein_first", s: t("On the first, | if | possible.", "Pirmąją, | jei | įmanoma.", "Nuo mėnesio pirmosios, jei įmanoma.") },
        { id: "next_month", s: t("Next | month, | if | possible.", "Kitą | mėnesį, | jei | įmanoma.", "Kitą mėnesį, jei įmanoma.") },
        { id: "asap", s: t("As soon as possible.", "Kuo greičiau.", "Kuo greičiau.") },
      ],
    },
    people: {
      lt: "Pasakyti, kas gyvens bute",
      items: [
        { id: "just_me", s: t("It's | just | me.", "Tai yra | tik | aš.", "Gyvensiu {m:vienas|f:viena}.") },
        { id: "with_family", s: t("Me | and | my | family.", "Aš | ir | mano | šeima.", "Aš ir mano šeima.") },
      ],
    },
    pets: {
      lt: "Pasakyti, ar turi gyvūnų",
      items: [
        { id: "no_pets", s: t("No, | I | don't have | any | pets.", "Ne, | aš | neturiu | jokių | gyvūnų.", "Ne, gyvūnų neturiu.") },
        { id: "have_cat", s: t("I | have | a | cat.", "Aš | turiu | — | katę.", "Turiu katę.") },
      ],
    },
    pet_kind: {
      lt: "Pasakyti, kokį gyvūną turi",
      items: [
        { id: "have_cat", s: t("I | have | a | cat.", "Aš | turiu | — | katę.", "Turiu katę.") },
        { id: "have_dog", s: t("A | small | dog.", "— | Mažą | šunį.", "Mažą šunį.") },
      ],
    },
    docs: {
      lt: "Parodyti asmens dokumentą",
      items: [
        { id: "here_passport", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "passport_ok", s: t("Is | a | passport | okay?", "Ar | — | pasas | tinka?", "Ar tiks pasas?", { flags: { 0: "“Is” in a question = the particle ar; tinka (under “okay”) takes over the copula." } }) },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    sign: {
      lt: "Pasirašyti nuomos sutartį",
      items: [
        { id: "where_sign", s: t("Sure. | Where | do | I | sign?", "Žinoma. | Kur | — | aš | pasirašau?", "Žinoma. Kur pasirašyti?", { flags: { 2: F_WH_DO } }) },
        { id: "read_first", s: t("Can | I | read | it | first?", "Ar galiu | aš | perskaityti | ją | pirma?", "Ar galiu pirma perskaityti?") },
        { id: "copy", s: t("Could | I | get | a | copy?", "Ar galėčiau | aš | gauti | — | kopiją?", "Ar galėčiau gauti kopiją?") },
      ],
    },
    problem: {
      lt: "Pranešti apie gedimą",
      items: [
        { id: "not_working", s: t("The | heating | isn't working.", "— | Šildymas | neveikia.", "Neveikia šildymas.") },
        { id: "leaking", s: t("The | kitchen | faucet | is leaking.", "— | Virtuvės | čiaupas | laša.", "Laša virtuvės čiaupas."), note: "„Faucet“ – čiaupas (britai sako „tap“)." },
        { id: "no_hot", s: t("There's | no | hot | water.", "Nėra | jokio | karšto | vandens.", "Nėra karšto vandens.", { flags: { 0: F_CONCORD } }) },
        { id: "sorry_bother", s: t("Sorry | to bother | you, | but | the | heating | isn't working.", "Atsiprašau, kad | trukdau | jums, | bet | — | šildymas | neveikia.",
          "Atsiprašau, kad trukdau, bet neveikia šildymas.", { flags: { 1: "“to bother” = trukdau: after atsiprašau, kad the verb is finite." } }) },
        { id: "problem_with", s: t("There's | a | problem | with | the | shower.", "Yra | — | problema | su | — | dušu.", "Kažkas negerai su dušu.") },
        { id: "fix", s: t("Could | you | send | someone | to fix | it?", "Ar galėtumėte | jūs | atsiųsti | ką nors | sutaisyti | jo?", "Ar galėtumėte ką nors atsiųsti jo sutaisyti?") },
      ],
    },
    repair: {
      lt: "Pasakyti, ar būsi namie",
      items: [
        { id: "home_yes", s: t("Yes, | I'll be | home.", "Taip, | būsiu | namie.", "Taip, būsiu namie.") },
        { id: "at_work", s: t("No, | I'll be | at work.", "Ne, | būsiu | darbe.", "Ne, būsiu darbe.") },
        { id: "ten_fine", s: t("Tomorrow | at | ten | is fine.", "Rytoj | — | dešimtą | tinka.", "Rytoj dešimtą – tinka.", { flags: { 1: F_AT_CLOCK } }) },
      ],
    },
    key_ok: {
      lt: "Sutikti, kad įleistų meistrą",
      items: [
        { id: "yes_fine", s: t("Yes, | that's | fine.", "Taip, | tai | tinka.", "Taip, tinka.") },
        { id: "use_key", s: t("Sure, | you | can | use | your | key.", "Žinoma, | jūs | galite | naudoti | savo | raktą.", "Žinoma, galite įeiti su savo raktu.") },
        { id: "after_five", s: t("Could | he | come | after | five?", "Ar galėtų | jis | ateiti | po | penkių?", "Ar jis galėtų ateiti po penkių?") },
      ],
    },
    other_time: {
      lt: "Pasiūlyti kitą laiką",
      items: [
        { id: "after_five", s: t("Could | he | come | after | five?", "Ar galėtų | jis | ateiti | po | penkių?", "Ar jis galėtų ateiti po penkių?") },
        { id: "saturday", s: t("Saturday | would | be | better.", "Šeštadienis | — | būtų | geriau.", "Geriau šeštadienį.", { flags: { 1: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
        { id: "afternoon", s: t("In the afternoon, | please.", "Po pietų, | prašau.", "Po pietų, prašau.") },
      ],
    },
  },

  tips: {
    uk_flat: { key: "uk_flat", lt: "Suprasta! Amerikoje sakoma „apartment“ (butas).", better: "I'm here to see the apartment." },
    uk_bills: { key: "uk_bills", lt: "Suprasta! Amerikoje dažniau klausiama: „Are utilities included?“", better: "Are utilities included?" },
    uk_tap: { key: "uk_tap", lt: "Suprasta! Amerikoje čiaupas dažniau vadinamas „faucet“.", better: "The kitchen faucet is leaking." },
    uk_lift: { key: "uk_lift", lt: "Suprasta! Amerikoje liftas – „elevator“.", better: "Is there an elevator?" },
    uk_ground: { key: "uk_ground", lt: "Suprasta! Amerikoje pirmas aukštas vadinamas „first floor“.", better: "Is it on the first floor?" },
    us_lease: { key: "us_lease", lt: "Suprasta! Buto nuomos sutartis Amerikoje vadinama „lease“.", better: "How long is the lease?" },
  },

  merges: {
    "come on in": { reason: "lexical_expression", split: "come → ateikite, on → ant, in → į gives a false literal; the friendly invitation = užeikite.", minimal: "All three words form the formula." },
    "living room": { reason: "lexical_expression", split: "living → gyvenamasis + room → kambarys gives “gyvenamasis kambarys”; the compound names one room = svetainė.", minimal: "Two words, one room name." },
    "laundry room": { reason: "lexical_expression", split: "laundry → skalbiniai + room → kambarys gives “skalbinių kambarys”; the compound names one place = skalbykla.", minimal: "Two words, one place name." },
    "move in": { reason: "lexical_expression", split: "move → kraustytis + in → į leaves a stray preposition; the prefix į- of įsikelti carries “in” (C-PHR).", minimal: "Verb and particle." },
    "to move in": { reason: "grammatical_fusion", split: "to → į is false (infinitive -ti) and in → į is the prefix of įsikelti (C-INF + C-PHR).", minimal: "Infinitive marker, verb and particle." },
    "move out": { reason: "lexical_expression", split: "move → kraustytis + out → lauk is false; the prefix iš- of išsikraustyti carries “out” (C-PHR).", minimal: "Verb and particle." },
    "settling in": { reason: "lexical_expression", split: "settling → kuriasi + in → į leaves a stray preposition; = įsikurti (the prefix į- carries “in”) (C-PHR).", minimal: "Verb and particle." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgas gives “kaip ilgas”; asking about duration = kokiam laikui / kiek laiko.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug gives “kaip daug”; asking a number = kiek.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal movement; the invitation to ask = klauskite / prašom.", minimal: "Two words." },
    "right away": { reason: "lexical_expression", split: "right → dešinė/teisingai + away → toli is false; = tuoj pat.", minimal: "Two words." },
    "turn off": { reason: "lexical_expression", split: "turn → sukti + off → nuo is false; turning off water = užsukti (C-PHR).", minimal: "Verb and particle." },
    "by the way": { reason: "lexical_expression", split: "by → prie, the → —, way → kelias is false; the discourse marker = beje.", minimal: "All three words." },
    "just so you know": { reason: "lexical_expression", split: "just → tik, so → taip, you → jūs, know → žinote is a word salad; the formula = kad žinotumėte.", minimal: "The four words form the formula." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb “a little” = truputį (C-LEX).", minimal: "Two words." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs gives a false “I am scared”; the polite softener = deja.", minimal: "Two words." },
    "not at all": { reason: "lexical_expression", split: "not → ne + at all → visai gives “ne visai” (not quite), the opposite nuance; = nieko tokio / visai ne.", minimal: "All three words." },
    "space heater": { reason: "lexical_expression", split: "space → erdvė + heater → šildytuvas gives “erdvės šildytuvas”; the compound = (kilnojamasis) šildytuvas.", minimal: "Two words, one device." },
    "good luck": { reason: "lexical_expression", split: "good → gera + luck → sėkmė gives “gera sėkmė”; the wish = sėkmės.", minimal: "Two words." },
    "in the meantime": { reason: "lexical_expression", split: "in → —, the → —, meantime → tarpinis laikas gives no Lithuanian; = kol kas / tuo tarpu.", minimal: "The phrase is one adverbial." },
    "as soon as possible": { reason: "lexical_expression", split: "as → kaip, soon → greitai, as → kaip, possible → įmanoma is a calque; = kuo greičiau.", minimal: "The four words form the formula." },
    "for four": { reason: "grammatical_fusion", split: "for → — + four → keturi: the dative keturiems carries “for” (C-CASE).", minimal: "Preposition and numeral head." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // viewing (first visits)
    { lt: "Pasakyk, kad atėjai dėl buto", optional: true, when: view, done: (c) => view(c) && !!c.s.purpose },
    { lt: "Paklausk apie nuomos sąlygas", optional: true, when: view, done: (c) => view(c) && (c.s.qCount > 0 || !!c.s.qDone) },
    { lt: "Nuspręsk: imi ar ne", optional: true, when: view, done: (c) => view(c) && !!c.s.decision },
    { lt: "Pasakyk, kada įsikelsi", optional: true, when: (c) => taking(c), done: (c) => taking(c) && !!c.s.moveinKnown },
    { lt: "Parodyk asmens dokumentą", optional: true, when: (c) => taking(c) && c.s.askDocs, done: (c) => !!c.s.docsOk },
    { lt: "Pasirašyk nuomos sutartį", optional: true, when: (c) => taking(c), done: (c) => !!c.s.signed },
    { lt: "Pažadėk atsakyti iki vakaro", optional: true, when: (c) => view(c) && c.s.decision === "think" && c.s.otherApplicant, done: (c) => !!c.s.hurryDone },
    // tenant mode (twist)
    { lt: "Pranešk apie gedimą", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.problem },
    { lt: "Atsakyk, ar būsi namie", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.visitAnswered || !!c.s.visitOk },
    { lt: "Sutark meistro vizito laiką", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.visitOk },
  ],

  steps: [
    // Tenant mode (returning players): report a problem and arrange a repair visit.
    { id: "problem", when: (c) => c.s.mode === "problem", done: (c) => !!c.s.problem,
      ask: (c) => { if (!c.s.howisSaid) { c.s.howisSaid = true; c.say("howis"); } else c.say("problem_reask"); },
      // "Good, thank you." answers "How's everything with the apartment?" (all good)
      expects: ["report_problem", "all_good", "sorry_bother", "fix_request", "have_problem", "g_howareyou_answer"],
      suggest: [{ lt: "Pranešti apie gedimą: neveikia šildymas, laša čiaupas…", hint: "problem" }],
      yes: (c) => { apartment.handlers.all_good(c, {}, { intent: "all_good", slots: {}, tags: [] }); },
      no: (c) => { c.say("problem_what"); c.hold(); } },
    { id: "visit", when: (c) => c.s.mode === "problem" && !!c.s.problem, done: (c) => !!c.s.visitOk,
      ask: (c) => c.say("visit_time"), expects: ["home_yes", "at_work", "time_pref", "use_key", "time_ok", "time_bad"],
      suggest: [{ lt: "Pasakyti, ar būsi namie, arba pasiūlyti kitą laiką", hint: "repair" }],
      yes: (c) => { c.say("home_yes_ok"); c.s.visitOk = true; },
      no: (c) => homeNo(c) },

    // Viewing mode
    { id: "purpose", when: view, done: (c) => !!c.s.purpose,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "must" ? "greet_must_be" : "greet_help"); }
        else { c.s.lastQ = "must"; c.say("purpose_again"); }
      },
      expects: ["see_apartment", "intro_name_ctx", "my_name"],
      suggest: [{ lt: "Pasakyti, kad atėjai apžiūrėti buto", hint: "purpose" }],
      // "Yes" to "Can I help you?" → Mr. Patel asks whether it is about the apartment; otherwise it confirms.
      yes: (c) => { if (c.s.lastQ !== "help") enter(c); },
      no: (c) => { c.s.lastQ = "help"; c.say("how_help"); c.hold(); } },
    // Mr. Patel's own questions: asked once; dropped if the learner moves on to something else.
    { id: "movein_q", when: (c) => view(c) && c.s.purpose && c.s.askMovein, done: (c) => !!c.s.moveinAsked || !!c.s.moveinKnown,
      ask: (c) => { c.s.moveinAsked = true; askMovein(c, true); }, expects: ["movein_ans_ctx", "ask_movein"],
      suggest: [{ lt: "Pasakyti, kada norėtum įsikelti", hint: "movein" }],
      help: (c) => { c.say("movein_info"); } },
    { id: "people_q", when: (c) => view(c) && c.s.purpose && c.s.askPeople, done: (c) => !!c.s.peopleAsked || !!c.s.peopleKnown,
      ask: (c) => {
        c.s.peopleAsked = true;
        c.say("ask_people");
        c.expect({ id: "people_q", optional: true, expects: ["people_ans", "people_num_ctx"], hints: ["people"],
          suggest: [{ lt: "Pasakyti, kas gyvens bute", hint: "people" }],
          on: { people_ans: (cc, sl, sg) => { apartment.handlers.people_ans(cc, sl, sg); }, people_num_ctx: (cc, sl, sg) => { apartment.handlers.people_num_ctx(cc, sl, sg); } },
          yes: (cc) => { cc.s.peopleKnown = true; cc.say("people_ack"); },
          no: (cc) => {
            cc.say("ask_how_many");
            cc.expect({ id: "how_many", optional: true, expects: ["people_ans", "people_num_ctx"], hints: ["people"],
              suggest: [{ lt: "Pasakyti, kiek žmonių gyvens", hint: "people" }],
              on: { people_ans: (c3, sl, sg) => { apartment.handlers.people_ans(c3, sl, sg); }, people_num_ctx: (c3, sl, sg) => { apartment.handlers.people_num_ctx(c3, sl, sg); } } });
          } });
      },
      expects: ["people_ans", "people_num_ctx"] },
    { id: "pets_q", when: (c) => view(c) && c.s.purpose && c.s.askPets, done: (c) => !!c.s.petsAsked || !!c.s.petsKnown,
      ask: (c) => {
        c.s.petsAsked = true;
        c.say("ask_pets_q");
        c.expect({ id: "pets_q", optional: true, expects: ["have_pet", "no_pets"], hints: ["pets"],
          suggest: [{ lt: "Pasakyti, ar turi gyvūnų", hint: "pets" }],
          on: { have_pet: (cc, sl, sg) => { apartment.handlers.have_pet(cc, sl, sg); }, no_pets: (cc, sl, sg) => { apartment.handlers.no_pets(cc, sl, sg); } },
          yes: (cc) => {
            cc.say("ask_pet_which");
            cc.expect({ id: "pet_which", optional: true, expects: ["have_pet"], hints: ["pet_kind"],
              suggest: [{ lt: "Pasakyti, kokį gyvūną turi", hint: "pet_kind" }],
              on: { have_pet: (c3, sl, sg) => { apartment.handlers.have_pet(c3, sl, sg); } },
              yes: (c3) => { c3.s.petsKnown = true; c3.say("pets_policy"); }, no: (c3) => { c3.s.petsKnown = true; c3.say("ack"); } });
          },
          no: (cc) => { cc.s.petsKnown = true; cc.say("ack"); } });
      },
      expects: ["have_pet", "no_pets"] },
    { id: "questions", when: view, done: (c) => !!c.s.qDone,
      ask: (c) => c.say(c.s.qCount ? "ask_questions_more" : "ask_questions_first"),
      expects: ["ask_rent", "ask_utilities", "ask_deposit", "ask_furnished", "ask_appliance", "ask_pets", "ask_lease", "ask_movein", "ask_parking",
        "ask_laundry", "ask_quiet", "ask_bus", "ask_floor", "ask_smoke", "ask_size", "ask_see", "ask_payrent", "ask_apply", "ask_landlord", "ask_lower",
        "no_more", "take", "think", "decline", "have_questions"],
      suggest: [
        { lt: "Paklausti apie nuomą, komunalinius mokesčius, užstatą, sutartį", hint: "ask_terms" },
        { lt: "Paklausti apie aukštą, autobusą, triukšmą", hint: "ask_more" },
        { lt: "Pasakyti, kad klausimų nebėra", hint: "done_asking" },
      ],
      yes: (c) => { c.say("go_ahead"); c.hold(); },
      no: (c) => { c.s.qDone = true; volunteer(c); } },
    { id: "decision", when: (c) => view(c) && !!c.s.qDone, done: (c) => !!c.s.decision,
      ask: (c) => c.say("decision_ask"), expects: ["take", "think", "decline", "like_it", "too_x", "call_back", "think_ctx"],
      suggest: [{ lt: "Nuspręsti: imti butą ar dar pagalvoti", hint: "decide" }],
      yes: (c) => take(c), no: (c) => decline(c) },
    { id: "movein_take", when: (c) => view(c) && c.s.decision === "take", done: (c) => !!c.s.moveinKnown,
      ask: (c) => askMovein(c, false), expects: ["movein_ans_ctx", "ask_movein"],
      suggest: [{ lt: "Pasakyti, kada norėtum įsikelti", hint: "movein" }],
      help: (c) => { c.say("movein_info"); c.s.moveinKnown = true; } },
    { id: "docs", when: (c) => view(c) && c.s.decision === "take" && c.s.askDocs, done: (c) => !!c.s.docsOk,
      ask: (c) => c.say("docs_ask"), expects: ["here_you_go", "passport_ok", "have_job", "no_job", "sign_here_ctx", "id_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "docs" }],
      yes: (c) => { c.s.docsOk = true; c.say("docs_ok"); } },
    { id: "sign", when: (c) => view(c) && c.s.decision === "take", done: (c) => !!c.s.signed,
      ask: (c) => c.say("sign_ask"), expects: ["where_sign", "here_you_go", "read_first", "copy", "sign_here_ctx"],
      suggest: [{ lt: "Pasirašyti nuomos sutartį", hint: "sign" }],
      yes: (c) => sign(c) },
  ],

  init: (c) => {
    c.s.asked = {};
    c.s.qCount = 0;
    c.s.mode = c.visits >= 1 && c.chance(0.45) ? "problem" : "view";
    c.s.greetKind = c.chance(0.5) ? "must" : "help";
    c.s.tourExtra = c.chance(0.5);
    c.s.askMovein = c.chance(0.55);
    c.s.askPeople = c.chance(0.35);
    c.s.askPets = c.chance(0.45);
    c.s.askDocs = c.chance(0.6);
    c.s.otherApplicant = c.visits >= 1 && c.chance(0.4);
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- arriving ---
    see_apartment(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (c.s.purpose) { c.say("ack"); return; }
      enter(c, /available|free/.test(c.heard.toLowerCase()) ? "still_yes" : "come_in");
    },
    my_name(c) {
      if (!c.s.metSaid) { c.s.metSaid = true; c.say("nice_to_meet"); }
      // "Yes, I am. My name is Tomas." to "Are you here about the apartment?": the yes counts too
      if (view(c) && !c.s.purpose && c.s.lastQ === "must" && ynLead(c) === "yes") enter(c);
    },
    intro_name_ctx(c) {
      if (!c.s.metSaid) { c.s.metSaid = true; c.say("nice_to_meet"); }
      if (view(c) && !c.s.purpose && c.s.lastQ === "must" && ynLead(c) === "yes") enter(c);
    },
    vocative(c) {
      if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(c.heard) && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
    },

    // --- the learner's questions ---
    ask_rent(c) { asked(c, "rent"); c.say("rent"); },
    ask_utilities(c, slots) {
      asked(c, "utilities");
      // two utilities in one question ("Does the rent include water and heating?"): the full answer
      const u = Array.isArray(slots.utility) ? undefined : slots.utility as string | undefined;
      if (/\bhow much\b/.test(c.heard.toLowerCase()) && (!u || u === "electricity")) {
        if (!u && !c.s.utilSaid) c.say("utilities_all");
        c.s.utilSaid = true;
        c.say("util_cost");
        return;
      }
      c.s.utilSaid = true;
      if (!u) { c.say("utilities_all"); return; }
      if (INCLUDED.includes(u)) { c.say("util_yes", { X: u }); return; }
      c.say("util_no", { X: u });
      c.say("util_separate", { X: u });
      if (u === "internet" && c.chance(0.7)) c.say("util_internet");
    },
    ask_deposit(c) {
      asked(c, "deposit");
      const h = c.heard.toLowerCase();
      if (/refundable|\bback\b/.test(h)) { c.say("deposit_back"); return; }
      c.say("deposit");
      if (/up ?front|move in|at the start/.test(h) || c.chance(0.4)) c.say("deposit_first");
    },
    ask_furnished(c) { asked(c, "furnished"); c.say("furnished"); },
    ask_appliance(c, slots) {
      asked(c, "furnished");
      const a = slots.appliance as string;
      if (a === "microwave") c.say("app_microwave");
      else if (a === "ac") c.say("app_ac");
      else if (a === "washer" || a === "dryer") c.say("laundry");
      else c.say("app_kitchen", { X: a });
    },
    ask_pets(c, slots) { asked(c, "pets"); c.s.petsKnown = true; petAnswer(c, slots.pet); },
    have_pet(c, slots) { c.s.petsKnown = true; petAnswer(c, slots.pet ?? "cat"); },
    no_pets(c) { c.s.petsKnown = true; c.say("ack"); },
    ask_lease(c) {
      asked(c, "lease");
      if (/\bsix\b|\bhalf\b|month to month|shorter|\b(a|one) month\b/.test(c.heard.toLowerCase())) c.say("lease_min");
      else c.say("lease");
    },
    ask_movein(c) { asked(c, "movein"); c.say("movein_info"); },
    ask_parking(c) { asked(c, "parking"); c.say("parking"); },
    ask_laundry(c) { asked(c, "laundry"); c.say("laundry"); },
    ask_quiet(c) { asked(c, "quiet"); c.say(/safe/.test(c.heard.toLowerCase()) ? "safe" : "quiet"); },
    ask_bus(c) { asked(c, "bus"); c.say(/downtown|town|center/.test(c.heard.toLowerCase()) ? "bus_downtown" : "bus"); },
    ask_floor(c) {
      asked(c, "floor");
      if (/elevator|lift/.test(c.heard.toLowerCase())) { c.say("elevator"); return; }
      c.say("floor");
      if (c.chance(0.4)) c.say("elevator");
    },
    ask_smoke(c) { asked(c, "smoking"); c.say("smoking"); },
    ask_size(c) { asked(c, "size"); c.say("size"); },
    ask_see(c) { asked(c, "see"); c.say("see_room"); },
    ask_payrent(c) { asked(c, "payrent"); c.say(/\bhow\b/.test(c.heard.toLowerCase()) && !/\bwhen\b/.test(c.heard.toLowerCase()) ? "rent_pay_how" : "rent_due"); },
    ask_apply(c) { asked(c, "apply"); c.say("apply_info"); },
    ask_landlord(c) { asked(c, "landlord"); c.say("landlord_here"); },
    ask_lower(c) { asked(c, "lower"); c.say("rent_firm"); },
    too_x(c) {
      if (view(c) && c.step === "decision") { decline(c); return; }
      if (/expensive|a lot|too much/.test(c.heard.toLowerCase())) { asked(c, "lower"); c.say("rent_firm"); return; }
      c.say("understand");
    },
    ask_unknown(c) { c.say("unknown_q"); },

    // --- deciding ---
    no_more(c) { if (!view(c)) { c.say("ack"); return; } c.s.qDone = true; volunteer(c); },
    take(c) { take(c); },
    like_it(c) {
      if (view(c) && c.step === "decision") { take(c); return; }
      if (view(c) && c.step === "sign") { sign(c); return; }
      c.say("like_it_ack");
    },
    think(c) {
      if (!view(c)) { c.say("ack"); return; }
      // already thinking it over and asked to call back by tonight: don't start again
      if (c.s.decision === "think" && c.s.hurryAsked && !c.s.hurryDone) { hurryAnswer(c); return; }
      c.s.qDone = true; c.s.decision = "think";
      volunteer(c);
      c.say("think_ok");
      if (c.s.otherApplicant) {
        c.twist("someone_else");
        c.s.hurryAsked = true;
        c.say("someone_else"); c.say("hurry");
        c.expect({ id: "hurry", expects: ["call_back", "take"], hints: ["decide"],
          suggest: [{ lt: "Pažadėti paskambinti iki vakaro", hint: "hurry" }],
          on: { call_back: (cc) => { cc.s.hurryDone = true; cc.say("wait_call"); }, take: (cc) => { cc.s.hurryDone = true; cc.s.decision = null; take(cc); },
            think: (cc) => { hurryAnswer(cc); } },
          yes: (cc) => { cc.s.hurryDone = true; cc.say("wait_call"); }, no: (cc) => { cc.s.hurryDone = true; cc.say("ack"); },
          ask: (cc) => cc.say("hurry") });
      }
    },
    decline(c) { if (!view(c)) { c.say("ack"); return; } decline(c); },
    think_ctx(c, slots, seg) { apartment.handlers.think(c, slots, seg); },
    have_questions(c) { c.say("go_ahead"); c.hold(); },
    id_ctx(c, slots, seg) { apartment.handlers.here_you_go(c, slots, seg); },
    call_back(c) {
      // "I'll text you tomorrow" before deciding = "I need to think about it"
      if (view(c) && !c.s.decision) { apartment.handlers.think(c, {}, { intent: "think", slots: {}, tags: [] }); return; }
      if (c.s.decision === "think") c.s.hurryDone = true;
      c.say(c.s.decision === "think" ? "wait_call" : "ack");
    },

    // --- Mr. Patel's questions ---
    movein_ans_ctx(c) { c.s.moveinKnown = true; c.say("movein_ack"); if (c.chance(0.5)) c.say("movein_info"); },
    people_ans(c) { c.s.peopleKnown = true; peopleAnswer(c, /\bkids\b|\bchildren\b|\bfamily\b/.test(c.heard.toLowerCase()) ? 3 : /\bjust\b|\bonly\b|\balone\b/.test(c.heard.toLowerCase()) ? 1 : 2); },
    people_num_ctx(c, slots) {
      c.s.peopleKnown = true;
      const w: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };
      const n = typeof slots.number === "number" ? slots.number : w[c.heard.toLowerCase().match(/two|three|four|five/)?.[0] ?? "two"];
      peopleAnswer(c, n);
    },

    // --- documents and the lease ---
    here_you_go(c) {
      if (c.step === "sign" || (c.s.decision === "take" && (!c.s.askDocs || c.s.docsOk) && !c.s.signed)) { sign(c); return; }
      if (c.s.decision === "take" && !c.s.docsOk) { c.s.docsOk = true; c.say("docs_ok"); return; }
      c.say("ack");
    },
    passport_ok(c) { c.say("passport_ok"); if (c.s.decision === "take") c.s.docsOk = true; },
    have_job(c) { c.say("docs_ok"); if (c.s.decision === "take") c.s.docsOk = true; },
    no_job(c) { c.say("no_job_ok"); if (c.s.decision === "take") c.s.docsOk = true; },
    where_sign(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (c.s.decision !== "take") { take(c); return; }
      if (c.s.askDocs && !c.s.docsOk) { c.say("ack"); return; }
      c.say("sign_where"); sign(c);
    },
    // "Here?" while signing / "Here." while handing over the ID
    sign_here_ctx(c, slots, seg) {
      if (c.step === "sign") apartment.handlers.where_sign(c, slots, seg);
      else apartment.handlers.here_you_go(c, slots, seg);
    },
    read_first(c) { c.say("read_ok"); c.hold(); },
    copy(c) { c.say("copy_ok"); },
    pen(c) { c.say("ack"); },

    // --- tenant mode ---
    report_problem(c, slots) {
      if (view(c)) { c.say("works_here"); return; }
      if (c.s.problem) { c.say("also_check"); return; }
      const h = c.heard.toLowerCase();
      const kind: string = slots.fix ?? (/hot water/.test(h) ? "hotwater" : /heat|cold/.test(h) ? "heat" : /electric|power/.test(h) ? "lights" : "faucet");
      c.s.problem = kind;
      c.twist("problem");
      c.say("sorry_problem");
      c.say(kind === "heat" ? "plan_repairman" : ["hotwater", "faucet", "toilet", "shower"].includes(kind) ? "plan_plumber" : kind === "lights" ? "plan_electrician" : "plan_someone");
      if (kind === "heat" && c.chance(0.55)) c.say("meantime_heat");
      if (kind === "faucet" && c.chance(0.55)) c.say("meantime_leak");
    },
    all_good(c) {
      if (view(c)) { c.say("like_it_ack"); return; }
      if (c.s.problem) { c.say("ack"); return; }
      if (!c.s.goodOnce) { c.s.goodOnce = true; c.say("g_glad"); c.say("what_can_do"); c.hold(); return; }
      c.say("all_good_ack"); c.say("g_bye"); c.end();
    },
    sorry_bother(c) { c.say("no_bother"); },
    have_problem(c) {
      if (view(c) || c.s.problem) { c.say("ack"); return; }
      if (/\b(is|have) a\b.*problem|something/.test(c.heard.toLowerCase())) c.say("what_problem"); else c.say("problem_what");
      c.hold();
    },
    fix_request(c) {
      if (view(c)) { c.say("works_here"); return; }
      if (!c.s.problem) { c.say("what_problem"); c.hold(); return; }
      c.say("ack");
    },
    home_yes(c) { if (repairOpen(c)) { c.say("home_yes_ok"); c.s.visitOk = true; } else c.say("ack"); },
    at_work(c) { if (repairOpen(c)) homeNo(c); else c.say("ack"); },
    time_pref(c) { if (repairOpen(c)) { c.say("time_noted"); c.s.visitOk = true; } else c.say("ack"); },
    use_key(c) { if (repairOpen(c)) { c.say("key_done"); c.s.visitOk = true; } else c.say("ack"); },
    time_ok(c) { if (repairOpen(c)) { c.say("home_yes_ok"); c.s.visitOk = true; } else c.say("ack"); },
    time_bad(c) { if (repairOpen(c)) askOtherTime(c); else c.say("ack"); },

    // --- small talk overrides ---
    g_howareyou_answer(c) {
      // "Good, but the heating doesn't work": the problem that follows is the answer, not "all good"
      if (c.s.mode === "problem" && !c.s.problem && c.s.howisSaid && !/\bbut\b/i.test(c.heard)) { apartment.handlers.all_good(c, {}, { intent: "all_good", slots: {}, tags: [] }); return; }
      if (/\b(you|yourself)\b/i.test(c.heard)) c.say("g_asked_back");
    },
    g_howareyou_bad(c) {
      if (c.s.mode === "problem" && !c.s.problem) { c.say("problem_what"); c.hold(); return; }
      c.say("g_sorry_to_hear");
    },
  },

  finish: (c) => {
    c.complete();
    if (c.s.mode === "problem") c.say("thanks_telling");
    else if (c.s.decision === "take") { c.say("rent_due"); c.say("bye_take"); }
    else if (c.s.decision === "think") c.say("bye_think");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Hi, I'm here to see the apartment.", intent: "see_apartment" },
    { say: "Hello, I'm here about the flat for rent", intent: "see_apartment" },
    { say: "Is the apartment still available?", intent: "see_apartment" },
    { say: "I'm Tomas", intent: "intro_name_ctx", step: "purpose" },
    { say: "Tomas", intent: "none" },
    { say: "How much is the rent?", intent: "ask_rent" },
    { say: "How much is it a month?", intent: "ask_rent" },
    { say: "Are utilities included?", intent: "ask_utilities" },
    { say: "Are the bills included?", intent: "ask_utilities" },
    { say: "Is internet included?", intent: "ask_utilities", slots: { utility: "internet" } },
    { say: "Do I have to pay for electricity?", intent: "ask_utilities", slots: { utility: "electricity" } },
    { say: "Is there a security deposit?", intent: "ask_deposit" },
    { say: "Is it furnished?", intent: "ask_furnished" },
    { say: "Is there a dishwasher?", intent: "ask_appliance", slots: { appliance: "dishwasher" } },
    { say: "Can I have a cat?", intent: "ask_pets", slots: { pet: "cat" } },
    { say: "How long is the contract?", intent: "ask_lease" },
    { say: "When can I move in?", intent: "ask_movein" },
    { say: "Where can I park my car?", intent: "ask_parking" },
    { say: "Where's the laundry room?", intent: "ask_laundry" },
    { say: "Is there a lift?", intent: "ask_floor" },
    { say: "Is there a bus stop nearby?", intent: "ask_bus" },
    { say: "Could you lower the rent a little?", intent: "ask_lower" },
    { say: "Would you take $1,300?", intent: "ask_lower", slots: { amount: 1300 } },
    { say: "I'll take it!", intent: "take" },
    { say: "Where do I sign?", intent: "where_sign", step: "sign" },
    { say: "I need to think about it.", intent: "think" },
    { say: "Can I let you know tomorrow?", intent: "think" },
    { say: "I don't want to rent it.", intent: "decline", not: ["take"] },
    { say: "I won't take it.", intent: "decline", not: ["take"] },
    { say: "I'm not interested", intent: "decline", not: ["take"] },
    { say: "It's a little too expensive for me", intent: "too_x", step: "decision" },
    { say: "No, I don't have any pets.", intent: "no_pets", not: ["have_pet"] },
    { say: "I have a small dog", intent: "have_pet", slots: { pet: "dog" } },
    { say: "On the first, if possible.", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "Next month", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "Two", intent: "people_num_ctx", step: "people_q" },
    { say: "It's just me.", intent: "people_ans" },
    { say: "No, that's all, thanks.", intent: "no_more", step: "questions" },
    { say: "Here's my passport.", intent: "here_you_go", step: "docs" },
    { say: "The heating isn't working.", intent: "report_problem", slots: { fix: "heat" } },
    { say: "The kitchen tap is leaking", intent: "report_problem", slots: { fix: "faucet" } },
    { say: "There's no hot water", intent: "report_problem" },
    { say: "Sorry to bother you, but the toilet is clogged", intent: "sorry_bother" },
    { say: "No, I won't be home", intent: "at_work", not: ["home_yes"] },
    { say: "Could he come after five?", intent: "time_pref" },
    { say: "Not great, actually.", intent: "have_problem", step: "problem" },
    { say: "Could I rent it for six months?", intent: "ask_lease" },
    { say: "banana helicopter purple", intent: "none" },
    { say: "My brother likes football", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "I saw your ad on the internet", intent: "see_apartment" },
    { say: "I'd like to rent the apartment", intent: "see_apartment", step: "purpose" },
    { say: "My name is Tomas, I come to see apartment", intent: "my_name" },
    { say: "Are the communal payments included?", intent: "ask_utilities" },
    { say: "Is included the electricity?", intent: "ask_utilities", slots: { utility: "electricity" } },
    { say: "How much costs the rent?", intent: "ask_rent" },
    { say: "Is there furniture?", intent: "ask_furnished" },
    { say: "Are animals allowed?", intent: "ask_pets" },
    { say: "How many square meters is it?", intent: "ask_size" },
    { say: "Is the price negotiable?", intent: "ask_lower" },
    { say: "Yes, I have a few questions", intent: "have_questions", step: "questions" },
    { say: "I don't have more questions", intent: "no_more", step: "questions" },
    { say: "I like it, but I need to think about it", intent: "think", step: "decision", not: ["take", "like_it"] },
    { say: "I must talk with my wife first", intent: "think" },
    { say: "Maybe", intent: "think_ctx", step: "decision" },
    { say: "Maybe", intent: "none" },
    { say: "Maybe in October", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "I have a job offer letter", intent: "have_job" },
    { say: "Passport", intent: "id_ctx", step: "docs" },
    { say: "My husband and two kids", intent: "people_ans" },
    { say: "Heating not working", intent: "report_problem", slots: { fix: "heat" } },
    { say: "Water is going from the tap", intent: "report_problem", slots: { fix: "faucet" } },
    { say: "I'll text you tonight", intent: "call_back" },
    { say: "Ten is not good for me", intent: "time_bad", step: "visit", not: ["time_ok"] },
    // meaning must not flip
    { say: "No, I am allergic to cats", intent: "no_pets", not: ["have_pet"] },
    { say: "Tomorrow I'm at work", intent: "at_work", step: "visit", not: ["time_ok"] },
    { say: "I won't be home tomorrow", intent: "at_work", step: "visit", not: ["home_yes", "time_pref"] },
    { say: "I can't take it, sorry", intent: "decline", step: "decision", not: ["take"] },
    { say: "The heating works fine", intent: "all_good", step: "problem", not: ["report_problem"] },
    // "How's everything with the apartment?" answered like "How are you?"
    { say: "Good, thank you", intent: "g_howareyou_answer", step: "problem" },
    { say: "Good, but the heating doesn't work", intent: "g_howareyou_answer", step: "problem", not: ["all_good"] },
  ],

  sims: [
    { name: "view, ask the key terms, take it", turns: ["Hi, I'm here to see the apartment.", "How much is the rent?", "Are utilities included?", "Is there parking?",
      "No, that's all, thanks.", "I'll take it!", "Here's my passport.", "Where do I sign?", "Thank you, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "many questions, then think about it", turns: ["Hello! Is the apartment still available?", "Is it furnished?", "Are pets allowed?", "Is electricity included?",
      "How long is the lease?", "Could you lower the rent a little?", "I need to think about it.", "Okay, I'll call you tonight.", "Thanks, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "short answers", turns: ["Hi!", "Yes.", "Next month.", "Just me.", "No.", "How much is it?", "And the deposit?", "That's all.", "I'll take it.", "Sure.", "Sure.", "Bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "tenant reports a leak", turns: ["Hi, Mr. Patel!", "Sorry to bother you, but the kitchen faucet is leaking.", "No, I'll be at work.", "Yes, that's fine.", "Thank you!"],
      expect: { complete: true }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function enter(c: Ctx, first = "come_in") {
  c.s.purpose = true;
  c.say(first);
  c.say("tour");
  if (c.s.tourExtra) c.say("tour_extra");
}

/** "When are you looking to move in?" (optional before the questions, required after "I'll take it"). */
function askMovein(c: Ctx, optional: boolean) {
  c.say("ask_movein_q");
  c.expect({ id: optional ? "movein_q" : "movein_take", optional, expects: ["movein_ans_ctx", "ask_movein"], hints: ["movein"],
    suggest: [{ lt: "Pasakyti, kada norėtum įsikelti", hint: "movein" }],
    on: {
      movein_ans_ctx: (cc, sl, sg) => { apartment.handlers.movein_ans_ctx(cc, sl, sg); },
      ask_movein: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
      g_dontknow: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
    },
    yes: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
    ask: optional ? undefined : (cc) => cc.say("ask_movein_q") });
}

function petAnswer(c: Ctx, pet?: string) {
  if (pet === "cat") c.say("pet_cat_ok");
  else if (pet === "dog") c.say("pet_dog_ok");
  else if (pet === "bigdog") c.say("pet_bigdog");
  else if (pet === "other") c.say("pet_other_ok");
  else c.say("pets_policy");
}

function peopleAnswer(c: Ctx, n: number) {
  if (n >= 4) c.say("people_small");
  else c.say("people_ack");
}

function take(c: Ctx) {
  if (!view(c)) { c.say("ack"); return; }
  if (c.s.decision === "take") { c.say("ack"); return; }
  c.s.purpose = true;
  c.s.qDone = true;
  c.s.decision = "take";
  c.say("take_ok");
  volunteer(c);
}

function decline(c: Ctx) {
  c.s.qDone = true;
  c.s.decision = "no";
  c.say("decline_ok");
}

function sign(c: Ctx) {
  c.s.signed = true;
  c.s.docsOk = true;
  c.event("sign", { doc: "lease" });
  c.say("keys");
  c.event("give", { item: "keys" });
}

function repairOpen(c: Ctx) { return c.s.mode === "problem" && !!c.s.problem && !c.s.visitOk; }

/** "Could you let me know by tonight?" answered with a think-phrase ("I'll let you know tonight",
 *  "Can I tell you tomorrow?"): a promise for today is a yes, a later day is understood. */
function hurryAnswer(c: Ctx) {
  c.s.hurryDone = true;
  const h = c.heard.toLowerCase();
  c.say(/\btomorrow\b|\bmonday|\btuesday|\bwednesday|\bthursday|\bfriday|\bsaturday|\bsunday|next week/.test(h) ? "understand" : "wait_call");
}

const taking = (c: Ctx) => view(c) && c.s.decision === "take";

function homeNo(c: Ctx) {
  c.s.visitAnswered = true;
  c.say("home_no"); c.say("key_ok_q");
  c.expect({ id: "key_ok", expects: ["use_key", "time_pref"], hints: ["repair"],
    suggest: [{ lt: "Sutikti, kad įleistų meistrą", hint: "key_ok" }],
    on: {
      use_key: (cc) => { cc.say("key_done"); cc.s.visitOk = true; },
      time_pref: (cc) => { cc.say("time_noted"); cc.s.visitOk = true; },
    },
    yes: (cc) => { cc.say("key_done"); cc.s.visitOk = true; },
    no: (cc) => { askOtherTime(cc); },
    ask: (cc) => cc.say("key_ok_q") });
}

/** "What time works for you?" */
function askOtherTime(c: Ctx) {
  c.s.visitAnswered = true;
  c.say("other_time_q");
  c.expect({ id: "other_time", expects: ["time_pref", "time_ok"], hints: ["repair"],
    suggest: [{ lt: "Pasiūlyti kitą laiką", hint: "other_time" }],
    on: {
      time_pref: (c3) => { c3.say("time_noted"); c3.s.visitOk = true; },
      time_ok: (c3) => { c3.say("home_yes_ok"); c3.s.visitOk = true; },
    },
    ask: (c3) => c3.say("other_time_q") });
}

export default apartment;
