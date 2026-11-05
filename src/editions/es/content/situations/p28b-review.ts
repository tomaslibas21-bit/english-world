// Advanced song P28 "Taste It Again", second part → Puerto Colibrí: "Lo que salió muy bien", a performance review
// ("la evaluación de desempeño") at Línea Clara. Elena's small glass office. Six weeks ago Elena was the design team's
// most experienced designer and the learner's teammate; now she is their manager ("tu jefa"), warm and a little nervous
// in her first round of reviews. Elena and the learner use tú both ways, as Mexican colleagues do (`informal` in the
// shared cast). A plant falls off the windowsill as she starts. Small talk ("¿Cómo te sientes con la evaluación de
// hoy?"), the format (your self-assessment, then hers, then goals), then:
//   - your year: "¿De qué estás más orgulloso este año?" (the booking system guide, the client project pulled off on
//     time, helping the new intern, the app launch, the customer survey), sometimes "¿Qué hizo que funcionara?", and
//     her praise the song's way ("Lo que salió muy bien fue…"), which the learner accepts;
//   - her feedback: "¿Te puedo dar un poco de retroalimentación?" → "Algo que podrías intentar es hablar antes en las
//     juntas con clientes." The learner accepts ("Gracias, eso me sirve mucho. Voy a trabajar en eso."), asks for an
//     example, or explains politely that she presented their sections because the client was late ("Es justo. Eso fue
//     culpa mía.") and then proposes how to protect their speaking time (their sections on the agenda). A rude
//     push-back ("Eso no es verdad") still works, with a tip;
//   - goals for next year (client presentations, a small project, a course in UX writing / data analysis / leadership,
//     mentoring the interns); asking for support counts ("¿Hay presupuesto para capacitación?");
//   - "¿Tienes alguna pregunta para mí?": the raise or promotion question ("Los aumentos se deciden el próximo mes"),
//     what counts ("supera las expectativas"), and her honest "Todavía no sé. Déjame averiguarlo. Te aviso a más
//     tardar el viernes.";
//   - the summary, "¿Algo más?", and "Le damos seguimiento en un mes" (a Mexican office's follow-up).
// Twists (one per visit at most, an unseen one preferred on replays), as in the English: Elena asks the learner for
// feedback on her as a manager (what works, then one thing she could try: "No lo había pensado así."), or her screen
// shows Pablo's ratings by mistake (point it out tactfully; reading them aloud gets a tip about discretion).
//
// Keeps the English file's id, steps, intents, twists and handler logic. Changes for Mexico:
// - Mexican office words: la evaluación (de desempeño), la retroalimentación (and "feedback", "comentarios", which
//   learners say too), las juntas (Mexico's word for a work meeting; twin: reuniones), un aumento (de sueldo), un
//   ascenso / una promoción, la capacitación, darle seguimiento, "a más tardar el viernes". Accepted from learners:
//   Spain's "subida de sueldo", "ordenador", "vale", vosotros.
// - The colleague whose review is on the screen is Pablo (Línea Clara's Pablo from s34; Maple Harbor's Ben).
// - The training budget is this company's own ($10,000 pesos per person a year): a plausible figure for a Mexican
//   office, said once and never tied to the law. Mexican law makes employers provide training (capacitación), but
//   nothing here says how much; the raises are "decided next month", as the English has it.
// - The client call in her example is just "la llamada con el cliente el martes pasado" (no client name).
// - Mexican-only words have a neutral twin: junta (reunión), ahorita (ahora / ahora mismo).
//
// The learner's gender: {m:…|f:…}. Elena's own forms are feminine and written out ("nerviosa", "segura").
//
// Course report: done (c.complete) when items 2, 3, 4 and 5 of the mission are ticked; items 1 and 6 are optional
// and leave the list once their moment has passed (or when the task is complete).
//
// Only a clear yes agrees on her suggested goal, her agenda idea or the check-in date (audit, 5 Nov 2026): "Gracias.",
// "Está bien, gracias.", "Puede ser." or her idea asked back ("¿Presentaciones a clientes?", "¿A la misma hora?") get her
// question once more; the next time the goal waits for next time, she decides the agenda herself, or she sends an invite.
//
// NEEDS: (1) the game ignores the events "plant" ({ fall: true }: the pot falls at the start; a thud would help) and
//   "screen" ({ tab: "ben" | "mine" }: what the laptop shows in the wrong-tab twist; "ben" is the id the English uses,
//   Pablo's review here). (2) global.ts g_welcome says "¡A la orden!" (staff's word) to anyone: a boss thanked by her
//   report gets this file's own "¡De nada!" (welcome). (3) global.ts g_thanks has no "gracias por la reunión / por la
//   evaluación / por hoy": thanks_today carries them here.
// NEEDS: (4) global.ts g_howareyou has no "¿Y tú, cómo estás?" (only "¿Cómo estás tú?" / "Bien, ¿y tú?"); a learner who
//   asks Elena back that way at the start is not understood.
// NEEDS: (5) global.ts g_howareyou_bad has no "la verdad" ("No muy bien, la verdad"); feel_nervous #bad carries it here.

import type { Ctx, EntityDef, Segment, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_JUNTA = "Mexican: junta = a work meeting.";
const F_AHORITA = "Mexican: ahorita = right now.";
const F_DE_ANTES = "de links antes / después to what follows.";
const F_ART_POSS = "Spanish puts the article before the possessive pronoun (la mía, la tuya).";
const F_EL_DAY = "Spanish uses el with a day or with next month / year (= on Friday, next month).";
const F_RAZON = "tener razón = to be right.";
const F_PERS_A = "a: marks the person (personal a).";
const F_SEG = "darle seguimiento (a algo) = to follow up (on it).";
const F_LA_IT = "la: it (the review), an object pronoun before the verb.";
const F_PODER_CON = "poder con algo = to be able to handle it.";

// ---------------------------------------------------------------------------
// Entities
// win: what the learner is proud of (attrs.act: the hint's verb, "haber ayudado" / "haber sacado adelante").

const WINS: EntityDef[] = [
  ent("guide", "guía | del | sistema | de | citas", "guide | for the | system | of | appointments", "f", {
    attrs: { nat: "booking system guide" },
    forms: ["guia", "la guia", "el manual", "manual", "manual del sistema", "el manual del sistema", "guia del sistema", "la guia del sistema", "el instructivo", "instructivo",
      "la documentacion", "documentacion", "el sistema de citas", "sistema de citas", "el manual del sistema de citas", "la guia de usuario", "guia de usuario", "el tutorial",
      "tutorial", "guia para el sistema de citas", "la guia para el sistema de citas", "guia para el sistema", "guia de citas", "la guia de citas", "manual de citas", "el manual de citas", "guia de la agenda", "la guia de la agenda"],
  }),
  ent("rescue", "proyecto | del | cliente", "project | of the | client", "m", {
    attrs: { act: "rescue", nat: "client project" },
    forms: ["el proyecto del cliente", "proyecto atrasado", "el proyecto atrasado", "el proyecto retrasado", "proyecto retrasado", "el rescate del proyecto", "el rescate",
      "el proyecto con el cliente", "proyecto con el cliente", "la entrega a tiempo", "el proyecto de cliente", "proyecto de cliente", "el proyecto urgente", "el proyecto", "proyecto"],
  }),
  ent("intern", "practicante | nuevo", "intern | new", "m", {
    attrs: { act: "help", nat: "new intern" },
    forms: ["practicante", "el practicante", "nuevo practicante", "el nuevo practicante", "becario", "el becario", "el becario nuevo", "becario nuevo", "los practicantes",
      "practicantes", "la practicante", "la practicante nueva", "practicante nueva", "el chavo nuevo", "el disenador nuevo"],
  }),
  ent("launch", "lanzamiento | de | la | app", "launch | of | the | app", "m", {
    attrs: { nat: "app launch" },
    forms: ["lanzamiento", "el lanzamiento", "la app", "la aplicacion", "lanzamiento de la aplicacion", "el lanzamiento de la aplicacion", "la nueva app", "la app nueva",
      "lanzar la app", "el lanzamiento de la app nueva", "lanzamiento de app", "el lanzamiento de app"],
  }),
  ent("survey", "encuesta | a | clientes", "survey | to | customers", "f", {
    attrs: { nat: "customer survey" },
    forms: ["encuesta", "la encuesta", "encuesta de clientes", "la encuesta de clientes", "encuesta de satisfaccion", "la encuesta de satisfaccion", "el cuestionario",
      "cuestionario", "la investigacion de usuarios", "investigacion de usuarios", "encuesta a usuarios", "la encuesta a usuarios", "la encuesta a los clientes",
      "encuesta a los clientes", "la encuesta para clientes"],
  }),
];

// goal: what to work on next year (attrs.kind: skill / lead / course / mentor).
const GOALS: EntityDef[] = [
  ent("presenting", "presentaciones | a | clientes", "presentations | to | clients", "f", {
    art: "", attrs: { kind: "skill", nat: "client presentations" },
    forms: ["presentaciones", "las presentaciones", "presentar", "presentar a clientes", "presentar con clientes", "hablar en publico", "hablar en las juntas",
      "hablar en las reuniones", "participar en las juntas", "participar mas en las juntas", "mis presentaciones", "presentaciones con clientes", "presentar en las juntas",
      "las presentaciones a clientes", "presentaciones a los clientes", "presentar a los clientes", "presentar ante clientes"],
  }),
  ent("leading", "proyecto | pequeño", "project | small", "m", {
    attrs: { kind: "lead", nat: "small project" },
    forms: ["dirigir un proyecto", "dirigir un proyecto pequeno", "liderar un proyecto", "liderar un proyecto pequeno", "un proyecto pequeno", "mi propio proyecto",
      "un proyecto propio", "llevar un proyecto", "coordinar un proyecto", "gestion de proyectos", "administracion de proyectos", "un proyecto chico", "proyecto chico",
      "encabezar un proyecto"],
  }),
  ent("ux_writing", "UX | writing", "UX | writing", "m", {
    art: "", attrs: { kind: "course", nat: "UX writing" },
    forms: ["ux writing", "u x writing", "ux writting", "redaccion ux", "redaccion para ux", "escritura ux", "redaccion", "copywriting", "microcopy", "redaccion de textos"],
  }),
  ent("data", "análisis | de | datos", "analysis | of | data", "m", {
    art: "", attrs: { kind: "course", nat: "data analysis" },
    forms: ["analisis de datos", "datos", "analisis", "analitica", "analitica de datos", "estadistica", "ciencia de datos", "manejo de datos", "trabajar con datos"],
  }),
  ent("leadership", "liderazgo", "leadership", "m", {
    art: "", attrs: { kind: "course" },
    forms: ["gestion de equipos", "manejo de equipos", "liderar equipos", "dirigir equipos", "manejo de personal", "management", "gestion de personas",
      "habilidades de liderazgo", "ser lider", "dirigir un equipo", "liderar un equipo"],
  }),
  ent("mentoring", "mentoría", "mentoring", "f", {
    art: "", attrs: { kind: "mentor" },
    forms: ["mentoria", "mentorias", "ser mentor", "ser mentora", "dar mentoria", "dar mentorias", "mentorear", "mentorear a los practicantes", "ayudar a los practicantes",
      "ensenar a los practicantes", "capacitar a los nuevos", "acompanar a los nuevos", "ayudar a la gente nueva", "coaching"],
  }),
];

// Role reversal: what works in Elena's managing (mgood) and one thing she could try (mtip).
const MGOOD: EntityDef[] = [
  ent("open_door", "puerta | abierta", "door | open", "f", {
    attrs: { nat: "open door" },
    forms: ["que siempre estas disponible", "que tu puerta siempre esta abierta", "disponibilidad", "tu disponibilidad", "que estas disponible", "siempre estar disponible", "puertas abiertas"],
  }),
  ent("honesty", "honestidad", "honesty", "f", {
    art: "", forms: ["sinceridad", "transparencia", "que eres honesta", "que eres directa", "franqueza", "claridad", "tu sinceridad", "tu franqueza"],
  }),
  ent("calm", "calma", "calm", "f", {
    art: "", forms: ["tranquilidad", "paciencia", "que eres tranquila", "que eres paciente", "tu tranquilidad", "tu paciencia"],
  }),
  ent("support", "apoyo", "support", "m", {
    art: "", forms: ["que nos apoyas", "que nos defiendes", "que nos cuidas", "respaldo", "que nos respaldas", "apoyo al equipo", "tu respaldo"],
  }),
  ent("listening", "manera | de | escuchar", "way | of | listening", "f", {
    attrs: { nat: "way of listening" },
    forms: ["que escuchas", "que sabes escuchar", "como escuchas", "que nos escuchas", "que siempre nos escuchas", "que siempre me escuchas", "que siempre escuchas", "forma de escuchar", "tu forma de escuchar", "escucha"],
  }),
];

const MTIPS: EntityDef[] = [
  ent("priorities", "prioridades | más | claras", "priorities | more | clear", "f", {
    art: "", attrs: { nat: "clearer priorities" },
    forms: ["prioridades claras", "prioridades", "dejar claras las prioridades", "objetivos mas claros", "metas mas claras", "mas claridad", "direccion mas clara"],
  }),
  ent("one_on_ones", "reuniones | uno a uno", "meetings | one-on-one", "f", {
    art: "", attrs: { nat: "one-on-ones" },
    forms: ["juntas uno a uno", "one on ones", "one on one", "reuniones individuales", "juntas individuales", "platicas uno a uno", "reuniones uno a uno cada semana",
      "juntas uno a uno cada semana", "reunion uno a uno", "junta uno a uno"],
  }),
  ent("late_email", "menos | correos | en | la | noche", "fewer | emails | at | — | night", "m", {
    art: "", attrs: { fixed: true, nat: "fewer late-night emails" },
    forms: ["menos correos de noche", "menos correos tarde", "menos mensajes en la noche", "menos correos a deshoras", "nada de correos en la noche", "no correos en la noche",
      "menos correos por la noche", "menos mails en la noche", "menos emails en la noche"],
  }),
  ent("shorter_meetings", "reuniones | más | cortas", "meetings | more | short", "f", {
    art: "", attrs: { nat: "shorter meetings" },
    forms: ["juntas mas cortas", "menos juntas", "menos reuniones", "juntas cortas", "reuniones cortas", "juntas mas breves", "reuniones mas breves"],
  }),
  ent("more_feedback", "más | retroalimentación", "more | feedback", "f", {
    art: "", attrs: { fixed: true, nat: "more feedback" },
    forms: ["mas feedback", "mas comentarios", "retroalimentacion mas seguido", "retroalimentacion mas seguida", "feedback mas seguido"],
  }),
];

const look = (list: EntityDef[], id?: string) => list.find((e) => e.id === id);
const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------------------
// Per-turn helpers

// One reaction per learner turn ("Gracias, eso me sirve mucho. Voy a trabajar en eso." is two pieces but one
// answer). The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
// Answers settled at the end of the turn (the step's question): a blunt "Eso no es verdad" waits, so the reason said
// after it in the same breath ("…tú presentaste mis partes") wins; a "No sé" waits for an answer in the same breath
// ("No sé. ¿Tal vez un curso de análisis de datos?").
const RUDE = new WeakSet<Ctx>();
const HOWSO = new WeakSet<Ctx>();
const DONT_KNOW = new WeakMap<Ctx, string>();

const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string): number { c.s.asks ||= {}; c.s.asks[id] = asks(c, id) + 1; return c.s.asks[id]; }

/** "Entiendo, pero…": an acknowledgement before a contrast is no answer of its own. */
const contrast = (c: Ctx) => /\bpero\b/.test(fold(c.heard));
/** "…¿y tú?" / "¿Tú cómo estás?" */
const askedBack = (c: Ctx) => /\b(y tu|y usted|y a ti|tu como estas|como estas tu|y tu como)\b/.test(fold(c.heard));
const isQuestion = (c: Ctx) => /[?¿]/.test(c.heard || "");
/** "No, gracias" / "No, está bien": a thanks or an okay after a "no" is a polite refusal, never a yes. */
const saidNo = (c: Ctx) => /^\W*(no|nop|nel|mejor no)\b/.test(fold(c.heard));
/** "Gracias." / "Está bien, gracias." / "Ok, gracias." / "Entiendo." / "Puede ser." / "Probablemente.": polite or vague,
 *  never a yes to her suggested goal, her agenda idea or the check-in (in Mexico a bare thanks is often a polite no;
 *  AUTHORING rule 17). */
const unclearYes = (c: Ctx) => /^\W*((esta bien|ok|okay|bueno|vale|muy bien)\W+)?(muchas )?gracias( elena)?\W*$/.test(fold(c.heard))
  || /^\W*(entendido|ya veo|ya entendi|entiendo|probablemente|puede ser|tal vez|quizas?|a lo mejor)\W*$/.test(fold(c.heard));
/** A clear yes word somewhere in the turn ("Sí, …", "Claro", "Va", "Me parece bien", "Buena idea", "Suena bien"…). */
const yesWord = (c: Ctx) => /\b(si|claro|ok|okay|va|sale|vale|bueno|esta bien|de acuerdo|perfecto|listo|me parece|me late|me gusta|me encanta|suena|buena idea|excelente|genial|hagamoslo|trato hecho|acepto|me funciona|por supuesto)\b/.test(fold(c.heard));
/** Her own idea said back as a question ("¿Presentaciones a clientes?", "¿En la agenda?", "¿A la misma hora?"): no yes. */
const echoQ = (c: Ctx) => isQuestion(c) && !yesWord(c)
  && !/\b(podemos|podriamos|puedes|podrias|puedo|podria|y si|que tal|pongamos|ponemos|pon|agrega|anota|me gustaria|quiero|quisiera|prefiero|mejor)\b/.test(fold(c.heard));
/** "UX writing, ¿no?": a tag question picks it (never "UX writing, no"). */
const tagQ = (c: Ctx) => isQuestion(c) && /\bno\W*$/.test(fold(c.heard));
/** "¿Qué es UX writing?" / "¿Qué significa liderazgo?": a question about the word, never the choice. */
const whatQ = (c: Ctx) => /\b(que es|que significa|que quiere decir|en que consiste|de que se trata)\b/.test(fold(c.heard));

const praiseOpen = (c: Ctx) => asks(c, "praise") >= 1 && !c.s.praiseDone;
const fbOpen = (c: Ctx) => !!c.s.fbGiven && !c.s.fbDone;
const protectOk = (c: Ctx) => !c.s.pushed || !!c.s.protectDone;
const tabOk = (c: Ctx) => c.s.twist !== "tab" || !!c.s.tabDone;
const supportOk = (c: Ctx) => !c.s.supportQ || !c.s.goal || !!c.s.supportDone;
const revOk = (c: Ctx) => c.s.twist !== "reverse" || !!c.s.revDone;
/** Items 2, 3 and 4: what the course report needs before the closing (item 5). */
const coreDone = (c: Ctx) => !!c.s.praiseOk && !!c.s.fbOk && !!c.s.goal;

/** Sims: the plain review (no twist, no "¿Qué hizo que funcionara?", no "¿Qué te ayudaría?"). */
const PLAIN = (s: Record<string, any>) => { s.twist = null; s.follow = false; s.supportQ = false; s.back = false; };
const AUTO: Record<string, string> = {
  made: "Planeamos todo con tiempo.", support: "Me ayudaría tener retroalimentación más seguido.", protect: "¿Podemos poner mis partes en la agenda?",
  anything_else: "No, es todo. Gracias, eso me sirve mucho.", checkin: "Suena bien.",
  rev_open: "Claro, con gusto.", rev_worked: "Lo que funciona muy bien es tu puerta abierta.", rev_try: "Algo que podrías probar: prioridades más claras.",
  tab: "Creo que esa es la evaluación de otra persona.", criteria: "¿Qué tendría que hacer para lograr un ascenso?",
};

// ---------------------------------------------------------------------------

export const review: SituationDef = {
  id: "p28b-review",
  song: "P28",
  songTitle: "Taste It Again",
  title: { en: "Lo que salió muy bien", lt: "What worked really well" },
  topic: { en: "Una evaluación de desempeño", lt: "A performance review" },
  chapter: 8,
  order: 5,
  location: "office",
  npc: "emily",
  goal: "Talk through your year with your new manager: accept her praise and her feedback, ask for an example, agree on a goal for next year, and ask about your salary.",
  intro: "Línea Clara, Elena's small glass office. Six weeks ago Elena was a designer at the desk next to yours; now she's your manager, and this is her first round of performance reviews. She's warm but clearly nervous. You and Elena use tú. On the desk: a laptop, a printed agenda, and a potted plant a little too close to the edge.",
  entities: { win: WINS, goal: GOALS, mgood: MGOOD, mtip: MTIPS },

  grammar: {
    macros: {
      fb: "(retroalimentacion | la retroalimentacion | un poco de retroalimentacion | feedback | el feedback | comentarios | tus comentarios | un comentario | el comentario | observaciones | tu opinion | consejos | el consejo | tu consejo)",
      secc: "(partes | parte | secciones | seccion | diapositivas | slides | temas | tema | presentacion | diapos | laminas)",
      late_why: "(porque | como | ya que) (el cliente (llegó | llego | iba | venia) tarde | el cliente tenia (prisa | poco tiempo) | ibamos tarde | no (habia | hubo) tiempo | se nos acabó el tiempo | se acabó el tiempo | la (junta | reunion | llamada) fue (corta | muy corta))",
      agenda: "(la agenda | agenda | el orden del dia | la orden del dia | el plan | la lista)",
      junta: "(junta | juntas | reunion | reuniones | llamada | llamadas)",
      pay: "(sueldo | mi sueldo | el sueldo | salario | mi salario | el salario | lo del sueldo | lo del dinero | mi pago | dinero | el dinero)",
      raise: "(un aumento | aumento | el aumento | un aumento de sueldo | aumento de sueldo | un aumento de salario | una subida de sueldo | subida de sueldo | una subida | un bono | bono)",
      promo: "(un ascenso | ascenso | el ascenso | ascender | una promocion | promocion | la promocion | un puesto mas alto | subir de puesto | el siguiente nivel | subir de nivel)",
      rev: "(evaluacion | la evaluacion | mi evaluacion | calificacion | calificaciones | las calificaciones | revision | evaluacion de desempeno | resultados | nota | notas)",
      late_night: "(en la noche | de noche | por la noche | tarde en la noche | a medianoche | despues del trabajo | despues de las (seis | siete | ocho | nueve | diez) | en fin de semana | los fines de semana | a deshoras)",
      very: "[muy | super | bastante | realmente | de verdad | sumamente]",
    },
  },

  intents: {
    // --- the plant --------------------------------------------------------------------------------
    plant_help: { patterns: [
      "(estas | esta usted | esta) bien #h:are_you_ok",
      "(estas | esta usted) bien (te | le) (ayudo | echo la mano)",
      "(te | le) ayudo [con (eso | la planta | la tierra)] #h:can_i_help",
      "(te | le) (puedo | podria) ayudar [con (eso | la planta | la tierra)]",
      "(puedo | podria) ayudar[te] [con (eso | la planta)]", "(puedo | podria) ayudarte [con (eso | la planta)]",
      "(dejame | deja | deja que) (te ayude | ayudarte | te ayudo)",
      "(quieres | necesitas | ocupas) (ayuda | una mano) [con (eso | la planta)]",
      "(te | le) echo la mano",
      "(quieres que | te) (traiga | traigo) (una escoba | servilletas | papel | un trapo | una toalla | algo)",
      "(voy por | traigo) (una escoba | servilletas | papel | un trapo)",
      "no te preocupes [por (eso | la planta | la tierra)] #h:dont_worry_plant",
      "no te preocupes (es | solo es) [solo] (tierra | una planta | un poco de tierra)",
      "no se preocupe [por (eso | la planta | la tierra)]",
      "(no pasa nada | no hay problema) (es | solo es) (tierra | una planta | un poco de tierra)",
      "(es | solo es) (tierra | un poco de tierra | una planta)",
      "(pobre | la pobre | ay la | ay tu | uy la | uy tu) planta",
      "(ay | uy | oh) (la | tu) planta",
      "(que | buena) atrapada",
      "(le | a todos nos) (pasa | puede pasar) a (cualquiera | todos)",
      "(eso)? le pasa a cualquiera",
      "(yo | lo) (limpio | recojo)",
      "(te | le) ayudo a (limpiar | recoger)",
      "no (pidas | tienes que pedir) perdon",
      "no (te disculpes | hay de que disculparse)",
    ] },

    // --- how are you feeling --------------------------------------------------------------------------
    feel_nervous: { patterns: [
      "[la verdad] [estoy | me siento | ando] [un poco | un poquito | algo | muy | bastante | super | medio | algo] (nervioso | nerviosa | ansioso | ansiosa | preocupado | preocupada | estresado | estresada | tenso | tensa) [la verdad] [pero (bien | tranquilo | tranquila)] #h:bit_nervous",
      "(tengo | traigo) [muchos | algo de | un poco de] nervios [la verdad]",
      "(tengo | traigo) mariposas en el estomago",
      "no dormí (bien | mucho | nada) [anoche]",
      "[estoy] [un poco | algo] (nervioso | nerviosa) pero [tambien] (curioso | curiosa | bien | listo | lista | contento | contenta | emocionado | emocionada | tranquilo | tranquila) #mix",
      "(no muy bien | no tan bien) [estoy] [un poco | algo] (nervioso | nerviosa)",
      "me (dan | ponen) nervios (estas cosas | las evaluaciones)", "me pongo nervioso", "me pongo nerviosa",
      "con nervios [la verdad]",
      "la verdad (no muy bien | no tan bien | mas o menos | regular) #bad", "(no muy bien | no tan bien | mas o menos | regular) la verdad #bad",
    ] },
    feel_fine: { patterns: [
      "[estoy | me siento] [muy | bastante | super] (tranquilo | tranquila | relajado | relajada | contento | contenta | positivo | positiva | seguro | segura | optimista | emocionado | emocionada | animado | animada) [gracias] #h:fine",
      "(me siento | estoy) [muy] bien [gracias]",
      "[estoy] [bien] (listo | lista) para (empezar | esto | la evaluacion | comenzar) #h:looking_forward",
      "(con ganas | tengo ganas) de (empezar | esto | escucharte)",
      "no estoy (nervioso | nerviosa | preocupado | preocupada | estresado | estresada) [para nada]",
      "(me siento | estoy) bien con (esto | todo esto | la evaluacion)",
      "(estoy | ya estoy | me siento) (listo | lista) [gracias]",
      "(tranquilo | tranquila) (me siento | estoy) (listo | lista | bien)",
    ] },
    feel_curious: { patterns: [
      "[la verdad] [estoy] [un poco | algo | muy | bastante | medio] (curioso | curiosa | intrigado | intrigada) [la verdad] #h:curious",
      "con [mucha | un poco de] curiosidad [la verdad]",
      "(tengo | con) [mucha | un poco de] curiosidad [(por | de) (saber | escuchar | ver) [que piensas | tu opinion | tus comentarios | que me vas a decir]] [la verdad]",
      "(curioso | curiosa) (por | de) (saber | escuchar | ver) [que piensas | que me vas a decir | tus comentarios | tu opinion]",
      "[un poco] (curioso | curiosa) pero [tambien] [un poco] (nervioso | nerviosa) #mix",
    ] },

    // --- your year --------------------------------------------------------------------------------------
    proud_win: { patterns: [
      "(estoy | me siento) @very [mas | sobre todo | especialmente] (orgulloso | orgullosa) (de | del | por) {win} [y [tambien] [de | del] {win2:win}] #h:most_proud",
      "(estoy | me siento) @very [mas | sobre todo | especialmente] (orgulloso | orgullosa) de (haber ayudado | ayudar | haber rescatado | rescatar | haber sacado adelante | sacar adelante | haber salvado | haber terminado | haber hecho | haber lanzado | haber escrito | haber entregado) [a | al] {win} [a tiempo] #h:most_proud",
      "(probablemente | seguramente | sin duda | definitivamente | yo diria que | diria que) {win} [y [tambien] {win2:win}] #h:probably",
      "(probablemente | seguramente | sin duda | yo diria que) (ayudar | rescatar | sacar adelante | salvar) [a | al] {win} #h:probably",
      "de lo que (estoy | me siento) mas (orgulloso | orgullosa) es [de | del] {win}",
      "lo que mas me (enorgullece | gusta | gustó) (es | fue) {win}",
      "[creo que | yo creo que | pienso que] {win} (salió | fue | funcionó | quedó) [muy | super | bastante | realmente] (bien | increible | excelente | genial) #h:went_well",
      "[creo que] (hice | hicimos) un (buen | gran | muy buen) trabajo (con | en | con el | en el) {win}",
      "{win} (fue | es) mi (mayor | mejor) (logro | exito | orgullo) [este ano | del ano]",
      "mi (mayor | mejor) (logro | exito) [del ano | de este ano | este ano] (fue | es) {win} [y [tambien] {win2:win}]",
      "(rescaté | rescatamos | salvé | salvamos | saqué adelante | sacamos adelante | entregué | entregamos | lancé | lanzamos | escribí | hice | hicimos | terminé | terminamos | ayudé | ayudamos | creé | creamos) [a | al] {win} [a tiempo]",
      "{win} y {win2:win}",
      // "No fue la app, fue la encuesta": the second is the answer
      "no (fue | es) {neg:win} (fue | es | sino) {win}", "no {neg:win} sino {win}",
      "(de | del) (haber ayudado | haber sacado adelante | haber rescatado | haber hecho | haber escrito) [a | al] {win}",
    ] },
    // "La encuesta." (only while she asks what you are proud of)
    win_ctx: { patterns: ["[lo de | lo del] {win} [creo | probablemente | sin duda]", "(ayudar | rescatar | sacar adelante | salvar | escribir | hacer) [a | al] {win}"] },
    proud_none: { patterns: [
      "(nada | nada especial | nada en especial | no mucho | nada en particular | nada la verdad) [la verdad | este ano | creo]",
      "no hice nada (especial | en especial | importante) [este ano]",
      "no estoy [muy | tan] (orgulloso | orgullosa) de nada [en particular]",
      "no se (de que estar (orgulloso | orgullosa) | que decir)",
      "no necesito nada [mas | por ahora]",
    ] },
    made_why: { patterns: [
      "(planeamos | planeé | preparamos | preparé | organizamos | organicé | planificamos | planifiqué) todo [con tiempo | con mucho tiempo | con tiempo de sobra | desde el principio | muy bien | con anticipacion | con mucha anticipacion] #h:planned_early",
      "(planeamos | planeé | planificamos) (con tiempo | desde el principio | muy bien | con anticipacion)",
      "(mucha | buena | una buena | muy buena) (planeacion | planificacion | comunicacion | organizacion | preparacion) [con (el cliente | el equipo | todos | los usuarios)]",
      "(escuché | escuchamos) (a los usuarios | a los clientes | al cliente | al equipo | a todos | a la gente | a soporte) [mucho | desde el principio] #h:listened_users",
      "(platiqué | platicamos | hablé | hablamos) [mucho] (con todos | con los usuarios | con el cliente | con el equipo | con soporte) [todos los dias | desde el principio]", "(platiqué | platicamos | hablé | hablamos) mucho",
      "(hice | hicimos) (muchas | muchisimas) preguntas [desde el principio] #h:asked_questions", "pregunté (mucho | todo)",
      "(probé | probamos) todo [muchas veces | con usuarios reales | con tiempo]",
      "(mantuve | mantuvimos) (a todos | al cliente | al equipo) (informados | al tanto | tranquilos)",
      "(me mantuve | estuve | fui) (tranquilo | tranquila | organizado | organizada | paciente) [con el]",
      "(nos comunicamos | me comuniqué) (mucho | bien | todos los dias)",
      "lo (escribí | expliqué) [todo] paso a paso", "(lo hice | lo hicimos) (simple | sencillo | facil)",
      "(trabajé | trabajamos) (mucho | duro | muy duro)", "(mucho trabajo | mucho esfuerzo | trabajo duro | mucho cafe | buena gente)",
      "le (expliqué | enseñé) todo paso a paso", "le (ayudé | enseñé) (mucho | todo)",
    ] },
    // "Paciencia." (only while she asks what made it work)
    made_ctx: { patterns: ["[la | el | buena | mucha] (planeacion | planificacion | comunicacion | preparacion | organizacion | paciencia | trabajo en equipo | comunicacion con el cliente | escuchar)"] },
    made_any_ctx: { patterns: [
      "(porque | pues | mas que nada | basicamente | supongo que) {w:any}",
      "[porque | mas que nada] (trabajé | trabajamos | planeé | hablé | escuché | probé | hice | hicimos | usé | usamos | me enfoqué | nos enfocamos) {w:any}",
    ] },
    team_effort: { patterns: [
      "fue (un trabajo en equipo | trabajo en equipo | un esfuerzo de equipo | un esfuerzo del equipo | cosa de todo el equipo | gracias al equipo | de todo el equipo) #h:team_effort",
      "(todo | fue) (el equipo | todo el equipo | de todos)",
      "el equipo (hizo | ayudó) (mucho | casi todo | la mayor parte)",
      "tuve (mucha | muchisima) ayuda",
      "no lo (hubiera | habria) (logrado | hecho) sin (el equipo | mi equipo | todos | ustedes | ayuda)",
      "(lo hicimos | trabajamos) (juntos | en equipo)",
      "(trabajo en equipo | el trabajo en equipo | fuimos todos | fue de todos | el equipo | todo el equipo | mi equipo)",
    ] },
    thanks_praise: { patterns: [
      "[gracias] (eso | esto) significa mucho [para mi] #h:means_lot",
      "[gracias] (de verdad | en serio) (lo | te lo) aprecio [mucho] #h:appreciate_that",
      "[gracias] (lo | te lo) aprecio [mucho] [de verdad]",
      "(me da [mucho] gusto | me alegra | me alegro de | me da gusto) (que (haya | hayan) (servido | ayudado | funcionado) | escuchar eso | oir eso | que te (haya gustado | guste)) #h:glad_helped",
      "[gracias] (me da [mucho] gusto | me alegra [mucho] | me alegro [mucho]) [de verdad]",
      "(que | muy) (amable | lindo | bonito) de tu parte",
      "(que | muy) (bueno | padre | bonito) (escuchar | oir) eso",
      "gracias por (decirmelo | decir eso | notarlo | el reconocimiento | tus palabras | el cumplido)",
      "[gracias] yo tambien estoy (orgulloso | orgullosa) [de eso]",
      "[gracias] (le eché | le puse) [muchas] ganas",
      "[gracias] (trabajé | me esforcé) mucho (en eso | en ese proyecto)",
      "[gracias] (lo disfruté | me gustó) mucho [ese proyecto | hacerlo]",
      "(fue | estuvo) muy divertido", "no me lo esperaba",
      "[no] gracias a ti [por (decirlo | decirmelo | notarlo)]",
    ] },
    deflect: { patterns: [
      "no fue nada [especial | en realidad]",
      "no (fue | es) (para tanto | gran cosa | tan dificil | tan importante)",
      "(tuve | fue) [pura] suerte",
      "cualquiera (lo hubiera hecho | podria hacerlo | lo podria hacer | lo habria hecho)",
      "(solo | nomas) hice mi trabajo",
      "(es | era) [solo] mi trabajo",
      "no creo que (fuera | sea) para tanto",
      "no (me lo merezco | lo merezco)",
      "(ay | ya) no exageres", "exageras",
      "no es para tanto",
    ] },

    // --- the feedback ---------------------------------------------------------------------------------------
    want_feedback: { patterns: [
      "[claro | si | por supuesto | ok | va | sale] (dime | dimelo | adelante) #h:sure_go_ahead",
      "[claro | si | por supuesto] (te | le) escucho #h:listening",
      "[si | claro] (se | sea) (honesta | honesto | sincera | directa) [conmigo] #h:be_honest",
      "[tranquila] puedo con (eso | ello | lo que sea | todo) #h:can_take",
      "[si] me (gustaria | encantaria) (escucharla | escucharlo | oirla | oirlo | saberlo | escucharte)",
      "[claro | si] (puedes | me puedes dar | me puede dar) @fb",
      "para eso (estamos | es la reunion)",
      "(quiero | me gustaria) (saberlo | escucharlo | oirlo)",
      "(que es | de que se trata)",
      "no me molesta [claro] [dime | adelante | te escucho]", "no (hay problema | pasa nada) [claro] (dime | adelante | te escucho)", "soy todo oidos", "(estoy | ya estoy) (listo | lista) [para escucharlo | para escucharte]",
      "[si] (que pasa | que pasó | que hice | es algo malo | es algo grave)",
      // "¿Sobre qué?" / "¿Hice algo mal?": she says it
      "(sobre que | de que) [es | seria]", "[ay] (hice algo mal | hice algo malo | que hice mal)",
    ] },
    no_feedback: { patterns: [
      "(mejor | tal vez | quizas) (otro dia | luego | despues | en otra ocasion | la proxima)",
      "(tengo | es necesario) que",
      "(podemos | se puede) (saltar | brincar | dejar) (eso | esa parte)",
      "no (quiero | necesito) @fb [ahorita | hoy | ahora]",
      "preferiria que no",
      "no (quiero | me gustaria) (escucharlo | oirlo | saberlo | escucharte)", "no estoy (listo | lista) [todavia | para eso]", "no me (digas | lo digas) [nada] [ahorita | hoy]",
      "(podemos | mejor) (hablarlo | verlo) (despues | luego | otro dia)",
    ] },
    fb_thanks: { patterns: [
      "[gracias] (eso | esto) me (sirve | ayuda) (mucho | muchisimo | bastante) #h:thanks_helpful",
      "[gracias] [eso | esto] (es | fue) (muy | super | bastante | realmente) (util | valioso) [para mi]",
      "gracias por (la | tu) (@fb | consejo | honestidad | sinceridad) #h:thanks_for_fb",
      "gracias por @fb",
      "(me parece | es) justo #h:thats_fair",
      "tiene [mucho | todo el] sentido #h:fair_enough",
      "(buen | es un buen) punto",
      "entiendo (lo que dices | tu punto | lo que quieres decir | a que te refieres) #h:see_what_mean",
      "(ya | ok) veo lo que (dices | quieres decir)",
      "tienes [toda la] razon #h:youre_right", "tiene [toda la] razon",
      "estoy de acuerdo [contigo]", "estoy totalmente de acuerdo",
      "(aprecio | agradezco) (tu honestidad | la retroalimentacion | tus comentarios | tu sinceridad)",
      "anotado #ack",
      "(soy | estoy) [un poco | muy | algo | bastante] (timido | timida | penoso | penosa)",
      "me da (pena | miedo | nervios) hablar [en (las @junta | publico)]",
      "(es | me es | me resulta) [muy | un poco] (dificil | complicado) [para mi] hablar en (las @junta | publico)",
      "[gracias] me (sirvió | ayudó) (mucho | muchisimo)",
      "(es | eso es) (verdad | cierto)",
      "(lo se | ya lo se | lo noté | yo tambien lo noté)",
      "(soy | fui | estuve | estaba) [muy | un poco | bastante] (callado | callada) [en (esas | las) @junta]",
      "casi no (hablé | dije nada) [en (esas | las) @junta]",
      "no (hablé | hablo | dije) (mucho | casi nada | lo suficiente) [en (esas | las) @junta]",
    ] },
    fb_work: { patterns: [
      "(voy a | lo voy a) trabajar (en eso | en ello) #h:work_on_that",
      "(voy a | lo voy a) trabajar",
      "[la proxima vez] voy a (hablar | participar | intervenir | opinar) (antes | mas | desde el principio | mas seguido) [en las @junta] [la proxima vez] #h:speak_up_more",
      "(la proxima vez | de ahora en adelante | desde ahora) (voy a | quiero) (hablar | participar) [antes | mas]",
      "lo (voy a | tengo que) (intentar | tomar en cuenta | tener en cuenta)",
      "lo (tomo | tomaré | tengo) en cuenta",
      "voy a hacer lo posible", "voy a echarle ganas",
      "lo (voy a | puedo) intentar", "lo intento",
      "(me pongo | me voy a poner) a trabajar en eso",
    ] },
    ask_example_fb: { patterns: [
      "(me puedes | me podrias | puedes | podrias | me puede | me podria) dar un ejemplo #h:give_example",
      "(dame | un) ejemplo", "(tienes | hay) (algun | un) ejemplo",
      "(en que | cuales) @junta #h:which_meetings",
      "cuando [fue eso | fue]", "(por ejemplo | como cuando | como que)",
      "(con que | cual) cliente",
      "(puedes | podrias) ser mas (especifica | especifico | concreta | concreto)",
      "a que te refieres [exactamente | con eso | con hablar antes]",
      "que quieres decir [con eso | exactamente]",
      "no (entiendo | entendi) (a que te refieres | que quieres decir | lo que dices)",
      "por que (dices | lo dices | piensas) (eso | asi)", "por que lo (dices | piensas)",
      // "¿Las juntas con clientes?" / "¿Hablar antes?": her words asked back
      "(en)? las @junta con (clientes | el cliente | los clientes)", "(hablar | participar) antes",
    ] },
    // "¿Qué debería hacer?" / "¿Cómo lo hago?": how, not an example
    ask_how_fb: { patterns: [
      "que (deberia | debí | puedo | podria) (hacer | decir) [diferente | distinto | entonces]",
      "como (lo hago | puedo hacerlo | le hago | hablo antes | puedo hablar antes | lo puedo hacer)",
    ] },
    pushback: { patterns: [
      "yo lo veo [un poco | algo] (diferente | distinto) [la verdad] #h:see_differently",
      "lo veo [un poco | algo] (diferente | distinto)",
      "(yo | lo) recuerdo [un poco] (diferente | distinto)",
      "no (fue | es) (exactamente | del todo | tan) (asi | justo | cierto)",
      "no es toda la historia",
      "(te | le) puedo explicar [algo]",
      "(dejame | puedo) (explicar | explicarte | darte contexto | dar contexto)",
      // doubt is no agreement: "No sé si estoy de acuerdo" → "¿Por qué?" (never "Gracias por tomarlo tan bien")
      "no (estoy | se si estoy) [tan | muy] (seguro | segura) (de estar de acuerdo | de que sea (justo | cierto | asi))",
      "no se si estoy de acuerdo",
      "no creo que (sea | fue | fuera) (justo | cierto | asi) [del todo]",
      "no estoy (del todo | totalmente | completamente | cien por ciento) de acuerdo", "no estoy de acuerdo (del todo | totalmente | completamente)",
      "no me parece [del todo | muy | tan] justo",
      "(en parte | un poco) no estoy de acuerdo",
      "con todo respeto no estoy de acuerdo",
      "[pero] (en esas | en las dos | en las ultimas dos | esas) @junta tu presentaste mis @secc [@late_why] #ctx #h:you_presented",
      "tu (presentaste | hiciste | tomaste | cubriste | diste) mis @secc [en (esas | las dos | las) @junta] [@late_why] #ctx",
      "[es que | porque | fue porque] el cliente (llegó | llego) tarde [te acuerdas | recuerdas] #ctx #h:client_late",
      "[es que | porque] (no hubo | no habia | no tuvimos) [suficiente] tiempo #ctx",
      "se nos acabó el tiempo #ctx",
      "(queria | iba a | estaba lista para | estaba listo para | tenia planeado) (hablar | presentar) pero (tu presentaste (mis @secc | todo) | no hubo tiempo | el cliente llegó tarde | se acabó el tiempo) #ctx",
      "[la verdad] no (tuve | me dieron | hubo) (la | una)? oportunidad [de (hablar | presentar)] #ctx #h:no_chance",
      "no hubo tiempo para (mi | mis @secc) #ctx",
      // "No es verdad, el cliente llegó tarde": blunt, but the reason is there (a tip, and the reason wins)
      "[eso] no es (verdad | cierto | asi) [porque | es que] (el cliente (llegó | llego) tarde | tu presentaste mis @secc) #ctx #tip:soften",
      "(cortaron | quitaron | se saltaron) mis @secc #ctx",
      "tu (cortaste | quitaste | te saltaste) mis @secc #ctx",
      "tenia (mis @secc | mi parte) (lista | listas | listo | listos) [pero tu (la | las) presentaste] #ctx",
      "tu (las | la | lo) presentaste [@late_why] #ctx",
      "no (hablé | dije nada) [mucho] @late_why #ctx",
    ] },
    rude_push: { patterns: [
      "[eso] no es (verdad | cierto | justo)", "no tienes nada de razon", "no tiene razon",
      // "No tienes razón" said aloud is also "No, tienes razón" (rule 10): she asks which
      "no tienes razon #amb",
      "[eso] (es | esta) (mal | injusto | ridiculo | mentira | falso)",
      "(estas | estás) (equivocada | equivocado | mal)",
      "(mentira | falso)",
      "(fue | es) tu culpa",
      "no (fue | es) mi culpa",
      "no sabes de lo que hablas",
      "no estoy de acuerdo [contigo | con eso] [para nada]",
      "(estoy en desacuerdo | no estoy nada de acuerdo)",
    ] },
    defensive_fb: { patterns: [
      "yo siempre (hablo | participo) en las @junta",
      "no (necesito | tengo que) hablar [en las @junta]",
      "(no es | ese no es | eso no es) mi trabajo [presentar | hablar con clientes]",
      "soy (disenador | disenadora) no (vendedor | vendedora | presentador | presentadora)",
      "mi trabajo habla por si (solo | mismo)", "(mis disenos | los disenos) hablan por si solos",
      "no me gusta (presentar | hablar en publico | hablar con clientes | hablar en las @junta)",
      "prefiero (escuchar | quedarme callado | quedarme callada)",
      "por que (tengo que | deberia) hablar [mas]",
      "no (voy a | pienso) (hablar | cambiar | intentarlo | participar) [antes | mas]", "no lo (voy a | pienso) intentar", "no (voy a | pienso) trabajar en (eso | ello)",
      "no (me sirve | es util | me parece util) [para nada]",
      "a los clientes no les importa (el diseno | lo que yo diga | los disenadores)",
    ] },
    protect_idea: { patterns: [
      "(podemos | podriamos | puedes | podrias) (poner | anotar | agregar | incluir) mis (@secc | nombre) en @agenda #agenda #h:put_agenda",
      "(pon | ponemos | pongamos | agrega | anota | anotamos) mis (@secc | nombre) en @agenda #agenda",
      "(tal vez | quizas | a lo mejor) (poner | ponemos | podemos poner) mis (@secc | nombre) en @agenda #agenda",
      "(y si | que tal si | que te parece si) (ponemos | pongo | anotamos | agregamos | pones) mis (@secc | nombre) en @agenda #agenda",
      "(podemos | podriamos) (acordar | decidir) [antes] quien presenta que [antes de la @junta] #agenda",
      "(repartir | asignar | repartamos) las @secc antes [de la @junta] #agenda",
      "(puedo | podria) presentar mis [propias] @secc [yo] #h:present_own",
      "(puedo | podria) presentar yo mis @secc",
      "(puedo | podria) (hablar | presentar | ir) primero [en la @junta | la proxima vez]",
      "(dame | me das | me puedes dar) los primeros (cinco | diez | quince) minutos",
      "(podemos | podriamos) (respetar | mantener | guardar) mi (tiempo | turno | espacio | parte) [aunque (el cliente llegue tarde | cambie el plan | cambie la agenda)] #h:keep_slot",
      "(tal vez | quizas | a lo mejor) una (llamada | junta | reunion | platica) (rapida | corta) antes [de la @junta] #h:prep_call",
      "(podemos | podriamos) (vernos | hablar | platicar | prepararnos | reunirnos) antes [de la @junta]",
      "(me puedes | puedes | podrias | me podrias) (avisar | decir | preguntar) antes [de cambiar (el plan | la agenda) | de presentar mis @secc]",
      "(avisame | dime | preguntame) antes [de cambiar (el plan | la agenda)] [la proxima vez]",
      "(podemos | podriamos) (practicar | ensayar) [juntos | juntas] [antes [de la @junta]]",
      "(deberiamos | podriamos) (planearlo | prepararlo | practicarlo) (juntos | antes | con tiempo)",
      "(tal vez | quizas) (practicar | ensayar) [antes]",
      "(practicar | ensayar) (antes | juntos | juntas | con tiempo)",
      "[poner] mis @secc en @agenda [con mi nombre] #agenda", "(ponerlas | ponerlos | ponerla) en @agenda [con mi nombre] #agenda", "con mi nombre en @agenda #agenda",
      "en (la agenda | el orden del dia) [con mi nombre] #agenda",
      "que me (avises | digas | preguntes) antes [de (cambiar el plan | cambiar la agenda | presentar mis @secc)]",
      "(hablar | presentar | ir) primero",
      "(puedo | podria) (presentar | hablar) yo", "que yo (presente | hable) (mis @secc | primero)",
      "(quiero | quisiera | me gustaria) (presentar | hablar) (mis @secc | yo | primero) [la proxima vez]",
      "(respetar | mantener | guardar) mi (tiempo | turno | parte)",
    ] },

    // --- the wrong tab -----------------------------------------------------------------------------------------
    tab_point: { patterns: [
      "creo que (esa | esta | eso) es la @rev de (otra persona | alguien mas | otro | otra | pablo) [en (la pantalla | la computadora | tu computadora)] #h:someone_else",
      "(esa | esta | eso) es (la @rev)? de (otra persona | alguien mas | pablo) [en (la pantalla | la computadora)]",
      "(esa | esta) no es (mi @rev | la mia | mia) #h:not_mine",
      "creo que (esa | esta) no es (mi @rev | la mia | mia)",
      "creo que (abriste | tienes abierta | estas viendo) (la | el) (pestana | ventana | evaluacion | hoja | archivo) (equivocada | equivocado) #h:wrong_tab",
      "(abriste | tienes) (la | el) (pestana | ventana | archivo | evaluacion) (equivocada | equivocado)",
      "(pestana | archivo | evaluacion | ventana) equivocada",
      "es (la @rev | la) de pablo", "esa es la de pablo",
      "[creo que] no deberia ver (esto | eso)",
      "esa no soy yo", "ese no soy yo",
      "[creo que] te equivocaste de (pestana | archivo | evaluacion | persona | ventana)",
    ] },
    // "¿Esa es mi evaluación?" (a tactful question) / "Esa es la mía." (the learner takes it as theirs)
    tab_check: { patterns: ["(esa | esta) es (mi @rev | la mia | mia)", "es (mi @rev | la mia)", "mis (calificaciones | notas) (son | estan | se ven) [muy] (buenas | bien | malas | bajas)",
      "(ese | esa | este | esta) soy yo"] },
    // "Se ve bien." (takes it as theirs) / "¿Quién es?" (only while her laptop shows the review)
    tab_look_ctx: { patterns: ["[todo] (se ve | esta | me parece que esta | se ven) [muy | super | bastante] (bien | perfecto | padre | genial | bien todo)", "quien es [ese | este | el | esa | esta]"] },
    tab_read: { patterns: [
      "[wow | ay | uy | oh] pablo (tiene | sacó | saco | le pusieron) [una | unas] (calificacion | calificaciones | nota | notas | evaluacion) [muy] (baja | bajas | mala | malas)",
      "[wow | ay | uy] la (calificacion | nota | evaluacion) de pablo (es | esta) [muy] (baja | mala | peor que la mia)",
      "pablo (tiene | sacó | saco) (menos | peor) (calificacion | nota) que yo",
      "(dice | aqui dice) que pablo (tiene | sacó) [una] (calificacion | nota) (baja | mala)",
      "a pablo (le fue mal | no le fue bien)",
      "pablo (tiene | sacó | saco) [un | una] {number}",
    ] },

    // --- goals ------------------------------------------------------------------------------------------------
    goal_name: { patterns: [
      "me (gustaria | encantaria) (mejorar | trabajar en | enfocarme en | aprender | desarrollar | crecer en | estudiar) [mi | mis | mas] {goal} [el proximo ano | el ano que entra] #h:work_on",
      "(quiero | quisiera | espero | pienso) (mejorar | trabajar en | enfocarme en | aprender [mas sobre] | estudiar) [mi | mis] {goal} [el proximo ano | el ano que entra]",
      "me (gustaria | encantaria) (tomar | hacer | estudiar) un (curso | taller | diplomado) (de | en | sobre) {goal} [el proximo ano] #h:take_course",
      "(quiero | quisiera | necesito | pienso | espero) (tomar | hacer) un (curso | taller | diplomado) (de | en | sobre) {goal}",
      "me (gustaria | encantaria) ser (mentor | mentora) [de (los practicantes | la gente nueva)] #g:mentoring #h:more_mentoring",
      "(tal vez | quizas | a lo mejor) un (curso | taller | diplomado) de {goal} #h:course_q",
      "(tal vez | quizas | a lo mejor | probablemente) {goal} [el proximo ano]",
      "me (gustaria | encantaria) (dirigir | liderar | llevar | coordinar | encabezar) un proyecto (pequeno | chico) [el proximo ano] #h:lead_project #g:leading",
      "(quiero | quisiera) (dirigir | liderar | llevar | coordinar) un proyecto (pequeno | chico) [el proximo ano] #g:leading",
      "me (gustaria | encantaria) (hacer | dar) [mas] {goal}", "(quiero | quisiera) (hacer | dar) [mas] {goal} [el proximo ano]",
      "me (interesa | interesan | interesaria | llama la atencion) [mucho | mas] [un curso de] {goal} [el proximo ano]",
      "me (gustaria | encantaria) (ayudar | ensenar | capacitar | acompanar) a los (practicantes | nuevos | becarios | juniors) #g:mentoring",
      "me (gustaria | encantaria) (presentar | hablar) mas [(a | con | ante) [los] clientes | en las @junta] [el proximo ano] #g:presenting #h:present_more",
      "(quiero | quisiera) (ser | sentirme) (mejor presentador | mejor presentadora | mas seguro | mas segura) (con los clientes | en las @junta) #g:presenting",
      "(quiero | quisiera | me gustaria) (llegar a ser | ser) (lider | lider de equipo | jefe | jefa) #g:leadership",
      "{goal} (y | o) {goal2:goal}",
      "(quiero | quisiera) ser (mentor | mentora) #g:mentoring",
      "(quiero | me gustaria | quisiera) (hablar | presentar) (mejor | con mas confianza) (en las @junta | con los clientes | frente a los clientes) #g:presenting",
      "(prefiero | preferiria) [mejor] [un curso de | trabajar en] {goal}",
      // "Presentaciones no, mejor un curso de datos": the second is the goal
      "(no | nada de) {neg:goal} (sino | mejor) [un curso de] {goal}",
      "mejor un (curso | taller) de {goal}",
    ] },
    // "Quiero dejar de presentar." / "Menos mentoría.": never the goal itself (answered like a vague goal)
    goal_not: { patterns: [
      "(quiero | quisiera | me gustaria | necesito) (dejar de | evitar) [hacer | dar] {goal} [el proximo ano]",
      "(quiero | quisiera | me gustaria) (hacer | tener | dar) menos {goal} [el proximo ano]",
      "(quiero | quisiera | me gustaria) (presentar | hablar | ensenar) menos [el proximo ano]",
      "(quiero | quisiera | me gustaria) dejar de (presentar | hablar con clientes | dar mentoria | dirigir proyectos)",
      "(menos | nada de | sin) {goal} [el proximo ano] [por favor]",
      "lo que sea menos {goal}",
      "no (quiero | me gustaria) (hacer | trabajar en | tomar | mejorar | dirigir | dar) [mas] {goal} [el proximo ano]",
      "no quiero [mas] {goal} [el proximo ano]", "{goal} no",
      "no (quiero | me gustaria) (tomar | hacer) (ningun | un) (curso | taller)", "no (quiero | me gustaria) (tomar | hacer) (un | ningun) (curso | taller) de {goal}",
      "no (quiero | me gustaria) (dirigir | liderar | llevar) (un proyecto | proyectos)",
      "no (quiero | me gustaria) (presentar | ser mentor | ser mentora)",
      "no me (interesa | interesan | llama la atencion) [mucho] [un curso de] {goal}",
    ] },
    // "Un curso." (from her own list of ideas): she asks which one
    goal_course: { patterns: [
      "me (gustaria | encantaria) (tomar | hacer) (un | algun) (curso | taller | diplomado) [el proximo ano]",
      "(quiero | pienso | quisiera) (tomar | hacer) (un | algun) (curso | taller | diplomado) [el proximo ano]",
      "un (curso | taller) (estaria | seria) (bien | padre | bueno | interesante)",
    ] },
    goal_course_ctx: { patterns: ["[tal vez | quizas] (un curso | algun curso | un taller | una capacitacion) [tal vez | el proximo ano]"] },
    // "Análisis de datos." (only while she asks about goals)
    goal_ctx: { patterns: ["[tal vez | un | una] {goal} [creo | tal vez | el proximo ano]", "un curso de {goal}", "(curso | taller) de {goal}"] },
    // "¿Qué es UX writing?" (only while she asks about goals): the word, never the goal ("¿Qué significa…?" is global)
    goal_what_ctx: { patterns: ["(que es | en que consiste | de que se trata) [el | la | eso de] [un curso de | el curso de] {goal}"] },
    goal_vague: { patterns: [
      "(quiero | me gustaria | quisiera) (crecer | aprender | desarrollarme | mejorar) [mas] [como (disenador | disenadora) | profesionalmente]",
      "algo (nuevo | diferente | mas grande | con mas reto)", "algo nuevo mas retos",
      "(mas | nuevos) (retos | responsabilidades | proyectos)",
      "(quiero | me gustaria) (mas | nuevos) (retos | responsabilidades)",
    ] },
    ask_budget: { patterns: [
      "hay [un] presupuesto (para | de) (capacitacion | cursos | eso | un curso | capacitaciones) #h:training_budget",
      "(tenemos | hay) presupuesto [para eso]", "hay (dinero | fondos | apoyo) para (cursos | capacitacion | un curso | eso)",
      "(la empresa | linea clara | ustedes) (paga | pagan | cubre | cubren) (el curso | los cursos | eso | la capacitacion)",
      "(podrias | podrian | puede | pueden | podriais) pagar (el curso | eso | la capacitacion)",
      "cuanto (puedo | podemos) gastar [en (cursos | capacitacion | eso)]",
      "de cuanto es el presupuesto",
      "quien paga (el curso | eso | la capacitacion)",
      "el curso (lo paga | lo cubre) la empresa",
    ] },
    ask_support: { patterns: [
      "(podemos | podriamos) (practicar | ensayar) antes de (las @junta | cada @junta) [con (clientes | el cliente)] #h:practice_before",
      "me (ayudaria | serviria) (tener | recibir)? (retroalimentacion | comentarios | feedback) (mas seguido | seguido | constante | cada semana) #h:regular_feedback",
      "(puedo | podria) tener (tiempo | horas) para (el curso | estudiar | eso) #h:time_course",
      "(me puedes | podrias | me podrias) (ayudar | apoyar | asesorar) [con eso]",
      "(puedo | podria) tener un (mentor | mentora | coach)",
      "(puedo | podria) acompanarte a (las @junta | tus @junta)",
      "(me puedes | podrias | me podrias) dar (retroalimentacion | comentarios) despues de (las @junta | cada @junta | cada presentacion)",
    ] },
    // "Más tiempo." / "Un poco de práctica." (only while she asks what would help)
    support_ctx: { patterns: ["[un poco de | mas] (tiempo | practica | retroalimentacion | apoyo | ayuda) [para (el curso | estudiar | practicar)] [me ayudaria]", "que me (des | puedas dar) (retroalimentacion | comentarios) [despues de las @junta]", "un (mentor | mentora | coach) [me ayudaria]"] },

    // --- the role reversal -------------------------------------------------------------------------------------
    // "Claro, con gusto." (only while she asks for feedback)
    rev_ok_ctx: { patterns: [
      "[claro | por supuesto] con (gusto | mucho gusto) #h:happy_to", "(claro | por supuesto) lo intento",
      "(ay | uy | wow) (claro | sale | va)", "(puedo | te puedo) ser (honesta | honesto | sincera | sincero) #honest #h:honest_ok",
    ] },
    rev_decline: { patterns: [
      "no (quiero | me gustaria) (darte retroalimentacion | decir nada | hacer eso)",
      "(prefiero | preferiria) no [hacerlo | decir nada]",
      "(no me toca | no es mi lugar | es un poco incomodo | que incomodo | es raro)",
      "(tal vez | mejor) (luego | otro dia | la proxima)",
    ] },
    rev_worked: { patterns: [
      "lo que (funciona | funcionó | sale | salió) @very bien (es | fue) [tu] {mg:mgood} #h:rev_worked",
      "(me gusta | aprecio | valoro | me encanta) [mucho] [tu] {mg:mgood} #h:rev_appreciate",
      "tu {mg:mgood} (es | ha sido) [muy | super] (buena | bueno | importante | util | valiosa | valioso)",
      "(siempre | de verdad) (nos | me) escuchas #mg:listening", "(nos | me) escuchas [mucho | muy bien] #mg:listening", "escuchas (mucho | muy bien) #mg:listening",
      "sabes escuchar [muy bien] #mg:listening #h:great_listener",
      "tu puerta siempre esta abierta #mg:open_door #h:door_open",
      "(siempre estas | estas) disponible #mg:open_door", "es (facil | muy facil) hablar contigo #mg:open_door",
      "eres [muy] (honesta | directa | clara | justa | transparente) #mg:honesty",
      "[siempre] (estas | te mantienes) tranquila [bajo presion] #mg:calm",
      "nos (apoyas | defiendes | cuidas | respaldas) #mg:support",
      "eres [muy] (buena onda | amable | positiva) #mg:support",
      "eres [una] (buena | muy buena | gran | excelente) (jefa | lider) [ya] #mg:general", "eres [muy] (organizada | profesional | trabajadora) #mg:general",
      "(lo estas haciendo | lo haces) (muy bien | super bien) #mg:general", "haces un (gran | buen | muy buen) trabajo #mg:general",
      "todo (funciona | esta funcionando) [muy] bien #mg:general",
      "no eres [una] (mala | pesima) (jefa | lider) [para nada] #mg:general",
      // "No mandas correos en la noche" (a statement: you don't) is praise, never the tip "no mandes…"
      "[me gusta que] no (mandas | envias | escribes) correos @late_night #mg:general",
    ] },
    mg_ctx: { patterns: ["[tu | la] {mg:mgood}"] },
    rev_try: { patterns: [
      "algo que podrias (intentar | probar) [es | seria | son | serian] {mt:mtip} #h:rev_one_thing",
      "[bueno | pues] ya que (preguntas | me preguntas) [algo que podrias intentar es] {mt:mtip} #h:since_ask",
      "(tal vez | quizas | a lo mejor) {mt:mtip} #h:maybe_x",
      "(has pensado en | pensaste en) {mt:mtip} #h:thought_about",
      "yo [te] (sugeriria | recomendaria) {mt:mtip} #h:id_suggest",
      "(que tal | y si) {mt:mtip}",
      "{mt:mtip} (ayudaria | ayudarian | estaria bien | serian buena idea | seria buena idea)",
      "(necesitamos | nos haria falta | nos ayudaria | nos gustaria) {mt:mtip}",
      "(podrias | tal vez podrias) (tener | hacer | intentar | organizar) {mt:mtip} [con (nosotros | cada uno | el equipo)] [cada semana]",
      "[tal vez | quizas | por favor] no (mandes | mandar | envies | escribas) correos @late_night #mt:late_email",
      "(menos | sin | nada de) (correos | mensajes) @late_night #mt:late_email",
      "(deja de | dejar de) (mandar | enviar) correos @late_night #mt:late_email",
      "(mandas | envias | escribes) (correos | mensajes) [muy] (tarde | @late_night) #mt:late_email",
      "[que] no (mandes | envies) tantos (correos | mensajes) [@late_night] #mt:late_email", "que no (mandes | envies | escribas) correos @late_night #mt:late_email",
      "(hablar | platicar | reunirte) mas con (nosotros | cada uno | el equipo) #mt:one_on_ones",
      "(deberias | podrias) (relajarte | delegar mas | confiar mas en nosotros | preocuparte menos) #mt:other",
      "(podrias | tal vez podrias) (reunirte | hablar | platicar) con (cada uno | nosotros | cada quien) (cada semana | seguido | a solas | individualmente) #mt:one_on_ones",
      "(necesitamos | nos gustarian) prioridades [mas] claras #mt:priorities",
      "(dinos | dejar claro) que es [lo mas] (importante | urgente) #mt:priorities",
      "(no siempre | casi nunca) (nos dices | nos dejas claras | sabemos | esta claro) (las prioridades | cuales son las prioridades | que es lo mas importante) #mt:priorities",
      "(tal vez | quizas) (delegar | delegues | repartir) mas [trabajo | tareas] #mt:other",
      "las @junta (son | estan) [muy | demasiado | un poco] largas #mt:shorter_meetings",
      "las @junta (podrian | deberian) ser mas cortas #mt:shorter_meetings",
      "(tal vez | quizas) (relajarte | preocuparte menos | confiar mas en nosotros) #mt:other",
    ] },
    mt_ctx: { patterns: ["{mt:mtip}"] },
    rev_nothing: { patterns: [
      "(nada | nada la verdad | en realidad nada) [lo estas haciendo (muy bien | super bien | perfecto)]",
      "no se me ocurre nada", "no (puedo pensar en | encuentro) nada",
      "(eres | lo haces) (perfecta | perfecto)",
      "no (cambies | tienes que cambiar) nada", "yo no cambiaria nada",
      "todo (esta | va) (muy bien | perfecto | bien)",
      // "No mandas correos en la noche" (you don't): nothing to fix there, never the tip "no mandes…"
      "no (mandas | envias | escribes) correos @late_night",
    ] },
    rev_rude: { patterns: [
      "eres [una] (mala | pesima | terrible) (jefa | lider) #tip:kind",
      "eres [muy | demasiado] (nerviosa | lenta | desorganizada | insegura | caotica) #tip:kind",
      "(yo | pablo | otra persona | alguien mas | sofia) deberia ser (el jefe | la jefa) #tip:kind",
      "no sabes (dirigir | liderar | ser jefa) #tip:kind",
      "no (estas lista | eres buena jefa | eres buena para esto) #tip:kind",
      "tus (correos | juntas | reuniones) son (horribles | molestos | inutiles | una perdida de tiempo) #tip:kind",
      "no (nos | me) escuchas [nunca] #tip:kind", "nunca (nos | me) escuchas #tip:kind", "tu puerta nunca esta abierta #tip:kind",
    ] },

    // --- money and the closing -----------------------------------------------------------------------------------
    ask_raise: { patterns: [
      "(podemos | podriamos) hablar (de | sobre) [mi | un] (@pay | @raise | @promo) [primero | ahora | hoy | tambien] #h:ask_salary",
      "(y | que hay de | que pasa con) [lo de | lo del] (@pay | @raise | @promo)",
      "(voy a | puedo | podria) (tener | recibir) (@raise | @promo) [este ano | el proximo ano]",
      "hay (posibilidad | chance | oportunidad) de (@raise | @promo) [este ano | el proximo ano]",
      "(me gustaria | quisiera) (preguntar | hablar) (de | sobre | por) (@pay | @raise | @promo)",
      "(me van a dar | me dan | me toca | nos van a dar | me darian) (@raise | @promo)",
      "cuando (sabremos | vamos a saber | se sabe | se decide) [lo de] (los aumentos | el sueldo | los sueldos | los ascensos)",
      "[esta] @rev (afecta | va a afectar | cuenta para | influye en) (@pay | el aumento | mi ascenso) #h:affect_pay",
      "[creo que] (me merezco | merezco) (@raise | @promo) #tip:money_blunt",
      "(quiero | necesito | dame) (mas dinero | @raise | @promo) #tip:money_blunt",
      "(me gustaria | quisiera) [pedir] (@raise | @promo) [este ano | el proximo ano]",
      "esperaba (@raise | @promo) [este ano]",
      "(hay | habra) (aumento | aumentos) [este ano]",
      "(me van a | van a | me vas a) subir el sueldo", "cuando (hay | habra | son | se dan | dan) [los] aumentos",
      "cuando (sabremos | vamos a saber | se sabe | se decide | sabre | voy a saber) (lo de | lo del) (@raise | @promo | @pay)",
      "(esto | eso) (afecta | va a afectar | cuenta para) (@pay | el aumento | mi ascenso)",
      "quiero ganar mas #tip:money_blunt", "me pagan [muy] poco #tip:money_blunt",
      "(puedo | podria) pedir (@raise | @promo)",
      // "¿De cuánto es el aumento?" / "¿Me van a ascender?" / "¿Hay bono?": not decided yet (the same answer)
      "(de cuanto | cuanto) (es | seria | va a ser | sera) (el aumento | mi aumento | el bono | el ajuste)",
      "cuanto (me van a | me vas a | van a | nos van a) (subir | aumentar | dar)",
      "(me van a | me vas a | van a) (ascender | promover | subir de puesto) [este ano | el proximo ano]",
      "(hay | habra) [un] (bono | bonos) [este ano | de fin de ano]",
    ] },
    // "¿Cuál es mi calificación?" / "¿Cómo me fue?" / "¿Puedo ver mi evaluación?": her overall view, briefly
    ask_rating: { patterns: [
      "(cual es | cual fue | como es | como fue | que tal) mi (calificacion | evaluacion | nota | resultado) [general | final | de este ano]",
      "que (calificacion | nota) (tengo | me diste | me pusiste | saqué | saque | me tocó)",
      "como me (fue | va) [en la evaluacion | en general | este ano]", "como (salí | sali | quedé | quede) [en la evaluacion]",
      "(puedo | podria) ver mi (evaluacion | calificacion)",
      "(me puedes | podrias | me podrias) (mandar | enviar | pasar | ensenar | mostrar) mi (evaluacion | calificacion)",
    ] },
    ask_criteria: { patterns: [
      "que (tendria | tengo | necesitaria | necesito | debo | deberia) [que] hacer para (lograr | conseguir | tener | obtener)? (@promo | @raise) #h:promotion_need",
      "(me puedes | podrias | me podrias) dar un ejemplo de (que significa | lo que significa) supera [las] expectativas [aqui] #h:exceeds",
      "que (significa | quiere decir) supera [las] expectativas [aqui]",
      "que (cuenta | importa) [para (@promo | @raise | la decision)]",
      "como se (deciden | toman) (los aumentos | las decisiones de sueldo | los sueldos | los ascensos) #h:how_decided",
      "cuales son los criterios",
      "como se relacionan las calificaciones con (el sueldo | el dinero | los aumentos)",
      "como (puedo | podria) (conseguir | lograr) (@promo | @raise)",
      "que (necesitas | necesitarias) ver [de mi]",
      "que es supera [las] expectativas", "que (necesito | necesitaria) para (@promo | @raise)", "como (consigo | logro | puedo conseguir | puedo lograr) (@promo | @raise)",
    ] },
    no_more: { patterns: [
      "[no] creo que (es todo | eso es todo | seria todo) #h:no_thats_all",
      "[no] (no tengo | ya no tengo) [mas | otras | ninguna] (preguntas | pregunta) [por ahora | para ti | sobre (el sueldo | eso)]",
      "(ninguna pregunta | ninguna)",
      "(es todo | eso es todo) (de mi parte | por ahora)",
      "(estoy | creo que estoy) bien asi",
      "no (quiero | necesito) hablar (de @pay | del (sueldo | salario | dinero) | sobre @pay | de eso) [ahorita | hoy | por ahora] [gracias]",
    ] },
    // "Sí, tengo una pregunta más." (only where she asks for questions): a question is coming
    more_q_ctx: { patterns: ["[si] (tengo | tendria) (una | otra) (pregunta | duda) [mas] [para ti]", "[si] (una | otra) (pregunta | duda | cosa) mas", "[si] (una | otra) pregunta"] },
    propose_checkin: { patterns: [
      "(le damos | podemos darle | damos | le podemos dar) seguimiento (en un mes #month | el proximo mes #month | el mes que entra #month | pronto #soon | en unas semanas #weeks | en unas cuantas semanas #weeks | en dos semanas #weeks) #h:check_again",
      "(podemos | podriamos) (vernos | reunirnos | hablar | platicar) [otra vez | de nuevo] (en un mes #month | el proximo mes #month | el mes que entra #month | pronto #soon | en unas semanas #weeks | en unas cuantas semanas #weeks) [otra vez | de nuevo]",
      "(volvamos a | vamos a volver a | podemos volver a) (vernos | hablar | platicar | reunirnos) [en un mes #month | el proximo mes #month | pronto #soon]",
      "(a la misma hora | misma hora) el (proximo mes | mes que entra) #month",
      "nos vemos (en un mes | el proximo mes) #month",
      "cuando (es | sera) (nuestra | la) (proxima | siguiente) (reunion | junta | platica | revision | evaluacion) #when",
      "cuando nos (vemos | volvemos a ver | reunimos) [otra vez | de nuevo] #when",
    ] },
    // "Buena idea." / "Hagámoslo." (to her own suggestion)
    agree_idea: { patterns: [
      "(buena | muy buena | excelente) idea #h:good_idea", "suena (bien | muy bien | perfecto | genial) #h:sounds_good", "me parece (bien | muy bien | perfecto | genial | padre)", "hagamoslo",
      "(me gusta | me encanta) (la idea | eso)", "(eso)? (funciona | me funciona | me sirve)", "(si | claro) (por que no | hagamoslo)",
    ] },
    thanks_today: { patterns: [
      "[muchas] gracias por (hoy | la reunion [de hoy] | la junta [de hoy] | esta reunion | la evaluacion | esto | la platica | la conversacion | la retroalimentacion | lo de hoy | todo lo de hoy) #h:thanks_today",
    ] },
    // "Puede ser." / "Tal vez." (only at her suggested goal, her agenda idea and the check-in): no yes yet, she asks once more
    maybe_ctx: { patterns: ["[mmm | este | pues] (puede ser | tal vez | quizas | quiza | a lo mejor | depende | supongo) [creo]"] },
    // "Suena bien." / "A la misma hora está bien." (only while she proposes the check-in); asked back ("¿En un mes?"), no yes
    checkin_yes_ctx: { patterns: [
      "(en un mes | dentro de un mes | el proximo mes | el mes que entra) [a la misma hora]",
      "(en un mes | el proximo mes | el mes que entra | dentro de un mes) (esta bien | me parece bien | perfecto | me funciona)",
      "[perfecto] (a la misma hora | misma hora) [esta bien | perfecto | me funciona] #h:works_for_me",
      "(trato hecho | me late | nos vemos entonces | ahi nos vemos)",
      "(me parece bien | esta bien | perfecto | me funciona | suena bien | sale | va | de acuerdo) (en un mes | el proximo mes | el mes que entra | dentro de un mes | a la misma hora)",
    ] },
    checkin_no_ctx: { patterns: [
      "(tal vez | que tal | mejor) en (dos meses | dos semanas | tres semanas | seis semanas | unas semanas) [mejor]",
      "(podemos | podriamos) (hacerlo | vernos | reunirnos | dejarlo) en (dos meses | dos semanas | tres semanas | unas semanas | seis semanas) [mejor]",
      "(dos semanas | tres semanas | dos meses) (seria | es) mejor",
      "(podemos | podriamos) (vernos | hacerlo) (antes | despues | mas tarde | mas pronto)",
      "[mejor] (otro dia | otra fecha | otro horario)",
      "(en un mes | el proximo mes | a la misma hora | la misma hora) no", "no (suena bien | me parece | me funciona | me queda) [en un mes | a la misma hora]",
    ] },
  },

  lines: {
    // --- the start ------------------------------------------------------------------------------------
    hello: [
      t("¡Hola! | Pasa, | siéntate. | ¡Ay, | no! | Perdón, | perdón.", "Hi! | Come in, | sit down. | Oh, | no! | Sorry, | sorry.", "Hi! Come in, have a seat. Oh no! Sorry, sorry."),
      t("¡Hola! | Pasa, | pasa. | ¡Ay, | no, | no, | no! | ¡Perdón!", "Hi! | Come in, | come in. | Oh, | no, | no, | no! | Sorry!", "Hey! Come in, come in. Oh no, no, no! Sorry!"),
    ],
    plant_okay: [
      t("Bueno. | ¡Qué | buen | comienzo! | Gracias | por | tu | tiempo.", "Okay. | What a | good | start! | Thanks | for | your | time.", "Okay. Well, that was a great start. Thanks for making time."),
      t("Bueno. | La | planta | está | bien. | Más o menos. | Gracias | por | tu | tiempo.", "Okay. | The | plant | is | fine. | More or less. | Thanks | for | your | time.",
        "Okay. The plant is fine. Mostly. Thanks for making time."),
    ],
    hello_back: [
      t("¡Hola! | Pasa. | No te preocupes: | la | planta | ahora | vive | en | la | repisa.", "Hi! | Come in. | Don't worry: | the | plant | now | lives | on | the | shelf.",
        "Hi! Come in. Don't worry, the plant lives on the shelf now."),
    ],
    hello_back2: [t("Gracias | otra vez | por | tu | tiempo.", "Thanks | again | for | your | time.", "Thanks for making time again.")],
    plant_help: [
      t("No, | no, | quédate | ahí. | Uy. | Eso | sonó | muy | de | jefa.", "No, | no, | stay | there. | Whoa. | That | sounded | very | like a | boss.",
        "No, no, stay where you are. Wow. That sounded very managerial.", { flags: { 8: "muy de jefa: de + a role = typical of a boss." } }),
      t("Está bien, | es | solo | tierra. | Luego | la | limpio.", "It's fine, | it's | just | dirt. | Later | it | I'll-clean.", "It's fine, it's just dirt. I'll deal with it later.",
        { flags: { 5: "la: the dirt (la tierra)." } }),
    ],
    plant_ok_q: [t("Yo | estoy | bien. | La | planta, | no | tanto.", "I | am | fine. | The | plant, | not | so much.", "I'm fine. The plant, not so much.")],
    fine_thanks: [t("¡Bien, | gracias!", "Fine, | thanks!", "I'm fine, thanks!")],
    feeling_ask: [
      t("Entonces, | ¿cómo | te sientes | con | la | evaluación | de | hoy?", "So, | how | do you feel | about | the | review | of | today?", "So. How are you feeling about today?"),
      t("Antes | de | empezar: | ¿cómo | te sientes | con | todo | esto?", "Before | — | starting: | how | do you feel | about | all | this?",
        "So, before we start: how are you feeling about all this?", { flags: { 1: F_DE_ANTES } }),
    ],
    feeling_again: [t("¡En fin! | ¿Cómo | te sientes | con | la | evaluación?", "Anyway! | How | do you feel | about | the | review?", "Anyway! How are you feeling about today?")],
    feel_nervous: [
      t("¿La verdad? | Yo | también. | Es | mi | primera | vez | de | este | lado | de | la | mesa.", "Honestly? | Me | too. | It's | my | first | time | on | this | side | of | the | table.",
        "Honestly? Me too. It's my first time on this side of the table."),
      t("Es | totalmente | normal. | Yo | también | estoy | nerviosa, | y | soy | la | jefa.", "It's | totally | normal. | I | too | am | nervous, | and | I'm | the | boss.",
        "That's totally normal. I'm nervous too, and I'm the manager."),
    ],
    feel_nervous_back: [
      t("¿La verdad? | Yo | también. | Todavía | no me acostumbro.", "Honestly? | Me | too. | Still | I'm not used to it.", "Honestly? Me too. It doesn't get easier that fast."),
      t("Es | totalmente | normal. | Yo | también | estoy | nerviosa, | y | soy | la | jefa.", "It's | totally | normal. | I | too | am | nervous, | and | I'm | the | boss.",
        "That's totally normal. I'm nervous too, and I'm the manager."),
    ],
    feel_asked_back_back: [t("Qué | bueno. | ¿Yo? | Todavía | un | poco | nerviosa, | la verdad.", "How | good. | Me? | Still | a | little | nervous, | honestly.",
      "Glad to hear it. Me? Still a little nervous, honestly.")],
    emily_howareyou_back: [t("¿La verdad? | Todavía | un | poco | nerviosa. | ¿Y | tú?", "Honestly? | Still | a | little | nervous. | And | you?", "Honestly? Still a little nervous. And you?")],
    feel_fine: [
      t("Qué | bueno. | Yo, | no | tanto.", "How | good. | Me, | not | so much.", "Good. That makes one of us."),
      t("¡Qué | bien! | Debería | aprender | de | ti.", "How | nice! | I should | learn | from | you.", "Good! I should learn from you."),
    ],
    feel_curious: [t("Curiosidad: | eso | me gusta.", "Curiosity: | that | I like.", "Curious is good. I'll take curious.")],
    feel_bad: [t("¡Ay, | no! | Entonces | la | hago | cortita.", "Oh, | no! | Then | it | I'll-make | short.", "Oh no. Then I'll keep it short.",
      { flags: { 3: "la: the review (la evaluación).", 5: "cortita: the diminutive of corta, a friendly touch." } })],
    feel_unsure: [t("Te | entiendo. | La verdad, | yo | tampoco.", "You | I-understand. | Honestly, | me | neither.", "Fair. Honestly, me neither.")],
    feel_asked_back: [
      t("Qué | bueno. | ¿Yo? | La verdad, | un | poco | nerviosa. | Es | mi | primera | vez | de | este | lado | de | la | mesa.",
        "How | good. | Me? | Honestly, | a | little | nervous. | It's | my | first | time | on | this | side | of | the | table.",
        "Glad to hear it. Me? Honestly, a little nervous. First time on this side of the table."),
    ],
    emily_howareyou: [
      t("¿La verdad? | Un | poco | nerviosa. | Es | mi | primera | vez | de | este | lado | de | la | mesa. | ¿Y | tú?",
        "Honestly? | A | little | nervous. | It's | my | first | time | on | this | side | of | the | table. | And | you?",
        "Honestly? A little nervous. First time on this side of the table. And you?"),
    ],
    format: [
      t("Así | funciona: | primero | tu | autoevaluación, | luego | la | mía | y | después | las | metas | para | el | próximo | año.",
        "Like this | it works: | first | your | self-assessment, | then | — | mine | and | after that | the | goals | for | — | next | year.",
        "Here's how it works: first your self-assessment, then mine, then goals for next year.", { flags: { 6: F_ART_POSS, 13: F_EL_DAY } }),
      t("Es | sencillo: | tú | empiezas | con | tu | autoevaluación, | yo | te | comparto | la | mía | y | terminamos | con | las | metas.",
        "It's | simple: | you | start | with | your | self-assessment, | I | (with) you | share | — | mine | and | we-finish | with | the | goals.",
        "The format is simple: you start with your self-assessment, I share mine, and we finish with goals.", { flags: { 10: F_ART_POSS } }),
    ],
    proud_ask: [
      t("Empecemos. | ¿De | qué | estás | más | {m:orgulloso|f:orgullosa} | este | año?", "Let's start. | Of | what | are you | most | proud | this | year?", "Let's start. What are you most proud of this year?"),
      t("Tú | primero. | ¿De | qué | estás | más | {m:orgulloso|f:orgullosa} | este | año?", "You | first. | Of | what | are you | most | proud | this | year?", "You first. What are you most proud of this year?"),
    ],
    proud_again: [t("Cualquier | cosa. | Grande | o | pequeña.", "Any | thing. | Big | or | small.", "Anything at all. Big or small.")],
    proud_help: [t("¿En serio? | ¿Y | la | guía | del | sistema | de | citas? | A | los | de | soporte | les encanta.",
      "Really? | And | the | guide | for the | system | of | appointments? | — | The | people from | support | love it.",
      "Really? What about the booking system guide? Support loves it.", { flags: { 8: "a: marks who loves it (encantar works like gustar)." } })],
    proud_react: [
      t("¡Ah, | buen | ejemplo!", "Oh, | good | example!", "Oh, good one."),
      t("¡Sí! | Ese | fue | un | gran | logro.", "Yes! | That | was | a | big | achievement.", "Yes! That was a big one."),
    ],
    made_ask: [
      t("Qué | bien. | ¿Qué | hizo | que | funcionara?", "How | nice. | What | made | that | it-worked?", "Nice. What made it work?", { flags: { 5: "funcionara: the subjunctive after hacer que." } }),
      t("Me encanta. | ¿Por qué | crees | que | salió | tan | bien?", "I love it. | Why | do you think | that | it-turned-out | so | well?", "I love that. What do you think made it work?"),
    ],
    made_react: [
      t("Tiene | sentido. | Y | se nota.", "It has | sense. | And | it-shows.", "That makes sense. And it shows."),
      t("Muy | bien | pensado. | Es | justo | lo que | yo | también | vi.", "Very | well | thought. | It's | exactly | what | I | too | saw.", "Smart. That's exactly what I saw too."),
    ],
    made_help: [t("¡Qué | modestia! | Bueno, | yo | te lo | digo.", "What | modesty! | Okay, | I | it to you | I'll-tell.", "Modest! Okay, I'll tell you.")],
    team_react: [t("El | equipo | ayudó, | claro. | Pero | tú | mantuviste | todo | bajo | control.", "The | team | helped, | sure. | But | you | kept | everything | under | control.",
      "Team effort, sure. But you held it together.")],
    praise_guide: [
      t("Lo que | salió | muy | bien | fue | cómo | documentaste | el | sistema | de | citas. | Soporte | dejó | de | interrumpirte | cada | diez | minutos.",
        "What | turned out | really | well | was | how | you documented | the | system | of | appointments. | Support | stopped | — | interrupting you | every | ten | minutes.",
        "What worked really well was how you documented the booking system. Support stopped interrupting you every ten minutes.", { flags: { 13: "dejar de + infinitive = to stop doing." } }),
      t("Lo que | salió | muy | bien | fue | tu | guía | del | sistema | de | citas. | Ahora | soporte | resuelve | las | dudas | sin | ti.",
        "What | turned out | really | well | was | your | guide | for the | system | of | appointments. | Now | support | answers | the | questions | without | you.",
        "What worked really well was your booking system guide. Support answers questions without you now."),
    ],
    praise_rescue: [t("Lo que | salió | muy | bien | fue | cómo | sacaste adelante | el | proyecto | del | cliente. | Todos | estuvieron | tranquilos | y | aun así | entregamos | a tiempo.",
      "What | turned out | really | well | was | how | you pulled off | the | project | of the | client. | Everyone | stayed | calm | and | still | we-delivered | on time.",
      "What worked really well was how you rescued the client project. Everyone stayed calm, and we still delivered on time.")],
    praise_intern: [t("Lo que | salió | muy | bien | fue | cómo | ayudaste | al | practicante | nuevo. | Dice | que | le | enseñaste | todo | el | sistema | de | diseño | en | una | semana.",
      "What | turned out | really | well | was | how | you helped | the | intern | new. | He says | that | (to) him | you taught | all | the | system | of | design | in | one | week.",
      "What worked really well was how you helped the new intern. He says you taught him the whole design system in a week.")],
    praise_launch: [t("Lo que | salió | muy | bien | fue | el | lanzamiento | de | la | app. | Ni | un | solo | correo | enojado | del | cliente. | Eso | nunca | había | pasado.",
      "What | turned out | really | well | was | the | launch | of | the | app. | Not | one | single | email | angry | from the | client. | That | never | had | happened.",
      "What worked really well was the app launch. Not one angry email from the client. That's a first.")],
    praise_survey: [t("Lo que | salió | muy | bien | fue | la | encuesta | a | clientes. | Gracias a | ella | cambiamos | el | proceso | de | pago.",
      "What | turned out | really | well | was | the | survey | to | customers. | Thanks to | it | we-changed | the | process | of | payment.",
      "What worked really well was the customer survey. We actually changed the checkout because of it.")],
    praise_also: [t("Y | {X.the} | también. | ¡Qué | gran | año!", "And | {X.the} | too. | What a | great | year!", "And {X.the}, too. Honestly, a great year.")],
    praise_again: [t("En serio. | Fue | un | gran | trabajo.", "Seriously. | It was | a | great | job.", "Seriously. That was great work.")],
    praise_thanks_react: [
      t("Te lo | mereces.", "It (to yourself) | you-deserve.", "You earned it."),
      t("Lo | digo | en serio.", "It | I-say | seriously.", "I mean it."),
    ],
    deflect_react: [
      t("Oye. | Acepta | el | cumplido.", "Hey. | Accept | the | compliment.", "Hey. Just take the compliment."),
      t("Ah, | no. | Acepta | el | cumplido. | Inténtalo | otra vez.", "Uh, | no. | Accept | the | compliment. | Try it | again.", "Uh-uh. Take the compliment. Try again."),
    ],
    deflect_giveup: [t("Bueno, | bueno. | Igual | lo | voy | a | anotar.", "Okay, | okay. | Anyway | it | I'm going | to | write down.", "Okay, okay. I'm writing it down anyway.")],
    praise_help: [t("Puedes | decir | solo | “gracias”.", "You can | say | just | “thanks”.", "You could just say thanks.")],
    consent_ask: [
      t("¿Te | puedo | dar | también | un | poco | de | retroalimentación?", "(To) you | I-can | give | also | a | bit | of | feedback?", "Can I give you some feedback too?"),
      t("Ahora, | la | parte | difícil. | ¿Te | puedo | hacer | un | comentario?", "Now, | the | part | hard. | (To) you | I-can | make | a | comment?",
        "Now, the harder part. Can I give you some feedback?"),
    ],
    consent_no: [t("Ja. | Para | eso | es | la | reunión, | ¿no? | Es | algo | pequeño, | te lo | prometo.", "Ha. | For | that | is | the | meeting, | right? | It's | something | small, | it to you | I-promise.",
      "Ha. It's kind of the point of today. It's a small one, I promise.")],
    consent_just: [t("Bueno, | te lo | digo.", "Okay, | it to you | I'll-say.", "I'll just say it.")],
    fb_give: [t("Algo | que | podrías | intentar | es | hablar | antes | en | las | juntas | con | clientes.",
      "Something | that | you could | try | is | speaking up | earlier | in | the | meetings | with | clients.",
      "One thing you could try is speaking up earlier in client meetings.", { flags: { 9: F_JUNTA },
        neutral: t("Algo | que | podrías | intentar | es | hablar | antes | en | las | reuniones | con | clientes.",
          "Something | that | you could | try | is | speaking up | earlier | in | the | meetings | with | clients.", "One thing you could try is speaking up earlier in client meetings.") })],
    fb_detail: [
      t("En | las | últimas | dos, | casi | no dijiste | nada.", "In | the | last | two, | almost | you didn't say | anything.", "In the last two, you barely said a word."),
      t("Tienes | muy | buenas | ideas, | y | el | cliente | nunca | las | escucha.", "You have | very | good | ideas, | and | the | client | never | them | hears.", "You have great ideas, and the client never hears them.",
        { flags: { 8: "las: them (the ideas), an object pronoun." } }),
    ],
    fb_again: [
      t("¿Y? | ¿Qué | opinas?", "So? | What | do you think?", "So? What do you think?"),
      t("¿Cómo | lo | ves?", "How | it | do you see?", "How does that sound to you?"),
    ],
    fb_which: [t("Perdón, | ¿estás | de acuerdo | o | no?", "Sorry, | are you | in agreement | or | not?", "Sorry, do you agree or not?")],
    fb_help: [t("¿Estás | de acuerdo? | Está bien | si | no.", "Are you | in agreement? | It's okay | if | not.", "Do you agree? It's okay if you don't.")],
    fb_example: [t("Claro. | La | llamada | con | el | cliente | el | martes | pasado, | y | la | anterior.", "Sure. | The | call | with | the | client | — | Tuesday | last, | and | the | previous one.",
      "Sure. The call with the client last Tuesday, and the one before that.", { flags: { 6: F_EL_DAY } })],
    fb_example_more: [t("Es | todo | lo que | tengo, | la verdad.", "It's | all | what | I-have, | honestly.", "That's all I have, honestly.")],
    fb_how: [t("Habla | al | principio | de | la | llamada. | Aunque | sea | una | idea | pequeña, | dila.",
      "Speak up | at the | start | of | the | call. | Even if | it's | an | idea | small, | say it.",
      "Speak up early in the call. Even if it's a small idea, say it.", { flags: { 7: "sea: the subjunctive after aunque." } })],
    fb_accept_react: [
      t("Gracias | por | tomarlo | tan | bien.", "Thanks | for | taking it | so | well.", "Thanks for taking it so well."),
      t("Gracias. | No era | fácil | decirlo.", "Thanks. | It wasn't | easy | to say it.", "Thank you. That wasn't easy to say."),
    ],
    fb_practice: [t("Y | si | quieres, | practicamos | antes | de | la | próxima | junta | con | el | cliente.", "And | if | you-want, | we-practice | before | — | the | next | meeting | with | the | client.",
      "And if you want, we can practice before the next client meeting.", { flags: { 5: F_DE_ANTES, 8: F_JUNTA },
        neutral: t("Y | si | quieres, | practicamos | antes | de | la | próxima | reunión | con | el | cliente.", "And | if | you-want, | we-practice | before | — | the | next | meeting | with | the | client.",
          "And if you want, we can practice before the next client meeting.", { flags: { 5: F_DE_ANTES } }) })],
    fb_get_there: [t("Y | estoy | segura | de | que | lo | vas | a | lograr.", "And | I'm | sure | — | that | it | you're going | to | achieve.", "And honestly? You'll get there.",
      { flags: { 3: "estar seguro de que: de links segura to the clause." } })],
    fb_howso: [
      t("¿Ah, | sí? | ¿Por qué?", "Oh, | yes? | Why?", "Oh? How so?"),
      t("A ver... | cuéntame | más.", "Let's see... | tell me | more.", "Okay... tell me more?"),
    ],
    fb_rude_react: [t("Ah. | Bueno. | ¿Me | cuentas | más?", "Oh. | Okay. | (To) me | you-tell | more?", "Oh. Okay. Can you tell me more?")],
    fb_fair: [
      t("Ay. | Tienes | razón. | Presenté | tus | partes | porque | el | cliente | llegó | tarde.", "Oh. | You have | reason. | I presented | your | sections | because | the | client | arrived | late.",
        "Oh. You're right. I presented your sections because the client was late.", { flags: { 1: F_RAZON } }),
      t("Espera. | Es | cierto. | Tomé | tus | partes | cuando | el | cliente | llegó | tarde.", "Wait. | It's | true. | I took | your | sections | when | the | client | arrived | late.",
        "Wait. That's true. I took your sections when the client was late."),
    ],
    fb_fair2: [
      t("Es | justo. | Eso | fue | culpa | mía.", "It's | fair. | That | was | fault | mine.", "Fair enough. That's on me."),
      t("Es | justo. | Debí | darme cuenta.", "It's | fair. | I should have | noticed.", "Fair enough. I should have noticed that."),
    ],
    fb_defensive_react: [t("Te | entiendo. | Solo | creo | que | el | cliente | también | debería | escucharte.", "You | I-understand. | Just | I-think | that | the | client | too | should | hear you.",
      "I hear you. I just think the client should hear you too.")],
    fb_move_on: [t("Dejémoslo | ahí | por ahora.", "Let's leave it | there | for now.", "Let's leave it there for now.")],
    protect_ask: [
      t("Entonces, | ¿cómo | cuidamos | tu | tiempo | para | hablar | la | próxima | vez?", "So, | how | do we protect | your | time | for | speaking | the | next | time?",
        "So how could we protect your speaking time next time?"),
      t("¿Qué | te | ayudaría? | ¿Cómo | protegemos | tu | tiempo | con | el | cliente?", "What | (to) you | would help? | How | do we protect | your | time | with | the | client?",
        "What would help? How do we protect your time with the client?"),
    ],
    protect_again: [t("¿Alguna | idea? | Aunque | sea | pequeña.", "Any | idea? | Even if | it's | small.", "Any ideas? Even a small one.")],
    protect_help: [t("¿Y | si | ponemos | tus | partes | en | la | agenda, | con | tu | nombre?", "And | if | we-put | your | sections | on | the | agenda, | with | your | name?",
      "What if we put your sections on the agenda, with your name?")],
    protect_offer_q: [t("Tus | partes | en | la | agenda, | con | tu | nombre. | ¿Te parece?", "Your | sections | on | the | agenda, | with | your | name. | Does that work for you?",
      "Your sections on the agenda, with your name. Does that work for you?")],
    protect_decide: [t("Pongamos | tus | partes | en | la | agenda, | con | tu | nombre.", "Let's put | your | sections | on | the | agenda, | with | your | name.",
      "Let's put your sections on the agenda, with your name.")],
    protect_yes: [t("Perfecto. | Listo.", "Perfect. | Done.", "Great. Done.")],
    protect_no: [t("Bueno. | Piénsalo | y | me | dices | antes | de | la | próxima | reunión.", "Okay. | Think about it | and | (to) me | you-tell | before | — | the | next | meeting.",
      "Okay. Think about it, and tell me before the next meeting.", { flags: { 6: F_DE_ANTES } })],
    protect_agenda: [t("Buena | idea. | Tus | partes | van | en | la | agenda, | con | tu | nombre.", "Good | idea. | Your | sections | go | on | the | agenda, | with | your | name.",
      "Good idea. Your sections go on the agenda, with your name.")],
    protect_keep: [t("Y | las | respetamos | aunque | cambie | el | horario.", "And | them | we-keep | even if | changes | the | schedule.", "And we keep them even if the schedule changes.",
      { flags: { 1: "las: them (your sections), an object pronoun.", 4: "cambie: the subjunctive after aunque." } })],
    protect_ok: [
      t("Me parece | bien.", "It seems to me | good.", "That works for me."),
      t("Me gusta. | Vamos | a | intentarlo.", "I like it. | We're going | to | try it.", "I like that. Let's try it."),
    ],
    protect_agenda_too: [t("Y | pongamos | tus | partes | en | la | agenda | también.", "And | let's put | your | sections | on | the | agenda | too.", "And let's put your sections on the agenda, too.")],

    // --- the wrong tab ---------------------------------------------------------------------------------
    tab_show: [t("Bueno, | te | enseño | tu | evaluación. | Mira.", "Okay, | (to) you | I-show | your | review. | Look.", "Okay, let me show you your review. Here.")],
    tab_look: [t("Revísala | y | dime | qué | opinas.", "Look it over | and | tell me | what | you-think.", "Take a look and tell me what you think.")],
    tab_close: [
      t("¡Ay, | no! | Tienes | razón. | La | cierro. | Gracias, | en serio.", "Oh, | no! | You have | reason. | It | I'm-closing. | Thanks, | seriously.",
        "Oh no. You're right. Closing it. Thank you, seriously.", { flags: { 2: F_RAZON, 4: F_LA_IT } }),
      t("¡Ay! | Es | la | de | Pablo. | La | cierro | ahorita. | Gracias.", "Oh! | It's | the one | of | Pablo. | It | I'm-closing | right now. | Thanks.",
        "Oh! That's Pablo's. Closing it right now. Thank you.", { flags: { 2: "la de Pablo: Pablo's (la = the review).", 5: F_LA_IT, 7: F_AHORITA },
          neutral: t("¡Ay! | Es | la | de | Pablo. | La | cierro | ahora mismo. | Gracias.", "Oh! | It's | the one | of | Pablo. | It | I'm-closing | right now. | Thanks.",
            "Oh! That's Pablo's. Closing it right now. Thank you.", { flags: { 2: "la de Pablo: Pablo's (la = the review).", 5: F_LA_IT } }) }),
    ],
    tab_close_read: [t("¡Ay, | no! | Por favor, | olvida | lo que | viste. | La | cierro.", "Oh, | no! | Please, | forget | what | you-saw. | It | I'm-closing.",
      "Oh no. Please forget you saw that. Closing it.", { flags: { 6: F_LA_IT } })],
    tab_notice: [t("Espera. | Esa | no es | la | tuya. | Es | la | de | Pablo. | ¡Ay, | no, | perdón!", "Wait. | That | isn't | — | yours. | It's | the one | of | Pablo. | Oh, | no, | sorry!",
      "Wait. That's not yours. That's Pablo's. Oh no, sorry!", { flags: { 3: F_ART_POSS, 6: "la de Pablo: Pablo's (la = the review)." } })],
    tab_close_self: [t("La | cierro. | Error | mío.", "It | I'm-closing. | Mistake | mine.", "Closing it. My mistake.", { flags: { 0: F_LA_IT } })],
    tab_ben: [
      t("Yo | se lo | digo | a | Pablo.", "I | it to him | will-tell | — | Pablo.", "I'll tell Pablo myself.", { flags: { 3: F_PERS_A } }),
      t("Le | voy | a | avisar | a | Pablo.", "(To) him | I'm going | to | let know | — | Pablo.", "I'll let Pablo know about this.", { flags: { 4: F_PERS_A } }),
    ],
    tab_mine: [t("Listo. | Esta | sí | es | la | tuya.", "There. | This one | indeed | is | — | yours.", "Okay. This one is yours.", { flags: { 4: F_ART_POSS } })],
    tab_mine2: [t("La | buena | noticia: | no hay | sorpresas.", "The | good | news: | there are no | surprises.", "Good news: no surprises.")],

    // --- goals --------------------------------------------------------------------------------------------
    goals_ask: [
      t("Bueno, | ahora | el | futuro. | ¿En | qué | te gustaría | trabajar | el | próximo | año?", "Okay, | now | the | future. | On | what | would you like | to work | — | next | year?",
        "Okay, looking ahead. What would you like to work on next year?", { flags: { 8: F_EL_DAY } }),
      t("Ahora, | el | próximo | año. | ¿Hacia | dónde | quieres | crecer?", "Now, | — | next | year. | Toward | where | do you want | to grow?", "Now, next year. Where do you want to grow?",
        { flags: { 1: F_EL_DAY } }),
    ],
    goals_options: [t("Algunas | ideas: | presentar | a | clientes, | dirigir | un | proyecto | pequeño, | un | curso | o | dar | mentoría.",
      "Some | ideas: | presenting | to | clients, | leading | a | project | small, | a | course | or | giving | mentoring.",
      "Some ideas: presenting to clients, leading a small project, a course, or mentoring.")],
    goals_suggest: [
      t("¿Qué tal | las | presentaciones | a | clientes? | Va | con | la | retroalimentación.", "How about | — | presentations | to | clients? | It goes | with | the | feedback.",
        "How about client presentations? It fits with the feedback.", { flags: { 1: "las presentaciones: Spanish uses the article for a kind of thing." } }),
      t("Yo | te | sugeriría | las | presentaciones | a | clientes. | Va | con | lo que | hablamos.", "I | (to) you | would suggest | — | presentations | to | clients. | It goes | with | what | we-talked about.",
        "I'd suggest client presentations. It fits with what we talked about.", { flags: { 3: "las presentaciones: Spanish uses the article for a kind of thing." } }),
    ],
    goal_offer_q: [t("Las | presentaciones | a | clientes, | sí. | ¿Te parece | bien | como | meta?", "— | Presentations | to | clients, | yes. | Does it seem to you | good | as a | goal?",
      "Client presentations, yes. Does that work for you as a goal?", { flags: { 0: "las presentaciones: Spanish uses the article for a kind of thing." } })],
    goal_present: [
      t("Perfecto. | Además, | va | con | la | retroalimentación.", "Perfect. | Also, | it goes | with | the | feedback.", "Perfect. That fits with the feedback, too."),
      t("¡Sí! | Podrías | presentar | una | parte | completa | en | la | próxima | junta | con | el | cliente.", "Yes! | You could | present | a | section | full | at | the | next | meeting | with | the | client.",
        "Yes! You could present a full section at the next client meeting.", { flags: { 9: F_JUNTA },
          neutral: t("¡Sí! | Podrías | presentar | una | parte | completa | en | la | próxima | reunión | con | el | cliente.", "Yes! | You could | present | a | section | full | at | the | next | meeting | with | the | client.",
            "Yes! You could present a full section at the next client meeting.") }),
    ],
    goal_lead: [t("Genial. | En | enero | empieza | un | proyecto | pequeño | de | una | página web. | Podría | ser | tuyo.", "Great. | In | January | starts | a | project | small | for | a | website. | It could | be | yours.",
      "Great. There's a small website project starting in January. It could be yours.")],
    goal_learn: [t("Buena | elección. | Hay | un | muy | buen | curso | de | {X} | en | la | primavera.", "Good | choice. | There's | a | very | good | course | in | {X} | in | the | spring.",
      "Good choice. There's a great {X} course in the spring.")],
    goal_course: [t("¿Un | curso | de | {X}? | ¡Muy | buena | idea!", "A | course | in | {X}? | Very | good | idea!", "Oh, a {X} course? Great idea.")],
    goal_which_course: [t("¡Claro! | ¿Cuál? | Hay | de | UX | writing, | de | análisis | de | datos | o | de | liderazgo.",
      "Sure! | Which one? | There are | in | UX | writing, | in | analysis | of | data | or | in | leadership.",
      "Sure! Which one? There's UX writing, data analysis, or leadership.", { flags: { 3: "hay de…: (courses) in…; curso is understood." } })],
    goal_later: [t("Bueno. | Piénsalo | y | lo | vemos | la | próxima | vez.", "Okay. | Think about it | and | it | we'll-see | — | next | time.", "Okay. Think about it, and we'll choose one next time.",
      { flags: { 5: "la próxima vez: Spanish uses the article (= next time)." } })],
    goal_not: [
      t("Está bien, | es | válido. | Entonces | busquemos | otra | cosa.", "That's fine, | it's | fair. | Then | let's look for | another | thing.", "Okay, that's fair. Then let's find something else."),
      t("De acuerdo, | eso | no. | ¿Y | qué | sí | te gustaría?", "Okay, | that | not. | And | what | — | would you like?", "Okay, not that. So what would you like?",
        { flags: { 5: "sí stresses the contrast: what you DO want." } }),
    ],
    goal_mentor: [t("Lo | harías | muy | bien. | En | marzo | llegan | dos | practicantes | nuevos.", "It | you'd-do | very | well. | In | March | arrive | two | interns | new.",
      "You'd be great at that. We have two new interns starting in March.")],
    goal_set: [
      t("Lo | anoto | como | tu | meta.", "It | I'll-write-down | as | your | goal.", "I'll write that down as your goal."),
      t("Esa | va | a | ser | tu | meta | del | próximo | año.", "That | is going | to | be | your | goal | for the | next | year.", "Let's make that your goal for next year."),
    ],
    budget_amount: [t("Y | una | buena | noticia: | hay | presupuesto | para | capacitación. | $10,000 | por | persona | al año.",
      "And | a | good | piece of news: | there's | budget | for | training. | 10,000 pesos | per | person | a year.",
      "And good news: there's a training budget. 10,000 pesos per person, per year.", { say: "Y una buena noticia: hay presupuesto para capacitación. Diez mil pesos por persona al año." })],
    budget_yes: [t("¡Sí! | $10,000 | por | persona | al año.", "Yes! | 10,000 pesos | per | person | a year.", "Yes! 10,000 pesos per person, per year.",
      { say: "¡Sí! Diez mil pesos por persona al año." })],
    budget_again: [t("Sí: | $10,000 | al año. | Úsalo.", "Yes: | 10,000 pesos | a year. | Use it.", "Yep: 10,000 pesos a year. Use it.", { say: "Sí: diez mil pesos al año. Úsalo." })],
    budget_what: [t("¿En | qué | lo | usarías?", "On | what | it | would you use?", "What would you use it for?")],
    support_first: [t("Claro. | Pero | primero: | ¿cuál | es | la | meta?", "Sure. | But | first: | what | is | the | goal?", "Sure. But first: what's the goal?")],
    support_ask: [
      t("¿Qué | te | ayudaría | a | lograrlo?", "What | (to) you | would help | to | achieve it?", "What would help you get there?"),
      t("¿Y | qué | necesitas | de | mí?", "And | what | do you need | from | me?", "And what do you need from me?"),
    ],
    support_yes: [
      t("Claro que sí. | Lo | hacemos.", "Of course. | It | we'll-do.", "Absolutely. I can do that."),
      t("Trato hecho. | Lo | pongo | en | el | plan.", "Deal. | It | I'll-put | in | the | plan.", "Deal. Let's put it in the plan."),
    ],
    support_offer: [t("Bueno, | yo | te | puedo | dar | retroalimentación | después | de | cada | reunión | con | clientes.", "Well, | I | (to) you | can | give | feedback | after | — | every | meeting | with | clients.",
      "Well, I can give you feedback after every client meeting.", { flags: { 7: F_DE_ANTES } })],
    support_none: [t("Está bien. | Si | necesitas | algo, | nada más | dime.", "That's fine. | If | you-need | something, | just | tell me.", "Okay. If you need anything, just ask.")],

    // --- the role reversal ----------------------------------------------------------------------------------
    rev_ask: [t("Antes | de | terminar... | ¿te | puedo | pedir | retroalimentación | a | ti? | Sobre | mí, | como | jefa.",
      "Before | — | finishing... | (from) you | I-can | ask | feedback | from | you? | About | me, | as | boss.",
      "Before we wrap up... can I ask you for some feedback? On me, as a manager.", { flags: { 1: F_DE_ANTES, 7: "a ti repeats te, for emphasis." } })],
    rev_ask2: [t("Sé | {m:sincero|f:sincera}. | Puedo | con | eso.", "Be | honest. | I-can | with | that.", "Be honest. I can take it.", { flags: { 2: F_PODER_CON } })],
    rev_start: [
      t("Empieza | con | lo que | funciona, | si | hay | algo.", "Start | with | what | works, | if | there is | anything.", "Start with what's working, if anything."),
      t("A ver. | ¿Qué | está | funcionando?", "Let's see. | What | is | working?", "Okay. What's working?"),
    ],
    rev_worked_again: [t("¿Algo? | Lo que | sea. | Por favor, | di | que | sí.", "Anything? | Whatever | it-is. | Please, | say | that | yes.", "Anything at all? Please say yes.")],
    rev_worked_react: [
      t("Ay. | Qué | bonito | oír | eso.", "Oh. | How | lovely | to hear | that.", "Oh. That's really nice to hear."),
      t("Gracias. | No sabía | que | eso | ayudaba.", "Thanks. | I didn't know | that | that | helped.", "Thank you. I didn't know that helped."),
    ],
    rev_worked_react_general: [t("Ay. | Qué | bonito | oír | eso. | Gracias.", "Oh. | How | lovely | to hear | that. | Thanks.", "Oh. That's really nice to hear. Thank you.")],
    rev_one: [t("¿Y | algo | que | podría | intentar?", "And | something | that | I could | try?", "And one thing I could try?")],
    rev_something: [t("Algo | debe | haber.", "Something | must | there-be.", "There must be something.")],
    rev_giveup: [t("Bueno. | Si | se te ocurre | algo, | mi | puerta | está | abierta.", "Okay. | If | occurs to you | something, | my | door | is | open.", "Okay. If you think of something, my door's open.")],
    rev_hadnt: [
      t("No lo había | pensado | así. | Gracias.", "I hadn't | thought of it | that way. | Thank you.", "I hadn't thought of it that way. Thank you."),
      t("Mmm. | No lo había | pensado | así. | Gracias, | me | sirve | mucho.", "Hmm. | I hadn't | thought of it | that way. | Thanks, | (to) me | it-helps | a lot.",
        "Huh. I hadn't thought of it that way. Thanks, that's really helpful."),
    ],
    rev_tip_late_email: [t("Los | correos | en | la | noche. | Sí. | Es | justo.", "The | emails | at | — | night. | Yes. | It's | fair.", "The late-night emails. Yeah. That's fair.",
      { flags: { 3: "en la noche: Spanish uses la (= at night)." } })],
    rev_tip_priorities: [t("Prioridades | más | claras. | Tienes | razón, | ahorita | todo | parece | urgente.", "Priorities | more | clear. | You have | reason, | right now | everything | seems | urgent.",
      "Clearer priorities. You're right, everything feels urgent right now.", { flags: { 3: F_RAZON, 5: F_AHORITA },
        neutral: t("Prioridades | más | claras. | Tienes | razón, | ahora | todo | parece | urgente.", "Priorities | more | clear. | You have | reason, | now | everything | seems | urgent.",
          "Clearer priorities. You're right, everything feels urgent right now.", { flags: { 3: F_RAZON } }) })],
    rev_tip_one_on_ones: [t("Reuniones | uno a uno. | Bueno. | Cada | dos | semanas, | entonces.", "Meetings | one-on-one. | Okay. | Every | two | weeks, | then.", "Regular one-on-ones. Okay. Every other week, then.")],
    rev_tip_shorter_meetings: [t("Juntas | más | cortas. | Anotado. | Empiezo | hoy.", "Meetings | more | short. | Noted. | I'll-start | today.", "Shorter meetings. Noted. I'll start today.",
      { flags: { 0: F_JUNTA }, neutral: t("Reuniones | más | cortas. | Anotado. | Empiezo | hoy.", "Meetings | more | short. | Noted. | I'll-start | today.", "Shorter meetings. Noted. I'll start today.") })],
    rev_tip_more_feedback: [t("Más | retroalimentación. | ¿De | mí? | Qué | valiente.", "More | feedback. | From | me? | How | brave.", "More feedback. From me? That's brave.")],
    rev_tip_other: [t("Bueno. | Es | justo.", "Okay. | It's | fair.", "Okay. That's fair.")],
    rev_will: [t("Voy | a | trabajar | en | eso.", "I'm going | to | work | on | that.", "I'll work on that.")],
    rev_ouch: [t("Auch. | Bueno... | ¿qué | podría | hacer | diferente?", "Ouch. | Okay... | what | could I | do | differently?", "Ouch. Okay... what's one thing I could do differently?")],
    rev_decline_react: [t("No pasa nada. | Tal vez | la | próxima.", "It's okay. | Maybe | the | next (time).", "That's okay. Maybe next time.")],

    // --- money and the closing -----------------------------------------------------------------------------
    askme_ask: [
      t("Bueno, | es | todo | de | mi | lista. | ¿Tienes | alguna | pregunta | para | mí?", "Okay, | it's | all | from | my | list. | Do you have | any | question | for | me?",
        "Okay, that's everything on my list. Is there anything you want to ask me?"),
      t("Es | todo | de | mi | parte. | Tu | turno: | ¿alguna | pregunta?", "It's | all | from | my | side. | Your | turn: | any | question?", "That's it from me. Your turn: any questions for me?"),
    ],
    askme_else: [t("¿Algo | más?", "Anything | else?", "Anything else?")],
    askme_go: [t("Claro, | dime.", "Sure, | tell me.", "Sure, go ahead.")],
    money_q: [
      t("Buena | pregunta.", "Good | question.", "Good question."),
      t("Es | una | pregunta | justa.", "It's | a | question | fair.", "Fair question."),
    ],
    money_later: [t("Lo | vemos | al final, | ¿sí?", "It | we'll-see | at the end, | okay?", "Let's come back to it at the end.")],
    money_sure: [t("Claro, | hablemos.", "Sure, | let's talk.", "Sure, let's talk about it.")],
    money_back: [t("Ahora, | tu | pregunta | del | sueldo.", "Now, | your | question | about the | salary.", "Now, your salary question.")],
    money_noted: [t("Bueno. | Anotado.", "Okay. | Noted.", "Okay. Noted.")],
    my_review: [t("¿Tu | evaluación? | Muy | buena, | en serio. | Te la | mando | por | correo | hoy.", "Your | review? | Very | good, | really. | It to you | I'll-send | by | email | today.",
      "Your review? It's very good, honestly. I'll email it to you today.", { flags: { 5: "te la: it (la evaluación) to you." } })],
    money_when: [
      t("Los | aumentos | se deciden | el | próximo | mes, | después | de | las | evaluaciones.", "The | raises | are decided | — | next | month, | after | — | the | reviews.",
        "Salary decisions happen next month, after the reviews.", { flags: { 3: F_EL_DAY, 7: F_DE_ANTES } }),
      t("Los | aumentos | se deciden | el | próximo | mes, | cuando | terminen | todas | las | evaluaciones.", "The | raises | are decided | — | next | month, | when | are-finished | all | the | reviews.",
        "Salary decisions happen next month, once all the reviews are done.", { flags: { 3: F_EL_DAY, 7: "terminen: the subjunctive after cuando (a future time)." } }),
    ],
    criteria_honest: [t("¿Sinceramente? | Todavía | no sé.", "Honestly? | Still | I don't know.", "Honestly? I don't know yet.")],
    criteria_volunteer: [t("Y | si | te | preguntas | qué | cuenta: | la verdad, | todavía | no estoy | segura.", "And | if | yourself | you-wonder | what | counts: | honestly, | still | I'm not | sure.",
      "And if you're wondering what counts: honestly, I'm not sure yet.")],
    criteria_why: [t("El | formato | tiene | calificaciones, | pero | nadie | me | ha explicado | cómo | se relacionan | con | el | sueldo.",
      "The | form | has | ratings, | but | nobody | (to) me | has explained | how | they relate | to | the | salary.",
      "The form has ratings, but nobody's told me how they connect to pay.")],
    criteria_promise: [t("Déjame | averiguarlo. | Te | aviso | a más tardar | el | viernes.", "Let me | find it out. | (To) you | I'll-let-know | at the latest | — | Friday.",
      "Let me find out. I'll get back to you by Friday.", { flags: { 5: F_EL_DAY } })],
    sum_intro: [
      t("Muy | bien. | Hago | un | resumen.", "Very | good. | I'll-make | a | summary.", "Okay. Let me sum up."),
      t("Entonces, | para | resumir.", "So, | to | sum up.", "Okay, so, to sum up."),
    ],
    sum_agenda: [t("Tus | partes | van | en | la | agenda, | con | tu | nombre.", "Your | sections | go | on | the | agenda, | with | your | name.", "Your sections go on the agenda, with your name.")],
    sum_speak: [t("Vas | a | hablar | antes | en | las | juntas | con | clientes.", "You're going | to | speak up | earlier | in | the | meetings | with | clients.", "You'll speak up earlier in client meetings.",
      { flags: { 6: F_JUNTA }, neutral: t("Vas | a | hablar | antes | en | las | reuniones | con | clientes.", "You're going | to | speak up | earlier | in | the | meetings | with | clients.",
        "You'll speak up earlier in client meetings.") })],
    sum_goal: [t("Tu | meta: | {X}.", "Your | goal: | {X}.", "Your goal: {X}.")],
    sum_lead: [t("Tu | meta: | dirigir | un | proyecto | pequeño.", "Your | goal: | leading | a | project | small.", "Your goal: leading a small project.")],
    sum_budget: [t("Vas | a | usar | el | presupuesto | de | capacitación | para | el | curso.", "You're going | to | use | the | budget | for | training | for | the | course.",
      "You'll use the training budget for the course.")],
    sum_friday: [t("Y | yo | te | debo | una | respuesta | para | el | viernes.", "And | I | (to) you | owe | an | answer | by | — | Friday.", "And I owe you an answer by Friday.",
      { flags: { 7: F_EL_DAY } })],
    sum_anything: [
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Se me olvidó | algo?", "Did I forget | anything?", "Did I miss anything?"),
    ],
    anything_thanks: [t("Me da gusto | que | te | haya | servido.", "I'm glad | that | (to) you | it-has | helped.", "I'm glad it helped.", { flags: { 3: "haya: the subjunctive after me da gusto que." } })],
    checkin_ask: [
      t("Entonces | nos | vemos | otra vez | en | un | mes. | ¿A | la | misma | hora?", "Then | each other | we'll-see | again | in | a | month. | At | the | same | time?",
        "Then let's check in again in a month. Same time?"),
      t("Le | damos | seguimiento | en | un | mes, | ¿te parece?", "(To) it | we'll-give | follow-up | in | a | month, | does that work for you?",
        "Let's check in again in a month, okay?", { flags: { 0: F_SEG } }),
    ],
    checkin_again: [t("En | un | mes, | a | la | misma | hora. | ¿Te parece | bien?", "In | a | month, | at | the | same | time. | Does it seem to you | good?",
      "In a month, same time. Does that work for you?")],
    checkin_early: [t("Claro. | Hagámoslo.", "Sure. | Let's do it.", "Definitely. Let's do that.")],
    checkin_like_said: [t("Y | nos | vemos | otra vez | en | un | mes, | como | dijiste.", "And | each other | we'll-see | again | in | a | month, | as | you-said.",
      "And we check in again in a month, like you said.")],
    checkin_like_said_weeks: [t("Y | nos | vemos | otra vez | en | unas | semanas, | como | dijiste.", "And | each other | we'll-see | again | in | a few | weeks, | as | you-said.",
      "And we check in again in a few weeks, like you said.")],
    checkin_like_said_other: [t("Y | nos | vemos | pronto, | como | dijiste. | Te | mando | una | invitación.", "And | each other | we'll-see | soon, | as | you-said. | (To) you | I'll-send | an | invite.",
      "And we check in again soon, like you said. I'll send you an invite.")],
    checkin_when: [t("Buena | pregunta. | Lo | decidimos | al final.", "Good | question. | It | we'll-decide | at the end.", "Good question. Let's set that at the end.")],
    checkin_other: [t("Claro. | Te | mando | una | invitación | y | tú | escoges | la | hora.", "Sure. | (To) you | I'll-send | an | invite | and | you | choose | the | time.",
      "Okay. I'll send you an invite, and you pick the time.")],
    bye_good: [
      t("Perfecto. | Gracias | por | hoy. | De verdad.", "Perfect. | Thanks | for | today. | Really.", "Perfect. Thanks for today. Really."),
      t("Muy | bien. | Fue | una | muy | buena | conversación. | Gracias.", "Very | good. | It was | a | very | good | conversation. | Thanks.", "Great. This was a good one. Thank you."),
    ],
    bye_plant: [t("Y | otra vez, | perdón | por | lo de | la | planta.", "And | again, | sorry | for | the thing with | the | plant.", "And sorry again about the plant.")],
    bye_partial: [t("Bueno. | Gracias | por | hoy.", "Okay. | Thanks | for | today.", "Okay. Thanks for today.")],
    bye_early: [t("¡Ah! | Bueno. | Terminamos | otro | día, | entonces.", "Oh! | Okay. | We'll-finish | another | day, | then.", "Oh! Okay. Let's finish another time, then.")],
    welcome: [
      t("¡De nada!", "You're welcome!", "You're welcome!"),
      t("¡No hay de qué!", "Don't mention it!", "Don't mention it!"),
    ],
  },

  hints: {
    plant: {
      lt: "Ask if she's okay, or offer to help",
      items: [
        { id: "are_you_ok", s: t("¿Estás | bien?", "Are you | okay?", "Are you okay?") },
        { id: "can_i_help", s: t("¿Te | ayudo?", "(To) you | I-help?", "Can I help?") },
        { id: "dont_worry_plant", s: t("No te preocupes.", "Don't worry.", "Don't worry about it.") },
      ],
    },
    feeling: {
      lt: "Say how you feel about the review",
      items: [
        { id: "bit_nervous", s: t("¿La verdad? | Un | poco | {m:nervioso|f:nerviosa}.", "Honestly? | A | little | nervous.", "Honestly? A little nervous.") },
        { id: "fine", s: t("{m:Tranquilo|f:Tranquila}, | gracias.", "Calm, | thanks.", "I'm fine, thanks.") },
        { id: "curious", s: t("Con | curiosidad, | la verdad.", "With | curiosity, | honestly.", "A bit curious, actually.") },
        { id: "looking_forward", s: t("{m:Listo|f:Lista} | para | empezar.", "Ready | to | start.", "Ready to get started.") },
      ],
    },
    proud: {
      lt: "Say what you're most proud of this year", slot: "win", examples: ["guide", "launch", "survey", "rescue"],
      items: [
        { id: "most_proud", s: t("Estoy | muy | {m:orgulloso|f:orgullosa} | de | {X.the}.", "I am | very | proud | of | {X.the}.", "I'm most proud of {X.the}."), only: (e) => !e.attrs?.act },
        { id: "most_proud", s: t("Estoy | muy | {m:orgulloso|f:orgullosa} | de | haber | ayudado | a | {X.the}.", "I am | very | proud | of | having | helped | — | {X.the}.",
          "I'm most proud of helping {X.the}.", { flags: { 6: F_PERS_A } }), only: (e) => e.attrs?.act === "help" },
        { id: "most_proud", s: t("Estoy | muy | {m:orgulloso|f:orgullosa} | de | haber | sacado adelante | {X.the}.", "I am | very | proud | of | having | pulled off | {X.the}.",
          "I'm most proud of rescuing {X.the}."), only: (e) => e.attrs?.act === "rescue" },
        { id: "probably", s: t("Probablemente | {X.the}.", "Probably | {X.the}.", "Probably {X.the}."), only: (e) => !e.attrs?.act },
        { id: "probably", s: t("Probablemente | ayudar | a | {X.the}.", "Probably | helping | — | {X.the}.", "Probably helping {X.the}.", { flags: { 2: F_PERS_A } }),
          only: (e) => e.attrs?.act === "help" },
        { id: "went_well", s: t("Creo | que | {X.the} | salió | muy | bien.", "I-think | that | {X.the} | turned out | really | well.", "I think {X.the} went really well."),
          only: (e) => !e.attrs?.act },
      ],
    },
    made: {
      lt: "Explain what made it work",
      items: [
        { id: "team_effort", s: t("Fue | trabajo | en equipo.", "It was | work | as a team.", "It was a team effort.") },
        { id: "planned_early", s: t("Planeamos | todo | con tiempo.", "We-planned | everything | ahead of time.", "We planned everything early.") },
        { id: "listened_users", s: t("Escuché | a | los | usuarios.", "I-listened | to | the | users.", "I listened to the users.", { flags: { 1: F_PERS_A } }) },
        { id: "asked_questions", s: t("Hice | muchas | preguntas.", "I-asked | many | questions.", "I asked a lot of questions.") },
      ],
    },
    praise: {
      lt: "Accept the praise",
      items: [
        { id: "means_lot", s: t("Gracias, | eso | significa | mucho | para | mí.", "Thanks, | that | means | a lot | to | me.", "Thank you, that means a lot."),
          note: "Just take the compliment: no “no fue nada”." },
        { id: "appreciate_that", s: t("Gracias, | de verdad | lo | aprecio.", "Thanks, | really | it | I-appreciate.", "Thanks, I really appreciate that.") },
        { id: "team_effort", s: t("¡Gracias! | Fue | trabajo | en equipo.", "Thanks! | It was | work | as a team.", "Thanks! It was a team effort.") },
        { id: "glad_helped", s: t("Me da gusto | que | haya | servido.", "I'm glad | that | it-has | helped.", "I'm glad it helped.", { flags: { 2: "haya: the subjunctive after me da gusto que." } }) },
      ],
    },
    consent: {
      lt: "Agree to hear her feedback",
      items: [
        { id: "sure_go_ahead", s: t("Claro, | dime.", "Sure, | tell me.", "Sure, go ahead.") },
        { id: "listening", s: t("Claro, | te | escucho.", "Of course, | (to) you | I'm-listening.", "Of course. I'm listening.") },
        { id: "be_honest", s: t("Sí, | sé | honesta | conmigo.", "Yes, | be | honest | with me.", "Yes, please. Be honest.") },
        { id: "can_take", s: t("Tranquila, | puedo | con | eso.", "Don't worry, | I-can | with | that.", "I can take it.", { flags: { 2: F_PODER_CON } }),
          note: "From the song: “I can take it now.” Said when you're not afraid of criticism." },
      ],
    },
    receive: {
      lt: "Take the feedback",
      items: [
        { id: "thanks_helpful", s: t("Gracias, | eso | me | sirve | mucho.", "Thanks, | that | (to) me | helps | a lot.", "Thanks, that's really helpful."), note: "The song's phrase." },
        { id: "work_on_that", s: t("Voy | a | trabajar | en | eso.", "I'm going | to | work | on | that.", "I'll work on that."), note: "The song's phrase." },
        { id: "thats_fair", s: t("Me parece | justo.", "It seems to me | fair.", "That's fair.") },
        { id: "thanks_for_fb", s: t("Gracias | por | la | retroalimentación.", "Thanks | for | the | feedback.", "Thanks for the feedback.") },
        { id: "fair_enough", s: t("Tiene | sentido.", "It has | sense.", "That makes sense.") },
        { id: "see_what_mean", s: t("Entiendo | lo que | dices.", "I-understand | what | you're-saying.", "I see what you mean.") },
        { id: "speak_up_more", s: t("La | próxima | vez | voy | a | hablar | antes.", "The | next | time | I'm going | to | speak up | earlier.", "I'll speak up earlier next time.") },
        { id: "youre_right", s: t("Tienes | razón.", "You have | reason.", "You're right.", { flags: { 0: F_RAZON } }) },
      ],
    },
    example: {
      lt: "Ask for an example",
      items: [
        { id: "give_example", s: t("¿Me | puedes | dar | un | ejemplo?", "(To) me | can you | give | an | example?", "Could you give me an example?"), note: "The song's phrase." },
        { id: "which_meetings", s: t("¿En | qué | reuniones?", "In | which | meetings?", "Which meetings do you mean?") },
      ],
    },
    pushback: {
      lt: "Politely explain your side",
      items: [
        { id: "see_differently", s: t("Yo | lo | veo | un | poco | diferente.", "I | it | see | a | little | differently.", "I see it a bit differently."), register: "polite",
          note: "Disagree politely: a soft phrase first, then the facts, with no blame." },
        { id: "you_presented", s: t("En | esas | reuniones, | tú | presentaste | mis | partes.", "In | those | meetings, | you | presented | my | sections.", "In those meetings, you presented my sections.") },
        { id: "client_late", s: t("Es que | el | cliente | llegó | tarde, | ¿te acuerdas?", "The thing is | the | client | arrived | late, | remember?", "The client was late, remember?") },
        { id: "no_chance", s: t("La verdad, | no tuve | la | oportunidad.", "Honestly, | I didn't get | the | chance.", "To be fair, I didn't get the chance.") },
      ],
    },
    protect: {
      lt: "Suggest how to protect your speaking time",
      items: [
        { id: "put_agenda", s: t("¿Podemos | poner | mis | partes | en | la | agenda?", "Can we | put | my | sections | on | the | agenda?", "Could we put my sections on the agenda?") },
        { id: "present_own", s: t("¿Puedo | presentar | mis | propias | diapositivas?", "Can I | present | my | own | slides?", "Could I present my own slides?") },
        { id: "keep_slot", s: t("¿Podemos | respetar | mi | tiempo, | aunque | el | cliente | llegue | tarde?", "Can we | keep | my | time, | even if | the | client | arrives | late?",
          "Can we keep my slot, even if the client is late?", { flags: { 7: "llegue: the subjunctive after aunque." } }) },
        { id: "prep_call", s: t("¿Tal vez | una | llamada | rápida | antes | de | la | reunión?", "Maybe | a | call | quick | before | — | the | meeting?",
          "Maybe a quick prep call before the meeting?", { flags: { 5: F_DE_ANTES } }) },
      ],
    },
    tab: {
      lt: "Tactfully say the review on screen isn't yours",
      items: [
        { id: "someone_else", s: t("Creo | que | esa | es | la | evaluación | de | otra | persona.", "I-think | that | that | is | the | review | of | another | person.",
          "I think that's someone else's review on the screen."), register: "polite", note: "Don't read a colleague's ratings aloud: just say it isn't yours." },
        { id: "not_mine", s: t("Perdón, | creo | que | esa | no es | la | mía.", "Sorry, | I-think | that | that | isn't | — | mine.", "Sorry, I don't think that one's mine.",
          { flags: { 5: F_ART_POSS } }) },
        { id: "wrong_tab", s: t("Creo | que | abriste | la | pestaña | equivocada.", "I-think | that | you-opened | the | tab | wrong.", "I think you have the wrong tab open.") },
      ],
    },
    goals: {
      lt: "Say what you'd like to work on next year", slot: "goal", examples: ["presenting", "ux_writing", "leading", "mentoring"],
      items: [
        { id: "work_on", s: t("Me gustaría | trabajar | en | {X}.", "I'd like | to work | on | {X}.", "I'd like to work on {X}."),
          only: (e) => e.attrs?.kind === "skill" || e.attrs?.kind === "course" },
        { id: "take_course", s: t("Me gustaría | tomar | un | curso | de | {X}.", "I'd like | to take | a | course | in | {X}.", "I'd like to take a course in {X}."),
          only: (e) => e.attrs?.kind === "course" },
        { id: "course_q", s: t("¿Tal vez | un | curso | de | {X}?", "Maybe | a | course | in | {X}?", "Maybe a {X} course?"), only: (e) => e.attrs?.kind === "course" },
        { id: "present_more", s: t("Me gustaría | presentar | más | a | los | clientes.", "I'd like | to present | more | to | the | clients.", "I'd like to present more to clients."),
          only: (e) => e.attrs?.kind === "skill" },
        { id: "lead_project", s: t("Me gustaría | dirigir | {X.np}.", "I'd like | to lead | {X.np}.", "I'd like to lead {X.np}."), only: (e) => e.attrs?.kind === "lead" },
        { id: "more_mentoring", s: t("Me gustaría | ser | {m:mentor|f:mentora} | de | los | practicantes.", "I'd like | to be | (a) mentor | for | the | interns.", "I'd like to mentor the interns."),
          only: (e) => e.attrs?.kind === "mentor" },
      ],
    },
    support: {
      lt: "Ask for support with your goal",
      items: [
        { id: "training_budget", s: t("¿Hay | presupuesto | para | capacitación?", "Is there | budget | for | training?", "Is there a training budget?") },
        { id: "practice_before", s: t("¿Podríamos | practicar | antes | de | las | reuniones | con | clientes?", "Could we | practice | before | — | the | meetings | with | clients?",
          "Could we practice before client meetings?", { flags: { 3: F_DE_ANTES } }) },
        { id: "regular_feedback", s: t("Me | ayudaría | tener | retroalimentación | más | seguido.", "(To) me | it-would-help | to have | feedback | more | often.", "Some regular feedback would help.") },
        { id: "time_course", s: t("¿Podría | tener | tiempo | para | el | curso?", "Could I | have | time | for | the | course?", "Could I get some time for the course?") },
      ],
    },
    rev_open: {
      lt: "Agree to give Elena feedback",
      items: [
        { id: "happy_to", s: t("Claro, | con gusto.", "Sure, | gladly.", "Sure, I'd be happy to.") },
        { id: "honest_ok", s: t("Claro. | ¿Puedo | ser | {m:sincero|f:sincera}?", "Of course. | Can I | be | honest?", "Of course. Can I be honest?") },
      ],
    },
    rev_worked: {
      lt: "Say what Elena does well", slot: "mgood", examples: ["open_door", "calm", "honesty", "support"],
      items: [
        { id: "rev_worked", s: t("Lo que | funciona | muy | bien | es | tu | {X}.", "What | works | really | well | is | your | {X}.", "What works really well is your {X}."),
          note: "The song's phrase: first what works." },
        { id: "rev_appreciate", s: t("Aprecio | mucho | tu | {X}.", "I-appreciate | a lot | your | {X}.", "I really appreciate your {X}.") },
        { id: "great_listener", s: t("Sabes | escuchar | muy | bien.", "You-know-how | to listen | very | well.", "You're a great listener.") },
        { id: "door_open", s: t("Tu | puerta | siempre | está | abierta.", "Your | door | always | is | open.", "Your door is always open.") },
      ],
    },
    rev_try: {
      lt: "Suggest one thing she could try", slot: "mtip", examples: ["priorities", "one_on_ones", "late_email", "shorter_meetings"],
      items: [
        { id: "rev_one_thing", s: t("Algo | que | podrías | probar: | {X}.", "Something | that | you could | try: | {X}.", "One thing you could try: {X}."),
          note: "The song's phrase: after what works, one thing to try." },
        { id: "since_ask", s: t("Bueno, | ya que | preguntas: | {X}.", "Well, | since | you-ask: | {X}.", "Well, since you ask: {X}."), note: "From the song: “Well, since you ask…”" },
        { id: "maybe_x", s: t("¿Tal vez | {X}?", "Maybe | {X}?", "Maybe {X}?") },
        { id: "id_suggest", s: t("Yo | te | sugeriría | {X}.", "I | (to) you | would suggest | {X}.", "I'd suggest {X}."), only: (e) => !e.attrs?.fixed, note: "A soft piece of advice." },
        { id: "thought_about", s: t("¿Has pensado | en | {X}?", "Have you thought | about | {X}?", "Have you thought about {X}?"), only: (e) => !e.attrs?.fixed },
      ],
    },
    askme: {
      lt: "Ask about a raise or a promotion",
      items: [
        { id: "ask_salary", s: t("¿Podemos | hablar | de | mi | sueldo?", "Can we | talk | about | my | salary?", "Can we talk about my salary?") },
        { id: "affect_pay", s: t("¿Esta | evaluación | afecta | mi | sueldo?", "This | review | affects | my | salary?", "Will this review affect my pay?") },
        { id: "promotion_need", s: t("¿Qué | tendría | que | hacer | para | lograr | un | ascenso?", "What | would I have | to | do | to | get | a | promotion?", "What would I need to do to get a promotion?") },
        { id: "no_thats_all", s: t("No, | creo | que | es | todo.", "No, | I-think | that | it's | all.", "No, I think that's all.") },
      ],
    },
    criteria: {
      lt: "Ask what the decision depends on",
      items: [
        { id: "promotion_need", s: t("¿Qué | tendría | que | hacer | para | lograr | un | ascenso?", "What | would I have | to | do | to | get | a | promotion?", "What would I need to do to get a promotion?") },
        { id: "exceeds", s: t("¿Me | puedes | dar | un | ejemplo | de | lo que | significa | “supera | las | expectativas”?",
          "(To) me | can you | give | an | example | of | what | means | “exceeds | — | expectations”?", "Could you give me an example of what “exceeds expectations” means here?",
          { flags: { 9: "las expectativas: Spanish uses the article here." } }), note: "From the story “The Box Marked Potential”." },
        { id: "how_decided", s: t("¿Cómo | se deciden | los | aumentos?", "How | are decided | the | raises?", "How are salary decisions made?") },
      ],
    },
    closing: {
      lt: "Thank her and wrap up",
      items: [
        { id: "no_thats_all", s: t("No, | creo | que | es | todo.", "No, | I-think | that | it's | all.", "No, I think that's all.") },
        { id: "thanks_helpful", s: t("Gracias, | eso | me | sirve | mucho.", "Thanks, | that | (to) me | helps | a lot.", "Thanks, that's really helpful.") },
        { id: "check_again", s: t("¿Le | damos | seguimiento | el | próximo | mes?", "(To) it | we-give | follow-up | — | next | month?", "Can we check in again next month?",
          { flags: { 0: F_SEG, 3: F_EL_DAY } }) },
        { id: "thanks_today", s: t("Gracias | por | la | reunión | de | hoy.", "Thanks | for | the | meeting | of | today.", "Thanks for today.") },
      ],
    },
    checkin: {
      lt: "Agree on the next check-in",
      items: [
        { id: "sounds_good", s: t("Suena | bien.", "It sounds | good.", "Sounds good.") },
        { id: "works_for_me", s: t("Sí, | a | la | misma | hora.", "Yes, | at | the | same | time.", "Same time works.") },
        { id: "good_idea", s: t("Buena | idea.", "Good | idea.", "Good idea.") },
      ],
    },
  },

  tips: {
    deflect: { key: "deflect", lt: "Understood! Praise from your boss is best simply accepted: “No fue nada” can sound as if you disagree with her. A thank-you is enough.", better: "Gracias, eso significa mucho para mí." },
    soften: { key: "soften", lt: "Understood! To your manager, “Eso no es verdad” sounds like an accusation. Softer: “Yo lo veo un poco diferente…”, then say what happened.", better: "Yo lo veo un poco diferente. En esas reuniones, tú presentaste mis partes." },
    defensive_fb: { key: "defensive_fb", lt: "Understood! It's better not to defend yourself right away. You can thank her, ask for an example, or calmly explain what happened.", better: "¿Me puedes dar un ejemplo?" },
    discreet: { key: "discreet", lt: "Understood! But don't read a colleague's ratings aloud: they're confidential. Just say the review on the screen isn't yours.", better: "Creo que esa es la evaluación de otra persona." },
    kind: { key: "kind", lt: "Understood! Elena asked for feedback, but that kind of criticism won't help her. Say what works first, then one concrete thing she could try.", better: "Lo que funciona muy bien es tu puerta abierta. Algo que podrías probar: prioridades más claras." },
    money_blunt: { key: "money_blunt", lt: "Understood! Asking about pay is fine, but a demand sounds harsh. A question is more polite.", better: "¿Podemos hablar de mi sueldo?" },
  },

  merges: {
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less misreads the hedge: so-so, mostly.", minimal: "Three words." },
    "te sientes": { reason: "grammatical_fusion", split: "te → yourself + sientes → you feel: sentirse is one English verb (to feel).", minimal: "The pronoun and the verb." },
    "en fin": { reason: "lexical_expression", split: "en → in + fin → end misreads the discourse marker: anyway.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth misreads the hedge: honestly.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious misreads the phrase: really, seriously.", minimal: "Two words." },
    "sacaste adelante": { reason: "lexical_expression", split: "sacaste → you took out + adelante → forward is a calque; sacar adelante = to pull off.", minimal: "The verb and its particle." },
    "sacado adelante": { reason: "lexical_expression", split: "sacado → taken out + adelante → forward is a calque; sacar adelante = to pull off.", minimal: "The participle and its particle." },
    "aun así": { reason: "lexical_expression", split: "aun → even + así → like this misreads the concession: still.", minimal: "Two words." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time misreads the phrase: on time.", minimal: "Two words." },
    "gracias a": { reason: "lexical_expression", split: "gracias → thanks + a → to; the preposition = thanks to (because of).", minimal: "Two words." },
    "darme cuenta": { reason: "lexical_expression", split: "darme → give myself + cuenta → account is a calque; darse cuenta = to notice.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now: one time phrase, for now.", minimal: "Two words." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same misreads the emphasis: right now.", minimal: "Two words." },
    "página web": { reason: "lexical_expression", split: "página → page + web → web: one noun, website.", minimal: "Two words." },
    "al año": { reason: "lexical_expression", split: "al → to the + año → year misreads the rate: a year.", minimal: "Two words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → done: one set phrase, deal.", minimal: "Two words." },
    "se te ocurre": { reason: "grammatical_fusion", split: "se → itself + te → to you + ocurre → occurs: one English verb, you think of.", minimal: "The pronouns and the verb." },
    "uno a uno": { reason: "lexical_expression", split: "uno → one + a → to + uno → one: one modifier, one-on-one.", minimal: "Three words." },
    "al final": { reason: "lexical_expression", split: "al → to the + final → end misreads the phrase: at the end.", minimal: "Two words." },
    "ha explicado": { reason: "grammatical_fusion", split: "ha → has + explicado → explained: the perfect tense is one English verb (has explained).", minimal: "The auxiliary and the participle." },
    "a más tardar": { reason: "lexical_expression", split: "a → to + más → more + tardar → to take long misreads the deadline: at the latest.", minimal: "Three words." },
    "se me olvidó": { reason: "grammatical_fusion", split: "se → itself + me → to me + olvidó → it forgot: one English verb, I forgot.", minimal: "The pronouns and the verb." },
    "me da gusto": { reason: "lexical_expression", split: "me → to me + da → it gives + gusto → pleasure: one set phrase, I'm glad.", minimal: "Three words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth misreads the phrase: really.", minimal: "Two words." },
    "lo de": { reason: "lexical_expression", split: "lo → it + de → of: lo de + a noun = the thing with / the business about.", minimal: "Two words." },
    "en equipo": { reason: "lexical_expression", split: "en → in + equipo → team misreads the phrase: as a team.", minimal: "Two words." },
    "con tiempo": { reason: "lexical_expression", split: "con → with + tiempo → time misreads the phrase: ahead of time.", minimal: "Two words." },
    "es que": { reason: "lexical_expression", split: "es → it is + que → that: one discourse marker, the thing is.", minimal: "Two words." },
    "te acuerdas": { reason: "grammatical_fusion", split: "te → yourself + acuerdas → you agree misreads acordarse: remember.", minimal: "The pronoun and the verb." },
    "ya que": { reason: "lexical_expression", split: "ya → already + que → that misreads the conjunction: since.", minimal: "Two words." },
    "has pensado": { reason: "grammatical_fusion", split: "has → you have + pensado → thought: the perfect tense is one English verb (have you thought).", minimal: "The auxiliary and the participle." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // items 1 and 6: not needed for the course report; they leave the list once their moment has passed
    { lt: "Say what you're most proud of this year", optional: true, done: (c) => !!c.s.named, when: (c) => !c.s.goalMet && !c.s.proudDone },
    { lt: "Accept the praise", done: (c) => !!c.s.praiseOk },
    { lt: "Take the feedback: thank her, or politely explain your side", done: (c) => !!c.s.fbOk },
    { lt: "Agree on one goal for next year", done: (c) => !!c.s.goal },
    { lt: "Wrap up and agree on the next check-in", done: (c) => !!c.s.checkin },
    { lt: "Ask about a raise or a promotion", optional: true, done: (c) => !!c.s.moneyAsked, when: (c) => !c.s.goalMet && !c.s.askDone },
  ],

  steps: [
    { id: "feeling", done: (c) => !!c.s.feelDone,
      ask: (c) => {
        const n = bump(c, "feeling");
        if (n === 1) { c.say("feeling_ask"); return; }
        if (n === 2) { c.say("feeling_again"); return; }
        c.s.feelDone = true; askNext(c);
      },
      expects: ["feel_nervous", "feel_fine", "feel_curious", "g_howareyou_answer", "g_howareyou_bad", "plant_help"],
      suggest: (c) => [{ lt: "Say how you feel about the review", hint: "feeling" }, ...(c.s.back ? [] : [{ lt: "Ask if she's okay, or offer to help", hint: "plant" }])],
      yes: (c) => { feel(c, "fine"); }, no: (c) => { feel(c, "unsure"); },
      help: (c) => { feel(c, "unsure"); } },
    { id: "proud", when: (c) => !!c.s.feelDone, done: (c) => !!c.s.proudDone,
      ask: (c) => {
        const n = bump(c, "proud");
        if (n === 1) { c.say("format"); c.say("proud_ask"); return; }
        if (n === 2) { c.say("proud_again"); return; }
        proudHelp(c); askNext(c);
      },
      expects: ["proud_win", "win_ctx", "proud_none"],
      suggest: [{ lt: "Say what you're most proud of this year", hint: "proud", options: "win" }],
      help: (c) => { proudHelp(c); askNext(c); } },
    { id: "made", when: (c) => !!c.s.proudDone && !!c.s.named && !!c.s.follow, done: (c) => !!c.s.madeDone,
      ask: (c) => {
        const n = bump(c, "made");
        if (n === 1) { c.say("made_ask"); return; }
        c.s.madeDone = true; askNext(c);
      },
      expects: ["made_why", "made_ctx", "made_any_ctx", "team_effort"],
      suggest: [{ lt: "Explain what made it work", hint: "made" }],
      help: (c) => { c.say("made_help"); c.s.madeDone = true; askNext(c); } },
    { id: "praise", when: (c) => !!c.s.proudDone && (!!c.s.madeDone || !c.s.named || !c.s.follow), done: (c) => !!c.s.praiseDone,
      ask: (c) => {
        const n = bump(c, "praise");
        if (n === 1) {
          if (c.s.named && !c.s.follow) c.say("proud_react");
          const win = look(WINS, c.s.win) ? c.s.win : "guide";
          c.say("praise_" + win);
          if (c.s.win2 && c.s.win2 !== win && look(WINS, c.s.win2)) c.say("praise_also", { X: c.s.win2 });
          return;
        }
        if (n === 2) { c.say("praise_again"); return; }
        c.s.praiseDone = true; c.say("deflect_giveup"); askNext(c);
      },
      expects: ["thanks_praise", "team_effort", "deflect"],
      suggest: [{ lt: "Accept the praise", hint: "praise" }],
      yes: (c) => { acceptPraise(c, "thanks"); }, no: (c) => { deflect(c); },
      help: (c) => { c.say("praise_help"); } },
    { id: "consent", when: (c) => !!c.s.praiseDone, done: (c) => !!c.s.consented,
      ask: (c) => {
        const n = bump(c, "consent");
        if (n === 1) { c.say("consent_ask"); return; }
        c.s.consented = true; c.say("consent_just"); askNext(c);
      },
      expects: ["want_feedback", "no_feedback"],
      suggest: [{ lt: "Agree to hear her feedback", hint: "consent" }],
      yes: (c) => { c.s.consented = true; }, no: (c) => { consentNo(c); },
      help: (c) => { if (c.s.consented) return; c.s.consented = true; c.say("consent_just"); } },
    { id: "feedback", when: (c) => !!c.s.consented, done: (c) => !!c.s.fbDone,
      ask: (c) => {
        if (RUDE.has(c)) { RUDE.delete(c); HOWSO.delete(c); c.s.howSo = true; c.say("fb_rude_react"); return; }
        if (HOWSO.has(c)) { HOWSO.delete(c); c.s.howSo = true; c.say("fb_howso"); return; }
        if (!c.s.fbGiven) { c.s.fbGiven = true; c.say("fb_give"); c.say("fb_detail"); return; }
        const n = bump(c, "feedback");
        if (n >= 3) { c.s.fbDone = true; c.say("fb_move_on"); askNext(c); return; }
        c.say("fb_again");
      },
      expects: ["fb_thanks", "fb_work", "ask_example_fb", "pushback", "rude_push", "defensive_fb", "protect_idea"],
      suggest: [{ lt: "Thank her and say you'll work on it", hint: "receive" }, { lt: "Ask for an example", hint: "example" }, { lt: "Politely explain your side", hint: "pushback" }],
      yes: (c) => { fbAccept(c); }, no: (c) => { rude(c); },
      help: (c) => { c.say("fb_help"); } },
    { id: "protect", when: (c) => !!c.s.pushed, done: (c) => !!c.s.protectDone,
      ask: (c) => {
        const n = bump(c, "protect");
        if (n === 1) { c.say("protect_ask"); return; }
        if (n === 2) { c.say("protect_again"); return; }
        c.s.protectDone = true; c.s.protectHow = "emily"; c.say("protect_decide"); askNext(c);
      },
      expects: ["protect_idea"],
      suggest: [{ lt: "Suggest how to protect your speaking time", hint: "protect" }],
      help: (c) => { protectOffer(c); } },
    { id: "tab", when: (c) => c.s.twist === "tab" && !!c.s.fbDone && protectOk(c), done: (c) => !!c.s.tabDone,
      ask: (c) => {
        const n = bump(c, "tab");
        if (n === 1) { c.twist("wrong_tab"); c.event("screen", { tab: "ben" }); c.say("tab_show"); c.say("tab_look"); return; }
        tabSelf(c); askNext(c);
      },
      expects: ["tab_point", "tab_check", "tab_read", "tab_look_ctx"],
      suggest: [{ lt: "The screen shows Pablo's review: tactfully tell Elena", hint: "tab" }],
      yes: (c) => { tabSelf(c); }, no: (c) => { tabSelf(c); },
      help: (c) => { tabSelf(c); } },
    { id: "goals", when: (c) => !!c.s.fbDone && protectOk(c) && tabOk(c), done: (c) => !!c.s.goalDone,
      ask: (c) => {
        const n = bump(c, "goals");
        if (n === 1) { c.say("goals_ask"); return; }
        if (n === 2) { c.say("goals_options"); return; }
        goalsLast(c);
      },
      expects: ["goal_name", "goal_ctx", "goal_what_ctx", "goal_vague", "goal_not", "goal_course", "goal_course_ctx", "ask_budget", "ask_support"],
      suggest: [{ lt: "Say what you'd like to work on next year", hint: "goals", options: "goal" }, { lt: "Ask about the training budget", hint: "support" }],
      // her list of ideas; once she has given it, her own suggestion
      help: (c) => { if (!once(c, "goalsHelp")) return; if (asks(c, "goals") >= 2) { goalsLast(c); return; } bump(c, "goals"); c.say("goals_options"); } },
    { id: "support", when: (c) => !!c.s.goal && !!c.s.supportQ, done: (c) => !!c.s.supportDone,
      ask: (c) => {
        const n = bump(c, "support");
        if (n === 1) { c.say("support_ask"); return; }
        c.s.supportDone = true; askNext(c);
      },
      expects: ["ask_budget", "ask_support", "support_ctx"],
      suggest: [{ lt: "Ask for support with your goal", hint: "support" }],
      yes: (c) => { supportHelp(c); }, no: (c) => { if (!c.s.supportDone) { c.s.supportDone = true; c.say("support_none"); } },
      help: (c) => { supportHelp(c); } },
    { id: "rev_open", when: (c) => c.s.twist === "reverse" && !!c.s.goalDone && supportOk(c), done: (c) => !!c.s.revOpen || !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_open");
        if (n === 1) { c.twist("role_reversal"); c.say("rev_ask"); c.say("rev_ask2"); return; }
        c.s.revOpen = true; askNext(c);
      },
      expects: ["rev_ok_ctx", "want_feedback", "rev_decline", "rev_worked", "mg_ctx", "rev_try", "rev_nothing", "rev_rude"],
      suggest: [{ lt: "Agree to give Elena feedback", hint: "rev_open" }],
      yes: (c) => { c.s.revOpen = true; }, no: (c) => { revDecline(c); },
      help: (c) => { c.s.revOpen = true; } },
    { id: "rev_worked", when: (c) => !!c.s.revOpen && !c.s.revDone, done: (c) => !!c.s.revWorked || !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_worked");
        if (n === 1) { c.say("rev_start"); return; }
        if (n === 2) { c.say("rev_worked_again"); return; }
        c.s.revWorked = true; askNext(c);
      },
      expects: ["rev_worked", "mg_ctx", "rev_nothing", "rev_rude", "rev_try", "mt_ctx"],
      suggest: [{ lt: "Say what Elena does well", hint: "rev_worked", options: "mgood" }],
      yes: (c) => { revWorked(c, "general"); },
      help: (c) => { if (once(c, "revHelp")) { bump(c, "rev_worked"); c.say("rev_worked_again"); } } },
    { id: "rev_try", when: (c) => !!c.s.revWorked && !c.s.revDone, done: (c) => !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_try");
        if (n === 1) { c.say("rev_one"); return; }
        if (n === 2) { c.say("rev_something"); return; }
        c.s.revDone = true; c.s.revHow = "nothing"; c.say("rev_giveup"); askNext(c);
      },
      expects: ["rev_try", "mt_ctx", "rev_nothing", "rev_rude"],
      suggest: [{ lt: "Suggest one thing she could try", hint: "rev_try", options: "mtip" }],
      no: (c) => { revNothing(c); },
      help: (c) => { revNothing(c); } },
    { id: "ask_me", when: (c) => !!c.s.goalDone && supportOk(c) && revOk(c), done: (c) => !!c.s.askDone || !!c.s.moneyAsked,
      ask: (c) => {
        const n = bump(c, "ask_me");
        if (n === 1) { c.say("askme_ask"); return; }
        if (n === 2) { c.say("askme_else"); return; }
        c.s.askDone = true; askNext(c);
      },
      expects: ["ask_raise", "ask_criteria", "ask_budget", "no_more", "propose_checkin", "more_q_ctx"],
      suggest: [{ lt: "Ask about a raise or a promotion", hint: "askme" }],
      yes: (c) => { if (c.s.moneyAsked || c.s.askDone || !once(c, "moreQ")) return; c.say("askme_go"); c.hold(); },
      no: (c) => { if (!c.s.moneyAsked) c.s.askDone = true; },
      help: (c) => { c.s.askDone = true; } },
    { id: "criteria", when: (c) => !!c.s.moneyAsked && !c.s.criteriaDone, done: (c) => !!c.s.criteriaDone,
      ask: (c) => {
        if (c.s.moneyEarly) c.say("money_back");
        if (c.s.criteriaAsked) criteriaAnswer(c, true);
        else { c.say("criteria_volunteer"); criteriaAnswer(c, false); }
        askNext(c);
      },
      expects: ["ask_criteria"],
      suggest: [{ lt: "Ask what the decision depends on", hint: "criteria" }] },
  ],

  init: (c) => {
    c.s.asks = {};
    // one twist at most; a replay prefers the one not seen yet
    const seen: string[] = c.memory.twists ?? [];
    let tw: string | null = c.chance(c.visits >= 1 ? 0.85 : 0.5) ? (c.chance(0.5) ? "reverse" : "tab") : null;
    if (c.visits >= 1 && tw && seen.includes(tw)) tw = ["reverse", "tab"].find((x) => !seen.includes(x)) ?? tw;
    c.s.twist = tw;
    c.s.follow = c.chance(0.6);
    c.s.supportQ = c.chance(0.5);
    c.s.back = c.visits >= 1 && c.chance(0.5);
  },

  start: (c) => {
    if (c.s.back) { c.say("hello_back"); c.say("hello_back2"); return; }
    c.say("hello");
    c.event("plant", { fall: true });
    c.say("plant_okay");
  },

  handlers: {
    plant_help(c) { plantHelp(c); },
    feel_nervous(c, _slots, seg) { feel(c, seg.tags.includes("bad") ? "bad" : "nervous"); },
    feel_fine(c) { feel(c, "fine"); },
    feel_curious(c, _slots, seg) { feel(c, seg.tags.includes("mix") ? "nervous" : "curious"); },

    proud_win(c, slots) { proud(c, slots.win, slots.win2); },
    win_ctx(c, slots) { proud(c, slots.win); },
    // "Nada (especial)": nothing to be proud of, no question, nothing needed, nothing to change (by the step)
    proud_none(c) {
      if (c.step === "proud") { if (!c.s.proudDone && once(c, "proud")) proudHelp(c); return; }
      if (c.step === "ask_me") { if (!c.s.askDone && !c.s.moneyAsked) c.s.askDone = true; return; }
      if (c.step === "support") { if (!c.s.supportDone) { c.s.supportDone = true; c.say("support_none"); } return; }
      if (c.step === "rev_try") revNothing(c);
    },
    made_why(c) { made(c, false); },
    made_ctx(c) { made(c, false); },
    made_any_ctx(c) { made(c, false); },
    team_effort(c) {
      if (c.step === "made" && !c.s.madeDone) { made(c, true); return; }
      if (praiseOpen(c)) acceptPraise(c, "team");
    },
    thanks_praise(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      if (fbOpen(c)) { fbAccept(c); return; }
      if (c.step === "made" && !c.s.madeDone) made(c, false);
    },
    deflect(c) {
      if (praiseOpen(c)) { deflect(c); return; }
      if (fbOpen(c)) { pushback(c, []); return; }
      if (c.step === "rev_try") { revNothing(c); return; }
    },

    want_feedback(c) {
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (c.s.praiseDone && !c.s.consented) c.s.consented = true;
    },
    no_feedback(c) {
      if (c.step === "rev_open" && !c.s.revOpen) { revDecline(c); return; }
      if (c.s.praiseDone && !c.s.consented) consentNo(c);
    },
    fb_thanks(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      if (fbOpen(c)) { if (!contrast(c)) fbAccept(c); return; }
    },
    fb_work(c) { if (fbOpen(c)) fbAccept(c); },
    ask_example_fb(c) { if (fbOpen(c)) example(c); },
    ask_how_fb(c) { if (fbOpen(c)) howTo(c); },
    pushback(c, _slots, seg) { pushback(c, seg.tags); },
    rude_push(c, _slots, seg) {
      if (seg.tags.includes("amb") && fbOpen(c)) { if (once(c, "fbWhich")) { c.say("fb_which"); c.hold(); } return; }
      if (praiseOpen(c)) { deflect(c); return; }
      if (fbOpen(c)) rude(c);
    },
    defensive_fb(c) { if (fbOpen(c)) defensiveFb(c); },
    protect_idea(c, _slots, seg) { protectIdea(c, seg.tags); },

    tab_point(c) { tabPoint(c, false); },
    tab_check(c) {
      // a question points it out; a statement takes Pablo's review as the learner's own (she notices herself)
      if (isQuestion(c)) tabPoint(c, false);
      else if (c.step === "tab") tabSelf(c);
    },
    tab_read(c) { tabPoint(c, true); },
    // "Se ve bien." takes it as theirs and "¿Quién es?" makes her look again: she notices herself
    tab_look_ctx(c) { if (c.step === "tab") tabSelf(c); },

    goal_name(c, slots, seg) {
      if (whatQ(c)) { goalWhat(c); return; }
      const tagged = seg.tags.find((x) => x.startsWith("g:"))?.slice(2);
      goalFrom(c, slots.goal ?? tagged);
    },
    goal_ctx(c, slots) { if (whatQ(c)) { goalWhat(c); return; } goalFrom(c, slots.goal); },
    goal_what_ctx(c) { goalWhat(c); },
    goal_not(c, slots) {
      if (tagQ(c) && slots.goal) { goalFrom(c, slots.goal); return; } // "UX writing, ¿no?" picks it
      if (/\b(mejor|sino|prefiero|mas bien)\b/.test(fold(c.heard))) return;
      goalVague(c, "goal_not");
    },
    goal_course(c) { goalCourse(c); },
    goal_course_ctx(c) { goalCourse(c); },
    goal_vague(c) { goalVague(c); },
    ask_budget(c) { budget(c); },
    ask_support(c) { support(c); },
    support_ctx(c) { support(c); },

    rev_ok_ctx(c) { if (c.step === "rev_open" && !c.s.revOpen) c.s.revOpen = true; },
    rev_decline(c) { if (c.step === "rev_open" && !c.s.revOpen) revDecline(c); },
    rev_worked(c, slots, seg) { revWorked(c, slots.mg ?? seg.tags.find((x) => x.startsWith("mg:"))?.slice(3)); },
    mg_ctx(c, slots) { revWorked(c, slots.mg); },
    rev_try(c, slots, seg) { revTry(c, slots.mt ?? seg.tags.find((x) => x.startsWith("mt:"))?.slice(3)); },
    mt_ctx(c, slots) { revTry(c, slots.mt); },
    rev_nothing(c) {
      // "Nada, lo estás haciendo muy bien" to "¿Qué está funcionando?" is praise; to "¿Y algo que podría intentar?" it is nothing
      if (c.step === "rev_worked" && !c.s.revWorked) { if (/(bien|perfect|genial|excelente|increible|correos)/.test(fold(c.heard))) revWorked(c, "general"); else revRude(c); return; }
      revNothing(c);
    },
    rev_rude(c) { revRude(c); },

    ask_raise(c) { money(c, false); },
    ask_criteria(c) { money(c, true); },
    ask_rating(c) { rating(c); },
    maybe_ctx() { /* only at her offers (the pending question handles it) */ },
    no_more(c) { if (c.step === "ask_me" && !c.s.askDone && !c.s.moneyAsked) c.s.askDone = true; },
    more_q_ctx(c) { if (c.step === "ask_me" && !c.s.askDone && !c.s.moneyAsked && once(c, "moreQ")) { c.say("askme_go"); c.hold(); } },
    propose_checkin(c, _slots, seg) {
      if (c.s.checkinProposed) return;
      // "¿Cuándo es nuestra próxima reunión?" is a question, not a proposal: she sets it at the end
      if (seg.tags.includes("when")) { if (once(c, "checkinEarly")) c.say("checkin_when"); return; }
      checkinProposal(c, seg.tags);
      if (once(c, "checkinEarly")) c.say("checkin_early");
    },
    checkin_yes_ctx() { /* only while she proposes the check-in (the pending question handles it) */ },
    agree_idea(c) { stepYes(c); },
    thanks_today(c) { review.handlers.g_thanks(c, {}, { intent: "g_thanks", slots: {}, tags: [] } as Segment); },
    checkin_no_ctx() { /* only while she proposes the check-in (the pending question handles it) */ },

    // --- global intents: the step decides what they mean here ---
    g_thanks(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      // "Gracias, pero lo veo diferente": an acknowledgement before a contrast is no acceptance
      if (fbOpen(c)) { if (!contrast(c) && !saidNo(c)) fbAccept(c); return; }
      if (saidNo(c)) return; // "No, gracias": the step's no answers it
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (once(c, "welcome")) c.say("welcome");
    },
    g_ok(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      // "Entiendo, pero eso no es verdad." / "Ya veo, pero lo veo diferente.": the part after "pero" decides
      if (fbOpen(c)) { if (!contrast(c) && !saidNo(c)) fbAccept(c); return; }
      if (saidNo(c)) return; // "No, está bien": the step's no answers it
      if (c.step === "consent" && !c.s.consented) { c.s.consented = true; return; }
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (c.step === "tab" && !c.s.tabDone) { tabSelf(c); return; }
    },
    g_hello(c) {
      if (c.s.hi) return;
      c.s.hi = true; c.say("g_hello");
      // "¡Hola!" at the start: her question still stands
      if (c.step === "feeling" && !c.s.feelDone) c.hold();
    },
    g_howareyou(c) {
      if (c.step === "feeling" && !c.s.feelDone) { if (once(c, "hay")) c.say(c.s.back ? "emily_howareyou_back" : "emily_howareyou"); c.hold(); return; }
      if (once(c, "hay")) c.say("g_howareyou_reply");
    },
    g_howareyou_answer(c) {
      if (c.step === "feeling" && !c.s.feelDone) { feel(c, "fine"); return; }
      if (askedBack(c) && once(c, "hay")) c.say("g_asked_back");
    },
    g_howareyou_bad(c) {
      if (c.step === "feeling" && !c.s.feelDone) { feel(c, "bad"); return; }
      if (once(c, "hay")) c.say("g_sorry_to_hear");
    },
    // "No sé" / "No estoy seguro": the step's help, where its question would come (see the end of the file), so an
    // answer in the same breath wins ("No sé. ¿Tal vez un curso de análisis de datos?")
    g_dontknow(c) {
      const st = review.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { agree(c, false); return; }
      c.say("bye_early"); rememberVisit(c); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the plant and how you feel
    { say: "¿Estás bien?", intent: "plant_help", step: "feeling" },
    { say: "¿Te ayudo?", intent: "plant_help", step: "feeling" },
    { say: "No te preocupes", intent: "plant_help", step: "feeling", not: ["feel_nervous"] },
    { say: "¿La verdad? Un poco nervioso", intent: "feel_nervous", step: "feeling" },
    { say: "Tranquila, gracias", intent: "feel_fine", step: "feeling" },
    { say: "Con curiosidad, la verdad", intent: "feel_curious", step: "feeling" },
    { say: "Lista para empezar", intent: "feel_fine", step: "feeling" },
    { say: "No estoy nerviosa para nada", intent: "feel_fine", step: "feeling", not: ["feel_nervous"] },
    // your year
    { say: "Estoy muy orgulloso de la guía del sistema de citas", intent: "proud_win", step: "proud", slots: { win: "guide" } },
    { say: "Estoy muy orgullosa de haber ayudado al practicante nuevo", intent: "proud_win", step: "proud", slots: { win: "intern" } },
    { say: "Estoy muy orgulloso de haber sacado adelante el proyecto del cliente", intent: "proud_win", step: "proud", slots: { win: "rescue" } },
    { say: "Probablemente la encuesta a clientes", intent: "proud_win", step: "proud", slots: { win: "survey" } },
    { say: "Creo que el lanzamiento de la app salió muy bien", intent: "proud_win", step: "proud", slots: { win: "launch" } },
    { say: "El lanzamiento", intent: "win_ctx", step: "proud", slots: { win: "launch" } },
    { say: "Nada especial", intent: "proud_none", step: "proud", not: ["proud_win"] },
    { say: "Planeamos todo con tiempo", intent: "made_why", step: "made" },
    { say: "Escuché a los usuarios", intent: "made_why", step: "made" },
    { say: "Hice muchas preguntas", intent: "made_why", step: "made" },
    { say: "Fue trabajo en equipo", intent: "team_effort", step: "made" },
    { say: "Gracias, eso significa mucho para mí", intent: "thanks_praise", step: "praise" },
    { say: "Gracias, de verdad lo aprecio", intent: "thanks_praise", step: "praise" },
    { say: "Me da gusto que haya servido", intent: "thanks_praise", step: "praise" },
    { say: "No fue nada", intent: "deflect", step: "praise", not: ["thanks_praise"] },
    // the feedback
    { say: "Claro, dime", intent: "want_feedback", step: "consent" },
    { say: "Vale, te escucho", intent: "want_feedback", step: "consent" },
    { say: "Sí, sé honesta conmigo", intent: "want_feedback", step: "consent" },
    { say: "Tranquila, puedo con eso", intent: "want_feedback", step: "consent" },
    { say: "Gracias, eso me sirve mucho", intent: "fb_thanks", step: "feedback" },
    { say: "Voy a trabajar en eso", intent: "fb_work", step: "feedback" },
    { say: "Me parece justo", intent: "fb_thanks", step: "feedback" },
    { say: "Gracias por la retroalimentación", intent: "fb_thanks", step: "feedback" },
    { say: "Tiene sentido", intent: "fb_thanks", step: "feedback" },
    { say: "Entiendo lo que dices", intent: "fb_thanks", step: "feedback" },
    { say: "La próxima vez voy a hablar antes", intent: "fb_work", step: "feedback" },
    { say: "Tienes razón", intent: "fb_thanks", step: "feedback" },
    { say: "¿Me puedes dar un ejemplo?", intent: "ask_example_fb", step: "feedback" },
    { say: "¿En qué reuniones?", intent: "ask_example_fb", step: "feedback" },
    { say: "Yo lo veo un poco diferente", intent: "pushback", step: "feedback", not: ["fb_thanks"] },
    { say: "En esas reuniones, tú presentaste mis partes", intent: "pushback", step: "feedback" },
    { say: "Es que el cliente llegó tarde, ¿te acuerdas?", intent: "pushback", step: "feedback" },
    { say: "La verdad, no tuve la oportunidad", intent: "pushback", step: "feedback" },
    { say: "Eso no es verdad", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "No tienes razón", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "No voy a trabajar en eso", intent: "defensive_fb", step: "feedback", not: ["fb_work", "fb_thanks"] },
    { say: "Ese no es mi trabajo", intent: "defensive_fb", step: "feedback", not: ["fb_work", "fb_thanks"] },
    { say: "¿Podemos poner mis partes en la agenda?", intent: "protect_idea", step: "protect" },
    { say: "¿Puedo presentar mis propias diapositivas?", intent: "protect_idea", step: "protect" },
    { say: "¿Podemos respetar mi tiempo, aunque el cliente llegue tarde?", intent: "protect_idea", step: "protect" },
    { say: "¿Tal vez una llamada rápida antes de la reunión?", intent: "protect_idea", step: "protect" },
    // the wrong tab
    { say: "Creo que esa es la evaluación de otra persona", intent: "tab_point", step: "tab" },
    { say: "Creo que esa es la evaluación de otra persona en el ordenador", intent: "tab_point", step: "tab" },
    { say: "Perdón, creo que esa no es la mía", intent: "tab_point", step: "tab", not: ["tab_check"] },
    { say: "Creo que abriste la pestaña equivocada", intent: "tab_point", step: "tab" },
    { say: "Uy, Pablo sacó una calificación muy baja", intent: "tab_read", step: "tab" },
    // goals
    { say: "Me gustaría trabajar en presentaciones a clientes", intent: "goal_name", step: "goals", slots: { goal: "presenting" } },
    { say: "Me gustaría tomar un curso de UX writing", intent: "goal_name", step: "goals", slots: { goal: "ux_writing" } },
    { say: "¿Tal vez un curso de análisis de datos?", intent: "goal_name", step: "goals", slots: { goal: "data" } },
    { say: "Me gustaría presentar más a los clientes", intent: "goal_name", step: "goals" },
    { say: "Me gustaría dirigir un proyecto pequeño", intent: "goal_name", step: "goals" },
    { say: "Me gustaría ser mentor de los practicantes", intent: "goal_name", step: "goals" },
    { say: "Liderazgo", intent: "goal_ctx", step: "goals", slots: { goal: "leadership" } },
    { say: "Quiero dejar de presentar", intent: "goal_not", step: "goals", not: ["goal_name"] },
    { say: "No quiero dar mentoría", intent: "goal_not", step: "goals", not: ["goal_name"] },
    { say: "¿Hay presupuesto para capacitación?", intent: "ask_budget", step: "goals" },
    { say: "¿Podríais pagar el curso?", intent: "ask_budget", step: "goals" },
    { say: "¿Podríamos practicar antes de las reuniones con clientes?", intent: "ask_support", step: "goals" },
    { say: "Me ayudaría tener retroalimentación más seguido", intent: "ask_support", step: "support" },
    { say: "¿Podría tener tiempo para el curso?", intent: "ask_support", step: "support" },
    // the role reversal
    { say: "Claro. ¿Puedo ser sincero?", intent: "rev_ok_ctx", step: "rev_open" },
    { say: "Lo que funciona muy bien es tu puerta abierta", intent: "rev_worked", step: "rev_worked", slots: { mg: "open_door" } },
    { say: "Aprecio mucho tu calma", intent: "rev_worked", step: "rev_worked", slots: { mg: "calm" } },
    { say: "Sabes escuchar muy bien", intent: "rev_worked", step: "rev_worked" },
    { say: "Tu puerta siempre está abierta", intent: "rev_worked", step: "rev_worked" },
    { say: "Algo que podrías intentar es prioridades más claras", intent: "rev_try", step: "rev_try", slots: { mt: "priorities" } },
    { say: "Bueno, ya que preguntas: menos correos en la noche", intent: "rev_try", step: "rev_try", slots: { mt: "late_email" } },
    { say: "¿Tal vez reuniones uno a uno?", intent: "rev_try", step: "rev_try", slots: { mt: "one_on_ones" } },
    { say: "Yo te sugeriría juntas más cortas", intent: "rev_try", step: "rev_try", slots: { mt: "shorter_meetings" } },
    { say: "¿Has pensado en prioridades más claras?", intent: "rev_try", step: "rev_try", slots: { mt: "priorities" } },
    { say: "Eres una mala jefa", intent: "rev_rude", step: "rev_worked", not: ["rev_worked"] },
    // money and the closing
    { say: "¿Podemos hablar de mi sueldo?", intent: "ask_raise", step: "ask_me" },
    { say: "¿Esta evaluación afecta mi sueldo?", intent: "ask_raise", step: "ask_me" },
    { say: "¿Podemos hablar de una subida de sueldo?", intent: "ask_raise", step: "ask_me" },
    { say: "¿Qué tendría que hacer para lograr un ascenso?", intent: "ask_criteria", step: "ask_me" },
    { say: "¿Me puedes dar un ejemplo de lo que significa supera las expectativas?", intent: "ask_criteria", step: "ask_me" },
    { say: "¿Cómo se deciden los aumentos?", intent: "ask_criteria", step: "ask_me" },
    { say: "No me interesa el ascenso", intent: "none", step: "ask_me", not: ["ask_raise"] },
    { say: "¿Le damos seguimiento el próximo mes?", intent: "propose_checkin", step: "ask_me" },
    { say: "Gracias por la reunión de hoy", intent: "thanks_today", step: "ask_me" },
    { say: "Suena bien", intent: "agree_idea", step: "checkin" },
    { say: "Buena idea", intent: "agree_idea", step: "goal_offer" },
    // not understood
    { say: "¿Dónde está el baño?", intent: "none", step: "feedback" },
    { say: "Me gusta la pizza con piña", intent: "none", step: "goals" },
    { say: "Mi perro se llama Max", intent: "none", step: "proud" },
    // review: traps and natural forms the draft missed
    { say: "Tengo curiosidad", intent: "feel_curious", step: "feeling" },
    { say: "Tranquilo, me siento listo", intent: "feel_fine", step: "feeling" },
    { say: "No muy bien, la verdad", intent: "feel_nervous", step: "feeling", not: ["feel_fine"] },
    { say: "Planeamos todo con mucho tiempo", intent: "made_why", step: "made" },
    { say: "No, gracias a ti", intent: "thanks_praise", step: "praise", not: ["deflect"] },
    { say: "No me molesta, dime", intent: "want_feedback", step: "consent", not: ["no_feedback"] },
    { say: "Gracias, es muy útil", intent: "fb_thanks", step: "feedback" },
    { say: "No creo que sea justo", intent: "pushback", step: "feedback", not: ["fb_thanks"] },
    { say: "¿Por qué dices eso?", intent: "ask_example_fb", step: "feedback" },
    { say: "No tienes razón", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "Lo que funciona muy bien es que siempre nos escuchas", intent: "rev_worked", step: "rev_worked" },
    { say: "No eres una mala jefa", intent: "rev_worked", step: "rev_worked", not: ["rev_rude"] },
    { say: "No siempre nos dices las prioridades", intent: "rev_try", step: "rev_try", not: ["rev_nothing"] },
    { say: "No quiero hablar del sueldo, gracias", intent: "no_more", step: "ask_me", not: ["ask_raise"] },
    { say: "Sí, tengo una pregunta más", intent: "more_q_ctx", step: "ask_me", not: ["no_more"] },
    // audit (5 Nov 2026): side questions, a word's meaning is no choice, more ways to name a goal or ask about money
    { say: "¿Cuál es mi calificación?", intent: "ask_rating", step: "ask_me", not: ["tab_check", "want_feedback"] },
    { say: "¿Cómo me fue en general?", intent: "ask_rating", step: "ask_me" },
    { say: "¿Puedo ver mi evaluación?", intent: "ask_rating", step: "feedback" },
    { say: "¿Qué debería hacer?", intent: "ask_how_fb", step: "feedback", not: ["ask_example_fb"] },
    { say: "¿Cómo lo hago?", intent: "ask_how_fb", step: "feedback", not: ["ask_example_fb"] },
    { say: "¿Las juntas con clientes?", intent: "ask_example_fb", step: "feedback" },
    { say: "¿Sobre qué?", intent: "want_feedback", step: "consent" },
    { say: "Ay, ¿hice algo mal?", intent: "want_feedback", step: "consent" },
    { say: "¿Qué es UX writing?", intent: "goal_what_ctx", step: "goals", not: ["goal_ctx", "goal_name"] },
    { say: "Me gustaría dar mentoría", intent: "goal_name", step: "goals", slots: { goal: "mentoring" } },
    { say: "Me interesa el liderazgo", intent: "goal_name", step: "goals", slots: { goal: "leadership" } },
    { say: "No me interesa la mentoría", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "¿De cuánto es el aumento?", intent: "ask_raise", step: "ask_me" },
    { say: "¿Me van a ascender?", intent: "ask_raise", step: "ask_me" },
    { say: "¿Hay bono este año?", intent: "ask_raise", step: "ask_me" },
    { say: "Se ve bien", intent: "tab_look_ctx", step: "tab" },
    { say: "¿Esa soy yo?", intent: "tab_check", step: "tab", not: ["tab_point"] },
    { say: "Algo que podrías probar: reuniones uno a uno", intent: "rev_try", step: "rev_try", slots: { mt: "one_on_ones" } },
  ],

  sims: [
    // review: "No, tienes razón" loses its comma (she asks), a goal corrected in one breath, one more question at
    // "¿Algo más?", and "No, en un mes está bien" (a yes to the check-in, never "another time")
    { name: "review: corrections in one breath", turns: ["Bien.", "La app.", "Gracias.", "Claro.", "No, tienes razón.", "Sí, estoy de acuerdo.",
      "No quiero tomar un curso de liderazgo, mejor análisis de datos.", "No.", "Sí, tengo una pregunta más.", "¿Cuándo se deciden los aumentos?", "No, es todo.",
      "No, en un mes está bien."],
      expect: { complete: true, state: { fbHow: "accept", goal: "data", moneyAsked: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // the song's way, start to finish (no twist, no follow-up questions)
    { name: "happy path: the song's phrases", turns: ["¿La verdad? Un poco nervioso.", "Estoy muy orgulloso de la guía del sistema de citas.", "Gracias, eso significa mucho para mí.",
      "Claro, dime.", "Gracias, eso me sirve mucho. Voy a trabajar en eso.", "Me gustaría tomar un curso de UX writing.", "¿Podemos hablar de mi sueldo?",
      "¿Qué tendría que hacer para lograr un ascenso?", "No, es todo. Gracias, eso me sirve mucho.", "Suena bien."],
      expect: { complete: true, state: { named: true, fbHow: "accept", goal: "ux_writing", moneyAsked: true, friday: true } }, auto: AUTO, setup: PLAIN },
    // the plant, an example, polite push-back with the reason, a vague goal, the budget, the "supera las expectativas"
    // question, and the learner proposes the check-in (follow-up and support pinned on)
    { name: "questions and push-back", turns: ["¿Estás bien? ¿Te ayudo?", "Bien, gracias. Con curiosidad, la verdad.", "Probablemente el lanzamiento de la app.", "Fue trabajo en equipo.",
      "Gracias, de verdad lo aprecio.", "Claro, te escucho.", "¿Me puedes dar un ejemplo?", "Yo lo veo un poco diferente. En esas reuniones, tú presentaste mis partes.",
      "¿Podemos poner mis partes en la agenda?", "Quiero crecer profesionalmente.", "¿Hay presupuesto para capacitación?", "Un curso de liderazgo.",
      "¿Podríamos practicar antes de las reuniones con clientes?", "¿Le damos seguimiento el próximo mes?",
      "¿Me puedes dar un ejemplo de lo que significa supera las expectativas?", "No, es todo. Gracias, eso me sirve mucho."],
      expect: { complete: true, state: { pushed: true, protectDone: true, exAsked: true, goal: "leadership", moneyAsked: true, checkin: true } }, auto: AUTO,
      setup: (s) => { s.twist = null; s.follow = true; s.supportQ = true; s.back = false; } },
    // twist: Elena asks the learner for feedback on her as a manager
    { name: "twist: feedback for Elena", turns: ["Bien, gracias.", "Estoy muy orgulloso de haber ayudado al practicante nuevo.", "¡Gracias! Fue trabajo en equipo.", "Sí.",
      "Voy a trabajar en eso.", "Me gustaría ser mentor de los practicantes.", "Claro, con gusto.", "Lo que funciona muy bien es tu puerta abierta.",
      "Bueno, ya que preguntas: menos correos en la noche.", "No, creo que es todo.", "Me parece perfecto."],
      expect: { complete: true, state: { revDone: true, revHow: "tip", revTry: "late_email", goal: "mentoring" } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = false; } },
    // twist: Pablo's review on the screen, pointed out tactfully
    { name: "twist: the wrong tab", turns: ["Un poco nervioso, la verdad.", "Estoy muy orgulloso de haber sacado adelante el proyecto del cliente.", "Gracias, me da gusto que haya servido.",
      "Adelante.", "Me parece justo. Voy a trabajar en eso.", "Creo que esa es la evaluación de otra persona.", "Me gustaría dirigir un proyecto pequeño.", "No tengo preguntas.",
      "No, es todo.", "Suena bien, gracias."],
      expect: { complete: true, state: { tabDone: true, tabHow: "tactful", goal: "leading" } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    // the wrong tab read aloud (a tip), a deflected compliment, a rude push-back with the reason after it
    { name: "blunt moves, then better", turns: ["Estoy bien.", "La encuesta a clientes.", "No fue nada.", "Gracias, eso significa mucho para mí.", "Ok.", "Eso no es verdad.",
      "Es que el cliente llegó tarde, ¿te acuerdas? Tú presentaste mis partes.", "¿Tal vez una llamada rápida antes de la reunión?", "Uy, Pablo sacó una calificación muy baja.",
      "Presentaciones a clientes.", "Creo que me merezco un aumento.", "Ok, gracias.", "No, es todo.", "Claro."],
      expect: { complete: true, state: { tabHow: "read", deflects: 1, rude: 1, pushed: true, moneyAsked: true } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    // defensive twice, deflecting twice: the review ends, but the course report is not done
    { name: "defensive: not done", turns: ["Bien.", "Nada especial.", "No fue nada.", "No es para tanto.", "Ok.", "Ese no es mi trabajo.", "Soy diseñador, no vendedor.",
      "Me gustaría trabajar en análisis de datos.", "No.", "No, es todo.", "Claro."],
      expect: { complete: false, state: { praiseOk: undefined, fbOk: undefined, checkin: true } }, auto: AUTO, setup: PLAIN },
    // a return visit (the plant on the shelf); the role reversal: "nothing to change" twice, then she gives up; the
    // learner never asks about money (item 6 passes)
    { name: "twist: nothing to change", turns: ["Muy bien, gracias. ¿Y tú?", "Creo que el lanzamiento de la app salió muy bien.", "¡Gracias!", "Sí, sé honesta conmigo.",
      "Tienes razón. La próxima vez voy a hablar antes.", "¿Tal vez un curso de análisis de datos?", "Claro.", "Sabes escuchar muy bien.", "Nada, lo estás haciendo muy bien.",
      "La verdad, nada.", "No, creo que es todo.", "No, es todo.", "A la misma hora está bien."],
      expect: { complete: true, state: { revHow: "nothing", moneyAsked: undefined, askDone: true } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = true; } },
    // the salary question first (she comes back to it at the end), "¿Por qué?" before the reason, her own idea for
    // the agenda, and a goodbye instead of an answer to the check-in
    { name: "salary first, Elena's idea", turns: ["Bien, gracias.", "El lanzamiento de la app.", "¡Gracias!", "¿Podemos hablar de mi sueldo primero?", "Ok, dime.",
      "Yo lo veo diferente.", "Tú presentaste mis partes, el cliente llegó tarde.", "No sé.", "Sí, buena idea.", "Me gustaría dirigir un proyecto pequeño.",
      "Gracias por la reunión de hoy. ¡Adiós!"],
      expect: { complete: true, state: { moneyEarly: true, protectHow: "emily", goal: "leading", criteriaDone: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // doubt and "…, pero …" are no agreement ("¿Por qué?"), a negative goal, a course from her list, "Me gustaría un
    // aumento", and a short yes to the check-in
    { name: "doubt, then the reason", turns: ["Bien.", "El lanzamiento de la app.", "¡Gracias!", "Claro.", "Entiendo, pero lo veo diferente.",
      "Tú presentaste mis partes, el cliente llegó tarde.", "¿Podemos poner mis partes en la agenda?", "Quiero dejar de presentar.", "Un curso.", "UX writing.",
      "Me gustaría un aumento.", "No, es todo.", "El próximo mes está bien."],
      expect: { complete: true, state: { howSo: true, pushed: true, fbHow: "push", goal: "ux_writing", courseQ: true, moneyAsked: true, checkin: true } }, auto: AUTO,
      setup: PLAIN },
    // "No sé" at every step: each question gets its help once, then its own way out (never a loop)
    { name: "I don't know, again and again", turns: ["Bien.", "El lanzamiento de la app.", "No sé.", "No sé.", "No sé.", "No sé si estoy de acuerdo.",
      "No sé.", "No sé.", "No sé.", "No sé.", "No sé.", "No sé.", "No sé.", "¿Podemos vernos en dos semanas?"],
      expect: { complete: false, state: { praiseOk: undefined, howSo: true, fbOk: undefined, fbDone: true, goalDone: true, goal: undefined, askDone: true, checkin: true } },
      auto: AUTO, setup: PLAIN },
    // short answers all the way, the wrong tab in plain words, and "¿Cuándo nos vemos?" (a question, not a proposal)
    { name: "twist: the wrong tab, short answers", turns: ["Bien.", "El lanzamiento de la app.", "¡Gracias!", "Claro.", "Tiene sentido.", "Esa es de otra persona.",
      "Me gustaría tomar un curso.", "Análisis de datos.", "¿Cuándo es nuestra próxima reunión?", "No, es todo.", "No, es todo.", "El próximo mes está bien."],
      expect: { complete: true, state: { tabHow: "tactful", goal: "data", checkin: true, checkinProposed: undefined } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    { name: "twist: a good manager", turns: ["Bien.", "El lanzamiento de la app.", "¡Gracias!", "Claro.", "Voy a trabajar en eso.", "Me gustaría dar más mentoría.",
      "Claro, con gusto.", "Eres una buena jefa.", "Las juntas son muy largas.", "¿Podemos vernos pronto otra vez?", "No, es todo.", "No, es todo."],
      expect: { complete: true, state: { revHow: "tip", revTry: "shorter_meetings", checkinWhen: "other", checkin: true } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = false; } },
    // "No, gracias" to her own goal suggestion declines it (never the goal), and to the check-in it asks for another time
    { name: "polite no to her suggestion", turns: ["Bien.", "La app.", "Gracias.", "Sí.", "Tienes razón.", "No sé.", "No sé.", "No, gracias.", "No.", "No, es todo.", "No, gracias."],
      expect: { complete: false, state: { goal: undefined, goalDone: true, checkinWhen: undefined, checkin: true } }, auto: AUTO, setup: PLAIN },
    { name: "walking away", turns: ["Bien, gracias.", "La guía.", "Perdón, me tengo que ir."], expect: { complete: false }, auto: AUTO, setup: PLAIN },
    // audit (5 Nov 2026): a thanks or her idea asked back is no yes: she asks once more at her agenda idea, her goal and
    // the check-in, and a clear yes then agrees
    { name: "audit: no yes in a thanks or an echo", turns: ["Bien.", "La app.", "Gracias.", "Claro.", "Yo lo veo diferente. Tú presentaste mis partes, el cliente llegó tarde.",
      "No sé.", "Gracias.", "Sí.", "No sé.", "No sé.", "¿Presentaciones a clientes?", "Sí, me parece bien.", "No.", "No, es todo.", "¿A la misma hora?", "Sí."],
      expect: { complete: true, state: { protectQ: true, protectHow: "emily", goalOfferQ: true, goal: "presenting", checkinQ: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // the same again and again: she decides the agenda herself, the goal waits for next time, and she sends an invite
    { name: "audit: polite thanks twice", turns: ["Bien.", "La app.", "Gracias.", "Claro.", "Yo lo veo diferente. Tú presentaste mis partes, el cliente llegó tarde.",
      "No sé.", "Gracias.", "Gracias.", "No sé.", "No sé.", "Está bien, gracias.", "Puede ser.", "No.", "No, es todo.", "Ok, gracias.", "Está bien, gracias."],
      expect: { complete: false, state: { protectHow: "emily", goal: undefined, goalDone: true, checkinQ: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // how to speak up, what a word means (never the choice), a tag question that picks, the overall rating, and money
    { name: "audit: side questions", turns: ["Bien.", "La app.", "Gracias.", "Claro.", "¿Qué debería hacer?", "Ok, voy a trabajar en eso.", "Un curso.",
      "¿Qué es UX writing?", "UX writing, ¿no?", "¿Cuál es mi calificación?", "¿De cuánto es el aumento?", "No, es todo.", "No, es todo.", "Suena bien."],
      expect: { complete: true, state: { howAsked: true, goal: "ux_writing", ratingSaid: true, moneyAsked: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // the wrong tab taken as the learner's own ("Se ve bien."), a goal said the other way, a thanks at the check-in
    { name: "audit: the wrong tab looks fine", turns: ["Bien.", "La app.", "Gracias.", "Claro.", "Tienes razón.", "Se ve bien.", "Me interesa el liderazgo.", "No.",
      "No, es todo.", "Gracias.", "Sí."],
      expect: { complete: true, state: { tabHow: "self", goal: "leadership", checkinQ: true, checkin: true } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = review.tips as Record<string, Tip>;

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = review.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** "Buena idea." / "Ok." for the step being asked. */
function stepYes(c: Ctx) {
  const st = review.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

/** A plant fell (or not): she waves the help away. */
function plantHelp(c: Ctx) {
  if (c.s.plantSaid || !once(c, "plant")) return;
  c.s.plantSaid = true;
  if (c.s.back) { c.say("fine_thanks"); return; }
  const h = fold(c.heard);
  if (/\b(estas|esta|esta usted) bien\b/.test(h) && !/ayud|mano/.test(h)) { c.say("plant_ok_q"); return; }
  c.say("plant_help");
}

/** The answer to "¿Cómo te sientes con la evaluación de hoy?". */
function feel(c: Ctx, kind: "nervous" | "fine" | "curious" | "bad" | "unsure") {
  if (c.s.feelDone || !once(c, "feel")) return;
  c.s.feelDone = true; c.s.feeling = kind;
  if (kind === "nervous") { c.say(c.s.back ? "feel_nervous_back" : "feel_nervous"); return; }
  if (kind === "bad") { c.say("feel_bad"); return; }
  if (kind === "unsure") { c.say("feel_unsure"); return; }
  if (askedBack(c)) { c.say(c.s.back ? "feel_asked_back_back" : "feel_asked_back"); return; }
  c.say(kind === "curious" ? "feel_curious" : "feel_fine");
}

/** The learner names what they are proud of (item 1). */
function proud(c: Ctx, win?: string, win2?: string) {
  if (c.s.proudDone || !win || !look(WINS, win) || !c.s.feelDone) return;
  if (!once(c, "proud")) return;
  c.s.proudDone = true; c.s.named = true; c.s.win = win;
  if (win2 && win2 !== win) c.s.win2 = win2;
}

/** "No sé" / "Nada especial": she suggests the guide herself (item 1 not ticked). */
function proudHelp(c: Ctx) {
  if (c.s.proudDone) return;
  c.s.proudDone = true; c.s.win = "guide";
  c.say("proud_help");
}

/** "¿Qué hizo que funcionara?" answered. */
function made(c: Ctx, team: boolean) {
  if (c.step !== "made" || c.s.madeDone || !once(c, "made")) return;
  c.s.madeDone = true;
  if (team) c.s.team = true;
  c.say(team ? "team_react" : "made_react");
}

/** The learner accepts the praise (item 2). */
function acceptPraise(c: Ctx, kind: "thanks" | "team") {
  if (!praiseOpen(c) || !once(c, "praise")) return;
  c.s.praiseOk = true; c.s.praiseDone = true;
  c.say(kind === "team" && !c.s.team ? "team_react" : "praise_thanks_react");
}

/** "No fue nada": a tip; she insists once, then writes it down anyway (item 2 not ticked). */
function deflect(c: Ctx) {
  if (!praiseOpen(c)) return;
  c.tip(TIPS.deflect);
  if (!once(c, "praise")) return;
  c.s.deflects = (c.s.deflects ?? 0) + 1;
  if (c.s.deflects === 1) { c.say("deflect_react"); c.hold(); return; }
  c.s.praiseDone = true;
  c.say("deflect_giveup");
}

/** "Mejor otro día": it is the point of today, she says it anyway. */
function consentNo(c: Ctx) {
  if (c.s.consented || !once(c, "consent")) return;
  c.s.consented = true; c.s.consentNo = true;
  c.say("consent_no");
}

/** The learner takes the feedback well (item 3). */
function fbAccept(c: Ctx) {
  if (!fbOpen(c) || !once(c, "fb")) return;
  c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "accept";
  c.say("fb_accept_react");
  c.say(c.chance(0.5) ? "fb_practice" : "fb_get_there");
}

/** "¿Me puedes dar un ejemplo?" */
function example(c: Ctx) {
  if (!once(c, "example")) return;
  if (c.s.exAsked) { c.say("fb_example_more"); c.hold(); return; }
  c.s.exAsked = true;
  c.say("fb_example"); c.hold();
}

/** "¿Qué debería hacer?" / "¿Cómo lo hago?": how to speak up (never the example's dates). */
function howTo(c: Ctx) {
  if (!once(c, "how")) return;
  if (c.s.howAsked) { c.say("fb_example_more"); c.hold(); return; }
  c.s.howAsked = true;
  c.say("fb_how"); c.hold();
}

/** Polite push-back: without the reason she asks "¿Por qué?"; with it, "Es justo. Eso fue culpa mía." (item 3). A
 *  change of mind after accepting it ("Bueno, en realidad tú presentaste mis partes") still opens the agenda question. */
function pushback(c: Ctx, tags: string[]) {
  if (!c.s.fbGiven) return;
  const late = c.s.fbDone && c.s.fbHow === "accept" && !c.s.pushed;
  if (c.s.fbDone && !late) return;
  RUDE.delete(c);
  if (!tags.includes("ctx")) {
    if (late || c.s.howSo || !once(c, "howso")) return;
    HOWSO.add(c);
    return;
  }
  HOWSO.delete(c);
  if (!once(c, "push")) return;
  c.s.pushed = true; c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "push";
  c.say("fb_fair"); c.say("fb_fair2");
}

/** "Eso no es verdad": a tip, and she asks for more at the end of the turn (unless the reason came in the same breath). */
function rude(c: Ctx) {
  if (!fbOpen(c)) return;
  c.tip(TIPS.soften);
  if (!once(c, "rude")) return;
  c.s.rude = (c.s.rude ?? 0) + 1;
  if (c.s.rude >= 2 || c.s.howSo) { c.s.fbDone = true; c.say("fb_move_on"); return; }
  RUDE.add(c);
}

/** Defending without a reason: a tip; she answers once, the second time she moves on (item 3 not ticked). */
function defensiveFb(c: Ctx) {
  c.tip(TIPS.defensive_fb);
  if (!once(c, "def")) return;
  c.s.defCount = (c.s.defCount ?? 0) + 1;
  if (c.s.defCount === 1) { c.say("fb_defensive_react"); c.hold(); return; }
  c.s.fbDone = true;
  c.say("fb_move_on");
}

/** An idea for protecting the learner's speaking time (after the push-back), or a constructive answer to the
 *  feedback itself ("¿Puedo presentar mis propias diapositivas?"). */
function protectIdea(c: Ctx, tags: string[]) {
  const agenda = tags.includes("agenda");
  if (fbOpen(c)) {
    if (!once(c, "fb")) return;
    c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "accept"; c.s.ideaEarly = true;
    c.say(agenda ? "protect_agenda" : "protect_ok");
    return;
  }
  if (!c.s.pushed || c.s.protectDone || !once(c, "protect")) return;
  c.s.protectDone = true; c.s.protectHow = agenda ? "agenda" : "own";
  if (agenda) { c.say("protect_agenda"); c.say("protect_keep"); return; }
  c.say("protect_ok"); c.say("protect_agenda_too");
}

/** "No sé": she proposes the agenda herself. A clear yes takes it; "Gracias.", "Puede ser." or "¿En la agenda?" get
 *  "Tus partes en la agenda, con tu nombre. ¿Te parece?" once, and the next time she decides it herself. */
function protectOffer(c: Ctx) {
  if (c.s.protectDone || !once(c, "protectOffer")) return;
  c.say("protect_help");
  protectExpect(c);
}
function protectExpect(c: Ctx) {
  const no = (cc: Ctx) => { if (cc.s.protectDone) return; cc.s.protectDone = true; cc.s.protectHow = "later"; cc.say("protect_no"); };
  const unclear = (cc: Ctx) => {
    if (cc.s.protectDone || !once(cc, "protectQ")) return;
    if (cc.s.protectQ) { cc.s.protectDone = true; cc.s.protectHow = "emily"; cc.say("protect_decide"); return; }
    cc.s.protectQ = true; cc.say("protect_offer_q"); protectExpect(cc);
  };
  const yes = (cc: Ctx) => {
    if (saidNo(cc)) { no(cc); return; }
    if (unclearYes(cc)) { unclear(cc); return; }
    if (cc.s.protectDone) return; cc.s.protectDone = true; cc.s.protectHow = "emily"; cc.say("protect_yes");
  };
  c.expect({ id: "protect_offer", optional: true, expects: ["protect_idea", "agree_idea", "maybe_ctx"], hints: ["protect", "checkin"],
    suggest: [{ lt: "Answer Elena's suggestion", hint: "checkin" }],
    on: {
      // "¿En la agenda?" asks her idea back; "¿Podemos poner mis partes en la agenda?" takes it
      protect_idea: (cc, _s, seg) => { if (seg.tags.includes("agenda") && echoQ(cc)) unclear(cc); else protectIdea(cc, seg.tags); },
      agree_idea: (cc) => { yes(cc); }, g_ok: (cc) => { yes(cc); }, g_thanks: (cc) => { yes(cc); }, fb_thanks: (cc) => { yes(cc); }, maybe_ctx: unclear,
    },
    yes, no,
    ask: (cc) => { cc.say("protect_help"); } });
}

/** The wrong tab: pointed out tactfully, or read aloud (a tip). */
function tabPoint(c: Ctx, read: boolean) {
  if (c.s.twist !== "tab" || asks(c, "tab") < 1 || c.s.tabDone || !once(c, "tab")) return;
  c.s.tabDone = true; c.s.tabHow = read ? "read" : "tactful";
  if (read) { c.tip(TIPS.discreet); c.say("tab_close_read"); } else c.say("tab_close");
  tabAfter(c);
}
/** She notices it herself. */
function tabSelf(c: Ctx) {
  if (c.s.tabDone || !once(c, "tab")) return;
  c.s.tabDone = true; c.s.tabHow = "self";
  c.say("tab_notice"); c.say("tab_close_self");
  tabAfter(c);
}
function tabAfter(c: Ctx) {
  c.event("screen", { tab: "mine" });
  c.say("tab_ben"); c.say("tab_mine"); c.say("tab_mine2");
}

/** A goal for next year (item 4). */
function goalFrom(c: Ctx, id?: string, force = false) {
  const e = look(GOALS, id);
  if (!e || c.s.goalDone) return;
  if (!force && c.step !== "goals" && !(c.s.fbDone && protectOk(c) && tabOk(c))) return;
  if (!once(c, "goal")) return;
  c.s.goal = e.id; c.s.goalDone = true;
  const kind = e.attrs?.kind;
  if (kind === "skill") c.say("goal_present");
  else if (kind === "lead") c.say("goal_lead");
  else if (kind === "mentor") c.say("goal_mentor");
  else {
    c.say(/\b(curso|taller|diplomado|clase|capacitacion)\b/.test(fold(c.heard)) ? "goal_course" : "goal_learn", { X: e.id });
    if (!c.s.budgetSaid) { c.s.budgetSaid = true; c.say("budget_amount"); }
  }
  c.say("goal_set");
}

/** "Quiero crecer." / "Quiero dejar de presentar.": her list of ideas (a negative goal is never the goal). */
function goalVague(c: Ctx, first?: string) {
  if (c.s.goalDone || c.step !== "goals") return;
  if (asks(c, "goals") >= 2 && !first) return;
  if (!once(c, "vague")) return;
  if (first) c.say(first);
  if (asks(c, "goals") < 2) { bump(c, "goals"); c.say("goals_options"); }
  c.hold();
}

/** The goals question after her list: her own suggestion once; after that, the goal waits for next time (item 4
 *  not ticked). */
function goalsLast(c: Ctx) {
  if (!c.s.goalOffered) { c.s.goalOffered = true; goalOffer(c); return; }
  c.s.goalDone = true; c.say("goal_later"); askNext(c);
}

/** "Un curso." (one of her ideas): which one? */
function goalCourse(c: Ctx) {
  if (c.s.goalDone || c.step !== "goals" || c.s.courseQ || !once(c, "vague")) return;
  c.s.courseQ = true;
  c.say("goal_which_course"); c.hold();
}

/** After two tries she suggests a goal herself: only a clear yes agrees on it. "Gracias.", "Está bien, gracias.",
 *  "Puede ser." or her idea asked back ("¿Presentaciones a clientes?") get "Las presentaciones a clientes, sí. ¿Te parece
 *  bien como meta?" once; the next time, or at a no, the goal waits for next time (item 4 not ticked). */
function goalOffer(c: Ctx) {
  c.say("goals_suggest");
  goalOfferExpect(c);
}
function goalOfferExpect(c: Ctx) {
  const decline = (cc: Ctx) => { if (cc.s.goalDone) return; cc.s.goalDone = true; cc.say("goal_later"); };
  const unclear = (cc: Ctx) => {
    if (cc.s.goalDone || !once(cc, "goalOfferQ")) return;
    if (cc.s.goalOfferQ) { decline(cc); return; }
    cc.s.goalOfferQ = true; cc.say("goal_offer_q"); goalOfferExpect(cc);
  };
  const set = (cc: Ctx) => { if (saidNo(cc)) { decline(cc); return; } if (unclearYes(cc)) { unclear(cc); return; } goalFromOffer(cc, "presenting"); };
  // a goal named back: hers as a question is no yes; another one is the learner's own choice
  const named = (cc: Ctx, id?: string) => {
    if (whatQ(cc)) { goalWhat(cc); goalOfferExpect(cc); return; }
    if ((id ?? "presenting") === "presenting" && (echoQ(cc) || tagQ(cc))) { unclear(cc); return; }
    goalFromOffer(cc, id);
  };
  c.expect({ id: "goal_offer", optional: true, expects: ["goal_name", "goal_ctx", "goal_what_ctx", "agree_idea", "maybe_ctx"], hints: ["goals", "checkin"],
    suggest: [{ lt: "Answer Elena's suggestion", hint: "checkin" }, { lt: "Say what you'd like to work on next year", hint: "goals", options: "goal" }],
    on: {
      goal_name: (cc, slots, seg) => { named(cc, slots.goal ?? seg.tags.find((x) => x.startsWith("g:"))?.slice(2)); },
      goal_ctx: (cc, slots) => { named(cc, slots.goal); },
      goal_what_ctx: (cc) => { goalWhat(cc); goalOfferExpect(cc); },
      agree_idea: (cc) => { set(cc); }, g_ok: (cc) => { set(cc); }, g_thanks: (cc) => { set(cc); }, maybe_ctx: unclear,
      goal_not: (cc, slots) => { if (tagQ(cc) && slots.goal) named(cc, slots.goal); else decline(cc); },
    },
    yes: set,
    no: decline });
}
/** "¿Qué es UX writing?": what the word means (the global "¿Qué significa…?" answers that one itself). */
function goalWhat(c: Ctx) {
  if (/\b(que significa|que quiere decir)\b/.test(fold(c.heard)) || !once(c, "goalWhat")) return;
  GLOBAL_HANDLERS.g_meaning(c as any, {});
}
function goalFromOffer(c: Ctx, id?: string) {
  if (c.s.goalDone) return;
  goalFrom(c, id ?? "presenting", true);
}

/** "¿Hay presupuesto para capacitación?" */
function budget(c: Ctx) {
  if (!once(c, "budget")) return;
  if (c.s.budgetSaid) c.say("budget_again");
  else { c.s.budgetSaid = true; c.say(/\b(cuanto|quien)\b/.test(fold(c.heard)) ? "budget_amount" : "budget_yes"); }
  c.s.budgetAsked = true;
  if (c.step === "goals" && !c.s.goalDone) { c.say("budget_what"); c.hold(); return; }
  if (c.step === "support") c.s.supportDone = true;
}

/** Asking for support with the goal. */
function support(c: Ctx) {
  if (!once(c, "support")) return;
  if (c.step === "goals" && !c.s.goalDone) { c.say("support_first"); c.hold(); return; }
  if (!c.s.goal) return;
  c.s.supportAsked = true; c.s.supportDone = true;
  c.say("support_yes");
}
function supportHelp(c: Ctx) {
  if (c.s.supportDone || !once(c, "support")) return;
  c.s.supportDone = true;
  c.say("support_offer");
}

/** The role reversal. */
function revDecline(c: Ctx) {
  if (c.s.revDone || !once(c, "rev")) return;
  c.s.revDone = true; c.s.revHow = "declined";
  c.say("rev_decline_react");
}
function revWorked(c: Ctx, mg?: string) {
  if (c.s.twist !== "reverse" || c.s.revDone || c.s.revWorked || asks(c, "rev_open") < 1 || !once(c, "revWorked")) return;
  c.s.revOpen = true; c.s.revWorked = true; c.s.revGood = mg ?? "general";
  c.say(c.s.revGood === "general" ? "rev_worked_react_general" : "rev_worked_react");
}
function revTry(c: Ctx, mt?: string) {
  if (c.s.twist !== "reverse" || c.s.revDone || asks(c, "rev_open") < 1 || !once(c, "revTry")) return;
  c.s.revOpen = true; c.s.revWorked = true; c.s.revDone = true; c.s.revHow = "tip"; c.s.revTry = mt ?? "other";
  const line = "rev_tip_" + (mt && look(MTIPS, mt) ? mt : "other");
  c.say(line);
  c.say("rev_hadnt");
  if (c.chance(0.5)) c.say("rev_will");
}
function revNothing(c: Ctx) {
  if (c.s.twist !== "reverse" || c.s.revDone || !c.s.revWorked || !once(c, "revNothing")) return;
  c.s.revNothing = (c.s.revNothing ?? 0) + 1;
  if (c.s.revNothing === 1 && asks(c, "rev_try") < 2) { bump(c, "rev_try"); c.say("rev_something"); c.hold(); return; }
  c.s.revDone = true; c.s.revHow = "nothing";
  c.say("rev_giveup");
}
function revRude(c: Ctx) {
  if (c.s.twist !== "reverse" || c.s.revDone || asks(c, "rev_open") < 1 || !once(c, "revRude")) return;
  c.tip(TIPS.kind);
  c.s.revOpen = true; c.s.revRude = (c.s.revRude ?? 0) + 1;
  if (c.s.revRude >= 2) { c.s.revDone = true; c.s.revHow = "rude"; c.say("rev_giveup"); return; }
  c.s.revWorked = true;
  c.say("rev_ouch"); c.hold();
}

/** A question about a raise or a promotion (item 6), and about what counts. */
function money(c: Ctx, criteria: boolean) {
  if (!c.s.feelDone || !once(c, "money")) return;
  if (!c.s.goalDone && !c.s.moneyEarly) {
    c.s.moneyEarly = true; c.s.moneyAsked = true; c.s.moneyWhen = true;
    if (criteria) { c.s.criteriaAsked = true; }
    moneyIntro(c, true); c.say("money_when"); c.say("money_later");
    c.hold();
    return;
  }
  c.s.moneyAsked = true;
  if (!c.s.moneyWhen) { c.s.moneyWhen = true; moneyIntro(c); c.say("money_when"); }
  if (criteria || c.s.criteriaAsked) { criteriaAnswer(c, true); return; }
  if (c.s.__finished) { criteriaAnswer(c, false); return; }
  c.hold();
}
/** "Buena pregunta." to a question; "Bueno. Anotado." to "Creo que me merezco un aumento". */
function moneyIntro(c: Ctx, early = false) {
  const q = isQuestion(c) || /^\W*(?:(?:y|bueno|oye|entonces|ok|elena|tambien|pues)\W+)*(puedo|podemos|podria|podriamos|hay|habra|cuando|como|que|voy|me van|me vas|esta|afecta|cual|se puede|va a|cuanto|de cuanto)\b/.test(fold(c.heard));
  const talk = /\b(podemos|podriamos|puedo|podria|quisiera|me gustaria) (hablar|preguntar|platicar)\b/.test(fold(c.heard));
  c.say(talk && !early ? "money_sure" : q || talk ? "money_q" : "money_noted");
}
/** "¿Cuál es mi calificación?" / "¿Puedo ver mi evaluación?": very good, and she emails it today. At the wrong tab it
 *  makes her look again (she notices Pablo's review herself). */
function rating(c: Ctx) {
  if (c.step === "tab" && c.s.twist === "tab" && asks(c, "tab") >= 1 && !c.s.tabDone) { tabSelf(c); return; }
  if (!once(c, "rating")) return;
  if (c.s.ratingSaid) { c.say("fb_example_more"); return; }
  c.s.ratingSaid = true;
  c.say("my_review");
}
function criteriaAnswer(c: Ctx, asked: boolean) {
  if (c.s.criteriaDone) return;
  c.s.criteriaDone = true; c.s.friday = true;
  if (asked) c.s.criteriaAsked = true;
  if (asked) c.say("criteria_honest");
  c.say("criteria_why");
  c.say("criteria_promise");
}

/** Item 5 is ticked when the next meeting is agreed; the course report is done if 2–4 are too. */
function agree(c: Ctx, other: boolean) {
  if (!once(c, "agree") || c.s.checkin) return;
  c.s.checkin = true;
  if (other) c.say("checkin_other");
  if (coreDone(c)) {
    c.s.goalMet = true;
    c.complete();
    c.say("bye_good");
  } else c.say("bye_partial");
  if (!c.s.back) c.say("bye_plant");
  rememberVisit(c);
  c.end();
}

function rememberVisit(c: Ctx) {
  const seen: string[] = c.memory.twists ?? [];
  const now = [...(c.s.revOpen || c.s.revDone ? ["reverse"] : []), ...(c.s.tabDone ? ["tab"] : [])];
  c.remember({ twists: [...new Set([...seen, ...now])], reviewDone: !!c.s.goalMet });
}

/** The summary, "¿Algo más?" and the check-in. */
function closing(c: Ctx) {
  c.say("sum_intro");
  if (c.s.pushed && c.s.protectDone && c.s.protectHow !== "later") c.say("sum_agenda");
  else if (c.s.fbOk) c.say("sum_speak");
  const g = look(GOALS, c.s.goal);
  if (g) {
    if (g.attrs?.kind === "lead") c.say("sum_lead"); else c.say("sum_goal", { X: g.id });
    if (g.attrs?.kind === "course") c.say("sum_budget");
  }
  if (c.s.friday) c.say("sum_friday");
  c.say("sum_anything");
  expectAnything(c);
}

function expectAnything(c: Ctx) {
  const done = (cc: Ctx) => { if (once(cc, "closeAns")) checkinAsk(cc, /\b(gracias|sirve|ayud|aprecio|agradezco)/.test(fold(cc.heard))); };
  const thanks = done;
  const askMore = (cc: Ctx) => { if (!once(cc, "moreQ")) return; cc.say("askme_go"); expectAnything(cc); };
  c.expect({
    id: "anything_else",
    expects: ["no_more", "fb_thanks", "thanks_today", "ask_raise", "ask_criteria", "ask_budget", "propose_checkin", "agree_idea", "more_q_ctx"],
    hints: ["closing", "askme"],
    suggest: [{ lt: "Thank her and wrap up", hint: "closing" }, { lt: "Ask about a raise or a promotion", hint: "askme" }],
    on: {
      no_more: done, proud_none: done, rev_nothing: done, agree_idea: done, g_ok: done, g_dontknow: done, fb_thanks: thanks, thanks_praise: thanks, g_thanks: thanks, thanks_today: thanks,
      ask_raise: (cc) => { lateMoney(cc, false); }, ask_criteria: (cc) => { lateMoney(cc, true); },
      more_q_ctx: askMore,
      ask_budget: (cc) => { budget(cc); cc.say("askme_else"); expectAnything(cc); },
      propose_checkin: (cc, _s, seg) => {
        if (seg.tags.includes("when")) { if (once(cc, "closeAns")) checkinAsk(cc, false); return; }
        checkinProposal(cc, seg.tags); agree(cc, false);
      },
      g_bye: (cc) => { if (!cc.s.checkinAsked) cc.say("checkin_ask"); agree(cc, false); },
    },
    // "Sí" / "Sí, una pregunta" opens a question; "Perfecto" / "Muy bien" / "Está bien" agree with the summary
    yes: (cc) => { if (/\b(perfecto|bien|de acuerdo|genial|excelente)\b/.test(fold(cc.heard)) && !/pregunta|una cosa|algo mas/.test(fold(cc.heard))) done(cc); else askMore(cc); },
    no: done,
    ask: (cc) => { cc.say("askme_else"); },
  });
}

/** A money question at the very end: the whole answer at once, then "¿Algo más?" again. */
function lateMoney(c: Ctx, criteria: boolean) {
  if (!once(c, "money")) return;
  c.s.moneyAsked = true;
  if (!c.s.moneyWhen) { c.s.moneyWhen = true; moneyIntro(c); c.say("money_when"); }
  criteriaAnswer(c, criteria);
  c.say("askme_else");
  expectAnything(c);
}

/** The learner proposes the next check-in; "como dijiste" later repeats what they said (a month, a few weeks, soon). */
function checkinProposal(c: Ctx, tags: string[]) {
  c.s.checkinProposed = true;
  c.s.checkinWhen = tags.includes("month") ? "month" : tags.includes("weeks") ? "weeks" : "other";
}

function checkinAsk(c: Ctx, thanks: boolean) {
  if (!once(c, "checkinAsk")) return;
  if (thanks && once(c, "glad")) c.say("anything_thanks");
  c.s.checkinAsked = true;
  if (c.s.checkinProposed) { c.say("checkin_like_said" + (c.s.checkinWhen === "month" ? "" : c.s.checkinWhen === "weeks" ? "_weeks" : "_other")); agree(c, false); return; }
  c.say("checkin_ask");
  expectCheckin(c);
}
/** The check-in in a month: a clear yes agrees on it ("Suena bien.", "Sí.", "A la misma hora está bien."); "Gracias.",
 *  "Está bien, gracias.", "Puede ser." or the time asked back ("¿En un mes?", "¿A la misma hora?") get "En un mes, a la
 *  misma hora. ¿Te parece bien?" once, and the next time she sends an invite and the learner picks the time. */
function expectCheckin(c: Ctx) {
  const unclear = (cc: Ctx) => {
    if (!once(cc, "checkinQ")) return;
    if (cc.s.checkinQ) { agree(cc, true); return; }
    cc.s.checkinQ = true; cc.say("checkin_again"); expectCheckin(cc);
  };
  const yes = (cc: Ctx) => { if (saidNo(cc)) { agree(cc, true); return; } if (unclearYes(cc)) { unclear(cc); return; } agree(cc, false); };
  // a thanks alone ("Gracias por todo.") is no yes to the date; with a goodbye it ends like the goodbye
  const thanks = (cc: Ctx) => {
    if (saidNo(cc)) { agree(cc, true); return; }
    if (unclearYes(cc)) { unclear(cc); return; }
    if (yesWord(cc) || /\b(adios|bye|hasta luego|hasta pronto|me voy|chao)\b/.test(fold(cc.heard))) agree(cc, false); else unclear(cc);
  };
  c.expect({
    id: "checkin",
    expects: ["checkin_yes_ctx", "checkin_no_ctx", "propose_checkin", "agree_idea", "maybe_ctx"],
    hints: ["checkin"],
    suggest: [{ lt: "Agree on the next check-in", hint: "checkin" }],
    on: {
      checkin_yes_ctx: (cc) => { if (echoQ(cc)) unclear(cc); else agree(cc, false); },
      // "¿Cuándo nos vemos?" asks the date back
      propose_checkin: (cc, _s, seg) => { if (seg.tags.includes("when")) unclear(cc); else yes(cc); },
      rev_nothing: yes, agree_idea: yes, g_ok: yes, g_bye: yes,
      g_thanks: thanks, fb_thanks: thanks, thanks_praise: thanks, thanks_today: thanks, maybe_ctx: unclear,
      checkin_no_ctx: (cc) => { agree(cc, true); }, g_dontknow: (cc) => { agree(cc, true); },
    },
    yes, no: (cc) => { agree(cc, true); },
    ask: (cc) => { cc.say("checkin_ask"); },
  });
}

// A step's question after a "No sé" that nothing else answered: its help instead, once per step. A second "No sé"
// takes the question's own way out (its last branch: she moves on, suggests, or decides herself), so it never loops
// ("¿Estás de acuerdo? Está bien si no." again and again).
const GIVE_UP = 99;
for (const st of review.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) {
      DONT_KNOW.delete(c);
      if (bump(c, "help_" + st.id) === 1) {
        st.help(c);
        if (c.step === st.id && st.done(c)) askNext(c);
        return;
      }
      c.s.asks[st.id] = Math.max(asks(c, st.id), GIVE_UP);
    }
    ask(c);
  };
}

export default review;
