// Song 34 "Any Other Business?" → Puerto Colibrí: "¿Algún otro asunto?"
// The Monday team meeting at Línea Clara, in the meeting room. Sofía (team lead) runs it, Pablo sits at the table
// and Sara joins on the screen from home ("home office"). All three say tú to the learner, as Mexican colleagues do;
// to the whole team they say ustedes. Sara starts talking while she is still muted ("¡Sara, estás en silencio!").
// Sofía's agenda: quick updates on everyone's "pendientes" (the learner's own: "Ya terminé el reporte", "Sigo con
// la presentación", "Va a estar listo el viernes"), the app launch (Pablo explains it in Mexican tech Spanglish:
// "la beta ya está arriba, pero el go-live se puede recorrer una semana"; the learner asks "¿Me lo puedes explicar?" /
// "¿Qué significa…?", then may say "Quiero agregar algo"), the budget (Pablo wants to put all $80,000 into one thing;
// the learner says what they think, ideally disagreeing politely: "No sé si estoy de acuerdo", "Entiendo tu punto,
// pero…"; Sofía: "Mejor lo vemos aparte"), the next deadline ("¿Quién se encarga?" → "Yo me encargo"), then
// "Vamos cerrando. ¿Algún otro asunto?" (Mexican agendas end with "asuntos generales") and "¡Gracias a todos!".
// "¿Me lo puedes explicar?" works everywhere: Sofía or Pablo explains the last thing that was unclear.
// Twists (returning visits, as in the English): Pablo and Sara disagree about the deadline and Sofía asks the
// learner; Sofía asks the learner to take notes (at the start) or to send a summary (at the end).
// Variety: three versions of Pablo's jargon, two budget ideas, three deliverables, Pablo sometimes adds something
// himself, Pablo offers help when the learner is behind.
// Mexican-only words have a neutral twin (ahorita, recorrer). Mexican office words that the whole region knows:
// pendientes, la minuta, home office, sistemas (IT), retroalimentación. Accepted from learners: junta (Mexico's
// word for a work meeting), Spain's vosotros, móvil, ordenador, coger, añadir, vale.
//
// NEEDS: global.ts g_thanks has no "gracias a todos" / "gracias, equipo"; covered here in bye_all.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// The learner's work (update) and the deliverable of the next deadline

const TASKS: EntityDef[] = [
  ent("report", "reporte", "report", "m", { forms: ["reportes", "informe", "informes", "el informe", "reporte mensual", "reporte de ventas", "informe mensual", "reporte semanal", "el reporte del mes"], chip: "reporte" }),
  ent("presentation", "presentación", "presentation", "f", { pl: "presentaciones", ltPl: "presentations",
    forms: ["presentacion", "presentaciones", "las diapositivas", "diapositivas", "las diapos", "diapos", "las laminas", "laminas", "el power point", "power point", "el powerpoint", "powerpoint"], chip: "presentación" }),
  ent("budget", "presupuesto", "budget", "m", { forms: ["presupuestos", "el plan de presupuesto"], chip: "presupuesto" }),
  ent("website", "página | web", "page | web", "f", { pl: "páginas | web", ltPl: "pages | web",
    forms: ["pagina web", "la pagina", "pagina", "sitio web", "el sitio web", "el sitio", "la web", "web", "la pagina nueva", "pagina de internet"], chip: "página web", attrs: { nat: "website" } }),
  ent("schedule", "calendario", "schedule", "m", { forms: ["cronograma", "el cronograma", "calendarios", "el plan de trabajo", "plan de trabajo"], chip: "calendario" }),
  ent("newsletter", "boletín", "newsletter", "m", { pl: "boletines", ltPl: "newsletters", forms: ["boletin", "boletines", "newsletter", "el newsletter", "boletin de noticias"], chip: "boletín" }),
  ent("proposal", "propuesta", "proposal", "f", { forms: ["propuestas", "la propuesta para el cliente", "cotizacion", "la cotizacion"], chip: "propuesta" }),
  ent("survey", "encuesta", "survey", "f", { forms: ["encuestas", "cuestionario", "el cuestionario", "encuesta de clientes"], chip: "encuesta" }),
  ent("spreadsheet", "Excel", "spreadsheet", "m", { forms: ["excel", "el excel", "hoja de calculo", "la hoja de calculo", "el excel de ventas", "excel de ventas", "la tabla de ventas", "las cifras de ventas", "los numeros de ventas"], chip: "Excel" }),
  ent("app", "app", "app", "f", { pl: "apps", ltPl: "apps", forms: ["aplicacion", "la aplicacion", "apps", "la app nueva"], chip: "app" }),
  ent("contract", "contrato", "contract", "m", { forms: ["contratos"], chip: "contrato" }),
  ent("design", "diseño", "design", "m", { forms: ["diseno", "disenos", "el logo", "logo", "el logotipo", "el diseno nuevo", "el nuevo diseno"], chip: "diseño" }),
  ent("invoices", "factura", "invoice", "f", { pl: "facturas", ltPl: "invoices", forms: ["facturas", "las facturas", "facturacion", "la facturacion"], chip: "facturas", attrs: { plural: true } }),
  ent("training", "plan | de | capacitación", "plan | for | training", "m", { pl: "planes | de | capacitación", ltPl: "plans | for | training",
    forms: ["capacitacion", "la capacitacion", "plan de capacitacion", "el curso de capacitacion", "el plan de entrenamiento"], chip: "plan de capacitación", attrs: { nat: "training plan" } }),
  ent("campaign", "campaña", "campaign", "f", { forms: ["campana", "campanas", "campana de marketing", "la campana de publicidad", "campana de publicidad", "la campana de redes"], chip: "campaña" }),
];
const byTask = (id: string) => TASKS.find((e) => e.id === id)!;
/** Bind a task; a plural one (las facturas) needs plural agreement. */
const taskVar = (id: string) => ({ id, qty: byTask(id)?.attrs?.plural ? 2 : 1 });
const notPlural = (e: EntityDef) => !e.attrs?.plural;

const DELIVS: EntityDef[] = [
  ent("user_guide", "manual", "user guide", "m", { forms: ["manual de usuario", "el manual de usuario", "la guia", "guia", "guia de usuario", "el instructivo", "instructivo", "manual"], chip: "manual de usuario" }),
  ent("launch_email", "correo | de | lanzamiento", "email | of | launch", "m", { forms: ["correo", "el correo", "el mail", "mail", "email", "el email", "correo de lanzamiento", "el anuncio", "anuncio del lanzamiento", "el correo para los clientes"],
    chip: "correo de lanzamiento", attrs: { nat: "launch email" } }),
  ent("demo_video", "video | demo", "video | demo", "m", { forms: ["video", "el video", "demo", "el demo", "la demo", "video demo", "video de la app", "el video de la app", "video promocional"],
    chip: "video demo", attrs: { nat: "demo video" } }),
];

// ---------------------------------------------------------------------------
// Flags used more than once

const F_TU = "Colleagues in a Mexican office say tú to each other.";
const F_VA = "ir a + infinitive: the everyday future (vas a tener = you'll have).";
const F_REC = "Mexican: recorrer (una fecha) = to push back, postpone.";
const F_AHORITA = "Mexican: ahorita = right now (also “in a little while”).";
const F_PEND = "Mexican office word: los pendientes = your to-dos, the tasks you have open.";
const F_LE = "le doubles the one who receives it (a todo el equipo); English needs no word for it.";
const F_LES = "les doubles the people who receive it (a todos); English needs no word for it.";
const F_LO = "lo stands for the thing just mentioned: it.";
const F_ART = "The article has no English word here.";

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** The current learner turn: the engine builds a fresh ctx for every input, so the same sentence said
 *  on two different turns gets two different keys. */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let n = turnIds.get(c); if (n === undefined) { n = ++turnSeq; turnIds.set(c, n); } return `${n}:${c.heard}`; };
/** The lines of the NPCs' latest turn (who, and whether it was a question): a "Gracias" is for whoever
 *  just gave the learner something. */
function note(c: Ctx, who: string, line: string) {
  const k = turn(c);
  if (c.s.__noteTurn !== k) { c.s.__noteTurn = k; c.s.__lines = []; }
  c.s.__lines.push({ who, q: /\?["”]?\s*$/.test(meeting.lines[line]?.[0]?.en ?? "") });
}
const K = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "kate", line); c.speaker("kate"); c.say(line, vars); };
const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "paul", line); c.speaker("paul"); c.say(line, vars); };
const S = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); note(c, "sara", line); c.speaker("sara"); c.say(line, vars); };
/** Sofía's short "Muy bien." — skipped when someone already reacted to this utterance. */
const ack = (c: Ctx) => { if (c.s.__spokeFor === turn(c) && c.heard) return; K(c, "ok"); };
const live = (c: Ctx) => !c.s.ended;
/** True the first time per utterance for this key (one answer can arrive as several segments). */
const once = (c: Ctx, key: string) => { const k = turn(c); if (c.s["__once_" + key] === k) return false; c.s["__once_" + key] = k; return true; };
const seg = (intent: string, tags: string[] = []): Segment => ({ intent, slots: {}, tags });
/** Only once per learner turn ("Gracias. Ya quedó claro." gets one "¡Perfecto!", not two). */
const one = (key: string, f: (c: Ctx) => void) => (c: Ctx) => { if (once(c, key)) f(c); };
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** "Ok." / "Va, gracias." / "Gracias, Sofía.": nothing but an acknowledgement. To "¿Algo que agregar?"
 *  or "¿Algún otro asunto?" it means "no, nothing". */
const bareAck = (c: Ctx) =>
  /^(?:[\s,.!¡]*(?:m+|e+m+|este|ok|okey|okay|va|sale|vale|bueno|muy bien|perfecto|genial|entendido|ya veo|de acuerdo|esta bien|gracias|muchas gracias|mil gracias|sofia|pablo|sara|entonces|pues))+[\s,.!]*$/.test(fold(c.heard || ""));

/** "¡Gracias!": Pablo or Sara answers if they just gave the learner something (an explanation, help),
 *  otherwise Sofía. Nobody answers a thanks that came with a request already answered this turn. */
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
// task_ctx: "El reporte." to "¿En qué estás trabajando?" (one of Sofía's ways of asking)
const UPDATE_EXPECTS = ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_ok_ctx", "upd_nothing", "upd_nothing_ctx", "upd_problem_ctx", "task_ctx"];
const CLARIFY_EXPECTS = ["clarify", "word_q", "term_echo_ctx", "nothing_more", "add_req"];
const ADD_POINTS = ["add_test", "add_help", "add_customers", "add_feedback"];
const ADD_EXPECTS = ["add_req", ...ADD_POINTS, "add_other_ctx", "nothing_more"];
const OPINION_EXPECTS = ["disagree", "agree", "reason", "unsure", "ask_back"];
const WHY_EXPECTS = ["reason", "unsure", "disagree", "agree"];
const DL_EXPECTS = ["agree", "disagree", "dl_view", "who_ctx", "unsure"];
const OWNER_EXPECTS = ["can_do", "can_do_ctx", "cant_do", "suggest_other", "with_help", "add_help"];
const AOB_TOPICS = ["aob_wfh", "aob_lunch", "aob_vacation", "aob_printer", "aob_other_ctx"];
const AOB_EXPECTS = ["nothing_more", ...AOB_TOPICS, "add_req", ...ADD_POINTS];

/** Jargon the learner may ask about: who explains it, and the line. */
const TERMS: Record<string, ["kate" | "paul", string]> = {
  beta: ["paul", "term_beta"], golive: ["paul", "term_golive"], slip: ["paul", "term_slip"], soft: ["paul", "term_soft"],
  scale: ["paul", "term_scale"], feature: ["paul", "term_feature"], qa: ["paul", "term_qa"], blockers: ["paul", "term_blockers"],
  up: ["paul", "term_up"], launch: ["paul", "term_launch"], offline: ["kate", "term_offline"], wrap: ["kate", "term_wrap"],
  aob: ["kate", "term_aob"], deadline: ["kate", "term_deadline"], agenda: ["kate", "term_agenda"], mute: ["kate", "term_mute"],
  pending: ["kate", "term_pending"],
};
const LAUNCH_TERMS = new Set(["beta", "golive", "slip", "soft", "scale", "feature", "qa", "blockers", "up", "launch"]);
/** The words of each term as the learner says them (for "¿Qué significa recorrer?" heard by the global g_meaning). */
const TERM_FORMS: Record<string, string[]> = {
  beta: ["beta", "la beta", "una beta", "version beta"],
  golive: ["go live", "golive", "el go live", "golaiv", "go laiv"],
  slip: ["recorrer", "recorrerse", "se recorre", "se puede recorrer", "recorrer una semana", "recorre", "se puede mover", "mover la fecha"],
  soft: ["soft launch", "el soft launch", "un soft launch", "sof launch", "soft lonch"],
  scale: ["escalar", "escalamos", "escalar la app"],
  feature: ["feature complete", "fiture complete", "feature completa", "el feature complete"],
  qa: ["qa", "q a", "cu a", "kiu ei", "el qa", "control de calidad"],
  blockers: ["blockers", "blocker", "los blockers", "bloqueantes", "bloqueadores", "un blocker"],
  up: ["arriba", "esta arriba", "ya esta arriba"],
  offline: ["aparte", "lo vemos aparte", "verlo aparte", "por fuera", "lo vemos por fuera"],
  wrap: ["vamos cerrando", "cerrando", "ir cerrando"],
  aob: ["asuntos generales", "algun otro asunto", "otro asunto", "otros asuntos"],
  mute: ["en silencio", "muteada", "muteado", "en mute", "mute", "mutear"],
  pending: ["pendientes", "los pendientes", "pendiente"],
};
function termOf(text?: string): string | undefined {
  const w = fold(text || "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!w) return undefined;
  return Object.keys(TERM_FORMS).find((k) => TERM_FORMS[k].includes(w));
}

// ---------------------------------------------------------------------------
// Sara on mute

/** Sara is unmuted (the learner told her, or Pablo did): she asks whether we can hear her. */
function unmuted(c: Ctx) {
  c.s.muteFixed = true;
  S(c, "sara_unmuted");
  expectSaraHear(c);
}

function expectSaraHear(c: Ctx) {
  c.expect({
    id: "sara_hear", optional: true, expects: ["hear_yes", "hear_no"], hints: ["sara_hear"],
    suggest: [{ lt: "Tell Sara whether you can hear her now", hint: "sara_hear" }],
    yes: (cc) => saraOk(cc),
    no: (cc) => saraStill(cc),
    on: {
      hear_yes: (cc) => saraOk(cc),
      greet_team: (cc) => saraOk(cc),
      hear_no: (cc) => saraStill(cc),
      // "Más o menos." (the global how-are-you word): still not good
      g_howareyou_bad: (cc) => saraStill(cc),
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
/** "Lo puede hacer Sara." / "¿Y si las toma Pablo?" at "¿Puedes tomar notas?" */
function notesOther(c: Ctx, who: "paul" | "sara") {
  if (c.s.notesDone) { ack(c); return; }
  c.s.notesDone = who;
  if (who === "sara") { S(c, "sara_notes"); K(c, "thanks_sara"); return; }
  K(c, "notes_paul_ok"); P(c, "paul_sure");
}

// ---------------------------------------------------------------------------
// The learner's update

type Upd = "done" | "working" | "behind" | "ok" | "busy" | "problem" | "nothing";
const LIGHT = new Set(["ok", "busy", "problem"]);

function react(c: Ctx, kind: Upd, task?: string, when?: unknown, askedBack = false) {
  if (c.s.update && !LIGHT.has(c.s.update)) { ack(c); return; } // already told
  // "Bien, gracias. ¿Y tú?": Sofía answers the question first
  if (askedBack && once(c, "askedBack")) K(c, "k_good_thanks");
  if (task) c.s.task = task;
  c.s.update = kind;
  c.s.updOpen = false;
  if (LIGHT.has(kind) && !c.s.task) {
    K(c, c.s.okSaid || askedBack ? "what_task_reask" : kind === "busy" ? "upd_busy_resp" : kind === "problem" ? "upd_problem_resp" : "upd_ok_resp");
    c.s.okSaid = true;
    c.s.updOpen = true;
    c.expect({
      id: "what_task", expects: ["task_ctx", "upd_working", "upd_done", "upd_behind", "upd_nothing", "upd_nothing_ctx"], hints: ["task"],
      suggest: [{ lt: "Say what you're working on", hint: "task", options: "task" }],
      on: {
        // "Estoy atrasado." → "¿En qué estás trabajando?" → "Con el reporte.": behind with the report
        task_ctx: (cc, sl) => react(cc, cc.s.saidBehind ? "behind" : "working", sl.task),
        upd_working: (cc, sl) => react(cc, "working", sl.task, sl.whenr),
        upd_done: (cc, sl) => react(cc, "done", sl.task),
        upd_behind: (cc, sl) => react(cc, "behind", sl.task, sl.whenr),
        // "Nada, la verdad." answers "¿En qué estás trabajando?" too
        upd_nothing: (cc) => react(cc, "nothing"),
        upd_nothing_ctx: (cc) => react(cc, "nothing"),
      },
      ask: (cc) => K(cc, "what_task_reask"),
    });
    return;
  }
  // "Nada nuevo." / "Pues nada, la verdad.": a light update, "Muy bien, gracias."
  if (kind === "nothing") { K(c, "k_ok_agree"); return; }
  if (LIGHT.has(kind)) { K(c, "upd_nothing_resp"); return; }
  const X = taskVar(c.s.task);
  if (kind === "done") {
    K(c, "upd_done_resp", { X });
    c.s.updOpen = true;
    expectSend(c);
    return;
  }
  // "Estoy con el reporte. Va a estar listo el viernes.": the date is already there
  if (when) { K(c, kind === "behind" ? "upd_behind_ok" : "when_ok"); afterWhen(c); return; }
  K(c, kind === "behind" ? "upd_behind_resp" : "upd_work_resp", { X });
  c.s.updOpen = true;
  c.expect({
    id: "when_q", expects: ["when_ans", "when_ctx", "when_not_ctx", "unsure", "done_ctx", "almost_ctx"], hints: ["when"],
    suggest: [{ lt: "Say when it will be ready", hint: "when" }],
    on: {
      when_ans: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      when_ctx: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      // "Ya casi.": soon
      almost_ctx: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      // "No va a estar listo el viernes": no date yet
      when_not_ctx: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      unsure: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      g_dontknow: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      // "Ya está listo." / "Ya terminé el reporte.": it's done after all
      done_ctx: (cc) => nowDone(cc),
      upd_done: (cc, sl) => nowDone(cc, sl.task),
      // the whole sentence answers too: "El reporte va a estar listo el viernes." / "Ya casi termino el reporte."
      // (without a date it isn't an answer: the question again)
      upd_working: (cc, sl) => {
        if (!sl.whenr && !/\b(casi|mero)\b/.test(fold(cc.heard || ""))) return false;
        cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc);
      },
      // "Voy atrasado, va a estar listo el lunes."
      upd_behind: (cc, sl) => {
        if (!sl.whenr) return false;
        cc.s.update = "behind"; cc.s.updOpen = false; K(cc, "upd_behind_ok"); afterWhen(cc);
      },
    },
    ask: (cc) => K(cc, "when_reask", { X: taskVar(cc.s.task) }),
  });
}

/** "¿Para cuándo…?" → "Ya está listo.": the update becomes "done" (and Sofía asks to send it). */
function nowDone(c: Ctx, task?: string) {
  if (!once(c, "nowDone")) return;
  if (task) c.s.task = task;
  c.s.update = "done";
  K(c, "upd_done_resp", { X: taskVar(c.s.task) });
  c.s.updOpen = true;
  expectSend(c);
}

/** "¿Le puedes mandar el reporte a todo el equipo después de la reunión?" is open. "¿Me lo puedes explicar?" gets
 *  Sofía's short explanation (clarifyLast), then the question is open again. */
function expectSend(c: Ctx) {
  c.s.lastTerm = "send";
  const yes = one("send", (cc) => { cc.s.updOpen = false; K(cc, "send_yes"); });
  const no = one("send", (cc) => { cc.s.updOpen = false; K(cc, "send_no"); });
  c.expect({
    id: "send_q", optional: true, expects: ["will_send", "cant_send", "can_do", "cant_do", "when_ctx", "send_how_ctx"], hints: ["send"],
    suggest: [{ lt: "Agree to send it", hint: "send" }],
    yes, no,
    on: {
      will_send: yes, can_do: yes, cant_send: no, cant_do: no, when_ctx: yes, when_ans: yes,
      // a bare "Va." is heard as the answer to "¿Cómo vas?" (upd_ok_ctx): here it agrees
      upd_ok_ctx: (cc) => (bareAck(cc) ? yes(cc) : false),
      // "¿Por correo?" / "¿A todos?": Sofía says how (the question is open again); "Por correo." agrees
      send_how_ctx: (cc) => (asked(cc) ? clarifyLast(cc) : yes(cc)),
    },
  });
}

/** The learner's turn is a question (typed with "?"); speech has no question mark, so a spoken "Por correo." agrees. */
const asked = (c: Ctx) => /\?\s*$/.test(c.heard || "");

/** Pablo sometimes offers to help when the learner is behind. */
function afterWhen(c: Ctx) {
  if (c.s.update !== "behind" || !c.s.paulHelps || c.s.helpOffered) return;
  c.s.helpOffered = true;
  P(c, "paul_help");
  const accept = one("help", (cc) => { cc.s.helpAccepted = true; P(cc, "paul_talk_later"); });
  const decline = one("help", (cc) => { cc.s.helpAccepted = false; P(cc, "paul_ok_short"); });
  c.expect({
    id: "help_offer", optional: true, expects: ["accept_help", "decline_help_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Accept Pablo's help, or thank him", hint: "g_yesno" }],
    yes: accept, no: decline,
    on: {
      accept_help: accept, decline_help_ctx: decline,
      // "Gracias." takes the offer; "No, gracias." / "Gracias, estoy bien." turn it down
      g_thanks: (cc) => (/\bno\b|estoy bien|no hace falta|no es necesario/.test(fold(cc.heard || "")) ? decline(cc) : accept(cc)),
    },
  });
}

// ---------------------------------------------------------------------------
// Clarifying

function clarifyPending(c: Ctx): Pending {
  const hint = `clarify_${c.s.jargon}`;
  return {
    id: "clarify", expects: CLARIFY_EXPECTS, hints: [hint],
    suggest: [{ lt: "Ask Pablo to explain", hint }],
    yes: (cc) => { if (bareAck(cc)) { noQuestions(cc); return; } K(cc, "go_ahead"); cc.expect(clarifyPending(cc)); },
    no: (cc) => noQuestions(cc),
    on: {
      g_thanks: (cc) => noQuestions(cc),
      g_ok: (cc) => noQuestions(cc),
      clarify: (cc) => explainJargon(cc),
      g_dont_understand: (cc) => explainJargon(cc),
      g_meaning: (cc, sl) => { const tm = termOf(sl?.w); if (tm) wordQ(cc, tm); else explainJargon(cc); },
      word_q: (cc, sl) => wordQ(cc, sl.term),
      term_echo_ctx: (cc, sl) => wordQ(cc, sl.term),
      nothing_more: (cc) => noQuestions(cc),
      add_req: (cc) => { K(cc, "go_ahead"); cc.expect(clarifyPending(cc)); },
    },
    ask: (cc) => K(cc, "any_q_reask"),
  };
}

/** Pablo says his jargon again in plain Spanish (and checks that it's clear now). */
function explainJargon(c: Ctx) {
  if (c.s.plainSaid) { P(c, `simple_${c.s.jargon}`); c.s.clarified = true; return; }
  c.s.clarified = true; c.s.plainSaid = true;
  P(c, `plain_${c.s.jargon}`);
  P(c, "makes_sense");
  const simpler = one("sense", (cc) => P(cc, `simple_${cc.s.jargon}`));
  const fine = one("sense", (cc) => P(cc, "sense_ok"));
  c.expect({
    id: "makes_sense", optional: true, expects: ["nothing_more", "agree", "clarify", "sense_no_ctx"], hints: ["sense"],
    suggest: [{ lt: "Say whether it's clear now", hint: "sense" }],
    yes: fine, no: simpler,
    on: { nothing_more: fine, agree: fine, g_thanks: fine, g_ok: fine, clarify: simpler, g_dont_understand: simpler, sense_no_ctx: simpler, g_howareyou_bad: simpler },
  });
}

/** "¿Qué significa…?": Pablo explains the launch words, Sofía the meeting words. */
function wordQ(c: Ctx, term?: string) {
  const e = term ? TERMS[term] : undefined;
  if (!e) { if (!clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, {}); return; }
  (e[0] === "paul" ? P : K)(c, e[1]);
  if (LAUNCH_TERMS.has(term!) && c.s.jargonSaid) c.s.clarified = true;
}

/** "¿Me lo puedes explicar?" anywhere: explain the last thing that could be unclear. */
function clarifyLast(c: Ctx): boolean {
  switch (c.s.lastTerm) {
    case "jargon": explainJargon(c); return true;
    case "proposal": K(c, `clarify_${c.s.proposal}`); return true;
    case "offline": K(c, "term_offline"); return true;
    case "deadline_fight": K(c, "clarify_deadline"); return true;
    case "who": K(c, "clarify_who", { X: c.s.deliv }); return true;
    case "aob": K(c, "term_aob"); return true;
    case "send": // "¿Le puedes mandar el reporte a todo el equipo después de la reunión?"
      c.s.sendClarified = true;
      K(c, "clarify_send", { X: taskVar(c.s.task) });
      if (c.s.updOpen) expectSend(c); // not answered yet: the question is open again
      return true;
  }
  return false;
}

/** "No tengo preguntas": Sara asks for the plain version herself. */
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

/** "Ok, gracias." to "¿Algo que agregar?": a thanks for Pablo or Sara, then nothing to add. */
function nothingToAdd(c: Ctx) {
  if (c.s.addDone) return;
  thanksReply(c, true);
  c.s.addDone = true;
  K(c, "no_add_ok");
}

function expectAddWhat(c: Ctx) {
  c.expect({
    id: "add_what", optional: true, expects: [...ADD_POINTS, "add_other_ctx", "nothing_more"], hints: ["add_what"],
    suggest: [{ lt: "Say what you'd like to add", hint: "add_what" }],
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

/** Sara isn't sure she agrees with Pablo, so Sofía takes the discussion offline. */
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

/** No reason (or "No sé"): Pablo accepts it and Sofía takes it offline (without "Buenos puntos."). */
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
    id: "talk_after", optional: true, expects: ["talk_later", "can_do", "agree", "talk_when_ctx"], hints: ["talk_after"],
    suggest: [{ lt: "Agree to talk with Pablo later", hint: "talk_after" }],
    yes: fine, no: one("talk", (cc) => K(cc, "by_email")),
    on: { talk_later: fine, can_do: fine, agree: fine, talk_when_ctx: fine, cant_do: one("talk", (cc) => K(cc, "by_email")) },
  });
}

// ---------------------------------------------------------------------------
// The deadline (twist: Pablo and Sara disagree)

function dlFrom(c: Ctx, kind: "agree" | "disagree", tags: string[]) {
  if (tags.includes("w_none")) { dlSide(c, "unsure"); return; }
  // the comma is lost ("Con Sara no, con Pablo" / "Con Sara, no con Pablo"): Sofía asks once more
  if (tags.includes("amb")) { dlAgain(c); return; }
  const p = tags.includes("w_paul") || tags.includes("w_him");
  const s = tags.includes("w_sara") || tags.includes("w_her");
  if (tags.includes("w_both")) { dlSide(c, "both"); return; }
  if (p === s) { dlSide(c, "ask"); return; } // "Estoy de acuerdo contigo" / "Estoy de acuerdo": ¿con quién?
  const withPaul = kind === "agree" ? p : s;
  dlSide(c, withPaul ? "paul" : "sara");
}

function dlAgain(c: Ctx) {
  if (c.s.dlDone) { ack(c); return; }
  if (c.s.dlAmb) { dlSide(c, "unsure"); return; }
  c.s.dlAmb = true; c.s.dlAsked = false;
  dlSide(c, "ask", "dl_which_again");
}

function dlView(c: Ctx, tags: string[]) {
  if (tags.includes("amb")) dlAgain(c);
  else if (tags.includes("compromise")) dlSide(c, "short");
  else if (tags.includes("ask_client")) dlSide(c, "client");
  else if (tags.includes("side_paul")) dlSide(c, "paul");
  else if (tags.includes("side_sara")) dlSide(c, "sara");
  else dlSide(c, "ask");
}

const DL_LINE: Record<string, string> = {
  paul: "dl_paul_side", sara: "dl_sara_side", both: "dl_both", short: "dl_idea", client: "dl_client", unsure: "k_thats_ok",
};

function dlSide(c: Ctx, side: string, askLine = "dl_which") {
  if (c.s.dlDone) { ack(c); return; }
  if (side === "ask") {
    if (c.s.dlAsked) { dlSide(c, "unsure"); return; } // asked once already: Sofía moves on
    c.s.dlAsked = true;
    K(c, askLine);
    c.expect({
      id: "dl_who", expects: ["who_ctx", "agree", "disagree", "dl_view"], hints: ["dl_who"],
      suggest: [{ lt: "Say who you agree with", hint: "dl_who" }],
      on: {
        who_ctx: (cc, _s, sg) => dlFrom(cc, "agree", sg.tags),
        agree: (cc, _s, sg) => dlFrom(cc, "agree", sg.tags),
        disagree: (cc, _s, sg) => dlFrom(cc, "disagree", sg.tags),
        dl_view: (cc, _s, sg) => dlView(cc, sg.tags),
        unsure: (cc) => dlSide(cc, "unsure"),
        g_dontknow: (cc) => dlSide(cc, "unsure"),
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
// ¿Quién se encarga?

function takeTask(c: Ctx) {
  if (c.s.ownerDone) { ack(c); return; }
  c.s.ownerDone = "you";
  // "Puedo hacerlo el lunes": it is needed by Friday
  if (/\b(lunes|martes|miercoles|jueves|sabado|domingo|proxima semana)\b/.test(fold(c.heard || ""))) { K(c, "take_need_friday"); return; }
  // after "more time" won the deadline fight, "Para el viernes, entonces" would contradict it
  K(c, c.s.dlSide && c.s.dlSide !== "sara" && c.s.dlSide !== "short" ? "take_ok_plain" : "take_ok");
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
// ¿Algún otro asunto?

/** "¿Puedo salir temprano el viernes?", "¿Quién va a la comida?": a question gets "Buena pregunta…", a point
 *  ("Deberíamos…", "¿Y si…?", "Hay que…") gets "Buen punto…". */
function isQuestion(c: Ctx): boolean {
  if (/^[\s"“]*¡/.test(c.heard || "")) return false;
  const h = fold(c.heard || "").replace(/^[\s"“¿]+/, "");
  if (/^(que tal si|y si)\b/.test(h)) return false;
  return /\?\s*$/.test(c.heard || "") || /^(que|como|cuando|donde|quien|quienes|cual|cuanto|cuanta|cuantos|cuantas|puedo|podria)\b/.test(h);
}

function aobTopic(c: Ctx, line: string, who: "kate" | "paul" = "kate") {
  if (!live(c)) return;
  (who === "paul" ? P : K)(c, line);
  if (c.s.closingSaid || c.step !== "aob" || c.s.aobDone) return;
  c.s.aobTopics = (c.s.aobTopics || 0) + 1;
  if (c.s.aobTopics >= 2) { c.s.aobDone = true; return; }
  K(c, "aob_more");
  c.expect({
    id: "aob_more", optional: true, expects: AOB_EXPECTS, hints: ["aob_more", "aob"],
    suggest: [{ lt: "Say that's all", hint: "aob_more" }, { lt: "Bring up something else", hint: "aob" }],
    yes: (cc) => { if (bareAck(cc)) { cc.s.aobDone = true; return; } K(cc, "go_ahead"); expectAobWhat(cc); },
    no: (cc) => { cc.s.aobDone = true; },
    on: { nothing_more: (cc) => { cc.s.aobDone = true; }, g_thanks: (cc) => { cc.s.aobDone = true; }, g_ok: (cc) => { cc.s.aobDone = true; } },
  });
}

function expectAobWhat(c: Ctx) {
  c.expect({
    id: "aob_what", optional: true, expects: [...AOB_TOPICS, ...ADD_POINTS, "nothing_more"], hints: ["aob"],
    suggest: [{ lt: "Bring up your point", hint: "aob" }],
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
  // "Gracias." / "Adiós." answer nothing: Sofía asks once more, then sends it herself
  const again = (cc: Ctx) => {
    if (cc.s.summaryAgain) { summaryNo(cc); return; }
    cc.s.summaryAgain = true; K(cc, "summary_reask"); cc.expect(summaryPending());
  };
  return {
    id: "summary", expects: ["can_do", "cant_do", "will_send", "cant_send", "when_ctx", "send_how_ctx"], hints: ["summary"],
    suggest: [{ lt: "Agree to send the summary, or say you can't", hint: "summary" }],
    yes: (cc) => summaryYes(cc), no: (cc) => summaryNo(cc),
    on: {
      g_thanks: again, g_bye: again, bye_all: again,
      // "¿Por correo?" / "¿A todos?": yes, by email to the team; "Por correo." agrees
      send_how_ctx: (cc) => { if (!asked(cc)) { summaryYes(cc); return; } K(cc, "summary_how"); cc.expect(summaryPending()); },
      clarify: (cc) => { K(cc, "clarify_summary"); cc.expect(summaryPending()); }, can_do: (cc) => summaryYes(cc), will_send: (cc) => summaryYes(cc), when_ctx: (cc) => summaryYes(cc), when_ans: (cc) => summaryYes(cc), cant_do: (cc) => summaryNo(cc), cant_send: (cc) => summaryNo(cc) },
    ask: (cc) => K(cc, "summary_reask"),
  };
}

function closingPending(): Pending {
  return {
    id: "closing", expects: ["bye_all"], hints: ["bye"],
    suggest: [{ lt: "Thank everyone and say goodbye", hint: "bye" }],
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
  notes: "Claro, sin problema.",
  help_offer: "¡Sería genial, gracias!",
  send_q: "¡Claro!",
  makes_sense: "Sí, gracias.",
  talk_after: "Claro, lo hablamos después.",
  dl_view: "Estoy de acuerdo con Sara.",
  dl_who: "Con Sara.",
  aob_more: "No, es todo.",
  summary: "Claro, hoy lo mando.",
  closing: "¡Gracias a todos!",
};

// ---------------------------------------------------------------------------

export const meeting: SituationDef = {
  id: "s34-meeting",
  song: 34,
  songTitle: "Any Other Business?",
  title: { en: "¿Algún otro asunto?", lt: "Any other business?" },
  topic: { en: "Una reunión de equipo", lt: "A team meeting" },
  chapter: 4,
  order: 5,
  location: "office",
  npc: "kate",
  npcs: ["paul", "sara"],
  goal: "Take part in a team meeting: give your update, ask for an explanation, say what you think and help wrap it up.",
  intro: "Monday morning at Línea Clara, in the meeting room. Sofía runs the team meeting, Pablo sits across the table, and Sara joins from home on the screen. Give your update, ask when something isn't clear, and say what you think. Colleagues here say tú to each other.",
  entities: { task: TASKS, deliv: DELIVS },

  grammar: {
    macros: {
      sara: "[sara | oye sara | ay sara | sara sara | hey sara]",
      team: "(todos | a todos | equipo | chicos | chicas | muchachos | gente | todo el mundo | compañeros)",
      tdet: "[el | la | las | los | mi | mis | nuestro | nuestra | este | esta | ese | esa | un | una | lo de] [nuevo | nueva]",
      ddet: "[el | la | este | esta | ese | esa | nuestro | nuestra]",
      // "ahorita estoy con…", "esta semana terminé…"
      upd_pre: "(ahorita | ahora | en este momento | esta semana | hoy | la semana pasada | ayer | pues | bueno | este | mira)",
      done_v: "(terminé | acabé | mandé | envié | entregué | hice | escribí | subí | arreglé | preparé | revisé | actualicé | cerré | publiqué | completé | firmé | lancé)",
      snd: "(sonido | audio | voz | micro | microfono | conexion | internet | video)",
      listo: "(listo | lista | listos | listas | terminado | terminada | terminados | terminadas)",
      // "…, y va a estar listo el viernes" in the same breath as the update
      when_tail: "[y] [creo que] (va a estar | van a estar | estara | debe estar | deberia estar | queda | va a quedar | lo tengo | la tengo | los tengo | las tengo | lo voy a tener | la voy a tener | los voy a tener | las voy a tener | lo termino | la termino | lo entrego | la entrego) [@listo] {whenr}",
      // "Quiero agregar algo: …" before the point itself
      add_pre: "(quiero agregar (algo | una cosa | un punto) | quisiera agregar (algo | una cosa) | me gustaria agregar (algo | una cosa) | (puedo | podria) agregar (algo | una cosa) | quiero anadir algo | (una | otra) cosa | un punto rapido | tambien | y tambien | ah y | yo agregaria | (tengo | traigo) algo que agregar)",
      // "Entiendo tu punto, pero…": a polite start before disagreeing
      but_pre: "(entiendo tu punto | entiendo lo que dices | te entiendo | entiendo | ya se | es buena idea | es una buena idea | buena idea | suena bien | suena interesante | es interesante | interesante | tienes razon | puede ser | es cierto | si | estoy de acuerdo | estoy de acuerdo en parte | en parte) pero [@opn]",
      who: "(pablo #w_paul | el #w_him | sara #w_sara #h:d_sara | ella #w_her | contigo #w_you | ti #w_you | sofia #w_kate | los dos #w_both | ambos #w_both | eso | esto | la idea | esa idea | tu idea | el plan | la idea de pablo | la propuesta)",
      reason_join: "[porque | pues | es que | pero | y | ya que]",
      // "Gracias, Pablo." inside a longer answer (a name may only lead or end a whole sentence)
      thx: "(gracias | muchas gracias | mil gracias) [pablo | sofia | sara]",
      // "…, ¿y tú?" (asked back)
      askback: "(y tu | y tu como estas | y tu que tal | tu como estas | y a ti | y a ti como te va | y tu como vas) [sofia] #askback",
      opn: "[creo que | pienso que | yo creo que | yo pienso que | me parece que | para mi | se me hace que]",
      dis_pre: "[con todo respeto | la verdad | sinceramente | honestamente | mmm | pues | perdon pero | yo | porque | es que]",
      reason: [
        "[porque | pues | es que] (es | seria | sale | me parece | se me hace) [un poco | muy | demasiado | bastante | algo] (caro | cara) #why #h:w_expensive",
        "[porque | pues | es que] (es | seria | suena | me parece | se me hace) [un poco | muy | demasiado | bastante | algo] (arriesgado | riesgoso | arriesgada | riesgosa) #why #h:w_risky",
        "[porque | pues | es que] (es | son) (mucho | demasiado) dinero [para una sola cosa | para una cosa | para (anuncios | una fiesta | una noche)] #why",
        "[porque | pues | es que] (es | seria) demasiado #why",
        "[porque | pues | es que] (los anuncios | los anuncios en redes | las redes sociales | la publicidad en redes) (son | salen | es) [muy | demasiado] (caros | caras | cara | arriesgados | arriesgada | riesgosos) #why",
        "[porque | pues | es que] (una fiesta | la fiesta) (es | seria | sale) [muy | demasiado] (cara | arriesgada | riesgosa) #why",
        "[porque | pues | es que] (una fiesta | la fiesta) (es | dura) (solo | nada mas) una noche #why",
        "[porque | pues | es que] (deberiamos | tenemos que | hay que | podriamos | conviene) (guardar | dejar | ahorrar | apartar) (algo | un poco | una parte | la mitad) [de dinero | del dinero | del presupuesto] [para (despues | luego | las pruebas | el lanzamiento | otras cosas | emergencias | el proximo mes | cualquier cosa)] #why #h:w_keep",
        "[porque | pues | es que] (podemos | podriamos | vamos a) necesitar (dinero | algo de dinero | parte del dinero | ese dinero) [despues | luego | mas adelante | para (las pruebas | otras cosas | el lanzamiento)] #why",
        "[porque | pues | es que] necesitamos dinero para (las pruebas | otras cosas | despues | el lanzamiento) #why",
        "[tal vez | quizas | a lo mejor] (podriamos | podemos | deberiamos) (dividirlo | dividir el dinero | dividir el presupuesto | repartirlo | repartir el dinero | partirlo) [a la mitad | en dos | mitad y mitad] #why #split #h:o_split",
        "(y si | que tal si) (lo dividimos | dividimos el dinero | lo repartimos | repartimos el dinero | lo partimos) [a la mitad | en dos | mitad y mitad] #why #split",
        "[y si] (mitad y mitad | cincuenta y cincuenta | a la mitad) #why #split",
        "mejor (la mitad | solo la mitad | una parte) [del dinero | del presupuesto] [para (anuncios | la fiesta | redes | redes sociales | la publicidad)] #why #split",
        "[tal vez | quizas | a lo mejor] (solo | nada mas) (la mitad | una parte) [del dinero | del presupuesto] #why #split",
        "[tal vez | quizas | a lo mejor] (podriamos | podemos | deberiamos) (gastar | poner | meter | usar | invertir) (la mitad | una parte) [del dinero | del presupuesto] #why #split",
        "[porque | pues | es que] (nuestros clientes | los clientes | nuestros usuarios | los usuarios) no usan (mucho)? (las redes sociales | redes sociales | redes | facebook | instagram) [mucho] #why",
        "[porque | pues | es que] (nuestros clientes | los clientes | los usuarios | nuestros usuarios) son (mayores | grandes | gente mayor | personas mayores) #why",
        "[porque | pues | es que] es (arriesgado | riesgoso | un riesgo | peligroso) (gastar | poner | meter | invertir) todo en una (sola)? cosa #why",
        "[porque | pues | es que] no (debemos | deberiamos | hay que | conviene) (gastar | poner | meter | invertir) todo [el dinero | el presupuesto] en una (sola)? cosa #why",
        "no hay que poner todos los huevos en la misma canasta #why",
        "(todos)? los huevos en la misma canasta #why",
        "[porque | pues | es que] no sabemos si (funciona | va a funcionar) #why",
        "(necesitamos | hay que tener) un plan b #why",
      ],
    },
    slots: {
      whenr: { pattern: [
        "[para | antes de | antes del | a mas tardar | el | hasta] {day} [(en | por) la manana | (en | por) la tarde | temprano | a mas tardar]",
        "[para | antes de] (el fin de | finales de) (la semana | esta semana | mes | este mes)",
        "(en | dentro de) (unos dias | un par de dias | {number} dias | una semana | dos semanas)",
        "(hoy mismo | hoy (en | por) la tarde | pronto | muy pronto | al rato | mas tarde | en un rato)",
        "[para] (el proximo mes | el otro mes | fin de mes)",
        // Mexico: "la semana que entra" / "la otra semana" = next week
        "[para] (la semana que entra | la semana que viene | la otra semana)",
      ] },
      // launch and meeting jargon the learner may ask about ("¿Qué es QA?", "¿Qué significa recorrer?")
      jterm: { lexicon: [
        { id: "beta", forms: TERM_FORMS.beta },
        { id: "golive", forms: TERM_FORMS.golive },
        { id: "slip", forms: TERM_FORMS.slip },
        { id: "soft", forms: TERM_FORMS.soft },
        { id: "scale", forms: TERM_FORMS.scale },
        { id: "feature", forms: TERM_FORMS.feature },
        { id: "qa", forms: TERM_FORMS.qa },
        { id: "blockers", forms: TERM_FORMS.blockers },
        { id: "up", forms: TERM_FORMS.up },
        { id: "offline", forms: TERM_FORMS.offline },
        { id: "wrap", forms: TERM_FORMS.wrap },
        { id: "aob", forms: TERM_FORMS.aob },
        { id: "mute", forms: TERM_FORMS.mute },
        { id: "pending", forms: TERM_FORMS.pending },
      ] },
      // everyday meeting words: only "¿Qué es una fecha límite?", never "¿Cuál es la fecha límite?" (= when)
      bterm: { lexicon: [
        { id: "deadline", forms: ["fecha limite", "deadline", "fecha de entrega"] },
        { id: "agenda", forms: ["agenda", "orden del dia"] },
        { id: "launch", forms: ["lanzamiento"] },
      ] },
    },
  },

  intents: {
    // --- Sara on mute -----------------------------------------------------------------------
    tell_mute: { patterns: [
      "@sara estas (en silencio | en mute | muteada | silenciada | sin audio | sin sonido | muda | sin voz) [sara] #h:m_on_mute",
      "@sara creo que (estas | sigues) [todavia] (en silencio | en mute | muteada | silenciada) [sara] #h:m_think",
      "@sara (sigues | todavia estas | aun estas) (en silencio | en mute | muteada | silenciada) [sara]",
      "@sara (tienes | traes) (el | tu) (microfono | micro | audio) (apagado | en silencio | cerrado | en mute | silenciado) [sara] #h:m_mic",
      "@sara (activa | prende | enciende | abre | desbloquea) (el | tu) (microfono | micro | audio | sonido) [sara] #h:m_click",
      "@sara (dale | dale clic | haz clic | pica | picale | presiona | aprieta | toca) (al | en el | el) (boton | icono) (del | de) (microfono | micro | mute | silencio) [sara]",
      "@sara (dale | picale | presiona) (al | en el) (microfono | micro | mute)",
      "@sara (desactiva | quita | quitale) (el)? (silencio | mute) [sara]",
      "@sara (desmutea | desmuteate | quita el mute | quitate el mute | quitale al mute | quita el silencio | quitale el silencio) [sara] #h:m_unmute",
      "@sara (tienes que | necesitas | debes) (activar | prender | encender | abrir) (el | tu) (microfono | micro | audio)",
      "[creo que] sara (esta | sigue) [todavia] (en silencio | en mute | muteada | silenciada)",
      "@sara (revisa | checa | verifica) (el | tu) (microfono | micro | audio | sonido)",
      "[creo que] (su | el) (microfono | micro) [de sara] (esta | sigue) (apagado | en silencio | en rojo | silenciado)",
      "@sara (tu | el) (microfono | micro) (esta | sigue) (apagado | en silencio | en rojo)",
      "sara (tiene que | necesita | debe) (activar | prender | encender) (el | su) (microfono | micro)",
      "@sara (microfono | micro | el microfono | el micro | mute | el mute)",
    ] },
    // "Sara, no te escuchamos." (only while she is on mute)
    tell_mute_ctx: { patterns: [
      "@sara no te (escuchamos | oimos | escucho | oigo) [nada | sara] #h:m_cant_hear",
      "@sara (nos escuchas | me escuchas | nos oyes | me oyes | estas ahi | nos escuchan)",
      "no (se oye | se escucha | escuchamos | oimos) (nada | a sara) [sara]",
      "no se (te)? (oye | escucha) [nada]", "no hay (sonido | audio)", "sara no tiene (sonido | audio)",
      "no (escuchamos | oimos) a sara", "sara", "sara sara",
    ] },
    not_muted: { patterns: ["@sara no estas (en silencio | en mute | muteada | silenciada)", "sara no esta (en silencio | en mute | muteada | silenciada)"] },
    greet_team: { patterns: [
      "(hola | buenos dias | buen dia | que tal | buenas) (sofia | @team | pablo | sara)",
      "(hola | buenos dias | buen dia | que tal | buenas) (sofia | @team | pablo | sara) [y] (sofia | @team | pablo | sara)",
    ] },
    hear_yes: { patterns: [
      "[si] (ya)? te (escuchamos | oimos | escucho | oigo) [bien | perfecto | muy bien | fuerte y claro | clarito] [sara] #h:h_yes",
      "[si] (fuerte y claro | perfecto | perfectamente | todo bien) #h:h_loud",
      "[si] (ya)? (se oye | se escucha | te oyes | te escuchas) [muy]? (bien | perfecto | clarito | claro)",
      "[si] (ahora | ya) si", "si ya",
      "[si] (mucho | mas | un poco | muchisimo) mejor [ahora]",
      "[si] (ya)? (estas | esta) (bien | perfecto | mejor | mucho mejor)",
      "[si] (ya)? funciona", "[si] ya (volviste | regresaste)", "[si] bienvenida [sara]",
      "[si] te (vemos | veo) y te (escuchamos | oimos | escucho)",
      "[si] (ya)? (el | tu) @snd (esta | se oye | se escucha) (bien | perfecto | mejor)",
    ] },
    hear_no: { patterns: [
      "[no] (todavia | aun | ya)? no te (escuchamos | oimos | escucho | oigo) [bien | nada | sara]",
      "[no] (todavia | aun)? no se (te)? (oye | escucha) [bien | nada | todavia]",
      "[perdon] te (escuchamos | oimos | escucho | oigo) (muy)? (bajito | bajo | poco | mal | cortado | entrecortado)",
      "[no] (todavia | aun) nada #h:h_no",
      "[perdon] (te escuchas | se escucha | te oyes | se oye) [muy | un poco | todavia]? (entrecortado | cortado | mal | bajo | bajito)",
      "[si] te (escuchamos | oimos | escucho | oigo) pero (muy | un poco)? (bajito | bajo | mal | cortado | entrecortado)",
      "[perdon] se te (corta | traba) [mucho | el audio]", "[perdon] se (corta | traba) [mucho]",
      "te (veo | vemos) pero no te (escucho | escuchamos | oigo | oimos)", "[no] (todavia)? no hay (sonido | audio)",
      "[no] no se (oye | escucha) nada", "@could_you hablar mas (fuerte | alto)",
      "[no] sigues (en silencio | muteada | en mute)", "[no] (sigue | esta) igual", "[no] (nada | nada todavia)",
    ] },

    // --- updates ------------------------------------------------------------------------------
    upd_done: { patterns: [
      "[ya] (terminé | acabé | entregué | mandé | envié | completé | he terminado | he acabado | he entregado | he mandado | he enviado) @tdet {task} [ayer | la semana pasada | el viernes | esta manana | hoy | ya] #h:u_finished",
      "@tdet {task} ya (esta | estan | quedó | quedaron) @listo [desde ayer]",
      "[ya] (terminé | acabé) con @tdet {task}",
      "[ya] (le | les)? (mandé | envié) @tdet {task} (al cliente | a todos | a sofia | al equipo) [ayer]",
      "[ya] (le | les) (mandé | envié) (al cliente | a todos | a sofia | al equipo) @tdet {task} [ayer]",
      "(ayer | la semana pasada | esta manana | el viernes) [ya] (le | les)? @done_v @tdet {task} [al cliente | a todos | a sofia | al equipo]",
      "@upd_pre [ya] @done_v @tdet {task} [ayer | ya]",
      "[ya] @done_v @tdet {task}",
      "@tdet {task} ya (esta | estan) (hecho | hecha | hechos | hechas | entregado | entregada | entregadas)",
      "ya (tengo | quedó) @tdet {task}",
      "ya (esta | estan | quedó | quedaron) @listo @tdet {task}",
    ] },
    upd_working: { patterns: [
      "(estoy | sigo | ando) [trabajando] (en | con) @tdet {task} [ahorita | ahora | esta semana | hoy] [@when_tail] #h:u_working",
      "ya (casi | mero) (termino | acabo) [con] @tdet {task} [@when_tail] #h:u_almost",
      "@tdet {task} ya casi (esta | queda | estan) @listo [@when_tail]",
      "(estoy | ando | sigo) (haciendo | preparando | terminando | actualizando | revisando | escribiendo | arreglando | armando | disenando | planeando) @tdet {task} [@when_tail]",
      "(empecé | comencé) [con] @tdet {task} [@when_tail]",
      "@tdet {task} (va a estar | van a estar | estara | queda | va a quedar | debe estar) @listo [{whenr}] #h:u_ready",
      "(voy a terminar | termino | entrego | voy a entregar | te entrego | te mando) @tdet {task} [{whenr}]",
      "@upd_pre (estoy | sigo | ando) [trabajando] (en | con) @tdet {task} [@when_tail]",
      "@upd_pre (estoy | sigo | ando) (haciendo | preparando | terminando | actualizando | revisando | escribiendo | arreglando) @tdet {task} [@when_tail]",
      "(estuve | estaba) trabajando (en | con) @tdet {task}",
      "[bien] (aqui | aca | pues) (trabajando | chambeando) (en | con) @tdet {task} [@when_tail]",
      "voy (a la mitad | bien | avanzando) (de | con) @tdet {task} [@when_tail]",
      "(estoy | sigo | ando) [muy] (ocupado | ocupada) con @tdet {task} [@when_tail]",
    ] },
    upd_behind: { patterns: [
      "(todavia | aun) no (termino | acabo | empiezo | mando | entrego | tengo) @tdet {task} [@when_tail]",
      "no he (terminado | acabado | empezado | mandado | entregado) @tdet {task} [todavia | aun] [@when_tail]",
      "@tdet {task} (todavia | aun)? no (esta | estan | queda) @listo [todavia | aun] [@when_tail]",
      "(voy | estoy | ando) [un poco | algo | bastante | un poquito] (atrasado | atrasada | retrasado | retrasada) con @tdet {task} [@when_tail] #h:u_behind",
      "(necesito | me falta) (mas tiempo | tiempo) (para | con) @tdet {task}",
      "(tengo | estoy teniendo | traigo) (problemas | unos problemas | algunos problemas | broncas) con @tdet {task}",
      "@tdet {task} (va | viene) (atrasado | atrasada | retrasado | retrasada | con retraso)",
      "me (atrasé | retrasé) con @tdet {task}",
      "[todavia | aun] no (terminé | acabé | alcancé a terminar | mandé | envié | entregué) @tdet {task} [@when_tail]",
      "no (esta | estan) @listo @tdet {task} [todavia | aun]",
      "[todavia | aun] (me falta | me faltan) (terminar | acabar | mandar | hacer | revisar)? @tdet {task} [@when_tail]",
    ] },
    upd_ok: { patterns: [
      "todo (va | esta | sigue | va muy) (bien | en orden | segun el plan | a tiempo | conforme al plan) [gracias] [@askback] #h:u_track",
      "(todo en orden | hasta ahorita todo bien | hasta ahora todo bien | vamos bien | voy bien | todo marcha bien) [gracias] [@askback]",
      "(todo | las cosas) (van | va) bien [hasta ahora | hasta ahorita] [gracias] [@askback]",
    ] },
    // "¡Bien, gracias!" / "¡Ocupadísima!" to "¿Cómo vas?"
    upd_ok_ctx: { patterns: [
      "[estoy] [muy | super] (bien | todo bien | no me quejo | ahi vamos | ahi la llevo | bastante bien | excelente) [gracias | muchas gracias] [sofia] [@askback]",
      "[estoy | ando] [muy | super | bastante | bien] (ocupado | ocupada | ocupadisimo | ocupadisima | atareado | atareada | saturado | saturada) [esta semana] [como siempre] [gracias] [@askback] #busy",
      "(con mucho trabajo | mucho trabajo | mucha chamba | con mucha chamba | semana pesada | a full) [como siempre] [gracias] [@askback] #busy",
      "(bien | muy bien) [gracias] [sofia] [@askback]",
      // "No, todo bien." (the comma is lost: the likelier reading is "nah, all good"; "No todo va bien" is upd_problem_ctx)
      "no todo (bien | en orden | tranquilo) [gracias] [@askback]",
    ] },
    upd_nothing: { patterns: ["(nada | no mucho) (nuevo | que reportar | que contar) [esta semana | hoy] [de mi parte]", "(nada nuevo | sin novedades | ninguna novedad) [de mi parte] [esta semana]", "(no tengo | no hay) (novedades | nada nuevo) [esta semana]"] },
    // "Más o menos." / "No todo va bien." to "¿Cómo vas?" (never the "todo bien" of upd_ok)
    upd_problem_ctx: { patterns: [
      "no todo (va | esta | sale) bien", "nada bien [la verdad]", "(todo)? mal [la verdad]",
      "(voy | estoy | ando) [un poco | algo | bastante | un poquito | muy] (atrasado | atrasada | retrasado | retrasada) [la verdad] #behind", "(no muy | no tan | no muy muy) bien [la verdad]", "(mas o menos | regular | asi asi) [la verdad]", "no (va | van | ando | estoy) (muy)? bien [la verdad]",
      "(tengo | tenemos | traigo) (unos | algunos)? (problemas | broncas)", "(semana | una semana) (complicada | dificil)", "(complicado | complicada) [la verdad]",
    ] },
    // a light update, only to Sofía's "¿Cómo vas?" / "¿En qué estás trabajando?" (elsewhere "Nada." = nothing_more)
    upd_nothing_ctx: { patterns: [
      "[pues] (nada | no mucho) [la verdad] [esta semana | hoy | ahorita]",
      "nada (especial | importante | interesante) [la verdad] [esta semana | hoy]", "(no mucho | nada en especial | no gran cosa) [la verdad]",
    ] },
    task_ctx: { patterns: ["[es] @tdet {task}", "[mas que nada] @tdet {task}", "(en | con) @tdet {task}",
      // "Nada, solo el reporte."
      "(nada | no mucho) (solo | nada mas | nomas) [con | en] @tdet {task}"] },
    // "Va a estar listo el viernes": a date with its verb (a bare "El viernes" is when_ctx, only where a date was asked)
    when_ans: { patterns: [
      "[no se] [creo que | espero que | probablemente | tal vez | a lo mejor | yo creo que] (va a estar @listo | van a estar @listo | lo termino | la termino | lo tengo | la tengo | queda | lo entrego | la entrego) {whenr}",
      "(va a estar | esta | estara | queda) @listo {whenr} #h:w_ready",
      // "Lo voy a tener listo el viernes." (Sofía asks "¿Para cuándo crees que vas a tener listo…?")
      "[creo que | probablemente | tal vez | a lo mejor | yo creo que] (lo | la | los | las) (voy a tener | tengo | voy a terminar | voy a entregar) [@listo] {whenr}",
      "[creo que | probablemente | tal vez | a lo mejor | yo creo que] (voy a | espero) (tenerlo | tenerla | tenerlos | tenerlas) [@listo] {whenr}",
    ] },
    // "Ya está listo." / "Ya lo terminé." (to "¿Para cuándo…?": it's done after all)
    done_ctx: { patterns: [
      // always with "ya": a bare "Está listo." would let "No está listo." read as "No." + "Está listo."
      "[de hecho] ya (esta | estan | quedó | quedaron) [@listo] [desde ayer]",
      "[de hecho] ya (lo | la | los | las) (terminé | acabé | entregué | mandé)",
      "[de hecho] ya (lo | la | los | las) tengo [@listo]",
      "[de hecho] ya (terminé | acabé)",
      "(lo | la | los | las) (terminé | acabé) (ayer | esta manana | hoy | el viernes)",
    ] },
    // "Ya casi." / "Ya mero." (to "¿Para cuándo…?": soon)
    almost_ctx: { patterns: [
      "ya (casi | mero) [esta | estan | queda | quedan | lo termino | la termino | termino | acabo | lo acabo | la acabo] [@listo]",
      "casi (listo | lista | listos | listas | terminado | terminada)",
    ] },
    // "Para el viernes." / "Mañana." (to "¿Para cuándo…?"; to "¿Le puedes mandar…?" it is a yes)
    when_ctx: { patterns: [
      "no se (tal vez | quizas | a lo mejor | creo que | probablemente | pero creo que) {whenr}",
      "[creo que | espero que | probablemente | tal vez | a lo mejor | yo creo que | mejor] {whenr} #h:w_when",
      // "Para el lunes, no para el viernes" / "No para el viernes, para el lunes": the date said without "no"
      "{whenr} [y] no (para | antes de | antes del | el)? (el)? (lunes | martes | miercoles | jueves | viernes | sabado | domingo | manana | hoy)",
      "no (para | antes de | antes del | el)? (el)? (lunes | martes | miercoles | jueves | viernes | sabado | domingo | manana | hoy) [sino] [mejor] {whenr}",
    ] },
    // "No va a estar listo el viernes." / "El viernes no." (never the date itself)
    when_not_ctx: { patterns: [
      "no (va a estar | van a estar | creo que este | creo que esten | lo termino | la termino | lo tengo | la tengo | alcanzo | llego) [@listo] [para] {whenr}",
      "no {whenr}", "{whenr} no", "{whenr} (no creo | imposible | no se puede | no da tiempo | esta dificil | lo veo dificil)",
      // "Todavía no está listo." (no date yet); always with todavía / aún: "No, ya está listo." (ya is a filler to the
      // matcher) means it's done
      "(todavia | aun) no (esta | estan) @listo [todavia | aun]", "no (esta | estan) @listo (todavia | aun)",
    ] },
    unsure: { patterns: [
      "no estoy (seguro | segura) [todavia] #h:w_unsure", "(todavia | aun) no (se | estoy seguro | estoy segura)", "no tengo idea [todavia]", "(es | esta) dificil (decir | saberlo | de decir)",
      "te (aviso | digo) [despues | luego | al rato]", "(dejame | deja) (pensarlo | pensar)", "(tengo | necesito) que pensarlo", "no se que (pensar | decir | opinar)",
      "no tengo (opinion | una opinion)", "depende", "buena pregunta", "no me decido", "me da (igual | lo mismo)",
    ] },
    will_send: { patterns: [
      "[claro | si | por supuesto | va | sale | vale] [ahorita | ahora | hoy] (te lo | te la | se lo | se la | se los | se las | les | lo | la | os lo | os los | les lo | les los) (mando | envio | paso | comparto) [por correo] [a todos | al equipo] [despues de la reunion | hoy | al rato | en un rato | saliendo de la reunion | ahorita]",
      "[claro | si | por supuesto] (despues de | saliendo de | al terminar) la (reunion | junta)",
      // "Claro, en cuanto termine la reunión." / "Terminando la junta se lo mando."
      "[claro | si | por supuesto] [se lo mando | se los mando | te lo mando | lo mando] (en cuanto | apenas | cuando) (termine | terminemos | acabe | acabemos) la (reunion | junta) [se lo mando | se los mando | te lo mando | lo mando]",
      "[claro | si] (terminando | acabando) la (reunion | junta) [se lo mando | se los mando | te lo mando | lo mando]",
      "[claro | si] (lo | la | te lo | se lo) (mando | envio) por correo",
      // "Claro, les mando un resumen esta tarde."
      "[claro | si | por supuesto | va | sale] [yo] (les | te | se los | se lo) (mando | envio | paso | comparto | hago) (un | el) resumen [rapido] [por correo] [hoy | esta tarde | (en | por) la tarde | al rato | en un rato | manana | despues de la reunion | saliendo de la reunion]",
      "[claro | si | por supuesto | va | sale] [yo] (lo | la | te lo | se lo | se los | les) (mando | envio) (esta tarde | (en | por) la tarde | manana | manana temprano)",
      "[si] (ya)? (te lo | se lo | se los | les | lo | la) (mandé | envié) [ayer | esta manana]",
    ] },
    cant_send: { patterns: [
      "[perdon] [hoy] no (puedo | lo puedo | la puedo | se lo puedo | te lo puedo) (mandar | enviar) [hoy | ahorita | ahora | despues de la reunion] [perdon | lo siento]",
      "[perdon] no (puedo mandarlo | puedo mandarla | puedo enviarlo | puedo enviarla) [hoy]",
      "[perdon] (todavia | aun)? no (se lo | te lo | lo | la | se la | les) (mandé | envié | he mandado) [todavia | aun]",
      // "No se lo mando" (never "No sé" + "lo mando")
      "[perdon] [hoy] no (se lo | se los | se la | te lo | te la | lo | la | les) (mando | envio | voy a mandar | voy a poder mandar) [hoy | ahorita | ahora | despues de la reunion] [perdon]",
      "[perdon] [hoy] no (puedo | voy a poder) (mandar | enviar | hacer) (el | un) resumen [hoy]",
    ] },
    accept_help: { patterns: [
      "(eso)? (seria | estaria) (genial | perfecto | increible | muy util | buenisimo | padrisimo) [gracias] [pablo]",
      "[si] (me encantaria | te lo agradezco | me ayudaria mucho)", "[si] gracias pablo",
    ] },
    // "Gracias, pero no hace falta." / "Gracias, estoy bien." (to Pablo's "Si quieres, te ayudo con eso.")
    decline_help_ctx: { patterns: [
      "(gracias | muchas gracias | te lo agradezco) pero no [hace falta | es necesario | te preocupes] [pablo]",
      "[no] [gracias] (no hace falta | no es necesario | no te preocupes | estoy bien | asi estoy bien | yo puedo) [gracias] [pablo]",
      "(gracias | muchas gracias) (estoy bien | no hace falta | no es necesario | yo puedo) [pablo]",
    ] },
    // "¿Por correo?" / "¿A todos?" (to "¿Le puedes mandar…?" and to the summary request)
    send_how_ctx: { patterns: [
      "[lo | se lo | se los | te lo] [mando | envio] por (correo | mail | email | whatsapp | el chat)",
      "a (todos | todo el equipo | quien | quienes)",
      "a quien (se lo | se la | lo | la | le | les)? (mando | envio)",
    ] },

    // --- clarifying ---------------------------------------------------------------------------
    clarify: { patterns: [
      "@could_you (aclarar | aclararlo | aclararme | aclarar eso | aclararme eso) [eso | esto | lo que dijiste] [por favor] #h:c_clarify",
      "@could_you (explicar | explicarlo | explicarmelo | explicarnoslo | explicarme | explicarnos) [eso | esto | lo que dijiste] [otra vez | de nuevo] [(con | en) (palabras | otras palabras) (mas)? (sencillas | simples | faciles)?] #h:c_explain",
      "(me | nos) lo (explicas | puedes explicar | podrias explicar | explica | puede explicar) [otra vez | de nuevo]",
      "@could_you (decirlo | decir eso | explicarlo) (mas facil | mas sencillo | mas simple | en palabras (sencillas | simples | mas sencillas) | de otra (forma | manera) | en espanol)",
      "(dilo | explicalo | dimelo) (mas facil | mas sencillo | en espanol | de otra forma)",
      "(me | nos)? lo (puedes | podrias | puede | podria) (decir | explicar) (mas facil | mas sencillo | mas simple | de otra forma | de otra manera | en espanol | con otras palabras | en palabras (sencillas | simples)) #h:c_simple",
      "[perdon] (a que | que) te refieres [exactamente | con eso] #h:c_what_mean",
      "[perdon] que (quieres decir | quisiste decir) [con eso | exactamente]",
      "(sigo | todavia) sin entender", "no te (sigo | entendi bien)", "me perdi",
      // "No, todavía no entiendo" (never "No sé")
      "[no] (todavia | aun) no (entiendo | entendi | lo entiendo | le entiendo | te entiendo) [bien | nada | muy bien]",
      "(un | el) resumen de que", "que (tipo de)? resumen",
      "estoy [un poco] (perdido | perdida | confundido | confundida)",
      "(es | eso es | suena) [un poco | muy | demasiado] (confuso | complicado | tecnico)",
      "en (espanol | cristiano)", "[perdon] que es eso [exactamente]", "como (asi | que)",
      // "No todo quedó claro", "No tiene sentido": still unclear (never the "all clear" of nothing_more)
      "no (todo | nada) (quedó | esta | es | me quedó) (claro | muy claro)", "no (esta | quedó | me quedó | queda) [muy | del todo] claro", "no (tiene | le veo) sentido", "no (entiendo | entendi) bien", "no (te | le) entendi bien",
    ] },
    word_q: { patterns: [
      "[perdon] que (significa | quiere decir) [la palabra] ({term:jterm} | {term:bterm}) [exactamente] #h:c_mean_by",
      "[perdon] (a que | que) te refieres con ({term:jterm} | {term:bterm})",
      "[perdon] que (quieres decir | quisiste decir) con ({term:jterm} | {term:bterm})",
      "[perdon] que es (un | una | el | la)? {term:jterm} [exactamente] #h:c_whats",
      "[perdon] que son (los | las)? {term:jterm} [exactamente]",
      "[perdon] que es (un | una) {term:bterm}",
      "@could_you explicar (que es | que significa)? [la palabra] ({term:jterm} | {term:bterm})",
      "[perdon] no (se | entiendo | conozco) (que es | que significa | la palabra)? ({term:jterm} | {term:bterm})",
      "[perdon] {term:jterm} (que es | que significa | que quiere decir)",
      "[perdon] [y] que es eso (de | del | de la | de los) {term:jterm}",
    ] },
    // "Más o menos." / "No del todo." (to "¿Se entiende?")
    sense_no_ctx: { patterns: [
      "(mas o menos | asi asi | no del todo | no mucho | no muy bien | no tanto | un poco | algo | mas bien no | todavia no | aun no | no todavia | creo que no)",
      "[la verdad] (todavia | aun) no (entiendo | lo entiendo | me queda claro)",
    ] },
    // "¿Go-live?" (an echo question right after the jargon)
    term_echo_ctx: { patterns: ["[perdon] {term:jterm}", "{term:jterm} que", "como que {term:jterm}"] },

    // --- adding something ------------------------------------------------------------------------
    add_req: { patterns: [
      "(quiero | quisiera | me gustaria) (agregar | anadir | decir | comentar) (algo | una cosa | un punto | un comentario) #h:a_add",
      "(puedo | podria) (agregar | anadir | decir | comentar) (algo | una cosa | un punto) #h:a_can_add",
      "(tengo | traigo) (algo | una cosa | un punto | un comentario) [que agregar | que decir]",
      "(una | otra) cosa [mas] [rapida]", "un punto rapido", "un comentario [rapido]",
      "(tengo | traigo) una (pregunta | duda) [rapida] [para (pablo | ti | sofia)]",
      "una (pregunta | duda) [rapida] [para (pablo | ti | sofia)]",
      "(puedo | podria) (preguntar | hacer una pregunta) [algo]",
      "(dejame | deja) (agregar | decir) algo",
    ] },
    add_test: { patterns: [
      "[@add_pre] (deberiamos | tenemos que | hay que | podriamos | necesitamos | debemos) (probar | probarla | probarlo) [la app] (en | con) (celulares | telefonos) (viejos | antiguos | mas viejos | mas antiguos) [tambien] #h:a_test",
      "[@add_pre] (deberiamos | tenemos que | hay que | debemos) (probar | probarla | probarlo | revisar | revisarla) [la app] (mas | otra vez | mejor | con mas calma | en mas celulares)",
      "[@add_pre] (faltan | falta | necesitamos | necesita | hacen falta) mas (pruebas | testing)",
      "[@add_pre] [y] (que tal | que pasa con | y) los (celulares | telefonos) (viejos | antiguos)",
      "[@add_pre] (la app)? (tiene que | debe) funcionar en (celulares | telefonos) (viejos | antiguos) [tambien]",
      "[@add_pre] (no olvidemos | no se olviden de | no hay que olvidar) los (celulares | telefonos) (viejos | antiguos)",
      "[@add_pre] (en)? (celulares | telefonos) (viejos | antiguos) [tambien]",
    ] },
    add_help: { patterns: [
      "[@add_pre] (puedo | podria) ayudar (con | en) las pruebas [pablo] #h:a_help",
      "[@add_pre] (te)? (puedo | podria) ayudar [pablo] [con (eso | las pruebas)]",
      "[@add_pre] (puedo | podria) (probarla | probar la app | probarlo | hacer pruebas | hacer las pruebas | hacer testing) [tambien | yo]",
      "[@add_pre] (con gusto | encantado | encantada) (te)? ayudo [con las pruebas | con eso]",
      "[@add_pre] (me gustaria | quiero | quisiera) ayudar [con las pruebas]",
      "[@add_pre] [si quieres] (te)? ayudo [con (las pruebas | eso)] [pablo]",
      "[@add_pre] (puedo | podria) ser tester",
      "si (necesitas | necesitan) ayuda [con (las pruebas | eso)] [pablo] (te ayudo | les ayudo | yo te ayudo | puedo ayudar | te puedo ayudar | yo ayudo)",
    ] },
    add_customers: { patterns: [
      "[@add_pre] (los | nuestros) (clientes | usuarios) (estan preguntando | preguntan | siguen preguntando | ya preguntan | preguntan mucho) (por | sobre) (el lanzamiento | la fecha | la app | la fecha de lanzamiento | la fecha del lanzamiento) #h:a_customers",
      "[@add_pre] (los | nuestros) (clientes | usuarios) (quieren saber | preguntan | estan preguntando) cuando (sale | es el lanzamiento | sale la app | lanzamos)",
      "[@add_pre] (los | nuestros) clientes (estan esperando | estan emocionados con | ya esperan) (la app | el lanzamiento)",
      "[@add_pre] (muchos clientes | mucha gente) (pregunta | esta preguntando | preguntan) (por | sobre) (la app | el lanzamiento)",
    ] },
    add_feedback: { patterns: [
      "[@add_pre] (deberiamos | hay que | tenemos que | podriamos) (pedirles | pedir) (su opinion | opinion | retroalimentacion | comentarios | feedback) a los (usuarios | clientes) #h:a_feedback",
      "[@add_pre] (deberiamos | hay que | tenemos que | podriamos) (preguntarles | preguntar) a los (usuarios | clientes) (que opinan | que piensan | su opinion)",
      "[@add_pre] (necesitamos | hay que juntar | deberiamos juntar | hay que pedir) (mas)? (retroalimentacion | comentarios | feedback | opiniones) [de los (usuarios | clientes)]",
      "[@add_pre] (y si | que tal si) (hacemos | mandamos) una encuesta [a los (usuarios | clientes)]",
      "[@add_pre] (deberiamos | podriamos | hay que) (hacer | mandar) una encuesta [a los (usuarios | clientes)]",
      "[@add_pre] (y si | que tal) un boton de (comentarios | opiniones | feedback)",
    ] },
    // anything else the learner wants to add (only right after "¿Algo que agregar?" / "¡Claro, dime!")
    add_other_ctx: { patterns: [
      "@add_pre {w:any}",
      "[tal vez | quizas] (deberiamos | podriamos | tenemos que | hay que) {w:any}",
      "(el | los | nuestro | nuestros) (cliente | clientes | usuarios | jefe | disenadores | programadores) {w:any}",
    ] },
    nothing_more: { patterns: [
      "[no] (no tengo | ninguna) (pregunta | preguntas | duda | dudas) [de mi parte] [por ahora] #h:c_none", "[no] ninguna",
      "[no] nada (que agregar | que anadir | que decir) [de mi parte]",
      "[no] (nada | yo nada) [mas] de mi parte [por ahora | por hoy] #h:b_none",
      "[no] nada (mas | especial) [de mi parte] [por ahora | por hoy]", "[no] nada [la verdad]",
      "[no] (yo)? no tengo nada [mas] (que agregar | que decir | que anadir)", "[no] (yo)? no tengo nada [mas] [de mi parte]",
      "[no] no (hay | tengo) nada (mas)? (que agregar | que decir)",
      "(todo | ya todo) (claro | bien | quedó claro) [de mi parte] [gracias]",
      "[si] (esta | ya esta | todo esta) [muy] claro [ahora]", "[no] no hay (preguntas | dudas | ninguna pregunta)", "[no] no falta nada", "[no] ninguno",
      "[no] (es | eso es) todo [de mi parte] [por ahora | por hoy] #h:a_none #h:b_all",
      "ya (entendi | entiendo) [todo | bien] [ahora]", "(entendi | entiendo) (todo | bien)",
      "(ya)? (tiene sentido | quedó claro | me quedó claro)",
      "@thx [ya | ahora] (tiene sentido | queda claro | esta claro | entendi | ya entendi | quedó claro | ya quedó claro | ya entiendo | me quedó claro | lo entiendo) #h:s_got",
      "[no] (ningun | ningun otro) asunto", "[no] nada (hoy | esta semana)", "[no] creo que (es todo | ya terminamos | ya vimos todo)",
      "(estoy | yo estoy) bien [asi] [gracias]", "(todo bien | todo claro) [de mi lado]",
    ] },

    // --- the budget: opinions ---------------------------------------------------------------------
    disagree: { patterns: [
      "@dis_pre no (se | estoy (seguro | segura)) si (estoy | este) de acuerdo [con @who] [@reason_join @reason] #h:o_not_sure",
      "@dis_pre no (se | estoy (seguro | segura)) si (sea | es) (buena idea | una buena idea | lo mejor) [@reason_join @reason]",
      "@dis_pre no estoy (seguro | segura) (de | de que) (estar | este) de acuerdo [con @who] [@reason_join @reason]",
      "@dis_pre no estoy (seguro | segura) de que (sea | eso sea) (buena idea | una buena idea | lo mejor) [@reason_join @reason]",
      "@dis_pre no me gusta [mucho | nada] [@reason_join @reason]",
      "@dis_pre no estoy (muy | tan | del todo | totalmente | completamente | cien por ciento) de acuerdo [con @who] [@reason_join @reason]",
      "@dis_pre no estoy de acuerdo [con @who] [@reason_join @reason] #tip:soft_disagree",
      "@but_pre [no estoy (muy)? de acuerdo | no se | no creo | no todo | no todo el dinero | no todo el presupuesto | yo lo veo diferente] [@reason] #h:o_see_point",
      "@dis_pre (estoy en desacuerdo | no comparto (eso | esa idea | tu opinion | la idea)) [con @who] [@reason_join @reason] #tip:soft_disagree",
      "@dis_pre no creo que (sea | eso sea | esa sea | esto sea) (buena idea | una buena idea | lo mejor | una gran idea) [@reason_join @reason]",
      "@dis_pre no creo que (debamos | haya que | sea bueno) (hacer eso | gastarlo todo | gastar todo | meter todo | poner todo | gastar todo el dinero)",
      "@dis_pre (no es | eso no es) (buena idea | una buena idea) [gastar todo | gastarlo todo | gastar todo el dinero | meter todo] [@reason_join @reason] #tip:soft_disagree",
      "@dis_pre (es | eso es) (mala idea | una mala idea) [@reason_join @reason] #tip:soft_disagree",
      "[tal vez] no todo [el dinero | el presupuesto] [@reason_join @reason]",
      "@dis_pre (tengo | yo tengo) (otra idea | una idea diferente | otra opinion | mis dudas | algunas dudas | dudas) [@reason]",
      "@dis_pre no me convence [mucho | del todo] [la idea | esa idea] [@reason_join @reason]",
      "@dis_pre no me (gusta | encanta) [mucho | nada] (esa | la | esta) idea [@reason_join @reason]",
      "@dis_pre (estoy | yo estoy) en contra [de (eso | la idea | la propuesta)] [@reason_join @reason]",
      "@dis_pre me preocupa [un poco] [eso | esa idea] [@reason_join @reason]",
      "@dis_pre no (me parece | se me hace | creo que sea) (buena idea | una buena idea | bien | lo mejor | buen plan) [@reason_join @reason]",
      "@dis_pre (yo)? lo veo (diferente | distinto | de otra manera | de otra forma) [@reason_join @reason]", "@dis_pre (yo)? no lo veo asi [@reason_join @reason]",
      "(pablo | el) no tiene razon #w_paul", "no creo que (pablo | el) tenga razon #w_paul",
      "(sara | ella) no tiene razon #w_sara", "no creo que (sara | ella) tenga razon #w_sara",
      "@dis_pre yo no (lo haria | gastaria todo | haria eso) [@reason_join @reason]",
    ] },
    agree: { patterns: [
      "(estoy | yo estoy) [totalmente | completamente | muy | cien por ciento] de acuerdo [con @who] [totalmente] #h:o_agree",
      "(buena | buenisima | excelente | gran | muy buena) idea [pablo] #h:o_good_idea",
      "(eso | la idea)? (suena | me suena | se oye | me parece | se me hace) (bien | muy bien | genial | buena idea | una buena idea | excelente | perfecto | logico | razonable | padre) [a mi]",
      "[eso]? tiene (sentido | mucho sentido) #h:o_makes_sense", "@thx [eso]? tiene (sentido | mucho sentido)",
      "[si] (hagamoslo | hay que hacerlo | adelante | va | sale | dale)",
      "(creo | pienso) que (es | seria) (buena idea | una buena idea | una gran idea)",
      "(creo | pienso) que (pablo #w_paul | el #w_him) tiene razon #h:d_paul", "(pablo #w_paul | el #w_him) tiene razon #h:d_paul",
      "(creo | pienso) que (sara #w_sara | ella #w_her) tiene razon", "(sara #w_sara | ella #w_her) tiene razon",
      "(los dos | ambos) tienen razon #w_both", "(pablo #w_paul | sara #w_sara) tiene (un buen punto | un punto | razon en algo)",
      "(me gusta | me encanta) (la idea | esa idea | tu idea | el plan | la propuesta)",
      "no es (mala idea | una mala idea)", "nada mal", "(es | seria) [una] buena idea",
      "no (me parece | se me hace | creo que sea) (mala idea | una mala idea)",
      "(estoy | yo estoy) a favor [de (eso | la idea | la propuesta)]",
      "(apoyo | yo apoyo) (la idea | a pablo #w_paul | a sara #w_sara | la propuesta)",
      "estoy con (pablo #w_paul | sara #w_sara | ella #w_her | el #w_him)",
      "(las redes sociales | los anuncios | los anuncios en redes) (son | es) (importantes | importante | el futuro | buena idea)",
      "(una | la) fiesta (es | suena) (divertida | buena idea | padre | genial)",
      "(yo)? (pienso | creo) lo mismo [que (pablo #w_paul | sara #w_sara)]",
    ] },
    // a reason or an alternative: an implicit, polite "no" ("Es muy caro.", "¿Y si lo dividimos?")
    reason: { patterns: ["@reason", "@opn @reason"] },
    // "¿Quién, yo?" (to "¿Quién se encarga?", "¿Tú qué opinas?" …)
    who_me: { patterns: ["quien yo", "(me preguntas | me hablas | me dices | te refieres) a mi", "a mi", "(yo | apoco yo | a poco yo) #who_q"] },
    // "¿Y tú qué opinas, Sofía?" (asked back)
    ask_back: { patterns: ["(y)? tu que (opinas | piensas | dices) [sofia]", "(y)? que (opinas | piensas) tu [sofia]", "cual es tu opinion [sofia]", "y tu sofia", "y a ti que te parece",
      // "¿Qué piensa Sara?": Sofía wants the learner's view first
      "(y)? que (piensa | opina | dice) (sara | pablo)", "(y)? (sara | pablo) que (piensa | opina | dice)", "(y)? que (piensan | opinan) (los demas | ellos | sara y pablo)"] },
    talk_later: { patterns: [
      "[claro | si | va | sale | por supuesto] (lo hablamos | lo platicamos | lo vemos | hablamos | platicamos | lo checamos) (despues | al rato | despues de la reunion | mas tarde | en la comida | con un cafe | aparte) [pablo] #h:t_sure",
      "[claro | si] (vamos por | nos tomamos | tomamos) un cafe [despues | al rato | mas tarde]",
      "[claro | si] estoy (libre | disponible) (despues de la reunion | mas tarde | al rato | (en | por) la tarde)",
      "[claro] despues de la reunion (me parece bien | esta bien | me funciona | me queda bien)",
    ] },
    // "Mejor mañana." / "Sí, en la comida." (to "¿Lo pueden hablar ustedes dos después de la reunión?": yes, at that time)
    talk_when_ctx: { patterns: [
      "[si | claro | va | sale] [mejor] {whenr}",
      "[si | claro | va | sale] [mejor] (en la comida | despues de la comida | a la hora de la comida | con un cafe | tomando un cafe)",
    ] },

    // --- the deadline (twist) ---------------------------------------------------------------------
    dl_view: { patterns: [
      "@opn el viernes (esta bien | me parece bien | es posible | se puede | es importante | funciona | me late) #side_sara",
      "@opn (podemos | podriamos) (terminarlo | tenerlo | entregarlo | hacerlo | terminarla | tenerla | entregarla) (para el | el) viernes #side_sara",
      "@opn (el cliente | lo del cliente) es (mas importante | primero | lo mas importante) #side_sara",
      "@opn (hay que | debemos | tenemos que) (respetar | cumplir | mantener) (la fecha | el plazo | la fecha limite | el viernes) #side_sara",
      "@opn (necesitamos | necesitan | pablo necesita) (mas tiempo | otra semana | una semana mas) #side_paul",
      "@opn (otra semana | una semana mas | la proxima semana) (es | seria | suena | me parece) (mejor | bien) #side_paul",
      "@opn el viernes es (muy pronto | demasiado pronto | imposible | poco tiempo) #side_paul",
      "@opn el viernes no (se puede | es posible | da tiempo | alcanza | llegamos | esta bien | me parece bien | funciona) #side_paul",
      "@opn no (es posible | se puede | da tiempo) [para] el viernes #side_paul",
      "@opn no (necesitamos | necesitan | hace falta) (mas tiempo | otra semana | una semana mas) #side_sara",
      "@opn el viernes no es (muy | tan | demasiado) pronto #side_sara", "no creo que el viernes sea (muy | tan | demasiado) pronto #side_sara",
      // "Mejor la próxima semana." / "No el viernes, la próxima semana." (the second item is the answer)
      "[@opn] [mejor] (la proxima semana | la semana que entra | la semana que viene | otra semana | una semana mas | en una semana | en dos semanas) [es mejor | esta mejor | me parece mejor] #side_paul",
      "[@opn] mejor (el viernes | este viernes | para el viernes) #side_sara", "(creo que | pienso que | yo creo que) (el viernes | para el viernes) #side_sara",
      "no (el viernes | para el viernes) [sino] [mejor] (la proxima semana | otra semana | una semana mas | en una semana) #side_paul",
      "no (la proxima semana | otra semana | una semana mas) [sino] [mejor] (el viernes | para el viernes) #side_sara",
      "mejor (la proxima semana | otra semana | una semana mas) no (el viernes | para el viernes) #side_paul",
      "mejor (el viernes | para el viernes) no (la proxima semana | otra semana | una semana mas) #side_sara",
      // "El viernes, no la próxima semana" and "El viernes no, la próxima semana" are the same words: ask again
      "(el viernes | para el viernes) no (la proxima semana | otra semana | una semana mas) #amb",
      "(la proxima semana | otra semana | una semana mas) no (el viernes | para el viernes) #amb",
      "@opn (la calidad | un buen producto) es mas importante #side_paul",
      "[tal vez | a lo mejor] (podriamos | podemos | deberiamos) (mandar | entregar | dar | hacer) una (version | entrega) (corta | mas corta | parcial | preliminar | rapida) [el viernes | para el viernes] [y (el resto | la completa | la version completa | la final) la proxima semana] #compromise #h:d_short",
      "(y si | que tal si) (mandamos | entregamos | hacemos) una version (corta | mas corta | parcial | preliminar) [el viernes | para el viernes] #compromise",
      "(que tal | y) una version (corta | mas corta | parcial | preliminar) [el viernes | para el viernes] #compromise",
      "[tal vez] (podriamos | podemos | deberiamos) (preguntarle | hablarle | llamarle | escribirle) al cliente [para pedir mas tiempo | primero] #ask_client #h:d_client",
      "(y si | por que no) le (preguntamos | hablamos | llamamos | escribimos) al cliente #ask_client",
      "@opn (hay que | podemos | podriamos) pedirle mas tiempo al cliente #ask_client",
    ] },
    // "Con Sara." (to "¿Con Pablo o con Sara?")
    who_ctx: { patterns: ["[con] (pablo #w_paul | el #w_him) #h:d_with", "[con] (sara #w_sara | ella #w_her) #h:d_with", "con (los dos | ambos) #w_both",
      // "No con Sara, con Pablo" → Pablo; "Con Sara no, con Pablo" / "Con Sara, no con Pablo" lose their comma: ask again
      "no con pablo [sino] con sara #w_sara", "no con sara [sino] con pablo #w_paul", "con sara no con pablo #amb", "con pablo no con sara #amb",
      "(con)? ninguno [de los dos] #w_none", "con nadie #w_none"] },

    // --- ¿Quién se encarga? --------------------------------------------------------------------------
    can_do: { patterns: [
      "[claro | si | por supuesto | va | sale] (yo)? (lo | la) (hago | puedo hacer | hago yo) [yo] #h:o_can",
      "[claro | si | por supuesto] (yo)? (puedo | podria) (hacerlo | hacerla | encargarme)",
      "[claro | si | por supuesto] (yo)? me (encargo | lo llevo | lo quedo) [yo] #h:o_take",
      "(yo)? (me encargo | puedo encargarme | me puedo encargar | me hago cargo) (de eso | de esto | de @ddet {deliv} | del {deliv} | de la {deliv})",
      "(yo)? (puedo | podria | voy a) (hacer | preparar | escribir | grabar) @ddet {deliv}",
      "(yo)? (hago | preparo | escribo | grabo) @ddet {deliv} [yo]",
      "(dejamelo | dejamela) [a mi]", "cuenta(n)? conmigo",
      "[claro | si] (yo)? (puedo | podria) (hacerlo | hacerla | tenerlo | tenerla) (para el | el) (lunes | martes | miercoles | jueves | viernes)",
      "si nadie (mas)? (puede | quiere) [yo] (lo hago | me encargo | lo puedo hacer)", "(y si | que tal si) (lo hago yo | yo lo hago | me encargo yo | yo me encargo)", "(yo)? me apunto", "(con gusto | encantado | encantada) [lo hago | me encargo]",
      "[claro | si] (yo)? (las | la) (tomo | hago) [yo]",
      "[claro] (yo)? (puedo | podria) tomar (las)? notas", "[claro] yo (tomo | hago) (las notas | la minuta | el acta)", "[claro] (yo)? (tomo | hago) (las notas | la minuta | el acta)",
    ] },
    can_do_ctx: { patterns: ["yo mero", "[si] yo puedo", "[si] puedo", "[si] yo", "yo"] },
    cant_do: { patterns: [
      "[perdon] [esta semana | hoy] no (puedo | lo puedo hacer | la puedo hacer | puedo hacerlo | podria | me puedo encargar | puedo encargarme) [yo] [esta semana | hoy | ahorita | ahora] [perdon | lo siento] #h:o_cant",
      "[perdon] [esta semana | hoy] (estoy | ando) [muy | super | bien | bastante] (ocupado | ocupada | ocupadisimo | ocupadisima | saturado | saturada) [esta semana | hoy | ahorita] [perdon | lo siento] #h:o_busy",
      // "Prefiero que lo haga otra persona."
      "(prefiero | preferiria) que (lo haga | la haga | las tome | se encargue) (otra persona | alguien mas | otro | alguien)",
      "[perdon] no (tengo | me da) tiempo [esta semana | hoy | para eso]",
      "[perdon] (tengo | traigo) (mucho trabajo | mucha chamba | muchos pendientes) [esta semana | hoy]",
      "[perdon] (esta vez | esta semana | hoy) no [perdon]",
      "[perdon] [hoy] no traigo (mi laptop | mi computadora | la laptop | la computadora | mi portatil | el portatil) [hoy]",
      "me gustaria pero no puedo [esta semana]",
      "[perdon] [hoy] no puedo tomar (las)? notas [hoy]",
      "[perdon] [hoy] no (traje | tengo | he traido) (mi laptop | mi computadora | la laptop | la computadora | mi compu | mi portatil | el portatil) [hoy]",
      "(prefiero | preferiria) no [gracias]", "[no] yo no [puedo] [perdon]", "(yo)? no me (encargo | puedo encargar) [de eso | de esto]",
      "[perdon] no (puedo | podria) (hacer | preparar | escribir | grabar) @ddet {deliv} [esta semana]",
    ] },
    suggest_other: { patterns: [
      "[tal vez | a lo mejor | quizas] pablo (puede | podria) (hacerlo | encargarse | hacerla) #paul #h:o_paul",
      // "Lo puede hacer Pablo" / "Pablo lo puede hacer" (puede is one slip from puedo: never can_do)
      "[tal vez | a lo mejor | quizas] (lo | la | las) (puede | podria) (hacer | tomar) pablo #paul", "[tal vez | a lo mejor | quizas] pablo (lo | la | las) (puede | podria) (hacer | tomar) #paul",
      "[tal vez | a lo mejor | quizas] (lo | la | las) (puede | podria) (hacer | tomar) sara #sara", "[tal vez | a lo mejor | quizas] sara (lo | la | las) (puede | podria) (hacer | tomar) #sara",
      "(y si | que tal si) (lo hace | las toma | se encarga) pablo #paul", "(y si | que tal si) (lo hace | las toma | se encarga) sara #sara",
      "pablo (puede | si puede) [y] yo no #paul", "sara (puede | si puede) [y] yo no #sara", "yo no (pablo #paul | sara #sara) si",
      "(pablo #paul | sara #sara) (puedes tu | tu puedes | te encargas tu | tu te encargas)",
      "(y si | que tal si | por que no) lo hace pablo #paul", "(que tal | y | mejor) pablo #paul", "[mejor] que (lo haga | la haga | las tome | se encargue) pablo #paul", "pablo (puedes | podrias) (hacerlo | encargarte) #paul", "(puede | podria) hacerlo pablo #paul",
      "[tal vez | a lo mejor | quizas] sara (puede | podria) (hacerlo | encargarse | hacerla) #sara",
      "(y si | que tal si | por que no) lo hace sara #sara", "[yo] no puedo pero (pablo #paul | sara #sara) (si | puede | si puede | podria)", "(que tal | y | mejor) sara #sara", "[mejor] que (lo haga | la haga | las tome | se encargue) sara #sara", "sara (puedes | podrias) (hacerlo | encargarte) #sara", "(puede | podria) hacerlo sara #sara",
    ] },
    with_help: { patterns: [
      "(puedo | podria) hacerlo (con pablo | con ayuda de pablo | si pablo me ayuda | con ayuda)",
      "(puedo | podria) hacerlo pero (necesito | necesitaria | voy a necesitar) [un poco de] ayuda",
      "pablo y yo (podemos | lo podemos) hacer", "pablo y yo podemos hacerlo", "puedo hacer una parte",
    ] },

    // --- ¿Algún otro asunto? ---------------------------------------------------------------------------
    aob_wfh: { patterns: [
      "(puedo | podria) (trabajar desde casa | hacer home office | trabajar en casa) (el viernes | manana | la proxima semana | el lunes | este viernes) #h:b_wfh",
      "(me gustaria | quisiera | quiero | necesito) (trabajar desde casa | hacer home office | trabajar en casa) [el viernes | manana]",
      "(hay problema si | esta bien si | se puede si) (trabajo desde casa | hago home office) [el viernes | manana]",
      "(puedo | podria) (trabajar desde casa | hacer home office | trabajar en casa) [un dia | unos dias | esta semana | la otra semana]",
    ] },
    aob_lunch: { patterns: [
      "cuando es la comida (del equipo | de equipo) #h:b_lunch",
      "(cuando | que dia) es la (comida | almuerzo | cena | fiesta) (del equipo | de equipo | de la oficina)",
      "cuando es el almuerzo [del equipo | de equipo]",
      "(va a haber | hay) (comida | almuerzo | cena | fiesta) (del equipo | de equipo | de la oficina) [este mes | pronto]",
      "(y | que paso con) (la comida | el almuerzo) (del equipo | de equipo)",
      "(a que hora | que dia | cuando) es la comida [del equipo | de equipo]",
      // "¿Dónde es la comida?" gets the where (not the when)
      "donde (es | va a ser | sera) (la comida | el almuerzo | la cena | la fiesta) [del equipo | de equipo | de la oficina] #where",
    ] },
    // a vacation ("¡Disfrútalas!") or just a day away (#away: "Nada más ponlo en el calendario.")
    aob_vacation: { patterns: [
      "(la proxima semana | el lunes | el viernes) (estoy | voy a estar | me voy) de vacaciones #h:b_vacation",
      "(estoy | voy a estar | me voy) de vacaciones (la proxima semana | el lunes | el viernes)",
      "(la proxima semana)? no voy a estar [en la oficina] (la proxima semana)? #away",
      "voy a faltar (la proxima semana | el viernes | el lunes | manana) #away",
      "(la proxima semana | el viernes | el lunes | manana) voy a faltar #away",
      "(me voy | voy a estar | estoy | voy a tomar | me tomo) [unos dias] (de vacaciones | vacaciones)",
      "(manana | el viernes | el lunes | la proxima semana) no (voy a estar | voy a venir | vengo | estoy) [en la oficina] #away",
      "(la proxima semana | el viernes) (tomo | me tomo) vacaciones",
      "(la proxima semana | el viernes | el lunes | manana) (tomo | me tomo | voy a tomar) el dia [libre] #away",
      // "Mañana tengo cita con el doctor."
      "[manana | el viernes | el lunes] (tengo | voy a tener) [una] cita (con el doctor | con la doctora | con el medico | medica | con el dentista) [manana | el viernes | el lunes] #away",
    ] },
    aob_printer: { patterns: [
      "la impresora (no funciona | esta descompuesta | se descompuso | no sirve | se atoró | ya no imprime | esta rota | se rompio) [otra vez] #h:b_printer",
      "otra vez (no funciona | no sirve | se descompuso) la impresora",
      "(alguien puede | pueden | puedes | quien puede) arreglar la impresora",
    ] },
    // another question at "¿Algún otro asunto?" (only then)
    aob_other_ctx: { patterns: ["(que | como | cuando | donde | quien | hay | podemos | puedo | deberiamos | vamos a) {w:any}", "(quiero | quisiera) (hablar | preguntar) (de | sobre) {w:any}"] },

    // --- side questions and goodbyes ------------------------------------------------------------------
    q_agenda: { patterns: ["(que | cuales) (temas | puntos) (hay | tenemos | vamos a ver) [hoy]", "que (vamos a ver | vemos) hoy", "cual es la agenda [de hoy]", "que hay en la agenda [hoy]", "de que vamos a hablar [hoy]"] },
    q_deadline: { patterns: ["(cual | cuando) es la fecha (limite | de entrega) [de @ddet {deliv}]", "para cuando (es | lo necesitas | la necesitas | se necesita | lo necesitan | hay que entregarlo) [@ddet {deliv}]", "cuando (hay que | tenemos que) entregar(lo)? [@ddet {deliv}]", "(cuanto tiempo tengo | hasta cuando tengo | cuanto tiempo tenemos | hasta cuando tenemos)", "cuando es el deadline"] },
    q_budget: { patterns: ["(cuanto | cuanto dinero) (tenemos | queda | nos queda | hay) [para marketing]", "de cuanto es el presupuesto", "cuanto es el presupuesto"] },
    // "¿Cuánto cuesta la fiesta?": Pablo wants to put all of it into his idea
    q_cost: { patterns: [
      "cuanto (cuesta | cuestan | costaria | costarian | sale | salen | saldria) (la fiesta | una fiesta | los anuncios | la publicidad | la campana | eso)",
      "cuanto (dinero)? (quiere | quieres) (gastar | meter | poner) [pablo]",
    ] },
    // "¿Cuándo es el lanzamiento?" / "¿Cuándo sale la app?"
    q_launch: { patterns: [
      "[y] [para] cuando (es | sera | va a ser) el (lanzamiento | go live) [de la app]",
      "[y] cuando (sale | va a salir | se lanza | lanzamos | vamos a lanzar) [la app] [al publico]",
      "cual es la fecha (del | de) lanzamiento",
      "[ya] (hay | tenemos) fecha (del | de | para el) lanzamiento",
    ] },
    q_next: { patterns: ["cuando es la (proxima | siguiente) (reunion | junta)", "cuando nos (vemos | reunimos) otra vez", "cuando (es | sera) la otra (reunion | junta)"] },
    bye_all: { patterns: [
      "(adios | nos vemos | hasta luego | bye | chao | hasta la proxima) (@team | sofia)",
      "que tengan (buen dia | un buen dia | buena semana | una buena semana | buena tarde) [@team]",
      "que (les | te) vaya bien [@team]", "(buena semana | buen dia | buena tarde) [a todos | equipo]",
      "gracias (a todos | equipo | chicos | a todos ustedes) [adios | nos vemos | hasta luego] #h:b_thanks",
      "gracias [sofia] (nos vemos | hasta luego | adios) [@team] #h:b_see",
      "(buena | muy buena | excelente | gran) reunion [@team] [gracias] #h:b_great",
    ] },
  },

  lines: {
    // --- opening, Sara on mute -------------------------------------------------------------------
    open: [
      t("¡Buenos días | a | todos! | Bueno, | empezamos.", "Good morning | to | everyone! | Okay, | we-start.", "Morning, everyone! Okay, let's get started."),
      t("¡Hola | a | todos! | Gracias | por | venir. | Vamos | empezando.", "Hi | to | everyone! | Thanks | for | coming. | We-go | starting.", "Hi, everyone! Thanks for coming. Let's get started.",
        { flags: { 6: "ir + gerund: “vamos empezando” = let's get going." } }),
    ],
    sara_joins: [
      t("Y | hoy | Sara | se conecta | desde | su | casa. | ¡Hola, | Sara!", "And | today | Sara | is joining | from | her | home. | Hi, | Sara!", "And Sara is joining us from home today. Hi, Sara!"),
    ],
    no_sound: [
      t("Mmm, | está | hablando, | pero | no se oye | nada.", "Hmm, | she's | talking, | but | you can't hear | anything.", "Hmm, she's talking, but there's no sound."),
      t("Está | diciendo | algo, | pero | no la escuchamos.", "She's | saying | something, | but | we can't hear her.", "She's saying something, but we can't hear her."),
    ],
    sara_cant_hear: [
      t("¿Sara? | No te escuchamos | nada.", "Sara? | We can't hear you | at all.", "Sara? We can't hear you at all."),
      t("¿Sara? | Sara… | no te oímos.", "Sara? | Sara… | we can't hear you.", "Sara? Sara... we can't hear you."),
    ],
    paul_mute: [
      t("¡Sara, | estás | en | silencio!", "Sara, | you're | on | mute!", "Sara, you're on mute!", { flags: { 3: "en silencio = on mute (Mexicans also say “estás muteada”)." } }),
    ],
    sara_unmuted: [
      t("¡Ay! | ¡Perdón! | ¿Ya | me | escuchan?", "Oops! | Sorry! | Now | me | you-all-hear?", "Oops! Sorry! Can you hear me now?", { flags: { 2: "ya in a question: “now”, “by now”." } }),
      t("¡Uy, | perdón! | ¿Ahora | sí | me | escuchan?", "Oh, | sorry! | Now | yes | me | you-all-hear?", "Oh, sorry! Can you hear me now?", { flags: { 3: "sí stresses the change: now it works." } }),
    ],
    sara_now: [t("¿Y | ahora?", "And | now?", "What about now?")],
    hear_now_kate: [t("¡Ah, | ahora | sí | te | escuchamos!", "Oh, | now | yes | you | we-hear!", "Oh, now we can hear you!")],
    sara_ok: [
      t("¡Qué bueno! | Perdón, | equipo.", "Great! | Sorry, | team.", "Great! Sorry about that, everyone.", { spain: t("¡Qué bien! | Perdón, | equipo.", "Great! | Sorry, | team.", "Great! Sorry about that, everyone.") }),
      t("Perfecto. | ¡Perdón, | chicos!", "Perfect. | Sorry, | guys!", "Perfect. Sorry, guys!"),
    ],
    not_muted_resp: [
      t("Mmm, | yo | creo | que | sí. | Su | micrófono | está | en | rojo.", "Hmm, | I | think | that | yes. | Her | microphone | is | in | red.", "Hmm, I think she is. Her microphone is red."),
    ],
    hi_back: [t("¡Hola!", "Hi!", "Hi!")],
    notes_ask: [
      t("Ah, | ¿y | tú | puedes | tomar | notas | hoy?", "Oh, | and | you | can-you | take | notes | today?", "Oh, and could you take notes today?", { flags: { 2: F_TU } }),
    ],
    notes_thanks: [
      t("¡Gracias!", "Thanks!", "Thanks!"),
      t("¡Qué | bien, | gracias!", "How | great, | thanks!", "Great, thank you!"),
    ],
    notes_paul: [t("No pasa nada. | Pablo, | ¿tú | puedes?", "No worries. | Pablo, | you | can-you?", "No problem. Pablo, can you do it?")],
    notes_paul_ok: [t("Bueno. | Pablo, | ¿tú | puedes?", "Okay. | Pablo, | you | can-you?", "Okay. Pablo, can you do it?")],
    sara_notes: [t("Sí, | claro, | yo | las | tomo.", "Yes, | sure, | I | them | I-take.", "Sure, I'll take them.", { flags: { 3: "las = them (las notas)." } })],
    paul_sure: [
      t("Claro.", "Sure.", "Sure."),
      t("Sí, | claro, | sin problema.", "Yes, | sure, | no problem.", "Sure, no problem."),
    ],

    // --- agenda and updates ------------------------------------------------------------------------
    agenda: [
      t("Bueno, | hoy | tenemos | tres | puntos: | el | lanzamiento | de | la | app, | el | presupuesto | y | la | próxima | entrega.",
        "Okay, | today | we-have | three | points: | the | launch | of | the | app, | the | budget | and | the | next | deadline.",
        "So, we have three things today: the app launch, the budget and the next deadline."),
      t("Muy | bien. | Tres | puntos | en | la | agenda: | el | lanzamiento | de | la | app, | el | presupuesto | y | la | próxima | entrega.",
        "Very | good. | Three | points | on | the | agenda: | the | launch | of | the | app, | the | budget | and | the | next | deadline.",
        "Okay. Three things on the agenda: the app launch, the budget and the next deadline."),
    ],
    updates_first: [
      t("Pero | primero, | rápido: | ¿cómo | van | con | sus | pendientes? | ¿Pablo?", "But | first, | quickly: | how | are-you-all-doing | with | your | to-dos? | Pablo?",
        "But first, quick updates. Pablo?", { flags: { 7: F_PEND }, spain: t("Pero | primero, | rápido: | ¿cómo | vais | con | vuestros | pendientes? | ¿Pablo?", "But | first, | quickly: | how | are-you-all-doing | with | your | to-dos? | Pablo?", "But first, quick updates. Pablo?", { flags: { 7: F_PEND } }) }),
    ],
    paul_update: [
      t("La | app | ya | casi | está. | Nada más | estamos | arreglando | unos | bugs.", "The | app | already | almost | is-there. | Just | we're | fixing | some | bugs.",
        "The app is almost ready. We're just fixing a few bugs.", { flags: { 2: "ya casi = almost (ya: by now)." }, spain: t("La | app | ya | casi | está. | Solo | estamos | arreglando | unos | bugs.", "The | app | already | almost | is-there. | Just | we're | fixing | some | bugs.", "The app is almost ready. We're just fixing a few bugs.", { flags: { 2: "ya casi = almost (ya: by now)." } }) }),
      t("¡Semana | pesada! | Sigo | arreglando | bugs | de | la | app.", "Week | heavy! | I-keep | fixing | bugs | of | the | app.", "Busy week! I'm still fixing bugs in the app.",
        { flags: { 1: "pesada (heavy) = busy, tough.", 2: "seguir + gerund = still doing." } }),
    ],
    upd_you: [
      t("Gracias, | Pablo. | ¿Y | tú? | ¿Cómo | vas?", "Thanks, | Pablo. | And | you? | How | are-you-going?", "Thanks, Pablo. And you? How's it going?", { flags: { 3: F_TU } }),
      t("Perfecto. | ¿Y | tú? | ¿En | qué | estás | trabajando?", "Perfect. | And | you? | On | what | are-you | working?", "Okay. What about you? What are you working on?"),
    ],
    upd_reask: [t("Entonces, | ¿en | qué | estás | trabajando | estos | días?", "So, | on | what | are-you | working | these | days?", "So, what are you working on these days?")],
    upd_done_resp: [
      t("¡Muy | bien! | ¿Le | puedes | mandar | {X.the} | a | todo | el | equipo | después de | la | reunión?",
        "Very | good! | (To) them | can-you | send | {X.the} | to | all | the | team | after | the | meeting?",
        "Great job! Could you send {X.the} to everyone after the meeting?", { flags: { 2: F_LE } }),
    ],
    // "vas a tener listas las facturas": the learner is the subject, so a plural task needs no plural verb
    upd_work_resp: [
      t("Suena | bien. | ¿Para | cuándo | crees | que | vas | a | tener | {listo@X} | {X.the}?", "It-sounds | good. | For | when | you-think | that | you're-going | to | have | ready | {X.the}?",
        "Sounds good. When do you think you'll have {X.the} ready?", { flags: { 6: F_VA } }),
    ],
    upd_behind_resp: [
      t("No te preocupes. | ¿Para | cuándo | crees | que | vas | a | tener | {listo@X} | {X.the}?", "Don't worry. | For | when | you-think | that | you're-going | to | have | ready | {X.the}?",
        "No worries. When do you think you'll have {X.the} ready?", { flags: { 5: F_VA } }),
    ],
    when_reask: [
      t("Entonces, | ¿para | cuándo | crees | que | vas | a | tener | {listo@X} | {X.the}?", "So, | for | when | you-think | that | you're-going | to | have | ready | {X.the}?",
        "So, when do you think you'll have {X.the} ready?"),
    ],
    upd_ok_resp: [
      t("¡Qué bueno! | ¿Y | en | qué | estás | trabajando | ahorita?", "Good to hear! | And | on | what | are-you | working | right now?", "Good to hear! What are you working on right now?",
        { flags: { 6: F_AHORITA }, neutral: t("¡Qué bueno! | ¿Y | en | qué | estás | trabajando | ahora?", "Good to hear! | And | on | what | are-you | working | now?", "Good to hear! What are you working on right now?"), spain: t("¡Qué bien! | ¿Y | en | qué | estás | trabajando | ahora?", "Good to hear! | And | on | what | are-you | working | now?", "Good to hear! What are you working on right now?") }),
    ],
    upd_problem_resp: [t("Uy, | ¿y | eso? | ¿En | qué | estás | trabajando?", "Oh, | and | that? | On | what | are-you | working?", "Oh, how come? What are you working on?", { flags: { 1: "¿Y eso?: how come?, what happened?" } })],
    upd_busy_resp: [t("Semana | pesada, | ¿eh? | ¿En | qué | estás | trabajando?", "Week | heavy, | huh? | On | what | are-you | working?", "Busy week, huh? What are you working on?")],
    what_task_reask: [t("Entonces, | ¿en | qué | estás | trabajando | en | este | momento?", "So, | on | what | are-you | working | at | this | moment?", "So, what are you working on right now?")],
    upd_nothing_resp: [t("Muy | bien, | no pasa nada.", "Very | good, | no worries.", "Okay, no worries.")],
    when_ok: [
      t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"),
      t("Muy | bien. | Nada más | mantenme | al tanto.", "Very | good. | Just | keep-me | posted.", "Okay, great. Just keep me posted.", { spain: t("Muy | bien. | Solo | mantenme | al tanto.", "Very | good. | Just | keep-me | posted.", "Okay, great. Just keep me posted.") }),
    ],
    when_unsure: [t("No pasa nada. | Nada más | mantenme | al tanto.", "No worries. | Just | keep-me | posted.", "That's okay. Just keep me posted.", { spain: t("No pasa nada. | Solo | mantenme | al tanto.", "No worries. | Just | keep-me | posted.", "That's okay. Just keep me posted.") })],
    upd_behind_ok: [t("No te preocupes. | ¡Gracias | por | avisar!", "Don't worry. | Thanks | for | letting-us-know!", "No worries. Thanks for the update!")],
    send_yes: [
      t("¡Gracias!", "Thanks!", "Thanks!"),
      t("¡Genial, | gracias!", "Great, | thanks!", "Awesome, thank you!"),
    ],
    send_no: [t("No hay problema, | cuando | puedas.", "No problem, | when | you-can.", "No problem, whenever you can.")],
    paul_help: [t("Si | quieres, | te | ayudo | con | eso.", "If | you-want, | you | I-help | with | that.", "I can help with that if you want.")],
    paul_talk_later: [t("Perfecto, | lo | vemos | después de | la | reunión.", "Perfect, | it | we-see | after | the | meeting.", "Cool, let's talk after the meeting.", { flags: { 1: F_LO } })],
    paul_ok_short: [t("Bueno, | sin problema.", "Okay, | no problem.", "Okay, no problem.")],

    // --- the launch: jargon, clarifying ------------------------------------------------------------
    move_launch: [
      t("Bueno, | pasemos | al | lanzamiento | de | la | app. | ¿Pablo?", "Okay, | let's-move | to the | launch | of | the | app. | Pablo?", "So, let's move on to the app launch. Pablo?"),
      t("Ahora | sí, | el | lanzamiento | de | la | app. | ¿Pablo?", "Now | yes, | the | launch | of | the | app. | Pablo?", "Now let's move on to the app launch. Pablo?"),
    ],
    jargon_beta: [
      t("Claro. | La | beta | ya | está | arriba, | pero | el | go-live | se | puede | recorrer | una | semana.",
        "Sure. | The | beta | already | is | up, | but | the | go-live | itself | can | push-back | one | week.",
        "Sure. So, the beta is live, but the go-live might slip a week.",
        { flags: { 5: "estar arriba = to be up, online (tech talk).", 9: "se: the date moves by itself; English needs no word.", 11: F_REC },
          neutral: t("Claro. | La | beta | ya | está | arriba, | pero | el | go-live | se | puede | mover | una | semana.",
            "Sure. | The | beta | already | is | up, | but | the | go-live | itself | can | move | one | week.",
            "Sure. So, the beta is live, but the go-live might slip a week.",
            { flags: { 5: "estar arriba = to be up, online (tech talk).", 9: "se: the date moves by itself; English needs no word." } }) }),
    ],
    jargon_soft: [
      t("Claro. | La | próxima | semana | hacemos | un | soft launch, | y | luego | escalamos.", "Sure. | The | next | week | we-do | a | soft launch, | and | then | we-scale.",
        "Sure. So, we're doing a soft launch next week, and then we'll scale up."),
    ],
    jargon_qa: [
      t("Claro. | La | app | ya | está | feature complete, | pero | QA | encontró | unos | blockers.", "Sure. | The | app | already | is | feature-complete, | but | QA | found | some | blockers.",
        "Sure. So, the app is feature-complete, but QA found a few blockers."),
    ],
    any_q_paul: [
      t("¿Alguna | pregunta | para | Pablo?", "Any | question | for | Pablo?", "Any questions for Pablo?"),
      t("¿Alguien | tiene | preguntas | para | Pablo?", "Anyone | has | questions | for | Pablo?", "Does anyone have questions for Pablo?"),
    ],
    any_q_reask: [t("Entonces, | ¿alguna | pregunta | para | Pablo?", "So, | any | question | for | Pablo?", "So, any questions for Pablo?")],
    plain_beta: [
      t("¡Perdón! | Dicho | en | español: | la | versión | de | prueba | ya | funciona, | pero | tal vez | lancemos | una | semana | después.",
        "Sorry! | Said | in | Spanish: | the | version | of | test | already | works, | but | maybe | we-launch | one | week | later.",
        "Sorry! In plain Spanish: the test version works, but we might launch a week later.", { flags: { 12: "Subjunctive after tal vez (maybe)." } }),
    ],
    plain_soft: [
      t("¡Perdón! | Dicho | en | español: | la | próxima | semana, | solo | unos | cuantos | usuarios | tienen | la | app. | Después, | todos.",
        "Sorry! | Said | in | Spanish: | the | next | week, | only | some | few | users | have | the | app. | Later, | everyone.",
        "Sorry! In plain Spanish: next week, only a few users get the app. Later, everyone gets it.", { flags: { 9: "unos cuantos = a few." } }),
    ],
    plain_qa: [
      t("¡Perdón! | Dicho | en | español: | la | app | ya | está | lista, | pero | el | equipo | de | pruebas | encontró | unos | problemas | graves.",
        "Sorry! | Said | in | Spanish: | the | app | already | is | ready, | but | the | team | of | tests | found | some | problems | serious.",
        "Sorry! In plain Spanish: the app is ready, but the testers found some big problems."),
    ],
    simple_beta: [t("O sea, | lanzamos | una | semana | después.", "I mean, | we-launch | one | week | later.", "Basically, the launch is one week later.")],
    simple_soft: [t("O sea: | primero | unas | cuantas | personas, | y | luego | todos.", "I mean: | first | some | few | people, | and | then | everyone.", "Basically: first a few people, then everyone.")],
    simple_qa: [t("O sea, | todavía | hay | que | arreglar | unos | errores.", "I mean, | still | there's | to | fix | some | bugs.", "Basically, we still have some bugs to fix.", { flags: { 2: "hay que + infinitive = we have to." } })],
    makes_sense: [
      t("¿Se entiende?", "Is it clear?", "Does that make sense?"),
      t("¿Así | queda | más | claro?", "Like this | it-stays | more | clear?", "Is that clearer?"),
    ],
    sense_ok: [
      t("¡Qué bueno!", "Great!", "Great!", { spain: t("¡Qué bien!", "Great!", "Great!") }),
      t("¡Perfecto!", "Perfect!", "Cool."),
    ],
    sara_clarify: [
      t("Oye, | Pablo, | ¿me | lo | explicas | en | español?", "Hey, | Pablo, | (to) me | it | you-explain | in | Spanish?", "Hey, Pablo, could you say that in plain Spanish?"),
      t("Este… | Pablo, | ¿lo | puedes | explicar? | No | soy | experta | en | tecnología.", "Um… | Pablo, | it | can-you | explain? | Not | I-am | an-expert | in | technology.",
        "Um, Pablo, could you clarify that? I'm not a tech expert.", { flags: { 0: "este… = um (the Mexican pause word)." } }),
    ],
    term_beta: [t("Una | beta | es | una | versión | de | prueba | para | pocos | usuarios.", "A | beta | is | a | version | of | test | for | few | users.", "A beta is a test version for a small group of users.")],
    term_golive: [t("El | go-live | es | el | día | del | lanzamiento, | cuando | la | app | sale | al | público.", "The | go-live | is | the | day | of the | launch, | when | the | app | goes-out | to the | public.", "Go-live means launch day, when the app goes public.")],
    term_slip: [
      t("Recorrer | quiere decir | mover | a | una | fecha | más | tarde.", "Push back | means | move | to | a | date | more | late.", "Slip means move to a later date.", { flags: { 0: F_REC },
        neutral: t("Mover | la | fecha | quiere decir | pasarla | a | un | día | más | tarde.", "To move | the | date | means | to put-it | on | a | day | more | late.", "Slip means move it to a later date.", { flags: { 4: "-la = it (la fecha)." } }) }),
    ],
    term_soft: [t("Un | soft launch | es | cuando | primero | solo | unos | cuantos | usuarios | tienen | la | app.", "A | soft launch | is | when | first | only | some | few | users | have | the | app.", "A soft launch means only a few users get the app first.")],
    term_scale: [t("Escalar | quiere decir | crecer | poco a poco.", "To scale | means | to grow | little by little.", "Scale up means we grow step by step.")],
    term_feature: [t("Feature complete | quiere decir | que | la | app | ya | tiene | todas | sus | partes.", "Feature-complete | means | that | the | app | already | has | all | its | parts.", "Feature-complete means all the parts of the app are there.")],
    term_qa: [t("QA | es | el | equipo | de | pruebas. | Buscan | errores.", "QA | is | the | team | of | tests. | They-look-for | bugs.", "QA means the testers. They look for bugs.")],
    term_blockers: [t("Los | blockers | son | problemas | grandes. | Con | ellos | no podemos | lanzar.", "The | blockers | are | problems | big. | With | them | we can't | launch.", "Blockers are big problems. We can't launch with them.")],
    term_up: [t("Está | arriba | quiere decir | que | ya | está | en línea.", "It's | up | means | that | already | it-is | online.", "Live means it's already online.")],
    term_launch: [t("El | lanzamiento | es | cuando | abrimos | la | app | a | todos.", "The | launch | is | when | we-open | the | app | to | everyone.", "Launch means we open the app to everyone.")],
    // "¿Cuándo es el lanzamiento?": no date is fixed in any version (beta, soft launch, blockers), as add_customers_ok says
    launch_when: [t("Todavía | no hay | fecha | definitiva. | ¡Pronto | les | aviso!", "Still | there's no | date | final. | Soon | (to) you-all | I'll-let-know!",
      "There's no final date yet. I'll let you all know soon!", { flags: { 5: "les = (to) you all: Pablo tells the whole team." }, spain: t("Todavía | no hay | fecha | definitiva. | ¡Pronto | os | aviso!", "Still | there's no | date | final. | Soon | (to) you-all | I'll-let-know!", "There's no final date yet. I'll let you all know soon!") })],
    // the soft-launch version: its first step has a date
    launch_when_soft: [t("El | soft launch | es | la | próxima | semana; | para | todos, | todavía | no hay | fecha.", "The | soft launch | is | — | next | week; | for | everyone, | still | there's no | date.",
      "The soft launch is next week; for everyone, there's no date yet.", { flags: { 3: F_ART } })],
    term_offline: [t("Quiere decir: | lo | hablamos | después, | fuera de | la | reunión.", "It means: | it | we-talk-about | later, | outside | the | meeting.", "It means: let's talk about it later, after the meeting.", { flags: { 1: F_LO } })],
    term_wrap: [t("Cerrar | quiere decir | terminar. | ¡Ya | casi | acabamos!", "To close | means | to finish. | Already | almost | we-finish!", "Wrap up means finish. We're almost done!")],
    term_aob: [t("Quiere decir: | ¿alguien | tiene | otro | tema?", "It means: | anyone | has | another | topic?", "It means: does anyone have other topics?")],
    term_deadline: [t("La | fecha límite | es | el | último | día | para | entregar | algo.", "The | deadline | is | the | last | day | to | hand-in | something.", "A deadline is the last day for a task.")],
    term_agenda: [t("Es | la | lista | de | temas | de | la | reunión.", "It's | the | list | of | topics | of | the | meeting.", "It's the list of topics for the meeting.")],
    term_mute: [t("Quiere decir | que | tiene | el | micrófono | apagado.", "It means | that | she-has | the | microphone | off.", "It means her microphone is off.")],
    term_pending: [t("Los | pendientes | son | las | tareas | que | tienes | abiertas.", "The | to-dos | are | the | tasks | that | you-have | open.", "Your pendientes are the tasks you still have open.", { flags: { 1: F_PEND } })],
    clarify_ads: [t("Pablo | quiere | gastar | todo | el | dinero | en | anuncios | en | redes sociales.", "Pablo | wants | to spend | all | the | money | on | ads | on | social media.", "Pablo wants to spend all the money on social media ads.")],
    clarify_party: [t("Pablo | quiere | gastar | todo | el | dinero | en | una | gran | fiesta | de | lanzamiento.", "Pablo | wants | to spend | all | the | money | on | a | big | party | of | launch.", "Pablo wants to spend all the money on one big launch party.")],
    clarify_deadline: [t("Pablo | quiere | más | tiempo, | pero | Sara | lo | quiere | para | el | viernes.", "Pablo | wants | more | time, | but | Sara | it | wants | for | — | Friday.", "Pablo wants more time, but Sara wants it on Friday.", { flags: { 9: "el viernes: on Friday (the article stands for “on”)." } })],
    clarify_who: [t("O sea: | ¿quién | puede | hacer | {X.the}?", "I mean: | who | can | do | {X.the}?", "I mean: who can do {X.the}?")],
    clarify_send: [t("O sea: | nada más | manda | {X.the} | por | correo | al | equipo.", "I mean: | just | send | {X.the} | by | email | to the | team.", "I mean: just email {X.the} to the team.", { spain: t("O sea: | solo | manda | {X.the} | por | correo | al | equipo.", "I mean: | just | send | {X.the} | by | email | to the | team.", "I mean: just email {X.the} to the team.") })],

    // --- adding something ---------------------------------------------------------------------------
    anything_add: [
      t("Gracias, | Pablo. | ¿Algo | que | agregar?", "Thanks, | Pablo. | Something | to | add?", "Thanks, Pablo. Anything to add?"),
      t("Muy | bien. | ¿Alguien | quiere | agregar | algo?", "Very | good. | Anyone | wants | to add | something?", "Okay. Does anyone want to add anything?"),
    ],
    add_reask: [t("¿Algo | que | agregar?", "Something | to | add?", "Anything to add?")],
    paul_adds: [t("Yo | quiero | agregar | algo: | necesitamos | más | gente | para | las | pruebas.", "I | want | to add | something: | we-need | more | people | for | the | tests.", "I'd like to add something: we need more testers.")],
    paul_add_ok: [t("Buen | punto. | ¿Alguien | más?", "Good | point. | Anyone | else?", "Good point. Anyone else?")],
    go_ahead: [
      t("¡Claro, | dime!", "Sure, | tell-me!", "Sure, go ahead!"),
      t("Claro. | Adelante.", "Sure. | Go ahead.", "Of course. Go ahead."),
    ],
    add_test_ok: [t("¡Buen | punto! | Lo | agrego | al | plan | de | pruebas.", "Good | point! | It | I'll-add | to the | plan | of | tests.", "Good point! I'll add that to the test plan.")],
    add_help_ok: [t("¡Eso | estaría | genial, | gracias!", "That | would-be | great, | thanks!", "That would be great, thanks!")],
    add_customers_ok: [t("Qué bueno | saberlo. | Pronto | les | damos | la | fecha.", "Good | to-know-it. | Soon | (to) them | we-give | the | date.", "Good to know. We'll tell them the date soon.", { spain: t("Me | alegra | saberlo. | Pronto | les | damos | la | fecha.", "(To) me | it-pleases | to-know-it. | Soon | (to) them | we-give | the | date.", "Good to know. We'll tell them the date soon.") })],
    add_feedback_ok: [t("¡Buena | idea! | Podemos | poner | un | botón | de | comentarios | en | la | app.", "Good | idea! | We-can | put | a | button | of | feedback | in | the | app.", "Great idea! We can add a feedback button to the app.")],
    add_other_ok: [t("Buen | punto, | gracias. | Lo | vemos | después de | la | reunión.", "Good | point, | thanks. | It | we-see | after | the | meeting.", "Good point, thanks. Let's talk about it after the meeting.", { flags: { 3: F_LO } })],
    no_add_ok: [
      t("Muy | bien.", "Very | good.", "Okay, great."),
      t("Perfecto.", "Perfect.", "Perfect."),
    ],

    // --- the budget ----------------------------------------------------------------------------------
    move_budget: [
      t("Bueno, | pasemos | al | presupuesto.", "Okay, | let's-move | to the | budget.", "So, let's move on to the budget."),
      t("Ahora, | el | presupuesto.", "Now, | the | budget.", "Now, let's move on to the budget."),
    ],
    budget_left: [t("Nos | quedan | $80,000 | para | marketing | este | trimestre.", "(To) us | remain | 80,000 pesos | for | marketing | this | quarter.", "We have $80,000 left for marketing this quarter.",
      { say: "Nos quedan ochenta mil pesos para marketing este trimestre.", flags: { 1: "quedar = to be left (what remains is the subject)." } })],
    proposal_ads: [t("Yo | pienso | que | hay | que | meter | todo | en | anuncios | en | redes sociales.", "I | think | that | there's | to | put | everything | into | ads | on | social media.", "I think we should put everything into social media ads.", { flags: { 3: "hay que + infinitive = we should, we have to." } })],
    proposal_party: [t("Yo | pienso | que | hay | que | meter | todo | en | una | gran | fiesta | de | lanzamiento.", "I | think | that | there's | to | put | everything | into | a | big | party | of | launch.", "I think we should put everything into a big launch party.", { flags: { 3: "hay que + infinitive = we should, we have to." } })],
    what_think: [
      t("Mmm. | ¿Tú | qué | opinas?", "Hmm. | You | what | you-think?", "Hmm. What do you think?"),
      t("Interesante. | ¿Tú | qué | piensas?", "Interesting. | You | what | you-think?", "Interesting. What's your opinion?"),
    ],
    what_think_reask: [t("Entonces, | ¿qué | opinas | de | la | idea | de | Pablo?", "So, | what | you-think | of | the | idea | of | Pablo?", "So, what do you think about Pablo's idea?")],
    your_first: [t("¡Primero | quiero | escuchar | tu | opinión!", "First | I-want | to hear | your | opinion!", "I'd like to hear your opinion first!")],
    paul_why: [
      t("¿Ah, | sí? | ¿Por qué | no?", "Oh, | yes? | Why | not?", "Oh? Why not?"),
      t("¿En serio? | ¿Por qué?", "Really? | Why?", "Really? Why?"),
    ],
    paul_fair: [
      t("Mmm, | tiene | sentido.", "Hmm, | it-has | sense.", "Hmm, fair point."),
      t("Bueno, | entiendo | tu | punto.", "Okay, | I-understand | your | point.", "Okay, I see your point."),
    ],
    paul_split_ok: [t("Mmm, | eso | podría | funcionar.", "Hmm, | that | could | work.", "Hmm, that could work.")],
    paul_fair_short: [t("Mmm, | está bien.", "Hmm, | fair enough.", "Okay, fair enough.", { spain: t("Mmm, | vale.", "Hmm, | fair enough.", "Okay, fair enough.") })],
    offline_two: [
      t("Buenos | argumentos. | Mejor | lo | vemos | aparte. | ¿Lo | pueden | hablar | ustedes | dos | después de | la | reunión?",
        "Good | arguments. | Better | it | we-see | separately. | It | can-you-all | talk-about | you | two | after | the | meeting?",
        "Good points. Let's take this offline. Can you two talk after the meeting?", { flags: { 3: F_LO, 5: "verlo aparte = take it offline, discuss it separately." }, spain: t("Buenos | argumentos. | Mejor | lo | vemos | aparte. | ¿Lo | podéis | hablar | vosotros | dos | después de | la | reunión?", "Good | arguments. | Better | it | we-see | separately. | It | can-you-all | talk-about | you | two | after | the | meeting?", "Good points. Let's take this offline. Can you two talk after the meeting?", { flags: { 3: F_LO, 5: "verlo aparte = take it offline, discuss it separately." } }) }),
    ],
    offline_short: [
      t("Bueno. | Mejor | lo | vemos | aparte. | ¿Lo | pueden | hablar | ustedes | dos | después de | la | reunión?",
        "Okay. | Better | it | we-see | separately. | It | can-you-all | talk-about | you | two | after | the | meeting?",
        "Alright. Let's take this offline. Can you two talk after the meeting?", { flags: { 2: F_LO, 4: "verlo aparte = take it offline, discuss it separately." }, spain: t("Bueno. | Mejor | lo | vemos | aparte. | ¿Lo | podéis | hablar | vosotros | dos | después de | la | reunión?", "Okay. | Better | it | we-see | separately. | It | can-you-all | talk-about | you | two | after | the | meeting?", "Alright. Let's take this offline. Can you two talk after the meeting?", { flags: { 2: F_LO, 4: "verlo aparte = take it offline, discuss it separately." } }) }),
    ],
    offline_sara: [
      t("Bueno. | Mejor | lo | vemos | aparte. | Pablo | y | Sara, | ¿lo | pueden | hablar | después de | la | reunión?",
        "Okay. | Better | it | we-see | separately. | Pablo | and | Sara, | it | can-you-all | talk-about | after | the | meeting?",
        "Okay. Let's take this offline. Pablo and Sara, can you talk after the meeting?", { flags: { 2: F_LO, 4: "verlo aparte = take it offline, discuss it separately." }, spain: t("Bueno. | Mejor | lo | vemos | aparte. | Pablo | y | Sara, | ¿lo | podéis | hablar | después de | la | reunión?", "Okay. | Better | it | we-see | separately. | Pablo | and | Sara, | it | can-you-all | talk-about | after | the | meeting?", "Okay. Let's take this offline. Pablo and Sara, can you talk after the meeting?", { flags: { 2: F_LO, 4: "verlo aparte = take it offline, discuss it separately." } }) }),
    ],
    talk_later_ok: [
      t("Me | parece | bien.", "(To) me | it-seems | good.", "Sounds good."),
      t("¡Trato hecho!", "Deal!", "Deal!"),
    ],
    by_email: [t("Bueno, | entonces | por | correo.", "Okay, | then | by | email.", "Okay, maybe by email then.")],
    k_ok_agree: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Okay, thanks.")],
    k_thats_ok: [t("No pasa nada.", "That's okay.", "That's okay.")],
    sara_q: [t("Sara, | ¿tú | qué | opinas?", "Sara, | you | what | you-think?", "Sara, what do you think?")],
    sara_budget: [t("Mmm, | no sé | si | estoy | de acuerdo. | Es | mucho | dinero | para | una | sola | cosa.", "Hmm, | I don't know | if | I-am | in agreement. | It's | a lot of | money | for | one | single | thing.", "Hmm, I'm not sure I agree. That's a lot of money for one thing.")],
    noted: [t("Bueno, | anotado.", "Okay, | noted.", "Okay, noted.")],

    // --- the deadline, who's taking it ------------------------------------------------------------------
    move_deadline: [t("Último | punto: | la | próxima | entrega. | Necesitamos | {X.the} | para | el | viernes.", "Last | point: | the | next | deadline. | We-need | {X.the} | for | — | Friday.",
      "Last thing: the next deadline. We need {X.the} by Friday.", { flags: { 8: "el viernes: on Friday (the article stands for “on”)." } })],
    who_takes: [
      t("¿Quién | se encarga?", "Who | takes care of it?", "Who's taking this?"),
      t("Entonces, | ¿quién | se encarga | de | esto?", "So, | who | takes care | of | this?", "So, who's taking this one?"),
    ],
    who_reask: [t("Entonces, | ¿quién | lo | puede | hacer?", "So, | who | it | can | do?", "So, who can take this?")],
    take_ok: [
      t("¡Genial, | gracias! | Para | el | viernes, | entonces.", "Great, | thanks! | For | — | Friday, | then.", "Great, thanks! By Friday, then.", { flags: { 3: "el viernes: on Friday (the article stands for “on”)." } }),
      t("Perfecto. | ¡Gracias!", "Perfect. | Thanks!", "Perfect. Thank you!"),
    ],
    take_ok_plain: [t("Perfecto. | ¡Gracias!", "Perfect. | Thanks!", "Perfect. Thank you!")],
    take_need_friday: [t("¡Gracias! | Pero | lo | necesitamos | para | el | viernes, | ¿eh?", "Thanks! | But | it | we-need | for | — | Friday, | okay?", "Thanks! But we need it by Friday, okay?",
      { flags: { 2: F_LO, 5: "el viernes: on Friday (the article stands for “on”).", 7: "¿eh? at the end asks for agreement: okay?" } })],
    paul_take: [
      t("No te preocupes, | yo | me encargo.", "Don't worry, | I | take care of it.", "No worries, I can take it."),
      t("Claro, | yo | lo | hago.", "Sure, | I | it | I-do.", "Sure, I can do it."),
    ],
    paul_take2: [t("Claro, | yo | lo | hago.", "Sure, | I | it | I-do.", "Sure, I can do it.")],
    sara_take: [t("Claro, | yo | me encargo.", "Sure, | I | take care of it.", "Sure, I'll take it.")],
    thanks_paul: [t("¡Gracias, | Pablo!", "Thanks, | Pablo!", "Thanks, Pablo!")],
    thanks_sara: [t("¡Gracias, | Sara!", "Thanks, | Sara!", "Thanks, Sara!")],
    paul_help_sure: [t("Claro, | yo | te | ayudo.", "Sure, | I | you | I-help.", "Sure, I can help.")],
    paul_too_soon: [t("Mmm, | el | viernes | es | muy | pronto. | Necesitamos | otra | semana.", "Hmm, | — | Friday | is | very | soon. | We-need | another | week.", "Hmm, Friday is too soon. We need another week.", { flags: { 1: F_ART } })],
    sara_not_sure: [t("No sé | si | estoy | de acuerdo. | El | cliente | lo | necesita | antes del | lanzamiento.", "I don't know | if | I-am | in agreement. | The | client | it | needs | before the | launch.", "I'm not sure I agree. The client needs it before the launch.")],
    dl_reask: [t("Entonces, | ¿tú | qué | opinas: | el | viernes | o | la | próxima | semana?", "So, | you | what | you-think: | — | Friday | or | — | next | week?", "So, what do you think: Friday or next week?", { flags: { 4: F_ART, 7: F_ART } })],
    dl_which: [t("¿Con | Pablo | o | con | Sara?", "With | Pablo | or | with | Sara?", "With Pablo or with Sara?")],
    dl_which_again: [t("Perdón, | ¿con | quién: | Pablo | o | Sara?", "Sorry, | with | whom: | Pablo | or | Sara?", "Sorry, which one: Pablo or Sara?")],
    dl_paul_side: [t("De acuerdo. | Más | tiempo | podría | ayudar.", "Okay. | More | time | could | help.", "Okay. More time could help.")],
    dl_sara_side: [t("De acuerdo. | El | viernes | es | importante | para | el | cliente.", "Okay. | — | Friday | is | important | for | the | client.", "Okay. Friday is important for the client.", { flags: { 1: F_ART } })],
    dl_both: [t("¡Ja! | Muy | {m:diplomático|f:diplomática}.", "Ha! | Very | diplomatic.", "Ha! Very diplomatic.")],
    dl_idea: [t("¡Buena | idea! | Una | versión | corta | el | viernes, | y | la | completa | la | próxima | semana.", "Good | idea! | A | version | short | on | Friday, | and | the | full-one | — | next | week.",
      "Good idea! A short version on Friday, and the full one next week.", { flags: { 5: "el viernes: on Friday (the article stands for “on”).", 10: F_ART } })],
    dl_client: [t("Buena | idea. | Hoy | le | hablo | al | cliente.", "Good | idea. | Today | (to) him | I'll-call | the | client.", "Good idea. I'll call the client today.", { flags: { 3: "le doubles the person you call (al cliente); hablarle = call (Mexico)." },
      neutral: t("Buena | idea. | Hoy | llamo | al | cliente.", "Good | idea. | Today | I'll-call | the | client.", "Good idea. I'll call the client today.") })],
    dl_later: [t("Lo | hablamos | después de | la | reunión.", "It | we-talk-about | after | the | meeting.", "Let's talk about it after the meeting.", { flags: { 0: F_LO } })],

    // --- any other business, the end ------------------------------------------------------------------
    aob_ask: [
      t("Bueno, | vamos | cerrando. | ¿Algún | otro | asunto?", "Okay, | we-go | closing. | Any | other | business?", "Okay, let's wrap up. Any other business?", { flags: { 1: "ir + gerund: “vamos cerrando” = let's wrap up." } }),
      t("Muy | bien, | ya | para | cerrar: | ¿asuntos | generales?", "Very | good, | now | to | close: | matters | general?", "Alright, let's wrap up. Any other business?", { flags: { 5: "asuntos generales: the last point of a Mexican meeting agenda (any other business)." } }),
    ],
    aob_reask: [t("¿Algún | otro | asunto?", "Any | other | business?", "Any other business?")],
    aob_more: [t("¿Algo | más?", "Something | more?", "Anything else?")],
    aob_wfh_ok: [t("Claro, | sin problema. | Nada más | ponlo | en | el | calendario.", "Sure, | no problem. | Just | put-it | on | the | calendar.", "Sure, no problem. Just put it on the calendar.", { spain: t("Claro, | sin problema. | Solo | ponlo | en | el | calendario.", "Sure, | no problem. | Just | put-it | on | the | calendar.", "Sure, no problem. Just put it on the calendar.") })],
    aob_lunch_ans: [t("¡El | próximo | jueves, | a | las | dos!", "— | Next | Thursday, | at | — | two!", "Next Thursday at two!", { flags: { 0: F_ART, 4: "The article before a clock time has no English word." } })],
    // "¿Dónde es la comida?": the place isn't chosen yet (no restaurant is named in the town's facts for it)
    aob_lunch_where: [t("Todavía | no sabemos | dónde, | pero | es | el | próximo | jueves | a | las | dos.", "Still | we don't know | where, | but | it's | — | next | Thursday | at | — | two.",
      "We don't know where yet, but it's next Thursday at two.", { flags: { 5: F_ART, 9: "The article before a clock time has no English word." } })],
    aob_vacation_ok: [t("Gracias | por | avisar. | ¡Disfrútalas!", "Thanks | for | letting-us-know. | Enjoy-them!", "Thanks for letting us know. Enjoy!", { flags: { 3: "-las = them (las vacaciones)." } })],
    aob_printer_ok: [t("¿Otra vez? | Le | hablo | a | sistemas.", "Again? | (To) them | I'll-call | — | IT.", "Again? I'll call IT.", { flags: { 1: "le doubles the person you call; hablarle = call (Mexico).", 3: "a marks the people you call; English needs no word.", 4: "sistemas: the IT department in a Mexican office." },
      neutral: t("¿Otra vez? | Llamo | a | sistemas.", "Again? | I'll-call | — | IT.", "Again? I'll call IT.", { flags: { 2: "a marks the people you call; English needs no word.", 3: "sistemas: the IT department in an office." } }) })],
    aob_other_ok: [t("Buen | punto. | Lo | ponemos | en | la | agenda | de | la | próxima | semana.", "Good | point. | It | we-put | on | the | agenda | of | the | next | week.", "Good point. Let's put it on the agenda for next week.", { flags: { 2: F_LO } })],
    // a question nobody can answer in the meeting ("¿Puedo salir temprano el viernes?", "¿Quién va a la comida?")
    aob_q_ok: [t("Buena | pregunta. | Lo | vemos | después de | la | reunión.", "Good | question. | It | we-see | after | the | meeting.", "Good question. Let's talk about it after the meeting.", { flags: { 2: F_LO } })],
    closing: [
      t("Es | todo | por | hoy. | ¡Gracias | a | todos!", "It's | all | for | today. | Thanks | to | everyone!", "That's it for today. Thanks, everyone!"),
      t("Muy | buena | reunión, | equipo. | ¡Gracias!", "Very | good | meeting, | team. | Thanks!", "Great meeting, everyone. Thank you!"),
    ],
    summary_ask: [t("Ah, | ¿y | les | puedes | mandar | a | todos | un | resumen | rápido?", "Oh, | and | (to) them | can-you | send | to | everyone | a | summary | quick?", "Oh, and could you send everyone a quick summary?", { flags: { 2: F_LES } })],
    summary_how: [t("Sí, | por | correo, | a | todo | el | equipo. | ¿Lo | puedes | mandar?", "Yes, | by | email, | to | all | the | team. | It | can-you | send?",
      "Yes, by email, to the whole team. Could you send it?", { flags: { 7: F_LO } })],
    summary_reask: [t("¿Puedes | mandar | el | resumen?", "Can-you | send | the | summary?", "Could you send the summary?")],
    clarify_summary: [t("De | la | reunión: | los | temas | y | quién | hace | qué. | ¿Lo | puedes | mandar?", "Of | the | meeting: | the | topics | and | who | does | what. | It | can-you | send?",
      "Of the meeting: the topics and who's doing what. Could you send it?", { flags: { 9: F_LO } })],
    summary_yes: [t("¡Gracias! | Eres | {m:el|f:la} | mejor.", "Thanks! | You're | the | best.", "Thanks! You're the best.")],
    summary_no: [t("No hay problema, | yo | lo | hago.", "No problem, | I | it | I-do.", "No problem, I'll do it.")],
    bye_kate: [
      t("¡Nos vemos, | equipo!", "See you, | team!", "Bye, everyone!"),
      t("¡Hasta luego!", "See you later!", "See you later!"),
    ],
    paul_bye: [
      t("¡Nos vemos!", "See you!", "See you!"),
      t("¡Adiós, | chicos!", "Bye, | guys!", "Bye, guys!"),
    ],
    sara_bye: [t("¡Adiós!", "Bye!", "Bye!")],
    leave_ok: [t("¡Ah, | claro! | Gracias | por | venir.", "Oh, | sure! | Thanks | for | coming.", "Oh, okay! Thanks for coming.")],
    not_yet: [t("¡Ja, | todavía | no! | Ya | casi | acabamos.", "Ha, | still | not! | Already | almost | we-finish.", "Ha, not yet! We're almost done.")],
    agenda_ans: [t("El | lanzamiento | de | la | app, | el | presupuesto | y | la | próxima | entrega.", "The | launch | of | the | app, | the | budget | and | the | next | deadline.", "The app launch, the budget and the next deadline.")],
    deadline_ans: [t("Necesitamos | {X.the} | para | el | viernes.", "We-need | {X.the} | for | — | Friday.", "We need {X.the} by Friday.", { flags: { 3: "el viernes: on Friday (the article stands for “on”)." } })],
    next_meeting_ans: [t("El | próximo | lunes, | a | la | misma | hora.", "— | Next | Monday, | at | the | same | time.", "Same time next Monday.", { flags: { 0: F_ART } })],
    np_paul: [t("¡De nada!", "You're welcome!", "No problem!")],
    np_sara: [t("¡De nada!", "You're welcome!", "No problem!")],
    sure_welcome: [t("¡Con gusto!", "My pleasure!", "Sure!", { spain: t("¡De nada!", "You're welcome!", "Sure!") })],
    yes_you: [t("¡Sí, | tú!", "Yes, | you!", "Yes, you!")],
    can_you_take: [t("¿Te encargas | tú?", "You-take-care-of-it | you?", "Can you take it?", { flags: { 0: "encargarse (de algo) = to take care of something; te goes with the verb." } })],
    k_good_thanks: [t("¡Bien, | gracias!", "Good, | thanks!", "Good, thanks!")],
    ok: [
      t("Muy | bien.", "Very | good.", "Okay."),
      t("Claro.", "Sure.", "Sure."),
    ],
  },

  hints: {
    mute: {
      lt: "Tell Sara she's on mute",
      items: [
        { id: "m_on_mute", s: t("¡Sara, | estás | en | silencio!", "Sara, | you're | on | mute!", "Sara, you're on mute!"), note: "Mexicans also say “¡Estás muteada!”" },
        { id: "m_cant_hear", s: t("Sara, | no te escuchamos.", "Sara, | we can't hear you.", "Sara, we can't hear you.") },
        { id: "m_think", s: t("Creo | que | estás | en | silencio.", "I-think | that | you're | on | mute.", "I think you're muted.") },
        { id: "m_mic", s: t("Sara, | tienes | el | micrófono | apagado.", "Sara, | you-have | the | microphone | off.", "Sara, your mic is off.") },
        { id: "m_click", s: t("¡Prende | tu | micrófono!", "Turn on | your | microphone!", "Turn on your mic!", { neutral: t("¡Enciende | tu | micrófono!", "Turn on | your | microphone!", "Turn on your mic!") }),
          note: "prender is Mexican for “turn on”; encender and activar work everywhere." },
        { id: "m_unmute", s: t("Sara, | quítate | el | mute.", "Sara, | take-off-yourself | the | mute.", "Sara, you need to unmute.") },
      ],
    },
    sara_hear: {
      lt: "Tell Sara whether you can hear her now",
      items: [
        { id: "h_yes", s: t("¡Sí, | ya | te | escuchamos!", "Yes, | now | you | we-hear!", "Yes, we can hear you now!") },
        { id: "h_loud", s: t("¡Sí, | fuerte y claro!", "Yes, | loud and clear!", "Yes, loud and clear!") },
        { id: "h_no", s: t("No, | todavía | nada.", "No, | still | nothing.", "No, still nothing.") },
      ],
    },
    notes: {
      lt: "Agree to take notes, or say you can't",
      items: [
        { id: "n_sure", s: t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem!") },
        { id: "o_can", s: t("Claro, | yo | las | tomo.", "Sure, | I | them | I-take.", "Of course, I can do that.", { flags: { 2: "las here is a pronoun: them (las notas)." } }) },
        // "la minuta" and "la comida" (lunch) are Mexico's; the neutral twins say "el acta" and "el almuerzo" (the lead's decision, 5 Nov 2026)
        { id: "n_minuta", s: t("Sí, | yo | hago | la | minuta.", "Yes, | I | I-do | the | minutes.", "Sure, I'll take the minutes.",
          { flags: { 4: "Mexican: la minuta = the minutes of a meeting; elsewhere el acta." },
            neutral: t("Sí, | yo | hago | el | acta.", "Yes, | I | I-do | the | minutes.", "Sure, I'll take the minutes.",
              { flags: { 3: "el acta: a feminine noun that takes el (like el agua), because it starts with a stressed a." } }) }),
          note: "la minuta: the minutes of a meeting (a Mexican office word; el acta elsewhere)." },
        { id: "n_laptop", s: t("Perdón, | hoy | no traigo | mi | laptop.", "Sorry, | today | I don't have | my | laptop.", "Sorry, I don't have my laptop today.") },
      ],
    },
    update: {
      lt: "Give your update", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "u_finished", s: t("Ya | terminé | {X.the}.", "Already | I-finished | {X.the}.", "I finished {X.the}.") },
        { id: "u_working", s: t("Estoy | trabajando | en | {X.the}.", "I'm | working | on | {X.the}.", "I'm working on {X.the}.") },
        { id: "u_ready", s: t("{X.the} | va | a | estar | {listo@X} | el | viernes.", "{X.the} | is-going | to | be | ready | on | Friday.", "{X.the} will be ready by Friday.", { flags: { 5: "el viernes: on Friday (the article stands for “on”)." } }), only: notPlural,
          note: "Va a estar: the everyday way to say “will be”." },
        { id: "u_almost", s: t("Ya | casi | termino | {X.the}.", "Already | almost | I-finish | {X.the}.", "I'm almost done with {X.the}."), note: "Present tense after ya casi: “I'm almost done”." },
        { id: "u_behind", s: t("Voy | un | poco | {m:atrasado|f:atrasada} | con | {X.the}.", "I'm-going | a | bit | behind | with | {X.the}.", "I'm a bit behind with {X.the}.") },
        { id: "u_track", s: t("Todo | va | bien.", "Everything | goes | well.", "Everything's on track.") },
      ],
    },
    task: {
      lt: "Say what you're working on", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "t_task", s: t("En | {X.the}.", "On | {X.the}.", "On {X.the}.") },
        { id: "u_working", s: t("Estoy | trabajando | en | {X.the}.", "I'm | working | on | {X.the}.", "I'm working on {X.the}.") },
        { id: "t_ando", s: t("Ando | con | {X.the}.", "I'm-going-around | with | {X.the}.", "I'm on {X.the}."), note: "Very Mexican: “ando con…” = I'm busy with…" },
      ],
    },
    when: {
      lt: "Say when it will be ready",
      items: [
        { id: "w_when", s: t("Para | el | viernes.", "For | — | Friday.", "By Friday.", { flags: { 1: "el viernes: on Friday (the article stands for “on”)." } }) },
        { id: "w_ready", s: t("Va | a | estar | listo | el | viernes.", "It's-going | to | be | ready | on | Friday.", "It'll be ready by Friday.", { flags: { 4: "el viernes: on Friday (the article stands for “on”)." } }) },
        { id: "w_when", s: t("Mañana | en la mañana.", "Tomorrow | in the morning.", "Tomorrow morning.", { spain: t("Mañana | por la mañana.", "Tomorrow | in the morning.", "Tomorrow morning.") }) },
        { id: "w_unsure", s: t("Todavía | no | estoy | {m:seguro|f:segura}.", "Still | not | I-am | sure.", "I'm not sure yet.") },
      ],
    },
    send: {
      lt: "Agree to send it",
      items: [
        { id: "s_sure", s: t("¡Claro!", "Sure!", "Sure!") },
        { id: "s_after", s: t("Claro, | se | lo | mando | después de | la | reunión.", "Sure, | (to) them | it | I'll-send | after | the | meeting.", "Sure, right after the meeting."), note: "se lo: “it to them” (le becomes se before lo)." },
      ],
    },
    clarify_beta: {
      lt: "Ask Pablo to explain",
      items: [
        { id: "c_explain", s: t("¿Me | lo | puedes | explicar?", "(To) me | it | can-you | explain?", "Could you explain that?") },
        { id: "c_clarify", s: t("¿Puedes | aclarar | eso?", "Can-you | clarify | that?", "Could you clarify that?") },
        { id: "c_mean_by", s: t("¿Qué | significa | «go-live»?", "What | means | “go-live”?", "What does “go-live” mean?") },
        { id: "c_whats", s: t("Perdón, | ¿qué | es | una | beta?", "Sorry, | what | is | a | beta?", "Sorry, what's a beta?") },
        { id: "c_simple", s: t("¿Lo | puedes | decir | más | fácil?", "It | can-you | say | more | easy?", "Could you say that more simply?") },
        { id: "c_none", s: t("No tengo | preguntas.", "I don't have | questions.", "No questions from me.") },
      ],
    },
    clarify_soft: {
      lt: "Ask Pablo to explain",
      items: [
        { id: "c_explain", s: t("¿Me | lo | puedes | explicar?", "(To) me | it | can-you | explain?", "Could you explain that?") },
        { id: "c_clarify", s: t("¿Puedes | aclarar | eso?", "Can-you | clarify | that?", "Could you clarify that?") },
        { id: "c_whats", s: t("¿Qué | es | un | soft launch?", "What | is | a | soft launch?", "What's a soft launch?") },
        { id: "c_mean_by", s: t("¿Qué | significa | «escalar»?", "What | means | “to scale”?", "What does “scale up” mean?") },
        { id: "c_simple", s: t("¿Lo | puedes | decir | más | fácil?", "It | can-you | say | more | easy?", "Could you say that more simply?") },
        { id: "c_none", s: t("No tengo | preguntas.", "I don't have | questions.", "No questions from me.") },
      ],
    },
    clarify_qa: {
      lt: "Ask Pablo to explain",
      items: [
        { id: "c_explain", s: t("¿Me | lo | puedes | explicar?", "(To) me | it | can-you | explain?", "Could you explain that?") },
        { id: "c_clarify", s: t("¿Puedes | aclarar | eso?", "Can-you | clarify | that?", "Could you clarify that?") },
        { id: "c_whats", s: t("Perdón, | ¿qué | es | QA?", "Sorry, | what | is | QA?", "Sorry, what's QA?") },
        { id: "c_mean_by", s: t("¿Qué | son | los | «blockers»?", "What | are | the | “blockers”?", "What are “blockers”?") },
        { id: "c_simple", s: t("¿Lo | puedes | decir | más | fácil?", "It | can-you | say | more | easy?", "Could you say that more simply?") },
        { id: "c_none", s: t("No tengo | preguntas.", "I don't have | questions.", "No questions from me.") },
      ],
    },
    sense: {
      lt: "Say whether it's clear now",
      items: [
        { id: "s_yes", s: t("Sí, | gracias. | Ya | entendí.", "Yes, | thanks. | Now | I-understood.", "Yes, thanks! Now I understand.") },
        { id: "s_got", s: t("Gracias, | ya | quedó | claro.", "Thanks, | now | it-stayed | clear.", "Got it, thanks.") },
        { id: "s_no", s: t("La verdad, | no | mucho.", "The truth, | not | much.", "Not really, sorry.") },
      ],
    },
    add: {
      lt: "Add something",
      items: [
        { id: "a_add", s: t("Quiero | agregar | algo.", "I-want | to add | something.", "I'd like to add something.") },
        { id: "a_can_add", s: t("¿Puedo | agregar | algo?", "Can-I | add | something?", "Can I add something?") },
        { id: "a_test", s: t("Deberíamos | probarla | en | celulares | viejos.", "We-should | test-it | on | phones | old.", "We should test it on older phones.", { spain: t("Deberíamos | probarla | en | móviles | viejos.", "We-should | test-it | on | phones | old.", "We should test it on older phones.") }), note: "-la = la app." },
        { id: "a_help", s: t("Yo | puedo | ayudar | con | las | pruebas.", "I | can | help | with | the | tests.", "I can help with the testing.") },
        { id: "a_customers", s: t("Los | clientes | están | preguntando | por | la | fecha.", "The | customers | are | asking | about | the | date.", "Our customers are asking about the launch date.") },
        { id: "a_feedback", s: t("Deberíamos | pedirles | su | opinión | a | los | usuarios.", "We-should | ask-them-for | their | opinion | — | the | users.", "We should ask users for feedback.",
          { flags: { 1: "-les doubles “a los usuarios”.", 4: "a marks the people you ask; English needs no word." } }) },
        { id: "a_none", s: t("No, | es | todo | de | mi | parte.", "No, | it's | all | from | my | side.", "No, that's all from me.") },
      ],
    },
    add_what: {
      lt: "Say what you'd like to add",
      items: [
        { id: "a_test", s: t("Deberíamos | probarla | en | celulares | viejos.", "We-should | test-it | on | phones | old.", "We should test it on older phones.", { spain: t("Deberíamos | probarla | en | móviles | viejos.", "We-should | test-it | on | phones | old.", "We should test it on older phones.") }) },
        { id: "a_help", s: t("Yo | puedo | ayudar | con | las | pruebas.", "I | can | help | with | the | tests.", "I can help with the testing.") },
        { id: "a_customers", s: t("Los | clientes | están | preguntando | por | la | fecha.", "The | customers | are | asking | about | the | date.", "Our customers are asking about the launch date.") },
        { id: "a_feedback", s: t("Deberíamos | hacer | una | encuesta.", "We-should | do | a | survey.", "We should do a survey.") },
      ],
    },
    opinion: {
      lt: "Disagree politely with Pablo",
      items: [
        { id: "o_not_sure", s: t("No sé | si | estoy | de acuerdo.", "I don't know | if | I-am | in agreement.", "I'm not sure I agree.") },
        { id: "o_see_point", s: t("Entiendo | tu | punto, | pero | es | mucho | dinero.", "I-understand | your | point, | but | it's | a lot of | money.", "I see your point, but it's a lot of money.") },
        { id: "o_split", s: t("¿Y si | lo | dividimos | a la mitad?", "What if | it | we-split | in half?", "Maybe we could split it?") },
        { id: "w_risky", s: t("Mmm, | es | muy | arriesgado.", "Hmm, | it's | very | risky.", "Hmm, it's too risky.") },
        { id: "o_veo", s: t("Yo | lo | veo | diferente.", "I | it | I-see | differently.", "I see it differently.") },
      ],
    },
    opinion_yes: {
      lt: "Agree with Pablo",
      items: [
        { id: "o_agree", s: t("Estoy | de acuerdo | con | Pablo.", "I-am | in agreement | with | Pablo.", "I agree with Pablo.") },
        { id: "o_good_idea", s: t("¡Buena | idea!", "Good | idea!", "Good idea!") },
        { id: "o_makes_sense", s: t("Tiene | sentido.", "It-has | sense.", "That makes sense.") },
      ],
    },
    why: {
      lt: "Say why you disagree",
      items: [
        { id: "w_expensive", s: t("Es | muy | caro.", "It's | very | expensive.", "It's too expensive.") },
        { id: "w_risky", s: t("Es | muy | arriesgado.", "It's | very | risky.", "It's too risky.") },
        { id: "w_keep", s: t("Deberíamos | guardar | algo | para | después.", "We-should | keep | something | for | later.", "We should keep some money for later.") },
        { id: "o_split", s: t("¿Y si | lo | dividimos | a la mitad?", "What if | it | we-split | in half?", "Maybe we could split it?") },
      ],
    },
    talk_after: {
      lt: "Agree to talk later",
      items: [
        { id: "t_sure", s: t("Claro, | lo | hablamos | después.", "Sure, | it | we-talk-about | later.", "Sure, let's talk later.") },
        { id: "t_sounds", s: t("¡Me | parece | bien!", "(To) me | it-seems | good!", "Sounds good!") },
      ],
    },
    dl_view: {
      lt: "Say what you think about the deadline",
      items: [
        { id: "d_sara", s: t("Estoy | de acuerdo | con | Sara.", "I-am | in agreement | with | Sara.", "I agree with Sara.") },
        { id: "d_paul", s: t("Creo | que | Pablo | tiene | razón.", "I-think | that | Pablo | has | reason.", "I think Pablo is right.") },
        { id: "d_short", s: t("¿Y si | mandamos | una | versión | corta | el | viernes?", "What if | we-send | a | version | short | on | Friday?", "Maybe we could send a short version on Friday?", { flags: { 5: "el viernes: on Friday (the article stands for “on”)." } }) },
        { id: "d_client", s: t("Podríamos | preguntarle | al | cliente.", "We-could | ask-him | the | client.", "We could ask the client.", { flags: { 1: "-le doubles “al cliente”." } }) },
      ],
    },
    dl_who: {
      lt: "Say who you agree with",
      items: [
        { id: "d_with", s: t("Con | Sara.", "With | Sara.", "With Sara.") },
        { id: "d_with", s: t("Con | Pablo.", "With | Pablo.", "With Pablo.") },
      ],
    },
    owner: {
      lt: "Volunteer, or politely say no",
      items: [
        { id: "o_can", s: t("Yo | lo | hago.", "I | it | I-do.", "I can do that.") },
        { id: "o_take", s: t("Yo | me encargo.", "I | I'll take care of it.", "I'll take it."), note: "encargarse = take charge of something." },
        { id: "o_busy", s: t("Perdón, | estoy | muy | {m:ocupado|f:ocupada} | esta | semana.", "Sorry, | I'm | very | busy | this | week.", "Sorry, I'm really busy this week.") },
        { id: "o_cant", s: t("Esta | semana | no puedo.", "This | week | I can't.", "I can't this week.") },
        { id: "o_paul", s: t("¿Tal vez | Pablo | puede | hacerlo?", "Maybe | Pablo | can | do-it?", "Maybe Pablo could do it?") },
      ],
    },
    aob: {
      lt: "Say you have nothing else, or bring something up",
      items: [
        { id: "b_none", s: t("No, | nada | de | mi | parte.", "No, | nothing | from | my | side.", "No, nothing from me.") },
        { id: "b_wfh", s: t("¿Puedo | trabajar | desde | casa | el | viernes?", "Can-I | work | from | home | on | Friday?", "Can I work from home on Friday?", { flags: { 4: "el viernes: on Friday (the article stands for “on”)." } }), note: "Mexicans also say “hacer home office”." },
        { id: "b_lunch", s: t("¿Cuándo | es | la | comida | del | equipo?", "When | is | the | lunch | of the | team?", "When's the team lunch?",
          { flags: { 3: "Mexican: la comida = lunch, the main meal, around two or three; elsewhere el almuerzo." },
            neutral: t("¿Cuándo | es | el | almuerzo | del | equipo?", "When | is | the | lunch | of the | team?", "When's the team lunch?") }),
          note: "la comida: Mexico's main meal, around two or three (el almuerzo in much of Latin America)." },
        { id: "b_vacation", s: t("La | próxima | semana | estoy | de | vacaciones.", "— | Next | week | I-am | on | vacation.", "I'm on vacation next week.", { flags: { 0: F_ART } }) },
        { id: "b_printer", s: t("La | impresora | no funciona | otra vez.", "The | printer | doesn't work | again.", "The printer is broken again.") },
        { id: "a_add", s: t("Quiero | agregar | algo.", "I-want | to add | something.", "I'd like to add something.") },
      ],
    },
    aob_more: {
      lt: "Say that's all",
      items: [
        { id: "b_all", s: t("No, | es | todo.", "No, | it's | all.", "No, that's all.") },
        { id: "b_none", s: t("No, | nada | de | mi | parte.", "No, | nothing | from | my | side.", "No, nothing from me.") },
      ],
    },
    summary: {
      lt: "Agree to send the summary, or say you can't",
      items: [
        { id: "s_send", s: t("Claro, | hoy | lo | mando.", "Sure, | today | it | I'll-send.", "Sure, I'll send it today.") },
        { id: "s_cant", s: t("Perdón, | hoy | no puedo.", "Sorry, | today | I can't.", "Sorry, I can't today.") },
      ],
    },
    bye: {
      lt: "Thank everyone and say goodbye",
      items: [
        { id: "b_thanks", s: t("¡Gracias | a | todos!", "Thanks | to | everyone!", "Thanks, everyone!") },
        { id: "b_see", s: t("¡Gracias, | Sofía! | Nos vemos.", "Thanks, | Sofía! | See you.", "Thanks, Sofía! See you later.") },
        { id: "b_great", s: t("¡Muy | buena | reunión!", "Very | good | meeting!", "Great meeting!") },
      ],
    },
  },

  tips: {
    soft_disagree: { key: "soft_disagree", lt: "Understood! In a meeting it sounds softer to say “No estoy muy de acuerdo” or “Entiendo tu punto, pero…”.", better: "No estoy muy de acuerdo." },
  },

  merges: {
    "qué bien": { reason: "lexical_expression", split: "qué → what + bien → well is a word-for-word exclamation; = great, good to hear.", minimal: "Two words." },
    "por la mañana": { reason: "lexical_expression", split: "por → by, la → the, mañana → morning; Spain's time phrase = in the morning.", minimal: "Three words." },
    "qué bueno": { reason: "lexical_expression", split: "qué → what + bueno → good is a word-for-word exclamation; = great, good to hear.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → afterwards + de → of; one preposition = after.", minimal: "Two words." },
    "antes del": { reason: "lexical_expression", split: "antes → before + del → of the; one preposition with its article = before the.", minimal: "Two words." },
    "al tanto": { reason: "lexical_expression", split: "al → to the + tanto → so much is false; mantener al tanto = keep posted.", minimal: "Two words." },
    "soft launch": { reason: "lexical_expression", split: "An English term borrowed whole: a first release to a few users.", minimal: "Two words, one term." },
    "feature complete": { reason: "lexical_expression", split: "An English term borrowed whole: all the parts of the app are there.", minimal: "Two words, one term." },
    "quiere decir": { reason: "lexical_expression", split: "quiere → wants + decir → to say is false; = means.", minimal: "Two words." },
    "poco a poco": { reason: "lexical_expression", split: "poco → little + a → to + poco → little; = little by little.", minimal: "Three words." },
    "en línea": { reason: "lexical_expression", split: "en → in + línea → line is false; = online.", minimal: "Two words." },
    "fuera de": { reason: "lexical_expression", split: "fuera → outside + de → of; one preposition = outside.", minimal: "Two words." },
    "fecha límite": { reason: "lexical_expression", split: "fecha → date + límite → limit; one term = deadline.", minimal: "Two words." },
    "redes sociales": { reason: "lexical_expression", split: "redes → nets + sociales → social is false; = social media.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious is false; = really?", minimal: "Two words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → made; the fixed reply = deal!", minimal: "Two words." },
    "me encargo": { reason: "grammatical_fusion", split: "me → myself + encargo → I-entrust is false; encargarse = take care of it.", minimal: "Two words." },
    "te encargas": { reason: "grammatical_fusion", split: "te → yourself + encargas → you-entrust is false; encargarse = take care of it.", minimal: "Two words." },
    "fuerte y claro": { reason: "lexical_expression", split: "fuerte → strong, y → and, claro → clear; the fixed reply = loud and clear.", minimal: "Three words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as an opener = honestly, to be honest.", minimal: "Two words." },
    "en la mañana": { reason: "lexical_expression", split: "en → in, la → the, mañana → morning; one time phrase = in the morning.", minimal: "Three words." },
    "y si": { reason: "lexical_expression", split: "y → and + si → if; a suggestion = what if.", minimal: "Two words." },
    "a la mitad": { reason: "lexical_expression", split: "a → to, la → the, mitad → half; = in half.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Tell Sara she's on mute", done: (c) => !!c.s.muteFixed },
    { lt: "Give your update", done: (c) => !!c.s.update && !c.s.updOpen },
    { lt: "Ask for an explanation", done: (c) => !!c.s.clarified },
    { lt: "Say what you think of Pablo's idea", done: (c) => !!c.s.opinion },
    { lt: "Answer who will take the task", done: (c) => !!c.s.ownerDone },
    { lt: "Answer “¿Algún otro asunto?”", done: (c) => !!c.s.aobDone },
  ],

  steps: [
    { id: "mute", done: (c) => !!c.s.muteFixed,
      ask: (c) => {
        c.s.muteAsks = (c.s.muteAsks || 0) + 1;
        if (c.s.muteAsks === 1) { K(c, "sara_joins"); P(c, "no_sound"); return; }
        if (c.s.muteAsks === 2) { K(c, "sara_cant_hear"); return; }
        // nobody tells her: Pablo does
        P(c, "paul_mute"); unmuted(c);
      },
      expects: MUTE_EXPECTS,
      suggest: [{ lt: "Tell Sara she's on mute", hint: "mute" }] },
    { id: "notes", when: (c) => !!c.s.muteFixed && !!c.s.notesTwist && c.s.notesKind === "notes", done: (c) => !!c.s.notesDone,
      ask: (c) => { c.twist("take_notes"); K(c, "notes_ask"); },
      expects: ["can_do", "cant_do", "suggest_other"],
      suggest: [{ lt: "Agree to take notes, or say you can't", hint: "notes" }],
      yes: (c) => notesYes(c), no: (c) => notesNo(c) },
    { id: "update", when: (c) => !!c.s.muteFixed, done: (c) => !!c.s.update,
      ask: (c) => {
        if (!c.s.agendaSaid) { c.s.agendaSaid = true; K(c, "agenda"); K(c, "updates_first"); P(c, "paul_update"); K(c, "upd_you"); return; }
        K(c, "upd_reask");
      },
      expects: UPDATE_EXPECTS,
      suggest: [{ lt: "Give your update", hint: "update", options: "task" }],
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
      suggest: [{ lt: "Ask Pablo to explain", hint: "clarify_beta" }] },
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
      suggest: [{ lt: "Add something, or say that's all", hint: "add" }],
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
      suggest: [{ lt: "Disagree politely with Pablo", hint: "opinion" }, { lt: "Agree with Pablo", hint: "opinion_yes" }],
      yes: (c) => opinionAgree(c),
      no: (c) => { c.s.opinion = "disagree"; } },
    { id: "why", when: (c) => c.s.opinion === "disagree" && !c.s.offlineSaid, done: (c) => !!c.s.whyDone,
      ask: (c) => {
        c.s.whyAsks = (c.s.whyAsks || 0) + 1;
        if (c.s.whyAsks === 1) { P(c, "paul_why"); return; }
        whyClose(c);
      },
      expects: WHY_EXPECTS,
      suggest: [{ lt: "Say why you disagree", hint: "why" }],
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
      suggest: [{ lt: "Say what you think about the deadline", hint: "dl_view" }],
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
      suggest: [{ lt: "Volunteer, or politely say no", hint: "owner" }],
      yes: (c) => takeTask(c), no: (c) => declineTask(c) },
    { id: "aob", when: (c) => !!c.s.ownerDone, done: (c) => !!c.s.aobDone,
      ask: (c) => {
        c.s.lastTerm = "aob";
        if (!c.s.aobAsked) { c.s.aobAsked = true; K(c, "aob_ask"); return; }
        K(c, "aob_reask");
      },
      expects: AOB_EXPECTS,
      suggest: [{ lt: "Say you have nothing else, or bring something up", hint: "aob" }],
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
    // "¡Hola, Sara!" while she is muted: she can't hear it (the mute step asks again)
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
    upd_problem_ctx(c, _sl, sg) { if (!live(c)) return; if (sg.tags.includes("behind")) c.s.saidBehind = true; react(c, "problem"); },
    g_howareyou_bad(c, sl) {
      if (!live(c)) return;
      if (c.step === "update" && !c.s.update) { react(c, "problem"); return; }
      GLOBAL_HANDLERS.g_howareyou_bad(c as any, sl);
    },
    task_ctx(c, sl) { if (!live(c)) return; react(c, c.s.saidBehind ? "behind" : "working", sl.task); },
    when_ans(c) {
      if (!live(c)) return;
      if (!c.s.update) { react(c, "ok"); return; }
      K(c, "when_ok");
    },
    when_ctx(c) { meeting.handlers.when_ans(c, {}, seg("when_ans")); },
    when_not_ctx(c) { if (!live(c)) return; K(c, "when_unsure"); },
    sense_no_ctx(c) { if (!live(c)) return; ack(c); },
    unsure(c) {
      if (!live(c)) return;
      if (c.step === "opinion" && !c.s.opinion) { opinionUnsure(c); return; }
      if (c.step === "why" && !c.s.whyDone) { whyClose(c); return; }
      if (c.step === "dl_view" && !c.s.dlDone) { dlSide(c, "unsure"); return; }
      GLOBAL_HANDLERS.g_dontknow(c as any, {});
    },
    // "No sé." / "No estoy seguro." (the global words): the same as unsure at the opinion questions
    g_dontknow(c) { meeting.handlers.unsure(c, {}, seg("unsure")); },
    // "Bien, gracias." to "¿Cómo vas?" (if the global reading wins): the light update
    g_howareyou_answer(c, sl) {
      if (!live(c)) return;
      if (c.step === "update" && !c.s.update) { react(c, "ok", undefined, undefined, /\b(y tu|tu como|y a ti)\b/.test(fold(c.heard || ""))); return; }
      GLOBAL_HANDLERS.g_howareyou_answer(c as any, sl);
    },
    will_send(c) { if (!live(c)) return; ack(c); },
    cant_send(c) { if (!live(c)) return; K(c, "send_no"); },
    accept_help(c) { if (!live(c)) return; if (c.s.helpOffered) P(c, "paul_talk_later"); else ack(c); },
    // the _ctx answers below are read only at their own question (handled there); these are the fallbacks
    done_ctx(c) { if (!live(c)) return; ack(c); },
    almost_ctx(c) { if (!live(c)) return; ack(c); },
    send_how_ctx(c) { if (!live(c)) return; if (!clarifyLast(c)) ack(c); },
    decline_help_ctx(c) { if (!live(c)) return; ack(c); },
    talk_when_ctx(c) { if (!live(c)) return; ack(c); },

    // --- clarifying ---
    clarify(c) { if (!live(c)) return; if (!clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, {}); },
    word_q(c, sl) { if (!live(c)) return; wordQ(c, sl.term); },
    term_echo_ctx(c, sl) { if (!live(c)) return; wordQ(c, sl.term); },
    // the global "No entiendo" / "¿Qué significa…?": explain the jargon when there is some
    g_dont_understand(c) { if (!live(c)) return; if (!clarifyLast(c)) GLOBAL_HANDLERS.g_dont_understand(c as any, {}); },
    g_meaning(c, sl) {
      if (!live(c)) return;
      const tm = termOf(sl?.w);
      if (tm) { wordQ(c, tm); return; }
      if (sl?.w || !clarifyLast(c)) GLOBAL_HANDLERS.g_meaning(c as any, sl);
    },

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
      // "No estoy de acuerdo, es mucho dinero" before the budget is on the table: nothing to argue about yet
      if (!c.s.budgetSaid) { ack(c); return; }
      if (sg.tags.includes("why")) giveReason(c, sg.tags);
      // otherwise the "why" step asks Pablo's "¿Por qué no?"
    },
    agree(c, _sl, sg) {
      if (!live(c)) return;
      if (c.step === "dl_view" && !c.s.dlDone) { dlFrom(c, "agree", sg.tags); return; }
      if (c.step === "opinion" && !c.s.opinion) { opinionAgree(c); return; }
      // "¿Por qué?" → "Bueno, no me parece mala idea": a change of mind
      if (c.step === "why" && !c.s.whyDone) { opinionAgree(c); return; }
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
      // "¿Y tú?" to "¿Cómo vas?"
      if (c.step === "update" && !c.s.update) { if (once(c, "askedBack")) K(c, "k_good_thanks"); return; }
      ack(c);
    },
    // "¿Quién, yo?": yes, you; then the question again (the step or the open question asks it)
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

    // --- ¿Quién se encarga? ---
    can_do(c) {
      if (!live(c)) return;
      if (c.step === "notes" && !c.s.notesDone) { notesYes(c); return; }
      if (c.step === "owner" && !c.s.ownerDone) { takeTask(c); return; }
      ack(c);
    },
    // "¡Yo!" volunteers; "¿Yo?" asks whether Sofía means the learner
    can_do_ctx(c) {
      if (/\?\s*$/.test(c.heard || "") && !/puedo|lo hago|mero/.test(fold(c.heard || ""))) { meeting.handlers.who_me(c, {}, seg("who_me")); return; }
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
      if (c.step === "notes" && !c.s.notesDone) { notesOther(c, sg.tags.includes("sara") ? "sara" : "paul"); return; }
      if (c.step === "owner" && !c.s.ownerDone) { suggestOther(c, sg.tags.includes("sara") ? "sara" : "paul"); return; }
      ack(c);
    },
    with_help(c) { if (!live(c)) return; if (c.step === "owner" && !c.s.ownerDone) withHelp(c); else ack(c); },

    // --- ¿Algún otro asunto? ---
    aob_wfh(c) { aobTopic(c, "aob_wfh_ok"); },
    aob_lunch(c, _sl, sg) { aobTopic(c, sg?.tags?.includes("where") ? "aob_lunch_where" : "aob_lunch_ans"); },
    // "Mañana no voy a venir." is no vacation: "Nada más ponlo en el calendario."
    aob_vacation(c, _sl, sg) { aobTopic(c, sg?.tags?.includes("away") ? "aob_wfh_ok" : "aob_vacation_ok"); },
    aob_printer(c) { aobTopic(c, "aob_printer_ok", "paul"); },
    aob_other_ctx(c) { aobTopic(c, isQuestion(c) ? "aob_q_ok" : "aob_other_ok"); },

    // --- side questions, goodbyes ---
    q_agenda(c) { if (!live(c)) return; K(c, "agenda_ans"); },
    q_deadline(c) { if (!live(c)) return; K(c, "deadline_ans", { X: c.s.deliv }); },
    q_next(c) { if (!live(c)) return; K(c, "next_meeting_ans"); },
    q_budget(c) { if (!live(c)) return; K(c, "budget_left"); },
    // "¿Cuánto cuesta la fiesta?": all of it, once Pablo has said his idea
    q_cost(c) { if (!live(c)) return; K(c, c.s.budgetSaid ? `clarify_${c.s.proposal}` : "budget_left"); },
    q_launch(c) { if (!live(c)) return; P(c, c.s.jargon === "soft" ? "launch_when_soft" : "launch_when"); },
    bye_all(c) {
      if (!live(c)) return;
      if (c.s.closingSaid) { goodbye(c); return; }
      K(c, "not_yet");
    },
    // "¡Gracias!": answered by whoever it is for; at "¿Algo que agregar?" / "¿Algún otro asunto?" it also
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
      // "Perdón, me tengo que ir.": the learner leaves the meeting early (at "¿Algún otro asunto?" that is
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
    { say: "¡Sara, estás en silencio!", intent: "tell_mute", step: "mute" },
    { say: "Sara, estás muteada", intent: "tell_mute", step: "mute" },
    { say: "Creo que estás en silencio", intent: "tell_mute", step: "mute" },
    { say: "Sara, tienes el micrófono apagado", intent: "tell_mute", step: "mute" },
    { say: "¡Prende tu micrófono!", intent: "tell_mute", step: "mute" },
    { say: "Sara, quítate el mute", intent: "tell_mute", step: "mute" },
    { say: "Sara, no te escuchamos", intent: "tell_mute_ctx", step: "mute" },
    { say: "Sara, no estás en silencio", intent: "not_muted", step: "mute", not: ["tell_mute"] },
    { say: "¡Hola, Sara!", intent: "greet_team", step: "mute", not: ["tell_mute"] },
    { say: "Sí, ya te escuchamos", intent: "hear_yes" },
    { say: "¡Sí, fuerte y claro!", intent: "hear_yes" },
    { say: "No, todavía nada", intent: "hear_no", not: ["hear_yes"] },
    { say: "Te escucho muy bajito", intent: "hear_no", not: ["hear_yes"] },
    // updates
    { say: "Ya terminé el reporte", intent: "upd_done", step: "update", slots: { task: "report" } },
    { say: "Termine el informe", intent: "upd_done", step: "update", slots: { task: "report" } },
    { say: "Estoy trabajando en la presentación", intent: "upd_working", step: "update", slots: { task: "presentation" } },
    { say: "Estoy con el reporte, va a estar listo el viernes", intent: "upd_working", step: "update", slots: { task: "report" } },
    { say: "La página web va a estar lista el viernes", intent: "upd_working", slots: { task: "website" } },
    { say: "Ando con las facturas", intent: "upd_working", step: "update", slots: { task: "invoices" } },
    { say: "Todavía no termino el reporte", intent: "upd_behind", step: "update", not: ["upd_done", "upd_working"] },
    { say: "El reporte no está listo", intent: "upd_behind", step: "update", not: ["upd_done"] },
    { say: "Voy un poco atrasada con el presupuesto", intent: "upd_behind", step: "update" },
    { say: "Todo va bien", intent: "upd_ok", step: "update" },
    { say: "Bien, gracias, ¿y tú?", intent: "upd_ok_ctx", step: "update", not: ["ask_back"] },
    { say: "Ocupadísima, como siempre", intent: "upd_ok_ctx", step: "update" },
    { say: "El reporte", intent: "task_ctx", step: "update", slots: { task: "report" } },
    { say: "Nada, solo el reporte", intent: "task_ctx", step: "update", slots: { task: "report" }, not: ["upd_nothing_ctx"] },
    { say: "Pues nada, la verdad", intent: "upd_nothing_ctx", step: "update", not: ["nothing_more"] },
    { say: "Va a estar listo el viernes", intent: "when_ans" },
    { say: "No estoy trabajando en el reporte", intent: "none", step: "update" },
    // clarifying
    { say: "¿Me lo puedes explicar?", intent: "clarify", step: "clarify" },
    { say: "¿Puedes aclarar eso?", intent: "clarify", step: "clarify" },
    { say: "¿Lo puedes decir más fácil?", intent: "clarify" },
    { say: "Perdón, ¿a qué te refieres?", intent: "clarify" },
    { say: "¿Me lo podría explicar otra vez?", intent: "clarify", step: "clarify" },
    { say: "¿Qué significa go-live?", intent: "word_q", slots: { term: "golive" } },
    { say: "¿Qué quiere decir soft launch?", intent: "word_q", slots: { term: "soft" } },
    { say: "Perdón, ¿qué es QA?", intent: "word_q", slots: { term: "qa" } },
    { say: "¿Qué son los blockers?", intent: "word_q", slots: { term: "blockers" } },
    { say: "¿Qué significa recorrer?", intent: "word_q", slots: { term: "slip" } },
    { say: "¿Qué es una fecha límite?", intent: "word_q", slots: { term: "deadline" } },
    { say: "¿Cuál es la fecha límite?", intent: "q_deadline", not: ["word_q"] },
    { say: "¿Qué significa lo vemos aparte?", intent: "word_q", slots: { term: "offline" } },
    { say: "¿Go-live?", intent: "term_echo_ctx", step: "clarify" },
    { say: "No tengo preguntas", intent: "nothing_more", step: "clarify" },
    { say: "Gracias, Pablo, ya quedó claro", intent: "nothing_more", step: "clarify", not: ["g_thanks"] },
    // adding something
    { say: "Quiero agregar algo", intent: "add_req", step: "add" },
    { say: "¿Puedo añadir algo?", intent: "add_req", step: "add" },
    { say: "Quiero agregar algo: deberíamos probarla en celulares viejos", intent: "add_test", step: "add" },
    { say: "Hay que probar la app en móviles antiguos", intent: "add_test", step: "add" },
    { say: "Yo puedo ayudar con las pruebas", intent: "add_help", step: "add" },
    { say: "Los clientes están preguntando por la fecha del lanzamiento", intent: "add_customers" },
    { say: "Deberíamos pedirles retroalimentación a los usuarios", intent: "add_feedback" },
    { say: "No, es todo de mi parte", intent: "nothing_more", step: "add" },
    { say: "No tengo nada que agregar", intent: "nothing_more", step: "add", not: ["add_req"] },
    { say: "No hay que probarla en celulares viejos", intent: "none", step: "add" },
    // the budget
    { say: "No sé si estoy de acuerdo", intent: "disagree", step: "opinion", not: ["agree", "unsure"] },
    { say: "No estoy muy de acuerdo", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "No estoy de acuerdo con Pablo", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "Entiendo tu punto, pero es mucho dinero", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "Es buena idea, pero es muy arriesgado", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "Con todo respeto, no creo que sea buena idea", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "Estoy de acuerdo con Pablo", intent: "agree", step: "opinion", not: ["disagree"] },
    { say: "¡Buena idea!", intent: "agree", step: "opinion" },
    { say: "Tiene sentido", intent: "agree", step: "opinion" },
    { say: "No es mala idea", intent: "agree", step: "opinion", not: ["disagree"] },
    { say: "Vale, me parece bien", intent: "agree", step: "opinion" },
    { say: "¿Y si lo dividimos a la mitad?", intent: "reason", step: "opinion" },
    { say: "Es muy caro", intent: "reason", step: "why" },
    { say: "Deberíamos guardar algo de dinero para después", intent: "reason", step: "why" },
    { say: "Nuestros clientes no usan mucho las redes sociales", intent: "reason", step: "why" },
    { say: "No estoy segura", intent: "unsure", step: "opinion", not: ["disagree", "agree"] },
    { say: "¿Y tú qué opinas, Sofía?", intent: "ask_back", step: "opinion" },
    // the deadline twist
    { say: "Estoy de acuerdo con Sara", intent: "agree", step: "dl_view" },
    { say: "Creo que Pablo tiene razón", intent: "agree", step: "dl_view" },
    { say: "¿Y si mandamos una versión corta el viernes?", intent: "dl_view", step: "dl_view" },
    { say: "Necesitamos una semana más", intent: "dl_view", step: "dl_view" },
    { say: "El viernes no se puede", intent: "dl_view", step: "dl_view", not: ["agree"] },
    // ¿Quién se encarga?
    { say: "Yo me encargo", intent: "can_do", step: "owner" },
    { say: "Yo lo hago", intent: "can_do", step: "owner" },
    { say: "Claro, yo puedo hacer el manual", intent: "can_do", step: "owner" },
    { say: "Perdón, estoy muy ocupado esta semana", intent: "cant_do", step: "owner", not: ["can_do"] },
    { say: "Esta semana no puedo", intent: "cant_do", step: "owner", not: ["can_do"] },
    { say: "¿Tal vez Pablo puede hacerlo?", intent: "suggest_other", step: "owner" },
    { say: "Puedo hacerlo, pero necesito ayuda", intent: "with_help", step: "owner", not: ["can_do"] },
    { say: "¡Yo!", intent: "can_do_ctx", step: "owner" },
    { say: "¿Quién, yo?", intent: "who_me", step: "owner" },
    // ¿Algún otro asunto?
    { say: "No, nada de mi parte", intent: "nothing_more", step: "aob" },
    { say: "¿Puedo trabajar desde casa el viernes?", intent: "aob_wfh", step: "aob" },
    { say: "¿Puedo hacer home office mañana?", intent: "aob_wfh", step: "aob" },
    { say: "¿Cuándo es la comida del equipo?", intent: "aob_lunch" },
    { say: "La próxima semana estoy de vacaciones", intent: "aob_vacation" },
    { say: "La impresora no funciona otra vez", intent: "aob_printer" },
    { say: "¡Gracias a todos!", intent: "bye_all" },
    { say: "¡Muy buena reunión!", intent: "bye_all" },
    { say: "¿Qué temas hay hoy?", intent: "q_agenda" },
    { say: "¿Cuándo es la próxima junta?", intent: "q_next" },
    // Spain forms
    { say: "¡Que tengáis un buen día!", intent: "bye_all" },
    { say: "Vale, yo me encargo", intent: "can_do", step: "owner" },
    // review: meaning safety (someone else, a refusal, a past, a negated reason, a date where a date wasn't asked)
    { say: "Lo puede hacer Sara", intent: "suggest_other", step: "owner", not: ["can_do", "can_do_ctx"] },
    { say: "Pablo lo puede hacer", intent: "suggest_other", step: "notes", not: ["can_do", "can_do_ctx"] },
    { say: "Yo no, Sara sí", intent: "suggest_other", step: "owner", not: ["can_do"] },
    { say: "No puedo hacer el video", intent: "cant_do", step: "owner", not: ["can_do"], slots: { deliv: "demo_video" } },
    { say: "Prefiero no", intent: "cant_do", step: "notes", not: ["can_do"] },
    { say: "Yo lo hice la última vez", intent: "none", step: "owner" },
    { say: "Nada bien", intent: "upd_problem_ctx", step: "update", not: ["upd_ok_ctx", "upd_nothing_ctx"] },
    { say: "No mandé las facturas", intent: "upd_behind", step: "update", not: ["upd_done"] },
    { say: "Está claro", intent: "nothing_more", step: "clarify", not: ["add_req"] },
    { say: "Estoy de acuerdo, pero es mucho dinero", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "No estoy seguro de estar de acuerdo", intent: "disagree", step: "opinion", not: ["agree"] },
    { say: "No, todavía no entiendo", intent: "clarify", step: "opinion", not: ["g_dontknow", "unsure"] },
    { say: "No es caro", intent: "none", step: "opinion" },
    { say: "No me parece mala idea", intent: "agree", step: "opinion", not: ["disagree"] },
    { say: "Mejor la próxima semana", intent: "dl_view", step: "dl_view", not: ["when_ans", "when_ctx"] },
    { say: "No el viernes, la próxima semana", intent: "dl_view", step: "dl_view" },
    { say: "El viernes no está bien", intent: "dl_view", step: "dl_view", not: ["agree"] },
    { say: "Mañana no voy a estar", intent: "aob_vacation", step: "aob", not: ["when_ans", "when_ctx"] },
    { say: "El viernes", intent: "none", step: "aob" },
    { say: "La impresora ya funciona", intent: "none", step: "aob" },
    { say: "¿A qué hora es la comida?", intent: "aob_lunch", step: "aob", not: ["aob_other_ctx"] },
    { say: "Que les vaya bien", intent: "bye_all" },
    // audit (5 Nov 2026): the learner's own questions, refusals with an apology, someone else for the notes
    { say: "¿Cuándo es el lanzamiento?", intent: "q_launch", step: "clarify", not: ["q_deadline", "word_q"] },
    { say: "¿Cuándo sale la app?", intent: "q_launch", step: "aob", not: ["aob_other_ctx"] },
    { say: "Los clientes quieren saber cuándo sale la app", intent: "add_customers", step: "add", not: ["q_launch"] },
    { say: "¿Cuánto cuesta la fiesta?", intent: "q_cost", step: "opinion" },
    { say: "¿Qué piensa Sara?", intent: "ask_back", step: "opinion" },
    { say: "¿Dónde es la comida?", intent: "aob_lunch", step: "aob" },
    { say: "Mañana tengo cita con el doctor", intent: "aob_vacation", step: "aob" },
    { say: "No puedo, perdón", intent: "cant_do", step: "owner", not: ["can_do"] },
    { say: "Mejor que las tome Pablo", intent: "suggest_other", step: "notes", not: ["can_do", "hear_yes"] },
    { say: "Prefiero que lo haga otra persona", intent: "cant_do", step: "notes", not: ["can_do"] },
    { say: "Claro, en cuanto termine la reunión", intent: "will_send" },
    // not understood
    { say: "Mi perro se comió la impresora", intent: "none" },
    { say: "manual banana presupuesto", intent: "none" },
    { say: "El tren sale a las siete", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: [
      "¡Sara, estás en silencio!", "Sí, ya te escuchamos", "Ya terminé el reporte.", "Claro, se lo mando después de la reunión.", "¿Me lo puedes explicar?", "Sí, gracias.",
      "Quiero agregar algo.", "Deberíamos probarla en celulares viejos.", "No sé si estoy de acuerdo.", "Es muy caro.", "Claro, lo hablamos después.",
      "Yo me encargo.", "No, nada de mi parte.", "¡Gracias a todos!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "short answers", turns: [
      "Sara, micrófono.", "¡Sí!", "Bien, gracias.", "El reporte.", "Para el viernes.", "Perdón, ¿a qué te refieres?", "Gracias, ya quedó claro.", "No.",
      "¡Buena idea!", "¡Yo!", "No.", "¡Adiós!",
    ], expect: { complete: true }, auto: AUTO,
    // "¡Yo!" answers "¿Quién se encarga?": no deadline fight (its "¿Tú qué opinas?") before it
    setup: (s) => { s.dlTwist = false; } },
    { name: "questions first", turns: [
      "Sara, no te escuchamos.", "¡Sí, fuerte y claro!", "¿Qué temas hay hoy?", "Estoy trabajando en la presentación. Va a estar lista el viernes.",
      "¿Qué significa go-live?", "¿Puedo agregar algo?", "Yo puedo ayudar con las pruebas.", "¿A qué te refieres?",
      "Entiendo tu punto, pero es mucho dinero.", "¡Me parece bien!", "¿Tal vez Pablo puede hacerlo?", "¿Puedo trabajar desde casa el viernes?",
      "No, es todo.", "¡Muy buena reunión! ¡Adiós!",
    ], expect: { complete: true }, auto: AUTO,
    // "¿Tal vez Pablo puede hacerlo?" answers "¿Quién se encarga?": no deadline fight before it
    setup: (s) => { s.dlTwist = false; } },
    { name: "thanks, asked back, who me, bare okay", turns: [
      "¡Sara, estás en silencio!", "¡Sí!", "Bien, gracias. ¿Y tú?", "El reporte.", "Para el viernes.", "¿Me lo puedes explicar?",
      "Gracias, Pablo. Ya quedó claro.", "Ok, gracias.", "¡Buena idea!", "¿Quién, yo?", "Claro, yo lo hago.", "Gracias.", "¡Gracias a todos!",
    ], expect: { complete: true }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // the twists on every seed: "¿Puedes tomar notas?" (no: Pablo takes them), then Pablo and Sara disagree about the deadline
    { name: "twists: notes (Pablo takes them), the deadline fight", turns: [
      "¡Sara, estás en silencio!", "Sí, ya te escuchamos.", "Perdón, hoy no puedo tomar notas.", "Estoy trabajando en la página web. Va a estar lista el viernes.",
      "¿Lo puedes decir más fácil?", "Ya está claro.", "No, no tengo nada que agregar.", "No creo que sea buena idea.", "Porque deberíamos guardar algo de dinero para después.",
      "Claro, después de la reunión me parece bien.", "Estoy de acuerdo contigo.", "Con Pablo.", "Yo lo hago.", "No, nada de mi parte.", "¡Gracias a todos!",
    ], expect: { complete: true }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "notes"; s.dlTwist = true; } },
    // the twist on every seed: "¿Le puedes mandar a todos un resumen?" at the end (no: Sofía does it)
    { name: "twist: the summary at the end", turns: [
      "Sara, ¿nos escuchas?", "Sí, perfecto.", "Pues nada, la verdad.", "Perdón, ¿qué significa eso?", "Ok, gracias.",
      "Quiero agregar algo: los clientes están preguntando por la fecha del lanzamiento.", "Tiene sentido.", "Perdón, esta semana no puedo.",
      "¿Cuándo es la comida del equipo?", "No, es todo de mi parte.", "Perdón, hoy no puedo.", "Bueno. ¡Adiós a todos!",
    ], expect: { complete: true }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "summary"; s.dlTwist = false; } },
    // "¿Me lo puedes explicar?" to "¿Le puedes mandar el reporte a todo el equipo…?": Sofía says it simply and the
    // question is open again; "Nada." at "¿Algún otro asunto?" = nothing
    { name: "clarifying the send request", turns: [
      "¡Sara, estás en silencio!", "¡Sí!", "Ya terminé el reporte.", "¿Me lo puedes explicar?", "Ok.", "¿Puedes aclarar eso?",
      "Sí, gracias.", "No, no tengo nada que agregar.", "Estoy de acuerdo con Pablo.", "Yo lo hago.", "Nada.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { sendClarified: true, update: "done", updOpen: false, aobDone: true } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // a light update to "¿En qué estás trabajando?"; "Nada." to "¿Algo que agregar?" = nothing
    { name: "a light update: nothing much", turns: [
      "¡Sara, estás en silencio!", "¡Sí!", "Bien, gracias.", "Nada especial.", "No tengo preguntas.", "No, nada.", "Estoy de acuerdo con Pablo.",
      "Yo lo hago.", "Nada.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { update: "nothing", addDone: true, aobDone: true } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    { name: "problems: no sound, behind, no questions, busy", turns: [
      "¡Hola, Sara!", "¡Sara, estás en silencio!", "No, todavía nada.", "Sí, ahora sí te escuchamos.", "Voy un poco atrasado con el presupuesto.", "La próxima semana.",
      "No tengo preguntas.", "No, no tengo nada que agregar.", "No sé si estoy de acuerdo.", "No sé.", "Claro, lo hablamos después.",
      "Perdón, estoy muy ocupado esta semana.", "La próxima semana estoy de vacaciones.", "No, nada más.", "¡Gracias, Sofía! Nos vemos.",
    ], expect: { complete: true }, auto: AUTO },
    // review: corrections and soft answers record the right thing (a date that won't hold, "más o menos",
    // "de acuerdo, pero…", a lost comma at "¿Con Pablo o con Sara?", someone else takes it)
    { name: "corrections and someone else", turns: [
      "Sara, estás en silencio.", "Te escuchamos, pero muy bajito.", "Ya te escuchamos.", "Voy un poco atrasado con el reporte.", "No va a estar listo el viernes.",
      "¿Me lo puedes explicar?", "Más o menos.", "Ya entendí, gracias.", "Estoy de acuerdo, pero es mucho dinero.", "Claro, lo hablamos después.",
      "Estoy de acuerdo contigo.", "Con Sara no con Pablo.", "No con Sara, con Pablo.", "Sara lo puede hacer.", "No, nada más.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { update: "behind", opinion: "disagree", dlSide: "paul", ownerDone: "sara" } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = true; s.paulHelps = false; } },
    { name: "notes by Sara, someone else takes it", turns: [
      "¡Sara, estás en silencio!", "Sí.", "Lo puede hacer Sara.", "Ya terminé la encuesta.", "No se lo mando, perdón.", "No hay preguntas.", "Está claro.",
      "No me parece mala idea.", "Yo no, Pablo sí.", "No, es todo.", "¡Que les vaya bien!",
    ], expect: { complete: true, state: { notesDone: "sara", ownerDone: "paul", opinion: "agree" } }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "notes"; s.dlTwist = false; } },
    { name: "summary: thanks, then no", turns: [
      "¡Sara, estás en silencio!", "Sí.", "Todo bien.", "Con el presupuesto.", "Para el lunes, no para el viernes.", "No tengo preguntas.", "No.",
      "Es una buena idea.", "Puedo hacerlo el lunes.", "Ok, gracias.", "Gracias.", "Perdón, hoy no se los mando.", "¡Adiós!",
    ], expect: { complete: true, state: { ownerDone: "you", summaryDone: "kate", aobDone: true } }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "summary"; s.dlTwist = false; } },
    // change of mind and side questions: a vague first answer, then the real update; a word question; a split
    { name: "questions and a change of mind", turns: [
      "Sara, tienes el micrófono apagado.", "Sí, mucho mejor.", "Todo va bien, ¿y tú?", "Ando con la encuesta.", "Todavía no sé.",
      "¿Qué es una beta?", "¿Qué quiere decir soft launch?", "¿Qué son los blockers?", "No tengo preguntas.", "¿Puedo añadir algo?", "¿Y si hacemos una encuesta?",
      "¿Y si lo dividimos a la mitad?", "Sí, vamos por un café al rato.", "¿Para cuándo es?", "Puedo hacerlo, pero necesito ayuda.", "La impresora se descompuso.", "No, es todo.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { ownerDone: "you" } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // audit (5 Nov 2026): a plural task that is ready after all, "¿Por correo?", the launch date, "¿Qué piensa Sara?",
    // the cost, a time for the talk, a refusal with "perdón", where the lunch is, a doctor's appointment
    { name: "audit: the learner's own questions", turns: [
      "¡Sara, estás en silencio!", "Sí.", "Estoy trabajando en las facturas.", "Ya están listas.", "¿Por correo?", "Claro.",
      "¿Cuándo es el lanzamiento?", "No tengo preguntas.", "No, nada.", "¿Qué piensa Sara?", "¿Cuánto cuestan los anuncios?",
      "No sé si estoy de acuerdo.", "Es muy caro.", "Mejor mañana.", "No puedo, perdón.", "¿Dónde es la comida?",
      "Mañana tengo cita con el doctor.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { update: "done", task: "invoices", opinion: "disagree", ownerDone: "paul", aobDone: true } }, auto: AUTO,
    setup: (s) => { s.notesTwist = false; s.dlTwist = false; } },
    // audit: "No, gracias." turns Pablo's help down; "¿Por correo?" at the summary request, then yes
    { name: "audit: help declined, the summary by email", turns: [
      "¡Sara, estás en silencio!", "Sí.", "Voy un poco atrasado con el reporte.", "La semana que entra.", "No, gracias.",
      "¿Me lo puedes explicar?", "Ya entendí, gracias.", "No, nada.", "Estoy de acuerdo con Pablo.", "Yo lo hago.", "No, nada más.",
      "¿Por correo?", "Claro, al rato se los mando.", "¡Gracias a todos!",
    ], expect: { complete: true, state: { update: "behind", helpAccepted: false, ownerDone: "you", summaryDone: "you" } }, auto: AUTO,
    setup: (s) => { s.notesTwist = true; s.notesKind = "summary"; s.dlTwist = false; s.paulHelps = true; } },
  ],
};

export default meeting;
