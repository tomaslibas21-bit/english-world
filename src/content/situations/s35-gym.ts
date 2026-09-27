// Song 35 "One More Rep" · Harbor Fitness · personal trainer Jordan (energetic, informal: tu).
// A first visit to an American gym: "Hi, I'm new here!", the membership (monthly $35 or a day pass
// $10; no sign-up fee, cancel anytime, the first session with a trainer is free), the form and the
// payment, the locker room (bring a lock; towels and the water fountain), "Warm up first" (five
// minutes on the treadmill or the bike), "Is this machine free?", "How many sets should I do?"
// ("Three sets of ten reps"), "One more rep!", "Can you spot me?" on the bench press, "I'm out of
// breath!" ("Take a break, grab some water"), and "Same time tomorrow?" / "See you Thursday!".
// US units: weights in pounds (a question in kilos gets a tip), hours in AM/PM.
// Twists (visits ≥ 1): the leg press is out of order, so they use the other one (and ask if it is
// free); after the leg press Jordan asks "Whoa, are you okay?" and the learner's knee or back hurts
// ("Stop right there. Let's try something easier."). A learner may also say that something hurts at
// any point: Jordan stops the exercise and keeps the rest of the workout easy.

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

const PLANS: EntityDef[] = [
  ent("monthly", "monthly | membership", "mėnesinė/mėnesinės/mėnesinei/mėnesinę/mėnesine/mėnesinėje | narystė/narystės/narystei/narystę/naryste/narystėje", "f", {
    forms: ["monthly", "month", "monthly one", "the monthly one", "the monthly", "monthly plan", "monthly pass", "month pass", "a month", "one month", "the month",
      "monthly membership", "month membership", "one month membership", "monthly memberships", "monthly option", "the monthly option", "per month"],
    chip: "mėnesinė narystė", attrs: { price: 3500 } }),
  ent("day_pass", "day | pass", "dienos | bilietas/bilieto/bilietui/bilietą/bilietu/biliete", "m", {
    pl: "day | passes",
    forms: ["day pass", "one day pass", "daily pass", "day ticket", "one day ticket", "single visit", "one visit", "a single visit", "one time pass", "pass for today",
      "the day one", "day one pass", "day passes", "a pass for one day", "one day", "day", "day option", "the day option"],
    chip: "dienos bilietas", attrs: { price: 1000 } }),
];

const CARDIO: EntityDef[] = [
  ent("treadmill", "treadmill", "bėgimo takelis/bėgimo takelio/bėgimo takeliui/bėgimo takelį/bėgimo takeliu/bėgimo takelyje", "m", {
    pl: "treadmills", forms: ["tread mill", "treadmills", "walking machine"], chip: "bėgimo takelis" }),
  ent("bike", "bike", "dviratis/dviračio/dviračiui/dviratį/dviračiu/dviratyje", "m", {
    pl: "bikes", forms: ["exercise bike", "stationary bike", "bicycle", "spin bike", "cycle", "cycling machine", "bike machine", "bikes"], chip: "dviratis" }),
  ent("elliptical", "elliptical", "elipsinis treniruoklis/elipsinio treniruoklio/elipsiniam treniruokliui/elipsinį treniruoklį/elipsiniu treniruokliu/elipsiniame treniruoklyje", "m", {
    forms: ["elliptical machine", "elliptical trainer", "ellipticals"], chip: "elipsinis treniruoklis" }),
];

// The machine for the first strength exercise (the chest press when the learner's knee or back hurts)
const EXERCISES: EntityDef[] = [
  ent("leg_press", "leg | press", "kojų | presas/preso/presui/presą/presu/prese", "m"),
  ent("chest_press", "chest | press", "krūtinės | presas/preso/presui/presą/presu/prese", "m"),
];

// Things Jordan hands over (the world's "Gavai: …" toast names them from these forms)
const PROPS: EntityDef[] = [
  ent("membership_card", "membership | card", "narystės | kortelė/kortelės/kortelei/kortelę/kortele/kortelėje", "f"),
  ent("wristband", "wristband", "apyrankė/apyrankės/apyrankei/apyrankę/apyranke/apyrankėje", "f"),
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
const DAY_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|next week)s?\b/i;

// ---------------------------------------------------------------------------
// Flags and helpers

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_IS = "“Is” in a yes/no question = the particle ar; the copula has no separate word here.";
const FLAG_WH_DO = "Question “do/does” has no Lithuanian word (linked to the main verb).";
const FLAG_THERE = "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”).";
const FLAG_OVER = "“over” (over there): no separate Lithuanian word; ten carries the direction.";
const FLAG_SOME = "Partitive: the genitive carries “some”.";
const FLAG_MY_HURT = "“My” → dative Man: Lithuanian says “it hurts to me”; the dative experiencer carries the possessive.";

const planPrice = (c: Ctx) => (c.s.plan === "monthly" ? 3500 : 1000);
/** The warm-up can start: paid, and the learner has changed (or didn't need to). */
const warmupOpen = (c: Ctx) => !!c.s.paid && !!c.s.changeDone;
const exercise = (c: Ctx) => (c.s.pain ? "chest_press" : "leg_press");
const allTags = (slots: any, seg: { tags: string[] }): string[] => {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
};

// Automatic answers the simulation uses when Jordan asks an optional question (random ones and the
// twists). Every other step is answered by the sims' own turns, so each scripted turn is really used.
const AUTO: Record<string, string> = {
  lock_q: "Yes, I brought one.", feel_q: "I feel great!", broken: "Is this machine free?", okay_q: "My knee hurts.", where_hurt: "My knee.",
  changing: "I'm back!",
};

// ---------------------------------------------------------------------------

export const gym: SituationDef = {
  id: "s35-gym",
  song: 35,
  songTitle: "One More Rep",
  title: { en: "One More Rep", lt: "Dar vienas pakartojimas" },
  topic: { en: "At the gym", lt: "Sporto klube" },
  chapter: 3,
  order: 10,
  location: "gym",
  npc: "jordan",
  goal: "Užsiregistruok sporto klube ir atlik pirmą treniruotę su trenere.",
  intro: "„Harbor Fitness“ – sporto klubas Maple Harbore. Tu čia pirmą kartą. Prie registratūros tave pasitinka asmeninė trenerė Jordan – energinga ir visada besišypsanti. JAV svoris matuojamas svarais (1 svaras ≈ 0,45 kg).",
  entities: { plan: PLANS, cardio: CARDIO, exercise: EXERCISES, weekday: WEEKDAYS, prop: PROPS },

  merges: {
    "hey there": { reason: "lexical_expression", split: "there → ten would add a false place; “Hey there” is one greeting (= labas).", minimal: "Two words (C-LEX)." },
    "harbor fitness": { reason: "lexical_expression", split: "The gym's name; harbor → uostas + fitness → fitnesas would translate a proper name word by word.", minimal: "Proper name." },
    "fill out": { reason: "lexical_expression", split: "fill → pildyti + out → lauk is false; completing a form = užpildyti.", minimal: "Two words (C-PHR)." },
    "photo id": { reason: "lexical_expression", split: "photo → nuotrauka + ID → dokumentas is one compound noun; Lithuanian names it with a phrase (asmens dokumentas su nuotrauka).", minimal: "Two words, one noun." },
    "locker room": { reason: "lexical_expression", split: "locker → spintelė + room → kambarys gives “a locker's room”; the room for changing = persirengimo kambarys.", minimal: "Two words, one noun." },
    "in the locker room": { reason: "grammatical_fusion", split: "in → į/—, the → —, locker room → persirengimo kambarys: the locative persirengimo kambaryje carries “in the”.", minimal: "No independently glossable word inside (C-CASE with a compound noun)." },
    "front desk": { reason: "lexical_expression", split: "front → priekinis + desk → stalas is false; the reception = registratūra.", minimal: "Two words, one noun." },
    "at the front desk": { reason: "grammatical_fusion", split: "at → prie/—, the → —, front desk → registratūra: the locative registratūroje carries “at the”.", minimal: "No independently glossable word inside (C-CASE with a compound noun)." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia.", minimal: "Two words (C-LEX)." },
    "let's go": { reason: "grammatical_fusion", split: "Let's → leiskime + go → eiti is a calque; the first person plural imperative = einam.", minimal: "Two words (C-LEX)." },
    "let's start": { reason: "grammatical_fusion", split: "Let's → leiskime + start → pradėti is a calque; the first person plural imperative = pradėkime.", minimal: "Two words (C-LEX)." },
    "let's take": { reason: "grammatical_fusion", split: "Let's → leiskime + take → imti is a calque; the first person plural imperative = imkime.", minimal: "Two words; the object stays outside." },
    "let's try": { reason: "grammatical_fusion", split: "Let's → leiskime + try → bandyti is a calque; the first person plural imperative = pabandykime.", minimal: "Two words; the object stays outside." },
    "let's use": { reason: "grammatical_fusion", split: "Let's → leiskime + use → naudoti is a calque; the first person plural imperative = naudokime.", minimal: "Two words; the object stays outside." },
    "let's do": { reason: "grammatical_fusion", split: "Let's → leiskime + do → daryti is a calque; the first person plural imperative = darykime / padarykime.", minimal: "Two words; the object stays outside." },
    "warm up": { reason: "lexical_expression", split: "warm → šildyti + up → aukštyn is prohibited as mechanical; getting ready for exercise = apšilti.", minimal: "Two words (C-PHR)." },
    "be able": { reason: "grammatical_fusion", split: "be → būti + able → gebantis doubles the verb; “be able to” = galėti.", minimal: "Two words." },
    "out of order": { reason: "lexical_expression", split: "out → lauk, of → iš, order → tvarka is false; a broken machine = sugedęs.", minimal: "All three words." },
    "other one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word “one” is absorbed by the pronoun kitą.", minimal: "Two words (C-ONE)." },
    "let me check": { reason: "lexical_expression", split: "let → leisk, me → man, check → patikrinti is a calque; offering to check = tuoj patikrinsiu.", minimal: "All three words." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → į priekį is false; the invitation = pirmyn / drąsiai.", minimal: "Two words." },
    "it's all yours": { reason: "lexical_expression", split: "It's → tai yra, all → visas, yours → tavo is a literal reading; handing something over = jis tavo.", minimal: "The whole formula." },
    "one more": { reason: "lexical_expression", split: "one → vienas + more → daugiau gives “vienas daugiau”, which is not Lithuanian; = dar vienas.", minimal: "Two words (C-LEX)." },
    "right there": { reason: "lexical_expression", split: "right → dešinėje/teisingai + there → ten is false in “Stop right there”; = iškart.", minimal: "Two words." },
    "bench press": { reason: "lexical_expression", split: "bench → suolas + press → spaudimas names a bench, not the exercise; = spaudimas gulint.", minimal: "Two words, one noun." },
    "lie down": { reason: "lexical_expression", split: "lie → gulėti + down → žemyn is false; = atsigulti.", minimal: "Two words (C-PHR)." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "just in case": { reason: "lexical_expression", split: "just → tik, in → į, case → atvejis is a literal reading; = dėl viso pikto.", minimal: "All three words." },
    "last one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word “one” is absorbed by paskutinis (pratimas).", minimal: "Two words (C-ONE)." },
    "lots of": { reason: "lexical_expression", split: "lots → daugybės + of → — gives a false noun; the quantifier = daug.", minimal: "Two words (C-LEX)." },
    "to sign up": { reason: "grammatical_fusion", split: "to → į, sign → pasirašyti, up → aukštyn is false; the infinitive of the phrasal verb = užsiregistruoti.", minimal: "Infinitive and particle (C-INF + C-PHR)." },
    "sign up": { reason: "lexical_expression", split: "sign → pasirašyti + up → aukštyn is false; joining = užsiregistruoti.", minimal: "Two words (C-PHR)." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking for a number = kiek.", minimal: "Two words, both needed." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives a false “small”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "5 am": { reason: "lexical_expression", split: "5 → 5 + AM → prieš pietus: Lithuanian writes the 24-hour time (5:00).", minimal: "A clock time." },
    "11 pm": { reason: "lexical_expression", split: "11 → 11 + PM → po pietų: Lithuanian writes the 24-hour time (23:00).", minimal: "A clock time." },
    "all done": { reason: "lexical_expression", split: "all → visi + done → padaryti is false; finishing = viskas baigta.", minimal: "Two words." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleisk + me → mane is a literal reading of the polite opener (= atsiprašau).", minimal: "Two words (C-LEX)." },
    "time's up": { reason: "lexical_expression", split: "time's → laikas yra + up → aukštyn is false; the end of a timed exercise = laikas baigėsi.", minimal: "Two words (C-LEX)." },
    "let's work": { reason: "grammatical_fusion", split: "Let's → leiskime + work → dirbti is a calque; the first person plural imperative = padirbėkime.", minimal: "Two words; the object stays outside." },
    "let's stop": { reason: "grammatical_fusion", split: "Let's → leiskime + stop → sustoti is a calque; the first person plural imperative = sustokime.", minimal: "Two words (C-LEX)." },
    "change your mind": { reason: "lexical_expression", split: "change → pakeisti, your → savo, mind → protą is a literal reading; = persigalvoti.", minimal: "All three words." },
    "let me know": { reason: "lexical_expression", split: "let → leisk, me → man, know → žinoti is a calque; = pranešk man.", minimal: "All three words." },
    "i'm back": { reason: "lexical_expression", split: "I'm → aš esu + back → atgal is a literal reading; having returned = grįžau.", minimal: "Two words." },
    "come on": { reason: "lexical_expression", split: "come → ateik + on → ant is false; the encouragement = nagi.", minimal: "Two words (C-PHR)." },
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; the cheerful yes = žinoma.", minimal: "Two words." },
    "out of breath": { reason: "lexical_expression", split: "out → lauk, of → iš, breath → kvapas gives a false “out of the breath”; = uždusęs.", minimal: "All three words." },
  },

  grammar: {
    macros: {
      mach: "(machine | one | leg press | chest press | seat | bench | spot | station)",
      this_: "(this | that | it | this one | that one | this machine | that machine | the machine | the leg press | the chest press)",
      part: "(knee #knee | knees #knee | back #back | lower back #back | shoulder #shoulder | shoulders #shoulder | arm #arm | arms #arm | wrist #arm | leg #leg | legs #leg | ankle #leg | hip #leg | neck #neck)",
      hurts: "(hurts | hurt | is hurting | are hurting | is sore | are sore | aches | feels bad | is killing me | is not good | does not feel good)",
      fine_: "(fine | good | great | okay | better | perfect | best)",
      cardio_: "({cardio} | {cardio:cardio_uk})",
      // "Sorry, I changed my mind. A day pass, please." / "On second thought, the day pass."
      mind_: "(i changed my mind | i have changed my mind | i changed my mind actually | on second thought)",
    },
    slots: {
      // British names of the warm-up machines (captured as {cardio}, with a tip)
      cardio_uk: { lexicon: [
        { id: "elliptical", forms: ["cross trainer", "cross trainers", "crosstrainer"], tags: ["tip:uk_cross"] },
        { id: "treadmill", forms: ["running machine", "running machines"], tags: ["tip:uk_running"] },
      ] },
      amenity: { lexicon: [
        { id: "showers", forms: ["showers", "shower", "a shower"] },
        { id: "sauna", forms: ["sauna", "a sauna", "steam room", "a steam room"] },
        { id: "pool", forms: ["pool", "a pool", "swimming pool", "a swimming pool"] },
        { id: "towels", forms: ["towels", "towel", "a towel", "free towels", "clean towels"] },
        { id: "lockers", forms: ["lockers", "locker", "a locker", "locker room", "a locker room"] },
        { id: "lockers", forms: ["changing room", "a changing room", "changing rooms"], tags: ["tip:uk_changing"] },
        { id: "parking", forms: ["parking", "free parking", "a parking lot", "parking lot"] },
        { id: "parking", forms: ["car park", "a car park"], tags: ["tip:uk_car_park"] },
        { id: "classes", forms: ["classes", "group classes", "fitness classes", "yoga", "yoga classes", "a yoga class", "spin", "spin classes", "spinning", "zumba", "pilates", "aerobics", "classes here"] },
        { id: "wifi", forms: ["wifi", "wi fi", "internet"] },
        { id: "water", forms: ["water fountain", "a water fountain", "drinking fountain", "a drinking fountain", "drinking water"] },
        { id: "trainer", forms: ["personal trainer", "a personal trainer", "personal trainers", "trainers", "a trainer", "personal training"] },
      ] },
    },
  },

  intents: {
    // --- arriving --------------------------------------------------------------------------------
    im_new: { patterns: [
      "i am new [here | at the gym | to the gym | to this gym | at this gym | in this gym] #h:new_here",
      "i am (a new member | a beginner | new at this | new to this | totally new | completely new | new to the gym)",
      "[yes] (it is | this is) my (first | very first) (time | day | visit | workout) [here | at a gym | at the gym | in a gym | at this gym] #h:first_time",
      "[yes] (my | the) first (time | day | visit) [here | in a gym | at a gym | in the gym | at the gym]", "[yes] first time [here | for me]",
      "[yes] i have never been here [before]", "i have never (been to | trained at | worked out at | gone to) a gym [before]",
      "i am not a member [yet]", "i (just | only) (started | want to start) [working out | training | going to the gym]",
    ] },
    not_new: { patterns: [
      "[no] i am not new [here]", "[no] i have been here before", "[no] i am (already)? a member [here]", "[no] (it is | this is)? not my first time [here]",
      "[no] i come here (a lot | often | every week | every day)", "[no] i was here (once | before | last week | last month | last year)",
    ] },
    want_join: { patterns: [
      "i would like to sign up [for a membership | at the gym | here | today] #h:join", "i would like to (join | register) [the gym | here | today]",
      "i would like to (become | be) a member [here | of the gym] #h:become_member",
      "(i want | i need) to (join | sign up | become a member | get a membership | buy a membership) [here | today]",
      "(can | could) i (join | sign up | become a member | get a membership | register) [here | today]",
      "how (do | can) i (sign up | join | become a member | get a membership | register) #h:how_join",
      "where (do | can) i (sign up | join | register)",
      "i am (interested in | looking for) (a membership | joining | membership | a gym membership | becoming a member)",
      "i (would like | want | need) (a membership | a gym membership | some information | information about membership)",
      "i am here to (join | sign up | register | get a membership)", "sign me up",
      "(i will take | i would like | can i (get | have) | could i (get | have) | i want | i need) [the | a] (membership | full membership | regular membership | gym membership) [please]",
      "[the | a] (membership | full membership) please",
      "i (would like | want) to (work out | train | exercise | start training | get in shape | get fit | lose weight | start working out) [here]",
      "(i would like | i want) to (try | check out) (the gym | your gym | this gym)",
      "is it possible to (join | sign up | get a membership | become a member) [today | here | now]",
    ] },
    ask_trial: { patterns: [
      "(can | could) i try [it | the gym] (first | for free | before i (join | pay | sign up))", "do you have a (free trial | trial | trial day | free day pass | trial pass)",
      "is there a free (trial | day | session | class)", "is the first (session | visit | time | day | workout) free",
      "(do | can) i get a free (session | trial | workout)", "is there a (trial | trial day | trial session | trial period)",
    ] },
    nice_meet: { patterns: ["[it is] (nice | good | great | glad | pleased) to meet you [too]", "my name is {name}", "nice meeting you"] },

    // --- the membership --------------------------------------------------------------------------
    choose_plan: { patterns: [
      "[@mind_] (i will take | i will get | i will go with | i will do | i think i will take | i think i will get) [the | a] {plan} [instead] #h:take_plan",
      "[@mind_] i [think | guess] i (take | get | would take | choose) [the | a] {plan} [instead]", "[@mind_] i (choose | pick) [the | a] {plan} [instead]",
      "[@mind_] [just | only] for (a | one) month [instead] #monthly",
      "[@mind_] (i would like | i would love | can i (get | have) | could i (get | have) | may i have | let me (get | have)) [the | a] {plan} [instead] #h:like_plan",
      "[@mind_] [the | a] {plan} [instead] #h:plan_short",
      // "Can I change to a day pass?", "Not the monthly, the day pass."
      "(can | could) i (change | switch) [it | that | my membership | the membership] (to | for) [the | a] {plan} [instead]",
      "(i would like | i want) to (change | switch) [it | that] (to | for) [the | a] {plan} [instead]", "(make it | make that) [the | a] {plan} [instead]",
      "[no] not [the | a] {not:plan} [but] [the | a] {plan}", "[the | a] {plan} not [the | a] {not:plan}",
      "(i want | i need | give me) [the | a] {plan} #blunt",
      "[just] (for today | for one day | for a day | today only | only today | just today) #day #h:just_today",
      "[the | a] {plan} (is | would be | sounds) @fine_ [for me]", "i (think | guess) [the | a] {plan} (is | would be) (better | best | good) [for me]",
      "(let us | let me) (do | try | go with | take) [the | a] {plan}", "i (prefer | would prefer) [the | a] {plan}",
      "i (will | want to | would like to | am going to | plan to) come (every day | often | a lot | regularly | every week | three times a week | twice a week | a few times a week) #monthly",
      "i (just | only) want to try [it | the gym | it out | it first | once] [today] #day",
      "[the | a] (ten | 10) (dollar | dollars) (one | option | pass) #day", "[the | a] (thirty five | 35) (dollar | dollars) (one | option | membership) #monthly",
      "[the | a] (cheaper | cheap | cheapest) (one | option) #day",
      "[i would like | i will take | can i get] [a | the] pass [please]",
    ] },
    plan_no: { patterns: [
      "[no] i do not (want | need) [the | a] {plan} [either]", "[no] not [the | a] {plan} [either]", "[no] no {plan} [either] [thanks]",
      "[no] i do not (want | need) a (membership | gym membership) [either] [right now | today] #monthly",
      "[no] i do not want to (join | sign up | become a member | pay every month) [either] [today | right now] #monthly",
      "[no] no membership [either] [thanks | for me] #monthly", "[no] i am (just | only) looking [around] #monthly",
      "[the | a] {plan} is too (expensive | much) [for me]", "(thirty five | 35) (dollars)? is too (expensive | much) #monthly",
      // "No, I don't want that either." (the other option Jordan just offered)
      "[no] i do not (want | need) (it | that | that one | one) either #either", "[no] not that one either #either",
      "[no] i do not want (either | any) [of them | one] #both", "[no] neither [one | of them] #both", "[no] i do not want (both | any of them) #both",
      "i will think about it", "i (need | want) to think [about it]",
    ] },
    // "I changed my mind." (on its own)
    change_mind: { patterns: ["i (changed | have changed) my mind", "on second thought", "(can | could) i change my (membership | plan | choice)"] },
    ask_price: { patterns: [
      "how much (is | does) [a | the] {plan} [cost] #h:q_price",
      "how much (is | does) (it | that | this | a membership | the membership | membership) [cost] [a month | per month | a day | per day | for a month | for a day | for one day]",
      "how much (is it | does it cost) (a | per | for a | for one) (month | day | visit)", "how much (for | is) (a | one | the) (month | day | visit)",
      "what (is | are) (the | your) (price | prices | rates | membership prices | membership fees)",
      "what does (it | a membership | the membership | a {plan} | the {plan}) cost", "how much [is it | does it cost]",
      "(what | how much) (cost | costs) [a | the] {plan}", "[a | the] {plan} (is | costs) how much", "is it expensive",
      "(can | could) i pay (monthly | every month | per month | by the month)",
    ] },
    ask_included: { patterns: [
      "what is included [in (the | a) {plan} | in the membership | in the price] #h:q_included",
      "what (do | does) (i | it | the {plan} | a {plan} | the membership) (get | include | come with)",
      "what (do i get | can i use) (with | for) (it | that | the {plan} | a {plan} | the membership)",
      "(is | are) (the trainer | a trainer | personal training | the classes | classes | the sauna | towels | the first session | a session with a trainer) included",
      "does (it | the {plan} | the membership) include (classes | a trainer | personal training | the sauna | towels)",
      "can i use (everything | all the machines | the classes | the sauna)",
    ] },
    ask_fee: { patterns: [
      "is there a (sign up | signup | joining | registration | start up | startup | enrollment | membership | one time) fee #h:q_fee",
      "(are there | is there) (any)? (other | extra | hidden | additional) (fees | costs | charges)",
      "do i (have to | need to) pay (anything | something) (else | extra | more)", "any (other | extra | hidden) (fees | costs)",
    ] },
    ask_cancel: { patterns: [
      "(can | could) i cancel [it | my membership | the membership] (anytime | any time | at any time | later | whenever i want) #h:q_cancel",
      "is there a (contract | minimum) [period | term]", "do i (have to | need to) sign a contract", "how (do | can) i cancel [it | my membership]",
      "what if i want to (cancel | stop | quit)", "(can | could) i (stop | quit | pause) [it | my membership] (anytime | any time | at any time | later)",
      "is it a contract", "(can | could) i cancel",
    ] },
    ask_hours: { patterns: [
      "what are your (hours | opening hours | opening times) #h:q_hours", "when (are you | is the gym | is it) open", "(what time | when) do you (open | close)",
      "how late are you open", "what are the (hours | opening hours)", "(when | what time) does the gym (open | close)",
      "are you open (on weekends | on the weekend | on sunday | on sundays | on saturday | on saturdays | every day | at night | early | late | twenty four seven | twenty four hours)",
      "is it open (on weekends | every day | at night | twenty four hours)", "what is the schedule", "what is the timetable #tip:uk_timetable",
    ] },
    ask_have: { patterns: [
      "do you have [a | an | any] {amenity} [here] #h:q_have", "(is there | are there) [a | an | any] {amenity} [here]", "(can | could) i use the {amenity}",
      "(are | is) (the)? {amenity} (free | included)", "does (the gym | it) have [a | an | any] {amenity}", "(can | could) i (take | have | use) {amenity} [after | afterwards | later]",
    ] },
    ask_discount: { patterns: [
      "(do you have | is there | are there) (a | any)? (discount | discounts | student discount | senior discount | family discount | special offer | special offers | deal | deals)",
      "(can | could) i get a discount", "any (discounts | deals | special offers)",
    ] },
    ask_have_unknown: { patterns: ["do you have [a | an | any] {w:any}", "is there [a | an | any] {w:any} here"] },
    ask_jordan: { patterns: [
      "how long have you been (a trainer | a personal trainer | working here | doing this)", "do you (work out | train | exercise) every day",
      "do you like (your job | your work | it here)", "are you (my trainer | a trainer | a personal trainer | my coach)",
    ] },

    // --- the form and paying ---------------------------------------------------------------------
    here_you_go: { patterns: [
      "here you (go | are) #h:here_you_go", "there you go", "here it is", "here is (my card | the money | {price} | the form | my form | my id | my passport | my license | my driver's license | my drivers license)",
      "here (are | is) my (id | passport | license | driver's license | drivers license | documents) [and the form]",
    ] },
    form_done: { patterns: [
      "[okay] all done #h:form_done", "(done | finished | signed) [here you go]", "i am (done | finished)", "i (signed | filled out | filled in | completed) (it | the form | everything)",
      "(okay | there) i signed [it]", "the form is (done | ready | signed)", "(i will | let me) (fill | fill out | fill in | sign) (it | the form | this) [now]",
    ] },
    sign_q: { patterns: ["where (do | should | can) i sign [it] #h:q_sign", "do i (need | have) to sign [it] [here]", "where (i must | must i | i should | i need to) sign", "(do | should) i sign here", "sign where", "where do i put my (name | signature)"] },
    pen_q: { patterns: ["(can | could | may) i (borrow | have | use | get) a pen #h:q_pen", "do you have a pen", "i (need | do not have) a pen", "a pen please"] },
    form_what: { patterns: ["what is (this | this form | the form | this paper | it) [for] #h:q_form", "what (do | should) i write [here]", "what is this form about"] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) [my] (card | credit card | debit card)", "card #h:pay_card_short",
      "(is | are) (card | cards | credit card | visa | mastercard) (okay | ok | fine | accepted)", "contactless", "(i will | can i) tap [it | my card]",
      "(i will | i would like to | i am going to) pay (by | with) (card | credit card | debit card | my card | a card)",
      "do you (take | accept) (cards | credit cards | card | visa | mastercard)", "can i (use | tap) my card", "[a] (credit | debit) card", "(visa | mastercard | amex)",
    ] },
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "i have no cash"] },
    no_card: { patterns: ["(i | we) do not have a (card | credit card | debit card)", "i have no card", "(i | we) do not have my card [with me]", "[no] not (by | with) card",
      "i can not pay (by | with) card"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash"] },
    pay_phone: { patterns: [
      "(can | could) i pay (with | by) (my phone | apple pay | google pay | phone) #h:pay_phone", "do you (take | accept) (apple pay | google pay)", "apple pay", "google pay",
      "(i will | i would like to | i am going to) pay (with | by) (my phone | phone | apple pay | google pay)", "i pay (with | by) (my phone | phone | apple pay | google pay)",
      "(with | by) (my phone | phone)",
    ] },

    // --- the locker room -------------------------------------------------------------------------
    lockers_q: { patterns: [
      "where (are | is) the (lockers | locker | locker room | locker rooms) #h:where_lockers", "where (are | is) the (changing room | changing rooms | change room) #tip:uk_changing",
      "where (can | do | should) i (change | get changed | change my clothes) #h:where_change",
      "where (can | do | should) i (leave | put | keep) my (bag | things | stuff | clothes | backpack | jacket | coat) #h:where_bag",
      "is there a (locker room | place to change) [here]", "is there a place (for my (bag | things | stuff) | to (leave | put) my (bag | things | stuff))", "(can | could) you show me the (lockers | locker room)", "where (can | do) i (find | get) a locker",
      "[yes] (i would like to | i want to | i need to) change [first | my clothes]", "[yes] (i would like | i need) a locker", "(the)? (lockers | locker room) please",
    ] },
    change_no: { patterns: [
      "[no] i am already (changed | dressed | ready)", "[no] i (changed | got changed | came dressed) [already | at home]", "[no] i do not (need | want) to change",
      "[no] i am (all set | good to go)", "[no] i am wearing my (gym clothes | workout clothes | sportswear)", "[no] i came ready",
    ] },
    // "No, I'm good." to "Do you want to change first?"
    change_no_ctx: { patterns: ["[no] i am (good | fine | okay) [thanks]"] },
    ready: { patterns: [
      "[no | yes] i am ready [to go | to start] #h:ready", "[yes] ready", "let us (go | start | do it | get started | begin | do this)", "i am good to go",
      "[no] no (questions | more questions) [thanks]", "[no] i do not have (any)? [more] questions", "[no] (it is | that is) clear", "[no] i (understand | got it) [thanks]",
    ] },
    lock_have: { patterns: ["[yes] i (have | brought | have got | got) (one | a lock | my lock | my own lock | my own) [with me] #h:lock_have", "[yes] (it is | my lock is) in my bag"] },
    lock_none: { patterns: [
      "[no] i (forgot | left) (it | my lock | the lock | one) [at home] #h:lock_forgot", "[no] i (do not | did not) (have | bring) (one | a lock | my lock | it)",
      "[no] no lock", "[no] i do not have [a] lock", "[no] i do not have [one | it]",
    ] },
    // back from the locker room
    im_back: { patterns: ["i am back [now] #h:im_back", "(okay | all right) i am back", "(here | there) i am", "i am (all)? changed [now]", "i changed [my clothes]"] },
    lock_need: { patterns: ["do i need a lock", "(is | do i need) a lock (necessary | required)", "do i (have | need) to bring a lock"] },
    lock_borrow: { patterns: ["(can | could) i (borrow | rent | buy | get) (one | a lock | a padlock) [here] #h:lock_borrow", "do you (sell | have | rent) (locks | padlocks | a lock)",
      "where (can | do) i (buy | get) (one | a lock)", "i need (one | a lock)"] },
    towel_q: { patterns: ["where (are | can i get | can i find | do i get) [the] towels", "(can | could | may) i (get | have | borrow) a towel", "do i need [to bring] (a towel | towels | my own towel)", "i need a towel"] },
    water_q: { patterns: [
      "where (is | can i get | can i find | do i get) [the | some] (water | water fountain | drinking fountain | fountain | drinking water) #h:q_water",
      "is there (a water fountain | a drinking fountain | water | drinking water) [here]",
      "(can | could | may) i (get | have) [some | a bottle of | a glass of] water #h:water_please", "i (need | want) [some] water", "[some] water [please]",
    ] },
    restroom_q: { patterns: ["where is the (restroom | bathroom | mens room | ladies room)", "where is the toilet #tip:us_restroom", "(can | could | may) i use the (restroom | bathroom | toilet)"] },

    // --- the warm-up -----------------------------------------------------------------------------
    warm_choice: { patterns: [
      "[the | a] @cardio_ [please] #h:warm_the",
      "(i will take | i will do | i will go with | i will try | i will use | i think i will take) [the | a] @cardio_ #h:warm_take",
      "(i would like | can i (do | use | try | have) | could i (do | use | try) | let me (do | try | take)) [the | a] @cardio_ [please]",
      "i prefer [the | a] @cardio_ #h:warm_prefer", "i would prefer [the | a] @cardio_", "(i want | give me) [the | a] @cardio_", "[the | a] @cardio_ of course",
      "[the | a] @cardio_ (is | would be | sounds) @fine_", "(let us | let me) (do | try | use | take) [the | a] @cardio_", "i (like | love) [the | a] @cardio_",
      "i (will | can | would like to | want to | am going to) (walk | run | jog) [on the treadmill] #tread",
      "(walking | running | jogging) [please | on the treadmill] #tread", "(can | could) i (walk | run | jog) [on the treadmill] #tread",
      "(can | could) i (ride | cycle) [the bike] #bike",
      "i (will | can | would like to | want to | am going to) (ride | cycle | pedal) [the bike] #bike", "(cycling | biking) [please] #bike",
    ] },
    warm_not: { patterns: [
      "[no] i do not (want | like) [the | a] @cardio_", "[no] not [the | a] @cardio_", "[no] no @cardio_ [please]",
      "[no] i (do not | can not) (run | like running | like to run | want to run) #tread", "[no] i do not (like | want) (running | to run | jogging) #tread",
      "[no] i (do not | can not) (ride a bike | like biking | like cycling | like the bike) #bike",
    ] },
    warm_any: { patterns: [
      "(either | any | whichever) [one] [is fine | is okay]", "i do not mind [which one]", "(you | you can) choose", "whatever you (think | recommend | want | prefer)",
      "it does not matter",
    ] },
    recommend_q: { patterns: [
      "(which | what) [one] (do you recommend | would you recommend | do you suggest | is better | is best | is easier | is better for me | is cheaper | is the cheapest)",
      "what do you (recommend | suggest)", "which one should i (take | get | choose | do)", "what would you (do | take | choose)",
    ] },
    warm_q: { patterns: [
      "[for] how long [should i (go | do it | warm up)] #h:q_how_long", "how many minutes [should i (go | do it)]", "how fast [should i (go | run | walk)]",
      "why (do i need to | should i | do we) warm up", "is five minutes enough", "[only | just] five minutes [only]",
    ] },

    // --- how are you feeling ---------------------------------------------------------------------
    feel_good: { patterns: [
      "i feel (good | great | fine | okay | amazing | awesome | strong | warm | ready | fantastic | wonderful | better) [now] #h:feel_great",
      "i am (warm | warmed up) [now] #h:feel_warm", "(it | that) (was | is) (fun | great | good | easy | awesome)", "i (love | liked) it",
      "i am (good | fine | great | okay | all right) #h:im_fine", "[yes | no] everything is (fine | okay | good | all right)", "warm [now]",
      "[much | a lot | a little | a bit] better [now] [thanks] #h:better", "i feel (much | a lot | a little | a bit) better [now]",
    ] },
    tired: { patterns: [
      "[i am] [just] [a little | a bit | very | so | really | super | pretty] (tired | exhausted | sweaty | hot) [now] #h:feel_tired", "i am [so | totally] done",
      // "I'm fine, just a little tired." (to "Whoa, are you okay?")
      "i am (fine | okay | good | all right) [but] [i am] [just] [a little | a bit | very | so | really | pretty] (tired | exhausted)",
      "i feel [a little | a bit | very | so | really] (tired | exhausted | dizzy | weak)",
      "i (need | want) (a break | a rest | to rest | a minute | to sit down | a short break) #h:need_break",
      "(can | could) (i | we) (take | have) a (break | rest | minute | short break)", "i am dying",
      "[wow] (that | it) was (hard | tough | difficult | so hard | really hard | intense)", "i am sweating [a lot | so much]",
    ] },
    out_breath: { patterns: [
      "i am [so | really | very | totally | completely | a little | a bit] out of breath #h:out_of_breath", "[so | totally] out of breath",
      "i can not breathe", "i am breathing (hard | heavily | so hard)", "(let me | i need to | can i) catch my breath", "i have no breath [left]",
    ] },
    not_tired: { patterns: ["i am not (tired | out of breath) [at all]", "i do not need a (break | rest)", "[no] i do not need [any] water", "no water [thanks | for me]", "[no] not tired [at all]", "i am [still] full of energy", "i (could | can) do more"] },

    // --- the machine -----------------------------------------------------------------------------
    machine_free_q: { patterns: [
      "is (this | that | the) @mach (free | available | taken | open | in use | busy) [now | right now] #h:machine_free",
      "is (anyone | somebody | someone | anybody) on @this_ [now | right now]", "(nobody | no one) is (using | on) @this_ [now | right now]",
      "is (anyone | somebody | someone | anybody) using @this_ [now | right now] #h:anyone_using",
      "are you using @this_ [now | right now] #h:you_using",
      "(can | could | may) i use (this machine | that machine | the machine | this one | that one | the leg press | the chest press) [now] #h:can_use",
      "(are | is) you (done | finished) with @this_", "(can | could) i work in [with you]",
      "is the other (one | machine) (free | available | taken)", "(this | that | the) @mach is (free | taken | available)",
      "(do you | does anyone) (need | use) @this_ [now]", "is this (seat | place) (free | taken)",
    ] },
    // "Is it free?", "Can I use it?": only while Jordan points at the machine
    machine_free_ctx: { patterns: ["(is | are) (it | this | that) (free | available | taken | busy) [now]", "free", "(can | could | may) i use (it | this | that) [now]", "are you (done | finished)", "(can | could | may) i"] },
    machine_taken: { patterns: ["[i think] (it is | this is | that is) (not free | taken | busy) [i think]", "(someone | somebody) is using (it | this | that)", "there is a (towel | water bottle | bottle) on it"] },
    broken_q: { patterns: [
      "what is wrong with (it | the machine | this one | that one | the leg press) #h:q_broken", "what happened [to it]", "is it broken", "why is it (out of order | broken)",
      "when will (it | they) (be fixed | fix it)", "(is there | where is) another one",
    ] },

    // --- sets, reps, weight ----------------------------------------------------------------------
    ask_sets: { patterns: [
      "how many sets (should | do | must | can) i do #h:how_many_sets", "how many sets [and reps | should i do | do you want | do i need | do we do]",
      "how many (sets | times | reps | repetitions) i (should | must | need to) do", "how many (reps | repetitions | times) [should i do | do i do | in a set] #h:how_many_reps",
      "how many (sets | reps | times) (do you want | do i need to do | should we do | are we doing)", "how many (i should | should i) do",
    ] },
    sets_ctx: { patterns: ["how many [times]", "how much"] },
    ask_weight: { patterns: [
      "how much weight [should i (use | lift | put on | do) | is it | is this | is that] #h:q_weight",
      "how (much | heavy) is (it | this | that | the bar | the weight)", "is (the bar | the weight | it | this) (heavy | too heavy)", "how (much | heavy) does (it | this | that | the weight) weigh", "how much does the bar weigh #h:q_bar",
      "what weight [should i (use | do | start with) | is it]", "how many (pounds | lbs) [is it | is this | should i (use | lift | do)]",
      "how many (kilos | kilograms | kg) [is it | is this | is that | should i (use | lift | do)] #kg #tip:kg",
      "(is | is it) (this | it | that) (too heavy | heavy | too light | too much)", "is (fifty pounds | the bar | the weight) (heavy | too heavy | too much)", "(can | could) you (make it | put it) (lighter | heavier)",
      "(can | could) (i | we) (use | do | put on) (less | more) weight", "is it heavy",
    ] },
    ask_rest: { patterns: [
      "how long (should | do | can) i rest [between sets] #h:q_rest", "(do | can | should) i rest between (sets | them)", "how long (is | should be) the (break | rest)",
      "how (much | long) (rest | break) [between sets]",
    ] },
    ask_how: { patterns: [
      "how does (it | this | this machine | the machine | that) work #h:q_how", "how do i (use | do) (it | this | this machine | the machine | that)",
      "(can | could) you show me [how] [to do it | to use it]", "what do i do [now]",
    ] },
    // "Is this okay?" about the form (signs it) or the exercise (Jordan checks it)
    not_ready: { patterns: ["i am not ready [yet]", "not ready [yet]", "[wait] not yet"] },
    check_ok: { patterns: ["is (this | it | that) (right | correct | okay | fine | good)", "am i doing it right", "like this", "(is | was) that (okay | right | correct)"] },

    // "One more rep!": the learner's reaction (only right after Jordan's count)
    rep_done_ctx: { patterns: [
      "[and] ten", "(done | finished | all done)", "i (did it | made it | am done | finished)", "[yes | yeah] i did it #h:done_it", "done i did it #h:done_it",
      "[okay | yes] one more [rep] #h:one_more", "(phew | whew | wow)",
      "[phew | whew | wow] (that | it) was (hard | tough | difficult | heavy | easy | great | good | fun | not bad | not easy) #h:was_hard",
      "i can do (it | this)", "(come on | here we go)", "[okay] i am not dead yet", "my (arms | legs) are shaking", "(uff | oof | ugh | argh)", "last one",
    ] },
    cant: { patterns: ["i can not [do it | do this | do (one | any) more | do another one | lift it | push it]", "i can not [do it] anymore", "(it is | this is) too heavy [for me]", "too heavy", "i give up", "no more [please]"] },

    // --- pain (the twist, or said at any time) ---------------------------------------------------
    pain: { patterns: [
      "my (knee | knees) @hurts [a little | a bit | a lot | now] #knee #h:knee_hurts", "my (back | lower back) @hurts [a little | a bit | a lot | now] #back #h:back_hurts",
      "my @part @hurts [a little | a bit | a lot | now]", "i have (a | some)? (pain | bad pain) in my @part", "i (hurt | injured) my @part",
      "i have (a bad | a sore) @part", "(it | this) hurts [a little | a bit | a lot]", "(ouch | ow) [my @part]", "something hurts", "i feel (pain | some pain) [in my @part]",
      "[a little | a bit of | some] pain in my @part",
      "my @part still @hurts [a little | a bit | a lot] #h:still_hurts", "(it | this) still hurts [a little | a bit | a lot]",
    ] },
    // "My knee." as the answer to "What hurts?"
    pain_ctx: { patterns: ["[my | the] @part", "(in)? my @part", "my @part [and my @part]", "it is [my | the] @part"] },
    no_pain: { patterns: ["[no] (nothing | it does not) hurt [anymore | now]", "[no] nothing hurts [anymore | now]", "[no] my @part (does not | do not) hurt [anymore | now]", "[no] no pain", "[no] i do not feel (any)? pain", "i am not hurt"] },

    // --- spotting ----------------------------------------------------------------------------------
    spot_q: { patterns: [
      "(can | could | would | will) you spot me [please] #h:spot_me", "spot me [please]", "i need a (spot | spotter)", "(can | could) i get a spot",
      "(can | could) you be my spotter", "(can | could | will | would) you (stay | stand | be) (close | near | here | next to me | behind me | with me) #h:stay_close",
      "(can | could | will | would) you (help | watch) me", "(can | could) you help me with (the bar | it | this)", "(can | could) you hold (it | the bar | the weight)",
      "i need (help | your help) [with (this | the bar | it)]", "help me [with the bar]",
      "what if (it is | the bar is) too heavy", "what if i can not (lift | push) it", "(will | are) you (stay | staying) (here | close | with me)",
    ] },
    no_spot: { patterns: ["[no] i do not need a (spot | spotter)", "[no] (you do not need to | no need to) spot me", "[no] i can do it (alone | myself | by myself | on my own)",
      "[no] i do not need you to spot me", "[please] do not spot me"] },

    // --- next time ---------------------------------------------------------------------------------
    next_same: { patterns: [
      "[yes | sure | okay] same time tomorrow #h:same_time", "[yes | sure | okay] (see you | see ya) tomorrow [same time] #h:see_tomorrow",
      "[yes] tomorrow (is | works | sounds) (good | great | fine | perfect | okay) [for me]", "[yes] tomorrow (at the same time | same time) [is fine | works | please]",
      "[yes] (the)? same time (is | works) (good | fine | great | for me) [tomorrow]", "[yes] i will (come | be here | come back | see you) [again] tomorrow",
      "[yes] (let us | we can) (meet | do it | train | work out) [again] tomorrow", "[yes] tomorrow at {time}", "[yes coach] i will be here",
      "(can | could) i come [back] tomorrow [at {time} | at the same time]",
    ] },
    next_day: { patterns: [
      "(how about | what about) {day} [instead] [at the same time] #h:how_about_day", "(can | could) we (do | meet | make it | train | work out) {day} [instead]",
      "[i think] {day} (is | would be | works) (better | good | fine | great | okay | perfect) [for me]", "i can (come | do | make it | train) {day} [at the same time]",
      "[okay | sure | yes] see you [on] {weekday} #h:see_you_day", "maybe {day}", "(i will | i can) (come | be here) [again] {day}", "[the] same time {day}",
    ] },
    next_no: { patterns: [
      "[no] i (can not | can't) [come | make it | do it | do] tomorrow #h:cant_tomorrow", "[no] tomorrow (does not work | is not good | is not possible | is bad | is difficult) [for me]",
      "[no] not tomorrow", "[no] i (work | am busy | am working | have work) tomorrow", "tomorrow i (can not | am busy | work | have to work)", "[no] i will be busy tomorrow",
      "[no] i do not have time tomorrow", "[no] i am not free tomorrow",
    ] },
    // "Not Thursday", "Friday doesn't work for me"
    day_no: { patterns: ["[no] not [on] {weekday}", "{weekday} (does not work | is not good | is bad | is difficult) [for me]", "[no] i (can not | can't) [come | make it] [on] {weekday}"] },
    next_later: { patterns: [
      "i will (call | let you know | check my schedule | book online | text you | call you | call the front desk) [later | tomorrow]",
      "i need to check my (schedule | calendar)", "(can | could) i book online", "maybe (later | another time | next time)",
    ] },
    // "I'm not sure yet": only as the answer to "Same time tomorrow?" (elsewhere "I don't know" asks for help)
    later_ctx: { patterns: ["i am not sure [yet | when | about tomorrow]", "i do not know (yet | when | my schedule)"] },
    next_time_q: { patterns: ["[at] what time [tomorrow | on {day}]", "what time (is it | should i come)", "(when | what time) (do | should) i come"] },
    // bare answers to "When do you want to come back?" / "How about Thursday?"
    when_ctx: { patterns: ["[on] {day} [at the same time | same time] [please | then]", "(at the)? same time [please]"] },
    see_you_ctx: { patterns: ["[sure | okay | yes] see you (then | soon | later)"] },
  },

  lines: {
    // --- arriving --------------------------------------------------------------------------------
    greet_help: [
      t("Hi there! | Welcome | to | Harbor Fitness! | How | can | I | help | you?", "Labas! | {m:Sveikas atvykęs|f:Sveika atvykusi} | į | „Harbor Fitness“! | Kaip | galiu | aš | padėti | tau?",
        "Labas! {m:Sveikas atvykęs|f:Sveika atvykusi} į „Harbor Fitness“! Kuo galiu padėti?"),
      t("Hey! | Welcome | to | Harbor Fitness! | What | can | I | do | for you?", "Labas! | {m:Sveikas atvykęs|f:Sveika atvykusi} | į | „Harbor Fitness“! | Ką | galiu | aš | padaryti | tau?",
        "Labas! {m:Sveikas atvykęs|f:Sveika atvykusi} į „Harbor Fitness“! Kuo galiu padėti?"),
    ],
    greet_first: [
      t("Hi there! | Welcome | to | Harbor Fitness! | Is | this | your | first | time | here?", "Labas! | {m:Sveikas atvykęs|f:Sveika atvykusi} | į | „Harbor Fitness“! | Ar | tai | tavo | pirmas | kartas | čia?",
        "Labas! {m:Sveikas atvykęs|f:Sveika atvykusi} į „Harbor Fitness“! Ar tu čia pirmą kartą?", { flags: { 4: FLAG_IS } }),
      t("Hey! | Welcome | to | Harbor Fitness! | First | time | here?", "Labas! | {m:Sveikas atvykęs|f:Sveika atvykusi} | į | „Harbor Fitness“! | Pirmas | kartas | čia?",
        "Labas! {m:Sveikas atvykęs|f:Sveika atvykusi} į „Harbor Fitness“! Pirmą kartą pas mus?"),
    ],
    greet_hay: [
      t("Hey there! | How's it going?", "Labas! | Kaip sekasi?", "Labas! Kaip sekasi?"),
      t("Hi! | How | are | you | doing | today?", "Labas! | Kaip | — | tau | sekasi | šiandien?", "Labas! Kaip tau šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
    ],
    ask_help: [
      t("So, | what | can | I | do | for you?", "Tai, | ką | galiu | aš | padaryti | tau?", "Tai kuo galiu padėti?"),
      t("So, | how | can | I | help?", "Tai, | kaip | galiu | aš | padėti?", "Tai kuo galiu padėti?"),
    ],
    welcome_back: [
      t("Oh, | welcome | back! | So, | what | can | I | do | for you?", "O, | {m:sveikas|f:sveika} | {m:sugrįžęs|f:sugrįžusi}! | Tai, | ką | galiu | aš | padaryti | tau?",
        "O, {m:sveikas sugrįžęs|f:sveika sugrįžusi}! Tai kuo galiu padėti?"),
    ],
    intro_jordan: [
      t("Awesome, | welcome! | I'm | Jordan, | one | of | the | trainers | here.", "Šaunu, | {m:sveikas atvykęs|f:sveika atvykusi}! | Aš esu | Jordan, | viena | iš | — | trenerių | čia.",
        "Šaunu, {m:sveikas atvykęs|f:sveika atvykusi}! Aš – Jordan, viena iš čia dirbančių trenerių."),
      t("Nice! | I'm | Jordan. | I'm | a | trainer | here.", "Šaunu! | Aš esu | Jordan. | Aš esu | — | trenerė | čia.", "Šaunu! Aš – Jordan, čia dirbu trenere."),
    ],
    nice_meet: [t("Nice | to meet | you | too!", "Malonu | susipažinti | su tavimi | irgi!", "Man irgi malonu susipažinti!")],

    // --- the membership --------------------------------------------------------------------------
    plan_offer: [
      t("We | have | two | options: | a | monthly | membership | for | $35, | or | a | day | pass | for | $10.",
        "Mes | turime | du | variantus: | — | mėnesinė | narystė | už | 35 $, | arba | — | dienos | bilietas | už | 10 $.",
        "Turime du variantus: mėnesinė narystė už 35 $ arba dienos bilietas už 10 $.",
        { say: "We have two options: a monthly membership for thirty-five dollars, or a day pass for ten dollars." }),
      t("There | are | two | options: | monthly | for | $35, | or | a | day | pass | for | $10.",
        "— | Yra | du | variantai: | mėnesinė | už | 35 $, | arba | — | dienos | bilietas | už | 10 $.",
        "Yra du variantai: mėnesinė narystė už 35 $ arba dienos bilietas už 10 $.",
        { say: "There are two options: monthly for thirty-five dollars, or a day pass for ten dollars.", flags: { 0: "Existential “there”: no Lithuanian word; yra carries it (linked to “are”)." } }),
    ],
    plan_trainer_note: [
      t("The | monthly | membership | includes | a | free | session | with | a | trainer.", "— | Mėnesinė | narystė | apima | — | nemokamą | treniruotę | su | — | treneriu.",
        "Mėnesinė narystė apima nemokamą treniruotę su treneriu."),
    ],
    plan_which: [
      t("Which one | would | you | like?", "Kurį | — | tu | norėtum?", "Kurį norėtum?", { flags: { 1: "“would” has no separate word: the conditional ending of norėtum carries it (linked to “like”)." } }),
      t("Which one | sounds | good?", "Kuris | skamba | gerai?", "Kuris tau labiau tinka?"),
    ],
    plan_which2: [t("Sure! | The | monthly | membership | or | a | day | pass?", "Žinoma! | — | Mėnesinė | narystė | ar | — | dienos | bilietas?", "Žinoma! Mėnesinė narystė ar dienos bilietas?")],
    plan_recommend: [
      t("If | you | want | to come | often, | the | monthly | membership | is | a | better | deal.", "Jei | tu | nori | ateiti | dažnai, | — | mėnesinė | narystė | yra | — | geresnis | pasiūlymas.",
        "Jei nori ateiti dažnai, mėnesinė narystė apsimoka labiau."),
    ],
    plan_ok_monthly: [t("Great | choice!", "Puikus | pasirinkimas!", "Puikus pasirinkimas!"), t("Awesome, | the | monthly | membership!", "Šaunu, | — | mėnesinė | narystė!", "Šaunu, mėnesinė narystė!")],
    plan_ok_day: [t("Sure, | a | day | pass.", "Žinoma, | — | dienos | bilietas.", "Žinoma, dienos bilietas."), t("Perfect, | just | for today.", "Puiku, | tik | šiandienai.", "Puiku, tik šiandienai.")],
    free_session: [t("And | your | first | session | with | me | is | free!", "O | tavo | pirma | treniruotė | su | manimi | yra | nemokama!", "O pirma treniruotė su manimi – nemokama!")],
    trial_info: [t("Your | first | session | with | a | trainer | is | free!", "Tavo | pirma | treniruotė | su | — | treneriu | yra | nemokama!", "Pirma treniruotė su treneriu – nemokama!")],
    plan_alt_day: [
      t("No | problem! | How | about | a | day | pass? | It's | just | ten | dollars.", "Jokių | problemų! | Kaip | dėl | — | dienos | bilieto? | Jis kainuoja | tik | dešimt | dolerių.",
        "Jokių problemų! Gal dienos bilietą? Jis kainuoja tik dešimt dolerių."),
    ],
    plan_alt_monthly: [t("Okay! | Then | how | about | the | monthly | membership?", "Gerai! | Tada | kaip | dėl | — | mėnesinės | narystės?", "Gerai! Tada gal mėnesinę narystę?")],
    both_no: [t("No | problem! | If | you | change your mind, | just | let me know.", "Jokių | problemų! | Jei | tu | persigalvosi, | tiesiog | pranešk man.",
      "Jokių problemų! Jei persigalvosi, tiesiog pasakyk.")],
    plan_think: [t("No | problem. | Take your time.", "Jokių | problemų. | Neskubėk.", "Jokių problemų. Neskubėk.")],
    price_monthly: [
      t("The | monthly | membership | is | {$price} | a | month.", "— | Mėnesinė | narystė | kainuoja | {$price} | — | per mėnesį.", "Mėnesinė narystė kainuoja {$price} per mėnesį.",
        { flags: { 5: "“a” (a month = per month): per mėnesį carries it (linked to “month”)." } }),
    ],
    price_day: [t("A | day | pass | is | {$price}.", "— | Dienos | bilietas | kainuoja | {$price}.", "Dienos bilietas kainuoja {$price}.")],
    included_monthly: [
      t("It | includes | all | the | machines, | the | classes, | and | a | free | session | with | a | trainer.",
        "Ji | apima | visus | — | treniruoklius, | — | užsiėmimus, | ir | — | nemokamą | treniruotę | su | — | treneriu.",
        "Ji apima visus treniruoklius, grupinius užsiėmimus ir nemokamą treniruotę su treneriu.", { flags: { 0: "“It” = the membership (narystė), hence ji." } }),
    ],
    included_day: [
      t("You | can | use | all | the | machines | for | the | whole | day.", "Tu | gali | naudotis | visais | — | treniruokliais | — | — | visą | dieną.",
        "Visą dieną gali naudotis visais treniruokliais.", { flags: { 6: "“for”: the accusative of time visą dieną carries it (C-CASE-DASH, “whole” intervenes)." } }),
    ],
    no_fee: [t("No | sign-up | fee | this | month!", "Jokio | įstojimo | mokesčio | šį | mėnesį!", "Šį mėnesį – jokio įstojimo mokesčio!")],
    cancel_info: [t("No | contract. | You | can | cancel | anytime.", "Jokios | sutarties. | Tu | gali | nutraukti | bet kada.", "Jokios sutarties – narystę gali nutraukti bet kada.")],
    hours_info: [
      t("We're | open | every | day, | from | 5 AM | to | 11 PM.", "Mes | dirbame | kiekvieną | dieną, | nuo | 5:00 | iki | 23:00.", "Dirbame kiekvieną dieną nuo 5:00 iki 23:00.",
        { say: "We're open every day, from five AM to eleven PM.", flags: { 0: "“We're open” → mes dirbame (we work): the verb carries “are open” (linked to “open”)." } }),
    ],
    have_yes: [t("Yes, | we | do!", "Taip, | mes | turime!", "Taip, turime!", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } })],
    no_discount: [t("Sorry, | no | discounts | right now. | But | there's | no | sign-up | fee!", "Atsiprašau, | jokių | nuolaidų | šiuo metu. | Bet | nėra | jokio | įstojimo | mokesčio!",
      "Deja, nuolaidų šiuo metu nėra. Bet nėra jokio įstojimo mokesčio!", { flags: { 5: "Negative concord: nėra takes its ne- from “no”." } })],
    have_no: [t("Sorry, | we | don't have | that.", "Atsiprašau, | mes | neturime | to.", "Atsiprašau, to neturime.")],
    showers_info: [t("Yes! | The | showers | are | in the locker room.", "Taip! | — | Dušai | yra | persirengimo kambaryje.", "Taip! Dušai – persirengimo kambaryje.")],
    sauna_info: [t("Yes! | There's | a | sauna | in the locker room.", "Taip! | Yra | — | pirtis | persirengimo kambaryje.", "Taip! Persirengimo kambaryje yra pirtis.")],
    pool_info: [t("Sorry, | we | don't have | a | pool. | But | there's | a | sauna!", "Atsiprašau, | mes | neturime | — | baseino. | Bet | yra | — | pirtis!", "Deja, baseino neturime. Bet yra pirtis!")],
    towels_info: [t("Yes! | Towels | are | free. | They're | by | the | locker room.", "Taip! | Rankšluosčiai | yra | nemokami. | Jie yra | prie | — | persirengimo kambario.",
      "Taip! Rankšluosčiai nemokami – jie prie persirengimo kambario.")],
    parking_info: [t("Yes, | parking | is | free.", "Taip, | automobilių stovėjimas | yra | nemokamas.", "Taip, automobilių stovėjimas nemokamas.")],
    classes_info: [t("Yes! | Yoga | and | spin | classes. | They're | free | for members.", "Taip! | Jogos | ir | dviračių | treniruotės. | Jos yra | nemokamos | nariams.",
      "Taip! Jogos ir dviračių treniruotės – nariams nemokamos.")],
    wifi_info: [t("Yes, | the | Wi-Fi | is | free.", "Taip, | — | „Wi-Fi“ | yra | nemokamas.", "Taip, „Wi-Fi“ nemokamas.")],
    water_info: [t("The | water | fountain | is | right | next to | the | locker room.", "— | Vandens | fontanėlis | yra | iškart | šalia | — | persirengimo kambario.",
      "Vandens fontanėlis – iškart šalia persirengimo kambario.")],
    trainer_info: [t("Yes! | That's | me!", "Taip! | Tai | aš!", "Taip! Tai aš!")],
    restroom_info: [t("The | restrooms | are | in the locker room.", "— | Tualetai | yra | persirengimo kambaryje.", "Tualetai – persirengimo kambaryje.")],
    jordan_years: [t("Eight | years! | I | love | it.", "Aštuonerius | metus! | Aš | dievinu | tai.", "Aštuonerius metus! Labai tai mėgstu.")],
    jordan_every_day: [t("Almost | every | day!", "Beveik | kiekvieną | dieną!", "Beveik kiekvieną dieną!")],

    // --- the form and paying ---------------------------------------------------------------------
    ask_form: [
      t("Now | just | fill out | this | form | and | sign | at the bottom.", "Dabar | tiesiog | užpildyk | šią | anketą | ir | pasirašyk | apačioje.", "Dabar tiesiog užpildyk šią anketą ir pasirašyk apačioje."),
      t("Just | sign | this | form | at the bottom, | please.", "Tiesiog | pasirašyk | šią | anketą | apačioje, | prašau.", "Tiesiog pasirašyk šią anketą apačioje."),
    ],
    form_reask: [
      t("Just | sign | at the bottom | when | you're | ready.", "Tiesiog | pasirašyk | apačioje | kai | tu būsi | {m:pasiruošęs|f:pasiruošusi}.", "Tiesiog pasirašyk apačioje, kai {m:būsi pasiruošęs|f:būsi pasiruošusi}."),
    ],
    ask_id: [t("And | I'll need | a | photo ID.", "Ir | man reikės | — | asmens dokumento su nuotrauka.", "Ir man reikės asmens dokumento su nuotrauka.")],
    sign_where: [t("Right | here, | at the bottom.", "Štai | čia, | apačioje.", "Štai čia, apačioje.")],
    pen_here: [t("Sure, | here's | a | pen.", "Žinoma, | štai | — | rašiklis.", "Žinoma, štai rašiklis.")],
    form_is: [t("It's | just | our | membership | form.", "Tai yra | tik | mūsų | narystės | anketa.", "Tai tik mūsų narystės anketa.")],
    form_ok: [t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"), t("Got it, | thank | you!", "Supratau, | dėkoju | tau!", "Supratau, ačiū!")],
    need_sign: [t("Sorry, | I | need | your | signature | before | we | start.", "Atsiprašau, | man | reikia | tavo | parašo | prieš | mums | pradedant.", "Atsiprašau, prieš pradedant man reikia tavo parašo.")],
    total_monthly: [t("That's | {$price} | for | the | first | month.", "Tai yra | {$price} | už | — | pirmą | mėnesį.", "Už pirmą mėnesį – {$price}.")],
    total_day: [t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}.")],
    ask_pay_method: [t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?")],
    card_tap: [t("Great! | Just | tap | your | card | here.", "Puiku! | Tiesiog | pridėk | savo | kortelę | čia.", "Puiku! Tiesiog pridėk kortelę čia.")],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    phone_ok: [t("Sure! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | priglausk | savo | telefoną | čia.", "Žinoma! Tiesiog priglausk telefoną čia.")],
    paid: [t("Thank | you!", "Dėkoju | tau!", "Ačiū!"), t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    member_card: [
      t("Here's | your | membership | card. | Just | scan | it | at | the | door.", "Štai | tavo | narystės | kortelė. | Tiesiog | nuskenuok | ją | prie | — | durų.",
        "Štai tavo narystės kortelė. Tiesiog nuskenuok ją prie durų."),
    ],
    wristband: [t("Here's | your | wristband | for today.", "Štai | tavo | apyrankė | šiandienai.", "Štai tavo šiandienos apyrankė.")],

    // --- the locker room -------------------------------------------------------------------------
    ask_change: [
      t("Okay! | Do | you | want | to change | first?", "Gerai! | Ar | tu | nori | persirengti | pirmiausia?", "Gerai! Gal nori pirmiausia persirengti?", { flags: { 1: FLAG_DO } }),
      t("Do | you | need | to change | before | we | start?", "Ar | tau | reikia | persirengti | prieš | mums | pradedant?", "Ar tau reikia persirengti prieš pradedant?", { flags: { 0: FLAG_DO } }),
    ],
    lockers_info: [
      t("The | locker room | is | downstairs, | on the right.", "— | Persirengimo kambarys | yra | apačioje, | dešinėje.", "Persirengimo kambarys – apačioje, dešinėje."),
      t("The | locker room | is | right | over | there, | on the left.", "— | Persirengimo kambarys | yra | tiesiai | — | ten, | kairėje.", "Persirengimo kambarys – štai ten, kairėje.",
        { flags: { 4: FLAG_OVER } }),
    ],
    bring_lock: [t("Did | you | bring | a | lock?", "Ar | tu | atsinešei | — | spynelę?", "Ar atsinešei spynelę?", { flags: { 0: "Question “Did” = the particle ar; the past tense sits on atsinešei." } })],
    lock_yes: [t("Perfect!", "Puiku!", "Puiku!")],
    lock_buy: [
      t("No | problem! | You | can | buy | one | at the front desk | for | five | dollars.", "Jokių | problemų! | Tu | gali | nusipirkti | ją | registratūroje | už | penkis | dolerius.",
        "Jokių problemų! Registratūroje spynelę gali nusipirkti už penkis dolerius.", { flags: { 5: "“one” = a lock (spynelė), hence ją." } }),
    ],
    lock_need_info: [t("Yes, | for the lockers. | You | can | buy | one | at the front desk.", "Taip, | spintelėms. | Tu | gali | nusipirkti | ją | registratūroje.",
      "Taip, spintelėms. Registratūroje gali nusipirkti spynelę.", { flags: { 5: "“one” = a lock (spynelė), hence ją." } })],
    lock_borrow_ok: [t("Sure! | Just | ask | at the front desk.", "Žinoma! | Tiesiog | paklausk | registratūroje.", "Žinoma! Tiesiog paklausk registratūroje.")],
    towels_water_tip: [
      t("Towels | are | free, | and | the | water | fountain | is | right | next to | the | locker room.",
        "Rankšluosčiai | yra | nemokami, | o | — | vandens | fontanėlis | yra | iškart | šalia | — | persirengimo kambario.",
        "Rankšluosčiai nemokami, o vandens fontanėlis – iškart šalia persirengimo kambario."),
    ],
    lets_go: [t("Great, | let's go!", "Puiku, | einam!", "Puiku, einam!")],
    see_you_back: [
      t("See you | back | here | in | a | few | minutes!", "Pasimatysime | vėl | čia | po | — | kelių | minučių!", "Susitiksime čia po kelių minučių!"),
      t("Take your time. | I'll be | right here.", "Neskubėk. | Būsiu | čia pat.", "Neskubėk, aš būsiu čia pat."),
    ],

    // --- the warm-up -----------------------------------------------------------------------------
    warmup: [
      t("Okay, | let's start! | Warm up | first: | five | minutes | on | the | treadmill | or | the | bike.",
        "Gerai, | pradėkime! | Apšilk | pirmiausia: | penkios | minutės | ant | — | bėgimo takelio | ar | — | dviračio.",
        "Gerai, pradėkime! Pirmiausia apšilk: penkios minutės ant bėgimo takelio ar dviračio."),
      t("Let's start! | Warm up | first. | Five | minutes | on | the | bike | or | the | treadmill.",
        "Pradėkime! | Apšilk | pirmiausia. | Penkios | minutės | ant | — | dviračio | ar | — | bėgimo takelio.",
        "Pradėkime! Pirmiausia apšilk. Penkios minutės ant dviračio ar bėgimo takelio."),
    ],
    warmup_which: [t("Which one?", "Kurį?", "Kurį renkiesi?"), t("Which | do | you | prefer?", "Kurį | — | tu | renkiesi?", "Kurį renkiesi?", { flags: { 1: FLAG_WH_DO } })],
    warm_reask: [t("So, | the | treadmill | or | the | bike?", "Tai, | — | bėgimo takelis | ar | — | dviratis?", "Tai bėgimo takelis ar dviratis?")],
    warm_ok: [
      t("Great! | Nice | and | easy. | Not | too | fast.", "Puiku! | Ramiai | ir | lengvai. | Ne | per | greitai.", "Puiku! Ramiai ir lengvai, ne per greitai."),
      t("Perfect! | Start | slow, | nice | and | easy.", "Puiku! | Pradėk | lėtai, | ramiai | ir | lengvai.", "Puiku! Pradėk lėtai, ramiai ir lengvai."),
    ],
    warm_pick_bike: [
      t("Then | let's take | the | bike. | It's | easy | on | the | knees.", "Tada | imkime | — | dviratį. | Jis yra | lengvas | — | — | keliams.", "Tada imkime dviratį – jis tausoja kelius.",
        { flags: { 6: "“on” (easy on): the dative keliams carries it." } }),
    ],
    warm_pick_tread: [t("Then | let's take | the | treadmill. | Just | walk.", "Tada | imkime | — | bėgimo takelį. | Tiesiog | eik.", "Tada imkime bėgimo takelį. Tiesiog eik.")],
    warm_other_ok: [t("Sure, | the | elliptical | is | great | too.", "Žinoma, | — | elipsinis treniruoklis | yra | puikus | irgi.", "Žinoma, elipsinis treniruoklis irgi puikus.")],
    warm_how_long: [t("Just | five | minutes.", "Tik | penkias | minutes.", "Tik penkias minutes.")],
    warm_how_fast: [t("Nice | and | easy. | You | should | be able | to talk.", "Ramiai | ir | lengvai. | Tu | turėtum | galėti | kalbėti.", "Ramiai ir lengvai – turėtum galėti kalbėtis.")],
    warm_why: [t("It | gets | your | muscles | ready.", "Tai | paruošia | tavo | raumenis | —.", "Tai paruošia raumenis darbui.",
      { flags: { 4: "“ready” (get … ready): paruošia carries it (linked to “gets”)." } })],
    warmed_up: [
      t("Okay, | that's | five | minutes! | You're | warmed up.", "Gerai, | tai | penkios | minutės! | Tu esi | {m:apšilęs|f:apšilusi}.", "Gerai, penkios minutės praėjo! Jau {m:apšilęs|f:apšilusi}."),
      t("Time's up! | You're | warmed up.", "Laikas baigėsi! | Tu esi | {m:apšilęs|f:apšilusi}.", "Laikas baigėsi! Jau {m:apšilęs|f:apšilusi}."),
    ],
    feel_q: [
      t("How | do | you | feel?", "Kaip | — | tu | jautiesi?", "Kaip jautiesi?", { flags: { 1: FLAG_WH_DO } }),
      t("How | are | you | feeling?", "Kaip | — | tu | jautiesi?", "Kaip jautiesi?", { flags: { 1: "Progressive “are” has no Lithuanian word; jautiesi carries it (linked to “feeling”)." } }),
    ],
    feel_good_reply: [t("Awesome! | You're doing | great.", "Šaunu! | Tau sekasi | puikiai.", "Šaunu! Tau puikiai sekasi."), t("Great!", "Puiku!", "Puiku!")],
    feel_tired_reply: [t("That's | normal. | You're doing | great!", "Tai | normalu. | Tau sekasi | puikiai!", "Tai normalu. Tau puikiai sekasi!")],

    // --- the machine -----------------------------------------------------------------------------
    machine_intro: [
      t("Next: | {X.the}. | Hmm, | there's | a | towel | on | it.", "Toliau: | {X.the:nom}. | Hmm, | yra | — | rankšluostis | ant | jo.", "Toliau – {X:nom}. Hmm, ant jo padėtas rankšluostis."),
      t("Let's try | {X.the}. | Oh, | someone | left | a | water | bottle | on | it.", "Pabandykime | {X.the:acc}. | O, | kažkas | paliko | — | vandens | butelį | ant | jo.",
        "Pabandykime {X:acc}. O, kažkas ant jo paliko vandens butelį."),
    ],
    machine_next: [t("Next: | {X.the}.", "Toliau: | {X.the:nom}.", "Toliau – {X:nom}.")],
    out_of_order: [
      t("Oh | no, | it's | out of order | today. | Let's use | the | other one, | by | the | wall.", "O | ne, | jis yra | sugedęs | šiandien. | Naudokime | — | kitą, | prie | — | sienos.",
        "O ne, šiandien jis neveikia. Naudokime kitą, prie sienos."),
    ],
    other_towel: [t("But | there's | a | towel | on | it.", "Bet | yra | — | rankšluostis | ant | jo.", "Bet ant jo padėtas rankšluostis.")],
    machine_nudge: [t("Go ahead | and | ask | if | it's | free.", "Drąsiai | — | paklausk, | ar | jis yra | laisvas.", "Drąsiai paklausk, ar jis laisvas.",
      { flags: { 1: "“and” (go ahead and …) links the invitation to the verb; no separate Lithuanian word." } })],
    machine_ok_asked: [
      t("Let me check... | Yep, | it's | free! | Go ahead.", "Tuoj patikrinsiu... | Taip, | jis yra | laisvas! | Pirmyn.", "Tuoj patikrinsiu… Taip, laisvas! Pirmyn."),
      t("Good | question! | He's | done. | It's all yours!", "Geras | klausimas! | Jis yra | baigęs. | Jis tavo!", "Geras klausimas! Jis jau baigė. Treniruoklis tavo!"),
    ],
    machine_ok: [t("Let me check... | Yep, | it's | free! | Go ahead.", "Tuoj patikrinsiu... | Taip, | jis yra | laisvas! | Pirmyn.", "Tuoj patikrinsiu… Taip, laisvas! Pirmyn.")],
    this_is_x: [t("This | is | {X.the}.", "Tai | yra | {X.the:nom}.", "Tai {X:nom}.")],
    machine_nudge_other: [t("Go ahead | and | ask | if | the | other one | is | free.", "Drąsiai | — | paklausk | ar | — | kitas | yra | laisvas.", "Drąsiai paklausk, ar kitas laisvas.",
      { flags: { 1: "“and” (go ahead and …) links the invitation to the verb; no separate Lithuanian word." } })],
    broken_info: [t("It's | broken. | They're fixing | it | tomorrow.", "Jis yra | sugedęs. | Pataisys | jį | rytoj.", "Jis sugedęs. Rytoj jį pataisys.")],
    not_broken: [t("No, | it's | fine!", "Ne, | jis yra | tvarkingas!", "Ne, jis tvarkingas!")],

    // --- sets, reps, weight ----------------------------------------------------------------------
    sets_explain_leg: [
      t("Sit | here, | put | your | feet | on | the | plate, | and | push | slowly.", "Atsisėsk | čia, | padėk | savo | pėdas | ant | — | platformos, | ir | stumk | lėtai.",
        "Atsisėsk čia, padėk pėdas ant platformos ir lėtai stumk."),
    ],
    sets_explain_chest: [t("Sit | here, | hold | the | handles, | and | push | slowly.", "Atsisėsk | čia, | laikyk | — | rankenas, | ir | stumk | lėtai.", "Atsisėsk čia, laikyk rankenas ir lėtai stumk.")],
    any_questions: [
      t("Any | questions?", "Kokių nors | klausimų?", "Turi klausimų?"),
      t("Any | questions | before | you | start?", "Kokių nors | klausimų | prieš | tau | pradedant?", "Turi klausimų prieš pradedant?"),
    ],
    any_other: [t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Dar turi klausimų?")],
    ask_away: [t("Sure! | Go ahead.", "Žinoma! | Klausk.", "Žinoma! Klausk.")],
    sets_answer: [
      t("Three | sets | of | ten | reps.", "Trys | serijos | po | dešimt | pakartojimų.", "Trys serijos po dešimt pakartojimų."),
      t("Three | sets | of | ten! | I'll count | them | with | you!", "Trys | serijos | po | dešimt! | Suskaičiuosiu | jas | su | tavimi!", "Trys serijos po dešimt! Skaičiuosiu kartu su tavimi!"),
      t("Let's do | three | sets | of | ten.", "Darykime | tris | serijas | po | dešimt.", "Darykime tris serijas po dešimt pakartojimų."),
    ],
    rest_tip: [t("Rest | about | a | minute | between | sets.", "Ilsėkis | maždaug | — | minutę | tarp | serijų.", "Tarp serijų ilsėkis maždaug minutę.")],
    rest_answer: [t("About | a | minute | between | sets.", "Maždaug | — | minutę | tarp | serijų.", "Maždaug minutę tarp serijų.")],
    weight_machine: [t("Let's start | light: | fifty | pounds.", "Pradėkime | lengvai: | penkiasdešimt | svarų.", "Pradėkime nuo mažo svorio – penkiasdešimt svarų.")],
    bar_weight: [t("It's | just | the | bar: | forty-five | pounds.", "Tai yra | tik | — | grifas: | keturiasdešimt penki | svarai.", "Tai tik grifas – keturiasdešimt penki svarai.")],
    kg_note: [
      t("Here | we | use | pounds. | One | pound | is | about | half | a | kilo.", "Čia | mes | naudojame | svarus. | Vienas | svaras | yra | maždaug | pusė | — | kilogramo.",
        "Čia svoris matuojamas svarais. Vienas svaras – maždaug pusė kilogramo."),
    ],
    how_right: [t("Yes, | perfect! | Nice | and | slow.", "Taip, | puiku! | Ramiai | ir | lėtai.", "Taip, puiku! Ramiai ir lėtai.")],
    rep_count: [
      t("Okay, | go! | Last | set! | Eight, | nine… | One more | rep!", "Gerai, | pirmyn! | Paskutinė | serija! | Aštuoni, | devyni… | Dar vienas | pakartojimas!",
        "Gerai, pirmyn! Paskutinė serija! Aštuoni, devyni… Dar vienas pakartojimas!"),
      t("And | now | the | last | set! | Eight, | nine… | One more | rep!", "O | dabar | — | paskutinė | serija! | Aštuoni, | devyni… | Dar vienas | pakartojimas!",
        "O dabar – paskutinė serija! Aštuoni, devyni… Dar vienas pakartojimas!"),
      t("Push! | Eight, | nine… | One more | rep! | You | can | do | it!", "Stumk! | Aštuoni, | devyni… | Dar vienas | pakartojimas! | Tu | gali | padaryti | tai!",
        "Stumk! Aštuoni, devyni… Dar vienas pakartojimas! Tu gali!"),
    ],
    one_more_again: [t("Come on! | One more | rep!", "Nagi! | Dar vienas | pakartojimas!", "Nagi! Dar vienas pakartojimas!")],
    good_job: [
      t("Good | job! | That's | three | sets!", "Geras | darbas! | Tai | trys | serijos!", "{m:Šaunuolis|f:Šaunuolė}! Trys serijos baigtos!"),
      t("Yes! | Nice | work!", "Taip! | Puikus | darbas!", "Taip! {m:Šaunuolis|f:Šaunuolė}!"),
    ],
    cant_reply: [t("Yes, | you | can! | Push! | Yes! | Good | job!", "Taip, | tu | gali! | Stumk! | Taip! | Geras | darbas!", "Gali! Stumk! Taip! {m:Šaunuolis|f:Šaunuolė}!")],
    cant_general: [t("Sure | you | can! | I'm | right here.", "Žinoma | tu | gali! | Aš esu | čia pat.", "Žinoma, kad gali! Aš čia pat.")],

    // --- pain ------------------------------------------------------------------------------------------
    okay_q: [t("Whoa, | are | you | okay?", "Oho, | ar | tau | viskas gerai?", "Oho, ar tau viskas gerai?",
      { flags: { 1: "“are” in a yes/no question = the particle ar; Lithuanian asks “is everything okay for you” (tau viskas gerai)." } })],
    pain_reply: [t("Stop | right there. | Let's try | something | easier.", "Sustok | iškart. | Pabandykime | ką nors | lengvesnio.", "Sustok iškart. Pabandykime ką nors lengvesnio.")],
    arms_instead: [t("Let's work | on | your | arms | instead.", "Padirbėkime | su | tavo | rankomis | vietoj to.", "Vietoj to padirbėkime su rankomis.")],
    pain_stop: [t("Okay, | let's stop | here.", "Gerai, | sustokime | čia.", "Gerai, čia ir sustokime.")],
    easy_tonight: [t("Oh | no! | Rest | tonight, | okay?", "O | ne! | Pailsėk | šįvakar, | gerai?", "O ne! Šįvakar pailsėk, gerai?")],
    feel_now_q: [
      t("Okay. | How | do | you | feel | now?", "Gerai. | Kaip | — | tu | jautiesi | dabar?", "Gerai. Kaip dabar jautiesi?", { flags: { 2: FLAG_WH_DO } }),
      t("Nice | and | easy. | How | do | you | feel | now?", "Ramiai | ir | lengvai. | Kaip | — | tu | jautiesi | dabar?", "Štai taip, ramiai. Kaip dabar jautiesi?", { flags: { 4: FLAG_WH_DO } }),
    ],
    stretch_instead: [t("Let's do | some | easy | stretching | instead.", "Padarykime | — | lengvų | tempimo pratimų | vietoj to.", "Vietoj to padarykime lengvų tempimo pratimų.",
      { flags: { 1: FLAG_SOME } })],
    easy_today: [t("Okay, | nothing | heavy | today.", "Gerai, | nieko | sunkaus | šiandien.", "Gerai, šiandien nieko sunkaus.")],
    fine_reply: [t("Great! | But | tell | me | if | anything | hurts.", "Puiku! | Bet | pasakyk | man | jei | kas nors | skauda.", "Puiku! Bet pasakyk, jei kas nors skaudės.")],
    // "Whoa, are you okay?" – "I'm just tired." / "I need a break."
    okay_tired: [t("That's | normal! | But | tell | me | if | anything | hurts.", "Tai | normalu! | Bet | pasakyk | man | jei | kas nors | skauda.", "Tai normalu! Bet pasakyk, jei kas nors skaudės.")],
    what_hurts: [t("Oh | no! | What | hurts?", "O | ne! | Kas | skauda?", "O ne! Kas skauda?")],

    // --- spotting --------------------------------------------------------------------------------
    spot_intro: [
      t("Now, | the | bench press! | Lie down | on | the | bench.", "Dabar, | — | spaudimas gulint! | Atsigulk | ant | — | suolo.", "Dabar – spaudimas gulint! Atsigulk ant suolo."),
      t("Let's try | the | bench press. | Lie down | on | the | bench.", "Pabandykime | — | spaudimą gulint. | Atsigulk | ant | — | suolo.", "Pabandykime spaudimą gulint. Atsigulk ant suolo."),
    ],
    // after "Let's work on your arms instead." (never a second "Let's try …")
    spot_intro_now: [t("Now, | the | bench press! | Lie down | on | the | bench.", "Dabar, | — | spaudimas gulint! | Atsigulk | ant | — | suolo.", "Dabar – spaudimas gulint! Atsigulk ant suolo.")],
    bar_only: [t("Just | the | bar | today: | forty-five | pounds.", "Tik | — | grifas | šiandien: | keturiasdešimt penki | svarai.", "Šiandien – tik grifas, keturiasdešimt penki svarai.")],
    spot_ready: [t("Ready?", "{m:Pasiruošęs|f:Pasiruošusi}?", "{m:Pasiruošęs|f:Pasiruošusi}?")],
    spot_yes: [
      t("Of course! | I'll stay | right here.", "Žinoma! | Būsiu | čia pat.", "Žinoma! Būsiu čia pat."),
      t("Sure thing! | I'll spot | you.", "Žinoma! | Padrausiu | tave.", "Žinoma! Padrausiu tave."),
    ],
    spot_offer: [t("Don't worry, | I'll spot | you. | I'll stay | right here.", "Nesijaudink, | padrausiu | tave. | Būsiu | čia pat.", "Nesijaudink, padrausiu tave. Būsiu čia pat.")],
    bench_go: [
      t("Lower | the | bar | slowly… | and | push! | Good | job!", "Nuleisk | — | grifą | lėtai… | ir | stumk! | Geras | darbas!", "Lėtai nuleisk grifą… ir stumk! {m:Šaunuolis|f:Šaunuolė}!"),
      t("Push! | Push! | One more | rep! | Yes! | Great | job!", "Stumk! | Stumk! | Dar vienas | pakartojimas! | Taip! | Puikus | darbas!", "Stumk! Stumk! Dar vienas pakartojimas! Taip! Puikiai!"),
    ],
    no_spot_reply: [t("Okay, | but | I'll stay | close, | just in case.", "Gerai, | bet | būsiu | arti, | dėl viso pikto.", "Gerai, bet būsiu šalia – dėl viso pikto.")],

    // --- out of breath ---------------------------------------------------------------------------
    finisher: [
      t("Last one: | one | minute | on | the | rowing | machine. | Go, | go, | go!", "Paskutinis: | viena | minutė | ant | — | irklavimo | treniruoklio. | Pirmyn, | pirmyn, | pirmyn!",
        "Paskutinis pratimas: viena minutė ant irklavimo treniruoklio. Pirmyn, pirmyn, pirmyn!"),
    ],
    finisher_easy: [t("Last one: | one | easy | minute | on | the | bike.", "Paskutinis: | viena | lengva | minutė | ant | — | dviračio.", "Paskutinis pratimas: viena lengva minutė ant dviračio.")],
    time_feel: [t("Time! | How | do | you | feel?", "Laikas! | Kaip | — | tu | jautiesi?", "Laikas! Kaip jautiesi?", { flags: { 2: FLAG_WH_DO } })],
    break_water: [
      t("Take | a | break, | grab | some | water.", "Padaryk | — | pertrauką, | pasiimk | — | vandens.", "Padaryk pertrauką, atsigerk vandens.", { flags: { 4: FLAG_SOME } }),
      t("That's | normal! | Take | a | break, | grab | some | water.", "Tai | normalu! | Padaryk | — | pertrauką, | pasiimk | — | vandens.", "Tai normalu! Padaryk pertrauką, atsigerk vandens.",
        { flags: { 6: FLAG_SOME } }),
    ],
    earned_it: [t("You | earned | it!", "Tu | nusipelnei | to!", "Nusipelnei!")],
    ok_water: [t("Good! | Grab | some | water.", "Gerai! | Pasiimk | — | vandens.", "Gerai! Atsigerk vandens.", { flags: { 2: FLAG_SOME } })],
    great_shape: [
      t("Wow, | you're | in | great | shape! | Still, | grab | some | water.", "Oho, | tu esi | — | puikios | formos! | Vis tiek, | pasiimk | — | vandens.",
        "Oho, tu puikios formos! Bet vis tiek atsigerk vandens.", { flags: { 2: "“in” (in great shape): the genitive of quality puikios formos carries it.", 7: FLAG_SOME } }),
    ],

    // --- next time -------------------------------------------------------------------------------
    same_time_q: [
      t("Nice | work | today! | Same | time | tomorrow?", "Puikus | darbas | šiandien! | Tuo pačiu | laiku | rytoj?", "Šiandien puikiai padirbėjai! Rytoj tuo pačiu laiku?"),
      t("You | did | great! | Same | time | tomorrow?", "Tau | sekėsi | puikiai! | Tuo pačiu | laiku | rytoj?", "Tau puikiai sekėsi! Rytoj tuo pačiu laiku?"),
    ],
    same_time_short: [t("Same | time | tomorrow?", "Tuo pačiu | laiku | rytoj?", "Rytoj tuo pačiu laiku?")],
    great_workout: [t("Great | workout!", "Puiki | treniruotė!", "Puiki treniruotė!")],
    when_short: [t("So, | when | do | you | want | to come | back?", "Tai, | kada | — | tu | nori | ateiti | vėl?", "Tai kada nori ateiti vėl?", { flags: { 2: FLAG_WH_DO } })],
    see_tomorrow: [
      t("Awesome! | See you | tomorrow!", "Šaunu! | Iki | rytojaus!", "Šaunu! Iki rytojaus!"),
      t("Perfect! | See you | tomorrow, | same | time!", "Puiku! | Iki | rytojaus, | tuo pačiu | laiku!", "Puiku! Iki rytojaus, tuo pačiu laiku!"),
    ],
    see_day: [t("{X}? | Sure! | See you | {X}!", "{X:nom}? | Žinoma! | Iki | {X:gen}!", "{X:nom}? Žinoma! Iki {X:gen}!")],
    offer_thursday: [t("No | problem! | How | about | Thursday?", "Jokių | problemų! | Kaip | dėl | ketvirtadienio?", "Jokių problemų! Gal ketvirtadienį?")],
    see_then: [t("Sounds | good! | See you | then!", "Skamba | gerai! | Iki | tada!", "Puiku! Iki tada!")],
    book_later_ok: [t("No | problem! | Just | call | the | front desk.", "Jokių | problemų! | Tiesiog | paskambink | — | į registratūrą.", "Jokių problemų! Tiesiog paskambink į registratūrą.")],
    same_as_today: [t("Same | time | as | today!", "Tuo pačiu | laiku | kaip | šiandien!", "Tuo pačiu laiku kaip šiandien!")],
    closing: [
      t("Great | first | workout! | Don't forget | to stretch!", "Puiki | pirma | treniruotė! | Nepamiršk | pasitempti!", "Puiki pirma treniruotė! Nepamiršk pasitempti!"),
      t("You | did | great | today. | Drink | lots of | water!", "Tau | sekėsi | puikiai | šiandien. | Gerk | daug | vandens!", "Tau šiandien puikiai sekėsi. Gerk daug vandens!"),
    ],

    // --- general ---------------------------------------------------------------------------------
    ack: [t("Okay!", "Gerai!", "Gerai!"), t("Got it.", "Supratau.", "Supratau."), t("Sounds | good.", "Skamba | gerai.", "Puiku.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
  },

  domains: {
    price: () => [1000, 3500],
  },

  hints: {
    new: {
      lt: "Pasakyti, kad esi čia pirmą kartą",
      items: [
        { id: "new_here", s: t("Hi, | I'm | new | here!", "Labas, | aš esu | {m:naujas|f:nauja} | čia!", "Labas, aš čia {m:naujas|f:nauja}!") },
        { id: "first_time", s: t("It's | my | first | time | here.", "Tai yra | mano | pirmas | kartas | čia.", "Esu čia pirmą kartą.") },
        { id: "join", s: t("I'd like | to sign up.", "Norėčiau | užsiregistruoti.", "Norėčiau užsiregistruoti.") },
        { id: "become_member", s: t("I'd like | to become | a | member.", "Norėčiau | tapti | — | {m:nariu|f:nare}.", "Norėčiau tapti {m:nariu|f:nare}.") },
        { id: "how_join", s: t("How | do | I | sign up?", "Kaip | — | aš | užsiregistruoju?", "Kaip užsiregistruoti?", { flags: { 1: FLAG_WH_DO } }) },
      ],
    },
    plan: {
      lt: "Pasirinkti narystę", slot: "plan", examples: ["monthly", "day_pass"],
      items: [
        { id: "take_plan", s: t("I'll take | {X.the}.", "Imsiu | {X.the:acc}.", "Imsiu {X:acc}.") },
        { id: "like_plan", s: t("I'd like | {X.np}, | please.", "Norėčiau | {X.np:gen}, | prašau.", "Norėčiau {X.np:gen}.") },
        { id: "plan_short", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "just_today", s: t("Just | for today, | please.", "Tik | šiandienai, | prašau.", "Tik šiandienai, prašau."), note: "Taip pasakysi, jei nori tik dienos bilieto." },
      ],
    },
    plan_ask: {
      lt: "Paklausti apie narystę",
      items: [
        { id: "q_price", s: t("How much | is | a | monthly | membership?", "Kiek | kainuoja | — | mėnesinė | narystė?", "Kiek kainuoja mėnesinė narystė?") },
        { id: "q_included", s: t("What's | included?", "Kas yra | įskaičiuota?", "Kas įskaičiuota?") },
        { id: "q_fee", s: t("Is | there | a | sign-up | fee?", "Ar yra | — | — | įstojimo | mokestis?", "Ar yra įstojimo mokestis?", { flags: { 1: FLAG_THERE } }) },
        { id: "q_cancel", s: t("Can | I | cancel | anytime?", "Ar galiu | aš | nutraukti | bet kada?", "Ar galiu nutraukti narystę bet kada?") },
        { id: "q_hours", s: t("What | are | your | hours?", "Kokios | yra | jūsų | darbo valandos?", "Kokiomis valandomis dirbate?"), note: "„Your“ čia – viso sporto klubo, todėl „jūsų“." },
        { id: "q_have", s: t("Do | you | have | showers?", "Ar | jūs | turite | dušų?", "Ar turite dušų?", { flags: { 0: FLAG_DO } }) },
        { id: "q_have", s: t("Do | you | have | classes?", "Ar | jūs | turite | grupinių užsiėmimų?", "Ar turite grupinių užsiėmimų?", { flags: { 0: FLAG_DO } }) },
      ],
    },
    form: {
      lt: "Užpildyti ir pasirašyti anketą",
      items: [
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "form_done", s: t("Okay, | all done.", "Gerai, | viskas baigta.", "Gerai, viskas.") },
        { id: "q_sign", s: t("Where | do | I | sign?", "Kur | — | aš | pasirašau?", "Kur pasirašyti?", { flags: { 1: FLAG_WH_DO } }) },
        { id: "q_pen", s: t("Can | I | borrow | a | pen?", "Ar galiu | aš | pasiskolinti | — | rašiklį?", "Ar galiu pasiskolinti rašiklį?") },
        { id: "q_form", s: t("What | is | this | form?", "Kas | yra | ši | anketa?", "Kas čia per anketa?") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "pay_phone", s: t("Can | I | pay | with | my | phone?", "Ar galiu | aš | sumokėti | — | savo | telefonu?", "Ar galiu sumokėti telefonu?",
          { flags: { 3: "“with”: the instrumental telefonu carries it (C-CASE-DASH, “my” intervenes)." } }) },
      ],
    },
    lockers: {
      lt: "Paklausti apie persirengimo kambarį",
      items: [
        { id: "where_lockers", s: t("Where | are | the | lockers?", "Kur | yra | — | spintelės?", "Kur yra spintelės?") },
        { id: "where_change", s: t("Where | can | I | change?", "Kur | galiu | aš | persirengti?", "Kur galiu persirengti?") },
        { id: "where_bag", s: t("Where | can | I | leave | my | bag?", "Kur | galiu | aš | palikti | savo | krepšį?", "Kur galiu palikti krepšį?") },
        { id: "q_have", s: t("Do | you | have | towels?", "Ar | jūs | turite | rankšluosčių?", "Ar turite rankšluosčių?", { flags: { 0: FLAG_DO } }) },
        { id: "q_water", s: t("Where's | the | water | fountain?", "Kur yra | — | vandens | fontanėlis?", "Kur vandens fontanėlis?") },
        { id: "ready", s: t("No, | I'm | ready!", "Ne, | aš esu | {m:pasiruošęs|f:pasiruošusi}!", "Ne, aš {m:pasiruošęs|f:pasiruošusi}!") },
      ],
    },
    lock: {
      lt: "Atsakyti, ar turi spynelę",
      items: [
        { id: "lock_have", s: t("Yes, | I | brought | one.", "Taip, | aš | atsinešiau | vieną.", "Taip, atsinešiau.") },
        { id: "lock_forgot", s: t("No, | I | forgot | it.", "Ne, | aš | pamiršau | ją.", "Ne, pamiršau.", { flags: { 3: "“it” = the lock (spynelė), hence ją." } }) },
        { id: "lock_borrow", s: t("Can | I | borrow | one?", "Ar galiu | aš | pasiskolinti | vieną?", "Ar galiu pasiskolinti?") },
      ],
    },
    warmup: {
      lt: "Pasirinkti, kaip apšilti", slot: "cardio", examples: ["bike", "treadmill"],
      items: [
        { id: "warm_the", s: t("{X.the}, | please.", "{X.the:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "warm_take", s: t("I'll take | {X.the}.", "Imsiu | {X.the:acc}.", "Imsiu {X:acc}.") },
        { id: "warm_prefer", s: t("I | prefer | {X.the}.", "Man | labiau patinka | {X.the:nom}.", "Man labiau patinka {X:nom}.", { flags: { 0: "“I” → dative Man: Lithuanian says “X is more pleasing to me”." } }) },
        { id: "q_how_long", s: t("For | how | long?", "— | Kaip | ilgai?", "Kiek laiko?", { flags: { 0: "“For” in a question about time has no separate word here." } }) },
      ],
    },
    feel: {
      lt: "Pasakyti, kaip jautiesi",
      items: [
        { id: "feel_great", s: t("I | feel | great!", "Aš | jaučiuosi | puikiai!", "Jaučiuosi puikiai!") },
        { id: "feel_warm", s: t("I'm | warm | now.", "Man | šilta | dabar.", "Man jau šilta.", { flags: { 0: "“I'm” → dative Man: Lithuanian says “it is warm to me”." } }) },
        { id: "feel_tired", s: t("A little | tired.", "Truputį | {m:pavargęs|f:pavargusi}.", "Truputį pavargau.") },
      ],
    },
    machine: {
      lt: "Paklausti, ar treniruoklis laisvas",
      items: [
        { id: "machine_free", s: t("Is | this | machine | free?", "Ar | šis | treniruoklis | laisvas?", "Ar šis treniruoklis laisvas?", { flags: { 0: FLAG_IS } }) },
        { id: "anyone_using", s: t("Is | anyone | using | this?", "Ar | kas nors | naudojasi | šiuo?", "Ar kas nors naudojasi šiuo treniruokliu?",
          { flags: { 0: "“Is” (question + progressive): the particle ar; the present naudojasi carries the progressive (linked to “using”)." } }) },
        { id: "you_using", s: t("Excuse me, | are | you | using | this?", "Atsiprašau, | ar | jūs | naudojatės | šiuo?", "Atsiprašau, ar jūs naudojatės šiuo treniruokliu?",
          { flags: { 1: "“are” (question + progressive): the particle ar; the present naudojatės carries the progressive (linked to “using”)." } }), note: "Taip klausiama žmogaus, kuris stovi prie treniruoklio." },
        { id: "can_use", s: t("Can | I | use | this | machine?", "Ar galiu | aš | naudotis | šiuo | treniruokliu?", "Ar galiu naudotis šiuo treniruokliu?") },
      ],
    },
    broken: {
      lt: "Paklausti, kas nutiko",
      items: [
        { id: "q_broken", s: t("What's | wrong | with | it?", "Kas yra | negerai | su | juo?", "Kas jam nutiko?") },
      ],
    },
    sets: {
      lt: "Paklausti, kaip daryti pratimą",
      items: [
        { id: "how_many_sets", s: t("How many | sets | should | I | do?", "Kiek | serijų | turėčiau | aš | daryti?", "Kiek serijų turėčiau daryti?") },
        { id: "how_many_reps", s: t("How many | reps?", "Kiek | pakartojimų?", "Kiek pakartojimų?"), note: "„Rep“ – pakartojimas, „set“ – serija." },
        { id: "q_weight", s: t("How much | weight | should | I | use?", "Kiek | svorio | turėčiau | aš | naudoti?", "Kokį svorį turėčiau naudoti?") },
        { id: "q_rest", s: t("How | long | should | I | rest?", "Kaip | ilgai | turėčiau | aš | ilsėtis?", "Kiek laiko ilsėtis?") },
        { id: "q_how", s: t("How | does | this | machine | work?", "Kaip | — | šis | treniruoklis | veikia?", "Kaip veikia šis treniruoklis?", { flags: { 1: FLAG_WH_DO } }) },
        { id: "ready", s: t("I'm | ready!", "Aš esu | {m:pasiruošęs|f:pasiruošusi}!", "Esu {m:pasiruošęs|f:pasiruošusi}!") },
      ],
    },
    rep: {
      lt: "Padaryti paskutinį pakartojimą",
      items: [
        { id: "one_more", s: t("Okay, | one more!", "Gerai, | dar vienas!", "Gerai, dar vienas!") },
        { id: "done_it", s: t("Done! | I | did | it!", "Baigta! | Aš | padariau | tai!", "Baigta! Padariau!") },
        { id: "was_hard", s: t("Phew! | That | was | hard!", "Fu! | Tai | buvo | sunku!", "Fu! Buvo sunku!") },
      ],
    },
    pain: {
      lt: "Pasakyti, kad skauda",
      items: [
        { id: "knee_hurts", s: t("My | knee | hurts.", "Man | kelį | skauda.", "Man skauda kelį.", { flags: { 0: FLAG_MY_HURT } }) },
        { id: "back_hurts", s: t("My | back | hurts | a little.", "Man | nugarą | skauda | truputį.", "Man truputį skauda nugarą.", { flags: { 0: FLAG_MY_HURT } }) },
        { id: "im_fine", s: t("I'm | fine, | thanks.", "Man | viskas gerai, | ačiū.", "Viskas gerai, ačiū.", { flags: { 0: "“I'm” → dative Man: Lithuanian says “everything is fine for me”." } }) },
      ],
    },
    spot: {
      lt: "Paprašyti trenerės padrausti",
      items: [
        { id: "spot_me", s: t("Can | you | spot | me?", "Ar gali | tu | padrausti | mane?", "Ar gali mane padrausti?"), note: "„Spot“ – padrausti: stovėti šalia ir padėti, jei štanga per sunki." },
        { id: "stay_close", s: t("Can | you | stay | close?", "Ar gali | tu | būti | arti?", "Ar gali pabūti šalia?") },
        { id: "q_bar", s: t("How much | does | the | bar | weigh?", "Kiek | — | — | grifas | sveria?", "Kiek sveria grifas?", { flags: { 1: FLAG_WH_DO } }) },
      ],
    },
    // back from the locker room ("See you back here in a few minutes!")
    changed: {
      lt: "Pasakyti, kad grįžai",
      items: [
        { id: "im_back", s: t("I'm back!", "Grįžau!", "Grįžau!") },
        { id: "ready", s: t("Okay, | I'm | ready!", "Gerai, | aš esu | {m:pasiruošęs|f:pasiruošusi}!", "Gerai, esu {m:pasiruošęs|f:pasiruošusi}!") },
      ],
    },
    // after the stretches: "How do you feel now?"
    feel_now: {
      lt: "Pasakyti, kaip jautiesi po tempimo",
      items: [
        { id: "better", s: t("Much | better, | thanks.", "Daug | geriau, | ačiū.", "Daug geriau, ačiū.") },
        { id: "still_hurts", s: t("My | knee | still | hurts.", "Man | kelį | vis dar | skauda.", "Man vis dar skauda kelį.", { flags: { 0: FLAG_MY_HURT } }) },
        { id: "im_fine", s: t("I'm | fine, | thanks.", "Man | viskas gerai, | ačiū.", "Viskas gerai, ačiū.", { flags: { 0: "“I'm” → dative Man: Lithuanian says “everything is fine for me”." } }) },
      ],
    },
    breath: {
      lt: "Pasakyti, kaip jautiesi",
      items: [
        { id: "out_of_breath", s: t("I'm | out of breath!", "Aš esu | {m:uždusęs|f:uždususi}!", "Uždusau!") },
        { id: "need_break", s: t("I | need | a | break.", "Man | reikia | — | pertraukos.", "Man reikia pertraukos.", { flags: { 0: "“I” → dative Man with reikia (need)." } }) },
        { id: "water_please", s: t("Can | I | get | some | water?", "Ar galiu | aš | gauti | — | vandens?", "Ar galiu atsigerti vandens?", { flags: { 3: FLAG_SOME } }) },
        { id: "feel_great", s: t("I | feel | great!", "Aš | jaučiuosi | puikiai!", "Jaučiuosi puikiai!") },
      ],
    },
    next: {
      lt: "Susitarti dėl kitos treniruotės", slot: "weekday", examples: ["thursday", "friday", "monday"],
      items: [
        { id: "same_time", s: t("Same | time | tomorrow?", "Tuo pačiu | laiku | rytoj?", "Rytoj tuo pačiu laiku?") },
        { id: "see_tomorrow", s: t("Sure! | See you | tomorrow!", "Žinoma! | Iki | rytojaus!", "Žinoma! Iki rytojaus!") },
        { id: "cant_tomorrow", s: t("I | can't | tomorrow.", "Aš | negaliu | rytoj.", "Rytoj negaliu.") },
        { id: "how_about_day", s: t("How | about | {X}?", "Kaip | dėl | {X:gen}?", "Gal {X:acc}?") },
        { id: "see_you_day", s: t("See you | {X}!", "Iki | {X:gen}!", "Iki {X:gen}!") },
      ],
    },
  },

  tips: {
    uk_changing: { key: "uk_changing", lt: "Suprasta! Amerikoje persirengimo kambarys vadinamas „locker room“.", better: "Where's the locker room?" },
    uk_cross: { key: "uk_cross", lt: "Suprasta! Amerikoje šis treniruoklis vadinamas „elliptical“.", better: "I'll take the elliptical." },
    uk_running: { key: "uk_running", lt: "Suprasta! Amerikoje bėgimo takelis vadinamas „treadmill“.", better: "I'll take the treadmill." },
    kg: { key: "kg", lt: "Suprasta! JAV svoris matuojamas svarais: 1 svaras (pound) ≈ 0,45 kg.", better: "How many pounds is it?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    uk_timetable: { key: "uk_timetable", lt: "Suprasta! Amerikoje dažniau sakoma „schedule“ (tvarkaraštis).", better: "What's the schedule?" },
    uk_car_park: { key: "uk_car_park", lt: "Suprasta! Amerikoje automobilių aikštelė – „parking lot“.", better: "Is there parking?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kad esi čia pirmą kartą", done: (c) => !!c.s.introduced },
    { step: "plan", lt: "Pasirink narystę" },
    { lt: "Pasirašyk anketą ir susimokėk", done: (c) => !!c.s.signed && !!c.s.paid },
    { lt: "Apšilk", done: (c) => !!c.s.warm },
    { lt: "Pasitreniruok su trenere", done: (c) => !!c.s.breathDone },
    { step: "next", lt: "Susitark dėl kitos treniruotės" },
  ],

  steps: [
    { id: "new", done: (c) => !!c.s.introduced,
      ask: (c) => c.say("ask_help"),
      expects: ["im_new", "want_join", "choose_plan", "not_new", "ask_price", "ask_trial"],
      suggest: [{ lt: "Pasakyti, kad esi čia pirmą kartą", hint: "new" }, { lt: "Paklausti apie narystę", hint: "plan_ask" }],
      yes: (c) => { if (c.s.firstQ && !c.s.notFirst) introduce(c); else { c.say("ask_help"); c.hold(); } },
      no: (c) => {
        if (c.s.firstQ && !c.s.notFirst) { c.s.notFirst = true; c.say("welcome_back"); c.hold(); return; }
        c.say("ask_help"); c.hold();
      } },
    { id: "plan", when: (c) => !!c.s.introduced, done: (c) => !!c.s.plan,
      ask: (c) => {
        if (!c.s.optionsSaid) {
          c.s.optionsSaid = true;
          c.say("plan_offer");
          if (c.s.trainerNote && !c.s.freeSaid) { c.s.freeSaid = true; c.say("plan_trainer_note"); }
        }
        c.say("plan_which");
      },
      expects: ["choose_plan", "plan_no", "want_join", "ask_price", "ask_included", "ask_fee", "ask_cancel", "ask_hours", "ask_have", "ask_trial", "recommend_q", "ask_discount"],
      suggest: [{ lt: "Pasirinkti narystę", hint: "plan", options: "plan" }, { lt: "Paklausti apie narystę", hint: "plan_ask" }],
      yes: (c) => { c.say("plan_which2"); c.hold(); },
      no: (c) => { c.say("plan_think"); c.hold(); },
      help: (c) => { c.say("plan_recommend"); } },
    { id: "form", when: (c) => !!c.s.plan, done: (c) => !!c.s.signed,
      ask: (c) => {
        if (c.s.formAsked) { c.say("form_reask"); return; }
        c.s.formAsked = true;
        c.say("ask_form");
        if (c.s.askId) c.say("ask_id");
      },
      expects: ["here_you_go", "form_done", "sign_q", "pen_q", "form_what", "check_ok"],
      suggest: [{ lt: "Užpildyti ir pasirašyti anketą", hint: "form" }],
      yes: (c) => sign(c),
      no: (c) => { c.say("need_sign"); c.hold(); },
      help: (c) => { c.say("sign_where"); } },
    { id: "pay", when: (c) => !!c.s.signed, done: (c) => !!c.s.paid,
      ask: (c) => {
        c.say(c.s.plan === "monthly" ? "total_monthly" : "total_day", { price: planPrice(c) });
        c.s.totalSaid = true;
        if (c.s.askPayMethod && !c.s.methodAsked) { c.s.methodAsked = true; c.say("ask_pay_method"); }
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card"],
      suggest: [{ lt: "Susimokėti", hint: "pay" }],
      yes: (c) => { if (c.s.payMethod) { pay(c, c.s.payMethod, true); return; } c.say("ask_pay_method"); c.hold(); },
      no: (c) => { c.say("ask_pay_method"); c.hold(); },
      help: (c) => { c.say("ask_pay_method"); } },
    { id: "lockers", when: (c) => !!c.s.paid, done: (c) => !!c.s.changeDone,
      // the way to the lockers is already known (asked at the desk, or the lock question was left for a
      // side question): no "Do you want to change first?" again, just the pause while the learner changes
      ask: (c) => { if (c.s.lockersDone) { afterLockers(c); return; } c.say("ask_change"); },
      expects: ["lockers_q", "change_no", "change_no_ctx", "ready", "towel_q", "water_q", "ask_have", "restroom_q", "lock_need", "lock_borrow"],
      suggest: [{ lt: "Paklausti, kur persirengimo spintelės", hint: "lockers" }],
      yes: (c) => tellLockers(c),
      no: (c) => { c.s.changeDone = true; c.say("lets_go"); },
      help: (c) => tellLockers(c) },
    { id: "warmup", when: (c) => warmupOpen(c), done: (c) => !!c.s.warm,
      ask: (c) => {
        if (c.s.warmAsked) { c.say("warm_reask"); return; }
        c.s.warmAsked = true;
        c.say("warmup");
        // the learner already said which one ("I'll take the bike" at the front desk)
        if (c.s.warmPref) { chooseWarm(c, c.s.warmPref, false); return; }
        c.say("warmup_which");
      },
      expects: ["warm_choice", "warm_not", "warm_any", "warm_q", "recommend_q"],
      suggest: [{ lt: "Pasirinkti, kaip apšilti", hint: "warmup", options: "cardio" }],
      yes: (c) => chooseWarm(c, "bike", true),
      no: (c) => chooseWarm(c, "treadmill", true),
      help: (c) => chooseWarm(c, "bike", true) },
    { id: "machine", when: (c) => !!c.s.warm, done: (c) => !!c.s.machineOk,
      ask: (c) => {
        if (c.s.machineAsked) { c.say("machine_nudge"); return; }
        c.s.machineAsked = true;
        if (!c.s.warmedSaid) { c.s.warmedSaid = true; c.say("warmed_up"); }
        const X = exercise(c);
        if (c.s.outOfOrder) {
          c.twist("out_of_order");
          c.say("machine_next", { X }); c.say("out_of_order"); c.say("other_towel");
          c.expect(brokenPending());
          return;
        }
        c.say("machine_intro", { X });
      },
      expects: ["machine_free_q", "machine_free_ctx", "machine_taken", "broken_q"],
      suggest: [{ lt: "Paklausti, ar treniruoklis laisvas", hint: "machine" }],
      yes: (c) => machineOk(c, false),
      no: (c) => machineOk(c, false),
      help: (c) => machineOk(c, false) },
    { id: "sets", when: (c) => !!c.s.machineOk, done: (c) => !!c.s.setsDone,
      ask: (c) => {
        if (c.s.explained) { c.say("any_other"); return; }
        c.s.explained = true;
        c.say(exercise(c) === "leg_press" ? "sets_explain_leg" : "sets_explain_chest");
        c.say("any_questions");
      },
      expects: ["ask_sets", "sets_ctx", "ask_weight", "ask_rest", "ask_how", "check_ok", "ready"],
      suggest: [{ lt: "Paklausti, kiek serijų daryti", hint: "sets" }],
      yes: (c) => { c.say("ask_away"); c.hold(); },
      no: (c) => startSets(c),
      help: (c) => startSets(c) },
    // "One more rep!" and "Whoa, are you okay?" are pending questions set by startSets.
    { id: "spot", when: (c) => !!c.s.repDone, done: (c) => !!c.s.spotDone,
      ask: (c) => {
        if (c.s.spotAsked) { c.say("spot_ready"); return; }
        c.s.spotAsked = true;
        c.say(c.s.pain ? "spot_intro_now" : "spot_intro");
        if (c.s.pain) c.say("bar_only");
        // "Can you spot me?" was asked earlier: Jordan spots without being asked again
        if (c.s.spotAgreed) spotGo(c, false);
      },
      expects: ["spot_q", "no_spot", "ask_weight", "ready"],
      suggest: [{ lt: "Paprašyti trenerės padrausti", hint: "spot" }],
      yes: (c) => spotGo(c, false),
      no: (c) => spotGo(c, false),
      help: (c) => spotGo(c, false) },
    { id: "breath", when: (c) => !!c.s.spotDone, done: (c) => !!c.s.breathDone,
      ask: (c) => {
        // after the stretches Jordan only asks how it feels; otherwise one last (easy) minute first
        if (c.s.stretched) c.say("feel_now_q");
        else { c.say(c.s.pain ? "finisher_easy" : "finisher"); c.say("time_feel"); }
        c.expect(breathPending(c));
      },
      expects: ["out_breath", "tired", "feel_good", "not_tired", "water_q"],
      suggest: [{ lt: "Pasakyti, kaip jautiesi", hint: "breath" }] },
    { id: "next", when: (c) => !!c.s.breathDone, done: (c) => !!c.s.next,
      ask: (c) => {
        // the learner already proposed a day ("Same time tomorrow?" during the workout)
        if (c.s.nextPref && !c.s.nextAsked) { c.s.nextAsked = true; c.say("great_workout"); nextDay(c, c.s.nextPref); return; }
        const again = !!c.s.nextAsked;
        c.s.nextAsked = true;
        if (c.s.nextAsk === "same") c.say(again ? "same_time_short" : "same_time_q");
        else { if (!again) c.say("great_workout"); c.say("when_short"); }
      },
      expects: ["next_same", "next_day", "next_no", "day_no", "next_later", "later_ctx", "next_time_q", "when_ctx", "see_you_ctx"],
      suggest: [{ lt: "Susitarti dėl kitos treniruotės", hint: "next", options: "weekday" }],
      yes: (c) => {
        if (c.s.nextAsk === "same") { setNext(c, "tomorrow"); return; }
        c.s.nextAsk = "same"; c.say("same_time_short"); c.hold();
      },
      no: (c) => offerThursday(c),
      help: (c) => { c.s.nextAsk = "same"; c.say("same_time_short"); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.25);
    c.s.firstQ = c.chance(0.5);
    c.s.trainerNote = c.chance(0.5);
    c.s.askId = c.chance(0.4);
    c.s.askPayMethod = c.chance(0.5);
    c.s.askLock = c.chance(0.5);
    c.s.tellTowels = c.chance(0.5);
    c.s.askFeel = c.chance(0.5);
    c.s.restTip = c.chance(0.4);
    c.s.nextAsk = c.chance(0.65) ? "same" : "when";
    // twists (never on the first visit)
    c.s.outOfOrder = c.visits >= 1 && c.chance(0.35);
    c.s.painTwist = c.visits >= 1 && !c.s.outOfOrder && c.chance(0.45);
  },

  start: (c) => {
    if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
    c.say(c.s.firstQ ? "greet_first" : "greet_help");
    c.hold();
  },

  handlers: {
    // --- arriving
    im_new(c) { if (!c.s.introduced) introduce(c); },
    not_new(c) {
      if (c.s.introduced) { c.say("ack"); return; }
      c.s.notFirst = true; c.say("welcome_back"); c.hold();
    },
    want_join(c) {
      // "The membership, please" while Jordan offers the two options
      if (c.step === "plan" && !c.s.plan && /\bmembership\b/i.test(c.heard)) { choosePlan(c, "monthly"); return; }
      if (!c.s.introduced) introduce(c);
    },
    ask_trial(c) { c.say("trial_info"); c.s.freeSaid = true; if (!c.s.introduced) c.s.introduced = true; },
    nice_meet(c) { c.say("nice_meet"); },

    // --- the membership
    choose_plan(c, slots, seg) {
      const tags = allTags(slots, seg);
      const plan = (slots.plan as string | undefined) ?? (tags.includes("day") ? "day_pass" : tags.includes("monthly") ? "monthly" : undefined);
      if (!plan) { c.say("plan_which2"); c.hold(); return; }
      choosePlan(c, plan);
    },
    plan_no(c, slots, seg) {
      if (c.s.paid) { c.say("ack"); return; }
      const tags = allTags(slots, seg);
      c.s.introduced = true;
      if (tags.includes("both")) { refusePlan(c, "monthly"); refusePlan(c, "day_pass"); return; }
      const which = (slots.plan as string | undefined) ?? (tags.includes("monthly") ? "monthly" : tags.includes("day") ? "day_pass"
        : tags.includes("either") ? (c.s.offered as string | undefined) : undefined);
      if (!which) { c.say("plan_think"); c.hold(); return; }
      refusePlan(c, which);
    },
    change_mind(c) {
      // "I changed my mind. A day pass, please.": the plan in the same sentence answers it
      if (c.s.paid || /\b(month|monthly|day|pass)\b/i.test(c.heard)) { if (c.s.paid) c.say("ack"); return; }
      c.say("plan_which2"); c.hold();
    },
    ask_price(c, slots) {
      const plan = (slots.plan as string | undefined) ?? (/\b(day|today|visit)\b/i.test(c.heard) ? "day_pass" : /\bmonth/i.test(c.heard) ? "monthly" : c.s.plan);
      if (plan === "monthly") c.say("price_monthly", { price: 3500 });
      else if (plan === "day_pass") c.say("price_day", { price: 1000 });
      else { c.s.optionsSaid = true; c.say("plan_offer"); }
      if (!c.s.introduced) c.s.introduced = true;
      if (c.step === "pay") c.hold();
    },
    ask_included(c, slots) {
      if (/\b(trainer|session|personal)\b/i.test(c.heard)) { c.say("trial_info"); c.s.freeSaid = true; return; }
      const plan = (slots.plan as string | undefined) ?? (/\b(day|today)\b/i.test(c.heard) ? "day_pass" : c.s.plan ?? "monthly");
      c.say(plan === "day_pass" ? "included_day" : "included_monthly");
    },
    ask_fee(c) { c.say("no_fee"); },
    ask_cancel(c) { c.say("cancel_info"); },
    ask_hours(c) { c.say("hours_info"); },
    ask_have(c, slots) {
      switch (slots.amenity) {
        case "showers": c.say("showers_info"); break;
        case "sauna": c.say("sauna_info"); break;
        case "pool": c.say("pool_info"); break;
        case "towels": c.say("towels_info"); break;
        case "lockers": tellLockers(c); break;
        case "parking": c.say("parking_info"); break;
        case "classes": c.say("classes_info"); break;
        case "wifi": c.say("wifi_info"); break;
        case "water": c.say("water_info"); break;
        case "trainer": c.say("trainer_info"); break;
        default: c.say("have_yes");
      }
    },
    ask_have_unknown(c) { c.say("have_no"); },
    ask_discount(c) { c.say("no_discount"); },
    ask_jordan(c) { c.say(/\bevery day\b/i.test(c.heard) ? "jordan_every_day" : /\b(trainer|coach)\b/i.test(c.heard) && /\bare you\b/i.test(c.heard) ? "trainer_info" : "jordan_years"); },

    // --- the form and paying
    here_you_go(c) {
      if (c.s.plan && !c.s.signed) { sign(c); return; }
      // handing over a card or the money: just thanks (the café does the same)
      if (c.s.signed && !c.s.paid) { pay(c, (c.s.payMethod as string | undefined) ?? "cash", true); return; }
      c.say("ack");
    },
    form_done(c) { if (c.s.plan && !c.s.signed) sign(c); else c.say("ack"); },
    sign_q(c) {
      c.say("sign_where");
      if (c.s.plan && !c.s.signed) { c.s.signed = true; c.event("sign"); }
    },
    pen_q(c) { c.say("pen_here"); if (c.step === "form") c.hold(); },
    form_what(c) { c.say("form_is"); },
    pay_card(c) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.signed) { c.s.payMethod = "card"; c.say("card_later"); return; }
      pay(c, "card");
    },
    no_cash(c, slots, seg) { gym.handlers.pay_card(c, slots, seg); },
    pay_cash(c) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.signed) { c.s.payMethod = "cash"; c.say("cash_ok"); return; }
      pay(c, "cash");
    },
    no_card(c, slots, seg) { gym.handlers.pay_cash(c, slots, seg); },
    pay_phone(c) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.signed) { c.s.payMethod = "phone"; c.say("phone_ok"); return; }
      pay(c, "phone");
    },

    // --- the locker room
    lockers_q(c) { tellLockers(c); },
    im_back(c) { c.say("ack"); },
    change_no_ctx(c, slots, seg) { gym.handlers.change_no(c, slots, seg); },
    change_no(c) {
      if (c.step === "lockers" && !c.s.changeDone) { c.s.changeDone = true; c.say("lets_go"); return; }
      c.say("ack");
    },
    ready(c) {
      switch (c.step) {
        case "lockers": if (!c.s.changeDone) { c.s.changeDone = true; c.say("lets_go"); return; } break;
        case "warmup": if (!c.s.warm) { chooseWarm(c, "bike", true); return; } break;
        case "machine": if (!c.s.machineOk) { machineOk(c, false); return; } break;
        case "sets": if (!c.s.setsDone) { startSets(c); return; } break;
        case "spot": if (!c.s.spotDone) { spotGo(c, false); return; } break;
      }
      c.say("ack");
    },
    lock_have(c) { c.say("lock_yes"); },
    lock_none(c) { c.say("lock_buy"); },
    lock_borrow(c) { c.say("lock_borrow_ok"); },
    lock_need(c) { c.say("lock_need_info"); },
    towel_q(c) { c.say("towels_info"); },
    water_q(c) { c.say("water_info"); },
    restroom_q(c) { c.say("restroom_info"); },

    // --- the warm-up
    warm_choice(c, slots, seg) {
      const tags = allTags(slots, seg);
      const id = (slots.cardio as string | undefined) ?? (tags.includes("tread") ? "treadmill" : tags.includes("bike") ? "bike" : tags.includes("ellip") ? "elliptical" : undefined);
      if (!id) { c.say("warmup_which"); c.hold(); return; }
      if (c.s.warm) { c.say("ack"); return; }
      if (!warmupOpen(c)) { c.s.warmPref = id; c.say("ack"); return; }
      chooseWarm(c, id, false);
    },
    warm_not(c, slots, seg) {
      if (!warmupOpen(c) || c.s.warm) { c.say("ack"); return; }
      const tags = allTags(slots, seg);
      const no = (slots.cardio as string | undefined) ?? (tags.includes("tread") ? "treadmill" : tags.includes("bike") ? "bike" : "treadmill");
      chooseWarm(c, no === "bike" ? "treadmill" : "bike", true);
    },
    warm_any(c) { if (warmupOpen(c) && !c.s.warm) chooseWarm(c, "bike", true); else c.say("ack"); },
    recommend_q(c, slots, seg) {
      if (!c.s.plan) { c.s.introduced = true; c.say("plan_recommend"); return; }
      if (warmupOpen(c) && !c.s.warm) { gym.handlers.warm_any(c, slots, seg); return; }
      c.say("ack");
    },
    warm_q(c) {
      if (/\bfast\b/i.test(c.heard)) c.say("warm_how_fast");
      else if (/\bwhy\b/i.test(c.heard)) c.say("warm_why");
      else if (c.step === "sets" || c.step === "spot") c.say("rest_answer");
      else c.say("warm_how_long");
    },

    // --- how are you feeling (outside the questions that ask it)
    feel_good(c) { c.say("feel_good_reply"); },
    not_tired(c) { c.say("feel_good_reply"); },
    // before the workout ("I'm good, just a little tired." at the door): no "Take a break" yet
    tired(c) { c.say(c.s.warm ? "break_water" : "easy_today"); },
    out_breath(c) { c.say("break_water"); },

    // --- the machine
    machine_free_q(c) { if (c.s.warm && !c.s.machineOk) machineOk(c, true); else c.say("machine_ok"); },
    machine_free_ctx(c, slots, seg) { gym.handlers.machine_free_q(c, slots, seg); },
    machine_taken(c) { if (c.s.warm && !c.s.machineOk) machineOk(c, false); else c.say("ack"); },
    broken_q(c) { c.say(c.s.outOfOrder ? "broken_info" : "not_broken"); },

    // --- sets, reps, weight
    ask_sets(c) {
      if (c.s.machineOk && !c.s.setsDone) { startSets(c); return; }
      c.s.setsSaid = true;
      c.say("sets_answer");
    },
    sets_ctx(c, slots, seg) {
      if (/\bmuch\b/i.test(c.heard)) { gym.handlers.ask_weight(c, slots, seg); return; }
      gym.handlers.ask_sets(c, slots, seg);
    },
    ask_weight(c, _slots, seg) {
      c.say(c.step === "spot" || c.s.repDone ? "bar_weight" : "weight_machine");
      if (seg.tags.includes("kg")) c.say("kg_note");
    },
    ask_rest(c) { c.say("rest_answer"); },
    ask_how(c) { c.say(exercise(c) === "leg_press" ? "sets_explain_leg" : "sets_explain_chest"); },
    not_ready(c) { c.say("g_take_time"); c.hold(); },
    check_ok(c) {
      if (c.s.plan && !c.s.signed) { sign(c); return; }
      c.say(c.s.machineOk ? "how_right" : "ack");
    },
    rep_done_ctx(c) { repDone(c, false); },
    cant(c, slots, seg) {
      if (c.step === "next") { gym.handlers.next_no(c, slots, seg); return; }
      c.say("cant_general");
    },

    // --- pain
    pain(c, _slots, seg) { hurt(c, seg.tags); },
    pain_ctx(c, _slots, seg) { hurt(c, seg.tags); },
    no_pain(c) { c.say(c.s.painAsked ? "fine_reply" : "ack"); },

    // --- spotting
    spot_q(c) {
      if (c.step === "spot" && !c.s.spotDone) { spotGo(c, true); return; }
      c.s.spotAgreed = true;
      c.say("spot_yes");
    },
    no_spot(c) {
      if (c.step === "spot" && !c.s.spotDone) { c.s.spotDone = true; c.say("no_spot_reply"); c.say("bench_go"); return; }
      c.say("ack");
    },

    // --- next time
    next_same(c) { if (!c.s.breathDone) { c.s.nextPref = "tomorrow"; c.say("ack"); return; } setNext(c, "tomorrow"); },
    next_day(c, slots) { nextDay(c, slots.day ?? slots.weekday); },
    next_no(c) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      if (DAY_RE.test(c.heard)) return; // "I can't tomorrow. How about Friday?": the day answers it
      offerThursday(c);
    },
    next_later(c) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      bookLater(c);
    },
    later_ctx(c, slots, seg) { gym.handlers.next_later(c, slots, seg); },
    day_no(c) {
      if (!c.s.breathDone || c.s.next) { c.say("ack"); return; }
      bookLater(c);
    },
    next_time_q(c) { c.say("same_as_today"); },
    when_ctx(c, slots) { if (slots.day) nextDay(c, slots.day); else setNext(c, "tomorrow"); },
    see_you_ctx(c) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      if (c.s.nextAsk === "same") setNext(c, "tomorrow");
      else { c.s.next = "soon"; c.say("see_then"); }
    },
  },

  finish: (c) => {
    c.complete();
    c.remember({ lastPlan: c.s.plan, next: c.s.next });
    c.event("serve", { workout: true });
    c.say("closing");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        next_same: (cc) => { cc.say("g_bye"); cc.end(); },
        next_day: (cc) => { cc.say("g_bye"); cc.end(); },
        see_you_ctx: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns
    { say: "Hi, I'm new here!", intent: "im_new", step: "new" },
    { say: "It's my first time here.", intent: "im_new", step: "new" },
    { say: "I'd like to sign up.", intent: "want_join", step: "new" },
    { say: "I'd like to become a member.", intent: "want_join", step: "new" },
    { say: "How do I sign up?", intent: "want_join", step: "new" },
    { say: "I'll take the monthly membership.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "I'd like a day pass, please.", intent: "choose_plan", step: "plan", slots: { plan: "day_pass" } },
    { say: "A monthly membership, please.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "Just for today, please.", intent: "choose_plan", step: "plan" },
    { say: "How much is a monthly membership?", intent: "ask_price", slots: { plan: "monthly" } },
    { say: "What's included?", intent: "ask_included" },
    { say: "Is there a sign-up fee?", intent: "ask_fee" },
    { say: "Can I cancel anytime?", intent: "ask_cancel" },
    { say: "What are your hours?", intent: "ask_hours" },
    { say: "Do you have showers?", intent: "ask_have", slots: { amenity: "showers" } },
    { say: "Do you have classes?", intent: "ask_have", slots: { amenity: "classes" } },
    { say: "Here you go.", intent: "here_you_go", step: "form" },
    { say: "Okay, all done.", intent: "form_done", step: "form" },
    { say: "Where do I sign?", intent: "sign_q", step: "form" },
    { say: "Can I borrow a pen?", intent: "pen_q", step: "form" },
    { say: "What is this form?", intent: "form_what", step: "form" },
    { say: "Card, please.", intent: "pay_card", step: "pay" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "I'll pay in cash.", intent: "pay_cash", step: "pay" },
    { say: "Can I pay with my phone?", intent: "pay_phone", step: "pay" },
    { say: "Where are the lockers?", intent: "lockers_q", step: "lockers" },
    { say: "Where can I change?", intent: "lockers_q", step: "lockers" },
    { say: "Where can I leave my bag?", intent: "lockers_q" },
    { say: "Do you have towels?", intent: "ask_have", slots: { amenity: "towels" } },
    { say: "Where's the water fountain?", intent: "water_q" },
    { say: "No, I'm ready!", intent: "ready", step: "lockers" },
    { say: "The bike, please.", intent: "warm_choice", step: "warmup", slots: { cardio: "bike" } },
    { say: "I'll take the treadmill.", intent: "warm_choice", step: "warmup", slots: { cardio: "treadmill" } },
    { say: "I prefer the elliptical.", intent: "warm_choice", step: "warmup", slots: { cardio: "elliptical" } },
    { say: "For how long?", intent: "warm_q", step: "warmup" },
    { say: "I feel great!", intent: "feel_good" },
    { say: "I'm warm now.", intent: "feel_good" },
    { say: "A little tired.", intent: "tired" },
    { say: "Is this machine free?", intent: "machine_free_q", step: "machine" },
    { say: "Is anyone using this?", intent: "machine_free_q", step: "machine" },
    { say: "Excuse me, are you using this?", intent: "machine_free_q", step: "machine" },
    { say: "Can I use this machine?", intent: "machine_free_q", step: "machine" },
    { say: "What's wrong with it?", intent: "broken_q", step: "machine" },
    { say: "How many sets should I do?", intent: "ask_sets", step: "sets" },
    { say: "How many reps?", intent: "ask_sets", step: "sets" },
    { say: "How much weight should I use?", intent: "ask_weight", step: "sets" },
    { say: "How long should I rest?", intent: "ask_rest", step: "sets" },
    { say: "How does this machine work?", intent: "ask_how", step: "sets" },
    { say: "I'm ready!", intent: "ready", step: "sets" },
    { say: "My knee hurts.", intent: "pain" },
    { say: "My back hurts a little.", intent: "pain" },
    { say: "I'm fine, thanks.", intent: "feel_good" },
    { say: "Can you spot me?", intent: "spot_q", step: "spot" },
    { say: "Can you stay close?", intent: "spot_q", step: "spot" },
    { say: "How much does the bar weigh?", intent: "ask_weight", step: "spot" },
    { say: "I'm out of breath!", intent: "out_breath", step: "breath" },
    { say: "I need a break.", intent: "tired", step: "breath" },
    { say: "Can I get some water?", intent: "water_q", step: "breath" },
    { say: "Same time tomorrow?", intent: "next_same", step: "next" },
    { say: "Sure! See you tomorrow!", intent: "next_same", step: "next" },
    { say: "I can't tomorrow.", intent: "next_no", step: "next" },
    { say: "How about Thursday?", intent: "next_day", step: "next", slots: { day: "thursday" } },
    { say: "See you Friday!", intent: "next_day", step: "next", slots: { weekday: "friday" } },
    // natural alternatives and short answers
    { say: "First time here.", intent: "im_new", step: "new" },
    { say: "New here", intent: "im_new", step: "new" },
    { say: "I've never been here before.", intent: "im_new", step: "new" },
    { say: "I'm interested in a membership.", intent: "want_join", step: "new" },
    { say: "Can I try it first?", intent: "ask_trial" },
    { say: "Monthly", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "The day pass", intent: "choose_plan", step: "plan", slots: { plan: "day_pass" } },
    { say: "The monthly one sounds good", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "I'm going to come every day", intent: "choose_plan", step: "plan" },
    { say: "I just want to try it today", intent: "choose_plan", step: "plan" },
    { say: "The cheaper one", intent: "choose_plan", step: "plan" },
    { say: "How much is it a month?", intent: "ask_price" },
    { say: "Is there a contract?", intent: "ask_cancel" },
    { say: "Are you open on weekends?", intent: "ask_hours" },
    { say: "Is there a pool?", intent: "ask_have", slots: { amenity: "pool" } },
    { say: "Do you have a sauna?", intent: "ask_have", slots: { amenity: "sauna" } },
    { say: "Done.", intent: "form_done", step: "form" },
    { say: "Here's my driver's license.", intent: "here_you_go", step: "form" },
    { say: "Cash", intent: "pay_cash", step: "pay" },
    { say: "Do you take Apple Pay?", intent: "pay_phone", step: "pay" },
    { say: "Yes, where are the lockers?", intent: "lockers_q", step: "lockers" },
    { say: "I'm already dressed.", intent: "change_no", step: "lockers" },
    { say: "Treadmill", intent: "warm_choice", step: "warmup", slots: { cardio: "treadmill" } },
    { say: "I'll walk on the treadmill.", intent: "warm_choice", step: "warmup" },
    { say: "Either one is fine.", intent: "warm_any", step: "warmup" },
    { say: "Is it free?", intent: "machine_free_ctx", step: "machine" },
    { say: "Are you done with this machine?", intent: "machine_free_q", step: "machine" },
    { say: "How many?", intent: "sets_ctx", step: "sets" },
    { say: "Am I doing it right?", intent: "check_ok", step: "sets" },
    { say: "Spot me, please.", intent: "spot_q", step: "spot" },
    { say: "I'm so tired!", intent: "tired", step: "breath" },
    { say: "I can't breathe!", intent: "out_breath", step: "breath" },
    { say: "Tomorrow is good.", intent: "next_same", step: "next" },
    { say: "Can we do Thursday instead?", intent: "next_day", step: "next", slots: { day: "thursday" } },
    { say: "Thursday", intent: "when_ctx", step: "next", slots: { day: "thursday" } },
    { say: "I'll let you know.", intent: "next_later", step: "next" },
    { say: "What time?", intent: "next_time_q", step: "next" },
    { say: "Nice to meet you, Jordan!", intent: "nice_meet" },
    // British variants
    { say: "Where's the changing room?", intent: "lockers_q", step: "lockers" },
    { say: "I'll take the cross trainer.", intent: "warm_choice", step: "warmup" },
    { say: "The running machine, please.", intent: "warm_choice", step: "warmup" },
    { say: "How many kilos is it?", intent: "ask_weight", step: "sets" },
    { say: "Where's the toilet?", intent: "restroom_q" },
    { say: "Is there a car park?", intent: "ask_have", slots: { amenity: "parking" } },
    // learner English
    { say: "I am new in this gym", intent: "im_new", step: "new" },
    { say: "I want monthly", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "How many sets I should do?", intent: "ask_sets", step: "sets" },
    { say: "Where are lockers?", intent: "lockers_q", step: "lockers" },
    { say: "My knee is hurting", intent: "pain" },
    // negation and meaning preservation
    { say: "I'm not new here.", intent: "not_new", step: "new", not: ["im_new"] },
    { say: "I don't want to join.", intent: "plan_no", not: ["want_join"] },
    { say: "I don't want a monthly membership.", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "Not the day pass.", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "No membership, thanks.", intent: "plan_no", step: "plan", not: ["choose_plan", "want_join"] },
    { say: "I don't have a lock.", intent: "lock_none", not: ["lock_have"] },
    { say: "I didn't bring a lock.", intent: "lock_none", not: ["lock_have"] },
    { say: "I don't want the treadmill.", intent: "warm_not", step: "warmup", not: ["warm_choice"] },
    { say: "I don't like running.", intent: "warm_not", step: "warmup", not: ["warm_choice"] },
    { say: "It's not free.", intent: "machine_taken", step: "machine", not: ["machine_free_q", "machine_free_ctx"] },
    { say: "My knee doesn't hurt.", intent: "no_pain", not: ["pain"] },
    { say: "Nothing hurts.", intent: "no_pain", not: ["pain"] },
    { say: "I'm not out of breath.", intent: "not_tired", step: "breath", not: ["out_breath"] },
    { say: "I'm not tired.", intent: "not_tired", step: "breath", not: ["tired"] },
    { say: "I don't need a break.", intent: "not_tired", step: "breath", not: ["tired"] },
    { say: "I don't need a spot.", intent: "no_spot", step: "spot", not: ["spot_q"] },
    { say: "I can't do it!", intent: "cant", not: ["rep_done_ctx"] },
    { say: "Tomorrow doesn't work for me.", intent: "next_no", step: "next", not: ["next_same"] },
    { say: "Not tomorrow.", intent: "next_no", step: "next", not: ["next_same"] },
    { say: "I don't have cash.", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "I don't have a card.", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "No, I don't want to change.", intent: "change_no", step: "lockers", not: ["lockers_q"] },
    // more learner English (probes, 27 Sep)
    { say: "Hello! Is it possible to join today?", intent: "want_join", step: "new" },
    { say: "No, I was here once", intent: "not_new", step: "new", not: ["im_new"] },
    { say: "I think I take the monthly", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "For one month, please", intent: "choose_plan", step: "plan" },
    { say: "Do you have a student discount?", intent: "ask_discount", step: "plan" },
    { say: "Which one is cheaper?", intent: "recommend_q", step: "plan" },
    { say: "I'll think about it", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "Do I need to sign here?", intent: "sign_q", step: "form" },
    { say: "Is this okay?", intent: "check_ok", step: "form" },
    { say: "By credit card", intent: "pay_card", step: "pay", not: ["g_bye"] },
    { say: "With my credit card, please", intent: "pay_card", step: "pay" },
    { say: "Is there a place for my bag?", intent: "lockers_q", step: "lockers" },
    { say: "Do I need a lock?", intent: "lock_need", step: "lockers" },
    { say: "Can I walk?", intent: "warm_choice", step: "warmup" },
    { say: "Is this machine busy?", intent: "machine_free_q", step: "machine" },
    { say: "Is fifty pounds heavy?", intent: "ask_weight", step: "sets" },
    { say: "I can't anymore", intent: "cant", not: ["rep_done_ctx"] },
    { say: "A little pain in my knee", intent: "pain" },
    { say: "Can you hold it?", intent: "spot_q", step: "spot" },
    { say: "I'm sweating a lot", intent: "tired", step: "breath" },
    { say: "Can I come tomorrow at seven?", intent: "next_same", step: "next" },
    { say: "Nobody is using it", intent: "machine_free_q", step: "machine", not: ["machine_taken"] },
    { say: "Don't spot me", intent: "no_spot", step: "spot", not: ["spot_q"] },
    { say: "My knee doesn't hurt anymore", intent: "no_pain", not: ["pain"] },
    { say: "No water, thanks", intent: "not_tired", step: "breath", not: ["water_q"] },
    { say: "I'm not free tomorrow", intent: "next_no", step: "next", not: ["next_same"] },
    { say: "Thursday doesn't work for me", intent: "day_no", step: "next", not: ["next_day", "when_ctx"], slots: { weekday: "thursday" } },
    { say: "I can't pay by card", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "I'm not ready yet", intent: "not_ready", step: "sets", not: ["ready"] },
    // review 27 Sep: changing your mind, refusing both, back from the locker room, pain
    { say: "Actually, I'll take a day pass instead.", intent: "choose_plan", slots: { plan: "day_pass" } },
    { say: "Sorry, I changed my mind. A day pass, please.", intent: "choose_plan", slots: { plan: "day_pass" } },
    { say: "Can I change to a day pass?", intent: "choose_plan", slots: { plan: "day_pass" } },
    { say: "On second thought, the day pass.", intent: "choose_plan", slots: { plan: "day_pass" } },
    { say: "Not the monthly, the day pass.", intent: "choose_plan", slots: { plan: "day_pass" }, not: ["plan_no"] },
    { say: "Can I get the monthly membership instead?", intent: "choose_plan", slots: { plan: "monthly" } },
    { say: "I changed my mind.", intent: "change_mind", step: "form" },
    { say: "No, I don't want a day pass either.", intent: "plan_no", step: "plan", slots: { plan: "day_pass" }, not: ["choose_plan"] },
    { say: "No, I don't want that either.", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "I'm back!", intent: "im_back" },
    { say: "Ouch, my knee hurts!", intent: "pain" },
    { say: "My knee still hurts.", intent: "pain", not: ["no_pain"] },
    { say: "Much better, thanks.", intent: "feel_good", step: "breath" },
    // "Whoa, are you okay?" – just tired (27 Sep sims): tired, never "fine"; and the negation stays
    { say: "I'm okay, just a little tired.", intent: "tired", not: ["feel_good"] },
    { say: "Yes, just tired.", intent: "tired" },
    { say: "I'm fine, not tired.", intent: "feel_good", not: ["tired"] },
    { say: "I'm good, I'm not tired at all.", intent: "feel_good", not: ["tired"] },
    // unrelated
    { say: "banana treadmill purple singing", intent: "none" },
    { say: "the weather is nice on the moon", intent: "none" },
    { say: "Mikalauskas", intent: "none" },
  ],

  sims: [
    // Optional moments pinned with `setup` where a scripted turn needs them one way: "How do you feel?" after the
    // warm-up (askFeel; the next turn is often "Is this machine free?", a question that never waits) and the pain
    // twist after the leg press (painTwist). The twist sims force their twist on every seed.
    { name: "new member: monthly, card, the full first workout", turns: ["Hi, I'm new here!", "I'll take the monthly membership.", "Here you go.", "Card, please.",
      "Yes. Where are the lockers?", "The bike, please.", "Is this machine free?", "How many sets should I do?", "Done!", "Can you spot me?", "I'm out of breath!",
      "Sure! See you tomorrow!", "Thanks, bye!"], expect: { complete: true }, auto: AUTO,
      // the whole workout as planned: no pain twist after the leg press
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "short answers: day pass, cash", turns: ["First time here.", "A day pass.", "Done.", "Cash.", "No, I'm ready.", "Treadmill.", "Great!", "Is it free?", "How many?", "Ten!",
      "Spot me, please.", "I'm so tired!", "Yes.", "Yes."], expect: { complete: true }, auto: AUTO,
      // "How do you feel?" after the warm-up on every seed (a short "Great!"), and no pain twist
      setup: (s) => { s.askFeel = true; s.painTwist = false; } },
    { name: "questions first, then Thursday", turns: ["Hello! How much is a membership?", "Is there a sign-up fee?", "Can I cancel anytime?", "Do you have showers?",
      "I'd like a monthly membership, please.", "What is this form?", "Where do I sign?", "Can I pay by card?", "What are your hours?", "Where can I change?", "Do you have a pool?",
      "I'll take the treadmill.", "Is anyone using this?", "How much weight should I use?", "How many sets should I do?", "I can't!", "How much does the bar weigh?",
      "Can you spot me?", "I need a break.", "Can we do Thursday?", "Thank you!"], expect: { complete: true }, auto: AUTO,
      // "How much does the bar weigh?" and "Can you spot me?" are for the bench press: no pain twist before it
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "no monthly, no running, can't, back hurts, not tomorrow", turns: ["Hi! I'd like to join.", "I don't want a monthly membership.", "Yes, please.", "Okay, all done.",
      "Here you go.", "No, I'm already dressed.", "I don't like running.", "Are you using this?", "I'm ready.", "My back hurts.", "Okay.", "Much better, thanks.",
      "I can't tomorrow.", "Yes, Thursday is fine.", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "British words, kilos, no spot", turns: ["Hi! It's my first time here.", "What's included?", "The monthly one, please.", "Can I borrow a pen?", "Here you go.",
      "I'll pay in cash.", "Where's the changing room?", "I'll take the cross trainer.", "Excuse me, is this machine free?", "How many kilos is it?",
      "How many sets should I do?", "Okay, one more!", "I don't need a spot.", "I'm out of breath!", "Same time tomorrow?", "Thanks!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "how are you, then not okay: the knee; I'll call you", turns: ["Good, thanks. And you?", "I'm new here. How do I sign up?", "Just for today, please.", "Where do I sign?",
      "Can I pay with my phone?", "Do you have towels?", "Yes, please.", "Either one is fine.", "A little tired.", "Are you using this?", "No questions.", "Phew! That was hard!",
      "No, not really.", "My knee.", "Could you spot me, please?", "I'm dying!", "I'm not sure yet. I'll call you.", "Thank you so much!"],
      expect: { complete: true }, auto: AUTO,
      // the twist on every seed: "How's it going?" first, "How do you feel?" after the warm-up and "Whoa, are you okay?" after the leg press
      setup: (s) => { s.hay = true; s.askFeel = true; s.outOfOrder = false; s.painTwist = true; } },
    // review 27 Sep: change of plan, the locker-room pause, "Ouch, my knee hurts!" (arms instead, then the light bench press)
    { name: "day pass instead, lockers pause, knee: arms instead", turns: ["Hi, I'm new here!", "The monthly membership, please.", "Actually, I'll take a day pass instead.",
      "Here you go.", "Cash.", "Where are the lockers?", "I'm back!", "The bike, please.", "Is this machine free?", "How many sets?", "Ouch, my knee hurts!",
      "Can you spot me?", "I'm out of breath!", "See you tomorrow!", "Thanks!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    // review 27 Sep: both options refused, then the day pass; back pain on the bench: stretching, then "How do you feel now?"
    { name: "neither, then the day pass; back hurts on the bench", turns: ["Hi, I'm new here!", "No thanks, I don't want a membership.", "No, I don't want a day pass either.",
      "On second thought, the day pass.", "Done.", "Card.", "No, I'm ready.", "Treadmill.", "Is it free?", "How many?", "Ten!", "My back hurts a little.", "Okay.", "Much better, thanks.",
      "Same time tomorrow?", "Bye!"], expect: { complete: true }, auto: AUTO,
      // the back hurts on the bench, not at "Whoa, are you okay?" after the leg press
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    // twist on every seed: the leg press is out of order, so the learner asks what happened and whether the other one is free
    { name: "twist: the leg press is out of order", turns: ["Hi! It's my first time here.", "A day pass, please.", "Here you go.", "Card.", "No, I'm ready.",
      "The bike, please.", "What's wrong with it?", "Is the other one free?", "How many sets should I do?", "Done!", "Can you spot me?", "I'm out of breath!",
      "See you tomorrow!", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.outOfOrder = true; s.painTwist = false; } },
    // twist on every seed: "Whoa, are you okay?" after the leg press, and the learner is just tired (the workout goes on)
    { name: "twist: are you okay? just tired", turns: ["Hello! I'd like to become a member.", "The monthly membership, please.", "Here you go.", "Can I pay with my phone?",
      "No, I'm already dressed.", "The treadmill, please.", "Is this machine free?", "I'm ready.", "Done!", "I'm okay, just a little tired.", "Can you spot me?",
      "I need a break.", "Same time tomorrow?", "Thanks, bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.outOfOrder = false; s.painTwist = true; } },
  ],
};

// ---------------------------------------------------------------------------
// Flow helpers

function introduce(c: Ctx) {
  c.s.introduced = true;
  if (!c.s.jordanSaid) { c.s.jordanSaid = true; c.say("intro_jordan"); }
}

function choosePlan(c: Ctx, plan: string) {
  if (c.s.paid) { c.say("ack"); return; }
  const first = !c.s.plan;
  // changing one's mind ("Actually, a day pass instead"): fine before paying
  if (!first && c.s.plan !== plan) c.say("no_problem");
  c.s.plan = plan;
  c.s.introduced = true;
  c.s.refused = ((c.s.refused as string[] | undefined) ?? []).filter((x) => x !== plan);
  c.say(plan === "monthly" ? "plan_ok_monthly" : "plan_ok_day");
  if (first && !c.s.freeSaid) { c.s.freeSaid = true; c.say("free_session"); }
}

/** "I don't want the monthly membership": Jordan offers the other option; when both are refused she leaves it open. */
function refusePlan(c: Ctx, which: string) {
  const refused: string[] = c.s.refused ?? (c.s.refused = []);
  if (!refused.includes(which)) refused.push(which);
  if (c.s.plan === which) c.s.plan = undefined;
  const other = which === "monthly" ? "day_pass" : "monthly";
  if (refused.includes(other)) {
    if (!firstThisTurn(c, "both_no")) return;
    c.say("both_no"); c.hold(); return;
  }
  c.s.offered = other;
  c.say(which === "monthly" ? "plan_alt_day" : "plan_alt_monthly");
  c.expect({ id: "alt_plan", optional: true, expects: ["choose_plan", "plan_no"], hints: ["plan", "g_yesno"],
    suggest: [{ lt: "Sutikti arba pasirinkti kitą narystę", hint: "plan", options: "plan" }],
    on: { choose_plan: (cc, sl, sg) => { gym.handlers.choose_plan(cc, sl, sg); } },
    yes: (cc) => choosePlan(cc, other),
    // "No." to the other option too
    no: (cc) => refusePlan(cc, other),
    ask: (cc) => cc.say(which === "monthly" ? "plan_alt_day" : "plan_alt_monthly") });
}

function sign(c: Ctx) {
  if (c.s.signed) return;
  c.s.signed = true;
  c.event("sign");
  c.say("form_ok");
}

function pay(c: Ctx, method: string, handed = false) {
  c.s.paid = true;
  c.s.payMethod = method;
  c.event("pay", { method, amount: planPrice(c) });
  c.say(handed ? "paid" : method === "card" ? "card_tap" : method === "phone" ? "phone_ok" : "paid");
  if (c.s.plan === "monthly") { c.say("member_card"); c.event("give", { item: "membership_card" }); }
  else { c.say("wristband"); c.event("give", { item: "wristband" }); }
}

function tellLockers(c: Ctx) {
  c.say("lockers_info");
  const first = !c.s.lockersDone;
  c.s.lockersDone = true;
  if (first && c.s.askLock && !c.s.lockAsked) {
    c.s.lockAsked = true;
    c.say("bring_lock");
    c.expect(lockPending());
    return;
  }
  afterLockers(c);
}

function afterLockers(c: Ctx) {
  if (c.s.tellTowels && !c.s.towelsSaid) { c.s.towelsSaid = true; c.say("towels_water_tip"); }
  // after paying, before the warm-up: the learner goes to change, Jordan waits, and the warm-up starts when they are back
  if (c.s.paid && !c.s.warm) {
    c.s.changeDone = true;
    c.say("see_you_back");
    c.expect(changingPending());
  }
}

function changingPending(): Pending {
  const back = () => { /* back from the locker room: the warm-up follows */ };
  return { id: "changing", optional: true, expects: ["im_back", "ready"], hints: ["changed"],
    suggest: [{ lt: "Pasakyti, kad grįžai", hint: "changed" }],
    on: { im_back: back, ready: back, g_ok: back, g_thanks: back, g_bye: back, g_hello: back },
    yes: back, no: back };
}

function lockPending(): Pending {
  return { id: "lock_q", optional: true, expects: ["lock_have", "lock_none", "lock_borrow", "lock_need"], hints: ["lock"],
    suggest: [{ lt: "Atsakyti, ar turi spynelę", hint: "lock" }],
    on: {
      lock_have: (cc) => { cc.say("lock_yes"); afterLockers(cc); },
      lock_none: (cc) => { cc.say("lock_buy"); afterLockers(cc); },
      lock_borrow: (cc) => { cc.say("lock_borrow_ok"); afterLockers(cc); },
      lock_need: (cc) => { cc.say("lock_need_info"); afterLockers(cc); },
    },
    yes: (cc) => { cc.say("lock_yes"); afterLockers(cc); },
    no: (cc) => { cc.say("lock_buy"); afterLockers(cc); },
    ask: (cc) => cc.say("bring_lock") };
}

function chooseWarm(c: Ctx, id: string, jordanPicks: boolean) {
  c.s.warm = id;
  if (jordanPicks) c.say(id === "bike" ? "warm_pick_bike" : "warm_pick_tread");
  else if (id === "elliptical") c.say("warm_other_ok");
  c.say("warm_ok");
  if (c.s.askFeel && !c.s.feelAsked) {
    c.s.feelAsked = true;
    c.s.warmedSaid = true;
    c.say("warmed_up");
    c.say("feel_q");
    c.expect(feelPending());
  }
}

function feelPending(): Pending {
  const good = (cc: Ctx) => { cc.say("feel_good_reply"); };
  const tiredR = (cc: Ctx) => { cc.say("feel_tired_reply"); };
  return { id: "feel_q", optional: true, expects: ["feel_good", "tired", "out_breath", "not_tired"], hints: ["feel"],
    suggest: [{ lt: "Pasakyti, kaip jautiesi", hint: "feel" }],
    on: { feel_good: good, not_tired: good, g_ok: good, g_howareyou_answer: good, tired: tiredR, out_breath: tiredR, g_howareyou_bad: tiredR },
    yes: good, no: tiredR, ask: (cc) => cc.say("feel_q") };
}

function brokenPending(): Pending {
  return { id: "broken", expects: ["machine_free_q", "machine_free_ctx", "machine_taken", "broken_q"], hints: ["machine", "broken"],
    suggest: [{ lt: "Paklausti, ar kitas treniruoklis laisvas", hint: "machine" }, { lt: "Paklausti, kas nutiko", hint: "broken" }],
    on: {
      machine_free_q: (cc) => { machineOk(cc, true); },
      machine_free_ctx: (cc) => { machineOk(cc, true); },
      machine_taken: (cc) => { machineOk(cc, false); },
      broken_q: (cc) => { cc.say("broken_info"); cc.say("machine_nudge_other"); cc.expect(brokenPending()); },
    },
    yes: (cc) => machineOk(cc, false),
    no: (cc) => machineOk(cc, false),
    ask: (cc) => cc.say("machine_nudge_other") };
}

function machineOk(c: Ctx, asked: boolean) {
  if (c.s.machineOk) { c.say("machine_ok"); return; }
  c.s.machineOk = true;
  // "He's done" only fits once Jordan has pointed at the machine (with a towel or a bottle on it)
  c.say(asked && c.s.machineAsked ? "machine_ok_asked" : "machine_ok");
  // asked about a machine before Jordan pointed at one: she names it
  if (!c.s.machineAsked) { c.s.machineAsked = true; c.s.warmedSaid = true; c.say("this_is_x", { X: exercise(c) }); }
}

function startSets(c: Ctx) {
  c.s.setsDone = true;
  if (!c.s.setsSaid) { c.s.setsSaid = true; c.say("sets_answer"); if (c.s.restTip) c.say("rest_tip"); }
  c.say("rep_count");
  c.expect(repPending());
}

function repPending(): Pending {
  const done = (cc: Ctx) => repDone(cc, false);
  const cantR = (cc: Ctx) => repDone(cc, true);
  return { id: "rep", expects: ["rep_done_ctx", "cant", "tired", "out_breath"], hints: ["rep"],
    suggest: [{ lt: "Padaryti paskutinį pakartojimą", hint: "rep" }],
    on: {
      rep_done_ctx: done, g_ok: done, feel_good: done, g_howareyou_answer: done, tired: done, out_breath: done, not_tired: done,
      cant: cantR,
      pain: (cc, _sl, sg) => { hurt(cc, sg.tags); },
      pain_ctx: (cc, _sl, sg) => { hurt(cc, sg.tags); },
    },
    yes: done, no: cantR, ask: (cc) => cc.say("one_more_again") };
}

function repDone(c: Ctx, couldnt: boolean) {
  if (c.s.repDone) { c.say("ack"); return; }
  c.s.repDone = true;
  c.say(couldnt ? "cant_reply" : "good_job");
  // twist: something hurts after the leg press
  if (c.s.painTwist && !c.s.painAsked && !c.s.pain) {
    c.s.painAsked = true;
    c.twist("hurts");
    c.say("okay_q");
    c.expect(okayPending());
  }
}

function okayPending(): Pending {
  const fine = (cc: Ctx) => { cc.say("fine_reply"); };
  // just tired or out of breath: normal after the leg press ("Great!" would not fit "I'm dying!")
  const tiredO = (cc: Ctx) => { cc.say("okay_tired"); };
  const painH = (cc: Ctx, _sl: any, sg: { tags: string[] }) => { hurt(cc, sg.tags); };
  return { id: "okay_q", expects: ["pain", "pain_ctx", "no_pain", "feel_good", "tired", "out_breath"], hints: ["pain"],
    suggest: [{ lt: "Pasakyti, kad skauda kelį ar nugarą", hint: "pain" }],
    on: {
      pain: painH, pain_ctx: painH, no_pain: fine, feel_good: fine, not_tired: fine, g_ok: fine, g_howareyou_answer: fine, tired: tiredO, out_breath: tiredO,
      g_howareyou_bad: (cc) => { cc.say("what_hurts"); cc.expect(whereHurtPending()); },
    },
    yes: fine,
    no: (cc) => { cc.say("what_hurts"); cc.expect(whereHurtPending()); },
    ask: (cc) => cc.say("okay_q") };
}

function whereHurtPending(): Pending {
  const painH = (cc: Ctx, _sl: any, sg: { tags: string[] }) => { hurt(cc, sg.tags); };
  return { id: "where_hurt", optional: true, expects: ["pain", "pain_ctx", "no_pain"], hints: ["pain"],
    suggest: [{ lt: "Pasakyti, kas skauda", hint: "pain" }],
    on: { pain: painH, pain_ctx: painH, no_pain: (cc) => { cc.say("fine_reply"); } },
    yes: (cc) => { cc.say("fine_reply"); }, no: (cc) => { cc.say("fine_reply"); },
    ask: (cc) => cc.say("what_hurts") };
}

/** True the first time `key` comes up in this learner turn (the engine gives every turn its own context
 *  object): "Ouch, my knee hurts!" is one complaint, not two. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** Which part hurts: the piece's own tag, else the whole sentence ("Ouch, my back!"). */
function hurtPart(c: Ctx, tags: string[]): string {
  for (const x of ["knee", "back", "leg", "shoulder", "arm", "neck"]) if (tags.includes(x)) return x === "shoulder" || x === "neck" ? "arm" : x;
  const h = c.heard.toLowerCase();
  if (/\bknees?\b/.test(h)) return "knee";
  if (/\bback\b/.test(h)) return "back";
  if (/\b(legs?|ankles?|hips?|foot|feet)\b/.test(h)) return "leg";
  if (/\b(shoulders?|arms?|wrists?|elbows?|neck)\b/.test(h)) return "arm";
  return "knee";
}

/** Something hurts: Jordan reacts once per turn and takes one easier path. A sore knee or leg during the
 *  leg press: upper body instead (the bench press with just the bar comes next). Anything else, or pain
 *  during the bench press: easy stretching and no more weights; Jordan waits, then asks how it feels.
 *  At the end: stop there. Before the workout: everything easy (the bike, the chest press). */
function hurt(c: Ctx, tags: string[]) {
  if (!firstThisTurn(c, "pain")) return;
  const part = hurtPart(c, tags);
  const first = !c.s.pain;
  if (first) { c.s.pain = part; c.twist("hurts"); }
  if (c.s.breathDone) { c.say("easy_tonight"); return; }
  if (c.step === "breath") { c.s.breathDone = true; c.say("pain_stop"); c.say("break_water"); return; }
  if (c.step === "spot" && !c.s.spotDone) { c.say("pain_reply"); stretchInstead(c); return; }
  if (!c.s.warm) {
    c.say("easy_today");
    if (c.step === "warmup") chooseWarm(c, "bike", true);
    return;
  }
  if (!c.s.spotDone) {
    // the leg press (or right after it: "Whoa, are you okay?")
    const started = !!c.s.setsDone;
    c.s.machineOk = true; c.s.setsDone = true; c.s.repDone = true;
    c.say(started ? "pain_reply" : "easy_today");
    if (first && (part === "knee" || part === "leg")) { c.say("arms_instead"); return; }
    stretchInstead(c);
    return;
  }
  c.say("easy_today");
}

/** Easy stretches instead of weights: no bench press. The learner answers ("Okay"), then Jordan asks how it feels. */
function stretchInstead(c: Ctx) {
  c.s.stretched = true;
  c.s.machineOk = true; c.s.setsDone = true; c.s.repDone = true; c.s.spotDone = true;
  c.say("stretch_instead");
  const go = () => { /* the stretches are done: "How do you feel now?" follows */ };
  c.expect({ id: "stretch", optional: true, expects: [], hints: ["g_yesno"], suggest: [{ lt: "Sutikti", hint: "g_yesno" }],
    on: { g_ok: go, g_thanks: go }, yes: go, no: go });
}

function spotGo(c: Ctx, asked: boolean) {
  if (c.s.spotDone) { c.say("ack"); return; }
  c.s.spotDone = true;
  c.say(asked ? "spot_yes" : "spot_offer");
  c.say("bench_go");
}

function breathPending(c: Ctx): Pending {
  const tiredB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say("break_water"); if (cc.chance(0.5)) cc.say("earned_it"); };
  const goodB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say(cc.s.pain ? "ok_water" : "great_shape"); };
  const okB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say("ok_water"); };
  const hint = c.s.stretched ? "feel_now" : "breath";
  return { id: "breath_q", expects: ["out_breath", "tired", "feel_good", "not_tired", "water_q"], hints: [hint],
    suggest: [{ lt: c.s.stretched ? "Pasakyti, kaip jautiesi po tempimo" : "Pasakyti, kaip jautiesi", hint }],
    on: {
      out_breath: tiredB, tired: tiredB, water_q: tiredB, g_howareyou_bad: tiredB,
      feel_good: goodB, not_tired: goodB, g_ok: okB, g_howareyou_answer: goodB,
      pain: (cc, _sl, sg) => { hurt(cc, sg.tags); },
    },
    yes: okB, no: tiredB, ask: (cc) => cc.say("feel_q") };
}

function setNext(c: Ctx, value: string) {
  if (c.s.next) { c.say("ack"); return; }
  c.s.next = value;
  c.say("see_tomorrow");
}

function nextDay(c: Ctx, day: string | undefined) {
  if (!c.s.breathDone) { if (day) c.s.nextPref = day; c.say("ack"); return; }
  if (!day || day === "tomorrow") { setNext(c, "tomorrow"); return; }
  if (c.s.next) { c.say("ack"); return; }
  if (day === "today") { c.s.nextAsk = "same"; c.say("same_time_short"); c.hold(); return; }
  c.s.next = day;
  if (DAY_IDS.includes(day)) c.say("see_day", { X: day });
  else c.say("see_then");
}

/** "I'll call you." / "I'm not sure yet.": book later. Said once ("I'm not sure yet. I'll call you." is two pieces). */
function bookLater(c: Ctx) {
  if (c.s.next === "later") return;
  c.s.next = "later";
  c.say("book_later_ok");
}

function offerThursday(c: Ctx) {
  c.say("offer_thursday");
  c.expect({ id: "thursday_q", expects: ["next_day", "next_later", "later_ctx", "next_same", "when_ctx", "see_you_ctx", "cant"], hints: ["next", "g_yesno"],
    suggest: [{ lt: "Sutikti arba pasiūlyti kitą dieną", hint: "next", options: "weekday" }],
    on: {
      next_day: (cc, sl) => { nextDay(cc, sl.day ?? sl.weekday); },
      when_ctx: (cc, sl) => { nextDay(cc, sl.day ?? "thursday"); },
      next_same: (cc) => { setNext(cc, "tomorrow"); },
      see_you_ctx: (cc) => { nextDay(cc, "thursday"); },
      next_later: (cc) => bookLater(cc),
      later_ctx: (cc) => bookLater(cc),
      // "No, sorry, I can't." to "How about Thursday?"
      cant: (cc) => bookLater(cc),
      next_no: (cc) => bookLater(cc),
      day_no: (cc) => bookLater(cc),
    },
    yes: (cc) => nextDay(cc, "thursday"),
    no: (cc) => bookLater(cc),
    ask: (cc) => cc.say("offer_thursday") });
}

export default gym;
