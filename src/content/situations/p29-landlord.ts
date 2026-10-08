// P29 "Landlord Blues": the heat has been out for a week, and the landlord, Mr. Patel, is leaving for two
// weeks in Florida. Mr. Patel is the landlord from s81 (he rented the learner the one-bedroom on the second
// floor; formal: jūs) and the one Rita praises in s82 ("He fixes everything really fast"). Today he never
// answers his phone. The learner catches him in the first-floor lobby (s81: he lives on the first floor; s82:
// the mailboxes are in the lobby), explains the problem and how long it has lasted, reminds him that repairs
// are the landlord's job (the lease; s81: heat is included in the $1,400 rent), politely turns down his offer
// ("Fix it yourself, and I'll pay half"), and gets a date out of him: "sometime next week" → "next Wednesday"
// → "Friday morning". Optional: in writing (a text), and the rent with a receipt at the end.
//
// Flow: problem → (thermostat?) → duration → (Rita twist) → dodge → offer → date (completes) → (home?) →
// wrap ("Anything else?") → rent → goodbye. Every answer can come early: what is said fills its step.
// Twist (50%): Rita, getting her mail, backs the learner up ("And you always fix everything so fast!");
// Mr. Patel folds faster. Returning players may get "Oh, it's you again. Let me guess: the heat?".
// Endings: a day for Gus completes the task (stars are not an engine feature: the outcome is stored with
// remember()). Walking away before a day is agreed ends it unfinished. Rude lines get an in-world answer and a
// tip, never a dead end; the dodge step gives in after three tries.
//
// Lithuanian: Mr. Patel and the learner say jūs (lowercase); Rita says tu to the learner and jūs to Mr. Patel.
// {m:…|f:…} is the learner's gender (addressee in NPC lines, speaker in hints).
//
// ART: (no pictures yet; the lead commissions them.) First-person view from the learner's side in the lobby of
// Maple Street Apartments: mailboxes on the left wall, the stairs up, the glass front door with frost on it.
//   1. "hello" (start, problem, guess, howareyou, thermostat, duration): Mr. Patel as in npcs.ts (brown skin,
//      short gray hair, gray mustache, glasses) in a bright Hawaiian shirt under an open winter coat, sunglasses
//      pushed up on his head, a rolling suitcase beside him and keys in his hand, by the front door; the guilty
//      smile of a man caught on his way out. A small cloud of breath in the cold air.
//   2. "rita" (rita, the twist): the same lobby; Rita (curly red hair, orange top, as in s82) at the mailboxes
//      with a few letters in her hand, arms crossed, a "really?" look; Mr. Patel deadpan.
//   3. "dodge" (dodge, offer): Mr. Patel with his palms up and a shrug ("it's an old building"), then holding out
//      a big wrench with a hopeful grin.
//   4. "date" (date, home): Mr. Patel looking at his phone's calendar, one finger raised ("let me see…").
//   5. "rent" (wrap, rent): Mr. Patel holding a small receipt pad and a pen, the suitcase handle in his other hand.
//   6. "bye" (closing): Mr. Patel at the open front door, sunglasses down, waving, the suitcase rolling out.
//
// NEEDS: (optional) the game ignores the "text-message" event sent when Mr. Patel texts the day; it could show
// the text ("Gus · Friday · 9 a.m.–noon") as a note or a phone buzz.

import type { Ctx, EntityDef, Pending, SituationDef, Suggestion, Tip } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_ARE_Q = "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_DO_Q = "Question “Do” = the particle ar.";
const F_HAVE_Q = "Question “Have” = the particle ar; the past tense sits on the verb.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_ITS = "“It's” = tai; “is” needs no word here.";
const F_THATS = "“That's” = tai; “is” needs no word here.";
const F_IVE = "“I've”: the perfect auxiliary has no word; the past tense of the verb carries it.";
const F_ON_DAYPART = "“on” before a day part has no word; the accusative rytą carries the time.";

// ---------------------------------------------------------------------------
// Entities: the days Gus can come (for "{X} works", "Great. {X}, between 9 and noon.")

const VISIT_DAYS: EntityDef[] = [
  ent("wednesday", "next | Wednesday", "kitas/kito/kitam/kitą/kitu/kitame | trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m",
    { art: "", chip: "kitą trečiadienį" }),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m", { art: "", chip: "penktadienį" }),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m", { art: "", chip: "šeštadienį" }),
];

// ---------------------------------------------------------------------------
// Helpers

const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("patel"); c.say(line, vars); };
const R = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("rita"); c.say(line, vars); };

/** Days since it started, counted back from today (a Wednesday). "Since (last) Monday" = the latest Monday. */
const SINCE: Record<string, number> = { monday: 2, tuesday: 1, wednesday: 7, thursday: 6, friday: 5, saturday: 4, sunday: 3, today: 1, tomorrow: 1 };

/** How many days the learner's duration means (null: no duration in this answer). */
function daysOf(slots: any, tags: string[], heard: string): number | null {
  const n = typeof slots?.number === "number" ? slots.number : null;
  if (tags.includes("wks")) return n && n < 20 ? n * 7 : 14;
  if (tags.includes("wk")) return 7;
  if (tags.includes("days")) return n ?? 3;
  if (tags.includes("few")) return 3;
  if (tags.includes("short")) return 1;
  if (typeof slots?.day === "string" && SINCE[slots.day] !== undefined) return SINCE[slots.day];
  if (/\b(all|whole) week\b|\blast week\b/i.test(heard)) return 7;
  return null;
}

/** The heat, the radiators, the cold: a sentence that names the problem. */
const mentionsHeat = (h: string) => /\b(heat|heating|heater|radiators?|boiler|furnace|cold|freezing|warm)\b/i.test(h);

const TIPS: Record<string, Tip> = {
  too_blunt: { key: "too_blunt", lt: "Suprasta! Angliškai „You must…“, „I demand…“ ar „Fix it now“ skamba kaip įsakymas. Tvirtumo suteikia ramus tonas, o ne komanda.", better: "I'm afraid it's your responsibility to fix it." },
  threat_legal: { key: "threat_legal", lt: "Suprasta! Grasinimai iš karto uždaro pokalbį. Šioje scenoje mokomės ramiai ir tvirtai priminti, kas parašyta sutartyje.", better: "According to the lease, repairs are your responsibility." },
  withhold: { key: "withhold", lt: "Suprasta! Šioje scenoje mokomės sąžiningo, bet tvirto pokalbio, todėl grasinti nemokėti nuomos nereikia (tai ne teisinis patarimas). Geriau paprašyk konkrečios datos.", better: "When can someone come out?" },
  rude_insult: { key: "rude_insult", lt: "Suprasta! Įžeidimai nepadės. Geriau ramiai pasakyk, kad ilgai kantriai laukei, bet situacija rimta.", better: "I've been patient, but this is getting serious." },
  tense_since: { key: "tense_since", lt: "Suprasta! Kai kas nors tęsiasi iki dabar, angliškai reikia Present Perfect: „has been broken“. Trukmė su „for“ (for a week), pradžia su „since“ (since Monday).", better: "The heating has been broken for a week." },
  calque_go: { key: "calque_go", lt: "Suprasta! Lietuviškai sakome „šildymas neina“, bet angliškai šildymas „isn't working“ arba „is broken“.", better: "The heating isn't working." },
  master: { key: "master", lt: "Suprasta! „Meistras“ angliškai nėra „master“. Sakyk „repairman“, „plumber“ arba tiesiog „someone“.", better: "When can someone come out?" },
  renovation: { key: "renovation", lt: "Suprasta! „Renovation“ reiškia didelį remontą ar atnaujinimą. Sutaisyti šildymą – „fix“ arba „repair“.", better: "When can someone fix it?" },
  us_celsius: { key: "us_celsius", lt: "Suprasta! Amerikoje temperatūra matuojama Farenheito laipsniais (15 °C ≈ 59 °F). Paprasčiau pasakyti, kad bute labai šalta.", better: "It's freezing in my apartment." },
  bare_no: { key: "bare_no", lt: "Suprasta! Vien „No.“, „No way!“ ar „Forget it.“ angliškai skamba šiurkščiai. Pridėk mandagią priežastį.", better: "That's not what we agreed." },
  us_check: { key: "us_check", lt: "Suprasta! Amerikoje čekis rašomas „check“.", better: "Here's the check." },
  uk_flat: { key: "uk_flat", lt: "Suprasta! Amerikoje sakoma „apartment“ (butas).", better: "It's freezing in my apartment." },
  us_lease: { key: "us_lease", lt: "Suprasta! Buto nuomos sutartis Amerikoje vadinama „lease“.", better: "According to the lease, repairs are your responsibility." },
  uk_fortnight: { key: "uk_fortnight", lt: "Suprasta! Amerikoje sakoma „two weeks“.", better: "The heating has been broken for two weeks." },
  uk_ring: { key: "uk_ring", lt: "Suprasta! Amerikoje sakoma „I called you“.", better: "I've called you every day." },
  uk_mobile: { key: "uk_mobile", lt: "Suprasta! Amerikoje mobilusis telefonas – „cell phone“.", better: "I called your cell phone every day." },
  uk_holiday: { key: "uk_holiday", lt: "Suprasta! Amerikoje atostogos – „vacation“.", better: "Enjoy your vacation!" },
};

/** Rude or threatening lines: an in-world answer each time; after the third, Mr. Patel asks to start over. */
function rude(c: Ctx) {
  c.s.rude = (c.s.rude || 0) + 1;
  c.s.rudeHeard = c.heard;
  if (c.s.rude === 3) P(c, "blunt_last");
}

// --- duration -----------------------------------------------------------------

function setDur(c: Ctx, days: number, react = true) {
  c.s.dur = days;
  if (react) P(c, days >= 10 ? "dur_react_long" : days >= 5 ? "dur_react_week" : "dur_react_short");
}

// --- the twist: Rita backs the learner up ------------------------------------------

function ritaBye(c: Ctx) {
  if (!c.s.ritaBye) { c.s.ritaBye = true; R(c, "rita_bye"); }
  c.speaker("patel");
}

function ritaTwist(c: Ctx) {
  c.s.ritaShown = true;
  c.twist("rita");
  R(c, "rita_in"); R(c, "rita_back"); R(c, "rita_irony");
  P(c, "patel_rita");
  c.expect({ id: "rita", optional: true, expects: ["thanks_rita", "g_thanks"], hints: ["rita", "dodge"],
    suggest: [{ lt: "Padėkoti Ritai", hint: "rita" }, { lt: "Priminti nuomotojo pareigą", hint: "dodge" }],
    on: { thanks_rita: (cc) => { ritaBye(cc); }, g_thanks: (cc) => { ritaBye(cc); } } });
}

// --- the dodge and the offer ----------------------------------------------------------

function askDodge(c: Ctx) {
  c.s.dodgeAsks = (c.s.dodgeAsks || 0) + 1;
  if (c.s.dodgeAsks === 1) {
    if (c.s.ritaShown) P(c, "dodge_after_rita");
    else if (c.s.sweater) { P(c, "dodge_sweater"); P(c, "kidding"); }
    else P(c, "dodge_old");
    P(c, "dodge_q");
    return;
  }
  // three tries without a clear request: he gives in (the scene never stalls here), though not right after "Let's start over"
  if (c.s.dodgeAsks >= 4 && !(c.s.rude === 3 && c.s.rudeHeard === c.heard)) { dodgeHelp(c); return; }
  P(c, "dodge_q");
}

function dodgeHelp(c: Ctx) {
  if (c.s.resp) return;
  c.s.resp = "soft";
  P(c, "dodge_help");
  c.ask("offer");
}

function askOffer(c: Ctx) {
  if (!c.s.offerSaid) { c.s.offerSaid = true; P(c, "offer"); P(c, "offer2"); return; }
  P(c, "offer_reask");
}

function refuse(c: Ctx) {
  if (c.s.offer) return;
  c.s.offer = "refused";
  P(c, "offer_refused_react");
}

function acceptOffer(c: Ctx) {
  if (c.s.offer) return;
  c.s.offer = "accepted";
  P(c, "offer_accepted_react"); P(c, "offer_accepted2");
}

/** The offer is on the table (the learner's answer goes to it). */
const offerOpen = (c: Ctx) => !!c.s.resp && !c.s.offer;

// --- the date ---------------------------------------------------------------------------

function askDate(c: Ctx) {
  if (c.s.level === 0) {
    if (!c.s.vagueSaid) { c.s.vagueSaid = true; P(c, "vague"); } else P(c, "vague_reask");
    return;
  }
  if (c.s.level === 1) { if (!c.s.wedSaid) offerWednesday(c); else P(c, "date_reask"); return; }
  if (!c.s.friSaid) offerFriday(c); else P(c, "friday_reask");
}

function offerWednesday(c: Ctx) {
  c.s.level = 1;
  c.s.wedSaid = true;
  P(c, "date_offer");
}

/** "Okay, okay. Gus can come out on Friday morning. Between 9 and noon. Okay?" (`lead`: a reaction first). */
function offerFriday(c: Ctx, lead?: string) {
  c.s.level = 2;
  c.s.friSaid = true;
  if (lead) P(c, lead);
  P(c, lead === "even_better" ? "window_q" : "sooner_react");
  if (lead !== "even_better") P(c, "window_q");
}

/** A day is agreed: the task is done. */
function setDate(c: Ctx, day: string, confirm = true) {
  if (c.s.date) return;
  c.s.date = day;
  if (confirm) P(c, "date_confirm", { X: day });
  c.complete();
  c.remember({ heatFixed: day });
  if (c.s.writingAsked && !c.s.writing) sendText(c, c.s.writingAsked !== c.heard);
}

/** "Thursday or Friday": the day Gus can do (Friday or Saturday if named), else the first. */
function pickDay(day: unknown): string {
  const list = (Array.isArray(day) ? day : [day]).map(String);
  return list.find((d) => d === "friday" || d === "saturday") ?? list[0];
}

/** The learner named a day (or agreed to one: `agree`). */
function proposeDay(c: Ctx, day: string, agree = false) {
  const d = String(day);
  if (agree && ((c.s.level === 1 && d === "wednesday") || (c.s.level === 2 && d === "friday"))) { setDate(c, d); return; }
  if (["today", "tonight", "this_evening", "this_afternoon", "this_morning"].includes(d)) { offerFriday(c, "today_react"); return; }
  if (d === "tomorrow") { offerFriday(c, "tomorrow_react"); return; }
  if (d === "thursday") { offerFriday(c, "thursday_react"); return; }
  if (d === "friday" || d === "day_after_tomorrow") { acceptDay(c, "friday"); return; }
  if (d === "saturday" || d === "this_weekend") { acceptDay(c, "saturday"); return; }
  if (d === "wednesday" && c.s.level >= 1) { setDate(c, "wednesday"); return; }
  if (d === "next_week") { if (c.s.level === 0) offerWednesday(c); else askDate(c); return; }
  // Sunday to Wednesday, next weekend: later than Gus could come
  offerFriday(c, "even_better");
}

function acceptDay(c: Ctx, day: string) {
  P(c, "day_accept", { X: day });
  P(c, "window");
  setDate(c, day, false);
}

/** "Okay." / "That works." to the day on the table ("sometime next week": he names a day). */
function dateYes(c: Ctx) {
  if (c.s.level === 0) { offerWednesday(c); c.hold(); return; }
  setDate(c, c.s.level === 2 ? "friday" : "wednesday");
}

/** "No." to the day on the table: one step sooner. */
function dateNo(c: Ctx) {
  if (c.s.level === 0) offerWednesday(c);
  else if (c.s.level === 1) offerFriday(c);
  else P(c, "friday_best");
  c.hold();
}

/** The text with the day (`promised`: asked for earlier, before there was a day). */
function sendText(c: Ctx, promised = false) {
  c.s.writing = true;
  P(c, promised ? "as_promised" : c.s.resp === true ? "writing_lease" : "writing_react");
  P(c, "text_sent", { X: c.s.date });
  c.event("text-message", { from: "patel", day: c.s.date });
}

// --- the rent ----------------------------------------------------------------------------

function payRent(c: Ctx) {
  if (c.s.rentDone) { P(c, "ack"); return; }
  c.s.rentPaid = true;
  c.s.rentDone = true;
  c.event("pay", { method: "check", amount: 140000 });
  P(c, "rent_thanks");
}

function receiptBeat(c: Ctx) {
  if (c.s.receipt) { P(c, "ack"); return; }
  c.s.receipt = true;
  P(c, "receipt_react"); P(c, "receipt_write");
  c.event("give", { item: "receipt" });
  c.remember({ receipt: true });
}

// --- leaving ----------------------------------------------------------------------------------

function walkAway(c: Ctx) {
  P(c, "walkaway");
  c.end(); c.hold();
}

function byeBack(c: Ctx) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; P(c, "bye_back"); }
  c.end(); c.hold();
}

/** "Bye!" (or "Never mind.") before the end. */
function leave(c: Ctx) {
  if (c.s.__finished) { byeBack(c); return; }
  if (!c.s.date) {
    // a day is being worked out: one more chance
    if (c.s.offer && !c.s.lastChance) { c.s.lastChance = true; P(c, "wait_wait"); askDate(c); c.hold(); return; }
    walkAway(c);
    return;
  }
  // he catches the learner before they go: the rent
  if (!c.s.wrapDone) { c.s.wrapDone = true; return; }
  if (!c.s.rentDone) { c.s.rentDone = true; c.s.rentFight = true; P(c, "walkaway_rent"); c.end(); c.hold(); return; }
  byeBack(c);
}

function finalLine(c: Ctx): string {
  if (c.s.offer === "accepted" && c.s.resp !== true) return "final_partial";
  if (c.s.date === "wednesday") return "final_wed";
  return "final_full";
}

function closing(c: Ctx): Pending {
  const sugg: Suggestion[] = [{ lt: "Padėkoti ir atsisveikinti", hint: "bye" }];
  if (c.s.rentPaid && !c.s.receipt) sugg.unshift({ lt: "Paprašyti kvito", hint: "rent" });
  return { id: "closing", expects: ["trip_wish", "ask_receipt"], hints: ["bye", "rent"], suggest: sugg,
    on: {
      g_bye: (cc) => { byeBack(cc); }, g_thanks: (cc) => { byeBack(cc); }, trip_wish: (cc) => { byeBack(cc); }, walk_away: (cc) => { byeBack(cc); },
      ask_receipt: (cc) => {
        if (cc.s.rentPaid && !cc.s.receipt) receiptBeat(cc); else P(cc, "receipt_for_what");
        cc.expect(closing(cc));
      },
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } };
}

// Automatic answers the simulation uses when Mr. Patel asks one of his optional questions.
const AUTO: Record<string, string> = {
  guess: "Yes, the heating isn't working.", thermostat: "Yes, I checked it twice.", rita: "Thanks, Rita!", home: "Yes, I'll be home.",
  wrap: "No, that's all, thanks.", rent: "Sure. Here's the check.", closing: "Thanks, Mr. Patel. Have a good trip!",
};

// ---------------------------------------------------------------------------

export const landlord: SituationDef = {
  id: "p29-landlord",
  song: "P29",
  songTitle: "Landlord Blues",
  title: { en: "Landlord Blues", lt: "Nuomotojo bliuzas" },
  topic: { en: "A broken heater and the landlord", lt: "Neveikia šildymas: pokalbis su nuomotoju" },
  chapter: 8,
  order: 5,
  location: "apartments",
  npc: "patel",
  npcs: ["rita"],
  goal: "Mandagiai, bet tvirtai paprašyk nuomotojo sutaisyti šildymą ir sutark dėl remonto datos.",
  intro: "Maple gatvės daugiabutis, trečiadienio rytas. Tavo bute jau savaitę neveikia šildymas, o savininkas ponas Patelis neatsiliepia telefonu. Ir štai jis – su lagaminu ir saulės akiniais – jau vestibiulyje prie lauko durų.",
  entities: { visitday: VISIT_DAYS },

  grammar: {
    macros: {
      mr: "(mister | mr) patel",
      apt: "(apartment | place | unit | home | flat #tip:uk_flat)",
      unit: "(2b | two b | 2 b | apartment 2b | apartment two b | apartment {number} | upstairs | the second floor | the apartment upstairs)",
      mypl: "(my @apt | my kitchen | my bedroom | my living room | my bathroom | 2b | apartment 2b | the @apt | here | in here | at home | at my place | upstairs)",
      where: "(in @mypl | at home | at my place | upstairs)",
      heat: "(the heating | the heat | my heating | my heat | heating | heat | the heater | my heater | the radiator | the radiators | my radiator | my radiators | the boiler | the furnace | the heating system | the central heating)",
      broken: "(broken | not working | dead | off | out | down | busted)",
      broken_pp: "(broken | off | out | dead | down | cold)",
      someone: "(someone | somebody | anyone | anybody | a repairman | the repairman | your repairman | a plumber | the plumber | a technician | gus | your guy | a professional | a handyman | the handyman | your handyman)",
      contract: "(contract | lease | rental agreement | agreement | rental contract | tenancy agreement #tip:us_lease)",
      dur: [
        "[about | almost | nearly | over | more than | at least | already | just over] (a | one) [whole | full] week #wk",
        "(a | one) week and a half #wk",
        "[about | almost | nearly | over | more than | at least | already] ({number} | a couple of) weeks #wks",
        "[about | almost | nearly | over | more than | at least | already] {number} days #days",
        "(a few | a couple of | several | two or three | three or four) days #few",
        "(a | one) day #short",
        "(a | one) fortnight #wks #tip:uk_fortnight",
        "a long time #wks",
      ],
      dur_tail: "(for @dur [now | already] | since [last] {day} | since (last week | the weekend | last weekend | yesterday #short | last night #short) | since {date} | all week #wk | the whole week #wk | @dur ago)",
      fixit: "(fix | repair) (it | the heating | the heat | the radiator | the radiators | the boiler | my heating | the heater | that | this)",
      fix_tail: "(soon | quickly | this week | today | as soon as possible | asap | before the weekend)",
      lease_verb: "(fix | fixes | repair | repairs | pay for | pays for | have to fix | has to fix | must fix | is responsible for | are responsible for)",
      lease_obj: "(it | repairs | the heating | the heat | everything | that | the radiators)",
      // what the lease or the law says the landlord does
      resp_tail: "(repairs are your responsibility | it is your responsibility [to fix it] | that is your job | heating is included | heat is included | you have to fix it | you fix it | the landlord fixes it | you pay for repairs | you are responsible for repairs)",
    },
    slots: {},
  },

  intents: {
    // --- greeting --------------------------------------------------------------
    greet_id: { patterns: [
      "[@mr] it is me [from @unit] #h:its_me", "it is (me | {name}) from @unit", "i am [{name}] from @unit",
      "i live in (2b | apartment 2b | apartment two b | apartment {number} | your building | the building)",
      "i am (your | the) tenant [from 2b | in 2b | upstairs | from upstairs]", "[@mr] i am (your | the) tenant",
      "sorry to bother you [@mr] [but it is (important | urgent)] #h:sorry_bother", "[@mr] sorry to bother you [but it is (important | urgent)] #h:sorry_bother",
      "[@mr] (do you have | have you got) a (minute | moment | second) [@mr] #h:minute",
      "(can | could | may) i talk to you [for a (minute | moment | second)]", "can we talk [for a (minute | moment)]",
      "[@mr] wait [a (second | minute | moment)]", "[@mr] (one moment | one second | just a minute)",
      "(good morning | hi | hello | hey) @mr #h:hi_patel", "[excuse me] @mr",
    ] },

    // --- the problem -------------------------------------------------------------
    // "I have a problem." (what problem comes next)
    have_problem: { patterns: ["(i have | we have | there is) a [small | big | little | serious] problem", "something is wrong", "(there is | i have) a problem in my @apt"] },
    heat_broken: { patterns: [
      "the heating has been broken for @dur #h:song_broken",
      "@heat (has | have) been [completely] @broken_pp [again] [@dur_tail] [@where]",
      "@heat (has not | have not) been working [@dur_tail] [@where]",
      "@heat (is | are) [still] [completely] @broken [again] [@where]",
      "@heat (is not | are not) working [@where] [again] #h:heat_not_working",
      "@heat (does not | do not | did not) work [anymore] [@where]",
      "@heat (stopped working | broke | died | stopped | went out | broke down) [@dur_tail | on {day} | last week | @dur ago]",
      "(i have | there is | we have) no (heat | heating | hot air) [@where] [@dur_tail]", "no heat [@where] [@dur_tail]",
      "my radiators are (ice cold | cold | freezing | dead) #h:radiator_cold",
      "the radiators (are ice cold | are cold | are freezing | do not get (warm | hot) | are not (warm | hot))",
      "(there is | i have | we have) a problem with @heat", "something is wrong with @heat",
      "@heat (is not going | does not go) #tip:calque_go",
      "@heat (is | are) (broken | not working) (since @dur | for @dur | since [last] {day} | since last week | already @dur | @dur already) #tip:tense_since",
      "@heat (no | not) (working | work)",
      "@heat (does not | do not) work (already @dur | @dur already | since @dur | for @dur | since [last] {day}) #tip:tense_since",
    ] },
    cold_detail: { patterns: [
      "my kitchen is colder than outside #h:kitchen_colder",
      "it is colder (inside | in here | in my @apt | in the @apt | at home) than outside", "(my @apt | the @apt | my bedroom) is colder than outside",
      "i am sleeping in my coat #h:sleep_coat",
      "i (sleep | am sleeping) (in my coat | in my jacket | with my coat on | in (two | three) sweaters | in my clothes | in a hat | in my hat)",
      "i (wear | am wearing) (gloves | my coat | a hat | wool socks | (two | three) sweaters | a jacket | my jacket) [at home | inside | in the @apt | to watch tv]",
      "i can see my breath [inside | in my kitchen | in here | at home]",
      "it is (freezing | so cold | really cold | very cold | ice cold | too cold) [in @mypl] #h:cold_apt",
      "@mypl is (freezing | so cold | very cold | ice cold | like a fridge | like a freezer)",
      "it is [only] {number} degrees [in @mypl | inside | in here | at home]", "it is [only] {number} degrees celsius [in @mypl | inside]",
      "my cat moved (next door | to the neighbors | in with rita) #cat",
      "i am (freezing | so cold | very cold | really cold)",
    ] },
    space_heater: { patterns: [
      "i (bought | have | am using | got) a (space heater | heater | small heater | electric heater | little heater) [with my own money]",
      "i am using the (oven | stove) for heat", "i am heating (the @apt | my @apt) with the oven",
    ] },

    // --- how long ------------------------------------------------------------------
    heat_duration: { patterns: [
      "(for | about | almost | nearly | over) @dur [now | already] #h:a_week",
      "since [last] {day} #h:since_last", "since (last week | the weekend | last weekend | yesterday #short | last night #short | {date})",
      "@dur [now | already]", "(all week | the whole week) #wk",
      "(it is | it has) been @dur [now | already]",
      "(it | the heating | the heat | @heat) has been (broken | off | out | like this | like that | dead | not working | cold) (for @dur | since [last] {day} | since last week) #h:song_broken",
      "it (started | broke | stopped working | stopped | went out | died) (on | last) {day}", "it (started | broke | stopped working | stopped | went out | died) @dur ago",
      "@dur ago", "since @dur #tip:tense_since",
      "it (is | was) broken since @dur #tip:tense_since", "it does not work (already @dur | @dur already) #tip:tense_since",
      "it is [already] @dur [now | already] #tip:tense_since", "from [last] {day} #tip:tense_since",
    ] },
    // "Monday." / "Last Monday." while he asks how long
    dur_ctx: { patterns: ["[on | last] {day}"] },
    called_before: { patterns: [
      "i have called you (every day | many times | several times | {number} times | twice | a lot | so many times) [@dur_tail] #h:called_every_day",
      "i called you (on {day} | every day | yesterday | {number} times | many times | last week | twice | so many times | a lot) [@dur_tail]",
      "i called (your phone | your cell | your cell phone) [every day | many times]", "i called your mobile [every day | many times] #tip:uk_mobile",
      "i (rang | have rung) you [every day | many times | {number} times] #tip:uk_ring",
      "i (left | have left) [you] [a | {number} | many | several | so many | three] (message | messages | voicemail | voicemails) #h:left_voicemail",
      "you (do not | did not | never) answer [the phone | my calls | your phone | my messages]", "you (did not | do not) call me back",
      "nobody answers the phone", "i (tried | have tried | was trying) to call you [many times | every day | {number} times | all week]",
      "i sent you [a | {number} | many] (text | texts | message | messages | email | emails)",
      "i (knocked | have knocked) on your door [{number} times | many times | every day | twice]",
    ] },

    // --- the thermostat --------------------------------------------------------------
    thermo_yes: { patterns: [
      "[yes] i (checked | have checked) [it] [twice | two times | three times | already] #h:checked_twice",
      "[yes] i [already] (checked | tried) the thermostat [twice | already]", "it is not the thermostat #h:not_thermostat",
      "the thermostat is (fine | okay | on | at {number} | all the way up)", "i (have tried | tried) everything #h:tried_everything",
      "of course i (did | have)", "[yes] it is (on | turned up | set to {number}) [all the way]",
      "[yes] (many | several | two | three) times", "i (checked | tried) everything",
    ] },
    thermo_no: { patterns: ["i did not check [it | the thermostat]", "i have not checked [it | the thermostat]", "(what | which) thermostat", "where is the thermostat"] },

    // --- the dodge: whose job is it? -----------------------------------------------------
    responsibility: { patterns: [
      "it is your responsibility to (fix it | fix the heating | fix the heat | repair it | fix that | fix the radiator) #h:your_resp",
      "i am afraid it is your responsibility [to (fix it | fix the heating | repair it)] #h:afraid_resp",
      "it is your responsibility [as the landlord]",
      "(fixing it | repairs | the heating | heating | that | the repair | the repairs | heat) (is | are) your (responsibility | job)",
      "according to (the | my | our) @contract [on page two [line ten]] [@resp_tail] #h:contract",
      "the @contract says (you | the landlord) (fix | fixes | repair | repairs | pay for | pays for | have to fix | has to fix | is responsible for) (it | repairs | the heating | the heat | everything | that)",
      "the @contract says [that] (heat | heating) is included", "it is in the @contract [on page two]",
      "(heat | heating | the heat | the heating) is included in [the | my] rent #h:heat_included",
      "my rent includes (heat | heating | the heat)", "the rent includes (heat | heating)", "i pay for heat in my rent",
      "you are the landlord [so] [it is your (job | responsibility)]", "(that is | it is) your job [as the landlord] [not mine]",
      "it is the (landlord s | landlords | landlord) (job | responsibility)", "that is not what (our | the | my) @contract says",
      "i have been patient but it is your responsibility [to fix it]", "you are responsible for (repairs | the heating | the heat | this | it | that | fixing it)",
      "repairs are (your job | your responsibility | on you)", "(it is | that is) your (duty | obligation)",
      "the landlord (must | has to | should | needs to) (fix | repair) @lease_obj", "the @contract says (you | the landlord) @lease_verb @lease_obj",
      "(in the @contract it says | it says in the @contract) [that] (you | the landlord) @lease_verb @lease_obj", "it is written in the @contract",
      "i pay [you] [the] rent [every month]", "(repairs are | that is | it is) the (landlord s | landlords | landlord) (job | responsibility)",
      "you have to (fix it | fix the heating | repair it | fix the heat) #tip:too_blunt #harsh",
      "you (must | need to) (fix it | repair it | fix the heating) #tip:too_blunt #harsh",
      "do your job #tip:rude_insult #harsh",
    ] },
    request_fix: { patterns: [
      "you are the landlord fix it #h:please_fix #imp",
      "(can | could | would) you @fixit [@fix_tail]", "(can | could | would) you [please] send @someone [to fix it | to look at it | over | out] [@fix_tail] #h:send_someone",
      "@fixit [@fix_tail] #imp", "send @someone [to fix it] #imp", "(do | please do) something #imp",
      "i need @someone to (fix | look at | check) it", "i need (heat | it fixed | the heating fixed | the heat fixed) [@fix_tail]",
      "(can | could) @someone (fix | look at | check) it", "i (would like | want) (it | the heating) (fixed | repaired) [@fix_tail]",
      "(can | could) you (do something | help me)", "i need your help",
      "i (want | would like) you to (fix | repair) (it | the heating | that | the radiators)", "[i think] you should (fix | repair) (it | the heating)",
      "why (are you not | are not you | do you not | do not you) (fixing | fix) it",
      "fix it (now | today | immediately | right now) #tip:too_blunt #harsh", "i demand [that you fix it] [now | today] #tip:too_blunt #harsh",
    ] },
    patient: { patterns: [
      "i have been patient but patience does not keep me warm #h:been_patient",
      "i have been [very | really | so] patient", "patience does not keep me warm",
      "i have been [very | really | so] patient but (this is getting (serious | ridiculous) | it is (too cold | freezing) | i am (cold | freezing))",
      "i have been waiting [for] @dur [already | now]", "i do not want to wait [any longer | anymore]", "i can not wait any longer",
      "(this | it) is getting (serious | ridiculous | worse | really bad | out of hand)",
    ] },
    // "Have you tried wearing a sweater?" – "Very funny."
    you_kidding: { patterns: ["you are (kidding | joking) [right | me]", "are you (kidding | joking) [me]", "very funny", "(that is | it is) not funny"] },
    threat: { patterns: [
      "i will (sue you | call (my | a) lawyer | call the police | go to court | report you | call the city) #tip:threat_legal",
      "i am going to (sue you | take you to court | call the police | call a lawyer | report you) #tip:threat_legal",
      "you are a (bad | terrible | lazy | horrible | awful) landlord #tip:rude_insult", "you are the worst landlord #tip:rude_insult",
      "you are (lazy | a liar | lying | useless | crazy) #tip:rude_insult", "shut up #tip:rude_insult",
    ] },
    withhold: { patterns: [
      "i (will not | am not going to) pay [the | my] rent [until (you fix it | it is fixed | the heating is fixed | the heat is fixed | it works | the heating works | you fix the heating)] #tip:withhold",
      "i am not paying [the | my] rent [until (you fix it | it is fixed | the heating is fixed | it works)] #tip:withhold",
      "i (will not | am not going to) pay [this month | anything] #tip:withhold",
      "no heat no rent #tip:withhold", "i will stop paying [the | my] rent #tip:withhold",
      "i will pay [the rent] when (you fix it | it is fixed | the heating works) #tip:withhold",
    ] },

    // --- the offer: fix it yourself ------------------------------------------------------------
    refuse_offer: { patterns: [
      "that is not what we agreed [on] #h:not_agreed", "that is not (the deal | our deal | fair | how it works | what the @contract says | my job | my responsibility)",
      "we did not agree (on | to) that", "i am not a (plumber | repairman | technician | handyman | mechanic | professional | specialist) #h:not_plumber",
      "i (do not | can not) know how to fix (it | radiators | heating | a boiler | that)", "i can not (fix | do) it [myself]",
      "[no thank you] send (a professional | a repairman | a plumber | a technician | someone who knows how) #h:no_thanks_pro",
      "(can | could) you send a (professional | repairman | plumber | technician) [instead]",
      "i would rather (not touch it | not do it | you sent someone | have a professional [do it] | not) #h:rather_not",
      "i (do not | would not) want to (touch | fix) it [myself]", "i am not (going to | gonna) fix it [myself]", "i will not (do it | fix it) [myself]",
      "(that is | it is) not my (job | problem)", "half is not (enough | fair)", "[no] i do not want [to] [(do | fix) it] [myself]",
      "why should i (fix | repair | do) it [myself]", "[no] you (fix | repair) it", "i do not know how [to (fix | do) it]", "i can not [do (that | this | it)]", "i (will not | am not going to) pay for (it | the repair | that | the repairs)", "i (do not | can not) have (the tools | a wrench | tools | time)",
      "no way #tip:bare_no",
    ] },
    accept_offer: { patterns: [
      "[okay] i will (do it | fix it | try) [myself]", "(fine | okay | sure | all right) i (can | will) try", "i can (fix it | do it) [myself]",
      "[okay] send me the wrench", "i will give it a try", "let me try", "half is (fine | okay | good)",
    ] },
    walk_away: { patterns: ["never mind", "it does not matter", "forget (it | about it) #forget", "(okay | fine) forget it #forget"] },

    // --- the date ---------------------------------------------------------------------------------
    ask_when: { patterns: [
      "when can someone come out #h:when_come_out",
      "when can (@someone | you | he | gus) (come | come out | come over | come by | fix it | be here | look at it | send someone)",
      "when (will | is) (@someone | he | gus) (come | coming | be here | going to come) [out | over | by]",
      "when will it be (fixed | repaired)", "when (can | will) you (fix | repair) it",
      "(what | which) day (can | will) (@someone | he | gus) come [out | over]",
      "when [exactly]", "(what | which) day [exactly]", "(can | could) you give me a (date | day | time | specific date)",
      "i need a (date | specific date | day | specific day)", "can you be more (specific | exact)",
      "when will the (repair | repairman | plumber) (be | come)",
      "when will the master come #tip:master", "when will (the | a) (renovation | remont) be #tip:renovation",
    ] },
    too_late: { patterns: [
      "next week is too late #h:too_late", "(that is | it is | wednesday is | next wednesday is | a week is | next week is) too (late | long) [to wait]",
      "(i | we) can not wait (that long | a week | until [next] wednesday | another week | so long | a whole week)",
      "(could | can) (@someone | he | gus) come (sooner | earlier | this week | before the weekend) #h:sooner",
      "is there any (way | chance) (@someone | he | gus) (could | can) come (sooner | earlier | this week)",
      "(sooner | earlier | this week)", "as soon as possible", "asap", "before the weekend #h:before_weekend",
      "it is (freezing | too cold) i can not wait", "nothing sooner", "(is there | do you have) anything (sooner | earlier)", "anything (sooner | earlier)",
      "(we | i) need it (fixed | done) (sooner | this week | before the weekend)", "(can | could) it be (sooner | earlier | this week)",
    ] },
    propose_day: { patterns: [
      "(how about | what about | maybe | is | could it be) {day} [morning | afternoon] [instead]",
      "(could | can) (he | @someone | gus) come [on] {day} [morning | afternoon] [instead]",
      "{day} (would be better | is better) #h:saturday_better", "is {day} possible", "{day} if possible", "is it possible [on] {day}", "[on] {day} or [on] {day}",
      "(he | @someone | gus) (can | could) come [on] {day}",
    ] },
    // a bare day while a day is being agreed: "Friday." / "On Friday morning."
    day_ctx: { patterns: ["[on] {day} [morning | afternoon]"] },
    // "Friday doesn't work for me." (never an agreement)
    day_no: { patterns: [
      "{day} [morning] (does not | will not) work [for me]", "{day} [morning] is not (good | okay | possible | great | fine) [for me]",
      "i can not [do] [on] {day}", "not [on] {day}", "i do not want {day}",
    ] },
    accept_date: { patterns: [
      "{day} [morning] works [for me] [fine] #h:friday_works", "{day} [morning] is (fine | good | great | perfect | okay) [for me]",
      "see you on {day}", "(it is | that is | sounds like) a deal", "that works [for me] #h:works_me",
    ] },
    home_yes: { patterns: [
      "[yes] i will be (home | there | in | at home) [all (day | morning) | on {day} | then] #h:ill_be_home",
      "i (work | am working) from home", "i can be (home | there)", "i am (always | usually) home [in the morning]",
    ] },
    leave_key: { patterns: [
      "i can leave (a | the | my) key with (rita | my neighbor | the neighbor) #h:key_with_rita", "i will leave (a | the | my) key with (rita | my neighbor)",
      "rita (has | can have) (a | my) key", "(rita | my neighbor) can let (him | gus) in",
    ] },
    not_home: { patterns: [
      "[no] i (will be | am) at work [on {day} | then | all day] #h:at_work", "[no] i will not be (home | there) [on {day} | then]",
      "[no] i (work | am working) [on {day} | then | all day]", "i have to work [on {day} | then]",
    ] },

    // --- wrapping up ---------------------------------------------------------------------------
    in_writing: { patterns: [
      "(can | could) you put (that | it | this) in an email #h:email_please",
      "(can | could) you (put | write) (that | it | this | the date) (in | into) (an email | a text | writing | a message) [for me]",
      "(can | could | may) i (have | get) (that | it | this) in writing #h:in_writing",
      "(can | could) you (text | email | message) me [the | that | the date | the time | the details | the date and time] #h:text_me",
      "(can | could) you send me (a text | an email | a message | a confirmation | a text message) [with the date]",
      "(send | text | email) me [a confirmation | the date | that]", "i would like (that | it | this) in writing", "i (want | need) (that | it | this) in writing",
      "(write | send) me (an email | a text | a message)", "(can | could | may) i (have | get) (that | it | this) (in an email | by email | in a text | by text)",
      "(can | could) you confirm (that | it | the date) (in writing | by email | by text)",
    ] },
    no_more: { patterns: ["[no] that is (all | everything) [i (needed | wanted)] #h:thats_all", "[no] nothing [else] [for now]", "[no] i am (good | fine | okay) [thanks]", "that is it"] },
    ask_discount: { patterns: [
      "(will | can | could) i (get | have) a discount [on | for] [the | my] [rent] [this month]",
      "(can | could) you (lower | reduce) [the | my] rent [this month]", "i (think i | should) pay less [this month]",
      "(will | can | could) you take (something | it | that) off [the | my] rent", "(off the rent | what about a discount | do i get a discount)",
    ] },
    ask_trip: { patterns: ["how long (will you be | are you) (away | gone | in florida)", "when (will you be | are you) back", "where are you going", "are you going on vacation"] },

    // --- the rent -------------------------------------------------------------------------------
    pay_rent: { patterns: [
      "[sure | of course] here is (the | my | this month s) (rent | check) [for (this month | the month)] #h:here_check", "here is the cheque #tip:us_check",
      "i (have | brought) (it | the rent | the check) [here | with me | for you]",
      "i (will | can) pay [you] [the rent] (now | today | in cash | right now)", "(can | could) i pay [you] [the rent] (now | today | in cash | by check | with a check)",
      "here is (the money | {price} | fourteen hundred [dollars])",
    ] },
    // "Here you go." while he asks for the rent
    pay_ctx: { patterns: ["here you (go | are)", "here it is", "there you go"] },
    ask_receipt: { patterns: [
      "i will need a receipt #h:need_receipt", "(can | could | may) i (get | have) a receipt #h:receipt_please",
      "(can | could) you (give | write) me a receipt", "[and] a receipt", "i need a receipt [for (that | the rent)]", "i would like a receipt", "(do | will) i get a receipt", "give me a receipt",
    ] },
    pay_later: { patterns: [
      "i (will | can) pay [it | the rent] (online | by bank transfer | by transfer) [on the first | next week | on {day} | tomorrow | later | tonight] #h:pay_online",
      "i (will | can) pay [it | the rent] [online] (on the first | next week | on {day} | tomorrow | later | tonight)",
      "(can | could) i pay (online | on the first | later | next week | tomorrow | by transfer)", "i will send it (online | later | tonight | today)",
      "i do not have (it | the check | my checkbook) (with me | here | now)", "(can | could) i pay (by | with) (card | credit card | my card | a card)",
    ] },
    paid_already: { patterns: ["i [have] already paid [it | the rent]", "i paid [it | the rent] (online | already | last week | yesterday | on the first)", "i [already] sent it [already]", "it is already paid"] },

    // --- Rita and goodbye --------------------------------------------------------------------------
    thanks_rita: { patterns: ["(thank you | thanks) rita #h:thanks_rita", "rita (thank you | thanks)", "(thank you | thanks) for (helping | your help | the backup | backing me up) rita"] },
    trip_wish: { patterns: [
      "have a (good | nice | great | safe) (trip | flight | vacation) #h:good_trip", "have a (good | nice | great) holiday #tip:uk_holiday",
      "enjoy (florida | the sun | your trip | your vacation) [in florida] #h:enjoy_florida", "have fun in florida", "safe travels",
      "see you (in two weeks | when you are back | when you get back)",
    ] },
  },

  lines: {
    // --- greeting --------------------------------------------------------------
    greet_open: [
      t("Oh, | hi! | Sorry, | I | can't | stop. | I'm off | to | Florida!", "O, | sveiki! | Atsiprašau, | aš | negaliu | sustoti. | Išvykstu | į | Floridą!",
        "O, sveiki! Atsiprašau, negaliu sustoti – išvykstu į Floridą!"),
      t("Hey, | good | morning! | Make it quick, | okay? | Florida | is waiting.", "Ei, | labas | rytas! | Tik trumpai, | gerai? | Florida | laukia.",
        "Labas rytas! Tik trumpai, gerai? Florida laukia."),
    ],
    greet_again: [
      t("Oh, | it's | you | again. | Let me guess: | the | heat?", "O, | tai | jūs | vėl. | Leiskite atspėti: | — | šildymas?", "O, tai vėl jūs. Leiskite atspėti – šildymas?",
        { flags: { 1: "“it's” = tai; the verb “is” needs no word in Lithuanian here." } }),
    ],
    guess_reask: [t("The | heat, | right?", "— | Šildymas, | tiesa?", "Šildymas, tiesa?")],
    knew_it: [t("I | knew | it.", "Aš | žinojau | tai.", "Taip ir žinojau.")],
    no_then_what: [t("No? | Then | what | can | I | do | for you?", "Ne? | Tai | ką | galiu | aš | padaryti | jums?", "Ne? Tai kuo galiu padėti?")],
    greet_who: [
      t("So, | what | can | I | do | for you?", "Tai, | ką | galiu | aš | padaryti | jums?", "Tai kuo galiu padėti?"),
      t("Okay, | what's | the | problem?", "Gerai, | kokia yra | — | problema?", "Gerai, kokia problema?"),
    ],
    one_minute: [t("One | minute. | Literally.", "Vieną | minutę. | Tiesiogine prasme.", "Tik vieną minutę.")],
    problem_reask: [
      t("Is | something | wrong | with | the | apartment?", "Ar | kas nors | negerai | su | — | butu?", "Ar kas nors negerai su butu?", { flags: { 0: F_IS_Q } }),
    ],
    problem_what: [t("Okay. | What's | wrong?", "Gerai. | Kas yra | negerai?", "Gerai. Kas negerai?")],
    oh_no: [t("Oh, | no.", "O, | ne.", "O ne."), t("Uh-oh.", "Oi.", "Oi.")],

    // --- the thermostat --------------------------------------------------------------
    thermostat_q: [
      t("Hmm. | Have | you | checked | the | thermostat?", "Hmm. | Ar | jūs | patikrinote | — | termostatą?", "Hmm. O termostatą patikrinote?", { flags: { 1: F_HAVE_Q } }),
      t("Are | you | sure | the | thermostat | is | on?", "Ar | jūs | {m:tikras, kad|f:tikra, kad} | — | termostatas | yra | įjungtas?", "Ar tikrai termostatas įjungtas?",
        { flags: { 0: F_ARE_Q, 2: "Zero “that” in English; Lithuanian needs kad, glossed with “sure”." } }),
    ],
    thermostat_ok: [t("Okay, | okay, | I | believe | you.", "Gerai, | gerai, | aš | tikiu | jumis.", "Gerai, gerai, tikiu jumis.")],
    thermostat_no: [t("Give it a try. | These | old | radiators | are | moody.", "Pabandykite. | Šitie | seni | radiatoriai | yra | kaprizingi.", "Pabandykite. Šitie seni radiatoriai kaprizingi.")],
    thermostat_no2: [
      t("Or | not. | Your | face | says | you | already | tried.", "Arba | ne. | Jūsų | veidas | sako, kad | jūs | jau | bandėte.", "O gal ir ne. Iš veido matau, kad jau bandėte.",
        { flags: { 4: "Zero “that” after “says”: kad is glossed with the verb." } }),
    ],
    thermostat_where: [
      t("It's | the | little | box | on | the | wall | by | your | kitchen.", "Tai yra | — | mažoji | dėžutė | ant | — | sienos | prie | jūsų | virtuvės.",
        "Tai mažoji dėžutė ant sienos prie jūsų virtuvės."),
    ],

    // --- how long ------------------------------------------------------------------
    duration_ask: [
      t("How long | has | the | heat | been out?", "Kiek laiko | — | — | šildymas | neveikia?", "Kiek laiko jau neveikia šildymas?",
        { flags: { 1: "Perfect “has”: the present neveikia covers a state that still goes on (linked to “been out”)." } }),
      t("How long | has | this | been going on?", "Kiek laiko | — | tai | tęsiasi?", "Kiek laiko tai tęsiasi?",
        { flags: { 1: "Perfect “has”: the present tęsiasi covers a state that still goes on (linked to “been going on”)." } }),
    ],
    since_when: [t("Since | when?", "Nuo | kada?", "Nuo kada?")],
    dur_react_long: [
      t("That | long? | Wow. | Okay, | that's | not | great.", "Taip | ilgai? | Oho. | Na, | tai | nėra | puiku.", "Taip ilgai? Oho. Na, tai jau negerai.",
        { flags: { 4: "“that's” = tai; the verb “is” fuses with the negation in nėra (under “not”)." } }),
    ],
    dur_react_week: [
      t("A | week? | Wow. | Okay, | that's | not | great.", "— | Savaitę? | Oho. | Na, | tai | nėra | puiku.", "Savaitę? Oho. Na, tai jau negerai.",
        { flags: { 4: "“that's” = tai; the verb “is” fuses with the negation in nėra (under “not”)." } }),
    ],
    dur_react_short: [
      t("Okay, | okay. | That's | not | great.", "Gerai, | gerai. | Tai | nėra | puiku.", "Gerai, gerai. Tai negerai.",
        { flags: { 2: "“That's” = tai; the verb “is” fuses with the negation in nėra (under “not”)." } }),
    ],
    dur_unknown: [t("Okay. | A | few | days, | at least.", "Gerai. | — | Kelias | dienas, | mažų mažiausiai.", "Gerai. Bent kelias dienas.")],
    voicemail_react: [
      t("Oh, | my | voicemail... | I've | been meaning | to check | that.", "O, | mano | balso paštas... | aš | vis ketinau | patikrinti | jį.",
        "O, mano balso paštas… Vis ketinau jį patikrinti.", { flags: { 3: "“I've”: the perfect auxiliary has no word; vis ketinau carries the time." } }),
    ],

    // --- Rita (the twist) -------------------------------------------------------------
    rita_in: [t("Sorry, | I | couldn't help overhearing.", "Atsiprašau, | aš | negalėjau nenugirsti.", "Atsiprašau, negalėjau nenugirsti.")],
    rita_back: [
      t("It's | true, | Mr. | Patel. | I | can | feel | the | cold | through | the | wall.", "Tai | tiesa, | pone | Pateli. | Aš | galiu | jausti | — | šaltį | per | — | sieną.",
        "Tai tiesa, pone Pateli. Šaltis jaučiasi net per sieną.", { flags: { 0: "“It's” = tai; Lithuanian needs no copula before tiesa." } }),
    ],
    rita_irony: [t("And | you | always | fix | everything | so | fast!", "O | jūs | visada | sutaisote | viską | taip | greitai!", "O jūs juk visada viską taip greitai sutaisote!")],
    patel_rita: [t("Thank | you, | Rita. | Very | helpful.", "Ačiū | jums, | Rita. | Labai | naudinga.", "Ačiū, Rita. Labai padėjote.")],
    rita_bye: [t("Anytime! | Stay warm, | neighbor!", "Visada prašom! | {j:Nesušalkite|t:Nesušalk}, | kaimyne!", "Visada prašom! {j:Nesušalkite|t:Nesušalk}, kaimyne!")],

    // --- the dodge -------------------------------------------------------------------
    dodge_old: [
      t("Look, | it's | an | old | building. | These | things | happen.", "Klausykite, | tai | — | senas | pastatas. | Tokie | dalykai | nutinka.", "Suprantate, pastatas senas. Taip būna.",
        { flags: { 1: F_ITS, 5: "“These” (things in general) = tokie." } }),
    ],
    dodge_sweater: [
      t("Have | you | tried | wearing | a | sweater?", "Ar | jūs | bandėte | vilkėti | — | megztinį?", "O megztinį vilkėti bandėte?", { flags: { 0: F_HAVE_Q } }),
    ],
    kidding: [t("I'm kidding, | I'm kidding.", "Juokauju, | juokauju.", "Juokauju, juokauju.")],
    sorry_joke: [t("Sorry, | sorry. | Bad | joke.", "Atsiprašau, | atsiprašau. | Prastas | juokelis.", "Atsiprašau, atsiprašau. Prastas juokelis.")],
    dodge_after_rita: [
      t("Okay, | okay. | It's | an | old | building, | but... | fine.", "Gerai, | gerai. | Tai | — | senas | pastatas, | bet... | tebūnie.", "Gerai, gerai. Pastatas senas, bet… tebūnie.",
        { flags: { 2: F_ITS } }),
    ],
    dodge_q: [
      t("So | what | do | you | want | me | to do?", "Tai | ko | — | jūs | norite, kad | aš | padaryčiau?", "Tai ko jūs iš manęs norite?",
        { flags: { 2: F_WH_DO, 5: "“me”: in the kad clause it becomes the subject aš." } }),
      t("So? | What | do | you | want | from | me?", "Tai? | Ko | — | jūs | norite | iš | manęs?", "Tai ko jūs iš manęs norite?", { flags: { 2: F_WH_DO } }),
    ],
    patience_react: [t("I | know, | I | know, | and | I | appreciate | it.", "Aš | žinau, | aš | žinau, | ir | aš | vertinu | tai.", "Žinau, žinau, ir aš tai vertinu.")],
    i_know: [t("I | know, | I | know.", "Aš | žinau, | aš | žinau.", "Žinau, žinau.")],
    resp_react: [
      t("Okay, | okay. | You've | read | the | lease. | I | respect | that.", "Gerai, | gerai. | Jūs | perskaitėte | — | sutartį. | Aš | gerbiu | tai.",
        "Gerai, gerai. Matau, sutartį perskaitėte. Tai gerbiu.", { flags: { 2: "“You've”: the perfect auxiliary has no word; the past perskaitėte carries it." } }),
    ],
    resp_lease: [
      t("Page | two, | line | ten. | Yes, | I | know | it | by heart.", "Puslapis | du, | eilutė | dešimt. | Taip, | aš | žinau | ją | mintinai.",
        "Antras puslapis, dešimta eilutė. Taip, žinau ją mintinai.", { flags: { 7: "“it” = ją (the lease, sutartis, feminine)." } }),
    ],
    resp_heat: [
      t("Yes, | yes, | heat | is | included. | I | know | my | own | lease.", "Taip, | taip, | šildymas | yra | įskaičiuotas. | Aš | žinau | savo | paties | sutartį.",
        "Taip, taip, šildymas įskaičiuotas. Savo sutartį žinau."),
    ],
    resp_what: [t("My | responsibility? | For | what?", "Mano | atsakomybė? | Už | ką?", "Mano atsakomybė? Už ką?")],
    fix_what: [t("Fix | what?", "Sutaisyti | ką?", "Ką sutaisyti?")],
    resp_soft: [
      t("Sure, | sure, | I | will. | But | first, | hear | me | out.", "Žinoma, | žinoma, | aš | [sutaisysiu]. | Bet | pirma, | išklausykite | mane | —.",
        "Žinoma, žinoma, sutaisysiu. Bet pirma išklausykite mane.",
        { flags: { 3: "Elliptical “will”: Lithuanian repeats the verb, sutaisysiu.", 8: "“out” (hear … out): the prefix iš- of išklausykite carries it." } }),
    ],
    sure_sure: [t("Sure, | sure.", "Žinoma, | žinoma.", "Žinoma, žinoma.")],
    dodge_help: [
      t("Okay, | I | hear | you. | No | heat, | no | fun.", "Gerai, | aš | suprantu | jus. | Nėra | šildymo, | nėra | linksmybių.",
        "Gerai, suprantu jus. Nėra šilumos – nėra ir linksmybių.",
        { flags: { 2: "“hear” (I hear you) = suprantu: I understand you.", 4: "“No” + noun = nėra + genitive (C-CONCORD).", 6: "“no” + noun = nėra + genitive (C-CONCORD)." } }),
    ],
    blunt_react: [
      t("Whoa, | whoa. | Easy. | We're | both | adults | here.", "Oho, | oho. | Ramiau. | Mes esame | abu | suaugę | čia.", "Oho, oho. Ramiau. Juk abu esame suaugę žmonės."),
    ],
    not_enemy: [
      t("Hey, | no need for that. | I'm | not | the | enemy.", "Ei, | nereikia taip. | Aš | nesu | — | priešas.", "Ei, nereikia taip. Aš jums ne priešas.",
        { flags: { 2: "“'m” (am): the negated copula nesu (under “not”) carries it." } }),
    ],
    blunt_last: [
      t("Let's start | over. | Calm | and | clear, | okay?", "Pradėkime | iš naujo. | Ramiai | ir | aiškiai, | gerai?", "Pradėkime iš naujo. Ramiai ir aiškiai, gerai?",
        { flags: { 1: "“over” (again) = iš naujo." } }),
    ],
    rent_threat_react: [
      t("Whoa! | No one | is talking | about | rent. | Let's talk | about | the | heat.", "Oho! | Niekas | nekalba | apie | nuomą. | Kalbėkime | apie | — | šildymą.",
        "Oho! Apie nuomą niekas nekalba. Kalbėkime apie šildymą.", { flags: { 2: "Negative concord: nekalba takes the ne- from “No one” (C-CONCORD)." } }),
    ],

    // --- the offer -------------------------------------------------------------------
    offer: [
      t("Tell you what: | fix | it | yourself, | and | I'll pay | half.", "Žinote ką: | sutaisykite | jį | {m:pats,|f:pati,} | o | sumokėsiu | pusę.",
        "Žinote ką: susitaisykite {m:pats|f:pati}, o aš sumokėsiu pusę.",
        { flags: { 2: "“it” = jį (šildymą, masculine).", 3: "One person addressed with jūs: pats/pati stays singular." } }),
    ],
    offer2: [
      t("My | repairman, | Gus, | can | lend | you | his | wrench.", "Mano | meistras, | Gusas, | gali | paskolinti | jums | savo | veržliaraktį.",
        "Mano meistras Gusas gali jums paskolinti savo veržliaraktį.", { flags: { 6: "“his” = savo: it refers back to the subject Gusas." } }),
    ],
    offer_reask: [t("So? | Half | the | cost. | Deal?", "Tai? | Pusė | — | kainos. | Sutarta?", "Tai kaip? Pusė kainos. Sutarta?")],
    offer_refused_react: [
      t("Worth | a | try. | Fine, | fine. | I'll call | Gus.", "Verta | — | pabandyti. | Gerai, | gerai. | Paskambinsiu | Gusui.", "Verta buvo pabandyti. Gerai, gerai, paskambinsiu Gusui.",
        { flags: { 2: "“a try” (a noun) = the infinitive pabandyti." } }),
      t("Ha! | I | had | to ask. | Okay, | I'll send | someone.", "Cha! | Aš | turėjau | paklausti. | Gerai, | atsiųsiu | ką nors.", "Cha! Turėjau paklausti. Gerai, ką nors atsiųsiu."),
    ],
    offer_accepted_react: [
      t("Really? | Great! | Wait... | my | insurance | won't like | that.", "Tikrai? | Puiku! | Palaukite... | mano | draudimui | nepatiks | tai.",
        "Tikrai? Puiku! Palaukite… mano draudimo bendrovei tai nepatiks.", { flags: { 4: "“my insurance … like”: Lithuanian puts the one who likes in the dative (draudimui)." } }),
    ],
    offer_accepted2: [t("Forget | it. | I'll send | Gus.", "Pamirškite | tai. | Atsiųsiu | Gusą.", "Pamirškite. Atsiųsiu Gusą.")],
    one_thing: [t("One thing at a time.", "Viskas iš eilės.", "Viskas iš eilės.")],

    // --- the date --------------------------------------------------------------------
    vague: [
      t("I'll have | Gus | call | you | sometime | next | week.", "Paprašysiu | Guso | kad paskambintų | jums | kada nors | kitą | savaitę.",
        "Paprašysiu Guso, kad kitą savaitę kada nors jums paskambintų.", { flags: { 0: "Causative “have someone do” = paprašyti, kad…; the future is in paprašysiu." } }),
    ],
    vague_reask: [t("So, | sometime | next | week, | okay?", "Tai, | kada nors | kitą | savaitę, | gerai?", "Tai kada nors kitą savaitę, gerai?")],
    date_offer: [t("Let me see... | how about | next | Wednesday?", "Pažiūrėkime... | o gal | kitą | trečiadienį?", "Pažiūrėkime… O gal kitą trečiadienį?")],
    date_reask: [t("So... | Wednesday?", "Tai... | trečiadienį?", "Tai kaip… trečiadienį?")],
    friday_reask: [t("So... | Friday | morning?", "Tai... | penktadienio | rytą?", "Tai kaip… penktadienio rytą?")],
    friday_best: [t("Friday | is | the | best | I | can | do.", "Penktadienis | yra | — | geriausia, ką | aš | galiu | padaryti.", "Penktadienis – geriausia, ką galiu padaryti.",
      { flags: { 3: "Zero “that” in English; Lithuanian needs ką, glossed with “best”." } })],
    sooner_react: [
      t("Okay, | okay. | Gus | can | come out | on | Friday | morning.", "Gerai, | gerai. | Gusas | gali | atvažiuoti | — | penktadienio | rytą.",
        "Gerai, gerai. Gusas gali atvažiuoti penktadienio rytą.", { flags: { 5: F_ON_DAYPART } }),
      t("You | drive a hard bargain. | Friday | morning.", "Jūs | mokate kietai derėtis. | Penktadienio | rytą.", "Su jumis sunku derėtis. Penktadienio rytą."),
    ],
    today_react: [t("Today? | Gus | is | booked solid | today.", "Šiandien? | Gusas | yra | visiškai užimtas | šiandien.", "Šiandien? Gusas šiandien visiškai užimtas.")],
    tomorrow_react: [t("Tomorrow? | Gus | is | booked solid | tomorrow.", "Rytoj? | Gusas | yra | visiškai užimtas | rytoj.", "Rytoj? Gusas rytoj visiškai užimtas.")],
    thursday_react: [
      t("Thursday? | That's | tomorrow. | Gus | is | booked solid.", "Ketvirtadienį? | Tai yra | rytoj. | Gusas | yra | visiškai užimtas.", "Ketvirtadienį? Tai juk rytoj. Gusas visiškai užimtas."),
    ],
    even_better: [t("Even | better: | Gus | can | come | on Friday.", "Dar | geriau: | Gusas | gali | atvažiuoti | penktadienį.", "Dar geriau – Gusas gali atvažiuoti penktadienį.")],
    day_accept: [t("{X} | works. | I'll tell | Gus.", "{X:nom} | tinka. | Pasakysiu | Gusui.", "{X:nom} tinka. Pasakysiu Gusui.")],
    window: [t("Between | 9 | and | noon.", "Tarp | 9 | ir | vidurdienio.", "Nuo 9 iki 12 valandos.", { say: "Between nine and noon." })],
    window_q: [t("Between | 9 | and | noon. | Okay?", "Tarp | 9 | ir | vidurdienio. | Gerai?", "Nuo 9 iki 12 valandos. Tinka?", { say: "Between nine and noon. Okay?" })],
    date_confirm: [
      t("Great. | {X}, | between | 9 | and | noon.", "Puiku. | {X:acc}, | tarp | 9 | ir | vidurdienio.", "Puiku. Vadinasi, {X:acc}, nuo 9 iki 12 valandos.", { say: "Great. {X}, between nine and noon." }),
    ],
    wait_wait: [t("Wait, | wait!", "Palaukite, | palaukite!", "Palaukite, palaukite!")],
    writing_first: [t("In writing? | Okay, | okay.", "Raštu? | Gerai, | gerai.", "Raštu? Gerai, gerai.")],
    home_q: [
      t("Will | you | be | home?", "Ar | jūs | būsite | namie?", "Ar būsite namie?", { flags: { 0: "“Will” in a yes/no question = the particle ar; the future sits on būsite." } }),
    ],
    home_ok: [t("Perfect.", "Puiku.", "Puiku.")],
    key_rita: [t("Rita? | Good | idea. | She | knows | everything | anyway.", "Rita? | Gera | mintis. | Ji | žino | viską | vis tiek.", "Rita? Gera mintis. Ji ir taip viską žino.")],
    gus_key: [t("No | problem. | Gus | has | a | key.", "Jokių | problemų. | Gusas | turi | — | raktą.", "Jokių problemų. Gusas turi raktą.")],

    // --- wrapping up -----------------------------------------------------------------
    anything_else: [
      t("Anything | else? | I | really | have | to run.", "Kas nors | dar? | Aš | tikrai | turiu | bėgti.", "Dar kas nors? Man tikrai reikia bėgti."),
      t("Anything | else?", "Kas nors | dar?", "Dar kas nors?"),
    ],
    writing_react: [t("In writing? | Sure, | I'll text | you | right now.", "Raštu? | Žinoma, | parašysiu žinutę | jums | tuoj pat.", "Raštu? Žinoma, tuoj pat parašysiu jums žinutę.")],
    writing_lease: [
      t("You | really | did | read | the | lease. | Okay, | I'll text | you.", "Jūs | tikrai | — | perskaitėte | — | sutartį. | Gerai, | parašysiu žinutę | jums.",
        "Jūs tikrai perskaitėte sutartį. Gerai, parašysiu jums žinutę.", { flags: { 2: "Emphatic “did” has no word; tikrai (unit 1) already carries the emphasis." } }),
    ],
    text_sent: [
      t("There. | \"Gus, | {X}, | 9 | to | noon.\" | Happy?", "Štai. | Gusas, | {X:nom}, | 9 | iki | vidurdienio. | {m:Patenkintas|f:Patenkinta}?",
        "Štai. „Gusas, {X:nom}, 9–12 val.“ {m:Patenkintas|f:Patenkinta}?", { say: "There. \"Gus, {X}, nine to noon.\" Happy?" }),
    ],
    as_promised: [t("And, | as | promised, | I'll text | you.", "O, | kaip | žadėjau, | parašysiu žinutę | jums.", "O kaip žadėjau – parašysiu jums žinutę.")],
    already_texted: [t("I | already | texted | you!", "Aš | jau | parašiau žinutę | jums!", "Jau parašiau jums žinutę!")],
    discount_react: [
      t("Let's talk | about | that | after | {X}. | Send | me | an | email.", "Pakalbėkime | apie | tai | po | {X:gen}. | Atsiųskite | man | — | el. laišką.",
        "Apie tai pakalbėkime po {X:gen}. Atsiųskite man el. laišką."),
    ],
    discount_first: [t("First | the | heat, | then | the | money.", "Pirma | — | šildymas, | paskui | — | pinigai.", "Pirma šildymas, paskui pinigai.")],
    trip_info: [
      t("Two | weeks | in Florida. | Sun, | sand | and | no | radiators!", "Dvi | savaites | Floridoje. | Saulė, | smėlis | ir | jokių | radiatorių!",
        "Dvi savaites Floridoje. Saulė, smėlis ir jokių radiatorių!", { flags: { 7: "“no” + noun = jokių + genitive." } }),
    ],
    trip_thanks: [t("Thanks! | I | can't wait.", "Ačiū! | Aš | negaliu sulaukti.", "Ačiū! Negaliu sulaukti.")],

    // --- the rent ----------------------------------------------------------------------
    rent_twist: [
      t("Oh, | and | since | you're | here: | this | month's | rent?", "O, | ir | kadangi | jūs | čia: | šio | mėnesio | nuoma?", "O, ir jau kai čia esate – šio mėnesio nuoma?",
        { flags: { 3: "“you're” = jūs; the verb “are” needs no word here." } }),
    ],
    rent_amount: [t("$1,400, | as | always.", "1 400 dolerių, | kaip | visada.", "1 400 dolerių, kaip visada.", { say: "Fourteen hundred, as always." })],
    rent_reask: [t("So... | the | rent?", "Tai... | — | nuoma?", "Tai kaip… nuoma?")],
    rent_thanks: [
      t("Thanks! | You're | my | favorite | tenant.", "Ačiū! | Jūs esate | mano | {m:mėgstamiausias|f:mėgstamiausia} | {m:nuomininkas.|f:nuomininkė.}",
        "Ačiū! Jūs – {m:mano mėgstamiausias nuomininkas|f:mano mėgstamiausia nuomininkė}."),
    ],
    receipt_react: [
      t("A | receipt? | Wow. | You | don't trust | me, | huh?", "— | Kvito? | Oho. | Jūs | nepasitikite | manimi, | ar ne?", "Kvito? Oho. Jūs manimi nepasitikite, ar ne?",
        { flags: { 1: "Genitive kvito: an echo of “You need a receipt?” (reikia kvito)." } }),
    ],
    receipt_write: [t("Fine. | \"Paid | in full.\" | There you go.", "Gerai. | Sumokėta | visa suma. | Prašom.", "Gerai. „Sumokėta visa suma.“ Prašom.")],
    receipt_for_what: [t("A | receipt? | For | what?", "— | Kvito? | Už | ką?", "Kvito? Už ką?", { flags: { 1: "Genitive kvito: an echo of “You need a receipt?” (reikia kvito)." } })],
    rent_later_ok: [t("No | problem, | just | send | it | online.", "Jokių | problemų, | tiesiog | atsiųskite | ją | internetu.", "Jokių problemų, tiesiog perveskite internetu.")],
    paid_already: [
      t("Oh, | right, | you | did. | My | brain | is | already | in Florida.", "O, | tiesa, | jūs | [sumokėjote]. | Mano | smegenys | yra | jau | Floridoje.",
        "O, tiesa, sumokėjote. Mano galva jau Floridoje.", { flags: { 3: "Elliptical “did”: Lithuanian repeats the verb, sumokėjote." } }),
    ],
    rent_is_rent: [t("Rent | is | rent, | heat | is | heat.", "Nuoma | yra | nuoma, | šildymas | yra | šildymas.", "Nuoma – nuoma, šildymas – šildymas.")],
    walkaway_rent: [
      t("Okay... | let's talk | when | I'm back.", "Gerai... | pakalbėkime | kai | grįšiu.", "Gerai… pakalbėsime, kai grįšiu.",
        { flags: { 3: "After kai, Lithuanian uses the future (grįšiu) for “I'm back”." } }),
    ],

    // --- the goodbye -----------------------------------------------------------------
    bye_success: [
      t("Okay, | I | really | have | to run. | Stay warm | in there!", "Gerai, | aš | tikrai | turiu | bėgti. | Nesušalkite | ten!", "Gerai, man tikrai reikia bėgti. Nesušalkite ten!",
        { flags: { 4: "“to run” (have to run) = bėgti, i.e. leave in a hurry." } }),
    ],
    final_full: [t("And | hey: | thanks | for | being patient.", "Ir | ei: | ačiū | už | kantrybę.", "Ir ei – ačiū už kantrybę.")],
    final_wed: [t("Wednesday, | then. | Maybe | buy | an | extra | blanket.", "Trečiadienį, | vadinasi. | Gal | nusipirkite | — | papildomą | antklodę.", "Vadinasi, trečiadienį. Gal nusipirkite dar vieną antklodę.")],
    final_partial: [t("And | please, | don't touch | the | boiler.", "Ir | prašau, | nelieskite | — | katilo.", "Ir prašau, nelieskite katilo.")],
    bye_back: [
      t("Bye now!", "Viso gero!", "Viso gero!"),
      t("See you | in | two | weeks!", "Iki | po | dviejų | savaičių!", "Iki, pasimatysime po dviejų savaičių!"),
    ],
    walkaway: [
      t("Okay... | call | me | if | it gets | worse!", "Gerai... | skambinkite | man | jei | pasidarys | blogiau!", "Gerai… skambinkite, jei pasidarys blogiau!",
        { flags: { 4: "After jei, Lithuanian uses the future for a future condition; the dummy “it” has no word." } }),
    ],

    // --- small reactions -----------------------------------------------------------------
    cold_react_outside: [
      t("Colder | than | outside? | Now | you're exaggerating.", "Šalčiau | nei | lauke? | Dabar | jūs perdedate.", "Šalčiau nei lauke? Na, dabar jūs jau perdedate."),
    ],
    cold_react: [
      t("Brr. | Okay, | I | get the picture.", "Brr. | Gerai, | aš | supratau.", "Brr. Gerai, supratau."),
      t("Ouch. | Okay, | I | hear | you.", "Oi. | Gerai, | aš | suprantu | jus.", "Oi. Gerai, suprantu jus.", { flags: { 3: "“hear” (I hear you) = suprantu: I understand you." } }),
    ],
    cat_react: [t("Your | cat? | Smart | cat.", "Jūsų | katė? | Protinga | katė.", "Jūsų katė? Protinga katė.")],
    heater_react: [t("Smart. | Just | don't put | it | near | the | curtains.", "Protinga. | Tik | nestatykite | jo | prie | — | užuolaidų.", "Protinga. Tik nestatykite jo prie užuolaidų.")],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Sure.", "Žinoma.", "Žinoma.")],
  },

  hints: {
    greet: {
      lt: "Pasisveikinti ir pasakyti, kas tu",
      items: [
        { id: "its_me", s: t("Mr. | Patel, | it's | me, | from | 2B.", "Pone | Pateli, | čia | aš, | iš | 2B.", "Pone Pateli, čia aš, iš 2B buto.",
          { say: "Mr. Patel, it's me, from two B.", flags: { 2: "“it's” = čia (here): an identifying formula, and “is” needs no word." } }) },
        { id: "hi_patel", s: t("Good | morning, | Mr. | Patel!", "Labas | rytas, | pone | Pateli!", "Labas rytas, pone Pateli!") },
        { id: "sorry_bother", s: t("Sorry | to bother | you, | but | it's | important.", "Atsiprašau, kad | trukdau | jums, | bet | tai | svarbu.", "Atsiprašau, kad trukdau, bet tai svarbu.",
          { flags: { 1: "“to bother” = trukdau: after atsiprašau, kad the verb is finite.", 4: F_ITS } }) },
        { id: "minute", s: t("Do | you | have | a | minute?", "Ar | jūs | turite | — | minutę?", "Ar turite minutę?", { flags: { 0: F_DO_Q } }) },
      ],
    },
    problem: {
      lt: "Paaiškinti, kas neveikia",
      items: [
        { id: "song_broken", s: t("The | heating | has been broken | for | a | week.", "— | Šildymas | yra sugedęs | jau | — | savaitę.", "Šildymas neveikia jau savaitę.",
          { flags: { 3: "“for” + the present perfect = jau; the accusative savaitę gives the length." } }) },
        { id: "heat_not_working", s: t("My | heat | isn't working.", "Mano | šildymas | neveikia.", "Mano bute neveikia šildymas.") },
        { id: "radiator_cold", s: t("My | radiators | are | ice cold.", "Mano | radiatoriai | yra | lediniai.", "Mano radiatoriai lediniai.") },
        { id: "cold_apt", s: t("It's freezing | in | my | apartment.", "Labai šalta | — | mano | bute.", "Mano bute labai šalta.",
          { flags: { 1: "“in”: the locative ending of bute carries it (C-CASE-DASH)." } }) },
        { id: "kitchen_colder", s: t("My | kitchen | is | colder | than | outside.", "Mano | virtuvėje | yra | šalčiau | nei | lauke.", "Mano virtuvėje šalčiau nei lauke.",
          { flags: { 1: "Impersonal Lithuanian: the kitchen becomes a place (virtuvėje), not a subject." } }) },
        { id: "sleep_coat", s: t("I'm sleeping | in | my | coat.", "Aš miegu | su | savo | paltu.", "Miegu su paltu.", { flags: { 1: "“in” (wearing) = su." } }) },
      ],
    },
    thermostat: {
      lt: "Atsakyti apie termostatą",
      items: [
        { id: "checked_twice", s: t("Yes, | I | checked | it | twice.", "Taip, | aš | patikrinau | jį | du kartus.", "Taip, patikrinau du kartus.") },
        { id: "not_thermostat", s: t("It's | not | the | thermostat.", "Tai | ne | — | termostatas.", "Kaltas ne termostatas.", { flags: { 0: F_ITS } }) },
        { id: "tried_everything", s: t("I've | tried | everything.", "Aš | išbandžiau | viską.", "Išbandžiau viską.", { flags: { 0: F_IVE } }) },
      ],
    },
    duration: {
      lt: "Pasakyti, kiek laiko tai tęsiasi",
      items: [
        { id: "song_broken", s: t("The | heating | has been broken | for | a | week.", "— | Šildymas | yra sugedęs | jau | — | savaitę.", "Šildymas neveikia jau savaitę.",
          { flags: { 3: "“for” + the present perfect = jau; the accusative savaitę gives the length." } }) },
        { id: "since_last", s: t("Since | last | Wednesday.", "Nuo | praėjusio | trečiadienio.", "Nuo praėjusio trečiadienio.") },
        { id: "a_week", s: t("For | a | week | now.", "— | — | Savaitę | jau.", "Jau savaitę.",
          { flags: { 0: "“For” + a length of time: the accusative savaitę carries it.", 3: "“now” (so far) = jau." } }) },
        { id: "called_every_day", s: t("I've | called | you | every | day.", "Aš | skambinau | jums | kiekvieną | dieną.", "Skambinau jums kiekvieną dieną.", { flags: { 0: F_IVE } }) },
        { id: "left_voicemail", s: t("I | left | you | three | messages.", "Aš | palikau | jums | tris | žinutes.", "Palikau jums tris žinutes.") },
      ],
    },
    dodge: {
      lt: "Ramiai, bet tvirtai priminti, kad taisyti – nuomotojo pareiga",
      items: [
        { id: "your_resp", s: t("It's | your | responsibility | to fix | it.", "Tai | jūsų | atsakomybė | sutaisyti | jį.", "Sutaisyti jį – jūsų atsakomybė.",
          { flags: { 0: "Anticipatory “It's” = tai; “is” needs no word." } }) },
        { id: "afraid_resp", s: t("I'm afraid | it's | your | responsibility | to fix | it.", "Deja, | tai | jūsų | atsakomybė | sutaisyti | jį.", "Deja, sutaisyti jį – jūsų atsakomybė.",
          { flags: { 1: "Anticipatory “it's” = tai; “is” needs no word." } }), note: "„I'm afraid…“ – mandagi, bet tvirta pradžia." },
        { id: "contract", s: t("According to | the | lease, | repairs | are | your | responsibility.", "Pagal | — | sutartį, | remonto darbai | yra | jūsų | atsakomybė.",
          "Pagal sutartį remontas – jūsų atsakomybė."), note: "„Lease“ – buto nuomos sutartis." },
        { id: "heat_included", s: t("Heat | is | included | in | the | rent.", "Šildymas | yra | įskaičiuotas | į | — | nuomą.", "Šildymas įskaičiuotas į nuomos kainą.") },
        { id: "been_patient", s: t("I've | been | patient, | but | patience | doesn't keep | me | warm.", "Aš | buvau | {m:kantrus,|f:kantri,} | bet | kantrybė | nesušildo | manęs | —.",
          "Buvau {m:kantrus|f:kantri}, bet kantrybė manęs nesušildo.",
          { flags: { 0: "“I've”: the perfect auxiliary has no word; buvau carries the past.", 7: "“warm” of “keep … warm” is carried by nesušildo (unit 5)." } }) },
        { id: "please_fix", s: t("You're | the | landlord. | Please | fix | it.", "Jūs esate | — | nuomotojas. | Prašau | sutaisykite | jį.", "Jūs – nuomotojas. Prašau, sutaisykite.") },
        { id: "send_someone", s: t("Could | you | send | someone, | please?", "Ar galėtumėte | jūs | atsiųsti | ką nors, | prašau?", "Gal galėtumėte ką nors atsiųsti?") },
      ],
    },
    offer: {
      lt: "Mandagiai atsisakyti pasiūlymo",
      items: [
        { id: "not_agreed", s: t("That's | not | what | we | agreed.", "Tai | ne | tai, dėl ko | mes | susitarėme.", "Mes taip nesusitarėme.",
          { flags: { 0: F_THATS, 2: "“what” = tai, dėl ko (susitarti takes dėl)." } }) },
        { id: "not_plumber", s: t("I'm | not | a | plumber.", "Aš | nesu | — | {m:santechnikas.|f:santechnikė.}", "Aš ne {m:santechnikas|f:santechnikė}.",
          { flags: { 0: "“'m” (am): the negated copula nesu (under “not”) carries it." } }) },
        { id: "no_thanks_pro", s: t("No, | thank | you. | Please | send | a | professional.", "Ne, | ačiū | jums. | Prašau | atsiųsti | — | specialistą.", "Ne, ačiū. Prašau atsiųsti specialistą.",
          { flags: { 1: "“thank” = ačiū; the dative jums (unit 2) takes “you”." } }) },
        { id: "rather_not", s: t("I'd rather | not | touch | it.", "Verčiau | — | neliesčiau | jo.", "Verčiau jo neliesčiau.",
          { flags: { 1: "“not”: the ne- of neliesčiau carries it; genitive jo after the negation." } }) },
        { id: "your_resp", s: t("It's | your | responsibility | to fix | it.", "Tai | jūsų | atsakomybė | sutaisyti | jį.", "Sutaisyti jį – jūsų atsakomybė.",
          { flags: { 0: "Anticipatory “It's” = tai; “is” needs no word." } }) },
      ],
    },
    date_when: {
      lt: "Paklausti, kada atvažiuos meistras",
      items: [
        { id: "when_come_out", s: t("When | can | someone | come out?", "Kada | gali | kas nors | atvažiuoti?", "Kada kas nors galės atvažiuoti?") },
        { id: "sooner", s: t("Could | someone | come | sooner?", "Ar galėtų | kas nors | atvažiuoti | anksčiau?", "Ar kas nors galėtų atvažiuoti anksčiau?") },
      ],
    },
    date_sooner: {
      lt: "Paprašyti, kad atvažiuotų anksčiau",
      items: [
        { id: "too_late", s: t("Next | week | is | too | late.", "Kita | savaitė | yra | per | vėlu.", "Kita savaitė – per vėlu.") },
        { id: "sooner", s: t("Could | someone | come | sooner?", "Ar galėtų | kas nors | atvažiuoti | anksčiau?", "Ar kas nors galėtų atvažiuoti anksčiau?") },
        { id: "before_weekend", s: t("Before | the | weekend, | please.", "Iki | — | savaitgalio, | prašau.", "Prašau, iki savaitgalio.") },
      ],
    },
    date_ok: {
      lt: "Sutikti dėl datos",
      items: [
        { id: "friday_works", s: t("Friday | morning | works | for me.", "Penktadienio | rytas | tinka | man.", "Man tinka penktadienio rytas.") },
        { id: "works_me", s: t("That | works | for me.", "Tai | tinka | man.", "Man tinka.") },
        { id: "saturday_better", s: t("Saturday | would | be | better.", "Šeštadienis | — | būtų | geriau.", "Šeštadienį būtų geriau.",
          { flags: { 1: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
      ],
    },
    home: {
      lt: "Pasakyti, ar būsi namie",
      items: [
        { id: "ill_be_home", s: t("Yes, | I'll be | home.", "Taip, | būsiu | namie.", "Taip, būsiu namie.") },
        { id: "key_with_rita", s: t("I | can | leave | a | key | with | Rita.", "Aš | galiu | palikti | — | raktą | pas | Ritą.", "Galiu palikti raktą Ritai.") },
        { id: "at_work", s: t("No, | I'll be | at work.", "Ne, | būsiu | darbe.", "Ne, būsiu darbe.") },
      ],
    },
    wrap: {
      lt: "Paprašyti patvirtinimo raštu",
      items: [
        { id: "email_please", s: t("Can | you | put | that | in | an | email, | please?", "Ar galite | jūs | parašyti | tai | — | — | el. laišku, | prašau?", "Gal galite man tai parašyti el. laišku?",
          { flags: { 2: "“put … in an email” = parašyti el. laišku.", 4: "“in”: the instrumental el. laišku carries it." } }) },
        { id: "in_writing", s: t("Could | I | have | that | in writing?", "Ar galėčiau | aš | gauti | tai | raštu?", "Ar galėčiau tai gauti raštu?") },
        { id: "text_me", s: t("Could | you | text | me | the | date?", "Ar galėtumėte | jūs | atsiųsti žinute | man | — | datą?", "Gal galėtumėte atsiųsti man datą žinute?") },
      ],
    },
    done: {
      lt: "Pasakyti, kad tai viskas",
      items: [
        { id: "thats_all", s: t("No, | that's | all, | thanks.", "Ne, | tai yra | viskas, | ačiū.", "Ne, tai viskas, ačiū.") },
        { id: "good_trip", s: t("Thanks, | Mr. | Patel. | Have | a | good | trip!", "Ačiū, | pone | Pateli. | Linkiu | — | geros | kelionės!", "Ačiū, pone Pateli. Geros kelionės!",
          { flags: { 3: "“Have” (a wish) = linkiu, followed by the genitive." } }) },
      ],
    },
    rent: {
      lt: "Sumokėti nuomą ir paprašyti kvito",
      items: [
        { id: "here_check", s: t("Sure. | Here's | the | check.", "Žinoma. | Štai | — | čekis.", "Žinoma. Štai čekis.") },
        { id: "need_receipt", s: t("I'll need | a | receipt.", "Man reikės | — | kvito.", "Man reikės kvito.") },
        { id: "receipt_please", s: t("Could | I | get | a | receipt, | please?", "Ar galėčiau | aš | gauti | — | kvitą, | prašau?", "Ar galėčiau gauti kvitą?") },
        { id: "pay_online", s: t("I'll pay | online | on the first.", "Sumokėsiu | internetu | pirmą mėnesio dieną.", "Sumokėsiu internetu pirmą mėnesio dieną.") },
      ],
    },
    bye: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "good_trip", s: t("Thanks, | Mr. | Patel. | Have | a | good | trip!", "Ačiū, | pone | Pateli. | Linkiu | — | geros | kelionės!", "Ačiū, pone Pateli. Geros kelionės!",
          { flags: { 3: "“Have” (a wish) = linkiu, followed by the genitive." } }) },
        { id: "enjoy_florida", s: t("Enjoy | the | sun | in Florida!", "Mėgaukitės | — | saule | Floridoje!", "Mėgaukitės Floridos saule!") },
      ],
    },
    rita: {
      lt: "Padėkoti Ritai",
      items: [
        { id: "thanks_rita", s: t("Thanks, | Rita!", "Ačiū, | Rita!", "Ačiū, Rita!") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "i'm off": { reason: "lexical_expression", split: "I'm → aš esu + off → išjungtas is false; “be off (to)” = leave, išvykstu.", minimal: "Subject + be + particle." },
    "make it quick": { reason: "lexical_expression", split: "make → padarykite, it → tai, quick → greitas suggests making an object; the formula = tik trumpai.", minimal: "The whole formula." },
    "let me guess": { reason: "lexical_expression", split: "let → leiskite, me → man, guess → spėti gives the calque “leiskite man spėti”; the set phrase = leiskite atspėti.", minimal: "Three words, one formula." },
    "give it a try": { reason: "lexical_expression", split: "give → duokite, it → tai, a → —, try → bandymą is false; = pabandykite.", minimal: "The whole idiom." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgai gives “kaip ilgai”; the duration question = kiek laiko.", minimal: "Two words." },
    "been out": { reason: "lexical_expression", split: "been → buvo + out → lauke is false; for heat or power “out” = not working, neveikia.", minimal: "Verb and particle." },
    "been going on": { reason: "grammatical_fusion", split: "been → buvo, going → einantis, on → toliau is false; a state that still goes on = tęsiasi.", minimal: "Auxiliary, verb and particle." },
    "been meaning": { reason: "grammatical_fusion", split: "been → buvo + meaning → reiškiantis is false; “have been meaning to” = vis ketinau.", minimal: "Auxiliary and verb." },
    "couldn't help overhearing": { reason: "lexical_expression", split: "couldn't → negalėjau, help → padėti, overhearing → nugirsti gives “negalėjau padėti nugirsti”; “can't help -ing” = negalėjau nenugirsti.", minimal: "The construction “couldn't help + -ing”." },
    "stay warm": { reason: "lexical_expression", split: "stay → likite + warm → šilti gives “likite šilti”; the wish = nesušalkite / nesušalk.", minimal: "Two words, one wish." },
    "no need for that": { reason: "lexical_expression", split: "no → ne, need → reikia, for → dėl, that → to gives “ne reikia dėl to”; the rebuke = nereikia taip.", minimal: "The whole formula." },
    "no one": { reason: "lexical_expression", split: "no → ne + one → vienas gives “ne vienas” (= several!); the pronoun = niekas.", minimal: "Two words, one pronoun." },
    "let's talk": { reason: "grammatical_fusion", split: "let's → leiskime + talk → kalbėti is false; the first-person plural imperative = kalbėkime / pakalbėkime.", minimal: "“Let's” + verb." },
    "let's start": { reason: "grammatical_fusion", split: "let's → leiskime + start → pradėti is false; = pradėkime.", minimal: "“Let's” + verb." },
    "tell you what": { reason: "lexical_expression", split: "tell → pasakysiu, you → jums, what → ką is a literal reading of a discourse marker; = žinote ką.", minimal: "The whole marker." },
    "let me see": { reason: "lexical_expression", split: "let → leiskite, me → man, see → matyti is false; the thinking formula = pažiūrėkime.", minimal: "The whole formula." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "come out": { reason: "lexical_expression", split: "come → ateiti + out → lauk is false; a service visit = atvažiuoti.", minimal: "Verb and particle." },
    "booked solid": { reason: "lexical_expression", split: "booked → užsakytas + solid → kietas is false; = visiškai užimtas.", minimal: "Two words, one expression." },
    "drive a hard bargain": { reason: "lexical_expression", split: "drive → vairuojate, a → —, hard → kietą, bargain → sandorį is a word salad; the idiom = mokate kietai derėtis.", minimal: "The whole idiom." },
    "there you go": { reason: "lexical_expression", split: "there → ten, you → jūs, go → eikite is false; handing something over = prašom.", minimal: "The whole formula." },
    "bye now": { reason: "lexical_expression", split: "bye → ate + now → dabar gives “ate dabar”; the farewell = viso gero.", minimal: "Two words." },
    "get the picture": { reason: "lexical_expression", split: "get → gauti, the → —, picture → paveikslą is false; = supratau.", minimal: "Verb + article + noun, one idiom." },
    "has been broken": { reason: "grammatical_fusion", split: "has → turi, been → buvo, broken → sugedęs gives “turi buvo sugedęs”; the present perfect of a state that still lasts = yra sugedęs (+ jau).", minimal: "Auxiliary, auxiliary and participle." },
    "ice cold": { reason: "lexical_expression", split: "ice → ledas + cold → šalti gives “ledas šalti”; = lediniai.", minimal: "Two words, one adjective." },
    "according to": { reason: "lexical_expression", split: "according → atitinkamai + to → į is false; = pagal.", minimal: "Two words, one preposition." },
    "i'd rather": { reason: "lexical_expression", split: "I'd → aš + rather → greičiau is false; a preference = verčiau.", minimal: "Subject + would + adverb." },
    "i'm back": { reason: "lexical_expression", split: "I'm → aš esu + back → atgal gives the calque “aš esu atgal”; “be back” = grįžti (here grįšiu).", minimal: "Subject + be + particle." },
    "being patient": { reason: "grammatical_fusion", split: "being → esant + patient → kantriam is false; after “thanks for” the gerund phrase = kantrybę (a noun).", minimal: "Gerund + adjective." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs gives a false “I am scared”; the polite softener = deja.", minimal: "Two words." },
    "one thing at a time": { reason: "lexical_expression", split: "one → vienas, thing → dalykas, at → prie, a → —, time → laikas is a word salad; the saying = viskas iš eilės.", minimal: "The whole saying." },
    "it gets": { reason: "grammatical_fusion", split: "Dummy “it” → tai would add a false subject; the impersonal pasidarys absorbs it (C-DUMMY).", minimal: "Two words." },
    "in writing": { reason: "lexical_expression", split: "in → į + writing → rašymą is false; = raštu.", minimal: "Two words, one adverb." },
    "in full": { reason: "lexical_expression", split: "in → į + full → pilną is false; “paid in full” = sumokėta visa suma.", minimal: "Two words." },
    "in there": { reason: "lexical_expression", split: "in → viduje + there → ten doubles the place; “in there” (that apartment) = ten.", minimal: "Two words, one place adverb." },
    "by heart": { reason: "lexical_expression", split: "by → prie + heart → širdies is false; = mintinai.", minimal: "Two words, one adverb." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausiai is false; = bent / mažų mažiausiai.", minimal: "Two words, one adverb." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "problem", lt: "Paaiškink, kas atsitiko" },
    { step: "duration", lt: "Pasakyk, kiek laiko tai tęsiasi" },
    { step: "dodge", lt: "Primink, kad taisyti – nuomotojo pareiga" },
    // hidden when the learner took the offer (the partial ending)
    { lt: "Mandagiai atsisakyk taisyti savo jėgomis", optional: true, when: (c) => c.s.offer !== "accepted", done: (c) => c.s.offer === "refused" },
    { step: "date", lt: "Sutark, kada atvažiuos meistras" },
    // extras: shown once done
    { lt: "Paprašyk patvirtinimo raštu", optional: true, when: () => false, done: (c) => !!c.s.writing },
    { lt: "Sumokėk nuomą ir paprašyk kvito", optional: true, when: () => false, done: (c) => !!c.s.receipt },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem,
      ask: (c) => { if (!c.s.whoSaid) { c.s.whoSaid = true; P(c, "greet_who"); } else P(c, "problem_reask"); },
      expects: ["heat_broken", "cold_detail", "space_heater", "greet_id", "called_before", "have_problem"],
      suggest: [{ lt: "Paaiškinti, kas neveikia", hint: "problem" }, { lt: "Pasisveikinti ir pasakyti, kas tu", hint: "greet" }],
      yes: (c) => { P(c, "problem_what"); c.hold(); },
      no: (c) => { P(c, "no_then_what"); c.hold(); },
      help: (c) => { P(c, "problem_reask"); } },
    // asked once; dropped if the learner moves on
    { id: "thermostat", when: (c) => !!c.s.problem && !!c.s.thermoQ, done: (c) => !!c.s.thermoAsked || !!c.s.thermoDone,
      ask: (c) => { c.s.thermoAsked = true; P(c, "thermostat_q"); },
      expects: ["thermo_yes", "thermo_no", "heat_broken"],
      suggest: [{ lt: "Atsakyti apie termostatą", hint: "thermostat" }],
      yes: (c) => { if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_ok"); } },
      no: (c) => { if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_no"); P(c, "thermostat_no2"); } },
      help: (c) => { c.s.thermoDone = true; P(c, "thermostat_no"); P(c, "thermostat_no2"); } },
    { id: "duration", when: (c) => !!c.s.problem, done: (c) => !!c.s.dur,
      ask: (c) => { if (!c.s.durAsked) { c.s.durAsked = true; P(c, "duration_ask"); } else P(c, "since_when"); },
      expects: ["heat_duration", "dur_ctx", "called_before", "patient", "heat_broken"],
      suggest: [{ lt: "Pasakyti, kiek laiko tai tęsiasi", hint: "duration" }],
      help: (c) => { P(c, "dur_unknown"); setDur(c, 3, false); } },
    // the twist (once)
    { id: "rita", when: (c) => !!c.s.dur && c.s.twist === "rita", done: (c) => !!c.s.ritaShown, ask: ritaTwist },
    { id: "dodge", when: (c) => !!c.s.dur, done: (c) => !!c.s.resp, ask: askDodge,
      expects: ["responsibility", "request_fix", "patient", "threat", "withhold", "cold_detail", "ask_discount", "you_kidding", "ask_when"],
      suggest: [{ lt: "Priminti nuomotojo pareigą (pagal sutartį)", hint: "dodge" }],
      help: (c) => { dodgeHelp(c); } },
    { id: "offer", when: (c) => !!c.s.resp, done: (c) => !!c.s.offer, ask: askOffer,
      expects: ["refuse_offer", "responsibility", "accept_offer", "request_fix", "walk_away", "ask_when", "you_kidding", "threat", "withhold"],
      suggest: [{ lt: "Mandagiai atsisakyti pasiūlymo", hint: "offer" }],
      // (once the offer is settled, a yes/no answers the day on the table)
      yes: (c) => { if (c.s.offer) { if (!c.s.date) dateYes(c); return; } acceptOffer(c); },
      no: (c) => { if (c.s.offer) { if (!c.s.date) dateNo(c); return; } if (/^\W*(no|nope|nah)\W*$/i.test(c.heard)) c.tip(TIPS.bare_no); refuse(c); },
      help: (c) => { P(c, "offer_reask"); } },
    { id: "date", when: (c) => !!c.s.offer, done: (c) => !!c.s.date, ask: askDate,
      expects: ["ask_when", "too_late", "propose_day", "day_ctx", "accept_date", "day_no", "in_writing", "patient"],
      suggest: (c) => c.s.level === 0
        ? [{ lt: "Paklausti, kada atvažiuos meistras", hint: "date_when" }, { lt: "Paprašyti, kad atvažiuotų anksčiau", hint: "date_sooner" }]
        : c.s.level === 1
          ? [{ lt: "Paprašyti, kad atvažiuotų anksčiau", hint: "date_sooner" }, { lt: "Sutikti dėl datos", hint: "date_ok" }]
          : [{ lt: "Sutikti dėl datos", hint: "date_ok" }, { lt: "Paprašyti patvirtinimo raštu", hint: "wrap" }],
      yes: (c) => { dateYes(c); },
      no: (c) => { dateNo(c); },
      help: (c) => { if (c.s.level === 0) offerWednesday(c); else askDate(c); c.hold(); } },
    // asked once (an optional question)
    { id: "home", when: (c) => !!c.s.date && !!c.s.homeQ, done: (c) => !!c.s.homeAsked || !!c.s.homeDone,
      ask: (c) => {
        c.s.homeAsked = true;
        P(c, "home_q");
        c.expect({ id: "home", optional: true, expects: ["home_yes", "leave_key", "not_home"], hints: ["home"],
          suggest: [{ lt: "Pasakyti, ar būsi namie", hint: "home" }],
          on: {
            home_yes: (cc) => { cc.s.homeDone = true; P(cc, "home_ok"); },
            leave_key: (cc) => { cc.s.homeDone = true; P(cc, "key_rita"); },
            not_home: (cc) => { cc.s.homeDone = true; P(cc, "gus_key"); },
          },
          yes: (cc) => { cc.s.homeDone = true; P(cc, "home_ok"); },
          no: (cc) => { cc.s.homeDone = true; P(cc, "gus_key"); } });
      } },
    { id: "wrap", when: (c) => !!c.s.date, done: (c) => !!c.s.wrapDone, ask: (c) => { P(c, "anything_else"); },
      expects: ["in_writing", "no_more", "ask_discount", "trip_wish", "pay_rent", "g_thanks"],
      suggest: [{ lt: "Paprašyti patvirtinimo raštu", hint: "wrap" }, { lt: "Pasakyti, kad tai viskas", hint: "done" }],
      yes: (c) => { P(c, "g_yes_what"); c.hold(); },
      no: (c) => { c.s.wrapDone = true; },
      help: (c) => { c.s.wrapDone = true; c.ask("rent"); } },
    { id: "rent", when: (c) => !!c.s.wrapDone, done: (c) => !!c.s.rentDone,
      ask: (c) => { if (!c.s.rentAsked) { c.s.rentAsked = true; P(c, "rent_twist"); P(c, "rent_amount"); } else P(c, "rent_reask"); },
      expects: ["pay_rent", "pay_ctx", "ask_receipt", "pay_later", "paid_already", "withhold"],
      suggest: [{ lt: "Sumokėti nuomą ir paprašyti kvito", hint: "rent" }],
      yes: (c) => { payRent(c); },
      no: (c) => { c.s.rentDone = true; P(c, "rent_later_ok"); },
      help: (c) => { P(c, "rent_reask"); } },
  ],

  init: (c) => {
    c.s.known = c.visits >= 1;
    c.s.greetAgain = c.s.known && c.chance(0.5);
    c.s.thermoQ = c.chance(0.5);
    c.s.homeQ = c.chance(0.5);
    c.s.twist = c.chance(0.5) ? "rita" : null;
    c.s.sweater = c.chance(0.5);
    c.s.level = 0;
    c.s.rude = 0;
    c.s.dodgeAsks = 0;
  },

  start: (c) => {
    if (c.s.greetAgain) {
      P(c, "greet_again");
      c.expect({ id: "guess", expects: ["heat_broken", "cold_detail", "heat_duration", "space_heater"], hints: ["problem", "g_yesno"],
        suggest: [{ lt: "Patvirtinti ir paaiškinti, kas neveikia", hint: "problem" }],
        on: {
          heat_broken: (cc, sl, sg) => { landlord.handlers.heat_broken(cc, sl, sg); },
          cold_detail: (cc, sl, sg) => { landlord.handlers.cold_detail(cc, sl, sg); },
          space_heater: (cc, sl, sg) => { landlord.handlers.space_heater(cc, sl, sg); },
          heat_duration: (cc, sl, sg) => { cc.s.problem = true; landlord.handlers.heat_duration(cc, sl, sg); },
        },
        yes: (cc) => { cc.s.problem = true; P(cc, "knew_it"); },
        no: (cc) => { cc.s.whoSaid = true; P(cc, "no_then_what"); cc.hold(); },
        ask: (cc) => { P(cc, "guess_reask"); } });
      return;
    }
    P(c, "greet_open");
    c.hold();
  },

  handlers: {
    // --- greeting ---
    greet_id(c) {
      if (/^\W*(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(c.heard) && !c.s.__greetedBack) { c.s.__greetedBack = true; P(c, "g_hello"); }
      if (!c.s.problem && !c.s.minuteSaid && /\b(minute|moment|second|talk)\b/i.test(c.heard)) { c.s.minuteSaid = true; P(c, "one_minute"); }
    },

    // --- the problem ---
    have_problem(c) {
      if (c.s.problem) { P(c, "i_know"); return; }
      P(c, "problem_what"); c.hold();
    },
    heat_broken(c, slots, seg) {
      const first = !c.s.problem;
      c.s.problem = true;
      const d = daysOf(slots, seg.tags, c.heard);
      if (d && !c.s.dur) { setDur(c, d); return; }
      if (first) { if (c.chance(0.5)) P(c, "oh_no"); return; }
      P(c, "i_know");
    },
    cold_detail(c, slots, seg) {
      if (seg.tags.includes("cat")) P(c, "cat_react");
      else if (/colder than outside/i.test(c.heard) && !c.s.colderSaid) { c.s.colderSaid = true; P(c, "cold_react_outside"); }
      else P(c, "cold_react");
      if (typeof slots.number === "number" && slots.number < 40 && !/fahrenheit/i.test(c.heard)) c.tip(TIPS.us_celsius);
      c.s.problem = true;
    },
    space_heater(c) {
      c.s.problem = true;
      if (!c.s.heaterSaid) { c.s.heaterSaid = true; P(c, "heater_react"); } else P(c, "ack");
    },

    // --- how long ---
    heat_duration(c, slots, seg) {
      if (c.s.dur) { P(c, "i_know"); return; }
      c.s.problem = true;
      setDur(c, daysOf(slots, seg.tags, c.heard) ?? 7);
    },
    dur_ctx(c, slots, seg) { landlord.handlers.heat_duration(c, slots, seg); },
    called_before(c, slots, seg) {
      c.s.called = true;
      if (!c.s.vmSaid) { c.s.vmSaid = true; P(c, "voicemail_react"); } else P(c, "i_know");
      const d = daysOf(slots, seg.tags, c.heard);
      if (d && !c.s.dur && c.s.problem) setDur(c, d, false);
    },

    // --- the thermostat ---
    thermo_yes(c) { c.s.thermoAsked = true; if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_ok"); } },
    thermo_no(c) {
      c.s.thermoAsked = true;
      if (c.s.thermoDone) { P(c, "ack"); return; }
      c.s.thermoDone = true;
      if (/\b(what|which|where)\b/i.test(c.heard)) { P(c, "thermostat_where"); P(c, "thermostat_no2"); return; }
      P(c, "thermostat_no"); P(c, "thermostat_no2");
    },

    // --- whose job is it ---
    responsibility(c, _slots, seg) {
      const harsh = seg.tags.includes("harsh");
      if (harsh) { P(c, "blunt_react"); rude(c); }
      if (!c.s.problem) {
        if (mentionsHeat(c.heard)) c.s.problem = true;
        else { if (!harsh) P(c, "resp_what"); return; }
      }
      if (offerOpen(c)) { if (!harsh) c.s.resp = true; refuse(c); return; }
      if (c.s.resp === true || c.s.date) { if (!harsh) P(c, "i_know"); return; }
      c.s.resp = harsh ? (c.s.resp || "blunt") : true;
      if (harsh) return;
      const h = c.heard.toLowerCase();
      if (/\bincluded|includes\b/.test(h)) P(c, "resp_heat");
      else if (/\bpage two\b|\bline ten\b/.test(h) || (/\b(lease|contract|agreement)\b/.test(h) && c.chance(0.5))) P(c, "resp_lease");
      else P(c, "resp_react");
    },
    request_fix(c, slots, seg) {
      const harsh = seg.tags.includes("harsh") || (seg.tags.includes("imp") && !/\bplease\b/i.test(c.heard));
      if (harsh) {
        P(c, "blunt_react"); rude(c);
        if (!seg.tags.some((x) => x.startsWith("tip:"))) c.tip(TIPS.too_blunt);
      }
      if (!c.s.problem) {
        if (mentionsHeat(c.heard)) c.s.problem = true;
        else { if (!harsh) P(c, "fix_what"); return; }
      }
      if (offerOpen(c)) { refuse(c); return; }
      // a day is being agreed: "Could you send someone?" asks when
      if (c.s.offer && !c.s.date) { landlord.handlers.ask_when(c, slots, seg); return; }
      if (c.s.resp || c.s.date) { if (!harsh) P(c, "i_know"); return; }
      c.s.resp = harsh ? "blunt" : "soft";
      if (!harsh) P(c, c.s.dur ? "resp_soft" : "sure_sure");
    },
    patient(c, slots, seg) {
      if (c.s.offer && !c.s.date && /\bwait/i.test(c.heard)) { landlord.handlers.too_late(c, slots, seg); return; }
      if (!c.s.dur && c.s.problem) {
        const d = daysOf(slots, seg.tags, c.heard);
        if (d) { setDur(c, d); return; }
      }
      if (!c.s.patienceSaid) { c.s.patienceSaid = true; P(c, "patience_react"); } else P(c, "i_know");
    },
    you_kidding(c) {
      // "Are you kidding?" to "Fix it yourself": no to the offer
      if (offerOpen(c)) { refuse(c); return; }
      P(c, c.s.sweater && !c.s.ritaShown ? "sorry_joke" : "kidding");
    },
    threat(c) { P(c, "not_enemy"); rude(c); },
    withhold(c) {
      if (c.s.rentAsked && !c.s.rentDone) {
        c.s.withheld = (c.s.withheld || 0) + 1;
        if (c.s.withheld >= 2) { c.s.rentDone = true; c.s.rentFight = true; P(c, "walkaway_rent"); return; }
        P(c, "rent_is_rent");
        return;
      }
      P(c, "rent_threat_react"); rude(c);
    },

    // --- the offer ---
    refuse_offer(c) {
      if (offerOpen(c)) { refuse(c); return; }
      // a change of mind after "Okay, I'll try": Gus comes anyway
      if (c.s.offer === "accepted") { c.s.offer = "refused"; P(c, "ack"); return; }
      if (!c.s.resp && c.s.dur) { landlord.handlers.request_fix(c, {}, { intent: "request_fix", slots: {}, tags: [] }); return; }
      P(c, c.s.offer ? "i_know" : "ack");
    },
    accept_offer(c) { if (offerOpen(c)) { acceptOffer(c); return; } P(c, "ack"); },
    walk_away(c, _slots, seg) {
      // "Forget it." to "Fix it yourself": no to the offer (curt)
      if (offerOpen(c) && seg.tags.includes("forget")) { c.tip(TIPS.bare_no); refuse(c); return; }
      leave(c);
    },

    // --- the date ---
    ask_when(c, slots, seg) {
      if (c.s.date) { P(c, "date_confirm", { X: c.s.date }); return; }
      if (offerOpen(c)) { c.s.level = Math.max(c.s.level, 1); refuse(c); return; }
      if (!c.s.offer) {
        // at the dodge: a plain request ("When can someone come out?")
        if (c.s.dur && !c.s.resp) { landlord.handlers.request_fix(c, slots, { ...seg, tags: [] }); return; }
        P(c, "one_thing");
        return;
      }
      if (c.s.level === 0) { offerWednesday(c); c.hold(); return; }
      P(c, "window"); askDate(c); c.hold();
    },
    too_late(c) {
      if (c.s.date) {
        if (c.s.date === "wednesday") { c.s.date = "friday"; c.remember({ heatFixed: "friday" }); P(c, "sooner_react"); P(c, "window"); return; }
        P(c, "friday_best");
        return;
      }
      if (offerOpen(c)) { refuse(c); offerFriday(c); c.hold(); return; }
      if (!c.s.offer) { P(c, "one_thing"); return; }
      if (c.s.level < 2) offerFriday(c); else P(c, "friday_best");
      c.hold();
    },
    propose_day(c, slots) {
      if (c.s.date) { P(c, "ack"); return; }
      if (offerOpen(c)) refuse(c);
      if (!c.s.offer) { P(c, "one_thing"); return; }
      proposeDay(c, pickDay(slots.day));
      if (!c.s.date) c.hold();
    },
    day_ctx(c, slots) { landlord.handlers.propose_day(c, slots, { intent: "propose_day", slots, tags: [] }); },
    accept_date(c, slots) {
      if (offerOpen(c) && !slots.day) { acceptOffer(c); return; }
      if (c.s.date) { P(c, "ack"); return; }
      if (!c.s.offer) { P(c, "one_thing"); return; }
      if (slots.day) proposeDay(c, pickDay(slots.day), true); else dateYes(c);
      if (!c.s.date) c.hold();
    },
    day_no(c, slots) {
      if (c.s.date || !c.s.offer) { P(c, "ack"); return; }
      const d = pickDay(slots.day);
      // the day on the table: one step sooner (or "Friday is the best I can do")
      if ((c.s.level === 1 && d === "wednesday") || (c.s.level === 2 && d === "friday")) { dateNo(c); return; }
      P(c, "ack"); askDate(c); c.hold();
    },
    in_writing(c) {
      if (c.s.writing) { P(c, "already_texted"); return; }
      if (c.s.date) { sendText(c); return; }
      if (!c.s.offer) { P(c, "one_thing"); return; }
      c.s.writingAsked = c.heard;
      if (c.s.level === 0) { P(c, "writing_first"); offerWednesday(c); c.hold(); return; }
      setDate(c, c.s.level === 2 ? "friday" : "wednesday");
    },
    home_yes(c) { if (c.s.date && !c.s.homeDone) { c.s.homeDone = true; P(c, "home_ok"); } else P(c, "ack"); },
    leave_key(c) { if (c.s.date && !c.s.homeDone) { c.s.homeDone = true; P(c, "key_rita"); } else P(c, "ack"); },
    not_home(c) { if (c.s.date && !c.s.homeDone) { c.s.homeDone = true; P(c, "gus_key"); } else P(c, "ack"); },

    // --- wrapping up ---
    no_more(c) { if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; } P(c, "ack"); },
    ask_discount(c) { if (c.s.date) P(c, "discount_react", { X: c.s.date }); else P(c, "discount_first"); },
    ask_trip(c) { P(c, "trip_info"); },

    // --- the rent ---
    pay_rent(c) { payRent(c); },
    pay_ctx(c) { payRent(c); },
    ask_receipt(c) {
      // at the rent: the check comes with the request
      if (c.s.rentAsked && !c.s.rentDone) { payRent(c); receiptBeat(c); return; }
      if (c.s.rentPaid) { receiptBeat(c); return; }
      P(c, "receipt_for_what");
    },
    pay_later(c) { if (c.s.rentDone) { P(c, "ack"); return; } c.s.rentDone = true; P(c, "rent_later_ok"); },
    paid_already(c) { if (c.s.rentDone) { P(c, "ack"); return; } c.s.rentDone = true; P(c, "paid_already"); },

    // --- Rita and goodbye ---
    thanks_rita(c) { if (c.s.ritaShown) ritaBye(c); else P(c, "ack"); },
    trip_wish(c) {
      if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; }
      P(c, "trip_thanks");
    },
    g_thanks(c) {
      // "Thanks!" after the day is agreed: that's all (the rent comes next)
      if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; }
      // "Thanks, bye!": the goodbye answers it
      if (/\b(bye|goodbye|see you|take care)\b/i.test(c.heard)) return;
      P(c, "g_welcome");
    },
    g_bye(c) { leave(c); },
    // "Could you write it down?" once there is a day = in writing
    g_write(c, slots, seg) {
      if (c.s.date || c.s.offer) { landlord.handlers.in_writing(c, slots, seg); return; }
      GLOBAL_HANDLERS.g_write(c as any, slots);
    },
  },

  finish: (c) => {
    P(c, "bye_success");
    if (!c.s.rentFight) P(c, finalLine(c));
    c.expect(closing(c));
  },

  tests: [
    // greeting
    { say: "Mr. Patel, it's me, from 2B.", intent: "greet_id" },
    { say: "Good morning, Mr. Patel!", intent: "greet_id" },
    { say: "Sorry to bother you, but it's important.", intent: "greet_id" },
    { say: "Do you have a minute?", intent: "greet_id" },
    { say: "Mr. Patel!", intent: "greet_id" },
    { say: "I'm your tenant from upstairs", intent: "greet_id" },
    { say: "I have a problem.", intent: "have_problem", step: "problem" },
    // the problem
    { say: "The heating has been broken for a week.", intent: "heat_broken" },
    { say: "My heat isn't working.", intent: "heat_broken", step: "problem" },
    { say: "My radiators are ice cold.", intent: "heat_broken" },
    { say: "The heating doesn't go.", intent: "heat_broken" },
    { say: "The heating is broken since a week.", intent: "heat_broken", not: ["heat_duration"] },
    { say: "Heating not working", intent: "heat_broken", step: "problem" },
    { say: "It's freezing in my apartment.", intent: "cold_detail" },
    { say: "It's freezing in my flat.", intent: "cold_detail" },
    { say: "My kitchen is colder than outside.", intent: "cold_detail" },
    { say: "I'm sleeping in my coat.", intent: "cold_detail" },
    { say: "It's 14 degrees in my apartment.", intent: "cold_detail", slots: { number: 14 } },
    { say: "I bought a space heater.", intent: "space_heater" },
    // meaning must not flip
    { say: "The heating is working now.", intent: "none" },
    { say: "The heating isn't broken.", intent: "none" },
    // how long
    { say: "Since last Monday.", intent: "heat_duration", step: "duration", slots: { day: "monday" } },
    { say: "For a week now.", intent: "heat_duration", step: "duration" },
    { say: "A week.", intent: "heat_duration", step: "duration" },
    { say: "Two weeks.", intent: "heat_duration", step: "duration", slots: { number: 2 } },
    { say: "It stopped working on Monday.", intent: "heat_duration", step: "duration" },
    { say: "Monday.", intent: "dur_ctx", step: "duration", slots: { day: "monday" } },
    { say: "Monday.", intent: "none" },
    { say: "Since a week.", intent: "heat_duration", step: "duration" },
    { say: "I've called you every day.", intent: "called_before" },
    { say: "I left you three messages.", intent: "called_before" },
    { say: "You never answer your phone.", intent: "called_before" },
    { say: "I rang you every day.", intent: "called_before" },
    // the thermostat
    { say: "Yes, I checked it twice.", intent: "thermo_yes", step: "thermostat" },
    { say: "It's not the thermostat.", intent: "thermo_yes", step: "thermostat" },
    { say: "I've tried everything.", intent: "thermo_yes", step: "thermostat" },
    { say: "I didn't check it.", intent: "thermo_no", step: "thermostat", not: ["thermo_yes"] },
    { say: "Where is the thermostat?", intent: "thermo_no", step: "thermostat" },
    // whose job is it
    { say: "It's your responsibility to fix it.", intent: "responsibility", step: "dodge" },
    { say: "According to the lease, repairs are your responsibility.", intent: "responsibility", step: "dodge" },
    { say: "According to the contract, page two, line ten.", intent: "responsibility", step: "dodge" },
    { say: "I'm afraid it's your responsibility to fix it.", intent: "responsibility", step: "dodge" },
    { say: "Heat is included in the rent.", intent: "responsibility", step: "dodge" },
    { say: "That's your job, not mine.", intent: "responsibility", step: "dodge" },
    { say: "You have to fix it!", intent: "responsibility", step: "dodge" },
    { say: "You're the landlord. Please fix it.", intent: "request_fix", step: "dodge" },
    { say: "Can you fix it, please?", intent: "request_fix", step: "dodge" },
    { say: "Could you send someone, please?", intent: "request_fix", step: "dodge" },
    { say: "Fix it now!", intent: "request_fix", step: "dodge" },
    { say: "I've been patient, but patience doesn't keep me warm.", intent: "patient", step: "dodge" },
    { say: "You're kidding, right?", intent: "you_kidding", step: "dodge" },
    { say: "I will sue you!", intent: "threat", step: "dodge" },
    { say: "You're a terrible landlord.", intent: "threat", step: "dodge" },
    { say: "I won't pay the rent until you fix it.", intent: "withhold", step: "dodge", not: ["pay_rent", "pay_later"] },
    // the offer
    { say: "That's not what we agreed.", intent: "refuse_offer", step: "offer" },
    { say: "I'm not a plumber.", intent: "refuse_offer", step: "offer" },
    { say: "No, thank you. Please send a professional.", intent: "refuse_offer", step: "offer" },
    { say: "I'd rather not touch it.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "I can't fix it myself.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "Okay, I'll try.", intent: "accept_offer", step: "offer" },
    { say: "I can fix it myself.", intent: "accept_offer", step: "offer" },
    { say: "Forget it.", intent: "walk_away", step: "offer" },
    // the date
    { say: "When can someone come out?", intent: "ask_when", step: "date" },
    { say: "When will the master come?", intent: "ask_when", step: "date" },
    { say: "Next week is too late.", intent: "too_late", step: "date" },
    { say: "Could someone come sooner?", intent: "too_late", step: "date" },
    { say: "Before the weekend, please.", intent: "too_late", step: "date" },
    { say: "How about Friday?", intent: "propose_day", step: "date", slots: { day: "friday" } },
    { say: "Can he come tomorrow?", intent: "propose_day", step: "date", slots: { day: "tomorrow" } },
    { say: "Friday morning works for me.", intent: "accept_date", step: "date", slots: { day: "friday" } },
    { say: "Saturday is fine.", intent: "accept_date", step: "date", slots: { day: "saturday" } },
    { say: "Friday.", intent: "day_ctx", step: "date", slots: { day: "friday" } },
    { say: "Thursday or Friday.", intent: "propose_day", step: "date", slots: { day: { 0: "thursday", 1: "friday" } } },
    { say: "Friday doesn't work for me.", intent: "day_no", step: "date", not: ["accept_date", "day_ctx"] },
    { say: "Friday.", intent: "none" },
    // home
    { say: "Yes, I'll be home.", intent: "home_yes" },
    { say: "I can leave a key with Rita.", intent: "leave_key" },
    { say: "No, I'll be at work.", intent: "not_home", not: ["home_yes"] },
    { say: "I won't be home.", intent: "not_home", not: ["home_yes"] },
    // wrapping up
    { say: "Can you put that in an email, please?", intent: "in_writing", step: "wrap" },
    { say: "Could I have that in writing?", intent: "in_writing", step: "wrap" },
    { say: "Could you text me the date?", intent: "in_writing", step: "wrap" },
    { say: "No, that's all, thanks.", intent: "no_more", step: "wrap" },
    { say: "Can I get a discount on the rent?", intent: "ask_discount", step: "wrap" },
    // the rent
    { say: "Sure. Here's the check.", intent: "pay_rent", step: "rent" },
    { say: "Here's the cheque.", intent: "pay_rent", step: "rent" },
    { say: "Here you go.", intent: "pay_ctx", step: "rent" },
    { say: "Here you go.", intent: "none" },
    { say: "I'll need a receipt.", intent: "ask_receipt", step: "rent" },
    { say: "Could I get a receipt, please?", intent: "ask_receipt", step: "rent" },
    { say: "I'll pay online on the first.", intent: "pay_later", step: "rent" },
    { say: "I already paid.", intent: "paid_already", step: "rent" },
    { say: "I won't pay.", intent: "withhold", step: "rent", not: ["pay_rent"] },
    // Rita and goodbye
    { say: "Thanks, Rita!", intent: "thanks_rita" },
    { say: "Have a good trip!", intent: "trip_wish" },
    { say: "Enjoy the sun in Florida!", intent: "trip_wish" },
    { say: "Have a nice holiday!", intent: "trip_wish" },
    { say: "Never mind.", intent: "walk_away" },
    // not understood
    { say: "banana keyboard elephant", intent: "none" },
    { say: "My brother plays the guitar.", intent: "none" },
  ],

  sims: [
    // firm and polite: the lease, no to the offer, Friday, in writing, the rent and a receipt
    { name: "full: lease, no to the offer, Friday, in writing, receipt", turns: ["Mr. Patel, it's me, from 2B.", "The heating has been broken for a week.",
      "It's your responsibility to fix it.", "That's not what we agreed.", "When can someone come out?", "Next week is too late.", "Friday morning works for me.",
      "Can you put that in an email, please?", "No, that's all, thanks.", "Sure. Here's the check.", "I'll need a receipt.", "Thanks, Mr. Patel. Have a good trip!"],
      expect: { complete: true, state: { date: "friday", offer: "refused", resp: true, writing: true, receipt: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // the B1 path: a plain request, yes to the offer, Wednesday, then a change of mind and a question
    { name: "B1: please fix it, yes to the offer, then sooner", turns: ["Hi!", "Do you have a minute?", "My heat isn't working.", "Since last Wednesday.",
      "Can you fix it, please?", "Okay, I'll try.", "When can someone come out?", "Okay.", "How long will you be in Florida?", "Actually, next week is too late.",
      "That's all.", "I'll pay online on the first.", "Bye!"],
      expect: { complete: true, state: { date: "friday", offer: "accepted", resp: "soft" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // the twist on every seed: Rita backs the learner up
    { name: "Rita backs you up (twist)", turns: ["Hello, Mr. Patel!", "The radiators are ice cold.", "For about two weeks now.", "Thanks, Rita!",
      "I'm afraid it's your responsibility to fix it.", "I'm not a plumber.", "When can someone come out?", "Could someone come sooner?", "Friday morning works for me.",
      "No, that's all.", "Here you go.", "Thanks, bye!"],
      expect: { complete: true, state: { ritaShown: true, ritaBye: true, date: "friday" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = "rita"; s.homeQ = false; } },
    // rude at first: an answer and a tip each time, never a dead end
    { name: "rude first, then calm", turns: ["The heating doesn't work already a week.", "I won't pay the rent until you fix it.", "Fix it now!", "No way!",
      "When will the master come?", "No.", "Okay.", "No, that's all, thanks.", "I won't pay.", "Okay, I'll pay online on the first.", "Bye!"],
      expect: { complete: true, state: { resp: "blunt", offer: "refused", date: "friday" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    // walking away before a day is agreed: not done
    { name: "walk away (not completed)", turns: ["My heat isn't working.", "A week.", "Never mind."], expect: { complete: false }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // a returning player: "Let me guess: the heat?"
    { name: "again: let me guess, the heat", turns: ["Yes. It's freezing in my apartment.", "Since Monday.", "The lease says you fix it.", "I'd rather not touch it.",
      "Can he come tomorrow?", "Friday is fine.", "No, I'm good.", "Can I pay later?", "Have a nice day!"],
      expect: { complete: true, state: { date: "friday", offer: "refused" } }, auto: AUTO,
      setup: (s) => { s.known = true; s.greetAgain = true; s.twist = null; s.homeQ = false; } },
    // in writing before there is a day; the learner picks Saturday
    { name: "in writing first, then Saturday", turns: ["Excuse me, Mr. Patel. The heating isn't working.", "It started on Monday.", "Heat is included in the rent.",
      "No, thank you. Please send a professional.", "Can you put that in writing?", "How about Saturday?", "That's it.", "Sure.", "Could I get a receipt, please?", "Thank you!"],
      expect: { complete: true, state: { date: "saturday", writing: true, receipt: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // "I don't know" at the dodge: he gives in; Wednesday is accepted; the key goes to Rita
    { name: "the dodge gives in, Wednesday", turns: ["The heating is broken.", "Three days.", "I don't know.", "I'm not a plumber.", "When can someone come out?",
      "That works for me.", "I can leave a key with Rita.", "Thanks!", "I don't have the check with me.", "Bye!"],
      expect: { complete: true, state: { date: "wednesday", resp: "soft", offer: "refused", homeDone: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = true; } },
  ],
};

export default landlord;
