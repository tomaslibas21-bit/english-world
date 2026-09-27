// Song 89 "You're on Mute!": a Monday team video call. Kate (lead) checks that everyone can
// hear her, Paul joins on mute, Kate shares her screen (and sometimes freezes), the learner
// and Sara start talking at the same time, the learner gives a short update and asks a
// question, and the call ends with "Same time next week?".
// Twists (some visits): an echo from the learner's mic, Paul has to jump off early,
// Kate's cat Tiger walks over the keyboard, "your camera's still on!" after the goodbye.
//
// Kate, Paul and Sara are informal (tu). When the learner speaks to the whole group the
// Lithuanian uses the plural (jūs girdite); to one colleague, tu.

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS, expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Tasks for the learner's update

const TASKS: EntityDef[] = [
  ent("report", "report", "ataskaita/ataskaitos/ataskaitai/ataskaitą/ataskaita/ataskaitoje", "f",
    { forms: ["reports", "monthly report", "sales report", "weekly report", "the monthly report"], chip: "ataskaita" }),
  ent("presentation", "presentation", "pristatymas/pristatymo/pristatymui/pristatymą/pristatymu/pristatyme", "m",
    { forms: ["presentations", "powerpoint", "the presentation"], chip: "pristatymas" }),
  ent("slides", "slides", "skaidrės/skaidrių/skaidrėms/skaidres/skaidrėmis/skaidrėse", "f",
    { art: "", forms: ["slide deck", "deck", "the slides"], chip: "skaidrės", attrs: { plural: true } }),
  ent("budget", "budget", "biudžetas/biudžeto/biudžetui/biudžetą/biudžetu/biudžete", "m", { forms: ["budgets"], chip: "biudžetas" }),
  ent("website", "website", "svetainė/svetainės/svetainei/svetainę/svetaine/svetainėje", "f",
    { forms: ["websites", "web site", "site", "web page", "webpage", "the new website"], chip: "svetainė" }),
  ent("schedule", "schedule", "grafikas/grafiko/grafikui/grafiką/grafiku/grafike", "m", { forms: ["schedules", "timeline", "plan for next month"], chip: "grafikas" }),
  ent("newsletter", "newsletter", "naujienlaiškis/naujienlaiškio/naujienlaiškiui/naujienlaiškį/naujienlaiškiu/naujienlaiškyje", "m",
    { forms: ["newsletters", "news letter"], chip: "naujienlaiškis" }),
  ent("proposal", "proposal", "pasiūlymas/pasiūlymo/pasiūlymui/pasiūlymą/pasiūlymu/pasiūlyme", "m", { forms: ["proposals", "offer"], chip: "pasiūlymas" }),
  ent("survey", "survey", "apklausa/apklausos/apklausai/apklausą/apklausa/apklausoje", "f", { forms: ["surveys", "questionnaire", "customer survey"], chip: "apklausa" }),
  ent("spreadsheet", "spreadsheet", "skaičiuoklė/skaičiuoklės/skaičiuoklei/skaičiuoklę/skaičiuokle/skaičiuoklėje", "f",
    { forms: ["spreadsheets", "excel file", "excel sheet", "excel"], chip: "skaičiuoklė" }),
  ent("numbers", "sales | numbers", "pardavimų | skaičiai/skaičių/skaičiams/skaičius/skaičiais/skaičiuose", "m",
    { art: "", forms: ["numbers", "sales figures", "figures", "the numbers"], chip: "pardavimų skaičiai", attrs: { plural: true } }),
  ent("app", "app", "programėlė/programėlės/programėlei/programėlę/programėle/programėlėje", "f", { forms: ["apps", "application", "mobile app"], chip: "programėlė" }),
  ent("contract", "contract", "sutartis/sutarties/sutarčiai/sutartį/sutartimi/sutartyje", "f", { forms: ["contracts"], chip: "sutartis" }),
  ent("design", "design", "dizainas/dizaino/dizainui/dizainą/dizainu/dizaine", "m", { forms: ["designs", "logo", "the new design"], chip: "dizainas" }),
  ent("invoices", "invoices", "sąskaitos/sąskaitų/sąskaitoms/sąskaitas/sąskaitomis/sąskaitose", "f",
    { art: "", forms: ["invoice", "bills"], chip: "sąskaitos", attrs: { plural: true } }),
  ent("training", "training | plan", "mokymų | planas/plano/planui/planą/planu/plane", "m", { forms: ["training", "onboarding plan", "training program"], chip: "mokymų planas" }),
  ent("campaign", "marketing | campaign", "rinkodaros | kampanija/kampanijos/kampanijai/kampaniją/kampanija/kampanijoje", "f",
    { forms: ["campaign", "marketing plan", "ad campaign"], chip: "rinkodaros kampanija" }),
];
const byTask = (id: string) => TASKS.find((e) => e.id === id)!;
/** Bind a task; plural nouns (slides, invoices) need plural agreement in Lithuanian. */
const taskVar = (id: string) => ({ id, qty: byTask(id).attrs?.plural ? 2 : 1 });

// ---------------------------------------------------------------------------
// Helpers

const F_CAN_P = "“Can” with a verb of perception: Lithuanian needs no modal; ar marks the question and the verb carries “can”.";
const F_CAN_S = "“can” with a verb of perception has no Lithuanian word; the verb carries it.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_DO_Q = "Question “Do” = the particle ar.";
const F_DO_WH = "Question “do” has no Lithuanian word; the tense sits on manai (linked to “think”).";
const F_PROG = "Progressive “are”: the present tense of the verb carries it.";

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let t = turnIds.get(c); if (t === undefined) { t = ++turnSeq; turnIds.set(c, t); } return `${t}:${c.heard}`; };
const K = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("kate"); c.say(line, vars); };
const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("paul"); c.say(line, vars); };
const S = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("sara"); c.say(line, vars); };
/** Kate's bare "Okay." — skipped when someone already reacted to this utterance (one answer can be
 *  split into several segments of the same intent). */
const ack = (c: Ctx) => { if (c.s.__spokeFor === turn(c) && c.heard) return; K(c, "ok"); };
const live = (c: Ctx) => !c.s.ended;
/** True the first time per utterance for this key (several segments may trigger the same reaction). */
const once = (c: Ctx, key: string) => { const t = turn(c); if (c.s["__once_" + key] === t) return false; c.s["__once_" + key] = t; return true; };
/** Checklist items the learner skips by leaving the call early are hidden, not failed. */
const stay = (c: Ctx) => !c.s.leftEarly && !c.s.leaving;
/** The learner says they have to leave the call ("Sorry, I have to go."). */
const leavingNow = (c: Ctx) => /\b(have to|need to|must|got to|gotta)\s+(go|leave|jump off|drop off|hop off|run|log off|sign off|hang up)\b/i.test(c.heard || "");
const byePaul = (c: Ctx) => { if (!once(c, "byePaul")) return; K(c, "bye_paul_kate"); P(c, "paul_bye"); };
const camLaugh = (c: Ctx) => { if (once(c, "camLaugh")) S(c, "sara_laugh"); c.end(); };

/** The whole team says goodbye; the call ends (optionally with the camera twist). */
function goodbye(c: Ctx) {
  if (c.s.ended) return;
  c.s.ended = true;
  if (!c.s.closingSaid) c.s.leftEarly = true; // the checklist hides what was skipped
  c.s.updOpen = false;
  K(c, "bye_kate"); P(c, "paul_bye"); S(c, "sara_bye");
  c.complete();
  if (c.s.camStillOn) {
    c.twist("camera_still_on");
    S(c, "sara_cam_on");
    c.expect({
      id: "cam_still", optional: true, hints: ["oops"], suggest: [{ lt: "Sureaguoti ir atsijungti", hint: "oops" }],
      on: { oops: (cc) => camLaugh(cc), g_bye: (cc) => camLaugh(cc), g_thanks: (cc) => camLaugh(cc), bye_all: (cc) => camLaugh(cc), mute_self: (cc) => camLaugh(cc) },
      yes: (cc) => camLaugh(cc),
      no: (cc) => camLaugh(cc),
    });
    c.hold();
    return;
  }
  c.hold();
  c.end();
}

type Upd = "done" | "working" | "behind" | "ok" | "nothing";

function react(c: Ctx, kind: Upd, task?: string) {
  if (task) c.s.task = task;
  c.s.update = kind;
  c.s.updOpen = false;
  if (kind === "ok" && !c.s.task) {
    K(c, "upd_ok_resp");
    c.s.updOpen = true;
    c.expect({
      id: "what_task", expects: ["task_ctx", "upd_working", "upd_done", "upd_behind"], hints: ["update"],
      suggest: [{ lt: "Pasakyti, prie ko dirbi", hint: "task", options: "task" }],
      on: {
        task_ctx: (cc, sl) => react(cc, "working", sl.task),
        upd_working: (cc, sl) => react(cc, "working", sl.task),
        upd_done: (cc, sl) => react(cc, "done", sl.task),
        upd_behind: (cc, sl) => react(cc, "behind", sl.task),
      },
      ask: (cc) => K(cc, "what_task_reask"),
    });
    return;
  }
  if (kind === "nothing" || kind === "ok") { K(c, "upd_nothing_resp"); return; }
  const X = taskVar(c.s.task);
  if (kind === "done") {
    K(c, "upd_done_resp", { X });
    c.s.updOpen = true;
    c.expect({
      id: "send_q", optional: true, hints: ["sure"], expects: ["will_send", "cant_send"],
      suggest: [{ lt: "Sutikti atsiųsti", hint: "sure" }],
      yes: (cc) => { cc.s.updOpen = false; K(cc, "send_yes"); },
      no: (cc) => { cc.s.updOpen = false; K(cc, "send_no"); },
      on: { will_send: (cc) => { cc.s.updOpen = false; K(cc, "send_yes"); }, cant_send: (cc) => { cc.s.updOpen = false; K(cc, "send_no"); } },
    });
    return;
  }
  K(c, kind === "behind" ? "upd_behind_resp" : "upd_work_resp", { X });
  c.s.updOpen = true;
  c.expect({
    id: "when_q", expects: ["when_ans", "unsure"], hints: ["when"],
    suggest: [{ lt: "Pasakyti, kada bus paruošta", hint: "when" }],
    on: {
      when_ans: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      g_dontknow: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      unsure: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
    },
    ask: (cc) => K(cc, "when_reask", { X }),
  });
}

/** Paul sometimes offers to help when the learner is behind. */
function afterWhen(c: Ctx) {
  if (c.s.update === "behind" && c.s.paulHelps && !c.s.paulLeft) {
    P(c, "paul_help");
    c.expect({
      id: "help_offer", optional: true, expects: ["accept_help"], hints: ["g_yesno"],
      suggest: [{ lt: "Priimti pagalbą", hint: "g_yesno" }],
      yes: (cc) => P(cc, "paul_talk_later"),
      no: (cc) => P(cc, "paul_ok_short"),
      on: { accept_help: (cc) => P(cc, "paul_talk_later"), g_thanks: (cc) => P(cc, "paul_talk_later") },
    });
  }
}

const AUTO: Record<string, string> = {
  hear: "Yes, I can hear you.",
  hear2: "Yes, I can hear you now.",
  weekend: "It was great, thanks!",
  camera: "Oh, sorry! Can you see me now?",
  mute: "Paul, you're on mute!",
  paul_hear: "Yes, we can hear you now!",
  screen: "Yes, I can see it.",
  screen2: "Yes, I can see it now.",
  echo: "Oh, sorry! Is that better?",
  freeze: "Kate, you're breaking up.",
  freeze_q: "Yes, we can hear you now.",
  first: "I can go first.",
  goahead: "No, you go ahead!",
  update: "I finished the report.",
  what_task: "The report.",
  send_q: "Sure!",
  when_q: "By Friday.",
  help_offer: "That would be great, thanks!",
  paul_leave: "No problem! Bye, Paul!",
  questions: "Could you send us the slides?",
  anything_else: "No, that's all.",
  cat: "Hi, Tiger!",
  next_week: "Sounds good! Bye, everyone!",
  cam_still: "Oops! Bye!",
};

// ---------------------------------------------------------------------------

export const videoCall: SituationDef = {
  id: "s89-video-call",
  song: 89,
  songTitle: "You're on Mute!",
  title: { en: "You're on Mute!", lt: "Tavo mikrofonas išjungtas!" },
  topic: { en: "A video call", lt: "Vaizdo skambutis" },
  chapter: 4,
  order: 3,
  location: "phone",
  npc: "kate",
  npcs: ["paul", "sara"],
  mode: "video",
  goal: "Dalyvauk komandos vaizdo skambutyje ir padėk kolegoms su technika.",
  intro: "Pirmadienis, 10 val. Prisijungi prie „Brightline“ komandos vaizdo skambučio iš namų. Susitikimą veda Keitė, dalyvauja Paulas ir Sara. Padėk kolegoms su technika, trumpai papasakok, kaip sekasi, ir paklausk, ko reikia.",
  entities: { task: TASKS },

  grammar: {
    macros: {
      paul: "[paul | hey paul | oh paul]",
      kate: "[kate | hey kate | oh kate]",
      team: "(everyone | everybody | all | guys | team | you guys | folks)",
      tdet: "[the | my | our | this | that | a | an] [new | monthly | weekly | final | client | sales | marketing | quarterly | big | first]",
      // "now I'm working on…", "this week I finished…"
      upd_pre: "[now | right now | at the moment | this week | today | last week | yesterday | so | well | okay so]",
      done_v: "(finished | completed | sent | submitted | done | wrote | uploaded | fixed | made | prepared | created | checked | updated | planned | organized | delivered | published | launched | closed | signed)",
      snd: "(sound | audio | voice | mic | microphone | connection | internet | video)",
    },
    slots: {
      whenr: { pattern: [
        "[by | on | before | around] {day} [morning | afternoon | evening]",
        "[by | before | at] the end of (the | this | next) (week | month | day)",
        "(in | within) (a few | a couple of | {number}) (days | weeks)",
        "(today | tonight | later today | this afternoon | soon | very soon | in a few days)",
        "[by] (tomorrow | friday | monday) [at the latest]",
      ] },
    },
  },

  intents: {
    hear_yes: { patterns: [
      "[yes] [i | we] can hear you [fine | okay | well | perfectly | now | loud and clear] #h:h_yes",
      "[yes] (loud and clear | perfectly | all good | i hear you [fine]) #h:h_loud",
      "[yes] we can [hear you] #h:h_morning",
      "[yes] i can (hear | see) you and (hear | see) you [too]",
      "[yes] i can hear and see you",
      "[yes] (i | we) can hear you (now | again) #h:ph_yes",
      "[yes] (you are | it is | that is) (fine | good | clear | better | much better | loud and clear) [now]",
      "[yes] (much | a lot) better",
      "[yes] (everything | all) is (fine | okay | good | perfect | working) [here]", "[yes] (the | your) @snd is (good | fine | okay | clear | perfect | great) [now]",
      "[yes] (perfect | great | good | fine | okay | all good) [now]", "[yes] now it is (okay | fine | good | better | perfect | much better)", "now yes",
      "[yes] (a (little | bit) | much | way) better [now]", "[yes] you are back", "[yes] all (okay | ok | good | fine | clear)", "[yes] (welcome | hi | hello) [paul]", "[yes] [now] it works [now]",
      "[yes] i can (hear | see) you [and (hear | see) you] [very]? (well | good | fine | okay | clearly)", "[yes] i hear you (good | well | fine | okay)",
    ] },
    hear_no: { patterns: [
      "[no] i can not hear you [very well | at all | now] #h:h_cant",
      "[sorry] you are (a bit | a little | very | really | too | kind of) quiet #h:h_quiet #quiet",
      "[sorry] i can [only] (hear | barely hear) you but (not very well | you are [a bit | very | really | kind of | too] quiet) #quiet",
      "[no] (not very well | barely | not really) #quiet",
      "[sorry] (you are | it is) (breaking up | choppy) #quiet",
      "[no] still (nothing | not) [sorry] #h:ph_no",
      "[no] (we | i) still can not hear (you | him | anything)",
      "[no] (nothing | not) yet",
      "[sorry] (you are | your voice is | the sound is | your sound is | it is | the audio is) [a bit | a little | very | really | too | kind of | still] (quiet | low | bad | not good | not clear)",
      "[sorry] (you are | your @snd is | the @snd is | it is) [still] (breaking | breaking up | choppy | cutting out | bad | terrible)",
      "i can see you but i can not hear you", "i [can] hear you but [you are | it is] [a | a little | little | a bit | a little bit | little bit] (quiet | low | bad)", "there is no (sound | audio)", "[no] i (do not | can not) hear (anything | you) [at all]",
      "(can | could) you (speak | talk) (louder | up | a bit louder | a little louder | more loudly)", "[no] still [a bit | very | too] (quiet | bad | the same)", "still no",
      "[not really] you are still (breaking up | frozen | quiet | choppy)",
    ] },
    greet_team: { patterns: [
      "[hi | hello | hey | morning | good morning] (kate | @team | paul | sara)",
      "(hi | hello | hey | morning | good morning) (kate | @team | paul | sara) (and | ) (kate | @team | paul | sara)",
    ] },
    ask_hear_me: { patterns: [
      "can (you | everyone | everybody) (hear | see) me [okay | now | all right] #h:q_hear_me",
      "can you hear me and see me",
      "is my (camera | mic | microphone | video) (on | working | okay)",
      "am i (on mute | muted)",
    ] },
    cam_fixed: { patterns: [
      "[oh] [sorry] can you see me now #h:cam_see_now",
      "[oh] [sorry] i (turned | switched) it on",
      "[sorry] there we go",
      "[sorry] (now it is on | it is on now | it is on)", "now you can see me", "(can | do) you see me now", "[sorry] there you go", "[sorry] is (it | the camera) (on | working) now",
    ] },
    better_q: { patterns: ["[oh] [sorry] is (that | this | it) better [now] #h:e_sorry", "[oh] [sorry] how about now", "(and | what about) now", "[is it] better now"] },
    // a bare "Now?" right after fixing the mic or the camera
    better_now_ctx: { patterns: ["now"] },
    cam_fix_ctx: { patterns: [
      "[oh] sorry [about that]", "oops [sorry]", "[oh] my bad", "[oh] (let me | i will) turn it on", "[sorry] one (second | sec | moment) #h:cam_second",
      "[sorry] i forgot [to turn it on | about it | my camera | about the camera]", "[wait a (moment | second)] i am (turning | switching) it on [now]",
      "[oh] i did not know [sorry]", "(let me | i will) fix (it | that)", "[sorry] i (turn | switch) [it] on [now]", "[sorry] (just | wait) a (second | moment | minute)", "[oh] (sorry | oops) i will turn on my (camera | video)",
    ] },
    cam_broken: { patterns: [
      "[sorry] my (camera | webcam) (is not working | does not work | is broken) [today] #h:cam_broken",
      "[sorry] i can not turn on my (camera | video)",
      "[sorry] i do not have a (camera | webcam)",
      "[sorry] i (do not | don't) have a (camera | webcam) [on (this | my) (computer | laptop)]", "[sorry] my (internet | connection | wifi | wi fi) is (slow | bad | weak) [today] [i will keep (the | my) camera off]",
      "i will keep (the | my) (camera | video) off [today]", "[sorry] i can not (turn on | switch on | find) my (camera | video)",
    ] },
    tell_mute: { patterns: [
      "@paul you are (on mute | muted) [paul] #h:m_on_mute",
      "@paul i think you are [still] (on mute | muted) [paul] #h:m_think",
      "@paul you are still (on mute | muted) [paul]",
      "@paul (click | press | tap) (the | your) (microphone | mic | mute) [button | icon] #h:m_click",
      "@paul you need to unmute [yourself] #h:m_unmute",
      "@paul unmute [yourself] [paul]",
      "@paul (turn on | switch on) your (microphone | mic)",
      "@paul your (microphone | mic) is (off | muted | red)",
      "paul mute",
      "[i think] (paul | he) is [still] (on mute | muted)", "@paul check your (microphone | mic | sound | audio)", "@paul (click | press | tap) [on] (the | your) [red] (microphone | mic | mute) [button | icon]",
      "[maybe] (pauls | his) (microphone | mic) is (off | muted | not on)", "@paul (turn on | switch on) (your | the) (microphone | mic | sound | audio)",
      "@paul [i think] your (microphone | mic) is (off | muted | not on)", "@paul (your | the) (microphone | mic) [paul]", "@paul (microphone | mic | mute) [button]",
    ] },
    tell_mute_ctx: { patterns: ["@paul we can not hear you [paul] [at all] #h:m_cant_hear", "@paul (can you hear us | are you there)", "we can not hear paul", "i can not hear paul", "@paul (we | i) (do not | can not | don't) hear you [at all]"] },
    not_muted: { patterns: ["@paul you are not (on mute | muted)", "he is not (on mute | muted)", "i can hear (him | paul) [fine]"] },
    screen_yes: { patterns: [
      "[yes] (i | we) can see (it | your screen | the slides | the presentation | the screen) [fine | clearly | perfectly | now] #h:s_yes",
      "[yes] (i | we) can see it #h:s_yes_we",
      "[yes] (it is | that is) clear [now]",
      "[yes] (it works | looks good | i see it | we see it)",
      "[yes] we can see your screen #h:s_yes_we",
      "[yes] now (i | we) can see (it | your screen | the slides)",
      "[yes] (i | we) can see it now",
      "[yes] (everything | all | it) is (okay | fine | good | perfect)", "[yes] (i | we) see (it | your screen | the slides | the presentation | the screen) [now | clearly]", "[yes] now i see it",
    ] },
    screen_no: { patterns: [
      "[no] (i | we) can not see (it | your screen | anything | the slides | the screen) [yet] #h:s_no",
      "[no] (i | we) can only see your (face | camera | video) #h:s_face",
      "[no] (it is | the screen is) (black | blank | empty)",
      "[no] (not yet | nothing yet)",
      "[no] it is still loading #h:s_loading",
      "[no] i can not see anything [yet]",
      "[no] [sorry] (i | we) [only] see (a | the)? (black | white | blank | empty) screen", "[no] [sorry] i see only (your camera | your face | a black screen | a white screen | you)",
      "[no] it is [still] loading", "[no] (i | we) (do not | don't) see (it | anything | nothing | your screen | the slides) [yet]",
    ] },
    screen_small: { patterns: ["it is (a bit | a little | too | very | kind of) small #h:s_small", "(can | could) you (zoom in | make it bigger)", "i can not read it", "the text is (too | very | a bit) small", "the (letters | text | font | numbers) (is | are) (too | very | a bit | a little) small", "is (too | very | a bit | a little) small", "(can | could) you make (it | the text) (bigger | larger)"] },
    tell_freeze: { patterns: [
      "@kate you are breaking up [kate] #h:f_breaking",
      "@kate you froze [kate] #h:f_froze",
      "@kate you are frozen",
      "@kate your (video | screen | picture) (froze | is frozen)",
      "@kate we lost you [for a (second | moment | minute)] #h:f_lost",
      "@kate i think (you froze | we lost you | your connection is bad)",
      "@kate your (connection | internet | wifi | wi fi) is (bad | not good | terrible)",
      "@kate you are (glitching | lagging)",
      "@kate your (video | screen | picture | camera) (stopped | is stuck | froze)", "@kate you (disappeared | are gone)", "(the | your) (picture | video | screen | image) is frozen",
      "@kate your (internet | connection | wifi | wi fi) is (bad | slow | not good)",
    ] },
    tell_freeze_ctx: { patterns: ["@kate (are you there | can you hear us | hello)", "@kate we can not hear you", "[sorry] (you | kate) (stopped | are stuck)", "@kate (i | we) can not hear you [kate]", "hello kate", "[kate] (we | i) (do not | can not | don't) hear [you | anything] [kate]", "kate are you (still)? there"] },
    volunteer: { patterns: [
      "i can go first #h:go_first",
      "i (will | can) (go | start) [first]",
      "i will start #h:ill_start",
      "let me (go | start) [first]", "(can | could | may) i (go | start) first",
      "(me | me first)",
      "sure i (will | can) (go | start) [first]",
      "i do not mind going first",
      "i do not mind [i (can | will) (start | go [first])]", "i would like to (start | go first | begin)", "i (will | can) be first", "i am ready [i can (start | go [first])]",
      "[okay] i (will | can) go", "me i will go first", "i can (start | begin) [if you want]",
    ] },
    defer: { patterns: [
      "sara [you] (go | can go) first #h:sara_first",
      "sara can (go first | start)",
      "(you | sara) (go | start) first [sara]",
      "after you [sara]",
      "you first [sara]",
      "sara [please] you (start | go first | go)", "[maybe] paul [can go] first", "i (do not | don't) want to (go | start | be) first", "not me [please] [sara (can go | go) first]", "(you | sara) can (start | go first) [sara]", "ladies first", "let sara (go first | start)",
    ] },
    go_ahead: { patterns: [
      "[no] [sorry] (you | sara) go ahead [sara] #h:no_you_go",
      "[no] [sorry] go ahead [sara] #h:sorry_go",
      "[no] after you [sara]",
      "[no] you first [sara]",
      "[no] you start [sara]",
      "[no] [no] (you | sara) go first", "[sorry] sara you first", "(it is okay | no problem) you (can)? (start | go [first | ahead])",
    ] },
    thanks_sara: { patterns: ["[okay] thanks sara", "thank you sara"] },
    upd_done: { patterns: [
      "i [have] (finished | completed | sent | submitted | done | wrote | uploaded | fixed) @tdet {task} [yesterday | last week | on friday | this morning | already] #h:u_finished",
      "@tdet {task} (is | are) (done | finished | ready | complete | all done) [now | already]",
      "i am (done | finished) with @tdet {task}",
      "i (got | have got) @tdet {task} done",
      "i sent @tdet {task} to (you | the client | everyone) [yesterday]",
      "@upd_pre i [have | already] @done_v @tdet {task} [yesterday | last week | on friday | this morning | already]",
      "i did @tdet {task} (already | yesterday | last week | this morning | on friday | today)",
    ] },
    upd_working: { patterns: [
      "i am [still] working on @tdet {task} [right now | now | this week | today] #h:u_working",
      "i am (almost | nearly) (done | finished) with @tdet {task} #h:u_almost",
      "@tdet {task} (is | are) (almost | nearly) (done | ready | finished)",
      "i am (writing | preparing | finishing | updating | making | doing | fixing | checking | planning) @tdet {task}",
      "i am halfway through @tdet {task}",
      "i (started | have started) @tdet {task}",
      "i am busy with @tdet {task}",
      "@tdet {task} will be (ready | done | finished) [by | on] [{day}] #h:u_ready",
      "i will finish @tdet {task} [by | on] [{day}] #h:u_ready",
      "@upd_pre i am [still] working on @tdet {task} [right now | now | this week | today | for (next | this) (month | week | quarter | year)]", "@upd_pre i (worked | was working) on @tdet {task}",
      "@upd_pre i am (writing | preparing | finishing | updating | making | doing | fixing | checking | planning | creating) @tdet {task}",
    ] },
    upd_behind: { patterns: [
      "i (have not | did not) (finished | finish | started | start | sent | send | done | do) @tdet {task} [yet]",
      "@tdet {task} (is not | are not) (ready | done | finished) [yet]",
      "i am (a bit | a little | slightly | kind of | really) behind (with | on) @tdet {task} #h:u_behind",
      "i am behind (with | on) @tdet {task}",
      "i need more time (for | with) @tdet {task}",
      "i am having (problems | trouble | some problems | some trouble) with @tdet {task}",
      "i am [a bit | a little | slightly | kind of | really] late (with | on) @tdet {task}", "i have (some | a few)? (problems | trouble | issues) with @tdet {task}",
    ] },
    upd_ok: { patterns: [
      "(everything | it | things) (is | are) (going (well | fine | great | okay) | on track | good | fine) #h:u_track",
      "(all good | so far so good | no problems)",
      "it is going (well | fine | great | okay) [so far]",
    ] },
    upd_nothing: { patterns: ["(not much | nothing) (new | to report) [this week | today]", "nothing new [from me]", "not much [really]", "not much to (say | report | tell) [this week] [all good]"] },
    // "Sure, I'll send it right after the call" (answer to "Could you send me the report?")
    cant_send: { patterns: ["[sorry] i (can not | can't) send (it | them | the report) [today | now | right now | after the call]", "[sorry] (it is | the report is) not (ready | finished) [yet]"] },
    will_send: { patterns: ["[sure | of course | yes | okay] i will send (it | them | the report | it to you) [to you] [after the call | today | right after | later | right after the call]", "[sure | yes] right after the call", "[yes] i will email (it | them) [to you]", "i (already)? sent (it | them) [to you] [yesterday | this morning | already]"] },
    // "Yes, one question: …"
    have_question: { patterns: ["[yes] [i have] (one | a) [quick] question", "[yes] just one question"] },
    task_ctx: { patterns: ["[it is] @tdet {task}", "[mostly] @tdet {task}"] },
    when_ans: { patterns: [
      "[maybe | probably | hopefully | i think | i hope] [it will be (ready | done) | i will finish it | i can finish it | it should be (ready | done)] {whenr} #h:w_when",
    ] },
    unsure: { patterns: ["[i am] not sure [yet] #h:w_unsure", "i do not know [yet]", "no idea [yet]", "(it is | that is) hard to say", "i will let you know"] },
    help_ask: { patterns: [
      "(could | can) (someone | anyone | you | somebody) help me with @tdet {task}",
      "i (need | could use) (some | a little) help with @tdet {task}",
      "(could | can) (someone | anyone | somebody) help me",
    ] },
    accept_help: { patterns: ["(that | it) would be great [thanks]", "[yes] that would be (great | nice | awesome) [thanks] [paul]", "[sure] thanks paul", "[yes] i would love that"] },
    q_slides: { patterns: [
      "(could | can) you send (us | me) the (slides | presentation | deck) [after the call] #h:q_slides",
      "can i get (the slides | a copy of the slides)",
      "will you share the (slides | presentation)",
      "send us the slides #blunt",
      "(could | can | will) you (send | share) (us | me)? (the | your) (slides | presentation | deck) [after the (call | meeting) | later | with us]", "(could | can) you put the (slides | presentation) in the chat",
      "where (can | do) i find the (slides | presentation)",
    ] },
    q_link: { patterns: [
      "(could | can) you (share | send | post) the link #h:q_link",
      "(could | can) you put the link in the chat",
      "where is the link",
    ] },
    q_deadline: { patterns: ["when is the deadline #h:q_deadline", "what is the deadline", "when is it due", "when do you need it", "when do you need (it | the report | this | @tdet {task})", "when is the deadline for @tdet {task}"] },
    q_next: { patterns: ["when is the next meeting", "is it the same time next week", "when do we meet again", "when is (the | our) next (meeting | call)"] },
    q_back: { patterns: [
      "(could | can) you go back to the (last | previous) slide #h:q_back",
      "go back one slide",
      "(could | can) you show the (last | previous) slide again",
      "(could | can) you go back (one | a) slide", "(can | could) (i | we) see the (last | previous) slide [again]", "(can | could) you show (the numbers | that | it | the chart) again",
    ] },
    q_record: { patterns: ["is (this | the) (call | meeting) (being recorded | recorded)", "(will | could) you (share | send) the recording"] },
    no_questions: { patterns: [
      "no questions [from me] #h:q_none",
      "[no] not from me",
      "[no] (nope | no) all clear",
      "[no] (it is | that is | everything is) (all | ) clear",
      "i do not have any questions",
      "[no] that is all [from me]",
      "[no] nothing (from me | else) [for now]", "i have no questions", "(that is | it is) (it | all) from me", "[no] i am (good | fine | okay)", "[no] everything is clear",
    ] },
    // #leaving, as the shared "I have to go" (global.ts): only leaving when nothing but thanks or a goodbye
    // follows, so "I have to go to work" is no goodbye ("to work" is not the tails "too" + "works")
    leave: { patterns: [
      "#leaving [sorry] i have to (jump off | go now | leave | drop off | hop off | run) [now] #h:jump_off",
      "#leaving [sorry] i have to jump off i have another (call | meeting) at {time}",
      "[sorry] i have (another | a) (call | meeting) at {time}",
      "#leaving [sorry] i need to (leave | jump off | go now) #h:need_leave",
      // "Sorry, I have to go.", "I have to leave early today.", "I need to log off.", "…, I'm driving."
      "#leaving [sorry] [i am afraid] i (have to | need to | must | got to | have got to | will have to) (go | leave | jump off | drop off | hop off | run | log off | sign off | hang up) [now | right now | early | a bit early | a little early] [today] [@leaving_why]",
      "#leaving [sorry] i (have to | need to | must) leave (the call | the meeting) [early | now]",
      "[sorry] (can | could | may) i (leave | jump off | drop off | log off) [now | early | a bit early]",
      "#leaving [sorry] i (have to | need to) (go | leave | jump off) [now] i have (another | a) (call | meeting) [at {time}]",
    ] },
    next_week_yes: { patterns: ["[yes] same time next week", "[yes] (sounds good | works for me | perfect) [see you (then | next week)]", "[yes | sure] same time", "[yes] i will be there", "[yes] see you (then | next week) [same time]"] },
    on_vacation: { patterns: [
      "[actually] i am on vacation next week #h:b_vacation",
      "[actually] i am on holiday next week #tip:us_vacation",
      "[actually] i will be on (vacation | holiday) next week",
      "[actually] i can not (make it | come | join) next week",
      "[actually] i am off next week",
      "next week i am (on vacation | on holiday #tip:us_vacation | off | away | not here)", "i can not [make it] next week [i am (on vacation | on holiday #tip:us_vacation | off | away)]",
    ] },
    bye_all: { patterns: [
      "(bye | goodbye | see you | see you next week | talk to you later | take care | bye bye) [@team | kate] #h:b_bye",
      "have a (good | nice | great) (day | week) [@team]",
      "thanks @team [bye]",
    ] },
    bye_paul: { patterns: ["(bye | see you | take care | bye bye) paul #h:pl_bye", "no problem [bye paul]", "(bye | see you | take care) paul have a (good | nice | great) (call | meeting | day)", "good luck [with (your | the) (call | meeting)] [paul]",
      "[no problem | okay | sure | of course] (see you later | see you soon | talk to you later | catch you later | later) paul"] },
    hi_tiger: { patterns: ["(hi | hello | hey) tiger #h:c_hi"] },
    cute: { patterns: ["(he is | she is | it is) (so | very | really) cute #h:c_cute", "what a cute cat", "i love (cats | your cat)", "is that your cat"] },
    oops: { patterns: ["oops [sorry] [bye | goodbye | bye bye]", "oh no", "[oops] thanks [for telling me]", "(ha ha | haha | ha) [thanks] [bye]", "i am turning it off [now]", "i will turn it off [now]", "thanks for telling me"] },
    mute_self: { patterns: [
      "[oh] [sorry] [i will | let me] mute [myself | it] #h:e_mute", "sorry that is me", "(i | i have) muted [myself | it]", "sure i will mute it",
      "[sorry] i will (turn off | switch off | mute) (my | the) (microphone | mic | sound)", "[sorry] (done | it is done)", "[okay] i muted my (mic | microphone)",
      "[sorry] i will (use | put on) (my)? (headphones | headset | earphones)",
    ] },
    weekend_ans_ctx: { patterns: [
      "[it was] [very | really | so | pretty] (great | good | nice | fine | okay | relaxing | fun | lovely | wonderful | amazing | pretty good | not bad | quiet | pretty quiet | busy | sunny | nice and sunny | warm) [thanks | thank you] [and (you | yours) | how about (you | yours) | how was yours | what about (you | yours) | thank you for asking] #good #h:we_great",
      "i was (at | in) {w:any} #good", "we (had | went | stayed | visited | watched | played | cooked | made) {w:any} #good",
      "i (was | got) (sick | ill) [all weekend] #bad", "i (was working | worked) all weekend #bad", "[busy] i (had to | needed to) work [all weekend] #bad", "[busy] i (had to | needed to) go to work [on (saturday | sunday) | all weekend | on the weekend] #bad", "it (rained | was raining | was rainy | was cold) [all weekend] #bad",
      "[it was] (too short | boring | terrible | awful | not great | not so good | bad) [thanks] [as (always | usual)] [and (you | yours) | how about you | how was yours] #bad #h:we_short",
      "i (went | stayed | visited | watched | played | cooked | read | cleaned | worked | slept) {w:any} #good",
      "i went (hiking | swimming | shopping | fishing | camping | running | to the beach | to the park | to the movies) #good",
    ] },
  },

  lines: {
    open: [
      t("Hi, | everyone! | Can | you | hear | me | okay?", "Labas | visiems! | Ar | jūs | girdite | mane | gerai?", "Labas visiems! Ar gerai mane girdite?", { flags: { 2: F_CAN_P } }),
      t("Morning, | everyone! | Can | everyone | hear | me?", "Labas rytas | visiems! | Ar | visi | girdi | mane?", "Labas rytas visiems! Ar visi mane girdi?", { flags: { 2: F_CAN_P } }),
      t("Hi! | Can | you | hear | me? | Can | you | see | me?", "Labas! | Ar | jūs | girdite | mane? | Ar | jūs | matote | mane?", "Labas! Ar mane girdite? Ar matote?", { flags: { 1: F_CAN_P, 5: F_CAN_P } }),
    ],
    hear_reask: [
      t("Can | you | hear | me | now?", "Ar | jūs | girdite | mane | dabar?", "Ar dabar mane girdite?", { flags: { 0: F_CAN_P } }),
    ],
    hear_ok: [
      t("Great!", "Puiku!", "Puiku!"),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    mic_fix: [
      t("Hmm, | let | me | check | my | mic. | How about | now?", "Hmm, | leiskite | man | patikrinti | savo | mikrofoną. | O | dabar?", "Hmm, tuoj patikrinsiu mikrofoną. O dabar?"),
    ],
    quiet_fix: [
      t("Oh, | sorry! | Is | this | better?", "Oi, | atsiprašau! | Ar | taip | geriau?", "Oi, atsiprašau! Ar taip geriau?", { flags: { 2: F_IS_Q } }),
    ],
    heard_you: [
      t("Yes, | we | can | hear | you!", "Taip, | mes | — | girdime | tave!", "Taip, girdime tave!", { flags: { 2: F_CAN_S } }),
    ],
    heard_but_cam: [
      t("Yes, | we | can | hear | you, | but | your | camera's | off.", "Taip, | mes | — | girdime | tave, | bet | tavo | kamera yra | išjungta.", "Taip, girdime, bet tavo kamera išjungta.", { flags: { 2: F_CAN_S } }),
    ],
    two_minutes: [
      t("Let's give | it | two more | minutes. | A | few | people | are | still | joining.", "Duokime | tam | dar dvi | minutes. | — | Keli | žmonės | — | dar | jungiasi.", "Palaukime dar dvi minutes – keli žmonės dar jungiasi.", { flags: { 7: F_PROG } }),
    ],
    weekend_q: [
      t("So, | how | was | your | weekend?", "Tai | kaip | praėjo | tavo | savaitgalis?", "Tai kaip praėjo savaitgalis?"),
    ],
    weekend_good: [
      t("Oh, | nice!", "O, | šaunu!", "O, šaunu!"),
      t("That | sounds | lovely!", "Tai | skamba | puikiai!", "Skamba puikiai!"),
    ],
    weekend_bad: [
      t("Oh, | I'm | sorry. | Well, | it's | a | new | week!", "O, | man | gaila. | Na, | tai yra | — | nauja | savaitė!", "O, gaila. Na, prasideda nauja savaitė!"),
    ],
    weekend_mine: [
      t("Mine | was | nice, | thanks! | We | went | to | the | beach.", "Mano | buvo | puikus, | ačiū! | Mes | nuvažiavome | į | — | paplūdimį.", "Mano puikus, ačiū! Buvome paplūdimyje."),
    ],
    sara_join: [
      t("Hi, | everyone! | Sorry | I'm | late!", "Labas | visiems! | Atsiprašau, | kad aš | vėluoju!", "Labas visiems! Atsiprašau, kad vėluoju!",
        { flags: { 3: "“I'm”: Lithuanian needs a kad-clause; the present tense of vėluoju carries “am … late”." } }),
    ],
    camera_off: [
      t("Oh, | your | camera's | off.", "O, | tavo | kamera yra | išjungta.", "O, tavo kamera išjungta."),
    ],
    camera_on: [
      t("There you are!", "Štai ir tu!", "Štai ir tu!"),
      t("Yes! | There you are!", "Taip! | Štai ir tu!", "Taip! Štai ir tu!"),
    ],
    camera_broken: [
      t("No | worries, | we | can | hear | you.", "Jokių | rūpesčių, | mes | — | girdime | tave.", "Nieko tokio, mes tave girdime.", { flags: { 3: F_CAN_S } }),
    ],
    paul_join: [
      t("Oh, | here's | Paul! | Hi, | Paul!", "O, | štai | Paulas! | Labas, | Paulai!", "O, štai ir Paulas! Labas, Paulai!"),
    ],
    paul_silent: [
      t("Paul? | Paul... | we | can't hear | you | at all.", "Paulai? | Paulai... | mes | negirdime | tavęs | visai.", "Paulai? Paulai... mes tavęs visai negirdime."),
    ],
    not_muted_resp: [
      t("Hmm, | I | think | he | is. | His | microphone | is | red.", "Hmm, | aš | manau, | jis | [nutildytas]. | Jo | mikrofonas | yra | raudonas.", "Hmm, manau, kad jis nutildytas. Jo mikrofonas raudonas.",
        { flags: { 4: "Elliptical “is” (he is on mute): Lithuanian repeats the predicate nutildytas." } }),
    ],
    paul_unmuted: [
      t("Oh, | sorry! | Can | you | hear | me | now?", "Oi, | atsiprašau! | Ar | jūs | girdite | mane | dabar?", "Oi, atsiprašau! Ar dabar mane girdite?", { flags: { 2: F_CAN_P } }),
    ],
    paul_reask: [
      t("Can | you | hear | me | now?", "Ar | jūs | girdite | mane | dabar?", "Ar dabar mane girdite?", { flags: { 0: F_CAN_P } }),
    ],
    paul_ok: [
      t("Great. | Sorry | about | that, | guys!", "Puiku. | Atsiprašau | dėl | to, | draugai!", "Puiku. Atsiprašau, draugai!"),
    ],
    paul_ok_short: [
      t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, nieko tokio."),
    ],
    paul_now: [
      t("What about | now?", "O | dabar?", "O dabar?"),
    ],
    sara_mute: [
      t("Paul, | you're | on mute!", "Paulai, | tu esi | nutildytas!", "Paulai, tavo mikrofonas išjungtas!"),
    ],
    screen_share: [
      t("Okay, | let's get started. | I'm going | to share | my | screen.", "Gerai, | pradėkime. | Aš ketinu | pasidalinti | savo | ekranu.", "Gerai, pradėkime. Pasidalinsiu savo ekranu."),
    ],
    screen_q: [
      t("Can | everyone | see | my | screen?", "Ar | visi | mato | mano | ekraną?", "Ar visi mato mano ekraną?", { flags: { 0: F_CAN_P } }),
      t("Can | you | all | see | it?", "Ar | jūs | visi | matote | jį?", "Ar visi jį matote?", { flags: { 0: F_CAN_P } }),
    ],
    screen_retry: [
      t("Hmm, | let | me | try | again. | How about | now?", "Hmm, | leiskite | man | pabandyti | dar kartą. | O | dabar?", "Hmm, pabandysiu dar kartą. O dabar?"),
    ],
    screen_reask: [
      t("Can | you | see | it | now?", "Ar | jūs | matote | jį | dabar?", "Ar dabar matote?", { flags: { 0: F_CAN_P } }),
    ],
    screen_bigger: [
      t("Sure, | let | me | make | it | bigger. | Is | that | better?", "Žinoma, | leiskite | man | padaryti | jį | didesnį. | Ar | taip | geriau?", "Žinoma, padidinsiu. Ar taip geriau?", { flags: { 6: F_IS_Q } }),
    ],
    present: [
      t("So, | this | month | our | sales | are | up | ten | percent.", "Taigi, | šį | mėnesį | mūsų | pardavimai | yra | išaugę | dešimt | procentų.", "Taigi, šį mėnesį mūsų pardavimai išaugo dešimčia procentų."),
    ],
    great_work: [
      t("Great | work, | everyone!", "Puikus | darbas, | visi!", "Puikiai padirbėjote!"),
    ],
    freeze_line: [
      t("So, | this | month | our | sales | are... | are...", "Taigi, | šį | mėnesį | mūsų | pardavimai | yra... | yra...", "Taigi, šį mėnesį mūsų pardavimai... pardavimai..."),
    ],
    sara_froze: [
      t("Kate, | you | froze!", "Keite, | tu | sustingai!", "Keite, tu sustingai!"),
    ],
    freeze_fix: [
      t("Sorry | about | that! | My | Wi-Fi | is | terrible | today. | Can | you | hear | me | now?", "Atsiprašau | dėl | to! | Mano | „Wi-Fi“ | yra | baisus | šiandien. | Ar | jūs | girdite | mane | dabar?", "Atsiprašau! Šiandien baisus internetas. Ar dabar mane girdite?",
        { flags: { 8: F_CAN_P } }),
    ],
    freeze_where: [
      t("Okay, | where | was | I?", "Gerai, | kur | buvau | aš?", "Gerai, kur aš sustojau?"),
    ],
    sara_echo: [
      t("Hmm, | there's | an | echo.", "Hmm, | yra | — | aidas.", "Hmm, girdisi aidas."),
    ],
    echo_you: [
      t("I | think | it's | your | mic.", "Aš | manau, | tai yra | tavo | mikrofonas.", "Manau, tai tavo mikrofonas."),
    ],
    echo_mute: [
      t("Could | you | mute | it | when | you're | not talking?", "Ar galėtum | tu | išjungti | jį, | kai | tu | nekalbi?", "Ar galėtum jį išjungti, kai nekalbi?", { flags: { 5: F_PROG } }),
    ],
    echo_ok: [
      t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
    ],
    first_ask: [
      t("Okay, | quick | updates. | Who | wants | to go | first?", "Gerai, | trumpos | naujienos. | Kas | nori | kalbėti | pirmas?", "Gerai, trumpai apie naujienas. Kas nori pirmas?"),
    ],
    first_go: [
      t("Great, | go ahead!", "Puiku, | kalbėk!", "Puiku, kalbėk!"),
    ],
    sara_start: [
      t("I | can | start...", "Aš | galiu | pradėti...", "Aš galiu pradėti..."),
    ],
    sara_sorry: [
      t("Oh, | sorry! | You | go ahead.", "Oi, | atsiprašau! | Tu | kalbėk.", "Oi, atsiprašau! Kalbėk tu."),
    ],
    sara_go: [
      t("Go ahead!", "Kalbėk!", "Kalbėk!"),
    ],
    sara_update: [
      t("Thanks! | So, | I | finished | the | client | survey, | and | now | I'm working | on | the | report.", "Ačiū! | Taigi, | aš | baigiau | — | klientų | apklausą, | ir | dabar | dirbu | prie | — | ataskaitos.", "Ačiū! Taigi, baigiau klientų apklausą, o dabar dirbu prie ataskaitos."),
    ],
    after_sara: [
      t("Thanks, | Sara! | And | you?", "Ačiū, | Sara! | O | tu?", "Ačiū, Sara! O tu?"),
    ],
    upd_ask: [
      t("So, | how's | it | going | with | your | project?", "Tai | kaip | — | sekasi | su | tavo | projektu?", "Tai kaip sekasi su tavo projektu?",
        { flags: { 1: "“'s” (is): progressive auxiliary; the present tense of sekasi carries it.", 2: "Dummy “it”: no Lithuanian word (sekasi is impersonal)." } }),
      t("Can | you | give | us | a | quick | update?", "Ar gali | tu | pateikti | mums | — | trumpą | informaciją?", "Gal gali trumpai papasakoti, kaip sekasi?"),
      t("What | are | you | working on | these | days?", "Prie ko | — | tu | dirbi | šiomis | dienomis?", "Prie ko dirbi šiomis dienomis?", { flags: { 1: F_PROG } }),
    ],
    upd_done_resp: [
      t("Great job! | Could | you | send | me | {X.the} | after | the | call?", "Puikiai padirbėta! | Ar galėtum | tu | atsiųsti | man | {X.the:acc} | po | — | skambučio?", "Puikiai padirbėta! Ar galėtum atsiųsti man {X.the:acc} po skambučio?"),
    ],
    upd_work_resp: [
      t("Sounds | good. | When | do | you | think | {X.the} | will be | ready?", "Skamba | gerai. | Kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?", "Gerai. Kada, tavo manymu, {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 3: F_DO_WH } }),
    ],
    upd_behind_resp: [
      t("No | worries. | When | do | you | think | {X.the} | will be | ready?", "Jokių | rūpesčių. | Kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?", "Nieko tokio. Kada, tavo manymu, {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 3: F_DO_WH } }),
    ],
    upd_ok_resp: [
      t("Good | to hear! | What | are | you | working on | right now?", "Gera | girdėti! | Prie ko | — | tu | dirbi | šiuo metu?", "Gera girdėti! Prie ko dabar dirbi?", { flags: { 3: F_PROG } }),
    ],
    when_reask: [
      t("So, | when | do | you | think | {X.the} | will be | ready?", "Tai | kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?", "Tai kada, tavo manymu, {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 2: F_DO_WH } }),
    ],
    what_task_reask: [
      t("So, | what | are | you | working on | right now?", "Tai | prie ko | — | tu | dirbi | šiuo metu?", "Tai prie ko dabar dirbi?", { flags: { 2: F_PROG } }),
    ],
    upd_nothing_resp: [
      t("Okay, | no | worries.", "Gerai, | jokių | rūpesčių.", "Gerai, nieko tokio."),
    ],
    when_ok: [
      t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
      t("Okay, | great. | Just | keep | me | posted.", "Gerai, | puiku. | Tiesiog | — | mane | informuok.", "Gerai, puiku. Tiesiog informuok mane.",
        { flags: { 3: "“keep … posted” = informuoti: the verb stands under “posted”." } }),
    ],
    when_unsure: [
      t("That's | okay. | Just | keep | me | posted.", "Tai yra | gerai. | Tiesiog | — | mane | informuok.", "Nieko tokio. Tiesiog informuok mane.",
        { flags: { 3: "“keep … posted” = informuoti: the verb stands under “posted”." } }),
    ],
    send_yes: [
      t("Thanks!", "Ačiū!", "Ačiū!"),
      t("Awesome, | thank | you!", "Puiku, | dėkoju | tau!", "Puiku, ačiū!"),
    ],
    send_no: [
      t("No | problem, | whenever | you | can.", "Jokių | problemų, | kai tik | tu | galėsi.", "Jokių problemų, kai tik galėsi."),
    ],
    paul_help: [
      t("I | can | help | with | that | if | you | want.", "Aš | galiu | padėti | su | tuo, | jei | tu | nori.", "Jei nori, galiu padėti."),
    ],
    paul_talk_later: [
      t("Cool, | let's talk | after | the | call.", "Šaunu, | pasikalbėkime | po | — | skambučio.", "Šaunu, pasikalbėkime po skambučio."),
    ],
    paul_help_sure: [
      t("Sure, | I | can | help. | Let's talk | after | the | call.", "Žinoma, | aš | galiu | padėti. | Pasikalbėkime | po | — | skambučio.", "Žinoma, galiu padėti. Pasikalbėkime po skambučio."),
    ],
    paul_leave: [
      t("Sorry, | guys, | I | have | to jump off. | I | have | another | call | at 11.", "Atsiprašau, | draugai, | aš | turiu | atsijungti. | Aš | turiu | kitą | skambutį | vienuoliktą.", "Atsiprašau, draugai, turiu atsijungti – vienuoliktą turiu kitą skambutį.",
        { say: "Sorry, guys, I have to jump off. I have another call at eleven." }),
    ],
    bye_paul_kate: [
      t("Bye, | Paul!", "Iki, | Paulai!", "Iki, Paulai!"),
    ],
    paul_bye: [
      t("See you!", "Iki!", "Iki!"),
      t("Bye, | guys!", "Iki, | draugai!", "Iki, draugai!"),
    ],
    questions_ask: [
      t("Great. | Does | anyone | have | any | questions?", "Puiku. | Ar | kas nors | turi | kokių nors | klausimų?", "Puiku. Ar kas nors turi klausimų?", { flags: { 1: F_DO_Q } }),
      t("Okay. | Any | questions?", "Gerai. | Kokių nors | klausimų?", "Gerai. Klausimų?"),
    ],
    qa_slides: [
      t("Of course! | I'll send | them | after | the | call.", "Žinoma! | Atsiųsiu | jas | po | — | skambučio.", "Žinoma! Atsiųsiu jas po skambučio."),
    ],
    qa_link: [
      t("Sure, | I'll put | the | link | in the chat.", "Žinoma, | įdėsiu | — | nuorodą | į pokalbį.", "Žinoma, įdėsiu nuorodą į pokalbio langą."),
    ],
    qa_deadline: [
      t("The | deadline | is | Friday.", "— | Terminas | yra | penktadienis.", "Terminas – penktadienis."),
    ],
    qa_next: [
      t("Same | time | next | week.", "Tuo pačiu | laiku | kitą | savaitę.", "Tuo pačiu laiku kitą savaitę."),
    ],
    qa_back: [
      t("Sure. | Here | it | is.", "Žinoma. | Štai | ji | —.", "Žinoma. Štai ji.", { flags: { 3: "“is”: štai needs no copula." } }),
    ],
    qa_record: [
      t("Yes, | I'll send | you | the | recording.", "Taip, | atsiųsiu | tau | — | įrašą.", "Taip, atsiųsiu tau įrašą."),
    ],
    qa_none: [
      t("Great.", "Puiku.", "Puiku."),
      t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku."),
    ],
    anything_else: [
      t("Anything | else?", "Kas nors | dar?", "Dar kas nors?"),
    ],
    sara_cat: [
      t("Kate, | is | that | a | cat?", "Keite, | ar | tai | — | katė?", "Keite, ar čia katė?", { flags: { 1: F_IS_Q } }),
    ],
    cat_resp: [
      t("Oh, | yes! | That's | Tiger. | He | loves | my | keyboard.", "O, | taip! | Tai yra | Tigras. | Jis | dievina | mano | klaviatūrą.", "O, taip! Tai Tigras. Jis dievina mano klaviatūrą."),
    ],
    cat_hi: [
      t("Ha! | He | says | hi!", "Cha! | Jis | sako | labas!", "Cha! Jis sako „labas“!"),
    ],
    paul_hi_tiger: [
      t("Hi, | Tiger!", "Labas, | Tigrai!", "Labas, Tigrai!"),
    ],
    closing: [
      t("Okay, | that's | all | for today. | Thanks, | everyone! | Same | time | next | week?", "Gerai, | tai yra | viskas | šiandienai. | Ačiū | visiems! | Tuo pačiu | laiku | kitą | savaitę?", "Gerai, šiandien tiek. Ačiū visiems! Tuo pačiu laiku kitą savaitę?"),
    ],
    vacation_ok: [
      t("Oh, | no | problem! | I'll send | you | the | notes.", "O, | jokių | problemų! | Atsiųsiu | tau | — | užrašus.", "O, jokių problemų! Atsiųsiu tau užrašus."),
    ],
    leave_ok: [
      t("No | problem! | Thanks | for | joining.", "Jokių | problemų! | Ačiū, | kad | prisijungei.", "Jokių problemų! Ačiū, kad prisijungei."),
    ],
    // after the quick update the learner gave on the way out
    leave_update_ok: [
      t("Great, | thanks | for | the | update!", "Puiku, | ačiū | už | — | naujienas!", "Puiku, ačiū, kad papasakojai!"),
    ],
    leave_first: [
      t("No | problem! | But | first, | a | quick | update?", "Jokių | problemų! | Bet | pirma, | — | trumpai | papasakok?", "Jokių problemų! Bet pirma – trumpai, kaip sekasi?",
        { flags: { 6: "“update”: the verb papasakok (tell) carries it; trumpai = quick." } }),
    ],
    bye_kate: [
      t("Bye, | everyone!", "Iki | visiems!", "Iki visiems!"),
      t("See you | next | week!", "Iki | kitos | savaitės!", "Iki kitos savaitės!"),
    ],
    sara_bye: [
      t("Bye!", "Iki!", "Iki!"),
    ],
    sara_cam_on: [
      t("Um... | your | camera's | still | on!", "Ee... | tavo | kamera yra | vis dar | įjungta!", "Ee... tavo kamera vis dar įjungta!"),
    ],
    sara_laugh: [
      t("Ha! | No | worries. | Bye!", "Cha! | Jokių | rūpesčių. | Iki!", "Cha! Nieko tokio. Iki!"),
    ],
    much_better: [
      t("Yes, | much | better!", "Taip, | daug | geriau!", "Taip, daug geriau!"),
    ],
    ok: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Sure.", "Žinoma.", "Žinoma."),
    ],
  },

  hints: {
    hear: {
      lt: "Atsakyti, ar girdi Keitę",
      items: [
        { id: "h_yes", s: t("Yes, | I | can | hear | you.", "Taip, | aš | — | girdžiu | tave.", "Taip, girdžiu tave.", { flags: { 2: F_CAN_S } }) },
        { id: "h_loud", s: t("Yes, | loud and clear!", "Taip, | labai aiškiai!", "Taip, puikiai girdžiu!") },
        { id: "h_morning", s: t("Morning, | Kate! | Yes, | we | can.", "Labas rytas, | Keite! | Taip, | mes | [girdime].", "Labas rytas, Keite! Taip, girdime.",
          { flags: { 4: "Elliptical “can” (we can hear you): Lithuanian repeats the verb girdime." } }) },
        { id: "h_quiet", s: t("Sorry, | you're | a | bit | quiet.", "Atsiprašau, | tu esi | — | truputį | tyli.", "Atsiprašau, tave girdžiu labai tyliai.") },
        { id: "h_cant", s: t("Sorry, | I | can't hear | you.", "Atsiprašau, | aš | negirdžiu | tavęs.", "Atsiprašau, negirdžiu tavęs.") },
        { id: "q_hear_me", s: t("Can | you | hear | me?", "Ar | jūs | girdite | mane?", "Ar mane girdite?", { flags: { 0: F_CAN_P } }) },
      ],
    },
    hear_now: {
      lt: "Atsakyti, ar dabar girdi",
      items: [
        { id: "ph_yes", s: t("Yes, | I | can | hear | you | now.", "Taip, | aš | — | girdžiu | tave | dabar.", "Taip, dabar girdžiu.", { flags: { 2: F_CAN_S } }) },
        { id: "h_loud", s: t("Yes, | loud and clear!", "Taip, | labai aiškiai!", "Taip, puikiai girdžiu!") },
        { id: "h_better", s: t("Yes, | much | better.", "Taip, | daug | geriau.", "Taip, daug geriau.") },
      ],
    },
    camera: {
      lt: "Įsijungti kamerą arba paaiškinti",
      items: [
        { id: "cam_see_now", s: t("Oh, | sorry! | Can | you | see | me | now?", "Oi, | atsiprašau! | Ar | jūs | matote | mane | dabar?", "Oi, atsiprašau! Ar dabar mane matote?", { flags: { 2: F_CAN_P } }) },
        { id: "cam_broken", s: t("Sorry, | my | camera | isn't working.", "Atsiprašau, | mano | kamera | neveikia.", "Atsiprašau, neveikia mano kamera.") },
        { id: "cam_second", s: t("One | second, | please.", "Vieną | sekundę, | prašau.", "Sekundėlę.") },
      ],
    },
    mute: {
      lt: "Pasakyti Paului, kad jo mikrofonas išjungtas",
      items: [
        { id: "m_on_mute", s: t("Paul, | you're | on mute!", "Paulai, | tu esi | nutildytas!", "Paulai, tavo mikrofonas išjungtas!") },
        { id: "m_cant_hear", s: t("Paul, | we | can't hear | you.", "Paulai, | mes | negirdime | tavęs.", "Paulai, mes tavęs negirdime.") },
        { id: "m_click", s: t("Click | the | microphone | button!", "Spausk | — | mikrofono | mygtuką!", "Spausk mikrofono mygtuką!") },
        { id: "m_think", s: t("I | think | you're | muted.", "Aš | manau, | tu esi | nutildytas.", "Manau, tavo mikrofonas išjungtas.") },
        { id: "m_unmute", s: t("Paul, | you | need | to unmute.", "Paulai, | tau | reikia | įsijungti mikrofoną.", "Paulai, įsijunk mikrofoną.") },
      ],
    },
    paul_hear: {
      lt: "Atsakyti Paului, ar dabar jį girdi",
      items: [
        { id: "ph_yes", s: t("Yes, | we | can | hear | you | now!", "Taip, | mes | — | girdime | tave | dabar!", "Taip, dabar girdime!", { flags: { 2: F_CAN_S } }) },
        { id: "h_loud", s: t("Yes, | loud and clear!", "Taip, | labai aiškiai!", "Taip, puikiai girdime!") },
        { id: "ph_no", s: t("No, | still | nothing.", "Ne, | vis dar | nieko.", "Ne, vis dar nieko negirdėti.") },
      ],
    },
    screen: {
      lt: "Atsakyti, ar matai ekraną",
      items: [
        { id: "s_yes", s: t("Yes, | I | can | see | it.", "Taip, | aš | — | matau | jį.", "Taip, matau.", { flags: { 2: F_CAN_S } }) },
        { id: "s_yes_we", s: t("Yes, | we | can | see | your | screen.", "Taip, | mes | — | matome | tavo | ekraną.", "Taip, matome tavo ekraną.", { flags: { 2: F_CAN_S } }) },
        { id: "s_face", s: t("No, | I | can | only | see | your | face.", "Ne, | aš | — | tik | matau | tavo | veidą.", "Ne, matau tik tavo veidą.", { flags: { 2: F_CAN_S } }) },
        { id: "s_loading", s: t("It's | still | loading.", "Jis | dar | kraunasi.", "Dar kraunasi.", { flags: { 0: "“'s” (is) is progressive: the present tense of kraunasi carries it." } }) },
        { id: "s_small", s: t("It's | a | bit | small.", "Jis yra | — | truputį | mažas.", "Truputį per mažas.") },
      ],
    },
    freeze: {
      lt: "Pasakyti Keitei, kad ryšys trūkinėja",
      items: [
        { id: "f_breaking", s: t("Kate, | you're breaking up.", "Keite, | tu trūkinėji.", "Keite, tavo ryšys trūkinėja.") },
        { id: "f_froze", s: t("Sorry, | you | froze.", "Atsiprašau, | tu | sustingai.", "Atsiprašau, tavo vaizdas sustingo.") },
        { id: "f_lost", s: t("We | lost | you | for a second.", "Mes | praradome | tave | akimirkai.", "Akimirkai tave praradome.") },
      ],
    },
    echo: {
      lt: "Išsijungti mikrofoną",
      items: [
        { id: "e_sorry", s: t("Oh, | sorry! | Is | that | better?", "Oi, | atsiprašau! | Ar | taip | geriau?", "Oi, atsiprašau! Ar dabar geriau?", { flags: { 2: F_IS_Q } }) },
        { id: "e_mute", s: t("Sure, | I'll mute | it.", "Žinoma, | išjungsiu | jį.", "Žinoma, išjungsiu mikrofoną.") },
      ],
    },
    first: {
      lt: "Pasisiūlyti pradėti arba užleisti eilę",
      items: [
        { id: "go_first", s: t("I | can | go | first.", "Aš | galiu | kalbėti | {m:pirmas|f:pirma}.", "Galiu kalbėti {m:pirmas|f:pirma}.") },
        { id: "ill_start", s: t("I'll start.", "Pradėsiu.", "Pradėsiu.") },
        { id: "sara_first", s: t("Sara, | you | go | first.", "Sara, | tu | kalbėk | pirma.", "Sara, kalbėk tu pirma.") },
        { id: "sorry_go", s: t("Sorry, | go ahead!", "Atsiprašau, | kalbėk!", "Atsiprašau, kalbėk!") },
        { id: "no_you_go", s: t("No, | you | go ahead!", "Ne, | tu | kalbėk!", "Ne, kalbėk tu!") },
      ],
    },
    goahead: {
      lt: "Padėkoti arba užleisti eilę Sarai",
      items: [
        { id: "thanks_sara", s: t("Thanks, | Sara!", "Ačiū, | Sara!", "Ačiū, Sara!") },
        { id: "no_you_go", s: t("No, | you | go ahead!", "Ne, | tu | kalbėk!", "Ne, kalbėk tu!") },
        { id: "sorry_go", s: t("Sorry, | go ahead!", "Atsiprašau, | kalbėk!", "Atsiprašau, kalbėk!") },
      ],
    },
    update: {
      lt: "Papasakoti trumpai, kaip sekasi darbas", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "u_finished", s: t("I | finished | {X.the}.", "Aš | baigiau | {X.the:acc}.", "Baigiau {X.the:acc}.") },
        { id: "u_working", s: t("I'm working | on | {X.the}.", "Aš dirbu | prie | {X.the:gen}.", "Dirbu prie {X.the:gen}.") },
        { id: "u_almost", s: t("I'm | almost | done | with | {X.the}.", "Aš esu | beveik | {m:baigęs|f:baigusi} | — | {X.the:acc}.", "Beveik baigiau {X.the:acc}.",
          { flags: { 3: "“with”: the accusative after baigęs carries it." } }) },
        { id: "u_ready", s: t("I'll finish | {X.the} | by | Friday.", "Baigsiu | {X.the:acc} | iki | penktadienio.", "Baigsiu {X.the:acc} iki penktadienio.") },
        { id: "u_behind", s: t("I'm | a | bit | behind | with | {X.the}.", "Aš | — | truputį | vėluoju | su | {X.the:ins}.", "Truputį vėluoju su {X.the:ins}.",
          { flags: { 0: "“'m” (am): no copula; the verb vėluoju carries “be behind”." } }) },
        { id: "u_track", s: t("Everything's | on track.", "Viskas yra | pagal planą.", "Viskas vyksta pagal planą.") },
      ],
    },
    task: {
      lt: "Pasakyti, prie ko dirbi", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "t_task", s: t("{X.the}.", "{X.the:nom}.", "{X:nom}.") },
        { id: "u_working", s: t("I'm working | on | {X.the}.", "Aš dirbu | prie | {X.the:gen}.", "Dirbu prie {X.the:gen}.") },
      ],
    },
    sure: {
      lt: "Sutikti",
      items: [
        { id: "sure", s: t("Sure!", "Žinoma!", "Žinoma!") },
        { id: "sure", s: t("Of course!", "Žinoma!", "Žinoma!") },
      ],
    },
    when: {
      lt: "Pasakyti, kada bus paruošta",
      items: [
        { id: "w_when", s: t("By | Friday.", "Iki | penktadienio.", "Iki penktadienio.") },
        { id: "w_when", s: t("Tomorrow | morning.", "Rytoj | ryte.", "Rytoj ryte.") },
        { id: "w_when", s: t("Next | week.", "Kitą | savaitę.", "Kitą savaitę.") },
        { id: "w_unsure", s: t("I'm | not | sure | yet.", "Aš | nesu | {m:tikras|f:tikra} | dar.", "Dar nežinau.",
          { flags: { 1: "The copula of “I'm” takes the negation in Lithuanian: nesu stands under “not”." } }) },
      ],
    },
    questions: {
      lt: "Paklausti ko nors arba pasakyti, kad klausimų nėra",
      items: [
        { id: "q_slides", s: t("Could | you | send | us | the | slides?", "Ar galėtum | tu | atsiųsti | mums | — | skaidres?", "Ar galėtum atsiųsti mums skaidres?") },
        { id: "q_link", s: t("Could | you | share | the | link?", "Ar galėtum | tu | pasidalinti | — | nuoroda?", "Ar galėtum pasidalinti nuoroda?") },
        { id: "q_deadline", s: t("When's | the | deadline?", "Kada yra | — | terminas?", "Koks terminas?") },
        { id: "q_back", s: t("Could | you | go | back | to | the | last | slide?", "Ar galėtum | tu | grįžti | atgal | į | — | ankstesnę | skaidrę?", "Ar galėtum grįžti į ankstesnę skaidrę?") },
        { id: "q_none", s: t("No | questions | from | me.", "Jokių | klausimų | iš | manęs.", "Klausimų neturiu.") },
      ],
    },
    no_more: {
      lt: "Pasakyti, kad daugiau klausimų nėra",
      items: [
        { id: "q_none", s: t("No, | that's | all.", "Ne, | tai yra | viskas.", "Ne, tai viskas.") },
        { id: "no_thanks", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
        { id: "q_none", s: t("No | questions | from | me.", "Jokių | klausimų | iš | manęs.", "Klausimų neturiu.") },
      ],
    },
    leave: {
      lt: "Atsiprašyti ir atsijungti anksčiau",
      items: [
        { id: "jump_off", s: t("Sorry, | I | have | to jump off. | I | have | another | call | at 11.", "Atsiprašau, | aš | turiu | atsijungti. | Aš | turiu | kitą | skambutį | vienuoliktą.", "Atsiprašau, turiu atsijungti – vienuoliktą turiu kitą skambutį.",
          { say: "Sorry, I have to jump off. I have another call at eleven." }) },
        { id: "need_leave", s: t("Sorry, | I | need | to leave.", "Atsiprašau, | man | reikia | atsijungti.", "Atsiprašau, man reikia atsijungti.") },
      ],
    },
    bye: {
      lt: "Atsisveikinti",
      items: [
        { id: "b_bye", s: t("Sounds | good! | Bye, | everyone!", "Skamba | gerai! | Iki | visiems!", "Puiku! Iki visiems!") },
        { id: "b_bye", s: t("See you | next | week!", "Iki | kitos | savaitės!", "Iki kitos savaitės!") },
        { id: "b_vacation", s: t("Actually, | I'm | on vacation | next | week.", "Tiesą sakant, | aš esu | atostogose | kitą | savaitę.", "Tiesą sakant, kitą savaitę atostogauju.") },
      ],
    },
    paul_leave: {
      lt: "Atsisveikinti su Paulu",
      items: [
        { id: "pl_bye", s: t("Bye, | Paul!", "Iki, | Paulai!", "Iki, Paulai!") },
        { id: "pl_bye", s: t("No | problem! | Bye, | Paul!", "Jokių | problemų! | Iki, | Paulai!", "Nieko tokio! Iki, Paulai!") },
      ],
    },
    weekend: {
      lt: "Papasakoti apie savaitgalį",
      items: [
        { id: "we_great", s: t("It | was | great, | thanks!", "Jis | buvo | puikus, | ačiū!", "Puikiai, ačiū!") },
        { id: "we_great", s: t("Pretty | quiet. | And | yours?", "Gana | ramus. | O | tavo?", "Gana ramus. O tavo?") },
        { id: "we_short", s: t("Too | short!", "Per | trumpas!", "Per trumpas!") },
        { id: "we_great", s: t("It | was | great, | thanks! | I | went | hiking.", "Jis | buvo | puikus, | ačiū! | Aš | ėjau | į žygį.", "Puikiai, ačiū! Buvau žygyje.") },
      ],
    },
    oops: {
      lt: "Sureaguoti ir atsijungti",
      items: [
        { id: "oops", s: t("Oops! | Bye!", "Oi! | Iki!", "Oi! Iki!") },
        { id: "oops", s: t("Oops, | thanks! | Bye!", "Oi, | ačiū! | Iki!", "Oi, ačiū! Iki!") },
      ],
    },
    cat: {
      lt: "Pasisveikinti su katinu",
      items: [
        { id: "c_hi", s: t("Hi, | Tiger!", "Labas, | Tigrai!", "Labas, Tigrai!") },
        { id: "c_cute", s: t("He's | so | cute!", "Jis yra | toks | mielas!", "Jis toks mielas!") },
      ],
    },
  },

  tips: {
    us_vacation: { key: "us_vacation", lt: "Suprasta! Amerikoje sakoma „vacation“: I'm on vacation next week.", better: "I'm on vacation next week." },
  },

  merges: {
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie is a calque; asking again (how about now?) = o …?", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is a calque; = o …?", minimal: "Two words." },
    "let's give": { reason: "grammatical_fusion", split: "Let's → leiskime + give → duoti is a calque; the first person plural imperative duokime carries “let's”.", minimal: "Object stays outside." },
    "two more": { reason: "lexical_expression", split: "two → dvi + more → daugiau gives “dvi daugiau”; additive “more” after a numeral = dar (dar dvi).", minimal: "Two words." },
    "let's get started": { reason: "lexical_expression", split: "Let's → leiskime, get → gauti, started → pradėtas is false; = pradėkime.", minimal: "Three words." },
    "there you are": { reason: "lexical_expression", split: "there → ten, you → tu, are → esi is a literal “you are there”; greeting someone who appears = štai ir tu.", minimal: "Three words." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is literal; inviting someone to speak = kalbėk.", minimal: "Two words." },
    "working on": { reason: "lexical_expression", split: "working → dirbantis + on → ant is false; “work on X” = dirbti (prie X).", minimal: "Two words." },
    "great job": { reason: "lexical_expression", split: "great → puikus + job → darbas (vieta) is false; praise = puikiai padirbėta.", minimal: "Two words." },
    "to jump off": { reason: "lexical_expression", split: "jump → šokti + off → nuo is false; leaving a call = atsijungti (C-INF + C-PHR).", minimal: "Three words." },
    "at 11": { reason: "grammatical_fusion", split: "The accusative of time vienuoliktą carries “at” (C-CASE).", minimal: "Two words." },
    "you're breaking up": { reason: "lexical_expression", split: "You're → tu esi, breaking → lūžtantis, up → aukštyn is false; on a call = tu trūkinėji (C-PROG + C-PHR).", minimal: "Subject, auxiliary and particle form the expression." },
    "on mute": { reason: "lexical_expression", split: "on → ant + mute → nebylus is false; a microphone “on mute” = nutildytas.", minimal: "Two words." },
    "loud and clear": { reason: "lexical_expression", split: "loud → garsiai, and → ir, clear → aiškiai is close but the fixed reply means “perfectly” = labai aiškiai.", minimal: "Three words." },
    "let's talk": { reason: "grammatical_fusion", split: "Let's → leiskime + talk → kalbėti is a calque; the imperative pasikalbėkime carries “let's”.", minimal: "Two words." },
    "not talking": { reason: "grammatical_fusion", split: "Negation is the prefix ne- of nekalbi (C-NEG).", minimal: "Two words." },
    "on track": { reason: "lexical_expression", split: "on → ant + track → takas is false; = pagal planą.", minimal: "Two words." },
    "on vacation": { reason: "grammatical_fusion", split: "The locative atostogose carries “on” (C-CASE).", minimal: "Two words." },
    "these days": { reason: "grammatical_fusion", split: "Kept as two units: these → šiomis, days → dienomis.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, ar girdi Keitę", step: "hear" },
    { lt: "Įsijunk kamerą", step: "camera", optional: true, when: stay },
    { lt: "Pasakyk Paului apie mikrofoną", optional: true, when: stay, done: (c) => !!c.s.muteFixed && !!c.s.paulOk },
    { lt: "Pasakyk, ar matai ekraną", optional: true, when: stay, done: (c) => !!c.s.screenOk },
    { lt: "Pasakyk Keitei apie ryšį", optional: true, when: (c) => !!c.s.freezeAsks && stay(c), done: (c) => !!c.s.freezeOk },
    { lt: "Papasakok, kaip sekasi darbe", done: (c) => !!c.s.update && !c.s.updOpen },
    { lt: "Atsakyk, ar turi klausimų", optional: true, when: stay, done: (c) => !!c.s.questionsDone },
  ],

  steps: [
    { id: "hear", done: (c) => !!c.s.heard,
      ask: (c) => K(c, "hear_reask"),
      expects: ["hear_yes", "hear_no", "greet_team"],
      suggest: [{ lt: "Atsakyti, ar girdi", hint: "hear" }],
      yes: (c) => { c.s.heard = true; K(c, "hear_ok"); },
      no: (c) => { K(c, "mic_fix"); c.hold(); } },
    { id: "weekend", when: (c) => !!c.s.smallTalk && !!c.s.heard, done: (c) => !!c.s.weekendDone,
      ask: (c) => { K(c, "two_minutes"); K(c, "weekend_q"); },
      expects: ["weekend_ans_ctx"],
      suggest: [{ lt: "Papasakoti apie savaitgalį", hint: "weekend" }],
      yes: (c) => { c.s.weekendDone = true; K(c, "weekend_good"); },
      no: (c) => { c.s.weekendDone = true; K(c, "weekend_bad"); },
      help: (c) => { c.s.weekendDone = true; K(c, "ok"); } },
    { id: "camera", when: (c) => !!c.s.camOff && !!c.s.heard, done: (c) => !!c.s.camFixed,
      ask: (c) => K(c, "camera_off"),
      expects: ["cam_fixed", "cam_fix_ctx", "cam_broken", "better_q", "better_now_ctx"],
      suggest: [{ lt: "Atsiprašyti ir įsijungti kamerą", hint: "camera" }],
      yes: (c) => { c.s.camFixed = true; K(c, "camera_on"); },
      no: (c) => { c.s.camFixed = true; K(c, "camera_broken"); } },
    { id: "mute", when: (c) => !!c.s.heard, done: (c) => !!c.s.muteFixed,
      ask: (c) => {
        c.s.muteAsks = (c.s.muteAsks || 0) + 1;
        if (c.s.muteAsks === 1) { K(c, "paul_join"); K(c, "paul_silent"); return; }
        if (c.s.muteAsks === 2) { K(c, "paul_silent"); return; }
        // Fallback after one turn: Sara says it, Paul unmutes.
        S(c, "sara_mute"); c.s.muteFixed = true; P(c, "paul_unmuted"); expectPaulHear(c);
      },
      expects: ["tell_mute", "tell_mute_ctx", "not_muted", "hear_no"],
      suggest: [{ lt: "Pasakyti Paului, kad jo mikrofonas išjungtas", hint: "mute" }] },
    { id: "screen", when: (c) => !!c.s.muteFixed, done: (c) => !!c.s.screenOk,
      ask: (c) => {
        if (!c.s.sharing) { c.s.sharing = true; K(c, "screen_share"); }
        K(c, "screen_q");
      },
      expects: ["screen_yes", "screen_no", "screen_small"],
      suggest: [{ lt: "Atsakyti, ar matai ekraną", hint: "screen" }],
      yes: (c) => { c.s.screenOk = true; afterScreen(c); },
      no: (c) => { K(c, "screen_retry"); expectScreen2(c); } },
    { id: "echo", when: (c) => !!c.s.echoTwist && !!c.s.screenOk, done: (c) => !!c.s.echoDone,
      ask: (c) => {
        c.s.echoAsks = (c.s.echoAsks || 0) + 1;
        if (c.s.echoAsks === 1) { c.s.echoAsked = true; c.twist("echo"); S(c, "sara_echo"); K(c, "echo_you"); K(c, "echo_mute"); return; }
        c.s.echoDone = true; K(c, "ok");
      },
      expects: ["mute_self", "better_q", "better_now_ctx"],
      suggest: [{ lt: "Išsijungti mikrofoną", hint: "echo" }],
      yes: (c) => { c.s.echoDone = true; K(c, "echo_ok"); },
      no: (c) => { c.s.echoDone = true; K(c, "ok"); } },
    { id: "freeze", when: (c) => !!c.s.freeze && !!c.s.screenOk, done: (c) => !!c.s.freezeDone,
      ask: (c) => {
        c.s.freezeAsks = (c.s.freezeAsks || 0) + 1;
        if (c.s.freezeAsks === 1) { K(c, "freeze_line"); return; }
        S(c, "sara_froze"); fixFreeze(c);
      },
      expects: ["tell_freeze", "tell_freeze_ctx"],
      suggest: [{ lt: "Pasakyti Keitei, kad jos ryšys trūkinėja", hint: "freeze" }, { lt: "Paprašyti pakartoti", hint: "g_clarify" }] },
    { id: "first", when: (c) => !!c.s.screenOk, done: (c) => !!c.s.firstDone || !!c.s.update,
      ask: (c) => K(c, "first_ask"),
      expects: ["volunteer", "defer", "upd_done", "upd_working", "upd_behind", "upd_ok"],
      suggest: [{ lt: "Pasisiūlyti pradėti arba užleisti eilę", hint: "first" }],
      yes: (c) => videoCall.handlers.volunteer(c, {}, { intent: "volunteer", slots: {}, tags: [] }),
      no: (c) => videoCall.handlers.defer(c, {}, { intent: "defer", slots: {}, tags: [] }) },
    { id: "update", when: (c) => !!c.s.screenOk, done: (c) => !!c.s.update,
      ask: (c) => {
        if (c.s.saraDone && !c.s.afterSaraSaid) { c.s.afterSaraSaid = true; K(c, "after_sara"); return; }
        K(c, c.s.goAhead && !c.s.updAsked ? "first_go" : "upd_ask");
        c.s.updAsked = true;
      },
      expects: ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_nothing"],
      suggest: [{ lt: "Papasakoti trumpai, kaip sekasi", hint: "update", options: "task" }],
      help: (c) => { c.s.update = "nothing"; K(c, "upd_nothing_resp"); } },
    { id: "paul_leave", when: (c) => !!c.s.paulLeaves && !!c.s.update, done: (c) => !!c.s.paulLeft,
      ask: (c) => {
        c.s.paulLeft = true; c.twist("paul_leaves"); c.s.updOpen = false;
        P(c, "paul_leave");
        c.expect({
          id: "paul_leave", optional: true, expects: ["bye_paul"], hints: ["paul_leave"],
          suggest: [{ lt: "Atsisveikinti su Paulu", hint: "paul_leave" }],
          on: {
            bye_paul: (cc) => byePaul(cc),
            g_bye: (cc) => byePaul(cc),
            bye_all: (cc) => byePaul(cc),
          },
          yes: (cc) => byePaul(cc),
        });
      } },
    { id: "questions", when: (c) => !!c.s.update, done: (c) => !!c.s.questionsDone,
      ask: (c) => { c.s.updOpen = false; K(c, "questions_ask"); },
      expects: ["q_slides", "q_link", "q_deadline", "q_next", "q_back", "q_record", "no_questions", "have_question"],
      suggest: [{ lt: "Paklausti ko nors arba pasakyti, kad klausimų nėra", hint: "questions" }],
      yes: (c) => { K(c, "ok"); c.hold(); },
      no: (c) => { c.s.questionsDone = true; K(c, "qa_none"); } },
    { id: "cat", when: (c) => !!c.s.catTwist && !!c.s.questionsDone, done: (c) => !!c.s.catDone,
      ask: (c) => {
        c.s.catDone = true; c.twist("tiger");
        S(c, "sara_cat"); K(c, "cat_resp"); P(c, "paul_hi_tiger");
        c.expect({
          id: "cat", optional: true, expects: ["hi_tiger", "cute"], hints: ["cat"],
          suggest: [{ lt: "Pasisveikinti su katinu", hint: "cat" }],
          on: { hi_tiger: (cc) => K(cc, "cat_hi"), cute: (cc) => K(cc, "cat_hi") },
        });
      } },
  ],

  init: (c) => {
    c.s.smallTalk = c.chance(0.55);
    c.s.camOff = c.chance(0.45);
    c.s.freeze = c.chance(0.5);
    c.s.collide = c.chance(0.5);
    c.s.saraLate = c.chance(0.35);
    c.s.paulHelps = c.chance(0.6);
    c.s.echoTwist = c.visits >= 1 && c.chance(0.35);
    c.s.paulLeaves = c.visits >= 1 && c.chance(0.4);
    c.s.catTwist = c.visits >= 2 && c.chance(0.5);
    c.s.camStillOn = c.visits >= 1 && c.chance(0.3);
  },

  start: (c) => {
    K(c, "open");
    c.hold();
  },

  handlers: {
    hear_yes(c) {
      if (!live(c)) return;
      if (!c.s.heard) { c.s.heard = true; K(c, "hear_ok"); return; }
      K(c, "ok");
    },
    hear_no(c, _slots, seg) {
      if (!live(c)) return;
      if (c.s.heard && c.s.muteFixed && c.step !== "hear") { K(c, "quiet_fix"); return; }
      K(c, seg.tags.includes("quiet") ? "quiet_fix" : "mic_fix");
      c.expect({
        id: "hear2", expects: ["hear_yes", "hear_no"], hints: ["hear_now"],
        suggest: [{ lt: "Atsakyti, ar dabar girdi", hint: "hear_now" }],
        yes: (cc) => { cc.s.heard = true; K(cc, "hear_ok"); },
        no: (cc) => { cc.s.heard = true; K(cc, "quiet_fix"); },
        on: {
          hear_yes: (cc) => { cc.s.heard = true; K(cc, "hear_ok"); },
          hear_no: (cc) => { cc.s.heard = true; K(cc, "quiet_fix"); },
        },
        ask: (cc) => K(cc, "hear_reask"),
      });
    },
    greet_team() { /* "Morning, Kate!": the greeting is enough; the question stays open */ },
    ask_hear_me(c) {
      if (!live(c)) return;
      if (/\bmute|muted\b/i.test(c.heard)) { K(c, "heard_you"); return; }
      if (c.s.camOff && !c.s.camFixed) { K(c, "heard_but_cam"); return; }
      K(c, "heard_you");
      if (!c.s.heard) c.s.heard = true;
    },
    cam_fixed(c) {
      if (!live(c)) return;
      if (!c.s.camOff || c.s.camFixed) { ack(c); return; }
      c.s.camFixed = true; K(c, "camera_on");
    },
    // "Sorry, I have to go.": the "sorry" belongs to the goodbye, the camera stays off
    cam_fix_ctx(c) { if (!live(c) || leavingNow(c)) return; c.s.camFixed = true; K(c, "camera_on"); },
    cam_broken(c) { if (!live(c)) return; c.s.camFixed = true; K(c, "camera_broken"); },
    tell_mute(c) {
      if (!live(c)) return;
      if (c.s.muteFixed) { ack(c); return; }
      c.s.muteFixed = true; c.s.toldPaul = true;
      P(c, "paul_unmuted");
      expectPaulHear(c);
    },
    tell_mute_ctx(c) { videoCall.handlers.tell_mute(c, {}, { intent: "tell_mute", slots: {}, tags: [] }); },
    not_muted(c) { if (!live(c)) return; K(c, "not_muted_resp"); },
    screen_yes(c) {
      if (!live(c)) return;
      if (c.s.screenOk || !c.s.sharing) { ack(c); return; }
      c.s.screenOk = true; afterScreen(c);
    },
    screen_no(c) {
      if (!live(c)) return;
      if (!c.s.sharing || c.s.screenOk) { ack(c); return; }
      K(c, "screen_retry"); expectScreen2(c);
    },
    screen_small(c) {
      if (!live(c)) return;
      K(c, "screen_bigger");
      if (!c.s.screenOk && c.s.sharing) expectScreen2(c);
    },
    tell_freeze(c) {
      if (!live(c)) return;
      if (!c.s.freeze || c.s.freezeDone) { K(c, "quiet_fix"); return; }
      fixFreeze(c);
    },
    tell_freeze_ctx(c) { videoCall.handlers.tell_freeze(c, {}, { intent: "tell_freeze", slots: {}, tags: [] }); },
    volunteer(c) {
      if (!live(c)) return;
      c.s.firstDone = true;
      if (c.s.collide && !c.s.collided) {
        c.s.collided = true; c.twist("talk_over");
        S(c, "sara_start"); S(c, "sara_sorry");
        c.expect({
          id: "goahead", expects: ["go_ahead", "thanks_sara"], hints: ["goahead"],
          suggest: [{ lt: "Padėkoti arba užleisti eilę Sarai", hint: "goahead" }],
          yes: (cc) => { cc.s.goAhead = true; },
          no: (cc) => { saraGoes(cc); },
          on: {
            go_ahead: (cc) => saraGoes(cc),
            thanks_sara: (cc) => { cc.s.goAhead = true; },
            g_thanks: (cc) => { cc.s.goAhead = true; },
            upd_done: (cc, sl) => react(cc, "done", sl.task),
            upd_working: (cc, sl) => react(cc, "working", sl.task),
            upd_behind: (cc, sl) => react(cc, "behind", sl.task),
            upd_ok: (cc) => react(cc, "ok"),
          },
          ask: (cc) => S(cc, "sara_go"),
        });
        return;
      }
      c.s.goAhead = true;
    },
    defer(c) { if (!live(c)) return; c.s.firstDone = true; saraGoes(c); },
    go_ahead(c) { if (!live(c)) return; c.s.firstDone = true; saraGoes(c); },
    better_q(c) {
      if (!live(c)) return;
      if (c.step === "echo" || (c.s.echoTwist && c.s.echoAsked && !c.s.echoDone)) { c.s.echoDone = true; K(c, "echo_ok"); return; }
      if (c.s.camOff && !c.s.camFixed) { c.s.camFixed = true; K(c, "camera_on"); return; }
      K(c, "much_better");
    },
    thanks_sara(c) { if (!live(c)) return; c.s.goAhead = true; },
    upd_done(c, slots) { if (!live(c)) return; c.s.firstDone = true; react(c, "done", slots.task); },
    upd_working(c, slots) { if (!live(c)) return; c.s.firstDone = true; react(c, "working", slots.task); },
    upd_behind(c, slots) { if (!live(c)) return; c.s.firstDone = true; react(c, "behind", slots.task); },
    upd_ok(c) { if (!live(c)) return; c.s.firstDone = true; react(c, "ok"); },
    upd_nothing(c) { if (!live(c)) return; c.s.firstDone = true; react(c, "nothing"); },
    task_ctx(c, slots) { if (!live(c)) return; react(c, "working", slots.task); },
    when_ans(c) { if (!live(c)) return; K(c, "when_ok"); },
    unsure(c) { if (!live(c)) return; K(c, "when_unsure"); },
    help_ask(c) { if (!live(c)) return; if (c.s.paulLeft) { ack(c); return; } P(c, "paul_help_sure"); },
    accept_help(c) { if (!live(c)) return; if (!c.s.paulLeft) P(c, "paul_talk_later"); else ack(c); },
    q_slides(c) { if (!live(c)) return; K(c, "qa_slides"); askMore(c); },
    q_link(c) { if (!live(c)) return; K(c, "qa_link"); askMore(c); },
    q_deadline(c) { if (!live(c)) return; K(c, "qa_deadline"); askMore(c); },
    q_next(c) { if (!live(c)) return; K(c, "qa_next"); askMore(c); },
    q_back(c) { if (!live(c)) return; K(c, "qa_back"); askMore(c); },
    q_record(c) { if (!live(c)) return; K(c, "qa_record"); askMore(c); },
    no_questions(c) { if (!live(c)) return; c.s.questionsDone = true; K(c, "qa_none"); },
    will_send(c) { if (!live(c)) return; ack(c); },
    cant_send(c) { if (!live(c)) return; K(c, "send_no"); },
    better_now_ctx(c) { videoCall.handlers.better_q(c, {}, { intent: "better_q", slots: {}, tags: [] }); },
    // "Yes, one question: …" — the question itself usually follows in the same breath
    have_question(c) { if (!live(c)) return; if (c.step === "questions") { ack(c); c.hold(); } else ack(c); },
    leave(c) {
      // once per turn: "Sorry, I have to go. Bye, everyone!" is one leaving (g_bye and bye_all come here too)
      if (!live(c) || !once(c, "leave")) return;
      c.s.heard = true;
      if (!c.s.update) {
        c.s.leaving = true;
        K(c, "leave_first");
        c.expect({
          id: "update", expects: ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_nothing"], hints: ["update"],
          suggest: [{ lt: "Papasakoti trumpai, kaip sekasi", hint: "update", options: "task" }],
          on: {
            upd_done: (cc, sl) => { cc.s.update = "done"; cc.s.task = sl.task; K(cc, "leave_update_ok"); goodbye(cc); },
            upd_working: (cc, sl) => { cc.s.update = "working"; cc.s.task = sl.task; K(cc, "leave_update_ok"); goodbye(cc); },
            upd_behind: (cc, sl) => { cc.s.update = "behind"; cc.s.task = sl.task; K(cc, "leave_update_ok"); goodbye(cc); },
            upd_ok: (cc) => { cc.s.update = "ok"; K(cc, "leave_update_ok"); goodbye(cc); },
            upd_nothing: (cc) => { cc.s.update = "nothing"; K(cc, "leave_ok"); goodbye(cc); },
          },
          no: (cc) => { K(cc, "leave_ok"); goodbye(cc); },
        });
        return;
      }
      K(c, "leave_ok");
      goodbye(c);
    },
    next_week_yes(c) { if (!live(c)) return; if (c.s.closingSaid) goodbye(c); else K(c, "qa_next"); },
    on_vacation(c) { if (!live(c)) return; K(c, "vacation_ok"); if (!c.s.closingSaid) return; },
    bye_all(c) { if (!live(c)) return; if (!c.s.update) { videoCall.handlers.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); return; } goodbye(c); },
    bye_paul(c) { if (!live(c)) return; if (c.s.paulLeft) byePaul(c); else ack(c); },
    hi_tiger(c) { if (!live(c)) return; if (c.s.catDone) K(c, "cat_hi"); else ack(c); },
    cute(c) { if (!live(c)) return; if (c.s.catDone) K(c, "cat_hi"); else ack(c); },
    oops(c) { if (!live(c)) return; ack(c); },
    mute_self(c) { if (!live(c)) return; c.s.echoDone = true; K(c, "echo_ok"); },
    weekend_ans_ctx(c, _slots, seg) {
      if (!live(c)) return;
      c.s.weekendDone = true;
      K(c, seg.tags.includes("bad") ? "weekend_bad" : "weekend_good");
      if (/\b(you|yours)\b/i.test(c.heard)) K(c, "weekend_mine");
      if (c.s.saraLate && !c.s.saraJoined) { c.s.saraJoined = true; S(c, "sara_join"); }
    },
    g_repeat(c) {
      // "Sorry, could you say that again?" while Kate is frozen = telling her about it.
      if (c.step === "freeze" && c.s.freeze && !c.s.freezeDone) { fixFreeze(c); return; }
      GLOBAL_HANDLERS.g_repeat(c as any, {});
    },
    g_bye(c, _slots, seg) {
      if (!live(c)) return;
      if (!c.s.update) { videoCall.handlers.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); return; }
      // "I'll call you back later" before the end of the meeting: Kate answers it like "I have to go"
      if (!c.s.closingSaid && seg?.tags?.includes("leaving")) K(c, "leave_ok");
      goodbye(c);
    },
  },

  finish: (c) => {
    c.complete();
    c.s.closingSaid = true;
    K(c, "closing");
    const closing: Pending = {
      id: "next_week", expects: ["next_week_yes", "on_vacation", "bye_all"], hints: ["bye"],
      suggest: [{ lt: "Sutikti ir atsisveikinti", hint: "bye" }],
      on: {
        next_week_yes: (cc) => goodbye(cc),
        bye_all: (cc) => goodbye(cc),
        g_bye: (cc) => goodbye(cc),
        g_thanks: (cc) => goodbye(cc),
        on_vacation: (cc) => { K(cc, "vacation_ok"); goodbye(cc); },
        // "How are you?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { K(cc, "g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => goodbye(cc),
      no: (cc) => goodbye(cc),
    };
    c.expect(closing);
  },

  tests: [
    { say: "Yes, I can hear you.", intent: "hear_yes", step: "hear" },
    { say: "Morning, Kate! Yes, we can.", intent: "greet_team", step: "hear" },
    { say: "Yes, loud and clear!", intent: "hear_yes" },
    { say: "Sorry, you're a bit quiet.", intent: "hear_no" },
    { say: "No, I can't hear you.", intent: "hear_no", not: ["hear_yes"] },
    { say: "Can you hear me?", intent: "ask_hear_me" },
    { say: "Oh, sorry! Can you see me now?", intent: "cam_fixed" },
    { say: "Sorry", intent: "cam_fix_ctx", step: "camera" },
    { say: "My camera isn't working.", intent: "cam_broken" },
    { say: "Paul, you're on mute!", intent: "tell_mute" },
    { say: "I think you're muted.", intent: "tell_mute" },
    { say: "Paul, click the microphone!", intent: "tell_mute" },
    { say: "Paul, we can't hear you.", intent: "tell_mute_ctx", step: "mute" },
    { say: "Paul, you're not on mute.", intent: "not_muted", not: ["tell_mute"] },
    { say: "Yes, I can see it.", intent: "screen_yes", step: "screen" },
    { say: "No, I can only see your face.", intent: "screen_no", step: "screen" },
    { say: "No, I can't see your screen.", intent: "screen_no", not: ["screen_yes"] },
    { say: "It's a bit small.", intent: "screen_small" },
    { say: "Kate, you're breaking up.", intent: "tell_freeze" },
    { say: "Sorry, you froze.", intent: "tell_freeze" },
    { say: "I can go first.", intent: "volunteer", step: "first" },
    { say: "Sara, you go first.", intent: "defer", step: "first" },
    { say: "No, you go ahead!", intent: "go_ahead" },
    { say: "Oh, sorry! Is that better?", intent: "better_q", step: "echo" },
    { say: "I finished the report.", intent: "upd_done", slots: { task: "report" } },
    { say: "I'm working on the new website.", intent: "upd_working", slots: { task: "website" } },
    { say: "I'm almost done with the presentation.", intent: "upd_working" },
    { say: "I haven't finished the report yet.", intent: "upd_behind", not: ["upd_done"] },
    { say: "The slides aren't ready yet.", intent: "upd_behind", not: ["upd_done"] },
    { say: "I'm a bit behind with the budget.", intent: "upd_behind" },
    { say: "Everything's on track.", intent: "upd_ok" },
    { say: "Could you send us the slides?", intent: "q_slides" },
    { say: "Could you put the link in the chat?", intent: "q_link" },
    { say: "When's the deadline?", intent: "q_deadline" },
    { say: "No questions from me.", intent: "no_questions" },
    { say: "Sorry, I have to jump off. I have another call at 11.", intent: "leave" },
    { say: "Sorry, I have to go.", intent: "leave" },
    { say: "I have to leave early today.", intent: "leave" },
    { say: "Sorry, I need to log off now.", intent: "leave" },
    { say: "I don't have to leave early.", intent: "none" },
    // "…go to work" is no goodbye (BUG-REVIEW, still open: s89)
    { say: "I have to go to work.", intent: "none", not: ["leave", "g_bye"] },
    { say: "I have to go to work now.", intent: "none", step: "questions", not: ["leave", "g_bye"] },
    { say: "I had to go to work on Saturday.", intent: "weekend_ans_ctx", step: "weekend", not: ["leave"] },
    { say: "Sorry, I have to go, I'm driving.", intent: "leave" },
    { say: "Sorry, I have to go. Bye, everyone!", intent: "leave" },
    { say: "I have to jump off, see you next week!", intent: "leave" },
    { say: "Actually, I'm on holiday next week.", intent: "on_vacation" },
    { say: "Bye, everyone!", intent: "bye_all" },
    { say: "Hi, Tiger!", intent: "hi_tiger" },
    { say: "It was great, thanks! And yours?", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "The report", intent: "none" },
    { say: "elephant keyboard sunshine", intent: "none" },
    // more ways to say it (dev corpus: tests/corpus/s89-video-call.json)
    { say: "Yes, the sound is good", intent: "hear_yes", step: "hear" },
    { say: "Your voice is very quiet", intent: "hear_no", step: "hear" },
    { say: "Can you speak louder?", intent: "hear_no" },
    { say: "Sorry, I forgot to turn it on", intent: "cam_fix_ctx", step: "camera" },
    { say: "I don't have a camera on this computer", intent: "cam_broken", step: "camera" },
    { say: "I think Paul is on mute", intent: "tell_mute", step: "mute" },
    { say: "Paul, check your microphone", intent: "tell_mute" },
    { say: "No, I only see a black screen", intent: "screen_no", step: "screen" },
    { say: "The letters are too small", intent: "screen_small" },
    { say: "Kate, your video stopped", intent: "tell_freeze", step: "freeze" },
    { say: "Ladies first", intent: "defer", step: "first" },
    { say: "I'm late with the invoices", intent: "upd_behind", slots: { task: "invoices" } },
    { say: "This week I worked on the new app", intent: "upd_working", slots: { task: "app" } },
    { say: "I made the presentation", intent: "upd_done", slots: { task: "presentation" } },
    { say: "Sure, right after the call", intent: "will_send" },
    { say: "Could you share the slides after the meeting?", intent: "q_slides", step: "questions" },
    { say: "Can you go back one slide?", intent: "q_back" },
    { say: "Next week I'm on vacation", intent: "on_vacation" },
    { say: "Great! We had a barbecue", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "Good luck, Paul", intent: "bye_paul" },
    { say: "No problem, see you later, Paul", intent: "bye_paul", not: ["greet_team"] },
    { say: "Now?", intent: "better_now_ctx", step: "echo" },
    { say: "now", intent: "none" },
    { say: "I don't want to go first", intent: "defer", step: "first", not: ["volunteer"] },
    { say: "I can see you, but I can't hear you", intent: "hear_no", step: "hear", not: ["hear_yes"] },
    { say: "No, I don't see it", intent: "screen_no", step: "screen", not: ["screen_yes"] },
    { say: "I can't send it today", intent: "cant_send", not: ["will_send"] },
    { say: "Can I go first?", intent: "volunteer", step: "first" },
    { say: "Can I go?", intent: "none", not: ["leave"] },
  ],

  sims: [
    { name: "happy path", turns: ["Yes, I can hear you.", "Paul, you're on mute!", "Yes, we can hear you now!", "Yes, I can see it.", "I finished the report.", "Sure!", "Could you send us the slides?", "No, that's all.", "Sounds good! Bye, everyone!"], expect: { complete: true }, auto: AUTO },
    { name: "problems and short answers", turns: ["Sorry, you're a bit quiet.", "Yes, much better.", "I think you're muted.", "Yes!", "No, I can only see your face.", "Yes, now I can see it.", "Kate, you froze.", "Yes.", "Sara, you go first.", "I'm working on the presentation.", "By Friday.", "No questions from me.", "See you next week!"], expect: { complete: true }, auto: AUTO },
    { name: "leaving early", turns: ["Morning, Kate! Yes, we can.", "Paul, click the microphone!", "Yes, loud and clear!", "Yes, we can see your screen.", "Sorry, I have to jump off. I have another call at 11.", "I'm a bit behind with the budget."], expect: { complete: true }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Shared flow pieces (defined after the object so they can call its handlers)

function expectPaulHear(c: Ctx) {
  c.expect({
    id: "paul_hear", expects: ["hear_yes", "hear_no"], hints: ["paul_hear"],
    suggest: [{ lt: "Atsakyti Paului, ar dabar jį girdi", hint: "paul_hear" }],
    yes: (cc) => { cc.s.paulOk = true; P(cc, "paul_ok"); if (cc.s.saraLate && !cc.s.saraJoined) { cc.s.saraJoined = true; S(cc, "sara_join"); } },
    no: (cc) => paulStillMuted(cc),
    on: {
      hear_yes: (cc) => { cc.s.paulOk = true; P(cc, "paul_ok"); if (cc.s.saraLate && !cc.s.saraJoined) { cc.s.saraJoined = true; S(cc, "sara_join"); } },
      hear_no: (cc) => paulStillMuted(cc),
      tell_mute: (cc) => paulStillMuted(cc),
      tell_mute_ctx: (cc) => paulStillMuted(cc),
    },
    ask: (cc) => P(cc, "paul_reask"),
  });
}

function paulStillMuted(c: Ctx) {
  if (!once(c, "paulStill")) return;
  P(c, "paul_now");
  c.s.paulTries = (c.s.paulTries || 0) + 1;
  if (c.s.paulTries < 2) expectPaulHear(c);
  else c.s.paulOk = true; // Paul fixes it himself; the call goes on
}

function expectScreen2(c: Ctx) {
  c.expect({
    id: "screen2", expects: ["screen_yes", "screen_no"], hints: ["screen"],
    suggest: [{ lt: "Atsakyti, ar dabar matai", hint: "screen" }],
    yes: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
    no: (cc) => { cc.s.screenOk = true; K(cc, "screen_bigger"); afterScreen(cc); },
    on: {
      screen_yes: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
      screen_no: (cc) => { cc.s.screenOk = true; K(cc, "screen_bigger"); afterScreen(cc); },
    },
    ask: (cc) => K(cc, "screen_reask"),
  });
}

/** Kate presents the numbers (unless she is about to freeze in the middle of them). */
function afterScreen(c: Ctx) {
  if (c.s.freeze && !c.s.freezeDone) return;
  K(c, "present"); K(c, "great_work");
}

function fixFreeze(c: Ctx) {
  c.s.freezeDone = true; c.twist("froze");
  K(c, "freeze_fix");
  c.expect({
    id: "freeze_q", expects: ["hear_yes", "hear_no"], hints: ["hear_now"],
    suggest: [{ lt: "Atsakyti, ar dabar girdi", hint: "hear_now" }],
    yes: (cc) => { cc.s.freezeOk = true; K(cc, "freeze_where"); K(cc, "present"); },
    no: (cc) => { cc.s.freezeOk = true; K(cc, "quiet_fix"); K(cc, "present"); },
    on: {
      hear_yes: (cc) => { cc.s.freezeOk = true; K(cc, "freeze_where"); K(cc, "present"); },
      hear_no: (cc) => { cc.s.freezeOk = true; K(cc, "quiet_fix"); K(cc, "present"); },
    },
    ask: (cc) => K(cc, "hear_reask"),
  });
}

function saraGoes(c: Ctx) {
  c.s.firstDone = true;
  if (c.s.saraDone) { ack(c); return; }
  c.s.saraDone = true;
  S(c, "sara_update");
}

function askMore(c: Ctx) {
  if (c.step !== "questions") return;
  K(c, "anything_else");
  c.expect({
    id: "anything_else", expects: ["no_questions", "q_slides", "q_link", "q_deadline", "q_next", "q_back", "q_record"], hints: ["no_more", "questions"],
    suggest: [{ lt: "Pasakyti, kad daugiau klausimų nėra", hint: "no_more" }, { lt: "Paklausti dar ko nors", hint: "questions" }],
    no: (cc) => { cc.s.questionsDone = true; K(cc, "qa_none"); },
    yes: (cc) => { K(cc, "ok"); cc.hold(); },
    on: {
      no_questions: (cc) => { cc.s.questionsDone = true; K(cc, "qa_none"); },
      q_slides: (cc) => { cc.s.questionsDone = true; K(cc, "qa_slides"); },
      q_link: (cc) => { cc.s.questionsDone = true; K(cc, "qa_link"); },
      q_deadline: (cc) => { cc.s.questionsDone = true; K(cc, "qa_deadline"); },
      q_next: (cc) => { cc.s.questionsDone = true; K(cc, "qa_next"); },
      q_back: (cc) => { cc.s.questionsDone = true; K(cc, "qa_back"); },
      q_record: (cc) => { cc.s.questionsDone = true; K(cc, "qa_record"); },
    },
  });
}

export default videoCall;
