// Song 34 "Any Other Business?": the weekly Brightline team meeting in the meeting room.
// Kate (team lead) runs it, Paul sits in the room and Sara joins on the screen from home. Sara starts
// talking while she is still muted ("Sara, you're on mute!"). Kate's agenda: quick updates (the
// learner's own update: "I finished the report", "I'm working on…", "It'll be ready by Friday"), the app
// launch (Paul explains it in jargon; the learner asks "Could you clarify that?" / "What do you mean
// by…?", then may say "I'd like to add something"), the budget (Paul wants to put all the money into one
// thing; the learner says what they think, ideally politely disagreeing: "I'm not sure I agree", "I see
// your point, but…"; Kate: "Let's take this offline"), the next deadline ("Who's taking this?" →
// "I can do that"), then "Let's wrap up. Any other business?" and "Thanks, everyone!".
// "Could you clarify that?" works everywhere: Kate or Paul explains the last thing that was unclear.
// Twists (returning visits): Paul and Sara disagree about the deadline and Kate asks the learner what
// they think; Kate asks the learner to take notes (at the start) or to send a summary (at the end).
// Variety: three versions of Paul's jargon, two budget ideas, three deliverables, Paul sometimes adds
// something himself, Paul offers help when the learner is behind.
//
// Kate, Paul and Sara are informal (tu). To the whole team the Lithuanian uses the plural (jūs, visi);
// to one colleague, tu.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// The learner's work (update) and the deliverable of the next deadline

const TASKS: EntityDef[] = [
  ent("report", "report", "ataskaita/ataskaitos/ataskaitai/ataskaitą/ataskaita/ataskaitoje", "f",
    { forms: ["reports", "monthly report", "sales report", "weekly report", "the monthly report"], chip: "ataskaita" }),
  ent("presentation", "presentation", "pristatymas/pristatymo/pristatymui/pristatymą/pristatymu/pristatyme", "m",
    { forms: ["presentations", "powerpoint", "the presentation"], chip: "pristatymas" }),
  ent("slides", "slides", "skaidrės/skaidrių/skaidrėms/skaidres/skaidrėmis/skaidrėse", "f",
    { art: "", forms: ["slide deck", "deck", "the slides"], chip: "skaidrės", attrs: { plural: true } }),
  ent("budget", "budget", "biudžetas/biudžeto/biudžetui/biudžetą/biudžetu/biudžete", "m", { forms: ["budgets", "budget plan"], chip: "biudžetas" }),
  ent("website", "website", "svetainė/svetainės/svetainei/svetainę/svetaine/svetainėje", "f",
    { forms: ["websites", "web site", "site", "web page", "webpage", "the new website"], chip: "svetainė" }),
  ent("schedule", "schedule", "grafikas/grafiko/grafikui/grafiką/grafiku/grafike", "m", { forms: ["schedules", "timeline"], chip: "grafikas" }),
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
const taskVar = (id: string) => ({ id, qty: byTask(id)?.attrs?.plural ? 2 : 1 });

const DELIVS: EntityDef[] = [
  ent("user_guide", "user | guide", "naudotojo | vadovas/vadovo/vadovui/vadovą/vadovu/vadove", "m",
    { forms: ["guide", "the guide", "user manual", "manual", "help guide", "users guide"], chip: "naudotojo vadovas" }),
  ent("launch_email", "launch | email", "paleidimo | laiškas/laiško/laiškui/laišką/laišku/laiške", "m",
    { forms: ["email", "the email", "e mail", "launch e mail", "announcement", "launch announcement", "email to customers"], chip: "laiškas apie paleidimą" }),
  ent("demo_video", "demo | video", "demonstracinis/demonstracinio/demonstraciniam/demonstracinį/demonstraciniu/demonstraciniame | vaizdo įrašas/vaizdo įrašo/vaizdo įrašui/vaizdo įrašą/vaizdo įrašu/vaizdo įraše", "m",
    { forms: ["video", "the video", "demo", "the demo", "product video", "app video"], chip: "demonstracinis vaizdo įrašas" }),
];

// ---------------------------------------------------------------------------
// Flags used more than once

const F_CAN_P = "“Can” with a verb of perception: Lithuanian needs no modal; ar marks the question and the verb carries “can”.";
const F_CAN_S = "“can” with a verb of perception has no Lithuanian word; the verb carries it.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_DO_Q = "Question “Do/Does” = the particle ar.";
const F_DO_WH = "Question “do/does” has no Lithuanian word; the tense sits on the verb.";
const F_PROG = "Progressive “are”: the present tense of the verb carries it.";
const F_POSTED = "“keep … posted” = informuoti: the verb stands under “posted”.";
const F_IM_NOT = "The copula of “I'm” takes the negation in Lithuanian: nesu stands under “not”.";
const F_AR = "Zero “that” before the clause: Lithuanian needs ar (whether) here.";
const F_OFFLINE = "“take … offline” (talk about it later, outside the meeting): aptarkime stands under “Let's take”, atskirai under “offline”.";
const F_IN_PLAIN = "“In”: the instrumental paprasta anglų kalba carries it (an adjective intervenes).";
const F_SOME = "Partitive “some”: the genitive carries it.";
const F_OF_MONEY = "“of”: the genitive pinigų carries it.";
const F_WHOS = "“'s” (is) is the progressive of a planned action: the Lithuanian future imsis carries it.";
const F_WOULD = "“would” has no separate word: the conditional būtų carries it (linked to “be”).";
const F_KNOW = "“know” is part of “let … know”; pranešei (under “letting”) carries it.";

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** The current learner turn: the engine builds a fresh ctx for every input, so the same sentence said
 *  on two different turns gets two different keys. */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let n = turnIds.get(c); if (n === undefined) { n = ++turnSeq; turnIds.set(c, n); } return `${n}:${c.heard}`; };
/** The lines of the NPCs' latest turn (who, and whether it was a question): a "Thanks" is for whoever
 *  just gave the learner something. */
function note(c: Ctx, who: string, line: string) {
  const k = turn(c);
  if (c.s.__noteTurn !== k) { c.s.__noteTurn = k; c.s.__lines = []; }
  c.s.__lines.push({ who, q: /\?["”]?\s*$/.test(meeting.lines[line]?.[0]?.en ?? "") });
}
const K = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "kate", line); c.speaker("kate"); c.say(line, vars); };
const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "paul", line); c.speaker("paul"); c.say(line, vars); };
const S = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "sara", line); c.speaker("sara"); c.say(line, vars); };
/** Kate's bare "Okay." — skipped when someone already reacted to this utterance. */
const ack = (c: Ctx) => { if (c.s.__spokeFor === turn(c) && c.heard) return; K(c, "ok"); };
const live = (c: Ctx) => !c.s.ended;
/** True the first time per utterance for this key (one answer can arrive as several segments). */
const once = (c: Ctx, key: string) => { const k = turn(c); if (c.s["__once_" + key] === k) return false; c.s["__once_" + key] = k; return true; };
const seg = (intent: string, tags: string[] = []): Segment => ({ intent, slots: {}, tags });
/** Only once per learner turn ("Thank you. That makes sense." gets one "Great!", not two). */
const one = (key: string, f: (c: Ctx) => void) => (c: Ctx) => { if (once(c, key)) f(c); };
/** "Okay." / "Okay, thanks." / "Thanks, Kate.": nothing but an acknowledgement. To "Anything to add?"
 *  or "Any other business?" it means "no, nothing". */
const bareAck = (c: Ctx) =>
  /^(?:[\s,.!]*(?:ok(?:ay)?|alright|all right|thanks(?: a lot| so much)?|thank you(?: very much| so much)?|great|cool|good|fine|perfect|got it|i see|nice|sounds good|kate|paul|sara|then))+[\s,.!]*$/i.test(c.heard || "");

/** "Thanks!": Paul or Sara answers if they just gave the learner something (an explanation, help),
 *  otherwise Kate. Nobody answers a thanks that came with a request already answered this turn. */
function thanksReply(c: Ctx, othersOnly = false) {
  if (c.s.__noteTurn === turn(c)) return;
  const lines: { who: string; q: boolean }[] = c.s.__lines || [];
  const last = [...lines].reverse().find((l) => !l.q) ?? lines[lines.length - 1];
  const who = last?.who ?? "kate";
  if (who === "paul") P(c, "np_paul");
  else if (who === "sara") S(c, "np_sara");
  else if (!othersOnly) K(c, "sure_welcome");
}

// Intents that answer each point of the meeting
const MUTE_EXPECTS = ["tell_mute", "tell_mute_ctx", "not_muted", "greet_team"];
// task_ctx: "The report." to "What are you working on?" (one of Kate's ways of asking)
const UPDATE_EXPECTS = ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_ok_ctx", "upd_nothing", "upd_nothing_ctx", "task_ctx"];
const CLARIFY_EXPECTS = ["clarify", "word_q", "term_echo_ctx", "nothing_more", "add_req"];
const ADD_POINTS = ["add_test", "add_help", "add_customers", "add_feedback"];
const ADD_EXPECTS = ["add_req", ...ADD_POINTS, "add_other_ctx", "nothing_more"];
const OPINION_EXPECTS = ["disagree", "agree", "reason", "unsure", "ask_back"];
const WHY_EXPECTS = ["reason", "unsure", "disagree", "agree"];
const DL_EXPECTS = ["agree", "disagree", "dl_view", "unsure"];
const OWNER_EXPECTS = ["can_do", "can_do_ctx", "cant_do", "suggest_other", "with_help", "add_help"];
const AOB_TOPICS = ["aob_wfh", "aob_lunch", "aob_vacation", "aob_printer", "aob_other_ctx"];
const AOB_EXPECTS = ["nothing_more", ...AOB_TOPICS, "add_req", ...ADD_POINTS];

/** Jargon the learner may ask about: who explains it, and the line. */
const TERMS: Record<string, ["kate" | "paul", string]> = {
  beta: ["paul", "term_beta"], golive: ["paul", "term_golive"], slip: ["paul", "term_slip"], soft: ["paul", "term_soft"],
  scale: ["paul", "term_scale"], feature: ["paul", "term_feature"], qa: ["paul", "term_qa"], blockers: ["paul", "term_blockers"],
  launch: ["paul", "term_launch"], offline: ["kate", "term_offline"], wrap: ["kate", "term_wrap"], aob: ["kate", "term_aob"],
  deadline: ["kate", "term_deadline"], agenda: ["kate", "term_agenda"], mute: ["kate", "term_mute"],
};
const LAUNCH_TERMS = new Set(["beta", "golive", "slip", "soft", "scale", "feature", "qa", "blockers", "launch"]);

// ---------------------------------------------------------------------------
// Sara on mute

/** Sara is unmuted (the learner told her, or Paul did): she asks whether we can hear her. */
function unmuted(c: Ctx) {
  c.s.muteFixed = true;
  S(c, "sara_unmuted");
  expectSaraHear(c);
}

function expectSaraHear(c: Ctx) {
  c.expect({
    id: "sara_hear", optional: true, expects: ["hear_yes", "hear_no"], hints: ["sara_hear"],
    suggest: [{ lt: "Atsakyti Sarai, ar dabar ją girdi", hint: "sara_hear" }],
    yes: (cc) => saraOk(cc),
    no: (cc) => saraStill(cc),
    on: {
      hear_yes: (cc) => saraOk(cc),
      greet_team: (cc) => saraOk(cc),
      hear_no: (cc) => saraStill(cc),
      tell_mute: (cc) => saraStill(cc),
      tell_mute_ctx: (cc) => saraStill(cc),
    },
  });
}

function saraOk(c: Ctx) {
  if (c.s.saraOk) { ack(c); return; }
  c.s.saraOk = true;
  S(c, "sara_ok");
}

function saraStill(c: Ctx) {
  if (!once(c, "saraStill")) return;
  c.s.saraTries = (c.s.saraTries || 0) + 1;
  if (c.s.saraTries < 2) { S(c, "sara_now"); expectSaraHear(c); return; }
  // she finds the right button herself
  c.s.saraOk = true;
  K(c, "hear_now_kate"); S(c, "sara_ok");
}

// ---------------------------------------------------------------------------
// Notes (twist)

function notesYes(c: Ctx) {
  if (c.s.notesDone) { ack(c); return; }
  c.s.notesDone = "you";
  K(c, "notes_thanks");
}
function notesNo(c: Ctx) {
  if (c.s.notesDone) { ack(c); return; }
  c.s.notesDone = "paul";
  K(c, "notes_paul"); P(c, "paul_sure");
}

// ---------------------------------------------------------------------------
// The learner's update

type Upd = "done" | "working" | "behind" | "ok" | "busy" | "nothing";

function react(c: Ctx, kind: Upd, task?: string, when?: unknown, askedBack = false) {
  if (c.s.update && c.s.update !== "ok" && c.s.update !== "busy") { ack(c); return; } // already told
  // "Fine, thanks. And you?": Kate answers the question first
  if (askedBack && once(c, "askedBack")) K(c, "k_good_thanks");
  if (task) c.s.task = task;
  c.s.update = kind;
  c.s.updOpen = false;
  if ((kind === "ok" || kind === "busy") && !c.s.task) {
    K(c, c.s.okSaid || askedBack ? "what_task_reask" : kind === "busy" ? "upd_busy_resp" : "upd_ok_resp");
    c.s.okSaid = true;
    c.s.updOpen = true;
    c.expect({
      id: "what_task", expects: ["task_ctx", "upd_working", "upd_done", "upd_behind", "upd_nothing", "upd_nothing_ctx"], hints: ["task"],
      suggest: [{ lt: "Pasakyti, prie ko dirbi", hint: "task", options: "task" }],
      on: {
        task_ctx: (cc, sl) => react(cc, "working", sl.task),
        upd_working: (cc, sl) => react(cc, "working", sl.task, sl.whenr),
        upd_done: (cc, sl) => react(cc, "done", sl.task),
        upd_behind: (cc, sl) => react(cc, "behind", sl.task, sl.whenr),
        // "Nothing much." answers "What are you working on right now?" too
        upd_nothing: (cc) => react(cc, "nothing"),
        upd_nothing_ctx: (cc) => react(cc, "nothing"),
      },
      ask: (cc) => K(cc, "what_task_reask"),
    });
    return;
  }
  // "Nothing much." / "Not much, really.": a light update, "Okay, thanks."
  if (kind === "nothing") { K(c, "k_ok_agree"); return; }
  if (kind === "ok" || kind === "busy") { K(c, "upd_nothing_resp"); return; }
  const X = taskVar(c.s.task);
  if (kind === "done") {
    K(c, "upd_done_resp", { X });
    c.s.updOpen = true;
    expectSend(c);
    return;
  }
  // "I'm working on the report. It'll be ready by Friday.": the date is already there
  if (when) { K(c, kind === "behind" ? "upd_behind_ok" : "when_ok"); afterWhen(c); return; }
  K(c, kind === "behind" ? "upd_behind_resp" : "upd_work_resp", { X });
  c.s.updOpen = true;
  c.expect({
    id: "when_q", expects: ["when_ans", "unsure"], hints: ["when"],
    suggest: [{ lt: "Pasakyti, kada bus paruošta", hint: "when" }],
    on: {
      when_ans: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      unsure: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      g_dontknow: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
    },
    ask: (cc) => K(cc, "when_reask", { X: taskVar(cc.s.task) }),
  });
}

/** "Could you send the report to everyone after the meeting?" is open. "Could you clarify that?" gets
 *  Kate's short explanation (clarifyLast), then the question is open again. */
function expectSend(c: Ctx) {
  c.s.lastTerm = "send";
  const yes = one("send", (cc) => { cc.s.updOpen = false; K(cc, "send_yes"); });
  const no = one("send", (cc) => { cc.s.updOpen = false; K(cc, "send_no"); });
  c.expect({
    id: "send_q", optional: true, expects: ["will_send", "cant_send", "can_do", "cant_do"], hints: ["send"],
    suggest: [{ lt: "Sutikti atsiųsti", hint: "send" }],
    yes, no,
    on: {
      will_send: yes, can_do: yes, cant_send: no, cant_do: no,
      // a bare "Okay." is heard as the answer to "How's it going?" (upd_ok_ctx): here it agrees
      upd_ok_ctx: (cc) => (bareAck(cc) ? yes(cc) : false),
    },
  });
}

/** Paul sometimes offers to help when the learner is behind. */
function afterWhen(c: Ctx) {
  if (c.s.update !== "behind" || !c.s.paulHelps || c.s.helpOffered) return;
  c.s.helpOffered = true;
  P(c, "paul_help");
  c.expect({
    id: "help_offer", optional: true, expects: ["accept_help"], hints: ["g_yesno"],
    suggest: [{ lt: "Priimti Paulo pagalbą arba padėkoti", hint: "g_yesno" }],
    yes: one("help", (cc) => P(cc, "paul_talk_later")),
    no: one("help", (cc) => P(cc, "paul_ok_short")),
    on: { accept_help: one("help", (cc) => P(cc, "paul_talk_later")), g_thanks: one("help", (cc) => P(cc, "paul_talk_later")) },
  });
}

// ---------------------------------------------------------------------------
// Clarifying

function clarifyPending(c: Ctx): Pending {
  const hint = `clarify_${c.s.jargon}`;
  return {
    id: "clarify", expects: CLARIFY_EXPECTS, hints: [hint],
    suggest: [{ lt: "Paprašyti Paulo paaiškinti", hint }],
    yes: (cc) => { if (bareAck(cc)) { noQuestions(cc); return; } K(cc, "go_ahead"); cc.expect(clarifyPending(cc)); },
    no: (cc) => noQuestions(cc),
    on: {
      g_thanks: (cc) => noQuestions(cc),
      g_ok: (cc) => noQuestions(cc),
      clarify: (cc) => explainJargon(cc),
      g_dont_understand: (cc) => explainJargon(cc),
      g_meaning: (cc) => explainJargon(cc),
      word_q: (cc, sl) => wordQ(cc, sl.term),
      term_echo_ctx: (cc, sl) => wordQ(cc, sl.term),
      nothing_more: (cc) => noQuestions(cc),
      add_req: (cc) => { K(cc, "go_ahead"); cc.expect(clarifyPending(cc)); },
    },
    ask: (cc) => K(cc, "any_q_reask"),
  };
}

/** Paul says his jargon again in plain English (and checks that it's clear now). */
function explainJargon(c: Ctx) {
  if (c.s.plainSaid) { P(c, `simple_${c.s.jargon}`); c.s.clarified = true; return; }
  c.s.clarified = true; c.s.plainSaid = true;
  P(c, `plain_${c.s.jargon}`);
  P(c, "makes_sense");
  const simpler = one("sense", (cc) => P(cc, `simple_${cc.s.jargon}`));
  const fine = one("sense", (cc) => P(cc, "sense_ok"));
  c.expect({
    id: "makes_sense", optional: true, expects: ["nothing_more", "agree", "clarify"], hints: ["sense"],
    suggest: [{ lt: "Atsakyti, ar dabar aišku", hint: "sense" }],
    yes: fine, no: simpler,
    on: { nothing_more: fine, agree: fine, g_thanks: fine, g_ok: fine, clarify: simpler, g_dont_understand: simpler },
  });
}

/** "What does … mean?": Paul explains the launch words, Kate the meeting words. */
function wordQ(c: Ctx, term?: string) {
  const e = term ? TERMS[term] : undefined;
  if (!e) { if (!clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, {}); return; }
  (e[0] === "paul" ? P : K)(c, e[1]);
  if (LAUNCH_TERMS.has(term!) && c.s.jargonSaid) c.s.clarified = true;
}

/** "Could you clarify that?" anywhere: explain the last thing that could be unclear. */
function clarifyLast(c: Ctx): boolean {
  switch (c.s.lastTerm) {
    case "jargon": explainJargon(c); return true;
    case "proposal": K(c, `clarify_${c.s.proposal}`); return true;
    case "offline": K(c, "term_offline"); return true;
    case "deadline_fight": K(c, "clarify_deadline"); return true;
    case "who": K(c, "clarify_who", { X: c.s.deliv }); return true;
    case "aob": K(c, "term_aob"); return true;
    case "send": // "Could you send the report to everyone after the meeting?"
      c.s.sendClarified = true;
      K(c, byTask(c.s.task)?.attrs?.plural ? "clarify_send_them" : "clarify_send", { X: taskVar(c.s.task) });
      if (c.s.updOpen) expectSend(c); // not answered yet: the question is open again
      return true;
  }
  return false;
}

/** "No questions": Sara asks for the plain version herself. */
function noQuestions(c: Ctx) {
  if (c.s.clarified) { ack(c); return; }
  c.s.clarified = true; c.s.plainSaid = true;
  S(c, "sara_clarify");
  P(c, `plain_${c.s.jargon}`);
}

// ---------------------------------------------------------------------------
// Adding something

const ADD_REACT: Record<string, ["kate" | "paul", string]> = {
  test: ["paul", "add_test_ok"], help: ["paul", "add_help_ok"], customers: ["kate", "add_customers_ok"],
  feedback: ["kate", "add_feedback_ok"], other: ["kate", "add_other_ok"],
};

function addPoint(c: Ctx, kind: string) {
  if (!live(c)) return;
  if (kind === "help" && c.step === "owner" && !c.s.ownerDone) { withHelp(c); return; }
  if (!once(c, "addPoint")) return;
  const [who, line] = ADD_REACT[kind];
  if (c.step === "aob" && !c.s.aobDone && !c.s.closingSaid) { aobTopic(c, line, who); return; }
  (who === "paul" ? P : K)(c, line);
  c.s.addDone = true;
}

/** "Okay, thanks." to "Anything to add?": a thanks for Paul or Sara, then nothing to add. */
function nothingToAdd(c: Ctx) {
  if (c.s.addDone) return;
  thanksReply(c, true);
  c.s.addDone = true;
  K(c, "no_add_ok");
}

function expectAddWhat(c: Ctx) {
  c.expect({
    id: "add_what", optional: true, expects: [...ADD_POINTS, "add_other_ctx", "nothing_more"], hints: ["add_what"],
    suggest: [{ lt: "Pasakyti, ką nori pridurti", hint: "add_what" }],
    no: (cc) => { cc.s.addDone = true; K(cc, "no_add_ok"); },
    on: { nothing_more: (cc) => { cc.s.addDone = true; K(cc, "no_add_ok"); } },
  });
}

// ---------------------------------------------------------------------------
// The budget: what do you think?

function opinionAgree(c: Ctx) {
  if (!once(c, "agree")) return;
  c.s.opinion = "agree"; c.s.whyDone = true;
  K(c, "k_ok_agree");
  saraBudget(c);
}

function opinionUnsure(c: Ctx) {
  c.s.opinion = "unsure"; c.s.whyDone = true;
  K(c, "k_thats_ok");
  saraBudget(c);
}

/** Sara isn't sure she agrees with Paul, so Kate takes the discussion offline. */
function saraBudget(c: Ctx) {
  K(c, "sara_q"); S(c, "sara_budget");
  c.s.offlineSaid = true; c.s.lastTerm = "offline";
  K(c, "offline_sara"); P(c, "paul_sure");
}

function giveReason(c: Ctx, tags: string[]) {
  if (c.s.offlineSaid) { if (once(c, "noted")) K(c, "noted"); return; }
  if (!c.s.opinion) c.s.opinion = "disagree";
  if (!once(c, "reason")) return; // two reasons in one breath: one reaction
  c.s.reasonGiven = true; c.s.whyDone = true;
  P(c, tags.includes("split") ? "paul_split_ok" : "paul_fair");
  offlineTwo(c);
}

/** No reason (or "I don't know"): Paul accepts it and Kate takes it offline (without "Good points."). */
function whyClose(c: Ctx) {
  if (c.s.whyDone) return;
  c.s.whyDone = true;
  P(c, "paul_fair_short");
  offlineTwo(c, false);
}

function offlineTwo(c: Ctx, points = true) {
  c.s.offlineSaid = true; c.s.lastTerm = "offline";
  K(c, points ? "offline_two" : "offline_short");
  const fine = one("talk", (cc) => P(cc, "talk_later_ok"));
  c.expect({
    id: "talk_after", optional: true, expects: ["talk_later", "can_do", "agree"], hints: ["talk_after"],
    suggest: [{ lt: "Sutikti pasikalbėti su Paulu vėliau", hint: "talk_after" }],
    yes: fine, no: one("talk", (cc) => K(cc, "by_email")),
    on: { talk_later: fine, can_do: fine, agree: fine, cant_do: one("talk", (cc) => K(cc, "by_email")) },
  });
}

// ---------------------------------------------------------------------------
// The deadline (twist: Paul and Sara disagree)

function dlFrom(c: Ctx, kind: "agree" | "disagree", tags: string[]) {
  const p = tags.includes("w_paul") || tags.includes("w_him");
  const s = tags.includes("w_sara") || tags.includes("w_her");
  if (tags.includes("w_both")) { dlSide(c, "both"); return; }
  if (p === s) { dlSide(c, "ask"); return; } // "I agree with you" / "I agree": with whom?
  const withPaul = kind === "agree" ? p : s;
  dlSide(c, withPaul ? "paul" : "sara");
}

function dlView(c: Ctx, tags: string[]) {
  if (tags.includes("compromise")) dlSide(c, "short");
  else if (tags.includes("ask_client")) dlSide(c, "client");
  else if (tags.includes("side_paul")) dlSide(c, "paul");
  else if (tags.includes("side_sara")) dlSide(c, "sara");
  else dlSide(c, "ask");
}

const DL_LINE: Record<string, string> = {
  paul: "dl_paul_side", sara: "dl_sara_side", both: "dl_both", short: "dl_idea", client: "dl_client", unsure: "k_thats_ok",
};

function dlSide(c: Ctx, side: string) {
  if (c.s.dlDone) { ack(c); return; }
  if (side === "ask") {
    if (c.s.dlAsked) { dlSide(c, "unsure"); return; } // asked once already: Kate moves on
    c.s.dlAsked = true;
    K(c, "dl_which");
    c.expect({
      id: "dl_who", expects: ["who_ctx", "agree", "disagree", "dl_view"], hints: ["dl_who"],
      suggest: [{ lt: "Pasakyti, su kuo sutinki", hint: "dl_who" }],
      on: {
        who_ctx: (cc, _s, sg) => dlFrom(cc, "agree", sg.tags),
        agree: (cc, _s, sg) => dlFrom(cc, "agree", sg.tags),
        disagree: (cc, _s, sg) => dlFrom(cc, "disagree", sg.tags),
        dl_view: (cc, _s, sg) => dlView(cc, sg.tags),
        unsure: (cc) => dlSide(cc, "unsure"),
      },
      ask: (cc) => K(cc, "dl_which"),
    });
    return;
  }
  c.s.dlDone = true; c.s.dlSide = side;
  K(c, DL_LINE[side] ?? "k_thats_ok");
  // a real solution needs no more talk; otherwise it waits for after the meeting
  if (side !== "short" && side !== "client") K(c, "dl_later");
}

// ---------------------------------------------------------------------------
// Who's taking this?

function takeTask(c: Ctx) {
  if (c.s.ownerDone) { ack(c); return; }
  c.s.ownerDone = "you";
  K(c, "take_ok");
}
function declineTask(c: Ctx) {
  if (c.s.ownerDone) { ack(c); return; }
  c.s.ownerDone = "paul";
  P(c, "paul_take"); K(c, "thanks_paul");
}
function suggestOther(c: Ctx, who: "paul" | "sara") {
  if (c.s.ownerDone) { ack(c); return; }
  c.s.ownerDone = who;
  if (who === "sara") { S(c, "sara_take"); K(c, "thanks_sara"); }
  else { P(c, "paul_take2"); K(c, "thanks_paul"); }
}
function withHelp(c: Ctx) {
  if (c.s.ownerDone) { ack(c); return; }
  c.s.ownerDone = "you";
  P(c, "paul_help_sure"); K(c, "take_ok");
}

// ---------------------------------------------------------------------------
// Any other business?

function aobTopic(c: Ctx, line: string, who: "kate" | "paul" = "kate") {
  if (!live(c)) return;
  (who === "paul" ? P : K)(c, line);
  if (c.s.closingSaid || c.step !== "aob" || c.s.aobDone) return;
  c.s.aobTopics = (c.s.aobTopics || 0) + 1;
  if (c.s.aobTopics >= 2) { c.s.aobDone = true; return; }
  K(c, "aob_more");
  c.expect({
    id: "aob_more", optional: true, expects: AOB_EXPECTS, hints: ["aob_more", "aob"],
    suggest: [{ lt: "Pasakyti, kad daugiau nieko nėra", hint: "aob_more" }, { lt: "Iškelti dar ką nors", hint: "aob" }],
    yes: (cc) => { if (bareAck(cc)) { cc.s.aobDone = true; return; } K(cc, "go_ahead"); expectAobWhat(cc); },
    no: (cc) => { cc.s.aobDone = true; },
    on: { nothing_more: (cc) => { cc.s.aobDone = true; }, g_thanks: (cc) => { cc.s.aobDone = true; }, g_ok: (cc) => { cc.s.aobDone = true; } },
  });
}

function expectAobWhat(c: Ctx) {
  c.expect({
    id: "aob_what", optional: true, expects: [...AOB_TOPICS, ...ADD_POINTS, "nothing_more"], hints: ["aob"],
    suggest: [{ lt: "Iškelti savo klausimą", hint: "aob" }],
    no: (cc) => { cc.s.aobDone = true; },
    on: { nothing_more: (cc) => { cc.s.aobDone = true; } },
  });
}

// ---------------------------------------------------------------------------
// The end

function summaryYes(c: Ctx) {
  if (c.s.summaryDone) { ack(c); return; }
  c.s.summaryDone = "you";
  K(c, "summary_yes");
  c.expect(closingPending());
}
function summaryNo(c: Ctx) {
  if (c.s.summaryDone) { ack(c); return; }
  c.s.summaryDone = "kate";
  K(c, "summary_no");
  c.expect(closingPending());
}

function summaryPending(): Pending {
  return {
    id: "summary", expects: ["can_do", "cant_do", "will_send", "cant_send"], hints: ["summary"],
    suggest: [{ lt: "Sutikti atsiųsti santrauką arba atsisakyti", hint: "summary" }],
    yes: (cc) => summaryYes(cc), no: (cc) => summaryNo(cc),
    on: { can_do: (cc) => summaryYes(cc), will_send: (cc) => summaryYes(cc), cant_do: (cc) => summaryNo(cc), cant_send: (cc) => summaryNo(cc) },
    ask: (cc) => K(cc, "summary_reask"),
  };
}

function closingPending(): Pending {
  return {
    id: "closing", expects: ["bye_all"], hints: ["bye"],
    suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "bye" }],
    on: {
      bye_all: (cc) => goodbye(cc), g_bye: (cc) => goodbye(cc), g_thanks: (cc) => goodbye(cc),
      nothing_more: (cc) => goodbye(cc), g_ok: (cc) => goodbye(cc),
    },
    yes: (cc) => goodbye(cc),
    no: (cc) => goodbye(cc),
  };
}

/** Everyone says goodbye; the meeting is over. */
function goodbye(c: Ctx) {
  if (c.s.ended) return;
  c.s.ended = true;
  K(c, "bye_kate"); P(c, "paul_bye"); S(c, "sara_bye");
  c.hold();
  c.end();
}

/** Answers the simulations give to optional questions and twists. */
const AUTO: Record<string, string> = {
  notes: "Sure, no problem!",
  help_offer: "That would be great, thanks!",
  send_q: "Sure!",
  makes_sense: "Yes, thanks!",
  talk_after: "Sure, let's talk later.",
  dl_view: "I agree with Sara.",
  dl_who: "With Sara.",
  aob_more: "No, that's all.",
  summary: "Sure, I'll send it today.",
  closing: "Thanks, everyone!",
};

// ---------------------------------------------------------------------------

export const meeting: SituationDef = {
  id: "s34-meeting",
  song: 34,
  songTitle: "Any Other Business?",
  title: { en: "Any Other Business?", lt: "Ar yra kitų klausimų?" },
  topic: { en: "A work meeting", lt: "Darbo susirinkimas" },
  chapter: 4,
  order: 5,
  location: "office",
  npc: "kate",
  npcs: ["paul", "sara"],
  goal: "Dalyvauk komandos susirinkime: pristatyk savo naujienas, paprašyk paaiškinti ir padėk susirinkimą užbaigti.",
  intro: "Pirmadienio rytas „Brightline“ biure, posėdžių salėje. Susirinkimą veda Keitė, šalia sėdi Paulas, o Sara jungiasi iš namų – ją matote ekrane. Papasakok savo naujienas, paklausk, jei kas neaišku, ir pasakyk savo nuomonę.",
  entities: { task: TASKS, deliv: DELIVS },

  grammar: {
    macros: {
      sara: "[sara | hey sara | oh sara | sara sara]",
      team: "(everyone | everybody | all | guys | team | you guys | folks | all of you)",
      tdet: "[the | my | our | this | that | a | an] [new | monthly | weekly | final | client | sales | marketing | quarterly | big | first]",
      ddet: "[the | this | that | our | a | the new]",
      // "now I'm working on…", "this week I finished…"
      upd_pre: "[now | right now | at the moment | this week | today | last week | yesterday | so | well | okay so]",
      done_v: "(finished | completed | sent | submitted | done | wrote | uploaded | fixed | made | prepared | created | checked | updated | planned | organized | delivered | published | launched | closed | signed)",
      snd: "(sound | audio | voice | mic | microphone | connection | internet | video)",
      // "…, and it'll be ready by Friday" in the same breath as the update
      when_tail: "[and] [it | they | that | this | everything] [will be | should be | is going to be | are going to be | will | should] [ready | done | finished | complete] {whenr}",
      // "I'd like to add something: …" before the point itself
      add_pre: "(i would like to add (something | one thing | a thing | a point) | i want to add (something | one thing) | can i add (something | one thing) | [just] one [more] thing | one [quick] point | also | and also | i have (something | one thing) to add)",
      // "I see your point, but…": a polite start before disagreeing
      but_pre: "(i see your point | i see what you mean | i understand | i hear you | i know | i agree | (good | nice | interesting | great) idea | (it is | that is) (good | nice | interesting | a good idea | a nice idea | a great idea | true) | interesting | fair point | maybe | you are right | true) but",
      who: "(paul #w_paul | him #w_him | sara #w_sara #h:d_sara | her #w_her | you #w_you | kate #w_kate | both of you #w_both | you both #w_both | both #w_both | that | this | it | the idea | this idea | that idea | your idea | the plan | pauls idea)",
      reason_join: "[because | since | but | and | so]",
      // "Thank you, Paul." inside a longer answer (a name may only lead or end a whole sentence)
      thx: "(thank you | thanks | thank you very much | thank you so much | thanks a lot | many thanks) [paul | kate | sara]",
      // "…, and you?" (asked back)
      askback: "(and you | how about you | what about you | and yourself | how about yourself | how are you | and how are you) [kate] #askback",
      reason: [
        "[because | since | well] (it is | that is | this is | it would be | that would be | it seems) [a bit | a little | way | much | really | very] [too] (expensive | much | much money) #why #h:w_expensive",
        "[because | since | well] (it is | that is | this is | it would be | that would be | it seems) [a bit | a little | way | much | really | very] [too] risky #why #h:w_risky",
        "[because | since] (it is | that is) (a lot of | too much | so much) money [for one thing | for (ads | one party | a party)] #why",
        "[because | since] [social media | online | facebook | instagram | tv] ads (are | can be) [really | very | too] (expensive | risky | not cheap) #why",
        "[because | since] [a | the | a big | the big] [launch] (party | parties) (is | are | would be) [really | very | too] (expensive | risky | only one (night | day | evening)) #why",
        "[because | since] (we | i) (should | need to | have to | want to | would like to) keep (some | a little | a bit | part | half) [money | of it | of the money | of the budget] [for (later | testing | the launch | other things | emergencies | next month)] #why #h:w_keep",
        "[because | since] we (might | may | will | could) need (some | the) (money | of it) [later | for (testing | other things | the launch)] #why",
        "[because | since] we need [some] money for (testing | other things | later | the launch) #why",
        "[maybe | perhaps] we (could | can | should) (split | share | divide) (it | the money | the budget | everything) [fifty fifty | half and half | in half] #why #split #h:o_split",
        "(what about | how about) (half and half | fifty fifty | splitting it | splitting the money | a split) #why #split",
        "(half and half | fifty fifty) #why #split",
        "[maybe] half (for | on | into) {w:any} and half (for | on | into) {w:any} #why #split",
        "[maybe | perhaps] (only | just) (half | some | part) [of it | of the money] #why #split",
        "[maybe | perhaps] we (could | can | should) (spend | put | use) (half | some | part) [of it | of the money] [(on | into | for) {w:any}] #why #split",
        "[because] our (customers | clients | users) (do not | don't) use (social media | facebook | instagram) [much | a lot | very much] #why",
        "[because] our (customers | clients | users) are (older | old | not young) #why",
        "[because] (it is | that is) (risky | a big risk | a risk) to (spend | put) (everything | it all | all the money) (on | into) one thing #why",
        "[because] we (should not | shouldn't) (spend | put) (everything | it all | all the money | all our money) (on | into) one thing #why",
        "(do not | don't | never) put all (your | our | the) eggs in one basket #why",
        "all (our | your | the) eggs in one basket #why",
        "[because] (we | you) (do not | don't) know if (it | that) (works | will work) #why",
        "we (need | should have) a (backup plan | plan b) #why",
      ],
    },
    slots: {
      whenr: { pattern: [
        "[by | on | before | around] {day} [morning | afternoon | evening]",
        "[by | before | at] the end of (the | this | next) (week | month | day)",
        "(in | within) (a few | a couple of | {number}) (days | weeks)",
        "(today | tonight | later today | this afternoon | soon | very soon | in a few days)",
        "[by] (tomorrow | friday | monday) [at the latest]",
        "next (week | month)",
      ] },
      // launch and meeting jargon the learner may ask about ("What's QA?", "What does offline mean?")
      jterm: { lexicon: [
        { id: "beta", forms: ["beta", "a beta", "the beta", "beta version", "the beta version", "beta test"] },
        { id: "golive", forms: ["go live", "golive", "the go live", "go live date"] },
        { id: "slip", forms: ["slip", "might slip", "slipping", "slips"] },
        { id: "soft", forms: ["soft launch", "a soft launch", "the soft launch"] },
        { id: "scale", forms: ["scale up", "scaling up", "scale it up"] },
        { id: "feature", forms: ["feature complete", "future complete", "feature completed"] },
        { id: "qa", forms: ["qa", "q a", "quality assurance"] },
        { id: "blockers", forms: ["blockers", "blocker", "a blocker"] },
        { id: "offline", forms: ["offline", "off line", "take this offline", "take it offline"] },
        { id: "wrap", forms: ["wrap up", "wrap it up", "wrap"] },
        { id: "aob", forms: ["any other business", "other business", "aob", "a o b"] },
        { id: "mute", forms: ["on mute", "mute", "muted"] },
      ] },
      // everyday meeting words: only "What's a deadline?", never "What's the deadline?" (= when)
      bterm: { lexicon: [
        { id: "deadline", forms: ["deadline", "deadlines"] },
        { id: "agenda", forms: ["agenda"] },
        { id: "launch", forms: ["launch", "app launch"] },
      ] },
    },
  },

  intents: {
    // --- Sara on mute -----------------------------------------------------------------------
    tell_mute: { patterns: [
      "@sara you are (on mute | muted) [sara] #h:m_on_mute",
      "@sara i think you are [still] (on mute | muted) [sara] #h:m_think",
      "@sara you are still (on mute | muted) [sara]",
      "@sara you are (on mute | muted) again",
      "@sara (click | press | tap) [on] (the | your) [red] (microphone | mic | mute | unmute) [button | icon] #h:m_click",
      "@sara you (need | have) to unmute [yourself] #h:m_unmute",
      "@sara unmute [yourself] [sara]",
      "@sara (turn on | switch on) (your | the) (microphone | mic | sound | audio)",
      "@sara [i think] your (microphone | mic) is (off | muted | red | not on)",
      "[i think] (sara | she) is [still] (on mute | muted)",
      "@sara check your (microphone | mic | sound | audio)",
      "[maybe] (saras | her) (microphone | mic) is (off | muted | not on)",
      "@sara (microphone | mic | mute | unmute) [button]",
      "(sara | she) (needs | has) to unmute [herself]",
      "@sara (on mute | muted)",
    ] },
    // "Sara? We can't hear you." (only while she is on mute)
    tell_mute_ctx: { patterns: [
      "@sara we can not hear you [sara] [at all] #h:m_cant_hear",
      "@sara (we | i) (do not | can not) hear you [at all]",
      "@sara (can you hear (us | me) | are you there)",
      "(hello | hi) sara can you hear (us | me)",
      "(we | i) can not hear (sara | her) [at all]",
      "(sara | she) has no sound", "there is no sound", "no sound",
      "sara", "sara hello",
    ] },
    not_muted: { patterns: ["@sara you are not (on mute | muted)", "(she | sara) is not (on mute | muted)"] },
    greet_team: { patterns: [
      "(hi | hello | hey | morning | good morning) (kate | @team | paul | sara)",
      "(hi | hello | hey | morning | good morning) (kate | @team | paul | sara) [and] (kate | @team | paul | sara)",
    ] },
    hear_yes: { patterns: [
      "[yes] [i | we] can hear you [fine | okay | well | perfectly | now | loud and clear] [sara] #h:h_yes",
      "[yes] (loud and clear | perfectly | all good | i hear you [fine]) #h:h_loud",
      "[yes] (now)? we (can | do) [hear you] [now]",
      "[yes] i can (hear | see) you and (hear | see) you [too]",
      "[yes] i can hear and see you",
      "[yes] (you are | it is | that is) (fine | good | clear | better | much better | loud and clear) [now]",
      "[yes] (much | a lot | way | a little | a bit) better [now]",
      "[yes] (everything | all) is (fine | okay | good | perfect | working) [now]",
      "[yes] (the | your) @snd is (good | fine | okay | clear | perfect | great) [now]",
      "[yes] (perfect | great | good | fine | okay | all good) [now]",
      "[yes] now it is (okay | fine | good | better | perfect | much better)", "now yes",
      "[yes] you are back", "[yes] (welcome back | welcome | hi | hello) sara", "[yes] [now] it works [now]",
      "[yes] i can (hear | see) you [and (hear | see) you] [very] (well | good | fine | okay | clearly)",
      "[yes] (i | we) hear you (good | well | fine | okay | now)",
    ] },
    hear_no: { patterns: [
      "[no] (i | we) can not hear you [very well | at all | now]",
      "[sorry] you are (a bit | a little | very | really | too | kind of) quiet",
      "[no] (not very well | barely | not really)",
      "[sorry] (you are | it is) (breaking up | choppy)",
      "[no] still (nothing | not) [sorry] #h:h_no",
      "[no] (we | i) still can not hear (you | her | anything)",
      "[no] (nothing | not) yet",
      "[sorry] (you are | your voice is | the sound is | it is | the audio is) [a bit | a little | very | really | too | still] (quiet | low | bad | not good | not clear)",
      "i can see you but i can not hear you", "there is [still] no (sound | audio)",
      "[no] (i | we) (do not | can not) hear (anything | you) [at all]",
      "(can | could) you (speak | talk) (louder | up | a bit louder | a little louder | more loudly)",
      "[no] still [a bit | very | too] (quiet | bad | the same)", "still no", "[no] still no (sound | audio)",
      "[no] you are still (on mute | muted)",
    ] },

    // --- updates ------------------------------------------------------------------------------
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
      "i am [still] working on @tdet {task} [right now | now | this week | today] [@when_tail] #h:u_working",
      "i am (almost | nearly) (done | finished) with @tdet {task} [@when_tail] #h:u_almost",
      "@tdet {task} (is | are) (almost | nearly) (done | ready | finished) [@when_tail]",
      "i am (writing | preparing | finishing | updating | making | doing | fixing | checking | planning | creating) @tdet {task} [@when_tail]",
      "i am halfway through @tdet {task} [@when_tail]",
      "i (started | have started) @tdet {task} [@when_tail]",
      "i am busy with @tdet {task} [@when_tail]",
      "@tdet {task} will be (ready | done | finished) [{whenr}] #h:u_ready",
      "@tdet {task} (should | is going to | are going to) be (ready | done | finished) {whenr}",
      "i will finish @tdet {task} [{whenr}]",
      "@upd_pre i am [still] working on @tdet {task} [right now | now | this week | today | for (next | this) (month | week | quarter | year)] [@when_tail]",
      "@upd_pre i (worked | was working) on @tdet {task}",
      "@upd_pre i am (writing | preparing | finishing | updating | making | doing | fixing | checking | planning | creating) @tdet {task} [@when_tail]",
    ] },
    upd_behind: { patterns: [
      "i (have not | did not) (finished | finish | started | start | sent | send | done | do) @tdet {task} [yet] [@when_tail]",
      "@tdet {task} (is not | are not) (ready | done | finished) [yet] [@when_tail]",
      "i am (a bit | a little | slightly | kind of | really) behind (with | on) @tdet {task} [@when_tail] #h:u_behind",
      "i am behind (with | on) @tdet {task} [@when_tail]",
      "i need more time (for | with) @tdet {task}",
      "i am having (problems | trouble | some problems | some trouble) with @tdet {task}",
      "i am [a bit | a little | slightly | kind of | really] late (with | on) @tdet {task} [@when_tail]",
      "i have [some | a few] (problems | trouble | issues) with @tdet {task}",
    ] },
    upd_ok: { patterns: [
      "(everything | it | things) (is | are) (going (well | fine | great | okay) | on track | good | fine) [thanks] [@askback] #h:u_track",
      "(all good | so far so good) [thanks] [@askback]",
      "it is going (well | fine | great | okay) [so far] [thanks] [@askback]",
    ] },
    // "Good, thanks!" / "Busy!" to "How's it going?"
    upd_ok_ctx: { patterns: [
      "[i am] [doing] (good | fine | great | pretty good | not bad | okay | all good | really good | very good | well) [thanks | thank you] [kate] [@askback]",
      "[i am] (busy | pretty busy | very busy | really busy | super busy | crazy) [week] [thanks] [as (always | usual)] [@askback] #busy",
      "[it is going] (well | fine | great | okay) [thanks] [@askback]",
    ] },
    upd_nothing: { patterns: ["(not much | nothing) (new | to report) [this week | today]", "nothing new [from me]", "not much to (say | report | tell) [this week]"] },
    // a light update, only to Kate's "How's it going?" / "What are you working on?" (elsewhere "Nothing much." = nothing_more)
    upd_nothing_ctx: { patterns: [
      "(nothing | not) much [really] [going on | happening] [really] [this week | today | right now | at the moment]",
      "nothing (special | exciting | big) [really] [this week | today | right now | at the moment]", "not a lot [really] [this week | today]",
    ] },
    task_ctx: { patterns: ["[it is] @tdet {task}", "[mostly] @tdet {task}", "on @tdet {task}",
      // "Nothing much, just the report."
      "(nothing | not) (much | special) [really] (just | only | mostly) [working on | on] @tdet {task}"] },
    when_ans: { patterns: [
      "[maybe | probably | hopefully | i think | i hope] [it will be (ready | done) | i will finish it | i can finish it | it should be (ready | done)] {whenr} #h:w_when",
      "(it is | it will be) ready {whenr} #h:w_ready",
    ] },
    unsure: { patterns: [
      "i am not sure [yet] #h:w_unsure", "i do not know [yet]", "no idea [yet]", "(it is | that is) hard to say", "i will let you know",
      "i (need to | have to | must) think [about it]", "let me think [about it]", "i can not decide",
      "i (do not | don't) have an opinion", "i have no opinion", "(it | that) depends",
      "i am not sure what (to say | i think)", "i do not know what to (say | think)", "good question",
    ] },
    will_send: { patterns: [
      "[sure | of course | yes | okay] i will send (it | them | the report | it to you | it to everyone | the summary | a summary) [to (you | everyone)] [after the (call | meeting) | today | tonight | right after | later | right after the meeting]",
      "[sure | yes] right after the (call | meeting)",
      "[yes] i will email (it | them) [to (you | everyone)]",
      "i [already] sent (it | them) [to (you | everyone)] [yesterday | this morning | already]",
    ] },
    cant_send: { patterns: [
      "[sorry] i (can not | can't) send (it | them | the report | the summary) [today | now | right now | after the meeting]",
      "[sorry] (it is | the report is) not (ready | finished) [yet]",
    ] },
    accept_help: { patterns: [
      "(that | it) would be (great | nice | awesome | helpful) [thanks] [paul]",
      "[yes] that would be (great | nice | awesome | helpful) [thanks] [paul]",
      "[sure] thanks paul", "[yes] i would love that",
    ] },

    // --- clarifying ---------------------------------------------------------------------------
    clarify: { patterns: [
      "(could | can | would) you clarify (that | this | it | what you (said | mean)) [for (me | us)] #h:c_clarify",
      "(could | can | would) you clarify [please]",
      "(could | can | would) you explain (that | this | it | what you (said | mean)) [again] [(in | with) (simple | simpler | plain | easy | easier | other) (words | english)]",
      "(could | can | would) you say (that | it | this) (more simply | in (simple | simpler | plain | easy | easier | other) (words | english) | in a (simpler | easier) way) #h:c_simple",
      "(could | can) you (explain | say) (it | that | this) (simpler | easier)",
      "(could | can) you explain [please]",
      "[sorry] what do you mean [exactly | by that] #h:c_what_mean",
      "[sorry] what does (that | it | this | all that) mean [exactly]",
      "[sorry] i (do not | did not) understand (that | this | it | what you (said | mean) | the last part | everything | all of that)",
      "[sorry] i (do not | did not) understand",
      "[sorry] i still (do not | don't) understand [it | that | you]",
      "i (do not | did not | can not) follow [you | that]",
      "i am [a little | a bit] (lost | confused)",
      "(that | it) is [a little | a bit | too | very] (confusing | complicated | technical)",
      "(in | with) (plain | simple) (english | words)",
      "what is (that | this) [exactly]",
      "what (exactly)? does (that | this) mean",
    ] },
    word_q: { patterns: [
      "[sorry] what (does | do) [the word] ({term:jterm} | {term:bterm}) mean [exactly] #h:c_mean_by",
      "[sorry] what do you mean by [the word] ({term:jterm} | {term:bterm})",
      "[sorry] what (is | are) {term:jterm} [exactly] #h:c_whats",
      "[sorry] what is (a | an) {term:bterm}",
      "[sorry] what is the meaning of [the word] ({term:jterm} | {term:bterm})",
      "(could | can) you explain [the word] ({term:jterm} | {term:bterm})",
      "[sorry] i do not (know | understand) [the word] ({term:jterm} | {term:bterm})",
      "[sorry] {term:jterm} (means what | what does it mean | what is it | what is that)",
      "[sorry] what is this {term:jterm}",
    ] },
    // "Go-live?" (an echo question right after the jargon)
    term_echo_ctx: { patterns: ["[sorry] {term:jterm}", "{term:jterm} what"] },

    // --- adding something ------------------------------------------------------------------------
    add_req: { patterns: [
      "i would like to add (something | one thing | a thing | a point | a comment) #h:a_add",
      "(can | could | may) i add (something | one thing | a thing | a point | a comment) #h:a_can_add",
      "i (want | need) to add (something | one thing | a point)",
      "i have (something | one thing | a point | a comment) [to add]",
      "[just] one [more] (thing | point | comment)",
      "(one | a) quick (thing | point | comment | question)",
      "(let me | can i) add (something | one thing | a point)",
      "i have (one | a) [quick] (question | comment | point) [for (paul | you | kate)]",
      "(can | could | may) i ask (something | a question | you something)",
      "just a [quick] (question | comment)",
      "(one | a) [quick] question [for (paul | you | kate)]",
    ] },
    add_test: { patterns: [
      "[@add_pre] we (should | need to | have to | must | could | can) test (it | the app) (on | with) (older | old) (phones | devices | models | android phones | iphones) [too | as well] #h:a_test",
      "[@add_pre] we (should | need to | have to | must) (test | check) (it | the app) (more | again | better | a lot | carefully | on more phones)",
      "[@add_pre] (we need | it needs | the app needs) more (testing | tests)",
      "[@add_pre] (let us | maybe we could | we could) [also] test (it | the app) on (older | old) phones [too]",
      "[@add_pre] (what about | how about) (older | old) phones",
      "[@add_pre] (it | the app) (should | must | needs to) work on (older | old) phones [too]",
      "[@add_pre] (do not | don't) forget (older | old) phones",
      "[@add_pre] (older | old) phones [too]",
    ] },
    add_help: { patterns: [
      "[@add_pre] i (can | could) help (with | you with) [the] (testing | tests) [paul] #h:a_help",
      "[@add_pre] i (can | could) help [you] [paul] [with (that | it | this)]",
      "[@add_pre] i (can | could) test (it | the app) [too | for you]",
      "[@add_pre] (i am | i would be) happy to help [with [the] testing]",
      "[@add_pre] i would like to help [with [the] testing]",
      "[@add_pre] i (can | could) be a tester",
      "[@add_pre] i (can | could) do [some | the] testing",
      "[@add_pre] let me help [with [the] testing]",
    ] },
    add_customers: { patterns: [
      "[@add_pre] (our | the) (customers | clients | users) (are | keep) asking (about | when) [the] (launch | launch date | app | release | release date | date | it) [is ready] #h:a_customers",
      "[@add_pre] (customers | clients | users) (want to know | ask | always ask) (when | about) [the] (launch | app | release | date | it) [date | is ready]",
      "[@add_pre] [the | our] (customers | clients) are (waiting | excited) [for (it | the app | the launch)]",
      "[@add_pre] (a lot of | many) (customers | clients | people) (are asking | ask) about (it | the app | the launch)",
    ] },
    add_feedback: { patterns: [
      "[@add_pre] we should ask [the] (users | customers | clients) for feedback #h:a_feedback",
      "[@add_pre] (let us | we could | we need to | we should) (ask | get) [the] (users | customers | clients) [for] (feedback | their opinion)",
      "[@add_pre] (let us | we could | we need to | we should) (ask for | get | collect) [some] feedback [from [the] (users | customers)]",
      "[@add_pre] we need [more | some] feedback [from [the] (users | customers)]",
      "[@add_pre] (what about | maybe) a (feedback | survey) (button | form)",
      "[@add_pre] we (should | could) (do | send) a (survey | feedback survey) [to [the] (users | customers)]",
    ] },
    // anything else the learner wants to add (only right after "Anything to add?" / "Go ahead!")
    add_other_ctx: { patterns: [
      "@add_pre {w:any}",
      "[maybe | perhaps] (we | you) (should | could | need to | have to | must) {w:any}",
      "[maybe | perhaps] (we | you) (should | could | need to | have to | must) [also] (make | do | add | create | get | try | send | write | update | change | use | buy | hire | plan | start) {w:any}",
      "(the | our) (client | clients | customers | users | boss | designers | developers) {w:any}",
    ] },
    nothing_more: { patterns: [
      "no questions [from me] [for now] #h:c_none",
      "[no] (nothing | not) from me #h:b_none",
      "[no] (nothing | not) from my side",
      "[no] nothing [else | more] [from me] [for now | today]",
      "[no] (nothing | not) much [really] [from me]", "[no] nothing special [from me]",
      "[all] clear [now] [thanks]",
      "[no] i (do not | don't) (want to | need to) add anything",
      "[no] (it is | that is | everything is) [all] clear [now]",
      "[no] i (do not | don't) have any (questions | more questions | other questions) [for now]",
      "[no] i have no [more] questions",
      "[no] that is all [from me] [for now | for today] #h:a_none #h:b_all",
      "[no] (that is | it is) it [from me]",
      "[no] i am (good | fine | okay | all good)",
      "[no] (all | everything) [is] (good | clear | fine) [from me | here]",
      "[no] nothing to add",
      "[no] i (have | have got) nothing (to add | else | more)",
      "[no] i (understand | understood) [everything | it | that] [now]",
      "[no] (it | that) (makes sense | is clear) [now]",
      "@thx [so | okay | now] ((that | it) (makes sense | is clear | is much clearer | is clearer) [now] | now (it | that) (is clear | makes sense) | [i] got it | [now] i (understand | get it) [now] | i see) #h:s_got",
      "now (it | that) (is clear | makes sense) [thanks]", "(that | it) is [much] clearer [now]", "[now] i get it [now]",
      "[no] (got it | i got it)",
      "[no] no other business",
      "[no] nothing (today | this week)",
      "[no] that is everything",
      "[no] i think (that is all | we are done | we covered everything)",
    ] },

    // --- the budget: opinions ---------------------------------------------------------------------
    disagree: { patterns: [
      "i am not [so | really | completely | totally] sure i agree [with @who] [@reason_join @reason] #h:o_not_sure",
      "i am not [so | really | completely | totally] sure (about (that | this | it | the idea) | (that is | it is) a good idea | (that is | it is) right) [@reason_join @reason]",
      "@but_pre [i am not sure | i do not agree | i disagree | i do not think so | not all of it | not everything | not all the money] [@reason] #h:o_see_point",
      "i do not [really | quite | completely | totally | fully] agree [with @who] [@reason_join @reason] #tip:soft_disagree",
      "i (disagree | have to disagree) [with @who] [@reason_join @reason] #tip:soft_disagree",
      "i am afraid i (do not | don't) agree [with @who] [@reason_join @reason]",
      "i do not think (that is | it is | this is) a (good | great) idea [@reason_join @reason]",
      "i do not think we should (do that | do it | spend it all | spend everything | spend all of it | put everything into it)",
      "(it is | that is) not a (good | great) idea [@reason_join @reason] #tip:soft_disagree",
      "(it is | that is) a bad idea [@reason_join @reason] #tip:soft_disagree",
      "[maybe] not (all of it | everything | all the money | the whole budget) [@reason_join @reason]",
      "i have (a different idea | another idea | a different opinion | some doubts | my doubts) [@reason]",
      "i am not (convinced | a fan | a fan of (that | this | the idea)) [@reason_join @reason]",
      "i (do not | don't) like (that | this | the) idea [@reason_join @reason]",
      "i am [a bit | a little | slightly] worried about (that | it | this) [@reason_join @reason]",
      "i do not know about that",
      "(paul | he) is not right #w_paul",
      "i do not think (paul | he) is right #w_paul",
      "i am not agree [with @who] [@reason_join @reason]",
    ] },
    agree: { patterns: [
      "i [completely | totally | fully | really] agree [with @who] [completely | totally | one hundred percent] #h:o_agree",
      "(good | great | nice | excellent | brilliant) idea [paul] #h:o_good_idea",
      "(that | it) (sounds | is) (good | great | fine | smart | reasonable | a good idea | a great idea | like a good idea | like a plan | perfect) [to me]",
      "(that | it) makes (sense | a lot of sense) [to me] #h:o_makes_sense",
      "@thx (that | it) makes (sense | a lot of sense) [to me]",
      "[yes] let us do (it | that)",
      "sounds (good | great | fine) [to me]",
      "i think (it is | that is) a (good | great) idea",
      "i think (paul | he) is right #w_paul #h:d_paul",
      "(paul | he) is right #w_paul #h:d_paul",
      "(sara | she) is right #w_sara",
      "(paul | he) has a (point | good point) #w_paul",
      "(sara | she) has a (point | good point) #w_sara",
      "you are [both] right #w_you",
      "i like (it | that | the idea | this idea | that idea | your idea | the plan)",
      "(it is | that is) not a bad idea",
      "not a bad idea",
      "i am (for it | with @who | on pauls side | on saras side)",
      "i am in favor [of (it | that | the idea)]",
      "i support (it | that | the idea | paul #w_paul | him #w_him | sara #w_sara | her #w_her)",
      "(social media | ads | online ads) (is | are) (important | the future | popular | a good idea)",
      "(a | the) party (is | sounds) (fun | great | a good idea)",
    ] },
    // a reason or an alternative: an implicit, polite "no" ("It's too expensive.", "Maybe we could split it?")
    reason: { patterns: ["@reason"] },
    // "Who, me?" (to "Who's taking this?", "What do you think?" …)
    who_me: { patterns: ["who me", "(you mean | do you mean | are you asking | are you talking to) me", "is it me", "me"] },
    // "What do you think, Kate?" (asked back)
    ask_back: { patterns: ["what do you think [kate]", "(and | what about | how about) you [kate]", "what is your opinion [kate]"] },
    talk_later: { patterns: [
      "[sure | okay | yes | of course] (let us | we can | we could) (talk | chat | discuss it) (later | after the meeting | after this | after lunch | over coffee) [paul] #h:t_sure",
      "[sure | yes] (let us | we can) (grab | get | have) [a] coffee [later | after the meeting | after this]",
      "[sure | yes] i am free (after the meeting | later | after lunch | this afternoon)",
      "[sure] after the meeting (is | works) (fine | good | okay | for me)",
    ] },

    // --- the deadline (twist) ---------------------------------------------------------------------
    dl_view: { patterns: [
      "(friday | this friday) (is | would be | sounds) (fine | okay | good | possible | better | doable | important) [for me] #side_sara",
      "we (can | could) (do it | finish it | make it | get it done) (by | on) friday #side_sara",
      "[the] client (is | comes) [more] (important | first) #side_sara",
      "we (should | have to | must) (keep | stick to) [the] (deadline | friday) #side_sara",
      "(we | they | paul) (need | needs) (more time | another week | one more week | an extra week) #side_paul",
      "(one more | another | next | an extra) week (is | would be | sounds) (better | fine | okay | good) #side_paul",
      "friday is (too soon | too early | not enough | not possible) #side_paul",
      "(quality | a good product) is more important #side_paul",
      "[maybe | perhaps] we (could | can | should) (send | give | do | share) [a | the] (short | shorter | first | small | quick) (version | draft) [(on | by) friday] [and the (rest | full one | full version | final version) next week] #compromise #h:d_short",
      "(what about | how about) a (short | shorter | first | quick) (version | draft) [(on | by) friday] #compromise",
      "[maybe | perhaps] we (could | can | should) (ask | call | talk to | email) the client [for more time | first | about it] #ask_client #h:d_client",
      "(let us | why not) ask the client [for more time] #ask_client",
    ] },
    // "With Sara." (to "With Paul or with Sara?")
    who_ctx: { patterns: ["[with] (paul #w_paul | him #w_him) #h:d_with", "[with] (sara #w_sara | her #w_her) #h:d_with", "[with] both [of them] #w_both"] },

    // --- who's taking this? --------------------------------------------------------------------------
    can_do: { patterns: [
      "[sure | yes | okay | of course] i (can | could) do (it | that | this | this one | that one) #h:o_can",
      "[sure | yes | okay | of course] i will (do | take) (it | that | this | this one | that one) #h:o_take",
      "i can take (it | that | this | this one)",
      "(let me | i would like to | i want to) (do | take) (it | that | this | this one)",
      "(i am | i would be) happy to [do it | take it | help | do that]",
      "i (can | will | could) (do | take | write | make | prepare) @ddet {deliv}",
      "i (can | will) (take care of | handle) (it | that | this | @ddet {deliv})",
      "i am on it", "leave it (to | with) me", "i (will)? volunteer", "count on me",
      "[sure | of course] i (can | will) take [the] notes",
    ] },
    can_do_ctx: { patterns: ["me", "[yes] i can", "[yes] i will", "i could", "me i can do it"] },
    cant_do: { patterns: [
      "[sorry] i (can not | could not) (do | take) (it | that | this | this one) [this week | today | right now | now] #h:o_cant",
      "[sorry] i am [too | really | very | so] busy [this week | today | right now | at the moment] #h:o_busy",
      "[sorry] i (do not | don't) have (time | the time | enough time) [this week | today | for (it | that | this)]",
      "[sorry] i have (too much | a lot of) work [this week | today | right now]",
      "[sorry] not me [this time | this week]",
      "[sorry] i (can not | can't) [this week | today | right now]",
      "[sorry] i (do not | don't) have my laptop [today | with me]",
      "i would like to but i (can not | can't) [this week]",
      "[sorry] i (can not | can't) take [the] notes [today]",
    ] },
    suggest_other: { patterns: [
      "[maybe | perhaps] paul (can | could) (do it | take it | do that | take that) #paul #h:o_paul",
      "(can | could) paul (do | take) (it | that) #paul",
      "paul (can | could) you (do | take) (it | that | this) #paul",
      "(what about | how about) paul #paul", "maybe paul #paul", "ask paul #paul",
      "[maybe | perhaps] sara (can | could) (do it | take it | do that | take that) #sara",
      "(can | could) sara (do | take) (it | that) #sara",
      "sara (can | could) you (do | take) (it | that | this) #sara",
      "(what about | how about) sara #sara", "maybe sara #sara",
    ] },
    with_help: { patterns: [
      "i (can | could) do it (with paul | together with paul | if paul helps [me])",
      "i (can | could) do it but i (need | would need | will need) [some] help",
      "(paul | sara) and i (can | could) do it",
      "i can do part of it",
    ] },

    // --- any other business? ---------------------------------------------------------------------------
    aob_wfh: { patterns: [
      "(can | could | may) i work from home (on friday | tomorrow | next week | on monday | this friday) #h:b_wfh",
      "i would like to work from home (on friday | tomorrow | next week)",
      "is it okay if i work from home [on friday | tomorrow]",
      "i (need | want) to work from home [on friday | tomorrow]",
    ] },
    aob_lunch: { patterns: [
      "when is the team (lunch | dinner | party) #h:b_lunch",
      "(is there | are we having) a team (lunch | dinner | party) [this month | soon]",
      "what about the team (lunch | party)",
    ] },
    aob_vacation: { patterns: [
      "i am on vacation next week #h:b_vacation",
      "i am on holiday next week #tip:us_vacation",
      "i will be (on vacation | away | out | out of the office | off) next week",
      "i will be on holiday next week #tip:us_vacation",
      "i am (off | away | out) next (week | monday | friday)",
      "i will not be here next week",
    ] },
    aob_printer: { patterns: [
      "the printer is (broken | not working | jammed) [again] #h:b_printer",
      "the printer (does not | doesn't) work [again]",
      "(can someone | could someone | can you) fix the printer",
    ] },
    // another question at "Any other business?" (only then)
    aob_other_ctx: { patterns: ["(what | how | when | where | who | is there | are there | do we | can i | can we | could we | could i | should we | will we) {w:any}", "i (want | would like | need) to (talk | ask) about {w:any}"] },

    // --- side questions and goodbyes ------------------------------------------------------------------
    q_agenda: { patterns: ["what is [on] the agenda [today | for today]", "what are we (talking about | discussing) today", "what are the (topics | points) [today]"] },
    q_deadline: { patterns: ["(when | what) is the deadline [for @ddet {deliv}]", "when is (it | that) due", "when do you need (it | that | @ddet {deliv})"] },
    q_next: { patterns: ["when is the next meeting", "when do we meet again", "when is (the | our) next (meeting | call)"] },
    bye_all: { patterns: [
      "(bye | goodbye | see you | see you later | talk to you later | take care | bye bye) [@team | kate]",
      "have a (good | nice | great) (day | week | afternoon) [@team]",
      "(thanks | thank you) @team [bye] #h:b_thanks",
      "(thanks | thank you) [kate] (see you | see you later | bye) #h:b_see",
      "(great | good | nice | productive) meeting [@team] [thanks] #h:b_great",
    ] },
  },

  lines: {
    // --- opening, Sara on mute -------------------------------------------------------------------
    open: [
      t("Morning, | everyone! | Okay, | let's get started.", "Labas rytas | visiems! | Gerai, | pradėkime.", "Labas rytas visiems! Gerai, pradėkime."),
      t("Hi, | everyone! | Thanks | for | coming. | Let's get started.", "Labas | visiems! | Ačiū, | kad | atėjote. | Pradėkime.", "Labas visiems! Ačiū, kad atėjote. Pradėkime.",
        { flags: { 3: "“for” + -ing: Lithuanian needs a kad-clause; atėjote carries “coming”." } }),
    ],
    sara_joins: [
      t("And | Sara | is joining | us | from | home | today. | Hi, | Sara!", "O | Sara | jungiasi | prie mūsų | iš | namų | šiandien. | Labas, | Sara!", "O Sara šiandien jungiasi iš namų. Labas, Sara!"),
    ],
    no_sound: [
      t("Hmm, | she's talking, | but | there's | no | sound.", "Hmm, | ji kalba, | bet | nėra | jokio | garso.", "Hmm, ji kalba, bet garso nėra.",
        { flags: { 3: "Negative concord: the ne- of nėra comes from “no” (C-CONCORD)." } }),
      t("She's saying | something, | but | we | can't hear | her.", "Ji sako | kažką, | bet | mes | negirdime | jos.", "Ji kažką sako, bet mes jos negirdime."),
    ],
    sara_cant_hear: [
      t("Sara? | We | can't hear | you | at all.", "Sara? | Mes | negirdime | tavęs | visai.", "Sara? Mes tavęs visai negirdime."),
      t("Sara? | Sara... | we | can't hear | you.", "Sara? | Sara... | mes | negirdime | tavęs.", "Sara? Sara... mes tavęs negirdime."),
    ],
    paul_mute: [
      t("Sara, | you're | on mute!", "Sara, | tu esi | nutildyta!", "Sara, tavo mikrofonas išjungtas!"),
    ],
    sara_unmuted: [
      t("Oops! | Sorry! | Can | you | hear | me | now?", "Oi! | Atsiprašau! | Ar | jūs | girdite | mane | dabar?", "Oi! Atsiprašau! Ar dabar mane girdite?", { flags: { 2: F_CAN_P } }),
      t("Oh, | sorry! | Is | this | better?", "Oi, | atsiprašau! | Ar | taip | geriau?", "Oi, atsiprašau! Ar taip geriau?", { flags: { 2: F_IS_Q } }),
    ],
    sara_now: [
      t("What about | now?", "O | dabar?", "O dabar?"),
    ],
    hear_now_kate: [
      t("Oh, | now | we | can | hear | you!", "O, | dabar | mes | — | girdime | tave!", "O, dabar tave girdime!", { flags: { 3: F_CAN_S } }),
    ],
    sara_ok: [
      t("Great! | Sorry | about | that, | everyone.", "Puiku! | Atsiprašau | dėl | to, | visi.", "Puiku! Atsiprašau visų."),
      t("Perfect. | Sorry, | guys!", "Puiku. | Atsiprašau, | draugai!", "Puiku. Atsiprašau, draugai!"),
    ],
    not_muted_resp: [
      t("Hmm, | I | think | she | is. | Her | microphone | is | red.", "Hmm, | aš | manau, | ji | [nutildyta]. | Jos | mikrofonas | yra | raudonas.", "Hmm, manau, kad ji nutildyta. Jos mikrofonas raudonas.",
        { flags: { 4: "Elliptical “is” (she is on mute): Lithuanian repeats the predicate nutildyta." } }),
    ],
    hi_back: [
      t("Hi!", "Labas!", "Labas!"),
    ],

    // --- notes (twist) ---------------------------------------------------------------------------
    notes_ask: [
      t("Oh, | and | could | you | take notes | today?", "O, | ir | ar galėtum | tu | užsirašinėti | šiandien?", "O, ir ar galėtum šiandien užsirašinėti?"),
    ],
    notes_thanks: [
      t("Thanks!", "Ačiū!", "Ačiū!"),
      t("Great, | thank | you!", "Puiku, | dėkoju | tau!", "Puiku, ačiū!"),
    ],
    notes_paul: [
      t("No | problem. | Paul, | can | you | do | it?", "Jokių | problemų. | Paulai, | ar gali | tu | padaryti | tai?", "Nieko tokio. Paulai, gal tu gali?"),
    ],
    paul_sure: [
      t("Sure.", "Žinoma.", "Žinoma."),
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
    ],

    // --- agenda and updates -------------------------------------------------------------------------
    agenda: [
      t("So, | we | have | three | things | today: | the | app | launch, | the | budget | and | the | next | deadline.", "Taigi, | mes | turime | tris | dalykus | šiandien: | — | programėlės | paleidimą, | — | biudžetą | ir | — | artimiausią | terminą.",
        "Taigi, šiandien turime tris dalykus: programėlės paleidimą, biudžetą ir artimiausią terminą."),
      t("Okay. | Three | things | on the agenda: | the | app | launch, | the | budget | and | the | next | deadline.", "Gerai. | Trys | dalykai | darbotvarkėje: | — | programėlės | paleidimas, | — | biudžetas | ir | — | artimiausias | terminas.",
        "Gerai. Darbotvarkėje trys dalykai: programėlės paleidimas, biudžetas ir artimiausias terminas."),
    ],
    updates_first: [
      t("But | first, | quick | updates. | Paul?", "Bet | pirma, | trumpos | naujienos. | Paulai?", "Bet pirma – trumpai apie naujienas. Paulai?"),
    ],
    paul_update: [
      t("The | app | is | almost | ready. | We're | just | fixing | a | few | bugs.", "— | Programėlė | yra | beveik | paruošta. | Mes | tik | taisome | — | kelias | klaidas.", "Programėlė beveik paruošta. Tik taisome kelias klaidas.",
        { flags: { 5: "“'re” (are): progressive auxiliary; the present tense of taisome carries it." } }),
      t("Busy | week! | I'm | still | fixing | bugs | in the app.", "Įtempta | savaitė! | Aš | vis dar | taisau | klaidas | programėlėje.", "Įtempta savaitė! Vis dar taisau programėlės klaidas.",
        { flags: { 2: "“'m” (am): progressive auxiliary; the present tense of taisau carries it." } }),
    ],
    upd_you: [
      t("Thanks, | Paul. | And | you? | How's it going?", "Ačiū, | Paulai. | O | tu? | Kaip sekasi?", "Ačiū, Paulai. O tu? Kaip sekasi?"),
      t("Okay. | What about | you? | What | are | you | working on?", "Gerai. | O | tu? | Prie ko | — | tu | dirbi?", "Gerai. O tu? Prie ko dirbi?", { flags: { 4: F_PROG } }),
    ],
    upd_reask: [
      t("So, | what | are | you | working on | these | days?", "Tai | prie ko | — | tu | dirbi | šiomis | dienomis?", "Tai prie ko dirbi šiomis dienomis?", { flags: { 2: F_PROG } }),
    ],
    upd_done_resp: [
      t("Great job! | Could | you | send | {X.the} | to everyone | after | the | meeting?", "Puikiai padirbėta! | Ar galėtum | tu | atsiųsti | {X.the:acc} | visiems | po | — | susirinkimo?",
        "Puikiai padirbėta! Ar galėtum po susirinkimo atsiųsti {X.the:acc} visiems?"),
    ],
    upd_work_resp: [
      t("Sounds | good. | When | do | you | think | {X.the} | will be | ready?", "Skamba | gerai. | Kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?",
        "Gerai. Kaip manai, kada {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 3: F_DO_WH } }),
    ],
    upd_behind_resp: [
      t("No | worries. | When | do | you | think | {X.the} | will be | ready?", "Jokių | rūpesčių. | Kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?",
        "Nieko tokio. Kaip manai, kada {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 3: F_DO_WH } }),
    ],
    when_reask: [
      t("So, | when | do | you | think | {X.the} | will be | ready?", "Tai | kada | — | tu | manai, | {X.the:nom} | bus | {paruoštas@X:nom}?",
        "Tai kaip manai, kada {X.the:nom} bus {paruoštas@X:nom}?", { flags: { 2: F_DO_WH } }),
    ],
    upd_ok_resp: [
      t("Good | to hear! | What | are | you | working on | right now?", "Gera | girdėti! | Prie ko | — | tu | dirbi | šiuo metu?", "Gera girdėti! Prie ko dabar dirbi?", { flags: { 3: F_PROG } }),
    ],
    upd_busy_resp: [
      t("Busy | week, | huh? | What | are | you | working on?", "Įtempta | savaitė, | ar ne? | Prie ko | — | tu | dirbi?", "Įtempta savaitė, ar ne? Prie ko dirbi?", { flags: { 4: F_PROG } }),
    ],
    what_task_reask: [
      t("So, | what | are | you | working on | right now?", "Tai | prie ko | — | tu | dirbi | šiuo metu?", "Tai prie ko dabar dirbi?", { flags: { 2: F_PROG } }),
    ],
    upd_nothing_resp: [
      t("Okay, | no | worries.", "Gerai, | jokių | rūpesčių.", "Gerai, nieko tokio."),
    ],
    when_ok: [
      t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
      t("Okay, | great. | Just | keep | me | posted.", "Gerai, | puiku. | Tiesiog | — | mane | informuok.", "Gerai, puiku. Tiesiog informuok mane.", { flags: { 3: F_POSTED } }),
    ],
    when_unsure: [
      t("That's | okay. | Just | keep | me | posted.", "Tai yra | gerai. | Tiesiog | — | mane | informuok.", "Nieko tokio. Tiesiog informuok mane.", { flags: { 3: F_POSTED } }),
    ],
    upd_behind_ok: [
      t("No | worries. | Thanks | for | the | update!", "Jokių | rūpesčių. | Ačiū | už | — | naujienas!", "Nieko tokio. Ačiū, kad papasakojai!"),
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
      t("Cool, | let's talk | after | the | meeting.", "Šaunu, | pasikalbėkime | po | — | susirinkimo.", "Šaunu, pasikalbėkime po susirinkimo."),
    ],
    paul_ok_short: [
      t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, nieko tokio."),
    ],

    // --- the app launch: jargon and clarifying -------------------------------------------------------
    move_launch: [
      t("So, | let's move on | to | the | app | launch. | Paul?", "Taigi, | pereikime | prie | — | programėlės | paleidimo. | Paulai?", "Taigi, pereikime prie programėlės paleidimo. Paulai?"),
      t("Now | let's move on | to | the | app | launch. | Paul?", "Dabar | pereikime | prie | — | programėlės | paleidimo. | Paulai?", "Dabar pereikime prie programėlės paleidimo. Paulai?"),
    ],
    jargon_beta: [
      t("Sure. | So, | the | beta | is | live, | but | the | go-live | might | slip | a | week.", "Žinoma. | Taigi, | — | beta versija | yra | paleista, | bet | — | paleidimo data | gali | nusikelti | — | savaite.",
        "Žinoma. Taigi, beta versija jau veikia, bet paleidimo data gali nusikelti savaite."),
    ],
    jargon_soft: [
      t("Sure. | So, | we're doing | a | soft launch | next | week, | and | then | we'll scale up.", "Žinoma. | Taigi, | mes darome | — | bandomąjį paleidimą | kitą | savaitę, | o | tada | plėsimės.",
        "Žinoma. Taigi, kitą savaitę darome bandomąjį paleidimą, o tada plėsimės."),
    ],
    jargon_qa: [
      t("Sure. | So, | the | app | is | feature-complete, | but | QA | found | a | few | blockers.", "Žinoma. | Taigi, | — | programėlė | yra | su visomis funkcijomis, | bet | testuotojai | rado | — | kelias | kritines klaidas.",
        "Žinoma. Taigi, visos programėlės funkcijos jau sukurtos, bet testuotojai rado kelias kritines klaidas."),
    ],
    any_q_paul: [
      t("Any | questions | for Paul?", "Kokių nors | klausimų | Paului?", "Ar yra klausimų Paului?"),
      t("Does | anyone | have | questions | for Paul?", "Ar | kas nors | turi | klausimų | Paului?", "Ar kas nors turi klausimų Paului?", { flags: { 0: F_DO_Q } }),
    ],
    any_q_reask: [
      t("So, | any | questions | for Paul?", "Tai | kokių nors | klausimų | Paului?", "Tai ar yra klausimų Paului?"),
    ],
    plain_beta: [
      t("Sorry! | In | plain | English: | the | test | version | works, | but | we | might | launch | a | week | later.", "Atsiprašau! | — | Paprasta | anglų kalba: | — | bandomoji | versija | veikia, | bet | mes | galime | paleisti | — | savaite | vėliau.",
        "Atsiprašau! Paprastai tariant: bandomoji versija veikia, bet programėlę galime paleisti savaite vėliau.", { flags: { 1: F_IN_PLAIN } }),
    ],
    plain_soft: [
      t("Sorry! | In | plain | English: | next | week, | only | a | few | users | get | the | app. | Later, | everyone | gets | it.", "Atsiprašau! | — | Paprasta | anglų kalba: | kitą | savaitę, | tik | — | keli | vartotojai | gauna | — | programėlę. | Vėliau, | visi | gauna | ją.",
        "Atsiprašau! Paprastai tariant: kitą savaitę programėlę gaus tik keli vartotojai, o vėliau – visi.", { flags: { 1: F_IN_PLAIN } }),
    ],
    plain_qa: [
      t("Sorry! | In | plain | English: | the | app | is | ready, | but | the | testers | found | some | big | problems.", "Atsiprašau! | — | Paprasta | anglų kalba: | — | programėlė | yra | paruošta, | bet | — | testuotojai | rado | — | didelių | problemų.",
        "Atsiprašau! Paprastai tariant: programėlė paruošta, bet testuotojai rado rimtų problemų.", { flags: { 1: F_IN_PLAIN, 12: F_SOME } }),
    ],
    simple_beta: [
      t("Basically, | the | launch | is | one | week | later.", "Iš esmės, | — | paleidimas | bus | viena | savaite | vėliau.", "Iš esmės paleidimas bus savaite vėliau.",
        { flags: { 3: "“is” for a planned event: the Lithuanian future bus." } }),
    ],
    simple_soft: [
      t("Basically: | first | a | few | people, | then | everyone.", "Iš esmės: | pirma | — | keli | žmonės, | tada | visi.", "Iš esmės: pirma – keli žmonės, tada – visi."),
    ],
    simple_qa: [
      t("Basically, | we | still | have | some | bugs | to fix.", "Iš esmės, | mes | dar | turime | — | klaidų | ištaisyti.", "Iš esmės, dar turime ištaisyti klaidas.", { flags: { 4: F_SOME } }),
    ],
    makes_sense: [
      t("Does | that | make sense?", "Ar | tai | suprantama?", "Ar suprantama?", { flags: { 0: F_DO_Q } }),
      t("Is | that | clearer?", "Ar | taip | aiškiau?", "Ar taip aiškiau?", { flags: { 0: F_IS_Q } }),
    ],
    sense_ok: [
      t("Great!", "Puiku!", "Puiku!"),
      t("Cool.", "Šaunu.", "Šaunu."),
    ],
    sara_clarify: [
      t("Actually, | Paul, | could | you | clarify | that?", "Tiesą sakant, | Paulai, | ar galėtum | tu | paaiškinti | tai?", "Tiesą sakant, Paulai, ar galėtum tai paaiškinti?"),
      t("Um, | Paul, | could | you | clarify | that? | I'm | not | a | tech | expert.", "Ee, | Paulai, | ar galėtum | tu | paaiškinti | tai? | Aš | nesu | — | technologijų | {sm:ekspertas|sf:ekspertė}.",
        "Ee, Paulai, ar galėtum tai paaiškinti? Aš ne technologijų {sm:ekspertas|sf:ekspertė}.", { flags: { 7: F_IM_NOT } }),
    ],
    term_beta: [
      t("A | beta | is | a | test | version | for | a | small | group | of | users.", "— | Beta versija | yra | — | bandomoji | versija | — | — | nedidelei | grupei | — | vartotojų.",
        "Beta versija – tai bandomoji versija nedidelei vartotojų grupei.",
        { flags: { 6: "“for”: the dative nedidelei grupei carries it (an adjective intervenes).", 10: "“of”: the genitive vartotojų carries it." } }),
    ],
    term_golive: [
      t("Go-live | means | launch | day, | when | the | app | goes | public.", "„Go-live“ | reiškia | paleidimo | dieną, | kai | — | programėlė | tampa | vieša.", "„Go-live“ – tai paleidimo diena, kai programėlė tampa prieinama visiems."),
    ],
    term_slip: [
      t("Slip | means | move | to | a | later | date.", "„Slip“ | reiškia | nusikelti | į | — | vėlesnę | datą.", "„Slip“ reiškia nusikelti į vėlesnę datą."),
    ],
    term_soft: [
      t("A | soft launch | means | only | a | few | users | get | the | app | first.", "— | Bandomasis paleidimas | reiškia, kad | tik | — | keli | vartotojai | gauna | — | programėlę | pirmiausia.",
        "Bandomasis paleidimas reiškia, kad pirmiausia programėlę gauna tik keli vartotojai."),
    ],
    term_scale: [
      t("Scale up | means | we | grow | step | by | step.", "„Scale up“ | reiškia, kad | mes | augame | žingsnis | po | žingsnio.", "„Scale up“ reiškia, kad augame žingsnis po žingsnio."),
    ],
    term_feature: [
      t("Feature-complete | means | all | the | parts | of the app | are | there.", "„Feature-complete“ | reiškia, kad | visos | — | dalys | programėlės | yra | sukurtos.",
        "„Feature-complete“ reiškia, kad visos programėlės dalys jau sukurtos.", { flags: { 7: "“there” (are there = exist): sukurtos (built) carries it." } }),
    ],
    term_qa: [
      t("QA | means | the | testers. | They | look for | bugs.", "QA | reiškia | — | testuotojus. | Jie | ieško | klaidų.", "QA – tai testuotojai. Jie ieško klaidų."),
    ],
    term_blockers: [
      t("Blockers | are | big | problems. | We | can't launch | with | them.", "Kritinės klaidos | yra | didelės | problemos. | Mes | negalime paleisti | su | jomis.", "„Blockers“ – tai rimtos problemos. Su jomis negalime paleisti programėlės."),
    ],
    term_launch: [
      t("Launch | means | we | open | the | app | to everyone.", "Paleidimas | reiškia, kad | mes | atveriame | — | programėlę | visiems.", "Paleidimas reiškia, kad programėlę atveriame visiems."),
    ],
    term_offline: [
      t("It | means: | let's talk | about | it | later, | after | the | meeting.", "Tai | reiškia: | pasikalbėkime | apie | tai | vėliau, | po | — | susirinkimo.", "Tai reiškia: pasikalbėkime apie tai vėliau, po susirinkimo."),
    ],
    term_wrap: [
      t("Wrap up | means | finish. | We're | almost | done!", "„Wrap up“ | reiškia | baigti. | Mes esame | beveik | baigę!", "„Wrap up“ reiškia baigti. Jau beveik baigėme!"),
    ],
    term_aob: [
      t("It | means: | does | anyone | have | other | topics?", "Tai | reiškia: | ar | kas nors | turi | kitų | temų?", "Tai reiškia: ar kas nors turi kitų temų?", { flags: { 2: F_DO_Q } }),
    ],
    term_deadline: [
      t("A | deadline | is | the | last | day | for a task.", "— | Terminas | yra | — | paskutinė | diena | užduočiai atlikti.", "Terminas – tai paskutinė diena užduočiai atlikti."),
    ],
    term_agenda: [
      t("It's | the | list | of topics | for the meeting.", "Tai yra | — | sąrašas | temų | susirinkimui.", "Tai susirinkimo temų sąrašas."),
    ],
    term_mute: [
      t("It | means | the | microphone | is | off.", "Tai | reiškia, kad | — | mikrofonas | yra | išjungtas.", "Tai reiškia, kad mikrofonas išjungtas."),
    ],
    clarify_ads: [
      t("Paul | wants | to spend | all | the | money | on | online | ads.", "Paulas | nori | išleisti | visus | — | pinigus | — | internetinei | reklamai.", "Paulas nori visus pinigus išleisti internetinei reklamai.",
        { flags: { 6: "“on”: the dative internetinei reklamai carries it (an adjective intervenes)." } }),
    ],
    clarify_party: [
      t("Paul | wants | to spend | all | the | money | on | one | big | party.", "Paulas | nori | išleisti | visus | — | pinigus | — | vienam | dideliam | vakarėliui.", "Paulas nori visus pinigus išleisti vienam dideliam vakarėliui.",
        { flags: { 6: "“on”: the dative vienam dideliam vakarėliui carries it (a numeral and an adjective intervene)." } }),
    ],
    clarify_deadline: [
      t("Paul | wants | more | time, | but | Sara | wants | it | on Friday.", "Paulas | nori | daugiau | laiko, | bet | Sara | nori | jo | penktadienį.", "Paulas nori daugiau laiko, o Sara nori jį gauti penktadienį."),
    ],
    clarify_who: [
      t("I | mean: | who | can | do | {X.the}?", "Aš | turiu omenyje: | kas | gali | padaryti | {X.the:acc}?", "Turiu omenyje: kas gali padaryti {X.the:acc}?"),
    ],
    // "Could you send the report to everyone after the meeting?" said simply (X = the learner's task)
    clarify_send: [
      t("I | mean: | just | email | it | to the team.", "Aš | turiu omenyje: | tiesiog | išsiųsk el. paštu | {jis@X:acc} | komandai.",
        "Turiu omenyje: tiesiog išsiųsk {jis@X:acc} komandai el. paštu."),
    ],
    clarify_send_them: [
      t("I | mean: | just | email | them | to the team.", "Aš | turiu omenyje: | tiesiog | išsiųsk el. paštu | {jis@X:acc} | komandai.",
        "Turiu omenyje: tiesiog išsiųsk {jis@X:acc} komandai el. paštu."),
    ],

    // --- adding something ------------------------------------------------------------------------------
    anything_add: [
      t("Thanks, | Paul. | Anything | to add?", "Ačiū, | Paulai. | Ką nors | pridurti?", "Ačiū, Paulai. Ar kas nors nori ką nors pridurti?"),
      t("Okay. | Does | anyone | want | to add | anything?", "Gerai. | Ar | kas nors | nori | pridurti | ką nors?", "Gerai. Ar kas nors nori ką nors pridurti?", { flags: { 1: F_DO_Q } }),
    ],
    add_reask: [
      t("Anything | to add?", "Ką nors | pridurti?", "Norėtum ką nors pridurti?"),
    ],
    paul_adds: [
      t("I'd like | to add | something: | we | need | more | testers.", "Norėčiau | pridurti | kai ką: | mums | reikia | daugiau | testuotojų.", "Norėčiau kai ką pridurti: mums reikia daugiau testuotojų."),
    ],
    paul_add_ok: [
      t("Good | point. | Anyone | else?", "Gera | pastaba. | Kas nors | dar?", "Gera pastaba. Dar kas nors?"),
    ],
    go_ahead: [
      t("Sure, | go ahead!", "Žinoma, | kalbėk!", "Žinoma, kalbėk!"),
      t("Of course. | Go ahead.", "Žinoma. | Kalbėk.", "Žinoma. Kalbėk."),
    ],
    add_test_ok: [
      t("Good | point! | I'll add | that | to | the | test | plan.", "Gera | pastaba! | Pridėsiu | tai | į | — | testavimo | planą.", "Gera pastaba! Įtrauksiu tai į testavimo planą."),
    ],
    add_help_ok: [
      t("That | would | be | great, | thanks!", "Tai | — | būtų | puiku, | ačiū!", "Būtų puiku, ačiū!", { flags: { 1: F_WOULD } }),
    ],
    add_customers_ok: [
      t("Good | to know. | We'll tell | them | the | date | soon.", "Gera | žinoti. | Pasakysime | jiems | — | datą | greitai.", "Gera žinoti. Netrukus jiems pasakysime datą."),
    ],
    add_feedback_ok: [
      t("Great | idea! | We | can | add | a | feedback | button | to the app.", "Puiki | mintis! | Mes | galime | pridėti | — | atsiliepimų | mygtuką | programėlėje.", "Puiki mintis! Galime pridėti programėlėje atsiliepimų mygtuką."),
    ],
    add_other_ok: [
      t("Good | point, | thanks. | Let's talk | about | it | after | the | meeting.", "Gera | pastaba, | ačiū. | Pasikalbėkime | apie | tai | po | — | susirinkimo.", "Gera pastaba, ačiū. Pasikalbėkime apie tai po susirinkimo."),
    ],
    no_add_ok: [
      t("Okay, | great.", "Gerai, | puiku.", "Gerai, puiku."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],

    // --- the budget --------------------------------------------------------------------------------------
    move_budget: [
      t("So, | let's move on | to | the | budget.", "Taigi, | pereikime | prie | — | biudžeto.", "Taigi, pereikime prie biudžeto."),
      t("Now, | let's move on | to | the | budget.", "Dabar | pereikime | prie | — | biudžeto.", "Dabar pereikime prie biudžeto."),
    ],
    budget_left: [
      t("We | have | $5,000 | left | for marketing | this | quarter.", "Mes | turime | 5 000 dolerių | likusių | rinkodarai | šį | ketvirtį.", "Šį ketvirtį rinkodarai mums liko 5 000 dolerių.",
        { say: "We have five thousand dollars left for marketing this quarter." }),
    ],
    proposal_ads: [
      t("I | think | we | should | put | everything | into | social | media | ads.", "Aš | manau, | mes | turėtume | skirti | viską | — | socialinių | tinklų | reklamai.",
        "Manau, visus pinigus turėtume skirti reklamai socialiniuose tinkluose.", { flags: { 6: "“into”: the dative reklamai carries it (other words intervene)." } }),
    ],
    proposal_party: [
      t("I | think | we | should | put | everything | into | a | big | launch | party.", "Aš | manau, | mes | turėtume | skirti | viską | — | — | dideliam | pristatymo | vakarėliui.",
        "Manau, visus pinigus turėtume skirti dideliam programėlės pristatymo vakarėliui.", { flags: { 6: "“into”: the dative vakarėliui carries it (other words intervene)." } }),
    ],
    what_think: [
      t("Hmm. | What | do | you | think?", "Hmm. | Ką | — | tu | manai?", "Hmm. O ką tu manai?", { flags: { 2: F_DO_WH } }),
      t("Interesting. | What's | your | opinion?", "Įdomu. | Kokia yra | tavo | nuomonė?", "Įdomu. Kokia tavo nuomonė?"),
    ],
    what_think_reask: [
      t("So, | what | do | you | think | about | Paul's | idea?", "Tai | ką | — | tu | manai | apie | Paulo | idėją?", "Tai ką manai apie Paulo idėją?", { flags: { 2: F_DO_WH } }),
    ],
    your_first: [
      t("I'd like | to hear | your | opinion | first!", "Norėčiau | išgirsti | tavo | nuomonę | pirma!", "Pirma norėčiau išgirsti tavo nuomonę!"),
    ],
    paul_why: [
      t("Oh? | Why | not?", "O? | Kodėl | ne?", "O? Kodėl ne?"),
      t("Really? | Why?", "Tikrai? | Kodėl?", "Tikrai? Kodėl?"),
    ],
    paul_fair: [
      t("Hmm, | fair | point.", "Hmm, | teisinga | pastaba.", "Hmm, teisinga pastaba."),
      t("Okay, | I | see | your | point.", "Gerai, | aš | suprantu | tavo | mintį.", "Gerai, suprantu, ką nori pasakyti."),
    ],
    paul_split_ok: [
      t("Hmm, | that | could | work.", "Hmm, | tai | galėtų | pasiteisinti.", "Hmm, tai galėtų pasiteisinti."),
    ],
    paul_fair_short: [
      t("Okay, | fair enough.", "Gerai, | supratau.", "Gerai, supratau."),
    ],
    offline_two: [
      t("Good | points. | Let's take | this | offline. | Can | you | two | talk | after | the | meeting?", "Geros | pastabos. | Aptarkime | tai | atskirai. | Ar galite | jūs | abu | pasikalbėti | po | — | susirinkimo?",
        "Geros pastabos. Aptarkime tai atskirai. Ar jūs abu galite pasikalbėti po susirinkimo?", { flags: { 2: F_OFFLINE } }),
    ],
    // after "I don't know." (no reason, so no "Good points.")
    offline_short: [
      t("Alright. | Let's take | this | offline. | Can | you | two | talk | after | the | meeting?", "Gerai. | Aptarkime | tai | atskirai. | Ar galite | jūs | abu | pasikalbėti | po | — | susirinkimo?",
        "Gerai. Aptarkime tai atskirai. Ar jūs abu galite pasikalbėti po susirinkimo?", { flags: { 1: F_OFFLINE } }),
    ],
    offline_sara: [
      t("Hmm. | Let's take | this | offline. | Paul | and | Sara, | can | you | talk | after | the | meeting?", "Hmm. | Aptarkime | tai | atskirai. | Paulai | ir | Sara, | ar galite | jūs | pasikalbėti | po | — | susirinkimo?",
        "Hmm. Aptarkime tai atskirai. Paulai ir Sara, ar galite pasikalbėti po susirinkimo?", { flags: { 1: F_OFFLINE } }),
    ],
    talk_later_ok: [
      t("Sounds | good.", "Skamba | gerai.", "Puiku."),
      t("Deal!", "Sutarta!", "Sutarta!"),
    ],
    by_email: [
      t("Okay, | maybe | by email | then.", "Gerai, | gal | el. paštu | tada.", "Gerai, tada gal el. paštu."),
    ],
    k_ok_agree: [
      t("Okay, | thanks.", "Gerai, | ačiū.", "Gerai, ačiū."),
    ],
    k_thats_ok: [
      t("That's | okay.", "Tai yra | gerai.", "Nieko tokio."),
    ],
    sara_q: [
      t("Sara, | what | do | you | think?", "Sara, | ką | — | tu | manai?", "Sara, o ką tu manai?", { flags: { 2: F_DO_WH } }),
    ],
    sara_budget: [
      t("Hmm, | I'm | not | sure | I | agree. | That's | a | lot | of | money | for | one | thing.", "Hmm, | aš | nesu | {sm:tikras|sf:tikra}, | ar aš | sutinku. | Tai yra | — | daug | — | pinigų | — | vienam | dalykui.",
        "Hmm, nesu {sm:tikras|sf:tikra}, ar sutinku. Tai daug pinigų vienam dalykui.",
        { flags: { 2: F_IM_NOT, 4: F_AR, 9: F_OF_MONEY, 11: "“for”: the dative vienam dalykui carries it (a numeral intervenes)." } }),
    ],
    noted: [
      t("Okay, | noted.", "Gerai, | pasižymėjau.", "Gerai, pasižymėjau."),
    ],

    // --- the deadline ------------------------------------------------------------------------------------
    move_deadline: [
      t("Last | thing: | the | next | deadline. | We | need | {X.the} | by | Friday.", "Paskutinis | dalykas: | — | artimiausias | terminas. | Mums | reikia | {X.the:gen} | iki | penktadienio.",
        "Paskutinis dalykas – artimiausias terminas. Mums reikia {X.the:gen} iki penktadienio."),
    ],
    who_takes: [
      t("Who's | taking | this?", "Kas | imsis | šito?", "Kas to imsis?", { flags: { 0: F_WHOS } }),
      t("So, | who's | taking | this one?", "Tai | kas | imsis | šito?", "Tai kas to imsis?", { flags: { 1: F_WHOS } }),
    ],
    who_reask: [
      t("So, | who | can | take | this?", "Tai | kas | gali | imtis | šito?", "Tai kas galėtų to imtis?"),
    ],
    take_ok: [
      t("Great, | thanks! | By | Friday, | then.", "Puiku, | ačiū! | Iki | penktadienio, | vadinasi.", "Puiku, ačiū! Vadinasi, iki penktadienio."),
      t("Perfect. | Thank | you!", "Puiku. | Dėkoju | tau!", "Puiku. Ačiū tau!"),
    ],
    paul_take: [
      t("No | worries, | I | can | take | it.", "Jokių | rūpesčių, | aš | galiu | imtis | to.", "Nieko tokio, galiu to imtis."),
    ],
    paul_take2: [
      t("Sure, | I | can | do | it.", "Žinoma, | aš | galiu | padaryti | tai.", "Žinoma, galiu."),
    ],
    sara_take: [
      t("Sure, | I'll take | it.", "Žinoma, | imsiuosi | to.", "Žinoma, imsiuosi."),
    ],
    thanks_paul: [
      t("Thanks, | Paul!", "Ačiū, | Paulai!", "Ačiū, Paulai!"),
    ],
    thanks_sara: [
      t("Thanks, | Sara!", "Ačiū, | Sara!", "Ačiū, Sara!"),
    ],
    paul_help_sure: [
      t("Sure, | I | can | help.", "Žinoma, | aš | galiu | padėti.", "Žinoma, galiu padėti."),
    ],
    paul_too_soon: [
      t("Hmm, | Friday | is | too | soon. | We | need | another | week.", "Hmm, | penktadienis | yra | per | anksti. | Mums | reikia | dar vienos | savaitės.", "Hmm, penktadienis – per anksti. Mums reikia dar savaitės."),
    ],
    sara_not_sure: [
      t("I'm | not | sure | I | agree. | The | client | needs | it | before | the | launch.", "Aš | nesu | {sm:tikras|sf:tikra}, | ar aš | sutinku. | — | Klientui | reikia | jo | prieš | — | paleidimą.",
        "Nesu {sm:tikras|sf:tikra}, ar sutinku. Klientui jo reikia prieš paleidimą.", { flags: { 1: F_IM_NOT, 3: F_AR } }),
    ],
    dl_reask: [
      t("So, | what | do | you | think: | Friday | or | next | week?", "Tai | ką | — | tu | manai: | penktadienis | ar | kita | savaitė?", "Tai kaip manai: penktadienis ar kita savaitė?", { flags: { 2: F_DO_WH } }),
    ],
    dl_which: [
      t("With | Paul | or | with | Sara?", "Su | Paulu | ar | su | Sara?", "Su Paulu ar su Sara?"),
    ],
    dl_paul_side: [
      t("Okay. | More | time | could | help.", "Gerai. | Daugiau | laiko | galėtų | padėti.", "Gerai. Daugiau laiko galėtų padėti."),
    ],
    dl_sara_side: [
      t("Okay. | Friday | is | important | for the client.", "Gerai. | Penktadienis | yra | svarbus | klientui.", "Gerai. Penktadienis klientui svarbus."),
    ],
    dl_both: [
      t("Ha! | Very | diplomatic.", "Cha! | Labai | diplomatiška.", "Cha! Labai diplomatiška."),
    ],
    dl_idea: [
      t("Good | idea! | A | short | version | on Friday, | and | the | full one | next | week.", "Gera | mintis! | — | Trumpa | versija | penktadienį, | o | — | pilna | kitą | savaitę.",
        "Gera mintis! Trumpa versija – penktadienį, o pilna – kitą savaitę."),
    ],
    dl_client: [
      t("Good | idea. | I'll call | the | client | today.", "Gera | mintis. | Paskambinsiu | — | klientui | šiandien.", "Gera mintis. Šiandien paskambinsiu klientui."),
    ],
    dl_later: [
      t("Let's talk | about | it | after | the | meeting.", "Pasikalbėkime | apie | tai | po | — | susirinkimo.", "Pasikalbėkime apie tai po susirinkimo."),
    ],

    // --- any other business, the end -----------------------------------------------------------------------
    aob_ask: [
      t("Okay, | let's wrap up. | Any | other | business?", "Gerai, | baikime. | Kokių nors | kitų | klausimų?", "Gerai, baikime. Ar yra kitų klausimų?"),
      t("Alright, | let's wrap up. | Any | other | business?", "Gerai, | baikime. | Kokių nors | kitų | klausimų?", "Gerai, baikime. Ar yra kitų klausimų?"),
    ],
    aob_reask: [
      t("Any | other | business?", "Kokių nors | kitų | klausimų?", "Ar yra kitų klausimų?"),
    ],
    aob_more: [
      t("Anything | else?", "Kas nors | dar?", "Dar kas nors?"),
    ],
    aob_wfh_ok: [
      t("Sure, | no | problem. | Just | put | it | in the calendar.", "Žinoma, | jokių | problemų. | Tiesiog | pažymėk | tai | kalendoriuje.", "Žinoma, jokių problemų. Tiesiog pažymėk kalendoriuje."),
    ],
    aob_lunch_ans: [
      t("Next | Thursday | at noon!", "Kitą | ketvirtadienį | vidurdienį!", "Kitą ketvirtadienį, vidurdienį!"),
    ],
    aob_vacation_ok: [
      t("Thanks | for | letting | us | know. | Enjoy!", "Ačiū, | kad | pranešei | mums | —. | Gero poilsio!", "Ačiū, kad pranešei. Gero poilsio!", { flags: { 4: F_KNOW } }),
    ],
    aob_printer_ok: [
      t("Again? | I'll call | IT.", "Vėl? | Paskambinsiu | IT skyriui.", "Vėl? Paskambinsiu IT skyriui."),
    ],
    aob_other_ok: [
      t("Good | point. | Let's put | it | on the agenda | for | next | week.", "Gera | pastaba. | Įtraukime | tai | į darbotvarkę | — | kitos | savaitės.", "Gera pastaba. Įtraukime tai į kitos savaitės darbotvarkę.",
        { flags: { 5: "“for”: the genitive kitos savaitės carries it." } }),
    ],
    closing: [
      t("That's | it | for today. | Thanks, | everyone!", "Tai yra | viskas | šiandienai. | Ačiū | visiems!", "Šiandien tiek. Ačiū visiems!"),
      t("Great | meeting, | everyone. | Thank | you!", "Puikus | susirinkimas, | visi. | Dėkoju | jums!", "Puikus susirinkimas. Ačiū jums!"),
    ],
    summary_ask: [
      t("Oh, | and | could | you | send | everyone | a | quick | summary?", "O, | ir | ar galėtum | tu | atsiųsti | visiems | — | trumpą | santrauką?", "O, ir ar galėtum visiems atsiųsti trumpą santrauką?"),
    ],
    summary_reask: [
      t("Could | you | send | the | summary?", "Ar galėtum | tu | atsiųsti | — | santrauką?", "Ar galėtum atsiųsti santrauką?"),
    ],
    summary_yes: [
      t("Thanks! | You're | the | best.", "Ačiū! | Tu esi | — | {m:geriausias|f:geriausia}.", "Ačiū! Tu {m:geriausias|f:geriausia}."),
    ],
    summary_no: [
      t("No | problem, | I'll do | it.", "Jokių | problemų, | padarysiu | tai.", "Nieko tokio, padarysiu {sm:pats|sf:pati}."),
    ],
    bye_kate: [
      t("Bye, | everyone!", "Iki | visiems!", "Iki visiems!"),
      t("See you | later!", "Iki | vėliau!", "Iki vėliau!"),
    ],
    paul_bye: [
      t("See you!", "Iki!", "Iki!"),
      t("Bye, | guys!", "Iki, | draugai!", "Iki, draugai!"),
    ],
    sara_bye: [
      t("Bye!", "Iki!", "Iki!"),
    ],
    leave_ok: [
      t("Oh, | okay! | Thanks | for | coming.", "O, | gerai! | Ačiū, | kad | atėjai.", "O, gerai! Ačiū, kad atėjai."),
    ],
    not_yet: [
      t("Ha, | not yet! | We're | almost | done.", "Cha, | dar ne! | Mes esame | beveik | baigę.", "Cha, dar ne! Jau beveik baigėme."),
    ],
    agenda_ans: [
      t("The | app | launch, | the | budget | and | the | next | deadline.", "— | Programėlės | paleidimas, | — | biudžetas | ir | — | artimiausias | terminas.", "Programėlės paleidimas, biudžetas ir artimiausias terminas."),
    ],
    deadline_ans: [
      t("We | need | {X.the} | by | Friday.", "Mums | reikia | {X.the:gen} | iki | penktadienio.", "Mums reikia {X.the:gen} iki penktadienio."),
    ],
    next_meeting_ans: [
      t("Same | time | next | week.", "Tuo pačiu | laiku | kitą | savaitę.", "Tuo pačiu laiku kitą savaitę."),
    ],
    np_paul: [
      t("No | problem!", "Jokių | problemų!", "Nėra už ką!"),
    ],
    np_sara: [
      t("No | problem!", "Jokių | problemų!", "Nėra už ką!"),
    ],
    sure_welcome: [
      t("Sure!", "Prašom!", "Prašom!"),
    ],
    yes_you: [
      t("Yes, | you!", "Taip, | tu!", "Taip, tu!"),
    ],
    can_you_take: [
      t("Can | you | take | it?", "Ar gali | tu | imtis | to?", "Ar gali to imtis?"),
    ],
    k_good_thanks: [
      t("Good, | thanks!", "Gerai, | ačiū!", "Gerai, ačiū!"),
    ],
    ok: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Sure.", "Žinoma.", "Žinoma."),
    ],
  },

  hints: {
    mute: {
      lt: "Pasakyti Sarai, kad jos mikrofonas išjungtas",
      items: [
        { id: "m_on_mute", s: t("Sara, | you're | on mute!", "Sara, | tu esi | nutildyta!", "Sara, tavo mikrofonas išjungtas!") },
        { id: "m_cant_hear", s: t("Sara, | we | can't hear | you.", "Sara, | mes | negirdime | tavęs.", "Sara, mes tavęs negirdime.") },
        { id: "m_think", s: t("I | think | you're | muted.", "Aš | manau, | tu esi | nutildyta.", "Manau, tavo mikrofonas išjungtas.") },
        { id: "m_click", s: t("Click | the | microphone | button!", "Spausk | — | mikrofono | mygtuką!", "Spausk mikrofono mygtuką!") },
        { id: "m_unmute", s: t("Sara, | you | need | to unmute.", "Sara, | tau | reikia | įsijungti mikrofoną.", "Sara, įsijunk mikrofoną.") },
      ],
    },
    sara_hear: {
      lt: "Atsakyti Sarai, ar dabar ją girdi",
      items: [
        { id: "h_yes", s: t("Yes, | we | can | hear | you | now!", "Taip, | mes | — | girdime | tave | dabar!", "Taip, dabar girdime!", { flags: { 2: F_CAN_S } }) },
        { id: "h_loud", s: t("Yes, | loud and clear!", "Taip, | labai aiškiai!", "Taip, puikiai girdime!") },
        { id: "h_no", s: t("No, | still | nothing.", "Ne, | vis dar | nieko.", "Ne, vis dar nieko negirdėti.") },
      ],
    },
    notes: {
      lt: "Sutikti užsirašinėti arba atsisakyti",
      items: [
        { id: "n_sure", s: t("Sure, | no | problem!", "Žinoma, | jokių | problemų!", "Žinoma, jokių problemų!") },
        { id: "o_can", s: t("Of course, | I | can | do | that.", "Žinoma, | aš | galiu | padaryti | tai.", "Žinoma, galiu.") },
        { id: "n_laptop", s: t("Sorry, | I | don't have | my | laptop | today.", "Atsiprašau, | aš | neturiu | savo | kompiuterio | šiandien.", "Atsiprašau, šiandien neturiu kompiuterio.") },
      ],
    },
    update: {
      lt: "Papasakoti savo naujienas", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "u_finished", s: t("I | finished | {X.the}.", "Aš | baigiau | {X.the:acc}.", "Baigiau {X.the:acc}.") },
        { id: "u_working", s: t("I'm working | on | {X.the}.", "Aš dirbu | prie | {X.the:gen}.", "Dirbu prie {X.the:gen}.") },
        { id: "u_ready", s: t("{X.the} | will be | ready | by | Friday.", "{X.the:nom} | bus | {paruoštas@X:nom} | iki | penktadienio.", "{X.the:nom} bus {paruoštas@X:nom} iki penktadienio."),
          only: (e) => !e.attrs?.plural },
        { id: "u_almost", s: t("I'm | almost | done | with | {X.the}.", "Aš esu | beveik | {m:baigęs|f:baigusi} | — | {X.the:acc}.", "Beveik baigiau {X.the:acc}.",
          { flags: { 3: "“with”: the accusative after baigęs carries it." } }) },
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
    when: {
      lt: "Pasakyti, kada bus paruošta",
      items: [
        { id: "w_when", s: t("By | Friday.", "Iki | penktadienio.", "Iki penktadienio.") },
        { id: "w_ready", s: t("It'll be | ready | by | Friday.", "Bus | paruošta | iki | penktadienio.", "Bus paruošta iki penktadienio.",
          { flags: { 0: "Dummy “it”: the impersonal bus absorbs it." } }) },
        { id: "w_when", s: t("Tomorrow | morning.", "Rytoj | ryte.", "Rytoj ryte.") },
        { id: "w_unsure", s: t("I'm | not | sure | yet.", "Aš | nesu | {m:tikras|f:tikra} | dar.", "Dar nežinau.", { flags: { 1: F_IM_NOT } }) },
      ],
    },
    send: {
      lt: "Sutikti atsiųsti",
      items: [
        { id: "sure", s: t("Sure!", "Žinoma!", "Žinoma!") },
        { id: "sure", s: t("Sure, | right | after | the | meeting.", "Žinoma, | iškart | po | — | susirinkimo.", "Žinoma, iškart po susirinkimo.") },
      ],
    },
    clarify_beta: {
      lt: "Paprašyti Paulo paaiškinti",
      items: [
        { id: "c_clarify", s: t("Could | you | clarify | that?", "Ar galėtum | tu | paaiškinti | tai?", "Ar galėtum tai paaiškinti?") },
        { id: "c_mean_by", s: t("What | does | \"go-live\" | mean?", "Ką | — | „go-live“ | reiškia?", "Ką reiškia „go-live“?", { flags: { 1: F_DO_WH } }) },
        { id: "c_whats", s: t("Sorry, | what's | a | beta?", "Atsiprašau, | kas yra | — | beta versija?", "Atsiprašau, kas yra beta versija?") },
        { id: "c_simple", s: t("Could | you | say | that | more simply?", "Ar galėtum | tu | pasakyti | tai | paprasčiau?", "Ar galėtum pasakyti paprasčiau?") },
        { id: "c_none", s: t("No | questions | from | me.", "Jokių | klausimų | iš | manęs.", "Klausimų neturiu.") },
      ],
    },
    clarify_soft: {
      lt: "Paprašyti Paulo paaiškinti",
      items: [
        { id: "c_clarify", s: t("Could | you | clarify | that?", "Ar galėtum | tu | paaiškinti | tai?", "Ar galėtum tai paaiškinti?") },
        { id: "c_whats", s: t("What's | a | \"soft launch\"?", "Kas yra | — | „soft launch“?", "Kas yra „soft launch“?") },
        { id: "c_mean_by", s: t("What | does | \"scale up\" | mean?", "Ką | — | „scale up“ | reiškia?", "Ką reiškia „scale up“?", { flags: { 1: F_DO_WH } }) },
        { id: "c_simple", s: t("Could | you | say | that | more simply?", "Ar galėtum | tu | pasakyti | tai | paprasčiau?", "Ar galėtum pasakyti paprasčiau?") },
        { id: "c_none", s: t("No | questions | from | me.", "Jokių | klausimų | iš | manęs.", "Klausimų neturiu.") },
      ],
    },
    clarify_qa: {
      lt: "Paprašyti Paulo paaiškinti",
      items: [
        { id: "c_clarify", s: t("Could | you | clarify | that?", "Ar galėtum | tu | paaiškinti | tai?", "Ar galėtum tai paaiškinti?") },
        { id: "c_whats", s: t("Sorry, | what's | QA?", "Atsiprašau, | kas yra | QA?", "Atsiprašau, kas yra QA?") },
        { id: "c_mean_by", s: t("What | are | \"blockers\"?", "Kas | yra | „blockers“?", "Kas yra „blockers“?") },
        { id: "c_simple", s: t("Could | you | say | that | more simply?", "Ar galėtum | tu | pasakyti | tai | paprasčiau?", "Ar galėtum pasakyti paprasčiau?") },
        { id: "c_none", s: t("No | questions | from | me.", "Jokių | klausimų | iš | manęs.", "Klausimų neturiu.") },
      ],
    },
    sense: {
      lt: "Atsakyti, ar dabar aišku",
      items: [
        { id: "s_yes", s: t("Yes, | thanks! | Now | I | understand.", "Taip, | ačiū! | Dabar | aš | suprantu.", "Taip, ačiū! Dabar suprantu.") },
        { id: "s_got", s: t("Got it, | thanks.", "Supratau, | ačiū.", "Supratau, ačiū.") },
        { id: "s_no", s: t("Not | really, | sorry.", "Ne | visai, | atsiprašau.", "Nelabai, atsiprašau.") },
      ],
    },
    add: {
      lt: "Ką nors pridurti",
      items: [
        { id: "a_add", s: t("I'd like | to add | something.", "Norėčiau | pridurti | kai ką.", "Norėčiau kai ką pridurti.") },
        { id: "a_test", s: t("We | should | test | it | on | older | phones.", "Mes | turėtume | išbandyti | ją | — | senesniuose | telefonuose.", "Turėtume ją išbandyti senesniuose telefonuose.",
          { flags: { 4: "“on”: the locative senesniuose telefonuose carries it (an adjective intervenes)." } }) },
        { id: "a_help", s: t("I | can | help | with | the | testing.", "Aš | galiu | padėti | su | — | testavimu.", "Galiu padėti testuoti.") },
        { id: "a_customers", s: t("Our | customers | are asking | about | the | launch | date.", "Mūsų | klientai | klausia | apie | — | paleidimo | datą.", "Mūsų klientai klausinėja apie paleidimo datą.") },
        { id: "a_feedback", s: t("We | should | ask | users | for feedback.", "Mes | turėtume | paprašyti | vartotojų | atsiliepimų.", "Turėtume paprašyti vartotojų atsiliepimų.") },
        { id: "a_none", s: t("No, | that's | all | from | me.", "Ne, | tai yra | viskas | iš | manęs.", "Ne, iš manęs tiek.") },
      ],
    },
    add_what: {
      lt: "Pasakyti, ką nori pridurti",
      items: [
        { id: "a_test", s: t("We | should | test | it | on | older | phones.", "Mes | turėtume | išbandyti | ją | — | senesniuose | telefonuose.", "Turėtume ją išbandyti senesniuose telefonuose.",
          { flags: { 4: "“on”: the locative senesniuose telefonuose carries it (an adjective intervenes)." } }) },
        { id: "a_help", s: t("I | can | help | with | the | testing.", "Aš | galiu | padėti | su | — | testavimu.", "Galiu padėti testuoti.") },
        { id: "a_customers", s: t("Our | customers | are asking | about | the | launch | date.", "Mūsų | klientai | klausia | apie | — | paleidimo | datą.", "Mūsų klientai klausinėja apie paleidimo datą.") },
        { id: "a_feedback", s: t("We | should | ask | users | for feedback.", "Mes | turėtume | paprašyti | vartotojų | atsiliepimų.", "Turėtume paprašyti vartotojų atsiliepimų.") },
      ],
    },
    opinion: {
      lt: "Mandagiai nesutikti su Paulu",
      items: [
        { id: "o_not_sure", s: t("I'm | not | sure | I | agree.", "Aš | nesu | {m:tikras|f:tikra}, | ar aš | sutinku.", "Nesu {m:tikras|f:tikra}, ar sutinku.", { flags: { 1: F_IM_NOT, 3: F_AR } }),
          note: "Mandagus būdas nesutikti." },
        { id: "o_see_point", s: t("I | see | your | point, | but | it's | a | lot | of | money.", "Aš | suprantu | tavo | mintį, | bet | tai yra | — | daug | — | pinigų.", "Suprantu, ką nori pasakyti, bet tai daug pinigų.",
          { flags: { 8: F_OF_MONEY } }), note: "Pirma parodyk, kad supranti, o tada – „but…“." },
        { id: "o_split", s: t("Maybe | we | could | split | it?", "Gal | mes | galėtume | padalinti | juos?", "Gal galėtume pinigus padalinti?",
          { flags: { 4: "“it” (the money) = juos: pinigai is plural in Lithuanian." } }) },
        { id: "w_risky", s: t("Hmm, | it's | too | risky.", "Hmm, | tai yra | per | rizikinga.", "Hmm, tai per rizikinga.") },
      ],
    },
    opinion_yes: {
      lt: "Sutikti su Paulu",
      items: [
        { id: "o_agree", s: t("I | agree | with | Paul.", "Aš | sutinku | su | Paulu.", "Sutinku su Paulu.") },
        { id: "o_good_idea", s: t("Good | idea!", "Gera | mintis!", "Gera mintis!") },
        { id: "o_makes_sense", s: t("That | makes sense.", "Tai | logiška.", "Tai logiška.") },
      ],
    },
    why: {
      lt: "Paaiškinti, kodėl nesutinki",
      items: [
        { id: "w_expensive", s: t("It's | too | expensive.", "Tai yra | per | brangu.", "Per brangu.") },
        { id: "w_risky", s: t("It's | too | risky.", "Tai yra | per | rizikinga.", "Per rizikinga.") },
        { id: "w_keep", s: t("We | should | keep | some | money | for later.", "Mes | turėtume | pasilikti | — | pinigų | vėlesniam laikui.", "Turėtume pasilikti pinigų vėlesniam laikui.",
          { flags: { 3: F_SOME } }) },
        { id: "o_split", s: t("Maybe | we | could | split | it?", "Gal | mes | galėtume | padalinti | juos?", "Gal galėtume pinigus padalinti?",
          { flags: { 4: "“it” (the money) = juos: pinigai is plural in Lithuanian." } }) },
      ],
    },
    talk_after: {
      lt: "Sutikti pasikalbėti vėliau",
      items: [
        { id: "t_sure", s: t("Sure, | let's talk | later.", "Žinoma, | pasikalbėkime | vėliau.", "Žinoma, pasikalbėkime vėliau.") },
        { id: "t_sounds", s: t("Sounds | good!", "Skamba | gerai!", "Puiku!") },
      ],
    },
    dl_view: {
      lt: "Pasakyti, ką manai apie terminą",
      items: [
        { id: "d_sara", s: t("I | agree | with | Sara.", "Aš | sutinku | su | Sara.", "Sutinku su Sara.") },
        { id: "d_paul", s: t("I | think | Paul | is | right.", "Aš | manau, | Paulas | yra | teisus.", "Manau, Paulas teisus.") },
        { id: "d_short", s: t("Maybe | we | could | send | a | short | version | on Friday?", "Gal | mes | galėtume | nusiųsti | — | trumpą | versiją | penktadienį?", "Gal galėtume penktadienį nusiųsti trumpą versiją?") },
        { id: "d_client", s: t("We | could | ask | the | client.", "Mes | galėtume | paklausti | — | kliento.", "Galėtume paklausti kliento.") },
      ],
    },
    dl_who: {
      lt: "Pasakyti, su kuo sutinki",
      items: [
        { id: "d_with", s: t("With | Sara.", "Su | Sara.", "Su Sara.") },
        { id: "d_with", s: t("With | Paul.", "Su | Paulu.", "Su Paulu.") },
      ],
    },
    owner: {
      lt: "Pasisiūlyti arba mandagiai atsisakyti",
      items: [
        { id: "o_can", s: t("I | can | do | that.", "Aš | galiu | padaryti | tai.", "Galiu tai padaryti.") },
        { id: "o_take", s: t("I'll take | it.", "Imsiuosi | to.", "Aš to imsiuosi.") },
        { id: "o_busy", s: t("Sorry, | I'm | really | busy | this | week.", "Atsiprašau, | aš esu | labai | {m:užsiėmęs|f:užsiėmusi} | šią | savaitę.", "Atsiprašau, šią savaitę esu labai {m:užsiėmęs|f:užsiėmusi}.") },
        { id: "o_paul", s: t("Maybe | Paul | could | do | it?", "Gal | Paulas | galėtų | padaryti | tai?", "Gal Paulas galėtų?") },
      ],
    },
    aob: {
      lt: "Pasakyti, kad klausimų nėra, arba ką nors iškelti",
      items: [
        { id: "b_none", s: t("No, | nothing | from | me.", "Ne, | nieko | iš | manęs.", "Ne, iš manęs nieko.") },
        { id: "b_wfh", s: t("Can | I | work | from | home | on Friday?", "Ar galiu | aš | dirbti | iš | namų | penktadienį?", "Ar galiu penktadienį dirbti iš namų?") },
        { id: "b_lunch", s: t("When's | the | team | lunch?", "Kada yra | — | komandos | pietūs?", "Kada komandos pietūs?") },
        { id: "b_vacation", s: t("I'm | on vacation | next | week.", "Aš esu | atostogose | kitą | savaitę.", "Kitą savaitę atostogauju.") },
        { id: "b_printer", s: t("The | printer | is | broken | again.", "— | Spausdintuvas | yra | sugedęs | vėl.", "Spausdintuvas vėl sugedęs.") },
        { id: "a_add", s: t("I'd like | to add | something.", "Norėčiau | pridurti | kai ką.", "Norėčiau kai ką pridurti.") },
      ],
    },
    aob_more: {
      lt: "Pasakyti, kad daugiau nieko nėra",
      items: [
        { id: "b_all", s: t("No, | that's | all.", "Ne, | tai yra | viskas.", "Ne, tai viskas.") },
        { id: "b_none", s: t("No, | nothing | from | me.", "Ne, | nieko | iš | manęs.", "Ne, iš manęs nieko.") },
      ],
    },
    summary: {
      lt: "Sutikti atsiųsti santrauką arba atsisakyti",
      items: [
        { id: "s_send", s: t("Sure, | I'll send | it | today.", "Žinoma, | išsiųsiu | ją | šiandien.", "Žinoma, šiandien išsiųsiu.") },
        { id: "s_cant", s: t("Sorry, | I | can't | today.", "Atsiprašau, | aš | negaliu | šiandien.", "Atsiprašau, šiandien negaliu.") },
      ],
    },
    bye: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "b_thanks", s: t("Thanks, | everyone!", "Ačiū | visiems!", "Ačiū visiems!") },
        { id: "b_see", s: t("Thanks, | Kate! | See you | later.", "Ačiū, | Keite! | Iki | vėliau.", "Ačiū, Keite! Iki vėliau.") },
        { id: "b_great", s: t("Great | meeting!", "Puikus | susirinkimas!", "Puikus susirinkimas!") },
      ],
    },
  },

  tips: {
    soft_disagree: { key: "soft_disagree", lt: "Suprasta! Susirinkime švelniau skamba „I'm not sure I agree“ arba „I see your point, but…“.", better: "I'm not sure I agree." },
    us_vacation: { key: "us_vacation", lt: "Suprasta! Amerikoje sakoma „vacation“: I'm on vacation next week.", better: "I'm on vacation next week." },
  },

  merges: {
    "let's get started": { reason: "lexical_expression", split: "Let's → leiskime, get → gauti, started → pradėtas is false; = pradėkime.", minimal: "Three words." },
    "let's move on": { reason: "lexical_expression", split: "Let's → leiskime, move → judėti, on → ant is false; going to the next topic = pereikime (C-PHR + imperative).", minimal: "The object (to …) stays outside." },
    "let's take": { reason: "grammatical_fusion", split: "Let's → leiskime + take → imti is a calque; in the discontinuous “take … offline” the imperative aptarkime carries “let's” and the verb; atskirai stands under “offline”.", minimal: "“this” and “offline” stay outside." },
    "let's wrap up": { reason: "lexical_expression", split: "Let's → leiskime, wrap → vynioti, up → aukštyn is false; = baikime (C-PHR + imperative).", minimal: "Three words." },
    "wrap up": { reason: "lexical_expression", split: "wrap → vynioti + up → aukštyn is false; finishing a meeting = baigti (C-PHR).", minimal: "Verb and particle." },
    "let's talk": { reason: "grammatical_fusion", split: "Let's → leiskime + talk → kalbėti is a calque; the imperative pasikalbėkime carries “let's”.", minimal: "Two words." },
    "let's put": { reason: "grammatical_fusion", split: "Let's → leiskime + put → dėti is a calque; putting a topic on the agenda = įtraukime (the imperative carries “let's”).", minimal: "The object stays outside." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is a calque; asking again = o …?", minimal: "Two words." },
    "working on": { reason: "lexical_expression", split: "working → dirbantis + on → ant is false; “work on X” = dirbti (prie X).", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is literal; inviting someone to speak = kalbėk.", minimal: "Two words." },
    "great job": { reason: "lexical_expression", split: "great → puikus + job → darbas (vieta) is false; praise = puikiai padirbėta.", minimal: "Two words." },
    "loud and clear": { reason: "lexical_expression", split: "loud → garsiai, and → ir, clear → aiškiai is close, but the fixed reply means “perfectly” = labai aiškiai.", minimal: "Three words." },
    "on track": { reason: "lexical_expression", split: "on → ant + track → takas is false; = pagal planą.", minimal: "Two words." },
    "soft launch": { reason: "lexical_expression", split: "soft → minkštas + launch → paleidimas is false; a first release to a few users = bandomasis paleidimas.", minimal: "Two words, one term." },
    "scale up": { reason: "lexical_expression", split: "scale → mastas + up → aukštyn is false; = plėstis (C-PHR).", minimal: "Verb and particle." },
    "we'll scale up": { reason: "grammatical_fusion", split: "'ll → mes would drop “will”, and up → aukštyn is false; the future plėsimės carries we + will + scale up (C-FUT + C-PHR).", minimal: "Three words." },
    "take notes": { reason: "lexical_expression", split: "take → imti + notes → užrašai is false; = užsirašinėti.", minimal: "Two words." },
    "more simply": { reason: "bound_morphology", split: "more → daugiau + simply → paprastai: the comparative is the suffix of paprasčiau.", minimal: "Both words needed." },
    "make sense": { reason: "lexical_expression", split: "make → daryti + sense → prasmė is a calque; = būti suprantama.", minimal: "Two words." },
    "makes sense": { reason: "lexical_expression", split: "makes → daro + sense → prasmę is a calque; agreeing = logiška.", minimal: "Two words." },
    "look for": { reason: "lexical_expression", split: "look → žiūrėti + for → už is false; = ieškoti (C-PHR).", minimal: "Two words." },
    "full one": { reason: "grammatical_fusion", split: "one → viena would add a false numeral; the prop-word is absorbed by the adjective pilna (C-ONE).", minimal: "Two words." },
    "this one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word is absorbed by the demonstrative šito (C-ONE).", minimal: "Two words." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives the order “ne dar”; the fixed reply = dar ne.", minimal: "Two words." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisingas + enough → pakankamai is false; accepting what someone said = supratau.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk Sarai, kad jos mikrofonas išjungtas", done: (c) => !!c.s.muteFixed },
    { lt: "Papasakok savo naujienas", done: (c) => !!c.s.update && !c.s.updOpen },
    { lt: "Paprašyk paaiškinti", done: (c) => !!c.s.clarified },
    { lt: "Pasakyk, ką manai apie Paulo idėją", done: (c) => !!c.s.opinion },
    { lt: "Atsakyk, kas imsis užduoties", done: (c) => !!c.s.ownerDone },
    { lt: "Atsakyk, ar turi kitų klausimų", done: (c) => !!c.s.aobDone },
  ],

  steps: [
    { id: "mute", done: (c) => !!c.s.muteFixed,
      ask: (c) => {
        c.s.muteAsks = (c.s.muteAsks || 0) + 1;
        if (c.s.muteAsks === 1) { K(c, "sara_joins"); P(c, "no_sound"); return; }
        if (c.s.muteAsks === 2) { K(c, "sara_cant_hear"); return; }
        // nobody tells her: Paul does
        P(c, "paul_mute"); unmuted(c);
      },
      expects: MUTE_EXPECTS,
      suggest: [{ lt: "Pasakyti Sarai, kad jos mikrofonas išjungtas", hint: "mute" }] },
    { id: "notes", when: (c) => !!c.s.muteFixed && !!c.s.notesTwist && c.s.notesKind === "notes", done: (c) => !!c.s.notesDone,
      ask: (c) => { c.twist("take_notes"); K(c, "notes_ask"); },
      expects: ["can_do", "cant_do", "suggest_other"],
      suggest: [{ lt: "Sutikti užsirašinėti arba atsisakyti", hint: "notes" }],
      yes: (c) => notesYes(c), no: (c) => notesNo(c) },
    { id: "update", when: (c) => !!c.s.muteFixed, done: (c) => !!c.s.update,
      ask: (c) => {
        if (!c.s.agendaSaid) { c.s.agendaSaid = true; K(c, "agenda"); K(c, "updates_first"); P(c, "paul_update"); K(c, "upd_you"); return; }
        K(c, "upd_reask");
      },
      expects: UPDATE_EXPECTS,
      suggest: [{ lt: "Papasakoti savo naujienas", hint: "update", options: "task" }],
      help: (c) => { c.s.update = "nothing"; K(c, "upd_nothing_resp"); } },
    { id: "clarify", when: (c) => !!c.s.update, done: (c) => !!c.s.clarified,
      ask: (c) => {
        c.s.updOpen = false;
        if (!c.s.jargonSaid) {
          c.s.jargonSaid = true; c.s.lastTerm = "jargon";
          K(c, "move_launch"); P(c, `jargon_${c.s.jargon}`); K(c, "any_q_paul");
        } else K(c, "any_q_reask");
        c.expect(clarifyPending(c));
      },
      expects: CLARIFY_EXPECTS,
      suggest: [{ lt: "Paprašyti Paulo paaiškinti", hint: "clarify_beta" }] },
    { id: "add", when: (c) => !!c.s.clarified, done: (c) => !!c.s.addDone,
      ask: (c) => {
        c.s.lastTerm = null;
        if (!c.s.addAsked) {
          c.s.addAsked = true;
          if (c.s.paulAdds) { P(c, "paul_adds"); K(c, "paul_add_ok"); return; }
          K(c, "anything_add"); return;
        }
        K(c, "add_reask");
      },
      expects: ADD_EXPECTS,
      suggest: [{ lt: "Ką nors pridurti arba pasakyti, kad tai viskas", hint: "add" }],
      yes: (c) => { if (bareAck(c)) { nothingToAdd(c); return; } K(c, "go_ahead"); expectAddWhat(c); },
      no: (c) => { c.s.addDone = true; K(c, "no_add_ok"); } },
    { id: "opinion", when: (c) => !!c.s.addDone, done: (c) => !!c.s.opinion,
      ask: (c) => {
        c.s.lastTerm = "proposal";
        if (!c.s.budgetSaid) {
          c.s.budgetSaid = true;
          K(c, "move_budget"); K(c, "budget_left"); P(c, `proposal_${c.s.proposal}`); K(c, "what_think");
          return;
        }
        K(c, "what_think_reask");
      },
      expects: OPINION_EXPECTS,
      suggest: [{ lt: "Mandagiai nesutikti su Paulu", hint: "opinion" }, { lt: "Sutikti su Paulu", hint: "opinion_yes" }],
      yes: (c) => opinionAgree(c),
      no: (c) => { c.s.opinion = "disagree"; } },
    { id: "why", when: (c) => c.s.opinion === "disagree" && !c.s.offlineSaid, done: (c) => !!c.s.whyDone,
      ask: (c) => {
        c.s.whyAsks = (c.s.whyAsks || 0) + 1;
        if (c.s.whyAsks === 1) { P(c, "paul_why"); return; }
        whyClose(c);
      },
      expects: WHY_EXPECTS,
      suggest: [{ lt: "Paaiškinti, kodėl nesutinki", hint: "why" }],
      help: (c) => whyClose(c) },
    { id: "dl_view", when: (c) => !!c.s.offlineSaid && !!c.s.dlTwist, done: (c) => !!c.s.dlDone,
      ask: (c) => {
        if (!c.s.dlSaid) {
          c.s.dlSaid = true; c.twist("deadline_fight"); c.s.lastTerm = "deadline_fight";
          K(c, "move_deadline", { X: c.s.deliv }); P(c, "paul_too_soon"); S(c, "sara_not_sure"); K(c, "what_think");
          return;
        }
        K(c, "dl_reask");
      },
      expects: DL_EXPECTS,
      suggest: [{ lt: "Pasakyti, ką manai apie terminą", hint: "dl_view" }],
      yes: (c) => dlSide(c, "ask"), no: (c) => dlSide(c, "ask") },
    { id: "owner", when: (c) => !!c.s.offlineSaid && (!c.s.dlTwist || !!c.s.dlDone), done: (c) => !!c.s.ownerDone,
      ask: (c) => {
        c.s.lastTerm = "who";
        if (!c.s.whoAsked) {
          c.s.whoAsked = true;
          if (!c.s.dlSaid) { c.s.dlSaid = true; K(c, "move_deadline", { X: c.s.deliv }); }
          K(c, "who_takes");
          return;
        }
        K(c, "who_reask");
      },
      expects: OWNER_EXPECTS,
      suggest: [{ lt: "Pasisiūlyti arba mandagiai atsisakyti", hint: "owner" }],
      yes: (c) => takeTask(c), no: (c) => declineTask(c) },
    { id: "aob", when: (c) => !!c.s.ownerDone, done: (c) => !!c.s.aobDone,
      ask: (c) => {
        c.s.lastTerm = "aob";
        if (!c.s.aobAsked) { c.s.aobAsked = true; K(c, "aob_ask"); return; }
        K(c, "aob_reask");
      },
      expects: AOB_EXPECTS,
      suggest: [{ lt: "Pasakyti, kad klausimų nėra, arba ką nors iškelti", hint: "aob" }],
      yes: (c) => { if (bareAck(c)) { c.s.aobDone = true; return; } K(c, "go_ahead"); expectAobWhat(c); },
      no: (c) => { c.s.aobDone = true; } },
  ],

  init: (c) => {
    c.s.jargon = c.pick(["beta", "soft", "qa"]);
    c.s.proposal = c.pick(["ads", "party"]);
    c.s.deliv = c.pick(["user_guide", "launch_email", "demo_video"]);
    c.s.paulAdds = c.chance(0.4);
    c.s.paulHelps = c.chance(0.6);
    // twists (returning visits only)
    c.s.dlTwist = c.visits >= 1 && c.chance(0.45);
    c.s.notesTwist = c.visits >= 1 && c.chance(0.4);
    c.s.notesKind = c.chance(0.5) ? "notes" : "summary";
  },

  start: (c) => {
    K(c, "open");
  },

  handlers: {
    // --- Sara on mute ---
    tell_mute(c) {
      if (!live(c)) return;
      if (c.s.muteFixed) { ack(c); return; }
      c.s.toldSara = true;
      unmuted(c);
    },
    tell_mute_ctx(c) { meeting.handlers.tell_mute(c, {}, seg("tell_mute")); },
    not_muted(c) { if (!live(c)) return; if (c.s.muteFixed) { ack(c); return; } K(c, "not_muted_resp"); },
    // "Hi, Sara!" while she is muted: she can't hear it (the mute step asks again)
    greet_team(c) {
      if (!live(c) || !c.s.muteFixed) return;
      if (!c.s.greetedBack && once(c, "greet")) { c.s.greetedBack = true; K(c, "hi_back"); }
    },
    hear_yes(c) { if (!live(c)) return; ack(c); },
    hear_no(c) { if (!live(c)) return; ack(c); },

    // --- updates ---
    upd_done(c, sl) { if (!live(c)) return; react(c, "done", sl.task); },
    upd_working(c, sl) { if (!live(c)) return; react(c, "working", sl.task, sl.whenr); },
    upd_behind(c, sl) { if (!live(c)) return; react(c, "behind", sl.task, sl.whenr); },
    upd_ok(c, _sl, sg) { if (!live(c)) return; react(c, "ok", undefined, undefined, sg.tags.includes("askback")); },
    upd_ok_ctx(c, _sl, sg) { if (!live(c)) return; react(c, sg.tags.includes("busy") ? "busy" : "ok", undefined, undefined, sg.tags.includes("askback")); },
    upd_nothing(c) { if (!live(c)) return; react(c, "nothing"); },
    upd_nothing_ctx(c) { if (!live(c)) return; react(c, "nothing"); },
    task_ctx(c, sl) { if (!live(c)) return; react(c, "working", sl.task); },
    when_ans(c) {
      if (!live(c)) return;
      if (!c.s.update) { react(c, "ok"); return; }
      K(c, "when_ok");
    },
    unsure(c) {
      if (!live(c)) return;
      if (c.step === "opinion" && !c.s.opinion) { opinionUnsure(c); return; }
      if (c.step === "why" && !c.s.whyDone) { whyClose(c); return; }
      if (c.step === "dl_view" && !c.s.dlDone) { dlSide(c, "unsure"); return; }
      GLOBAL_HANDLERS.g_dontknow(c as any, {});
    },
    will_send(c) { if (!live(c)) return; ack(c); },
    cant_send(c) { if (!live(c)) return; K(c, "send_no"); },
    accept_help(c) { if (!live(c)) return; if (c.s.helpOffered) P(c, "paul_talk_later"); else ack(c); },

    // --- clarifying ---
    clarify(c) { if (!live(c)) return; if (!clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, {}); },
    word_q(c, sl) { if (!live(c)) return; wordQ(c, sl.term); },
    term_echo_ctx(c, sl) { if (!live(c)) return; wordQ(c, sl.term); },
    // the global "I don't understand" / "What does … mean?": explain the jargon when there is some
    g_dont_understand(c) { if (!live(c)) return; if (!clarifyLast(c)) GLOBAL_HANDLERS.g_dont_understand(c as any, {}); },
    g_meaning(c, sl) { if (!live(c)) return; if (sl?.w || !clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, sl); },

    // --- adding something ---
    add_req(c) {
      if (!live(c)) return;
      if (c.step === "aob" && !c.s.aobDone) { K(c, "go_ahead"); expectAobWhat(c); return; }
      if (c.step === "add" && !c.s.addDone) { K(c, "go_ahead"); expectAddWhat(c); return; }
      K(c, "go_ahead"); c.hold(); // the question or the point comes next
    },
    add_test(c) { addPoint(c, "test"); },
    add_help(c) { addPoint(c, "help"); },
    add_customers(c) { addPoint(c, "customers"); },
    add_feedback(c) { addPoint(c, "feedback"); },
    add_other_ctx(c) {
      if (!live(c)) return;
      if (c.step === "aob" && !c.s.aobDone) { aobTopic(c, "aob_other_ok"); return; }
      addPoint(c, "other");
    },
    nothing_more(c) {
      if (!live(c)) return;
      if (c.step === "clarify" && !c.s.clarified) { noQuestions(c); return; }
      if (c.step === "add" && !c.s.addDone) { c.s.addDone = true; K(c, "no_add_ok"); return; }
      if (c.step === "aob" && !c.s.aobDone) { c.s.aobDone = true; return; }
      ack(c);
    },

    // --- the budget ---
    disagree(c, _sl, sg) {
      if (!live(c)) return;
      if (c.step === "dl_view" && !c.s.dlDone) { dlFrom(c, "disagree", sg.tags); return; }
      if (c.s.offlineSaid) { if (once(c, "noted")) K(c, "noted"); return; }
      if (!c.s.opinion && c.s.budgetSaid) c.s.opinion = "disagree";
      if (sg.tags.includes("why")) giveReason(c, sg.tags);
      // otherwise the "why" step asks Paul's "Why not?"
    },
    agree(c, _sl, sg) {
      if (!live(c)) return;
      if (c.step === "dl_view" && !c.s.dlDone) { dlFrom(c, "agree", sg.tags); return; }
      if (c.step === "opinion" && !c.s.opinion) { opinionAgree(c); return; }
      ack(c);
    },
    reason(c, _sl, sg) {
      if (!live(c)) return;
      if (c.s.budgetSaid && !c.s.offlineSaid) { giveReason(c, sg.tags); return; }
      if (once(c, "noted")) K(c, "noted");
    },
    ask_back(c) {
      if (!live(c)) return;
      if (c.step === "opinion" || c.step === "dl_view") { K(c, "your_first"); return; }
      // "And you?" to "How's it going?"
      if (c.step === "update" && !c.s.update) { if (once(c, "askedBack")) K(c, "k_good_thanks"); return; }
      ack(c);
    },
    // "Who, me?": yes, you; then the question again (the step or the open question asks it)
    who_me(c) {
      if (!live(c)) return;
      if (!once(c, "whoMe")) return;
      K(c, "yes_you");
      if (c.step === "owner" && !c.s.ownerDone) { K(c, "can_you_take"); c.hold(); }
    },
    talk_later(c) { if (!live(c)) return; P(c, "talk_later_ok"); },

    // --- the deadline ---
    dl_view(c, _sl, sg) {
      if (!live(c)) return;
      if (c.s.dlTwist && !c.s.dlDone && c.s.dlSaid) { dlView(c, sg.tags); return; }
      ack(c);
    },
    who_ctx(c, _sl, sg) { if (!live(c)) return; if (c.s.dlTwist && !c.s.dlDone) dlFrom(c, "agree", sg.tags); else ack(c); },

    // --- who's taking this? ---
    can_do(c) {
      if (!live(c)) return;
      if (c.step === "notes" && !c.s.notesDone) { notesYes(c); return; }
      if (c.step === "owner" && !c.s.ownerDone) { takeTask(c); return; }
      ack(c);
    },
    // "Me!" volunteers; "Me?" asks whether Kate means the learner
    can_do_ctx(c) {
      if (/\bme\s*\?\s*$/i.test(c.heard || "")) { meeting.handlers.who_me(c, {}, seg("who_me")); return; }
      meeting.handlers.can_do(c, {}, seg("can_do"));
    },
    cant_do(c) {
      if (!live(c)) return;
      if (c.step === "notes" && !c.s.notesDone) { notesNo(c); return; }
      if (c.step === "owner" && !c.s.ownerDone) { declineTask(c); return; }
      ack(c);
    },
    suggest_other(c, _sl, sg) {
      if (!live(c)) return;
      if (c.step === "notes" && !c.s.notesDone) { notesNo(c); return; }
      if (c.step === "owner" && !c.s.ownerDone) { suggestOther(c, sg.tags.includes("sara") ? "sara" : "paul"); return; }
      ack(c);
    },
    with_help(c) { if (!live(c)) return; if (c.step === "owner" && !c.s.ownerDone) withHelp(c); else ack(c); },

    // --- any other business ---
    aob_wfh(c) { aobTopic(c, "aob_wfh_ok"); },
    aob_lunch(c) { aobTopic(c, "aob_lunch_ans"); },
    aob_vacation(c) { aobTopic(c, "aob_vacation_ok"); },
    aob_printer(c) { aobTopic(c, "aob_printer_ok", "paul"); },
    aob_other_ctx(c) { aobTopic(c, "aob_other_ok"); },

    // --- side questions, goodbyes ---
    q_agenda(c) { if (!live(c)) return; K(c, "agenda_ans"); },
    q_deadline(c) { if (!live(c)) return; K(c, "deadline_ans", { X: c.s.deliv }); },
    q_next(c) { if (!live(c)) return; K(c, "next_meeting_ans"); },
    bye_all(c) {
      if (!live(c)) return;
      if (c.s.closingSaid) { goodbye(c); return; }
      K(c, "not_yet");
    },
    // "Thanks!": answered by whoever it is for; at "Anything to add?" / "Any other business?" it also
    // means "nothing"
    g_thanks(c) {
      if (!live(c)) return;
      if (c.s.closingSaid) { goodbye(c); return; }
      if (c.step === "add" && !c.s.addDone) { nothingToAdd(c); return; }
      if (c.step === "aob" && !c.s.aobDone) { c.s.aobDone = true; return; }
      thanksReply(c);
    },
    g_ok(c) {
      if (!live(c)) return;
      if (c.step === "add" && !c.s.addDone) { nothingToAdd(c); return; }
      if (c.step === "aob" && !c.s.aobDone) { c.s.aobDone = true; }
    },
    g_bye(c, _sl, sg) {
      if (!live(c)) return;
      if (c.s.closingSaid) { goodbye(c); return; }
      // "Sorry, I have to go.": the learner leaves the meeting early (at "Any other business?" that is
      // simply the end of the meeting for them)
      if (sg?.tags?.includes("leaving")) {
        if (c.s.ownerDone) { c.s.aobDone = true; c.complete(); K(c, "leave_ok"); goodbye(c); return; }
        c.s.ended = true; K(c, "leave_ok"); c.hold(); c.end(); return;
      }
      K(c, "not_yet");
    },
  },

  finish: (c) => {
    c.complete();
    c.s.closingSaid = true;
    c.s.lastTerm = null;
    K(c, "closing");
    if (c.s.notesTwist && c.s.notesKind === "summary") {
      c.twist("send_summary");
      K(c, "summary_ask");
      c.expect(summaryPending());
      return;
    }
    c.expect(closingPending());
  },

  tests: [
    // Sara on mute
    { say: "Sara, you're on mute!", intent: "tell_mute", step: "mute" },
    { say: "I think you're muted.", intent: "tell_mute", step: "mute" },
    { say: "Sara, click the microphone button!", intent: "tell_mute" },
    { say: "Sara, you need to unmute.", intent: "tell_mute" },
    { say: "Sara, we can't hear you.", intent: "tell_mute_ctx", step: "mute" },
    { say: "Sara, you're not on mute.", intent: "not_muted", not: ["tell_mute"] },
    { say: "Hi, Sara!", intent: "greet_team", step: "mute", not: ["tell_mute"] },
    { say: "Yes, we can hear you now!", intent: "hear_yes" },
    { say: "Yes, loud and clear!", intent: "hear_yes" },
    { say: "No, still nothing.", intent: "hear_no", not: ["hear_yes"] },
    // updates
    { say: "I finished the report.", intent: "upd_done", step: "update", slots: { task: "report" } },
    { say: "I'm working on the presentation.", intent: "upd_working", step: "update", slots: { task: "presentation" } },
    { say: "I'm working on the report. It'll be ready by Friday.", intent: "upd_working", step: "update", slots: { task: "report" } },
    { say: "The website will be ready by Friday.", intent: "upd_working", slots: { task: "website" } },
    { say: "I haven't finished the report yet.", intent: "upd_behind", not: ["upd_done"] },
    { say: "The slides aren't ready yet.", intent: "upd_behind", not: ["upd_done"] },
    { say: "I'm a bit behind with the budget.", intent: "upd_behind", step: "update" },
    { say: "Everything's on track.", intent: "upd_ok", step: "update" },
    { say: "Good, thanks!", intent: "upd_ok_ctx", step: "update" },
    { say: "By Friday.", intent: "when_ans" },
    // clarifying
    { say: "Could you clarify that?", intent: "clarify", step: "clarify" },
    { say: "Could you say that more simply?", intent: "clarify" },
    { say: "Sorry, what do you mean?", intent: "clarify" },
    { say: "I don't understand.", intent: "clarify", step: "clarify" },
    { say: "What do you mean by go-live?", intent: "word_q", slots: { term: "golive" } },
    { say: "What does soft launch mean?", intent: "word_q", slots: { term: "soft" } },
    { say: "Sorry, what's QA?", intent: "word_q", slots: { term: "qa" } },
    { say: "What are blockers?", intent: "word_q", slots: { term: "blockers" } },
    { say: "What's a deadline?", intent: "word_q", slots: { term: "deadline" } },
    { say: "What's the deadline?", intent: "q_deadline", not: ["word_q"] },
    { say: "What does take this offline mean?", intent: "word_q", slots: { term: "offline" } },
    { say: "Go-live?", intent: "term_echo_ctx", step: "clarify" },
    { say: "No questions from me.", intent: "nothing_more", step: "clarify" },
    // adding something
    { say: "I'd like to add something.", intent: "add_req", step: "add" },
    { say: "Can I add something?", intent: "add_req" },
    { say: "I'd like to add something: we should test it on older phones.", intent: "add_test", step: "add" },
    { say: "We should test it on older phones.", intent: "add_test", step: "add" },
    { say: "I can help with the testing.", intent: "add_help", step: "add" },
    { say: "Our customers are asking about the launch date.", intent: "add_customers" },
    { say: "We should ask users for feedback.", intent: "add_feedback" },
    { say: "No, that's all from me.", intent: "nothing_more", step: "add" },
    // the budget
    { say: "I'm not sure I agree.", intent: "disagree", step: "opinion", not: ["agree", "unsure"] },
    { say: "I see your point, but it's a lot of money.", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "I don't agree with Paul.", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "I don't think that's a good idea.", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "It's a good idea, but it's too risky.", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "I disagree.", intent: "disagree", step: "opinion" },
    { say: "I agree with Paul.", intent: "agree", step: "opinion" },
    { say: "That makes sense.", intent: "agree", step: "opinion" },
    { say: "Not a bad idea.", intent: "agree", step: "opinion", not: ["disagree"] },
    { say: "Maybe we could split it?", intent: "reason", step: "opinion" },
    { say: "It's too expensive.", intent: "reason", step: "why" },
    { say: "Because we should keep some money for later.", intent: "reason", step: "why" },
    { say: "Our customers don't use social media much.", intent: "reason", step: "why" },
    { say: "I'm not sure.", intent: "unsure", step: "opinion", not: ["disagree", "agree"] },
    { say: "What do you think, Kate?", intent: "ask_back", step: "opinion" },
    // the deadline twist
    { say: "I agree with Sara.", intent: "agree", step: "dl_view" },
    { say: "I think Paul is right.", intent: "agree", step: "dl_view" },
    { say: "Maybe we could send a short version on Friday?", intent: "dl_view", step: "dl_view" },
    { say: "We need one more week.", intent: "dl_view", step: "dl_view" },
    { say: "Friday is not possible.", intent: "dl_view", step: "dl_view", not: ["agree"] },
    // who's taking this?
    { say: "I can do that.", intent: "can_do", step: "owner" },
    { say: "I'll take it.", intent: "can_do", step: "owner" },
    { say: "I can do the user guide.", intent: "can_do", step: "owner" },
    { say: "Sorry, I'm really busy this week.", intent: "cant_do", step: "owner", not: ["can_do"] },
    { say: "I can't do it this week.", intent: "cant_do", step: "owner", not: ["can_do"] },
    { say: "Maybe Paul could do it?", intent: "suggest_other", step: "owner" },
    { say: "Me!", intent: "can_do_ctx", step: "owner" },
    // any other business
    { say: "No, nothing from me.", intent: "nothing_more", step: "aob" },
    { say: "Can I work from home on Friday?", intent: "aob_wfh", step: "aob" },
    { say: "When's the team lunch?", intent: "aob_lunch" },
    { say: "I'm on vacation next week.", intent: "aob_vacation" },
    { say: "I'm on holiday next week.", intent: "aob_vacation" },
    { say: "The printer isn't working again.", intent: "aob_printer" },
    { say: "Thanks, everyone!", intent: "bye_all" },
    { say: "Great meeting!", intent: "bye_all" },
    { say: "What's on the agenda?", intent: "q_agenda" },
    // traps
    { say: "purple elephant keyboard", intent: "none" },
    { say: "The train leaves at seven", intent: "none" },
    { say: "Me?", intent: "who_me" },
    // review fixes (27 Sep): thanks with a name, asked back, "who, me?", bare acknowledgements
    { say: "Thank you, Paul. That makes sense.", intent: "nothing_more", step: "clarify" },
    { say: "Thank you. That makes sense.", intent: "nothing_more", step: "clarify", not: ["g_thanks"] },
    { say: "Thanks, Paul, that's clear now.", intent: "nothing_more", not: ["accept_help"] },
    { say: "Thank you, Paul. It's clear now.", intent: "nothing_more" },
    { say: "Thanks, Kate, got it.", intent: "nothing_more" },
    { say: "It's clear now.", intent: "nothing_more", step: "clarify" },
    { say: "Thanks, that makes sense.", intent: "agree", step: "opinion" },
    { say: "Fine, thanks. And you?", intent: "upd_ok_ctx", step: "update", not: ["ask_back"] },
    { say: "I'm good, thanks. And you?", intent: "upd_ok_ctx", step: "update" },
    { say: "Everything's on track, and you?", intent: "upd_ok", step: "update", not: ["ask_back"] },
    { say: "Who, me?", intent: "who_me", step: "owner" },
    { say: "You mean me?", intent: "who_me", step: "opinion" },
    { say: "Me!", intent: "can_do_ctx", step: "owner" },
    // sims 27 Sep: "The report." to Kate's "What are you working on?" (the update step itself, not only its re-ask)
    { say: "The report.", intent: "task_ctx", step: "update", slots: { task: "report" } },
    { say: "On the presentation.", intent: "task_ctx", step: "update", slots: { task: "presentation" } },
    { say: "I haven't started the report yet.", intent: "upd_behind", step: "update", not: ["task_ctx", "upd_working", "upd_done"] },
    { say: "The slides aren't done yet.", intent: "upd_behind", step: "update", not: ["task_ctx", "upd_done"] },
    // a light update to "How's it going?" / "What are you working on?"; at "Anything to add?" and "Any other
    // business?" the same words mean "nothing"
    { say: "Nothing much.", intent: "upd_nothing_ctx", step: "update", not: ["nothing_more"] },
    { say: "Not much.", intent: "upd_nothing_ctx", step: "update", not: ["nothing_more"] },
    { say: "Nothing special.", intent: "upd_nothing_ctx", step: "update", not: ["nothing_more"] },
    { say: "Not much, really.", intent: "upd_nothing_ctx", step: "update" },
    { say: "Nothing much going on this week.", intent: "upd_nothing_ctx", step: "update" },
    { say: "Not a lot.", intent: "upd_nothing_ctx", step: "update" },
    { say: "Nothing much, just the report.", intent: "task_ctx", step: "update", slots: { task: "report" }, not: ["upd_nothing_ctx", "reason"] },
    { say: "Not much time.", intent: "none", step: "update" },
    { say: "Nothing much.", intent: "nothing_more", step: "aob", not: ["upd_nothing", "upd_nothing_ctx"] },
    { say: "Nothing.", intent: "nothing_more", step: "aob", not: ["upd_nothing", "upd_nothing_ctx"] },
    { say: "Not much.", intent: "nothing_more", step: "aob", not: ["upd_nothing", "upd_nothing_ctx"] },
    { say: "Nothing special.", intent: "nothing_more", step: "aob", not: ["upd_nothing", "upd_nothing_ctx"] },
    { say: "No, nothing much.", intent: "nothing_more", step: "add", not: ["upd_nothing", "upd_nothing_ctx"] },
    { say: "Not a lot.", intent: "none", step: "aob" },
    // "Could you clarify that?" to "Could you send the report to everyone after the meeting?"
    { say: "Could you clarify that?", intent: "clarify", step: "update", not: ["g_meaning"] },
  ],

  sims: [
    { name: "happy path", turns: [
      "Sara, you're on mute!", "Yes, we can hear you now!", "I finished the report.", "Sure, I'll send it after the meeting.", "Could you clarify that?", "Yes, thanks!",
      "I'd like to add something.", "We should test it on older phones.", "I'm not sure I agree.", "It's too expensive.", "Sure, let's talk later.",
      "I can do that.", "No, nothing from me.", "Thanks, everyone!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "short answers", turns: [
      "Sara, mute!", "Yes!", "Good, thanks!", "The report.", "By Friday.", "Sorry, what do you mean?", "Got it, thanks.", "No.",
      "Good idea!", "Me!", "No.", "Bye!",
    ], expect: { complete: true }, auto: AUTO,
    // "Me!" answers "Who's taking this?": no deadline fight (its "What do you think?") before it
    setup: (s) => { s.dlTwist = false; } },
    { name: "questions first", turns: [
      "Sara, we can't hear you.", "Yes, loud and clear!", "What's on the agenda?", "I'm working on the presentation. It'll be ready by Friday.",
      "What does go-live mean?", "Can I add something?", "I can help with the testing.", "What do you mean?",
      "I see your point, but it's a lot of money.", "Sounds good!", "Maybe Paul could do it?", "Can I work from home on Friday?",
      "No, that's all.", "Great meeting! Bye!",
    ], expect: { complete: true }, auto: AUTO,
    // "Maybe Paul could do it?" answers "Who's taking this?": no deadline fight before it
    setup: (s) => { s.dlTwist = false; } },
    { name: "review fixes: thanks, asked back, who me, bare okay", turns: [
      "Sara, you're on mute!", "Yes!", "Fine, thanks. And you?", "The report.", "By Friday.", "Could you clarify that?",
      "Thank you, Paul. That makes sense.", "Okay, thanks.", "Good idea!", "Who, me?", "Sure, I can do that.", "Thanks.", "Thanks, everyone!",
    ], expect: { complete: true }, auto: AUTO,
    // "Fine, thanks. And you?" answers "How's it going?" and "Who, me?" answers "Who's taking this?": no "Could you
    // take notes?" and no deadline fight (its "What do you think?") before them
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // the twists on every seed: "Could you take notes?" (no: Paul takes them), then Paul and Sara disagree about the deadline
    { name: "twists: notes (Paul takes them), the deadline fight", turns: [
      "Sara, you're on mute!", "Yes, we can hear you.", "Sorry, I can't take notes today.", "I'm working on the website. It'll be ready by Friday.",
      "Could you say that more simply?", "It's clear now.", "No, nothing to add.", "I don't think that's a good idea.", "Because we should keep some money for later.",
      "Sure, after the meeting works for me.", "I agree with you.", "With Paul.", "I can do it.", "No, nothing from me.", "Thanks, everyone!",
    ], expect: { complete: true }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "notes"; s.dlTwist = true; } },
    // the twist on every seed: "Could you send everyone a quick summary?" at the end (no: Kate does it)
    { name: "twist: the summary at the end", turns: [
      "Sara, can you hear us?", "Yes, perfectly.", "Not much, really.", "Sorry, what does that mean?", "Okay, thanks.",
      "I'd like to add something: our customers are asking about the launch date.", "That makes sense.", "Sorry, I can't do it this week.",
      "When's the team lunch?", "No, that's it from me.", "Sorry, I can't send it today.", "Okay. Bye, everyone!",
    ], expect: { complete: true }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "summary"; s.dlTwist = false; } },
    // "Could you clarify that?" to "Could you send the report to everyone after the meeting?": Kate says it
    // simply and the question is open again; "Nothing much." at "Any other business?" = nothing
    { name: "clarifying the send request", turns: [
      "Sara, you're on mute!", "Yes!", "I finished the report.", "Could you clarify that?", "Okay.", "Could you clarify that?",
      "Yes, thanks!", "No, nothing to add.", "I agree with Paul.", "I can do that.", "Nothing much.", "Thanks, everyone!",
    ], expect: { complete: true, state: { sendClarified: true, update: "done", updOpen: false, aobDone: true } }, auto: AUTO,
    // "I can do that." answers "Who's taking this?": no notes question and no deadline fight before it
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // a light update to "What are you working on right now?"; "Not much." to "Anything to add?" = nothing
    { name: "a light update: nothing much", turns: [
      "Sara, you're on mute!", "Yes!", "Good, thanks!", "Nothing special.", "No questions from me.", "Not much.", "I agree with Paul.",
      "I can do that.", "Not much.", "Thanks, everyone!",
    ], expect: { complete: true, state: { update: "nothing", addDone: true, aobDone: true } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    { name: "problems: no sound, behind, no questions, busy", turns: [
      "Hi, Sara!", "Sara, you're on mute!", "No, still nothing.", "Yes, now we can hear you.", "I'm a bit behind with the budget.", "Next week.",
      "No questions from me.", "No, nothing to add.", "I'm not sure I agree.", "I don't know.", "Sure, let's talk later.",
      "Sorry, I'm really busy this week.", "I'm on vacation next week.", "Nothing else.", "Thanks, Kate! See you later.",
    ], expect: { complete: true }, auto: AUTO },
  ],
};

export default meeting;
