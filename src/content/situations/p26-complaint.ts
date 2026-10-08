// Song P26 "I'd Like to Make a Complaint": a formal complaint on the phone (formal: jūs).
// Three weeks ago the learner bought a new fridge with a fancy screen at Harbor Home, the appliance store on
// Maple Harbor's main road ($1,299). Last Tuesday it hummed a tune and went still; the technician never came.
// This is the third call. Kyle, the first-line agent, sticks to his script (twist: "Is it plugged in?"),
// reads the file (the missed visit says… completed?) and offers yet another visit next Tuesday. The learner
// says it's the third call, asks for the manager and holds ("I've got all day"). Brenda, the customer care
// manager, tries the cheap fix first (twist: a $50 coupon and a mug, or a technician on Wednesday between 10
// and 2); the learner declines politely, asks for a refund or a replacement, sets a deadline ("by Friday, not
// someday"), asks for it in writing and takes down the reference number HH-4471.
// Endings: success (refund or replacement + the reference number: done); partial (the coupon or Wednesday
// taken, or next Tuesday with Kyle: not done); walked away (not done). Rudeness gets a calm in-world reply and
// a tip, never a failure. Several facts in one sentence are all taken ("My fridge stopped working, and this is
// the third time I've called"), so nothing is asked twice.
//
// Gender: Kyle says "sir" / "ma'am" (separate _m / _f lines: the English can't vary by gender); {m:…|f:…} in
// Lithuanian follows the player.
//
// ART: pictures for src/ui/scene-data/p26-complaint.json (the phone call; the art note: Kyle's call center,
// Brenda's office, the learner's kitchen as a split screen next to the portrait):
//   "hold"     start, problem, plugged: the learner's Maple Harbor kitchen: a shiny new fridge whose screen still
//              glows green ("Good morning, sunshine!") while a puddle spreads in front of it; phone on speaker.
//   "kyle"     name, history, offer_manager, book_tuesday: Kyle, early twenties, headset, in a bright, slightly
//              too cheerful call center (Harbor Home logo, a wall of identical blue cubicles), reading from a
//              laminated script with a big "1. Is it plugged in?" on top.
//   "transfer" transfer: the learner on hold in the kitchen, phone to the ear, music notes and waves floating
//              from the phone (the hold music is "a song about the sea").
//   "brenda"   offer, refund_or, anything: Brenda, in her fifties, reading glasses on a chain, in a neat glass
//              office; a shelf behind her full of identical Harbor Home mugs, a coupon pad on the desk.
//   "deal"     deadline, which_day, confirm, reference, readback, closing: Brenda smiling, typing the
//              confirmation; a sticky note on her screen: "HH-4471 – by Friday".
//
// The recorded hold message ("Your call is important to us. Please hold." and "…your estimated wait time is
// 47 minutes") speaks with npcs.ts harbor_bot, Harbor Home's recorded voice (like netwave_bot in s80).
// NEEDS (optional, the game ignores them now): "hold-music" { seconds } could play a few seconds of hold music
//   (a soft song about the sea); "outro" { outcome, lt } carries the Lithuanian end-card line of each ending.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";
import { NPCS } from "../npcs";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_HAVE_WISH = "“Have” (a wish) = linkiu + genitive.";
const F_DO_Q = "Question “Do” = the particle ar.";
const F_DOES_Q = "Question “Does” = the particle ar.";
const F_WOULD_Q = "“Would” in a yes/no question = the particle ar; the conditional sits on the verb.";
const F_SORRY_AM = "“I'm … sorry” = aš … atsiprašau: the verb atsiprašau (under “sorry”) carries “am”.";
const F_GAILA = "“I'm” = man: the dative with gaila carries “am”.";
const F_PM2 = "“2” = 2 p.m. = 14 val.";

// ---------------------------------------------------------------------------
// Days for the deadline (the accusative of "tomorrow" is the adverb rytoj, as in s76)

const DAYS: EntityDef[] = [
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m"),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m"),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m"),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m"),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m"),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m"),
  ent("sunday", "Sunday", "sekmadienis/sekmadienio/sekmadieniui/sekmadienį/sekmadieniu/sekmadienyje", "m"),
  ent("tomorrow", "tomorrow", "rytoj/rytojaus/rytoj/rytoj/rytoj/rytoj", "m"),
];
const DAY_IDS = new Set(DAYS.map((d) => d.id));

/** The reference number (a value placeholder, as in s80). */
const REF = { en: "HH-4471", lt: "HH-4471", say: "H, H, four, four, seven, one" };
const REF_WRITE = "Harbor Home reference number: HH-4471";

/** The recorded hold message's voice (npcs.ts). */
const SYSTEM_VOICE = "harbor_bot";

/** Lithuanian end-card lines (sent with the "outro" event; see NEEDS). */
const OUTRO: Record<string, string> = {
  replacement: "Po savaitės naujas šaldytuvas pasisveikina: „Good morning!“ Ir tu jam atsakai tuo pačiu.",
  refund: "Pinigai grįžo, o „Harbor Home“ puodelio taip ir neprireikė.",
  coupon: "Turi kuponą ir puodelį… o šaldytuvas vis dar tyli. Pabandyk dar kartą: mandagiai, bet tvirtai paprašyk grąžinti pinigus arba pakeisti šaldytuvą.",
  visit: "Dar vienas „tarp 10 ir 14“… Ar šįkart kas nors atvyks? Pabandyk dar kartą ir paprašyk vadovo, pinigų arba naujo šaldytuvo.",
  tuesday: "Dar vienas vizitas „kitą antradienį“… Ar šįkart kas nors atvyks? Pabandyk dar kartą ir paprašyk vadovo, pinigų arba naujo šaldytuvo.",
  walked: "Ragelis padėtas, šaldytuvas vis dar tylus. Pabandyk dar kartą – gal ketvirtas skambutis bus sėkmingas.",
};

// ---------------------------------------------------------------------------
// State helpers

/** Per-turn scratch (the dialogue makes a fresh context object for every learner turn). */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
/** True the first time a key is used this turn: one reaction per turn, however many pieces the sentence has. */
function once(c: Ctx, key: string): boolean {
  const d = turn(c);
  if (d[key]) return false;
  d[key] = true;
  return true;
}

const K = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("kyle"); c.say(line, vars); };
const B = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("brenda"); c.say(line, vars); };
/** Kyle's lines with "sir" / "ma'am". */
const KG = (c: Ctx, base: string) => K(c, `${base}_${c.player.gender === "f" ? "f" : "m"}`);

const pluggedOk = (c: Ctx) => !c.s.pluggedTwist || !!c.s.pluggedDone;
const nameDone = (c: Ctx) => !!c.s.named || (c.s.nameAsked ?? 0) >= 2;
const atTransfer = (c: Ctx) => !c.s.transferred && c.step === "transfer";
const atPlugged = (c: Ctx) => !c.s.transferred && c.step === "plugged" && !c.s.pluggedDone;
/** A real deadline (a day, or "as soon as possible" → Friday), not just "10 to 14 days is fine". */
const deadlineSet = (c: Ctx) => !!c.s.deadline && c.s.deadline !== "accepted";
const heard = (c: Ctx) => c.heard.toLowerCase();
const REMEDY_WORDS = /\b(refund|money back|replace|replacement|new one|new fridge|exchange)\b/;
const DAY_OFF = /\b(day off|nobody came|no one came|never came|never showed up)\b/;
/** "Yes, that works. Can I have that in writing?": Brenda's answer about the writing is the reply. */
const YES_START = /^\W*(yes|yeah|yep|sure|okay|ok|fine|that works|that is fine|that's fine|perfect|great)\b/;
const ASKS_WRITING = /\b(writing|written|email|e mail|confirm)\b/;

/** "by Friday" → friday; "tomorrow" → tomorrow; "as soon as possible", "by the end of the week", "today",
 *  "next week" → asap (Brenda says "Let's say Friday, then."); "two weeks is too long" → toolong. */
function deadlineOf(slots: any, tags: string[]): string | undefined {
  if (tags.includes("toolong")) return "toolong";
  const raw = slots?.day;
  const d = Array.isArray(raw) ? raw[0] : raw;
  if (typeof d === "string" && DAY_IDS.has(d)) return d;
  if (d || tags.includes("asap") || tags.includes("endweek")) return "asap";
  return undefined;
}

/** Facts the learner mentions, wherever they come (Kyle's part): nothing is asked again later. */
function recordFacts(c: Ctx, intent: string, slots: any, seg: Segment) {
  const s = c.s;
  if (intent === "third_time" || (intent === "not_good_enough" && seg.tags.includes("third"))) s.thirdSaid = true;
  if (s.transferred) return;
  switch (intent) {
    case "fridge_broke":
      if (!s.problem) { s.problem = "fridge"; turn(c).problemNew = true; }
      break;
    case "no_show":
      s.noShowSaid = true;
      if (!s.problem) { s.problem = "noshow"; turn(c).problemNew = true; }
      break;
    case "ask_manager": case "further":
      s.escalated = true;
      break;
    case "ask_refund": s.wish = "refund"; deadlineFact(c, slots, seg); break;
    case "ask_replacement": s.wish = "replacement"; deadlineFact(c, slots, seg); break;
    case "refund_or": if (!s.wish) s.wish = "either"; break;
    case "set_deadline": case "deadline_ctx": deadlineFact(c, slots, seg); break;
    case "intro_name": case "intro_ctx": case "intro_this_ctx":
      if (slots?.name) s.named = true;
      break;
  }
}
function deadlineFact(c: Ctx, slots: any, seg: Segment) {
  const d = deadlineOf(slots, seg.tags);
  if (!d || d === "toolong") return;
  c.s.deadline = d === "asap" ? "friday" : d;
  c.s.asap = d === "asap";
}

// ---------------------------------------------------------------------------
// The hold, the transfer and the endings

function holdMessage(c: Ctx, long: boolean) {
  c.event("hold-music", { seconds: long ? 6 : 3 });
  if (!NPCS[SYSTEM_VOICE]) return;
  c.speaker(SYSTEM_VOICE);
  c.say("hold_msg");
  if (long) c.say("hold_long");
}

/** Kyle puts the learner through to Brenda ("Can you hold?" – any answer is a yes). */
function transferNow(c: Ctx, kind: "yes" | "no" | "allday") {
  if (c.s.transferred || c.s.over) return;
  K(c, kind === "allday" ? "kyle_hold_ok" : kind === "no" ? "kyle_hold_no" : "kyle_thanks_hold");
  holdMessage(c, false);
  c.s.transferred = true;
  B(c, "brenda_hi");
  B(c, "brenda_hi2");
}

function outro(c: Ctx, outcome: string, key: string) {
  c.s.outcome = outcome;
  c.event("outro", { outcome, lt: OUTRO[key] });
}

/** Partial ending with Kyle: one more visit next Tuesday (not done). */
function tuesdayEnding(c: Ctx) {
  if (c.s.over) return;
  c.s.over = true;
  c.s.accepted = "tuesday";
  K(c, "kyle_tuesday_ok");
  K(c, "kyle_bye");
  outro(c, "partial", "tuesday");
  c.end();
  c.hold();
}

/** Success: the remedy is approved and the reference number given. */
function succeed(c: Ctx) {
  if (c.s.wrapUp) return;
  c.s.wrapUp = true;
  c.complete();
  c.remember({ resolved: true, remedy: c.s.remedy });
  outro(c, "success", c.s.remedy);
}

/** Brenda's goodbye (once per turn); it ends the call. */
function closeBye(c: Ctx, appreciated = false) {
  if (!once(c, "bye")) return;
  if (appreciated || /\b(appreciate|helpful)\b/.test(heard(c))) B(c, "brenda_appreciate_reply");
  B(c, c.s.remedy === "replacement" ? "brenda_bye_new" : "brenda_bye");
  c.s.over = true;
  c.end();
  c.hold();
}

/** "Bye", "Forget it", "I'll call back later": after the remedy it is a normal goodbye (the reference number
 *  first, if it wasn't given); after taking the coupon or the visit it is the partial ending; before that the
 *  learner walks away. */
function endCall(c: Ctx, walking = false) {
  if (c.s.over) return;
  if (c.s.remedy) {
    if (!c.s.ref) { B(c, "brenda_ref_before_go", { text: REF }); c.s.ref = true; }
    succeed(c);
    closeBye(c);
    return;
  }
  if (c.s.accepted) {
    c.s.over = true;
    B(c, "brenda_bye");
    outro(c, "partial", c.s.accepted);
    c.end();
    c.hold();
    return;
  }
  c.s.over = true;
  if (!c.s.transferred) { if (walking) K(c, "kyle_understand"); K(c, "kyle_bye"); }
  else { B(c, "brenda_walk"); B(c, "brenda_bye"); }
  outro(c, "walked", "walked");
  c.end();
  c.hold();
}

// ---------------------------------------------------------------------------
// Kyle

function kApologize(c: Ctx) { if (once(c, "k_ack")) K(c, "kyle_apologize"); }

function pluggedAnswered(c: Ctx) {
  if (c.s.pluggedDone) return;
  c.s.pluggedDone = true;
  if (once(c, "k_ack")) K(c, "kyle_plugged_ok");
}

/** "Would you like to speak to my manager?" */
function offerManager(c: Ctx) {
  K(c, "kyle_offer_manager");
  c.expect({
    id: "offer_manager", expects: ["ask_manager", "further", "agree", "accept_offer", "decline_offer", "no_manager"], hints: ["g_yesno", "escalate"],
    suggest: [{ lt: "Sutikti pakalbėti su vadove", hint: "g_yesno" }, { lt: "Paprašyti vadovo", hint: "escalate" }],
    on: {
      ask_manager: (cc) => { escalateNow(cc); }, further: (cc) => { escalateNow(cc); }, agree: (cc) => { escalateNow(cc); },
      accept_offer: (cc) => { tuesdayEnding(cc); },
      no_manager: (cc) => { K(cc, "kyle_earliest"); askBookTuesday(cc); },
    },
    yes: (cc) => { escalateNow(cc); },
    // no manager: then it's next Tuesday ("Should I book you for next Tuesday?")
    no: (cc) => { K(cc, "kyle_earliest"); askBookTuesday(cc); },
    ask: (cc) => K(cc, "kyle_offer_manager"),
  });
}

/** The learner agrees to the manager: the transfer step comes next. */
function escalateNow(c: Ctx) { c.s.escalated = true; }

/** A bare "Yes" / "Okay" to Kyle's Tuesday offer: he makes sure before booking it. */
function askBookTuesday(c: Ctx) {
  K(c, "kyle_book_q");
  c.expect({
    id: "book_tuesday", expects: ["accept_offer", "agree", "decline_offer", "not_good_enough", "ask_manager", "further", "third_time"], hints: ["escalate", "g_yesno"],
    suggest: [{ lt: "Atsisakyti ir paprašyti vadovo", hint: "escalate" }, { lt: "Sutikti (tada dar vienas vizitas)", hint: "g_yesno" }],
    on: {
      accept_offer: (cc) => { tuesdayEnding(cc); }, agree: (cc) => { tuesdayEnding(cc); },
      ask_manager: (cc) => { escalateNow(cc); }, further: (cc) => { escalateNow(cc); },
      decline_offer: (cc) => { kApologize(cc); offerManager(cc); },
      not_good_enough: (cc) => { kApologize(cc); offerManager(cc); },
      third_time: (cc) => { if (once(cc, "k_ack")) KG(cc, "kyle_three_calls"); offerManager(cc); },
    },
    yes: (cc) => { tuesdayEnding(cc); },
    no: (cc) => { offerManager(cc); },
    ask: (cc) => K(cc, "kyle_book_q"),
  });
}

function kyleRude(c: Ctx) {
  c.s.rudeK = (c.s.rudeK ?? 0) + 1;
  if (atPlugged(c)) { pluggedAnswered(c); return; }
  if (!once(c, "k_ack")) return;
  if (c.s.rudeK === 1) KG(c, "kyle_rude"); else K(c, "kyle_rude2");
}

/** Kyle's reaction to each intent (before the transfer). */
const KYLE: Record<string, (c: Ctx, slots: any, seg: Segment) => void> = {
  complain_open: (c) => { turn(c).complained = true; if (c.s.problem && !turn(c).problemNew) kApologize(c); },
  fridge_broke: (c) => { if (turn(c).problemNew) { if (once(c, "k_ack")) K(c, "kyle_sorry"); } else kApologize(c); },
  no_show: (c) => { if (turn(c).problemNew) { if (once(c, "k_ack")) K(c, "kyle_sorry"); } else kApologize(c); },
  disbelief: (c) => { if (c.s.fileRead) kApologize(c); },
  third_time: (c) => { if (once(c, "k_ack")) KG(c, "kyle_three_calls"); },
  not_good_enough: (c, _slots, seg) => { if (seg.tags.includes("third")) { if (once(c, "k_ack")) KG(c, "kyle_three_calls"); return; } kApologize(c); },
  decline_offer: (c) => { kApologize(c); },
  ask_manager: (c) => { kyleManagerFirst(c); },
  further: (c) => { kyleManagerFirst(c); },
  no_manager: (c) => { kApologize(c); },
  ask_refund: (c) => { kyleNoRemedy(c, "kyle_cant_refund"); },
  refund_or: (c) => { kyleNoRemedy(c, "kyle_cant_refund"); },
  ask_replacement: (c) => { kyleNoRemedy(c, "kyle_cant_replace"); },
  either_ctx: () => { /* only Brenda asks "a refund or a replacement?" */ },
  not_remedy: (c) => { kApologize(c); },
  set_deadline: (c, slots, seg) => { kyleDeadline(c, slots, seg); },
  deadline_ctx: (c, slots, seg) => { kyleDeadline(c, slots, seg); },
  ask_writing: (c) => { if (once(c, "k_info")) K(c, "kyle_writing"); },
  ask_reference: (c) => { c.s.ref = true; c.s.refByKyle = true; if (once(c, "k_info")) K(c, "kyle_ref", { text: REF }); },
  accept_offer: (c) => { if (c.s.fileRead && !c.s.escalated) tuesdayEnding(c); },
  // "Great." / "That works." to the Tuesday offer: Kyle makes sure first (it may be sarcasm after "completed?")
  agree: (c) => { if (c.s.fileRead && !c.s.escalated && (c.s.histN ?? 0) <= 2) askBookTuesday(c); },
  intro_name: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  intro_ctx: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  intro_this_ctx: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  appreciate: (c) => { if (once(c, "k_ack")) K(c, "g_welcome"); },
  have_nice_day: (c) => { endCall(c); },
  walk_away: (c) => { endCall(c, true); },
  rude: (c) => { kyleRude(c); },
  ask_repeat: (c, slots) => { repeatLast(c, slots); },
};

/** The manager asked for before Kyle has the details or has read the file: those first. */
function kyleManagerFirst(c: Ctx) {
  if (!once(c, "k_ack")) return;
  if (!c.s.problem || !nameDone(c) || !pluggedOk(c)) K(c, "kyle_manager_first");
  else if (!c.s.fileRead) K(c, "kyle_manager_file");
}

/** "I want a refund" to Kyle: only the manager can approve it (on the history step he offers her at once). */
function kyleNoRemedy(c: Ctx, line: string) {
  if (!once(c, "k_remedy")) return;
  K(c, line);
  if (c.step === "history" && c.s.fileRead && !c.s.escalated) offerManager(c);
}

function kyleDeadline(c: Ctx, slots: any, seg: Segment) {
  const d = deadlineOf(slots, seg.tags);
  if (d === "toolong") { kApologize(c); return; }
  if (d && once(c, "k_info")) K(c, "kyle_note");
}

// ---------------------------------------------------------------------------
// Brenda

const atOffer = (c: Ctx) => !!c.s.transferred && !c.s.remedy && !c.s.accepted;

/** The offer was declined: straight to the remedy the learner already asked for, else "What would you like
 *  us to do?" (the offer step asks again). */
function afterDecline(c: Ctx) {
  if (c.s.remedy || c.s.accepted || c.s.over) return;
  c.s.declined = true;
  c.s.offerQ = false;
  if (c.s.wish === "refund" || c.s.wish === "replacement") { grant(c, c.s.wish); return; }
  if (c.s.wish === "either") askRefundOr(c);
}

/** A refusal or a complaint at Brenda's offer: one short reaction, then the remedy or her question. */
function declineWith(c: Ctx, line: string) {
  if (once(c, "b_ack")) B(c, line);
  afterDecline(c);
}

function askRefundOr(c: Ctx) {
  c.s.offerQ = false;
  B(c, "brenda_refund_or");
  c.expect({
    id: "refund_or", expects: ["ask_refund", "ask_replacement", "either_ctx", "refund_or"], hints: ["offer"],
    suggest: [{ lt: "Pasirinkti: grąžinti pinigus ar pakeisti šaldytuvą", hint: "offer" }],
    on: {
      ask_refund: (cc) => { grant(cc, "refund"); }, ask_replacement: (cc) => { grant(cc, "replacement"); },
      // "Either / whichever is faster / a refund or a replacement": the new fridge
      either_ctx: (cc) => { grant(cc, "replacement"); }, refund_or: (cc) => { grant(cc, "replacement"); },
    },
    yes: (cc) => { askRefundOr(cc); }, no: (cc) => { askRefundOr(cc); },
    ask: (cc) => B(cc, "brenda_refund_or"),
  });
}

/** Brenda approves a refund or a replacement (a change of mind switches it). */
function grant(c: Ctx, kind: "refund" | "replacement") {
  if (c.s.over) return;
  if (c.s.remedy === kind) { if (once(c, "b_ack")) B(c, "brenda_ok"); return; }
  if (!once(c, "grant")) return;
  const switching = !!c.s.remedy;
  c.s.remedy = kind;
  c.s.wish = kind;
  c.s.accepted = undefined;
  c.s.offerClosed = false;
  c.s.confirmed = false;
  c.s.offerQ = false;
  B(c, kind === "refund" ? "brenda_refund_ok" : "brenda_replace_ok");
  if (!switching) B(c, "brenda_pickup");
  B(c, kind === "refund" ? "brenda_refund_time" : "brenda_timeline");
  turn(c).timeline = true;
  if (c.s.writingPending) c.s.writing = true;
  if (deadlineSet(c)) {
    if (c.s.asap) { B(c, "brenda_lets_say"); dayLine(c, c.s.deadline); }
    else { B(c, "brenda_deadline_ok", { X: c.s.deadline }); dayLine(c, c.s.deadline); }
  }
}

function dayLine(c: Ctx, day: string) {
  B(c, c.s.remedy === "refund" ? "brenda_refund_day" : "brenda_delivery_day", { X: day });
}

function acceptOffer(c: Ctx) {
  if (c.s.remedy || c.s.accepted || c.s.over) return;
  // "I'll take the coupon, but I want a refund": the remedy request in the same breath wins
  if (REMEDY_WORDS.test(heard(c))) return;
  c.s.accepted = c.s.offerKind;
  c.s.offerQ = false;
  B(c, c.s.offerKind === "coupon" ? "brenda_partial" : "brenda_partial_visit");
  B(c, "brenda_anything");
  expectAnything(c);
}

/** After the coupon or the visit was taken: "Can I help you with anything else?" A refund or a replacement
 *  asked for now still works; "No, that's all" leaves it at the coupon (the reference number, then goodbye). */
function expectAnything(c: Ctx) {
  c.expect({
    id: "anything", optional: true, expects: ["ask_refund", "ask_replacement", "refund_or", "thats_all", "ask_reference", "ask_writing"], hints: ["offer", "closing"],
    suggest: [{ lt: "Vis dėlto paprašyti grąžinti pinigus arba pakeisti šaldytuvą", hint: "offer" }, { lt: "Pasakyti, kad tai viskas", hint: "closing" }],
    on: {
      ask_refund: (cc) => { grant(cc, "refund"); }, ask_replacement: (cc) => { grant(cc, "replacement"); }, refund_or: (cc) => { askRefundOr(cc); },
      thats_all: (cc) => { closeOffer(cc); }, g_thanks: (cc) => { closeOffer(cc); },
      ask_reference: (cc) => { closeOffer(cc); brendaRef(cc); },
      ask_writing: (cc) => { if (once(cc, "b_info")) B(cc, "brenda_writing_ok"); closeOffer(cc); },
    },
    yes: (cc) => { B(cc, "g_yes_what"); expectAnything(cc); },
    no: (cc) => { closeOffer(cc); },
  });
}
function closeOffer(c: Ctx) { if (c.s.accepted) c.s.offerClosed = true; }

/** "What day did you have in mind?" */
function expectWhichDay(c: Ctx) {
  c.expect({
    id: "which_day", expects: ["set_deadline", "deadline_ctx"], hints: ["deadline"],
    suggest: [{ lt: "Pasakyti dieną (pvz., iki penktadienio)", hint: "deadline" }],
    on: {
      set_deadline: (cc, sl, sg) => { brendaDeadline(cc, sl, sg); },
      deadline_ctx: (cc, sl, sg) => { brendaDeadline(cc, sl, sg); },
    },
    // no particular day: Brenda proposes Friday
    yes: (cc) => { letsSayFriday(cc); }, no: (cc) => { letsSayFriday(cc); },
    ask: (cc) => B(cc, "brenda_which_day"),
  });
}

function letsSayFriday(c: Ctx) {
  c.s.deadline = "friday";
  c.s.asap = true;
  c.s.confirmed = false;
  B(c, "brenda_lets_say");
  dayLine(c, "friday");
}

/** A deadline told to Brenda. Before the remedy it is kept for later (and at the offer it says no to it). */
function brendaDeadline(c: Ctx, slots: any, seg: Segment) {
  const d = deadlineOf(slots, seg.tags);
  if (!d) return;
  if (!c.s.remedy) {
    if (d !== "toolong") { c.s.deadline = d === "asap" ? "friday" : d; c.s.asap = d === "asap"; }
    if (atOffer(c)) declineWith(c, "brenda_decline_ack");
    return;
  }
  if (d === "toolong") { if (once(c, "b_ack")) { B(c, "brenda_which_day"); expectWhichDay(c); } return; }
  if (!once(c, "b_day")) return;
  if (d === "asap") { letsSayFriday(c); return; }
  if (c.s.deadline === d) { B(c, "brenda_ok"); return; }
  c.s.deadline = d;
  c.s.asap = false;
  c.s.confirmed = false;
  B(c, "brenda_deadline_ok", { X: d });
  dayLine(c, d);
}

function brendaWriting(c: Ctx) {
  if (!c.s.remedy) { c.s.writingPending = true; if (once(c, "b_info")) B(c, "brenda_writing_ok"); return; }
  c.s.writing = true;
  // "Yes, that's fine. Can I have that in writing?" to "10 to 14 business days": the timeline is accepted too
  if (c.step === "deadline" && !c.s.deadline && YES_START.test(heard(c))) c.s.deadline = "accepted";
  if (c.step === "confirm") c.s.confirmed = true;
  if (once(c, "b_info")) B(c, "brenda_writing_ok");
}

/** Brenda gives the reference number (and listens for the read-back). */
function giveRef(c: Ctx, asked = false) {
  if (!once(c, "b_ref")) return;
  c.s.ref = true;
  B(c, asked ? "brenda_ref_asked" : "brenda_ref", { text: REF });
  c.expect({
    id: "readback", optional: true, expects: ["ref_readback", "readback_unknown", "ask_repeat"], hints: ["reference", "g_clarify"],
    suggest: [{ lt: "Pakartoti numerį", hint: "reference" }, { lt: "Paprašyti pakartoti", hint: "g_clarify" }],
    on: {
      ref_readback: (cc) => { if (once(cc, "b_ack")) B(cc, "brenda_ref_correct"); },
      readback_unknown: (cc, sl) => { readBack(cc, sl); },
      ask_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
      g_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
    },
    yes: () => { /* "Okay." – the call goes on */ }, no: () => { /* nothing to add */ },
  });
}
function reExpectReadback(c: Ctx) {
  c.expect({
    id: "readback", optional: true, expects: ["ref_readback", "readback_unknown", "ask_repeat"], hints: ["reference", "g_clarify"],
    suggest: [{ lt: "Pakartoti numerį", hint: "reference" }],
    on: {
      ref_readback: (cc) => { if (once(cc, "b_ack")) B(cc, "brenda_ref_correct"); },
      readback_unknown: (cc, sl) => { readBack(cc, sl); },
      ask_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
      g_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
    },
    yes: () => {}, no: () => {},
  });
}
/** "H H 4 4 7 2?" – a wrong number gets the number again. */
function readBack(c: Ctx, slots: any) {
  const digits = String(slots?.digits ?? "").replace(/\D/g, "");
  if (digits === "4471") { if (once(c, "b_ack")) B(c, "brenda_ref_correct"); return; }
  B(c, "brenda_ref_repeat", { text: REF });
  reExpectReadback(c);
}

/** "Could I have a reference number?" to Brenda (also when Kyle already gave it: she says it herself once). */
function brendaRef(c: Ctx) {
  if (!c.s.ref || (c.s.refByKyle && !c.s.refByBrenda)) { c.s.refByBrenda = true; giveRef(c, true); return; }
  if (once(c, "b_ref")) B(c, "brenda_ref_repeat", { text: REF });
}

function brendaRude(c: Ctx) {
  c.s.rudeB = (c.s.rudeB ?? 0) + 1;
  if (once(c, "b_ack")) B(c, c.s.rudeB === 1 ? "brenda_rude" : "brenda_rude2");
}

/** Brenda's reaction to each intent (after the transfer). */
const BRENDA: Record<string, (c: Ctx, slots: any, seg: Segment) => void> = {
  complain_open: (c) => { if (atOffer(c)) declineWith(c, "brenda_third_ack"); else if (once(c, "b_ack")) B(c, "brenda_third_ack"); },
  fridge_broke: (c) => { if (atOffer(c)) declineWith(c, "brenda_third_ack"); else if (once(c, "b_ack")) B(c, "brenda_third_ack"); },
  no_show: (c) => { if (atOffer(c)) declineWith(c, "brenda_day_off"); else if (once(c, "b_ack")) B(c, "brenda_third_ack"); },
  disbelief: (c) => { if (atOffer(c)) declineWith(c, "brenda_decline_ack"); },
  third_time: (c) => { if (atOffer(c)) declineWith(c, "brenda_third_ack"); else if (once(c, "b_ack")) B(c, "brenda_third_ack"); },
  not_good_enough: (c, slots, seg) => {
    if (atOffer(c)) { declineWith(c, "brenda_decline_ack"); return; }
    // "That's not good enough" to "10 to 14 business days": too long
    if (c.s.remedy && c.step === "deadline") { brendaDeadline(c, {}, { ...seg, tags: [...seg.tags, "toolong"] }); return; }
    if (once(c, "b_ack")) B(c, "brenda_decline_ack");
  },
  // "Wednesday doesn't work. I already took a day off, and nobody came.": the day off gets the answer
  decline_offer: (c) => { if (atOffer(c)) declineWith(c, DAY_OFF.test(heard(c)) ? "brenda_day_off" : "brenda_decline_ack"); },
  ask_manager: (c) => { if (atOffer(c)) declineWith(c, "brenda_is_manager"); else if (once(c, "b_ack")) B(c, "brenda_is_manager"); },
  further: (c) => { if (atOffer(c)) declineWith(c, "brenda_further"); else if (once(c, "b_ack")) B(c, "brenda_further"); },
  accept_offer: (c) => { if (atOffer(c) && c.s.offerQ) acceptOffer(c); },
  agree: (c) => { brendaYes(c); },
  ask_refund: (c, slots, seg) => { deadlineFact(c, slots, seg); grant(c, "refund"); },
  ask_replacement: (c, slots, seg) => { deadlineFact(c, slots, seg); grant(c, "replacement"); },
  refund_or: (c) => { if (!c.s.remedy) askRefundOr(c); },
  either_ctx: (c) => { if (!c.s.remedy) grant(c, "replacement"); },
  not_remedy: (c) => { if (!c.s.remedy && once(c, "b_ack")) askRefundOr(c); },
  set_deadline: (c, slots, seg) => { brendaDeadline(c, slots, seg); },
  deadline_ctx: (c, slots, seg) => { brendaDeadline(c, slots, seg); },
  ask_writing: (c) => { brendaWriting(c); },
  ask_reference: (c) => { brendaRef(c); },
  pen_ready: (c) => { if (c.step === "reference" && !c.s.ref) giveRef(c); },
  no_pen: (c) => { if (c.step === "reference" && !c.s.ref) { B(c, "brenda_no_pen"); giveRef(c); } },
  pen_wait: (c) => { if (c.step === "reference" && !c.s.ref) { if (once(c, "b_wait")) B(c, "g_take_time"); c.hold(); } },
  ref_readback: (c) => { if (c.s.ref && once(c, "b_ack")) B(c, "brenda_ref_correct"); },
  readback_unknown: (c, slots) => { if (c.s.ref) readBack(c, slots); },
  appreciate: (c) => {
    if (c.step === "confirm" && !c.s.confirmed) { c.s.confirmed = true; if (once(c, "b_ack")) B(c, "brenda_ok"); return; }
    if (once(c, "b_ack")) B(c, "brenda_appreciate_reply");
  },
  thats_all: () => { /* answered by the "anything else" and closing questions */ },
  ask_timeline: (c) => {
    if (!c.s.remedy) return;
    if (once(c, "b_info")) B(c, c.s.remedy === "refund" ? "brenda_refund_time" : "brenda_timeline");
    if (deadlineSet(c)) dayLine(c, c.s.deadline);
  },
  ask_pickup: (c) => { if (c.s.remedy && once(c, "b_info")) B(c, "brenda_pickup_yes"); },
  have_nice_day: (c) => { endCall(c); },
  walk_away: (c) => { endCall(c, true); },
  rude: (c) => { brendaRude(c); },
  ask_repeat: (c, slots) => { repeatLast(c, slots); },
};

/** "Yes" / "That works" to Brenda: what it agrees to depends on her last question. */
function brendaYes(c: Ctx) {
  if (atOffer(c)) { if (c.s.offerQ) acceptOffer(c); return; }
  if (!c.s.remedy) return;
  if (c.step === "deadline" && !c.s.deadline) { c.s.deadline = "accepted"; if (!ASKS_WRITING.test(heard(c)) && once(c, "b_ack")) B(c, "brenda_ok"); return; }
  if (c.step === "confirm" && !c.s.confirmed) { c.s.confirmed = true; if (!ASKS_WRITING.test(heard(c)) && once(c, "b_ack")) B(c, "brenda_ok"); return; }
  if (c.step === "reference" && !c.s.ref) giveRef(c);
}

/** "Could you repeat that?": the reference number again if it was just said, else the last turn. */
function repeatLast(c: Ctx, slots: any) {
  if (c.s.ref && c.s.transferred && c.step === "reference") { B(c, "brenda_ref_repeat", { text: REF }); c.hold(); return; }
  GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots);
}

// ---------------------------------------------------------------------------
// One handler per intent: facts first, then the phase decides (the transfer and the plugged-in question take
// any answer; Kyle before the transfer, Brenda after it).

const ENDING_INTENTS = new Set(["walk_away", "have_nice_day"]);
function handle(intent: string) {
  return (c: Ctx, slots: any, seg: Segment) => {
    if (c.s.over) return;
    recordFacts(c, intent, slots, seg);
    if (!ENDING_INTENTS.has(intent)) {
      if (atTransfer(c)) {
        transferNow(c, intent === "can_hold" && seg.tags.includes("allday") ? "allday" : intent === "cant_hold" || intent === "rude" ? "no" : "yes");
        return;
      }
      if (atPlugged(c)) { if (intent === "rude") c.s.rudeK = (c.s.rudeK ?? 0) + 1; pluggedAnswered(c); return; }
    }
    const h = (c.s.transferred ? BRENDA : KYLE)[intent];
    if (h) h(c, slots, seg);
  };
}

const INTENT_IDS = [
  "complain_open", "fridge_broke", "no_show", "disbelief", "third_time", "not_good_enough", "ask_manager", "further", "plugged_yes",
  "intro_name", "intro_ctx", "intro_this_ctx", "can_hold", "cant_hold", "decline_offer", "accept_offer", "agree", "ask_refund",
  "ask_replacement", "refund_or", "either_ctx", "not_remedy", "set_deadline", "deadline_ctx", "ask_writing", "ask_reference",
  "pen_ready", "no_pen", "pen_wait", "ref_readback", "readback_unknown", "appreciate", "thats_all", "have_nice_day", "walk_away",
  "rude", "ask_repeat", "ask_timeline", "ask_pickup", "no_manager",
];

// Automatic answers the simulations give at moments that come on some seeds only (the plugged-in twist) or
// that a script doesn't answer itself.
const AUTO: Record<string, string> = {
  plugged: "Yes, I've already checked that.", name: "It's Tomas Mikalauskas.",
  offer_manager: "Yes, please.", book_tuesday: "No, thank you.", transfer: "Sure, I can hold.", refund_or: "A refund, please.",
  anything: "No, that's all.", which_day: "By Friday.", reference: "Yes, go ahead.",
};

// ---------------------------------------------------------------------------

export const complaint: SituationDef = {
  id: "p26-complaint",
  song: "P26",
  songTitle: "I'd Like to Make a Complaint",
  title: { en: "I'd Like to Make a Complaint", lt: "Norėčiau pateikti skundą" },
  topic: { en: "A formal complaint on the phone", lt: "Skundas telefonu" },
  chapter: 8,
  order: 2,
  location: "phone",
  npc: "kyle",
  npcs: ["brenda"],
  mode: "phone",
  goal: "Mandagiai, bet tvirtai pateik skundą ir pasiek, kad tau grąžintų pinigus arba pakeistų šaldytuvą.",
  intro: "Prieš tris savaites nusipirkai naują šaldytuvą su prašmatniu ekranu, o praėjusį antradienį jis paniūniavo melodiją ir nutilo. Meistras turėjo atvykti jau du kartus, bet taip ir neatvyko. Skambini į „Harbor Home“ jau trečią kartą – kalbėk mandagiai, bet nenusileisk.",
  entities: { dday: DAYS },

  grammar: {
    macros: {
      fr: "[new | brand new] (fridge | refrigerator | freezer)",
      tech: "(technician | repairman | repair man | repair guy | repair person | service technician | handyman | guy | engineer #tip:uk_engineer)",
      visit: "(visit | appointment | repair | repair visit | technician visit)",
      mgr: "(manager | supervisor | boss | superior | someone senior | someone in charge | the person in charge)",
      when: "[since | from] (last tuesday | on tuesday | yesterday | last week | a week ago | {number} days ago | a few days ago | {day} | this morning | last night)",
      for_days: "[already] [for] ({number} | a few | two | three) (days | weeks) [already | now]",
      ago: "({number} (days | weeks | months) ago | a (week | month) ago | a few (days | weeks) ago | last (week | month) | recently | in (june | july | august | september))",
      deadl: "((by | before | no later than) ({day} | the end of (the | this) week #endweek) | {day} at the latest)",
      refund: "([a] [full] refund | my money back | (all | the whole amount of) my money back | my money)",
      newone: "(a replacement | a new one | a new @fr | another @fr | a different @fr | a new model | a brand new one)",
      refnum: "(4471 | 4 4 7 1 | four four seven one | forty four seventy one | 44 71)",
      ref: "(h h | hh | double h | h h dash) @refnum",
      problem_of: "(my @fr | your service | the service | a product | an order | my order | a repair | the repair | your store)",
    },
    slots: {},
  },

  intents: {
    // --- the complaint and what happened -----------------------------------------------------
    complain_open: { patterns: [
      "i would like to make a [formal] complaint [about @problem_of] #h:make_complaint",
      "i (want | need) to make a [formal] complaint [about @problem_of]",
      "i would like to (complain | file a complaint | lodge a complaint | register a complaint) [about @problem_of]",
      "i (want | need) to complain [about @problem_of]",
      "i [would like to | want to] (file | lodge | submit) a [formal] complaint",
      "i (have | have got) a complaint [about @problem_of]",
      "i am calling (to complain | to make a complaint | about a problem | about a complaint) [about @problem_of]",
      // "I'm calling because my fridge stopped working": the reason is its own piece
      "i am calling because",
      "i am calling (about | regarding) (my | a | the | our) (@fr | order | repair | delivery | problem) #h:calling_about",
      "i am calling (about | regarding) (my | a | the) @fr (that | which) i bought (from you | here | at harbor home) [@ago]",
      "i am (phoning | ringing #tip:uk_ringing) (about | regarding) (my | a | the) (@fr | problem | repair | order)",
      "i am (phoning | ringing #tip:uk_ringing) (to complain | to make a complaint)",
      "i am not (happy | satisfied | pleased) with (my @fr | your service | the service | the @fr | my order)",
      "i (have | have got) a problem [with (my | a | the) (@fr | order)]",
      "i need help with (my | the) (@fr | order)",
      "there is a problem with (my | the) (@fr | order)",
      "[it is | this is] about my @fr",
      "(this is | it is) [about] a complaint",
      "i want to (give | submit | write | send | say) a complaint #tip:give_complaint",
      "i (want | would like) to (give | submit | write | make) a (reclamation | pretension) #tip:give_complaint",
      "i (have | want to make | would like to make) a (reclamation | pretension) #tip:give_complaint",
      "i am calling (about | regarding) (my | a) (reclamation | pretension) #tip:give_complaint",
      "i would like to (make | file) a [warranty] claim [for my @fr]",
      "i (want | would like) to report a (problem | broken @fr) [with my @fr]",
    ] },
    fridge_broke: { patterns: [
      "my @fr (stopped | has stopped) working [@when] #h:fridge_stopped",
      "(it | the @fr) [just] (stopped | has stopped) working [after ({number} | a few | two | three) (days | weeks)] [@when]",
      "(my | the) @fr (does not | is not | will not) (work | working | cool | cooling | get cold | keep (things | food | my food) cold) [properly | well | right] [anymore | at all] [@when | @for_days]",
      "i have a broken @fr",
      "(my | the) @fr (broke | broke down | is broken | died | is dead | stopped | just stopped | went quiet | went still | went silent | is not cold | is warm) [anymore] [@when]",
      "(the | my) @fr (was | is) [already] broken [@when]",
      "it is (broken | dead | not cold | not working | warm) [@when]",
      "it (broke | broke down | died | stopped | stopped working | went quiet | went still) [after (only | just)? ({number} | a few | two | three) (days | weeks)] [@when]",
      "it is not working (already | for) {number} (days | weeks) #tip:already_days",
      "it (does not | is not) (work | working) already {number} (days | weeks) #tip:already_days",
      "it has not (been working | worked | been cold) (for | since) ({number} days | {number} weeks | a week | {day} | last week | last tuesday)",
      "it has been broken (for | since) ({number} days | a week | {day} | last week | last tuesday)",
      "(all my | my | the) (food | ice cream | milk | meat) (went bad | is ruined | melted | spoiled | went off | is spoiled) #h:food_spoiled",
      "my ice cream (melted | turned into soup | is soup)",
      "i bought (it | a @fr | the @fr) [from you | here | at harbor home] @ago #h:bought_ago",
      "i bought a @fr (from you | at harbor home | from harbor home | here) [@ago] [and it (broke | stopped working | died | is not working)]",
      "it (hummed | played) a (song | tune | melody) and (stopped | went quiet | died | went still)",
      "the (screen | display) (works | is on | still works | still says good morning) but (it | the @fr) (is not | does not) (cold | cooling | cool | working | work)",
    ] },
    no_show: { patterns: [
      "(the | your) @tech never (came | showed up | arrived | turned up | called) #h:tech_never",
      "(nobody | no one) (came | showed up | arrived | turned up | ever came) [to (fix | repair | look at | check) it] [@when] #h:nobody_came",
      "(nobody | no one) came [and] i waited all day #h:nobody_came",
      "i waited all day [and | but] (nobody | no one) (came | showed up)",
      "i [already] took a day off [work | from work] [and | but] (nobody | no one) (came | showed up) #h:day_off #dayoff",
      "i [already] took a day off [work | from work] #dayoff",
      "i (stayed | was) (home | at home) all day [and | but] (nobody | no one) came",
      "the (@visit | appointment) (never happened | did not happen | was cancelled | was canceled)",
      "(the | your) @tech did not (come | show up | arrive | call)",
      "(a | the) @tech was supposed to come [on {day} | {day} | yesterday | last week | by ten]",
      "(you | they) (said | promised) (someone | a @tech | the @tech) would come [on {day} | by ten | yesterday] [but (nobody | no one) came]",
      "nobody (fixed | repaired | looked at | checked) it",
      "(he | they | she) never (came | showed up)",
      "(nobody | no one) has come [yet]",
      // "That's not true, nobody came." (one piece: after a negation the engine won't start a new one with "nobody")
      "(that is | it is | this is) not true (nobody | no one) (came | showed up | was here | ever came)",
      "i have been waiting for the @tech [for] (two weeks | a week | days)",
      "(he | they) did not (come | show up)",
      "i waited for (the | a) @tech [all day]",
    ] },
    // Kyle's file says the missed visit was "completed"
    disbelief: { patterns: [
      "are you serious", "completed", "seriously", "(a coupon | a mug | a coupon and a mug) [seriously | really]", "(completed | it was completed) (really | seriously)", "really completed", "what do you mean [it was] completed",
      "(that is | it is | this is) not true", "that can not be (right | true)", "(your | the) (file | system | computer) is wrong", "(it is | that is) a mistake",
      "(it | the visit) was not completed", "(nobody | no one) completed (it | anything)", "that is impossible", "how (can | could) it be completed",
    ] },
    third_time: { patterns: [
      "this is the third time i have called #h:third_time",
      "(this | it) is (the | my) third (time | call) [calling | today | this week]",
      "(this | it) is the third time i have (called | phoned | rung #tip:uk_ringing)",
      "(this | it) is the third time (i call | i am calling | i called) #tip:third_time",
      "(it is | is) [the] third time i (call | am calling | called) #tip:third_time",
      "(this | it) is [already] my third call [about this]",
      "i have [already] called (three times | twice | two times | before | many times | so many times) [already] [about this]",
      "i [already] called (three times | twice | two times | before | last week | on thursday | on monday) [and (on thursday | on monday)] [already] [about this]",
      "i called on {day} and [on] {day}",
      "this is not the first time i [have] called",
      "i [have] called you before [about this]",
      "i am calling again [about this]",
      "(i | we) (had | have had) (this | the same) conversation [before | twice | already]",
      "i [already] call (three times | third time | the third time) #tip:third_time",
      "i called you (three | 3) times [already]",
      "[this is the] third time",
      "(it is | this is) my third time calling",
      "i keep calling [and nothing happens]",
    ] },
    not_good_enough: { patterns: [
      "i am afraid (that is | this is | it is) not good enough #h:not_good",
      "(that | this | it) is not good enough [for me]",
      "(that | this) is not (acceptable | okay | fine | right) [for me]",
      "(that | this) (does not | will not) work for me",
      "i know (it is | this is) not your fault #h:not_your_fault",
      "i know (it is | this is) not your fault but this is the third time i have called #third",
      "i (can not | do not want to) wait (until | till) [next] {day}",
      "[next] {day} is too late",
      "i do not want (another | a new | one more) (@visit | appointment | @tech)",
      "i do not want to wait (again | another week | any longer | anymore)",
      "i have (waited | been waiting) (long enough | too long | for weeks | for two weeks)",
      "i [already] waited (two weeks | a week | long enough | too long | for weeks | for two weeks)",
      "[tuesday] no way",
      "what else (can you (offer | do) | do you have)",
      "i have been patient [for] (way)? too long",
      "i have been patient (long enough | for weeks)",
      "i am (very | really | so)? (disappointed | frustrated | upset | fed up)",
      "i am not (happy | satisfied) with (that | this)",
      "that is (unacceptable | not enough | not fair)",
      "(that is | it is) too late",
      "is that (all | the best) you can do",
    ] },
    ask_manager: { patterns: [
      "could i speak to your manager #h:manager",
      "(could | can | may) i (speak | talk) (to | with) (your | a | the) @mgr",
      "i would like to (speak | talk) (to | with) (your | a | the) @mgr",
      "(could | can | would) you (put me through to | transfer me to | connect me (to | with) | get) (your | a | the) @mgr",
      "is (your | a | the) @mgr available",
      "is there a @mgr i (could | can) (speak | talk) (to | with)",
      "is there (someone | anyone | somebody) (else | senior | in charge | higher up) i (could | can) (speak | talk) (to | with)",
      "(could | can) i (speak | talk) (to | with) (someone | somebody | anyone) (else | senior | in charge | higher up)",
      "let me (speak | talk) (to | with) (your | a | the) @mgr #tip:blunt_manager",
      "who (can | could) (help me | decide | approve (a refund | it))",
      "i would like to (speak | talk) to (someone | somebody) who can (help | decide | make a decision | approve a refund | help me)",
      "i would like to escalate (this | this complaint | this issue | it)",
      "(could | can) (we | you) escalate (this | it)",
      "then (could | can) i (speak | talk) to (your | the) @mgr [then | instead]",
      "(could | can) i (speak | talk) to (your | the) @mgr (then | instead)",
      "who is your @mgr",
      "[yes] (put me through | transfer me | connect me) [to (her | your @mgr | the @mgr)]",
      "(i would like | i want) to (speak | talk) (to | with) her",
      "i want to (speak | talk) (to | with) (your | a | the) @mgr #tip:blunt_manager",
      "(give me | get me | put me on with | bring me) (your | a | the) @mgr #tip:blunt_manager",
      "i (need | demand) [to speak to | to talk to] (your | a | the) @mgr [now | right now] #tip:blunt_manager",
      "[your] @mgr (now | right now) #tip:blunt_manager",
      "call (your | the) @mgr #tip:blunt_manager",
      "(the | your) @mgr #tip:blunt_manager",
    ] },
    // "No, I don't want to speak to your manager" (never a request for the manager)
    no_manager: { patterns: ["[no] i do not (want | need) to (speak | talk) (to | with) (your | the | a) @mgr", "[no] (not | no) (the | your) @mgr"] },
    further: { patterns: [
      "otherwise i will be taking this further #h:further",
      "i will be taking this further",
      "(otherwise | or) i will (take this further | go higher | take it further | take this higher)",
      "i will take (this | it) (further | higher)",
      "i will (call | write to | email | contact) (the ceo | your ceo | head office | your head office | the head office | corporate)",
      "i will (contact | go to | call) (a lawyer | my lawyer | consumer protection | the better business bureau)",
      "i will (leave | write | post) a (bad | negative | one star) review #tip:review_threat",
    ] },

    // --- Kyle's script ------------------------------------------------------------------------
    plugged_yes: { patterns: [
      "yes it is plugged in #h:plugged_yes",
      "[yes] (of course | sure | definitely) it is [plugged in]",
      "[yes] it is (plugged in | on | connected | in the outlet | in the socket | plugged in and on)",
      "[yes] i have already (checked | tried) (that | it | everything) #h:checked",
      "[yes] i [already] (checked | tried) (that | it | everything) [already | twice]",
      "[yes] i (turned | switched) it off and on [again] [twice | three times]",
      "[yes] i (unplugged | restarted) it [and plugged it back in] [already | twice]",
      "[yes] the (screen | light | display) is on [but it is not cold]",
      "[yes] it [still] says good morning [sunshine] [but it is not cold]",
      "the plug is in",
    ] },
    intro_name: { patterns: [
      "my name is {name} #h:my_name",
      "my [first] name is {name} and my (surname | last name | family name) is {surname:name}",
      "my (surname | last name | family name) is {name}",
      "{name} is my name", "the name is {name}", "(you can | please) call me {name}",
    ] },
    intro_ctx: { patterns: ["it is {name} #h:its_name", "i am {name}", "{name}", "name is {name}", "you are speaking (with | to) {name}"] },
    // "Hi, this is Tomas Mikalauskas." (a phone opener)
    intro_this_ctx: { patterns: ["this is {name} [calling | speaking]", "{name} (here | speaking)"] },
    can_hold: { patterns: [
      "[that is fine | sure | no problem | okay] i have got all day #h:all_day #allday",
      "[that is fine | sure | no problem | okay] i have (all day | time | plenty of time | got time | got plenty of time) #allday",
      "[sure | yes | okay | of course] i can (hold | wait) [as long as you need] #h:can_hold",
      "[sure | yes | okay] i will (hold | wait)",
      "(no problem | that is fine) i (can | will) (hold | wait)",
      "[sure] take your time",
      "i am not in a hurry",
      "i (have been | was) (holding | waiting) for (an hour | ages | so long | 47 minutes | forty seven minutes) [already] #allday",
    ] },
    cant_hold: { patterns: [
      "[no] i (can not | do not want to) (hold | wait) [any longer | anymore | long | again]",
      "(please | could you) (be quick | hurry)",
      "i do not have much time",
      "not (again | another hold)",
    ] },

    // --- Brenda's offer ------------------------------------------------------------------------
    decline_offer: { patterns: [
      "[i am afraid] a coupon (is not | is not really) enough #h:decline",
      "(that | it | a coupon | a mug | the coupon | the mug | a coupon and a mug | another visit | a visit | wednesday) (is not | does not | will not) (enough | help | fix (my | the) @fr | solve (my | the) problem | work for me)",
      "you can keep (the | your) (coupon | mug | coupon and (the | your) mug | mugs) #h:keep_mug",
      "keep (your | the) [little] (coupon | mug) [brenda] [and [keep] (your | the) [little] (coupon | mug)]",
      "i appreciate (it | that | the offer | your offer) but (no | no thanks | no thank you | that is not enough | i have to say no)",
      "i do not (want | need) (a | your | the | any | another) (coupon | mug | mugs | visit | appointment | @tech)",
      "that is not what i (want | need | asked for)",
      "[wednesday] i (can not | do not want to | will not) take another day off [work | from work]",
      "i am not interested in (a | the | your) (coupon | mug | visit | coupon or a mug)",
      "(wednesday | that day | that time) (does not | will not | is not going to) work [for me]",
      "(wednesday | that | that day) is not (good | okay | possible | convenient) [for me]",
      "i (can not | will not) wait (until | till) wednesday",
      "i do not want (it | that)",
      "a (coupon | mug) is not a solution",
      "i (do not | will not) accept (it | that | the coupon | the offer)",
      "i (will not | do not want to) take (it | that | the coupon | the mug | the visit | the appointment)",
      "i (have | already have) (enough | plenty of) mugs",
    ] },
    accept_offer: { patterns: [
      "i will take (it | that | the coupon | the mug | the visit | wednesday | the appointment | tuesday | next tuesday)",
      "i accept (it | that | the coupon | the offer | your offer)",
      "(wednesday | the coupon | the visit | the mug | the appointment | that offer | tuesday | next tuesday) (is | sounds | would be) (fine | good | okay | great | perfect)",
      "(okay | fine | sure | all right) (wednesday | next tuesday | tuesday) [then]",
      "i love mugs",
      "book (it | me | the visit) (for | on) [next] (tuesday | wednesday)",
      "(okay | yes | sure) book (it | the visit | the appointment)",
      "[yes] (send | give) me the coupon",
      "(the coupon | a coupon) would be (nice | great | lovely)",
      "(wednesday | tuesday) works [for me]",
      "i (can | will) take (a | another) day off",
    ] },
    agree: { patterns: [
      "[yes] that works [for me] #h:works",
      "[yes] (that | it) (sounds | is) (good | great | perfect | fine | okay)",
      "[okay] (two weeks | ten to fourteen days | 10 to 14 days | fourteen days | that) is (fine | okay)",
      "[yes] that is (fine | okay) [with me]",
      "(perfect | great | wonderful | excellent | good | fine | brilliant)",
      "that (would be | sounds) (great | perfect | wonderful | fine)",
      "sounds (good | great | perfect)",
      "(fine | okay) (with | by) me",
      "deal",
      "[yes] i can wait (two weeks | ten to fourteen days | that long)",
    ] },
    ask_refund: { patterns: [
      "i expect a full refund [@deadl] #h:full_refund",
      "i would like a [full] refund [@deadl]",
      "(could | can | may) i (have | get) a [full] refund [@deadl]",
      "i (want | need | would expect | am expecting | expect) a [full] refund [@deadl]",
      "i (would like | want | need | expect) my money back [@deadl]",
      "(could | can | may) i (have | get) my money back [@deadl]",
      "(could | can | would) you refund (me | my money | the money | it | the full amount | the fridge) [@deadl]",
      "i would like (you to refund me | to return the @fr and get my money back | to get my money back)",
      "i (want | would like) to return the @fr and (get | have) my money back",
      "i (expect | would like) (all | the whole amount of) my money back",
      "(give me | return) my money [back] #tip:return_money",
      "(return | give back) (the | my) money #tip:return_money",
      "i want (to return | that you return) (the | my) money #tip:return_money",
      "@refund [@deadl]",
      "i (want | would like | need) a [full] refund not (another visit | a visit | a coupon | a mug | another appointment)",
      "(can | could | may) i return (it | the @fr) [for a [full] refund]",
      "(could | can | would) you give me a [full] refund",
      "i would like to return (it | the @fr) [for a [full] refund]",
      "(i want | i would like) to (cancel | return) (my order | the order | the purchase) [and get a refund]",
      "refund (me | my money)",
      "i [think i] deserve a [full] refund",
      // a change of mind: "Actually, could I get a refund instead?"
      "(could | can | may) i (have | get) (a [full] refund | my money back) instead [of (a new one | a replacement | the new @fr)]",
      "i would (rather | prefer) (have | get)? (a [full] refund | my money back) [instead]",
      "(a [full] refund | my money back) instead",
      "(make it | let us do | let us make it) a refund [instead]",
    ] },
    ask_replacement: { patterns: [
      "i would like a replacement [@deadl] #h:replacement",
      "i would like @newone [@deadl]",
      "(could | can) you (replace | exchange) (it | the @fr | my @fr) [for a new one] [@deadl]",
      "(could | can | may) i (get | have) @newone [@deadl]",
      "i (want | need | expect) @newone [@deadl]",
      "i would like you to (replace | exchange) it [@deadl]",
      "(replace | exchange) (it | the @fr) [@deadl]",
      "(could | can) you (change | swap) (it | the @fr) [for a new one]",
      "i want to change the @fr #tip:change_fridge",
      "@newone [@deadl]",
      "(could | can | would) you (send | give) me @newone",
      "(give me | send me) @newone #blunt",
      "i need a @fr that works",
      "i would like to exchange (it | the @fr) [for a new one]",
      // a change of mind: "Actually, could I get a new one instead?"
      "(could | can | may) i (have | get) @newone instead [of (a refund | my money back | the refund)]",
      "i would (rather | prefer) (have | get)? @newone [instead]",
      "@newone instead",
      "(make it | let us do | let us make it) a replacement [instead]",
    ] },
    refund_or: { patterns: [
      "i would like a refund or a replacement #h:refund_or",
      "(a | either a) refund or @newone",
      "(i want | i would like | i expect) (a refund | my money back) or @newone",
      "(i want | i would like | i expect) @newone or (a refund | my money back)",
      "(@newone | replace it) or (a refund | my money back | refund me)",
      "(a refund | my money back) or (a replacement | a new one) [either is fine]",
    ] },
    // "Would you prefer a refund or a replacement?" – "Either." (only then)
    either_ctx: { patterns: ["(either | either one | either is fine | whichever is faster | whatever is faster | i do not mind | i do not care which | anything that works | both are fine)"] },
    // "I don't want a refund" (never a refund)
    not_remedy: { patterns: ["i do not (want | need) (a refund | my money back | a replacement | a new one | a new @fr | money)"] },

    // --- the deadline, in writing, the reference number -------------------------------------------
    set_deadline: { patterns: [
      "i would like (this | it) (resolved | fixed | sorted | solved | done | sorted out | taken care of) by {day} [not someday] #h:by_friday",
      "i would like (this | it) (resolved | fixed | sorted | solved | done | sorted out | taken care of) @deadl",
      "i need (it | this | the @fr | a new @fr | the refund | my money | the new one) by {day} #h:need_by",
      "i need (it | this) @deadl",
      "i (need | want | would like) (it | this | the @fr) (fixed | resolved | sorted | sorted out | done | replaced | delivered | solved) (@deadl | by {day})",
      "@deadl",
      "(as soon as possible | asap | right away | immediately) #asap #h:asap",
      "(i would like it | i need it) (as soon as possible | asap | right away) #asap",
      "(two | 2) weeks is too long [i am afraid] #toolong #h:too_long",
      "a fortnight is too long [i am afraid] #toolong #tip:uk_fortnight",
      "(that | ten to fourteen days | 10 to 14 days | two weeks | fourteen days) is too long #toolong",
      "i can not wait (two | 2) weeks #toolong",
      "(could | can) you (do | deliver | make | send | bring) it (by | before | on) {day}",
      "(could | can) (it | the refund | the new @fr) (be | come | arrive) (by | before | on) {day}",
      "{day} would be (great | perfect | better | good)",
      "(within | in) (a | one | {number}) (week | days) #asap",
      "(can | could) (it | you | the delivery | the refund) be (faster | sooner | quicker) #asap",
      "(can | could) you do it (faster | sooner | quicker) #asap",
      "(sooner | faster) #asap",
      "i need (it | this | the refund | the @fr) this week #asap",
      "(that is | it is) too slow #toolong",
      "i would like (this | it) (resolved | fixed | solved | done) until {day} #tip:by_until",
      "(until | till) {day} #tip:by_until",
    ] },
    deadline_ctx: { patterns: ["[by | before] {day}"] },
    ask_writing: { patterns: [
      "can i have that in writing #h:in_writing",
      "(can | could | may) i (have | get) (that | this | it | everything) in writing",
      "(could | can | would) you (put | send) (that | it | this) in writing",
      "(could | can) you confirm (that | it | this) (in writing | by email | in an email) #h:email_confirm",
      "(could | can | would) you send me (an email | a confirmation | an email confirmation | a written confirmation | something in writing) [by email]",
      "i would like (that | it | this | a confirmation | everything) in writing",
      "(could | can) i (have | get) a [written] confirmation [by email]",
      "will i get (an email | a confirmation | something in writing)",
      "(can | could) i have (it | that) (in written form | on paper | written | in written) #tip:in_writing",
      "(can | could) you write (it | that) (on paper | to me) #tip:in_writing",
      "i (need | want) (that | it | this) in writing",
      "put (that | it) in writing",
      "in writing",
    ] },
    ask_reference: { patterns: [
      "could i have a reference number #h:ask_ref",
      "(can | could | may) i (have | get) (a | the | my) (reference | case | ticket | confirmation | claim) number",
      "what (is | was) (my | the) (reference | case | ticket | confirmation) number [again]",
      "(do i get | is there | will i get) a (reference | case | ticket | confirmation) number",
      "i (need | would like) a (reference | case | ticket) number",
      "(can | could) you give me (a | the | my) (reference | case | ticket) number",
      "(can | could) i (have | get) (the | a) (request | complaint | application) number #tip:ref_number",
      "(what is | give me) the number of (the | my) (request | complaint | application) #tip:ref_number",
      "(can | could | may) i (have | get) the number of (the | my) (request | complaint | application) #tip:ref_number",
      "[a | the] reference number",
    ] },
    pen_ready: { patterns: [
      "[yes] go ahead #h:go_ahead",
      "[yes] i (have | have got) (a pen | one | a pencil) [go ahead | i am ready]",
      "[yes] i am ready",
      "[okay] (tell me | i am listening)",
      "[okay] one (second | moment) [okay] (go ahead | ready | i am ready)",
    ] },
    no_pen: { patterns: ["[no] i do not have (a pen | one | anything to write with)", "[no] i have no pen", "no pen", "i can not write (it | that) down [now | right now]"] },
    pen_wait: { patterns: ["(let me | i will | i need to) (get | grab | find) a (pen | pencil)"] },
    ref_readback: { patterns: ["[so | okay] [that is] @ref [got it | right | correct | is that right] #h:readback", "[so | okay] [that is] @refnum [got it | right | correct | is that right]"] },
    // a read-back with other digits ("H H 4 4 7 2?"): a catch-all, so the right number always wins
    readback_unknown: { patterns: ["[so | okay] [that is] (h h | hh | double h | h h dash) {digits} [right | correct | is that right | got it]"] },
    ask_repeat: { patterns: [
      "sorry could you repeat that #h:repeat",
      "(could | can) you repeat (that | it | the number) [again]",
      "(could | can) you say (that | it | the number) again",
      "i did not (catch | get) (that | the number)",
      "what was the number [again]",
      "(could | can) you repeat the (reference | reference number)",
    ] },
    ask_timeline: { patterns: [
      "how long (will | does | is) (it | the refund | the delivery | that | this) (take | going to take)",
      "when (will | can | do) i (get | receive | see) (my money | the money | the refund | my refund | the new @fr | it | the new one)",
      "when will (it | the new @fr | the refund | the money | the new one) (come | arrive | be delivered | be here | come back)",
      "when (is | will be) the delivery",
    ] },
    ask_pickup: { patterns: [
      "(will | can | could | do) you (take | pick up | take away | collect) the old (one | @fr)",
      "what about the old (one | @fr)",
      "what (happens | do i do) (to | with) the old (one | @fr)",
    ] },

    // --- thanks, goodbye, leaving, rudeness ------------------------------------------------------
    appreciate: { patterns: [
      "i appreciate your help [i truly do] #h:appreciate",
      "i (really | truly)? appreciate (it | your help | that | everything | this | what you did) [i truly do | i really do]",
      "thank you (so much | very much)? for your help",
      "you have been (very | really | so)? helpful",
      "thank you for (sorting this out | solving this | your time | understanding | your patience | fixing this | helping me)",
      "that is (very | really)? (helpful | kind of you)",
    ] },
    thats_all: { patterns: [
      "[no] that is all #h:thats_all",
      "[no] nothing else",
      "[no] that is everything",
      "[no] i am (good | fine)",
      "[no] that will be all",
      "[no] that is it [for now]",
    ] },
    have_nice_day: { patterns: ["have a (nice | good | great | wonderful | lovely) (day | evening | one) [too] #h:nice_day", "you too [have a nice day]"] },
    walk_away: { patterns: [
      "(forget it | never mind | forget about it) [i will call back later]",
      "i will (call | ring #tip:uk_ringing) (back | again) (later | tomorrow)",
      "i (will | am going to) (go | shop | buy) (somewhere else | at another store | from another store | to another store | elsewhere)",
      "i will take my business elsewhere",
      "i do not have time for this",
      "i (am going to | will) hang up [now]",
    ] },
    rude: { patterns: [
      "you are (useless | stupid | an idiot | incompetent | terrible | the worst | a joke | ridiculous) #tip:too_harsh",
      "you people are (useless | crazy | terrible | idiots | incompetent | a joke) #tip:too_harsh",
      "(this | your company | your service | this store | harbor home) is (ridiculous | a joke | terrible | stupid | a scam | crazy | a disgrace | the worst) #tip:too_harsh",
      "(what | how) is wrong with (you | you people) #tip:too_harsh",
      "(shut up | listen to me) #tip:too_harsh",
      "are you (stupid | kidding me | crazy | deaf) #tip:too_harsh",
      "do you think i am (stupid | an idiot) #tip:too_harsh",
      "of course it is plugged in i am not (stupid | an idiot) #tip:too_harsh",
      "i am not (stupid | an idiot) #tip:too_harsh",
      "i am (so | very | really)? angry #tip:too_harsh",
      "i hate (this | your) (company | store | service) #tip:too_harsh",
      "(this is | that is) (ridiculous | crazy | insane | unbelievable) #tip:too_harsh",
      "what a joke #tip:too_harsh",
    ] },
  },

  lines: {
    // --- the recorded message (see NEEDS) ---
    hold_msg: [
      t("Your | call | is | important | to us. | Please | hold.", "Jūsų | skambutis | yra | svarbus | mums. | Prašome | palaukti.", "Jūsų skambutis mums svarbus. Prašome palaukti.",
        { flags: { 6: "“hold” on the phone = palaukti (neatsijungiant)." } }),
    ],
    hold_long: [
      t("All | our | agents | are | currently | busy. | Your | estimated | wait | time | is | 47 | minutes.",
        "Visi | mūsų | konsultantai | yra | šiuo metu | užimti. | Jūsų | numatomas | laukimo | laikas | yra | 47 | minutės.",
        "Šiuo metu visi mūsų konsultantai užimti. Numatomas laukimo laikas – 47 minutės.",
        { say: "All our agents are currently busy. Your estimated wait time is forty-seven minutes." }),
    ],

    // --- Kyle ---
    kyle_greet: [
      t("Thanks | for calling | Harbor Home, | this is | Kyle. | How | can | I | help | you | today?",
        "Ačiū, | kad skambinate | į „Harbor Home“, | čia | Kailas. | Kuo | galiu | aš | padėti | jums | šiandien?",
        "Ačiū, kad skambinate į „Harbor Home“, čia Kailas. Kuo galiu šiandien padėti?"),
      t("Hi, | you've | reached | Harbor Home. | My | name | is | Kyle. | What | can | I | do | for you | today?",
        "Sveiki, | jūs | paskambinote | į „Harbor Home“. | Mano | vardas | yra | Kailas. | Ką | galiu | aš | padaryti | jums | šiandien?",
        "Sveiki, jūs paskambinote į „Harbor Home“. Mano vardas Kailas. Kuo galiu šiandien padėti?",
        { flags: { 1: "“'ve” (have): the past tense of paskambinote (under “reached”) carries it." } }),
    ],
    kyle_greet_hold: [
      t("Thanks | for holding! | This is | Kyle | at | Harbor Home. | How | can | I | help | you | today?",
        "Ačiū, | kad palaukėte! | Čia | Kailas | iš | „Harbor Home“. | Kuo | galiu | aš | padėti | jums | šiandien?",
        "Ačiū, kad palaukėte! Čia Kailas iš „Harbor Home“. Kuo galiu šiandien padėti?"),
    ],
    kyle_ask_problem: [
      t("So, | what | seems | to be | the | problem?", "Tai, | kokia | atrodo | esanti | — | problema?", "Tai kokia problema?",
        { flags: { 2: "“seems to be” softens the question; natural Lithuanian simply asks kokia problema." } }),
      t("Okay, | I'm | here | to help. | What's | going on?", "Gerai, | aš esu | čia | kad padėčiau. | Kas | vyksta?", "Gerai, aš čia tam, kad padėčiau. Kas nutiko?",
        { flags: { 4: "“'s” (is): the progressive auxiliary has no Lithuanian word; vyksta (under “going on”) carries it." } }),
    ],
    kyle_complaint_ok: [
      t("Of course. | What's | the | problem?", "Žinoma. | Kokia yra | — | problema?", "Žinoma. Kas nutiko?"),
      t("I'm | sorry | to hear | that. | What | happened | exactly?", "Man | gaila | girdėti | tai. | Kas | nutiko | tiksliai?", "Gaila tai girdėti. Kas tiksliai nutiko?",
        { flags: { 0: F_GAILA } }),
    ],
    kyle_sorry: [
      t("Oh | no, | I'm | so | sorry | to hear | that.", "O | ne, | man | labai | gaila | girdėti | tai.", "O ne, labai gaila tai girdėti.", { flags: { 2: F_GAILA } }),
      t("That's | not | good. | I'm sorry | about | that.", "Tai | — | negerai. | Atsiprašau | dėl | to.", "Tai negerai. Atsiprašau.",
        { flags: { 1: "“not”: the ne- of negerai (under “good”) carries it." } }),
    ],
    kyle_plugged_m: [
      t("Okay. | Just | to check, | sir: | is | it | plugged in?", "Gerai. | Tik | pasitikrinti, | pone: | ar | jis | įjungtas į lizdą?",
        "Gerai. Tik pasitikrinsiu, pone: ar jis įjungtas į elektros lizdą?",
        { flags: { 4: "“is” in a yes/no question = the particle ar.", 5: "“it” = jis (šaldytuvas)." } }),
    ],
    kyle_plugged_f: [
      t("Okay. | Just | to check, | ma'am: | is | it | plugged in?", "Gerai. | Tik | pasitikrinti, | ponia: | ar | jis | įjungtas į lizdą?",
        "Gerai. Tik pasitikrinsiu, ponia: ar jis įjungtas į elektros lizdą?",
        { flags: { 4: "“is” in a yes/no question = the particle ar.", 5: "“it” = jis (šaldytuvas)." } }),
    ],
    // Kyle's script goes on (half of the time)
    kyle_off_on: [
      t("And | have | you | tried | turning | it | off | and | on | again?", "O | ar | jūs | bandėte | — | jį | išjungti | ir | įjungti | vėl?", "O ar bandėte jį išjungti ir vėl įjungti?",
        { flags: { 1: "Perfect “have” in a question = the particle ar; the past bandėte carries the tense.", 4: "“turning … off / on”: the Lithuanian verbs išjungti / įjungti (units off, on) carry turn + particle." } }),
    ],
    kyle_plugged_ok: [
      t("Okay, | just | had | to ask. | It's | on | my | script.", "Gerai, | tiesiog | turėjau | paklausti. | Tai yra | — | mano | scenarijuje.",
        "Gerai, tiesiog turėjau paklausti. Taip parašyta mano scenarijuje.", { flags: { 5: "“on”: the locative scenarijuje carries it." } }),
    ],
    kyle_ask_name: [
      t("Could | I | get | your | name, | please?", "Ar galėčiau | aš | sužinoti | jūsų | vardą, | prašau?", "Ar galėčiau sužinoti jūsų vardą?"),
      t("And | who | am | I | speaking | with?", "O | su kuo | — | aš | kalbu | [su kuo]?", "O su kuo kalbu?",
        { flags: { 2: "“am”: the continuous form has no separate Lithuanian word; kalbu carries it.", 5: "Stranded “with”: su kuo (under “who”) carries it." } }),
    ],
    kyle_name_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Thanks.", "Ačiū.", "Ačiū.")],
    kyle_file1: [
      t("Okay, | I | can | see | your | file | here.", "Gerai, | aš | — | matau | jūsų | bylą | čia.", "Gerai, matau jūsų duomenis.",
        { flags: { 2: "“can” with “see” has no Lithuanian word: matau is enough." } }),
    ],
    kyle_file2: [
      t("It says | a | technician | was | scheduled | for Monday, | between | 8 | and | 12.",
        "Čia parašyta, kad | — | meistras | buvo | numatytas | pirmadienį, | tarp | 8 | ir | 12 val.",
        "Čia parašyta, kad meistras turėjo atvykti pirmadienį, nuo 8 iki 12 valandos.",
        { say: "It says a technician was scheduled for Monday, between eight and twelve." }),
    ],
    kyle_file3: [
      t("And | it says | the | visit | was... | completed?", "Ir | čia parašyta, kad | — | vizitas | buvo... | įvykdytas?", "Ir čia parašyta, kad vizitas buvo… įvykdytas?"),
    ],
    kyle_new_visit: [
      t("I'm | so | sorry | about | that. | I | can | book | you | a | new | visit | for | next | Tuesday.",
        "Aš | labai | atsiprašau | dėl | to. | Aš | galiu | užregistruoti | jus | — | naujam | vizitui | — | kitą | antradienį.",
        "Labai atsiprašau. Galiu jus užregistruoti naujam vizitui kitą antradienį.",
        { flags: { 0: F_SORRY_AM, 12: "“for” + a day: the accusative antradienį carries it." } }),
    ],
    kyle_apologize: [
      t("I | completely | understand, | and | I | do | apologize.", "Aš | visiškai | suprantu, | ir | aš | tikrai | atsiprašau.", "Visiškai suprantu ir tikrai atsiprašau.",
        { flags: { 5: "Emphatic “do” = tikrai." } }),
      t("I | totally | get | it. | I'm | so | sorry.", "Aš | visiškai | suprantu | tai. | Man | labai | gaila.", "Visiškai suprantu. Labai apgailestauju.",
        { flags: { 4: F_GAILA } }),
    ],
    kyle_three_calls_m: [
      t("Three | calls, | wow. | I'm | really | sorry, | sir.", "Trys | skambučiai, | oho. | Aš | labai | atsiprašau, | pone.", "Trys skambučiai, oho. Labai atsiprašau, pone.",
        { flags: { 3: F_SORRY_AM } }),
    ],
    kyle_three_calls_f: [
      t("Three | calls, | wow. | I'm | really | sorry, | ma'am.", "Trys | skambučiai, | oho. | Aš | labai | atsiprašau, | ponia.", "Trys skambučiai, oho. Labai atsiprašau, ponia.",
        { flags: { 3: F_SORRY_AM } }),
    ],
    kyle_hands_tied: [
      t("Honestly, | my | hands | are | tied | here.", "Atvirai sakant, | mano | rankos | yra | surištos | čia.", "Atvirai sakant, mano rankos čia surištos."),
    ],
    kyle_earliest: [
      t("The | earliest | I | have | is | next | Tuesday.", "— | Anksčiausias laikas | kurį aš | turiu | yra | kitas | antradienis.", "Anksčiausiai galiu kitą antradienį.",
        { flags: { 1: "“earliest” = anksčiausias laikas: Lithuanian needs the noun.", 2: "Lithuanian adds kurį, the relative word English leaves out." } }),
    ],
    kyle_book_q: [
      t("So, | should | I | book | you | for | next | Tuesday?", "Tai, | ar | man | užregistruoti | jus | — | kitam | antradieniui?", "Tai ar užregistruoti jus kitam antradieniui?",
        { flags: { 1: "“should” in a question = the particle ar with the infinitive (ar man užregistruoti).", 2: "“I” = man: the dative goes with the infinitive question.", 5: "“for”: the dative kitam antradieniui carries it." } }),
    ],
    kyle_offer_manager: [
      t("Would | you | like | to speak | to | my | manager?", "Ar | jūs | norėtumėte | pakalbėti | su | mano | vadove?", "Gal norėtumėte pakalbėti su mano vadove?",
        { flags: { 0: F_WOULD_Q, 6: "“manager” = vadovė (Brenda): the instrumental vadove after su." } }),
    ],
    kyle_manager_first: [
      t("Of course. | But | first, | I | need | a | few | details.", "Žinoma. | Bet | pirmiausia, | man | reikia | — | kelių | duomenų.", "Žinoma. Bet pirmiausia man reikia kelių duomenų.",
        { flags: { 3: "“I” = man: reikia takes the dative." } }),
    ],
    kyle_manager_file: [
      t("Sure. | Let | me | just | check | your | file | first.", "Žinoma. | Leiskite | man | tik | patikrinti | jūsų | bylą | pirmiausia.", "Žinoma. Tik pirmiausia patikrinsiu jūsų bylą."),
    ],
    kyle_cant_refund: [
      t("I'm afraid | I | can't | approve | refunds. | Only | my | manager | can | do | that.",
        "Deja | aš | negaliu | patvirtinti | pinigų grąžinimo. | Tik | mano | vadovė | gali | padaryti | tai.",
        "Deja, aš negaliu patvirtinti pinigų grąžinimo. Tai gali padaryti tik mano vadovė.",
        { flags: { 4: "“refunds” = pinigų grąžinimo: the genitive after the negative verb." } }),
    ],
    kyle_cant_replace: [
      t("I'm afraid | I | can't | approve | a | replacement. | Only | my | manager | can | do | that.",
        "Deja | aš | negaliu | patvirtinti | — | šaldytuvo pakeitimo. | Tik | mano | vadovė | gali | padaryti | tai.",
        "Deja, aš negaliu patvirtinti šaldytuvo pakeitimo. Tai gali padaryti tik mano vadovė.",
        { flags: { 5: "“replacement” = šaldytuvo pakeitimo: the genitive after the negative verb." } }),
    ],
    kyle_note: [t("Okay, | I'll add | that | to | your | file.", "Gerai, | įrašysiu | tai | į | jūsų | bylą.", "Gerai, įrašysiu tai į jūsų bylą.")],
    kyle_writing: [t("You'll get | an | email | after | the | call.", "Gausite | — | el. laišką | po | — | skambučio.", "Po skambučio gausite el. laišką.")],
    kyle_ref: [
      t("Sure, | it's | the | same | one | as | before: | {$text}.", "Žinoma, | jis yra | — | tas pats | — | kaip | anksčiau: | {$text}.",
        "Žinoma, numeris tas pats kaip anksčiau: {$text}.",
        { flags: { 1: "“it's” = jis yra: jis is the number (numeris).", 4: "“one” stands for “number”: tas pats (under “same”) carries it." }, spell: "HH4471", write: REF_WRITE }),
    ],
    kyle_transfer: [
      t("Of course. | One | moment, | I'll transfer | you | to | my | manager.", "Žinoma. | Vieną | akimirką, | sujungsiu | jus | su | savo | vadove.",
        "Žinoma. Akimirką, sujungsiu jus su savo vadove.", { flags: { 5: "“to” (transfer to) = su." } }),
      t("Absolutely. | Let | me | get | my | manager | for you.", "Žinoma. | Leiskite | man | pakviesti | savo | vadovę | jums.", "Žinoma. Tuoj pakviesiu savo vadovę."),
    ],
    kyle_can_hold: [
      t("It | might | take | a | few | minutes. | Can | you | hold?", "Tai | gali | užtrukti | — | kelias | minutes. | Ar galite | jūs | palaukti?",
        "Tai gali užtrukti kelias minutes. Ar galite palaukti?"),
    ],
    kyle_hold_ok: [t("Ha. | I | hope | it | won't take | that | long.", "Cha. | Aš | tikiuosi, kad | tai | neužtruks | taip | ilgai.", "Cha. Tikiuosi, kad tiek neužtruks.")],
    kyle_thanks_hold: [t("Thank | you | for | your | patience.", "Dėkoju | jums | už | jūsų | kantrybę.", "Ačiū už kantrybę.")],
    kyle_hold_no: [t("I'll be | quick, | I | promise.", "Būsiu | greitas, | aš | pažadu.", "Būsiu greitas, pažadu.")],
    kyle_rude_m: [
      t("I | understand | you're | frustrated, | sir. | I | really | do | want | to help.", "Aš | suprantu, kad | jūs esate | susierzinęs, | pone. | Aš | tikrai | — | noriu | padėti.",
        "Suprantu, kad esate susierzinęs, pone. Aš tikrai noriu padėti.", { flags: { 7: "Emphatic “do”: tikrai (under “really”) carries it." } }),
    ],
    kyle_rude_f: [
      t("I | understand | you're | frustrated, | ma'am. | I | really | do | want | to help.", "Aš | suprantu, kad | jūs esate | susierzinusi, | ponia. | Aš | tikrai | — | noriu | padėti.",
        "Suprantu, kad esate susierzinusi, ponia. Aš tikrai noriu padėti.", { flags: { 7: "Emphatic “do”: tikrai (under “really”) carries it." } }),
    ],
    kyle_rude2: [
      t("I'm | on | your | side | here, | I | promise.", "Aš esu | — | jūsų | pusėje | čia, | aš | pažadu.", "Aš čia jūsų pusėje, pažadu.",
        { flags: { 1: "“on”: the locative pusėje carries it." } }),
    ],
    kyle_tuesday_ok: [
      t("Okay! | You're | all set | for | next | Tuesday.", "Gerai! | Jūs esate | {m:užregistruotas|f:užregistruota} | — | kitam | antradieniui.",
        "Gerai! Užregistravau jus kitam antradieniui.", { flags: { 3: "“for”: the dative kitam antradieniui carries it." } }),
    ],
    kyle_understand: [t("I | understand.", "Aš | suprantu.", "Suprantu.")],
    kyle_bye: [
      t("Thank | you | for calling | Harbor Home, | and | have | a | nice | day.", "Dėkoju | jums, | kad paskambinote | į „Harbor Home“, | ir | linkiu | — | geros | dienos.",
        "Ačiū, kad paskambinote į „Harbor Home“. Geros dienos.", { flags: { 5: F_HAVE_WISH } }),
    ],

    // --- Brenda ---
    brenda_hi: [
      t("Hi, | this is | Brenda, | the | customer | care | manager. | Kyle | told | me | about | your | fridge.",
        "Sveiki, | čia | Brenda, | — | klientų | aptarnavimo | vadovė. | Kailas | papasakojo | man | apie | jūsų | šaldytuvą.",
        "Sveiki, čia Brenda, klientų aptarnavimo vadovė. Kailas man papasakojo apie jūsų šaldytuvą.",
        { flags: { 5: "“care” in “customer care” = aptarnavimas." } }),
    ],
    brenda_hi2: [
      t("I | understand | this | hasn't been | a | great | experience.", "Aš | suprantu, kad | tai | nebuvo | — | puiki | patirtis.", "Suprantu, kad tai nebuvo pati maloniausia patirtis."),
      t("I'm | so | sorry | for | the | trouble.", "Aš | labai | atsiprašau | dėl | — | nemalonumų.", "Labai atsiprašau dėl nemalonumų.", { flags: { 0: F_SORRY_AM } }),
    ],
    brenda_before: [
      t("I | hear | you. | But | before | we | go there...", "Aš | suprantu | jus. | Bet | prieš tai, kai | mes | pereisime prie to...", "Suprantu jus. Bet prieš pereidami prie to…",
        { flags: { 1: "“hear” (I hear you) = suprantu." } }),
    ],
    brenda_offer_coupon: [
      t("As | a | thank you | for | your | patience, | I'd like | to offer | you | a | $50 | coupon...",
        "Kaip | — | padėką | už | jūsų | kantrybę, | norėčiau | pasiūlyti | jums | — | 50 dolerių | kuponą...",
        "Kaip padėką už jūsų kantrybę norėčiau jums pasiūlyti 50 dolerių kuponą…",
        { say: "As a thank you for your patience, I'd like to offer you a fifty-dollar coupon..." }),
    ],
    brenda_offer_mug: [
      t("...and | one | of | our | lovely | Harbor Home | mugs!", "...ir | vieną | iš | mūsų | mielų | „Harbor Home“ | puodelių!", "…ir vieną iš mūsų mielų „Harbor Home“ puodelių!"),
    ],
    brenda_offer_visit: [
      t("I | can | get | a | technician | out | to | you | on Wednesday, | between | 10 | and | 2.",
        "Aš | galiu | atsiųsti | — | meistrą | — | pas | jus | trečiadienį, | tarp | 10 | ir | 14 val.",
        "Galiu atsiųsti pas jus meistrą trečiadienį, nuo 10 iki 14 valandos.",
        { say: "I can get a technician out to you on Wednesday, between ten and two.", flags: { 2: "“get … out” = atsiųsti.", 5: "“out”: the particle of “get … out”, carried by atsiųsti (under “get”).", 12: F_PM2 } }),
    ],
    brenda_offer_q: [t("How | does | that | sound?", "Kaip | — | tai | skamba?", "Kaip jums tai atrodo?", { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on skamba." } })],
    brenda_decline_ack: [t("Understood.", "Supratau.", "Supratau."), t("Fair enough.", "Na, gerai.", "Na, gerai.")],
    brenda_day_off: [
      t("Oh | no. | That's | not | okay, | and | I'm sorry.", "O | ne. | Tai | — | negerai, | ir | atsiprašau.", "O ne. Taip neturėtų būti – atsiprašau.",
        { flags: { 3: "“not”: the ne- of negerai (under “okay”) carries it." } }),
    ],
    brenda_third_ack: [t("I | know, | and | that | shouldn't have | happened.", "Aš | žinau, | ir | tai | neturėjo | nutikti.", "Žinau, ir taip neturėjo nutikti.")],
    brenda_further: [
      t("I'd rather | we | solve | this | together, | right now.", "Norėčiau, kad | mes | išspręstume | tai | kartu, | dabar pat.", "Verčiau išspręskime tai kartu – dabar pat."),
    ],
    brenda_is_manager: [
      t("I'm | the | manager | here, | and | I | want | to fix | this.", "Aš esu | — | vadovė | čia, | ir | aš | noriu | sutvarkyti | tai.", "Vadovė čia esu aš, ir aš noriu tai sutvarkyti."),
    ],
    brenda_what_want: [
      t("So | what | would | you | like | us | to do?", "Tai | ko | — | jūs | norėtumėte | kad mes | padarytume?", "Tai ko norėtumėte, kad padarytume?",
        { flags: { 2: "“would”: the conditional norėtumėte carries it.", 5: "“us” + infinitive = kad mes + the conditional (padarytume)." } }),
      t("What | outcome | are | you | looking for?", "Kokio | sprendimo | — | jūs | tikitės?", "Kokio sprendimo tikitės?",
        { flags: { 2: "“are”: the continuous form has no Lithuanian word; tikitės carries it." } }),
    ],
    brenda_refund_or: [
      t("Would | you | prefer | a | refund | or | a | replacement?", "Ar | jūs | labiau norėtumėte | — | pinigų grąžinimo | ar | — | naujo šaldytuvo?",
        "Ar norėtumėte, kad grąžintume pinigus, ar kad pakeistume šaldytuvą nauju?",
        { flags: { 0: F_WOULD_Q, 7: "“replacement” here = a new fridge instead of the broken one." } }),
    ],
    brenda_refund_ok: [
      t("Okay. | I | can | approve | a | full | refund | of | $1,299.", "Gerai. | Aš | galiu | patvirtinti | — | visų | pinigų grąžinimą | — | 1 299 dolerių.",
        "Gerai. Galiu patvirtinti, kad grąžinsime visą sumą – 1 299 dolerius.",
        { say: "Okay. I can approve a full refund of twelve hundred ninety-nine dollars.", flags: { 7: "“of” + an amount: the genitive dolerių carries it." } }),
    ],
    brenda_replace_ok: [
      t("Okay. | I | can | send | you | a | brand-new | fridge, | same | model | or | better.",
        "Gerai. | Aš | galiu | atsiųsti | jums | — | visiškai naują | šaldytuvą, | tokį patį | modelį | arba | geresnį.",
        "Gerai. Galiu jums atsiųsti visiškai naują šaldytuvą – tokį patį modelį ar geresnį."),
    ],
    brenda_pickup: [
      t("We'll | also | pick up | the | old | fridge | for free.", "Mes | taip pat | išsivešime | — | seną | šaldytuvą | nemokamai.", "Senąjį šaldytuvą taip pat išsivešime nemokamai.",
        { flags: { 0: "“'ll” (will): the future ending of išsivešime (under “pick up”) carries it." } }),
    ],
    brenda_pickup_yes: [
      t("Yes, | we'll | pick up | the | old | fridge | for free.", "Taip, | mes | išsivešime | — | seną | šaldytuvą | nemokamai.", "Taip, senąjį šaldytuvą išsivešime nemokamai.",
        { flags: { 1: "“'ll” (will): the future ending of išsivešime (under “pick up”) carries it." } }),
    ],
    brenda_timeline: [
      t("Delivery | usually | takes | 10 | to | 14 | business | days.", "Pristatymas | paprastai | užtrunka | nuo 10 | iki | 14 | darbo | dienų.",
        "Pristatymas paprastai užtrunka nuo 10 iki 14 darbo dienų.",
        { say: "Delivery usually takes ten to fourteen business days.", flags: { 3: "A range “10 to 14” = nuo 10 iki 14: Lithuanian adds nuo." } }),
    ],
    brenda_refund_time: [
      t("Refunds | usually | take | 10 | to | 14 | business | days.", "Pinigų grąžinimas | paprastai | užtrunka | nuo 10 | iki | 14 | darbo | dienų.",
        "Pinigai paprastai grąžinami per 10–14 darbo dienų.",
        { say: "Refunds usually take ten to fourteen business days.", flags: { 3: "A range “10 to 14” = nuo 10 iki 14: Lithuanian adds nuo." } }),
    ],
    brenda_timeline_q: [t("Does | that | timeline | work | for you?", "Ar | tas | terminas | tinka | jums?", "Ar jums tinka toks terminas?", { flags: { 0: F_DOES_Q } })],
    brenda_deadline_ok: [
      t("By | {X}? | That's | tight, | but | I | can | make | it | work.", "Iki | {X:gen}? | Tai yra | nedaug laiko, | bet | aš | galiu | — | tai | suderinti.",
        "Iki {X:gen}? Laiko nedaug, bet galiu tai suderinti.",
        { flags: { 3: "“tight” (a deadline) = nedaug laiko.", 7: "“make … work” = suderinti (under “work”)." } }),
    ],
    brenda_delivery_day: [
      t("Our | team | can | deliver | it | {X}, | between | 8 | and | noon.", "Mūsų | komanda | gali | pristatyti | jį | {X:acc}, | tarp | 8 | ir | vidurdienio.",
        "Mūsų komanda gali jį pristatyti {X:acc}, nuo 8 iki 12 valandos.", { say: "Our team can deliver it {X}, between eight and noon." }),
    ],
    brenda_refund_day: [
      t("I'll make sure | the | refund | goes through | by | {X}.", "Pasirūpinsiu, kad | — | pinigai | būtų grąžinti | iki | {X:gen}.",
        "Pasirūpinsiu, kad pinigai būtų grąžinti iki {X:gen}.", { flags: { 2: "“refund” = pinigai (what is returned)." } }),
    ],
    brenda_lets_say: [t("Understood. | Let's say | Friday, | then.", "Supratau. | Sakykime | penktadienį, | tada.", "Supratau. Tada sakykime – penktadienį.")],
    brenda_which_day: [
      t("What | day | did | you | have | in mind?", "Kurią | dieną | — | jūs | turėjote | omenyje?", "Kurią dieną turėjote omenyje?",
        { flags: { 2: "Question “did” has no Lithuanian word; the past tense sits on turėjote." } }),
    ],
    brenda_ok: [t("Great.", "Puiku.", "Puiku."), t("Wonderful.", "Nuostabu.", "Nuostabu.")],
    brenda_confirm_q: [t("Does | that | work | for you?", "Ar | tai | tinka | jums?", "Ar jums tai tinka?", { flags: { 0: F_DOES_Q } })],
    brenda_writing_ok: [
      t("Absolutely. | I'll email | you | a | written | confirmation | today.", "Žinoma. | Atsiųsiu el. paštu | jums | — | rašytinį | patvirtinimą | šiandien.",
        "Žinoma. Šiandien atsiųsiu jums rašytinį patvirtinimą el. paštu."),
      t("Of course. | I'll put | it | in writing | and | sign | it | myself.", "Žinoma. | Pateiksiu | tai | raštu | ir | pasirašysiu | tai | pati.",
        "Žinoma. Pateiksiu tai raštu ir pati pasirašysiu.", { flags: { 5: "“sign”: the future of “I'll” carries over: pasirašysiu." } }),
    ],
    brenda_ref_pen: [
      t("Let | me | give | you | a | reference | number. | Do | you | have | a | pen?", "Leiskite | man | padiktuoti | jums | — | užklausos | numerį. | Ar | jūs | turite | — | rašiklį?",
        "Leiskite padiktuoti jums užklausos numerį. Ar turite rašiklį?",
        { flags: { 2: "“give” (a number on the phone) = padiktuoti.", 7: F_DO_Q } }),
    ],
    brenda_ref: [
      t("It's | {$text}.", "Tai yra | {$text}.", "Numeris: {$text}.", { spell: "HH4471", write: REF_WRITE }),
      t("Okay. | Your | reference | number | is | {$text}.", "Gerai. | Jūsų | užklausos | numeris | yra | {$text}.", "Gerai. Jūsų užklausos numeris – {$text}.",
        { spell: "HH4471", write: REF_WRITE }),
    ],
    brenda_ref_asked: [
      t("Of course. | Your | reference | number | is | {$text}.", "Žinoma. | Jūsų | užklausos | numeris | yra | {$text}.", "Žinoma. Jūsų užklausos numeris – {$text}.",
        { spell: "HH4471", write: REF_WRITE }),
      t("Sure. | It's | {$text}.", "Žinoma. | Tai yra | {$text}.", "Žinoma. Numeris: {$text}.", { spell: "HH4471", write: REF_WRITE }),
    ],
    brenda_ref_repeat: [
      t("Again: | {$text}.", "Dar kartą: | {$text}.", "Dar kartą: {$text}.", { spell: "HH4471", write: REF_WRITE }),
      t("Sure, | again: | {$text}.", "Žinoma, | dar kartą: | {$text}.", "Žinoma, dar kartą: {$text}.", { spell: "HH4471", write: REF_WRITE }),
    ],
    brenda_ref_before_go: [
      t("Before | you | go, | your | reference | number | is | {$text}.", "Prieš | jums | išeinant, | jūsų | užklausos | numeris | yra | {$text}.",
        "Prieš baigiant pokalbį: jūsų užklausos numeris – {$text}.", { spell: "HH4471", write: REF_WRITE }),
    ],
    brenda_ref_correct: [t("Perfect.", "Puiku.", "Puiku."), t("Exactly.", "Būtent.", "Būtent.")],
    brenda_no_pen: [t("No worries, | it'll be | in the email | too.", "Nieko tokio, | jis bus | laiške | irgi.", "Nieko tokio, jis bus ir laiške.")],
    brenda_partial: [
      t("Wonderful! | I'll send | the | coupon | to | your | email.", "Puiku! | Atsiųsiu | — | kuponą | — | jūsų | el. paštu.", "Puiku! Kuponą atsiųsiu jums el. paštu.",
        { flags: { 4: "“to”: the instrumental el. paštu carries it." } }),
    ],
    brenda_partial_visit: [
      t("Wonderful! | Wednesday, | between | 10 | and | 2. | I'll make sure | they | show up.", "Puiku! | Trečiadienį, | tarp | 10 | ir | 14 val. | Pasirūpinsiu, kad | jie | atvyktų.",
        "Puiku! Trečiadienį, nuo 10 iki 14 valandos. Pasirūpinsiu, kad meistrai atvyktų.",
        { say: "Wonderful! Wednesday, between ten and two. I'll make sure they show up.", flags: { 5: F_PM2 } }),
    ],
    brenda_anything: [t("Can | I | help | you | with anything | else?", "Ar galiu | aš | padėti | jums | kuo nors | dar?", "Ar galiu dar kuo nors padėti?")],
    brenda_thanks: [t("Thank | you | for | your | patience. | Really.", "Dėkoju | jums | už | jūsų | kantrybę. | Tikrai.", "Ačiū už kantrybę. Nuoširdžiai.")],
    brenda_appreciate_reply: [
      t("You're welcome. | I'm sorry | again | for | all | the | trouble.", "Prašom. | Atsiprašau | dar kartą | dėl | visų | — | nemalonumų.", "Prašom. Dar kartą atsiprašau dėl visų nemalonumų.",
        { flags: { 3: "“for” (sorry for) = dėl." } }),
    ],
    brenda_bye_new: [
      t("Have | a | wonderful | day, | and | enjoy | the | new | fridge!", "Linkiu | — | nuostabios | dienos, | ir | mėgaukitės | — | nauju | šaldytuvu!",
        "Geros dienos ir džiaukitės nauju šaldytuvu!", { flags: { 0: F_HAVE_WISH } }),
    ],
    brenda_bye: [
      t("Have | a | wonderful | day.", "Linkiu | — | nuostabios | dienos.", "Nuostabios dienos.", { flags: { 0: F_HAVE_WISH } }),
      t("Take care, | and | have | a | good | day.", "Laikykitės, | ir | linkiu | — | geros | dienos.", "Laikykitės ir geros dienos.", { flags: { 2: F_HAVE_WISH } }),
    ],
    brenda_walk: [
      t("I'm | sorry | we | couldn't sort | this | out | today.", "Man | gaila, kad | mes | negalėjome išspręsti | to | — | šiandien.", "Gaila, kad šiandien nepavyko to išspręsti.",
        { flags: { 0: F_GAILA, 5: "“out”: the particle of “sort … out”, carried by išspręsti." } }),
    ],
    brenda_rude: [
      t("I | understand | you're | upset. | Let's see | what | I | can | do.", "Aš | suprantu, kad | jūs esate | {m:nusiminęs|f:nusiminusi}. | Pažiūrėkime | ką | aš | galiu | padaryti.",
        "Suprantu, kad esate {m:nusiminęs|f:nusiminusi}. Pažiūrėkime, ką galiu padaryti."),
    ],
    brenda_rude2: [
      t("I'm | happy | to help, | but | let's keep | this | respectful.", "Aš | mielai | padėsiu, | bet | išlaikykime | šį pokalbį | pagarbų.", "Mielai padėsiu, bet kalbėkime pagarbiai.",
        { flags: { 0: "“'m” (am) has no word: mielai padėsiu (gladly I'll help) carries the meaning.", 5: "“this” = šį pokalbį (this conversation)." } }),
    ],
  },

  domains: {
    text: () => [REF],
  },

  hints: {
    problem: {
      lt: "Pasakyti, kad nori pateikti skundą, ir kas nutiko",
      items: [
        { id: "make_complaint", s: t("I'd like | to make | a | complaint.", "Norėčiau | pateikti | — | skundą.", "Norėčiau pateikti skundą."), register: "polite" },
        { id: "calling_about", s: t("I'm calling | about | my | fridge.", "Skambinu | dėl | savo | šaldytuvo.", "Skambinu dėl savo šaldytuvo.") },
        { id: "fridge_stopped", s: t("My | new | fridge | stopped | working.", "Mano | naujas | šaldytuvas | nustojo | veikti.", "Mano naujas šaldytuvas nustojo veikti.") },
        { id: "tech_never", s: t("The | technician | never | came.", "— | Meistras | taip ir | neatvyko.", "Meistras taip ir neatvyko.",
          { flags: { 2: "“never” here = taip ir (after all the waiting); the ne- of neatvyko carries the negation." } }) },
        { id: "bought_ago", s: t("I | bought | it | three | weeks | ago.", "Aš | nupirkau | jį | tris | savaites | prieš.", "Nupirkau jį prieš tris savaites.",
          { flags: { 5: "“ago” = prieš, which in Lithuanian stands before the time." } }) },
        { id: "food_spoiled", s: t("All | my | food | went bad.", "Visas | mano | maistas | sugedo.", "Visas mano maistas sugedo.") },
      ],
    },
    plugged: {
      lt: "Ramiai atsakyti, kad tai jau patikrinai",
      items: [
        { id: "plugged_yes", s: t("Yes, | it's | plugged in.", "Taip, | jis yra | įjungtas į lizdą.", "Taip, jis įjungtas į elektros lizdą.") },
        { id: "checked", s: t("I've | already | checked | that.", "Aš | jau | patikrinau | tai.", "Tai jau patikrinau.",
          { flags: { 0: "“'ve” (have): the past tense of patikrinau carries it." } }) },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą ir pavardę",
      items: [
        { id: "my_name", s: t("My | name | is | {$name} | {$surname}.", "Mano | vardas | yra | {$name} | {$surname}.", "Mano vardas – {$name} {$surname}.") },
        { id: "its_name", s: t("It's | {$name} | {$surname}.", "Tai | {$name} | {$surname}.", "{$name} {$surname}.",
          { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } }) },
      ],
    },
    escalate: {
      lt: "Pasakyti, kad skambini trečią kartą, ir paprašyti vadovo",
      items: [
        { id: "third_time", s: t("This | is | the | third | time | I've | called.", "Tai | yra | — | trečias | kartas | kai aš | skambinu.", "Skambinu jau trečią kartą.",
          { flags: { 5: "Lithuanian adds kai; the English perfect “'ve called” = the present skambinu (it is still going on)." } }) },
        { id: "not_good", s: t("I'm afraid | that's | not | good | enough.", "Deja | tai | — | gerai | nepakankamai.", "Deja, manęs tai netenkina.",
          { flags: { 2: "“not”: the ne- of nepakankamai (under “enough”) carries it." } }) },
        { id: "manager", s: t("Could | I | speak | to | your | manager, | please?", "Ar galėčiau | aš | pakalbėti | su | jūsų | vadovu, | prašau?", "Ar galėčiau pakalbėti su jūsų vadovu?",
          { flags: { 3: "“to” (speak to) = su." } }), register: "polite" },
        { id: "nobody_came", s: t("Nobody | came. | I | waited | all | day.", "Niekas | neatvyko. | Aš | laukiau | visą | dieną.", "Niekas neatvyko. Laukiau visą dieną.") },
        { id: "not_your_fault", s: t("I | know | it's | not | your | fault, | but...", "Aš | žinau, | kad tai | ne | jūsų | kaltė, | bet...", "Žinau, kad tai ne jūsų kaltė, bet…",
          { flags: { 2: "“it's” = kad tai: Lithuanian adds kad and needs no copula." } }), note: "Mandagiai, bet tvirtai: pripažink, kad konsultantas nekaltas, ir vis tiek pasakyk, ko nori." },
        { id: "further", s: t("Otherwise, | I'll be taking | this | further.", "Kitaip, | perduosiu | šį reikalą | aukščiau.", "Kitaip šį reikalą perduosiu aukščiau.",
          { flags: { 2: "“this” = šį reikalą (this matter)." } }) },
      ],
    },
    hold: {
      lt: "Pasakyti, kad gali palaukti",
      items: [
        { id: "all_day", s: t("That's | fine. | I've | got | all | day.", "Tai | gerai. | Aš | turiu | visą | dieną.", "Gerai. Turiu visą dieną.",
          { flags: { 2: "“'ve”: part of “have got” = turiu (under “got”)." } }) },
        { id: "can_hold", s: t("Sure, | I | can | hold.", "Žinoma, | aš | galiu | palaukti.", "Žinoma, galiu palaukti.") },
      ],
    },
    offer: {
      lt: "Mandagiai atsisakyti ir pasakyti, ko nori",
      items: [
        { id: "full_refund", s: t("I | expect | a | full | refund.", "Aš | tikiuosi | — | visų | pinigų grąžinimo.", "Tikiuosi, kad grąžinsite visus pinigus.") },
        { id: "keep_mug", s: t("Thank | you, | but | you | can | keep | the | mug.", "Dėkoju | jums, | bet | jūs | galite | pasilikti | — | puodelį.", "Ačiū, bet puodelį galite pasilikti.") },
        { id: "decline", s: t("Thank | you, | but | I'm afraid | a | coupon | isn't | enough.", "Dėkoju | jums, | bet | deja | — | kupono | — | nepakanka.", "Ačiū, bet, deja, kupono neužtenka.",
          { flags: { 6: "“isn't”: the ne- of nepakanka (under “enough”) carries it." } }) },
        { id: "replacement", s: t("I'd like | a | replacement, | please.", "Norėčiau | — | naujo šaldytuvo, | prašau.", "Norėčiau, kad jį pakeistumėte nauju.",
          { flags: { 2: "“replacement” here = a new fridge instead of the broken one." } }) },
        { id: "refund_or", s: t("I'd like | a | refund | or | a | replacement.", "Norėčiau | — | pinigų grąžinimo | arba | — | naujo šaldytuvo.",
          "Norėčiau, kad grąžintumėte pinigus arba pakeistumėte šaldytuvą nauju.") },
        { id: "day_off", s: t("I | already | took | a | day off, | and | nobody | came.", "Aš | jau | pasiėmiau | — | laisvą dieną, | ir | niekas | neatvyko.",
          "Jau buvau {m:pasiėmęs|f:pasiėmusi} laisvą dieną, ir niekas neatvyko.") },
        { id: "further", s: t("Otherwise, | I'll be taking | this | further.", "Kitaip, | perduosiu | šį reikalą | aukščiau.", "Kitaip šį reikalą perduosiu aukščiau.",
          { flags: { 2: "“this” = šį reikalą (this matter)." } }) },
      ],
    },
    deadline: {
      lt: "Nustatyti terminą",
      items: [
        { id: "by_friday", s: t("I'd like | this | resolved | by | Friday, | not | someday.", "Norėčiau, kad | tai | būtų išspręsta | iki | penktadienio, | o ne | kada nors.",
          "Norėčiau, kad tai būtų išspręsta iki penktadienio, o ne kada nors.",
          { flags: { 0: "“I'd like” + object + participle = norėčiau, kad … būtų …", 3: "“by” (a deadline) = iki." } }) },
        { id: "need_by", s: t("I | need | it | by | Friday.", "Man | reikia | jo | iki | penktadienio.", "Man jo reikia iki penktadienio.",
          { flags: { 0: "“I” = man: reikia takes the dative.", 2: "“it” = jo: reikia takes the genitive." } }) },
        { id: "asap", s: t("As soon as possible, | please.", "Kuo greičiau, | prašau.", "Kuo greičiau, prašau.") },
        { id: "too_long", s: t("Two | weeks | is | too | long, | I'm afraid.", "Dvi | savaitės | yra | per | ilgai, | deja.", "Deja, dvi savaitės – per ilgai.") },
      ],
    },
    confirm: {
      lt: "Paprašyti patvirtinimo raštu",
      items: [
        { id: "in_writing", s: t("Can | I | have | that | in writing?", "Ar galiu | aš | gauti | tai | raštu?", "Ar galiu tai gauti raštu?",
          { flags: { 2: "“have” (receive) = gauti." } }) },
        { id: "email_confirm", s: t("Could | you | confirm | that | by email, | please?", "Ar galėtumėte | jūs | patvirtinti | tai | el. paštu, | prašau?", "Ar galėtumėte tai patvirtinti el. paštu?") },
        { id: "works", s: t("Yes, | that | works | for me.", "Taip, | tai | tinka | man.", "Taip, man tinka.") },
      ],
    },
    reference: {
      lt: "Paprašyti užklausos numerio ir jį pakartoti",
      items: [
        { id: "ask_ref", s: t("Could | I | have | a | reference | number, | please?", "Ar galėčiau | aš | gauti | — | užklausos | numerį, | prašau?", "Ar galėčiau gauti užklausos numerį?") },
        { id: "go_ahead", s: t("Yes, | go ahead.", "Taip, | sakykite.", "Taip, sakykite.") },
        { id: "readback", s: t("HH-4471. | Got it.", "HH-4471. | Užsirašiau.", "HH-4471. Užsirašiau.", { say: "H, H, four, four, seven, one. Got it." }) },
        { id: "repeat", s: t("Sorry, | could | you | repeat | that?", "Atsiprašau, | ar galėtumėte | jūs | pakartoti | tai?", "Atsiprašau, ar galėtumėte pakartoti?") },
      ],
    },
    closing: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "appreciate", s: t("I | appreciate | your | help, | I | truly | do.", "Aš | vertinu | jūsų | pagalbą, | aš | tikrai | vertinu.", "Vertinu jūsų pagalbą, tikrai vertinu.",
          { flags: { 6: "“do” repeats the verb: vertinu." } }) },
        { id: "thats_all", s: t("No, | that's | all. | Thank | you.", "Ne, | tai yra | viskas. | Dėkoju | jums.", "Ne, tai viskas. Ačiū.") },
        { id: "nice_day", s: t("Have | a | nice | day.", "Linkiu | — | geros | dienos.", "Geros dienos.", { flags: { 0: F_HAVE_WISH } }) },
      ],
    },
  },

  tips: {
    give_complaint: { key: "give_complaint", lt: "Suprasta! Lietuviškai sakome „pateikti skundą“ ar „reklamacija“, bet angliškai sakoma „make a complaint“. Žodžių „reclamation“ ir „pretension“ šia prasme amerikiečiai nevartoja.", better: "I'd like to make a complaint." },
    uk_ringing: { key: "uk_ringing", lt: "Suprasta! „Ringing“ – britiškas žodis. Amerikoje sakoma „I'm calling about…“.", better: "I'm calling about my fridge." },
    third_time: { key: "third_time", lt: "Suprasta! Po „This is the first / second / third time…“ angliškai būtinas Present Perfect: „I've called“.", better: "This is the third time I've called." },
    already_days: { key: "already_days", lt: "Suprasta! „Jau trys dienos neveikia“ angliškai: „It hasn't worked for three days“ – su „for“ ir Present Perfect.", better: "It hasn't worked for three days." },
    blunt_manager: { key: "blunt_manager", lt: "Suprasta! Taip skamba kaip įsakymas (amerikiečiai tokį toną juokais vadina „Karen“ stiliumi). Tvirtumo nesumažinsi, jei paklausi mandagiai.", better: "Could I speak to your manager, please?" },
    return_money: { key: "return_money", lt: "Suprasta! Pažodžiui „grąžinkite pinigus“ angliškai skamba šiurkščiai – klientų aptarnavime sakoma „refund“.", better: "I'd like a full refund, please." },
    by_until: { key: "by_until", lt: "Suprasta! „Iki penktadienio“ kaip terminas – „by Friday“. „Until“ reiškia „visą laiką iki“ („I'll wait until Friday“).", better: "I'd like this resolved by Friday." },
    in_writing: { key: "in_writing", lt: "Suprasta! „Raštu“ angliškai – „in writing“.", better: "Can I have that in writing?" },
    ref_number: { key: "ref_number", lt: "Suprasta! „Užklausos numeris“ angliškai – „reference number“ (dar sakoma „case number“ arba „ticket number“).", better: "Could I have a reference number, please?" },
    too_harsh: { key: "too_harsh", lt: "Suprasta! Pyktis suprantamas, bet įžeidinėjimai pokalbį tik apsunkina. Amerikiečių klientų aptarnavime geriausiai veikia „mandagiai, bet tvirtai“: pasakyk, kas negerai ir ko tikiesi.", better: "I know it's not your fault, but this is the third time I've called." },
    change_fridge: { key: "change_fridge", lt: "Suprasta! „Pakeisti šaldytuvą“ (kitu) angliškai – „replace“ arba „exchange“; „change“ čia skamba neaiškiai.", better: "Could you replace it, please?" },
    review_threat: { key: "review_threat", lt: "Suprasta! Grasinti atsiliepimu – kraštutinė priemonė, ir pokalbis dažnai tik paaštrėja. Tvirčiau ir mandagiau:", better: "Otherwise, I'll be taking this further." },
    uk_fortnight: { key: "uk_fortnight", lt: "Suprasta! „Fortnight“ (dvi savaitės) – britiškas žodis. Amerikoje sakoma „two weeks“.", better: "Two weeks is too long, I'm afraid." },
    uk_engineer: { key: "uk_engineer", lt: "Suprasta! Amerikoje buitinės technikos meistras dažniausiai vadinamas „technician“ arba „repairman“.", better: "The technician never came." },
  },

  merges: {
    "for calling": { reason: "grammatical_fusion", split: "for → už + calling → skambinimas is a calque; thanks for calling = kad skambinate / paskambinote.", minimal: "Two words." },
    "for holding": { reason: "grammatical_fusion", split: "for → už + holding → laikymas is a calque; thanks for holding = kad palaukėte.", minimal: "Two words." },
    "this is": { reason: "lexical_expression", split: "this → tai + is → yra gives a statement about an object; on the phone “This is Kyle” = čia Kailas.", minimal: "Two words; the name stays outside." },
    "harbor home": { reason: "lexical_expression", split: "Harbor → uostas + Home → namai would translate a company name; = „Harbor Home“.", minimal: "One name." },
    "going on": { reason: "lexical_expression", split: "going → einantis + on → ant is false; what's going on = kas vyksta.", minimal: "Verb and particle." },
    "plugged in": { reason: "lexical_expression", split: "plugged → užkimštas + in → į is false; = įjungtas į lizdą.", minimal: "Verb and particle." },
    "it says": { reason: "grammatical_fusion", split: "it → jis + says → sako gives a false subject; the impersonal čia parašyta, kad absorbs the dummy “it”.", minimal: "Two words." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs is false; the polite softener = deja.", minimal: "Two words." },
    "i'll make sure": { reason: "grammatical_fusion", split: "I'll → aš + make → darysiu + sure → tikras is false; the future of pasirūpinti, kad carries subject, “will” and “make sure”.", minimal: "Pronoun, “'ll” and the fixed “make sure”." },
    "thank you": { reason: "lexical_expression", split: "thank → dėkoti + you → jums is false here: in “as a thank you” the phrase is a noun = padėka.", minimal: "Two words, one noun." },
    "go there": { reason: "lexical_expression", split: "go → eiti + there → ten is a false movement; “before we go there” = prieš pereinant prie to.", minimal: "Verb and adverb." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai.", minimal: "Two words." },
    "i'd rather": { reason: "grammatical_fusion", split: "I'd → aš + rather → verčiau loses the conditional wish; = norėčiau, kad (the conditional carries “'d”).", minimal: "Pronoun with “'d” and the adverb." },
    "looking for": { reason: "lexical_expression", split: "looking → žiūrite + for → už is false; looking for (an outcome) = tikitės.", minimal: "Verb and particle." },
    "pick up": { reason: "lexical_expression", split: "pick → rinkti + up → aukštyn is false; taking away an old fridge = išsivežti (C-PHR).", minimal: "Verb and particle." },
    "for free": { reason: "lexical_expression", split: "for → už + free → laisvas is false; = nemokamai.", minimal: "Two words." },
    "goes through": { reason: "lexical_expression", split: "goes → eina + through → per is false; a refund that goes through = pinigai grąžinami.", minimal: "Verb and particle." },
    "show up": { reason: "lexical_expression", split: "show → rodyti + up → aukštyn is false; = atvykti (C-PHR).", minimal: "Verb and particle." },
    "in mind": { reason: "lexical_expression", split: "in → — + mind → protas is false; have in mind = turėti omenyje.", minimal: "Two words." },
    "in writing": { reason: "lexical_expression", split: "in → — + writing → rašymas gives “rašyme”; = raštu.", minimal: "Two words." },
    "no worries": { reason: "lexical_expression", split: "no → jokių + worries → rūpesčių is a calque; = nieko tokio.", minimal: "Two words." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatyti is false; you're all set (booked) = užregistruotas.", minimal: "Two words." },
    "day off": { reason: "lexical_expression", split: "day → diena + off → išjungta is false; = laisva diena.", minimal: "Two words." },
    "went bad": { reason: "lexical_expression", split: "went → nuėjo + bad → blogas is false; food going bad = sugesti.", minimal: "Verb and adjective." },
    "as soon as possible": { reason: "lexical_expression", split: "as → kaip, soon → greitai, as → kaip, possible → įmanoma is a calque; = kuo greičiau.", minimal: "The four words form the formula." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a false movement; on the phone = sakykite.", minimal: "Two words." },
    "i'll be taking": { reason: "grammatical_fusion", split: "I'll → aš + be → būsiu + taking → imantis is false; the future continuous is one Lithuanian future verb (perduosiu).", minimal: "Pronoun, “'ll be” and the verb; the object stays outside." },
    "let's say": { reason: "grammatical_fusion", split: "Let's → leiskime + say → sakyti is a calque; the first person plural imperative = sakykime.", minimal: "Two words." },
    "let's see": { reason: "grammatical_fusion", split: "Let's → leiskime + see → matyti is a calque; the first person plural imperative = pažiūrėkime.", minimal: "Two words." },
    "let's keep": { reason: "grammatical_fusion", split: "Let's → leiskime + keep → laikyti is a calque; the first person plural imperative = išlaikykime.", minimal: "Two words; the object stays outside." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kad nori pateikti skundą, ir paaiškink, kas nutiko", done: (c) => !!c.s.problem },
    // a bonus: shown while it still fits (before asking for the manager), and ticked when said
    { lt: "Pasakyk, kad skambini jau trečią kartą", optional: true, when: (c) => !c.s.escalated || !!c.s.thirdSaid, done: (c) => !!c.s.thirdSaid },
    { lt: "Paprašyk pakalbėti su vadovu", done: (c) => !!c.s.escalated },
    { lt: "Atsisakyk kupono ar dar vieno vizito ir paprašyk grąžinti pinigus arba pakeisti šaldytuvą", done: (c) => !!c.s.remedy },
    // bonuses once the remedy is approved; at the end only the ones done stay on the list
    { lt: "Nustatyk terminą (pvz., iki penktadienio)", optional: true, when: (c) => !!c.s.remedy && (!c.s.wrapUp || deadlineSet(c)), done: deadlineSet },
    { lt: "Paprašyk patvirtinimo raštu", optional: true, when: (c) => !!c.s.remedy && (!c.s.wrapUp || !!c.s.writing), done: (c) => !!c.s.writing },
    { lt: "Gauk užklausos numerį", done: (c) => !!c.s.ref },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem || !!c.s.over,
      ask: (c) => K(c, turn(c).complained ? "kyle_complaint_ok" : "kyle_ask_problem"),
      expects: ["complain_open", "fridge_broke", "no_show", "third_time", "ask_manager", "ask_refund", "ask_replacement", "intro_name", "intro_this_ctx"],
      suggest: [{ lt: "Pasakyti, kad nori pateikti skundą, ir kas nutiko", hint: "problem" }],
      yes: () => { /* "Yes?" – Kyle asks what the problem is */ }, no: () => { /* the same */ },
      help: (c) => { K(c, "kyle_ask_problem"); } },
    // Twist: Kyle reads from his script. Any answer will do.
    { id: "plugged", when: (c) => !!c.s.pluggedTwist && !!c.s.problem && !c.s.transferred, done: (c) => !!c.s.pluggedDone || !!c.s.over,
      ask: (c) => { c.twist("plugged_in"); KG(c, "kyle_plugged"); if (c.chance(0.5)) K(c, "kyle_off_on"); },
      expects: ["plugged_yes"],
      suggest: [{ lt: "Ramiai atsakyti, kad tai jau patikrinai", hint: "plugged" }],
      yes: (c) => { pluggedAnswered(c); }, no: (c) => { pluggedAnswered(c); } },
    // asked at most twice
    { id: "name", when: (c) => !!c.s.problem && pluggedOk(c), done: (c) => nameDone(c) || !!c.s.transferred || !!c.s.over,
      ask: (c) => { c.s.nameAsked = (c.s.nameAsked ?? 0) + 1; K(c, "kyle_ask_name"); },
      expects: ["intro_name", "intro_ctx", "intro_this_ctx", "third_time"],
      suggest: [{ lt: "Pasakyti savo vardą ir pavardę", hint: "name" }],
      yes: () => { /* Kyle asks again */ }, no: () => { /* the same */ } },
    // Kyle reads the file (the comic beat: "completed?") and offers another visit; then his hands are tied;
    // then he offers his manager.
    { id: "history", when: (c) => !!c.s.problem && pluggedOk(c) && nameDone(c),
      done: (c) => (!!c.s.escalated && !!c.s.fileRead) || !!c.s.transferred || !!c.s.over,
      ask: (c) => {
        const n = c.s.histN = (c.s.histN ?? 0) + 1;
        if (n === 1) {
          c.s.fileRead = true;
          c.twist("file_completed");
          K(c, "kyle_file1"); K(c, "kyle_file2"); K(c, "kyle_file3");
          if (c.s.escalated) { c.ask("transfer"); return; } // the manager was asked for: the transfer now
          if (c.s.wish) { offerManager(c); return; }
          K(c, "kyle_new_visit");
          return;
        }
        if (n === 2) { K(c, "kyle_hands_tied"); K(c, "kyle_earliest"); return; }
        offerManager(c);
      },
      expects: ["third_time", "not_good_enough", "no_show", "disbelief", "ask_manager", "further", "ask_refund", "ask_replacement", "refund_or",
        "set_deadline", "ask_writing", "ask_reference", "accept_offer", "agree", "decline_offer"],
      suggest: [{ lt: "Pasakyti, kad skambini trečią kartą, ir paprašyti vadovo", hint: "escalate" }],
      // "Yes" / "Okay" to "I can book you a new visit for next Tuesday": Kyle makes sure first
      yes: (c) => { if (!c.s.escalated && (c.s.histN ?? 0) <= 2) askBookTuesday(c); },
      no: () => { /* Kyle goes on: his hands are tied */ },
      help: (c) => { offerManager(c); } },
    { id: "transfer", when: (c) => !!c.s.escalated && !!c.s.problem && pluggedOk(c) && nameDone(c) && !!c.s.fileRead,
      done: (c) => !!c.s.transferred || !!c.s.over,
      ask: (c) => { if (!c.s.transferAsked) { c.s.transferAsked = true; K(c, "kyle_transfer"); } K(c, "kyle_can_hold"); },
      expects: ["can_hold", "cant_hold"],
      suggest: [{ lt: "Pasakyti, kad gali palaukti", hint: "hold" }],
      yes: (c) => { transferNow(c, "yes"); }, no: (c) => { transferNow(c, "no"); } },
    // Twist: Brenda offers a $50 coupon and a mug, or a technician on Wednesday between 10 and 2.
    { id: "offer", when: (c) => !!c.s.transferred, done: (c) => !!c.s.remedy || !!c.s.offerClosed || !!c.s.over,
      ask: (c) => {
        const n = c.s.offerN = (c.s.offerN ?? 0) + 1;
        if (n === 1) {
          c.twist(c.s.offerKind);
          if (c.s.wish) B(c, "brenda_before");
          if (c.s.offerKind === "coupon") { B(c, "brenda_offer_coupon"); B(c, "brenda_offer_mug"); } else B(c, "brenda_offer_visit");
          B(c, "brenda_offer_q");
          c.s.offerQ = true;
          return;
        }
        if (c.s.accepted) { B(c, "brenda_anything"); expectAnything(c); return; }
        if (n === 2) { c.s.offerQ = false; B(c, "brenda_what_want"); return; }
        askRefundOr(c);
      },
      expects: ["decline_offer", "accept_offer", "agree", "ask_refund", "ask_replacement", "refund_or", "either_ctx", "not_remedy", "no_show", "third_time",
        "not_good_enough", "further", "disbelief", "set_deadline"],
      suggest: [{ lt: "Mandagiai atsisakyti ir paprašyti grąžinti pinigus arba pakeisti šaldytuvą", hint: "offer" }],
      yes: (c) => { if (c.s.offerQ) acceptOffer(c); },
      no: (c) => { declineWith(c, "brenda_decline_ack"); },
      help: (c) => { askRefundOr(c); } },
    // Brenda's remedy lines end with "10 to 14 business days": that is the question.
    { id: "deadline", when: (c) => !!c.s.remedy && !c.s.over, done: (c) => !!c.s.deadline || !!c.s.over,
      ask: (c) => { if (!turn(c).timeline) B(c, "brenda_timeline_q"); },
      expects: ["set_deadline", "deadline_ctx", "agree", "ask_writing", "ask_reference", "ask_timeline", "not_good_enough"],
      suggest: [{ lt: "Nustatyti terminą (pvz., iki penktadienio)", hint: "deadline" }, { lt: "Sutikti ir paprašyti patvirtinimo raštu", hint: "confirm" }],
      yes: (c) => { c.s.deadline = "accepted"; B(c, "brenda_ok"); },
      no: (c) => { B(c, "brenda_which_day"); expectWhichDay(c); },
      help: (c) => { letsSayFriday(c); } },
    { id: "confirm", when: (c) => !!c.s.remedy && deadlineSet(c) && !c.s.over, done: (c) => !!c.s.confirmed || !!c.s.over,
      ask: (c) => B(c, "brenda_confirm_q"),
      expects: ["ask_writing", "agree", "appreciate", "ask_reference", "set_deadline", "deadline_ctx"],
      suggest: [{ lt: "Sutikti ir paprašyti patvirtinimo raštu", hint: "confirm" }],
      yes: (c) => { c.s.confirmed = true; B(c, "brenda_ok"); },
      no: (c) => { B(c, "brenda_which_day"); expectWhichDay(c); } },
    { id: "reference", when: (c) => !c.s.over && ((!!c.s.remedy && (!!c.s.confirmed || c.s.deadline === "accepted")) || !!c.s.offerClosed),
      done: (c) => !!c.s.ref || !!c.s.over,
      ask: (c) => B(c, "brenda_ref_pen"),
      expects: ["pen_ready", "no_pen", "pen_wait", "ask_reference", "ref_readback", "readback_unknown"],
      suggest: [{ lt: "Pasakyti, kad turi rašiklį, ir užsirašyti numerį", hint: "reference" }, { lt: "Paprašyti pakartoti", hint: "g_clarify" }],
      yes: (c) => { giveRef(c); },
      no: (c) => { B(c, "brenda_no_pen"); giveRef(c); } },
  ],

  init: (c) => {
    c.s.pluggedTwist = c.chance(0.5);
    c.s.offerKind = c.chance(0.6) ? "coupon" : "visit";
    c.s.longHold = c.chance(0.5);
  },

  start: (c) => {
    if (c.s.longHold) c.twist("long_hold");
    holdMessage(c, !!c.s.longHold);
    K(c, c.s.longHold ? "kyle_greet_hold" : "kyle_greet");
    c.hold();
  },

  handlers: {
    ...Object.fromEntries(INTENT_IDS.map((id) => [id, handle(id)])),
    // global skills with a meaning here
    g_bye(c) { endCall(c); },
    g_thanks(c, slots) {
      if (c.s.over) return;
      if (atTransfer(c)) { transferNow(c, "yes"); return; }
      if (atPlugged(c)) { pluggedAnswered(c); return; }
      // right before Brenda's closing (she thanks the learner herself), or the coupon taken and closed
      const conv = (c as ConvCtx).conv;
      if (c.s.transferred && !c.s.__finished && !conv.nextStep(c as ConvCtx)) return;
      GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
    },
    g_ok(c) {
      if (atTransfer(c)) transferNow(c, "yes");
      else if (atPlugged(c)) pluggedAnswered(c);
    },
    g_repeat(c, slots) { repeatLast(c, slots); },
    // "Wait, let me find a pen.": one "Take your time."
    g_wait(c, slots) { if (once(c, "b_wait")) GLOBAL_HANDLERS.g_wait(c as ConvCtx, slots); else c.hold(); },
  },

  finish: (c) => {
    if (c.s.over) return;
    if (c.s.remedy) {
      succeed(c);
      B(c, "brenda_thanks");
      B(c, "brenda_anything");
      expectClosing(c);
      return;
    }
    if (c.s.accepted) endCall(c);
  },

  tests: [
    // the spec's test utterances
    { say: "Hi, I'd like to make a complaint.", intent: "complain_open", step: "problem" },
    { say: "My new fridge stopped working, and the technician never came.", intent: "fridge_broke", step: "problem" },
    { say: "I want to make a reclamation.", intent: "complain_open", step: "problem" },
    { say: "Yes, it's plugged in. I've already checked that.", intent: "plugged_yes", step: "plugged" },
    { say: "It's Tomas Mikalauskas.", intent: "intro_ctx", step: "name" },
    { say: "This is the third time I've called.", intent: "third_time", step: "history" },
    { say: "This is the third time I call.", intent: "third_time", step: "history" },
    { say: "I'm afraid that's not good enough.", intent: "not_good_enough", step: "history" },
    { say: "Could I speak to your manager, please?", intent: "ask_manager", step: "history" },
    { say: "Give me your manager!", intent: "ask_manager", step: "history" },
    { say: "That's fine, I've got all day.", intent: "can_hold", step: "transfer" },
    { say: "Thank you, but you can keep the mug.", intent: "decline_offer", step: "offer" },
    { say: "I expect a full refund.", intent: "ask_refund", step: "offer" },
    { say: "I'd like a refund or a replacement.", intent: "refund_or", step: "offer" },
    { say: "I'd like this resolved by Friday, not someday.", intent: "set_deadline", step: "deadline", slots: { day: "friday" } },
    { say: "I'd like this resolved until Friday.", intent: "set_deadline", step: "deadline" },
    { say: "Can I have that in writing?", intent: "ask_writing", step: "confirm" },
    { say: "Yes, go ahead.", intent: "pen_ready", step: "reference" },
    { say: "H H 4 4 7 1, got it.", intent: "ref_readback", step: "reference" },
    { say: "I appreciate your help, I truly do.", intent: "appreciate" },
    { say: "You people are useless!", intent: "rude" },
    // the complaint and what happened
    { say: "I'm calling about my fridge.", intent: "complain_open", step: "problem" },
    { say: "I'm ringing about my fridge.", intent: "complain_open", step: "problem" },
    { say: "I have a problem with my refrigerator.", intent: "complain_open", step: "problem" },
    { say: "I'd like to make a complaint about my fridge. It stopped working last Tuesday.", intent: "complain_open", step: "problem" },
    { say: "My fridge doesn't work anymore.", intent: "fridge_broke", step: "problem" },
    { say: "It's not working already three days.", intent: "fridge_broke", step: "problem" },
    { say: "All my food went bad.", intent: "fridge_broke" },
    { say: "I bought it three weeks ago.", intent: "fridge_broke", step: "problem" },
    { say: "It hummed a tune and went still.", intent: "fridge_broke", step: "problem" },
    { say: "Nobody came. I waited all day.", intent: "no_show", step: "problem" },
    { say: "The repairman never showed up.", intent: "no_show", step: "history" },
    { say: "The engineer didn't come.", intent: "no_show", step: "history" },
    { say: "I took a day off, and nobody came.", intent: "no_show", step: "offer" },
    { say: "Completed? Are you serious?", intent: "disbelief", step: "history" },
    { say: "That's not true.", intent: "disbelief", step: "history" },
    { say: "Hi, this is Tomas Mikalauskas.", intent: "intro_this_ctx", step: "problem" },
    { say: "I'm calling because my fridge stopped working.", intent: "complain_open", step: "problem", not: ["intro_name"] },
    // three calls, not good enough, the manager
    { say: "I have called three times already.", intent: "third_time", step: "history" },
    { say: "I called on Thursday and on Monday.", intent: "third_time", step: "history" },
    { say: "I know it's not your fault, but this is the third time I've called.", intent: "not_good_enough", step: "history" },
    { say: "I don't want another visit.", intent: "not_good_enough", step: "history", not: ["accept_offer"] },
    { say: "Tuesday is too late.", intent: "not_good_enough", step: "history", not: ["accept_offer"] },
    { say: "I'd like to speak to a supervisor.", intent: "ask_manager", step: "history" },
    { say: "Is there someone else I could talk to?", intent: "ask_manager", step: "history" },
    { say: "I want to speak to the manager.", intent: "ask_manager", step: "history" },
    { say: "I don't want to talk to your manager.", intent: "no_manager", step: "history", not: ["ask_manager"] },
    { say: "Otherwise, I'll be taking this further.", intent: "further", step: "history" },
    { say: "I'll write a bad review.", intent: "further" },
    { say: "Okay, next Tuesday is fine.", intent: "accept_offer", step: "history" },
    { say: "I want a refund, not another visit.", intent: "ask_refund", step: "history", not: ["accept_offer"] },
    // Kyle's script, the name, the hold
    { say: "Of course it's plugged in, I'm not stupid!", intent: "plugged_yes", step: "plugged" },
    { say: "I turned it off and on again.", intent: "plugged_yes", step: "plugged" },
    { say: "My name is Tomas Mikalauskas.", intent: "intro_name", step: "name" },
    { say: "Tomas.", intent: "intro_ctx", step: "name" },
    { say: "Tomas", intent: "none" },
    { say: "Sure, I can hold.", intent: "can_hold", step: "transfer" },
    { say: "No, I can't wait any longer.", intent: "cant_hold", step: "transfer", not: ["can_hold"] },
    // Brenda's offer
    { say: "Keep your coupon, Brenda, and keep your little mug.", intent: "decline_offer", step: "offer" },
    { say: "A coupon isn't enough.", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "I don't need a coupon.", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "Wednesday doesn't work for me.", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "I won't take the coupon.", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "I can't take another day off.", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "I'll take the coupon.", intent: "accept_offer", step: "offer" },
    { say: "Wednesday is fine.", intent: "accept_offer", step: "offer" },
    { say: "I want my money back.", intent: "ask_refund", step: "offer" },
    { say: "Give me my money back!", intent: "ask_refund", step: "offer" },
    { say: "Could I get a new one?", intent: "ask_replacement", step: "offer" },
    { say: "I want to change the fridge.", intent: "ask_replacement", step: "offer" },
    { say: "Could you replace it by Friday?", intent: "ask_replacement", step: "offer", slots: { day: "friday" } },
    { say: "Actually, could I get a refund instead?", intent: "ask_refund", step: "deadline" },
    { say: "Either is fine.", intent: "either_ctx", step: "offer" },
    { say: "I don't want a refund.", intent: "not_remedy", step: "offer", not: ["ask_refund"] },
    { say: "I want a new fridge or my money back.", intent: "refund_or", step: "offer" },
    // the deadline, in writing, the reference number
    { say: "As soon as possible, please.", intent: "set_deadline", step: "deadline" },
    { say: "Two weeks is too long, I'm afraid.", intent: "set_deadline", step: "deadline" },
    { say: "Could it be sooner?", intent: "set_deadline", step: "deadline" },
    { say: "Friday.", intent: "deadline_ctx", step: "deadline", slots: { day: "friday" } },
    { say: "Friday.", intent: "none" },
    { say: "I need it fixed by Thursday.", intent: "set_deadline", step: "history", slots: { day: "thursday" } },
    { say: "Could you confirm that by email?", intent: "ask_writing", step: "confirm" },
    { say: "Can I have it in written?", intent: "ask_writing", step: "confirm" },
    { say: "Could I have a reference number, please?", intent: "ask_reference" },
    { say: "Can I have the number of my complaint?", intent: "ask_reference" },
    { say: "I don't have a pen.", intent: "no_pen", step: "reference", not: ["pen_ready"] },
    { say: "HH 4472?", intent: "readback_unknown", step: "reference", slots: { digits: "4472" } },
    { say: "Sorry, could you repeat that?", intent: "ask_repeat" },
    { say: "How long will the refund take?", intent: "ask_timeline", step: "deadline" },
    { say: "Will you take the old fridge?", intent: "ask_pickup", step: "deadline" },
    // goodbye, leaving, rudeness
    { say: "Have a nice day.", intent: "have_nice_day" },
    { say: "Forget it, I'll call back later.", intent: "walk_away" },
    { say: "I'll go to another store.", intent: "walk_away" },
    { say: "This is ridiculous!", intent: "rude" },
    { say: "Are you kidding me?", intent: "rude" },
    { say: "I'm very angry.", intent: "rude" },
    // nothing understood (and never the opposite meaning)
    { say: "Purple bananas dance on the roof", intent: "none" },
    { say: "My cat is very happy today", intent: "none" },
    { say: "I didn't make a complaint", intent: "none" },
    { say: "My fridge is working fine", intent: "none" },
  ],

  // Brenda's offer is pinned where the script answers it (the mug, Wednesday); the plugged-in question comes on
  // some seeds only (AUTO answers it), except in the sims about it.
  sims: [
    { name: "happy path: a refund by Friday, in writing", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["Hi, I'd like to make a complaint.", "My new fridge stopped working, and the technician never came.", "It's Tomas Mikalauskas.",
        "This is the third time I've called. Could I speak to your manager, please?", "That's fine, I've got all day.",
        "Thank you, but you can keep the mug. I expect a full refund.", "I'd like this resolved by Friday, not someday.",
        "Yes, that works. Can I have that in writing?", "Yes, go ahead.", "HH-4471, got it.", "No, that's all. I appreciate your help, I truly do."],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", writing: true, ref: true, thirdSaid: true, outcome: "success" } }, auto: AUTO },
    { name: "short answers, questions and a change of mind", setup: (s) => { s.offerKind = "visit"; },
      turns: ["Hello?", "I'm calling about my fridge.", "It stopped working last Tuesday. All my food went bad.", "Tomas.", "Completed? Nobody came!",
        "I'm afraid that's not good enough.", "Yes, please.", "Sure, I can hold.", "I took a day off, and nobody came.", "Could I get a new one?",
        "Will you take the old fridge?", "Actually, could I get a refund instead?", "As soon as possible, please.", "Could you confirm that by email?",
        "No, I don't have a pen.", "Thank you!"],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", writing: true, ref: true } }, auto: AUTO },
    { name: "plugged in (twist): a calm answer, then a replacement", setup: (s) => { s.pluggedTwist = true; },
      turns: ["I'd like to make a complaint. My fridge stopped working.", "Yes, it's plugged in. I've already checked that.", "My name is Tomas Mikalauskas.",
        "Could I speak to your manager, please?", "Sure, I can hold.", "I'd like a replacement, please.", "That works for me.", "Yes, go ahead.", "Thanks, bye!"],
      expect: { complete: true, state: { pluggedDone: true, remedy: "replacement", deadline: "accepted", ref: true } }, auto: AUTO },
    { name: "plugged in (twist): rude, then polite and firm", setup: (s) => { s.pluggedTwist = true; s.offerKind = "coupon"; },
      turns: ["My fridge is broken!", "Of course it's plugged in, I'm not stupid!", "Tomas Mikalauskas.", "You people are useless!",
        "I know it's not your fault, but this is the third time I've called.", "Yes, please.", "I've got all day.", "This is ridiculous!",
        "I expect a full refund.", "By Friday, please.", "Yes.", "Go ahead.", "Thank you, bye!"],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", thirdSaid: true, rudeK: 2, rudeB: 1 } }, auto: AUTO },
    { name: "Wednesday (twist): no, a day off, either, too long", setup: (s) => { s.offerKind = "visit"; },
      turns: ["I'm calling about my fridge. It stopped working, and nobody came.", "It's Tomas Mikalauskas.", "I'd like to speak to a supervisor.", "Sure.",
        "Wednesday doesn't work for me. I already took a day off, and nobody came.", "I'd like a refund or a replacement.", "Either is fine.",
        "Two weeks is too long, I'm afraid.", "Thursday.", "Yes, that works for me.", "Yes.", "H H 4 4 7 1.", "Thank you so much for your help."],
      expect: { complete: true, state: { remedy: "replacement", deadline: "thursday", ref: true } }, auto: AUTO },
    { name: "a refund asked of Kyle: Brenda goes straight to it", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["My fridge stopped working, and the technician never came.", "Tomas.", "I want a full refund.", "Yes.", "I've got all day.",
        "Keep your coupon, Brenda, and keep your little mug.", "That works.", "Go ahead.", "Thanks!"],
      expect: { complete: true, state: { remedy: "refund", wish: "refund", deadline: "accepted" } }, auto: AUTO },
    { name: "a deadline and the reference number from Kyle",
      turns: ["I'd like to make a complaint. My fridge broke.", "My name is Tomas Mikalauskas.", "I need it by Friday.", "Could I have a reference number?",
        "Could I speak to your manager, please?", "Sure.", "I'd like a replacement.", "Yes, that works.", "Thank you!"],
      expect: { complete: true, state: { refByKyle: true, deadline: "friday", remedy: "replacement" } }, auto: AUTO },
    { name: "the coupon taken (not done)", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["I have a problem with my fridge. It doesn't work.", "Tomas.", "Could I speak to your manager?", "Okay.", "I'll take the coupon.",
        "No, that's all.", "Yes, go ahead.", "Thanks, bye."],
      expect: { complete: false, state: { accepted: "coupon", outcome: "partial", ref: true } }, auto: AUTO },
    { name: "Wednesday taken (not done)", setup: (s) => { s.offerKind = "visit"; },
      turns: ["My fridge stopped working.", "Tomas Mikalauskas.", "Can I talk to your boss?", "Sure.", "Wednesday is fine.", "No, thank you.", "Okay.", "Bye."],
      expect: { complete: false, state: { accepted: "visit", outcome: "partial" } }, auto: AUTO },
    { name: "next Tuesday with Kyle (not done)",
      turns: ["My fridge stopped working.", "Tomas Mikalauskas.", "Okay.", "Yes, please."],
      expect: { complete: false, state: { accepted: "tuesday", outcome: "partial" } }, auto: AUTO },
    { name: "walking away from Kyle (not done)",
      turns: ["My fridge stopped working.", "Forget it. I'll call back later."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO },
    { name: "walking away from Brenda (not done)", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["My fridge stopped working.", "Tomas.", "Could I speak to your manager?", "Sure.", "I don't have time for this."],
      expect: { complete: false, state: { outcome: "walked", transferred: true } }, auto: AUTO },
  ],
};

/** "Can I help you with anything else?" at the end of a successful call. */
function expectClosing(c: Ctx) {
  const again = (cc: Ctx) => { B(cc, "brenda_anything"); expectClosing(cc); };
  const p: Pending = {
    id: "closing", expects: ["appreciate", "thats_all", "have_nice_day", "ask_writing", "ask_reference", "ask_timeline", "ask_pickup"], hints: ["closing"],
    suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "closing" }, { lt: "Paprašyti patvirtinimo raštu", hint: "confirm" }],
    on: {
      appreciate: (cc) => { closeBye(cc, true); },
      thats_all: (cc) => { closeBye(cc); }, have_nice_day: (cc) => { closeBye(cc); },
      g_thanks: (cc) => { closeBye(cc); }, g_bye: (cc) => { closeBye(cc); },
      ask_writing: (cc) => { cc.s.writing = true; B(cc, "brenda_writing_ok"); again(cc); },
      ask_reference: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); again(cc); },
      ask_timeline: (cc) => { B(cc, cc.s.remedy === "refund" ? "brenda_refund_time" : "brenda_timeline"); if (deadlineSet(cc)) dayLine(cc, cc.s.deadline); again(cc); },
      ask_pickup: (cc) => { B(cc, "brenda_pickup_yes"); again(cc); },
    },
    yes: (cc) => { B(cc, "g_yes_what"); expectClosing(cc); },
    no: (cc) => { closeBye(cc); },
  };
  c.expect(p);
}

export default complaint;
