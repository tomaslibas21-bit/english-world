// NEEDS: None. Every merge, entity, value and pending question is local.
// Song 83 "Are You Free on Friday?" → Puerto Colibrí: "¿Estás libre el viernes?"
// A phone call in which the LEARNER invites a friend. The learner has two tickets for a concert on Friday night and
// calls Andrea (a friend: tú both ways). The learner leads: says who is calling, invites her, answers her questions
// (when it starts, where and when to meet, her sister, the ticket money) and closes the call. Andrea follows: she
// never asks for what she already knows, answers side questions, says she's busy on Saturday, and on later visits
// may mishear (bad_line), move the meeting place (meet_change), ask to meet later (time_change, the brief's
// "changing the time") or invite the learner to her Sunday carne asada (bbq: accept or decline politely).
//
// Keeps the English edition's steps, intents and twists. Added: the twist time_change (visits ≥ 1): Andrea gets off
// work at 7:30, so a meeting time before eight gets "¿Y si mejor a las ocho?". Andrea's own suggestion for the
// meeting time is an hour before the concert starts (nine by default: concerts start late in Mexico).
//
// Puerto Colibrí, Mexican style (Nov 2026): the phone is answered "¿Bueno?" (M); friends say "¿Qué onda?" (M),
// "¿Te animas?", "¿Te late?" (M slang), "va / sale" (M: okay), "¿Paso por ti?" (shall I pick you up?), "quedamos de
// vernos en…"; a "boleto" is a ticket (shared with most of Latin America; "entrada" is accepted); people meet at the
// kiosco on the zócalo, at the church, at a taquería for tacos before going out; a Sunday "carne asada" at home is
// the Mexican barbecue. Town facts kept: the kiosco has free live music on Friday evenings (s62, s69), which is why
// it's crowded (meet_change). Andrea's taquería is the town's, "la taquería del mercado", beside the mercado's door on
// avenida del Puerto (the lead, 5 Nov 2026: the dialogue follows the 3D town, docs/es/TOWN.md; s62, s69); its morning
// cochinita (s69) runs out by noon, and in the evening it has tacos for dinner.
// Mexican-only words in Andrea's lines (¿bueno?, ¿qué onda?, qué padre, va, sale) have neutral twins; the neutral text
// also says "entrada" for the ticket (the lead, 5 Nov 2026) and "parrillada" for the carne asada (as p30 and s33), and
// the hints "¡De acuerdo!" for "¡Va!" and "mientras más, mejor" for Mexico's "entre más, mejor".
// Audit (5 Nov 2026): Andrea's summary is two lines, the day and time ({$day} × {$time}: every one voiced) and the
// place ({P.the}), since the voice list never expands a line with a value and an entity.

import type { Ctx, EntityDef, Handler, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const GENRES: EntityDef[] = [
  ent("jazz", "jazz", "jazz", "m", { art: "", forms: ["jaz", "yaz", "yas"] }),
  ent("rock", "rock", "rock", "m", { art: "", forms: ["rock and roll", "roc", "rok"] }),
  ent("salsa", "salsa", "salsa", "f", { art: "" }),
  ent("cumbia", "cumbia", "cumbia", "f", { art: "" }),
  ent("reggae", "reggae", "reggae", "m", { art: "", forms: ["regue", "regae", "reggae"] }),
  ent("trova", "trova", "trova", "f", { art: "", forms: ["trova yucateca", "boleros", "bolero"] }),
  ent("mariachi", "mariachi", "mariachi", "m", { art: "", forms: ["mariachis"] }),
  ent("pop", "pop", "pop", "m", { art: "" }),
  ent("electronica", "electrónica", "electronic music", "f", { art: "", forms: ["electronica", "musica electronica", "electro"] }),
];

const PLACES: EntityDef[] = [
  ent("kiosco", "kiosco", "bandstand", "m", { forms: ["quiosco", "kiosko", "el kiosco", "el quiosco", "kiosco del zocalo", "el zocalo", "zocalo", "la plaza", "plaza"] }),
  ent("malecon", "malecón", "boardwalk", "m", { forms: ["malecon", "el malecon"] }),
  ent("taqueria", "taquería", "taco place", "f", { forms: ["taqueria", "la taqueria", "taqueria del mercado", "la taqueria del mercado", "taqueria junto al mercado",
    "la taqueria junto al mercado", "taqueria de junto al mercado", "los tacos del mercado", "taqueria de la esquina", "la taqueria de la esquina", "los tacos",
    "puesto de tacos", "los tacos de la esquina", "los tacos al pastor"] }),
  ent("mercado", "mercado", "market", "m", { forms: ["mercado", "el mercado", "mercado municipal", "el mercado municipal"] }),
  ent("cafe", "café", "café", "m", { forms: ["cafe", "el cafe", "cafe la ceiba", "la ceiba", "cafeteria", "la cafeteria"] }),
  ent("entrada", "entrada", "entrance", "f", { forms: ["la entrada", "puerta", "la puerta", "taquilla", "la taquilla", "la entrada del concierto"] }),
  ent("iglesia", "iglesia", "church", "f", { forms: ["la iglesia", "parroquia", "la parroquia"] }),
];

// Days, for Andrea's summary ("Bueno, entonces el viernes, a las 7:30, en el kiosco"): values with the Spanish, the
// gloss and the spoken form. The built-in {day} slot reads the learner's words.
const DAY_ES: Record<string, [string, string]> = {
  monday: ["el lunes", "Monday"], tuesday: ["el martes", "Tuesday"], wednesday: ["el miércoles", "Wednesday"],
  thursday: ["el jueves", "Thursday"], friday: ["el viernes", "Friday"], sunday: ["el domingo", "Sunday"],
  tonight: ["hoy en la noche", "tonight"], tomorrow: ["mañana", "tomorrow"],
};
const dayVal = (d: string) => ({ en: DAY_ES[d][0], lt: DAY_ES[d][1], say: DAY_ES[d][0] });
const DAY_IDS = new Set(Object.keys(DAY_ES));

// ---------------------------------------------------------------------------
// Helpers

type Time = { h: number; m: number };
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const plain = (s?: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (t: any): Time | null => {
  if (!t || typeof t.h !== "number") return null;
  let h = t.h % 12; if (h === 0) h = 12;
  return { h, m: t.m ?? 0 };
};
const mins = (t: Time) => t.h * 60 + t.m;
const fromMins = (n: number): Time => ({ h: Math.floor(n / 60), m: n % 60 });
const inDomain = (t: Time | null) => !!t && t.h >= 5 && t.h <= 11 && t.m % 15 === 0;
/** The concert's start (nine at night when the learner hasn't said). */
const startOf = (c: Ctx): Time => (c.s.startTime as Time | undefined) ?? { h: 9, m: 0 };
/** Andrea's own suggestion: an hour before the concert (eight by default), half an hour before the doors open. */
function suggestedMeet(c: Ctx): Time {
  const t = fromMins(mins(startOf(c)) - (c.s.doors ? 30 : 60));
  return inDomain(t) ? t : { h: 8, m: 0 };
}
/** One learner turn can split into several segments of the same kind ("No te preocupes, yo invito"): react once. */
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 20) seen.shift();
  return true;
}

/** A question asked before gets a short reminder the next time ("¿Y mi hermana? ¿Puede venir?"). */
function again(c: Ctx, key: string): boolean {
  const asked: string[] = (c.s.askedQs ||= []);
  if (asked.includes(key)) return true;
  asked.push(key);
  return false;
}

/** The goal is reached. Optional checklist items still open leave the list (their `when` checks goalMet). */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }

/** Read what the learner said about the event: genre, favorite band, day, time. */
function readEvent(c: Ctx, slots: any, seg: Segment) {
  if (slots.genre) c.s.genre = toArr(slots.genre)[0];
  if (seg.tags.includes("fav")) c.s.fav = true;
  const day = toArr(slots.day)[0] as string | undefined;
  if (day) setDay(c, day);
  if (seg.tags.includes("weekend")) c.s.weekend = true;
  const tm = norm(toArr(slots.time)[0]);
  if (tm) c.s.startTime = tm;
  // "Me regalaron dos boletos", "Tengo dos boletos gratis": Andrea never asks what she owes
  if (/\b(gratis|regalaron|regalo|me dieron|me gane|cortesia)\b/.test(plain(c.heard)) && !c.s.payDone) c.s.askPay = false;
}
function setDay(c: Ctx, day: string) {
  if (day === "saturday") { c.s.sat = true; return; }
  if (day === "today") day = "tonight";
  if (DAY_IDS.has(day)) { c.s.day = day; c.s.sat = false; }
  else c.s.weekend = true; // this weekend, next week …
}

/** "¡Ay, sí! ¡Me encantaría!" */
function accept(c: Ctx) {
  c.s.invited = true; c.s.accepted = true; c.s.identified = true;
  c.say("accept");
  if (c.s.genre) c.say("love_genre", { G: c.s.genre });
  else if (c.s.fav) c.say("fav_band");
}

/** Andrea's own "¿Cómo estás?" with the answer and "¿Y tú?", plus anything else the learner starts with. */
function howAreYou(c: Ctx) {
  const reply = (cc: Ctx, bad = false) => {
    if (bad) cc.say("g_sorry_to_hear");
    else if (/\b(tu|ti|usted)\b/.test(plain(cc.heard))) cc.say("g_asked_back");
    else cc.say("g_glad");
  };
  c.expect({
    id: "howareyou",
    expects: ["g_howareyou_answer", "g_howareyou_bad", "its_me_ctx"],
    hints: ["g_howareyou", "opening"],
    suggest: [{ lt: "Say how you are (and ask back)", hint: "g_howareyou" }, { lt: "Invite her to the concert right away", hint: "invite", options: "genre" }],
    on: {
      g_howareyou_answer: (cc) => { reply(cc); },
      g_howareyou_bad: (cc) => { reply(cc, true); },
      g_ok: (cc) => { reply(cc); },
      invite: (cc, sl, sg) => { H.invite(cc, sl, sg); },
      tickets: (cc, sl, sg) => { H.tickets(cc, sl, sg); },
      ask_free: (cc, sl, sg) => { H.ask_free(cc, sl, sg); },
      good_time: (cc, sl, sg) => { H.good_time(cc, sl, sg); },
    },
    yes: (cc) => reply(cc),
    ask: (cc) => cc.say("how_are_you_again"),
  });
}

/** Pending questions: "¡Sí, claro!" / "¡Perfecto!" count as yes, "No, perdón" as no. */
function yn(p: Pending): Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}

/** Where and when: Andrea suggests, the learner agrees (or not). */
function suggestPlace(c: Ctx) {
  c.say("suggest_place");
  c.expect(yn({
    id: "suggest_place", expects: ["meet", "meet_not", "place_no_ctx", "where_is_ctx"], hints: ["agree", "place"],
    suggest: [{ lt: "Agree", hint: "agree" }, { lt: "Suggest another place", hint: "place", options: ["kiosco", "taqueria", "malecon", "cafe", "entrada", "iglesia"] }],
    yes: (cc) => { cc.s.place = "kiosco"; cc.say("ack_place"); },
    no: (cc) => { cc.say("where_then"); cc.hold(); },
    ask: (cc) => cc.say("suggest_place"),
    on: {
      meet: (cc, sl, sg) => { H.meet(cc, sl, sg); },
      meet_not: (cc, sl, sg) => { H.meet_not(cc, sl, { ...sg, tags: [...sg.tags, "@suggest_place"] }); },
      place_no_ctx: (cc, _sl, sg) => { H.meet_not(cc, {}, { ...sg, tags: [...sg.tags, "@suggest_place"] }); },
    },
  }));
}
function suggestTime(c: Ctx) {
  const tm = suggestedMeet(c);
  c.s.suggested = tm;
  c.say("suggest_time", { time: tm });
  suggestTimeExpect(c);
}
function suggestTimeExpect(c: Ctx) {
  const take = (cc: Ctx) => { meetAt(cc, cc.s.suggested as Time, false); if (!cc.s.timeAsked) cc.say("ack"); };
  c.expect(yn({
    id: "suggest_time", expects: ["time_ans", "meet", "time_shift_ctx"], hints: ["agree", "meettime"],
    suggest: [{ lt: "Agree", hint: "agree" }, { lt: "Suggest another time", hint: "meettime" }],
    yes: take,
    no: (cc) => { cc.say("when_then"); cc.hold(); },
    ask: (cc) => cc.say("suggest_time", { time: cc.s.suggested }),
    on: {
      time_ans: (cc, sl, sg) => { H.time_ans(cc, sl, sg); }, meet: (cc, sl, sg) => { H.meet(cc, sl, sg); },
      time_shift_ctx: (cc, sl, sg) => { H.time_shift_ctx(cc, sl, sg); },
    },
  }));
}

/** "No en el café" / "No, en el café" with no place suggested: the comma is lost, so Andrea asks which it is. */
function confirmPlace(c: Ctx, p: string) {
  const take = (cc: Ctx) => { H.meet(cc, { place: p }, { intent: "meet", slots: { place: p }, tags: [] }); };
  c.say("confirm_place", { P: p });
  c.expect(yn({
    id: "confirm_place", expects: ["meet", "meet_not", "place_no_ctx"], hints: ["agree", "place"],
    suggest: [{ lt: "Say yes", hint: "agree" }, { lt: "Suggest another place", hint: "place", options: ["kiosco", "taqueria", "malecon", "cafe", "entrada", "iglesia"] }],
    yes: take,
    no: (cc) => { cc.say("where_then"); cc.hold(); },
    ask: (cc) => cc.say("confirm_place", { P: p }),
    on: {
      meet: (cc, sl, sg) => { H.meet(cc, sl, sg); },
      // "No, en el malecón": the other place is the answer (rule 10: in "No X, Y" the second is it); "No en el café",
      // "Mejor en otro lugar": where, then?
      meet_not: (cc, sl, sg) => {
        const ps = toArr(sl.place); const q = ps[ps.length - 1] as string | undefined;
        if (q && q !== p && !sg.tags.includes("elsewhere") && !sg.tags.includes("dislike")) H.meet(cc, { place: q }, { intent: "meet", slots: { place: q }, tags: [] });
        else { cc.say("where_then"); cc.hold(); }
      },
      place_no_ctx: (cc) => { cc.say("where_then"); cc.hold(); },
    },
  }));
}

/** The meeting time is set. Twist time_change: Andrea gets off work at 7:30, so a time before eight gets a request
 *  to meet at eight (only when the concert starts at nine or later). `ack` = say "Perfecto." when nothing else. */
function meetAt(c: Ctx, tm: Time, ack = true) {
  c.s.meetTime = tm;
  c.s.timeAsked = false;
  if (c.s.accepted && c.s.timeChange && !c.s.timeChangeDone && mins(tm) < 8 * 60 && mins(startOf(c)) >= 9 * 60) {
    c.s.timeChangeDone = true; c.s.timeAsked = true; c.twist("time_change");
    c.say("time_change");
    timeChangeExpect(c);
    return;
  }
  if (ack && c.s.accepted && once(c, "ack")) c.say("ack");
}

/** The learner keeps a time before eight: from 7:30 she rushes out of work; before it, she asks to leave early. */
const keepTime = (c: Ctx) => c.say(mins(c.s.meetTime as Time) >= 7 * 60 + 30 ? "keep_time" : "keep_time_early");
/** Another time in the same turn ("A las ocho no puedo, mejor a las siete", "…, más tarde") answers by itself. */
const otherTime = (c: Ctx) => {
  const h = plain(c.heard);
  return /\b(mejor|prefiero|que tal) a las?\b/.test(h) || (h.match(/\ba las? \w+/g) || []).length > 1 || /\bmas (tarde|temprano)\b/.test(h);
};
function timeChangeExpect(c: Ctx) {
  const takeTime = (cc: Ctx, sl: any, sg: Segment) => {
    const t2 = pickTime(sl, sg);
    if (!t2) return;
    cc.s.meetTime = t2;
    if (mins(t2) < 8 * 60) keepTime(cc); else cc.say("ack_eight_time");
  };
  c.expect(yn({
    id: "time_change", expects: ["time_ans", "time_shift_ctx", "reassure"], hints: ["agree", "meettime"],
    suggest: [{ lt: "Agree to meet at eight", hint: "agree" }, { lt: "Keep your time or suggest another", hint: "meettime" }],
    yes: (cc) => { cc.s.meetTime = { h: 8, m: 0 }; cc.say("ack_eight"); },
    no: (cc) => keepTime(cc),
    ask: (cc) => cc.say("time_change_q"),
    on: {
      time_ans: (cc, sl, sg) => { takeTime(cc, sl, sg); },
      // "No puedo a las ocho", "Es muy tarde": the learner keeps the earlier time; "Más tarde": half past eight?
      time_shift_ctx: (cc, _sl, sg) => {
        if (sg.tags.includes("refuse")) { if (!otherTime(cc)) keepTime(cc); return; }
        if (sg.tags.includes("earlier")) { keepTime(cc); return; }
        const t2 = fromMins(8 * 60 + 30);
        if (mins(t2) < mins(startOf(cc))) { cc.s.suggested = t2; cc.say("suggest_time_again", { time: t2 }); suggestTimeExpect(cc); return; }
        cc.say("time_change_q"); timeChangeExpect(cc);
      },
      // "No hay problema", "No te preocupes": eight is fine; "No te preocupes, a las ocho": the time answers
      reassure: (cc, sl, sg) => {
        if (toArr(sl.time).length) { takeTime(cc, sl, sg); return; }
        const h = plain(cc.heard);
        if (/\ba las?\b/.test(h)) return; // the time is its own piece
        if (/\bno (pasa nada|hay problema|te preocupes|importa)\b/.test(h)) { cc.s.meetTime = { h: 8, m: 0 }; cc.say("ack_eight"); }
        else { cc.say("time_change_q"); timeChangeExpect(cc); }
      },
    },
  }));
}

/** The time a turn names; in a correction ("No a las ocho, a las siete y media") the last one. */
function pickTime(slots: any, seg: Segment): Time | null {
  const all = toArr(slots.time);
  return norm(seg.tags.includes("fix") ? all[all.length - 1] : all[0]);
}

/** Andrea's optional questions this visit (band, sister, ticket money, the carne asada). */
const bandAsked = (c: Ctx) => !!c.s.askBand && !c.s.genre && !c.s.fav;
const hasExtraQs = (c: Ctx) => bandAsked(c) || !!c.s.askSister || !!c.s.askPay || !!c.s.bbq;
const extraQsDone = (c: Ctx) => (!bandAsked(c) || !!c.s.bandDone) && (!c.s.askSister || c.s.sister !== undefined)
  && (!c.s.askPay || !!c.s.payDone) && (!c.s.bbq || !!c.s.bbqDone || c.s.day === "sunday");

/** The concert is already on the table, or mentioned in the same breath ("¿Estás libre el viernes? Tengo dos
 *  boletos…"): Andrea doesn't ask "¿Por qué?". */
const eventKnown = (c: Ctx) => !!c.s.eventSaid || /\b(boletos?|boletas?|entradas?|tickets?|concierto|tocada|toquin|festival|grupo|banda|show)\b/.test(plain(c.heard));

/** "¿Estás libre el sábado?": she's busy. With the concert already mentioned she asks for another day. Saturday
 *  again ("Es el sábado") gets a shorter answer, never the same line twice. */
function satBusy(c: Ctx) {
  c.s.satN = ((c.s.satN as number | undefined) ?? 0) + 1;
  const again = c.s.satN % 2 === 0;
  c.s.satAsked = true;
  if (!eventKnown(c)) { c.say(again ? "sat_busy_after" : "sat_busy"); c.s.skipAsk = true; return; }
  c.s.eventSaid = true; setDay(c, "saturday");
  if (again) { c.say("sat_busy_after"); c.say("another_time"); } else c.say("sat_busy_invite");
  otherDay(c);
}

/** "Me encantaría, pero no puedo": a positive opener followed by a refusal is a refusal. */
const butNo = (c: Ctx) => /\bpero\b/.test(plain(c.heard)) && !/\bpero (claro|si|por supuesto|con gusto)\b/.test(plain(c.heard));

// Automatic answers the simulation uses when Andrea asks one of her optional (random) questions.
const AUTO: Record<string, string> = {
  day: "El viernes.", band: "Es un grupo de jazz.", sister: "¡Claro, no hay problema!", pay: "No te preocupes, yo invito.",
  bbq: "Perdón, el domingo no puedo.", bad_line: "Sí, el viernes.", meet_change: "Sí, claro.", time_change: "Sí, a las ocho está bien.",
  closing: "¡Bye!",
};
const AUTO_HELLO: Record<string, string> = { ...AUTO, hello: "¡Hola, Andrea! Soy Ryan." };
const AUTO_NOPAY: Record<string, string> = Object.fromEntries(Object.entries(AUTO).filter(([k]) => k !== "pay"));

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) {
    // "¿Andrea?" on its own: at "¿Bueno?" she recognizes the voice.
    if (c.step === "hello" && !c.s.identified) { H.its_me_ctx(c, {}, { intent: "its_me_ctx", slots: {}, tags: [] }); }
  },
  its_me_ctx(c) {
    if (!c.s.identified && c.step === "hello") {
      c.s.identified = true; c.s.greeted = true;
      c.say("oh_hey");
      howAreYou(c);
      return;
    }
    c.s.identified = true;
    // "¡Ja, ya sé!" only when the learner just introduced themselves.
    const bare = /^\W*((hola|oye|bueno)\W+)?(andrea\W+)?(soy|habla|es|aqui)\s+\w+(\s+\w+)?\W*$/.test(plain(c.heard));
    if (c.s.greeted && !c.s.knowSaid && bare) { c.s.knowSaid = true; c.say("i_know"); }
  },
  g_howareyou(c, slots) {
    c.s.identified = true;
    GLOBAL_HANDLERS.g_howareyou(c as any, slots);
  },
  hear_me(c) { c.s.identified = true; c.say("hear_you"); },
  ask_like(c, slots) {
    c.s.identified = true;
    const g = toArr(slots.genre)[0];
    if (g) { c.s.likedGenre = g; c.say("love_genre", { G: g }); } else c.say("love_live");
    if (!c.s.invited && !eventKnown(c)) { c.say("why_q"); c.s.skipAsk = true; }
  },
  good_time(c) {
    c.s.identified = true;
    c.say("good_time");
    if (!c.s.invited) c.s.skipAsk = true;
  },
  ask_free(c, slots, seg) {
    c.s.identified = true;
    const day = toArr(slots.day)[0] as string | undefined;
    const busyQ = seg.tags.includes("busyq");
    if (c.s.invited) {
      // A second plan after the concert ("¿Y el sábado también estás libre?")
      if (day === "saturday" || !day) { c.say("sat_busy_after"); c.say("another_time"); c.s.satAsked = true; }
      else if (day === c.s.day) c.say("free_yep");
      else c.say("maybe_free");
      return;
    }
    if (day === "saturday") { satBusy(c); return; }
    if (day && day !== "this_weekend" && day !== "next_weekend") setDay(c, day);
    if (!once(c, "free")) { c.s.skipAsk = true; return; }
    if (eventKnown(c)) c.say(busyQ ? "not_busy_known" : seg.tags.includes("plansq") ? "not_much_known" : "free_yep");
    else if (busyQ) c.say("not_busy");
    else if (seg.tags.includes("plansq")) c.say(c.visits >= 1 && !day && c.chance(0.5) ? "sat_busy_fri_free" : "not_much");
    else c.say("free_yes");
    c.s.freeAsked = true;
    c.s.skipAsk = true;
  },
  tickets(c, slots, seg) {
    c.s.identified = true;
    readEvent(c, slots, seg);
    c.s.eventSaid = true;
    // If the invitation follows in the same breath, the invite handler answers.
  },
  invite(c, slots, seg) {
    c.s.identified = true;
    readEvent(c, slots, seg);
    c.s.eventSaid = true;
    if (c.s.accepted) { if (once(c, "already")) c.say("already_yes"); return; }
    if (c.s.sat) { satBusy(c); return; }
    if (c.s.badLine && !c.s.badLineDone && c.s.day === "friday") {
      c.s.badLineDone = true; c.twist("bad_line");
      c.say("bad_line");
      c.expect(yn({
        id: "bad_line", expects: ["day_ans"], hints: ["confirm"],
        suggest: [{ lt: "Confirm: yes, Friday", hint: "confirm" }],
        yes: (cc) => accept(cc),
        no: (cc) => { cc.s.day = undefined; cc.say("which_day"); otherDay(cc); },
        on: { day_ans: (cc, sl, sg) => { H.day_ans(cc, sl, sg); }, invite: (cc) => accept(cc) },
        ask: (cc) => cc.say("bad_line_q"),
      }));
      return;
    }
    accept(c);
  },
  day_ans(c, slots) {
    // "El domingo estoy ocupado" may split off "el domingo": a refusal never sets the day.
    if (/\b(ocupad[oa]|no puedo|planes|trabajo|no voy a poder)\b/.test(plain(c.heard))) return;
    const all = toArr(slots.day) as string[];
    const day = all[all.length - 1];
    const tm = norm(toArr(slots.time)[0]);
    if (tm) c.s.startTime = tm;
    if (!day) return;
    if (!c.s.invited) {
      if (day === "saturday") { satBusy(c); return; }
      setDay(c, day);
      if (c.s.eventSaid) { accept(c); return; }
      if (c.s.day && once(c, "free")) { c.say(eventKnown(c) ? "free_yep" : "free_yes"); c.s.skipAsk = true; }
      return;
    }
    if (day === "saturday") { c.say("sat_busy_after"); return; }
    setDay(c, day);
    if (c.s.weekend && !c.s.day) { c.say("which_day"); c.hold(); return; }
    if (c.step === "day") c.say("ack");
  },
  band_ans(c, slots, seg) {
    const gs = toArr(slots.genre);
    if (gs.length) { c.s.genre = gs[gs.length - 1]; c.say("love_genre", { G: c.s.genre }); }
    else if (seg.tags.includes("fav")) { c.s.fav = true; c.say("fav_band"); }
    else c.say("fun");
    c.s.bandDone = true;
  },
  band_ctx(c) { c.s.bandDone = true; c.s.bandNamed = true; c.say("never_heard"); },
  // "No me acuerdo" is about the band only when Andrea asked who's playing
  band_forgot(c) {
    if (c.step === "pay" && !c.s.payDone) { c.s.payDone = true; c.say("pay_later"); return; }
    if (c.step === "start") { H.start_unknown_ctx(c, {}, { intent: "start_unknown_ctx", slots: {}, tags: [] }); return; }
    if (c.step !== "band" || c.s.bandDone) return;
    c.s.bandDone = true; c.say("mystery");
  },
  start_unknown_ctx(c) { if (c.s.startTime || c.s.startDone) return; c.s.startDone = true; c.say("start_help"); },
  starts_at(c, slots, seg) {
    const tm = norm(toArr(slots.time)[0]);
    if (tm) { c.s.startTime = tm; c.s.doors = seg.tags.includes("doors"); if (c.step === "start" && once(c, "ack")) c.say("ack_time"); }
  },
  time_ans(c, slots, seg) {
    let tm = pickTime(slots, seg);
    // "Media hora antes (del concierto)": counted back from the start (nine by default)
    const before = seg.tags.includes("b60") ? 60 : seg.tags.includes("b30") ? 30 : seg.tags.includes("b15") ? 15 : 0;
    if (!tm && before && c.step !== "start") tm = norm(fromMins(mins(startOf(c)) - before));
    if (!tm) return;
    const forStart = c.step === "start" || (!c.s.startTime && c.step !== "meet_time" && c.step !== "place" && !c.s.place);
    if (forStart) { c.s.startTime = tm; if (c.s.accepted && once(c, "ack")) c.say("ack_time"); return; }
    meetAt(c, tm);
  },
  meet(c, slots) {
    const place = toArr(slots.place)[toArr(slots.place).length - 1] as string | undefined;
    const tm = norm(toArr(slots.time)[0]);
    if (place && !c.s.accepted) { c.s.place = place; if (tm) c.s.meetTime = tm; return; } // remembered; she accepts first
    if (place) {
      if (place === "kiosco" && c.s.meetChange && !c.s.meetChangeDone) {
        if (tm) c.s.meetTime = tm;
        c.s.meetChangeDone = true; c.twist("meet_change");
        c.say("meet_change");
        c.expect(yn({
          id: "meet_change", expects: ["meet", "meet_not", "place_no_ctx", "where_is_ctx"], hints: ["agree", "place"],
          suggest: [{ lt: "Agree to meet at the taco place", hint: "agree" }, { lt: "Keep the bandstand", hint: "place", options: ["kiosco"] }],
          yes: (cc) => { cc.s.place = "taqueria"; cc.say("ack_taqueria"); },
          no: (cc) => { cc.s.place = "kiosco"; cc.say("keep_kiosco"); },
          on: {
            meet: (cc, sl) => {
              const ps = toArr(sl.place); const p = ps[ps.length - 1] as string | undefined;
              cc.s.place = p || "taqueria";
              const tt = norm(toArr(sl.time)[0]); if (tt) cc.s.meetTime = tt;
              cc.say(cc.s.place === "kiosco" ? "keep_kiosco" : cc.s.place === "taqueria" ? "ack_taqueria" : "ack_place");
            },
            meet_not: (cc, sl, sg) => { H.meet_not(cc, sl, { ...sg, tags: [...sg.tags, "@meet_change"] }); },
            place_no_ctx: (cc, _sl, sg) => { H.meet_not(cc, {}, { ...sg, tags: [...sg.tags, "@meet_change"] }); },
          },
          ask: (cc) => cc.say("meet_change_q"),
        }));
        return;
      }
      c.s.place = place;
      if (tm) { meetAt(c, tm, false); if (c.s.timeAsked) return; }
      if (once(c, "ack")) c.say("ack_place");
      return;
    }
    if (tm && c.s.accepted) meetAt(c, tm);
  },
  // "No en el kiosco" / "No, en el café" (the comma is lost): a place other than the one Andrea just suggested is the
  // learner's correction; the one she suggested is refused; with nothing suggested she asks where, then.
  // `pend`: the pending question it answers (passed by that question's `on`).
  meet_not(c, slots, seg) {
    const ps = toArr(slots.place); const p = ps[ps.length - 1] as string | undefined;
    const pend = seg.tags.includes("@suggest_place") ? "suggest_place" : seg.tags.includes("@meet_change") ? "meet_change" : undefined;
    const proposed = pend === "suggest_place" ? "kiosco" : pend === "meet_change" ? "taqueria" : undefined;
    // "¿Y en otro lado?", "Mejor en otro lugar": she asks where, then (never "the kiosco", never "where's that?")
    if (seg.tags.includes("elsewhere")) { c.say("where_then"); c.hold(); return; }
    // "No me gusta el malecón": not there, wherever it is
    if (seg.tags.includes("dislike") && p && p !== proposed && pend !== "meet_change") { c.say("where_then"); c.hold(); return; }
    if (pend === "meet_change") {
      // "No, (mejor) en el kiosco" keeps it; "No en la taquería" refuses the change: the kiosco either way
      c.s.place = p && p !== "taqueria" ? p : "kiosco";
      c.say(c.s.place === "kiosco" ? "keep_kiosco" : "ack_place");
      return;
    }
    if (p && (/\b(mejor|sino|prefiero)\b/.test(plain(c.heard)) || (proposed && p !== proposed))) { H.meet(c, slots, seg); return; }
    if (p && !proposed && !/\bme (gusta|late|convence)\b/.test(plain(c.heard))) { confirmPlace(c, p); return; }
    c.say("where_then");
    c.hold();
  },
  // "Más temprano" / "Un poco más tarde" at her suggestion: half an hour earlier or later, asked again.
  time_shift_ctx(c, _slots, seg) {
    if (seg.tags.includes("refuse")) {
      // "A las ocho no puedo", "A esa hora no puedo" (", mejor a las siete" is answered by its time)
      if (otherTime(c)) return;
      c.say("when_then"); c.hold(); return;
    }
    const base = (c.s.suggested as Time | undefined) ?? (c.s.meetTime as Time | undefined) ?? suggestedMeet(c);
    const t2 = fromMins(mins(base) + (seg.tags.includes("later") ? 30 : -30));
    if (!inDomain(t2) || mins(t2) >= mins(startOf(c))) { c.say("when_then"); c.hold(); return; }
    c.s.suggested = t2;
    c.say("suggest_time_again", { time: t2 });
    suggestTimeExpect(c);
  },
  // "Mejor en otro lugar", "No me gusta", "Ahí no" (no place named): as "No en el kiosco" for the place she suggested
  place_no_ctx(c, _slots, seg) { H.meet_not(c, {}, seg); },
  meet_unknown(c) { c.say("where_is_that"); suggestPlace(c); },
  // "¿Dónde queda la taquería?" at her suggestion: where it is, and the suggestion stays open
  where_is_ctx(c, slots) {
    const ps = toArr(slots.place);
    const pend = (c as any).conv?.pending?.id;
    const p = (ps[ps.length - 1] as string | undefined) ?? (pend === "meet_change" ? "taqueria" : "kiosco");
    c.say(p === "kiosco" ? "where_kiosco" : p === "taqueria" ? "where_taqueria" : "where_send");
  },
  ask_where(c) { if (!c.s.invited) { c.say("for_what"); c.s.skipAsk = true; return; } suggestPlace(c); },
  ask_when(c) { if (!c.s.invited) { c.say("for_what"); c.s.skipAsk = true; return; } suggestTime(c); },
  pickup(c) {
    c.say("pickup");
    if (!c.s.place && c.s.accepted) suggestPlace(c);
  },
  sister_yes_ctx(c) { c.s.sister = true; if (once(c, "sister")) c.say("sister_yes"); },
  sister_no_ctx(c) { c.s.sister = false; if (once(c, "sister")) c.say("sister_no"); },
  on_me(c) {
    if (c.step !== "pay" && c.s.payDone) return;
    c.s.payDone = true;
    if (once(c, "on_me")) c.say("on_me");
  },
  price_ctx(c) { c.s.payDone = true; if (once(c, "price")) c.say("pay_back"); },
  pay_later_ctx(c) { if (c.s.payDone) return; c.s.payDone = true; c.say("pay_later"); },
  pay_free_ctx(c, slots, seg) { H.on_me(c, slots, seg); },
  will_text(c) {
    // "Te aviso" at her carne asada: a maybe
    if (c.step === "bbq" && !c.s.bbqDone) { c.s.bbqDone = "maybe"; c.say("bbq_maybe"); return; }
    c.s.willText = true; if (once(c, "text")) c.say("will_text_ok");
  },
  cant_wait(c) {
    if (c.step === "bbq" && !c.s.bbqDone) { c.s.bbqDone = "yes"; c.say("bbq_yes"); return; }
    if (once(c, "me_too")) c.say("me_too");
  },
  // "¡No pasa nada!" after Andrea says she can't: nothing to add; with a time in it, the time is the answer
  reassure(c, slots, seg) { if (toArr(slots.time).length && c.s.accepted) H.time_ans(c, slots, seg); },
  // "¡Perfecto!", "¡Sí, claro!" answer the open yes/no question.
  g_ok(c) { stepYes(c); },
  no_sorry(c) { const st = inviteCall.steps.find((x) => x.id === c.step); if (st?.no && !st.done(c)) st.no(c); },
  agree(c) { stepYes(c); },
  accept_inv(c, _slots, seg) {
    if (butNo(c)) { H.decline_ctx(c, {}, { intent: "decline_ctx", slots: {}, tags: [] }); return; }
    const bring = seg.tags.includes("bring"), when = seg.tags.includes("bbqtime");
    // "¿A qué hora es?" asks; "¿A qué hora llego?" / "Sí, ¿a qué hora?" accept
    if (c.step === "bbq" && c.s.bbqDone === undefined && when && !bring && !/\b(si|claro|llego|voy)\b/.test(plain(c.heard))) {
      if (once(c, "bbqtime")) c.say("bbq_time");
      return; // the step asks again: "Entonces, ¿vienes?"
    }
    if (c.step === "bbq" && c.s.bbqDone === undefined) { c.s.bbqDone = "yes"; c.say("bbq_yes"); }
    else if (!bring && !when && once(c, "yay")) c.say("yay");
    // "¿Llevo algo?" / "¿A qué hora llego?" about her carne asada get an answer
    if (c.s.bbqDone === "yes" && bring && once(c, "bring")) c.say("bring_nothing");
    if (c.s.bbqDone === "yes" && when && once(c, "bbqtime")) c.say("bbq_time");
  },
  decline_ctx(c, _slots, seg) {
    // "No puedo esperar" is excitement, never a refusal.
    if (/no puedo esperar/.test(plain(c.heard))) { H.cant_wait(c, {}, { intent: "cant_wait", slots: {}, tags: [] }); return; }
    if (!once(c, "decline")) return;
    if (c.step === "bbq" && !c.s.bbqDone) {
      if (seg.tags.includes("maybe")) { c.s.bbqDone = "maybe"; c.say("bbq_maybe"); return; }
      c.s.bbqDone = "no"; c.say("bbq_no"); return;
    }
    c.say("oh_okay");
  },
  bye_ext(c) { H.g_bye(c, {}, { intent: "g_bye", slots: {}, tags: [] }); },
  g_bye(c) {
    // "¡Va, nos vemos!" while Andrea still waits for another day: she asks once before saying goodbye
    if (!c.s.accepted && (c as any).conv?.pending?.id === "other_day" && !c.s.byeDayAsked) {
      c.s.byeDayAsked = true; c.say(c.s.sat ? "another_time" : "which_day"); c.hold();
      return;
    }
    if (c.s.accepted && !detailsDone(c) && !c.s.waitSaid) {
      c.s.waitSaid = true; c.say("wait_details");
      return; // advance re-asks the open question
    }
    if (detailsDone(c)) win(c);
    sayBye(c);
  },
};

// ---------------------------------------------------------------------------

const detailsDone = (c: Ctx) => !!(c.s.accepted && c.s.day && c.s.place && c.s.meetTime && (c.s.startTime || c.s.startDone));

function sayBye(c: Ctx) {
  if (c.s.byeSaid) return;
  c.s.byeSaid = true;
  c.say("bye");
  c.end();
  c.hold(); // no open question is asked again after "¡Bye!"
}

function stepYes(c: Ctx) {
  const st = inviteCall.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

/** "¿Y otro día?" (after Saturday) or "¿Qué día es?" (after a misheard day): the day she waits for. A bare yes asks
 *  which day, never accepts an invitation without one; a no is taken as it is ("¡Ah! Bueno, no pasa nada."). */
function otherDay(c: Ctx) {
  const ask = (cc: Ctx) => cc.say(cc.s.sat ? "another_time" : "which_day");
  c.expect({
    id: "other_day", expects: ["day_ans", "invite"], hints: ["other_day", "invite"],
    suggest: [{ lt: "Suggest another day (the concert is on Friday)", hint: "other_day" }],
    on: {
      day_ans: (cc, sl, sg) => { H.day_ans(cc, sl, sg); },
      invite: (cc, sl, sg) => { H.invite(cc, sl, sg); },
    },
    yes: (cc) => { cc.say("which_day"); otherDay(cc); },
    no: (cc) => { cc.s.otherDayNo = true; cc.s.askedAsking = true; cc.s.skipAsk = true; cc.say("oh_okay"); },
    ask,
  });
}

const MEX = "Mexican: ";
const ON = "el before a weekday = on (English needs no article).";

export const inviteCall: SituationDef = {
  id: "s83-invite-call",
  song: 83,
  songTitle: "Are You Free on Friday?",
  title: { en: "¿Estás libre el viernes?", lt: "Are you free on Friday?" },
  topic: { en: "Planes e invitaciones", lt: "Making plans" },
  chapter: 5,
  order: 2,
  location: "phone",
  npc: "lizzie",
  mode: "phone",
  goal: "Invite Andrea to a concert on Friday and agree on where and when to meet.",
  intro: "You have two tickets for a concert on Friday night; it starts at nine. You call your friend Andrea. Friends say tú to each other, so you can too. Prices are in pesos.",
  entities: { genre: GENRES, place: PLACES },

  grammar: {
    macros: {
      lz: "(andrea | andy | andre | andreita)",
      when: [
        "{day} [(en la noche | en la tarde | por la noche | por la tarde)] [a {time}]",
        "a {time} [{day}] [(en la noche | por la noche)]",
      ],
      event: [
        "[un | el | este | ese] concierto [de {genre}]",
        "[un | el | este] (festival | show | toquin | tocada) [de {genre}]",
        "[un | el] concierto de (mi grupo favorito | mi banda favorita | mi cantante favorito | mi cantante favorita) #fav",
        "(ver | escuchar | oir) [a] [un | una | el | este | unos] (grupo | banda | cantante) [de {genre}]",
        "(ver | escuchar | oir) [a] (mi grupo favorito | mi banda favorita | mi cantante favorito | mi cantante favorita) #fav",
        "[la] musica en vivo",
        "(una | la) noche de {genre}",
      ],
      to_event: "(a | al | para | para el) @event",
      come: "(venir | ir | acompanarme | ir conmigo | venir conmigo | ir juntos | ir juntas | salir conmigo)",
      sorry: "[(perdon | lo siento | disculpa | perdona | ay | ay no | no perdon | uy | fijate que | lo siento mucho)]",
      okq: "[(te parece | esta bien | te queda bien | te late | sale | va | ok | te sirve)]",
      tix: "[(dos | 2 | un par de | unos | otro | un | una | unas | otros)] (boletos | boleto | entradas | entrada | boletas | boleta | tickets | ticket) [gratis]",
      // the answer to "¿Por qué?": "Porque tengo dos boletos…"
      pq: "(porque | pues porque | es porque)",
      // "…, ¿quieres venir?" / "…, ¿te animas?" after the tickets
      want_q: "(quieres [ir | venir | uno | venir conmigo | ir conmigo] | te gustaria (ir | venir) [conmigo] | te animas | te interesa | vienes | te late | te apetece [ir | venir] | me acompanas | quieres acompanarme)",
      loc: [
        "[(en | afuera de | fuera de | enfrente de | frente a | junto a | cerca de | a un lado de | adentro de | dentro de | por)] {place}",
        "(afuera | fuera | enfrente | cerca | a un lado | adentro | dentro | junto) del {place}",
        "(al | junto al | frente al) {place}",
      ],
      meetv: "(nos vemos | vernos | veamonos | quedamos | quedamos de vernos | nos encontramos | te veo | te espero | nos juntamos)",
    },
  },

  intents: {
    voc: { patterns: ["@lz", "(hablo con | eres tu | es) @lz", "(esta | se encuentra) @lz"] },
    its_me_ctx: { patterns: [
      "[@lz] soy {name} #h:open_its", "[@lz] soy yo [{name}]", "[@lz] habla {name}", "[@lz] (te habla | te llama | aqui) {name}",
      "[@lz] es {name}", "[@lz] soy (tu amigo | tu amiga | tu vecino | tu vecina | tu companero | tu companera) {name}",
      "[@lz] (mi nombre es | me llamo) {name}", "[@lz] soy {name} (del trabajo | de la oficina | de al lado | de la clase)",
      "[@lz] soy {name} te acuerdas de mi", "[@lz] soy {name} (tu amigo | tu amiga | tu vecino | tu vecina)", "[@lz] {name} (te habla | habla | aqui)",
    ] },
    ask_like: { patterns: [
      "[@lz] te gusta [el | la] {genre}", "[@lz] te gusta la musica en vivo", "[@lz] te gustan los conciertos",
      "[@lz] eres fan de [el | la] {genre}", "[@lz] te late [el | la] {genre}",
    ] },
    hear_me: { patterns: ["[@lz] (me escuchas | me oyes | me escucha | me oye) [bien | ahora | ya]", "(bueno | hola) (me escuchas | me oyes)", "se oye bien", "se (esta cortando | corta | escucha mal | oye mal) [(me escuchas | me oyes)]"] },
    good_time: { patterns: [
      "[@lz] (tienes | tiene) un (minuto | minutito | momento | momentito | segundo | ratito) #h:open_minute",
      "[@lz] (puedes | puede) hablar [ahorita | ahora | un momento] #h:open_good_time",
      "[@lz] (estas | esta) (ocupada | ocupado) (ahorita | ahora | en este momento)",
      "es (un) buen momento", "te (agarro | encuentro) en (mal | buen) momento", "no te (interrumpo | molesto)",
      "(perdon | disculpa) que te (llame | moleste | marque) [tan tarde | tan temprano | a esta hora | ahorita]",
    ] },
    ask_free: { patterns: [
      "[@lz] (estas | esta) (libre | desocupada | desocupado) [@when] #h:free_q", "[@lz] (estas | esta) libre [@when] o no",
      "[@lz] (estas | esta) (ocupada | ocupado) @when #busyq #h:busy_q",
      "[@lz] (trabajas | vas a trabajar) @when #busyq",
      "[@lz] que (vas a hacer | haces | tienes que hacer) [@when] #plansq #h:plans_q",
      "[@lz] (tienes | tiene) [algun | algunos] (plan | planes) [para] [@when] #plansq #h:plans_q2",
      "[@lz] que planes tienes [para] [@when] #plansq",
      "[@lz] (tienes | tiene) algo [que hacer] @when #plansq",
      "[@lz] (tienes | tiene) tiempo [libre] [@when]",
      "[@lz] (que tal | como estas para | como andas para) {day} [estas libre]", "[@lz] y {day} estas libre",
      "[@lz] (te queda | te sirve) [bien] {day}", "[@lz] puedes [salir] @when",
    ] },
    tickets: { patterns: [
      "[@lz] (tengo | consegui | compré | me gané | me regalaron | me dieron | me sobra | me sobran) @tix [(para | de) @event] [para] [@when] #h:inv_tickets",
      "[@lz] (tengo | consegui | compré) @tix @when (para | de) @event",
      "[@lz] (toca | va a tocar | viene | se presenta) (mi grupo favorito | mi banda favorita | mi cantante favorito | mi cantante favorita) [@when] #fav",
      "[@lz] (mi grupo favorito | mi banda favorita | mi cantante favorito | mi cantante favorita) (toca | va a tocar | viene | se presenta) [@when] #fav",
      "[@lz] (toca | va a tocar | viene) (un grupo de {genre} | el grupo | un grupo que me gusta | una banda que me gusta) [@when]",
      "[@lz] hay @event [@when]",
      "[@lz] voy a ir (a | al) @event [@when]",
      "[@lz] te (llamo | hablo) porque tengo @tix [(para | de) @event] [@when]",
      // the answer to her "¿Por qué?"
      "@pq (tengo | consegui | compré | me gané | me regalaron | me dieron | me sobra | me sobran) @tix [(para | de) @event] [para] [@when]",
      "@pq hay @event [@when]",
    ] },
    invite: { patterns: [
      "[@lz] [oye] (quieres | quiere) @come [@to_event] [conmigo] [@when] #h:inv_want",
      "[@lz] (quieres | quiere) (ir a | ir al | ver | escuchar) @event [conmigo] [@when] #h:inv_want",
      "[@lz] (te | le) gustaria @come [@to_event] [conmigo] [@when] #h:inv_would",
      "[@lz] (te | le) gustaria (ir a | ir al | ver | escuchar) @event [conmigo] [@when] #h:inv_would",
      "[@lz] te (animas | apuntas | late | apetece) [a] [@come] [@to_event] [conmigo] [@when] #h:inv_animas",
      "[@lz] (que tal si | y si) vamos [juntos | juntas] @to_event [@when] #h:inv_how_about",
      "[@lz] que tal @event [@when]",
      "[@lz] vamos @to_event [@when] #h:inv_lets", "[@lz] vamos [juntos | juntas] @when",
      "[@lz] por que no vamos [juntos | juntas] @to_event [@when]",
      "[@lz] (tienes | tendrias) ganas de @come [@to_event] [conmigo] [@when] #h:inv_feel_like",
      "[@lz] te (quiero | queria | quisiera) invitar [@to_event] [@when] #h:inv_invite",
      "[@lz] (me gustaria | quiero | queria | quisiera) invitarte [@to_event] [@when]",
      "[@lz] te invito [@to_event] [@when]", "[@lz] te (llamo | hablo) para invitarte [@to_event] [@when]",
      "[@lz] (queria | quiero) (saber | ver | preguntarte) si (te gustaria | quieres | quisieras | te animas a) @come [@to_event] [conmigo] [@when] #h:inv_wondering",
      "[@lz] (vienes | te vienes) [conmigo] [@to_event] [@when]", "[@lz] (vente | ven) conmigo [@to_event] [@when]",
      "[@lz] (me acompanas | me quieres acompanar | acompaname) [@to_event] [@when]",
      "[@lz] quieres (uno | el boleto | un boleto | el otro boleto | la entrada)",
      "[@lz] (tengo | consegui | compré | me regalaron | me sobra | me sobran) @tix [(para | de) @event] [para] [@when] @want_q",
      "[@lz] hay @event [@when] @want_q",
      "[@lz] (podemos | podriamos) ir [juntos | juntas] @to_event [@when]",
      "[@lz] (puedes | podrias | quieres) (ir | venir) conmigo [@to_event] [@when]",
      "[@lz] (quieres | te gustaria) salir [conmigo] [@when]",
      "[@lz] (estas | te) (dentro | apuntas)",
      // the answer to her "¿Por qué?"
      "[@pq] para invitarte [@to_event] [@when]", "@pq te (quiero | queria | quisiera) invitar [@to_event] [@when]",
      "@pq (quiero | queria | quisiera) invitarte [@to_event] [@when]",
      "@pq (tengo | consegui | compré | me regalaron | me sobra | me sobran) @tix [(para | de) @event] [para] [@when] @want_q",
    ] },
    day_ans: { patterns: [
      "{day} [(en la noche | en la tarde | por la noche)] [a {time}] #h:day_this",
      "(y | que tal) {day} [(en la noche | por la noche)] #h:od_how_about",
      "(si | exacto | eso | asi es | correcto | claro) [si] {day} [(en la noche | por la noche)] [a {time}] #h:cf_yes_day",
      "[perdon] (quise decir | queria decir | digo) {day}",
      "[no] (es | el concierto es | es el concierto) {day} [(en la noche | por la noche)] [a {time}] #h:day_on",
      "{day} (esta bien | me queda mejor | es mejor | si | exacto | correcto)",
      "[no] {day} no [es] {day}", "no es {day} (es | sino) {day}",
      "(bueno | entonces | ok) {day} [entonces]",
    ] },
    band_ans: { patterns: [
      "(es | son) (un | una) (grupo | banda) de {genre} #h:band_genre", "[un | una] (grupo | banda) de {genre}", "[musica de] {genre}",
      "es (un concierto | musica) de {genre} #h:band_concert", "(un | una) (grupo | banda) de {genre} de aqui #h:band_local",
      "(es | son) [un | una] (grupo | banda) de {genre} (de aqui | local | del pueblo | de cancun | de merida | de playa del carmen | de la ciudad de mexico)",
      "[es | son] (mi grupo favorito | mi banda favorita) #fav #h:band_fav",
      "[es | son] (un | una) (grupo | banda) (de aqui | local | del pueblo | de cancun | de merida | de playa del carmen | de la ciudad de mexico)",
      "(tocan | toca) {genre}", "(es | son) [un | una] (cantante | trio | duo | dj) [de {genre}]",
      "(un | una) (grupo | banda) local [de {genre}]",
      "no es {genre} (es | sino) {genre}", "{genre} no [es] {genre}",
    ] },
    // "No me acuerdo del nombre." (to "¿Quién toca?")
    band_forgot: { patterns: ["no (me acuerdo | recuerdo) [del nombre | de su nombre | como se llaman | quien toca]", "se me olvidó [el nombre | su nombre | como se llaman]", "no se (el nombre | como se llaman | quien toca)"] },
    band_ctx: { patterns: ["[(es | son | se llaman | se llama | el grupo se llama | un grupo que se llama | una banda que se llama)] {w:any}"] },
    // "No sé a qué hora empieza": the start step's help
    start_unknown_ctx: { patterns: ["no (se | sé) (a que hora | cuando) (empieza | es | comienza) [el concierto]", "no (me acuerdo | recuerdo) (a que hora | la hora) [empieza | es]", "no (se | tengo) la hora [todavia]"] },
    starts_at: { patterns: [
      "(empieza | comienza) a {time} #h:start_at", "(el concierto | el show | la tocada | eso) (empieza | comienza | es) a {time}",
      "(abren | abren las puertas | las puertas abren) a {time} #doors #h:start_doors", "creo que (empieza | es) a {time}",
      "(empieza | va a empezar | comienza) (como | mas o menos) a {time}", "(el grupo | la banda) (sale | toca | empieza a tocar) a {time}",
      "(empieza | comienza) {time}", "(el concierto | el show) va a (empezar | comenzar) a {time}",
    ] },
    time_shift_ctx: { patterns: [
      "[no] [mejor] [un poco | un poquito] (mas temprano | antes) #earlier", "[no] [mejor] [un poco | un poquito] (mas tarde | despues) #later",
      "(es | esta) (muy | demasiado) (tarde #earlier | temprano #later)", "(algo | un poco) (antes #earlier | mas tarde #later)",
      // "A las ocho no puedo": a refusal of her time (never a yes)
      "[no] a {time} no (puedo | me queda [bien] | me sirve | llego) #refuse", "no (puedo | llego) a {time} #refuse", "no a {time} no #refuse",
      "[no] a esa hora no (puedo | me queda [bien] | me sirve | llego) #refuse", "no (puedo | llego) a esa hora #refuse", "[no] a esa hora no #refuse",
      "no me (queda [bien] | sirve | da tiempo) [a esa hora] #refuse", "no llego [a tiempo] #refuse", "(mejor | prefiero) [a] otra hora #refuse",
    ] },
    time_ans: { patterns: [
      "a {time} #h:start_short", "{time}", "(como | mas o menos) a {time} [creo] #h:start_around",
      "(digamos | pongamos) [a] {time} #h:time_lets_say", "que tal a {time} #h:time_how_about", "(y si | que tal si) nos vemos a {time}",
      "(te parece [bien] | te queda bien | te late) a {time}", "a {time} (te parece | esta bien | te queda bien | te late | me queda bien | sale | va)",
      "creo que [es] a {time}", "(mejor | prefiero) a {time}", "(un poco | un poquito) (antes | mas temprano | mas tarde | despues) [como] a {time}",
      "[si] a {time} (esta bien | me parece bien | perfecto | esta perfecto)",
      "no a {time} [sino] a {time} #fix", "a {time} no [mejor] a {time} #fix",
      "(media hora #b30 | treinta minutos #b30 | una hora #b60 | quince minutos #b15) antes [del concierto | de que empiece]",
    ] },
    meet: { patterns: [
      "[entonces] @meetv @loc [a {time}] [@okq] #h:meet_lets",
      "[entonces] @meetv a {time} @loc [@okq] #h:meet_full",
      "(que tal | mejor | prefiero) [en] @loc [a {time}] #h:meet_how_about",
      "(y si | que tal si) nos vemos @loc [a {time}]",
      "@loc [a {time}] [@okq]", "a {time} @loc [@okq]",
      "(prefiero | mejor) (vernos | que nos veamos) @loc [a {time}]",
      "@loc (esta bien | me queda bien | es mejor | me queda mejor | seria mejor | me parece bien)",
      "(podemos | podriamos) vernos @loc [a {time}]",
      "no @loc [sino] @loc", "@loc no [mejor] @loc",
    ] },
    // "No en el kiosco": not there (never a meeting place; "No, en el kiosco" loses its comma too: Andrea asks)
    meet_not: { patterns: ["no @loc", "no (nos vemos | quiero vernos | quiero ir) @loc", "@loc no", "no me (gusta | late | convence) [mucho] @loc #dislike", "@loc no me (gusta | late | convence) [mucho] #dislike"] },
    // "Mejor en otro lugar", "No me gusta", "Ahí no": not the place she suggested, and none named (expected only where a
    // place is being chosen: "No me gusta" means nothing else elsewhere)
    place_no_ctx: { patterns: [
      "[no] [mejor | prefiero] [en] (otro lugar | otro lado | otra parte | otro sitio) #elsewhere", "[y] (que tal | y si) [nos vemos] [en] (otro lugar | otro lado | otra parte) #elsewhere",
      "(podemos | podriamos) vernos en (otro lugar | otro lado | otra parte) #elsewhere", "no me (gusta | late | convence) [mucho] [ese lugar | ahi | alli | la idea]", "[no] (ahi | alli) no",
    ] },
    // "¿Dónde queda la taquería?" (at her suggestion)
    where_is_ctx: { patterns: ["(donde | en donde | por donde) (queda | esta) [el | la] {place}", "(donde | en donde) (queda | esta) [eso | esa | ese]", "(cual | que) {place}", "cual"] },
    meet_unknown: { patterns: ["[@meetv] (en | afuera de | enfrente de | junto a | cerca de) [el | la] {w:any}"] },
    pickup: { patterns: [
      "[si quieres] (paso | puedo pasar | quieres que pase) por ti [a tu casa | en tu casa] [a {time}] #h:pick_up",
      "(te recojo | te puedo recoger | paso a recogerte | paso a buscarte | te paso a recoger | te paso a buscar | te busco | voy por ti | voy a por ti) [en tu casa] [a {time}]",
      "quieres que (te recoja | vaya por ti | pase a recogerte)", "(te recojo | paso por ti) en (el carro | mi carro | el coche | mi coche)",
    ] },
    ask_where: { patterns: [
      "donde nos vemos #h:meet_ask", "(donde | en donde) (quieres | te gustaria | prefieres) (que nos veamos | vernos | quedar)",
      "donde (te queda | es) (bien | mejor | mas facil | comodo | cerca) [para ti]", "(donde | en donde) quedamos", "donde (quieres | prefieres)",
      "(donde sea | donde tu quieras | donde quieras | tu dime | tu decide | tu escoge | tu eliges)", "me da igual [donde]", "no me importa donde",
    ] },
    ask_when: { patterns: [
      "a que hora nos vemos", "a que hora (quieres | te gustaria | prefieres) (que nos veamos | vernos | quedar)",
      "a que hora te (queda | conviene | viene) [bien | mejor] #h:time_ask_you", "(cuando | a que hora) quedamos", "a que hora (puedes | te late | llegas)",
    ] },
    sister_yes_ctx: { patterns: [
      "[claro | si | por supuesto] (entre | mientras | cuantos) mas mejor #h:sis_merrier", "(claro | si | por supuesto) no hay (problema | bronca) #h:sis_sure",
      "[claro | si] (que venga | puede venir | traela | invitala | que se venga | dile que venga | que se apunte)",
      "[claro | si] (compro | consigo | busco) (otro boleto | otra entrada) #h:sis_ticket", "[si] por que no", "claro que si [que venga]",
      "[claro | si] (es | esta) (bienvenida | invitada)", "[claro | si] pero (tiene que comprar | necesita | tendria que comprar) (su | un | una) (boleto | entrada)",
      "[claro | si] pero (ella) (paga | compra | tiene que pagar | tendria que pagar) (su | el | la) (boleto | entrada)",
      "[claro | si] (ella) puede comprar (su | un | una) (boleto | entrada) [en la entrada | en la taquilla]", "[claro | si] me encantaria conocerla",
    ] },
    sister_no_ctx: { patterns: [
      "@sorry (solo | nada mas | nomas) tengo dos [boletos | entradas] #h:sis_sorry", "@sorry (esta vez no | mejor otro dia | la proxima)",
      "@sorry ya no hay [mas] (boletos | entradas)", "@sorry (esta | ya esta) agotado", "[no] [mejor] @sorry (nada mas | solo | nomas) (tu y yo | nosotros dos | nosotras dos)",
      "@sorry no tengo (otro | mas | un) boleto [para ella]", "@sorry no tengo (otra | mas | una) entrada [para ella]",
      "@sorry (ella | tu hermana) no puede (venir | ir)", "@sorry no hay (lugar | boletos | mas boletos | entradas | mas entradas)", "[@sorry] (ella | tu hermana) no (puede | va a poder) (venir | ir) [esta vez] [@sorry]", "[no] no (puede | va a poder) (venir | ir) [esta vez] [perdon | lo siento]",
      "(no | nel) (perdon | lo siento)", "(esta vez no | ahora no) (perdon | lo siento)", "prefiero que no", "[@sorry] [mejor] (otro dia | la proxima | en otra ocasion) [@sorry]",
    ] },
    on_me: { patterns: [
      "[no te preocupes] yo invito #h:pay_on_me", "invito yo", "no te preocupes [por eso | por el boleto] #h:pay_dont_worry",
      "(es | va) (por mi cuenta | de mi parte)", "es (un | mi) regalo #h:pay_treat", "te lo regalo",
      "no me debes nada [es un regalo]", "(fue | fueron | es | son) gratis", "(olvidalo | ni te preocupes | no es nada)",
      "no (tienes que | hay que) pagar [nada | me nada]", "me (los | lo) regalaron", "(invitame | me invitas) (un | una | unos) (cafe | cerveza | chela | taco | tacos | elote | helado)",
    ] },
    price_ctx: { patterns: ["[(fue | fueron | es | son | cuesta | costo | costó | cuestan)] {price} [cada uno | cada boleto | por boleto | cada entrada | por entrada] #h:pay_price", "{price}",
      "[(fue | fueron | son | costaron)] {price} (por los dos | los dos | por las dos | las dos | por ambos | en total)"] },
    // "Luego te digo" to "¿Cuánto te debo?": she'll ask later
    pay_later_ctx: { patterns: ["(luego | despues | al rato | mas tarde) (te digo | te aviso | vemos | lo vemos | hablamos de eso)", "(luego | despues) (vemos | lo vemos | nos arreglamos)"] },
    // "Nada" to "¿Cuánto te debo?" (expected only there: "Nada" is no treat anywhere else)
    pay_free_ctx: { patterns: ["nada [nada]", "nada (es un regalo | yo invito | te invito | invito yo)"] },
    will_text: { patterns: [
      "(te escribo | te mando un mensaje | te marco | te mando los detalles | te aviso | te paso los detalles) [los detalles | la direccion | la hora] [luego | mas tarde | manana | al rato | por whatsapp | por mensaje] #h:close_text",
      "(luego | al rato | mas tarde) te (escribo | aviso | mando los detalles | mando un mensaje) [los detalles]",
      "(mandame | escribeme) [un mensaje] [luego | por whatsapp]", "te paso (los detalles | la ubicacion | la direccion) [por whatsapp]",
    ] },
    cant_wait: { patterns: [
      "[yo tambien] (no puedo esperar | ya quiero que sea {day} | ya quiero que llegue {day}) ", "que emocion #h:close_cant_wait", "yo tambien",
      "va a estar (padrisimo | genial | increible | muy bien | buenisimo | padre | chido | muy padre | super)",
      "(estoy | ando) [muy | super] (emocionado | emocionada)", "(va a ser | sera) (genial | increible | muy divertido | divertidisimo)",
    ] },
    agree: { patterns: [
      "(si | claro | va | sale | ok | okey | perfecto | dale | vale) (claro | perfecto | me parece bien | genial | por supuesto | sin problema | de acuerdo | buena idea)",
      "(me parece | suena) (bien | perfecto | genial | buenisimo) #h:ag_sounds_good", "perfecto #h:ag_perfect", "claro #h:ag_sure",
      "(va | sale | orale | andale | dale | vale) #h:ag_va", "(buena | muy buena) idea", "me late", "de acuerdo #h:ag_va", "asi esta bien [gracias]",
    ] },
    no_sorry: { patterns: ["(no | nel) (perdon | lo siento)", "(perdon | lo siento) no", "no la verdad no", "mejor no"] },
    reassure: { patterns: [
      "no (pasa nada | hay problema | te preocupes | importa)", "(ni modo | que lastima | lastima | que mal | ay que mal | que pena)",
      // "No te preocupes, a las ocho está bien" (at her "¿y si mejor a las ocho?"): one piece, the time read by the handler
      "[claro | si] no (pasa nada | hay problema | te preocupes | importa) a {time} [(esta bien | me parece bien | perfecto | me queda bien)]",
      "(otro dia | la proxima) (sera | entonces)", "[bueno] (sera | para) la proxima",
    ] },
    accept_inv: { patterns: [
      "me encantaria [ir] #h:rep_love", "cuenta conmigo #h:rep_count_in", "(me parece | suena) (genial | padre | super | padrisimo) [cuenta conmigo]",
      "(ahi estare | claro que voy | si voy | yo voy | alli estare)", "(si | claro) me encantaria",
      "[si] (estoy libre | no tengo planes | no tengo nada) [{day}]", "{day} (estoy libre | no tengo nada | no tengo planes)",
      "[si | claro] (llevo | puedo llevar | quieres que lleve) algo #bring", "[si | claro] que (llevo | quieres que lleve) #bring", "[si | claro] a que hora (llego | voy | es) [la carne asada | la parrillada] #bbqtime",
      "[si] no estoy (ocupado | ocupada) [{day}]",
      "(que padre | que bien | genial | super | si | claro) [si | claro] (voy | ahi estare | me apunto | ahi nos vemos)",
    ] },
    decline_ctx: { patterns: [
      "@sorry no puedo [ir] [{day}] @sorry #h:rep_cant", "@sorry {day} no puedo @sorry", "@sorry (estoy | voy a estar) (ocupado | ocupada) [{day}] #h:rep_cant",
      // "Mejor otro día", "Otro día": a refusal, never a yes
      "[gracias pero] @sorry [mejor] (otro dia | en otra ocasion | la proxima) [@sorry]", "(hoy | ahora | esta vez) no [mejor] otro dia",
      "@sorry {day} (estoy | voy a estar) (ocupado | ocupada)", "[no] no estoy libre [{day}]", "@sorry {day} no estoy libre",
      "[gracias pero] [ya] (tengo | tengo otros) (planes | un compromiso | otro compromiso) [{day}] #h:rep_plans",
      "gracias pero (no puedo | ya tengo planes)", "me encantaria pero no puedo [{day}]", "ojala pudiera",
      "(sera | es) para la proxima #h:rep_another", "(esta vez | este domingo | el domingo) no [puedo]", "no creo que pueda [ir]",
      "@sorry (trabajo | tengo que trabajar | voy a trabajar) [{day}]", "@sorry {day} (trabajo | tengo que trabajar)",
      "@sorry (voy a salir | me voy | voy a estar fuera) [de viaje] [este fin de semana | {day}]",
      "@sorry (voy a | tengo que) visitar a (mis papas | mi familia | mis padres | mi mama | unos amigos) [{day}]",
      "@sorry no tengo tiempo [{day}]", "@sorry no voy a poder [ir]", "(no quiero | no voy a) ir [a la carne asada | a la parrillada | al asado | {day}]",
      "no (se | sé) si (puedo | voy a poder) [ir] #maybe", "(a lo mejor | tal vez | quiza | quizas) [puedo | voy] #maybe", "(lo veo | te confirmo) [luego | despues | manana] #maybe",
    ] },
    bye_ext: { patterns: [
      "(nos vemos | te veo | hasta) {day} [entonces] #h:close_see_you", "nos vemos (alla | ahi | entonces) [{day}]", "(hablamos | nos hablamos) [luego | pronto | despues] #h:close_talk_soon",
      "(luego | despues | al rato) hablamos", "(sale | va | bueno | ok) nos vemos [{day}]", "nos vemos (en | afuera de | enfrente de) {place}",
    ] },
  },

  lines: {
    hello_q: [t("¿Bueno?", "Hello?", "Hello?", { flags: { 0: MEX + "how people answer the phone." }, neutral: t("¿Hola?", "Hello?", "Hello?"), spain: t("¿Sí?", "Hello?", "Hello?", { flags: { 0: "Spain: how people answer the phone (also ¿Diga?)." } }) })],
    who_is_this: [
      t("¿Bueno? | ¿Quién | habla?", "Hello? | Who | is speaking?", "Hello? Who's this?", { flags: { 0: MEX + "how people answer the phone." },
        neutral: t("¿Hola? | ¿Quién | habla?", "Hello? | Who | is speaking?", "Hello? Who's this?"), spain: t("¿Diga? | ¿Quién | es?", "Hello? | Who | is it?", "Hello? Who's this?", { flags: { 0: "Spain: ¿diga? is how people answer the phone." } }) }),
    ],
    oh_hey: [
      t("¡Ah, | hola! | ¿Cómo | estás?", "Oh, | hi! | How | are you?", "Oh, hi! How are you?"),
      t("¡Ay, | hola! | ¿Qué tal?", "Oh, | hi! | How's it going?", "Oh, hey! How's it going?"),
    ],
    hey_howareyou: [
      t("¡Hola! | ¿Cómo | estás?", "Hi! | How | are you?", "Hi! How are you?"),
      t("¡Hola, | hola! | ¿Cómo | te | va?", "Hi, | hi! | How | (for) you | does it go?", "Hey there! How's it going?"),
    ],
    how_are_you_again: [t("Bueno, | ¿y | cómo | estás?", "Well, | and | how | are you?", "So, how are you?")],
    hey_whatsup: [
      t("¡Hola! | ¿Qué onda?", "Hi! | What's up?", "Hey! What's up?", { flags: { 1: MEX + "a friendly “what's up?”." },
        neutral: t("¡Hola! | ¿Qué tal?", "Hi! | How's it going?", "Hey! How's it going?") }),
      t("¡Hola, | tú! | ¿Qué | me | cuentas?", "Hi, | you! | What | (to) me | do you tell?", "Hey, you! What's new?"),
    ],
    i_know: [
      t("¡Ja, | ya | sé! | Vi | tu | nombre | en | la | pantalla.", "Ha, | already | I-know! | I-saw | your | name | on | the | screen.", "Ha, I know! I saw your name on the screen.", { spain: t("¡Ja, | ya | lo sé! | He visto | tu | nombre | en | la | pantalla.", "Ha, | already | I-know-it! | I've seen | your | name | on | the | screen.", "Ha, I know! I saw your name on the screen.") }),
    ],
    so_whats_up: [
      t("Bueno, | ¿qué | me | cuentas?", "Well, | what | (to) me | do you tell?", "So, what's up?"),
      t("Bueno, | ¿y | qué | hay | de | nuevo?", "Well, | and | what | is there | of | new?", "So, what's new?"),
    ],
    hear_you: [t("Sí, | te | escucho | bien.", "Yes, | you | I-hear | fine.", "Yep, I can hear you fine.")],
    good_time: [
      t("Sí, | claro, | tengo | un | ratito. | Dime.", "Yes, | sure, | I-have | a | little while. | Tell me.", "Sure, I've got a minute. What's up?",
        { flags: { 4: "ratito: a little while (rato + the diminutive -ito)." } }),
      t("Sí, | dime.", "Yes, | tell me.", "Yeah, go ahead."),
    ],
    free_yes: [
      t("Creo que sí. | ¿Por qué?", "I think so. | Why?", "I think so. Why?"),
      t("Sí, | estoy | libre. | ¿Por qué?", "Yes, | I-am | free. | Why?", "Yeah, I'm free. Why?"),
    ],
    not_busy: [t("No, | estoy | libre. | ¿Por qué?", "No, | I-am | free. | Why?", "No, I'm free. Why?")],
    not_much: [
      t("Nada | especial. | ¿Por qué?", "Nothing | special. | Why?", "Not much. Why?"),
      t("¡Nada | todavía! | ¿Por qué?", "Nothing | yet! | Why?", "Nothing yet! Why?"),
    ],
    sat_busy_fri_free: [
      t("El | sábado | no puedo, | pero | el | viernes | estoy | libre. | ¿Por qué?", "On | Saturday | I can't, | but | on | Friday | I-am | free. | Why?",
        "Saturday I can't, but Friday I'm free. Why?", { flags: { 0: ON, 4: ON } }),
    ],
    not_busy_known: [t("¡No, | estoy | libre!", "No, | I-am | free!", "No, I'm free!")],
    not_much_known: [t("¡Nada | todavía!", "Nothing | yet!", "Nothing yet!")],
    free_yep: [t("¡Sí! | Estoy | libre.", "Yes! | I-am | free.", "Yep! I'm free.")],
    maybe_free: [
      t("¡A lo mejor! | Déjame | ver | y | te | escribo.", "Maybe! | Let me | see | and | (to) you | I'll-write.", "Maybe! Let me check and I'll text you.",
        { flags: { 0: "a lo mejor: maybe; very common in Mexico." } }),
    ],
    sat_busy: [
      t("El | sábado | no puedo. | Voy | a | ayudar | a | mi | mamá | con | la | mudanza. | ¿Por qué?",
        "On | Saturday | I can't. | I'm going | to | help | — | my | mom | with | the | move. | Why?",
        "Saturday I can't. I'm helping my mom move. Why?", { flags: { 0: ON, 6: "Personal a: Spanish marks a person after the verb; English has no word here." }, spain: t("El | sábado | no puedo. | Voy | a | ayudar | a | mi | madre | con | la | mudanza. | ¿Por qué?", "On | Saturday | I can't. | I'm going | to | help | — | my | mom | with | the | move. | Why?", "Saturday I can't. I'm helping my mom move. Why?", { flags: { 0: ON, 6: "Personal a: Spanish marks a person after the verb; English has no word here." } }) }),
      t("Ay, | el | sábado | no puedo, | ya | tengo | planes. | ¿Por qué?", "Oh, | on | Saturday | I can't, | already | I-have | plans. | Why?",
        "Oh, Saturday I can't, I already have plans. Why?", { flags: { 1: ON } }),
    ],
    sat_busy_invite: [
      t("¡Ay, | no! | El | sábado | no puedo. | ¿Y | otro | día?", "Oh, | no! | On | Saturday | I can't. | And | another | day?", "Oh no! I can't on Saturday. What about another day?", { flags: { 2: ON } }),
    ],
    sat_busy_after: [
      t("¿El | sábado? | Perdón, | no puedo, | ya | tengo | planes.", "On | Saturday? | Sorry, | I can't, | already | I-have | plans.", "Saturday? Sorry, I can't. I already have plans.", { flags: { 0: ON } }),
    ],
    another_time: [t("¿Otro | día, | tal vez?", "Another | day, | maybe?", "Maybe another time?")],
    which_day: [
      t("¿Qué | día | es?", "What | day | is it?", "What day is it?"),
      t("Espera, | ¿qué | día?", "Wait, | what | day?", "Wait, which day?"),
    ],
    are_you_asking: [
      t("¡Ay, | qué padre! | ¿Me | estás invitando?", "Oh, | how cool! | Me | are you inviting?", "Ooh, cool! Are you inviting me?",
        { flags: { 1: MEX + "qué padre = how cool." },
          neutral: t("¡Ay, | qué | bien! | ¿Me | estás invitando?", "Oh, | how | nice! | Me | are you inviting?", "Ooh, nice! Are you inviting me?") }),
      t("Espera, | ¿me | estás invitando?", "Wait, | me | are you inviting?", "Wait, are you inviting me?"),
    ],
    is_that_invitation: [t("Entonces... | ¿es | una | invitación?", "So... | is it | an | invitation?", "So... is that an invitation?")],
    for_what: [t("Espera, | ¿para | qué?", "Wait, | for | what?", "Wait, for what?")],
    oh_okay: [t("¡Ah! | Bueno, | no pasa nada.", "Oh! | Okay, | no problem.", "Oh! Okay, no problem.", { spain: t("¡Ah! | Vale, | no pasa nada.", "Oh! | Okay, | no problem.", "Oh! Okay, no problem.") })],
    accept: [
      t("¿En serio? | ¡Me encantaría!", "Really? | I'd love to!", "Are you kidding? I'd love to!"),
      t("¡Ay, | sí! | ¡Me encantaría!", "Oh, | yes! | I'd love to!", "Oh my gosh, yes! I'd love to!"),
      t("¡Qué padre! | ¡Cuenta conmigo!", "How cool! | Count me in!", "Cool! Count me in!", { flags: { 0: MEX + "qué padre = how cool." },
        neutral: t("¡Qué | bien! | ¡Cuenta conmigo!", "How | nice! | Count me in!", "Great! Count me in!") }),
      t("¡Sí! | ¡Claro que sí! | ¡Gracias!", "Yes! | Of course! | Thanks!", "Yes! Of course! Thank you!"),
    ],
    already_yes: [
      t("¡Sí, | ya | te | dije | que | sí! | Estoy | emocionadísima.", "Yes, | already | (to) you | I-told | that | yes! | I-am | super excited.",
        "Yes, I already said yes! I'm so excited.", { flags: { 7: "-ísima: very, super (a woman speaking)." } }),
    ],
    love_genre: [
      t("¡Me encanta | {G.the}!", "I love | {G}!", "I love {G}!", { flags: { 1: "Spanish uses the article for a kind of music in general; English has none." } }),
      t("¡Ah, | me encanta | {G.the}!", "Oh, | I love | {G}!", "Oh, I love {G}!", { flags: { 2: "Spanish uses the article for a kind of music in general; English has none." } }),
    ],
    love_live: [
      t("¡Me encanta | la | música | en vivo!", "I love | — | music | live!", "I love live music!", { flags: { 1: "la: Spanish uses the article for things in general; English has none." } }),
    ],
    why_q: [t("¿Por qué?", "Why?", "Why?")],
    fav_band: [t("¿Tu | grupo | favorito? | ¡Genial!", "Your | band | favorite? | Great!", "Your favorite band? Awesome!")],
    bad_line: [
      t("Perdón, | se está cortando | un | poco. | ¿Dijiste | el | viernes?", "Sorry, | it's breaking up | a | little. | Did you say | — | Friday?",
        "Sorry, you're breaking up a little. Did you say Friday?", { flags: { 5: "el before a weekday; English needs no word here." } }),
    ],
    bad_line_q: [
      t("Perdón, | ¿dijiste | el | viernes?", "Sorry, | did you say | — | Friday?", "Sorry, did you say Friday?", { flags: { 2: "el before a weekday; English needs no word here." } }),
    ],
    ask_day: [
      t("¡Genial! | ¿Y | cuándo | es?", "Great! | And | when | is it?", "Cool! When is it?"),
      t("¿Y | cuándo | es | el | concierto?", "And | when | is | the | concert?", "When's the concert?"),
    ],
    ask_band: [
      t("¡Ay, | qué | divertido! | ¿Quién | toca?", "Oh, | how | fun! | Who | plays?", "Ooh, fun! Who's playing?"),
      t("¿Y | qué | tipo | de | música | es?", "And | what | kind | of | music | is it?", "What kind of music is it?"),
    ],
    fun: [
      t("¡Ay, | qué | divertido!", "Oh, | how | fun!", "Ooh, fun!"),
      t("¡Qué | bien!", "How | nice!", "Nice!"),
    ],
    never_heard: [t("Nunca | los | he oído, | ¡pero | voy!", "Never | them | I've heard, | but | I'm-going!", "Never heard of them, but I'm in!", { flags: { 1: "los: them (an object pronoun here, not the article)." } })],
    mystery: [t("¡Ja, | un | grupo | misterioso! | Igual | voy.", "Ha, | a | band | mysterious! | Anyway | I'm-going.", "Ha, a mystery band! I'm in anyway.")],
    ask_start: [
      t("¿A | qué | hora | empieza?", "At | what | time | does it start?", "What time does it start?"),
      t("¿Y | a | qué | hora | es?", "And | at | what | time | is it?", "And what time is it at?"),
    ],
    start_help: [t("No pasa nada. | Luego | me | escribes.", "No problem. | Later | (to) me | you-write.", "No problem. Just text me later.")],
    ack_time: [
      t("Ok, | perfecto.", "Okay, | perfect.", "Okay, cool.", { spain: t("Vale, | perfecto.", "Okay, | perfect.", "Okay, cool.") }),
      t("Ah, | muy | bien.", "Ah, | very | good.", "Got it."),
    ],
    ask_place: [
      t("¿Dónde | nos vemos?", "Where | do we meet?", "Where should we meet?"),
      t("¿Y | dónde | quieres | que | nos veamos?", "And | where | do you want | that | we meet?", "And where do you want to meet?"),
    ],
    ack_place: [
      t("¡Me parece | bien!", "It seems to me | good!", "Sounds good!"),
      t("Sale, | muy | bien.", "Okay, | very | good.", "Okay, great.", { flags: { 0: MEX + "sale = okay, deal." },
        neutral: t("Bueno, | muy | bien.", "Okay, | very | good.", "Okay, great."), spain: t("Vale, | muy | bien.", "Okay, | very | good.", "Okay, great.") }),
    ],
    ask_meet_time: [
      t("¿Y | a | qué | hora?", "And | at | what | time?", "And what time?"),
      t("¿Y | a | qué | hora | nos vemos?", "And | at | what | time | do we meet?", "And what time should we meet?"),
    ],
    ack: [
      t("Perfecto.", "Perfect.", "Perfect."),
      t("Muy | bien.", "Very | good.", "Great."),
      t("Va.", "Okay.", "Okay.", { flags: { 0: MEX + "va = okay." }, neutral: t("Bueno.", "Okay.", "Okay."), spain: t("Vale.", "Okay.", "Okay.") }),
    ],
    suggest_place: [
      t("¿Qué tal | en | el | kiosco?", "How about | at | the | bandstand?", "How about at the bandstand?",
        { flags: { 3: "kiosco: the bandstand in the middle of the zócalo, the main square." } }),
    ],
    where_then: [t("Bueno, | ¿entonces | dónde?", "Okay, | then | where?", "Okay, where then?")],
    suggest_time: [
      t("¿Qué tal | a | {$time}?", "How about | at | {$time}?", "How about {$time}?"),
    ],
    suggest_time_again: [t("¿Entonces | a | {$time}?", "Then | at | {$time}?", "{$time}, then?")],
    when_then: [t("Bueno, | ¿entonces | a | qué | hora?", "Okay, | then | at | what | time?", "Okay, what time then?")],
    where_is_that: [
      t("Mmm, | ¿dónde | queda | eso?", "Hmm, | where | is | that?", "Hmm, where's that?", { flags: { 2: "quedar: to be (located); ¿dónde queda? = where is it?" }, spain: t("Mmm, | ¿dónde | está | eso?", "Hmm, | where | is | that?", "Hmm, where's that?") }),
    ],
    pickup: [
      t("¡Ay, | qué | lindo, | gracias! | Pero | mejor | nos vemos | allá.", "Aw, | how | sweet, | thanks! | But | better | we meet | there.",
        "Aw, that's sweet, thanks! But let's just meet there."),
    ],
    meet_change: [
      t("Mmm, | los | viernes | en | el | kiosco | hay | mucha | gente. | ¿Mejor | en | la | taquería | del | mercado? | Así | cenamos | unos | tacos | antes.",
        "Hmm, | on | Fridays | at | the | bandstand | there is | a lot of | people. | Better | at | the | taco place | by the | market? | That way | we-eat-dinner | some | tacos | before.",
        "Hmm, the bandstand is packed on Fridays. How about the taco place by the market instead? We can grab some tacos first.",
        { flags: { 1: "los viernes: on Fridays (every Friday); there's free music at the kiosco." } }),
    ],
    where_kiosco: [t("En | medio | del | zócalo.", "In | the middle | of the | main square.", "Right in the middle of the zócalo.")],
    // the town's taquería (docs/es/TOWN.md; s62, s69): beside the mercado's door on avenida del Puerto
    where_taqueria: [t("Junto | al | mercado, | en | la | avenida | del | Puerto.", "Next | to the | market, | on | the | avenue | of the | Harbor.",
      "Next to the market, on Avenida del Puerto.")],
    where_send: [t("Luego | te | mando | la | ubicación.", "Later | (to) you | I-send | the | location.", "I'll send you the location.")],
    confirm_place: [t("¿Entonces | en | {P.the}?", "Then | at | {P.the}?", "So, at {P.the}?")],
    pay_later: [t("Bueno, | luego | me | dices | cuánto | fue.", "Okay, | later | (to) me | you-tell | how much | it-was.", "Okay, just tell me later what it was.", { spain: t("Vale, | luego | me | dices | cuánto | es.", "Okay, | later | (to) me | you-tell | how much | it-is.", "Okay, just tell me later what it was.") })],
    meet_change_q: [t("Entonces, | ¿nos vemos | en | la | taquería?", "So, | do we meet | at | the | taco place?", "So, can we meet at the taco place?")],
    ack_taqueria: [t("¡Gracias! | Entonces | en | la | taquería.", "Thanks! | Then | at | the | taco place.", "Thanks! The taco place, then.")],
    keep_kiosco: [t("Bueno, | no pasa nada. | El | kiosco | está | bien.", "Okay, | no problem. | The | bandstand | is | fine.", "Okay, no problem. The bandstand is fine.")],
    time_change: [
      t("Oye, | ¿y | si | mejor | a | las | ocho? | Salgo | de | trabajar | a | las | siete | y media.",
        "Hey, | and | if | better | at | — | eight? | I-get-out | of | work | at | — | seven | thirty.",
        "Hey, what if we make it eight? I get off work at seven thirty.",
        { flags: { 5: "Spanish uses an article before clock times; English has no separate word.", 11: "Spanish uses an article before clock times; English has no separate word." } }),
    ],
    time_change_q: [t("Entonces, | ¿a | las | ocho?", "So, | at | — | eight?", "So, eight?", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } })],
    ack_eight: [t("¡Gracias! | Entonces | a | las | ocho.", "Thanks! | Then | at | — | eight.", "Thanks! Eight, then.", { flags: { 3: "Spanish uses an article before clock times; English has no separate word." } })],
    ack_eight_time: [t("¡Gracias! | Así | llego | sin | prisa.", "Thanks! | That way | I-arrive | without | hurry.", "Thanks! That way I won't have to rush.")],
    keep_time: [
      t("Bueno, | entonces | salgo | corriendo | del | trabajo.", "Okay, | then | I'll-leave | running | from the | work.", "Okay, then I'll rush out of work."),
    ],
    // a time before she gets off work (7:30): she'll ask to leave early
    keep_time_early: [
      t("Bueno, | entonces | pido | permiso | para | salir | temprano.", "Okay, | then | I'll-ask | permission | to | leave | early.", "Okay, then I'll ask to leave work early."),
    ],
    band_again: [t("Pero, | ¿quién | toca?", "But, | who | plays?", "But who's playing?")],
    sister_again: [t("¿Y | mi | hermana? | ¿Puede | venir?", "And | my | sister? | Can she | come?", "So what about my sister? Can she come?")],
    pay_again: [t("¿Y | cuánto | te | debo?", "And | how much | (to) you | do I owe?", "So how much do I owe you?")],
    bbq_again: [t("Entonces, | ¿vienes | a | la | carne asada?", "So, | are you coming | to | the | cookout?", "So, are you coming to the cookout?",
      { neutral: t("Entonces, | ¿vienes | a | la | parrillada?", "So, | are you coming | to | the | cookout?", "So, are you coming to the cookout?"), spain: t("Entonces, | ¿vienes | a | la | barbacoa?", "So, | are you coming | to | the | cookout?", "So, are you coming to the cookout?") })],
    bring_nothing: [t("¡Nada, | nada más | ven!", "Nothing, | just | come!", "Nothing, just come!", { spain: t("¡Nada, | tú | solo | ven!", "Nothing, | you | just | come!", "Nothing, just come!") })],
    bbq_time: [t("Como | a | las | dos | de la tarde.", "Like | at | — | two | p.m.", "Around two in the afternoon.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." }, spain: t("Sobre | las | dos | de la tarde.", "Around | — | two | p.m.", "Around two in the afternoon.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) })],
    ask_sister: [
      t("Oye, | ¿y | puedo | llevar | a | mi | hermana? | Le encanta | la | música | en vivo.", "Hey, | and | can I | bring | — | my | sister? | She loves | — | music | live.",
        "Oh, and can I bring my sister? She loves live music.",
        { flags: { 4: "Personal a: Spanish marks a person after the verb; English has no word here.", 8: "la: Spanish uses the article for things in general; English has none." } }),
      t("Oye, | ¿puedo | invitar | a | mi | hermana?", "Hey, | can I | invite | — | my | sister?", "Hey, can I invite my sister?",
        { flags: { 3: "Personal a: Spanish marks a person after the verb; English has no word here." } }),
    ],
    sister_yes: [
      t("¡Ay, | gracias! | ¡Va | a | estar | feliz!", "Aw, | thanks! | She's going | to | be | happy!", "Yay! Thanks! She'll be so happy!", { spain: t("¡Ay, | gracias! | ¡Le | va | a | hacer | mucha | ilusión!", "Aw, | thanks! | (To) her | it's going | to | make | much | excitement!", "Yay! Thanks! She'll be so excited!") }),
      t("¡Genial! | Hoy | le | digo.", "Great! | Today | (to) her | I-tell.", "Awesome! I'll tell her today."),
    ],
    sister_no: [
      t("¡Ah, | no te preocupes! | Entonces | nada más | tú | y | yo.", "Oh, | don't worry! | Then | only | you | and | me.", "Oh, that's okay! Just us, then.", { spain: t("¡Ah, | no te preocupes! | Entonces | solo | tú | y | yo.", "Oh, | don't worry! | Then | only | you | and | me.", "Oh, that's okay! Just us, then.") }),
      t("¡No pasa nada! | Otro | día.", "No problem! | Another | day.", "No worries! Next time."),
    ],
    ask_pay: [
      t("Oye, | ¿y | cuánto | te | debo | del | boleto?", "Hey, | and | how much | (to) you | do I owe | for the | ticket?", "Oh, and what do I owe you for the ticket?",
        { neutral: t("Oye, | ¿y | cuánto | te | debo | de | la | entrada?", "Hey, | and | how much | (to) you | do I owe | for | the | ticket?", "Oh, and what do I owe you for the ticket?") }),
    ],
    on_me: [
      t("¡Ay, | eres | lo máximo! | ¡Gracias!", "Aw, | you're | the best! | Thanks!", "Aw, you're the best! Thank you!", { spain: t("¡Ay, | eres | un | sol! | ¡Gracias!", "Aw, | you're | a | sun! | Thanks!", "Aw, you're the best! Thank you!", { flags: { 3: "eres un sol: you're a sweetheart (very common in Spain)." } }) }),
      t("¿En serio? | ¡Qué | {m:lindo|f:linda}! | Gracias.", "Really? | How | sweet! | Thanks.", "Really? That's so sweet. Thanks!", { spain: t("¿En serio? | ¡Qué | detalle! | Gracias.", "Really? | What | a sweet thing! | Thanks.", "Really? That's so sweet. Thanks!") }),
    ],
    pay_back: [
      t("Bueno, | te lo | pago | cuando | nos veamos.", "Okay, | it to you | I'll-pay | when | we see each other.", "Okay, I'll pay you back when I see you."),
    ],
    // The plan in two lines: the day and the time (every {$day} × {$time} is voiced), then the place: a line with a value
    // and an entity would be voiced only with what random runs happen to say (tools/es-voices/lines-es.ts).
    summary: [
      t("Entonces | quedamos: | {$day}, | a | {$time}.", "So | we're agreed: | {$day}, | at | {$time}.", "So it's a plan: {$day} at {$time}.",
        { flags: { 1: "quedar (en algo): to agree on a plan; quedamos = we've agreed." } }),
    ],
    summary_notime: [
      t("Entonces | quedamos: | {$day}.", "So | we're agreed: | {$day}.", "So it's a plan: {$day}.",
        { flags: { 1: "quedar (en algo): to agree on a plan; quedamos = we've agreed." } }),
    ],
    summary_place: [t("¡Te | veo | en | {P.the}!", "You | I'll-see | at | {P.the}!", "See you at {P.the}!")],
    cant_wait_line: [
      t("¡Qué | emoción!", "How | exciting!", "So exciting!"),
      t("¡Ay, | ya | quiero | que | llegue | el | día!", "Oh, | already | I-want | that | it-comes | the | day!", "Oh, I can't wait!"),
    ],
    wait_details: [
      t("¡Espera, | espera! | Todavía | nos falta | ver | los | detalles.", "Wait, | wait! | Still | we need | to see | the | details.", "Wait, wait! We still need to plan the details!"),
    ],
    will_text_ok: [
      t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"),
      t("¡Va!", "Okay!", "Sounds good!", { flags: { 0: MEX + "va = okay." }, neutral: t("¡Muy | bien!", "Very | good!", "Sounds good!"), spain: t("¡Vale!", "Okay!", "Sounds good!") }),
    ],
    me_too: [t("¡Yo | también!", "Me | too!", "Me too!")],
    yay: [t("¡Qué | bien!", "How | nice!", "Yay!")],
    bbq_invite: [
      t("Oye, | ¿y | estás | libre | el | domingo? | Vamos | a | hacer | una | carne asada | en | mi | casa.",
        "Hey, | and | are you | free | on | Sunday? | We're going | to | do | a | cookout | at | my | house.",
        "Oh, hey, are you free on Sunday? We're having a cookout at my place.",
        { flags: { 4: ON, 10: "carne asada: a Mexican barbecue (grilled beef, tortillas, friends), often on a Sunday." },
          neutral: t("Oye, | ¿y | estás | libre | el | domingo? | Vamos | a | hacer | una | parrillada | en | mi | casa.",
            "Hey, | and | are you | free | on | Sunday? | We're going | to | do | a | cookout | at | my | house.",
            "Oh, hey, are you free on Sunday? We're having a cookout at my place.", { flags: { 4: ON, 10: "parrillada: a cookout (meat on the grill, with friends)." } }), spain: t("Oye, | ¿y | estás | libre | el | domingo? | Vamos | a | hacer | una | barbacoa | en | mi | casa.", "Hey, | and | are you | free | on | Sunday? | We're going | to | do | a | cookout | at | my | house.", "Oh, hey, are you free on Sunday? We're having a cookout at my place.", { flags: { 4: ON, 10: "barbacoa: in Spain, a cookout (meat on the grill, with friends)." } }) }),
    ],
    bbq_yes: [
      t("¡Qué padre! | Luego | te | paso | la | dirección.", "How cool! | Later | (to) you | I-pass | the | address.", "Awesome! I'll send you the address later.",
        { flags: { 0: MEX + "qué padre = how cool." },
          neutral: t("¡Genial! | Luego | te | paso | la | dirección.", "Great! | Later | (to) you | I-pass | the | address.", "Great! I'll send you the address later.") }),
    ],
    bbq_maybe: [t("Bueno, | luego | me | dices.", "Okay, | later | (to) me | you-tell.", "Okay, just let me know.")],
    bbq_no: [t("¡No te preocupes! | Para | la | próxima.", "Don't worry! | For | the | next one.", "No worries! Maybe next time.")],
    bye: [
      t("¡Sale, | nos vemos! | ¡Bye!", "Okay, | see you! | Bye!", "Okay, see you! Bye!", { flags: { 0: MEX + "sale = okay, deal." },
        neutral: t("¡Bueno, | nos vemos! | ¡Chao!", "Okay, | see you! | Bye!", "Okay, see you! Bye!"), spain: t("¡Venga, | nos vemos! | ¡Chao!", "Okay, | see you! | Bye!", "Okay, see you! Bye!", { flags: { 0: "Spain: venga = okay then, to wrap up." } }) }),
      t("¡Hablamos! | ¡Cuídate!", "We'll talk! | Take care!", "Talk soon! Take care!"),
      t("¡Bueno, | bye! | ¡Hablamos!", "Okay, | bye! | We'll talk!", "Okay, bye! Talk soon!", { spain: t("¡Venga, | hasta luego! | ¡Hablamos!", "Okay, | see you! | We'll talk!", "Okay, bye! Talk soon!") }),
    ],
  },

  domains: {
    time: () => {
      const out: Time[] = [];
      for (let h = 5; h <= 11; h++) for (const m of [0, 15, 30, 45]) out.push({ h, m });
      return out;
    },
    day: () => Object.keys(DAY_ES).map(dayVal),
    price: () => [35000],
  },

  hints: {
    opening: {
      lt: "Say hello and who's calling",
      items: [
        { id: "open_its", s: t("¡Hola, | Andrea! | Soy | {$name}.", "Hi, | Andrea! | I'm | {$name}.", "Hi, Andrea! It's {$name}."), note: "On the phone, “Soy …” or “Habla …” (it's …)." },
        { id: "s_hello", s: t("¡Hola, | Andrea! | ¿Cómo | estás?", "Hi, | Andrea! | How | are you?", "Hi, Andrea! How are you?") },
        { id: "open_good_time", s: t("¿Puedes | hablar?", "Can you | talk?", "Is this a good time?") },
        { id: "open_minute", s: t("¿Tienes | un | minuto?", "Do you have | a | minute?", "Do you have a minute?") },
      ],
    },
    invite: {
      lt: "Invite her to the concert", slot: "genre", examples: ["jazz", "salsa", "rock"],
      items: [
        { id: "inv_want", s: t("¿Quieres | ir | a | un | concierto | el | viernes?", "Do you want | to go | to | a | concert | on | Friday?", "Do you want to go to a concert on Friday?", { flags: { 5: ON } }) },
        { id: "inv_tickets", s: t("Tengo | dos | boletos | para | un | concierto.", "I-have | two | tickets | for | a | concert.", "I've got two tickets for a concert.",
          { neutral: t("Tengo | dos | entradas | para | un | concierto.", "I-have | two | tickets | for | a | concert.", "I've got two tickets for a concert.") }) },
        { id: "inv_would", s: t("¿Te | gustaría | venir | conmigo?", "(To) you | would it please | to come | with me?", "Would you like to come with me?",
          { flags: { 0: "te gustaría: “would it please you”, the polite way to ask “would you like”." } }) },
        { id: "inv_want", s: t("¿Quieres | ir | a | un | concierto | de | {X} | el | viernes?", "Do you want | to go | to | a | concert | of | {X} | on | Friday?",
          "Do you want to go to a {X} concert on Friday?", { flags: { 7: ON } }) },
        { id: "inv_would", s: t("¿Te | gustaría | ir | conmigo | a | un | concierto | de | {X}?", "(To) you | would it please | to go | with me | to | a | concert | of | {X}?",
          "Would you like to go to a {X} concert with me?") },
        { id: "inv_tickets", s: t("Tengo | dos | boletos | para | un | concierto | de | {X} | el | viernes.", "I-have | two | tickets | for | a | concert | of | {X} | on | Friday.",
          "I've got two tickets for a {X} concert on Friday.", { flags: { 8: ON },
            neutral: t("Tengo | dos | entradas | para | un | concierto | de | {X} | el | viernes.", "I-have | two | tickets | for | a | concert | of | {X} | on | Friday.",
              "I've got two tickets for a {X} concert on Friday.", { flags: { 8: ON } }) }),
          note: "A ticket: boleto in Mexico, entrada for a show in much of Latin America; both are understood." },
        { id: "inv_how_about", s: t("¿Qué tal si | vamos | a | un | concierto | de | {X}?", "How about if | we-go | to | a | concert | of | {X}?", "How about going to a {X} concert?"), register: "casual" },
        { id: "inv_lets", s: t("¿Vamos | a | un | concierto | de | {X} | el | viernes?", "Shall we go | to | a | concert | of | {X} | on | Friday?", "Want to go to a {X} concert on Friday?", { flags: { 6: ON } }), register: "casual" },
        { id: "inv_feel_like", s: t("¿Tienes | ganas | de | ir | a | un | concierto?", "Do you have | desire | of | to go | to | a | concert?", "Do you feel like going to a concert?") },
        { id: "inv_invite", s: t("Te | quiero | invitar | a | un | concierto | de | {X}.", "You | I-want | to invite | to | a | concert | of | {X}.", "I'd like to invite you to a {X} concert.") },
        { id: "inv_wondering", s: t("Quería | ver | si | te | gustaría | venir.", "I-wanted | to see | if | (to) you | it-would-please | to come.", "I was wondering if you'd like to come."),
          register: "polite", note: "A soft, friendly way to invite." },
        { id: "inv_animas", s: t("¿Te animas?", "Are you up for it?", "Are you in?"), register: "casual", note: "Very common among friends: “Are you up for it?”" },
      ],
    },
    free: {
      lt: "Ask if she's free",
      items: [
        { id: "free_q", s: t("¿Estás | libre | el | viernes?", "Are you | free | on | Friday?", "Are you free on Friday?", { flags: { 2: ON } }) },
        { id: "plans_q", s: t("¿Qué | vas | a | hacer | este | fin de semana?", "What | are you going | to | do | this | weekend?", "What are you up to this weekend?"), register: "casual" },
        { id: "plans_q2", s: t("¿Tienes | planes | para | el | viernes?", "Do you have | plans | for | — | Friday?", "Do you have any plans for Friday?", { flags: { 3: "el before a weekday; English needs no word here." } }) },
        { id: "busy_q", s: t("¿Estás | {sm:ocupado|sf:ocupada} | el | viernes?", "Are you | busy | on | Friday?", "Are you busy on Friday?", { flags: { 2: ON } }) },
      ],
    },
    when: {
      lt: "Say when the concert is",
      items: [
        { id: "day_on", s: t("Es | el | viernes.", "It's | on | Friday.", "It's on Friday.", { flags: { 1: ON } }) },
        { id: "day_this", s: t("Este | viernes, | a | las | nueve.", "This | Friday, | at | — | nine.", "This Friday, at nine.", { flags: { 3: "Spanish uses an article before clock times; English has no separate word." } }) },
      ],
    },
    band: {
      lt: "Say who's playing", slot: "genre", examples: ["jazz", "salsa", "trova"],
      items: [
        { id: "band_genre", s: t("Es | un | grupo | de | {X}.", "It's | a | band | of | {X}.", "It's a {X} band.") },
        { id: "band_fav", s: t("¡Mi | grupo | favorito!", "My | band | favorite!", "My favorite band!") },
        { id: "band_concert", s: t("Es | un | concierto | de | {X}.", "It's | a | concert | of | {X}.", "It's a {X} concert.") },
        { id: "band_local", s: t("Un | grupo | de | {X} | de | aquí.", "A | band | of | {X} | from | here.", "A local {X} band.") },
      ],
    },
    start: {
      lt: "Say when it starts",
      items: [
        { id: "start_short", s: t("A | las | nueve.", "At | — | nine.", "At nine.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "start_at", s: t("Empieza | a | las | nueve.", "It-starts | at | — | nine.", "It starts at nine.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "start_doors", s: t("Abren | las | puertas | a | las | ocho.", "They-open | the | doors | at | — | eight.", "The doors open at eight.", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "start_around", s: t("Como | a | las | nueve, | creo.", "Like | at | — | nine, | I-think.", "Around nine, I think.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." }, spain: t("Sobre | las | nueve, | creo.", "Around | — | nine, | I-think.", "Around nine, I think.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) }) },
      ],
    },
    place: {
      lt: "Suggest where to meet", slot: "place", examples: ["kiosco", "taqueria", "malecon"],
      items: [
        { id: "meet_lets", s: t("Nos vemos | en | {X.the}.", "We'll see each other | at | {X.the}.", "Let's meet at {X.the}.") },
        { id: "meet_how_about", s: t("¿Qué tal | en | {X.the}?", "How about | at | {X.the}?", "How about at {X.the}?") },
        { id: "meet_full", s: t("Nos vemos | en | {X.the} | a | las | siete | y media.", "We'll see each other | at | {X.the} | at | — | seven | thirty.", "Let's meet at {X.the} at seven thirty.",
          { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "meet_lets", s: t("Te | veo | afuera | de | {X.the}.", "You | I'll-see | outside | of | {X.the}.", "I'll see you outside {X.the}.", { spain: t("Te | veo | fuera | de | {X.the}.", "You | I'll-see | outside | of | {X.the}.", "I'll see you outside {X.the}.") }), only: (e) => ["cafe", "iglesia"].includes(e.id) },
        { id: "meet_ask", s: t("¿Dónde | nos vemos?", "Where | do we meet?", "Where should we meet?") },
        { id: "pick_up", s: t("¿Paso | por | ti?", "Do I come by | for | you?", "Want me to pick you up?", { spain: t("¿Te | recojo?", "You | do I pick up?", "Want me to pick you up?") }), note: "Mexico: “¿Paso por ti?” = shall I pick you up?" },
      ],
    },
    meettime: {
      lt: "Suggest when to meet",
      items: [
        { id: "start_short", s: t("A | las | siete | y media.", "At | — | seven | thirty.", "At seven thirty.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "time_how_about", s: t("¿Qué tal | a | las | siete | y media?", "How about | at | — | seven | thirty?", "How about seven thirty?", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "time_lets_say", s: t("Digamos | a | las | siete | y media.", "Let's say | at | — | seven | thirty.", "Let's say seven thirty.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } }) },
        { id: "time_ask_you", s: t("¿A | qué | hora | te queda | bien?", "At | what | time | it suits you | well?", "What time works for you?", { spain: t("¿A | qué | hora | te viene | bien?", "At | what | time | it suits you | well?", "What time works for you?") }) },
      ],
    },
    sister: {
      lt: "Say if her sister can come",
      items: [
        { id: "sis_sure", s: t("¡Claro, | no hay problema!", "Sure, | no problem!", "Sure, no problem!") },
        { id: "sis_sorry", s: t("Perdón, | solo | tengo | dos | boletos.", "Sorry, | only | I-have | two | tickets.", "Sorry, I only have two tickets.",
          { neutral: t("Perdón, | solo | tengo | dos | entradas.", "Sorry, | only | I-have | two | tickets.", "Sorry, I only have two tickets.") }) },
        { id: "sis_merrier", s: t("¡Claro! | ¡Entre más, mejor!", "Sure! | The more the merrier!", "Sure! The more the merrier!",
          { neutral: t("¡Claro! | ¡Mientras más, mejor!", "Sure! | The more the merrier!", "Sure! The more the merrier!"), spain: t("¡Claro! | ¡Cuantos más, mejor!", "Sure! | The more the merrier!", "Sure! The more the merrier!") }),
          note: "Mexico: “entre más, mejor”; elsewhere “mientras más, mejor”." },
        { id: "sis_ticket", s: t("¡Claro! | Compro | otro | boleto.", "Sure! | I'll-buy | another | ticket.", "Of course! I'll get another ticket.",
          { neutral: t("¡Claro! | Compro | otra | entrada.", "Sure! | I'll-buy | another | ticket.", "Of course! I'll get another ticket.") }) },
      ],
    },
    pay: {
      lt: "Answer about the ticket money",
      items: [
        { id: "pay_on_me", s: t("¡Yo | invito!", "I | treat (you)!", "It's on me!", { flags: { 1: "invitar: to invite, and also to pay for someone (yo invito = my treat)." } }) },
        { id: "pay_dont_worry", s: t("¡No te preocupes!", "Don't worry!", "Don't worry about it!") },
        { id: "pay_price", s: t("Son | $350.", "It's | 350 pesos.", "It's 350 pesos.", { say: "Son trescientos cincuenta pesos." }) },
        { id: "pay_treat", s: t("Es | mi | regalo.", "It's | my | gift.", "It's my treat.") },
      ],
    },
    reply_invite: {
      lt: "Accept her invitation or say no politely",
      items: [
        { id: "rep_love", s: t("¡Me encantaría!", "I'd love to!", "I'd love to!") },
        { id: "rep_cant", s: t("Perdón, | no puedo. | Estoy | {m:ocupado|f:ocupada}.", "Sorry, | I can't. | I-am | busy.", "Sorry, I can't. I'm busy.") },
        { id: "rep_another", s: t("Será | para | la | próxima.", "It-will-be | for | the | next one.", "Maybe next time.") },
        { id: "rep_count_in", s: t("¡Claro! | ¡Cuenta conmigo!", "Sure! | Count me in!", "Sure! Count me in!"), register: "casual" },
        { id: "rep_plans", s: t("Gracias, | pero | ya | tengo | planes.", "Thanks, | but | already | I-have | plans.", "Thanks, but I already have plans.") },
      ],
    },
    agree: {
      lt: "Agree",
      items: [
        { id: "ag_sounds_good", s: t("¡Me parece | bien!", "It seems to me | good!", "Sounds good!") },
        { id: "ag_perfect", s: t("¡Perfecto!", "Perfect!", "Perfect!") },
        { id: "ag_sure", s: t("¡Claro!", "Sure!", "Sure!") },
        { id: "ag_va", s: t("¡Va!", "Okay!", "Okay!", { neutral: t("¡De acuerdo!", "Okay!", "Okay!") }),
          note: "“¡De acuerdo!” anywhere; in Mexico, among friends, also “¡Va!” or “¡Sale!” (okay, deal)." },
      ],
    },
    confirm: {
      lt: "Confirm the day",
      items: [
        { id: "cf_yes_day", s: t("Sí, | el | viernes.", "Yes, | on | Friday.", "Yes, Friday!", { flags: { 1: ON } }) },
        { id: "day_on", s: t("Es | el | viernes.", "It's | on | Friday.", "It's on Friday.", { flags: { 1: ON } }) },
      ],
    },
    other_day: {
      lt: "Suggest another day",
      items: [
        { id: "od_how_about", s: t("¿Y | el | viernes?", "And | — | Friday?", "How about Friday?", { flags: { 1: "el before a weekday; English needs no word here." } }) },
        { id: "day_on", s: t("Es | el | viernes.", "It's | on | Friday.", "It's on Friday.", { flags: { 1: ON } }) },
      ],
    },
    closing: {
      lt: "End the call",
      items: [
        { id: "close_see_you", s: t("¡Nos vemos | el | viernes!", "See you | on | Friday!", "See you on Friday!", { flags: { 1: ON } }) },
        { id: "close_talk_soon", s: t("¡Hablamos!", "We'll talk!", "Talk soon!"), register: "casual" },
        { id: "close_text", s: t("Luego | te | escribo | los | detalles.", "Later | (to) you | I'll-write | the | details.", "I'll text you the details.") },
        { id: "close_cant_wait", s: t("¡Qué | emoción!", "How | exciting!", "I can't wait!") },
      ],
    },
  },

  merges: {
    // Spain's twins (12 Nov 2026)
    "lo sé": { reason: "grammatical_fusion", split: "lo → it + sé → I know: ya lo sé = I know; English drops the object.", minimal: "Pronoun and verb." },
    "he visto": { reason: "grammatical_fusion", split: "he → have + visto (participle): haber + participle, Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "te viene": { reason: "grammatical_fusion", split: "te → to you + viene → comes: ¿te viene bien? = does it suit you (Spain); English says it as one verb.", minimal: "Pronoun and verb." },
    "cuantos más, mejor": { reason: "lexical_expression", split: "cuantos → how many + más → more + mejor → better is a fixed saying = the more the merrier.", minimal: "The saying." },
    "qué onda": { reason: "lexical_expression", split: "qué → what + onda → wave is false; a Mexican greeting = what's up.", minimal: "Two words." },
    "qué padre": { reason: "lexical_expression", split: "qué → how + padre → father is false; Mexican = how cool.", minimal: "Two words." },
    "creo que sí": { reason: "lexical_expression", split: "creo → I think + que → that + sí → yes reads “I think that yes”; = I think so.", minimal: "Three words." },
    "a lo mejor": { reason: "lexical_expression", split: "a → to + lo → the + mejor → best is false; = maybe.", minimal: "Three words." },
    "estás invitando": { reason: "grammatical_fusion", split: "estás → you are + invitando → inviting: the progressive is one English verb phrase.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious is a literal reading; = really?", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight is a word-for-word reading of I'd love to.", minimal: "Two words." },
    "cuenta conmigo": { reason: "lexical_expression", split: "cuenta → count + conmigo → with me; joining a plan = count me in.", minimal: "Two words." },
    "en vivo": { reason: "lexical_expression", split: "en → in + vivo → alive is false; = live (music).", minimal: "Two words." },
    "se está cortando": { reason: "grammatical_fusion", split: "se → itself + está → is + cortando → cutting misreads a phone line breaking up.", minimal: "Pronoun, auxiliary and verb." },
    "he oído": { reason: "grammatical_fusion", split: "he → I have + oído → heard: the compound tense is one English verb phrase (I've heard).", minimal: "Two words." },
    "nos vemos": { reason: "grammatical_fusion", split: "nos → each other + vemos → we see: the reciprocal verb is one English phrase (we meet / see you).", minimal: "Two words." },
    "nos veamos": { reason: "grammatical_fusion", split: "nos → each other + veamos → we see (subjunctive): the reciprocal verb is one English phrase (we meet).", minimal: "Two words." },
    "lo máximo": { reason: "lexical_expression", split: "lo → the + máximo → maximum is false; eres lo máximo = you're the best.", minimal: "Two words." },
    "te lo": { reason: "grammatical_fusion", split: "Two object pronouns before the verb are glossed together (te lo → it to you).", minimal: "Two words." },
    "carne asada": { reason: "lexical_expression", split: "carne → meat + asada → grilled names the food; in Mexico it is also the party = a cookout.", minimal: "Two words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week reads “end of week”; = weekend.", minimal: "Three words." },
    "qué tal si": { reason: "lexical_expression", split: "qué → what + tal → such + si → if is false; a suggestion = how about.", minimal: "Three words." },
    "te gustaría": { reason: "grammatical_fusion", split: "te → to you + gustaría → would please is a word-for-word reading of would you like.", minimal: "Two words." },
    "te animas": { reason: "lexical_expression", split: "te → yourself + animas → you encourage is false; ¿te animas? = are you up for it?", minimal: "Two words." },
    "te queda": { reason: "grammatical_fusion", split: "te → to you + queda → remains is false; for times = it suits you.", minimal: "Two words." },
    "entre más, mejor": { reason: "lexical_expression", split: "entre → between + más → more + mejor → better loses the saying; = the more the merrier.", minimal: "The whole saying." },
    "mientras más, mejor": { reason: "lexical_expression", split: "mientras → while + más → more + mejor → better loses the saying; = the more the merrier.", minimal: "The whole saying." },
    "no te preocupes": { reason: "grammatical_fusion", split: "no → not + te → yourself + preocupes → you worry: the negative command is one English phrase (don't worry).", minimal: "Three words." },
    "nos falta": { reason: "grammatical_fusion", split: "nos → to us + falta → lacks is a word-for-word reading of we need.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say who's calling", optional: true, when: (c) => c.s.opening === "hello" && !c.s.goalMet, done: (c) => c.s.opening === "hello" && !!c.s.identified },
    { step: "invite", lt: "Invite her to the concert" },
    { lt: "Say which day the concert is", optional: true, when: (c) => !!c.s.dayAsked && !c.s.goalMet, done: (c) => !!c.s.dayAsked && !!c.s.day },
    { step: "start", lt: "Say when it starts" },
    { step: "place", lt: "Agree where to meet" },
    { step: "meet_time", lt: "Agree what time to meet" },
    { lt: "Answer her other questions", optional: true, when: (c) => !!c.s.accepted && hasExtraQs(c) && !c.s.goalMet, done: (c) => !!c.s.accepted && hasExtraQs(c) && extraQsDone(c) },
  ],
  steps: [
    { id: "hello", when: (c) => c.s.opening === "hello", done: (c) => !!c.s.identified,
      ask: (c) => { if (!c.s.helloSaid) { c.s.helloSaid = true; c.say("hello_q"); } else c.say("who_is_this"); },
      expects: ["its_me_ctx", "invite", "tickets", "ask_free", "good_time"],
      suggest: [{ lt: "Say hello and who's calling", hint: "opening" }] },
    { id: "invite", done: (c) => !!c.s.invited,
      ask: (c) => {
        if (c.s.eventSaid && !c.s.askedAsking) { c.s.skipAsk = false; c.s.askedAsking = true; c.say("are_you_asking"); return; }
        if (c.s.skipAsk) { c.s.skipAsk = false; return; }
        c.say(c.s.eventSaid && !c.s.notInvite ? "is_that_invitation" : "so_whats_up");
      },
      expects: ["invite", "tickets", "ask_free", "its_me_ctx", "good_time"],
      suggest: [
        { lt: "Invite Andrea to the concert", hint: "invite", options: "genre" },
        { lt: "Ask if she's free on Friday", hint: "free" },
      ],
      yes: (c) => { if (c.s.eventSaid) accept(c); else { c.say("so_whats_up"); c.s.skipAsk = true; } },
      // "No" to "¿Me estás invitando?": taken as it is, and not asked again at once
      no: (c) => { if (c.s.eventSaid) { c.say("oh_okay"); c.s.notInvite = true; c.s.askedAsking = true; c.s.skipAsk = true; } } },
    { id: "day", when: (c) => !!c.s.accepted && !c.s.day, done: (c) => !!c.s.day,
      ask: (c) => { c.s.dayAsked = true; c.say(c.s.weekend ? "which_day" : "ask_day"); }, expects: ["day_ans"],
      suggest: [{ lt: "Say which day the concert is", hint: "when" }] },
    { id: "band", when: (c) => !!c.s.accepted && c.s.askBand && !c.s.genre && !c.s.fav, done: (c) => !!c.s.bandDone,
      ask: (c) => c.say(again(c, "band") ? "band_again" : "ask_band"), expects: ["band_ans", "band_ctx", "band_forgot"],
      suggest: [{ lt: "Say who's playing", hint: "band", options: "genre" }],
      help: (c) => { c.s.bandDone = true; c.say("mystery"); } },
    { id: "start", when: (c) => !!c.s.accepted, done: (c) => !!c.s.startTime || !!c.s.startDone,
      ask: (c) => c.say("ask_start"), expects: ["starts_at", "time_ans", "start_unknown_ctx"],
      suggest: [{ lt: "Say what time the concert starts", hint: "start" }],
      help: (c) => { c.s.startDone = true; c.say("start_help"); } },
    { id: "place", when: (c) => !!c.s.accepted, done: (c) => !!c.s.place,
      ask: (c) => c.say("ask_place"), expects: ["meet", "meet_not", "place_no_ctx", "ask_where", "meet_unknown", "pickup"],
      suggest: [{ lt: "Suggest where to meet", hint: "place", options: ["kiosco", "taqueria", "malecon", "cafe", "entrada", "iglesia"] }],
      help: (c) => { suggestPlace(c); } },
    { id: "meet_time", when: (c) => !!c.s.accepted && !!c.s.place, done: (c) => !!c.s.meetTime,
      ask: (c) => c.say("ask_meet_time"), expects: ["time_ans", "meet", "ask_when", "time_shift_ctx"],
      suggest: [{ lt: "Suggest a time to meet", hint: "meettime" }],
      help: (c) => { suggestTime(c); } },
    { id: "sister", when: (c) => !!c.s.accepted && c.s.askSister, done: (c) => c.s.sister !== undefined,
      ask: (c) => c.say(again(c, "sister") ? "sister_again" : "ask_sister"), expects: ["sister_yes_ctx", "sister_no_ctx"],
      suggest: [{ lt: "Say if her sister can come", hint: "sister" }],
      yes: (c) => { c.s.sister = true; c.say("sister_yes"); },
      no: (c) => { c.s.sister = false; c.say("sister_no"); } },
    { id: "pay", when: (c) => !!c.s.accepted && c.s.askPay, done: (c) => !!c.s.payDone,
      ask: (c) => c.say(again(c, "pay") ? "pay_again" : "ask_pay"), expects: ["on_me", "price_ctx", "pay_later_ctx", "pay_free_ctx"],
      suggest: [{ lt: "Say it's your treat, or what the ticket cost", hint: "pay" }],
      help: (c) => { c.s.payDone = true; c.say("on_me"); } },
    { id: "bbq", when: (c) => !!c.s.accepted && c.s.bbq && c.s.day !== "sunday", done: (c) => !!c.s.bbqDone,
      ask: (c) => { c.twist("bbq"); c.say(again(c, "bbq") ? "bbq_again" : "bbq_invite"); }, expects: ["decline_ctx", "cant_wait", "accept_inv"],
      suggest: [{ lt: "Accept her invitation or say no politely", hint: "reply_invite" }],
      yes: (c) => { c.s.bbqDone = "yes"; c.say("bbq_yes"); },
      no: (c) => { c.s.bbqDone = "no"; c.say("bbq_no"); } },
  ],

  init: (c) => {
    c.s.opening = c.pick(["hello", "hello", "howareyou", "howareyou", "whatsup"]);
    c.s.askBand = c.chance(0.5);
    c.s.askSister = c.chance(0.55);
    c.s.askPay = c.chance(0.4);
    c.s.badLine = c.visits >= 1 && c.chance(0.3);
    c.s.meetChange = c.visits >= 2 && c.chance(0.4);
    c.s.timeChange = c.visits >= 1 && c.chance(0.3);
    c.s.bbq = c.visits >= 1 && c.chance(0.35);
  },

  start: (c) => {
    if (c.s.opening === "howareyou") {
      c.s.identified = true; c.s.greeted = true;
      c.say("hey_howareyou");
      howAreYou(c);
      return;
    }
    if (c.s.opening === "whatsup") {
      c.s.identified = true; c.s.greeted = true; c.s.skipAsk = true;
      c.say("hey_whatsup");
    }
    // "hello": the hello step answers the phone.
  },

  handlers: H,

  finish: (c) => {
    win(c);
    const tm = c.s.meetTime as Time | undefined;
    const day = c.s.day || "friday";
    if (tm && inDomain(tm)) c.say("summary", { day: dayVal(day), time: tm });
    else c.say("summary_notime", { day: dayVal(day) });
    c.say("summary_place", { P: c.s.place });
    c.say("cant_wait_line");
    const bye = (cc: Ctx) => sayBye(cc);
    // The plan is made: any friendly answer ends the call.
    const on: Record<string, (cc: Ctx, sl: any, sg: any) => void> = {};
    for (const k of Object.keys(inviteCall.intents)) if (!k.endsWith("_ctx")) on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_hello", "g_sorry", "g_howareyou_answer"]) on[k] = bye;
    Object.assign(on, {
      voc: bye, // "¡Bye, Andrea!" / "¡Gracias, Andrea!" end the call
      pickup: (cc: Ctx) => { if (once(cc, "pickup")) cc.say("pickup"); },
      will_text: (cc: Ctx) => { if (once(cc, "text")) cc.say("will_text_ok"); bye(cc); },
      cant_wait: (cc: Ctx) => { if (once(cc, "me_too")) cc.say("me_too"); bye(cc); },
      // "¡Perfecto!" alone ends the call; "Perfecto, nos vemos. ¡Bye!" lets the other parts answer first.
      g_ok: (cc: Ctx) => { if (!/\b(escribo|mensaje|bye|chao|adios|nos vemos|hablamos|gracias|luego|emocion)\b/.test(plain(cc.heard))) bye(cc); },
    });
    c.expect({
      id: "closing", expects: ["cant_wait", "will_text", "bye_ext"], hints: ["closing", "g_social"], suggest: [{ lt: "End the call", hint: "closing" }],
      on, yes: bye, no: bye,
    });
  },

  tests: [
    // every hint construction
    { say: "¡Hola, Andrea! Soy Ryan.", intent: "its_me_ctx", step: "hello" },
    { say: "¿Puedes hablar?", intent: "good_time" },
    { say: "¿Tienes un minuto?", intent: "good_time" },
    { say: "¿Quieres ir a un concierto el viernes?", intent: "invite", slots: { day: "friday" } },
    { say: "Tengo dos boletos para un concierto.", intent: "tickets" },
    { say: "¿Te gustaría venir conmigo?", intent: "invite" },
    { say: "¿Quieres ir a un concierto de jazz el viernes?", intent: "invite", slots: { genre: "jazz", day: "friday" } },
    { say: "¿Te gustaría ir conmigo a un concierto de salsa?", intent: "invite", slots: { genre: "salsa" } },
    { say: "Tengo dos boletos para un concierto de rock el viernes.", intent: "tickets", slots: { genre: "rock", day: "friday" } },
    { say: "¿Qué tal si vamos a un concierto de cumbia?", intent: "invite", slots: { genre: "cumbia" } },
    { say: "¿Vamos a un concierto de reggae el viernes?", intent: "invite", slots: { genre: "reggae" } },
    { say: "¿Tienes ganas de ir a un concierto?", intent: "invite" },
    { say: "Te quiero invitar a un concierto de trova.", intent: "invite", slots: { genre: "trova" } },
    { say: "Quería ver si te gustaría venir.", intent: "invite" },
    { say: "¿Te animas?", intent: "invite" },
    { say: "¿Estás libre el viernes?", intent: "ask_free", slots: { day: "friday" } },
    { say: "¿Qué vas a hacer este fin de semana?", intent: "ask_free" },
    { say: "¿Tienes planes para el viernes?", intent: "ask_free", slots: { day: "friday" } },
    { say: "¿Estás ocupada el viernes?", intent: "ask_free" },
    { say: "Es el viernes.", intent: "day_ans", step: "day", slots: { day: "friday" } },
    { say: "Este viernes, a las nueve.", intent: "day_ans", step: "day" },
    { say: "Es un grupo de jazz.", intent: "band_ans", step: "band", slots: { genre: "jazz" } },
    { say: "¡Mi grupo favorito!", intent: "band_ans", step: "band" },
    { say: "Es un concierto de salsa.", intent: "band_ans", step: "band", slots: { genre: "salsa" } },
    { say: "Un grupo de trova de aquí.", intent: "band_ans", step: "band", slots: { genre: "trova" } },
    { say: "A las nueve.", intent: "time_ans", step: "start" },
    { say: "Empieza a las nueve.", intent: "starts_at", step: "start" },
    { say: "Abren las puertas a las ocho.", intent: "starts_at", step: "start" },
    { say: "Como a las nueve, creo.", intent: "time_ans", step: "start" },
    { say: "Nos vemos en el kiosco.", intent: "meet", step: "place", slots: { place: "kiosco" } },
    { say: "¿Qué tal en la taquería?", intent: "meet", step: "place", slots: { place: "taqueria" } },
    { say: "Nos vemos en el malecón a las siete y media.", intent: "meet", step: "place", slots: { place: "malecon", time: { h: 7, m: 30 } } },
    { say: "Te veo afuera de la iglesia.", intent: "meet", step: "place", slots: { place: "iglesia" } },
    { say: "¿Dónde nos vemos?", intent: "ask_where", step: "place" },
    { say: "¿Paso por ti?", intent: "pickup", step: "place" },
    { say: "A las siete y media.", intent: "time_ans", step: "meet_time" },
    { say: "¿Qué tal a las siete y media?", intent: "time_ans", step: "meet_time" },
    { say: "Digamos a las siete y media.", intent: "time_ans", step: "meet_time" },
    { say: "¿A qué hora te queda bien?", intent: "ask_when", step: "meet_time" },
    { say: "¡Claro, no hay problema!", intent: "sister_yes_ctx", step: "sister" },
    { say: "Perdón, solo tengo dos boletos.", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "¡Claro! ¡Entre más, mejor!", intent: "sister_yes_ctx", step: "sister" },
    { say: "¡Claro! Compro otro boleto.", intent: "sister_yes_ctx", step: "sister" },
    { say: "¡Yo invito!", intent: "on_me", step: "pay" },
    { say: "¡No te preocupes!", intent: "on_me", step: "pay" },
    { say: "Son 350 pesos.", intent: "price_ctx", step: "pay", slots: { price: 35000 } },
    { say: "Es mi regalo.", intent: "on_me", step: "pay" },
    { say: "¡Me encantaría!", intent: "accept_inv", step: "bbq" },
    { say: "Perdón, no puedo. Estoy ocupado.", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "Será para la próxima.", intent: "decline_ctx", step: "bbq" },
    { say: "¡Claro! ¡Cuenta conmigo!", intent: "accept_inv", step: "bbq" },
    { say: "Gracias, pero ya tengo planes.", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "Sí, el viernes.", intent: "day_ans", step: "day" },
    { say: "¿Y el viernes?", intent: "day_ans", slots: { day: "friday" } },
    { say: "¡Nos vemos el viernes!", intent: "bye_ext" },
    { say: "¡Hablamos!", intent: "bye_ext" },
    { say: "Luego te escribo los detalles.", intent: "will_text" },
    { say: "¡Qué emoción!", intent: "cant_wait" },
    // natural alternatives, short answers, no accents, usted to a friend
    { say: "Habla Ryan", intent: "its_me_ctx", step: "hello" },
    { say: "¿Hablo con Andrea?", intent: "voc" },
    { say: "¿Me escuchas?", intent: "hear_me" },
    { say: "Quieres venir conmigo a un concierto", intent: "invite" },
    { say: "¿Quieres venir conmigo al concierto?", intent: "invite" },
    { say: "Te invito al concierto el viernes", intent: "invite", slots: { day: "friday" } },
    { say: "Tengo dos boletos, ¿quieres venir?", intent: "invite" },
    { say: "¿Le gustaría venir conmigo?", intent: "invite" },
    { say: "¿Te late ir a un concierto?", intent: "invite" },
    { say: "Compré dos entradas para un concierto de salsa", intent: "tickets", slots: { genre: "salsa" } },
    { say: "Mi grupo favorito toca el viernes", intent: "tickets", slots: { day: "friday" } },
    { say: "¿Te gusta el jazz?", intent: "ask_like", slots: { genre: "jazz" } },
    { say: "viernes", intent: "day_ans", step: "day" },
    { say: "Rock", intent: "band_ans", step: "band", slots: { genre: "rock" } },
    { say: "Se llaman Los Colibríes", intent: "band_ctx", step: "band" },
    { say: "No me acuerdo del nombre", intent: "band_forgot", step: "band" },
    { say: "Empieza a las nueve de la noche", intent: "starts_at", step: "start" },
    { say: "Mejor en el kiosco", intent: "meet", step: "place", slots: { place: "kiosco" } },
    { say: "Media hora antes", intent: "time_ans", step: "meet_time" },
    { say: "Cuarto para las ocho", intent: "time_ans", step: "meet_time", slots: { time: { h: 7, m: 45 } } },
    { say: "Te recojo en tu casa", intent: "pickup", step: "place" },
    { say: "Donde tú quieras", intent: "ask_where", step: "place" },
    { say: "Sí, que venga", intent: "sister_yes_ctx", step: "sister" },
    { say: "Me los regalaron", intent: "on_me", step: "pay" },
    { say: "¿Llevo algo?", intent: "accept_inv", step: "bbq" },
    { say: "Va a estar padrísimo", intent: "cant_wait" },
    // Spain forms are correct answers
    { say: "¿Te apetece venir conmigo al concierto?", intent: "invite" },
    { say: "¿Quedamos en la entrada?", intent: "meet", step: "place", slots: { place: "entrada" } },
    { say: "Cuantos más, mejor", intent: "sister_yes_ctx", step: "sister" },
    { say: "Invito yo", intent: "on_me", step: "pay" },
    { say: "Vale, nos vemos en el kiosco", intent: "meet", step: "place", slots: { place: "kiosco" } },
    { say: "¿Me acompañas al concierto?", intent: "invite" },
    // meaning safety
    { say: "No quiero ir al concierto", intent: "none", not: ["invite", "tickets"] },
    { say: "No me gustaría ir al concierto", intent: "none", not: ["invite"] },
    { say: "No me gustaría ir al concierto contigo", intent: "none", not: ["invite"] },
    { say: "No tengo boletos", intent: "none", not: ["tickets", "invite"] },
    { say: "No puedo ir el viernes", intent: "none", not: ["invite", "accept_inv"] },
    { say: "No me gusta el jazz", intent: "none", not: ["ask_like"] },
    { say: "No tengo otro boleto para ella", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "Ella no puede venir, perdón", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "Me encantaría, pero no puedo", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "No tengo tiempo el domingo", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "El domingo trabajo", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "No tengo planes el domingo", intent: "accept_inv", step: "bbq", not: ["decline_ctx"] },
    { say: "No estoy ocupada el domingo", intent: "accept_inv", step: "bbq", not: ["decline_ctx"] },
    { say: "No es gratis", intent: "none", step: "pay", not: ["on_me"] },
    { say: "No paso por ti", intent: "none", step: "place", not: ["pickup"] },
    { say: "No a las ocho, a las siete y media", intent: "time_ans", step: "meet_time" },
    { say: "En el kiosco no, en el malecón", intent: "meet", step: "place" },
    { say: "Se está cortando, ¿me escuchas?", intent: "hear_me" },
    { say: "No en el kiosco", intent: "meet_not", step: "place", not: ["meet"] },
    { say: "No es rock, es salsa", intent: "band_ans", step: "band" },
    { say: "No sé a qué hora empieza", intent: "start_unknown_ctx", step: "start", not: ["starts_at", "time_ans"] },
    { say: "No sé si puedo", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    // review: refusals, corrections and new phrasings
    { say: "A las ocho no puedo", intent: "time_shift_ctx", step: "meet_time", not: ["time_ans", "agree"] },
    { say: "No puedo a las ocho", intent: "time_shift_ctx", step: "meet_time", not: ["time_ans", "agree"] },
    { say: "No me gusta el kiosco", intent: "meet_not", step: "place", not: ["meet"] },
    { say: "Me sobra una entrada para el viernes, ¿te animas?", intent: "invite" },
    { say: "Me sobran dos boletos", intent: "tickets" },
    { say: "Si quieres paso por ti a tu casa", intent: "pickup", step: "place" },
    { say: "Mejor enfrente del mercado", intent: "meet", step: "place", slots: { place: "mercado" } },
    { say: "¡Qué padre! Sí voy", intent: "accept_inv", step: "bbq" },
    { say: "No quiero ir contigo", intent: "none", not: ["invite"] },
    { say: "No quiero venir contigo al concierto", intent: "none", not: ["invite"] },
    { say: "No nos vemos en el malecón", intent: "meet_not", step: "place", not: ["meet"] },
    // audit (5 Nov 2026): the town's taquería, the neutral words, refusals and side answers
    { say: "Nos vemos en la taquería del mercado", intent: "meet", step: "place", slots: { place: "taqueria" } },
    { say: "Mejor en la taquería junto al mercado", intent: "meet", step: "place", slots: { place: "taqueria" } },
    { say: "Nos vemos en el mercado", intent: "meet", step: "place", slots: { place: "mercado" } },
    { say: "Porque tengo dos boletos para un concierto", intent: "tickets" },
    { say: "Para invitarte a un concierto", intent: "invite" },
    { say: "Tengo dos entradas para un concierto de jazz el viernes", intent: "tickets", slots: { genre: "jazz", day: "friday" } },
    { say: "Tengo dos boletos gratis para un concierto", intent: "tickets" },
    { say: "Perdón, solo tengo dos entradas", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "¡Claro! Compro otra entrada", intent: "sister_yes_ctx", step: "sister" },
    { say: "¡Claro! ¡Mientras más, mejor!", intent: "sister_yes_ctx", step: "sister" },
    { say: "No, mejor solo tú y yo", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "¡De acuerdo!", intent: "yn:yes", step: "bbq" },
    { say: "Son $350.", intent: "price_ctx", step: "pay", slots: { price: 35000 } },
    { say: "Fueron setecientos por los dos", intent: "price_ctx", step: "pay", slots: { price: 70000 } },
    { say: "Luego te digo", intent: "pay_later_ctx", step: "pay", not: ["on_me"] },
    { say: "Nada", intent: "pay_free_ctx", step: "pay" },
    { say: "Mejor otro día", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "No puedo, perdón", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "No quiero ir a la parrillada", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "Mejor en otro lugar", intent: "place_no_ctx", step: "place", not: ["meet", "meet_unknown"] },
    { say: "No me gusta el malecón", intent: "meet_not", step: "place", not: ["meet"] },
    { say: "A esa hora no puedo", intent: "time_shift_ctx", step: "meet_time", not: ["time_ans", "agree"] },
    { say: "No me da tiempo", intent: "time_shift_ctx", step: "meet_time", not: ["time_ans", "agree"] },
    // must not be understood
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "La bicicleta del vecino es verde", intent: "none" },
    { say: "Soy Ryan", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: [
      "¡Hola, Andrea! Soy Ryan.", "Bien, gracias, ¿y tú?", "Tengo dos boletos para un concierto de jazz el viernes. ¿Quieres venir?",
      "A las nueve.", "Nos vemos en el kiosco.", "A las siete y media.", "Luego te escribo. ¡Bye!",
    ], expect: { complete: true, state: { place: "kiosco", day: "friday" } }, auto: AUTO_HELLO },
    { name: "questions first, short answers", turns: [
      "¡Hola, Andrea!", "¿Estás libre el viernes?", "Tengo dos boletos para un concierto. ¿Te animas?", "Abren las puertas a las ocho.",
      "¿Dónde nos vemos?", "Sí, perfecto.", "¿A qué hora te queda bien?", "Me parece bien.", "¡Nos vemos el viernes!",
    ], setup: (s) => { s.timeChange = false; }, expect: { complete: true, state: { place: "kiosco", meetTime: { h: 7, m: 30 } } }, auto: AUTO },
    { name: "Saturday first, then Friday", turns: [
      "¡Hola, Andrea! ¿Estás libre el sábado?", "Ah, ok. ¿Y el viernes?", "Tengo boletos para un concierto de rock. ¿Te gustaría venir conmigo?",
      "Empieza a las nueve.", "Nos vemos enfrente de la iglesia a las ocho.", "¡Hablamos!",
    ], expect: { complete: true, state: { place: "iglesia", day: "friday" } }, auto: AUTO },
    { name: "details in one breath", turns: [
      "¡Hola, Andrea! Soy Ryan. ¿Tienes un minuto?", "¿Te gustaría ir a un concierto de salsa conmigo el viernes a las nueve?",
      "Nos vemos en la taquería a las ocho.", "¡Qué emoción! ¡Bye!",
    ], expect: { complete: true, state: { place: "taqueria", meetTime: { h: 8, m: 0 } } }, auto: AUTO },
    { name: "goodbye too early, then another day", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto conmigo el sábado?", "¡Va, nos vemos!", "¿Y el viernes?", "A las nueve.",
      "Nos vemos en el kiosco.", "A las siete y media.", "¡Bye!",
    ], expect: { complete: true, state: { day: "friday" } }, auto: AUTO },
    { name: "free question and tickets in one breath", turns: [
      "¡Hola, Andrea!", "¿Estás libre el viernes? Tengo dos boletos para un concierto de jazz.", "¡Sí!", "A las nueve.", "Nos vemos en el kiosco.", "A las siete y media.", "¡Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "invitation without a day", turns: [
      "¡Hola, Andrea! Soy Ryan.", "Bien, gracias, ¿y tú?", "¿Quieres venir conmigo a un concierto?", "El viernes.", "A las nueve.",
      "Nos vemos en el malecón.", "A las ocho.", "¡Bye!",
    ], expect: { complete: true, state: { place: "malecon", day: "friday" } }, auto: AUTO_HELLO },
    { name: "short answers: pick-up offer, her suggestions, sister and money (forced)", turns: [
      "¡Hola!", "¿Vamos a un concierto el viernes?", "Jazz.", "A las nueve.", "¿Paso por ti?", "Va.", "¿A qué hora nos vemos?", "Va.",
      "Claro, entre más, mejor.", "Yo invito.", "¡Bye!",
    ], setup: (s) => { s.askBand = true; s.askSister = true; s.askPay = true; s.bbq = false; s.badLine = false; s.meetChange = false; s.timeChange = false; },
    expect: { complete: true, state: { place: "kiosco", meetTime: { h: 8, m: 0 }, sister: true, payDone: true, genre: "jazz" } }, auto: AUTO },
    { name: "a change of mind about the place and the time, the ticket price", turns: [
      "¡Hola, Andrea! ¿Qué onda?", "Bien. Oye, ¿te apetece venir conmigo a un concierto de cumbia el viernes?", "Empieza a las nueve.",
      "Quedamos en la entrada.", "No, mejor en el café.", "A las ocho.", "No a las ocho, a las siete y media.", "Perdón, solo tengo dos boletos.", "Son 350 pesos.", "¡Hablamos!",
    ], setup: (s) => { s.askSister = true; s.askPay = true; s.bbq = false; s.badLine = false; s.meetChange = false; s.timeChange = false; },
    expect: { complete: true, state: { place: "cafe", meetTime: { h: 7, m: 30 }, sister: false } }, auto: AUTO },
    { name: "the line breaks up (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "Sí, el viernes.", "A las nueve.", "Nos vemos en el café.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.badLine = true; s.bbq = false; s.meetChange = false; s.timeChange = false; }, expect: { complete: true, state: { badLineDone: true, day: "friday" } }, auto: AUTO },
    { name: "the bandstand is crowded: the taco place (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "Sí, claro.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.meetChange = true; s.bbq = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "taqueria", meetChangeDone: true } }, auto: AUTO },
    { name: "the bandstand is crowded, but the learner keeps it (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "No, mejor en el kiosco.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.meetChange = true; s.bbq = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "kiosco", meetChangeDone: true } }, auto: AUTO },
    { name: "she gets off work late: eight (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "Empieza a las nueve.", "Nos vemos en el malecón.", "A las siete y media.", "Sí, a las ocho está bien.", "¡Bye!",
    ], setup: (s) => { s.timeChange = true; s.meetChange = false; s.bbq = false; s.badLine = false; }, expect: { complete: true, state: { meetTime: { h: 8, m: 0 }, timeChangeDone: true } }, auto: AUTO },
    { name: "she gets off work late, the learner keeps 7:30 (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "Empieza a las nueve.", "Nos vemos en el malecón a las siete y media.", "No, mejor a las siete y media.", "¡Bye!",
    ], setup: (s) => { s.timeChange = true; s.meetChange = false; s.bbq = false; s.badLine = false; }, expect: { complete: true, state: { meetTime: { h: 7, m: 30 }, timeChangeDone: true } }, auto: AUTO },
    { name: "her Sunday carne asada, accepted (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "¡Me encantaría! ¿Llevo algo?", "¡Bye!",
    ], setup: (s) => { s.askSister = false; s.askPay = false; s.bbq = true; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { bbqDone: "yes" } }, auto: AUTO },
    { name: "the start time unknown, her carne asada a maybe (twist forced)", turns: [
      "Hola, Andrea", "Te invito a un concierto el viernes", "No sé a qué hora empieza", "Nos vemos en el kiosco a las ocho", "No sé si puedo", "Bye",
    ], setup: (s) => { s.askBand = false; s.askSister = false; s.askPay = false; s.bbq = true; s.meetChange = false; s.badLine = false; s.timeChange = false; },
    expect: { complete: true, state: { bbqDone: "maybe", startDone: true } }, auto: AUTO },
    { name: "review: 'No me acuerdo' about the price, her time refused", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "¿A qué hora nos vemos?",
      "A las ocho no puedo.", "A las siete y media.", "No me acuerdo.", "¡Bye!",
    ], setup: (s) => { s.askBand = false; s.askSister = false; s.askPay = true; s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; },
    expect: { complete: true, state: { meetTime: { h: 7, m: 30 }, payDone: true, place: "kiosco" } }, auto: AUTO_NOPAY },
    { name: "review: 'No, en el café' with nothing suggested (comma lost)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "No, en el café.", "Sí.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "cafe" } }, auto: AUTO },
    { name: "review: where the taco place is, then yes (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "¿Dónde queda la taquería?", "Va.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.meetChange = true; s.bbq = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "taqueria" } }, auto: AUTO },
    { name: "review: her carne asada, a time question first (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "¿A qué hora es?", "No sé si puedo.", "¡Bye!",
    ], setup: (s) => { s.askSister = false; s.askPay = false; s.bbq = true; s.meetChange = false; s.badLine = false; s.timeChange = false; },
    expect: { complete: true, state: { bbqDone: "maybe" } }, auto: AUTO },
    { name: "her Sunday carne asada, declined (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "Me encantaría, pero no puedo.", "¡Bye!",
    ], setup: (s) => { s.askSister = false; s.askPay = false; s.bbq = true; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { bbqDone: "no" } }, auto: AUTO },
    // audit (5 Nov 2026)
    { name: "audit: which taquería, then her words echoed: the taquería del mercado (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "¿Cuál taquería?", "Va, en la taquería del mercado.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.meetChange = true; s.bbq = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "taqueria", meetChangeDone: true } }, auto: AUTO },
    { name: "audit: 'No, en el malecón' to '¿Entonces en el café?'", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "No, en el café.", "No, en el malecón.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "malecon" } }, auto: AUTO },
    { name: "audit: somewhere else at her suggestion, her time refused", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "¿Dónde nos vemos?", "¿Y en otro lado?", "En el malecón.", "¿A qué hora nos vemos?",
      "A esa hora no puedo.", "A las siete y media.", "¡Bye!",
    ], setup: (s) => { s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { place: "malecon", meetTime: { h: 7, m: 30 } } }, auto: AUTO },
    { name: "audit: she gets off work late, the learner keeps seven: she'll leave early (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "Empieza a las nueve.", "Nos vemos en el malecón a las siete.", "No, mejor a las siete.", "¡Bye!",
    ], setup: (s) => { s.timeChange = true; s.meetChange = false; s.bbq = false; s.badLine = false; }, expect: { complete: true, state: { meetTime: { h: 7, m: 0 }, timeChangeDone: true } }, auto: AUTO },
    { name: "audit: 'Más tarde' to her eight: half past (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "Empieza a las nueve.", "Nos vemos en el malecón.", "A las siete.", "Más tarde.", "Sí.", "¡Bye!",
    ], setup: (s) => { s.timeChange = true; s.meetChange = false; s.bbq = false; s.badLine = false; }, expect: { complete: true, state: { meetTime: { h: 8, m: 30 }, timeChangeDone: true } }, auto: AUTO },
    { name: "audit: her carne asada, 'Mejor otro día' (twist forced)", turns: [
      "¡Hola, Andrea!", "¿Quieres ir a un concierto el viernes?", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "Mejor otro día.", "¡Bye!",
    ], setup: (s) => { s.askSister = false; s.askPay = false; s.bbq = true; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { bbqDone: "no" } }, auto: AUTO },
    { name: "audit: Saturday twice, a yes without a day, then Friday", turns: [
      "¡Hola, Andrea!", "¿Te gustaría ir a un concierto conmigo el sábado?", "Es el sábado.", "Bueno, ok.", "¡Ah, perdón! El viernes.", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { day: "friday", place: "kiosco" } }, auto: AUTO },
    { name: "audit: 'Porque tengo dos boletos' to her '¿Por qué?'", turns: [
      "¡Hola, Andrea!", "¿Estás libre el viernes?", "Porque tengo dos boletos para un concierto.", "¡Sí!", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { day: "friday", accepted: true } }, auto: AUTO },
    { name: "audit: free tickets, so no money question (forced)", turns: [
      "¡Hola, Andrea!", "Me regalaron dos boletos para un concierto el viernes, ¿quieres venir?", "A las nueve.", "Nos vemos en el kiosco.", "A las ocho.", "¡Bye!",
    ], setup: (s) => { s.askPay = true; s.bbq = false; s.meetChange = false; s.badLine = false; s.timeChange = false; }, expect: { complete: true, state: { askPay: false } }, auto: AUTO },
  ],
};

export default inviteCall;
