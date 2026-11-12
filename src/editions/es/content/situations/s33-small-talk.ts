// Song 33 "Lovely Weather" → Puerto Colibrí: "¡Qué calor!"
// Small talk with Don Pancho, a retired fisherman and neighbor, at the Calle Ceiba bus stop (usted both ways; he
// calls a known learner vecino / vecina). The stop is on calle Hidalgo, a block from the zócalo (docs/es/TOWN.md), so
// he never takes the bus "al centro". He opens with the weather of a Caribbean town, usually with a tag question:
// the heat and the humidity ("¡Qué calor! ¿Verdad?", "¡Uf, qué bochorno!"), a lovely breezy morning, a norte (the cold
// north wind of the winter months: "Amaneció fresco… dicen que entró un norte") or rain coming ("Parece que va a
// llover"); sometimes "¿Cómo está?" first. The learner may ask about the rainy season, hurricanes, the sargassum on
// the beach (and what it is), the winter or what a norte is. First visit: "¿Es nuevo por aquí?", he introduces
// himself ("Pancho, para servirle"),
// "¿De dónde es?" (Canada: "¡Allá sí hace frío en invierno!"). Then the week and the weekend: on a Monday "¿Qué tal su
// fin de semana?", on a Friday "¿Qué planes tiene?" (a beach plan gets the sargassum tip). Short answers work, and he
// gently invites more once per topic ("¿Y qué hizo?", "¿Por el trabajo o por la familia?"). The learner asks back
// ("¿Y usted?") and shows interest ("¡Qué bien!", "¿En serio?", "¡No me diga!"); he tells his side (fishing with his
// grandson at the pier, painting his old lancha), waits for a reaction and adds a little more. If the learner never
// asks back, he teases ("¿Y no me va a preguntar por mi fin de semana?"). When the bus comes the learner says goodbye
// ("Bueno, ya me voy. ¡Qué gusto platicar con usted!" → "¡Igualmente! ¡Que le vaya bien!"); on some later visits his
// own bus comes first.
// Twists (as in the English, visits ≥ 1): a downpour ("¡Qué aguacero!") and he shares his umbrella; the bus is late
// again ("¡Como siempre!"), so there is one more question ("¿Le gusta Puerto Colibrí?").
// Temperatures: Mexico uses Celsius; a Fahrenheit number ("Mi celular dice noventa grados") gets a kind conversion.
// Facts kept vague where unsure: the rainy season ("muchas tardes cae un aguacero"), the sargassum ("hay temporadas");
// the hurricane season, June to November, is the official Atlantic one. Mexican-only words have a neutral twin:
// camión (autobús), chamba (trabajo), ándele (venga / corra), platicar (conversar, as s35 twins it), and in two
// hints carne asada (parrillada, as p30 twins it).
//
// NEEDS (done on es-audit-shared, 64e68230, 5 Nov): npcs.ts `frank: [..., { informal: false }]` (the brief: usted).
//   Until it lands he inherits Maple Harbor Frank's `informal: true`: this file keeps usted copies of the shared lines
//   that differ ({u:…|t:…} in global.ts) and of the g_howareyou hint group (harmless after it); g_clarify's hints
//   show tú forms for him until then.
// NEEDS: global.ts g_bye: "que le vaya bien" is there; "que pase buen fin de semana" is not (bye_wish has it here).

import type { Ctx, EntityDef, Handler, Pending, Segment, SituationDef, StepDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities: countries and cities (where are you from). `kind` picks Don Pancho's reaction.

type Home = "cold" | "rain" | "warm" | "far" | "other";
const CT = (id: string, es: string, en: string, g: "m" | "f", home: Home, forms: string[]) => ent(id, es, en, g, { forms, art: "", attrs: { home } });

const COUNTRIES: EntityDef[] = [
  CT("usa", "Estados Unidos", "the United States", "m", "other", ["los estados unidos", "usa", "eu", "e u", "eeuu", "ee uu", "america", "norteamerica"]),
  CT("canada", "Canadá", "Canada", "m", "cold", ["canada"]),
  CT("uk", "Inglaterra", "England", "f", "rain", ["inglaterra", "el reino unido", "reino unido", "gran bretana", "gales"]),
  CT("scotland", "Escocia", "Scotland", "f", "rain", ["escocia"]),
  CT("ireland", "Irlanda", "Ireland", "f", "rain", ["irlanda"]),
  CT("australia", "Australia", "Australia", "f", "far", ["australia"]),
  CT("nz", "Nueva Zelanda", "New Zealand", "f", "far", ["nueva zelanda", "nueva zelandia"]),
];

const CITIES: EntityDef[] = [
  CT("chicago", "Chicago", "Chicago", "m", "cold", ["chicago"]),
  CT("nyc", "Nueva York", "New York", "f", "cold", ["nueva york", "new york"]),
  CT("boston", "Boston", "Boston", "m", "cold", ["boston"]),
  CT("minnesota", "Minnesota", "Minnesota", "m", "cold", ["minnesota", "minneapolis"]),
  CT("toronto", "Toronto", "Toronto", "m", "cold", ["toronto"]),
  CT("montreal", "Montreal", "Montreal", "m", "cold", ["montreal", "quebec"]),
  CT("ottawa", "Ottawa", "Ottawa", "m", "cold", ["ottawa"]),
  CT("calgary", "Calgary", "Calgary", "m", "cold", ["calgary", "winnipeg", "edmonton"]),
  CT("london", "Londres", "London", "m", "rain", ["londres", "london"]),
  CT("dublin", "Dublín", "Dublin", "m", "rain", ["dublin"]),
  CT("seattle", "Seattle", "Seattle", "m", "rain", ["seattle", "portland"]),
  CT("vancouver", "Vancouver", "Vancouver", "m", "rain", ["vancouver"]),
  CT("texas", "Texas", "Texas", "m", "warm", ["texas", "houston", "dallas", "austin"]),
  CT("florida", "Florida", "Florida", "f", "warm", ["florida", "miami", "orlando"]),
  CT("california", "California", "California", "f", "warm", ["california", "los angeles", "san diego"]),
  CT("arizona", "Arizona", "Arizona", "m", "warm", ["arizona", "phoenix"]),
  CT("sydney", "Sídney", "Sydney", "m", "far", ["sidney", "sydney", "melbourne", "brisbane"]),
];
const HOME: Record<string, Home> = Object.fromEntries([...COUNTRIES, ...CITIES].map((e) => [e.id, e.attrs!.home as Home]));

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// ---------------------------------------------------------------------------
// Flags used more than once

const F_CAMION = "Mexican: camión = city bus.";
const F_ANDELE = "Mexican: ándele = come on, go on.";
const F_TIME = "The article before a clock time has no English word.";
const F_A_PERSON = "a before a person who is the object has no English word.";
const F_NORTE = "un norte: a cold north wind that blows in for a few days in the winter months.";
const F_SARGAZO = "sargazo: brown seaweed (sargassum) that washes up on Caribbean beaches in the warm months.";
const F_QUE = "Qué + a noun: “what a …!”";
const F_PLATICAR = "Mexican: platicar = to chat; conversar is more widely used.";
const F_ASADA = "Mexican: a carne asada = a cookout; elsewhere a parrillada or an asado.";

// ---------------------------------------------------------------------------
// State helpers

type Weather = "lovely" | "cold" | "hot" | "cloudy";
type Said = "nice" | "fresh" | "cold" | "hot" | "rain";
type Topic = "weekend" | "plans" | "week" | "from" | "live" | "job" | "where" | "like" | "how";

const W = (c: Ctx) => c.s.weather as Weather;
const MON = (c: Ctx) => c.s.day === "mon";
/** No new questions once the bus is here: Don Pancho only waits for the goodbye. */
const canAsk = (c: Ctx) => !c.s.busHere;
const askedBackSeg = (seg: Segment | null | undefined) => !!seg?.tags.includes("askback");
/** Don Pancho's lines in his previous turn (the engine keeps them until this turn ends). */
const prevLines = (c: Ctx): string[] => (((c as any).conv?.lastTurn ?? []) as { lineId: string }[]).map((l) => l.lineId);
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** The learner talks about themselves: the engine forgives a verb's person, so "Tengo mucho trabajo" or "Voy al centro"
 *  also matches his questions "¿Tiene mucho trabajo?", "¿Va al centro?". Those handlers check this first. */
const mine = (c: Ctx) => /\b(tengo|tenemos|tuve|tuvimos|traigo|estoy|estamos|estuve|estuvimos|ando|andamos|voy|vamos|fui|fuimos|espero|tomo)\b/.test(fold(c.heard));

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

/** Every piece of the learner's current sentence ("Todavía no. | A lo mejor voy a la playa." is two pieces). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];
const turnTags = (c: Ctx): string[] => turnSegments(c).flatMap((sg) => sg.tags);

/** Everything the checklist needs before the goodbye counts. */
const coreDone = (c: Ctx) => !!c.s.weatherDone && !!c.s.weekendDone && (!!c.s.askedBack || !!c.s.turnSkipped) && (!!c.s.known || !!c.s.fromDone);

// --- the weather ---------------------------------------------------------------

/** Which learner comments agree with Don Pancho's weather (a cloudy day on the coast is still muggy). */
const FITS: Record<Weather, Said[]> = { lovely: ["nice", "hot", "fresh"], cold: ["cold", "fresh", "rain"], hot: ["hot", "nice"], cloudy: ["rain", "hot", "fresh"] };
function saidOf(slots: any, seg: Segment | null): Said | null {
  if (slots?.wx) return slots.wx as Said;
  for (const k of ["nice", "fresh", "cold", "hot", "rain"] as Said[]) if (seg?.tags.includes(k)) return k;
  return null;
}
const AGREE: Record<Said, string> = { nice: "wxa_lovely", fresh: "wxa_fresh", cold: "wxa_cold", hot: "wxa_hot", rain: "wxa_cloudy" };
/** The learner talked about the weather. `own`: the learner's own remark or tag question ("Hace calor, ¿no?"), which
 *  Don Pancho first agrees with ("¡Ya lo creo!"). */
function wxReact(c: Ctx, said: Said | null, own: boolean) {
  const first = !c.s.weatherDone;
  c.s.weatherDone = true;
  if (!once(c, "wx")) return;
  const fits = !said || FITS[W(c)].includes(said);
  if (!first) { c.say(own && fits ? "sure_is" : "ha_right"); return; }
  if (fits) {
    if (own) c.say("sure_is");
    c.say(said ? AGREE[said] : "wxa_" + W(c));
    return;
  }
  c.say(said === "nice" ? "wx_optimist" : said === "cold" ? "wx_you_cold" : said === "hot" ? "wx_you_hot" : said === "fresh" ? "wx_you_cold" : "wx_you_rain");
}
/** A temperature. Mexico thinks in Celsius; a number that can only be Fahrenheit (55 or more, or "Fahrenheit" said)
 *  gets a kind conversion: "¿Noventa grados? ¡Ah, en Fahrenheit! Aquí serían como 32 grados." */
function wxTemp(c: Ctx, slots: any, seg: Segment) {
  const n = Number(slots?.number);
  if (!Number.isFinite(n)) { wxReact(c, null, false); return; }
  const fahr = seg.tags.includes("unit_f") || (!seg.tags.includes("unit_c") && n >= 55);
  const cel = fahr ? Math.round(((n - 32) * 5) / 9) : n;
  if (fahr && n >= 50 && n <= 115 && once(c, "fahr")) {
    c.say("temp_echo", { f: n });
    c.say("temp_fahr", { c: cel });
  }
  wxReact(c, cel >= 30 ? "hot" : cel >= 24 ? "nice" : cel >= 19 ? "fresh" : "cold", !fahr && seg.tags.includes("tag"));
}
function wxNo(c: Ctx) {
  c.s.weatherDone = true;
  if (once(c, "wx")) c.say("wxn_" + W(c));
}
/** What a "no" must deny to disagree with his remark. Denying anything else agrees with him: "No hace calor" on a norte
 *  morning, "No hace tanto calor" on a breezy one, "No hace frío" on a muggy one. */
const CONTRA: Record<Weather, Said[]> = { lovely: ["nice"], cold: ["cold", "fresh"], hot: ["hot"], cloudy: ["rain"] };
function wxNeg(c: Ctx, said: Said | null) {
  if (said && !CONTRA[W(c)].includes(said)) { wxReact(c, null, false); return; }
  wxNo(c);
}
function expectWeather(c: Ctx) {
  const w = W(c);
  c.expect({ id: "weather", optional: true, expects: WX_INTENTS, hints: ["wx_" + w, "local_q"],
    suggest: [{ lt: w === "cloudy" ? "Answer “Parece que va a llover”" : "Agree, or say something about the weather (…, ¿verdad?)", hint: "wx_" + w },
      { lt: "Ask about the weather here", hint: "local_q" }] });
}
/** Questions about the climate here: answered once each, then "¡Como le decía!". */
function local(c: Ctx, key: string, line: string) {
  if (!once(c, "local")) return;
  if (c.s.toldLocal?.[key]) { c.say("told_already"); return; }
  c.s.toldLocal = { ...(c.s.toldLocal || {}), [key]: true };
  c.say(line);
}

// --- Don Pancho's side of the story --------------------------------------------------

const TELL: Record<Topic, string> = {
  weekend: "frank_weekend", plans: "frank_plans", week: "frank_week", from: "frank_from", live: "frank_live",
  job: "frank_job", where: "frank_where", like: "frank_like", how: "frank_how",
};
/** Stories with a little more to tell when the learner shows interest. */
const MORE: Partial<Record<Topic, string>> = { weekend: "frank_weekend_more", plans: "frank_plans_more", week: "frank_week_more" };

/** The learner asked Don Pancho about himself (asked = true), or he tells anyway (false). */
function tell(c: Ctx, topic: Topic, asked = true) {
  if (asked && topic !== "how") c.s.askedBack = true;
  if (c.s.told[topic]) { if (once(c, "told")) c.say("told_already"); return; }
  c.s.told[topic] = true;
  if (!once(c, "tell_" + topic)) return;
  // retired is said once: the second time it is "como le dije"
  c.say(topic === "week" && c.s.told.job ? "frank_week_retired" : topic === "job" && c.s.told.week ? "frank_job_retired" : TELL[topic]);
  if (MORE[topic] && canAsk(c)) { c.s.moreFor = topic; expectReact(c); }
}
/** After a story he waits for a reaction ("¡Qué bien!", "¿En serio?"), then adds a little more. One id per story
 *  (react_weekend: the fishing, react_plans: the boat, react_week: retired), so the scene shows the story he tells. */
function expectReact(c: Ctx) {
  const more = (cc: Ctx) => { tellMore(cc); };
  const story = (cc: Ctx, _sl: any, sg: Segment) => { storyQ(cc, sg); };
  // "¿Es mucho trabajo?" belongs to the boat he is going to paint; after any other story it is not a question to him
  // (an intent in `on` counts as expected, so it goes in both only here)
  const boat = c.s.moreFor === "plans";
  c.expect({ id: `react_${c.s.moreFor}`, optional: true, expects: ["interest", "same", "q_story", ...(boat ? ["story_work_ctx"] : [])], hints: ["interest"],
    suggest: [{ lt: "Show interest (“¡Qué bien!”, “¿En serio?”)", hint: "interest" }],
    on: { interest: more, same: more, q_story: story, g_ok: more, ...(boat ? { story_work_ctx: story } : {}) },
    yes: more });
}
function tellMore(c: Ctx) {
  const tp = c.s.moreFor as Topic | null;
  if (tp && MORE[tp]) { c.s.moreFor = null; if (once(c, "more")) c.say(MORE[tp]!); return; }
  if (!SAID.get(c)?.has("more") && once(c, "int")) c.say("ha_right");
}
/** A question about his story: the story's next part when it answers it, or a straight answer. */
const STORY: Record<string, string> = { catch: "story_catch", grandson: "story_grandson", boat: "story_boat", boatwhere: "story_boat_where", color: "story_color", boatname: "story_boat_name", daughter: "story_daughter", work: "story_work", every: "story_every" };
function storyQ(c: Ctx, seg: Segment) {
  const k = Object.keys(STORY).find((x) => seg.tags.includes(x));
  // "¿Pescaron algo?" right after the fishing story: "¡No pescamos nada!" is its next part
  if (k === "catch" && c.s.moreFor === "weekend") { tellMore(c); return; }
  if (!k || !once(c, "story")) { if (!k) tellMore(c); return; }
  if (c.s.moreFor) c.s.moreFor = null;
  // his daughter comes up in the week story; asked before that, he says who his family are
  c.say(k === "catch" && !c.s.told.weekend ? "story_catch_when" : k === "daughter" && !c.s.told.week ? "frank_family" : STORY[k]);
}
/** He asks a topic question; if he already told his own side, he just asks back. */
function askTopic(c: Ctx, topic: Topic, line: string, andYou: string) {
  c.s.lastTopic = topic;
  // asked again after a side question: a short reminder, not the whole question
  c.s.asks = { ...(c.s.asks || {}), [topic]: (c.s.asks?.[topic] ?? 0) + 1 };
  // after his own side: "¿Y usted?" once, then the short reminders
  const back = c.s.told[topic] && !c.s.andYou?.[topic];
  if (back) c.s.andYou = { ...(c.s.andYou || {}), [topic]: true };
  c.say(back ? andYou : c.s.asks[topic] > 1 ? `${topic}_again` : line);
}
/** "¿Y usted?": the topic he asked about last. */
function askBack(c: Ctx) {
  const map: Record<string, Topic> = { weather: "how", new: "live", from: "from", week: "week", weekend: "weekend", plans: "plans", like: "like", how: "how" };
  let tp = map[c.s.lastTopic as string] as Topic | undefined;
  if (!tp || tp === "how") tp = c.s.weekendDone ? (MON(c) ? "weekend" : "plans") : c.s.weekDone ? "week" : "how";
  tell(c, tp);
}

// --- the week ------------------------------------------------------------------------

const BUSY_LINE: Record<string, string> = { work: "busy_work", family: "busy_family", spanish: "busy_spanish", moving: "busy_moving", both: "busy_both" };
const busyKind = (tags: string[]) => ["work", "family", "spanish", "moving", "both"].find((k) => tags.includes(k));
function weekBusy(c: Ctx, seg: Segment | null) {
  c.s.weekDone = true; c.s.lastTopic = "week";
  if (!once(c, "weekreact")) { if (askedBackSeg(seg)) tell(c, "week"); return; }
  // "Muy pesada. Mucho trabajo.": the reason may come as a piece of its own
  const why = busyKind([...(seg?.tags ?? []), ...turnTags(c)]);
  if (why) c.say(BUSY_LINE[why]);
  else if (askedBackSeg(seg)) c.say(MON(c) ? "busy_monday" : "busy_friday");
  else if (canAsk(c) && !c.s.invited.week) {
    // a gentle invitation to say a little more (once)
    c.s.invited.week = true;
    c.say("busy_what");
    c.expect({ id: "busy_why", optional: true, expects: ["busy_why_ctx"], hints: ["busy_why"],
      suggest: [{ lt: "Say what keeps you busy", hint: "busy_why" }], on: {},
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

// --- the weekend (Monday: how was it; Friday: plans) -----------------------------------

const ACT_LINE: Record<string, string> = {
  beach: "react_beach", cenote: "react_cenote", home: "react_home", friends: "react_friends", party: "react_fun", work: "react_work",
  sport: "react_sport", shop: "react_fun", garden: "react_garden", fishing: "react_fishing", trip: "react_trip", fun: "react_fun",
  spanish: "busy_spanish", moving: "busy_moving", walk: "react_fun",
};
const actKind = (tags: string[]) => Object.keys(ACT_LINE).find((k) => tags.includes(k));
const wkTopic = (c: Ctx): Topic => (MON(c) ? "weekend" : "plans");
function weekendStart(c: Ctx) { c.s.weekendDone = true; c.s.lastTopic = wkTopic(c); }
/** "Fui a la playa", "Vamos a hacer una carne asada", "Pescar." */
function weekendAct(c: Ctx, seg: Segment) {
  weekendStart(c);
  if (once(c, "wk")) {
    // "Voy a la playa… bueno, no, mejor al cenote": the last activity said is the plan
    const acts = turnSegments(c).filter((sg) => ACTIVITY.has(sg.intent));
    const k = actKind((acts.length ? acts[acts.length - 1] : seg).tags);
    c.say(k ? ACT_LINE[k] : "react_fun");
    // a beach plan: check for sargassum first (once)
    if (k === "beach" && !MON(c) && !c.s.sargazoTip) { c.s.sargazoTip = true; c.say("sargazo_tip"); }
  }
  if (askedBackSeg(seg) || SAID.get(c)?.has("askback_later")) tell(c, wkTopic(c));
}
const ACTIVITY = new Set(["wk_act_ctx", "act_ctx"]);
/** "Todavía no. A lo mejor voy a la playa.", "Nada especial, me quedé en casa.": when the same answer names an
 *  activity, he reacts to the activity and the general part says nothing of its own. */
function activityToo(c: Ctx, seg: Segment | null): boolean {
  if (!turnSegments(c).some((sg) => ACTIVITY.has(sg.intent))) return false;
  weekendStart(c);
  if (askedBackSeg(seg)) {
    // "…, ¿y usted?" on the general part: he answers after his reaction to the activity
    if (SAID.get(c)?.has("wk")) tell(c, wkTopic(c));
    else once(c, "askback_later");
  }
  return true;
}
/** "Muy bien, gracias", "Bien, ¿y usted?", "Sí, algunos." (Friday): he gently asks for more. */
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
  // "No muy bien, estuve enfermo" comes in two pieces: the sickness counts wherever it is
  const sick = !!seg?.tags.includes("sick") || turnTags(c).includes("sick");
  if (!sick && activityToo(c, seg)) return;
  weekendStart(c);
  if (once(c, "wk")) c.say(sick ? "react_sick" : MON(c) ? "react_bad" : "react_none");
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
    suggest: [{ lt: past ? "Say what you did" : "Say what you're going to do", hint: past ? "weekend_what" : "weekend_plans" }],
    on: {},
    yes: (cc) => { if (once(cc, "wk")) cc.say("react_good"); },
    no: (cc) => { if (once(cc, "wk")) cc.say(past ? "react_home" : "react_none"); } });
}

// --- first visit: new here, names, where from -------------------------------------------

function newAnswer(c: Ctx, isNew: boolean) {
  c.s.lastTopic = "new";
  // a known neighbor ("Sí, vivo aquí y me gusta mucho") is not welcomed to town again
  if (c.s.newDone || c.s.known) { if (once(c, "new")) c.say("ok"); return; }
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
    suggest: [{ lt: "Introduce yourself", hint: "intro" }],
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
const NAT: Record<string, string> = { usa: "usa", canada: "canada", uk: "uk", ireland: "ireland", australia: "australia", scotland: "scotland", nz: "nz" };
function fromAnswer(c: Ctx, slots: any, seg: Segment | null) {
  c.s.lastTopic = "from";
  if (c.s.fromDone) { if (once(c, "from")) c.say("ok"); return; }
  c.s.fromDone = true;
  if (!once(c, "from")) return;
  const ctry = ([] as string[]).concat(slots?.country ?? [])[0] ?? Object.keys(NAT).find((k) => seg?.tags.includes(k));
  const city = slots?.city as string | undefined;
  const x = city ?? ctry;
  if (askedBackSeg(seg)) {
    // "Soy de Canadá. ¿Y usted?": a short reaction, then his answer (no new question)
    c.say(x ? "from_short" : "from_unknown", x ? { X: x } : {});
    tell(c, "from");
    return;
  }
  if (!x) { c.say("from_unknown"); return; }
  const home = HOME[x] ?? "other";
  if (home === "warm") { c.say("from_warm", { X: x }); return; }
  if (home === "far") { c.say("from_far", { X: x }); return; }
  if (home === "other") { c.say("from_other", { X: x }); return; }
  c.say(home === "cold" ? "from_cold" : "from_rain", { X: x });
  if (!canAsk(c)) return;
  c.expect({ id: "winter", optional: true, expects: ["winter_yes_ctx", "winter_no_ctx"], hints: ["winter"],
    suggest: [{ lt: "Say what the weather is like back home", hint: "winter" }],
    on: {}, yes: (cc) => { if (once(cc, "winter")) cc.say("winter_yes_react"); }, no: (cc) => { if (once(cc, "winter")) cc.say("winter_no_react"); } });
}

// --- the goodbye ------------------------------------------------------------------------

function goodbye(c: Ctx) {
  if (c.s.byeDone || !once(c, "goodbye")) return;
  if (!c.s.busHere) {
    const conv = (c as any).conv;
    if (conv?.nextStep && !conv.nextStep(c)) {
      // nothing left to talk about: the bus comes right now, and this is the goodbye
      c.s.__finished = true;
      busArrives(c);
    } else {
      // "Ya me voy" before the bus comes: once he laughs it off, the second time he lets go
      if (!c.s.earlyWarned) { c.s.earlyWarned = true; if (once(c, "early")) c.say("bus_not_here"); return; }
      c.s.byeDone = true; c.say("early_bye"); c.end(); return;
    }
  }
  c.s.byeDone = true;
  if (coreDone(c)) c.complete();
  const h = (c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const nice = /\b(gusto|placer|encantad[oa]|igualmente|usted tambien|agradable)\b/.test(h);
  const wish = /\b(que (le|te) vaya|que (tenga|pase|disfrute)|buen fin|feliz fin|saludos|suerte|cuidese|cuidate|nos vemos|hasta (manana|luego|pronto|el))\b/.test(h);
  if (c.s.busFrank) {
    if (wish || nice) c.say("bye_thanks");
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
    suggest: [{ lt: his ? "Say goodbye to Don Pancho (“¡Igualmente!”)" : "Say goodbye politely (“Bueno, ya me voy…”)", hint: his ? "bye_reply" : "bye" }],
    on: { leave: bye, nice_talk: bye, bye_wish: bye, nice_meet: bye, g_bye: bye, g_thanks: bye },
    // anything else: he hurries the learner along (twice), then says goodbye himself
    ask: (cc) => {
      cc.s.hurry = (cc.s.hurry ?? 0) + 1;
      if (cc.s.hurry > 2) { cc.s.byeDone = true; cc.say(his ? "frank_see_you" : MON(cc) ? "bye_plain" : "bye_plain_wk"); cc.end(); return; }
      cc.say(his ? "frank_wave" : "bus_hurry");
    },
  };
  c.expect(p);
}

// Intents that answer his weather remark
const WX_INTENTS = ["wx_agree", "wx_adj", "wx_short_ctx", "wx_extra", "wx_hope", "wx_neg", "wx_dislike", "no_umbrella", "wx_temp", "wx_temp_ctx"];
const ASK_FRANK = ["ask_back", "q_weekend", "q_plans", "q_week", "q_from", "q_live", "q_job", "q_where"];

// Automatic answers the simulation uses when he asks one of his (optional) questions.
const AUTO: Record<string, string> = {
  howareyou: "Muy bien, gracias. ¿Y usted?", weather: "¡Sí, tiene razón!", new_q: "Sí, acabo de llegar.", intro: "¡Mucho gusto, Don Pancho! Yo soy Ryan.",
  from_q: "Soy de Canadá.", winter: "¡Sí, muchísimo frío!", week: "Sí, mucho trabajo.", busy_why: "El trabajo, sobre todo.",
  weekend_past: "¡Muy bien! Fui a la playa.", wkp_what: "Visité a unos amigos.", weekend_plans: "Voy a ir a la playa.",
  wkf_what: "Voy a visitar a mi familia.", your_turn: "¡Perdón! ¿Y usted?", react_weekend: "¡Qué bien!", react_plans: "¡Qué bien!",
  react_week: "¡Qué bien!", rain: "¡Gracias, qué amable!",
  like_q: "¡Me encanta!", closing: "Bueno, ya me voy. ¡Qué gusto platicar con usted!",
};
/** An answer map without some keys: those questions are then answered by the sim's own turns. */
const except = (a: Record<string, string>, ...keys: string[]) => Object.fromEntries(Object.entries(a).filter(([k]) => !keys.includes(k)));
const AUTO_SHORT: Record<string, string> = {
  howareyou: "Bien, gracias.", weather: "¡Sí!", new_q: "Sí.", intro: "Ryan.", from_q: "Canadá.", winter: "Sí.", week: "Sí.",
  busy_why: "El trabajo.", weekend_past: "Bien.", wkp_what: "Nada especial.", weekend_plans: "Sí.", wkf_what: "La playa.", your_turn: "¿Y usted?",
  react_weekend: "¿En serio?", react_plans: "¿En serio?", react_week: "¿En serio?", rain: "¡Gracias!", like_q: "¡Mucho!", closing: "¡Adiós!",
};
const AUTO_BACK: Record<string, string> = {
  ...AUTO, weather: "¡Ya lo creo! ¿Y cómo está usted?", from_q: "Soy de Canadá. ¿Y usted?", week: "¡Una locura! ¿Y usted?",
  weekend_past: "Bien, ¿y usted?", weekend_plans: "Nada especial. ¿Y usted?", react_weekend: "¿En serio? ¡Qué padre!",
  react_plans: "¿En serio? ¡Qué padre!", react_week: "¿En serio? ¡Qué padre!", like_q: "¡Me encanta! ¿Y a usted?",
};
const AUTO_TWIST: Record<string, string> = {
  ...AUTO, rain: "No, gracias, traigo el mío.", like_q: "¿Otra vez? ¡Como siempre! Pero me encanta el pueblo.", closing: "¡Igualmente! ¡Que le vaya bien!",
};

// ---------------------------------------------------------------------------
// Grammar pieces: the weekend's activities, as an infinitive ("voy a ir a la playa") and as a finite verb ("fui a la
// playa", "vamos a la playa", "me quedé en casa"); the tag names Don Pancho's reaction.

const PLACES_TRIP = "(cancun | playa del carmen | tulum | merida | bacalar | cozumel | chetumal | valladolid | chichen itza | las ruinas | la ciudad | otro pueblo)";
const GO = "(fui | fuimos | voy | vamos | vaya | vayamos | iré | iremos)";
const ACT_INF: string[] = [
  "(ir (a la playa | al mar | a nadar | a la alberca | a bucear | a hacer snorkel) | nadar | bucear | surfear | hacer snorkel) #beach",
  "ir (al cenote | a los cenotes | a un cenote | a nadar al cenote) #cenote",
  "((quedarme | quedarnos) en (casa | la casa) | descansar [en casa | mucho | todo el dia] | (ver | mirar) (la tele | television | peliculas | una pelicula | series | netflix | el futbol | el partido) | leer [un libro] | (limpiar | arreglar) (la casa | el departamento | mi casa) | dormir (mucho | hasta tarde) | relajarme) #home",
  "((visitar | ver) @who | (comer | cenar | desayunar | salir | estar | pasar tiempo) con @who | ir a ver @who) #friends",
  "(hacer (una carne asada | una fiesta | una comida | un asado | una parrillada | una reunion | una barbacoa) | ir a (una fiesta | una boda | un cumpleanos | un concierto | una reunion | una quinceanera)) #party",
  "(trabajar [todo el fin de semana | el sabado | el domingo | mucho | un poco] | estar [muy | super | bien] (ocupado | ocupada | ocupados | ocupadas)) #work",
  "(ir al gimnasio | correr | ir a correr | jugar (futbol | tenis | basquet | beisbol | voleibol) | hacer ejercicio | andar en bici | hacer yoga) #sport",
  "(ir de compras | ir al (mercado | tianguis | super | supermercado) | hacer el super | comprar (cosas | ropa | comida)) #shop",
  "(trabajar en el jardin | arreglar el jardin | sembrar (flores | plantas | arboles)) #garden",
  "[ir a] pescar #fishing",
  `([tomar el carro (y | e)] (ir a | manejar a | visitar | conocer) ${PLACES_TRIP} | ir de (paseo | viaje) | hacer un viaje | salir de viaje | viajar) #trip`,
  "(ir (al cine | a misa | a la iglesia | al museo | a comer | a cenar | a bailar | al malecon | al centro | a un restaurante) | salir a (comer | cenar | bailar)) #fun",
  "((estudiar | practicar) [mi] espanol | hacer mi tarea [de espanol]) #spanish",
  "(desempacar | acomodar mis cosas | terminar la mudanza) #moving",
  "([ir a] (caminar | pasear) [por el malecon | en la playa] | sacar al perro | pasear al perro) #walk",
];
const ACT_FIN: string[] = [
  `(${GO} (a la playa | al mar | a nadar | a la alberca | a bucear | a hacer snorkel) | (estuve | estuvimos) en la playa | (nadé | nadamos | buceé | buceamos)) #beach`,
  `(${GO} (al cenote | a los cenotes | a un cenote | a nadar al cenote) | (conocí | conocimos | visité | visitamos) (un cenote | el cenote)) #cenote`,
  "((me quedé | nos quedamos | me quedo | nos quedamos) en (casa | la casa) | (descansé | descansamos) [mucho | en casa | todo el dia] | (vi | vimos) (la tele | peliculas | una pelicula | series | netflix | el futbol | el partido) | leí [un libro | mucho] | (limpié | limpiamos) (la casa | el departamento | mi casa) | (dormí | dormimos) (mucho | hasta tarde) | (estuve | estuvimos) en (casa | la casa) | me relajé) #home",
  "((visité | visitamos | vi | fui a ver | fuimos a ver | voy a ver) @who | (comí | comimos | cené | cenamos | salí | salimos | estuve | estuvimos | desayuné) con @who | (vinieron | vienen | van a venir) (mis | unos) (amigos | papas | hijos | nietos | suegros | primos)) #friends",
  `((hice | hicimos | tuve | tuvimos) (una carne asada | una fiesta | una comida | un asado | una parrillada | una reunion | una barbacoa) | ${GO} a (una fiesta | una boda | un cumpleanos | un concierto | una reunion | una quinceanera)) #party`,
  "((trabajé | trabajamos) [todo el fin de semana | el sabado | el domingo | mucho] | (trabajo | me toca trabajar) [el sabado | el domingo | todo el fin de semana] | (tengo | tenemos | tuve | tuvimos) (mucho | muchisimo | bastante | demasiado) trabajo | (estuve | estuvimos) [muy | super | bien] (ocupado | ocupada | ocupados | ocupadas)) #work",
  `(${GO} (al gimnasio | a correr | a jugar futbol) | (jugué | jugamos) (futbol | tenis | basquet | beisbol | voleibol) | (corrí | corrimos) | (hice | hicimos) (ejercicio | yoga)) #sport`,
  `(${GO} (de compras | al mercado | al tianguis | al super | al supermercado) | (compré | compramos) (cosas | ropa | comida | unas cosas) | (hice | hicimos) el super) #shop`,
  "((trabajé | trabajamos) en el jardin | (sembré | sembramos) (flores | plantas | arboles) | arreglé el jardin) #garden",
  `(${GO} a pescar | (pesqué | pescamos)) #fishing`,
  `(${GO} a ${PLACES_TRIP} | ${GO} de (paseo | viaje) | (estuve | estuvimos) en ${PLACES_TRIP} | (conocí | conocimos | visité | visitamos) ${PLACES_TRIP}) #trip`,
  `(${GO} (al cine | a misa | a la iglesia | al museo | a comer | a cenar | a bailar | al malecon | al centro | a un restaurante) | (salí | salimos) a (comer | cenar | bailar)) #fun`,
  "((estudié | estudiamos | practiqué) [mi] espanol | (hice | terminé) mi tarea [de espanol]) #spanish",
  "(desempaqué | acomodé mis cosas | terminé la mudanza) #moving",
  `((caminé | caminamos | paseé | paseamos) [por el malecon | en la playa | por el pueblo | con mi perro] | ${GO} a (caminar | pasear) [por el malecon | a la playa] | saqué al perro) #walk`,
];
const ACT_N: string[] = [
  "([la] playa | el mar | nadar | bucear | el snorkel | snorkel) #beach",
  "(el cenote | cenote | los cenotes | un cenote) #cenote",
  "(descansar | descanso | en casa | la casa | la tele | dormir | netflix) #home",
  "(la familia | familia | mis amigos | amigos | mi familia | los amigos | los ninos | los nietos | mis papas | ver a mi familia) #friends",
  "(una fiesta | una carne asada | una boda | un cumpleanos | un concierto | una comida familiar) #party",
  "(trabajo | trabajar | la chamba | mas trabajo | mucho trabajo | muchisimo trabajo) #work",
  "(el futbol | futbol | el gimnasio | gimnasio | correr | ejercicio | yoga | tenis) #sport",
  "(compras | de compras | el mercado | el tianguis | el super) #shop",
  "(el jardin | jardineria) #garden",
  "(pescar | la pesca | de pesca) #fishing",
  `(${PLACES_TRIP} | un paseo | un viaje | un paseito) #trip`,
  "(el cine | misa | la iglesia | el malecon | el centro | bailar) #fun",
  "(estudiar | espanol | clases de espanol | la tarea) #spanish",
  "(la mudanza | desempacar) #moving",
  "(caminar | pasear | una caminata) #walk",
];

// ---------------------------------------------------------------------------

export const smallTalk: SituationDef = {
  id: "s33-small-talk",
  song: 33,
  songTitle: "Lovely Weather",
  title: { en: "¡Qué calor!", lt: "Hot today, isn't it?" },
  topic: { en: "Plática en la parada", lt: "Small talk" },
  chapter: 5,
  order: 6,
  location: "bus-stop",
  npc: "frank",
  goal: "Chat with your neighbor about the weather and the weekend, and say goodbye politely when your bus comes.",
  intro: "Morning at the Calle Ceiba bus stop. Don Pancho, a retired neighbor, is already waiting, and he loves to talk about the weather: the heat, the rain, the hurricane season. Keep the chat going: answer, ask him back (“¿Y usted?”) and show interest.",
  entities: { country: COUNTRIES, city: CITIES },

  grammar: {
    macros: {
      // asking back at the end of an answer ("Bien, ¿y usted?")
      ab: "(y usted | y a usted | usted | y usted don pancho | y usted que tal | y el suyo | y la suya | y su fin de semana | y su semana | y tu #tip:tu_neighbor | y a ti #tip:tu_neighbor | y el tuyo #tip:tu_neighbor) #askback",
      // tag questions ("…, ¿verdad?", "…, ¿no?")
      tagq: "(verdad | no | cierto | o no | no cree | no le parece | eh | verdad que si | no es cierto) #tag",
      deg: "(muy | bien | bastante | super | demasiado | un poco | algo | tan | mucho | mucha | muchisimo | muchisima | un poquito | tremendo | re | tanto | tanta)",
      approx: "(como | unos | mas o menos | casi | mas de | cerca de | alrededor de | aproximadamente | por lo menos | ya | apenas)",
      wx_when: "(hoy | esta manana | el dia | la manana | ahorita | ahora | otra vez | ya | afuera | aqui | todavia | desde temprano)",
      hedge: "(a lo mejor | tal vez | quizas | quiza | igual y | seguro | seguramente | creo que | probablemente | pienso que)",
      when_wk: "(este fin de semana | el fin de semana | el fin | el sabado | el domingo | este sabado | este domingo | manana | el sabado y el domingo | todo el fin de semana | ayer | el fin de semana pasado | el viernes (en | por) la noche | hoy (en | por) la noche | (en | por) la tarde)",
      moved_when: "(la semana pasada | el mes pasado | el ano pasado | hace (poco | poquito | unos dias | unas semanas | unos meses | una semana | un mes | {number} (dias | semanas | meses)) | este mes | ayer | antier | en {month} | el (lunes | martes | miercoles | jueves | viernes | sabado | domingo) [pasado])",
      who: "[a] [mi | mis | unos | unas | un | una] (amigos | amigas | amigo | amiga | familia | papas | padres | mama | papa | hijos | hijo | hija | hijas | ninos | nietos | nieto | hermana | hermano | hermanos | primos | esposo | esposa | novio | novia | suegros | vecinos | companeros)",
      fut: "(voy a | vamos a | pienso | pensamos | quiero | queremos | me gustaria | nos gustaria | tengo que | tenemos que | me toca | creo que voy a | a lo mejor voy a | tal vez voy a | seguramente voy a | quizas voy a | igual y voy a | espero | esperamos | planeo | planeamos)",
      act_inf: ACT_INF,
      act_fin: ACT_FIN,
      act_n: ACT_N,
      act_tail: "((pero | y) habia [mucho | muchisimo] sargazo | con @who | en (carro | camion | autobus | bici | taxi | colectivo) | en (cancun | tulum | playa del carmen | merida | la ciudad) | todo el dia | toda la tarde | un rato | (porque | por que) (llovio | estaba lloviendo | hizo mucho calor | estaba cansado | estaba cansada) | por la lluvia)",
      myname: "[y] (me llamo | soy | mi nombre es) {name}",
      wk_eval: "[estuvo | fue | me fue | nos fue | la pasé | la pasamos | lo pasé] [@deg] (bien | bonito | padre | padrisimo | genial | increible | tranquilo | divertido | excelente | de maravilla | super | buenisimo | relajado | perfecto | agradable | estupendo | fantastico)",
      // "Muy ocupado, por el trabajo", "…, tengo clases de español"
      busy_tail: "[por | con | porque tengo | tengo | es que tengo] (el trabajo #work | la chamba #work | mucho trabajo #work | un trabajo nuevo #work | el nuevo trabajo #work | los ninos #family | mis hijos #family | la familia #family | mi familia #family | mis clases de espanol #spanish | las clases de espanol #spanish | clases de espanol #spanish | mis clases #spanish | la escuela #spanish | examenes #spanish | la mudanza #moving)",
      umb: "(paraguas | sombrilla | mi paraguas | mi sombrilla | un paraguas | una sombrilla)",
      bus: "(camion | autobus | camioncito | colectivo)",
    },
    slots: {
      wx: { lexicon: [
        { id: "nice", forms: ["bonito", "bonita", "precioso", "preciosa", "lindo", "linda", "hermoso", "hermosa", "agradable", "soleado", "soleada", "perfecto", "perfecta", "increible", "maravilloso", "padre", "padrisimo", "genial", "buenisimo", "excelente", "despejado", "sol", "solecito", "buen tiempo", "buen clima", "rico"] },
        { id: "fresh", forms: ["fresco", "fresca", "fresquito", "fresquecito", "templado", "brisa", "airecito", "aire", "ventoso", "viento"] },
        { id: "cold", forms: ["frio", "fria", "friito", "helado", "helada", "congelado", "friisimo"] },
        { id: "hot", forms: ["calor", "caluroso", "calurosa", "bochorno", "humedad", "humedo", "humeda", "sofocante", "caloron", "calorcito", "caliente", "pegajoso", "bochornoso"] },
        { id: "rain", forms: ["nublado", "nublada", "gris", "feo", "fea", "lluvioso", "lluviosa", "oscuro", "nubes", "tormenta", "mojado", "lluvia"] },
      ] },
      month: { lexicon: MONTHS.map((m, i) => ({ id: String(i + 1), forms: [m] })) },
    },
  },

  intents: {
    // --- the weather ----------------------------------------------------------------
    // agreeing with his remark ("¡Ya lo creo!", "Tiene razón", "Sí, ¿verdad?")
    wx_agree: { patterns: [
      "[si] (tiene | tiene toda la) razon #h:w_know_right", "[si] (tienes | tienes toda la) razon #tip:tu_neighbor",
      "(ya lo creo | ni me diga | ni que lo diga | y que lo diga | verdad que si | asi es | totalmente) #h:w_sure_is",
    ] },
    // weather statements and the learner's own tag questions ("Hace calor, ¿no?")
    wx_adj: { patterns: [
      "[si | ya | y | para mi] [aqui] (hace | esta | esta haciendo | hizo | se siente | se puso | anda | amanecio | hay | sigue) [@deg] {wx} [@wx_when] [@tagq] #h:w_beautiful",
      "[si] (hace | esta | es) un (dia | dia muy | dia tan) [@deg] {wx} [@tagq]", "[si] (el clima | el dia | el tiempo | la manana) (esta | es) [@deg] {wx} [@wx_when] [@tagq]",
      "[si | y] (que | pero que) [@deg] {wx} [@wx_when] [@tagq]",
      "[si] que (dia | manana) (tan | mas | muy) {wx} [@tagq]",
      "[si] [@deg] {wx} (dia | manana | clima | tiempo) [@wx_when] [@tagq]",
      "[si] (esta | hace) [@deg] {wx} (el dia | el clima | el tiempo) [@tagq]",
      "[si] (parece que | creo que | seguro | ya) va a llover [@wx_when] [@tagq] #rain",
       "[si] (ya va a llover | ya esta lloviendo | ya empezó a llover | se esta nublando | se va a nublar) [@wx_when] [@tagq] #rain",
      "[si] (esta | se ve) [muy] (feo | nublado | gris | oscuro) el cielo [@tagq] #rain",
      "[si] hace (mas | menos) (calor #hot | frio #cold | fresco #fresh) que ayer [@tagq] #h:w_than_tag",
      "[si] esta (mas | menos) (caluroso #hot | fresco #fresh | bonito #nice | nublado #rain) que ayer [@tagq]",
      "[si] (hay | que) [@deg] (humedad | bochorno) [@wx_when] [@tagq] #hot",
    ] },
    // a bare adjective, only as an answer to his remark ("¡Precioso!", "Bien bonito")
    wx_short_ctx: { patterns: ["[uy | ay | uf] [@deg] {wx} [@wx_when]", "[si] (muchisimo | bastante | demasiado | horrible | tremendo | un poco | un poquito | la verdad | uy si | ay si)",
      "[si] (parece que si | eso parece | asi parece | se ve que si)"] },
    wx_extra: { patterns: [
      "(por fin | al fin) (salio | ha salido | hay | hace) [el] sol #nice #h:w_finally_sun",
      "(perfecto | ideal | buen dia | un dia perfecto) para (la playa | ir a la playa | nadar | el cenote | ir al cenote | caminar | pasear) #nice",
      "no hay ni una nube #nice",
      "me (encanta | gusta | fascina) [mucho] (este clima #nice | el clima #nice | este tiempo #nice | el sol #nice | el calor #hot | la lluvia #rain | el fresco #fresh | el frio #cold | la brisa #fresh) [de aqui] #h:w_love",
      "me (estoy | ando) (derritiendo | asando | cocinando | muriendo de calor) #hot #h:w_melting", "(estoy | ando) (sudando | empapado | empapada | sudado | sudada) [muchisimo] #hot",
      "(tengo | me muero de) [mucho | muchisimo] calor #hot",
      "(necesito | ocupo) (un | una) (sueter | chamarra | chaqueta | abrigo | cobija) #cold #h:w_jacket", "(tengo | me muero de) [mucho | un poco de] frio #cold",
      "(traigo | tengo | traje) @umb #umbrella",
      "pero [a mi | yo] me gusta [asi | el calor]",
    ] },
    wx_hope: { patterns: [
      "(ojala | espero) que no [llueva | vaya a llover] #h:w_hope_not", "ojala que hoy no #h:w_not_today", "hoy no ojala",
      "(ojala | espero) que (no llueva | aguante | llegue (primero | antes) el @bus | llegue el @bus antes)", "(cruzo | crucemos) los dedos", "esperemos que no",
    ] },
    wx_neg: { patterns: [
      "no (hace | esta | esta haciendo) [tanto | tan | muy] {wx} [@wx_when]", "no creo que (llueva | vaya a llover) #rain", "[hoy] no va a llover [hoy] #rain",
      "no esta tan (mal | feo)", "no (esta | hace) nada {wx} [@wx_when]", "no hay [tanta | mucha] {wx} [@wx_when]", "no tengo [tanto | mucho] (calor #hot | frio #cold)", "para mi no", "no se ve tan feo", "[pero] no (tanto | tan) como ayer",
    ] },
    wx_dislike: { patterns: [
      "[la verdad | pues | a mi | yo] no me (gusta | gustan | encanta) [mucho] (el calor #hot | la humedad #hot | el frio #cold | la lluvia #rain | el bochorno #hot | este clima | el clima | las tormentas #rain | el sol #nice) [la verdad] #h:w_dislike",
      "[la verdad | pues | a mi | yo] no me gusta (tanto calor #hot | tanta humedad #hot | tanto bochorno #hot | tanto frio #cold | tanta lluvia #rain) [la verdad]",
      "(odio | detesto) (el calor #hot | la humedad #hot | el frio #cold | la lluvia #rain | el bochorno #hot | este clima | los mosquitos #hot)",
      "no (soporto | aguanto) (el calor #hot | la humedad #hot | el frio #cold | la lluvia #rain | el bochorno #hot)",
      "no estoy (acostumbrado | acostumbrada) (al calor #hot | a la humedad #hot | al frio #cold)",
    ] },
    // "Estamos como a treinta grados." (Celsius here; a Fahrenheit number gets converted kindly)
    wx_temp: { patterns: [
      "[ya | hoy] [(hace | estamos a | esta a | son | debe hacer | hay | dice | marca | dicen que hace | mi celular dice | el celular dice | mi telefono dice)] [@approx] {number} (grados [centigrados #unit_c | celsius #unit_c | fahrenheit #unit_f] | centigrados #unit_c | fahrenheit #unit_f | celsius #unit_c) [@wx_when] [@tagq] #h:w_temp",
    ] },
    // "Como treinta." (only as an answer to his weather remark)
    wx_temp_ctx: { patterns: ["@approx {number} [@wx_when]", "estamos a [@approx] {number} [@wx_when] [@tagq]"] },
    no_umbrella: { patterns: [
      "no (traigo | tengo | traje | llevo | he traido) @umb [hoy] #h:w_no_umbrella",
      "se me (olvidó | quedó) @umb [en casa | en la casa]", "dejé @umb en (casa | la casa)", "y yo sin @umb",
      "(hoy | yo | y yo | yo hoy) no (traigo | tengo | traje) @umb", "[yo] tampoco (traigo | tengo | traje) @umb", "olvidé @umb [en casa | en la casa]",
    ] },

    // --- first visit: new here, names, where from ----------------------------------------
    new_yes: { patterns: [
      "[si] (acabo de | acabamos de | apenas | recien) (llegar | mudarme | mudarnos | llegué | me mudé | llegamos | nos mudamos) [aqui | al pueblo | a puerto colibri | a la colonia | a esta calle | a la calle ceiba] [@moved_when] [@myname] #h:n_moved",
      "[si] (soy | somos) (nuevo | nueva | nuevos | nuevas) [aqui | por aqui | en el pueblo | en la colonia | en la calle] [@moved_when] [@myname] #h:n_new",
      "[si] (me mudé | nos mudamos | llegué | llegamos | vine | vinimos) [aqui | al pueblo | a puerto colibri] @moved_when [@myname] #h:n_last_month",
      "[si] (llevo | llevamos) (poco tiempo | poquito | unos dias | unas semanas | un par de semanas | un mes | dos meses | unos meses | {number} (dias | semanas | meses)) [aqui | en el pueblo | viviendo aqui]",
      "[si] (vivo | vivimos) (aqui | por aqui | a la vuelta | en esta calle | aqui cerca | cerca | en la calle ceiba | en los departamentos las palmas | en las palmas | enfrente) [desde (hace poco | {month} | el mes pasado)] [@myname]",
      "[si] (rento | estoy rentando | rentamos) (un departamento | una casa | un cuarto | un depa) [aqui | por aqui | aqui cerca | cerca | a la vuelta]",
      "[si] (vivo | vivimos) en la casa (amarilla | verde | rosa | blanca | azul | de enfrente | de la esquina)",
      "[si] (estoy | estamos) aqui (por | desde hace) (unos dias | unas semanas | unos meses | un mes | {number} (dias | semanas | meses))",
      "[si] (vine | vinimos | me mudé | nos mudamos) (a trabajar | por trabajo | por el trabajo | a vivir | a estudiar | a aprender espanol | a jubilarme) [aqui]",
      "[si] [solo] (estoy | estamos) de (visita | vacaciones | paso)", "[si] mas o menos [nuevo | nueva]",
    ] },
    new_no: { patterns: [
      "[no] [ya] (llevo | llevamos | tengo | tenemos) (mucho tiempo | anos | un ano | {number} anos | varios anos | bastante tiempo | mas de un ano | rato) [aqui | viviendo aqui | en el pueblo] #h:n_no",
      "[no] no (soy | somos) (nuevo | nueva | nuevos | nuevas) [aqui | por aqui]",
      "[no] (vivo | vivimos) aqui (desde hace | hace) (anos | mucho tiempo | un ano | {number} anos | mucho | tiempo | bastante tiempo | rato)",
      "[no] (vivo | vivimos) aqui desde el ano pasado",
      "no ya (vivo | vivimos) aqui", "ya (vivo | vivimos) aqui desde hace (tiempo | anos | mucho | mucho tiempo | {number} anos)",
      "[no] (me mudé | llegué | nos mudamos | llegamos) hace (anos | mucho tiempo | {number} anos | un ano | mucho)",
      "no (me acabo de mudar | acabo de llegar) [(llevo | tengo) (anos | {number} anos | un ano | mucho tiempo) [aqui]]",
    ] },
    // "Hace un mes.", "La semana pasada." (to "¿Es nuevo por aquí?")
    new_when_ctx: { patterns: ["[apenas | solo | desde] @moved_when", "[si] (llevo | llevamos) [aqui] (solo | apenas)? (unos dias | una semana | unas semanas | un mes | unos meses | poco tiempo | poco | {number} (dias | semanas | meses)) [aqui]"] },
    nice_meet: { patterns: [
      "(mucho gusto | encantado | encantada | un placer | igualmente | el gusto es mio | un gusto | el placer es mio | gusto en conocerlo | un placer conocerlo) [tambien] #h:in_too",
      "gusto en conocerte #tip:tu_neighbor",
    ] },
    intro_name: { patterns: [
      "(mucho gusto | encantado | encantada | un placer | igualmente) [don pancho] [yo] (soy | me llamo | mi nombre es) {name} #h:in_nice",
      "[yo] (soy | me llamo | mi nombre es) {name} [y] (mucho gusto | encantado | encantada)",
      "(me llamo | mi nombre es) {name}", "(me dicen | digame | todos me dicen) {name}",
    ] },
    name_ctx: { patterns: ["(soy | me llamo | mi nombre es) {name}"] },
    bare_name_ctx: { patterns: ["{name}"] },
    from_ans: { patterns: [
      "(soy | vengo | somos | venimos) de {country} [originalmente] [@ab] #h:f_from",
      "(soy | somos) (canadiense #canada | canadienses #canada | estadounidense #usa | estadounidenses #usa | americano #usa | americana #usa | gringo #usa | gringa #usa | ingles #uk | inglesa #uk | britanico #uk | britanica #uk | irlandes #ireland | irlandesa #ireland | australiano #australia | australiana #australia | escoces #scotland | escocesa #scotland | neozelandes #nz | neozelandesa #nz) [de {city}] [@ab] #h:f_nat",
      "(soy | vengo | somos | venimos) de {city} [en {country}] [@ab] #h:f_city",
      "(naci | creci) en {country} [@ab]", "(soy | vengo) de un (pueblo | pueblito | ciudad) (en | cerca de) {country} [@ab]",
      "no (soy | vengo) de {bad:country} (soy | sino | vengo) de {country}", "no (soy | vengo) de {bad:country} sino de {country}",
      "(vivia | vivo | vivimos) en {city} [@ab]",
    ] },
    from_ctx: { patterns: ["[de] {country} [@ab]", "[de] {city} [en {country}] [@ab]"] },
    from_other_ctx: { patterns: ["(soy | vengo) de {w:any}"] },
    winter_yes_ctx: { patterns: [
      "[si] [@deg] (frio | friisimo) [en invierno] #h:wi_cold", "[si] (muchisimo | demasiado | bastante | mucho | un poco | tiene razon)", "[si] (mucha | muchisima) (lluvia | nieve)", "[si] hace (mucho | muchisimo | demasiado | un) frio [en invierno]",
      "[si] [y] (mucha | muchisima | demasiada) nieve #h:wi_snow", "[si] (llueve | nieva) (mucho | muchisimo | todo el tiempo)",
      "[si] (hace | llega a) menos {number} [grados]", "[si] (son | es) [muy] (frios | largos | duros | oscuros | horribles | frio | largo)",
      "(mas | mucho mas) frio que aqui", "[demasiado] frio para mi", "[si] por eso (vine | me vine | estoy) aqui", "[si] por eso me (gusta | encanta) (el sol | aqui | este clima)",
    ] },
    winter_no_ctx: { patterns: [
      "[no] no tanto [la verdad] #h:wi_not_bad", "no (es | son | hace) (tan | tanto) (frio | malo | malos | feo)", "no hace [tanto | mucho] frio [alla | en invierno]", "no llueve (tanto | mucho) [alla]", "ya no (tanto | hace tanto frio)", "depende",
      "(me acostumbré | ya me acostumbré | estoy acostumbrado | estoy acostumbrada)", "igual que aqui",
    ] },

    // --- the week ---------------------------------------------------------------------------
    week_busy_ctx: { patterns: [
      "[si] [@deg] (ocupado | ocupada | pesada | pesado | ajetreada | ajetreado | complicada | intensa | intenso | llena | cansado | cansada) [@busy_tail] [@ab] #h:wk_busy",
      "(estoy | ando | estuve | he estado | ha sido | fue | esta | va a estar | va a ser) [@deg] (ocupado | ocupada | pesada | pesado | ajetreado | ajetreada | intensa | intenso | complicada | cansado | cansada) [@busy_tail] [@ab]",
      "(ha sido | fue | va a ser) una semana [muy] (larga | pesada | dificil | complicada | intensa | ocupada) [@ab]", "[si] (un poco | algo) [@ab]",
      "(tengo | traigo) (muchas | varias) clases [@ab] #spanish",
      "[uf] (una locura | de locos | un caos) [@ab] #h:wk_crazy",
      "[si] (mucho | muchisimo | demasiado | un monton de | bastante) (trabajo | chamba | curro | que hacer | pendientes) [@ab] #work #h:wk_work",
      "(tengo | tenemos | traigo) (mucho | muchisimo | demasiado | un monton de | bastante) (trabajo | chamba | curro | que hacer | pendientes) [@ab] #work",
      "[si] (muchisimo | bastante | demasiado | mucho) [@ab]",
      "(trabajé | trabajo | he trabajado | estoy trabajando) (mucho | muchisimo | todos los dias | hasta tarde) [@ab] #work",
    ] },
    week_quiet_ctx: { patterns: [
      "[no] (no mucho | no tanto | no tan pesada | no tan ocupado | no tan ocupada | no muy pesada) [la verdad] [@ab] #h:wk_quiet",
      "[no] [bastante | muy | super | pues] (tranquila | tranquilo | relajada | relajado | normal | calmada | ligera | ligero) [gracias] [@ab]",
      "(lo normal | lo de siempre | como siempre | normal | lo mismo de siempre) [gracias] [@ab] #h:wk_not_bad",
      "no (estoy | ando | estuve | he estado) [muy | tan] (ocupado | ocupada) [@ab]", "no (tengo | traigo) (mucho | tanto) trabajo [la verdad] [@ab]", "no (estoy | ando) [muy | tan] (cansado | cansada) [@ab]",
      "no (es | fue | esta | ha sido) [muy | tan] (pesada | ocupada | dificil) [@ab]",
      "[esta semana] (estoy | ando) de vacaciones [esta semana] [@ab]", "[ya] (estoy | ando) (jubilado | jubilada) [@ab]", "ya no trabajo [@ab]", "mas o menos [@ab]",
    ] },
    busy_why_ctx: { patterns: [
      "[por | con] [sobre todo | mas que nada] (el trabajo | trabajo | la chamba | chamba | mi trabajo | la oficina | el curro) [sobre todo | mas que nada] [@ab] #work #h:bw_work",
      "[por | con] [sobre todo | mas que nada] (la familia | familia | mi familia | los ninos | mis hijos | los hijos | mi hijo | mi hija | los nietos) [sobre todo | mas que nada] [@ab] #family #h:bw_kids",
      "(las dos cosas | los dos | ambas | ambas cosas | de todo | de todo un poco | un poco de todo) [@ab] #both #h:bw_both", "(trabajo y familia | familia y trabajo | el trabajo y la familia) [@ab] #both",
      "[mis | las] clases de espanol [@ab] #spanish #h:bw_spanish", "(la escuela | estudiar | mis estudios | el espanol | examenes | mis clases) [@ab] #spanish",
      "(la mudanza | mudarme | la casa nueva | el departamento nuevo | desempacar) [@ab] #moving",
      "(el trabajo | mi trabajo) y (las clases de espanol #spanish | la familia #family | los ninos #family | la escuela #spanish) [@ab] #work",
      // "Tengo tres hijos" (was not understood; "tengo" also matched "¿Tiene hijos?")
      "(tengo | tenemos) [{number} | muchos] (hijos | hijas | ninos | nietos) [chiquitos | pequenos] [@ab] #family", "(tengo | tenemos) (un bebe | una bebe | un hijo | una hija | un nino | una nina) [chiquito | chiquita | pequeno | pequena] [@ab] #family",
    ] },

    // --- the weekend (Monday: how was it; Friday: plans) -------------------------------------
    wk_act_ctx: { patterns: [
      "[@wk_eval] [si no llueve | si hace buen tiempo] [@hedge] [nosotros | mi familia y yo | mi esposa y yo | mi esposo y yo] [solo | nada mas | mas que nada | sobre todo | tambien] @act_fin [@act_tail] [(y | y luego | y despues | tambien) [@hedge] @act_fin [@act_tail]] [@when_wk] [@ab] #h:wp_did",
      "[@wk_eval] [si no llueve | si hace buen tiempo] [@hedge] @fut @act_inf [@act_tail] [(y | y luego | y despues | e) [@fut] @act_inf [@act_tail]] [@when_wk] [@ab] #h:wf_did",
    ] },
    act_ctx: { patterns: ["[@hedge | solo | nada mas | mas que nada | sobre todo | pues] [ir] [a | al | a la] @act_n [(y | o) [a | al] @act_n] [@act_tail] [@when_wk] [@ab]"] },
    wk_good_ctx: { patterns: [
      "@wk_eval [gracias | muchas gracias] [@ab] #h:wp_great",
      "[estuvo | fue] (muy | demasiado | super) corto [@ab] #short #h:wp_short", "se (pasó | fue) (volando | muy rapido | rapidisimo) [@ab] #short",
      "(buen | muy buen | bonito | excelente) fin de semana [gracias] [@ab]",
      // "Tuve un buen fin de semana" (was not understood; "tuve" also matched "¿Tuvo buen fin de semana?")
      "(tuve | tuvimos | pasé | pasamos) un [@deg] (buen | bonito | excelente | gran | lindo) fin de semana [gracias] [@ab]",
      "(tuve | tuvimos | pasé | pasamos) un fin de semana [@deg] (bueno | bonito | tranquilo | divertido | padre | relajado | excelente | increible | genial | agradable) [gracias] [@ab]",
    ] },
    wk_bad_ctx: { patterns: [
      "[estuvo | fue | me fue | nos fue] (mal | muy mal | aburrido | regular | feo | horrible | fatal | pesimo) [@ab]",
      "no (me fue | nos fue | estuvo | fue) [muy | tan] (bien | bueno | divertido) [@ab]", "[pues | la verdad] no (muy | tan) (bien | bueno) [la verdad] [@ab]",
      "(estuve | estuvimos) (enfermo | enferma | enfermos | malo | mala) [todo el fin de semana | el sabado | el domingo] [@ab] #sick",
      "me (enfermé | resfrié) [@ab] #sick", "(mi | el) (hijo | hija | esposo | esposa | nieto | perro | mama | papa) (estuvo | se enfermó | se puso) [enfermo | enferma | malo | mala] [@ab] #sick",
      "llovió (todo el fin de semana | todo el sabado | todo el domingo | mucho) [@ab]", "no me (gustó | diverti) [mucho | nada] [@ab]", "mas o menos [@ab]",
      "(tuve | tuvimos | pasé | pasamos) un (mal | pesimo | horrible | fatal) fin de semana [@ab]", "(tuve | tuvimos | pasé | pasamos) un fin de semana [muy] (malo | aburrido | horrible | pesimo | fatal) [@ab]",
    ] },
    wk_nothing_ctx: { patterns: [
      "(nada | nada especial | nada en especial | no mucho | lo de siempre | lo mismo de siempre | nada nuevo | nada del otro mundo | casi nada) [la verdad] [@ab] #h:wp_nothing",
      "no (hice | hicimos) (nada | mucho | gran cosa) [especial] [@ab]", "no (fui | fuimos | salí | salimos) [a ningun lado | a ninguna parte] [@ab]",
      "[todavia | aun] no (tengo | tenemos) (planes | ningun plan) [todavia | aun] [@ab] #h:wf_none", "(sin | ningun) (planes | plan) [todavia] [@ab]",
      "no (voy | vamos) a hacer (nada | mucho | gran cosa) [especial] [@ab]", "no (voy | vamos) a (salir | ir a ningun lado) [@ab]",
      "no (fui | fuimos | pude ir | pudimos ir) (a | al) @act_n [porque llovio | por la lluvia] [@ab]",
      "no (voy | vamos) a (ir | poder ir) (a | al) @act_n [@ab]", "no (puedo | podemos) ir (a | al) @act_n [@ab]",
      "no hay planes [todavia] [@ab]", "nada planeado [todavia] [@ab]", "[no] (ninguno | ningun plan) [todavia] [@ab]",
    ] },
    wk_yes_ctx: { patterns: [
      "[si] (algunos | unos cuantos | varios | muchos | algunas cosas | varias cosas | muchas cosas | un par) [planes] [@ab]", "[si] tengo (algunos | varios | muchos | unos) planes [@ab]",
      "[si] (voy a | vamos a) hacer algo [especial | divertido | padre | bonito | diferente] [@ab]", "[si] (tengo | tenemos) algo planeado [@ab]",
    ] },
    wk_notyet_ctx: { patterns: [
      "(todavia | aun) no [lo] sé [@ab] #h:wf_notyet", "(no sé | no lo sé) (todavia | aun) [@ab]", "[ya | luego] (veré | veremos | vemos) [@ab]",
      "depende [del clima | del tiempo] [@ab]", "(quien sabe | todavia no decido | no he decidido | lo estoy pensando) [@ab]", "(todavia | aun) no [@ab]",
    ] },

    // "Bien, ¿usted?" (the shared how-are-you answer wants "y usted")
    howru_you: { patterns: ["[estoy] (bien | muy bien | todo bien | excelente | bastante bien | super bien) [gracias] usted"] },

    // --- asking Don Pancho about himself --------------------------------------------------------
    ask_back: { patterns: [
      "(y | y a) usted [don pancho] #h:b_and_you #h:b_how_about", "y (tu | a ti) #tip:tu_neighbor", "usted que (tal | cuenta | me cuenta)",
      "y (el suyo | la suya)", "cuenteme [usted]",
    ] },
    q_weekend: { patterns: [
      "[y] (que tal | como estuvo | como le fue) (su | el) fin de semana #h:b_weekend", "[y] (como le fue | usted que hizo | que hizo usted | que hizo) [el fin de semana | este fin de semana | el sabado | el domingo]",
      "(tuvo | paso) [un] buen fin de semana", "que hiciste [el fin de semana] #tip:tu_neighbor",
    ] },
    q_plans: { patterns: [
      "[y] [usted] tiene planes [para el fin de semana] #h:b_plans", "que (planes tiene | va a hacer) [este | el] fin de semana", "[y] [usted] que planes tiene",
      "[usted] va a hacer algo [especial | divertido] [este | el] fin de semana", "[y] usted que va a hacer [el | este] [fin de semana]", "[y] que va a hacer usted [el | este] [fin de semana]", "tienes planes [para el fin de semana] #tip:tu_neighbor",
    ] },
    q_week: { patterns: [
      "[y] (que tal | como va | como estuvo) su semana #h:b_week", "[y] [usted] (tiene | tuvo) mucho trabajo [esta semana] #work", "(esta | anda) muy ocupado [esta semana]", "y su semana",
    ] },
    q_from: { patterns: ["[y] [usted] es de aqui #h:b_from", "de donde es [usted]", "[usted] (nació | creció) aqui", "es de puerto colibri", "eres de aqui #tip:tu_neighbor"] },
    q_live: { patterns: [
      "(cuanto tiempo | hace cuanto) (lleva | tiene) (aqui | viviendo aqui | en el pueblo)", "hace cuanto (vive | que vive) aqui", "[usted] vive (aqui | por aqui | cerca | en esta calle)", "[y] [usted] donde vive [usted] #house", "(cual es | donde esta) su casa #house",
      "lleva mucho tiempo aqui", "hace cuanto (vive | que vive) en (puerto colibri | el pueblo)",
    ] },
    q_job: { patterns: ["[usted] (esta | ya esta) jubilado", "(a que | en que) se dedica", "[usted] (trabaja todavia | todavia trabaja | aun trabaja)", "(en que | de que) trabajaba", "que hacia antes", "es pescador"] },
    q_where: { patterns: ["(a donde | adonde) va [hoy]", "va al centro", "que @bus (espera | toma | va a tomar)", "[usted] [tambien] (espera | va a tomar | toma) el @bus", "a donde vas #tip:tu_neighbor"] },
    q_forecast: { patterns: [
      "va a llover [hoy | mas tarde | (en | por) la tarde]", "cree que (va a llover | llueva)", "que dice el pronostico", "como va a estar el (clima | tiempo) [hoy | manana | mas tarde]",
      "va a hacer (calor | frio | buen tiempo | sol) [manana | hoy | (en | por) la tarde]", "se va a (quitar | componer) el (clima | tiempo)",
    ] },
    q_temp: { patterns: [
      "cuantos grados (hace | hay | estamos | tenemos) [hoy | ahorita]", "a cuanto estamos [hoy]", "(que | cual es la) temperatura (hace | hay) [hoy]",
    ] },
    q_bus: { patterns: [
      "(a que hora | cuando) (pasa | viene | llega) el @bus", "ya (pasó | se fue) el @bus", "el @bus [siempre] (viene | llega) tarde", "siempre (viene | llega) tarde el @bus", "se tarda [mucho] el @bus", "cada cuanto pasa [el @bus]",
      "ya se me fue el @bus", "donde viene el @bus", "ya viene el @bus",
    ] },
    q_story: { patterns: [
      "[y] (pescaron | pescó | sacaron | agarraron) (algo | algun pescado | muchos pescados) #catch", "[y] que pescaron #catch",
      "(cuantos anos tiene | que edad tiene) su nieto #grandson", "su nieto tiene cuantos anos #grandson", "su nieto (pesca | sabe pescar) #grandson",
      "(es | esta) grande su lancha #boat", "que (lancha | tipo de lancha) tiene #boat", "que tipo de lancha [es] #boat", "(tiene | usted tiene) una lancha #boat", "donde (esta | tiene) su lancha #boatwhere",
      "de que color la va a pintar #color", "(que | de que) color (es | va a ser) [su lancha] #color", "(es | da | cuesta) mucho trabajo (pintarla | pintar la lancha | pintar su lancha) #work", "(pintarla | pintar la lancha | pintar su lancha) (es | da | cuesta) mucho trabajo #work", "como se llama su lancha #boatname", "que dice su hija #daughter", "(de veras | en serio) todos los dias #every",
    ] },
    // "¿Es mucho trabajo?" / "¡Mucho trabajo!" right after "voy a pintar mi lancha" (expectReact); anywhere else a bare
    // "Mucho trabajo" is the learner's own week or weekend
    story_work_ctx: { patterns: ["[y] (es | da | cuesta) [mucho | muchisimo] trabajo #work", "(mucho | muchisimo) trabajo #work"] },
    q_family: { patterns: ["[y] su familia", "(tiene | usted tiene) (nietos | hijos | familia) [aqui]", "cuantos (nietos | hijos) tiene", "vive con su familia"] },
    q_name: { patterns: ["como se llama [usted]", "perdon como dijo que se llamaba", "cual es su nombre"] },
    // the climate here (the brief's real Caribbean small talk)
    q_season: { patterns: [
      "cuando llueve (mas | mucho) #when", "(cuando es | cuando empieza | cuando termina | cuando acaba) la temporada de lluvias #when #h:q_rainy", "siempre llueve (asi | tanto)", "llueve mucho aqui",
      "siempre hace [tanto] (calor | bochorno) [aqui] #always", "(siempre | todo el ano) (hace | esta) (asi | tanto calor) [aqui] #always", "hace calor todo el ano #always",
      // the winter here: "aquí" said, so "Soy de Canadá, allá hace mucho frío en invierno" is never a question to him
      "(hace | hay) [mucho] frio (aqui | por aqui | en el pueblo) en (invierno | diciembre | enero | febrero) #winter", "[y] (aqui | por aqui) en invierno (hace | hay) [mucho] frio #winter", "[y] (aqui | por aqui) (hace | hay) [mucho] frio en (invierno | diciembre | enero | febrero) #winter",
      "[y] en invierno (hace | hay) [mucho] frio (aqui | por aqui) #winter", "(como es | que tal es | como esta) el invierno [aqui | por aqui] #winter", "(hay | tienen) invierno (aqui | por aqui) #winter",
      "(cuando | en que meses) hace (frio | fresco) [aqui | por aqui] #winter",
    ] },
    q_hurricane: { patterns: [
      "hay huracanes [aqui | por aqui] #h:q_hurricane", "(cuando es | cuando empieza | cuando termina) la temporada de huracanes", "(ha pasado | ha llegado | pasó | llegó) (algun | un) huracan [aqui | por aqui]",
      "(le dan | dan) miedo los huracanes", "es peligroso por los huracanes", "(llegan | pegan | vienen) huracanes [aqui]",
    ] },
    q_beach: { patterns: ["hay [mucho | poco] sargazo [en la playa | hoy | ahorita | ahora] #h:q_sargazo", "como esta la playa [hoy | ahorita]", "(que es | que es eso del | que es eso de) [el] sargazo #what", "y el sargazo", "esta limpia la playa"] },
    q_norte: { patterns: ["que es (un | el) norte", "que es eso de (un | el) norte", "que significa (norte | un norte)", "que es un norte exactamente"] },

    // --- reactions ------------------------------------------------------------------------
    interest: { patterns: [
      "[ay] que (bien | bonito | padre | padrisimo | divertido | interesante | lindo | rico | chido | maravilla | gusto) #h:i_nice",
      "(en serio | de veras | de verdad) #h:i_really", "no me diga #h:i_no_way", "no me digas #tip:tu_neighbor", "a poco",
      "(suena | se oye) [muy | super] (bien | divertido | padre | genial | interesante | bonito | increible) #h:i_sounds_fun",
      "que suerte [tiene] #h:i_lucky", "(ja | jaja | jajaja | je)", "me (encanta | gusta) (eso | la idea)", "que (buena | linda | bonita) (idea | historia)",
      "(orale | wow | increible | genial | fantastico | no puede ser)", "(que lastima | que pena | lastima)", "me alegro [mucho | por usted]",
    ] },
    same: { patterns: ["(yo | a mi) (tambien | tampoco)", "igual yo", "lo mismo digo", "(a mi | yo) tambien (me gusta | me encanta) (pescar | la playa | eso)", "somos dos"] },

    // --- twists ---------------------------------------------------------------------------
    umbrella_yes: { patterns: [
      "[gracias] (que | muy) amable [de su parte] #h:r_kind", "es usted muy amable", "me salvó",
      "(puedo | me puedo) (meter | quedar) [con usted | bajo su paraguas]", "gracias por (el paraguas | compartir) [su paraguas]",
    ] },
    umbrella_no: { patterns: [
      "[no gracias | gracias | esta bien | no se preocupe | vale] (traigo | tengo | traje | llevo) (el mio | mi propio paraguas | mi paraguas | mi sombrilla | un paraguas | impermeable | un impermeable | mi impermeable | gorra | mi gorra) #h:r_have_one",
      "me (gusta | encanta) la lluvia", "[no] [esta bien] no me (importa | molesta) (mojarme | la lluvia)", "(es | solo es) un poco de lluvia",
    ] },
    late_react_ctx: { patterns: [
      "(otra vez | como siempre | lo de siempre | todos los dias | ni modo | de nuevo | para variar | tipico) #typical #h:l_typical", "siempre (llega | viene) tarde #typical", "(otra vez | de nuevo) (se retrasó | se tardó | se está tardando | viene tarde | llega tarde) [el @bus] #typical", "[el @bus] (se retrasó | se tardó | viene tarde | llega tarde) (otra vez | de nuevo) #typical",
      "[uy | ay] (voy a llegar | ya voy) tarde [al trabajo | a mi cita | a la escuela | a clase] #worry #h:l_late_work", "(ay | uy | oh) no (voy a llegar | ya voy) tarde [al trabajo | a mi cita | a la escuela | a clase] #worry", "no puedo llegar tarde [otra vez] #worry", "ojala (llegue | venga) (pronto | ya) #worry", "(tengo | traigo) prisa #worry",
      "(no pasa nada | no hay problema | no importa) [tengo tiempo | no tengo prisa] #ok #h:l_no_hurry", "no (tengo | traigo) prisa #ok", "(tengo | hay) tiempo #ok", "(que bien | mejor) asi platicamos [mas] #ok",
    ] },
    like_yes_ctx: { patterns: [
      "[si] me (encanta | gusta | fascina) [mucho | muchisimo] [aqui | el pueblo | puerto colibri | vivir aqui] [hasta ahora] #h:lk_love",
      "[si] (es | esta) [muy | super] (bonito | tranquilo | lindo | precioso | padre | bonita | tranquila) [el pueblo | aqui] [me gusta]",
      "[si] la gente es [muy | super] (amable | buena | linda | simpatica) #h:lk_people", "(hasta ahora | por ahora | hasta el momento) [todo] bien #h:lk_so_far",
      "[si] estoy [muy] (feliz | contento | contenta) aqui", "[si] (muchisimo | mucho)", "[si] la comida es [muy | super] (rica | buena | deliciosa)",
      "[si] me (gusta | encanta) [mucho] (la playa | la comida | el mar | la gente | el clima | el calor)", "[si] ya (me acostumbré | estoy acostumbrado | estoy acostumbrada)",
    ] },
    like_mixed_ctx: { patterns: [
      "[si] [me gusta] pero (extraño | echo de menos) (a mi familia | mi casa | mi pais | a mis amigos | mi tierra) #h:lk_miss", "(extraño | echo de menos) [mucho] (mi casa | a mi familia | mi pais)",
      "mas o menos", "es diferente [pero me gusta]", "no me (gusta | encanta) (el calor | la humedad | los mosquitos) #heat", "[si] [me gusta] pero (hace | hay) [mucho | muchisimo | demasiado] (calor | humedad | mosquitos) #heat", "todavia me estoy acostumbrando al calor #heat", "todavia me estoy acostumbrando", "(me cuesta | es dificil) el calor #heat",
    ] },
    like_no_ctx: { patterns: [
      "[no] no me gusta (mucho | tanto) [aqui]", "no (mucho | tanto) [la verdad]", "no me (gusta | encanta)", "es [muy] (dificil | aburrido | caro) [aqui | para mi]", "quiero regresar a (mi casa | mi pais)",
    ] },

    // --- the goodbye ------------------------------------------------------------------------
    leave: { patterns: [
      "[bueno] [ya] (me voy | me tengo que ir | tengo que irme | me retiro | lo dejo) [don pancho] [(fue | ha sido) un (placer | gusto) [(platicar | charlar | conversar | hablar) con usted]] #h:by_better",
      "(ahi viene | ya viene | ya llegó | ya esta aqui | ese es | aqui viene) mi @bus", "me voy (que | porque) ya (llegó | viene) mi @bus",
      "tengo que (tomar | agarrar | alcanzar) (mi | el | este) @bus", "ya es hora de irme",
    ] },
    nice_talk: { patterns: [
      "[fue | me dio] (un | mucho)? (gusto | placer) (platicar | hablar | conversar | charlar) con usted [tambien] #h:by_nice",
      "(que | mucho) gusto (platicar | hablar | conversar | charlar | verlo) [con usted]",
      "(igualmente | usted tambien | el gusto es mio) [don pancho] #h:br_you_too", "fue un gusto", "(que | muy) (bonito | agradable) platicar con usted",
      "(me gustó | me encantó) platicar con usted", "gusto en verlo", "fue un placer", "gracias por (la platica | platicar | la conversacion | la charla)",
    ] },
    bye_wish: { patterns: [
      "que (le vaya | tenga | pase) [muy] (bien | buen dia | un buen dia | buena tarde | buen fin de semana | un buen fin de semana | bonito dia) #h:by_good_one",
      "(buen | feliz) fin de semana", "buen viaje", "(suerte | buena suerte) con (la lancha | la pintura | la pesca)", "(saludos | muchos saludos) a (su nieto | su hija | su familia | su esposa)",
      "nos vemos (manana | luego | el lunes | el viernes | por aqui | en la parada | pronto | despues | otro dia) #h:by_tomorrow #h:br_see_you",
      "hasta (manana | el lunes | el viernes | pronto)", "que disfrute (su fin de semana | el fin de semana | la pesca)",
      "[muchas] gracias [don pancho] (adios | hasta luego | nos vemos)",
    ] },
  },

  lines: {
    // --- the shared lines in usted (see NEEDS: he still inherits Maple Harbor Frank's tú) -----------------
    g_not_understood: [
      t("Perdón, | no le entendí.", "Sorry, | I didn't understand you.", "Sorry, I didn't understand you.",
        { spain: t("Perdón, | no le he entendido.", "Sorry, | I didn't understand you.", "Sorry, I didn't understand you.") }),
      t("Perdón, | ¿puede | repetir?", "Sorry, | can you | repeat?", "Sorry, could you say that again?"),
      t("Disculpe, | no entendí.", "Sorry, | I didn't understand.", "Sorry, I didn't understand.",
        { spain: t("Disculpe, | no le he entendido.", "Sorry, | I didn't understand you.", "Sorry, I didn't understand.") }),
    ],
    g_soundcheck_no: [
      t("¡Ay, | perdón! | ¿Me | lo | repite?", "Oh, | sorry! | (To) me | it | you-repeat?", "Oh, sorry! Could you say it again?"),
      t("¡Me equivoqué! | ¿Qué | dijo?", "My mistake! | What | did you say?", "My mistake! What did you say?",
        { spain: t("¡Me he equivocado! | ¿Qué | ha dicho?", "My mistake! | What | did you say?", "My mistake! What did you say?") }),
    ],
    g_slow_intro: [t("Claro, | le | hablo | más despacio.", "Sure, | (to) you | I'll-speak | more slowly.", "Sure, I'll speak more slowly.")],
    g_learning: [
      t("¡No hay problema! | Habla | muy | bien | español.", "No problem! | You speak | very | well | Spanish.", "No problem! Your Spanish is really good."),
      t("¡Está bien! | Lo | está | haciendo | muy | bien.", "That's okay! | It | you're | doing | very | well.", "That's okay! You're doing great."),
    ],
    g_speak_slowly: [t("Le | hablo | más despacio.", "(To) you | I'll-speak | more slowly.", "I'll speak more slowly.")],
    g_take_time: [t("Claro, | tómese su tiempo.", "Sure, | take your time.", "Sure, take your time.")],
    g_no_worries: [t("¡No se preocupe!", "Don't worry!", "Don't worry!")],
    g_soundcheck: [t("Perdón, | ¿{X}?", "Sorry, | {X}?", "Sorry, {X}?"), t("Perdón, | ¿dijo | {X}?", "Sorry, | did you say | {X}?", "Sorry, did you say {X}?",
        { spain: t("Perdón, | ¿ha dicho | {X}?", "Sorry, | did you say | {X}?", "Sorry, did you say {X}?") })],
    g_meaning: [t("¡Buena | pregunta! | Déjeme | mostrarle.", "Good | question! | Let me | show you.", "Good question! Let me show you."), t("Mire, | le | explico.", "Look, | (to) you | I'll-explain.", "Here, let me explain.")],
    g_write: [t("Claro, | aquí tiene.", "Sure, | here you go.", "Sure, here you go.")],

    // --- greetings --------------------------------------------------------------------------
    hello: [
      t("¡Buenos días!", "Good morning!", "Morning!"),
      t("¡Buen día!", "Good morning!", "Morning!",
        { spain: t("¡Muy buenas!", "Good morning!", "Morning!") }),
      t("¡Buenas!", "Hi!", "Hi there!"),
    ],
    hello_known: [
      t("¡Buenos días, | {m:vecino|f:vecina}!", "Good morning, | neighbor!", "Morning, neighbor!"),
      t("¡Hola, | {m:vecino|f:vecina}! | ¡Buen día!", "Hi, | neighbor! | Good morning!", "Hey, neighbor! Morning!",
        { spain: t("¡Hola, | {m:vecino|f:vecina}! | ¡Buenos días!", "Hi, | neighbor! | Good morning!", "Hey, neighbor! Morning!") }),
    ],
    hello_how: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Morning! How are you doing?"),
      t("¡Buen día! | ¿Cómo | le | va?", "Good morning! | How | (for) you | it-goes?", "Morning! How's it going?",
        { spain: t("¡Buenos días! | ¿Qué tal | le | va?", "Good morning! | How | (for) you | it-goes?", "Morning! How's it going?") }),
    ],
    hello_known_how: [t("¡Buenos días, | {m:vecino|f:vecina}! | ¿Cómo | le | va?", "Good morning, | neighbor! | How | (for) you | it-goes?", "Morning, neighbor! How's it going?")],

    // --- the weather ------------------------------------------------------------------------
    wxq_lovely: [
      t("¡Qué | bonito | día! | ¿Verdad?", "What a | beautiful | day! | Right?", "Beautiful day, isn't it?", { flags: { 0: F_QUE } }),
      t("Está | precioso | el | día, | ¿no?", "It's | lovely | the | day, | right?", "Lovely day, isn't it?"),
      t("¡Qué | bonita | mañana! | Con | esta | brisa, | da gusto.", "What a | beautiful | morning! | With | this | breeze, | it's a pleasure.", "Beautiful morning! With this breeze, it's a treat.", { flags: { 0: F_QUE } }),
    ],
    wxq_cold: [
      t("Amaneció | fresco, | ¿verdad? | Dicen | que | entró | un | norte.", "It-dawned | cool, | right? | They-say | that | came-in | a | norte.", "Chilly this morning, isn't it? They say a norte blew in.",
        { flags: { 0: "Amaneció: “the day dawned”: how the morning started.", 7: F_NORTE },
        spain: t("Ha amanecido | fresco, | ¿verdad? | Dicen | que | ha entrado | un | norte.", "It-has-dawned | cool, | right? | They-say | that | has-come-in | a | norte.", "Chilly this morning, isn't it? They say a norte blew in.", { flags: { 0: "Ha amanecido: “the day has dawned”: how the morning started.", 7: F_NORTE } }) }),
      t("¡Uy, | hace | fresquito | hoy! | ¿No?", "Ooh, | it-makes | a bit cool | today! | Right?", "Ooh, it's a bit chilly today, isn't it?", { flags: { 2: "fresquito: fresco + -ito, “a little cool”." } }),
    ],
    wxq_hot: [
      t("¡Qué | calor! | ¿Verdad?", "What a | heat! | Right?", "Hot today, isn't it?", { flags: { 0: F_QUE } }),
      t("¡Uf, | qué | bochorno! | Y | apenas | son | las | nueve.", "Phew, | what a | muggy heat! | And | only | it's | — | nine.", "Phew, it's so muggy! And it's only nine o'clock.",
        { flags: { 2: "bochorno: hot, humid, heavy air.", 6: F_TIME } }),
    ],
    wxq_cloudy: [
      t("Parece | que | va | a | llover.", "It-seems | that | it's going | to | rain.", "Looks like rain."),
      t("Ya | se está nublando, | ¿eh? | Parece | que | va | a | llover.", "Already | it's clouding over, | huh? | It-seems | that | it's going | to | rain.", "It's clouding over, huh? Looks like rain."),
    ],
    wxa_lovely: [
      t("¡Perfecto | para | ir | a | la | playa!", "Perfect | for | going | to | the | beach!", "Perfect beach weather!"),
      t("Con | esta | brisa, | ¡da gusto | salir!", "With | this | breeze, | it's a pleasure | to go out!", "With this breeze, it's a treat to be outside!"),
    ],
    wxa_fresh: [t("Sí, | con | este | airecito | da gusto.", "Yes, | with | this | little breeze | it's a pleasure.", "Yes, this little breeze is lovely.", { flags: { 3: "airecito: aire + -ito, a light breeze." } })],
    wxa_cold: [
      t("Yo | ya | saqué | mi | suéter. | ¡Ja!", "I | already | took-out | my | sweater. | Ha!", "I've already got my sweater out. Ha!", { spain: t("Yo | ya | he | sacado | el | jersey. | ¡Ja!", "I | already | I-have | taken out | the | sweater. | Ha!", "I've already got my sweater out. Ha!") }),
      t("Para | nosotros, | ¡esto | es | frío! | ¡Ja!", "For | us, | this | is | cold! | Ha!", "For us, this is cold! Ha!"),
    ],
    wxa_hot: [
      t("¡Ni me diga! | Ya | estoy | sudando.", "Don't even tell me! | Already | I'm | sweating.", "Tell me about it! I'm already sweating."),
      t("Y | con | esta | humedad... | ¡uf!", "And | with | this | humidity... | phew!", "And this humidity... phew!"),
    ],
    wxa_cloudy: [
      t("Ojalá | llegue | el | camión | antes que | la | lluvia.", "Hopefully | arrives | the | bus | before | the | rain.", "I hope the bus gets here before the rain does.",
        { flags: { 0: "Ojalá: “I hope”; the verb after it is in the subjunctive (llegue).", 3: F_CAMION },
          neutral: t("Ojalá | llegue | el | autobús | antes que | la | lluvia.", "Hopefully | arrives | the | bus | before | the | rain.", "I hope the bus gets here before the rain does.",
            { flags: { 0: "Ojalá: “I hope”; the verb after it is in the subjunctive (llegue)." } }) }),
      t("Aquí, | cuando | llueve, | llueve | fuerte, | pero | rápido | se quita.", "Here, | when | it-rains, | it-rains | hard, | but | quickly | it-clears-up.", "When it rains here, it really pours, but it clears up fast.",
        { spain: t("Aquí, | cuando | llueve, | llueve | fuerte, | pero | se quita | enseguida.", "Here, | when | it-rains, | it-rains | hard, | but | it-clears-up | quickly.", "When it rains here, it really pours, but it clears up fast.") }),
    ],
    sure_is: [
      t("¡Ya lo creo!", "I'll say!", "I'll say!"),
      t("¡Claro que sí!", "Of course!", "Absolutely!"),
      t("¡Uy, | sí!", "Ooh, | yes!", "Oh, yes!"),
    ],
    wx_optimist: [t("¡Ja! | ¡Me gusta | su | actitud!", "Ha! | I like | your | attitude!", "Ha! I like your attitude!")],
    wx_you_cold: [t("¿Frío? | ¡Ja! | ¡Hace | un | calorón!", "Cold? | Ha! | It-makes | a | big heat!", "Cold? Ha! It's boiling out here!", { flags: { 4: "calorón: calor + -ón, a big heat." } })],
    wx_you_hot: [t("¿Calor? | ¡Ja! | ¡Yo | ya | traigo | suéter!", "Hot? | Ha! | I | already | I'm-wearing | sweater!", "Hot? Ha! I've already got my sweater on!", { spain: t("¿Calor? | ¡Ja! | ¡Yo | ya | llevo | jersey!", "Hot? | Ha! | I | already | I'm-wearing | sweater!", "Hot? Ha! I've already got my sweater on!") })],
    wx_you_rain: [t("¿Lluvia? | ¡No hay | ni | una | nube!", "Rain? | There isn't | even | a | cloud!", "Rain? There's not a cloud in the sky!")],
    wxn_lovely: [t("¿No? | Bueno, | ¡mejor | que | la | lluvia!", "No? | Well, | better | than | the | rain!", "No? Well, it's better than rain!")],
    wxn_cold: [t("¿No? | ¡Usted | aguanta | más | que | yo! | ¡Ja!", "No? | You | can-take | more | than | me! | Ha!", "No? You're tougher than me! Ha!")],
    wxn_hot: [t("¿No? | ¡Pues | yo | me estoy derritiendo!", "No? | Well | I | I'm melting!", "No? Well, I'm melting!")],
    wxn_cloudy: [t("¡Ojalá | tenga razón!", "Hopefully | you're right!", "Let's hope you're right!")],
    hope_react: [t("¡Ja! | ¡Ojalá!", "Ha! | Let's hope so!", "Ha! Let's hope so!")],
    umbrella_ready: [t("Pero | yo | traigo | mi | paraguas, | por si acaso.", "But | I | I-have | my | umbrella, | just in case.", "But I brought my umbrella, just in case.",
        { spain: t("Pero | yo | llevo | paraguas, | por si acaso.", "But | I | I-carry | umbrella, | just in case.", "But I brought my umbrella, just in case.") })],
    dislike_react: [t("¡Ja! | ¡A mí | tampoco!", "Ha! | Me | neither!", "Ha! Me neither!")],
    not_today: [t("Bueno, | ¡por lo menos | hoy | no!", "Well, | at least | today | not!", "Well, at least not today!")],
    umbrella_have: [t("¡No se preocupe, | yo | traigo | uno | grande!", "Don't worry, | I | I-have | one | big!", "Don't worry, I've got a big umbrella!",
        { spain: t("¡No se preocupe, | yo | llevo | uno | grande!", "Don't worry, | I | I-carry | one | big!", "Don't worry, I've got a big umbrella!") })],
    temp_echo: [t("¿{$f} | grados?", "{$f} | degrees?", "{$f} degrees?")],
    temp_fahr: [
      t("¡Ah, | en | Fahrenheit! | Aquí | serían | como | {$c} | grados.", "Oh, | in | Fahrenheit! | Here | it-would-be | about | {$c} | degrees.", "Oh, Fahrenheit! Here that'd be about {$c} degrees.",
        { flags: { 3: "Mexico measures temperature in Celsius." } }),
    ],
    no_need_umbrella: [t("¡Ja! | ¡Hoy | no lo necesita!", "Ha! | Today | you don't need it!", "Ha! You won't need one today!")],
    wx_help: [t("¡Ja! | ¡Con | este | clima | nunca | se sabe!", "Ha! | With | this | weather | never | one knows!", "Ha! You never know with this weather!")],
    ha_right: [
      t("¡Ja! | ¿Verdad?", "Ha! | Right?", "Ha! Right?"),
      t("¡Ja! | ¡Así es!", "Ha! | That's right!", "Ha! Yep!"),
    ],
    great_minds: [t("¡Ja! | ¡Pensamos | igual!", "Ha! | We-think | the same!", "Ha! Great minds think alike!")],
    ok: [t("Ah, | ¡qué | bien!", "Oh, | how | nice!", "Oh, nice."), t("Ah, | ya veo.", "Oh, | I see.", "Oh, I see.")],
    // the climate here
    frank_rainy_when: [
      t("Más o menos | de | mayo | a | octubre. | Muchas | tardes | cae | un | aguacero, | pero | rápido | se quita.",
        "More or less | from | May | to | October. | Many | afternoons | falls | a | downpour, | but | quickly | it-clears-up.",
        "Roughly May to October. A lot of afternoons there's a downpour, but it clears up fast.",
        { spain: t("Más o menos | de | mayo | a | octubre. | Muchas | tardes | cae | un | aguacero, | pero | se quita | enseguida.", "More or less | from | May | to | October. | Many | afternoons | falls | a | downpour, | but | it-clears-up | quickly.", "Roughly May to October. A lot of afternoons there's a downpour, but it clears up fast.") }),
    ],
    frank_always: [
      t("Casi | todo | el | año, | sí. | Nada más | en | invierno | entra | un | norte | de vez en cuando | y | refresca.",
        "Almost | all | the | year, | yes. | Only | in | winter | comes-in | a | norte | once in a while | and | it-cools-down.",
        "Most of the year, yes. Only in the winter a norte blows in now and then and cools things down.", { flags: { 10: F_NORTE }, spain: t("Casi | todo | el | año, | sí. | Solo | en | invierno | entra | un | norte | de vez en cuando | y | refresca.", "Almost | all | the | year, | yes. | Only | in | winter | comes-in | a | norte | once in a while | and | it-cools-down.", "Most of the year, yes. Only in the winter a norte blows in now and then and cools things down.", { flags: { 10: F_NORTE } }) }),
    ],
    frank_rainy: [
      t("En | temporada | de | lluvias, | muchas | tardes | cae | un | aguacero. | Pero | rápido | se quita.", "In | season | of | rains, | many | afternoons | falls | a | downpour. | But | quickly | it-clears-up.",
        "In the rainy season there's a downpour a lot of afternoons. But it clears up fast.",
        { spain: t("En | temporada | de | lluvias, | muchas | tardes | cae | un | aguacero. | Pero | se quita | enseguida.", "In | season | of | rains, | many | afternoons | falls | a | downpour. | But | it-clears-up | quickly.", "In the rainy season there's a downpour a lot of afternoons. But it clears up fast.") }),
    ],
    frank_hurricane: [
      t("La | temporada | de | huracanes | es | de | junio | a | noviembre. | No | todos | los | años | llega | uno, | pero | hay que | estar | pendiente.",
        "The | season | of | hurricanes | is | from | June | to | November. | Not | all | the | years | arrives | one, | but | one has to | be | watchful.",
        "Hurricane season runs from June to November. One doesn't come every year, but you have to keep an eye out."),
    ],
    frank_sargazo: [
      t("Depende. | Hay | temporadas | en | que | llega | mucho | sargazo, | y | otras | en | que | no hay | nada.",
        "It-depends. | There-are | seasons | in | which | arrives | much | sargassum, | and | others | in | which | there isn't | any.",
        "It depends. Some seasons a lot of sargassum washes up, and others there's none at all.", { flags: { 7: F_SARGAZO } }),
    ],
    frank_sargazo_what: [
      t("Es | un | alga | café | que | llega | del | mar. | Cuando | llega | mucha, | ¡huele | feo!",
        "It's | a | seaweed | brown | that | arrives | from the | sea. | When | arrives | a lot, | it-smells | bad!",
        "It's a brown seaweed that washes in from the sea. When a lot of it comes in, it smells awful!",
        { flags: { 1: "un alga: a feminine noun that takes un (like el agua) because it starts with a stressed a.", 3: "café as a color: brown." },
        spain: t("Es | un | alga | marrón | que | llega | del | mar. | Cuando | llega | mucha, | ¡huele | fatal!", "It's | a | seaweed | brown | that | arrives | from the | sea. | When | arrives | a lot, | it-smells | awful!", "It's a brown seaweed that washes in from the sea. When a lot of it comes in, it smells awful!", { flags: { 1: "un alga: a feminine noun that takes un (like el agua) because it starts with a stressed a." } }) }),
    ],
    frank_norte: [
      t("Es | un | viento | frío | del | norte. | Llega | en | invierno | y | refresca | unos | días.", "It's | a | wind | cold | from the | north. | It-arrives | in | winter | and | it-cools-down | some | days.",
        "It's a cold wind from the north. It blows in during the winter and cools things down for a few days."),
    ],
    frank_winter: [
      t("No hace | mucho | frío. | Nada más | cuando | entra | un | norte, | refresca | unos | días.", "It doesn't make | much | cold. | Only | when | comes-in | a | norte, | it-cools-down | some | days.",
        "It doesn't get very cold. It only cools off for a few days when a norte blows in.", { flags: { 7: F_NORTE }, spain: t("No hace | mucho | frío. | Solo | cuando | entra | un | norte, | refresca | unos | días.", "It doesn't make | much | cold. | Only | when | comes-in | a | norte, | it-cools-down | some | days.", "It doesn't get very cold. It only cools off for a few days when a norte blows in.", { flags: { 7: F_NORTE } }) }),
    ],

    // --- first visit: new here, names, where from ------------------------------------------
    new_q: [
      t("Oiga, | ¿usted | es | {m:nuevo|f:nueva} | por aquí?", "Say, | you | are | new | around here?", "Say, are you new around here?", { flags: { 0: "Oiga: “listen”, a polite way to get someone's attention (usted)." } }),
      t("¿Usted | es | {m:nuevo|f:nueva} | en | el | pueblo?", "You | are | new | in | the | town?", "Are you new in town?"),
    ],
    new_q_again: [
      t("Pero | dígame, | ¿es | {m:nuevo|f:nueva} | por aquí?", "But | tell me, | are you | new | around here?", "But tell me, are you new around here?"),
      t("Y | entonces, | ¿acaba de | llegar?", "And | so, | did you just | arrive?", "So, did you just move here?"),
    ],
    from_q_again: [
      t("Pero | dígame, | ¿de | dónde | es?", "But | tell me, | from | where | are you?", "But tell me, where are you from?"),
      t("Y | entonces, | ¿de | dónde | viene?", "And | so, | from | where | you-come?", "So, where are you from?"),
    ],
    welcome_hood: [t("¡Ah, | pues | {m:bienvenido|f:bienvenida} | a | Puerto | Colibrí!", "Oh, | well | welcome | to | Puerto | Colibrí!", "Oh, well, welcome to Puerto Colibrí!")],
    new_no_react: [t("¡Ay, | perdón! | Ya | me | falla | la | memoria. | ¡Ja!", "Oh, | sorry! | Already | (to) me | fails | the | memory. | Ha!", "Oh, sorry! My memory's not what it was. Ha!")],
    frank_intro: [
      t("Por cierto, | yo | soy | Pancho, | para servirle. | Vivo | en | la | casa | rosa | de | la | esquina.", "By the way, | I | am | Pancho, | at your service. | I-live | in | the | house | pink | of | the | corner.",
        "I'm Pancho, by the way, at your service. I live in the pink house on the corner.", { flags: { 4: "para servirle: “at your service”, a courteous Mexican way to introduce yourself." } }),
    ],
    nice_meet_too: [t("¡Igualmente!", "Likewise!", "Nice to meet you too!"), t("¡El | gusto | es | mío!", "The | pleasure | is | mine!", "The pleasure's mine!")],
    nice_meet_you: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!")],
    frank_name: [t("¡Pancho, | para servirle!", "Pancho, | at your service!", "Pancho, at your service!")],
    from_q: [
      t("¿Y | de | dónde | es | usted?", "And | from | where | are | you?", "So where are you from?"),
      t("Y | usted, | ¿de | dónde | viene?", "And | you, | from | where | you-come?", "And where are you from?"),
    ],
    from_cold: [
      t("¡{X}! | ¡Uy, | allá | sí | hace | frío | en | invierno! | ¿Verdad?", "{X}! | Ooh, | there | really | it-makes | cold | in | winter! | Right?", "{X}! Ooh, it gets really cold there in the winter, right?",
        { flags: { 3: "sí before a verb: “really”, for emphasis." } }),
    ],
    from_rain: [t("¡{X}! | Allá | llueve | mucho, | ¿no?", "{X}! | There | it-rains | a lot, | right?", "{X}! It rains a lot there, doesn't it?")],
    from_warm: [t("¡Ah, | {X}! | Entonces | ya | está | {m:acostumbrado|f:acostumbrada} | al | calor.", "Oh, | {X}! | Then | already | you're | used | to the | heat.", "Oh, {X}! Then you're used to the heat.")],
    from_other: [t("¡Ah, | de | {X}! | Por aquí | vienen | muchos | de | allá.", "Oh, | from | {X}! | Around here | come | many | from | there.", "Oh, {X}! Lots of folks from there come here.")],
    from_far: [t("¡{X}! | ¡Uy, | qué | lejos! | ¡Qué bueno | que | vino | hasta | acá!", "{X}! | Wow, | how | far! | How good | that | you-came | all the way | here!", "{X}! Wow, that's far! So glad you came all this way!", { spain: t("¡{X}! | ¡Uy, | qué | lejos! | ¡Qué bien | que | haya | venido | hasta | aquí!", "{X}! | Wow, | how | far! | How good | that | you-have | come | all the way | here!", "{X}! Wow, that's far! So glad you came all this way!") })],
    from_unknown: [t("¡Ah, | qué | bien! | Yo | nunca | he ido | para | allá.", "Oh, | how | nice! | I | never | have gone | toward | there.", "Oh, nice! I've never been there.")],
    from_short: [t("¡Ah, | {X}!", "Oh, | {X}!", "Oh, {X}!")],
    winter_yes_react: [t("¡Ja! | ¡Con razón | le | gusta | tanto | el | sol | de | aquí!", "Ha! | No wonder | (to) you | it-pleases | so much | the | sun | of | here!", "Ha! No wonder you like the sun here so much!")],
    winter_no_react: [t("¿No? | ¡Pues | a lo mejor | voy | un | día | de | estos! | ¡Ja!", "No? | Well | maybe | I-go | one | day | of | these! | Ha!", "No? Well, maybe I'll visit one of these days! Ha!")],

    // --- the week ----------------------------------------------------------------------------
    week_q: [
      t("¿Y | qué tal | la | semana? | ¿Mucho | trabajo?", "And | how was | the | week? | Much | work?", "So, busy week?"),
      t("¿Qué tal? | ¿Mucha | chamba | esta | semana?", "How's it going? | Much | work | this | week?", "So, lots of work this week?",
        { flags: { 2: "Mexican, colloquial: chamba = work." }, neutral: t("¿Qué tal? | ¿Mucho | trabajo | esta | semana?", "How's it going? | Much | work | this | week?", "So, lots of work this week?") }),
    ],
    week_q_mon: [
      t("¿Y | viene | una | semana | pesada?", "And | comes | a | week | heavy?", "Busy week ahead?"),
      t("¿Mucho | trabajo | esta | semana?", "Much | work | this | week?", "Lots of work this week?"),
    ],
    week_and_you: [t("¿Y | usted? | ¿Mucho | trabajo | esta | semana?", "And | you? | Much | work | this | week?", "And you? Busy week?")],
    busy_what: [t("¿Ah, | sí? | ¿Por | el | trabajo, | o | por | la | familia?", "Oh, | yes? | Because of | the | work, | or | because of | the | family?", "Oh yeah? Work or family?")],
    busy_friday: [t("Bueno, | ¡por lo menos | ya | es | viernes!", "Well, | at least | already | it's | Friday!", "Well, at least it's Friday!")],
    busy_monday: [t("¡Uy! | Pues, | ¡ánimo!", "Oof! | Well, | cheer up!", "Oof! Well, hang in there!")],
    busy_work: [t("Ah, | el | trabajo. | ¡Eso | no lo extraño | nada! | ¡Ja!", "Ah, | the | work. | That | I don't miss it | at all! | Ha!", "Ah, work. I don't miss that one bit! Ha!",
        { spain: t("Ah, | el | trabajo. | ¡Eso | no lo echo de menos | para nada! | ¡Ja!", "Ah, | the | work. | That | I don't miss it | at all! | Ha!", "Ah, work. I don't miss that one bit! Ha!", { flags: { 4: "echar de menos (Spain): to miss." } }) })],
    busy_family: [t("¡La | familia | es | primero!", "The | family | is | first!", "Family comes first!",
        { spain: t("¡La | familia | es | lo primero!", "The | family | is | the first thing!", "Family comes first!") })],
    busy_both: [t("¿Las | dos | cosas? | ¡Ay, | pobre!", "The | two | things? | Oh, | poor thing!", "Both? Oh, you poor thing!")],
    busy_spanish: [t("¡Qué | bien! | ¡Y | ya | habla | muy | bien | español!", "How | nice! | And | already | you-speak | very | well | Spanish!", "Good for you! And your Spanish is already really good!")],
    busy_moving: [t("¡Ja! | Las | mudanzas | son | lo peor.", "Ha! | The | moves | are | the worst.", "Ha! Moving is the worst.")],
    not_busy_react: [t("¡Qué | suerte!", "What | luck!", "Lucky you!"), t("¡Qué bueno!", "How good!", "Good for you!", { spain: t("¡Qué bien!", "How good!", "Good for you!") })],
    react_good: [t("¡Ah, | qué bueno!", "Oh, | how good!", "Oh, good!", { spain: t("¡Ah, | qué bien!", "Oh, | how good!", "Oh, good!") })],

    // --- the weekend ----------------------------------------------------------------------------
    wkp_q: [
      t("¿Y | qué tal | su | fin de semana?", "And | how was | your | weekend?", "So, how was your weekend?"),
      t("¿Cómo | le | fue | el | fin de semana?", "How | (for) you | it-went | the | weekend?", "How was your weekend?",
        { spain: t("¿Cómo | le | ha ido | el | fin de semana?", "How | (for) you | it-has-gone | the | weekend?", "How was your weekend?") }),
      t("¿Qué tal | el | fin de semana? | ¿Bien?", "How was | the | weekend? | Good?", "Good weekend?"),
    ],
    weekend_again: [
      t("Y | entonces, | ¿qué tal | su | fin de semana?", "And | so, | how was | your | weekend?", "So anyway, how was your weekend?"),
      t("Pero | dígame, | ¿cómo | le | fue | el | fin de semana?", "But | tell me, | how | (for) you | it-went | the | weekend?", "But tell me, how was your weekend?",
        { spain: t("Pero | dígame, | ¿cómo | le | ha ido | el | fin de semana?", "But | tell me, | how | (for) you | it-has-gone | the | weekend?", "But tell me, how was your weekend?") }),
    ],
    plans_again: [
      t("Y | entonces, | ¿qué | planes | tiene?", "And | so, | what | plans | you-have?", "So anyway, any plans?"),
      t("Pero | dígame, | ¿qué | va | a | hacer | el | fin de semana?", "But | tell me, | what | you're going | to | do | the | weekend?", "But tell me, what are you doing this weekend?"),
    ],
    week_again: [
      t("Y | entonces, | ¿mucho | trabajo | esta | semana?", "And | so, | much | work | this | week?", "So anyway, busy week?"),
      t("Pero | dígame, | ¿qué tal | la | semana?", "But | tell me, | how's | the | week?", "But tell me, how's your week going?"),
    ],
    wkp_and_yours: [t("¿Y | a | usted, | cómo | le | fue?", "And | to | you, | how | (for) you | it-went?", "And how was yours?",
        { spain: t("¿Y | a | usted, | cómo | le | ha ido?", "And | to | you, | how | (for) you | it-has-gone?", "And how was yours?") })],
    wkp_what: [
      t("¿Ah, | sí? | ¿Y | qué | hizo?", "Oh, | yes? | And | what | you-did?", "Oh yeah? What did you do?"),
      t("¿Sí? | ¿Qué | hizo | de bueno?", "Yes? | What | you-did | that was nice?", "Yeah? What did you get up to?"),
    ],
    wk_short_react: [t("¡Ja! | ¡Siempre | se pasa | volando!", "Ha! | Always | it-goes-by | flying!", "Ha! It always flies by!")],
    wkf_q: [
      t("¿Y | ya | tiene | planes | para | el | fin de semana?", "And | already | you-have | plans | for | the | weekend?", "So, any plans for the weekend?"),
      t("¿Qué | planes | tiene | para | el | fin de semana?", "What | plans | you-have | for | the | weekend?", "Any plans for the weekend?"),
      t("¿Va | a | hacer | algo | este | fin de semana?", "Are you going | to | do | something | this | weekend?", "Doing anything this weekend?"),
    ],
    wkf_and_you: [t("¿Y | usted? | ¿Tiene | planes?", "And | you? | You-have | plans?", "What about you? Any plans?")],
    wkf_what: [
      t("¿Ah, | sí? | ¿Qué | va | a | hacer?", "Oh, | yes? | What | you're going | to | do?", "Oh yeah? What are you up to?"),
      t("¿Sí? | ¿Como | qué?", "Yes? | Like | what?", "Ooh, like what?"),
    ],
    react_beach: [t("¡Qué | bien! | Me encanta | la | playa.", "How | nice! | I love | the | beach.", "Oh, nice! I love the beach.")],
    sargazo_tip: [
      t("Nada más | fíjese | si | hay | sargazo: | a veces | llega | mucho.", "Just | check | if | there's | sargassum: | sometimes | arrives | a lot.",
        "Just check whether there's sargassum first: sometimes a lot of it washes up.", { flags: { 4: F_SARGAZO }, spain: t("Eso sí, | fíjese | si | hay | sargazo: | a veces | llega | mucho.", "Just one thing, | check | if | there's | sargassum: | sometimes | arrives | a lot.", "Just check whether there's sargassum first: sometimes a lot of it washes up.", { flags: { 4: F_SARGAZO } }) }),
    ],
    react_cenote: [
      t("¡Ah, | qué | rico! | El | agua | del | cenote | es | bien | fresquita.", "Oh, | how | nice! | The | water | of the | cenote | is | very | nice and cool.", "Oh, lovely! The water in a cenote is so refreshing.",
        { flags: { 6: "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán.", 8: "bien before an adjective: “very”.", 9: "fresquita: fresca + -ita, “nice and cool”." }, spain: t("¡Ah, | qué | maravilla! | El | agua | del | cenote | está | muy | fresquita.", "Oh, | how | wonderful! | The | water | of the | cenote | is | very | nice and cool.", "Oh, lovely! The water in a cenote is so refreshing.", { flags: { 6: "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán.", 9: "fresquita: fresca + -ita, “nice and cool”." } }) }),
    ],
    react_home: [t("¡Los | fines de semana | tranquilos | son | los | mejores!", "The | weekends | quiet | are | the | best!", "Quiet weekends are the best!")],
    react_friends: [t("¡Ah, | qué | bonito!", "Oh, | how | lovely!", "Oh, that's nice!")],
    react_work: [t("¿En | fin de semana? | ¡Ay, | no!", "On | weekend? | Oh, | no!", "On the weekend? Oh no!")],
    react_sport: [t("¡Qué | bien! | Yo | ya | estoy | muy | viejo | para | eso. | ¡Ja!", "How | nice! | I | already | am | very | old | for | that. | Ha!", "Good for you! I'm too old for that! Ha!")],
    react_garden: [
      t("¡Ah, | le | gustan | las | plantas! | Mi | árbol | de | mango | está | lleno | este | año.", "Oh, | (to) you | please | the | plants! | My | tree | of | mango | is | full | this | year.",
        "Oh, you like plants! My mango tree is loaded this year."),
    ],
    react_fishing: [t("¿Pescar? | ¡A mí | también | me encanta!", "Fishing? | Me | too | I-love-it!", "Fishing? I love fishing too!")],
    react_trip: [t("¡Qué | bien! | ¡Un | paseíto!", "How | nice! | A | little trip!", "Oh, nice! A little getaway!", { flags: { 3: "paseíto: paseo + -ito, a little outing." } })],
    react_fun: [
      t("¡Ah, | qué | divertido!", "Oh, | how | fun!", "Oh, fun!"),
      t("¡Suena | muy | bien!", "It-sounds | very | good!", "Sounds like fun!"),
    ],
    react_sick: [t("¡Ay, | no! | Espero | que | ya | se sienta | mejor.", "Oh, | no! | I-hope | that | already | you-feel | better.", "Oh no! I hope you're feeling better now.")],
    react_bad: [t("¡Ay, | no! | Bueno, | ya | habrá | otro | fin de semana.", "Oh, | no! | Well, | yet | there-will-be | another | weekend.", "Oh no! Well, there's always next weekend.")],
    react_none: [t("¿Sin | planes? | ¡A veces | ese | es | el | mejor | plan!", "Without | plans? | Sometimes | that | is | the | best | plan!", "No plans? Sometimes that's the best plan!")],
    react_notyet: [t("Bueno, | ¡todavía | hay | tiempo!", "Well, | still | there's | time!", "Well, there's still time!")],

    // --- Don Pancho's side ------------------------------------------------------------------------
    frank_weekend: [
      t("¡Muy | bien! | Llevé | a | mi | nieto | a | pescar | al | muelle.", "Very | good! | I-took | — | my | grandson | to | fish | at the | pier.", "Great! I took my grandson fishing off the pier.",
        { flags: { 3: F_A_PERSON } }),
    ],
    frank_weekend_more: [t("¡No pescamos | nada! | Pero | nos | divertimos | mucho.", "We didn't catch | anything! | But | ourselves | we-enjoyed | a lot.", "We didn't catch a thing! But we had a great time.")],
    frank_plans: [t("Ah, | voy | a | pintar | mi | lancha, | allá | en | el | muelle.", "Oh, | I'm going | to | paint | my | boat, | over there | at | the | pier.", "Oh, I'm painting my boat down at the pier.")],
    frank_plans_more: [t("Ya | está | viejita, | ¡pero | todavía | flota! | ¡Ja!", "Already | she's | old, | but | still | she-floats! | Ha!", "She's old, but she still floats! Ha!", { flags: { 2: "viejita: vieja + -ita, said with affection." } })],
    frank_week: [t("¿Yo? | ¡Estoy | jubilado! | ¡Para | mí | todos | los | días | son | sábado! | ¡Ja!", "Me? | I'm | retired! | For | me | all | the | days | are | Saturday! | Ha!", "Me? I'm retired! Every day is Saturday! Ha!")],
    story_catch: [t("¡Nada! | ¡Ni | un | pescadito! | ¡Ja!", "Nothing! | Not even | a | little fish! | Ha!", "Nothing! Not even a little one! Ha!")],
    story_catch_when: [t("¿Cuándo? | ¿El | domingo? | ¡Nada! | Pero | nos | divertimos | mucho.", "When? | — | Sunday? | Nothing! | But | ourselves | we-enjoyed | a lot.", "When, on Sunday? Nothing! But we had a great time.", { flags: { 1: "El domingo: on Sunday (the article stands for “on”)." } })],
    story_grandson: [t("Tiene | diez | años. | ¡Y | ya | pesca | mejor | que | yo! | ¡Ja!", "He-has | ten | years. | And | already | he-fishes | better | than | me! | Ha!", "He's ten. And he already fishes better than I do! Ha!")],
    story_boat: [t("Es | chiquita, | de | madera. | ¡Pero | es | mi | orgullo!", "It's | small, | of | wood. | But | it's | my | pride!", "She's small, made of wood. But she's my pride and joy!", { flags: { 1: "chiquita: chica + -ita, “little”." } })],
    story_boat_name: [t("Se llama | La Rosita, | como | mi | esposa. | ¡Ja!", "It's called | La Rosita, | like | my | wife. | Ha!", "She's called La Rosita, after my wife. Ha!", { flags: { 1: "Rosita: Rosa + -ita, a pet name." } })],
    story_boat_where: [t("Allá | en | el | muelle, | con | las | otras | lanchas.", "Over there | at | the | pier, | with | the | other | boats.", "Down at the pier, with the other boats.")],
    // the house on the corner across calle Ceiba from the bus stop is pink in the 3D town (TOWN.md), and so is La Rosita
    story_color: [t("¡Rosa, | como | mi | casa! | ¡Ja!", "Pink, | like | my | house! | Ha!", "Pink, like my house! Ha!")],
    story_daughter: [t("Que | no paro | ni | un | momento. | ¡Ja!", "That | I don't stop | not even | a | moment. | Ha!", "That I never sit still! Ha!")],
    story_work: [t("Un | poquito, | ¡pero | me gusta!", "A | little bit, | but | I like it!", "A bit, but I enjoy it!")],
    story_every: [t("¡Todos! | ¡Ja!", "All! | Ha!", "Every single one! Ha!")],
    frank_week_retired: [t("¡Ya | le | dije, | estoy | jubilado! | ¡Todos | los | días | son | sábado! | ¡Ja!", "Already | (to) you | I-told, | I'm | retired! | All | the | days | are | Saturday! | Ha!", "Like I said, I'm retired! Every day is Saturday! Ha!",
        { spain: t("¡Ya | se lo | he dicho, | estoy | jubilado! | ¡Todos | los | días | son | sábado! | ¡Ja!", "Already | it to you | I-have-told, | I'm | retired! | All | the | days | are | Saturday! | Ha!", "Like I said, I'm retired! Every day is Saturday! Ha!") })],
    frank_job_retired: [t("Como | le | dije, | estoy | jubilado. | Fui | pescador | cuarenta | años.", "As | (to) you | I-told, | I'm | retired. | I-was | fisherman | forty | years.", "Like I said, I'm retired. I was a fisherman for forty years.",
        { spain: t("Como | le | he dicho, | estoy | jubilado. | Fui | pescador | cuarenta | años.", "As | (to) you | I-have-told, | I'm | retired. | I-was | fisherman | forty | years.", "Like I said, I'm retired. I was a fisherman for forty years.") })],
    frank_week_more: [t("Bueno, | mi | hija | dice | que | ahora | estoy | más | ocupado | que | antes.", "Well, | my | daughter | says | that | now | I'm | more | busy | than | before.", "Well, my daughter says I'm busier now than before!")],
    frank_how: [t("¡Ah, | no me quejo! | Gracias | por | preguntar.", "Oh, | I can't complain! | Thanks | for | asking.", "Oh, can't complain! Thanks for asking.")],
    frank_from: [t("¿Yo? | ¡Nacido | y | criado | aquí!", "Me? | Born | and | raised | here!", "Me? Born and raised right here!")],
    frank_live: [t("¿Yo? | ¡Toda la vida! | Más | de | setenta | años.", "Me? | All my life! | More | than | seventy | years.", "Me? All my life! Over seventy years.")],
    frank_job: [t("Ya | estoy | jubilado. | Fui | pescador | cuarenta | años.", "Now | I'm | retired. | I-was | fisherman | forty | years.", "I'm retired now. I was a fisherman for forty years.")],
    frank_where: [t("Nada más | voy | a | la | ferretería. | ¡Necesito | pintura | para | mi | lancha!", "Just | I'm going | to | the | hardware store. | I-need | paint | for | my | boat!", "Just to the hardware store. I need paint for my boat!", { spain: t("Solo | voy | a | la | ferretería. | ¡Necesito | pintura | para | mi | lancha!", "Just | I'm going | to | the | hardware store. | I-need | paint | for | my | boat!", "Just to the hardware store. I need paint for my boat!") })],
    frank_like: [t("¿Yo? | ¡Me encanta! | No lo cambio | por | nada.", "Me? | I love it! | I wouldn't trade it | for | anything.", "Me? I love it! I wouldn't trade it for anything.")],
    frank_forecast_lovely: [t("Dicen | que | va | a | estar | soleado | toda | la | semana.", "They-say | that | it's going | to | be | sunny | all | the | week.", "They say it'll be sunny all week.")],
    frank_forecast_cold: [t("Dicen | que | en | la | tarde | ya | va | a | calentar.", "They-say | that | in | the | afternoon | already | it's going | to | warm up.", "They say it'll warm up this afternoon.", { spain: t("Dicen | que | por | la | tarde | ya | va | a | calentar.", "They-say | that | in | the | afternoon | already | it's going | to | warm up.", "They say it'll warm up this afternoon.") })],
    frank_forecast_hot: [t("¡Dicen | que | mañana | va | a | hacer | todavía | más | calor!", "They-say | that | tomorrow | it's going | to | make | even | more | heat!", "They say it'll be even hotter tomorrow!")],
    frank_forecast_cloudy: [t("Dicen | que | en | la | tarde | va | a | caer | un | aguacero.", "They-say | that | in | the | afternoon | it's going | to | fall | a | downpour.", "They say there'll be a downpour this afternoon.", { spain: t("Dicen | que | por | la | tarde | va | a | caer | un | aguacero.", "They-say | that | in | the | afternoon | it's going | to | fall | a | downpour.", "They say there'll be a downpour this afternoon.") })],
    frank_temp_lovely: [t("Como | veintiocho | grados, | dice | mi | celular.", "About | twenty-eight | degrees, | says | my | phone.", "About 28 degrees, my phone says.", { spain: t("Como | veintiocho | grados, | dice | mi | móvil.", "About | twenty-eight | degrees, | says | my | phone.", "About 28 degrees, my phone says.") })],
    frank_temp_cold: [t("Como | veinte | grados. | ¡Para | nosotros, | eso | es | frío!", "About | twenty | degrees. | For | us, | that | is | cold!", "About 20 degrees. For us, that's cold!")],
    frank_temp_hot: [t("Como | treinta y dos | grados, | dice | mi | celular.", "About | thirty-two | degrees, | says | my | phone.", "About 32 degrees, my phone says.", { spain: t("Como | treinta y dos | grados, | dice | mi | móvil.", "About | thirty-two | degrees, | says | my | phone.", "About 32 degrees, my phone says.") })],
    frank_temp_cloudy: [t("Como | veintisiete | grados, | pero | con | esta | humedad | se siente | más.", "About | twenty-seven | degrees, | but | with | this | humidity | it-feels | more.", "About 27 degrees, but with this humidity it feels hotter.")],
    frank_house: [t("Aquí | a la vuelta, | en | la | casa | rosa | de | la | esquina.", "Here | around the corner, | in | the | house | pink | of | the | corner.", "Right around the corner, in the pink house on the corner.")],
    frank_family: [t("Tengo | una | hija | y | dos | nietos. | Viven | aquí | cerca.", "I-have | a | daughter | and | two | grandkids. | They-live | here | nearby.", "I've got a daughter and two grandkids. They live close by.")],
    frank_bus: [t("Ya | no debe | tardar. | Bueno, | ¡eso | dicen! | ¡Ja!", "Now | it shouldn't | take long. | Well, | that | they-say! | Ha!", "It shouldn't be long now. Well, that's the theory! Ha!")],
    told_already: [t("¡Ja! | ¡Como | le | decía!", "Ha! | As | (to) you | I-was-saying!", "Ha! Like I said!")],
    your_turn_mon: [
      t("Oiga, | ¿y | no me va | a | preguntar | por | mi | fin de semana? | ¡Ja!", "Say, | and | aren't you going | to | ask (me) | about | my | weekend? | Ha!",
        "Hey, aren't you going to ask about my weekend? Ha!"),
    ],
    your_turn_fri: [t("Oiga, | ¿y | no quiere | saber | mis | planes? | ¡Ja!", "Say, | and | don't you want | to know | my | plans? | Ha!", "Hey, don't you want to hear my plans? Ha!")],
    tell_anyway: [t("¡Ja! | ¡Pues | se lo | cuento | de todos modos!", "Ha! | Well | it to you | I-tell | anyway!", "Ha! I'll tell you anyway!")],

    // --- twists: the downpour, the late bus ----------------------------------------------------------
    rain_start: [t("¡Uy, | ya | empezó! | ¡Qué | aguacero!", "Ooh, | already | it-started! | What a | downpour!", "Ooh, here it comes! What a downpour!", { flags: { 3: F_QUE },
        spain: t("¡Uy, | ya | ha empezado! | ¡Qué | aguacero!", "Ooh, | already | it-has-started! | What a | downpour!", "Ooh, here it comes! What a downpour!", { flags: { 3: F_QUE } }) })],
    rain_start_new: [t("¡Ay, | no! | ¡Empezó | a | llover! | ¡Qué | aguacero!", "Oh, | no! | It-started | to | rain! | What a | downpour!", "Oh no, it's starting to rain! What a downpour!", { flags: { 5: F_QUE },
        spain: t("¡Ay, | no! | ¡Ha empezado | a | llover! | ¡Qué | aguacero!", "Oh, | no! | It-has-started | to | rain! | What a | downpour!", "Oh no, it's starting to rain! What a downpour!", { flags: { 5: F_QUE } }) })],
    umbrella_offer: [
      t("¡Rápido, | métase | bajo | mi | paraguas!", "Quick, | get yourself | under | my | umbrella!", "Quick, get under my umbrella!"),
      t("¡Véngase, | aquí | cabemos | los | dos!", "Come here, | here | we-fit | the | two!", "Come here, there's room for both of us!"),
    ],
    umbrella_reask: [
      t("¡Ándele, | aquí | cabemos | los | dos!", "Come on, | here | we-fit | the | two!", "Come on, there's room for two!",
        { flags: { 0: F_ANDELE }, neutral: t("¡Venga, | aquí | cabemos | los | dos!", "Come on, | here | we-fit | the | two!", "Come on, there's room for two!") }),
    ],
    umbrella_yes_react: [t("¡No hay de qué! | Hay | lugar | para | los | dos.", "Don't mention it! | There's | room | for | the | two.", "Don't mention it! Plenty of room.",
        { spain: t("¡No hay de qué! | Hay | sitio | para | los | dos.", "Don't mention it! | There's | room | for | the | two.", "Don't mention it! Plenty of room.") })],
    umbrella_decline: [t("¡Bueno, | como | quiera! | ¡Ja!", "Okay, | as | you-wish! | Ha!", "Okay, suit yourself! Ha!")],
    umbrella_no_react: [t("¡Ah, | qué | {m:precavido|f:precavida}! | Vino | {m:preparado|f:preparada}.", "Oh, | how | careful! | You-came | prepared.", "Oh, smart! You came prepared.",
        { spain: t("¡Ah, | qué | {m:precavido|f:precavida}! | Ha venido | {m:preparado|f:preparada}.", "Oh, | how | careful! | You-have-come | prepared.", "Oh, smart! You came prepared.") })],
    rain_you_have: [t("¡Qué bueno | que | trae | paraguas!", "Good thing | that | you-have | umbrella!", "Good thing you brought an umbrella!", { spain: t("¡Menos mal | que | lleva | paraguas!", "Good thing | that | you-have | umbrella!", "Good thing you brought an umbrella!") })],
    bus_late: [
      t("Mmm, | el | camión | viene | tarde | otra vez. | ¡Como | siempre!", "Hmm, | the | bus | comes | late | again. | As | always!", "Hmm, the bus is late again. Typical!",
        { flags: { 2: F_CAMION }, neutral: t("Mmm, | el | autobús | viene | tarde | otra vez. | ¡Como | siempre!", "Hmm, | the | bus | comes | late | again. | As | always!", "Hmm, the bus is late again. Typical!") }),
    ],
    more_time: [t("Bueno, | ¡así | platicamos | más!", "Well, | that way | we-chat | more!", "Well, more time to chat!",
      { flags: { 2: F_PLATICAR }, neutral: t("Bueno, | ¡así | conversamos | más!", "Well, | that way | we-chat | more!", "Well, more time to chat!") })],
    late_typical: [t("¡Ja! | ¡Todos | los | días | lo | mismo!", "Ha! | All | the | days | the | same!", "Ha! Every single day!")],
    late_worry: [t("No se preocupe, | tarde o temprano | siempre | llega.", "Don't worry, | sooner or later | always | it-arrives.", "Don't worry, it always shows up eventually.")],
    late_ok: [t("¡Ja! | ¡Exacto!", "Ha! | Exactly!", "Ha! Exactly!")],
    like_q: [t("Y | dígame, | ¿qué tal? | ¿Le | gusta | Puerto | Colibrí?", "And | tell me, | how is it? | (To) you | it-pleases | Puerto | Colibrí?", "So tell me, how do you like Puerto Colibrí?")],
    like_q_again: [t("Pero | dígame, | ¿le | gusta | el | pueblo?", "But | tell me, | (to) you | it-pleases | the | town?", "But tell me, do you like the town?")],
    like_yes_react: [t("¡Eso | es | lo que | me gusta | oír!", "That | is | what | I like | to hear!", "That's what I like to hear!")],
    like_mixed_react: [t("Lo | entiendo. | Uno | siempre | extraña | su | tierra.", "It | I-understand. | One | always | misses | one's | homeland.", "I get it. You always miss home.",
        { spain: t("Lo | entiendo. | Uno | siempre | echa de menos | su | tierra.", "It | I-understand. | One | always | misses | one's | homeland.", "I get it. You always miss home.") })],
    like_heat_react: [t("¡Ja! | Al | calor | uno | se acostumbra... | ¡más o menos!", "Ha! | To the | heat | one | gets used... | more or less!", "Ha! You get used to the heat... sort of!")],
    like_no_react: [t("¡Ay, | no! | Dele | tiempo.", "Oh, | no! | Give-it | time.", "Oh no! Give it time.")],

    // --- the bus and the goodbye --------------------------------------------------------------------
    bus_not_here: [
      t("¡Espere, | su | camión | todavía | no llega!", "Wait, | your | bus | still | isn't arriving!", "Wait, your bus isn't here yet!",
        { flags: { 2: F_CAMION }, neutral: t("¡Espere, | su | autobús | todavía | no llega!", "Wait, | your | bus | still | isn't arriving!", "Wait, your bus isn't here yet!"),
        spain: t("¡Espere, | su | autobús | todavía | no ha llegado!", "Wait, | your | bus | still | hasn't arrived!", "Wait, your bus isn't here yet!") }),
    ],
    early_bye: [t("¡Ah, | bueno! | ¡Que | le | vaya | bien!", "Oh, | okay! | (I hope) | (for) you | it-goes | well!", "Oh, okay! Take care!")],
    bus_here: [
      t("¡Mire, | ahí | viene | su | camión!", "Look, | there | comes | your | bus!", "Look, here comes your bus!",
        { flags: { 4: F_CAMION }, neutral: t("¡Mire, | ahí | viene | su | autobús!", "Look, | there | comes | your | bus!", "Look, here comes your bus!") }),
      t("¡Uy, | ya | llegó | su | camión!", "Oh, | already | arrived | your | bus!", "Oh, here's your bus!",
        { flags: { 4: F_CAMION }, neutral: t("¡Uy, | ya | llegó | su | autobús!", "Oh, | already | arrived | your | bus!", "Oh, here's your bus!"),
        spain: t("¡Uy, | ya | ha llegado | su | autobús!", "Oh, | already | has-arrived | your | bus!", "Oh, here's your bus!") }),
    ],
    bus_finally: [
      t("¡Por fin! | Ahí | viene | su | camión.", "Finally! | There | comes | your | bus.", "Finally! Here comes your bus.",
        { flags: { 4: F_CAMION }, neutral: t("¡Por fin! | Ahí | viene | su | autobús.", "Finally! | There | comes | your | bus.", "Finally! Here comes your bus.") }),
    ],
    bus_hurry: [
      t("¡Ándele, | que | se le va!", "Go on, | because | it's getting away from you!", "Go on, don't miss it!",
        { flags: { 0: F_ANDELE }, neutral: t("¡Corra, | que | se le va!", "Run, | because | it's getting away from you!", "Go on, don't miss it!") }),
    ],
    frank_bus_here: [
      t("¡Ah, | ahí | viene | mi | camión! | Ya | me voy. | ¡Qué | gusto | platicar | con | usted!", "Oh, | there | comes | my | bus! | Now | I'm off. | What a | pleasure | to chat | with | you!",
        "Oh, there's my bus! I'd better get going. Nice talking to you!",
        { flags: { 4: F_CAMION, 7: F_QUE, 9: F_PLATICAR }, neutral: t("¡Ah, | ahí | viene | mi | autobús! | Ya | me voy. | ¡Qué | gusto | conversar | con | usted!", "Oh, | there | comes | my | bus! | Now | I'm off. | What a | pleasure | to chat | with | you!",
          "Oh, there's my bus! I'd better get going. Nice talking to you!", { flags: { 7: F_QUE } }), spain: t("¡Ah, | ahí | viene | mi | autobús! | Ya | me voy. | ¡Ha | sido | un | placer | charlar | con | usted!", "Oh, | there | comes | my | bus! | Now | I'm off. | It-has | been | a | pleasure | to chat | with | you!", "Oh, there's my bus! I'd better get going. Nice talking to you!") }),
    ],
    frank_wave: [t("¡Nos vemos, | {m:vecino|f:vecina}!", "See you, | neighbor!", "See you, neighbor!")],
    bye_you_too: [t("¡Igualmente! | ¡Que | le | vaya | bien!", "Likewise! | (I hope) | (for) you | it-goes | well!", "You too! Have a good one!")],
    bye_you_too_wk: [t("¡Igualmente! | ¡Buen | fin de semana!", "Likewise! | Good | weekend!", "You too! Have a great weekend!")],
    bye_plain: [t("¡Adiós! | ¡Que | le | vaya | bien!", "Bye! | (I hope) | (for) you | it-goes | well!", "Bye! Have a good one!")],
    bye_plain_wk: [t("¡Adiós! | ¡Que | pase | buen | fin de semana!", "Bye! | (I hope) | you-spend | good | weekend!", "Bye! Have a great weekend!")],
    bye_thanks: [t("¡Gracias, | igualmente!", "Thanks, | likewise!", "Thanks, you too!")],
    frank_see_you: [t("¡Nos vemos!", "See you!", "See you around!")],
  },

  domains: {
    // the Fahrenheit number he repeats (55…115), and the Celsius one he turns it into
    f: () => Array.from({ length: 66 }, (_, i) => 50 + i),
    c: () => [...new Set(Array.from({ length: 66 }, (_, i) => Math.round(((50 + i - 32) * 5) / 9)))],
  },

  hints: {
    // the shared group, in usted (see NEEDS)
    g_howareyou: {
      lt: "Say how you are",
      items: [
        { id: "h_good", s: t("Bien, | gracias. | ¿Y | usted?", "Good, | thanks. | And | you?", "Good, thanks. And you?") },
        { id: "h_fine", s: t("Muy | bien, | gracias. | ¿Y | usted?", "Very | well, | thanks. | And | you?", "Very well, thanks. And you?") },
        { id: "h_pretty", s: t("Bastante | bien, | gracias.", "Pretty | well, | thanks.", "Pretty good, thanks!") },
        { id: "h_notbad", s: t("No me quejo. | ¿Y | usted?", "I can't complain. | And | you?", "Can't complain. And you?") },
        { id: "h_great", s: t("¡Excelente, | gracias | por | preguntar!", "Excellent, | thanks | for | asking!", "Great, thanks for asking!") },
      ],
    },
    wx_lovely: {
      lt: "Agree, or say something about the weather",
      items: [
        { id: "w_sure_is", s: t("¡Ya lo creo!", "I'll say!", "It sure is!") },
        { id: "w_beautiful", s: t("Sí, | está | precioso.", "Yes, | it's | lovely.", "Yes, it's beautiful!") },
        { id: "w_know_right", s: t("Sí, | tiene razón.", "Yes, | you're right.", "You're right!"), note: "“Tiene razón” agrees politely (usted)." },
        { id: "w_finally_sun", s: t("¡Por fin | salió | el | sol!", "Finally | came-out | the | sun!", "Finally, some sun!",
        { spain: t("¡Por fin | ha salido | el | sol!", "Finally | has-come-out | the | sun!", "Finally, some sun!") }) },
        { id: "w_than_tag", s: t("Hace | más | calor | que | ayer, | ¿no?", "It-makes | more | heat | than | yesterday, | right?", "It's warmer than yesterday, isn't it?"),
          note: "“…, ¿no?” or “…, ¿verdad?” at the end works like “isn't it?”." },
        { id: "w_love", s: t("¡Me encanta | este | clima!", "I love | this | weather!", "I love this weather!") },
        { id: "w_temp", s: t("Estamos | como | a | veintiocho | grados.", "We-are | about | at | twenty-eight | degrees.", "It's about 28 degrees."), note: "Mexico uses Celsius: 28 °C is about 82 °F." },
      ],
    },
    wx_cold: {
      lt: "Agree, or say something about the weather",
      items: [
        { id: "w_sure_is", s: t("¡Ya lo creo!", "I'll say!", "It sure is!") },
        { id: "w_beautiful", s: t("Sí, | hace | fresco.", "Yes, | it-makes | cool.", "Yes, it's chilly."), note: "Weather with hacer: hace fresco, hace frío, hace calor." },
        { id: "w_know_right", s: t("Sí, | tiene razón.", "Yes, | you're right.", "You're right!") },
        { id: "w_than_tag", s: t("Hace | más | fresco | que | ayer, | ¿no?", "It-makes | more | cool | than | yesterday, | right?", "It's cooler than yesterday, isn't it?") },
        { id: "w_jacket", s: t("¡Necesito | un | suéter!", "I-need | a | sweater!", "I need a sweater!", { spain: t("¡Necesito | un | jersey!", "I-need | a | sweater!", "I need a sweater!") }) },
        { id: "w_dislike", s: t("No me gusta | el | frío.", "I don't like | the | cold.", "I don't like the cold.") },
        { id: "w_temp", s: t("Estamos | como | a | veinte | grados.", "We-are | about | at | twenty | degrees.", "It's about 20 degrees."), note: "Mexico uses Celsius: 20 °C is 68 °F." },
      ],
    },
    wx_hot: {
      lt: "Agree, or say something about the weather",
      items: [
        { id: "w_sure_is", s: t("¡Ni me diga!", "Don't even tell me!", "Tell me about it!") },
        { id: "w_beautiful", s: t("Sí, | ¡qué | calor!", "Yes, | what a | heat!", "Yes, it's so hot!") },
        { id: "w_humid", s: t("¡Y | qué | humedad!", "And | what a | humidity!", "And it's so humid!") },
        { id: "w_know_right", s: t("Sí, | tiene razón.", "Yes, | you're right.", "You're right!") },
        { id: "w_than_tag", s: t("Hace | más | calor | que | ayer, | ¿no?", "It-makes | more | heat | than | yesterday, | right?", "It's hotter than yesterday, isn't it?") },
        { id: "w_melting", s: t("¡Me estoy derritiendo!", "I'm melting!", "I'm melting!"), register: "casual" },
        { id: "w_temp", s: t("¡Estamos | como | a | treinta | grados!", "We-are | about | at | thirty | degrees!", "It must be 30 degrees!"), note: "Mexico uses Celsius: 30 °C is 86 °F." },
      ],
    },
    wx_cloudy: {
      lt: "Answer “Parece que va a llover”",
      items: [
        { id: "w_not_today", s: t("¡Ojalá | que | hoy | no!", "Hopefully | that | today | not!", "Hopefully not today!") },
        { id: "w_hope_not", s: t("Espero | que | no.", "I-hope | that | not.", "I hope not.") },
        { id: "w_no_umbrella", s: t("¡Ay, | no traigo | paraguas!", "Oh, | I don't have | umbrella!", "Oh no, I don't have an umbrella!",
        { spain: t("¡Ay, | no llevo | paraguas!", "Oh, | I don't have | umbrella!", "Oh no, I don't have an umbrella!") }) },
        { id: "w_beautiful", s: t("Sí, | está | muy | nublado.", "Yes, | it's | very | cloudy.", "Yes, it's really cloudy.") },
        { id: "w_know_right", s: t("Sí, | tiene razón.", "Yes, | you're right.", "You're right!") },
      ],
    },
    local_q: {
      lt: "Ask about the weather here",
      items: [
        { id: "q_rainy", s: t("¿Cuándo | es | la | temporada | de | lluvias?", "When | is | the | season | of | rains?", "When's the rainy season?") },
        { id: "q_hurricane", s: t("¿Hay | huracanes | aquí?", "Are there | hurricanes | here?", "Do you get hurricanes here?") },
        { id: "q_sargazo", s: t("¿Hay | sargazo | en | la | playa?", "Is there | sargassum | on | the | beach?", "Is there seaweed on the beach?"), note: "Sargazo: the seaweed that washes up in the warm months." },
      ],
    },
    new_here: {
      lt: "Say whether you're new here",
      items: [
        { id: "n_moved", s: t("Sí, | acabo de | llegar.", "Yes, | I just | arrived.", "Yes, I just moved here.") },
        { id: "n_last_month", s: t("Sí, | me | mudé | el | mes | pasado.", "Yes, | (myself) | I-moved | the | month | last.", "Yes, I moved here last month.") },
        { id: "n_new", s: t("Sí, | soy | {m:nuevo|f:nueva} | aquí.", "Yes, | I'm | new | here.", "Yeah, I'm new here.") },
        { id: "n_no", s: t("No, | ya | llevo | un | año | aquí.", "No, | already | I've-been | one | year | here.", "No, I've lived here for a year.") },
      ],
    },
    intro: {
      lt: "Introduce yourself",
      items: [
        { id: "in_nice", s: t("¡Mucho gusto, | Don Pancho! | Yo | soy | {$name}.", "Nice to meet you, | Don Pancho! | I | am | {$name}.", "Nice to meet you, Don Pancho! I'm {$name}.") },
        { id: "in_too", s: t("¡Igualmente!", "Likewise!", "Nice to meet you too!") },
      ],
    },
    from: {
      lt: "Say where you're from", slot: "country", examples: ["canada", "usa", "uk"],
      items: [
        { id: "f_from", s: t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.") },
        { id: "f_nat", s: t("Soy | canadiense.", "I'm | Canadian.", "I'm Canadian."), only: (e) => e.id === "canada" },
        { id: "f_city", s: t("Soy | de | Toronto, | en | Canadá.", "I'm | from | Toronto, | in | Canada.", "I'm from Toronto, in Canada."), only: (e) => e.id === "canada" },
      ],
    },
    winter: {
      lt: "Say what the weather is like back home",
      items: [
        { id: "wi_cold", s: t("Sí, | muchísimo | frío.", "Yes, | very much | cold.", "Yes, really cold!") },
        { id: "wi_snow", s: t("Sí, | y | mucha | nieve.", "Yes, | and | much | snow.", "Yes, and lots of snow!") },
        { id: "wi_not_bad", s: t("No | tanto, | la verdad.", "Not | so much, | honestly.", "Not so bad, actually.") },
      ],
    },
    week: {
      lt: "Talk about your week",
      items: [
        { id: "wk_crazy", s: t("¡Uf, | una | locura!", "Phew, | a | madness!", "Crazy busy!"), register: "casual" },
        { id: "wk_busy", s: t("Sí, | muy | pesada.", "Yes, | very | heavy.", "Yes, very busy!") },
        { id: "wk_work", s: t("Sí, | mucho | trabajo.", "Yes, | much | work.", "Yes, lots of work.") },
        { id: "wk_not_bad", s: t("Normal, | gracias.", "Normal, | thanks.", "The usual, thanks.") },
        { id: "wk_quiet", s: t("No | mucho. | Bastante | tranquila.", "Not | much. | Quite | quiet.", "Not really. Pretty quiet.") },
      ],
    },
    busy_why: {
      lt: "Say what keeps you busy",
      items: [
        { id: "bw_work", s: t("El | trabajo, | sobre todo.", "The | work, | mostly.", "Work, mostly.") },
        { id: "bw_kids", s: t("¡Mis | hijos!", "My | kids!", "My kids!") },
        { id: "bw_both", s: t("¡Las | dos | cosas!", "The | two | things!", "Both!") },
        { id: "bw_spanish", s: t("¡Las | clases | de | español!", "The | classes | of | Spanish!", "Spanish classes!") },
      ],
    },
    weekend_past: {
      lt: "Say how your weekend was",
      items: [
        { id: "wp_great", s: t("Muy | bien, | gracias.", "Very | well, | thanks.", "Great, thanks!") },
        { id: "wp_great", s: t("Bien, | ¿y | usted?", "Good, | and | you?", "Good, you?"), register: "casual", note: "A short answer, and you ask straight back." },
        { id: "wp_did", s: t("Fui | a | la | playa.", "I-went | to | the | beach.", "I went to the beach.") },
        { id: "wp_did", s: t("Visité | a | unos | amigos.", "I-visited | — | some | friends.", "I visited some friends.", { flags: { 1: F_A_PERSON } }) },
        { id: "wp_did", s: t("Descansé | en | casa.", "I-rested | at | home.", "I just relaxed at home.") },
        { id: "wp_nothing", s: t("Nada | especial.", "Nothing | special.", "Nothing special.") },
        { id: "wp_short", s: t("¡Muy | corto!", "Very | short!", "Too short!") },
      ],
    },
    weekend_what: {
      lt: "Say what you did",
      items: [
        { id: "wp_did", s: t("Fui | al | cenote.", "I-went | to the | cenote.", "I went to the cenote.") },
        { id: "wp_did", s: t("Comí | con | mi | familia.", "I-ate | with | my | family.", "I had lunch with my family.") },
        { id: "wp_did", s: t("Hicimos | una | carne asada.", "We-made | a | cookout.", "We had a cookout.",
            { flags: { 2: F_ASADA }, neutral: t("Hicimos | una | parrillada.", "We-made | a | cookout.", "We had a cookout.") }),
          note: "Carne asada (a parrillada in much of Latin America): grilling meat outdoors with family and friends." },
        { id: "wp_did", s: t("Fui | a | pescar.", "I-went | to | fish.", "I went fishing.") },
        { id: "wp_did", s: t("Descansé | en | casa.", "I-rested | at | home.", "I just relaxed at home.") },
        { id: "wp_nothing", s: t("Nada | especial.", "Nothing | special.", "Nothing special.") },
      ],
    },
    weekend_plans: {
      lt: "Talk about your weekend plans",
      items: [
        { id: "wf_did", s: t("Voy | a | ir | a | la | playa.", "I'm going | to | go | to | the | beach.", "I'm going to the beach.") },
        { id: "wf_did", s: t("Voy | a | visitar | a | mi | familia.", "I'm going | to | visit | — | my | family.", "I'm visiting my family.", { flags: { 3: F_A_PERSON } }) },
        { id: "wf_did", s: t("Vamos | a | hacer | una | carne asada.", "We're going | to | make | a | cookout.", "We're having a cookout.",
            { flags: { 4: F_ASADA }, neutral: t("Vamos | a | hacer | una | parrillada.", "We're going | to | make | a | cookout.", "We're having a cookout.") }) },
        { id: "wf_did", s: t("Voy | a | descansar.", "I'm going | to | rest.", "Just relaxing.") },
        { id: "wf_did", s: t("Tengo que | trabajar.", "I have to | work.", "I have to work.") },
        { id: "wf_none", s: t("Todavía | no tengo | planes.", "Still | I don't have | plans.", "No plans yet.") },
        { id: "wf_notyet", s: t("Todavía | no sé.", "Still | I don't know.", "I don't know yet.") },
      ],
    },
    back: {
      lt: "Ask Don Pancho back (“¿Y usted?”)",
      items: [
        { id: "b_and_you", s: t("¿Y | usted?", "And | you?", "And you?") },
        { id: "b_how_about", s: t("¿Y | usted, | Don Pancho?", "And | you, | Don Pancho?", "How about you, Don Pancho?") },
        { id: "b_weekend", s: t("¿Y | qué tal | su | fin de semana?", "And | how was | your | weekend?", "How was your weekend?") },
        { id: "b_plans", s: t("¿Y | usted | tiene | planes?", "And | you | you-have | plans?", "Do you have any plans?") },
        { id: "b_week", s: t("¿Y | qué tal | su | semana?", "And | how's | your | week?", "How's your week going?") },
        { id: "b_from", s: t("¿Usted | es | de | aquí?", "You | are | from | here?", "Are you from here?") },
      ],
    },
    interest: {
      lt: "Show interest",
      items: [
        { id: "i_nice", s: t("¡Qué | bien!", "How | nice!", "Oh, nice!") },
        { id: "i_really", s: t("¿En serio?", "Seriously?", "Really?") },
        { id: "i_no_way", s: t("¡No me diga!", "You don't say!", "No way!") },
        { id: "i_sounds_fun", s: t("¡Suena | muy | divertido!", "It-sounds | very | fun!", "That sounds fun!") },
        { id: "i_lucky", s: t("¡Qué | suerte!", "What | luck!", "Lucky you!") },
      ],
    },
    rain: {
      lt: "Accept the umbrella, or politely say no",
      items: [
        { id: "r_kind", s: t("¡Gracias, | qué | amable!", "Thanks, | how | kind!", "Thanks, that's so kind!") },
        { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you so much!") },
        { id: "r_have_one", s: t("No, | gracias, | traigo | el | mío.", "No, | thanks, | I-have | — | mine.", "No, thanks, I've got mine.", { flags: { 3: "el mío: “mine” (my own umbrella); the article has no English word." },
        spain: t("No, | gracias, | llevo | el | mío.", "No, | thanks, | I-have | — | mine.", "No, thanks, I've got mine.") }) },
      ],
    },
    late: {
      lt: "React to the late bus",
      items: [
        { id: "l_typical", s: t("¿Otra vez? | ¡Como | siempre!", "Again? | As | always!", "Again? Typical!") },
        { id: "l_late_work", s: t("¡Uy, | voy | a | llegar | tarde | al | trabajo!", "Oops, | I'm going | to | arrive | late | to the | work!", "Oh no, I'll be late for work!") },
        { id: "l_no_hurry", s: t("No pasa nada. | No tengo | prisa.", "It's no problem. | I don't have | hurry.", "No problem. I'm in no hurry.") },
      ],
    },
    like: {
      lt: "Say how you like it here",
      items: [
        { id: "lk_love", s: t("¡Me encanta!", "I love it!", "I love it here!") },
        { id: "lk_people", s: t("La | gente | es | muy | amable.", "The | people | are | very | kind.", "People are really friendly.") },
        { id: "lk_so_far", s: t("Hasta ahora, | todo | bien.", "Until now, | all | good.", "So far, so good!") },
        { id: "lk_miss", s: t("Me gusta, | pero | extraño | a | mi | familia.", "I like it, | but | I-miss | — | my | family.", "I like it, but I miss my family.", { flags: { 3: F_A_PERSON },
        spain: t("Me gusta, | pero | echo de menos | a | mi | familia.", "I like it, | but | I-miss | — | my | family.", "I like it, but I miss my family.") }) },
      ],
    },
    bye: {
      lt: "Say goodbye politely",
      items: [
        { id: "by_better", s: t("Bueno, | ya | me voy. | ¡Qué | gusto | platicar | con | usted!", "Well, | now | I'm off. | What a | pleasure | to chat | with | you!", "Well, I'd better get going. Nice talking to you!",
            { flags: { 5: F_PLATICAR }, neutral: t("Bueno, | ya | me voy. | ¡Qué | gusto | conversar | con | usted!", "Well, | now | I'm off. | What a | pleasure | to chat | with | you!", "Well, I'd better get going. Nice talking to you!"), spain: t("Bueno, | ya | me voy. | ¡Ha | sido | un | placer | charlar | con | usted!", "Well, | now | I'm off. | It-has | been | a | pleasure | to chat | with | you!", "Well, I'd better get going. Nice talking to you!") }),
          note: "“Bueno, ya me voy” is the gentle way to end a chat." },
        { id: "by_nice", s: t("¡Fue | un | gusto | platicar | con | usted!", "It-was | a | pleasure | to chat | with | you!", "Nice talking to you!",
            { flags: { 3: F_PLATICAR }, neutral: t("¡Fue | un | gusto | conversar | con | usted!", "It-was | a | pleasure | to chat | with | you!", "Nice talking to you!") }) },
        { id: "by_good_one", s: t("¡Que | le | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "Have a good one!"), note: "A warm goodbye wish (usted)." },
        { id: "by_tomorrow", s: t("¡Nos vemos | mañana!", "See you | tomorrow!", "See you tomorrow!") },
      ],
    },
    bye_reply: {
      lt: "Say goodbye to Don Pancho",
      items: [
        { id: "br_you_too", s: t("¡Igualmente! | ¡Que | le | vaya | bien!", "Likewise! | (I hope) | (for) you | it-goes | well!", "You too! Have a good one!") },
        { id: "br_see_you", s: t("¡Nos vemos, | Don Pancho!", "See you, | Don Pancho!", "See you around, Don Pancho!") },
      ],
    },
  },

  tips: {
    tu_neighbor: { key: "tu_neighbor", lt: "Understood! Don Pancho is an older neighbor: usted is more respectful (“¿Y usted?”, “Tiene razón”). Tú is for friends.", better: "¿Y usted?" },
  },

  merges: {
    "eso sí": { reason: "lexical_expression", split: "eso → that + sí → yes is false; the concession = mind you, just one thing.", minimal: "Two words." },
    "da gusto": { reason: "lexical_expression", split: "da → gives + gusto → pleasure is a calque; = it's a pleasure, it's a treat.", minimal: "Two words." },
    "se está nublando": { reason: "grammatical_fusion", split: "se → itself + está → is + nublando → clouding; one English verb = it's clouding over.", minimal: "Three words." },
    "antes que": { reason: "lexical_expression", split: "antes → before + que → than/that is false; = before.", minimal: "Two words." },
    "ya lo creo": { reason: "lexical_expression", split: "ya → already + lo → it + creo → I believe is false; the emphatic yes = I'll say, it sure is.", minimal: "Three words." },
    "ni me diga": { reason: "lexical_expression", split: "ni → nor + me → me + diga → tell; = tell me about it.", minimal: "Three words." },
    "me estoy derritiendo": { reason: "grammatical_fusion", split: "me → myself + estoy → I am + derritiendo → melting; one English verb = I'm melting.", minimal: "Three words." },
    "tenga razón": { reason: "lexical_expression", split: "tenga → you have + razón → reason is false; = you're right.", minimal: "Two words." },
    "tiene razón": { reason: "lexical_expression", split: "tiene → you have + razón → reason is false; = you're right.", minimal: "Two words." },
    "por si acaso": { reason: "lexical_expression", split: "por → for + si → if + acaso → perhaps; = just in case.", minimal: "Three words." },
    "a mí": { reason: "lexical_expression", split: "a → to + mí → me; with tampoco / también the pair = me (neither, too).", minimal: "Two words." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → the + menos → less; = at least.", minimal: "Three words." },
    "no se preocupe": { reason: "grammatical_fusion", split: "no → not + se → yourself + preocupe → worry; = don't worry.", minimal: "Three words." },
    "ya veo": { reason: "lexical_expression", split: "ya → already + veo → I see; = I see.", minimal: "Two words." },
    "así es": { reason: "lexical_expression", split: "así → like this + es → is; = that's right.", minimal: "Two words." },
    "por aquí": { reason: "lexical_expression", split: "por → through + aquí → here; = around here.", minimal: "Two words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; = by the way.", minimal: "Two words." },
    "para servirle": { reason: "lexical_expression", split: "para → to + servirle → serve you; the courtesy = at your service.", minimal: "Two words." },
    "he ido": { reason: "grammatical_fusion", split: "he → I have + ido → gone: one English verb phrase (have been).", minimal: "Two words." },
    "con razón": { reason: "lexical_expression", split: "con → with + razón → reason is false; = no wonder.", minimal: "Two words." },
    "a lo mejor": { reason: "lexical_expression", split: "a → to + lo → the + mejor → best is false; = maybe.", minimal: "Three words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week; = weekend.", minimal: "Three words." },
    "fines de semana": { reason: "lexical_expression", split: "fines → ends + de → of + semana → week; = weekends.", minimal: "Three words." },
    "lo peor": { reason: "lexical_expression", split: "lo → the + peor → worse; = the worst.", minimal: "Two words." },
    "qué bueno": { reason: "lexical_expression", split: "qué → what + bueno → good; = how good, good thing.", minimal: "Two words." },
    "de bueno": { reason: "lexical_expression", split: "de → of + bueno → good is a calque; after qué hizo… = that was nice / fun.", minimal: "Two words." },
    "se pasa": { reason: "grammatical_fusion", split: "se → itself + pasa → passes; = it goes by.", minimal: "Two words." },
    "nada más": { reason: "lexical_expression", split: "nada → nothing + más → more is false; = just.", minimal: "Two words." },
    "a veces": { reason: "lexical_expression", split: "a → at + veces → times; = sometimes.", minimal: "Two words." },
    "toda la vida": { reason: "lexical_expression", split: "toda → all + la → the + vida → life; = all my life.", minimal: "Three words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = you have to.", minimal: "Two words." },
    "se le va": { reason: "grammatical_fusion", split: "se → itself + le → to you + va → goes; = it's getting away from you (you'll miss it).", minimal: "Three words." },
    "me voy": { reason: "grammatical_fusion", split: "me → myself + voy → I go; = I'm off, I'm leaving.", minimal: "Two words." },
    "tarde o temprano": { reason: "lexical_expression", split: "tarde → late + o → or + temprano → early; = sooner or later.", minimal: "Three words." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways; = anyway.", minimal: "Three words." },
    "no hay de qué": { reason: "lexical_expression", split: "no → not + hay → there is + de → of + qué → what; = don't mention it.", minimal: "Four words." },
    "por fin": { reason: "lexical_expression", split: "por → for + fin → end; = finally.", minimal: "Two words." },
    "don pancho": { reason: "lexical_expression", split: "Don (a title of respect) + Pancho: one name.", minimal: "Two words." },
    "treinta y dos": { reason: "lexical_expression", split: "One number in three words: thirty-two.", minimal: "Three words." },
    "tengo que": { reason: "grammatical_fusion", split: "tengo → I have + que → that is false; tener que + infinitive = have to.", minimal: "Two words." },
    "la rosita": { reason: "lexical_expression", split: "The boat's name; la → the would translate part of a name.", minimal: "Two words." },
    "de vez en cuando": { reason: "lexical_expression", split: "de → of + vez → time + en → in + cuando → when; = once in a while.", minimal: "Four words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less; = roughly, sort of.", minimal: "Three words." },
    "se acostumbra": { reason: "grammatical_fusion", split: "se → oneself + acostumbra → accustoms; one English verb = gets used to it.", minimal: "Two words." },
    "muy buenas": { reason: "lexical_expression", split: "muy → very + buenas → good (ones); Spain's greeting = hello / good morning.", minimal: "Two words." },
    "lo primero": { reason: "lexical_expression", split: "lo → the (thing) + primero → first; = what comes first.", minimal: "Two words." },
    "ha ido": { reason: "lexical_expression", split: "ha → has + ido → gone; le ha ido = it has gone for you: how was (your weekend).", minimal: "Two words." },
    "echa de menos": { reason: "lexical_expression", split: "echa → throws + de → of + menos → less is false; Spain's echar de menos = to miss.", minimal: "Three words." },
    "echo de menos": { reason: "lexical_expression", split: "echo → I throw + de → of + menos → less is false; Spain's echar de menos = I miss.", minimal: "Three words." },
    "no lo echo de menos": { reason: "lexical_expression", split: "no → not + lo → it + echo de menos → I miss: English puts don't inside: I don't miss it.", minimal: "Five words." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing; after a negative = at all.", minimal: "Two words." },
    "acaba de": { reason: "grammatical_fusion", split: "acaba → you finish + de → of is false; acabar de + infinitive = have just.", minimal: "Two words." },
    "acabo de": { reason: "grammatical_fusion", split: "acabo → I finish + de → of is false; acabar de + infinitive = have just.", minimal: "Two words." },
    "carne asada": { reason: "lexical_expression", split: "carne → meat + asada → grilled; the gathering = a cookout.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; at the end of an answer = actually, honestly.", minimal: "Two words." },
    "sobre todo": { reason: "lexical_expression", split: "sobre → on + todo → all is false; = mostly, above all.", minimal: "Two words." },
    "hasta ahora": { reason: "lexical_expression", split: "hasta → until + ahora → now; = so far.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = seriously, really.", minimal: "Two words." },
    "no me diga": { reason: "lexical_expression", split: "no → not + me → me + diga → tell; the surprised reply = you don't say, no way.", minimal: "Three words." },
    "no pasa nada": { reason: "lexical_expression", split: "no → not + pasa → happens + nada → nothing; = it's no problem.", minimal: "Three words." },
    "no me quejo": { reason: "lexical_expression", split: "no → not + me → myself + quejo → complain; = I can't complain.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Chat with Don Pancho about the weather", done: (c) => !!c.s.weatherDone },
    { lt: "Say where you're from", optional: true, when: (c) => !c.s.known, done: (c) => !!c.s.fromDone },
    { lt: "Talk about your weekend", done: (c) => !!c.s.weekendDone },
    { lt: "Ask Don Pancho about himself (“¿Y usted?”)", done: (c) => !!c.s.askedBack || !!c.s.turnSkipped },
    { lt: "When your bus comes, say goodbye politely", done: (c) => !!c.s.byeDone && !!c.s.busHere },
  ],

  steps: onlyWhileOpen([
    { id: "weather", done: (c) => !!c.s.weatherDone,
      ask: (c) => {
        // asked once; after a side question he lets the weather go and moves on
        c.s.wxAsks = (c.s.wxAsks || 0) + 1;
        if (c.s.wxAsks > 1) { c.s.weatherDone = true; const nx = (c as any).conv?.nextStep?.(c); if (nx && nx.id !== "weather") c.ask(nx.id); return; }
        c.s.lastTopic = "weather"; c.s.wxAsked = true; if (W(c) === "cloudy") c.s.rainSaid = true; c.say("wxq_" + W(c)); expectWeather(c);
      },
      expects: WX_INTENTS,
      suggest: [{ lt: "Agree, or say something about the weather", hint: "wx_lovely" }, { lt: "Ask about the weather here", hint: "local_q" }],
      yes: (c) => { wxReact(c, null, false); },
      no: (c) => { wxNo(c); },
      help: (c) => { c.s.weatherDone = true; c.say("wx_help"); } },
    { id: "new_q", when: (c) => !c.s.known && !!c.s.weatherDone, done: (c) => !!c.s.newDone,
      ask: (c) => { c.s.lastTopic = "new"; c.s.newAsks = (c.s.newAsks || 0) + 1; c.say(c.s.newAsks > 1 ? "new_q_again" : "new_q"); },
      expects: ["new_yes", "new_no", "new_when_ctx", "intro_name", "nice_meet"],
      suggest: [{ lt: "Say whether you're new here", hint: "new_here" }],
      yes: (c) => { newAnswer(c, true); },
      no: (c) => { newAnswer(c, false); } },
    { id: "from_q", when: (c) => !c.s.known && !!c.s.newDone, done: (c) => !!c.s.fromDone,
      ask: (c) => { c.s.lastTopic = "from"; c.s.fromAsks = (c.s.fromAsks || 0) + 1; c.say(c.s.fromAsks > 1 ? "from_q_again" : "from_q"); },
      expects: ["from_ans", "from_ctx", "from_other_ctx", "q_from"],
      suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }],
      help: (c) => { c.s.fromDone = true; c.say("ok"); } },
    { id: "weekend_past", when: (c) => MON(c) && !!c.s.weatherDone, done: (c) => !!c.s.weekendDone,
      ask: (c) => askTopic(c, "weekend", "wkp_q", "wkp_and_yours"),
      expects: ["wk_act_ctx", "act_ctx", "wk_good_ctx", "wk_bad_ctx", "wk_nothing_ctx", "ask_back", "q_weekend"],
      suggest: [{ lt: "Say how your weekend was", hint: "weekend_past" }, { lt: "Ask Don Pancho back", hint: "back" }],
      yes: (c) => { weekendShort(c, null); },
      no: (c) => { weekendBad(c, null); },
      help: (c) => { weekendNothing(c, null); } },
    { id: "week", when: (c) => !!c.s.askWeek && !!c.s.weatherDone && (!MON(c) || !!c.s.weekendDone), done: (c) => !!c.s.weekDone,
      ask: (c) => askTopic(c, "week", MON(c) ? "week_q_mon" : "week_q", "week_and_you"),
      expects: ["week_busy_ctx", "week_quiet_ctx", "busy_why_ctx", "ask_back", "q_week"],
      suggest: [{ lt: "Talk about your week", hint: "week" }, { lt: "Ask Don Pancho back", hint: "back" }],
      yes: (c) => { weekBusy(c, null); },
      no: (c) => { weekQuiet(c, null); },
      help: (c) => { c.s.weekDone = true; c.say(MON(c) ? "busy_monday" : "busy_friday"); } },
    { id: "weekend_plans", when: (c) => !MON(c) && !!c.s.weatherDone && (!c.s.askWeek || !!c.s.weekDone), done: (c) => !!c.s.weekendDone,
      ask: (c) => askTopic(c, "plans", "wkf_q", "wkf_and_you"),
      expects: ["wk_act_ctx", "act_ctx", "wk_yes_ctx", "wk_nothing_ctx", "wk_notyet_ctx", "ask_back", "q_plans"],
      suggest: [{ lt: "Talk about your weekend plans", hint: "weekend_plans" }, { lt: "Ask Don Pancho back", hint: "back" }],
      yes: (c) => { weekendShort(c, null); },
      no: (c) => { weekendNothing(c, null); },
      help: (c) => { weekendNotYet(c, null); } },
    { id: "rain", when: (c) => !!c.s.rainTwist && !!c.s.weekendDone && (!c.s.askWeek || !!c.s.weekDone), done: (c) => !!c.s.rainDone,
      ask: (c) => {
        if (!c.s.rainNow) { c.s.rainNow = true; c.twist("rain"); c.say(c.s.rainSaid ? "rain_start" : "rain_start_new"); }
        if (c.s.learnerUmbrella) { c.s.rainDone = true; c.say("rain_you_have"); return; }
        // offered once, asked once more; after that he lets it go
        c.s.umbAsks = (c.s.umbAsks || 0) + 1;
        if (c.s.umbAsks > 2) { c.s.rainDone = true; const nx = (c as any).conv?.nextStep?.(c); if (nx && nx.id !== "rain") c.ask(nx.id); return; }
        c.say(c.s.offered ? "umbrella_reask" : "umbrella_offer");
        c.s.offered = true;
      },
      expects: ["umbrella_yes", "umbrella_no", "no_umbrella", "g_thanks"],
      suggest: [{ lt: "Accept the umbrella, or politely say no", hint: "rain" }],
      yes: (c) => { umbrellaYes(c); },
      no: (c) => { c.s.rainDone = true; if (once(c, "umb")) c.say("umbrella_decline"); } },
    { id: "your_turn", when: (c) => !!c.s.weekendDone && (!c.s.askWeek || !!c.s.weekDone) && !c.s.askedBack && !c.s.turnSkipped,
      done: (c) => !!c.s.askedBack || !!c.s.turnSkipped,
      ask: (c) => {
        c.s.lastTopic = wkTopic(c);
        // teased once; the second time he just tells
        if (c.s.teased) { c.s.turnSkipped = true; c.say("tell_anyway"); tell(c, wkTopic(c), false); return; }
        c.s.teased = true;
        c.say(MON(c) ? "your_turn_mon" : "your_turn_fri");
      },
      expects: [...ASK_FRANK, "interest"],
      suggest: [{ lt: "Ask Don Pancho about his weekend", hint: "back" }],
      yes: (c) => { c.s.turnSkipped = true; tell(c, wkTopic(c), false); },
      no: (c) => { c.s.turnSkipped = true; c.say("tell_anyway"); tell(c, wkTopic(c), false); },
      help: (c) => { c.s.turnSkipped = true; c.say("tell_anyway"); tell(c, wkTopic(c), false); } },
    { id: "late", when: (c) => !!c.s.lateTwist && coreDone(c), done: (c) => !!c.s.lateSaid,
      ask: (c) => { c.s.lateSaid = true; c.twist("bus_late"); c.say("bus_late"); c.say("more_time"); c.ask("like_q"); } },
    { id: "like_q", when: (c) => !!c.s.lateSaid, done: (c) => !!c.s.likeDone,
      ask: (c) => { c.s.lastTopic = "like"; c.s.likeAsks = (c.s.likeAsks || 0) + 1; c.say(c.s.likeAsks > 1 ? "like_q_again" : "like_q"); },
      expects: ["like_yes_ctx", "like_mixed_ctx", "like_no_ctx", "late_react_ctx", "ask_back"],
      suggest: [{ lt: "Say how you like it here", hint: "like" }, { lt: "React to the late bus", hint: "late" }],
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
    c.s.weather = c.s.rainTwist ? "cloudy" : c.pick(["lovely", "hot", "hot", "cold", "cloudy"] as Weather[]);
    c.s.askWeek = c.chance(0.65);
    c.s.busFrank = c.visits >= 1 && c.chance(0.35);
    c.s.howOpener = c.chance(0.3);
  },

  start: (c) => {
    if (c.s.howOpener) {
      c.say(c.s.known ? "hello_known_how" : "hello_how");
      expectHowAreYou(c); // then his weather remark
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
    wx_neg(c, slots, seg) { wxNeg(c, saidOf(slots, seg)); },
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
    // "¿Cuándo es la temporada de lluvias?" gets when; "¿Siempre hace tanto calor?" gets the year round
    q_season(c, _slots, seg) {
      c.s.weatherDone = true;
      if (seg.tags.includes("winter")) local(c, "winter", "frank_winter");
      else if (seg.tags.includes("when")) local(c, "rainy_when", "frank_rainy_when");
      // on a norte morning "¿Siempre está así?" is about the norte
      else if (seg.tags.includes("always")) { if (W(c) === "cold") local(c, "norte", "frank_norte"); else local(c, "always", "frank_always"); }
      else local(c, "rainy", "frank_rainy");
    },
    q_hurricane(c) { c.s.weatherDone = true; local(c, "hurricane", "frank_hurricane"); },
    // "¿Qué es el sargazo?" gets what it is; "¿Hay sargazo?", "¿Cómo está la playa?" the seasons
    q_beach(c, _slots, seg) { c.s.weatherDone = true; if (seg.tags.includes("what")) local(c, "sargazo_what", "frank_sargazo_what"); else local(c, "sargazo", "frank_sargazo"); },
    q_norte(c) { c.s.weatherDone = true; local(c, "norte", "frank_norte"); },
    q_temp(c) { c.s.weatherDone = true; if (once(c, "temp")) c.say("frank_temp_" + W(c)); },
    q_family(c) { c.s.askedBack = true; if (once(c, "family")) c.say(c.s.toldFamily ? "told_already" : "frank_family"); c.s.toldFamily = true; },

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

    // --- asking Don Pancho ---
    ask_back(c) { askBack(c); },
    q_weekend(c) { tell(c, "weekend"); },
    q_plans(c) { tell(c, "plans"); },
    // "Tengo mucho trabajo", "Estoy muy ocupado" are the learner's own week, not "¿Tiene mucho trabajo?" (mine())
    q_week(c, _slots, seg) { if (mine(c)) { weekBusy(c, seg); return; } tell(c, "week"); },
    q_from(c) { tell(c, "from"); },
    q_live(c, _slots, seg) {
      // "¿Dónde vive?" gets the house, not how long
      if (seg.tags.includes("house")) { c.s.askedBack = true; if (once(c, "house")) c.say(c.s.frankIntro ? "told_already" : "frank_house"); return; }
      tell(c, "live");
    },
    q_job(c) { tell(c, "job"); },
    // "Voy al centro", "Yo también espero el camión": the learner's own way, not "¿A dónde va?"
    q_where(c) { if (mine(c)) { if (once(c, "where")) c.say("ok"); return; } tell(c, "where"); },
    q_forecast(c) {
      c.s.weatherDone = true;
      if (W(c) === "cloudy") c.s.rainSaid = true;
      if (once(c, "forecast")) c.say("frank_forecast_" + W(c));
    },
    q_bus(c) { if (once(c, "bus")) c.say(c.s.lateSaid ? "late_worry" : "frank_bus"); },
    q_story(c, _slots, seg) { storyQ(c, seg); },
    story_work_ctx(c, _slots, seg) { storyQ(c, seg); },
    q_name(c) { if (once(c, "name")) c.say("frank_name"); },

    // --- reactions ---
    interest(c) { if (c.s.busHere) return; tellMore(c); },
    same(c) { if (c.s.busHere) return; if (c.s.moreFor) { tellMore(c); return; } if (once(c, "same")) c.say("great_minds"); },

    // --- twists ---
    umbrella_yes(c) { if (c.s.rainNow && !c.s.rainDone) umbrellaYes(c); },
    umbrella_no(c) {
      if (c.s.rainNow && !c.s.rainDone) {
        if (/\b(traigo|tengo|traje|mio|m[ií]o|impermeable|gorra)\b/i.test(c.heard || "")) umbrellaNo(c);
        else { c.s.rainDone = true; if (once(c, "umb")) c.say("umbrella_decline"); }
        return;
      }
      // "Traigo mi paraguas" before it rains
      if (/\b(paraguas|sombrilla|impermeable)\b/i.test(c.heard || "")) { c.s.learnerUmbrella = true; c.s.weatherDone = true; if (once(c, "umb")) c.say("umbrella_no_react"); }
    },
    late_react_ctx(c, _slots, seg) {
      if (!once(c, "late")) return;
      c.say(seg.tags.includes("worry") ? "late_worry" : seg.tags.includes("ok") ? "late_ok" : "late_typical");
    },
    like_yes_ctx(c) { likeAnswer(c, "like_yes_react"); },
    like_mixed_ctx(c, _slots, seg) { likeAnswer(c, seg.tags.includes("heat") ? "like_heat_react" : "like_mixed_react"); },
    like_no_ctx(c) { likeAnswer(c, "like_no_react"); },

    // --- the goodbye ---
    leave(c) { goodbye(c); },
    nice_talk(c) { goodbye(c); },
    bye_wish(c) { goodbye(c); },

    // --- shared intents, in his way ---
    // greeting back after his opener: his question simply comes again
    g_hello() { /* nothing to add */ },
    g_howareyou(c) { if (once(c, "how")) c.say("frank_how"); },
    howru_you(c) {
      // at the opener it answers "¿Cómo está?"; later it is an answer plus "¿usted?"
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
      // thanks for a welcome or a compliment needs no "De nada": he just goes on
      const praise = ["welcome_hood", "busy_spanish", "not_busy_react", "react_sport", "umbrella_have", "umbrella_yes_react", "winter_yes_react", "like_yes_react", "from_far"];
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
    { say: "¡Ya lo creo!", intent: "wx_agree", step: "weather" },
    { say: "Sí, tiene razón", intent: "wx_agree", step: "weather" },
    { say: "¡Ni me diga!", intent: "wx_agree", step: "weather" },
    { say: "Sí, está precioso", intent: "wx_adj", step: "weather", slots: { wx: "nice" } },
    { say: "¡Sí, qué calor!", intent: "wx_adj", step: "weather", slots: { wx: "hot" } },
    { say: "¡Y qué humedad!", intent: "wx_adj", step: "weather", slots: { wx: "hot" } },
    { say: "Sí, hace fresco", intent: "wx_adj", step: "weather", slots: { wx: "fresh" } },
    { say: "Sí, está muy nublado", intent: "wx_adj", step: "weather", slots: { wx: "rain" } },
    { say: "Hace más calor que ayer, ¿no?", intent: "wx_adj", step: "weather" },
    { say: "Qué día tan bonito, ¿verdad?", intent: "wx_adj", step: "weather", slots: { wx: "nice" } },
    { say: "¡Precioso!", intent: "wx_short_ctx", step: "weather", slots: { wx: "nice" } },
    { say: "¡Por fin salió el sol!", intent: "wx_extra", step: "weather" },
    { say: "¡Me estoy derritiendo!", intent: "wx_extra", step: "weather" },
    { say: "¡Necesito un suéter!", intent: "wx_extra", step: "weather" },
    { say: "¡Me encanta este clima!", intent: "wx_extra", step: "weather" },
    { say: "¡Ojalá que hoy no!", intent: "wx_hope", step: "weather" },
    { say: "Espero que no", intent: "wx_hope", step: "weather" },
    { say: "¡Ay, no traigo paraguas!", intent: "no_umbrella", step: "weather", not: ["umbrella_no", "wx_extra"] },
    { say: "No hace tanto calor", intent: "wx_neg", step: "weather", not: ["wx_adj", "wx_short_ctx"] },
    { say: "No me gusta el frío", intent: "wx_dislike", step: "weather", not: ["wx_extra"] },
    { say: "Bonito", intent: "none" },
    // temperatures: Celsius, or Fahrenheit converted kindly
    { say: "Estamos como a treinta grados", intent: "wx_temp", step: "weather", slots: { number: 30 } },
    { say: "Mi celular dice noventa grados", intent: "wx_temp", step: "weather", slots: { number: 90 } },
    { say: "Como treinta", intent: "wx_temp_ctx", step: "weather", slots: { number: 30 } },
    // the climate here
    { say: "¿Cuándo es la temporada de lluvias?", intent: "q_season" },
    { say: "¿Hay huracanes aquí?", intent: "q_hurricane" },
    { say: "¿Hay sargazo en la playa?", intent: "q_beach" },
    { say: "¿Qué es un norte?", intent: "q_norte" },
    { say: "¿Va a llover?", intent: "q_forecast" },
    { say: "¿Cuántos grados hace?", intent: "q_temp" },
    { say: "¿Siempre hace tanto calor aquí?", intent: "q_season" },
    // first visit
    { say: "Sí, acabo de llegar", intent: "new_yes", step: "new_q" },
    { say: "Sí, me mudé el mes pasado", intent: "new_yes", step: "new_q" },
    { say: "Sí, soy nueva aquí", intent: "new_yes", step: "new_q" },
    { say: "No soy nuevo", intent: "new_no", step: "new_q", not: ["new_yes"] },
    { say: "No, ya llevo un año aquí", intent: "new_no", step: "new_q", not: ["new_yes"] },
    { say: "¡Mucho gusto, Don Pancho! Yo soy Ryan.", intent: "intro_name", slots: { name: "Ryan" } },
    { say: "¡Igualmente!", intent: "nice_meet", step: "new_q" },
    { say: "Soy de Canadá", intent: "from_ans", slots: { country: "canada" } },
    { say: "Soy canadiense", intent: "from_ans", step: "from_q" },
    { say: "De Toronto, en Canadá", intent: "from_ctx", step: "from_q", slots: { city: "toronto", country: "canada" } },
    { say: "Soy de Chicago", intent: "from_ans", slots: { city: "chicago" } },
    { say: "No soy de Estados Unidos, soy de Canadá", intent: "from_ans", step: "from_q", slots: { country: "canada", bad: "usa" } },
    // the week
    { say: "¡Uf, una locura!", intent: "week_busy_ctx", step: "week" },
    { say: "Sí, mucho trabajo", intent: "week_busy_ctx", step: "week" },
    { say: "Sí, muy pesada", intent: "week_busy_ctx", step: "week" },
    { say: "No estoy muy ocupado", intent: "week_quiet_ctx", step: "week", not: ["week_busy_ctx"] },
    { say: "No tengo mucho trabajo", intent: "week_quiet_ctx", step: "week", not: ["week_busy_ctx"] },
    { say: "Normal, gracias", intent: "week_quiet_ctx", step: "week" },
    { say: "El trabajo, sobre todo", intent: "busy_why_ctx", step: "week" },
    { say: "¡Las clases de español!", intent: "busy_why_ctx", step: "week" },
    // the weekend
    { say: "Muy bien, gracias", intent: "wk_good_ctx", step: "weekend_past" },
    { say: "Fui a la playa", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "Visité a unos amigos", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "Descansé en casa", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "Hicimos una carne asada", intent: "wk_act_ctx", step: "weekend_past" },
    { say: "Nada especial", intent: "wk_nothing_ctx", step: "weekend_past" },
    { say: "No hice nada", intent: "wk_nothing_ctx", step: "weekend_past", not: ["wk_act_ctx"] },
    { say: "No me fue muy bien", intent: "wk_bad_ctx", step: "weekend_past", not: ["wk_good_ctx"] },
    { say: "¡Muy corto!", intent: "wk_good_ctx", step: "weekend_past" },
    { say: "Estuve enfermo todo el fin de semana", intent: "wk_bad_ctx", step: "weekend_past" },
    { say: "Voy a ir a la playa", intent: "wk_act_ctx", step: "weekend_plans" },
    { say: "Vamos a hacer una carne asada", intent: "wk_act_ctx", step: "weekend_plans" },
    { say: "Pescar", intent: "act_ctx", step: "weekend_plans" },
    { say: "Todavía no tengo planes", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_yes_ctx", "wk_act_ctx"] },
    { say: "No voy a hacer nada", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_act_ctx"] },
    { say: "Todavía no sé", intent: "wk_notyet_ctx", step: "weekend_plans" },
    { say: "Todavía no. A lo mejor voy al cenote.", intent: "wk_act_ctx", step: "weekend_plans" },
    // asking Don Pancho, showing interest
    { say: "¿Y usted?", intent: "ask_back" },
    { say: "¿Y usted, Don Pancho?", intent: "ask_back" },
    { say: "¿Y qué tal su fin de semana?", intent: "q_weekend" },
    { say: "¿Y usted tiene planes?", intent: "q_plans" },
    { say: "¿Usted es de aquí?", intent: "q_from" },
    { say: "¿Está jubilado?", intent: "q_job" },
    { say: "¿Pescaron algo?", intent: "q_story" },
    { say: "¿Cuántos años tiene su nieto?", intent: "q_story" },
    { say: "¿Cómo se llama su lancha?", intent: "q_story" },
    { say: "¿Y su familia?", intent: "q_family" },
    { say: "¡Qué bien!", intent: "interest" },
    { say: "¿En serio?", intent: "interest" },
    { say: "¡No me diga!", intent: "interest" },
    { say: "¡Suena muy divertido!", intent: "interest" },
    { say: "¡Qué suerte!", intent: "interest" },
    // twists
    { say: "¡Gracias, qué amable!", intent: "umbrella_yes", step: "rain" },
    { say: "¡Muchas gracias!", intent: "g_thanks", step: "rain" },
    { say: "No, gracias, traigo el mío", intent: "umbrella_no", step: "rain" },
    { say: "No traigo paraguas", intent: "no_umbrella", step: "rain", not: ["umbrella_no"] },
    { say: "¿Otra vez? ¡Como siempre!", intent: "late_react_ctx", step: "like_q" },
    { say: "¡Uy, voy a llegar tarde al trabajo!", intent: "late_react_ctx", step: "like_q" },
    { say: "¡Ay, no! Voy a llegar tarde al trabajo.", intent: "late_react_ctx", step: "like_q" },
    { say: "No pasa nada. No tengo prisa.", intent: "late_react_ctx", step: "like_q" },
    { say: "¡Me encanta!", intent: "like_yes_ctx", step: "like_q" },
    { say: "Hasta ahora, todo bien", intent: "like_yes_ctx", step: "like_q" },
    { say: "Me gusta, pero extraño a mi familia", intent: "like_mixed_ctx", step: "like_q" },
    { say: "No me gusta mucho", intent: "like_no_ctx", step: "like_q", not: ["like_yes_ctx"] },
    // the goodbye
    { say: "Bueno, ya me voy. ¡Qué gusto platicar con usted!", intent: "leave" },
    { say: "¡Fue un gusto platicar con usted!", intent: "nice_talk" },
    { say: "¡Que le vaya bien!", intent: "bye_wish" },
    { say: "¡Nos vemos mañana!", intent: "bye_wish" },
    { say: "Ahí viene mi camión", intent: "leave" },
    // tú to an older neighbor: understood, with a tip
    { say: "¿Y tú?", intent: "ask_back" },
    { say: "Tienes razón", intent: "wx_agree", step: "weather" },
    // learners' Spain forms: coger el coche, vale, curro
    { say: "Vamos a coger el coche e ir a Tulum", intent: "wk_act_ctx", step: "weekend_plans" },
    { say: "Vale, ¿y usted?", intent: "ask_back" },
    { say: "Sí, mucho curro", intent: "week_busy_ctx", step: "week" },
    { say: "Fui a la playa en coche", intent: "wk_act_ctx", step: "weekend_past" },
    // meaning must not flip
    { say: "No hace frío", intent: "wx_neg", step: "weather", not: ["wx_adj"] },
    { say: "No fui a ningún lado", intent: "wk_nothing_ctx", step: "weekend_past", not: ["wk_act_ctx"] },
    { say: "No me encanta", intent: "like_no_ctx", step: "like_q", not: ["like_yes_ctx"] },
    { say: "No me tengo que ir todavía", intent: "none", not: ["leave", "g_bye"] },
    { say: "No me gusta la lluvia", intent: "wx_dislike", step: "rain", not: ["umbrella_no"] },
    // review: negations and corrections that must not flip
    { say: "La verdad no me gusta tanto calor", intent: "wx_dislike", step: "weather", not: ["wx_extra", "wx_adj"] },
    { say: "No está nada bonito", intent: "wx_neg", step: "weather", not: ["wx_adj", "wx_short_ctx"] },
    { say: "Hoy no traje paraguas", intent: "no_umbrella", step: "weather", not: ["wx_extra", "umbrella_no"] },
    { say: "Olvidé mi paraguas", intent: "no_umbrella", step: "weather", not: ["wx_extra"] },
    { say: "No, vivo aquí desde hace tiempo", intent: "new_no", step: "new_q", not: ["new_yes"] },
    { say: "Sí, ya vivo aquí", intent: "new_yes", step: "new_q", not: ["new_no"] },
    { say: "No muy bien, estuve enfermo", intent: "wk_bad_ctx", step: "weekend_past", not: ["wk_good_ctx"] },
    { say: "No fui a la playa", intent: "wk_nothing_ctx", step: "weekend_past", not: ["wk_act_ctx", "act_ctx"] },
    { say: "No voy a ir a la playa", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_act_ctx", "act_ctx"] },
    { say: "No vamos a ir al cenote", intent: "wk_nothing_ctx", step: "weekend_plans", not: ["wk_act_ctx", "act_ctx"] },
    { say: "No me gusta el calor", intent: "like_mixed_ctx", step: "like_q", not: ["like_yes_ctx"] },
    { say: "No, gracias, no me molesta mojarme", intent: "umbrella_no", step: "rain", not: ["umbrella_yes"] },
    // review: questions that get their own answer
    { say: "¿Usted qué va a hacer?", intent: "q_plans" },
    { say: "¿Dónde vive usted?", intent: "q_live" },
    { say: "¿Dónde está su lancha?", intent: "q_story" },
    { say: "¿De qué color la va a pintar?", intent: "q_story" },
    { say: "Otra vez se retrasó el camión", intent: "late_react_ctx", step: "like_q" },
    // not understood
    { say: "El perro come banana", intent: "none" },
    { say: "Lancha camión paraguas", intent: "none" },
    { say: "Mi computadora es azul", intent: "none" },
    // audit (5 Nov): a "no" that agrees with him, the answers that were missing, the learner's own work never his
    { say: "No hace calor hoy", intent: "wx_neg", step: "weather", slots: { wx: "hot" }, not: ["wx_adj"] },
    { say: "No tengo frío", intent: "wx_neg", step: "weather", not: ["wx_extra", "wx_adj"] },
    { say: "Parece que sí", intent: "wx_short_ctx", step: "weather" },
    { say: "Sí, eso parece", intent: "wx_short_ctx", step: "weather" },
    { say: "¿Qué es el sargazo?", intent: "q_beach" },
    { say: "¿Hace frío aquí en invierno?", intent: "q_season" },
    { say: "Mucho trabajo", intent: "act_ctx", step: "weekend_past", not: ["q_story", "q_week"] },
    { say: "Tuve mucho trabajo", intent: "wk_act_ctx", step: "weekend_past", not: ["q_week", "q_story"] },
    { say: "Estuve muy ocupada", intent: "wk_act_ctx", step: "weekend_past", not: ["q_week"] },
    { say: "Tengo mucho trabajo", intent: "wk_act_ctx", step: "weekend_plans", not: ["q_week", "q_story"] },
    { say: "Voy al centro", intent: "wk_act_ctx", step: "weekend_plans", not: ["q_where"] },
    { say: "¿Cuesta mucho trabajo pintarla?", intent: "q_story" },
    { say: "¡Buen viaje!", intent: "bye_wish" },
    { say: "Tuve un buen fin de semana", intent: "wk_good_ctx", step: "weekend_past", not: ["q_weekend"] },
    { say: "Tuve un fin de semana horrible", intent: "wk_bad_ctx", step: "weekend_past", not: ["wk_good_ctx", "q_weekend"] },
    { say: "Sí, voy a hacer algo especial", intent: "wk_yes_ctx", step: "weekend_plans", not: ["q_plans"] },
    { say: "Tengo tres hijos", intent: "busy_why_ctx", step: "week", not: ["q_family"] },
  ],

  sims: [
    // every answer in full
    { name: "happy path", turns: [], expect: { complete: true }, auto: AUTO },
    // "¡Sí!", "Sí.", "Bien." … he invites a little more once per topic
    { name: "short answers", turns: [], expect: { complete: true }, auto: AUTO_SHORT },
    // the learner asks back in every answer ("Bien, ¿y usted?")
    { name: "asking back", turns: [], expect: { complete: true }, auto: AUTO_BACK },
    // questions before answers: the climate here, then the weather remark answered
    { name: "questions first", turns: ["¡Buenos días, Don Pancho! ¿Cómo está?", "¿Va a llover hoy?", "¿Hay huracanes aquí?", "Sí, hace calor, ¿no?"], expect: { complete: true },
      auto: except(AUTO, "weather") },
    // a Fahrenheit temperature (90 = about 32 °C), a plan inside "todavía no", a busy week with its reason in the same answer
    { name: "temperature, maybe plans", turns: ["¡Sí! Mi celular dice noventa grados."], expect: { complete: true }, setup: (s) => { s.howOpener = false; s.weather = "hot"; },
      auto: { ...except(AUTO, "weather"), weekend_plans: "Todavía no. A lo mejor voy al cenote.", weekend_past: "Nada especial. Me quedé en casa.",
        week: "Muy pesada. Mucho trabajo, sobre todo." } },
    // "Ya me voy" before the bus comes: he laughs it off, the chat goes on
    { name: "early goodbye", turns: ["Perdón, ya me voy.", "¡Ah, perdón! Sí, qué calor."], expect: { complete: true },
      auto: { ...except(AUTO, "weather"), closing: "¡Adiós, Don Pancho! ¡Que le vaya bien!" }, setup: (s) => { s.howOpener = false; s.weather = "hot"; } },
    // a returning neighbor: questions about him, a change of plan, the sargassum
    { name: "returning neighbor, his questions, a change of plan", turns: ["¿Hay sargazo en la playa?", "¿Y usted está jubilado?", "¿Qué tal su semana?", "¡Qué bien!", "Voy a ir a la playa. Bueno, mejor al cenote."],
      expect: { complete: true, state: { sargazoTip: undefined } }, auto: AUTO,
      setup: (s) => { s.known = true; s.howOpener = false; s.rainTwist = false; s.lateTwist = false; s.busFrank = false; s.day = "fri"; s.askWeek = false; } },
    // review: side questions about the climate and about him, each answered in its own way, then the chat goes on
    { name: "side questions", turns: ["¿Siempre hace tanto calor aquí?", "¿Cuándo es la temporada de lluvias?", "¿Dónde vive usted?", "¿Y usted tiene planes?", "¿De qué color la va a pintar?", "¿Dónde está su lancha?"],
      expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.known = true; s.howOpener = false; s.rainTwist = false; s.lateTwist = false; s.busFrank = false; s.day = "fri"; s.askWeek = false; s.weather = "hot"; } },
    // the twists, forced on every seed: the downpour (umbrella declined), the late bus, his own bus
    { name: "twist: downpour, late bus, his bus first", turns: ["Sí, parece que va a llover, ¿verdad?"], expect: { complete: true, state: { rainDone: true, lateSaid: true, likeDone: true } },
      auto: except(AUTO_TWIST, "weather"),
      setup: (s) => { s.known = true; s.rainTwist = true; s.lateTwist = true; s.busFrank = true; s.weather = "cloudy"; s.howOpener = false; } },
    // the downpour, umbrella accepted; no umbrella said earlier
    { name: "twist: downpour, umbrella accepted", turns: ["¡Ay, no traigo paraguas!"], expect: { complete: true, state: { rainDone: true } },
      auto: except(AUTO, "weather"),
      setup: (s) => { s.known = true; s.rainTwist = true; s.lateTwist = false; s.busFrank = false; s.weather = "cloudy"; s.howOpener = false; } },
    // audit (5 Nov): a "no" that agrees on a norte morning, the winter, what sargassum is, the work on his boat
    { name: "audit: a no that agrees, the winter, the sargassum, the boat", turns: ["No hace calor hoy.", "¿Aquí hace frío en invierno?", "Voy a ir a la playa.", "¿Qué es el sargazo?", "¿Es mucho trabajo?"],
      expect: { complete: true, state: { sargazoTip: true, turnSkipped: true } }, auto: AUTO,
      setup: (s) => { s.known = true; s.howOpener = false; s.rainTwist = false; s.lateTwist = false; s.busFrank = false; s.day = "fri"; s.askWeek = false; s.weather = "cold"; } },
    // audit (5 Nov): a Monday with work all weekend, asked back in the same breath
    { name: "audit: a weekend of work", turns: ["Sí, qué calor.", "Tuve mucho trabajo, ¿y usted?"], expect: { complete: true, state: { askedBack: true } }, auto: AUTO,
      setup: (s) => { s.known = true; s.howOpener = false; s.rainTwist = false; s.lateTwist = false; s.busFrank = false; s.day = "mon"; s.askWeek = false; s.weather = "hot"; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

/** A bare "Sí"/"No" only answers a step that is still open (not one he has already moved past). */
function onlyWhileOpen(steps: StepDef[]): StepDef[] {
  return steps.map((st) => ({
    ...st,
    yes: st.yes && ((c: Ctx) => { if (!st.done(c)) st.yes!(c); }),
    no: st.no && ((c: Ctx) => { if (!st.done(c)) st.no!(c); }),
  }));
}

/** After the goodbye nobody says anything more (a second piece of "Gracias, ¡adiós!" included). */
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
