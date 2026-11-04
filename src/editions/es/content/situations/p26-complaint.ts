// NEEDS: Days, time windows, the order number, merges and the folio are local. Two shared notes (review, 4 Nov 2026):
//   (1) {number} in src/editions/es/convo/slots.ts reads "cincuenta y ocho mil doscientos trece" as 58 (a compound
//   before "mil" is not taken on), so the order number said whole is spelled out in @order_whole here;
//   (2) audio for the new line brenda_only_wed (tools/build-audio.ts).
// Song P26 "I'd Like to Make a Complaint" → Puerto Colibrí: "Quiero poner una queja". A formal complaint on the phone
// (usted both ways). Three weeks ago the learner bought a sofa at Hogar Puerto, the town's furniture store ($12,999).
// It was due on October 10th and came only on the 17th ("llegó hasta el 17"), with a broken leg and torn fabric; a
// technician was booked for Monday between 8 and 12 and never came. This is the third call. Jorge, the first-line
// agent, sticks to his script (twist: "¿Ya revisó que esté bien armado?", the furniture store's "Is it plugged in?"),
// asks for the order number or the name on the order ("¿A nombre de quién está el pedido?"), reads the file (the
// missed visit shows as… ¿realizada?) and offers another visit next Tuesday. The learner says it's the third call,
// asks for the manager and holds ("Tengo todo el día"). Brenda, the customer care manager, tries the cheap fix first
// (twist: a $500 coupon and a Hogar Puerto cushion, or a technician on Wednesday between 10 and 2); the learner
// declines politely, asks for a refund or a new sofa ("Le pido de la manera más atenta…", "Exijo…"), sets a deadline
// ("a más tardar el viernes, no algún día"), asks for it in writing and takes down the folio HP-4471. A threat to go
// to PROFECO (Mexico's federal consumer agency, real and public) is the Spanish "I'll be taking this further".
// Endings as in the English: success (refund or new sofa + the folio: done); partial (the coupon or Wednesday taken,
// or next Tuesday with Jorge: not done); walked away (not done). Rudeness gets a calm reply and a tip, never a failure.
// Rule 17: "Está bien, gracias" to Brenda's offer gets "Entonces, ¿le mando el cupón?" before anything is booked.
// Mexican-only words in lines (with neutral twins): "llegó hasta el 17" (= didn't arrive until the 17th), ahorita.
// Facts kept vague (not sourced, not taught): what PROFECO would do with the complaint, legal rights and deadlines,
// how a card refund is processed; the 10–14 business days are Hogar Puerto's own in-world estimate, as in the English.
// The recorded hold message speaks with npcs.ts harbor_bot ("Mensaje grabado").

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_EL_DAY = "el + day: Spanish says el viernes where English says on Friday.";
const F_A_CALL = "a: Spanish puts a before the place you call; English has no word here.";
const F_YOU_LO = "lo / la: you (lo for a man, la for a woman).";
const F_FOLIO = "folio: the number a Mexican company or office gives your case or complaint.";
const F_EL_NUM = "el (número): Spanish puts an article before a code or number; English has no word here.";
const F_PATA = "pata: the leg of a piece of furniture (a person's leg is pierna).";
const F_LE_OFREZCO = "Le ofrezco una disculpa: a formal Mexican way to say I apologize.";

// ---------------------------------------------------------------------------
// Days for the deadline (lines use {X}; "mañana" has its own lines)

const DAYS: EntityDef[] = [
  ent("monday", "lunes", "Monday", "m"),
  ent("tuesday", "martes", "Tuesday", "m"),
  ent("wednesday", "miércoles", "Wednesday", "m"),
  ent("thursday", "jueves", "Thursday", "m"),
  ent("friday", "viernes", "Friday", "m"),
  ent("saturday", "sábado", "Saturday", "m"),
  ent("sunday", "domingo", "Sunday", "m"),
];
const DAY_IDS = new Set([...DAYS.map((d) => d.id), "tomorrow"]);

/** The folio (a value placeholder, as in s80). */
const REF = { en: "HP-4471", lt: "HP-4471", say: "hache, pe, cuatro, cuatro, siete, uno" };
const REF_WRITE = "Folio de Hogar Puerto: HP-4471";
/** The order number in the intro. */
const ORDER = "58213";
const PRICE = 1299900;
const COUPON = 50000;
/** Time windows: en = the Spanish text, lt = its English gloss, say = spoken Spanish (the edition's field names). */
const W_MON = { en: "las 8 y las 12", lt: "8 and 12", say: "las ocho y las doce" };
const W_WED = { en: "las 10 y las 2", lt: "10 and 2", say: "las diez y las dos" };

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
/** Jorge's lines with "señor" / "señora". */
const KG = (c: Ctx, base: string) => K(c, `${base}_${c.player.gender === "f" ? "f" : "m"}`);

const pluggedOk = (c: Ctx) => !c.s.pluggedTwist || !!c.s.pluggedDone;
const nameDone = (c: Ctx) => !!c.s.named || (c.s.nameAsked ?? 0) >= 2;
const atTransfer = (c: Ctx) => !c.s.transferred && c.step === "transfer";
const atPlugged = (c: Ctx) => !c.s.transferred && c.step === "plugged" && !c.s.pluggedDone;
/** A real deadline (a day, or "lo antes posible" → Friday), not just "de 10 a 14 días está bien". */
const deadlineSet = (c: Ctx) => !!c.s.deadline && c.s.deadline !== "accepted";
/** What the learner said, lowercase and without accents. */
const heard = (c: Ctx) => c.heard.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const REMEDY_WORDS = /\b(reembols\w*|refund|devuelv\w*|regres\w* (el|mi) dinero|mi dinero|el dinero|cambio|cambien|cambiar|cambiemelo|cambienmelo|nuevo|otro sofa|reemplac\w*|repong\w*|reposicion)\b/;
/** The refused remedy of "No quiero un sofá nuevo" (what is left may still ask for the other one). */
const NOT_REMEDY = /\bno (quiero|necesito) (que me (devuelvan|regresen|reembolsen) (el|mi) dinero|que me lo cambien|(un |el |mi |otro |ningun )?(reembolso|dinero|cambio|sofa nuevo|uno nuevo|otro sofa|sofa))\b/g;
const DAY_OFF = /\b(falte|pedi (el dia|permiso|un dia)|me tome (el dia|un dia)|me quede en casa|nadie (vino|llego)|nunca (vino|llego))\b/;
/** "Sí, me parece bien. ¿Me lo puede dar por escrito?": Brenda's answer about the writing is the reply. */
const YES_START = /^\W*(si|claro|ok|okey|esta bien|me parece bien|perfecto|de acuerdo|sale|va|vale|bueno|me funciona|me sirve|me queda bien)\b/;
const ASKS_WRITING = /\b(escrito|correo|email|mail|confirm\w*)\b/;

/** "para el viernes" → friday; "mañana" → tomorrow; "lo antes posible", "hoy", "la próxima semana" → asap (Brenda
 *  says "Digamos el viernes, entonces."); "dos semanas es demasiado" → toolong. */
function deadlineOf(slots: any, tags: string[]): string | undefined {
  if (tags.includes("toolong")) return "toolong";
  const raw = slots?.day;
  const d = Array.isArray(raw) ? raw[0] : raw;
  if (typeof d === "string" && DAY_IDS.has(d)) return d;
  if (d || tags.includes("asap")) return "asap";
  return undefined;
}

/** The order number said: digit by digit or in pairs ({digits}), or whole ("cincuenta y ocho mil…", @order_whole). */
const orderOf = (slots: any, seg?: Segment) => (seg?.tags.includes("rightorder") ? ORDER : String(slots?.digits ?? ""));

/** Facts the learner mentions, wherever they come (Jorge's part): nothing is asked again later. */
function recordFacts(c: Ctx, intent: string, slots: any, seg: Segment) {
  const s = c.s;
  if (intent === "third_time" || (intent === "not_good_enough" && seg.tags.includes("third"))) s.thirdSaid = true;
  if (s.transferred) return;
  switch (intent) {
    case "fridge_broke":
      if (!s.problem) { s.problem = "sofa"; turn(c).problemNew = true; }
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
    case "order_num": case "order_ctx":
      if (orderOf(slots, seg) === ORDER) { s.named = true; s.order = true; }
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
  c.speaker("harbor_bot");
  c.say("hold_msg");
  if (long) c.say("hold_long");
}

/** Jorge puts the learner through to Brenda ("¿Puede esperar en la línea?" – any answer is a yes). */
function transferNow(c: Ctx, kind: "yes" | "no" | "allday") {
  if (c.s.transferred || c.s.over) return;
  K(c, kind === "allday" ? "kyle_hold_ok" : kind === "no" ? "kyle_hold_no" : "kyle_thanks_hold");
  holdMessage(c, false);
  c.s.transferred = true;
  B(c, "brenda_hi");
  B(c, "brenda_hi2");
}

const OUTRO: Record<string, string> = {
  replacement: "A week later the new sofa arrives on time, all four legs included. You sit down at last.",
  refund: "The money is back, and you never needed that Hogar Puerto cushion.",
  coupon: "You've got a coupon and a cushion… and the sofa still wobbles. Try again: politely but firmly ask for a refund or a new sofa.",
  visit: "Another \"between 10 and 2\"… Will anyone show up this time? Try again and ask for the manager, a refund or a new sofa.",
  tuesday: "Another visit \"next Tuesday\"… Will anyone show up this time? Try again and ask for the manager, a refund or a new sofa.",
  walked: "You hung up, and the sofa still wobbles. Try again: maybe the fourth call is the lucky one.",
};
function outro(c: Ctx, outcome: string, key: string) {
  c.s.outcome = outcome;
  c.event("outro", { outcome, lt: OUTRO[key] });
}

/** Partial ending with Jorge: one more visit next Tuesday (not done). */
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

/** Success: the remedy is approved and the folio given. */
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
  if (appreciated || /\b(agradezco|amable|ayuda)\b/.test(heard(c))) B(c, "brenda_appreciate_reply");
  B(c, c.s.remedy === "replacement" ? "brenda_bye_new" : "brenda_bye");
  c.s.over = true;
  c.end();
  c.hold();
}

/** "Adiós", "Olvídelo", "Le llamo luego": after the remedy it is a normal goodbye (the folio first, if it wasn't
 *  given); after taking the coupon or the visit it is the partial ending; before that the learner walks away. */
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
// Jorge

function kApologize(c: Ctx) { if (once(c, "k_ack")) K(c, "kyle_apologize"); }

function pluggedAnswered(c: Ctx) {
  if (c.s.pluggedDone) return;
  c.s.pluggedDone = true;
  if (once(c, "k_ack")) K(c, "kyle_plugged_ok");
}

/** "No, no lo he revisado." to "¿Ya revisó que esté bien armado?" (or "No." to "¿Y ya intentó apretar los
 *  tornillos?"): Jorge asks the learner to check; whatever the answer, the leg is still broken. */
function plugNow(c: Ctx) {
  if (c.s.pluggedDone) return;
  c.s.pluggedDone = true;
  if (!once(c, "k_ack")) return;
  K(c, c.s.offOn ? "kyle_try_now" : "kyle_plug_now");
  const still = (cc: Ctx) => { if (once(cc, "k_ack")) K(cc, "kyle_still_nothing"); };
  c.expect({
    id: "plug_now", optional: true, expects: ["plugged_yes", "fridge_broke", "still_ctx"], hints: ["plugged"],
    suggest: [{ lt: "Say it's still the same", hint: "plugged" }],
    on: { plugged_yes: still, fridge_broke: still, plugged_no_ctx: still, still_ctx: still },
    yes: still, no: still,
  });
}

/** "¿Le gustaría hablar con mi gerente?" */
function offerManager(c: Ctx) {
  K(c, "kyle_offer_manager");
  c.expect({
    id: "offer_manager", expects: ["ask_manager", "further", "agree", "accept_offer", "decline_offer", "no_manager"], hints: ["g_yesno", "escalate"],
    suggest: [{ lt: "Agree to talk to the manager", hint: "g_yesno" }, { lt: "Ask for the manager", hint: "escalate" }],
    on: {
      ask_manager: (cc) => { escalateNow(cc); }, further: (cc) => { escalateNow(cc); }, agree: (cc) => { escalateNow(cc); },
      accept_offer: (cc) => { tuesdayEnding(cc); },
      no_manager: (cc) => { K(cc, "kyle_earliest"); askBookTuesday(cc); },
    },
    yes: (cc) => { escalateNow(cc); },
    // no manager: then it's next Tuesday ("¿Le agendo la visita para el próximo martes?")
    no: (cc) => { K(cc, "kyle_earliest"); askBookTuesday(cc); },
    ask: (cc) => K(cc, "kyle_offer_manager"),
  });
}

/** The learner agrees to the manager: the transfer step comes next. */
function escalateNow(c: Ctx) { c.s.escalated = true; }

/** A bare "Sí" / "Está bien" to Jorge's Tuesday offer: he makes sure before booking it. */
function askBookTuesday(c: Ctx) {
  K(c, "kyle_book_q");
  c.expect({
    id: "book_tuesday", expects: ["accept_offer", "agree", "decline_offer", "not_good_enough", "ask_manager", "further", "third_time"], hints: ["escalate", "g_yesno"],
    suggest: [{ lt: "Say no and ask for the manager", hint: "escalate" }, { lt: "Agree (one more visit, then)", hint: "g_yesno" }],
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

/** An order number on the name step: the right one is found; another one isn't ("¿Me da su nombre completo?"). */
function kyleOrder(c: Ctx, slots: any, seg?: Segment) {
  if (c.step !== "name" || !once(c, "k_name")) return;
  if (orderOf(slots, seg) === ORDER) { K(c, "kyle_name_thanks"); return; }
  if (c.s.named) return;
  c.s.nameAsked = Math.max(1, c.s.nameAsked ?? 0);
  K(c, "kyle_order_unknown");
  c.hold();
}

/** Jorge's reaction to each intent (before the transfer). */
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
  either_ctx: () => { /* only Brenda asks "¿reembolso o cambio?" */ },
  not_remedy: (c) => { kApologize(c); },
  set_deadline: (c, slots, seg) => { kyleDeadline(c, slots, seg); },
  deadline_ctx: (c, slots, seg) => { kyleDeadline(c, slots, seg); },
  ask_writing: (c) => { if (once(c, "k_info")) K(c, "kyle_writing"); },
  ask_reference: (c) => { c.s.ref = true; c.s.refByKyle = true; if (once(c, "k_info")) K(c, "kyle_ref", { text: REF }); },
  accept_offer: (c) => { if (c.s.fileRead && !c.s.escalated) tuesdayEnding(c); },
  // "Me parece bien." to the Tuesday offer: Jorge makes sure first (it may be sarcasm after "¿realizada?")
  agree: (c) => { if (c.s.fileRead && !c.s.escalated && (c.s.histN ?? 0) <= 2) askBookTuesday(c); },
  intro_name: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  intro_ctx: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  intro_this_ctx: (c) => { if (c.step === "name" && once(c, "k_name")) K(c, "kyle_name_thanks"); },
  order_num: (c, slots, seg) => { kyleOrder(c, slots, seg); },
  order_ctx: (c, slots, seg) => { kyleOrder(c, slots, seg); },
  still_ctx: () => { /* answered by the "¿bien armado?" questions */ },
  appreciate: (c) => { if (once(c, "k_ack")) K(c, "g_welcome"); },
  have_nice_day: (c) => { endCall(c); },
  walk_away: (c) => { endCall(c, true); },
  rude: (c) => { kyleRude(c); },
  ask_repeat: (c, slots) => { repeatLast(c, slots); },
};

/** The manager asked for before Jorge has the details or has read the file: those first. */
function kyleManagerFirst(c: Ctx) {
  if (!once(c, "k_ack")) return;
  if (!c.s.problem || !nameDone(c) || !pluggedOk(c)) K(c, "kyle_manager_first");
  else if (!c.s.fileRead) K(c, "kyle_manager_file");
}

/** "Quiero un reembolso" to Jorge: only the manager can approve it (on the history step he offers her at once). */
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

/** The offer was declined: straight to the remedy the learner already asked for, else "¿Qué le gustaría que
 *  hiciéramos?" (the offer step asks again). */
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
    suggest: [{ lt: "Choose: your money back or a new sofa", hint: "offer" }],
    on: {
      ask_refund: (cc) => { grant(cc, "refund"); }, ask_replacement: (cc) => { grant(cc, "replacement"); },
      // "Cualquiera / lo que sea más rápido / un reembolso o un cambio": the new sofa
      either_ctx: (cc) => { grant(cc, "replacement"); }, refund_or: (cc) => { grant(cc, "replacement"); },
    },
    yes: (cc) => { askRefundOr(cc); }, no: (cc) => { askRefundOr(cc); },
    ask: (cc) => B(cc, "brenda_refund_or"),
  });
}

/** Brenda approves a refund or a new sofa (a change of mind switches it). */
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
  // "¿Prefiere un reembolso o un cambio?" is answered now: it must not come back after later answers
  const conv = (c as ConvCtx).conv;
  if (conv?.pending?.id === "refund_or" || conv?.pending?.id === "offer_confirm") conv.pending = null;
  B(c, kind === "refund" ? "brenda_refund_ok" : "brenda_replace_ok", kind === "refund" ? { price: PRICE } : undefined);
  if (!switching) B(c, "brenda_pickup");
  B(c, kind === "refund" ? "brenda_refund_time" : "brenda_timeline");
  turn(c).timeline = true;
  if (c.s.writingPending) c.s.writing = true;
  if (deadlineSet(c)) {
    // after a change of mind the day was already agreed: only when the new remedy comes, not "¿Para el viernes?" again
    if (!switching) { if (c.s.asap) B(c, "brenda_lets_say"); else okDay(c, c.s.deadline); }
    dayLine(c, c.s.deadline);
  }
}

function okDay(c: Ctx, day: string) {
  if (day === "tomorrow") B(c, "brenda_deadline_tomorrow");
  else B(c, "brenda_deadline_ok", { X: day });
}
function dayLine(c: Ctx, day: string) {
  const refund = c.s.remedy === "refund";
  if (day === "tomorrow") B(c, refund ? "brenda_refund_tomorrow" : "brenda_delivery_tomorrow", refund ? undefined : { win: W_MON });
  else B(c, refund ? "brenda_refund_day" : "brenda_delivery_day", refund ? { X: day } : { X: day, win: W_MON });
}

function acceptOffer(c: Ctx) {
  if (c.s.remedy || c.s.accepted || c.s.over) return;
  // "Acepto el cupón, pero quiero un reembolso": the remedy request in the same breath wins
  if (REMEDY_WORDS.test(heard(c))) return;
  c.s.accepted = c.s.offerKind;
  c.s.offerQ = false;
  B(c, c.s.offerKind === "coupon" ? "brenda_partial" : "brenda_partial_visit", c.s.offerKind === "coupon" ? undefined : { win: W_WED });
  B(c, "brenda_anything");
  expectAnything(c);
}

/** Rule 17: "Está bien, gracias" to the offer could be "no, thanks": Brenda asks before booking anything. */
function askOfferConfirm(c: Ctx) {
  B(c, c.s.offerKind === "coupon" ? "brenda_check_coupon" : "brenda_check_visit");
  c.expect({
    id: "offer_confirm", expects: ["accept_offer", "agree", "decline_offer", "ask_refund", "ask_replacement", "refund_or", "offer_q"], hints: ["g_yesno", "offer"],
    suggest: [{ lt: "Say no and ask for what you want", hint: "offer" }, { lt: "Accept the offer", hint: "g_yesno" }],
    on: { accept_offer: (cc) => { acceptOffer(cc); }, agree: (cc) => { acceptOffer(cc); } },
    yes: (cc) => { acceptOffer(cc); },
    no: (cc) => { declineWith(cc, "brenda_decline_ack"); },
    ask: (cc) => B(cc, cc.s.offerKind === "coupon" ? "brenda_check_coupon" : "brenda_check_visit"),
  });
}

/** After the coupon or the visit was taken: "¿Le puedo ayudar en algo más?" A refund or a new sofa asked for now
 *  still works; "No, es todo" leaves it at the coupon (the folio, then goodbye). */
function expectAnything(c: Ctx) {
  c.expect({
    id: "anything", optional: true, expects: ["ask_refund", "ask_replacement", "refund_or", "thats_all", "ask_reference", "ask_writing", "more_yes_ctx"], hints: ["offer", "closing"],
    suggest: [{ lt: "Ask for a refund or a new sofa after all", hint: "offer" }, { lt: "Say that's all", hint: "closing" }],
    on: {
      ask_refund: (cc) => { grant(cc, "refund"); }, ask_replacement: (cc) => { grant(cc, "replacement"); }, refund_or: (cc) => { askRefundOr(cc); },
      thats_all: (cc) => { closeOffer(cc); }, g_thanks: (cc) => { closeOffer(cc); },
      ask_reference: (cc) => { closeOffer(cc); brendaRef(cc); },
      ask_writing: (cc) => { if (once(cc, "b_info")) B(cc, "brenda_writing_ok"); closeOffer(cc); },
      more_yes_ctx: (cc) => { B(cc, "g_yes_what"); expectAnything(cc); },
    },
    yes: (cc) => { B(cc, "g_yes_what"); expectAnything(cc); },
    no: (cc) => { closeOffer(cc); },
  });
}
function closeOffer(c: Ctx) { if (c.s.accepted) c.s.offerClosed = true; }

/** "¿Qué día tenía en mente?" */
function expectWhichDay(c: Ctx) {
  c.expect({
    id: "which_day", expects: ["set_deadline", "deadline_ctx"], hints: ["deadline"],
    suggest: [{ lt: "Name a day (e.g. by Friday)", hint: "deadline" }],
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
  okDay(c, d);
  dayLine(c, d);
}

function brendaWriting(c: Ctx) {
  if (!c.s.remedy) { c.s.writingPending = true; if (once(c, "b_info")) B(c, "brenda_writing_ok"); return; }
  c.s.writing = true;
  // "Sí, me parece bien. ¿Me lo puede dar por escrito?" to "de 10 a 14 días hábiles": the timeline is accepted too
  if (c.step === "deadline" && !c.s.deadline && YES_START.test(heard(c))) c.s.deadline = "accepted";
  if (c.step === "confirm") c.s.confirmed = true;
  if (once(c, "b_info")) B(c, "brenda_writing_ok");
}

/** Brenda gives the folio (and listens for the read-back). */
function giveRef(c: Ctx, asked = false) {
  if (!once(c, "b_ref")) return;
  c.s.ref = true;
  B(c, asked ? "brenda_ref_asked" : "brenda_ref", { text: REF });
  reExpectReadback(c);
}
function reExpectReadback(c: Ctx) {
  c.expect({
    id: "readback", optional: true, expects: ["ref_readback", "readback_unknown", "readback_ctx", "ask_repeat"], hints: ["reference", "g_clarify"],
    suggest: [{ lt: "Read the number back", hint: "reference" }, { lt: "Ask her to repeat it", hint: "g_clarify" }],
    on: {
      ref_readback: (cc) => { if (once(cc, "b_ack")) B(cc, "brenda_ref_correct"); },
      readback_unknown: (cc, sl) => { readBack(cc, sl); }, readback_ctx: (cc, sl) => { readBack(cc, sl); },
      ask_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
      g_repeat: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); reExpectReadback(cc); },
    },
    yes: () => { /* "Ok." – the call goes on */ }, no: () => { /* nothing to add */ },
  });
}
/** "¿HP 4472?" – a wrong number gets the number again. */
function readBack(c: Ctx, slots: any) {
  const digits = String(slots?.digits ?? "").replace(/\D/g, "");
  if (digits === "4471") { if (once(c, "b_ack")) B(c, "brenda_ref_correct"); return; }
  B(c, "brenda_ref_repeat", { text: REF });
  reExpectReadback(c);
}

/** "¿Me da un número de folio?" to Brenda (also when Jorge already gave it: she says it herself once). */
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
  not_good_enough: (c, _slots, seg) => {
    if (atOffer(c)) { declineWith(c, "brenda_decline_ack"); return; }
    // "Eso no es suficiente" to "de 10 a 14 días hábiles": too long
    if (c.s.remedy && c.step === "deadline") { brendaDeadline(c, {}, { ...seg, tags: [...seg.tags, "toolong"] }); return; }
    if (once(c, "b_ack")) B(c, "brenda_decline_ack");
  },
  // "El miércoles no puedo. Ya falté al trabajo una vez y nadie vino.": the missed day gets the answer
  decline_offer: (c) => { if (atOffer(c)) declineWith(c, DAY_OFF.test(heard(c)) ? "brenda_day_off" : "brenda_decline_ack"); },
  ask_manager: (c) => { if (atOffer(c)) declineWith(c, "brenda_is_manager"); else if (once(c, "b_ack")) B(c, "brenda_is_manager"); },
  further: (c) => { if (atOffer(c)) declineWith(c, "brenda_further"); else if (once(c, "b_ack")) B(c, "brenda_further"); },
  accept_offer: (c) => { if (atOffer(c) && c.s.offerQ) acceptOffer(c); },
  // "¿Cuánto vale el cupón?", "¿Y si acepto la visita?": the facts of the offer, then the question again
  offer_q: (c) => {
    if (!atOffer(c) || !once(c, "b_info")) return;
    B(c, c.s.offerKind === "coupon" ? "brenda_coupon_info" : "brenda_visit_info", c.s.offerKind === "coupon" ? { price: COUPON } : { win: W_WED });
    c.s.offerQ = true;
    B(c, "brenda_offer_q");
    c.hold();
  },
  // "¿Pueden venir el jueves?": only Wednesday, then her question again; asked again, it is a no to Wednesday
  other_day_ctx: (c) => {
    if (!atOffer(c) || c.s.offerKind !== "visit" || !c.s.offerQ || !once(c, "b_info")) return;
    if (c.s.onlyWed) { declineWith(c, "brenda_decline_ack"); return; }
    c.s.onlyWed = true;
    B(c, "brenda_only_wed", { win: W_WED });
    B(c, "brenda_offer_q");
    c.hold();
  },
  // "No, no estoy de acuerdo" to the 10 to 14 days or to "¿Está usted de acuerdo?": she asks for a day
  disagree_ctx: (c) => {
    if (!c.s.remedy || (c.step !== "deadline" && c.step !== "confirm") || !once(c, "b_ack")) return;
    c.s.confirmed = false;
    B(c, "brenda_which_day");
    expectWhichDay(c);
  },
  readback_ctx: (c, slots) => { if (c.s.ref) readBack(c, slots); },
  agree: (c) => { brendaYes(c); },
  ask_refund: (c, slots, seg) => { deadlineFact(c, slots, seg); grant(c, "refund"); },
  ask_replacement: (c, slots, seg) => { deadlineFact(c, slots, seg); grant(c, "replacement"); },
  refund_or: (c) => { if (!c.s.remedy) askRefundOr(c); },
  either_ctx: (c) => { if (!c.s.remedy) grant(c, "replacement"); },
  // "No quiero un sofá nuevo, quiero mi dinero.": the remedy asked for in the same breath answers it
  not_remedy: (c) => {
    if (c.s.remedy || REMEDY_WORDS.test(heard(c).replace(NOT_REMEDY, " "))) return;
    if (once(c, "b_ack")) askRefundOr(c);
  },
  set_deadline: (c, slots, seg) => { brendaDeadline(c, slots, seg); },
  deadline_ctx: (c, slots, seg) => { brendaDeadline(c, slots, seg); },
  ask_writing: (c) => { brendaWriting(c); },
  ask_reference: (c) => { brendaRef(c); },
  pen_ready: (c) => { if (c.step === "reference" && !c.s.ref) giveRef(c); },
  pen_ctx: (c) => { if (c.step === "reference" && !c.s.ref) giveRef(c); },
  no_pen: (c) => { if (c.step === "reference" && !c.s.ref) { B(c, "brenda_no_pen"); giveRef(c); } },
  pen_wait: (c) => { if (c.step === "reference" && !c.s.ref) { if (once(c, "b_wait")) B(c, "g_take_time"); c.hold(); } },
  ref_readback: (c) => { if (c.s.ref && once(c, "b_ack")) B(c, "brenda_ref_correct"); },
  readback_unknown: (c, slots) => { if (c.s.ref) readBack(c, slots); },
  appreciate: (c) => {
    if (c.step === "confirm" && !c.s.confirmed) { c.s.confirmed = true; if (once(c, "b_ack")) B(c, "brenda_ok"); return; }
    if (once(c, "b_ack")) B(c, "brenda_appreciate_reply");
  },
  thats_all: () => { /* answered by the "¿algo más?" and closing questions */ },
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

/** "Sí" / "Me parece bien" to Brenda: what it agrees to depends on her last question. */
function brendaYes(c: Ctx) {
  if (atOffer(c)) { if (c.s.offerQ) { if (/gracias/.test(heard(c)) && !/acepto|cupon|cojin|miercoles|visita/.test(heard(c))) askOfferConfirm(c); else acceptOffer(c); } return; }
  if (!c.s.remedy) return;
  if (c.step === "deadline" && !c.s.deadline) { c.s.deadline = "accepted"; if (!ASKS_WRITING.test(heard(c)) && once(c, "b_ack")) B(c, "brenda_ok"); return; }
  if (c.step === "confirm" && !c.s.confirmed) { c.s.confirmed = true; if (!ASKS_WRITING.test(heard(c)) && once(c, "b_ack")) B(c, "brenda_ok"); return; }
  if (c.step === "reference" && !c.s.ref) giveRef(c);
}

/** "¿Me repite el número?": the folio again if it was just said, else the last turn. */
function repeatLast(c: Ctx, slots: any) {
  if (c.s.ref && c.s.transferred && c.step === "reference") { B(c, "brenda_ref_repeat", { text: REF }); c.hold(); return; }
  GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots);
}

// ---------------------------------------------------------------------------
// One handler per intent: facts first, then the phase decides (the transfer and the "¿bien armado?" question take
// any answer; Jorge before the transfer, Brenda after it).

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
      if (atPlugged(c)) {
        if (intent === "rude") c.s.rudeK = (c.s.rudeK ?? 0) + 1;
        if (intent === "plugged_no_ctx") plugNow(c); else pluggedAnswered(c);
        return;
      }
    }
    const h = (c.s.transferred ? BRENDA : KYLE)[intent];
    if (h) h(c, slots, seg);
  };
}

const INTENT_IDS = [
  "complain_open", "fridge_broke", "no_show", "disbelief", "third_time", "not_good_enough", "ask_manager", "further", "plugged_yes",
  "intro_name", "intro_ctx", "intro_this_ctx", "order_num", "order_ctx", "can_hold", "cant_hold", "decline_offer", "accept_offer", "agree",
  "ask_refund", "ask_replacement", "refund_or", "either_ctx", "not_remedy", "set_deadline", "deadline_ctx", "ask_writing", "ask_reference",
  "pen_ready", "no_pen", "pen_wait", "ref_readback", "readback_unknown", "appreciate", "thats_all", "have_nice_day", "walk_away",
  "rude", "ask_repeat", "ask_timeline", "ask_pickup", "no_manager", "plugged_no_ctx", "offer_q", "pen_ctx",
  "still_ctx", "disagree_ctx", "readback_ctx", "other_day_ctx",
];

// Automatic answers the simulations give at moments that come on some seeds only (the "¿bien armado?" twist) or
// that a script doesn't answer itself.
const AUTO: Record<string, string> = {
  plugged: "Sí, ya lo revisé.", name: "Ryan Miller.",
  offer_manager: "Sí, por favor.", book_tuesday: "No, gracias.", transfer: "Claro, aquí espero.", refund_or: "Un reembolso, por favor.",
  anything: "No, eso es todo.", which_day: "Para el viernes.", reference: "Sí, dígame.",
};

// ---------------------------------------------------------------------------

export const complaint: SituationDef = {
  id: "p26-complaint",
  song: "P26",
  songTitle: "I'd Like to Make a Complaint",
  title: { en: "Quiero poner una queja", lt: "I'd Like to Make a Complaint" },
  topic: { en: "Una queja formal por teléfono", lt: "A formal complaint on the phone" },
  chapter: 8,
  order: 2,
  location: "phone",
  npc: "kyle",
  npcs: ["brenda"],
  mode: "phone",
  goal: "Complain politely but firmly, and get your money back or a new sofa.",
  intro: "Three weeks ago you bought a sofa at Hogar Puerto, the furniture store ($12,999). It was due on October 10th, came a week late, on the 17th, with a broken leg and torn fabric. A technician was booked for Monday and never came. This is your third call, and your order number is 58213. Be polite, but don't back down.",
  entities: { dday: DAYS },

  grammar: {
    macros: {
      sofa: "[nuevo] (sofa | sillon | sofa cama | sofacama | mueble | sala | love seat | loveseat | comedor) [nuevo] [que (compré | les compré | pedí)]",
      tech: "(tecnico | tecnico de garantias | carpintero | tapicero | señor del servicio | muchacho | de garantias | joven)",
      visit: "(visita | cita | revision | visita de garantia | visita del tecnico)",
      mgr: "(gerente | supervisor | supervisora | jefe | jefa | encargado | encargada | superior | responsable | coordinador | coordinadora)",
      dmg: "[todo | toda | muy | bien] (roto | rota | danado | danada | maltratado | maltratada | golpeado | golpeada | rayado | rayada | rasgado | rasgada | manchado | manchada | sucio | sucia | chueco | chueca | en mal estado | desarmado | despegado | rajado | quebrado | quebrada | descosido | defectuoso | con defectos | con danos)",
      parts: "(una pata rota | la pata rota | una pata quebrada | la pata quebrada | una pata floja | la tela rasgada | la tela rota | la tela manchada | un hoyo [en la tela] | una mancha | manchas | un golpe | golpes | un rayon | rayones | un desgarre | una rotura | el forro roto | el forro rasgado | la tapiceria rota)",
      late: "(tarde | con retraso | con atraso | una semana tarde | una semana despues | con una semana de retraso | con una semana de atraso | hasta el {date} | hasta el {day} | hasta el {number} | fuera de tiempo | despues de la fecha)",
      when: "(el lunes | el {day} | ayer | la semana pasada | hace una semana | hace {number} dias | el {date})",
      times: "(dos veces | tres veces | varias veces | muchas veces | {number} veces | mil veces)",
      deadl: "((para | antes de | antes del | a mas tardar | a mas tardar para | maximo | como maximo) {day} [a mas tardar | como maximo | sin falta] | {day} a mas tardar | {day} como maximo)",
      refund: "(un reembolso | el reembolso | reembolso | un reembolso completo | el reembolso completo | un reembolso total | mi dinero de vuelta | mi dinero de regreso | la devolucion de mi dinero | que me devuelvan mi dinero | que me regresen mi dinero | que me devuelvan el dinero | que me regresen el dinero | que me reembolsen | un refund #tip:refund_word)",
      newone: "(un cambio | el cambio | un cambio fisico | el cambio fisico | otro @sofa | un @sofa nuevo | el @sofa nuevo | uno nuevo | otro igual | otro nuevo | que me lo cambien | que me lo cambien por uno nuevo | la reposicion | que me lo repongan | un reemplazo)",
      refnum: "(4471 | 44 71 | 4 4 7 1 | cuatro cuatro siete uno | cuarenta y cuatro setenta y uno | cuarenta y cuatro siete uno | cuatro cuatro setenta y uno | cuatro mil cuatrocientos setenta y uno)",
      ref: "(hache pe | hp | h p | hache p | ache pe) [guion] @refnum",
      problem_of: "(mi @sofa | el @sofa | su servicio | el servicio | mi pedido | un pedido | mi compra | una compra | la entrega | una entrega | su tienda)",
      offer_thing: "(el cupon | el cojin | la visita | el miercoles | eso | un cupon | el cupon y el cojin | cupon | una visita | otra visita | el tecnico | otro tecnico | el martes | martes | el proximo martes | miercoles | la cita | otra cita)",
      // the order number said whole ({number} stops at a compound before "mil": see NEEDS)
      order_whole: "(cincuenta y ocho mil doscientos trece | 58 mil 213 | cincuenta y ocho mil 213)",
      ifnot: "(si no | de lo contrario | si no lo resuelven | si no me lo resuelven | si no me ayudan | si no me resuelven | si no me dan una solucion)",
      call: "(llamo | le llamo | les llamo | hablo | le hablo | les hablo | estoy llamando | le estoy llamando | marco)",
    },
    slots: {},
  },

  intents: {
    // --- the complaint and what happened -----------------------------------------------------
    complain_open: { patterns: [
      "(quisiera | quiero | me gustaria | necesito | vengo a | llamo para | le llamo para | hablo para) (poner | presentar | levantar | hacer | dejar | meter | registrar) una (queja | reclamacion | reclamo) [formal] [(sobre | por | de | acerca de | respecto a) @problem_of] #h:make_complaint",
      "(quisiera | quiero | necesito) (quejarme | reclamar) [(de | sobre | por) @problem_of]",
      "(tengo | traigo) una (queja | reclamacion) [(sobre | de | por | con) @problem_of]",
      "@call (por | sobre | acerca de | respecto a | respecto de | en relacion con | en relacion a) (mi | un | el | una) (@sofa | pedido | compra | entrega | problema | queja | reclamo) [con (mi | un | el | una) (@sofa | pedido | compra | entrega)] #h:calling_about",
      "@call (por | sobre | acerca de) (mi | el | un) @sofa que (compré | les compré | pedí) [con ustedes | aqui | en hogar puerto] [hace (tres semanas | {number} semanas | un mes)]",
      "@call (para quejarme | por una queja | para poner una queja | para poner una reclamacion | para hacer una queja)",
      // "Llamo porque mi sofá llegó roto": the reason is its own piece
      "@call (porque | por que)",
      "no estoy (contento | contenta | satisfecho | satisfecha | conforme) con (mi @sofa | el servicio | su servicio | la entrega | mi pedido | mi compra | el @sofa)",
      "(tengo | hay) un problema [con (mi | el | un | una) (@sofa | pedido | compra | entrega)] [que (compré | pedí | hice) [con ustedes | aqui]]",
      "(necesito | ocupo) ayuda con (mi | el) (@sofa | pedido | compra | entrega)",
      "(es | se trata de) (sobre | por) (mi | un) (@sofa | pedido | compra)", "(es | se trata de) una queja",
      "(quiero | quisiera) hacer valer (la | mi) garantia",
      "(quiero | quisiera) (reportar | levantar un reporte de) (un problema | una entrega | mi pedido) [con mi pedido | con la entrega]",
    ] },
    fridge_broke: { patterns: [
      "(mi | el) @sofa (llegó | vino | me llegó) @dmg [@late] #h:fridge_stopped",
      "(mi | el) @sofa (llegó | vino | me llegó) @late [y @dmg | y con @parts | y @parts]",
      "(llegó | vino | me llegó) @dmg [y @late]",
      "(llegó | vino | me llegó | me lo entregaron | me lo trajeron | lo entregaron | lo trajeron) @late [y (@dmg | con @parts)] [y con @parts] #h:late_delivery",
      "(llegó | vino | me llegó | me lo entregaron | me lo trajeron) (con | y con) @parts [y @parts | y (con)? @parts] [y @late]",
      "(llegó | vino | me llegó) (con | y con) @late (y con | y) @parts",
      "(tiene | trae) @parts [y @parts] #h:broken_leg",
      "(le falta | le faltan) (una pata | un tornillo | una pieza | piezas | las patas | tornillos | un cojin)",
      "(lo esperaba | lo esperabamos | debia llegar | tenia que llegar | iba a llegar | me lo iban a entregar) el ({number} | {date}) [y (llegó | me llegó | lo entregaron | me lo entregaron) [hasta] el ({number} | {date})]",
      "hace (tres semanas | {number} semanas | un mes | {number} dias) (compré | pedí) (un | el | mi) @sofa [con ustedes | aqui | en hogar puerto]",
      "[ya | listo | ok | bueno] (sigue | esta) (rota | roto | quebrada | quebrado) [la pata sigue (rota | quebrada)]",
      "(mi | el) @sofa (tiene | trae) @parts [y @parts]",
      "(la | una) pata (esta | estaba | venia | llegó | vino) (rota | quebrada | despegada | floja | chueca)",
      "(la tela | el forro | la tapiceria) (esta | estaba | venia | llegó | vino) (rasgada | rota | manchada | sucia | descosida)",
      "(mi | el) @sofa (esta | estaba) @dmg",
      "esta @dmg",
      "(la entrega | el pedido) (llegó | fue) (@late | @dmg | incompleto | incompleta)",
      "(me entregaron | entregaron | me trajeron | me mandaron | me enviaron | me llegó | llegó | vino) (mi | el) @sofa (@late | @dmg | (con | y con) @parts) [y (@dmg | con @parts | @late)]",
      "(la entrega | el pedido | mi pedido | el envio) se (retrasó | atrasó | tardó) [una semana | {number} dias | mucho | muchisimo]",
      "(se tardaron | tardaron) (una semana | mucho | {number} dias) [mas] [en (entregarlo | traerlo | entregarmelo | traermelo)]",
      "no (llegó | me llegó | me lo entregaron | lo entregaron | me lo trajeron) (a tiempo | en la fecha | el dia que me dijeron | cuando me dijeron | cuando quedaron | en la fecha acordada)",
      "(me dijeron | me prometieron | quedaron) (que | en que) (llegaba | me lo entregaban | lo entregaban | lo traian | me lo traian) el (@when | {number}) [y (llegó | me lo entregaron | me lo trajeron) (hasta el {number} | hasta el {date} | una semana despues | tarde)]",
      "(lo compré | lo pedí | hice el pedido | compré un @sofa | pedí un @sofa) [con ustedes | en hogar puerto | aqui] [(hace (tres semanas | {number} semanas | un mes | {number} dias)) | el {date} | en octubre] #h:bought_ago",
      "(compré | pedí) (un | el | mi) @sofa (con | en | a) (ustedes | hogar puerto | su tienda) [hace (tres semanas | {number} semanas | un mes)] [y (llegó | vino) (@dmg | @late | con @parts)]",
      // after "¿Lo puede revisar?" / "¿Lo puede intentar?"
      "[todo] sigue igual [la pata (sigue | esta) (rota | quebrada)] #h:still_not",
      "la pata sigue (rota | quebrada | igual)",
      "(ya lo revisé | ya lo intenté) (y | pero) (sigue | sigue igual | sigue roto | sigue rota | nada | no sirvió)",
    ] },
    // after "¿Lo puede revisar?" / "¿Lo puede intentar?" only: a bare "Nada" or "Igual" means "no" at "¿Algo más?"
    still_ctx: { patterns: [
      "[ya | listo | ok | bueno | no] (sigue | esta igual | todo igual | igual | nada | no sirvió | no funcionó | no cambió nada) [sigue igual] [la pata sigue (rota | quebrada | igual)]",
    ] },
    no_show: { patterns: [
      "[y | ademas | y ademas | y encima] (el | su) @tech nunca (vino | llegó | se presentó | apareció | llamó) #h:tech_never",
      "[y | ademas | y encima] nadie (vino | llegó | se presentó | apareció) [a (revisarlo | recogerlo | arreglarlo | repararlo | ver el @sofa)] [@when] #h:nobody_came",
      "nadie (vino | llegó) [y] (esperé | estuve esperando) todo el dia",
      "(esperé | estuve esperando) todo el dia [y | pero] nadie (vino | llegó)",
      "[ya] (falté | tuve que faltar) al trabajo [una vez | un dia | ese dia] [y | pero] [nadie (vino | llegó)] #h:day_off #dayoff",
      "[ya] (pedí | me tomé | tuve que pedir) (el dia | un dia | permiso | el dia libre | un dia libre) [en el trabajo] [y | pero] [nadie (vino | llegó)] #dayoff",
      "(me quedé | estuve) (en casa | todo el dia en casa) [esperando] (y | pero) nadie (vino | llegó)",
      "la @visit (nunca se hizo | no se hizo | se canceló | nunca pasó)",
      "[y] (el | su) @tech no (vino | llegó | se presentó | llamó | apareció)",
      "(iba a venir | tenia que venir | quedaron de mandar | me iban a mandar) (un | el | a un) @tech [el {day} | @when] [y | pero] (nadie | no) (vino | llegó)",
      "(me dejaron | me dejaron plantado | me dejaron plantada | me dejaron esperando) [todo el dia]",
      "nadie lo (revisó | arregló | reparó | recogió | vino a ver)",
      "(no es cierto | no es verdad | eso no es cierto | eso no es verdad | es mentira) nadie (vino | llegó | estuvo aqui)",
      "(nunca | no) (vino | vinieron | llegaron | llegó) nadie",
      "nadie ha venido [todavia]",
      "[ya] me (agendaron | programaron | dieron | hicieron) (una | la) (visita | cita) [el lunes | para el lunes | el {day} | para el {day}] (y | pero) (nadie | no) (vino | llegó | vinieron | llegaron)",
      "no (me han | han) (reparado | arreglado | revisado | recogido | cambiado) (el @sofa | nada | mi @sofa)", "nadie me ha (llamado | ayudado | resuelto nada)",
      "(llevo | tengo) (dos semanas | una semana | {number} dias | {number} semanas) esperando [al @tech]",
      "(no vinieron | nunca vinieron | nunca llegaron | no llegaron)",
      "(iban a venir | tenian que venir | quedaron en venir | quedaron de venir | estaban supuestos a venir) [el {day} | el lunes] (y | pero) (no | nunca) (vinieron | llegaron | vino | llegó)",
    ] },
    // Jorge's file says the missed visit was "realizada"
    disbelief: { patterns: [
      "(en serio | es en serio | de verdad | neta | es broma)", "(realizada | completada | atendida)",
      "(como que | que) (realizada | completada | atendida)", "(realizada | completada) (en serio | de verdad)",
      "(un cupon | un cojin | un cupon y un cojin) (en serio | de verdad | nada mas | y ya)",
      "(nada mas | nomas | solo | solamente) (un cupon | un cojin | un cupon y un cojin | eso)",
      "(eso | esto) no (es cierto | es verdad | puede ser)", "(eso | esto) es mentira", "(es mentira | mentira | eso es falso | es falso)", "no puede ser", "(su | el) sistema esta mal", "(es | eso es) un error",
      "(la visita | eso) no se realizó", "nadie (completó | realizó) nada", "(es | eso es) imposible", "como (que | va a estar) realizada",
    ] },
    third_time: { patterns: [
      "es la tercera vez que @call [por (esto | lo mismo)] #h:third_time",
      "(esta es | es | ya es) (la | mi) tercera (vez | llamada) [que llamo | hoy | esta semana | por esto]",
      "ya (llamé | hablé | les llamé | les hablé | le llamé | marqué) (tres veces | dos veces | antes | muchas veces | varias veces | el {day}) [y el {day}] [por (esto | lo mismo)]",
      "(ya van | van | llevo) (tres | tres llamadas | tres veces) [que llamo | llamando]",
      "no es la primera vez que (llamo | hablo | marco)",
      "(otra vez | de nuevo) estoy llamando [por lo mismo]", "(llamo | estoy llamando) otra vez [por lo mismo]",
      "(llamé | hablé) el {day} y [el] {day}",
      "ya (tuve | tuvimos) (esta | la misma) (conversacion | platica) [antes | dos veces]",
      "[es la] tercera vez",
      "sigo llamando y no pasa nada",
      "(les | le) (he llamado | he hablado) (tres veces | muchas veces | varias veces | antes)",
      "ya (he llamado | llamé) tres veces",
    ] },
    not_good_enough: { patterns: [
      "(me temo que | lo siento pero | perdon pero) (eso | esto) no es suficiente #h:not_good",
      "(eso | esto) no es (suficiente | aceptable | justo | serio | una solucion) [para mi]",
      "(eso | esto) no me (sirve | funciona | convence | parece justo)",
      "(se | yo se) que no es su culpa [pero] #h:not_your_fault",
      "(se | yo se) que no es su culpa pero (es la tercera vez que llamo | ya llamé tres veces | ya es la tercera vez) #third",
      "no (puedo | quiero) esperar hasta el {day}",
      "[el] {day} es (muy | demasiado) tarde",
      "no quiero (otra | una nueva | otra nueva) (visita | cita | revision)",
      "no quiero (esperar | seguir esperando) (otra vez | otra semana | mas)",
      "ya (esperé | he esperado) (suficiente | demasiado | mucho | dos semanas | semanas)",
      "(he sido | ya fui) (muy | bastante) paciente",
      "estoy (muy | bien | super)? (decepcionado | decepcionada | molesto | molesta | frustrado | frustrada | harto | harta | cansado de esperar | cansada de esperar)",
      "no estoy (contento | contenta | satisfecho | satisfecha) con (eso | esto)",
      "(eso | esto) es (inaceptable | injusto | una falta de respeto)",
      "(es | ya es) (muy | demasiado) tarde",
      "(es | eso es) todo lo que (puede | pueden) hacer",
      "que mas (me puede | me pueden) (ofrecer | dar)",
      "de ninguna manera",
      "(y si | que pasa si) [el martes | el miercoles | otra vez] (no viene nadie | nadie viene | no vienen | tampoco vienen | tampoco viene nadie | tampoco viene | no viene | otra vez no viene nadie | no llega nadie | tampoco llega nadie) [otra vez | el martes | el miercoles]",
    ] },
    ask_manager: { patterns: [
      "(puedo | podria) hablar con (su | un | una | el | la) @mgr #h:manager",
      "(quiero | quisiera | necesito | me gustaria) hablar con (su | un | una | el | la) @mgr",
      "exijo hablar con (su | un | una | el | la) @mgr [ya | ahorita | ahora mismo]",
      "(me comunica | me pasa | me puede comunicar | me puede pasar | me podria comunicar | me podria pasar | comuniqueme | paseme | me comunicas #tip:tu_staff | me pasas #tip:tu_staff | me puedes pasar #tip:tu_staff | me puedes comunicar #tip:tu_staff) con (su | tu | un | una | el | la) @mgr",
      "(esta | se encuentra) (su | el | la) @mgr",
      "hay (un | una | algun | alguna) @mgr (con quien | con el que | con la que) (pueda | podria) hablar",
      "(puedo | podria | quiero | quisiera) hablar con (alguien | otra persona) (mas | que pueda) (ayudarme | decidir | resolver esto | resolverlo | autorizar (un reembolso | el reembolso))",
      "(puedo | podria | quiero | quisiera | necesito | me gustaria) hablar con (alguien | otra persona) (con mas autoridad | de mas arriba | que tenga autoridad | de mas nivel)",
      "[si] (pasemela | comuniquemela | paseme con ella | comuniqueme con ella | pasemelo | comuniquemelo)",
      "quien (puede | podria) (ayudarme | decidir | autorizar (un reembolso | el reembolso | eso) | resolver esto)",
      "(hay | habra) (alguien | otra persona) [mas] con (quien | el que | la que) (pueda | podria | puedo) hablar",
      "(quiero | quisiera | necesito | puedo | podria) hablar con (alguien | otra persona) que (me pueda | pueda | me podria) (ayudar | resolver esto | resolverlo | autorizar un reembolso)",
      "con quien mas (puedo | podria) hablar",
      "(quiero | quisiera) (escalar | elevar) (esto | mi queja | el caso | la queja)",
      "(pueden | puede | podria) (escalar | elevar) (esto | mi queja | el caso)",
      "entonces (puedo | podria | quiero | quisiera) hablar con (su | el | la) @mgr",
      "quien es (su | el | la) @mgr",
      "[si] (comuniqueme | paseme | me comunica | me pasa) [con ella | con el | con su @mgr]",
      "(quiero | quisiera) hablar con ella",
      "(paseme | comuniqueme | deme | paseme a | quiero a) (su | el | la) @mgr [ya | ahorita | ahora mismo] #tip:blunt_manager",
      "[su | el | la] @mgr (ya | ahorita | ahora mismo) #tip:blunt_manager",
      "(el | la | su) @mgr #tip:blunt_manager",
      "@offer_thing no [gracias] [mejor] (quiero | quisiera | prefiero | necesito) hablar con (su | el | la | un | una) @mgr",
      "@offer_thing no [gracias] [mejor] (paseme | comuniqueme | me pasa | me comunica | me puede pasar | me puede comunicar | me podria pasar | me podria comunicar) (con | a) (su | el | la) @mgr",
    ] },
    // "No quiero hablar con su gerente" (never a request for the manager)
    no_manager: { patterns: ["[no] no (quiero | necesito) hablar con (su | el | la | un | una | ella | el) [@mgr]", "[no] (su | el | la) @mgr no"] },
    further: { patterns: [
      "(si no | de lo contrario | si no lo resuelven | si no me lo resuelven) voy a (poner | presentar | levantar | meter) (una queja | mi queja) (en | ante | con) (la profeco | profeco) #h:further",
      "voy a (poner | presentar | levantar | meter) (una queja | mi queja) (en | ante | con) (la profeco | profeco)",
      "[@ifnot] voy a (ir | acudir) a (la profeco | profeco)",
      "[@ifnot] (voy a | los voy a | lo voy a) (reportar | reportarlos | demandar | demandarlos | denunciar | denunciarlos) (a | en | ante | con) (la profeco | profeco)",
      "[@ifnot] (voy a | me voy a) quejar (a | en | ante | con) (la profeco | profeco)",
      "(voy a | lo voy a) (llevar | escalar) (esto | este asunto | el caso) (mas arriba | mas lejos | a otras instancias | a la profeco)",
      "voy a (llamar | escribir | hablar) a (la profeco | profeco | la direccion | el corporativo | las oficinas centrales)",
      "voy a (buscar | contratar | hablar con) un abogado",
      "conozco mis derechos",
      "voy a (poner | dejar | escribir) una (mala resena | resena negativa | mala calificacion | queja en redes | queja en redes sociales) #tip:review_threat",
      "voy a (publicarlo | quejarme) en (redes | redes sociales | facebook | internet) #tip:review_threat",
    ] },

    // --- Jorge's script ------------------------------------------------------------------------
    plugged_yes: { patterns: [
      "si ya lo revisé #h:plugged_yes",
      "[si] (claro | por supuesto) [que si] [ya lo revisé] [esta bien armado]",
      "[si] ya (lo | la) (revisé | intenté | apreté | cheque | vi | armé bien) [@times]",
      "[si] ya (revisé | intenté | probé | hice) (eso | todo) [@times]",
      "(esta | el sofa esta) bien armado [la pata esta (rota | quebrada)] #h:checked",
      "[si] (esta | el sofa esta) bien armado pero la pata esta (rota | quebrada)",
      "no es (un tornillo | los tornillos | un tornillo flojo | nada mas un tornillo) la pata esta (rota | quebrada)",
      "(la pata | esta) (esta | estaba)? (rota | quebrada) no (floja | suelta)",
      "[si] (apreté | ya apreté) (los tornillos | el tornillo | la pata) [y (sigue igual | nada | no sirvió)]",
      "[si] ya lo hice",
      "[si] ya lo revisé [y] esta bien armado [la pata esta (rota | quebrada)]",
      "[si] (lo | la) (revisé | intenté) [@times]",
    ] },
    // "No, no lo he revisado." to "¿Ya revisó…?" (never a yes): Jorge asks the learner to check and try
    plugged_no_ctx: { patterns: [
      "[no] no lo (he revisado | revisé | he intentado | intenté | apreté | he apretado | he checado) [todavia | aun]",
      "[no] (todavia | aun) no [lo revisé | lo he revisado | lo intento]",
      "[no] no (revisé | he revisado | intenté | he intentado) (eso | los tornillos | la pata)",
      "[no] no (esta | creo que esta) bien armado",
      "no se si (esta | el sofa esta) bien armado",
    ] },
    intro_name: { patterns: [
      "(me llamo | mi nombre es) {name} #h:my_name",
      "mi nombre es {name} y mi apellido [es] {surname:name}",
      "mi apellido es {name}",
    ] },
    intro_ctx: { patterns: [
      "[esta] a nombre de {name} #h:its_name", "el pedido esta a nombre de {name}", "{name}", "(soy | yo soy) {name}", "es {name}",
    ] },
    // "Hola, habla Ryan Miller." (a phone opener)
    intro_this_ctx: { patterns: ["(habla | le habla | aqui habla | le llama | aqui le habla) {name}", "{name} al telefono"] },
    order_num: { patterns: [
      "(mi | el) (numero de pedido | pedido | numero de orden | numero de compra | folio de compra | numero de ticket | numero) (es | era) [el] {digits} #h:order_is",
      "(es | era) el (pedido | numero) [numero] {digits}", "(es | era) [el] {digits}", "[el] (numero de pedido | pedido numero | pedido | orden numero) [es] [el] {digits}",
      "(mi | el) (numero de pedido | pedido | numero de orden | numero) (es | era) [el] @order_whole #rightorder", "(es | era) [el] @order_whole #rightorder",
    ] },
    // a bare number answers only the order-number question
    order_ctx: { patterns: ["{digits}", "el {digits}", "[el] @order_whole #rightorder"] },
    can_hold: { patterns: [
      "(no hay problema | esta bien | claro | no se preocupe) tengo todo el dia #h:all_day #allday",
      "[no hay problema | esta bien | claro] (tengo | me sobra) (todo el dia | tiempo | mucho tiempo | todo el tiempo del mundo) #allday",
      "[si | claro | por supuesto | esta bien] (puedo | lo puedo | le puedo) esperar [lo que sea necesario | lo que haga falta]",
      "[si | claro | por supuesto] aqui (espero | le espero | lo espero | la espero) #h:can_hold",
      "[si | claro] (espero | le espero) [en la linea]",
      "[claro] (tomese | tomate #tip:tu_staff) su tiempo",
      "no tengo prisa",
      "(ya llevo | llevo) (una hora | 47 minutos | cuarenta y siete minutos | mucho tiempo | horas | media hora) esperando #allday",
    ] },
    cant_hold: { patterns: [
      "[no] [ya] no (puedo | quiero) (esperar | seguir esperando) [mas | otra vez | mucho]",
      "(puede | podria) (apurarse | ser rapido | ser rapida)", "[rapido | apurese] por favor",
      "no tengo (mucho | tanto) tiempo",
      "(otra vez | otra espera) no", "no otra vez",
    ] },

    // --- Brenda's offer ------------------------------------------------------------------------
    decline_offer: { patterns: [
      "[gracias pero] [me temo que | lo siento pero] un cupon no es suficiente #h:decline",
      "(el cupon | el cojin | la visita | el miercoles | el cupon y el cojin | eso | un cupon | el martes | el proximo martes) no [gracias]",
      "[gracias pero] no es suficiente",
      "(el miercoles | ese dia | a esa hora | el martes) (trabajo | tengo trabajo | estoy trabajando | no estoy | no puedo | estoy en el trabajo)",
      "(eso | un cupon | el cupon | un cojin | el cojin | un cupon y un cojin | otra visita | una visita | el miercoles | un tecnico) no (es suficiente | me sirve | me ayuda | resuelve (nada | el problema | mi problema) | me funciona | arregla nada | me sirve de nada)",
      "[gracias pero] (se puede | puede) quedar con (el | su) (cupon | cojin | cupon y su cojin | cupon y el cojin) #h:keep_mug",
      "[gracias pero] (puede | se puede) quedarse con (el | su) (cupon | cojin | cupon y su cojin | cupon y el cojin)",
      "quedese con (su | el) (cupon | cojin) [y (con)? (su | el) (cupon | cojin)]",
      "(se lo | le) agradezco pero (no | no gracias | no es suficiente | tengo que decir que no)",
      "no (quiero | necesito) (un | su | el | ningun | otro | otra | una) (cupon | cojin | cojines | visita | cita | tecnico)",
      "eso no es lo que (quiero | necesito | pedí)",
      "[el miercoles] no (puedo | quiero) (pedir | tomar) (otro dia | otro permiso | otro dia libre)",
      "[el miercoles] no (puedo | quiero) (volver a faltar | faltar otra vez | faltar) al trabajo",
      "no me interesa (el | un | su) (cupon | cojin | visita | cupon ni el cojin)", "[no gracias] no me interesa",
      "no (quiero | necesito) (el | un | su) (cupon | cojin) ni (el | un | su) (cupon | cojin)",
      "(el miercoles | ese dia | esa hora | ese horario | el martes | el proximo martes) no (me queda | me funciona | puedo | me sirve) [bien]",
      "no (puedo | voy a) esperar hasta el miercoles",
      "no (lo | la) quiero",
      "(un cupon | un cojin) no es (una solucion | solucion)",
      "no (acepto | voy a aceptar) (eso | el cupon | la oferta | su oferta | el cojin | la visita)",
      "ya tengo (suficientes | muchos) cojines",
    ] },
    accept_offer: { patterns: [
      "(acepto | tomo | me quedo con) (el cupon | el cojin | la visita | el miercoles | la cita | el martes | eso | su oferta | la oferta | el cupon y el cojin)",
      "[si] acepto",
      "(el miercoles | el cupon | la visita | la cita | el cojin | esa oferta | el martes | el proximo martes) (esta bien | me parece bien | me queda bien | me sirve | perfecto | me funciona | me viene bien)",
      "(esta bien | bueno | ok | sale | va | de acuerdo) (el miercoles | el martes | el proximo martes) [entonces]",
      "me encantan los cojines",
      "(agendeme | apunteme | reserveme | agendelo | agendela) (para | el) [proximo] (martes | miercoles)",
      "[si | ok | esta bien] (agendelo | agendeme | agendela | aparteme la cita | reserve la visita)",
      "[si | sale] (mandeme | deme) el cupon",
      "(un cupon | el cupon) (estaria bien | me sirve)",
    ] },
    // a question about Brenda's offer (or a what-if): never an acceptance
    offer_q: { patterns: [
      "(cuanto | de cuanto) (vale | es) el cupon", "(para que | en que) (sirve | puedo usar | se usa) el cupon", "el cupon (vence | caduca | tiene vencimiento)",
      "(y si | que pasa si) (acepto | tomo) (el cupon | el cojin | la visita | la oferta)", "(y si | que pasa si) (viene | va) el tecnico [el miercoles]",
      "(a que hora | cuando) (viene | va | llega) el tecnico", "(la visita | el tecnico) (tiene costo | cuesta | se cobra | es gratis)",
    ] },
    agree: { patterns: [
      "[si] me parece bien #h:works",
      "[si] (me funciona | me queda bien | me sirve | me viene bien | me parece perfecto)",
      "[si] (eso | esto) (suena | esta) (bien | perfecto | excelente)",
      "[ok | esta bien] (dos semanas | de 10 a 14 dias | de diez a catorce dias | ese plazo) (esta bien | me parece bien)",
      "trato hecho",
      "[si] [claro] (estoy | estamos) de acuerdo",
      "(perfecto | excelente) me parece bien",
      "[si] puedo esperar (dos semanas | de 10 a 14 dias | ese tiempo | eso | lo que dice)",
    ] },
    ask_refund: { patterns: [
      "(quiero | quisiera | necesito | exijo | espero | me gustaria | prefiero) (un reembolso | el reembolso | un reembolso completo | un reembolso total | el reembolso completo | un refund #tip:refund_word) [@deadl] #h:full_refund",
      "(quiero | quisiera | necesito | espero | me gustaria) que me (devuelvan | regresen | reembolsen) (mi dinero | el dinero | lo que pagué | todo mi dinero | todo) [@deadl]",
      "exijo que me (devuelvan | regresen | reembolsen) (mi dinero | el dinero | lo que pagué | todo mi dinero | todo) [@deadl] #h:exijo",
      "(le pido | les pido) (de la manera mas atenta | atentamente | amablemente | de favor | por favor) que me (devuelvan | regresen | reembolsen) (mi dinero | el dinero | lo que pagué | todo) [@deadl] #h:most_kind",
      "(le pido | les pido) (de la manera mas atenta | atentamente | amablemente) (un reembolso | el reembolso | la devolucion de mi dinero) [@deadl]",
      "(me pueden | me puede | me podrian | me podria | pueden | puede | podrian | me podeis) (devolver | regresar | reembolsar) (mi dinero | el dinero | lo que pagué | todo) [@deadl]",
      "(quiero | quisiera) (devolver | regresar) (el @sofa | la compra | el pedido) [y que me (devuelvan | regresen) (mi | el) dinero]",
      "(quiero | quisiera) (cancelar | anular) (la compra | el pedido | mi pedido | mi compra) [y que me (devuelvan | regresen) (mi | el) dinero]",
      "(quiero | quisiera | necesito | prefiero) (mi dinero | el dinero) [de vuelta | de regreso]",
      "no (@newone | cambio | sofa nuevo) [sino] [mejor] (@refund | mi dinero | el dinero)",
      "(@newone | cambio | sofa nuevo) no [gracias] [mejor] [(quiero | prefiero | necesito)] (@refund | mi dinero | el dinero)",
      "no con (un cupon | cupones | un cojin | cojines | otra visita | una visita) [sino] con (mi dinero | un reembolso | el reembolso | mi dinero de vuelta)",
      "no gracias [yo] (quiero | prefiero | necesito) (@refund | mi dinero | el dinero)",
      "no (quiero | necesito) (cojines | un cojin | un cupon | cupones | otra visita | que lo reparen | que lo arreglen | una reparacion) [yo] (quiero | necesito | prefiero) (@refund | mi dinero | el dinero)",
      "(ya no quiero | no quiero) (un cambio | el cambio | uno nuevo | un @sofa nuevo | otro @sofa) [sino] [mejor | prefiero | quiero] (@refund | mi dinero | el dinero)",
      "ya no quiero (el @sofa | mi @sofa | ese @sofa)",
      "(quiero | quisiera | necesito | exijo) (el | un) reembolso (de | por) (mis | los | todo | el total de mis) ({price} | doce mil pesos | {number} pesos | mi dinero)",
      "(mi dinero | el dinero | mi dinero de vuelta)",
      "lo que (quiero | necesito | pido) es (mi dinero | un reembolso | que me devuelvan mi dinero | el reembolso)",
      "@refund [@deadl]",
      // "El cupón no, quiero mi dinero" (one piece: after "… no" the engine won't start a new one)
      "@offer_thing no [gracias] [(quiero | prefiero | necesito | mejor)] (@refund | mi dinero | el dinero) [@deadl]",
      "(devuelvame | regreseme | devuelvanme | regresenme) mi dinero #blunt",
      "tengo derecho a (un reembolso | que me devuelvan mi dinero | la devolucion de mi dinero)",
      "(quiero | prefiero | mejor) (un reembolso | que me devuelvan mi dinero | mi dinero) (en lugar | en vez) de (otra visita | un cupon | una visita | el cambio | uno nuevo | un @sofa nuevo)",
      "(quiero | prefiero) (un reembolso | que me devuelvan mi dinero) no (otra visita | un cupon | una visita | otra cita)",
      // a change of mind: "Pensándolo bien, mejor un reembolso."
      "(mejor | sabe que | pensandolo bien) [mejor] (un reembolso | el reembolso | que me devuelvan mi dinero | prefiero el reembolso | prefiero que me devuelvan mi dinero) [en lugar de eso | en vez de eso]",
      "(prefiero | preferiria) (el reembolso | un reembolso | que me devuelvan (mi | el) dinero) [mejor] [en vez de (eso | el cambio | uno nuevo)]",
      "(puedo | podria) (pedir | tener) [mejor] (el | un) reembolso [en lugar de eso | en vez de eso]",
    ] },
    ask_replacement: { patterns: [
      "(quiero | quisiera | me gustaria | necesito | espero | exijo | prefiero) (un cambio | el cambio | un @sofa nuevo | otro @sofa | uno nuevo | un cambio fisico | otro igual | otro nuevo | un reemplazo) [@deadl] #h:replacement",
      "(me lo | lo) (pueden | puede | podrian | podria) (cambiar | reemplazar | reponer) [por (uno nuevo | otro)] [@deadl]",
      "(quiero | quisiera | necesito | me gustaria | exijo) que me lo (cambien | reemplacen | repongan) [por (uno nuevo | otro)] [@deadl]",
      "(cambienmelo | cambiemelo | reemplacelo) [por uno nuevo] #blunt",
      "(quiero | quisiera | necesito) que me (den | manden | envien | traigan | entreguen) (otro @sofa | uno nuevo | un @sofa nuevo | otro)",
      "no gracias [yo] (quiero | prefiero | necesito) @newone",
      "no (quiero | necesito) (cojines | un cojin | un cupon | cupones | otra visita | que lo reparen | que lo arreglen | una reparacion) [yo] (quiero | necesito | prefiero) (@newone | un @sofa | un @sofa que (sirva | funcione))",
      "(ya no quiero | no quiero) (un reembolso | el reembolso | mi dinero | el dinero | que me devuelvan (mi | el) dinero) [sino] [mejor | prefiero | quiero] @newone",
      "no (@refund | reembolso | mi dinero | el dinero) [sino] [mejor] @newone",
      "(@refund | reembolso | mi dinero | el dinero) no [gracias] [mejor] [(quiero | prefiero | necesito)] @newone",
      "(me pueden | me puede | pueden | puede | me podrian | me podria) (mandar | enviar | dar | traer) (uno nuevo | otro @sofa | un @sofa nuevo | otro)",
      "(necesito | quiero) un @sofa (que sirva | que funcione | en buen estado | sin danos | que no este roto | completo)",
      "lo que (quiero | necesito | pido) es (un @sofa nuevo | uno nuevo | un cambio | que me lo cambien)",
      "(mejor | prefiero | preferiria | pensandolo bien) [mejor] (el cambio | uno nuevo | un @sofa nuevo | que me lo cambien) [en lugar de eso | en vez de eso | en lugar del reembolso | en vez del reembolso]",
      "@newone [@deadl]",
      "@offer_thing no [gracias] [(quiero | prefiero | necesito | mejor)] @newone [@deadl]",
    ] },
    refund_or: { patterns: [
      "(quiero | quisiera | espero) (un reembolso | que me devuelvan mi dinero) o (un cambio | uno nuevo | un @sofa nuevo | que me lo cambien) #h:refund_or",
      "(un reembolso | mi dinero | que me devuelvan mi dinero) o (un cambio | uno nuevo | un @sofa nuevo | que me lo cambien)",
      "(un cambio | uno nuevo | un @sofa nuevo | que me lo cambien) o (un reembolso | mi dinero | que me devuelvan mi dinero)",
      "(quiero | quisiera | espero) (un cambio | uno nuevo | un @sofa nuevo) o (un reembolso | mi dinero de vuelta)",
      "(o | ya sea) (un reembolso | que me devuelvan mi dinero) o (un cambio | uno nuevo)",
    ] },
    // "¿Prefiere un reembolso o un cambio?" – "Cualquiera." (only then)
    either_ctx: { patterns: ["(cualquiera | cualquiera de los dos | lo que sea mas rapido | lo que sea | me da igual | me da lo mismo | cualquiera esta bien | los dos estan bien | lo mas rapido | lo que salga mas rapido | lo que sea mas facil)"] },
    // "No quiero un reembolso" (never a refund)
    not_remedy: { patterns: [
      "no (quiero | necesito) (un reembolso | el reembolso | mi dinero | un cambio | el cambio | uno nuevo | un @sofa nuevo | otro @sofa | dinero)",
      "no quiero que me (devuelvan | regresen) (el | mi) dinero", "no quiero que me lo cambien",
    ] },

    // --- the deadline, in writing, the folio ---------------------------------------------------
    set_deadline: { patterns: [
      "(necesito | quiero | quisiera | me gustaria) que (esto | esto se | se) (resuelva | quede resuelto | solucione | arregle | quede listo | quede) (@deadl | para el {day} | el {day}) [no (algun dia | cuando sea | quien sabe cuando)] #h:by_friday",
      "lo necesito (para | antes de | antes del | a mas tardar) {day} #h:need_by",
      "lo necesito (para | antes de | antes del | a mas tardar) {day} [a mas tardar] no (algun dia | cuando sea | la proxima semana | en dos semanas)",
      "(necesito | quiero) (el @sofa | el reembolso | mi dinero | el nuevo | uno nuevo | eso | esto | el cambio) (para | antes de | antes del | a mas tardar) {day}",
      "@deadl", "@deadl no (algun dia | cuando sea | la proxima semana | en dos semanas)",
      "(lo antes posible | lo mas pronto posible | cuanto antes | lo mas rapido posible | de inmediato | inmediatamente | hoy mismo) #asap #h:asap",
      "(lo | la) (necesito | quiero) (lo antes posible | cuanto antes | lo mas pronto posible | de inmediato | ya) #asap",
      "(dos semanas | catorce dias | 14 dias | de 10 a 14 dias | de diez a catorce dias | eso) (es | son) (mucho | demasiado | muchisimo) tiempo #toolong #h:too_long",
      "(dos semanas | catorce dias | eso) (es | son) (demasiado | muy | mucho) (tarde | lento)",
      "no puedo esperar (dos semanas | catorce dias | tanto | tanto tiempo) #toolong",
      "(me lo | lo) (pueden | puede | podrian | podria) (entregar | traer | mandar | hacer | depositar) (antes del | para el | el | a mas tardar el) {day}",
      "(puede | podria) (llegar | quedar | estar) (antes del | para el | el) {day}",
      "[el] {day} (seria | estaria) (perfecto | mejor | ideal | bien)",
      "(en | dentro de) (una semana | {number} dias) #asap",
      "(puede | podria) ser (antes | mas rapido | mas pronto) #asap", "(mas rapido | mas pronto) #asap",
      "(lo necesito | necesito) esta semana #asap",
      "(es | eso es) muy lento #toolong",
      "(es | son) (demasiado | mucho | muchisimo) [tiempo] #toolong",
      "(dos semanas | catorce dias | 14 dias | de 10 a 14 dias | eso) (es | son) (mucho | demasiado | muchisimo) #toolong",
      "(lo | la)? (necesito | quiero) [el @sofa | el reembolso | mi dinero | el nuevo] esta (misma)? semana #asap",
      "no (puede | podria | pueden | podrian) ser (antes | mas rapido | mas pronto) #asap",
      "lo necesito hasta el {day} #tip:by_until",
      "hasta el {day} [por favor] #tip:by_until",
      // corrections: the second day is the answer ("No para el viernes, para el jueves", "El jueves no, mejor el lunes")
      "no [para | antes del | antes de] [el] {wrong:day} [sino] [mejor] [para | antes del | antes de] [el] {day}",
      "[no] [para | antes del | antes de] [el] {wrong:day} no [sino] [mejor] [para | antes del | antes de] [el] {day}",
    ] },
    // only while a day is being set (at Brenda's Wednesday visit, "¿Pueden venir el jueves?" is not a deadline)
    deadline_ctx: { patterns: [
      "[para | antes del | antes de | el] {day}",
      "(que tal | y) [para] {day}",
      "(se puede | es posible | seria posible | podria ser) [para] {day}",
      "(pueden | puede | podrian) (venir | traerlo | entregarlo | hacerlo | depositarlo | llegar) [para | antes del] {day}",
      "{day} me (viene bien | queda bien | parece bien | sirve)",
    ] },
    ask_writing: { patterns: [
      "(me lo puede | me lo pueden | me lo podria | me lo podrian) (dar | mandar | enviar | poner) por escrito #h:in_writing",
      "(puedo | podria) tener (eso | esto | todo) por escrito",
      "(me puede | me pueden | me podria | me lo puede | me lo podria) (confirmar | mandar | enviar) [eso | esto | la confirmacion | todo] por (correo | correo electronico | email | mail | escrito | whatsapp | mensaje) #h:email_confirm",
      "(me | nos) (manda | mandan | envia | envian) (un correo | una confirmacion | un correo de confirmacion | algo por escrito | la confirmacion)",
      "(lo | la) quiero por escrito", "(necesito | quiero | quisiera) (eso | esto | todo | una confirmacion) por escrito",
      "(voy a recibir | me va a llegar | me llega) (un correo | una confirmacion | algo por escrito)",
      "por escrito", "(me puede | puede | me pueden) (mandar | dar) un comprobante",
      "(me lo pone | pongalo) por escrito", "(me lo manda | me lo envia) por (escrito | correo)",
      "(me lo | me la) (da | dan | pasa | pasan | deja | dejan) por escrito",
      "(me da | me dan | me puede dar | me pueden dar | me podria dar) (eso | esto | todo | la confirmacion | algo) por escrito",
    ] },
    ask_reference: { patterns: [
      "(me puede dar | me da | me podria dar | puedo tener | me dan) (un | el | mi) (numero de folio | folio | numero de reporte | numero de queja | numero de seguimiento | numero de referencia) #h:ask_ref",
      "cual es (mi | el) (folio | numero de folio | numero de reporte | numero de queja)",
      "(hay | me dan | me van a dar | tienen) (un | algun) (folio | numero de folio | numero de reporte)",
      "(necesito | quisiera) (un | el) (folio | numero de folio | numero de reporte | numero de queja)",
      "(el | un) (folio | numero de folio | numero de reporte)",
    ] },
    pen_ready: { patterns: [
      "[si] (digame | adelante) #h:go_ahead",
      "[si] (tengo | ya tengo) (pluma | con que escribir | papel y pluma | un lapiz | una pluma | boligrafo | un boligrafo | boli | donde anotar) [digame | adelante]",
      "[si] (estoy | ya estoy) (listo | lista)",
      "[si] (lo | la) (escucho | anoto)",
      "[ok] (un momento | un segundo) (ya | listo | lista) (digame | adelante)",
      "[si] (aqui | ya) (lo | la) anoto",
    ] },
    // a bare "Ya" / "Listo" answers only "¿Tiene dónde anotar?"
    pen_ctx: { patterns: ["[si] ya", "(listo | lista | ya estoy)", "(ok | si) listo"] },
    // "No, no estoy de acuerdo" to "¿Está usted de acuerdo?" / the 10 to 14 days (never a yes)
    disagree_ctx: { patterns: ["[no] no (estoy | estamos) de acuerdo [con (eso | ese plazo | esa fecha)]"] },
    // a read-back without the letters ("Cuatro cuatro siete dos"): only right after the folio
    readback_ctx: { patterns: ["[entonces | ok] [es el] {digits} [correcto | verdad | anotado]"] },
    // "¿Pueden venir el jueves?" at Brenda's Wednesday visit (never a deadline, never an acceptance)
    other_day_ctx: { patterns: [
      "(pueden | puede | podrian | podria) (venir | ir | mandarlo | mandar al tecnico | mandar a alguien) [mejor] (el {day} | otro dia | otro dia que no sea el miercoles)",
      "(puede | podria) ser [mejor] (el {day} | otro dia)", "(prefiero | preferiria) que (vengan | venga) [mejor] (el {day} | otro dia)",
      "(y | que tal | mejor) [el] {day}", "(no hay | no tiene | no tienen | hay) otro dia", "(otro dia | otra fecha) [por favor]",
    ] },
    // "Sí, una cosa más": there is something else (only at "¿Algo más?")
    more_yes_ctx: { patterns: ["[si] (una cosa mas | otra cosa | una pregunta mas | otra pregunta | tengo otra pregunta | tengo una pregunta | una pregunta)", "[no] solo una pregunta"] },
    no_pen: { patterns: [
      "[no] no tengo (pluma | con que escribir | boligrafo | papel | lapiz | boli | donde anotar)",
      "[no] no tengo nada (para | con que) escribir", "no (puedo | alcanzo a) (anotarlo | escribirlo) [ahorita | ahora]",
    ] },
    pen_wait: { patterns: [
      "(dejeme | permitame | espere | espereme) [que] (busco | busque | agarro | tomo | traigo | saco) (una pluma | pluma | con que escribir | un lapiz | papel | algo para anotar)",
      "[un momento | un segundo | permitame | dejeme] (voy por | voy a buscar | voy a traer) (una pluma | pluma | papel | un lapiz | algo para anotar | con que escribir)",
    ] },
    ref_readback: { patterns: [
      "[entonces | ok] [es el] @ref [correcto | verdad | es correcto | anotado | listo | ya lo anoté] #h:readback",
      "[entonces | ok] [es el] @refnum [correcto | verdad | anotado]",
    ] },
    // a read-back with other digits ("¿HP 4472?"): a catch-all, so the right number always wins
    readback_unknown: { patterns: ["[entonces | ok] [es el] (hache pe | hp | h p | hache p | ache pe) [guion] {digits} [correcto | verdad]"] },
    ask_repeat: { patterns: [
      "(me repite | me puede repetir | puede repetir | me podria repetir | me repites #tip:tu_staff) el (numero | folio) #h:repeat_num",
      "(cual era | como era | que era) el (numero | folio)",
      "no (alcancé a anotar | anoté | escuché | alcancé a escuchar) el (numero | folio)",
      "(me lo | lo) (repite | puede repetir) mas despacio",
    ] },
    ask_timeline: { patterns: [
      "cuanto (tarda | tiempo tarda | se tarda | va a tardar | tiempo va a tardar | tiempo tardan | tardan) [en llegar] (el reembolso | la entrega | eso | el cambio | el nuevo | el @sofa nuevo | el dinero)",
      "cuando (me devuelven | me regresan | voy a recibir | recibo | me llega | me cae | me depositan | veo) (mi dinero | el dinero | el reembolso | el nuevo | el @sofa | el @sofa nuevo)",
      "cuando (llega | me entregan | me traen) (el nuevo | el @sofa nuevo | el otro | el @sofa)",
      "para cuando (estaria | estara | llega | llegaria)",
    ] },
    ask_pickup: { patterns: [
      "[y] (van a | pueden | puede | me van a | ustedes van a) (recoger | llevarse) (el | mi) (@sofa | viejo | danado | roto | @sofa danado | @sofa roto | @sofa viejo)",
      "y (el | mi) @sofa (danado | roto | viejo)",
      "que hago con el (@sofa | danado | roto | viejo) [danado | roto | viejo]",
      "(quien | ustedes) (recoge | recogen | se lleva | se llevan) el (@sofa | danado | roto)",
    ] },

    // --- thanks, goodbye, leaving, rudeness ------------------------------------------------------
    appreciate: { patterns: [
      "(le | se lo | les) agradezco (mucho | muchisimo | de verdad | sinceramente | infinitamente) [su ayuda] [de verdad] #h:appreciate",
      "(le | se lo) agradezco [mucho] su (ayuda | tiempo | paciencia | atencion) [de verdad]",
      "(fue | ha sido | usted ha sido | usted fue) (muy | super)? (amable | de gran ayuda | muy util)",
      "valoro [mucho] su ayuda",
      "gracias por (resolverlo | resolver esto | entenderme | arreglar esto | su atencion)",
    ] },
    thats_all: { patterns: [
      "[no] (eso es todo | es todo | seria todo | eso seria todo) [gracias] #h:thats_all",
      "[no] nada [mas] [gracias]",
      "[no] (estoy bien | todo bien) [gracias]",
      "[no] (con eso | ya con eso) (es todo | esta bien | basta)",
      "[no] (es todo por ahora | por ahora es todo)",
    ] },
    have_nice_day: { patterns: ["que tenga (muy buen dia | muy buena tarde | un excelente dia | excelente dia | muy bonito dia) #h:nice_day", "le deseo (un buen dia | buena tarde | un excelente dia | buen dia)"] },
    walk_away: { patterns: [
      "(olvidelo | olvidalo | ya no importa | mejor ya no) [luego (llamo | marco | le llamo)]",
      "(voy a | mejor voy a) (comprar | ir) (en | a) otra (tienda | parte | muebleria)",
      "(me voy | me voy a ir) a otra (tienda | muebleria)",
      "nunca (vuelvo | voy a volver) a comprar (aqui | con ustedes)",
      "no tengo tiempo para esto",
      "(voy a | mejor) colgar",
    ] },
    rude: { patterns: [
      "(usted es | ustedes son | eres) (un inutil | una inutil | unos inutiles | inutil | inutiles | incompetente | incompetentes | un idiota | unos idiotas | un tonto | una tonta | unos tontos | un desastre | lo peor | ridiculos | un fraude) #tip:too_harsh",
      "(esta tienda | su tienda | su empresa | esta empresa | hogar puerto | su servicio | este servicio) es (una burla | un fraude | una estafa | un desastre | lo peor | ridicula | ridiculo | una porqueria | una verguenza | un robo) #tip:too_harsh",
      "(que les pasa | que le pasa) [a ustedes | a usted] #tip:too_harsh",
      "(callese | escucheme bien | callate) #tip:too_harsh",
      "(me esta tomando el pelo | me estan tomando el pelo | se esta burlando de mi | se estan burlando de mi | esta bromeando | me esta bromeando) #tip:too_harsh",
      "(cree que | creen que) soy (tonto | tonta | idiota) #tip:too_harsh",
      "no soy (tonto | tonta | idiota) #tip:too_harsh",
      "claro que (lo revisé | esta armado | esta bien armado) no soy (tonto | tonta | idiota) #tip:too_harsh",
      "estoy (muy | bien | super)? (enojado | enojada | furioso | furiosa) #tip:too_harsh",
      "odio (esta tienda | su tienda | su empresa | su servicio) #tip:too_harsh",
      "(esto | eso) es (ridiculo | absurdo | una locura | una burla | el colmo) #tip:too_harsh",
    ] },
  },

  lines: {
    // --- the recorded message (speaker: harbor_bot) ---
    hold_msg: [
      t("Su | llamada | es | muy | importante | para | nosotros. | Por favor, | espere | en | la | línea.",
        "Your | call | is | very | important | to | us. | Please, | wait | on | the | line.", "Your call is very important to us. Please hold."),
    ],
    hold_long: [
      t("Todos | nuestros | asesores | están | ocupados. | El | tiempo | de | espera | aproximado | es | de | 47 | minutos.",
        "All | our | agents | are | busy. | The | time | of | wait | approximate | is | — | 47 | minutes.",
        "All of our agents are currently busy. Your estimated wait time is 47 minutes.",
        { say: "Todos nuestros asesores están ocupados. El tiempo de espera aproximado es de cuarenta y siete minutos.", flags: { 11: "de: Spanish puts de before an amount here; English has no word." } }),
    ],

    // --- Jorge ---
    kyle_greet: [
      t("Gracias | por | llamar | a | Hogar Puerto, | le atiende | Jorge. | ¿En | qué | le | puedo | ayudar?",
        "Thanks | for | calling | — | Hogar Puerto, | you're speaking with | Jorge. | In | what | (to) you | can I | help?",
        "Thanks for calling Hogar Puerto, this is Jorge. How can I help you today?",
        { flags: { 3: F_A_CALL, 5: "Le atiende: the call-center way to say who's helping you, literally attends to you." } }),
      t("Hogar Puerto, | buenas tardes, | habla | Jorge. | ¿En | qué | le | puedo | servir?",
        "Hogar Puerto, | good afternoon, | speaking | Jorge. | In | what | (to) you | can I | serve?",
        "Hogar Puerto, good afternoon, this is Jorge. What can I do for you today?",
        { flags: { 2: "habla: on the phone, this is…, literally speaks." } }),
    ],
    kyle_greet_hold: [
      t("¡Gracias | por | su | espera! | Le atiende | Jorge, | de | Hogar Puerto. | ¿En | qué | le | puedo | ayudar?",
        "Thanks | for | your | wait! | You're speaking with | Jorge, | from | Hogar Puerto. | In | what | (to) you | can I | help?",
        "Thanks for holding! This is Jorge at Hogar Puerto. How can I help you today?"),
    ],
    kyle_ask_problem: [
      t("Cuénteme, | ¿cuál | es | el | problema?", "Tell me, | what | is | the | problem?", "So, what seems to be the problem?"),
      t("Muy | bien, | aquí | estoy | para | ayudarle. | ¿Qué | pasó?", "Very | good, | here | I am | to | help you. | What | happened?", "Okay, I'm here to help. What's going on?"),
    ],
    kyle_complaint_ok: [
      t("Claro, | dígame. | ¿Qué | pasó?", "Sure, | tell me. | What | happened?", "Of course. What happened?"),
      t("Lamento | escuchar | eso. | ¿Qué | pasó | exactamente?", "I regret | to hear | that. | What | happened | exactly?", "I'm sorry to hear that. What happened, exactly?"),
    ],
    kyle_sorry: [
      t("Ay, | no, | lo siento | mucho.", "Oh, | no, | I'm sorry | a lot.", "Oh no, I'm so sorry to hear that."),
      t("Eso | no está | bien. | Una | disculpa.", "That | isn't | good. | An | apology.", "That's not good. I apologize."),
    ],
    kyle_plugged_m: [
      t("Solo | para | confirmar, | señor: | ¿ya | revisó | que | esté | bien | armado?",
        "Just | to | confirm, | sir: | already | did you check | that | it is | well | assembled?",
        "Just to check, sir: are you sure it's put together right?",
        { flags: { 4: "Ya in a question: already, as in English have you … yet." } }),
    ],
    kyle_plugged_f: [
      t("Solo | para | confirmar, | señora: | ¿ya | revisó | que | esté | bien | armado?",
        "Just | to | confirm, | ma'am: | already | did you check | that | it is | well | assembled?",
        "Just to check, ma'am: are you sure it's put together right?",
        { flags: { 4: "Ya in a question: already, as in English have you … yet." } }),
    ],
    // Jorge's script goes on (half of the time)
    kyle_off_on: [
      t("¿Y | ya | intentó | apretar | los | tornillos | de | la | pata?", "And | already | did you try | to tighten | the | screws | of | the | leg?",
        "And have you tried tightening the screws on the leg?", { flags: { 8: F_PATA } }),
    ],
    kyle_plugged_ok: [
      t("Muy | bien, | solo | tenía | que | preguntar. | Viene | en | mi | guion.", "Very | good, | just | I had | to | ask. | It comes | in | my | script.",
        "Okay, I just had to ask. It's on my script."),
    ],
    // "No, no lo he revisado." / "No." to "¿Y ya intentó apretar los tornillos?"
    kyle_plug_now: [
      t("¡Ah! | ¿Lo | puede | revisar, | por favor? | Aquí | {m:lo|f:la} | espero.", "Oh! | It | can you | check, | please? | Here | (for) you | I-wait.",
        "Oh! Could you check it, please? I'll wait.", { flags: { 6: F_YOU_LO } }),
    ],
    kyle_try_now: [
      t("Muy | bien. | ¿Lo | puede | intentar, | por favor? | Aquí | {m:lo|f:la} | espero.", "Very | good. | It | can you | try, | please? | Here | (for) you | I-wait.",
        "Okay. Could you try that, please? I'll wait.", { flags: { 7: F_YOU_LO } }),
    ],
    kyle_still_nothing: [
      t("¿Sigue | igual? | Muy | bien, | lo | anoto.", "Is it still | the same? | Very | good, | it | I-note.", "Still the same? Okay, I'll make a note of that."),
    ],
    kyle_ask_name: [
      t("¿Me | proporciona | su | número | de | pedido, | por favor?", "(To) me | you-provide | your | number | of | order, | please?", "Could I have your order number, please?"),
      t("¿A nombre de | quién | está | el | pedido?", "Under the name of | whom | is | the | order?", "And whose name is the order under?"),
    ],
    kyle_ask_name_again: [
      t("Perdón, | ¿me | da | su | nombre | completo?", "Sorry, | (to) me | you-give | your | name | full?", "Sorry, could I get your full name?"),
    ],
    kyle_order_unknown: [
      t("Mmm, | no me aparece | ese | número. | ¿Me | da | su | nombre | completo?", "Hmm, | it doesn't show up for me | that | number. | (To) me | you-give | your | name | full?",
        "Hmm, that number isn't coming up. Could I get your full name?"),
    ],
    kyle_name_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thanks.")],
    kyle_file1: [
      t("Perfecto, | ya | tengo | su | pedido | aquí.", "Perfect, | now | I-have | your | order | here.", "Okay, I've got your order up here."),
    ],
    kyle_file2: [
      t("Veo | que | la | entrega | era | el | 10 | y | llegó | hasta | el | 17.", "I see | that | the | delivery | was due | the | 10th | and | it-arrived | only on | the | 17th.",
        "I see the delivery was due on the 10th, and it didn't arrive until the 17th.",
        { say: "Veo que la entrega era el diez y llegó hasta el diecisiete.", flags: { 9: "Mexican: llegó hasta el 17 = it didn't arrive until the 17th." },
          neutral: t("Veo | que | la | entrega | era | el | 10 | y | llegó | el | 17.", "I see | that | the | delivery | was due | the | 10th | and | it-arrived | the | 17th.",
            "I see the delivery was due on the 10th, and it arrived on the 17th.", { say: "Veo que la entrega era el diez y llegó el diecisiete." }) }),
    ],
    kyle_file3: [
      t("Y | el | técnico | tenía | cita | el | lunes, | entre | {$win}.", "And | the | technician | had | an appointment | on | Monday, | between | {$win}.",
        "And a technician was scheduled for Monday, between {$win}.", { say: "Y el técnico tenía cita el lunes, entre {$win}.", flags: { 5: F_EL_DAY } }),
    ],
    kyle_file4: [
      t("Y | aquí | aparece | la | visita | como... | ¿realizada?", "And | here | shows | the | visit | as... | completed?", "And it says the visit was... completed?"),
    ],
    kyle_new_visit: [
      t("Lo siento | mucho. | Le | puedo | agendar | una | nueva | visita | para | el | próximo | martes.",
        "I'm sorry | a lot. | (For) you | I can | schedule | a | new | visit | for | — | next | Tuesday.",
        "I'm so sorry about that. I can book you a new visit for next Tuesday.", { flags: { 9: F_EL_DAY } }),
    ],
    kyle_apologize: [
      t("Lo | entiendo | perfectamente, | y | de verdad | le | ofrezco | una | disculpa.", "It | I-understand | perfectly, | and | really | (to) you | I-offer | an | apology.",
        "I completely understand, and I do apologize.", { flags: { 6: F_LE_OFREZCO } }),
      t("Lo | entiendo | totalmente. | Lo siento | mucho.", "It | I-understand | totally. | I'm sorry | a lot.", "I totally get it. I'm so sorry."),
    ],
    kyle_three_calls_m: [
      t("Tres | llamadas... | De verdad | lo siento | mucho, | señor.", "Three | calls... | Really | I'm sorry | a lot, | sir.", "Three calls, wow. I'm really sorry, sir."),
    ],
    kyle_three_calls_f: [
      t("Tres | llamadas... | De verdad | lo siento | mucho, | señora.", "Three | calls... | Really | I'm sorry | a lot, | ma'am.", "Three calls, wow. I'm really sorry, ma'am."),
    ],
    kyle_hands_tied: [
      t("Sinceramente, | yo | tengo | las | manos | atadas.", "Honestly, | I | have | the | hands | tied.", "Honestly, my hands are tied here.",
        { flags: { 3: "las manos: Spanish says the hands where English says my hands." } }),
    ],
    kyle_earliest: [
      t("Lo más pronto | que | tengo | es | el | próximo | martes.", "The earliest | that | I-have | is | — | next | Tuesday.", "The earliest I have is next Tuesday.",
        { flags: { 4: "el: Spanish puts the article before próximo martes; English has none." } }),
    ],
    kyle_book_q: [
      t("Entonces, | ¿le | agendo | la | visita | para | el | próximo | martes?", "So, | (for) you | shall I schedule | the | visit | for | — | next | Tuesday?",
        "So, should I book you for next Tuesday?", { flags: { 6: "el: Spanish puts the article before próximo martes; English has none." } }),
    ],
    kyle_offer_manager: [
      t("¿Le gustaría | hablar | con | mi | gerente?", "Would you like | to speak | with | my | manager?", "Would you like to speak to my manager?"),
    ],
    kyle_manager_first: [
      t("Claro. | Pero | primero | necesito | algunos | datos.", "Sure. | But | first | I need | some | details.", "Of course. But first, I need a few details."),
    ],
    kyle_manager_file: [
      t("Claro. | Nada más | déjeme | revisar | su | pedido | primero.", "Sure. | Just | let me | check | your | order | first.", "Sure. Let me just check your order first."),
    ],
    kyle_cant_refund: [
      t("Me temo | que | yo | no puedo | autorizar | reembolsos. | Solo | mi | gerente | puede | hacerlo.",
        "I'm afraid | that | I | can't | approve | refunds. | Only | my | manager | can | do it.",
        "I'm afraid I can't approve refunds. Only my manager can do that."),
    ],
    kyle_cant_replace: [
      t("Me temo | que | yo | no puedo | autorizar | un | cambio. | Solo | mi | gerente | puede | hacerlo.",
        "I'm afraid | that | I | can't | approve | an | exchange. | Only | my | manager | can | do it.",
        "I'm afraid I can't approve a replacement. Only my manager can do that."),
    ],
    kyle_note: [t("Muy | bien, | lo | anoto | en | su | expediente.", "Very | good, | it | I-note | in | your | file.", "Okay, I'll add that to your file.")],
    kyle_writing: [t("Le | va | a | llegar | un | correo | con | todo.", "(To) you | it's going | to | arrive | an | email | with | everything.", "You'll get an email with everything after the call.")],
    kyle_ref: [
      t("Claro, | es | el | mismo | de | antes: | {$text}.", "Sure, | it's | the | same | of | before: | {$text}.", "Sure, it's the same one as before: {$text}.",
        { say: "Claro, es el mismo de antes: {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 4: "de antes: from before, as before." } }),
    ],
    kyle_transfer: [
      t("Claro. | Ahorita | {m:lo|f:la} | comunico | con | mi | gerente.", "Sure. | Right now | you | I-connect | with | my | manager.", "Of course. One moment, I'll transfer you to my manager.",
        { flags: { 1: "Mexican: ahorita = right now, in a moment.", 2: F_YOU_LO },
          neutral: t("Claro. | Enseguida | {m:lo|f:la} | comunico | con | mi | gerente.", "Sure. | Right away | you | I-connect | with | my | manager.",
            "Of course. One moment, I'll transfer you to my manager.", { flags: { 2: F_YOU_LO } }) }),
      t("Por supuesto. | Déjeme | pasarle | la | llamada | a | mi | gerente.", "Of course. | Let me | pass (to) you | the | call | to | my | manager.",
        "Absolutely. Let me get my manager for you.", { flags: { 2: "pasarle la llamada: put the call through (le = you, the caller)." } }),
    ],
    kyle_can_hold: [
      t("Puede | tardar | unos | minutos. | ¿Puede | esperar | en | la | línea?", "It may | take | a few | minutes. | Can you | wait | on | the | line?",
        "It might take a few minutes. Can you hold?"),
    ],
    kyle_hold_ok: [t("Ja. | Espero | que | no tarde | tanto.", "Ha. | I hope | that | it doesn't take | so long.", "Ha. I hope it won't take that long.")],
    kyle_thanks_hold: [t("Gracias | por | su | paciencia.", "Thanks | for | your | patience.", "Thank you for your patience.")],
    kyle_hold_no: [t("Seré | rápido, | se lo | prometo.", "I'll be | quick, | it to you | I-promise.", "I'll be quick, I promise.")],
    kyle_rude_m: [
      t("Entiendo | que | esté | molesto, | señor. | De verdad | quiero | ayudarle.", "I understand | that | you are | upset, | sir. | Really | I-want | to help you.",
        "I understand you're frustrated, sir. I really do want to help."),
    ],
    kyle_rude_f: [
      t("Entiendo | que | esté | molesta, | señora. | De verdad | quiero | ayudarle.", "I understand | that | you are | upset, | ma'am. | Really | I-want | to help you.",
        "I understand you're frustrated, ma'am. I really do want to help."),
    ],
    kyle_rude2: [
      t("Estoy | de | su | lado, | se lo | prometo.", "I am | on | your | side, | it to you | I-promise.", "I'm on your side here, I promise."),
    ],
    kyle_tuesday_ok: [
      t("¡Listo! | Su | visita | queda | agendada | para | el | próximo | martes.", "Done! | Your | visit | stays | scheduled | for | — | next | Tuesday.",
        "Okay! You're all set for next Tuesday.", { flags: { 6: "el: Spanish puts the article before próximo martes; English has none." } }),
    ],
    kyle_understand: [t("Entiendo.", "I understand.", "I understand.")],
    kyle_bye: [
      t("Gracias | por | llamar | a | Hogar Puerto. | Que | tenga | buen | día.", "Thanks | for | calling | — | Hogar Puerto. | (I hope) | you have | a good | day.",
        "Thank you for calling Hogar Puerto, and have a nice day.", { flags: { 3: F_A_CALL } }),
    ],

    // --- Brenda ---
    brenda_hi: [
      t("Buenas tardes, | habla | Brenda, | gerente | de | atención a clientes. | Jorge | ya | me | explicó | el | problema | con | su | sofá.",
        "Good afternoon, | speaking | Brenda, | manager | of | customer service. | Jorge | already | (to) me | explained | the | problem | with | your | sofa.",
        "Hi, this is Brenda, the customer care manager. Jorge filled me in on your sofa."),
    ],
    brenda_hi2: [
      t("Entiendo | que | no ha | sido | una | buena | experiencia.", "I understand | that | it hasn't | been | a | good | experience.", "I understand this hasn't been a great experience."),
      t("Le | ofrezco | una | disculpa | por | todas | las | molestias.", "(To) you | I-offer | an | apology | for | all | the | inconveniences.", "I'm so sorry for all the trouble.",
        { flags: { 0: F_LE_OFREZCO } }),
    ],
    brenda_before: [
      t("Lo | entiendo. | Pero | antes de | eso...", "It | I-understand. | But | before | that...", "I hear you. But before we go there..."),
    ],
    brenda_offer_coupon: [
      t("Como | agradecimiento | por | su | paciencia, | quisiera | ofrecerle | un | cupón | de | {$price}...",
        "As | thanks | for | your | patience, | I'd like | to offer you | a | coupon | of | {$price}...",
        "As a thank-you for your patience, I'd like to offer you a coupon for {$price}...", { say: "Como agradecimiento por su paciencia, quisiera ofrecerle un cupón de {$price}..." }),
    ],
    brenda_offer_mug: [
      t("...¡y | uno | de | nuestros | bonitos | cojines | de | Hogar Puerto!", "...and | one | of | our | lovely | cushions | of | Hogar Puerto!", "...and one of our lovely Hogar Puerto throw pillows!"),
    ],
    brenda_offer_visit: [
      t("Le | puedo | mandar | un | técnico | el | miércoles, | entre | {$win}, | para | repararlo.",
        "(To) you | I can | send | a | technician | on | Wednesday, | between | {$win}, | to | repair it.",
        "I can get a technician out to you on Wednesday, between {$win}, to fix it.", { say: "Le puedo mandar un técnico el miércoles, entre {$win}, para repararlo.", flags: { 5: F_EL_DAY } }),
    ],
    brenda_offer_q: [t("¿Qué | le parece?", "What | do you think?", "How does that sound?")],
    brenda_only_wed: [
      t("Lo siento, | el | técnico | solo | puede | el | miércoles, | entre | {$win}.", "I'm sorry, | the | technician | only | can (come) | on | Wednesday, | between | {$win}.",
        "I'm sorry, the technician can only make it on Wednesday, between {$win}.", { say: "Lo siento, el técnico solo puede el miércoles, entre {$win}.", flags: { 5: F_EL_DAY } }),
    ],
    brenda_check_coupon: [t("Entonces, | ¿le | mando | el | cupón?", "So, | (to) you | shall I send | the | coupon?", "So, shall I send you the coupon?")],
    brenda_check_visit: [
      t("Entonces, | ¿le | agendo | la | visita | del | miércoles?", "So, | (for) you | shall I schedule | the | visit | of the | Wednesday?", "So, shall I book the Wednesday visit for you?"),
    ],
    brenda_coupon_info: [
      t("Es | de | {$price} | para | su | próxima | compra | en | la | tienda.", "It's | of | {$price} | for | your | next | purchase | in | the | store.",
        "It's {$price} off your next purchase in the store.", { say: "Es de {$price} para su próxima compra en la tienda." }),
    ],
    brenda_visit_info: [
      t("El | técnico | va | el | miércoles, | entre | {$win}, | sin | costo | para | usted.", "The | technician | goes | on | Wednesday, | between | {$win}, | without | cost | for | you.",
        "The technician would come on Wednesday, between {$win}, at no cost to you.", { say: "El técnico va el miércoles, entre {$win}, sin costo para usted.", flags: { 3: F_EL_DAY } }),
    ],
    brenda_decline_ack: [t("Entiendo.", "I understand.", "Understood."), t("Comprendo.", "I understand.", "Fair enough.")],
    brenda_day_off: [
      t("Ay, | no. | Eso | no está | bien, | y | lo siento | mucho.", "Oh, | no. | That | isn't | okay, | and | I'm sorry | a lot.", "Oh no. That's not okay, and I'm sorry."),
    ],
    brenda_third_ack: [t("Lo | sé, | y | eso | no debió | pasar.", "It | I-know, | and | that | shouldn't have | happened.", "I know, and that shouldn't have happened.")],
    brenda_further: [
      t("Está | en | su | derecho. | Pero | preferiría | que | lo | resolviéramos | juntos, | ahora mismo.",
        "You're | within | your | right. | But | I'd prefer | that | it | we-solved | together, | right now.",
        "That's your right. But I'd rather we solve this together, right now."),
    ],
    brenda_is_manager: [
      t("Yo | soy | la | gerente, | y | quiero | resolver | esto.", "I | am | the | manager, | and | I-want | to solve | this.", "I'm the manager here, and I want to fix this."),
    ],
    brenda_what_want: [
      t("Entonces, | ¿qué | le gustaría | que | hiciéramos?", "So, | what | would you like | that | we-did?", "So what would you like us to do?"),
      t("¿Qué | solución | está | buscando?", "What | solution | are you | looking for?", "What outcome are you looking for?"),
    ],
    brenda_refund_or: [
      t("¿Prefiere | un | reembolso | o | un | cambio | por | uno | nuevo?", "Do you prefer | a | refund | or | an | exchange | for | one | new?", "Would you prefer a refund or a replacement?"),
    ],
    brenda_refund_ok: [
      t("Le | puedo | autorizar | el | reembolso | completo: | {$price}.", "(For) you | I can | approve | the | refund | full: | {$price}.",
        "I can approve a full refund of {$price}.", { say: "Le puedo autorizar el reembolso completo: {$price}." }),
    ],
    brenda_replace_ok: [
      t("Le | puedo | mandar | un | sofá | nuevo, | el | mismo | modelo | o | uno | mejor.",
        "(To) you | I can | send | a | sofa | new, | the | same | model | or | one | better.",
        "I can send you a brand-new sofa, same model or better."),
    ],
    brenda_pickup: [
      t("Además, | recogemos | el | sofá | dañado | sin | costo.", "Also, | we-pick-up | the | sofa | damaged | without | cost.", "We'll also pick up the damaged sofa for free."),
    ],
    brenda_pickup_yes: [
      t("Sí, | recogemos | el | sofá | dañado | sin | costo.", "Yes, | we-pick-up | the | sofa | damaged | without | cost.", "Yes, we'll pick up the damaged sofa for free."),
    ],
    brenda_timeline: [
      t("La | entrega | normalmente | tarda | de | 10 | a | 14 | días | hábiles.", "The | delivery | usually | takes | from | 10 | to | 14 | days | business.",
        "Delivery usually takes 10 to 14 business days.", { say: "La entrega normalmente tarda de diez a catorce días hábiles.", flags: { 9: "días hábiles: business days." } }),
    ],
    brenda_refund_time: [
      t("El | reembolso | normalmente | tarda | de | 10 | a | 14 | días | hábiles.", "The | refund | usually | takes | from | 10 | to | 14 | days | business.",
        "Refunds usually take 10 to 14 business days.", { say: "El reembolso normalmente tarda de diez a catorce días hábiles.", flags: { 9: "días hábiles: business days." } }),
    ],
    brenda_timeline_q: [t("¿Le parece | bien | ese | plazo?", "Does it seem to you | good | that | time frame?", "Does that timeline work for you?")],
    brenda_deadline_ok: [
      t("¿Para | el | {X}? | Es | muy | poco | tiempo, | pero | lo | puedo | lograr.", "By | — | {X}? | It's | very | little | time, | but | it | I can | manage.",
        "By {X}? That's tight, but I can make it work.", { flags: { 1: F_EL_DAY } }),
    ],
    brenda_deadline_tomorrow: [
      t("¿Para | mañana? | Es | muy | poco | tiempo, | pero | lo | puedo | lograr.", "By | tomorrow? | It's | very | little | time, | but | it | I can | manage.",
        "By tomorrow? That's tight, but I can make it work."),
    ],
    brenda_delivery_day: [
      t("Nuestro | equipo | se lo | puede | entregar | el | {X}, | entre | {$win}.", "Our | team | it to you | can | deliver | on | {X}, | between | {$win}.",
        "Our team can deliver it on {X}, between {$win}.", { say: "Nuestro equipo se lo puede entregar el {X}, entre {$win}.", flags: { 5: F_EL_DAY } }),
    ],
    brenda_delivery_tomorrow: [
      t("Nuestro | equipo | se lo | puede | entregar | mañana, | entre | {$win}.", "Our | team | it to you | can | deliver | tomorrow, | between | {$win}.",
        "Our team can deliver it tomorrow, between {$win}.", { say: "Nuestro equipo se lo puede entregar mañana, entre {$win}." }),
    ],
    brenda_refund_day: [
      t("El | reembolso | va a | estar | listo | a más tardar | el | {X}. | Yo | me encargo.", "The | refund | is going to | be | ready | at the latest | on | {X}. | I | will see to it.",
        "I'll make sure the refund goes through by {X}.", { flags: { 6: F_EL_DAY } }),
    ],
    brenda_refund_tomorrow: [
      t("El | reembolso | va a | estar | listo | mañana. | Yo | me encargo.", "The | refund | is going to | be | ready | tomorrow. | I | will see to it.",
        "I'll make sure the refund goes through by tomorrow."),
    ],
    brenda_lets_say: [t("Entendido. | Digamos | el | viernes, | entonces.", "Understood. | Let's say | — | Friday, | then.", "Understood. Let's say Friday, then.", { flags: { 2: "el + day: the article Spanish puts before a day; English has none." } })],
    brenda_which_day: [t("¿Qué | día | tenía | en | mente?", "What | day | did you have | in | mind?", "What day did you have in mind?")],
    brenda_ok: [t("Perfecto.", "Perfect.", "Great."), t("Excelente.", "Excellent.", "Wonderful.")],
    brenda_confirm_q: [t("¿Está | usted | de acuerdo?", "Are | you | in agreement?", "Does that work for you?")],
    brenda_writing_ok: [
      t("Claro. | Hoy mismo | le | mando | la | confirmación | por escrito | a | su | correo.", "Sure. | This very day | (to) you | I-send | the | confirmation | in writing | to | your | email.",
        "Absolutely. I'll email you a written confirmation today."),
      t("Por supuesto. | Se lo | pongo | por escrito | y | lo | firmo | yo | misma.", "Of course. | It for you | I-put | in writing | and | it | I-sign | I | myself.",
        "Of course. I'll put it in writing and sign it myself."),
    ],
    brenda_ref_pen: [
      t("Le | voy a | dar | un | número | de | folio. | ¿Tiene | dónde | anotar?", "(To) you | I'm going to | give | a | number | of | reference. | Do you have | where | to write?",
        "Let me give you a reference number. Do you have something to write with?", { flags: { 6: F_FOLIO } }),
    ],
    brenda_ref: [
      t("Es | el | {$text}.", "It's | — | {$text}.", "It's {$text}.", { say: "Es el {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 1: F_EL_NUM } }),
      t("Muy | bien. | Su | número | de | folio | es | el | {$text}.", "Very | good. | Your | number | of | reference | is | — | {$text}.", "Okay. Your reference number is {$text}.",
        { say: "Muy bien. Su número de folio es el {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 7: F_EL_NUM } }),
    ],
    brenda_ref_asked: [
      t("Claro. | Su | número | de | folio | es | el | {$text}.", "Sure. | Your | number | of | reference | is | — | {$text}.", "Of course. Your reference number is {$text}.",
        { say: "Claro. Su número de folio es el {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 6: F_EL_NUM } }),
      t("Por supuesto. | Es | el | {$text}.", "Of course. | It's | — | {$text}.", "Sure. It's {$text}.",
        { say: "Por supuesto. Es el {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 2: F_EL_NUM } }),
    ],
    brenda_ref_repeat: [
      t("Otra vez: | {$text}.", "Again: | {$text}.", "Again: {$text}.", { say: "Otra vez: {$text}.", spell: "HP4471", write: REF_WRITE }),
      t("Claro, | otra vez: | {$text}.", "Sure, | again: | {$text}.", "Sure, again: {$text}.", { say: "Claro, otra vez: {$text}.", spell: "HP4471", write: REF_WRITE }),
    ],
    brenda_ref_before_go: [
      t("Antes de | colgar, | su | número | de | folio | es | el | {$text}.", "Before | hanging up, | your | number | of | reference | is | — | {$text}.",
        "Before you go, your reference number is {$text}.", { say: "Antes de colgar, su número de folio es el {$text}.", spell: "HP4471", write: REF_WRITE, flags: { 7: F_EL_NUM } }),
    ],
    brenda_ref_correct: [t("Exacto.", "Exactly.", "Exactly."), t("Correcto.", "Correct.", "That's right.")],
    brenda_no_pen: [
      t("No se preocupe, | también | va | en | el | correo.", "Don't worry, | also | it-goes | in | the | email.", "No worries, it'll be in the email too."),
    ],
    brenda_partial: [
      t("¡Perfecto! | Le | mando | el | cupón | a | su | correo.", "Perfect! | (To) you | I-send | the | coupon | to | your | email.", "Wonderful! I'll send the coupon to your email."),
    ],
    brenda_partial_visit: [
      t("¡Perfecto! | El | miércoles, | entre | {$win}. | Y | esta | vez | sí | van | a | ir, | se lo | prometo.",
        "Perfect! | — | Wednesday, | between | {$win}. | And | this | time | really | they're going | to | go, | it to you | I-promise.",
        "Wonderful! Wednesday, between {$win}. And this time they'll show up, I promise.",
        { say: "¡Perfecto! El miércoles, entre {$win}. Y esta vez sí van a ir, se lo prometo.", flags: { 1: F_EL_DAY, 8: "sí before a verb stresses it: this time they WILL go." } }),
    ],
    brenda_anything: [t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | else?", "Can I help you with anything else?")],
    brenda_thanks: [t("Gracias | por | su | paciencia. | De verdad.", "Thanks | for | your | patience. | Really.", "Thank you for your patience. Really.")],
    brenda_appreciate_reply: [
      t("Al contrario. | Y | otra vez, | una | disculpa | por | todas | las | molestias.", "On the contrary. | And | again, | an | apology | for | all | the | inconveniences.",
        "Not at all. And again, I'm sorry for all the trouble.", { flags: { 0: "Al contrario: a gracious reply to thanks, as in the thanks should be mine." } }),
    ],
    brenda_bye_new: [
      t("¡Que | tenga | excelente | día, | y | que | disfrute | su | sofá | nuevo!", "(I hope) | you have | an excellent | day, | and | (I hope) | you-enjoy | your | sofa | new!",
        "Have a wonderful day, and enjoy the new sofa!"),
    ],
    brenda_bye: [
      t("Que | tenga | excelente | día.", "(I hope) | you have | an excellent | day.", "Have a wonderful day."),
      t("Cuídese | mucho, | y | que | tenga | buen | día.", "Take care of yourself | a lot, | and | (I hope) | you have | a good | day.", "Take care, and have a good day."),
    ],
    brenda_walk: [
      t("Lamento | que | hoy | no pudiéramos | resolverlo.", "I regret | that | today | we couldn't | solve it.", "I'm sorry we couldn't sort this out today."),
    ],
    brenda_rude: [
      t("Entiendo | que | esté | {m:molesto|f:molesta}. | A ver | qué | puedo | hacer.", "I understand | that | you are | upset. | Let's see | what | I can | do.",
        "I understand you're upset. Let's see what I can do."),
    ],
    brenda_rude2: [
      t("Con gusto | le | ayudo, | pero | hablemos | con | respeto.", "Gladly | (to) you | I-help, | but | let's talk | with | respect.", "I'm happy to help, but let's keep this respectful."),
    ],
  },

  domains: {
    text: () => [REF],
    win: () => [W_MON, W_WED],
    price: () => [PRICE, COUPON],
  },

  hints: {
    problem: {
      lt: "Say you want to complain, and what happened",
      items: [
        { id: "make_complaint", s: t("Quisiera | poner | una | queja.", "I'd like | to put | a | complaint.", "I'd like to make a complaint."), register: "polite",
          note: "Mexico says poner una queja; presentar una queja is a bit more formal." },
        { id: "calling_about", s: t("Llamo | por | mi | sofá.", "I'm calling | about | my | sofa.", "I'm calling about my sofa.") },
        { id: "fridge_stopped", s: t("Mi | sofá | llegó | dañado.", "My | sofa | arrived | damaged.", "My sofa arrived damaged.") },
        { id: "late_delivery", s: t("Me lo | entregaron | una | semana | tarde.", "It to me | they-delivered | one | week | late.", "They delivered it a week late.") },
        { id: "broken_leg", s: t("Tiene | una | pata | rota.", "It has | a | leg | broken.", "One of the legs is broken.", { flags: { 2: F_PATA } }) },
        { id: "tech_never", s: t("El | técnico | nunca | vino.", "The | technician | never | came.", "The technician never came.") },
        { id: "bought_ago", s: t("Lo | compré | hace | tres | semanas.", "It | I-bought | ago | three | weeks.", "I bought it three weeks ago.",
          { flags: { 2: "hace + time: ago, before the time in Spanish." } }) },
      ],
    },
    plugged: {
      lt: "Calmly say you've already checked",
      items: [
        { id: "plugged_yes", s: t("Sí, | ya | lo | revisé.", "Yes, | already | it | I-checked.", "Yes, I already checked.") },
        { id: "checked", s: t("Está | bien | armado: | la | pata | está | rota.", "It's | well | assembled: | the | leg | is | broken.", "It's put together fine: the leg is broken.",
          { flags: { 4: F_PATA } }) },
        { id: "still_not", s: t("Sigue | igual.", "It stays | the same.", "It's still the same.") },
      ],
    },
    name: {
      lt: "Give your name or your order number",
      items: [
        { id: "my_name", s: t("Me llamo | {$name} | {$surname}.", "My name is | {$name} | {$surname}.", "My name is {$name} {$surname}.") },
        { id: "its_name", s: t("Está | a nombre de | {$name} | {$surname}.", "It's | under the name of | {$name} | {$surname}.", "It's under {$name} {$surname}."),
          note: "A nombre de: whose name an order, a booking or a bill is under." },
        { id: "order_is", s: t("Mi | número | de | pedido | es | el | 58213.", "My | number | of | order | is | — | 58213.", "My order number is 58213.",
          { say: "Mi número de pedido es el cincuenta y ocho, doscientos trece.", flags: { 5: F_EL_NUM } }), note: "Digit by digit or in pairs: both work." },
      ],
    },
    escalate: {
      lt: "Say it's your third call and ask for the manager",
      items: [
        { id: "third_time", s: t("Es | la | tercera | vez | que | llamo.", "It's | the | third | time | that | I-call.", "This is the third time I've called.") },
        { id: "not_good", s: t("Me temo | que | eso | no es | suficiente.", "I'm afraid | that | that | isn't | enough.", "I'm afraid that's not good enough.") },
        { id: "manager", s: t("¿Podría | hablar | con | su | gerente, | por favor?", "Could I | speak | with | your | manager, | please?", "Could I speak to your manager, please?"), register: "polite" },
        { id: "nobody_came", s: t("Nadie | vino. | Esperé | todo | el | día.", "Nobody | came. | I-waited | all | the | day.", "Nobody came. I waited all day.",
          { flags: { 4: "todo el día: Spanish has the article; English says all day." } }) },
        { id: "not_your_fault", s: t("Sé | que | no es | su | culpa, | pero...", "I know | that | it isn't | your | fault, | but...", "I know it's not your fault, but..."),
          note: "Polite but firm: the agent isn't to blame, and you still say what you want." },
        { id: "further", s: t("Si | no, | voy a | presentar | una | queja | ante | la | Profeco.", "If | not, | I'm going to | file | a | complaint | before | the | Profeco.",
          "Otherwise, I'll file a complaint with Profeco.", { flags: { 7: "la Profeco: Spanish uses the article with the agency's name." } }),
          note: "Profeco (Procuraduría Federal del Consumidor) is Mexico's federal consumer protection agency." },
      ],
    },
    hold: {
      lt: "Say you can hold",
      items: [
        { id: "all_day", s: t("No hay problema. | Tengo | todo | el | día.", "No problem. | I have | all | the | day.", "That's fine. I've got all day.",
          { flags: { 3: "todo el día: Spanish has the article; English says all day." } }) },
        { id: "can_hold", s: t("Claro, | aquí | espero.", "Sure, | here | I-wait.", "Sure, I can hold.") },
      ],
    },
    offer: {
      lt: "Politely say no and ask for what you want",
      items: [
        { id: "full_refund", s: t("Quiero | un | reembolso | completo.", "I want | a | refund | full.", "I want a full refund.") },
        { id: "most_kind", s: t("Le | pido | de la manera más atenta | que | me | devuelvan | mi | dinero.", "(Of) you | I-ask | most courteously | that | (to) me | they-return | my | money.",
          "I'd kindly ask that you refund my money."), register: "polite", note: "Formal Mexican courtesy: very polite and very firm at the same time." },
        { id: "exijo", s: t("Exijo | que | me | devuelvan | mi | dinero.", "I demand | that | (to) me | they-return | my | money.", "I demand my money back."),
          note: "Exijo (I demand) is strong: fine in a formal complaint if you say it calmly." },
        { id: "decline", s: t("Gracias, | pero | un | cupón | no es | suficiente.", "Thanks, | but | a | coupon | isn't | enough.", "Thank you, but I'm afraid a coupon isn't enough.") },
        { id: "keep_mug", s: t("Gracias, | pero | puede | quedarse con | el | cojín.", "Thanks, | but | you can | keep | the | cushion.", "Thank you, but you can keep the pillow.") },
        { id: "replacement", s: t("Quisiera | un | sofá | nuevo, | por favor.", "I'd like | a | sofa | new, | please.", "I'd like a replacement, please.") },
        { id: "refund_or", s: t("Quiero | un | reembolso | o | un | sofá | nuevo.", "I want | a | refund | or | a | sofa | new.", "I'd like a refund or a replacement.") },
        { id: "day_off", s: t("Ya | falté | al | trabajo | una | vez, | y | nadie | vino.", "Already | I-missed | — | work | one | time, | and | nobody | came.",
          "I already took a day off once, and nobody came.", { flags: { 2: "al trabajo: Spanish has the article (a + el); English says missed work." } }) },
        { id: "further", s: t("Si | no, | voy a | presentar | una | queja | ante | la | Profeco.", "If | not, | I'm going to | file | a | complaint | before | the | Profeco.",
          "Otherwise, I'll file a complaint with Profeco.", { flags: { 7: "la Profeco: Spanish uses the article with the agency's name." } }) },
      ],
    },
    deadline: {
      lt: "Set a deadline",
      items: [
        { id: "by_friday", s: t("Necesito | que | quede | resuelto | a más tardar | el | viernes.", "I need | that | it-ends-up | resolved | at the latest | — | Friday.",
          "I need this resolved by Friday at the latest.", { flags: { 5: F_EL_DAY } }) },
        { id: "need_by", s: t("Lo | necesito | para | el | viernes.", "It | I-need | for | — | Friday.", "I need it by Friday.",
          { flags: { 2: "para + a day: a deadline, by Friday.", 3: F_EL_DAY } }) },
        { id: "asap", s: t("Lo antes posible, | por favor.", "As soon as possible, | please.", "As soon as possible, please.") },
        { id: "too_long", s: t("Dos | semanas | es | demasiado | tiempo.", "Two | weeks | is | too much | time.", "Two weeks is too long, I'm afraid.") },
      ],
    },
    confirm: {
      lt: "Ask for it in writing",
      items: [
        { id: "in_writing", s: t("¿Me lo | puede | dar | por escrito?", "It to me | can you | give | in writing?", "Can I have that in writing?") },
        { id: "email_confirm", s: t("¿Me lo | puede | confirmar | por | correo?", "It to me | can you | confirm | by | email?", "Could you confirm that by email, please?") },
        { id: "works", s: t("Sí, | me parece | bien.", "Yes, | it seems to me | good.", "Yes, that works for me.") },
      ],
    },
    reference: {
      lt: "Ask for a reference number and read it back",
      items: [
        { id: "ask_ref", s: t("¿Me | da | un | número | de | folio, | por favor?", "(To) me | you-give | a | number | of | reference, | please?", "Could I have a reference number, please?",
          { flags: { 5: F_FOLIO } }) },
        { id: "go_ahead", s: t("Sí, | dígame.", "Yes, | tell me.", "Yes, go ahead.") },
        { id: "readback", s: t("HP-4471. | Anotado.", "HP-4471. | Noted.", "HP-4471. Got it.", { say: "Hache, pe, cuatro, cuatro, siete, uno. Anotado." }) },
        { id: "repeat_num", s: t("¿Me | repite | el | número, | por favor?", "(To) me | you-repeat | the | number, | please?", "Could you repeat the number, please?") },
      ],
    },
    closing: {
      lt: "Thank her and say goodbye",
      items: [
        { id: "appreciate", s: t("Le | agradezco | mucho | su | ayuda, | de verdad.", "(To) you | I-thank | a lot | your | help, | really.", "I really appreciate your help, I truly do.") },
        { id: "thats_all", s: t("No, | es | todo. | Gracias.", "No, | it's | all. | Thanks.", "No, that's all. Thank you.") },
        { id: "nice_day", s: t("Que | tenga | muy | buen | día.", "(I hope) | you have | very | good | day.", "Have a nice day.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a company's staff, usted is more polite: puede (puedes is for friends).", better: "¿Me puede pasar con su gerente?" },
    blunt_manager: { key: "blunt_manager", lt: "Understood! That sounds like an order. You can be just as firm and still polite.", better: "¿Podría hablar con su gerente, por favor?" },
    too_harsh: { key: "too_harsh", lt: "Understood! Anger is understandable, but insults only make it harder. Polite but firm works best: say what's wrong and what you expect.", better: "Sé que no es su culpa, pero es la tercera vez que llamo." },
    review_threat: { key: "review_threat", lt: "Understood! A bad-review threat usually makes things worse. Firmer and more polite:", better: "Si no, voy a presentar una queja ante la Profeco." },
    by_until: { key: "by_until", lt: "Understood! For a deadline say para el viernes or a más tardar el viernes: in Mexico, hasta el viernes can mean not before Friday.", better: "Lo necesito a más tardar el viernes." },
    refund_word: { key: "refund_word", lt: "Understood! In Spanish, a refund is un reembolso.", better: "Quiero un reembolso completo." },
  },

  merges: {
    "le atiende": { reason: "lexical_expression", split: "le → (to) you + atiende → attends is the call-center formula: you're speaking with.", minimal: "Two words; the name stays outside." },
    "hogar puerto": { reason: "lexical_expression", split: "Hogar → home + Puerto → port would translate a store's name; = Hogar Puerto.", minimal: "Two words of one name." },
    "atención a clientes": { reason: "lexical_expression", split: "atención → attention + a → to + clientes → customers is the department's name: customer service.", minimal: "Three words, one name." },
    "lo más pronto": { reason: "lexical_expression", split: "lo → the + más → most + pronto → soon: one superlative = the earliest.", minimal: "Three words." },
    "me temo": { reason: "lexical_expression", split: "me → myself + temo → I fear is false here; the polite softener = I'm afraid.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of: de has no English word before a verb or noun here; = before.", minimal: "Two words." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same is false; = right now.", minimal: "Two words." },
    "hoy mismo": { reason: "lexical_expression", split: "hoy → today + mismo → same is false; = this very day.", minimal: "Two words." },
    "por escrito": { reason: "lexical_expression", split: "por → by + escrito → written: the fixed phrase = in writing.", minimal: "Two words." },
    "a más tardar": { reason: "lexical_expression", split: "a → to + más → more + tardar → to be late: the fixed phrase = at the latest.", minimal: "Three words." },
    "me encargo": { reason: "lexical_expression", split: "me → myself + encargo → I charge is false; encargarse = to take care of it (I'll see to it).", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth is false; = really.", minimal: "Two words." },
    "al contrario": { reason: "lexical_expression", split: "al → to the + contrario → contrary: the fixed reply to thanks = not at all.", minimal: "Two words." },
    "de la manera más atenta": { reason: "lexical_expression", split: "de → of + la → the + manera → manner + más → most + atenta → attentive: the formal Mexican formula = most courteously.", minimal: "The five words form the formula." },
    "quedarse con": { reason: "lexical_expression", split: "quedarse → to stay + con → with is false; quedarse con algo = to keep something.", minimal: "Verb and preposition." },
    "lo antes posible": { reason: "lexical_expression", split: "lo → it + antes → before + posible → possible is a word-for-word reading; = as soon as possible.", minimal: "Three words." },
    "a nombre de": { reason: "lexical_expression", split: "a → to + nombre → name + de → of; = under the name of.", minimal: "Three words." },
    "voy a": { reason: "grammatical_fusion", split: "voy → I go + a → to: ir a + verb is the near future = I'm going to.", minimal: "Two words; the verb stays outside." },
    "va a": { reason: "grammatical_fusion", split: "va → it goes + a → to: ir a + verb is the near future = is going to.", minimal: "Two words; the verb stays outside." },
    "a ver": { reason: "lexical_expression", split: "a → to + ver → see; = let's see.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say you want to make a complaint, and explain what happened", done: (c) => !!c.s.problem },
    // a bonus: shown while it still fits (before asking for the manager), and ticked when said
    { lt: "Say this is your third call", optional: true, when: (c) => !c.s.escalated || !!c.s.thirdSaid, done: (c) => !!c.s.thirdSaid },
    { lt: "Ask to speak to the manager", done: (c) => !!c.s.escalated },
    { lt: "Turn down the coupon or another visit, and ask for a refund or a new sofa", done: (c) => !!c.s.remedy },
    // bonuses once the remedy is approved; at the end only the ones done stay on the list
    { lt: "Set a deadline (e.g. by Friday)", optional: true, when: (c) => !!c.s.remedy && (!c.s.wrapUp || deadlineSet(c)), done: deadlineSet },
    { lt: "Ask for it in writing", optional: true, when: (c) => !!c.s.remedy && (!c.s.wrapUp || !!c.s.writing), done: (c) => !!c.s.writing },
    { lt: "Get the reference number", done: (c) => !!c.s.ref },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem || !!c.s.over,
      ask: (c) => K(c, turn(c).complained ? "kyle_complaint_ok" : "kyle_ask_problem"),
      expects: ["complain_open", "fridge_broke", "no_show", "third_time", "ask_manager", "ask_refund", "ask_replacement", "intro_name", "intro_this_ctx"],
      suggest: [{ lt: "Say you want to complain, and what happened", hint: "problem" }],
      yes: () => { /* "¿Sí?" – Jorge asks what the problem is */ }, no: () => { /* the same */ },
      help: (c) => { K(c, "kyle_ask_problem"); } },
    // Twist: Jorge reads from his script. Any answer will do.
    { id: "plugged", when: (c) => !!c.s.pluggedTwist && !!c.s.problem && !c.s.transferred, done: (c) => !!c.s.pluggedDone || !!c.s.over,
      ask: (c) => { c.twist("plugged_in"); KG(c, "kyle_plugged"); if (c.chance(0.5)) { c.s.offOn = true; K(c, "kyle_off_on"); } },
      expects: ["plugged_yes", "plugged_no_ctx", "still_ctx"],
      suggest: [{ lt: "Calmly say you've already checked", hint: "plugged" }],
      // a bare "No." takes the question literally: Jorge asks the learner to check
      yes: (c) => { pluggedAnswered(c); }, no: (c) => { plugNow(c); } },
    // asked at most twice: the order number or the name on the order
    { id: "name", when: (c) => !!c.s.problem && pluggedOk(c), done: (c) => nameDone(c) || !!c.s.transferred || !!c.s.over,
      ask: (c) => { const n = c.s.nameAsked = (c.s.nameAsked ?? 0) + 1; K(c, n === 1 ? "kyle_ask_name" : "kyle_ask_name_again"); },
      expects: ["intro_name", "intro_ctx", "intro_this_ctx", "order_num", "order_ctx", "third_time"],
      suggest: [{ lt: "Give your name or your order number: 58213", hint: "name" }],
      yes: () => { /* Jorge asks again */ }, no: () => { /* the same */ } },
    // Jorge reads the file (the comic beat: "¿realizada?") and offers another visit; then his hands are tied;
    // then he offers his manager.
    { id: "history", when: (c) => !!c.s.problem && pluggedOk(c) && nameDone(c),
      done: (c) => (!!c.s.escalated && !!c.s.fileRead) || !!c.s.transferred || !!c.s.over,
      ask: (c) => {
        const n = c.s.histN = (c.s.histN ?? 0) + 1;
        if (n === 1) {
          c.s.fileRead = true;
          c.twist("file_completed");
          K(c, "kyle_file1"); K(c, "kyle_file2"); K(c, "kyle_file3", { win: W_MON }); K(c, "kyle_file4");
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
      suggest: [{ lt: "Say it's your third call and ask for the manager", hint: "escalate" }],
      // "Sí" / "Está bien" to "Le puedo agendar una nueva visita para el próximo martes": Jorge makes sure first
      yes: (c) => { if (!c.s.escalated && (c.s.histN ?? 0) <= 2) askBookTuesday(c); },
      no: () => { /* Jorge goes on: his hands are tied */ },
      help: (c) => { offerManager(c); } },
    { id: "transfer", when: (c) => !!c.s.escalated && !!c.s.problem && pluggedOk(c) && nameDone(c) && !!c.s.fileRead,
      done: (c) => !!c.s.transferred || !!c.s.over,
      ask: (c) => { if (!c.s.transferAsked) { c.s.transferAsked = true; K(c, "kyle_transfer"); } K(c, "kyle_can_hold"); },
      expects: ["can_hold", "cant_hold"],
      suggest: [{ lt: "Say you can hold", hint: "hold" }],
      yes: (c) => { transferNow(c, "yes"); }, no: (c) => { transferNow(c, "no"); } },
    // Twist: Brenda offers a $500 coupon and a cushion, or a technician on Wednesday between 10 and 2.
    { id: "offer", when: (c) => !!c.s.transferred, done: (c) => !!c.s.remedy || !!c.s.offerClosed || !!c.s.over,
      ask: (c) => {
        const n = c.s.offerN = (c.s.offerN ?? 0) + 1;
        if (n === 1) {
          c.twist(c.s.offerKind);
          if (c.s.wish) B(c, "brenda_before");
          if (c.s.offerKind === "coupon") { B(c, "brenda_offer_coupon", { price: COUPON }); B(c, "brenda_offer_mug"); } else B(c, "brenda_offer_visit", { win: W_WED });
          B(c, "brenda_offer_q");
          c.s.offerQ = true;
          return;
        }
        if (c.s.accepted) { B(c, "brenda_anything"); expectAnything(c); return; }
        if (n === 2) { c.s.offerQ = false; B(c, "brenda_what_want"); return; }
        askRefundOr(c);
      },
      expects: ["decline_offer", "accept_offer", "agree", "ask_refund", "ask_replacement", "refund_or", "either_ctx", "not_remedy", "no_show", "third_time",
        "not_good_enough", "further", "disbelief", "set_deadline", "offer_q", "other_day_ctx"],
      suggest: [{ lt: "Politely say no and ask for a refund or a new sofa", hint: "offer" }],
      // rule 17: "Está bien, gracias" could be a no thanks: Brenda asks before booking anything
      yes: (c) => { if (!c.s.offerQ) return; if (/gracias/.test(heard(c))) askOfferConfirm(c); else acceptOffer(c); },
      no: (c) => { declineWith(c, "brenda_decline_ack"); },
      help: (c) => { askRefundOr(c); } },
    // Brenda's remedy lines end with "de 10 a 14 días hábiles": that is the question.
    { id: "deadline", when: (c) => !!c.s.remedy && !c.s.over, done: (c) => !!c.s.deadline || !!c.s.over,
      ask: (c) => { if (!turn(c).timeline) B(c, "brenda_timeline_q"); },
      expects: ["set_deadline", "deadline_ctx", "agree", "ask_writing", "ask_reference", "ask_timeline", "not_good_enough", "disagree_ctx"],
      suggest: [{ lt: "Set a deadline (e.g. by Friday)", hint: "deadline" }, { lt: "Agree and ask for it in writing", hint: "confirm" }],
      yes: (c) => { c.s.deadline = "accepted"; B(c, "brenda_ok"); },
      no: (c) => { B(c, "brenda_which_day"); expectWhichDay(c); },
      help: (c) => { letsSayFriday(c); } },
    { id: "confirm", when: (c) => !!c.s.remedy && deadlineSet(c) && !c.s.over, done: (c) => !!c.s.confirmed || !!c.s.over,
      ask: (c) => B(c, "brenda_confirm_q"),
      expects: ["ask_writing", "agree", "appreciate", "ask_reference", "set_deadline", "deadline_ctx", "disagree_ctx"],
      suggest: [{ lt: "Agree and ask for it in writing", hint: "confirm" }],
      yes: (c) => { c.s.confirmed = true; B(c, "brenda_ok"); },
      no: (c) => { B(c, "brenda_which_day"); expectWhichDay(c); } },
    { id: "reference", when: (c) => !c.s.over && ((!!c.s.remedy && (!!c.s.confirmed || c.s.deadline === "accepted")) || !!c.s.offerClosed),
      done: (c) => !!c.s.ref || !!c.s.over,
      ask: (c) => B(c, "brenda_ref_pen"),
      expects: ["pen_ready", "pen_ctx", "no_pen", "pen_wait", "ask_reference", "ref_readback", "readback_unknown"],
      suggest: [{ lt: "Say you have a pen, and take down the number", hint: "reference" }, { lt: "Ask her to repeat it", hint: "g_clarify" }],
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
    // "Permítame, busco una pluma.": one "Tómese su tiempo."
    more_yes_ctx() { /* answered by the "¿algo más?" questions */ },
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
    // every hint construction
    { say: "Quisiera poner una queja.", intent: "complain_open", step: "problem" },
    { say: "Llamo por mi sofá.", intent: "complain_open", step: "problem" },
    { say: "Mi sofá llegó dañado.", intent: "fridge_broke", step: "problem" },
    { say: "Me lo entregaron una semana tarde.", intent: "fridge_broke", step: "problem" },
    { say: "Tiene una pata rota.", intent: "fridge_broke", step: "problem" },
    { say: "El técnico nunca vino.", intent: "no_show", step: "problem" },
    { say: "Lo compré hace tres semanas.", intent: "fridge_broke", step: "problem" },
    { say: "Sí, ya lo revisé.", intent: "plugged_yes", step: "plugged" },
    { say: "Está bien armado: la pata está rota.", intent: "plugged_yes", step: "plugged" },
    { say: "Sigue igual.", intent: "fridge_broke" },
    { say: "Me llamo Ryan Miller.", intent: "intro_name", step: "name" },
    { say: "Está a nombre de Ryan Miller.", intent: "intro_ctx", step: "name" },
    { say: "Mi número de pedido es el 58213.", intent: "order_num", step: "name", slots: { digits: "58213" } },
    { say: "Es la tercera vez que llamo.", intent: "third_time", step: "history" },
    { say: "Me temo que eso no es suficiente.", intent: "not_good_enough", step: "history" },
    { say: "¿Podría hablar con su gerente, por favor?", intent: "ask_manager", step: "history" },
    { say: "Nadie vino. Esperé todo el día.", intent: "no_show", step: "history" },
    { say: "Sé que no es su culpa, pero...", intent: "not_good_enough", step: "history" },
    { say: "Si no, voy a presentar una queja ante la Profeco.", intent: "further", step: "history" },
    { say: "No hay problema. Tengo todo el día.", intent: "can_hold", step: "transfer" },
    { say: "Claro, aquí espero.", intent: "can_hold", step: "transfer" },
    { say: "Quiero un reembolso completo.", intent: "ask_refund", step: "offer" },
    { say: "Le pido de la manera más atenta que me devuelvan mi dinero.", intent: "ask_refund", step: "offer" },
    { say: "Exijo que me devuelvan mi dinero.", intent: "ask_refund", step: "offer" },
    { say: "Gracias, pero un cupón no es suficiente.", intent: "decline_offer", step: "offer" },
    { say: "Gracias, pero puede quedarse con el cojín.", intent: "decline_offer", step: "offer" },
    { say: "Quisiera un sofá nuevo, por favor.", intent: "ask_replacement", step: "offer" },
    { say: "Quiero un reembolso o un sofá nuevo.", intent: "refund_or", step: "offer" },
    { say: "Ya falté al trabajo una vez, y nadie vino.", intent: "no_show", step: "offer" },
    { say: "Necesito que quede resuelto a más tardar el viernes.", intent: "set_deadline", step: "deadline", slots: { day: "friday" } },
    { say: "Lo necesito para el viernes.", intent: "set_deadline", step: "deadline", slots: { day: "friday" } },
    { say: "Lo antes posible, por favor.", intent: "set_deadline", step: "deadline" },
    { say: "Dos semanas es demasiado tiempo.", intent: "set_deadline", step: "deadline" },
    { say: "¿Me lo puede dar por escrito?", intent: "ask_writing", step: "confirm" },
    { say: "¿Me lo puede confirmar por correo?", intent: "ask_writing", step: "confirm" },
    { say: "Sí, me parece bien.", intent: "agree", step: "deadline" },
    { say: "¿Me da un número de folio, por favor?", intent: "ask_reference" },
    { say: "Sí, dígame.", intent: "pen_ready", step: "reference" },
    { say: "HP-4471. Anotado.", intent: "ref_readback", step: "reference" },
    { say: "¿Me repite el número, por favor?", intent: "ask_repeat", step: "reference" },
    { say: "Le agradezco mucho su ayuda, de verdad.", intent: "appreciate" },
    { say: "No, es todo. Gracias.", intent: "thats_all" },
    { say: "Que tenga muy buen día.", intent: "have_nice_day" },
    // natural alternatives, short answers, accentless typing, tú to staff
    { say: "Hola, habla Ryan Miller.", intent: "intro_this_ctx", step: "problem" },
    { say: "el sofa llego roto y con una semana de retraso", intent: "fridge_broke", step: "problem" },
    { say: "Me dijeron que llegaba el 10 y llegó hasta el 17", intent: "fridge_broke", step: "problem" },
    { say: "No llegó a tiempo", intent: "fridge_broke", step: "problem" },
    { say: "Ryan Miller.", intent: "intro_ctx", step: "name" },
    { say: "Cinco ocho dos uno tres", intent: "order_ctx", step: "name", slots: { digits: "58213" } },
    { say: "¿Realizada? ¿En serio?", intent: "disbelief", step: "history" },
    { say: "Ya llamé tres veces", intent: "third_time", step: "history" },
    { say: "¿Me puedes pasar con tu jefe?", intent: "ask_manager", step: "history" },
    { say: "Páseme a su gerente", intent: "ask_manager", step: "history" },
    { say: "Ustedes son unos inútiles", intent: "rude" },
    { say: "Acepto el cupón", intent: "accept_offer", step: "offer" },
    { say: "El miércoles está bien", intent: "accept_offer", step: "offer" },
    { say: "Quiero un refund", intent: "ask_refund", step: "offer" },
    { say: "¿Me lo pueden cambiar por uno nuevo?", intent: "ask_replacement", step: "offer" },
    { say: "Pensándolo bien, mejor un reembolso", intent: "ask_refund", step: "deadline" },
    { say: "Cualquiera de los dos", intent: "either_ctx", step: "offer" },
    { say: "El jueves", intent: "deadline_ctx", step: "deadline", slots: { day: "thursday" } },
    { say: "¿Cuánto tarda el reembolso?", intent: "ask_timeline", step: "deadline" },
    { say: "¿Van a recoger el sofá dañado?", intent: "ask_pickup", step: "deadline" },
    { say: "No tengo con qué escribir", intent: "no_pen", step: "reference", not: ["pen_ready"] },
    { say: "¿HP 4472?", intent: "readback_unknown", step: "reference", slots: { digits: "4472" } },
    { say: "Lo necesito hasta el viernes", intent: "set_deadline", step: "deadline", slots: { day: "friday" } },
    // Spain forms are correct answers
    { say: "Quiero poner una reclamación", intent: "complain_open", step: "problem" },
    { say: "¿Me podéis devolver el dinero?", intent: "ask_refund", step: "offer" },
    { say: "Vale, el viernes me viene bien", step: "deadline", intent: "deadline_ctx" },
    { say: "No tengo boli", intent: "no_pen", step: "reference", not: ["pen_ready"] },
    // meaning safety: no meaning may flip
    { say: "No quiero hablar con su gerente", intent: "no_manager", step: "history", not: ["ask_manager"] },
    { say: "No quiero otra visita", intent: "not_good_enough", step: "history", not: ["accept_offer"] },
    { say: "El martes no me queda", intent: "decline_offer", step: "history", not: ["accept_offer", "agree"] },
    { say: "No acepto el cupón", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "No quiero un cupón", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "El miércoles no me queda", intent: "decline_offer", step: "offer", not: ["accept_offer"] },
    { say: "No quiero un reembolso", intent: "not_remedy", step: "offer", not: ["ask_refund"] },
    { say: "No quiero que me devuelvan el dinero", intent: "not_remedy", step: "offer", not: ["ask_refund"] },
    { say: "No quiero un sofá nuevo, quiero mi dinero", intent: "ask_refund", step: "offer", not: ["ask_replacement"] },
    { say: "El cupón no, quiero mi dinero", intent: "ask_refund", step: "offer", not: ["accept_offer"] },
    { say: "¿Y si acepto el cupón?", intent: "offer_q", step: "offer", not: ["accept_offer"] },
    { say: "¿Cuánto vale el cupón?", intent: "offer_q", step: "offer", not: ["accept_offer"] },
    { say: "Ya no quiero un reembolso, mejor uno nuevo", intent: "ask_replacement", step: "deadline", not: ["ask_refund"] },
    { say: "No sé si está bien armado", intent: "plugged_no_ctx", step: "plugged", not: ["plugged_yes"] },
    { say: "No, no lo he revisado", intent: "plugged_no_ctx", step: "plugged", not: ["plugged_yes"] },
    { say: "No, ya no quiero esperar", intent: "cant_hold", step: "transfer", not: ["can_hold"] },
    { say: "No me parece bien", intent: "yn:no", step: "deadline", not: ["agree"] },
    { say: "No lo necesito para el viernes", intent: "none", step: "deadline" },
    { say: "Hache pe cuatro cuatro siete dos", intent: "readback_unknown", step: "reference", not: ["ref_readback"] },
    { say: "El jueves", intent: "none", step: "offer" },
    // review (4 Nov 2026): "No X, Y" corrections take Y; bare "nada" is never the complaint; questions never accept
    { say: "No un sofá nuevo, un reembolso.", intent: "ask_refund", step: "offer", not: ["ask_replacement"] },
    { say: "Reembolso no, mejor un sofá nuevo.", intent: "ask_replacement", step: "offer", not: ["ask_refund"] },
    { say: "No con un cupón, con mi dinero.", intent: "ask_refund", step: "offer", not: ["accept_offer"] },
    { say: "No para el viernes, para el jueves.", intent: "set_deadline", step: "deadline", slots: { day: "thursday" } },
    { say: "El jueves no, mejor el lunes.", intent: "set_deadline", step: "confirm", slots: { day: "monday" } },
    { say: "No, no estoy de acuerdo.", intent: "disagree_ctx", step: "confirm", not: ["agree", "yn:yes"] },
    { say: "Sí, estoy de acuerdo.", intent: "agree", step: "confirm" },
    { say: "Hasta el viernes.", intent: "set_deadline", step: "deadline", slots: { day: "friday" } },
    { say: "No, nada.", intent: "thats_all", not: ["fridge_broke"] },
    { say: "¿Puedo pedir otro día?", intent: "none", step: "offer" },
    { say: "¿Pueden venir el sábado?", intent: "other_day_ctx", step: "offer", not: ["accept_offer", "set_deadline"] },
    { say: "¿Nada más un cupón?", intent: "disbelief", step: "offer", not: ["accept_offer"] },
    { say: "El martes no, mejor páseme con su gerente.", intent: "ask_manager", step: "history", not: ["accept_offer", "agree"] },
    { say: "¿Y si el martes tampoco viene nadie?", intent: "not_good_enough", step: "history", not: ["accept_offer", "agree"] },
    { say: "Cincuenta y ocho mil doscientos trece", intent: "order_ctx", step: "name" },
    { say: "Si no lo resuelven voy a ir a la Profeco.", intent: "further", step: "history" },
    { say: "¿Me lo da por escrito?", intent: "ask_writing", step: "confirm" },
    // not understood
    { say: "Mi perro baila salsa en la playa", intent: "none" },
    { say: "Me gustan los sofás grandes", intent: "none" },
    { say: "Quiero comprar un boleto de avión", intent: "none" },
  ],

  // Brenda's offer is pinned where the script answers it (the cushion, Wednesday); the "¿bien armado?" question comes
  // on some seeds only (AUTO answers it), except in the sims about it.
  sims: [
    { name: "happy path: a refund by Friday, in writing", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["Hola, quisiera poner una queja.", "Mi sofá llegó una semana tarde y dañado, y el técnico nunca vino.", "Ryan Miller.",
        "Es la tercera vez que llamo. ¿Podría hablar con su gerente, por favor?", "No hay problema, tengo todo el día.",
        "Gracias, pero puede quedarse con el cojín. Quiero un reembolso completo.", "Necesito que quede resuelto a más tardar el viernes.",
        "Sí, me parece bien. ¿Me lo puede dar por escrito?", "Sí, dígame.", "HP-4471, anotado.", "No, es todo. Le agradezco mucho su ayuda, de verdad."],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", writing: true, ref: true, thirdSaid: true, outcome: "success" } }, auto: AUTO },
    { name: "short answers, questions and a change of mind", setup: (s) => { s.offerKind = "visit"; },
      turns: ["Buenas tardes.", "Llamo por mi sofá.", "Llegó con una pata rota y una semana tarde.", "Ryan.", "¿Realizada? ¡Nadie vino!",
        "Me temo que eso no es suficiente.", "Sí, por favor.", "Claro, aquí espero.", "Ya falté al trabajo una vez y nadie vino.", "¿Me lo pueden cambiar por uno nuevo?",
        "¿Van a recoger el sofá dañado?", "Pensándolo bien, mejor un reembolso.", "Lo antes posible, por favor.", "¿Me lo puede confirmar por correo?",
        "No, no tengo con qué escribir.", "¡Gracias!"],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", writing: true, ref: true } }, auto: AUTO },
    { name: "bien armado (twist): a calm answer, then a new sofa", setup: (s) => { s.pluggedTwist = true; },
      turns: ["Quisiera poner una queja. Mi sofá llegó dañado.", "Sí, ya lo revisé. Está bien armado: la pata está rota.", "Me llamo Ryan Miller.",
        "¿Podría hablar con su gerente, por favor?", "Claro, aquí espero.", "Quisiera un sofá nuevo, por favor.", "Sí, me parece bien.", "Sí, dígame.", "Gracias, adiós."],
      expect: { complete: true, state: { pluggedDone: true, remedy: "replacement", deadline: "accepted", ref: true } }, auto: AUTO },
    { name: "bien armado (twist): rude, then polite and firm", setup: (s) => { s.pluggedTwist = true; s.offerKind = "coupon"; },
      turns: ["¡Mi sofá llegó roto!", "Claro que lo revisé, no soy tonto.", "Ryan Miller.", "¡Ustedes son unos inútiles!",
        "Sé que no es su culpa, pero es la tercera vez que llamo.", "Sí, por favor.", "Tengo todo el día.", "¡Esto es ridículo!",
        "Quiero un reembolso completo.", "Para el viernes, por favor.", "Sí.", "Dígame.", "Gracias, adiós."],
      expect: { complete: true, state: { remedy: "refund", deadline: "friday", thirdSaid: true, rudeK: 2, rudeB: 1 } }, auto: AUTO },
    { name: "Wednesday (twist): no, a day off, either, too long", setup: (s) => { s.offerKind = "visit"; },
      turns: ["Llamo por mi sofá. Llegó roto, y nadie vino a revisarlo.", "Está a nombre de Ryan Miller.", "Quiero hablar con un supervisor.", "Claro.",
        "El miércoles no me queda. Ya falté al trabajo una vez y nadie vino.", "Quiero un reembolso o un sofá nuevo.", "Cualquiera de los dos.",
        "Dos semanas es demasiado tiempo.", "El jueves.", "Sí, me parece bien.", "Sí.", "Hache pe cuatro cuatro siete uno.", "Muchas gracias por su ayuda."],
      expect: { complete: true, state: { remedy: "replacement", deadline: "thursday", ref: true } }, auto: AUTO },
    { name: "a refund asked of Jorge: Brenda goes straight to it", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["Mi sofá llegó dañado, y el técnico nunca vino.", "Ryan.", "Quiero un reembolso completo.", "Sí.", "Tengo todo el día.",
        "Quédese con su cupón y con su cojín.", "Me parece bien.", "Dígame.", "¡Gracias!"],
      expect: { complete: true, state: { remedy: "refund", wish: "refund", deadline: "accepted" } }, auto: AUTO },
    { name: "a deadline and the folio from Jorge; the order number",
      turns: ["Quisiera poner una queja. Mi sofá llegó roto.", "Mi número de pedido es el 58213.", "Lo necesito para el viernes.", "¿Me da un número de folio?",
        "¿Podría hablar con su gerente, por favor?", "Claro.", "Quisiera un sofá nuevo.", "Sí, me parece bien.", "¡Gracias!"],
      expect: { complete: true, state: { refByKyle: true, deadline: "friday", remedy: "replacement", order: true } }, auto: AUTO },
    { name: "the coupon taken (not done)", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["Tengo un problema con mi pedido. Llegó con una pata rota.", "Ryan.", "¿Podría hablar con su gerente?", "Ok.", "Acepto el cupón.",
        "Sí, una cosa más.", "¿Me da un número de folio?", "Gracias, adiós."],
      expect: { complete: false, state: { accepted: "coupon", outcome: "partial", ref: true } }, auto: AUTO },
    { name: "Wednesday taken (not done)", setup: (s) => { s.offerKind = "visit"; },
      turns: ["Mi sofá llegó roto.", "Ryan Miller.", "¿Puedo hablar con su jefe?", "Claro.", "El miércoles está bien.", "No, gracias.", "Ok.", "Adiós."],
      expect: { complete: false, state: { accepted: "visit", outcome: "partial" } }, auto: AUTO },
    { name: "next Tuesday with Jorge (not done)",
      turns: ["Mi sofá llegó roto.", "Ryan Miller.", "Está bien.", "Sí, por favor."],
      expect: { complete: false, state: { accepted: "tuesday", outcome: "partial" } }, auto: AUTO },
    { name: "walking away from Jorge (not done)",
      turns: ["Mi sofá llegó roto.", "Olvídelo. Luego le llamo."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO },
    { name: "a deadline 'a más tardar el lunes' told to Jorge, then Brenda", setup: (s) => { s.pluggedTwist = false; },
      turns: ["Hola, quisiera poner una queja. Mi sofá llegó dañado.", "Ryan Miller.", "Quiero un reembolso a más tardar el lunes.",
        "Sí, por favor.", "Claro.", "No, gracias.", "Sí.", "Dígame.", "HP 4471.", "Gracias, adiós."],
      expect: { complete: true, state: { remedy: "refund", deadline: "monday", ref: true, outcome: "success" } }, auto: AUTO },
    { name: "no to one remedy, yes to the other in one breath; a short deadline", setup: (s) => { s.pluggedTwist = false; s.offerKind = "coupon"; },
      turns: ["Mi sofá llegó roto.", "Ryan.", "¿Podría hablar con su gerente?", "Claro.", "No quiero un sofá nuevo, quiero mi dinero.",
        "¿Y para el jueves?", "¿Me lo puede dar por escrito?", "Dígame.", "Gracias, adiós."],
      expect: { complete: true, state: { remedy: "refund", deadline: "thursday", writing: true, ref: true } }, auto: AUTO },
    { name: "bien armado (twist): no, Jorge asks to check", setup: (s) => { s.pluggedTwist = true; s.offerKind = "coupon"; },
      turns: ["Quisiera poner una queja. Mi sofá llegó roto.", "No, no lo he revisado.", "Sigue igual.", "Ryan Miller.",
        "¿Podría hablar con su gerente, por favor?", "Claro.", "Quisiera un sofá nuevo, por favor.", "A más tardar el viernes.", "Sí.", "Dígame.", "Gracias, adiós."],
      expect: { complete: true, state: { pluggedDone: true, remedy: "replacement", deadline: "friday", ref: true } }, auto: AUTO },
    { name: "a wrong order number, then the name; a polite 'está bien, gracias' is asked again", setup: (s) => { s.pluggedTwist = false; s.offerKind = "coupon"; },
      turns: ["Llamo por mi sofá. Llegó una semana tarde.", "Es el 58231.", "Ryan Miller.", "Quiero hablar con su gerente.", "Claro.", "¿Cuánto vale el cupón?", "Está bien, gracias.",
        "No, gracias. Le pido de la manera más atenta que me devuelvan mi dinero.", "Sí, me parece bien.", "Sí, dígame.", "Le agradezco mucho su ayuda."],
      expect: { complete: true, state: { remedy: "refund", named: true, deadline: "accepted", ref: true } }, auto: AUTO },
    { name: "review: the order number whole, another day for the visit, corrections, a read-back without letters", setup: (s) => { s.pluggedTwist = false; s.offerKind = "visit"; },
      turns: ["Mi sofá llegó roto.", "Cincuenta y ocho mil doscientos trece.", "El martes no, mejor páseme con su gerente.", "Claro.", "¿Pueden venir el sábado?",
        "No un sofá nuevo, un reembolso.", "No para el viernes, para el jueves.", "No, no estoy de acuerdo.", "El lunes.", "Sí, estoy de acuerdo.", "Sí.",
        "Cuatro cuatro siete dos.", "Hache pe cuatro cuatro siete uno.", "No, nada. Gracias."],
      expect: { complete: true, state: { order: true, onlyWed: true, remedy: "refund", deadline: "monday", confirmed: true, ref: true, outcome: "success" } }, auto: AUTO },
    { name: "walking away from Brenda (not done)", setup: (s) => { s.offerKind = "coupon"; },
      turns: ["Mi sofá llegó roto.", "Ryan.", "¿Podría hablar con su gerente?", "Claro.", "No tengo tiempo para esto."],
      expect: { complete: false, state: { outcome: "walked", transferred: true } }, auto: AUTO },
  ],
};

/** "¿Le puedo ayudar en algo más?" at the end of a successful call. */
function expectClosing(c: Ctx) {
  const again = (cc: Ctx) => { B(cc, "brenda_anything"); expectClosing(cc); };
  const p: Pending = {
    id: "closing", expects: ["appreciate", "thats_all", "have_nice_day", "ask_writing", "ask_reference", "ask_timeline", "ask_pickup", "more_yes_ctx"], hints: ["closing"],
    suggest: [{ lt: "Thank her and say goodbye", hint: "closing" }, { lt: "Ask for it in writing", hint: "confirm" }],
    on: {
      appreciate: (cc) => { closeBye(cc, true); },
      thats_all: (cc) => { closeBye(cc); }, have_nice_day: (cc) => { closeBye(cc); },
      g_thanks: (cc) => { closeBye(cc); }, g_bye: (cc) => { closeBye(cc); },
      ask_writing: (cc) => { cc.s.writing = true; B(cc, "brenda_writing_ok"); again(cc); },
      ask_reference: (cc) => { B(cc, "brenda_ref_repeat", { text: REF }); again(cc); },
      ask_timeline: (cc) => { B(cc, cc.s.remedy === "refund" ? "brenda_refund_time" : "brenda_timeline"); if (deadlineSet(cc)) dayLine(cc, cc.s.deadline); again(cc); },
      ask_pickup: (cc) => { B(cc, "brenda_pickup_yes"); again(cc); },
      more_yes_ctx: (cc) => { B(cc, "g_yes_what"); expectClosing(cc); },
    },
    yes: (cc) => { B(cc, "g_yes_what"); expectClosing(cc); },
    no: (cc) => { closeBye(cc); },
  };
  c.expect(p);
}

export default complaint;
