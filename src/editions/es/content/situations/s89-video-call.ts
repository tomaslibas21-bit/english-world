// NEEDS: None. The task entities, the time phrases and the merges are local.
// Song 89 "You're on Mute!" → Puerto Colibrí: "¡Estás en silencio!". The Monday video call of the learner's team at
// Línea Clara: Sofía (the team lead) checks that everyone can hear her ("¿Me escuchan?"), Pablo joins on mute,
// Sofía shares her screen ("Les comparto mi pantalla") and sometimes freezes ("Sofía, te congelaste"), the learner and
// Sara start talking at the same time, the learner gives a short update and asks a question, and the call ends with
// "¿Nos vemos a la misma hora la próxima semana?". All three colleagues use tú (Mexican offices do); the learner says
// ustedes to the whole team.
// Twists (as in English): an echo from the learner's mic, Pablo has to leave early ("tengo otra junta a las once"),
// Sofía's cat Tigre walks over the keyboard, "¡sigues con la cámara prendida!" after the goodbye; any visit: Sofía's
// video freezes, Sara starts her update at the same time.
// Research (2 Nov 2026): in Mexican offices a meeting is "una junta" (twin: reunión), the camera and the mic are
// "prendidos / apagados" (twin: encendidos), people say "estás en silencio", "no se te escucha", "te congelaste",
// "se está cortando", "les comparto mi pantalla", "¿ya ven mi pantalla?", "me vas avisando"; Spanglish ("estás
// muteado", "quítate el mute", "el link") is everyday office talk and is understood here, never said by the cast.

import type { Ctx, EntityDef, Pending, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS, expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Tasks for the learner's update

const TASKS: EntityDef[] = [
  ent("report", "reporte", "report", "m", { forms: ["reportes", "informe", "informes", "reporte mensual", "reporte de ventas", "reporte semanal"], chip: "el reporte" }),
  ent("presentation", "presentación", "presentation", "f", { forms: ["presentaciones", "powerpoint", "power point"], chip: "la presentación" }),
  ent("slides", "diapositiva", "slide", "f", { forms: ["diapositivas", "slides", "laminas", "lamina"], chip: "las diapositivas", attrs: { plural: true } }),
  ent("budget", "presupuesto", "budget", "m", { forms: ["presupuestos"], chip: "el presupuesto" }),
  ent("website", "página | web", "web | page", "f", { pl: "páginas | web", forms: ["pagina", "sitio web", "sitio", "la web", "pagina de internet", "website"], chip: "la página web", attrs: { nat: "website" } }),
  ent("schedule", "calendario", "schedule", "m", { forms: ["cronograma", "calendarios", "plan del proximo mes", "agenda del mes"], chip: "el calendario" }),
  ent("newsletter", "boletín", "newsletter", "m", { forms: ["boletines", "newsletter", "boletin de noticias"], chip: "el boletín" }),
  ent("proposal", "propuesta", "proposal", "f", { forms: ["propuestas", "cotizacion"], chip: "la propuesta" }),
  ent("survey", "encuesta", "survey", "f", { forms: ["encuestas", "cuestionario", "encuesta de clientes"], chip: "la encuesta" }),
  ent("spreadsheet", "hoja | de | cálculo", "sheet | of | calculation", "f", { pl: "hojas | de | cálculo", forms: ["excel", "el excel", "archivo de excel", "hoja de excel", "hojas de calculo"],
    chip: "la hoja de cálculo", attrs: { nat: "spreadsheet", natPl: "spreadsheets" } }),
  ent("numbers", "cifra | de | ventas", "figure | of | sales", "f", { pl: "cifras | de | ventas", forms: ["cifras", "numeros de ventas", "los numeros", "numeros", "cifras de ventas"],
    chip: "las cifras de ventas", attrs: { plural: true, nat: "sales figure", natPl: "sales figures" } }),
  ent("app", "aplicación", "app", "f", { forms: ["app", "aplicaciones", "la app", "aplicacion movil"], chip: "la aplicación" }),
  ent("contract", "contrato", "contract", "m", { forms: ["contratos"], chip: "el contrato" }),
  ent("design", "diseño", "design", "m", { forms: ["disenos", "logo", "logotipo", "nuevo diseno"], chip: "el diseño" }),
  ent("invoices", "factura", "invoice", "f", { forms: ["facturas", "facturacion"], chip: "las facturas", attrs: { plural: true } }),
  ent("training", "plan | de | capacitación", "plan | of | training", "m", { pl: "planes | de | capacitación", forms: ["capacitacion", "plan de entrenamiento", "entrenamiento", "curso de capacitacion"],
    chip: "el plan de capacitación", attrs: { nat: "training plan", natPl: "training plans" } }),
  ent("campaign", "campaña | de | marketing", "campaign | of | marketing", "f", { pl: "campañas | de | marketing", forms: ["campana", "campana de mercadotecnia", "campana publicitaria", "campanas"],
    chip: "la campaña de marketing", attrs: { nat: "marketing campaign", natPl: "marketing campaigns" } }),
];
const byTask = (id: string) => TASKS.find((e) => e.id === id)!;
/** Bind a task; the plural ones (las diapositivas, las facturas, las cifras) need plural agreement. */
const taskVar = (id: string) => ({ id, qty: byTask(id).attrs?.plural ? 2 : 1 });

// ---------------------------------------------------------------------------
// Helpers

const F_USTEDES = "The ustedes form: talking to the whole team (Latin America never uses vosotros).";
const F_SUBJ = "tengas: the subjunctive after ¿crees que…?; English says you'll have.";
const F_EL_DAY = "el + day: Spanish says el viernes where English says (on) Friday.";
const F_ART_WEEK = "la (próxima semana): Spanish uses the article; English has none.";
const F_YA = "ya: now (at last); it marks a change since before.";
const F_KEEP_POSTED = "ir + -ando: keep doing it; me vas avisando = keep me posted.";
const F_JUNTA = "Mexican: una junta = a meeting; elsewhere una reunión.";
const F_AHORITA = "Mexican: ahorita = right now; elsewhere ahora.";

/** What the learner said, lowercase and without accents. */
const heard = (c: Ctx) => (c.heard || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let n = turnIds.get(c); if (n === undefined) { n = ++turnSeq; turnIds.set(c, n); } return `${n}:${c.heard}`; };
const K = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("kate"); c.say(line, vars); };
const P = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("paul"); c.say(line, vars); };
const S = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("sara"); c.say(line, vars); };
/** Sofía's bare "Muy bien." — skipped when someone already reacted to this utterance (one answer can be
 *  split into several segments of the same intent). */
const ack = (c: Ctx) => { if (c.s.__spokeFor === turn(c) && c.heard) return; K(c, "ok"); };
const live = (c: Ctx) => !c.s.ended;
/** True the first time per utterance for this key (several segments may trigger the same reaction). */
const once = (c: Ctx, key: string) => { const k = turn(c); if (c.s["__once_" + key] === k) return false; c.s["__once_" + key] = k; return true; };
/** Checklist items the learner skips by leaving the call early are hidden, not failed. */
const stay = (c: Ctx) => !c.s.leftEarly && !c.s.leaving;
/** The learner says they have to leave the call ("Perdón, me tengo que ir."). */
const leavingNow = (c: Ctx) =>
  /\b(me tengo que|tengo que|necesito|debo)\s+(ir|irme|desconectar|desconectarme|salir|salirme|colgar)\b|\b(ya )?me voy\b/.test(heard(c));
const byePaul = (c: Ctx) => { if (!once(c, "byePaul")) return; K(c, "bye_paul_kate"); P(c, "paul_bye"); };
const camLaugh = (c: Ctx) => { if (once(c, "camLaugh")) S(c, "sara_laugh"); c.end(); };
/** "Adiós, Pablo" while Pablo is leaving early is his goodbye, not the learner's. */
const toPaul = (c: Ctx) => !!c.s.paulLeft && !c.s.closingSaid && /\bpablo\b/.test(heard(c));
/** "Nos vemos después de la llamada", "Hablamos luego": a later talk, not the end of the call. */
const laterTalk = (c: Ctx) => !c.s.closingSaid && !leavingNow(c) &&
  /despues de la (llamada|junta|reunion|videollamada)|hablamos (despues|luego|al rato|mas tarde|ahorita)/.test(heard(c));
/** Sofía is frozen mid-sentence (the freeze twist, before anyone told her). */
const frozen = (c: Ctx) => !!c.s.freeze && !!c.s.screenOk && !!c.s.freezeAsks && !c.s.freezeDone;

/** The whole team says goodbye; the call ends (optionally with the camera twist). */
function goodbye(c: Ctx) {
  if (c.s.ended) return;
  c.s.ended = true;
  if (!c.s.closingSaid) c.s.leftEarly = true; // the checklist hides what was skipped
  c.s.updOpen = false;
  // Pablo isn't on the call any more when he left early
  K(c, c.s.vacation ? "bye_kate_vac" : c.s.away ? "bye_kate_away" : "bye_kate"); if (!c.s.paulLeft) P(c, "paul_bye"); S(c, "sara_bye");
  c.complete();
  if (c.s.camStillOn) {
    c.twist("camera_still_on");
    S(c, "sara_cam_on");
    c.expect({
      id: "cam_still", optional: true, hints: ["oops"], suggest: [{ lt: "React and leave the call", hint: "oops" }],
      on: {
        oops: (cc) => camLaugh(cc), g_bye: (cc) => camLaugh(cc), g_thanks: (cc) => camLaugh(cc), bye_all: (cc) => camLaugh(cc),
        mute_self: (cc) => camLaugh(cc), g_sorry: (cc) => camLaugh(cc), cam_fix_ctx: (cc) => camLaugh(cc),
      },
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
  // "Terminé el reporte y ahora estoy con la presentación": Sofía answers the first part, one question at a time
  if (!once(c, "react")) return;
  if (task) c.s.task = task;
  c.s.update = kind;
  c.s.updOpen = false;
  if (kind === "ok" && !c.s.task) {
    K(c, "upd_ok_resp");
    c.s.updOpen = true;
    c.expect({
      id: "what_task", expects: ["task_ctx", "upd_working", "upd_done", "upd_behind"], hints: ["task"],
      suggest: [{ lt: "Say what you're working on", hint: "task", options: "task" }],
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
      suggest: [{ lt: "Agree to send it", hint: "sure" }],
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
    suggest: [{ lt: "Say when it will be ready", hint: "when" }],
    on: {
      when_ans: (cc) => { cc.s.updOpen = false; K(cc, "when_ok"); afterWhen(cc); },
      g_dontknow: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
      unsure: (cc) => { cc.s.updOpen = false; K(cc, "when_unsure"); afterWhen(cc); },
    },
    ask: (cc) => K(cc, "when_reask", { X }),
  });
}

/** Pablo sometimes offers to help when the learner is behind. */
function afterWhen(c: Ctx) {
  if (c.s.update === "behind" && c.s.paulHelps && !c.s.paulLeft) {
    P(c, "paul_help");
    c.expect({
      id: "help_offer", optional: true, expects: ["accept_help"], hints: ["g_yesno"],
      suggest: [{ lt: "Accept the help", hint: "g_yesno" }],
      yes: (cc) => acceptHelp(cc),
      no: (cc) => P(cc, "paul_ok_short"),
      on: {
        accept_help: (cc) => acceptHelp(cc), g_thanks: (cc) => acceptHelp(cc), next_week_yes: (cc) => acceptHelp(cc),
        // "Sí, nos vemos después de la llamada", "Gracias, hablamos luego": a yes to Pablo, not the end of the call
        g_bye: (cc) => acceptHelp(cc), bye_all: (cc) => acceptHelp(cc),
      },
    });
  }
}

/** Away next week: "¡Disfruta tus vacaciones!" only when the learner said vacaciones (not "no puedo", "de viaje"). */
function markAway(c: Ctx) { if (/vacacion/.test(heard(c))) c.s.vacation = true; else c.s.away = true; }

function acceptHelp(c: Ctx) { if (once(c, "help")) P(c, "paul_talk_later"); }

const AUTO: Record<string, string> = {
  hear: "Sí, te escucho bien.",
  hear2: "Sí, ya te escucho.",
  weekend: "Muy bien, gracias.",
  camera: "¡Ay, perdón! ¿Ya me ven?",
  mute: "¡Pablo, estás en silencio!",
  mute_amb: "Sí, está en silencio.",
  paul_hear: "¡Sí, ya te escuchamos!",
  screen: "Sí, ya la veo.",
  screen2: "Sí, ya se ve.",
  echo: "¡Ay, perdón! ¿Así está mejor?",
  freeze: "Sofía, te congelaste.",
  freeze_q: "Sí, ya te escuchamos.",
  first: "Yo puedo empezar.",
  goahead: "No, ¡tú primero!",
  update: "Terminé el reporte.",
  what_task: "El reporte.",
  send_q: "¡Claro!",
  when_q: "Para el viernes.",
  help_offer: "¡Eso sería genial, gracias!",
  paul_leave: "¡No te preocupes! ¡Adiós, Pablo!",
  questions: "¿Nos puedes mandar las diapositivas?",
  anything_else: "No, es todo.",
  cat: "¡Hola, Tigre!",
  next_week: "¡Perfecto! ¡Adiós a todos!",
  cam_still: "¡Ups! ¡Adiós!",
};

// ---------------------------------------------------------------------------

export const videoCall: SituationDef = {
  id: "s89-video-call",
  song: 89,
  songTitle: "You're on Mute!",
  title: { en: "¡Estás en silencio!", lt: "You're on Mute!" },
  topic: { en: "Una videollamada", lt: "A video call" },
  chapter: 4,
  order: 3,
  location: "phone",
  npc: "kate",
  npcs: ["paul", "sara"],
  mode: "video",
  goal: "Join your team's video call, help your coworkers with the tech, and give a quick update.",
  intro: "Monday, 10 a.m. You join the Línea Clara team's video call from home. Sofía runs the meeting; Pablo and Sara are on the call too. Help with the mics and cameras, say how your work is going, and ask what you need. Your coworkers say tú to you, and you say tú back.",
  entities: { task: TASKS },

  grammar: {
    macros: {
      clit: "(te | los | las | lo | la | les)",
      hearv: "(escucho | escuchamos | oigo | oimos)",
      snd: "(sonido | audio | voz | micro | microfono | mic | conexion | internet | video)",
      listo: "(listo | lista | listos | listas | terminado | terminada | terminados | terminadas | hecho | hecha | hechos | hechas)",
      tdet: "[el | la | los | las | mi | mis | nuestro | nuestra | nuestros | nuestras | este | esta | estos | estas | un | una] [nuevo | nueva | primer | primera]",
      tpost: "[mensual | semanal | final | nuevo | nueva | trimestral | del cliente | para el cliente | de ventas | del mes | de este mes | del proyecto]",
      when_past: "[ayer | la semana pasada | el viernes | esta manana | hoy | ya | el fin de semana]",
      // "ahora estoy trabajando en…", "esta semana terminé…"
      upd_pre: "[ahora | ahorita | esta semana | hoy | la semana pasada | ayer | bueno | pues | entonces | por ahora | de momento]",
      done_v: "(terminé | acabé | entregué | mandé | envié | hice | preparé | cerré | firmé | lancé | publiqué | subí | arreglé | revisé | actualicé | completé | escribí | diseñé)",
      do_v: "(haciendo | preparando | escribiendo | terminando | revisando | actualizando | disenando | armando | planeando | corrigiendo | acabando)",
      mtg: "(junta | reunion | llamada | videollamada)",
      sofia_cut: "(se esta cortando | te estas cortando | se te esta cortando | se te corta | se corta | te cortas | se corto | se cortó)",
    },
    slots: {
      whenr: { pattern: [
        "[para | antes del | antes de | el | a mas tardar el] {day} [en la (manana | tarde | noche) | a mas tardar | temprano | en la manana a mas tardar]",
        "[para] (finales | fin) de (mes | semana | este mes | esta semana | la semana)",
        "(en | dentro de) (unos | un par de | pocos | {number}) (dias | semanas | horas)",
        "[para] (en un rato | hoy | esta tarde | hoy en la tarde | hoy mismo | hoy en la noche | pronto | muy pronto | en unos dias | manana en la manana | manana temprano | la proxima semana | la semana que viene | la semana que entra | la otra semana | esta semana | a mas tardar manana | el fin de semana)",
      ] },
    },
  },

  intents: {
    hear_yes: { patterns: [
      "[si] [ya] @clit @hearv [muy] [bien | perfecto | perfectamente | clarito | claro] [ahora | ya] #h:h_yes",
      "[si] ya @clit @hearv #h:ph_yes",
      "[si] @clit (escuchamos | oimos) [ya] [bien | perfecto | perfectamente] #h:h_morning",
      "[si] fuerte y claro #h:h_loud",
      "[si] @clit @hearv fuerte y claro",
      "[si] (perfectamente | clarisimo | todo bien | todo perfecto | todo claro) [por aqui | de este lado | por aca]",
      "[si] [ya] se (escucha | oye) [muy] (bien | perfecto | perfectamente | claro | clarito | fuerte y claro | mejor) [ahora | ya]",
      "[si] ya se (escucha | oye)",
      "[si] @clit @hearv y @clit (veo | vemos) [bien]",
      "[si] @clit (veo | vemos) y @clit @hearv [bien]",
      // "Te escucho, pero no te veo": a yes to "¿Me escuchan?"
      "[si] @clit @hearv [bien] pero no @clit (veo | vemos) [bien]",
      "[si] (mucho | muchisimo | bastante | un poco | algo) mejor [ahora] #h:h_better",
      "[si] (ya | ahora) (esta | se escucha | se oye) mejor",
      "si asi esta (mejor | bien)",
      "[si] ya (regresaste | volviste | estas de vuelta)",
      "[si] (el | tu) @snd (esta | se escucha | se oye) bien [ahora]",
      "[si] ya funciona", "ahora si", "si ya",
    ] },
    hear_no: { patterns: [
      "[no] no @clit @hearv [nada | bien | muy bien] [todavia] #h:h_cant",
      "[perdon] se (escucha | oye) (muy | un poco | algo | super | demasiado | medio)? (bajito | bajo | bajita) #quiet #h:h_quiet",
      "[perdon] @clit @hearv (muy | un poco | algo | medio)? (bajito | bajo | despacito) #quiet",
      "[perdon] @clit @hearv pero (muy | un poco | algo | medio)? (bajito | bajo | mal | cortado | entrecortado) #quiet",
      "[perdon] @clit @hearv (mal | muy mal | entrecortado | cortado) #quiet",
      "[perdon] se (escucha | oye) (mal | muy mal | cortado | entrecortado | feo | raro | con eco) #quiet",
      "[perdon] @sofia_cut #quiet",
      "[no] no se (escucha | oye) [nada | bien | muy bien] [todavia]",
      "no hay (sonido | audio)",
      "[no] (todavia | aun) (nada | no) #h:ph_no",
      "[no] nada todavia",
      "[no] (todavia | aun) no @clit @hearv [nada]",
      "[no] (todavia | aun) no se (escucha | oye) [nada]",
      "@clit (veo | vemos) pero no @clit @hearv",
      "(puedes | podrias) hablar mas (fuerte | alto)",
      "habla mas (fuerte | alto)",
      "(sube | subele) (el volumen | a tu volumen | el volumen de tu micro)",
      "[no] sigue (igual | bajito | sin sonido | sin audio | mal)",
      "[no] (sigues | sigue) sin escucharse",
      "(no muy bien | mas o menos) #quiet",
      "[perdon] @clit @hearv (un poco | algo | muy | medio)? (mal | raro) #quiet",
      "[perdon] @clit @hearv con (eco | ruido | interferencia) #quiet",
      "[perdon] hay (mucho | un poco de | algo de)? (ruido | eco | interferencia) #quiet",
      "ya no @clit @hearv",
      "[no] (igual | sigue igual | lo mismo | esta igual)",
    ] },
    greet_team: { patterns: [
      "(hola | buenos dias | buen dia | que tal) (a todos | equipo | chicos | todos | a todo el equipo)",
      "(hola | buenos dias | buen dia) a todos [y] (sofia | pablo | sara)",
    ] },
    ask_hear_me: { patterns: [
      "(me escuchan | me escuchas | me oyen | me oyes | me escuchais | me ois) [bien | ahora | todos] #h:q_hear_me",
      "(me ven | me ves | me veis) [bien | todos]",
      "(me escuchas | me oyes | me ves) tu [a mi]",
      "me (escuchan | oyen) y me ven [bien]",
      "(se escucha | funciona | esta prendido | esta encendido) mi (microfono | micro | audio | camara | video)",
      "(estoy | sigo) (en silencio | muteado | muteada)",
    ] },
    cam_fixed: { patterns: [
      "[ay] [perdon] (ya | ahora) me (ven | ves | veis) [bien] #h:cam_see_now",
      "ahora si me (ven | ves)",
      "me (ven | ves | veis) (ahora | ya) [bien]",
      "[ya] la (prendi | encendi | activé | puse) [ya]",
      "ya (esta | quedó) (prendida | encendida | activada)",
      "[ya] (prendi | encendi | activé) (la | mi) camara",
      "[listo] ya (me ven | aparezco)",
    ] },
    better_q: { patterns: [
      "[ay] [perdon] asi (esta | se escucha | se oye) mejor #h:e_sorry",
      "(y ahora | que tal ahora | y asi | que tal asi)",
      "(ya | ahora) se (escucha | oye) mejor",
    ] },
    // a bare "¿Ahora?" right after fixing the mic or the camera
    better_now_ctx: { patterns: ["(ahora | ya)"] },
    cam_fix_ctx: { patterns: [
      "[ay] (perdon | perdona | perdonen | disculpa | disculpen | una disculpa | lo siento | ups) [no me (di | habia dado) cuenta]",
      "[ay] [perdon | perdona | disculpa | disculpen] [ahorita | ya | ahora] (prendo | enciendo | activo | pongo) (la | mi) camara [ahorita | ya]",
      "un (segundo | momento | segundito | momentito) [ya | ahorita] la (prendo | enciendo | activo | pongo)",
      "[ay] (perdon | perdona | disculpa | disculpen) [ahorita | ya] la (prendo | enciendo | activo | pongo)",
      "(ahorita | ahora | ya) la (prendo | enciendo | activo | pongo)",
      "(dejame | dejenme) (prenderla | encenderla | activarla | prender la camara | encender la camara)",
      "un (segundo | momento | segundito | momentito) [y la prendo] #h:cam_second",
      "se me olvidó (prenderla | encenderla | prender la camara | encender la camara | la camara)",
      "no me (di | habia dado) cuenta [perdon]",
      "(listo | ya esta | ya quedó)",
      "(voy | ahi voy) [a prenderla]",
    ] },
    cam_broken: { patterns: [
      "[perdon] mi camara no (funciona | sirve | prende | enciende | esta funcionando | jala) [hoy] #h:cam_broken",
      "[perdon] la camara (de la | del | de mi) (computadora | laptop | compu) no (funciona | sirve | prende | enciende)",
      "[perdon] no (puedo | me deja) (prender | encender | activar) (la | mi) camara",
      "[perdon] no tengo camara [en (esta | mi) (computadora | laptop | compu)]",
      "[perdon] mi (internet | conexion) (esta | anda) (lento | lenta | mal | muy mal | fallando) [hoy] [mejor la dejo apagada]",
      "(prefiero | voy a) (dejar | tener) la camara apagada [hoy]",
      "(hoy | mejor) (sin camara | la dejo apagada)",
      "se me (descompuso | rompió) la camara",
      "no (funciona | sirve | prende | enciende) mi camara",
      "mi camara (esta | anda) (descompuesta | rota | fallando)",
      "[no] prefiero no (prender | encender | activar | poner) (la | mi) camara [hoy]",
      "[no] prefiero no (prenderla | encenderla | activarla | ponerla) [hoy]",
      "(estoy en pijama | no estoy arreglado | no estoy arreglada | no estoy presentable)",
    ] },
    tell_mute: { patterns: [
      "(estas | sigues) en silencio [pablo] #h:m_on_mute",
      "(estas | sigues) (muteado | en mute)",
      "creo que (estas | sigues | esta | sigue) (en silencio | muteado) #h:m_think",
      "(pablo | el) (esta | sigue) (en silencio | muteado)",
      "(dale clic | dale click | haz clic | pica | picale | presiona | aprieta | dale) (al | el | en el) (microfono | micro | boton del microfono | icono del microfono) #h:m_click",
      "(activa | prende | enciende) (tu | el) (microfono | micro | audio) #h:m_unmute",
      "(quitate | quita | quitale) el (mute | silencio)",
      "(tienes que | necesitas) (quitarte | quitar | quitarle) el (mute | silencio)",
      "(desmutea | desmuteate)",
      "(tienes | tiene) (el microfono | el micro | el audio) (apagado | en silencio | desactivado)",
      "tu (microfono | micro) (esta | sigue) (apagado | en silencio | desactivado | en rojo)",
      "revisa tu (microfono | micro | audio)",
      "(necesitas | tienes que) (activar | prender | encender) (tu | el) (microfono | micro)",
      // one turn in two pieces: "Pablo, no te escuchamos, activa tu micrófono"
      "no te (escuchamos | escucho | oimos | oigo) [nada] [pablo] [creo que] (estas en silencio | (activa | prende | enciende) (tu | el) (microfono | micro | audio) | quitate el (mute | silencio) | (tienes | traes) (el microfono | el micro) (apagado | en silencio))",
      "(estas | sigues) en silencio [pablo] (activa | prende | enciende) (tu | el) (microfono | micro | audio)",
    ] },
    tell_mute_ctx: { patterns: [
      "no te (escuchamos | escucho | oimos | oigo) [nada] [pablo] #h:m_cant_hear",
      "no se te (escucha | oye) [nada]",
      "no (escuchamos | escucho) a pablo",
      "(me | nos) (escuchas | oyes)",
      "(estas ahi | sigues ahi)",
      "(tu | el) (micro | microfono | mic)",
    ] },
    // "Pablo, no estás en silencio": without its comma it may be "No, (we can't hear you,) you're on mute" (#amb)
    not_muted: { patterns: [
      "no (estas | esta) (en silencio | muteado) #amb",
      "(pablo | el) no esta (en silencio | muteado)",
      "creo que no (estas | esta) (en silencio | muteado)",
      "(yo | si) [si] (lo | te) (escucho | escuchamos | oigo) [bien] [a pablo]",
      "si se (escucha | oye) pablo",
      "(su | tu) (microfono | micro) no esta apagado",
    ] },
    screen_yes: { patterns: [
      "[si] [ya] la (veo | vemos) [bien | perfecto | perfectamente | clarito | ahora] #h:s_yes",
      "[si] [ya] (vemos | veo) tu pantalla [bien] #h:s_yes_we",
      "[si] [ya] se ve [muy] (bien | perfecto | perfectamente | clarito | claro)",
      "[si] (ya | ahora) se ve",
      "[si] ahora si la (veo | vemos)",
      "[si] [ya] (veo | vemos) (las diapositivas | la presentacion | la pantalla) [bien]",
      "[si] ya aparece",
      "[si] todo (bien | perfecto | claro)",
    ] },
    screen_no: { patterns: [
      "[no] no la (veo | vemos) [todavia | aun] #h:s_no",
      "[no] no (veo | vemos) (nada | tu pantalla | la pantalla | las diapositivas | la presentacion) [todavia | aun]",
      "[no] solo (te | la) (veo | vemos) a (ti | ella) #h:s_face",
      "[no] solo (veo | vemos) (tu cara | tu camara | tu video | tu imagen)",
      "[no] (todavia | aun) (esta | sigue) cargando #h:s_loading",
      "[no] (sigue | esta) cargando",
      "[no] (se ve | esta | la pantalla esta | la pantalla se ve) (negra | en negro | negro | en blanco | blanca | blanco)",
      "[no] (todavia | aun) no se ve [nada]",
      "[no] no se ve [nada] [todavia]",
      "[no] (sigo | seguimos) sin ver (nada | la pantalla | tu pantalla | la presentacion)",
    ] },
    screen_small: { patterns: [
      "se ve (un poco | muy | demasiado | algo | medio)? (chiquito | chico | pequeno | pequenito | chiquita | pequena) #h:s_small",
      "(esta | es) (muy | un poco | demasiado | medio)? (chiquito | chiquita | pequeno | pequena | chico)",
      "no (alcanzo a leer | se alcanza a leer | puedo leer | se lee) [bien] [nada | la letra | los numeros]",
      "la (letra | fuente) (esta | es | se ve) (muy | un poco | demasiado | medio)? (chiquita | pequena | chica)",
      "(puedes | podrias) (hacerle zoom | hacer zoom | agrandarla | agrandarlo | hacerla mas grande | hacerlo mas grande | hacer mas grande la letra)",
      "(hazle | haz) zoom", "mas grande",
    ] },
    tell_freeze: { patterns: [
      "te congelaste [sofia] #h:f_froze",
      "(te quedaste | estas | sigues) (congelada | trabada | pegada)",
      "se te (congeló | trabó) [la imagen | la pantalla | el video]",
      "(te trabaste | se congeló | se trabó) [la imagen | la pantalla | el video | la llamada]",
      "@sofia_cut #h:f_breaking",
      "te perdimos [un (momento | segundo | ratito)] #h:f_lost",
      "se (cortó | fue) [la llamada | la imagen | el video | la senal | la conexion | tu internet]",
      "tu (internet | conexion | senal | wifi) (esta | anda) (fallando | mal | muy mal)",
      "se te fue (el internet | la senal | la conexion)",
      "(desapareciste | te fuiste)",
      "la imagen (esta | se quedó) (congelada | trabada)",
    ] },
    tell_freeze_ctx: { patterns: [
      "(sigues ahi | estas ahi | me escuchas | nos escuchas)",
      "no te (escuchamos | escucho | oimos | oigo) [nada] [sofia]",
    ] },
    volunteer: { patterns: [
      "yo (puedo | podria) empezar #h:go_first",
      "(puedo | podria) empezar yo",
      "empiezo yo #h:ill_start",
      "yo (empiezo | arranco | comienzo) [si quieren]",
      "(arranco | comienzo) yo",
      "si quieren (empiezo yo | yo empiezo | yo voy primero)",
      "yo (voy | paso) primero",
      "yo primero",
      "(va | sale | bueno | ok) yo (empiezo | voy)",
      "(puedo | podria) (empezar | ir primero) [yo]",
      "no me molesta empezar",
      "(me gustaria | quiero) empezar [yo]",
      "yo (quiero | puedo) (empezar | ir primero)",
    ] },
    // a bare "Yo" at "¿Quién empieza?"
    volunteer_ctx: { patterns: ["(yo | yo mero | yo yo)"] },
    // a bare "Yo no" at "¿Quién empieza?" (elsewhere "yo no" is only a no)
    defer_ctx: { patterns: ["yo no [gracias]", "yo no (empiezo | voy primero | primero)"] },
    defer: { patterns: [
      "(empieza | comienza) (tu | sara) [primero] #h:sara_first",
      "que empiece (sara | pablo | ella | el)",
      "[sara] (quieres | quiere) empezar tu",
      "(sara | tu | ella) primero",
      "mejor sara [primero]",
      "mejor (empieza | que empiece) (sara | ella | tu)",
      "no quiero (empezar | ir primero | ser el primero | ser la primera)",
      "prefiero no (empezar | ir primero)",
      "yo no (puedo | quiero) (empezar | ir primero)",
      "yo no (empieza | comienza | que empiece | mejor | mejor que empiece) (tu | sara | ella) [primero] [sara]",
      "prefiero (ir | hablar | empezar) despues",
      "(mejor | yo) (despues | voy despues) [de (sara | ella | ti)]",
      "mejor despues de (sara | ella | ti)",
      "primero las damas",
      "(sara | pablo) puede (empezar | ir primero)",
      "despues de ti",
    ] },
    go_ahead: { patterns: [
      "[no] [no te preocupes] tu primero [sara] #h:no_you_go",
      "[perdon] adelante [sara] #h:sorry_go",
      "[no] (dale | sigue | empieza | habla) tu",
      "[no] adelante tu",
      "no no (adelante | tu primero | dale)",
      "no te preocupes (empieza | sigue | dale) [tu]",
      "(perdon | no) (empieza | sigue | dale)",
    ] },
    thanks_sara: { patterns: ["[ok | va | bueno] gracias sara", "[ok | va | bueno] gracias [sara] entonces (empiezo | empiezo yo | sigo | voy)",
      "[ok | va | bueno] [gracias] [sara] (yo sigo | sigo yo | entonces sigo | entonces yo)"] },
    upd_done: { patterns: [
      "[ya] terminé @tdet {task} @tpost @when_past #h:u_finished",
      "@upd_pre [ya] @done_v @tdet {task} @tpost @when_past",
      "@tdet {task} @tpost ya (esta | estan) @listo",
      "ya (esta | estan) @listo @tdet {task} @tpost",
      "@tdet {task} @tpost (esta | estan) @listo [ya]",
      "ya (tengo | tenemos) (listo | lista | listos | listas) @tdet {task} @tpost",
      "ya (terminé | acabé) con @tdet {task} @tpost",
      "ya (quedó | quedaron) @tdet {task} @tpost",
      "@tdet {task} @tpost ya (quedó | quedaron)",
      "(le | les) (mandé | envié) @tdet {task} @tpost [al cliente | a todos | ayer]",
    ] },
    upd_working: { patterns: [
      "@upd_pre (estoy | sigo | ando) (trabajando | chambeando) (en | con) @tdet {task} @tpost [ahorita | ahora | esta semana | hoy | todavia] #h:u_working",
      "@upd_pre (estoy | sigo | ando) con @tdet {task} @tpost",
      "ya casi (termino | acabo) @tdet {task} @tpost #h:u_almost",
      "casi (termino | acabo | tengo listo | tengo lista) @tdet {task} @tpost",
      "ya mero (termino | acabo) @tdet {task} @tpost",
      "@tdet {task} @tpost ya mero (esta | estan) @listo",
      // "Con el presupuesto." (the answer to "¿En qué estás trabajando?")
      "[ahorita | ahora | esta semana | pues] con @tdet {task} @tpost",
      "@tdet {task} @tpost [ya] casi (esta | estan) @listo",
      "ya casi (esta | estan) @listo @tdet {task} @tpost",
      "(estoy | voy) (a la mitad | a medias) (de | con) @tdet {task} @tpost",
      "@upd_pre (estoy | ando | sigo) @do_v @tdet {task} @tpost",
      "(empecé | comencé) [con | a trabajar en] @tdet {task} @tpost",
      "(voy a terminar | termino | voy a acabar | voy a tener lista | voy a tener listo) @tdet {task} @tpost [para] [el] {day} #h:u_ready",
      "@upd_pre (trabajé | estuve trabajando) en @tdet {task} @tpost",
      "(esta semana | hoy) (estoy | estuve) con @tdet {task} @tpost",
      "@upd_pre (trabajo | estoy) en @tdet {task} @tpost",
      "(me falta | todavia me falta | nada mas me falta | solo me falta) (terminar | acabar | revisar) @tdet {task} @tpost",
    ] },
    upd_behind: { patterns: [
      "(todavia | aun) no (termino | acabo | he terminado | he acabado | empiezo | he empezado | mando | he mandado) @tdet {task} @tpost",
      "no (he terminado | terminé | acabé | he acabado | he empezado | empecé | mandé | he mandado) @tdet {task} @tpost [todavia | aun]",
      "@tdet {task} @tpost (todavia | aun)? no (esta | estan) @listo [todavia | aun]",
      "(voy | estoy | ando) (un poco | algo | muy | medio | bastante)? (atrasado | atrasada | retrasado | retrasada) (con | en) @tdet {task} @tpost #h:u_behind",
      "necesito mas tiempo (para | con) @tdet {task} @tpost",
      "(tengo | estoy teniendo) (problemas | un problema | algunos problemas | dificultades) con @tdet {task} @tpost",
      "se me (complicó | atrasó) @tdet {task} @tpost",
      "voy tarde con @tdet {task} @tpost",
      "(todavia | aun) no (esta | estan) @listo @tdet {task} @tpost",
      "@tdet {task} @tpost (va | van | esta | estan | anda) (un poco | algo | muy | medio | bastante)? (atrasado | atrasada | atrasados | atrasadas | retrasado | retrasada)",
    ] },
    upd_ok: { patterns: [
      "todo (va | esta | sale | anda) (bien | muy bien | perfecto | en orden | segun lo planeado | segun el plan) [hasta ahora | por ahora] #h:u_track",
      "(todo bien | todo en orden | sin problemas | ningun problema | todo tranquilo) [hasta ahora | por ahora | por aqui]",
      "(vamos | voy | va) (bien | a tiempo | en tiempo) [hasta ahora | por ahora]",
    ] },
    upd_nothing: { patterns: [
      "(nada | no mucho | no hay mucho) (nuevo | que reportar | que contar) [esta semana | hoy | de mi parte | por aqui]",
      "sin novedades [de mi parte | por aqui]",
      "nada nuevo [de mi parte | por aqui]",
    ] },
    // "Claro, te lo mando después de la llamada" (the answer to "¿Me mandas el reporte?")
    cant_send: { patterns: [
      "[perdon] no (te | se) (lo | la | los | las) puedo (mandar | enviar | pasar) [hoy | ahorita | ahora | todavia]",
      "[perdon] hoy no (te | se) (lo | la | los | las) puedo (mandar | enviar | pasar)",
      "[perdon] no puedo (mandarlo | mandarla | enviarlo | enviarla | mandarlos | mandarlas | mandartelo | mandartela) [hoy | todavia]",
      "(hoy | ahorita | ahora) no puedo [mandarlo | mandartelo]",
      "no se si (te | se) (lo | la | los | las) (puedo | voy a poder) (mandar | enviar | pasar) [hoy | ahorita]",
      "[no puedo] (todavia | aun) no (esta | estan) @listo",
    ] },
    will_send: { patterns: [
      "[claro | si | por supuesto | va | sale | ok | con gusto] (te | se) (lo | la | los | las) (mando | envio | paso | comparto) [ahorita | despues de la llamada | al rato | en un rato | hoy | luego | saliendo de la llamada | por correo | por el chat]",
      "[si | claro] (saliendo | despues) de la llamada",
      "ya (te | se) (lo | la | los | las) (mandé | envié | pasé)",
      "(al rato | en un rato | ahorita | luego | despues | hoy) (te | se) (lo | la | los | las) (mando | envio | paso)",
      "[si | claro] (en un rato | al rato | hoy mismo | en cuanto pueda | en cuanto termine la llamada)",
      "(te | se) (lo | la | los | las) (mando | paso) por (correo | mail | whatsapp | el chat)",
    ] },
    // "Sí, una pregunta: …"
    have_question: { patterns: ["[si] (tengo | tengo una | una) pregunta [rapida]", "[si] (solo | nada mas) una pregunta", "si una",
      "[si] [no] (solo | nada mas)? una (pregunta | duda) mas", "[si] (puedo | te puedo | les puedo) hacer una pregunta"] },
    task_ctx: { patterns: ["[es] @tdet {task} @tpost", "(mas que nada | sobre todo | principalmente | en | con) @tdet {task} @tpost"] },
    when_ans: { patterns: [
      "[creo que | espero que | probablemente | tal vez | seguramente | ojala] [va a estar (listo | lista | listos | listas) | (lo | la | los | las) (termino | acabo | tengo listo | tengo lista | entrego) | (esta | estara) (listo | lista)] {whenr} #h:w_when",
      "[creo que | espero] (tenerlo | tenerla | terminarlo | terminarla) [listo | lista] {whenr}",
    ] },
    unsure: { patterns: [
      "(todavia | aun) no (estoy seguro | estoy segura | se) #h:w_unsure",
      "(es dificil | no es facil) (decir | saber) [todavia]",
      "[luego | despues | ahorita] (te | les) (aviso | digo | confirmo)",
      "(lo | todavia lo) tengo que (ver | revisar)",
      "depende",
    ] },
    help_ask: { patterns: [
      "(alguien | alguno) me (puede | podria) (ayudar | echar la mano | echar una mano) con @tdet {task} @tpost",
      "necesito (ayuda | una mano) con @tdet {task} @tpost",
      "(alguien | alguno) me (puede | podria) (ayudar | echar la mano | echar una mano)",
      "me (echan | echas) la mano con @tdet {task} @tpost",
    ] },
    accept_help: { patterns: [
      "(eso | esto) (seria | estaria) (genial | increible | buenisimo | perfecto | super | muy bien) [gracias] [pablo]",
      "[si] (me encantaria | me ayudaria mucho | me salvas)",
      "(si | va | sale | claro) (gracias | mil gracias | muchas gracias)",
    ] },
    q_slides: { patterns: [
      "(nos | me) (puedes | podrias | puede | podria) (mandar | enviar | pasar | compartir) (las diapositivas | la presentacion | las slides | el powerpoint | tu presentacion) [despues de la llamada | luego | al rato | por correo | en el chat] #h:q_slides",
      "(puedes | podrias) (mandarnos | mandarme | enviarnos | enviarme | pasarnos | pasarme | compartirnos | compartir) (las diapositivas | la presentacion | las slides | el powerpoint)",
      "(nos | me) (mandas | pasas | compartes | envias) (las diapositivas | la presentacion | las slides | el powerpoint) [despues | luego | al rato | por correo]",
      "(puedo | podemos) tener (las diapositivas | la presentacion | una copia de la presentacion)",
      "(vas a | van a) (compartir | mandar) (las diapositivas | la presentacion)",
      "donde (encuentro | estan | puedo ver) (las diapositivas | la presentacion)",
      "(puedes | podrias) (poner | subir) (las diapositivas | la presentacion) en el chat",
      "(mandanos | mandame | pasanos | pasame) (las diapositivas | la presentacion)",
    ] },
    q_link: { patterns: [
      "(puedes | podrias) (compartir | mandar | pasar | poner) (el link | el enlace | la liga) [en el chat] #h:q_link",
      "(nos | me) (pasas | mandas | compartes | pones) (el link | el enlace | la liga) [en el chat]",
      "donde (esta | encuentro) (el link | el enlace | la liga)",
      "(pon | pasa | comparte | manda) (el link | el enlace | la liga) [en el chat]",
      "(y | me das) (el link | el enlace | la liga)",
    ] },
    q_deadline: { patterns: [
      "cual es la fecha (limite | de entrega | tope) #h:q_deadline",
      "(para cuando | cuando) (es | hay que entregarlo | hay que entregarla | lo necesitas | la necesitas | los necesitas | se entrega)",
      "(cuando | para cuando) (es | vence) (el plazo | la fecha limite | la entrega)",
      "para cuando necesitas @tdet {task} @tpost",
      "cual es el plazo",
      "hasta cuando tengo",
    ] },
    q_next: { patterns: [
      "cuando es la (proxima | siguiente) @mtg",
      "cuando nos (vemos | reunimos) (otra vez | de nuevo)",
      "(es | sera) a la misma hora la (proxima | siguiente | otra) semana",
      "a que hora (es | sera | nos vemos) [la (proxima | siguiente) semana]",
    ] },
    q_back: { patterns: [
      "(puedes | podrias) (regresar | volver) a la (diapositiva | lamina | slide)? anterior #h:q_back",
      "(puedes | podrias) (regresar | volver) una (diapositiva | lamina)",
      "(regresa | vuelve) (una diapositiva | a la anterior)",
      "(puedes | podrias) (ensenarnos | ensenar | mostrar | mostrarnos | poner) (otra vez | de nuevo) (la grafica | el grafico | los numeros | eso | la anterior)",
      "(puedes | podrias) (regresar | volver) a (la grafica | el grafico | los numeros)",
      "(podemos | puedo) ver (otra vez | de nuevo) (la diapositiva anterior | la grafica | el grafico)",
      "(puedes | podrias) (poner | ensenar | mostrar) (otra vez | de nuevo) la (diapositiva | lamina) anterior",
    ] },
    q_record: { patterns: [
      "(se esta | estas | estan) grabando [la @mtg]",
      "(la @mtg) se esta grabando",
      "(nos | me) (puedes | podrias)? (compartir | mandar | pasar) la grabacion",
      "(nos | me) (compartes | mandas | pasas) la grabacion",
      "va a haber grabacion",
    ] },
    no_questions: { patterns: [
      "(ninguna pregunta | sin preguntas | ninguna) [de mi parte | por mi parte | por ahora] #h:q_none",
      "[no] (nada | nada mas) (de mi parte | por mi parte | por ahora)",
      "[no] todo (claro | bien | clarisimo | quedó claro) [de mi parte | por mi parte]",
      "[no] no tengo (preguntas | ninguna pregunta | dudas | ninguna duda) [por ahora]",
      "[no] (ninguna duda | sin dudas)",
      "[no] (es todo | eso es todo) [de mi parte | por mi parte]",
      "por mi parte (todo bien | es todo | nada)",
    ] },
    // #leaving, as the shared "Me tengo que ir" (global.ts): only leaving when nothing but thanks or a goodbye follows,
    // so "Me tengo que ir al trabajo" is no goodbye
    leave: { patterns: [
      "#leaving [perdon] [chicos] me tengo que (ir | desconectar | salir | salir de la llamada | bajar de la llamada) [ya | ahora | ahorita | antes | temprano] [@leaving_why] #h:need_leave",
      "#leaving [perdon] me tengo que (desconectar | ir | salir) [ya] tengo otra @mtg [a {time}] #h:jump_off",
      "[perdon] tengo otra @mtg a {time}",
      "#leaving [perdon] (tengo que | necesito) (irme | desconectarme | salirme | salirme de la llamada | salir de la llamada | dejar la llamada | colgar) [ya | ahora | ahorita | antes | temprano] [@leaving_why]",
      "#leaving [perdon] (tengo que | necesito) (irme | desconectarme | salirme) [ya] tengo otra @mtg [a {time}]",
      "[perdon] (me puedo | puedo) (salir | ir | desconectar) [antes | temprano | ya]",
    ] },
    next_week_yes: { patterns: [
      "[si] (a la misma hora | misma hora) [la (proxima | siguiente | otra) semana]",
      "[si] (perfecto | va | sale | claro | me parece bien | suena bien | vale) nos vemos [la (proxima | siguiente) semana | el (proximo)? lunes]",
      "[si] (ahi | alli) (estaré | nos vemos)",
      "[si] nos vemos (la (proxima | siguiente) semana | el (proximo)? lunes)",
      "[si] hasta el (proximo)? lunes",
      // "me parece bien" is the global yes; these two count only as answers (handler)
      "[si] (suena bien | me late)",
    ] },
    on_vacation: { patterns: [
      "[de hecho | la verdad] la (proxima | siguiente) semana (estoy | voy a estar | estaré) de vacaciones #h:b_vacation",
      "[de hecho | la verdad] (estoy | voy a estar | estaré) de vacaciones la (proxima | siguiente) semana",
      "[de hecho | la verdad] la semana que (viene | entra) (estoy | voy a estar | estaré) de vacaciones",
      "no voy a poder (la proxima semana | el proximo lunes) [estoy de vacaciones]",
      "la (proxima | siguiente) semana no (estoy | voy a estar | puedo) [(estoy | voy a estar) de (vacaciones | viaje)]",
      // no "no" in front: "No me voy de vacaciones", "No estoy de vacaciones" are the opposite
      "(me voy | salgo) de (vacaciones | viaje) [la (proxima | siguiente) semana]",
      "[la proxima semana] (estoy | voy a estar | estaré) de (vacaciones | viaje) [la (proxima | siguiente) semana]",
      "[yo] no voy a estar [la (proxima | siguiente) semana] [(estoy | voy a estar) de (vacaciones | viaje)]",
    ] },
    bye_all: { patterns: [
      "(adios | bye | hasta luego | nos vemos | chao | hasta la proxima) [a todos | chicos | equipo] #h:b_bye",
      "que (tengan | tengas) (buen dia | buena semana | un buen dia | una buena semana | buen lunes)",
      "gracias a todos [adios | bye]",
    ] },
    bye_paul: { patterns: [
      "(adios | bye | nos vemos | cuidate | hasta luego) pablo #h:pl_bye",
      "(no te preocupes | no pasa nada | no hay problema) (adios | bye | nos vemos | cuidate | hasta luego)",
      "(suerte | mucha suerte | que te vaya bien) (en | con) tu @mtg",
      "(suerte | mucha suerte)",
    ] },
    // "No te preocupes" when Pablo has to leave (a bare reassurance elsewhere means nothing here)
    bye_paul_ctx: { patterns: ["(no te preocupes | no pasa nada | no hay problema | claro | sin problema) [pablo]"] },
    hi_tiger: { patterns: ["[hola | hey | ey] (tigre | tigrito | michi | michito | gatito) #h:c_hi"] },
    cute: { patterns: [
      "(que | esta) (bonito | lindo | tierno | precioso | hermoso | chulo) [el gato | tu gato | gatito | michi] #h:c_cute",
      "que (bonito | lindo | tierno | precioso | hermoso) (gato | gatito | michi)",
      "que (gato | gatito | michi) tan (bonito | lindo | tierno | precioso | hermoso)",
      "(me encantan | amo) los gatos",
      "me encanta tu gato",
      "(es | ese es) tu gato",
    ] },
    oops: { patterns: [
      "(que pena | que verguenza | ay no)",
      "gracias por (avisar | avisarme | decirme)",
      "(ya | ahorita) la apago",
      "(jaja | jajaja | ja ja)",
    ] },
    mute_self: { patterns: [
      "[claro] (apago | silencio | desactivo) (el | mi) (microfono | micro | audio) #h:e_mute",
      "[perdon] (soy yo | es mi microfono | era mi microfono)",
      "[ya | listo] (me silencié | me puse en silencio | lo apagué | apagué el microfono | me muteé)",
      "[claro] (me silencio | me pongo en silencio | me muteo)",
      "(me pongo | voy a usar | uso) (audifonos | los audifonos | mis audifonos | cascos)",
    ] },
    weekend_ans_ctx: { patterns: [
      "[estuvo | fue] [muy | super | bien] (bien | padre | padrisimo | increible | tranquilo | relajado | divertido | bonito | genial | excelente | buenisimo | chido | normal | lindo) [gracias] [y (el tuyo | tu | ustedes) | y a ti que tal | que tal el tuyo] #good #h:we_great",
      "(fui | fuimos) (a | al) {w:any} #good",
      "(estuve | estuvimos) en {w:any} #good",
      "(descansé | dormí | cociné | nadé | buceé) [mucho] #good",
      "(lei | vi) {w:any} #good",
      "(nada especial | nada en especial | lo normal | normal | me quedé en casa | no hice nada | no hice mucho) #meh",
      "[estuvo | fue] [muy] (corto | cortisimo | aburrido | pesado | horrible | feo | malo | regular | mas o menos | flojo) [y (el tuyo | tu)] #bad #h:we_short",
      "(me enfermé | estuve enfermo | estuve enferma) [todo el fin (de semana)?] #bad",
      "(muy | super)? (cansado | cansada) #bad",
      "(trabajé | tuve que trabajar) [todo el fin (de semana)?] #bad",
      "llovió [todo el fin (de semana)?] #bad",
      "(no muy bien | no tan bien | mas o menos | regular) [la verdad] [(me enfermé | estuve (enfermo | enferma) | tuve que trabajar | llovió) [todo el fin (de semana)?]] #bad",
    ] },
  },

  lines: {
    open: [
      t("¡Hola | a todos! | ¿Me | escuchan | bien?", "Hi | everyone! | Me | do you hear | well?", "Hi, everyone! Can you all hear me okay?", { flags: { 3: F_USTEDES } }),
      t("¡Buenos días, | equipo! | ¿Todos | me | escuchan?", "Good morning, | team! | All of you | me | hear?", "Morning, team! Can everyone hear me?",
        { flags: { 4: "escuchan: plural, agreeing with todos (all of you)." } }),
      t("¡Hola! | ¿Me | escuchan? | ¿Me | ven?", "Hi! | Me | do you hear? | Me | do you see?", "Hi! Can you hear me? Can you see me?", { flags: { 2: F_USTEDES } }),
    ],
    greet_back: [
      t("¡Hola! | ¿Me | escuchan | bien?", "Hi! | Me | do you hear | well?", "Hi! Can you all hear me okay?", { flags: { 2: F_USTEDES } }),
    ],
    hear_reask: [
      t("¿Me | escuchan | ahora?", "Me | do you hear | now?", "Can you hear me now?", { flags: { 1: F_USTEDES } }),
    ],
    hear_ok: [
      t("¡Perfecto!", "Perfect!", "Great!"),
      t("¡Qué | bien!", "How | good!", "Good."),
    ],
    mic_fix: [
      t("Mmm, | déjenme | revisar | el | micrófono. | ¿Y | ahora?", "Hmm, | let me | check | the | microphone. | And | now?", "Hmm, let me check my mic. How about now?",
        { flags: { 1: "déjenme: let me, said to all of you (ustedes)." } }),
    ],
    quiet_fix: [
      t("¡Ay, | perdón! | ¿Así | está | mejor?", "Oh, | sorry! | Like this | is it | better?", "Oh, sorry! Is this better?"),
    ],
    heard_you: [
      t("¡Sí, | te | escuchamos!", "Yes, | you | we-hear!", "Yes, we can hear you!"),
    ],
    heard_but_cam: [
      t("Sí, | te | escuchamos, | pero | tienes | la | cámara | apagada.", "Yes, | you | we-hear, | but | you-have | the | camera | off.", "Yes, we can hear you, but your camera's off."),
    ],
    two_minutes: [
      t("Démosle | dos | minutitos | más. | Todavía | hay | gente | conectándose.", "Let's give it | two | little minutes | more. | Still | there are | people | connecting.",
        "Let's give it two more minutes. A few people are still joining.", { flags: { 2: "minutitos: minutos with the diminutive -itos, friendly and short." } }),
    ],
    weekend_q: [
      t("Oye, | ¿qué tal | tu | fin de semana?", "Hey, | how was | your | weekend?", "So, how was your weekend?"),
      t("Oye, | ¿cómo | estuvo | tu | fin de semana?", "Hey, | how | was | your | weekend?", "So, how was your weekend?"),
    ],
    weekend_good: [
      t("¡Ay, | qué | bien!", "Oh, | how | good!", "Oh, nice!"),
      t("¡Qué | padre!", "How | cool!", "That sounds great!", { flags: { 1: "Mexican: padre = cool, great (elsewhere genial)." },
        neutral: t("¡Qué | genial!", "How | great!", "That sounds great!") }),
    ],
    weekend_bad: [
      t("¡Ay, | qué | mal! | Bueno, | empieza | una | semana | nueva.", "Oh, | how | bad! | Well, | starts | a | week | new.", "Oh, that's too bad! Well, it's a new week!"),
    ],
    weekend_meh: [
      t("Bueno, | ¡a veces | eso | es | lo mejor!", "Well, | sometimes | that | is | the best!", "Well, sometimes that's the best kind!"),
    ],
    weekend_mine: [
      t("El mío | estuvo | muy | bien, | gracias. | Fuimos | a | la | playa.", "Mine | was | very | good, | thanks. | We-went | to | the | beach.", "Mine was nice, thanks! We went to the beach."),
    ],
    sara_join: [
      t("¡Hola | a todos! | ¡Perdón | por | llegar | tarde!", "Hi | everyone! | Sorry | for | arriving | late!", "Hi, everyone! Sorry I'm late!"),
    ],
    camera_off: [
      t("Oye, | tienes | la | cámara | apagada.", "Hey, | you-have | the | camera | off.", "Oh, your camera's off."),
    ],
    camera_on: [
      t("¡Ahí | estás!", "There | you are!", "There you are!"),
      t("¡Sí! | ¡Ya | te | vemos!", "Yes! | Now | you | we-see!", "Yes! There you are!", { flags: { 1: F_YA } }),
    ],
    camera_broken: [
      t("No te preocupes, | te | escuchamos | bien.", "Don't worry, | you | we-hear | fine.", "No worries, we can hear you."),
    ],
    paul_join: [
      t("¡Ah, | aquí | está | Pablo! | ¡Hola, | Pablo!", "Oh, | here | is | Pablo! | Hi, | Pablo!", "Oh, here's Pablo! Hi, Pablo!"),
    ],
    paul_silent: [
      t("¿Pablo? | Pablo... | no te escuchamos | nada.", "Pablo? | Pablo... | we can't hear you | at all.", "Pablo? Pablo... we can't hear you at all.",
        { flags: { 3: "nada: nothing; after no it means at all (Spanish doubles the negative)." } }),
    ],
    not_muted_resp: [
      t("Mmm, | yo | no lo escucho. | Su | micrófono | está | en | rojo.", "Hmm, | I | don't hear him. | His | microphone | is | in | red.", "Hmm, I can't hear him. His mic is red.",
        { flags: { 3: "en rojo: red, the muted-mic icon." } }),
    ],
    mute_amb: [
      t("Perdón, | ¿Pablo | está | en silencio | o | no?", "Sorry, | Pablo | is | on mute | or | not?", "Sorry, is Pablo on mute or not?"),
    ],
    paul_unmuted: [
      t("¡Ay, | perdón! | ¿Ya | me | escuchan?", "Oh, | sorry! | Now | me | do you hear?", "Oh, sorry! Can you hear me now?", { flags: { 2: F_YA } }),
    ],
    paul_reask: [
      t("¿Ahora | sí | me | escuchan?", "Now | yes | me | do you hear?", "Can you hear me now?", { flags: { 1: "sí: stresses the change: now, for real." } }),
    ],
    paul_ok: [
      t("Perfecto. | ¡Perdón, | chicos!", "Perfect. | Sorry, | guys!", "Great. Sorry about that, guys!"),
      t("¡Qué | bueno! | ¡Perdón, | chicos!", "How | good! | Sorry, | guys!", "Phew! Sorry about that, guys!"),
    ],
    paul_ok_short: [
      t("Está bien, | no hay problema.", "Okay, | no problem.", "Okay, no problem."),
    ],
    paul_now: [
      t("¿Y | ahora?", "And | now?", "What about now?"),
    ],
    sara_mute: [
      t("¡Pablo, | estás | en silencio!", "Pablo, | you're | on mute!", "Pablo, you're on mute!"),
    ],
    screen_share: [
      t("Bueno, | empecemos. | Les | comparto | mi | pantalla.", "Okay, | let's start. | (With) you | I-share | my | screen.", "Okay, let's get started. I'm going to share my screen.",
        { flags: { 2: "les: (with) you all (ustedes)." } }),
    ],
    screen_q: [
      t("¿Todos | ven | mi | pantalla?", "All of you | see | my | screen?", "Can everyone see my screen?", { flags: { 1: F_USTEDES } }),
      t("¿Ya | la | ven?", "Now | it | do you see?", "Can you all see it?", { flags: { 1: "la: it, la pantalla (the screen)." } }),
    ],
    screen_retry: [
      t("Mmm, | déjenme | intentar | otra vez. | ¿Y | ahora?", "Hmm, | let me | try | again. | And | now?", "Hmm, let me try again. How about now?"),
    ],
    screen_reask: [
      t("¿Ahora | sí | la | ven?", "Now | yes | it | do you see?", "Can you see it now?", { flags: { 1: "sí: stresses the change: now, for real.", 2: "la: it, la pantalla (the screen)." } }),
    ],
    screen_give_up: [
      t("Mmm, | qué | raro. | Bueno, | les | mando | la | presentación | después.", "Hmm, | how | strange. | Okay, | (to) you | I-send | the | presentation | later.",
        "Hmm, that's weird. Okay, I'll send you the presentation later."),
    ],
    screen_bigger: [
      t("Claro, | la | hago | más | grande. | ¿Así | está | mejor?", "Sure, | it | I-make | more | big. | Like this | is it | better?", "Sure, let me make it bigger. Is that better?", { flags: { 1: "la: it, la pantalla (the screen)." } }),
    ],
    present: [
      t("Miren: | este | mes | nuestras | ventas | subieron | un | diez | por ciento.", "Look: | this | month | our | sales | went up | — | ten | percent.",
        "So, this month our sales are up ten percent.", { flags: { 6: "un: Spanish puts an article before a percentage; English has no word here." } }),
    ],
    great_work: [
      t("¡Excelente | trabajo, | equipo!", "Excellent | work, | team!", "Great work, everyone!"),
    ],
    freeze_line: [
      t("Miren: | este | mes | nuestras | ventas... | nuestras | ventas...", "Look: | this | month | our | sales... | our | sales...", "So, this month our sales... our sales..."),
    ],
    sara_froze: [
      t("¡Sofía, | te congelaste!", "Sofía, | you froze!", "Sofía, you froze!"),
    ],
    freeze_fix: [
      t("¡Perdón! | Hoy | el | internet | está | horrible. | ¿Ya | me | escuchan?", "Sorry! | Today | the | internet | is | terrible. | Now | me | do you hear?",
        "Sorry about that! My Wi-Fi is terrible today. Can you hear me now?", { flags: { 6: F_YA } }),
    ],
    freeze_missed: [
      t("¡Perdón, | me congelé! | ¿Qué | me | decías?", "Sorry, | I froze! | What | (to) me | were you saying?", "Sorry, I froze! What were you saying?",
        { flags: { 4: "decías: the imperfect, for something in progress (you were saying)." } }),
    ],
    freeze_where: [
      t("A ver, | ¿en qué | me quedé?", "Let's see, | where | was I?", "Okay, where was I?"),
    ],
    sara_echo: [
      t("Mmm, | hay | eco.", "Hmm, | there is | echo.", "Hmm, there's an echo."),
    ],
    echo_you: [
      t("Creo | que | es | tu | micrófono.", "I-think | that | it's | your | microphone.", "I think it's your mic."),
    ],
    echo_mute: [
      t("¿Te | puedes | silenciar | cuando | no estés | hablando?", "Yourself | can you | mute | when | you're not | talking?", "Could you mute yourself when you're not talking?",
        { flags: { 4: "estés: the subjunctive, used after cuando for whenever it happens." } }),
    ],
    echo_q_yes: [
      t("Sí, | creo | que | sí. | ¿Te | puedes | silenciar?", "Yes, | I-think | — | so. | Yourself | can you | mute?", "Yeah, I think so. Could you mute yourself?",
        { flags: { 3: "que: that; English drops it here." } }),
    ],
    echo_ok: [
      t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"),
    ],
    first_ask: [
      t("Ahora, | vamos | con | las | actualizaciones. | ¿Quién | empieza?", "Now, | let's go | with | the | updates. | Who | starts?", "Okay, quick updates. Who wants to go first?"),
      t("Muy | bien, | actualizaciones | rápidas. | ¿Quién | quiere | empezar?", "Very | good, | updates | quick. | Who | wants | to start?", "Okay, quick updates. Who wants to go first?"),
    ],
    first_go: [
      t("¡Perfecto, | adelante!", "Perfect, | go ahead!", "Great, go ahead!"),
    ],
    sara_start: [
      t("Yo | puedo | empezar...", "I | can | start...", "I can start..."),
    ],
    sara_sorry: [
      t("¡Ay, | perdón! | Tú | primero.", "Oh, | sorry! | You | first.", "Oh, sorry! You go ahead."),
    ],
    sara_go: [
      t("¡Adelante!", "Go ahead!", "Go ahead!"),
    ],
    sara_update: [
      t("¡Gracias! | Bueno, | ya | terminé | la | encuesta | de | clientes, | y | ahora | estoy | con | el | reporte.",
        "Thanks! | So, | already | I-finished | the | survey | of | customers, | and | now | I'm | with | the | report.",
        "Thanks! So, I finished the customer survey, and now I'm working on the report.", { flags: { 10: "estar con: to be working on (something)." } }),
    ],
    after_sara: [
      t("¡Gracias, | Sara! | ¿Y | tú?", "Thanks, | Sara! | And | you?", "Thanks, Sara! And you?"),
    ],
    upd_ask: [
      t("¿Y | cómo | vas | con | tu | proyecto?", "And | how | are you going | with | your | project?", "So, how's it going with your project?"),
      t("¿Nos | das | una | actualización | rápida?", "(To) us | you-give | an | update | quick?", "Can you give us a quick update?"),
      t("¿En qué | estás | trabajando | estos | días?", "On what | are you | working | these | days?", "What are you working on these days?"),
    ],
    upd_done_resp: [
      t("¡Bien hecho! | ¿Me | mandas | {X.the} | después de | la | llamada?", "Well done! | (To) me | you-send | {X.the} | after | the | call?",
        "Great job! Could you send me {X.the} after the call?"),
    ],
    upd_work_resp: [
      t("Suena | bien. | ¿Para | cuándo | crees | que | tengas | {X.the} | {listo@X}?", "Sounds | good. | By | when | you-think | that | you'll-have | {X.the} | ready?",
        "Sounds good. When do you think you'll have {X.the} ready?", { flags: { 6: F_SUBJ } }),
    ],
    upd_behind_resp: [
      t("No te preocupes. | ¿Para | cuándo | crees | que | tengas | {X.the} | {listo@X}?", "Don't worry. | By | when | you-think | that | you'll-have | {X.the} | ready?",
        "No worries. When do you think you'll have {X.the} ready?", { flags: { 5: F_SUBJ } }),
    ],
    upd_ok_resp: [
      t("¡Qué | bueno! | ¿Y | en qué | estás | trabajando | ahorita?", "How | good! | And | on what | are you | working | right now?", "Good to hear! What are you working on right now?",
        { flags: { 6: F_AHORITA },
          neutral: t("¡Qué | bueno! | ¿Y | en qué | estás | trabajando | ahora?", "How | good! | And | on what | are you | working | now?", "Good to hear! What are you working on right now?") }),
    ],
    when_reask: [
      t("Entonces, | ¿para | cuándo | crees | que | tengas | {X.the} | {listo@X}?", "So, | by | when | you-think | that | you'll-have | {X.the} | ready?",
        "So, when do you think you'll have {X.the} ready?", { flags: { 5: F_SUBJ } }),
    ],
    what_task_reask: [
      t("Entonces, | ¿en qué | estás | trabajando | ahora?", "So, | on what | are you | working | now?", "So, what are you working on right now?"),
    ],
    upd_nothing_resp: [
      t("Está bien, | no te preocupes.", "Okay, | don't worry.", "Okay, no worries."),
    ],
    when_ok: [
      t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"),
      t("Perfecto. | Me | vas | avisando.", "Perfect. | Me | you-go | letting know.", "Okay, great. Just keep me posted.", { flags: { 2: F_KEEP_POSTED } }),
    ],
    when_unsure: [
      t("No hay problema. | Me | vas | avisando.", "No problem. | Me | you-go | letting know.", "That's okay. Just keep me posted.", { flags: { 2: F_KEEP_POSTED } }),
    ],
    send_yes: [
      t("¡Gracias!", "Thanks!", "Thanks!"),
      t("¡Excelente, | gracias!", "Excellent, | thanks!", "Awesome, thank you!"),
    ],
    send_no: [
      t("No hay problema, | cuando | puedas.", "No problem, | when | you can.", "No problem, whenever you can.", { flags: { 2: "puedas: the subjunctive after cuando (whenever that is)." } }),
    ],
    paul_help: [
      t("Si | quieres, | te | ayudo | con | eso.", "If | you-want, | you | I-help | with | that.", "I can help with that if you want."),
    ],
    paul_talk_later: [
      t("Perfecto, | hablamos | después de | la | llamada.", "Perfect, | we-talk | after | the | call.", "Cool, let's talk after the call."),
    ],
    paul_help_sure: [
      t("Claro, | yo | te | ayudo. | Hablamos | después de | la | llamada.", "Sure, | I | you | I-help. | We-talk | after | the | call.", "Sure, I can help. Let's talk after the call."),
    ],
    paul_leave: [
      t("Perdón, | chicos, | me tengo que ir. | Tengo | otra | junta | a las once.", "Sorry, | guys, | I have to go. | I-have | another | meeting | at eleven.",
        "Sorry, guys, I have to jump off. I have another meeting at eleven.",
        { flags: { 5: F_JUNTA },
          neutral: t("Perdón, | chicos, | me tengo que ir. | Tengo | otra | reunión | a las once.", "Sorry, | guys, | I have to go. | I-have | another | meeting | at eleven.",
            "Sorry, guys, I have to jump off. I have another meeting at eleven.") }),
    ],
    bye_paul_kate: [
      t("¡Adiós, | Pablo!", "Bye, | Pablo!", "Bye, Pablo!"),
    ],
    paul_bye: [
      t("¡Cuídense!", "Take care (all of you)!", "Take care!"),
      t("¡Adiós, | chicos!", "Bye, | guys!", "Bye, guys!"),
    ],
    questions_ask: [
      t("¿Alguien | tiene | alguna | pregunta?", "Someone | has | any | question?", "Does anyone have any questions?"),
      t("¿Alguna | pregunta?", "Any | question?", "Any questions?"),
    ],
    qa_slides: [
      t("¡Claro! | Les | mando | la | presentación | después de | la | llamada.", "Sure! | (To) you | I-send | the | presentation | after | the | call.", "Of course! I'll send you the presentation after the call."),
    ],
    qa_link: [
      t("Claro, | pongo | el | link | en | el | chat.", "Sure, | I-put | the | link | in | the | chat.", "Sure, I'll put the link in the chat."),
    ],
    qa_deadline: [
      t("La | fecha límite | es | el | viernes.", "The | deadline | is | — | Friday.", "The deadline is Friday.", { flags: { 3: F_EL_DAY } }),
    ],
    qa_next: [
      t("A | la | misma | hora, | la | próxima | semana.", "At | the | same | time, | — | next | week.", "Same time next week.", { flags: { 4: F_ART_WEEK } }),
    ],
    qa_back: [
      t("Claro. | Aquí | está.", "Sure. | Here | it is.", "Sure. Here it is."),
    ],
    qa_record: [
      t("Sí, | luego | les | mando | la | grabación.", "Yes, | later | (to) you | I-send | the | recording.", "Yes, I'll send you the recording later."),
    ],
    qa_none: [
      t("Perfecto.", "Perfect.", "Great."),
      t("Muy | bien.", "Very | good.", "Okay, good."),
    ],
    anything_else: [
      t("¿Algo | más?", "Something | else?", "Anything else?"),
    ],
    sara_cat: [
      t("Sofía, | ¿eso | es | un | gato?", "Sofía, | that | is | a | cat?", "Sofía, is that a cat?"),
    ],
    cat_resp: [
      t("¡Ay, | sí! | Es | Tigre. | Le encanta | mi | teclado.", "Oh, | yes! | It's | Tigre. | He loves | my | keyboard.", "Oh, yes! That's Tigre. He loves my keyboard.",
        { flags: { 3: "Tigre: Tiger, the cat's name." } }),
    ],
    cat_hi: [
      t("¡Ja! | ¡Dice | hola!", "Ha! | He-says | hi!", "Ha! He says hi!"),
    ],
    paul_hi_tiger: [
      t("¡Hola, | Tigre!", "Hi, | Tigre!", "Hi, Tigre!"),
    ],
    closing: [
      t("Bueno, | es | todo | por hoy. | ¡Gracias | a todos! | ¿Nos vemos | a | la | misma | hora | la | próxima | semana?",
        "Okay, | it's | all | for today. | Thanks | everyone! | We'll see each other | at | the | same | time | — | next | week?",
        "Okay, that's all for today. Thanks, everyone! Same time next week?", { flags: { 11: F_ART_WEEK } }),
    ],
    vacation_ok: [
      t("¡Ah, | no hay problema! | Te | mando | las | notas.", "Oh, | no problem! | (To) you | I-send | the | notes.", "Oh, no problem! I'll send you the notes."),
    ],
    leave_ok: [
      t("¡No hay problema! | Gracias | por | conectarte.", "No problem! | Thanks | for | joining.", "No problem! Thanks for joining.",
        { flags: { 3: "conectarte: to connect yourself, to join the call." } }),
    ],
    // after the quick update the learner gave on the way out
    leave_update_ok: [
      t("¡Perfecto, | gracias | por | la | actualización!", "Perfect, | thanks | for | the | update!", "Great, thanks for the update!"),
    ],
    leave_first: [
      t("¡Claro! | Pero | antes, | ¿nos | das | una | actualización | rápida?", "Sure! | But | first, | (to) us | you-give | an | update | quick?", "Sure! But first, a quick update?"),
    ],
    bye_kate: [
      t("¡Adiós | a todos!", "Bye | everyone!", "Bye, everyone!"),
      t("¡Nos vemos | la | próxima | semana!", "See you | — | next | week!", "See you next week!", { flags: { 1: F_ART_WEEK } }),
    ],
    bye_kate_away: [
      t("¡Adiós | a todos!", "Bye | everyone!", "Bye, everyone!"),
    ],
    bye_kate_vac: [
      t("¡Disfruta | tus | vacaciones! | ¡Adiós | a todos!", "Enjoy | your | vacation! | Bye | everyone!", "Enjoy your vacation! Bye, everyone!"),
    ],
    sara_bye: [
      t("¡Adiós!", "Bye!", "Bye!"),
      t("¡Hasta luego!", "See you later!", "See you!"),
    ],
    sara_cam_on: [
      t("Este... | ¡sigues | con | la | cámara | prendida!", "Um... | you're still | with | the | camera | on!", "Um... your camera's still on!",
        { flags: { 0: "este: a filler, like um.", 5: "Mexican: prendida = on (prender = to turn on); elsewhere encendida." },
          neutral: t("Este... | ¡sigues | con | la | cámara | encendida!", "Um... | you're still | with | the | camera | on!", "Um... your camera's still on!",
            { flags: { 0: "este: a filler, like um." } }) }),
    ],
    sara_laugh: [
      t("¡Jaja! | No te preocupes. | ¡Adiós!", "Ha ha! | Don't worry. | Bye!", "Ha! No worries. Bye!"),
    ],
    much_better: [
      t("¡Sí, | mucho | mejor!", "Yes, | much | better!", "Yes, much better!"),
    ],
    ok: [
      t("Muy | bien.", "Very | good.", "Okay."),
      t("Claro.", "Sure.", "Sure."),
    ],
  },

  hints: {
    hear: {
      lt: "Say whether you can hear Sofía",
      items: [
        { id: "h_yes", s: t("Sí, | te | escucho | bien.", "Yes, | you | I-hear | well.", "Yes, I can hear you fine.") },
        { id: "h_loud", s: t("¡Sí, | fuerte y claro!", "Yes, | loud and clear!", "Yes, loud and clear!") },
        { id: "h_morning", s: t("¡Buenos días, | Sofía! | Sí, | te | escuchamos.", "Good morning, | Sofía! | Yes, | you | we-hear.", "Morning, Sofía! Yes, we can hear you.") },
        { id: "h_quiet", s: t("Perdón, | se escucha | muy | bajito.", "Sorry, | it sounds | very | quiet.", "Sorry, you sound really quiet."),
          note: "Bajito: quiet, low (bajo with the friendly -ito)." },
        { id: "h_cant", s: t("Perdón, | no te escucho.", "Sorry, | I can't hear you.", "Sorry, I can't hear you.") },
        { id: "q_hear_me", s: t("¿Me | escuchan?", "Me | do you hear?", "Can you hear me?"), note: "Escuchan: to the whole team (ustedes)." },
      ],
    },
    hear_now: {
      lt: "Say whether you can hear now",
      items: [
        { id: "ph_yes", s: t("Sí, | ya | te | escucho.", "Yes, | now | you | I-hear.", "Yes, I can hear you now.", { flags: { 1: F_YA } }) },
        { id: "h_loud", s: t("¡Sí, | fuerte y claro!", "Yes, | loud and clear!", "Yes, loud and clear!") },
        { id: "h_better", s: t("Sí, | mucho | mejor.", "Yes, | much | better.", "Yes, much better.") },
      ],
    },
    camera: {
      lt: "Turn on your camera, or explain",
      items: [
        { id: "cam_see_now", s: t("¡Ay, | perdón! | ¿Ya | me | ven?", "Oh, | sorry! | Now | me | do you see?", "Oh, sorry! Can you see me now?", { flags: { 2: F_YA } }) },
        { id: "cam_broken", s: t("Perdón, | mi | cámara | no funciona.", "Sorry, | my | camera | doesn't work.", "Sorry, my camera isn't working.") },
        { id: "cam_second", s: t("Un | segundo, | por favor.", "One | second, | please.", "One second, please.") },
      ],
    },
    mute: {
      lt: "Tell Pablo he's on mute",
      items: [
        { id: "m_on_mute", s: t("¡Pablo, | estás | en silencio!", "Pablo, | you're | on mute!", "Pablo, you're on mute!") },
        { id: "m_cant_hear", s: t("Pablo, | no te escuchamos.", "Pablo, | we can't hear you.", "Pablo, we can't hear you.") },
        { id: "m_click", s: t("¡Dale | clic | al | micrófono!", "Give it | a click | on the | microphone!", "Click the microphone button!"),
          note: "Mexicans also say “Pícale al micrófono”." },
        { id: "m_think", s: t("Creo | que | estás | en silencio.", "I-think | that | you're | on mute.", "I think you're muted.") },
        { id: "m_unmute", s: t("Pablo, | activa | tu | micrófono.", "Pablo, | turn on | your | microphone.", "Pablo, you need to unmute."),
          note: "In Mexican offices you'll also hear “prende tu micro” and “quítate el mute”." },
      ],
    },
    paul_hear: {
      lt: "Tell Pablo whether you can hear him now",
      items: [
        { id: "ph_yes", s: t("¡Sí, | ya | te | escuchamos!", "Yes, | now | you | we-hear!", "Yes, we can hear you now!", { flags: { 1: F_YA } }) },
        { id: "h_loud", s: t("¡Sí, | fuerte y claro!", "Yes, | loud and clear!", "Yes, loud and clear!") },
        { id: "ph_no", s: t("No, | todavía | nada.", "No, | still | nothing.", "No, still nothing.") },
      ],
    },
    screen: {
      lt: "Say whether you can see the screen",
      items: [
        { id: "s_yes", s: t("Sí, | ya | la | veo.", "Yes, | now | it | I-see.", "Yes, I can see it.", { flags: { 2: "la: it, la pantalla (the screen)." } }) },
        { id: "s_yes_we", s: t("Sí, | vemos | tu | pantalla.", "Yes, | we-see | your | screen.", "Yes, we can see your screen.") },
        { id: "s_face", s: t("No, | solo | te | veo | a ti.", "No, | only | you | I-see | you (again).", "No, I can only see you.",
          { flags: { 4: "a ti: you again, for emphasis; English says it once." } }) },
        { id: "s_loading", s: t("Todavía | está | cargando.", "Still | it's | loading.", "It's still loading.") },
        { id: "s_small", s: t("Se ve | un | poco | chiquito.", "It looks | a | little | small.", "It's a bit small.") },
      ],
    },
    freeze: {
      lt: "Tell Sofía her connection is breaking up",
      items: [
        { id: "f_breaking", s: t("Sofía, | se está cortando.", "Sofía, | it's cutting out.", "Sofía, you're breaking up.") },
        { id: "f_froze", s: t("Perdón, | te congelaste.", "Sorry, | you froze.", "Sorry, you froze.") },
        { id: "f_lost", s: t("Te | perdimos | un | momento.", "You | we-lost | a | moment.", "We lost you for a second.") },
      ],
    },
    echo: {
      lt: "Mute your microphone",
      items: [
        { id: "e_sorry", s: t("¡Ay, | perdón! | ¿Así | está | mejor?", "Oh, | sorry! | Like this | is it | better?", "Oh, sorry! Is that better?") },
        { id: "e_mute", s: t("Claro, | apago | el | micrófono.", "Sure, | I-turn off | the | microphone.", "Sure, I'll mute it.") },
      ],
    },
    first: {
      lt: "Offer to go first, or let Sara start",
      items: [
        { id: "go_first", s: t("Yo | puedo | empezar.", "I | can | start.", "I can go first.") },
        { id: "ill_start", s: t("Empiezo | yo.", "I-start | I.", "I'll start.", { flags: { 1: "yo after the verb stresses it: I'll be the one." } }) },
        { id: "sara_first", s: t("Sara, | empieza | tú.", "Sara, | start | you.", "Sara, you go first.") },
        { id: "sorry_go", s: t("Perdón, | ¡adelante!", "Sorry, | go ahead!", "Sorry, go ahead!") },
        { id: "no_you_go", s: t("No, | ¡tú | primero!", "No, | you | first!", "No, you go ahead!") },
      ],
    },
    goahead: {
      lt: "Thank Sara, or let her go first",
      items: [
        { id: "thanks_sara", s: t("¡Gracias, | Sara!", "Thanks, | Sara!", "Thanks, Sara!") },
        { id: "no_you_go", s: t("No, | ¡tú | primero!", "No, | you | first!", "No, you go ahead!") },
        { id: "sorry_go", s: t("Perdón, | ¡adelante!", "Sorry, | go ahead!", "Sorry, go ahead!") },
      ],
    },
    update: {
      lt: "Say briefly how your work is going", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "u_finished", s: t("Terminé | {X.the}.", "I-finished | {X.the}.", "I finished {X.the}.") },
        { id: "u_working", s: t("Estoy | trabajando | en | {X.the}.", "I'm | working | on | {X.the}.", "I'm working on {X.the}.") },
        { id: "u_almost", s: t("Ya | casi | termino | {X.the}.", "Already | almost | I-finish | {X.the}.", "I'm almost done with {X.the}.",
          { flags: { 2: "Mexico uses the present here: ya casi termino = I'm almost done." } }) },
        { id: "u_ready", s: t("Voy | a | terminar | {X.the} | para | el | viernes.", "I'm going | to | finish | {X.the} | by | — | Friday.", "I'll finish {X.the} by Friday.",
          { flags: { 5: F_EL_DAY } }) },
        { id: "u_behind", s: t("Voy | un | poco | {m:atrasado|f:atrasada} | con | {X.the}.", "I'm going | a | little | behind | with | {X.the}.", "I'm a bit behind with {X.the}.",
          { flags: { 0: "ir + adjective: how you're doing on something (voy atrasado = I'm behind)." } }) },
        { id: "u_track", s: t("Todo | va | bien.", "Everything | is going | well.", "Everything's on track.") },
      ],
    },
    task: {
      lt: "Say what you're working on", slot: "task", examples: ["report", "presentation", "website"],
      items: [
        { id: "t_task", s: t("{X.the}.", "{X.the}.", "{X.the}.") },
        { id: "u_working", s: t("Estoy | trabajando | en | {X.the}.", "I'm | working | on | {X.the}.", "I'm working on {X.the}.") },
      ],
    },
    sure: {
      lt: "Agree",
      items: [
        { id: "sure", s: t("¡Claro!", "Sure!", "Sure!") },
        { id: "sure", s: t("¡Por supuesto!", "Of course!", "Of course!") },
      ],
    },
    when: {
      lt: "Say when it will be ready",
      items: [
        { id: "w_when", s: t("Para | el | viernes.", "By | — | Friday.", "By Friday.", { flags: { 1: F_EL_DAY } }) },
        { id: "w_when", s: t("Mañana | en la mañana.", "Tomorrow | in the morning.", "Tomorrow morning."), note: "Mexico says en la mañana; por la mañana works too." },
        { id: "w_when", s: t("La | próxima | semana.", "— | Next | week.", "Next week.", { flags: { 0: F_ART_WEEK } }) },
        { id: "w_unsure", s: t("Todavía | no estoy | {m:seguro|f:segura}.", "Still | I'm not | sure.", "I'm not sure yet.") },
      ],
    },
    questions: {
      lt: "Ask something, or say you have no questions",
      items: [
        { id: "q_slides", s: t("¿Nos | puedes | mandar | las | diapositivas?", "(To) us | can you | send | the | slides?", "Could you send us the slides?") },
        { id: "q_link", s: t("¿Puedes | compartir | el | link?", "Can you | share | the | link?", "Could you share the link?"), note: "El enlace is the neutral word; el link is what offices say." },
        { id: "q_deadline", s: t("¿Cuál | es | la | fecha límite?", "Which | is | the | deadline?", "When's the deadline?") },
        { id: "q_back", s: t("¿Puedes | regresar | a | la | diapositiva | anterior?", "Can you | go back | to | the | slide | previous?", "Could you go back to the last slide?") },
        { id: "q_none", s: t("Ninguna | pregunta | de mi parte.", "No | question | from me.", "No questions from me.") },
      ],
    },
    no_more: {
      lt: "Say you have no more questions",
      items: [
        { id: "q_none", s: t("No, | es | todo.", "No, | it's | all.", "No, that's all.") },
        { id: "no_thanks", s: t("No, | gracias.", "No, | thanks.", "No, thanks.") },
        { id: "q_none", s: t("Ninguna | pregunta | de mi parte.", "No | question | from me.", "No questions from me.") },
      ],
    },
    leave: {
      lt: "Apologize and leave the call early",
      items: [
        { id: "jump_off", s: t("Perdón, | me tengo que | desconectar. | Tengo | otra | junta | a las once.", "Sorry, | I have to | disconnect. | I-have | another | meeting | at eleven.",
          "Sorry, I have to jump off. I have another meeting at eleven.",
          { flags: { 5: F_JUNTA },
            neutral: t("Perdón, | me tengo que | desconectar. | Tengo | otra | reunión | a las once.", "Sorry, | I have to | disconnect. | I-have | another | meeting | at eleven.",
              "Sorry, I have to jump off. I have another meeting at eleven.") }) },
        { id: "need_leave", s: t("Perdón, | me tengo que ir.", "Sorry, | I have to go.", "Sorry, I need to leave.") },
      ],
    },
    bye: {
      lt: "Say goodbye",
      items: [
        { id: "b_bye", s: t("¡Perfecto! | ¡Adiós | a todos!", "Perfect! | Bye | everyone!", "Sounds good! Bye, everyone!") },
        { id: "b_bye", s: t("¡Nos vemos | la | próxima | semana!", "See you | — | next | week!", "See you next week!", { flags: { 1: F_ART_WEEK } }) },
        { id: "b_vacation", s: t("La | próxima | semana | estoy | de vacaciones.", "— | Next | week | I'm | on vacation.", "I'm on vacation next week.", { flags: { 0: F_ART_WEEK } }) },
      ],
    },
    paul_leave: {
      lt: "Say goodbye to Pablo",
      items: [
        { id: "pl_bye", s: t("¡Adiós, | Pablo!", "Bye, | Pablo!", "Bye, Pablo!") },
        { id: "pl_bye", s: t("¡No te preocupes! | ¡Adiós, | Pablo!", "Don't worry! | Bye, | Pablo!", "No problem! Bye, Pablo!") },
      ],
    },
    weekend: {
      lt: "Say how your weekend was",
      items: [
        { id: "we_great", s: t("¡Muy | bien, | gracias!", "Very | good, | thanks!", "Great, thanks!") },
        { id: "we_great", s: t("Tranquilo. | ¿Y | el tuyo?", "Quiet. | And | yours?", "Pretty quiet. And yours?") },
        { id: "we_short", s: t("¡Muy | corto!", "Very | short!", "Too short!") },
        { id: "we_great", s: t("¡Muy | bien, | gracias! | Fui | a | la | playa.", "Very | good, | thanks! | I-went | to | the | beach.", "Great, thanks! I went to the beach.") },
      ],
    },
    oops: {
      lt: "React and leave the call",
      items: [
        { id: "oops", s: t("¡Ups! | ¡Adiós!", "Oops! | Bye!", "Oops! Bye!") },
        { id: "oops", s: t("¡Qué | pena! | ¡Gracias! | ¡Adiós!", "How | embarrassing! | Thanks! | Bye!", "Oops, thanks! Bye!"),
          note: "In Mexico ¡Qué pena! means how embarrassing." },
      ],
    },
    cat: {
      lt: "Say hi to the cat",
      items: [
        { id: "c_hi", s: t("¡Hola, | Tigre!", "Hi, | Tigre!", "Hi, Tigre!") },
        { id: "c_cute", s: t("¡Qué | bonito!", "How | cute!", "He's so cute!") },
      ],
    },
  },

  tips: {},

  merges: {
    "a todos": { reason: "lexical_expression", split: "a → to + todos → all: the greeting's “everyone” (hola a todos = hi, everyone).", minimal: "Two words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week is one English word: weekend.", minimal: "Three words." },
    "el mío": { reason: "lexical_expression", split: "el → the + mío → mine: Spanish puts an article before the possessive pronoun; English says mine.", minimal: "Two words." },
    "en silencio": { reason: "lexical_expression", split: "en → in + silencio → silence: a microphone “en silencio” is on mute.", minimal: "Two words." },
    "me congelé": { reason: "grammatical_fusion", split: "me → myself + congelé → I froze: the reflexive verb is one English verb (I froze).", minimal: "Two words." },
    "te congelaste": { reason: "grammatical_fusion", split: "te → yourself + congelaste → you froze: the reflexive verb is one English verb (you froze).", minimal: "Two words." },
    "en qué": { reason: "lexical_expression", split: "en → in + qué → what: English says on what / where.", minimal: "Two words." },
    "me quedé": { reason: "grammatical_fusion", split: "me → myself + quedé → I stayed: ¿en qué me quedé? = where was I?", minimal: "Two words." },
    "por ciento": { reason: "lexical_expression", split: "por → for + ciento → hundred is one English word: percent.", minimal: "Two words." },
    "bien hecho": { reason: "lexical_expression", split: "bien → well + hecho → done: the praise well done / great job.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → after + de → of: de has no English word; = after.", minimal: "Two words." },
    "fecha límite": { reason: "lexical_expression", split: "fecha → date + límite → limit is one English word: deadline.", minimal: "Two words." },
    "me tengo que ir": { reason: "lexical_expression", split: "me → myself + tengo → I have + que → that + ir → to go: the fixed I have to go (irse = to leave).", minimal: "Four words." },
    "me tengo que": { reason: "grammatical_fusion", split: "me → myself + tengo → I have + que → that: the me belongs to the verb after it (desconectarme); = I have to.", minimal: "Three words." },
    "a las once": { reason: "grammatical_fusion", split: "a → at + las → the + once → eleven: the clock time (S-TIME) = at eleven.", minimal: "Three words." },
    "por hoy": { reason: "lexical_expression", split: "por → for + hoy → today: = for today.", minimal: "Two words." },
    "de vacaciones": { reason: "lexical_expression", split: "de → of + vacaciones → vacation: estar de vacaciones = to be on vacation.", minimal: "Two words." },
    "de mi parte": { reason: "lexical_expression", split: "de → of + mi → my + parte → part: = from me, on my part.", minimal: "Three words." },
    "en la mañana": { reason: "lexical_expression", split: "en → in + la → the + mañana → morning: Mexico's in the morning; the article lines up with English's.", minimal: "Three words." },
    "se está cortando": { reason: "lexical_expression", split: "se → itself + está → is + cortando → cutting: the phone and video phrase = it's cutting out (you're breaking up).", minimal: "Three words." },
    "fuerte y claro": { reason: "lexical_expression", split: "fuerte → loud + y → and + claro → clear: the fixed reply loud and clear.", minimal: "Three words." },
    "el tuyo": { reason: "lexical_expression", split: "el → the + tuyo → yours: Spanish puts an article before the possessive pronoun; English says yours.", minimal: "Two words." },
    "lo mejor": { reason: "lexical_expression", split: "lo → it (neuter article) + mejor → better: the neuter lo makes a noun of it; = the best.", minimal: "Two words." },
    "a ti": { reason: "lexical_expression", split: "a → to + ti → you: it repeats te (you) for emphasis; English has no second word.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say whether you can hear Sofía", step: "hear" },
    { lt: "Turn on your camera", step: "camera", optional: true, when: stay },
    { lt: "Tell Pablo about his mic", optional: true, when: stay, done: (c) => !!c.s.muteFixed && !!c.s.paulOk },
    { lt: "Say whether you can see the screen", optional: true, when: stay, done: (c) => !!c.s.screenOk },
    { lt: "Tell Sofía about her connection", optional: true, when: (c) => !!c.s.freezeAsks && stay(c), done: (c) => !!c.s.freezeOk },
    { lt: "Say how your work is going", done: (c) => !!c.s.update && !c.s.updOpen },
    { lt: "Say whether you have questions", optional: true, when: stay, done: (c) => !!c.s.questionsDone },
  ],

  steps: [
    { id: "hear", done: (c) => !!c.s.heard,
      ask: (c) => K(c, "hear_reask"),
      expects: ["hear_yes", "hear_no", "greet_team"],
      suggest: [{ lt: "Say whether you can hear her", hint: "hear" }],
      yes: (c) => { c.s.heard = true; K(c, "hear_ok"); },
      no: (c) => { K(c, "mic_fix"); c.hold(); } },
    { id: "weekend", when: (c) => !!c.s.smallTalk && !!c.s.heard, done: (c) => !!c.s.weekendDone,
      ask: (c) => { K(c, "two_minutes"); K(c, "weekend_q"); },
      expects: ["weekend_ans_ctx"],
      suggest: [{ lt: "Say how your weekend was", hint: "weekend" }],
      yes: (c) => { c.s.weekendDone = true; K(c, "weekend_good"); },
      no: (c) => { c.s.weekendDone = true; K(c, "weekend_bad"); },
      help: (c) => { c.s.weekendDone = true; K(c, "ok"); } },
    { id: "camera", when: (c) => !!c.s.camOff && !!c.s.heard, done: (c) => !!c.s.camFixed,
      ask: (c) => K(c, "camera_off"),
      expects: ["cam_fixed", "cam_fix_ctx", "cam_broken", "better_q", "better_now_ctx"],
      suggest: [{ lt: "Apologize and turn on your camera", hint: "camera" }],
      yes: (c) => { c.s.camFixed = true; K(c, "camera_on"); },
      no: (c) => { c.s.camFixed = true; K(c, "camera_broken"); } },
    { id: "mute", when: (c) => !!c.s.heard, done: (c) => !!c.s.muteFixed,
      ask: (c) => {
        c.s.muteAsks = (c.s.muteAsks || 0) + 1;
        if (c.s.muteAsks === 1) { K(c, "paul_join"); K(c, "paul_silent"); return; }
        if (c.s.muteAsks === 2) { K(c, "paul_silent"); return; }
        // Fallback after one turn: Sara says it, Pablo unmutes.
        S(c, "sara_mute"); c.s.muteFixed = true; P(c, "paul_unmuted"); expectPaulHear(c);
      },
      expects: ["tell_mute", "tell_mute_ctx", "not_muted", "hear_no"],
      suggest: [{ lt: "Tell Pablo he's on mute", hint: "mute" }] },
    { id: "screen", when: (c) => !!c.s.muteFixed, done: (c) => !!c.s.screenOk,
      ask: (c) => {
        if (!c.s.sharing) { c.s.sharing = true; K(c, "screen_share"); }
        K(c, "screen_q");
      },
      expects: ["screen_yes", "screen_no", "screen_small"],
      suggest: [{ lt: "Say whether you can see the screen", hint: "screen" }],
      yes: (c) => { c.s.screenOk = true; afterScreen(c); },
      no: (c) => screenNo(c) },
    { id: "echo", when: (c) => !!c.s.echoTwist && !!c.s.screenOk, done: (c) => !!c.s.echoDone,
      ask: (c) => {
        c.s.echoAsks = (c.s.echoAsks || 0) + 1;
        if (c.s.echoAsks === 1) { c.s.echoAsked = true; c.twist("echo"); S(c, "sara_echo"); K(c, "echo_you"); K(c, "echo_mute"); return; }
        c.s.echoDone = true; K(c, "ok");
      },
      expects: ["mute_self", "better_q", "better_now_ctx"],
      suggest: [{ lt: "Mute your microphone", hint: "echo" }],
      yes: (c) => { c.s.echoDone = true; K(c, "echo_ok"); },
      no: (c) => { c.s.echoDone = true; K(c, "ok"); } },
    { id: "freeze", when: (c) => !!c.s.freeze && !!c.s.screenOk, done: (c) => !!c.s.freezeDone,
      ask: (c) => {
        c.s.freezeAsks = (c.s.freezeAsks || 0) + 1;
        if (c.s.freezeAsks === 1) { K(c, "freeze_line"); return; }
        S(c, "sara_froze"); fixFreeze(c);
      },
      expects: ["tell_freeze", "tell_freeze_ctx"],
      suggest: [{ lt: "Tell Sofía her connection is breaking up", hint: "freeze" }, { lt: "Ask her to repeat", hint: "g_clarify" }] },
    { id: "first", when: (c) => !!c.s.screenOk, done: (c) => !!c.s.firstDone || !!c.s.update,
      ask: (c) => K(c, "first_ask"),
      expects: ["volunteer", "volunteer_ctx", "defer", "defer_ctx", "upd_done", "upd_working", "upd_behind", "upd_ok"],
      suggest: [{ lt: "Offer to go first, or let Sara start", hint: "first" }],
      yes: (c) => videoCall.handlers.volunteer(c, {}, { intent: "volunteer", slots: {}, tags: [] }),
      no: (c) => videoCall.handlers.defer(c, {}, { intent: "defer", slots: {}, tags: [] }) },
    { id: "update", when: (c) => !!c.s.screenOk, done: (c) => !!c.s.update,
      ask: (c) => {
        if (c.s.saraDone && !c.s.afterSaraSaid) { c.s.afterSaraSaid = true; K(c, "after_sara"); return; }
        K(c, c.s.goAhead && !c.s.updAsked ? "first_go" : "upd_ask");
        c.s.updAsked = true;
      },
      expects: ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_nothing"],
      suggest: [{ lt: "Say briefly how your work is going", hint: "update", options: "task" }],
      help: (c) => { c.s.update = "nothing"; K(c, "upd_nothing_resp"); } },
    { id: "paul_leave", when: (c) => !!c.s.paulLeaves && !!c.s.update, done: (c) => !!c.s.paulLeft,
      ask: (c) => {
        c.s.paulLeft = true; c.twist("paul_leaves"); c.s.updOpen = false;
        P(c, "paul_leave");
        c.expect({
          id: "paul_leave", optional: true, expects: ["bye_paul", "bye_paul_ctx"], hints: ["paul_leave"],
          suggest: [{ lt: "Say goodbye to Pablo", hint: "paul_leave" }],
          on: {
            bye_paul: (cc) => byePaul(cc),
            bye_paul_ctx: (cc) => byePaul(cc),
            g_bye: (cc) => byePaul(cc),
            bye_all: (cc) => byePaul(cc),
          },
          yes: (cc) => byePaul(cc),
        });
      } },
    { id: "questions", when: (c) => !!c.s.update, done: (c) => !!c.s.questionsDone,
      ask: (c) => { c.s.updOpen = false; K(c, "questions_ask"); },
      expects: ["q_slides", "q_link", "q_deadline", "q_next", "q_back", "q_record", "no_questions", "have_question"],
      suggest: [{ lt: "Ask something, or say you have no questions", hint: "questions" }],
      yes: (c) => { K(c, "ok"); c.hold(); },
      no: (c) => { c.s.questionsDone = true; K(c, "qa_none"); } },
    { id: "cat", when: (c) => !!c.s.catTwist && !!c.s.questionsDone, done: (c) => !!c.s.catDone,
      ask: (c) => {
        c.s.catDone = true; c.twist("tiger");
        S(c, "sara_cat"); K(c, "cat_resp"); if (!c.s.paulLeft) P(c, "paul_hi_tiger");
        c.expect({
          id: "cat", optional: true, expects: ["hi_tiger", "cute"], hints: ["cat"],
          suggest: [{ lt: "Say hi to the cat", hint: "cat" }],
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
      // "Sí, todo bien" when asked about the screen
      if (c.step === "screen" && c.s.sharing && !c.s.screenOk && c.s.heard) { c.s.screenOk = true; afterScreen(c); return; }
      if (!c.s.heard) { c.s.heard = true; K(c, "hear_ok"); return; }
      ack(c);
    },
    hear_no(c, _slots, seg) {
      if (!live(c)) return;
      // "Pablo, no te escuchamos" while Pablo is silent; "Sofía, no te escucho" while she is frozen
      if (c.step === "mute" && !c.s.muteFixed) { videoCall.handlers.tell_mute(c, {}, { intent: "tell_mute", slots: {}, tags: [] }); return; }
      if (c.step === "freeze" && c.s.freeze && !c.s.freezeDone) { fixFreeze(c); return; }
      // "No, todavía no" when asked "¿Ya la ven?" (the screen), not about the sound
      if (c.step === "screen" && c.s.sharing && !c.s.screenOk) { screenNo(c); return; }
      if (c.s.heard && c.s.muteFixed && c.step !== "hear") { K(c, "quiet_fix"); return; }
      K(c, seg.tags.includes("quiet") ? "quiet_fix" : "mic_fix");
      c.expect({
        id: "hear2", expects: ["hear_yes", "hear_no"], hints: ["hear_now"],
        suggest: [{ lt: "Say whether you can hear now", hint: "hear_now" }],
        yes: (cc) => { cc.s.heard = true; K(cc, "hear_ok"); },
        no: (cc) => { cc.s.heard = true; K(cc, "quiet_fix"); },
        on: {
          hear_yes: (cc) => { cc.s.heard = true; K(cc, "hear_ok"); },
          better_q: (cc) => { cc.s.heard = true; K(cc, "hear_ok"); },
          hear_no: (cc) => { cc.s.heard = true; K(cc, "quiet_fix"); },
        },
        ask: (cc) => K(cc, "hear_reask"),
      });
    },
    // "¡Hola a todos!": Sofía greets back and asks again
    greet_team(c) { if (!live(c)) return; if (!c.s.heard && once(c, "greet")) { K(c, "greet_back"); c.hold(); } },
    ask_hear_me(c) {
      if (!live(c)) return;
      if (/silencio|mute/.test(heard(c))) { K(c, "heard_you"); return; }
      if (c.s.camOff && !c.s.camFixed) { K(c, "heard_but_cam"); return; }
      K(c, "heard_you");
      if (!c.s.heard) c.s.heard = true;
    },
    cam_fixed(c) {
      if (!live(c)) return;
      if (!c.s.camOff || c.s.camFixed) { ack(c); return; }
      c.s.camFixed = true; K(c, "camera_on");
    },
    // "Perdón, me tengo que ir.": the "perdón" belongs to the goodbye, the camera stays off
    cam_fix_ctx(c) {
      if (!live(c) || leavingNow(c)) return;
      if (!c.s.camOff || c.s.camFixed) { ack(c); return; }
      c.s.camFixed = true; K(c, "camera_on");
    },
    cam_broken(c) { if (!live(c)) return; c.s.camFixed = true; K(c, "camera_broken"); },
    tell_mute(c) {
      if (!live(c)) return;
      if (c.s.muteFixed) { ack(c); return; }
      c.s.muteFixed = true; c.s.toldPaul = true;
      P(c, "paul_unmuted");
      expectPaulHear(c);
    },
    tell_mute_ctx(c) { videoCall.handlers.tell_mute(c, {}, { intent: "tell_mute", slots: {}, tags: [] }); },
    not_muted(c, _slots, seg) {
      if (!live(c)) return;
      // "No estás en silencio" may have lost its comma ("No, estás en silencio"): Sofía asks which
      if (seg.tags.includes("amb") && !c.s.muteFixed) {
        K(c, "mute_amb");
        c.expect({
          id: "mute_amb", expects: ["tell_mute", "not_muted"], hints: ["mute"],
          suggest: [{ lt: "Tell Pablo he's on mute", hint: "mute" }],
          yes: (cc) => videoCall.handlers.tell_mute(cc, {}, { intent: "tell_mute", slots: {}, tags: [] }),
          no: (cc) => K(cc, "not_muted_resp"),
          on: {
            tell_mute: (cc) => videoCall.handlers.tell_mute(cc, {}, { intent: "tell_mute", slots: {}, tags: [] }),
            not_muted: (cc) => K(cc, "not_muted_resp"),
          },
        });
        return;
      }
      if (c.s.muteFixed) { ack(c); return; }
      K(c, "not_muted_resp");
    },
    screen_yes(c) {
      if (!live(c)) return;
      if (c.s.screenOk || !c.s.sharing) { ack(c); return; }
      c.s.screenOk = true; afterScreen(c);
    },
    screen_no(c) {
      if (!live(c)) return;
      if (!c.s.sharing || c.s.screenOk) { ack(c); return; }
      screenNo(c);
    },
    screen_small(c) {
      if (!live(c)) return;
      if (!c.s.sharing) { ack(c); return; }
      K(c, "screen_bigger");
      if (!c.s.screenOk) expectScreen2(c);
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
          suggest: [{ lt: "Thank Sara, or let her go first", hint: "goahead" }],
          yes: (cc) => goOn(cc),
          no: (cc) => { saraGoes(cc); },
          on: {
            go_ahead: (cc) => saraGoes(cc),
            defer: (cc) => saraGoes(cc),
            thanks_sara: (cc) => goOn(cc),
            g_thanks: (cc) => goOn(cc),
            volunteer: (cc) => goOn(cc),
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
    // "Yo no, empieza tú": the bare "yo" is no volunteer
    volunteer_ctx(c) { if (/\byo no\b/.test(heard(c))) return; videoCall.handlers.volunteer(c, {}, { intent: "volunteer", slots: {}, tags: [] }); },
    defer(c) { if (!live(c)) return; c.s.firstDone = true; saraGoes(c); },
    defer_ctx(c) { videoCall.handlers.defer(c, {}, { intent: "defer", slots: {}, tags: [] }); },
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
    // "Todavía no está listo" outside the send question has nothing to answer
    cant_send(c) { if (!live(c)) return; if (c.s.update === "done") K(c, "send_no"); else ack(c); },
    better_now_ctx(c) { videoCall.handlers.better_q(c, {}, { intent: "better_q", slots: {}, tags: [] }); },
    // "Sí, una pregunta: …" — the question itself usually follows in the same breath
    have_question(c) { if (!live(c)) return; if (c.step === "questions") { ack(c); c.hold(); } else ack(c); },
    leave(c) {
      // once per turn: "Perdón, me tengo que ir. ¡Adiós a todos!" is one leaving (g_bye and bye_all come here too)
      if (!live(c) || !once(c, "leave")) return;
      // Sofía is frozen and missed it: she comes back and asks; the learner says it again
      if (frozen(c)) { c.s.freezeDone = true; c.twist("froze"); K(c, "freeze_missed"); c.hold(); return; }
      c.s.heard = true;
      if (!c.s.update) {
        c.s.leaving = true;
        K(c, "leave_first");
        c.expect({
          id: "update", expects: ["upd_done", "upd_working", "upd_behind", "upd_ok", "upd_nothing"], hints: ["update"],
          suggest: [{ lt: "Say briefly how your work is going", hint: "update", options: "task" }],
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
    next_week_yes(c) {
      if (!live(c)) return;
      if (c.s.closingSaid) { goodbye(c); return; }
      // "¿Misma hora la próxima semana?" before the end gets the answer; a bare "suena bien" is just a nod
      if (/semana|lunes|misma hora/.test(heard(c))) K(c, "qa_next"); else ack(c);
    },
    on_vacation(c) { if (!live(c)) return; markAway(c); K(c, "vacation_ok"); },
    bye_all(c) {
      if (!live(c)) return;
      if (toPaul(c)) { byePaul(c); return; }
      if (laterTalk(c)) { ack(c); return; }
      if (!c.s.update) { videoCall.handlers.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); return; }
      goodbye(c);
    },
    bye_paul(c) { if (!live(c)) return; if (c.s.paulLeft) byePaul(c); else ack(c); },
    bye_paul_ctx(c) { if (!live(c)) return; if (c.s.paulLeft) byePaul(c); else ack(c); },
    hi_tiger(c) { if (!live(c)) return; if (c.s.catDone) K(c, "cat_hi"); else ack(c); },
    cute(c) { if (!live(c)) return; if (c.s.catDone) K(c, "cat_hi"); else ack(c); },
    oops(c) { if (!live(c)) return; ack(c); },
    mute_self(c) {
      if (!live(c)) return;
      // "¿Es mi micrófono?" asks; it doesn't mute anything yet
      if (/\?/.test(c.heard) && !c.s.echoDone && once(c, "echoQ")) { K(c, "echo_q_yes"); c.hold(); return; }
      c.s.echoDone = true; K(c, "echo_ok");
    },
    weekend_ans_ctx(c, _slots, seg) {
      if (!live(c) || !once(c, "weekend")) return;
      c.s.weekendDone = true;
      K(c, seg.tags.includes("bad") ? "weekend_bad" : seg.tags.includes("meh") ? "weekend_meh" : "weekend_good");
      if (/\b(tuyo|tu|ti|ustedes)\b/.test(heard(c))) K(c, "weekend_mine");
      if (c.s.saraLate && !c.s.saraJoined) { c.s.saraJoined = true; S(c, "sara_join"); }
    },
    g_repeat(c) {
      // "¿Perdón?" while Sofía is frozen = telling her about it
      if (c.step === "freeze" && c.s.freeze && !c.s.freezeDone) { fixFreeze(c); return; }
      // a bare "¡Ay, perdón!" (no question mark) when told the camera is off: the learner turns it on
      if (c.step === "camera" && c.s.camOff && !c.s.camFixed && !/\?/.test(c.heard) && /^\W*(ay\W+)?(perdon|perdona|perdonen|disculpa|disculpen)\W*$/.test(heard(c))) {
        videoCall.handlers.cam_fix_ctx(c, {}, { intent: "cam_fix_ctx", slots: {}, tags: [] }); return;
      }
      GLOBAL_HANDLERS.g_repeat(c as any, {});
    },
    g_hello(c) {
      // "¿Hola? ¿Sofía?" while she is frozen
      if (c.step === "freeze" && c.s.freeze && !c.s.freezeDone) { fixFreeze(c); return; }
      GLOBAL_HANDLERS.g_hello(c as any, {});
    },
    g_sorry(c) {
      if (!live(c)) return;
      if (c.step === "camera" && c.s.camOff && !c.s.camFixed) { videoCall.handlers.cam_fix_ctx(c, {}, { intent: "cam_fix_ctx", slots: {}, tags: [] }); return; }
      if (c.step === "echo" && !c.s.echoDone) { videoCall.handlers.mute_self(c, {}, { intent: "mute_self", slots: {}, tags: [] }); return; }
      GLOBAL_HANDLERS.g_sorry(c as any, {});
    },
    g_wait(c) {
      if (c.step === "camera" && c.s.camOff && !c.s.camFixed) { videoCall.handlers.cam_fix_ctx(c, {}, { intent: "cam_fix_ctx", slots: {}, tags: [] }); return; }
      GLOBAL_HANDLERS.g_wait(c as any, {});
    },
    g_bye(c, _slots, seg) {
      if (!live(c)) return;
      if (toPaul(c)) { byePaul(c); return; }
      if (laterTalk(c)) { ack(c); return; }
      if (!c.s.update) { videoCall.handlers.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); return; }
      // "Luego les hablo" before the end of the meeting: Sofía answers it like "Me tengo que ir"
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
      suggest: [{ lt: "Agree and say goodbye", hint: "bye" }],
      on: {
        next_week_yes: (cc) => goodbye(cc),
        bye_all: (cc) => goodbye(cc),
        g_bye: (cc) => goodbye(cc),
        g_thanks: (cc) => goodbye(cc),
        on_vacation: (cc) => { markAway(cc); K(cc, "vacation_ok"); goodbye(cc); },
        // "¿A qué hora?": answer it, then the goodbye is still open
        q_next: (cc) => { K(cc, "qa_next"); cc.expect(closing); },
        // "¿Cómo estás?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { K(cc, "g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => goodbye(cc),
      no: (cc) => goodbye(cc),
    };
    c.expect(closing);
  },

  tests: [
    // every hint construction
    { say: "Sí, te escucho bien.", intent: "hear_yes", step: "hear" },
    { say: "¡Sí, fuerte y claro!", intent: "hear_yes", step: "hear" },
    { say: "¡Buenos días, Sofía! Sí, te escuchamos.", intent: "hear_yes", step: "hear" },
    { say: "Perdón, se escucha muy bajito.", intent: "hear_no", step: "hear" },
    { say: "Perdón, no te escucho.", intent: "hear_no", step: "hear", not: ["hear_yes"] },
    { say: "¿Me escuchan?", intent: "ask_hear_me" },
    { say: "Sí, mucho mejor.", intent: "hear_yes" },
    { say: "¡Ay, perdón! ¿Ya me ven?", intent: "cam_fixed", step: "camera" },
    { say: "Perdón, mi cámara no funciona.", intent: "cam_broken", step: "camera" },
    { say: "Un segundo, por favor.", intent: "cam_fix_ctx", step: "camera" },
    { say: "¡Pablo, estás en silencio!", intent: "tell_mute", step: "mute" },
    { say: "Pablo, no te escuchamos.", intent: "tell_mute_ctx", step: "mute" },
    { say: "¡Dale clic al micrófono!", intent: "tell_mute", step: "mute" },
    { say: "Creo que estás en silencio.", intent: "tell_mute", step: "mute" },
    { say: "Pablo, activa tu micrófono.", intent: "tell_mute", step: "mute" },
    { say: "No, todavía nada.", intent: "hear_no" },
    { say: "Sí, ya la veo.", intent: "screen_yes", step: "screen" },
    { say: "Sí, vemos tu pantalla.", intent: "screen_yes", step: "screen" },
    { say: "No, solo te veo a ti.", intent: "screen_no", step: "screen" },
    { say: "Todavía está cargando.", intent: "screen_no", step: "screen" },
    { say: "Se ve un poco chiquito.", intent: "screen_small", step: "screen", not: ["screen_yes"] },
    { say: "Sofía, se está cortando.", intent: "tell_freeze", step: "freeze" },
    { say: "Perdón, te congelaste.", intent: "tell_freeze", step: "freeze" },
    { say: "Te perdimos un momento.", intent: "tell_freeze", step: "freeze" },
    { say: "¡Ay, perdón! ¿Así está mejor?", intent: "better_q", step: "echo" },
    { say: "Claro, apago el micrófono.", intent: "mute_self", step: "echo" },
    { say: "Yo puedo empezar.", intent: "volunteer", step: "first" },
    { say: "Empiezo yo.", intent: "volunteer", step: "first" },
    { say: "Sara, empieza tú.", intent: "defer", step: "first" },
    { say: "Perdón, ¡adelante!", intent: "go_ahead" },
    { say: "No, ¡tú primero!", intent: "go_ahead" },
    { say: "Terminé el reporte.", intent: "upd_done", step: "update", slots: { task: "report" } },
    { say: "Estoy trabajando en la presentación.", intent: "upd_working", step: "update", slots: { task: "presentation" } },
    { say: "Ya casi termino el presupuesto.", intent: "upd_working", step: "update", slots: { task: "budget" } },
    { say: "Voy a terminar la página web para el viernes.", intent: "upd_working", step: "update", slots: { task: "website" } },
    { say: "Voy un poco atrasado con las facturas.", intent: "upd_behind", step: "update", slots: { task: "invoices" } },
    { say: "Todo va bien.", intent: "upd_ok", step: "update" },
    { say: "¿Nos puedes mandar las diapositivas?", intent: "q_slides", step: "questions" },
    { say: "¿Puedes compartir el link?", intent: "q_link", step: "questions" },
    { say: "¿Cuál es la fecha límite?", intent: "q_deadline", step: "questions" },
    { say: "¿Puedes regresar a la diapositiva anterior?", intent: "q_back", step: "questions" },
    { say: "Ninguna pregunta de mi parte.", intent: "no_questions", step: "questions" },
    { say: "Perdón, me tengo que desconectar. Tengo otra junta a las once.", intent: "leave" },
    { say: "Perdón, me tengo que ir.", intent: "leave" },
    { say: "La próxima semana estoy de vacaciones.", intent: "on_vacation" },
    { say: "¡Hola, Tigre!", intent: "hi_tiger" },
    { say: "¡Qué bonito!", intent: "cute" },
    { say: "¡Muy bien, gracias! Fui a la playa.", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "Tranquilo. ¿Y el tuyo?", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "¡Muy corto!", intent: "weekend_ans_ctx", step: "weekend" },
    // natural alternatives, Mexican office words, short answers, typing without accents
    { say: "si te escucho bien", intent: "hear_yes", step: "hear" },
    { say: "Te escucho pero muy bajito", intent: "hear_no", step: "hear" },
    { say: "¿Puedes hablar más fuerte?", intent: "hear_no", step: "hear" },
    { say: "Pablo, estás muteado", intent: "tell_mute", step: "mute" },
    { say: "Quítate el mute", intent: "tell_mute", step: "mute" },
    { say: "Tienes el micrófono apagado", intent: "tell_mute", step: "mute" },
    { say: "Se te congeló la imagen", intent: "tell_freeze", step: "freeze" },
    { say: "Te trabaste", intent: "tell_freeze", step: "freeze" },
    { say: "Ya se ve", intent: "screen_yes", step: "screen" },
    { say: "Solo veo tu cara", intent: "screen_no", step: "screen" },
    { say: "¿Puedes hacerle zoom?", intent: "screen_small", step: "screen" },
    { say: "Que empiece Sara", intent: "defer", step: "first" },
    { say: "termine el reporte", intent: "upd_done", step: "update", slots: { task: "report" } },
    { say: "Ando con el boletín", intent: "upd_working", step: "update", slots: { task: "newsletter" } },
    { say: "Las diapositivas ya están listas", intent: "upd_done", step: "update", slots: { task: "slides" } },
    { say: "Tengo problemas con la hoja de cálculo", intent: "upd_behind", step: "update", slots: { task: "spreadsheet" } },
    { say: "Sin novedades", intent: "upd_nothing", step: "update" },
    { say: "Claro, ahorita te lo mando", intent: "will_send" },
    { say: "¿Cuándo es la próxima junta?", intent: "q_next", step: "questions" },
    { say: "¿Cuándo es la próxima reunión?", intent: "q_next", step: "questions" },
    { say: "¿Se está grabando la llamada?", intent: "q_record", step: "questions" },
    { say: "¿Alguien me puede ayudar con el presupuesto?", intent: "help_ask" },
    { say: "Tengo que salirme de la llamada", intent: "leave" },
    { say: "¡Qué lindo gatito!", intent: "cute" },
    { say: "Ya me silencié", intent: "mute_self", step: "echo" },
    { say: "Fuimos a un cenote", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "Me enfermé", intent: "weekend_ans_ctx", step: "weekend" },
    // Spain forms are correct answers
    { say: "Sí, os oigo bien", intent: "hear_yes", step: "hear" },
    { say: "¿Me oís?", intent: "ask_hear_me" },
    { say: "La cámara del ordenador no funciona", intent: "cam_broken", step: "camera" },
    { say: "¿Nos podéis mandar las diapositivas?", intent: "q_slides", step: "questions" },
    { say: "Vale, nos vemos la próxima semana", intent: "next_week_yes" },
    { say: "¿Cuál es el plazo?", intent: "q_deadline", step: "questions" },
    // meaning safety: no meaning may flip
    { say: "No te escucho bien", intent: "hear_no", step: "hear", not: ["hear_yes"] },
    { say: "Te veo, pero no te escucho", intent: "hear_no", step: "hear", not: ["hear_yes"] },
    { say: "No la veo", intent: "screen_no", step: "screen", not: ["screen_yes"] },
    { say: "No se ve bien", intent: "screen_no", step: "screen", not: ["screen_yes"] },
    { say: "Mi cámara sí funciona", intent: "none", step: "camera", not: ["cam_broken"] },
    { say: "Creo que Pablo no está en silencio", intent: "not_muted", step: "mute", not: ["tell_mute"] },
    { say: "Pablo, no estás en silencio", intent: "not_muted", step: "mute", not: ["tell_mute"] },
    { say: "No quiero empezar", intent: "defer", step: "first", not: ["volunteer"] },
    { say: "No he terminado el reporte", intent: "upd_behind", step: "update", not: ["upd_done"] },
    { say: "No terminé el reporte", intent: "upd_behind", step: "update", not: ["upd_done"] },
    { say: "La presentación todavía no está lista", intent: "upd_behind", step: "update", not: ["upd_done"] },
    { say: "No estoy trabajando en el reporte", intent: "none", step: "update", not: ["upd_working"] },
    { say: "Hoy no te lo puedo mandar", intent: "cant_send", not: ["will_send"] },
    { say: "No necesito las diapositivas", intent: "none", step: "questions", not: ["q_slides"] },
    { say: "No voy a poder la próxima semana", intent: "on_vacation", not: ["next_week_yes"] },
    { say: "No estoy de vacaciones", intent: "none", not: ["on_vacation"] },
    { say: "Me tengo que ir al trabajo", intent: "none", step: "update", not: ["leave", "g_bye"] },
    { say: "No me tengo que ir", intent: "none", not: ["leave", "g_bye"] },
    { say: "No me gustan los gatos", intent: "none", not: ["cute"] },
    { say: "Sofía no se congeló", intent: "none", step: "freeze", not: ["tell_freeze"] },
    { say: "No hay eco", intent: "none", step: "echo", not: ["mute_self"] },
    { say: "Yo no puedo empezar", intent: "defer", step: "first", not: ["volunteer", "volunteer_ctx"] },
    { say: "No, no la veo", intent: "screen_no", step: "screen", not: ["screen_yes"] },
    { say: "Pablo, apaga el micrófono", intent: "none", step: "mute", not: ["tell_mute"] },
    { say: "Yo", intent: "volunteer_ctx", step: "first" },
    { say: "Yo", intent: "none", step: "hear", not: ["volunteer", "volunteer_ctx"] },
    { say: "Sara, ¿quieres empezar tú?", intent: "defer", step: "first", not: ["volunteer"] },
    // review (2 Nov 2026): flips and natural answers the draft missed
    { say: "Yo no, empieza tú, Sara", intent: "defer", step: "first", not: ["volunteer", "volunteer_ctx"] },
    { say: "No me voy de vacaciones", intent: "none", not: ["on_vacation"] },
    { say: "No, sigo sin ver nada", intent: "screen_no", step: "screen", not: ["screen_yes"] },
    { say: "No, prefiero no prenderla", intent: "cam_broken", step: "camera", not: ["cam_fixed", "cam_fix_ctx"] },
    { say: "No sé si te lo puedo mandar hoy", intent: "cant_send", not: ["will_send"] },
    { say: "Ya mero termino el reporte", intent: "upd_working", step: "update", slots: { task: "report" }, not: ["upd_done"] },
    { say: "Te escucho pero no te veo", intent: "hear_yes", step: "hear", not: ["hear_no"] },
    { say: "No es mi micrófono", intent: "none", step: "echo", not: ["mute_self"] },
    { say: "No muy bien, estuve enfermo", intent: "weekend_ans_ctx", step: "weekend" },
    { say: "Pablo, no te escuchamos, activa tu micrófono", intent: "tell_mute", step: "mute" },
    { say: "¿Me ven ahora?", intent: "cam_fixed", step: "camera" },
    { say: "Ay, perdón, ya prendo la cámara", intent: "cam_fix_ctx", step: "camera" },
    { say: "Con el presupuesto", intent: "upd_working", step: "update", slots: { task: "budget" } },
    // not understood
    { say: "Me gusta la pizza con piña", intent: "none" },
    { say: "Mi perro baila salsa en la playa", intent: "none" },
    { say: "Quiero comprar un boleto de avión", intent: "none" },
  ],

  sims: [
    { name: "happy path", setup: (s) => { s.camOff = false; s.smallTalk = false; s.freeze = false; s.collide = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Yo puedo empezar.", "Terminé el reporte.", "¡Claro!",
        "¿Nos puedes mandar las diapositivas?", "No, es todo.", "¡Perfecto! ¡Adiós a todos!"], expect: { complete: true }, auto: AUTO },
    { name: "every seed as it comes",
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Terminé el reporte.", "¡Claro!",
        "¿Nos puedes mandar las diapositivas?", "No, es todo.", "¡Perfecto! ¡Adiós a todos!"], expect: { complete: true }, auto: AUTO },
    // Sofía's video freezes (a twist) on every seed here; problems and short answers
    { name: "problems and short answers", setup: (s) => { s.freeze = true; s.camOff = true; s.smallTalk = true; },
      turns: ["Perdón, se escucha muy bajito.", "Sí, mucho mejor.", "Tranquilo. ¿Y el tuyo?", "Perdón.", "Creo que estás en silencio.", "Sí.", "No, solo te veo a ti.", "Sí, ya se ve.",
        "Te congelaste.", "Sí.", "Sara, empieza tú.", "Estoy trabajando en la presentación.", "Para el viernes.", "Ninguna pregunta de mi parte.", "¡Nos vemos la próxima semana!"],
      expect: { complete: true, state: { freezeOk: true, camFixed: true, task: "presentation" } }, auto: AUTO },
    // a question, a change of mind about the update, a second question, vacation next week
    { name: "questions and a change of mind", setup: (s) => { s.camOff = false; s.freeze = false; s.collide = false; s.paulHelps = true; s.paulLeaves = false; },
      turns: ["Sí, te escucho bien.", "Pablo, no te escuchamos.", "Sí, perfecto.", "Se ve un poco chiquito.", "Sí, así está mejor.",
        "Yo puedo empezar. Bueno, no, mejor empieza tú, Sara.", "Voy un poco atrasado con las facturas.", "No sé todavía.", "¡Eso sería genial, gracias!", "¿Cuál es la fecha límite?", "¿Y el link?",
        "La próxima semana estoy de vacaciones."],
      expect: { complete: true, state: { update: "behind", task: "invoices", questionsDone: true, saraDone: true, vacation: true } }, auto: AUTO },
    // twist on every seed: Sara starts her update at the same time ("¡Ay, perdón! Tú primero."), and the learner lets her go first
    { name: "twist: talking at the same time", setup: (s) => { s.collide = true; s.paulLeaves = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Yo puedo empezar.", "Perdón, ¡adelante!",
        "Terminé el reporte.", "¡Claro!", "No, es todo.", "¡Perfecto! ¡Adiós a todos!"], expect: { complete: true, state: { saraDone: true } }, auto: AUTO },
    { name: "twist: the echo", setup: (s) => { s.echoTwist = true; s.freeze = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Claro, apago el micrófono.", "Empiezo yo.", "Todo va bien.",
        "Estoy trabajando en el presupuesto.", "La próxima semana.", "No tengo preguntas.", "Sí, a la misma hora."], expect: { complete: true, state: { echoDone: true } }, auto: AUTO },
    { name: "twist: Pablo leaves early, then the cat", setup: (s) => { s.paulLeaves = true; s.catTwist = true; s.collide = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Yo puedo empezar.", "Terminé la propuesta.", "Sí, te la mando después de la llamada.",
        "¡No te preocupes! ¡Adiós, Pablo!", "¿Se está grabando la llamada?", "No, gracias.", "¡Qué bonito!", "¡Adiós a todos!"],
      expect: { complete: true, state: { paulLeft: true, catDone: true } }, auto: AUTO },
    { name: "twist: the camera is still on", setup: (s) => { s.camStillOn = true; s.collide = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Yo puedo empezar.", "Nada nuevo.", "Todo claro.",
        "¡Adiós a todos!", "¡Qué pena! ¡Gracias! ¡Adiós!"], expect: { complete: true }, auto: AUTO },
    { name: "leaving early", setup: (s) => { s.camOff = false; s.smallTalk = false; s.freeze = false; },
      turns: ["¡Buenos días, Sofía! Sí, te escuchamos.", "¡Dale clic al micrófono!", "¡Sí, fuerte y claro!", "Sí, vemos tu pantalla.",
        "Perdón, me tengo que desconectar. Tengo otra junta a las once.", "Voy un poco atrasado con el presupuesto."],
      expect: { complete: true, state: { leftEarly: true, update: "behind" } }, auto: AUTO },
    // review: "Sí, nos vemos después de la llamada" to Pablo's offer is a yes, not the end of the call; two "no"s at the screen;
    // "No, la próxima semana no puedo" is no vacation
    { name: "a later talk, the screen twice, can't come next week",
      setup: (s) => { s.camOff = false; s.smallTalk = false; s.freeze = false; s.collide = false; s.echoTwist = false; s.paulLeaves = false; s.paulHelps = true; s.catTwist = false; s.camStillOn = false; },
      turns: ["Sí, te escucho bien.", "Pablo, no te escuchamos, activa tu micrófono", "Sí, ya te escuchamos.", "No, todavía no.", "No, sigo sin ver nada.",
        "Yo no, empieza tú, Sara.", "Voy un poco atrasado con el reporte.", "Para el viernes.", "Sí, nos vemos después de la llamada.",
        "No, solo una pregunta más: ¿cuál es la fecha límite?", "No, nada más, gracias.", "No, la próxima semana no puedo."],
      expect: { complete: true, state: { screenOk: true, saraDone: true, update: "behind", questionsDone: true, away: true } }, auto: AUTO },
    // Sofía is frozen when the learner says goodbye: she missed it and asks; the learner says it again
    { name: "leaving while Sofía is frozen", setup: (s) => { s.camOff = false; s.smallTalk = false; s.freeze = true; s.echoTwist = false; },
      turns: ["Sí, te escucho bien.", "¡Pablo, estás en silencio!", "¡Sí, ya te escuchamos!", "Sí, ya la veo.", "Perdón, me tengo que ir.",
        "Perdón, me tengo que desconectar. Tengo otra junta a las once.", "Terminé el reporte."],
      expect: { complete: true, state: { leftEarly: true, freezeDone: true, update: "done" } }, auto: AUTO },
    { name: "a Spain learner and a muted mic without a comma", setup: (s) => { s.camOff = false; s.smallTalk = false; s.freeze = false; s.collide = false; },
      turns: ["Sí, os oigo bien.", "No estás en silencio.", "Sí, está en silencio.", "Sí, ya te escuchamos.", "Sí, la vemos.", "Vale, empiezo yo.", "Ya casi termino el diseño.",
        "Mañana en la mañana.", "¿Nos podéis mandar las diapositivas?", "No, gracias.", "Vale, nos vemos la próxima semana."], expect: { complete: true, state: { task: "design" } }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Shared flow pieces (defined after the object so they can call its handlers)

function expectPaulHear(c: Ctx) {
  c.expect({
    id: "paul_hear", expects: ["hear_yes", "hear_no"], hints: ["paul_hear"],
    suggest: [{ lt: "Tell Pablo whether you can hear him now", hint: "paul_hear" }],
    yes: (cc) => paulHeard(cc),
    no: (cc) => paulStillMuted(cc),
    on: {
      hear_yes: (cc) => paulHeard(cc),
      better_q: (cc) => paulHeard(cc),
      hear_no: (cc) => paulStillMuted(cc),
      tell_mute: (cc) => paulStillMuted(cc),
      tell_mute_ctx: (cc) => paulStillMuted(cc),
    },
    ask: (cc) => P(cc, "paul_reask"),
  });
}

function paulHeard(c: Ctx) {
  c.s.paulOk = true;
  P(c, "paul_ok");
  if (c.s.saraLate && !c.s.saraJoined) { c.s.saraJoined = true; S(c, "sara_join"); }
}

function paulStillMuted(c: Ctx) {
  if (!once(c, "paulStill")) return;
  P(c, "paul_now");
  c.s.paulTries = (c.s.paulTries || 0) + 1;
  if (c.s.paulTries < 2) expectPaulHear(c);
  else c.s.paulOk = true; // Pablo fixes it himself; the call goes on
}

function expectScreen2(c: Ctx) {
  c.expect({
    id: "screen2", expects: ["screen_yes", "screen_no"], hints: ["screen"],
    suggest: [{ lt: "Say whether you can see it now", hint: "screen" }],
    yes: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
    no: (cc) => screenNo(cc),
    on: {
      screen_yes: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
      hear_yes: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
      better_q: (cc) => { cc.s.screenOk = true; afterScreen(cc); },
      screen_no: (cc) => screenNo(cc),
      hear_no: (cc) => screenNo(cc),
    },
    ask: (cc) => K(cc, "screen_reask"),
  });
}

/** "No la veo": Sofía tries once more; a second no gets the slides after the call (not "Is that better?"). */
function screenNo(c: Ctx) {
  if (!once(c, "screenNo")) return;
  c.s.screenTries = (c.s.screenTries || 0) + 1;
  if (c.s.screenTries === 1) { K(c, "screen_retry"); expectScreen2(c); return; }
  c.s.screenOk = true; K(c, "screen_give_up"); afterScreen(c);
}

/** Sofía presents the numbers (unless she is about to freeze in the middle of them). */
function afterScreen(c: Ctx) {
  if (c.s.freeze && !c.s.freezeDone) return;
  K(c, "present"); K(c, "great_work");
}

function fixFreeze(c: Ctx) {
  if (!once(c, "fixFreeze")) return;
  c.s.freezeDone = true; c.twist("froze");
  K(c, "freeze_fix");
  c.expect({
    id: "freeze_q", expects: ["hear_yes", "hear_no"], hints: ["hear_now"],
    suggest: [{ lt: "Say whether you can hear her now", hint: "hear_now" }],
    yes: (cc) => { cc.s.freezeOk = true; K(cc, "freeze_where"); K(cc, "present"); },
    no: (cc) => { cc.s.freezeOk = true; K(cc, "quiet_fix"); K(cc, "present"); },
    on: {
      hear_yes: (cc) => { cc.s.freezeOk = true; K(cc, "freeze_where"); K(cc, "present"); },
      better_q: (cc) => { cc.s.freezeOk = true; K(cc, "freeze_where"); K(cc, "present"); },
      hear_no: (cc) => { cc.s.freezeOk = true; K(cc, "quiet_fix"); K(cc, "present"); },
    },
    ask: (cc) => K(cc, "hear_reask"),
  });
}

/** "Gracias, Sara": the learner keeps the turn (the update step then says "¡Perfecto, adelante!"). */
function goOn(c: Ctx) { c.s.goAhead = true; }

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
    id: "anything_else", expects: ["no_questions", "q_slides", "q_link", "q_deadline", "q_next", "q_back", "q_record", "have_question"], hints: ["no_more", "questions"],
    suggest: [{ lt: "Say you have no more questions", hint: "no_more" }, { lt: "Ask something else", hint: "questions" }],
    no: (cc) => { cc.s.questionsDone = true; K(cc, "qa_none"); },
    yes: (cc) => { K(cc, "ok"); cc.hold(); },
    on: {
      no_questions: (cc) => { cc.s.questionsDone = true; K(cc, "qa_none"); },
      // "No, solo una pregunta más: …" (rule 21): the question usually follows in the same breath
      have_question: (cc) => { if (once(cc, "moreQ")) { K(cc, "ok"); cc.hold(); } },
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
