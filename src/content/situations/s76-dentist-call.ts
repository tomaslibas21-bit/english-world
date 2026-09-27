// Song 76 "Could You Spell That?" — a phone call to Green Street Dental (receptionist Linda).
// Booking a dental appointment by phone, American style: reason for the visit, new patient,
// name and "Could you spell your last name?", date of birth, phone number, dental insurance
// (or paying yourself), finding a time ("Do you have anything earlier?"), confirming it.
// Phone skills: the line breaks up ("Sorry, you're breaking up"), "Could you speak up?",
// "Can you hear me now?", being put on hold.
// Twist (visits ≥ 1): the learner already has an appointment tomorrow and moves it
// (→ Thursday afternoon at half past three, as in the song).

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "../types";
import type { SlotFn } from "../../convo/grammar";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Entities

const REASONS: EntityDef[] = [
  ent("toothache", "toothache", "dantų skausmas/dantų skausmo/dantų skausmui/dantų skausmą/dantų skausmu/dantų skausme", "m",
    { art: "a", chip: "skauda dantį", forms: ["toothache", "a toothache", "tooth ache", "tooth pain", "pain", "a bad toothache"], attrs: { pain: true } }),
  ent("checkup", "checkup", "patikra/patikros/patikrai/patikrą/patikra/patikroje", "f", { chip: "profilaktinė patikra", forms: ["checkup", "check up", "a checkup", "check-up", "an exam", "exam", "examination", "a regular checkup", "regular checkup", "routine checkup", "annual checkup", "regular check up"] }),
  ent("cleaning", "cleaning", "dantų valymas/dantų valymo/dantų valymui/dantų valymą/dantų valymu/dantų valyme", "m",
    { chip: "dantų valymas", forms: ["cleaning", "a cleaning", "teeth cleaning", "a teeth cleaning", "dental cleaning", "hygiene appointment"] }),
  ent("broken", "broken | tooth", "nuskilęs/nuskilusio/nuskilusiam/nuskilusį/nuskilusiu/nuskilusiame | dantis/danties/dančiui/dantį/dantimi/dantyje", "m",
    { chip: "nuskilęs dantis", forms: ["broken tooth", "a broken tooth", "chipped tooth", "a chipped tooth", "cracked tooth"], attrs: { pain: true } }),
  ent("filling", "lost | filling", "iškritęs/iškritusio/iškritusiam/iškritusį/iškritusiu/iškritusiame | plomba/plombos/plombai/plombą/plomba/plomboje", "f",
    { chip: "iškrito plomba", forms: ["lost filling", "a lost filling", "filling", "my filling"] }),
];

// Days used in the receptionist's offers (not a grammar slot: learners' days use the built-in {day}).
const WDAYS: EntityDef[] = [
  ent("tomorrow", "tomorrow", "rytoj/rytojaus/rytoj/rytoj/rytoj/rytoj", "m", { chip: "rytoj" }),
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m", { chip: "pirmadienis" }),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m", { chip: "antradienis" }),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m", { chip: "trečiadienis" }),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m", { chip: "ketvirtadienis" }),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m", { chip: "penktadienis" }),
];

// ---------------------------------------------------------------------------
// Appointment offers. Times are shown 12-hour in English and 24-hour in Lithuanian.

interface Offer { d: string; h: number; m: number }
const slotVal = (o: Offer) => {
  const h12 = o.h > 12 ? o.h - 12 : o.h;
  const mm = String(o.m).padStart(2, "0");
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const minWords: Record<number, string> = { 0: "o'clock", 15: "fifteen", 30: "thirty", 45: "forty-five" };
  return { en: `${h12}:${mm}`, lt: `${o.h}:${mm}`, say: `${words[h12]} ${minWords[o.m] ?? String(o.m)}`.replace(" o'clock", o.m === 0 ? "" : " o'clock") };
};
const OFFERS: Record<string, Offer> = {
  first: { d: "tuesday", h: 10, m: 0 },
  early: { d: "tomorrow", h: 8, m: 15 },
  late: { d: "thursday", h: 16, m: 30 },
  morning: { d: "friday", h: 9, m: 0 },
  monday: { d: "monday", h: 14, m: 0 },
  wednesday: { d: "wednesday", h: 15, m: 15 },
  move: { d: "thursday", h: 15, m: 30 },
};
const DAY_OFFER: Record<string, string> = { monday: "monday", tuesday: "first", wednesday: "wednesday", thursday: "late", friday: "morning", tomorrow: "early" };
const EXISTING: Offer = { d: "tomorrow", h: 8, m: 15 };

/** Numeric dates: "06/04/1990" (US month/day/year), "1990-06-04" (year first), "4/6/1990" read day-first only when the month would be > 12. */
const numDate: SlotFn = (tokens, pos) => {
  // typed with dots, as in Lithuania: "04.06.1990" (day.month.year) or "1990.06.04" (year first)
  const dot = /^(\d{1,4})\.(\d{1,2})\.(\d{1,4})$/.exec(tokens[pos] ?? "");
  if (dot) {
    const [x, m, z] = [+dot[1], +dot[2], +dot[3]];
    if (x >= 1900 && x <= 2025 && m >= 1 && m <= 12 && z >= 1 && z <= 31) return [{ end: pos + 1, value: { month: m, day: z, year: x } }];
    const yr = z < 100 ? (z > 30 ? 1900 + z : 2000 + z) : z;
    if (yr >= 1900 && yr <= 2025 && m >= 1 && m <= 12 && x >= 1 && x <= 31) return [{ end: pos + 1, value: { month: m, day: x, year: yr }, tags: ["tip:us_date"] }];
    return [];
  }
  const [a, b, y] = [tokens[pos], tokens[pos + 1], tokens[pos + 2]];
  if (![a, b, y].every((x) => x !== undefined && /^\d+$/.test(x))) return [];
  const [n1, n2, n3] = [+a, +b, +y];
  if (n1 >= 1900 && n1 <= 2025 && n2 >= 1 && n2 <= 12 && n3 >= 1 && n3 <= 31) return [{ end: pos + 3, value: { month: n2, day: n3, year: n1 } }];
  const year = n3 < 100 ? (n3 > 30 ? 1900 + n3 : 2000 + n3) : n3;
  if (year < 1900 || year > 2025) return [];
  if (n1 >= 1 && n1 <= 12 && n2 >= 1 && n2 <= 31) return [{ end: pos + 3, value: { month: n1, day: n2, year } }];
  if (n2 >= 1 && n2 <= 12 && n1 >= 13 && n1 <= 31) return [{ end: pos + 3, value: { month: n2, day: n1, year }, tags: ["tip:us_date"] }];
  return [];
};

// ---------------------------------------------------------------------------
// State helpers

const booking = (c: Ctx) => !!c.s.booking;
const moving = (c: Ctx) => !!c.s.moving;
const words = (s?: string) => (s ? s.trim().split(/\s+/).length : 0);
/** The checklist follows moving an existing appointment (twist visits, or whenever the learner asks) unless they are
 *  booking a new one. Frozen once an appointment is set, so a second errand afterwards is a bonus. */
const movePath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "move" : (!!c.s.moveTwist || !!c.s.moving) && !c.s.booking);
const bookPath = (c: Ctx) => !movePath(c);
/** Spelling the surname: always when booking; when moving only if the receptionist asks (c.s.spellOnMove). */
const spellNeeded = (c: Ctx) => bookPath(c) || !!c.s.spellOnMove;
/** New patients also give a phone number and insurance. */
const newPtBooking = (c: Ctx) => bookPath(c) && c.s.newPt === true;
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
/** Days and months are never a spelled surname typed as one word. */
const NOT_SPELLED = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|morning|afternoon|evening|january|february|march|april|june|july|august|september|october|november|december)$/i;

/** Per-turn scratch: one answer may arrive as several segments of the same intent. */
/** One-word replies that the {name} / {letters} slots would swallow ("Pardon?" read as a surname, "Sure." as a
 *  spelling): the intent they really are. "ok" = Linda says "Go ahead" and waits; "no" = she asks again. */
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
  else if (g !== "no") ((dentist.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
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

const readyForSlot = (c: Ctx) => {
  if (moving(c)) return !!c.s.name && words(c.s.name) >= 2 && !!c.s.dob;
  return booking(c) && !!c.s.reason && c.s.newPt !== undefined && words(c.s.name) >= 2 && !!c.s.spelled && !!c.s.dob
    && (!c.s.newPt || (!!c.s.phone && c.s.insurance !== undefined));
};

function startBooking(c: Ctx) {
  c.s.task = c.s.task || "book";
  c.s.moreDone = false;
  c.s.booking = true;
}

/** The first opening Linda has: tomorrow at 8:15, or Tuesday at 10 when that 8:15 is the appointment being moved. */
const earliest = (c: Ctx) => (moving(c) ? "first" : "early");

function offer(c: Ctx, key: string, again = false) {
  const o = OFFERS[key];
  c.s.offer = key;
  c.s.offered = c.s.offered || [];
  if (!c.s.offered.includes(key)) c.s.offered.push(key);
  if (key === "move" && !again) { c.say("move_offer"); return; }
  c.say(again ? "offer_again" : "offer", { D: o.d, slot: slotVal(o) });
}

function accept(c: Ctx) {
  const key = c.s.offer;
  if (!key) return;
  const o = OFFERS[key];
  c.s.appt = key;
  c.say(moving(c) ? "moved" : "booked", { D: o.d, slot: slotVal(o) });
  if (!moving(c)) {
    c.say(c.s.newPt ? "arrive_early" : "bring_id");
  }
  if (moving(c)) c.say("text_reminder");
  c.s.donePath = c.s.donePath || (moving(c) ? "move" : "book");
  c.complete();
}

const DENTIST_AUTO: Record<string, string> = {
  pain_len: "For three days.", hold: "Sure.", phone: "It's 555-201-7788.", insurance: "No, I don't. I'll pay myself.",
  surname: "Mikalauskas", spell: "M-I-K-A-L-A-U-S-K-A-S", slot: "That works for me.", reason: "I have a toothache.",
  new_pt: "Yes, it's my first time.", dob: "June 4th, 1990.",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_BOOK: Suggestion = { lt: "Pasakyti, kad nori užsiregistruoti vizitui (ir kodėl)", hint: "book", options: "reason" };
const S_MOVE: Suggestion = { lt: "Pasakyti, kad nori perkelti rytojaus vizitą", hint: "move" };
const S_PHONE: Suggestion = { lt: "Jei blogai girdi – paprašyti kalbėti garsiau", hint: "phone" };

function helpStep(id: string, withMove: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.moveTwist === withMove,
    done: (c) => !!c.s.task,
    ask: (c) => { c.say(bump(c, "help") === 0 ? "greet" : "ask_help"); },
    expects: ["book", "reason_ans", "move", "cancel"],
    suggest: withMove ? [S_MOVE, S_BOOK, S_PHONE] : [S_BOOK, S_PHONE],
  };
}

// ---------------------------------------------------------------------------

export const dentist: SituationDef = {
  id: "s76-dentist-call",
  song: 76,
  songTitle: "Could You Spell That?",
  title: { en: "Could You Spell That?", lt: "Ar galėtumėte paraidžiui?" },
  topic: { en: "Making an appointment by phone", lt: "Registracija telefonu" },
  chapter: 3,
  order: 8,
  location: "phone",
  npc: "linda",
  mode: "phone",
  goal: "Paskambink į odontologijos kliniką ir užsiregistruok vizitui.",
  intro: "Skambini į odontologijos kliniką „Green Street Dental“: jau kelias dienas skauda dantį (o gal tiesiog laikas profilaktinei patikrai). Atsiliepia registratorė Linda. Telefonu nieko nematai – tad drąsiai klausk, prašyk pakartoti ir sakyk paraidžiui.",
  entities: { reason: REASONS, wday: WDAYS },

  grammar: {
    macros: {
      appt: "(an appointment | a dental appointment | a dentist appointment | a dentists appointment | an appointment with (the | a) dentist | a visit | a time)",
      badly: "[terrible | bad | really bad | awful | horrible | very bad | strong]",
      make: "(make | book | schedule | set up | get)",
      pain: "(hurts | is hurting | really hurts | hurts a lot | aches | is killing me)",
      dpart: "[morning #am | afternoon #pm | evening #pm]",
      had_it: "(i have had (it | this | the pain | this pain) | it has been (hurting | like this | going on | bad) | it hurts | it is hurting)",
      dur: "[about | almost | over | maybe | around | nearly | already] ({number} (days | day | weeks | week) | a few days | a couple of days | two or three days | a week | one week | two weeks | a (long time | while))",
      cant: "(i can not | i will not be able to) (come | make it | be there)",
      dayp: "({day} @dpart | yesterday)",
    },
    slots: {
      numdate: { fn: numDate },
    },
  },

  intents: {
    // --- opening requests
    book: { patterns: [
      "i would like to @make @appt [for {reason}] #h:book_like", "(could | can | may) i @make @appt [for {reason}] #h:book_could",
      "i am calling to @make @appt [for {reason}] #h:book_calling", "i want to @make @appt [for {reason}] #h:book_want",
      "i need @appt [for {reason}]", "i need to (see | go to) (a | the) dentist [as soon as possible] #h:book_asap",
      "i would like to (see | come in to see) (a | the) dentist", "i would like to @make @appt as soon as possible #urgent",
      "(do you have | is there) (any | an) (opening | appointment | availability | time) [this week | today | tomorrow | soon] #h:book_available",
      "(do you have | is there) anything [available | free] (this week | today | tomorrow | soon | next week) #h:book_available",
      "(can | could) i come in [today | tomorrow | this week]", "i would like to (book | schedule) (a | an) {reason} #h:book_checkup",
      "i need (a | an) {reason} [appointment] #h:book_need", "i would like @appt [please]", "@appt please",
      "i would like to come in for (a | an) {reason}", "(can | could) i (see | come in to see) (a | the) dentist [today | tomorrow | this week | soon]",
      "(this is | it is) (urgent | an emergency) #urgent", "it is (quite | very | really) urgent #urgent",
      "is it possible to @make @appt [today | this week | soon]", "i would like to (register | sign up) for (a visit | an appointment | a checkup) #tip:lt_register",
      "(can | could) i (register | sign up) for (a visit | an appointment) #tip:lt_register",
      "(could | can | may) i (book | schedule | get | set up | make) (a | an) {reason} [appointment] #h:book_could", "i (would like | want | need) (a | an) {reason} [appointment]",
      "(i would like | i want | can i | could i) (to)? (register | sign up) (to | at | with | for) (the | a) dentist #tip:lt_register", "(do you have | is there) (any | some) free (time | slots | appointments | spots) [this week | today | tomorrow | soon | next week]",
      "is it possible to (see | come to | visit) (the | a) dentist [today | tomorrow | this week | soon]", "i (need | would like) to come in (for (a | an) {reason} | today | tomorrow | this week | soon)",
      "(i would like | i need | i want) to (see | visit) (the | a) dentist (today | tomorrow | this week | soon | next week)",
      "i need a dentist [urgently #urgent | today | as soon as possible #urgent | quickly | right away #urgent | soon]",
      // with the day: "Can I book a visit for Tuesday?" (Linda then offers that day first)
      "(i would like to | i want to | i need to | i am calling to | (could | can | may) i) @make @appt [for {reason}] (for | on) (next week | this week | {day} [@dpart])", "(can | could) i (get | have) (an | a) (appointment | visit) (for | on) (next week | this week | tomorrow | {day})",
      "i would like to (book | schedule | make | set up) (a | an) {reason} [appointment]", "i am calling (about | for) (a | an) {reason}",
      "i am calling to (book | schedule) (a | an) {reason}", "i (need | would like) to (book | schedule) (a | an) {reason}",
    ] },
    reason_ans: { patterns: [
      "[i have | i have got | i have had] (a | an) @badly {reason} [for {number} (days | day | weeks | week)] #h:reason_have", "[it is] for (a | an) {reason} #h:reason_for",
      "it (hurts | really hurts | hurts a lot | is very painful) #pain", "[i think] i lost (a | my) filling #filling", "(pain | a pain | bad pain) in my tooth #pain",
      "my tooth @pain #pain #h:reason_hurts", "my (teeth | gums) (hurt | are hurting | are bleeding) #pain", "i (broke | chipped | cracked) (a | my) tooth #broken #h:reason_broke",
      "i lost a filling #filling #h:reason_filling", "(just | only) (a | an) {reason} [please] #h:reason_just", "(a | an) {reason}", "{reason}",
      "my wisdom tooth @pain #pain", "i have a problem with my tooth #pain", "(it is | it was) (just | only) time for (a | my) {reason}",
      "(a | an) {reason} and (a | an) {reason}",
      "it is time for (a | my) [regular | annual] {reason}", "my tooth is (broken #broken | cracked #broken | chipped #broken | very painful #pain | loose #pain)",
      "(my | a) filling (fell out | came out | is gone | is out | broke) #filling", "i am calling (because | since) i have (a | an) @badly {reason}",
      "i am calling (because | since) my tooth @pain #pain", "i am calling (because | since) i (broke | chipped | cracked) (a | my) tooth #broken",
      "i have (a | some) (problem | problems) with my (teeth | gums | tooth) #pain", "i (broke | chipped | cracked) (a | my) tooth (yesterday | last night | today | this morning) #broken",
      "my (tooth | teeth) (hurt | hurts) (when i eat | when i drink | a lot | so much) #pain", "i have @badly pain in my (tooth | teeth | mouth | jaw) #pain",
    ] },
    // "Can you help me?" before saying what's wrong (the question comes next, or Linda invites it)
    help_me: { patterns: ["(can | could) you help me [please | with something]", "i need [some | your] help [please]", "[yes] i have a question", "(can | could | may) i ask (you)? (a question | something)"] },
    pain_len: { patterns: [
      "(for | about | almost | over) {number} (days | day | weeks | week) #h:len_days", "since @dayp #h:len_since", "(since | from) (yesterday | last night | last week | the weekend)",
      "{number} (days | day | weeks | week) [now | already]", "[for | about] (a few | two or three | a couple of) days", "[for | about | almost | over] (a | one) week",
      "it started (yesterday | last night | on {day} | {number} days ago)", "({number} | a few | a couple of) days ago",
      "(it has been | about) {number} days [now]", "(since yesterday | yesterday)",
      "since {number} (days | day | weeks | week)", "[already] (a | one) week [already]", "already {number} (days | weeks | day | week)", "@dur [now | already | or so]",
      "@had_it [for] @dur [now | already]", "since last {day}", "[for | about] {number} or {number} (days | weeks)", "(it is | this is | today is) the {ordinal} day [already | now]", "@had_it (since | from) (yesterday | last night | last week | the weekend | this morning | @dayp)",
      "[only | just] (since | from) this morning", "(only | just) since (yesterday | last night | @dayp)", "it (began | started) (yesterday | last night | this morning | on {day} | {number} days ago | a few days ago)",
    ] },

    // --- new patient
    new_yes: { patterns: [
      "[yes] i am (a new patient | new) #h:new_patient", "[yes] (it is | this is) my first (time | visit) [there | at your office | with you] #h:new_first",
      "[no] i have never been there [before]", "[no] i have not been there before", "[no] never", "[no] this is my first (visit | time)", "i am new in town",
      "[no] i have never been (to your (office | clinic) | here | to you) [before]", "[yes] i am new (here | there | with you)", "[yes] (it is | this is) my first (time | visit) (at your (clinic | office) | there | with you | here)",
      "[no] i have not been (to your (office | clinic) | here) [before]", "[yes] first time",
    ] },
    new_no: { patterns: [
      "[no] i have been there before #h:new_before", "[yes] i am [already] (a patient | an existing patient | a current patient)",
      "[yes] i was there last (year | month | time)", "[yes] i have been (there | to your office) (before | once)", "[no] i am not a new patient",
      "i am already a patient",
      "[no | yes] i am (a patient | your patient | a patient there | a patient with you | a patient here) [already]", "[yes] i (came | was there | was here) (once | before | a few times | many times | last (year | month) | {number} years ago)",
      "[yes] i have been (there | here | to your (office | clinic)) (before | once | a few times | many times | last year)", "i was (there | here) before", "[yes] (i came | i have been) (once | twice) [before | {number} years ago]",
      "[no] i am (an existing | a regular | an old) patient",
    ] },

    // --- identity
    intro_name: { patterns: ["(this is | my name is) {name} [calling]"] },
    name_ctx: { patterns: [
      "[my name is | it is | this is | i am | my full name is] {name} #h:name_mine", "my first name is {name} and my last name is {name}",
      "[it is | my last name is | the last name is] {name} #h:name_last",
      "(my | the) (surname | family name | last name) is {name}", "(surname | family name | last name) [is] {name}", "the name is {name}", "{name} is my name",
      "my first name is {name} and my (surname | family name) is {name}", "my name is {name} and [my] (surname | family name | last name) [is] {name}",
      "first name [is] {name} [and] (last name | surname | family name) [is] {name}", "[my] first name [is] {name}",
    ] },
    spell_ctx: { patterns: [
      "[it is | sure | yes] {letters} #h:spell_it", "[it is] spelled {letters}", "{letters} [that is it | that is right]", "[my last name is] {name} {letters}",
      "(let me | i will | i can) spell it [for you] {letters}", "[it is] {letters} {name}",
    ] },
    dob_ans: { patterns: [
      "(it is | my date of birth is | born on | my birthday is) {date} [{year}] #h:dob_is", "i was born [on | in] {date} [{year}] #h:dob_born",
      "(it is | my date of birth is) {year} {date}", "i was born on {numdate}", "my date of birth is {numdate}",
    ] },
    dob_ctx: { patterns: ["{date} [{year}] #h:dob_is", "{year} {date}", "[it is] {numdate}"] },
    year_ctx: { patterns: ["[in] {year} #h:year_is"] },
    hold_ok_ctx: { patterns: ["[sure | yes | okay] no problem #h:hold_sure", "(of course | sure thing | yes of course) #h:hold_course", "[sure] take your time",
      "[yes | sure | okay] i (can | will) (wait | hold)", "[sure | yes | okay] no problem i will (wait | hold)", "[sure] i do not mind [waiting]"] },
    phone_ans: { patterns: [
      "(my number is | my phone number is | my cell is | my cell number is | it is | you can reach me at | call me at) [plus] {digits} #h:phone_is", "plus {digits}",
      "my mobile [number] is {digits} #tip:uk_mobile",
      "you can (call | reach | text) me (at | on) [plus] {digits}", "my (phone | telephone | cell phone | phone number) is [plus] {digits}", "(cell | cell phone | phone | number) [number] [plus] {digits}",
      "(the | my) best number is [plus] {digits}", "(the best | the best way) to reach me is [plus] {digits}",
      // "You can use this number." (the one they're calling from)
      "(you can use | it is | please use | just use | use) (this | the same) number [i am calling from] #this", "the number i am calling (from | with) #this", "(this | the same) number [is fine | is good] #this",
    ] },
    phone_ctx: { patterns: ["{digits}"] },

    // --- insurance
    insurance_no: { patterns: [
      "[no] i do not have (insurance | dental insurance | any insurance | any dental insurance) [yet] #h:ins_none", "[no] i will pay (myself | out of pocket | in cash | by card) #h:ins_self",
      "[no] i am (paying | going to pay) (myself | out of pocket)", "[no] not yet", "[no] i am paying for it myself", "no insurance", "[no] i do not [have any]",
      "[no] i am (paying | going to pay) (cash | in cash | by card | with card)", "[no] (only | just) (travel | lithuanian | european) insurance", "[no] i (only)? have (travel | lithuanian | european) insurance",
      "[no] my insurance is (in | from) (lithuania | europe | my country)", "[no] not (here | in america | in the us | in the united states)", "[no] i do not have (dental | any dental) insurance [here | in america]",
    ] },
    insurance_yes: { patterns: ["[yes] i have (insurance | dental insurance) #h:ins_have", "[yes] [i do] i have (insurance | dental insurance) (through | from) (work | my job | my employer | my company)",
      "[yes] i do i have (insurance | dental insurance)", "[yes] i am (insured | covered)", "[yes] i have (delta dental | cigna | metlife | aetna) [insurance]", "[yes] i have {w:any} insurance", "yes i do have insurance"] },
    cost_q: { patterns: [
      "how much (will it | does it | does the (exam | visit | checkup | cleaning | appointment) | would it) cost #h:q_cost", "how much is (it | the (exam | visit | checkup | cleaning))",
      "what (is | does) the price", "is it expensive",
      "how much is (it | the (exam | visit | checkup | cleaning)) (without insurance | if i pay myself)", "what is the price (for | of) (a | an | the) {reason}", "how much (does | is) (a | an | the) {reason} [cost]",
    ] },

    // --- finding a time
    earlier: { patterns: [
      "do you have anything earlier #h:slot_earlier", "(is there | do you have) (anything | something) (earlier | sooner)", "(earlier | sooner) [please | if possible | would be better]",
      "(anything | something) (earlier | sooner)", "(that is | it is) too late", "that is (a bit | a little) late",
      "(can | could) i come (earlier | sooner | today)", "(as soon as possible | asap) [please]", "it really hurts", "i would like to come (earlier | sooner | today | as soon as possible)",
      "(is there | do you have) (anything | something) (today | tomorrow)", "is (that | tuesday) the earliest",
      "the sooner the better", "(sooner | earlier) (is | would be) better", "[earlier | sooner] if possible", "nothing (earlier | sooner)",
      "[(can | could) i (have | get | take)] the (first | earliest) (available | possible | opening | appointment) [one | time]",
    ] },
    later: { patterns: [
      "do you have anything later #h:slot_later", "(anything | something) (later | in the afternoon | in the evening | after work)", "(is there | do you have) (anything | something) (later | in the afternoon | after work)",
      "(can | could) i come (later | in the afternoon | after work)", "i work (until | till) {time}", "the afternoon would be better", "[i am sorry] i am at work (then | in the morning | during the day) #h:slot_work",
      "do you have anything (in the afternoon | in the evening | after {time})", "i work (in the morning | in the mornings | during the day | until {time} | till {time})",
      "(that is | it is) too early", "that is (a bit | a little) early",
      "i am (at work | working) (until | till) {time}", "i (prefer | would prefer) (the afternoon | afternoons | the evening | later)", "after {time} (would be | is) better",
      "(later | the afternoon) (is | would be) better [for me]", "i (finish | get off) work at {time}", "i can (come | do) [any day] after {time}",
      "i can not [come | do it | make it] in the (morning | mornings)",
    ] },
    morning: { patterns: ["(anything | something) in the morning", "(do you have | is there) anything in the morning", "mornings are better", "the morning would be better", "i prefer (mornings | the morning)",
      "(the)? morning is better [for me]", "(in the)? morning (is | would be) (better | good | best) [for me]"] },
    day_req: { patterns: [
      "(can | could) i come [on] @dayp [at {time}] [instead] #h:slot_day", "how about @dayp [at {time}]", "(is | what about) @dayp [at {time}] [possible | available | free | okay]",
      "do you have anything [on] @dayp", "@dayp [at {time}] (would be better | is better | please)", "i can (come | do) [on] @dayp [at {time}]", "(what about | how about) (next week | {day})",
      "(could | can) (we | i) (do | make it | come) (next week | [on] @dayp) [instead]", "do you (work | have appointments | open | have anything) on {day}", "are you open (on)? {day}",
      "not {no_day:day} [but] (maybe | perhaps | how about | what about) {day} [at {time}]", "(is there | have you got) anything [on] @dayp",
      "(can | could) (i | we) (move | change) (it | my appointment | the appointment) to @dayp [at {time}] [instead]",
    ] },
    time_req: { patterns: ["(can | could) i come at {time}", "how about {time}", "do you have anything at {time}", "{time} would be better", "is {time} possible"] },
    accept: { patterns: [
      "(that works | that works for me | that is perfect | that sounds good | that is great | that is fine | that is good | that would be great) #h:slot_ok",
      "(@dayp | {day}) [at {time}] (is | sounds | works | would be) (perfect | fine | great | good | okay) [for me] #h:slot_perfect", "{time} is (perfect | fine | great | good) [for me]",
      "(half past three | {time}) (is | sounds) (perfect | fine | great)", "i will take it", "(okay | yes) let us do (that | it)", "book it [please]", "(yes | yeah) that works",
      "(@dayp | {day}) [at {time}] please", "perfect that works for me",
      "{time} is (okay | fine | good | perfect) [for me]", "[yes] i will be there", "i will come (then | at {time} | on {day})", "[yes] (that | it) is (okay | ok | good) for me",
    ] },
    reject: { patterns: [
      "[no] (that | tuesday | it) (does not | will not) work [for me] #h:slot_no", "i can not (come | make it) (then | on {day} | at {time} | at that time)", "i (am busy | have work | work) (then | on {day} | at that time)",
      "not {day}", "[no] (@dayp | that time | that day) is not (good | possible)", "is there another (time | day)", "[no] i can not [then]", "[no] [sorry] that is not good for me",
      "[no] i can not [come | make it | do] [on] {day}",
    ] },
    availability_q: { patterns: ["what (times | days) do you have", "when (are you | is the dentist) (free | available)", "what do you have [available]", "when can i come",
      "what else (do you have | is there | is available)", "what other (times | days) (do you have | are there)"] },

    // --- phone line
    speak_up: { patterns: [
      "[sorry] (could | can) you speak up [a (little | bit)] #h:ph_speak_up", "[sorry] (could | can) you speak (louder | a little louder | a bit louder)",
      "[sorry] i (can not | could not) hear you [very well]", "[sorry] you are breaking up #h:ph_breaking", "[sorry] the (line | connection) is (bad | not good | not great | terrible)",
      "[sorry] it is (hard | difficult) to hear you", "hello (are you there | can you hear me)", "are you [still] there",
      "[it is | the line is | the connection is] still (bad | not (very | so)? good | not great | quiet | too quiet | hard to hear | breaking up)", "[no] (not really | still not) [better]",
    ] },
    hear_me: { patterns: ["can you hear me [now] #h:ph_hear", "can you hear me okay", "is (that | this) better", "is it better now"] },
    hear_ok: { patterns: ["(yes | yeah) i can hear you [now | fine] [thanks] #h:hear_now", "(yes | yeah) (now | fine | better | loud and clear) [thanks]", "[yes] (that is | it is) better [now] [thanks] #h:hear_better", "yes much better", "loud and clear"] },

    // --- questions
    address_q: { patterns: ["what is your address #h:q_address", "where are you [located]", "where is the (office | clinic)", "how do i get there", "what is the address"] },
    parking_q: { patterns: ["where can i park #h:q_park", "is there parking", "do you have parking"] },
    duration_q: { patterns: ["how long (will it | does it | will the appointment | does the appointment) take #h:q_long", "how long is the appointment"] },
    bring_q: { patterns: ["what (should | do) i (bring | need to bring) #h:q_bring", "do i need to bring anything",
      "(do | should) i (need to)? bring (my)? (id | insurance card | passport | anything | x rays | documents | papers)"] },
    cancel_policy_q: { patterns: ["what if i (need to | have to) cancel", "can i cancel [later] [if i need to]", "(what is | is there) a cancellation (fee | policy)"] },
    forms_q: { patterns: ["do i need to fill out (any | some) forms", "(are there | do you have) (forms | paperwork)"] },
    doctor_q: { patterns: ["who is the dentist", "(which | what) dentist (will i see | is it)", "who will i see", "what is the (dentists | doctors) name", "what is (the dentist | the doctor | his | her) name"] },
    pain_q: { patterns: ["what can i (do | take) for the pain [until then]", "(can | should) i take (something | a painkiller | ibuprofen | painkillers) [for the pain]", "it hurts a lot what should i do"] },

    // --- rescheduling (twist)
    move: { patterns: [
      "i (have | have got) an appointment (tomorrow | on {day}) [and] [(could | can) i (move | change | reschedule) it [to {target:day} @dpart]] #h:move_have",
      "(could | can) i (move | change | reschedule) (it | my appointment) #h:move_could", "i (would like | need | want) to (reschedule | move | change) my appointment #h:move_like",
      "i can not come tomorrow", "i can not make it tomorrow", "i need to (move | change) my appointment [to another day]",
      "i (have | have got) (an | a dentist | a dental | my) appointment (tomorrow | on {day}) [at {time}] [and | but] (i (need | want | would like) to (change | move | reschedule) it | @cant | (could | can) i (move | change | reschedule) it)",
      "(i would like | i need | i want | can i | could i) (to)? reschedule [it | my appointment]", "is it possible to (move | change | reschedule) (it | my appointment)",
      "something came up [and | so] @cant [tomorrow]", "(can | could) (we | i) (do | find | have | get) another (day | time)", "i need (a different | another) (time | day) [for my appointment]",
      "(can | could) i (move | change | reschedule) (it | my appointment) to (another | a different) (day | time)",
      // with the new day: "Could I move it to Wednesday?" (Linda then offers that day)
      "(can | could) i (move | change | reschedule) (it | my appointment) to {target:day} @dpart [instead]", "i (would like | need | want) to (move | change | reschedule) (it | my appointment) to {target:day} @dpart",
    ] },
    cancel: { patterns: ["i (would like | need | want) to cancel my appointment", "(can | could) i cancel [my appointment]", "please cancel (it | my appointment)",
      "i (have to | need to | want to | would like to) cancel (my | tomorrows | the | my dental) appointment [for tomorrow]"] },

    // --- general
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for now] #h:more_all", "no that is it", "nothing else", "no that is everything", "[no] i am (good | all set)", "nothing [thank you | thanks]",
      "no thank you that is all",
    ] },
    see_you: { patterns: ["see you (tomorrow | then | on {day} | next week) #h:see_you", "(okay | great) see you (tomorrow | then | on {day})"] },
  },

  lines: {
    greet: [
      t("Green Street Dental, | this is | Linda. | How | can | I | help | you?", "„Green Street Dental“, | klauso | Linda. | Kuo | galiu | aš | padėti | jums?",
        "„Green Street Dental“, klauso Linda. Kuo galiu padėti?"),
      t("Good | morning, | Green Street Dental! | Linda | speaking. | How | may | I | help | you?", "Labas | rytas, | „Green Street Dental“! | Linda | klauso. | Kuo | galėčiau | aš | padėti | jums?",
        "Labas rytas, „Green Street Dental“! Klauso Linda. Kuo galėčiau padėti?"),
      t("Thank | you | for calling | Green Street Dental. | This is | Linda. | How | can | I | help | you | today?",
        "Dėkoju | jums, | kad paskambinote | į „Green Street Dental“. | Klauso | Linda. | Kuo | galiu | aš | padėti | jums | šiandien?",
        "Ačiū, kad paskambinote į „Green Street Dental“. Klauso Linda. Kuo šiandien galiu padėti?"),
    ],
    ask_help: [
      t("How | can | I | help | you?", "Kuo | galiu | aš | padėti | jums?", "Kuo galiu padėti?"),
      t("What | can | I | do | for you?", "Ką | galiu | aš | padaryti | jums?", "Kuo galiu padėti?"),
    ],
    ask_reason: [
      t("Sure! | Is | it | for a checkup, | or | is | something | bothering | you?", "Žinoma! | Ar | tai | patikrai, | ar | — | kas nors | vargina | jus?",
        "Žinoma! Ar tai profilaktinė patikra, ar kas nors vargina?",
        { flags: { 1: "“Is” in a question = the particle ar; Lithuanian needs no copula here.", 5: "Progressive “is” has no Lithuanian word; vargina carries the tense (linked to “bothering”)." } }),
      t("Of course. | What's | going on?", "Žinoma. | Kas | nutiko?", "Žinoma. Kas nutiko?",
        { flags: { 1: "“'s” (is): the progressive auxiliary has no Lithuanian word; nutiko carries the event (linked to “going on”)." } }),
    ],
    reason_ok: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
    ],
    ask_pain_len: [
      t("How | long | have | you | had | this | pain?", "Kaip | ilgai | — | jus | kankina | šis | skausmas?", "Kiek laiko jus kankina šis skausmas?",
        { flags: { 2: "Perfect “have” has no Lithuanian word; the present kankina covers the ongoing pain (linked to “had”)." } }),
    ],
    noted: [
      t("I | see.", "Aš | suprantu.", "Suprantu."),
      t("Okay, | got it.", "Gerai, | supratau.", "Gerai, supratau."),
    ],
    pain_soon: [
      t("Okay, | let's find | you | something | soon.", "Gerai, | raskime | jums | ką nors | greitai.", "Gerai, suraskime jums laiką kuo greičiau."),
    ],
    ask_new: [
      t("Are | you | a | new | patient?", "Ar | jūs | — | {m:naujas|f:nauja} | {m:pacientas|f:pacientė}?", "Ar jūs {m:naujas pacientas|f:nauja pacientė}?",
        { flags: { 0: "“Are” in a question = the particle ar; Lithuanian needs no copula here." } }),
      t("And | are | you | a | new | patient | with us?", "O | ar | jūs | — | {m:naujas|f:nauja} | {m:pacientas|f:pacientė} | pas mus?", "O ar jūs pas mus {m:naujas pacientas|f:nauja pacientė}?",
        { flags: { 1: "“are” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    ask_before: [
      t("Have | you | been | to | our | office | before?", "Ar | jūs | buvote | — | mūsų | klinikoje | anksčiau?", "Ar anksčiau esate {m:buvęs|f:buvusi} mūsų klinikoje?",
        { flags: { 0: "Perfect “Have” in a question = the particle ar; the past buvote carries the tense.", 3: "“to”: the locative klinikoje carries it." } }),
    ],
    new_welcome: [
      t("Great, | welcome!", "Puiku, | sveiki atvykę!", "Puiku, sveiki atvykę!"),
      t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų."),
    ],
    old_welcome: [
      t("Welcome | back!", "Sveiki | sugrįžę!", "Sveiki sugrįžę!"),
    ],
    ask_name: [
      t("Can | I | have | your | first | and | last name, | please?", "Ar galiu | aš | sužinoti | jūsų | vardą | ir | pavardę, | prašau?", "Ar galėčiau sužinoti jūsų vardą ir pavardę?",
        { flags: { 4: "“first” (first name) = vardas." } }),
      t("And | what's | your | name, | please?", "O | koks yra | jūsų | vardas, | prašau?", "O koks jūsų vardas ir pavardė?"),
    ],
    ask_surname: [
      t("And | your | last name?", "O | jūsų | pavardė?", "O jūsų pavardė?"),
    ],
    ask_spell: [
      t("Could | you | spell | your | last name | for me?", "Ar galėtumėte | jūs | pasakyti paraidžiui | savo | pavardę | man?", "Ar galėtumėte man pasakyti savo pavardę paraidžiui?"),
      t("Thank | you. | And | how | do | you | spell | that?", "Dėkoju | jums. | O | kaip | — | jūs | rašote | tai?", "Ačiū. O kaip ji rašoma?",
        { flags: { 4: "Question “do” has no Lithuanian word (linked to “spell”)." } }),
    ],
    spell_again: [
      t("Sorry, | could | you | spell | it | again, | a little | more slowly?", "Atsiprašau, | ar galėtumėte | jūs | pasakyti paraidžiui | ją | dar kartą, | truputį | lėčiau?",
        "Atsiprašau, ar galėtumėte dar kartą paraidžiui, truputį lėčiau?"),
    ],
    // the spelling asked again after another answer (same words as ask_spell, so the same recording)
    ask_spell_again: [
      t("Could | you | spell | your | last name | for me?", "Ar galėtumėte | jūs | pasakyti paraidžiui | savo | pavardę | man?", "Ar galėtumėte man pasakyti savo pavardę paraidžiui?"),
    ],
    go_ahead: [
      t("Okay, | go ahead.", "Gerai, | sakykite.", "Gerai, sakykite."),
      t("Sure, | go ahead.", "Žinoma, | sakykite.", "Žinoma, sakykite."),
    ],
    spell_thanks: [
      t("Got it, | thank | you.", "Supratau, | dėkoju | jums.", "Supratau, ačiū."),
      t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
    ],
    ask_dob: [
      t("And | what's | your | date of birth?", "O | kokia yra | jūsų | gimimo data?", "O kokia jūsų gimimo data?"),
      t("Can | I | have | your | date of birth, | please?", "Ar galiu | aš | sužinoti | jūsų | gimimo datą, | prašau?", "Ar galėčiau sužinoti jūsų gimimo datą?"),
    ],
    ask_year: [t("And | the | year?", "O | — | metai?", "O metai?")],
    dob_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Perfect.", "Puiku.", "Puiku.")],
    ask_phone: [
      t("What's | the | best | phone | number | to reach | you?", "Koks yra | — | geriausias | telefono | numeris | susisiekti | su jumis?", "Kokiu telefono numeriu geriausia su jumis susisiekti?"),
      t("And | a | phone | number, | please?", "O | — | telefono | numeris, | prašau?", "O jūsų telefono numeris?"),
    ],
    phone_thanks: [t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū.")],
    breaking_up: [
      t("Sorry, | you're breaking up | a little. | Could | you | say | that | again?", "Atsiprašau, | ryšys trūkinėja | truputį. | Ar galėtumėte | jūs | pasakyti | tai | dar kartą?",
        "Atsiprašau, ryšys truputį trūkinėja. Ar galėtumėte pakartoti?"),
      t("Sorry, | I | didn't catch | that. | The | line | isn't great.", "Atsiprašau, | aš | nenugirdau | to. | — | Ryšys | nėra geras.", "Atsiprašau, nenugirdau. Ryšys prastas."),
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
      t("Yes, | loud and clear!", "Taip, | puikiai girdžiu!", "Taip, puikiai girdžiu!"),
    ],
    hear_great: [t("Great!", "Puiku!", "Puiku!")],
    ask_insurance: [
      t("Do | you | have | dental | insurance?", "Ar | jūs | turite | odontologinį | draudimą?", "Ar turite odontologinį draudimą?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    selfpay: [
      t("No | problem. | If | you | pay | yourself, | the | exam | and | X-rays | are | $150.",
        "Jokių | problemų. | Jei | jūs | mokate | {m:pats|f:pati}, | — | apžiūra | ir | rentgeno nuotraukos | kainuoja | 150 dolerių.",
        "Jokių problemų. Jei mokate {m:pats|f:pati}, apžiūra ir rentgeno nuotraukos kainuoja 150 dolerių.",
        { say: "No problem. If you pay yourself, the exam and X-rays are a hundred and fifty dollars.", flags: { 10: "“are” in a price statement = kainuoja." } }),
    ],
    price_info: [
      t("The | exam | and | X-rays | are | $150 | without | insurance.", "— | Apžiūra | ir | rentgeno nuotraukos | kainuoja | 150 dolerių | be | draudimo.",
        "Be draudimo apžiūra ir rentgeno nuotraukos kainuoja 150 dolerių.",
        { say: "The exam and X-rays are a hundred and fifty dollars without insurance.", flags: { 4: "“are” in a price statement = kainuoja." } }),
    ],
    insurance_card: [
      t("Great. | Please | bring | your | insurance | card.", "Puiku. | Prašom | atsinešti | savo | draudimo | kortelę.", "Puiku. Prašom atsinešti draudimo kortelę."),
    ],
    hold_q: [
      t("Let | me | check | the | schedule. | Can | you | hold | for a moment?", "Leiskite | man | patikrinti | — | tvarkaraštį. | Ar galite | jūs | palaukti | akimirką?",
        "Tuoj patikrinsiu tvarkaraštį. Ar galite akimirką palaukti?"),
    ],
    hold_thanks: [t("Thanks | for holding!", "Ačiū, | kad palaukėte!", "Ačiū, kad palaukėte!")],
    hold_quick: [t("Okay, | I'll be | quick!", "Gerai, | būsiu | {sm:greitas|sf:greita}!", "Gerai, tuoj!")],
    offer: [
      t("How about | {D} | at {$slot}?", "Gal | {D:acc} | {$slot}?", "Gal {D:acc} {$slot}?", { say: "How about {D} at {$slot}?" }),
      t("I | have | an | opening | {D} | at {$slot}. | Does | that | work | for you?", "Aš | turiu | — | laisvą laiką | {D:acc} | {$slot}. | Ar | tai | tinka | jums?",
        "Turiu laisvo laiko {D:acc} {$slot}. Ar jums tinka?", { say: "I have an opening {D} at {$slot}. Does that work for you?", flags: { 6: "Question “Does” = the particle ar." } }),
      t("We | have | {D} | at {$slot}. | Would | that | work?", "Mes | turime | {D:acc} | {$slot}. | Ar | tai | tiktų?", "Turime {D:acc} {$slot}. Ar tiktų?",
        { say: "We have {D} at {$slot}. Would that work?", flags: { 4: "“Would” in a question = the particle ar; the conditional sits on tiktų (linked to “work”)." } }),
    ],
    offer_again: [
      t("So, | {D} | at {$slot}?", "Tai | {D:acc} | {$slot}?", "Tai {D:acc} {$slot}?", { say: "So, {D} at {$slot}?" }),
    ],
    move_offer: [
      t("Let | me | see... | How about | Thursday | afternoon, | at | half | past | three?", "Leiskite | man | pažiūrėti... | Gal | ketvirtadienio | popietę, | — | pusę | — | keturių?",
        "Tuoj pažiūrėsiu... Gal ketvirtadienio popietę, pusę keturių?",
        { flags: { 6: "Clock “at”: the time phrase itself carries it in Lithuanian.", 8: "“past”: Lithuanian counts to the next hour (pusę keturių)." } }),
    ],
    earliest: [t("I'm sorry, | that's | our | first | opening.", "Atsiprašau, | tai yra | mūsų | pirmas | laisvas laikas.", "Atsiprašau, tai mūsų pirmas laisvas laikas.")],
    no_today: [t("I'm sorry, | we're | fully | booked | today.", "Atsiprašau, | mes | visiškai | užimti | šiandien.", "Atsiprašau, šiandien viskas užimta.",
      { flags: { 1: "“We're … booked”: Lithuanian says užimti (occupied) with no copula (linked to “booked”)." } })],
    latest: [t("Sorry, | our | last | appointment | is | at {$slot}.", "Atsiprašau, | mūsų | paskutinis | vizitas | yra | {$slot}.", "Atsiprašau, paskutinis vizitas – {$slot}.",
      { say: "Sorry, our last appointment is at {$slot}." })],
    closed_weekend: [t("Sorry, | we're | closed | on weekends.", "Atsiprašau, | mes | nedirbame | savaitgaliais.", "Atsiprašau, savaitgaliais nedirbame.",
      { flags: { 2: "“'re closed” = nedirbame (we don't work): the negated verb carries the copula." } })],
    not_that_time: [t("Hmm, | I | don't have | anything | at | that | time.", "Hmm, | aš | neturiu | nieko | — | tuo | metu.", "Hmm, tuo metu nieko neturiu.",
      { flags: { 4: "“at”: the instrumental tuo metu carries it." } })],
    availability: [
      t("We | have | {D} | at {$slot} | or | {E} | at {$slot2}.", "Mes | turime | {D:acc} | {$slot} | arba | {E:acc} | {$slot2}.", "Turime {D:acc} {$slot} arba {E:acc} {$slot2}.",
        { say: "We have {D} at {$slot} or {E} at {$slot2}." }),
    ],
    booked: [
      t("Perfect! | You're | all set | for | {D} | at {$slot}.", "Puiku! | Jums | viskas sutvarkyta | — | {D:acc} | {$slot}.", "Puiku! Užregistravau jus {D:acc} {$slot}.",
        { say: "Perfect! You're all set for {D} at {$slot}.", flags: { 3: "“for”: the time phrase itself carries it." } }),
      t("Great! | So | that's | {D} | at {$slot}.", "Puiku! | Taigi | bus | {D:acc} | {$slot}.", "Puiku! Taigi {D:acc} {$slot}.",
        { say: "Great! So that's {D} at {$slot}.", flags: { 2: "“that's” = so it will be: bus (future)." } }),
    ],
    moved: [
      t("Done! | Your | appointment | is | now | {D} | at {$slot}.", "Padaryta! | Jūsų | vizitas | yra | dabar | {D:acc} | {$slot}.", "Padaryta! Jūsų vizitas dabar {D:acc} {$slot}.",
        { say: "Done! Your appointment is now {D} at {$slot}." }),
    ],
    text_reminder: [t("You'll get | a | text | reminder.", "Gausite | — | SMS | priminimą.", "Gausite priminimą SMS žinute.")],
    arrive_early: [
      t("Please | come | ten | minutes | early | to fill out | some | forms.", "Prašom | ateiti | dešimčia | minučių | anksčiau | užpildyti | kelias | formas.",
        "Prašom atvykti dešimčia minučių anksčiau – reikės užpildyti kelias formas."),
    ],
    bring_id: [
      t("And | please | bring | a | photo ID.", "Ir | prašom | atsinešti | — | dokumentą su nuotrauka.", "Ir prašom atsinešti dokumentą su nuotrauka."),
    ],
    anything_else: [
      t("Can | I | help | you | with anything | else?", "Ar galiu | aš | padėti | jums | kuo nors | dar?", "Ar dar kuo nors galiu padėti?"),
      t("Anything | else | I | can | do | for you?", "Ką nors | dar | aš | galiu | padaryti | jums?", "Ar dar kuo nors galiu padėti?"),
    ],
    anything_else_yes: [t("Sure, | what | can | I | do | for you?", "Žinoma, | ką | galiu | aš | padaryti | jums?", "Žinoma, kuo galiu padėti?")],
    see_you: [
      t("See you | {D}! | Bye!", "Iki | {D:gen}! | Viso gero!", "Iki {D:gen}! Viso gero!"),
      t("Thanks | for calling. | See you | {D}!", "Ačiū, | kad paskambinote. | Iki | {D:gen}!", "Ačiū, kad paskambinote. Iki {D:gen}!"),
    ],
    bye_plain: [t("Thanks | for calling. | Bye!", "Ačiū, | kad paskambinote. | Viso gero!", "Ačiū, kad paskambinote. Viso gero!")],

    // info
    address: [
      t("We're | at | 1420 | Green Street, | across from | the | library.", "Mes esame | — | 1420 | Green Street, | priešais | — | biblioteką.",
        "Esame Green Street 1420, priešais biblioteką.",
        { say: "We're at fourteen twenty Green Street, across from the library.", write: "Green Street Dental · 1420 Green Street", spell: "Green", flags: { 1: "“at” before an address: Lithuanian needs no preposition." } }),
    ],
    parking: [t("There's | free | parking | behind | the | building.", "Yra | nemokama | stovėjimo aikštelė | už | — | pastato.", "Už pastato yra nemokama stovėjimo aikštelė.")],
    duration: [t("About | an | hour | for | a | new | patient.", "Apie | — | valandą | — | — | naujam | pacientui.", "Naujam pacientui – maždaug valandą.",
      { flags: { 3: "“for”: the dative pacientui carries it." } })],
    duration_short: [t("About | half | an | hour.", "Apie | pusę | — | valandos.", "Maždaug pusvalandį.")],
    bring: [
      t("Just | a | photo ID | and | a | list | of | your | medications.", "Tik | — | dokumentą su nuotrauka | ir | — | sąrašą | — | jūsų | vaistų.",
        "Tik dokumentą su nuotrauka ir vartojamų vaistų sąrašą.", { flags: { 6: "“of”: the genitive vaistų carries it." } }),
    ],
    cancel_policy: [
      t("If | you | need | to cancel, | please | call | us | 24 | hours | before.", "Jei | jums | reikia | atšaukti, | prašom | paskambinti | mums | 24 | valandas | prieš.",
        "Jei reikės atšaukti, prašom paskambinti bent prieš 24 valandas.", { say: "If you need to cancel, please call us twenty-four hours before." }),
    ],
    forms: [t("Yes, | just | a | few. | Please | come | ten | minutes | early.", "Taip, | tik | — | kelias. | Prašom | ateiti | dešimčia | minučių | anksčiau.",
      "Taip, kelias. Prašom atvykti dešimčia minučių anksčiau.")],
    doctor: [t("You'll see | Dr. | Moreno.", "Jus priims | gydytoja | Moreno.", "Jus priims gydytoja Moreno.", { spell: "Moreno" })],
    pain_advice: [
      t("Until | then, | you | can | take | ibuprofen | for | the | pain.", "Iki | tol | jūs | galite | išgerti | ibuprofeno | nuo | — | skausmo.",
        "Iki vizito nuo skausmo galite išgerti ibuprofeno."),
    ],

    // rescheduling (twist)
    move_ok: [
      t("Sure, | no | problem. | Can | I | have | your | name | and | date of birth?", "Žinoma, | jokių | problemų. | Ar galiu | aš | sužinoti | jūsų | vardą | ir | gimimo datą?",
        "Žinoma, jokių problemų. Ar galėčiau sužinoti jūsų vardą ir gimimo datą?"),
    ],
    found_appt: [
      t("I | see | your | appointment | {D} | at {$slot}.", "Aš | matau | jūsų | vizitą | {D:acc} | {$slot}.", "Matau jūsų vizitą {D:acc} {$slot}.",
        { say: "I see your appointment {D} at {$slot}." }),
      t("I | found | it: | {D} | at {$slot}.", "Aš | radau | jį: | {D:acc} | {$slot}.", "Radau: {D:acc} {$slot}.", { say: "I found it: {D} at {$slot}." }),
    ],
    offer_reschedule: [
      t("Would | you | like | to reschedule?", "Ar | jūs | norėtumėte | perkelti?", "Ar norėtumėte vizitą perkelti?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    canceled: [t("Okay, | I've canceled | it.", "Gerai, | atšaukiau | jį.", "Gerai, vizitą atšaukiau.")],
  },

  domains: {
    slot: () => Object.values(OFFERS).map(slotVal).concat([slotVal(EXISTING)]),
    slot2: () => Object.values(OFFERS).map(slotVal),
  },

  hints: {
    book: {
      lt: "Pasakyti, kad nori užsiregistruoti", slot: "reason", examples: ["checkup", "cleaning"],
      items: [
        { id: "book_like", s: t("I'd like | to make | an | appointment.", "Norėčiau | susitarti dėl | — | vizito.", "Norėčiau užsiregistruoti vizitui.") },
        { id: "book_could", s: t("Could | I | make | an | appointment, | please?", "Ar galėčiau | aš | užsiregistruoti | — | vizitui, | prašau?", "Ar galėčiau užsiregistruoti vizitui?"), register: "polite" },
        { id: "book_calling", s: t("I'm calling | to make | an | appointment.", "Skambinu, | kad užsiregistruočiau | — | vizitui.", "Skambinu norėdamas užsiregistruoti vizitui.") },
        { id: "book_asap", s: t("I | need | to see | a | dentist | as soon as possible.", "Man | reikia | patekti pas | — | odontologą | kuo greičiau.", "Man reikia kuo greičiau patekti pas odontologą.") },
        { id: "reason_have", s: t("I | have | a | toothache.", "Man | skauda | — | dantį.", "Man skauda dantį.") },
        { id: "book_checkup", s: t("I'd like | to book | {X.np}.", "Norėčiau | užsiregistruoti | {X.np:dat}.", "Norėčiau užsiregistruoti {X.np:dat}."), only: (e) => ["checkup", "cleaning"].includes(e.id) },
        { id: "book_need", s: t("I | need | {X.np}.", "Man | reikia | {X.np:gen}.", "Man reikia {X.np:gen}."), only: (e) => ["checkup", "cleaning"].includes(e.id) },
        { id: "book_available", s: t("Do | you | have | anything | this | week?", "Ar | jūs | turite | ką nors | šią | savaitę?", "Ar turite laiko šią savaitę?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "book_want", s: t("I | want | to make | an | appointment.", "Aš | noriu | susitarti dėl | — | vizito.", "Noriu užsiregistruoti vizitui."), register: "casual" },
      ],
    },
    reason: {
      lt: "Pasakyti, kodėl reikia vizito",
      items: [
        { id: "reason_have", s: t("I | have | a | toothache.", "Man | skauda | — | dantį.", "Man skauda dantį.") },
        { id: "reason_for", s: t("It's | for | a | checkup.", "Tai yra | — | — | patikrai.", "Tai profilaktinei patikrai.", { flags: { 1: "“for”: the dative patikrai carries it." } }) },
        { id: "reason_broke", s: t("I | broke | a | tooth.", "Aš | nuskėliau | — | dantį.", "Nuskėliau dantį.") },
        { id: "reason_filling", s: t("I | lost | a | filling.", "Man | iškrito | — | plomba.", "Man iškrito plomba.") },
        { id: "reason_just", s: t("Just | a | cleaning, | please.", "Tik | — | dantų valymas, | prašau.", "Tik dantų valymas, prašau.") },
        { id: "reason_hurts", s: t("My | tooth | really | hurts.", "Man | dantį | labai | skauda.", "Labai skauda dantį.", { flags: { 0: "“My”: Lithuanian marks the sufferer with the dative man." } }) },
      ],
    },
    pain: {
      lt: "Pasakyti, kiek laiko skauda",
      items: [
        { id: "len_days", s: t("For | three | days.", "— | Tris | dienas.", "Jau tris dienas.", { flags: { 0: "“For” (duration): the accusative tris dienas carries it." } }) },
        { id: "len_since", s: t("Since | Monday.", "Nuo | pirmadienio.", "Nuo pirmadienio.") },
      ],
    },
    newpt: {
      lt: "Atsakyti, ar esi naujas pacientas",
      items: [
        { id: "new_patient", s: t("Yes, | I'm | a | new | patient.", "Taip, | aš esu | — | {m:naujas|f:nauja} | {m:pacientas|f:pacientė}.", "Taip, aš {m:naujas pacientas|f:nauja pacientė}.") },
        { id: "new_first", s: t("It's | my | first | time.", "Tai yra | mano | pirmas | kartas.", "Tai pirmas kartas.") },
        { id: "new_before", s: t("No, | I've been | there | before.", "Ne, | esu {m:buvęs|f:buvusi} | ten | anksčiau.", "Ne, jau esu {m:buvęs|f:buvusi} pas jus.") },
      ],
    },
    name: {
      lt: "Pasakyti vardą ir pavardę",
      items: [
        { id: "name_mine", s: t("My | name | is | {$name} | {$surname}.", "Mano | vardas | yra | {$name} | {$surname}.", "Mano vardas – {$name} {$surname}.") },
        { id: "name_last", s: t("My | last name | is | {$surname}.", "Mano | pavardė | yra | {$surname}.", "Mano pavardė – {$surname}.") },
      ],
    },
    surname: {
      lt: "Pasakyti pavardę",
      items: [
        { id: "name_last", s: t("My | last name | is | {$surname}.", "Mano | pavardė | yra | {$surname}.", "Mano pavardė – {$surname}.") },
        { id: "spell_it", s: t("It's | {$letters}.", "Tai | {$letters}.", "{$letters}.", { say: "It's {$letters}." }) },
      ],
    },
    year: {
      lt: "Pasakyti gimimo metus",
      items: [
        { id: "year_is", s: t("1990.", "1990-ieji.", "1990-ieji.", { say: "Nineteen ninety." }), note: "Metus amerikiečiai sako poromis: nineteen ninety (1990), two thousand five (2005)." },
      ],
    },
    hold: {
      lt: "Sutikti palaukti",
      items: [
        { id: "hold_sure", s: t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų.") },
        { id: "hold_course", s: t("Of course.", "Žinoma.", "Žinoma.") },
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
    spell: {
      lt: "Pasakyti pavardę paraidžiui",
      items: [
        { id: "spell_it", s: t("It's | {$letters}.", "Tai | {$letters}.", "{$letters}.", { say: "It's {$letters}." }),
          note: "Angliškos raidės: A – ei, E – i, I – ai, J – džei, G – dži, R – ar, Y – vai, W – dabl ju. Lietuviškų ženklų (š, ž, ė…) paprastai nesakoma." },
      ],
    },
    dob: {
      lt: "Pasakyti gimimo datą",
      items: [
        { id: "dob_is", s: t("June | 4th, | 1990.", "Birželio | 4-oji, | 1990-ieji.", "1990 m. birželio 4 d.", { say: "June fourth, nineteen ninety." }),
          note: "Amerikoje pirma sakomas mėnuo, tada diena: „June 4th“. Metus sako poromis: nineteen ninety." },
        { id: "dob_born", s: t("I | was | born | on | June | 4th, | 1990.", "Aš | — | gimiau | — | birželio | 4-ąją, | 1990-aisiais.", "Gimiau 1990 m. birželio 4 d.",
          { say: "I was born on June fourth, nineteen ninety.", flags: { 1: "Passive “was born” = gimiau: one Lithuanian verb (linked to “born”).", 3: "“on” (a date): the accusative 4-ąją carries it." } }) },
      ],
    },
    phone_no: {
      lt: "Pasakyti telefono numerį",
      items: [
        { id: "phone_is", s: t("My | number | is | 555-201-7788.", "Mano | numeris | yra | 555-201-7788.", "Mano numeris – 555-201-7788.",
          { say: "My number is five five five, two oh one, seven seven eight eight." }), note: "Numerį sakyk po vieną skaitmenį; nulis dažnai tariamas „oh“." },
      ],
    },
    insurance: {
      lt: "Atsakyti apie draudimą",
      items: [
        { id: "ins_none", s: t("No, | I | don't have | insurance.", "Ne, | aš | neturiu | draudimo.", "Ne, draudimo neturiu.") },
        { id: "ins_self", s: t("I'll pay | myself.", "Mokėsiu | {m:pats|f:pati}.", "Mokėsiu {m:pats|f:pati}.") },
        { id: "ins_have", s: t("Yes, | I | have | dental | insurance.", "Taip, | aš | turiu | odontologinį | draudimą.", "Taip, turiu odontologinį draudimą.") },
        { id: "q_cost", s: t("How much | will | it | cost?", "Kiek | — | tai | kainuos?", "Kiek tai kainuos?", { flags: { 1: "“will”: the future ending of kainuos carries it (linked to “cost”)." } }) },
      ],
    },
    slot: {
      lt: "Susitarti dėl laiko",
      items: [
        { id: "slot_ok", s: t("That | works | for me.", "Tai | tinka | man.", "Man tinka.") },
        { id: "slot_earlier", s: t("Do | you | have | anything | earlier?", "Ar | jūs | turite | ką nors | anksčiau?", "Ar turite ką nors anksčiau?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "slot_later", s: t("Do | you | have | anything | later?", "Ar | jūs | turite | ką nors | vėliau?", "Ar turite ką nors vėliau?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "slot_perfect", s: t("Tomorrow | at 8:15 | is | perfect.", "Rytoj | 8:15 | yra | puiku.", "Rytoj 8:15 – puiku.", { say: "Tomorrow at eight fifteen is perfect." }) },
        { id: "slot_day", s: t("Could | I | come | on Friday?", "Ar galėčiau | aš | ateiti | penktadienį?", "Ar galėčiau ateiti penktadienį?") },
        { id: "slot_work", s: t("I'm sorry, | I'm | at work | then.", "Atsiprašau, | aš esu | darbe | tada.", "Atsiprašau, tuo metu būsiu darbe.") },
        { id: "slot_no", s: t("That | doesn't work | for me.", "Tai | netinka | man.", "Man netinka.") },
      ],
    },
    phone: {
      lt: "Susikalbėti telefonu",
      items: [
        { id: "ph_speak_up", s: t("Sorry, | could | you | speak up?", "Atsiprašau, | ar galėtumėte | jūs | kalbėti garsiau?", "Atsiprašau, ar galėtumėte kalbėti garsiau?") },
        { id: "ph_breaking", s: t("Sorry, | you're breaking up.", "Atsiprašau, | ryšys trūkinėja.", "Atsiprašau, ryšys trūkinėja.") },
        { id: "ph_hear", s: t("Can | you | hear | me | now?", "Ar | jūs | girdite | mane | dabar?", "Ar dabar mane girdite?",
          { flags: { 0: "“Can” with a verb of perception: Lithuanian uses the plain verb girdite; ar carries the question." } }) },
        { id: "c_say_again", s: t("Sorry, | could | you | say | that | again?", "Atsiprašau, | ar galėtumėte | jūs | pasakyti | tai | dar kartą?", "Atsiprašau, ar galėtumėte pakartoti?") },
        { id: "c_spell", s: t("How | do | you | spell | that?", "Kaip | — | jūs | rašote | tai?", "Kaip tai rašoma?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “spell”)." } }) },
      ],
    },
    ask: {
      lt: "Paklausti apie vizitą",
      items: [
        { id: "q_address", s: t("What's | your | address?", "Koks yra | jūsų | adresas?", "Koks jūsų adresas?") },
        { id: "q_park", s: t("Where | can | I | park?", "Kur | galiu | aš | pastatyti automobilį?", "Kur galiu pastatyti automobilį?") },
        { id: "q_long", s: t("How | long | will | it | take?", "Kaip | ilgai | — | tai | truks?", "Kiek laiko tai truks?", { flags: { 2: "“will”: the future ending of truks carries it (linked to “take”)." } }) },
        { id: "q_bring", s: t("What | should | I | bring?", "Ką | turėčiau | aš | atsinešti?", "Ką turėčiau atsinešti?") },
      ],
    },
    move: {
      lt: "Perkelti vizitą",
      items: [
        { id: "move_have", s: t("I | have | an | appointment | tomorrow. | Could | I | move | it?", "Aš | turiu | — | vizitą | rytoj. | Ar galėčiau | aš | perkelti | jį?", "Rytoj turiu vizitą. Ar galėčiau jį perkelti?") },
        { id: "move_like", s: t("I'd like | to reschedule | my | appointment.", "Norėčiau | perkelti | savo | vizitą.", "Norėčiau perkelti savo vizitą.") },
        { id: "move_could", s: t("Could | I | move | my | appointment?", "Ar galėčiau | aš | perkelti | savo | vizitą?", "Ar galėčiau perkelti savo vizitą?") },
        { id: "slot_perfect", s: t("Half | past | three | is | perfect.", "Pusė | — | keturių | yra | puiku.", "Pusė keturių – puiku.",
          { flags: { 1: "“past”: Lithuanian counts to the next hour (pusė keturių)." } }) },
      ],
    },
    more: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "more_all", s: t("No, | that's | all. | Thank | you!", "Ne, | tai yra | viskas. | Dėkoju | jums!", "Ne, tai viskas. Ačiū!") },
        { id: "see_you", s: t("See you | tomorrow!", "Iki | rytojaus!", "Iki rytojaus!") },
      ],
    },
  },

  tips: {
    uk_mobile: { key: "uk_mobile", lt: "Suprasta! Amerikoje mobilusis telefonas vadinamas „cell phone“ arba tiesiog „cell“.", better: "My cell number is 555-201-7788." },
    lt_register: { key: "lt_register", lt: "Suprasta! Amerikoje sakoma „make an appointment“ arba „book an appointment“ (ne „register“).", better: "I'd like to make an appointment." },
    us_date: { key: "us_date", lt: "Suprasta! Amerikiečiai datą dažniausiai sako ir rašo mėnesį pirma: June 4th, 1990 (06/04/1990).", better: "June 4th, 1990." },
  },

  merges: {
    "green street dental": { reason: "lexical_expression", split: "Green → žalia, Street → gatvė, Dental → odontologijos would translate the clinic's proper name.", minimal: "A proper name." },
    "green street": { reason: "lexical_expression", split: "Green → žalia + Street → gatvė would translate a street name.", minimal: "A street name." },
    "this is": { reason: "lexical_expression", split: "this → tai + is → yra gives a statement about an object; on the phone “This is Linda” = klauso Linda.", minimal: "Two words; the name stays outside." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal reading; an invitation to speak = sakykite.", minimal: "Two words." },
    "for calling": { reason: "grammatical_fusion", split: "for → už + calling → skambinimas is a calque; thanks for calling = kad paskambinote.", minimal: "Two words." },
    "going on": { reason: "lexical_expression", split: "on → ant is false; “what's going on” = kas nutiko / kas vyksta.", minimal: "Two words." },
    "let's find": { reason: "grammatical_fusion", split: "let's → leiskime + find → rasti is a calque; the first-person plural imperative raskime carries both.", minimal: "Two words; the object stays outside." },
    "last name": { reason: "lexical_expression", split: "last → paskutinis + name → vardas is false; last name = pavardė.", minimal: "Two words." },
    "date of birth": { reason: "lexical_expression", split: "date → data + of birth → gimimo reverses the fixed form-field term; = gimimo data.", minimal: "A fixed three-word term." },
    "you're breaking up": { reason: "lexical_expression", split: "you're → jūs esate + breaking → laužote + up → aukštyn is false; on a phone line = ryšys trūkinėja.", minimal: "A fixed phone phrase." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree adverb “a little” = truputį.", minimal: "Two words." },
    "isn't great": { reason: "grammatical_fusion", split: "Lithuanian negation is the verb prefix: nėra geras.", minimal: "Two words." },
    "loud and clear": { reason: "lexical_expression", split: "loud → garsiai + and → ir + clear → aiškiai is a literal reading of a set reply; = puikiai girdžiu.", minimal: "Fixed three-word reply." },
    "for holding": { reason: "grammatical_fusion", split: "for → už + holding → laikymas is a calque; thanks for holding = kad palaukėte.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie is false; a suggestion = gal / kaip dėl.", minimal: "Two words." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatyti is false; “all set” = viskas sutvarkyta.", minimal: "Two words." },
    "to fill out": { reason: "grammatical_fusion", split: "to → į is false (infinitive) and out → lauk is false; fill out a form = užpildyti.", minimal: "Infinitive marker and particle both belong to the verb." },
    "at 8:15": { reason: "grammatical_fusion", split: "at → prie is false; the clock time alone carries “at” in Lithuanian.", minimal: "Two words." },
    "photo id": { reason: "lexical_expression", split: "photo → nuotraukos + ID → dokumento gives “a photo's document”; the compound = dokumentas su nuotrauka.", minimal: "A compound noun." },
    "across from": { reason: "lexical_expression", split: "across → skersai + from → iš is false; = priešais.", minimal: "Two words." },
    "on weekends": { reason: "grammatical_fusion", split: "on → ant is false; the instrumental savaitgaliais carries it.", minimal: "Two words." },
    "as soon as possible": { reason: "lexical_expression", split: "as → kaip, soon → greitai, as → kaip, possible → įmanoma is a literal reading; = kuo greičiau.", minimal: "A fixed four-word phrase." },
    "i've canceled": { reason: "grammatical_fusion", split: "I've → aš turiu is false: the perfect auxiliary has no Lithuanian word; = atšaukiau.", minimal: "Two words." },
    "i've been": { reason: "grammatical_fusion", split: "I've → aš turiu is false: the perfect auxiliary has no Lithuanian word; = esu buvęs.", minimal: "Two words." },
    "speak up": { reason: "lexical_expression", split: "up → aukštyn is prohibited as mechanical; speak up = kalbėti garsiau.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Paprašyk perkelti vizitą", done: (c) => movePath(c) && !!c.s.moving, when: movePath, optional: true },
    { lt: "Užsiregistruok vizitui", done: (c) => bookPath(c) && !!c.s.reason, when: bookPath, optional: true },
    { lt: "Pasakyk vardą ir pavardę", done: (c) => words(c.s.name) >= 2 },
    { lt: "Pasakyk pavardę paraidžiui", done: (c) => spellNeeded(c) && !!c.s.spelled, when: spellNeeded, optional: true },
    { lt: "Pasakyk gimimo datą", done: (c) => !!c.s.dob },
    { lt: "Pasakyk telefono numerį", done: (c) => newPtBooking(c) && !!c.s.phone, when: newPtBooking, optional: true },
    { lt: "Atsakyk dėl draudimo", done: (c) => newPtBooking(c) && c.s.insurance !== undefined, when: newPtBooking, optional: true },
    { lt: "Susitark dėl laiko", done: (c) => !!c.s.appt },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_move", true),
    { id: "reason", when: (c) => booking(c) && !moving(c), done: (c) => !!c.s.reason,
      ask: (c) => c.say("ask_reason"), expects: ["reason_ans"],
      suggest: [{ lt: "Pasakyti, kodėl reikia vizito", hint: "reason" }] },
    { id: "pain_len", when: (c) => booking(c) && !!c.s.pain && !!c.s.askPainLen, done: (c) => !!c.s.painLen,
      ask: (c) => c.say("ask_pain_len"), expects: ["pain_len"],
      suggest: [{ lt: "Pasakyti, kiek laiko skauda", hint: "pain" }] },
    { id: "new_pt", when: (c) => booking(c) && !!c.s.reason, done: (c) => c.s.newPt !== undefined,
      ask: (c) => { c.say(c.s.npVariant === 1 ? "ask_before" : "ask_new"); },
      expects: ["new_yes", "new_no"],
      suggest: [{ lt: "Atsakyti, ar esi naujas pacientas", hint: "newpt" }],
      yes: (c) => { setNew(c, c.s.npVariant !== 1); },
      no: (c) => { setNew(c, c.s.npVariant === 1); } },
    { id: "name", when: (c) => (booking(c) && c.s.newPt !== undefined) || moving(c), done: (c) => !!c.s.name,
      ask: (c) => { if (moving(c) && bump(c, "move_name") === 0) return; c.say("ask_name"); }, expects: ["name_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti vardą ir pavardę", hint: "name" }, { lt: "Paprašyti pakartoti", hint: "phone" }] },
    { id: "surname", when: (c) => !!c.s.name && words(c.s.name) < 2, done: (c) => words(c.s.name) >= 2,
      ask: (c) => c.say("ask_surname"), expects: ["name_ctx", "spell_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti pavardę", hint: "surname" }] },
    // A date of birth given here is saved (the spelling is asked again); "spell it again, more slowly" only after letters.
    { id: "spell", when: (c) => words(c.s.name) >= 2 && (booking(c) || !!c.s.spellOnMove), done: (c) => !!c.s.spelled,
      ask: (c) => c.say(bump(c, "spell") === 0 ? "ask_spell" : c.s.spellTried ? "spell_again" : "ask_spell_again"), expects: ["spell_ctx", "dob_ans", "dob_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti pavardę paraidžiui", hint: "spell" }, { lt: "Paprašyti pakartoti", hint: "phone" }] },
    { id: "dob", when: (c) => words(c.s.name) >= 2 && (!!c.s.spelled || (moving(c) && !c.s.spellOnMove)), done: (c) => !!c.s.dob,
      ask: (c) => {
        if (c.s.dobPartial && !c.s.dobYear) {
          c.say("ask_year");
          c.expect({ id: "year", expects: ["year_ctx", "dob_ctx", "dob_ans"], hints: ["year"], suggest: [{ lt: "Pasakyti gimimo metus", hint: "year" }],
            on: { year_ctx: (cc, sl) => { setDob(cc, sl); }, dob_ctx: (cc, sl) => { setDob(cc, sl); }, dob_ans: (cc, sl) => { setDob(cc, sl); } },
            ask: (cc) => cc.say("ask_year") });
          return;
        }
        c.say("ask_dob");
      },
      expects: ["dob_ans", "dob_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti gimimo datą (mėnuo, diena, metai)", hint: "dob" }] },
    { id: "phone", when: (c) => booking(c) && !!c.s.newPt && !!c.s.dob, done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"), expects: ["phone_ans", "phone_ctx"], yes: goAhead,
      suggest: [{ lt: "Pasakyti telefono numerį", hint: "phone_no" }] },
    { id: "insurance", when: (c) => booking(c) && !!c.s.newPt && !!c.s.phone, done: (c) => c.s.insurance !== undefined,
      ask: (c) => c.say("ask_insurance"), expects: ["insurance_no", "insurance_yes", "cost_q"],
      suggest: [{ lt: "Atsakyti apie draudimą (ar mokėsi pats)", hint: "insurance" }],
      yes: (c) => { c.s.insurance = true; c.say("insurance_card"); },
      no: (c) => { c.s.insurance = false; c.say("selfpay"); } },
    { id: "hold", when: (c) => readyForSlot(c) && !!c.s.askHold && !c.s.appt, done: (c) => !!c.s.holdDone,
      ask: (c) => { c.say("hold_q"); c.twist("on_hold"); }, expects: ["hold_ok_ctx"],
      suggest: [{ lt: "Sutikti palaukti", hint: "hold" }],
      yes: (c) => { c.s.holdDone = true; c.say("hold_thanks"); },
      no: (c) => { c.s.holdDone = true; c.say("hold_quick"); } },
    { id: "slot", when: (c) => readyForSlot(c), done: (c) => !!c.s.appt,
      ask: (c) => {
        if (moving(c) && !c.s.foundAppt) {
          c.s.foundAppt = true; c.say("found_appt", { D: EXISTING.d, slot: slotVal(EXISTING) });
          // keep an offer Linda already made (during the hold) or a day the learner asked for ("anything earlier",
          // "in the morning" too); otherwise Thursday, as in the song
          const want = c.s.offer ?? (c.s.wantDay !== "early" ? c.s.wantDay : undefined) ?? (c.s.urgent ? earliest(c) : c.s.wantMorning ? "morning" : undefined);
          offer(c, want ?? "move", !!c.s.offer);
          return;
        }
        if (!c.s.offer) {
          if (c.s.pain && c.chance(0.5)) c.say("pain_soon");
          offer(c, c.s.wantDay ?? (c.s.urgent ? "early" : c.s.wantLate ? "late" : c.s.wantMorning ? "morning" : "first"));
          return;
        }
        offer(c, c.s.offer, true);
      },
      expects: ["accept", "earlier", "later", "morning", "day_req", "time_req", "reject", "availability_q"],
      suggest: [{ lt: "Sutikti arba paprašyti kito laiko", hint: "slot" }],
      yes: (c) => { accept(c); },
      no: (c) => { dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] }); } },
    { id: "more", when: (c) => !!c.s.task && (!!c.s.appt || !!c.s.canceled), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"), expects: ["more_no", "see_you"],
      suggest: [{ lt: "Padėkoti ir atsisveikinti (ar dar ko paklausti)", hint: "more" }, { lt: "Paklausti apie adresą, kainą ar ką atsinešti", hint: "ask" }],
      yes: (c) => { c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.moveTwist = c.visits >= 1 && c.chance(0.5);
    c.s.askPainLen = c.chance(0.7);
    c.s.askHold = c.chance(0.4);
    c.s.badLineAt = c.chance(0.45) ? c.pick(["dob", "phone"]) : undefined;
    c.s.spellOnMove = c.chance(0.3);
    c.s.npVariant = c.chance(0.5) ? 0 : 1;
  },

  start: (c) => {
    c.ask(c.s.moveTwist ? "help_move" : "help");
  },

  handlers: {
    book(c, slots, seg) {
      startBooking(c);
      if (seg.tags.includes("urgent")) c.s.urgent = true;
      if (slots.day && DAY_OFFER[slots.day] && !c.s.wantDay) c.s.wantDay = DAY_OFFER[slots.day];
      if (slots.reason) setReason(c, slots.reason, seg.tags);
    },
    reason_ans(c, slots, seg) {
      if (!c.s.booking && !c.s.moving) startBooking(c);
      const r = toArr(slots.reason)[0] ?? (seg.tags.includes("broken") ? "broken" : seg.tags.includes("filling") ? "filling" : "toothache");
      if (c.s.reason && turn(c).reason) return;
      turn(c).reason = true;
      setReason(c, r, seg.tags);
      if (slots.number && c.s.pain) c.s.painLen = slots.number;
    },
    pain_len(c) {
      if (c.s.painLen) return;
      c.s.painLen = true;
      if (!c.s.pain) { c.s.pain = true; if (!c.s.reason) c.s.reason = "toothache"; }
      c.say("noted");
    },
    new_yes(c) { setNew(c, true); },
    new_no(c) { setNew(c, false); },

    intro_name(c, slots) {
      // "Hi, this is Tomas." at the start of the call: remember it; Linda will still ask for the last name.
      if (c.s.name) return;
      dentist.handlers.name_ctx(c, slots, { intent: "name_ctx", slots, tags: [] });
    },
    name_ctx(c, slots) {
      const td = turn(c);
      // "My first name is Tomas and my surname is Mikalauskas": two captures come as a list
      const part = (Array.isArray(slots.name) ? slots.name.join(" ") : String(slots.name || "")).trim();
      if (!part) return;
      if (!/\s/.test(part) && !td.name && notAName(c, part)) return;
      if (c.step === "surname" || (c.s.name && !td.name && words(c.s.name) < 2)) {
        td.name = true;
        c.s.name = `${c.s.name} ${part}`;
        return;
      }
      if (!td.name) { td.name = true; c.s.name = part; return; }
      c.s.name = `${c.s.name} ${part}`;
    },
    spell_ctx(c, slots, seg) {
      // "Wednesday is fine." / "Tomorrow…": a day or month read as one run-together word is no spelling (Linda asks again)
      if (seg.tags.includes("joined") && NOT_SPELLED.test(String(slots.letters || ""))) return;
      if (seg.tags.includes("joined") && !turn(c).letters && notAName(c, String(slots.letters || ""))) return;
      // A single word read as "joined letters" while we're asking for the name is just the name.
      if (seg.tags.includes("joined") && (c.step === "surname" || c.step === "name")) { dentist.handlers.name_ctx(c, { name: slots.letters.charAt(0).toUpperCase() + slots.letters.slice(1) }, seg); return; }
      const td = turn(c);
      const letters = String(slots.letters || "");
      if (!letters) return;
      td.letters = (td.letters ?? "") + letters;
      c.s.spellTried = true;
      if (!c.s.name) c.s.name = "(spelled)";
      if (words(c.s.name) < 2) c.s.name = `${c.s.name} ${td.letters}`;
      if (!td.spellAck) { td.spellAck = true; if (!c.s.spelled) c.say("spell_thanks"); }
      c.s.spelled = td.letters;
    },
    dob_ans(c, slots) { setDob(c, slots); },
    dob_ctx(c, slots) { setDob(c, slots); },
    year_ctx(c, slots) { setDob(c, slots); },
    phone_ans(c, slots, seg) { setPhone(c, slots.digits ?? (seg.tags.includes("this") ? "this number" : undefined)); },
    help_me(c) {
      // "Can you help me?" alone: at the start Linda asks again how she can help; later she says "Go ahead."
      if (c.step !== "help" && c.step !== "help_move" && /(help|question|something)(\s+please)?[\s.!?,]*$/i.test(c.heard.trim())) goAhead(c);
    },
    phone_ctx(c, slots) { setPhone(c, slots.digits); },

    insurance_no(c) {
      if (c.step !== "insurance" && c.s.insurance !== undefined) return;
      c.s.insurance = false;
      if (c.step === "insurance" || c.s.newPt) c.say("selfpay");
    },
    insurance_yes(c) { if (c.s.insurance === true) return; c.s.insurance = true; c.say("insurance_card"); },
    cost_q(c) { c.say("price_info"); },

    earlier(c) {
      holdOk(c);
      if (/\btoday\b/i.test(c.heard)) c.say("no_today");
      if (!c.s.offer || !readyForSlot(c)) { c.s.urgent = true; if (!c.s.task) startBooking(c); return; }
      // moving: tomorrow 8:15 is the appointment being moved, so the first opening is Tuesday
      const first = earliest(c);
      if (c.s.offer === first || (c.s.offered || []).includes(first)) { c.say("earliest"); if (c.s.offer !== first) offer(c, first); c.hold(); return; }
      offer(c, first); c.hold();
    },
    later(c) {
      holdOk(c);
      if (!c.s.offer || !readyForSlot(c)) { c.s.wantLate = true; return; }
      if (c.s.offer === "late") { c.say("latest", { slot: slotVal(OFFERS.late) }); c.hold(); return; }
      offer(c, "late"); c.hold();
    },
    morning(c) {
      holdOk(c);
      if (!c.s.offer || !readyForSlot(c)) { c.s.wantMorning = true; return; }
      offer(c, c.s.offer === "morning" ? earliest(c) : "morning"); c.hold();
    },
    day_req(c, slots) {
      holdOk(c);
      const d = slots.day as string | undefined;
      const heard = c.heard.toLowerCase();
      // moving: "early" (tomorrow 8:15) is the appointment being moved, so Linda keeps her own offer instead
      const early = moving(c) ? (c.s.offer ?? "move") : "early";
      if (!d && /next week/.test(heard)) { if (readyForSlot(c)) { offer(c, "monday"); c.hold(); } return; }
      if (d === "saturday" || d === "sunday") { c.say("closed_weekend"); if (readyForSlot(c)) { offer(c, c.s.offer ?? "morning", !!c.s.offer); c.hold(); } return; }
      if (d === "today") { c.say("no_today"); if (readyForSlot(c)) { offer(c, early, early === c.s.offer); c.hold(); } return; }
      if (moving(c) && d === EXISTING.d) { if (readyForSlot(c)) { c.say("not_that_time"); offer(c, early, early === c.s.offer); c.hold(); } return; }
      const key = d ? DAY_OFFER[d] : undefined;
      if (!key) return;
      if (!readyForSlot(c)) { c.s.wantDay = key; return; }
      if (c.s.offer === key) { accept(c); return; }
      offer(c, key); c.hold();
    },
    time_req(c) {
      if (!readyForSlot(c)) return;
      c.say("not_that_time");
      offer(c, c.s.offer === "late" ? "morning" : "late"); c.hold();
    },
    accept(c, slots) {
      if (c.step === "hold" && !c.s.holdDone) {
        holdOk(c, true);
        // "Wednesday is fine." while Linda asks to hold: she offers that day first
        const d = slots.day as string | undefined;
        if (d && DAY_OFFER[d] && !(moving(c) && DAY_OFFER[d] === "early")) c.s.wantDay = DAY_OFFER[d];
        return;
      }
      if (!readyForSlot(c) || !c.s.offer) return;
      const tm = slots.time as { h: number; m: number } | undefined;
      if (tm) {
        // "Half past three is perfect": pick the offered slot with that time, if any.
        const hit = (c.s.offered || []).find((k: string) => OFFERS[k].h % 12 === tm.h % 12 && OFFERS[k].m === tm.m);
        if (hit && hit !== c.s.offer) { c.s.offer = hit; accept(c); return; }
        if (!hit) {
          // "Tomorrow at 8:15 is perfect.": a slot Linda has but hasn't offered yet (never the one being moved)
          const d0 = slots.day as string | undefined;
          const has = Object.keys(OFFERS).find((k) => (moving(c) ? k !== "early" : k !== "move") && OFFERS[k].h % 12 === tm.h % 12 && OFFERS[k].m === tm.m && (!d0 || OFFERS[k].d === d0));
          if (has && d0) { c.s.offer = has; accept(c); return; }
          if (has) { offer(c, has); c.hold(); return; }
          dentist.handlers.time_req(c, slots, { intent: "time_req", slots, tags: [] }); return;
        }
      }
      // "Wednesday is fine." when Linda offered Thursday: that day, please (never the offered one)
      const d = slots.day as string | undefined;
      if (d && OFFERS[c.s.offer].d !== d) { dentist.handlers.day_req(c, slots, { intent: "day_req", slots, tags: [] }); return; }
      accept(c);
    },
    reject(c) {
      if (!readyForSlot(c) || !c.s.offer) return;
      const order = moving(c) ? ["move", "morning", "monday", "late", "wednesday"] : ["first", "early", "late", "morning", "monday", "wednesday"];
      const next = order.find((k) => !(c.s.offered || []).includes(k)) ?? order[(order.indexOf(c.s.offer) + 1) % order.length];
      offer(c, next); c.hold();
    },
    availability_q(c) {
      if (!readyForSlot(c)) return;
      const a = c.s.offer ?? "first";
      const b = a === "late" ? "morning" : "late";
      c.say("availability", { D: OFFERS[a].d, slot: slotVal(OFFERS[a]), E: OFFERS[b].d, slot2: slotVal(OFFERS[b]) });
      c.hold();
    },

    hold_ok_ctx(c) { holdOk(c, true); },
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

    address_q(c) { c.say("address"); },
    parking_q(c) { c.say("parking"); },
    duration_q(c) { c.say(c.s.newPt === false || c.s.reason === "cleaning" ? "duration_short" : "duration"); },
    bring_q(c) { c.say("bring"); },
    cancel_policy_q(c) { c.say("cancel_policy"); },
    forms_q(c) { c.say("forms"); },
    doctor_q(c) { c.say("doctor"); },
    pain_q(c) { c.say("pain_advice"); },

    move(c, slots) {
      c.s.task = c.s.task || "move";
      c.s.moreDone = false;
      // "…could I move it to Wednesday?": Linda offers that day first (never tomorrow 8:15, the slot being moved)
      const tgt = slots?.target as string | undefined;
      if (tgt && DAY_OFFER[tgt] && DAY_OFFER[tgt] !== "early" && !c.s.offer) c.s.wantDay = DAY_OFFER[tgt];
      if (c.s.moving) return;
      c.s.moving = true;
      c.s.booking = false;
      c.twist("reschedule");
      c.say("move_ok");
    },
    cancel(c) {
      c.s.task = c.s.task || "cancel";
      c.say("offer_reschedule");
      c.expect({
        id: "reschedule_q", expects: ["move"], hints: ["g_yesno", "move"],
        suggest: [{ lt: "Atsakyti, ar nori perkelti vizitą", hint: "g_yesno" }, { lt: "Perkelti vizitą", hint: "move" }],
        yes: (cc) => { dentist.handlers.move(cc, {}, { intent: "move", slots: {}, tags: [] }); },
        no: (cc) => { cc.s.canceled = true; cc.say("canceled"); },
        on: { move: (cc, sl, sg) => { dentist.handlers.move(cc, sl, sg); } },
        ask: (cc) => cc.say("offer_reschedule"),
      });
    },

    more_no(c) {
      const st = dentist.steps.find((x) => x.id === c.step);
      if (st && st.id !== "more" && st.no && !st.done(c)) { st.no(c); return; }
      c.s.moreDone = true;
    },
    see_you(c) { c.s.moreDone = true; c.s.saidSeeYou = true; },
  },

  finish: (c) => {
    if (c.s.appt) c.complete();
    const o = c.s.appt ? OFFERS[c.s.appt] : undefined;
    if (o) c.say("see_you", { D: o.d });
    else c.say("bye_plain");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "more" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        see_you: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
    if (c.s.saidSeeYou) c.end();
  },

  tests: [
    { say: "Hi, I'd like to make an appointment.", intent: "book" },
    { say: "Could I make an appointment for a checkup, please?", intent: "book", slots: { reason: "checkup" } },
    { say: "I'm calling to make an appointment.", intent: "book" },
    { say: "I need to see a dentist as soon as possible.", intent: "book" },
    { say: "Do you have anything this week?", intent: "book" },
    { say: "I have a toothache.", intent: "reason_ans", slots: { reason: "toothache" } },
    { say: "My tooth really hurts.", intent: "reason_ans", step: "reason" },
    { say: "I broke a tooth.", intent: "reason_ans", step: "reason" },
    { say: "Just a cleaning, please.", intent: "reason_ans", step: "reason", slots: { reason: "cleaning" } },
    { say: "For three days.", intent: "pain_len", step: "pain_len" },
    { say: "Since Monday.", intent: "pain_len", step: "pain_len" },
    { say: "Yes, it's my first time.", intent: "new_yes", step: "new_pt" },
    { say: "No, I've been there before.", intent: "new_no", step: "new_pt", not: ["new_yes"] },
    { say: "I'm not a new patient.", intent: "new_no", step: "new_pt", not: ["new_yes"] },
    { say: "My name is Tomas Mikalauskas.", intent: "name_ctx", step: "name" },
    { say: "M-I-K-A-L-A-U-S-K-A-S", intent: "spell_ctx", step: "spell" },
    { say: "It's spelled M I K A", intent: "spell_ctx", step: "spell" },
    { say: "June 4th, 1990.", intent: "dob_ctx", step: "dob", slots: { date: { day: 4, month: 6 }, year: 1990 } },
    { say: "I was born on the fourth of June, nineteen ninety.", intent: "dob_ans", slots: { year: 1990 } },
    { say: "06/04/1990", intent: "dob_ctx", step: "dob", slots: { numdate: { month: 6, day: 4, year: 1990 } } },
    { say: "It's 555-201-7788.", intent: "phone_ans", step: "phone" },
    { say: "My phone number is 5552017788", intent: "phone_ans", slots: { digits: "5552017788" } },
    { say: "My mobile number is 555 201 7788", intent: "phone_ans" },
    { say: "No, I don't have insurance.", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "I'll pay myself.", intent: "insurance_no", step: "insurance" },
    { say: "Do you have anything earlier?", intent: "earlier", step: "slot" },
    { say: "Is there anything in the afternoon?", intent: "later", step: "slot" },
    { say: "Could I come on Friday?", intent: "day_req", step: "slot", slots: { day: "friday" } },
    { say: "That works for me.", intent: "accept", step: "slot" },
    { say: "Tomorrow at 8:15 is perfect.", intent: "accept", step: "slot" },
    { say: "That doesn't work for me.", intent: "reject", step: "slot", not: ["accept"] },
    { say: "I'm sorry, I'm at work then.", intent: "later", step: "slot", not: ["accept"] },
    { say: "Sorry, could you speak up?", intent: "speak_up" },
    { say: "Sorry, you're breaking up.", intent: "speak_up" },
    { say: "Can you hear me now?", intent: "hear_me" },
    { say: "What's your address?", intent: "address_q" },
    { say: "Where can I park?", intent: "parking_q" },
    { say: "I have an appointment tomorrow. Could I move it?", intent: "move" },
    { say: "I'd like to reschedule my appointment.", intent: "move" },
    { say: "Half past three is perfect.", intent: "accept", step: "slot" },
    { say: "I need to cancel my appointment.", intent: "cancel" },
    { say: "No, that's all. Thank you!", intent: "more_no", step: "more" },
    { say: "How do you spell that?", intent: "g_spell" },
    { say: "Yes, I have dental insurance.", intent: "insurance_yes", step: "insurance" },
    { say: "How much will it cost?", intent: "cost_q" },
    { say: "Do you have anything in the morning?", intent: "morning", step: "slot" },
    { say: "Can I come at five?", intent: "time_req", step: "slot" },
    { say: "What times do you have?", intent: "availability_q", step: "slot" },
    { say: "How long will it take?", intent: "duration_q" },
    { say: "What should I bring?", intent: "bring_q" },
    { say: "What if I need to cancel?", intent: "cancel_policy_q" },
    { say: "Who is the dentist?", intent: "doctor_q" },
    { say: "What can I take for the pain?", intent: "pain_q" },
    { say: "See you tomorrow!", intent: "see_you", step: "more" },
    { say: "five five five two oh one seven seven eight eight", intent: "phone_ctx", step: "phone" },
    { say: "I need a cleaning.", intent: "book", slots: { reason: "cleaning" } },
    { say: "Tomas Mikalauskas", intent: "none" },
    { say: "M I K A L A U S K A S", intent: "none" },
    { say: "My dog likes green potatoes", intent: "none" },
    // more constructions and vocabulary (dev corpus tests/corpus/s76-dentist-call.json)
    { say: "I want to register to the dentist", intent: "book", step: "help" },
    { say: "Can I book a visit for Tuesday?", intent: "book", step: "help", slots: { day: "tuesday" } },
    { say: "My filling fell out", intent: "reason_ans", step: "help" },
    { say: "Hello, can you help me? I have a problem with my tooth", intent: "reason_ans", step: "help" },
    { say: "Since two days", intent: "pain_len", step: "pain_len" },
    { say: "I've had it for about three days", intent: "pain_len", step: "pain_len" },
    { say: "I've never been to your office", intent: "new_yes", step: "new_pt" },
    { say: "I came once, two years ago", intent: "new_no", step: "new_pt" },
    { say: "My first name is Tomas and my surname is Mikalauskas", intent: "name_ctx", step: "name" },
    { say: "Let me spell it: M I K A L A U S K A S", intent: "spell_ctx", step: "spell" },
    { say: "04.06.1990", intent: "dob_ctx", step: "dob", slots: { numdate: { month: 6, day: 4, year: 1990 } } },
    { say: "You can call me at 555-201-7788", intent: "phone_ans", step: "phone" },
    { say: "You can use this number", intent: "phone_ans", step: "phone" },
    { say: "My insurance is in Lithuania", intent: "insurance_no", step: "insurance" },
    { say: "Sure, I'll hold", intent: "hold_ok_ctx", step: "hold" },
    { say: "Not Tuesday, maybe Wednesday?", intent: "day_req", step: "slot", slots: { day: "wednesday" } },
    { say: "I'm at work until five", intent: "later", step: "slot" },
    { say: "Can I have the first available?", intent: "earlier", step: "slot" },
    { say: "Is it possible to move my appointment?", intent: "move", step: "help_move" },
    { say: "I have to cancel tomorrow's appointment", intent: "cancel", step: "help_move" },
    { say: "Still bad", intent: "speak_up" },
    // safety
    { say: "I can't come on Tuesday", intent: "reject", step: "slot", not: ["accept"] },
    { say: "I can't in the morning", intent: "later", step: "slot", not: ["accept", "morning"] },
    { say: "I don't want to change my appointment", intent: "none" },
    { say: "Nothing earlier?", intent: "earlier", step: "slot", not: ["accept"] },
    // bug review 25 Sep: another day accepted, a date of birth at the spelling step
    { say: "Wednesday is fine.", intent: "accept", step: "slot", slots: { day: "wednesday" } },
    { say: "Wednesday is not good for me", intent: "reject", step: "slot", not: ["accept"] },
    { say: "June 4th, 1990.", intent: "dob_ctx", step: "spell", slots: { date: { day: 4, month: 6 }, year: 1990 } },
    { say: "My date of birth is June 4th, 1990.", intent: "dob_ans", step: "spell" },
    { say: "I have an appointment tomorrow, can I move it to Wednesday?", intent: "move", step: "help_move", slots: { target: "wednesday" } },
    { say: "Could I move it to Wednesday?", intent: "day_req", step: "slot", slots: { day: "wednesday" } },
    { say: "I don't want to move it to Wednesday", intent: "none", not: ["move", "day_req"] },
  ],

  sims: [
    { name: "toothache, new patient, earlier time",
      turns: ["Hi, I'd like to make an appointment. I have a toothache.", "Yes, it's my first time.", "Tomas Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "June 4th, 1990.", "It's 555-201-7788.", "No, I don't have insurance.", "Do you have anything earlier?", "Perfect! That works for me.", "No, that's all. Thank you!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
    { name: "checkup, bad line and questions",
      turns: ["Good morning! Could I book a checkup, please?", "Sorry, could you speak up?", "No, I've been there before.", "My name is Tomas.", "Mikalauskas.", "It's M I K A L A U S K A S.", "The fourth of June, nineteen ninety.", "Is there anything in the afternoon?", "That works for me.", "What's your address?", "Where can I park?", "No, that's everything. Thanks!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
    { name: "reschedule (twist)",
      turns: ["Hi, I have an appointment tomorrow. Could I move it?", "Tomas Mikalauskas.", "June 4th, 1990.", "Half past three is perfect.", "No, that's all. Thank you!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
    // moving: "anything earlier" gets Tuesday at 10, never tomorrow 8:15 (the appointment being moved)
    { name: "reschedule, anything earlier",
      turns: ["Hi, I have an appointment tomorrow. Could I move it?", "Tomas Mikalauskas.", "June 4th, 1990.", "Do you have anything earlier?", "Anything earlier?", "Okay, that works.", "No, that's all. Thank you!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
    { name: "“Sure.” and “Sorry, what?” while giving the name",
      turns: ["Hi, I'd like to make an appointment for a checkup.", "No, I've been there before.", "Sure.", "Tomas Mikalauskas.", "Sorry, what?", "Sure.", "M I K A L A U S K A S.", "June 4th, 1990.", "That works for me.", "No, that's all. Thank you!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
    { name: "cleaning, choosing a day",
      turns: ["Hello, I need a cleaning.", "Yes, I'm a new patient.", "Tomas Mikalauskas", "M, I, K, A, L, A, U, S, K, A, S", "06/04/1990", "555 201 7788", "I'll pay myself.", "How much will it cost?", "Could I come on Friday?", "Friday is perfect.", "See you on Friday!"],
      expect: { complete: true }, auto: DENTIST_AUTO },
  ],
};

/** "Can you hold?" — anything but a refusal means yes. */
function holdOk(c: Ctx, thank = false) {
  if (c.step !== "hold" || c.s.holdDone) return;
  c.s.holdDone = true;
  if (thank) c.say("hold_thanks");
}

function setReason(c: Ctx, r: string, tags: string[] = []) {
  const first = !c.s.reason;
  c.s.reason = r;
  const e = REASONS.find((x) => x.id === r);
  if (e?.attrs?.pain || tags.includes("pain") || tags.includes("broken")) c.s.pain = true;
  if (first) c.say(c.s.pain ? "g_sorry_to_hear" : "reason_ok");
}

function setNew(c: Ctx, isNew: boolean) {
  if (c.s.newPt !== undefined) return;
  c.s.newPt = isNew;
  c.say(isNew ? "new_welcome" : "old_welcome");
}

function setDob(c: Ctx, slots: any) {
  const td = turn(c);
  if (td.dobRejected || c.s.dob) return;
  if (c.s.badLineAt === "dob" && !c.s.badLineDone && c.step === "dob") {
    c.s.badLineDone = true; td.dobRejected = true;
    c.twist("bad_line"); c.say("breaking_up"); c.hold(); return;
  }
  const nd = slots.numdate;
  const date = nd ? { day: nd.day, month: nd.month } : slots.date;
  const year = nd ? nd.year : slots.year;
  if (date) c.s.dobPartial = { ...(c.s.dobPartial || {}), ...date };
  if (year) c.s.dobYear = year;
  if (c.s.dobPartial && c.s.dobYear) {
    c.s.dob = { ...c.s.dobPartial, year: c.s.dobYear };
    c.say("dob_thanks");
  }
}

function setPhone(c: Ctx, digits: string | undefined) {
  const td = turn(c);
  if (td.phoneRejected || !digits) return;
  if (c.s.badLineAt === "phone" && !c.s.badLineDone && c.step === "phone") {
    c.s.badLineDone = true; td.phoneRejected = true;
    c.twist("bad_line"); c.say("breaking_up"); c.hold(); return;
  }
  td.phone = (td.phone ?? "") + digits;
  if (!td.phoneAck) { td.phoneAck = true; if (!c.s.phone) { c.s.phone = td.phone; c.say("phone_thanks"); return; } }
  c.s.phone = td.phone;
}

export default dentist;
