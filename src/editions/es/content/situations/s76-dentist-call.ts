// NEEDS: None (global g_sorry_to_hear says "¡Ay, lo siento!" since 2 Nov; "¡Ay, qué pena!" first meant "how embarrassing").
// This file uses its own sorry_pain line. Every merge, entity, value and pending question is local.
// Song 76 "Could You Spell That?" → Puerto Colibrí: "¿Cómo se escribe?"
// A phone call to Clínica Dental Coral; Lorena at reception (usted). Booking an appointment, Mexican style: the
// reason ("una revisión", "una limpieza", "me duele una muela", "se me cayó una resina"), "¿Es su primera vez con
// nosotros?", the full name and the surname spelled with Spanish letter names ("be grande", "doble ve", "doble ele"),
// the date of birth day first ("el cuatro de junio de 1990"), a cell number read in pairs, insurance or paying
// privately ("particular"), and the time ("el jueves a las cuatro y media").
// Phone skills: "se está cortando", "¿Puede hablar más fuerte?", "¿Me escucha?", "¿Bueno?", being put on hold.
//
// Keeps the English edition's steps, intents and twists (reschedule, on_hold, bad_line). The brief adds the twist
// only_slot (visits ≥ 1, booking only): this week the only opening is "pasado mañana a las nueve"; other days or
// times get "es lo único que tengo esta semana", and a no gets next week's first opening.
// Added intents: pick_ctx (a bare day or time at the time question), hours_q, pay_q, english_q (questions foreigners
// really ask on the Riviera Maya).
//
// Research (Nov 2026): small private dental offices ("consultorio", "clínica dental") on Mexico's Caribbean coast work
// split hours (about 9–2 and 4–8, Saturday mornings), most patients pay privately ("particular") and few have dental
// insurance; a first visit is a "valoración" (exam and treatment plan, then a "presupuesto"); new patients fill out a
// "historia clínica"; offices confirm by message the day before and allow about 15 minutes' lateness ("tolerancia").
// Cleanings around Playa del Carmen are listed from about $800 to $1,500 (doctoralia.com.mx, Nov 2026); this office's
// valoración is $400 (a plausible round figure; the line says no more than that).

import type { Ctx, EntityDef, Segment, SituationDef, StepDef, Suggestion } from "@/content/types";
import type { SlotFn } from "@/convo/grammar";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";
import { readInt } from "@/convo/slots";

// ---------------------------------------------------------------------------
// Entities

const REASONS: EntityDef[] = [
  ent("toothache", "dolor | de | muelas", "pain | of | teeth", "m", { art: "",
    forms: ["dolor de muela", "dolor de dientes", "dolor de diente", "dolor de muelas", "mucho dolor de muelas", "un dolor de muelas", "dolor fuerte de muelas", "dolor"], attrs: { pain: true, nat: "toothache" } }),
  ent("checkup", "revisión", "checkup", "f", { pl: "revisiones",
    forms: ["revision", "revision general", "chequeo", "chequeo general", "valoracion", "consulta", "consulta general", "revision de rutina", "revisada"] }),
  ent("cleaning", "limpieza", "cleaning", "f", { pl: "limpiezas",
    forms: ["limpieza", "limpieza dental", "limpieza de dientes", "profilaxis", "limpieza general"] }),
  ent("broken", "diente | roto", "tooth | broken", "m", { pl: "dientes | rotos", ltPl: "teeth | broken",
    forms: ["diente roto", "diente quebrado", "muela rota", "muela quebrada", "diente astillado", "diente despostillado"], attrs: { pain: true, nat: "broken tooth" } }),
  ent("filling", "resina", "filling", "f", { pl: "resinas",
    forms: ["resina", "empaste", "amalgama", "curacion", "calza", "relleno", "tapadura", "obturacion"], attrs: { problem: true } }),
];

// ---------------------------------------------------------------------------
// Appointment offers. A value carries the day and the time as Lorena says them: "el jueves a las 4:30 de la tarde".

interface Offer { d: string; h: number; m: number }
const DAY_ES: Record<string, [string, string]> = {
  tomorrow: ["mañana", "tomorrow"], day_after_tomorrow: ["pasado mañana", "the day after tomorrow"],
  monday: ["el lunes", "Monday"], tuesday: ["el martes", "Tuesday"], wednesday: ["el miércoles", "Wednesday"],
  thursday: ["el jueves", "Thursday"], friday: ["el viernes", "Friday"],
  next_tuesday: ["el martes de la próxima semana", "next Tuesday"],
};
const HOURS = ["doce", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once"];
const MINS: Record<number, string> = { 0: "", 15: " y cuarto", 30: " y media" };
function clockVal(h: number, m: number): { en: string; lt: string; say: string } {
  const h12 = h % 12 === 0 ? 12 : h % 12, art = h12 === 1 ? "la" : "las";
  const part = h < 12 ? "de la mañana" : h < 19 ? "de la tarde" : "de la noche";
  const ap = h < 12 ? "AM" : "PM";
  const mm = String(m).padStart(2, "0");
  return { en: `${art} ${h12}:${mm} ${part}`, lt: m ? `${h12}:${mm} ${ap}` : `${h12} ${ap}`, say: `${art} ${HOURS[h % 12]}${MINS[m] ?? ` ${m}`} ${part}` };
}
const slotVal = (o: Offer) => {
  const [es, en] = DAY_ES[o.d];
  const c = clockVal(o.h, o.m);
  return { en: `${es} a ${c.en}`, lt: `${en} at ${c.lt}`, say: `${es} a ${c.say}` };
};
const dayVal = (d: string) => ({ en: DAY_ES[d][0], lt: DAY_ES[d][1], say: DAY_ES[d][0] });

const OFFERS: Record<string, Offer> = {
  first: { d: "tuesday", h: 10, m: 0 },
  early: { d: "tomorrow", h: 9, m: 30 },
  late: { d: "thursday", h: 19, m: 0 },
  morning: { d: "friday", h: 11, m: 0 },
  monday: { d: "monday", h: 17, m: 0 },
  wednesday: { d: "wednesday", h: 16, m: 15 },
  move: { d: "thursday", h: 16, m: 30 },
  only: { d: "day_after_tomorrow", h: 9, m: 0 },
  // next week's openings, offered only once the twist's only opening is turned down
  monday_am: { d: "monday", h: 10, m: 0 },
  next_tue: { d: "next_tuesday", h: 16, m: 30 },
};
const NEXT_WEEK = ["monday", "monday_am", "next_tue"];
const THIS_WEEK = ["tomorrow", "tuesday", "wednesday", "thursday", "friday"];
const DAY_OFFER: Record<string, string> = {
  monday: "monday", tuesday: "first", wednesday: "wednesday", thursday: "late", friday: "morning", tomorrow: "early",
  day_after_tomorrow: "only", next_week: "monday",
};
const EXISTING: Offer = { d: "tomorrow", h: 9, m: 30 };
const WEEKEND = ["saturday", "sunday", "this_weekend", "next_weekend"];
const TODAYISH = ["today", "tonight", "this_afternoon", "this_morning"];

/** A birth year said with two digits: "del noventa" 1990, "del cinco" 2005, "del treinta" 1930 (never a year to come). */
const twoDigitYear = (n: number) => (n > 25 ? 1900 + n : 2000 + n);
/** A year someone calling was born in. */
const birthYear = (y: number) => y >= 1900 && y <= 2025;

/** Numeric dates, day first as in Mexico: "04/06/1990", "4-6-90", "4.6.1990"; month first (US) only when the second
 *  number can't be a month ("06/24/1990", with a tip). */
const numDate: SlotFn = (tokens, pos) => {
  const read = (a: number, b: number, z: number, end: number) => {
    const year = z < 100 ? twoDigitYear(z) : z;
    if (year < 1900 || year > 2025) return [];
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return [{ end, value: { day: a, month: b, year } }];
    if (a >= 1 && a <= 12 && b >= 13 && b <= 31) return [{ end, value: { day: b, month: a, year }, tags: ["tip:us_date"] }];
    return [];
  };
  const one = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(tokens[pos] ?? "");
  if (one) return read(+one[1], +one[2], +one[3], pos + 1);
  const [a, b, y] = [tokens[pos], tokens[pos + 1], tokens[pos + 2]];
  if (![a, b, y].every((x) => x !== undefined && /^\d+$/.test(x))) return [];
  if (a.length > 2 || b.length > 2 || !(y.length === 2 || y.length === 4)) return [];
  return read(+a, +b, +y, pos + 3);
};

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** A date said month first, as in English ("junio cuatro", "junio 4", "junio el cuatro"): understood, with the tip
 *  that Spanish says the day first. Value {day, month}. */
const monthFirst: SlotFn = (tokens, pos) => {
  const w = tokens[pos] ?? "";
  const m = (w === "setiembre" ? 9 : MONTHS_ES.indexOf(w) + 1);
  if (!m) return [];
  const i = tokens[pos + 1] === "el" ? pos + 2 : pos + 1;
  const out: { end: number; value: unknown; tags?: string[] }[] = [];
  if (tokens[i] === "primero") out.push({ end: i + 1, value: { day: 1, month: m }, tags: ["tip:month_first"] });
  for (const r of readInt(tokens, i)) if (r.value >= 1 && r.value <= 31) out.push({ end: r.end, value: { day: r.value, month: m }, tags: ["tip:month_first"] });
  return out;
};

// ---------------------------------------------------------------------------
// State helpers

const booking = (c: Ctx) => !!c.s.booking;
const moving = (c: Ctx) => !!c.s.moving;
const words = (s?: string) => (s ? s.trim().split(/\s+/).length : 0);
/** The checklist follows moving an existing appointment (twist visits, or whenever the learner asks) unless they are
 *  booking a new one. Frozen once an appointment is set. */
const movePath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "move" : (!!c.s.moveTwist || !!c.s.moving) && !c.s.booking);
const bookPath = (c: Ctx) => !movePath(c);
/** Spelling the surname: always when booking; when moving only if Lorena asks (c.s.spellOnMove). */
const spellNeeded = (c: Ctx) => bookPath(c) || !!c.s.spellOnMove;
/** New patients also give a phone number and say how they pay. */
const newPtBooking = (c: Ctx) => bookPath(c) && c.s.newPt === true;
/** Every tag of a segment, including the ones inside slot values ("mañana en la tarde" → afternoon). */
function allTags(slots: any, seg?: { tags: string[] }): string[] {
  const out = [...(seg?.tags || [])];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
}
/** The part of the day a turn names: "am" (en la mañana, temprano), "pm" (en la tarde / noche) or undefined. */
function partOf(slots: any, seg?: { tags: string[] }): "am" | "pm" | undefined {
  const tags = allTags(slots, seg);
  if (tags.includes("am") || tags.includes("morning")) return "am";
  if (tags.includes("pm") || tags.includes("afternoon") || tags.includes("evening")) return "pm";
  return undefined;
}
const fitsPart = (k: string, part?: "am" | "pm") => !part || (part === "am" ? OFFERS[k].h < 12 : OFFERS[k].h >= 12);
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Every piece of this turn's parse ("El martes a las diez | no puedo"). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];
/** Next week's day: "el martes de la próxima semana", "el próximo martes", "el martes que viene". */
const nextWeek = (c: Ctx, slots: any, seg?: { tags: string[] }) =>
  allTags(slots, seg).includes("next") || /proxima semana|semana que viene/.test(plain(c.heard));
/** The opening Lorena has on a day the learner names. This week's opening is never next week's: next week she knows
 *  Monday and Tuesday afternoon (next_tue), so another weekday "de la próxima semana" has none (undefined). */
function keyForDay(c: Ctx, d: string, slots: any, seg?: { tags: string[] }): string | undefined {
  if (THIS_WEEK.includes(d) && d !== "tomorrow" && nextWeek(c, slots, seg)) return d === "tuesday" ? "next_tue" : undefined;
  return DAY_OFFER[d];
}
/** Is opening k on the day the learner names? Next Tuesday's is "el martes" too; this week's is not "el martes de la
 *  próxima semana". */
function onDay(k: string, d: string, next: boolean): boolean {
  const od = OFFERS[k].d;
  if (od === "next_tuesday") return d === "tuesday";
  if (next && THIS_WEEK.includes(od)) return false;
  return od === d;
}
/** Pieces that answer the time question themselves: a named offer refused next to one of them is left to it. */
const PICK_ACTS = new Set(["reject", "day_req", "time_req", "pick_ctx", "earlier", "later", "morning", "accept", "availability_q"]);
/** Pieces that leave a "Me queda bien" in the same turn unbooked: a change ("…, pero mejor el miércoles"), a pick, a
 *  hesitation or a question about the price or the time ("Perfecto, ¿cuánto cuesta?"): they answer; the yes waits. */
const DEFER_ACCEPT = new Set(["reject", "day_req", "time_req", "pick_ctx", "earlier", "later", "morning", "availability_q",
  "choose_ctx", "maybe_ctx", "when_q", "date_ctx", "cost_q"]);
/** A typed question ("¿El martes?", "El martes a las diez, ¿verdad?") checks the time on offer and never books it
 *  (rule 17); a yes in the same turn ("Sí, el martes. ¿Dónde están?") still does. Voice has no question marks: a
 *  bare "El martes" echoing the offer is taken as a yes. */
const asked = (c: Ctx) => /[¿?]/.test(c.heard) && (c as any).conv?.out?.parse?.yn !== "yes";
/** After "Tengo X o Y" (availability): the ones of the two that the turn points at ("el primero", "el del jueves",
 *  "el de la noche", "a las siete", "mañana"). */
function choiceHits(c: Ctx, slots: any, seg?: { tags: string[] }): string[] {
  const ch = c.s.choice as string[] | undefined;
  if (!ch) return [];
  const tags = allTags(slots, seg);
  if (tags.includes("first")) return [ch[0]];
  if (tags.includes("second")) return [ch[1]];
  const d = slots?.day as string | undefined;
  const tm = slots?.time as { h: number; m: number; ampm?: string } | undefined;
  const part = partOf(slots, seg);
  const tarde = tags.includes("tarde"), noche = tags.includes("noche");
  if (!d && !tm && !part && !tarde && !noche) return [];
  const nx = nextWeek(c, slots, seg);
  return ch.filter((k) => {
    const o = OFFERS[k];
    if (d && !onDay(k, d, nx)) return false;
    if (tm && !(o.h % 12 === tm.h % 12 && o.m === tm.m && !(tm.ampm === "am" && o.h >= 12) && !(tm.ampm === "pm" && o.h < 12))) return false;
    if (tarde && !(o.h >= 12 && o.h < 19)) return false;
    if (noche && o.h < 19) return false;
    return fitsPart(k, part);
  });
}
/** The one of the two the turn names; undefined when it names neither or both. */
function pickChoice(c: Ctx, slots: any, seg?: { tags: string[] }): string | undefined {
  const hits = choiceHits(c, slots, seg);
  return hits.length === 1 ? hits[0] : undefined;
}
/** Both openings fit what the turn names ("El jueves" when both are on Thursday): Lorena asks about the first. */
const choiceBoth = (c: Ctx, slots: any, seg?: { tags: string[] }) => choiceHits(c, slots, seg).length === 2;
/** Days, months and day words are never a spelled surname typed as one word. */
const NOT_SPELLED = /^(lunes|martes|miercoles|jueves|viernes|sabado|domingo|hoy|manana|ayer|tarde|noche|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/i;

/** One-word replies that the {name} / {letters} slots would swallow: the intent they really are. "ok" = Lorena says
 *  "Sí, dígame" and waits; "no" = she asks again. */
const NOT_A_NAME: Record<string, string> = {
  disculpe: "g_repeat", repita: "g_repeat", otra: "g_repeat", eh: "g_repeat",
  espere: "g_wait", espereme: "g_wait", momentito: "g_wait", segundito: "g_wait",
  chao: "g_bye", bye: "g_bye", adios: "g_bye", hasta: "g_bye",
  listo: "ok", vale: "ok", okey: "ok", okay: "ok", perfecto: "ok", correcto: "ok", exacto: "ok", adelante: "ok",
  dale: "ok", aja: "ok", digame: "ok", oiga: "ok", va: "ok", sale: "ok", andale: "ok", orale: "ok", claro: "ok", si: "ok",
};
function goAhead(c: Ctx) { c.say("go_ahead"); c.hold(); }
/** true = the "name" was one of those words (or a day) and has been handled as what it really is. */
function notAName(c: Ctx, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (NOT_SPELLED.test(w)) return true;
  const g = NOT_A_NAME[w];
  if (!g) return false;
  if (g === "ok") goAhead(c);
  else ((dentist.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
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

/** This week's only opening (twist): until the learner turns it down, every other day or time gets "es lo único". */
const onlyNow = (c: Ctx) => !!c.s.onlyTwist && !moving(c) && !c.s.onlyRejected && c.s.offer === "only";
/** After the appointment is set, another day or time only gets a reminder of it ("Su cita ya quedó…"). */
function booked(c: Ctx): boolean {
  if (!c.s.appt) return false;
  c.say("appt_set", { slot: slotVal(OFFERS[c.s.appt]) });
  return true;
}
/** "Está bien, gracias" / "Vale, gracias" could be a yes or a polite goodbye: the first time, Lorena asks again. */
const POLITE = /^\W*(est[aá] bien|vale|ok|okay|bueno|perfecto|muy bien)[\s,.!]*(muchas |mil )?gracias\W*$/i;
/** Twist, after the only opening was turned down: the rest of this week is full; Lorena offers next week. */
const weekFull = (c: Ctx) => !!c.s.onlyTwist && !moving(c) && !!c.s.onlyRejected;
function weekFullAgain(c: Ctx) { c.say("week_full"); offer(c, c.s.offer, true); c.hold(); }
function onlyOne(c: Ctx) { c.say("only_one"); offer(c, "only", true); c.hold(); }

/** Asked to change the time just booked, the learner keeps it after all ("Mejor déjela como estaba", "Así está bien"):
 *  the booked time stands again. false when nothing was being changed. */
function keepOld(c: Ctx): boolean {
  const old = c.s.prevAppt as string | undefined;
  if (!old || c.s.appt) return false;
  c.s.offer = old; c.s.appt = old; c.s.prevAppt = undefined; c.s.moreDone = false; c.s.choice = undefined;
  c.say("appt_set", { slot: slotVal(OFFERS[old]) });
  return true;
}

/** The first opening Lorena has: tomorrow at 9:30, or Tuesday at 10 when that 9:30 is the appointment being moved. */
const earliest = (c: Ctx) => (moving(c) ? "first" : "early");

function offer(c: Ctx, key: string, again = false) {
  const o = OFFERS[key];
  c.s.offer = key;
  c.s.choice = undefined; // one opening on the table again (availability's two are over)
  c.s.offered = c.s.offered || [];
  if (!c.s.offered.includes(key)) c.s.offered.push(key);
  // "Entonces, ¿le aparto…?" just asked about this same opening: the next time she words it as a plain offer
  const repeat = again && c.s.lastAgain === key;
  c.s.lastAgain = again && !repeat ? key : undefined;
  if (key === "move" && !again) { c.say("move_offer"); return; }
  c.say(again && !repeat ? "offer_again" : "offer", { slot: slotVal(o) });
}

function accept(c: Ctx) {
  const key = c.s.offer;
  if (!key) return;
  const o = OFFERS[key];
  c.s.choice = undefined;
  c.s.appt = key;
  c.s.prevAppt = undefined;
  c.say(moving(c) ? "moved" : "booked", { slot: slotVal(o) });
  // said once per call, even when the appointment is booked again after a change
  if (!c.s.toldArrive) {
    c.s.toldArrive = true;
    if (!moving(c)) c.say(c.s.newPt ? "arrive_early" : "bring_id");
    c.say("text_reminder");
  }
  c.s.donePath = c.s.donePath || (moving(c) ? "move" : "book");
  c.complete();
}

/** An opening the learner named: a statement takes it ("El jueves", "El segundo"), a question ("¿El del jueves?") or
 *  a correction gets it offered again ("Entonces, ¿le aparto…?"), once a turn. */
function takeOrAsk(c: Ctx, k: string, ask = false) {
  if (ask || asked(c)) {
    if (!turn(c).picked) { turn(c).picked = true; offer(c, k, true); c.hold(); }
    return;
  }
  c.s.offer = k;
  accept(c);
}

/** The offered or still-free opening at a said clock time (never the one being moved, never this week's only opening
 *  unless it is the twist's). */
function slotAt(c: Ctx, tm: { h: number; m: number; ampm?: string }, day?: string, next = false): string | undefined {
  const match = (k: string) => {
    const o = OFFERS[k];
    if (tm.ampm === "am" && o.h >= 12) return false;
    if (tm.ampm === "pm" && o.h < 12) return false;
    return o.h % 12 === tm.h % 12 && o.m === tm.m && (!day || onDay(k, day, next));
  };
  const offered = (c.s.offered || []).find((k: string) => match(k));
  if (offered) return offered;
  const pool = weekFull(c) ? [...NEXT_WEEK, "only"] : Object.keys(OFFERS).filter((k) => !NEXT_WEEK.includes(k) || k === "monday" || (next && k === "next_tue"));
  return pool.find((k) => (moving(c) ? k !== "early" : k !== "move") && (k !== "only" || !!c.s.onlyTwist) && match(k));
}

const DENTIST_AUTO: Record<string, string> = {
  pain_len: "Desde hace tres días.", hold: "Sí, claro.", phone: "Mi número es 984 123 4567.", insurance: "No, voy a pagar yo.",
  surname: "Miller", spell: "eme, i, ele, ele, e, erre", slot: "Sí, me queda bien.", reason: "Me duele una muela.",
  new_pt: "Sí, es mi primera vez.", dob: "El cuatro de junio de mil novecientos noventa.", hear: "Sí, ya la escucho.",
  year: "Mil novecientos noventa.", name: "Ryan Miller",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_BOOK: Suggestion = { lt: "Say you'd like an appointment (and why)", hint: "book", options: "reason" };
const S_MOVE: Suggestion = { lt: "Say you'd like to move tomorrow's appointment", hint: "move" };
const S_PHONE: Suggestion = { lt: "If you can't hear well, ask her to speak up", hint: "phone" };

function helpStep(id: string, withMove: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.moveTwist === withMove,
    done: (c) => !!c.s.task,
    ask: (c) => { c.say(bump(c, "help") === 0 ? "greet" : "ask_help"); },
    expects: ["book", "reason_ans", "move", "cancel", "intro_name"],
    suggest: withMove ? [S_MOVE, S_BOOK, S_PHONE] : [S_BOOK, S_PHONE],
  };
}

// ---------------------------------------------------------------------------

export const dentist: SituationDef = {
  id: "s76-dentist-call",
  song: 76,
  songTitle: "Could You Spell That?",
  title: { en: "¿Cómo se escribe?", lt: "How do you spell that?" },
  topic: { en: "Una cita por teléfono", lt: "Making an appointment by phone" },
  chapter: 3,
  order: 8,
  location: "phone",
  npc: "linda",
  mode: "phone",
  goal: "Call the dental office and make an appointment. Spell your last name, give your date of birth and a phone number, and agree on a day and time.",
  intro: "You call Clínica Dental Coral in Puerto Colibrí: a tooth has been bothering you (or it's simply time for a checkup). Lorena answers. On the phone you can't see anything, so ask her to repeat, spell your name letter by letter, and say if the line is bad. Prices are in pesos.",
  entities: { reason: REASONS },

  grammar: {
    macros: {
      cita: "(una cita | cita | una consulta | consulta | un espacio | una hora | hora | un turno)",
      make: "(hacer | sacar | agendar | pedir | tomar | programar | reservar | apartar | conseguir)",
      want: "(quisiera | quiero | me gustaria | necesito | queria)",
      dent: "(el dentista | la dentista | un dentista | una dentista | el doctor | la doctora | el odontologo | la odontologa | un odontologo | dentista | odontologo)",
      todent: "(al dentista | a la dentista | a un dentista | a una dentista | al doctor | a la doctora | al odontologo | con el dentista | con la dentista | con la doctora | con el doctor | con un dentista)",
      soon: "(lo antes posible | lo mas pronto posible | cuanto antes | lo mas rapido posible | hoy mismo | urgente | urgentemente)",
      dpart: "[en la manana #am | en la tarde #pm | por la manana #am | por la tarde #pm | en la noche #pm | temprano #am]",
      hurt: "(me duele | me duelen | me esta doliendo | me estan doliendo)",
      dur: "[como | casi | mas de | unos | ya | mas o menos] ({number} (dias | dia | semanas | semana) | unos dias | un par de dias | dos o tres dias | una semana | dos semanas | mucho tiempo | un rato | {number} o {number} dias)",
      staff: "(puede | podria | me puede | me podria | puedes #tip:tu_staff | me puedes #tip:tu_staff)",
      hear: "(escucha | oye | escuchas #tip:tu_staff | oyes #tip:tu_staff)",
      pick: "(me quedo con | prefiero | mejor | quiero | deme | me da | apunteme | aparteme | agendeme | si)",
      month: "(enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | setiembre | octubre | noviembre | diciembre)",
    },
    slots: {
      numdate: { fn: numDate },
      mdate: { fn: monthFirst },
    },
  },

  intents: {
    // --- opening requests
    book: { patterns: [
      "@want @make @cita [@todent] [para (una | un) {reason}] #h:book_like",
      "(me gustaria | quisiera) (agendar | hacer | programar) @cita [@todent] [para (una | un) {reason}] #h:book_gustaria",
      "(llamo | le llamo | hablo | le hablo) para (hacer | sacar | agendar | pedir | programar) @cita [@todent] [para (una | un) {reason}] #h:book_calling",
      "@staff (dar | darme | conseguir) @cita [@todent] [para (una | un) {reason}] #h:book_could",
      "@staff (dar | darme) @cita [para (una | un) {reason}] para ({day} [@dpart] | esta semana)",
      "necesito (ver | ir) (@todent | a la doctora | al dentista) [@soon #urgent] #h:book_asap",
      "(quisiera | quiero | necesito) ir @todent [@soon #urgent]",
      "(tiene | tienen | hay) (algo | algun espacio | algun lugar | lugar | espacio | citas | alguna cita | cita) [disponible | disponibles | libre] (esta semana | pronto | la proxima semana | para esta semana | para la proxima semana | {day} | para {day}) #h:book_available",
      "(tiene | tienen | hay) (citas | cita | espacio | lugar) (disponibles | disponible)",
      "(tienes | hay) (algo | citas) [disponible | disponibles] (esta semana | para {day}) #tip:tu_staff",
      "@want @cita [@todent] [para (una | un) {reason}]",
      "@want @cita [@todent] para ({day} [@dpart] | esta semana | la proxima semana)",
      "@want @make @cita [para (una | un) {reason}] para ({day} [@dpart] | esta semana | la proxima semana)",
      "@want (una | un) {reason} #h:book_need",
      "@want @make (una | un) {reason}",
      "@want @cita para (una | un) {reason} #h:book_checkup",
      "(es | es algo) urgente #urgent", "es (una emergencia | muy urgente | bastante urgente) #urgent",
      "@want @cita @soon #urgent", "@want (ver | ir) @todent @soon #urgent",
      "(puedo | se puede | podria) (ir | pasar) (hoy | manana | esta semana | {day}) [@dpart]",
      "@want pedir hora [@todent]", "(vengo | llamo | hablo) por (una | un) {reason}",
      "(quiero | quisiera | necesito) que me (revisen | vean | chequen) (un diente | una muela | los dientes | la boca)",
      "(una cita | una consulta) [@todent] [para (una | un) {reason}]",
      "es posible (hacer | sacar | agendar) @cita [para {day} | esta semana | pronto]",
      // a calendar date ("…para el 12 de noviembre"): when Lorena first offers a time, that date is full (date_full)
      "[@want] [@make] @cita [@todent] [para (una | un) {reason}] para el {date}", "(tiene | tienen | hay) (algo | lugar | espacio | citas | alguna cita) [disponible] para el {date}",
    ] },
    reason_ans: { patterns: [
      "(tengo | traigo) [un | mucho | un fuerte | un poco de] {reason} [desde hace {number} (dias | semanas)] #h:reason_have",
      "(es | seria) para (una | un) {reason} #h:reason_for",
      "@hurt [mucho | muchisimo | bastante] (una muela | un diente | la muela | el diente | una muela del juicio | la muela del juicio | los dientes | las muelas | las encias) [desde hace {number} dias] #pain #h:reason_hurts",
      "@hurt (mucho | muchisimo) (una muela | un diente | la muela | el diente) #pain",
      "@hurt (mucho | muchisimo) #pain",
      "se me (rompió | quebró | despostilló | partió | astilló) (un diente | una muela | el diente | la muela) #broken #h:reason_broke",
      "me (rompí | quebré | despostillé) (un diente | una muela) #broken",
      "tengo (un diente | una muela) (roto | rota | quebrado | quebrada | astillado | despostillado | flojo #pain) #broken",
      "se me cayó (una | la | un | mi) {reason} #filling #h:reason_filling",
      "[solo | nada mas | nomas | solamente] (una | un) {reason} #h:reason_just",
      "(una | un) {reason}", "{reason}",
      "(una | un) {reason} y (una | un) {reason}",
      "(me sangran | me duelen) las encias #pain",
      "tengo (una muela picada | un diente picado | una caries | caries | una infeccion | la cara hinchada | un absceso | la encia inflamada) #pain",
      "creo que tengo (una caries | caries | una infeccion | una muela picada) #pain",
      "tengo (un problema | problemas | una molestia) (con | en) (un diente | una muela | mis dientes | mi diente | los dientes | una encia) #pain",
      "no me duele [nada] [es] [solo | nada mas] (una | un) {reason} #nopain",
      "(ya | es) (hora | tiempo) de (una | mi) {reason}", "me toca (mi | una) {reason}",
      "(llamo | le llamo) porque (tengo [un] {reason} | @hurt (una muela | un diente | mucho) #pain | se me cayó (una | un) {reason} #filling)",
    ] },
    help_me: { patterns: ["@staff ayudar", "necesito (ayuda | su ayuda)", "[si] tengo una pregunta", "(puedo | le puedo) hacer una pregunta", "[no] solo (una pregunta | quiero preguntar algo)",
      // "¿Se le ofrece algo más?" → "Sí, una pregunta." / "Sí, otra cosa."
      "[si] [tengo] (una | otra) (pregunta | duda) [mas]", "[si] (una | otra) cosa [mas]", "[si] (quisiera | quiero | queria) preguntar (algo | otra cosa)"] },
    pain_len: { patterns: [
      "(desde hace | hace) {number} (dias | dia | semanas | semana) #h:len_days", "desde {day} [@dpart] #h:len_since",
      "desde (ayer | anoche | antier | antes de ayer | la semana pasada | el fin de semana | esta manana | hoy (en | por) la manana) [(en | por) la noche | (en | por) la tarde]",
      "(desde hace | hace) (unos dias | un par de dias | una semana | dos semanas | dos o tres dias | mucho tiempo)",
      "[ya] {number} (dias | semanas) [ya]", "(ya tiene | ya son | ya va a ser | lleva | ya lleva) @dur", "@dur [ya]",
      "llevo @dur con (dolor | la molestia | molestias | el dolor)",
      "(empezó | me empezó | me empezó a doler | comenzó) (ayer | anoche | antier | {day} | hace {number} dias | hace unos dias | esta manana) [(en | por) la noche | (en | por) la manana | (en | por) la tarde]",
      "(ayer | anoche | antier)", "(solo | nada mas) desde (ayer | anoche | esta manana)",
    ] },

    // --- new patient
    new_yes: { patterns: [
      "[si] soy [un | una] (paciente nuevo | paciente nueva | nuevo | nueva) #h:new_patient",
      "[si] (es | seria) (mi | la) primera (vez | visita | consulta) [con ustedes | ahi | alla] #h:new_first",
      "[si] primera vez", "[no] nunca (he ido | he venido | he estado) [con ustedes | ahi | alla] [antes]", "[no] nunca",
      "[no] no (he ido | he venido | he estado) [con ustedes | ahi | alla] [antes | nunca]",
      "(acabo de llegar | soy (nuevo | nueva) (aqui | en el pueblo))",
      "[no] (todavia no | aun no) [he (ido | venido)] [con ustedes] #notyet",
    ] },
    new_no: { patterns: [
      "[no] ya (he ido | he venido | he estado) [con ustedes | ahi | alla] [antes | una vez | varias veces] #h:new_before",
      "[si] ya soy paciente [de ustedes | de la doctora | de la clinica]",
      "[si] ya (fui | vine | estuve) [con ustedes | ahi | alla] [antes | una vez | el ano pasado | hace {number} (anos | meses)]",
      "[no] no soy (paciente nuevo | paciente nueva | nuevo | nueva)",
      "[no] no es (mi | la) primera (vez | visita) #notfirst",
      "[si] ya (los | las) conozco", "[si] soy paciente de la doctora [moreno]",
    ] },

    // --- identity
    intro_name: { patterns: ["(habla | le habla | mi nombre es | me llamo) {name}"] },
    name_ctx: { patterns: [
      "[mi nombre es | me llamo | soy | es | mi nombre completo es | a nombre de] {name} #h:name_mine",
      "(mi apellido es | el apellido es | apellido | mi apellido) {name} #h:name_last",
      "(mi nombre es | me llamo) {name} y mi apellido [es] {name}", "(nombre | mi nombre) {name} (apellido | y apellido | y de apellido) {name}",
      "a nombre de {name}", "{name} de apellido", "{name} (para servirle | a sus ordenes)",
    ] },
    spell_ctx: { patterns: [
      "[es | se escribe | se deletrea | asi] {letters} #h:spell_it", "{letters} (asi es | eso es)", "[mi apellido es] {name} {letters}",
      "(le | se lo) deletreo {letters}", "{name} se escribe {letters}", "[se escribe] {letters} {name}",
      // "Miller, con doble ele": the name with its tricky letters, as people clarify a spelling on the phone
      "[{name}] con {letters}", "[es] {name} con {letters}",
    ] },
    dob_ans: { patterns: [
      "(es | mi fecha de nacimiento es | naci) [el] {date} [de | del] [{year}] #h:dob_is", "naci el {date} (de | del) {year} #h:dob_born",
      "(naci | es) en {year}", "(mi fecha de nacimiento es | naci el | es el) {numdate}", "mi cumpleanos es [el] {date} [de | del] [{year}]", "(naci | es) el {date} del {number} #yy",
      // month first, as in English ("Nací junio cuatro de 1990"): understood, with a tip
      "(es | mi fecha de nacimiento es | naci) [el] {mdate} [de | del] [{year}]", "(es | mi fecha de nacimiento es | naci) [el] {mdate} del {number} #yy",
    ] },
    dob_ctx: { patterns: ["{date} [de | del] [{year}] #h:dob_is", "[el] {numdate}", "{date} del {number} #yy",
      // "El cuatro de junio, noventa"; "Junio cuatro, mil novecientos noventa" (month first, with a tip)
      "{date} {number} #yy", "{mdate} [de | del] [{year}]", "{mdate} del {number} #yy", "{mdate} {number} #yy"] },
    year_ctx: { patterns: ["[en | de | del] {year} #h:year_is", "(del | en el) {number} #yy"] },
    hold_ok_ctx: { patterns: [
      "[si | claro | si claro] (la | lo) espero #h:hold_sure", "[claro] no hay (problema | prisa) #h:hold_course",
      "(si claro | claro que si | por supuesto | con gusto | como no) [la espero]", "[si] (tomese | tomate) su tiempo", "[si] aqui (espero | estoy)",
      "[si] (puedo | le puedo) esperar", "[si] no tengo prisa", "[si] sin prisa",
    ] },
    // "¿Me espera un momentito?" → "No puedo esperar": the hold's no ("Bueno, es rapidito")
    hold_no_ctx: { patterns: [
      "no (puedo | tengo tiempo de | tengo tiempo para) esperar [mucho]", "[es que] tengo (prisa | mucha prisa)", "[es que] (estoy | ando | voy) (apurado | apurada | con prisa | de prisa)",
    ] },
    phone_ans: { patterns: [
      "mi (numero | celular | telefono | cel | whatsapp | numero de celular | numero de telefono) es [el] [mas] {digits} #h:phone_is",
      "es el [mas] {digits}", "(puede | pueden | me puede) (llamarme | marcarme | escribirme | llamar | marcar) al [mas] {digits}",
      "(llameme | marqueme) al [mas] {digits}", "[el] numero es [el] [mas] {digits}", "(celular | telefono | numero) [mas] {digits}",
      "(puede | pueden | me puede) (llamarme | marcarme | llamar) (a | al)? (este | este mismo | el mismo) numero [del que (llamo | le llamo | estoy llamando | le estoy llamando)] #this #h:phone_this",
      "(este | este mismo | el mismo) numero [esta bien | sirve | de donde llamo] #this",
      "(al | el) (numero | mismo numero) (del | de donde) [que] [le] (llamo | estoy llamando | hablo) #this",
      "(use | puede usar) (este | el mismo) numero #this",
    ] },
    phone_ctx: { patterns: ["[el] [mas] {digits}"] },
    // A visitor without a Mexican number ("No tengo celular mexicano", "Mi número es de Estados Unidos"): their own
    // country's number is fine; with the number in the same breath it is the answer
    phone_foreign_ctx: { patterns: [
      "no tengo (celular | numero | telefono | cel | numero de celular) (mexicano | de aqui | de mexico | local) [pero (tengo | uso) whatsapp]",
      "(mi | el) (numero | celular | telefono | cel) es (de | del) (estados unidos | canada | inglaterra | irlanda | australia | nueva zelanda | mi pais | otro pais | afuera) [{digits}]",
      "(es | tengo) (un | uno) (numero | celular | telefono) (de estados unidos | de canada | de inglaterra | de mi pais | de otro pais | extranjero | americano) [{digits}]",
      "(solo | nada mas | solamente) tengo (numero | celular | telefono) (de mi pais | extranjero | de estados unidos | de canada)",
      "(sirve | esta bien | puede ser) (un | uno) (numero | celular) (extranjero | de estados unidos | de canada | de otro pais)",
    ] },

    // --- insurance or paying privately
    insurance_no: { patterns: [
      "[no] no tengo [ningun] seguro [dental | medico | de gastos medicos] [todavia | aqui | en mexico] #h:ins_none",
      "[no] (voy a pagar | pago | pagaria | lo pago | lo voy a pagar) (yo | yo mismo | yo misma | particular) #h:ins_self",
      "[no] [es | seria | voy a pagar] particular", "[no] (solo | nada mas | solamente) tengo seguro de viaje",
      "[no] mi seguro es (de | del | en) (estados unidos | canada | mi pais | inglaterra | otro pais | australia)",
      "[no] (pago | voy a pagar | lo pago) (en efectivo | con tarjeta | en efectivo o con tarjeta)", "[no] sin seguro",
      "[no] [pero] [solo | nada mas | solamente] tengo (seguro de viaje | seguro de viajero)", "[no] (todavia | aun) no tengo seguro [dental | aqui]",
      "[si] (tengo seguro | tengo) [medico | de gastos medicos] pero no (dental | para el dentista)", "[si] pero no (es dental | dental)",
      // one answer each, never the insurance line and the self-pay line together: "No tengo seguro dental, pero tengo
      // seguro médico" (only the dental one counts), "Sí, tengo seguro, pero voy a pagar yo"
      "[no] no tengo seguro dental [pero] [solo | nada mas | solamente] [tengo] [seguro | uno] (medico | de gastos medicos | de viaje | de viajero)",
      "[si] tengo seguro [dental | medico] pero (voy a pagar | pago | prefiero pagar | lo voy a pagar | lo pago) (yo | particular | yo mismo | yo misma)",
      "mi seguro no (cubre | paga) (dental | lo dental | el dentista | dentista | la consulta)", "[no] no (estoy asegurado | estoy asegurada)",
    ] },
    insurance_yes: { patterns: [
      "[si] tengo [un] seguro [dental | de gastos medicos | medico] #h:ins_have", "[si] tengo (una poliza | un seguro) [dental | de gastos medicos]",
      "[si] (estoy asegurado | estoy asegurada) [por (mi trabajo | la empresa)]", "[si] mi (trabajo | empresa) me da seguro [dental]",
      // "No voy a pagar yo, tengo seguro" / "No voy a pagar particular, tengo seguro": the insurance pays (one segment,
      // so no self-pay line first)
      "[no] no (voy a pagar | pago | lo pago | lo voy a pagar) (yo | particular) [porque | ya que] (tengo [un] seguro [dental] | lo paga mi seguro | lo cubre mi seguro)",
      "(lo paga | lo cubre | lo va a pagar | paga) (mi | el) seguro",
      "[si] con (seguro | mi seguro | el seguro) [dental]", "(voy a pagar | pago | lo pago | lo voy a pagar) con (mi | el) seguro [dental]",
    ] },
    insurance_q: { patterns: [
      "(aceptan | reciben | trabajan con | toman) (seguro | seguros | mi seguro | seguro dental | seguros (americanos | extranjeros | internacionales | de estados unidos | de canada))",
      "(puedo | se puede) (usar | pagar con) (mi | un) seguro", "(mi seguro | el seguro) (lo cubre | cubre la consulta | me lo paga)",
    ] },
    cost_q: { patterns: [
      "cuanto (cuesta | cobran | sale | es) [la consulta | la valoracion | la revision | la limpieza | la cita | la primera consulta] #h:q_cost",
      "cuanto me (va a costar | va a salir | van a cobrar | cobran)", "(que | cual es el) precio (tiene | de) (la consulta | la valoracion | la limpieza | la revision)",
      "cuanto (cuesta | sale | cobran por) (una | la) {reason}", "(cual es | cuanto es) el costo [de la consulta | de la valoracion]", "es (caro | cara) [la consulta]",
      // "¿Es gratis la valoración?" gets its price (rule 11)
      "(es | sera) gratis [la consulta | la valoracion | la primera consulta | la primera vez]",
      "(la consulta | la valoracion | la primera consulta) (es gratis | tiene costo | cuesta algo | se cobra)", "tiene (costo | algun costo) [la consulta | la valoracion]",
    ] },

    // --- finding a time
    earlier: { patterns: [
      "(tiene | tienen | hay) (algo | algun espacio | alguna cita | otra cita | otro horario | lugar) (antes | mas temprano | mas pronto) #h:slot_earlier",
      "no (tiene | tienen | hay) (nada | algo) (antes | mas temprano | mas pronto)", "(algo | nada) (antes | mas pronto | mas temprano)",
      "(mas pronto | antes) (si se puede | seria mejor | si es posible)", "@soon", "es que me duele (mucho | muchisimo)",
      "(es | esa es | eso es) lo mas pronto", "(para hoy | hoy) no (hay | tiene | tienen) nada", "(tiene | tienen | hay) (algo | lugar) (para hoy | hoy)",
      "(puedo | podria) ir (antes | hoy | mas pronto)", "[me da] (la | el) primer (cita | espacio) (disponible | que tenga)", "(la | el) primera (cita | hora) (disponible | que tenga)",
      "(mientras | entre) mas pronto mejor", "(mas pronto | antes) (es | seria) mejor",
    ] },
    later: { patterns: [
      "(tiene | tienen | hay) (algo | algun espacio | otro horario) (mas tarde | (en | por) la tarde | por la tarde | (en | por) la noche | despues del trabajo) #h:slot_later",
      "(algo | mejor) (mas tarde | (en | por) la tarde | por la tarde | (en | por) la noche | por la noche | despues del trabajo)", "trabajo hasta {time}",
      "(y | que tal) (mas tarde | (en | por) la tarde | por la tarde | (en | por) la noche | por la noche | despues del trabajo)",
      "no (tiene | tienen | hay) (nada | algo) (mas tarde | (en | por) la tarde | por la tarde | (en | por) la noche)",
      "((en | por) la manana | por la manana | en las mananas | por las mananas) (trabajo | no puedo | estoy trabajando)",
      "(a esa hora | en ese horario) (trabajo | estoy trabajando) #h:slot_work", "es (muy | demasiado) temprano [para mi]",
      "(prefiero | me queda mejor | seria mejor) ((en | por) la tarde | por la tarde | mas tarde | (en | por) la noche)",
      "(salgo del trabajo | salgo de trabajar) a {time}", "despues de {time} [seria mejor | me queda mejor | puedo]",
      "(puedo | podria) (ir | llegar) (mas tarde | (en | por) la tarde | despues de {time})",
      "[si] pero ((en | por) la tarde | por la tarde | mas tarde)", "prefiero no ((en | por) la manana | temprano)",
      "no puedo ((en | por) la manana | por la manana | en las mananas | por las mananas | temprano)",
    ] },
    morning: { patterns: [
      "(tiene | tienen | hay) algo ((en | por) la manana | por la manana | temprano)", "(prefiero | mejor) ((en | por) la manana | por la manana | temprano)",
      "((en | por) la manana | por la manana | las mananas) (me queda mejor | me quedan mejor | es mejor | seria mejor)", "algo ((en | por) la manana | por la manana)",
      "[si] pero ((en | por) la manana | por la manana)", "(y | que tal) ((en | por) la manana | por la manana | temprano | mas temprano (en | por) la manana)",
      "no puedo ((en | por) la tarde | por la tarde | en las tardes | por las tardes)", "((en | por) la tarde | por la tarde | en las tardes | por las tardes) (no puedo | trabajo | estoy trabajando)",
    ] },
    // #ask: a question ("¿Tiene algo el martes?") naming the opening on offer asks again; it never books it (rule 17)
    day_req: { patterns: [
      "(puedo | podria) ir {day} [@dpart] [a {time}] [mejor | en vez] #ask #h:slot_day", "(y | que tal | y que tal) {day} [@dpart] [a {time}] #ask",
      "(tiene | tienen | hay) (algo | lugar | espacio | citas) [para] {day} [@dpart] #ask", "no (tiene | tienen | hay) (algo | nada | lugar) [para] {day} [@dpart] #ask", "mejor {day} [@dpart] [a {time}]",
      "[no] (tiene | tienen | hay) (algo | lugar | espacio | citas | nada) [para] {day} de la (proxima semana | semana que viene) [@dpart] #ask",
      "{day} [@dpart] (me queda mejor | seria mejor | es mejor | me conviene mas)", "(abren | trabajan | atienden) {day} #ask", "(prefiero | preferiria) {day} [@dpart] [a {time}]",
      "{no_day:day} no [mejor | pero] {day} [@dpart] [a {time}]", "no {no_day:day} [sino | mejor | pero] {day} [@dpart] [a {time}]",
      "{no_day:day} no (puedo | me queda | me sirve) [pero] [y | que tal | mejor | puede ser] {day} [@dpart] [a {time}]",
      "(se puede | puede ser) {day} [@dpart] [a {time}] #ask", "(y | que tal | puede ser) {day} de la (proxima semana | semana que viene) [@dpart] [a {time}] #ask",
      "[mejor] {day} de la (proxima semana | semana que viene) [@dpart] [a {time}]", "(la puedo | puedo | me la puede | la puede | podria) (cambiar | pasar | mover) (para | a | al) {day} [@dpart] #ask",
    ] },
    time_req: { patterns: [
      "(puedo | podria) ir a {time}", "(y | que tal) a {time}", "(tiene | hay) algo a {time}", "a {time} (seria mejor | me queda mejor | es mejor)",
      "(se puede | puede ser) a {time}", "(me queda mejor | seria mejor | es mejor | prefiero | mejor) a {time}",
    ] },
    // A bare day or time at the time question: Lorena's offer repeated is a yes (a typed question asks again); another
    // one is a request. "El martes 11": the weekday counts (the game has no calendar).
    pick_ctx: { patterns: ["[para] {day} [@dpart] [a {time}]", "a {time}", "[para] {day} @dpart", "[para] {day} {number} [de @month] [@dpart] [a {time}]"] },
    // After "Tengo X o Y": "El primero", "La segunda", "El del jueves", "El de la noche", "El de las siete", "Cualquiera",
    // "Ninguno de los dos"
    choose_ctx: { patterns: [
      "[@pick] (el | la) (primero | primera | primer horario | primera opcion) #first", "[@pick] (el | la) (segundo | segunda | segundo horario | segunda opcion | ultimo | ultima) #second",
      "[@pick] (primero | primera) #first", "[@pick] (segundo | segunda) #second",
      // "El segundo no": the other one, asked (the handler reads the "no")
      "[no] (el | la) (primero | primera | primer horario | primera opcion) no [me queda | me sirve | puedo] #first", "[no] (el | la) (segundo | segunda | segundo horario | segunda opcion | ultimo | ultima) no [me queda | me sirve | puedo] #second",
      "[@pick] (el | la) [cita | opcion | horario] (de | del) {day} [@dpart] [a {time}]", "[@pick] (el | la) [cita | opcion | horario] (de | del) {day} de {time}",
      "[@pick] (el | la) [cita | opcion | horario] (de | a) {time}",
      "[@pick] (el | la) [cita | opcion | horario] de la (manana #am | tarde #tarde | noche #noche)", "[@pick] (el | la) [cita | opcion | horario] (en la | por la) (manana #am | tarde #tarde | noche #noche)",
      "(cualquiera | cualquiera de los dos | cualquiera de las dos | el que sea | la que sea | cualquier dia | cuando sea | lo que tenga | el que usted diga | la que usted diga | como usted diga) [esta bien | me queda | me sirve] #any",
      "[(cualquiera | cualquier hora | cualquier dia)] me (da igual | da lo mismo) #any", "(da igual | da lo mismo) #any",
      "[no] (ninguno | ninguna) [de los dos | de las dos | de esos | de esas] [me queda | me sirve | me conviene] #none",
    ] },
    // Not a yes yet: "Puede ser", "Tal vez", "A lo mejor" (Lorena asks again); "Déjeme ver mi agenda" (she waits)
    maybe_ctx: { patterns: [
      "(puede ser | tal vez | a lo mejor | quizas | quiza | posiblemente | probablemente)", "creo que (puede ser | tal vez)",
      "(dejeme | permitame | deje) (ver | pensarlo | pensar | checar | revisar | consultar) [mi agenda | mi calendario] #think", "(lo | la) (pienso | voy a pensar | tengo que pensar) #think",
      "(un momento | un segundo | un momentito) (dejeme ver | reviso mi agenda | checo mi agenda) #think", "[a ver] (dejeme | deje) ver #think",
    ] },
    // "¿A qué hora?", "¿Qué día dijo?", "¿Me repite el día y la hora?", "¿Para cuándo quedó mi cita?"
    when_q: { patterns: [
      "[perdon] [y] a que hora [seria | es | era | dijo | me dijo]", "[perdon] [y] (que dia | cuando) [seria | es | era | dijo | me dijo]",
      "[y] {day} a que hora", "[y] a que hora {day}",
      "(a que hora | que dia | cuando) (es | era | seria | quedó | queda) [mi | la] cita", "para (que dia | cuando) (quedó | queda | es | seria | era) [mi | la] [cita]",
      "(me repite | me puede repetir | me podria repetir | me confirma | me puede confirmar | me podria confirmar | me dice) (el dia y la hora | la fecha y la hora | el dia | la hora | la fecha | la cita) [de mi cita | de la cita]",
    ] },
    // A calendar date at the time question ("¿Tiene algo el 12 de noviembre?"): that day is full; the offer again
    date_ctx: { patterns: [
      "[no] (tiene | tienen | hay) (algo | lugar | espacio | citas | alguna cita | nada) [disponible] [para] el {date}", "[y] [para] el {date}", "(puedo | podria) ir el {date}",
      "[mejor] [para] el {date} [@dpart] [a {time}]", "(se puede | puede ser) el {date}",
    ] },
    accept: { patterns: [
      "[si] (me queda bien | me sirve | me parece bien | esta perfecto | me viene bien | me conviene | me late) #h:slot_ok",
      "{day} [@dpart] [a {time}] (esta bien | esta perfecto | me queda bien | me sirve | me parece bien | perfecto | me viene bien) #h:slot_perfect",
      "a {time} (esta bien | esta perfecto | me queda bien | me sirve | me parece bien | perfecto)",
      "[si] ahi (estare | voy a estar) [sin falta]", "[si] (apuntemela | agendemela | apartemela | reservemela | apunteme | agendeme)",
      "[si] (me la quedo | la tomo | la acepto)", "[si] (esa | ese) (esta bien | me queda | me sirve)", "[si] (agendela | apuntela | reservela)",
      "trato hecho", "[si] (perfecto | muy bien) ahi nos vemos",
    ] },
    reject: { patterns: [
      "(no me queda | no me sirve | no puedo | no me conviene | no me viene bien | no me va bien) [ir] [ese dia | a esa hora | {day} | a {time}] #h:slot_no",
      "(ese dia | a esa hora | ese horario | esa hora | esa fecha | {day} | a {time}) no (puedo | me queda | me sirve | me conviene | me viene bien | me va bien)",
      "(ese dia | {day}) (trabajo | tengo trabajo | estoy (ocupado | ocupada))",
      "(hay | tiene | tienen) (otro (dia | horario) | otra (opcion | fecha | hora))",
      "[no] (ese dia | esa hora | a esa hora | {day}) no", "no tengo tiempo [ese dia | a esa hora | {day}]",
      "[no] mejor (otro dia | otra hora | otro horario | otra fecha)", "no me (queda | sirve) [bien] {day} [a {time}]",
      "[no] tampoco (me queda | me sirve | puedo | me conviene) [ese dia | a esa hora | {day} | a {time}]",
      "(ese | esa | ese dia | esa hora | ese horario | {day}) tampoco [me queda | me sirve | puedo]", "[no] (ninguno | ninguna) (me queda | me sirve)", "[no] tampoco",
      // "Me queda bien el martes, pero no a las diez": that opening is a no
      "[si] (me queda bien | me sirve | puedo) [ese dia | el dia | {day}] pero no a (esa hora | {time})", "[si] (el dia | ese dia) si pero (la hora | a esa hora) no",
    ] },
    availability_q: { patterns: [
      "que (horarios | dias | horas) (tiene | tienen | hay) [disponibles | libres]", "(cuando | que dia) (puedo ir | tiene lugar | hay lugar | tiene espacio)",
      "que tiene [disponible]", "que otros (horarios | dias) (tiene | hay)", "que (mas | otra cosa) tiene",
    ] },
    hours_q: { patterns: [
      "cual es su horario [de atencion]", "a que hora (abren | cierran)", "(que | cual es el) horario (tienen | de atencion)",
      "(hasta | desde) que hora (atienden | abren | trabajan)", "que dias (abren | trabajan | atienden)",
    ] },

    // --- phone line
    speak_up: { patterns: [
      "[perdon] @staff hablar mas (fuerte | alto) #h:ph_speak_up", "hable mas (fuerte | alto)",
      "no (le | la | lo) (escucho | oigo) [bien | muy bien | nada]", "[perdon] (se esta cortando | se corta | se oye (mal | muy mal | cortado | entrecortado) | se escucha (mal | muy mal | cortado | entrecortado)) [la llamada | la linea] #h:ph_breaking",
      "la (llamada | linea | senal) (se esta cortando | esta muy mal | se oye mal | se corta | esta fallando)", "no se (oye | escucha) [bien | nada]",
      "(sigue | todavia se oye | se sigue oyendo | se sigue escuchando) (mal | cortado | entrecortado)", "[no] (todavia no | aun no) (se oye | se escucha | la escucho | la oigo | lo escucho | lo oigo) [bien]", "[no] sigue igual",
    ] },
    hear_me: { patterns: ["[ya | ahora] me @hear [ahora | bien | ya] #h:ph_hear", "(bueno | alo | oiga | diga) [bueno] (me escucha | me oye | sigue ahi | esta ahi)", "(sigue | esta) ahi", "(asi | ahora) (esta mejor | se oye mejor | me escucha mejor)"] },
    hear_ok: { patterns: [
      "[si] (ya | ahora) (la | lo | le) (escucho | oigo) [bien | mejor] #h:hear_now", "[si] (mucho | ya | ahora) mejor #h:hear_better", "[si] ahora si",
      "[si] ya (se oye | se escucha) [bien | mejor]", "[si] (perfectamente | fuerte y claro)", "[si] (la | lo) escucho (bien | perfectamente)",
    ] },

    // --- questions
    address_q: { patterns: ["cual es (la | su) direccion #h:q_address", "donde (estan | queda el consultorio | esta el consultorio | esta la clinica | queda la clinica | se encuentran | quedan)", "como llego", "(me da | me puede dar) la direccion", "donde (estan | se encuentran) (ubicados | ubicadas)", "(cual es | me da) [la | su] ubicacion",
      "en que calle (estan | esta | queda | quedan | se encuentran)", "(me repite | me puede repetir | me manda | me puede mandar | me podria mandar) la (direccion | ubicacion) [por (whatsapp | mensaje)]",
      "(cerca de que | por donde) (estan | esta | queda | quedan)", "[en] [la] calle hidalgo [numero] [{number}]", "donde (queda | esta) la calle hidalgo"] },
    // "¿Con quién hablo?": Lorena's name (one of her greetings doesn't say it)
    name_q: { patterns: ["con quien (hablo | tengo el gusto)", "quien habla", "(como se llama usted | usted como se llama)", "cual es su nombre", "[perdon] como dijo que se llama"] },
    parking_q: { patterns: ["donde (me puedo estacionar | puedo estacionarme | puedo estacionar) [el carro] #h:q_park", "(hay | tienen) estacionamiento", "donde (dejo | puedo dejar) el carro"] },
    duration_q: { patterns: ["cuanto [tiempo] (dura | tarda | se tarda) [la cita | la consulta | la limpieza | la valoracion] #h:q_long", "cuanto tiempo (va a durar | voy a estar ahi)"] },
    bring_q: { patterns: ["que (tengo que | debo | necesito) llevar #h:q_bring", "(tengo que | necesito | debo) llevar (algo | identificacion | mi identificacion | mi pasaporte | radiografias | algun documento)"] },
    cancel_policy_q: { patterns: [
      "(y si | que pasa si) (tengo que | necesito) cancelar", "(y si | que pasa si) (cancelo | no puedo ir | no llego | llego tarde)",
      "puedo cancelar (despues | mas tarde | si no puedo ir)", "(cobran | hay cargo | hay que pagar) (por | si) (cancelar | cancelo)", "(hay | tienen) [alguna] politica de cancelacion",
    ] },
    forms_q: { patterns: ["(tengo que | hay que | necesito) llenar (algo | algun formulario | papeles | un formulario | algun formato)", "(hay | tienen) (formularios | papeles) [que llenar]"] },
    doctor_q: { patterns: ["quien es (el dentista | la dentista | el doctor | la doctora)", "(con que | con cual) (doctor | doctora | dentista)", "como se llama (el doctor | la doctora | el dentista | la dentista)", "quien me va a atender"] },
    pain_q: { patterns: ["que (puedo | debo) tomar para el dolor [mientras tanto]", "(puedo | debo) tomar (algo | un analgesico | ibuprofeno | una pastilla) [para el dolor]", "que hago (mientras tanto | con el dolor)"] },
    pay_q: { patterns: ["(aceptan | reciben) (tarjeta | tarjeta de credito | efectivo | dolares | transferencia) #h:q_pay", "como (puedo pagar | se paga)", "(se puede | puedo) pagar con (tarjeta | dolares)"] },
    english_q: { patterns: ["(la doctora | el doctor | el dentista | la dentista | alguien) habla ingles #h:q_english", "hablan ingles", "(hay | tienen) alguien que hable ingles", "no hablo (bien | mucho) [el] espanol (la doctora | el doctor | el dentista | alguien) habla ingles"] },

    // --- rescheduling (twist)
    move: { patterns: [
      "tengo (una | mi) cita (manana | {day} | para manana | para {day}) [a {time}] [y] (quisiera | quiero | necesito) (cambiarla | moverla | reprogramarla | pasarla) [para {target:day} @dpart] #h:move_have",
      "tengo (una | mi)? cita (manana | {day}) [y] (la puedo | puedo | podria) (cambiar | pasar | mover) [para | a | al] [{target:day} @dpart]",
      "(puedo | podria) (cambiar | mover | reprogramar | pasar) (mi | la) cita [para {target:day} @dpart | para otro dia] #h:move_could",
      "(quisiera | quiero | necesito | me gustaria) (cambiar | mover | reprogramar | pasar) (mi | la) cita [para {target:day} @dpart | para otro dia] #h:move_like",
      "tengo (una | mi) cita (manana | {day}) [a {time}] [pero] (no voy a poder | no puedo) (ir | llegar)",
      "(manana | {day}) no (voy a poder | puedo) (ir | llegar) a (mi | la) cita", "(manana | {day}) no (voy a poder | puedo) (ir | llegar)",
      "(quisiera | quiero | necesito | puedo | podria) (cambiar | mover) (la fecha | la hora | el dia | el horario) de (mi | la) cita", "no voy a poder (ir | llegar) a mi cita [de manana]",
      "(se me presentó | me surgió | se me atravesó) (algo | un imprevisto | un compromiso)",
      "(quisiera | quiero | necesito) (otro dia | otra fecha | otro horario) para mi cita",
      "[mejor] (cambiela | cambiemela | muevala | pasela | reprogramela) [para otro dia | para {target:day} @dpart]",
      "no (quiero | necesito) (cancelar | cancelarla) [mi cita | la cita] [solo | nada mas] (quiero | quisiera | necesito) (cambiar | mover | cambiarla | moverla) [mi | la] [cita] [para {target:day} @dpart | para otro dia]",
    ] },
    cancel: { patterns: [
      "(quisiera | quiero | necesito | tengo que | me gustaria) cancelar (mi | la) cita [de manana | de {day}]", "@staff cancelar (mi | la) cita",
      "(puedo | podria) cancelar (mi | la) cita", "cancele mi cita",
      "[no] [solo | nada mas | mejor] (cancelela | cancelemela) [por favor]", "[no] (solo | nada mas) (quiero | quisiera | necesito) cancelarla",
      // "Sí, quiero cancelarla" at "¿Quiere cambiarla?": the yes is to canceling
      "si (quiero | quisiera | necesito) cancelarla [por favor]",
    ] },
    // After asking to change a time just booked: keep the one booked
    keep_appt: { patterns: [
      "[no] [mejor] (dejela | dejemela) (como (estaba | esta) | asi | igual) [por favor]", "[no] mejor (dejela | dejemela) [por favor]",
      "[no] [mejor] (la dejo | la dejamos) (como (estaba | esta) | asi | igual)", "[no] mejor no la (cambie | cambio | cambiamos | mueva | muevo)",
      "[no] [mejor] (dejela | dejemela) [para] {day} [a {time}]", "[no] mejor me quedo con (la | la cita | la de | la del) [{day}] [a {time}]",
    ] },

    // --- general
    more_no: { patterns: [
      "[no] (eso es | es) todo #h:more_all", "[no] nada mas", "[no] (seria | eso seria) todo", "por ahora (es todo | nada mas)", "ya con eso",
      "[no] no necesito nada mas", "[no] (estoy bien | asi estoy bien)", "[no] (eso | es) seria todo", "[muchas | mil] gracias (es | eso es | eso seria | seria) todo",
      "[no] (ninguna otra cosa | ninguna otra pregunta | otra cosa no | nada mas por ahora)",
    ] },
    see_you: { patterns: ["(nos vemos | hasta) {day} #h:see_you", "(ahi | alla) nos vemos [entonces | {day}]", "nos vemos (entonces | pronto)", "(entonces | perfecto | muy bien) nos vemos [{day}]"] },
  },

  lines: {
    greet: [
      t("Clínica Dental Coral, | buenos días, | le | atiende | Lorena. | ¿En | qué | le | puedo | ayudar?",
        "Coral Dental Clinic, | good morning, | you | is helping | Lorena. | In | what | (to) you | can I | help?",
        "Coral Dental Clinic, good morning, this is Lorena. How can I help you?",
        { flags: { 2: "le atiende Lorena: on the phone, “Lorena is here to help you” (the subject comes last)." } }),
      t("Clínica Dental Coral, | buenas tardes. | ¿En | qué | le | puedo | servir?", "Coral Dental Clinic, | good afternoon. | In | what | (to) you | can I | serve?",
        "Coral Dental Clinic, good afternoon. How may I help you?"),
      t("Buenos días, | Clínica Dental Coral, | habla | Lorena. | ¿Cómo | le | puedo | ayudar?", "Good morning, | Coral Dental Clinic, | speaking | Lorena. | How | (to) you | can I | help?",
        "Good morning, Coral Dental Clinic, Lorena speaking. How can I help you?", { flags: { 2: "habla + name: on the phone, “… speaking”." } }),
    ],
    ask_help: [
      t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?"),
      t("Dígame, | ¿qué | se le ofrece?", "Tell me, | what | do you need?", "Yes, what can I do for you?", { flags: { 2: "¿Qué se le ofrece?: a polite Mexican “What can I do for you?”" } }),
    ],
    ask_reason: [
      t("Claro. | ¿Es | para | una | revisión, | o | tiene | alguna | molestia?", "Sure. | Is it | for | a | checkup, | or | do you have | some | discomfort?",
        "Sure. Is it for a checkup, or is something bothering you?", { flags: { 8: "molestia: discomfort; doctors' offices use it for any pain or problem." } }),
      t("Con gusto. | ¿Cuál | es | el | motivo | de | la | consulta?", "Gladly. | What | is | the | reason | for | the | appointment?", "Of course. What's the reason for the visit?", { spain: t("Muy bien. | ¿Cuál | es | el | motivo | de | la | consulta?", "Very well. | What | is | the | reason | for | the | appointment?", "Of course. What's the reason for the visit?") }),
    ],
    reason_ok: [
      t("Muy | bien.", "Very | good.", "Okay."),
      t("Perfecto.", "Perfect.", "Perfect."),
      t("De acuerdo.", "All right.", "All right."),
    ],
    ask_pain_len: [
      t("¿Desde | cuándo | le duele?", "Since | when | does it hurt you?", "How long has it been hurting?"),
      t("¿Desde | cuándo | tiene | la | molestia?", "Since | when | do you have | the | discomfort?", "How long have you had the pain?"),
    ],
    noted: [
      t("Ajá, | entiendo.", "Uh-huh, | I understand.", "I see."),
      t("Muy | bien, | ya | lo | anoté.", "Very | good, | already | it | I-wrote-down.", "Okay, I've made a note of it."),
    ],
    // In Mexico "¡Qué pena!" first means "how embarrassing", so Lorena says she's sorry
    sorry_pain: [
      t("¡Ay, | lo siento!", "Oh, | I'm sorry!", "Oh, I'm sorry to hear that."),
      t("¡Uy, | qué | mal!", "Oof, | how | bad!", "Oh no, that's no good."),
    ],
    pain_soon: [t("Bueno, | vamos | a | buscarle | algo | pronto.", "Well, | we're going | to | find you | something | soon.", "Okay, let's find you something soon.")],
    ask_new: [
      t("¿Es | su | primera | vez | con | nosotros?", "Is it | your | first | time | with | us?", "Is this your first time with us?"),
      t("¿Y | es | su | primera | vez | con | nosotros?", "And | is it | your | first | time | with | us?", "And is this your first visit with us?"),
    ],
    ask_before: [
      t("¿Ya | había venido | antes | con | nosotros?", "Already | had you come | before | with | us?", "Have you been to see us before?",
        { flags: { 1: "había venido: the past perfect, a polite and common way to ask this in Mexico." } }),
    ],
    new_welcome: [
      t("Perfecto, | {m:bienvenido|f:bienvenida}.", "Perfect, | welcome.", "Great, welcome!"),
      t("Muy | bien. | Entonces | le | abro | su | expediente.", "Very | good. | Then | (for) you | I'll-open | your | file.", "Okay. Then I'll open a patient file for you."),
    ],
    // "No es mi primera vez" after "¿Ya había venido antes?": without its comma it could be either answer
    amb_first: [t("Perdón, | entonces, | ¿es | su | primera | vez | con | nosotros?", "Sorry, | so, | is it | your | first | time | with | us?", "Sorry, so is this your first time with us?")],
    old_welcome: [t("¡Qué | gusto! | {m:Bienvenido|f:Bienvenida} | de nuevo.", "How | nice! | Welcome | again.", "How nice! Welcome back.", { spain: t("¡Qué | bien! | {m:Bienvenido|f:Bienvenida} | de nuevo.", "How | good! | Welcome | again.", "How nice! Welcome back.") })],
    ask_name: [
      t("¿Me | da | su | nombre | completo, | por favor?", "(To) me | you-give | your | name | full, | please?", "Can I have your full name, please?"),
      t("¿A nombre de | quién | hago | la | cita?", "Under the name of | whom | do I make | the | appointment?", "What name should I put the appointment under?"),
    ],
    ask_surname: [t("¿Y | su | apellido?", "And | your | last name?", "And your last name?")],
    ask_spell: [
      t("¿Me | lo | deletrea, | por favor?", "(To) me | it | you-spell, | please?", "Could you spell that for me, please?"),
      t("¿Cómo | se escribe | su | apellido?", "How | is spelled | your | last name?", "How do you spell your last name?"),
    ],
    spell_again: [
      t("Perdón, | ¿me | lo | deletrea | otra vez, | más | despacito?", "Sorry, | (to) me | it | you-spell | again, | more | slowly?",
        "Sorry, could you spell it again, a little more slowly?", { flags: { 6: "despacito: the diminutive of despacio; it sounds softer." } }),
    ],
    // the spelling asked again after another answer (same words as ask_spell, so the same recording)
    ask_spell_again: [t("¿Me | lo | deletrea, | por favor?", "(To) me | it | you-spell, | please?", "Could you spell that for me, please?")],
    go_ahead: [
      t("Sí, | dígame.", "Yes, | tell me.", "Yes, go ahead."),
      t("Claro, | adelante.", "Sure, | go ahead.", "Sure, go ahead."),
    ],
    spell_thanks: [
      t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you."),
      t("Muy | bien, | ya | lo | tengo.", "Very | good, | already | it | I-have.", "Okay, I've got it."),
    ],
    ask_dob: [
      t("¿Y | su | fecha | de | nacimiento?", "And | your | date | of | birth?", "And your date of birth?"),
      t("¿Me | da | su | fecha | de | nacimiento, | por favor?", "(To) me | you-give | your | date | of | birth, | please?", "Can I have your date of birth, please?"),
    ],
    ask_year: [t("¿Y | el | año?", "And | the | year?", "And the year?")],
    dob_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Perfecto.", "Perfect.", "Perfect.")],
    ask_phone: [
      t("¿Me | da | un | número | de | celular | para | {m:contactarlo|f:contactarla}?", "(To) me | you-give | a | number | of | cell phone | to | contact you?",
        "Can I have a cell phone number to reach you?", { flags: { 7: "contactarlo / contactarla: lo for a man, la for a woman." }, spain: t("¿Me | da | un | número | de | móvil | para | {m:contactarlo|f:contactarla}?", "(To) me | you-give | a | number | of | cell phone | to | contact you?", "Can I have a cell phone number to reach you?") }),
      t("¿Y | un | teléfono, | por favor?", "And | a | phone number, | please?", "And a phone number, please?"),
    ],
    phone_thanks: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thank you.")],
    // "No tengo celular mexicano": a number from the learner's own country does
    phone_any: [t("No se preocupe, | puede | ser | el | de | su | país.", "Don't worry, | it can | be | the one | from | your | country.", "Don't worry, your number from home is fine.")],
    // a number read in pieces ("nueve ochenta y cuatro…"): Lorena waits for the rest
    phone_more: [t("Ajá...", "Uh-huh...", "Uh-huh, go on.")],
    breaking_up: [
      t("Disculpe, | se está cortando | la | llamada. | ¿Me | lo | repite?", "Excuse me, | is breaking up | the | call. | (To) me | it | you-repeat?",
        "Sorry, the call is breaking up. Could you say that again?"),
      t("Perdón, | se oye | entrecortado. | ¿Me | lo | puede | repetir?", "Sorry, | it sounds | choppy. | (To) me | it | can you | repeat?", "Sorry, the line is breaking up. Could you repeat that?"),
    ],
    speak_up_ok: [
      t("¡Perdón! | ¿Así | me | escucha | mejor?", "Sorry! | Like this | me | do you hear | better?", "Sorry! Can you hear me better now?"),
      t("¿Bueno? | ¿Ahora sí | me | escucha?", "Hello? | Now | me | do you hear?", "Hello? Can you hear me now?",
        { flags: { 0: "Mexican: ¿Bueno? is how Mexicans say hello on the phone and check the line.", 1: "ahora sí: “now (at last)”; sí adds emphasis, not yes." },
          neutral: t("¿Hola? | ¿Ahora sí | me | escucha?", "Hello? | Now | me | do you hear?", "Hello? Can you hear me now?", { flags: { 1: "ahora sí: “now (at last)”; sí adds emphasis, not yes." } }), spain: t("¿Oiga? | ¿Me | oye | ahora?", "Hello? | Me | do you hear | now?", "Hello? Can you hear me now?") }),
    ],
    hear_you: [
      t("Sí, | {m:lo|f:la} | escucho | bien.", "Yes, | you | I-hear | well.", "Yes, I can hear you fine.", { flags: { 1: "lo / la: “you” (usted), lo for a man and la for a woman." } }),
      t("Sí, | perfectamente.", "Yes, | perfectly.", "Yes, loud and clear."),
    ],
    hear_great: [t("¡Qué | bueno!", "How | good!", "Great!", { spain: t("¡Qué | bien!", "How | good!", "Great!") })],
    ask_insurance: [
      t("¿Tiene | algún | seguro | dental, | o | va | a | pagar | particular?", "Do you have | any | insurance | dental, | or | are you going | to | pay | privately?",
        "Do you have dental insurance, or will you be paying yourself?", { flags: { 8: "particular: paying privately, without insurance. Most patients in Mexico pay this way." } }),
    ],
    selfpay: [
      t("Sin problema. | La | consulta | de | valoración | cuesta | {$price}.", "No problem. | The | appointment | of | assessment | costs | {$price}.",
        "No problem. The first exam is {$price}.", { flags: { 4: "valoración: the first exam, where the dentist checks your teeth and says what you need." } }),
    ],
    price_info: [
      t("La | valoración | cuesta | {$price}. | Si | necesita | algún | tratamiento, | la | doctora | le | da | un | presupuesto.",
        "The | first exam | costs | {$price}. | If | you need | some | treatment, | the | doctor | (to) you | gives | a | quote.",
        "The first exam is {$price}. If you need any treatment, the dentist will give you a quote."),
    ],
    insurance_card: [t("Muy | bien. | Traiga | los | datos | de | su | seguro, | por favor.", "Very | good. | Bring | the | details | of | your | insurance, | please.", "Great. Please bring your insurance information.")],
    hold_q: [
      t("Permítame | revisar | la | agenda. | ¿Me | espera | un | momentito?", "Allow me | to check | the | schedule. | (For) me | will you wait | a | little moment?",
        "Let me check the schedule. Can you hold for a moment?", { flags: { 7: "momentito: the diminutive of momento; it sounds friendlier." } }),
      t("Ahorita | reviso | la | agenda. | ¿Me | espera | un | momentito?", "Right now | I-check | the | schedule. | (For) me | will you wait | a | little moment?",
        "I'll check the schedule right now. Can you hold for a moment?", { flags: { 0: "Mexican: ahorita means right now here.", 7: "momentito: the diminutive of momento; it sounds friendlier." },
          neutral: t("Enseguida | reviso | la | agenda. | ¿Me | espera | un | momentito?", "Right away | I-check | the | schedule. | (For) me | will you wait | a | little moment?",
            "I'll check the schedule right away. Can you hold for a moment?", { flags: { 7: "momentito: the diminutive of momento; it sounds friendlier." } }) }),
    ],
    hold_thanks: [t("Gracias | por | esperar.", "Thank you | for | waiting.", "Thanks for holding.")],
    hold_quick: [t("Bueno, | es | rapidito.", "Okay, | it's | very quick.", "Okay, I'll be quick.", { flags: { 2: "rapidito: the diminutive of rápido, “real quick”." } })],
    offer: [
      t("¿Qué tal | {$slot}?", "How about | {$slot}?", "How about {$slot}?"),
      t("Tengo | un | espacio | {$slot}. | ¿Le | queda | bien?", "I have | an | opening | {$slot}. | (For) you | does it suit | well?", "I have an opening {$slot}. Does that work for you?"),
      t("Le | puedo | dar | {$slot}. | ¿Le | sirve?", "(To) you | I can | give | {$slot}. | (To) you | does it work?", "I can give you {$slot}. Does that work?",
        { flags: { 5: "¿Le sirve?: “does it work for you?”, very common in Mexico." } }),
    ],
    offer_again: [t("Entonces, | ¿le | aparto | {$slot}?", "So, | (for) you | should I hold | {$slot}?", "So, should I put you down for {$slot}?")],
    move_offer: [
      t("A ver... | ¿Qué tal | el | jueves | en la tarde, | a | las | cuatro | y media?", "Let's see... | How about | — | Thursday | in the afternoon, | at | — | four | thirty?",
        "Let's see... How about Thursday afternoon, at four thirty?",
        { flags: { 2: "el before a weekday = on; English needs no word here.", 6: "Spanish uses an article before clock times; English has no separate word." }, spain: t("A ver... | ¿Qué tal | el | jueves | por la tarde, | a | las | cuatro | y media?", "Let's see... | How about | — | Thursday | in the afternoon, | at | — | four | thirty?", "Let's see... How about Thursday afternoon, at four thirty?") }),
    ],
    earliest: [t("Lo siento, | es | lo | más | pronto | que | tengo.", "I'm sorry, | it's | the | most | soon | that | I have.", "I'm sorry, that's the earliest I have.",
      { flags: { 2: "lo makes más pronto a noun phrase: the soonest." } })],
    no_today: [t("Lo siento, | hoy | ya | no tenemos | lugar.", "I'm sorry, | today | already | we don't have | room.", "I'm sorry, we're fully booked today.")],
    latest: [t("Lo siento, | nuestra | última | cita | es | a | {$at}.", "I'm sorry, | our | last | appointment | is | at | {$at}.", "I'm sorry, our last appointment is at {$at}.")],
    closed_weekend: [
      t("Lo siento, | el | sábado | ya | está | lleno, | y | los | domingos | no abrimos.", "I'm sorry, | — | Saturday | already | is | full, | and | on | Sundays | we don't open.",
        "I'm sorry, Saturday is already full, and we're closed on Sundays.", { flags: { 1: "el before a weekday = on; English needs no word here.", 7: "los + a weekday in the plural = every week on that day." } }),
    ],
    day_full: [t("Lo siento, | ese | día | ya | no tengo | lugar.", "I'm sorry, | that | day | already | I don't have | room.", "I'm sorry, that day is already full.")],
    // a calendar date asked for at the start of the call ("…para el 12 de noviembre"), when Lorena first offers a time
    date_full: [t("Lo siento, | para | la | fecha | que | me | pidió | ya | no tengo | lugar.", "I'm sorry, | for | the | date | that | (of) me | you-asked-for | already | I don't have | room.",
      "I'm sorry, I'm already full on the date you asked for.")],
    not_that_time: [t("Mmm, | a | esa | hora | no tengo | nada.", "Hmm, | at | that | time | I don't have | anything.", "Hmm, I don't have anything at that time.")],
    availability: [t("Tengo | {$slot} | o | {$slot2}.", "I have | {$slot} | or | {$slot2}.", "I have {$slot} or {$slot2}.", { say: "Tengo {$slot} o {$slot2}." })],
    booked: [
      t("¡Listo! | Queda | su | cita | {$slot}.", "Done! | Is set | your | appointment | {$slot}.", "All set! Your appointment is {$slot}."),
      // "para": without it, "le agendo la cita mañana…" could be heard as booking it tomorrow
      t("Perfecto, | le | agendo | la | cita | para | {$slot}.", "Perfect, | (for) you | I-book | the | appointment | for | {$slot}.", "Perfect, I'll book you in for {$slot}."),
    ],
    appt_set: [t("Su | cita | ya | quedó | {$slot}.", "Your | appointment | already | is set for | {$slot}.", "Your appointment is already set for {$slot}.")],
    moved: [t("Listo, | su | cita | queda | cambiada | para | {$slot}.", "Done, | your | appointment | is | changed | to | {$slot}.", "Done! Your appointment is now {$slot}.")],
    text_reminder: [t("Un | día | antes | le | mandamos | un | mensaje | para | confirmar.", "One | day | before | (to) you | we-send | a | message | to | confirm.", "We'll send you a text the day before to confirm.")],
    arrive_early: [
      t("Le | pido | que | llegue | diez | minutos | antes | para | llenar | su | historia clínica.", "(Of) you | I-ask | that | you-arrive | ten | minutes | early | to | fill out | your | medical history.",
        "Please arrive ten minutes early to fill out your medical history form.", { flags: { 3: "llegue: the subjunctive, used after pido que (I ask that)." } }),
    ],
    bring_id: [
      t("Le | pido | que | llegue | puntual; | tenemos | quince | minutos | de | tolerancia.", "(Of) you | I-ask | that | you-arrive | on time; | we have | fifteen | minutes | of | leeway.",
        "Please be on time; we can only wait fifteen minutes for late arrivals.", { flags: { 9: "tolerancia: how late you can arrive before the appointment is lost." } }),
    ],
    anything_else: [
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Anything | else | in | which | (to) you | I can | help?", "Is there anything else I can help you with?"),
      t("¿Se le ofrece | algo | más?", "Do you need | anything | else?", "Anything else I can do for you?", { flags: { 0: "¿Se le ofrece…?: very polite and common in Mexico: is there anything you need?" } }),
    ],
    anything_else_yes: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, what can I do for you?")],
    see_you: [
      t("¡{m:Lo|f:La} | esperamos | {$day}! | Que | le | vaya | bien.", "You | we-expect | {$day}! | May | (to) you | it-go | well.", "We'll see you {$day}! Take care.",
        { flags: { 0: "lo / la: “you” (usted), lo for a man and la for a woman." } }),
      t("Gracias | por | llamar. | ¡Nos vemos | {$day}!", "Thank you | for | calling. | See you | {$day}!", "Thanks for calling. See you {$day}!"),
    ],
    bye_plain: [t("Gracias | por | llamar. | ¡Que | le | vaya | bien!", "Thank you | for | calling. | May | (to) you | it-go | well!", "Thanks for calling. Take care!")],

    // info
    // calle Hidalgo runs a block from the zócalo, across avenida Juárez (docs/es/TOWN.md "Getting around"; the office
    // itself is not built: a phone call)
    address: [
      t("Estamos | en | la | calle | Hidalgo | número | 12, | a | una | cuadra | del | zócalo.", "We are | on | — | street | Hidalgo | number | 12, | at | one | block | from the | main square.",
        "We're at 12 Hidalgo Street, a block from the main square.",
        { say: "Estamos en la calle Hidalgo número doce, a una cuadra del zócalo.", write: "Clínica Dental Coral · calle Hidalgo 12", spell: "Hidalgo",
          flags: { 2: "Spanish puts la before calle; English has no word here." }, spain: t("Estamos | en | la | calle | Hidalgo | número | 12, | a | una | calle | del | zócalo.", "We are | on | — | street | Hidalgo | number | 12, | at | one | street | from the | main square.", "We're at 12 Hidalgo Street, a block from the main square.", { say: "Estamos en la calle Hidalgo número doce, a una calle del zócalo." }) }),
    ],
    parking: [t("Puede | estacionarse | en | la | calle, | enfrente | del | consultorio.", "You can | park | on | the | street, | in front | of the | office.", "You can park on the street, right in front of the office.", { spain: t("Puede | aparcar | en | la | calle, | enfrente | del | consultorio.", "You can | park | on | the | street, | in front | of the | office.", "You can park on the street, right in front of the office.") })],
    duration: [t("Más o menos | una | hora, | por | ser | primera | vez.", "More or less | an | hour, | for | being | first | time.", "About an hour, since it's your first visit.")],
    duration_short: [t("Como | media | hora.", "Like | half | hour.", "About half an hour.")],
    bring: [
      t("Solo | una | identificación | y, | si | tiene, | sus | radiografías | anteriores.", "Just | an | ID | and, | if | you have them, | your | X-rays | previous.",
        "Just an ID and, if you have them, any earlier X-rays."),
    ],
    cancel_policy: [
      t("Si | no puede | venir, | avísenos | con | un | día | de | anticipación, | por favor.", "If | you can't | come, | let us know | with | one | day | of | notice, | please.",
        "If you can't make it, please let us know a day ahead."),
    ],
    forms: [t("Sí, | una | historia clínica. | Llegue | diez | minutos | antes, | por favor.", "Yes, | a | medical history. | Arrive | ten | minutes | early, | please.", "Yes, a medical history form. Please arrive ten minutes early.")],
    doctor: [
      t("{m:Lo|f:La} | atiende | la | doctora | Moreno.", "You | sees | the | doctor | Moreno.", "You'll see Dr. Moreno.",
        { spell: "Moreno", flags: { 0: "lo / la: “you” (usted), lo for a man and la for a woman.", 1: "The subject, la doctora Moreno, comes after the verb.", 3: "doctora: dentists are called doctor or doctora in Mexico." } }),
    ],
    pain_advice: [
      t("Mientras tanto, | puede | tomar | un | analgésico, | como | ibuprofeno. | Si | el | dolor | empeora, | llámenos.",
        "Meanwhile, | you can | take | a | painkiller, | like | ibuprofen. | If | the | pain | gets worse, | call us.",
        "In the meantime, you can take a painkiller, like ibuprofen. If the pain gets worse, call us."),
    ],
    pay: [t("Aceptamos | efectivo, | tarjeta | y | transferencia.", "We accept | cash, | card | and | bank transfer.", "We take cash, cards, and bank transfers.")],
    // "¿Aceptan dólares?" gets an answer about dollars (rule 11); pesos only in cash, as at the bus terminal (s67a)
    pay_dollars: [
      t("En | efectivo, | solo | pesos; | también | aceptamos | tarjeta | y | transferencia.", "In | cash, | only | pesos; | also | we accept | card | and | bank transfer.",
        "Cash in pesos only; we also take cards and bank transfers."),
    ],
    insurance_info: [
      t("Depende | del | seguro. | Traiga | sus | datos | y | lo | revisamos | aquí.", "It depends | on the | insurance. | Bring | your | details | and | it | we-check | here.",
        "It depends on the insurance. Bring your details and we'll look into it here."),
    ],
    english: [t("Sí, | la | doctora | habla | inglés, | por si | lo | necesita.", "Yes, | the | doctor | speaks | English, | in case | it | you need.", "Yes, the dentist speaks English, in case you need it.")],
    her_name: [t("Con | Lorena, | para servirle.", "With | Lorena, | at your service.", "This is Lorena, at your service.",
      { flags: { 2: "para servirle: “at your service”, a courteous set phrase on the phone." } })],
    hours: [
      t("Abrimos | de | lunes | a | viernes, | de | 9 | a | 2 | y | de | 4 | a | 8, | y | los | sábados | de | 9 | a | 2.",
        "We're open | from | Monday | to | Friday, | from | 9 | to | 2 | and | from | 4 | to | 8, | and | on | Saturdays | from | 9 | to | 2.",
        "We're open Monday to Friday, 9 to 2 and 4 to 8, and Saturdays 9 to 2.",
        { say: "Abrimos de lunes a viernes, de nueve a dos y de cuatro a ocho, y los sábados de nueve a dos.",
          flags: { 9: "Many Mexican offices close from 2 to 4 for the midday meal.", 15: "los + a weekday in the plural = every week on that day." } }),
    ],

    // rescheduling (twist)
    move_ok: [
      t("Claro, | con gusto. | ¿Me | da | su | nombre | y | su | fecha | de | nacimiento?", "Sure, | gladly. | (To) me | you-give | your | name | and | your | date | of | birth?",
        "Sure, no problem. Can I have your name and date of birth?", { spain: t("Claro, | sin problema. | ¿Me | da | su | nombre | y | su | fecha | de | nacimiento?", "Sure, | no problem. | (To) me | you-give | your | name | and | your | date | of | birth?", "Sure, no problem. Can I have your name and date of birth?") }),
    ],
    move_ok_dob: [
      t("Claro, | con gusto. | ¿Me | da | su | fecha | de | nacimiento?", "Sure, | gladly. | (To) me | you-give | your | date | of | birth?", "Sure, no problem. Can I have your date of birth?", { spain: t("Claro, | sin problema. | ¿Me | da | su | fecha | de | nacimiento?", "Sure, | no problem. | (To) me | you-give | your | date | of | birth?", "Sure, no problem. Can I have your date of birth?") }),
    ],
    found_appt: [
      t("Aquí | veo | su | cita: | {$slot}.", "Here | I-see | your | appointment: | {$slot}.", "I see your appointment here: {$slot}."),
      t("Ya | la | encontré: | {$slot}.", "Already | it | I-found: | {$slot}.", "Found it: {$slot}.", { flags: { 1: "la: it, la cita." } }),
    ],
    offer_reschedule: [t("¿Quiere | cambiarla | para | otro | día?", "Do you want | to change it | to | another | day?", "Would you like to reschedule it for another day?")],
    canceled: [t("Muy | bien, | ya | cancelé | su | cita.", "Very | good, | already | I-canceled | your | appointment.", "Okay, I've canceled your appointment.")],

    // this week's only opening (twist)
    only_offer: [
      t("Esta | semana | tenemos | la | agenda | muy | llena. | Lo | único | que | me | queda | es | {$slot}. | ¿Le | sirve?",
        "This | week | we have | the | schedule | very | full. | The | only thing | that | (to) me | remains | is | {$slot}. | (To) you | does it work?",
        "We're very booked this week. The only opening I have left is {$slot}. Does that work for you?",
        { flags: { 7: "lo único: “the only thing”; lo turns único into a noun." } }),
    ],
    only_one: [t("Lo siento, | es | lo | único | que | tengo | esta | semana.", "I'm sorry, | it's | the | only thing | that | I have | this | week.", "I'm sorry, that's the only opening I have this week.")],
    week_full: [t("Lo siento, | esta | semana | ya | no tengo | nada | más.", "I'm sorry, | this | week | already | I don't have | anything | more.", "I'm sorry, I don't have anything else this week.")],
    only_next: [
      t("Entonces, | lo | siguiente | que | tengo | es | {$slot}. | ¿Le | sirve?", "Then, | the | next thing | that | I have | is | {$slot}. | (To) you | does it work?",
        "Then the next opening I have is {$slot}. Does that work?"),
    ],
  },

  domains: {
    slot: () => Object.values(OFFERS).map(slotVal).concat([slotVal(EXISTING)]),
    slot2: () => Object.values(OFFERS).map(slotVal),
    at: () => [clockVal(OFFERS.late.h, OFFERS.late.m)],
    day: () => [...new Set(Object.values(OFFERS).map((o) => o.d))].map(dayVal),
    price: () => [40000],
  },

  hints: {
    book: {
      lt: "Say you'd like an appointment", slot: "reason", examples: ["checkup", "cleaning"],
      items: [
        { id: "book_like", s: t("Quisiera | hacer | una | cita.", "I'd like | to make | an | appointment.", "I'd like to make an appointment.") },
        { id: "book_could", s: t("¿Me | puede | dar | una | cita, | por favor?", "(To) me | can you | give | an | appointment, | please?", "Could I get an appointment, please?"), register: "polite" },
        { id: "book_calling", s: t("Llamo | para | hacer | una | cita.", "I'm calling | to | make | an | appointment.", "I'm calling to make an appointment.") },
        { id: "book_asap", s: t("Necesito | ver | a | un | dentista | lo antes posible.", "I need | to see | — | a | dentist | as soon as possible.", "I need to see a dentist as soon as possible.",
          { flags: { 2: "Personal a: Spanish marks a person after the verb; English has no word here." } }) },
        { id: "reason_have", s: t("Tengo | dolor | de | muelas.", "I have | pain | of | teeth.", "I have a toothache.",
          { flags: { 1: "dolor de muelas: the everyday word for a toothache, whichever tooth hurts." } }) },
        { id: "book_checkup", s: t("Quisiera | una | cita | para | {X.np}.", "I'd like | an | appointment | for | {X.np}.", "I'd like an appointment for {X.np}."), only: (e) => ["checkup", "cleaning"].includes(e.id) },
        { id: "book_need", s: t("Necesito | {X.np}.", "I need | {X.np}.", "I need {X.np}."), only: (e) => ["checkup", "cleaning"].includes(e.id) },
        { id: "book_available", s: t("¿Tiene | algo | esta | semana?", "Do you have | anything | this | week?", "Do you have anything this week?") },
        { id: "book_gustaria", s: t("Me gustaría | agendar | una | cita.", "I'd like | to schedule | an | appointment.", "I'd like to schedule an appointment."), register: "polite" },
      ],
    },
    reason: {
      lt: "Say why you need to come in",
      items: [
        { id: "reason_have", s: t("Tengo | dolor | de | muelas.", "I have | pain | of | teeth.", "I have a toothache.") },
        { id: "reason_hurts", s: t("Me duele | mucho | una | muela.", "Hurts me | a lot | a | back tooth.", "One of my back teeth really hurts.",
          { flags: { 0: "me duele: “it hurts me”; the tooth is the subject." } }) },
        { id: "reason_for", s: t("Es | para | una | revisión.", "It's | for | a | checkup.", "It's for a checkup.") },
        { id: "reason_just", s: t("Solo | una | limpieza.", "Just | a | cleaning.", "Just a cleaning.") },
        { id: "reason_broke", s: t("Se me rompió | un | diente.", "Broke on me | a | tooth.", "I broke a tooth.",
          { flags: { 0: "se me rompió: “it broke on me”; Spanish puts accidents this way." } }) },
        { id: "reason_filling", s: t("Se me cayó | una | resina.", "Fell out on me | a | filling.", "A filling fell out.",
          { flags: { 0: "se me cayó: “it fell out on me”; Spanish puts accidents this way.", 2: "resina: a white filling, the usual kind in Mexico." } }) },
      ],
    },
    pain: {
      lt: "Say how long it has hurt",
      items: [
        { id: "len_days", s: t("Desde hace | tres | días.", "For | three | days.", "For three days.", { flags: { 0: "desde hace: for, with a length of time up to now." } }) },
        { id: "len_since", s: t("Desde | el | lunes.", "Since | — | Monday.", "Since Monday.", { flags: { 1: "el before a weekday; English has no word here." } }) },
      ],
    },
    newpt: {
      lt: "Say if you're a new patient",
      items: [
        { id: "new_patient", s: t("Sí, | soy | paciente | {m:nuevo|f:nueva}.", "Yes, | I'm | patient | new.", "Yes, I'm a new patient.") },
        { id: "new_first", s: t("Es | mi | primera | vez.", "It's | my | first | time.", "It's my first time.") },
        { id: "new_before", s: t("No, | ya | he venido | antes.", "No, | already | I've come | before.", "No, I've been there before.") },
      ],
    },
    name: {
      lt: "Give your first and last name",
      items: [
        { id: "name_mine", s: t("Me llamo | {$name} | {$surname}.", "My name is | {$name} | {$surname}.", "My name is {$name} {$surname}.") },
        { id: "name_last", s: t("Mi | apellido | es | {$surname}.", "My | last name | is | {$surname}.", "My last name is {$surname}.") },
      ],
    },
    surname: {
      lt: "Give your last name",
      items: [
        { id: "name_last", s: t("Mi | apellido | es | {$surname}.", "My | last name | is | {$surname}.", "My last name is {$surname}.") },
        { id: "spell_it", s: t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}.") },
      ],
    },
    year: {
      lt: "Say the year you were born",
      items: [
        { id: "year_is", s: t("1990.", "1990.", "1990.", { say: "Mil novecientos noventa." }), note: "Spanish says a year as one number: mil novecientos noventa (1990), dos mil cinco (2005)." },
      ],
    },
    hold: {
      lt: "Agree to hold",
      items: [
        { id: "hold_sure", s: t("Sí, | claro, | la | espero.", "Yes, | sure, | you | I'll-wait-for.", "Sure, I'll hold.", { flags: { 2: "la: “you” (usted), for a woman, Lorena." } }) },
        { id: "hold_course", s: t("Claro, | no hay problema.", "Sure, | no problem.", "Sure, no problem.") },
      ],
    },
    hear: {
      lt: "Say if you can hear her now",
      items: [
        { id: "hear_better", s: t("Sí, | mucho | mejor.", "Yes, | much | better.", "Yes, much better.") },
        { id: "hear_now", s: t("Sí, | ya | la | escucho.", "Yes, | now | you | I-hear.", "Yes, I can hear you now.", { flags: { 2: "la: “you” (usted), for a woman, Lorena." } }) },
      ],
    },
    spell: {
      lt: "Spell your last name",
      items: [
        { id: "spell_it", s: t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}."),
          note: "Spanish letter names: a, be, ce, de, e, efe, ge, hache, i, jota, ka, ele, eme, ene, eñe, o, pe, cu, erre, ese, te, u, ve, doble ve, equis, i griega, zeta. Mexicans say “be grande” for B, “ve chica” for V, and “doble ele” for LL." },
      ],
    },
    dob: {
      lt: "Give your date of birth",
      items: [
        { id: "dob_is", s: t("El | 4 | de | junio | de | 1990.", "— | 4 | — | June | — | 1990.", "June 4, 1990.",
          { say: "El cuatro de junio de mil novecientos noventa.", flags: { 0: "Spanish dates take el and put the day first; English has no word here.", 2: "de links the day and the month; English needs no word.", 4: "de links the month and the year; English needs no word." } }),
          note: "Day first, then the month: el cuatro de junio. The year as one number: mil novecientos noventa." },
        { id: "dob_born", s: t("Nací | el | 4 | de | junio | de | 1990.", "I was born | — | 4 | — | June | — | 1990.", "I was born on June 4, 1990.",
          { say: "Nací el cuatro de junio de mil novecientos noventa.", flags: { 1: "el before a date = on; English says on here.", 3: "de links the day and the month; English needs no word.", 5: "de links the month and the year; English needs no word." } }) },
      ],
    },
    phone_no: {
      lt: "Give your phone number",
      items: [
        { id: "phone_is", s: t("Mi | número | es | 984 | 123 | 4567.", "My | number | is | 984 | 123 | 4567.", "My number is 984 123 4567.",
          { say: "Mi número es nueve ocho cuatro, uno veintitrés, cuarenta y cinco, sesenta y siete." }), note: "Mexicans read phone numbers in pairs: cuarenta y cinco, sesenta y siete. Digit by digit is fine too." },
        { id: "phone_this", s: t("Puede | llamarme | a | este | número.", "You can | call me | at | this | number.", "You can call me at this number.") },
      ],
    },
    insurance: {
      lt: "Say if you have insurance",
      items: [
        { id: "ins_none", s: t("No, | no tengo | seguro.", "No, | I don't have | insurance.", "No, I don't have insurance.") },
        { id: "ins_self", s: t("Voy | a | pagar | yo.", "I'm going | to | pay | myself.", "I'll pay myself."), note: "In Mexico most people pay the dentist themselves: “particular”." },
        { id: "ins_have", s: t("Sí, | tengo | seguro | dental.", "Yes, | I have | insurance | dental.", "Yes, I have dental insurance.") },
        { id: "q_cost", s: t("¿Cuánto | cuesta | la | consulta?", "How much | does it cost | the | appointment?", "How much is the appointment?") },
      ],
    },
    slot: {
      lt: "Agree on a time",
      items: [
        { id: "slot_ok", s: t("Sí, | me queda | bien.", "Yes, | it suits me | well.", "Yes, that works for me.", { flags: { 1: "me queda bien: it suits me; for times, sizes and colors." } }) },
        { id: "slot_earlier", s: t("¿Tiene | algo | antes?", "Do you have | anything | before?", "Do you have anything earlier?") },
        { id: "slot_later", s: t("¿Tiene | algo | más tarde?", "Do you have | anything | later?", "Do you have anything later?") },
        { id: "slot_perfect", s: t("El | martes | a | las | diez | está | perfecto.", "— | Tuesday | at | — | ten | is | perfect.", "Tuesday at ten is perfect.",
          { flags: { 0: "el before a weekday = on; English needs no word here.", 3: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "slot_day", s: t("¿Puedo | ir | el | viernes?", "Can I | go | — | Friday?", "Could I come on Friday?", { flags: { 2: "el before a weekday = on." } }) },
        { id: "slot_work", s: t("Perdón, | a | esa | hora | trabajo.", "Sorry, | at | that | time | I work.", "Sorry, I'm at work then.") },
        { id: "slot_no", s: t("No me queda.", "It doesn't suit me.", "That doesn't work for me.") },
      ],
    },
    phone: {
      lt: "Handle the phone line",
      items: [
        { id: "ph_speak_up", s: t("Perdón, | ¿puede | hablar | más | fuerte?", "Sorry, | can you | speak | more | loud?", "Sorry, could you speak up?") },
        { id: "ph_breaking", s: t("Perdón, | se está cortando.", "Sorry, | it's breaking up.", "Sorry, you're breaking up.") },
        { id: "ph_hear", s: t("¿Me | escucha?", "Me | do you hear?", "Can you hear me?") },
        { id: "c_repeat", s: t("Perdón, | ¿me | lo | puede | repetir?", "Sorry, | (to) me | it | can you | repeat?", "Sorry, could you say that again?") },
        { id: "c_spell", s: t("¿Cómo | se escribe?", "How | is it spelled?", "How do you spell that?") },
      ],
    },
    ask: {
      lt: "Ask about the appointment",
      items: [
        { id: "q_address", s: t("¿Cuál | es | la | dirección?", "What | is | the | address?", "What's the address?") },
        { id: "q_park", s: t("¿Dónde | me | puedo | estacionar?", "Where | myself | can I | park?", "Where can I park?", { flags: { 1: "me: estacionarse is said with a reflexive pronoun." }, spain: t("¿Dónde | puedo | aparcar?", "Where | can I | park?", "Where can I park?") }) },
        { id: "q_long", s: t("¿Cuánto | dura | la | consulta?", "How long | lasts | the | appointment?", "How long does the appointment take?") },
        { id: "q_bring", s: t("¿Qué | tengo que | llevar?", "What | do I have to | bring?", "What should I bring?") },
        { id: "q_pay", s: t("¿Aceptan | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "q_english", s: t("¿La | doctora | habla | inglés?", "The | doctor | speaks | English?", "Does the dentist speak English?") },
      ],
    },
    move: {
      lt: "Move your appointment",
      items: [
        { id: "move_have", s: t("Tengo | una | cita | mañana | y | quisiera | cambiarla.", "I have | an | appointment | tomorrow | and | I'd like | to change it.", "I have an appointment tomorrow, and I'd like to reschedule it.") },
        { id: "move_like", s: t("Quisiera | cambiar | mi | cita.", "I'd like | to change | my | appointment.", "I'd like to reschedule my appointment.") },
        { id: "move_could", s: t("¿Puedo | cambiar | mi | cita?", "Can I | change | my | appointment?", "Could I move my appointment?") },
        { id: "slot_perfect", s: t("A | las | cuatro | y media | está | perfecto.", "At | — | four | thirty | is | perfect.", "Four thirty is perfect.",
          { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
      ],
    },
    more: {
      lt: "Say thank you and goodbye",
      items: [
        { id: "more_all", s: t("No, | es | todo. | ¡Gracias!", "No, | it's | all. | Thanks!", "No, that's all. Thank you!") },
        { id: "see_you", s: t("¡Hasta | el | jueves!", "Until | — | Thursday!", "See you Thursday!", { flags: { 1: "el before a weekday; English has no word here." } }) },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a receptionist, usted is more polite: puede, me escucha (puedes and me escuchas are for friends).", better: "¿Me puede dar una cita?" },
    us_date: { key: "us_date", lt: "Understood! In Mexico the day comes first: 4/6/1990 is June 4, 1990.", better: "El cuatro de junio de mil novecientos noventa." },
    month_first: { key: "month_first", lt: "Understood! Spanish says the day first, then the month: el cuatro de junio (June 4).", better: "El cuatro de junio de mil novecientos noventa." },
  },

  merges: {
    "clínica dental coral": { reason: "lexical_expression", split: "clínica → clinic + dental → dental + coral → coral would translate the office's proper name.", minimal: "A proper name." },
    "le duele": { reason: "grammatical_fusion", split: "le → to you + duele → it hurts is a word-for-word reading of one English verb phrase (does it hurt you).", minimal: "Two words." },
    "se le ofrece": { reason: "grammatical_fusion", split: "se → itself + le → to you + ofrece → offers is false; ¿qué se le ofrece? = what do you need.", minimal: "The pronouns and the verb only." },
    "había venido": { reason: "grammatical_fusion", split: "había → had + venido → come: the compound tense is one English verb phrase (had you come).", minimal: "Two words." },
    "he venido": { reason: "grammatical_fusion", split: "he → I have + venido → come: the compound tense is one English verb phrase (I've come).", minimal: "Two words." },
    "se escribe": { reason: "grammatical_fusion", split: "se → itself + escribe → writes is false; how is it spelled.", minimal: "Two words." },
    "se está cortando": { reason: "grammatical_fusion", split: "se → itself + está → is + cortando → cutting misreads a phone line breaking up.", minimal: "Pronoun, auxiliary and verb." },
    "se oye": { reason: "grammatical_fusion", split: "se → itself + oye → hears is false; = it sounds.", minimal: "Two words." },
    "ahora sí": { reason: "lexical_expression", split: "ahora → now + sí → yes is false: sí only adds emphasis (now, at last).", minimal: "Two words." },
    "lo antes posible": { reason: "lexical_expression", split: "lo → it + antes → before + posible → possible is a literal reading; = as soon as possible.", minimal: "A fixed three-word phrase." },
    "(en | por) la tarde": { reason: "lexical_expression", split: "en → in + la → the + tarde → afternoon is close but the part of the day is one adverbial: in the afternoon.", minimal: "Three words." },
    "historia clínica": { reason: "lexical_expression", split: "historia → story + clínica → clinical is false; = a patient's medical history form.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is a literal reading; = about.", minimal: "Three words." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is a literal reading; = in case.", minimal: "Two words." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much misreads the adverb: in the meantime.", minimal: "Two words." },
    "más tarde": { reason: "lexical_expression", split: "más → more + tarde → late misreads the time phrase: later.", minimal: "Two words." },
    "desde hace": { reason: "lexical_expression", split: "desde → since + hace → it makes is false; with a length of time = for.", minimal: "Two words; the length of time stays separate." },
    "se me rompió": { reason: "grammatical_fusion", split: "se → itself + me → to me + rompió → broke: the accidental se is one English verb (I broke).", minimal: "Pronouns and verb only." },
    "se me cayó": { reason: "grammatical_fusion", split: "se → itself + me → to me + cayó → fell: the accidental se is one English verb (fell out).", minimal: "Pronouns and verb only." },
    "me gustaría": { reason: "grammatical_fusion", split: "me → to me + gustaría → would please is a word-for-word reading of I'd like.", minimal: "Two words." },
    "tengo que": { reason: "grammatical_fusion", split: "tengo → I have + que → that is false; tener que = have to.", minimal: "Two words." },
    "no hay problema": { reason: "lexical_expression", split: "no → not + hay → there is + problema → problem is a literal reading of no problem.", minimal: "Three words." },
    "no se preocupe": { reason: "grammatical_fusion", split: "no → not + se → yourself + preocupe → worry: = don't worry (usted).", minimal: "The negative command." },
    "para servirle": { reason: "lexical_expression", split: "para → for + servirle → to serve you is a literal reading; = at your service.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Ask to move your appointment", done: (c) => movePath(c) && !!c.s.moving, when: movePath, optional: true },
    { lt: "Ask for an appointment", done: (c) => bookPath(c) && !!c.s.reason, when: bookPath, optional: true },
    { lt: "Give your first and last name", done: (c) => words(c.s.name) >= 2 },
    { lt: "Spell your last name", done: (c) => spellNeeded(c) && !!c.s.spelled, when: spellNeeded, optional: true },
    { lt: "Give your date of birth", done: (c) => !!c.s.dob },
    { lt: "Give your phone number", done: (c) => newPtBooking(c) && !!c.s.phone, when: newPtBooking, optional: true },
    { lt: "Say how you'll pay", done: (c) => newPtBooking(c) && c.s.insurance !== undefined, when: newPtBooking, optional: true },
    { lt: "Agree on a day and time", done: (c) => !!c.s.appt },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_move", true),
    { id: "reason", when: (c) => booking(c) && !moving(c), done: (c) => !!c.s.reason,
      ask: (c) => c.say("ask_reason"), expects: ["reason_ans"],
      suggest: [{ lt: "Say why you need to come in", hint: "reason" }] },
    { id: "pain_len", when: (c) => booking(c) && !!c.s.pain && !!c.s.askPainLen, done: (c) => !!c.s.painLen,
      ask: (c) => c.say("ask_pain_len"), expects: ["pain_len"],
      suggest: [{ lt: "Say how long it has hurt", hint: "pain" }] },
    { id: "new_pt", when: (c) => booking(c) && !!c.s.reason, done: (c) => c.s.newPt !== undefined,
      ask: (c) => { c.say(c.s.npVariant === 1 ? "ask_before" : "ask_new"); },
      expects: ["new_yes", "new_no"],
      suggest: [{ lt: "Say if you're a new patient", hint: "newpt" }],
      yes: (c) => { setNew(c, c.s.npVariant !== 1); },
      no: (c) => { setNew(c, c.s.npVariant === 1); } },
    { id: "name", when: (c) => (booking(c) && c.s.newPt !== undefined) || moving(c), done: (c) => !!c.s.name,
      ask: (c) => { if (moving(c) && bump(c, "move_name") === 0) return; c.say("ask_name"); }, expects: ["name_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your first and last name", hint: "name" }, { lt: "Ask her to repeat", hint: "phone" }] },
    { id: "surname", when: (c) => !!c.s.name && words(c.s.name) < 2, done: (c) => words(c.s.name) >= 2,
      ask: (c) => c.say("ask_surname"), expects: ["name_ctx", "spell_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your last name", hint: "surname" }] },
    // A date of birth given here is saved (the spelling is asked again); "spell it again, more slowly" only after letters.
    { id: "spell", when: (c) => words(c.s.name) >= 2 && (booking(c) || !!c.s.spellOnMove), done: (c) => !!c.s.spelled,
      ask: (c) => c.say(bump(c, "spell") === 0 ? "ask_spell" : c.s.spellTried ? "spell_again" : "ask_spell_again"), expects: ["spell_ctx", "dob_ans", "dob_ctx"], yes: goAhead,
      suggest: [{ lt: "Spell your last name", hint: "spell" }, { lt: "Ask her to repeat", hint: "phone" }] },
    { id: "dob", when: (c) => words(c.s.name) >= 2 && (!!c.s.spelled || (moving(c) && !c.s.spellOnMove)), done: (c) => !!c.s.dob,
      ask: (c) => {
        if (c.s.dobPartial && !c.s.dobYear) {
          c.say("ask_year");
          c.expect({ id: "year", expects: ["year_ctx", "dob_ctx", "dob_ans"], hints: ["year"], suggest: [{ lt: "Say the year you were born", hint: "year" }],
            on: { year_ctx: (cc, sl, sg) => { setDob(cc, yearFrom(sl, sg)); }, dob_ctx: (cc, sl) => { setDob(cc, sl); }, dob_ans: (cc, sl) => { setDob(cc, sl); } },
            ask: (cc) => cc.say("ask_year") });
          return;
        }
        c.say("ask_dob");
      },
      expects: ["dob_ans", "dob_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your date of birth (day, month, year)", hint: "dob" }] },
    { id: "phone", when: (c) => booking(c) && !!c.s.newPt && !!c.s.dob, done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"), expects: ["phone_ans", "phone_ctx", "phone_foreign_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your phone number", hint: "phone_no" }] },
    { id: "insurance", when: (c) => booking(c) && !!c.s.newPt && !!c.s.phone, done: (c) => c.s.insurance !== undefined,
      ask: (c) => c.say("ask_insurance"), expects: ["insurance_no", "insurance_yes", "cost_q"],
      suggest: [{ lt: "Say if you have insurance or will pay yourself", hint: "insurance" }],
      yes: (c) => { c.s.insurance = true; c.say("insurance_card"); },
      no: (c) => { c.s.insurance = false; c.say("selfpay", { price: 40000 }); } },
    { id: "hold", when: (c) => readyForSlot(c) && !!c.s.askHold && !c.s.appt && !c.s.canceled, done: (c) => !!c.s.holdDone,
      ask: (c) => { c.say("hold_q"); c.twist("on_hold"); }, expects: ["hold_ok_ctx", "hold_no_ctx"],
      suggest: [{ lt: "Agree to hold", hint: "hold" }],
      yes: (c) => { c.s.holdDone = true; c.say("hold_thanks"); },
      no: (c) => { c.s.holdDone = true; c.say("hold_quick"); } },
    { id: "slot", when: (c) => readyForSlot(c) && !c.s.canceled, done: (c) => !!c.s.appt,
      ask: (c) => {
        if (moving(c) && !c.s.foundAppt) {
          c.s.foundAppt = true; c.say("found_appt", { slot: slotVal(EXISTING) });
          // keep an offer Lorena already made (during the hold) or a day the learner asked for; otherwise Thursday
          const want = c.s.offer ?? (c.s.wantDay !== "early" ? c.s.wantDay : undefined) ?? (c.s.urgent ? earliest(c) : c.s.wantMorning ? "morning" : undefined);
          offer(c, want ?? "move", !!c.s.offer);
          return;
        }
        // "…para el 12 de noviembre": the date asked for at the start is full (Lorena works by the week's days)
        if (!c.s.offer && c.s.dateAsked && !c.s.dateTold) { c.s.dateTold = true; c.say("date_full"); }
        if (!c.s.offer && c.s.onlyTwist) {
          c.twist("only_slot");
          c.s.offer = "only"; c.s.offered = ["only"];
          c.say("only_offer", { slot: slotVal(OFFERS.only) });
          return;
        }
        if (!c.s.offer) {
          // "Vamos a buscarle algo pronto" comes with the soonest opening, not Tuesday's
          const soon = !c.s.wantDay && !c.s.wantLate && !c.s.wantMorning && c.s.pain && c.chance(0.5);
          if (soon) c.say("pain_soon");
          offer(c, c.s.wantDay ?? (c.s.urgent || soon ? "early" : c.s.wantLate ? "late" : c.s.wantMorning ? "morning" : "first"));
          return;
        }
        offer(c, c.s.offer, true);
      },
      expects: ["accept", "earlier", "later", "morning", "day_req", "time_req", "reject", "availability_q", "pick_ctx", "choose_ctx", "maybe_ctx", "date_ctx"],
      suggest: [{ lt: "Accept or ask for another time", hint: "slot" }],
      yes: (c) => {
        // "Sí" to "Tengo X o Y" chooses neither: Lorena offers the first one alone
        if (c.s.choice) { offer(c, c.s.choice[0], true); c.hold(); return; }
        if (POLITE.test(c.heard.trim()) && !c.s.politeAsked) { c.s.politeAsked = true; offer(c, c.s.offer, true); c.hold(); return; }
        accept(c);
      },
      // "Así está bien" at the time question could mean "that's fine": Lorena asks again rather than move on
      no: (c) => {
        if (/(^|[\s¿¡,])as[ií]([\s,.!?]|$)/i.test(c.heard)) {
          // while changing the time just booked, "Así está bien" keeps it ("leave it as it is")
          if (/as[ií] est[aá] bien/i.test(c.heard) && !/as[ií] no/i.test(c.heard) && keepOld(c)) return;
          // only "así está bien" said again books; "así no" is a no
          if (c.s.politeAsked && /as[ií] est[aá] bien/i.test(c.heard) && !/as[ií] no/i.test(c.heard)) { accept(c); return; }
          if (c.s.politeAsked) { dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] }); return; }
          c.s.politeAsked = true; offer(c, c.s.offer, true); c.hold(); return;
        }
        dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] });
      } },
    { id: "more", when: (c) => !!c.s.task && (!!c.s.appt || !!c.s.canceled), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"), expects: ["more_no", "see_you"],
      suggest: [{ lt: "Say thank you and goodbye (or ask something else)", hint: "more" }, { lt: "Ask about the address, the price or what to bring", hint: "ask" }],
      yes: (c) => { if (POLITE.test(c.heard.trim())) { c.s.moreDone = true; return; } c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.moveTwist = c.visits >= 1 && c.chance(0.5);
    c.s.onlyTwist = !c.s.moveTwist && c.visits >= 1 && c.chance(0.4);
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
      if (slots.date) c.s.dateAsked = true;
      const d = slots.day as string | undefined;
      // "…para el próximo martes": next week's Tuesday, never this week's
      const k = d ? keyForDay(c, d, slots, seg) : undefined;
      if (k && !c.s.wantDay) c.s.wantDay = k;
      if (slots.reason) setReason(c, toArr(slots.reason)[0], seg.tags);
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
      // "Hace mucho tiempo" / "Ayer" answering "¿Ya había venido antes?" is a yes (been here before), never pain
      if (c.step === "new_pt") { if (c.s.npVariant === 1) setNew(c, false); return; }
      if (c.s.painLen) return;
      c.s.painLen = true;
      if (!c.s.pain) { c.s.pain = true; if (!c.s.reason) c.s.reason = "toothache"; }
      c.say("noted");
    },
    new_yes(c, _slots, seg) {
      // "Todavía no" answers "¿Ya había venido antes?" only
      if (seg.tags.includes("notyet") && (c.step !== "new_pt" || c.s.npVariant !== 1)) return;
      setNew(c, true);
    },
    new_no(c, _slots, seg) {
      // "No es mi primera vez" means "I've been before"; after "¿Ya había venido antes?" it could also be "No, es mi
      // primera vez" (its comma lost): the two readings record different things, so Lorena asks the other question.
      if (seg.tags.includes("notfirst") && c.step === "new_pt" && c.s.npVariant === 1) {
        c.s.npVariant = 0; c.say("amb_first"); c.hold(); return;
      }
      setNew(c, false);
    },

    intro_name(c, slots) {
      // "Buenos días, habla Ryan Miller." at the start of the call: remember it; Lorena still asks for the full name.
      if (c.s.name) return;
      if (c.step && !["help", "help_move", "name", "surname"].includes(c.step)) return;
      dentist.handlers.name_ctx(c, slots, { intent: "name_ctx", slots, tags: [] });
    },
    name_ctx(c, slots) {
      const td = turn(c);
      // "Mi nombre es Ryan y mi apellido es Miller": two captures come as a list
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
      const letters = String(slots.letters || "");
      // "Jueves está bien." / "Mañana…": a day or month read as one run-together word is no spelling (Lorena asks again)
      if (seg.tags.includes("joined") && NOT_SPELLED.test(letters)) return;
      if (seg.tags.includes("joined") && !turn(c).letters && notAName(c, letters)) return;
      // A single word read as "joined letters" while Lorena asks for the name is just the name.
      if (seg.tags.includes("joined") && (c.step === "surname" || c.step === "name")) { dentist.handlers.name_ctx(c, { name: letters.charAt(0).toUpperCase() + letters.slice(1) }, seg); return; }
      const td = turn(c);
      if (!letters) return;
      td.letters = (td.letters ?? "") + letters;
      c.s.spellTried = true;
      if (!c.s.name) c.s.name = "(spelled)";
      if (words(c.s.name) < 2) c.s.name = `${c.s.name} ${td.letters}`;
      if (!td.spellAck) { td.spellAck = true; if (!c.s.spelled) c.say("spell_thanks"); }
      c.s.spelled = td.letters;
    },
    dob_ans(c, slots, seg) { setDob(c, { ...slots, ...yearFrom(slots, seg) }); },
    dob_ctx(c, slots, seg) { setDob(c, { ...slots, ...yearFrom(slots, seg) }); },
    year_ctx(c, slots, seg) { setDob(c, yearFrom(slots, seg)); },
    phone_ans(c, slots, seg) { setPhone(c, slots.digits ?? (seg.tags.includes("this") ? "this number" : undefined)); },
    help_me(c) {
      // "¿Me puede ayudar?" alone: at the start Lorena asks again how she can help; later she says "Sí, dígame." ("Otra
      // cosa: ¿dónde están?": the question itself is answered)
      if (turnSegments(c).some((x) => x.intent !== "help_me")) return;
      if (c.step !== "help" && c.step !== "help_move") goAhead(c);
    },
    phone_ctx(c, slots) { setPhone(c, slots.digits); },
    phone_foreign_ctx(c, slots) {
      // "Es un número de Estados Unidos: más uno…": the number is the answer; without it, any country's number will do
      if (slots.digits) { setPhone(c, slots.digits); return; }
      if (c.s.phone || turn(c).foreign) return;
      if (turnSegments(c).some((x) => (x.intent === "phone_ans" || x.intent === "phone_ctx") && x.slots?.digits)) return;
      turn(c).foreign = true;
      c.say("phone_any"); c.hold();
    },
    hold_no_ctx(c) {
      if (c.step !== "hold" || c.s.holdDone) return;
      c.s.holdDone = true;
      c.say("hold_quick");
    },

    insurance_no(c) {
      if (c.step !== "insurance" && c.s.insurance !== undefined) return;
      c.s.insurance = false;
      if (c.step === "insurance" || c.s.newPt) c.say("selfpay", { price: 40000 });
    },
    insurance_yes(c) { if (c.s.insurance === true) return; c.s.insurance = true; c.say("insurance_card"); },
    insurance_q(c) { c.say("insurance_info"); },
    cost_q(c) {
      // "¿Cuánto cobran si cancelo?" asks about canceling, never the price of the exam
      if (/cancel/.test(plain(c.heard))) { dentist.handlers.cancel_policy_q(c, {}, { intent: "cancel_policy_q", slots: {}, tags: [] }); return; }
      c.say("price_info", { price: 40000 });
    },

    earlier(c) {
      holdOk(c);
      if (booked(c)) return;
      if (/\bhoy\b/i.test(c.heard)) c.say("no_today");
      if (!c.s.offer || !readyForSlot(c)) { c.s.urgent = true; if (!c.s.task) startBooking(c); return; }
      if (onlyNow(c)) { onlyOne(c); return; }
      if (weekFull(c)) {
        if (c.s.offer !== "monday_am") { offer(c, "monday_am", (c.s.offered || []).includes("monday_am")); c.hold(); return; }
        c.say("earliest"); c.hold(); return;
      }
      // moving: tomorrow 9:30 is the appointment being moved, so the first opening is Tuesday
      const first = earliest(c);
      if (c.s.offer === first || (c.s.offered || []).includes(first)) { c.say("earliest"); if (c.s.offer !== first) offer(c, first); c.hold(); return; }
      offer(c, first); c.hold();
    },
    later(c) {
      holdOk(c);
      if (booked(c)) return;
      if (!c.s.offer || !readyForSlot(c)) { c.s.wantLate = true; return; }
      if (onlyNow(c)) { onlyOne(c); return; }
      if (weekFull(c)) {
        const next = c.s.offer === "monday_am" ? "monday" : c.s.offer === "monday" ? "next_tue" : undefined;
        if (next) { offer(c, next, (c.s.offered || []).includes(next)); c.hold(); return; }
        weekFullAgain(c); return;
      }
      if (c.s.offer === "late") { c.say("latest", { at: clockVal(OFFERS.late.h, OFFERS.late.m) }); c.hold(); return; }
      offer(c, "late"); c.hold();
    },
    morning(c) {
      holdOk(c);
      if (booked(c)) return;
      if (!c.s.offer || !readyForSlot(c)) { c.s.wantMorning = true; return; }
      if (onlyNow(c)) { onlyOne(c); return; }
      if (weekFull(c)) { if (c.s.offer === "monday_am") weekFullAgain(c); else { offer(c, "monday_am", (c.s.offered || []).includes("monday_am")); c.hold(); } return; }
      offer(c, c.s.offer === "morning" ? earliest(c) : "morning"); c.hold();
    },
    day_req(c, slots, seg) {
      holdOk(c);
      const part = partOf(slots, seg);
      const d = slots.day as string | undefined;
      if (!d) return;
      if (!c.s.task) startBooking(c);
      if (c.s.appt) { if (WEEKEND.includes(d)) c.say("hours"); else booked(c); return; }
      const nextWk = nextWeek(c, slots, seg);
      // a question ("¿Tiene algo el martes?", "¿Y el martes?", "¿Abren el martes?") or a correction naming the opening
      // on offer gets it offered again; only a statement ("Mejor el martes") takes it (rule 17)
      const ask = seg.tags.includes("ask") || !!slots.no_day;
      // after "Tengo X o Y": "Mejor el jueves" takes that one, "¿Y el jueves?" gets it offered again
      const ch = readyForSlot(c) ? pickChoice(c, slots, seg) : undefined;
      if (ch) { takeOrAsk(c, ch, ask); return; }
      if (readyForSlot(c) && choiceBoth(c, slots, seg)) { takeOrAsk(c, (c.s.choice as string[])[0], true); return; }
      // moving: "early" (tomorrow 9:30) is the appointment being moved, so Lorena keeps her own offer instead
      const early = moving(c) ? (c.s.offer ?? "move") : "early";
      if (WEEKEND.includes(d)) { c.say("closed_weekend"); if (readyForSlot(c)) { offer(c, c.s.offer ?? "morning", !!c.s.offer); c.hold(); } return; }
      if (TODAYISH.includes(d)) { c.say("no_today"); if (readyForSlot(c)) { if (onlyNow(c)) { onlyOne(c); return; } offer(c, early, early === c.s.offer); c.hold(); } return; }
      if (moving(c) && d === EXISTING.d) { if (readyForSlot(c)) { c.say("not_that_time"); offer(c, early, early === c.s.offer); c.hold(); } return; }
      // Twist: next week ("la próxima semana", "el lunes", "el martes de la próxima semana") turns this week's only
      // opening down; Lorena offers next week's, never this week's
      if (onlyNow(c) && (d === "next_week" || d === "monday" || (nextWk && THIS_WEEK.includes(d)))) c.s.onlyRejected = true;
      if (weekFull(c) && readyForSlot(c)) {
        if (d === "day_after_tomorrow") { c.s.onlyRejected = false; offer(c, "only", true); c.hold(); return; }
        if (THIS_WEEK.includes(d) && !nextWk) { weekFullAgain(c); return; }
        const nextTue = d === "tuesday" && nextWk;
        // "El miércoles de la próxima semana": next week she has Monday and Tuesday afternoon only
        if (nextWk && THIS_WEEK.includes(d) && !nextTue) c.say("day_full");
        const k = nextTue ? "next_tue" : part === "am" ? "monday_am" : part === "pm" ? "monday" : c.s.offer === "monday_am" ? "monday_am" : "monday";
        if (c.s.offer === k) { if (ask) { offer(c, k, true); c.hold(); } else accept(c); return; }
        offer(c, k, (c.s.offered || []).includes(k)); c.hold(); return;
      }
      let key: string | undefined = keyForDay(c, d, slots, seg);
      if (moving(c) && d === "thursday" && !nextWk) key = "move";
      if (!key && nextWk && THIS_WEEK.includes(d)) {
        // "El miércoles de la próxima semana": that day is full; next week's known opening is Tuesday afternoon
        if (!readyForSlot(c)) { c.s.wantDay = c.s.wantDay ?? "next_tue"; return; }
        c.say("day_full"); offer(c, "next_tue", (c.s.offered || []).includes("next_tue")); c.hold(); return;
      }
      if (!key) return;
      // "El lunes en la mañana": Monday has a morning opening too
      if (key === "monday" && part === "am") key = "monday_am";
      if (key === "only" && !c.s.onlyTwist) {
        // "Pasado mañana" without the twist: that day is full (never tomorrow instead, nor the appointment being moved)
        if (!readyForSlot(c)) return;
        c.say("day_full"); dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] }); return;
      }
      if (!readyForSlot(c)) {
        if (fitsPart(key, part)) c.s.wantDay = key; else if (part === "am") c.s.wantMorning = true; else c.s.wantLate = true;
        return;
      }
      if (onlyNow(c) && key !== "only") { onlyOne(c); return; }
      // "El martes en la tarde" when Tuesday's opening is in the morning: another opening in that part of the day
      if (!fitsPart(key, part)) {
        c.say("not_that_time");
        const alt = (part === "pm" ? ["wednesday", "monday", "late"] : ["first", "morning", "early"]).filter((k) => !(moving(c) && k === "early"));
        key = alt.find((k) => k !== c.s.offer && OFFERS[k].d !== d) ?? alt[0];
      }
      // "El martes, no el miércoles" and "El martes no, el miércoles" lose their comma: a correction only offers, it
      // never books; nor does a question
      if (c.s.offer === key) { if (ask) { offer(c, key, true); c.hold(); } else accept(c); return; }
      offer(c, key, (c.s.offered || []).includes(key) && key !== "move"); c.hold();
    },
    time_req(c, slots, seg) {
      if (!readyForSlot(c) || !c.s.offer) return;
      if (booked(c)) return;
      // after "Tengo X o Y": "¿Y a las siete?" / "Mejor a las siete" gets that one offered again
      const ch = pickChoice(c, slots, seg);
      if (ch) { takeOrAsk(c, ch, true); return; }
      if (onlyNow(c)) { onlyOne(c); return; }
      const tm = slots.time as { h: number; m: number; ampm?: string } | undefined;
      const k = tm ? slotAt(c, tm) : undefined;
      if (weekFull(c) && !k) { c.say("not_that_time"); offer(c, c.s.offer, true); c.hold(); return; }
      if (k && k !== c.s.offer) { offer(c, k, k !== "move" && (c.s.offered || []).includes(k)); c.hold(); return; }
      if (k && k === c.s.offer) { offer(c, k, true); c.hold(); return; }
      c.say("not_that_time");
      offer(c, c.s.offer === "late" ? "morning" : "late"); c.hold();
    },
    pick_ctx(c, slots, seg) {
      // A bare "El martes" / "A las diez" / "Mañana en la tarde" at the time question.
      if (!readyForSlot(c) || !c.s.offer) { if (slots.day) dentist.handlers.day_req(c, slots, seg); return; }
      if (booked(c)) return;
      // after "Tengo X o Y": "El jueves" / "Mañana" / "A las siete" takes the one it names; "¿El jueves?" asks again;
      // "El martes no" leaves the other one, offered alone
      const ch = pickChoice(c, slots, seg);
      if (ch) {
        if (/(^|\s)no(\s|$)/.test(c.heard.toLowerCase().replace(/[¿?¡!,.]/g, " "))) {
          if (turnSegments(c).some((x) => x !== seg && PICK_ACTS.has(x.intent))) return;
          takeOrAsk(c, (c.s.choice as string[]).find((k) => k !== ch)!, true); return;
        }
        takeOrAsk(c, ch); return;
      }
      if (choiceBoth(c, slots, seg)) { takeOrAsk(c, (c.s.choice as string[])[0], true); return; }
      const o = OFFERS[c.s.offer];
      const d = slots.day as string | undefined;
      const tm = slots.time as { h: number; m: number; ampm?: string } | undefined;
      // "El próximo martes" is not this week's Tuesday
      const sameDay = (!d || onDay(c.s.offer, d, nextWeek(c, slots, seg))) && fitsPart(c.s.offer, partOf(slots, seg));
      const sameTime = !tm || (o.h % 12 === tm.h % 12 && o.m === tm.m && !(tm.ampm === "am" && o.h >= 12) && !(tm.ampm === "pm" && o.h < 12));
      // "No el martes, el miércoles": a turn with "no" in it never books the offer it names
      const neg = /(^|\s)no(\s|$)/.test(c.heard.toLowerCase().replace(/[¿?¡!,.]/g, " "));
      if (sameDay && sameTime && neg) {
        // "El martes a las diez | no puedo", "No a las diez, | a las once": the other piece answers (one offer, not the
        // refused one again)
        if (turnSegments(c).some((x) => x !== seg && PICK_ACTS.has(x.intent))) return;
        if (!turn(c).picked) { turn(c).picked = true; offer(c, c.s.offer, true); c.hold(); }
        return;
      }
      // "¿El martes?", "El martes a las diez, ¿verdad?" (typed questions) check the offer: Lorena asks again
      if (sameDay && sameTime) { takeOrAsk(c, c.s.offer); return; }
      if (tm) { dentist.handlers.time_req(c, slots, seg); return; }
      dentist.handlers.day_req(c, slots, seg);
    },
    accept(c, slots, seg) {
      if (c.step === "hold" && !c.s.holdDone) {
        holdOk(c, true);
        // "El miércoles está bien." while Lorena asks to hold: she offers that day first
        const d = slots.day as string | undefined;
        const k = d ? keyForDay(c, d, slots, seg) : undefined;
        if (k && !(moving(c) && k === "early")) c.s.wantDay = k;
        return;
      }
      if (c.s.appt) { if (slots.day || slots.time) booked(c); return; }
      if (!readyForSlot(c) || !c.s.offer) return;
      // "Sí, me queda bien, pero ¿tiene algo más temprano?", "Me queda bien, pero mejor el miércoles", "Perfecto,
      // ¿cuánto cuesta?": the other piece answers; nothing is booked yet
      if (turnSegments(c).some((x) => x !== seg && DEFER_ACCEPT.has(x.intent))) return;
      const tm = slots.time as { h: number; m: number; ampm?: string } | undefined;
      const d0 = slots.day as string | undefined;
      const nx = nextWeek(c, slots, seg);
      // after "Tengo X o Y": "El jueves está bien" takes that one; "Me queda bien" alone names neither (below)
      const ch = pickChoice(c, slots, seg);
      if (ch) { takeOrAsk(c, ch); return; }
      if (choiceBoth(c, slots, seg)) { takeOrAsk(c, (c.s.choice as string[])[0], true); return; }
      if (tm) {
        // "A las cuatro y media está perfecto": the offered slot with that time, if any
        const hit = (c.s.offered || []).find((k: string) => {
          const o = OFFERS[k];
          return o.h % 12 === tm.h % 12 && o.m === tm.m && (!d0 || onDay(k, d0, nx));
        });
        if (hit) { takeOrAsk(c, hit); return; }
        if (onlyNow(c)) { onlyOne(c); return; }
        // "El viernes a las once está perfecto": an opening Lorena has but hasn't offered yet
        const has = slotAt(c, tm, d0, nx);
        if (has && d0) { takeOrAsk(c, has); return; }
        if (has) { offer(c, has); c.hold(); return; }
        dentist.handlers.time_req(c, slots, { intent: "time_req", slots, tags: [] }); return;
      }
      // "El miércoles está bien" when Lorena offered Thursday: that day, please (never the offered one); "El próximo
      // martes está bien" when this Tuesday is on offer: next week's
      if (d0 && !onDay(c.s.offer, d0, nx)) { dentist.handlers.day_req(c, slots, { intent: "day_req", slots, tags: seg?.tags ?? [] }); return; }
      // "¿El martes está bien?" typed as a question asks again; "Me queda bien" after "Tengo X o Y": the first, asked
      if (d0 && asked(c)) { takeOrAsk(c, c.s.offer, true); return; }
      if (c.s.choice) { offer(c, (c.s.choice as string[])[0], true); c.hold(); return; }
      accept(c);
    },
    reject(c, slots) {
      if (!readyForSlot(c) || !c.s.offer) return;
      if (booked(c)) return;
      // "¿El martes, no?" typed with its question mark checks the offer ("Tuesday, right?"): Lorena asks again
      const d = slots?.day as string | undefined;
      if (d && /\bno\s*\?\s*$/i.test(c.heard.trim()) && onDay(c.s.offer, d, false)) { offer(c, c.s.offer, true); c.hold(); return; }
      // after "Tengo X o Y": "El jueves no puedo" leaves the other one, offered alone
      const ch = pickChoice(c, slots ?? {});
      if (ch) { takeOrAsk(c, (c.s.choice as string[]).find((k) => k !== ch)!, true); return; }
      if (c.s.onlyTwist && !moving(c) && !c.s.onlyRejected) {
        c.s.onlyRejected = true;
        c.s.offer = "monday"; c.s.offered = [...(c.s.offered || []), "monday"];
        c.say("only_next", { slot: slotVal(OFFERS.monday) }); c.hold(); return;
      }
      if (weekFull(c)) {
        const next = NEXT_WEEK.find((k) => !(c.s.offered || []).includes(k)) ?? NEXT_WEEK[(NEXT_WEEK.indexOf(c.s.offer) + 1) % NEXT_WEEK.length];
        offer(c, next, (c.s.offered || []).includes(next)); c.hold(); return;
      }
      const order = moving(c) ? ["move", "morning", "monday", "late", "wednesday"] : ["first", "early", "late", "morning", "monday", "wednesday"];
      const next = order.find((k) => !(c.s.offered || []).includes(k)) ?? order[(order.indexOf(c.s.offer) + 1) % order.length];
      offer(c, next, next !== "move" && (c.s.offered || []).includes(next)); c.hold();
    },
    availability_q(c) {
      if (!readyForSlot(c)) return;
      if (booked(c)) return;
      if (onlyNow(c)) { onlyOne(c); return; }
      const a = weekFull(c) ? "monday_am" : c.s.offer ?? "first";
      const b = weekFull(c) ? "monday" : a === "late" ? "morning" : "late";
      // both are on the table now: "El primero", "El del jueves", "A las siete" pick one (pickChoice)
      c.s.offer = a;
      c.s.offered = [...new Set([...(c.s.offered || []), a, b])];
      c.s.choice = [a, b];
      c.say("availability", { slot: slotVal(OFFERS[a]), slot2: slotVal(OFFERS[b]) });
      c.hold();
    },
    choose_ctx(c, slots, seg) {
      holdOk(c);
      if (booked(c)) return;
      if (!readyForSlot(c) || !c.s.offer) return;
      if (seg.tags.includes("none")) { dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] }); return; }
      const ch = c.s.choice as string[] | undefined;
      // "Cualquiera", "Me da igual": Lorena proposes one (the first) and asks
      if (seg.tags.includes("any")) { takeOrAsk(c, ch ? ch[0] : c.s.offer, true); return; }
      const k = pickChoice(c, slots, seg);
      if (!k && choiceBoth(c, slots, seg)) { takeOrAsk(c, ch![0], true); return; }
      if (k) {
        // "El primero no" leaves the other one
        if (/(^|\s)no(\s|$)/.test(c.heard.toLowerCase().replace(/[¿?¡!,.]/g, " "))) { takeOrAsk(c, ch!.find((x) => x !== k)!, true); return; }
        takeOrAsk(c, k); return;
      }
      // naming neither of the two (or with one opening on the table): a day or a time is a request; a part of the day
      // asks for one then
      if (slots.day || slots.time) { dentist.handlers.pick_ctx(c, slots, seg); return; }
      const tags = allTags(slots, seg);
      if (!ch && (tags.includes("tarde") || tags.includes("noche"))) { dentist.handlers.later(c, slots, seg); return; }
      if (!ch && tags.includes("am")) { dentist.handlers.morning(c, slots, seg); return; }
      takeOrAsk(c, ch ? ch[0] : c.s.offer, true);
    },
    maybe_ctx(c, _slots, seg) {
      holdOk(c);
      if (c.s.appt || !readyForSlot(c) || !c.s.offer) return;
      // "Déjeme ver mi agenda": Lorena waits; "Puede ser" / "Tal vez": she asks again (no booking on a maybe)
      if (seg.tags.includes("think")) { GLOBAL_HANDLERS.g_dontknow?.(c as ConvCtx, {}); return; }
      const ch = c.s.choice as string[] | undefined;
      takeOrAsk(c, ch ? ch[0] : c.s.offer, true);
    },
    when_q(c) {
      // "¿A qué hora?", "¿Me repite el día y la hora?": the time on offer, or the appointment once it is set
      if (c.s.appt) { c.say("appt_set", { slot: slotVal(OFFERS[c.s.appt]) }); return; }
      if (c.s.canceled) { c.say("canceled"); return; }
      if (!readyForSlot(c) || !c.s.offer) return;
      const ch = c.s.choice as string[] | undefined;
      if (ch) { c.say("availability", { slot: slotVal(OFFERS[ch[0]]), slot2: slotVal(OFFERS[ch[1]]) }); c.hold(); return; }
      takeOrAsk(c, c.s.offer, true);
    },
    date_ctx(c) {
      holdOk(c);
      if (booked(c)) return;
      if (!readyForSlot(c) || !c.s.offer || turn(c).picked) return;
      // "¿Tiene algo el 12 de noviembre?": Lorena works by the week's days; that day is full, the opening again
      c.say("day_full");
      const ch = c.s.choice as string[] | undefined;
      takeOrAsk(c, ch ? ch[0] : c.s.offer, true);
    },
    name_q(c) { c.say("her_name"); },
    hours_q(c) { c.say("hours"); },

    hold_ok_ctx(c) { holdOk(c, true); },
    speak_up(c) {
      c.say("speak_up_ok");
      c.expect({
        id: "hear", optional: true, expects: ["hear_ok"], hints: ["hear"],
        suggest: [{ lt: "Say if you can hear her now", hint: "hear" }],
        yes: (cc) => { cc.say("hear_great"); },
        no: (cc) => { cc.say("speak_up_ok"); },
        // "No, todavía no" here answers "¿Así me escucha mejor?" (still can't hear), never "¿Ya había venido antes?"
        on: { hear_ok: (cc) => { cc.say("hear_great"); }, new_yes: (cc, _sl, sg) => { if (!sg.tags.includes("notyet")) return false; cc.say("speak_up_ok"); } },
      });
    },
    hear_me(c) { c.say("hear_you"); },
    hear_ok(c) { c.say("hear_great"); },

    address_q(c) { c.say("address"); },
    parking_q(c) { c.say("parking"); },
    duration_q(c) { c.say(c.s.newPt === true && !moving(c) && c.s.reason !== "cleaning" ? "duration" : "duration_short"); },
    bring_q(c) { c.say("bring"); },
    cancel_policy_q(c) { if (turn(c).policy) return; turn(c).policy = true; c.say("cancel_policy"); },
    forms_q(c) { c.say("forms"); },
    doctor_q(c) { c.say("doctor"); },
    pain_q(c) { c.say("pain_advice"); },
    pay_q(c) { c.say(/dolar/.test(plain(c.heard)) ? "pay_dollars" : "pay"); },
    english_q(c) { c.say("english"); },

    move(c, slots, seg) {
      const tgt0 = slots?.target as string | undefined;
      // "…para el próximo martes": next week's Tuesday, never this week's
      const tk = tgt0 ? keyForDay(c, tgt0, slots, seg) : undefined;
      // "¿Puedo cambiar la cita?" right after booking it (or "Sí" to "¿Quiere cambiarla para otro día?"): Lorena
      // frees that time and offers another one (the day asked for, if any)
      if (c.s.booking && !c.s.moving && c.s.appt) {
        const old = c.s.appt as string;
        // kept until a new time is agreed: "Mejor déjela como estaba" / "Así está bien" gives it back (keepOld)
        c.s.prevAppt = old;
        const asked = tk && tk !== "only" ? tk : undefined;
        c.s.wantDay = asked ?? ["first", "early", "late", "morning", "monday", "wednesday"].find((k) => k !== old && !(c.s.offered || []).includes(k)) ?? (old === "first" ? "late" : "first");
        c.s.appt = undefined; c.s.offer = undefined; c.s.moreDone = false;
        c.say("reason_ok");
        return;
      }
      // "Mañana no puedo ir a la cita" while booking a new one is a no to the offer, not a second appointment
      if (c.s.booking && !c.s.moving && c.s.offer) { dentist.handlers.reject(c, slots, { intent: "reject", slots, tags: [] }); return; }
      c.s.task = c.s.task || "move";
      c.s.moreDone = false;
      // "…¿la puedo pasar para el miércoles?": Lorena offers that day first (never tomorrow 9:30, the slot being moved)
      if (tk && tk !== "early" && tk !== "only" && !c.s.offer) c.s.wantDay = tk === "late" ? "move" : tk;
      if (c.s.moving) return;
      c.s.moving = true;
      c.s.booking = false;
      c.twist("reschedule");
      c.say(words(c.s.name) >= 2 ? "move_ok_dob" : "move_ok");
    },
    cancel(c) {
      c.s.task = c.s.task || "cancel";
      c.say("offer_reschedule");
      // "Sí, para el viernes" / "El viernes": move it to that day
      const toDay = (cc: Ctx, sl: any, sg: Segment) => {
        if (!sl.day) return false;
        dentist.handlers.move(cc, { target: sl.day }, sg);
      };
      c.expect({
        id: "reschedule_q", expects: ["move", "pick_ctx", "day_req"], hints: ["g_yesno", "move"],
        suggest: [{ lt: "Say if you'd like to move it", hint: "g_yesno" }, { lt: "Move your appointment", hint: "move" }],
        yes: (cc) => { dentist.handlers.move(cc, {}, { intent: "move", slots: {}, tags: [] }); },
        no: (cc) => { cc.s.canceled = true; cc.s.appt = undefined; cc.s.prevAppt = undefined; cc.say("canceled"); },
        on: { move: (cc, sl, sg) => { dentist.handlers.move(cc, sl, sg); }, cancel: (cc) => { cc.s.canceled = true; cc.s.appt = undefined; cc.s.prevAppt = undefined; cc.say("canceled"); },
          pick_ctx: toDay, day_req: toDay },
        ask: (cc) => cc.say("offer_reschedule"),
      });
    },

    keep_appt(c, slots, seg) {
      // "No, mejor déjela como estaba": the time just booked stands; "Déjela el viernes" names another day
      const old = c.s.prevAppt as string | undefined;
      const d = slots.day as string | undefined;
      const tm = slots.time as { h: number; m: number } | undefined;
      const same = !!old && (!d || onDay(old, d, false)) && (!tm || (OFFERS[old].h % 12 === tm.h % 12 && OFFERS[old].m === tm.m));
      if (same && keepOld(c)) return;
      // moving tomorrow's appointment, "Mejor la dejo como está" keeps it after all (once Lorena has found it)
      if (moving(c) && !c.s.appt && c.s.foundAppt && !d && !tm) {
        c.s.offer = "early"; c.s.appt = "early"; c.s.choice = undefined; c.s.keptOld = true;
        c.say("appt_set", { slot: slotVal(EXISTING) });
        c.s.donePath = c.s.donePath || "move";
        c.complete();
        return;
      }
      if ((d || tm) && readyForSlot(c) && c.s.offer && !c.s.appt) dentist.handlers.pick_ctx(c, slots, seg);
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
    if (o) c.say("see_you", { day: dayVal(o.d) });
    else c.say("bye_plain");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "more" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        see_you: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
    if (c.s.saidSeeYou) c.end();
  },

  tests: [
    // every hint construction
    { say: "Quisiera hacer una cita", intent: "book" },
    { say: "¿Me puede dar una cita, por favor?", intent: "book" },
    { say: "Llamo para hacer una cita", intent: "book" },
    { say: "Necesito ver a un dentista lo antes posible", intent: "book" },
    { say: "Tengo dolor de muelas", intent: "reason_ans", slots: { reason: "toothache" } },
    { say: "Quisiera una cita para una revisión", intent: "book", slots: { reason: "checkup" } },
    { say: "Necesito una limpieza", intent: "book", slots: { reason: "cleaning" } },
    { say: "¿Tiene algo esta semana?", intent: "book" },
    { say: "Me gustaría agendar una cita", intent: "book" },
    { say: "Me duele mucho una muela", intent: "reason_ans", step: "reason" },
    { say: "Es para una revisión", intent: "reason_ans", step: "reason", slots: { reason: "checkup" } },
    { say: "Solo una limpieza", intent: "reason_ans", step: "reason", slots: { reason: "cleaning" } },
    { say: "Se me rompió un diente", intent: "reason_ans", step: "reason" },
    { say: "Se me cayó una resina", intent: "reason_ans", step: "reason" },
    { say: "Desde hace tres días", intent: "pain_len", step: "pain_len" },
    { say: "Desde el lunes", intent: "pain_len", step: "pain_len" },
    { say: "Sí, soy paciente nuevo", intent: "new_yes", step: "new_pt" },
    { say: "Es mi primera vez", intent: "new_yes", step: "new_pt" },
    { say: "No, ya he venido antes", intent: "new_no", step: "new_pt", not: ["new_yes"] },
    { say: "Me llamo Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "Mi apellido es Miller", intent: "name_ctx", step: "surname" },
    { say: "Se escribe eme, i, ele, ele, e, erre", intent: "spell_ctx", step: "spell" },
    { say: "El 4 de junio de 1990", intent: "dob_ctx", step: "dob", slots: { date: { day: 4, month: 6 }, year: 1990 } },
    { say: "Nací el 4 de junio de 1990", intent: "dob_ans", slots: { year: 1990 } },
    { say: "Mi número es 984 123 4567", intent: "phone_ans", step: "phone", slots: { digits: "9841234567" } },
    { say: "Puede llamarme a este número", intent: "phone_ans", step: "phone" },
    { say: "No, no tengo seguro", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Voy a pagar yo", intent: "insurance_no", step: "insurance" },
    { say: "Sí, tengo seguro dental", intent: "insurance_yes", step: "insurance" },
    { say: "¿Cuánto cuesta la consulta?", intent: "cost_q" },
    { say: "Sí, me queda bien", intent: "accept", step: "slot" },
    { say: "¿Tiene algo antes?", intent: "earlier", step: "slot" },
    { say: "¿Tiene algo más tarde?", intent: "later", step: "slot" },
    { say: "El martes a las diez está perfecto", intent: "accept", step: "slot", slots: { day: "tuesday" } },
    { say: "¿Puedo ir el viernes?", intent: "day_req", step: "slot", slots: { day: "friday" } },
    { say: "Perdón, a esa hora trabajo", intent: "later", step: "slot", not: ["accept"] },
    { say: "No me queda", intent: "reject", step: "slot", not: ["accept"] },
    { say: "Perdón, ¿puede hablar más fuerte?", intent: "speak_up" },
    { say: "Perdón, se está cortando", intent: "speak_up" },
    { say: "¿Me escucha?", intent: "hear_me" },
    { say: "Sí, claro, la espero", intent: "hold_ok_ctx", step: "hold" },
    { say: "Claro, no hay problema", intent: "hold_ok_ctx", step: "hold" },
    { say: "¿Cuál es la dirección?", intent: "address_q" },
    { say: "¿Dónde me puedo estacionar?", intent: "parking_q" },
    { say: "¿Cuánto dura la consulta?", intent: "duration_q" },
    { say: "¿Qué tengo que llevar?", intent: "bring_q" },
    { say: "¿Aceptan tarjeta?", intent: "pay_q" },
    { say: "¿La doctora habla inglés?", intent: "english_q" },
    { say: "Tengo una cita mañana y quisiera cambiarla", intent: "move" },
    { say: "Quisiera cambiar mi cita", intent: "move" },
    { say: "¿Puedo cambiar mi cita?", intent: "move" },
    { say: "A las cuatro y media está perfecto", intent: "accept", step: "slot" },
    { say: "No, es todo. ¡Gracias!", intent: "more_no", step: "more" },
    { say: "¡Hasta el jueves!", intent: "see_you", step: "more" },
    { say: "Sí, mucho mejor", intent: "hear_ok" },
    { say: "Sí, ya la escucho", intent: "hear_ok" },
    // natural alternatives, short answers, tú to staff, no accents
    { say: "Hola, quiero sacar una cita con el dentista", intent: "book" },
    { say: "¿Puedes darme una cita?", intent: "book" },
    { say: "Es urgente", intent: "book" },
    { say: "Se me cayó un empaste", intent: "reason_ans", step: "reason" },
    { say: "Tengo una muela picada", intent: "reason_ans", step: "reason" },
    { say: "Hace tres dias", intent: "pain_len", step: "pain_len" },
    { say: "Llevo dos días con dolor", intent: "pain_len", step: "pain_len" },
    { say: "Nunca he ido", intent: "new_yes", step: "new_pt" },
    { say: "Ya soy paciente", intent: "new_no", step: "new_pt" },
    { say: "Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "eme i doble ele e erre", intent: "spell_ctx", step: "spell", slots: { letters: "miller" } },
    { say: "doble ve, i, ele, ese, o, ene", intent: "spell_ctx", step: "spell", slots: { letters: "wilson" } },
    { say: "be grande, a, ka, e, erre", intent: "spell_ctx", step: "spell", slots: { letters: "baker" } },
    { say: "04/06/1990", intent: "dob_ctx", step: "dob", slots: { numdate: { day: 4, month: 6, year: 1990 } } },
    { say: "nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete", intent: "phone_ctx", step: "phone", slots: { digits: "9841234567" } },
    { say: "Particular", intent: "insurance_no", step: "insurance" },
    { say: "¿Me escuchas?", intent: "hear_me" },
    { say: "¿Bueno? ¿Me oye?", intent: "hear_me" },
    { say: "¿No hay nada antes?", intent: "earlier", step: "slot", not: ["accept"] },
    { say: "El martes no, mejor el miércoles", intent: "day_req", step: "slot", slots: { day: "wednesday" }, not: ["accept"] },
    { say: "Trabajo hasta las cinco", intent: "later", step: "slot" },
    { say: "¿Cuál es su horario?", intent: "hours_q" },
    { say: "¿Y si tengo que cancelar?", intent: "cancel_policy_q", not: ["cancel"] },
    { say: "Quiero cancelar mi cita", intent: "cancel", step: "help_move" },
    { say: "Tengo cita mañana, ¿la puedo pasar para el miércoles?", intent: "move", step: "help_move", slots: { target: "wednesday" } },
    // Spain forms are correct answers
    { say: "Quiero coger cita con el dentista", intent: "book" },
    { say: "Mi móvil es 984 123 4567", intent: "phone_ans", step: "phone" },
    { say: "¿Dónde puedo aparcar el coche?", intent: "parking_q" },
    { say: "¿Tenéis algo esta semana?", intent: "book" },
    { say: "Vale, me queda bien", intent: "accept", step: "slot" },
    // meaning safety
    { say: "No quiero hacer una cita", intent: "none", not: ["book"] },
    { say: "No tengo dolor de muelas", intent: "none", not: ["reason_ans"] },
    { say: "No soy paciente nuevo", intent: "new_no", step: "new_pt", not: ["new_yes"] },
    { say: "No tengo seguro dental", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Solo tengo seguro de viaje", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Ese día no puedo", intent: "reject", step: "slot", not: ["accept"] },
    { say: "En la mañana no puedo", intent: "later", step: "slot", not: ["accept", "morning"] },
    { say: "No me sirve el martes", intent: "reject", step: "slot", not: ["accept"] },
    { say: "No quiero cambiar mi cita", intent: "none", step: "help_move", not: ["move"] },
    { say: "No quiero cancelar mi cita", intent: "none", step: "help_move", not: ["cancel"] },
    { say: "No me duele nada, es solo una revisión", intent: "reason_ans", step: "reason", slots: { reason: "checkup" } },
    { say: "No tengo número mexicano", intent: "phone_foreign_ctx", step: "phone", not: ["phone_ans", "phone_ctx"] },
    { say: "¿El martes de la próxima semana?", intent: "day_req", step: "slot", slots: { day: "tuesday" } },
    { say: "El lunes en la mañana", intent: "pick_ctx", step: "slot", slots: { day: "monday" } },
    { say: "Ryan Miller, para servirle", intent: "name_ctx", step: "name" },
    { say: "Nací el cuatro de junio del noventa", intent: "dob_ans", step: "dob" },
    { say: "Mañana no puedo ir, ¿puedo cambiar la cita?", intent: "move", step: "help_move" },
    { say: "Ese horario no me queda", intent: "reject", step: "slot", not: ["accept"] },
    { say: "¿No tiene nada en la tarde?", intent: "later", step: "slot", not: ["accept"] },
    { say: "Habla Ryan Miller", intent: "intro_name", step: "help" },
    // must not be understood
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "La bicicleta del vecino es verde", intent: "none" },
    { say: "Ryan Miller", intent: "none" },
    { say: "eme i ele ele e erre", intent: "none" },
    // review: corrections, lost commas and meaning safety
    { say: "No el martes, el miércoles", intent: "day_req", step: "slot", slots: { day: "wednesday" }, not: ["accept", "pick_ctx"] },
    { say: "El martes no puedo, ¿y el jueves?", intent: "day_req", step: "slot", slots: { day: "thursday" }, not: ["accept", "reject"] },
    { say: "No, todavía no", intent: "new_yes", step: "new_pt", not: ["speak_up", "new_no"] },
    { say: "No voy a pagar yo, tengo seguro", intent: "insurance_yes", step: "insurance", not: ["insurance_no"] },
    { say: "Tengo seguro de viaje", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Sí, pero no dental", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "¿Aceptan seguro?", intent: "insurance_q", not: ["insurance_yes"] },
    { say: "No, nada más cancélela, por favor", intent: "cancel", not: ["move"] },
    { say: "No quiero cancelar, quiero cambiar mi cita para otro día", intent: "move", not: ["cancel"] },
    { say: "Ese día no", intent: "reject", step: "slot", not: ["accept"] },
    { say: "No, mejor otro día", intent: "reject", step: "slot", not: ["accept"] },
    { say: "Sí, pero en la tarde", intent: "later", step: "slot", not: ["accept"] },
    { say: "¿Dónde están ubicados?", intent: "address_q" },
    { say: "Gracias, es todo", intent: "more_no", step: "more" },
    // lead's check: questions never book, next week is never this week, one answer per turn, money answers
    { say: "¿Tiene algo el martes?", intent: "day_req", step: "slot", slots: { day: "tuesday" }, not: ["accept"] },
    { say: "¿Abren el martes?", intent: "day_req", step: "slot", not: ["accept"] },
    { say: "Mejor el martes de la próxima semana", intent: "day_req", step: "slot", slots: { day: "tuesday" }, not: ["accept"] },
    { say: "¿No tiene nada el miércoles de la próxima semana?", intent: "day_req", step: "slot", slots: { day: "wednesday" }, not: ["accept"] },
    // pick_ctx + reject: the handler leaves the refused offer to the reject (one offer, probe)
    { say: "El martes a las diez no puedo", intent: "pick_ctx", step: "slot", not: ["accept"] },
    { say: "No a las diez, a las once", intent: "pick_ctx", step: "slot", not: ["accept"] },
    { say: "¿El martes, no?", intent: "reject", step: "slot", not: ["accept"] },
    { say: "Tampoco me queda", intent: "reject", step: "slot", not: ["accept"] },
    { say: "Prefiero el jueves", intent: "day_req", step: "slot", slots: { day: "thursday" } },
    { say: "No puedo en la tarde", intent: "morning", step: "slot", not: ["later", "accept"] },
    { say: "No puedo en la mañana", intent: "later", step: "slot", not: ["morning", "accept"] },
    { say: "No tengo seguro dental, pero tengo seguro médico", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "No voy a pagar particular, tengo seguro", intent: "insurance_yes", step: "insurance", not: ["insurance_no"] },
    { say: "Sí, tengo seguro, pero voy a pagar yo", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Con mi seguro", intent: "insurance_yes", step: "insurance", not: ["insurance_no"] },
    { say: "¿Es gratis la valoración?", intent: "cost_q", not: ["insurance_no", "insurance_yes"] },
    { say: "¿Aceptan dólares?", intent: "pay_q" },
    // cost_q + cancel_policy_q: the handler answers the cancel policy only, never the exam price (probe)
    { say: "¿Cuánto cobran si cancelo?", intent: "cost_q", not: ["cancel"] },
    { say: "Sí, quiero cancelarla", intent: "cancel", not: ["move"] },
    { say: "No quiero cancelarla", intent: "none", not: ["cancel"] },
    { say: "No, mejor déjela como estaba", intent: "keep_appt", step: "slot", not: ["accept", "move"] },
    { say: "Nueve ochenta y cuatro", intent: "phone_ctx", step: "phone", slots: { digits: "984" } },
    // audit (5 Nov 2026): picking one of two openings, maybes, the time asked again, side questions, dates
    { say: "El primero", intent: "choose_ctx", step: "slot", not: ["accept"] },
    { say: "La segunda", intent: "choose_ctx", step: "slot", not: ["accept"] },
    { say: "El del jueves", intent: "choose_ctx", step: "slot", slots: { day: "thursday" } },
    { say: "La de la noche", intent: "choose_ctx", step: "slot", not: ["accept"] },
    { say: "Cualquiera", intent: "choose_ctx", step: "slot", not: ["accept"] },
    { say: "Ninguno de los dos", intent: "choose_ctx", step: "slot", not: ["accept"] },
    { say: "Puede ser", intent: "maybe_ctx", step: "slot", not: ["accept"] },
    { say: "Tal vez", intent: "maybe_ctx", step: "slot", not: ["accept"] },
    { say: "Déjeme pensarlo", intent: "maybe_ctx", step: "slot", not: ["accept"] },
    { say: "Mejor en la noche", intent: "later", step: "slot", not: ["accept"] },
    { say: "Me queda bien el martes, pero no a las diez", intent: "reject", step: "slot", not: ["accept"] },
    { say: "¿Tiene algo para el 12 de noviembre?", intent: "date_ctx", step: "slot", not: ["accept"] },
    { say: "¿A qué hora es mi cita?", intent: "when_q", step: "more" },
    { say: "¿Me repite el día y la hora?", intent: "when_q", step: "more" },
    { say: "¿Para qué día quedó?", intent: "when_q", step: "more" },
    { say: "¿Con quién hablo?", intent: "name_q" },
    { say: "¿En qué calle están?", intent: "address_q" },
    { say: "Sí, una pregunta", intent: "help_me", step: "more", not: ["more_no"] },
    { say: "Mi número es de Estados Unidos", intent: "phone_foreign_ctx", step: "phone", not: ["phone_ans"] },
    { say: "No puedo esperar", intent: "hold_no_ctx", step: "hold", not: ["hold_ok_ctx"] },
    { say: "Junio cuatro, mil novecientos noventa", intent: "dob_ctx", step: "dob", slots: { mdate: { day: 4, month: 6 } } },
    { say: "El cuatro de junio, noventa", intent: "dob_ctx", step: "dob", slots: { date: { day: 4, month: 6 } } },
    { say: "Miller, con doble ele", intent: "spell_ctx", step: "spell" },
  ],

  sims: [
    { name: "toothache, new patient, an earlier time",
      turns: ["Buenos días, quisiera hacer una cita. Me duele una muela.", "Sí, es mi primera vez.", "Ryan Miller.", "Eme, i, ele, ele, e, erre.", "El cuatro de junio de mil novecientos noventa.", "Mi número es 984 123 4567.", "No, no tengo seguro.", "¿Tiene algo antes?", "Perfecto, me queda bien.", "No, es todo. ¡Gracias!"],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; }, expect: { complete: true, state: { appt: "early", newPt: true, insurance: false } }, auto: DENTIST_AUTO },
    { name: "checkup, bad line and questions",
      turns: ["Buenas tardes. ¿Me puede dar una cita para una revisión?", "Perdón, ¿puede hablar más fuerte?", "No, ya he venido antes.", "Me llamo Ryan.", "Miller.", "Se escribe eme, i, doble ele, e, erre.", "El 4 de junio de 1990.", "¿Tiene algo en la tarde?", "Sí, me queda bien.", "¿Cuál es la dirección?", "¿Dónde me puedo estacionar?", "Nada más, gracias."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; }, expect: { complete: true, state: { appt: "late", newPt: false } }, auto: DENTIST_AUTO },
    { name: "reschedule (twist forced)",
      turns: ["Hola, tengo una cita mañana y quisiera cambiarla.", "Ryan Miller.", "El cuatro de junio de mil novecientos noventa.", "A las cuatro y media está perfecto.", "No, es todo. Gracias."],
      setup: (s) => { s.moveTwist = true; s.onlyTwist = false; s.spellOnMove = false; s.askHold = false; }, expect: { complete: true, state: { appt: "move", moving: true } }, auto: DENTIST_AUTO },
    // moving: "anything earlier" gets Tuesday at 10, never tomorrow 9:30 (the appointment being moved)
    { name: "reschedule, anything earlier (twist forced)",
      turns: ["Quisiera cambiar mi cita de mañana.", "Ryan Miller.", "4 de junio de 1990.", "¿Tiene algo antes?", "¿Nada más pronto?", "Sí, está bien.", "Eso es todo."],
      setup: (s) => { s.moveTwist = true; s.onlyTwist = false; s.spellOnMove = false; s.askHold = false; }, expect: { complete: true, state: { appt: "first" } }, auto: DENTIST_AUTO },
    { name: "only one opening this week, accepted (twist forced)",
      turns: ["Quisiera hacer una cita para una limpieza.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "¿No tiene algo el viernes?", "Bueno, pasado mañana a las nueve está bien.", "Gracias, eso es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = true; s.askHold = false; s.npVariant = 0; }, expect: { complete: true, state: { appt: "only" } }, auto: DENTIST_AUTO },
    { name: "only one opening this week, turned down: next Monday (twist forced)",
      turns: ["Necesito una cita, se me cayó una resina.", "Es mi primera vez.", "Ryan Miller.", "eme, i, ele, ele, e, erre", "4 de junio de 1990", "984 123 4567", "Voy a pagar yo.", "Ese día no puedo.", "El lunes a las cinco está bien.", "Nos vemos el lunes."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = true; s.askHold = false; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "monday", onlyRejected: true } }, auto: DENTIST_AUTO },
    { name: "on hold, then a day of my own (twist forced)",
      turns: ["Llamo para hacer una cita.", "Es para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El cuatro de junio de mil novecientos noventa.", "Sí, claro, la espero.", "¿Y el miércoles?", "Perfecto.", "¿Qué tengo que llevar?", "¿La doctora habla inglés?", "Eso es todo, gracias."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = true; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "wednesday", holdDone: true } }, auto: DENTIST_AUTO },
    { name: "short answers, the line breaks up at the phone number (twist forced)",
      turns: ["Una cita, por favor.", "Una limpieza.", "Sí.", "Ryan Miller.", "eme i ele ele e erre", "04/06/1990", "984 123 4567", "984 123 4567", "Particular.", "¿Cuánto cuesta?", "Sí.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.badLineAt = "phone"; s.npVariant = 0; }, expect: { complete: true, state: { appt: "first", newPt: true } }, auto: DENTIST_AUTO },
    { name: "only opening refused, the rest of the week is full (twist forced)",
      turns: ["Quisiera una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "No me queda.", "¿Y el jueves?", "¿Tiene algo antes?", "Sí, me queda bien.", "Eso es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = true; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "monday_am", onlyRejected: true } }, auto: DENTIST_AUTO },
    { name: "cancel, then move it after all",
      turns: ["Necesito cancelar la cita de mañana.", "Sí, mejor cámbiela.", "Ryan Miller.", "4 de junio de 1990.", "Sí, me queda bien.", "Nos vemos el jueves."],
      setup: (s) => { s.moveTwist = true; s.onlyTwist = false; s.spellOnMove = false; s.askHold = false; }, expect: { complete: true, state: { appt: "move" } }, auto: DENTIST_AUTO },
    { name: "a correction, then a change right after booking",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "No el martes, el miércoles.", "Sí, me queda bien.", "¿Puedo cambiar la cita para el viernes?", "Perfecto.", "Gracias, es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "morning", newPt: false } }, auto: DENTIST_AUTO },
    { name: "\"No es mi primera vez\" without its comma: Lorena asks again",
      turns: ["Necesito una cita para una limpieza.", "No es mi primera vez.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "4 de junio de 1990", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 1; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first", newPt: false } }, auto: DENTIST_AUTO },
    // lead's check
    { name: "a question about the day on offer asks again; next week's Tuesday, never this week's",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "¿Tiene algo el martes?", "Mejor el martes de la próxima semana.", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "next_tue" } }, auto: DENTIST_AUTO },
    { name: "a phone number in two pieces, no dental insurance but medical, dollars",
      turns: ["Quisiera hacer una cita para una limpieza.", "Sí, es mi primera vez.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "Nueve ochenta y cuatro", "Uno veintitrés, cuarenta y cinco, sesenta y siete", "No tengo seguro dental, pero tengo seguro médico", "¿Aceptan dólares?", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first", phone: "9841234567", insurance: false } }, auto: DENTIST_AUTO },
    { name: "a change right after booking, then keeping the time booked",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "Sí, me queda bien.", "¿Puedo cambiar la cita para el viernes?", "No, mejor déjela como estaba.", "Es todo, gracias."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first" } }, auto: DENTIST_AUTO },
    { name: "only one opening this week, next week in the morning (twist forced)",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "¿Tiene algo la próxima semana en la mañana?", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = true; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "monday_am", onlyRejected: true } }, auto: DENTIST_AUTO },
    { name: "still can't hear at \"¿Ya había venido antes?\": \"No, todavía no\" is no new patient",
      turns: ["Quisiera hacer una cita para una revisión.", "¿Puede hablar más fuerte?", "No, todavía no", "Sí, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 1; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first", newPt: false } }, auto: DENTIST_AUTO },
    // painLen set only so the sim player doesn't save "Hace mucho tiempo" for the pain question
    { name: "\"Hace mucho tiempo\" at \"¿Ya había venido antes?\" is a yes, never pain",
      turns: ["Quisiera hacer una cita para una revisión.", "Hace mucho tiempo.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 1; s.badLineAt = undefined; s.painLen = true; }, expect: { complete: true, state: { appt: "first", newPt: false, pain: undefined } }, auto: DENTIST_AUTO },
    // audit (5 Nov 2026): a booking only on a clear yes; two openings picked by pointing at one
    { name: "a typed question about the time on offer asks again; two openings, the second by its day",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "¿El martes?", "¿Qué horarios tiene?", "El del jueves.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "late" } }, auto: DENTIST_AUTO },
    { name: "two openings: a bare yes picks neither, the first one is offered alone",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "¿Qué horarios tiene?", "Sí.", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first" } }, auto: DENTIST_AUTO },
    { name: "a yes with a change or a price question books nothing yet",
      turns: ["Quisiera hacer una cita para una revisión.", "No, ya he venido antes.", "Ryan Miller.", "eme i ele ele e erre", "El 4 de junio de 1990.", "Me queda bien, pero mejor el miércoles.", "Perfecto, ¿cuánto cuesta?", "Puede ser.", "Sí, me queda bien.", "¿A qué hora es mi cita?", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "wednesday" } }, auto: DENTIST_AUTO },
    { name: "cancel, then move it to Friday in the same answer",
      turns: ["Necesito cancelar la cita de mañana.", "Sí, para el viernes.", "Ryan Miller.", "4 de junio de 1990.", "Sí, me queda bien.", "Es todo."],
      setup: (s) => { s.moveTwist = true; s.onlyTwist = false; s.spellOnMove = false; s.askHold = false; }, expect: { complete: true, state: { appt: "morning", moving: true } }, auto: DENTIST_AUTO },
    { name: "moving tomorrow's appointment, then keeping it after all",
      turns: ["Hola, tengo una cita mañana y quisiera cambiarla.", "Ryan Miller.", "El cuatro de junio de mil novecientos noventa.", "No, mejor la dejo como está.", "Es todo."],
      setup: (s) => { s.moveTwist = true; s.onlyTwist = false; s.spellOnMove = false; s.askHold = false; }, expect: { complete: true, state: { appt: "early", keptOld: true } }, auto: DENTIST_AUTO },
    { name: "no Mexican number: a number from home; a date asked first is full",
      turns: ["Quisiera una cita para una limpieza para el 12 de noviembre.", "Sí, es mi primera vez.", "Ryan Miller.", "eme i ele ele e erre", "Junio cuatro, mil novecientos noventa.", "No tengo celular mexicano.", "Más uno, cinco cinco cinco, uno dos tres, cuatro cinco seis siete.", "Voy a pagar yo.", "Sí, me queda bien.", "¿Con quién hablo?", "Es todo."],
      setup: (s) => { s.moveTwist = false; s.onlyTwist = false; s.askHold = false; s.npVariant = 0; s.badLineAt = undefined; }, expect: { complete: true, state: { appt: "first", phone: "15551234567", dateTold: true } }, auto: DENTIST_AUTO },
  ],
};

/** "¿Me espera un momentito?" — anything but a refusal means yes. */
function holdOk(c: Ctx, thank = false) {
  if (c.step !== "hold" || c.s.holdDone) return;
  c.s.holdDone = true;
  if (thank) c.say("hold_thanks");
}

function setReason(c: Ctx, r: string, tags: string[] = []) {
  const first = !c.s.reason;
  c.s.reason = r;
  const e = REASONS.find((x) => x.id === r);
  if (!tags.includes("nopain") && (e?.attrs?.pain || tags.includes("pain") || tags.includes("broken"))) c.s.pain = true;
  if (first) c.say(c.s.pain || e?.attrs?.problem || tags.includes("filling") ? "sorry_pain" : "reason_ok");
}

function setNew(c: Ctx, isNew: boolean) {
  if (c.s.newPt !== undefined) return;
  c.s.newPt = isNew;
  c.say(isNew ? "new_welcome" : "old_welcome");
}

/** "Del noventa" / "en el 90": a two-digit year. */
function yearFrom(slots: any, seg: { tags: string[] }) {
  if (slots.year) return slots;
  const n = typeof slots.number === "number" ? slots.number : undefined;
  if (seg.tags.includes("yy") && n !== undefined && n >= 0 && n <= 99) return { year: twoDigitYear(n) };
  // "El cuatro de junio 1990" read through the two-digit pattern: a whole year is a year
  if (seg.tags.includes("yy") && n !== undefined && birthYear(n)) return { year: n };
  return {};
}

function setDob(c: Ctx, slots: any) {
  const td = turn(c);
  if (td.dobRejected || c.s.dob) return;
  if (c.s.badLineAt === "dob" && !c.s.badLineDone && c.step === "dob") {
    c.s.badLineDone = true; td.dobRejected = true;
    c.twist("bad_line"); c.say("breaking_up"); c.hold(); return;
  }
  const nd = slots.numdate;
  const date = nd ? { day: nd.day, month: nd.month } : slots.date ?? slots.mdate;
  // "dos mil treinta" can't be a birth year: Lorena asks for the year again
  const y0 = nd ? nd.year : slots.year;
  const year = typeof y0 === "number" && birthYear(y0) ? y0 : undefined;
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
  // A number read in pieces ("Es el nueve ochenta y cuatro…" | "uno veintitrés, cuarenta y cinco, sesenta y siete"):
  // fewer than 7 digits is no phone number yet, so Lorena waits for the rest and joins the pieces (10 or more digits
  // at once are a whole number, said again). Decided once per turn, on every number said in it.
  if (!c.s.phone && /^\d+$/.test(digits)) {
    if (td.phoneDone) return;
    td.phoneDone = true;
    const said = turnSegments(c).filter((s) => (s.intent === "phone_ans" || s.intent === "phone_ctx") && /^\d+$/.test(String(s.slots?.digits ?? "")))
      .map((s) => String(s.slots.digits)).join("") || digits;
    const whole = said.length >= 10 || !c.s.phonePart ? said : c.s.phonePart + said;
    if (whole.length < 7) { c.s.phonePart = whole; c.say("phone_more"); c.hold(); return; }
    c.s.phonePart = undefined;
    c.s.phone = whole; c.say("phone_thanks"); return;
  }
  td.phone = (td.phone ?? "") + digits;
  if (!td.phoneAck) { td.phoneAck = true; if (!c.s.phone) { c.s.phone = td.phone; c.say("phone_thanks"); return; } }
  c.s.phone = td.phone;
}

export default dentist;
