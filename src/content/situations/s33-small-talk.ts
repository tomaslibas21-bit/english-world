// Song 33 "Lovely Weather": small talk with Frank, a retired neighbor, at the Oak Avenue bus stop
// (informal: tu). Frank opens with a weather remark, usually a tag question ("Lovely weather, isn't
// it?", "It's cold today, isn't it?", "Looks like rain."), sometimes with "How are you doing?" first.
// First visit: "Are you new around here?", Frank introduces himself, "Where are you from?" (Lithuania:
// "Cold winters there, right?"). Then the week and the weekend: on a Monday "How was your weekend?"
// (and "Busy week ahead?"), on a Friday "Busy week?" and "Any plans for the weekend?".
// Short answers work, and Frank gently invites more, once per topic ("Yeah? What did you do?",
// "Oh yeah? Work or family?"). The learner asks back ("How about you?") and shows interest ("Oh,
// nice!", "Really?"); Frank tells his side, waits for a reaction and then adds a little more. If the
// learner never asks back, Frank teases: "Hey, aren't you going to ask about my weekend? Ha!".
// When the bus comes the learner ends politely ("I'd better get going. Nice talking to you!" →
// "You too! Have a good one!"); on some later visits Frank's own bus comes first and he says it.
// Twists (visits ≥ 1): it starts to rain ("Oh, here it comes!") and Frank shares his umbrella; the
// bus is late again ("Typical! Well, more time to chat!"), so there is one more question.
//
// The learner's gender: {m:…|f:…}. Frank is male and always informal, so his own forms and the
// learner's "tu" forms are written out.

import type { Ctx, EntityDef, Handler, Pending, Segment, SituationDef, StepDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities: countries and Lithuanian cities (where are you from)

function declF(nom: string): string {
  const x = nom.slice(0, -1);
  if (nom.endsWith("ė")) return [nom, x + "ės", x + "ei", x + "ę", x + "e", x + "ėje"].join("/");
  return [nom, x + "os", x + "ai", x + "ą", x + "a", x + "oje"].join("/");
}
const CTRY = (id: string, en: string, lt: string, forms: string[] = []) => ent(id, en, declF(lt), "f", { forms, chip: lt });

const COUNTRIES: EntityDef[] = [
  CTRY("lithuania", "Lithuania", "Lietuva", ["lithuanian", "lietuva", "lituania"]),
  CTRY("latvia", "Latvia", "Latvija", ["latvian"]),
  CTRY("estonia", "Estonia", "Estija", ["estonian"]),
  CTRY("poland", "Poland", "Lenkija", ["polish"]),
  CTRY("germany", "Germany", "Vokietija", ["german"]),
  CTRY("ukraine", "Ukraine", "Ukraina", ["ukrainian", "the ukraine"]),
  CTRY("belarus", "Belarus", "Baltarusija", ["belarusian"]),
  CTRY("russia", "Russia", "Rusija", ["russian"]),
  CTRY("sweden", "Sweden", "Švedija", ["swedish"]),
  CTRY("norway", "Norway", "Norvegija", ["norwegian"]),
  CTRY("finland", "Finland", "Suomija", ["finnish"]),
  CTRY("denmark", "Denmark", "Danija", ["danish"]),
  CTRY("england", "England", "Anglija", ["english", "the uk", "uk", "britain", "great britain", "british", "london"]),
  CTRY("ireland", "Ireland", "Airija", ["irish"]),
  CTRY("scotland", "Scotland", "Škotija", ["scottish"]),
  CTRY("france", "France", "Prancūzija", ["french"]),
  CTRY("spain", "Spain", "Ispanija", ["spanish"]),
  CTRY("italy", "Italy", "Italija", ["italian"]),
  CTRY("portugal", "Portugal", "Portugalija", ["portuguese"]),
  CTRY("greece", "Greece", "Graikija", ["greek"]),
  CTRY("czechia", "Czechia", "Čekija", ["czech republic", "the czech republic", "czech"]),
  CTRY("hungary", "Hungary", "Vengrija", ["hungarian"]),
  CTRY("romania", "Romania", "Rumunija", ["romanian"]),
  CTRY("canada", "Canada", "Kanada", ["canadian"]),
  CTRY("mexico", "Mexico", "Meksika", ["mexican"]),
  CTRY("brazil", "Brazil", "Brazilija", ["brazilian"]),
  CTRY("china", "China", "Kinija", ["chinese"]),
  CTRY("japan", "Japan", "Japonija", ["japanese"]),
  CTRY("india", "India", "Indija", ["indian"]),
  CTRY("turkey", "Turkey", "Turkija", ["turkish"]),
  CTRY("australia", "Australia", "Australija", ["australian"]),
];

const CITY = (id: string, en: string, lt: string, forms: string[], g: "m" | "f" = "m") => ent(id, en, lt, g, { forms, chip: lt.split("/")[0] });
const CITIES: EntityDef[] = [
  CITY("vilnius", "Vilnius", "Vilnius/Vilniaus/Vilniui/Vilnių/Vilniumi/Vilniuje", ["vilna"]),
  CITY("kaunas", "Kaunas", "Kaunas/Kauno/Kaunui/Kauną/Kaunu/Kaune", []),
  CITY("klaipeda", "Klaipėda", "Klaipėda/Klaipėdos/Klaipėdai/Klaipėdą/Klaipėda/Klaipėdoje", ["klaipeda", "klaipada"], "f"),
  CITY("siauliai", "Šiauliai", "Šiauliai/Šiaulių/Šiauliams/Šiaulius/Šiauliais/Šiauliuose", ["siauliai", "shiauliai", "shauliai"]),
  CITY("panevezys", "Panevėžys", "Panevėžys/Panevėžio/Panevėžiui/Panevėžį/Panevėžiu/Panevėžyje", ["panevezys", "panevezhys"]),
  CITY("palanga", "Palanga", "Palanga/Palangos/Palangai/Palangą/Palanga/Palangoje", [], "f"),
  CITY("alytus", "Alytus", "Alytus/Alytaus/Alytui/Alytų/Alytumi/Alytuje", []),
  CITY("marijampole", "Marijampolė", "Marijampolė/Marijampolės/Marijampolei/Marijampolę/Marijampole/Marijampolėje", ["marijampole"], "f"),
  CITY("utena", "Utena", "Utena/Utenos/Utenai/Uteną/Utena/Utenoje", [], "f"),
];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// ---------------------------------------------------------------------------
// Flags used more than once

const F_PROG = "Progressive “are” has no separate Lithuanian word; the present tense of the verb carries it.";
const F_DID = "Question “did” has no Lithuanian word; the past tense of the verb carries it.";
const F_DO_WH = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_FROM = "Stranded “from”: Lithuanian puts iš before kur (iš kur).";
const F_DUMMY = "Dummy “it” of the weather: merged with its verb (It's → Yra); the impersonal adverb has no subject.";
const F_HAD_BETTER = "“'d” (had) has no separate word here: verčiau (under “better”) carries the modal “had better”.";
const F_IS_ELL = "Elliptical “is” (it sure is lovely): Lithuanian repeats the verb yra.";

// ---------------------------------------------------------------------------
// State helpers

type Weather = "lovely" | "cold" | "hot" | "cloudy";
type Said = "nice" | "cold" | "hot" | "rain";
type Topic = "weekend" | "plans" | "week" | "from" | "live" | "job" | "where" | "like" | "how";

const W = (c: Ctx) => c.s.weather as Weather;
const MON = (c: Ctx) => c.s.day === "mon";
/** No new questions once the bus is here: Frank only waits for the goodbye. */
const canAsk = (c: Ctx) => !c.s.busHere;
const askedBackSeg = (seg: Segment | null | undefined) => !!seg?.tags.includes("askback");
/** Frank's lines in his previous turn (the engine keeps them until this turn ends). */
const prevLines = (c: Ctx): string[] => (((c as any).conv?.lastTurn ?? []) as { lineId: string }[]).map((l) => l.lineId);

// One reaction per learner turn: a sentence that arrives as several pieces gets one reply.
// The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

/** Every piece of the learner's current sentence: the engine parses the whole sentence before any
 *  handler runs ("Not yet. | Maybe I'll go to the beach." arrives as two pieces). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];
const turnTags = (c: Ctx): string[] => turnSegments(c).flatMap((sg) => sg.tags);

/** Everything the checklist needs before the goodbye counts. */
const coreDone = (c: Ctx) => !!c.s.weatherDone && !!c.s.weekendDone && (!!c.s.askedBack || !!c.s.turnSkipped) && (!!c.s.known || !!c.s.fromDone);

// --- weather ---------------------------------------------------------------

/** Which learner comments agree with Frank's weather. */
const FITS: Record<Weather, Said[]> = { lovely: ["nice", "hot"], cold: ["cold", "rain"], hot: ["hot", "nice"], cloudy: ["rain", "cold"] };
function saidOf(slots: any, seg: Segment | null): Said | null {
  if (slots?.wx) return slots.wx as Said;
  for (const k of ["nice", "cold", "hot", "rain"] as Said[]) if (seg?.tags.includes(k)) return k;
  return null;
}
/** The learner talked about the weather. `own`: the learner's own remark or tag question ("Nice day,
 *  isn't it?"), which Frank first agrees with ("It sure is!"). */
function wxReact(c: Ctx, said: Said | null, own: boolean) {
  const first = !c.s.weatherDone;
  c.s.weatherDone = true;
  if (!once(c, "wx")) return;
  const w = W(c);
  const fits = !said || FITS[w].includes(said);
  if (!first) { c.say(own && fits ? sureLine(c) : "ha_right"); return; }
  if (fits) {
    if (own) c.say(sureLine(c));
    c.say(said ? AGREE[said] : "wxa_" + w);
    return;
  }
  c.say(said === "nice" ? "wx_optimist" : said === "cold" ? "wx_you_cold" : said === "hot" ? "wx_you_hot" : "wx_you_rain");
}
/** "…, isn't it?" → "It sure is!"; "…, doesn't it?" → "It sure does!" */
const sureLine = (c: Ctx) => (/\b(does|doesn't|does not)\b/i.test(c.heard || "") ? "sure_does" : "sure_is");
const AGREE: Record<Said, string> = { nice: "wxa_lovely", cold: "wxa_cold", hot: "wxa_hot", rain: "wxa_cloudy" };
/** A temperature. Maple Harbor thinks in Fahrenheit; a number that can only be Celsius (below 40, or
 *  "minus …", or "Celsius" said) gets a kind conversion: "25? Oh, Celsius! That's about 77 here." */
function wxTemp(c: Ctx, slots: any, seg: Segment) {
  const raw = Number(slots?.number);
  if (!Number.isFinite(raw)) { wxReact(c, null, false); return; }
  const minus = seg.tags.includes("minus");
  const n = minus ? -raw : raw;
  const celsius = minus || seg.tags.includes("unit_c") || (!seg.tags.includes("unit_f") && n < 40);
  const f = celsius ? Math.round((n * 9) / 5 + 32) : n;
  if (celsius && Math.abs(n) <= 45 && once(c, "celsius")) {
    c.say(minus ? "temp_echo_minus" : "temp_echo", { c: Math.abs(n) });
    if (f > 0) c.say("temp_celsius", { f });
  }
  wxReact(c, f >= 85 ? "hot" : f >= 60 ? "nice" : "cold", !celsius && seg.tags.includes("tag"));
}
function wxNo(c: Ctx) {
  c.s.weatherDone = true;
  if (once(c, "wx")) c.say("wxn_" + W(c));
}
function expectWeather(c: Ctx) {
  const w = W(c);
  c.expect({ id: "weather", optional: true, expects: WX_INTENTS, hints: ["wx_" + w],
    suggest: [{ lt: w === "cloudy" ? "Atsakyti į „Looks like rain“" : "Pritarti arba pakalbėti apie orą (…, isn't it?)", hint: "wx_" + w }] });
}

// --- Frank's side of the story ------------------------------------------------

const TELL: Record<Topic, string> = {
  weekend: "frank_weekend", plans: "frank_plans", week: "frank_week", from: "frank_from", live: "frank_live",
  job: "frank_job", where: "frank_where", like: "frank_like", how: "frank_how",
};
/** Stories with a little more to tell when the learner shows interest. */
const MORE: Partial<Record<Topic, string>> = { weekend: "frank_weekend_more", plans: "frank_plans_more", week: "frank_week_more" };

/** The learner asked Frank about himself (asked = true), or Frank tells anyway (false). */
function tell(c: Ctx, topic: Topic, asked = true) {
  if (asked && topic !== "how") c.s.askedBack = true;
  if (c.s.told[topic]) { if (once(c, "told")) c.say("told_already"); return; }
  c.s.told[topic] = true;
  if (!once(c, "tell_" + topic)) return;
  c.say(TELL[topic]);
  if (MORE[topic] && canAsk(c)) { c.s.moreFor = topic; expectReact(c); }
}
/** After a story Frank waits for a reaction ("Oh, nice!", "Really?"), then adds a little more. */
function expectReact(c: Ctx) {
  const more = (cc: Ctx) => { tellMore(cc); };
  c.expect({ id: "react", optional: true, expects: ["interest", "same", "q_story"], hints: ["interest"],
    suggest: [{ lt: "Parodyti susidomėjimą („Oh, nice!“, „Really?“)", hint: "interest" }],
    on: { interest: more, same: more, q_story: more, g_ok: more },
    yes: more });
}
function tellMore(c: Ctx) {
  const tp = c.s.moreFor as Topic | null;
  if (tp && MORE[tp]) { c.s.moreFor = null; if (once(c, "more")) c.say(MORE[tp]!); return; }
  if (once(c, "int")) c.say("ha_right");
}
/** Frank asks a topic question; if he already told his own side, he just asks back. */
function askTopic(c: Ctx, topic: Topic, line: string, andYou: string) {
  c.s.lastTopic = topic;
  c.say(c.s.told[topic] ? andYou : line);
}
/** "And you?": the topic Frank asked about last. */
function askBack(c: Ctx) {
  const map: Record<string, Topic> = { weather: "how", new: "live", from: "from", week: "week", weekend: "weekend", plans: "plans", like: "like", how: "how" };
  let tp = map[c.s.lastTopic as string] as Topic | undefined;
  if (!tp || tp === "how") tp = c.s.weekendDone ? (MON(c) ? "weekend" : "plans") : c.s.weekDone ? "week" : "how";
  tell(c, tp);
}

// --- the week ------------------------------------------------------------------

const BUSY_LINE: Record<string, string> = { work: "busy_work", family: "busy_family", english: "busy_english", moving: "busy_moving", both: "busy_both" };
const busyKind = (tags: string[]) => ["work", "family", "english", "moving", "both"].find((k) => tags.includes(k));
function weekBusy(c: Ctx, seg: Segment | null) {
  c.s.weekDone = true; c.s.lastTopic = "week";
  if (!once(c, "weekreact")) { if (askedBackSeg(seg)) tell(c, "week"); return; }
  // "Very busy. Work, mostly.": the reason may come as a piece of its own
  const why = busyKind([...(seg?.tags ?? []), ...turnTags(c)]);
  if (why) c.say(BUSY_LINE[why]);
  else if (askedBackSeg(seg)) c.say(MON(c) ? "busy_monday" : "busy_friday");
  else if (canAsk(c) && !c.s.invited.week) {
    // a gentle invitation to say a little more (once)
    c.s.invited.week = true;
    c.say("busy_what");
    c.expect({ id: "busy_why", optional: true, expects: ["busy_why_ctx"], hints: ["busy_why"],
      suggest: [{ lt: "Pasakyti, kas tave užima", hint: "busy_why" }], on: {},
      yes: (cc) => { if (once(cc, "weekreact")) cc.say(MON(cc) ? "busy_monday" : "busy_friday"); },
      no: (cc) => { if (once(cc, "weekreact")) cc.say(MON(cc) ? "busy_monday" : "busy_friday"); } });
  } else c.say(MON(c) ? "busy_monday" : "busy_friday");
  if (askedBackSeg(seg)) tell(c, "week");
}
function weekQuiet(c: Ctx, seg: Segment | null) {
  c.s.weekDone = true; c.s.lastTopic = "week";
  if (once(c, "weekreact")) c.say("not_busy_react");
  if (askedBackSeg(seg)) tell(c, "week");
}
function busyWhy(c: Ctx, seg: Segment) {
  c.s.weekDone = true;
  if (once(c, "weekreact")) {
    const why = busyKind(seg.tags);
    c.say(why ? BUSY_LINE[why] : MON(c) ? "busy_monday" : "busy_friday");
  }
  if (askedBackSeg(seg)) tell(c, "week");
}

// --- the weekend (Monday: how was it; Friday: plans) -----------------------------

const ACT_LINE: Record<string, string> = {
  beach: "react_beach", home: "react_home", friends: "react_friends", party: "react_fun", work: "react_work", sport: "react_sport",
  shop: "react_fun", garden: "react_garden", fishing: "react_fishing", trip: "react_trip", fun: "react_fun", english: "busy_english",
  moving: "busy_moving", walk: "react_fun",
};
const actKind = (tags: string[]) => Object.keys(ACT_LINE).find((k) => tags.includes(k));
const wkTopic = (c: Ctx): Topic => (MON(c) ? "weekend" : "plans");
function weekendStart(c: Ctx) { c.s.weekendDone = true; c.s.lastTopic = wkTopic(c); }
/** "I went to the beach", "We're having a barbecue", "Hiking." */
function weekendAct(c: Ctx, seg: Segment) {
  weekendStart(c);
  if (once(c, "wk")) {
    const k = actKind(seg.tags);
    c.say(k ? ACT_LINE[k] : "react_fun");
  }
  if (askedBackSeg(seg) || SAID.get(c)?.has("askback_later")) tell(c, wkTopic(c));
}
const ACTIVITY = new Set(["wk_act_ctx", "act_ctx"]);
/** "Not yet. Maybe I'll go to the beach.", "Nothing special, I just stayed home.": when the same answer
 *  names an activity, Frank reacts to the activity and the general part says nothing of its own. */
function activityToo(c: Ctx, seg: Segment | null): boolean {
  if (!turnSegments(c).some((sg) => ACTIVITY.has(sg.intent))) return false;
  weekendStart(c);
  if (askedBackSeg(seg)) {
    // "…, and you?" on the general part: Frank answers after his reaction to the activity
    if (SAID.get(c)?.has("wk")) tell(c, wkTopic(c));
    else once(c, "askback_later");
  }
  return true;
}
/** "Great, thanks!", "Not bad, you?", "Yes, a few." (Friday): Frank gently asks for more. */
function weekendShort(c: Ctx, seg: Segment | null) {
  if (activityToo(c, seg)) return;
  weekendStart(c);
  if (!once(c, "wk")) return;
  if (seg?.tags.includes("short")) c.say("wk_short_react");
  if (askedBackSeg(seg)) { tell(c, wkTopic(c)); return; }
  inviteWeekend(c);
}
function weekendBad(c: Ctx, seg: Segment | null) {
  // being sick matters more than what the learner did
  if (!seg?.tags.includes("sick") && activityToo(c, seg)) return;
  weekendStart(c);
  if (once(c, "wk")) c.say(seg?.tags.includes("sick") ? "react_sick" : MON(c) ? "react_bad" : "react_none");
  if (askedBackSeg(seg)) tell(c, wkTopic(c));
}
function weekendNothing(c: Ctx, seg: Segment | null) {
  if (activityToo(c, seg)) return;
  weekendStart(c);
  if (once(c, "wk")) c.say(MON(c) ? "react_home" : "react_none");
  if (askedBackSeg(seg)) tell(c, wkTopic(c));
}
function weekendNotYet(c: Ctx, seg: Segment | null) {
  if (activityToo(c, seg)) return;
  weekendStart(c);
  if (once(c, "wk")) c.say(MON(c) ? "react_home" : "react_notyet");
  if (askedBackSeg(seg)) tell(c, wkTopic(c));
}
function inviteWeekend(c: Ctx) {
  const past = MON(c);
  if (!canAsk(c) || c.s.invited.weekend) { c.say("react_good"); return; }
  c.s.invited.weekend = true;
  c.say(past ? "wkp_what" : "wkf_what");
  c.expect({ id: past ? "wkp_what" : "wkf_what", optional: true,
    expects: ["wk_act_ctx", "act_ctx", "wk_nothing_ctx", "wk_notyet_ctx", "wk_bad_ctx"],
    hints: [past ? "weekend_what" : "weekend_plans"],
    suggest: [{ lt: past ? "Papasakoti, ką veikei" : "Papasakoti, ką veiksi", hint: past ? "weekend_what" : "weekend_plans" }],
    on: {},
    yes: (cc) => { if (once(cc, "wk")) cc.say("react_good"); },
    no: (cc) => { if (once(cc, "wk")) cc.say(past ? "react_home" : "react_none"); } });
}

// --- first visit: new here, names, where from ------------------------------------

function newAnswer(c: Ctx, isNew: boolean) {
  c.s.lastTopic = "new";
  if (c.s.newDone) { if (once(c, "new")) c.say("ok"); return; }
  c.s.newDone = true;
  if (once(c, "new")) c.say(isNew ? "welcome_hood" : "new_no_react");
  introFrank(c);
}
function introFrank(c: Ctx) {
  if (c.s.frankIntro || c.s.known) return;
  c.s.frankIntro = true;
  c.say("frank_intro");
  if (!canAsk(c) || c.s.named) return;
  c.expect({ id: "intro", optional: true, expects: ["nice_meet", "intro_name", "name_ctx", "bare_name_ctx"], hints: ["intro"],
    suggest: [{ lt: "Prisistatyti Frankui", hint: "intro" }],
    on: {
      nice_meet: (cc) => { named(cc, true); }, intro_name: (cc) => { named(cc, true); },
      name_ctx: (cc) => { named(cc, false); }, bare_name_ctx: (cc) => { named(cc, false); },
    } });
}
function named(c: Ctx, nice: boolean) {
  if (c.s.named) { if (nice && once(c, "nice")) c.say("nice_meet_too"); return; }
  c.s.named = true;
  if (once(c, "nice")) c.say(nice ? "nice_meet_too" : "nice_meet_you");
}
function fromAnswer(c: Ctx, slots: any, seg: Segment | null) {
  c.s.lastTopic = "from";
  if (c.s.fromDone) { if (once(c, "from")) c.say("ok"); return; }
  c.s.fromDone = true;
  if (!once(c, "from")) return;
  const ctry = ([] as string[]).concat(slots?.country ?? [])[0];
  const city = slots?.city as string | undefined;
  const lt = !!city || ctry === "lithuania";
  if (askedBackSeg(seg)) {
    // "I'm from Lithuania. And you?": a short reaction, then Frank's answer (no new question)
    c.say(city ? "from_city_short" : lt ? "from_lt_short" : "from_other", city ? { X: city } : ctry ? { X: ctry } : {});
    tell(c, "from");
    return;
  }
  if (city) c.say("from_city", { X: city });
  else if (lt) c.say("from_lt");
  else { c.say(ctry ? "from_other" : "from_unknown", ctry ? { X: ctry } : {}); return; }
  if (!canAsk(c)) return;
  c.expect({ id: "winter", optional: true, expects: ["winter_yes_ctx", "winter_no_ctx"], hints: ["winter"],
    suggest: [{ lt: "Papasakoti apie žiemas Lietuvoje", hint: "winter" }],
    on: {}, yes: (cc) => { if (once(cc, "winter")) cc.say("winter_yes_react"); }, no: (cc) => { if (once(cc, "winter")) cc.say("winter_no_react"); } });
}

// --- the goodbye ------------------------------------------------------------

function goodbye(c: Ctx) {
  if (c.s.byeDone || !once(c, "goodbye")) return;
  if (!c.s.busHere) {
    const conv = (c as any).conv;
    if (conv?.nextStep && !conv.nextStep(c)) {
      // nothing left to talk about: the bus comes right now, and this is the goodbye
      c.s.__finished = true;
      busArrives(c);
    } else {
      // "I'd better get going" before the bus comes: once Frank laughs it off, the second time he lets go
      if (!c.s.earlyWarned) { c.s.earlyWarned = true; if (once(c, "early")) c.say("bus_not_here"); return; }
      c.s.byeDone = true; c.say("early_bye"); c.end(); return;
    }
  }
  c.s.byeDone = true;
  if (coreDone(c)) c.complete();
  const h = c.heard || "";
  const nice = /\b(nice|great|good|lovely|fun)\b.*\b(talking|chatting|talk|chat|speaking|see(ing)? you|meet(ing)? you)\b|\byou too\b|\blikewise\b/i.test(h);
  const wish = /\b(have a|enjoy|good luck|say hi|take care)\b/i.test(h);
  if (c.s.busFrank) {
    if (wish) c.say("bye_thanks");
    c.say("frank_see_you");
  } else if (nice) c.say(MON(c) ? "bye_you_too" : "bye_you_too_wk");
  else if (wish) c.say("bye_thanks");
  else c.say(MON(c) ? "bye_plain" : "bye_plain_wk");
  c.end();
}
function expectClosing(c: Ctx) {
  const bye = (cc: Ctx) => { goodbye(cc); };
  const his = !!c.s.busFrank;
  const p: Pending = {
    id: "closing", expects: ["leave", "nice_talk", "bye_wish", "nice_meet", "g_bye", "g_thanks"], hints: [his ? "bye_reply" : "bye"],
    suggest: [{ lt: his ? "Atsisveikinti su Franku („You too! Have a good one!“)" : "Mandagiai atsisveikinti („I'd better get going…“)", hint: his ? "bye_reply" : "bye" }],
    on: { leave: bye, nice_talk: bye, bye_wish: bye, nice_meet: bye, g_bye: bye, g_thanks: bye },
    // anything else: Frank hurries the learner along (twice), then says goodbye himself
    ask: (cc) => {
      cc.s.hurry = (cc.s.hurry ?? 0) + 1;
      if (cc.s.hurry > 2) { cc.s.byeDone = true; cc.say(his ? "frank_see_you" : MON(cc) ? "bye_plain" : "bye_plain_wk"); cc.end(); return; }
      cc.say(his ? "frank_wave" : "bus_hurry");
    },
  };
  c.expect(p);
}

// Intents that answer Frank's weather remark
const WX_INTENTS = ["wx_agree", "wx_adj", "wx_short_ctx", "wx_extra", "wx_hope", "wx_neg", "wx_dislike", "no_umbrella", "wx_temp", "wx_temp_ctx"];
const ASK_FRANK = ["ask_back", "q_weekend", "q_plans", "q_week", "q_from", "q_live", "q_job", "q_where"];

// Automatic answers the simulation uses when Frank asks one of his (optional) questions.
const AUTO: Record<string, string> = {
  weather: "Yes, it's beautiful!", new_q: "Yes, I just moved here.", intro: "Nice to meet you, Frank! I'm Tomas.",
  from_q: "I'm from Lithuania.", winter: "Yes, very cold!", week: "Yes, very busy.", busy_why: "Work, mostly.",
  weekend_past: "It was great! I went to the beach.", wkp_what: "I visited my friends.", weekend_plans: "I'm going to the beach.",
  wkf_what: "I'm visiting my family.", your_turn: "Sorry! How about you?", react: "Oh, nice!", rain: "Thanks, that's so kind!",
  like_q: "I love it here!", closing: "I'd better get going. Nice talking to you!",
};
/** An answer map without some keys: those questions are then answered by the sim's own turns. */
const except = (a: Record<string, string>, ...keys: string[]) => Object.fromEntries(Object.entries(a).filter(([k]) => !keys.includes(k)));
const AUTO_SHORT: Record<string, string> = {
  howareyou: "Good, thanks.", weather: "Yeah!", new_q: "Yes.", intro: "Tomas.", from_q: "Lithuania.", winter: "Yes.", week: "Yes.",
  busy_why: "Work.", weekend_past: "Good.", wkp_what: "Nothing much.", weekend_plans: "Yes.", wkf_what: "The beach.", your_turn: "And you?",
  react: "Really?", rain: "Thanks!", like_q: "Great!", closing: "Bye!",
};
const AUTO_BACK: Record<string, string> = {
  ...AUTO, weather: "It sure is! How are you?", from_q: "I'm from Lithuania. And you?", week: "Crazy busy! How about you?",
  weekend_past: "Not bad, you?", weekend_plans: "Nothing special. What about you?", react: "Really? Wow!", like_q: "I love it here! And you?",
};
const AUTO_TWIST: Record<string, string> = {
  ...AUTO, rain: "No, thanks, I have one.", like_q: "Again? Typical! But I love it here.", closing: "You too! Have a good one!",
};

// ---------------------------------------------------------------------------

export const smallTalk: SituationDef = {
  id: "s33-small-talk",
  song: 33,
  songTitle: "Lovely Weather",
  title: { en: "Lovely Weather", lt: "Puikus oras" },
  topic: { en: "Small talk", lt: "Pasišnekėjimas" },
  chapter: 5,
  order: 6,
  location: "bus-stop",
  npc: "frank",
  goal: "Pasišnekėk su kaimynu apie orą ir savaitgalį, o atvažiavus autobusui mandagiai atsisveikink.",
  intro: "Rytas Ąžuolų alėjoje, autobuso stotelėje. Čia jau laukia Frankas – kaimynas pensininkas, kuris mėgsta pasikalbėti apie orus. Palaikyk pokalbį: atsakyk, paklausk jo atgal („And you?“) ir parodyk susidomėjimą.",
  entities: { country: COUNTRIES, city: CITIES },

  grammar: {
    macros: {
      // asking back at the end of an answer ("Not bad, you?", "Great, and you?")
      ab: "((and | so | how about | what about) (you | yourself | yours | your weekend | your week) | you) #askback",
      // tag questions ("…, isn't it?", "…, right?")
      tagq: "(is not it | is it not | does not it | was not it | are not they | right | huh | eh | do not you think) #tag",
      deg: "(so | really | very | pretty | quite | a bit | a little | kind of | super | absolutely | too | still | just | a little bit | real)",
      approx: "(about | around | almost | nearly | maybe | like | only | already | over | under | just | more than | less than | at least | probably | roughly)",
      wx_when: "(today | this morning | out | outside | out there | again | now | already | for (me | september | this time of year))",
      when_wk: "(this weekend | on the weekend | over the weekend | on saturday | on sunday | saturday | sunday | tomorrow | tonight | on friday night | this saturday | this sunday | all weekend | the whole weekend | on saturday and sunday | last weekend | yesterday)",
      moved_when: "(last (week | month | year | summer | spring | fall | winter) | in the (summer | spring | fall | winter) | in {month} | (a | one | two | three | four | five | six | a few | a couple of | {number}) (weeks | months | days | week | month) ago | recently | this (month | summer | week | year) | yesterday)",
      who: "[my | our | some | old | the] (friends | friend | family | parents | mom | dad | mother | father | kids | children | grandchildren | grandkids | sister | brother | son | daughter | cousins | relatives | neighbors | husband | wife | boyfriend | girlfriend | in laws | family and friends)",
      subj: "(i | we | my family and i | my wife and i | my husband and i | me and my (family | wife | husband | kids | friends))",
      fut: "(i am going to | we are going to | i will | we will | i want to | we want to | i would like to | i might | we might | i plan to | we plan to | i am planning to | we are planning to | i hope to | we hope to | maybe | probably | i think i will | i will probably | we will probably | i have to | we have to | i need to | i will just | i am just going to)",
      be: "(i am | we are | i am just | we are just)",
      // activities, base form (past and -ing forms match through word-form tolerance)
      act: [
        "(go | went) to the (beach | sea | ocean | seaside | lake | coast | shore) [with @who] #beach",
        "(go | went) (swimming | surfing | to the pool) #beach",
        "(stay | stayed) (home | at home | in) #home",
        "(relax | relaxed | rest | rested | chill | chilled | take it easy | took it easy | sleep | slept | sleep in | slept in) [a lot | at home | a little | all weekend] #home",
        "(do | did) nothing [special] #home",
        "(watch | watched) (tv | movies | a movie | films | a film | netflix | series | a series | football | the game | basketball | some movies | some tv) [at home] #home",
        "(read | read a book | read books | read a lot) #home",
        "(clean | cleaned) [the | my | our] (house | apartment | flat #tip:us_apartment | garage | kitchen | home) #home",
        "(visit | visited | see | saw | meet | met | spend time with | spent time with | have dinner with | had dinner with | hang out with | hung out with | go out with | went out with | call | called) @who #friends",
        "(have | had) (friends | guests | people | family | the kids | the grandkids) over #friends",
        "(have | had) a (party | barbecue | bbq | cookout | dinner party | picnic | birthday party | family dinner) #party",
        "(go | went) to [a | my | my friends | a friends | my sisters | my brothers | my daughters | my sons] (party | wedding | birthday party | concert | festival | game | baseball game | football game | show | barbecue) #party",
        "(work | worked | was working | were working) [all weekend | the whole weekend | on saturday | on sunday | a lot | overtime] #work",
        "(go | went) (hiking | running | cycling | biking | for a run | to the gym | kayaking | sailing | climbing | skating | for a bike ride | jogging) #sport",
        "(play | played) (basketball | soccer | football #tip:us_soccer | tennis | golf | volleyball | baseball) #sport",
        "(run | ran) a (race | marathon | half marathon) #sport",
        "(go | went) shopping #shop",
        "(go | went) to the (mall | store | supermarket | shops | outlet) #shop",
        "(buy | bought) [some | a few] (things | clothes | shoes | stuff) #shop",
        "(work | worked) in the (garden | yard) #garden",
        "(do | did) [some] (gardening | yard work) #garden",
        "(plant | planted) (flowers | trees | tomatoes | vegetables) #garden",
        "(go | went) fishing #fishing",
        "(go on | went on | take | took) a (trip | day trip | road trip | short trip | little trip) #trip",
        "(go | went | drive | drove) (to the mountains | to the city | to boston | to new york | to portland | out of town | camping | away | to the countryside) #trip",
        "(go | went) to the (movies | cinema #tip:us_movies | theater) #fun",
        "(see | saw) a (movie | film | show | play) #fun",
        "(go | went) to (the farmers market | church | the park | the zoo | the museum | a museum | a restaurant | a bar | the library | the market) #fun",
        "(cook | cooked | bake | baked) (a lot | dinner | a cake | cookies | bread | for my family | for friends) #fun",
        "(study | studied | learn | learned | practice | practiced) english #english",
        "(do | did) my [english] homework #english",
        "(move | moved | unpack | unpacked) [boxes | to a new apartment] #moving",
        "(go | went) for a (walk | long walk | walk in the park | walk on the beach | walk with my dog) #walk",
        "(walk | walked) (in the park | on the beach | the dog | my dog) #walk",
        "(be | was | were) in (boston | new york | the city | the mountains | chicago | portland) #trip",
        "(be | was | were) (at home | home) [all weekend] #home", "(be | was | were) at work #work", "(be | was | were) at the (beach | lake | sea | seaside) #beach",
      ],
      // short noun answers ("The beach.", "Hiking.", "Family stuff.")
      act_n: [
        "[the] (beach | sea | ocean | lake | seaside) #beach",
        "(swimming | surfing) #beach",
        "(home | at home | relaxing | rest | resting | sleeping | sleep | netflix | movies at home | tv) #home",
        "(friends | my friends | family | my family | my parents | the kids | my kids | the grandkids | my grandkids | family time | family stuff) #friends",
        "[a] (party | barbecue | bbq | cookout | wedding | concert | picnic | birthday party | festival) #party",
        "(work | working | more work | just work) #work",
        "(hiking | running | cycling | biking | the gym | gym | tennis | golf | basketball | soccer | football #tip:us_soccer | yoga | kayaking | sailing) #sport",
        "(shopping | the mall) #shop",
        "(gardening | the garden | yard work | my garden) #garden",
        "fishing #fishing",
        "[a] (trip | road trip | day trip | little trip) #trip",
        "(the movies | a movie | movies | church | the farmers market | the market | a museum | the museum) #fun",
        "(english | english homework | studying | studying english) #english", "(cooking | baking) #fun",
        "(moving | unpacking) #moving",
        "(a walk | walks | long walks | walking) #walk",
      ],
      wk_eval: "[it was | my weekend was | the weekend was] [@deg] (good | great | nice | fine | lovely | wonderful | amazing | fantastic | awesome | relaxing | quiet | busy | fun | perfect | not bad | okay) [thanks | thank you]",
      by_sea: "[it is] (by | on | near) the (sea | coast | baltic sea | baltic)",
      // "Very busy, I have English classes."
      busy_tail: "(i have | with | because of) (english classes #english | english lessons #english | my english classes #english | school #english | exams #english | the kids #family | my kids #family | my family #family | a new job #work | a lot of work #work | lots of work #work | work #work | moving #moving)",
      // "with my family", "in Boston", "at my friend's house"
      act_tail: "(with @who | in (boston | new york | the city | portland | chicago | the park) | at (my | a) (friends | parents | sisters | brothers | daughters | sons | moms) (house | place))",
    },
    slots: {
      wx: { lexicon: [
        { id: "nice", forms: ["lovely", "beautiful", "nice", "gorgeous", "perfect", "wonderful", "amazing", "fantastic", "sunny", "warm", "glorious", "pleasant", "brilliant", "awesome", "bright", "clear", "nice and warm", "nice and sunny"] },
        { id: "cold", forms: ["cold", "chilly", "freezing", "frosty", "windy", "fresh", "freezing cold", "cold and windy"] },
        { id: "hot", forms: ["hot", "boiling", "humid", "sticky", "scorching", "boiling hot"] },
        { id: "rain", forms: ["rainy", "cloudy", "gray", "grey", "gloomy", "overcast", "wet", "stormy", "dark", "dull", "foggy", "misty"] },
      ] },
      month: { lexicon: MONTHS.map((m, i) => ({ id: String(i + 1), forms: [m] })) },
    },
  },

  intents: {
    // --- the weather ----------------------------------------------------------
    // agreeing with Frank's remark ("It sure is!", "I know, right?", "It does, doesn't it?")
    wx_agree: { patterns: [
      "it (sure | really | certainly | definitely | totally) (is | does) [@tagq] #h:w_sure_is",
      "it (is | does) [@tagq] #h:w_does_tag",
      "sure (is | does)",
      "i know right #h:w_know_right", "i know",
      "(you bet | tell me about it | totally | indeed | you are right | you are so right | i agree | i totally agree | yes indeed | oh yes)",
      "is not it", "is it not", "does not it",
    ] },
    // weather statements and the learner's own tag questions ("Nice day, isn't it?")
    wx_adj: { patterns: [
      "(it is | it is getting | it got | the weather is | it has been | the weather has been | it feels) [@deg] {wx} [@wx_when] [@tagq] #h:w_beautiful",
      "[@deg] {wx} (day | morning | weather | one | out | outside) [@wx_when] [@tagq]",
      "(what | such) a [@deg] {wx} (day | morning) [@tagq]",
      "i know [it is] [@deg] {wx} [@wx_when]",
      "(it | the sky) (looks | seems) [@deg] {wx} [@wx_when] [@tagq]",
      "(great | fine) (weather | day | morning) [@wx_when] [@tagq] #nice", "(it is | the weather is) [@deg] (great | fine) [@wx_when] [@tagq] #nice",
      "(it | the sky) looks like (rain | it is going to rain | it will rain | a storm) [@tagq] #rain",
      "(looks | it looks) like rain [@tagq] #rain",
      "[it is] [much | a lot | way | so much | a bit | a little] (warmer #nice | nicer #nice | better #nice | sunnier #nice | colder #cold | cooler #cold | chillier #cold | hotter #hot) than yesterday [@tagq] #h:w_than_tag",
      "it is (going to | gonna) rain [soon | later | today] [@tagq] #rain",
      "it (will | might | may | could) rain [soon | later | today] [@tagq] #rain", "it is raining [soon | later | already] [@tagq] #rain",
      "(it is | what | such) a [@deg] {wx} (day | morning) [@wx_when] [@tagq]",
    ] },
    // a bare adjective, only as an answer to Frank's remark ("Yeah, beautiful!", "So cold!")
    wx_short_ctx: { patterns: [
      "[brr | brrr] [@deg] {wx} [@wx_when]",
      "[@deg] (cool | a bit cool | pretty cool) [@wx_when] #cold", "(brr | brrr) #cold",
    ] },
    wx_extra: { patterns: [
      "(finally | at last) [some] (sun | sunshine | good weather | nice weather | blue sky | blue skies) #nice #h:w_finally_sun",
      "(perfect | great | nice) [day | weather] for (a walk | the beach | walking | a picnic | fishing) #nice",
      "not a cloud in the sky #nice", "the sun is (shining | out | back) [@wx_when] #nice",
      "i (love | like | really love | really like | enjoy) [this | the | this kind of] (weather | sun | sunshine | sunny weather | warm weather | days like this) #nice #h:w_love",
      "i (love | like) [the] (cold | cold weather | snow | winter | fall | autumn #tip:us_fall | cool weather) #cold",
      "i (love | like) [the] (rain | rainy weather | rainy days) #rain",
      "i (love | like) [the] (heat | hot weather | summer) #hot",
      "(i am | i am so | i am really) (freezing | cold) #cold",
      "i need a [warmer] (jacket | coat | sweater | hat | scarf) #cold #h:w_jacket",
      "winter is coming #cold", "(fall | autumn #tip:us_fall) is (here | coming) #cold",
      "(i am | i am so | i am really) (melting | sweating | dying) #hot #h:w_melting",
      "summer is (back | here) #hot",
      "i (brought | have | have got) (my | an) umbrella #umbrella",
      "[but] i (like | love | do not mind) it",
    ] },
    wx_hope: { patterns: [
      "[well] not today [i hope] #h:w_not_today", "i hope not today",
      "(i | let us | we) hope not #h:w_hope_not", "hopefully not", "[well] not yet",
      "i hope it (does not | will not) rain [today]", "i hope it (stays | will stay) (dry | sunny | nice)",
      "fingers crossed", "i hope the (bus | sun) comes (first | soon)",
    ] },
    wx_neg: { patterns: [
      "[it is] not [so | that | very | too | really] {wx} [@wx_when]",
      "i do not think it (will | is going to) rain", "it (will not | is not going to) rain [today]", "no rain today",
      "not for me", "[it is] not (so | that | too) bad [@wx_when]",
    ] },
    wx_dislike: { patterns: [
      "i (do not | really do not | do not really) (like | love) [the | this] (weather | cold #cold | rain #rain | heat #hot | snow #cold | wind #cold | cold weather #cold | rainy weather #rain | hot weather #hot | gray weather #rain | winter #cold | humidity #hot) #h:w_dislike",
      "i hate [the | this] (weather | cold #cold | rain #rain | heat #hot | snow #cold | wind #cold | winter #cold | humidity #hot)",
      "i am not a fan of [the] (cold #cold | rain #rain | heat #hot | winter #cold)",
      "(the cold #cold | the rain #rain | the heat #hot) is not (for me | my thing)",
    ] },
    // "It's about 75 degrees." (Fahrenheit here; a number that is clearly Celsius gets converted kindly)
    wx_temp: { patterns: [
      "[it is | it was | the temperature is | it feels like | my phone says | the radio says | it says] [@approx] {number} (degrees [fahrenheit #unit_f | celsius #unit_c | outside | out | today | already | now | this morning] | fahrenheit #unit_f | celsius #unit_c) [@tagq] #h:w_temp",
      "[it is | it was | the temperature is | it feels like] [@approx] minus {number} [degrees] [celsius] [@wx_when] #minus",
    ] },
    // "It's about 75.", "About 70." (only as an answer to Frank's weather remark)
    wx_temp_ctx: { patterns: ["it is [@approx] {number} [@wx_when] [@tagq]", "@approx {number} [@wx_when]"] },
    no_umbrella: { patterns: [
      "i (do not | did not) (have | bring) [an | my | any] umbrella [today | with me] #h:w_no_umbrella",
      "i (forgot | left) my umbrella [at home]", "[and] i have no umbrella", "no umbrella [today]",
    ] },

    // --- first visit: new here, names, where from --------------------------------
    new_yes: { patterns: [
      "i [just | recently] moved (here | in | to maple harbor | to this neighborhood | to the neighborhood | to oak avenue | to maple street | to this street) [@moved_when] [from {country}] [and i (love | like) it] [(i am | my name is) {name}] #h:n_moved",
      "(i am | we are) (new | new here | new in town | new around here | new in the neighborhood | the new neighbors | still new) [@moved_when] [(i am | my name is) {name}] #h:n_new",
      "(i | we) moved (here | in) @moved_when #h:n_last_month",
      "(i | we) (arrived | came) [here] @moved_when",
      "i have [only | just] been here [for] (a few | two | three | four | {number} | a couple of) (days | weeks | months) [now]",
      "[only | just] (a few | two | three | four | {number} | a couple of) (days | weeks | months) [now]",
      "i live (on maple street | on oak avenue | around the corner | down the street | nearby | here) now",
      "i live (on maple street | on oak avenue | around the corner | down the street | nearby | in the (white | green | yellow | red | gray) house)",
      "i (live | am living | have lived | have been) here since ({month} | the summer | the spring | last month | last week)",
      "i am here [only | just] [for] (a few | two | three | four | {number} | a couple of) (days | weeks | months) [now]",
      "kind of i moved here @moved_when",
    ] },
    new_no: { patterns: [
      "i have (lived | been) here [for] (a year | a long time | many years | years | ages | a while | {number} years | a few years | over a year) [already | now] #h:n_no",
      "i am not new [here | in town]",
      "(i | we) (moved | came) here (a | one | two | three | {number} | a few | many) years ago",
      "i (grew up | was born) here", "i am from (here | around here | maple harbor | this town)", "i am a local",
      "(i | we) (moved | came) here (a long time | ages | years | many years) ago",
      "i have been here (a while | a long time | for a while | for years | for a long time)",
    ] },
    // "Last year.", "Two months ago." (to "Are you new around here?")
    new_when_ctx: { patterns: ["[only | just] @moved_when"] },
    nice_meet: { patterns: [
      "[it is] (nice | good | great | glad | pleased | happy) to meet you [too | as well] #h:in_too",
      "(nice | good | great) meeting you [too]", "[a] pleasure to meet you", "the pleasure is mine", "likewise",
    ] },
    intro_name: { patterns: [
      "(nice | good | great | glad | pleased | happy) to meet you [too] [frank] (i am | my name is | i am called) {name} #h:in_nice",
      "(i am | my name is) {name} [and] (nice | good | great | glad | pleased | happy) to meet you [too]",
      "my name is {name}", "(call me | you can call me | everyone calls me) {name}", "(hi | hello | hey | @greet) [frank] (i am | my name is) {name}",
    ] },
    name_ctx: { patterns: ["(i am | my name is | it is | this is | call me) {name}"] },
    bare_name_ctx: { patterns: ["{name}"] },
    from_ans: { patterns: [
      "[i am] [originally] from {country} [originally] [@ab] #h:f_from",
      "i (come | am) [originally] from {country} [@ab]",
      "i am {country} [@ab] #h:f_nat",
      "(i was born | i grew up) in {country} [but i live here now] [@ab]",
      "[i am] [originally] from {city} [in {country}] [@by_sea] [@ab] #h:f_city",
      "i (come | am) [originally] from {city} [@ab]",
      "[i am] from a [small | little | big] (town | village | city) (in | near) {country} [@ab]",
      "my (country | home country | homeland | home) is {country} [@ab]",
      "[i am] from {country} [it is] (in | a country in) (europe | eastern europe | northern europe | the baltics) [@ab]",
      "(i | we) live here [now] but (i am | we are) [originally] from {country} [@ab]",
    ] },
    from_ctx: { patterns: [
      "[from] {country} [originally] [(near | next to | close to) {c2:country}] [@ab]", "[from] {city} [@by_sea] [@ab]", "[from] {city} [in] {country} [@by_sea] [@ab]",
      "[from] [a] [small | little | big] (town | village | city) (in | near) {country} [@ab]",
      "[from] {city} [it is] the capital [of {country}] [@ab]",
      "[from] {country} [it is] a [small | little | beautiful | nice] country [@by_sea | in (europe | the baltics | northern europe)] [@ab]",
    ] },
    from_other_ctx: { patterns: ["[i am] [originally] from {w:any}", "i come from {w:any}"] },
    winter_yes_ctx: { patterns: [
      "[@deg] (cold | snowy | long | dark | hard | freezing | cold and dark | long and cold) [in winter] #h:wi_cold",
      "(it is | they are | winters are | the winters are) [@deg] (cold | long | dark | snowy | freezing | hard)",
      "[sometimes] (minus | below zero | minus twenty | minus thirty | minus {number}) [degrees] [sometimes | in winter]",
      "[and] (a lot of | lots of | so much) snow #h:wi_snow", "(very | really)? cold and (a lot of | lots of) snow",
      "colder than here", "(too | very) cold for me", "i know right",
    ] },
    winter_no_ctx: { patterns: [
      "not (so | that | too | very) (bad | cold) [actually | now] #h:wi_not_bad",
      "(not really | it depends | not anymore | not like before)",
      "(warmer | milder) than (before | you think | people think)",
      "(the winters | winters | they) are (not so bad | okay | mild | warm | not so cold) [now | actually]",
      "about the same [as here]", "[it is okay | they are okay] i am used to it",
    ] },

    // --- the week -------------------------------------------------------------------
    week_busy_ctx: { patterns: [
      "[@deg] busy [@busy_tail] [@ab] #h:wk_busy",
      "(it was | it is | it has been | it is going to be | it will be | i am | i was | i have been) [@deg] busy @busy_tail [@ab]",
      "(crazy | super | insanely) busy [@ab] #h:wk_crazy", "busy busy [busy] [@ab]",
      "(it was | it is | it has been | it is going to be | it will be | i am | i was | i have been) [@deg] busy [@ab]",
      "(lots of | a lot of | so much | too much) (work | things to do | stuff) [@ab] #work #h:wk_work",
      "(very | very much | so much | extremely) [@ab]",
      "(i | we) (worked | have been working | had to work) (a lot | so much | every day | late) [@ab] #work",
      "(too | way too) busy [@ab]", "[very | super] hectic [@ab]",
      "[@deg] busy (at work | with work) [@ab] #work",
      "[@deg] busy with (the kids | my kids | my family | family) [@ab] #family",
      "[@deg] busy with (english | my english classes | school | my studies) [@ab] #english",
      "[@deg] busy with (moving | the move | boxes) [@ab] #moving",
    ] },
    week_quiet_ctx: { patterns: [
      "(not really | not at all | not too bad | not so bad | not that busy | not very busy | not too busy) [@ab] #h:wk_quiet",
      "[pretty | quite | very | really] (quiet | relaxed | calm | easy | slow) [@ab]",
      "(it was | it is | it has been) [pretty | quite | very] (quiet | relaxed | calm | easy | okay | fine | good | normal) [@ab]",
      "(the usual | normal | same as always | nothing special) [@ab]",
      "not bad [@ab] #h:wk_not_bad", "i hope not [@ab]",
      "[no] not [so | that | very | too] busy [at all] [no] [@ab]", "(i am | i was | it was | it is | i have been) not [so | that | very | too] busy [at all] [@ab]",
    ] },
    busy_why_ctx: { patterns: [
      "[mostly | just] (work | my job | the job | the office | my work) [mostly] [@ab] #work #h:bw_work",
      "[mostly | just] (family | my family | the kids | my kids | kids | the children | my children | my son | my daughter | the grandkids) [mostly] [@ab] #family #h:bw_kids",
      "both [work and family] [@ab] #both #h:bw_both", "(work and family | family and work | a bit of both | a little of both | everything) [@ab] #both",
      "[my] english (classes | lessons | course | homework) [@ab] #english #h:bw_english", "(school | my studies | studying | classes | exams) [@ab] #english",
      "(moving | the move | unpacking | my new apartment | the new apartment) [@ab] #moving",
      "[mostly] (family | kids | school | work) (stuff | things) [@ab] #family", "[a | my] new job [@ab] #work",
      "(work | my job) and (english | english classes | my english classes | school | the kids | my kids | family) [@ab] #work",
    ] },

    // --- the weekend (Monday: how was it; Friday: plans) ------------------------------
    wk_act_ctx: { patterns: [
      "[@wk_eval] @subj [just | mostly | also | finally] @act [@act_tail] [(and | then) [i | we] @act] [@when_wk] [@ab] #h:wp_did",
      "[@wk_eval] @fut @act [@act_tail] [(and | then) @act] [@when_wk] [@ab] #h:wf_did",
      "[@wk_eval] @be @act [@act_tail] [(and | then) @act] [@when_wk] [@ab] #h:wf_did",
      "(my | our) (friends | family | parents | kids | grandkids) (visited | came over | came to visit | are visiting | are coming) [@when_wk] [@ab] #friends",
    ] },
    act_ctx: { patterns: ["[just | mostly | probably | maybe | a little | some] @act_n [(and | or) @act_n] [@act_tail] [@when_wk] [@ab]"] },
    wk_good_ctx: { patterns: [
      "@wk_eval [@ab] #h:wp_great",
      "[it was] (too | so | way too) short [@ab] #short #h:wp_short",
      "[it was] (a lot of | lots of) fun [@ab]",
      "(great | good | nice | lovely | relaxing) weekend [thanks] [@ab]",
    ] },
    wk_bad_ctx: { patterns: [
      "[it was] (not so good | not very good | not too good | not good | not great | not the best | bad | terrible | awful | horrible | boring | so so | pretty bad) [@ab]",
      "(i was | we were) (sick | ill) [all weekend | the whole weekend] [@ab] #sick",
      "(i | we) had a cold [@ab] #sick", "my (son | daughter | kid | kids | husband | wife | mom | dad) (was | were) sick [@ab] #sick",
      "it rained (all weekend | the whole weekend) [@ab]",
    ] },
    wk_nothing_ctx: { patterns: [
      "(nothing | not much | nothing special | nothing much | not a lot | nothing really | the usual) [really] [@ab] #h:wp_nothing",
      "(i | we) did not do (much | anything | a lot | anything special) [@ab]",
      "(i | we) did not go (anywhere | out) [@ab]",
      "[no | not really] [big] plans [yet] [@ab] #h:wf_none",
      "(i | we) do not have [any] plans [yet] [@ab]",
      "(i am | we are) not (doing | planning) anything [special] [@ab]",
      "(i am | we are) not going anywhere [@ab]",
      "nothing [special] planned [yet] [@ab]", "(i | we) have no plans [yet] [@ab]",
    ] },
    wk_yes_ctx: { patterns: [
      "(a few | a couple | a lot | lots | big plans | many plans | a few things | some plans | some things | a couple of things) [@ab]",
      "i have [some | a few | big | lots of] plans [@ab]",
    ] },
    wk_notyet_ctx: { patterns: [
      "not yet [@ab] #h:wf_notyet", "i do not know yet [@ab] #h:wf_notyet", "i am not sure yet", "(we | i) will see",
      "it depends [on the weather]", "maybe", "not sure yet", "no idea yet", "i have not decided yet", "[i am] still thinking about it",
    ] },

    // "Pretty good. You?" (the shared how-are-you answer needs "and you")
    howru_you: { patterns: ["[i am] [doing] [pretty | really | very] (good | fine | great | well | okay | all good | not bad) [thanks | thank you] you"] },

    // --- asking Frank about himself --------------------------------------------------
    ask_back: { patterns: [
      "(and | so | how about | what about) (you | yourself) [frank] #h:b_and_you #h:b_how_about", "(and | what about | how about) yours",
      "[sure | of course | yes] tell me [about (it | your weekend | your plans | your week)]",
    ] },
    q_weekend: { patterns: [
      "[and] how was your weekend #h:b_weekend", "(did you have | did you have a) [good | nice | great] weekend",
      "what did you do [(on | over | this | last) [the] weekend]", "how was yours", "how was the weekend",
    ] },
    q_plans: { patterns: [
      "[and] [do you have] any plans for the weekend #h:b_plans", "have you got any plans [for the weekend] #tip:uk_have_got",
      "(any | do you have any) [big] plans", "what are you doing (this | on the | over the) weekend",
      "what are your plans [for the weekend]", "are you doing anything (fun | special | nice) [this | on the] weekend",
    ] },
    q_week: { patterns: [
      "[and] busy week #h:b_week", "(was | is) your week busy", "how (is | was) your week [going]",
      "(are | were) you busy [this week]", "how is the week going",
    ] },
    q_from: { patterns: [
      "are you from (here | around here | maple harbor) #h:b_from", "where are you from [originally]", "were you born here", "did you grow up here",
    ] },
    q_live: { patterns: [
      "how long have you lived here", "do you live (here | around here | nearby | near here | close by | on this street)", "where do you live",
      "have you lived here long", "how long have you been here",
    ] },
    q_job: { patterns: ["are you retired", "what do you do [for work]", "do you [still] work", "what did you do (before | for work)", "what was your job"] },
    q_where: { patterns: [
      "where are you (going | off to | headed) [today]", "are you going (downtown | to town | shopping)",
      "which bus are you (waiting for | taking)", "are you taking the bus [too]",
    ] },
    q_forecast: { patterns: [
      "is it going to rain [today | later]", "will it rain [today | later]", "what is the [weather] forecast [for today]",
      "what is the weather going to be like", "is it going to be (nice | sunny | hot | cold | warm) [later | today | this afternoon | tomorrow]",
      "what does the (radio | forecast | weather app) say",
    ] },
    q_bus: { patterns: [
      "when is the [next] bus [coming]", "is the bus (late | coming | on time)", "how often does the bus come",
      "what time is the [next] bus", "is the bus usually late", "has the bus (come | gone | left) [already]", "did i miss the bus", "where is the bus",
    ] },
    q_story: { patterns: [
      "did you catch (anything | a fish | any fish | a big one)", "what did you catch", "how old is (your grandson | he)",
      "(is it | is she) a big boat", "what kind of boat [is it]", "you have a boat", "where is (your | the) boat",
      "is it hard work", "what does she say", "is she right", "really every day",
    ] },
    q_name: { patterns: ["what is your name", "sorry what was your name"] },

    // --- reactions ------------------------------------------------------------------
    interest: { patterns: [
      "[oh] (nice | how nice | cool | how cool | lovely | how lovely | fun | how fun | wow | awesome | wonderful | amazing | fantastic | interesting | sweet | how sweet | cute) #h:i_nice",
      "[oh] really #h:i_really", "(seriously | no way | wow really)",
      "(that | it) (sounds | is) [@deg] (fun | great | nice | lovely | cool | interesting | wonderful | amazing | awesome | funny | good | exciting | relaxing | beautiful | perfect | sweet) #h:i_sounds_fun",
      "sounds (fun | great | nice | lovely | good | amazing | wonderful | interesting | like fun | like a lot of fun | like a great weekend | like a plan)",
      "lucky you #h:i_lucky", "good for you",
      "(ha | haha | ha ha | lol | hehe)", "i (love | like) (that | it)",
      "(that is | what a) (great | nice | lovely | cool | fun) (idea | story | weekend | plan)",
    ] },
    same: { patterns: ["me too", "same here", "me neither", "so do i", "neither do i", "same",
      "i (love | like) (fishing | boats | the beach | gardening | hiking | that | it) too"] },

    // --- twists ---------------------------------------------------------------------
    umbrella_yes: { patterns: [
      "(that is | you are) [so | very | really] (kind | nice | sweet) [of you] #h:r_kind",
      "(thanks | thank you) [so much] [frank] (that is | you are) [so | very | really] (kind | nice | sweet) [of you] #h:r_kind",
      "you are a (lifesaver | star | gentleman | hero)",
      "(can | could | may) i (join you | share | stand with you | come under)",
      "(thank you | thanks) for (the umbrella | sharing)", "great idea",
    ] },
    umbrella_no: { patterns: [
      "[no thanks | no thank you | it is okay | that is okay | i am okay | i am fine] i (have | brought | have got) (one | an umbrella | my umbrella | my own | my own umbrella | a hood | a raincoat) #h:r_have_one",
      "i (like | love) the rain", "i do not mind (the rain | a little rain | getting wet)", "(it is | it is just) a little rain",
    ] },
    late_react_ctx: { patterns: [
      "(again | not again | typical | as usual | again typical | typical again | every day | every single day | same as always | of course) #typical #h:l_typical",
      "(the bus | it) is always late #typical", "it is (always | usually | often) late #typical",
      "[oh no] i (will be | am going to be | am) late [for work | for my appointment | again] #worry #h:l_late_work",
      "i (can not | do not want to) be late [again] #worry", "i hope it comes soon #worry",
      "[no problem | that is okay | that is fine | it is okay] i (have time | am not in a hurry | am in no hurry) #ok #h:l_no_hurry",
      "(good | great) more time to (talk | chat) #ok", "i do not mind #ok",
    ] },
    like_yes_ctx: { patterns: [
      "[yes] i [really] (love | like | enjoy) it [here] [a lot | very much | so much] [so far] #h:lk_love",
      "[yes] i (love | like | really like) (it here | this town | this place | maple harbor | the neighborhood) [very much | a lot]",
      "[yes] it is (a | such a) (beautiful | nice | lovely | great | wonderful | pretty | charming | cute | quiet) (town | city | place | neighborhood) [here]",
      "[yes] it is [so | very | really] (quiet | green | peaceful | calm | clean | beautiful | nice | cozy | friendly) [here]",
      "[yes] (people | everyone | the people) (are | is) [so | very | really] (friendly | nice | kind) [here]",
      "[yes] it is (great | nice | lovely | amazing | wonderful | beautiful | really nice | fantastic) [so far]",
      "so far so good #h:lk_so_far", "[yes] i am [very | so | really] happy here", "[yes] (very much | a lot | definitely)",
      "(great | good | nice | wonderful | amazing | lovely | fantastic | very nice | really nice | pretty good) [so far]",
    ] },
    like_mixed_ctx: { patterns: [
      "[yes] [it is (nice | great | good | okay)] but i miss (home | my family | my friends | lithuania) #h:lk_miss",
      "i miss (home | my family | my friends) [a lot | sometimes]", "it is (okay | fine | not bad) [so far]",
      "it is (different | a big change) [but i like it]", "(yes and no | sort of | kind of | so so | more or less)",
      "i am still getting used to it",
    ] },
    like_no_ctx: { patterns: [
      "[no] i do not [really] like it [here | very much] [yet]", "it is (hard | difficult | too quiet | too expensive | boring) [here | for me]",
      "[no] not (so | very) much", "i want to go (home | back)",
    ] },

    // --- the goodbye ------------------------------------------------------------------
    leave: { patterns: [
      "i (had better | better | should | have to | need to | must | got to | have got to) (get going | go | run | be going | get on | catch (it | my bus | the bus)) [now] [frank] #h:by_better",
      "(that is | there is | here is | here comes) my bus [finally]", "i have to (catch | get) (my | the | this) bus",
      "(time | time for me) to go",
    ] },
    nice_talk: { patterns: [
      "[it was] (nice | great | good | lovely | really nice | so nice) (talking | chatting | to talk | to chat | speaking) (to | with) you [too | as well] [frank] #h:by_nice #h:br_nice_too",
      "[it was] (nice | great | good | lovely) (talking | chatting) [too]", "(nice | good | great) to see you [again]", "[and] you too #h:br_you_too",
      "[thanks | thank you] (same to you | and to you | likewise)",
    ] },
    bye_wish: { patterns: [
      "have a (good | nice | great | lovely | wonderful) (one | day | morning | weekend | week | afternoon | trip | time) #h:by_good_one",
      "enjoy (your | the) (weekend | day | morning | fishing | painting | boat | trip | market | afternoon)",
      "good luck with (the | your) (boat | painting | paint | fishing)",
      "say hi to [your] (daughter | grandson | grandkids | grandchildren | family | wife)",
      "see you (tomorrow | around | later | soon | next week | on monday | on friday | at the bus stop | next time) #h:by_tomorrow #h:br_see_you",
      "take care",
      "(thanks | thank you) [so much] [frank] (bye | goodbye | bye bye | see you | see you later)",
    ] },
  },

  lines: {
    // --- greetings --------------------------------------------------------------------
    hello: [
      t("Morning!", "Labas rytas!", "Labas rytas!"),
      t("Hey there!", "Labas!", "Labas!"),
      t("Good | morning!", "Labas | rytas!", "Labas rytas!"),
    ],
    hello_known: [
      t("Hey, | neighbor!", "Labas, | kaimyne!", "Labas, kaimyne!"),
      t("Morning, | neighbor!", "Labas rytas, | kaimyne!", "Labas rytas, kaimyne!"),
    ],
    hello_how: [
      t("Hey there! | How | are | you | doing?", "Labas! | Kaip | — | tau | sekasi?", "Labas! Kaip sekasi?", { flags: { 2: F_PROG } }),
      t("Morning! | How's it going?", "Labas rytas! | Kaip sekasi?", "Labas rytas! Kaip sekasi?"),
    ],
    hello_known_how: [
      t("Hey, | neighbor! | How's it going?", "Labas, | kaimyne! | Kaip sekasi?", "Labas, kaimyne! Kaip sekasi?"),
    ],

    // --- the weather ------------------------------------------------------------------
    wxq_lovely: [
      t("Lovely | weather, | isn't it?", "Puikus | oras, | ar ne?", "Puikus oras, ar ne?"),
      t("Lovely | day, | isn't it?", "Puiki | diena, | ar ne?", "Puiki diena, ar ne?"),
      t("Beautiful | morning, | isn't it?", "Nuostabus | rytas, | ar ne?", "Nuostabus rytas, tiesa?"),
    ],
    wxq_cold: [
      t("It's | cold | today, | isn't it?", "Yra | šalta | šiandien, | ar ne?", "Šiandien šalta, ar ne?", { flags: { 0: F_DUMMY } }),
      t("Chilly | this | morning, | isn't it?", "Vėsu | šį | rytą, | ar ne?", "Šį rytą vėsoka, ar ne?"),
    ],
    wxq_hot: [
      t("Wow, | it's | hot | today, | isn't it?", "Oho, | yra | karšta | šiandien, | ar ne?", "Oho, šiandien karšta, ar ne?", { flags: { 1: F_DUMMY } }),
      t("Hot | enough | for you? | Ha!", "Karšta | pakankamai | tau? | Cha!", "Na, ar tau pakankamai karšta? Cha!"),
    ],
    wxq_cloudy: [
      t("Looks | like | rain.", "Panašu | į | lietų.", "Panašu, kad lis."),
      t("Gray | day, | isn't it? | Looks | like | rain.", "Apsiniaukusi | diena, | ar ne? | Panašu | į | lietų.", "Apsiniaukusi diena, ar ne? Panašu, kad lis."),
    ],
    wxa_lovely: [
      t("Perfect | day | for a walk!", "Puiki | diena | pasivaikščiojimui!", "Puiki diena pasivaikščiojimui!"),
      t("I | love | this | weather!", "Aš | dievinu | šį | orą!", "Labai mėgstu tokį orą!"),
    ],
    wxa_cold: [
      t("Winter | is coming!", "Žiema | artėja!", "Žiema jau artėja!"),
      t("I | need | a | warmer | jacket!", "Man | reikia | — | šiltesnės | striukės!", "Man reikia šiltesnės striukės!"),
    ],
    wxa_hot: [
      t("I | know! | I'm melting!", "Aš | žinau! | Tirpstu!", "Tikrai! Aš tiesiog tirpstu!"),
    ],
    wxa_cloudy: [
      t("I | hope | the | bus | comes | first!", "Aš | tikiuosi, kad | — | autobusas | atvažiuos | pirmas!", "Tikiuosi, autobusas atvažiuos anksčiau nei lietus!"),
      t("Yep. | We | need | the | rain, | though.", "Jo. | Mums | reikia | — | lietaus, | vis dėlto.", "Jo. Bet lietaus mums reikia."),
    ],
    sure_is: [
      t("It | sure | is!", "Tai | tikrai | [yra]!", "Tikrai taip!", { flags: { 2: F_IS_ELL } }),
      t("You bet!", "Dar kaip!", "Dar kaip!"),
      t("Oh, | yes!", "O, | taip!", "O, taip!"),
    ],
    sure_does: [
      t("It | sure | does!", "Tai | tikrai | [panašu]!", "Tikrai panašu!", { flags: { 2: "Elliptical “does” (it sure does look like rain): Lithuanian repeats panašu." } }),
    ],
    wx_optimist: [t("Ha! | I | like | your | attitude!", "Cha! | Man | patinka | tavo | požiūris!", "Cha! Man patinka tavo požiūris!")],
    wx_you_cold: [t("Cold? | Ha! | You | need | a | warmer | jacket!", "Šalta? | Cha! | Tau | reikia | — | šiltesnės | striukės!", "Šalta? Cha! Tau reikia šiltesnės striukės!")],
    wx_you_hot: [t("Hot? | Ha! | Not | for me!", "Karšta? | Cha! | Ne | man!", "Karšta? Cha! Tik ne man!")],
    wx_you_rain: [
      t("Rain? | Not | a | cloud | in the sky!", "Lietus? | Nė | — | debesėlio | danguje!", "Lietus? Danguje nė debesėlio!",
        { flags: { 3: "Negative concord: after nė the noun takes the genitive (debesėlio)." } }),
    ],
    wxn_lovely: [t("No? | Well, | it's | better | than | rain!", "Ne? | Na, | tai yra | geriau | nei | lietus!", "Ne? Na, vis geriau nei lietus!")],
    wxn_cold: [t("No? | You're | tougher | than | me! | Ha!", "Ne? | Tu esi | {m:ištvermingesnis|f:ištvermingesnė} | už | mane! | Cha!", "Ne? Tu {m:ištvermingesnis|f:ištvermingesnė} už mane! Cha!")],
    wxn_hot: [t("Really? | I'm melting | here!", "Tikrai? | Tirpstu | čia!", "Tikrai? O aš čia tirpstu!")],
    wxn_cloudy: [t("Let's hope | you're | right!", "Tikėkimės, kad | tu esi | {m:teisus|f:teisi}!", "Tikėkimės, kad tu {m:teisus|f:teisi}!")],
    hope_react: [t("Ha! | Me | too!", "Cha! | Aš | irgi!", "Cha! Aš irgi!")],
    umbrella_ready: [t("But | I | brought | my | umbrella, | just in case.", "Bet | aš | pasiėmiau | savo | skėtį, | dėl viso pikto.", "Bet skėtį pasiėmiau – dėl viso pikto.")],
    dislike_react: [t("Ha! | Me | neither!", "Cha! | Aš | irgi ne!", "Cha! Aš irgi ne!")],
    not_today: [t("Well, | not | today!", "Na, | ne | šiandien!", "Na, bent jau ne šiandien!")],
    umbrella_have: [
      t("Don't worry, | I | have | a | big | one!", "Nesijaudink, | aš | turiu | — | didelį | [skėtį]!", "Nesijaudink, turiu didelį skėtį!",
        { flags: { 5: "Prop-word “one” (an umbrella): Lithuanian repeats the noun skėtį." } }),
    ],
    temp_echo: [t("{$c}?", "{$c}?", "{$c}?")],
    temp_echo_minus: [t("Minus | {$c}?", "Minus | {$c}?", "Minus {$c}?")],
    temp_celsius: [
      t("Oh, | Celsius! | That's | about | {$f} | here.", "A, | pagal Celsijų! | Tai yra | maždaug | {$f} | pas mus.", "A, pagal Celsijų! Pas mus tai būtų maždaug {$f}.",
        { flags: { 5: "“here”: in America, where temperatures are in Fahrenheit (pas mus)." } }),
    ],
    no_need_umbrella: [
      t("Ha! | You | won't need | one | today!", "Cha! | Tau | neprireiks | jo | šiandien!", "Cha! Šiandien jo tau neprireiks!",
        { flags: { 3: "Prop-word “one” (an umbrella): Lithuanian uses the pronoun jo (genitive after the negated verb)." } }),
    ],
    wx_help: [
      t("Ha! | You | never | know | with | this | weather!", "Cha! | Tu | niekada | nežinai | su | šiuo | oru!", "Cha! Su šiuo oru niekada nežinai!",
        { flags: { 3: "Negative concord: with niekada the verb takes ne- (nežinai)." } }),
    ],
    ha_right: [
      t("Ha! | Right?", "Cha! | Tiesa?", "Cha! Ar ne?"),
      t("Ha! | Yep!", "Cha! | Jo!", "Cha! Jo!"),
    ],
    great_minds: [t("Ha! | Great | minds | think | alike!", "Cha! | Didieji | protai | mąsto | panašiai!", "Cha! Protingų žmonių mintys sutampa!")],
    ok: [t("Okay.", "Gerai.", "Gerai."), t("Oh, | cool.", "O, | šaunu.", "O, šaunu.")],

    // --- first visit: new here, names, where from ----------------------------------------
    new_q: [
      t("So, | are | you | new | around here?", "Tai | ar esi | tu | {m:naujas|f:nauja} | šiose apylinkėse?", "Tai ar tu čia neseniai gyveni?"),
      t("Are | you | new | around here? | I | haven't seen | you | before.", "Ar esi | tu | {m:naujas|f:nauja} | šiose apylinkėse? | Aš | nesu matęs | tavęs | anksčiau.",
        "Ar tu čia neseniai? Anksčiau tavęs nemačiau."),
    ],
    welcome_hood: [
      t("Oh, | welcome | to | the | neighborhood!", "O, | {m:sveikas atvykęs|f:sveika atvykusi} | į | — | kaimynystę!", "O, {m:sveikas atvykęs|f:sveika atvykusi} į mūsų kaimynystę!"),
    ],
    new_no_react: [t("Oh, | sorry! | I'm getting | old! | Ha!", "O, | atsiprašau! | Darausi | senas! | Cha!", "O, atsiprašau! Senstu! Cha!")],
    frank_intro: [
      t("I'm | Frank, | by the way. | I | live | in | the | blue | house | on | the | corner.", "Aš esu | Frankas, | beje. | Aš | gyvenu | — | — | mėlyname | name | ant | — | kampo.",
        "Beje, aš Frankas. Gyvenu mėlyname name ant kampo.", { flags: { 5: "“in”: the locative name carries it; the adjective mėlyname stands between." } }),
    ],
    nice_meet_too: [t("Nice | to meet | you, | too!", "Malonu | susipažinti | su tavimi | taip pat!", "Man irgi malonu!")],
    nice_meet_you: [t("Nice | to meet | you!", "Malonu | susipažinti | su tavimi!", "Malonu susipažinti!")],
    frank_name: [t("I'm | Frank!", "Aš esu | Frankas!", "Aš Frankas!")],
    from_q: [
      t("So, | where | are | you | from?", "Tai | iš kur | esi | tu | [iš]?", "Tai iš kur tu?", { flags: { 4: F_FROM } }),
      t("Where | are | you | from, | originally?", "Iš kur | esi | tu | [iš], | {m:kilęs|f:kilusi}?", "Iš kur esi {m:kilęs|f:kilusi}?", { flags: { 3: F_FROM } }),
    ],
    from_lt: [t("Lithuania! | Wow! | Cold | winters | there, | right?", "Lietuva! | Oho! | Šaltos | žiemos | ten, | tiesa?", "Lietuva! Oho! Ten žiemos šaltos, tiesa?")],
    from_lt_short: [t("Lithuania! | Wow!", "Lietuva! | Oho!", "Lietuva! Oho!")],
    from_city: [
      t("Oh, | {X}! | In Lithuania, | right? | Cold | winters | there!", "O, | {X:nom}! | Lietuvoje, | tiesa? | Šaltos | žiemos | ten!", "O, {X:nom}! Lietuvoje, tiesa? Ten žiemos šaltos!"),
    ],
    from_city_short: [t("Oh, | {X}! | In Lithuania, | right?", "O, | {X:nom}! | Lietuvoje, | tiesa?", "O, {X:nom}! Lietuvoje, tiesa?")],
    from_other: [
      t("Oh, | {X}! | I've | always | wanted | to go | there.", "O, | {X:nom}! | Aš | visada | norėjau | nuvykti | ten.", "O, {X:nom}! Visada norėjau ten nuvykti.",
        { flags: { 2: "“'ve” (have): no Lithuanian word; the past norėjau carries it." } }),
    ],
    from_unknown: [
      t("Oh, | nice! | I've | never | been | there.", "O, | šaunu! | Aš | niekada | nebuvau | ten.", "O, šaunu! Niekada ten nebuvau.",
        { flags: { 2: "“'ve” (have): no Lithuanian word; the past nebuvau carries it.", 4: "Negative concord: with niekada the verb takes ne- (nebuvau)." } }),
    ],
    winter_yes_react: [t("Ha! | Then | our | winters | will be | easy | for you!", "Cha! | Tada | mūsų | žiemos | bus | lengvos | tau!", "Cha! Tada mūsų žiemos tau bus vieni niekai!")],
    winter_no_react: [t("Really? | Maybe | I'll visit, | then! | Ha!", "Tikrai? | Gal | atvažiuosiu, | tada! | Cha!", "Tikrai? Tada gal atvažiuosiu! Cha!")],

    // --- the week ----------------------------------------------------------------------
    week_q: [
      t("So, | busy | week?", "Tai | įtempta | savaitė?", "Tai kaip, įtempta savaitė?"),
      t("Busy | week?", "Įtempta | savaitė?", "Įtempta savaitė?"),
    ],
    week_q_mon: [
      t("Busy | week | ahead?", "Įtempta | savaitė | laukia?", "Laukia įtempta savaitė?"),
      t("So, | busy | week | ahead?", "Tai | įtempta | savaitė | laukia?", "Tai kaip, laukia įtempta savaitė?"),
    ],
    week_and_you: [t("And | you? | Busy | week?", "O | tu? | Įtempta | savaitė?", "O tu? Įtempta savaitė?")],
    busy_what: [t("Oh | yeah? | Work | or | family?", "O | taip? | Darbas | ar | šeima?", "Tikrai? Darbas ar šeima?")],
    busy_friday: [t("Well, | at least | it's | Friday!", "Na, | bent jau | yra | penktadienis!", "Na, bent jau penktadienis!", { flags: { 2: "Dummy “it” of time: merged with its verb (It's → Yra)." } })],
    busy_monday: [t("Oh boy. | Hang in there!", "Oi, oi. | Laikykis!", "Oi, oi. Laikykis!")],
    busy_work: [t("Ah, | work. | I | don't miss | it | one bit! | Ha!", "A, | darbas. | Aš | nepasiilgstu | jo | nė kiek! | Cha!", "A, darbas. Aš jo nė kiek nepasiilgstu! Cha!")],
    busy_family: [t("Family | comes | first!", "Šeima | eina | pirmiausia!", "Šeima – svarbiausia!")],
    busy_both: [t("Both? | Oh, | poor | you!", "Ir tas, ir tas? | Oi, | {m:vargšas|f:vargšė} | tu!", "Ir tas, ir tas? Oi, {m:vargšeli|f:vargšele}!")],
    busy_english: [
      t("Good for you! | Your | English | is | really | good!", "{m:Šaunuolis|f:Šaunuolė}! | Tavo | anglų kalba | yra | tikrai | gera!", "{m:Šaunuolis|f:Šaunuolė}! Tu tikrai gerai kalbi angliškai!"),
    ],
    busy_moving: [t("Ha! | Moving | is | the | worst.", "Cha! | Kraustymasis | yra | — | baisiausias.", "Cha! Kraustytis – baisiausia.")],
    not_busy_react: [
      t("Lucky you!", "Tau pasisekė!", "Tau pasisekė!"),
      t("Good for you!", "{m:Šaunuolis|f:Šaunuolė}!", "{m:Šaunuolis|f:Šaunuolė}!"),
    ],
    react_good: [t("Oh, | good!", "O, | puiku!", "O, puiku!")],

    // --- the weekend ----------------------------------------------------------------------
    wkp_q: [
      t("So, | how | was | your | weekend?", "Tai | kaip | buvo | tavo | savaitgalis?", "Tai kaip praleidai savaitgalį?"),
      t("How | was | your | weekend?", "Kaip | buvo | tavo | savaitgalis?", "Kaip praleidai savaitgalį?"),
      t("Good | weekend?", "Geras | savaitgalis?", "Gerai praleidai savaitgalį?"),
    ],
    wkp_and_yours: [t("And | how | was | yours?", "O | koks | buvo | tavo?", "O kaip tavo savaitgalis?")],
    wkp_what: [
      t("Oh | yeah? | What | did | you | do?", "O | taip? | Ką | — | tu | veikei?", "Tikrai? O ką veikei?", { flags: { 3: F_DID } }),
      t("Yeah? | What | did | you | get up to?", "Taip? | Ką | — | tu | veikei?", "Taip? O ką veikei?", { flags: { 2: F_DID } }),
    ],
    wk_short_react: [
      t("Ha! | They | always | are!", "Cha! | Jie | visada | [trumpi]!", "Cha! Jie visada per trumpi!",
        { flags: { 3: "Elliptical “are” (are too short): Lithuanian repeats the adjective trumpi." } }),
    ],
    wkf_q: [
      t("Any | plans | for the weekend?", "Kokių nors | planų | savaitgaliui?", "Turi planų savaitgaliui?"),
      t("So, | any | plans | for the weekend?", "Tai | kokių nors | planų | savaitgaliui?", "Tai ką veiksi savaitgalį?"),
      t("Doing | anything | fun | this | weekend?", "Veiksi | ką nors | smagaus | šį | savaitgalį?", "Veiksi ką nors smagaus šį savaitgalį?",
        { flags: { 0: "Progressive “(Are you) doing” for a plan: the Lithuanian future veiksi carries it." } }),
    ],
    wkf_and_you: [t("What about | you? | Any | plans?", "O kaip | tu? | Kokių nors | planų?", "O tu? Turi kokių planų?")],
    wkf_what: [
      t("Oh | yeah? | What | are | you | up to?", "O | taip? | Ką | — | tu | veiksi?", "Tikrai? O ką veiksi?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; the future veiksi (under “up to”) carries it." } }),
      t("Ooh, | like | what?", "Oho, | pavyzdžiui | ką?", "Oho, o ką veiksi?"),
    ],
    react_beach: [t("Oh, | nice! | I | love | the | beach.", "O, | šaunu! | Aš | dievinu | — | paplūdimį.", "O, šaunu! Labai mėgstu paplūdimį.")],
    react_home: [t("Quiet | weekends | are | the | best!", "Ramūs | savaitgaliai | yra | — | geriausi!", "Ramūs savaitgaliai – patys geriausi!")],
    react_friends: [t("Oh, | that's | nice!", "O, | tai | puiku!", "O, kaip puiku!")],
    react_work: [t("On the weekend? | Oh | no!", "Savaitgalį? | O | ne!", "Savaitgalį? O ne!")],
    react_sport: [
      t("Good for you! | I'm | too | old | for that! | Ha!", "{m:Šaunuolis|f:Šaunuolė}! | Aš esu | per | senas | tam! | Cha!", "{m:Šaunuolis|f:Šaunuolė}! Aš tam jau per senas! Cha!"),
    ],
    react_garden: [
      t("Ah, | a | gardener! | My | tomatoes | are | huge | this | year.", "A, | — | {m:sodininkas|f:sodininkė}! | Mano | pomidorai | yra | milžiniški | šiais | metais.",
        "A, {m:sodininkas|f:sodininkė}! Mano pomidorai šiemet milžiniški."),
    ],
    react_fishing: [t("Fishing? | Me | too! | I | love | fishing!", "Žvejyba? | Aš | irgi! | Aš | dievinu | žvejybą!", "Žvejyba? Aš irgi! Labai mėgstu žvejoti!")],
    react_trip: [t("Oh, | nice! | A | little | trip!", "O, | šaunu! | — | Nedidelė | kelionė!", "O, šaunu! Nedidelė kelionė!")],
    react_fun: [
      t("Oh, | fun!", "O, | smagu!", "O, smagu!"),
      t("Sounds | like | fun!", "Skamba | — | smagiai!", "Skamba smagiai!", { flags: { 1: "“like” has no Lithuanian word here: the adverb smagiai follows skamba." } }),
    ],
    react_sick: [t("Oh | no! | I | hope | you're feeling | better | now.", "O | ne! | Aš | tikiuosi, kad | jautiesi | geriau | dabar.", "O ne! Tikiuosi, dabar jautiesi geriau.")],
    react_bad: [t("Oh | no! | Well, | there's | always | next | weekend.", "O | ne! | Na, | yra | visada | kitas | savaitgalis.", "O ne! Na, bus dar kitas savaitgalis.")],
    react_none: [t("No | plans? | Sometimes | that's | the | best | plan!", "Jokių | planų? | Kartais | tai yra | — | geriausias | planas!", "Jokių planų? Kartais tai geriausias planas!")],
    react_notyet: [t("Well, | there's | still | time!", "Na, | yra | dar | laiko!", "Na, dar yra laiko!")],

    // --- Frank's side --------------------------------------------------------------------
    frank_weekend: [
      t("Oh, | great! | I | took | my | grandson | fishing | at the pier.", "O, | puikiai! | Aš | nusivedžiau | savo | anūką | žvejoti | prie prieplaukos.",
        "O, puikiai! Nusivedžiau anūką žvejoti prie prieplaukos."),
    ],
    frank_weekend_more: [
      t("We | didn't catch | a | thing! | But | we | had | a | great | time.", "Mes | nepagavome | — | nieko! | Bet | mes | praleidome | — | puikų | laiką.",
        "Nieko nepagavome! Bet laiką praleidome puikiai.", { flags: { 3: "Negative concord: “a thing” after didn't = nieko." } }),
    ],
    frank_plans: [
      t("Oh, | I'm painting | my | old | boat | at the dock.", "O, | dažysiu | savo | seną | valtį | prieplaukoje.", "O, dažysiu savo seną valtį prieplaukoje.",
        { flags: { 1: "Present progressive for a plan: the Lithuanian future dažysiu carries it." } }),
    ],
    frank_plans_more: [t("She's | old, | but | she | still | floats! | Ha!", "Ji yra | sena, | bet | ji | dar | plaukia! | Cha!", "Ji sena, bet dar plaukia! Cha!")],
    frank_week: [
      t("Me? | I'm | retired! | Every | day | is | Saturday! | Ha!", "Aš? | Aš esu | pensininkas! | Kiekviena | diena | yra | šeštadienis! | Cha!",
        "Aš? Aš pensininkas! Man kiekviena diena – šeštadienis! Cha!"),
    ],
    frank_week_more: [
      t("Well, | my | daughter | says | I'm | busier | now | than | before!", "Na, | mano | dukra | sako, | kad aš esu | labiau užsiėmęs | dabar | nei | anksčiau!",
        "Na, dukra sako, kad dabar esu labiau užsiėmęs nei anksčiau!"),
    ],
    frank_how: [t("Oh, | can't complain! | Thanks | for | asking.", "O, | negaliu skųstis! | Ačiū, | kad | klausi.", "O, negaliu skųstis! Ačiū, kad klausi.")],
    frank_from: [t("Me? | Born | and | raised | right here!", "Aš? | Gimęs | ir | užaugęs | čia pat!", "Aš? Čia gimiau ir užaugau!")],
    frank_live: [
      t("Me? | I've lived | here | for | forty | years!", "Aš? | Gyvenu | čia | — | keturiasdešimt | metų!", "Aš? Gyvenu čia jau keturiasdešimt metų!",
        { flags: { 3: "“for” (duration): no separate word; the number phrase keturiasdešimt metų carries it." } }),
    ],
    frank_job: [
      t("I'm | retired. | I | was | a | mail carrier | for | thirty | years.", "Aš esu | pensininkas. | Aš | buvau | — | laiškininkas | — | trisdešimt | metų.",
        "Aš pensininkas. Trisdešimt metų dirbau laiškininku.", { flags: { 6: "“for” (duration): no separate word; the number phrase trisdešimt metų carries it." } }),
    ],
    frank_where: [
      t("Oh, | just | to | the | hardware store. | I | need | paint | for | my | boat!", "O, | tik | į | — | ūkinių prekių parduotuvę. | Man | reikia | dažų | — | savo | valčiai!",
        "O, tik į ūkinių prekių parduotuvę. Reikia dažų valčiai!", { flags: { 8: "“for”: the dative valčiai carries it; savo stands between." } }),
    ],
    frank_like: [t("Me? | I | love | it! | Best | town | in America!", "Aš? | Aš | dievinu | jį! | Geriausias | miestas | Amerikoje!", "Aš? Labai jį myliu! Geriausias miestas Amerikoje!")],
    frank_forecast_lovely: [t("The | radio | says | sunny | all | week!", "— | Radijas | sako: | saulėta | visą | savaitę!", "Per radiją sakė, kad visą savaitę bus saulėta!")],
    frank_forecast_cold: [t("The | radio | says | it'll be | warmer | this | afternoon.", "— | Radijas | sako, kad | bus | šilčiau | šią | popietę.", "Per radiją sakė, kad po pietų bus šilčiau.")],
    frank_forecast_hot: [t("The | radio | says | it'll be | even | hotter | tomorrow!", "— | Radijas | sako, kad | bus | dar | karščiau | rytoj!", "Per radiją sakė, kad rytoj bus dar karščiau!")],
    frank_forecast_cloudy: [t("The | radio | says | rain | later.", "— | Radijas | žada | lietų | vėliau.", "Per radiją žadėjo lietų.")],
    frank_bus: [
      t("It | should | be | here | any | minute. | Well, | in theory! | Ha!", "Jis | turėtų | būti | čia | bet kurią | minutę. | Na, | teoriškai! | Cha!",
        "Turėtų atvažiuoti bet kurią minutę. Na, teoriškai! Cha!"),
    ],
    told_already: [t("Ha! | Like | I | said!", "Cha! | Kaip | aš | sakiau!", "Cha! Kaip jau sakiau!")],
    your_turn_mon: [
      t("Hey, | aren't | you | going to ask | about | my | weekend? | Ha!", "Ei, | ar | tu | nepaklausi | apie | mano | savaitgalį? | Cha!",
        "Ei, o apie mano savaitgalį nepaklausi? Cha!", { flags: { 1: "“aren't” in a question = ar; the negation ne- sits on nepaklausi (under “going to ask”)." } }),
    ],
    your_turn_fri: [
      t("Hey, | don't | you | want | to hear | my | plans? | Ha!", "Ei, | ar | tu | nenori | išgirsti | mano | planų? | Cha!",
        "Ei, o mano planų nenori išgirsti? Cha!", { flags: { 1: "“don't” in a question = ar; the negation ne- sits on nenori (under “want”)." } }),
    ],
    tell_anyway: [t("Ha! | I'll tell | you | anyway!", "Cha! | Papasakosiu | tau | vis tiek!", "Cha! Vis tiek papasakosiu!")],

    // --- twists: rain, late bus ------------------------------------------------------------
    rain_start: [t("Oh, | here | it | comes!", "O, | štai | jis | ateina!", "O, štai ir lietus!")],
    rain_start_new: [t("Oh | no, | it's starting | to rain!", "O | ne, | pradeda | lyti!", "O ne, pradeda lyti!")],
    umbrella_offer: [
      t("Quick, | get | under | my | umbrella!", "Greičiau, | lįsk | po | mano | skėčiu!", "Greičiau, lįsk po mano skėčiu!"),
      t("Here, | share | my | umbrella!", "Še, | pasidalink | mano | skėčiu!", "Še, stok po mano skėčiu!"),
    ],
    umbrella_reask: [t("Come on, | there's | room | for two!", "Nagi, | yra | vietos | dviem!", "Nagi, vietos užteks dviem!")],
    umbrella_yes_react: [t("No | problem! | Plenty of room.", "Jokių | problemų! | Vietos užteks.", "Nieko tokio! Vietos užteks.")],
    umbrella_decline: [t("Okay! | Suit yourself! | Ha!", "Gerai! | Kaip nori! | Cha!", "Gerai, kaip nori! Cha!")],
    umbrella_no_react: [t("Oh, | smart! | You | came | prepared.", "O, | protinga! | Tu | atėjai | {m:pasiruošęs|f:pasiruošusi}.", "O, protinga! Tu atėjai {m:pasiruošęs|f:pasiruošusi}.")],
    rain_you_have: [t("Good thing | you | have | an | umbrella!", "Gerai, kad | tu | turi | — | skėtį!", "Gerai, kad turi skėtį!")],
    bus_late: [t("Hmm, | the | bus | is late | again. | Typical!", "Hmm, | — | autobusas | vėluoja | vėl. | Kaip visada!", "Hmm, autobusas vėl vėluoja. Kaip visada!")],
    more_time: [t("Well, | more | time | to chat!", "Na, | daugiau | laiko | paplepėti!", "Na, bus daugiau laiko paplepėti!")],
    late_typical: [t("Ha! | Every | single | day!", "Cha! | Kiekvieną | mielą | dieną!", "Cha! Kiekvieną mielą dieną!")],
    late_worry: [t("Don't worry, | it | always | comes | eventually!", "Nesijaudink, | jis | visada | atvažiuoja | galų gale!", "Nesijaudink, galų gale jis visada atvažiuoja!")],
    late_ok: [t("Ha! | Exactly!", "Cha! | Būtent!", "Cha! Būtent!")],
    like_q: [
      t("So, | how | do | you | like | it | here?", "Tai | kaip | — | tau | patinka | — | čia?", "Tai kaip tau čia patinka?",
        { flags: { 2: F_DO_WH, 5: "“it”: patinka needs no object pronoun here; čia names the place." } }),
    ],
    like_yes_react: [t("That's | what | I | like | to hear!", "Tai | ką | aš | mėgstu | girdėti!", "Štai ką mėgstu girdėti!")],
    like_mixed_react: [t("I | get | it. | Home | is | home.", "Aš | suprantu | tai. | Namai | yra | namai.", "Suprantu. Namai yra namai.")],
    like_no_react: [t("Oh | no! | Give | it | time!", "O | ne! | Duok | tam | laiko!", "O ne! Duok laiko!")],

    // --- the bus and the goodbye --------------------------------------------------------
    bus_not_here: [t("Wait, | your | bus | isn't | here | yet!", "Palauk, | tavo | autobuso | nėra | čia | dar!", "Palauk, tavo autobuso dar nėra!")],
    early_bye: [t("Oh, | okay! | Have | a | good one!", "O, | gerai! | Linkiu | — | geros dienos!", "O, gerai! Geros dienos!")],
    bus_here: [
      t("Oh, | look, | here | comes | your | bus!", "O, | žiūrėk, | štai | atvažiuoja | tavo | autobusas!", "O, žiūrėk, štai atvažiuoja tavo autobusas!"),
      t("Oh, | here's | your | bus!", "O, | štai | tavo | autobusas!", "O, štai tavo autobusas!"),
    ],
    bus_finally: [t("Finally! | Here | comes | your | bus!", "Pagaliau! | Štai | atvažiuoja | tavo | autobusas!", "Pagaliau! Štai atvažiuoja tavo autobusas!")],
    bus_hurry: [t("Go on, | don't miss | it!", "Eik, | nepražiopsok | jo!", "Eik, nepražiopsok jo!")],
    frank_bus_here: [
      t("Oh, | there's | my | bus! | I'd | better | get going. | Nice | talking | to | you!", "O, | štai | mano | autobusas! | Aš | verčiau | eisiu. | Malonu | pasikalbėti | su | tavimi!",
        "O, štai mano autobusas! Na, man jau metas. Malonu buvo pasikalbėti!", { flags: { 4: F_HAD_BETTER } }),
    ],
    frank_wave: [t("See you, | neighbor!", "Iki, | kaimyne!", "Iki, kaimyne!")],
    bye_you_too: [t("You | too! | Have | a | good one!", "Tau | irgi! | Linkiu | — | geros dienos!", "Tau irgi! Geros dienos!")],
    bye_you_too_wk: [t("You | too! | Have | a | great | weekend!", "Tau | irgi! | Linkiu | — | puikaus | savaitgalio!", "Tau irgi! Gero savaitgalio!")],
    bye_plain: [t("Bye! | Have | a | good one!", "Iki! | Linkiu | — | geros dienos!", "Iki! Geros dienos!")],
    bye_plain_wk: [t("Bye! | Have | a | great | weekend!", "Iki! | Linkiu | — | puikaus | savaitgalio!", "Iki! Gero savaitgalio!")],
    bye_thanks: [t("Thanks, | you | too!", "Ačiū, | tau | irgi!", "Ačiū, tau irgi!")],
    frank_see_you: [t("See you around!", "Iki pasimatymo!", "Iki pasimatymo!")],
  },

  domains: {
    // the Celsius number Frank repeats, and the Fahrenheit number he converts it to (−17…45 °C)
    c: () => Array.from({ length: 46 }, (_, i) => i),
    f: () => [...new Set(Array.from({ length: 63 }, (_, i) => Math.round(((i - 17) * 9) / 5 + 32)))].filter((x) => x > 0),
  },

  hints: {
    wx_lovely: {
      lt: "Pritarti arba pakalbėti apie orą",
      items: [
        { id: "w_sure_is", s: t("It | sure | is!", "Tai | tikrai | [yra]!", "Tikrai taip!", { flags: { 2: F_IS_ELL } }) },
        { id: "w_beautiful", s: t("Yeah, | it's | beautiful!", "Taip, | yra | gražu!", "Taip, labai gražu!", { flags: { 1: F_DUMMY } }) },
        { id: "w_know_right", s: t("I | know, | right?", "Aš | žinau, | tiesa?", "Tikrai, ar ne?"), note: "Taip pritariama: „Tikrai, ar ne?“" },
        { id: "w_finally_sun", s: t("Yes, | finally | some | sun!", "Taip, | pagaliau | — | saulė!", "Taip, pagaliau saulė!", { flags: { 2: "“some” has no Lithuanian word here." } }) },
        { id: "w_than_tag", s: t("It's | warmer | than | yesterday, | isn't it?", "Yra | šilčiau | nei | vakar, | ar ne?", "Šilčiau nei vakar, ar ne?", { flags: { 0: F_DUMMY } }),
          note: "„…, isn't it?“ – klausiamasis priedėlis, kaip mūsų „ar ne?“." },
        { id: "w_love", s: t("I | love | this | weather!", "Aš | dievinu | šį | orą!", "Labai mėgstu tokį orą!") },
        { id: "w_temp", s: t("It's | about | 75 | degrees!", "Yra | maždaug | 75 | laipsniai!", "Maždaug 75 laipsniai – tai apie 24 °C!",
          { say: "It's about seventy-five degrees!", flags: { 0: F_DUMMY } }), note: "Amerikoje temperatūra matuojama Farenheito laipsniais." },
      ],
    },
    wx_cold: {
      lt: "Pritarti arba pakalbėti apie orą",
      items: [
        { id: "w_sure_is", s: t("It | sure | is!", "Tai | tikrai | [yra]!", "Tikrai taip!", { flags: { 2: F_IS_ELL } }) },
        { id: "w_beautiful", s: t("Yes, | it's | freezing!", "Taip, | yra | baisiai šalta!", "Taip, baisiai šalta!", { flags: { 1: F_DUMMY } }) },
        { id: "w_know_right", s: t("I | know, | right?", "Aš | žinau, | tiesa?", "Tikrai, ar ne?") },
        { id: "w_than_tag", s: t("It's | colder | than | yesterday, | isn't it?", "Yra | šalčiau | nei | vakar, | ar ne?", "Šalčiau nei vakar, ar ne?", { flags: { 0: F_DUMMY } }),
          note: "„…, isn't it?“ – klausiamasis priedėlis, kaip mūsų „ar ne?“." },
        { id: "w_jacket", s: t("I | need | a | warmer | jacket!", "Man | reikia | — | šiltesnės | striukės!", "Man reikia šiltesnės striukės!") },
        { id: "w_dislike", s: t("I | don't like | the | cold.", "Aš | nemėgstu | — | šalčio.", "Nemėgstu šalčio.") },
        { id: "w_temp", s: t("It's | only | 50 | degrees!", "Yra | tik | 50 | laipsnių!", "Tik 50 laipsnių – tai apie 10 °C!",
          { say: "It's only fifty degrees!", flags: { 0: F_DUMMY } }), note: "Amerikoje temperatūra matuojama Farenheito laipsniais." },
      ],
    },
    wx_hot: {
      lt: "Pritarti arba pakalbėti apie orą",
      items: [
        { id: "w_sure_is", s: t("It | sure | is!", "Tai | tikrai | [yra]!", "Tikrai taip!", { flags: { 2: F_IS_ELL } }) },
        { id: "w_beautiful", s: t("Yes, | it's | so | hot!", "Taip, | yra | taip | karšta!", "Taip, kaip karšta!", { flags: { 1: F_DUMMY } }) },
        { id: "w_know_right", s: t("I | know, | right?", "Aš | žinau, | tiesa?", "Tikrai, ar ne?") },
        { id: "w_than_tag", s: t("It's | hotter | than | yesterday, | isn't it?", "Yra | karščiau | nei | vakar, | ar ne?", "Karščiau nei vakar, ar ne?", { flags: { 0: F_DUMMY } }),
          note: "„…, isn't it?“ – klausiamasis priedėlis, kaip mūsų „ar ne?“." },
        { id: "w_melting", s: t("I'm melting!", "Tirpstu!", "Aš tiesiog tirpstu!"), register: "casual" },
        { id: "w_temp", s: t("It's | almost | 90 | degrees!", "Yra | beveik | 90 | laipsnių!", "Beveik 90 laipsnių – tai apie 32 °C!",
          { say: "It's almost ninety degrees!", flags: { 0: F_DUMMY } }), note: "Amerikoje temperatūra matuojama Farenheito laipsniais." },
      ],
    },
    wx_cloudy: {
      lt: "Atsakyti į „Looks like rain“",
      items: [
        { id: "w_not_today", s: t("Well, | not | today!", "Na, | ne | šiandien!", "Na, tik ne šiandien!"), note: "Reiškia: „Tikiuosi, šiandien nelis!“" },
        { id: "w_does_tag", s: t("It | does, | doesn't it?", "Tai | [panašu], | ar ne?", "Tikrai panašu, ar ne?", { flags: { 1: "Elliptical “does” (it does look like rain): Lithuanian repeats panašu." } }),
          note: "„…, doesn't it?“ – klausiamasis priedėlis, kaip mūsų „ar ne?“." },
        { id: "w_hope_not", s: t("I | hope | not!", "Aš | tikiuosi, | kad ne!", "Tikiuosi, kad ne!") },
        { id: "w_no_umbrella", s: t("Oh | no, | I | don't have | an | umbrella!", "O | ne, | aš | neturiu | — | skėčio!", "O ne, neturiu skėčio!") },
        { id: "w_beautiful", s: t("It's | really | gray | today, | isn't it?", "Yra | tikrai | apsiniaukę | šiandien, | ar ne?", "Šiandien tikrai apsiniaukę, ar ne?", { flags: { 0: F_DUMMY } }) },
      ],
    },
    new_here: {
      lt: "Pasakyti, ar neseniai čia gyveni",
      items: [
        { id: "n_moved", s: t("Yes, | I | just | moved | here.", "Taip, | aš | ką tik | atsikrausčiau | čia.", "Taip, ką tik čia atsikrausčiau.") },
        { id: "n_last_month", s: t("Yes, | I | moved | here | last | month.", "Taip, | aš | atsikrausčiau | čia | praėjusį | mėnesį.", "Taip, atsikrausčiau praėjusį mėnesį.") },
        { id: "n_new", s: t("Yeah, | I'm | new | in town.", "Taip, | aš esu | {m:naujas|f:nauja} | mieste.", "Taip, aš čia {m:naujokas|f:naujokė}.") },
        { id: "n_no", s: t("No, | I've lived | here | for a year.", "Ne, | gyvenu | čia | jau metus.", "Ne, čia gyvenu jau metus.") },
      ],
    },
    intro: {
      lt: "Prisistatyti Frankui",
      items: [
        { id: "in_nice", s: t("Nice | to meet | you, | Frank! | I'm | {$name}.", "Malonu | susipažinti | su tavimi, | Frankai! | Aš esu | {$name}.", "Malonu susipažinti, Frankai! Aš – {$name}.") },
        { id: "in_too", s: t("Nice | to meet | you, | too!", "Malonu | susipažinti | su tavimi | taip pat!", "Man irgi malonu!") },
      ],
    },
    from: {
      lt: "Pasakyti, iš kur esi", slot: "country", examples: ["lithuania", "poland", "ukraine"],
      items: [
        { id: "f_from", s: t("I'm | from | {X}.", "Aš esu | iš | {X:gen}.", "Aš iš {X:gen}.") },
        { id: "f_nat", s: t("I'm | Lithuanian.", "Aš esu | {m:lietuvis|f:lietuvė}.", "Aš – {m:lietuvis|f:lietuvė}."), only: (e) => e.id === "lithuania" },
        { id: "f_city", s: t("I'm | from | Vilnius, | in Lithuania.", "Aš esu | iš | Vilniaus, | Lietuvoje.", "Aš iš Vilniaus, Lietuvoje."), only: (e) => e.id === "lithuania" },
      ],
    },
    winter: {
      lt: "Papasakoti apie žiemas Lietuvoje",
      items: [
        { id: "wi_cold", s: t("Yes, | very | cold!", "Taip, | labai | šaltos!", "Taip, labai šaltos!") },
        { id: "wi_snow", s: t("Yes, | and | lots of | snow!", "Taip, | ir | daug | sniego!", "Taip, ir daug sniego!") },
        { id: "wi_not_bad", s: t("Not | so | bad, | actually.", "Ne | tokios | blogos, | tiesą sakant.", "Tiesą sakant, ne tokios jau baisios.") },
      ],
    },
    week: {
      lt: "Papasakoti apie savo savaitę",
      items: [
        { id: "wk_crazy", s: t("Crazy | busy!", "Beprotiškai | {m:užsiėmęs|f:užsiėmusi}!", "Darbų – iki kaklo!"), register: "casual" },
        { id: "wk_busy", s: t("Yes, | very | busy!", "Taip, | labai | įtempta!", "Taip, labai įtempta!") },
        { id: "wk_work", s: t("Yes, | lots of | work.", "Taip, | daug | darbo.", "Taip, daug darbo.") },
        { id: "wk_not_bad", s: t("Not bad, | thanks.", "Neblogai, | ačiū.", "Neblogai, ačiū.") },
        { id: "wk_quiet", s: t("Not really. | Pretty | quiet.", "Nelabai. | Gana | rami.", "Nelabai. Gana rami.") },
      ],
    },
    busy_why: {
      lt: "Pasakyti, kas tave užima",
      items: [
        { id: "bw_work", s: t("Work, | mostly.", "Darbas, | daugiausia.", "Daugiausia darbas.") },
        { id: "bw_kids", s: t("My | kids!", "Mano | vaikai!", "Vaikai!") },
        { id: "bw_both", s: t("Both!", "Ir tas, ir tas!", "Ir tas, ir tas!") },
        { id: "bw_english", s: t("English | classes!", "Anglų kalbos | pamokos!", "Anglų kalbos pamokos!") },
      ],
    },
    weekend_past: {
      lt: "Papasakoti, kaip praleidai savaitgalį",
      items: [
        { id: "wp_great", s: t("It | was | great, | thanks!", "Jis | buvo | puikus, | ačiū!", "Puikiai, ačiū!") },
        { id: "wp_great", s: t("Not bad, | you?", "Neblogai, | o tu?", "Neblogai, o tu?"), register: "casual", note: "Trumpai atsakai ir iškart paklausi atgal." },
        { id: "wp_did", s: t("We | went | to the beach.", "Mes | važiavome | į paplūdimį.", "Važiavome į paplūdimį.") },
        { id: "wp_did", s: t("I | visited | my | friends.", "Aš | aplankiau | savo | draugus.", "Aplankiau draugus.") },
        { id: "wp_did", s: t("I | just | relaxed | at home.", "Aš | tiesiog | ilsėjausi | namuose.", "Tiesiog ilsėjausi namie.") },
        { id: "wp_nothing", s: t("Nothing | special.", "Nieko | ypatingo.", "Nieko ypatingo.") },
        { id: "wp_short", s: t("Too | short!", "Per | trumpas!", "Per trumpas!") },
      ],
    },
    weekend_what: {
      lt: "Papasakoti, ką veikei",
      items: [
        { id: "wp_did", s: t("We | went | to the beach.", "Mes | važiavome | į paplūdimį.", "Važiavome į paplūdimį.") },
        { id: "wp_did", s: t("I | visited | my | friends.", "Aš | aplankiau | savo | draugus.", "Aplankiau draugus.") },
        { id: "wp_did", s: t("We | had | a | barbecue.", "Mes | surengėme | — | kepsnių vakarėlį.", "Surengėme kepsnių vakarėlį.") },
        { id: "wp_did", s: t("I | went | hiking.", "Aš | ėjau | į žygį.", "Buvau žygyje.") },
        { id: "wp_did", s: t("I | just | relaxed | at home.", "Aš | tiesiog | ilsėjausi | namuose.", "Tiesiog ilsėjausi namie.") },
        { id: "wp_nothing", s: t("Nothing | special.", "Nieko | ypatingo.", "Nieko ypatingo.") },
      ],
    },
    weekend_plans: {
      lt: "Papasakoti apie savaitgalio planus",
      items: [
        { id: "wf_did", s: t("I'm going | to the beach.", "Važiuosiu | į paplūdimį.", "Važiuosiu į paplūdimį.", { flags: { 0: "Present progressive for a plan: the Lithuanian future važiuosiu carries it." } }) },
        { id: "wf_did", s: t("I'm visiting | my | family.", "Lankysiu | savo | šeimą.", "Aplankysiu šeimą.", { flags: { 0: "Present progressive for a plan: the Lithuanian future lankysiu carries it." } }) },
        { id: "wf_did", s: t("We're having | a | barbecue.", "Rengsime | — | kepsnių vakarėlį.", "Rengsime kepsnių vakarėlį.", { flags: { 0: "Present progressive for a plan: the Lithuanian future rengsime carries it." } }) },
        { id: "wf_did", s: t("Just | relaxing | at home.", "Tiesiog | ilsėsiuosi | namuose.", "Tiesiog ilsėsiuos namie.") },
        { id: "wf_did", s: t("I | have | to work, | unfortunately.", "Aš | turiu | dirbti, | deja.", "Deja, turiu dirbti.") },
        { id: "wf_none", s: t("Not really. | No | plans | yet.", "Nelabai. | Jokių | planų | dar.", "Nelabai. Kol kas jokių planų.") },
        { id: "wf_notyet", s: t("I | don't know | yet.", "Aš | nežinau | dar.", "Dar nežinau.") },
      ],
    },
    back: {
      lt: "Paklausti Franko atgal („And you?“)",
      items: [
        { id: "b_and_you", s: t("And | you?", "O | tu?", "O tu?") },
        { id: "b_how_about", s: t("How about | you?", "O kaip | tu?", "O tu?") },
        { id: "b_weekend", s: t("How | was | your | weekend?", "Kaip | buvo | tavo | savaitgalis?", "Kaip praleidai savaitgalį?") },
        { id: "b_plans", s: t("Any | plans | for the weekend?", "Kokių nors | planų | savaitgaliui?", "Turi planų savaitgaliui?") },
        { id: "b_week", s: t("Busy | week?", "Įtempta | savaitė?", "Įtempta savaitė?") },
        { id: "b_from", s: t("Are | you | from | here?", "Ar esi | tu | iš | čia?", "Ar tu vietinis?") },
      ],
    },
    interest: {
      lt: "Parodyti susidomėjimą",
      items: [
        { id: "i_nice", s: t("Oh, | nice!", "O, | šaunu!", "O, šaunu!") },
        { id: "i_really", s: t("Really?", "Tikrai?", "Tikrai?") },
        { id: "i_sounds_fun", s: t("That | sounds | fun!", "Tai | skamba | smagiai!", "Skamba smagiai!") },
        { id: "i_lucky", s: t("Lucky you!", "Tau pasisekė!", "Tau pasisekė!") },
      ],
    },
    rain: {
      lt: "Priimti arba mandagiai atsisakyti skėčio",
      items: [
        { id: "r_kind", s: t("Thanks, | that's | so | kind!", "Ačiū, | tai | taip | malonu!", "Ačiū, labai malonu!") },
        { id: "s_thanks", s: t("Oh, | thank | you!", "O, | ačiū | tau!", "O, ačiū!") },
        { id: "r_have_one", s: t("No, | thanks, | I | have | one.", "Ne, | ačiū, | aš | turiu | savo.", "Ne, ačiū, turiu savo.", { flags: { 4: "Prop-word “one” (an umbrella): Lithuanian says savo (my own)." } }) },
      ],
    },
    late: {
      lt: "Sureaguoti į vėluojantį autobusą",
      items: [
        { id: "l_typical", s: t("Again? | Typical!", "Vėl? | Kaip visada!", "Vėl? Kaip visada!") },
        { id: "l_late_work", s: t("Oh | no, | I'll be late | for work!", "O | ne, | pavėluosiu | į darbą!", "O ne, pavėluosiu į darbą!") },
        { id: "l_no_hurry", s: t("No | problem. | I | have | time.", "Jokių | problemų. | Aš | turiu | laiko.", "Nieko tokio, turiu laiko.") },
      ],
    },
    like: {
      lt: "Pasakyti, kaip tau čia patinka",
      items: [
        { id: "lk_love", s: t("I | love | it | here!", "Man | labai patinka | — | čia!", "Man čia labai patinka!",
          { flags: { 2: "“it” (the place) needs no word: patinka takes no object here; čia (under “here”) names the place." } }) },
        { id: "lk_so_far", s: t("So far, so good!", "Kol kas viskas gerai!", "Kol kas viskas gerai!") },
        { id: "lk_miss", s: t("It's | great, | but | I | miss | home.", "Tai yra | puiku, | bet | aš | ilgiuosi | namų.", "Puiku, bet ilgiuosi namų.") },
      ],
    },
    bye: {
      lt: "Mandagiai atsisveikinti",
      items: [
        { id: "by_better", s: t("I'd | better | get going. | Nice | talking | to | you!", "Aš | verčiau | eisiu. | Malonu | pasikalbėti | su | tavimi!",
          "Na, man jau metas. Malonu buvo pasikalbėti!", { flags: { 0: F_HAD_BETTER } }), note: "„I'd better…“ – švelnus būdas pasakyti, kad jau reikia eiti." },
        { id: "by_nice", s: t("Nice | talking | to | you!", "Malonu | pasikalbėti | su | tavimi!", "Malonu buvo pasikalbėti!") },
        { id: "by_good_one", s: t("Have | a | good one!", "Linkiu | — | geros dienos!", "Geros dienos!"), register: "casual", note: "„a good one“ – geros dienos (ar vakaro)." },
        { id: "by_tomorrow", s: t("See you | tomorrow!", "Iki | rytojaus!", "Iki rytojaus!") },
      ],
    },
    bye_reply: {
      lt: "Atsisveikinti su Franku",
      items: [
        { id: "br_you_too", s: t("You | too! | Have | a | good one!", "Tau | irgi! | Linkiu | — | geros dienos!", "Tau irgi! Geros dienos!") },
        { id: "br_nice_too", s: t("Nice | talking | to | you | too!", "Malonu | pasikalbėti | su | tavimi | irgi!", "Man irgi buvo malonu!") },
        { id: "br_see_you", s: t("See you around!", "Iki pasimatymo!", "Iki pasimatymo!") },
      ],
    },
  },

  tips: {
    us_fall: { key: "us_fall", lt: "Suprasta! Amerikoje ruduo dažniausiai vadinamas „fall“.", better: "Fall is here!" },
    us_movies: { key: "us_movies", lt: "Suprasta! Amerikoje sakoma „go to the movies“.", better: "I went to the movies." },
    us_soccer: { key: "us_soccer", lt: "Suprasta! Amerikoje „football“ – amerikietiškas futbolas; mūsų futbolas – „soccer“.", better: "I played soccer." },
    us_apartment: { key: "us_apartment", lt: "Suprasta! Amerikoje butas – „apartment“.", better: "I cleaned the apartment." },
    uk_have_got: { key: "uk_have_got", lt: "Suprasta! Amerikoje dažniau sakoma „Do you have any plans…?“", better: "Do you have any plans for the weekend?" },
  },

  merges: {
    "isn't it": { reason: "lexical_expression", split: "isn't → nėra + it → jis gives “nėra jis”; the tag question = ar ne? (tiesa?).", minimal: "Both words form the tag." },
    "doesn't it": { reason: "lexical_expression", split: "doesn't → ne- + it → jis leaves a stray negation; the tag question = ar ne?", minimal: "Both words form the tag." },
    "hey there": { reason: "lexical_expression", split: "there → ten would add a false place; “Hey there” is one greeting (= labas).", minimal: "Two words." },
    "around here": { reason: "lexical_expression", split: "around → aplink + here → čia gives “aplink čia”; the area = šiose apylinkėse.", minimal: "Two words." },
    "by the way": { reason: "lexical_expression", split: "by → prie, the → —, way → kelias is false; the discourse marker = beje.", minimal: "All three words." },
    "just in case": { reason: "lexical_expression", split: "just → tik, in → į, case → atvejis is false; = dėl viso pikto.", minimal: "All three words." },
    "let's hope": { reason: "lexical_expression", split: "let → leisk + 's (us) → mums + hope → tikėtis asks for permission; the proposal = tikėkimės (kad).", minimal: "Two words; the clause stays outside." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausiai is false; = bent jau.", minimal: "Two words." },
    "oh boy": { reason: "lexical_expression", split: "oh → o + boy → berniukas is false; the exclamation = oi, oi.", minimal: "Two words." },
    "hang in there": { reason: "lexical_expression", split: "hang → kabėk, in → į, there → ten is false; encouragement = laikykis.", minimal: "All three words." },
    "one bit": { reason: "lexical_expression", split: "one → vienas + bit → gabalėlis is false; after a negation = nė kiek.", minimal: "Two words." },
    "good for you": { reason: "lexical_expression", split: "good → gerai, for → už, you → tave is false; praise = šaunuolis / šaunuolė.", minimal: "All three words." },
    "lucky you": { reason: "lexical_expression", split: "lucky → laimingas + you → tu is a calque; = tau pasisekė.", minimal: "Two words." },
    "get up to": { reason: "lexical_expression", split: "get → gauti, up → aukštyn, to → į is false; “get up to” = veikti.", minimal: "All three words." },
    "up to": { reason: "lexical_expression", split: "up → aukštyn + to → į is false; “be up to” = veikti.", minimal: "Two words; “are” stays outside (flagged)." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is false; asking back = o kaip.", minimal: "The person stays outside." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”, a calque; asking back = o kaip.", minimal: "The person stays outside." },
    "right here": { reason: "lexical_expression", split: "right → teisingai / dešinėje + here → čia is false; = čia pat.", minimal: "Two words." },
    "mail carrier": { reason: "lexical_expression", split: "mail → paštas + carrier → nešėjas gives “pašto nešėjas”; the job = laiškininkas.", minimal: "Two words, one job." },
    "hardware store": { reason: "lexical_expression", split: "hardware → techninė įranga + store → parduotuvė is false; = ūkinių prekių parduotuvė.", minimal: "Two words, one shop." },
    "i've lived": { reason: "grammatical_fusion", split: "I've → aš turiu + lived → gyvenęs gives a false possessive; the present perfect of a state that goes on = gyvenu.", minimal: "Subject, auxiliary and participle." },
    "going to ask": { reason: "grammatical_fusion", split: "going → einantis + to ask → paklausti is false; the “be going to” future = paklausi.", minimal: "All three words." },
    "plenty of room": { reason: "lexical_expression", split: "plenty → daugybė, of → —, room → kambarys is false; = vietos užteks.", minimal: "All three words." },
    "good thing": { reason: "lexical_expression", split: "good → geras + thing → daiktas gives “geras daiktas”; “good thing (that)” = gerai, kad.", minimal: "Two words; the clause stays outside." },
    "come on": { reason: "lexical_expression", split: "come → ateik + on → ant is false; urging = nagi.", minimal: "Two words." },
    "go on": { reason: "lexical_expression", split: "go → eik + on → ant is false; urging = eik (nagi).", minimal: "Two words." },
    "is late": { reason: "grammatical_fusion", split: "is → yra + late → vėlus gives a stative “yra vėlus”; running late = vėluoja.", minimal: "Two words." },
    "good one": { reason: "grammatical_fusion", split: "one → viena would add a false numeral; the prop-word stands for “day”: geros dienos (C-ONE).", minimal: "Adjective and prop-word." },
    "get going": { reason: "lexical_expression", split: "get → gauti + going → einantis is false; = eiti (išeiti).", minimal: "Two words." },
    "see you around": { reason: "lexical_expression", split: "see → matysiu, you → tave, around → aplink is a literal reading of a farewell (= iki pasimatymo).", minimal: "The whole farewell." },
    "so far, so good": { reason: "lexical_expression", split: "a set phrase; word by word (taip toli, taip gerai) is nonsense; = kol kas viskas gerai.", minimal: "The whole saying." },
    "lots of": { reason: "lexical_expression", split: "lots → daug + of → — leaves a stray preposition; = daug.", minimal: "Two words." },
    "not really": { reason: "lexical_expression", split: "not → ne + really → tikrai gives “ne tikrai”; the reply = nelabai.", minimal: "Two words." },
    "i'll be late": { reason: "grammatical_fusion", split: "I'll be → būsiu + late → vėlus gives “būsiu vėlus”; being late = pavėluosiu.", minimal: "Subject, auxiliary and adjective." },
    "suit yourself": { reason: "lexical_expression", split: "suit → tikti + yourself → sau is false; letting someone choose = kaip nori.", minimal: "Two words." },
    "you bet": { reason: "lexical_expression", split: "you → tu + bet → lažiniesi is false; the emphatic yes = dar kaip.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pakalbėk su Franku apie orą", done: (c) => !!c.s.weatherDone },
    { lt: "Pasakyk, iš kur esi", optional: true, when: (c) => !c.s.known, done: (c) => !!c.s.fromDone },
    { lt: "Papasakok apie savaitgalį", done: (c) => !!c.s.weekendDone },
    { lt: "Paklausk Franko apie jį patį („And you?“)", done: (c) => !!c.s.askedBack || !!c.s.turnSkipped },
    { lt: "Atvažiavus autobusui, mandagiai atsisveikink", done: (c) => !!c.s.byeDone && !!c.s.busHere },
  ],

  steps: onlyWhileOpen([
    { id: "weather", done: (c) => !!c.s.weatherDone,
      ask: (c) => { c.s.lastTopic = "weather"; c.s.wxAsked = true; if (W(c) === "cloudy") c.s.rainSaid = true; c.say("wxq_" + W(c)); expectWeather(c); },
      expects: WX_INTENTS,
      suggest: [{ lt: "Pritarti arba pakalbėti apie orą", hint: "wx_lovely" }],
      yes: (c) => { wxReact(c, null, false); },
      no: (c) => { wxNo(c); },
      help: (c) => { c.s.weatherDone = true; c.say("wx_help"); } },
    { id: "new_q", when: (c) => !c.s.known && !!c.s.weatherDone, done: (c) => !!c.s.newDone,
      ask: (c) => { c.s.lastTopic = "new"; c.say("new_q"); },
      expects: ["new_yes", "new_no", "new_when_ctx", "intro_name", "nice_meet"],
      suggest: [{ lt: "Pasakyti, ar neseniai čia gyveni", hint: "new_here" }],
      yes: (c) => { newAnswer(c, true); },
      no: (c) => { newAnswer(c, false); } },
    { id: "from_q", when: (c) => !c.s.known && !!c.s.newDone, done: (c) => !!c.s.fromDone,
      ask: (c) => { c.s.lastTopic = "from"; c.say("from_q"); },
      expects: ["from_ans", "from_ctx", "from_other_ctx", "q_from"],
      suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from", options: "country" }],
      help: (c) => { c.s.fromDone = true; c.say("ok"); } },
    { id: "weekend_past", when: (c) => MON(c) && !!c.s.weatherDone, done: (c) => !!c.s.weekendDone,
      ask: (c) => askTopic(c, "weekend", "wkp_q", "wkp_and_yours"),
      expects: ["wk_act_ctx", "act_ctx", "wk_good_ctx", "wk_bad_ctx", "wk_nothing_ctx", "ask_back", "q_weekend"],
      suggest: [{ lt: "Papasakoti, kaip praleidai savaitgalį", hint: "weekend_past" }, { lt: "Paklausti Franko atgal", hint: "back" }],
      yes: (c) => { weekendShort(c, null); },
      no: (c) => { weekendBad(c, null); },
      help: (c) => { weekendNothing(c, null); } },
    { id: "week", when: (c) => !!c.s.askWeek && !!c.s.weatherDone && (!MON(c) || !!c.s.weekendDone), done: (c) => !!c.s.weekDone,
      ask: (c) => askTopic(c, "week", MON(c) ? "week_q_mon" : "week_q", "week_and_you"),
      expects: ["week_busy_ctx", "week_quiet_ctx", "busy_why_ctx", "ask_back", "q_week"],
      suggest: [{ lt: "Papasakoti apie savo savaitę", hint: "week" }, { lt: "Paklausti Franko atgal", hint: "back" }],
      yes: (c) => { weekBusy(c, null); },
      no: (c) => { weekQuiet(c, null); },
      help: (c) => { c.s.weekDone = true; c.say(MON(c) ? "busy_monday" : "busy_friday"); } },
    { id: "weekend_plans", when: (c) => !MON(c) && !!c.s.weatherDone && (!c.s.askWeek || !!c.s.weekDone), done: (c) => !!c.s.weekendDone,
      ask: (c) => askTopic(c, "plans", "wkf_q", "wkf_and_you"),
      expects: ["wk_act_ctx", "act_ctx", "wk_yes_ctx", "wk_nothing_ctx", "wk_notyet_ctx", "ask_back", "q_plans"],
      suggest: [{ lt: "Papasakoti apie savaitgalio planus", hint: "weekend_plans" }, { lt: "Paklausti Franko atgal", hint: "back" }],
      yes: (c) => { weekendShort(c, null); },
      no: (c) => { weekendNothing(c, null); },
      help: (c) => { weekendNotYet(c, null); } },
    { id: "rain", when: (c) => !!c.s.rainTwist && !!c.s.weekendDone && (!c.s.askWeek || !!c.s.weekDone), done: (c) => !!c.s.rainDone,
      ask: (c) => {
        if (!c.s.rainNow) { c.s.rainNow = true; c.twist("rain"); c.say(c.s.rainSaid ? "rain_start" : "rain_start_new"); }
        if (c.s.learnerUmbrella) { c.s.rainDone = true; c.say("rain_you_have"); return; }
        c.say(c.s.offered ? "umbrella_reask" : "umbrella_offer");
        c.s.offered = true;
      },
      expects: ["umbrella_yes", "umbrella_no", "no_umbrella", "g_thanks"],
      suggest: [{ lt: "Priimti arba mandagiai atsisakyti skėčio", hint: "rain" }],
      yes: (c) => { umbrellaYes(c); },
      no: (c) => { c.s.rainDone = true; if (once(c, "umb")) c.say("umbrella_decline"); } },
    { id: "your_turn", when: (c) => !!c.s.weekendDone && (!c.s.askWeek || !!c.s.weekDone) && !c.s.askedBack && !c.s.turnSkipped,
      done: (c) => !!c.s.askedBack || !!c.s.turnSkipped,
      ask: (c) => { c.s.lastTopic = wkTopic(c); c.say(MON(c) ? "your_turn_mon" : "your_turn_fri"); },
      expects: [...ASK_FRANK, "interest"],
      suggest: [{ lt: "Paklausti Franko apie jo savaitgalį", hint: "back" }],
      yes: (c) => { c.s.turnSkipped = true; tell(c, wkTopic(c), false); },
      no: (c) => { c.s.turnSkipped = true; c.say("tell_anyway"); tell(c, wkTopic(c), false); },
      help: (c) => { c.s.turnSkipped = true; c.say("tell_anyway"); tell(c, wkTopic(c), false); } },
    { id: "late", when: (c) => !!c.s.lateTwist && coreDone(c), done: (c) => !!c.s.lateSaid,
      ask: (c) => { c.s.lateSaid = true; c.twist("bus_late"); c.say("bus_late"); c.say("more_time"); c.ask("like_q"); } },
    { id: "like_q", when: (c) => !!c.s.lateSaid, done: (c) => !!c.s.likeDone,
      ask: (c) => { c.s.lastTopic = "like"; c.say("like_q"); },
      expects: ["like_yes_ctx", "like_mixed_ctx", "like_no_ctx", "late_react_ctx", "ask_back"],
      suggest: [{ lt: "Pasakyti, kaip tau čia patinka", hint: "like" }, { lt: "Sureaguoti į vėluojantį autobusą", hint: "late" }],
      yes: (c) => { likeAnswer(c, "like_yes_react"); },
      no: (c) => { likeAnswer(c, "like_no_react"); },
      help: (c) => { likeAnswer(c, "like_mixed_react"); } },
  ]),

  init: (c) => {
    c.s.known = c.visits >= 1;
    c.s.told = {};
    c.s.invited = {};
    c.s.day = c.chance(0.5) ? "mon" : "fri";
    c.s.rainTwist = c.visits >= 1 && c.chance(0.4);
    c.s.lateTwist = c.visits >= 1 && c.chance(0.4);
    c.s.weather = c.s.rainTwist ? "cloudy" : c.pick(["lovely", "lovely", "cold", "hot", "cloudy"] as Weather[]);
    c.s.askWeek = c.chance(0.65);
    c.s.busFrank = c.visits >= 1 && c.chance(0.35);
    c.s.howOpener = c.chance(0.3);
  },

  start: (c) => {
    if (c.s.howOpener) {
      c.say(c.s.known ? "hello_known_how" : "hello_how");
      expectHowAreYou(c); // then Frank's weather remark
      return;
    }
    c.say(c.s.known ? "hello_known" : "hello");
  },

  handlers: silentAfterBye({
    // --- the weather ---
    wx_agree(c, _slots, seg) { wxReact(c, null, seg.tags.includes("tag")); },
    wx_adj(c, slots, seg) { wxReact(c, saidOf(slots, seg), seg.tags.includes("tag") || !c.s.wxAsked); },
    wx_short_ctx(c, slots, seg) { wxReact(c, saidOf(slots, seg), false); },
    wx_extra(c, slots, seg) {
      if (seg.tags.includes("umbrella")) {
        c.s.learnerUmbrella = true; c.s.weatherDone = true;
        if (once(c, "wx")) c.say("umbrella_no_react");
        return;
      }
      wxReact(c, saidOf(slots, seg), false);
    },
    wx_hope(c) {
      c.s.weatherDone = true;
      if (!once(c, "wx")) return;
      c.say("hope_react");
      if (W(c) === "cloudy" && !c.s.umbrellaSaid) { c.s.umbrellaSaid = true; c.say("umbrella_ready"); }
    },
    wx_neg(c) { wxNo(c); },
    wx_temp(c, slots, seg) { wxTemp(c, slots, seg); },
    wx_temp_ctx(c, slots, seg) { wxTemp(c, slots, seg); },
    wx_dislike(c, slots, seg) {
      c.s.weatherDone = true;
      if (!once(c, "wx")) return;
      const said = saidOf(slots, seg);
      c.say(!said || FITS[W(c)].includes(said) ? "dislike_react" : "not_today");
    },
    no_umbrella(c) {
      if (c.s.rainNow && !c.s.rainDone) { c.s.rainDone = true; if (once(c, "umb")) c.say("umbrella_reask"); return; }
      c.s.weatherDone = true;
      if (W(c) !== "cloudy") { if (once(c, "umb")) c.say("no_need_umbrella"); return; }
      c.s.umbrellaSaid = true;
      if (once(c, "umb")) c.say("umbrella_have");
    },

    // --- first visit ---
    new_yes(c, slots) { newAnswer(c, true); if (slots.name) named(c, false); },
    new_no(c) { newAnswer(c, false); },
    nice_meet(c) { if (c.s.busHere) { goodbye(c); return; } named(c, true); },
    intro_name(c) { named(c, true); },
    name_ctx(c) { named(c, false); },
    new_when_ctx(c) { newAnswer(c, true); },
    bare_name_ctx(c) { named(c, false); },
    from_ans(c, slots, seg) { fromAnswer(c, slots, seg); },
    from_ctx(c, slots, seg) { fromAnswer(c, slots, seg); },
    from_other_ctx(c) { fromAnswer(c, {}, null); },
    winter_yes_ctx(c) { if (once(c, "winter")) c.say("winter_yes_react"); },
    winter_no_ctx(c) { if (once(c, "winter")) c.say("winter_no_react"); },

    // --- the week ---
    week_busy_ctx(c, _slots, seg) { weekBusy(c, seg); },
    week_quiet_ctx(c, _slots, seg) { weekQuiet(c, seg); },
    busy_why_ctx(c, _slots, seg) { busyWhy(c, seg); },

    // --- the weekend ---
    wk_act_ctx(c, _slots, seg) { weekendAct(c, seg); },
    act_ctx(c, _slots, seg) { weekendAct(c, seg); },
    wk_good_ctx(c, _slots, seg) { weekendShort(c, seg); },
    wk_bad_ctx(c, _slots, seg) { weekendBad(c, seg); },
    wk_nothing_ctx(c, _slots, seg) { weekendNothing(c, seg); },
    wk_yes_ctx(c, _slots, seg) { weekendShort(c, seg); },
    wk_notyet_ctx(c, _slots, seg) { weekendNotYet(c, seg); },

    // --- asking Frank ---
    ask_back(c) { askBack(c); },
    q_weekend(c) { tell(c, "weekend"); },
    q_plans(c) { tell(c, "plans"); },
    q_week(c) { tell(c, "week"); },
    q_from(c) { tell(c, "from"); },
    q_live(c) { tell(c, "live"); },
    q_job(c) { tell(c, "job"); },
    q_where(c) { tell(c, "where"); },
    q_forecast(c) {
      c.s.weatherDone = true;
      if (W(c) === "cloudy") c.s.rainSaid = true;
      if (once(c, "forecast")) c.say("frank_forecast_" + W(c));
    },
    q_bus(c) { if (once(c, "bus")) c.say(c.s.lateSaid ? "late_worry" : "frank_bus"); },
    q_story(c) { tellMore(c); },
    q_name(c) { if (once(c, "name")) c.say("frank_name"); },

    // --- reactions ---
    interest(c) { if (c.s.busHere) return; tellMore(c); },
    same(c) { if (c.s.busHere) return; if (c.s.moreFor) { tellMore(c); return; } if (once(c, "same")) c.say("great_minds"); },

    // --- twists ---
    umbrella_yes(c) { if (c.s.rainNow && !c.s.rainDone) umbrellaYes(c); },
    umbrella_no(c) {
      if (c.s.rainNow && !c.s.rainDone) {
        if (/\b(have|brought|hood|raincoat|own)\b/i.test(c.heard)) umbrellaNo(c);
        else { c.s.rainDone = true; if (once(c, "umb")) c.say("umbrella_decline"); }
        return;
      }
      // "I have my umbrella" before it rains
      if (/\bumbrella\b/i.test(c.heard)) { c.s.learnerUmbrella = true; c.s.weatherDone = true; if (once(c, "umb")) c.say("umbrella_no_react"); }
    },
    late_react_ctx(c, _slots, seg) {
      if (!once(c, "late")) return;
      c.say(seg.tags.includes("worry") ? "late_worry" : seg.tags.includes("ok") ? "late_ok" : "late_typical");
    },
    like_yes_ctx(c) { likeAnswer(c, "like_yes_react"); },
    like_mixed_ctx(c) { likeAnswer(c, "like_mixed_react"); },
    like_no_ctx(c) { likeAnswer(c, "like_no_react"); },

    // --- the goodbye ---
    leave(c) { goodbye(c); },
    nice_talk(c) { goodbye(c); },
    bye_wish(c) { goodbye(c); },

    // --- shared intents, in Frank's way ---
    // greeting back after Frank's opener: his question simply comes again
    g_hello() { /* nothing to add */ },
    g_howareyou(c) { if (once(c, "how")) c.say("frank_how"); },
    howru_you(c) {
      // at the opener it answers "How's it going?"; later it is an answer plus "You?"
      if (!c.step) { if (once(c, "how")) c.say("g_asked_back"); return; }
      askBack(c);
    },
    g_ok(c) {
      if (c.s.busHere) return;
      if (c.s.moreFor) { tellMore(c); return; }
      if (c.step === "weather" && !c.s.weatherDone) { wxReact(c, null, false); return; }
      if (c.step === "week" && !c.s.weekDone) { c.s.weekDone = true; c.say("react_good"); return; }
      if (c.step === "weekend_past" && !c.s.weekendDone) { weekendShort(c, null); return; }
      if (c.step === "like_q" && !c.s.likeDone) { likeAnswer(c, "like_yes_react"); return; }
    },
    g_thanks(c) {
      if (c.s.busHere) { goodbye(c); return; }
      if (c.step === "rain" && !c.s.rainDone) { umbrellaYes(c); return; }
      // thanks for a welcome or a compliment needs no "You're welcome": Frank just goes on
      const praise = ["welcome_hood", "busy_english", "not_busy_react", "react_sport", "umbrella_have", "umbrella_yes_react", "winter_yes_react", "like_yes_react"];
      if (prevLines(c).some((l) => praise.includes(l))) return;
      if (once(c, "thanks")) c.say("g_welcome");
    },
    g_bye(c) { goodbye(c); },
  }),

  finish: (c) => {
    busArrives(c);
    expectClosing(c);
  },

  tests: [
    // weather: agreeing, the learner's own tag questions, short answers
    { say: "It sure is!", intent: "wx_agree", step: "weather" },
    { say: "Yes, it's beautiful!", intent: "wx_adj", step: "weather", slots: { wx: "nice" } },
    { say: "It's beautiful today!", intent: "wx_adj", step: "weather", slots: { wx: "nice" } },
    { say: "Yeah, beautiful!", intent: "wx_short_ctx", step: "weather", slots: { wx: "nice" } },
    { say: "I know, right?", intent: "wx_agree", step: "weather" },
    { say: "Lovely day, isn't it?", intent: "wx_adj", step: "weather", slots: { wx: "nice" } },
    { say: "It's colder than yesterday, isn't it?", intent: "wx_adj", step: "weather" },
    { say: "It does, doesn't it?", intent: "wx_agree", step: "weather" },
    { say: "Well, not today!", intent: "wx_hope", step: "weather" },
    { say: "I hope not!", intent: "wx_hope", step: "weather" },
    { say: "Oh no, I don't have an umbrella!", intent: "no_umbrella", step: "weather" },
    { say: "I'm melting!", intent: "wx_extra", step: "weather" },
    { say: "Finally some sun!", intent: "wx_extra", step: "weather" },
    { say: "So cold!", intent: "wx_short_ctx", step: "weather", slots: { wx: "cold" } },
    { say: "It's not that cold", intent: "wx_neg", step: "weather", not: ["wx_adj", "wx_short_ctx"] },
    { say: "I don't like the rain", intent: "wx_dislike", step: "weather", not: ["wx_extra"] },
    { say: "Beautiful!", intent: "none" },
    // temperatures: Fahrenheit, or Celsius converted kindly
    { say: "Yeah, it's about 75 degrees.", intent: "wx_temp", step: "weather", slots: { number: 75 } },
    { say: "Yes! It's 25 degrees!", intent: "wx_temp", step: "weather", slots: { number: 25 } },
    { say: "It's twenty degrees Celsius.", intent: "wx_temp", slots: { number: 20 } },
    { say: "Seventy-five degrees, isn't it?", intent: "wx_temp", slots: { number: 75 } },
    { say: "It's about 70.", intent: "wx_temp_ctx", step: "weather", slots: { number: 70 } },
    { say: "It's not 75 degrees", intent: "none" },
    // an activity in the same answer is understood too
    { say: "Not yet. Maybe I'll go to the beach.", intent: "wk_notyet_ctx", step: "weekend_plans" },
    { say: "Maybe I'll go to the beach, I don't know yet.", intent: "wk_act_ctx", step: "weekend_plans" },
    // first visit
    { say: "Yes, I just moved here.", intent: "new_yes", step: "new_q" },
    { say: "Yes, I moved here last month.", intent: "new_yes", step: "new_q" },
    { say: "I'm not new here", intent: "new_no", step: "new_q", not: ["new_yes"] },
    { say: "No, I've lived here for a year.", intent: "new_no", step: "new_q" },
    { say: "Nice to meet you, Frank! I'm Tomas.", intent: "intro_name", slots: { name: "Tomas" } },
    { say: "Nice to meet you too!", intent: "nice_meet" },
    { say: "I'm from Lithuania.", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "I'm Lithuanian.", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "Lithuania", intent: "from_ctx", step: "from_q", slots: { country: "lithuania" } },
    { say: "I'm from Kaunas.", intent: "from_ans", slots: { city: "kaunas" } },
    { say: "I'm not from Lithuania", intent: "none" },
    // the week
    { say: "Crazy busy!", intent: "week_busy_ctx", step: "week" },
    { say: "Yes, very busy.", intent: "week_busy_ctx", step: "week" },
    { say: "Not really, pretty quiet.", intent: "week_quiet_ctx", step: "week", not: ["week_busy_ctx"] },
    { say: "Not that busy", intent: "week_quiet_ctx", step: "week", not: ["week_busy_ctx"] },
    { say: "Work, mostly.", intent: "busy_why_ctx", step: "week" },
    { say: "Busy week?", intent: "q_week" },
    // the weekend
    { say: "It was great, thanks!", intent: "wk_good_ctx", step: "weekend_past" },
    { say: "Not bad, you?", intent: "wk_good_ctx", step: "weekend_past" },
    { say: "We went to the beach.", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "It was great! I visited my friends.", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "I just relaxed at home.", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "Nothing special.", intent: "wk_nothing_ctx", step: "weekend_past" },
    { say: "I didn't do anything.", intent: "wk_nothing_ctx", step: "weekend_past", not: ["wk_act_ctx"] },
    { say: "Too short!", intent: "wk_good_ctx", step: "weekend_past" },
    { say: "I was sick all weekend", intent: "wk_bad_ctx", step: "weekend_past" },
    { say: "I'm going to the beach.", intent: "wk_act_ctx", step: "weekend_plans" },
    { say: "We're having a barbecue.", intent: "wk_act_ctx", step: "weekend_plans" },
    { say: "Hiking.", intent: "act_ctx", step: "weekend_plans" },
    { say: "No plans yet.", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_yes_ctx"] },
    { say: "I don't have any plans", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_yes_ctx", "wk_act_ctx"] },
    { say: "I'm not going anywhere", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_act_ctx"] },
    { say: "I don't know yet.", intent: "wk_notyet_ctx", step: "weekend_plans" },
    { say: "Yes, a few.", intent: "wk_yes_ctx", step: "weekend_plans" },
    // asking Frank, showing interest
    { say: "How about you?", intent: "ask_back" },
    { say: "And you?", intent: "ask_back" },
    { say: "How was your weekend?", intent: "q_weekend" },
    { say: "Any plans for the weekend?", intent: "q_plans" },
    { say: "Are you from here?", intent: "q_from" },
    { say: "Is it going to rain?", intent: "q_forecast" },
    { say: "Did you catch anything?", intent: "q_story" },
    { say: "Oh, nice!", intent: "interest" },
    { say: "Really?", intent: "interest" },
    { say: "That sounds fun!", intent: "interest" },
    { say: "Lucky you!", intent: "interest" },
    // twists
    { say: "Thanks, that's so kind!", intent: "umbrella_yes", step: "rain" },
    { say: "Thank you!", intent: "g_thanks", step: "rain" },
    { say: "No, thanks, I have one.", intent: "umbrella_no", step: "rain" },
    { say: "Again? Typical!", intent: "late_react_ctx", step: "like_q" },
    { say: "Oh no, I'll be late for work!", intent: "late_react_ctx", step: "like_q" },
    { say: "I love it here!", intent: "like_yes_ctx", step: "like_q" },
    { say: "It's great, but I miss home.", intent: "like_mixed_ctx", step: "like_q" },
    { say: "I don't really like it here", intent: "like_no_ctx", step: "like_q", not: ["like_yes_ctx"] },
    // the goodbye
    { say: "I'd better get going. Nice talking to you!", intent: "leave" },
    { say: "Nice talking to you!", intent: "nice_talk" },
    { say: "You too! Have a good one!", intent: "nice_talk" },
    { say: "Have a good one!", intent: "bye_wish" },
    { say: "See you tomorrow!", intent: "bye_wish" },
    // British variants
    { say: "Have you got any plans for the weekend?", intent: "q_plans" },
    { say: "We went to the cinema.", intent: "wk_act_ctx", step: "weekend_past" },
    // gibberish and unrelated
    { say: "purple tractor sings loudly", intent: "none" },
    { say: "my banana is a computer", intent: "none" },
  ],

  sims: [
    // every answer in full
    { name: "happy path", turns: [], expect: { complete: true }, auto: AUTO },
    // "Yeah!", "Yes.", "Good." … Frank invites a little more once per topic
    { name: "short answers", turns: [], expect: { complete: true }, auto: AUTO_SHORT },
    // the learner asks back in every answer ("Not bad, you?")
    { name: "asking back", turns: [], expect: { complete: true }, auto: AUTO_BACK },
    // questions before answers; Frank's weather remark comes again after each one
    { name: "questions first", turns: ["Hi Frank! How are you?", "Is it going to rain?", "Lovely day, isn't it?"], expect: { complete: true },
      auto: except(AUTO, "weather") },
    // the learner's own tag question; the umbrella declined, the late bus
    { name: "tag questions and twists", turns: ["It's colder than yesterday, isn't it?"], expect: { complete: true }, auto: except(AUTO_TWIST, "weather") },
    // a temperature (25 = Celsius, converted), a plan inside "not yet", a busy week with its reason in the same answer
    { name: "temperature, maybe plans", turns: ["Yes! It's 25 degrees!"], expect: { complete: true },
      auto: { ...except(AUTO, "weather"), weekend_plans: "Not yet. Maybe I'll go to the beach.", weekend_past: "Nothing special. I just stayed home.",
        week: "Very busy. Work, mostly." } },
    // "I'd better get going" before the bus comes: Frank laughs it off, the chat goes on
    { name: "early goodbye", turns: ["Sorry, I'd better get going.", "Oh, right! Yes, lovely weather!"], expect: { complete: true },
      auto: { ...except(AUTO, "weather"), closing: "Bye, Frank! Have a good one!" } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

/** A bare "Yes"/"No" only answers a step that is still open (not one Frank has already moved past). */
function onlyWhileOpen(steps: StepDef[]): StepDef[] {
  return steps.map((st) => ({
    ...st,
    yes: st.yes && ((c: Ctx) => { if (!st.done(c)) st.yes!(c); }),
    no: st.no && ((c: Ctx) => { if (!st.done(c)) st.no!(c); }),
  }));
}

/** After the goodbye nobody says anything more (a second piece of "Thanks, bye!" included). */
function silentAfterBye(hs: Record<string, Handler>): Record<string, Handler> {
  return Object.fromEntries(Object.entries(hs).map(([k, h]) => [k, ((c, sl, sg) => { if (!c.s.byeDone) h(c, sl, sg); }) as Handler]));
}

function busArrives(c: Ctx) {
  c.s.busHere = true;
  c.s.moreFor = null;
  if (c.s.busFrank) c.say("frank_bus_here");
  else c.say(c.s.lateSaid ? "bus_finally" : "bus_here");
}

function umbrellaYes(c: Ctx) {
  c.s.rainDone = true;
  if (once(c, "umb")) c.say("umbrella_yes_react");
}
function umbrellaNo(c: Ctx) {
  c.s.rainDone = true;
  c.s.learnerUmbrella = true;
  if (once(c, "umb")) c.say("umbrella_no_react");
}
function likeAnswer(c: Ctx, line: string) {
  c.s.likeDone = true;
  if (once(c, "like")) c.say(line);
}

export default smallTalk;
