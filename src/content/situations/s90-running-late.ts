// Song 90 "I'm Running Late": a phone call to the boss, Mr. Harris.
// The learner calls before the 9 o'clock meeting to say who is calling, that they are
// late, why, and when they will get there. Harris reacts to the reason, may ask whether to
// start without them, and on some visits has news (twist: the meeting moved to room 302
// in the other building).
//
// Harris is formal (jūs). The learner's own gender: {m:…|f:…} (the player is the addressee
// in NPC lines and the speaker in hints; both resolve to the player's gender).

import type { Ctx, Pending, SituationDef } from "../types";
import { t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Helpers

type Reason = "alarm" | "bus" | "train" | "traffic" | "car" | "keys" | "kids" | "family" | "appt" | "generic" | "taxi" | "sick";

const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_DO_Q = "Question “Do” = the particle ar.";
const F_WHOS = "“'s” (is) is progressive: the present tense of skambina carries it.";
const F_LATE_AM = "Progressive “am” has no separate Lithuanian word; the present tense of vėluoju carries it.";
const F_RUNNING = "“running … late” = vėluoti: the verb stands under “late”.";

function reasonOf(v: any): Reason | null {
  const tags: string[] = v?.__tags || [];
  const r = tags.find((x) => x.startsWith("r:"));
  return r ? (r.slice(2) as Reason) : null;
}

interface Eta { min?: number; soon?: boolean }

/** Minutes until arrival. The call happens at about 8:50; the meeting is at 9:00. */
function etaOf(v: any): Eta | null {
  if (!v) return null;
  const tags: string[] = v.__tags || [];
  if (tags.includes("soon")) return { soon: true, min: 5 };
  if (tags.includes("m5")) return { min: 5 };
  if (tags.includes("m30")) return { min: 30 };
  if (tags.includes("m60")) return { min: 60 };
  if (typeof v.number === "number") return { min: Math.max(v.number, typeof v.n2 === "number" ? v.n2 : 0) };
  if (v.time && typeof v.time === "object") {
    let h = v.time.h as number;
    const m = v.time.m as number;
    if (h < 7) h += 12;
    return { min: Math.max(0, h * 60 + m - (8 * 60 + 50)) };
  }
  return null;
}

/** "Yes, …" / "No, …" at the start of what the learner said (for answers that also carry an intent). */
function ynLead(c: Ctx): "yes" | "no" | null {
  const h = c.heard.toLowerCase();
  if (/^\s*(yes|yeah|yep|sure|ok|okay|of course|definitely)\b/.test(h)) return "yes";
  if (/^\s*(no|nope|nah)\b/.test(h)) return "no";
  return null;
}

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let t = turnIds.get(c); if (t === undefined) { t = ++turnSeq; turnIds.set(c, t); } return `${t}:${c.heard}`; };

/** Say a line at most once per learner turn (two handlers may react to the same utterance). */
function sayOnce(c: Ctx, id: string, vars?: Record<string, any>, group = id) {
  const key = "__said_" + group;
  if (c.s[key] === turn(c)) return;
  c.s[key] = turn(c);
  c.say(id, vars);
}

/** The learner is driving ("Sorry, I have to go, I'm driving."). */
const driving = (c: Ctx) => /\b(driving|in the car|on the (road|highway|freeway))\b/i.test(c.heard || "");
/** The learner ends the call in the same breath ("I'm driving, I have to go."). */
const leaving = (c: Ctx) => /\b(bye|goodbye|see you|talk to you later|take care|(have|need|got) to (go|hang up|run)|gotta go|call you (back|later))\b/i.test(c.heard || "");

/** Harris's goodbye, said once; ends the call without re-asking an open question. "Drive safe!" first
 *  when the learner is driving. */
function bye(c: Ctx, line = "bye") {
  if (!c.s.byeSaid) {
    c.s.byeSaid = true;
    if (driving(c) && !c.s.driveSaid) { c.s.driveSaid = true; c.say("closing_drive"); }
    c.say(line);
  }
  c.hold();
  c.end();
}

/** Tell the room news (twist) once. */
function roomNews(c: Ctx) {
  if (c.s.roomSaid) return false;
  c.s.roomSaid = true;
  c.twist("room_302");
  c.say("room_twist"); c.say("room_num");
  return true;
}

function mark(c: Ctx) {
  if (c.s.byeSaid) return false;
  c.s.opened = true;
  if (c.s.__lastHeard !== turn(c)) { c.s.__lastHeard = turn(c); c.s.__turn = (c.s.__turn || 0) + 1; }
  return true;
}

const REACT: Record<Reason, string> = {
  alarm: "react_alarm", bus: "react_bus", train: "react_train", traffic: "react_traffic", car: "react_car",
  keys: "react_keys", kids: "react_kids", family: "react_family", appt: "react_appt", generic: "react_generic",
  taxi: "react_taxi", sick: "react_family",
};

function doReason(c: Ctx, why: any) {
  const r = reasonOf(why) ?? "generic";
  const first = !c.s.reason;
  c.s.reason = r;
  c.s.late = true;
  if (!first) { sayOnce(c, "ack"); return; }
  sayOnce(c, REACT[r]);
  if (r === "car") {
    c.expect({
      id: "need_help", optional: true, expects: ["taxi_ok", "help_request", "no_help"], hints: ["g_yesno"],
      suggest: [{ lt: "Atsakyti, ar reikia pagalbos", hint: "g_yesno" }],
      yes: (cc) => { cc.say("help_yes"); },
      no: (cc) => { cc.say("help_no"); },
      on: { taxi_ok: (cc) => { cc.say("good_idea"); }, help_request: (cc) => { cc.say("help_yes"); }, no_help: (cc) => { cc.say("help_no"); } },
    });
  }
}

function doEta(c: Ctx, v: any) {
  // A bare number answers Harris's question: "When will you get here?" "Ten." = ten o'clock (9–12 only:
  // an earlier hour has passed and nobody means 5 p.m.); "How long will you be?" "Ten." = ten minutes.
  if (v?.__tags?.includes("bare") && c.step === "eta" && c.s.etaAsk === "when" && typeof v.number === "number" && v.number >= 9 && v.number <= 12)
    v = { time: { h: v.number, m: 0 }, __tags: [] };
  const e = etaOf(v);
  if (!e) return;
  c.s.eta = e;
  c.s.late = true;
  const m = e.min ?? 20;
  if (e.soon) sayOnce(c, "eta_soon");
  else if (m >= 45) { sayOnce(c, "eta_long"); if (!c.s.planned) { c.s.planned = "start"; c.s.planStated = true; } }
  else sayOnce(c, "eta_ok");
}

/** The goal (= the mission checklist) is reached once Harris knows who is calling, that they are
 *  late (or can't come), why (when he asked), when they'll be there, and whether to start (when he asked). */
function maybeComplete(c: Ctx) {
  const known = !!(c.s.name || c.s.callerId);
  const late = !!(c.s.late || c.s.cantCome);
  const why = !(c.s.late && c.s.askReason && !c.s.cantCome) || !!(c.s.reason || c.s.reasonSkipped);
  const when = !!(c.s.eta || c.s.etaSkipped || c.s.cantCome);
  const plan = !!c.s.cantCome || !c.s.planAsk || !!c.s.planned;
  if (known && late && why && when && plan) c.complete();
}

function planStart(c: Ctx) {
  if (c.s.planned === "start" && c.s.__planTurn === c.s.__turn) return;
  c.s.planned = "start"; c.s.__planTurn = c.s.__turn;
  c.say("ok_start");
  maybeComplete(c);
}
function planWait(c: Ctx) {
  if (c.s.planned === "wait" && c.s.__planTurn === c.s.__turn) return;
  c.s.planned = "wait"; c.s.__planTurn = c.s.__turn;
  c.say("ok_wait");
  maybeComplete(c);
}

const AUTO: Record<string, string> = {
  opening: "Hi, Mr. Harris, it's Tomas. I'm running late.",
  who: "It's Tomas.",
  late: "I'm running late.",
  reason: "I missed the bus.",
  eta: "In about twenty minutes.",
  plan_q: "Yes, please start without me.",
  need_help: "No, thanks. I'm getting a taxi.",
  cant_q: "No, I'm just running late.",
  room: "Okay, room 302. Got it.",
  closing: "Thanks. Bye!",
};

// ---------------------------------------------------------------------------

export const runningLate: SituationDef = {
  id: "s90-running-late",
  song: 90,
  songTitle: "I'm Running Late",
  title: { en: "I'm Running Late", lt: "Aš vėluoju" },
  topic: { en: "Running late", lt: "Vėlavimas" },
  chapter: 4,
  order: 4,
  location: "phone",
  npc: "harris",
  mode: "phone",
  goal: "Paskambink viršininkui ir pranešk, kad vėluoji.",
  intro: "8:50 ryto. Susirinkimas „Brightline“ biure prasideda devintą, o tu dar pakeliui. Paskambink viršininkui ponui Harisui: pasakyk, kas skambina, kad vėluoji, kodėl ir kada būsi.",

  grammar: {
    macros: {
      mh: "(mister harris | mr harris | sir)",
      pre: "[(i am | i am so | i am really | i am very | so | really) sorry [but] | sorry but | i am calling to (say | tell you | let you know) [that] | i (just | ) wanted to (say | tell you | let you know) [that] | i just wanted to (say | tell you | let you know) [that] | just to let you know [that] | unfortunately | i am afraid [that] | i think | i am calling [you] because | i am calling [you] to say [that] | i have a (problem | small problem) | bad news]",
      for_mtg: "[for (the meeting | work | our meeting | the nine oclock meeting | the 9 oclock meeting | the team meeting) | today | this morning]",
      bitlate: "[a (bit | little) | slightly]",
      post: "[sorry | sorry about that | sorry about this | i am (so | really) sorry | sorry again]",
      approx: "[maybe | or so | at most | tops | more or less]",
      unsure: "[(i am not sure | not sure | i do not know [exactly] | i think | probably | hopefully | i hope | not long | i guess) [but] [maybe | about | around]]",
      on_road: "[on (the highway | the freeway | the bridge | the road | the interstate | the way | my way | main street) | on the motorway #tip:uk_motorway]",
      be_there: "(i will be there | i should be there | i can be there | i will get there | i will be in | i will arrive | i will be at the office | i will be at work | i will be in the office | i will be with you | i can get there | i think i will be there | i hope to be there | i will be here)",
      late_core: [
        "i am running @bitlate late @for_mtg #h:running_late",
        "i am running @bitlate behind [schedule]",
        "i am going to be @bitlate late @for_mtg",
        "i will be @bitlate late @for_mtg",
        "i will be [about | around | maybe] {number} minutes late @for_mtg #h:ill_be_late",
        "i am going to be [about | around | maybe] {number} minutes late @for_mtg",
        "i am running [about | around] {number} minutes late @for_mtg",
        "i am @bitlate late @for_mtg",
        "i might be @bitlate late @for_mtg",
        "i think i will be @bitlate late @for_mtg",
        "i (will not | am not going to | can not | do not think i can | do not think i will) make it on time #h:not_on_time",
        "i (will not | can not) be there on time",
        "i will not be on time",
        "i will (come | arrive | get there | be there | be in) @bitlate (late | later) @for_mtg", "i (will | am going to) (come | arrive) [a (bit | little)] (late | later) @for_mtg",
        "i (can not | will not be able to | will not) (come | be there | get there | arrive | make it) [to (the meeting | work)] on time",
        "i (am going to | will) miss the (start | beginning | first part | first (few | ten | fifteen) minutes) of the meeting",
        "i will be late {number} minutes @for_mtg", "i am (late | running late) (again | today | this morning)",
      ],
    },
    slots: {
      why: { pattern: [
        "my alarm [clock] (did not go off | did not ring | did not work) #r:alarm #h:r_alarm",
        "i did not hear my alarm #r:alarm",
        "i forgot to set my alarm #r:alarm",
        "i overslept #r:alarm #h:r_overslept",
        "i (slept in | woke up late) #r:alarm", "i (slept | sleep) too (long | much | late) #r:alarm",
        "i did not sleep [well] [last night] #r:alarm",
        "i missed (the | my) bus #r:bus #h:r_bus",
        "the bus (was | is) (late | delayed | full | running late) #r:bus",
        "the bus (did not come | never came | broke down | is not coming) #r:bus",
        "my bus (was | is) (late | cancelled | canceled | delayed) #r:bus",
        "i missed (the | my) (train | subway | metro) #r:train",
        "i missed the (tube | underground) #r:train #tip:uk_tube",
        "(the | my) (train | subway | metro) (is | was) (late | delayed | cancelled | canceled | running late) #r:train #h:r_train",
        "the trains are (delayed | late | not running) #r:train",
        "(the | my) (train | subway | metro) (stopped | broke down | is not running | is not moving | is stuck | did not come) #r:train",
        "i had to wait for the next (one | bus | train) #r:bus",
        "i am stuck in traffic @on_road #r:traffic #h:r_traffic",
        "i am stuck in a traffic jam @on_road #r:traffic",
        "i am in (traffic | a traffic jam) @on_road #r:traffic",
        "i got stuck in traffic @on_road #r:traffic",
        "there is a (traffic jam | lot of traffic) @on_road #r:traffic",
        "there is (a lot of | heavy | bad | terrible | so much | a lot) traffic #r:traffic",
        "[the] traffic is (terrible | bad | awful | horrible | crazy | really bad | heavy | so bad) [today | this morning] #r:traffic",
        "there is a traffic jam #r:traffic",
        "there is a (big | huge | terrible | long | really bad) traffic jam @on_road #r:traffic", "[a] (big | huge | long | terrible) traffic jam @on_road #r:traffic", "[just] (traffic | the traffic | bad traffic | a lot of traffic | heavy traffic) #r:traffic",
        "there is (a lot of | so much | too much)? (snow | ice | fog) [on the (road | roads | highway)] #r:traffic", "the roads are (icy | slippery | bad | terrible | closed) #r:traffic",
        "the weather is (terrible | bad | awful) #r:traffic", "it is snowing [a lot] #r:traffic",
        "there (was | is) an accident [on the (highway | freeway | road | bridge | way)] #r:traffic",
        "there (was | is) (a | an) (big | bad | terrible | huge | serious | small) accident [on the (highway | freeway | road | bridge | way)] #r:traffic",
        "there (was | is) an accident on the motorway #r:traffic #tip:uk_motorway",
        "the road is closed #r:traffic",
        "there is (road work | roadwork | construction) [on the (highway | road)] #r:traffic",
        "my car (broke down | will not start | did not start | is not starting | has a flat tire) #r:car #h:r_car",
        "i (have | had | got) a flat tire #r:car",
        "i ran out of gas #r:car",
        "i ran out of petrol #r:car #tip:uk_petrol",
        "my [car] battery (is | was) dead #r:car",
        "i (can not | could not) find my (keys | car keys | phone | wallet) #r:keys #h:r_keys",
        "i lost my (keys | car keys) #r:keys",
        "i forgot my (phone | keys | wallet | bag | laptop | badge) [at home] [and (went | had to go) back] #r:keys",
        "i locked myself out #r:keys",
        "i had to take my (son | daughter | kid | kids | children | child) to (school | the doctor | the dentist | daycare | kindergarten) #r:kids #h:r_kid",
        "i had to drop off my (son | daughter | kid | kids | children) [at (school | daycare)] #r:kids",
        "i had to take (him | her | them) to (school | the doctor | the dentist | daycare | the hospital) #r:kids",
        "i had to wait for (the plumber | a plumber | the repairman | a delivery | the electrician) #r:generic",
        "there (is | was) no bus #r:bus",
        "my (son | daughter | kid | child | wife | husband) is sick #r:family",
        "i (have | had) a (doctor | doctors | dentist | dentists) appointment #r:appt",
        "i had to go to the (doctor | dentist | hospital) #r:appt",
        "i (had | have) a (family emergency | small emergency | problem at home | little problem | problem) #r:generic",
        "something came up #r:generic",
        "it is a long story #r:generic",
        "my (uber | taxi | ride | cab) (is | was) late #r:taxi",
        "i am waiting for (a | my | the) (taxi | uber | cab | ride) #r:taxi",
        "i am not feeling (well | very well | great) #r:sick",
        "i (was | am | felt) (sick | ill | not well) [this morning | last night | today] #r:sick",
        "my (son | daughter | kid | child | kids | children) missed the [school] bus #r:kids",
        "i (had | have) (a problem | problems | some problems | a small problem) with my car #r:car", "my car is (broken | not working | in the garage) #r:car",
      ] },
      eta: { pattern: [
        "[@be_there] in [about | around | maybe | like | roughly | approximately | another] {number} [more] minutes #h:eta_in",
        "@be_there in [about | around | maybe] {number} [more]",
        "in [about | around] {number} [more]",
        "[@be_there] in [about | around | maybe] {number} or {n2:number} minutes",
        "[@be_there] in [about | around | maybe] (half an hour | a half hour | thirty minutes) #m30 #h:eta_halfhour",
        "[@be_there] in [about | around | maybe] (an hour | one hour) #m60",
        "[@be_there] in (a few | a couple of | a couple) minutes #m5",
        "@be_there (by | at | around | at about | about | before) {time} #h:eta_by",
        "(by | at | around | at about | about | before) {time}",
        "i am [about | around | only | just | maybe] {number} minutes away #h:eta_away",
        "i am (almost there | nearly there | close | really close | around the corner | just around the corner | five minutes away | very close) #soon #h:eta_soon",
        "i will be there (soon | very soon | shortly | in a minute) #soon",
        "[about | around | maybe] {number} minutes",
        // "Maybe fifteen or twenty minutes.", "Ten to fifteen minutes."
        "[about | around | maybe | like | roughly] {number} (or | to) {n2:number} [more] minutes",
        // a bare "Ten.": minutes or ten o'clock, by Harris's question (see etaOf)
        "[about | around | maybe | like | roughly] {number} [or so] #bare",
        "[about | around | maybe] (half an hour | a half hour) #m30",
        "[about | around | maybe] (an hour | one hour) #m60",
        "[just] (a few | a couple of) minutes #m5",
        "[very | pretty] soon #soon",
        "(shortly | any minute [now]) #soon",
        "{time}",
        "not more than {number} minutes", "give me [about | around] {number} [more] minutes", "after {time}", "[about | around] {number} {n2:number} minutes",
        "i (will be | can be) there [in] (a few | a couple of) minutes #m5",
      ] },
    },
  },

  intents: {
    identify: { patterns: [
      "[@mh] (it is | this is) {name} [here | calling] #h:id_its",
      "[@mh] it is me {name}",
      "[@mh] (it is | this is) {name} from (work | the office | marketing | sales | the team | your team)",
      "[@mh] {name} (here | speaking | calling)", "[@mh] (it is | this is) {name} [here] [i am] calling about (the meeting | the nine oclock meeting | today | this morning)",
    ] },
    its_me: { patterns: ["[@mh] it is (me | just me)"] },
    // "Hello, is Tomas." (learner English without "it"): only as an answer to the phone greeting
    identify_ctx: { patterns: ["is {name} [here | calling | speaking]"] },
    name_ctx: { patterns: ["{name}", "my name is {name}", "i am {name}", "(it is | this is) {name}"] },
    greet_harris: { patterns: ["@mh", "(hi | hello | good morning | morning) @mh"] },
    is_harris: { patterns: ["is (this | that) @mh", "is @mh there", "am i speaking (to | with) @mh", "(can | could | may) i (speak | talk) (to | with) @mh [please]"] },
    late: { patterns: [
      "@pre @late_core @post",
      "@pre @late_core [because | since | as] {why} @post",
      "@pre @late_core [and] {eta}",
    ] },
    reason: { patterns: [
      "[yes] everything is (fine | okay) [it is] [just] {why}",
      "@pre [because | it is because | the reason is] {why} @post",
      "@pre {why} [so] (i am | i will be) [running] [a (bit | little)] late",
      "@pre {why} [and] {eta}",
    ] },
    eta: { patterns: ["@pre @unsure {eta} @approx", "i hope to be there (in | by) {eta}"] },
    on_way: { patterns: ["[but] i am on my way [now]", "i am coming", "i am (leaving | driving | walking) [now | right now]", "i am (in | driving) (the | my) car [now | right now]", "i am [already] on the (bus | train | way)"] },
    not_late: { patterns: [
      "i (am not | will not be | am not going to be) late",
      "i (will be | am going to be) (there | here | in) on time",
      "i will be on time",
    ] },
    cant_come: { patterns: [
      "@pre i (can not | will not be able to) come [in] [today | to work | to the meeting]",
      "@pre i (can not | will not) make it [today | to the meeting | at all]",
      "@pre i (can not | will not be able to) (join | attend) the meeting",
    ] },
    start_without: { patterns: [
      "[you can | you could] (start | begin) without me #h:start_without",
      "(could | can) you (start | begin) without me",
      "go ahead and (start | begin) [the meeting] [without me]",
      "go ahead without me",
      "(could | can) you (start | begin) the meeting without me",
      "(start | begin) the meeting without me",
      "do not wait for me #h:dont_wait",
      "you do not have to wait [for me]",
      "feel free to start [without me]",
      "[yes] go ahead [and start] [without me]", "[you can] (start | begin) without me [i will (catch up | join (you | later) | be there soon)]",
      "[yes] you can (start | begin) [without me]", "do not wait [for me]", "[yes] start [the meeting] [i will join (later | you later | when i get there)]", "[yes] (start | go ahead) [the meeting] no problem",
      "(it is | it would be) better to start without me", "[please] (start | begin) [the meeting] [without me] i will (catch up | join later)",
    ] },
    wait_for_me: { patterns: [
      "do not start without me",
      "(could | can) you wait for me",
      "wait for me",
      "i would like you to wait [for me]",
      "(could | can) you wait (a (bit | few minutes) | ten minutes | five minutes)",
      "i want to be there (from the (beginning | start) | for the whole meeting)", "if possible wait [for me]", "[no] wait [for me] [if possible]", "wait (a (bit | few minutes | little) | {number} minutes) [for me]",
      "(could | can) you wait {number} minutes [for me]", "i would prefer (you to wait | to be there from the start)",
    ] },
    save_seat: { patterns: [
      "(could | can) you save me a seat #h:save_seat",
      "save me a seat",
      "(could | can) you keep me a seat",
    ] },
    tell_team: { patterns: [
      "(could | can) you (tell | let) (the (others | team) | everyone | them) [know] #h:tell_team",
      "(tell | let) (the (others | team) | everyone | them) know",
      "(could | can) you tell (the (others | team) | everyone) that i am (late | running late)",
      "(tell | let) (the (others | team) | everyone | them) [know] [that] i am (coming | on my way | running late | late)",
    ] },
    join_online: { patterns: [
      "(can | could | should) i join (online | by phone | on my phone | the call | remotely | on zoom) #h:join_online",
      "(can | could | should) i join (the meeting | the call) (online | by phone | on my phone | remotely | on zoom | from the (bus | car | taxi | train))",
      "can i call in",
      "could you send me the link",
    ] },
    will_call: { patterns: ["i will call you (when i am close | if anything changes | when i get there | when i know more)", "i will text you (when i am close | when i get there)"] },
    apologize: { patterns: [
      "(i am [so | really | very | terribly] | so | really) sorry [about (this | that | the delay | being late) | for (being late | the delay | the trouble | this | the inconvenience)] #h:sorry",
      "sorry (about | for) (this | that | the delay | being late | the trouble | the inconvenience) #h:sorry_trouble",
      "i apologize [for (being late | the delay | the inconvenience)]",
      "it (will not | is not going to) happen again #h:wont_happen",
      "[i am] sorry again",
    ] },
    ask_room: { patterns: ["(which | what) room is (it | the meeting) in", "where is the meeting", "is it in the (usual | same) room", "which room #h:q_room", "(which | what) room", "(which | what) floor [is it on | is it]"] },
    ask_ok: { patterns: ["is (that | it) (okay | all right | a problem)", "i hope (that | it) is (okay | all right)", "is it okay if i (come | am) a (bit | little) later"] },
    confirm_room: { patterns: [
      "[okay | all right] room {number} [in the other building] [got it] #h:room_got_it",
      "[okay | all right] room three (oh | o | zero) two [in the other building] [got it] #h:room_got_it",
      "[okay | all right] (the other building | in the other building) [room {number}] [got it]",
      "got it room {number}",
      "[okay | all right] [room] three (oh | o | zero) two [in the other building] [got it]", "i will (go to | come to | be in) room {number}",
    ] },
    thanks_info: { patterns: ["(thanks | thank you) for (telling me | letting me know | the information | the info)"] },
    thanks_understanding: { patterns: ["(thanks | thank you) [so much | very much] for (understanding | your understanding | being (so | very) understanding | your patience | being patient)"] },
    bye_meeting: { patterns: ["see you (at the meeting | there | in a bit | in a few minutes | in the meeting | in room {number})"] },
    no_help: { patterns: ["[no] i (do not | don't) need (a taxi | help | any help | anything) [thanks | thank you]", "[no] (thanks | thank you) i am (okay | fine | good)"] },
    help_request: { patterns: ["[yes] (can | could) (someone | somebody | you) (pick me up | come get me | come and get me | help me | send someone)"] },
    ask_building: { patterns: ["where is the other building #h:q_building", "which building", "where is (that | it)", "the other building", "how (do | can) i get (there | to the other building)"] },
    taxi_ok: { patterns: [
      "i am (getting | taking) a (taxi | cab | uber)", "i (called | will call | will get | will take) a (taxi | cab | uber)", "[no] it is (okay | fine) i am (getting | taking) a (taxi | cab)",
      "[no] [it is (okay | fine)] i (called | will call | will get | will take | ordered | got) (a | an) (taxi | cab | uber | lyft)",
      "[no] [thanks] i am waiting for (a tow truck | roadside assistance | the mechanic | a mechanic | help)",
      "[no] [it is (okay | fine)] my (husband | wife | friend | brother | sister | neighbor | son | daughter) is (coming | picking me up | driving me | helping me)",
      "[no] [it is (okay | fine)] i will (take | get) the (bus | train | subway)",
    ] },
    just_late: { patterns: ["[no] i am just running late", "[no] i will just be (late | a bit late)", "[no] i will come later", "[no] i am coming [but] (later | a bit later)"] },
  },

  lines: {
    hello: [
      t("Hello, | this | is | Harris.", "Alio, | čia | yra | Harisas.", "Alio, čia Harisas."),
      t("Good | morning, | Harris | speaking.", "Labas | rytas, | Harisas | klauso.", "Labas rytas, Harisas klauso."),
      t("Hello, | Harris | speaking.", "Alio, | Harisas | klauso.", "Alio, Harisas klauso."),
    ],
    hello_id: [
      t("Oh, | hi! | Good | morning. | Is | everything | okay?", "O, | sveiki! | Labas | rytas. | Ar | viskas | gerai?", "O, sveiki! Labas rytas. Ar viskas gerai?", { flags: { 4: F_IS_Q } }),
      t("Hi there! | Good | morning. | Everything | okay?", "Sveiki! | Labas | rytas. | Viskas | gerai?", "Sveiki! Labas rytas. Viskas gerai?"),
    ],
    hello_again: [
      t("Hello? | Who's | calling, | please?", "Alio? | Kas | skambina, | prašau?", "Alio? Kas skambina?", { flags: { 1: F_WHOS } }),
      t("Sorry, | who's | calling?", "Atsiprašau, | kas | skambina?", "Atsiprašau, kas skambina?", { flags: { 1: F_WHOS } }),
    ],
    yes_hi: [
      t("Yes, | hi!", "Taip, | sveiki!", "Taip, sveiki!"),
    ],
    hi_short: [
      t("Hi!", "Sveiki!", "Sveiki!"),
      t("Hi there!", "Sveiki!", "Sveiki!"),
    ],
    who: [
      t("Sorry, | who's | calling?", "Atsiprašau, | kas | skambina?", "Atsiprašau, kas skambina?", { flags: { 1: F_WHOS } }),
      t("I'm sorry, | who | is | this?", "Atsiprašau, | kas | yra | čia?", "Atsiprašau, kas čia?"),
    ],
    who_again: [
      t("Sorry, | I | didn't catch | your | name.", "Atsiprašau, | aš | nenugirdau | jūsų | vardo.", "Atsiprašau, nenugirdau jūsų vardo."),
    ],
    name_ack: [
      t("Hi! | Good | morning.", "Sveiki! | Labas | rytas.", "Sveiki! Labas rytas."),
      t("Ah, | hi there!", "A, | sveiki!", "A, sveiki!"),
      t("Oh, | hello!", "O, | sveiki!", "O, sveiki!"),
    ],
    ask_late: [
      t("What | can | I | do | for you?", "Ką | galiu | aš | padaryti | jums?", "Kuo galiu padėti?"),
      t("What's up?", "Kas nutiko?", "Kas nutiko?"),
      t("How | can | I | help?", "Kaip | galiu | aš | padėti?", "Kuo galiu padėti?"),
    ],
    ask_late_wrong: [
      t("Oh | no. | What's | wrong?", "O | ne. | Kas yra | negerai?", "O ne. Kas nutiko?"),
    ],
    ask_reason: [
      t("Oh | no. | What | happened?", "O | ne. | Kas | atsitiko?", "O ne. Kas atsitiko?"),
      t("Oh, | is | everything | okay?", "O, | ar | viskas | gerai?", "O, ar viskas gerai?", { flags: { 1: F_IS_Q } }),
      t("What | happened?", "Kas | atsitiko?", "Kas atsitiko?"),
    ],
    react_bus: [
      t("Oh, | that's | annoying.", "O, | tai yra | nemalonu.", "O, kaip nemalonu."),
      t("Oh | no! | That's | the | worst.", "O | ne! | Tai yra | — | blogiausia.", "O ne! Blogiau nebūna."),
    ],
    react_traffic: [
      t("Yeah, | the | traffic | is | terrible | this | morning.", "Taip, | — | eismas | yra | baisus | šį | rytą.", "Taip, šį rytą eismas baisus."),
      t("I | know, | the | roads | are | really | busy | today.", "Aš | žinau, | — | keliai | yra | tikrai | perpildyti | šiandien.", "Žinau, šiandien keliuose tikra spūstis."),
    ],
    react_alarm: [
      t("Ha! | It | happens | to everyone.", "Cha! | Tai | nutinka | visiems.", "Cha! Taip nutinka visiems."),
      t("Oh, | that | happens.", "O, | tai | nutinka.", "O, taip būna."),
    ],
    react_train: [
      t("Oh | no, | not | again!", "O | ne, | ne | vėl!", "O ne, ir vėl!"),
    ],
    react_car: [
      t("Oh | no! | Do | you | need | any | help?", "O | ne! | Ar | jums | reikia | kokios nors | pagalbos?", "O ne! Ar jums reikia pagalbos?", { flags: { 2: F_DO_Q } }),
    ],
    react_keys: [
      t("Oh | no! | I | hate | when | that | happens.", "O | ne! | Aš | nekenčiu, | kai | taip | nutinka.", "O ne! Nekenčiu, kai taip nutinka."),
    ],
    react_kids: [
      t("Of course. | Family | comes | first.", "Žinoma. | Šeima | eina | pirmiausia.", "Žinoma. Šeima svarbiausia."),
    ],
    react_family: [
      t("Oh, | I'm | sorry | to hear | that.", "O, | man | gaila | girdėti | tai.", "O, gaila tai girdėti."),
    ],
    react_appt: [
      t("Of course, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
    ],
    react_generic: [
      t("Oh, | okay. | I | understand.", "O, | gerai. | Aš | suprantu.", "O, gerai. Suprantu."),
    ],
    react_taxi: [
      t("Okay, | these | things | happen.", "Gerai, | tokie | dalykai | nutinka.", "Gerai, taip nutinka."),
    ],
    help_yes: [
      t("Okay. | Call | me | if | you | need | anything.", "Gerai. | Skambinkite | man, | jei | jums | reikės | ko nors.", "Gerai. Skambinkite, jei ko nors reikės."),
    ],
    help_no: [
      t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku."),
    ],
    good_idea: [
      t("Good | idea.", "Gera | mintis.", "Gera mintis."),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("I | see.", "Aš | suprantu.", "Suprantu."),
    ],
    // "When…?" / "What time…?" (a bare "Ten." = ten o'clock) and "How long…?" (a bare "Ten." = ten minutes)
    ask_eta: [
      t("When | do | you | think | you'll get | here?", "Kada | — | jūs | manote | atvyksite | čia?", "Kada, jūsų manymu, atvyksite?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on manote (linked to “think”)." } }),
      t("What | time | will | you | be | here?", "Kelintą | valandą | — | jūs | būsite | čia?", "Kelintą valandą būsite čia?", { flags: { 2: "“will”: the future ending of būsite carries it (linked to “be”)." } }),
    ],
    ask_eta_long: [
      t("How | long | do | you | think | you'll be?", "Kaip | ilgai | — | jūs | manote | užtruksite?", "Kiek, jūsų manymu, užtruksite?", { flags: { 2: "Question “do” has no Lithuanian word; the tense sits on manote (linked to “think”)." } }),
    ],
    ask_eta_vague: [
      t("Okay. | About | how | long?", "Gerai. | Maždaug | kaip | ilgai?", "Gerai. Maždaug kiek laiko?"),
    ],
    eta_ok: [
      t("Okay, | that | works.", "Gerai, | tai | tinka.", "Gerai, tinka."),
      t("All right, | that's | not | too | bad.", "Gerai, | tai | nėra | per | blogai.", "Gerai, ne taip jau blogai.",
        { flags: { 1: "“'s” (is) takes the negation in Lithuanian: nėra stands under “not”." } }),
    ],
    eta_soon: [
      t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku."),
      t("Great.", "Puiku.", "Puiku."),
    ],
    eta_long: [
      t("Hmm, | okay. | We'll start | without | you, | then.", "Hmm, | gerai. | Pradėsime | be | jūsų, | tada.", "Hmm, gerai. Tada pradėsime be jūsų."),
    ],
    plan_ask: [
      t("Should | we | start | without | you?", "Ar | mums | pradėti | be | jūsų?", "Ar pradėti be jūsų?", { flags: { 0: "“Should” in a yes/no question = the particle ar; the dative mums with the infinitive pradėti carries “should we”." } }),
      t("Do | you | want | us | to start | without | you?", "Ar | jūs | norite, | kad mes | pradėtume | be | jūsų?", "Ar norite, kad pradėtume be jūsų?", { flags: { 0: F_DO_Q, 3: "“us … to start”: Lithuanian needs a kad-clause with the subjunctive (kad mes pradėtume)." } }),
    ],
    plan_start: [
      t("No | problem. | We'll start | without | you.", "Jokių | problemų. | Pradėsime | be | jūsų.", "Jokių problemų. Pradėsime be jūsų."),
      t("We'll | just | start | without | you, | then.", "Mes | tiesiog | pradėsime | be | jūsų, | tada.", "Tada tiesiog pradėsime be jūsų.",
        { flags: { 0: "“'ll” (will): the future ending of pradėsime carries it." } }),
    ],
    plan_wait: [
      t("Don't worry, | we'll wait | for you.", "Nesijaudinkite, | palauksime | jūsų.", "Nesijaudinkite, palauksime jūsų."),
      t("That's | okay. | We'll wait | for you.", "Tai yra | gerai. | Palauksime | jūsų.", "Nieko tokio. Palauksime jūsų."),
    ],
    thanks_letting: [
      t("Thanks | for | letting | me | know.", "Ačiū, | kad | — | man | pranešėte.", "Ačiū, kad pranešėte.", { flags: { 2: "“letting … know” = pranešti: the verb pranešėte stands under “know”." } }),
    ],
    room_twist: [
      t("Oh, | and | by the way, | the | meeting's | in | the | other | building | today.", "O, | ir | beje, | — | susirinkimas yra | — | — | kitame | pastate | šiandien.", "O, beje, šiandien susirinkimas kitame pastate.",
        { flags: { 5: "“in”: the locative ending of pastate carries it; the adjective kitame stands between." } }),
    ],
    room_num: [
      t("Room | 302.", "Kabinetas | 302.", "302 kabinetas.", { say: "Room three-oh-two.", write: "Room 302 · the other building (across the street)" }),
    ],
    room_right: [
      t("That's | right.", "Tai yra | teisinga.", "Taip, teisingai."),
      t("Exactly.", "Būtent.", "Būtent."),
    ],
    room_wrong: [
      t("No, | it's | room | 302.", "Ne, | tai yra | kabinetas | 302.", "Ne, 302 kabinetas.", { say: "No, it's room three-oh-two.", write: "Room 302 · the other building (across the street)" }),
    ],
    building: [
      t("It's | right | across | the | street.", "Jis yra | tiesiai | skersai | — | gatvės.", "Jis tiesiai kitoje gatvės pusėje."),
    ],
    room_here: [
      t("It's | in | our | building, | as | usual. | Room | 204.", "Jis yra | — | mūsų | pastate, | kaip | įprastai. | Kabinetas | 204.", "Mūsų pastate, kaip įprastai. 204 kabinetas.",
        { say: "It's in our building, as usual. Room two-oh-four.", write: "Room 204", flags: { 1: "“in”: the locative ending of pastate carries it; the possessive mūsų stands between." } }),
    ],
    room_usual: [
      t("Same | as | usual: | room | 204.", "Tas pats | kaip | įprastai: | kabinetas | 204.", "Kaip įprastai – 204 kabinetas.", { say: "Same as usual: room two-oh-four.", write: "Room 204" }),
    ],
    ok_start: [
      t("Sure, | we'll start | without | you.", "Žinoma, | pradėsime | be | jūsų.", "Žinoma, pradėsime be jūsų."),
      t("Okay, | we'll get started, | then.", "Gerai, | pradėsime, | tada.", "Gerai, tada pradėsime."),
    ],
    ok_wait: [
      t("Sure, | we | can | wait | a | few | minutes.", "Žinoma, | mes | galime | palaukti | — | kelias | minutes.", "Žinoma, galime kelias minutes palaukti."),
    ],
    ok_seat: [
      t("Of course. | I'll save | you | a | seat.", "Žinoma. | Paliksiu | jums | — | vietą.", "Žinoma. Paliksiu jums vietą."),
    ],
    ok_tell: [
      t("Sure, | I'll tell | them.", "Žinoma, | pasakysiu | jiems.", "Žinoma, pasakysiu jiems."),
    ],
    ok_link: [
      t("Sure, | I'll send | you | the | link.", "Žinoma, | atsiųsiu | jums | — | nuorodą.", "Žinoma, atsiųsiu jums nuorodą."),
    ],
    ok_call: [
      t("Sounds | good.", "Skamba | gerai.", "Gerai."),
    ],
    ok_fine: [
      t("Yes, | that's | fine.", "Taip, | tai yra | gerai.", "Taip, viskas gerai."),
      t("Of course. | Don't worry.", "Žinoma. | Nesijaudinkite.", "Žinoma. Nesijaudinkite."),
    ],
    is_harris: [
      t("Yes, | speaking.", "Taip, | klausau.", "Taip, klausau."),
    ],
    not_late_resp: [
      t("Oh, | good! | Then | see you | at nine.", "O, | puiku! | Tada | iki | devintos.", "O, puiku! Tada iki devintos."),
    ],
    cant_come_q: [
      t("Oh. | So | you | can't come | today?", "O. | Tai | jūs | negalite atvykti | šiandien?", "O. Tai šiandien negalite atvykti?"),
    ],
    cant_come_ok: [
      t("Okay, | I | understand. | Thanks | for | letting | me | know.", "Gerai, | aš | suprantu. | Ačiū, | kad | — | man | pranešėte.", "Gerai, suprantu. Ačiū, kad pranešėte.",
        { flags: { 6: "“letting … know” = pranešti: the verb pranešėte stands under “know”." } }),
    ],
    just_late: [
      t("Oh, | okay. | So | you're | just | running | late.", "O, | gerai. | Tai | jūs | tik | — | vėluojate.", "O, gerai. Tai jūs tik vėluojate.",
        { flags: { 3: "Progressive “are”: the present tense of vėluojate carries it.", 5: F_RUNNING } }),
    ],
    sorry_ok: [
      t("It's | okay. | These | things | happen.", "Tai yra | gerai. | Tokie | dalykai | nutinka.", "Nieko tokio, taip nutinka."),
      t("Don't worry | about | it.", "Nesijaudinkite | dėl | to.", "Nesijaudinkite dėl to."),
    ],
    wont_happen_ok: [
      t("I | know. | Don't worry | about | it.", "Aš | žinau. | Nesijaudinkite | dėl | to.", "Žinau. Nesijaudinkite."),
    ],
    closing: [
      t("Okay, | see you | soon.", "Gerai, | iki | greito.", "Gerai, iki greito."),
      t("Thanks | for | calling. | See you | soon!", "Ačiū, | kad | paskambinote. | Iki | greito!", "Ačiū, kad paskambinote. Iki greito!"),
    ],
    closing_drive: [
      t("Okay. | Drive | safe!", "Gerai. | Važiuokite | atsargiai!", "Gerai. Saugaus kelio!"),
    ],
    take_care: [
      t("Take care.", "Laikykitės.", "Laikykitės."),
    ],
    bye: [
      t("Bye!", "Iki!", "Iki!"),
      t("See you | soon. | Bye!", "Iki | greito. | Viso gero!", "Iki greito! Viso gero!"),
    ],
  },

  hints: {
    identify: {
      lt: "Pasisveikinti ir prisistatyti",
      items: [
        { id: "id_its", s: t("Hi, | Mr. | Harris, | it's | {$name}.", "Sveiki, | pone | Harisai, | čia | {$name}.", "Sveiki, pone Harisai, čia {$name}."), note: "Telefonu sakoma „it's …“ arba „this is …“, ne „I am …“." },
        { id: "id_its", s: t("Good | morning, | Mr. | Harris. | This | is | {$name}.", "Labas | rytas, | pone | Harisai. | Čia | yra | {$name}.", "Labas rytas, pone Harisai. Čia {$name}.") },
      ],
    },
    late: {
      lt: "Pasakyti, kad vėluoji",
      items: [
        { id: "running_late", s: t("I'm | running | late.", "Aš | — | vėluoju.", "Aš vėluoju.", { flags: { 0: F_LATE_AM, 1: F_RUNNING } }) },
        { id: "running_late", s: t("I'm | running | a little | late.", "Aš | — | truputį | vėluoju.", "Truputį vėluoju.", { flags: { 0: F_LATE_AM, 1: F_RUNNING } }) },
        { id: "ill_be_late", s: t("I'll be | about | 20 | minutes | late.", "Pavėluosiu | maždaug | 20 | minučių | —.", "Pavėluosiu maždaug 20 minučių.",
          { say: "I'll be about twenty minutes late.", flags: { 4: "“late”: carried by pavėluosiu (under “I'll be”)." } }) },
        { id: "not_on_time", s: t("I | won't make | it | on time.", "Aš | nespėsiu | — | laiku.", "Nespėsiu laiku.", { flags: { 2: "Dummy “it” of “make it” (manage to arrive) has no Lithuanian word." } }) },
        { id: "running_late", s: t("I'm sorry, | but | I'm | running | late.", "Atsiprašau, | bet | aš | — | vėluoju.", "Atsiprašau, bet vėluoju.", { flags: { 2: F_LATE_AM, 3: F_RUNNING } }) },
      ],
    },
    reason: {
      lt: "Paaiškinti, kodėl vėluoji",
      items: [
        { id: "r_bus", s: t("I | missed | the | bus.", "Aš | nespėjau į | — | autobusą.", "Nespėjau į autobusą.") },
        { id: "r_traffic", s: t("I'm | stuck | in traffic.", "Aš esu | {m:įstrigęs|f:įstrigusi} | kamštyje.", "Įstrigau kamštyje.") },
        { id: "r_alarm", s: t("My | alarm | didn't go off.", "Mano | žadintuvas | nesuskambo.", "Nesuskambo žadintuvas.") },
        { id: "r_overslept", s: t("I | overslept.", "Aš | pramiegojau.", "Pramiegojau.") },
        { id: "r_train", s: t("The | train | is delayed.", "— | Traukinys | vėluoja.", "Traukinys vėluoja.") },
        { id: "r_car", s: t("My | car | won't start.", "Mano | automobilis | neužsiveda.", "Neužsiveda automobilis.") },
        { id: "r_keys", s: t("I | couldn't find | my | keys.", "Aš | neradau | savo | raktų.", "Neradau raktų.") },
        { id: "r_kid", s: t("I | had | to take | my | son | to | the | doctor.", "Aš | turėjau | nuvežti | savo | sūnų | pas | — | gydytoją.", "Turėjau nuvežti sūnų pas gydytoją.") },
      ],
    },
    eta: {
      lt: "Pasakyti, kada būsi",
      items: [
        { id: "eta_in", s: t("I'll be | there | in | 20 | minutes.", "Būsiu | ten | po | 20 | minučių.", "Būsiu po 20 minučių.", { say: "I'll be there in twenty minutes." }) },
        { id: "eta_by", s: t("I'll be | there | by | 9:30.", "Būsiu | ten | iki | 9:30.", "Būsiu iki 9:30.", { say: "I'll be there by nine thirty." }) },
        { id: "eta_halfhour", s: t("In | about | half | an | hour.", "Po | maždaug | pusės | — | valandos.", "Maždaug po pusvalandžio.") },
        { id: "eta_away", s: t("I'm | about | 10 | minutes | away.", "Aš esu | maždaug | 10 | minučių | kelio atstumu.", "Man liko maždaug 10 minučių kelio.", { say: "I'm about ten minutes away." }) },
        { id: "eta_soon", s: t("I'm | almost | there.", "Aš esu | beveik | ten.", "Jau beveik esu vietoje.") },
      ],
    },
    requests: {
      lt: "Paprašyti pradėti be tavęs ar palikti vietą",
      items: [
        { id: "start_without", s: t("Please | start | without | me.", "Prašau, | pradėkite | be | manęs.", "Prašau, pradėkite be manęs.") },
        { id: "dont_wait", s: t("Please | don't wait | for me.", "Prašau, | nelaukite | manęs.", "Prašau, nelaukite manęs.") },
        { id: "save_seat", s: t("Could | you | save | me | a | seat?", "Ar galėtumėte | jūs | palikti | man | — | vietą?", "Ar galėtumėte palikti man vietą?") },
        { id: "tell_team", s: t("Could | you | tell | the | team?", "Ar galėtumėte | jūs | pasakyti | — | komandai?", "Ar galėtumėte pasakyti komandai?") },
        { id: "join_online", s: t("Can | I | join | online?", "Ar galiu | aš | prisijungti | nuotoliniu būdu?", "Ar galiu prisijungti nuotoliniu būdu?") },
      ],
    },
    room: {
      lt: "Pasitikslinti kabinetą ir pastatą",
      items: [
        { id: "room_got_it", s: t("Okay, | room | 302. | Got it.", "Gerai, | kabinetas | 302. | Supratau.", "Gerai, 302 kabinetas. Supratau.", { say: "Okay, room three-oh-two. Got it." }) },
        { id: "q_building", s: t("Where's | the | other | building?", "Kur yra | — | kitas | pastatas?", "Kur tas kitas pastatas?") },
        { id: "q_room", s: t("Sorry, | which | room?", "Atsiprašau, | kuris | kabinetas?", "Atsiprašau, kuris kabinetas?") },
      ],
    },
    apology: {
      lt: "Atsiprašyti",
      items: [
        { id: "sorry", s: t("I'm | really | sorry.", "Aš | labai | atsiprašau.", "Labai atsiprašau.", { flags: { 0: "“'m” (am): no copula in Lithuanian; the verb atsiprašau carries “be sorry”." } }) },
        { id: "wont_happen", s: t("It | won't happen | again.", "Tai | nepasikartos | daugiau.", "Tai daugiau nepasikartos.") },
        { id: "sorry_trouble", s: t("Sorry | for | the | trouble.", "Atsiprašau | dėl | — | nepatogumų.", "Atsiprašau dėl nepatogumų.") },
      ],
    },
  },

  tips: {
    uk_petrol: { key: "uk_petrol", lt: "Suprasta! Amerikoje sakoma „gas“: I ran out of gas.", better: "I ran out of gas." },
    uk_motorway: { key: "uk_motorway", lt: "Suprasta! Amerikoje sakoma „highway“ arba „freeway“.", better: "There was an accident on the highway." },
    uk_tube: { key: "uk_tube", lt: "Suprasta! Amerikoje metro vadinamas „subway“.", better: "I missed the subway." },
  },

  merges: {
    "what's up": { reason: "lexical_expression", split: "What's → kas yra + up → aukštyn is false; asking why someone calls = kas nutiko.", minimal: "Two words." },
    "all right": { reason: "lexical_expression", split: "all → visi + right → teisingai is false; the discourse marker = gerai.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the quantifier “a little” = truputį.", minimal: "Two words." },
    "didn't go off": { reason: "grammatical_fusion", split: "go → eiti + off → nuo is false; an alarm “goes off” = suskamba; negation is the prefix ne- of nesuskambo and “did” has no word.", minimal: "Subject stays outside." },
    "is delayed": { reason: "lexical_expression", split: "is → yra + delayed → atidėtas is false for transport; a train “is delayed” = vėluoja.", minimal: "Two words." },
    "by the way": { reason: "lexical_expression", split: "by → prie, the → —, way → kelias is false; the discourse marker = beje.", minimal: "All three words form the marker." },
    "to everyone": { reason: "grammatical_fusion", split: "to → į would be false; the dative visiems carries “to”.", minimal: "No adjective or possessive inside." },
    "can't come": { reason: "grammatical_fusion", split: "can't → negalite + come → atvykti: Lithuanian negation is the prefix ne- on the modal; kept as one unit (C-NEG).", minimal: "Subject stays outside." },
    "we'll get started": { reason: "lexical_expression", split: "get → gauti + started → pradėtas is false; “get started” = pradėti; future ending carries “'ll”.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kas skambina", step: "who", optional: true },
    { lt: "Pasakyk, kad vėluoji", done: (c) => !!(c.s.late || c.s.reason || c.s.eta || c.s.cantCome) },
    { lt: "Paaiškink, kodėl vėluoji", step: "reason", optional: true },
    { lt: "Pasakyk, kada būsi", done: (c) => !!(c.s.eta || c.s.etaSkipped || c.s.cantCome) },
    { lt: "Pasakyk, ar pradėti be tavęs", step: "plan", optional: true, when: (c) => !!c.s.planAsk },
  ],

  steps: [
    { id: "opening", done: (c) => !!c.s.opened,
      ask: (c) => {
        if (!c.s.openAsked) { c.s.openAsked = true; c.say(c.s.callerId ? "hello_id" : "hello"); return; }
        c.say("hello_again");
      },
      expects: ["identify", "greet_harris", "late", "reason", "eta", "on_way", "cant_come", "identify_ctx"],
      suggest: [
        { lt: "Pasisveikinti ir pasakyti, kas skambina", hint: "identify" },
        { lt: "Pasakyti, kad vėluoji", hint: "late" },
      ],
      yes: (c) => { c.s.opened = true; },
      no: (c) => { c.s.opened = true; c.s.notOk = true; } },
    { id: "who", when: (c) => !c.s.callerId && !c.s.name, done: (c) => !!c.s.name,
      ask: (c) => { c.say(c.s.whoAsked ? "who_again" : "who"); c.s.whoAsked = true; },
      expects: ["identify", "name_ctx", "identify_ctx"],
      suggest: [{ lt: "Pasakyti, kas skambina", hint: "identify" }] },
    { id: "late", done: (c) => !!(c.s.late || c.s.reason || c.s.eta || c.s.cantCome || c.s.notLate),
      ask: (c) => c.say(c.s.notOk ? "ask_late_wrong" : "ask_late"),
      expects: ["late", "reason", "eta", "cant_come"],
      suggest: [
        { lt: "Pasakyti, kad vėluoji", hint: "late" },
        { lt: "Paaiškinti priežastį", hint: "reason" },
      ] },
    { id: "reason", when: (c) => !!c.s.late && c.s.askReason && !c.s.cantCome, done: (c) => !!c.s.reason || !!c.s.reasonSkipped,
      ask: (c) => c.say("ask_reason"),
      expects: ["reason", "late"],
      suggest: [{ lt: "Paaiškinti, kodėl vėluoji", hint: "reason" }],
      yes: (c) => { c.s.reasonSkipped = true; c.say("ack"); },
      no: (c) => { c.say("ask_reason"); c.hold(); },
      help: (c) => { c.s.reasonSkipped = true; c.say("react_generic"); } },
    { id: "eta", when: (c) => !!c.s.late && !c.s.cantCome, done: (c) => !!c.s.eta || !!c.s.etaSkipped,
      ask: (c) => {
        // which question decides what a bare "Ten." means (etaOf)
        c.s.etaAsk = c.s.etaVague || c.chance(1 / 3) ? "long" : "when";
        c.say(c.s.etaVague ? "ask_eta_vague" : c.s.etaAsk === "long" ? "ask_eta_long" : "ask_eta");
      },
      expects: ["eta", "late", "on_way"],
      suggest: [{ lt: "Pasakyti, kada būsi", hint: "eta" }],
      help: (c) => { c.s.etaSkipped = true; c.say("ok_fine"); } },
    { id: "plan", when: (c) => !!c.s.late && !c.s.cantCome, done: (c) => !!c.s.planned,
      ask: (c) => {
        maybeComplete(c);
        if (c.s.planAsk) {
          c.say("plan_ask");
          c.expect({
            id: "plan_q", expects: ["start_without", "wait_for_me"], hints: ["requests"],
            suggest: [{ lt: "Atsakyti, ar pradėti be tavęs", hint: "requests" }],
            yes: (cc) => planStart(cc),
            no: (cc) => planWait(cc),
            on: {
              start_without: (cc) => planStart(cc),
              wait_for_me: (cc) => planWait(cc),
              save_seat: (cc) => { if (ynLead(cc) === "no") planWait(cc); else planStart(cc); cc.say("ok_seat"); },
              tell_team: (cc) => { planStart(cc); cc.say("ok_tell"); },
            },
            ask: (cc) => cc.say("plan_ask"),
          });
          return;
        }
        c.s.planned = c.s.planWait ? "wait" : "start";
        c.say(c.s.planWait ? "plan_wait" : "plan_start");
        if (c.chance(0.35)) c.say("thanks_letting");
      },
      suggest: [
        { lt: "Paprašyti pradėti be tavęs ar palikti vietą", hint: "requests" },
        { lt: "Atsiprašyti", hint: "apology" },
      ] },
    { id: "room", when: (c) => !!c.s.roomTwist && !!c.s.planned, done: (c) => !!c.s.roomSaid,
      ask: (c) => { roomNews(c); },
      expects: ["confirm_room", "ask_building", "ask_room"],
      suggest: [
        { lt: "Pasitikslinti kabinetą ir pastatą", hint: "room" },
      ] },
  ],

  init: (c) => {
    c.s.callerId = c.chance(0.5);
    c.s.askReason = c.chance(0.8);
    c.s.planAsk = c.chance(0.5);
    c.s.planWait = c.chance(0.4);
    c.s.roomTwist = c.visits >= 1 && c.chance(0.5);
  },

  start: () => { /* the "opening" step answers the phone */ },

  handlers: {
    identify(c, slots) {
      if (!mark(c)) return;
      if (slots.name) c.s.name = slots.name;
      if (!c.s.callerId && c.s.name) sayOnce(c, "name_ack");
      else if (c.s.callerId && c.step === "late" && !c.s.late) sayOnce(c, "yes_hi");
    },
    its_me(c) { if (!mark(c)) return; if (c.s.callerId) { c.s.name = c.s.name || "?"; } },
    identify_ctx(c, slots, seg) { runningLate.handlers.identify(c, slots, seg); },
    name_ctx(c, slots) {
      if (!mark(c)) return;
      if (!slots.name) { c.say("who_again"); c.hold(); return; }
      c.s.name = slots.name;
      sayOnce(c, "name_ack");
    },
    greet_harris(c) { if (!mark(c)) return; },
    is_harris(c) { if (!mark(c)) return; c.say("is_harris"); },
    late(c, slots) {
      if (!mark(c)) return;
      c.s.late = true;
      if (slots.why) doReason(c, slots.why);
      if (typeof slots.number === "number") doEta(c, { number: slots.number, __tags: [] });
      if (slots.eta) doEta(c, slots.eta);
    },
    reason(c, slots) {
      if (!mark(c)) return;
      doReason(c, slots.why);
      if (slots.eta) doEta(c, slots.eta);
    },
    eta(c, slots) {
      if (!mark(c)) return;
      if (slots.eta) doEta(c, slots.eta);
      else if (slots.time) doEta(c, { time: slots.time, __tags: [] });
    },
    on_way(c) {
      if (!mark(c)) return;
      c.s.late = true;
      // ("I'm driving, I have to go.": no question right before the goodbye)
      if (!c.s.eta && !leaving(c)) { c.s.etaVague = true; c.ask("eta"); }
    },
    not_late(c) {
      if (!mark(c)) return;
      if (c.s.late) { c.say("ack"); return; }
      c.s.notLate = true;
      c.say("not_late_resp");
    },
    cant_come(c) {
      if (!mark(c)) return;
      c.say("cant_come_q");
      c.expect({
        id: "cant_q", expects: ["just_late", "late"], hints: ["late"],
        suggest: [{ lt: "Patikslinti: tik vėluoji ar visai negali atvykti", hint: "late" }],
        yes: (cc) => { cc.s.cantCome = true; cc.say("cant_come_ok"); maybeComplete(cc); },
        no: (cc) => { cc.s.late = true; cc.say("just_late"); },
        on: {
          just_late: (cc) => { cc.s.late = true; cc.say("just_late"); },
          late: (cc, sl) => { runningLate.handlers.late(cc, sl, { intent: "late", slots: sl, tags: [] }); },
          reason: (cc, sl) => {
            if (ynLead(cc) === "no") { cc.s.late = true; doReason(cc, sl.why); return; }
            cc.s.cantCome = true; cc.s.reason = reasonOf(sl.why) ?? "generic";
            cc.say(REACT[cc.s.reason as Reason]); cc.say("cant_come_ok"); maybeComplete(cc);
          },
        },
        ask: (cc) => cc.say("cant_come_q"),
      });
    },
    just_late(c) { if (!mark(c)) return; c.s.late = true; c.say("just_late"); },
    start_without(c) { if (!mark(c)) return; c.s.late = true; planStart(c); },
    wait_for_me(c) { if (!mark(c)) return; c.s.late = true; planWait(c); },
    save_seat(c) { if (!mark(c)) return; c.say("ok_seat"); },
    tell_team(c) { if (!mark(c)) return; c.say("ok_tell"); },
    join_online(c) { if (!mark(c)) return; c.say("ok_link"); },
    will_call(c) { if (!mark(c)) return; c.say("ok_call"); },
    apologize(c) {
      if (!mark(c)) return;
      sayOnce(c, /\bagain\b/i.test(c.heard) && /happen/i.test(c.heard) ? "wont_happen_ok" : "sorry_ok", undefined, "apology");
    },
    ask_room(c) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_usual"); return; }
      if (!roomNews(c)) c.say("room_num");
    },
    ask_ok(c) { if (!mark(c)) return; c.say("ok_fine"); },
    confirm_room(c, slots) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_usual"); return; }
      if (typeof slots.number === "number" && slots.number !== 302) c.say("room_wrong");
      else c.say("room_right");
    },
    ask_building(c) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_here"); return; }
      roomNews(c);
      c.say("building");
    },
    // Situation-level versions of two global skills: a phone call ends with Harris's own
    // goodbye (and never re-asks an open question after it), and a bare "Hello!" is answered
    // by the opening step (or, with caller ID, by a short greeting before "What can I do for you?").
    g_bye(c) { bye(c); },
    g_hello(c) {
      if (c.s.callerId && !c.s.opened) { c.s.opened = true; c.say("hi_short"); }
    },
    taxi_ok(c) { if (!mark(c)) return; c.say("good_idea"); },
    thanks_info(c) { if (!mark(c)) return; /* Harris goes on to the goodbye */ },
    thanks_understanding(c) { if (!mark(c)) return; c.say("g_welcome"); },
    bye_meeting(c) { bye(c); },
    help_request(c) { if (!mark(c)) return; c.say("help_yes"); },
    no_help(c) { if (!mark(c)) return; c.say("help_no"); },
  },

  finish: (c) => {
    maybeComplete(c);
    if (c.s.cantCome) c.say("take_care");
    else if (!c.s.notLate) {
      const drive = c.s.reason === "traffic" || c.s.reason === "car";
      if (drive) c.s.driveSaid = true;
      c.say(drive ? "closing_drive" : "closing");
    }
    const closing: Pending = {
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => bye(cc),
        g_bye: (cc) => bye(cc),
        apologize: (cc) => { sayOnce(cc, "sorry_ok", undefined, "apology"); bye(cc); },
        g_ok: (cc) => bye(cc),
        bye_meeting: (cc) => bye(cc),
        thanks_info: (cc) => bye(cc),
        thanks_understanding: (cc) => bye(cc),
        // "How are you?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => bye(cc),
      no: (cc) => bye(cc),
    };
    c.expect(closing);
  },

  tests: [
    { say: "Okay, room three-oh-two. Got it.", intent: "confirm_room", step: "room" },
    { say: "Hi, Mr. Harris, it's Tomas.", intent: "identify", slots: { name: "Tomas" } },
    { say: "Good morning, Mr. Harris. This is Tomas. I'm running late.", intent: "identify" },
    { say: "I'm running late.", intent: "late" },
    { say: "I'm running a little late for the meeting.", intent: "late" },
    { say: "I'm going to be late.", intent: "late" },
    { say: "I'll be about 20 minutes late.", intent: "late", slots: { number: 20 } },
    { say: "I won't make it on time.", intent: "late", not: ["not_late"] },
    { say: "I'm sorry, but I'm running late because I missed the bus.", intent: "late" },
    { say: "I missed the bus.", intent: "reason" },
    { say: "My alarm didn't go off.", intent: "reason", not: ["not_late"] },
    { say: "I'm stuck in traffic.", intent: "reason" },
    { say: "The train is delayed.", intent: "reason" },
    { say: "I overslept, sorry!", intent: "reason" },
    { say: "My car won't start.", intent: "reason" },
    { say: "I ran out of petrol.", intent: "reason" },
    { say: "There was an accident on the motorway.", intent: "reason" },
    { say: "I'll be there in twenty minutes.", intent: "eta" },
    { say: "By 9:30.", intent: "eta", step: "eta" },
    { say: "In about half an hour.", intent: "eta", step: "eta" },
    { say: "Ten minutes.", intent: "eta", step: "eta" },
    { say: "I'm almost there.", intent: "eta" },
    { say: "I'm on my way.", intent: "on_way" },
    { say: "I'm driving.", intent: "on_way" },
    { say: "Maybe fifteen or twenty minutes.", intent: "eta", step: "eta", slots: { eta: { number: 15, n2: 20 } } },
    { say: "Fifteen.", intent: "eta", step: "eta", slots: { eta: { number: 15 } } },
    { say: "Twenty-five.", intent: "eta", step: "eta", slots: { eta: { number: 25 } } },
    { say: "Nine thirty.", intent: "eta", step: "eta", slots: { eta: { time: { h: 9, m: 30 } } } },
    { say: "Please start without me.", intent: "start_without" },
    { say: "Please don't start without me.", intent: "wait_for_me", not: ["start_without"] },
    { say: "Could you save me a seat?", intent: "save_seat" },
    { say: "Could you tell the others?", intent: "tell_team" },
    { say: "I won't be late.", intent: "not_late", not: ["late"] },
    { say: "I'm not late.", intent: "not_late", not: ["late"] },
    { say: "I can't come today.", intent: "cant_come", not: ["late"] },
    { say: "It won't happen again.", intent: "apologize" },
    { say: "I'm so sorry about this.", intent: "apologize" },
    { say: "Which room is the meeting in?", intent: "ask_room" },
    { say: "Is that okay?", intent: "ask_ok" },
    { say: "Okay, room 302. Got it.", intent: "confirm_room" },
    { say: "Tomas", intent: "name_ctx", step: "who" },
    { say: "Tomas", intent: "none" },
    { say: "purple banana telephone", intent: "none" },
    { say: "Could you say that again?", intent: "g_repeat" },
    // more ways to say it (dev corpus: tests/corpus/s90-running-late.json)
    { say: "Hi, Tomas speaking", intent: "identify", slots: { name: "Tomas" } },
    { say: "Hello, sorry, I will come late", intent: "late" },
    { say: "I will be late fifteen minutes", intent: "late", slots: { number: 15 } },
    { say: "Sorry, I'm going to miss the start of the meeting", intent: "late" },
    { say: "There is a big traffic jam", intent: "reason", step: "reason" },
    { say: "There's a lot of snow", intent: "reason", step: "reason" },
    { say: "My kid missed the school bus", intent: "reason", step: "reason" },
    { say: "I forgot my phone at home and went back", intent: "reason" },
    { say: "Give me twenty minutes", intent: "eta", step: "eta" },
    { say: "Not more than ten minutes", intent: "eta", step: "eta" },
    { say: "I hope before 9:20", intent: "eta", step: "eta" },
    { say: "Sure, start without me, I'll catch up", intent: "start_without" },
    { say: "No, I want to be there from the beginning", intent: "wait_for_me" },
    { say: "Please tell the team I'm coming", intent: "tell_team" },
    { say: "Three oh two. Thank you", intent: "confirm_room", step: "room" },
    { say: "Okay, I'll go to room 302", intent: "confirm_room", slots: { number: 302 } },
    { say: "No, it's okay, I called an Uber", intent: "taxi_ok" },
    { say: "Yes, can someone pick me up?", intent: "help_request" },
    { say: "See you at the meeting", intent: "bye_meeting" },
    { say: "Thank you for understanding.", intent: "thanks_understanding" },
    { say: "No, don't wait for me", intent: "start_without", not: ["wait_for_me"] },
    { say: "Don't start without me", intent: "wait_for_me", not: ["start_without"] },
    { say: "I don't need a taxi", intent: "no_help", not: ["taxi_ok"] },
    // leaving the call with a reason (BUG-REVIEW, still open: s90)
    { say: "Sorry, I have to go, I'm driving.", intent: "g_bye", step: "eta" },
    { say: "I have to go, I'm driving.", intent: "g_bye", step: "plan" },
    { say: "Sorry, I need to hang up, I'm driving right now.", intent: "g_bye" },
    { say: "Sorry, I have to go because I have another call.", intent: "g_bye" },
    { say: "I'm driving, I have to go.", intent: "on_way" },
    { say: "I have to go to the office.", intent: "none" },
    { say: "I don't have to go.", intent: "none" },
    // a bare number: the parse keeps the number; the handler reads it by Harris's question (etaOf)
    { say: "Ten.", intent: "eta", step: "eta", slots: { eta: { number: 10 } } },
    { say: "About ten.", intent: "eta", step: "eta", slots: { eta: { number: 10 } } },
    { say: "In ten.", intent: "eta", step: "eta", slots: { eta: { number: 10 } } },
  ],

  sims: [
    // Harris asks why (the reason is scripted) and decides about the meeting himself (the goodbye comes right after the time)
    { name: "happy path", setup: (s) => { s.askReason = true; s.planAsk = false; },
      turns: ["Hi, Mr. Harris, it's Tomas. I'm running late.", "I missed the bus.", "In about twenty minutes.", "Thank you. See you soon!"], expect: { complete: true }, auto: AUTO },
    // "Should we start without you?" on every seed: the apology comes first, then the seat request answers it
    // (an apology at the goodbye ends the call, and the room news would take it on some seeds)
    { name: "all at once", setup: (s) => { s.planAsk = true; s.roomTwist = false; },
      turns: ["Good morning, Mr. Harris. This is Tomas. I'm stuck in traffic, I'll be there by 9:30.", "I'm really sorry. It won't happen again.", "Could you save me a seat?", "Bye!"], expect: { complete: true }, auto: AUTO },
    // no caller ID (Harris asks who's calling), Harris asks why, and "Should we start without you?" gets a short "Yes, please."
    { name: "short answers and questions", setup: (s) => { s.callerId = false; s.askReason = true; s.planAsk = true; },
      turns: ["Hello!", "It's Tomas.", "I'm going to be a little late.", "My alarm didn't go off.", "I'm on my way.", "Ten minutes.", "Which room is the meeting in?", "Yes, please.", "Okay, thanks. Bye!"], expect: { complete: true }, auto: AUTO },
    { name: "car trouble, wait for me", turns: ["Hi, it's Tomas. My car won't start.", "No, it's okay, I'm getting a taxi.", "I'll be there in forty minutes.", "Could you wait for me?", "Thanks, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "hanging up while driving", turns: ["Hi, Mr. Harris, it's Tomas. I'm stuck in traffic.", "In about twenty minutes.", "Please start without me.", "Sorry, I have to go, I'm driving."], expect: { complete: true }, auto: AUTO },
  ],
};

export default runningLate;
