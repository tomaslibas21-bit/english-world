// NEEDS: None. All vocabulary, merges and grammar are local.
// P29 "Landlord Blues" → Puerto Colibrí: "El aire no enfría". The brief's first title, "El calentador no sirve", named
// the water heater; the brief itself picks the AC for the Caribbean ("el minisplit no enfría"), so the title follows it
// (BRIEFS.md corrected 5 Nov 2026).
// Don Ernesto is the landlord from s81 (he rented the learner the one-bedroom one floor up at Departamentos Las Palmas;
// usted both ways; he lives on the planta baja) and the one Doña Lupita describes in s82 ("es buena persona, pero hay
// que insistirle un poquito"). Today he never answers his phone. The learner catches him at the door downstairs with a
// suitcase: he's off to San Cristóbal (cool mountains in Chiapas) for two weeks. The minisplit has only blown warm air
// for a week. The learner explains the problem and how long it has lasted, reminds him that repairs are the landlord's
// job (the lease; the AC comes with the apartment), politely turns down his offer ("Arréglelo usted y yo le pago la
// mitad"), and gets a date out of him: "la próxima semana" → "el miércoles de la próxima semana" → "el viernes en la
// mañana". Optional: in writing (a text), and the rent ($14,000, s81) in cash with a receipt at the end.
//
// Flow (the English edition's): problem → (remote control?) → duration → (Lupita twist) → dodge → offer → date
// (completes) → (home?) → wrap ("¿Algo más?") → rent → goodbye. Every answer can come early: what is said fills its
// step. Twist (50%): Doña Lupita, the neighbor next door, backs the learner up ("¡Y como usted siempre arregla todo tan
// rápido!") and knows a good AC repairman (the brief: "the neighbor knows a technician"); the learner may ask for his
// number. Returning players may get "Ay, usted otra vez. Déjeme adivinar: ¿el aire?".
// The English thermostat question is the minisplit's remote here ("¿Ya revisó el control? ¿Está en frío?"); the space
// heater is a fan; "colder than outside" is "más calor adentro que afuera". Mexican "ocho días" = a week and "quince
// días" = two weeks are read that way.
// The water heater (5 Nov 2026): a learner who blames it ("El calentador no sirve", the brief's first title; "el boiler",
// "no hay agua caliente", "la calefacción") gets one redirect: "¿El calentador? ¿Con este calor? ¿No será el aire?",
// the returning player's guess question (a yes or the AC's problem answers it; nothing else is recorded). Said again
// before the AC: "El calentador funciona bien, se lo aseguro."; once the AC is on the table: "Vamos por partes."
// Research and what stays vague: minisplits are the usual AC in Quintana Roo; when one only blows warm air the usual
// causes are dirty filters or low refrigerant ("le falta gas"), a job for a técnico. Who pays for repairs depends on the
// lease (Mexican leases usually leave necessary repairs to the landlord and small upkeep to the tenant); the scene only
// quotes "the lease", never a law. Rent in cash or by bank transfer and a hand-written rent receipt are common; no
// amounts besides s81's rent. San Cristóbal is only a place he goes. Chucho (his repairman) is mentioned, never seen.
// The audit (5 Nov 2026): the learner's door is 1B (s81, s82, p24), understood in the greeting; an echoed "¿El
// miércoles?" (typed with its question mark) gets "Sí, … ¿Le parece?" and books nothing until a yes; "¿Quién paga?"
// gets his half while the offer is open and "Eso lo pago yo" once Chucho is coming; the rent handed over at "¿Algo
// más?" is taken (the AC is settled by then); s81's rent is due in the first five days, so the transfer hint says
// "mañana", not "el primero". Chucho stays (Don Chuy, s62, is another nickname, another man, another place).

import type { Ctx, Pending, SituationDef, Suggestion, Tip } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_A = "Personal a marks a person as the object; English needs no word.";
const F_DEL = "del = de + el; English needs no word for the article here.";
const F_EL_DAY = "el before a day of the week = “on” (or nothing in English).";
const F_CLOCK = "Spanish uses an article before clock times; English has no separate word.";
const F_AHORITA = "Mexican: ahorita = right now; ahora mismo is more widely used.";
const F_MINISPLIT = "Mexican: minisplit = the wall-mounted AC unit; aire acondicionado is more widely used.";
const F_VIEJITO = "viejito: viejo + -ito, a softer “a bit old”.";
const F_LA_GEN = "la before a noun in general (patience, rent); English has no article.";
const F_LE = "le = (to) you (usted) or (to) him: the indirect object.";

// ---------------------------------------------------------------------------
// Helpers

const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("patel"); c.say(line, vars); };
const R = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("rita"); c.say(line, vars); };

const RENT = 1400000;
const heard = (c: Ctx) => (c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Days since it started, counted back from today (a Wednesday). "Desde el lunes" = the latest Monday. */
const SINCE: Record<string, number> = { monday: 2, tuesday: 1, wednesday: 7, thursday: 6, friday: 5, saturday: 4, sunday: 3, today: 1, tomorrow: 1 };

/** How many days the learner's duration means (null: no duration in this answer). */
function daysOf(slots: any, tags: string[], h: string): number | null {
  const n = typeof slots?.number === "number" ? slots.number : null;
  if (tags.includes("wkhalf")) return 10;
  if (tags.includes("fortnight")) return 14;
  if (tags.includes("wks")) return n && n < 20 ? n * 7 : 14;
  if (tags.includes("wk")) return 7;
  // Mexican "ocho días" = a week, "quince días" = two weeks
  if (tags.includes("days")) return n === 8 ? 7 : n === 15 ? 14 : n ?? 3;
  if (tags.includes("few")) return 3;
  if (tags.includes("d2")) return 2;
  if (tags.includes("short")) return 1;
  if (typeof slots?.day === "string" && SINCE[slots.day] !== undefined) return SINCE[slots.day];
  if (/\btoda la semana\b|\bla semana pasada\b/.test(h)) return 7;
  // today is a Wednesday: "desde el fin de semana" is about four days
  if (/\bfin de semana\b/.test(h)) return 4;
  return null;
}

/** "Está bien, gracias." / "Vale, gracias.": a polite closing that could be a yes or a no thanks (rule 17). */
const politeClosing = (c: Ctx) => /^\W*(esta bien|vale|ok|okay|bueno|perfecto|de acuerdo)\W+(muchas )?gracias\W*$/.test(heard(c));

/** The AC, the heat: a sentence that names the problem. */
const mentionsAc = (h: string) => /\b(aire|clima|minisplit|mini split|split|aparato|acondicionado|calor|enfria|caliente)\b/.test(h);

/** Typed with a question mark (voice never has one): "¿El miércoles?" asks, "El miércoles." agrees. */
const typedQ = (c: Ctx) => /[?¿]/.test(c.heard || "");

/** The turn opens with a yes ("Está bien, que venga Chucho."). */
const YES_START = /^\W*(si|esta bien|claro|bueno|perfecto|de acuerdo|ok|okay|vale|sale|va|me parece bien)\b/;

const TIPS: Record<string, Tip> = {
  too_blunt: { key: "too_blunt", lt: "Understood! “Tiene que arreglarlo” or “¡Arréglelo ya!” sounds like an order. A calm “Me temo que…” is firm without being rude.", better: "Me temo que es su responsabilidad." },
  threat_legal: { key: "threat_legal", lt: "Understood! Threats end the conversation. This scene practices reminding him, calmly and firmly, what the lease says.", better: "Según el contrato, las reparaciones le tocan a usted." },
  withhold: { key: "withhold", lt: "Understood! This scene practices a fair but firm talk, so there's no need to threaten the rent (this isn't legal advice). Ask for a date instead.", better: "¿Cuándo puede venir alguien?" },
  rude_insult: { key: "rude_insult", lt: "Understood! Insults won't help. Say calmly that you've been patient, but this is getting serious.", better: "He tenido paciencia, pero esto ya es serio." },
  tense_since: { key: "tense_since", lt: "Understood! For something still going on, Spanish uses the present with desde hace: “No funciona desde hace una semana” (not “por una semana”).", better: "No funciona desde hace una semana." },
  caliente: { key: "caliente", lt: "Understood! Careful: in Mexico “estoy caliente” means you're aroused. For the heat, say “tengo mucho calor”.", better: "Tengo mucho calor." },
  calque_go: { key: "calque_go", lt: "Understood! Machines don't “trabajar” in Spanish: they funcionan or sirven.", better: "El aire no funciona." },
  fijar: { key: "fijar", lt: "Understood! “Fijar” means to fasten or set. To repair something is arreglar.", better: "¿Puede arreglarlo?" },
  bare_no: { key: "bare_no", lt: "Understood! A bare “No.” or “¡Ni loco!” sounds curt. Add a polite reason.", better: "Eso no es lo que acordamos." },
  tu_staff: { key: "tu_staff", lt: "Understood! With your landlord, usted is more polite: puede, tiene (puedes and tienes are for friends).", better: "¿Puede arreglarlo, por favor?" },
};

/** Rude or threatening lines: an in-world answer each time; after the third, Don Ernesto asks to start over. */
function rude(c: Ctx) {
  c.s.rude = (c.s.rude || 0) + 1;
  c.s.rudeHeard = c.heard;
  if (c.s.rude === 3) P(c, "blunt_last");
}

// --- duration -----------------------------------------------------------------

/** He repeats "¿Una semana?" only for a week; other long spells get "¿Tanto tiempo?". */
function setDur(c: Ctx, days: number, react = true) {
  c.s.dur = days;
  if (react) P(c, days === 7 ? "dur_react_week" : days >= 4 ? "dur_react_long" : "dur_react_short");
}

// --- one reaction per turn -------------------------------------------------------------

/** Per-turn scratch (the dialogue makes a fresh context object for every learner turn). */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}

// --- the twist: Doña Lupita backs the learner up --------------------------------------

function ritaBye(c: Ctx) {
  if (!c.s.ritaBye) { c.s.ritaBye = true; R(c, "rita_bye"); }
  c.speaker("patel");
}

function techNumber(c: Ctx, tags: string[] = []) {
  // Chucho's number (or "the repairman's" with no Doña Lupita there) is Don Ernesto's to give
  if (tags.includes("chucho") || (!c.s.ritaShown && tags.includes("num"))) {
    if (!c.s.chuchoNum) { c.s.chuchoNum = true; P(c, "chucho_number"); } else P(c, "sure_sure");
    return;
  }
  if (!c.s.ritaShown) { P(c, "ack"); return; }
  if (!c.s.techAsked) { c.s.techAsked = true; R(c, "tech_number"); } else R(c, "tech_again");
  c.speaker("patel");
}

function ritaTwist(c: Ctx) {
  c.s.ritaShown = true;
  c.twist("rita");
  R(c, "rita_in"); R(c, "rita_back"); R(c, "rita_irony"); R(c, "rita_tech");
  P(c, "patel_rita");
  c.expect({ id: "rita", optional: true, expects: ["thanks_rita", "g_thanks", "ask_tech"], hints: ["rita", "dodge"],
    suggest: [{ lt: "Thank Doña Lupita", hint: "rita" }, { lt: "Remind him whose job it is", hint: "dodge" }],
    on: {
      thanks_rita: (cc) => { ritaBye(cc); },
      g_thanks: (cc) => { ritaBye(cc); },
      ask_tech: (cc, _sl, sg) => { techNumber(cc, sg.tags); },
    } });
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
  // three tries without a clear request: he gives in (the scene never stalls here), though not right after "Empecemos otra vez"
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

/** "Bueno, bueno. Chucho puede venir el viernes en la mañana. Entre las 9 y las 12. ¿Le parece?" (`lead`: a reaction first). */
function offerFriday(c: Ctx, lead?: string) {
  c.s.level = 2;
  c.s.friSaid = true;
  if (lead) P(c, lead);
  if (lead !== "even_better") P(c, "sooner_react");
  P(c, "window_q");
}

/** A day is agreed: the task is done. */
function setDate(c: Ctx, day: string, confirm = true) {
  if (c.s.date) return;
  c.s.date = day;
  if (confirm) P(c, "date_confirm_" + day);
  c.complete();
  c.remember({ acFixed: day });
  if (c.s.writingAsked && !c.s.writing) sendText(c, c.s.writingAsked !== c.heard);
}

/** "El jueves o el viernes": the day Chucho can do (Friday or Saturday if named), else the first. */
function pickDay(day: unknown): string {
  const list = (Array.isArray(day) ? day : [day]).map(String);
  return list.find((d) => d === "friday" || d === "saturday") ?? list[0];
}

/** The day Don Ernesto has on the table (none yet at "la próxima semana"). */
const dayOnTable = (c: Ctx) => (c.s.level === 1 ? "wednesday" : c.s.level === 2 ? "friday" : null);

const DAY_WORD = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|hoy|semana)\b/;
const NOT_REFUSAL = /\b(no hay problema|no se preocupe|por que no|no hay prisa)\b/g;
const REFUSAL = /\b(no|nada|nunca|tarde|broma|bromea|bromeando|en serio|imposible|ni loco|ni loca|mucho tiempo|demasiado)\b/;
/** "¿El miércoles? Ni loca." / "¿El miércoles? Es muy tarde.": after the day, the same turn says no to it. */
function refusedAfterDay(c: Ctx): boolean {
  const h = heard(c);
  const i = h.search(DAY_WORD);
  return REFUSAL.test((i >= 0 ? h.slice(i) : h).replace(NOT_REFUSAL, " "));
}

/** "Antes del viernes" = Thursday at the latest. */
const DAY_BEFORE: Record<string, string> = {
  monday: "sunday", tuesday: "monday", wednesday: "tuesday", thursday: "wednesday", friday: "thursday", saturday: "friday", sunday: "saturday",
};

/** A "no" to the day on the table (one step sooner), said once however many pieces the turn has. */
function dateNoOnce(c: Ctx) {
  if (turn(c).dateNo) { c.hold(); return; }
  turn(c).dateNo = true;
  dateNo(c);
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
  // Sunday to Wednesday, next weekend: later than Chucho could come
  offerFriday(c, "even_better");
}

function acceptDay(c: Ctx, day: string) {
  P(c, "day_accept_" + day);
  P(c, "window");
  setDate(c, day, false);
}

/** "Sí." / "Me parece bien." to the day on the table ("la próxima semana": he names a day). */
function dateYes(c: Ctx) {
  if (c.s.level === 0) { offerWednesday(c); c.hold(); return; }
  setDate(c, c.s.level === 2 ? "friday" : "wednesday");
}

/** "No." to the day on the table: one step sooner. */
function dateNo(c: Ctx) {
  if (c.s.level === 0) offerWednesday(c);
  else if (c.s.level === 1) offerFriday(c);
  else fridayBest(c);
  c.hold();
}

/** "Antes del viernes, imposible." once; pushed again, a short reminder (never the same line twice in a row). */
function fridayBest(c: Ctx) {
  if (!c.s.friBestSaid) { c.s.friBestSaid = true; P(c, "friday_best"); return; }
  P(c, c.s.date ? "i_know" : "friday_reask");
}

/** "¿El miércoles?" echoing the day on the table (typed as a question): he confirms it and asks; nothing is booked. */
function echoDay(c: Ctx, day: string): boolean {
  if (!c.s.offer || c.s.date || !typedQ(c) || day !== dayOnTable(c)) return false;
  c.s.echoSaid = true;
  if (!c.s["echo_" + day]) { c.s["echo_" + day] = true; P(c, "echo_" + day); } else askDate(c);
  c.hold();
  return true;
}

/** The text with the day (`promised`: asked for earlier, before there was a day). */
function sendText(c: Ctx, promised = false) {
  c.s.writing = true;
  P(c, promised ? "as_promised" : c.s.lease ? "writing_lease" : "writing_react");
  P(c, "text_sent_" + c.s.date);
  c.event("text-message", { from: "patel", day: c.s.date });
}

// --- the rent ----------------------------------------------------------------------------

function payRent(c: Ctx) {
  if (c.s.rentDone) { P(c, "ack"); return; }
  // money moves only at the rent: "Aquí tiene la renta." in the middle of the AC talk waits; once the day is agreed
  // (his "¿Algo más?") the AC is settled, so he takes it and the rent is what comes next
  if (!c.s.rentAsked) {
    if (!c.s.date) { P(c, "rent_first"); return; }
    rentNow(c);
  }
  c.s.rentPaid = true;
  c.s.rentDone = true;
  c.event("pay", { method: "cash", amount: RENT });
  P(c, "rent_thanks");
}

/** The learner brings up the rent at "¿Algo más?" (the day agreed): that's all for the AC, the rent is on. */
function rentNow(c: Ctx) {
  c.s.rentAsked = true;
  c.s.wrapDone = true;
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

/** "¡Adiós!" (or "Ya no importa.") before the end. */
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
  const sugg: Suggestion[] = [{ lt: "Thank him and say goodbye", hint: "bye" }];
  if (c.s.rentPaid && !c.s.receipt) sugg.unshift({ lt: "Ask for a receipt", hint: "rent" });
  return { id: "closing", expects: ["trip_wish", "ask_receipt"], hints: ["bye", "rent"], suggest: sugg,
    on: {
      g_bye: (cc) => { byeBack(cc); }, g_thanks: (cc) => { byeBack(cc); }, trip_wish: (cc) => { byeBack(cc); }, walk_away: (cc) => { byeBack(cc); },
      ask_receipt: (cc) => {
        if ((cc.s.rentPaid || cc.s.paidBefore) && !cc.s.receipt) receiptBeat(cc); else P(cc, "receipt_for_what");
        cc.expect(closing(cc));
      },
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } };
}

/** "¿El aire?" (the returning player's greeting, or after the water heater): a yes or the AC's problem answers it. */
function expectAcGuess(c: Ctx) {
  c.expect({ id: "guess", expects: ["heat_broken", "cold_detail", "heat_duration", "space_heater", "ac_ctx", "heater_wrong", "heater_ok"], hints: ["problem", "g_yesno"],
    suggest: [{ lt: "Say yes and explain what isn't working", hint: "problem" }],
    on: {
      heat_broken: (cc, sl, sg) => { landlord.handlers.heat_broken(cc, sl, sg); },
      ac_ctx: (cc) => { cc.s.problem = true; P(cc, "knew_it"); },
      cold_detail: (cc, sl, sg) => { landlord.handlers.cold_detail(cc, sl, sg); },
      space_heater: (cc, sl, sg) => { landlord.handlers.space_heater(cc, sl, sg); },
      heat_duration: (cc, sl, sg) => { cc.s.problem = true; landlord.handlers.heat_duration(cc, sl, sg); },
    },
    yes: (cc) => { cc.s.problem = true; P(cc, "knew_it"); },
    no: (cc) => { cc.s.whoSaid = true; P(cc, "no_then_what"); cc.hold(); },
    ask: (cc) => { P(cc, "guess_reask"); } });
}

// Automatic answers the simulation uses when Don Ernesto asks one of his optional questions.
const AUTO: Record<string, string> = {
  guess: "Sí, el aire no enfría.", thermostat: "Sí, ya lo revisé dos veces.", rita: "¡Gracias, Doña Lupita!", home: "Sí, voy a estar en casa.",
  wrap: "No, es todo, gracias.", rent: "Claro. Aquí tiene, en efectivo.", closing: "Gracias, Don Ernesto. ¡Buen viaje!",
};

// ---------------------------------------------------------------------------

export const landlord: SituationDef = {
  id: "p29-landlord",
  song: "P29",
  songTitle: "Landlord Blues",
  title: { en: "El aire no enfría", lt: "The AC Isn't Cooling" },
  topic: { en: "El aire acondicionado y el dueño", lt: "A broken AC and the landlord" },
  chapter: 8,
  order: 6,
  location: "apartments",
  npc: "patel",
  npcs: ["rita"],
  goal: "Politely but firmly get your landlord to fix the AC, and agree on a day for the repair.",
  intro: "Departamentos Las Palmas, a hot Wednesday morning. Your AC has only blown warm air for a week, and Don Ernesto, the landlord, doesn't answer his phone. And there he is at the door downstairs, with a suitcase and a sun hat. Prices are in Mexican pesos.",

  grammar: {
    macros: {
      don: "(don ernesto | senor ernesto | don)",
      // the AC: aire (acondicionado), clima, minisplit (Mexico), split, the unit
      ac: "[el | mi | su | este] (aire [acondicionado] | aire de la recamara | aire del cuarto | clima | minisplit | mini split | split | aparato | aparato del aire | acondicionador | ac)",
      home: "(mi departamento | mi depa | mi casa | mi piso | el departamento | la casa | mi recamara | mi cuarto | la recamara | el cuarto | arriba | adentro | aqui)",
      where: "(en @home | arriba | adentro)",
      // what an AC does when it's broken (a bare "no" + verb stays one negation)
      broken: [
        "no (funciona | sirve | enfria | enfria nada | prende | enciende | jala | va | sirve para nada | hace nada | echa aire frio | echa nada de aire frio | esta funcionando | esta enfriando)",
        "ya no (funciona | sirve | enfria | prende | jala | echa aire frio)",
        "(esta | sigue) (descompuesto | roto | fallando | muerto | apagado)", "(se descompuso | dejó de funcionar | dejó de enfriar | se murió | se apagó | ya se murió)",
        "(solo | nomas | nada mas) (echa | tira | saca) aire caliente", "(echa | tira | saca) aire caliente", "hace un ruido (raro | feo) [y no enfria]",
      ],
      dur: [
        "[casi | mas de | como | ya | por lo menos | mas o menos | unos] (una | 1) semana [entera | completa] #wk",
        "(una | 1) semana y media #wkhalf",
        "[casi | mas de | como | ya | por lo menos | mas o menos] ({number} | un par de) semanas #wks",
        "[casi | mas de | como | ya | por lo menos | mas o menos | unos] {number} dias #days",
        "(unos | varios | algunos | un par de | dos o tres | tres o cuatro | pocos) dias #few",
        "(un | 1) dia #short",
        "quince dias #fortnight",
        "mucho tiempo #wks",
      ],
      dur_tail: "(desde hace @dur | hace @dur | desde [el] {day} [pasado] | desde (la semana pasada | el fin de semana | el fin de semana pasado | ayer #short | anoche #short | antier #d2 | anteayer #d2) | desde {date} | toda la semana #wk | @dur)",
      someone: "(alguien | un tecnico | el tecnico | su tecnico | chucho | un profesional | un experto | alguien que sepa)",
      fixit: "(arreglarlo | arreglar el aire | arreglar el minisplit | repararlo | revisarlo | componerlo)",
      fix_tail: "(pronto | rapido | esta semana | hoy | lo antes posible | cuanto antes | antes del fin de semana)",
      contract: "(contrato | contrato de arrendamiento | contrato de renta)",
      // the water heater (not this scene's problem): Mexico says calentador or boiler
      wheater: "(calentador | calentador de agua | boiler | boiler del agua)",
      lead_resp: "(las reparaciones | arreglarlo | eso | arreglar el aire | el mantenimiento)",
      // the learner's door is 1B (s81, s82, p24: "el uno be"); the building's other doors (1C Doña Lupita's, 2B upstairs,
      // p24) and any other number are taken as said
      aptno: "(1b | 1 b | uno b | uno be | 1a | 1c | 2a | 2b | 2c | {number} (a | b | c | d | be) | {number} {letters} | {number} | {letters})",
      apt: "[departamento | depa | apartamento] @aptno",
    },
    slots: {},
  },

  intents: {
    // --- greeting --------------------------------------------------------------
    greet_id: { patterns: [
      "@don soy yo [(el | la) de arriba | (el | la) del primer piso | (el | la) del @apt] #h:its_me", "soy yo (el | la) (de arriba | del primer piso | del departamento de arriba | del @apt)",
      "soy (su | tu #tip:tu_staff) (inquilino | inquilina) [de arriba | del primer piso]",
      "soy (su | tu #tip:tu_staff) (inquilino | inquilina) del @apt", "soy (el | la) del @apt", "(vivo | soy) (arriba | del primer piso | del departamento de arriba | del depa de arriba)",
      "soy {name} [su (inquilino | inquilina)] (del @apt | de arriba)", "vivo en el @apt",
      "(perdon | disculpe) que lo moleste [@don] [pero es (importante | urgente)] #h:sorry_bother", "(perdon | disculpe) la molestia [@don] [pero es (importante | urgente)]",
      "[@don] (tiene | tienes #tip:tu_staff) un (minuto | momento | segundo | minutito) #h:minute",
      "(puedo | podemos) hablar con usted [un (minuto | momento | segundo)]", "(podemos | puedo) hablar [un (minuto | momento)]",
      "(espere | espereme) @don", "@don (espere | espereme) [un (momento | segundo)]",
      "(buenos dias | buenas tardes | hola | buenas) @don #h:hi_patel", "(oiga | disculpe | perdon) @don", "(que bueno que lo veo | que bueno que lo encuentro) [@don]",
    ] },

    // --- the problem -------------------------------------------------------------
    // "Tengo un problema." (what problem comes next)
    have_problem: { patterns: ["(tengo | tenemos | hay) un (problema | problemita) [grande | serio | en @home | arriba]", "algo (anda mal | esta mal) [en @home]",
      "tengo un problema con (mi departamento | mi depa | el departamento)"] },
    heat_broken: { patterns: [
      "el aire no enfria desde hace @dur #h:song_broken",
      "@ac [de @home] @broken [@dur_tail] [@where]",
      "@ac (del departamento | del depa | del piso | del cuarto | de la casa) @broken [@dur_tail]",
      "[@ac] (todavia | sigue sin | aun) (no enfria | no funciona | no sirve | enfriar | funcionar) [nada] [@dur_tail]",
      "@ac (no funciona | no enfria | no sirve | esta descompuesto) (desde hace @dur | desde [el] {day} [pasado] | hace @dur)",
      "@ac no funciona [@where] #h:heat_not_working",
      "@ac (solo | nada mas | nomas) echa aire caliente #h:radiator_cold",
      "(se descompuso | se murió | dejó de funcionar | dejó de enfriar | ya no funciona | no funciona | no enfria | no sirve | no va | no jala | no prende) @ac [@where] [@dur_tail]",
      "(tengo | hay | tenemos) un problema con @ac", "algo (le pasa | anda mal) (al | con el) (aire | clima | minisplit | aire acondicionado)",
      "no (tengo | hay) aire [acondicionado] [@where] [@dur_tail]", "sin aire [acondicionado] [@where] [@dur_tail]",
      // calques
      "@ac (no trabaja | no esta trabajando | ya no trabaja) #tip:calque_go",
      "@ac (no funciona | no enfria | esta descompuesto | esta roto | no sirve) (por | durante) @dur #tip:tense_since",
    ] },
    cold_detail: { patterns: [
      "hace mas calor (adentro | en @home | arriba | en mi casa) que afuera #h:kitchen_colder",
      "(@home | mi casa) (esta | es) mas (caliente | calurosa | caluroso) que afuera",
      "no (puedo | podemos) dormir (del calor | por el calor | con este calor | de calor) #h:sleep_coat",
      "no (puedo | podemos) dormir [en la noche]",
      "(duermo | estoy durmiendo | dormimos) (con el ventilador | en el piso | con las ventanas abiertas | en la sala | con hielo)",
      "hace (un calor horrible | un calor terrible | un calor insoportable | mucho calor | muchisimo calor | demasiado calor | un calorón) [en @home | adentro | arriba] #h:cold_apt",
      "(@home | mi casa) (es | esta como) un (horno | sauna | infierno)", "(@home | mi casa) (esta | es) (muy caliente | caliente | ardiendo | hirviendo)",
      "(hace | hay | estamos a) {number} grados [en @home | adentro | arriba]",
      "me (estoy muriendo | muero) de calor", "estoy (sudando | muerto de calor | muerta de calor | derritiendome | asandome)", "(tengo | tenemos) (mucho | muchisimo) calor",
      "mi gato se (fue | mudó | cambió) con (dona lupita | la vecina) #cat",
      "no (duermo | dormimos | puedo dormir) [bien | nada] (del | por el | con el | con este | de) calor",
      // "Estoy caliente" means aroused in Mexico: understood, with a tip
      "estoy [muy | bien] caliente [@where] #tip:caliente",
    ] },
    space_heater: { patterns: [
      "(compré | me compré | tuve que comprar) (un ventilador | dos ventiladores | un ventilador nuevo | un abanico) [con mi (dinero | propio dinero)]",
      "(estoy usando | uso | tengo) (un ventilador | dos ventiladores | un abanico) [todo el dia | toda la noche]",
    ] },
    // the water heater (or heating) blamed instead of the AC: Don Ernesto steers it to the AC
    heater_wrong: { patterns: [
      "(el | mi) @wheater [de @home] @broken [@dur_tail] [@where]",
      "(el | mi) @wheater (no calienta | ya no calienta | no da agua caliente | no tiene agua caliente)",
      "(se descompuso | se apagó | dejó de funcionar | ya no funciona | no funciona | no sirve | no va | no jala | no prende | no enciende | no calienta) (el | mi) @wheater [@where] [@dur_tail]",
      "(tengo | hay | tenemos) un problema con (el | mi) @wheater",
      "no (hay | tengo | tenemos | sale | me sale) agua caliente [@where | en la regadera | de la regadera] [@dur_tail]",
      // naming it ("El calentador.", "No, el calentador de agua.", "Es el calentador.") after "¿No será el aire?"
      "(el | mi) @wheater [de @home]", "(es | el problema es) (el | mi) @wheater",
      "el agua caliente (no sale | ya no sale | no funciona | no sirve) [@where] [@dur_tail]", "el agua (sale | esta | sale muy) fria [en la regadera | de la regadera]",
      "(la | mi) calefaccion @broken [@dur_tail]", "no (funciona | sirve | prende) la calefaccion", "no (hay | tengo) calefaccion",
      // a second complaint after the AC ("Vamos por partes.")
      "[y] (el | mi) @wheater (tampoco | tampoco funciona | tampoco sirve | tampoco calienta | tampoco prende)",
      "[y] tampoco (funciona | sirve | calienta | prende) (el | mi) @wheater", "[y] (el | mi) @wheater tambien @broken",
      "[y] tampoco (hay | tengo) agua caliente", "[y] no (hay | tengo) agua caliente tampoco",
    ] },
    // "El calentador sí funciona." / "El calentador está bien.": the heater is fine (the accept tails would otherwise
    // read "El calentador" + "funciona" as the heater blamed)
    heater_ok: { patterns: ["(el | mi) @wheater [si | ya | todavia] (funciona | sirve | calienta | jala | esta bien | esta perfecto) [bien | perfecto]"] },

    // --- how long ------------------------------------------------------------------
    heat_duration: { patterns: [
      "(desde hace | hace | ya hace | va para) @dur [ya] #h:a_week",
      "desde [el] {day} [pasado] #h:since_last", "desde (ayer #short | anoche #short | antier #d2 | anteayer #d2 | la semana pasada | el fin de semana | el fin de semana pasado | {date})",
      "@dur [ya]", "toda la semana #wk",
      "[ya] (lleva | tiene) @dur [asi | sin enfriar | sin funcionar | descompuesto | sin aire]",
      "(llevo | llevamos) @dur sin aire", "(ya)? (son | van) @dur", "no (es | son) (una semana | unos dias | un dia | tres dias) (es | son) @dur",
      "(no funciona | no enfria | no sirve | esta descompuesto | esta roto | esta asi) (desde hace @dur | desde [el] {day} [pasado] | desde (ayer #short | anoche #short | la semana pasada))",
      "(@ac | el aire) (lleva | tiene) @dur [asi | sin enfriar | sin funcionar | descompuesto]",
      "(se descompuso | dejó de funcionar | dejó de enfriar | empezó | se murió | se apagó) [el] {day} [pasado]",
      "(se descompuso | dejó de funcionar | dejó de enfriar | empezó) hace @dur",
      "hace @dur que (no enfria | no funciona | esta asi | esta descompuesto | no sirve | estoy sin aire)",
      // calques ("for a week" → por una semana): understood, with the desde hace tip
      "(esta | estuvo) (descompuesto | roto | asi) (por | durante) @dur #tip:tense_since", "(no funciona | no enfria) (por | durante) @dur #tip:tense_since",
      "(por | durante) @dur #tip:tense_since",
    ] },
    // "El lunes." / "El lunes pasado." while he asks how long
    dur_ctx: { patterns: ["[el] {day} [pasado]"] },
    called_before: { patterns: [
      "le (llamé | marqué | hablé) (todos los dias | muchas veces | varias veces | {number} veces | mil veces | toda la semana | ayer | el {day}) [@dur_tail] #h:called_every_day",
      "le he (llamado | marcado | hablado) [al celular] (todos los dias | muchas veces | varias veces | {number} veces | mil veces | toda la semana)",
      "te (llamé | he llamado) [al celular] [todos los dias | muchas veces | varias veces | {number} veces] #tip:tu_staff",
      "le (llamé | marqué) al celular [todos los dias | muchas veces | varias veces]",
      "le (escribí | mandé mensajes | mandé mensaje) (varias veces | muchas veces | todos los dias | {number} veces | mil veces)",
      "le (dejé | mandé | escribí) [un | {number} | muchos | varios] (mensaje | mensajes | whatsapp | whatsapps | correo | correos | recado | recados | audio | audios) #h:left_voicemail",
      "(usted)? (nunca | no) (contesta | me contesta | contestó | me contestó | responde | me responde) [el telefono | mis llamadas | mis mensajes | el celular]",
      "no me (regresó | devolvió) la llamada", "nadie contesta [el telefono]",
      // "¿Por qué no contesta el teléfono?" (the intro: he never answers)
      "por que no (me)? (contesta | contestaba | contestó | responde | respondió | regresa | devuelve) [el telefono | el celular | mis llamadas | mis mensajes | la llamada | las llamadas]",
      "(le | te #tip:tu_staff) (llamé | marqué | hablé) y no (contestó | contesta | me contestó)",
      "(intenté | traté de) (llamarle | llamarlo | localizarlo | hablarle) [toda la semana | muchas veces | varias veces]",
      "(toqué | he tocado) (su puerta | a su puerta) [varias veces | {number} veces | todos los dias]",
    ] },

    // --- the remote control (the English thermostat) ----------------------------------
    thermo_yes: { patterns: [
      "[si] ya (lo | la) revisé [dos veces | varias veces | mil veces | {number} veces] #h:checked_twice",
      "[si] (ya)? (revisé | probé) el control [dos veces | varias veces]", "no es el control #h:not_thermostat", "no es el control es el (aparato | aire | minisplit)", "el control (funciona | esta bien | sirve)",
      "(ya)? (probé | intenté | hice) todo #h:tried_everything",
      "[si] (ya)? le (cambié | puse) (las | unas) pilas [nuevas] [al control]", "[si] (ya)? (esta | lo puse) en (frio | modo frio) [y nada | y no enfria | y sigue igual | y sigue echando aire caliente]",
      "(no funciona | no enfria) ni con el control", "ya (lo | la) puse en (frio | modo frio) y nada",
      "[si] claro que (lo revisé | si)",
    ] },
    thermo_no: { patterns: [
      "no (lo | la) (revisé | he revisado | probé)", "no (esta | estaba) en (frio | modo frio)", "no (revisé | he revisado) el control", "(que | cual) control", "(donde | en donde) esta el control",
      "que es (modo frio | el modo frio | frio)", "no se (donde esta | como funciona | como se usa | usar) el control", "no tengo (el | un) control",
    ] },

    // --- the dodge: whose job is it? -----------------------------------------------------
    responsibility: { patterns: [
      "arreglarlo le toca a usted #h:your_resp", "le toca a usted [arreglarlo]", "(arreglarlo | eso | las reparaciones) le (toca | tocan | corresponde | corresponden) (a usted | al dueno)",
      "me temo que (es su responsabilidad | le toca a usted) [arreglarlo] #h:afraid_resp",
      "(es | eso es) su (responsabilidad | obligacion | trabajo | deber) [arreglarlo] [como dueno]",
      "le (corresponde | toca) a usted [arreglarlo]", "(eso)? no es mi (problema | trabajo | responsabilidad)",
      "(usted)? tiene que arreglarlo [porque] (es su responsabilidad | le toca a usted | es su trabajo | usted es el dueno)",
      "@lead_resp (es | son) su (responsabilidad | trabajo | obligacion)",
      "@lead_resp (es | son) (responsabilidad | trabajo | obligacion) del dueno",
      "segun el @contract [las reparaciones (le tocan | le corresponden | son) a usted] #h:contract",
      "segun el @contract usted (tiene que arreglarlo | paga las reparaciones | se encarga de las reparaciones)",
      "(el @contract dice | dice el @contract) que (usted | el dueno) (arregla | paga | tiene que arreglar | se encarga de | debe arreglar) (las reparaciones | todo | eso | el aire)",
      "(esta | viene) en el @contract", "eso no es lo que dice el @contract",
      "@ac (esta | viene) incluido [en la renta | en el @contract] #h:heat_included", "(la renta | el @contract) incluye el aire [acondicionado]",
      "(el departamento | lo) (renté | rentamos) con aire [acondicionado]", "el departamento (viene | se renta) con aire [acondicionado]",
      "(yo)? pago la renta [cada mes | completa | puntual | a tiempo]",
      "usted es el dueno", "usted es el dueno asi que le toca (a usted)?", "[usted es el dueno] le (toca | corresponde) (arreglarlo | a usted arreglarlo)", "(eso | arreglarlo) no me toca a mi",
      "(eso | ese) es su trabajo [no el mio]", "es su trabajo no el mio",
      "el dueno (tiene que | debe) arreglarlo", "he tenido paciencia pero (es su responsabilidad | le toca a usted)",
      "es (responsabilidad | obligacion) del dueno",
      "(usted)? tiene que arreglarlo [ya | ahora] #tip:too_blunt #harsh",
      "(usted)? (debe | tiene la obligacion de) arreglarlo [ya | ahora] #tip:too_blunt #harsh",
      "haga su trabajo #tip:rude_insult #harsh",
    ] },
    // "No es su responsabilidad." / "No está en el contrato.": never the landlord's job admitted
    resp_neg: { patterns: [
      "no es su (responsabilidad | trabajo | obligacion)", "(eso | arreglarlo) no es su (responsabilidad | trabajo | obligacion)", "no le toca a usted",
      "no (esta | viene) en el @contract", "usted no es el dueno", "@ac no (esta | viene) incluido [en la renta | en el @contract]",
      "el @contract no dice (eso | nada)",
    ] },
    request_fix: { patterns: [
      "usted es el dueno arreglelo #h:please_fix #imp",
      "(puede | podria | me puede | me podria) @fixit [@fix_tail]", "(puedes | podrias) @fixit [@fix_tail] #tip:tu_staff",
      "(puede | podria) mandar a @someone [a @fixit | a verlo] [@fix_tail] #h:send_someone", "(puedes | podrias) mandar a @someone [a @fixit] #tip:tu_staff",
      "(arreglelo | mande a @someone | haga algo) [@fix_tail] #imp",
      "necesito que (alguien | un tecnico) (lo arregle | lo revise | venga) [@fix_tail]", "necesito (el aire | aire acondicionado | que lo arreglen) [@fix_tail]",
      "(quiero | quisiera | me gustaria) que lo (arregle | arreglen) [@fix_tail]", "(puede | podria) hacer algo", "necesito su ayuda",
      "por que no lo (arregla | ha arreglado)", "[creo que] deberia arreglarlo",
      "(puede | podria) fijarlo #tip:fijar",
      "(lo | me lo) (puede | podria) (arreglar | revisar | reparar) [@fix_tail]",
      "(puede | podria) (llamar | llamarle | hablarle) a @someone [@fix_tail]", "necesito (un tecnico | a alguien | ayuda) [@fix_tail]",
      "(me | nos) (puede | podria) ayudar", "[usted] no (puede | podria) mandar a @someone [@fix_tail]", "(quiero | necesito | quisiera) que venga @someone [@fix_tail]",
      "(arreglelo | arreglalo #tip:tu_staff) (ya | ahora | hoy | ahorita | de inmediato | ahora mismo) #tip:too_blunt #harsh", "exijo que lo arregle [ya | hoy] #tip:too_blunt #harsh",
    ] },
    patient: { patterns: [
      "he tenido paciencia pero la paciencia no me refresca #h:been_patient",
      "he (tenido | sido) [mucha | muy] (paciencia | paciente)", "la paciencia no me refresca",
      "he (tenido | sido) [mucha | muy] (paciencia | paciente) pero (esto ya es serio | ya no aguanto | hace mucho calor)",
      "(he esperado | llevo esperando) @dur", "ya no (puedo | quiero) esperar [mas]", "no puedo esperar mas",
      "esto (ya es | se esta poniendo) (serio | ridiculo | demasiado | insoportable)", "ya no aguanto [el calor | mas]",
    ] },
    // "¿Ya probó con un baño de agua fría?" – "Muy gracioso."
    you_kidding: { patterns: ["(esta | estas #tip:tu_staff) (bromeando | jugando) [verdad]", "es (broma | en serio)", "(muy | que) (gracioso | chistoso)", "no es (gracioso | chistoso)", "no es chiste",
      "me (esta | estas #tip:tu_staff) tomando el pelo", "(lo dice | habla) en serio"] },
    threat: { patterns: [
      "lo voy a (demandar | reportar | denunciar) #tip:threat_legal", "voy a (llamar a | hablar con) (un abogado | mi abogado | la policia | profeco) #tip:threat_legal",
      "usted es un (mal | pesimo | terrible | horrible) (dueno | casero) #tip:rude_insult", "(es | usted es) el peor (dueno | casero) #tip:rude_insult",
      "usted es (un flojo | flojo | un mentiroso | mentiroso | un inutil | inutil) #tip:rude_insult", "callese #tip:rude_insult",
    ] },
    withhold: { patterns: [
      "no (le voy a pagar | voy a pagar | le pago | pago) [la renta] hasta que (lo arregle | funcione | arregle el aire | el aire funcione) #tip:withhold",
      "no (le voy a pagar | voy a pagar | le pago) [la renta | nada | este mes] #tip:withhold",
      "este mes no (le voy a pagar | voy a pagar | le pago | pago) [la renta | nada] #tip:withhold",
      "sin aire no hay renta #tip:withhold", "voy a dejar de pagar [la renta] #tip:withhold",
      "le pago cuando (lo arregle | funcione el aire | el aire funcione) #tip:withhold",
      "si no lo arregla no (le pago | le voy a pagar | pago | voy a pagar) [la renta] #tip:withhold",
    ] },

    // --- the offer: fix it yourself ------------------------------------------------------------
    refuse_offer: { patterns: [
      "eso no es lo que acordamos #h:not_agreed", "eso no (es justo | es lo que dice el @contract | es mi trabajo | me toca | es mi responsabilidad | fue lo que quedamos)",
      "no (acordamos | quedamos en) eso",
      "(yo)? no soy (tecnico | tecnica | plomero | plomera | electricista | experto | experta | fontanero | fontanera) #h:not_plumber",
      "no se (arreglarlo | arreglar (eso | aires | aires acondicionados | minisplits | el aire | climas) | como arreglarlo)",
      "(prefiero | mejor) que (venga | lo arregle) (un tecnico | chucho | alguien | un profesional | usted)", "mejor mande a (chucho | un tecnico | alguien | un profesional)",
      // "Está bien, que venga Chucho." / "Que lo arregle el técnico.": send him (never "que lo arregle yo")
      "[mejor] que (venga | lo arregle | lo revise | lo repare) @someone [por favor] #send", "que lo (arregle | revise | repare) usted [por favor] #send",
      "no es justo", "no es lo que acordamos", "no (puedo | se) arreglarlo [yo | yo solo | yo sola]",
      "[no gracias] mande a un (tecnico | profesional | experto) #h:no_thanks_pro", "(puede | podria) mandar a un (tecnico | profesional) [mejor]",
      "prefiero no (tocarlo | hacerlo | meterme) #h:rather_not", "no (quiero | voy a) (tocarlo | arreglarlo | intentarlo) [yo]", "no lo (arreglo | voy a arreglar | voy a intentar) [yo]", "yo no lo (arreglo | voy a arreglar)",
      "ya (intenté | traté de) (arreglarlo | arreglar el aire) [y no pude]", "por que no lo arregla usted", "la mitad no",
      "por que (lo tengo que | tendria que) arreglar yo", "[no] arreglelo usted", "la mitad no (es justo | alcanza)",
      "no voy a pagar (nada | la mitad | la reparacion)", "no tengo (herramientas | tiempo | escalera)",
      "(ni loco | ni loca | de ninguna manera) #tip:bare_no #noway",
    ] },
    accept_offer: { patterns: [
      "[esta bien | bueno | ok] (lo arreglo yo | yo lo arreglo | lo intento | voy a intentarlo | lo hago yo | yo lo hago)", "(yo)? (puedo | lo puedo) arreglar(lo)? [yo]",
      "yo lo puedo arreglar", "[si] (puedo | voy a) intentarlo", "[no] yo (puedo arreglarlo | lo puedo arreglar | lo arreglo | lo intento)",
      "[si | bueno | esta bien] (puedo | yo puedo) (arreglarlo | intentarlo) [yo]", "(preste | mande) (la escalera | las herramientas)", "la mitad esta bien", "(dejeme | deje) intentarlo", "lo voy a intentar",
      "(mejor | prefiero) que lo arregle yo", "prefiero (arreglarlo | intentarlo) yo",
    ] },
    // "¿Cuánto cuesta arreglarlo?" while the offer is open: his half, never a yes
    offer_price_ctx: { patterns: ["cuanto (cuesta | costaria | sale | va a costar) [arreglarlo | la reparacion | repararlo]", "cuanto (me paga | me va a pagar | me da | es la mitad)",
      "y (cuanto | quien) paga (lo demas | la otra mitad)",
      // "¿La mitad?" (an echo, never a yes) / "¿Quién paga?"
      "[solo | nada mas | nomas] la mitad", "[y] quien (paga | va a pagar) [lo demas | el resto | la otra mitad | todo | la reparacion]"] },
    // "¿Quién paga la reparación?" / "¿Tengo que pagar algo?" (#rep: the repair is named)
    who_pays: { patterns: [
      "[y] quien (paga | va a pagar | pagaria) (la reparacion | el arreglo | al tecnico | a chucho | las piezas | eso) #rep", "[y] quien (paga | va a pagar)",
      "[y] usted (paga | va a pagar | me paga | cubre) (la reparacion | el arreglo | al tecnico | a chucho | todo) #rep",
      "(la reparacion | el arreglo) (la paga | lo paga | la va a pagar | lo va a pagar) usted #rep",
      "(tengo | voy a tener) que pagar (la reparacion | el arreglo | al tecnico | a chucho | la mitad) [yo] #rep", "(tengo | voy a tener) que pagar algo [yo] #me",
      "(chucho | el tecnico) me (va a cobrar | cobra) [algo] #rep", "me (va a cobrar | van a cobrar) (la reparacion | el arreglo) #rep",
      "(cuanto | que tanto) me va a (costar | salir) (la reparacion | el arreglo) #rep",
    ] },
    // "¿Tengo que estar en casa?" (Chucho has a key)
    need_home: { patterns: ["(tengo que | necesito | debo | hay que) estar (en casa | ahi | aqui) [ese dia | {day} | en la manana]", "(es necesario | hace falta) que (este | yo este) (en casa | ahi)"] },
    // "Lo voy a pensar." at the offer or a day: he's leaving, so he asks again
    think_ctx: { patterns: ["lo (voy a pensar | pienso | tengo que pensar)", "(tengo que | necesito | quiero) pensarlo", "(dejeme | deje) pensarlo"] },
    walk_away: { patterns: ["(ya)? no importa", "olvidelo #forget", "(bueno | esta bien) olvidelo #forget", "olvidalo #forget #tip:tu_staff"] },

    // --- the date ---------------------------------------------------------------------------------
    ask_when: { patterns: [
      "cuando puede venir alguien #h:when_come_out",
      "cuando (puede | va a | podria) (venir | pasar) (@someone | usted)", "cuando (viene | llega) (@someone | el tecnico)",
      "cuando (lo arreglan | lo va a arreglar | lo puede arreglar | va a quedar)",
      "(que | cual) dia (puede venir | viene | va a venir) [@someone]", "cuando exactamente", "que dia exactamente", "(que | cual) dia",
      "(me puede dar | deme) una fecha [exacta]", "necesito una fecha [exacta]", "a que hora [viene | llega | puede venir | va a venir] [@someone]", "(puede | podria) ser mas (especifico | exacto)", "para cuando",
    ] },
    too_late: { patterns: [
      "[pensandolo bien | la verdad | ahora que lo pienso] la proxima semana es (muy | demasiado) tarde #h:too_late",
      "(eso | el miercoles | una semana | la semana que viene | el viernes) (es | sigue siendo) (muy | demasiado) tarde",
      "(es | sigue siendo) (muy | demasiado) tarde", "(muy | demasiado) tarde",
      "no (puedo | podemos) esperar (tanto | una semana | hasta el miercoles | otra semana | tanto tiempo)",
      "(puede | podria) venir (antes | mas pronto | esta semana) #h:sooner", "(puede | podria) (alguien | el tecnico | chucho) venir (antes | mas pronto | esta semana)",
      "no hay (algo | nada) (antes | mas pronto)", "(antes | mas pronto | esta misma semana)", "lo antes posible", "cuanto antes", "no (puede | podria) venir (antes | mas pronto)",
      "(una semana | eso | la proxima semana) es mucho tiempo", "no (quiero | puedo) esperar hasta {day} [de la (proxima | otra) semana]",
      "{day} [de la (proxima | otra) semana] (es | sigue siendo) (muy | demasiado) tarde",
      "antes del fin de semana #h:before_weekend", "hace mucho calor no puedo esperar",
      "(puede | podria) venir [alguien | el tecnico | chucho] antes del fin de semana", "({day} | eso) es lo mas (pronto | temprano)", "es lo mas pronto [que puede]",
      "lo necesito (antes | esta semana | antes del fin de semana)", "(puede | podria) ser (antes | esta semana)",
    ] },
    propose_day: { patterns: [
      "(que tal | y si | mejor | puede ser | se puede) {day} [de la (proxima | otra) semana] [en la manana | en la tarde]",
      "(puede | podria) venir {day} [de la (proxima | otra) semana] [en la manana | en la tarde]", "que venga [@someone] {day} [en la manana | en la tarde]",
      "{day} (seria mejor | es mejor | me queda mejor) #h:saturday_better", "{day} si se puede", "{day} o {day}",
      "para {day} [a mas tardar]", "a mas tardar {day}", "antes del {day} #before",
      "lo necesito (arreglado | listo | funcionando) (para | a mas tardar) {day}", "lo necesito (arreglado | listo | funcionando) antes del {day} #before",
    ] },
    // "¿Puede venir en la tarde?" while a day is being agreed: mornings only
    afternoon_ctx: { patterns: ["(puede | podria) (venir | ser) [{day}] en la tarde", "[y] en la tarde", "(mejor | que tal) en la tarde", "en la manana no (puedo | estoy)"] },
    // a bare day while a day is being agreed: "El viernes." / "El viernes en la mañana."
    day_ctx: { patterns: ["{day} [de la (proxima | otra) semana] [en la manana | en la tarde | temprano] [a {time}]"] },
    // "El viernes no me queda." (never an agreement)
    day_no: { patterns: [
      "{day} [en la manana] no (puedo | me queda | me queda bien | me sirve | me conviene | esta bien)",
      "no puedo {day}", "{day} no", "no me (queda | queda bien | sirve | conviene) {day}",
    ] },
    accept_date: { patterns: [
      "{day} [en la manana] me queda bien #h:friday_works", "{day} [en la manana] (esta bien | esta perfecto | perfecto | me parece bien | me sirve)",
      "nos vemos {day}", "trato hecho", "me parece bien #h:works_me", "me sirve", "de acuerdo {day}",
    ] },
    home_yes: { patterns: [
      "[si] (voy a estar | estoy | estare) en casa [todo el dia | toda la manana | {day} | a esa hora] #h:ill_be_home",
      "[si] trabajo desde casa", "si (voy a estar | ahi estoy | ahi voy a estar)", "[si] (en la manana | ese dia | {day}) (estoy | voy a estar) en casa", "[si] (ahi | aqui) (voy a estar | estoy | estare)", "(puedo | voy a) estar en casa",
    ] },
    leave_key: { patterns: [
      "(le | se la) (puedo | voy a) dejar (la | una | mi) llave a (dona lupita | la vecina | mi vecina) #h:key_with_rita",
      "no voy a estar [en casa] pero (dona lupita | la vecina) (tiene llave | tiene una llave | tiene mi llave | le puede abrir)",
      "(dona lupita | la vecina) tiene (una | mi) llave", "(dona lupita | la vecina) (le puede abrir | puede abrirle | le abre)", "le dejo la llave a (dona lupita | la vecina)",
    ] },
    not_home: { patterns: [
      "[no] voy a estar en el trabajo #h:at_work", "[no] voy a (trabajar | estar en la oficina) [ese dia | {day}]",
      "(chucho | el tecnico) (puede entrar | puede abrir | entra) con su llave", "[no] (voy a estar | estoy) trabajando [ese dia | {day}]",
      "[no] no (voy a estar | estoy | estare) [en casa] [ese dia | {day} | en la manana]", "no se si (voy a estar | estoy | estare) [en casa] [ese dia | {day}]", "tengo que trabajar [ese dia | {day}]",
    ] },

    // --- wrapping up ---------------------------------------------------------------------------
    in_writing: { patterns: [
      "me lo (puede | podria) (mandar | enviar) por (correo | mensaje | whatsapp | escrito) #h:email_please",
      "me lo (puede | podria) poner por escrito #h:in_writing",
      "me (manda | puede mandar | podria mandar) un mensaje con (la fecha | el dia) #h:text_me",
      "(me lo | lo) (puede | podria) (confirmar | escribir) por (mensaje | correo | escrito | whatsapp)",
      "(lo | la fecha) (quiero | necesito | quisiera) por escrito", "(quiero | necesito | quisiera) (eso | la fecha)? por escrito",
      "(mandeme | escribame) un (mensaje | correo | whatsapp) [con la fecha]", "me lo (manda | confirma | pone) por (mensaje | whatsapp | correo | escrito)",
    ] },
    // "Sí, una cosa más." to "¿Algo más?": he waits for it
    more_ctx: { patterns: ["[si] (una cosa mas | otra cosa | una pregunta [mas] | tengo otra pregunta | tengo una pregunta)", "[no] solo una pregunta"] },
    no_more: { patterns: ["[no] (eso es todo | es todo) [gracias] #h:thats_all", "[no] nada mas", "[no] (eso seria todo | seria todo)", "[no] ya (esta | quedó) todo", "[no] estoy bien"] },
    ask_discount: { patterns: [
      "(me puede | me podria | puede | podria) (hacer | dar) un descuento [en la renta] [por (esta semana | estos dias | los dias sin aire)]",
      "(me puede | me podria) bajar la renta [este mes | por esta semana]", "(voy a | puedo) pagar menos [este mes]",
      "[y] (un | algun) descuento", "me (hace | da) un descuento [en la renta] [por (esta semana | estos dias | los dias sin aire)]", "me (descuenta | puede descontar) (los dias sin aire | esta semana | estos dias)",
    ] },
    ask_trip: { patterns: [
      "cuanto tiempo (se va | va a estar fuera | va a estar en san cristobal | se queda en san cristobal)", "cuando (regresa | vuelve)", "a donde (va | se va)", "se va de vacaciones",
    ] },

    // --- the rent -------------------------------------------------------------------------------
    pay_rent: { patterns: [
      "[claro] aqui (tiene | esta) en efectivo #h:here_check", "[claro] aqui (tiene | esta) la renta [de este mes] [en efectivo]",
      "(le pago | se la pago) (ahorita | ahora | de una vez | en efectivo)", "(puedo | le puedo) pagar (ahorita | ahora | en efectivo)",
      "aqui (tiene | estan) (los | sus) ({price} | catorce mil [pesos])", "(traigo | tengo) la renta [aqui]",
    ] },
    // "¿Cuánto es?" while he asks for the rent: the amount again, nothing paid
    rent_q_ctx: { patterns: ["(cuanto | de cuanto) (es | son | le debo | era) [la renta] [de este mes]", "cuanto le (debo | pago)"] },
    // "Sí, el aire." / "Otra vez el aire." to "Déjeme adivinar: ¿el aire?"
    ac_ctx: { patterns: ["(si | exacto | correcto | asi es | adivino) [otra vez] (el aire | el aire acondicionado | el clima | el minisplit | el aparato) [otra vez]",
      // "Sí, perdón, el aire." / "Ah, el aire." after "¿No será el aire?"
      "[si] [ah | ay] (perdon | perdone | disculpe | ah | ay) (el aire | el aire acondicionado | el clima | el minisplit | el aparato)",
      "otra vez (el aire | el aire acondicionado | el clima | el minisplit)", "(el aire | el aire acondicionado | el clima | el minisplit) otra vez"] },
    // "Aquí tiene." while he asks for the rent
    pay_ctx: { patterns: ["aqui (tiene | esta)", "tenga", "tome"] },
    ask_receipt: { patterns: [
      "voy a necesitar un recibo #h:need_receipt", "me da un recibo #h:receipt_please",
      "(me puede | me podria) (dar | hacer) un recibo", "[y] (un | el) recibo", "necesito (un | el) recibo", "(quiero | quisiera) un recibo",
    ] },
    pay_later: { patterns: [
      "se la transfiero (manana | el primero) #h:pay_online",
      "(le | se la) (transfiero | pago | deposito) (el primero | la proxima semana | {day} | mas tarde | hoy en la noche | luego | al rato)",
      "(le | se la) pago (con | por) transferencia", "(le hago | le mando) la transferencia [el primero | {day} | hoy | luego | mas tarde | al rato]",
      "(puedo | le puedo) pagar (despues | mas tarde | con transferencia | por transferencia | {day})",
      "no (tengo | traigo) (el dinero | efectivo | la renta) [aqui | ahorita | conmigo]", "(puedo | le puedo) pagar con tarjeta",
      "no (quiero | puedo) pagar en efectivo", "(le | se la) (puedo | voy a) transferir", "no (tengo | traigo) efectivo [pero] (le | se la) (puedo | voy a) transferir",
      "no (le | se la)? (puedo | voy a) pagar (ahora | ahorita | hoy)", "(ahora | ahorita | hoy) no (tengo | traigo | puedo)",
      "se la (doy | paso | pago) (manana | {day} | luego | despues | el primero | mas tarde)", "[si] pero se la (transfiero | deposito)",
      "(y si | que tal si) se la (pago | transfiero | doy) (manana | despues | luego | {day} | el primero)",
      // "Sí, se la transfiero." / "Ahorita se la transfiero." / "Mañana se la doy." / "¿Puedo pagarle mañana?" (a transfer
      // any time; cash only later: "Ahorita se la pago" is pay_rent)
      "[si] [claro] [ahorita | ahora | hoy | luego | al rato | manana] (se la | le) (transfiero | deposito) [ahorita | ahora | hoy | luego | al rato | mas tarde | hoy en la noche | en la noche | manana | {day} | el primero]",
      "(manana | luego | despues | al rato | mas tarde | el primero | {day}) (se la | le) (doy | paso | pago | transfiero | deposito)",
      "(puedo | le puedo) (pagarle | pagarsela | pagar) (despues | mas tarde | luego | al rato | {day} | el primero | con transferencia | por transferencia)",
    ] },
    paid_already: { patterns: [
      "ya (se la | le) (pagué | transferí | deposité)", "ya (pagué | la pagué) [la renta]", "(pagué | la pagué | se la pagué) (el primero | ayer | la semana pasada | por transferencia)",
      "ya esta pagada", "[ya] pagué todo", "ya se la (mandé | transferí)", "(le | se la) (pagué | transferí | deposité) (el primero | ayer | la semana pasada | antier | el {day})",
    ] },

    // --- Doña Lupita and goodbye --------------------------------------------------------------------------
    thanks_rita: { patterns: ["gracias dona lupita #h:thanks_rita", "gracias a usted dona lupita", "dona lupita gracias", "gracias (por (su ayuda | el apoyo | apoyarme | ayudarme)) dona lupita"] },
    ask_tech: { patterns: [
      "me (pasa | da | puede pasar | puede dar) el (numero | telefono | contacto) del tecnico #h:tech_number_q #num", "me (pasa | da | puede pasar | puede dar) (su | el) (numero | telefono | contacto) #num",
      "(tiene | me da) el numero de su tecnico #num", "como se llama (su | el) tecnico", "conoce a un tecnico [bueno]", "quien es su tecnico",
      // Chucho's number: Don Ernesto's to give (he's away for two weeks)
      "me (pasa | da | puede pasar | puede dar | podria pasar | podria dar) el (numero | telefono | contacto | celular | whatsapp) de chucho #chucho",
      "(tiene | cual es | me da) el (numero | telefono | celular) de chucho #chucho", "como (contacto | localizo | le hablo) a chucho #chucho",
    ] },
    trip_wish: { patterns: [
      "buen viaje #h:good_trip", "que tenga (buen viaje | buenas vacaciones)", "que le vaya bien en (su viaje | sus vacaciones | san cristobal)",
      "disfrute (san cristobal | sus vacaciones | el viaje)", "que disfrute (san cristobal | sus vacaciones | el viaje | el fresco) #h:enjoy_florida", "que se divierta [en san cristobal]", "felices vacaciones",
      "nos vemos (en dos semanas | cuando regrese)",
    ] },
  },

  lines: {
    // --- greeting --------------------------------------------------------------
    greet_open: [
      t("¡Ay, | hola! | Perdón, | no puedo | quedarme. | ¡Me voy | a | San Cristóbal!", "Oh, | hi! | Sorry, | I can't | stay. | I'm off | to | San Cristóbal!",
        "Oh, hi! Sorry, I can't stay. I'm off to San Cristóbal!"),
      t("¡Buenos días! | Rapidito, | ¿sí? | San Cristóbal | me | espera.", "Good morning! | Make it quick, | okay? | San Cristóbal | (for) me | is waiting.",
        "Morning! Make it quick, okay? San Cristóbal is waiting.", { flags: { 1: "rapidito: rápido + -ito, “nice and quick”." } }),
    ],
    greet_again: [
      t("Ay, | usted | otra vez. | Déjeme | adivinar: | ¿el | aire?", "Oh, | you | again. | Let me | guess: | the | AC?", "Oh, it's you again. Let me guess: the AC?"),
    ],
    guess_reask: [t("El | aire, | ¿verdad?", "The | AC, | right?", "The AC, right?")],
    knew_it: [t("Lo | sabía.", "It | I knew.", "I knew it.")],
    no_then_what: [t("¿No? | ¿Entonces | en | qué | le | puedo | ayudar?", "No? | Then | with | what | (to) you | can I | help?", "No? Then what can I do for you?")],
    greet_who: [
      t("A ver, | ¿en | qué | le | puedo | ayudar?", "Let's see, | with | what | (to) you | can I | help?", "So, what can I do for you?"),
      t("Bueno, | ¿cuál | es | el | problema?", "Okay, | what | is | the | problem?", "Okay, what's the problem?"),
    ],
    one_minute: [t("Nada más | un | minuto, | ¿eh?", "Just | one | minute, | okay?", "Just one minute, okay?")],
    problem_reask: [t("¿Pasa | algo | arriba?", "Is going on | something | upstairs?", "Is something wrong upstairs?")],
    problem_what: [t("A ver. | ¿Qué | pasa?", "Let's see. | What | is going on?", "Okay. What's wrong?")],
    i_know_problem: [t("Sí, | sí, | el | aire. | Ya | me | dijo.", "Yes, | yes, | the | AC. | Already | (to) me | you said.", "Yes, yes, the AC. You told me.")],
    oh_no: [t("¡Ay, | no!", "Oh, | no!", "Oh, no."), t("Uy.", "Uh-oh.", "Uh-oh.")],
    // the water heater blamed (5 Nov 2026): steered to the AC
    heater_redirect: [
      t("¿El | calentador? | ¿Con | este | calor? | ¿No será | el | aire?", "The | heater? | With | this | heat? | Couldn't it be | the | AC?",
        "The heater? In this heat? Don't you mean the AC?", { flags: { 5: "No será…: the future tense makes a guess (“could it be…?”)." } }),
    ],
    heater_again: [t("El | calentador | funciona | bien, | se lo | aseguro.", "The | heater | works | fine, | it to you | I-assure.", "The heater works fine, I promise.")],

    // --- the remote control --------------------------------------------------------
    thermostat_q: [
      t("Mmm. | ¿Ya | revisó | el | control?", "Hmm. | Already | did you check | the | remote?", "Hmm. Have you checked the remote?"),
      t("¿Seguro | que | el | control | está | en | frío?", "Sure | that | the | remote | is | on | cool?", "Are you sure the remote is set to cool?"),
    ],
    thermostat_ok: [t("Bueno, | bueno, | le | creo.", "Okay, | okay, | (to) you | I believe.", "Okay, okay, I believe you.")],
    thermostat_no: [t("Pruébelo. | Estos | aparatos | viejos | tienen | su | carácter.", "Try it. | These | units | old | have | their | temper.", "Give it a try. These old units have a mind of their own.")],
    thermostat_no2: [t("O | no. | Por | su | cara, | ya | lo | intentó.", "Or | not. | By | your | face, | already | it | you tried.", "Or not. From your face, I'd say you already tried.")],
    thermostat_where: [
      t("Es | el | control | blanco | del | aire: | póngalo | en | frío, | el | del | copo de nieve.", "It's | the | remote | white | of the | AC: | set it | on | cool, | the one | with the | snowflake.",
        "It's the white remote for the AC: set it to cool, the snowflake button."),
    ],

    // --- how long ------------------------------------------------------------------
    duration_ask: [
      t("¿Desde | cuándo | no enfría?", "Since | when | hasn't it cooled?", "How long has it not been cooling?"),
      t("¿Cuánto | tiempo | lleva | así?", "How much | time | has it been | like this?", "How long has it been like this?"),
    ],
    since_when: [t("¿Desde | cuándo?", "Since | when?", "Since when?")],
    dur_react_long: [t("¿Tanto | tiempo? | Uy. | Bueno, | eso | no está | bien.", "So much | time? | Wow. | Well, | that | isn't | good.", "That long? Wow. Okay, that's not good.")],
    dur_react_week: [t("¿Una | semana? | Uy. | Bueno, | eso | no está | bien.", "A | week? | Wow. | Well, | that | isn't | good.", "A week? Wow. Okay, that's not good.")],
    dur_react_short: [t("Bueno, | bueno. | Eso | no está | bien.", "Okay, | okay. | That | isn't | good.", "Okay, okay. That's not good.")],
    dur_unknown: [t("Bueno. | Unos | días, | por lo menos.", "Okay. | A few | days, | at least.", "Okay. A few days, at least.")],
    voicemail_react: [
      t("Ay, | mis | mensajes... | Los | iba | a | revisar, | de veras.", "Oh, | my | messages... | Them | I was going | to | check, | really.", "Oh, my messages… I was going to check them, really.",
        { flags: { 3: "Los here is a pronoun (them, the messages), not an article." } }),
    ],

    // --- Doña Lupita (the twist) -------------------------------------------------------------
    rita_in: [t("Perdón | que | me meta, | Don | Ernesto.", "Sorry | that | I butt in, | Don | Ernesto.", "Sorry to butt in, Don Ernesto.")],
    rita_back: [
      t("Es | cierto. | Desde | mi | casa | se oye | el | ventilador | de al lado | toda | la | noche.", "It's | true. | From | my | home | you can hear | the | fan | next door | all | the | night.",
        "It's true. From my place I can hear that fan next door all night."),
    ],
    rita_irony: [t("¡Y | como | usted | siempre | arregla | todo | tan | rápido!", "And | since | you | always | fix | everything | so | fast!", "And you always fix everything so fast!")],
    rita_tech: [
      t("Y | si | no, | yo | conozco | a | un | técnico | muy | bueno, | ¿eh?", "And | if | not, | I | know | — | a | repairman | very | good, | you know?",
        "And if not, I know a really good AC repairman.", { flags: { 5: F_A } }),
    ],
    patel_rita: [t("Gracias, | Doña | Lupita. | Muy | amable.", "Thank you, | Doña | Lupita. | Very | kind.", "Thank you, Doña Lupita. Very helpful.")],
    rita_bye: [
      t("¡Para eso estamos, | {m:vecino!|f:vecina!} | Y | tome | mucha | agua, | ¿eh?", "That's what we're here for, | neighbor! | And | drink | lots of | water, | okay?",
        "That's what neighbors are for! And drink lots of water, okay?"),
    ],
    tech_number: [
      t("¡Claro! | Ahorita | se lo | paso | por | mensaje.", "Sure! | Right now | it to you | I'll pass | by | message.", "Of course! I'll text it to you right now.",
        { flags: { 1: F_AHORITA }, neutral: t("¡Claro! | Ahora mismo | se lo | paso | por | mensaje.", "Sure! | Right now | it to you | I'll pass | by | message.", "Of course! I'll text it to you right now.") }),
    ],
    tech_again: [t("Sí, | sí, | se lo | paso.", "Yes, | yes, | it to you | I'll pass.", "Yes, yes, I'll send it to you.")],
    // Don Ernesto, asked for Chucho's number (the audit, 5 Nov 2026)
    chucho_number: [t("Claro, | se lo | mando | por | mensaje.", "Sure, | it to you | I'll send | by | message.", "Sure, I'll text it to you.")],

    // --- the dodge -------------------------------------------------------------------
    dodge_old: [
      t("Mire, | el | aparato | ya | está | viejito. | Son | cosas | que | pasan.", "Look, | the | unit | already | is | a bit old. | They're | things | that | happen.",
        "Look, the unit's getting old. These things happen.", { flags: { 5: F_VIEJITO } }),
    ],
    dodge_sweater: [
      t("¿Ya | probó | con | un | baño | de | agua | fría?", "Already | did you try | with | a | shower | of | water | cold?", "Have you tried a cold shower?",
        { flags: { 4: "baño: a bath or a shower; also the bathroom." } }),
    ],
    kidding: [t("Es broma, | es broma.", "Just kidding, | just kidding.", "I'm kidding, I'm kidding.")],
    sorry_joke: [t("Perdón, | perdón. | Mal | chiste.", "Sorry, | sorry. | Bad | joke.", "Sorry, sorry. Bad joke.")],
    dodge_after_rita: [
      t("Bueno, | bueno. | El | aparato | ya | está | viejito, | pero... | está bien.", "Okay, | okay. | The | unit | already | is | a bit old, | but... | fine.",
        "Okay, okay. The unit's getting old, but… fine.", { flags: { 6: F_VIEJITO } }),
    ],
    dodge_q: [
      t("¿Y | qué | quiere | que | haga?", "And | what | do you want | that | I do?", "So what do you want me to do?", { flags: { 4: "haga: the subjunctive after querer que." } }),
      t("¿Entonces? | ¿Qué | quiere | de | mí?", "So? | What | do you want | from | me?", "So? What do you want from me?"),
    ],
    patience_react: [t("Ya sé, | ya sé, | y | se lo | agradezco.", "I know, | I know, | and | it to you | I appreciate.", "I know, I know, and I appreciate it.")],
    i_know: [t("Ya sé, | ya sé.", "I know, | I know.", "I know, I know.")],
    resp_react: [
      t("Bueno, | bueno. | Ya | leyó | el | contrato. | Eso | lo | respeto.", "Okay, | okay. | Already | you read | the | lease. | That | it | I respect.",
        "Okay, okay. You've read the lease. I respect that.", { flags: { 7: "lo repeats eso (that): Spanish doubles a fronted object." } }),
    ],
    resp_lease: [
      t("La | cláusula | de | las | reparaciones, | ya sé. | Me la | sé | de memoria.", "The | clause | about | the | repairs, | I know. | It | I know | by heart.",
        "The repairs clause, I know. I know it by heart.", { flags: { 6: "me la: la is the clause; me marks knowing it for oneself (saberse algo)." } }),
    ],
    resp_heat: [
      t("Sí, | sí, | el | aire | viene | incluido. | Conozco | mi | propio | contrato.", "Yes, | yes, | the | AC | comes | included. | I know | my | own | lease.",
        "Yes, yes, the AC comes with the place. I know my own lease."),
    ],
    resp_neg_react: [t("¿Ah, | no? | Pues... | ¿entonces | qué | quiere | que | haga?", "Oh, | no? | Well... | then | what | do you want | that | I do?", "Oh, it isn't? Well… then what do you want me to do?")],
    resp_what: [t("¿Mi | responsabilidad? | ¿De | qué?", "My | responsibility? | For | what?", "My responsibility? For what?")],
    fix_what: [t("¿Arreglar | qué?", "Fix | what?", "Fix what?")],
    resp_soft: [
      t("Claro, | claro, | lo | voy | a | arreglar. | Pero | primero, | escúcheme.", "Sure, | sure, | it | I'm going | to | fix. | But | first, | hear me out.", "Sure, sure, I'll fix it. But first, hear me out."),
    ],
    sure_sure: [t("Claro, | claro.", "Sure, | sure.", "Sure, sure.")],
    dodge_help: [
      t("Bueno, | ya | entendí. | Sin | aire, | con | este | calor, | no se puede.", "Okay, | now | I get it. | Without | AC, | with | this | heat, | it's impossible.",
        "Okay, I hear you. No AC in this heat is no fun."),
    ],
    blunt_react: [
      t("¡Epa, | epa! | {m:Tranquilo.|f:Tranquila.} | Somos | adultos.", "Whoa, | whoa! | Easy. | We're | adults.", "Whoa, whoa. Easy. We're both adults here."),
    ],
    not_enemy: [
      t("Oiga, | no es | para tanto. | Yo | no soy | su | enemigo.", "Hey, | it's not | that big a deal. | I | am not | your | enemy.", "Hey, no need for that. I'm not the enemy."),
    ],
    blunt_last: [t("Empecemos | otra vez. | Con | calma, | ¿sí?", "Let's start | again. | With | calm, | okay?", "Let's start over. Nice and calm, okay?")],
    rent_threat_react: [
      t("¡Epa! | Nadie | está | hablando | de | la | renta. | Hablemos | del | aire.", "Whoa! | Nobody | is | talking | about | the | rent. | Let's talk | about the | AC.",
        "Whoa! Nobody's talking about rent. Let's talk about the AC."),
    ],

    // --- the offer -------------------------------------------------------------------
    offer: [
      t("Le | propongo | algo: | arréglelo | usted, | y | yo | le | pago | la | mitad.", "(To) you | I propose | something: | fix it | you, | and | I | (to) you | will pay | the | half.",
        "Tell you what: fix it yourself, and I'll pay half.", { flags: { 4: "usted after the command: “you yourself”.", 8: "The present pago for a promise: I'll pay." } }),
    ],
    offer2: [
      t("Chucho, | mi | técnico, | le | puede | prestar | su | escalera | y | sus | herramientas.", "Chucho, | my | repairman, | (to) you | can | lend | his | ladder | and | his | tools.",
        "My repairman, Chucho, can lend you his ladder and tools.", { flags: { 0: "Chucho: a common nickname for Jesús." } }),
    ],
    offer_price: [
      t("Depende | de | qué | tenga | el | aparato. | Pero | yo | le | pago | la | mitad, | ¿eh?", "It depends | on | what | has | the | unit. | But | I | (to) you | will pay | the | half, | okay?",
        "Depends on what's wrong with the unit. But I'll pay half, okay?", { flags: { 3: "tenga: the subjunctive after depende de qué." } }),
    ],
    offer_reask: [t("¿Entonces? | La | mitad | del | costo. | ¿Trato hecho?", "So? | The | half | of the | cost. | Deal?", "So? Half the cost. Deal?")],
    // "¿Quién paga la reparación?" once Chucho is coming (the audit, 5 Nov 2026)
    pay_mine: [
      t("Eso | lo | pago | yo, | no se preocupe.", "That | it | I'll pay | myself, | don't worry.", "I'm paying for that, don't worry.",
        { flags: { 1: "lo repeats eso (that): Spanish doubles a fronted object.", 3: "yo after the verb stresses who: me, not you." } }),
    ],
    offer_refused_react: [
      t("Valía la pena | intentarlo. | Bueno, | bueno. | Le | llamo | a | Chucho.", "It was worth | trying it. | Okay, | okay. | (To) him | I'll call | — | Chucho.", "Worth a try. Okay, okay. I'll call Chucho.",
        { flags: { 4: F_LE, 6: F_A } }),
      t("¡Ja! | Tenía | que | preguntar. | Bueno, | le | mando | a | alguien.", "Ha! | I had | to | ask. | Okay, | (to) you | I'll send | — | someone.", "Ha! I had to ask. Okay, I'll send someone.",
        { flags: { 7: F_A } }),
    ],
    offer_accepted_react: [
      t("¿De veras? | ¡Perfecto! | Espere... | ¿y | si | se cae | de | la | escalera?", "Really? | Perfect! | Wait... | and | if | you fall | off | the | ladder?", "Really? Great! Wait… what if you fall off the ladder?"),
    ],
    offer_accepted2: [t("No, | no. | Olvídelo. | Le | mando | a | Chucho.", "No, | no. | Forget it. | (To) you | I'll send | — | Chucho.", "No, no. Forget it. I'll send Chucho.", { flags: { 5: F_A } })],
    one_thing: [t("Vamos por partes.", "One thing at a time.", "One thing at a time.")],

    // --- the date --------------------------------------------------------------------
    vague: [
      t("Él | le | llama | la | próxima | semana, | ¿sí?", "He | (to) you | will call | — | next | week, | okay?",
        "He'll call you sometime next week, okay?", { flags: { 2: "The present llama for a promise: he'll call.", 3: "la: the article before próxima semana has no English word." } }),
    ],
    vague_reask: [t("Entonces, | la | próxima | semana, | ¿sí?", "So, | — | next | week, | okay?", "So, sometime next week, okay?", { flags: { 1: "la: the article before próxima semana has no English word." } })],
    date_offer: [
      t("A ver... | ¿qué tal | el | miércoles | de | la | próxima | semana?", "Let's see... | how about | — | Wednesday | of | — | next | week?", "Let me see… how about next Wednesday?",
        { flags: { 2: F_EL_DAY, 5: "la: the article before próxima semana has no English word." } }),
    ],
    date_reask: [t("¿Entonces... | el | miércoles?", "So... | — | Wednesday?", "So… Wednesday?", { flags: { 1: F_EL_DAY } })],
    friday_reask: [t("¿Entonces... | el | viernes | en la mañana?", "So... | — | Friday | in the morning?", "So… Friday morning?", { flags: { 1: F_EL_DAY } })],
    friday_best: [t("Antes | del | viernes, | imposible.", "Before | — | Friday, | impossible.", "Friday is the best I can do.", { flags: { 1: F_DEL } })],
    // "¿El miércoles?" typed as a question (the audit, 5 Nov 2026): he confirms his day and asks; nothing is booked yet
    echo_wednesday: [
      t("Sí, | el | miércoles | de | la | próxima | semana. | ¿Le parece?", "Yes, | — | Wednesday | of | — | next | week. | Does that work for you?",
        "Yes, next Wednesday. Does that work for you?", { flags: { 1: F_EL_DAY, 4: "la: the article before próxima semana has no English word." } }),
    ],
    echo_friday: [t("Sí, | este | viernes. | ¿Le parece?", "Yes, | this | Friday. | Does that work for you?", "Yes, this Friday. Does that work for you?")],
    sooner_react: [
      t("Bueno, | bueno. | Chucho | puede | venir | el | viernes | en la mañana.", "Okay, | okay. | Chucho | can | come | on | Friday | in the morning.", "Okay, okay. Chucho can come out Friday morning.",
        { flags: { 5: F_EL_DAY } }),
      t("Usted | sí que | sabe | negociar. | El | viernes | en la mañana.", "You | really | know how | to negotiate. | — | Friday | in the morning.",
        "You drive a hard bargain. Friday morning.", { flags: { 4: F_EL_DAY } }),
    ],
    today_react: [t("¿Hoy? | Hoy | Chucho | tiene | la | agenda | llena.", "Today? | Today | Chucho | has | the | schedule | full.", "Today? Chucho's booked solid today.")],
    tomorrow_react: [t("¿Mañana? | Mañana | Chucho | tiene | la | agenda | llena.", "Tomorrow? | Tomorrow | Chucho | has | the | schedule | full.", "Tomorrow? Chucho's booked solid tomorrow.")],
    thursday_react: [
      t("¿El | jueves? | Eso | es | mañana. | Chucho | tiene | la | agenda | llena.", "— | Thursday? | That | is | tomorrow. | Chucho | has | the | schedule | full.",
        "Thursday? That's tomorrow. Chucho's booked solid.", { flags: { 0: F_EL_DAY } }),
    ],
    even_better: [t("Mejor | todavía: | Chucho | puede | venir | el | viernes.", "Better | still: | Chucho | can | come | on | Friday.", "Even better: Chucho can come on Friday.", { flags: { 5: F_EL_DAY } })],
    day_accept_friday: [t("El | viernes | está bien. | Le | aviso | a | Chucho.", "— | Friday | is fine. | (To) him | I'll let know | — | Chucho.", "Friday works. I'll tell Chucho.", { flags: { 0: F_EL_DAY, 5: F_A } })],
    day_accept_saturday: [t("El | sábado | está bien. | Le | aviso | a | Chucho.", "— | Saturday | is fine. | (To) him | I'll let know | — | Chucho.", "Saturday works. I'll tell Chucho.", { flags: { 0: F_EL_DAY, 5: F_A } })],
    window: [t("Entre | las | 9 | y | las | 12.", "Between | — | 9 | and | — | 12.", "Between 9 and noon.", { say: "Entre las nueve y las doce.", flags: { 1: F_CLOCK, 4: F_CLOCK } })],
    window_q: [
      t("Entre | las | 9 | y | las | 12. | ¿Le parece?", "Between | — | 9 | and | — | 12. | Does that work for you?", "Between 9 and noon. Okay?",
        { say: "Entre las nueve y las doce. ¿Le parece?", flags: { 1: F_CLOCK, 4: F_CLOCK } }),
    ],
    date_confirm_wednesday: [
      t("Perfecto. | El | miércoles, | entre | las | 9 | y | las | 12.", "Perfect. | — | Wednesday, | between | — | 9 | and | — | 12.", "Great. Wednesday, between 9 and noon.",
        { say: "Perfecto. El miércoles, entre las nueve y las doce.", flags: { 1: F_EL_DAY, 4: F_CLOCK, 7: F_CLOCK } }),
    ],
    date_confirm_friday: [
      t("Perfecto. | El | viernes, | entre | las | 9 | y | las | 12.", "Perfect. | — | Friday, | between | — | 9 | and | — | 12.", "Great. Friday, between 9 and noon.",
        { say: "Perfecto. El viernes, entre las nueve y las doce.", flags: { 1: F_EL_DAY, 4: F_CLOCK, 7: F_CLOCK } }),
    ],
    date_confirm_saturday: [
      t("Perfecto. | El | sábado, | entre | las | 9 | y | las | 12.", "Perfect. | — | Saturday, | between | — | 9 | and | — | 12.", "Great. Saturday, between 9 and noon.",
        { say: "Perfecto. El sábado, entre las nueve y las doce.", flags: { 1: F_EL_DAY, 4: F_CLOCK, 7: F_CLOCK } }),
    ],
    mornings_only: [t("Chucho | nada más | puede | en la mañana.", "Chucho | only | can | in the morning.", "Chucho only does mornings.")],
    wait_wait: [t("¡Espere, | espere!", "Wait, | wait!", "Wait, wait!")],
    writing_first: [t("¿Por escrito? | Bueno, | bueno.", "In writing? | Okay, | okay.", "In writing? Okay, okay.")],
    home_q: [t("¿Va | a | estar | en casa?", "Are you going | to | be | at home?", "Will you be home?")],
    home_ok: [t("Muy | bien.", "Very | good.", "Great.")],
    key_rita: [
      t("¿Con | Doña | Lupita? | Buena | idea. | Ella | de todos modos | se entera | de | todo.", "With | Doña | Lupita? | Good | idea. | She | anyway | finds out | about | everything.",
        "Doña Lupita? Good idea. She knows everything anyway."),
    ],
    gus_key: [t("No hay problema. | Chucho | tiene | llave.", "No problem. | Chucho | has | a key.", "No problem. Chucho has a key.")],

    // --- wrapping up -----------------------------------------------------------------
    anything_else: [
      t("¿Algo | más? | De veras | ya | me tengo que ir.", "Anything | else? | Really | now | I have to go.", "Anything else? I really have to run."),
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
    ],
    writing_react: [
      t("¿Por escrito? | Claro, | ahorita | le | mando | un | mensaje.", "In writing? | Sure, | right now | (to) you | I'll send | a | message.", "In writing? Sure, I'll text you right now.",
        { flags: { 2: F_AHORITA }, neutral: t("¿Por escrito? | Claro, | ahora mismo | le | mando | un | mensaje.", "In writing? | Sure, | right now | (to) you | I'll send | a | message.", "In writing? Sure, I'll text you right now.") }),
    ],
    writing_lease: [
      t("De veras | leyó | el | contrato. | Bueno, | le | mando | un | mensaje.", "Really | you read | the | lease. | Okay, | (to) you | I'll send | a | message.", "You really did read the lease. Okay, I'll text you."),
    ],
    text_sent_wednesday: [
      t("Listo: | “Chucho, | miércoles, | de | 9 | a | 12.” | ¿{m:Contento?|f:Contenta?}", "Done: | “Chucho, | Wednesday, | from | 9 | to | 12.” | Happy?",
        "There. “Chucho, Wednesday, 9 to noon.” Happy?", { say: "Listo: Chucho, miércoles, de nueve a doce. ¿{m:Contento|f:Contenta}?" }),
    ],
    text_sent_friday: [
      t("Listo: | “Chucho, | viernes, | de | 9 | a | 12.” | ¿{m:Contento?|f:Contenta?}", "Done: | “Chucho, | Friday, | from | 9 | to | 12.” | Happy?",
        "There. “Chucho, Friday, 9 to noon.” Happy?", { say: "Listo: Chucho, viernes, de nueve a doce. ¿{m:Contento|f:Contenta}?" }),
    ],
    text_sent_saturday: [
      t("Listo: | “Chucho, | sábado, | de | 9 | a | 12.” | ¿{m:Contento?|f:Contenta?}", "Done: | “Chucho, | Saturday, | from | 9 | to | 12.” | Happy?",
        "There. “Chucho, Saturday, 9 to noon.” Happy?", { say: "Listo: Chucho, sábado, de nueve a doce. ¿{m:Contento|f:Contenta}?" }),
    ],
    as_promised: [t("Y, | como | le | prometí, | le | mando | un | mensaje.", "And, | as | (to) you | I promised, | (to) you | I'll send | a | message.", "And, as promised, I'll text you.")],
    already_texted: [t("¡Ya | le | mandé | el | mensaje!", "Already | (to) you | I sent | the | message!", "I already texted you!")],
    discount_react_wednesday: [
      t("De | eso | hablamos | después | del | miércoles. | Mándeme | un | mensaje.", "About | that | we'll talk | after | — | Wednesday. | Send me | a | message.", "Let's talk about that after Wednesday. Send me a message.",
        { flags: { 4: F_DEL } }),
    ],
    discount_react_friday: [
      t("De | eso | hablamos | después | del | viernes. | Mándeme | un | mensaje.", "About | that | we'll talk | after | — | Friday. | Send me | a | message.", "Let's talk about that after Friday. Send me a message.",
        { flags: { 4: F_DEL } }),
    ],
    discount_react_saturday: [
      t("De | eso | hablamos | después | del | sábado. | Mándeme | un | mensaje.", "About | that | we'll talk | after | — | Saturday. | Send me | a | message.", "Let's talk about that after Saturday. Send me a message.",
        { flags: { 4: F_DEL } }),
    ],
    rent_first: [t("Primero | el | aire, | luego | la | renta.", "First | the | AC, | then | the | rent.", "The AC first, then the rent.")],
    discount_first: [t("Primero | el | aire, | luego | el | dinero.", "First | the | AC, | then | the | money.", "First the AC, then the money.")],
    trip_info: [
      t("Dos | semanas | en | San Cristóbal. | ¡Allá | hace | fresco | y | no hay | aparatos | que | arreglar!", "Two | weeks | in | San Cristóbal. | There | it's | cool | and | there are no | units | to | fix!",
        "Two weeks in San Cristóbal. It's cool up there, and nothing to fix!"),
    ],
    trip_thanks: [t("¡Gracias! | Ya | quiero | estar | allá.", "Thanks! | Already | I want | to be | there.", "Thanks! I can't wait.")],

    // --- the rent ----------------------------------------------------------------------
    rent_twist: [
      t("Ah, | y | ya que | está | aquí: | ¿la | renta | de | este | mes?", "Oh, | and | since | you are | here: | the | rent | of | this | month?", "Oh, and since you're here: this month's rent?"),
    ],
    rent_amount: [t("Son | {$rent}, | como | siempre.", "It's | {$rent}, | as | always.", "{$rent}, as always.")],
    rent_amount_again: [t("{$rent}, | lo de siempre.", "{$rent}, | the usual.", "{$rent}, same as always.")],
    rent_reask: [t("¿Entonces... | la | renta?", "So... | the | rent?", "So… the rent?")],
    rent_thanks: [
      t("¡Gracias! | Usted | es | mi | {m:inquilino|f:inquilina} | {m:favorito.|f:favorita.}", "Thanks! | You | are | my | tenant | favorite.", "Thanks! You're my favorite tenant."),
    ],
    receipt_react: [t("¿Un | recibo? | Uy. | No confía | en | mí, | ¿verdad?", "A | receipt? | Wow. | You don't trust | in | me, | right?", "A receipt? Wow. You don't trust me, huh?")],
    receipt_write: [
      t("Bueno: | “Recibí | la | renta | de | este | mes.” | Aquí tiene.", "Okay: | “I received | the | rent | for | this | month.” | Here you go.",
        "Fine. “Received this month's rent.” There you go."),
    ],
    receipt_for_what: [t("¿Un | recibo? | ¿De | qué?", "A | receipt? | For | what?", "A receipt? For what?")],
    rent_later_ok: [t("No hay problema. | Me la | transfiere, | como | siempre.", "No problem. | It to me | you transfer, | as | always.", "No problem, just send it by transfer, as usual.")],
    paid_already: [
      t("Ah, | es | cierto, | ya | me la | pagó. | Mi | cabeza | ya | está | en | San Cristóbal.", "Oh, | it's | true, | already | it to me | you paid. | My | head | already | is | in | San Cristóbal.",
        "Oh, right, you did. My head's already in San Cristóbal."),
    ],
    rent_is_rent: [
      t("La | renta | es | la | renta, | y | el | aire | es | el | aire.", "— | Rent | is | — | rent, | and | the | AC | is | the | AC.", "Rent is rent, and the AC is the AC.",
        { flags: { 0: F_LA_GEN, 3: F_LA_GEN } }),
    ],
    walkaway_rent: [t("Bueno... | hablamos | cuando | regrese.", "Okay... | we'll talk | when | I get back.", "Okay… let's talk when I'm back.", { flags: { 3: "regrese: the subjunctive after cuando for the future." } })],

    // --- the goodbye -----------------------------------------------------------------
    bye_success: [
      t("Bueno, | ahora sí | me tengo que ir. | ¡Aguante | ese | calor!", "Okay, | now really | I have to go. | Hang in there | with that | heat!", "Okay, I really have to run. Hang in there in that heat!"),
    ],
    final_full: [t("Y | oiga: | gracias | por | la | paciencia.", "And | hey: | thanks | for | the | patience.", "And hey: thanks for being patient.")],
    final_wed: [
      t("El | miércoles, | entonces. | Mientras, | abra | bien | las | ventanas | en la noche.", "— | Wednesday, | then. | Meanwhile, | open | wide | the | windows | at night.",
        "Wednesday, then. In the meantime, keep the windows open at night.", { flags: { 0: F_EL_DAY } }),
    ],
    final_partial: [t("Y | por favor, | no toque | el | aparato.", "And | please, | don't touch | the | unit.", "And please, don't touch the unit.")],
    bye_back: [
      t("¡Hasta luego!", "See you later!", "Bye now!"),
      t("¡Nos vemos | en | dos | semanas!", "See you | in | two | weeks!", "See you in two weeks!"),
    ],
    walkaway: [t("Bueno... | ¡llámeme | si | empeora!", "Okay... | call me | if | it gets worse!", "Okay… call me if it gets worse!")],

    // --- small reactions -----------------------------------------------------------------
    cold_react_outside: [t("¿Más | calor | que | afuera? | Ahora sí | está | exagerando.", "More | heat | than | outside? | Now | you are | exaggerating.", "Hotter than outside? Now you're exaggerating.")],
    cold_react: [
      t("Uf. | Bueno, | ya | me imagino.", "Phew. | Okay, | now | I can imagine.", "Ugh. Okay, I get the picture."),
      t("Uy. | Bueno, | ya | entendí.", "Ouch. | Okay, | now | I get it.", "Ouch. Okay, I hear you."),
    ],
    cat_react: [t("¿Su | gato? | Gato | listo.", "Your | cat? | Cat | smart.", "Your cat? Smart cat.")],
    heater_react: [
      t("Bien | pensado. | Y | abra | las | ventanas | en la noche, | que | entra | el | aire | del | mar.", "Well | thought. | And | open | the | windows | at night, | since | comes in | the | air | from the | sea.",
        "Smart. And open the windows at night: you get the sea breeze."),
    ],
    ack: [t("Bueno.", "Okay.", "Okay."), t("Claro.", "Sure.", "Sure.")],
  },

  domains: { rent: () => [RENT] },

  hints: {
    greet: {
      lt: "Say hello and who you are",
      items: [
        { id: "its_me", s: t("Don | Ernesto, | soy | yo, | {m:el|f:la} | de | arriba.", "Don | Ernesto, | it's | me, | the one | from | upstairs.", "Don Ernesto, it's me, from upstairs.",
          { flags: { 2: "soy yo: Spanish says “I am me”; English says “it's me”." } }) },
        { id: "hi_patel", s: t("¡Buenos días, | Don | Ernesto!", "Good morning, | Don | Ernesto!", "Good morning, Don Ernesto!") },
        { id: "sorry_bother", s: t("Perdón | que | lo | moleste, | pero | es | importante.", "Sorry | that | you | I bother, | but | it's | important.", "Sorry to bother you, but it's important.",
          { flags: { 2: "lo: “you” (usted) as the object.", 3: "moleste: the subjunctive after perdón que." } }) },
        { id: "minute", s: t("¿Tiene | un | minuto?", "Do you have | a | minute?", "Do you have a minute?") },
      ],
    },
    problem: {
      lt: "Explain what's wrong",
      items: [
        { id: "song_broken", s: t("El | aire | no enfría | desde hace | una | semana.", "The | AC | doesn't cool | for | a | week.", "The AC hasn't been cooling for a week.",
          { flags: { 3: "desde hace + a length of time, with the present: it started then and still goes on." } }) },
        { id: "heat_not_working", s: t("El | aire | acondicionado | no funciona.", "The | air | conditioning | doesn't work.", "The AC isn't working.") },
        { id: "radiator_cold", s: t("El | minisplit | solo | echa | aire | caliente.", "The | minisplit | only | blows | air | hot.", "The AC only blows warm air.",
          { flags: { 1: F_MINISPLIT }, neutral: t("El | aire | acondicionado | solo | echa | aire | caliente.", "The | air | conditioning | only | blows | air | hot.", "The AC only blows warm air.") }) },
        { id: "cold_apt", s: t("Hace | un | calor | horrible | en | mi | casa.", "It makes | a | heat | horrible | in | my | home.", "It's horribly hot in my place.",
          { flags: { 0: "hace + a weather noun: it's (hot, cold)." } }) },
        { id: "kitchen_colder", s: t("Hace | más | calor | adentro | que | afuera.", "It makes | more | heat | inside | than | outside.", "It's hotter inside than outside.") },
        { id: "sleep_coat", s: t("No puedo | dormir | del | calor.", "I can't | sleep | from the | heat.", "I can't sleep, it's so hot.") },
      ],
    },
    thermostat: {
      lt: "Answer about the remote",
      items: [
        { id: "checked_twice", s: t("Sí, | ya | lo | revisé | dos | veces.", "Yes, | already | it | I checked | two | times.", "Yes, I checked it twice.") },
        { id: "not_thermostat", s: t("No es | el | control.", "It isn't | the | remote.", "It's not the remote.") },
        { id: "tried_everything", s: t("Ya | probé | todo.", "Already | I tried | everything.", "I've tried everything.") },
      ],
    },
    duration: {
      lt: "Say how long it's been going on",
      items: [
        { id: "song_broken", s: t("El | aire | no enfría | desde hace | una | semana.", "The | AC | doesn't cool | for | a | week.", "The AC hasn't been cooling for a week.",
          { flags: { 3: "desde hace + a length of time, with the present: it started then and still goes on." } }) },
        { id: "since_last", s: t("Desde | el | miércoles | pasado.", "Since | — | Wednesday | last.", "Since last Wednesday.", { flags: { 1: F_EL_DAY } }) },
        { id: "a_week", s: t("Ya | lleva | una | semana.", "Already | it's been | a | week.", "It's been a week now.") },
        { id: "called_every_day", s: t("Le | llamé | todos | los | días.", "(To) you | I called | all | the | days.", "I called you every day.", { flags: { 0: F_LE } }) },
        { id: "left_voicemail", s: t("Le | dejé | tres | mensajes.", "(For) you | I left | three | messages.", "I left you three messages.", { flags: { 0: F_LE } }) },
      ],
    },
    dodge: {
      lt: "Calmly but firmly say it's the landlord's job",
      items: [
        { id: "your_resp", s: t("Arreglarlo | le toca | a | usted.", "Fixing it | falls | to | you.", "Fixing it is your job.", { flags: { 1: "le toca (a alguien): it's someone's turn or job." } }) },
        { id: "afraid_resp", s: t("Me temo | que | es | su | responsabilidad.", "I'm afraid | that | it's | your | responsibility.", "I'm afraid it's your responsibility."),
          note: "Me temo que…: polite but firm." },
        { id: "contract", s: t("Según | el | contrato, | las | reparaciones | le tocan | a | usted.", "According to | the | lease, | the | repairs | fall | to | you.",
          "According to the lease, repairs are your job.", { flags: { 3: "las: Spanish uses the article; English says just “repairs”." } }), note: "El contrato (de arrendamiento): the lease." },
        { id: "heat_included", s: t("El | aire | acondicionado | está | incluido | en | la | renta.", "The | air | conditioning | is | included | in | the | rent.", "The AC is included in the rent.") },
        { id: "been_patient", s: t("He | tenido | paciencia, | pero | la | paciencia | no me refresca.", "I've | had | patience, | but | — | patience | doesn't cool me down.",
          "I've been patient, but patience doesn't keep me cool.", { flags: { 4: F_LA_GEN } }) },
        { id: "please_fix", s: t("Usted | es | el | dueño. | Arréglelo, | por favor.", "You | are | the | owner. | Fix it, | please.", "You're the landlord. Please fix it.") },
        { id: "send_someone", s: t("¿Puede | mandar | a | alguien, | por favor?", "Can you | send | — | someone, | please?", "Could you send someone, please?", { flags: { 2: F_A } }) },
      ],
    },
    offer: {
      lt: "Politely turn down the offer",
      items: [
        { id: "not_agreed", s: t("Eso | no es | lo que | acordamos.", "That | isn't | what | we agreed.", "That's not what we agreed.") },
        { id: "not_plumber", s: t("Yo | no soy | {m:técnico.|f:técnica.}", "I | am not | a repairman.", "I'm not a repairman.") },
        { id: "no_thanks_pro", s: t("No, | gracias. | Mande | a | un | técnico, | por favor.", "No, | thanks. | Send | — | a | repairman, | please.", "No, thanks. Please send a professional.",
          { flags: { 3: F_A } }) },
        { id: "rather_not", s: t("Prefiero | no | tocarlo.", "I'd rather | not | touch it.", "I'd rather not touch it.") },
        { id: "your_resp", s: t("Arreglarlo | le toca | a | usted.", "Fixing it | falls | to | you.", "Fixing it is your job.", { flags: { 1: "le toca (a alguien): it's someone's turn or job." } }) },
      ],
    },
    date_when: {
      lt: "Ask when someone can come",
      items: [
        { id: "when_come_out", s: t("¿Cuándo | puede | venir | alguien?", "When | can | come | someone?", "When can someone come out?") },
        { id: "sooner", s: t("¿Puede | venir | antes?", "Can he | come | sooner?", "Could he come sooner?") },
      ],
    },
    date_sooner: {
      lt: "Ask for someone to come sooner",
      items: [
        { id: "too_late", s: t("La | próxima | semana | es | muy | tarde.", "— | Next | week | is | too | late.", "Next week is too late.", { flags: { 0: "la: the article before próxima semana has no English word." } }) },
        { id: "sooner", s: t("¿Puede | venir | antes?", "Can he | come | sooner?", "Could he come sooner?") },
        { id: "before_weekend", s: t("Antes | del | fin de semana, | por favor.", "Before | the | weekend, | please.", "Before the weekend, please.", { flags: { 1: "del = de + el: antes de = before." } }) },
      ],
    },
    date_ok: {
      lt: "Agree on a day",
      items: [
        { id: "friday_works", s: t("El | viernes | en la mañana | me queda | bien.", "— | Friday | in the morning | suits me | well.", "Friday morning works for me.", { flags: { 0: F_EL_DAY } }) },
        { id: "works_me", s: t("Me parece | bien.", "It seems to me | good.", "That works for me.") },
        { id: "saturday_better", s: t("El | sábado | sería | mejor.", "— | Saturday | would be | better.", "Saturday would be better.", { flags: { 0: F_EL_DAY } }) },
      ],
    },
    home: {
      lt: "Say whether you'll be home",
      items: [
        { id: "ill_be_home", s: t("Sí, | voy | a | estar | en casa.", "Yes, | I'm going | to | be | at home.", "Yes, I'll be home.") },
        { id: "key_with_rita", s: t("Le | puedo | dejar | una | llave | a | Doña | Lupita.", "(With) her | I can | leave | a | key | with | Doña | Lupita.", "I can leave a key with Doña Lupita.",
          { flags: { 0: "le points ahead to a Doña Lupita: Spanish doubles the person." } }) },
        { id: "at_work", s: t("No, | voy | a | estar | en | el | trabajo.", "No, | I'm going | to | be | at | — | work.", "No, I'll be at work.", { flags: { 5: "el: Spanish uses the article; English says “at work”." } }) },
      ],
    },
    wrap: {
      lt: "Ask for it in writing",
      items: [
        { id: "email_please", s: t("¿Me lo | puede | mandar | por | correo?", "It to me | can you | send | by | email?", "Could you email that to me?") },
        { id: "in_writing", s: t("¿Me lo | puede | poner | por escrito?", "It to me | can you | put | in writing?", "Could I have that in writing?") },
        { id: "text_me", s: t("¿Me | manda | un | mensaje | con | la | fecha?", "(To) me | you send | a | message | with | the | date?", "Could you text me the date?") },
      ],
    },
    done: {
      lt: "Say that's all",
      items: [
        { id: "thats_all", s: t("No, | es | todo, | gracias.", "No, | it's | all, | thanks.", "No, that's all, thanks.") },
        { id: "good_trip", s: t("Gracias, | Don | Ernesto. | ¡Buen | viaje!", "Thanks, | Don | Ernesto. | Good | trip!", "Thanks, Don Ernesto. Have a good trip!") },
      ],
    },
    rent: {
      lt: "Pay the rent and ask for a receipt",
      items: [
        { id: "here_check", s: t("Claro. | Aquí tiene, | en efectivo.", "Sure. | Here you go, | in cash.", "Sure. Here you go, in cash.") },
        { id: "need_receipt", s: t("Voy | a | necesitar | un | recibo.", "I'm going | to | need | a | receipt.", "I'll need a receipt.") },
        { id: "receipt_please", s: t("¿Me | da | un | recibo, | por favor?", "(To) me | you give | a | receipt, | please?", "Could I get a receipt, please?") },
        // "mañana", not "el primero": this month's rent is due in the first five days (s81), so the first would be late
        { id: "pay_online", s: t("Se la | transfiero | mañana.", "It to you | I'll transfer | tomorrow.", "I'll send it by bank transfer tomorrow.",
          { flags: { 0: "se la: la is the rent (la renta); le becomes se before la." } }) },
      ],
    },
    bye: {
      lt: "Thank him and say goodbye",
      items: [
        { id: "good_trip", s: t("Gracias, | Don | Ernesto. | ¡Buen | viaje!", "Thanks, | Don | Ernesto. | Good | trip!", "Thanks, Don Ernesto. Have a good trip!") },
        { id: "enjoy_florida", s: t("¡Que | disfrute | San Cristóbal!", "May | you enjoy | San Cristóbal!", "Enjoy San Cristóbal!", { flags: { 0: "que + the subjunctive: a wish." } }) },
      ],
    },
    rita: {
      lt: "Thank Doña Lupita",
      items: [
        { id: "thanks_rita", s: t("¡Gracias, | Doña | Lupita!", "Thanks, | Doña | Lupita!", "Thanks, Doña Lupita!") },
        { id: "tech_number_q", s: t("¿Me | pasa | el | número | del | técnico?", "(To) me | you pass | the | number | of the | repairman?", "Could you give me the repairman's number?") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "me voy": { reason: "grammatical_fusion", split: "me → myself + voy → I go; irse = to leave, I'm off.", minimal: "Pronoun and verb." },
    "san cristóbal": { reason: "lexical_expression", split: "san → saint + cristóbal → Christopher; one place name (San Cristóbal de las Casas).", minimal: "A two-word name." },
    "copo de nieve": { reason: "lexical_expression", split: "copo → flake + de → of + nieve → snow gives “flake of snow”; = snowflake.", minimal: "Three words, one noun." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → it + menos → less is a word salad; = at least.", minimal: "Three words." },
    "de veras": { reason: "lexical_expression", split: "de → of + veras → truths misreads the adverb: really.", minimal: "Two words." },
    "me meta": { reason: "grammatical_fusion", split: "me → myself + meta → I put; meterse = to butt in.", minimal: "Pronoun and verb." },
    "para eso estamos": { reason: "lexical_expression", split: "para → for + eso → that + estamos → we are is a word-for-word reading of a set reply: that's what we're here for.", minimal: "The whole formula." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same misreads the adverb: right now.", minimal: "Two words." },
    "es broma": { reason: "lexical_expression", split: "es → it is + broma → joke; the set reply = just kidding.", minimal: "Two words." },
    "ya sé": { reason: "lexical_expression", split: "ya → already + sé → I know; the reply = I know (I'm aware).", minimal: "Two words." },
    "me la": { reason: "grammatical_fusion", split: "Two object pronouns before the verb are glossed together.", minimal: "Two words." },
    "de memoria": { reason: "lexical_expression", split: "de → of + memoria → memory; = by heart.", minimal: "Two words." },
    "para tanto": { reason: "lexical_expression", split: "para → for + tanto → so much; no es para tanto = it's not that big a deal.", minimal: "Two words." },
    "valía la pena": { reason: "lexical_expression", split: "valía → it was worth + la → the + pena → sorrow misreads the idiom: it was worth it.", minimal: "Three words, one idiom." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → made; the set phrase = deal.", minimal: "Two words." },
    "vamos por partes": { reason: "lexical_expression", split: "vamos → we go + por → by + partes → parts; the saying = one thing at a time.", minimal: "The whole saying." },
    "en la mañana": { reason: "lexical_expression", split: "en → in + la → the + mañana → morning; one time phrase = in the morning.", minimal: "Three words." },
    "en la noche": { reason: "lexical_expression", split: "en → in + la → the + noche → night; one time phrase = at night.", minimal: "Three words." },
    "por escrito": { reason: "lexical_expression", split: "por → by + escrito → written; = in writing.", minimal: "Two words." },
    "en casa": { reason: "lexical_expression", split: "en → in + casa → house; the set phrase = at home.", minimal: "Two words." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways; = anyway.", minimal: "Three words." },
    "me tengo que ir": { reason: "grammatical_fusion", split: "me → myself + tengo → I have + que → that + ir → go; irse with tener que = I have to go.", minimal: "The pronoun belongs to ir." },
    "ya que": { reason: "lexical_expression", split: "ya → already + que → that misreads the conjunction: since.", minimal: "Two words." },
    "sí que": { reason: "lexical_expression", split: "sí → yes + que → that misreads the emphasis: really.", minimal: "Two words." },
    "ahora sí": { reason: "lexical_expression", split: "ahora → now + sí → yes; the set phrase = now really (this time for real).", minimal: "Two words." },
    "me imagino": { reason: "grammatical_fusion", split: "me → myself + imagino → I imagine; imaginarse = to picture it: I can imagine.", minimal: "Pronoun and verb." },
    "desde hace": { reason: "lexical_expression", split: "desde → since + hace → it makes is false; before a length of time = for.", minimal: "Two words; the length stays separate." },
    "me temo": { reason: "grammatical_fusion", split: "me → myself + temo → I fear; temerse = I'm afraid (polite).", minimal: "Pronoun and verb." },
    "le tocan": { reason: "grammatical_fusion", split: "le → to you + tocan → they touch is false; tocarle a alguien = to fall to someone (be their job).", minimal: "Pronoun and verb." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week; = weekend.", minimal: "Three words, one noun." },
    "de al lado": { reason: "lexical_expression", split: "de → of + al → to the + lado → side; = next door.", minimal: "Three words." },
    "se la": { reason: "grammatical_fusion", split: "Two object pronouns before the verb are glossed together (le → se before la).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "problem", lt: "Explain what's wrong" },
    { step: "duration", lt: "Say how long it's been going on" },
    { step: "dodge", lt: "Remind him that repairs are the landlord's job" },
    // hidden when the learner took the offer (the partial ending)
    { lt: "Politely turn down fixing it yourself", optional: true, when: (c) => c.s.offer !== "accepted", done: (c) => c.s.offer === "refused" },
    { step: "date", lt: "Agree on a day for the repair" },
    // extras: shown once done
    { lt: "Ask for it in writing", optional: true, when: () => false, done: (c) => !!c.s.writing },
    { lt: "Pay the rent and ask for a receipt", optional: true, when: () => false, done: (c) => !!c.s.receipt },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem,
      ask: (c) => { if (!c.s.whoSaid) { c.s.whoSaid = true; P(c, "greet_who"); } else P(c, "problem_reask"); },
      expects: ["heat_broken", "cold_detail", "space_heater", "greet_id", "called_before", "have_problem", "heater_wrong", "heater_ok"],
      suggest: [{ lt: "Explain what isn't working", hint: "problem" }, { lt: "Say hello and who you are", hint: "greet" }],
      yes: (c) => { P(c, "problem_what"); c.hold(); },
      no: (c) => { P(c, "no_then_what"); c.hold(); },
      help: (c) => { P(c, "problem_reask"); } },
    // asked once; dropped if the learner moves on
    { id: "thermostat", when: (c) => !!c.s.problem && !!c.s.thermoQ, done: (c) => !!c.s.thermoAsked || !!c.s.thermoDone,
      ask: (c) => { c.s.thermoAsked = true; P(c, "thermostat_q"); },
      expects: ["thermo_yes", "thermo_no", "heat_broken"],
      suggest: [{ lt: "Answer about the remote", hint: "thermostat" }],
      yes: (c) => { if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_ok"); } },
      no: (c) => { if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_no"); P(c, "thermostat_no2"); } },
      help: (c) => { c.s.thermoDone = true; P(c, "thermostat_no"); P(c, "thermostat_no2"); } },
    { id: "duration", when: (c) => !!c.s.problem, done: (c) => !!c.s.dur,
      ask: (c) => { if (!c.s.durAsked) { c.s.durAsked = true; P(c, "duration_ask"); } else P(c, "since_when"); },
      expects: ["heat_duration", "dur_ctx", "called_before", "patient", "heat_broken"],
      suggest: [{ lt: "Say how long it's been going on", hint: "duration" }],
      help: (c) => { P(c, "dur_unknown"); setDur(c, 3, false); } },
    // the twist (once)
    { id: "rita", when: (c) => !!c.s.dur && c.s.twist === "rita", done: (c) => !!c.s.ritaShown, ask: ritaTwist },
    { id: "dodge", when: (c) => !!c.s.dur, done: (c) => !!c.s.resp, ask: askDodge,
      expects: ["responsibility", "request_fix", "patient", "threat", "withhold", "cold_detail", "ask_discount", "you_kidding", "ask_when", "resp_neg"],
      suggest: [{ lt: "Remind him whose job it is (the lease)", hint: "dodge" }],
      help: (c) => { dodgeHelp(c); } },
    { id: "offer", when: (c) => !!c.s.resp, done: (c) => !!c.s.offer, ask: askOffer,
      expects: ["refuse_offer", "responsibility", "accept_offer", "request_fix", "walk_away", "ask_when", "you_kidding", "threat", "withhold", "offer_price_ctx", "think_ctx"],
      suggest: [{ lt: "Politely turn down the offer", hint: "offer" }],
      // (once the offer is settled, a yes/no answers the day on the table)
      yes: (c) => { if (c.s.offer) { if (!c.s.date) dateYes(c); return; } if (politeClosing(c)) { P(c, "offer_reask"); c.hold(); return; } acceptOffer(c); },
      no: (c) => { if (c.s.offer) { if (!c.s.date) dateNo(c); return; } if (/^\W*(no|nel|nop)\W*$/i.test(heard(c))) c.tip(TIPS.bare_no); refuse(c); },
      help: (c) => { P(c, "offer_reask"); } },
    { id: "date", when: (c) => !!c.s.offer, done: (c) => !!c.s.date, ask: askDate,
      expects: ["ask_when", "too_late", "propose_day", "day_ctx", "accept_date", "day_no", "in_writing", "patient", "afternoon_ctx", "think_ctx"],
      suggest: (c) => c.s.level === 0
        ? [{ lt: "Ask when someone can come", hint: "date_when" }, { lt: "Ask for someone to come sooner", hint: "date_sooner" }]
        : c.s.level === 1
          ? [{ lt: "Ask for someone to come sooner", hint: "date_sooner" }, { lt: "Agree on a day", hint: "date_ok" }]
          : [{ lt: "Agree on a day", hint: "date_ok" }, { lt: "Ask for it in writing", hint: "wrap" }],
      yes: (c) => { dateYes(c); },
      no: (c) => { dateNo(c); },
      help: (c) => { if (c.s.level === 0) offerWednesday(c); else askDate(c); c.hold(); } },
    // asked once (an optional question)
    { id: "home", when: (c) => !!c.s.date && !!c.s.homeQ, done: (c) => !!c.s.homeAsked || !!c.s.homeDone,
      ask: (c) => {
        c.s.homeAsked = true;
        P(c, "home_q");
        c.expect({ id: "home", optional: true, expects: ["home_yes", "leave_key", "not_home", "need_home"], hints: ["home"],
          suggest: [{ lt: "Say whether you'll be home", hint: "home" }],
          on: {
            home_yes: (cc) => { cc.s.homeDone = true; P(cc, "home_ok"); },
            leave_key: (cc) => { cc.s.homeDone = true; P(cc, "key_rita"); },
            not_home: (cc) => { cc.s.homeDone = true; P(cc, "gus_key"); },
            // "¿Tengo que estar en casa?" / "No sé.": Chucho has a key
            need_home: (cc) => { cc.s.homeDone = true; P(cc, "gus_key"); },
            g_dontknow: (cc) => { cc.s.homeDone = true; P(cc, "gus_key"); },
          },
          yes: (cc) => { cc.s.homeDone = true; P(cc, "home_ok"); },
          // "Eso es todo." answers "¿Algo más?" before he asks it: that's all too
          no: (cc) => { cc.s.homeDone = true; if (/\b(es todo|seria todo|nada mas)\b/.test(heard(cc))) cc.s.wrapDone = true; P(cc, "gus_key"); } });
      } },
    { id: "wrap", when: (c) => !!c.s.date, done: (c) => !!c.s.wrapDone, ask: (c) => { P(c, "anything_else"); },
      expects: ["in_writing", "no_more", "ask_discount", "trip_wish", "pay_rent", "g_thanks", "more_ctx"],
      suggest: [{ lt: "Ask for it in writing", hint: "wrap" }, { lt: "Say that's all", hint: "done" }],
      yes: (c) => { P(c, "g_yes_what"); c.hold(); },
      no: (c) => { c.s.wrapDone = true; },
      help: (c) => { c.s.wrapDone = true; c.ask("rent"); } },
    { id: "rent", when: (c) => !!c.s.wrapDone, done: (c) => !!c.s.rentDone,
      ask: (c) => { if (!c.s.rentAsked) { c.s.rentAsked = true; P(c, "rent_twist"); P(c, "rent_amount", { rent: RENT }); } else P(c, "rent_reask"); },
      expects: ["pay_rent", "pay_ctx", "ask_receipt", "pay_later", "paid_already", "withhold", "rent_q_ctx"],
      suggest: [{ lt: "Pay the rent and ask for a receipt", hint: "rent" }],
      yes: (c) => { if (politeClosing(c)) { P(c, "rent_reask"); c.hold(); return; } payRent(c); },
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
      expectAcGuess(c);
      return;
    }
    P(c, "greet_open");
    c.hold();
  },

  handlers: {
    // --- greeting ---
    greet_id(c) {
      if (/^\W*(hola|buenos dias|buenas tardes|buenas)\b/.test(heard(c)) && !c.s.__greetedBack) { c.s.__greetedBack = true; P(c, "g_hello"); }
      if (!c.s.problem && !c.s.minuteSaid && /\b(minuto|momento|segundo|minutito|hablar)\b/.test(heard(c))) { c.s.minuteSaid = true; P(c, "one_minute"); }
    },

    // --- the problem ---
    have_problem(c) {
      if (c.s.problem) { P(c, "i_know_problem"); return; }
      P(c, "problem_what"); c.hold();
    },
    heat_broken(c, slots, seg) {
      const first = !c.s.problem;
      c.s.problem = true;
      const d = daysOf(slots, seg.tags, heard(c));
      if (d && !c.s.dur) { setDur(c, d); return; }
      if (first) { if (c.chance(0.5)) P(c, "oh_no"); return; }
      P(c, "i_know");
    },
    cold_detail(c, _slots, seg) {
      // "¿El miércoles? ¡Hace un calor horrible!": the day's answer is the reaction
      if (turn(c).dateNo) { c.s.problem = true; return; }
      if (seg.tags.includes("cat")) P(c, "cat_react");
      else if (/mas calor .*que afuera|mas caliente.* que afuera/.test(heard(c)) && !c.s.colderSaid) { c.s.colderSaid = true; P(c, "cold_react_outside"); }
      else P(c, "cold_react");
      c.s.problem = true;
    },
    // "El calentador no sirve": the AC is this scene's problem. First time, "¿No será el aire?" (the guess question);
    // again, "El calentador funciona bien, se lo aseguro." (and the question again); once the AC is known, one thing at a time
    heater_wrong(c) {
      if (c.s.problem) { P(c, "one_thing"); return; }
      if (!c.s.calentador) { c.s.calentador = true; P(c, "heater_redirect"); expectAcGuess(c); return; }
      // said once; insisted on again, only the question ("El aire, ¿verdad?"), never the same pair twice in a row
      if (!c.s.heaterAgain) { c.s.heaterAgain = true; P(c, "heater_again"); }
      if (!(c as ConvCtx).conv?.pending) { expectAcGuess(c); P(c, "guess_reask"); }
    },
    // "El calentador sí funciona.": nothing to do with it (the open question comes again)
    heater_ok(c) { P(c, "ack"); },
    space_heater(c) {
      c.s.problem = true;
      if (!c.s.heaterSaid) { c.s.heaterSaid = true; P(c, "heater_react"); } else P(c, "ack");
    },

    // --- how long ---
    heat_duration(c, slots, seg) {
      if (c.s.dur) { P(c, "i_know"); return; }
      c.s.problem = true;
      setDur(c, daysOf(slots, seg.tags, heard(c)) ?? 7);
    },
    dur_ctx(c, slots, seg) { landlord.handlers.heat_duration(c, slots, seg); },
    called_before(c, slots, seg) {
      c.s.called = true;
      if (!c.s.vmSaid) { c.s.vmSaid = true; P(c, "voicemail_react"); } else P(c, "i_know");
      const d = daysOf(slots, seg.tags, heard(c));
      if (d && !c.s.dur && c.s.problem) setDur(c, d, false);
    },

    // --- the remote ---
    thermo_yes(c) { c.s.thermoAsked = true; if (!c.s.thermoDone) { c.s.thermoDone = true; P(c, "thermostat_ok"); } },
    thermo_no(c) {
      c.s.thermoAsked = true;
      if (c.s.thermoDone) { P(c, "ack"); return; }
      c.s.thermoDone = true;
      const h = heard(c);
      // "¿Qué es modo frío?" / "No sé cómo funciona el control": what it is, and try it
      if (/\bque es\b|\bno se\b/.test(h)) { P(c, "thermostat_where"); P(c, "thermostat_no"); return; }
      if (/\b(que|cual|donde)\b/.test(h)) { P(c, "thermostat_where"); P(c, "thermostat_no2"); return; }
      P(c, "thermostat_no"); P(c, "thermostat_no2");
    },

    // --- whose job is it ---
    responsibility(c, _slots, seg) {
      const harsh = seg.tags.includes("harsh");
      if (harsh) { P(c, "blunt_react"); rude(c); }
      if (!c.s.problem) {
        if (mentionsAc(heard(c))) c.s.problem = true;
        else { if (!harsh) P(c, "resp_what"); return; }
      }
      if (offerOpen(c)) { if (!harsh) c.s.resp = true; refuse(c); return; }
      if (c.s.resp === true || c.s.date) { if (!harsh) P(c, "i_know"); return; }
      c.s.resp = harsh ? (c.s.resp || "blunt") : true;
      if (harsh) return;
      const h = heard(c);
      if (/\bincluid|\bincluye\b|\bviene con\b|\bcon aire\b|\bcontrato\b|\bclausula\b/.test(h)) c.s.lease = true;
      if (/\bincluid|\bincluye\b|\bviene con\b|\bcon aire\b/.test(h)) P(c, "resp_heat");
      else if (/\bclausula\b/.test(h) || (/\bcontrato\b/.test(h) && c.chance(0.5))) P(c, "resp_lease");
      else P(c, "resp_react");
    },
    resp_neg(c) {
      if (c.s.resp || c.s.date) { P(c, "ack"); return; }
      P(c, "resp_neg_react");
      c.hold();
    },
    more_ctx(c) { P(c, "g_yes_what"); c.hold(); },
    // "¿Cuánto cuesta arreglarlo?" / "¿Cuánto me paga?" at the offer: his half, no figure, and the offer again
    offer_price_ctx(c) { if (!offerOpen(c)) { P(c, "ack"); return; } P(c, "offer_price"); c.hold(); },
    // "¿Puede venir en la tarde?": Chucho only does mornings
    afternoon_ctx(c) {
      P(c, "mornings_only");
      if (c.s.date) { P(c, "window"); return; }
      askDate(c); c.hold();
    },
    rent_q_ctx(c) {
      if (c.s.rentDone) { P(c, "ack"); return; }
      P(c, c.s.rentAsked ? "rent_amount_again" : "rent_amount", { rent: RENT });
      c.hold();
    },
    ac_ctx(c, slots, seg) { landlord.handlers.heat_broken(c, slots, seg); },
    request_fix(c, slots, seg) {
      const harsh = seg.tags.includes("harsh") || (seg.tags.includes("imp") && !/\bpor favor\b|\bporfa\b/.test(heard(c)));
      if (harsh) {
        P(c, "blunt_react"); rude(c);
        if (!seg.tags.some((x) => x.startsWith("tip:"))) c.tip(TIPS.too_blunt);
      }
      if (!c.s.problem) {
        if (mentionsAc(heard(c))) c.s.problem = true;
        else { if (!harsh) P(c, "fix_what"); return; }
      }
      if (offerOpen(c)) { refuse(c); return; }
      // a day is being agreed: "¿Puede mandar a alguien?" asks when
      if (c.s.offer && !c.s.date) { landlord.handlers.ask_when(c, slots, seg); return; }
      if (c.s.resp || c.s.date) { if (!harsh) P(c, "i_know"); return; }
      c.s.resp = harsh ? "blunt" : "soft";
      if (!harsh) P(c, c.s.dur ? "resp_soft" : "sure_sure");
    },
    patient(c, slots, seg) {
      if (c.s.offer && !c.s.date && /\besperar\b/.test(heard(c))) { landlord.handlers.too_late(c, slots, seg); return; }
      if (!c.s.dur && c.s.problem) {
        const d = daysOf(slots, seg.tags, heard(c));
        if (d) { setDur(c, d); return; }
      }
      if (!c.s.patienceSaid) { c.s.patienceSaid = true; P(c, "patience_react"); } else P(c, "i_know");
    },
    you_kidding(c) {
      // "¿Está bromeando?" to "Arréglelo usted": no to the offer
      if (offerOpen(c)) { refuse(c); return; }
      // "¿El miércoles? ¿Es broma?": no to the day on the table
      if (c.s.offer && !c.s.date) { dateNoOnce(c); return; }
      P(c, c.s.sweater && !c.s.ritaShown ? "sorry_joke" : "kidding");
    },
    threat(c) { P(c, "not_enemy"); rude(c); },
    withhold(c) {
      // "Este mes no le pago la renta." at "¿Algo más?": the AC is settled, so it's about the rent now
      if (c.s.date && !c.s.rentAsked && !c.s.rentDone) rentNow(c);
      if (c.s.rentAsked && !c.s.rentDone) {
        c.s.withheld = (c.s.withheld || 0) + 1;
        if (c.s.withheld >= 2) { c.s.rentDone = true; c.s.rentFight = true; P(c, "walkaway_rent"); return; }
        P(c, "rent_is_rent");
        return;
      }
      P(c, "rent_threat_react"); rude(c);
    },

    // --- the offer ---
    refuse_offer(c, _slots, seg) {
      if (offerOpen(c)) { refuse(c); return; }
      // "¡Ni loca!" while a day is being agreed: no to the day on the table
      if (c.s.offer && !c.s.date && seg.tags.includes("noway")) { dateNoOnce(c); return; }
      // "Está bien, que venga Chucho." while a day is on the table: Chucho is coming anyway, so the yes is for the day
      if (c.s.offer && !c.s.date && seg.tags.includes("send")) {
        if (YES_START.test(heard(c))) { dateYes(c); return; }
        if (c.s.offer !== "accepted") { P(c, "sure_sure"); askDate(c); c.hold(); return; }
      }
      // a change of mind after "Bueno, lo intento": Chucho comes anyway
      if (c.s.offer === "accepted") { c.s.offer = "refused"; P(c, "ack"); return; }
      if (!c.s.resp && c.s.dur) { landlord.handlers.request_fix(c, {}, { intent: "request_fix", slots: {}, tags: [] }); return; }
      P(c, c.s.offer ? "i_know" : "ack");
    },
    accept_offer(c) { if (offerOpen(c)) { acceptOffer(c); return; } P(c, "ack"); },
    walk_away(c, _slots, seg) {
      // "Olvídelo." to "Arréglelo usted": no to the offer (curt)
      if (offerOpen(c) && seg.tags.includes("forget")) { c.tip(TIPS.bare_no); refuse(c); return; }
      // "No importa, el miércoles está bien.": the rest of the turn answers; nobody is leaving
      if (/\b(esta bien|me parece|me queda|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(heard(c))) return;
      leave(c);
    },

    // --- the date ---
    ask_when(c, slots, seg) {
      // the day is agreed: "¿A qué hora viene Chucho?" gets the window, "¿Cuándo viene?" the day and the window
      if (c.s.date) { P(c, /\bhora\b/.test(heard(c)) ? "window" : "date_confirm_" + c.s.date); return; }
      if (offerOpen(c)) { c.s.level = Math.max(c.s.level, 1); refuse(c); return; }
      if (!c.s.offer) {
        // at the dodge: a plain request ("¿Cuándo puede venir alguien?")
        if (c.s.dur && !c.s.resp) { landlord.handlers.request_fix(c, slots, { ...seg, tags: [] }); return; }
        P(c, "one_thing");
        return;
      }
      if (c.s.level === 0) { offerWednesday(c); c.hold(); return; }
      P(c, "window"); askDate(c); c.hold();
    },
    too_late(c) {
      // "Es muy tarde. ¿Puede venir antes?": one reaction
      if (turn(c).tooLate || turn(c).dateNo) { c.hold(); return; }
      turn(c).tooLate = true;
      if (c.s.date) {
        if (c.s.date === "wednesday") { c.s.date = "friday"; c.remember({ acFixed: "friday" }); P(c, "sooner_react"); P(c, "window"); return; }
        fridayBest(c);
        return;
      }
      if (offerOpen(c)) { refuse(c); offerFriday(c); c.hold(); return; }
      if (!c.s.offer) { P(c, "one_thing"); return; }
      turn(c).dateNo = true;
      if (c.s.level < 2) offerFriday(c); else fridayBest(c);
      c.hold();
    },
    propose_day(c, slots, seg) {
      if (c.s.date) { P(c, "ack"); return; }
      if (offerOpen(c)) refuse(c);
      if (!c.s.offer) { P(c, "one_thing"); return; }
      let day = pickDay(slots.day);
      if (seg?.tags?.includes("before")) day = DAY_BEFORE[day] ?? day;
      // "¿El miércoles? Ni loca." repeats the day on the table only to say no to it: never a yes
      if (refusedAfterDay(c)) {
        if (day === dayOnTable(c)) dateNoOnce(c);
        // "¿La próxima semana? Es muy tarde." before he named a day: he jumps to Friday
        else if (c.s.level === 0 && (day === "wednesday" || day === "next_week") && !turn(c).dateNo) { turn(c).dateNo = true; offerFriday(c); c.hold(); }
        else c.hold();
        return;
      }
      proposeDay(c, day);
      if (!c.s.date) c.hold();
    },
    day_ctx(c, slots) {
      // "¿El miércoles?" / "¿Este viernes?" echoing his own day: a question, answered, never a yes
      if (echoDay(c, pickDay(slots.day))) return;
      landlord.handlers.propose_day(c, slots, { intent: "propose_day", slots, tags: [] });
    },
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
      // the day on the table: one step sooner (or "Antes del viernes, imposible")
      if ((c.s.level === 1 && d === "wednesday") || (c.s.level === 2 && d === "friday")) { dateNo(c); return; }
      // the turn already said no to the day on the table ("El miércoles no me queda, ¿el sábado?")
      if (turn(c).dateNo) { c.hold(); return; }
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
    not_home(c) {
      if (c.s.date && !c.s.homeDone) { c.s.homeDone = true; P(c, "gus_key"); return; }
      // "¿Y si el miércoles no estoy?" while a day is worked out: the day's answer is the reply
      if (c.s.offer && !c.s.date) return;
      P(c, "ack");
    },

    // --- wrapping up ---
    no_more(c) { if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; } P(c, "ack"); },
    ask_discount(c) { if (c.s.date) P(c, "discount_react_" + c.s.date); else P(c, "discount_first"); },
    ask_trip(c) { P(c, "trip_info"); },

    // --- the rent ---
    pay_rent(c) { payRent(c); },
    pay_ctx(c) { payRent(c); },
    ask_receipt(c) {
      // at the rent: the money comes with the request
      if (c.s.rentAsked && !c.s.rentDone) { payRent(c); receiptBeat(c); return; }
      if (c.s.rentPaid || c.s.paidBefore) { receiptBeat(c); return; }
      P(c, "receipt_for_what");
    },
    pay_later(c) {
      if (c.s.rentDone) { P(c, "ack"); return; }
      // the rent waits for the AC, as "Aquí tiene la renta." does
      if (!c.s.rentAsked && !c.s.date) { P(c, "rent_first"); return; }
      if (c.s.date && !c.s.rentAsked) rentNow(c);
      c.s.rentDone = true; P(c, "rent_later_ok");
    },
    paid_already(c, slots, seg) {
      // "Ya pagué todo." while he dodges: the learner's side of the lease, not the rent
      if (!c.s.rentAsked && c.s.dur && !c.s.resp) { landlord.handlers.responsibility(c, slots, seg); return; }
      if (c.s.rentDone) { P(c, "ack"); return; }
      if (c.s.date && !c.s.rentAsked) rentNow(c);
      c.s.rentDone = true; c.s.paidBefore = true; P(c, "paid_already");
    },

    // --- Doña Lupita and goodbye ---
    thanks_rita(c) { if (c.s.ritaShown) ritaBye(c); else P(c, "ack"); },
    ask_tech(c, _slots, seg) { techNumber(c, seg.tags); },
    // "¿Quién paga la reparación?": while the offer is open, his half; once Chucho is coming, he pays; at the rent,
    // "¿Tengo que pagar algo?" (#me: nothing named) is the rent
    who_pays(c, _slots, seg) {
      if (c.s.rentAsked && !c.s.rentDone && seg.tags.includes("me")) { P(c, "rent_amount_again", { rent: RENT }); c.hold(); return; }
      if (offerOpen(c)) { P(c, "offer_price"); c.hold(); return; }
      if (!c.s.offer) { P(c, "one_thing"); return; }
      if (!c.s.payMineSaid) { c.s.payMineSaid = true; P(c, "pay_mine"); } else P(c, "sure_sure");
    },
    // "¿Tengo que estar en casa?" with no home question open: Chucho has a key
    need_home(c) {
      if (!c.s.offer) { P(c, "one_thing"); return; }
      if (!c.s.homeDone) { c.s.homeDone = true; P(c, "gus_key"); } else P(c, "ack");
    },
    // "Lo voy a pensar.": he's leaving, so the offer or the day again
    think_ctx(c) {
      if (offerOpen(c)) { P(c, "offer_reask"); c.hold(); return; }
      if (c.s.offer && !c.s.date) { askDate(c); c.hold(); return; }
      P(c, "ack");
    },
    trip_wish(c) {
      if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; }
      P(c, "trip_thanks");
    },
    g_thanks(c) {
      // "¡Gracias!" after the day is agreed: that's all (the rent comes next)
      if (c.s.date && !c.s.wrapDone) { c.s.wrapDone = true; return; }
      // "Gracias, ¡adiós!": the goodbye answers it
      if (/\b(adios|hasta luego|nos vemos|bye|chao)\b/.test(heard(c))) return;
      P(c, "g_welcome");
    },
    g_bye(c) { leave(c); },
    // "¿Me lo puede escribir?" once there is a day = in writing
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
    { say: "Don Ernesto, soy yo, el de arriba.", intent: "greet_id" },
    { say: "¡Buenos días, Don Ernesto!", intent: "greet_id" },
    { say: "Perdón que lo moleste, pero es importante.", intent: "greet_id" },
    { say: "¿Tiene un minuto?", intent: "greet_id" },
    { say: "Soy su inquilina del primer piso.", intent: "greet_id" },
    { say: "Tengo un problema.", intent: "have_problem", step: "problem" },
    // the problem
    { say: "El aire no enfría desde hace una semana.", intent: "heat_broken" },
    { say: "El aire acondicionado no funciona.", intent: "heat_broken", step: "problem" },
    { say: "El minisplit solo echa aire caliente.", intent: "heat_broken" },
    { say: "El clima no sirve.", intent: "heat_broken" },
    { say: "Se descompuso el aire.", intent: "heat_broken" },
    { say: "El aire no trabaja.", intent: "heat_broken" },
    { say: "No va el aire acondicionado.", intent: "heat_broken" },
    { say: "El aire no funciona por una semana.", intent: "heat_broken", not: ["heat_duration"] },
    { say: "Hace un calor horrible en mi casa.", intent: "cold_detail" },
    { say: "Hace más calor adentro que afuera.", intent: "cold_detail" },
    { say: "No puedo dormir del calor.", intent: "cold_detail" },
    { say: "Hace 34 grados en mi departamento.", intent: "cold_detail", slots: { number: 34 } },
    { say: "Compré un ventilador con mi dinero.", intent: "space_heater" },
    // meaning must not flip
    { say: "El aire ya funciona bien.", intent: "none" },
    { say: "El aire no está roto.", intent: "none" },
    { say: "No compré un ventilador.", intent: "none" },
    // how long
    { say: "Desde el lunes pasado.", intent: "heat_duration", step: "duration", slots: { day: "monday" } },
    { say: "Desde hace una semana.", intent: "heat_duration", step: "duration" },
    { say: "Una semana.", intent: "heat_duration", step: "duration" },
    { say: "Dos semanas.", intent: "heat_duration", step: "duration", slots: { number: 2 } },
    { say: "Ya lleva una semana.", intent: "heat_duration", step: "duration" },
    { say: "Hace ocho días.", intent: "heat_duration", step: "duration", slots: { number: 8 } },
    { say: "Se descompuso el lunes.", intent: "heat_duration", step: "duration" },
    { say: "El lunes.", intent: "dur_ctx", step: "duration", slots: { day: "monday" } },
    { say: "El lunes.", intent: "none" },
    { say: "Le llamé todos los días.", intent: "called_before" },
    { say: "Le dejé tres mensajes.", intent: "called_before" },
    { say: "Usted nunca contesta el teléfono.", intent: "called_before" },
    { say: "Te he llamado al móvil muchas veces.", intent: "called_before" },
    // the remote
    { say: "Sí, ya lo revisé dos veces.", intent: "thermo_yes", step: "thermostat" },
    { say: "No es el control.", intent: "thermo_yes", step: "thermostat" },
    { say: "Ya probé todo.", intent: "thermo_yes", step: "thermostat" },
    { say: "No lo revisé.", intent: "thermo_no", step: "thermostat", not: ["thermo_yes"] },
    { say: "¿Dónde está el control?", intent: "thermo_no", step: "thermostat" },
    // whose job is it
    { say: "Arreglarlo le toca a usted.", intent: "responsibility", step: "dodge" },
    { say: "Me temo que es su responsabilidad.", intent: "responsibility", step: "dodge" },
    { say: "Según el contrato, las reparaciones le tocan a usted.", intent: "responsibility", step: "dodge" },
    { say: "El aire acondicionado está incluido en la renta.", intent: "responsibility", step: "dodge" },
    { say: "Usted tiene que arreglarlo.", intent: "responsibility", step: "dodge" },
    { say: "No es su responsabilidad.", intent: "resp_neg", step: "dodge", not: ["responsibility"] },
    { say: "No está en el contrato.", intent: "resp_neg", step: "dodge", not: ["responsibility"] },
    { say: "¿Lo puede arreglar?", intent: "request_fix", step: "dodge", not: ["accept_offer"] },
    { say: "Estoy muy caliente.", intent: "cold_detail" },
    { say: "No está en frío.", intent: "thermo_no", step: "thermostat", not: ["thermo_yes"] },
    { say: "Usted es el dueño. Arréglelo, por favor.", intent: "request_fix", step: "dodge" },
    { say: "¿Puede arreglarlo, por favor?", intent: "request_fix", step: "dodge" },
    { say: "¿Puede mandar a alguien, por favor?", intent: "request_fix", step: "dodge" },
    { say: "¿Puedes arreglarlo?", intent: "request_fix", step: "dodge" },
    { say: "¡Arréglelo ya!", intent: "request_fix", step: "dodge" },
    { say: "He tenido paciencia, pero la paciencia no me refresca.", intent: "patient", step: "dodge" },
    { say: "¿Está bromeando?", intent: "you_kidding", step: "dodge" },
    { say: "Lo voy a demandar.", intent: "threat", step: "dodge" },
    { say: "No voy a pagar la renta hasta que lo arregle.", intent: "withhold", step: "dodge", not: ["pay_rent", "pay_later"] },
    // the offer
    { say: "Eso no es lo que acordamos.", intent: "refuse_offer", step: "offer" },
    { say: "Yo no soy técnico.", intent: "refuse_offer", step: "offer" },
    { say: "No soy fontanero.", intent: "refuse_offer", step: "offer" },
    { say: "No, gracias. Mande a un técnico, por favor.", intent: "refuse_offer", step: "offer" },
    { say: "Prefiero no tocarlo.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "No puedo arreglarlo yo.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "Bueno, lo intento.", intent: "accept_offer", step: "offer" },
    { say: "Yo lo puedo arreglar.", intent: "accept_offer", step: "offer" },
    { say: "Olvídelo.", intent: "walk_away", step: "offer" },
    // the date
    { say: "¿Cuándo puede venir alguien?", intent: "ask_when", step: "date" },
    { say: "La próxima semana es muy tarde.", intent: "too_late", step: "date" },
    { say: "¿Puede venir antes?", intent: "too_late", step: "date" },
    { say: "Antes del fin de semana, por favor.", intent: "too_late", step: "date" },
    { say: "¿Qué tal el viernes?", intent: "propose_day", step: "date", slots: { day: "friday" } },
    { say: "¿Puede venir mañana?", intent: "propose_day", step: "date", slots: { day: "tomorrow" } },
    { say: "El viernes en la mañana me queda bien.", intent: "accept_date", step: "date", slots: { day: "friday" } },
    { say: "El sábado está bien.", intent: "accept_date", step: "date", slots: { day: "saturday" } },
    { say: "El viernes.", intent: "day_ctx", step: "date", slots: { day: "friday" } },
    { say: "El viernes no me queda.", intent: "day_no", step: "date", not: ["accept_date", "day_ctx"] },
    { say: "El viernes.", intent: "none" },
    { say: "Para el sábado a más tardar.", intent: "propose_day", step: "date", slots: { day: "saturday" }, not: ["g_bye"] },
    // home
    { say: "Sí, voy a estar en casa.", intent: "home_yes" },
    { say: "Le puedo dejar una llave a Doña Lupita.", intent: "leave_key" },
    { say: "No, voy a estar en el trabajo.", intent: "not_home", not: ["home_yes"] },
    { say: "No voy a estar en casa.", intent: "not_home", not: ["home_yes"] },
    // wrapping up
    { say: "¿Me lo puede mandar por correo?", intent: "in_writing", step: "wrap" },
    { say: "¿Me lo puede poner por escrito?", intent: "in_writing", step: "wrap" },
    { say: "¿Me manda un mensaje con la fecha?", intent: "in_writing", step: "wrap" },
    { say: "¿Me puede hacer un descuento en la renta?", intent: "ask_discount", step: "wrap" },
    // the rent
    { say: "Claro. Aquí tiene, en efectivo.", intent: "pay_rent", step: "rent" },
    { say: "Tenga.", intent: "pay_ctx", step: "rent" },
    { say: "Tenga.", intent: "none" },
    { say: "Voy a necesitar un recibo.", intent: "ask_receipt", step: "rent" },
    { say: "¿Me da un recibo, por favor?", intent: "ask_receipt", step: "rent" },
    { say: "Se la transfiero el primero.", intent: "pay_later", step: "rent" },
    { say: "¿Cuánto es?", intent: "rent_q_ctx", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "No tengo la renta.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "Ya se la pagué.", intent: "paid_already", step: "rent", not: ["pay_rent"] },
    { say: "No le voy a pagar.", intent: "withhold", step: "rent", not: ["pay_rent"] },
    // Doña Lupita and goodbye
    { say: "¡Gracias, Doña Lupita!", intent: "thanks_rita" },
    { say: "¿Me pasa el número del técnico?", intent: "ask_tech" },
    { say: "Sí, una cosa más.", intent: "more_ctx", step: "wrap" },
    { say: "¡Buen viaje!", intent: "trip_wish" },
    { say: "¡Que disfrute San Cristóbal!", intent: "trip_wish" },
    { say: "Ya no importa.", intent: "walk_away" },
    // review: meaning flips and gaps (the offer, the day, the rent)
    { say: "Yo puedo arreglarlo.", intent: "accept_offer", step: "offer", not: ["request_fix", "refuse_offer"] },
    { say: "No, yo puedo arreglarlo.", intent: "accept_offer", step: "offer", not: ["refuse_offer"] },
    { say: "No quiero intentarlo.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "Ya intenté arreglarlo.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "¿Cuánto cuesta arreglarlo?", intent: "offer_price_ctx", step: "offer", not: ["accept_offer"] },
    { say: "¿Cuánto cuesta arreglarlo?", intent: "none" },
    { say: "Usted es el dueño, le toca arreglarlo.", intent: "responsibility", step: "dodge" },
    { say: "¿Me está tomando el pelo?", intent: "you_kidding", step: "dodge" },
    { say: "Si no lo arregla, no le pago la renta.", intent: "withhold", step: "dodge", not: ["pay_rent"] },
    { say: "Sí, lo puse en frío y nada.", intent: "thermo_yes", step: "thermostat", not: ["thermo_no"] },
    { say: "¿Puede venir en la tarde?", intent: "afternoon_ctx", step: "date", not: ["accept_date"] },
    { say: "¿A qué hora?", intent: "ask_when", step: "date" },
    { say: "¿El miércoles es lo más pronto?", intent: "too_late", step: "date", not: ["accept_date"] },
    { say: "No quiero pagar en efectivo.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "No puedo pagar ahorita.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "Le pagué ayer.", intent: "paid_already", step: "rent", not: ["pay_rent", "pay_ctx"] },
    // the water heater blamed (5 Nov 2026): steered to the AC, never taken as the AC's problem
    { say: "El calentador no funciona.", intent: "heater_wrong", step: "problem", not: ["heat_broken"] },
    { say: "El boiler no sirve.", intent: "heater_wrong", step: "problem", not: ["heat_broken"] },
    { say: "No hay agua caliente.", intent: "heater_wrong", step: "problem", not: ["heat_broken"] },
    { say: "Se descompuso el calentador.", intent: "heater_wrong", not: ["heat_broken"] },
    { say: "Mi calentador no calienta.", intent: "heater_wrong" },
    { say: "La calefaccion no funciona.", intent: "heater_wrong" },
    { say: "El calentador tampoco funciona.", intent: "heater_wrong", step: "dodge", not: ["heat_broken"] },
    { say: "El aire echa aire caliente.", intent: "heat_broken", not: ["heater_wrong"] },
    // the audit (5 Nov 2026): the learner's door (1B), the heater named, Chucho sent, who pays, Chucho's number, home,
    // thinking it over, the phone, the rent by transfer
    { say: "Soy su inquilina del 1B.", intent: "greet_id" },
    { say: "Don Ernesto, soy yo, el del 1B.", intent: "greet_id" },
    { say: "El calentador.", intent: "heater_wrong", not: ["heat_broken"] },
    { say: "No, es el calentador.", intent: "heater_wrong", not: ["heat_broken", "ac_ctx"] },
    { say: "Se apagó el calentador.", intent: "heater_wrong", not: ["heat_broken"] },
    { say: "No sale agua caliente de la regadera.", intent: "heater_wrong", not: ["heat_broken"] },
    { say: "El calentador sí funciona.", intent: "heater_ok", not: ["heater_wrong"] },
    { say: "El calentador está bien.", intent: "heater_ok", not: ["heater_wrong"] },
    { say: "Está bien, que venga Chucho.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "Que lo arregle el técnico.", intent: "refuse_offer", step: "offer", not: ["accept_offer"] },
    { say: "Mejor que lo arregle yo.", intent: "accept_offer", step: "offer", not: ["refuse_offer", "request_fix"] },
    { say: "¿La mitad?", intent: "offer_price_ctx", step: "offer", not: ["accept_offer"] },
    { say: "Lo voy a pensar.", intent: "think_ctx", step: "offer", not: ["accept_offer", "refuse_offer"] },
    { say: "¿Quién paga la reparación?", intent: "who_pays", step: "date" },
    { say: "¿Tengo que pagar algo?", intent: "who_pays", not: ["pay_rent", "pay_later"] },
    { say: "No voy a pagar la reparación.", intent: "refuse_offer", step: "offer", not: ["who_pays", "accept_offer"] },
    { say: "¿Me pasa el número de Chucho?", intent: "ask_tech" },
    { say: "¿Tengo que estar en casa?", intent: "need_home", not: ["home_yes"] },
    { say: "¿Por qué no contesta el teléfono?", intent: "called_before" },
    { say: "¿A qué hora viene Chucho?", intent: "ask_when", step: "date" },
    { say: "Sí, se la transfiero.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "Ahorita se la transfiero.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "Mañana se la doy.", intent: "pay_later", step: "rent", not: ["pay_rent", "pay_ctx"] },
    { say: "Este mes no le voy a pagar la renta.", intent: "withhold", not: ["pay_rent", "pay_later"] },
    // not understood
    { say: "plátano teclado elefante", intent: "none" },
    { say: "Mi hermano toca la guitarra.", intent: "none" },
  ],

  sims: [
    // firm and polite: the lease, no to the offer, Friday, in writing, the rent and a receipt
    { name: "full: lease, no to the offer, Friday, in writing, receipt", turns: ["Don Ernesto, soy yo, el de arriba.", "El aire no enfría desde hace una semana.",
      "Arreglarlo le toca a usted.", "Eso no es lo que acordamos.", "¿Cuándo puede venir alguien?", "La próxima semana es muy tarde.", "El viernes en la mañana me queda bien.",
      "¿Me lo puede mandar por correo?", "No, es todo, gracias.", "Claro. Aquí tiene, en efectivo.", "Voy a necesitar un recibo.", "Gracias, Don Ernesto. ¡Buen viaje!"],
      expect: { complete: true, state: { date: "friday", offer: "refused", resp: true, writing: true, receipt: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // the B1 path: a plain request, yes to the offer, Wednesday, then a question and a change of mind
    { name: "B1: please fix it, yes to the offer, then sooner", turns: ["¡Hola!", "¿Tiene un minuto?", "El aire acondicionado no funciona.", "Desde el miércoles pasado.",
      "¿Puede arreglarlo, por favor?", "Bueno, lo intento.", "¿Cuándo puede venir alguien?", "Está bien.", "¿Cuánto tiempo va a estar en San Cristóbal?",
      "Pensándolo bien, la próxima semana es muy tarde.", "Es todo.", "Se la transfiero el primero.", "¡Adiós!"],
      expect: { complete: true, state: { date: "friday", offer: "accepted", resp: "soft" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // the twist on every seed: Doña Lupita backs the learner up and knows a repairman
    { name: "Doña Lupita backs you up (twist)", turns: ["¡Hola, Don Ernesto!", "El minisplit solo echa aire caliente.", "Desde hace como dos semanas.", "¡Gracias, Doña Lupita!",
      "Me temo que es su responsabilidad.", "Yo no soy técnico.", "¿Cuándo puede venir alguien?", "¿Puede venir antes?", "El viernes en la mañana me queda bien.",
      "No, es todo.", "Tenga.", "Gracias, ¡adiós!"],
      expect: { complete: true, state: { ritaShown: true, ritaBye: true, date: "friday", dur: 14 } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = "rita"; s.homeQ = false; } },
    { name: "Doña Lupita: the repairman's number, then thanks (twist)", turns: ["El aire acondicionado no funciona.", "Hace ocho días.", "¿Me pasa el número del técnico?",
      "Gracias, Doña Lupita.", "Según el contrato, las reparaciones le tocan a usted.", "Prefiero no tocarlo.", "El sábado sería mejor.", "No, es todo, gracias.",
      "Ya se la transferí.", "¡Que disfrute San Cristóbal!"],
      expect: { complete: true, state: { ritaShown: true, techAsked: true, ritaBye: true, date: "saturday", dur: 7, rentDone: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = "rita"; s.homeQ = false; s.thermoQ = false; } },
    // rude at first: an answer and a tip each time, never a dead end
    { name: "rude first, then calm", turns: ["El aire no funciona por una semana.", "No voy a pagar la renta hasta que lo arregle.", "¡Arréglelo ya!", "¡Ni loco!",
      "¿Cuándo viene el técnico?", "No.", "Está bien.", "No, es todo, gracias.", "No le voy a pagar.", "Bueno, se la transfiero el primero.", "¡Adiós!"],
      expect: { complete: true, state: { resp: "blunt", offer: "refused", date: "friday" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    // walking away before a day is agreed: not done
    { name: "walk away (not completed)", turns: ["El aire acondicionado no funciona.", "Una semana.", "Ya no importa."], expect: { complete: false }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; } },
    // the water heater first (5 Nov 2026): "¿No será el aire?" "Sí, el aire."; nothing about the heater is recorded
    { name: "the water heater first, then yes, the AC", turns: ["Buenos días, Don Ernesto.", "El calentador no funciona.", "Sí, el aire. No enfría desde hace una semana.",
      "Arreglarlo le toca a usted.", "Eso no es lo que acordamos.", "¿Cuándo puede venir alguien?", "La próxima semana es muy tarde.", "El viernes en la mañana me queda bien.",
      "No, es todo, gracias.", "Claro. Aquí tiene, en efectivo.", "Gracias, Don Ernesto. ¡Buen viaje!"],
      expect: { complete: true, state: { calentador: true, problem: true, dur: 7, date: "friday", offer: "refused", resp: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    // a returning player: "Déjeme adivinar: ¿el aire?"
    { name: "again: let me guess, the AC", turns: ["Sí. Hace un calor horrible en mi casa.", "Desde el lunes.", "El contrato dice que usted paga las reparaciones.", "Prefiero no tocarlo.",
      "¿Puede venir mañana?", "El viernes está bien.", "No, estoy bien.", "¿Puedo pagar después?", "¡Que tenga buen día!"],
      expect: { complete: true, state: { date: "friday", offer: "refused", dur: 2 } }, auto: AUTO,
      setup: (s) => { s.known = true; s.greetAgain = true; s.twist = null; s.homeQ = false; } },
    // a returning player: "Sí, otra vez el aire." answers the guess; a price question at the rent pays nothing
    { name: "again: yes, the AC again; how much is it?", turns: ["Sí, otra vez el aire.", "Quince días.", "Es su responsabilidad.", "No sé arreglar aires acondicionados.",
      "¿Qué día?", "El viernes a las nueve.", "No, nada más.", "¿Cuánto es?", "Aquí tiene.", "Hasta luego."],
      expect: { complete: true, state: { date: "friday", dur: 14, offer: "refused", rentPaid: true } }, auto: AUTO,
      setup: (s) => { s.known = true; s.greetAgain = true; s.twist = null; s.homeQ = false; s.thermoQ = false; } },
    // in writing before there is a day; the learner picks Saturday
    { name: "in writing first, then Saturday", turns: ["Disculpe, Don Ernesto. El aire acondicionado no funciona.", "Se descompuso el lunes.", "El aire acondicionado está incluido en la renta.",
      "No, gracias. Mande a un técnico, por favor.", "¿Me lo puede poner por escrito?", "¿Qué tal el sábado?", "Eso es todo.", "Claro.", "¿Me da un recibo, por favor?", "¡Gracias!"],
      expect: { complete: true, state: { date: "saturday", writing: true, receipt: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    // "¿El miércoles? Ni loca." is never a yes; "Para el sábado." is a day
    { name: "Wednesday? No way. Then by Saturday", turns: ["Hola, Don Ernesto. El aire no funciona.", "Está roto por una semana.", "Según el contrato, las reparaciones le tocan a usted.",
      "Perdón, pero eso no es lo que acordamos.", "¿Cuándo puede venir alguien?", "¿El miércoles? Ni loca.", "Para el sábado.", "No, es todo.", "Claro. Aquí tiene, en efectivo.", "¡Adiós!"],
      expect: { complete: true, state: { date: "saturday", dur: 7, offer: "refused" } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    { name: "Wednesday? Too late. Friday? Still too late. Okay.", turns: ["Don Ernesto, el aire no funciona.", "Cinco días.", "Arreglarlo le toca a usted.",
      "Yo no soy técnica.", "¿Cuándo puede venir alguien?", "¿El miércoles de la próxima semana? Es muy tarde.", "¿El viernes? Sigue siendo muy tarde.", "Está bien.",
      "¿Me descuenta los días sin aire?", "No, es todo.", "Tenga.", "¡Adiós!"],
      expect: { complete: true, state: { date: "friday", dur: 5 } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; } },
    // "No sé." at the dodge: he gives in; Wednesday is accepted; the key goes to Doña Lupita
    { name: "the dodge gives in, Wednesday", turns: ["El aire está descompuesto.", "Tres días.", "No sé.", "Yo no soy técnico.", "¿Cuándo puede venir alguien?",
      "Me parece bien.", "Le puedo dejar una llave a Doña Lupita.", "¡Gracias!", "No traigo efectivo.", "¡Adiós!"],
      expect: { complete: true, state: { date: "wednesday", resp: "soft", offer: "refused", homeDone: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = true; } },
    // review: money and the offer move only on a real answer: early rent waits, "Está bien, gracias" asks again,
    // an afternoon gets "mornings only", an earlier transfer still gets its receipt
    { name: "polite closings and early rent never pay or accept", turns: ["El aire no funciona.", "Una semana.", "Puedo pagar ahora.", "Arreglarlo le toca a usted.",
      "Está bien, gracias.", "No, gracias. Mande a un técnico.", "¿Puede venir en la tarde?", "Está bien.", "Está bien.", "No, es todo.", "Está bien, gracias.",
      "Ya le pagué. ¿Me da un recibo?", "¡Adiós!"],
      expect: { complete: true, state: { offer: "refused", date: "wednesday", paidBefore: true, receipt: true, rentDone: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; s.thermoQ = false; } },
    // short answers: the remote, the offer, the day, home, that's all, the rent
    { name: "short answers", turns: ["El aire no enfría.", "Sí.", "Una semana.", "¿Puede mandar a alguien?", "No.", "¿Cuándo?", "Muy tarde.", "Sí.", "Sí.", "No.", "Tenga.", "Adiós."],
      expect: { complete: true, state: { date: "friday", offer: "refused", thermoDone: true, homeDone: true, rentPaid: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.thermoQ = true; s.homeQ = true; } },
    // the audit (5 Nov 2026): "¿El miércoles?" typed as a question books nothing until the yes; who pays; what time
    { name: "the echo «¿El miércoles?» asks; who pays; then yes", turns: ["Soy su inquilino del 1B.", "El aire no funciona.", "Una semana.", "Arreglarlo le toca a usted.",
      "No, gracias. Mande a un técnico.", "¿Cuándo puede venir alguien?", "¿El miércoles?", "¿Quién paga la reparación?", "Sí, me parece bien.", "¿A qué hora viene Chucho?",
      "No, es todo.", "Aquí tiene.", "¡Adiós!"],
      expect: { complete: true, state: { date: "wednesday", echoSaid: true, payMineSaid: true, offer: "refused", rentPaid: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; s.thermoQ = false; } },
    // "Está bien, que venga Chucho." is a no to the offer; Chucho's number; the rent handed over at "¿Algo más?"
    { name: "send Chucho, his number, the rent at «¿Algo más?», a receipt", turns: ["El aire no enfría desde hace una semana.", "Le toca a usted arreglarlo.",
      "Está bien, que venga Chucho.", "¿Me pasa el número de Chucho?", "El viernes.", "Aquí tiene la renta de este mes.", "¿Me da un recibo?", "¡Buen viaje!"],
      expect: { complete: true, state: { date: "friday", offer: "refused", chuchoNum: true, rentPaid: true, receipt: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; s.thermoQ = false; } },
    // the heater insisted on twice (never the same pair of lines twice), then the AC; thinking it over; home; a transfer
    { name: "the heater insisted on, then the AC; a transfer", turns: ["El calentador no funciona.", "No.", "El calentador.", "No, el calentador de agua.",
      "Ah, perdón, el aire.", "Desde hace una semana.", "Según el contrato, las reparaciones le tocan a usted.", "Lo voy a pensar.", "No, gracias. Mande a un técnico.",
      "¿Cuándo puede venir alguien?", "¿Tengo que estar en casa?", "El viernes en la mañana me queda bien.", "No, es todo.", "Sí, se la transfiero.", "¡Adiós!"],
      expect: { complete: true, state: { calentador: true, heaterAgain: true, problem: true, dur: 7, date: "friday", offer: "refused", homeDone: true, rentDone: true } }, auto: AUTO,
      setup: (s) => { s.greetAgain = false; s.twist = null; s.homeQ = false; s.thermoQ = false; } },
  ],
};

export default landlord;
