// Song 80 "Your Call Is Important to Us" — calling NetWave, the internet provider.
// First the automated phone menu (NetWave bot: "For billing, say 'billing' or press 1…"),
// then agent Claire: name, account number (or look-up by phone number), the problem
// (internet down since yesterday, router light blinking red), "Have you tried turning it off
// and on again?", a line test, a technician visit (Thursday between 8 and 12 → "I'm at work" →
// "Could someone else be home?" / another window), a reference number, "Anything else?".
// Phone skills: the line breaks up, "Could you speak up?", asking to text the number.
// Twists: a 20-minute hold (visits ≥ 1), being charged twice → refund (visits ≥ 1 suggestion),
// Claire can't hear the account number (any visit).

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Days and time windows for the technician

const WDAYS: EntityDef[] = [
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m", { chip: "ketvirtadienis" }),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m", { chip: "penktadienis" }),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m", { chip: "šeštadienis" }),
];

interface Win { d: string; en: string; lt: string; say: string; pm: boolean }
const WINDOWS: Record<string, Win> = {
  thu_am: { d: "thursday", en: "8 and 12", lt: "8 iki 12", say: "eight and twelve", pm: false },
  thu_pm: { d: "thursday", en: "1 and 5", lt: "13 iki 17", say: "one and five", pm: true },
  fri_am: { d: "friday", en: "8 and 12", lt: "8 iki 12", say: "eight and twelve", pm: false },
  sat: { d: "saturday", en: "12 and 4", lt: "12 iki 16", say: "twelve and four", pm: true },
};
const win = (k: string) => ({ en: WINDOWS[k].en, lt: WINDOWS[k].lt, say: WINDOWS[k].say });

const REFERENCE = { en: "NW-48213", lt: "NW-48213", say: "N W, four eight two one three" };
const CHARGE = 6499;

// ---------------------------------------------------------------------------
// State helpers

const internet = (c: Ctx) => ["down", "slow", "drops"].includes(c.s.problem);
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
/** A goodbye in the same sentence ("No, that's all. Bye."). */
const BYE = /\b(bye|goodbye|good bye|see you|talk to you later|take care)\b/i;
/** One-word replies that the {name} slot would swallow ("Pardon?" read as a name): the intent they really are.
 *  "ok" / "no" = Claire says "Go ahead" and waits / asks again. */
const NOT_A_NAME: Record<string, string> = {
  sorry: "g_repeat", pardon: "g_repeat", what: "g_repeat", huh: "g_repeat", again: "g_repeat",
  wait: "g_wait", moment: "g_wait", second: "g_wait", hold: "g_wait", hang: "g_wait",
  bye: "g_bye", goodbye: "g_bye", thanks: "g_thanks", thank: "g_thanks", hello: "g_hello", hey: "g_hello",
  sure: "ok", yes: "ok", yeah: "ok", yep: "ok", yup: "ok", all: "ok", alright: "ok", right: "ok", fine: "ok",
  certainly: "ok", absolutely: "ok", course: "ok", problem: "ok", ready: "ok", nope: "no",
};
function goAhead(c: Ctx) { c.say("go_ahead"); c.hold(); }
/** true = the "name" was one of those words and has been handled as what it really is. */
function notAName(c: Ctx, word: string): boolean {
  const g = NOT_A_NAME[word.trim().toLowerCase()];
  if (!g) return false;
  if (g === "ok") goAhead(c);
  else if (g !== "no") ((support.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
  return true;
}

const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}

/** Claire takes over from the automated menu (once). */
function claireOn(c: Ctx) {
  if (c.s.claire) return false;
  c.s.claire = true;
  c.speaker("claire");
  if (c.s.longHold) c.say("thanks_patience");
  c.say("claire_greet");
  if (c.s.problem && internet(c)) c.say("claire_context");
  return true;
}

function route(c: Ctx, where: "support" | "billing" | "sales" | "agent") {
  if (c.s.routed) return;
  c.s.routed = where;
  c.speaker("netwave_bot");
  c.say(where === "billing" ? "bot_connect_billing" : where === "agent" ? "bot_connect_agent" : "bot_connect_support");
  c.say("bot_important");
  if (c.s.longHold) { c.say("bot_wait_long"); c.twist("long_hold"); }
  else if (c.chance(0.5)) c.say("bot_wait");
}

function setProblem(c: Ctx, p: string) {
  if (c.s.problem && internet(c)) return false;
  c.s.problem = p;
  return true;
}

function offerWindow(c: Ctx, k: string, first = false) {
  c.s.window = k;
  c.s.offered = c.s.offered || [];
  if (!c.s.offered.includes(k)) c.s.offered.push(k);
  const w = WINDOWS[k];
  c.say(first ? "tech_offer" : "tech_offer_alt", { D: w.d, win: win(k) });
}

function bookTech(c: Ctx) {
  const k = c.s.window;
  if (!k || c.s.techBooked) return;
  c.s.techBooked = k;
  const w = WINDOWS[k];
  c.say("tech_booked", { D: w.d, win: win(k) });
  c.say("tech_call_ahead");
  c.say("reference", { text: REFERENCE });
  c.complete();
}

const SUPPORT_AUTO: Record<string, string> = {
  menu: "Technical support.", since: "Since yesterday.", lights: "The light is blinking red.", restart: "Yes, I tried that.",
  restart_now: "Okay, done.", still_red: "Yes, it's still blinking red.", someone: "Yes, my wife can be home.", account: "It's 742-9133.",
  hear: "Yes, that's better.", problem: "My internet isn't working.", problem_bill: "My internet isn't working.", tech: "That works.",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_MENU: Suggestion = { lt: "Pasirinkti techninę pagalbą (pasakyti „support“ arba „two“)", hint: "menu" };
const S_PROBLEM: Suggestion = { lt: "Pasakyti, kad nuo vakar neveikia internetas", hint: "problem" };
const S_BILL: Suggestion = { lt: "Pasakyti, kad šį mėnesį nuskaičiavo du kartus", hint: "billing" };
const S_PHONE: Suggestion = { lt: "Jei blogai girdi – paprašyti kalbėti garsiau", hint: "phone" };

const PROBLEM_EXPECTS = ["internet_down", "internet_slow", "internet_drops", "charged_twice", "it_broken_ctx", "slow_ctx"];

function problemStep(id: string, withBill: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.routed && !!c.s.chargeTwist === withBill,
    done: (c) => !!c.s.problem,
    ask: (c) => { claireOn(c); c.say(bump(c, "problem") === 0 ? "ask_problem" : "ask_problem_again"); },
    expects: PROBLEM_EXPECTS,
    suggest: withBill ? [S_PROBLEM, S_BILL, S_PHONE] : [S_PROBLEM, S_PHONE],
  };
}

// ---------------------------------------------------------------------------

export const support: SituationDef = {
  id: "s80-support-call",
  song: 80,
  songTitle: "Your Call Is Important to Us",
  title: { en: "Your Call Is Important to Us", lt: "Jūsų skambutis mums svarbus" },
  topic: { en: "Calling customer service", lt: "Skambutis klientų aptarnavimui" },
  chapter: 3,
  order: 9,
  location: "phone",
  npc: "claire",
  npcs: ["netwave_bot"],
  mode: "phone",
  goal: "Paskambink interneto tiekėjui: pranešk apie gedimą ir susitark dėl meistro vizito.",
  intro: "Nuo vakar neveikia internetas – maršrutizatoriaus lemputė mirksi raudonai. Skambini į „NetWave“ klientų aptarnavimą. Pirmiausia atsilieps automatinis meniu. Tavo kliento numeris: 742-9133.",
  entities: { wday: WDAYS },

  grammar: {
    macros: {
      net: "(internet | wi fi | wifi | internet connection | connection | router)",
      notw: "(is not working | does not work | is down | is out | stopped working | is not connecting | will not connect | has stopped working | is off | is dead | does not work at all | is not working at all)",
      who: "(my wife | my husband | my roommate | my neighbor | my partner | my mom | my mother | my son | my daughter | my friend | someone | my brother | my sister)",
      tech: "(technician | a technician | the technician | someone | an engineer #tip:uk_engineer | the engineer #tip:uk_engineer)",
    },
  },

  intents: {
    // --- automated menu
    menu_support: { patterns: [
      "support #h:menu_support", "(technical | tech) support #h:menu_tech", "technical", "tech", "(internet | technical) (problem | help)", "internet support", "i have a technical problem",
      "internet", "(my | the) internet", "(internet | wi fi) problems", "support for my internet", "i need technical support",
      "(wi fi | wifi)", "support for [my] (internet | wi fi | wifi)",
    ] },
    menu_billing: { patterns: ["billing [please] #h:menu_billing", "(press | pressing | i will press) one", "(a | my) bill", "i have a question about my bill", "payment", "payments"] },
    menu_sales: { patterns: ["sales [please]", "new service", "(press | pressing | i will press) three"] },
    menu_agent: { patterns: [
      "(representative | agent | operator | a person | a human | a real person | customer service | customer support) [please] #h:menu_agent",
      "(i want to | i would like to | can i | could i | let me) (speak | talk) (to | with) (a | an) (person | human | real person | agent | representative | operator)",
      "(i want to | i would like to | can i | could i) (speak | talk) (to | with) (someone | somebody)",
      "(agent | representative | operator) please", "(press | pressing) zero", "help", "i need help", "(can | could) you help me",
    ] },
    menu_num_ctx: { patterns: [
      "[press | pressing | i will press | option | number] (one #n1 | 1 #n1 | three #n3 | 3 #n3 | zero #n0 | 0 #n0)",
      "[press | pressing | i will press | option | number] (two | 2) #n2 #h:menu_two",
      "[the] (first #n1 | second #n2 | third #n3) (option | one)",
    ] },

    // --- identity
    name_ctx: { patterns: ["[my name is | it is | this is | i am | yes this is] {name} #h:name_mine", "my first name is {name} and my last name is {name}",
      "(my | the) (surname | last name | family name) is {name} [and] [my] first name [is] {name}", "[my | the] name is {name}"] },
    account_ans: { patterns: [
      "(my account number is | the account number is | my customer number is | it is) {digits} #h:acct_is", "(sure | yes) [it is] {digits}",
      "my account number is {digits} [and] {digits}", "(the | my) (number | customer number | client number | account) is {digits}",
      "[wait | one second | one moment] i have it [here | right here] [it is] {digits}",
    ] },
    account_ctx: { patterns: ["{digits}"] },
    acct_unknown: { patterns: [
      "i do not (have | know) (it | my account number | the account number) [with me] #h:acct_unknown", "i (can not | could not) find (it | my account number)",
      "i do not remember [it | my account number]", "where (can | do) i find (it | my account number)", "[sorry] i do not know my account number",
      "(can | could) you (use | find it with | look it up with | look me up with) my (phone number | name | address)", "i (forgot | lost) (it | my account number)",
    ] },

    // --- the problem
    // #since: the answer to "When did it stop working?" is already in the sentence
    internet_down: { patterns: [
      "[also | and | and also] [my | the] @net @notw [(since | from) (yesterday | last night | this morning | {day}) #since] [at home] #h:prob_down", "i need help with my @net", "(the | my) @net @notw", "i (have | have got) no internet [since yesterday #since] #h:prob_none",
      "i can not (connect | get online | use the internet) [to the internet] #h:prob_connect", "i am calling about my (internet | wi fi | wifi) [it is not working]",
      "my (wi fi | wifi) @notw #h:prob_wifi", "my router [light] is (blinking | flashing) red #h:prob_router",
      "(my | the) internet stopped working yesterday #h:prob_stopped #since", "there is no internet", "the internet is not working at all", "nothing works",
      "[my | the] @net (stopped working | went down | went out | died) (yesterday | last night | this morning | yesterday evening | yesterday afternoon | on {day}) #since",
      "i am having (problems | trouble) with my (internet | wi fi | wifi | connection) #h:prob_trouble", "(i have | there is) a problem with my (internet | wi fi | connection)",
      "my internet is (down | out)",
      "(no internet | no wi fi) [at all]", "(i have | there is) a problem with (my | the) (internet | wi fi | connection | internet connection)",
      "since (yesterday | last night | this morning) i have no internet #since", "i can not (open | load) (any | the)? (websites | web pages | pages | anything)",
    ] },
    // "The connection is very bad." as the answer to "What's going on?" (elsewhere it's about the phone line)
    slow_ctx: { patterns: ["[my | the] [internet] connection is [very | really | so] (bad | poor | terrible | slow)"] },
    internet_slow: { patterns: ["my (internet | wi fi | wifi | connection) is [very | really | so | too] slow", "the internet is [very | really | so] slow", "it is [very | really] slow"] },
    internet_drops: { patterns: ["(my internet | it | the wi fi | the connection) keeps (disconnecting | dropping | cutting out | going off)", "(it | the internet) (disconnects | drops) all the time"] },
    it_broken_ctx: { patterns: ["it (does not work | is not working | stopped working | is broken | is down | does not connect)", "nothing works", "it is not connecting"] },
    charged_twice: { patterns: [
      "i was charged twice [this month | for the same bill] #h:bill_twice", "you charged me twice [this month]", "i (have been | got) charged twice [this month]",
      "there are two (charges | payments) on my (bill | card | account)", "my bill is wrong", "i paid twice [this month]", "i think i paid twice",
      "(also | and) i was charged twice", "you charged me (twice | two times)", "i was charged two times",
    ] },
    since_ans: { patterns: [
      "since (yesterday | last night | this morning | yesterday evening | yesterday afternoon | the weekend | {day}) #h:since_y", "(yesterday | last night | this morning | yesterday evening | two days ago | a few days ago) #h:since_when",
      "it stopped [working] (yesterday | last night | this morning | on {day})", "(since | from) {day}", "about {number} days ago", "for {number} days",
      "it stopped [working] (yesterday | last night | this morning | on {day}) [at | around] {time}", "from (yesterday | last night | this morning)",
      "[about | maybe] (a day | one day | a couple of days | two days)",
    ] },
    lights_ans: { patterns: [
      "(the | a | one) light is (blinking | flashing) red #h:lights_red", "there is a (red | orange) light [blinking | flashing | on] #h:lights_there", "(one | a) light is (red | orange | blinking)", "(there is | i see | i can see) a (red | blinking red | flashing red | blinking | flashing | orange) light",
      "it is (blinking | flashing) [red]", "(red | blinking red | flashing red | orange)", "no lights [at all] #h:lights_none", "(all | the) lights are (off | green | on)", "(the | a) light is (red | off | orange)",
      "the (power | internet | wi fi) light is (red | off | orange | blinking | green)", "it is (red | orange | off | green)",
      "(red | orange) [and] (blinking | flashing)", "[the] light (blinks | flashes | is blinking) red",
      "(the | my) router has a (red | blinking | blinking red | flashing | orange) light", "i (see | can see) only one (red | orange | blinking) light", "[only] one (red | orange) light",
    ] },
    restart_yes: { patterns: [
      "[yes] i (tried | did | have) [that | it] [(three | 3 | two | many | a few | ten) times] #h:restart_did", "yes of course [(three | ten | many) times]",
      "[yes] i [already] (restarted | rebooted | unplugged | turned off) (it | the router) [(three | two | many | a few) times] [already]", "[yes] (several | many | a few) times",
      "[yes] i turned it off and on [again] [yes]", "[yes] (twice | once | three times | two times)", "[yes] [i did] [but] it did not help",
      "[yes] i did (it | that) (this morning | yesterday | already)", "[yes] i already (did | tried) (that | it)",
    ] },
    restart_no: { patterns: ["[no] (not yet | i have not | i did not | i have not tried that) #h:restart_not", "no i did not try that", "[no] i did not try [it | that]"] },
    done_ctx: { patterns: [
      "(okay | all right | right) [it is] done #h:done", "[okay] i unplugged it #h:done_unplugged", "(done | finished | okay i did it | i unplugged it | it is unplugged | okay it is back on | i did it | i plugged it back in)",
      "(okay | sure) [one (second | moment)]", "okay i am doing it now", "(sure | okay) i am doing it [now]", "[now] it is unplugged [now]",
    ] },
    still_red: { patterns: [
      "[yes] it is still (red | blinking | blinking red | flashing | the same | orange | blinking orange) #h:still_red", "still (red | blinking | orange)", "[no] nothing (changed | happened) #h:still_nothing", "[no] it is (the same | still not working)",
      "[no] it is still not working", "no change", "[yes] (the same | same as before | still the same)",
    ] },
    green_now: { patterns: ["(it is | the light is) green now", "[yes] it is working now", "green", "now it is green",
      "[no] (it is | the light is) not (red | blinking | orange) (anymore | now | any more)", "[no] it is not blinking (red | orange) anymore"] },

    // --- technician
    tech_accept: { patterns: [
      "(that works | that is fine | that is good | that is perfect | perfect | that works for me) #h:tech_ok", "{day} [morning | afternoon] (is fine | is good | works | is perfect) [for me]",
      "(okay | yes) {day} [morning | afternoon] [is fine]", "i will be (home | there) [then]", "i can be (home | there) [then]", "(okay | yes) book it",
      "between {n1:number} and {n2:number} is (okay | fine | good)", "i (am | will be) working from home [then]",
    ] },
    tech_busy: { patterns: [
      "[sorry] i am at work (then | on {day} | during the day | in the morning) #h:tech_work", "i (work | have work) (then | on {day} | in the morning | during the day)",
      "i can not be (home | there) (then | on {day} | in the morning)", "[no] that does not work [for me]", "[no] i am busy (then | on {day})", "i will not be (home | there)",
      "[no] i can not [then | on {day} | that day]", "i (work | am at work) (until | till) {time}", "i am not (home | there) (in the morning | then | on {day} | during the day)",
    ] },
    someone_yes: { patterns: [
      "[yes] @who can be (home | there) #h:someone_yes", "[yes] @who (is | will be) (home | there) [then | all day]", "[yes] @who", "[yes] @who can let (him | them | the technician) in",
      "@who is {number} [and] [(he | she) can be (home | there)]", "(he | she) can be (home | there)",
      "@who (works | is working) from home [(he | she) can (open the door | let (him | them | the technician) in | be there)]", "(he | she) can (open the door | let (him | them | the technician) in)",
    ] },
    someone_no: { patterns: ["[no] i live alone #h:someone_no", "[no] (nobody | no one) (can be | is | will be) (home | there)", "[no] there is (nobody | no one) [else]", "[no] i am alone", "(nobody | no one) [sorry]"] },
    tech_other: { patterns: [
      "(do you have | is there) anything [on | on the] (saturday | weekend) #h:tech_weekend", "(do you have | is there) anything in the (afternoon | evening) #h:tech_afternoon",
      "(can | could) (he | she | they | you | @tech) come [on] {day} [instead]", "what about (saturday | the weekend | {day} | the afternoon)",
      "(can | could) (he | she | they | you | @tech) come (in the afternoon | later | in the evening | after work | on the weekend) [instead]",
      "(do you have | is there) (anything | something) (later | on another day | next week | in the (afternoon | evening))", "(saturday | the weekend | the afternoon) would be better",
      "is {day} possible", "(what about | how about) {day} [morning | afternoon]", "(is | would) {day} [morning | afternoon] (possible | okay | available)",
    ] },
    tech_cost_q: { patterns: ["how much (does | will) (the technician | the visit | it) cost", "is (the visit | it) free", "do i (have to | need to) pay for (the visit | the technician)"] },
    tech_time_q: { patterns: ["how long will (it | the visit | the repair) take", "how long does it take"] },

    // --- other requests
    manager: { patterns: [
      "(can | could | may) i (speak | talk) (to | with) (a | your) (manager | supervisor) #h:manager", "i (want | would like) to (speak | talk) (to | with) (a | your) (manager | supervisor)",
      "(get | give) me (a | your) (manager | supervisor)", "(manager | supervisor) please",
    ] },
    wait_complaint: { patterns: [
      "i have been (waiting | on hold | holding) for (twenty | 20 | thirty | 30 | forty | ages | a long time | {number}) [minutes] #h:waited",
      "i was on hold for (twenty | 20 | thirty | {number}) minutes", "(that | it) was a [very | really] long wait", "why did i have to wait so long",
    ] },
    reference_q: { patterns: ["(can | could) i (get | have) a (reference | ticket | case) number #h:ref_q", "is there a (reference | ticket | case) number", "what is (my | the) (reference | ticket) number"] },
    text_me: { patterns: ["(can | could) you (text | email | send) (it | that | me the number | the number) [to me] #h:text_me", "please text (it | that) to me", "(can | could) you text me",
      "(can | could) you (text | email | send) me the (reference | ticket | case) number", "(can | could) you send me (an sms | a text | a text message | a message | an email)",
      "(can | could) i get (it | the (reference | ticket | case) number) (by text | by sms | by email | in a text)"] },
    refund_q: { patterns: ["when will i get (my money | the money | it | the refund) back", "when will i get (the | my) refund", "how long (does | will) the refund take", "when do i get (the | my) refund", "when will i see the (refund | money)"] },

    // --- phone line
    speak_up: { patterns: [
      "[sorry] (could | can) you speak up [a (little | bit)] #h:ph_speak_up", "[sorry] (could | can) you speak (louder | a little louder | a bit louder)",
      "[sorry] i (can not | could not) hear you [very well]", "[sorry] you are breaking up #h:ph_breaking", "[sorry] the (line | connection) is (bad | not good | terrible)",
      "hello are you there", "hello can you hear me", "are you [still] there",
    ] },
    hear_me: { patterns: ["can you hear me [now] #h:ph_hear", "can you hear me okay"] },
    hear_ok: { patterns: ["(yes | yeah) i can hear you [now | fine] #h:hear_now", "(yes | yeah) (now | fine | better | loud and clear)", "[yes] (that is | it is) better [now] #h:hear_better", "yes much better", "loud and clear"] },

    // --- general
    more_no: { patterns: [
      "(no | no thanks) [that is] (everything | all) [thank you] #h:more_all", "that is (everything | all) [thanks]", "nothing else", "no that is it", "[no] i am (good | all set)",
      "[no thanks] you (were | have been) (very | really | so)? helpful", "nothing [thanks | thank you]",
    ] },
  },

  lines: {
    // automated menu (speaker: netwave_bot)
    bot_welcome: [
      t("Thank | you | for calling | NetWave.", "Dėkojame | jums, | kad paskambinote | į „NetWave“.", "Dėkojame, kad paskambinote į „NetWave“."),
    ],
    bot_recorded: [
      t("This | call | may | be | recorded | for | quality | purposes.", "Šis | pokalbis | gali | būti | įrašomas | — | kokybės | tikslais.",
        "Pokalbis gali būti įrašomas kokybės užtikrinimo tikslais.", { flags: { 5: "“for”: the instrumental tikslais carries it." } }),
    ],
    bot_menu: [
      t("For | billing, | say | “billing” | or | press | 1. | For | technical | support, | say | “support” | or | press | 2.",
        "Dėl | sąskaitų, | sakykite | „billing“ | arba | spauskite | 1. | Dėl | techninės | pagalbos, | sakykite | „support“ | arba | spauskite | 2.",
        "Sąskaitų klausimais sakykite „billing“ arba spauskite 1. Dėl techninės pagalbos sakykite „support“ arba spauskite 2.",
        { say: "For billing, say billing, or press one. For technical support, say support, or press two." }),
    ],
    bot_menu_sales: [
      t("For | new | service, | say | “sales” | or | press | 3.", "Dėl | naujų | paslaugų, | sakykite | „sales“ | arba | spauskite | 3.",
        "Dėl naujų paslaugų sakykite „sales“ arba spauskite 3.", { say: "For new service, say sales, or press three." }),
    ],
    bot_didnt_get: [t("Sorry, | I | didn't get | that.", "Atsiprašau, | aš | nesupratau | to.", "Atsiprašau, nesupratau.")],
    bot_agent: [
      t("I | can | help | with | that. | Are | you | calling | about | billing | or | technical | support?",
        "Aš | galiu | padėti | dėl | to. | Ar | jūs | skambinate | dėl | sąskaitų | ar | techninės | pagalbos?",
        "Galiu padėti. Ar skambinate dėl sąskaitų, ar dėl techninės pagalbos?",
        { flags: { 5: "Progressive “Are” in a question = the particle ar; skambinate carries the tense (linked to “calling”)." } }),
    ],
    bot_sales: [
      t("Our | sales | team | is | closed | right now. | Connecting | you | to | customer | support.", "Mūsų | pardavimų | komanda | — | nedirba | šiuo metu. | Jungiame | jus | su | klientų | aptarnavimu.",
        "Pardavimų skyrius šiuo metu nedirba. Jungiame jus su klientų aptarnavimu.",
        { flags: { 3: "“is closed” = nedirba: the negated verb carries the copula (linked to “closed”)." } }),
    ],
    bot_connect_support: [
      t("Please | hold | while | I | connect | you | to | technical | support.", "Prašome | palaukti, | kol | aš | sujungsiu | jus | su | technine | pagalba.",
        "Prašome palaukti, kol sujungsiu jus su technine pagalba."),
    ],
    bot_connect_billing: [
      t("Please | hold | while | I | connect | you | to | billing.", "Prašome | palaukti, | kol | aš | sujungsiu | jus | su | sąskaitų skyriumi.",
        "Prašome palaukti, kol sujungsiu jus su sąskaitų skyriumi."),
    ],
    bot_connect_agent: [
      t("Please | hold | for | the | next | available | agent.", "Prašome | palaukti | — | — | kito | laisvo | operatoriaus.", "Prašome palaukti kito laisvo operatoriaus.",
        { flags: { 2: "“for”: palaukti takes the genitive (operatoriaus)." } }),
    ],
    bot_important: [
      t("Your | call | is | important | to us.", "Jūsų | skambutis | yra | svarbus | mums.", "Jūsų skambutis mums svarbus."),
    ],
    bot_wait: [
      t("The | current | wait | time | is | about | 5 | minutes.", "— | Dabartinis | laukimo | laikas | yra | apie | 5 | minutes.", "Šiuo metu laukti reikia apie 5 minutes.",
        { say: "The current wait time is about five minutes." }),
    ],
    bot_wait_long: [
      t("All | of | our | agents | are | busy. | The | current | wait | time | is | about | 20 | minutes.",
        "Visi | — | mūsų | operatoriai | yra | užimti. | — | Dabartinis | laukimo | laikas | yra | apie | 20 | minučių.",
        "Visi mūsų operatoriai užimti. Šiuo metu laukti reikia apie 20 minučių.",
        { say: "All of our agents are busy. The current wait time is about twenty minutes.", flags: { 1: "“of” (all of our): Lithuanian says visi mūsų, with no word for “of”." } }),
    ],

    // Claire
    claire_greet: [
      t("Thank | you | for holding! | This is | Claire.", "Dėkoju | jums, | kad palaukėte! | Klauso | Kler.", "Ačiū, kad palaukėte! Klauso Kler."),
      t("Hi, | thanks | for calling | NetWave! | My | name | is | Claire.", "Sveiki, | ačiū, | kad paskambinote | į „NetWave“! | Mano | vardas | yra | Kler.",
        "Sveiki, ačiū, kad paskambinote į „NetWave“! Mano vardas Kler."),
      t("Hello, | this is | Claire | at | NetWave.", "Laba diena, | klauso | Kler | iš | „NetWave“.", "Laba diena, klauso Kler iš „NetWave“."),
    ],
    thanks_patience: [t("Thank | you | for | your | patience!", "Dėkoju | jums | už | jūsų | kantrybę!", "Ačiū už kantrybę!")],
    claire_context: [
      t("I | see | you're having | trouble | with | your | internet.", "Aš | matau, | jums kyla | problemų | su | jūsų | internetu.", "Matau, kad jums kyla problemų su internetu.",
        { flags: { 3: "Partitive: the genitive problemų carries “trouble”." } }),
    ],
    ask_name: [
      t("Can | I | have | your | name, | please?", "Ar galiu | aš | sužinoti | jūsų | vardą, | prašau?", "Ar galėčiau sužinoti jūsų vardą ir pavardę?"),
      t("Could | I | get | your | name, | please?", "Ar galėčiau | aš | sužinoti | jūsų | vardą, | prašau?", "Ar galėčiau sužinoti jūsų vardą ir pavardę?"),
    ],
    name_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Thanks.", "Ačiū.", "Ačiū.")],
    go_ahead: [
      t("Sure, | go ahead.", "Žinoma, | sakykite.", "Žinoma, sakykite."),
      t("Okay, | go ahead.", "Gerai, | sakykite.", "Gerai, sakykite."),
    ],
    ask_account: [
      t("Could | I | have | your | account | number, | please?", "Ar galėčiau | aš | sužinoti | jūsų | kliento | numerį, | prašau?", "Ar galėčiau sužinoti jūsų kliento numerį?"),
      t("And | what's | your | account | number?", "O | koks yra | jūsų | kliento | numeris?", "O koks jūsų kliento numeris?"),
    ],
    account_found: [
      t("Thank | you. | I | have | your | account | here.", "Dėkoju | jums. | Aš | matau | jūsų | paskyrą | čia.", "Ačiū. Matau jūsų paskyrą.",
        { flags: { 3: "“have” (have it here) = matau (I can see it)." } }),
      t("Great, | I've | got | your | account | up.", "Puiku, | aš | atsidariau | jūsų | paskyrą | —.", "Puiku, jūsų paskyra atidaryta.",
        { flags: { 1: "“'ve”: the perfect auxiliary has no Lithuanian word; the past atsidariau carries it (linked to “got”).", 5: "“up” (got … up): the prefix at- of atsidariau carries it." } }),
    ],
    acct_lookup: [
      t("That's | okay. | What's | the | phone | number | on the account?", "Tai | gerai. | Koks yra | — | telefono | numeris | paskyroje?",
        "Nieko tokio. Koks telefono numeris nurodytas paskyroje?"),
    ],
    acct_where: [
      t("It's | at the top | of | your | bill.", "Jis yra | viršuje | — | jūsų | sąskaitos.", "Jis sąskaitos viršuje.",
        { flags: { 2: "“of”: the genitive sąskaitos carries it." } }),
    ],
    ask_problem: [
      t("How | can | I | help | you | today?", "Kuo | galiu | aš | padėti | jums | šiandien?", "Kuo šiandien galiu padėti?"),
      t("So, | what's | going on?", "Tai | kas | nutiko?", "Tai kas nutiko?",
        { flags: { 1: "“'s” (is): the progressive auxiliary has no Lithuanian word; nutiko carries the event (linked to “going on”)." } }),
    ],
    ask_problem_again: [t("So, | how | can | I | help?", "Tai | kuo | galiu | aš | padėti?", "Tai kuo galiu padėti?")],
    sorry_problem: [
      t("Oh | no, | I'm | sorry | about | that.", "O | ne, | man | gaila | dėl | to.", "O ne, labai gaila."),
      t("I'm | sorry | to hear | that. | Let | me | take a look.", "Man | gaila | girdėti | tai. | Leiskite | man | pažiūrėti.", "Gaila tai girdėti. Tuoj pažiūrėsiu."),
    ],
    ask_since: [
      t("When | did | it | stop | working?", "Kada | — | jis | nustojo | veikti?", "Kada jis nustojo veikti?",
        { flags: { 1: "Question “did” has no Lithuanian word; the past tense sits on nustojo (linked to “stop”)." } }),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("Okay, | thanks.", "Gerai, | ačiū.", "Gerai, ačiū.")],
    ask_lights: [
      t("What | color | is | the | light | on | the | router?", "Kokios | spalvos | yra | — | lemputė | ant | — | maršrutizatoriaus?", "Kokios spalvos lemputė dega ant maršrutizatoriaus?"),
      t("What | lights | do | you | see | on | the | router?", "Kokias | lemputes | — | jūs | matote | ant | — | maršrutizatoriaus?", "Kokias lemputes matote ant maršrutizatoriaus?",
        { flags: { 2: "Question “do” has no Lithuanian word (linked to “see”)." } }),
    ],
    lights_meaning: [
      t("Okay, | that | usually | means | there's | no | signal.", "Gerai, | tai | paprastai | reiškia, | kad nėra | jokio | signalo.", "Gerai, tai paprastai reiškia, kad nėra signalo.",
        { flags: { 4: "Negative concord: nėra is the negated copula; the noun takes the genitive." } }),
    ],
    ask_restart: [
      t("Have | you | tried | turning | it | off | and | on | again?", "Ar | jūs | bandėte | — | jį | išjungti | ir | įjungti | vėl?", "Ar bandėte jį išjungti ir vėl įjungti?",
        { flags: { 0: "Perfect “Have” in a question = the particle ar; the past bandėte carries the tense.", 3: "“turning … off / on”: the Lithuanian verbs išjungti / įjungti (units off, on) carry turn + particle." } }),
      t("Have | you | tried | restarting | the | router?", "Ar | jūs | bandėte | paleisti iš naujo | — | maršrutizatorių?", "Ar bandėte iš naujo paleisti maršrutizatorių?",
        { flags: { 0: "Perfect “Have” in a question = the particle ar; the past bandėte carries the tense." } }),
    ],
    restart_ok: [t("Okay, | thanks | for | trying | that.", "Gerai, | ačiū, | kad | pabandėte | tai.", "Gerai, ačiū, kad pabandėte.")],
    restart_now: [
      t("Could | you | unplug | it | for | 30 | seconds? | I'll wait.", "Ar galėtumėte | jūs | ištraukti | jį | — | 30 | sekundžių? | Palauksiu.",
        "Ar galėtumėte 30 sekundžių jį ištraukti iš lizdo? Palauksiu.", { say: "Could you unplug it for thirty seconds? I'll wait.", flags: { 4: "“for” (duration): 30 sekundžių needs no preposition." } }),
    ],
    plug_back: [
      t("Great. | Now | plug | it | back in. | Is | the | light | still | red?", "Puiku. | Dabar | įjunkite | jį | atgal. | Ar | — | lemputė | vis dar | raudona?",
        "Puiku. Dabar vėl įjunkite. Ar lemputė vis dar raudona?", { flags: { 5: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    // the learner said the light is orange
    plug_back_orange: [
      t("Great. | Now | plug | it | back in. | Is | the | light | still | orange?", "Puiku. | Dabar | įjunkite | jį | atgal. | Ar | — | lemputė | vis dar | oranžinė?",
        "Puiku. Dabar vėl įjunkite. Ar lemputė vis dar oranžinė?", { flags: { 5: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    still_red_ok: [t("Hmm, | okay.", "Hmm, | gerai.", "Hmm, aišku.")],
    green_ok: [
      t("Oh, | good! | But | I | still | see | a | problem | on | the | line.", "O, | gerai! | Bet | aš | vis dar | matau | — | problemą | — | — | linijoje.",
        "O, gerai! Bet linijoje vis dar matau problemą.", { flags: { 8: "“on”: the locative linijoje carries it." } }),
    ],
    line_test: [
      t("Let | me | test | your | line.", "Leiskite | man | patikrinti | jūsų | liniją.", "Tuoj patikrinsiu jūsų liniją."),
    ],
    line_problem: [
      t("Okay, | I | see | a | problem | with | the | line | outside.", "Gerai, | aš | matau | — | problemą | su | — | linija | lauke.", "Gerai, matau problemą su linija lauke."),
    ],
    need_tech: [
      t("We'll need | to send | a | technician.", "Mums reikės | atsiųsti | — | meistrą.", "Reikės atsiųsti meistrą."),
    ],
    tech_offer: [
      t("I | can | send | a | technician | {D}, | between | {$win}. | Would | that | work?", "Aš | galiu | atsiųsti | — | meistrą | {D:acc}, | nuo | {$win} val. | Ar | tai | tiktų?",
        "Galiu atsiųsti meistrą {D:acc}, nuo {$win} val. Ar tiktų?",
        { say: "I can send a technician {D}, between {$win}. Would that work?", flags: { 8: "“Would” in a question = the particle ar; the conditional sits on tiktų (linked to “work”)." } }),
      t("The | earliest | appointment | is | {D}, | between | {$win}.", "— | Anksčiausias | vizitas | yra | {D:acc}, | nuo | {$win} val.", "Anksčiausias vizitas – {D:acc}, nuo {$win} val.",
        { say: "The earliest appointment is {D}, between {$win}." }),
    ],
    tech_offer_alt: [
      t("We | also | have | {D}, | between | {$win}.", "Mes | taip pat | turime | {D:acc}, | nuo | {$win} val.", "Dar turime {D:acc}, nuo {$win} val.", { say: "We also have {D}, between {$win}." }),
      t("How about | {D}, | between | {$win}?", "Gal | {D:acc}, | nuo | {$win} val.?", "Gal {D:acc}, nuo {$win} val.?", { say: "How about {D}, between {$win}?" }),
    ],
    no_day: [
      t("Sorry, | we're | fully | booked | that | day.", "Atsiprašau, | mes | visiškai | užimti | tą | dieną.", "Atsiprašau, tą dieną viskas užimta.",
        { flags: { 1: "“We're … booked”: Lithuanian says užimti (occupied) with no copula (linked to “booked”)." } }),
    ],
    tech_offer_again: [
      t("So, | does | {D} | work | for you?", "Tai | ar | {D:nom} | tinka | jums?", "Tai ar {D:nom} jums tinka?",
        { flags: { 1: "Question “does” = the particle ar." } }),
    ],
    billing_first: [
      t("I | can | help | with | that. | First, | could | I | have | your | account | number?", "Aš | galiu | padėti | dėl | to. | Pirmiausia, | ar galėčiau | aš | sužinoti | jūsų | kliento | numerį?",
        "Galiu padėti. Pirmiausia, ar galėčiau sužinoti jūsų kliento numerį?"),
    ],
    ask_someone: [
      t("Could | someone | else | be | home? | It | has | to be | someone | 18 | or | older.", "Ar galėtų | kas nors | kitas | būti | namie? | Tai | turi | būti | kas nors | 18 metų | ar | vyresnis.",
        "Ar galėtų namie būti kas nors kitas? Tai turi būti ne jaunesnis kaip 18 metų asmuo.", { say: "Could someone else be home? It has to be someone eighteen or older." }),
    ],
    someone_ok: [t("Perfect.", "Puiku.", "Puiku.")],
    no_problem_alt: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    tech_booked: [
      t("Great! | A | technician | will come | {D}, | between | {$win}.", "Puiku! | — | Meistras | atvyks | {D:acc}, | nuo | {$win} val.", "Puiku! Meistras atvyks {D:acc}, nuo {$win} val.",
        { say: "Great! A technician will come {D}, between {$win}." }),
    ],
    tech_call_ahead: [
      t("They'll call | you | 30 | minutes | before | they | arrive.", "Jie paskambins | jums | 30 | minučių | prieš | — | atvykdami.", "Meistras paskambins likus 30 minučių iki atvykimo.",
        { say: "They'll call you thirty minutes before they arrive.", flags: { 5: "“they”: the adverbial participle atvykdami carries the subject (linked to “arrive”)." } }),
    ],
    reference: [
      t("Your | reference | number | is | {$text}.", "Jūsų | užklausos | numeris | yra | {$text}.", "Jūsų užklausos numeris – {$text}.",
        { say: "Your reference number is {$text}.", write: "NetWave reference number: NW-48213" }),
    ],
    reference_again: [
      t("Sure. | It's | {$text}.", "Žinoma. | Jis yra | {$text}.", "Žinoma. Numeris – {$text}.", { say: "Sure. It's {$text}.", write: "NetWave reference number: NW-48213" }),
    ],
    text_it: [
      t("Sure, | I'll text | it | to you | right now.", "Žinoma, | atsiųsiu žinute | jį | jums | dabar pat.", "Žinoma, tuoj atsiųsiu jį žinute."),
    ],
    tech_free: [
      t("There's | no | charge, | since | the | problem | is | on | our | side.", "Nėra | jokio | mokesčio, | nes | — | problema | yra | — | mūsų | pusėje.",
        "Tai nemokama, nes problema mūsų pusėje.", { flags: { 0: "Negative concord: nėra is the negated copula; the noun takes the genitive.", 7: "“on”: the locative pusėje carries it." } }),
    ],
    tech_takes: [t("Usually | about | an | hour.", "Paprastai | apie | — | valandą.", "Paprastai apie valandą.")],

    // billing
    billing_check: [t("Let | me | check...", "Leiskite | man | patikrinti...", "Tuoj patikrinsiu...")],
    billing_right: [
      t("You're | right, | I'm sorry | about | that!", "Jūs esate | {m:teisus|f:teisi}, | atsiprašau | dėl | to!", "Jūs {m:teisus|f:teisi}, atsiprašau!"),
    ],
    billing_two: [
      t("I | see | two | charges | of | {$amount} | this | month.", "Aš | matau | du | nuskaičiavimus | po | {$amount} | šį | mėnesį.", "Matau, kad šį mėnesį du kartus nuskaičiuota po {$amount}.",
        { say: "I see two charges of {$amount} this month." }),
    ],
    refund: [
      t("I'll refund | one | of | them. | You'll see | it | in | 3–5 | business | days.", "Grąžinsiu | vieną | iš | jų. | Pamatysite | jį | per | 3–5 | darbo | dienas.",
        "Vieną iš jų grąžinsiu. Pinigus pamatysite per 3–5 darbo dienas.", { say: "I'll refund one of them. You'll see it in three to five business days." }),
    ],
    credit: [
      t("And | I'll add | a | credit | for | the | days | without | internet.", "Ir | pridėsiu | — | kompensaciją | už | — | dienas | be | interneto.", "Ir kompensuosiu dienas be interneto."),
    ],
    refund_when: [t("In | 3–5 | business | days.", "Per | 3–5 | darbo | dienas.", "Per 3–5 darbo dienas.", { say: "In three to five business days." })],

    // manager, waiting
    manager_ok: [
      t("I | understand. | I | can | ask | my | supervisor | to call | you | back.", "Aš | suprantu. | Aš | galiu | paprašyti | savo | vadovo | perskambinti | jums | —.",
        "Suprantu. Galiu paprašyti savo vadovo jums perskambinti.", { flags: { 9: "“back” (call … back): the prefix per- of perskambinti carries it." } }),
    ],
    manager_first: [
      t("But | let | me | try | to fix | this | for you | first.", "Bet | leiskite | man | pabandyti | sutvarkyti | tai | jums | pirmiausia.", "Bet pirmiausia leiskite pabandyti tai sutvarkyti."),
    ],
    wait_sorry: [t("I'm | so | sorry | about | the | wait.", "Man | labai | gaila | dėl | — | laukimo.", "Labai atsiprašau, kad teko laukti.")],

    // phone line
    breaking_up: [
      t("Sorry, | you're breaking up | a little. | Could | you | say | that | again?", "Atsiprašau, | ryšys trūkinėja | truputį. | Ar galėtumėte | jūs | pasakyti | tai | dar kartą?",
        "Atsiprašau, ryšys truputį trūkinėja. Ar galėtumėte pakartoti?"),
      t("Sorry, | I | missed | that. | Could | you | repeat | the | number?", "Atsiprašau, | aš | nenugirdau | to. | Ar galėtumėte | jūs | pakartoti | — | numerį?",
        "Atsiprašau, nenugirdau. Ar galėtumėte pakartoti numerį?"),
    ],
    speak_up_ok: [
      t("Oh, | sorry! | Is | this | better?", "O, | atsiprašau! | Ar | taip | geriau?", "O, atsiprašau! Ar dabar geriau?",
        { flags: { 2: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
      t("Sorry | about | that! | Can | you | hear | me | now?", "Atsiprašau | dėl | to! | Ar | jūs | girdite | mane | dabar?", "Atsiprašau! Ar dabar mane girdite?",
        { flags: { 3: "“Can” with a verb of perception: Lithuanian uses the plain verb girdite; ar carries the question." } }),
    ],
    hear_you: [
      t("Yes, | I | can | hear | you | fine.", "Taip, | aš | — | girdžiu | jus | gerai.", "Taip, girdžiu jus gerai.",
        { flags: { 2: "“can” with a verb of perception: Lithuanian uses the plain verb girdžiu." } }),
    ],
    hear_great: [t("Great!", "Puiku!", "Puiku!")],

    anything_else: [
      t("Can | I | help | you | with anything | else | today?", "Ar galiu | aš | padėti | jums | kuo nors | dar | šiandien?", "Ar dar kuo nors šiandien galiu padėti?"),
      t("Is | there | anything | else | today?", "Ar yra | — | kas nors | dar | šiandien?", "Ar dar ko nors šiandien reikia?",
        { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”." } }),
    ],
    anything_else_yes: [t("Sure, | what | else | can | I | do | for you?", "Žinoma, | ką | dar | galiu | aš | padaryti | jums?", "Žinoma, kuo dar galiu padėti?")],
    bye: [
      t("Thank | you | for calling | NetWave. | Have | a | great | evening!", "Dėkoju | jums, | kad paskambinote | į „NetWave“. | Linkiu | — | puikaus | vakaro!",
        "Ačiū, kad paskambinote į „NetWave“. Puikaus vakaro!"),
      t("Thanks | for | your | patience. | Have | a | good | night!", "Ačiū | už | jūsų | kantrybę. | Linkiu | — | gero | vakaro!", "Ačiū už kantrybę. Gero vakaro!"),
    ],
  },

  domains: {
    win: () => Object.keys(WINDOWS).map(win),
    text: () => [REFERENCE],
    amount: () => [CHARGE],
  },

  hints: {
    menu: {
      lt: "Pasirinkti meniu punktą",
      items: [
        { id: "menu_support", s: t("Support.", "Pagalba.", "Techninė pagalba."), note: "Robotas laukia vieno žodžio: „support“ (pagalba)." },
        { id: "menu_two", s: t("Two.", "Du.", "Dvejetas (antras meniu punktas)."), note: "Arba tiesiog pasakyk skaičių: „two“." },
        { id: "menu_tech", s: t("Technical | support, | please.", "Techninė | pagalba, | prašau.", "Techninė pagalba, prašau.") },
        { id: "menu_billing", s: t("Billing.", "Sąskaitos.", "Sąskaitos.") },
        { id: "menu_agent", s: t("Representative, | please.", "Operatorių, | prašau.", "Operatorių, prašau."), note: "Jei robotas nesupranta, dažnai padeda „representative“ arba „agent“." },
      ],
    },
    name: {
      lt: "Pasakyti vardą ir pavardę",
      items: [{ id: "name_mine", s: t("My | name | is | {$name} | {$surname}.", "Mano | vardas | yra | {$name} | {$surname}.", "Mano vardas – {$name} {$surname}.") }],
    },
    account: {
      lt: "Pasakyti kliento numerį",
      items: [
        { id: "acct_is", s: t("My | account | number | is | 742-9133.", "Mano | kliento | numeris | yra | 742-9133.", "Mano kliento numeris – 742-9133.",
          { say: "My account number is seven four two, nine one three three." }), note: "Numerį sakyk po vieną skaitmenį." },
        { id: "acct_unknown", s: t("Sorry, | I | don't know | my | account | number.", "Atsiprašau, | aš | nežinau | savo | kliento | numerio.", "Atsiprašau, nežinau savo kliento numerio.") },
      ],
    },
    problem: {
      lt: "Pasakyti, kas neveikia",
      items: [
        { id: "prob_down", s: t("My | internet | isn't working.", "Mano | internetas | neveikia.", "Man neveikia internetas.") },
        { id: "prob_stopped", s: t("My | internet | stopped | working | yesterday.", "Mano | internetas | nustojo | veikti | vakar.", "Vakar nustojo veikti internetas.") },
        { id: "prob_wifi", s: t("My | Wi-Fi | isn't working.", "Mano | „Wi-Fi“ | neveikia.", "Man neveikia „Wi-Fi“.") },
        { id: "prob_connect", s: t("I | can't connect | to | the | internet.", "Aš | negaliu prisijungti | prie | — | interneto.", "Negaliu prisijungti prie interneto.") },
        { id: "prob_router", s: t("My | router | is | blinking | red.", "Mano | maršrutizatorius | — | mirksi | raudonai.", "Maršrutizatorius mirksi raudonai.",
          { flags: { 2: "Progressive “is” has no Lithuanian word; mirksi carries the tense (linked to “blinking”)." } }) },
        { id: "prob_trouble", s: t("I'm having | trouble | with | my | Wi-Fi.", "Man kyla | problemų | su | savo | „Wi-Fi“.", "Man kyla problemų su „Wi-Fi“.",
          { flags: { 1: "Partitive: the genitive problemų carries “trouble”." } }) },
        { id: "prob_none", s: t("I | have | no | internet | since | yesterday.", "Aš | neturiu | jokio | interneto | nuo | vakar.", "Nuo vakar neturiu interneto.",
          { flags: { 1: "Negative concord: neturiu is the negated verb (linked to “no”)." } }), note: "Taisyklingiau: „I haven't had internet since yesterday“, bet taip irgi supras." },
        { id: "lights_red", s: t("The | light | is | blinking | red.", "— | Lemputė | — | mirksi | raudonai.", "Lemputė mirksi raudonai.",
          { flags: { 2: "Progressive “is” has no Lithuanian word; mirksi carries the tense (linked to “blinking”)." } }) },
        { id: "since_y", s: t("Since | yesterday.", "Nuo | vakar.", "Nuo vakar.") },
      ],
    },
    billing: {
      lt: "Pasakyti apie dvigubą mokestį",
      items: [
        { id: "bill_twice", s: t("I | was | charged | twice | this | month.", "Man | — | nuskaičiavo | du kartus | šį | mėnesį.", "Šį mėnesį man nuskaičiavo du kartus.",
          { flags: { 1: "Passive “was”: Lithuanian uses the active impersonal nuskaičiavo with the dative man (linked to “charged”)." } }) },
      ],
    },
    restart: {
      lt: "Atsakyti apie maršrutizatoriaus perkrovimą",
      items: [
        { id: "restart_did", s: t("Yes, | I | tried | that | three | times.", "Taip, | aš | bandžiau | tai | tris | kartus.", "Taip, bandžiau tris kartus.") },
        { id: "restart_not", s: t("No, | not yet.", "Ne, | dar ne.", "Ne, dar ne.") },
      ],
    },
    tech: {
      lt: "Susitarti dėl meistro vizito",
      items: [
        { id: "tech_ok", s: t("That | works | for me.", "Tai | tinka | man.", "Man tinka.") },
        { id: "tech_work", s: t("Sorry, | I'm | at work | then.", "Atsiprašau, | aš esu | darbe | tada.", "Atsiprašau, tuo metu būsiu darbe.") },
        { id: "tech_weekend", s: t("Do | you | have | anything | on | Saturday?", "Ar | jūs | turite | ką nors | — | šeštadienį?", "Ar turite laiko šeštadienį?",
          { flags: { 0: "Question “Do” = the particle ar.", 4: "“on”: the accusative šeštadienį carries it." } }) },
        { id: "tech_afternoon", s: t("Is | there | anything | in | the | afternoon?", "Ar yra | — | kas nors | — | — | popiet?", "Ar yra kas nors popiet?",
          { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”.", 3: "“in the afternoon” = popiet: one Lithuanian adverb (linked to “afternoon”)." } }) },
        { id: "someone_yes", s: t("My | wife | can | be | home.", "Mano | žmona | gali | būti | namie.", "Namie gali būti mano žmona.") },
        { id: "someone_no", s: t("No, | I | live | alone.", "Ne, | aš | gyvenu | {m:vienas|f:viena}.", "Ne, gyvenu {m:vienas|f:viena}.") },
      ],
    },
    other: {
      lt: "Kiti prašymai",
      items: [
        { id: "manager", s: t("Could | I | speak | to | a | manager?", "Ar galėčiau | aš | pasikalbėti | su | — | vadovu?", "Ar galėčiau pasikalbėti su vadovu?") },
        { id: "waited", s: t("I've been | on hold | for | twenty | minutes!", "Aš laukiu | ragelyje | jau | dvidešimt | minučių!", "Jau dvidešimt minučių laukiu!",
          { flags: { 2: "“for” (duration): jau + the genitive minučių." } }) },
        { id: "ref_q", s: t("Could | I | get | a | reference | number?", "Ar galėčiau | aš | gauti | — | užklausos | numerį?", "Ar galėčiau gauti užklausos numerį?") },
        { id: "text_me", s: t("Could | you | text | it | to me?", "Ar galėtumėte | jūs | atsiųsti žinute | jį | man?", "Ar galėtumėte atsiųsti jį žinute?") },
      ],
    },
    phone: {
      lt: "Susikalbėti telefonu",
      items: [
        { id: "ph_speak_up", s: t("Sorry, | could | you | speak up?", "Atsiprašau, | ar galėtumėte | jūs | kalbėti garsiau?", "Atsiprašau, ar galėtumėte kalbėti garsiau?") },
        { id: "ph_breaking", s: t("Sorry, | you're breaking up.", "Atsiprašau, | ryšys trūkinėja.", "Atsiprašau, ryšys trūkinėja.") },
        { id: "ph_hear", s: t("Can | you | hear | me | now?", "Ar | jūs | girdite | mane | dabar?", "Ar dabar mane girdite?",
          { flags: { 0: "“Can” with a verb of perception: Lithuanian uses the plain verb girdite; ar carries the question." } }) },
      ],
    },
    since: {
      lt: "Pasakyti, nuo kada neveikia",
      items: [
        { id: "since_y", s: t("Since | yesterday.", "Nuo | vakar.", "Nuo vakar.") },
        { id: "since_when", s: t("Yesterday | evening.", "Vakar | vakare.", "Vakar vakare.") },
      ],
    },
    lights: {
      lt: "Apibūdinti lemputes",
      items: [
        { id: "lights_red", s: t("The | light | is | blinking | red.", "— | Lemputė | — | mirksi | raudonai.", "Lemputė mirksi raudonai.",
          { flags: { 2: "Progressive “is” has no Lithuanian word; mirksi carries the tense (linked to “blinking”)." } }) },
        { id: "lights_there", s: t("There's | a | red | light.", "Yra | — | raudona | lemputė.", "Dega raudona lemputė.") },
        { id: "lights_none", s: t("No | lights | at all.", "Jokių | lempučių | visai.", "Nedega jokia lemputė.") },
      ],
    },
    done: {
      lt: "Pasakyti, kad išjungei",
      items: [
        { id: "done", s: t("Okay, | done.", "Gerai, | padaryta.", "Gerai, padariau.") },
        { id: "done_unplugged", s: t("Okay, | I | unplugged | it.", "Gerai, | aš | ištraukiau | jį.", "Gerai, ištraukiau iš lizdo.") },
      ],
    },
    still: {
      lt: "Pasakyti, ar lemputė vis dar raudona",
      items: [
        { id: "still_red", s: t("It's | still | blinking | red.", "Ji | vis dar | mirksi | raudonai.", "Vis dar mirksi raudonai.",
          { flags: { 0: "“It's” = it is: progressive “is” has no Lithuanian word; mirksi carries the tense (ji = lemputė)." } }) },
        { id: "still_nothing", s: t("No, | nothing | changed.", "Ne, | niekas | nepasikeitė.", "Ne, niekas nepasikeitė.",
          { flags: { 2: "Negative concord: nepasikeitė is the negated verb (linked to “nothing”)." } }) },
      ],
    },
    someone: {
      lt: "Atsakyti, ar kas nors galės būti namie",
      items: [
        { id: "someone_yes", s: t("My | wife | can | be | home.", "Mano | žmona | gali | būti | namie.", "Namie gali būti mano žmona.") },
        { id: "someone_no", s: t("No, | I | live | alone.", "Ne, | aš | gyvenu | {m:vienas|f:viena}.", "Ne, gyvenu {m:vienas|f:viena}.") },
      ],
    },
    hear: {
      lt: "Atsakyti, ar dabar girdi",
      items: [
        { id: "hear_better", s: t("Yes, | that's | better.", "Taip, | taip | geriau.", "Taip, dabar geriau.", { flags: { 1: "“that's” = taip (this way): the copula has no Lithuanian word here." } }) },
        { id: "hear_now", s: t("Yes, | I | can | hear | you | now.", "Taip, | aš | — | girdžiu | jus | dabar.", "Taip, dabar girdžiu.",
          { flags: { 2: "“can” with a verb of perception: Lithuanian uses the plain verb girdžiu." } }) },
      ],
    },
    more: {
      lt: "Pasakyti, kad tai viskas",
      items: [{ id: "more_all", s: t("No, | thanks, | that's | everything.", "Ne, | ačiū, | tai yra | viskas.", "Ne, ačiū, tai viskas.") }],
    },
  },

  tips: {
    uk_engineer: { key: "uk_engineer", lt: "Suprasta! Amerikoje namų interneto meistras dažniausiai vadinamas „technician“.", better: "Can a technician come on Saturday?" },
  },

  merges: {
    "for calling": { reason: "grammatical_fusion", split: "for → už + calling → skambinimas is a calque; thanks for calling = kad paskambinote.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal reading; an invitation to speak = sakykite.", minimal: "Two words." },
    "for holding": { reason: "grammatical_fusion", split: "for → už + holding → laikymas is a calque; thanks for holding = kad palaukėte.", minimal: "Two words." },
    "this is": { reason: "lexical_expression", split: "this → tai + is → yra gives a statement about an object; on the phone “This is Claire” = klauso Kler.", minimal: "Two words; the name stays outside." },
    "didn't get": { reason: "grammatical_fusion", split: "Lithuanian negation is the verb prefix ne-; didn't get (understand) = nesupratau.", minimal: "Two words." },
    "right now": { reason: "lexical_expression", split: "right → dešinėje/teisingai + now → dabar is false; = šiuo metu / dabar pat.", minimal: "Two words." },
    "you're having": { reason: "grammatical_fusion", split: "you're → jūs esate + having → turintys gives a false stative reading; “you're having trouble” = jums kyla.", minimal: "Two words; the object stays outside." },
    "going on": { reason: "lexical_expression", split: "on → ant is false; “what's going on” = kas nutiko.", minimal: "Two words." },
    "back in": { reason: "lexical_expression", split: "back → atgal + in → į would double the direction; plug it back in = įjungti atgal.", minimal: "Two words." },
    "we'll need": { reason: "grammatical_fusion", split: "We'll → mes + need → reikia drops “will”; the future reikės carries it with the dative mums.", minimal: "Two words." },
    "will come": { reason: "grammatical_fusion", split: "will → — + come → atvyks: the Lithuanian future ending carries “will”.", minimal: "Two words." },
    "they'll call": { reason: "grammatical_fusion", split: "They'll → jie + call → skambins: the future ending carries “will”.", minimal: "Two words." },
    "on the account": { reason: "grammatical_fusion", split: "on → ant + the → — + account → paskyra: the locative paskyroje carries “on the”.", minimal: "No adjective intervenes." },
    "at the top": { reason: "grammatical_fusion", split: "at → prie + the → — + top → viršus: the locative viršuje carries it.", minimal: "No adjective intervenes." },
    "you're breaking up": { reason: "lexical_expression", split: "you're → jūs esate + breaking → laužote + up → aukštyn is false; on a phone line = ryšys trūkinėja.", minimal: "A fixed phone phrase." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree adverb “a little” = truputį.", minimal: "Two words." },
    "speak up": { reason: "lexical_expression", split: "up → aukštyn is prohibited as mechanical; speak up = kalbėti garsiau.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie is false; a suggestion = gal.", minimal: "Two words." },
    "i've been": { reason: "grammatical_fusion", split: "I've → aš turiu is false: the perfect auxiliary has no Lithuanian word; “I've been (waiting)” = aš laukiu (present).", minimal: "Two words." },
    "take a look": { reason: "lexical_expression", split: "take → imti + a → — + look → žvilgsnis is false; = pažiūrėti.", minimal: "A fixed three-word expression." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives “ne dar”; the fixed reply = dar ne.", minimal: "Two words." },
    "on hold": { reason: "lexical_expression", split: "on → ant + hold → laikymas is false; being on hold = laukti ragelyje.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasirink techninę pagalbą", done: (c) => !!c.s.routed },
    { lt: "Pasakyk vardą ir kliento numerį", done: (c) => !!c.s.name && !!c.s.account },
    { lt: "Pasakyk, kas neveikia", done: internet },
    { lt: "Pasakyk apie dvigubą mokestį", done: (c) => !!c.s.refunded, when: (c) => !!c.s.billingPending || !!c.s.refunded, optional: true },
    { lt: "Atsakyk apie maršrutizatorių", done: (c) => !!c.s.lights && c.s.restarted !== undefined && !c.s.restartPending },
    { lt: "Susitark dėl meistro vizito", done: (c) => !!c.s.techBooked },
  ],

  steps: [
    { id: "menu", done: (c) => !!c.s.routed,
      ask: (c) => {
        c.speaker("netwave_bot");
        const n = bump(c, "menu");
        if (n === 0) { c.say("bot_welcome"); c.say("bot_recorded"); }
        else c.say("bot_didnt_get");
        c.say("bot_menu");
        if (n === 0 && c.s.menuSales) c.say("bot_menu_sales");
      },
      expects: ["menu_support", "menu_billing", "menu_sales", "menu_agent", "menu_num_ctx", "internet_down", "charged_twice"],
      suggest: [S_MENU, { lt: "Paprašyti tikro žmogaus (operatoriaus)", hint: "menu" }] },
    { id: "name", when: (c) => !!c.s.routed, done: (c) => !!c.s.name,
      ask: (c) => { claireOn(c); c.say("ask_name"); }, expects: ["name_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti vardą ir pavardę", hint: "name" }, S_PHONE] },
    { id: "account", when: (c) => !!c.s.name, done: (c) => !!c.s.account,
      ask: (c) => { claireOn(c); c.say(c.s.lookup ? "acct_lookup" : "ask_account"); },
      expects: ["account_ans", "account_ctx", "acct_unknown"], yes: goAhead,
      suggest: [{ lt: "Pasakyti kliento numerį: 742-9133", hint: "account" }, S_PHONE] },
    problemStep("problem", false),
    problemStep("problem_bill", true),
    // asked at most twice: a learner who answers something else twice is not asked a third time
    { id: "since", when: (c) => c.s.problem === "down" && !!c.s.askSince && (c.s.asked?.since ?? 0) < 2, done: (c) => !!c.s.since,
      ask: (c) => { bump(c, "since"); c.say("ask_since"); }, expects: ["since_ans"],
      suggest: [{ lt: "Pasakyti, nuo kada neveikia", hint: "since" }] },
    { id: "lights", when: (c) => internet(c), done: (c) => !!c.s.lights,
      ask: (c) => c.say("ask_lights"), expects: ["lights_ans"],
      suggest: [{ lt: "Apibūdinti lemputes (mirksi raudonai)", hint: "lights" }] },
    { id: "restart", when: (c) => internet(c) && !!c.s.lights, done: (c) => c.s.restarted !== undefined,
      ask: (c) => c.say("ask_restart"), expects: ["restart_yes", "restart_no"],
      suggest: [{ lt: "Atsakyti, ar bandei išjungti ir vėl įjungti", hint: "restart" }],
      yes: (c) => { c.s.restarted = true; c.say("restart_ok"); },
      no: (c) => { askRestartNow(c); } },
    { id: "tech", when: (c) => internet(c) && c.s.restarted !== undefined && !c.s.restartPending, done: (c) => !!c.s.techBooked,
      ask: (c) => {
        if (!c.s.diagnosed) { c.s.diagnosed = true; c.say("line_test"); c.say("line_problem"); c.say("need_tech"); offerWindow(c, c.s.firstWindow, true); return; }
        const w = WINDOWS[c.s.window];
        c.say("tech_offer_again", { D: w.d, win: win(c.s.window) });
      },
      expects: ["tech_accept", "tech_busy", "tech_other", "tech_cost_q", "tech_time_q"],
      suggest: [{ lt: "Sutikti arba paprašyti kito laiko", hint: "tech" }],
      yes: (c) => { bookTech(c); },
      no: (c) => { support.handlers.tech_busy(c, {}, { intent: "tech_busy", slots: {}, tags: [] }); } },
    { id: "more", when: (c) => !!c.s.techBooked || (!!c.s.refunded && !internet(c)), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"), expects: ["more_no", "charged_twice", "reference_q", "text_me"],
      suggest: [{ lt: "Pasakyti, kad tai viskas", hint: "more" }, { lt: "Paprašyti numerio SMS žinute ar vadovo", hint: "other" }],
      yes: (c) => { c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.longHold = c.visits >= 1 && c.chance(0.5);
    c.s.chargeTwist = c.visits >= 1 && c.chance(0.5);
    c.s.badLine = c.chance(0.35);
    c.s.askSince = c.chance(0.7);
    c.s.menuSales = c.chance(0.5);
    c.s.firstWindow = c.chance(0.7) ? "thu_am" : "fri_am";
  },

  start: (c) => {
    c.ask("menu");
  },

  handlers: {
    // --- menu
    g_hello(c) {
      // "Hello?" to the automated menu: the menu simply repeats; Claire answers a greeting normally.
      if (!c.s.routed) return;
      if (!c.s.__greetedBack) { c.say("g_hello"); c.s.__greetedBack = true; }
    },
    menu_support(c) { route(c, "support"); },
    menu_billing(c) { route(c, "billing"); },
    menu_sales(c) { c.speaker("netwave_bot"); c.say("bot_sales"); c.s.routed = "sales"; },
    menu_agent(c) {
      if (c.s.routed) { support.handlers.manager(c, {}, { intent: "manager", slots: {}, tags: [] }); return; }
      if (!c.s.agentAsked) {
        c.s.agentAsked = true;
        c.speaker("netwave_bot");
        c.say("bot_agent");
        c.hold();
        return;
      }
      route(c, "agent");
    },
    menu_num_ctx(c, _slots, seg) {
      const n = seg.tags.includes("n1") ? 1 : seg.tags.includes("n2") ? 2 : seg.tags.includes("n3") ? 3 : seg.tags.includes("n0") ? 0 : -1;
      if (n === 1) route(c, "billing");
      else if (n === 2) route(c, "support");
      else if (n === 3) support.handlers.menu_sales(c, {}, { intent: "menu_sales", slots: {}, tags: [] });
      else if (n === 0) support.handlers.menu_agent(c, {}, { intent: "menu_agent", slots: {}, tags: [] });
      // other numbers: the menu repeats itself
    },

    // --- identity
    name_ctx(c, slots) {
      const td = turn(c);
      // "My first name is Tomas and my last name is Mikalauskas": two captures come as a list
      const part = (Array.isArray(slots.name) ? slots.name.join(" ") : String(slots.name || "")).trim();
      if (!part) return;
      if (!/\s/.test(part) && !td.name && notAName(c, part)) return;
      if (!td.name) { td.name = true; const had = !!c.s.name; c.s.name = part; if (!had) c.say("name_thanks"); return; }
      c.s.name = `${c.s.name} ${part}`;
    },
    account_ans(c, slots) { setAccount(c, slots.digits); },
    account_ctx(c, slots) { setAccount(c, slots.digits); },
    acct_unknown(c) {
      if (c.s.account) return;
      if (/where/.test(c.heard.toLowerCase())) { c.say("acct_where"); }
      c.s.lookup = true;
    },

    // --- problem
    internet_down(c, _slots, seg) { if (seg.tags.includes("since")) c.s.since = true; problem(c, "down"); },
    it_broken_ctx(c) { problem(c, "down"); },
    internet_slow(c) { problem(c, "slow"); },
    slow_ctx(c) { problem(c, "slow"); },
    internet_drops(c) { problem(c, "drops"); },
    charged_twice(c) {
      if (!c.s.routed) { route(c, "billing"); c.s.billingPending = true; return; }
      if (c.s.refunded) { c.say("refund_when"); return; }
      claireOn(c);
      if (!c.s.account) { c.s.billingPending = true; if (c.step !== "account" && c.step !== "name") c.say("billing_first"); return; }
      c.s.billingPending = false;
      c.s.refunded = true;
      c.s.moreDone = false;
      if (!c.s.problem) c.s.problem = "billing";
      c.twist("charged_twice");
      c.say("billing_check");
      c.say("billing_right");
      c.say("billing_two", { amount: CHARGE });
      c.say("refund");
      if (internet(c) || c.s.techBooked) c.say("credit");
    },
    since_ans(c) { if (!c.s.since) { c.s.since = true; c.say("ack"); } },
    lights_ans(c) {
      if (c.s.lights) return;
      c.s.lights = true;
      c.s.orange = /orange/i.test(c.heard) && !/red/i.test(c.heard);
      if (!internet(c)) problem(c, "down", true);
      if (/red|orange|blink|flash/.test(c.heard.toLowerCase())) c.say("lights_meaning");
      else c.say("ack");
    },
    restart_yes(c) { if (c.s.restarted !== undefined) return; c.s.restarted = true; c.say("restart_ok"); },
    restart_no(c) { if (c.s.restarted !== undefined) return; askRestartNow(c); },
    done_ctx() { /* handled by the pending questions */ },
    still_red(c) { if (c.s.restartPending) stillRed(c); },
    green_now(c) { if (c.s.restartPending) { c.s.restartPending = false; c.s.restarted = true; c.say("green_ok"); } },

    // --- technician
    tech_accept(c, slots) {
      if (!c.s.window || c.s.techBooked) return;
      const d = slots.day as string | undefined;
      const pmWanted = /afternoon|evening/.test(c.heard.toLowerCase());
      const w = WINDOWS[c.s.window];
      if ((d && d !== w.d) || (d && pmWanted !== w.pm && d === "thursday")) { support.handlers.tech_other(c, slots, { intent: "tech_other", slots, tags: [] }); return; }
      bookTech(c);
    },
    tech_busy(c) {
      if (!c.s.window || c.s.techBooked) return;
      if (!c.s.askedSomeone) {
        c.s.askedSomeone = true;
        c.say("ask_someone");
        c.expect({
          id: "someone", expects: ["someone_yes", "someone_no"], hints: ["tech", "g_yesno"],
          suggest: [{ lt: "Atsakyti, ar kas nors kitas galės būti namie", hint: "someone" }],
          yes: (cc) => { cc.say("someone_ok"); bookTech(cc); },
          no: (cc) => { otherWindow(cc); },
          on: {
            someone_yes: (cc) => { cc.say("someone_ok"); bookTech(cc); },
            someone_no: (cc) => { otherWindow(cc); },
            tech_other: (cc, sl) => { support.handlers.tech_other(cc, sl, { intent: "tech_other", slots: sl, tags: [] }); },
          },
          ask: (cc) => cc.say("ask_someone"),
        });
        return;
      }
      otherWindow(c);
    },
    someone_yes(c) { if (c.s.window && !c.s.techBooked) { c.say("someone_ok"); bookTech(c); } },
    someone_no(c) { if (c.s.window && !c.s.techBooked) otherWindow(c); },
    tech_other(c, slots) {
      if (!c.s.window || c.s.techBooked) return;
      const h = c.heard.toLowerCase();
      const d = slots.day as string | undefined;
      let k = /saturday|weekend/.test(h) || d === "saturday" ? "sat" : /afternoon|evening|later/.test(h) ? "thu_pm" : d === "friday" ? "fri_am" : d === "thursday" ? "thu_am" : undefined;
      if (d && !["saturday", "friday", "thursday"].includes(d) && !k) { c.say("no_day"); k = ["thu_pm", "sat", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat"; }
      if (!k) k = ["thu_pm", "sat", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat";
      if (k === c.s.window) { bookTech(c); return; }
      offerWindow(c, k);
      c.hold();
    },
    tech_cost_q(c) { c.say("tech_free"); },
    tech_time_q(c) { c.say("tech_takes"); },

    // --- other
    manager(c) {
      if (!c.s.routed) { support.handlers.menu_agent(c, {}, { intent: "menu_agent", slots: {}, tags: [] }); return; }
      claireOn(c);
      c.twist("manager");
      c.say("manager_ok");
      if (!c.s.techBooked) c.say("manager_first");
    },
    wait_complaint(c) { claireOn(c); c.say("wait_sorry"); },
    // the ticket exists from the start of the call: Claire always gives the number
    reference_q(c) { c.say("reference_again", { text: REFERENCE }); },
    text_me(c) { textIt(c as ConvCtx); },
    g_write(c) { textIt(c as ConvCtx); },
    refund_q(c) { c.say(c.s.refunded ? "refund_when" : "no_problem_alt"); },

    // --- phone line
    speak_up(c) {
      c.say("speak_up_ok");
      c.expect({
        id: "hear", optional: true, expects: ["hear_ok"], hints: ["hear"],
        suggest: [{ lt: "Atsakyti, ar dabar girdi", hint: "hear" }],
        yes: (cc) => { cc.say("hear_great"); },
        no: (cc) => { cc.say("speak_up_ok"); },
        on: { hear_ok: (cc) => { cc.say("hear_great"); } },
      });
    },
    hear_me(c) { c.say("hear_you"); },
    hear_ok(c) { c.say("hear_great"); },

    more_no(c) {
      const st = support.steps.find((x) => x.id === c.step);
      // "No, that's all. Bye." is a goodbye (the bye handler ends the call), not a "no" to the open question
      if (st && st.id !== "more" && st.no && !st.done(c) && !BYE.test(c.heard)) { st.no(c); return; }
      c.s.moreDone = true;
    },
  },

  finish: (c) => {
    if (c.s.techBooked) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { if (turn(cc).bye) return; turn(cc).bye = true; cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { if (turn(cc).bye) return; turn(cc).bye = true; cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Technical support.", intent: "menu_support", step: "menu" },
    { say: "Tech support, please.", intent: "menu_support", step: "menu" },
    { say: "Two", intent: "menu_num_ctx", step: "menu" },
    { say: "Support.", intent: "menu_support", step: "menu" },
    { say: "Press one.", intent: "menu_billing", step: "menu" },
    { say: "Press two.", intent: "menu_num_ctx", step: "menu" },
    { say: "Billing", intent: "menu_billing", step: "menu" },
    { say: "Representative, please.", intent: "menu_agent", step: "menu" },
    { say: "I want to talk to a real person.", intent: "menu_agent", step: "menu" },
    { say: "My internet isn't working.", intent: "internet_down" },
    { say: "My internet stopped working yesterday.", intent: "internet_down" },
    { say: "I'm having trouble with my Wi-Fi.", intent: "internet_down" },
    { say: "My internet is really slow.", intent: "internet_slow" },
    { say: "Also, my internet isn't working.", intent: "internet_down" },
    { say: "I was charged twice this month.", intent: "charged_twice" },
    { say: "My name is Tomas Mikalauskas.", intent: "name_ctx", step: "name" },
    { say: "My account number is 742-9133.", intent: "account_ans", step: "account" },
    { say: "seven four two nine one three three", intent: "account_ctx", step: "account" },
    { say: "Sorry, I don't know my account number.", intent: "acct_unknown", step: "account", not: ["account_ans"] },
    { say: "Since yesterday.", intent: "since_ans", step: "since" },
    { say: "The light is blinking red.", intent: "lights_ans", step: "lights" },
    { say: "There's a red light.", intent: "lights_ans", step: "lights" },
    { say: "Yes, of course! Three times.", intent: "restart_yes", step: "restart" },
    { say: "No, not yet.", intent: "restart_no", step: "restart", not: ["restart_yes"] },
    { say: "It's still blinking red.", intent: "still_red" },
    { say: "That works for me.", intent: "tech_accept", step: "tech" },
    { say: "Sorry, I'm at work then.", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "My wife can be home.", intent: "someone_yes" },
    { say: "No, I live alone.", intent: "someone_no", not: ["someone_yes"] },
    { say: "Do you have anything on Saturday?", intent: "tech_other", step: "tech" },
    { say: "Could the engineer come on Friday?", intent: "tech_other", step: "tech" },
    { say: "Is the visit free?", intent: "tech_cost_q" },
    { say: "Could I speak to a manager?", intent: "manager" },
    { say: "I've been on hold for twenty minutes!", intent: "wait_complaint" },
    { say: "Could I get a reference number?", intent: "reference_q" },
    { say: "Could you text it to me?", intent: "text_me" },
    { say: "Sorry, you're breaking up.", intent: "speak_up" },
    { say: "No, thanks, that's everything.", intent: "more_no", step: "more" },
    { say: "Could you say that again?", intent: "g_repeat" },
    { say: "When will I get the refund?", intent: "refund_q" },
    { say: "Purple cats are flying tonight", intent: "none" },
    { say: "seven four two nine one three three", intent: "none" },
    { say: "My internet is not slow", intent: "none" },
    // more constructions and vocabulary (dev corpus tests/corpus/s80-support-call.json)
    { say: "Second option", intent: "menu_num_ctx", step: "menu" },
    { say: "Wi-Fi", intent: "menu_support", step: "menu" },
    { say: "My surname is Mikalauskas, first name Tomas", intent: "name_ctx", step: "name" },
    { say: "My client number is 742 9133", intent: "account_ans", step: "account", slots: { digits: "7429133" } },
    { say: "Can you use my phone number?", intent: "acct_unknown", step: "account" },
    { say: "Internet is not working from yesterday", intent: "internet_down", step: "problem" },
    { say: "The connection is very bad", intent: "slow_ctx", step: "problem" },
    { say: "You charged me two times", intent: "charged_twice" },
    { say: "From yesterday", intent: "since_ans", step: "since" },
    { say: "The router has a red light", intent: "lights_ans", step: "lights" },
    { say: "Yes, but it didn't help", intent: "restart_yes", step: "restart", not: ["restart_no"] },
    { say: "Yes, the same", intent: "still_red" },
    { say: "Can he come in the afternoon?", intent: "tech_other", step: "tech" },
    { say: "Between 8 and 12 is okay", intent: "tech_accept", step: "tech" },
    { say: "My wife works from home, she can open the door", intent: "someone_yes" },
    { say: "Can I get the reference number by text?", intent: "text_me", step: "more" },
    // safety
    { say: "I'm not home in the morning", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No, I didn't try", intent: "restart_no", step: "restart", not: ["restart_yes"] },
    { say: "Nobody, sorry", intent: "someone_no", not: ["someone_yes"] },
    { say: "It's not red anymore", intent: "green_now", not: ["still_red"] },
    // bug review 25 Sep: "since" inside the problem sentence, the orange light, goodbye at the technician offer
    { say: "My Wi-Fi stopped working last night.", intent: "internet_down", step: "problem" },
    { say: "My internet went down this morning", intent: "internet_down", step: "problem" },
    { say: "My internet didn't stop working yesterday", intent: "none" },
    { say: "The light is orange.", intent: "lights_ans", step: "lights" },
    { say: "It's still orange.", intent: "still_red" },
    { say: "It's not orange anymore", intent: "green_now", not: ["still_red"] },
    { say: "No, that's all. Bye.", intent: "more_no", step: "tech", not: ["tech_busy"] },
  ],

  sims: [
    { name: "internet down, technician on Thursday",
      turns: ["Technical support.", "Hi, my name is Tomas Mikalauskas.", "My account number is 742-9133.", "My internet stopped working yesterday.", "The light is blinking red.", "Yes, I tried that three times.", "That works for me.", "No, thanks, that's everything."],
      expect: { complete: true }, auto: SUPPORT_AUTO },
    { name: "at work: someone else at home",
      turns: ["Two", "Tomas Mikalauskas.", "Sorry, I don't know my account number.", "555 201 7788", "I'm having trouble with my Wi-Fi.", "Since yesterday.", "There's a red light.", "No, not yet.", "Okay, done.", "It's still blinking red.", "Sorry, I'm at work then.", "My wife can be home.", "Could you text it to me?", "No, that's everything."],
      expect: { complete: true }, auto: SUPPORT_AUTO, setup: (s) => { s.askSince = true; } },
    { name: "agent first, then Saturday",
      turns: ["Representative, please.", "Technical support.", "My name is Tomas.", "It's 742-9133.", "My internet isn't working.", "No lights at all.", "Yes, of course. Ten times.", "I'm at work then.", "No, I live alone.", "Do you have anything on Saturday?", "Saturday is fine.", "Could I get a reference number?", "No, that's all, thank you."],
      expect: { complete: true }, auto: SUPPORT_AUTO },
    { name: "charged twice too (twist)",
      turns: ["Technical support, please.", "Tomas Mikalauskas.", "It's 742-9133.", "My internet isn't working. And I was charged twice this month.", "The light is blinking red.", "Yes, I did.", "That works.", "When will I get the refund?", "No, that's everything. Thank you!"],
      expect: { complete: true }, auto: SUPPORT_AUTO },
  ],
};

function problem(c: Ctx, p: string, silent = false) {
  if (!c.s.routed) { route(c, "support"); c.s.problem = p; return; }
  claireOn(c);
  if (!setProblem(c, p)) return;
  if (!silent) c.say("sorry_problem");
  if (c.s.refunded) c.s.moreDone = false;
}

function setAccount(c: Ctx, digits: string | undefined) {
  const td = turn(c);
  if (td.rejected || !digits) return;
  if (c.s.badLine && !c.s.badLineDone && c.step === "account") {
    c.s.badLineDone = true; td.rejected = true;
    c.twist("bad_line"); c.say("breaking_up"); c.hold(); return;
  }
  td.digits = (td.digits ?? "") + digits;
  if (!td.ack) {
    td.ack = true;
    if (!c.s.account) {
      c.s.account = td.digits;
      c.say("account_found");
      if (c.s.billingPending) support.handlers.charged_twice(c, {}, { intent: "charged_twice", slots: {}, tags: [] });
      return;
    }
  }
  c.s.account = td.digits;
}

function askRestartNow(c: Ctx) {
  c.s.restartPending = true;
  c.say("restart_now");
  c.expect({
    id: "restart_now", expects: ["done_ctx"], hints: ["restart", "g_yesno"],
    suggest: [{ lt: "Pasakyti, kad išjungei maršrutizatorių", hint: "done" }],
    yes: (cc) => { plugBack(cc); }, no: (cc) => { plugBack(cc); },
    on: { done_ctx: (cc) => { plugBack(cc); }, g_ok: (cc) => { plugBack(cc); }, g_wait: (cc) => { cc.say("ack"); return false; } },
    ask: (cc) => cc.say("restart_now"),
  });
}

function plugBack(c: Ctx) {
  if (turn(c).plug) return;
  turn(c).plug = true;
  c.say(c.s.orange ? "plug_back_orange" : "plug_back");
  c.expect({
    id: "still_red", expects: ["still_red", "green_now"], hints: ["restart", "g_yesno"],
    suggest: [{ lt: "Pasakyti, ar lemputė vis dar raudona", hint: "still" }],
    yes: (cc) => { stillRed(cc); }, no: (cc) => { stillRed(cc); },
    on: { still_red: (cc) => { stillRed(cc); }, green_now: (cc) => { cc.s.restartPending = false; cc.s.restarted = true; cc.say("green_ok"); } },
    ask: (cc) => cc.say(cc.s.orange ? "plug_back_orange" : "plug_back"),
  });
}

function stillRed(c: Ctx) {
  c.s.restartPending = false;
  c.s.restarted = true;
  c.say("still_red_ok");
}

function otherWindow(c: Ctx) {
  const k = ["sat", "thu_pm", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat";
  offerWindow(c, k);
  c.hold();
}

/** On the phone "Could you write it down?" = text it: Claire texts the last thing she can write. */
function textIt(c: ConvCtx) {
  const lines = c.conv.lastLines;
  let w: string | null = null;
  for (let i = lines.length - 1; i >= 0 && !w; i--) {
    const src = c.conv.sit.lines[lines[i].lineId]?.[lines[i].variant];
    if (src?.write) w = src.write;
  }
  if (!w && (c.s.techBooked || c.s.claire)) w = "NetWave reference number: NW-48213";
  if (!w) { c.say("no_problem_alt"); c.hold(); return; }
  c.say("text_it");
  c.conv.addNote({ en: w });
  c.hold();
}

export default support;
