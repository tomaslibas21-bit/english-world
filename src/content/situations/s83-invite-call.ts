// Song 83 "Are You Free on Friday?": a phone call in which the LEARNER invites a friend.
// The learner has two tickets for a concert on Friday and calls Lizzie (informal, "tu").
// The learner leads: says who is calling, invites her, answers her questions (when it starts,
// where and when to meet, her sister, the ticket money) and closes the call.
// Lizzie follows: she never asks for what she already knows, answers side questions,
// says she is busy on Saturday, and on later visits may mishear, move the meeting place
// or invite the learner back (accept or decline politely).

import type { Ctx, EntityDef, Handler, Segment, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Entities

const GENRES: EntityDef[] = [
  ent("jazz", "jazz", "džiazas/džiazo/džiazui/džiazą/džiazu/džiaze", "m", { chip: "džiazo" }),
  ent("rock", "rock", "rokas/roko/rokui/roką/roku/roke", "m", { forms: ["rock and roll", "rock n roll"], chip: "roko" }),
  ent("pop", "pop", "popmuzika/popmuzikos/popmuzikai/popmuziką/popmuzika/popmuzikoje", "f", { forms: ["pop music"], chip: "popmuzikos" }),
  ent("country", "country", "kantri muzika/kantri muzikos/kantri muzikai/kantri muziką/kantri muzika/kantri muzikoje", "f", { forms: ["country music"], chip: "kantri" }),
  ent("blues", "blues", "bliuzas/bliuzo/bliuzui/bliuzą/bliuzu/bliuze", "m", { chip: "bliuzo" }),
  ent("classical", "classical", "klasikinė muzika/klasikinės muzikos/klasikinei muzikai/klasikinę muziką/klasikine muzika/klasikinėje muzikoje", "f",
    { forms: ["classical music", "classic"], chip: "klasikinės muzikos" }),
  ent("folk", "folk", "folkas/folko/folkui/folką/folku/folke", "m", { forms: ["folk music"], chip: "folko" }),
  ent("hiphop", "hip-hop", "hiphopas/hiphopo/hiphopui/hiphopą/hiphopu/hiphope", "m", { forms: ["hip hop", "hiphop", "rap"], chip: "hiphopo" }),
];

const PLACES: EntityDef[] = [
  ent("station", "station", "stotis/stoties/stočiai/stotį/stotimi/stotyje", "f",
    { forms: ["train station", "union station", "the train station", "station entrance"], chip: "prie stoties" }),
  ent("cafe", "café", "kavinė/kavinės/kavinei/kavinę/kavine/kavinėje", "f",
    { forms: ["cafe", "sunny cup", "sunny cup cafe", "coffee shop"], chip: "prie kavinės" }),
  ent("entrance", "entrance", "įėjimas/įėjimo/įėjimui/įėjimą/įėjimu/įėjime", "m",
    { forms: ["main entrance", "front door", "door", "doors", "box office", "venue", "concert hall", "club", "main door", "concert", "the concert"], chip: "prie įėjimo" }),
  ent("bus_stop", "bus | stop", "autobusų | stotelė/stotelės/stotelei/stotelę/stotele/stotelėje", "f",
    { forms: ["bus stop", "the bus stop"], chip: "prie autobusų stotelės" }),
];

// Days, for Lizzie's summary ("So, Friday, 7:30, at the station"). Not a grammar slot:
// the built-in {day} slot reads the learner's words.
const WDAYS: EntityDef[] = [
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m"),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m"),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m"),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m"),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m"),
  ent("sunday", "Sunday", "sekmadienis/sekmadienio/sekmadieniui/sekmadienį/sekmadieniu/sekmadienyje", "m"),
  ent("tonight", "tonight", "šįvakar", "m"),
  ent("tomorrow", "tomorrow", "rytoj", "m"),
];
const DAY_IDS = new Set(WDAYS.map((d) => d.id));

// ---------------------------------------------------------------------------
// Helpers

type Time = { h: number; m: number };
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const norm = (t: any): Time | null => {
  if (!t || typeof t.h !== "number") return null;
  let h = t.h % 12; if (h === 0) h = 12;
  return { h, m: t.m ?? 0 };
};
const inDomain = (t: Time | null) => !!t && t.h >= 5 && t.h <= 11 && t.m % 15 === 0;
/** One learner turn can split into several segments of the same kind ("Don't worry about it, it's on me"):
 *  react only once per turn. */
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 20) seen.shift();
  return true;
}

/** The goal is reached. Optional checklist items still open at this moment leave the list
 *  (their `when` checks goalMet), so a completed conversation never shows an unticked item. */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }

/** Read what the learner said about the event: genre, favourite band, day, time. */
function readEvent(c: Ctx, slots: any, seg: Segment) {
  if (slots.genre) c.s.genre = toArr(slots.genre)[0];
  if (seg.tags.includes("fav")) c.s.fav = true;
  const day = toArr(slots.day)[0] as string | undefined;
  if (day) setDay(c, day);
  if (seg.tags.includes("weekend")) c.s.weekend = true;
  const tm = norm(toArr(slots.time)[0]);
  if (tm) c.s.startTime = tm;
}
function setDay(c: Ctx, day: string) {
  if (day === "saturday") { c.s.sat = true; return; }
  if (day === "today") day = "tonight";
  if (DAY_IDS.has(day)) { c.s.day = day; c.s.sat = false; }
  else c.s.weekend = true; // this weekend, next week …
}

/** "Oh my gosh, I'd love to!" */
function accept(c: Ctx) {
  c.s.invited = true; c.s.accepted = true; c.s.identified = true;
  c.say("accept");
  if (c.s.genre) c.say("love_genre", { G: c.s.genre });
  else if (c.s.fav) c.say("fav_band");
}

/** Lizzie's own "How are you?" with the answer and "And you?", plus anything else the learner starts with. */
function howAreYou(c: Ctx) {
  const reply = (cc: Ctx, bad = false) => {
    if (bad) cc.say("g_sorry_to_hear");
    else if (/\b(you|yourself)\b/i.test(cc.heard || "")) cc.say("g_asked_back");
    else cc.say("g_glad");
  };
  c.expect({
    id: "howareyou",
    expects: ["g_howareyou_answer", "g_howareyou_bad", "its_me_ctx"],
    hints: ["g_howareyou", "opening"],
    suggest: [{ lt: "Atsakyti, kaip sekasi (ir paklausti atgal)", hint: "g_howareyou" }, { lt: "Iškart pakviesti į koncertą", hint: "invite", options: "genre" }],
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

/** Where and when: Lizzie suggests, the learner agrees (or not). */
/** Pending questions: "Yeah, of course" / "Perfect!" count as yes, "No, sorry" as no. */
function yn(p: import("../types").Pending): import("../types").Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}

function suggestPlace(c: Ctx) {
  c.say("suggest_place");
  c.expect(yn({
    id: "suggest_place", expects: ["meet"], hints: ["agree", "place"],
    suggest: [{ lt: "Sutikti", hint: "agree" }, { lt: "Pasiūlyti kitą vietą", hint: "place", options: ["station", "cafe", "entrance", "bus_stop"] }],
    yes: (cc) => { cc.s.place = "station"; cc.say("ack_place"); },
    no: (cc) => { cc.say("where_then"); cc.ask("place"); },
    ask: (cc) => cc.say("suggest_place"),
    on: { meet: (cc, sl, sg) => { H.meet(cc, sl, sg); }, g_ok: (cc) => { cc.s.place = "station"; cc.say("ack_place"); }, agree: (cc) => { cc.s.place = "station"; cc.say("ack_place"); } },
  }));
}
function suggestTime(c: Ctx) {
  c.say("suggest_time");
  c.expect(yn({
    id: "suggest_time", expects: ["time_ans", "meet"], hints: ["agree", "meettime"],
    suggest: [{ lt: "Sutikti", hint: "agree" }, { lt: "Pasiūlyti kitą laiką", hint: "meettime" }],
    yes: (cc) => { cc.s.meetTime = { h: 7, m: 30 }; cc.say("ack"); },
    no: (cc) => { cc.say("when_then"); cc.ask("meet_time"); },
    ask: (cc) => cc.say("suggest_time"),
    on: {
      time_ans: (cc, sl, sg) => { H.time_ans(cc, sl, sg); }, meet: (cc, sl, sg) => { H.meet(cc, sl, sg); },
      g_ok: (cc) => { cc.s.meetTime = { h: 7, m: 30 }; cc.say("ack"); }, agree: (cc) => { cc.s.meetTime = { h: 7, m: 30 }; cc.say("ack"); },
    },
  }));
}

/** Lizzie's optional questions this visit (band, sister, ticket money, the barbecue). */
const bandAsked = (c: Ctx) => !!c.s.askBand && !c.s.genre && !c.s.fav;
const hasExtraQs = (c: Ctx) => bandAsked(c) || !!c.s.askSister || !!c.s.askPay || !!c.s.bbq;
const extraQsDone = (c: Ctx) => (!bandAsked(c) || !!c.s.bandDone) && (!c.s.askSister || c.s.sister !== undefined)
  && (!c.s.askPay || !!c.s.payDone) && (!c.s.bbq || !!c.s.bbqDone);

/** The concert is already on the table, or mentioned in the same breath ("Are you free on Friday? I have two
 *  tickets…"): Lizzie doesn't ask "Why?". */
const eventKnown = (c: Ctx) => !!c.s.eventSaid || /\b(tickets?|concert|gig|festival|band|show)\b/i.test(c.heard || "");

/** "Are you free on Saturday?": she's busy. With the concert already mentioned she asks for another day. */
function satBusy(c: Ctx) {
  c.s.satAsked = true;
  if (!eventKnown(c)) { c.say("sat_busy"); c.s.skipAsk = true; return; }
  c.s.eventSaid = true; setDay(c, "saturday");
  c.say("sat_busy_invite"); otherDay(c);
}

/** "I'd love to, but I can't": a positive opener followed by a refusal is a refusal. */
const butNo = (c: Ctx) => /\bbut\b/i.test(c.heard || "") && !/\bbut (of course|sure|yes)\b/i.test(c.heard || "");

// Automatic answers the simulation uses when Lizzie asks one of her optional (random) questions.
const AUTO: Record<string, string> = {
  day: "On Friday", band: "It's a jazz band", sister: "Sure!", pay: "Don't worry about it, it's on me",
  bbq: "Sorry, I can't, I'm busy on Sunday", bad_line: "Yes, Friday", meet_change: "Sure", closing: "Bye!",
};
const AUTO_HELLO: Record<string, string> = { ...AUTO, hello: "Hi Lizzie, it's Tomas!" };

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) {
    // "Hi, Lizzie!" on its own: at "Hello?" she recognises the voice.
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
    // "Ha, I know!" only when the learner just introduced themselves.
    const bare = /^\W*((hi|hey|hello)\W+)?((lizzie|lizzy|liz)\W+)?(it'?s|it is|this is)\s+\w+(\s+\w+)?\W*$/i.test(c.heard || "");
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
      // A second plan after the concert ("Are you free on Saturday too?")
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
    if (c.s.accepted) { c.say("already_yes"); return; }
    if (c.s.sat) { c.say("sat_busy_invite"); otherDay(c); return; }
    if (c.s.badLine && !c.s.badLineDone && c.s.day === "friday") {
      c.s.badLineDone = true; c.twist("bad_line");
      c.say("bad_line");
      c.expect(yn({
        id: "bad_line", expects: ["day_ans"], hints: ["confirm"],
        suggest: [{ lt: "Patvirtinti: taip, penktadienį", hint: "confirm" }],
        yes: (cc) => accept(cc),
        no: (cc) => { cc.s.day = undefined; cc.say("which_day"); otherDay(cc); },
        on: { day_ans: (cc, sl, sg) => { H.day_ans(cc, sl, sg); }, invite: (cc) => accept(cc), agree: (cc) => accept(cc), g_ok: (cc) => accept(cc) },
        ask: (cc) => cc.say("bad_line_q"),
      }));
      return;
    }
    accept(c);
  },
  day_ans(c, slots, seg) {
    // "I'm busy on Sunday" may split off "on Sunday": a refusal never sets the day.
    if (/\b(busy|can'?t|cannot|can not|won'?t|plans|working)\b/i.test(c.heard || "")) return;
    const day = toArr(slots.day)[0] as string | undefined;
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
    if (slots.genre) { c.s.genre = toArr(slots.genre)[0]; c.say("love_genre", { G: c.s.genre }); }
    else if (seg.tags.includes("fav")) { c.s.fav = true; c.say("fav_band"); }
    else c.say("fun");
    c.s.bandDone = true;
  },
  band_ctx(c) { c.s.bandDone = true; c.s.bandNamed = true; c.say("never_heard"); },
  band_forgot(c) { c.s.bandDone = true; c.say("mystery"); },
  starts_at(c, slots) {
    const tm = norm(toArr(slots.time)[0]);
    if (tm) { c.s.startTime = tm; if (c.step === "start" && once(c, "ack")) c.say("ack_time"); }
  },
  time_ans(c, slots, seg) {
    let tm = norm(toArr(slots.time)[0]);
    if (!tm && slots.number != null) { const n = Number(toArr(slots.number)[0]); if (n >= 1 && n <= 12) tm = { h: n, m: 30 }; }
    // "Half an hour before (the concert)": counted back from the start (doors at eight by default)
    const before = seg.tags.includes("b60") ? 60 : seg.tags.includes("b30") ? 30 : seg.tags.includes("b15") ? 15 : 0;
    if (!tm && before && c.step !== "start") {
      const st = (c.s.startTime as Time | undefined) ?? { h: 8, m: 0 };
      const mins = st.h * 60 + st.m - before;
      tm = norm({ h: Math.floor(mins / 60), m: mins % 60 });
    }
    if (!tm) return;
    const forStart = c.step === "start" || (!c.s.startTime && c.step !== "meet_time" && c.step !== "place" && !c.s.place);
    if (forStart) { c.s.startTime = tm; if (c.s.accepted && once(c, "ack")) c.say("ack_time"); return; }
    c.s.meetTime = tm;
    if (c.s.accepted && once(c, "ack")) c.say("ack");
    void seg;
  },
  meet(c, slots) {
    const place = toArr(slots.place)[0] as string | undefined;
    const tm = norm(toArr(slots.time)[0]);
    if (tm) c.s.meetTime = tm;
    if (place && !c.s.accepted) { c.s.place = place; return; } // remembered; she accepts first
    if (place) {
      if (place === "station" && c.s.meetChange && !c.s.meetChangeDone) {
        c.s.meetChangeDone = true; c.twist("meet_change");
        c.say("meet_change");
        c.expect(yn({
          id: "meet_change", hints: ["agree", "place"],
          suggest: [{ lt: "Sutikti susitikti prie kavinės", hint: "agree" }, { lt: "Likti prie stoties", hint: "place", options: ["station"] }],
          yes: (cc) => { cc.s.place = "cafe"; cc.say("ack_cafe"); },
          no: (cc) => { cc.s.place = "station"; cc.say("keep_station"); },
          on: { meet: (cc, sl) => { const p = toArr(sl.place)[0]; cc.s.place = p || "station"; const tt = norm(toArr(sl.time)[0]); if (tt) cc.s.meetTime = tt; cc.say("ack_place"); } },
          ask: (cc) => cc.say("meet_change_q"),
        }));
        return;
      }
      c.s.place = place;
      if (once(c, "ack")) c.say("ack_place");
      return;
    }
    if (tm && c.s.accepted && once(c, "ack")) c.say("ack");
  },
  meet_unknown(c) { c.say("where_is_that"); suggestPlace(c); },
  ask_where(c) { if (!c.s.invited) { c.say("for_what"); c.s.skipAsk = true; return; } suggestPlace(c); },
  ask_when(c) { if (!c.s.invited) { c.say("for_what"); c.s.skipAsk = true; return; } suggestTime(c); },
  pickup(c) { c.say("pickup"); suggestPlace(c); },
  sister_yes_ctx(c) { c.s.sister = true; if (once(c, "sister")) c.say("sister_yes"); },
  sister_no_ctx(c) { c.s.sister = false; if (once(c, "sister")) c.say("sister_no"); },
  on_me(c) {
    c.s.payDone = true;
    if (once(c, "on_me")) c.say("on_me");
  },
  price_ctx(c) { c.s.payDone = true; if (once(c, "price")) c.say("pay_back"); },
  will_text(c) { c.s.willText = true; if (once(c, "text")) c.say("will_text_ok"); },
  cant_wait(c) {
    if (c.step === "bbq" && !c.s.bbqDone) { c.s.bbqDone = "yes"; c.say("bbq_yes"); return; }
    if (once(c, "me_too")) c.say("me_too");
  },
  reassure() { /* "No worries!" after Lizzie says she can't: nothing to add */ },
  // "Great!", "Yeah, of course!" answer the open yes/no question.
  g_ok(c) { stepYes(c); },
  no_sorry(c) { const st = inviteCall.steps.find((x) => x.id === c.step); if (st?.no && !st.done(c)) st.no(c); },
  agree(c) { stepYes(c); },
  accept_inv(c) {
    if (butNo(c)) { H.decline_ctx(c, {}, { intent: "decline_ctx", slots: {}, tags: [] }); return; }
    if (c.step === "bbq" && c.s.bbqDone === undefined) { c.s.bbqDone = "yes"; c.say("bbq_yes"); return; }
    c.say("yay");
  },
  decline_ctx(c) {
    // "I can't wait!" is excitement, never a refusal.
    if (/can'?t wait|cannot wait|can not wait/i.test(c.heard || "")) { H.cant_wait(c, {}, { intent: "cant_wait", slots: {}, tags: [] }); return; }
    if (!once(c, "decline")) return;
    if (c.step === "bbq" && !c.s.bbqDone) { c.s.bbqDone = "no"; c.say("bbq_no"); return; }
    c.say("oh_okay");
  },
  bye_ext(c) { H.g_bye(c, {}, { intent: "g_bye", slots: {}, tags: [] }); },
  g_bye(c) {
    // "Great, see you then!" while Lizzie still waits for another day: she asks once before saying goodbye
    if (!c.s.accepted && (c as any).conv?.pending?.id === "other_day" && !c.s.byeDayAsked) {
      c.s.byeDayAsked = true; c.say("which_day"); c.hold();
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
  c.hold(); // no open question is asked again after "Bye!"
}

function stepYes(c: Ctx) {
  const st = inviteCall.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

function otherDay(c: Ctx) {
  c.expect({
    id: "other_day", expects: ["day_ans", "invite"], hints: ["other_day", "invite"],
    suggest: [{ lt: "Pasiūlyti kitą dieną (koncertas penktadienį)", hint: "other_day" }],
    on: {
      day_ans: (cc, sl, sg) => { H.day_ans(cc, sl, sg); },
      invite: (cc, sl, sg) => { H.invite(cc, sl, sg); },
    },
    ask: (cc) => cc.say("which_day"),
  });
}

export const inviteCall: SituationDef = {
  id: "s83-invite-call",
  song: 83,
  songTitle: "Are You Free on Friday?",
  title: { en: "Are You Free on Friday?", lt: "Ar turi laiko penktadienį?" },
  topic: { en: "Making plans", lt: "Planai ir kvietimai" },
  chapter: 5,
  order: 2,
  location: "phone",
  npc: "lizzie",
  mode: "phone",
  goal: "Pakviesk Lizzie į koncertą penktadienį ir susitarkite dėl laiko ir vietos.",
  intro: "Turi du bilietus į koncertą penktadienį – durys atsidaro aštuntą vakaro. Skambini draugei Lizzie.",
  entities: { genre: GENRES, place: PLACES, wday: WDAYS },

  grammar: {
    macros: {
      lz: "(lizzie | lizzy | lizy | lissy | liz | lizzi)",
      when: [
        "[on | for] {day} [(night | evening | afternoon)] [at {time}]",
        "at {time} [[on] {day} [(night | evening)]]",
        "this weekend #weekend",
      ],
      event: [
        "[a | the | this | that] [{genre}] [music] (concert | show | gig | live show)",
        "[a | the] [{genre}] [music] festival",
        "(see | hear) [a | the | this | some] [{genre}] band [play | live]",
        "[some] live music",
        "(my | our) favorite band [play | live] #fav",
        "(see | hear) (my | our) favorite band [play | live] #fav",
      ],
      to_event: "(to | to see | to hear | for) @event",
      come: "(come | go | join me | come with me | go with me | come along | tag along | join us | come with us | go together)",
      loc: "[(outside | out front of | in front of | at | by | near | next to | inside | in)] [the] {place}",
      sorry: "[(sorry | i am sorry | i am so sorry | unfortunately | no sorry | oh no)]",
      okq: "[(is that okay | is that ok | is that fine | is that all right | okay | does that work | sound good | does that sound good)]",
      tix: "[(two | 2 | a couple of | a pair of | an extra | a spare | one extra | 1 extra | some | free | two free | extra)] (tickets | ticket)",
      // "…, do you want?" / "…, would you like it?" after the tickets
      want_q: "(do you want [one | it | to (come | go | join me)] | would you like (one | it | to (come | go | join me)) | are you interested | want to (come | go))",
    },
  },

  intents: {
    voc: { patterns: ["@lz", "(is this | is that | am i (speaking | talking) (with | to)) @lz"] },
    its_me_ctx: { patterns: [
      "[@lz] (it is | this is) {name} [here | calling] #h:open_its", "[@lz] it is me [{name}]", "[@lz] {name} here",
      "[@lz] it is {name} [@lz]", "(hey | hi | hello) it is {name}", "[@lz] [(it is | this is)] {name} (speaking | calling)", "[@lz] (it is | this is) {name} [do you] remember me",
      "[@lz] (it is | this is) your (friend | old friend | colleague | neighbor) {name}", "[@lz] my name is {name}", "[@lz] (it is | this is) {name} from (work | the office | next door)",
    ] },
    ask_like: { patterns: ["[@lz] do you like {genre} [music]", "[@lz] are you into {genre} [music]", "[@lz] do you like (live music | concerts)"] },
    hear_me: { patterns: ["[@lz] can you hear me [now | okay]", "(hello | hi) can you hear me"] },
    good_time: { patterns: [
      "[@lz] is this a (good | bad) time #h:open_good_time", "[@lz] (do | have) you (have | got) a (minute | second | sec) #h:open_minute",
      "[@lz] are you busy (right now | now | at the moment)", "[@lz] can you talk [right now | now]", "is now a good time", "[i am] [sorry] (to call | for calling) [you] (so late | so early | at this hour | at work | now | right now)",
    ] },
    ask_free: { patterns: [
      "[@lz] are you free [@when] #h:free_q", "[@lz] are you (busy | working) [@when] #busyq #h:busy_q",
      "[@lz] are you (around | available) [@when]", "[@lz] are you doing anything [@when] #plansq",
      "[@lz] what are you (doing | up to) [@when] #plansq #h:plans_q",
      "[@lz] (do you have | have you got) [any] plans [(for | on) {day} | for this weekend #weekend | @when] #plansq #h:plans_q2",
      "[@lz] what are your plans [(for | on) {day} | for (the | this) weekend #weekend] #plansq",
      "[@lz] (what about | how about) (this weekend #weekend | {day}) are you free",
      "[@lz] is {day} (good | okay) for you", "[@lz] do you have [any] (time | free time) [@when]",
    ] },
    tickets: { patterns: [
      "[@lz] i [have] (got | have | bought | booked | won) @tix [(for | to) @event] [@when] #h:inv_tickets",
      "[@lz] (my favorite band | a {genre} band | the band | this band | a band i like) is playing [@when] #fav",
      "[@lz] there is @event [@when]",
      "[@lz] i am going to @event [@when]",
      "[@lz] i am calling (because | to say) i [have] (got | have) @tix [(for | to) @event] [@when]",
      "[@lz] i have got (some | the) tickets [(for | to) @event] [@when]", "[@lz] i [have] (got | have | bought) @tix @when (for | to) @event",
    ] },
    invite: { patterns: [
      "[@lz] [so] do you want to @come [@to_event] [with me] [@when] #h:inv_want",
      "[@lz] do you want to (see | go see | go to | hear) @event [with me] [@when] #h:inv_want",
      "[@lz] would you like to @come [@to_event] [with me] [@when] #h:inv_would",
      "[@lz] would you like to (see | go see | go to | hear) @event [with me] [@when] #h:inv_would",
      "[@lz] want to @come [@to_event] [with me] [@when]",
      "[@lz] [do you] want to (see | go see | go to | hear | catch) @event [with me] [@when]",
      "[@lz] do you fancy (coming | going) [along] [@to_event] [with me] [@when] #tip:uk_fancy",
      "[@lz] (do you fancy | fancy) @event [@when] #tip:uk_fancy",
      "[@lz] (how about | what about) @event [@when] #h:inv_how_about",
      "[@lz] (how about | what about) (going to | coming to | seeing) @event [with me] [@when] #h:inv_how_about",
      "[@lz] (let us | we should | we could) (go to | see | go see | check out) @event [together] [@when] #h:inv_lets",
      "[@lz] let us go [together] [@when]",
      "[@lz] (are you | would you be) interested in [(going to | coming to | seeing)] @event [@when]",
      "[@lz] are you up for @event [@when]",
      "[@lz] (do | would) you feel like (going | coming) [@to_event] [with me] [@when] #h:inv_feel_like",
      "[@lz] (can | could | will | would) you come [with me] [@to_event] [with me] [@when]",
      "[@lz] i would (like | love) to invite you [@to_event] [@when] #h:inv_invite",
      "[@lz] i am calling to invite you [@to_event] [@when]", "[@lz] i (invite | am inviting) you [@to_event] [@when]",
      "[@lz] i (want | wanted) to invite you [@to_event] [@when]",
      "[@lz] i was wondering if you (would like | wanted | want | would want) to @come [@to_event] [with me] [@when] #h:inv_wondering",
      "(are you | you) in", "are you coming [with me]",
      "(come | go) with me [@to_event] [@when]", "join me [@when]",
      "[@lz] why do not we (go to | see | go see) @event [together] [@when]",
      "[@lz] (do you want | would you like) to go out [@when]",
      "[@lz] do you want (it | the ticket | a ticket)",
      "[@lz] i [have] (got | have | bought) @tix [(for | to) @event] [@when] @want_q", "[@lz] there is @event [@when] @want_q",
      "[@lz] (we can | we could) go [together] (to | see) @event [together] [@when]", "[@lz] (can | could | will | would) you go [with me] [@to_event] [with me] [@when]",
      "[@lz] maybe (you want | you would like) to (@come | see | go to | go see) [@to_event] [with me] [@when]", "[@lz] [do you] want to @event [with me] [@when]",
    ] },
    day_ans: { patterns: [
      "[on] {day} [(night | evening)] [at {time}] #h:day_this", "(how about | what about) {day} [(night | evening)] #h:od_how_about", "(yes | yeah) [on] {day} [(night | evening)] #h:cf_yes_day",
      "[sorry] i mean {day}", "[no] (it is | the concert is | the show is) [on] {day} [(night | evening)] [at {time}] [actually] #h:day_on",
      "{day} (is better | is fine | works)", "[it is] this {day}", "{day} [(night | evening)] (yes | yeah | right | exactly)", "[on] {day} [the] {ordinal}", "(yes | yeah | correct | exactly | right | that is right) [yes | yeah] [on] {day} [(night | evening)] [at {time}]",
    ] },
    band_ans: { patterns: [
      "(it is | they are) [a] {genre} band #h:band_genre", "[a] {genre} band", "[some] {genre} [music]",
      "(it is | this is) [a] {genre} (concert | show) #h:band_concert", "[a] local {genre} band #h:band_local",
      "[it is | they are] my favorite band #fav #h:band_fav", "[it is] [a | some] local band", "[a] band from (here | town | boston | new york)",
      "[it is | they are] [a | some] [local | famous | young] (band | singer | musician | musicians | group | guy | woman) from (here | town | boston | new york | chicago | lithuania | canada | england)",
      "[(it is | they are)] [a] {genre} (trio | quartet | group | orchestra | duo | singer)", "[some] local (musicians | bands | singers | guys)",
      "(it is | they are) [a] {genre} band from (here | town | boston | new york | chicago)", "they play [some] {genre} [music]",
    ] },
    // "I don't remember the name." (to "Who's playing?")
    band_forgot: { patterns: ["i (do not | can not) remember [the name | their name | who (it is | is playing)]", "i forgot [the name | their name]", "i do not know the name"] },
    band_ctx: { patterns: ["[it is | they are | a band called | they are called | it is called | the name is | their name is] {w:any}"] },
    starts_at: { patterns: [
      "(it | the concert | the show | the gig) (starts | begins) at {time} #h:start_at", "(the doors | doors) (open | are) at {time} #h:start_doors",
      "(it is | it starts) at {time}", "(starts | begins) at {time}", "the band (starts | goes on) at {time}",
      "i think (it starts | the doors open) at {time}", "(it | the concert | the show | the gig) (starts | begins) {time}", "(starts | begins) {time}",
      "(it | the concert | the show) will (start | begin) [at] {time}", "(the concert | the show | the gig) is at {time}", "[the] doors [open | are] [at] {time}",
      "the (music | band) (starts | begins) [at] {time}",
    ] },
    time_ans: { patterns: [
      "[at] {time} #h:start_short", "(around | about) {time} [i think] #h:start_around", "at around {time}",
      "(let us | let us just) say {time} @okq #h:time_lets_say", "(how about | what about) {time} #h:time_how_about", "i think [it is] at {time}", "{time} @okq",
      "(shall we say | say) {time} #tip:uk_shall", "maybe [at] {time}", "is {time} (okay | good | fine)",
      "[(let us | let us just) say | how about | what about | at | maybe] half {number} #tip:uk_half",
      "[yes | no] {time} (would be | is) (great | good | perfect | fine | better | okay) [for me]", "from {time}", "{time} (is it | is that) (okay | ok | fine | all right)", "[sure] {time} works [for me]", "(a bit | a little) (earlier | later) [maybe | like | say] {time}",
      "(half an hour #b30 | thirty minutes #b30 | 30 minutes #b30 | an hour #b60 | one hour #b60 | fifteen minutes #b15 | 15 minutes #b15) before [the (concert | show) | it starts | that]",
    ] },
    meet: { patterns: [
      "[so] (let us | we can | we could | why do not we | should we | maybe we can | maybe we could) meet @loc [at {time}] @okq #h:meet_lets",
      "[so] (let us | we can | we could | why do not we) meet at {time} [@loc] @okq #h:meet_full",
      "(meet | meet me) @loc [at {time}]", "(meet | meet me) at {time} [@loc]",
      "(how about | what about | maybe) [meeting] @loc [at {time}] #h:meet_how_about",
      "@loc [at {time}] @okq", "at {time} @loc @okq",
      "i will (meet | see | wait for) you @loc [at {time}]",
      "(is | how is) @loc (okay | good | fine) [for you]", "i [would] prefer [to meet] @loc [at {time}]", "[no] @loc (is | would be) better [for me]", "(can | could | shall) we meet @loc [at {time}]",
      "@loc (is | would be) (fine | good | okay | perfect | great) [for me]",
    ] },
    meet_unknown: { patterns: ["[let us | we can | we could] meet (at | outside | in front of | by | near) [the] {w:any}", "(at | outside | in front of | by | near) [the] {w:any}"] },
    pickup: { patterns: ["i (can | will | could) pick you up [at {time}]", "(can | should) i pick you up [at {time}]"] },
    ask_where: { patterns: [
      "where (do | would) you (want | like) to meet #h:meet_ask", "where should we meet", "where (can | could | shall) we meet",
      "where is (good | best | easy | easier | convenient) for you", "where do you want", "(anywhere | wherever) [you (want | like)]", "anywhere is (fine | good | okay)", "you (choose | pick | decide)", "(i do not mind | anywhere is fine | wherever you want)",
    ] },
    ask_when: { patterns: [
      "what time (do | would) you (want | like) to meet", "what time (should | can | shall) we meet",
      "what time (works | is good | is best) for you #h:time_ask_you", "when (do | would) you (want | like) to meet", "when should we meet",
    ] },
    sister_yes_ctx: { patterns: [
      "[sure | of course | yes | absolutely] the more the merrier #h:sis_merrier", "(sure | of course | yes) no problem #h:sis_sure", "[sure | of course | yes] (she can come | bring her [along] | she is welcome)",
      "[sure | of course | yes] i will (get | buy) (another | one more | an extra) ticket #h:sis_ticket", "[sure | yes] why not", "of course [you can]", "[sure] no problem",
      "[sure | of course | yes] she can [come | come too]", "[sure | of course | yes] (she is | your sister is) (welcome | very welcome)",
      "[sure | yes | of course] but she (needs | has to (buy | get)) (a | her own) ticket", "[sure | of course | yes] she can (buy | get) a ticket [at the (door | entrance | box office)]", "[sure | of course | yes] i would (love | like) to meet her",
    ] },
    sister_no_ctx: { patterns: [
      "@sorry i (only | just) have two tickets #h:sis_sorry", "@sorry (not this time | maybe next time)", "(no | nope) sorry", "sorry no",
      "@sorry there are no more tickets", "@sorry it is sold out", "@sorry just (us | the two of us)", "@sorry i do not have (another | a third | an extra | a) ticket [for her]", "@sorry i have only two tickets", "unfortunately not", "@sorry i (only | just) (got | have got) two tickets", "@sorry she can not [come | join us | come this time]",
    ] },
    on_me: { patterns: [
      "[do not worry about it] it is on me #h:pay_on_me", "do not worry about it #h:pay_dont_worry", "(it is | this is) my treat #h:pay_treat", "my treat",
      "(nothing | you do not owe me anything | you owe me nothing) [it is a gift]", "(it is | it was) free [for you]", "forget (it | about it)", "it is a gift",
      "you do not (need | have) to pay [me] [anything | for it]", "(it is | this is) (my gift | a present | my present)", "[nothing] (i got (them | it | the tickets) | they were | it was) (for free | free)", "(you can | just) buy me a (drink | coffee | beer)",
    ] },
    price_ctx: { patterns: ["[it is | it was | they are | they were] {price} [each | a ticket] #h:pay_price", "{price}"] },
    will_text: { patterns: [
      "i will (text | message | call) you [the (details | address | time)] [later | tomorrow | when i am on my way] #h:close_text",
      "i will send you [the] (details | address | time | tickets)", "text me [later]", "i will let you know",
    ] },
    cant_wait: { patterns: ["[me too] i can not wait #h:close_cant_wait", "me too", "same here", "i am so excited", "it is going to be (great | fun | amazing | awesome)", "(it will | that will) be (great | fun | amazing | awesome)"] },
    agree: { patterns: [
      "(yes | yeah | yep | sure | okay) (sure | of course | definitely | absolutely | why not | sounds good | sounds great | that works | perfect | great | cool | awesome | no problem)", "[yes | yeah] (good | great | nice) idea",
      "(sure | of course | absolutely | definitely) (yes | yeah)", "that sounds (good | great | perfect)", "works for me", "(perfect | great) (thanks | thank you)",
      "sounds (good | great) #h:ag_sounds_good", "sounds perfect", "perfect #h:ag_perfect", "sure #h:ag_sure",
    ] },
    no_sorry: { patterns: ["(no | nope) sorry", "sorry no", "sorry not (really | this time)", "no i am sorry"] },
    reassure: { patterns: ["no (worries | problem) [at all]", "(that is | it is) (okay | fine | all right | no problem)", "do not worry [about it]", "never mind", "[sure | okay] maybe (another time | next time)",
      "[oh] [(that is | it is)] too bad", "(that is | what) a (shame | pity | bummer)", "(bummer | that is a bummer)", "(that is | it is) (sad | a pity | a shame)"] },
    accept_inv: { patterns: [
      "i would love to [come] #h:rep_love", "count me in #h:rep_count_in", "sounds (great | good | fun | awesome) [count me in] #h:rep_count_in",
      "i am in", "i will be there", "(sure | yes | yeah) i would love to", "i will come", "that sounds (great | fun | good)",
      "[yes] i am (free | not busy) [on {day}] [i would love to come]", "i have (no | nothing) plans [on {day}]",
      "[yes | sure] what time [should i come]", "{day} [i think] i am (free | not busy)", "[i would love to] (can | should) i bring (something | anything)", "[i would love to] what (should | can) i bring",
    ] },
    decline_ctx: { patterns: [
      "@sorry i can not [(make it | come | go)] [on {day}] #h:rep_cant", "@sorry i am (busy | working | not free) [on {day}] #h:rep_cant",
      "@sorry i (have | have got) [other] plans [on {day}] #h:rep_plans", "[thanks but] i have something (else | on) [on {day}]", "(no | nope) sorry", "sorry no",
      "i would love to but i can not [make it] [on {day}]", "i wish i could [but i can not]",
      "maybe (another time | next time | some other time) #h:rep_another", "not this time", "i do not think i can [make it]",
      "[sorry] i will not be able to (make it | come)", "thanks but i can not", "i think i am (busy | working)",
      "i would love to but i (am busy | am working | have plans | have to work)", "@sorry i (work | am working | have to work) [on {day}]",
      "@sorry i am going away [this weekend | on {day}]", "@sorry i am visiting (my | some) (parents | family | friends | mom | mother | grandparents) [on {day}]", "@sorry i do not have time [on {day}]", "@sorry i will be away [this weekend | on {day}]", "[thanks but] i [already] have [other] plans [on {day}] #h:rep_plans",
    ] },
    bye_ext: { patterns: [
      "(see you | see you on | i will see you [on]) {day} [then] #h:close_see_you", "see you (then | there)", "talk (soon | to you soon) #h:close_talk_soon",
      "speak soon #tip:uk_speak_soon", "catch you later", "later", "i will talk to you (later | soon)", "see you (at | outside | in front of | by) the {place}",
    ] },
  },

  lines: {
    hello_q: [t("Hello?", "Alio?", "Alio?")],
    who_is_this: [
      t("Hello? | Who's | this?", "Alio? | Kas | čia?", "Alio? Kas skambina?", { flags: { 1: "“’s” (is) has no separate word: Kas čia? needs no copula." } }),
    ],
    oh_hey: [
      t("Oh, | hey! | How | are | you?", "O, | labas! | Kaip | sekasi | {j:jums|t:tau}?", "O, labas! Kaip sekasi?"),
      t("Oh, | hi! | How's it going?", "O, | labas! | Kaip sekasi?", "O, labas! Kaip sekasi?"),
    ],
    hey_howareyou: [
      t("Hey, | you! | How's it going?", "Labas, | tu! | Kaip sekasi?", "O, labas! Kaip sekasi?"),
      t("Hi! | How | are | you | doing?", "{j:Sveiki|t:Labas}! | Kaip | — | {j:jums|t:tau} | sekasi?", "{j:Sveiki|t:Labas}! Kaip {j:jums|t:tau} sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
    ],
    how_are_you_again: [
      t("So, | how | are | you?", "Tai | kaip | sekasi | {j:jums|t:tau}?", "Tai kaip sekasi?"),
    ],
    hey_whatsup: [
      t("Hey! | What's up?", "Labas! | Kas naujo?", "Labas! Kas naujo?"),
      t("Oh, | hey, | you! | What's up?", "O, | labas, | tu! | Kas naujo?", "O, labas! Kas naujo?"),
    ],
    i_know: [
      t("Ha, | I | know! | I | saw | your | name.", "Cha, | aš | žinau! | Aš | mačiau | {j:jūsų|t:tavo} | vardą.", "Cha, žinau! Mačiau {j:jūsų|t:tavo} vardą."),
    ],
    so_whats_up: [
      t("So, | what's up?", "Tai | kas naujo?", "Tai kas naujo?"),
      t("So, | what's new?", "Tai | kas naujo?", "Tai kas naujo?"),
    ],
    hear_you: [
      t("Yep, | I | can | hear | you | fine.", "Taip, | aš | galiu | girdėti | {j:jus|t:tave} | gerai.", "Taip, girdžiu {j:jus|t:tave} gerai."),
    ],
    good_time: [
      t("Sure, | I've got | a | minute. | What's up?", "Žinoma, | turiu | — | minutę. | Kas yra?", "Žinoma, turiu minutėlę. Kas yra?"),
      t("Yeah, | it's | fine. | What's up?", "Taip, | tai yra | gerai. | Kas yra?", "Taip, galiu kalbėti. Kas yra?"),
    ],
    free_yes: [
      t("I | think | so. | Why?", "Aš | manau, | kad taip. | Kodėl?", "Manau, kad taip. O ką?"),
      t("Yeah, | I'm | free. | Why?", "Taip, | aš esu | {sm:laisvas|sf:laisva}. | Kodėl?", "Taip, esu {sm:laisvas|sf:laisva}. O ką?"),
    ],
    not_busy: [
      t("No, | I'm | free. | Why?", "Ne, | aš esu | {sm:laisvas|sf:laisva}. | Kodėl?", "Ne, esu {sm:laisvas|sf:laisva}. O ką?"),
    ],
    not_much: [
      t("Not much. | Why?", "Nieko ypatingo. | Kodėl?", "Nieko ypatingo. O ką?"),
      t("Nothing | yet! | Why?", "Nieko | dar! | Kodėl?", "Dar nieko! O ką?", { flags: { 0: "Negative concord: nothing → nieko; Lithuanian needs no verb here." } }),
    ],
    sat_busy_fri_free: [
      t("Saturday | I'm | busy, | but | Friday | I'm | free. | Why?", "Šeštadienį | aš esu | {sm:užimtas|sf:užimta}, | bet | penktadienį | aš esu | {sm:laisvas|sf:laisva}. | Kodėl?",
        "Šeštadienį esu {sm:užimtas|sf:užimta}, bet penktadienį – {sm:laisvas|sf:laisva}. O ką?"),
    ],
    not_busy_known: [
      t("No, | I'm | free!", "Ne, | aš esu | {sm:laisvas|sf:laisva}!", "Ne, esu {sm:laisvas|sf:laisva}!"),
    ],
    not_much_known: [
      t("Nothing | yet!", "Nieko | dar!", "Dar nieko!", { flags: { 0: "Negative concord: nothing → nieko; Lithuanian needs no verb here." } }),
    ],
    free_yep: [
      t("Yep! | I'm | free.", "Taip! | Aš esu | {sm:laisvas|sf:laisva}.", "Taip! Esu {sm:laisvas|sf:laisva}."),
    ],
    maybe_free: [
      t("Maybe! | Let | me | check | and | I'll text | you.", "Gal! | {j:Leiskite|t:Leisk} | man | pasižiūrėti, | ir | parašysiu | {j:jums|t:tau}.", "Gal! Pasižiūrėsiu ir parašysiu {j:jums|t:tau}."),
    ],
    sat_busy: [
      t("Saturday | I'm | busy. | I'm helping | my | mom | move. | Why?", "Šeštadienį | aš esu | {sm:užimtas|sf:užimta}. | Padedu | savo | mamai | persikraustyti. | Kodėl?",
        "Šeštadienį esu {sm:užimtas|sf:užimta} – padedu mamai persikraustyti. O ką?"),
      t("Oh, | Saturday | I | can't. | I | have | plans. | Why?", "O, | šeštadienį | aš | negaliu. | Aš | turiu | planų. | Kodėl?", "O, šeštadienį negaliu – turiu planų. O ką?"),
    ],
    sat_busy_invite: [
      t("Oh | no, | I'm | busy | on Saturday! | What about | another | day?", "O | ne, | aš esu | {sm:užimtas|sf:užimta} | šeštadienį! | Gal | kitą | dieną?",
        "O ne, šeštadienį esu {sm:užimtas|sf:užimta}! Gal kitą dieną?"),
    ],
    sat_busy_after: [
      t("Saturday? | Sorry, | I | can't. | I'm | busy.", "Šeštadienį? | Atsiprašau, | aš | negaliu. | Aš esu | {sm:užimtas|sf:užimta}.", "Šeštadienį? Atsiprašau, negaliu – esu {sm:užimtas|sf:užimta}."),
    ],
    another_time: [
      t("Maybe | another | time?", "Gal | kitą | kartą?", "Gal kitą kartą?"),
    ],
    which_day: [
      t("Which | day | is | it?", "Kurią | dieną | vyksta | jis?", "Kurią dieną jis vyksta?"),
      t("Wait, | which | day?", "Palauk, | kurią | dieną?", "Palauk, kurią dieną?"),
    ],
    are_you_asking: [
      t("Ooh, | nice! | Are | you | asking | me?", "O, | šaunu! | Ar | {j:jūs|t:tu} | {j:kviečiate|t:kvieti} | mane?", "O, šaunu! Ar {j:jūs|t:tu} mane {j:kviečiate|t:kvieti}?"),
      t("Wait, | are | you | inviting | me?", "Palauk, | ar | {j:jūs|t:tu} | {j:kviečiate|t:kvieti} | mane?", "Palauk, ar {j:jūs|t:tu} mane {j:kviečiate|t:kvieti}?"),
    ],
    is_that_invitation: [
      t("So... | is | that | an | invitation?", "Tai... | ar yra | tai | — | kvietimas?", "Tai... ar tai kvietimas?"),
    ],
    for_what: [
      t("Wait, | for | what?", "Palauk, | dėl | ko?", "Palauk, o kam?"),
    ],
    oh_okay: [
      t("Oh! | Okay, | no | problem.", "O! | Gerai, | jokių | problemų.", "O! Gerai, jokių problemų."),
    ],
    accept: [
      t("Are | you | kidding? | I'd love to!", "Ar | {j:jūs|t:tu} | {j:juokaujate|t:juokauji}? | Mielai!", "{j:Juokaujate|t:Juokauji}? Mielai!"),
      t("Oh | my | gosh, | yes! | I'd love to!", "O | mano | dieve, | taip! | Mielai!", "O Dieve, taip! Mielai!"),
      t("Ooh, | fun! | Count me in!", "O, | smagu! | Aš – už!", "O, smagu! Aš – už!"),
      t("Yes! | I'd love to! | Thank | you!", "Taip! | Mielai! | Ačiū | {j:jums|t:tau}!", "Taip! Mielai! Ačiū {j:jums|t:tau}!"),
    ],
    already_yes: [
      t("Yes, | I | said | yes! | I'm | so | excited.", "Taip, | aš | pasakiau | taip! | Aš | taip | laukiu.", "Juk sutikau! Labai laukiu.",
        { flags: { 4: "“’m” (am) has no separate word: Lithuanian renders “excited” with the verb laukiu (look forward)." } }),
    ],
    love_genre: [
      t("I | love | {G}!", "Aš | dievinu | {G:acc}!", "Dievinu {G:acc}!"),
      t("And | I | love | {G}!", "O | aš | dievinu | {G:acc}!", "O aš dievinu {G:acc}!"),
    ],
    love_live: [
      t("I | love | live | music!", "Aš | dievinu | gyvą | muziką!", "Dievinu gyvą muziką!"),
    ],
    why_q: [
      t("Why?", "Kodėl?", "O ką?"),
    ],
    fav_band: [
      t("Your | favorite | band? | Awesome!", "{j:Jūsų|t:Tavo} | mėgstamiausia | grupė? | Nuostabu!", "{j:Jūsų|t:Tavo} mėgstamiausia grupė? Nuostabu!"),
    ],
    bad_line: [
      t("Sorry, | you're breaking up | a little. | Did | you | say | Friday?", "Atsiprašau, | ryšys trūkinėja | truputį. | Ar | {j:jūs|t:tu} | {j:sakėte|t:sakei} | penktadienį?",
        "Atsiprašau, ryšys truputį trūkinėja. Ar {j:sakėte|t:sakei} penktadienį?"),
    ],
    bad_line_q: [
      t("Sorry, | did | you | say | Friday?", "Atsiprašau, | ar | {j:jūs|t:tu} | {j:sakėte|t:sakei} | penktadienį?", "Atsiprašau, ar {j:sakėte|t:sakei} penktadienį?"),
    ],
    ask_day: [
      t("Cool! | When | is | it?", "Šaunu! | Kada | vyksta | jis?", "Šaunu! Kada jis vyksta?"),
      t("When | is | the | concert?", "Kada | vyksta | — | koncertas?", "Kada koncertas?"),
    ],
    ask_band: [
      t("Ooh, | who's | playing?", "O, | kas | groja?", "O, kas groja?", { flags: { 1: "“’s” (is) is the progressive auxiliary; groja carries the tense." } }),
      t("Fun! | What | kind | of music?", "Smagu! | Kokios | rūšies | muzikos?", "Smagu! Kokia muzika?"),
    ],
    fun: [
      t("Ooh, | fun!", "O, | smagu!", "O, smagu!"),
      t("Nice!", "Šaunu!", "Šaunu!"),
    ],
    never_heard: [
      t("Never | heard | of | them, | but | I'm in!", "Niekada | negirdėjau | apie | juos, | bet | aš – už!", "Niekada apie juos negirdėjau, bet aš – už!",
        { flags: { 1: "Negative concord: after niekada the verb takes ne- (negirdėjau)." } }),
    ],
    mystery: [
      t("Ha, | a | mystery | band! | I'm in | anyway.", "Cha, | — | paslaptinga | grupė! | Aš – už | vis tiek.", "Cha, paslaptinga grupė! Aš vis tiek – už."),
    ],
    ask_start: [
      t("What | time | does | it | start?", "Kelintą | valandą | — | jis | prasideda?", "Kelintą prasideda?", { flags: { 2: "Question “does” has no Lithuanian word (linked to “start”)." } }),
      t("So | when | does | it | start?", "Tai | kada | — | jis | prasideda?", "Tai kada prasideda?", { flags: { 2: "Question “does” has no Lithuanian word (linked to “start”)." } }),
    ],
    start_help: [
      t("No | problem. | Just | text | me | later.", "Jokių | problemų. | Tiesiog | {j:parašykite|t:parašyk} | man | vėliau.", "Jokių problemų. Tiesiog {j:parašykite|t:parašyk} man vėliau."),
    ],
    ack_time: [
      t("Okay, | cool.", "Gerai, | šaunu.", "Gerai, šaunu."),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Got it.", "Supratau.", "Supratau."),
    ],
    ask_place: [
      t("Where | should | we | meet?", "Kur | turėtume | mes | susitikti?", "Kur susitinkame?"),
      t("And | where | do | you | want | to meet?", "O | kur | — | {j:jūs|t:tu} | {j:norite|t:nori} | susitikti?", "O kur {j:norite|t:nori} susitikti?",
        { flags: { 2: "Question “do” has no Lithuanian word (linked to “want”)." } }),
    ],
    ack_place: [
      t("Sounds | good!", "Skamba | gerai!", "Puiku!"),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Okay, | great.", "Gerai, | puiku.", "Gerai, puiku."),
    ],
    ask_meet_time: [
      t("And | what | time?", "O | kelintą | valandą?", "O kelintą?"),
      t("Cool. | What | time | should | we | meet?", "Šaunu. | Kelintą | valandą | turėtume | mes | susitikti?", "Šaunu. Kelintą susitinkame?"),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Great.", "Puiku.", "Puiku."),
    ],
    suggest_place: [
      t("How about | outside | the | station?", "Gal | prie | — | stoties?", "Gal prie stoties?"),
    ],
    where_then: [
      t("Okay, | where | then?", "Gerai, | kur | tada?", "Gerai, tai kur?"),
    ],
    suggest_time: [
      t("How about | 7:30?", "Gal | 7:30?", "Gal pusę aštuonių?", { say: "How about seven thirty?" }),
    ],
    when_then: [
      t("Okay, | what | time | then?", "Gerai, | kelintą | valandą | tada?", "Gerai, tai kelintą?"),
    ],
    where_is_that: [
      t("Hmm, | where's | that?", "Hmm, | kur yra | tai?", "Hmm, kur tai?"),
    ],
    pickup: [
      t("Aw, | thanks! | But | the | station | is | easier | for me.", "Oi, | ačiū! | Bet | — | stotis | yra | patogesnė | man.", "Oi, ačiū! Bet man patogiau prie stoties."),
    ],
    meet_change: [
      t("Hmm, | the | station | is | always | so | crowded. | Can | we | meet | at | the | café | instead?",
        "Hmm, | — | stotis | yra | visada | tokia | perpildyta. | Ar galime | mes | susitikti | prie | — | kavinės | vietoj to?",
        "Hmm, stotyje visada tiek žmonių. Gal galime susitikti prie kavinės?"),
    ],
    meet_change_q: [
      t("So, | can | we | meet | at | the | café?", "Tai | ar galime | mes | susitikti | prie | — | kavinės?", "Tai gal susitinkame prie kavinės?"),
    ],
    ack_cafe: [
      t("Yay, | thanks! | The | café, | then.", "Valio, | ačiū! | — | Kavinė, | tada.", "Valio, ačiū! Tada prie kavinės."),
    ],
    keep_station: [
      t("Okay, | no | problem. | The | station | is fine.", "Gerai, | jokių | problemų. | — | Stotis | tinka.", "Gerai, jokių problemų. Tinka ir stotis."),
    ],
    ask_sister: [
      t("Oh, | and | can | I | bring | my | sister? | She | loves | live | music.", "O, | ir | ar galiu | aš | atsivesti | savo | seserį? | Ji | dievina | gyvą | muziką.",
        "O, ir ar galiu atsivesti seserį? Ji dievina gyvą muziką."),
      t("Hey, | can | I | bring | my | sister?", "Ei, | ar galiu | aš | atsivesti | savo | seserį?", "Ei, ar galiu atsivesti seserį?"),
    ],
    sister_yes: [
      t("Yay! | Thanks! | She'll be | so | happy!", "Valio! | Ačiū! | Ji bus | tokia | laiminga!", "Valio! Ačiū! Ji bus tokia laiminga!"),
      t("Awesome! | I'll tell | her | tonight.", "Nuostabu! | Pasakysiu | jai | šįvakar.", "Nuostabu! Šįvakar jai pasakysiu."),
    ],
    sister_no: [
      t("Oh, | that's | okay! | Just | us, | then.", "O, | tai | gerai! | Tik | mes, | tada.", "O, nieko tokio! Tada tik mes dviese."),
      t("No | worries! | Next | time.", "Jokių | rūpesčių! | Kitą | kartą.", "Nieko tokio! Kitą kartą."),
    ],
    ask_pay: [
      t("Oh, | and | what | do | I | owe | you | for | the | ticket?", "O, | ir | kiek | — | aš | {sm:skolingas|sf:skolinga} | {j:jums|t:tau} | už | — | bilietą?",
        "O, ir kiek aš {j:jums|t:tau} {sm:skolingas|sf:skolinga} už bilietą?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “owe”)." } }),
    ],
    on_me: [
      t("Aw, | you're | the | best! | Thank | you!", "Oi, | {j:jūs esate|t:tu esi} | — | {m:geriausias|f:geriausia}! | Ačiū | {j:jums|t:tau}!", "Oi, {j:jūs geriausi|t:tu geriausias}! Ačiū {j:jums|t:tau}!"),
      t("Really? | That's | so | sweet. | Thanks!", "Tikrai? | Tai | taip | miela. | Ačiū!", "Tikrai? Kaip miela. Ačiū!"),
    ],
    pay_back: [
      t("Okay, | I'll give | you | the | money | on Friday.", "Gerai, | atiduosiu | {j:jums|t:tau} | — | pinigus | penktadienį.", "Gerai, pinigus atiduosiu penktadienį."),
    ],
    summary: [
      t("Okay, | so | {D}, | {$time}, | at | {P.the}.", "Gerai, | taigi | {D:acc}, | {$time}, | prie | {P.the:gen}.", "Gerai, taigi {D:acc} {$time} prie {P.the:gen}."),
    ],
    summary_notime: [
      t("Okay, | so | {D}, | at | {P.the}.", "Gerai, | taigi | {D:acc}, | prie | {P.the:gen}.", "Gerai, taigi {D:acc} prie {P.the:gen}."),
    ],
    cant_wait_line: [
      t("I | can't wait!", "Aš | nekantrauju!", "Nekantrauju!"),
      t("Yay! | I | can't wait!", "Valio! | Aš | nekantrauju!", "Valio! Nekantrauju!"),
    ],
    wait_details: [
      t("Wait, | wait! | We | still | need | to plan | the | details!", "Palauk, | palauk! | Mums | dar | reikia | suplanuoti | — | detales!", "Palauk, palauk! Dar reikia susitarti dėl detalių!"),
    ],
    will_text_ok: [
      t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
      t("Sounds | good!", "Skamba | gerai!", "Puiku!"),
    ],
    me_too: [
      t("Me | too!", "Aš | irgi!", "Aš irgi!"),
    ],
    yay: [
      t("Yay!", "Valio!", "Valio!"),
    ],
    definitely: [
      t("Definitely!", "Būtinai!", "Būtinai!"),
      t("For | sure!", "Tikrai | taip!", "Būtinai!"),
    ],
    bbq_invite: [
      t("Oh, | hey, | are | you | free | on Sunday? | We're having | a | barbecue | at | my | place.",
        "O, | ei, | ar {j:esate|t:esi} | {j:jūs|t:tu} | {m:laisvas|f:laisva} | sekmadienį? | Rengiame | — | grilio vakarėlį | — | mano | namuose.",
        "O, ei, ar {j:esate|t:esi} {m:laisvas|f:laisva} sekmadienį? Rengiame grilio vakarėlį pas mane.",
        { flags: { 9: "“at”: the locative ending of namuose carries it (my intervenes)." } }),
    ],
    bbq_yes: [
      t("Awesome! | I'll text | you | the | details.", "Nuostabu! | Parašysiu | {j:jums|t:tau} | — | detales.", "Nuostabu! Parašysiu {j:jums|t:tau} detales."),
    ],
    bbq_no: [
      t("No | worries! | Maybe | next | time.", "Jokių | rūpesčių! | Gal | kitą | kartą.", "Nieko tokio! Gal kitą kartą."),
    ],
    bye: [
      t("Talk | soon! | Bye!", "Pasikalbėsim | greitai! | Ate!", "Iki greito! Ate!"),
      t("See you | on Friday! | Bye!", "Iki | penktadienio! | Ate!", "Iki penktadienio! Ate!"),
      t("Okay, | bye! | Talk | soon!", "Gerai, | ate! | Pasikalbėsim | greitai!", "Gerai, ate! Iki greito!"),
    ],
  },

  domains: {
    time: () => {
      const out: Time[] = [];
      for (let h = 5; h <= 11; h++) for (const m of [0, 15, 30, 45]) out.push({ h, m });
      return out;
    },
  },

  hints: {
    opening: {
      lt: "Pasisveikinti ir prisistatyti",
      items: [
        { id: "open_its", s: t("Hi, | Lizzie! | It's | {$name}.", "Labas, | Lizi! | Čia | {$name}.", "Labas, Lizi! Čia {$name}."), note: "Telefonu sakoma „It's …“, ne „I am …“." },
        { id: "s_hello", s: t("Hey, | Lizzie! | How | are | you?", "Labas, | Lizi! | Kaip | sekasi | {j:jums|t:tau}?", "Labas, Lizi! Kaip sekasi?") },
        { id: "open_good_time", s: t("Is | this | a | good | time?", "Ar yra | dabar | — | geras | laikas?", "Ar dabar patogu kalbėti?") },
        { id: "open_minute", s: t("Do | you | have | a | minute?", "Ar | {j:jūs|t:tu} | {j:turite|t:turi} | — | minutę?", "Ar {j:turite|t:turi} minutėlę?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    invite: {
      lt: "Pakviesti į koncertą", slot: "genre", examples: ["jazz", "rock", "pop"],
      items: [
        { id: "inv_want", s: t("Do | you | want | to come | to | a | concert | on Friday?", "Ar | {j:jūs|t:tu} | {j:norite|t:nori} | ateiti | į | — | koncertą | penktadienį?",
          "Ar {j:norite|t:nori} ateiti į koncertą penktadienį?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "inv_tickets", s: t("I've got | two | tickets | for | a | concert.", "Turiu | du | bilietus | į | — | koncertą.", "Turiu du bilietus į koncertą.") },
        { id: "inv_would", s: t("Would | you | like | to come | with | me?", "Ar | {j:jūs|t:tu} | {j:norėtumėte|t:norėtum} | ateiti | su | manimi?", "Ar {j:norėtumėte|t:norėtum} ateiti su manimi?",
          { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on the verb (linked to “like”)." } }), register: "polite" },
        { id: "inv_want", s: t("Do | you | want | to come | to | {X.np} | concert | on Friday?", "Ar | {j:jūs|t:tu} | {j:norite|t:nori} | ateiti | į | {X.np:gen} | koncertą | penktadienį?",
          "Ar {j:norite|t:nori} ateiti į {X.np:gen} koncertą penktadienį?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "inv_would", s: t("Would | you | like | to come | to | {X.np} | concert | with | me?", "Ar | {j:jūs|t:tu} | {j:norėtumėte|t:norėtum} | ateiti | į | {X.np:gen} | koncertą | su | manimi?",
          "Ar {j:norėtumėte|t:norėtum} ateiti su manimi į {X.np:gen} koncertą?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on the verb (linked to “like”)." } }), register: "polite" },
        { id: "inv_tickets", s: t("I've got | two | tickets | for | {X.np} | concert | on Friday.", "Turiu | du | bilietus | į | {X.np:gen} | koncertą | penktadienį.",
          "Turiu du bilietus į {X.np:gen} koncertą penktadienį.") },
        { id: "inv_how_about", s: t("How about | {X.np} | concert | on Friday?", "Gal | {X.np:gen} | koncertą | penktadienį?", "Gal einam į {X.np:gen} koncertą penktadienį?"), register: "casual" },
        { id: "inv_lets", s: t("Let's go | to | {X.np} | concert | on Friday!", "Eikime | į | {X.np:gen} | koncertą | penktadienį!", "Eikime į {X.np:gen} koncertą penktadienį!"), register: "casual" },
        { id: "inv_feel_like", s: t("Do | you | feel like | going | to | {X.np} | concert?", "Ar | {j:jūs|t:tu} | {j:norite|t:nori} | eiti | į | {X.np:gen} | koncertą?",
          "Ar {j:norėtumėte|t:norėtum} nueiti į {X.np:gen} koncertą?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "inv_invite", s: t("I'd like | to invite | you | to | {X.np} | concert.", "Norėčiau | pakviesti | {j:jus|t:tave} | į | {X.np:gen} | koncertą.",
          "Norėčiau {j:jus|t:tave} pakviesti į {X.np:gen} koncertą."), register: "polite" },
        { id: "inv_wondering", s: t("I | was wondering | if | you'd like | to come.", "Aš | galvojau, | ar | {j:jūs norėtumėte|t:tu norėtum} | ateiti.",
          "Galvojau, gal {j:norėtumėte|t:norėtum} ateiti."), register: "polite", note: "Labai mandagus, švelnus kvietimas." },
        { id: "inv_want_short", s: t("Do | you | want | to come?", "Ar | {j:jūs|t:tu} | {j:norite|t:nori} | ateiti?", "Ar {j:norite|t:nori} ateiti?", { flags: { 0: "Question “Do” = the particle ar." } }), register: "casual" },
      ],
    },
    free: {
      lt: "Paklausti, ar ji laisva",
      items: [
        { id: "free_q", s: t("Are | you | free | on Friday?", "Ar {j:esate|t:esi} | {j:jūs|t:tu} | {sm:laisvas|sf:laisva} | penktadienį?", "Ar {j:turite|t:turi} laiko penktadienį?") },
        { id: "plans_q", s: t("What | are | you | up to | this | weekend?", "Ką | — | {j:jūs|t:tu} | {j:veikiate|t:veiki} | šį | savaitgalį?", "Ką {j:veikiate|t:veiki} šį savaitgalį?",
          { flags: { 1: "“are” (be up to) has no separate word; the verb (linked to “up to”) carries it." } }), register: "casual" },
        { id: "plans_q2", s: t("Do | you | have | any | plans | for Friday?", "Ar | {j:jūs|t:tu} | {j:turite|t:turi} | kokių nors | planų | penktadieniui?",
          "Ar {j:turite|t:turi} kokių nors planų penktadieniui?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "busy_q", s: t("Are | you | busy | on Friday?", "Ar {j:esate|t:esi} | {j:jūs|t:tu} | {sm:užimtas|sf:užimta} | penktadienį?", "Ar {j:esate|t:esi} {sm:užimtas|sf:užimta} penktadienį?") },
      ],
    },
    when: {
      lt: "Pasakyti, kada koncertas",
      items: [
        { id: "day_on", s: t("It's | on Friday.", "Jis vyks | penktadienį.", "Penktadienį.") },
        { id: "day_this", s: t("This | Friday, | at eight.", "Šį | penktadienį, | aštuntą.", "Šį penktadienį, aštuntą.") },
      ],
    },
    band: {
      lt: "Pasakyti, kas groja", slot: "genre", examples: ["jazz", "rock", "blues"],
      items: [
        { id: "band_genre", s: t("It's | {X.np} | band.", "Tai yra | {X.np:gen} | grupė.", "Tai {X.np:gen} grupė.") },
        { id: "band_fav", s: t("My | favorite | band!", "Mano | mėgstamiausia | grupė!", "Mano mėgstamiausia grupė!") },
        { id: "band_concert", s: t("It's | {X.np} | concert.", "Tai yra | {X.np:gen} | koncertas.", "Tai {X.np:gen} koncertas.") },
        { id: "band_local", s: t("A | local | {X} | band.", "— | Vietinė | {X:gen} | grupė.", "Vietinė {X:gen} grupė.") },
      ],
    },
    start: {
      lt: "Pasakyti, kada prasideda",
      items: [
        { id: "start_short", s: t("At eight.", "Aštuntą.", "Aštuntą.") },
        { id: "start_at", s: t("It | starts | at eight.", "Jis | prasideda | aštuntą.", "Prasideda aštuntą.") },
        { id: "start_doors", s: t("The | doors | open | at eight.", "— | Durys | atsidaro | aštuntą.", "Durys atsidaro aštuntą.") },
        { id: "start_around", s: t("Around | eight, | I | think.", "Apie | aštuntą, | aš | manau.", "Apie aštuntą, manau.") },
      ],
    },
    place: {
      lt: "Pasiūlyti, kur susitikti", slot: "place", examples: ["station", "cafe", "entrance"],
      items: [
        { id: "meet_lets", s: t("Let's meet | at | {X.the}.", "Susitikime | prie | {X.the:gen}.", "Susitikime prie {X.the:gen}.") },
        { id: "meet_how_about", s: t("Maybe | at | {X.the}?", "Gal | prie | {X.the:gen}?", "Gal prie {X.the:gen}?") },
        { id: "meet_full", s: t("Let's meet | at | {X.the} | at | 7:30.", "Susitikime | prie | {X.the:gen} | — | 7:30.", "Susitikime prie {X.the:gen} pusę aštuonių.",
          { say: "Let's meet at {X.the} at seven thirty.", flags: { 3: "Clock “at” has no separate Lithuanian word; the time itself carries it." } }) },
        { id: "meet_lets", s: t("Let's meet | outside | {X.the}.", "Susitikime | prie | {X.the:gen}.", "Susitikime prie {X.the:gen}."), only: (e) => ["station", "cafe"].includes(e.id) },
        { id: "meet_ask", s: t("Where | do | you | want | to meet?", "Kur | — | {j:jūs|t:tu} | {j:norite|t:nori} | susitikti?", "Kur {j:norite|t:nori} susitikti?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “want”)." } }) },
      ],
    },
    meettime: {
      lt: "Pasiūlyti, kada susitikti",
      items: [
        { id: "start_short", s: t("At | 7:30.", "— | 7:30.", "Pusę aštuonių.", { say: "At seven thirty.", flags: { 0: "Clock “at” has no separate Lithuanian word; the time itself carries it." } }) },
        { id: "time_how_about", s: t("How about | 7:30?", "Gal | 7:30?", "Gal pusę aštuonių?", { say: "How about seven thirty?" }) },
        { id: "time_lets_say", s: t("Let's say | 7:30.", "Sakykime | 7:30.", "Tarkime, pusę aštuonių.", { say: "Let's say seven thirty." }) },
        { id: "time_ask_you", s: t("What | time | works | for you?", "Koks | laikas | tinka | {j:jums|t:tau}?", "Koks laikas {j:jums|t:tau} tinka?") },
      ],
    },
    sister: {
      lt: "Atsakyti, ar sesuo gali ateiti",
      items: [
        { id: "sis_sure", s: t("Sure, | no | problem!", "Žinoma, | jokių | problemų!", "Žinoma, jokių problemų!") },
        { id: "sis_sorry", s: t("Sorry, | I | only | have | two | tickets.", "Atsiprašau, | aš | tik | turiu | du | bilietus.", "Atsiprašau, turiu tik du bilietus.") },
        { id: "sis_merrier", s: t("Sure! | The more the merrier!", "Žinoma! | Kuo daugiau, tuo linksmiau!", "Žinoma! Kuo daugiau, tuo linksmiau!") },
        { id: "sis_ticket", s: t("Of course! | I'll get | another | ticket.", "Žinoma! | Nupirksiu | dar vieną | bilietą.", "Žinoma! Nupirksiu dar vieną bilietą.") },
      ],
    },
    pay: {
      lt: "Atsakyti dėl bilieto kainos",
      items: [
        { id: "pay_on_me", s: t("It's on me!", "Aš vaišinu!", "Aš vaišinu!") },
        { id: "pay_dont_worry", s: t("Don't worry | about | it!", "{j:Nesijaudinkite|t:Nesijaudink} | dėl | to!", "{j:Nesijaudinkite|t:Nesijaudink}!") },
        { id: "pay_price", s: t("It's | twenty-five | dollars.", "Tai yra | dvidešimt penki | doleriai.", "Dvidešimt penki doleriai.") },
        { id: "pay_treat", s: t("It's | my | treat.", "Tai yra | mano | vaišės.", "Aš vaišinu.") },
      ],
    },
    reply_invite: {
      lt: "Priimti kvietimą arba mandagiai atsisakyti",
      items: [
        { id: "rep_love", s: t("I'd love to!", "Mielai!", "Mielai!") },
        { id: "rep_cant", s: t("Sorry, | I | can't. | I'm | busy.", "Atsiprašau, | aš | negaliu. | Aš esu | {m:užimtas|f:užimta}.", "Atsiprašau, negaliu – esu {m:užimtas|f:užimta}.") },
        { id: "rep_another", s: t("Maybe | another | time?", "Gal | kitą | kartą?", "Gal kitą kartą?") },
        { id: "rep_count_in", s: t("Sounds | great! | Count me in!", "Skamba | puikiai! | Aš – už!", "Puiku! Aš – už!"), register: "casual" },
        { id: "rep_plans", s: t("Thanks, | but | I | have | plans.", "Ačiū, | bet | aš | turiu | planų.", "Ačiū, bet turiu planų.") },
      ],
    },
    agree: {
      lt: "Sutikti",
      items: [
        { id: "ag_sounds_good", s: t("Sounds | good!", "Skamba | gerai!", "Puiku!") },
        { id: "ag_perfect", s: t("Perfect!", "Puiku!", "Puiku!") },
        { id: "ag_sure", s: t("Sure!", "Žinoma!", "Žinoma!") },
      ],
    },
    confirm: {
      lt: "Patvirtinti dieną",
      items: [
        { id: "cf_yes_day", s: t("Yes, | Friday!", "Taip, | penktadienį!", "Taip, penktadienį!") },
        { id: "day_on", s: t("It's | on Friday.", "Jis vyks | penktadienį.", "Penktadienį.") },
      ],
    },
    other_day: {
      lt: "Pasiūlyti kitą dieną",
      items: [
        { id: "od_how_about", s: t("How about | Friday?", "Gal | penktadienį?", "Gal penktadienį?") },
        { id: "day_on", s: t("It's | on Friday.", "Jis vyks | penktadienį.", "Penktadienį.") },
      ],
    },
    closing: {
      lt: "Užbaigti pokalbį",
      items: [
        { id: "close_see_you", s: t("See you | on Friday!", "Iki | penktadienio!", "Iki penktadienio!") },
        { id: "close_talk_soon", s: t("Talk | soon!", "Pasikalbėsim | greitai!", "Iki greito!"), register: "casual" },
        { id: "close_text", s: t("I'll text | you | the | details.", "Parašysiu | {j:jums|t:tau} | — | detales.", "Parašysiu {j:jums|t:tau} detales.") },
        { id: "close_cant_wait", s: t("I | can't wait!", "Aš | nekantrauju!", "Nekantrauju!") },
      ],
    },
  },

  tips: {
    uk_fancy: { key: "uk_fancy", lt: "Suprasta! Amerikoje dažniau sakoma „Do you want to come?“ arba „Would you like to come?“", better: "Do you want to come?" },
    uk_shall: { key: "uk_shall", lt: "Suprasta! Amerikoje dažniau sakoma „Let's say…“ arba „How about…?“", better: "How about 7:30?" },
    uk_half: { key: "uk_half", lt: "Suprasta! „Half seven“ – britiškas posakis. Amerikoje sakoma „seven thirty“ arba „half past seven“.", better: "Seven thirty." },
    uk_speak_soon: { key: "uk_speak_soon", lt: "Suprasta! Amerikoje dažniau sakoma „Talk soon!“", better: "Talk soon!" },
  },

  merges: {
    "i'd love to": { reason: "lexical_expression", split: "I'd → aš norėčiau, love → mylėti, to → į: the elliptical infinitive has no word for “to”; accepting an invitation = mielai.", minimal: "All four parts form the reply." },
    "count me in": { reason: "lexical_expression", split: "count → skaičiuok, me → mane, in → į is false; joining a plan = aš – už.", minimal: "Three words, one expression." },
    "what's up": { reason: "lexical_expression", split: "What's → kas yra + up → aukštyn is false; a casual greeting/question = kas naujo / kas yra.", minimal: "Two words." },
    "what's new": { reason: "lexical_expression", split: "What's → kas yra + new → nauja gives the ungrammatical “kas yra nauja”; the set question = kas naujo.", minimal: "Two words." },
    "not much": { reason: "lexical_expression", split: "not → ne + much → daug gives “ne daug” (a small quantity); as a reply to “what are you doing?” = nieko ypatingo.", minimal: "Two words." },
    "i'm in": { reason: "lexical_expression", split: "I'm → aš esu + in → viduje is false; joining a plan = aš – už.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”, a calque; a suggestion = gal.", minimal: "The suggested thing stays outside." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is false; a suggestion = gal / o kaip.", minimal: "The suggested thing stays outside." },
    "let's meet": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, meet → susitikti asks for permission; the proposal = susitikime (1st person plural imperative).", minimal: "Place and time stay outside." },
    "let's say": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, say → sakyti asks for permission; the proposal = sakykime / tarkime.", minimal: "The time stays outside." },
    "let's go": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, go → eiti asks for permission; the proposal = eikime.", minimal: "The destination stays outside." },
    "i've got": { reason: "grammatical_fusion", split: "I've → aš turiu + got → gavau gives “I received”; have got = possess (turiu).", minimal: "The object stays outside." },
    "you're breaking up": { reason: "lexical_expression", split: "you're → tu esi, breaking → laužantis, up → aukštyn is false; on the phone = ryšys trūkinėja.", minimal: "The degree (a little) stays outside." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree adverb = truputį.", minimal: "Two words." },
    "the more the merrier": { reason: "lexical_expression", split: "the → —, more → daugiau, the → —, merrier → linksmesni loses the correlative; the saying = kuo daugiau, tuo linksmiau.", minimal: "The whole saying." },
    "feel like": { reason: "lexical_expression", split: "feel → jausti + like → kaip is false; “feel like doing” = norėti.", minimal: "The verb stays outside." },
    "was wondering": { reason: "grammatical_fusion", split: "was → buvau + wondering → besistebintis gives a false stative reading; past progressive = galvojau (one finite verb).", minimal: "Two words." },
    "you'd like": { reason: "grammatical_fusion", split: "you'd → tu (drops “would”); the conditional ending of norėtum carries would + like.", minimal: "The infinitive stays outside." },
    "up to": { reason: "lexical_expression", split: "up → aukštyn + to → į is false; “be up to” = veikti (C-PHR).", minimal: "Two words; “are” is flagged separately." },
    "it's on me": { reason: "lexical_expression", split: "It's → tai yra + on → ant + me → manęs is false; paying for someone = aš vaišinu.", minimal: "The whole formula." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Prisistatyk", optional: true, when: (c) => c.s.opening === "hello" && !c.s.goalMet, done: (c) => c.s.opening === "hello" && !!c.s.identified },
    { step: "invite", lt: "Pakviesk į koncertą" },
    { lt: "Pasakyk, kurią dieną koncertas", optional: true, when: (c) => !!c.s.dayAsked && !c.s.goalMet, done: (c) => !!c.s.dayAsked && !!c.s.day },
    { step: "start", lt: "Pasakyk, kada prasideda" },
    { step: "place", lt: "Susitark, kur susitikti" },
    { step: "meet_time", lt: "Susitark, kada susitikti" },
    { lt: "Atsakyk į kitus klausimus", optional: true, when: (c) => !!c.s.accepted && hasExtraQs(c) && !c.s.goalMet, done: (c) => !!c.s.accepted && hasExtraQs(c) && extraQsDone(c) },
  ],
  steps: [
    { id: "hello", when: (c) => c.s.opening === "hello", done: (c) => !!c.s.identified,
      ask: (c) => { if (!c.s.helloSaid) { c.s.helloSaid = true; c.say("hello_q"); } else c.say("who_is_this"); },
      expects: ["its_me_ctx", "invite", "tickets", "ask_free", "good_time"],
      suggest: [{ lt: "Pasisveikinti ir pasakyti, kas skambina", hint: "opening" }] },
    { id: "invite", done: (c) => !!c.s.invited,
      ask: (c) => {
        if (c.s.eventSaid && !c.s.askedAsking) { c.s.skipAsk = false; c.s.askedAsking = true; c.say("are_you_asking"); return; }
        if (c.s.skipAsk) { c.s.skipAsk = false; return; }
        c.say(c.s.eventSaid ? "is_that_invitation" : "so_whats_up");
      },
      expects: ["invite", "tickets", "ask_free", "its_me_ctx", "good_time"],
      suggest: [
        { lt: "Pakviesti Lizzie į koncertą", hint: "invite", options: "genre" },
        { lt: "Paklausti, ar ji laisva penktadienį", hint: "free" },
      ],
      yes: (c) => { if (c.s.eventSaid) accept(c); else c.say("so_whats_up"); },
      no: (c) => { if (c.s.eventSaid) c.say("oh_okay"); } },
    { id: "day", when: (c) => !!c.s.accepted && !c.s.day, done: (c) => !!c.s.day,
      ask: (c) => { c.s.dayAsked = true; c.say(c.s.weekend ? "which_day" : "ask_day"); }, expects: ["day_ans"],
      suggest: [{ lt: "Pasakyti, kurią dieną koncertas", hint: "when" }] },
    { id: "band", when: (c) => !!c.s.accepted && c.s.askBand && !c.s.genre && !c.s.fav, done: (c) => !!c.s.bandDone,
      ask: (c) => c.say("ask_band"), expects: ["band_ans", "band_ctx", "band_forgot"],
      suggest: [{ lt: "Pasakyti, kas groja", hint: "band", options: "genre" }],
      help: (c) => { c.s.bandDone = true; c.say("mystery"); } },
    { id: "start", when: (c) => !!c.s.accepted, done: (c) => !!c.s.startTime || !!c.s.startDone,
      ask: (c) => c.say("ask_start"), expects: ["starts_at", "time_ans"],
      suggest: [{ lt: "Pasakyti, kada prasideda koncertas", hint: "start" }],
      help: (c) => { c.s.startDone = true; c.say("start_help"); } },
    { id: "place", when: (c) => !!c.s.accepted, done: (c) => !!c.s.place,
      ask: (c) => c.say("ask_place"), expects: ["meet", "ask_where", "meet_unknown", "pickup"],
      suggest: [{ lt: "Pasiūlyti, kur susitikti", hint: "place", options: ["station", "cafe", "entrance", "bus_stop"] }],
      help: (c) => { suggestPlace(c); } },
    { id: "meet_time", when: (c) => !!c.s.accepted && !!c.s.place, done: (c) => !!c.s.meetTime,
      ask: (c) => c.say("ask_meet_time"), expects: ["time_ans", "meet", "ask_when"],
      suggest: [{ lt: "Pasiūlyti, kada susitikti", hint: "meettime" }],
      help: (c) => { suggestTime(c); } },
    { id: "sister", when: (c) => !!c.s.accepted && c.s.askSister, done: (c) => c.s.sister !== undefined,
      ask: (c) => c.say("ask_sister"), expects: ["sister_yes_ctx", "sister_no_ctx"],
      suggest: [{ lt: "Atsakyti, ar jos sesuo gali ateiti", hint: "sister" }],
      yes: (c) => { c.s.sister = true; c.say("sister_yes"); },
      no: (c) => { c.s.sister = false; c.say("sister_no"); } },
    { id: "pay", when: (c) => !!c.s.accepted && c.s.askPay, done: (c) => !!c.s.payDone,
      ask: (c) => c.say("ask_pay"), expects: ["on_me", "price_ctx"],
      suggest: [{ lt: "Pasakyti, kad vaišini, arba kiek kainavo bilietas", hint: "pay" }],
      help: (c) => { c.s.payDone = true; c.say("on_me"); } },
    { id: "bbq", when: (c) => !!c.s.accepted && c.s.bbq, done: (c) => !!c.s.bbqDone,
      ask: (c) => { c.twist("bbq"); c.say("bbq_invite"); }, expects: ["decline_ctx", "cant_wait"],
      suggest: [{ lt: "Priimti kvietimą arba mandagiai atsisakyti", hint: "reply_invite" }],
      yes: (c) => { c.s.bbqDone = "yes"; c.say("bbq_yes"); },
      no: (c) => { c.s.bbqDone = "no"; c.say("bbq_no"); } },
  ],

  init: (c) => {
    const r = c.rng();
    c.s.opening = r < 0.35 ? "hello" : r < 0.7 ? "howareyou" : "whatsup";
    c.s.askBand = c.chance(0.5);
    c.s.askSister = c.chance(0.55);
    c.s.askPay = c.chance(0.4);
    c.s.badLine = c.visits >= 1 && c.chance(0.3);
    c.s.meetChange = c.visits >= 2 && c.chance(0.4);
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
    if (tm && inDomain(tm)) c.say("summary", { D: day, P: c.s.place, time: tm });
    else c.say("summary_notime", { D: day, P: c.s.place });
    c.say("cant_wait_line");
    const bye = (cc: Ctx) => sayBye(cc);
    // The plan is made: any friendly answer ends the call.
    const on: Record<string, (cc: Ctx, sl: any, sg: any) => void> = {};
    for (const k of Object.keys(inviteCall.intents)) if (!k.endsWith("_ctx")) on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_hello", "g_sorry", "g_howareyou_answer"]) on[k] = bye;
    Object.assign(on, {
      voc: bye, // "Bye, Lizzie!" / "Thanks, Lizzie!" (and even "Hi, Lizzie!") end the call
      will_text: (cc: Ctx) => { if (once(cc, "text")) cc.say("will_text_ok"); bye(cc); },
      cant_wait: (cc: Ctx) => { if (once(cc, "me_too")) cc.say("me_too"); bye(cc); },
      // "Great!" alone ends the call; "Great, I can't wait. Bye!" lets the other parts answer first.
      g_ok: (cc: Ctx) => { if (!/\b(wait|text|bye|see you|talk|thank|later|soon)\b/i.test(cc.heard || "")) bye(cc); },
    });
    c.expect({
      id: "closing", expects: ["cant_wait", "will_text", "bye_ext"], hints: ["closing", "g_social"], suggest: [{ lt: "Užbaigti pokalbį", hint: "closing" }],
      on, yes: bye, no: bye,
    });
  },

  tests: [
    { say: "Hi Lizzie, it's Tomas!", intent: "its_me_ctx", step: "hello" },
    { say: "Hello, this is Tomas.", intent: "its_me_ctx", step: "hello" },
    { say: "It's Tomas", intent: "none" },
    { say: "Are you free on Friday?", intent: "ask_free", slots: { day: "friday" } },
    { say: "Hey Lizzie, what are you up to this weekend?", intent: "ask_free" },
    { say: "Do you have any plans for Friday night?", intent: "ask_free" },
    { say: "I've got two tickets for a jazz concert on Friday.", intent: "tickets", slots: { genre: "jazz", day: "friday" } },
    { say: "My favorite band is playing on Friday", intent: "tickets" },
    { say: "Do you want to come to a concert with me on Friday?", intent: "invite", slots: { day: "friday" } },
    { say: "Would you like to come?", intent: "invite" },
    { say: "Do you fancy coming along?", intent: "invite" },
    { say: "Wanna come?", intent: "invite" },
    { say: "How about a rock concert on Friday?", intent: "invite", slots: { genre: "rock" } },
    { say: "Let's go to a concert on Friday!", intent: "invite" },
    { say: "Why don't we go to a concert on Friday?", intent: "invite" },
    { say: "I don't want to go to the concert", intent: "none", not: ["invite"] },
    { say: "I can't go on Friday", intent: "none", not: ["invite"] },
    { say: "Friday", intent: "day_ans", step: "day" },
    { say: "It's on Friday at eight", intent: "day_ans", step: "day" },
    { say: "At eight", intent: "time_ans", step: "start" },
    { say: "The doors open at eight", intent: "starts_at", step: "start" },
    { say: "Outside the station", intent: "meet", step: "place", slots: { place: "station" } },
    { say: "Let's meet in front of the station at 7:30", intent: "meet", slots: { place: "station", time: { h: 7, m: 30 } } },
    { say: "How about seven thirty?", intent: "time_ans", step: "meet_time" },
    { say: "Let's say half seven", intent: "time_ans", step: "meet_time" },
    { say: "Where do you want to meet?", intent: "ask_where", step: "place" },
    { say: "It's a jazz band", intent: "band_ans", step: "band", slots: { genre: "jazz" } },
    { say: "The Harbor Lights", intent: "band_ctx", step: "band" },
    { say: "Sure, the more the merrier!", intent: "sister_yes_ctx", step: "sister" },
    { say: "Sorry, I only have two tickets", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "Don't worry about it, it's on me", intent: "on_me", step: "pay" },
    { say: "It's twenty-five dollars", intent: "price_ctx", step: "pay" },
    { say: "Seven thirty", intent: "time_ans", step: "meet_time", not: ["price_ctx"] },
    { say: "I'd love to, but I can't", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "Sorry, I'm busy on Sunday", intent: "decline_ctx", step: "bbq" },
    { say: "No, I'm not free on Sunday", intent: "decline_ctx", step: "bbq" },
    { say: "Sounds great, count me in!", intent: "accept_inv", step: "bbq" },
    { say: "Great, I can't wait!", intent: "cant_wait", step: "bbq", not: ["decline_ctx"] },
    { say: "No, I'm not busy on Sunday", intent: "accept_inv", step: "bbq", not: ["decline_ctx"] },
    { say: "No, sorry", intent: "sister_no_ctx", step: "sister", not: ["g_repeat"] },
    { say: "I'll text you the details", intent: "will_text" },
    { say: "See you on Friday!", intent: "bye_ext" },
    { say: "Talk soon!", intent: "bye_ext" },
    { say: "Can you hear me?", intent: "hear_me" },
    { say: "Is this a good time?", intent: "good_time" },
    { say: "banana helicopter purple", intent: "none" },
    { say: "The weather is terrible today", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "Hello, is this Lizzie?", intent: "voc" },
    { say: "Hello, Tomas speaking", intent: "its_me_ctx", step: "hello" },
    { say: "Do you have time on Friday?", intent: "ask_free", slots: { day: "friday" } },
    { say: "Maybe you want to go to a concert with me?", intent: "invite" },
    { say: "I invite you to the concert on Friday", intent: "invite", slots: { day: "friday" } },
    { say: "I have free tickets for a concert, do you want?", intent: "invite" },
    { say: "Friday, yes", intent: "day_ans", step: "day", slots: { day: "friday" } },
    { say: "I don't remember the name", intent: "band_forgot", step: "band" },
    { say: "It's a jazz trio", intent: "band_ans", step: "band", slots: { genre: "jazz" } },
    { say: "The show is at eight", intent: "starts_at", step: "start" },
    { say: "I prefer the café", intent: "meet", step: "place", slots: { place: "cafe" } },
    { say: "Half an hour before", intent: "time_ans", step: "meet_time" },
    { say: "Seven thirty would be great", intent: "time_ans", step: "meet_time", slots: { time: { h: 7, m: 30 } } },
    { say: "Yes, but she needs a ticket", intent: "sister_yes_ctx", step: "sister" },
    { say: "You don't need to pay", intent: "on_me", step: "pay" },
    { say: "Can I bring something?", intent: "accept_inv", step: "bbq" },
    // meaning must not flip
    { say: "Sorry, I work on Sunday", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "I don't have time on Sunday", intent: "decline_ctx", step: "bbq", not: ["accept_inv"] },
    { say: "I don't have a ticket for her", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "She can't come, sorry", intent: "sister_no_ctx", step: "sister", not: ["sister_yes_ctx"] },
    { say: "It's not free", intent: "none", step: "pay" },
    // bug review 25 Sep: "too bad" is no "This is Too" greeting
    { say: "Oh, too bad. What about Sunday?", intent: "reassure", step: "invite", not: ["its_me_ctx"] },
    { say: "That's too bad. How about Sunday?", intent: "reassure", step: "invite", not: ["its_me_ctx", "g_sorry"] },
    { say: "What a pity! How about Friday?", intent: "reassure", step: "invite" },
    { say: "It's not too bad", intent: "none", not: ["reassure"] },
  ],

  sims: [
    { name: "happy path", turns: [
      "Hi Lizzie, it's Tomas!", "Good, thanks. And you?", "I've got two tickets for a jazz concert on Friday. Do you want to come?",
      "At eight", "Let's meet outside the station", "At 7:30", "I'll text you. Bye!",
    ], expect: { complete: true }, auto: AUTO_HELLO },
    { name: "questions first, short answers", turns: [
      "Hi Lizzie!", "Are you free on Friday?", "I have two tickets for a concert. Want to come?", "The doors open at eight",
      "Where do you want to meet?", "Yes, perfect", "What time works for you?", "Sounds good", "See you on Friday!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "Saturday first, then Friday", turns: [
      "Hey Lizzie! Are you free on Saturday?", "Oh, okay. What about Friday?", "I have tickets for a rock concert. Would you like to come with me?",
      "It starts at eight", "Let's meet in front of the café at half past seven", "Talk soon!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "details in one breath", turns: [
      "Hi Lizzie, it's Tomas. Is this a good time?", "Would you like to go to a blues concert with me on Friday at eight?",
      "Let's meet at the bus stop at seven thirty", "Great, I can't wait. Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "goodbye too early, then another day", turns: [
      "Hi Lizzie!", "Would you like to go to a concert with me on Saturday?", "Great, see you then!", "How about Friday?", "At eight",
      "Let's meet outside the station", "At 7:30", "Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "free question and tickets in one breath", turns: [
      "Hi Lizzie!", "Are you free on Friday? I have two tickets for a jazz concert.", "Yes!", "At eight", "Let's meet outside the station", "At 7:30", "Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "invitation without a day", turns: [
      "Hi Lizzie, it's Tomas!", "Good, thanks. And you?", "Do you want to come to a concert with me?", "On Friday", "At eight",
      "Let's meet outside the station", "At 7:30", "Bye!",
    ], expect: { complete: true }, auto: AUTO_HELLO },
  ],
};

export default inviteCall;
