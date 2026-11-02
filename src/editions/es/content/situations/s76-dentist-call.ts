// NEEDS: global.ts g_sorry_to_hear "¡Ay, qué pena!" first means "how embarrassing" in Mexico (suggest "¡Ay, lo siento!");
// this file uses its own sorry_pain line. Every merge, entity, value and pending question is local.
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

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "@/content/types";
import type { SlotFn } from "@/convo/grammar";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

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

/** Numeric dates, day first as in Mexico: "04/06/1990", "4-6-90", "4.6.1990"; month first (US) only when the second
 *  number can't be a month ("06/24/1990", with a tip). */
const numDate: SlotFn = (tokens, pos) => {
  const read = (a: number, b: number, z: number, end: number) => {
    const year = z < 100 ? (z > 30 ? 1900 + z : 2000 + z) : z;
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

/** The first opening Lorena has: tomorrow at 9:30, or Tuesday at 10 when that 9:30 is the appointment being moved. */
const earliest = (c: Ctx) => (moving(c) ? "first" : "early");

function offer(c: Ctx, key: string, again = false) {
  const o = OFFERS[key];
  c.s.offer = key;
  c.s.offered = c.s.offered || [];
  if (!c.s.offered.includes(key)) c.s.offered.push(key);
  if (key === "move" && !again) { c.say("move_offer"); return; }
  c.say(again ? "offer_again" : "offer", { slot: slotVal(o) });
}

function accept(c: Ctx) {
  const key = c.s.offer;
  if (!key) return;
  const o = OFFERS[key];
  c.s.appt = key;
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

/** The offered or still-free opening at a said clock time (never the one being moved, never this week's only opening
 *  unless it is the twist's). */
function slotAt(c: Ctx, tm: { h: number; m: number; ampm?: string }, day?: string): string | undefined {
  const match = (k: string) => {
    const o = OFFERS[k];
    if (tm.ampm === "am" && o.h >= 12) return false;
    if (tm.ampm === "pm" && o.h < 12) return false;
    return o.h % 12 === tm.h % 12 && o.m === tm.m && (!day || o.d === day);
  };
  const offered = (c.s.offered || []).find((k: string) => match(k));
  if (offered) return offered;
  const pool = weekFull(c) ? [...NEXT_WEEK, "only"] : Object.keys(OFFERS).filter((k) => !NEXT_WEEK.includes(k) || k === "monday");
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
    },
    slots: {
      numdate: { fn: numDate },
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
    help_me: { patterns: ["@staff ayudar", "necesito (ayuda | su ayuda)", "[si] tengo una pregunta", "(puedo | le puedo) hacer una pregunta", "[no] solo (una pregunta | quiero preguntar algo)"] },
    pain_len: { patterns: [
      "(desde hace | hace) {number} (dias | dia | semanas | semana) #h:len_days", "desde {day} [@dpart] #h:len_since",
      "desde (ayer | anoche | antier | antes de ayer | la semana pasada | el fin de semana | esta manana | hoy en la manana) [en la noche | en la tarde]",
      "(desde hace | hace) (unos dias | un par de dias | una semana | dos semanas | dos o tres dias | mucho tiempo)",
      "[ya] {number} (dias | semanas) [ya]", "(ya tiene | ya son | ya va a ser | lleva | ya lleva) @dur", "@dur [ya]",
      "llevo @dur con (dolor | la molestia | molestias | el dolor)",
      "(empezó | me empezó | me empezó a doler | comenzó) (ayer | anoche | antier | {day} | hace {number} dias | hace unos dias | esta manana) [en la noche | en la manana | en la tarde]",
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
    ] },
    dob_ans: { patterns: [
      "(es | mi fecha de nacimiento es | naci) [el] {date} [de | del] [{year}] #h:dob_is", "naci el {date} (de | del) {year} #h:dob_born",
      "(naci | es) en {year}", "(mi fecha de nacimiento es | naci el | es el) {numdate}", "mi cumpleanos es [el] {date} [de | del] [{year}]", "(naci | es) el {date} del {number} #yy",
    ] },
    dob_ctx: { patterns: ["{date} [de | del] [{year}] #h:dob_is", "[el] {numdate}", "{date} del {number} #yy"] },
    year_ctx: { patterns: ["[en | de | del] {year} #h:year_is", "(del | en el) {number} #yy"] },
    hold_ok_ctx: { patterns: [
      "[si | claro | si claro] (la | lo) espero #h:hold_sure", "[claro] no hay (problema | prisa) #h:hold_course",
      "(si claro | claro que si | por supuesto | con gusto | como no) [la espero]", "[si] (tomese | tomate) su tiempo", "[si] aqui (espero | estoy)",
      "[si] (puedo | le puedo) esperar", "[si] no tengo prisa", "[si] sin prisa",
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

    // --- insurance or paying privately
    insurance_no: { patterns: [
      "[no] no tengo [ningun] seguro [dental | medico | de gastos medicos] [todavia | aqui | en mexico] #h:ins_none",
      "[no] (voy a pagar | pago | pagaria | lo pago | lo voy a pagar) (yo | yo mismo | yo misma | particular) #h:ins_self",
      "[no] [es | seria | voy a pagar] particular", "[no] (solo | nada mas | solamente) tengo seguro de viaje",
      "[no] mi seguro es (de | del | en) (estados unidos | canada | mi pais | inglaterra | otro pais | australia)",
      "[no] (pago | voy a pagar | lo pago) (en efectivo | con tarjeta | en efectivo o con tarjeta)", "[no] sin seguro",
      "[no] [pero] [solo | nada mas | solamente] tengo (seguro de viaje | seguro de viajero)", "[no] (todavia | aun) no tengo seguro [dental | aqui]",
      "[si] (tengo seguro | tengo) [medico | de gastos medicos] pero no (dental | para el dentista)", "[si] pero no (es dental | dental)",
    ] },
    insurance_yes: { patterns: [
      "[si] tengo [un] seguro [dental | de gastos medicos | medico] #h:ins_have", "[si] tengo (una poliza | un seguro) [dental | de gastos medicos]",
      "[si] (estoy asegurado | estoy asegurada) [por (mi trabajo | la empresa)]", "[si] mi (trabajo | empresa) me da seguro [dental]",
      // "No voy a pagar yo, tengo seguro": the insurance pays (one segment, so no self-pay line first)
      "[no] no (voy a pagar | pago | lo pago | lo voy a pagar) yo [porque | ya que] (tengo [un] seguro [dental] | lo paga mi seguro | lo cubre mi seguro)",
      "(lo paga | lo cubre | lo va a pagar | paga) (mi | el) seguro",
    ] },
    insurance_q: { patterns: [
      "(aceptan | reciben | trabajan con | toman) (seguro | seguros | mi seguro | seguro dental | seguros (americanos | extranjeros | internacionales | de estados unidos | de canada))",
      "(puedo | se puede) (usar | pagar con) (mi | un) seguro", "(mi seguro | el seguro) (lo cubre | cubre la consulta | me lo paga)",
    ] },
    cost_q: { patterns: [
      "cuanto (cuesta | cobran | sale | es) [la consulta | la valoracion | la revision | la limpieza | la cita | la primera consulta] #h:q_cost",
      "cuanto me (va a costar | va a salir | van a cobrar | cobran)", "(que | cual es el) precio (tiene | de) (la consulta | la valoracion | la limpieza | la revision)",
      "cuanto (cuesta | sale | cobran por) (una | la) {reason}", "(cual es | cuanto es) el costo [de la consulta | de la valoracion]", "es (caro | cara) [la consulta]",
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
      "(tiene | tienen | hay) (algo | algun espacio | otro horario) (mas tarde | en la tarde | por la tarde | en la noche | despues del trabajo) #h:slot_later",
      "(algo | mejor) (mas tarde | en la tarde | por la tarde | despues del trabajo)", "trabajo hasta {time}",
      "no (tiene | tienen | hay) (nada | algo) (mas tarde | en la tarde | por la tarde | en la noche)",
      "(en la manana | por la manana | en las mananas | por las mananas) (trabajo | no puedo | estoy trabajando)",
      "(a esa hora | en ese horario) (trabajo | estoy trabajando) #h:slot_work", "es (muy | demasiado) temprano [para mi]",
      "(prefiero | me queda mejor | seria mejor) (en la tarde | por la tarde | mas tarde | en la noche)",
      "(salgo del trabajo | salgo de trabajar) a {time}", "despues de {time} [seria mejor | me queda mejor | puedo]",
      "(puedo | podria) (ir | llegar) (mas tarde | en la tarde | despues de {time})",
      "[si] pero (en la tarde | por la tarde | mas tarde)", "prefiero no (en la manana | temprano)",
    ] },
    morning: { patterns: [
      "(tiene | tienen | hay) algo (en la manana | por la manana | temprano)", "(prefiero | mejor) (en la manana | por la manana | temprano)",
      "(en la manana | por la manana | las mananas) (me queda mejor | me quedan mejor | es mejor | seria mejor)", "algo (en la manana | por la manana)",
      "[si] pero (en la manana | por la manana)",
    ] },
    day_req: { patterns: [
      "(puedo | podria) ir {day} [@dpart] [a {time}] [mejor | en vez] #h:slot_day", "(y | que tal | y que tal) {day} [@dpart] [a {time}]",
      "(tiene | tienen | hay) (algo | lugar | espacio | citas) [para] {day} [@dpart]", "no (tiene | tienen | hay) (algo | nada | lugar) [para] {day} [@dpart]", "mejor {day} [@dpart] [a {time}]",
      "{day} [@dpart] (me queda mejor | seria mejor | es mejor | me conviene mas)", "(abren | trabajan | atienden) {day}",
      "{no_day:day} no [mejor | pero] {day} [@dpart] [a {time}]", "no {no_day:day} [sino | mejor | pero] {day} [@dpart] [a {time}]",
      "{no_day:day} no (puedo | me queda | me sirve) [pero] [y | que tal | mejor | puede ser] {day} [@dpart] [a {time}]",
      "(se puede | puede ser) {day} [@dpart] [a {time}]", "[y | que tal | mejor | puede ser] {day} de la (proxima semana | semana que viene) [@dpart] [a {time}]", "(la puedo | puedo | me la puede | la puede | podria) (cambiar | pasar | mover) (para | a | al) {day} [@dpart]",
    ] },
    time_req: { patterns: [
      "(puedo | podria) ir a {time}", "(y | que tal) a {time}", "(tiene | hay) algo a {time}", "a {time} (seria mejor | me queda mejor | es mejor)",
      "(se puede | puede ser) a {time}",
    ] },
    // A bare day or time at the time question: Lorena's offer repeated is a yes; another one is a request.
    pick_ctx: { patterns: ["[para] {day} [@dpart] [a {time}]", "a {time}", "[para] {day} @dpart"] },
    accept: { patterns: [
      "[si] (me queda bien | me sirve | me parece bien | esta perfecto | me viene bien | me conviene | me late) #h:slot_ok",
      "{day} [@dpart] [a {time}] (esta bien | esta perfecto | me queda bien | me sirve | me parece bien | perfecto | me viene bien) #h:slot_perfect",
      "a {time} (esta bien | esta perfecto | me queda bien | me sirve | me parece bien | perfecto)",
      "[si] ahi (estare | voy a estar) [sin falta]", "[si] (apuntemela | agendemela | apartemela | reservemela | apunteme | agendeme)",
      "[si] (me la quedo | la tomo | la acepto)", "[si] (esa | ese) (esta bien | me queda | me sirve)", "[si] (agendela | apuntela | reservela)",
      "trato hecho", "[si] (perfecto | muy bien) ahi nos vemos",
    ] },
    reject: { patterns: [
      "(no me queda | no me sirve | no puedo | no me conviene) [ir] [ese dia | a esa hora | {day} | a {time}] #h:slot_no",
      "(ese dia | a esa hora | ese horario | esa hora | esa fecha | {day} | a {time}) no (puedo | me queda | me sirve | me conviene)",
      "(ese dia | {day}) (trabajo | tengo trabajo | estoy (ocupado | ocupada))",
      "(hay | tiene | tienen) (otro (dia | horario) | otra (opcion | fecha | hora))",
      "[no] (ese dia | esa hora | a esa hora | {day}) no", "no tengo tiempo [ese dia | a esa hora | {day}]",
      "[no] mejor (otro dia | otra hora | otro horario | otra fecha)", "no me (queda | sirve) [bien] {day} [a {time}]",
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
    hear_me: { patterns: ["[ya | ahora] me @hear [ahora | bien | ya] #h:ph_hear", "(bueno | alo) [bueno] (me escucha | me oye | sigue ahi | esta ahi)", "(sigue | esta) ahi", "(asi | ahora) (esta mejor | se oye mejor | me escucha mejor)"] },
    hear_ok: { patterns: [
      "[si] (ya | ahora) (la | lo | le) (escucho | oigo) [bien | mejor] #h:hear_now", "[si] (mucho | ya | ahora) mejor #h:hear_better", "[si] ahora si",
      "[si] ya (se oye | se escucha) [bien | mejor]", "[si] (perfectamente | fuerte y claro)", "[si] (la | lo) escucho (bien | perfectamente)",
    ] },

    // --- questions
    address_q: { patterns: ["cual es (la | su) direccion #h:q_address", "donde (estan | queda el consultorio | esta el consultorio | esta la clinica | queda la clinica | se encuentran | quedan)", "como llego", "(me da | me puede dar) la direccion", "donde (estan | se encuentran) (ubicados | ubicadas)", "(cual es | me da) [la | su] ubicacion"] },
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
    ] },

    // --- general
    more_no: { patterns: [
      "[no] (eso es | es) todo #h:more_all", "[no] nada mas", "[no] (seria | eso seria) todo", "por ahora (es todo | nada mas)", "ya con eso",
      "[no] no necesito nada mas", "[no] (estoy bien | asi estoy bien)", "[no] (eso | es) seria todo", "[muchas | mil] gracias (es | eso es | eso seria | seria) todo",
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
      t("Con gusto. | ¿Cuál | es | el | motivo | de | la | consulta?", "Gladly. | What | is | the | reason | for | the | appointment?", "Of course. What's the reason for the visit?"),
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
    old_welcome: [t("¡Qué | gusto! | {m:Bienvenido|f:Bienvenida} | de nuevo.", "How | nice! | Welcome | again.", "How nice! Welcome back.")],
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
        "Can I have a cell phone number to reach you?", { flags: { 7: "contactarlo / contactarla: lo for a man, la for a woman." } }),
      t("¿Y | un | teléfono, | por favor?", "And | a | phone number, | please?", "And a phone number, please?"),
    ],
    phone_thanks: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thank you.")],
    breaking_up: [
      t("Disculpe, | se está cortando | la | llamada. | ¿Me | lo | repite?", "Excuse me, | is breaking up | the | call. | (To) me | it | you-repeat?",
        "Sorry, the call is breaking up. Could you say that again?"),
      t("Perdón, | se oye | entrecortado. | ¿Me | lo | puede | repetir?", "Sorry, | it sounds | choppy. | (To) me | it | can you | repeat?", "Sorry, the line is breaking up. Could you repeat that?"),
    ],
    speak_up_ok: [
      t("¡Perdón! | ¿Así | me | escucha | mejor?", "Sorry! | Like this | me | do you hear | better?", "Sorry! Can you hear me better now?"),
      t("¿Bueno? | ¿Ahora sí | me | escucha?", "Hello? | Now | me | do you hear?", "Hello? Can you hear me now?",
        { flags: { 0: "Mexican: ¿Bueno? is how Mexicans say hello on the phone and check the line.", 1: "ahora sí: “now (at last)”; sí adds emphasis, not yes." },
          neutral: t("¿Hola? | ¿Ahora sí | me | escucha?", "Hello? | Now | me | do you hear?", "Hello? Can you hear me now?", { flags: { 1: "ahora sí: “now (at last)”; sí adds emphasis, not yes." } }) }),
    ],
    hear_you: [
      t("Sí, | {m:lo|f:la} | escucho | bien.", "Yes, | you | I-hear | well.", "Yes, I can hear you fine.", { flags: { 1: "lo / la: “you” (usted), lo for a man and la for a woman." } }),
      t("Sí, | perfectamente.", "Yes, | perfectly.", "Yes, loud and clear."),
    ],
    hear_great: [t("¡Qué | bueno!", "How | good!", "Great!")],
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
    offer_again: [t("Entonces, | ¿le | aparto | {$slot}?", "So, | (for) you | shall I hold | {$slot}?", "So, shall I put you down for {$slot}?")],
    move_offer: [
      t("A ver... | ¿Qué tal | el | jueves | en la tarde, | a | las | cuatro | y media?", "Let's see... | How about | — | Thursday | in the afternoon, | at | — | four | thirty?",
        "Let's see... How about Thursday afternoon, at four thirty?",
        { flags: { 2: "el before a weekday = on; English needs no word here.", 6: "Spanish uses an article before clock times; English has no separate word." } }),
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
    not_that_time: [t("Mmm, | a | esa | hora | no tengo | nada.", "Hmm, | at | that | time | I don't have | anything.", "Hmm, I don't have anything at that time.")],
    availability: [t("Tengo | {$slot} | o | {$slot2}.", "I have | {$slot} | or | {$slot2}.", "I have {$slot} or {$slot2}.", { say: "Tengo {$slot} o {$slot2}." })],
    booked: [
      t("¡Listo! | Queda | su | cita | {$slot}.", "Done! | Is set | your | appointment | {$slot}.", "All set! Your appointment is {$slot}."),
      t("Perfecto, | le | agendo | la | cita | {$slot}.", "Perfect, | (for) you | I-book | the | appointment | {$slot}.", "Perfect, I'll book you in for {$slot}."),
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
    address: [
      t("Estamos | en | la | calle | Morelos | número | 12, | a | una | cuadra | del | zócalo.", "We are | on | — | street | Morelos | number | 12, | at | one | block | from the | main square.",
        "We're at 12 Morelos Street, a block from the main square.",
        { say: "Estamos en la calle Morelos número doce, a una cuadra del zócalo.", write: "Clínica Dental Coral · calle Morelos 12", spell: "Morelos",
          flags: { 2: "Spanish puts la before calle; English has no word here." } }),
    ],
    parking: [t("Puede | estacionarse | en | la | calle, | enfrente | del | consultorio.", "You can | park | on | the | street, | in front | of the | office.", "You can park on the street, right in front of the office.")],
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
    insurance_info: [
      t("Depende | del | seguro. | Traiga | sus | datos | y | lo | revisamos | aquí.", "It depends | on the | insurance. | Bring | your | details | and | it | we-check | here.",
        "It depends on the insurance. Bring your details and we'll look into it here."),
    ],
    english: [t("Sí, | la | doctora | habla | inglés, | por si | lo | necesita.", "Yes, | the | doctor | speaks | English, | in case | it | you need.", "Yes, the dentist speaks English, in case you need it.")],
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
        "Sure, no problem. Can I have your name and date of birth?"),
    ],
    move_ok_dob: [
      t("Claro, | con gusto. | ¿Me | da | su | fecha | de | nacimiento?", "Sure, | gladly. | (To) me | you-give | your | date | of | birth?", "Sure, no problem. Can I have your date of birth?"),
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
          note: "Spanish letter names: a, be, ce, de, e, efe, ge, hache, i, jota, ka, ele, eme, ene, o, pe, cu, erre, ese, te, u, ve, doble ve, equis, i griega, zeta. Mexicans say “be grande” for B, “ve chica” for V, and “doble ele” for LL." },
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
        { id: "q_park", s: t("¿Dónde | me | puedo | estacionar?", "Where | myself | can I | park?", "Where can I park?", { flags: { 1: "me: estacionarse is said with a reflexive pronoun." } }) },
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
    "en la tarde": { reason: "lexical_expression", split: "en → in + la → the + tarde → afternoon is close but the part of the day is one adverbial: in the afternoon.", minimal: "Three words." },
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
      ask: (c) => c.say("ask_phone"), expects: ["phone_ans", "phone_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your phone number", hint: "phone_no" }] },
    { id: "insurance", when: (c) => booking(c) && !!c.s.newPt && !!c.s.phone, done: (c) => c.s.insurance !== undefined,
      ask: (c) => c.say("ask_insurance"), expects: ["insurance_no", "insurance_yes", "cost_q"],
      suggest: [{ lt: "Say if you have insurance or will pay yourself", hint: "insurance" }],
      yes: (c) => { c.s.insurance = true; c.say("insurance_card"); },
      no: (c) => { c.s.insurance = false; c.say("selfpay", { price: 40000 }); } },
    { id: "hold", when: (c) => readyForSlot(c) && !!c.s.askHold && !c.s.appt && !c.s.canceled, done: (c) => !!c.s.holdDone,
      ask: (c) => { c.say("hold_q"); c.twist("on_hold"); }, expects: ["hold_ok_ctx"],
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
      expects: ["accept", "earlier", "later", "morning", "day_req", "time_req", "reject", "availability_q", "pick_ctx"],
      suggest: [{ lt: "Accept or ask for another time", hint: "slot" }],
      yes: (c) => {
        if (POLITE.test(c.heard.trim()) && !c.s.politeAsked) { c.s.politeAsked = true; offer(c, c.s.offer, true); c.hold(); return; }
        accept(c);
      },
      // "Así está bien" at the time question could mean "that's fine": Lorena asks again rather than move on
      no: (c) => {
        if (/(^|[\s¿¡,])as[ií]([\s,.!?]|$)/i.test(c.heard)) {
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
      const d = slots.day as string | undefined;
      if (d && DAY_OFFER[d] && !c.s.wantDay) c.s.wantDay = DAY_OFFER[d];
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
      // "¿Me puede ayudar?" alone: at the start Lorena asks again how she can help; later she says "Sí, dígame."
      if (c.step !== "help" && c.step !== "help_move") goAhead(c);
    },
    phone_ctx(c, slots) { setPhone(c, slots.digits); },

    insurance_no(c) {
      if (c.step !== "insurance" && c.s.insurance !== undefined) return;
      c.s.insurance = false;
      if (c.step === "insurance" || c.s.newPt) c.say("selfpay", { price: 40000 });
    },
    insurance_yes(c) { if (c.s.insurance === true) return; c.s.insurance = true; c.say("insurance_card"); },
    insurance_q(c) { c.say("insurance_info"); },
    cost_q(c) { c.say("price_info", { price: 40000 }); },

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
      // moving: "early" (tomorrow 9:30) is the appointment being moved, so Lorena keeps her own offer instead
      const early = moving(c) ? (c.s.offer ?? "move") : "early";
      if (WEEKEND.includes(d)) { c.say("closed_weekend"); if (readyForSlot(c)) { offer(c, c.s.offer ?? "morning", !!c.s.offer); c.hold(); } return; }
      if (TODAYISH.includes(d)) { c.say("no_today"); if (readyForSlot(c)) { if (onlyNow(c)) { onlyOne(c); return; } offer(c, early, early === c.s.offer); c.hold(); } return; }
      if (moving(c) && d === EXISTING.d) { if (readyForSlot(c)) { c.say("not_that_time"); offer(c, early, early === c.s.offer); c.hold(); } return; }
      if (weekFull(c) && readyForSlot(c)) {
        if (d === "day_after_tomorrow") { c.s.onlyRejected = false; offer(c, "only", true); c.hold(); return; }
        const nextTue = d === "tuesday" && /proxim|que viene/.test(c.heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (THIS_WEEK.includes(d) && !nextTue) { weekFullAgain(c); return; }
        const k = nextTue ? "next_tue" : part === "am" ? "monday_am" : part === "pm" ? "monday" : c.s.offer === "monday_am" ? "monday_am" : "monday";
        if (c.s.offer === k) { accept(c); return; }
        offer(c, k, (c.s.offered || []).includes(k)); c.hold(); return;
      }
      let key: string | undefined = DAY_OFFER[d];
      if (moving(c) && d === "thursday") key = "move";
      if (!key) return;
      if (key === "only" && !c.s.onlyTwist) {
        // "Pasado mañana" without the twist: that day is full (never tomorrow instead, nor the appointment being moved)
        if (!readyForSlot(c)) return;
        c.say("day_full"); dentist.handlers.reject(c, {}, { intent: "reject", slots: {}, tags: [] }); return;
      }
      if (!readyForSlot(c)) {
        if (fitsPart(key, part)) c.s.wantDay = key; else if (part === "am") c.s.wantMorning = true; else c.s.wantLate = true;
        return;
      }
      if (onlyNow(c) && d !== "next_week" && key !== "only") { onlyOne(c); return; }
      if (onlyNow(c) && d === "next_week") { c.s.onlyRejected = true; }
      // "El martes en la tarde" when Tuesday's opening is in the morning: another opening in that part of the day
      if (!fitsPart(key, part)) {
        c.say("not_that_time");
        const alt = (part === "pm" ? ["wednesday", "monday", "late"] : ["first", "morning", "early"]).filter((k) => !(moving(c) && k === "early"));
        key = alt.find((k) => k !== c.s.offer && OFFERS[k].d !== d) ?? alt[0];
      }
      // "El martes, no el miércoles" and "El martes no, el miércoles" lose their comma: a correction only offers, it never books
      if (c.s.offer === key) { if (slots.no_day) { offer(c, key, true); c.hold(); } else accept(c); return; }
      offer(c, key, (c.s.offered || []).includes(key) && key !== "move"); c.hold();
    },
    time_req(c, slots) {
      if (!readyForSlot(c) || !c.s.offer) return;
      if (booked(c)) return;
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
      const o = OFFERS[c.s.offer];
      const d = slots.day as string | undefined;
      const tm = slots.time as { h: number; m: number; ampm?: string } | undefined;
      const sameDay = (!d || d === o.d) && fitsPart(c.s.offer, partOf(slots, seg));
      const sameTime = !tm || (o.h % 12 === tm.h % 12 && o.m === tm.m && !(tm.ampm === "am" && o.h >= 12) && !(tm.ampm === "pm" && o.h < 12));
      // "No el martes, el miércoles": a turn with "no" in it never books the offer it names
      const neg = /(^|\s)no(\s|$)/.test(c.heard.toLowerCase().replace(/[¿?¡!,.]/g, " "));
      if (sameDay && sameTime && neg) { if (!turn(c).picked) { turn(c).picked = true; offer(c, c.s.offer, true); c.hold(); } return; }
      if (sameDay && sameTime) { accept(c); return; }
      if (tm) { dentist.handlers.time_req(c, slots, seg); return; }
      dentist.handlers.day_req(c, slots, seg);
    },
    accept(c, slots) {
      if (c.step === "hold" && !c.s.holdDone) {
        holdOk(c, true);
        // "El miércoles está bien." while Lorena asks to hold: she offers that day first
        const d = slots.day as string | undefined;
        if (d && DAY_OFFER[d] && !(moving(c) && DAY_OFFER[d] === "early")) c.s.wantDay = DAY_OFFER[d];
        return;
      }
      if (c.s.appt) { if (slots.day || slots.time) booked(c); return; }
      if (!readyForSlot(c) || !c.s.offer) return;
      const tm = slots.time as { h: number; m: number; ampm?: string } | undefined;
      const d0 = slots.day as string | undefined;
      if (tm) {
        // "A las cuatro y media está perfecto": the offered slot with that time, if any
        const hit = (c.s.offered || []).find((k: string) => {
          const o = OFFERS[k];
          return o.h % 12 === tm.h % 12 && o.m === tm.m && (!d0 || o.d === d0);
        });
        if (hit) { if (hit !== c.s.offer) c.s.offer = hit; accept(c); return; }
        if (onlyNow(c)) { onlyOne(c); return; }
        // "El viernes a las once está perfecto": an opening Lorena has but hasn't offered yet
        const has = slotAt(c, tm, d0);
        if (has && d0) { c.s.offer = has; accept(c); return; }
        if (has) { offer(c, has); c.hold(); return; }
        dentist.handlers.time_req(c, slots, { intent: "time_req", slots, tags: [] }); return;
      }
      // "El miércoles está bien" when Lorena offered Thursday: that day, please (never the offered one)
      if (d0 && OFFERS[c.s.offer].d !== d0) { dentist.handlers.day_req(c, slots, { intent: "day_req", slots, tags: [] }); return; }
      accept(c);
    },
    reject(c) {
      if (!readyForSlot(c) || !c.s.offer) return;
      if (booked(c)) return;
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
      c.say("availability", { slot: slotVal(OFFERS[a]), slot2: slotVal(OFFERS[b]) });
      c.hold();
    },
    hours_q(c) { c.say("hours"); },

    hold_ok_ctx(c) { holdOk(c, true); },
    speak_up(c) {
      c.say("speak_up_ok");
      c.expect({
        id: "hear", optional: true, expects: ["hear_ok"], hints: ["hear"],
        suggest: [{ lt: "Say if you can hear her now", hint: "hear" }],
        yes: (cc) => { cc.say("hear_great"); },
        no: (cc) => { cc.say("speak_up_ok"); },
        on: { hear_ok: (cc) => { cc.say("hear_great"); } },
      });
    },
    hear_me(c) { c.say("hear_you"); },
    hear_ok(c) { c.say("hear_great"); },

    address_q(c) { c.say("address"); },
    parking_q(c) { c.say("parking"); },
    duration_q(c) { c.say(c.s.newPt === true && !moving(c) && c.s.reason !== "cleaning" ? "duration" : "duration_short"); },
    bring_q(c) { c.say("bring"); },
    cancel_policy_q(c) { c.say("cancel_policy"); },
    forms_q(c) { c.say("forms"); },
    doctor_q(c) { c.say("doctor"); },
    pain_q(c) { c.say("pain_advice"); },
    pay_q(c) { c.say("pay"); },
    english_q(c) { c.say("english"); },

    move(c, slots) {
      const tgt0 = slots?.target as string | undefined;
      // "¿Puedo cambiar la cita?" right after booking it (or "Sí" to "¿Quiere cambiarla para otro día?"): Lorena
      // frees that time and offers another one (the day asked for, if any)
      if (c.s.booking && !c.s.moving && c.s.appt) {
        const old = c.s.appt as string;
        const asked = tgt0 && DAY_OFFER[tgt0] && DAY_OFFER[tgt0] !== "only" ? DAY_OFFER[tgt0] : undefined;
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
      const tgt = slots?.target as string | undefined;
      if (tgt && DAY_OFFER[tgt] && DAY_OFFER[tgt] !== "early" && DAY_OFFER[tgt] !== "only" && !c.s.offer) c.s.wantDay = tgt === "thursday" ? "move" : DAY_OFFER[tgt];
      if (c.s.moving) return;
      c.s.moving = true;
      c.s.booking = false;
      c.twist("reschedule");
      c.say(words(c.s.name) >= 2 ? "move_ok_dob" : "move_ok");
    },
    cancel(c) {
      c.s.task = c.s.task || "cancel";
      c.say("offer_reschedule");
      c.expect({
        id: "reschedule_q", expects: ["move"], hints: ["g_yesno", "move"],
        suggest: [{ lt: "Say if you'd like to move it", hint: "g_yesno" }, { lt: "Move your appointment", hint: "move" }],
        yes: (cc) => { dentist.handlers.move(cc, {}, { intent: "move", slots: {}, tags: [] }); },
        no: (cc) => { cc.s.canceled = true; cc.s.appt = undefined; cc.say("canceled"); },
        on: { move: (cc, sl, sg) => { dentist.handlers.move(cc, sl, sg); }, cancel: (cc) => { cc.s.canceled = true; cc.s.appt = undefined; cc.say("canceled"); } },
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
    { say: "No tengo número mexicano", intent: "none", step: "phone", not: ["phone_ans", "phone_ctx"] },
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
  if (seg.tags.includes("yy") && n !== undefined && n >= 0 && n <= 99) return { year: n > 30 ? 1900 + n : 2000 + n };
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
