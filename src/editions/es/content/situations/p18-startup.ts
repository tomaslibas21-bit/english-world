// Advanced song P18 "Up to My Ears" → Puerto Colibrí: "Hasta el cuello" (B2–C1): a week at a startup, and a founder
// who talks in idioms and startup Spanglish. Brotecito, a plant-care app in an old warehouse on the waterfront (a red
// slide — "la resbaladilla" —, beanbags, a wall of sticky notes, Wifi the dog asleep by the printer). Wednesday of the
// learner's first week. Toño, the founder (hoodie, sandals, kind and chaotic, tú like everyone at a Mexican startup),
// wants "un check-in rápido" and asks how it's going ("Al principio todo está en chino, ¿no?"). The learner answers
// plainly or with an idiom ("Le estoy agarrando la onda"). Then he piles on three new tasks (the investor deck by
// Friday, the launch party, a photo for the newsletter: "¡Manos a la obra! ¡Piensa fuera de la caja!") on top of the
// learner's bug reports and customer emails. The learner says it's too much ("Estoy hasta el cuello con los reportes
// de errores", "Ya no me doy abasto", "Ya tengo mucho trabajo") and settles the priorities: asks ("¿Qué hago
// primero?") or proposes ("Puedo hacer la presentación primero, y lo demás la próxima semana", "¿Alguien más puede
// hacer la fiesta?"). A party-first plan gets one gentle push back. Then "¿Necesitas algo más de mí?": who owns what
// (the budget and payroll are Raquel's, the party and the newsletter Beto's, the code Memo's, the deck is due Friday
// at twelve). The first such question gets "Eso lo vemos aparte"; asking again gets the real answer. At the end:
// "¿Hacemos otro check-in mañana a las ocho?" The learner agrees, moves it ("¿Podemos hacerlo al mediodía?") or
// calls it a day ("¡Dejémoslo por hoy!").
// Every idiom Toño uses can be asked about at any moment ("¿Qué significa jalar parejo?", "¿Cómo que en chino?",
// "¿Es una expresión?", "¿Cuál caja?"): he explains it in plain Spanish (two versions each, 17 idioms) and goes on.
// The global "¿Qué significa…?" never answers them generically: idiom_q outranks g_meaning (tests below), and the
// g_meaning / g_dont_understand handlers here explain the idiom Toño just used. When the learner uses one of the
// song's idioms, Toño notices once ("¡Mírate, hablando como fundador!").
// Twists (one per visit: 35 % on the first visit, 85 % later, an unseen one first):
//   crash    (the song): after the priorities, the launch crashes: someone did the code "al aventón", a million
//            cactuses texted "¡Riégame!", "Hay que empezar de cero. ¡La pelota está en tu cancha!" The learner proposes
//            a plan (fix the bug first, tell the customers, call Memo, launch next week, go back to the old version)
//            or asks what he wants; "¿Quién lo hizo al aventón?" gets an honest "Yo."
//   midnight before the goodbye: "Necesito a todos aquí hasta la medianoche. ¡En Brotecito hay que ponerse las
//            pilas!" The learner negotiates ("Puedo quedarme hasta las siete, pero luego lo dejo por hoy", "¿Las horas
//            extra son pagadas?") or says no ("Hoy no puedo quedarme hasta tarde"). Toño agrees to paid overtime with
//            a finish time ("como dice la ley": Mexican law requires overtime to be paid; the rate is not said).
//            "No puedo quedarme" / "No sé si puedo quedarme" never agree to stay.
// Commas are lost (rule 10): at "¿Es demasiado?" "No puedo con todo" could be "No, puedo con todo": Toño asks again
// once ("¿Entonces sí puedes con todo, o es demasiado?"); at "Fácil, ¿no?" it is too much.
// Mexican-only words with a neutral twin on their lines: chamba, echarle ganas, agarrarle la onda, jalar parejo, al
// aventón, la resbaladilla (twins: trabajo, dar con todo, agarrarle el ritmo, poner de su parte, a la carrera, el
// tobogán). Startup Spanglish the whole region knows: check-in, pitch deck, bugs. Spain forms accepted: vale, coger
// (más trabajo), "estoy a tope", vosotros ("¿Pagáis las horas extra?").
//
// The people Toño names (not characters of the cast; the English names Rachel, Kevin, Ben, Brad): Raquel (sales,
// budget, payroll), Beto (marketing), Memo (the developer), Rodrigo (sales, plays ping-pong).
//
// Course report: done (c.complete) when items 2, 3 and 4 of the mission are ticked. Items 1 and 5 are optional.
//
// NEEDS: none.

import type { Ctx, EntityDef, Pending, Segment, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_ART = "The article has no English word here.";
const F_A = "a marks a person as the object; English needs no word.";
const F_LE = "le doubles the person named after the verb; English needs no word.";
const F_CHECK = "Startup Spanglish: un check-in = a quick catch-up meeting.";
const F_AVENTON = "Mexican: al aventón = in a rush, sloppily (to cut corners).";
const F_AVENTON_N = "a la carrera = in a rush, without care (to cut corners).";
const F_PAREJO = "Mexican: jalar parejo = everyone pulls equally (to pull your weight).";
const F_PAREJO_N = "poner de su parte = to do your share.";
const F_ONDA = "Mexican: agarrarle la onda = to get the hang of it.";
const F_ONDA_N = "agarrarle el ritmo = to get the hang of it.";
const F_GANAS = "Mexican: echarle ganas = to give it your all.";
const F_GANAS_N = "dar con todo = to give it your all.";
const F_CHAMBA = "Mexican: la chamba = work, a job (informal).";
const F_CHINO = "estar en chino = to be impossible to understand (English says “Greek to me”).";
const F_CRACK = "un crack = an ace, a star (from soccer slang).";
const F_CON = "poder con algo = to handle it.";
const F_SI = "sí stresses the contrast: what CAN you do.";

// ---------------------------------------------------------------------------
// Entities: the tasks and the areas somebody owns

const SLIDES = ent("slides", "presentación | para | inversionistas", "deck | for | investors", "f",
  { pl: "presentaciones | para | inversionistas", ltPl: "decks | for | investors", chip: "presentación", attrs: { nat: "investor deck", fresh: true },
    forms: ["presentacion", "la presentacion", "presentacion para los inversionistas", "la presentacion para los inversionistas", "presentacion para inversores",
      "las diapositivas", "diapositivas", "las diapos", "diapos", "el pitch deck", "pitch deck", "el deck", "deck", "el pitch", "pitch", "las slides", "slides",
      "las laminas", "laminas", "el power point", "power point", "la presentacion de los inversionistas"] });
const PARTY = ent("party", "fiesta | de | lanzamiento", "party | for | launch", "f",
  { pl: "fiestas | de | lanzamiento", ltPl: "parties | for | launch", chip: "fiesta", attrs: { nat: "launch party", fresh: true, other: true },
    forms: ["fiesta", "la fiesta", "el evento", "evento de lanzamiento", "el evento de lanzamiento", "fiesta del lanzamiento", "la fiesta del lanzamiento", "la party", "la pachanga"] });
const PHOTO = ent("photo", "foto | para | el | boletín", "photo | for | the | newsletter", "f",
  { pl: "fotos | para | el | boletín", ltPl: "photos | for | the | newsletter", chip: "foto", attrs: { nat: "newsletter photo", fresh: true, other: true },
    forms: ["foto", "la foto", "fotografia", "la fotografia", "foto del boletin", "la foto del boletin", "foto para el newsletter", "foto del newsletter",
      "la foto del newsletter", "el boletin", "boletin", "newsletter", "el newsletter", "la imagen", "imagen", "la foto para el boletin"] });
const BUGS = ent("bugs", "reporte | de | errores", "report | of | bugs", "m",
  { pl: "reportes | de | errores", ltPl: "reports | of | bugs", chip: "reportes de errores", attrs: { nat: "bug reports", mine: true, plural: true },
    forms: ["reportes de errores", "reportes de error", "los reportes de errores", "los errores", "errores", "los bugs", "bugs", "reportes de bugs", "los reportes de bugs",
      "los tickets", "tickets", "los reportes", "reportes", "las fallas", "fallas", "informes de errores"] });
const EMAILS = ent("emails", "correo | de | clientes", "email | from | customers", "m",
  { pl: "correos | de | clientes", ltPl: "emails | from | customers", chip: "correos de clientes", attrs: { nat: "customer emails", mine: true, plural: true },
    forms: ["correos", "los correos", "correos de clientes", "los correos de clientes", "correos de los clientes", "los correos de los clientes", "los emails", "emails",
      "los mails", "mails", "los mensajes de los clientes", "mensajes de clientes", "atencion a clientes", "soporte", "el soporte", "los correos de soporte"] });
const TASKS: EntityDef[] = [SLIDES, PARTY, PHOTO, BUGS, EMAILS];

const AREAS: EntityDef[] = [
  ent("budget", "presupuesto", "budget", "m", { chip: "presupuesto", forms: ["el presupuesto", "el dinero", "los gastos", "la lana", "las finanzas"] }),
  ent("payroll", "nómina", "payroll", "f", { chip: "nómina", forms: ["la nomina", "nomina", "los sueldos", "sueldos", "los salarios", "salarios", "los pagos", "la quincena", "el pago de la nomina"] }),
  PARTY, PHOTO, SLIDES,
  ent("code", "código", "code", "m", { chip: "código", forms: ["el codigo", "codigo", "los servidores", "servidores", "la app", "la aplicacion", "la parte tecnica", "lo tecnico", "la pagina web", "el sitio web"] }),
  BUGS, EMAILS,
];
const byId = (id: string) => [...TASKS, ...AREAS].find((e) => e.id === id);
/** Bind a task; a plural one (los reportes de errores) needs plural agreement. */
const tv = (id: string) => ({ id, qty: byId(id)?.attrs?.plural ? 2 : 1 });
const notPlural = (e: EntityDef) => !e.attrs?.plural;

// ---------------------------------------------------------------------------
// Clock hours (the meeting and the overtime): kept as ids, said with {$time}

const HOUR_IDS = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11", "noon", "midnight"];
const MEET_OK = new Set(["h1", "h2", "h3", "h4", "h5", "h7", "h8", "h9", "h10", "h11", "noon"]);
/** A clock time from the {time} slot → an hour id (whole hours only). */
function hourId(tm?: { h: number; m: number; ampm?: string }): string | undefined {
  if (!tm || typeof tm.h !== "number" || tm.m !== 0) return undefined;
  if (tm.h === 0 || tm.h === 24 || (tm.h === 12 && tm.ampm === "am")) return "midnight";
  if (tm.h === 12) return "noon";
  return "h" + (tm.h > 12 ? tm.h - 12 : tm.h);
}
/** The hour the learner stays until tonight: "hasta las doce" in the evening is midnight, never noon. */
const midHour = (tm?: { h: number; m: number; ampm?: string }): string | undefined => { const h = hourId(tm); return h === "noon" ? "midnight" : h; };
/** An hour id → the {$time} value. */
const hourTime = (id: string) => ({ h: id === "noon" ? 12 : id === "midnight" ? 12 : Number(id.slice(1)), m: 0 });

// ---------------------------------------------------------------------------
// Idioms: the explanation lines (mean_<id>) and which of Toño's lines use which idiom

const IDIOMS = ["checkin", "chino", "onda", "crack", "manos", "caja", "cuello", "pagina", "parejo", "aventon", "cero", "cancha",
  "aparte", "por_hoy", "pilas", "ganas", "chamba"] as const;

const LINE_IDIOMS: Record<string, string[]> = {
  greet: ["checkin"], hello_q: ["chino"], hello_learn: ["crack"], hello_skip: ["onda"], hello_hard: ["ganas"],
  pile_intro: ["chamba", "manos"], pile_box: ["caja"], pile_weight: ["parejo"], pile_know: ["cuello"], rockstar: ["crack"],
  over_react: ["cuello"], deal_yes: ["pagina"], deal_no: ["checkin"], prio_ok: ["pagina"], prio_ok_generic: ["pagina"], prio_ok_then: ["pagina"],
  deleg_brad: ["parejo"], push_no: ["aventon"], prio_already: ["pagina"], same_page_yes: ["pagina"], who_rodrigo: ["parejo"],
  crash_2: ["aventon"], crash_3: ["cero", "cancha"], crash_end: ["aventon"], ball_back_react: ["cancha"], owner_evasive: ["aparte"],
  mid_2: ["pilas"], mid_limit: ["por_hoy"], mid_limit_generic: ["por_hoy"], mid_yes: ["crack"], close_q: ["checkin"], call_day_react: ["por_hoy"],
  close_good: ["por_hoy"], close_partial: ["checkin"], bye_early: ["checkin"], dog: ["aventon"],
  ...Object.fromEntries(IDIOMS.map((id) => [`mean_${id}`, [id]])),
};

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "¿Qué significa caja?": a word of the idiom → the idiom. */
const IDIOM_WORDS: [RegExp, string][] = [
  [/\bcheck ?-?in\b|\bchequin\b/, "checkin"], [/\bchino\b/, "chino"], [/\bonda\b|\britmo\b/, "onda"], [/\bcrack\b/, "crack"],
  [/\bmanos\b|\bobra\b/, "manos"], [/\bcaja\b/, "caja"], [/\bcuello\b/, "cuello"], [/\bpagina\b/, "pagina"],
  [/\bparejo\b|\bde (tu|su|nuestra) parte\b/, "parejo"], [/\baventon\b|\ba la carrera\b/, "aventon"], [/\bceros?\b/, "cero"],
  [/\bcancha\b|\bpelota\b/, "cancha"], [/\baparte\b/, "aparte"], [/\bpor hoy\b/, "por_hoy"], [/\bpilas\b/, "pilas"],
  [/\bganas\b|\bdale con todo\b|\bdar con todo\b/, "ganas"], [/\bchamba\b/, "chamba"],
];
function idiomFromWords(w: unknown): string | undefined {
  const s = fold(String(w ?? ""));
  for (const [re, id] of IDIOM_WORDS) if (re.test(s)) return id;
  return undefined;
}
/** A hedge ("No sé si puedo…", "No creo que pueda…") is never a yes. */
const HEDGE = /\b(no se si|no creo|no estoy segur[oa]|dudo|tal vez no|quizas no|a lo mejor no)\b/;
const heard = (c: Ctx) => fold(c.heard || "");

// ---------------------------------------------------------------------------
// Per-turn helpers

const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
/** Toño's lines this turn: the first one starts a new list of the idioms he just used. */
const SPOKE = new WeakSet<Ctx>();
function T(c: Ctx, line: string, vars?: Record<string, any>) {
  if (!SPOKE.has(c)) { SPOKE.add(c); c.s.recent = []; }
  c.say(line, vars);
  for (const id of LINE_IDIOMS[line] ?? []) c.s.recent = [...(c.s.recent as string[]).filter((x) => x !== id), id];
}
/** The step whose question comes back short after an explanation ("¡En fin! …"), this turn only. */
const AFTER = new WeakMap<Ctx, string>();
/** "No sé" waits for the end of the turn (the step's question then gives its help), so an answer in the same breath
 *  wins ("No sé. ¿Tal vez la presentación primero?"). */
const DONT_KNOW = new WeakMap<Ctx, string>();
const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
/** How many times a step was asked. A question asked again after Toño already answered something this turn
 *  (a side question: the dog, who owns what) doesn't count toward giving up on it. */
function bump(c: Ctx, id: string): number {
  c.s.asks ||= {};
  const prev = asks(c, id);
  if (prev >= 1 && SPOKE.has(c)) return Math.max(prev, 2);
  c.s.asks[id] = prev + 1;
  return c.s.asks[id];
}
function resumed(c: Ctx, id: string): boolean {
  const r = AFTER.get(c) === id && asks(c, id) > 0;
  AFTER.delete(c);
  return r;
}
const first = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : (v as string | undefined)) ?? undefined;
const list = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v as string] : []);

const prioResolved = (c: Ctx) => !!c.s.prioDone || !!c.s.prioSkip;
const crashResolved = (c: Ctx) => !!c.s.crashDone || !!c.s.crashSkip;
const crashLive = (c: Ctx) => c.s.twist === "crash" && !!c.s.crashSaid && !crashResolved(c);
const midLive = (c: Ctx) => c.s.twist === "midnight" && !!c.s.midSaid && !c.s.midDone;
const closingLive = (c: Ctx) => !!c.s.ownerDone && (c.s.twist !== "midnight" || !!c.s.midDone) && !c.s.closeDone;
/** Items 2, 3 and 4: what the course report needs. */
const coreDone = (c: Ctx) => !!c.s.overloaded && !!c.s.prioDone && !!c.s.closeDone && c.s.closeHow !== "tyler";
const pendingOpen = (c: Ctx) => !!(c as any).conv?.pending;

/** Sims: no twist unless the sim pins one. */
const PLAIN = (s: Record<string, any>) => { s.twist = null; s.weightLine = false; };
const AUTO: Record<string, string> = {
  too_much: "Sí, es demasiado.", pushback: "Bueno, primero la presentación.", deal: "Trato hecho.", crash_ok: "Sí, hagamos eso.",
  mid_deal: "Trato hecho.", when: "¿Qué tal a las diez?", offer: "Claro.", closing: "¡Nos vemos mañana!",
};

// ---------------------------------------------------------------------------

export const startup: SituationDef = {
  id: "p18-startup",
  song: "P18",
  songTitle: "Up to My Ears",
  title: { en: "Hasta el cuello", lt: "Up to my neck" },
  topic: { en: "Una semana en una startup", lt: "A week at a startup" },
  chapter: 9,
  order: 1,
  location: "sproutly",
  npc: "tyler",
  goal: "Talk with a startup founder who speaks in idioms: ask what they mean, say you already have too much work, and agree on what comes first.",
  intro: "Wednesday of your first week at Brotecito, a plant-care app startup in an old warehouse on the waterfront: a slide, beanbags, a wall of sticky notes and a dog called Wifi. You already have bug reports and customer emails to deal with. Here comes Toño, the founder: kind, chaotic, and full of Mexican idioms. Colleagues here say tú to each other.",
  entities: { task: TASKS, area: AREAS },

  grammar: {
    macros: {
      // the people at Brotecito
      ppl: "(rodrigo | beto | memo | raquel | alguien mas | otra persona | otro | alguien | el practicante | un practicante | el becario | la becaria | alguien del equipo)",
      dov: "(hacer | encargarse de | organizar | ver | preparar | terminar | llevar | tomar | hacerse cargo de)",
      later: "(la proxima semana | la semana que viene | despues | mas tarde | el lunes | manana | el proximo lunes | despues del viernes | la otra semana)",
      tail_b: "[y] [luego | despues] [(puedo | voy a | podria) hacer] {b:task} (la proxima semana | la semana que viene | despues | mas tarde | el lunes | luego)",
      todo: "(todo | todo eso | todo esto | las tres cosas | eso | esto | tanto | las tres | todas esas cosas | todo lo demas)",
      busy: "(saturado | saturada | ocupado | ocupada | agobiado | agobiada | estresado | estresada | ahogado | ahogada | atareado | atareada | hasta el tope | a tope | a full | desbordado | desbordada | abrumado | abrumada)",
      fixv: "(arreglar | reparar | resolver | corregir | componer | arreglarlo | resolverlo | corregirlo | repararlo)",
      bugn: "(el error | el bug | ese error | este error | el codigo | el problema | el servidor | los servidores | la falla | la app | la actualizacion | los errores)",
      tellv: "(avisarles | avisar | decirles | escribirles | mandarles un mensaje | mandarles un correo | informarles | explicarles | contarles | informar)",
      custn: "(a los | a nuestros | a todos los) (clientes | usuarios)",
      sorryv: "((pedirles perdon | pedir perdon | pedirles una disculpa | pedir una disculpa | disculparnos) (a | con) (los | nuestros | todos los) (clientes | usuarios) | hablar con (los | nuestros | todos los) (clientes | usuarios))",
      askmemo: "(llamarle a memo | llamar a memo | hablarle a memo | marcarle a memo | pedirle ayuda a memo | despertar a memo | preguntarle a memo | hablar con memo)",
      launchlater: "((lanzar | relanzar | volver a lanzar | lanzarla | lanzarlo | intentarlo otra vez) (la proxima semana | despues | el lunes | manana | otro dia) | (posponer | aplazar | mover | retrasar | cambiar) el lanzamiento [a la proxima semana | para la proxima semana])",
      rollback: "((regresar | volver) a la version anterior | (quitar | apagar | desactivar | pausar) (la actualizacion | los mensajes | la funcion | la app) | (parar | detener) los mensajes | (deshacer | revertir) la actualizacion)",
      pl_body: "(@fixv [@bugn] #fix #h:fix_first | @tellv @custn #tell #h:tell_cust | @sorryv #tell | @askmemo #ben #h:ask_memo | @launchlater #later #h:launch_later | @rollback #rollback)",
      pl_hort: "((arreglemos | arreglamos | arreglo | reparemos | resolvamos | corrijamos) [@bugn] #fix | (avisemos | avisamos | les avisamos | escribamos | les escribimos | les mandamos un mensaje | informemos | les decimos) @custn #tell | (llamemos | le llamamos | le llamo | le marco | le hablo | le pedimos ayuda | le pido ayuda) a memo #ben | hablemos con memo #ben | (lancemos | lanzamos) (la proxima semana | despues | el lunes | otro dia) #later | (pospongamos | movamos) el lanzamiento [a la proxima semana] #later | (regresemos | volvamos | regresamos) a la version anterior #rollback)",
      pl_lead: "[primero] [hay que | tenemos que | deberiamos | vamos a | necesitamos | creo que hay que | creo que debemos | debemos | podemos | yo puedo | yo voy a | propongo | mejor | lo primero es]",
      stay_v: "(quedarme | quedarme aqui | trabajar | estar aqui | quedarme hasta tarde | trabajar hasta tarde)",
      me_stay: "(puedo quedarme | podria quedarme | me puedo quedar | me podria quedar | puedo trabajar | podria trabajar | puedo estar aqui | me quedo)",
      eight: "(las ocho | a las ocho | ocho)",
    },
    slots: {
      // every idiom Toño uses ("¿Qué significa…?"), with the forms people say when they repeat it
      idiom: { lexicon: [
        { id: "checkin", forms: ["check in", "checkin", "un check in", "el check in", "hacer un check in", "chequin", "chek in"] },
        { id: "chino", forms: ["en chino", "esta en chino", "todo esta en chino", "chino"] },
        { id: "onda", forms: ["agarrar la onda", "agarrarle la onda", "le vas a agarrar la onda", "la onda", "onda", "agarrarle el ritmo", "agarrar el ritmo", "el ritmo"] },
        { id: "crack", forms: ["crack", "un crack", "eres un crack"] },
        { id: "manos", forms: ["manos a la obra", "a la obra", "la obra"] },
        { id: "caja", forms: ["pensar fuera de la caja", "piensa fuera de la caja", "fuera de la caja", "la caja", "caja"] },
        { id: "cuello", forms: ["hasta el cuello", "estar hasta el cuello", "estas hasta el cuello", "estoy hasta el cuello", "el cuello", "cuello"] },
        { id: "pagina", forms: ["en la misma pagina", "la misma pagina", "misma pagina", "estar en la misma pagina", "estamos en la misma pagina"] },
        { id: "parejo", forms: ["jalar parejo", "jalamos parejo", "jale parejo", "jala parejo", "no jala parejo", "parejo", "poner de su parte", "poner de tu parte", "poner de nuestra parte"] },
        { id: "aventon", forms: ["al aventon", "aventon", "hacer las cosas al aventon", "a la carrera"] },
        { id: "cero", forms: ["empezar de cero", "de cero", "volver a empezar de cero", "desde cero", "cero"] },
        { id: "cancha", forms: ["la pelota esta en tu cancha", "en tu cancha", "tu cancha", "la cancha", "cancha", "la pelota", "en mi cancha"] },
        { id: "aparte", forms: ["lo vemos aparte", "verlo aparte", "aparte"] },
        { id: "por_hoy", forms: ["dejarlo por hoy", "dejemoslo por hoy", "lo dejas por hoy", "por hoy"] },
        { id: "pilas", forms: ["ponerse las pilas", "ponerte las pilas", "ponte las pilas", "las pilas", "pilas"] },
        { id: "ganas", forms: ["echarle ganas", "echale ganas", "ganas", "dale con todo", "dar con todo"] },
        { id: "chamba", forms: ["chamba", "la chamba", "mucha chamba"] },
      ] },
      // a bare echo ("¿Manos a la obra?"): only the idioms a learner wouldn't say as an answer of their own
      echo: { lexicon: [
        { id: "checkin", forms: ["check in", "un check in", "checkin"] },
        { id: "chino", forms: ["en chino"] },
        { id: "manos", forms: ["manos a la obra"] },
        { id: "caja", forms: ["fuera de la caja", "pensar fuera de la caja"] },
        { id: "parejo", forms: ["jalar parejo"] },
        { id: "aventon", forms: ["al aventon"] },
        { id: "cero", forms: ["de cero", "empezar de cero"] },
        { id: "cancha", forms: ["en mi cancha", "mi cancha", "en tu cancha"] },
        { id: "aparte", forms: ["aparte", "lo vemos aparte"] },
        { id: "por_hoy", forms: ["dejarlo por hoy"] },
        { id: "pilas", forms: ["ponerse las pilas", "las pilas"] },
        { id: "ganas", forms: ["echarle ganas", "echale ganas"] },
        { id: "crack", forms: ["un crack", "crack"] },
        { id: "chamba", forms: ["chamba"] },
        { id: "onda", forms: ["la onda", "agarrarle la onda"] },
      ] },
      person: { lexicon: [
        { id: "raquel", forms: ["raquel"] }, { id: "beto", forms: ["beto"] }, { id: "rodrigo", forms: ["rodrigo"] }, { id: "memo", forms: ["memo"] },
      ] },
    },
  },

  intents: {
    // --- how is the first week going -----------------------------------------------------
    finding: { patterns: [
      "[poco a poco | ya] (le estoy agarrando | le voy agarrando | ya le estoy agarrando | le agarré | ya le agarré) (la onda | el ritmo | el hilo | la mano) [poco a poco] #learn #idiom #h:onda",
      "[si] [todavia | casi] (todo | todo todavia | muchas cosas | casi todo) (esta | estan | me suena | me suenan) en chino [para mi] [pero me (gusta | encanta)] #learn #chino #idiom #h:chino",
      "[si] (un poco | bastante | totalmente | muchas cosas | todo) en chino #learn #chino #idiom",
      "hay (mucho | muchisimo | tanto | un monton) que aprender [aqui] [pero me (gusta | encanta)] #learn #h:lot_learn",
      "(esta | es) [muy] (increible | genial | padre | padrisimo | interesante | muy bien | bien) pero (es mucho | hay mucho que aprender | es mucho trabajo | es una locura) #good #h:great",
      "[bien] [estoy | voy] aprendiendo (mucho | muchisimo | rapido | cosas nuevas | todos los dias | poco a poco) #learn",
      "(estoy | me siento) [muy | super | bastante] (contento | contenta | feliz | a gusto | comodo | comoda) [aqui | con el equipo] #good",
      "todo es [muy] nuevo [para mi] #learn",
      "(todavia | aun) estoy aprendiendo [mucho | todo | como funciona todo] #learn",
      "(es | esta) [muy | super | bien] (interesante | divertido | divertida | emocionante) [hasta ahora] #good",
      "(son | es) muchas cosas nuevas #learn",
      "[la verdad] (estoy | me siento | ando) [un poco | algo | muy | bastante | totalmente | medio] (perdido | perdida | confundido | confundida | abrumado | abrumada) [la verdad] #hard #h:lost",
      "[la verdad] (es | esta) [un poco | muy | bastante | algo | medio] (dificil | complicado | pesado | intenso | caotico | estresante | una locura) #hard",
      "(todo | la semana | el trabajo) (va | esta | esta yendo | me esta yendo) [muy | super] (bien | genial | increible) [hasta ahora] #good",
      "me (esta | ha) (yendo | ido) [muy | super] (bien | genial) [hasta ahora] #good",
      "(me encanta | me gusta [mucho]) [estar] [aqui | el trabajo | el equipo | la oficina | todo] [hasta ahora] #good #h:love",
      "(muy bien | super bien | genial | increible | padrisimo | de maravilla | muy padre | excelente) [hasta ahora] #good",
      "(me la estoy pasando | lo estoy pasando) (muy bien | genial | super bien | increible) #good",
      "(me encanta | me gusta) (la resbaladilla | el tobogan | el perro | wifi | la oficina | el equipo | la gente | las plantas | los pufs | la bodega) #good",
      "(estoy | me siento | ando) [un poco | muy | bastante] (cansado | cansada | agotado | agotada) #hard",
    ] },

    // --- too much ------------------------------------------------------------------------------
    overloaded: { patterns: [
      "[ya] (estoy | ando) [totalmente | completamente | literalmente | de verdad | ya] hasta el cuello [de (trabajo | chamba | pendientes | cosas) | con ({t:task} [y {t2:task}] | todo | tanto trabajo) | de {t:task} [y {t2:task}]] [ya | ahorita | esta semana] #idiom #h:cuello",
      "[ya] (no me doy abasto | no doy abasto) [con ({t:task} [y {t2:task}] | todo | tanto trabajo | tantas cosas)] [ya | esta semana] #h:abasto",
      "[la verdad] [ya | todavia] (tengo | traigo) (mucho | muchisimo | demasiado | un monton de | bastante | tanto) (trabajo | chamba | pendientes | cosas | cosas que hacer) [con {t:task} [y {t2:task}]] [ya | esta semana | ahorita] #h:mucho_trabajo",
      "[la verdad] [ya | todavia] (tengo | traigo) (mucha | muchisima | demasiada | tanta) chamba [ya | esta semana | ahorita] #idiom",
      "[la verdad] [ya] (tengo | traigo) (muchas | demasiadas | tantas) (cosas | tareas) [que hacer] [ya | esta semana]",
      "[la verdad] [ya | todavia] (tengo | traigo) (demasiado | muchisimo | un monton | tanto) [ya | esta semana | ahorita]",
      "[la verdad] [ya | todavia] (tengo | traigo) (mucho | muchisimo | demasiado | tanto | un monton) que hacer [ya | esta semana]",
      "[pero] (ya | todavia) tengo (trabajo | chamba) con {t:task} [y {t2:task}]",
      "(necesito | me falta | me hace falta) (mas tiempo | tiempo) [para (eso | todo eso | todo)]",
      "(eso | esto) es (demasiado | mucho | muchisimo | demasiado trabajo | mucho trabajo | un monton) [para (mi | una persona | una semana | esta semana)] #h:too_much",
      "[uf | uff | ay | uy | ufff] es (demasiado | mucho | muchisimo | demasiado trabajo | mucho trabajo | un monton) [para (mi | una persona | una semana | esta semana)]",
      "(son | es) (demasiadas | muchas | muchisimas) (cosas | tareas | pendientes) [para (mi | una persona | una semana)]",
      // "No puedo hacer todo eso" / "No, puedo hacer todo eso" (the comma is lost): asked again at "¿Es demasiado?"
      "no puedo (hacer | terminar) @todo [esta semana | para el viernes] #amb #h:cant_all",
      "no (alcanzo a | voy a poder) (hacer | terminar) @todo [esta semana | para el viernes]",
      "no voy a poder con @todo [esta semana]",
      "no (puedo | alcanzo a) hacerlo todo [esta semana | para el viernes] #amb",
      // "No puedo con todo": at "¿Es demasiado?" it could be "No, puedo con todo" (the comma is lost): #amb
      "no puedo con @todo [esta semana | para el viernes] #amb",
      "no puedo (tomar | agarrar | aceptar | hacer) (nada mas | mas cosas | mas trabajo | otra cosa | mas) [ahorita | esta semana | ahora]",
      "[ya] no puedo (con | hacer) mas [cosas]",
      "[pero] (todavia | ya | aun) tengo {t:task} [y {t2:task}] [que hacer] [tambien]",
      "[la verdad] (estoy | sigo | ando) [ya] (trabajando en | con | ocupado con | ocupada con | metido en | metida en) {t:task} [y {t2:task}]",
      "[la verdad] (estoy | ando | me siento) [muy | super | bastante | demasiado | un poco | ya | algo | totalmente] @busy [ahorita | esta semana | ya] [con ({t:task} [y {t2:task}] | trabajo | tanto trabajo | todo)] #h:saturado",
      // "No es fácil" / "No, es fácil" at "¿Es demasiado?": asked again
      "no es (facil | tan facil | nada facil) [para mi] #amb",
      "nada facil",
      "me estoy ahogando [en trabajo | con {t:task} [y {t2:task}] | con todo]",
      "no tengo tiempo [para (eso | todo eso | todo | tanto | las tres cosas | mas)] [esta semana]",
      "no quiero hacer (las cosas | nada | todo) (al aventon | a la carrera | mal) #idiom #h:aventon",
      // hedges: never "¡Eso!"
      "(no se si | no creo que | no estoy seguro de que | no estoy segura de que) (puedo | pueda | voy a poder) (con @todo | hacer @todo | hacerlo todo) [esta semana | para el viernes] #hedge",
    ] },
    can_do_all: { patterns: [
      "[si] (puedo | voy a poder) (con todo | con todo eso | con las tres cosas | con eso | hacerlo todo | hacer todo | hacer todo eso) [sin problema | para el viernes]",
      "[si] lo puedo hacer todo",
      "(si puedo | claro que puedo | claro que si puedo) [hacerlo | hacerlo todo | con todo]",
      "[si] (puedo hacerlo | lo puedo hacer | puedo hacer eso)",
      "(para nada | que va | no que va) [yo] (puedo con todo | puedo con eso | puedo hacerlo | es facil | yo puedo)",
      "(pan comido | esta facil | facil | dalo por hecho | considéralo hecho | consideralo hecho | yo me encargo [de todo] | cuenta conmigo | me las arreglo | lo saco [adelante] | todo bajo control)",
      // "No es demasiado" / "No, es demasiado" (the comma is lost): asked again at "¿Es demasiado?"
      "(no es | no son) (demasiado | tanto | mucho) [para mi] #amb",
      "(no es | no son) (para tanto | un problema | nada) [para mi]",
      "yo (puedo | me encargo) [de todo | de eso | con todo]",
      "[yo] (lo hago | los hago | lo hago yo) [todo] [sin problema]",
      "(eso | esto) (es | se ve | suena) (facil | sencillo | posible)",
    ] },
    refuse_all: { patterns: [
      "(ni loco | ni loca | de ninguna manera | olvidalo | ni lo suenes | ni de broma | ni pensarlo) #tip:blunt_no",
      "no (lo | los) voy a hacer [nunca] #tip:blunt_no",
      "no quiero (hacerlo | hacer eso | hacer nada de eso | hacerlos | hacer nada) #tip:blunt_no",
      "no voy a hacer nada de eso #tip:blunt_no",
      "no puedo hacer nada de eso #tip:blunt_no",
      "(eso no es mi trabajo | no es mi trabajo | eso no es mi problema | no es mi problema | hazlo tu | eso es tu trabajo | que lo haga otro | ese no es mi trabajo) #tip:rude",
    ] },

    // --- priorities ----------------------------------------------------------------------------
    ask_priority: { patterns: [
      "(que | en que | con que) (hago | debo hacer | tengo que hacer | me enfoco | trabajo) primero #h:focus",
      "(que | con que) (empiezo | debo empezar | tengo que empezar) [primero]",
      "(cual | que) es (la prioridad | lo mas importante | lo mas urgente | mas importante | mas urgente | la primera prioridad) [ahorita | ahora | para ti | esta semana] #h:priority",
      "(cual | que) (va | debe ir | es) primero",
      "[y] (que opinas | tu que opinas | que opinas tu | que piensas | que piensas tu | tu que dices | que dices tu | que me recomiendas)",
      "(cual | que) (cosa | tarea)? (puede | pueden) esperar #h:can_wait",
      "(por donde | donde) (empiezo | debo empezar | comienzo) #h:start_where",
      "(me ayudas | puedes ayudarme | me puedes ayudar) a (priorizar | decidir | elegir | organizarme)",
      "(que | cual) (quieres | prefieres) (primero | que haga primero)",
      "en que orden [lo hago | los hago | hago todo]",
      "(cuales | que) son (las prioridades | tus prioridades)",
      "(es | son) {t:task} mas (importante | importantes | urgente | urgentes) [que {t2:task}]",
      "(debo | deberia | tengo que) (empezar con | empezar por | hacer) {t:task} primero",
      "que es lo mas importante para ti",
      "que hacemos primero",
      "(tu decides | tu dime | decide tu | como tu quieras | lo que tu digas | tu eres el jefe | dime tu)",
    ] },
    what_about: { patterns: [
      "(y | que pasa con | y que pasa con | que hago con | y que hago con | y que tal) {t:task} [entonces]",
    ] },
    propose: { patterns: [
      "(puedo | voy a | podria) (hacer | empezar con | empezar por | enfocarme en | terminar | trabajar en | agarrar | tomar) {a:task} primero [@tail_b] #first #h:first_rest",
      "(puedo | voy a | podria) (hacer | empezar con | empezar por | enfocarme en | terminar) {a:task} primero y (lo demas | el resto | todo lo demas) (la proxima semana | despues | mas tarde) #first #rest #h:first_rest",
      "(puedo | podria) (hacer | terminar | encargarme de) {a:task} [esta semana | para el viernes] pero no {b:task} #first",
      "(puedo | podria) (hacer | terminar | encargarme de) {a:task} [esta semana | para el viernes] #first",
      "(puedo | podria) (hacer | terminar | encargarme de) {a:task} [esta semana | para el viernes] pero no (lo demas | el resto | todo lo demas | las otras cosas | lo otro) #first",
      // "No la fiesta, la presentación primero" / "La presentación no, primero los errores": the second task is the answer (rule 10)
      "no {n:task} [sino] [mejor] [primero] {a:task} [primero] [@tail_b] #first",
      "{n:task} no [mejor] [primero] {a:task} [primero] [@tail_b] #first",
      "(puedo | podria) hacer {a:task} pero {b:task} (tiene que | tienen que | va a tener que | van a tener que) esperar #first",
      "(me voy a enfocar | me enfoco | voy a enfocarme) en {a:task} [primero | esta semana] #first #h:focus_on",
      "(voy a empezar | empiezo | voy a comenzar | comienzo) (con | por) {a:task} [@tail_b] #first",
      "prefiero (hacer | empezar con | empezar por) {a:task} primero [@tail_b] #first",
      "(empecemos | vamos a empezar | empezamos | comencemos) (con | por) {a:task} [primero] [@tail_b] #first #h:start_with",
      "(y si | que tal si) (hago | empiezo con | empiezo por | me enfoco en) {a:task} primero [@tail_b] #first",
      "[creo que | yo creo que | para mi] {a:task} (va primero | van primero | es mas importante | son mas importantes | es la prioridad | son la prioridad | es mas urgente | son mas urgentes | importa mas | importan mas) #first",
      "primero {a:task} [y] [luego | despues] {b:task} [la proxima semana | despues] #first",
      "{a:task} primero [y] (luego | despues) {b:task} [la proxima semana | despues] #first",
      "{a:task} para el viernes [@tail_b] #first",
      "{a:task} (es | son) lo mas (importante | urgente) #first",
      "quiero (hacer | empezar con | empezar por | terminar) {a:task} [primero] [@tail_b] #first",
      "(voy a hacer | hago) {a:task} [primero | esta semana | para el viernes] #first",
      "(tengo que | necesito) terminar {a:task} primero #first",
      "(hago | voy a hacer | puedo hacer) {a:task} [primero | esta semana] y {b:task} (la proxima semana | despues | el lunes | mas tarde) #first",
      // "No, prefiero la fiesta primero" (the comma is lost; "No prefiero…" is no likelier reading)
      "[no] prefiero {a:task} primero [@tail_b] #first",
      "{b:task} (puede | pueden | podria | podrian) esperar [a la proxima semana | hasta la proxima semana | a la semana que viene | hasta la semana que viene | hasta el lunes | una semana] #later #h:wait_week",
      "(podemos | podriamos) (pasar | mover | dejar) {b:task} (para | a) (la proxima semana | el lunes | despues) #later",
      "(pasemos | movamos | dejemos) {b:task} para (la proxima semana | el lunes | despues) #later",
      "no (tengo | voy a tener) tiempo para {b:task} [esta semana] #later",
      "(hago | voy a hacer | puedo hacer) {b:task} (la proxima semana | despues | mas tarde | el lunes) #later",
      "(puede | podria) @ppl (hacer | encargarse de | organizar | ver | hacerse cargo de) {d:task} #deleg #h:someone_else",
      "@ppl (puede | podria) (hacer | encargarse de | organizar | ver | hacerse cargo de) {d:task} #deleg",
      "(tal vez | quizas | a lo mejor) @ppl (puede | podria | deberia) (hacer | encargarse de | organizar | ver) {d:task} #deleg #h:brad",
      "@ppl (deberia | va a | tiene que) @dov {d:task} [esta semana]",
      "que @ppl (haga | organice | se encargue de | vea) {d:task} #deleg",
      "{d:task} (la | lo | los | las)? (puede | podria) (hacer | organizar | ver | tomar) @ppl #deleg",
      "(dale | pasale) {d:task} a @ppl #deleg",
      "rodrigo (puede | podria | deberia) jalar parejo [con {d:task}] #deleg #idiom",
      "(deberiamos | podriamos | hay que | por que no) contratar a (alguien | alguien mas | otra persona | un becario | un practicante | mas gente) #hire",
      "manos a la obra con {a:task} #first #idiom",
    ] },
    // "No puedo hacer la fiesta.": that task later (the learner's own plan, never a plan to do it)
    cant_task: { patterns: [
      "no (puedo | alcanzo a | voy a poder) (hacer | organizar | terminar | encargarme de | con) {b:task} [esta semana | para el viernes | ahorita | tambien]",
      "no (puedo | voy a poder) (hacer | con) {b:task} (y | ni) {b2:task} [esta semana | para el viernes]",
      "no quiero (hacer | organizar | encargarme de) {b:task} [esta semana | ahorita | tambien]",
    ] },
    // "Sí, un poco." (to "Todo está en chino, ¿no?")
    finding_ctx: { patterns: ["[si] (un poco | un poquito | bastante | totalmente | muchisimo | mucho | algo | un monton | tantito | demasiado | todo)"] },
    // "Tiene sentido." / "Tienes razón." (to Toño's own suggestion)
    agree_ctx: { patterns: ["[si] (eso)? tiene [mucho | todo el] sentido", "(buen punto | tienes razon | me parece justo | suena bien | suena justo | me late | me parece bien | trato hecho | hecho | va que va | me parece perfecto)",
      "[si] (hagamos eso | hagamoslo | buena idea | me parece buena idea | es buena idea | dale | va | sale)"] },
    // "Sí, una pregunta." (to "¿Algo más?")
    more_q_ctx: { patterns: ["[si] [tengo] (una pregunta | otra pregunta | una cosa | otra cosa | una cosita | una duda) [mas]"] },
    // "La verdad, sí." (to "¿Es demasiado?" / "Todo está en chino, ¿no?")
    truly_ctx: { patterns: ["[si] (la verdad | sinceramente | honestamente | francamente) si"] },
    // "Solo la presentación." / "La presentación, luego la fiesta." (while Toño asks what first)
    propose_ctx: { patterns: ["[solo | nada mas | nomas | mejor] {a:task} [primero | por ahora | esta semana | entonces]", "[mejor] primero {a:task} [entonces]", "{a:task} [y] (luego | despues) {b:task} [la proxima semana | despues]"] },
    same_page_q: { patterns: [
      "[entonces] (estamos | ya estamos) en la misma pagina [ahora] #idiom #h:same_page",
      "(misma pagina | en la misma pagina) [verdad | entonces]",
      "(te parece | te funciona | te late) [bien] [asi]",
      "(esta bien | todo bien) asi para ti",
    ] },

    // --- idioms --------------------------------------------------------------------------------
    idiom_q: { patterns: [
      "[perdon] que (significa | quiere decir) [la (frase | expresion | palabra)] {id:idiom} [exactamente | aqui] #h:what_mean",
      "[perdon] (como que | a que te refieres con | que quieres decir con) [eso de] {id:idiom} #h:mean_by",
      "[perdon] que es [eso de] {id:idiom} [exactamente]",
      "[perdon] cual es el significado de {id:idiom}",
      "(me puedes | puedes) explicar [que es] {id:idiom}",
      "[perdon] no (entiendo | conozco | se que es) [la (frase | expresion)] {id:idiom}",
      "{id:idiom} (que significa | que es eso | que quiere decir | que es)",
      "(que | cual) {id:idiom} #h:what_base",
      "(es | eso de) {id:idiom} (es)? una (expresion | frase)",
    ] },
    idiom_echo: { patterns: ["[perdon] {id:echo} [perdon]"] },
    idiom_plain: { patterns: [
      "(es | eso es) una (expresion | frase | dicho | modismo) #h:idiom",
      "(es | eso es) una (expresion | frase | dicho | modismo) verdad",
      "(puedes | me lo puedes | lo puedes) (decir | decirlo | explicar | explicarlo) (con otras palabras | mas facil | mas sencillo | mas simple | en espanol normal | mas claro) #h:plain",
      "(puedes | me lo puedes | lo puedes) decirlo de otra (forma | manera)",
      "[en] espanol normal",
      "que significa esa (expresion | frase)",
      "no conozco (esa | esta) (expresion | frase | dicho)",
      "nunca (habia | he) (escuchado | oido) eso",
      "con otras palabras",
    ] },
    idiom_meta: { patterns: [
      "por que (usas | dices) tantas (expresiones | frases)",
      "(usas | dices) (muchas | tantas) (expresiones | frases)",
      "(siempre | tu siempre) hablas asi",
      "hablas (puros | con) (dichos | expresiones | refranes)",
    ] },

    // --- who owns what -------------------------------------------------------------------------
    ask_owner: { patterns: [
      "(a quien | con quien) (le pregunto | hablo | le debo preguntar | tengo que hablar | voy) [sobre | de | para | por] [{a:area}] #h:who_ask",
      "quien (esta a cargo | se encarga | es responsable) (de | del | de la | de los) {a:area} #h:in_charge",
      "quien (esta a cargo | se encarga | decide)",
      "quien (maneja | lleva | decide | aprueba | paga | organiza | hace | ve) {a:area}",
      "a quien le (mando | doy | paso | entrego | enseno) {a:area}",
      "quien es (el | la) (responsable | encargado | encargada | duena | dueno) [de {a:area}]",
      "(sabes | me puedes decir) quien (se encarga | esta a cargo) de {a:area}",
      "(cual es | cuando es) la (fecha limite | fecha de entrega) [de {a:area}] #deadline #h:deadline",
      "(cual es | cuando es) el (deadline | plazo) [de {a:area}] #deadline",
      "(cuando | para cuando) es la entrega [de {a:area}] #deadline",
      "(para cuando | cuando) (necesitas | quieres | es) {a:area} #deadline",
      "(para cuando | cuando) (lo | la | los | las) necesitas #deadline",
      "hay (fecha limite | deadline | plazo) [para {a:area}] #deadline",
      "cuanto (dinero | presupuesto) (tenemos | hay | tengo) [para {a:area}] #money",
    ] },
    insist: { patterns: [
      "(necesito | quiero | tengo que) (saberlo | saber) [ya | ahora | hoy | esta semana | antes del viernes] #h:insist",
      "(me lo puedes | puedes | me puedes) (decir | decirme) [ya | ahora]",
      "(dime | dimelo) [ya | ahora]",
      "es (importante | urgente)",
      "necesito (una respuesta | saber) [ya | ahora | hoy]",
      "(podemos | lo podemos) (verlo | hablarlo) (ahora | ya)",
      "no quiero (esperar | verlo aparte)",
      "(y | entonces) quien [es]",
    ] },
    no_more: { patterns: [
      "(no tengo [mas] preguntas | ninguna pregunta | nada mas | es todo | eso es todo | eso seria todo | seria todo) [por ahora]",
      "no (tengo | necesito) nada mas [por ahora]",
      "nada [por ahora]",
      "no tengo (ninguna pregunta | preguntas | mas preguntas | ninguna duda | dudas | mas dudas) [por ahora]",
      "(tengo | ya tengo) todo [lo que necesito]",
      "[no] estoy bien [asi] [por ahora]",
      "todo (claro | bien | perfecto) [por ahora]",
    ] },
    who_person: { patterns: ["[y] quien es {p:person} [otra vez]"] },

    // --- the crash -----------------------------------------------------------------------------
    plan: { patterns: [
      "@pl_lead @pl_body [primero | ya | ahorita | ahora | hoy] [[y] (luego | despues) [hay que | tenemos que | vamos a] (@pl_body | @pl_hort)]",
      "@pl_lead @pl_body [primero | ya | ahorita | ahora | hoy] [y [hay que | tenemos que | vamos a] (@pl_body | @pl_hort)]",
      "[primero] @pl_hort [primero | ya | ahorita | ahora | hoy] [[y] [luego | despues] (@pl_hort | @pl_body)]",
      "primero (arreglarlo | arreglar el error) [y] (luego | despues) (avisarles | avisar) [a los clientes] #fix",
      "no hay que hacer las cosas al aventon [otra vez] #fix #idiom",
      "(nada | ya no) mas al aventon #fix #idiom",
    ] },
    crash_what: { patterns: [
      "que (quieres | necesitas) que (haga | hagamos) [yo] [exactamente | primero | ahora] #h:what_exactly",
      "que (puedo | debo) hacer [yo] [ahora | exactamente]",
      "que necesitas [que haga] [de mi] [ahora | exactamente]",
      "(como | en que) (te)? (puedo | podemos) ayudar",
      "cual es mi parte",
      "que me toca [hacer] [a mi]",
      "que hago [yo] (ahora | exactamente)",
      "que hacemos [ahora | entonces]",
    ] },
    crash_who: { patterns: [
      "quien (lo hizo | hizo el codigo | hizo la actualizacion) (al aventon | a la carrera) #h:who_cut",
      "de quien (es | fue) la culpa",
      "quien (lo hizo | rompio | subio) (eso | esto | el codigo | la actualizacion)",
      "quien fue",
      "quien (hizo | subio) las cosas (al aventon | a la carrera)",
      "quien (la rego | metio la pata)",
      "quien es (el | la) culpable",
    ] },
    ball_back: { patterns: ["(la pelota esta en tu cancha | esta en tu cancha | en tu cancha) #idiom", "no (la pelota esta | esta) en tu cancha #idiom"] },

    // --- midnight ------------------------------------------------------------------------------
    stay_limit: { patterns: [
      "@me_stay [hasta tarde] hasta {time} [hoy] [pero (luego | despues) (lo dejo por hoy #idiom | me voy [a mi casa] | me tengo que ir | me voy a casa)] #h:until_time",
      "solo (puedo quedarme | me puedo quedar | puedo trabajar) [hasta tarde] hasta {time} [hoy] [pero (luego | despues) (lo dejo por hoy #idiom | me voy [a mi casa] | me tengo que ir)]",
      "@me_stay hasta {time} si (son | las horas son | las horas extra son | me las pagan) [pagadas]",
      "[solo | nada mas | mejor] hasta {time} [tal vez] [pero no (mas | mas tarde | hasta la medianoche)]",
      "@me_stay [pero] (solo | nada mas)? hasta {time} [pero no (mas | mas tarde | hasta la medianoche)]",
      "no (puedo quedarme | me puedo quedar | me quedo) hasta la medianoche [pero] [solo | si puedo] hasta {time} [si]",
      "(que tal | y si) hasta {time}",
      "me voy [a mi casa | a casa] (a | al) {time} #limit",
      "(prefiero | quiero | mejor) (irme | salir) [a mi casa | a casa] (a | al) {time} #limit",
      "@me_stay (un rato | un poco | una hora | dos horas | un par de horas) [mas] [pero no hasta la medianoche] #nohour",
      "@me_stay pero no hasta la medianoche #nohour",
      "[si] [me quedo] pero no hasta la medianoche #nohour",
      "{time2:time} es (mucho | muy tarde | demasiado tarde | demasiado) [mejor] hasta {time}",
    ] },
    // "¿Y si me quedo hasta las nueve?": a what-if is a question; Toño offers that deal and asks (rule 17)
    stay_whatif: { patterns: [
      "(y si | que tal si | que pasa si) (me quedo | trabajo | me voy) [solo] hasta {time}",
      "(y si | que tal si) me voy [a mi casa | a casa] (a | al) {time}",
    ] },
    stay_yes: { patterns: [
      "(si | claro | sin problema | no hay problema | va | sale | ok | por supuesto) (me quedo | puedo quedarme | me puedo quedar) [hasta la medianoche | hasta tarde | hoy] [sin problema | no hay problema]",
      "(si | claro) [que] (si)? puedo",
      "(me quedo | puedo quedarme | me puedo quedar) [hasta la medianoche | hasta tarde | hoy] [sin problema | no hay problema]",
      "cuenta conmigo",
      "aqui (estoy | estare)",
    ] },
    cant_stay: { patterns: [
      "[perdon | lo siento] [hoy] no (puedo quedarme | me puedo quedar | me quedo | puedo trabajar) [hasta tarde | tarde | hasta la medianoche | hoy | tan tarde | hasta tan tarde] [hoy] [perdon | lo siento] #h:cant_stay",
      "no (puedo quedarme | me puedo quedar | puedo) hasta {time} [hoy]",
      "(no se si | no creo que | no estoy seguro de que | no estoy segura de que) (pueda quedarme | me pueda quedar | puedo quedarme | me puedo quedar) [hasta tarde | hasta la medianoche | tan tarde] [hoy] #hedge",
      "[hoy] tengo (planes | un compromiso | una cita | algo | otra cosa | un evento) [hoy en la noche | esta noche | hoy] #h:plans",
      "(tengo que | debo) (irme a mi casa | ir por mis hijos | recoger a mis hijos | estar en casa | irme temprano | irme) [a las seis | temprano | hoy]",
      "no (trabajo | me quedo) hasta (tarde | la medianoche)",
      "(la medianoche | hasta la medianoche) es (demasiado tarde | mucho | imposible)",
      "hasta la medianoche no",
      "(ni loco | ni loca | ni de broma | ni pensarlo | de ninguna manera) [me quedo]",
      "hoy no [puedo] [perdon | lo siento]",
      "no quiero (trabajar | quedarme) hasta (la medianoche | tan tarde | tarde)",
      "prefiero no (quedarme | trabajar hasta tarde | quedarme hasta tarde) [hoy]",
    ] },
    // "No puedo." (to "¿Te puedes quedar?", "A las nueve, pagadas. ¿Trato hecho?", "¿Mañana a las ocho?")
    cant_ctx: { patterns: ["[perdon] no puedo [perdon | lo siento]", "(perdon | lo siento) no puedo", "me temo que no puedo", "no voy a poder"] },
    paid_q: { patterns: [
      "(las horas extra | el tiempo extra | eso | las horas) (son | van a ser | serian) (pagadas | pagados)",
      "(se pagan | me pagan | nos pagan | pagan | pagas | me las pagan) (las horas extra | el tiempo extra | eso | las horas | horas extra) #h:paid",
      "(las horas extra | el tiempo extra) (se pagan | me las pagan | las pagan)",
      "(y | que pasa con) (el pago | las horas extra | el dinero | el tiempo extra)",
      "hay pago (de horas extra | extra)",
      "horas extra pagadas [verdad]",
      "(es | va a ser) pagado",
      "[bueno] [pero] solo si (me pagan | me las pagan | nos pagan | son pagadas | pagan las horas extra | me pagas)",
    ] },
    mid_finish_q: { patterns: ["a que hora (terminamos | nos vamos | acabamos | salimos) [hoy] #h:finish_time", "cuando (terminamos | trabajamos | nos quedamos) [hoy]", "hasta que hora [terminamos | trabajamos | nos quedamos] [hoy]", "cual es la hora de salida"] },
    mid_why: { patterns: ["por que [hasta la medianoche | tan tarde | hoy]", "para que", "que (tenemos | hay) que hacer [hoy | hasta la medianoche]"] },

    // --- tomorrow's check-in -----------------------------------------------------------------------
    meet_time: { patterns: [
      "(podemos | podriamos) [hacerlo | vernos | dejarlo | cambiarlo | moverlo | hacer el check in] (a | al | para) {time} [mejor] [o {time2:time}] #h:make_it",
      "(que tal | y si) (a | al | mejor a | mejor al) {time} [mejor | manana] #h:how_about",
      "mejor (a | al) {time} [o {time2:time}]",
      "(a | al) {time} (es | seria) mejor [para mi]",
      "(a | al) {time} me (funciona | queda | conviene) mejor",
      "prefiero (a | al) {time}",
      "(tal vez | quizas) (a | al) {time}",
      "[claro] nos vemos (a | al) {time} [manana] #h:see_eight",
      "(estoy | voy a estar | estare) aqui (a | al) {time} [manana]",
      "[si] (a | al) {time} (esta bien | me funciona | perfecto | me parece bien | me queda bien | me late)",
      "hagamos (el check in | otro check in) (a | al) {time} #idiom",
      "[claro | si] manana (a | al) {time}",
      "[si] {time} (esta bien | me funciona | perfecto | me parece bien | me queda bien | me late)",
      "(puede ser | podria ser | seria posible) (a | al) {time} [mejor]",
      // "No a las ocho, a las nueve" / "No puedo a las ocho, ¿a las diez?": the second hour is the answer (rule 10)
      "no (a | al) {time2:time} [sino] [mejor] (a | al) {time}",
      "(a | al) {time2:time} no [mejor] (a | al) {time}",
      "no puedo (a | al) {time2:time} [pero] [mejor] [que tal] (a | al) {time}",
      "[manana] (a | al) {time2:time} no (puedo | me funciona | me queda) [pero] [mejor] [que tal | y] (a | al) {time}",
    ] },
    // "A las diez." / "Al mediodía." (while Toño waits for a time)
    meet_time_ctx: { patterns: ["[a | al] {time} [entonces | mejor | tal vez]"] },
    meet_ok: { patterns: [
      "nos vemos (manana | entonces) [entonces]",
      "(me funciona | me parece bien | me queda bien | esta perfecto | me late)",
      "(aqui | alli | ahi) (estare | voy a estar) [manana]",
      "(claro | ok | si | perfecto | va | sale | genial | vale) nos vemos (manana | entonces)",
    ] },
    cant_time: { patterns: [
      "@eight es [un poco | muy | demasiado] temprano [para mi] #h:early",
      "no puedo (a las ocho | tan temprano | manana en la manana | manana a las ocho | temprano)",
      "(a las ocho | manana a las ocho) no puedo",
      "no puedo (a | al) {time} [manana]",
      "@eight no",
      "tengo (algo | una junta | una reunion | una cita | un compromiso) (a las ocho | manana en la manana | a esa hora | manana temprano)",
      "no soy (de manana | madrugador | madrugadora | de madrugar)",
      "(a las ocho | esa hora | en la manana | temprano) no me (funciona | queda | conviene)",
      "(a | al) {time} no me (funciona | queda | conviene)",
      "@eight no me (funciona | queda)",
      "manana no (puedo | me queda | me funciona)",
      "(podemos | podriamos) (hacerlo | vernos | moverlo | dejarlo) (mas tarde | un poco mas tarde | otro dia | en la tarde) #later",
      "(mejor | tal vez | que tal) (mas tarde | un poco mas tarde) #later",
      "mas tarde (es | seria) mejor #later",
      "[mejor | tal vez] mas tarde #later",
      "(es | esta) [muy | un poco | demasiado | algo] temprano [para mi]",
      "prefiero (en la tarde | mas tarde | mas tardecito | despues)",
    ] },
    call_day: { patterns: [
      "(dejemoslo | lo dejamos | dejamoslo | vamos a dejarlo) por hoy [ya] #idiom #h:call_day",
      "(ya estuvo | ya esta) por hoy [verdad | no]",
      "ya estuvo [verdad | no]",
      "por hoy (es todo | ya estuvo)",
      "(terminemos | terminamos) por hoy",
      "(hay que | creo que hay que | ya es hora de) (dejarlo | terminar) por hoy #idiom",
      "(yo)? lo dejo por hoy #idiom",
    ] },

    // --- small talk ------------------------------------------------------------------------------
    dog_q: { patterns: [
      "(es | ese es | este es) tu perro",
      "(como se llama | cual es el nombre de) (tu perro | el perro)",
      "por que se llama wifi",
      "(tu perro | el perro | wifi) es (muy | super | bien)? (lindo | bonito | tierno | flojo | dormilon | bonita | lindo)",
      "(que lindo | que bonito | que tierno) (perro | es el perro | es tu perro | tu perro)",
      "(puedo | se puede) acariciar (al perro | a wifi | a tu perro)",
      "quien es wifi",
    ] },
    slide_q: { patterns: [
      "por que (hay | tienen | tienes) (una resbaladilla | un tobogan) [aqui | en la oficina]",
      "(puedo | se puede) (usar | probar | bajar por | aventarme por) (la resbaladilla | el tobogan)",
      "(que padre | que bonita | me encanta | que buena) (la | tu) resbaladilla",
      "(que padre | que bonito | me encanta | que buen) (el | tu) tobogan",
      "(es | esa es) (una resbaladilla | un tobogan) [de verdad]",
    ] },
  },

  domains: { time: () => HOUR_IDS.filter((x) => x !== "midnight").map(hourTime) },

  lines: {
    // --- hello ---------------------------------------------------------------------------------
    greet: [
      t("¡Hey! | ¿Hacemos | un | check-in | rápido?", "Hey! | Shall-we-do | a | check-in | quick?", "Hey! Quick check-in?", { flags: { 3: F_CHECK } }),
      t("¡Hey, | tú! | ¿Tienes | un | segundo? | Hagamos | un | check-in.", "Hey, | you! | Do-you-have | a | second? | Let's-do | a | check-in.", "Hey, you! Got a sec? Let's touch base.", { flags: { 7: F_CHECK } }),
    ],
    hello_q: [
      t("¿Cómo | vas | con | tu | primera | semana? | Al principio | todo | está | en chino, | ¿no?", "How | are-you-doing | with | your | first | week? | At first | everything | is | in Chinese, | right?",
        "So, how's your first week going? It's all Greek to you at first, right?", { flags: { 9: F_CHINO } }),
      t("¡Primera | semana! | ¿Cómo | vas? | Todo | está | en chino, | ¿verdad?", "First | week! | How | are-you-doing? | Everything | is | in Chinese, | right?",
        "Week one! How's it going? It's all Greek to you, right?", { flags: { 6: F_CHINO } }),
    ],
    hello_reask: [
      t("¿Y? | ¿Cómo | va | tu | primera | semana?", "So? | How | is-going | your | first | week?", "So? How's week one?"),
      t("¿Cómo | vas | hasta ahora?", "How | are-you-doing | so far?", "So, how's it going so far?"),
    ],
    hello_hi: [t("¡Hey! | ¿Y | cómo | vas | con | tu | primera | semana?", "Hey! | And | how | are-you-doing | with | your | first | week?", "Hey! So, how's week one?")],
    yep_idiom: [t("¡Sí! | Perdón.", "Yes! | Sorry.", "Yep! Sorry."), t("¡Culpable!", "Guilty!", "Guilty!")],
    hello_learn: [
      t("¡Me encanta! | Eres | un | crack.", "I love it! | You-are | a | star.", "Love it! You're crushing it.", { flags: { 3: F_CRACK } }),
      t("¡Ja! | ¿La verdad? | Eres | un | crack.", "Ha! | Honestly? | You-are | a | star.", "Ha! Honestly? You're crushing it.", { flags: { 4: F_CRACK } }),
    ],
    hello_good: [
      t("¡Qué bien! | Me encanta | esa | energía.", "How great! | I love | that | energy.", "Awesome! Love that energy."),
      t("¡Eso! | Eso | es | lo que | me gusta | oír.", "That's it! | That | is | what | I like | to hear.", "Yes! That's what I like to hear."),
    ],
    hello_hard: [
      t("Es | normal. | La | primera | semana | siempre | es | una | locura. | ¡Échale ganas!", "It's | normal. | The | first | week | always | is | a | madness. | Give it your all!",
        "Totally normal. Week one is always wild. Hang in there!", { flags: { 9: F_GANAS },
          neutral: t("Es | normal. | La | primera | semana | siempre | es | una | locura. | ¡Dale con todo!", "It's | normal. | The | first | week | always | is | a | madness. | Give it your all!",
            "Totally normal. Week one is always wild. Hang in there!", { flags: { 9: F_GANAS_N } }) }),
      t("{m:Tranquilo|f:Tranquila}, | ya | vas | a | ver. | ¡Échale ganas!", "Relax, | soon | you're-going | to | see. | Give it your all!", "Don't worry, you'll get there. Hang in there!",
        { flags: { 5: F_GANAS },
          neutral: t("{m:Tranquilo|f:Tranquila}, | ya | vas | a | ver. | ¡Dale con todo!", "Relax, | soon | you're-going | to | see. | Give it your all!", "Don't worry, you'll get there. Hang in there!", { flags: { 5: F_GANAS_N } }) }),
    ],
    hello_no: [t("¿No? | ¡Talento | natural! | Me encanta.", "No? | Talent | natural! | I love it.", "No? Natural talent! Love it.")],
    hello_over: [
      t("Uf. | Bueno… | te | tengo | una | noticia.", "Oof. | Okay… | for-you | I-have | a | piece-of-news.", "Oof. Okay, so... funny story."),
      t("Ay, | no. | Bueno, | no me odies, | pero…", "Oh, | no. | Okay, | don't hate me, | but…", "Oh no. Okay, don't hate me for this..."),
    ],
    hello_skip: [
      t("No te preocupes. | Ya | le vas a agarrar la onda.", "Don't worry. | Soon | you'll get the hang of it.", "Don't worry. You'll learn the ropes.",
        { flags: { 2: F_ONDA }, neutral: t("No te preocupes. | Ya | le vas a agarrar el ritmo.", "Don't worry. | Soon | you'll get the hang of it.", "Don't worry. You'll learn the ropes.", { flags: { 2: F_ONDA_N } }) }),
    ],

    // --- the pile ------------------------------------------------------------------------------
    pile_intro: [
      t("¡Mira! | Esta | semana | hay | mucha | chamba. | ¡Manos a la obra!", "Look! | This | week | there's | a lot of | work. | Let's get to work!", "Okay! Big week. Let's get the ball rolling.",
        { flags: { 5: F_CHAMBA }, neutral: t("¡Mira! | Esta | semana | hay | mucho | trabajo. | ¡Manos a la obra!", "Look! | This | week | there's | a lot of | work. | Let's get to work!", "Okay! Big week. Let's get the ball rolling.") }),
      t("¡Ok! | Semana | grande. | ¡Manos a la obra!", "Okay! | Week | big. | Let's get to work!", "So! Big week. Let's get the ball rolling."),
    ],
    pile_list: [
      t("Necesito | tres | cosas | de | ti: | la | presentación | para | los | inversionistas | para | el | viernes, | la | fiesta | de | lanzamiento | y | una | foto | para | el | boletín.",
        "I-need | three | things | from | you: | the | deck | for | the | investors | by | — | Friday, | the | party | for | launch | and | a | photo | for | the | newsletter.",
        "I need three things from you: the investor deck by Friday, the launch party and a photo for the newsletter.", { flags: { 11: F_ART } }),
    ],
    pile_box: [
      t("¡Y | piensa fuera de la caja!", "And | think outside the box!", "And think outside the box!"),
      t("¡Atrévete! | Piensa fuera de la caja.", "Be bold! | Think outside the box.", "Be bold. Think outside the box!"),
    ],
    pile_weight: [
      t("Esta | semana | todos | tenemos que | jalar parejo.", "This | week | everyone | we-have-to | pull our weight.", "Everybody has to pull their weight this week.",
        { flags: { 4: F_PAREJO }, neutral: t("Esta | semana | todos | tenemos que | poner de nuestra parte.", "This | week | everyone | we-have-to | do our part.", "Everybody has to pull their weight this week.", { flags: { 4: F_PAREJO_N } }) }),
    ],
    pile_q: [t("Fácil, | ¿no?", "Easy, | right?", "Easy, right?"), t("¿Cómo | lo | ves?", "How | it | do-you-see?", "Sound good?")],
    pile_reask: [
      t("¿Y? | Presentación, | fiesta, | foto. | ¿Puedes | con | todo?", "So? | Deck, | party, | photo. | Can-you | with | everything?", "So? Deck, party, photo. Can you take them all on?", { flags: { 5: F_CON } }),
      t("Entonces, | ¿puedes | con | las | tres | cosas?", "So, | can-you | with | the | three | things?", "So, can you handle all three?", { flags: { 2: F_CON } }),
    ],
    pile_know: [t("Ya sé, | ya sé. | Estás | hasta el cuello.", "I know, | I know. | You're | up to your neck.", "I know, I know. You're up to your ears.")],
    pile_yes: [t("¡Eso!", "That's it!", "Awesome!"), t("¡Me encanta!", "I love it!", "Love it!")],
    too_much_q: [
      t("Espera, | todavía | tienes | los | reportes | de | errores | y | los | correos | de | clientes, | ¿verdad? | ¿Es | demasiado?",
        "Wait, | still | you-have | the | reports | of | bugs | and | the | emails | from | customers, | right? | Is-it | too much?",
        "Wait, you still have the bug reports and the customer emails, right? Is that too much?"),
    ],
    too_much_honest: [
      t("Pero | dime | la verdad: | con | los | errores | y | los | correos, | ¿es | demasiado?", "But | tell-me | the truth: | with | the | bugs | and | the | emails, | is-it | too much?",
        "But be honest: with the bugs and the emails, is it too much?"),
    ],
    too_much_reask: [t("Entonces, | ¿es | demasiado?", "So, | is-it | too much?", "So, is it too much?")],
    too_much_amb: [
      t("Perdón, | ¿entonces | sí | puedes | con | todo, | o | es | demasiado?", "Sorry, | so | — | can-you | with | everything, | or | is-it | too much?",
        "Sorry, so can you handle it all, or is it too much?", { flags: { 2: "sí stresses the question: CAN you, or not?", 4: F_CON } }),
    ],
    rockstar: [
      t("¡Eres | un | crack!", "You're | a | star!", "Rock star! You're crushing it.", { flags: { 2: F_CRACK } }),
      t("¡Mírate! | Eres | un | crack.", "Look at you! | You're | a | star.", "Look at you! Crushing it.", { flags: { 3: F_CRACK } }),
    ],
    over_react: [
      t("Uf. | Te | entiendo. | Yo | también | estoy | hasta el cuello.", "Oof. | You | I-understand. | I | too | am | up to my neck.", "Oh, man. I hear you. I'm up to my ears too."),
      t("Bueno, | bueno. | Es | demasiado. | ¿La verdad? | Yo | también | estoy | hasta el cuello.", "Okay, | okay. | It's | too much. | Honestly? | I | too | am | up to my neck.",
        "Okay, okay. Too much. Honestly? I'm up to my ears too."),
    ],
    flat_no_react: [t("Bueno… | ¿qué | sí | puedes | hacer?", "Okay… | what | — | can-you | do?", "Okay... what can you do?", { flags: { 2: F_SI } })],
    rude_react: [t("Uy. | Bueno. | Respira. | ¿Qué | sí | puedes | hacer?", "Whoa. | Okay. | Breathe. | What | — | can-you | do?", "Whoa. Okay. Deep breath. What can you do?", { flags: { 4: F_SI } })],

    // --- priorities ----------------------------------------------------------------------------
    prio_q: [
      t("¿Entonces | qué | hacemos?", "So | what | do-we-do?", "So what do we do?"),
      t("A ver, | tú | dime: | ¿qué | va | primero?", "Let's see, | you | tell-me: | what | goes | first?", "Okay. You tell me: what first?"),
    ],
    prio_q_cool: [t("¡Genial! | Entonces, | ¿qué | va | primero?", "Great! | So, | what | goes | first?", "Cool. So, what first?")],
    prio_reask: [
      t("¿Presentación? | ¿Fiesta? | ¿Foto? | Tú | decides.", "Deck? | Party? | Photo? | You | decide.", "Deck? Party? Photo? Your call."),
      t("¿Y? | ¿Qué | va | primero?", "So? | What | goes | first?", "So? What goes first?"),
    ],
    prio_deal: [
      t("Bueno, | te | propongo | algo: | primero | la | presentación, | y | todo | lo demás, | la próxima semana. | ¿Trato hecho?",
        "Okay, | to-you | I-propose | something: | first | the | deck, | and | all | the rest, | next week. | Deal?",
        "Okay, how about this: the deck first, everything else next week. Deal?"),
    ],
    deal_reask: [t("¿Y? | ¿Primero | la | presentación? | ¿Trato hecho?", "So? | First | the | deck? | Deal?", "So? Deck first? Deal?")],
    deal_yes: [t("¡Trato hecho! | Estamos | en la misma página.", "Deal! | We-are | on the same page.", "Deal! We're on the same page.")],
    deal_no: [t("Bueno… | lo | vemos | mañana | en | el | check-in.", "Okay… | it | we'll-look-at | tomorrow | at | the | check-in.", "Okay... let's touch base about it tomorrow.", { flags: { 6: F_CHECK } })],
    prio_answer: [
      t("Fácil: | la | presentación. | El | viernes | no se mueve. | La | fiesta | y | la | foto | pueden | esperar.",
        "Easy: | the | deck. | — | Friday | doesn't move. | The | party | and | the | photo | can | wait.",
        "Easy: the deck. Friday is a hard deadline. The party and the photo can wait.", { flags: { 3: F_ART } }),
      t("La | presentación | para | los | inversionistas, | sin duda. | Todo | lo demás | puede | esperar | a | la próxima semana.",
        "The | deck | for | the | investors, | no doubt. | All | the rest | can | wait | until | next week.",
        "The investor deck, for sure. Everything else can wait till next week."),
    ],
    prio_ok: [
      t("Me encanta. | Primero | {X.the}, | y | lo demás, | la próxima semana. | Estamos | en la misma página.", "I love it. | First | {X.the}, | and | the rest, | next week. | We-are | on the same page.",
        "Love it. First {X.the}, then the rest next week. We're on the same page."),
      t("Perfecto. | Primero | {X.the}. | ¡Ahora sí | estamos | en la misma página!", "Perfect. | First | {X.the}. | Now | we-are | on the same page!", "Perfect. First {X.the}. Now we're on the same page!"),
    ],
    prio_ok_then: [
      t("Claro. | Primero | {X.the} | y | luego | la | presentación. | Estamos | en la misma página.", "Sure. | First | {X.the} | and | then | the | deck. | We-are | on the same page.",
        "Sure. First {X.the}, then the deck. We're on the same page."),
      t("Bueno. | Primero | {X.the}, | y | la | presentación | para | el | viernes. | Estamos | en la misma página.", "Okay. | First | {X.the}, | and | the | deck | by | — | Friday. | We-are | on the same page.",
        "Okay. First {X.the}, and the deck by Friday. We're on the same page.", { flags: { 7: F_ART } }),
    ],
    prio_ok_generic: [
      t("Perfecto. | Me funciona. | Estamos | en la misma página.", "Perfect. | It works for me. | We-are | on the same page.", "Perfect. That works for me. We're on the same page."),
      t("Me gusta | el | plan. | Estamos | en la misma página.", "I like | the | plan. | We-are | on the same page.", "I like the plan. We're on the same page."),
    ],
    prio_wait: [t("Claro: | {X.the}, | la próxima semana.", "Sure: | {X.the}, | next week.", "Sure: {X.the} next week.")],
    deleg_brad: [
      t("¿Rodrigo? | ¡Ja! | Claro. | Por | una | vez, | que | Rodrigo | jale parejo.", "Rodrigo? | Ha! | Sure. | For | one | time, | let | Rodrigo | pull his weight.",
        "Rodrigo? Ha! Sure. Rodrigo could pull his weight for once.",
        { flags: { 8: F_PAREJO }, neutral: t("¿Rodrigo? | ¡Ja! | Claro. | Por | una | vez, | que | Rodrigo | ponga de su parte.", "Rodrigo? | Ha! | Sure. | For | one | time, | let | Rodrigo | do his part.",
          "Rodrigo? Ha! Sure. Rodrigo could pull his weight for once.", { flags: { 8: F_PAREJO_N } }) }),
    ],
    deleg_other: [t("Buena | idea. | Voy | a | preguntar | quién | puede.", "Good | idea. | I'm-going | to | ask | who | can.", "Good call. I'll ask around.")],
    deleg_named: [t("Buena | idea. | Hoy | le | pregunto.", "Good | idea. | Today | — | I'll-ask.", "Good call. I'll ask today.", { flags: { 3: "le = him / her: the person you just named." } })],
    hire_react: [
      t("¿Contratar | a | alguien? | ¡Ja! | Mis | palabras | favoritas. | Voy | a | publicar | una | vacante.", "Hire | — | someone? | Ha! | My | words | favorite. | I'm-going | to | post | a | job-opening.",
        "Hire someone? Ha! My favorite words. I'll post a job ad.", { flags: { 1: F_A } }),
    ],
    pushback: [
      t("Mmm. | Pero | los | inversionistas | vienen | el | viernes. | ¿Y si | primero | hacemos | la | presentación?", "Hmm. | But | the | investors | come | on | Friday. | What if | first | we-do | the | deck?",
        "Hmm. The investors come Friday, though. Could we do the deck first?", { flags: { 5: "el viernes = on Friday: the article stands for “on”." } }),
    ],
    push_reask: [t("Entonces, | ¿primero | la | presentación?", "So, | first | the | deck?", "So, deck first?")],
    push_no: [
      t("Bueno, | tú | decides. | Nada más | no hagas | la | presentación | al aventón.", "Okay, | you | decide. | Just | don't do | the | deck | sloppily.",
        "Okay, your call. Just don't cut corners on the deck.",
        { flags: { 7: F_AVENTON }, neutral: t("Bueno, | tú | decides. | Solo | no hagas | la | presentación | a la carrera.", "Okay, | you | decide. | Just | don't do | the | deck | in a rush.",
          "Okay, your call. Just don't cut corners on the deck.", { flags: { 7: F_AVENTON_N } }) }),
    ],
    prio_already: [t("¡Ya | estamos | en la misma página!", "Already | we-are | on the same page!", "We're already on the same page!")],
    same_page_yes: [t("Totalmente. | Misma | página, | mismo | libro.", "Totally. | Same | page, | same | book.", "Totally. Same page, same book.")],
    same_page_not_yet: [t("¡Casi! | ¿Qué | hacemos | primero?", "Almost! | What | do-we-do | first?", "Almost! What do we do first?")],
    wa_slides: [t("¿La | presentación? | El | viernes, | pase lo que pase.", "The | deck? | — | Friday, | no matter what.", "The deck? Friday, no matter what.", { flags: { 2: F_ART } })],
    wa_party: [t("¿La | fiesta? | La próxima semana. | O | nunca. | ¡Es broma!", "The | party? | Next week. | Or | never. | Kidding!", "The party? Next week. Or never. Kidding!")],
    wa_photo: [t("¿La | foto? | La próxima semana | está bien.", "The | photo? | Next week | is fine.", "The photo? Next week is fine.")],
    wa_bugs: [t("Los | errores, | a primera hora | cada | mañana. | Luego, | la | presentación.", "The | bugs, | first thing | every | morning. | Then, | the | deck.", "Bugs first thing every morning. Then the deck.")],
    wa_emails: [t("Contesta | hoy | los | de | los | clientes | enojados. | Los | demás | pueden | esperar.", "Answer | today | the-ones | from | the | customers | angry. | The | rest | can | wait.",
      "Answer the angry ones today. The rest can wait.")],

    // --- the crash (twist) ---------------------------------------------------------------------
    crash_1: [t("¡Uy, | uy, | uy! | Mi | celular | se volvió loco.", "Whoa, | whoa, | whoa! | My | phone | went crazy.", "Whoa, whoa. My phone is going crazy.")],
    crash_2: [
      t("Alguien | hizo | el | código | al aventón, | y | un | millón | de | cactus | les | escribieron | a | sus | dueños: | “¡Riégame!”",
        "Someone | did | the | code | sloppily, | and | a | million | — | cactuses | — | wrote | to | their | owners: | “Water me!”",
        "Someone cut corners on the code, and a million cactuses just texted their owners: “Water me!”",
        { flags: { 4: F_AVENTON, 8: "un millón de = a million; de has no English word.", 10: "les doubles “a sus dueños”; English needs no word." },
          neutral: t("Alguien | hizo | el | código | a la carrera, | y | un | millón | de | cactus | les | escribieron | a | sus | dueños: | “¡Riégame!”",
            "Someone | did | the | code | in a rush, | and | a | million | — | cactuses | — | wrote | to | their | owners: | “Water me!”",
            "Someone cut corners on the code, and a million cactuses just texted their owners: “Water me!”",
            { flags: { 4: F_AVENTON_N, 8: "un millón de = a million; de has no English word.", 10: "les doubles “a sus dueños”; English needs no word." } }) }),
    ],
    crash_3: [
      t("Se cayeron | los | servidores. | Hay que | empezar de cero. | ¡La pelota está en tu cancha!", "Crashed | the | servers. | We-have-to | start from scratch. | The ball is in your court!",
        "The servers crashed. We're back to square one. The ball is in your court!"),
    ],
    crash_reask: [
      t("¿Y? | ¿Qué | hacemos | primero?", "So? | What | do-we-do | first?", "So? What do we do first?"),
      t("Vamos, | ¿cuál | es | el | plan?", "Come on, | what | is | the | plan?", "Come on, what's the plan?"),
    ],
    crash_what: [t("¿La verdad? | No sé. | Tú | dime: | ¿qué | hacemos | primero?", "Honestly? | I don't know. | You | tell-me: | what | do-we-do | first?", "Honestly? I don't know. You tell me: what do we do first?")],
    crash_help: [
      t("Bueno, | respira. | ¿Primero | arreglamos | el | error | y | luego | les | avisamos | a | los | clientes?", "Okay, | breathe. | First | we-fix | the | bug | and | then | — | we-tell | — | the | customers?",
        "Okay, deep breath. Fix the bug first, then tell the customers?", { flags: { 8: "les doubles “a los clientes”; English needs no word.", 10: F_A } }),
    ],
    crash_ok_reask: [t("¿Y? | ¿Lo | arreglamos | y | luego | les | avisamos?", "So? | It | we-fix | and | then | them | we-tell?", "So? Fix it, then tell them?")],
    crash_fix: [t("Primero | arreglarlo. | ¡Sí! | Le | llamo | a | Memo | ahora mismo.", "First | fix-it. | Yes! | — | I'll-call | — | Memo | right now.", "Fix it first. Yes! I'm calling Memo right now.", { flags: { 3: F_LE, 5: F_A } })],
    crash_tell: [t("Avisarles | a | los | clientes. | Con | honestidad | y | rápido. | Me encanta.", "Tell-them | — | the | customers. | With | honesty | and | fast. | I love it.", "Tell the customers. Honest and fast. Love it.", { flags: { 1: F_A } })],
    crash_ben: [t("¡Memo! | Claro. | Memo | arregla | lo que sea | con | suficiente | café.", "Memo! | Of course. | Memo | fixes | anything | with | enough | coffee.", "Memo! Of course. Memo can fix anything with enough coffee.")],
    crash_later: [t("Lanzar | la próxima semana. | Duele, | pero | es | lo | más | inteligente.", "Launch | next week. | It-hurts, | but | it's | the | most | smart.", "Launch next week. Painful, but smart.")],
    crash_rollback: [t("Regresar | a | la | versión | anterior. | Sí. | Primero, | la | seguridad.", "Go back | to | the | version | previous. | Yes. | First, | — | safety.", "Roll it back. Yes. Safety first.", { flags: { 7: F_ART } })],
    crash_end: [
      t("Bueno. | Se acabó | hacer | las | cosas | al aventón. | Lección | aprendida.", "Okay. | It's over | doing | — | things | sloppily. | Lesson | learned.", "Okay. No more cutting corners. Lesson learned.",
        { flags: { 3: F_ART, 5: F_AVENTON }, neutral: t("Bueno. | Se acabó | hacer | las | cosas | a la carrera. | Lección | aprendida.", "Okay. | It's over | doing | — | things | in a rush. | Lesson | learned.",
          "Okay. No more cutting corners. Lesson learned.", { flags: { 3: F_ART, 5: F_AVENTON_N } }) }),
      t("Gracias. | Y | nadie | vuelve a | hacer | nada | al aventón.", "Thanks. | And | nobody | again | does | anything | sloppily.", "Thank you. And nobody cuts corners ever again.",
        { flags: { 6: F_AVENTON }, neutral: t("Gracias. | Y | nadie | vuelve a | hacer | nada | a la carrera.", "Thanks. | And | nobody | again | does | anything | in a rush.",
          "Thank you. And nobody cuts corners ever again.", { flags: { 6: F_AVENTON_N } }) }),
    ],
    crash_who: [t("¿La verdad? | Yo. | Subí | la | actualización | a | las dos | de la mañana.", "Honestly? | Me. | I-pushed | the | update | at | two | in the morning.", "Honestly? Me. I pushed the update at two a.m.")],
    ball_back_react: [t("¡Ja! | No, | no. | La pelota está en tu cancha.", "Ha! | No, | no. | The ball is in your court.", "Ha! Nope. The ball is in your court.")],
    crash_skip: [t("Bueno. | Le | llamo | a | Memo. | Primero | arreglamos, | luego | hablamos.", "Okay. | — | I'll-call | — | Memo. | First | we-fix, | then | we-talk.", "Okay. I'll call Memo. Fix first, talk later.", { flags: { 1: F_LE, 3: F_A } })],

    // --- who owns what -------------------------------------------------------------------------
    owner_ask: [
      t("Genial. | ¿Necesitas | algo | más | de | mí?", "Great. | Do-you-need | something | more | from | me?", "Cool. Anything else you need from me?"),
      t("¿Alguna | pregunta | para | mí?", "Any | question | for | me?", "Any questions for me?"),
    ],
    owner_reask: [t("¿Algo | más?", "Anything | else?", "Anything else?"), t("¿Qué | más?", "What | else?", "What else?")],
    shoot: [t("Dime.", "Tell me.", "Shoot.")],
    owner_evasive: [
      t("Uy, | buena | pregunta. | Eso | lo vemos aparte.", "Ooh, | good | question. | That | we'll take offline.", "Ooh, great question. Let's take that offline."),
      t("Mmm. | Lo vemos aparte, | ¿te parece?", "Hmm. | We'll take it offline, | okay?", "Hmm. Let's take that offline, okay?"),
    ],
    owner_budget: [t("Raquel, | de | ventas. | Ella | maneja | el | presupuesto. | Yo | nada más | lo | gasto.", "Raquel, | from | sales. | She | manages | the | budget. | I | just | it | spend.",
      "Raquel in sales. She owns the budget. I just spend it.")],
    owner_payroll: [t("Raquel. | Ventas, | nómina, | el | café… | Raquel | hace | todo.", "Raquel. | Sales, | payroll, | the | coffee… | Raquel | does | everything.", "Raquel. Sales, payroll, coffee... Raquel does everything.")],
    owner_party: [t("Beto, | de | marketing. | Ya | está | pidiendo | un | pastel | en forma de | cactus.", "Beto, | from | marketing. | Already | he's | ordering | a | cake | shaped like | cactus.",
      "Beto in marketing. He's already ordering a cactus cake.")],
    owner_newsletter: [t("Beto. | Nada más | mándale | la | foto.", "Beto. | Just | send-him | the | photo.", "Beto. Just send him the photo.")],
    owner_slides: [t("El | viernes | a | las doce. | Los | inversionistas | llegan | a | las dos.", "— | Friday | at | twelve. | The | investors | arrive | at | two.", "Friday at noon. The investors come at two.", { flags: { 0: F_ART } })],
    owner_slides_you: [t("¡Tú! | Y | yo. | Sobre todo | tú.", "You! | And | me. | Mostly | you.", "You! And me. Mostly you.")],
    owner_code: [t("Memo, | nuestro | desarrollador. | Es | el | de | los | tres | monitores.", "Memo, | our | developer. | He's | the-one | with | the | three | monitors.", "Memo, our developer. He's the guy with three monitors.")],
    owner_emails: [t("Esos | son | tuyos, | la verdad. | ¡{m:Bienvenido|f:Bienvenida} | al | equipo!", "Those | are | yours, | actually. | Welcome | to-the | team!", "That's you, actually. Welcome to the team!")],
    owner_general: [t("¿La verdad? | Pregúntale | a | Raquel. | Raquel | sabe | todo.", "Honestly? | Ask-her | — | Raquel. | Raquel | knows | everything.", "Honestly? Ask Raquel. Raquel knows everything.", { flags: { 2: F_A } })],
    who_raquel: [t("Raquel | lleva | las | ventas. | Y | básicamente | todo | lo demás.", "Raquel | runs | — | sales. | And | basically | all | the rest.", "Raquel runs sales. And basically everything else.", { flags: { 2: F_ART } })],
    who_beto: [t("Beto | hace | el | marketing. | Cree | que | la | app | es | para | perros.", "Beto | does | — | marketing. | He-thinks | that | the | app | is | for | dogs.", "Beto does marketing. He thinks the app is for dogs.", { flags: { 2: F_ART } })],
    who_rodrigo: [
      t("Rodrigo | está | en | ventas. | No jala parejo. | Juega | ping-pong.", "Rodrigo | is | in | sales. | He doesn't pull his weight. | He-plays | ping-pong.", "Rodrigo is in sales. He doesn't pull his weight. He plays ping-pong.",
        { flags: { 4: F_PAREJO }, neutral: t("Rodrigo | está | en | ventas. | No pone de su parte. | Juega | ping-pong.", "Rodrigo | is | in | sales. | He doesn't do his part. | He-plays | ping-pong.",
          "Rodrigo is in sales. He doesn't pull his weight. He plays ping-pong.", { flags: { 4: F_PAREJO_N } }) }),
    ],
    who_memo: [t("Memo | es | nuestro | desarrollador. | Nunca | duerme.", "Memo | is | our | developer. | Never | he-sleeps.", "Memo is our developer. He never sleeps.")],

    // --- midnight (twist) ----------------------------------------------------------------------
    mid_1: [
      t("¡Ah, | y | otra | cosa! | Es | una | semana | grande, | así que | necesito | a | todos | aquí | hasta | la | medianoche.",
        "Oh, | and | another | thing! | It's | a | week | big, | so | I-need | — | everyone | here | until | — | midnight.",
        "Oh, and one more thing! Big week, so I need everyone here until midnight tonight.", { flags: { 10: F_A, 14: F_ART } }),
    ],
    mid_2: [t("¡En | Brotecito | hay que | ponerse las pilas!", "At | Brotecito | we-have-to | step it up!", "At Brotecito, we step it up!",
      { flags: { 3: "ponerse las pilas = to step it up (literally: to put your batteries in)." } })],
    mid_reask: [t("¿Y? | ¿Te | puedes | quedar?", "So? | — | Can-you | stay?", "So? Can you stay?", { flags: { 1: "te goes with quedar (quedarse = to stay); English needs no word." } })],
    mid_why: [t("Los | inversionistas, | la | presentación, | la | fiesta… | ¡es | una | semana | grande!", "The | investors, | the | deck, | the | party… | it's | a | week | big!", "The investors, the deck, the party... it's a big week!")],
    mid_limit: [t("¿Hasta | {$time}? | Me parece | justo. | Horas extra | pagadas, | y | a | {$time} | lo dejas por hoy.", "Until | {$time}? | It-seems | fair. | Overtime | paid, | and | at | {$time} | you call it a day.",
      "Until {$time}? Fair. Paid overtime, and at {$time} you call it a day.")],
    mid_limit_generic: [t("Bueno, | un par de | horas. | Pagadas, | obvio. | Luego | lo dejas por hoy.", "Okay, | a couple of | hours. | Paid, | obviously. | Then | you call it a day.", "Okay, a couple of hours. Paid, obviously. Then you call it a day.")],
    mid_yes: [t("¡Eres | un | crack! | Y | sí, | son | pagadas. | Si no, | Raquel | me | mata.", "You're | a | star! | And | yes, | they're | paid. | Otherwise, | Raquel | me | kills.", "Rock star! And yes, it's paid. Raquel would kill me.", { flags: { 2: F_CRACK } })],
    mid_cant: [
      t("Bueno, | bueno. | Es | justo. | Vete | a | tu | casa | a | las seis.", "Okay, | okay. | It's | fair. | Go | to | your | home | at | six.", "Okay, okay. Fair. Go home at six."),
      t("Me parece | justo. | Vete | a casa. | Mañana | empezamos | con todo.", "It-seems | fair. | Go | home. | Tomorrow | we-start | full force.", "Fair enough. Go home. We'll start fresh tomorrow."),
    ],
    mid_paid: [t("¿Pagadas? | Eh… | sí. | Claro, | como | dice | la | ley. | Horas extra | pagadas, | y | paramos | a | las nueve. | ¿Trato hecho?",
      "Paid? | Um… | yes. | Of course, | as | says | the | law. | Overtime | paid, | and | we-stop | at | nine. | Deal?", "Paid? Um... yes. Of course, it's the law. Paid overtime, and we stop at nine. Deal?")],
    mid_finish: [t("Buena | pregunta. | ¿A | las nueve? | Horas extra | pagadas, | obvio. | ¿Trato hecho?", "Good | question. | At | nine? | Overtime | paid, | obviously. | Deal?", "Good question. Nine? Paid overtime, obviously. Deal?")],
    mid_deal_reask: [t("¿Y? | ¿Trato hecho?", "So? | Deal?", "So? Deal?")],
    mid_offer: [t("¿Hasta | {$time}? | Me parece | justo. | Horas extra | pagadas. | ¿Trato hecho?", "Until | {$time}? | It-seems | fair. | Overtime | paid. | Deal?", "Until {$time}? Fair. Paid overtime. Deal?")],
    mid_when_reask: [t("¿Y? | ¿Hasta | qué | hora?", "So? | Until | what | time?", "So? Until when?")],
    mid_deal_yes: [t("Trato hecho. | Gracias | por | el | apoyo.", "Deal. | Thanks | for | the | support.", "Deal. Thanks for stepping up.")],
    mid_when: [t("Bueno. | ¿A qué hora | te funciona?", "Okay. | What time | works for you?", "Okay. What works for you?")],
    mid_giveup: [t("Bueno, | ya. | Todos | se van | a | su | casa | a | las ocho.", "Okay, | fine. | Everyone | goes | to | their | home | at | eight.", "Okay, fine. Everybody goes home at eight.")],

    // --- tomorrow ------------------------------------------------------------------------------
    close_q: [
      t("¡Listo! | ¿Hacemos | otro | check-in | mañana | a | las ocho?", "Done! | Shall-we-do | another | check-in | tomorrow | at | eight?", "All right. Touch base again at eight tomorrow?", { flags: { 3: F_CHECK } }),
      t("Oye, | ¿nos vemos | mañana | a | las ocho | para | otro | check-in?", "Hey, | shall-we-meet | tomorrow | at | eight | for | another | check-in?", "Hey, touch base again tomorrow at eight?", { flags: { 7: F_CHECK } }),
    ],
    close_reask: [t("Entonces, | ¿mañana | a | las ocho?", "So, | tomorrow | at | eight?", "So, eight tomorrow?")],
    meet_ok: [
      t("¡Perfecto! | Nos vemos | a | las ocho.", "Perfect! | See you | at | eight.", "Perfect. See you at eight!"),
      t("Genial. | Mañana | a | las ocho.", "Great. | Tomorrow | at | eight.", "Great. Eight tomorrow."),
    ],
    meet_move: [
      t("¿A | {$time}? | Me funciona. | ¡Nos vemos!", "At | {$time}? | It works for me. | See you!", "{$time}? Works for me. See you then!"),
      t("Claro, | a | {$time}. | Yo | llevo | el | café.", "Sure, | at | {$time}. | I | bring | the | coffee.", "Sure, {$time}. I'll bring coffee."),
    ],
    meet_move_noon: [
      t("¿Al | mediodía? | Me funciona. | ¡Nos vemos!", "At | noon? | It works for me. | See you!", "Noon? Works for me. See you then!"),
      t("Claro, | al | mediodía. | Yo | llevo | el | café.", "Sure, | at | noon. | I | bring | the | coffee.", "Sure, noon. I'll bring coffee."),
    ],
    offer_ok_noon: [t("¡Genial! | Al | mediodía, | entonces.", "Great! | At | noon, | then.", "Great. Noon it is!")],
    offer_reask_noon: [t("¿Y? | ¿Al | mediodía?", "So? | At | noon?", "So? Noon?")],
    offer_ok: [t("¡Genial! | A | {$time}, | entonces.", "Great! | At | {$time}, | then.", "Great. {$time} it is!")],
    meet_move_generic: [t("Me funciona. | ¡Nos vemos!", "It works for me. | See you!", "Works for me. See you then!")],
    meet_silly: [t("¡Ja! | Seamos | humanos. | ¿Qué tal | a | las diez?", "Ha! | Let's-be | human. | How about | at | ten?", "Ha! Let's keep it human. How about ten?")],
    when_q: [t("No hay problema. | ¿A qué hora | te funciona?", "No problem. | What time | works for you?", "No problem. When works for you?")],
    when_reask: [t("Entonces, | ¿a qué hora?", "So, | what time?", "So, when?")],
    when_noon: [t("¿Qué tal | al | mediodía? | Es | la | mejor | hora | para | todos.", "How about | at-the | noon? | It's | the | best | time | for | everyone.", "How about noon? Noon works for everybody.")],
    offer_reask: [t("¿Y? | ¿A | {$time}?", "So? | At | {$time}?", "So? {$time}?")],
    call_day_react: [t("¡Ja! | ¡Sí! | Dejémoslo por hoy. | Mañana | a | las ocho, | entonces.", "Ha! | Yes! | Let's call it a day. | Tomorrow | at | eight, | then.", "Ha! Yes! Let's call it a day. Eight tomorrow, then.")],
    close_skip: [t("Bueno, | mañana | a | las ocho. | Nos vemos.", "Okay, | tomorrow | at | eight. | See you.", "Okay, eight tomorrow. See you then.")],
    not_yet: [t("¡Ja! | Todavía no. | Buen | intento.", "Ha! | Not yet. | Good | try.", "Ha! Not yet. Nice try, though.")],
    close_good: [
      t("¡Muy bien! | Buen | trabajo | hoy. | ¡Dejémoslo por hoy!", "Very good! | Good | work | today. | Let's call it a day!", "Nice! Great work today. Let's call it a day!"),
      t("¿Sabes qué? | Buen | día. | ¡Dejémoslo por hoy!", "You know what? | Good | day. | Let's call it a day!", "You know what? Good day. Let's call it a day!"),
    ],
    close_partial: [t("Bueno… | mañana | hacemos | check-in | y | lo | resolvemos.", "Okay… | tomorrow | we-do | check-in | and | it | we-figure-out.", "Okay... let's touch base tomorrow and figure it out.", { flags: { 3: F_CHECK } })],
    bye_tyler: [
      t("¡Nos vemos | mañana! | ¡Wifi, | despídete!", "See you | tomorrow! | Wifi, | say-bye!", "See you tomorrow! Wifi, say bye!"),
      t("¡Vete | a casa! | Es | una | orden. | Es broma. | Más o menos.", "Go | home! | It's | an | order. | Kidding. | Sort of.", "Go home! That's an order. Kidding. Kind of."),
    ],
    bye_early: [t("Uy, | ¿ya | te vas? | Bueno… | ¡mañana | hacemos | check-in!", "Whoa, | already | you're-leaving? | Okay… | tomorrow | we-do | check-in!", "Whoa, leaving already? Okay... let's touch base tomorrow!", { flags: { 6: F_CHECK } })],

    // --- asides --------------------------------------------------------------------------------
    anyway: [t("¡En fin!", "Anyway!", "Anyway!"), t("¿En | qué | estaba?", "On | what | was-I?", "Where was I?")],
    idiom_back: [
      t("¡Mírate, | hablando | como | {m:fundador|f:fundadora}!", "Look at you, | talking | like | a-founder!", "Look at you, talking like a founder!"),
      t("¡Uy, | ya | hablas | mi | idioma!", "Whoa, | already | you-speak | my | language!", "Whoa, you're speaking my language!"),
    ],
    meta: [t("¡Ja! | Perdón. | Cerebro | de | startup. | Voy | a | hablar | más | claro.", "Ha! | Sorry. | Brain | of | startup. | I'm-going | to | speak | more | clearly.", "Ha! Sorry. Startup brain. I'll try to say it plainly.")],
    dog: [
      t("¡Es | Wifi! | El | mejor | empleado. | Nunca | hace | nada | al aventón.", "It's | Wifi! | The | best | employee. | Never | does | anything | sloppily.", "That's Wifi! Best employee. Never cuts corners.",
        { flags: { 8: F_AVENTON }, neutral: t("¡Es | Wifi! | El | mejor | empleado. | Nunca | hace | nada | a la carrera.", "It's | Wifi! | The | best | employee. | Never | does | anything | in a rush.",
          "That's Wifi! Best employee. Never cuts corners.", { flags: { 8: F_AVENTON_N } }) }),
    ],
    slide: [
      t("¿La | resbaladilla? | Es | para | la | moral. | Y | para | los | simulacros.", "The | slide? | It's | for | — | morale. | And | for | the | fire-drills.", "The slide? It's for morale. And for fire drills.",
        { flags: { 1: "Mexican: la resbaladilla = slide (elsewhere: el tobogán).", 4: F_ART },
          neutral: t("¿El | tobogán? | Es | para | la | moral. | Y | para | los | simulacros.", "The | slide? | It's | for | — | morale. | And | for | the | fire-drills.", "The slide? It's for morale. And for fire drills.", { flags: { 4: F_ART } }) }),
    ],

    // --- what the idioms mean ------------------------------------------------------------------
    mean_checkin: [
      t("¡Ah! | Un | check-in | es | una | reunión | cortita: | cinco | minutos | para | ver | cómo | vas.", "Oh! | A | check-in | is | a | meeting | short: | five | minutes | to | see | how | you're-doing.",
        "Oh! A check-in is just a quick meeting: five minutes to see how you're doing.", { flags: { 6: "cortita: little and short (a diminutive of corta)." } }),
      t("Es | inglés, | perdón. | Quiere decir | una | conversación | rápida: | ¿cómo | vamos?", "It's | English, | sorry. | It-means | a | conversation | quick: | how | are-we-doing?", "It's English, sorry. It just means a quick chat: how are we doing?"),
    ],
    mean_chino: [
      t("¡Ja! | Quiere decir | que | es | muy | difícil | de | entender. | Como | si | estuviera | en | chino.", "Ha! | It-means | that | it's | very | hard | to | understand. | As | if | it-were | in | Chinese.",
        "Ha! It means it's really hard to understand. As if it were in Chinese."),
      t("Cuando | algo | está | en chino, | no se entiende | nada. | Es | normal | la | primera | semana.", "When | something | is | in Chinese, | you-can't-understand | anything. | It's | normal | the | first | week.",
        "When something's “in Chinese”, you can't understand any of it. Totally normal in week one.", { flags: { 3: F_CHINO } }),
    ],
    mean_onda: [
      t("Agarrarle la onda | es | entender | cómo | funcionan | las | cosas. | Poco a poco.", "Getting the hang of it | is | to-understand | how | work | — | things. | Little by little.",
        "Agarrarle la onda means figuring out how things work. Little by little.",
        { flags: { 0: F_ONDA, 5: F_ART }, neutral: t("Agarrarle el ritmo | es | entender | cómo | funcionan | las | cosas. | Poco a poco.", "Getting the hang of it | is | to-understand | how | work | — | things. | Little by little.",
          "Agarrarle el ritmo means figuring out how things work. Little by little.", { flags: { 0: F_ONDA_N, 5: F_ART } }) }),
      t("Quiere decir | aprender | cómo | se hacen | las | cosas | aquí. | Es | normal | la | primera | semana.", "It-means | to-learn | how | are-done | — | things | here. | It's | normal | the | first | week.",
        "It means learning how things are done here. Totally normal in week one.", { flags: { 4: F_ART } }),
    ],
    mean_crack: [
      t("¡Es | un | cumplido! | Un | crack | es | alguien | muy, | muy | bueno.", "It's | a | compliment! | A | crack | is | someone | very, | very | good.", "It's a compliment! A crack is someone who's really, really good.", { flags: { 4: F_CRACK } }),
      t("Quiere decir | que | lo | haces | increíble. | Como | un | futbolista | estrella.", "It-means | that | it | you-do | amazing. | Like | a | soccer-player | star.", "It means you're doing great. Like a star soccer player."),
    ],
    mean_manos: [
      t("Quiere decir: | “¡Empecemos!” | A | trabajar.", "It-means: | “Let's start!” | To | work.", "It just means “let's start.” Get to work!"),
      t("Es | como | decir: | “Ya, | a | trabajar.” | Las | manos | van | a | la | obra.", "It's | like | saying: | “Okay, | to | work.” | The | hands | go | to | the | job.", "It's like saying “Okay, let's get to work.” Your hands go to the job."),
    ],
    mean_caja: [
      t("Quiere decir: | sé | {m:creativo|f:creativa}. | Prueba | una | idea | nueva, | no | la | de siempre.", "It-means: | be | creative. | Try | an | idea | new, | not | the-one | as-usual.",
        "It means be creative! Try a new idea, not the usual one."),
      t("¡Ja! | No hay | ninguna | caja. | Quiere decir: | piensa | de | otra | manera.", "Ha! | There isn't | any | box. | It-means: | think | in | another | way.", "Ha! There's no actual box. It just means: think in a new way."),
    ],
    mean_cuello: [
      t("Quiere decir | que | tienes | muchísimo | trabajo. | ¡Demasiado!", "It-means | that | you-have | a-ton-of | work. | Too much!", "It means you're super busy. Way too much work!"),
      t("Imagina | que | el | trabajo | es | agua. | Te | llega | hasta | el | cuello. | ¡Te ahogas!", "Imagine | that | the | work | is | water. | To-you | it-reaches | up to | the | neck. | You're drowning!",
        "Imagine the work is water. It's up to your neck. You're drowning!"),
    ],
    mean_pagina: [
      t("Quiere decir | que | estamos | de acuerdo. | Vemos | el | plan | igual.", "It-means | that | we-are | in agreement. | We-see | the | plan | the-same.", "It means we agree. We see the plan the same way."),
      t("Es | como | si | leyéramos | la | misma | página | del | mismo | libro.", "It's | as | if | we-were-reading | the | same | page | of-the | same | book.", "It's like we're reading the same page of the same book."),
    ],
    mean_parejo: [
      t("Jalar parejo | es | hacer | tu | parte | del | trabajo, | igual que | los | demás.", "Pulling your weight | is | to-do | your | share | of-the | work, | same as | the | others.",
        "Jalar parejo means doing your fair share of the work, like everyone else.",
        { flags: { 0: F_PAREJO }, neutral: t("Poner de tu parte | es | hacer | tu | trabajo, | igual que | los | demás.", "Doing your part | is | to-do | your | work, | same as | the | others.",
          "Poner de tu parte means doing your fair share of the work, like everyone else.", { flags: { 0: F_PAREJO_N } }) }),
      t("Como | cuando | varios | jalan | una | cuerda: | todos | tienen que | jalar | igual.", "Like | when | several | pull | a | rope: | everyone | has-to | pull | equally.", "Like when a team pulls a rope: everybody has to pull the same."),
    ],
    mean_aventon: [
      t("Al aventón | quiere decir | rápido | y | mal: | sin | cuidado, | saltándote | pasos.", "Sloppily | means | fast | and | badly: | without | care, | skipping | steps.", "Al aventón means fast and sloppy: skipping steps.",
        { flags: { 0: F_AVENTON }, neutral: t("A la carrera | quiere decir | rápido | y | mal: | sin | cuidado, | saltándote | pasos.", "In a rush | means | fast | and | badly: | without | care, | skipping | steps.",
          "A la carrera means fast and sloppy: skipping steps.", { flags: { 0: F_AVENTON_N } }) }),
      t("Como | hacer | la | tarea | cinco | minutos | antes de | la | clase.", "Like | doing | the | homework | five | minutes | before | the | class.", "Like doing your homework five minutes before class."),
    ],
    mean_cero: [
      t("Quiere decir | que | volvemos a | empezar | desde | el | principio.", "It-means | that | we-go-back-to | starting | from | the | beginning.", "It means we start again from the very beginning."),
      t("Como | en | un | juego de mesa: | regresas | a | la | primera | casilla.", "Like | in | a | board game: | you-go-back | to | the | first | square.", "Like a board game. You go back to the first square."),
    ],
    mean_cancha: [
      t("Quiere decir | que | te toca | a | ti. | Tú | decides | qué | sigue.", "It-means | that | it's your turn | — | you. | You | decide | what | comes-next.", "It means it's your turn. You decide what happens next.",
        { flags: { 3: "a ti doubles te (te toca a ti = it's your turn)." } }),
      t("Es | del | tenis. | Yo | te | paso | la | pelota. | ¡Ahora | juegas | tú!", "It's | from-the | tennis. | I | to-you | pass | the | ball. | Now | play | you!", "It's from tennis. I hit the ball to you. Now you play!"),
    ],
    mean_aparte: [
      t("¡Perdón! | Quiere decir: | “Lo | hablamos | después, | tú | y | yo.”", "Sorry! | It-means: | “It | we'll-discuss | later, | you | and | me.”", "Sorry! It means “let's talk about it later, just us.”"),
      t("Me descubriste. | Es | una | forma | elegante | de | decir | “ahora no”.", "You caught me. | It's | a | way | fancy | of | saying | “not now”.", "Busted. It's a fancy way to say “not now.”"),
    ],
    mean_por_hoy: [
      t("Quiere decir: | se acabó | el | trabajo | de | hoy. | ¡A casa!", "It-means: | it's over | the | work | of | today. | Home!", "It means stop working for today. Go home!"),
      t("Terminamos | el | trabajo | del | día. | ¡Laptops | cerradas!", "We-finish | the | work | of-the | day. | Laptops | closed!", "We finish work for the day. Laptops closed!"),
    ],
    mean_pilas: [
      t("Quiere decir: | hay que | trabajar | con | energía, | en serio.", "It-means: | we-have-to | work | with | energy, | seriously.", "It means: work hard, with real energy."),
      t("Como | un | juguete | con | pilas | nuevas: | ¡a toda velocidad!", "Like | a | toy | with | batteries | new: | at full speed!", "Like a toy with new batteries: full speed ahead!"),
    ],
    mean_ganas: [
      t("Echarle ganas | es | esforzarte | mucho. | ¡Tú | puedes!", "Giving it your all | is | to-try-hard | a lot. | You | can!", "Echarle ganas means trying really hard. You've got this!",
        { flags: { 0: F_GANAS }, neutral: t("Dar con todo | es | esforzarte | mucho. | ¡Tú | puedes!", "Giving it your all | is | to-try-hard | a lot. | You | can!", "Dar con todo means trying really hard. You've got this!", { flags: { 0: F_GANAS_N } }) }),
      t("Quiere decir: | pon | todo | tu | esfuerzo. | Lo | decimos | mucho | aquí.", "It-means: | put | all | your | effort. | It | we-say | a lot | here.", "It means: give it everything you've got. We say it a lot around here."),
    ],
    mean_chamba: [
      t("Chamba | es | trabajo. | Así | le | decimos | en | México.", "Chamba | is | work. | So | it | we-call | in | Mexico.", "Chamba just means work. That's what we call it in Mexico.", { flags: { 0: F_CHAMBA } }),
      t("Es | trabajo, | pero | más | informal: | “hay | mucha | chamba”.", "It's | work, | but | more | informal: | “there's | a-lot-of | work”.", "It's work, just more casual: “hay mucha chamba” means there's a lot of work.", { flags: { 7: F_CHAMBA } }),
    ],
  },

  hints: {
    finding: {
      lt: "Say how your first week is going",
      items: [
        { id: "onda", s: t("Poco a poco | le estoy agarrando la onda.", "Little by little | I'm getting the hang of it.", "I'm slowly getting the hang of it."),
          note: "Mexican: agarrarle la onda = get the hang of it (elsewhere: agarrarle el ritmo)." },
        { id: "chino", s: t("Sí, | todo | está | en chino.", "Yes, | everything | is | in Chinese.", "Yeah, it's all Greek to me."), note: "estar en chino: too hard to understand (English says “Greek to me”)." },
        { id: "lot_learn", s: t("Hay | mucho | que aprender.", "There's | a lot | to learn.", "There's a lot to learn.") },
        { id: "great", s: t("Está | increíble, | pero | es | mucho.", "It's | amazing, | but | it's | a lot.", "It's great, but it's a lot.") },
        { id: "love", s: t("¡Me encanta | estar | aquí!", "I love | being | here!", "I love it here!") },
        { id: "lost", s: t("La verdad, | estoy | un poco | {m:perdido|f:perdida}.", "Honestly, | I'm | a little | lost.", "Honestly, I'm a little lost.") },
      ],
    },
    overload: {
      lt: "Say you already have too much work", slot: "task", examples: ["bugs", "emails"],
      items: [
        { id: "cuello", s: t("Estoy | hasta el cuello | con | {X.the}.", "I'm | up to my neck | with | {X.the}.", "I'm up to my ears in {X.the}."), note: "From the song: estar hasta el cuello = to be swamped." },
        { id: "abasto", s: t("Ya | no me doy abasto.", "Already | I can't keep up.", "I can't keep up as it is."), note: "no darse abasto: to have more than you can handle." },
        { id: "mucho_trabajo", s: t("Ya | tengo | mucho | trabajo.", "Already | I-have | a lot of | work.", "I already have a lot on my plate.") },
        { id: "too_much", s: t("Es | demasiado | para | una | semana.", "It's | too much | for | one | week.", "That's too much for one week.") },
        { id: "cant_all", s: t("No puedo | hacer | todo | eso.", "I can't | do | all | that.", "I can't do all of that.") },
        { id: "saturado", s: t("Estoy | muy | {m:saturado|f:saturada} | esta | semana.", "I'm | very | swamped | this | week.", "I'm swamped this week.") },
        { id: "aventon", s: t("No quiero | hacer | las | cosas | al aventón.", "I don't want | to-do | — | things | sloppily.", "I don't want to cut corners.", { flags: { 2: F_ART, 4: F_AVENTON } }),
          note: "Mexican: al aventón = sloppily, in a rush (elsewhere: a la carrera)." },
      ],
    },
    priority: {
      lt: "Ask what comes first",
      items: [
        { id: "focus", s: t("¿Qué | hago | primero?", "What | do-I-do | first?", "What should I focus on first?") },
        { id: "priority", s: t("¿Cuál | es | la | prioridad?", "Which | is | the | priority?", "Which one is the priority?") },
        { id: "most_important", s: t("¿Qué | es | lo más importante?", "What | is | the most important (thing)?", "What's most important?") },
        { id: "can_wait", s: t("¿Qué | puede | esperar?", "What | can | wait?", "Which one can wait?") },
        { id: "start_where", s: t("¿Por dónde | empiezo?", "Where | do-I-start?", "Where should I start?") },
        { id: "same_page", s: t("Entonces, | ¿estamos | en la misma página?", "So, | are-we | on the same page?", "So, are we on the same page?") },
      ],
    },
    propose: {
      lt: "Suggest what to do first and what can wait", slot: "task", examples: ["slides", "party", "photo"],
      items: [
        { id: "first_rest", s: t("Puedo | hacer | {X.the} | primero, | y | lo demás, | la próxima semana.", "I-can | do | {X.the} | first, | and | the rest, | next week.", "I can do {X.the} first, and the rest next week.") },
        { id: "focus_on", s: t("Me voy a enfocar | en | {X.the}.", "I'm going to focus | on | {X.the}.", "I'll focus on {X.the} first.") },
        { id: "start_with", s: t("Empecemos | con | {X.the}.", "Let's-start | with | {X.the}.", "Let's start with {X.the}.") },
        { id: "wait_week", s: t("¿{X.the} | puede | esperar | a | la próxima semana?", "{X.the} | can | wait | until | next week?", "Can {X.the} wait until next week?"), only: notPlural },
        { id: "someone_else", s: t("¿Alguien más | puede | hacer | {X.the}?", "Someone else | can | do | {X.the}?", "Could someone else do {X.the}?") },
        { id: "brad", s: t("¿Tal vez | Rodrigo | puede | hacer | {X.the}?", "Maybe | Rodrigo | can | do | {X.the}?", "Maybe Rodrigo could do {X.the}?") },
      ],
    },
    idioms: {
      lt: "Ask what an expression means",
      items: [
        { id: "what_mean", s: t("Perdón, | ¿qué | significa | “ponerse las pilas”?", "Sorry, | what | does-it-mean | “step it up”?", "Sorry, what does “ponerse las pilas” mean?") },
        { id: "mean_by", s: t("¿Cómo que | “jalar parejo”?", "What do you mean | “pull your weight”?", "What do you mean, “jalar parejo”?"), note: "¿Cómo que…? = What do you mean…? Very common in Mexico." },
        { id: "idiom", s: t("¿Es | una | expresión?", "Is-it | an | expression?", "Is that an idiom?") },
        { id: "plain", s: t("¿Puedes | decirlo | con | otras | palabras?", "Can-you | say-it | with | other | words?", "Can you say that another way?") },
        { id: "what_base", s: t("¿Cuál | caja?", "What | box?", "What box?") },
      ],
    },
    owner: {
      lt: "Ask who's in charge of what", slot: "area", examples: ["budget", "party", "code"],
      items: [
        { id: "who_ask", s: t("¿A quién | le | pregunto | sobre | {X.the}?", "Who | — | do-I-ask | about | {X.the}?", "Who should I ask about {X.the}?", { flags: { 1: F_LE } }) },
        { id: "in_charge", s: t("¿Quién | se encarga | de | {X.the}?", "Who | is in charge | of | {X.the}?", "Who's in charge of {X.the}?") },
        { id: "deadline", s: t("¿Cuál | es | la | fecha límite?", "What | is | the | deadline?", "What's the deadline?") },
        { id: "insist", s: t("Perdón, | pero | necesito | saberlo | ya.", "Sorry, | but | I-need | to-know-it | now.", "Sorry, but I need to know now.") },
      ],
    },
    crash: {
      lt: "Suggest a plan after the crash",
      items: [
        { id: "fix_first", s: t("Primero | hay que | arreglar | el | error.", "First | we-have-to | fix | the | bug.", "Let's fix the bug first.") },
        { id: "tell_cust", s: t("Hay que | avisarles | a | los | clientes.", "We-have-to | tell-them | — | the | customers.", "We should tell the customers.", { flags: { 2: F_A } }) },
        { id: "ask_memo", s: t("Hay que | llamar | a | Memo.", "We-have-to | call | — | Memo.", "Let's ask Memo for help.", { flags: { 2: F_A } }) },
        { id: "launch_later", s: t("Hay que | lanzar | la próxima semana.", "We-have-to | launch | next week.", "Let's launch next week.") },
        { id: "what_exactly", s: t("¿Qué | quieres | que | haga | exactamente?", "What | do-you-want | that | I-do | exactly?", "What exactly do you want me to do?") },
        { id: "who_cut", s: t("¿Quién | lo | hizo | al aventón?", "Who | it | did | sloppily?", "Who cut corners?", { flags: { 3: F_AVENTON } }) },
      ],
    },
    midnight: {
      lt: "Negotiate staying until midnight",
      items: [
        { id: "until_time", s: t("Puedo | quedarme | hasta | las siete, | pero | luego | lo dejo por hoy.", "I-can | stay | until | seven, | but | then | I'll call it a day.", "I can stay until seven, but then I'll call it a day.") },
        { id: "paid", s: t("¿Se pagan | las | horas extra?", "Are-paid | the | overtime-hours?", "Will the overtime be paid?") },
        { id: "cant_stay", s: t("Perdón, | hoy | no puedo | quedarme | hasta tarde.", "Sorry, | today | I can't | stay | late.", "Sorry, I can't stay late tonight.") },
        { id: "plans", s: t("Tengo | planes | hoy | en la noche.", "I-have | plans | today | at night.", "I have plans tonight.") },
        { id: "finish_time", s: t("¿A qué hora | terminamos?", "What time | do-we-finish?", "What time do we finish?") },
      ],
    },
    closing: {
      lt: "Agree on tomorrow's check-in",
      items: [
        { id: "see_eight", s: t("Claro, | nos vemos | a | las ocho.", "Sure, | see you | at | eight.", "Sure, see you at eight.") },
        { id: "make_it", s: t("¿Podemos | hacerlo | a | las diez?", "Can-we | do-it | at | ten?", "Could we make it ten?") },
        { id: "how_about", s: t("¿Qué tal | al | mediodía?", "How about | at | noon?", "How about noon?") },
        { id: "early", s: t("Las ocho | es | un poco | temprano | para mí.", "Eight | is | a bit | early | for me.", "Eight is a bit early for me.") },
        { id: "call_day", s: t("¡Dejémoslo por hoy!", "Let's call it a day!", "Let's call it a day!") },
      ],
    },
  },

  tips: {
    blunt_no: { key: "blunt_no", lt: "Understood! A flat “No” sounds harsh to your boss. Better to say how much you already have.", better: "Estoy hasta el cuello con los reportes de errores." },
    rude: { key: "rude", lt: "Understood! That's rude to say to your boss, even at a startup. Calmly say how much you already have, and suggest what can wait.",
      better: "Ya tengo mucho trabajo. ¿La fiesta puede esperar?" },
  },

  merges: {
    "check-in": { reason: "lexical_expression", split: "An English word borrowed whole: a quick catch-up meeting.", minimal: "One term." },
    "al principio": { reason: "lexical_expression", split: "al → to the + principio → beginning; = at first.", minimal: "Two words." },
    "en chino": { reason: "lexical_expression", split: "en → in + chino → Chinese; the idiom estar en chino = to be Greek to someone.", minimal: "Two words." },
    "hasta ahora": { reason: "lexical_expression", split: "hasta → until + ahora → now; = so far.", minimal: "Two words." },
    "me encanta": { reason: "grammatical_fusion", split: "me → to me + encanta → delights; one English verb = I love (it).", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as an opener = honestly.", minimal: "Two words." },
    "qué bien": { reason: "lexical_expression", split: "qué → what + bien → well; the exclamation = how great.", minimal: "Two words." },
    "échale ganas": { reason: "lexical_expression", split: "échale → throw at it + ganas → desire is false; the Mexican idiom = give it your all.", minimal: "The idiom." },
    "dale con todo": { reason: "lexical_expression", split: "dale → give it + con → with + todo → everything; the idiom = give it your all.", minimal: "The idiom." },
    "no me odies": { reason: "grammatical_fusion", split: "no → not + me → me + odies → you-hate; English puts don't inside: don't hate me.", minimal: "Three words." },
    "no te preocupes": { reason: "grammatical_fusion", split: "no → not + te → yourself + preocupes → you-worry; = don't worry.", minimal: "Three words." },
    "le vas a agarrar la onda": { reason: "lexical_expression", split: "le → to it, vas a → you're going to, agarrar → grab, la onda → the wave is false; the Mexican idiom = you'll get the hang of it.", minimal: "The idiom with its verb." },
    "le vas a agarrar el ritmo": { reason: "lexical_expression", split: "le → to it, vas a → you're going to, agarrar → grab, el ritmo → the rhythm; the idiom = you'll get the hang of it.", minimal: "The idiom with its verb." },
    "le estoy agarrando la onda": { reason: "lexical_expression", split: "le → to it, estoy agarrando → I'm grabbing, la onda → the wave is false; the Mexican idiom = I'm getting the hang of it.", minimal: "The idiom with its verb." },
    "manos a la obra": { reason: "lexical_expression", split: "manos → hands, a → to, la → the, obra → work; the fixed call = let's get to work.", minimal: "The idiom." },
    "piensa fuera de la caja": { reason: "lexical_expression", split: "piensa → think, fuera de → outside, la → the, caja → box; the business idiom = think outside the box.", minimal: "The idiom." },
    "tenemos que": { reason: "lexical_expression", split: "tenemos → we have + que → that; tener que = have to.", minimal: "Two words." },
    "jalar parejo": { reason: "lexical_expression", split: "jalar → pull + parejo → evenly; the Mexican idiom = pull your weight.", minimal: "Two words." },
    "jale parejo": { reason: "lexical_expression", split: "jale → he pulls + parejo → evenly; the Mexican idiom = pull his weight.", minimal: "Two words." },
    "no jala parejo": { reason: "lexical_expression", split: "no → not, jala → pulls, parejo → evenly; = doesn't pull his weight.", minimal: "Three words." },
    "poner de nuestra parte": { reason: "lexical_expression", split: "poner → put, de → of, nuestra → our, parte → part; the idiom = do our part.", minimal: "The idiom." },
    "ponga de su parte": { reason: "lexical_expression", split: "ponga → he puts, de → of, su → his, parte → part; the idiom = do his part.", minimal: "The idiom." },
    "no pone de su parte": { reason: "lexical_expression", split: "no → not, pone → puts, de → of, su → his, parte → part; = doesn't do his part.", minimal: "The idiom." },
    "poner de tu parte": { reason: "lexical_expression", split: "poner → put, de → of, tu → your, parte → part; the idiom = do your part.", minimal: "The idiom." },
    "ya sé": { reason: "lexical_expression", split: "ya → already + sé → I know; = I know.", minimal: "Two words." },
    "hasta el cuello": { reason: "lexical_expression", split: "hasta → up to, el → the, cuello → neck; the idiom = up to your ears in work.", minimal: "Three words." },
    "lo demás": { reason: "lexical_expression", split: "lo → the + demás → others; = the rest.", minimal: "Two words." },
    "la próxima semana": { reason: "lexical_expression", split: "la → the, próxima → next, semana → week; English says next week with no article.", minimal: "Three words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → made; the fixed reply = deal!", minimal: "Two words." },
    "en la misma página": { reason: "lexical_expression", split: "en → on, la → the, misma → same, página → page; the business idiom = on the same page.", minimal: "Four words." },
    "no se mueve": { reason: "grammatical_fusion", split: "no → not + se → itself + mueve → moves; = doesn't move.", minimal: "Three words." },
    "sin duda": { reason: "lexical_expression", split: "sin → without + duda → doubt; = no doubt.", minimal: "Two words." },
    "ahora sí": { reason: "lexical_expression", split: "ahora → now + sí → yes; sí stresses the change: now (at last).", minimal: "Two words." },
    "me funciona": { reason: "grammatical_fusion", split: "me → to me + funciona → it works; = it works for me.", minimal: "Two words." },
    "te funciona": { reason: "grammatical_fusion", split: "te → to you + funciona → it works; = works for you.", minimal: "Two words." },
    "y si": { reason: "lexical_expression", split: "y → and + si → if; a suggestion = what if.", minimal: "Two words." },
    "nada más": { reason: "lexical_expression", split: "nada → nothing + más → more; before a verb = just.", minimal: "Two words." },
    "no hagas": { reason: "grammatical_fusion", split: "no → not + hagas → you-do; = don't do.", minimal: "Two words." },
    "al aventón": { reason: "lexical_expression", split: "al → to the + aventón → push / ride is false; the Mexican idiom = sloppily, in a rush.", minimal: "Two words." },
    "a la carrera": { reason: "lexical_expression", split: "a → at, la → the, carrera → race; the idiom = in a rush, without care.", minimal: "Three words." },
    "pase lo que pase": { reason: "lexical_expression", split: "pase → may happen, lo que → what, pase → may happen; = no matter what.", minimal: "The fixed phrase." },
    "es broma": { reason: "lexical_expression", split: "es → it's + broma → joke; = kidding.", minimal: "Two words." },
    "a primera hora": { reason: "lexical_expression", split: "a → at, primera → first, hora → hour; = first thing.", minimal: "Three words." },
    "se volvió loco": { reason: "lexical_expression", split: "se → itself, volvió → turned, loco → crazy; volverse loco = go crazy.", minimal: "Three words." },
    "se cayeron": { reason: "grammatical_fusion", split: "se → themselves + cayeron → fell; caerse (servers) = to crash.", minimal: "Two words." },
    "hay que": { reason: "lexical_expression", split: "hay → there is + que → that; = we have to (impersonal).", minimal: "Two words." },
    "empezar de cero": { reason: "lexical_expression", split: "empezar → start, de → from, cero → zero; = start from scratch (back to square one).", minimal: "Three words." },
    "la pelota está en tu cancha": { reason: "lexical_expression", split: "la → the, pelota → ball, está → is, en → in, tu → your, cancha → court; the idiom = the ball is in your court.", minimal: "The idiom." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same; = right now.", minimal: "Two words." },
    "lo que sea": { reason: "lexical_expression", split: "lo que → what + sea → may be; = anything.", minimal: "Three words." },
    "se acabó": { reason: "grammatical_fusion", split: "se → itself + acabó → ended; = it's over.", minimal: "Two words." },
    "vuelve a": { reason: "lexical_expression", split: "vuelve → returns + a → to; volver a + verb = do again.", minimal: "Two words." },
    "las dos": { reason: "lexical_expression", split: "las → the + dos → two; the clock time = two (o'clock).", minimal: "Two words." },
    "las doce": { reason: "lexical_expression", split: "las → the + doce → twelve; the clock time = twelve.", minimal: "Two words." },
    "las seis": { reason: "lexical_expression", split: "las → the + seis → six; the clock time = six.", minimal: "Two words." },
    "las siete": { reason: "lexical_expression", split: "las → the + siete → seven; the clock time = seven.", minimal: "Two words." },
    "las ocho": { reason: "lexical_expression", split: "las → the + ocho → eight; the clock time = eight.", minimal: "Two words." },
    "las nueve": { reason: "lexical_expression", split: "las → the + nueve → nine; the clock time = nine.", minimal: "Two words." },
    "las diez": { reason: "lexical_expression", split: "las → the + diez → ten; the clock time = ten.", minimal: "Two words." },
    "lo vemos aparte": { reason: "lexical_expression", split: "lo → it, vemos → we see, aparte → apart; the office phrase = let's take it offline.", minimal: "Three words." },
    "te parece": { reason: "grammatical_fusion", split: "te → to you + parece → seems; = okay with you?", minimal: "Two words." },
    "en forma de": { reason: "lexical_expression", split: "en → in, forma → shape, de → of; = shaped like.", minimal: "Three words." },
    "sobre todo": { reason: "lexical_expression", split: "sobre → over + todo → all; = mostly.", minimal: "Two words." },
    "así que": { reason: "lexical_expression", split: "así → so + que → that; = so (therefore).", minimal: "Two words." },
    "ponerse las pilas": { reason: "lexical_expression", split: "ponerse → put on oneself, las → the, pilas → batteries; the idiom = to step it up.", minimal: "The idiom." },
    "me parece": { reason: "grammatical_fusion", split: "me → to me + parece → it seems; = I think it's.", minimal: "Two words." },
    "horas extra": { reason: "lexical_expression", split: "horas → hours + extra → extra; = overtime.", minimal: "Two words." },
    "lo dejas por hoy": { reason: "lexical_expression", split: "lo → it, dejas → you leave, por → for, hoy → today; the idiom = you call it a day.", minimal: "The idiom." },
    "lo dejo por hoy": { reason: "lexical_expression", split: "lo → it, dejo → I leave, por → for, hoy → today; the idiom = I'll call it a day.", minimal: "The idiom." },
    "dejémoslo por hoy": { reason: "lexical_expression", split: "dejémoslo → let's leave it, por → for, hoy → today; the idiom = let's call it a day.", minimal: "The idiom." },
    "un par de": { reason: "lexical_expression", split: "un → a, par → pair, de → of; = a couple of.", minimal: "Three words." },
    "si no": { reason: "lexical_expression", split: "si → if + no → not; = otherwise.", minimal: "Two words." },
    "a casa": { reason: "lexical_expression", split: "a → to + casa → house; = home.", minimal: "Two words." },
    "con todo": { reason: "lexical_expression", split: "con → with + todo → everything; = full force.", minimal: "Two words." },
    "a qué hora": { reason: "lexical_expression", split: "a → at, qué → what, hora → hour; = what time.", minimal: "Three words." },
    "se van": { reason: "grammatical_fusion", split: "se → themselves + van → go; irse = to leave, go (home).", minimal: "Two words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → not; = not yet.", minimal: "Two words." },
    "sabes qué": { reason: "lexical_expression", split: "sabes → you know + qué → what; = you know what?", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more, o → or, menos → less; = sort of.", minimal: "Three words." },
    "te vas": { reason: "grammatical_fusion", split: "te → yourself + vas → you go; irse = to leave.", minimal: "Two words." },
    "en fin": { reason: "lexical_expression", split: "en → in + fin → end; = anyway.", minimal: "Two words." },
    "quiere decir": { reason: "lexical_expression", split: "quiere → wants + decir → to say is false; = means.", minimal: "Two words." },
    "no se entiende": { reason: "grammatical_fusion", split: "no → not, se → itself, entiende → understands; = you can't understand.", minimal: "Three words." },
    "agarrarle la onda": { reason: "lexical_expression", split: "agarrar → grab, le → to it, la onda → the wave is false; the Mexican idiom = get the hang of it.", minimal: "The idiom." },
    "agarrarle el ritmo": { reason: "lexical_expression", split: "agarrar → grab, le → to it, el ritmo → the rhythm; the idiom = get the hang of it.", minimal: "The idiom." },
    "poco a poco": { reason: "lexical_expression", split: "poco → little + a → to + poco → little; = little by little.", minimal: "Three words." },
    "se hacen": { reason: "grammatical_fusion", split: "Impersonal se: se hacen = are done.", minimal: "Two words." },
    "de siempre": { reason: "lexical_expression", split: "de → of + siempre → always; = the usual.", minimal: "Two words." },
    "no hay": { reason: "grammatical_fusion", split: "no → not + hay → there is; = there isn't.", minimal: "Two words." },
    "te ahogas": { reason: "grammatical_fusion", split: "te → yourself + ahogas → you drown; ahogarse = to drown.", minimal: "Two words." },
    "igual que": { reason: "lexical_expression", split: "igual → same + que → as; = same as.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of; one preposition = before.", minimal: "Two words." },
    "volvemos a": { reason: "lexical_expression", split: "volvemos → we return + a → to; volver a + verb = do again.", minimal: "Two words." },
    "juego de mesa": { reason: "lexical_expression", split: "juego → game, de → of, mesa → table; = board game.", minimal: "Three words." },
    "te toca": { reason: "grammatical_fusion", split: "te → to you + toca → it touches is false; = it's your turn.", minimal: "Two words." },
    "me descubriste": { reason: "grammatical_fusion", split: "me → me + descubriste → you discovered; = you caught me.", minimal: "Two words." },
    "ahora no": { reason: "lexical_expression", split: "ahora → now + no → not; = not now.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = seriously.", minimal: "Two words." },
    "a toda velocidad": { reason: "lexical_expression", split: "a → at, toda → all, velocidad → speed; = at full speed.", minimal: "Three words." },
    "echarle ganas": { reason: "lexical_expression", split: "echar → throw, le → at it, ganas → desire is false; the Mexican idiom = give it your all.", minimal: "The idiom." },
    "dar con todo": { reason: "lexical_expression", split: "dar → give, con → with, todo → everything; the idiom = give it your all.", minimal: "The idiom." },
    "tienen que": { reason: "lexical_expression", split: "tienen → they have + que → that; tener que = have to.", minimal: "Two words." },
    "que aprender": { reason: "lexical_expression", split: "que → that + aprender → to learn; hay mucho que aprender = there's a lot to learn.", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; = a little.", minimal: "Two words." },
    "no me doy abasto": { reason: "lexical_expression", split: "no → not, me → myself, doy → I give, abasto → supply; the idiom = I can't keep up.", minimal: "The idiom." },
    "no puedo": { reason: "grammatical_fusion", split: "no → not + puedo → I can; = I can't.", minimal: "Two words." },
    "no quiero": { reason: "grammatical_fusion", split: "no → not + quiero → I want; = I don't want.", minimal: "Two words." },
    "lo más importante": { reason: "lexical_expression", split: "lo → the, más → most, importante → important; = the most important thing.", minimal: "Three words." },
    "por dónde": { reason: "lexical_expression", split: "por → through + dónde → where; = where (to start).", minimal: "Two words." },
    "me voy a enfocar": { reason: "lexical_expression", split: "me → myself, voy a → I'm going to, enfocar → focus; = I'm going to focus.", minimal: "The verb phrase." },
    "alguien más": { reason: "lexical_expression", split: "alguien → someone + más → more; = someone else.", minimal: "Two words." },
    "cómo que": { reason: "lexical_expression", split: "cómo → how + que → that; the Mexican question = what do you mean…?", minimal: "Two words." },
    "a quién": { reason: "lexical_expression", split: "a → to + quién → who; = (to) whom.", minimal: "Two words." },
    "se encarga": { reason: "grammatical_fusion", split: "se → himself + encarga → entrusts; encargarse de = be in charge of.", minimal: "Two words." },
    "fecha límite": { reason: "lexical_expression", split: "fecha → date + límite → limit; = deadline.", minimal: "Two words." },
    "hasta tarde": { reason: "lexical_expression", split: "hasta → until + tarde → late; = late.", minimal: "Two words." },
    "en la noche": { reason: "lexical_expression", split: "en → in, la → the, noche → night; = at night (tonight with hoy).", minimal: "Three words." },
    "nos vemos": { reason: "grammatical_fusion", split: "nos → each other + vemos → we see; = see you.", minimal: "Two words." },
    "qué tal": { reason: "lexical_expression", split: "qué → what + tal → such; before a suggestion = how about.", minimal: "Two words." },
    "para mí": { reason: "lexical_expression", split: "para → for + mí → me; = for me.", minimal: "Two words." },
    "muy bien": { reason: "lexical_expression", split: "muy → very + bien → well; the exclamation = nice!", minimal: "Two words." },
  },

  mission: [
    // items 1 and 5: not needed for the course report; they leave the list once their moment has passed
    { lt: "Ask what at least one expression means", optional: true, done: (c) => !!c.s.asked, when: (c) => !c.s.goalMet },
    { lt: "Say you already have too much work", done: (c) => !!c.s.overloaded },
    { lt: "Agree on what comes first", done: (c) => !!c.s.prioDone },
    { lt: "Set tomorrow's check-in, or call it a day", done: (c) => !!c.s.closeDone && c.s.closeHow !== "tyler" },
    { lt: "Ask who's in charge of what", optional: true, done: (c) => !!c.s.ownerAsked, when: (c) => !c.s.goalMet && !c.s.ownerDone },
  ],

  steps: [
    { id: "hello", done: (c) => !!c.s.helloDone,
      ask: (c) => {
        if (resumed(c, "hello")) { T(c, "anyway"); T(c, "hello_reask"); return; }
        const n = bump(c, "hello");
        if (n === 1) { T(c, "greet"); T(c, "hello_q"); return; }
        if (n <= 3) { T(c, "hello_reask"); return; }
        c.s.helloDone = true; c.s.hello = "skip"; T(c, "hello_skip"); askNext(c);
      },
      expects: ["finding", "finding_ctx", "overloaded", "truly_ctx"],
      suggest: [{ lt: "Say how your first week is going", hint: "finding" }, { lt: "Ask what an expression means", hint: "idioms" }],
      // "Todo está en chino, ¿no?" – "Sí." (it's hard: "Es normal…") / "No." ("¡Talento natural!")
      yes: (c) => { helloAnswer(c, "hard"); },
      no: (c) => { helloAnswer(c, "no"); },
      help: (c) => { if (!once(c, "hello")) return; c.s.helloDone = true; c.s.hello = "skip"; T(c, "hello_skip"); } },
    { id: "pile", when: (c) => !!c.s.helloDone, done: (c) => !!c.s.pileSaid && (!!c.s.overloaded || !!c.s.pileSkip),
      ask: (c) => {
        if (resumed(c, "pile")) { T(c, "anyway"); T(c, "pile_reask"); return; }
        const n = bump(c, "pile");
        if (n === 1) {
          c.s.pileSaid = true;
          T(c, "pile_intro"); T(c, "pile_list"); T(c, c.s.weightLine ? "pile_weight" : "pile_box");
          if (c.s.overloaded) { T(c, "pile_know"); askNext(c); return; }
          T(c, "pile_q");
          return;
        }
        if (n <= 3) { T(c, "pile_reask"); return; }
        c.s.pileSkip = true; askNext(c);
      },
      expects: ["overloaded", "can_do_all", "refuse_all", "ask_priority", "propose", "cant_task", "what_about"],
      suggest: [{ lt: "Say you already have too much work", hint: "overload", options: ["bugs", "emails"] }, { lt: "Ask what comes first", hint: "priority" },
        { lt: "Ask what an expression means", hint: "idioms" }],
      // "Fácil, ¿no?" – "¡Sí!" (all of it) / "No." (flat)
      yes: (c) => { canDoAll(c); },
      no: (c) => { c.tip(TIPS.blunt_no); refuse(c, false); },
      help: (c) => { if (once(c, "cando")) askTooMuch(c, "q"); } },
    { id: "priorities", when: (c) => !!c.s.pileSaid && (!!c.s.overloaded || !!c.s.pileSkip), done: prioResolved,
      ask: (c) => {
        if (resumed(c, "priorities")) { T(c, "anyway"); T(c, "prio_reask"); return; }
        const n = bump(c, "priorities");
        if (n === 1) {
          // "Bueno… ¿qué sí puedes hacer?" was the question already
          if (c.s.prioPre) { c.s.prioPre = false; return; }
          T(c, c.s.overloaded ? "prio_q" : "prio_q_cool");
          return;
        }
        if (n === 2) { T(c, "prio_reask"); return; }
        if (n === 3) { T(c, "prio_deal"); c.expect(dealPending()); return; }
        c.s.prioSkip = true; T(c, "deal_no"); askNext(c);
      },
      expects: ["propose", "propose_ctx", "cant_task", "ask_priority", "what_about", "refuse_all", "same_page_q"],
      suggest: [{ lt: "Suggest what to do first and what can wait", hint: "propose", options: "task" }, { lt: "Ask what comes first", hint: "priority" }],
      no: (c) => { c.tip(TIPS.blunt_no); refuse(c, false); },
      help: (c) => { if (!once(c, "deal")) return; T(c, "prio_deal"); c.expect(dealPending()); } },
    // Twist: the launch crashes (no mission item).
    { id: "crash", when: (c) => c.s.twist === "crash" && prioResolved(c), done: crashResolved,
      ask: (c) => {
        if (resumed(c, "crash")) { T(c, "anyway"); T(c, "crash_reask"); return; }
        const n = bump(c, "crash");
        if (n === 1) { c.s.crashSaid = true; seenTwist(c, "crash"); T(c, "crash_1"); T(c, "crash_2"); T(c, "crash_3"); return; }
        if (n === 2) { T(c, "crash_reask"); return; }
        if (n === 3) { T(c, "crash_help"); c.expect(crashOkPending()); return; }
        c.s.crashSkip = true; T(c, "crash_skip"); askNext(c);
      },
      expects: ["plan", "crash_what", "crash_who", "ball_back"],
      suggest: [{ lt: "Suggest a plan after the crash", hint: "crash" }, { lt: "Ask what an expression means", hint: "idioms" }],
      help: (c) => { if (!once(c, "crashHelp")) return; T(c, "crash_help"); c.expect(crashOkPending()); } },
    { id: "owner", when: (c) => prioResolved(c) && (c.s.twist !== "crash" || crashResolved(c)), done: (c) => !!c.s.ownerDone,
      ask: (c) => {
        if (resumed(c, "owner")) { T(c, "anyway"); T(c, "owner_reask"); return; }
        const n = bump(c, "owner");
        if (n === 1) { T(c, "owner_ask"); return; }
        if (n <= 4) { T(c, "owner_reask"); return; }
        c.s.ownerDone = true; askNext(c);
      },
      expects: ["ask_owner", "insist", "no_more", "more_q_ctx"],
      suggest: [{ lt: "Ask who's in charge of what", hint: "owner", options: "area" }, { lt: "Say you have no more questions", hint: "g_yesno" }],
      // "¿Algo más?" – "Sí, una pregunta." / "No, es todo." ("Ok, gracias." after an answer is a no)
      yes: (c) => {
        const h = heard(c);
        if (/\bgracias\b/.test(h) || !/\b(si|claro|de hecho|una pregunta|otra pregunta|una cosa|otra cosa|la verdad si)\b/.test(h)) { ownerEnd(c); return; }
        if (once(c, "shoot")) { T(c, "shoot"); c.hold(); }
      },
      no: (c) => { ownerEnd(c); },
      help: (c) => { ownerEnd(c); } },
    // Twist: until midnight (no mission item).
    { id: "midnight", when: (c) => c.s.twist === "midnight" && !!c.s.ownerDone, done: (c) => !!c.s.midDone,
      ask: (c) => {
        if (resumed(c, "midnight")) { T(c, "anyway"); T(c, "mid_reask"); return; }
        const n = bump(c, "midnight");
        if (n === 1) { c.s.midSaid = true; seenTwist(c, "midnight"); T(c, "mid_1"); T(c, "mid_2"); return; }
        if (n <= 3) { T(c, "mid_reask"); return; }
        c.s.midDone = true; c.s.midHow = "tyler"; T(c, "mid_giveup"); askNext(c);
      },
      expects: ["stay_limit", "stay_yes", "stay_whatif", "cant_stay", "cant_ctx", "paid_q", "mid_finish_q", "mid_why", "call_day"],
      suggest: [{ lt: "Negotiate staying until midnight", hint: "midnight" }, { lt: "Ask what an expression means", hint: "idioms" }],
      // "¿Te puedes quedar?" – "Sí." / "No."
      yes: (c) => {
        const h = heard(c);
        if (HEDGE.test(h)) { midResolve(c, "cant"); return; }
        // "Está bien, gracias." / "Ok." to a demand that asked nothing: never a promise to stay (rule 17); the step asks
        if (!/\b(si|claro|me quedo|puedo|por supuesto|cuenta conmigo|sin problema)\b/.test(h)) return;
        midResolve(c, "yes");
      },
      no: (c) => { midResolve(c, "cant"); },
      help: (c) => { if (once(c, "paidq")) { c.s.dealHour = "h9"; T(c, "mid_paid"); c.expect(midDealPending()); } } },
    { id: "tomorrow", when: (c) => !!c.s.ownerDone && (c.s.twist !== "midnight" || !!c.s.midDone), done: (c) => !!c.s.closeDone,
      ask: (c) => {
        if (resumed(c, "tomorrow")) { T(c, "anyway"); T(c, "close_reask"); return; }
        const n = bump(c, "tomorrow");
        if (n === 1) { T(c, "close_q"); return; }
        if (n === 2) { T(c, "close_reask"); return; }
        // Toño fixes the time himself (item 4 not ticked)
        c.s.closeDone = true; c.s.closeHow = "tyler"; c.s.meet = "h8"; T(c, "close_skip"); askNext(c);
      },
      expects: ["meet_time", "meet_time_ctx", "meet_ok", "cant_time", "cant_ctx", "call_day"],
      suggest: [{ lt: "Agree on tomorrow's check-in", hint: "closing" }],
      // "¿Hacemos otro check-in mañana a las ocho?" – "Claro." / "No."
      yes: (c) => { meetOk(c); },
      no: (c) => { if (!closingLive(c) || !once(c, "meet")) return; T(c, "when_q"); c.expect(whenPending()); },
      help: (c) => { if (!closingLive(c) || !once(c, "meet")) return; offer(c, "noon", "when_noon"); } },
  ],

  init: (c) => {
    c.s.asks = {};
    c.s.explained = {};
    c.s.recent = [];
    const seen: string[] = Array.isArray(c.memory.brotecitoTwists) ? c.memory.brotecitoTwists : [];
    if (c.visits >= 1 ? c.chance(0.85) : c.chance(0.35)) {
      const fresh = ["crash", "midnight"].filter((x) => !seen.includes(x));
      c.s.twist = c.pick(fresh.length ? fresh : ["crash", "midnight"]);
    } else c.s.twist = null;
    c.s.weightLine = c.chance(0.35);
  },

  start: () => { /* the hello step greets */ },

  handlers: {
    // --- the first week ---
    finding(c, _slots, seg) {
      // "¿Cómo que todo está en chino?" / "¿En chino?": a question, not an answer
      if (idiomAsked(c)) return;
      if (c.s.helloDone) {
        // "La verdad, estoy un poco perdido" after the pile: that's too much work
        if (seg.tags.includes("hard") && c.s.pileSaid && !c.s.overloaded) overload(c, "said");
        return;
      }
      praiseIdiom(c, seg);
      // "Sí, todo está en chino" is a hard week: "Es normal… ¡Échale ganas!", not "Eres un crack"
      helloAnswer(c, seg.tags.includes("hard") || seg.tags.includes("chino") ? "hard" : seg.tags.includes("learn") ? "learn" : "good");
    },

    finding_ctx(c) { helloAnswer(c, "hard"); },
    truly_ctx(c) { if (c.step === "hello") helloAnswer(c, "hard"); },
    more_q_ctx(c) { if (c.step === "owner" && !c.s.ownerDone && once(c, "shoot")) { T(c, "shoot"); c.hold(); } },
    agree_ctx() { /* answered by the open question (pushback, deal, crash_ok, mid_deal, offer) */ },

    // --- the pile ---
    overloaded(c, _slots, seg) {
      if (idiomAsked(c)) return;
      praiseIdiom(c, seg);
      overload(c, "said");
    },
    can_do_all(c, _slots, seg) {
      // "No es demasiado" / "No, es demasiado" (the comma is lost): never "¡Eso!"; Toño asks which
      if (ambNo(c, seg) && c.s.pileSaid && !c.s.overloaded && !c.s.pileSkip && !HEDGE.test(heard(c)) && once(c, "cando")) {
        c.s.tooMuchAmb = true; once(c, "amb"); askTooMuch(c, "amb"); return;
      }
      canDoAll(c);
    },
    refuse_all(c, _slots, seg) { refuse(c, seg.tags.includes("tip:rude")); },

    // --- priorities ---
    ask_priority(c) { askPriority(c); },
    what_about(c, slots) {
      const tk = first(slots.t);
      if (!tk || !c.s.pileSaid || !once(c, "wa")) return;
      T(c, `wa_${tk}`);
      if (!c.s.prioDone && (c.step === "pile" || c.step === "priorities")) { setPrio(c, tk === "bugs" ? "bugs" : "slides", "asked"); afterPrio(c); }
    },
    propose(c, slots, seg) { proposal(c, slots, seg.tags); },
    cant_task(c, slots, seg) { cantTask(c, slots, seg.tags); },
    propose_ctx(c, slots, seg) {
      // "¿Y los correos?": a question about that task
      const tk = first(slots.a);
      if (tk && (/\?\s*$/.test(c.heard) || /^\W*y\b/i.test(heard(c)))) { startup.handlers.what_about(c, { t: tk }, seg); return; }
      proposal(c, slots, [...seg.tags, "first"]);
    },
    same_page_q(c, _slots, seg) {
      if (!c.s.pileSaid || !once(c, "samePage")) return;
      praiseIdiom(c, seg);
      if (c.s.prioDone) { T(c, "same_page_yes"); return; }
      T(c, "same_page_not_yet"); c.hold();
    },

    // --- idioms ---
    idiom_q(c, slots) { const id = first(slots.id); if (id) explain(c, id); },
    idiom_echo(c, slots) { const id = first(slots.id); if (id) explain(c, id); },
    idiom_plain(c) {
      const id = recentIdiom(c);
      if (!id) { GLOBAL_HANDLERS.g_meaning(c as any, {}); return; }
      // "¿Es una expresión?" – "¡Sí! Perdón." first
      const h = heard(c);
      if (/\b(expresion|frase|dicho|modismo)\b/.test(h) && /^\W*(es|eso)\b/.test(h) && once(c, "yep")) T(c, "yep_idiom");
      explain(c, id);
    },
    idiom_meta(c) { if (once(c, "meta")) T(c, "meta"); },
    // the global "¿Qué significa eso?" / "¿Qué quieres decir?": the idiom Toño just used, or the word asked about
    g_meaning(c, slots) {
      const id = slots?.w ? idiomFromWords(slots.w) : idiomFromWords(c.heard) ?? recentIdiom(c);
      if (id) explain(c, id); else GLOBAL_HANDLERS.g_meaning(c as any, slots);
    },
    g_dont_understand(c, slots) {
      const id = recentIdiom(c);
      if (id && !c.s.explained?.[id]) explain(c, id); else GLOBAL_HANDLERS.g_dont_understand(c as any, slots);
    },

    // --- who owns what ---
    ask_owner(c, slots, seg) { askOwner(c, first(slots.a), seg.tags.includes("deadline") ? "deadline" : seg.tags.includes("money") ? "budget" : undefined); },
    insist(c) {
      if (!c.s.evaded || c.s.answered || !once(c, "owner")) return;
      ownerAnswer(c, c.s.lastArea ?? "general");
    },
    no_more(c) { if (c.step === "owner" && !c.s.ownerDone) ownerEnd(c); },
    who_person(c, slots) { const p = first(slots.p); if (p && once(c, "who")) T(c, `who_${p}`); },

    // --- the crash ---
    plan(c, _slots, seg) {
      if (!crashLive(c)) {
        // outside the crash: "Primero hay que arreglar los errores" = the bug reports first
        if (c.s.pileSaid && !prioResolved(c) && seg.tags.includes("fix")) proposal(c, { a: "bugs" }, ["first"]);
        return;
      }
      praiseIdiom(c, seg);
      if (!once(c, "plan")) return;
      const how = PLAN_TAGS.find((x) => seg.tags.includes(x)) ?? "fix";
      crashFixed(c, how);
    },
    crash_what(c) { if (crashLive(c) && once(c, "crashWhat")) { T(c, "crash_what"); c.hold(); } },
    crash_who(c) { if (crashLive(c) && once(c, "crashWho")) T(c, "crash_who"); },
    ball_back(c, _slots, seg) {
      praiseIdiom(c, seg);
      if ((crashLive(c) || (c.s.pileSaid && !prioResolved(c))) && once(c, "ballBack")) { T(c, "ball_back_react"); c.hold(); }
    },

    // --- midnight ---
    stay_limit(c, slots, seg) {
      if (!midLive(c)) return;
      praiseIdiom(c, seg);
      const h = midHour(slots.time);
      if (h === "midnight") { midResolve(c, "yes"); return; }
      midResolve(c, "limit", h);
    },
    stay_yes(c) {
      if (!midLive(c)) return;
      const h = heard(c);
      // "Me quedo, pero solo hasta las ocho" (the limit decides), "Ni loco me quedo", "No sé si me quedo";
      // "No hay problema, me quedo" is a yes
      if (/\b(pero|solo|nada mas)\b/.test(h) && /\bhasta\b/.test(h)) return;
      const neg = h.replace(/\bno hay (ningun )?problema\b|\bno te preocupes\b/g, "");
      if (HEDGE.test(h) || /\b(no|ni|nunca|jamas)\b/.test(neg)) { midResolve(c, "cant"); return; }
      midResolve(c, "yes");
    },
    cant_stay(c) { if (midLive(c)) midResolve(c, "cant"); },
    cant_ctx(c) {
      if (midLive(c)) { midResolve(c, "cant"); return; }
      if (!closingLive(c) || !once(c, "meet")) return;
      T(c, "when_q"); c.expect(whenPending());
    },
    paid_q(c) { if (!midLive(c) || !once(c, "paidq")) return; c.s.dealHour = "h9"; T(c, "mid_paid"); c.expect(midDealPending()); },
    stay_whatif(c, slots) {
      if (!midLive(c) || !once(c, "paidq")) return;
      const h = midHour(slots.time);
      if (!h || h === "midnight") { T(c, "mid_reask"); c.hold(); return; }
      c.s.dealHour = h;
      T(c, "mid_offer", { time: hourTime(h) }); c.expect(midDealPending());
    },
    mid_finish_q(c) { if (!midLive(c) || !once(c, "paidq")) return; c.s.dealHour = "h9"; T(c, "mid_finish"); c.expect(midDealPending()); },
    mid_why(c) { if (midLive(c) && once(c, "midWhy")) T(c, "mid_why"); },

    // --- tomorrow ---
    meet_time(c, slots, seg) { praiseIdiom(c, seg); meetTime(c, slots.time); },
    meet_time_ctx(c, slots) { meetTime(c, slots.time); },
    meet_ok(c) { meetOk(c); },
    cant_time(c) { if (!closingLive(c) || !once(c, "meet")) return; T(c, "when_q"); c.expect(whenPending()); },
    call_day(c, _slots, seg) { if (idiomAsked(c)) return; praiseIdiom(c, seg); callDay(c); },

    // --- small talk ---
    dog_q(c) { if (once(c, "dog")) T(c, "dog"); },
    slide_q(c) { if (once(c, "slide")) T(c, "slide"); },

    // --- global intents: the step decides what they mean here ---
    g_ok(c) {
      if (pendingOpen(c)) return;
      switch (c.step) {
        case "hello": helloAnswer(c, "good"); return;
        case "pile": canDoAll(c); return;
        case "owner": ownerEnd(c); return;
        case "tomorrow": meetOk(c); return;
      }
    },
    g_thanks(c) {
      if (c.step === "owner" && !c.s.ownerDone && !pendingOpen(c)) { ownerEnd(c); return; }
      if (once(c, "welcome")) c.say("g_welcome");
    },
    g_hello(c) {
      if (c.step === "hello" && !c.s.helloDone) { if (once(c, "hi")) { T(c, "hello_hi"); c.hold(); } return; }
      if (!c.s.hiBack) { c.s.hiBack = true; c.say("g_hello"); }
    },
    g_howareyou_answer(c, slots) {
      if (c.step === "hello" && !c.s.helloDone) {
        if (/\b(y tu|y a ti|tu como estas|y usted|tu que tal)\b/.test(heard(c))) c.say("g_asked_back");
        helloAnswer(c, "good");
        return;
      }
      GLOBAL_HANDLERS.g_howareyou_answer(c as any, slots);
    },
    g_howareyou_bad(c, slots) {
      if (c.step === "hello" && !c.s.helloDone) { helloAnswer(c, "hard"); return; }
      GLOBAL_HANDLERS.g_howareyou_bad(c as any, slots);
    },
    // "No sé" / "No estoy seguro": the step's help, where its question would come (see the end of the file)
    g_dontknow(c) {
      const st = startup.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { closeReply(c); return; }
      // the work is settled: leaving now ends the day (item 4)
      if (c.s.overloaded && c.s.prioDone) {
        c.s.ownerDone = true; c.s.midDone = true; if (!crashResolved(c)) c.s.crashSkip = true;
        c.s.closeDone = true; c.s.closeHow = "bye"; c.s.__finished = true;
        closing(c); closeReply(c);
        return;
      }
      T(c, "bye_early"); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the first week
    { say: "Poco a poco le estoy agarrando la onda", intent: "finding", step: "hello" },
    { say: "Sí, todo está en chino", intent: "finding", step: "hello" },
    { say: "Si, todo esta en chino", intent: "finding", step: "hello" },
    { say: "Hay mucho que aprender", intent: "finding", step: "hello" },
    { say: "Está increíble, pero es mucho", intent: "finding", step: "hello" },
    { say: "¡Me encanta estar aquí!", intent: "finding", step: "hello" },
    { say: "La verdad, estoy un poco perdida", intent: "finding", step: "hello" },
    { say: "Sí, un poco", intent: "finding_ctx", step: "hello" },
    // too much
    { say: "Estoy hasta el cuello con los reportes de errores", intent: "overloaded", step: "pile", slots: { t: "bugs" } },
    { say: "Ya no me doy abasto", intent: "overloaded", step: "pile" },
    { say: "Ya tengo mucho trabajo", intent: "overloaded", step: "pile" },
    { say: "Es demasiado para una semana", intent: "overloaded", step: "pile" },
    { say: "No puedo hacer todo eso", intent: "overloaded", step: "pile" },
    { say: "Estoy muy saturado esta semana", intent: "overloaded", step: "pile" },
    { say: "No quiero hacer las cosas al aventón", intent: "overloaded", step: "pile" },
    { say: "Estoy a tope", intent: "overloaded", step: "pile" },
    { say: "No puedo coger más trabajo", intent: "overloaded", step: "pile" },
    { say: "No sé si puedo con todo eso", intent: "overloaded", step: "pile", not: ["can_do_all"] },
    { say: "Puedo con todo", intent: "can_do_all", step: "pile" },
    { say: "No es demasiado", intent: "can_do_all", step: "pile", not: ["overloaded"] },
    { say: "Eso no es mi trabajo", intent: "refuse_all", step: "pile" },
    { say: "No quiero hacerlo", intent: "refuse_all", step: "pile", not: ["can_do_all"] },
    { say: "No puedo hacer la fiesta", intent: "cant_task", step: "pile", not: ["can_do_all", "propose"] },
    // priorities
    { say: "¿Qué hago primero?", intent: "ask_priority", step: "priorities" },
    { say: "¿Cuál es la prioridad?", intent: "ask_priority", step: "priorities" },
    { say: "¿Qué es lo más importante?", intent: "ask_priority", step: "priorities" },
    { say: "¿Qué puede esperar?", intent: "ask_priority", step: "priorities" },
    { say: "¿Por dónde empiezo?", intent: "ask_priority", step: "priorities" },
    { say: "Entonces, ¿estamos en la misma página?", intent: "same_page_q", step: "priorities" },
    { say: "Puedo hacer la presentación primero, y lo demás la próxima semana", intent: "propose", step: "priorities", slots: { a: "slides" } },
    { say: "Me voy a enfocar en la presentación", intent: "propose", step: "priorities", slots: { a: "slides" } },
    { say: "Empecemos con los reportes de errores", intent: "propose", step: "priorities", slots: { a: "bugs" } },
    { say: "¿La foto para el boletín puede esperar a la próxima semana?", intent: "propose", step: "priorities", slots: { b: "photo" } },
    { say: "¿Alguien más puede hacer la fiesta de lanzamiento?", intent: "propose", step: "priorities", slots: { d: "party" } },
    { say: "¿Tal vez Rodrigo puede hacer la foto?", intent: "propose", step: "priorities", slots: { d: "photo" } },
    { say: "Solo la presentación", intent: "propose_ctx", step: "priorities", slots: { a: "slides" } },
    { say: "La presentación no puede esperar", intent: "none", step: "priorities", not: ["propose"] },
    // idioms
    { say: "Perdón, ¿qué significa ponerse las pilas?", intent: "idiom_q", slots: { id: "pilas" } },
    { say: "¿Cómo que jalar parejo?", intent: "idiom_q", slots: { id: "parejo" } },
    { say: "¿Qué significa check-in?", intent: "idiom_q", slots: { id: "checkin" } },
    { say: "¿Cuál caja?", intent: "idiom_q", slots: { id: "caja" } },
    { say: "¿Es una expresión?", intent: "idiom_plain" },
    { say: "¿Puedes decirlo con otras palabras?", intent: "idiom_plain" },
    { say: "¿Manos a la obra?", intent: "idiom_echo", slots: { id: "manos" } },
    // who owns what
    { say: "¿A quién le pregunto sobre el presupuesto?", intent: "ask_owner", step: "owner", slots: { a: "budget" } },
    { say: "¿Quién se encarga de la fiesta de lanzamiento?", intent: "ask_owner", step: "owner", slots: { a: "party" } },
    { say: "¿Cuál es la fecha límite?", intent: "ask_owner", step: "owner" },
    { say: "Perdón, pero necesito saberlo ya", intent: "insist", step: "owner" },
    { say: "No tengo más preguntas", intent: "no_more", step: "owner" },
    { say: "¿Quién es Rodrigo?", intent: "who_person", slots: { p: "rodrigo" } },
    // the crash
    { say: "Primero hay que arreglar el error", intent: "plan", step: "crash" },
    { say: "Hay que avisarles a los clientes", intent: "plan", step: "crash" },
    { say: "Hay que llamar a Memo", intent: "plan", step: "crash" },
    { say: "Hay que lanzar la próxima semana", intent: "plan", step: "crash" },
    { say: "¿Qué quieres que haga exactamente?", intent: "crash_what", step: "crash" },
    { say: "¿Quién lo hizo al aventón?", intent: "crash_who", step: "crash" },
    { say: "No hay que avisarles a los clientes", intent: "none", step: "crash", not: ["plan"] },
    // midnight
    { say: "Puedo quedarme hasta las siete, pero luego lo dejo por hoy", intent: "stay_limit", step: "midnight" },
    { say: "¿Las horas extra son pagadas?", intent: "paid_q", step: "midnight" },
    { say: "¿Pagáis las horas extra?", intent: "paid_q", step: "midnight" },
    { say: "Perdón, hoy no puedo quedarme hasta tarde", intent: "cant_stay", step: "midnight", not: ["stay_yes", "stay_limit"] },
    { say: "No sé si puedo quedarme", intent: "cant_stay", step: "midnight", not: ["stay_yes"] },
    { say: "Tengo planes hoy en la noche", intent: "cant_stay", step: "midnight" },
    { say: "¿A qué hora terminamos?", intent: "mid_finish_q", step: "midnight" },
    { say: "Sí, me quedo", intent: "stay_yes", step: "midnight" },
    { say: "¿Y si me quedo hasta las nueve?", intent: "stay_whatif", step: "midnight", not: ["stay_yes", "stay_limit"] },
    { say: "Me quedo, pero solo hasta las ocho", intent: "stay_limit", step: "midnight", not: ["stay_yes"] },
    { say: "No puedo quedarme hasta la medianoche, pero hasta las ocho sí", intent: "stay_limit", step: "midnight", not: ["stay_yes"] },
    { say: "Ni loco me quedo", intent: "cant_stay", step: "midnight", not: ["stay_yes"] },
    // tomorrow
    { say: "Claro, nos vemos a las ocho", intent: "meet_time", step: "tomorrow" },
    { say: "¿Podemos hacerlo a las diez?", intent: "meet_time", step: "tomorrow" },
    { say: "¿Qué tal al mediodía?", intent: "meet_time", step: "tomorrow" },
    { say: "Las ocho es un poco temprano para mí", intent: "cant_time", step: "tomorrow" },
    { say: "A las ocho no puedo", intent: "cant_time", step: "tomorrow", not: ["meet_time"] },
    { say: "No a las ocho, a las nueve", intent: "meet_time", step: "tomorrow", slots: { time: { h: 9 } } },
    { say: "No puedo a las ocho, ¿a las diez?", intent: "meet_time", step: "tomorrow", slots: { time: { h: 10 } } },
    { say: "¡Dejémoslo por hoy!", intent: "call_day", step: "tomorrow" },
    { say: "Vale, nos vemos mañana", intent: "meet_ok", step: "tomorrow" },
    // small talk; never understood
    { say: "¿Es tu perro?", intent: "dog_q" },
    { say: "¿Puedo usar la resbaladilla?", intent: "slide_q" },
    { say: "Mi gato come pizza los martes", intent: "none", step: "pile" },
    { say: "El cielo es azul", intent: "none", step: "priorities" },
    { say: "¿Dónde está la playa?", intent: "none", step: "owner" },
    // review (4 Nov 2026): lost commas, corrections, natural phrasing
    { say: "No es demasiado, puedo hacerlo todo", intent: "can_do_all", step: "pile", not: ["overloaded"] },
    { say: "No es fácil", intent: "overloaded", step: "pile", not: ["can_do_all"] },
    { say: "Ya tengo un montón de trabajo con los reportes de errores", intent: "overloaded", step: "pile", slots: { t: "bugs" } },
    { say: "Puedo hacer la presentación, pero no lo demás", intent: "propose", step: "pile", slots: { a: "slides" } },
    { say: "No quiero hacer la fiesta", intent: "cant_task", step: "priorities", not: ["propose"] },
    { say: "No la fiesta, la presentación primero", intent: "propose", step: "priorities", slots: { a: "slides" } },
    { say: "La presentación no, primero los reportes de errores", intent: "propose", step: "priorities", slots: { a: "bugs" } },
    { say: "¿La fiesta puede esperar hasta la semana que viene?", intent: "propose", step: "priorities", slots: { b: "party" } },
    { say: "¿Quién hizo las cosas al aventón?", intent: "crash_who", step: "crash" },
    { say: "Lo siento, hoy no me puedo quedar tarde", intent: "cant_stay", step: "midnight", not: ["stay_yes"] },
    { say: "No hay problema, me quedo hasta tarde", intent: "stay_yes", step: "midnight", not: ["cant_stay"] },
    { say: "Prefiero irme a las ocho", intent: "stay_limit", step: "midnight", not: ["stay_yes"] },
    { say: "Bueno, pero solo si me pagan", intent: "paid_q", step: "midnight", not: ["stay_yes"] },
    { say: "A las ocho no puedo, ¿a las diez?", intent: "meet_time", step: "tomorrow", slots: { time: { h: 10 } }, not: ["meet_ok", "meet_time_ctx"] },
    { say: "¿Podemos a las seis?", intent: "meet_time", step: "tomorrow" },
    { say: "Ya estuvo por hoy, ¿no?", intent: "call_day", step: "tomorrow" },
  ],

  sims: [
    // the song's way, start to finish (no twist)
    { name: "happy path: the song's idioms", turns: ["¡Hola, Toño! Le estoy agarrando la onda.", "Estoy hasta el cuello con los reportes de errores.",
      "Puedo hacer la presentación primero, y lo demás la próxima semana.", "No, nada más, gracias.", "¿Podemos hacerlo al mediodía?", "¡Nos vemos mañana!"],
      expect: { complete: true, state: { overloaded: true, prioDone: true, closeDone: true, meet: "noon", idiomPraised: true } }, auto: AUTO, setup: PLAIN },
    // idiom questions, "¡Claro!" first and then a change of mind, asking for the priority, the evasion and asking again, moving the time
    { name: "idioms and changes of mind", turns: ["¡Hola! ¿Qué significa check-in?", "Ah, ok. Sí, todo está en chino.", "Perdón, ¿qué significa pensar fuera de la caja?",
      "Claro, sin problema.", "Bueno, sí. Ya tengo mucho trabajo.", "¿Qué hago primero?", "¿Quién se encarga de la fiesta de lanzamiento?",
      "Perdón, pero necesito saberlo ya.", "No, es todo.", "Las ocho es un poco temprano para mí.", "¿Qué tal a las diez?", "¡Adiós!"],
      expect: { complete: true, state: { asked: true, ownerAsked: true, evaded: true, answered: true, meet: "h10", prioBy: "asked" } }, auto: AUTO, setup: PLAIN },
    // the crash on every seed: a plan, an idiom asked about in the middle
    { name: "twist: the launch crash", turns: ["¡Hola! Me encanta, pero hay mucho que aprender.", "Ya no me doy abasto con los correos de clientes.",
      "¿La foto para el boletín puede esperar a la próxima semana?", "¿Qué significa empezar de cero?", "Primero hay que arreglar el error y luego avisarles a los clientes.",
      "No, nada más.", "Claro, nos vemos a las ocho.", "¡Gracias, Toño!"],
      expect: { complete: true, state: { crashDone: true, crashHow: "fix", meet: "h8" } }, auto: AUTO, setup: (s) => { s.twist = "crash"; s.weightLine = false; } },
    // the midnight request on every seed: a flat "No." first (tip), the evasion taken, then paid overtime and a finish time
    { name: "twist: until midnight", turns: ["¡Hola! La verdad, estoy un poco perdido.", "No.", "Puedo hacer la presentación, pero no la fiesta.", "¿A quién le pregunto sobre el presupuesto?",
      "Ok, gracias.", "¿Las horas extra son pagadas?", "Mmm, puedo quedarme hasta las siete, pero luego lo dejo por hoy.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { midDone: true, midHow: "limit", stayUntil: "h7", flatNo: true, evaded: true } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // rude first, then better; "¿Es una expresión?"; can't stay late (never agrees to stay)
    { name: "blunt, then better; can't stay late", turns: ["Hola.", "Bien, gracias.", "Eso no es mi trabajo.", "Ok, perdón. ¿Alguien más puede hacer la fiesta de lanzamiento?",
      "¿Es una expresión?", "No.", "Perdón, hoy no puedo quedarme hasta tarde.", "¿Podemos hacerlo a las diez?", "¡Adiós!"],
      expect: { complete: true, state: { midHow: "cant", meet: "h10", asked: true } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // the party first: Toño pushes back once and gives in; "¿Quién lo hizo al aventón?"; "No sé" during the crash; the evasion twice
    { name: "pushback, the crash, I don't know", turns: ["¡Hola! Bien, gracias.", "Estoy hasta el cuello con los reportes de errores y los correos de clientes.",
      "Creo que la fiesta de lanzamiento es más importante.", "No, mejor la fiesta primero.", "¿Quién lo hizo al aventón?", "No sé.", "Sí.",
      "¿Quién se encarga del código?", "¿Quién se encarga del código?", "Gracias, es todo.", "Mejor al mediodía... o a la una.", "¡Adiós!"],
      expect: { complete: true, state: { first: "party", crashHow: "tyler", answered: true, meet: "noon" } }, auto: AUTO, setup: (s) => { s.twist = "crash"; s.weightLine = false; } },
    // calling it a day as soon as the work is settled: the goal is met
    { name: "calling it a day early", turns: ["Le estoy agarrando la onda.", "La verdad, estoy hasta el cuello.", "¿Cuál es la prioridad?", "¡Dejémoslo por hoy!"],
      expect: { complete: true, state: { closeHow: "day" } }, auto: AUTO, setup: PLAIN },
    // "No sé" twice: Toño proposes the plan ("¿Trato hecho?") and the time ("¿Qué tal al mediodía?")
    { name: "Toño decides: deal and noon", turns: ["¡Hola! Es mucho.", "No sé.", "Trato hecho.", "Nada más, gracias.", "Perdón, a las ocho no puedo.",
      "No sé.", "Claro, al mediodía está bien.", "¡Gracias, adiós!"],
      expect: { complete: true, state: { prioBy: "deal", meet: "noon", hello: "over" } }, auto: AUTO, setup: PLAIN },
    // hedges are too much (never "¡Eso!"), delegating isn't doing the party first, "No sé si puedo quedarme" never agrees to stay
    { name: "hedges and delegation", turns: ["¡Hola! Bien, gracias.", "No sé si puedo con todo eso.", "Beto podría hacer la fiesta.", "No, es todo.",
      "No sé si puedo quedarme.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { overHow: "said", first: "slides", pushed: undefined, midHow: "cant", meet: "h8" } }, auto: AUTO,
      setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // idiom questions are questions (explained, not praised, not taken as answers); the deck can't slip without a push back;
    // natural ways to move the check-in
    { name: "idiom questions, the deck can't wait", turns: ["¿Cómo que todo está en chino?", "¡Ah! Hay mucho que aprender.", "No tengo tiempo.",
      "La presentación puede esperar.", "Bueno, primero la presentación.", "Nada más, gracias.", "¿Dejarlo por hoy?", "A las ocho no me funciona.",
      "A las nueve me funciona mejor.", "¡Adiós!"],
      expect: { complete: true, state: { asked: true, idiomPraised: undefined, hello: "learn", first: "slides", pushed: "other", meet: "h9" } }, auto: AUTO, setup: PLAIN },
    // "No." to Toño's deal, then a bare hour to "¿A qué hora te funciona?"; a bare "No puedo." to the check-in
    { name: "midnight: no deal, then seven", turns: ["¡Hola! Me está yendo bien.", "Estoy hasta el cuello con los reportes de errores.",
      "Me voy a enfocar en los reportes de errores primero.", "No, nada más.", "¿Ponerse las pilas?", "¿Las horas extra son pagadas?", "No.", "Hasta las siete.",
      "No puedo.", "¿Qué tal a las diez?", "¡Adiós!"],
      expect: { complete: true, state: { first: "bugs", midHow: "limit", stayUntil: "h7", meet: "h10" } }, auto: AUTO,
      setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // rule 17: a polite "Está bien, gracias." never promises to stay; a what-if gets the deal asked; Beto named
    { name: "midnight: polite, then a what-if", turns: ["¡Hola! Bien, gracias.", "Estoy hasta el cuello.", "Beto puede hacer la foto.", "No, nada más.",
      "Está bien, gracias.", "¿Y si me quedo hasta las nueve?", "Trato hecho.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { midHow: "paid", stayUntil: "h9", meet: "h8" } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // no overload ("¡Eres un crack!"), then walking away: not done
    { name: "can do it all, then leaving: not done", turns: ["¡Hola, Toño!", "Me está yendo bien.", "Claro, sin problema.", "No, no es demasiado.", "Perdón, me tengo que ir."],
      expect: { complete: false, state: { pileSkip: true, overloaded: undefined } }, auto: AUTO, setup: PLAIN },
    // the comma is lost: "No puedo con todo" at "¿Es demasiado?" is asked again; then it's too much
    { name: "no puedo con todo: asked again", turns: ["¡Hola! Bien, gracias.", "¡Claro!", "No puedo con todo.", "Sí, es demasiado.", "¿Qué hago primero?",
      "No, nada más.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { overloaded: true, overHow: "yes", prioBy: "asked", meet: "h8" } }, auto: AUTO, setup: PLAIN },
    // review: "Sí" to "Todo está en chino, ¿no?" is a hard week; "No, es demasiado" is asked again (never "¡Eres un crack!");
    // "A las ocho no puedo, ¿a las diez?" moves the check-in to ten
    { name: "lost commas: too much, eight", turns: ["Sí.", "¡Claro!", "No, es demasiado.", "Sí, es demasiado.", "¿Qué hago primero?", "No, nada más.",
      "A las ocho no puedo, ¿a las diez?", "¡Adiós!"],
      expect: { complete: true, state: { hello: "hard", overloaded: true, pileSkip: undefined, meet: "h10" } }, auto: AUTO, setup: PLAIN },
    // review: "No hay problema" is a yes; "hasta las doce" tonight is midnight, never noon
    { name: "midnight: no hay problema, until twelve", turns: ["¡Hola! Bien, gracias.", "Estoy hasta el cuello.", "¿Qué hago primero?", "No, nada más.",
      "No hay problema, me quedo hasta las doce.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { midHow: "yes", stayUntil: undefined, meet: "h8" } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // review: "No, no puedo hasta las nueve" to the nine o'clock deal asks for a time
    { name: "midnight: not until nine", turns: ["¡Hola! Bien, gracias.", "Estoy hasta el cuello.", "¿Qué hago primero?", "No, nada más.",
      "Bueno, pero solo si me pagan.", "No, no puedo hasta las nueve.", "Hasta las siete.", "Claro, nos vemos a las ocho."],
      expect: { complete: true, state: { midHow: "limit", stayUntil: "h7", meet: "h8" } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = startup.tips as Record<string, Tip>;
const PERSON = /\b(rodrigo|beto|memo|raquel|alguien|otra persona|otro|el practicante|un practicante|el becario|la becaria)\b/;
const SELF = /\b(yo|puedo|voy|me voy|empiezo|empecemos|hago|hagamos|vamos|podemos|prefiero|me enfoco|empezamos)\b/;
const PLAN_TAGS = ["fix", "tell", "ben", "later", "rollback"];

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = startup.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** The learner used one of the idioms: Toño notices (once a conversation). */
function praiseIdiom(c: Ctx, seg: { tags: string[] }) {
  if (!seg.tags.includes("idiom") || c.s.idiomPraised) return;
  c.s.idiomPraised = true;
  T(c, "idiom_back");
}

/** "¿Cómo que todo está en chino?", "¿Dejarlo por hoy?": the learner asks about Toño's idiom (a meaning question, or
 *  the idiom echoed with a "?") instead of answering with it. Toño explains it; the answer doesn't count and isn't
 *  praised. A real question with the idiom ("¿Lo dejamos por hoy?", "…, ¿verdad?") still counts. */
function idiomAsked(c: Ctx): boolean {
  const raw = c.heard || "";
  const h = fold(raw);
  const segs: Segment[] = (c as any).conv?.out?.parse?.segments ?? [];
  const meaning = /\b(significa|quiere decir|quieres decir|te refieres|como que)\b/.test(h) || segs.some((x) => ["g_meaning", "g_dont_understand", "idiom_q", "idiom_plain"].includes(x.intent));
  const echo = /\?\s*$/.test(raw) && !/\b(verdad|no|cierto|si)\W*$/.test(h)
    && !/\b(podemos|podriamos|puedo|vamos|dejamos|dejemos|dejemoslo|lo dejamos|que tal|y si|por que no|hacemos|hagamos|nos vemos)\b/.test(h);
  if (!meaning && !echo) return false;
  const id = idiomFromWords(h);
  if (!id) return false;
  explain(c, id);
  return true;
}

/** A twist is remembered as soon as the learner has seen it (the next visit prefers the other one). */
function seenTwist(c: Ctx, id: string) {
  c.twist(id);
  const seen: string[] = Array.isArray(c.memory.brotecitoTwists) ? c.memory.brotecitoTwists : [];
  if (!seen.includes(id)) c.remember({ brotecitoTwists: [...seen, id] });
}

/** The idiom to explain for "¿Qué significa eso?": the last one Toño used and hasn't explained yet. */
function recentIdiom(c: Ctx): string | undefined {
  const r: string[] = c.s.recent ?? [];
  for (let i = r.length - 1; i >= 0; i--) if (!c.s.explained?.[r[i]]) return r[i];
  return r[r.length - 1];
}

/** Toño explains an idiom in plain Spanish (item 1); the question he was asking comes back short. */
function explain(c: Ctx, id: string) {
  c.s.asked = true;
  if (!once(c, "explain:" + id)) return;
  c.s.explained ||= {};
  c.s.explained[id] = (c.s.explained[id] ?? 0) + 1;
  T(c, `mean_${id}`);
  if (c.step) AFTER.set(c, c.step);
}

/** The answer to "¿Cómo vas con tu primera semana?". */
function helloAnswer(c: Ctx, kind: "learn" | "good" | "hard" | "no") {
  if (c.s.helloDone || !once(c, "hello")) return;
  c.s.helloDone = true; c.s.hello = kind;
  T(c, `hello_${kind}`);
}

/** "Estoy hasta el cuello" (item 2). At the hello it comes before the pile ("Uf. Bueno… te tengo una noticia."). */
function overload(c: Ctx, how: string) {
  if (c.s.overloaded || !once(c, "over")) return;
  c.s.overloaded = true; c.s.overHow = how;
  if (!c.s.helloDone) { c.s.helloDone = true; c.s.hello = "over"; T(c, "hello_over"); return; }
  T(c, "over_react");
}

/** "¡Claro, sin problema!" to the pile: Toño double-checks ("¿Es demasiado?"). */
function canDoAll(c: Ctx) {
  if (HEDGE.test(heard(c))) { overload(c, "said"); return; }
  if (!c.s.pileSaid || c.s.overloaded || c.s.pileSkip || !once(c, "cando")) return;
  T(c, "pile_yes");
  askTooMuch(c, "q");
}
function askTooMuch(c: Ctx, kind: "q" | "honest" | "amb") {
  T(c, kind === "q" ? "too_much_q" : kind === "honest" ? "too_much_honest" : "too_much_amb");
  c.expect({
    id: "too_much", expects: ["overloaded", "can_do_all", "truly_ctx"], hints: ["overload"],
    suggest: [{ lt: "Say you already have too much work", hint: "overload", options: ["bugs", "emails"] }],
    yes: (cc) => { overload(cc, "yes"); },
    no: (cc) => { notTooMuch(cc); },
    on: {
      overloaded: (cc, _s, seg) => {
        // "No puedo con todo" (or "No, puedo con todo"?): asked again once
        if (seg.tags.includes("amb") && !cc.s.tooMuchAmb) { cc.s.tooMuchAmb = true; if (once(cc, "amb")) askTooMuch(cc, "amb"); return; }
        praiseIdiom(cc, seg); overload(cc, cc.s.tooMuchAmb ? "yes" : "said");
      },
      can_do_all: (cc, _s, seg) => {
        if (HEDGE.test(heard(cc))) { overload(cc, "said"); return; }
        // "No es demasiado" (or "No, es demasiado"?): asked again once
        if (ambNo(cc, seg) && !cc.s.tooMuchAmb) { cc.s.tooMuchAmb = true; if (once(cc, "amb")) askTooMuch(cc, "amb"); return; }
        notTooMuch(cc);
      },
      refuse_all: (cc, _s, seg) => { refuse(cc, seg.tags.includes("tip:rude")); },
      finding_ctx: (cc) => { overload(cc, "yes"); },
      truly_ctx: (cc) => { overload(cc, "yes"); },
    },
    ask: (cc) => { T(cc, "too_much_reask"); },
  });
}
/** "No es demasiado" could be "No, es demasiado"; "No, no es demasiado" can't. */
function ambNo(c: Ctx, seg: { tags: string[] }): boolean {
  return seg.tags.includes("amb") && !/^\W*no\W+no (es|son)\b/.test(heard(c));
}
function notTooMuch(c: Ctx) {
  if (c.s.overloaded || !once(c, "notTooMuch")) return;
  c.s.pileSkip = true;
  T(c, "rockstar");
}

/** A flat "No." or "Eso no es mi trabajo": counts as saying it's too much (with a tip), and Toño asks what the learner
 *  can do. The second refusal gets his own proposal ("Primero la presentación… ¿Trato hecho?"). */
function refuse(c: Ctx, rude: boolean) {
  if (!c.s.pileSaid || prioResolved(c) || !once(c, "refuse")) return;
  c.s.refused = (c.s.refused ?? 0) + 1;
  if (c.s.refused >= 2 || c.step === "priorities") { if (once(c, "deal")) { T(c, "prio_deal"); c.expect(dealPending()); } return; }
  c.s.flatNo = true;
  if (!c.s.overloaded) { c.s.overloaded = true; c.s.overHow = rude ? "rude" : "no"; }
  c.s.prioPre = true;
  T(c, rude ? "rude_react" : "flat_no_react");
}

function setPrio(c: Ctx, firstTask: string, by: string) { c.s.prioDone = true; c.s.first = firstTask; c.s.prioBy = by; }
/** Priorities settled before the learner said it's too much: Toño asks honestly. */
function afterPrio(c: Ctx) { if (!c.s.overloaded && !c.s.pileSkip) askTooMuch(c, "honest"); }

/** "¿Qué hago primero?": Toño answers (item 3). */
function askPriority(c: Ctx) {
  if (!c.s.pileSaid) return;
  if (c.s.prioDone) { if (once(c, "prioAgain")) T(c, "prio_already"); return; }
  if (!once(c, "prio")) return;
  T(c, "prio_answer");
  setPrio(c, "slides", "asked");
  afterPrio(c);
}

/** The learner's own plan (item 3): what first (a), what later (b), whom to give a task (d). */
function proposal(c: Ctx, slots: Record<string, any>, tags: string[]) {
  if (!c.s.pileSaid) return;
  praiseIdiom(c, { tags });
  if (tags.includes("hire")) { if (once(c, "hire")) T(c, "hire_react"); return; }
  let a = first(slots.a), d = first(slots.d);
  const b = list(slots.b);
  const h = heard(c);
  // "Beto va primero con la fiesta": a task given to someone else is never the learner's own "first"
  if (a && !d && PERSON.test(h) && !SELF.test(h)) { d = a; a = undefined; }
  if (c.s.prioDone) {
    // "Puedo hacer la presentación, pero Beto podría hacer la fiesta": the second half of the plan just made
    if (SAID.get(c)?.has("propose")) { if (d && once(c, "deleg")) T(c, delegLine(h)); return; }
    if (once(c, "prioAgain")) T(c, "prio_already");
    return;
  }
  if (!once(c, "propose")) return;
  // the investor deck would slip (the party or the photo first, the deck later, "lo demás la próxima semana"):
  // one gentle push back
  const slip = a !== "slides" && (a === "party" || a === "photo" || b.includes("slides") || (!!a && tags.includes("rest")));
  if (slip) {
    if (!c.s.pushed) { c.s.pushed = a ?? "other"; T(c, "pushback"); c.expect(pushPending()); return; }
    T(c, "push_no"); setPrio(c, a ?? c.s.pushed, "learner"); afterPrio(c); return;
  }
  if (d && once(c, "deleg")) T(c, delegLine(h));
  // the bug reports or the emails first: the deck still comes by Friday
  if (a && a !== "slides") T(c, "prio_ok_then", { X: tv(a) });
  else if (a) T(c, "prio_ok", { X: tv(a) });
  else if (b.length && !d) { T(c, "prio_wait", { X: tv(b[0]) }); T(c, "prio_ok_generic"); }
  else T(c, "prio_ok_generic");
  setPrio(c, a ?? "slides", "learner");
  afterPrio(c);
}

/** Who gets the task: Rodrigo (a joke), someone named, or "alguien más". */
const delegLine = (h: string) => (/\brodrigo\b/.test(h) ? "deleg_brad" : /\b(beto|memo|raquel)\b/.test(h) ? "deleg_named" : "deleg_other");

/** "No puedo hacer la fiesta (ni la foto)": those tasks wait (the deck: Toño pushes back). */
function cantTask(c: Ctx, slots: Record<string, any>, tags: string[]) {
  proposal(c, { b: [...list(slots.b), ...list(slots.b2)] }, [...tags, "later"]);
}

function pushPending(): Pending {
  const slidesFirst = (c: Ctx) => { if (!once(c, "push")) return; T(c, "prio_ok", { X: tv("slides") }); setPrio(c, "slides", "learner"); afterPrio(c); };
  return {
    id: "pushback", expects: ["propose", "propose_ctx", "cant_task", "ask_priority", "agree_ctx"], hints: ["propose"],
    suggest: [{ lt: "Agree, or keep your own plan", hint: "propose", options: "task" }],
    yes: slidesFirst,
    no: (c) => { if (!once(c, "push")) return; T(c, "push_no"); setPrio(c, c.s.pushed, "learner"); afterPrio(c); },
    on: {
      propose: (c, s, seg) => { proposal(c, s, seg.tags); },
      propose_ctx: (c, s, seg) => { proposal(c, s, [...seg.tags, "first"]); },
      cant_task: (c, s, seg) => { cantTask(c, s, seg.tags); },
      g_ok: slidesFirst, agree_ctx: slidesFirst,
    },
    ask: (c) => { T(c, "push_reask"); },
  };
}

/** Toño's own plan ("Primero la presentación, y todo lo demás, la próxima semana. ¿Trato hecho?"). */
function dealPending(): Pending {
  const yes = (c: Ctx) => { if (!once(c, "dealAns")) return; T(c, "deal_yes"); setPrio(c, "slides", "deal"); afterPrio(c); };
  return {
    id: "deal", expects: ["propose", "propose_ctx", "cant_task", "ask_priority", "agree_ctx"], hints: ["propose"],
    suggest: [{ lt: "Agree to the plan, or suggest your own", hint: "propose", options: "task" }],
    yes,
    no: (c) => { if (!once(c, "dealAns")) return; c.s.prioSkip = true; T(c, "deal_no"); },
    on: {
      propose: (c, s, seg) => { proposal(c, s, seg.tags); },
      propose_ctx: (c, s, seg) => { proposal(c, s, [...seg.tags, "first"]); },
      cant_task: (c, s, seg) => { cantTask(c, s, seg.tags); },
      ask_priority: (c) => { askPriority(c); },
      g_ok: yes, agree_ctx: yes,
    },
    ask: (c) => { T(c, "deal_reask"); },
  };
}

/** The crash is handled: a plan (the learner's, or Toño's after "No sé"). */
function crashFixed(c: Ctx, how: string) {
  if (crashResolved(c)) return;
  c.s.crashDone = true; c.s.crashHow = how;
  T(c, `crash_${how === "tyler" ? "fix" : how}`);
  T(c, "crash_end");
}
function crashOkPending(): Pending {
  const yes = (c: Ctx) => { if (once(c, "crashOk")) crashFixed(c, "tyler"); };
  return {
    id: "crash_ok", expects: ["plan", "agree_ctx"], hints: ["crash"],
    suggest: [{ lt: "Agree, or suggest your own plan", hint: "crash" }],
    yes,
    no: (c) => { if (once(c, "crashOk")) { T(c, "crash_what"); c.hold(); } },
    on: {
      plan: (c, _s, seg) => { if (!once(c, "plan")) return; praiseIdiom(c, seg); crashFixed(c, PLAN_TAGS.find((x) => seg.tags.includes(x)) ?? "fix"); },
      g_ok: yes, agree_ctx: yes,
    },
    ask: (c) => { T(c, "crash_ok_reask"); },
  };
}

/** "¿A quién le pregunto sobre el presupuesto?" (item 5): the first question gets "Eso lo vemos aparte". */
function askOwner(c: Ctx, area: string | undefined, kind: string | undefined) {
  c.s.ownerAsked = true;
  if (!once(c, "owner")) return;
  const key = kind ?? area ?? "general";
  if (!c.s.evaded) { c.s.evaded = true; c.s.lastArea = key; T(c, "owner_evasive"); return; }
  ownerAnswer(c, key);
}
const OWNER_LINE: Record<string, string> = {
  deadline: "owner_slides", slides: "owner_slides_you", budget: "owner_budget", payroll: "owner_payroll", party: "owner_party",
  photo: "owner_newsletter", code: "owner_code", bugs: "owner_code", emails: "owner_emails", general: "owner_general",
};
function ownerAnswer(c: Ctx, key: string) { c.s.answered = true; T(c, OWNER_LINE[key] ?? "owner_general"); }
function ownerEnd(c: Ctx) { if (c.s.ownerDone || !once(c, "ownerEnd")) return; c.s.ownerDone = true; }

/** The midnight request settled. `h`: the hour the learner stays until. */
function midResolve(c: Ctx, how: "limit" | "yes" | "cant" | "paid", h?: string) {
  if (c.s.midDone || !once(c, "mid")) return;
  c.s.midDone = true; c.s.midHow = how;
  if (how === "limit") { if (h) { c.s.stayUntil = h; T(c, "mid_limit", { time: hourTime(h) }); } else T(c, "mid_limit_generic"); return; }
  if (how === "paid") c.s.stayUntil = c.s.dealHour ?? "h9";
  T(c, how === "yes" ? "mid_yes" : how === "cant" ? "mid_cant" : "mid_deal_yes");
}
function midDealPending(): Pending {
  return {
    id: "mid_deal", expects: ["stay_limit", "cant_stay", "cant_ctx", "stay_yes", "agree_ctx", "stay_whatif"], hints: ["midnight"],
    suggest: [{ lt: "Agree, or suggest your own time", hint: "midnight" }],
    yes: (c) => { midResolve(c, "paid"); },
    no: midWhen,
    on: {
      // "Sí, pero no hasta la medianoche" to the offered hour: that hour
      stay_limit: (c, s) => { const h = midHour(s.time); if (h === "midnight" || (!h && /^\W*(si|claro|ok|va|sale)\b/.test(heard(c)))) midResolve(c, "paid"); else midResolve(c, "limit", h); },
      // "No puedo hasta las nueve" (the hour he offered): "¿A qué hora te funciona?"
      cant_stay: (c, s) => { const h = midHour(s.time); if (h && h !== "midnight") midWhen(c); else midResolve(c, "cant"); },
      cant_ctx: (c) => { midResolve(c, "cant"); },
      cant_time: midWhen,
      stay_yes: (c) => { if (HEDGE.test(heard(c))) midWhen(c); else midResolve(c, "paid"); },
      call_day: (c) => { if (idiomAsked(c)) return false; midResolve(c, "cant"); },
      g_ok: (c) => { midResolve(c, "paid"); },
      agree_ctx: (c) => { midResolve(c, "paid"); },
      stay_whatif: (c, s) => { const h = midHour(s.time); if (h && h !== "midnight") { c.s.dealHour = h; T(c, "mid_offer", { time: hourTime(h) }); c.expect(midDealPending()); } },
    },
    ask: (c) => { T(c, "mid_deal_reask"); },
  };
}
/** "A las nueve, pagadas. ¿Trato hecho?" – "No." / "No me funciona.": "Bueno. ¿A qué hora te funciona?" waits for an hour. */
function midWhen(c: Ctx) {
  if (!once(c, "midNo")) return;
  T(c, "mid_when");
  const limit = (cc: Ctx, s: any) => { const h = midHour(s.time); if (h === "midnight") midResolve(cc, "paid"); else midResolve(cc, "limit", h); };
  c.expect({
    id: "mid_when", expects: ["stay_limit", "meet_time", "meet_time_ctx", "cant_stay", "cant_ctx", "stay_whatif"], hints: ["midnight"],
    suggest: [{ lt: "Suggest your own time", hint: "midnight" }],
    on: {
      stay_limit: limit, meet_time: limit, meet_time_ctx: limit, stay_whatif: limit,
      cant_stay: (cc) => { midResolve(cc, "cant"); }, cant_ctx: (cc) => { midResolve(cc, "cant"); }, call_day: (cc) => { midResolve(cc, "cant"); },
      g_dontknow: (cc) => { midResolve(cc, "paid"); },
    },
    ask: (cc) => { T(cc, "mid_when_reask"); },
  });
}

/** Tomorrow's check-in (item 4). */
function meetOk(c: Ctx) {
  if (!closingLive(c) || !once(c, "meet")) return;
  c.s.closeDone = true; c.s.closeHow = "ok"; c.s.meet = "h8";
  T(c, "meet_ok");
}
function meetTime(c: Ctx, tm: any) {
  if (!tm) return;
  if (midLive(c)) { const h = midHour(tm); if (h === "midnight") midResolve(c, "yes"); else midResolve(c, "limit", h); return; }
  if (!closingLive(c) || !once(c, "meet")) return;
  const h = hourId(tm);
  if (h === "h8") { c.s.closeDone = true; c.s.closeHow = "ok"; c.s.meet = "h8"; T(c, "meet_ok"); return; }
  // six in the morning, midnight: "Seamos humanos. ¿Qué tal a las diez?"
  if (h && !MEET_OK.has(h)) { offer(c, "h10", "meet_silly"); return; }
  c.s.closeDone = true; c.s.closeHow = "moved"; c.s.meet = h ?? "other";
  if (h === "noon") T(c, "meet_move_noon"); else if (h) T(c, "meet_move", { time: hourTime(h) }); else T(c, "meet_move_generic");
}
/** Toño suggests a time ("¿Qué tal al mediodía?"). */
function offer(c: Ctx, h: string, line: string) {
  c.s.offer = h;
  T(c, line);
  const accept = (cc: Ctx) => { if (cc.s.closeDone || !once(cc, "offerAns")) return; cc.s.closeDone = true; cc.s.closeHow = "moved"; cc.s.meet = cc.s.offer; if (cc.s.offer === "noon") T(cc, "offer_ok_noon"); else T(cc, "offer_ok", { time: hourTime(cc.s.offer) }); };
  // "Claro, al mediodía está bien." (the hour he offered) is a yes
  const time = (cc: Ctx, tm: any) => { if (hourId(tm) === cc.s.offer) accept(cc); else meetAgain(cc, tm); };
  c.expect({
    id: "offer", expects: ["meet_time", "meet_time_ctx", "cant_ctx", "agree_ctx"], hints: ["closing"],
    suggest: [{ lt: "Agree, or suggest another time", hint: "closing" }],
    yes: accept,
    no: (cc) => { if (!once(cc, "offerAns")) return; T(cc, "when_q"); cc.expect(whenPending()); },
    on: {
      meet_time: (cc, s) => { time(cc, s.time); }, meet_time_ctx: (cc, s) => { time(cc, s.time); }, g_ok: accept, agree_ctx: accept, meet_ok: accept,
      cant_ctx: (cc) => { if (!once(cc, "offerAns")) return; T(cc, "when_q"); cc.expect(whenPending()); },
    },
    ask: (cc) => { if (cc.s.offer === "noon") T(cc, "offer_reask_noon"); else T(cc, "offer_reask", { time: hourTime(cc.s.offer) }); },
  });
}
function whenPending(): Pending {
  return {
    id: "when", expects: ["meet_time", "meet_time_ctx"], hints: ["closing"],
    suggest: [{ lt: "Suggest a time", hint: "closing" }],
    on: {
      meet_time: (c, s) => { meetAgain(c, s.time); },
      meet_time_ctx: (c, s) => { meetAgain(c, s.time); },
      g_dontknow: (c) => { if (once(c, "whenHelp")) offer(c, "noon", "when_noon"); },
      call_day: (c) => { if (idiomAsked(c)) return false; callDay(c); },
    },
    ask: (c) => { T(c, "when_reask"); },
  };
}
/** A time given to "¿A qué hora te funciona?" (the step's own "meet" turn-guard is already used). */
function meetAgain(c: Ctx, tm: any) {
  SAID.get(c)?.delete("meet");
  meetTime(c, tm);
}

/** "¡Dejémoslo por hoy!": at the midnight request a no, at the closing an end of the day; once the work is settled
 *  it ends the day early (item 4); before that, "¡Ja! Todavía no. Buen intento." */
function callDay(c: Ctx) {
  if (midLive(c)) { midResolve(c, "cant"); return; }
  if (closingLive(c)) { if (!once(c, "meet")) return; c.s.closeDone = true; c.s.closeHow = "day"; c.s.meet = "h8"; T(c, "call_day_react"); return; }
  if (c.s.overloaded && c.s.prioDone && !c.s.closeDone) {
    if (!once(c, "meet")) return;
    c.s.ownerDone = true; c.s.midDone = true; if (!crashResolved(c)) c.s.crashSkip = true;
    c.s.closeDone = true; c.s.closeHow = "day"; c.s.meet = "h8";
    T(c, "call_day_react");
    return;
  }
  if (!c.s.closeDone && once(c, "notYet")) T(c, "not_yet");
}

/** Toño closes the day (success: the course report is done) and waits for the learner's goodbye. */
function closing(c: Ctx) {
  if (coreDone(c)) {
    if (c.s.closeHow !== "day") T(c, "close_good");
    c.s.goalMet = true;
    c.complete();
  } else T(c, "close_partial");
  const close = (cc: Ctx) => { closeReply(cc); };
  const on: Record<string, (cc: Ctx, slots: any, seg: Segment) => boolean | void> = {};
  for (const k of [...Object.keys(startup.intents).filter((x) => !x.endsWith("_ctx") && !x.startsWith("idiom")), "g_thanks", "g_bye", "g_ok", "g_hello", "g_sorry"]) on[k] = close;
  c.expect({ id: "closing", expects: ["meet_ok", "call_day"], hints: ["g_social"], suggest: [{ lt: "Say goodbye", hint: "g_social" }], on, yes: close, no: close });
}

/** Toño's last word; the conversation ends. */
function closeReply(c: Ctx) {
  if (!once(c, "close")) return;
  T(c, "bye_tyler");
  c.end();
}

// A step's question after a "No sé" that nothing else answered: its help instead.
for (const st of startup.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) { DONT_KNOW.delete(c); st.help(c); return; }
    ask(c);
  };
}

export default startup;
