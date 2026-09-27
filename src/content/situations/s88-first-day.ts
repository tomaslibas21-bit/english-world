// Song 88 "Where's the Coffee Machine?": the learner's first day at the Brightline office.
// Maria, a coworker (informal: tu), welcomes the new colleague: introductions ("Hi, I'm … — it's my
// first day"), the desk, the laptop and the card with the login and password, a short tour (meeting
// room, restrooms), the learner's own questions (the coffee machine and "How does it work?", the kitchen
// and the fridge, the printer, the dress code, lunch time, when people go home, mugs, who is who …),
// a first task ("Could you show me how this works?", "Could you send me that file?"), a lunch invitation
// to the Thai place around the corner (accept or decline), and at the end of the day "How was your first
// day?" and "See you tomorrow!". If the learner never asks about coffee, Maria shows the machine anyway.
// Twists (returning visits): the coffee machine is broken; "Not that mug, that's Dave's!"; the printer
// is jammed.
//
// NEEDS: Game.ts GIVEN could add "laptop": ["💻", "nešiojamąjį kompiuterį"], "password card":
// ["🔐", "kortelę su slaptažodžiu"], "badge": ["🪪", "darbuotojo kortelę"] and "coffee": ["☕", "kavos"]
// (the "give" toasts are generic now).

import type { Ctx, Suggestion, SituationDef } from "../types";
import { t } from "../dsl";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_THERE = "Existential “there” has no Lithuanian word; yra (under “Is”) carries it.";
const F_OVER = "“over” (over there): ten carries it.";
const F_KNOW = "“know” is part of “let … know”; pranešti (under “let”) carries it.";
const F_IT_PATINKA = "“it”: patinka needs no object pronoun.";

// ---------------------------------------------------------------------------
// State helpers

type Topic = "coffee" | "printer" | "system" | "laptop" | "fridge" | "mug" | "badge" | null;
const heard = (c: Ctx) => c.heard.toLowerCase();

/** Per-turn scratch: one answer may arrive as several segments. */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
function once(c: Ctx, key: string): boolean {
  const d = turn(c);
  if (d[key]) return false;
  d[key] = true;
  return true;
}

// Suggestions
const S_INTRO: Suggestion = { lt: "Prisistatyti ir pasakyti, kad tai tavo pirmoji diena", hint: "intro" };
const S_WHERE: Suggestion = { lt: "Paklausti, kur kas yra (kava, virtuvė, spausdintuvas)", hint: "where" };
const S_HOW: Suggestion = { lt: "Paklausti, kaip kas veikia", hint: "how" };
const S_DESK: Suggestion = { lt: "Padėkoti arba paklausti apie kompiuterį ir slaptažodį", hint: "desk" };
const S_TASK: Suggestion = { lt: "Paprašyti parodyti ar atsiųsti failą", hint: "task" };
const S_LUNCH: Suggestion = { lt: "Priimti kvietimą pietų arba atsisakyti", hint: "lunch" };
const S_MEET: Suggestion = { lt: "Atsakyti į pasisveikinimą", hint: "meet" };
const S_DAY: Suggestion = { lt: "Papasakoti, kaip praėjo diena", hint: "end" };
const S_NO_MORE: Suggestion = { lt: "Pasakyti, kad kol kas klausimų nebėra", hint: "no_more" };
/** Model questions in sets of three (hint group, the question keys it covers). */
const WHERE_SETS: [string, string[], string][] = [
  ["where", ["coffee", "kitchen", "printer"], "Paklausti, kur kas yra (kava, virtuvė, spausdintuvas)"],
  ["where2", ["dress", "lunch_time", "fridge"], "Paklausti apie aprangą ir pietus"],
  ["where3", ["home_time", "who", "meeting"], "Paklausti dar ko nors apie biurą"],
];

const QUESTION_INTENTS = ["q_coffee", "q_how", "q_kitchen", "q_fridge", "q_printer", "q_restroom", "q_meeting", "q_dress", "q_lunch_time",
  "q_home_time", "q_mug", "q_who", "q_parking", "q_help", "q_password", "q_login", "q_badge", "q_wifi", "q_desk", "q_it", "show_me", "q_other_ctx"];

/** Answers the simulations give to Maria's optional questions. */
const AUTO: Record<string, string> = {
  meet: "Nice to meet you too!", name: "I'm Tomas.", coffee: "Great, thanks!", lunch: "Sure, I'd love to!", mug: "Oops, sorry!", closing: "See you tomorrow!",
};

// ---------------------------------------------------------------------------

export const firstDay: SituationDef = {
  id: "s88-first-day",
  song: 88,
  songTitle: "Where's the Coffee Machine?",
  title: { en: "Where's the Coffee Machine?", lt: "Kur kavos aparatas?" },
  topic: { en: "First day at work", lt: "Pirmoji diena darbe" },
  chapter: 4,
  order: 2,
  location: "office",
  npc: "maria",
  goal: "Pirmąją darbo dieną susipažink su kolege ir išsiaiškink, kur kas yra.",
  mission: [
    { lt: "Prisistatyk", done: (c) => !!c.s.introduced && (!!c.s.named || (c.s.nameAsks || 0) >= 2) },
    { step: "tour", lt: "Paklausk, kur kas yra" },
    { lt: "Sužinok, kur kavos aparatas", done: (c) => !!c.s.coffeeKnown },
    { step: "task", lt: "Atlik pirmąją užduotį" },
    { step: "lunch", lt: "Atsakyk į kvietimą pietų" },
    { step: "day", lt: "Papasakok, kaip praėjo diena" },
  ],
  intro: "Pirmoji darbo diena „Brightline“ biure. Atviroje erdvėje tave pasitinka kolegė Marija: ji aprodys biurą ir padės įsikurti. Klausk drąsiai – kur kas yra, kaip kas veikia ir, žinoma, kur kavos aparatas!",

  grammar: {
    macros: {
      where: "(where is | where are | where can i find | where do i find | how do i find)",
      coffee_m: "(coffee machine | coffee maker | coffee)",
      restroom: "(restroom | restrooms | bathroom | bathrooms | ladies room | mens room)",
      maria_q: "[maria]",
      it_this: "(it | this | that)",
      // "the new accountant", "your new colleague"
      newbie: "(guy | girl | person | colleague | team member | coworker | co worker | employee | worker | one | intern | assistant | accountant | designer | developer | programmer | manager | engineer | analyst | secretary | receptionist | salesperson | recruiter | marketing specialist | sales manager | office manager | project manager)",
      first_day_tail: "[today | here | at work | at brightline | in the office | on the team]",
    },
  },

  intents: {
    // --- hello --------------------------------------------------------------
    first_day: { patterns: [
      "[yes] it is my first day [today | here] #h:first_day", "[yes] today is my first day [here]", "[yes] i am new [here] #h:im_new",
      "[yes] i (just)? started [today | this morning]", "[yes] i am the new (guy | girl | person | colleague | team member | coworker)",
      "[yes] i am new on the team", "[yes] this is my first day [here]", "yes i am [new here]",
      "[yes] [it is] my first day @first_day_tail", "[yes] [my] first day @first_day_tail", "[yes] (today | this) is my (first | very first) day @first_day_tail",
      "[yes] i am [your | the | a] new @newbie [here | on the team]", "(the | your) new @newbie [here | on the team]", "[yes] i am new (in | on | at) (the | this | your) (team | office | company)",
      "[yes] i am (starting | beginning) [work | to work | working] [here] (today | this morning | now)", "[yes] i (start | started | began) (to work | working | work) here (today | this morning)",
      "[yes] today i (start | begin) (to work | working | work) here", "[yes] i (work | am working) here (from | since | starting) today", "i am looking for maria", "(are you | is this) maria", "i (need to | have to | should) (see | meet | find) maria",
    ] },
    // "No, I'm not new": Maria asks how she can help (like a "no" to "Are you new here?")
    not_new: { patterns: ["[no] i am not new [here]", "[no] (it is | this is) not my first day [today | here]"] },
    intro_name: { patterns: ["my name is {name} #h:my_name", "my name is {name} and (it is my first day | i am new) [today | here]"] },
    intro_ctx: { patterns: ["i am {name} #h:im_name", "{name}", "it is {name}", "call me {name}"] },
    nice_meet: { patterns: [
      "nice (to meet | meeting) you [too] #h:nice_meet", "(it is | it is so) (nice | good | great) to meet you [too]", "pleasure (to meet | meeting) you", "(great | good) to meet you [too]",
      "(pleased | glad | happy | lovely | so nice) to meet you [too]", "likewise", "(it is | it is so) (nice | good | great) to be here", "(me too | same here | same to you)", "(nice | good) to meet you [too] [i am {name}]",
      "[i am] [very | so | really] (happy | glad | excited) to be (here | part of the team | on the team | on your team) [too]",
      "[i am] [very | so | really] (happy | glad | excited) to (join | work with) (you | the team | your team | you all)",
    ] },
    her_name: { patterns: ["[and] what is your name", "(and | sorry) who are you", "and you are", "and your name"] },

    // --- desk, laptop, card --------------------------------------------------------
    desk_ok: { patterns: [
      "(this | it) is (great | perfect | nice | awesome | a nice desk | a great desk | a great spot | a nice spot) #h:desk_great", "(nice | great | good | cool) (desk | spot | view | laptop)",
      "i like (it | my desk | the view | the laptop | my laptop)", "(thanks | thank you) (this | it) is (great | perfect)",
      "[it | this | everything] (looks | seems) (great | nice | perfect | good | cool | fine | comfortable)", "i (love | like) (the | this | my) (window | view | chair | place | spot | desk | laptop | computer)",
      "(very | really | so) (nice | cool | good | comfortable) [desk | place | spot | laptop]", "[oh] [a] new laptop [great | nice | cool | wow]", "(great | nice | cool | wow) [a] new laptop",
      "(this | it) is (very | really | so) (nice | good | comfortable | cool)", "perfect [thank you | thanks]",
    ] },
    q_password: { patterns: [
      "what is (my | the) password #h:q_password", "where is (my | the) password", "(do | should) i (need to | have to)? change (my | the) password #h:q_change", "can i change (my | the) password",
      "is (this | that) my password",
      "is (the | my) password on (this | the) card", "what (if | happens if) i forget (my | the) password", "(where | how) (do | can) i change (my | the) password",
    ] },
    q_login: { patterns: [
      "how do i (log in | login | sign in) #h:q_login", "what is my (login | username | user name)", "i can not (log in | login | sign in)", "where do i (log in | sign in)",
      "how do i (log in | login | sign in) (to | on | into) (the | my | this) (laptop | computer | system)", "what is my (email | login name | user)",
      "how do i turn on (the | my | this) (laptop | computer)", "(is | what is) the (login | username) on (the | this) card",
    ] },
    q_badge: { patterns: [
      "(where is | do i get | do i need | can i get) (my | a) (badge | key card | id card | access card | id badge) #h:q_badge", "how do i get (in | into the building)",
      "(is there | do i have) a (badge | key card)",
      "when (will | do | can) i get (my | a) (badge | key card | id card | access card | id badge)", "(where | how) (do | can) i get (my | a) (badge | key card | id card | access card | id badge)", "how do i get (a | my) (badge | key card)",
      "(do | will) i need (a | my) (badge | key card) [to (come in | get in | open the door)]", "(where is | do i get | how do i get) my (card | key card | key) (for | to open) [the] door",
    ] },
    q_wifi: { patterns: [
      "what is the (wi fi | wifi) password", "is there (wi fi | wifi)", "how do i (connect to | get on) the (wi fi | wifi)",
      "(can | how can | how do) i (connect to | use | get on) the (wi fi | wifi | internet)", "(is there | do we have) (internet | wi fi | wifi) [here]",
    ] },
    q_desk: { patterns: [
      "(is this | which one is | which desk is) my desk", "where (do i | should i) sit", "where is my desk", "is this my laptop",
      "is this my (computer | laptop | desk | chair | place | seat)", "which (desk | one | computer | laptop | place | chair) is mine", "is (this | that) (desk | place | laptop) for me",
    ] },
    q_it: { patterns: [
      "who (do i | should i) (ask | call | talk to) (about | if i have a problem with) (my | the) (laptop | computer | password)",
      "what if (my | the) (laptop | computer) (does not work | breaks)", "who (do i | should i) ask (if i have questions | for help)",
      "who (do i | should i | can i) (call | ask | contact | talk to) if (my | the) (laptop | computer | password) (does not work | is broken | breaks | has a problem | stops working)",
      "what (do i | should i) do if (my | the) (laptop | computer) (does not work | breaks | is broken)", "is there (an it | a tech) (person | department | guy)",
    ] },

    // --- where things are ---------------------------------------------------------------
    q_coffee: { patterns: [
      "@where the @coffee_m #h:q_coffee", "where can i (get | make) (a | some) coffee", "(is there | do you have) a (coffee machine | coffee maker)", "where is the coffee",
      "(i need | i would love | i could use) (a | some) coffee [where is the coffee machine]", "where do (you | people | we) get coffee",
      "(is there | do you have | do we have) [a] (coffee machine | coffee maker) [here | in the office]", "where can i (make | get | have) (tea | some tea | a tea | a cup of tea | a cup of coffee)",
      "where (can i | i can) (get | make | drink | have) [a | some] coffee", "where is the coffee machine [please]", "can i (get | make | have) (a | some)? coffee [here | somewhere]",
    ] },
    q_kitchen: { patterns: [
      "@where the kitchen #h:q_kitchen", "is there a kitchen", "where can i (eat | have lunch)", "where (do | can) (people | we) eat",
      "where (do | can) (people | we | you | everyone) (eat | have) lunch", "where (can | do | should) i (get | find) (water | a glass of water | a glass)", "where do (people | we) (eat | have) (lunch | breakfast)",
    ] },
    q_fridge: { patterns: [
      "where can i (put | keep | leave) my (lunch | food) #h:q_fridge", "is there a fridge", "(can | may) i (use | put my lunch in) the fridge", "@where the fridge",
      "(can | may) i (put | keep | leave) my (lunch | food | sandwich | lunch box) in the (fridge | refrigerator)", "where (can i | i can) (put | keep | leave) my (lunch | food)", "is there a (refrigerator | microwave)", "where (can i | do i) (heat | warm) (up)? my (lunch | food)",
    ] },
    q_printer: { patterns: ["@where the printer #h:q_printer", "is there a printer", "how do i print [something]", "where can i print [something | documents | a document]", "where do i print", "(can | may) i (use | print on) the printer"] },
    q_restroom: { patterns: ["@where the @restroom #h:q_restroom", "where is the toilet #tip:us_restroom", "where are the toilets #tip:us_restroom", "(can | could | may) i use the @restroom"] },
    q_meeting: { patterns: ["@where the meeting room #h:q_meeting", "where are the meeting rooms", "how do i book (the | a) meeting room", "where (are | do we have) (the)? meetings", "where is the (conference room | meeting room) [with the glass walls]", "(can | how can) i book (the | a) (meeting | conference) room"] },
    q_dress: { patterns: [
      "is there a dress code #h:q_dress", "what (should | do) i wear", "can i wear (jeans | sneakers | trainers #tip:us_sneakers)", "is it (formal | casual)",
      "do i (need | have) to wear a (suit | tie)", "what is the dress code", "do (we | you | i) have a dress code [here]", "is there (any | a special) dress code",
      "(is it okay | is it fine | is it allowed | can i) [to] wear (jeans | sneakers | a t shirt | shorts | trainers #tip:us_sneakers)", "(do | should) i (wear | dress) (formal | casual | formally | casually)",
    ] },
    q_lunch_time: { patterns: [
      "(when | what time) (do you | do people | do we | does everyone) (have | eat | take) lunch #h:q_lunch_time", "when is lunch", "what time is lunch",
      "how long is (the)? lunch [break]",
      "(when | what time) is (the)? lunch (break)?", "(when | what time) (do you | do people | do we | does everyone) [usually] (have | eat | take | go for) lunch", "when (can | do) i (have | take) (lunch | my lunch | a break)",
    ] },
    q_home_time: { patterns: [
      "what time (do we | do people | does everyone | do you) (finish | leave | go home) #h:q_home", "when (do we | can i | do people) (go home | leave | finish)",
      "what time do we start [in the morning]",
      "(what time | when) (do we | do people | does everyone | do you) [usually] (finish | leave | go home | finish work | stop working) [here]", "(when | what time) (does | do) (the)? work (start | begin | finish | end)",
      "(when | what time) can i go home [today]",
    ] },
    q_mug: { patterns: [
      "(can | may) i use (this | that | any | a) (mug | cup) #h:q_mug", "which (mug | cup) (can i use | is mine | should i use)", "@where the (mugs | cups)",
      "is this (mug | cup) (okay | free)",
      "which (mug | cup) can i (use | take | have)", "can i (take | have) (a | this | that | any) (mug | cup)", "(do i | should i) bring my own (mug | cup)",
    ] },
    q_who: { patterns: ["who is (that | she | he | that woman | that man | the woman at the desk) #h:q_who", "who is (ms | miss | missus) brooks", "who is (that | the) (lady | guy | woman | man | person) [over there | at the desk | by the window]", "who (is | are) (my | the) (boss | manager | team | colleagues)"] },
    q_parking: { patterns: ["where (can | do | should) i park [my car]", "is there (a)? parking [lot | here]", "is parking free", "where is the parking [lot]"] },
    q_help: { patterns: ["who (do i | should i) ask if i have (a question | questions)", "can i ask you if i have (a question | questions)", "who (can | do | should) i ask if i have (a question | questions | a problem | problems)", "who can help me [if i have (a question | a problem)]"] },
    q_how: { patterns: [
      "how does (it | this | that | the coffee machine | the machine | the printer | the system) work #h:q_how", "how do i (use | work) (it | this | that | the coffee machine | the machine | the printer)",
      "how do i make (a | the)? coffee", "how do you (use | work) (it | this | that)",
      "is it (difficult | hard | easy | complicated) [to use]", "how do i (open | find | start | edit | update) (it | this | that | the file | the list)",
      "how do i make (tea | a tea | a cup of coffee | a cappuccino | a latte)", "which button (do i press | is it)",
    ] },
    show_me: { patterns: [
      "(can | could | would) you show me how (this | it | that | the system | the program | the coffee machine | the printer) works #h:show_me",
      "(can | could | would) you show me how to (do | use) (this | it | that | the system | the program)", "(can | could) you help me with (this | it | that)",
      "how do i do (this | that | it)", "show me how (this | it) works",
      "[yes] [please] show me [please | how | how it works]", "(can | could | would) you show me [please]", "(can | could | would) you show me how to (log in | login | sign in | use (it | this | the laptop | the machine))",
      "(can | could) you explain (how (it | this) works | it | this | what to do | what i need to do)", "what (exactly)? do i (need to | have to) do [exactly]",
      "(can | could) you help me [a little | a bit | please]", "what (do | should) i do first", "(can | could | would) you show me how", "i (do not | don't) (understand | know) how [to do [it | this | that]]", "where (do | should) i start", "i (am not sure | do not know) how (to do (it | this | that) | it works | this works | to start)",
      "[yes] i would like (that | to see how it works)", "[yes] show me how (it works | to use it)",
    ] },
    q_other_ctx: { patterns: ["(what | how | when | where | who | is there | do we | do you | can i) {w:any}"] },
    more_q: { patterns: ["[yes] (one more question | i have (a | another | one more) question)", "[yes] (actually | just) one more thing"] },
    no_more: { patterns: [
      "[no] (that is | i think that is) (all | it | everything) [for now] #h:q_none", "[no] no (more)? questions [for now | right now]",
      "[no] i am (good | fine | okay) [for now] #h:q_good", "[no] i think i am (good | fine | okay) #h:q_good", "[no] nothing [else] [for now | right now]",
      "[no] i do not have any (more)? questions [right now | for now]", "[no] i think i know everything [for now]",
      "[no] not (right)? now", "[no] everything is clear [now | for now]", "[no] (all | everything) is (clear | okay | fine) [now | thanks]", "[no] i have no (more)? questions [for now]", "[no] (that is | it is) (enough | all) for (now | today)",
    ] },

    // --- first task -------------------------------------------------------------------
    send_file: { patterns: [
      "(can | could | would) you send me (that | the | this) (file | list | document | spreadsheet) #h:send_file", "(can | could | would) you send (it | that | the file | the list) to me",
      "(can | could) you (email | forward | share) (it | that | the file | the list | me the file) [to me | with me]", "send me the file",
      "where (can | do) i find (it | the file | the list | the client list)",
      "where is (the | this | that) (file | list | client list)", "[just] send me (the | that | this) (file | list | client list | document)",
      "send (it | the file | the list) to (me | my email | my inbox)", "(can | could) i (get | have) (the | that) (file | list)",
    ] },
    task_ok: { patterns: [
      "(sure | okay | no problem | got it) i (will | can) do (it | that) #h:task_sure", "i will (do it | start now | try | get started)", "i can do (that | it)",
      "[sure] no problem", "i am on it",
      "(of course | sure | okay) no problem", "i will (do it | start) (now | right now | right away)", "(okay | sure) i will try", "i will do my best",
      "[okay | sure | yes] i do (it | that) [now | right now | right away]",
    ] },
    task_cant: { patterns: [
      "i (can not | can't) do (it | this | that) [alone | yet]", "i do not know how to do (it | this | that)", "i (have never | never) (done | used) (this | it | that) [before]",
    ] },
    know_system: { patterns: [
      "i (know | have used) (this | it | that | the | your) (system | program | software) [before]", "i know how (it works | to do it)",
      "i (used | have worked with | worked with | know) (this | that | the | your) (system | program | software | app) [before | already]", "i (have done | did) (this | it | that) before",
      "i know (excel | this | it) [very well]",
    ] },

    // --- lunch ---------------------------------------------------------------------------
    lunch_yes: { patterns: [
      "[yes | sure] i would love to [come | join you] #h:l_love", "[yes] (sounds | that sounds) (great | good | fun | nice | lovely | perfect) #h:l_sounds", "count me in",
      "i am in", "[yes] (thai | thai food) sounds (great | good | amazing | perfect)", "[yes] i love thai food", "[yes] let us go", "[yes] i am (starving | hungry)",
      "[yes] i would like that", "[yes] i will come [with you]", "[yes] i will join you", "[yes] why not",
      "[yes] with pleasure", "(good | great | nice) idea", "[yes] i (go | will go | am going | come | will come) with you", "[yes] i (love | like) thai [food] [yes]",
      "(thank you | thanks) for (inviting me | the invitation | asking [me]) [yes | i would love to | sure]", "[yes] i am coming [with you]", "[sure] let us go [together]", "[yes] i (love | like) thai food",
      "[yes] i would (love | like) to (come | join (you | you all))", "[yes] i am hungry [already]", "[yes] (thai | that) sounds (great | good | amazing | perfect | delicious)",
    ] },
    lunch_no: { patterns: [
      "[no] [thanks | thank you] [but] i brought my [own] lunch [today] #h:l_brought", "[sorry] i (can not | can't) [today | right now] #h:l_cant",
      "maybe (next time | tomorrow | another time | another day) #h:l_next_time", "[no] [sorry] i have (too much | a lot of) (work | to do) [today]",
      "[no] i am not (very)? hungry [yet]", "[no] i (have | brought) my own lunch", "[no] i am on a diet", "not today [sorry]",
      "[sorry] i brought [my]? lunch (from home | with me)", "i would (like | love) to but i (can not | can't) [today]", "i have a (meeting | call | doctor appointment | appointment) [at lunch | at noon | then | at that time]",
      "[no] i (do not | don't) eat (thai food | spicy food) #spicy",
      "[no] i (do not | don't) (want | feel like) (to come | to go | lunch | going) [today | now]", "[no] i have my [own] (food | lunch | sandwich) [with me | here | today]", "[no] [sorry] i am not (coming | going) [today | this time]",
    ] },
    lunch_q: { patterns: [
      "where is (it | the thai place | the restaurant) #h:l_where", "is it (far | close | near | expensive | cheap)", "(what time | when) (are you | are we | do you | do we) (going | leaving | go | leave)",
      "what time #h:l_time", "how much is (it | lunch | the food)", "what kind of food [do they have]", "is it (thai | thai food)", "how far is it",
      "(can | could) i (pay | pay by | pay with) card [there]",
      "do they have (vegetarian | vegan | gluten free) (food | options | dishes)", "is (it | thai food | the food) (spicy | very spicy)",
    ] },
    fancy_q: { patterns: ["do you fancy (lunch | grabbing lunch) #tip:us_fancy", "i fancy (thai | lunch | it) #tip:us_fancy"] },

    // --- end of the day -----------------------------------------------------------------------
    day_good: { patterns: [
      "(it was | it has been) [really | very | pretty | so] (great | good | fine | okay | amazing | fantastic | wonderful | interesting | nice | fun | a lot of fun | exciting | cool) [thanks] #h:d_great",
      "i (love | like | really like) it here #h:d_love", "everyone is [so | really | very] (nice | friendly | helpful | kind) #h:d_nice",
      "(a lot of | lots of) new (things | information | names | people) [but everyone is (nice | friendly)] #h:d_lot", "i learned a lot [today]",
      "better than i expected",
      "i learned (a lot | many new things | many things | so much | lots of new things) [today]", "i (liked | loved | enjoyed) it [very much | a lot]", "everything was (great | good | fine | perfect | wonderful | okay)",
      "i (like | love) my new (job | work | team | colleagues | office)", "better than i (thought | expected)", "i am (happy | glad) (here | to be here | with my new job)",
      "i think it was a (good | great | nice) day", "(it was | a) (good | great | nice | wonderful) (first day | day)", "[a] (very | really) (good | great | nice) day",
      "was [really | very | so | pretty] (great | good | fine | interesting | nice | fun | okay)",
    ] },
    day_ctx: { patterns: ["[really | pretty | so | very] (great | good | amazing | fantastic | wonderful | interesting | fine | nice | busy | long | tiring | exhausting | ok | okay) [thanks]", "not bad [at all] [thanks]"] },
    day_tired: { patterns: [
      "[it was] [a bit | a little | really | so | very] (tiring | long | exhausting | busy | hard | overwhelming | intense) [but (good | great | fun | interesting | i love it here | i like it here)] #h:d_tiring",
      "i am [a bit | a little | really | so | very] tired [but happy]", "my head is full", "too many new (names | things | passwords)",
      "[it was] [a bit | a little | really | so | very] (stressful | difficult | hard | crazy) [but (good | great | fun | interesting | okay)]", "too much (information | new information | new things) [for one day]",
      "(hard | difficult | busy | long) but (interesting | good | great | fun)",
      "(it was | it has been) not (easy | good | great | so good | so easy | very good | the best | very easy)", "not (so | very)? (easy | good | great) [but okay]",
    ] },
    see_you: { patterns: ["see you tomorrow #h:see_tomorrow", "see you (then | later | in the morning | on monday)", "[bye] have a (good | nice | great) (evening | night) [see you tomorrow] #h:bye_evening"] },
    thanks_all: { patterns: ["thanks for everything #h:thanks_all", "thank you for (everything | all your help | showing me around | your help today) #h:thanks_all", "thanks for (all your help | showing me around | your help)"] },

    // --- side moves ---------------------------------------------------------------------------------
    oops: { patterns: ["oops [sorry] #h:oops", "oh (sorry | no) [i did not know]", "i did not know [that] #h:oops", "sorry i did not know", "sorry dave", "sorry [i did not know] (it is | it was) (daves | his) (mug | cup)", "i (took | used) the wrong (mug | cup)"] },
    coffee_want: { patterns: [
      "(i would love | i need | i could use) a coffee [right now]", "[yes] (a coffee | coffee) (would be great | sounds great | please)",
      "i (love | really need | need) (coffee | my coffee)", "(great | perfect) i (really)? need (a | some)? coffee",
    ] },
    // the coffee machine is broken: "Tea is fine"; or later
    tea_ok: { patterns: ["[okay | no problem] tea is (fine | great | okay | good) [for me]", "[okay] i will (have | drink | make) (some | a)? tea [then]", "tea (would be | sounds) (fine | great | good)", "i (like | love | prefer) tea"] },
    coffee_later: { patterns: [
      "[okay] i will try (it)? later", "maybe later", "[no] i do not drink coffee", "[no] i do not need (it | coffee) [now | right now]", "[no] i (will | can) (figure it out | find it) [myself | later]",
      "[no] i (do not | don't) (like | drink) (tea | coffee) [very much]",
    ] },
  },

  lines: {
    // --- hello ---------------------------------------------------------------------------------
    greet_new: [
      t("Hi! | Are | you | new | here?", "Labas! | Ar | tu | {m:naujas|f:nauja} | čia?", "Labas! Ar tu čia {m:naujas|f:nauja}?", { flags: { 1: "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
      t("Hey! | You | must | be | new | here!", "Labas! | Tu | turbūt | esi | {m:naujas|f:nauja} | čia!", "Labas! Tu turbūt čia {m:naujas|f:nauja}!"),
    ],
    greet_help: [
      t("Hi there! | Can | I | help | you?", "Labas! | Ar galiu | aš | padėti | tau?", "Labas! Gal galiu kuo nors padėti?"),
      t("Good | morning! | Can | I | help | you?", "Labas | rytas! | Ar galiu | aš | padėti | tau?", "Labas rytas! Kuo galiu padėti?"),
    ],
    new_again: [t("Are | you | new | here?", "Ar | tu | {m:naujas|f:nauja} | čia?", "Ar tu čia {m:naujas|f:nauja}?", { flags: { 0: "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here." } })],
    how_help: [t("Oh, | okay! | How | can | I | help?", "O, | gerai! | Kuo | galiu | aš | padėti?", "O, gerai! Kuo galiu padėti?")],
    welcome_nice: [
      t("Welcome! | I'm | Maria. | Nice | to meet | you!", "{m:Sveikas atvykęs|f:Sveika atvykusi}! | Aš esu | Marija. | Malonu | susipažinti | su tavimi!",
        "{m:Sveikas atvykęs|f:Sveika atvykusi}! Aš Marija. Malonu susipažinti!"),
      t("Welcome | to | the | team! | I'm | Maria. | Nice | to meet | you!", "{m:Sveikas atvykęs|f:Sveika atvykusi} | į | — | komandą! | Aš esu | Marija. | Malonu | susipažinti | su tavimi!",
        "{m:Sveikas atvykęs|f:Sveika atvykusi} į komandą! Aš Marija. Malonu susipažinti!"),
    ],
    welcome_team: [
      t("Welcome | to | the | team! | I'm | Maria. | I | sit | right | next to | you.", "{m:Sveikas atvykęs|f:Sveika atvykusi} | į | — | komandą! | Aš esu | Marija. | Aš | sėdžiu | visai | šalia | tavęs.",
        "{m:Sveikas atvykęs|f:Sveika atvykusi} į komandą! Aš Marija, sėdžiu visai šalia tavęs."),
    ],
    nice_you: [t("Nice | to meet | you!", "Malonu | susipažinti | su tavimi!", "Malonu susipažinti!")],
    ask_name: [
      t("Sorry, | what's | your | name?", "Atsiprašau, | koks yra | tavo | vardas?", "Atsiprašau, kuo tu vardu?"),
      t("And | you | are...?", "O | tu | esi...?", "O tu esi…?"),
    ],
    nice_too: [t("Nice | to meet | you | too!", "Malonu | susipažinti | su tavimi | irgi!", "Man irgi malonu!")],
    my_name_is: [t("I'm | Maria! | I | sit | right | next to | you.", "Aš esu | Marija! | Aš | sėdžiu | visai | šalia | tavęs.", "Aš Marija! Sėdžiu visai šalia tavęs.")],
    show_around: [
      t("Let | me | show | you | around. | This way!", "Leisk | man | aprodyti | tau | —. | Eime!", "Leisk, aprodysiu tau biurą. Eime!", { flags: { 4: "“around” (show around): the prefix ap- of aprodyti carries it." } }),
      t("Come on, | I'll show | you | around!", "Eime, | aprodysiu | tau | —!", "Eime, aprodysiu tau biurą!", { flags: { 3: "“around” (show around): the prefix ap- of aprodysiu carries it." } }),
    ],

    // --- desk -------------------------------------------------------------------------------------
    desk_show: [
      t("So, | this | is | your | desk, | and | here's | your | laptop.", "Taigi, | čia | yra | tavo | stalas, | o | štai | tavo | nešiojamasis kompiuteris.",
        "Taigi, čia tavo stalas, o štai tavo nešiojamasis kompiuteris."),
      t("Here's | your | desk, | and | this | is | your | laptop.", "Štai | tavo | stalas, | o | čia | yra | tavo | nešiojamasis kompiuteris.", "Štai tavo stalas, o čia tavo nešiojamasis kompiuteris."),
    ],
    card: [
      t("Your | login | and | password | are | on | this | card.", "Tavo | prisijungimo vardas | ir | slaptažodis | yra | ant | šios | kortelės.",
        "Prisijungimo vardas ir slaptažodis – ant šios kortelės."),
    ],
    dont_worry: [t("Don't worry, | it | isn't | hard!", "Nesijaudink, | tai | nėra | sunku!", "Nesijaudink, tai nesunku!")],
    badge_late: [
      t("Oh, | and | your | badge | isn't | ready | yet. | I'll let | you | in | tomorrow.", "O, | ir | tavo | darbuotojo kortelė | nėra | paruošta | dar. | Įleisiu | tave | — | rytoj.",
        "O, ir tavo darbuotojo kortelė dar neparuošta. Rytoj tave įleisiu.", { flags: { 10: "“in” (let … in): the prefix į- of įleisiu carries it." } }),
    ],
    glad_like: [t("Glad | you | like | it!", "Džiaugiuosi, | kad tau | patinka | —!", "Džiaugiuosi, kad patinka!", { flags: { 3: F_IT_PATINKA } })],
    a_password: [
      t("It's | on | the | card. | You'll change | it | when | you | log in.", "Jis yra | ant | — | kortelės. | Tu pakeisi | jį, | kai | tu | prisijungsi.",
        "Jis ant kortelės. Pakeisi jį, kai prisijungsi."),
    ],
    a_change: [t("Yes, | the | first | time | you | log in.", "Taip, | — | pirmą | kartą, kai | tu | prisijungsi.", "Taip, kai prisijungsi pirmą kartą.")],
    a_login: [
      t("Just | use | your | email | and | the | password | on | the | card.", "Tiesiog | naudok | savo | el. paštą | ir | — | slaptažodį | ant | — | kortelės.",
        "Tiesiog naudok savo el. paštą ir slaptažodį nuo kortelės."),
    ],
    a_badge: [t("Here's | your | badge. | You'll need | it | to get in.", "Štai | tavo | darbuotojo kortelė. | Tau reikės | jos | įeiti.", "Štai tavo darbuotojo kortelė. Jos reikės, kad įeitum į pastatą.")],
    a_wifi: [t("The | Wi-Fi | password | is | on | your | card | too.", "— | „Wi-Fi“ | slaptažodis | yra | ant | tavo | kortelės | irgi.", "„Wi-Fi“ slaptažodis irgi ant tavo kortelės.")],
    a_desk: [t("Yep, | this one, | by | the | window!", "Taip, | šitas, | prie | — | lango!", "Taip, šitas, prie lango!")],
    a_it: [t("Just | email | IT, | or | ask | me!", "Tiesiog | parašyk | IT skyriui, | arba | paklausk | manęs!", "Tiesiog parašyk IT skyriui arba paklausk manęs!")],
    show_login: [
      t("Sure! | Type | your | email, | then | the | password | from | the | card. | See?", "Žinoma! | Įvesk | savo | el. paštą, | tada | — | slaptažodį | iš | — | kortelės. | Matai?",
        "Žinoma! Įvesk savo el. paštą, tada slaptažodį iš kortelės. Matai?"),
    ],

    // --- tour ---------------------------------------------------------------------------------------
    tour_rooms: [
      t("The | meeting | room | is | over | there, | with | the | glass | walls.", "— | Posėdžių | salė | yra | — | ten, | su | — | stiklinėmis | sienomis.",
        "Posėdžių salė – ten, su stiklinėmis sienomis.", { flags: { 4: F_OVER } }),
    ],
    tour_restrooms: [t("And | the | restrooms | are | down the hall, | on the left.", "O | — | tualetai | yra | koridoriaus gale, | kairėje.", "O tualetai – koridoriaus gale, kairėje.")],
    ask_anything: [
      t("If | you | have | any | questions, | just | ask!", "Jei | tu | turi | kokių nors | klausimų, | tiesiog | klausk!", "Jei turi klausimų, tiesiog klausk!"),
      t("Any | questions | so far?", "Kokių nors | klausimų | kol kas?", "Kol kas klausimų yra?"),
    ],
    what_else: [
      t("What | else?", "Ką | dar?", "Ką dar?"),
      t("Anything | else?", "Ką nors | daugiau?", "Dar kas nors?"),
      t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Dar klausimų turi?"),
    ],
    sure_what: [t("Sure! | What's up?", "Žinoma! | Kas yra?", "Žinoma! Kas yra?")],
    a_coffee: [
      t("It's | in the kitchen, | next to | the | fridge. | The | big one, | black | and | green!", "Jis yra | virtuvėje, | šalia | — | šaldytuvo. | Tas | didelis, | juodas | ir | žalias!",
        "Virtuvėje, šalia šaldytuvo. Tas didelis, juodai žalias!", { flags: { 5: "“The” … “one”: Lithuanian uses the demonstrative tas." } }),
    ],
    a_coffee_more: [t("Want | me | to show | you | how | it | works?", "Nori, | kad aš | parodyčiau | tau, | kaip | jis | veikia?", "Nori, parodysiu, kaip jis veikia?")],
    a_how_coffee: [
      t("Just | press | this | button | and | wait | a | minute.", "Tiesiog | paspausk | šį | mygtuką | ir | palauk | — | minutę.", "Tiesiog paspausk šį mygtuką ir palauk minutę."),
    ],
    a_how_broken: [
      t("Usually | you | just | press | this | button. | But | today | it | doesn't work, | sorry!", "Paprastai | tu | tiesiog | paspaudi | šį | mygtuką. | Bet | šiandien | jis | neveikia, | atsiprašau!",
        "Paprastai tiesiog paspaudi šį mygtuką. Bet šiandien jis neveikia, atsiprašau!"),
    ],
    wash_cup: [t("And | don't forget | to wash | your | cup!", "Ir | nepamiršk | išsiplauti | savo | puodelio!", "Ir nepamiršk išsiplauti puodelio!")],
    a_how_printer: [t("Just | tap | your | badge | and | pick | your | document.", "Tiesiog | pridėk | savo | darbuotojo kortelę | ir | pasirink | savo | dokumentą.",
      "Tiesiog pridėk darbuotojo kortelę ir pasirink dokumentą.")],
    which_one: [t("The | coffee | machine? | Sure!", "— | Kavos | aparatas? | Žinoma!", "Kavos aparatas? Žinoma!")],
    a_kitchen: [t("It's | right | over | there.", "Ji yra | visai | — | ten.", "Štai ten.", { flags: { 2: F_OVER } })],
    a_fridge: [t("In the fridge! | Just | put | your | name | on | it.", "Šaldytuve! | Tiesiog | užrašyk | savo | vardą | ant | jų.", "Šaldytuve! Tiesiog užrašyk ant jų savo vardą.",
      { flags: { 6: "“it” (your lunch) = jų: pietūs is plural in Lithuanian." } })],
    a_printer: [t("The | printer | is | over | there, | by | the | window.", "— | Spausdintuvas | yra | — | ten, | prie | — | lango.", "Spausdintuvas – ten, prie lango.", { flags: { 3: F_OVER } })],
    a_print_how: [t("Just | tap | your | badge | on | the | printer.", "Tiesiog | pridėk | savo | darbuotojo kortelę | prie | — | spausdintuvo.", "Tiesiog pridėk darbuotojo kortelę prie spausdintuvo.")],
    a_restroom: [t("Down the hall, | on the left.", "Koridoriaus gale, | kairėje.", "Koridoriaus gale, kairėje.")],
    a_meeting: [
      t("It's | over | there, | with | the | glass | walls. | You | can | book | it | in the calendar.", "Ji yra | — | ten, | su | — | stiklinėmis | sienomis. | Tu | gali | užsirezervuoti | ją | kalendoriuje.",
        "Ji ten, su stiklinėmis sienomis. Užsirezervuoti gali kalendoriuje.", { flags: { 1: F_OVER } }),
    ],
    a_dress: [t("Business | casual. | Jeans | are fine | on Fridays!", "Dalykinis | laisvas stilius. | Džinsai | tinka | penktadieniais!", "Laisvas dalykinis stilius. Penktadieniais tinka ir džinsai!")],
    a_lunch_time: [t("Most | people | eat | around | noon.", "Dauguma | žmonių | valgo | apie | vidurdienį.", "Dauguma pietauja apie vidurdienį.")],
    a_home_time: [t("Most | people | leave | around | five.", "Dauguma | žmonių | išeina | apie | penktą.", "Dauguma išeina apie penktą.")],
    a_mug: [t("Sure! | The | mugs | are | in the cabinet | above | the | sink.", "Žinoma! | — | Puodeliai | yra | spintelėje | virš | — | kriauklės.", "Žinoma! Puodeliai – spintelėje virš kriauklės.")],
    a_who: [t("That's | Ms. | Brooks | from | HR. | She's | really | nice.", "Tai | ponia | Bruks | iš | personalo skyriaus. | Ji yra | tikrai | maloni.", "Tai ponia Bruks iš personalo skyriaus. Ji tikrai maloni.",
      { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } })],
    a_parking: [t("Behind | the | building. | It's | free!", "Už | — | pastato. | Ji yra | nemokama!", "Už pastato. Aikštelė nemokama!",
      { flags: { 3: "“It's” = ji (the parking lot, aikštelė) + yra." } })],
    a_help: [t("Just | ask | me! | I | sit | right | next to | you.", "Tiesiog | paklausk | manęs! | Aš | sėdžiu | visai | šalia | tavęs.", "Tiesiog paklausk manęs! Sėdžiu visai šalia tavęs.")],
    a_unknown: [
      t("Hmm, | I | don't know. | I'll ask | and | let | you | know!", "Hmm, | aš | nežinau. | Paklausiu | ir | pranešiu | tau | —!", "Hmm, nežinau. Paklausiu ir tau pranešiu!", { flags: { 7: F_KNOW } }),
    ],
    a_unknown_where: [t("I'll show | you | later!", "Parodysiu | tau | vėliau!", "Vėliau parodysiu!")],
    a_unknown_have: [t("Hmm, | I | don't think | so. | But | I'll check!", "Hmm, | aš | nemanau | [kad yra]. | Bet | pasitikslinsiu!", "Hmm, nemanau. Bet pasitikslinsiu!",
      { flags: { 3: "Elliptical “so”: Lithuanian repeats the clause (kad yra)." } })],
    coffee_offer: [
      t("Oh, | and | the | most | important | thing: | the | coffee | machine!", "O, | ir | — | pats | svarbiausias | dalykas: | — | kavos | aparatas!", "O, ir pats svarbiausias dalykas – kavos aparatas!"),
    ],
    coffee_broken: [
      t("Oh | no, | it's | broken | again!", "O | ne, | jis | sugedęs | vėl!", "O ne, jis vėl sugedęs!", { flags: { 2: "“'s” (is): the participle sugedęs needs no copula here." } }),
    ],
    coffee_alt: [t("There's | tea | in the cabinet, | though.", "Yra | arbatos | spintelėje, | vis dėlto.", "Bet spintelėje yra arbatos.", { flags: { 1: "Partitive: the genitive arbatos (some tea)." } })],
    mug_twist: [
      t("Oh, | wait! | Not | that | mug, | that's | Dave's! | Here, | use | this one.", "O, | palauk! | Ne | tas | puodelis, | tai | Deivo! | Še, | naudok | šitą.",
        "O, palauk! Ne tas puodelis – tai Deivo! Še, naudok šitą.", { flags: { 5: "“'s” (is): Lithuanian needs no copula here." } }),
    ],
    no_worries: [t("Ha, | no | worries!", "Cha, | jokių | rūpesčių!", "Cha, nieko tokio!"), t("It's | okay! | He | won't know.", "Viskas | gerai! | Jis | nesužinos.", "Viskas gerai! Jis nesužinos.")],
    printer_jam: [
      t("Oh | no, | the | printer's | jammed | again!", "O | ne, | — | spausdintuvas | užstrigęs | vėl!", "O ne, spausdintuvas vėl užstrigęs!", { flags: { 3: "“'s” (is): the participle užstrigęs needs no copula here." } }),
    ],
    printer_fix: [t("Just | open | the | side | door | and | take out | the | paper.", "Tiesiog | atidaryk | — | šoninį | dangtį | ir | ištrauk | — | popierių.", "Tiesiog atidaryk šoninį dangtį ir ištrauk popierių.")],

    // --- first task -----------------------------------------------------------------------------------
    task_intro: [
      t("Okay! | Your | first | task: | we | need | to update | the | client | list.", "Gerai! | Tavo | pirmoji | užduotis: | mums | reikia | atnaujinti | — | klientų | sąrašą.",
        "Gerai! Tavo pirmoji užduotis: reikia atnaujinti klientų sąrašą."),
    ],
    task_file: [t("It's | in | a | file | on | my | computer.", "Jis yra | — | — | faile | — | mano | kompiuteryje.", "Jis faile mano kompiuteryje.",
      { flags: { 1: "“in”: the locative faile carries it.", 4: "“on”: the locative kompiuteryje carries it (a possessive intervenes, C-CASE-DASH)." } })],
    task_again: [t("So, | can | you | do | that?", "Na, | ar gali | tu | padaryti | tai?", "Na, ar gali tai padaryti?")],
    show_system: [
      t("Of course! | Log in, | click | “New”, | then | “Save”. | See? | It's | easy!", "Žinoma! | Prisijunk, | spausk | „Naujas“, | tada | „Išsaugoti“. | Matai? | Tai | lengva!",
        "Žinoma! Prisijunk, spausk „Naujas“, tada „Išsaugoti“. Matai? Lengva!", { say: "Of course! Log in, click New, then Save. See? It's easy!" }),
    ],
    file_sent: [
      t("Sure! | Done! | It's | in | your | inbox | now.", "Žinoma! | Padaryta! | Jis yra | — | tavo | pašto dėžutėje | dabar.", "Žinoma! Padaryta – jis jau tavo pašto dėžutėje.",
        { flags: { 3: "“in”: the locative pašto dėžutėje carries it (a possessive intervenes, C-CASE-DASH)." } }),
    ],
    which_file: [t("Sure! | Which | file?", "Žinoma! | Kurį | failą?", "Žinoma! Kurį failą?")],
    send_offer: [t("I'll send | you | the | file.", "Atsiųsiu | tau | — | failą.", "Atsiųsiu tau failą.")],
    task_ok_reply: [
      t("Great! | Just | shout | if | you | need | anything.", "Puiku! | Tiesiog | šūktelk, | jei | tau | reikės | ko nors.", "Puiku! Jei ko reikės, tiesiog šūktelk."),
      t("Perfect! | Just | ask | if | you | need | help.", "Puiku! | Tiesiog | klausk, | jei | tau | reikės | pagalbos.", "Puiku! Jei reikės pagalbos, tiesiog klausk."),
    ],
    know_ok: [t("Oh, | great!", "O, | puiku!", "O, puiku!")],

    // --- lunch -----------------------------------------------------------------------------------------
    lunch_invite: [
      t("A | few | of | us | are going | to | the | Thai | place | around the corner | for lunch. | Want | to come?",
        "— | Keli | iš | mūsų | eina | į | — | tajų | restoranėlį | už kampo | pietų. | Nori | eiti kartu?",
        "Keli iš mūsų einame pietų į tajų restoranėlį už kampo. Eisi kartu?"),
      t("Do | you | want | to grab lunch | with | us? | We | usually | go | to | the | Thai | place | around the corner.",
        "Ar | tu | nori | papietauti | su | mumis? | Mes | paprastai | einame | į | — | tajų | restoranėlį | už kampo.",
        "Gal nori papietauti su mumis? Paprastai einame į tajų restoranėlį už kampo.", { flags: { 0: F_DO_Q } }),
    ],
    lunch_reask: [t("So, | are | you | coming?", "Tai | ar | tu | eini?", "Tai eini kartu?", { flags: { 1: "“are” in a yes/no question = the particle ar; the progressive sits on eini." } })],
    lunch_yes_reply: [
      t("Great! | We'll go | at noon.", "Puiku! | Eisime | vidurdienį.", "Puiku! Eisime vidurdienį."),
      t("Awesome! | We | leave | at noon.", "Šaunu! | Mes | išeiname | vidurdienį.", "Šaunu! Išeiname vidurdienį."),
    ],
    lunch_no_reply: [t("No | problem! | Maybe | tomorrow.", "Jokių | problemų! | Gal | rytoj.", "Nieko tokio! Gal rytoj."), t("Okay, | next | time!", "Gerai, | kitą | kartą!", "Gerai, kitą kartą!")],
    a_thai_where: [t("Just | around the corner. | It's | cheap | and | quick.", "Visai | už kampo. | Tai yra | pigu | ir | greita.", "Visai už kampo. Pigu ir greita.")],
    a_thai_time: [t("At noon.", "Vidurdienį.", "Vidurdienį.")],
    a_thai_price: [t("It's | cheap, | about | $12.", "Tai yra | pigu, | apie | 12 dolerių.", "Pigu, apie 12 dolerių.", { say: "It's cheap, about twelve dollars." })],
    a_thai_food: [t("Curry, | noodles, | pad thai... | Everything's | good!", "Karis, | makaronai, | „pad thai“... | Viskas yra | skanu!", "Karis, makaronai, „pad thai“… Viskas skanu!")],
    a_thai_card: [t("Yes, | they | take | cards.", "Taip, | jie | priima | korteles.", "Taip, ten galima mokėti kortele.")],

    // --- end of the day -----------------------------------------------------------------------------------
    day_ask: [
      t("Hey! | Time | to go | home. | So, | how | was | your | first | day?", "Ei! | Laikas | eiti | namo. | Tai | kaip | praėjo | tavo | pirmoji | diena?",
        "Ei! Laikas eiti namo. Tai kaip praėjo tavo pirmoji diena?"),
      t("Five | o'clock! | So, | how | was | your | first | day?", "Penkta | valanda! | Tai | kaip | praėjo | tavo | pirmoji | diena?", "Jau penkta! Tai kaip praėjo tavo pirmoji diena?"),
    ],
    day_good_reply: [
      t("Glad | to hear | it! | You'll | get used | to | everything | really | fast.", "Smagu | girdėti | tai! | Tu | priprasi | prie | visko | labai | greitai.",
        "Smagu girdėti! Labai greitai prie visko priprasi.", { flags: { 3: "“'ll” (will): the future ending of priprasi carries it." } }),
    ],
    day_tired_reply: [
      t("The | first | day | is | always | the | hardest! | You'll | get used | to | it.", "— | Pirmoji | diena | būna | visada | — | sunkiausia! | Tu | priprasi | prie | to.",
        "Pirmoji diena visada sunkiausia! Priprasi.", { flags: { 7: "“'ll” (will): the future ending of priprasi carries it." } }),
    ],
    see_tomorrow: [t("See you | tomorrow!", "Iki | rytojaus!", "Iki rytojaus!")],
    bye_reply: [
      t("Bye! | Have | a | good | evening!", "Iki! | Linkiu | — | gero | vakaro!", "Iki! Gero vakaro!"),
      t("See you! | Get | some | rest!", "Iki! | — | Truputį | pailsėk!", "Iki! Pailsėk!", { flags: { 1: "“Get” (get some rest): pailsėk (under “rest”) carries it." } }),
    ],
    ack: [t("Okay!", "Gerai!", "Gerai!"), t("Sure!", "Žinoma!", "Žinoma!")],
    welcome_reply: [t("You're welcome!", "Prašom!", "Prašom!"), t("Anytime!", "Visada prašom!", "Visada prašom!")],
  },

  hints: {
    intro: {
      lt: "Prisistatyti",
      items: [
        { id: "first_day", s: t("Hi! | I'm | {$name}. | It's | my | first | day.", "Labas! | Aš esu | {$name}. | Tai yra | mano | pirmoji | diena.", "Labas! Aš {$name}. Šiandien mano pirmoji diena.") },
        { id: "im_new", s: t("Yes, | I'm | new | here.", "Taip, | aš esu | {m:naujas|f:nauja} | čia.", "Taip, aš čia {m:naujas|f:nauja}.") },
        { id: "first_day", s: t("Yes, | it's | my | first | day.", "Taip, | tai yra | mano | pirmoji | diena.", "Taip, šiandien mano pirmoji diena.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    meet: {
      lt: "Atsakyti į pasisveikinimą",
      items: [
        { id: "nice_meet", s: t("Nice | to meet | you | too!", "Malonu | susipažinti | su tavimi | irgi!", "Man irgi malonu!") },
        { id: "im_name", s: t("Thanks! | I'm | {$name}.", "Ačiū! | Aš esu | {$name}.", "Ačiū! Aš {$name}.") },
        { id: "s_thanks", s: t("Thank | you!", "Ačiū | tau!", "Ačiū!") },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą",
      items: [
        { id: "im_name", s: t("I'm | {$name}.", "Aš esu | {$name}.", "Aš {$name}.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
        { id: "im_name", s: t("It's | {$name}.", "Tai | {$name}.", "{$name}.", { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } }) },
      ],
    },
    desk: {
      lt: "Padėkoti ar paklausti apie kompiuterį",
      items: [
        { id: "desk_great", s: t("Thanks! | This | is | great.", "Ačiū! | Tai | yra | puiku.", "Ačiū! Puiku.") },
        { id: "q_login", s: t("How | do | I | log in?", "Kaip | — | aš | prisijungiu?", "Kaip prisijungti?", { flags: { 1: F_WH_DO } }) },
        { id: "q_password", s: t("What's | my | password?", "Koks yra | mano | slaptažodis?", "Koks mano slaptažodis?") },
        { id: "q_change", s: t("Do | I | need | to change | the | password?", "Ar | man | reikia | pakeisti | — | slaptažodį?", "Ar reikia pakeisti slaptažodį?", { flags: { 0: F_DO_Q } }) },
        { id: "q_badge", s: t("Do | I | get | a | badge?", "Ar | aš | gaunu | — | darbuotojo kortelę?", "Ar gausiu darbuotojo kortelę?", { flags: { 0: F_DO_Q } }) },
      ],
    },
    where: {
      lt: "Paklausti, kur kas yra",
      items: [
        { id: "q_coffee", s: t("Where's | the | coffee | machine?", "Kur yra | — | kavos | aparatas?", "Kur kavos aparatas?") },
        { id: "q_kitchen", s: t("Where's | the | kitchen?", "Kur yra | — | virtuvė?", "Kur virtuvė?") },
        { id: "q_printer", s: t("Where's | the | printer?", "Kur yra | — | spausdintuvas?", "Kur spausdintuvas?") },
      ],
    },
    where2: {
      lt: "Paklausti apie darbo tvarką",
      items: [
        { id: "q_dress", s: t("Is | there | a | dress | code?", "Ar yra | — | — | aprangos | kodas?", "Ar yra aprangos kodas?", { flags: { 1: F_THERE } }) },
        { id: "q_lunch_time", s: t("What | time | do | people | have | lunch?", "Kelintą | valandą | — | žmonės | valgo | pietus?", "Kada žmonės pietauja?", { flags: { 2: F_WH_DO } }) },
        { id: "q_fridge", s: t("Where | can | I | put | my | lunch?", "Kur | galiu | aš | padėti | savo | pietus?", "Kur galiu pasidėti pietus?") },
      ],
    },
    where3: {
      lt: "Paklausti dar ko nors",
      items: [
        { id: "q_home", s: t("What | time | do | we | finish?", "Kelintą | valandą | — | mes | baigiame?", "Kada baigiame darbą?", { flags: { 2: F_WH_DO } }) },
        { id: "q_who", s: t("Who's | that?", "Kas | tai?", "Kas tai?", { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } }) },
        { id: "q_meeting", s: t("Where's | the | meeting | room?", "Kur yra | — | posėdžių | salė?", "Kur posėdžių salė?") },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur tualetas?") },
      ],
    },
    no_more: {
      lt: "Pasakyti, kad kol kas klausimų nebėra",
      items: [
        { id: "q_none", s: t("No, | that's | all | for now.", "Ne, | tai yra | viskas | kol kas.", "Ne, kol kas tiek.") },
        { id: "q_good", s: t("I | think | I'm | good, | thanks.", "Aš | manau, | man | gerai, | ačiū.", "Manau, kol kas man užtenka, ačiū.") },
      ],
    },
    coffee: {
      lt: "Padėkoti arba paklausti, kaip jis veikia",
      items: [
        { id: "coffee_great", s: t("Great, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!") },
        { id: "q_how", s: t("How | does | it | work?", "Kaip | — | jis | veikia?", "Kaip jis veikia?", { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on veikia." } }) },
        { id: "q_mug", s: t("Can | I | use | this | mug?", "Ar galiu | aš | naudoti | šį | puodelį?", "Ar galiu imti šį puodelį?") },
      ],
    },
    oops: {
      lt: "Atsiprašyti",
      items: [
        { id: "oops", s: t("Oops, | sorry!", "Oi, | atsiprašau!", "Oi, atsiprašau!") },
        { id: "oops", s: t("Oh, | I | didn't know!", "O, | aš | nežinojau!", "O, nežinojau!") },
      ],
    },
    bye: {
      lt: "Atsisveikinti",
      items: [
        { id: "see_tomorrow", s: t("See you | tomorrow!", "Iki | rytojaus!", "Iki rytojaus!") },
        { id: "thanks_all", s: t("Thanks | for | everything!", "Ačiū | už | viską!", "Ačiū už viską!") },
        { id: "bye_evening", s: t("Bye! | Have | a | good | evening!", "Iki! | Linkiu | — | gero | vakaro!", "Iki! Gero vakaro!") },
      ],
    },
    how: {
      lt: "Paklausti, kaip kas veikia",
      items: [
        { id: "q_how", s: t("How | does | it | work?", "Kaip | — | jis | veikia?", "Kaip jis veikia?", { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on veikia." } }) },
        { id: "show_me", s: t("Could | you | show | me | how | this | works?", "Ar galėtum | tu | parodyti | man, | kaip | tai | veikia?", "Ar galėtum parodyti, kaip tai veikia?") },
        { id: "q_mug", s: t("Can | I | use | this | mug?", "Ar galiu | aš | naudoti | šį | puodelį?", "Ar galiu imti šį puodelį?") },
      ],
    },
    task: {
      lt: "Paprašyti pagalbos su užduotimi",
      items: [
        { id: "show_me", s: t("Could | you | show | me | how | this | works?", "Ar galėtum | tu | parodyti | man, | kaip | tai | veikia?", "Ar galėtum parodyti, kaip tai veikia?") },
        { id: "send_file", s: t("Could | you | send | me | that | file?", "Ar galėtum | tu | atsiųsti | man | tą | failą?", "Ar galėtum atsiųsti man tą failą?") },
        { id: "task_sure", s: t("Sure, | I | can | do | that.", "Žinoma, | aš | galiu | padaryti | tai.", "Žinoma, galiu tai padaryti.") },
        { id: "s_thanks", s: t("Thanks | a | lot!", "Ačiū | — | labai!", "Labai ačiū!") },
      ],
    },
    lunch: {
      lt: "Priimti kvietimą arba mandagiai atsisakyti",
      items: [
        { id: "l_love", s: t("I'd | love | to!", "Aš | labai norėčiau | [eiti]!", "Mielai!",
          { flags: { 0: "“'d” (would): the conditional ending of norėčiau carries it.", 2: "Elliptical “to”: Lithuanian repeats the verb (eiti)." } }) },
        { id: "l_sounds", s: t("Sounds | great!", "Skamba | puikiai!", "Puiku!") },
        { id: "l_brought", s: t("Thanks, | but | I | brought | my | lunch | today.", "Ačiū, | bet | aš | atsinešiau | savo | pietus | šiandien.", "Ačiū, bet šiandien atsinešiau pietus.") },
        { id: "l_next_time", s: t("Maybe | next | time!", "Gal | kitą | kartą!", "Gal kitą kartą!") },
        { id: "l_where", s: t("Where | is | it?", "Kur | yra | jis?", "Kur jis yra?") },
        { id: "l_time", s: t("What | time?", "Kelintą | valandą?", "Kelintą valandą?") },
      ],
    },
    end: {
      lt: "Papasakoti, kaip praėjo diena, ir atsisveikinti",
      items: [
        { id: "d_great", s: t("It was | great!", "Buvo | puiku!", "Buvo puiku!") },
        { id: "d_tiring", s: t("Tiring, | but | I | love | it | here!", "Varginanti, | bet | man | labai patinka | — | čia!", "Varginanti, bet man čia labai patinka!", { flags: { 4: F_IT_PATINKA } }) },
        { id: "d_nice", s: t("Everyone | is | so | nice!", "Visi | yra | tokie | malonūs!", "Visi tokie malonūs!") },
        { id: "d_lot", s: t("A | lot | of | new | names!", "— | Daug | — | naujų | vardų!", "Daug naujų vardų!", { flags: { 2: "“of”: the genitive naujų vardų carries it." } }) },
        { id: "see_tomorrow", s: t("See you | tomorrow!", "Iki | rytojaus!", "Iki rytojaus!") },
        { id: "thanks_all", s: t("Thanks | for | everything!", "Ačiū | už | viską!", "Ačiū už viską!") },
      ],
    },
  },

  tips: {
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    us_fancy: { key: "us_fancy", lt: "Suprasta! „Fancy“ (norėti) – britiškas žodis; amerikietis sakytų „Do you want to grab lunch?“", better: "Do you want to grab lunch?" },
    us_sneakers: { key: "us_sneakers", lt: "Suprasta! Amerikoje sportbačiai – „sneakers“.", better: "Can I wear sneakers?" },
  },

  merges: {
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia.", minimal: "Two words." },
    "this way": { reason: "lexical_expression", split: "this → šis + way → kelias is false; the invitation to follow = eime.", minimal: "Two words." },
    "come on": { reason: "lexical_expression", split: "come → ateik + on → ant is false; the encouragement = eime.", minimal: "Two words." },
    "log in": { reason: "lexical_expression", split: "log → registruoti + in → į is false; log in = prisijungti (C-PHR).", minimal: "Verb and particle." },
    "down the hall": { reason: "lexical_expression", split: "down → žemyn, the → —, hall → koridorius is false; the direction = koridoriaus gale.", minimal: "The three words form the phrase." },
    "this one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word is absorbed by the demonstrative šitas (C-ONE).", minimal: "Two words." },
    "big one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; Lithuanian nominalises the adjective: didelis (C-ONE).", minimal: "Two words." },
    "are fine": { reason: "lexical_expression", split: "are → yra + fine → gerai gives “džinsai yra gerai”; accepting an option = tinka.", minimal: "Two words." },
    "around the corner": { reason: "lexical_expression", split: "around → aplink, the → —, corner → kampas is a literal movement; the place = už kampo.", minimal: "The three words form the phrase." },
    "to grab lunch": { reason: "lexical_expression", split: "to → —, grab → griebti, lunch → pietus is false; grab lunch = papietauti (C-INF).", minimal: "The three words form the phrase." },
    "get used": { reason: "lexical_expression", split: "get → gauti + used → naudotas is false; get used (to) = priprasti.", minimal: "Two words." },
    "take out": { reason: "lexical_expression", split: "take → imti + out → lauk is false; take out (paper) = ištraukti (C-PHR).", minimal: "Verb and particle." },
    "pad thai": { reason: "lexical_expression", split: "A dish name; pad and thai have no separate meaning in English either.", minimal: "Two words, one dish." },
    "to get in": { reason: "grammatical_fusion", split: "to → — (infinitive -ti) + get → gauti + in → į is false; get in = įeiti (C-INF + C-PHR).", minimal: "The three words form the verb." },
    "what's up": { reason: "lexical_expression", split: "what's → kas yra + up → aukštyn is false; the friendly question = kas yra?", minimal: "Two words." },
    "it was": { reason: "grammatical_fusion", split: "Dummy “it” has no Lithuanian word; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "so far": { reason: "lexical_expression", split: "so → taip + far → toli is false; = kol kas.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  steps: [
    { id: "hello", done: (c) => !!c.s.introduced,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "new" ? "greet_new" : "greet_help"); }
        else { c.s.lastQ = "new"; c.say("new_again"); }
      },
      expects: ["first_day", "intro_name", "intro_ctx", "nice_meet", "not_new"],
      suggest: [S_INTRO],
      yes: (c) => {
        if (c.s.lastQ === "new") { introduced(c); return; }
        c.s.lastQ = "new"; c.say("new_again"); c.hold();
      },
      no: (c) => { c.s.lastQ = "help"; c.say("how_help"); c.hold(); } },
    { id: "name", when: (c) => !!c.s.introduced, done: (c) => !!c.s.named || (c.s.nameAsks || 0) >= 2,
      ask: (c) => { c.s.nameAsks = (c.s.nameAsks || 0) + 1; c.say("ask_name"); },
      expects: ["intro_name", "intro_ctx"], suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }] },
    { id: "desk", when: (c) => !!c.s.introduced, done: (c) => !!c.s.deskDone,
      ask: (c) => {
        if (c.s.deskShown) { c.s.deskDone = true; c.ask("tour"); return; }
        c.s.deskShown = true;
        c.s.topic = "laptop";
        c.say("show_around");
        c.say("desk_show");
        c.event("give", { item: "laptop" });
        c.say("card");
        c.event("give", { item: "password card" });
        if (c.s.badgeLate) { c.twist("badge_late"); c.say("badge_late"); c.s.badgeDone = true; }
        else if (c.chance(0.4)) c.say("dont_worry");
      },
      expects: ["desk_ok", "q_password", "q_login", "q_badge", "q_wifi", "q_desk", "q_it", "show_me"],
      suggest: [S_DESK, S_WHERE],
      yes: (c) => { c.s.deskDone = true; }, no: (c) => { c.s.deskDone = true; } },
    { id: "tour", when: (c) => !!c.s.deskDone, done: (c) => !!c.s.tourDone || (c.s.tourAsks || 0) >= 6,
      ask: (c) => {
        c.s.tourAsks = (c.s.tourAsks || 0) + 1;
        if (!c.s.toured) { c.s.toured = true; c.say("tour_rooms"); c.say("tour_restrooms"); c.say("ask_anything"); }
        else c.say("what_else");
        // the model questions move on to ones the learner hasn't asked yet
        const [set, , label] = WHERE_SETS.find(([, keys]) => keys.every((k) => !c.s.asked[k])) ?? WHERE_SETS.find(([, keys]) => keys.some((k) => !c.s.asked[k])) ?? WHERE_SETS[2];
        const sg: Suggestion[] = [{ lt: label, hint: set }, S_HOW, S_NO_MORE];
        c.expect({ id: "tour", optional: true, expects: [...QUESTION_INTENTS, "no_more", "more_q"], suggest: sg, hints: [set, "how", "no_more"] });
      },
      expects: [...QUESTION_INTENTS, "no_more", "more_q"],
      suggest: [S_WHERE, S_HOW, S_NO_MORE],
      yes: (c) => {
        if (/\b(yes|yeah|yep|actually|one more)\b/.test(heard(c))) { c.say("sure_what"); c.hold(); return; }
        c.s.tourDone = true;
      },
      no: (c) => { c.s.tourDone = true; } },
    { id: "coffee", when: (c) => !!c.s.tourDone, done: (c) => !!c.s.coffeeKnown,
      ask: (c) => { c.say("coffee_offer"); coffeeWhere(c); },
      expects: ["q_how", "show_me", "q_mug", "coffee_want", "oops", "tea_ok", "coffee_later"], suggest: [{ lt: "Padėkoti arba paklausti, kaip jis veikia", hint: "coffee" }] },
    { id: "task", when: (c) => !!c.s.tourDone && !!c.s.coffeeKnown, done: (c) => !!c.s.taskDone || (c.s.taskAsks || 0) >= 3,
      ask: (c) => {
        c.s.taskAsks = (c.s.taskAsks || 0) + 1;
        c.s.topic = "system";
        if (c.s.taskAsks === 1) { c.say("task_intro"); c.say("task_file"); }
        else c.say("task_again");
      },
      expects: ["show_me", "send_file", "task_ok", "know_system", "q_how", "task_cant"],
      suggest: [S_TASK],
      yes: (c) => { taskOk(c); }, no: (c) => { c.say("show_system"); c.s.shown = true; c.hold(); } },
    { id: "lunch", when: (c) => !!c.s.taskDone || (c.s.taskAsks || 0) >= 3, done: (c) => c.s.lunch !== undefined || (c.s.lunchAsks || 0) >= 3,
      ask: (c) => {
        c.s.lunchAsks = (c.s.lunchAsks || 0) + 1;
        c.say(c.s.lunchAsks === 1 ? "lunch_invite" : "lunch_reask");
      },
      expects: ["lunch_yes", "lunch_no", "lunch_q"],
      suggest: [S_LUNCH],
      yes: (c) => { lunchYes(c); }, no: (c) => { lunchNo(c); } },
    { id: "day", when: (c) => c.s.lunch !== undefined || (c.s.lunchAsks || 0) >= 3, done: (c) => !!c.s.dayDone || (c.s.dayAsks || 0) >= 2,
      ask: (c) => { c.s.dayAsks = (c.s.dayAsks || 0) + 1; c.say("day_ask"); },
      expects: ["day_good", "day_tired", "day_ctx", "thanks_all"],
      suggest: [S_DAY],
      yes: (c) => { dayGood(c); }, no: (c) => { dayTired(c); } },
  ],

  init: (c) => {
    c.s.greetKind = c.chance(0.55) ? "new" : "help";
    c.s.asked = {};
    c.s.qCount = 0;
    // Twists (returning visits only)
    c.s.badgeLate = c.visits >= 1 && c.chance(0.25);
    c.s.coffeeBroken = c.visits >= 1 && c.chance(0.35);
    c.s.mugTwist = c.visits >= 1 && c.chance(0.4);
    c.s.printerJam = c.visits >= 1 && c.chance(0.35);
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- hello ---
    // "I'm new here, today is my first day." (two pieces): one reaction
    first_day(c) { const first = once(c, "first_day"); if (!c.s.introduced) introduced(c); else if (first) c.say("ack"); },
    not_new(c) { if (c.s.introduced) { c.say("ack"); return; } c.s.lastQ = "help"; c.say("how_help"); c.hold(); },
    intro_name(c, slots) { named(c, slots.name); },
    intro_ctx(c, slots) {
      named(c, slots.name);
      // an answer to "Are you new here?" with a name counts as yes; otherwise the step asks it
      if (!c.s.introduced && c.s.lastQ === "new") introduced(c);
    },
    nice_meet(c) {
      if (!c.s.introduced) { introduced(c); return; }
      if (once(c, "nice") && !c.s.niceSaid) { c.s.niceSaid = true; c.say("nice_too"); }
    },
    her_name(c) { c.say(c.s.introduced ? "my_name_is" : "my_name_is"); },

    // --- desk ---
    desk_ok(c) { c.s.deskDone = true; c.say("glad_like"); },
    q_password(c) {
      c.s.deskDone = true; c.s.topic = "laptop";
      if (/\bchange\b/.test(heard(c))) c.say("a_change"); else c.say("a_password");
    },
    q_login(c) { c.s.deskDone = true; c.s.topic = "laptop"; c.say("a_login"); },
    q_badge(c) {
      c.s.deskDone = true;
      if (c.s.badgeLate) { c.say("badge_late"); return; }
      if (c.s.badgeDone) { c.say("a_badge"); return; }
      c.s.badgeDone = true; c.s.topic = "badge";
      c.say("a_badge"); c.event("give", { item: "badge" });
    },
    q_wifi(c) { c.s.deskDone = true; c.say("a_wifi"); },
    q_desk(c) { c.s.deskDone = true; c.say("a_desk"); },
    q_it(c) { c.s.deskDone = true; c.say("a_it"); },

    // --- where things are ---
    q_coffee(c) { question(c, "coffee"); coffeeWhere(c); },
    q_kitchen(c) { question(c, "kitchen"); c.say("a_kitchen"); },
    q_fridge(c) { question(c, "fridge"); c.s.topic = "fridge"; c.say("a_fridge"); },
    q_printer(c) {
      question(c, "printer"); c.s.topic = "printer";
      if (/\bhow\b/.test(heard(c))) c.say("a_print_how"); else c.say("a_printer");
      if (c.s.printerJam && !c.s.jamSaid) { c.s.jamSaid = true; c.twist("printer_jam"); c.say("printer_jam"); c.say("printer_fix"); }
    },
    q_restroom(c) { question(c, "restroom"); c.say("a_restroom"); },
    q_meeting(c) { question(c, "meeting"); c.say("a_meeting"); },
    q_dress(c) { question(c, "dress"); c.say("a_dress"); },
    q_lunch_time(c) { question(c, "lunch_time"); c.say("a_lunch_time"); },
    q_home_time(c) { question(c, "home_time"); c.say("a_home_time"); },
    q_mug(c) {
      question(c, "mug"); c.s.topic = "mug";
      if (c.s.mugTwist && !c.s.mugSaid) { mugTwist(c); return; }
      c.say("a_mug");
    },
    q_who(c) { question(c, "who"); c.say("a_who"); },
    q_parking(c) { question(c, "parking"); c.say("a_parking"); },
    q_help(c) { question(c, "help"); c.say("a_help"); },
    q_how(c) { howItWorks(c); },
    show_me(c) { howItWorks(c); },
    q_other_ctx(c) {
      question(c, "other");
      const h = heard(c);
      c.say(/^\s*where\b/.test(h) ? "a_unknown_where" : /^\s*(is there|do you|do we)\b/.test(h) ? "a_unknown_have" : "a_unknown");
    },
    no_more(c) { if (c.step === "tour") c.s.tourDone = true; else c.say("ack"); },
    more_q(c) { c.say("sure_what"); c.hold(); },

    // --- first task ---
    send_file(c) {
      if (!c.s.taskAsks) { c.say("which_file"); return; }
      if (c.s.sent) { if (!turn(c).sent) c.say("ack"); return; } // "Sure! Where's the file?" — just offered
      c.s.sent = true;
      c.say("file_sent");
      if (c.s.shown || c.step === "task") c.s.taskDone = true;
    },
    task_ok(c) { if (c.step === "task" || c.s.taskAsks) taskOk(c); else c.say("ack"); },
    know_system(c) { c.s.shown = true; c.say("know_ok"); if (c.step === "task") taskOk(c); },
    // "I can't do it" / "I don't know how": Maria shows the system (never taken as "I'll do it")
    task_cant(c) {
      if (!c.s.taskAsks) { c.say("ack"); return; }
      c.s.shown = true; c.say("show_system");
      if (c.s.sent) c.s.taskDone = true; else c.hold();
    },

    // --- lunch ---
    lunch_yes(c) { if (c.s.lunchAsks) lunchYes(c); else c.say("ack"); },
    lunch_no(c) { if (c.s.lunchAsks) lunchNo(c); else c.say("ack"); },
    lunch_q(c) {
      const h = heard(c);
      if (/\bwhere\b|\bfar\b|\bclose\b|\bnear\b/.test(h)) c.say("a_thai_where");
      else if (/\bmuch\b|\bexpensive\b|\bcheap\b/.test(h)) c.say("a_thai_price");
      else if (/\bfood\b|\bthai\b/.test(h)) c.say("a_thai_food");
      else if (/\bcard\b/.test(h)) c.say("a_thai_card");
      else c.say("a_thai_time");
      if (c.step === "lunch") { c.say("lunch_reask"); c.hold(); }
    },
    fancy_q(c) { if (c.step === "lunch") lunchYes(c); else c.say("ack"); },

    // --- end of the day ---
    day_good(c) { if (c.step === "day") dayGood(c); else if (once(c, "good")) c.say("ack"); },
    day_tired(c) { if (c.step === "day") dayTired(c); else if (once(c, "tired")) c.say("ack"); },
    day_ctx(c) { if (/busy|long|tiring|exhausting/.test(heard(c))) dayTired(c); else dayGood(c); },
    see_you(c) { c.say("bye_reply"); c.end(); },
    thanks_all(c) {
      if (c.step === "day" && !c.s.dayDone) { dayGood(c); return; }
      c.say("welcome_reply");
    },

    // --- side moves ---
    oops(c) { c.say("no_worries"); },
    coffee_want(c) { if (!c.s.coffeeKnown) { coffeeWhere(c); return; } howItWorks(c); },
    tea_ok(c) { if (!c.s.coffeeKnown) { coffeeWhere(c); return; } c.say(c.s.brokenSaid ? "coffee_alt" : "ack"); },
    coffee_later(c) { if (!c.s.coffeeKnown) { coffeeWhere(c); return; } c.say("ack"); },
  },

  finish: (c) => {
    c.complete();
    c.say("see_tomorrow");
    c.expect({ id: "closing", hints: ["bye"], suggest: [{ lt: "Atsisveikinti", hint: "bye" }],
      on: {
        see_you: (cc) => { cc.say("bye_reply"); cc.end(); },
        g_bye: (cc) => { cc.say("bye_reply"); cc.end(); },
        g_thanks: (cc) => { cc.say("welcome_reply"); cc.say("bye_reply"); cc.end(); },
        thanks_all: (cc) => { cc.say("welcome_reply"); cc.say("bye_reply"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Hi! I'm Tomas. It's my first day.", intent: "intro_ctx", step: "hello" },
    { say: "Yes, I'm new here.", intent: "first_day" },
    { say: "Today is my first day.", intent: "first_day" },
    { say: "My name is Tomas.", intent: "intro_name" },
    { say: "Tomas", intent: "intro_ctx", step: "name" },
    { say: "Tomas", intent: "none" },
    { say: "Nice to meet you too!", intent: "nice_meet" },
    { say: "Thanks! This is great.", intent: "desk_ok" },
    { say: "How do I log in?", intent: "q_login" },
    { say: "Do I need to change the password?", intent: "q_password" },
    { say: "Where's the coffee machine?", intent: "q_coffee" },
    { say: "How does it work?", intent: "q_how" },
    { say: "Could you show me how this works?", intent: "show_me" },
    { say: "Where's the printer?", intent: "q_printer" },
    { say: "Where are the toilets?", intent: "q_restroom" },
    { say: "Where can I put my lunch?", intent: "q_fridge" },
    { say: "Is there a dress code?", intent: "q_dress" },
    { say: "What time do people have lunch?", intent: "q_lunch_time" },
    { say: "Can I use this mug?", intent: "q_mug" },
    { say: "Who's that?", intent: "q_who" },
    { say: "No, that's all for now.", intent: "no_more", step: "tour" },
    { say: "Is there a gym?", intent: "q_other_ctx", step: "tour" },
    { say: "Could you send me that file?", intent: "send_file" },
    { say: "Sure, I can do that.", intent: "task_ok", step: "task" },
    { say: "Okay, I do it.", intent: "task_ok", step: "task" },
    { say: "Do we have a dress code?", intent: "q_dress" },
    { say: "I'd love to!", intent: "lunch_yes", step: "lunch" },
    { say: "Thanks, but I brought my lunch today.", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "I can't today, sorry.", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Maybe next time!", intent: "lunch_no", step: "lunch" },
    { say: "Where is it?", intent: "lunch_q", step: "lunch" },
    { say: "Do you fancy grabbing lunch?", intent: "fancy_q" },
    { say: "It was great!", intent: "day_good", step: "day" },
    { say: "Tiring, but I love it here!", intent: "day_tired", step: "day" },
    { say: "I'm a bit tired.", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "See you tomorrow!", intent: "see_you" },
    { say: "Thanks for everything!", intent: "thanks_all" },
    { say: "Oops, sorry!", intent: "oops" },
    { say: "Yes, I am.", intent: "first_day", step: "hello" },
    { say: "Yes, one more question.", intent: "more_q", step: "tour" },
    { say: "What's the password?", intent: "q_password" },
    { say: "Can I wear jeans?", intent: "q_dress" },
    { say: "Good, but a lot of new names.", intent: "day_ctx", step: "day" },
    { say: "Great", intent: "g_ok", not: ["day_good", "day_ctx"] },
    { say: "purple elephant keyboard", intent: "none" },
    { say: "The train leaves from platform nine", intent: "none" },
    // more ways to say it (dev corpus: tests/corpus/s88-first-day.json)
    { say: "Yes, first day", intent: "first_day", step: "hello" },
    { say: "I'm the new accountant", intent: "first_day" },
    { say: "Hi, I'm your new colleague", intent: "first_day" },
    { say: "Likewise", intent: "nice_meet" },
    { say: "I'm very happy to be part of the team", intent: "nice_meet" },
    { say: "When will I get my badge?", intent: "q_badge", step: "desk" },
    { say: "Which desk is mine?", intent: "q_desk", step: "desk" },
    { say: "Who do I call if my laptop doesn't work?", intent: "q_it" },
    { say: "Is there a coffee machine here?", intent: "q_coffee", step: "tour" },
    { say: "Can I put my food in the fridge?", intent: "q_fridge" },
    { say: "What time do we finish work?", intent: "q_home_time", step: "tour" },
    { say: "Everything is clear, thanks", intent: "no_more", step: "tour" },
    { say: "Okay, tea is fine", intent: "tea_ok", step: "coffee" },
    { say: "Please send it to my email", intent: "send_file", step: "task" },
    { say: "I'm not sure how to do it", intent: "show_me", step: "task" },
    { say: "I used this system before", intent: "know_system", step: "task" },
    { say: "Good idea!", intent: "lunch_yes", step: "lunch" },
    { say: "Do they have vegetarian food?", intent: "lunch_q", step: "lunch" },
    { say: "Too much information!", intent: "day_tired", step: "day" },
    { say: "I learned a lot today", intent: "day_good", step: "day" },
    { say: "Sorry, I brought lunch from home", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "I'd like to, but I can't today", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "I'm not coming, sorry", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "I can't do it", intent: "task_cant", step: "task", not: ["task_ok"] },
    { say: "It wasn't easy", intent: "day_tired", step: "day", not: ["day_good", "day_ctx"] },
    { say: "No, I'm not new here", intent: "not_new", step: "hello", not: ["first_day"] },
  ],

  sims: [
    { name: "classic first day", turns: ["Hi! I'm Tomas. It's my first day.", "Nice to meet you too!", "Thanks! This is great.", "Where's the coffee machine?",
      "How does it work?", "Where's the printer?", "No, that's all for now.", "Could you show me how this works?", "Could you send me that file?",
      "I'd love to!", "Tiring, but I love it here!", "See you tomorrow!"], expect: { complete: true }, auto: AUTO },
    { name: "questions first, decline lunch", turns: ["Hello!", "Yes, it's my first day today.", "My name is Tomas.", "How do I log in?", "Is there a dress code?",
      "Where are the restrooms?", "What time do people have lunch?", "Can I use this mug?", "Nothing else, thanks.", "Sure, I can do that.",
      "Where is it?", "Thanks, but I brought my lunch today.", "It was great! Everyone is so nice.", "Thanks for everything!"], expect: { complete: true }, auto: AUTO },
    // Short generic answers can't show which question they answer: the opening ("Are you new here?"), the offer to show
    // the coffee machine and the working machine are pinned, so each answer meets the same question on every seed.
    { name: "short answers", setup: (s) => { s.greetKind = "new"; s.showCoffee = true; s.coffeeBroken = false; },
      turns: ["Yes.", "Tomas.", "Great, thanks!", "Thanks!", "No.", "Sure!", "Okay.", "Sure.", "Good.", "Bye!"], expect: { complete: true }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function introduced(c: Ctx) {
  c.s.introduced = true;
  if (c.s.welcomed) return;
  c.s.welcomed = true;
  if (c.s.named) { c.s.niceSaid = true; c.say("welcome_nice"); } else c.say("welcome_team");
  // the learner answers the welcome ("Nice to meet you too!") before the tour starts
  c.expect({ id: "meet", optional: true, expects: ["nice_meet", "intro_name", "intro_ctx"], hints: ["meet"], suggest: [S_MEET],
    on: { nice_meet: () => { /* the tour follows */ }, g_thanks: () => { /* the tour follows */ } } });
}

function named(c: Ctx, name?: string) {
  if (!name) return;
  const first = !c.s.named;
  c.s.named = true;
  // a name given after Maria's welcome
  if (first && c.s.welcomed && !c.s.niceSaid) { c.s.niceSaid = true; c.say("nice_you"); }
}

/** A question during the tour (counted; after a few Maria moves on). */
function question(c: Ctx, key: string) {
  c.s.deskDone = true;
  if (!c.s.asked[key]) { c.s.asked[key] = true; c.s.qCount++; }
  if (c.s.toured && c.s.qCount >= 4 && c.step === "tour") c.s.tourDone = true;
}

function coffeeWhere(c: Ctx) {
  c.s.coffeeKnown = true;
  c.s.topic = "coffee";
  c.say("a_coffee");
  if (c.s.coffeeBroken && !c.s.brokenSaid) { c.s.brokenSaid = true; c.twist("coffee_broken"); c.say("coffee_broken"); c.say("coffee_alt"); return; }
  // s.showCoffee lets a sim pin the question; unset, it is decided here as before
  if (c.step === "coffee" && (c.s.showCoffee ?? c.chance(0.5))) {
    c.say("a_coffee_more");
    // "Want me to show you how it works?" — a bare "Yes, please" gets the demo
    c.expect({ id: "coffee_show", optional: true, expects: ["q_how", "show_me", "coffee_want", "tea_ok", "coffee_later", "q_mug"], hints: ["coffee"],
      suggest: [{ lt: "Padėkoti arba paklausti, kaip jis veikia", hint: "coffee" }],
      yes: (cc) => { howItWorks(cc); }, no: (cc) => { cc.say("ack"); } });
  }
}

function howItWorks(c: Ctx) {
  const h = heard(c);
  const topic: Topic = /coffee|machine/.test(h) ? "coffee" : /printer|print/.test(h) ? "printer" : /system|program/.test(h) ? "system" : c.s.topic ?? "coffee";
  if (topic === "printer") { c.say("a_how_printer"); return; }
  if (topic === "system" && c.s.taskAsks) { c.s.shown = true; c.say("show_system"); if (c.s.sent) c.s.taskDone = true; else c.hold(); return; }
  if (topic === "laptop") { c.say("show_login"); return; }
  if (topic === "coffee" || topic === "mug" || topic === "fridge") {
    if (c.s.coffeeBroken && c.s.brokenSaid) { c.say("a_how_broken"); return; }
    if (!c.s.coffeeKnown) { c.say("which_one"); coffeeWhere(c); return; }
    c.say("a_how_coffee");
    if (c.s.mugTwist && !c.s.mugSaid) { mugTwist(c); return; }
    c.say("wash_cup");
    return;
  }
  c.say("a_how_coffee");
}

function mugTwist(c: Ctx) {
  c.s.mugSaid = true;
  c.twist("mug");
  c.say("mug_twist");
  c.expect({ id: "mug", optional: true, expects: ["oops"], hints: ["oops"], suggest: [{ lt: "Atsiprašyti", hint: "oops" }],
    on: { oops: (cc) => { cc.say("no_worries"); }, g_sorry: (cc) => { cc.say("no_worries"); }, g_thanks: (cc) => { cc.say("no_worries"); } } });
}

function taskOk(c: Ctx) {
  if (!c.s.sent) { c.s.sent = true; turn(c).sent = true; c.say("send_offer"); }
  c.say("task_ok_reply");
  c.s.taskDone = true;
}

function lunchYes(c: Ctx) {
  if (c.s.lunch !== undefined) { c.say("ack"); return; }
  c.s.lunch = true;
  c.say("lunch_yes_reply");
}

function lunchNo(c: Ctx) {
  if (c.s.lunch !== undefined) { c.say("ack"); return; }
  c.s.lunch = false;
  c.say("lunch_no_reply");
}

function dayGood(c: Ctx) {
  if (c.s.dayDone) return;
  c.s.dayDone = true;
  c.say("day_good_reply");
}

function dayTired(c: Ctx) {
  if (c.s.dayDone) return;
  c.s.dayDone = true;
  c.say("day_tired_reply");
}

export default firstDay;
