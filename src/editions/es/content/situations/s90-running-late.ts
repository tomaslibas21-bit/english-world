// NEEDS: None. Every merge, line and pending question is local.
// Song 90 "I'm Running Late" → Puerto Colibrí: "Voy tarde".
// A phone call to the boss, Ingeniero Montes (usted), at about 8:50 before the nine o'clock meeting at Línea Clara.
// The learner says who is calling ("Buenos días, ingeniero, habla…"), that they are running late ("Voy tarde", "Se me
// hizo tarde", "No voy a llegar a tiempo"), why, and when they'll get there ("Llego en veinte minutos", "Llego como a
// las nueve y media", "Ya casi llego"). Montes reacts to the reason, may ask "¿Empezamos sin usted?", and on some
// visits has news (twist room_302: today the meeting isn't in the usual room 204 but in room 302, on the third floor of
// Línea Clara's own tower; the 3D town has no second office building across avenida Juárez, so the audit of 5 Nov 2026
// moved the English original's "other building across the street" upstairs).
//
// Keeps the English edition's steps, intents and twist. Added: eta_ctx (a bare number or time, only at the time
// question: "Veinte.", "A las diez." is read by the question asked: ¿Como a qué hora llega? / ¿Como en cuánto tiempo
// llega?) and confirm_room_ctx (a bare "trescientos dos" / "tres cero dos" at the room news). The famous Mexican
// "ahorita llego" gets "¿Ahorita cuánto es? ¿Cinco minutos o media hora?" once (a neutral twin without the joke).
//
// Research (Nov 2026) for a small town on the Riviera Maya: people get to work by the city bus ("el camión", M), the
// colectivo (the shared van on the coast road), taxi, or their own car; the usual reasons are traffic on the highway
// (an accident, "un choque"), heavy rain and flooded streets, the bus that didn't come by, a flat tire ("se me ponchó
// una llanta", M; "se me pinchó" elsewhere and in Spain); bosses in Mexican offices are addressed by their title
// ("ingeniero", affectionately "inge") and with usted; Mexicans say "la junta" for a work meeting (also "la reunión",
// the neutral word, which Montes uses). Uber is restricted in Quintana Roo, so Montes never mentions it (the learner
// may). Phone: "¿Bueno?" (M) answers, "Sí, él habla" = "Speaking."
// Mexican-only words in Montes's lines (¿bueno?, camión, ahorita, liga, ándele) have neutral twins.

import type { Ctx, Pending, Segment, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Helpers

type Reason = "alarm" | "bus" | "train" | "traffic" | "rain" | "car" | "keys" | "kids" | "family" | "appt" | "generic" | "taxi" | "sick";

const F_LOLA = "lo / la: “you” (usted), lo for a man and la for a woman.";
const F_COMO = "como: about, roughly; Mexicans put it before times and amounts.";
const F_BUENO = "Mexican: ¿Bueno? is how Mexicans answer the phone.";

const plain = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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
  if (tags.includes("m15")) return { min: 15 };
  if (tags.includes("m30")) return { min: 30 };
  if (tags.includes("m45")) return { min: 45 };
  if (tags.includes("m60")) return { min: 60 };
  if (tags.includes("m90")) return { min: 90 };
  // "al mediodía" (12:00), "en la tarde" (after lunch): long after the nine o'clock start
  if (tags.includes("noon")) return { min: 190 };
  if (tags.includes("pm")) return { min: 240 };
  if (tags.includes("hrs") && typeof v.number === "number") return { min: v.number * 60 };
  if (typeof v.number === "number") return { min: Math.max(v.number, typeof v.n2 === "number" ? v.n2 : 0) };
  if (v.time && typeof v.time === "object") {
    let h = v.time.h as number;
    const m = v.time.m as number;
    if (h < 7) h += 12;
    return { min: Math.max(0, h * 60 + m - (8 * 60 + 50)) };
  }
  return null;
}

/** "Sí, …" / "No, …" at the start of what the learner said (for answers that also carry an intent). */
function ynLead(c: Ctx): "yes" | "no" | null {
  const h = plain(c.heard);
  if (/^\W*(si|claro|sale|va|ok|okay|vale|por supuesto|desde luego|perfecto|andale|orale)\b/.test(h)) return "yes";
  if (/^\W*no\b/.test(h)) return "no";
  return null;
}

/** Every piece of this turn's parse ("Hoy no puedo ir | estoy enfermo"). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let n = turnIds.get(c); if (n === undefined) { n = ++turnSeq; turnIds.set(c, n); } return `${n}:${c.heard}`; };

/** Say a line at most once per learner turn (two handlers may react to the same utterance). */
function sayOnce(c: Ctx, id: string, vars?: Record<string, any>, group = id) {
  const key = "__said_" + group;
  if (c.s[key] === turn(c)) return;
  c.s[key] = turn(c);
  c.say(id, vars);
}

/** The learner is driving ("Perdón, me tengo que ir, voy manejando."). */
const driving = (c: Ctx) => /\b(manejando|conduciendo|al volante|en la carretera|(voy|estoy) en el (carro|coche|auto))\b/.test(plain(c.heard));
/** The learner ends the call in the same breath ("Voy manejando, le llamo luego."). */
const leaving = (c: Ctx) => /\b(adios|hasta luego|nos vemos|bye|chao|me tengo que ir|tengo que (irme|colgar)|(le|te) tengo que colgar|ya me voy|(le|te) (llamo|marco|hablo) (luego|despues|mas tarde|al rato))\b/.test(plain(c.heard));

/** Montes's goodbye, said once; ends the call without re-asking an open question. "¡Maneje con cuidado!" first
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
  alarm: "react_alarm", bus: "react_bus", train: "react_train", traffic: "react_traffic", rain: "react_rain", car: "react_car",
  keys: "react_keys", kids: "react_kids", family: "react_family", appt: "react_appt", generic: "react_generic",
  taxi: "react_taxi", sick: "react_family",
};

function sendHelp(c: Ctx) { if (!c.s.helpSent) { c.s.helpSent = true; c.say("help_send"); } else c.say("ok_fine"); }

/** "Voy a tomar un taxi" is a good idea; "Ya viene mi esposo", "Ya llamé a la grúa" is good news. */
function taxiOk(c: Ctx) { c.s.noCar = true; c.say(/\b(taxi|uber|colectivo|camion|autobus)\b/.test(plain(c.heard)) ? "good_idea" : "help_no"); }

function doReason(c: Ctx, why: any) {
  const r = reasonOf(why) ?? "generic";
  const first = !c.s.reason;
  c.s.reason = r;
  c.s.late = true;
  // not at the wheel (the car broke down, a bus, a colectivo, a taxi): no "¡Y maneje con cuidado!" at the end
  if (r === "car" || r === "bus" || r === "train" || r === "taxi") c.s.noCar = true;
  if (!first) { sayOnce(c, "ack"); return; }
  sayOnce(c, REACT[r]);
  if (r === "car") {
    c.expect({
      id: "need_help", optional: true, expects: ["taxi_ok", "taxi_ok_ctx", "help_request", "no_help", "no_help_ctx"], hints: ["g_yesno"],
      suggest: [{ lt: "Say whether you need help", hint: "g_yesno" }],
      yes: (cc) => { sendHelp(cc); },
      no: (cc) => { cc.say("help_no"); },
      on: { taxi_ok: (cc) => taxiOk(cc), taxi_ok_ctx: (cc) => taxiOk(cc), help_request: (cc) => { sendHelp(cc); }, no_help: (cc) => { cc.say("help_no"); },
        no_help_ctx: (cc) => { cc.say("help_any"); },
        // "Sí, gracias" is a yes; a bare "Gracias" (or "No, gracias") to an offer is a polite no
        g_thanks: (cc) => { if (ynLead(cc) === "yes") sendHelp(cc); else cc.say("help_any"); },
        // "No sé": nothing sent; Montes leaves the offer open ("Bueno, cualquier cosa me avisa.")
        g_dontknow: (cc) => { cc.say("help_any"); } },
    });
  }
}

/** "Ahorita llego": how long is ahorita? Montes asks once (at the time question); a second "ahorita" is soon. */
function doAhorita(c: Ctx) {
  c.s.late = true;
  if (c.s.ahoritaAsked) { c.s.eta = { soon: true, min: 5 }; sayOnce(c, "eta_soon"); return; }
  c.s.ahorita = true;
}

function doEta(c: Ctx, v: any) {
  if (v?.__tags?.includes("ahorita")) { doAhorita(c); return; }
  const e = etaOf(v);
  if (!e) return;
  c.s.eta = e;
  c.s.late = true;
  // "¿Y qué pasó?" "Llego en veinte minutos.": the learner moved on; Montes doesn't ask the reason again
  if (c.step === "reason" && !c.s.reason) c.s.reasonSkipped = true;
  const m = e.min ?? 20;
  if (e.soon) sayOnce(c, "eta_soon");
  else if (m >= 45) {
    // said once: a second long time ("Llego en la tarde." … "A las once.") is just taken
    if (c.s.planned === "start" && c.s.etaLongSaid) { sayOnce(c, "eta_ok"); return; }
    // "Entonces empezamos sin usted" decides it, even after "Espérenme" or with "¿Empezamos sin usted?" still open
    sayOnce(c, "eta_long");
    c.s.etaLongSaid = true; c.s.planned = "start"; c.s.planStated = true;
    const conv = (c as any).conv;
    if (conv?.pending?.id === "plan_q") conv.pending = null;
  }
  else sayOnce(c, "eta_ok");
}

/** A bare "Veinte." / "Diez." / "A las diez." at the time question: read by the question Montes asked. "¿Como a qué
 *  hora llega?" "Diez." = ten o'clock (9–12 only: an earlier hour has passed and nobody means 5 p.m.); "¿Como en
 *  cuánto tiempo llega?" "Diez." = ten minutes. A bare hour word the clock slot read ("veinte" = 20:00) without
 *  "las" is a count. */
function bareEta(c: Ctx, slots: any, tags: string[]): any {
  const art = /(^|\s)(a las|las|la|a la)\s/.test(" " + plain(c.heard) + " ");
  let n: number | undefined = typeof slots.number === "number" ? slots.number : undefined;
  if (n === undefined && slots.time && !art && slots.time.m === 0 && !slots.time.ampm) n = slots.time.h;
  if (n !== undefined) {
    // "Dos horas." (the clock slot reads "dos" as 2:00)
    if (/\bhoras?\b/.test(plain(c.heard)) && n <= 4) return { number: n, __tags: [...tags, "hrs"] };
    if (c.s.etaAsk === "when" && n >= 9 && n <= 12 && typeof slots.n2 !== "number") return { time: { h: n, m: 0 }, __tags: tags };
    return { number: n, n2: slots.n2, __tags: tags };
  }
  if (slots.time) return { time: slots.time, __tags: tags };
  return null;
}

/** The goal (= the mission checklist) is reached once Montes knows who is calling, that they are late (or can't
 *  come), why (when he asked), when they'll be there, and whether to start (when he asked). */
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
  // "lo esperamos unos minutos" fits a short delay, not "Llego en cuarenta minutos"
  c.say((c.s.eta?.min ?? 0) > 20 ? "plan_wait" : "ok_wait");
  maybeComplete(c);
}

/** "¿Empezamos sin usted?" A yes starts, a no waits; "Así está bien", a bare "No, no hace falta" and "No pueden
 *  empezar sin mí" (its comma lost) could be either: Montes asks which. */
function planQ(): Pending {
  const amb = (cc: Ctx) => { if (cc.s.planAmb) return false; cc.s.planAmb = true; cc.say("amb_plan"); cc.expect(planQ()); return true; };
  return {
    id: "plan_q", expects: ["start_without", "wait_for_me", "wait_ctx", "start_ctx", "plan_amb_ctx"], hints: ["requests"],
    suggest: [{ lt: "Say whether to start without you", hint: "requests" }],
    yes: (cc) => planStart(cc),
    no: (cc) => {
      const h = plain(cc.heard);
      if ((/\basi\b/.test(h) || (/\b(hace falta|es necesario)\b/.test(h) && !/\bespera/.test(h))) && amb(cc)) return;
      planWait(cc);
    },
    on: {
      start_without: (cc) => planStart(cc),
      start_ctx: (cc) => planStart(cc),
      wait_for_me: (cc) => planWait(cc),
      // "Espere, ¿en qué sala?" is "hold on": only a bare "Espere(n)" waits
      wait_ctx: (cc) => { if (turnSegments(cc).every((x) => x.intent === "wait_ctx" || x.intent === "wait_for_me")) planWait(cc); },
      plan_amb_ctx: (cc) => { if (!amb(cc)) planWait(cc); },
      save_seat: (cc) => { if (ynLead(cc) === "no") planWait(cc); else planStart(cc); cc.say("ok_seat"); },
      tell_team: (cc) => { planStart(cc); cc.say("ok_tell"); },
      // "No sé": the boss decides ("Bueno, entonces empezamos.")
      g_dontknow: (cc) => planStart(cc),
    },
    ask: (cc) => cc.say("plan_ask"),
  };
}

/** Can't come today: Montes is told why in the same breath, or asks "¿Entonces hoy va a faltar?". */
function cantCome(c: Ctx, why?: any) {
  c.s.cantCome = true;
  c.s.late = false;
  if (why !== undefined && !c.s.reason) {
    const r = reasonOf(why) ?? "generic";
    c.s.reason = r;
    c.say(REACT[r] === "react_car" ? "react_generic" : REACT[r]);
  }
  c.say("cant_come_ok");
  maybeComplete(c);
}

const AUTO: Record<string, string> = {
  opening: "Buenos días, ingeniero, habla Ryan. Voy tarde.",
  who: "Habla Ryan.",
  late: "Voy tarde.",
  reason: "Se me fue el camión.",
  eta: "Llego en veinte minutos.",
  plan_q: "Sí, empiecen sin mí.",
  need_help: "No, gracias. Voy a tomar un taxi.",
  cant_q: "No, nada más voy tarde.",
  room: "Ok, sala 302. Entendido.",
  closing: "Gracias. ¡Hasta luego!",
};

// ---------------------------------------------------------------------------

export const runningLate: SituationDef = {
  id: "s90-running-late",
  song: 90,
  songTitle: "I'm Running Late",
  title: { en: "Voy tarde", lt: "I'm running late" },
  topic: { en: "Llegar tarde al trabajo", lt: "Running late for work" },
  chapter: 4,
  order: 4,
  location: "phone",
  npc: "harris",
  mode: "phone",
  goal: "Call your boss and tell him you're running late: who's calling, why, and when you'll get there.",
  intro: "It's 8:50 a.m. The team meeting at Línea Clara starts at nine, and you're still on your way. Call your boss, Ingeniero Montes: say who's calling, that you're running late, why, and when you'll be there.",

  grammar: {
    macros: {
      mh: "(ingeniero | ingeniero montes | inge | senor montes | jefe)",
      pre: "[@mh] [perdon | disculpe | disculpa #tip:tu_staff | una disculpa | lo siento [mucho] | fijese que | fijate que #tip:tu_staff | es que | desgraciadamente | lamentablemente | tengo un (problema | problemita | pequeno problema) | (le | solo le | nada mas le | nomas le) (llamo | hablo | marco) para (avisarle | decirle) [que] | (te | solo te) (llamo | hablo | marco) para (avisarte | decirte) [que] #tip:tu_staff | (le | te) (queria | quiero) (avisar | decir) [que] | (queria | quiero | solo queria) (avisarle | decirle) [que] | (le | te) aviso que | (solo | nada mas | nomas) que] [@mh] [pero] [hoy]",
      for_mtg: "[a la (junta | reunion) [de las nueve | de hoy] | a la oficina | al trabajo | hoy | esta manana | otra vez | de nuevo | hoy otra vez]",
      bitlate: "[un poco | un poquito | algo | un rato | un poco mas]",
      post: "[perdon | lo siento [mucho] | una disculpa | disculpe]",
      approx: "[mas o menos | maximo | a lo mucho | aproximadamente | o algo asi | o asi]",
      unsure: "[(no se | no estoy (seguro | segura) | no se bien) [pero]] [creo que | espero que | ojala | calculo que | yo creo que | pienso que | si todo va bien | supongo que | tal vez | quizas | quiza | a lo mejor | probablemente | mas bien]",
      on_road: "[en la (carretera | avenida | federal | autopista | entrada del pueblo) | en el (centro | puente | camino)]",
      be_there: "(llego | voy a llegar | estoy ahi | estoy alla | estoy en la oficina | voy a estar ahi | voy a estar alla | llegare | estare ahi | estare alla | puedo estar ahi | puedo llegar | creo que llego | espero llegar | espero estar ahi)",
      // the reason said with "can't come" in one breath ("Hoy no voy a poder ir, amanecí enfermo")
      cwhy: "[[porque | es que | ya que | pues] {why}]",
      wait_v: "(esperar | esperarme | esperenme | espereme)",
      nothanks: "(no gracias | gracias | no se preocupe | no no se preocupe | no gracias no se preocupe | no esta bien | esta bien)",
      late_core: [
        "voy @bitlate tarde @for_mtg #h:running_late",
        "vengo @bitlate tarde @for_mtg",
        "(estoy llegando | voy llegando) @bitlate tarde @for_mtg",
        "(voy a tardar | me voy a tardar | voy a tardarme | me voy a retrasar | voy a retrasarme | me estoy retrasando | me estoy tardando) [@bitlate] [mas] @for_mtg",
        "(se me hizo | se me ha hecho) @bitlate tarde @for_mtg #h:got_late",
        "(voy a llegar | llego | voy a estar) @bitlate tarde @for_mtg #h:calling_late",
        "(voy a llegar | llego) [como | unos | mas o menos | aproximadamente | algo asi como] {number} minutos tarde @for_mtg #h:late_mins",
        "(voy a llegar | llego) tarde [como | unos] {number} minutos @for_mtg",
        "(voy | llego | voy a llegar) con [un poco de | algo de | unos minutos de] retraso @for_mtg",
        "(voy | estoy | ando) (retrasado | retrasada | atrasado | atrasada) @for_mtg",
        "no (voy a llegar | llego | alcanzo a llegar | voy a alcanzar a llegar | creo que llegue | creo llegar | creo que voy a llegar | voy a estar) (a tiempo | a la hora | puntual | a las nueve) @for_mtg #h:not_on_time",
        "(voy a llegar | llego) (despues de las nueve | mas tarde | un poco mas tarde | un poquito mas tarde) @for_mtg",
        "me voy a perder (el principio | el inicio | el comienzo | los primeros minutos | los primeros (diez | quince) minutos) de la (junta | reunion)",
        "no voy a llegar al (principio | inicio | comienzo) de la (junta | reunion)",
        "no (puedo | voy a poder | podre) llegar (a tiempo | a la hora | puntual | a las nueve) @for_mtg",
        "(voy a llegar | llego) (unos minutos | unos minutitos | un rato | un ratito) tarde @for_mtg",
      ],
    },
    slots: {
      why: { pattern: [
        // the alarm
        "no sonó (mi | la | el) (alarma | despertador) #r:alarm #h:r_alarm", "no [me] (ha sonado | sonó) (mi | la | el) (alarma | despertador) #r:alarm",
        "(mi | la | el) (alarma | despertador) no (sonó | ha sonado) #r:alarm",
        "no (escuché | oi) (mi | la | el) (alarma | despertador) #r:alarm",
        "(se me olvidó | olvidé) (poner | prender) (la | mi | el) (alarma | despertador) #r:alarm",
        "(me quedé | me he quedado) (dormido | dormida) #r:alarm #h:r_overslept",
        "se me pegaron las sabanas #r:alarm",
        "(me desperté | desperté) tarde #r:alarm", "(me dormi | me volvi a dormir | me dormi de mas) #r:alarm", "me levanté tarde #r:alarm", "dormí de mas #r:alarm",
        "se me (pasó | fue) la hora #r:alarm", "no dormí (bien | nada) [anoche] #r:alarm",
        // the city bus (camión, M) / autobús
        "se me (fue | pasó) el (camion | autobus) #r:bus #h:r_bus",
        "(perdí | perdi | he perdido) el (camion | autobus) #r:bus",
        "el (camion | autobus) (no pasó | no ha pasado | no llegó | no ha llegado | se tardó | viene tarde | venia tarde | se descompuso | venia lleno | iba lleno | viene lleno | paso lleno) #r:bus",
        "(no pasa | no ha pasado | no pasó) (el | ningun) (camion | autobus) #r:bus",
        "(tuve que | tengo que) esperar el (siguiente | otro) (camion | autobus) #r:bus",
        "el (camion | autobus) (venia | iba | viene) lleno y (tuve que | tengo que) esperar el (siguiente | otro) #r:bus",
        "no hay (camion | camiones | autobus | autobuses) #r:bus",
        "(estoy esperando | sigo esperando) el (camion | autobus) #r:bus", "(el | por el) (camion | autobus) #r:bus",
        // the colectivo (shared van) and the train
        "se me (fue | pasó) el (colectivo | tren) #r:train", "(perdí | perdi | he perdido) el (colectivo | tren) #r:train",
        "el (colectivo | tren) (no pasó | no ha pasado | no llegó | no ha llegado | se tardó | viene tarde | viene lleno | venia lleno | se retrasó | viene retrasado | va retrasado | se descompuso) #r:train #h:r_train",
        "(no pasan | no han pasado) (los colectivos | colectivos) #r:train",
        // traffic, the road
        "(estoy | estamos) (atorado | atorada | atorados | atrapado | atrapada | parado | parada) en el (trafico | transito) @on_road #r:traffic #h:r_traffic",
        "(me quedé | quedé) (atorado | atorada | atrapado | atrapada) en el (trafico | transito) @on_road #r:traffic",
        "(estoy | me quedé) en un (atasco | embotellamiento) @on_road #r:traffic",
        "(hay | habia) (mucho | muchisimo | demasiado | un monton de | tanto) (trafico | transito) @on_road [hoy] #r:traffic",
        "hay un (trafico | atasco | embotellamiento) (terrible | horrible | tremendo) @on_road #r:traffic",
        "hay un (atasco | embotellamiento) @on_road #r:traffic",
        "el (trafico | transito) (esta | estaba) (terrible | horrible | imposible | pesadisimo | muy pesado | muy lento | fatal) [hoy] #r:traffic",
        "(hubo | hay) un (choque | accidente) @on_road #r:traffic", "(chocaron | hubo un choque) @on_road #r:traffic",
        "(esta | estaba) cerrada la (calle | carretera | avenida) #r:traffic", "la (calle | carretera | avenida) (esta | estaba) cerrada #r:traffic",
        "(hay | estan haciendo) (obras | trabajos) @on_road #r:traffic", "(estan arreglando | arreglan) la (calle | carretera) #r:traffic",
        "hay (un reten | un bloqueo | una manifestacion) @on_road #r:traffic",
        "[puro | mucho] (trafico | transito) #r:traffic",
        "(estoy | estamos | voy) en el (trafico | transito) @on_road #r:traffic", "hay (trafico | transito) @on_road #r:traffic",
        "(habia | hubo) un (choque | accidente) @on_road #r:traffic",
        "(por | es por) el (trafico | transito) #r:traffic",
        // rain (the Caribbean coast: downpours and flooded streets)
        "(esta | estaba) lloviendo (mucho | muchisimo | a cantaros | fuerte | horrible) #r:rain #h:r_rain",
        "llueve (mucho | muchisimo) #r:rain", "hay (mucha lluvia | una tormenta | un tormenton) #r:rain",
        "las calles (estan | estaban) (inundadas | llenas de agua) #r:rain", "se (inundó | inundaron) (la calle | las calles | mi calle) #r:rain",
        "(por | es por | con) (la lluvia | la tormenta | esta lluvia) #r:rain",
        "(esta | estaba) lloviendo #r:rain", "llovió (mucho | muchisimo | fuerte | toda la noche | a cantaros) #r:rain",
        // the car
        "se me descompuso el (carro | coche | auto) #r:car #h:r_car", "se me (ha averiado | averió | ha estropeado | estropeó | ha roto) el (carro | coche | auto) #r:car",
        "(mi | el) (carro | coche | auto) (no arranca | no prende | no quiere arrancar | no quiso arrancar | se descompuso | esta descompuesto | esta en el taller) #r:car",
        "se (me | le) (ponchó | pinchó) (una llanta | una rueda | la llanta) [al (carro | coche | auto) | del (carro | coche | auto)] #r:car",
        "se (ponchó | pinchó) (una llanta | una rueda | la llanta) #r:car", "se (descompuso | murió) (mi | el) (carro | coche | auto) #r:car",
        "tuve un accidente #r:car", "(tengo | traigo) (una llanta | una rueda) (ponchada | pinchada) #r:car",
        "tuve un pinchazo #r:car",
        "(se me acabó | me quedé sin) (la gasolina | gasolina) #r:car",
        "se me (descargó | murió) la bateria del (carro | coche | auto) #r:car",
        "(tengo | tuve) (un problema | problemas) con (el | mi) (carro | coche | auto) #r:car",
        "(tuve un choque | me chocaron | choqué) #r:car",
        // keys, things forgotten
        "no (encontraba | encuentro | encontré | podia encontrar) (mis | las) llaves #r:keys #h:r_keys",
        "(perdí | perdi) (mis | las) llaves #r:keys",
        "se me (olvidaron | perdieron) las llaves #r:keys",
        "(se me olvidó | olvidé) (el celular | mi celular | la cartera | mi cartera | la laptop | mi laptop | la computadora | mi computadora | el gafete | mi gafete) [en (la casa | casa)] [y (tuve que regresar | regresé) [por (el | ella)]] #r:keys",
        "(tuve que regresar | regresé) a (la casa | mi casa | casa) por (el celular | las llaves | la cartera | la laptop | la computadora) #r:keys",
        "me quedé afuera de (mi casa | la casa) #r:keys",
        // children, family, health
        "(tuve que | tenia que) llevar a (mi hijo | mi hija | los ninos | mis hijos | el nino | la nina | los chamacos) (a la escuela | al doctor | al medico | al dentista | a la guarderia | al kinder | al hospital) #r:kids #h:r_kid",
        "(fui | tuve que ir) a dejar a (mi hijo | mi hija | los ninos | mis hijos) (a la escuela | al kinder | a la guarderia) #r:kids",
        "(tuve que | tenia que) dejar a (mi hijo | mi hija | los ninos | mis hijos) en (la escuela | el kinder | la guarderia) #r:kids",
        "a (mi hijo | mi hija) se le (fue | pasó) el (camion | autobus) #r:kids",
        "(mi hijo | mi hija | mi esposa | mi esposo | mi mama | mi papa | mi pareja | el nino | la nina) (esta | amaneció) (enfermo | enferma | mal) #r:family",
        "(estoy | me siento | amanecí) (enfermo | enferma | mal | malo | mala) #r:sick",
        "no me siento bien #r:sick",
        "(me enfermé | me puse (malo | mala) | tengo (gripa | gripe | fiebre | calentura) | estoy (resfriado | resfriada))  #r:sick",
        "(mi hijo | mi hija | mi esposa | mi esposo | mi mama | mi papa | mi pareja | el nino | la nina) se (enfermó | puso (malo | mala)) #r:family",
        "(tuve que | tengo que) ir al (doctor | medico | dentista | hospital) #r:appt",
        "(tengo | tenia | tuve) (una cita | cita) (con el | con la | en el | al) (doctor | doctora | medico | dentista | hospital) #r:appt",
        // anything else
        "(tuve | tengo) (un problema | un problemita | una emergencia | una emergencia familiar) [en (la casa | casa)] #r:generic",
        "se me (presentó | complicó) algo #r:generic", "(me surgió | surgió) algo #r:generic",
        "es una historia larga #r:generic", "es una larga historia #r:generic",
        "(es | fue) (algo | un asunto | un tema) personal #r:generic", "es personal #r:generic", "prefiero no (decir | decirlo | hablar de eso) #r:generic",
        "(tuve que | tenia que) esperar (al plomero | al tecnico | al del gas | el gas | una entrega | un paquete) #r:generic",
        // a taxi that doesn't come
        "el (taxi | uber) (no llegó | no ha llegado | se tardó | viene tarde | no viene) #r:taxi",
        "(estoy esperando | sigo esperando) (un | el | mi) (taxi | uber) #r:taxi",
        "no (pasan | hay) taxis #r:taxi", "no (encuentro | encontré | consigo) taxi #r:taxi",
      ] },
      eta: { pattern: [
        "[@be_there] en [unos | como | mas o menos | aproximadamente | otros | como unos] {number} [minutos | minutitos] [mas] #h:eta_in",
        "[@be_there] en [unos | como] {number} o {n2:number} [minutos]",
        "[@be_there] (entre | de) {number} (y | a) {n2:number} minutos",
        "[@be_there] en [como | unos | mas o menos] media hora #m30 #h:eta_halfhour",
        "[@be_there] en [como | mas o menos] (una hora | una horita) #m60",
        "[@be_there] en (un cuarto de hora | quince minutitos) #m15",
        "[@be_there] en (unos minutos | unos minutitos | un ratito | un momento | un momentito | cinco minutitos | un par de minutos) #m5",
        "[@be_there] en un rato #m15",
        // ("Llego hasta las diez": Mexican hasta = not until)
        "@be_there [como | mas o menos] (a | para | antes de | despues de | hasta) {time} #h:eta_by", "@be_there (sobre | a eso de | hacia) {time}",
        "(como | mas o menos) (a | para) {time}", "(sobre | a eso de | hacia) {time}", "(a | para | antes de | despues de | hasta) {time}",
        "no (llego | voy a llegar | creo que llegue | creo llegar | voy a estar ahi | voy a estar alla) antes de {time}",
        "[@be_there] [en] menos de (media hora #m30 | una hora #m45 | {number} minutos)",
        "[@be_there] [en] mas de (media hora #m45 | una hora #m90)",
        // (never a bare "tarde": "Voy a llegar tarde" is late, not the afternoon)
        "[@be_there] (en la tarde | por la tarde | hasta la tarde | despues de comer) #pm",
        "[@be_there] [como] [hasta] (al mediodia | a mediodia | el mediodia) #noon",
        "estoy a [como | unos | mas o menos] {number} minutos [de (ahi | alla | la oficina)] #h:eta_away",
        "me (faltan | quedan) [como | unos] {number} minutos",
        "ya casi (llego | estoy ahi | estoy alla) #soon #h:eta_soon",
        "ya (mero | merito) (llego | estoy ahi | estoy alla) #soon", "ya voy llegando #soon",
        "(estoy | ya estoy) (cerca | muy cerca | a la vuelta | aqui a la vuelta | a dos cuadras | en la esquina) #soon",
        "(ya llego | llego enseguida | llego en un momento | ya casi) #soon",
        "ahorita (llego | estoy ahi | estoy alla) #ahorita",
        "(deme | denme | dame #tip:tu_staff) [unos | como] {number} minutos [mas]",
        "(no mas de | a lo mucho | maximo) {number} minutos",
        "[como | unos | mas o menos] {number} minutos [mas o menos]",
        "[como | unos] {number} o {n2:number} minutos",
        "[como] (media hora #m30 | una hora #m60)",
        "[@be_there] en [como | unos | mas o menos] {number} horas #hrs", "[como | unos] {number} horas #hrs",
        "[@be_there] en [como | mas o menos] (una hora y media | hora y media) #m90", "[como] (una hora y media | hora y media) #m90",
        "[@be_there] en [como | mas o menos] tres cuartos de hora #m45",
        "ahorita [voy | llego] #ahorita",
      ] },
    },
  },

  intents: {
    identify: { patterns: [
      "[@mh] (habla | le habla | soy | aqui habla) {name} [de (ventas | mercadotecnia | sistemas | la oficina | su equipo | el equipo | contabilidad | linea clara)] #h:id_habla",
      "[@mh] soy yo [es] {name}",
      "[@mh] {name} (al habla | a sus ordenes)",
      "[@mh] (habla | le habla | soy) {name} [y] [le (llamo | hablo)] (por | sobre) la (junta | reunion)",
      "[@mh] (habla | le habla | soy) {name} su (empleado | empleada)",
      "[@mh] (me llamo | mi nombre es) {name}",
    ] },
    its_me: { patterns: ["[@mh] soy yo", "[si] soy yo"] },
    // "Es Ryan." as the answer to the phone greeting (a bare word is not a name here: "Ingeniero", "¿Y si nadie viene?")
    identify_ctx: { patterns: ["es {name}"] },
    name_ctx: { patterns: ["{name}", "(me llamo | mi nombre es | soy | habla | es) {name}",
      // "¿Con quién hablo?" "Con Ryan."; "Ryan, de su equipo."
      "con {name}", "[con] {name} de (su equipo | el equipo | la oficina | ventas | mercadotecnia | sistemas | contabilidad | linea clara)"] },
    greet_harris: { patterns: ["(hola | buenos dias | buen dia | buenas) @mh", "[oiga | oye] @mh"] },
    is_harris: { patterns: ["(hablo | estoy hablando) con [el] @mh", "se encuentra [el] @mh", "[el] @mh (es usted | eres tu)", "(es usted | usted es) [el] @mh",
      // the Mexican phone asks: "¿Está el ingeniero Montes?", "¿Con el ingeniero Montes, por favor?"
      "esta [el] @mh [por favor]", "con [el] @mh [por favor]", "(me comunica | me puede comunicar | me podria comunicar) con [el] @mh [por favor]"] },
    late: { patterns: [
      "@pre @late_core @post",
      "@pre @late_core [porque | es que | ya que | pues] {why} @post",
      "@pre @late_core [y] [pero] {eta}",
      "@pre @late_core [porque | es que] {why} [y] {eta}",
      "[si] todo bien [pero] [solo | nada mas | nomas] @late_core",
      "[no es] nada [grave] [solo | nada mas | nomas] @late_core",
    ] },
    reason: { patterns: [
      "[si] todo bien [solo | nada mas | nomas] [que] {why}",
      "@pre [porque | es que | lo que pasa es que | pues] {why} @post",
      "@pre {why} [y] [por eso | entonces | asi que] @late_core",
      "@pre {why} [y] {eta}",
      "[no es] nada grave [solo | nada mas | nomas] {why}",
      // a correction: "No es por el tráfico, se me fue el camión" (the second reason is the answer)
      "no (es | fue) por (el trafico | el transito | la lluvia | el camion | el autobus | el carro | el coche) [es que | sino que | sino] {why}",
    ] },
    eta: { patterns: ["@pre @unsure {eta} @approx"] },
    // a bare number or clock time: only at the time question (read by bareEta)
    eta_ctx: { patterns: ["[como | unos | mas o menos] {number} [mas o menos | mas]", "{time}", "[como | unos] {number} o {n2:number}"] },
    on_way: { patterns: [
      "[pero] ya (voy | estoy | vengo) en camino [ya]", "[ya] voy en camino", "(ya | ahi) voy [para alla]", "voy para (alla | la oficina)",
      "ya (sali | salimos) [de (mi casa | la casa | casa)]", "(voy | estoy | vengo) (manejando | caminando | conduciendo)",
      "[ya] (estoy | voy | vengo) en el (carro | coche | auto | camion | autobus | colectivo | taxi | tren)",
    ] },
    not_late: { patterns: [
      // without its comma "No, voy a llegar tarde" (at "¿Todo bien?") reads the same: #amb (see the handler)
      "no (voy a llegar | llego) tarde #amb",
      "(voy a llegar | llego | voy a estar ahi | estoy ahi) (a tiempo | puntual | a la hora)",
      "si (llego | voy a llegar) a tiempo",
      "no (voy a llegar | llego) tarde [voy a llegar | llego | voy | estoy] (a tiempo | puntual | a la hora)",
      "no no (voy a llegar | llego) tarde",
    ] },
    cant_come: { patterns: [
      "@pre [hoy] no (voy a poder | puedo | podre) (ir | venir | llegar | trabajar) [hoy] [a la (junta | reunion | oficina) | al trabajo | a trabajar] [hoy] @cwhy",
      "@pre [hoy] no voy a (ir | venir) [hoy] [a la (oficina | junta | reunion) | a trabajar | al trabajo] @cwhy",
      "@pre no voy a poder (asistir | estar) (a | en) la (junta | reunion) @cwhy",
      "@pre hoy no (puedo | voy a poder | voy | voy a ir) @cwhy",
    ] },
    start_without: { patterns: [
      "[si] (pueden | puede | podrian | podria) (empezar | comenzar | arrancar) [la (junta | reunion)] sin mi #h:start_without",
      "[si] (empiecen | comiencen | arranquen) [la (junta | reunion)] sin mi",
      "[si] (pueden | puede) (empezar | comenzar | arrancar) [la (junta | reunion)] [sin problema]",
      "[si] (puedes | empieza | comienza) [empezar] [la (junta | reunion)] sin mi #tip:tu_staff",
      "[no] [mejor] no me esperen #h:dont_wait",
      "(y si | que tal si) (empiezan | comienzan | empiezan ustedes) [la (junta | reunion)] sin mi",
      "[no] no (es necesario | hace falta | tienen que | tienen por que) (que me esperen | esperarme)",
      "[si] (sigan | adelante) sin mi",
      "(prefiero | mejor) que (empiecen | comiencen) [la (junta | reunion)] [sin mi]", "(empiecen | comiencen) ustedes", "que (empiecen | comiencen) [la (junta | reunion)] sin mi",
      "[si] (mejor | por favor) (empiecen | comiencen) [sin mi]",
      "(empezad | comenzad) [la reunion] sin mi", "no me espereis",
      "[si] (empiecen | adelante | arranquen) [no hay problema] [yo (me pongo al corriente | los alcanzo | llego despues)]",
      "[si] adelante yo me pongo al corriente", "yo los alcanzo [despues | alla]",
      "(es | seria) mejor que empiecen sin mi",
    ] },
    wait_for_me: { patterns: [
      "[no] no (empiecen | comiencen) [todavia | aun] [la (junta | reunion)] sin mi [todavia]",
      "[no] no (empiecen | comiencen) (todavia | aun)", "no no (empiecen | comiencen)",
      "(y si | que tal si) me (esperan | espera) [unos minutos | {number} minutos | un poco | un ratito]",
      "(me pueden | me puede | me podrian | me podria | pueden | puede) @wait_v [unos minutos | {number} minutos | un poco | un ratito | tantito]",
      "(me puedes | puedes) @wait_v [unos minutos | {number} minutos | un poco | un ratito] #tip:tu_staff",
      "[no] [mejor] (esperenme | espereme) [por favor] [unos minutos | {number} minutos | un poquito | un ratito | tantito]",
      "prefiero que me (esperen | espere)",
      "(quiero | quisiera | me gustaria) estar desde el (principio | inicio | comienzo)",
      "[si] (se puede | es posible) (esperenme | que me esperen)",
    ] },
    // only at "¿Empezamos sin usted?": a bare "Espere" elsewhere is "hold on" ("Espere, ¿en qué sala?"), and "Como
    // usted quiera" / "Adelante" answer only this question
    wait_ctx: { patterns: ["[si] [mejor] (esperen | espere) [un poco | unos minutos | {number} minutos | un ratito | tantito] [por favor]"] },
    start_ctx: { patterns: [
      "[no se] (como (quiera | usted quiera | prefiera | usted prefiera | guste | usted diga) | lo que usted (diga | decida | prefiera))",
      "[si] (sigan | adelante) [por favor]",
    ] },
    // "No pueden empezar sin mí" and "No, pueden empezar sin mí" read the same once the comma is lost: Montes asks
    plan_amb_ctx: { patterns: ["no (pueden | puede | podrian) (empezar | comenzar | arrancar) [la (junta | reunion)] [sin mi]"] },
    save_seat: { patterns: [
      "(me guarda | me aparta | me puede guardar | me puede apartar | me podria guardar | me guardan | me apartan | me pueden guardar) un (lugar | asiento | lugarcito | sitio) #h:save_seat",
      "(me puedes guardar | me guardas | me apartas) un (lugar | asiento | sitio) #tip:tu_staff",
      "(guardeme | apartenme | guardenme | aparteme) un (lugar | asiento | lugarcito | sitio)",
    ] },
    tell_team: { patterns: [
      "(les puede | les podria | le puede | le podria) (avisar | decir) [a (los demas | todos | el equipo | los otros | los companeros)] #h:tell_team",
      "(les puede | les podria) (avisar | decir) [a (los demas | todos | el equipo)] que (voy tarde | voy en camino | ya voy | llego tarde | voy a llegar tarde)",
      "(les puedes | le puedes) (avisar | decir) [a (los demas | todos | el equipo)] #tip:tu_staff",
      "(les avisa | le avisa | les dice | le dice) a (los demas | todos | el equipo | los otros)",
      "(aviseles | digales | avisele | digale) a (los demas | todos | el equipo | los otros) [que (voy tarde | voy en camino | ya voy | llego tarde)]",
    ] },
    join_online: { patterns: [
      "(me puedo | puedo | podria) (conectar | conectarme | unir | unirme | entrar) [a la (junta | reunion | llamada)] (en linea | por zoom | por videollamada | por teams | por meet | desde el (celular | carro | taxi | camion | colectivo) | virtual) #h:join_online",
      "(me puedo | puedo) conectar [a la (junta | reunion)]",
      "(me manda | me puede mandar | me pasa | me puede pasar | me envia | me comparte) (la liga | el link | el enlace) [de la (junta | reunion)]",
      "(me mandas | me pasas) (la liga | el link | el enlace) #tip:tu_staff",
      "(hay | tienen | tiene) (liga | link | enlace | una liga | un link | un enlace) [para (conectarme | entrar | la junta | la reunion)]",
    ] },
    will_call: { patterns: [
      "(le | te | les) (aviso | marco | llamo | hablo | escribo | mando un mensaje) (cuando (este | ya este | vaya) (cerca | llegando) | cuando llegue | si algo cambia | cuando sepa mas | en cuanto llegue)",
    ] },
    apologize: { patterns: [
      "(perdon | disculpe | una disculpa | lo siento [mucho] | mil disculpas | disculpa #tip:tu_staff) (por | por llegar) (tarde | el retraso | la tardanza | la molestia | las molestias | esto | el inconveniente) #h:sorry_trouble",
      "(lo siento mucho | de verdad lo siento | lo siento muchisimo | mil disculpas | le pido una disculpa | le ofrezco una disculpa | disculpeme | una disculpa) [@mh] #h:sorry",
      "[y] no (va a volver | vuelve | volvera) a (pasar | suceder | ocurrir) #h:wont_happen",
      "(lo siento mucho | mil disculpas | una disculpa) no (va a volver | vuelve | volvera) a pasar",
      "(perdon | lo siento) otra vez",
    ] },
    ask_room: { patterns: [
      "(en | a) (que | cual) sala (es | va a ser | sera) [la (junta | reunion)]", "donde (es | va a ser | sera) la (junta | reunion)",
      "(es | sera) en la (sala | misma sala) de siempre", "[es] la (sala) de siempre", "[es] la de siempre", "(en | a) (que | cual) sala #h:q_room",
    ] },
    ask_ok: { patterns: [
      "(hay | habra) (algun | algún) problema", "espero que no (haya | sea) (problema | ningun problema)",
      "(no | si) (le | les) molesta", "(esta | estaria) bien si llego (un poco | mas | un poquito) tarde",
      // "¿Está enojado?" gets "No, para nada."
      "[no] (esta | estas #tip:tu_staff) (enojado | molesto)", "(se | te #tip:tu_staff) (enojó | molestó)",
    ] },
    // the room (302, on the third floor) said back; "en el otro edificio" is no confirmation (ask_building answers it)
    confirm_room: { patterns: [
      "[ok | muy bien | de acuerdo | perfecto | va | sale | entendido | vale] [en] [la] sala {room:digits} [en el (tercer piso | tercero | piso tres)] [entendido | ok | perfecto] #h:room_got_it",
      "[ok | muy bien | perfecto | entendido | sale | va] [en] el (tercer piso | tercero | piso tres) [en la sala {room:digits}] [entendido]",
      "(voy | me voy) a la sala {room:digits}",
    ] },
    // a bare room number, only at the room news
    confirm_room_ctx: { patterns: ["[la] {room:digits}"] },
    thanks_info: { patterns: ["[muchas] gracias por (avisarme | avisar | decirme | el aviso | la informacion | el dato)"] },
    thanks_understanding: { patterns: ["[muchas] gracias por (entender | comprender | su comprension | la comprension | su paciencia | la paciencia | ser tan comprensivo | entenderme | esperarme | esperar)"] },
    bye_meeting: { patterns: [
      "nos vemos (en la (junta | reunion | oficina) | en la sala {room:digits} | alla | ahi | en un rato | al rato | ahorita | en unos minutos | en un ratito | en un momento)",
      "(ahi | alla) nos vemos", "hasta (ahorita | al rato | en un rato)",
    ] },
    no_help: { patterns: ["[no] no (necesito | ocupo) (ayuda | nada | un taxi | que me ayuden)", "no gracias (estoy bien | todo bien)", "no (estoy bien | todo bien) gracias"] },
    // "Gracias, no se preocupe" at "¿Necesita ayuda?" only (elsewhere it answers an apology)
    no_help_ctx: { patterns: ["[no] [gracias] no se (preocupe | moleste) [gracias] [estoy bien | todo bien]"] },
    // "No llego en veinte minutos" (the comma reading "No, llego en veinte…" is unlikely after "¿Como en cuánto
    // tiempo llega?"): not a time; Montes asks again, unless the right time follows ("…, más bien en media hora")
    eta_neg_ctx: { patterns: [
      "no (llego | voy a llegar | creo que llegue | creo llegar | alcanzo a llegar | voy a estar ahi | voy a estar alla) en [unos | como] ({number} minutos | media hora | una hora | un rato | cinco minutitos)",
      "no (llego | voy a llegar | alcanzo a llegar | voy a estar ahi | voy a estar alla) (a | para) {time}",
    ] },
    help_request: { patterns: [
      "[si] (alguien | usted) (puede | podria) (pasar por mi | venir por mi | recogerme | ayudarme)",
      "(me pueden | me puede | me podria) mandar a alguien", "[si] (mande | manden) a alguien [por mi]",
      "[si] (alguien | usted) (me puede | me podria) (recoger | ayudar)",
      "[si] (me pueden | me puede | me podria | me podrian) (mandar | pedir | conseguir) un (taxi | uber | carro | coche)",
    ] },
    // "Ahorita se la mando" (the location Montes asked for)
    send_location: { patterns: [
      "[si] [ok | claro | sale | va | perfecto] [ahorita | ahora | ya] se la (mando | envio | paso | comparto)",
      "[si] [ok | claro | sale | va] [ahorita | ahora | ya] le (mando | envio | paso | comparto) (mi | la) ubicacion",
      "ya (se la | le) (mandé | envié | pasé | compartí) [mi ubicacion | la ubicacion]",
    ] },
    // where room 302 is (the third floor of this tower); a building across the street is the English original's, not
    // this town's: "¿Dónde está el otro edificio?" gets "No, es aquí, en nuestro edificio…"
    ask_building: { patterns: [
      "donde (esta | queda) la sala [{room:digits}] #h:q_building", "donde (esta | queda) [eso]", "(cual | que) edificio",
      "(en | a) (que | cual) edificio", "[en] que piso [es | esta | queda] [la (junta | reunion | sala [{room:digits}])]",
      "como llego [ahi | alla | a la sala [{room:digits}]]", "[es] en (nuestro | este | el mismo) edificio",
      "donde (esta | queda) (el otro edificio | ese edificio)", "[ok] [es] [en] el otro edificio [en la sala {room:digits}]",
      "como llego al otro edificio", "[es] en otro edificio", "[es] (el | en el) (edificio de enfrente | de enfrente)",
    ] },
    // the meeting itself: what time, whether it started, whether everyone is there ("¿Ya llegaron todos?" is no "Ya llego")
    ask_mtg_time: { patterns: [
      "(a que hora | cuando) (es | empieza | comienza | va a empezar | va a ser | arranca) la (junta | reunion)",
      "a que hora (empieza | empiezan | comienza | comienzan | arrancan)",
      "[la (junta | reunion)] (es | empieza | comienza) a las nueve [la (junta | reunion)]",
    ] },
    ask_started: { patterns: [
      "ya (empezaron | empezó | comenzó | comenzaron | arrancaron | arrancó | ha empezado | han empezado | ha comenzado | habeis empezado) [la (junta | reunion)]",
      "(todavia no | aun no) (empieza | empiezan | empiezan ustedes | empezaron | ha empezado) [la (junta | reunion)]",
    ] },
    ask_team: { patterns: ["ya (llegaron | han llegado | estan) todos [en la (junta | reunion | sala)]", "ya (llego | esta) todo el (equipo | mundo)", "ya (estan | llegaron) los demas"] },
    // "No sé, depende del tráfico" at the time question
    eta_unknown_ctx: { patterns: [
      "[no se] [bien] (depende | va a depender) (del trafico | del transito | de la lluvia | del camion | del autobus | del colectivo | del taxi)",
      "no se [bien] [todavia] cuanto (tiempo | me voy a tardar | voy a tardar | me tardo) [depende del trafico]",
      "no (tengo idea | estoy (seguro | segura)) [de] cuanto (tiempo | me voy a tardar | voy a tardar)",
    ] },
    taxi_ok: { patterns: [
      "[@nothanks] (voy a tomar | voy a pedir | ya pedí | ya llamé | pedí | llamé | tomo | agarro | voy a agarrar) un (taxi | uber | colectivo)",
      "[@nothanks] me voy en (taxi | colectivo | camion | autobus | uber)",
      "[@nothanks] (estoy esperando | ya viene) (la grua | el mecanico | al mecanico | el seguro | al ajustador | el ajustador)",
      "[@nothanks] (mi (esposo | esposa | pareja | hermano | hermana | vecino | vecina) | un amigo | una amiga) (viene por mi | me va a llevar | me lleva | me va a recoger | me esta ayudando | me va a ayudar)",
      "[@nothanks] (voy a tomar | tomo) el (camion | autobus | colectivo)",
      "[@nothanks] ya (viene | va a venir) (mi (esposo | esposa | pareja | hermano | hermana | vecino | vecina) | un amigo | una amiga | la grua | el mecanico) [por mi]",
      "[@nothanks] [ya] (llamé | pedí) (a la grua | una grua | al seguro | al mecanico)",
    ] },
    // "No, voy a tomar un taxi" without its comma: at "¿Necesita ayuda?" only (elsewhere it is "I won't take a taxi")
    taxi_ok_ctx: { patterns: ["no (voy a tomar | voy a pedir | tomo | me voy en) (un taxi | taxi | un colectivo | el camion | el autobus | el colectivo)", "no (ya pedí | ya llamé) un taxi"] },
    just_late: { patterns: [
      "[no] (solo | nada mas | nomas) (voy tarde | voy a llegar tarde | se me hizo tarde | voy a llegar un poco tarde)",
      "[no] si voy (pero | nada mas que) (tarde | mas tarde | un poco tarde | un poco mas tarde)",
      "(voy a llegar | llego) (mas tarde | un poco mas tarde)", "[no] si (voy a ir | voy) pero (tarde | mas tarde)",
      "[no] [no] si (voy | voy a ir | llego | voy a llegar) [pero] [nada mas que] [(tarde | mas tarde | un poco tarde | un poco mas tarde)]",
    ] },
    // "Sí, no voy a poder" / "No, no voy": a bare can't at "¿Entonces hoy va a faltar?" only
    cant_ctx: { patterns: ["[si] [no] [hoy] no (voy a poder | puedo | voy | voy a ir) [hoy] [lo siento]", "[si] [hoy] voy a faltar [hoy] [lo siento]"] },
    // "No, voy a llegar más tarde" without its comma: at "¿Entonces hoy va a faltar?" only
    just_late_ctx: { patterns: ["no (voy a llegar | llego) (mas tarde | un poco mas tarde | tarde | un poco tarde)", "no (voy tarde | se me hizo tarde)", "[no] no (voy a faltar | falto) [hoy] [solo | nada mas] [voy tarde | voy a llegar tarde]",
      // "No sé, tal vez más tarde": maybe later is coming, late
      "[no se] (tal vez | quizas | quiza | a lo mejor) [llegue | llego | voy | vaya] (mas tarde | al rato | en un rato)"] },
    // the answer to "¿Va a llegar tarde, o a tiempo?"
    amb_ctx: { patterns: ["[no] [mejor] tarde #late", "[no] [si] a tiempo #ontime", "[no] [si] [voy a llegar] puntual #ontime"] },
    english_q: { patterns: ["(habla | hablas | usted habla) ingles", "(se puede | puedo) hablar en ingles"] },
  },

  lines: {
    hello: [
      t("¿Bueno? | Buenos días.", "Hello? | Good morning.", "Hello? Good morning.",
        { flags: { 0: F_BUENO }, neutral: t("¿Hola? | Buenos días.", "Hello? | Good morning.", "Hello? Good morning."), spain: t("¿Sí? | Buenos días.", "Hello? | Good morning.", "Hello? Good morning.", { flags: { 0: "Spain: ¿Sí? or ¿Diga? is how people answer the phone." } }) }),
      t("Buenos días, | habla | Montes.", "Good morning, | speaking | Montes.", "Good morning, Montes speaking.", { flags: { 1: "habla + name: on the phone, “… speaking”." }, spain: t("Buenos días, | soy | Montes.", "Good morning, | it's | Montes.", "Good morning, Montes speaking.") }),
      t("Montes, | buenos días.", "Montes, | good morning.", "Montes here, good morning."),
    ],
    hello_id: [
      t("¡Buenos días! | ¿Todo | bien?", "Good morning! | All | good?", "Good morning! Everything okay?"),
      t("¿Qué | pasó? | Buenos días. | ¿Todo | bien?", "What | happened? | Good morning. | All | good?", "Hey, good morning. Everything okay?",
        { flags: { 0: "¿Qué pasó?: in Mexico also a friendly “what's up?” on the phone." }, spain: t("¿Qué | tal? | Buenos días. | ¿Todo | bien?", "How | are things? | Good morning. | All | good?", "Hi, good morning. Everything okay?") }),
    ],
    hello_again: [
      t("¿Bueno? | ¿Quién | habla?", "Hello? | Who | is speaking?", "Hello? Who's calling?",
        { flags: { 0: F_BUENO }, neutral: t("¿Hola? | ¿Quién | habla?", "Hello? | Who | is speaking?", "Hello? Who's calling?"), spain: t("¿Diga? | ¿Quién | es?", "Hello? | Who | is it?", "Hello? Who's calling?", { flags: { 0: "Spain: ¿diga? is how people answer the phone." } }) }),
      t("Hola, | ¿quién | habla?", "Hi, | who | is speaking?", "Hi, who's calling?", { spain: t("Hola, | ¿quién | es?", "Hi, | who | is it?", "Hi, who's calling?") }),
    ],
    yes_hi: [
      t("Ah, | sí, | buenos días.", "Ah, | yes, | good morning.", "Oh, yes, good morning."),
    ],
    hi_short: [
      t("¡Buenos días!", "Good morning!", "Good morning!"),
      t("¡Hola, | buenos días!", "Hi, | good morning!", "Hi, good morning!"),
    ],
    who: [
      t("Perdón, | ¿quién | habla?", "Sorry, | who | is speaking?", "Sorry, who's calling?", { spain: t("Perdone, | ¿quién | es?", "Sorry, | who | is it?", "Sorry, who's calling?") }),
      t("¿Con | quién | hablo?", "With | whom | am I speaking?", "Who am I speaking with?"),
    ],
    who_again: [
      t("Perdón, | no escuché | su | nombre.", "Sorry, | I didn't hear | your | name.", "Sorry, I didn't catch your name."),
    ],
    name_ack: [
      t("¡Ah, | hola!", "Ah, | hi!", "Oh, hi!"),
      t("¡Hola, | hola!", "Hi, | hi!", "Oh, hi there!"),
    ],
    ask_late: [
      t("Dígame.", "Tell me.", "Go ahead."),
      t("Sí, | dígame, | ¿qué | pasó?", "Yes, | tell me, | what | happened?", "Yes, go ahead. What's up?", { spain: t("Sí, | dígame, | ¿qué | ha pasado?", "Yes, | tell me, | what | has happened?", "Yes, go ahead. What's up?") }),
      t("¿Qué | se le ofrece?", "What | do you need?", "What can I do for you?", { flags: { 1: "¿Qué se le ofrece?: a polite Mexican “What can I do for you?”" }, spain: t("¿En | qué | le | puedo | ayudar?", "With | what | you | can I | help?", "What can I do for you?") }),
    ],
    ask_late_wrong: [
      t("¡Uy! | ¿Qué | pasó?", "Uh-oh! | What | happened?", "Uh-oh. What happened?", { spain: t("¡Uy! | ¿Qué | ha pasado?", "Uh-oh! | What | has happened?", "Uh-oh. What happened?") }),
    ],
    ask_reason: [
      t("¿Y | qué | pasó?", "And | what | happened?", "Oh, what happened?", { spain: t("¿Y | qué | ha pasado?", "And | what | has happened?", "Oh, what happened?") }),
      t("¿Y | eso?", "And | that?", "How come?", { flags: { 1: "¿Y eso?: “how come?”, asking for the reason." } }),
      t("¿Todo | bien?", "All | good?", "Is everything okay?"),
    ],
    ask_what: [
      t("¿Pero | qué | pasó?", "But | what | happened?", "But what happened?", { spain: t("¿Pero | qué | ha pasado?", "But | what | has happened?", "But what happened?") }),
    ],
    react_bus: [
      t("Uy, | esos | camiones | nunca | pasan | a tiempo.", "Ugh, | those | buses | never | come by | on time.", "Ugh, those buses are never on time.",
        { flags: { 2: "Mexican: camión = city bus. Elsewhere: autobús." },
          neutral: t("Uy, | esos | autobuses | nunca | pasan | a tiempo.", "Ugh, | those | buses | never | come by | on time.", "Ugh, those buses are never on time.") }),
      t("¡Qué | mala | suerte!", "What | bad | luck!", "That's bad luck!"),
    ],
    react_traffic: [
      t("Sí, | hoy | hay | mucho | tráfico.", "Yes, | today | there is | a lot of | traffic.", "Yeah, traffic's bad today."),
      t("Sí, | me | dijeron | que | la | carretera | está | imposible.", "Yes, | (to) me | they told | that | the | highway | is | impossible.", "Yeah, I heard the highway is a nightmare.", { spain: t("Sí, | me | han dicho | que | la | carretera | está | imposible.", "Yes, | (to) me | they've told | that | the | highway | is | impossible.", "Yeah, I heard the highway is a nightmare.") }),
    ],
    react_rain: [
      t("Sí, | con | esta | lluvia | las | calles | están | imposibles.", "Yes, | with | this | rain | the | streets | are | impossible.", "Yeah, with this rain the streets are a mess."),
    ],
    react_alarm: [
      t("¡Ja! | Nos | pasa | a | todos.", "Ha! | (to) us | it happens | to | all.", "Ha! It happens to all of us.",
        { flags: { 1: "nos … a todos: the pronoun nos doubles “a todos” (to all of us)." } }),
      t("Bueno, | eso | pasa.", "Well, | that | happens.", "Well, that happens."),
    ],
    react_train: [
      t("¡No puede ser, | otra vez!", "No way, | again!", "Oh no, not again!"),
    ],
    react_car: [
      t("¡Uy! | ¿Necesita | ayuda?", "Oh no! | Do you need | help?", "Oh no! Do you need any help?"),
    ],
    react_keys: [
      t("¡Ay, | no! | Eso | es | lo peor.", "Oh, | no! | That | is | the worst.", "Oh no! That's the worst."),
    ],
    react_kids: [
      t("Claro, | primero | es | la | familia.", "Of course, | first | is | the | family.", "Of course. Family comes first."),
    ],
    react_family: [
      t("Ay, | lo siento | mucho. | Espero | que | no sea | nada | grave.", "Oh, | I'm sorry | very much. | I hope | that | it isn't | anything | serious.",
        "Oh, I'm so sorry. I hope it's nothing serious."),
    ],
    react_appt: [
      t("Claro, | no se preocupe.", "Of course, | don't worry.", "Of course, don't worry."),
    ],
    react_generic: [
      t("Ah, | bueno. | Entiendo.", "Ah, | okay. | I understand.", "Oh, okay. I understand."),
    ],
    react_taxi: [
      t("Bueno, | a veces | pasa.", "Well, | sometimes | it happens.", "Well, it happens sometimes."),
    ],
    help_send: [
      t("Bueno. | Mándeme | su | ubicación | y | le | mando | a | alguien.", "Okay. | Send me | your | location | and | (to) you | I-send | — | someone.",
        "Okay. Send me your location and I'll send someone over.", { flags: { 7: "Personal a: Spanish marks a person after the verb; English has no word here." } }),
    ],
    help_any: [
      t("Bueno, | cualquier | cosa | me | avisa.", "Okay, | any | thing | (to) me | you-let-know.", "Okay, if you need anything, let me know."),
    ],
    help_no: [
      t("Ah, | qué | bueno.", "Ah, | how | good.", "Oh, good.", { spain: t("Ah, | menos mal.", "Ah, | thank goodness.", "Oh, good.") }),
    ],
    good_idea: [
      t("Buena | idea.", "Good | idea.", "Good idea."),
    ],
    ack: [
      t("Ajá.", "Uh-huh.", "Uh-huh."),
      t("Ya veo.", "I see.", "I see."),
    ],
    // "¿Como a qué hora…?" (a bare "Diez." = ten o'clock) and "¿Como en cuánto tiempo…?" (a bare "Diez." = ten minutes)
    ask_eta: [
      t("¿Como | a | qué | hora | llega?", "About | at | what | time | do you arrive?", "Around what time will you get here?", { flags: { 0: F_COMO }, spain: t("¿Más o menos | a | qué | hora | llega?", "Roughly | at | what | time | do you arrive?", "Around what time will you get here?") }),
      t("¿A | qué | hora | cree | que | llega?", "At | what | time | do you think | that | you arrive?", "What time do you think you'll get here?"),
    ],
    ask_eta_long: [
      t("¿Como | en | cuánto | tiempo | llega?", "About | in | how much | time | do you arrive?", "About how long until you get here?", { flags: { 0: F_COMO }, spain: t("¿Más o menos | en | cuánto | tiempo | llega?", "Roughly | in | how much | time | do you arrive?", "About how long until you get here?") }),
    ],
    ask_eta_vague: [
      t("Bueno. | ¿Como | en | cuánto | tiempo?", "Okay. | About | in | how much | time?", "Okay. About how long?", { flags: { 1: F_COMO }, spain: t("Vale. | ¿Más o menos | en | cuánto | tiempo?", "Okay. | Roughly | in | how much | time?", "Okay. About how long?") }),
    ],
    ahorita_q: [
      t("¿Ahorita | cuánto | es? | ¿Cinco | minutos | o | media | hora?", "Right now | how much | is it? | Five | minutes | or | half an | hour?",
        "And how long is “ahorita”? Five minutes or half an hour?",
        { flags: { 0: "Mexican: ahorita can mean right now or in a while; Mexicans joke about it." },
          neutral: t("¿En | cuánto | tiempo, | más o menos? | ¿Cinco | minutos | o | media | hora?", "In | how much | time, | more or less? | Five | minutes | or | half an | hour?",
            "How long, roughly? Five minutes or half an hour?") }),
    ],
    eta_ok: [
      t("Bueno, | está bien.", "Okay, | that's fine.", "Okay, that's fine.", { spain: t("Vale, | está bien.", "Okay, | that's fine.", "Okay, that's fine.") }),
      t("Ok, | de acuerdo.", "Okay, | all right.", "Okay, that works.", { spain: t("Vale, | de acuerdo.", "Okay, | all right.", "Okay, that works.") }),
    ],
    eta_soon: [
      t("Ah, | perfecto.", "Ah, | perfect.", "Oh, perfect."),
      t("¡Qué | bueno!", "How | good!", "Great!", { spain: t("¡Qué | bien!", "How | good!", "Great!") }),
    ],
    eta_long: [
      t("Mmm, | bueno. | Entonces | empezamos | sin | usted.", "Hmm, | okay. | Then | we start | without | you.", "Hmm, okay. We'll start without you, then."),
    ],
    plan_ask: [
      t("¿Empezamos | sin | usted?", "Should we start | without | you?", "Should we start without you?"),
      t("¿Quiere | que | empecemos | sin | usted?", "Do you want | that | we start | without | you?", "Do you want us to start without you?",
        { flags: { 2: "empecemos: the subjunctive after “quiere que” (want us to)." } }),
    ],
    plan_start: [
      t("No hay problema. | Empezamos | sin | usted.", "No problem. | We start | without | you.", "No problem. We'll start without you."),
      t("Entonces | vamos | empezando | sin | usted.", "Then | we'll go | starting | without | you.", "Then we'll go ahead and start without you.",
        { flags: { 1: "vamos empezando: a soft way to say “we'll get started”." } }),
    ],
    plan_wait: [
      t("No se preocupe, | {m:lo|f:la} | esperamos.", "Don't worry, | you | we'll wait for.", "Don't worry, we'll wait for you.", { flags: { 1: F_LOLA } }),
      t("Aquí | {m:lo|f:la} | esperamos, | entonces.", "Here | you | we wait for, | then.", "We'll wait for you here, then.", { flags: { 1: F_LOLA } }),
    ],
    thanks_letting: [
      t("Gracias | por | avisar.", "Thanks | for | letting know.", "Thanks for letting me know."),
    ],
    // the twist: not the usual room 204 today but 302, on the third floor of this same tower (the 3D town has no other
    // office building across the street)
    room_twist: [
      t("Ah, | y | por cierto, | hoy | la | reunión | no es | en | la | sala | de siempre.", "Oh, | and | by the way, | today | the | meeting | isn't | in | the | room | usual.",
        "Oh, and by the way, today the meeting isn't in the usual room."),
    ],
    room_num: [
      t("Es | en | la | sala | 302.", "It's | in | — | room | 302.", "It's in room 302.",
        { say: "Es en la sala trescientos dos.", write: "Sala 302 · tercer piso", flags: { 2: "la before sala; English has no article here." } }),
    ],
    room_right: [
      t("Exacto.", "Exactly.", "Exactly.", { write: "Sala 302 · tercer piso" }),
      t("Así es.", "That's right.", "That's right.", { write: "Sala 302 · tercer piso" }),
    ],
    room_wrong: [
      t("No, | es | la | sala | 302.", "No, | it's | — | room | 302.", "No, it's room 302.",
        { say: "No, es la sala trescientos dos.", write: "Sala 302 · tercer piso", flags: { 2: "la before sala; English has no article here." } }),
    ],
    building: [
      t("Aquí | en | nuestro | edificio, | en | el | tercer | piso.", "Here | in | our | building, | on | the | third | floor.", "Here in our building, on the third floor.",
        { write: "Sala 302 · tercer piso", spain: t("Aquí | en | nuestro | edificio, | en | la | tercera | planta.", "Here | in | our | building, | on | the | third | floor.", "Here in our building, on the third floor.") }),
      t("En | el | tercer | piso | de | este | edificio.", "On | the | third | floor | of | this | building.", "On the third floor of this building.",
        { write: "Sala 302 · tercer piso", spain: t("En | la | tercera | planta | de | este | edificio.", "On | the | third | floor | of | this | building.", "On the third floor of this building.") }),
    ],
    // "¿Dónde está el otro edificio?", "Ok, en el otro edificio": there is none
    building_no: [
      t("No, | es | aquí, | en | nuestro | edificio, | en | el | tercer | piso.", "No, | it's | here, | in | our | building, | on | the | third | floor.",
        "No, it's here in our building, on the third floor.", { write: "Sala 302 · tercer piso", spain: t("No, | es | aquí, | en | nuestro | edificio, | en | la | tercera | planta.", "No, | it's | here, | in | our | building, | on | the | third | floor.", "No, it's here in our building, on the third floor.") }),
    ],
    room_here: [
      t("Es | aquí, | en | nuestro | edificio, | como | siempre. | Sala | 204.", "It's | here, | in | our | building, | as | always. | Room | 204.",
        "It's here in our building, as usual. Room 204.", { say: "Es aquí, en nuestro edificio, como siempre. Sala doscientos cuatro.", write: "Sala 204" }),
    ],
    room_usual: [
      t("La | de | siempre: | la | sala | 204.", "The one | of | always: | — | room | 204.", "Same as always: room 204.",
        { say: "La de siempre: la sala doscientos cuatro.", write: "Sala 204", flags: { 3: "la before sala; English has no article here." } }),
    ],
    ok_start: [
      t("Claro, | empezamos | sin | usted.", "Sure, | we start | without | you.", "Sure, we'll start without you."),
      t("Bueno, | entonces | empezamos.", "Okay, | then | we start.", "Okay, we'll get started, then."),
    ],
    ok_wait: [
      t("Claro, | {m:lo|f:la} | esperamos | unos | minutos.", "Sure, | you | we wait for | a few | minutes.", "Sure, we can wait a few minutes for you.", { flags: { 1: F_LOLA } }),
    ],
    ok_seat: [
      t("Y | le | guardo | un | lugar.", "And | (for) you | I'll save | a | seat.", "And I'll save you a seat.", { spain: t("Y | le | guardo | un | sitio.", "And | (for) you | I'll save | a | seat.", "And I'll save you a seat.") }),
    ],
    seat_alone: [
      t("Claro, | le | guardo | un | lugar.", "Sure, | (for) you | I'll save | a | seat.", "Sure, I'll save you a seat.", { spain: t("Claro, | le | guardo | un | sitio.", "Sure, | (for) you | I'll save | a | seat.", "Sure, I'll save you a seat.") }),
    ],
    ok_tell: [
      t("Claro, | yo | les | aviso.", "Sure, | I | (to) them | I'll let know.", "Sure, I'll let them know."),
    ],
    ok_link: [
      t("Claro, | ahorita | le | mando | la | liga.", "Sure, | right now | (to) you | I send | the | link.", "Sure, I'll send you the link right now.",
        { flags: { 1: "Mexican: ahorita means right now here.", 5: "Mexican: la liga = a web link. Elsewhere: el enlace." },
          neutral: t("Claro, | ahora | le | mando | el | enlace.", "Sure, | now | (to) you | I send | the | link.", "Sure, I'll send you the link now.") }),
    ],
    ok_call: [
      t("Perfecto.", "Perfect.", "Sounds good."),
      t("Muy | bien, | quedamos | así.", "Very | good, | we agree | like that.", "Great, that's the plan."),
    ],
    no_problem: [
      t("No, | no hay | problema.", "No, | there's no | problem.", "No, no problem at all."),
    ],
    not_angry: [
      t("No, | para nada.", "No, | not at all.", "No, not at all."),
    ],
    mtg_time: [
      t("A | las | nueve.", "At | — | nine.", "At nine.", { flags: { 1: "las before the hour; English has no word here." } }),
    ],
    mtg_time_yes: [
      t("Sí, | a | las | nueve.", "Yes, | at | — | nine.", "Yes, at nine.", { flags: { 2: "las before the hour; English has no word here." } }),
    ],
    not_started: [
      t("Todavía no. | Empieza | a | las | nueve.", "Not yet. | It starts | at | — | nine.", "Not yet. It starts at nine.", { flags: { 3: "las before the hour; English has no word here." } }),
    ],
    team_almost: [
      t("Ya | casi | todos.", "Already | almost | all.", "Almost everyone."),
    ],
    eta_unknown: [
      t("Bueno, | me | avisa | cuando | sepa.", "Okay, | (to) me | you-let-know | when | you-know.", "Okay, let me know when you know."),
    ],
    ok_fine: [
      t("Bueno, | no se preocupe.", "Okay, | don't worry.", "Okay, don't worry."),
      t("Claro, | no pasa nada.", "Of course, | it's fine.", "Of course, it's no big deal."),
    ],
    is_harris: [
      t("Sí, | él | habla.", "Yes, | he | speaks.", "Yes, speaking.", { flags: { 1: "Sí, él habla: “yes, he's speaking”, the Mexican way to say “Speaking.”" } }),
    ],
    not_late_resp: [
      t("¡Ah, | qué | bueno! | Entonces | nos vemos | a | las | nueve.", "Ah, | how | good! | Then | see you | at | — | nine.", "Oh, good! See you at nine, then.",
        { flags: { 6: "las before the hour; English has no word here." }, spain: t("¡Ah, | qué | bien! | Entonces | nos vemos | a | las | nueve.", "Ah, | how | good! | Then | see you | at | — | nine.", "Oh, good! See you at nine, then.", { flags: { 6: "las before the hour; English has no word here." } }) }),
    ],
    amb_late: [
      t("Perdón, | ¿va | a | llegar | tarde, | o | a tiempo?", "Sorry, | are you going | to | arrive | late, | or | on time?", "Sorry, are you going to be late, or on time?"),
    ],
    amb_plan: [
      t("Perdón, | ¿empezamos, | o | {m:lo|f:la} | esperamos?", "Sorry, | should we start, | or | you | should we wait for?", "Sorry, should we start, or wait for you?", { flags: { 3: F_LOLA } }),
    ],
    english: [
      t("Un | poco, | pero | usted | habla | muy | bien | español.", "A | little, | but | you | speak | very | well | Spanish.", "A little, but your Spanish is really good."),
    ],
    cant_come_q: [
      // a yes/no question with no negation: "Sí" = absent, "No" / "Hoy no" = just late ("¿Entonces hoy no viene?"
      // "No." would mean "not coming" to a Spanish speaker, the opposite of how the handler reads it)
      t("¿Cómo? | ¿Entonces | hoy | va | a | faltar?", "What? | So | today | are you going | to | miss (work)?", "What? So you're missing work today?",
        { flags: { 5: "faltar: to be absent, to miss work or school." } }),
    ],
    cant_come_ok: [
      t("Bueno, | entiendo. | Gracias | por | avisar.", "Okay, | I understand. | Thanks | for | letting know.", "Okay, I understand. Thanks for letting me know."),
    ],
    just_late: [
      t("Ah, | bueno. | Entonces | nada más | se le hizo | tarde.", "Oh, | okay. | So | just | it got (on you) | late.", "Oh, okay. So you're just running late.",
        { flags: { 4: "se le hizo tarde: “it got late on you”, the usual way to say someone is running late." }, spain: t("Ah, | vale. | Entonces | solo | se le ha hecho | tarde.", "Oh, | okay. | So | just | it's gotten (on you) | late.", "Oh, okay. So you're just running late.", { flags: { 4: "se le ha hecho tarde: “it has gotten late on you”, the usual way to say someone is running late." } }) }),
    ],
    sorry_ok: [
      t("No se preocupe. | Son | cosas | que | pasan.", "Don't worry. | They're | things | that | happen.", "Don't worry. These things happen."),
      t("No pasa nada.", "It's fine.", "It's no big deal."),
    ],
    wont_happen_ok: [
      t("Lo sé. | No se preocupe.", "I know. | Don't worry.", "I know. Don't worry about it."),
    ],
    closing: [
      t("Bueno, | nos vemos | en | un | rato.", "Okay, | see you | in | a | while.", "Okay, see you in a bit."),
      t("Gracias | por | llamar. | Nos vemos | pronto.", "Thanks | for | calling. | See you | soon.", "Thanks for calling. See you soon."),
    ],
    closing_drive: [
      t("¡Y | maneje | con cuidado!", "And | drive | carefully!", "And drive safe!", { spain: t("¡Y | conduzca | con cuidado!", "And | drive | carefully!", "And drive safe!") }),
    ],
    take_care: [
      t("Cuídese.", "Take care.", "Take care."),
    ],
    bye: [
      t("Hasta luego.", "See you later.", "Bye!"),
      t("Ándele, | hasta luego.", "All right, | see you later.", "All right, bye!",
        { flags: { 0: "Mexican: ándele = all right then, closing a talk." }, neutral: t("Bueno, | hasta luego.", "Okay, | see you later.", "All right, bye!") }),
    ],
  },

  hints: {
    identify: {
      lt: "Say hello and who's calling",
      items: [
        { id: "id_habla", s: t("Buenos días, | ingeniero, | habla | {$name}.", "Good morning, | ingeniero, | speaking | {$name}.", "Good morning, it's {$name}.",
          { flags: { 1: "Ingeniero: a title for an engineer; in Mexico you address your boss by it.", 2: "habla + name: on the phone, “it's …”." }, spain: t("Buenos días, | ingeniero, | soy | {$name}.", "Good morning, | ingeniero, | it's | {$name}.", "Good morning, it's {$name}.", { flags: { 1: "Ingeniero: a title for an engineer; in Mexico you address your boss by it." } }) }),
          note: "On the phone, say “Habla…” or “Soy…”, not “Me llamo…”." },
        { id: "id_habla", s: t("Ingeniero, | soy | {$name}.", "Ingeniero, | I'm | {$name}.", "Hi, it's {$name}.") },
      ],
    },
    late: {
      lt: "Say you're running late",
      items: [
        { id: "running_late", s: t("Voy | tarde.", "I'm going | late.", "I'm running late.", { flags: { 0: "voy tarde: “I'm going late”, the everyday way to say you're running late." } }) },
        { id: "running_late", s: t("Voy | un poco | tarde.", "I'm going | a little | late.", "I'm running a little late.") },
        { id: "got_late", s: t("Se me hizo | tarde.", "It got (on me) | late.", "I'm running late.", { flags: { 0: "se me hizo tarde: “it got late on me”, very common in Mexico." }, spain: t("Se me ha hecho | tarde.", "It's gotten (on me) | late.", "I'm running late.") }) },
        { id: "late_mins", s: t("Voy | a | llegar | como | 20 | minutos | tarde.", "I'm going | to | arrive | about | 20 | minutes | late.", "I'll be about 20 minutes late.",
          { say: "Voy a llegar como veinte minutos tarde.", flags: { 3: F_COMO }, spain: t("Voy | a | llegar | unos | 20 | minutos | tarde.", "I'm going | to | arrive | about | 20 | minutes | late.", "I'll be about 20 minutes late.", { flags: { 3: "unos before a number: about." }, say: "Voy a llegar unos veinte minutos tarde." }) }) },
        { id: "not_on_time", s: t("No voy | a | llegar | a tiempo.", "I'm not going | to | arrive | on time.", "I won't make it on time.") },
        { id: "calling_late", s: t("Le | llamo | para | avisarle | que | voy | a | llegar | tarde.", "(to) you | I'm calling | to | let you know | that | I'm going | to | arrive | late.",
          "I'm calling to let you know I'll be late."), register: "polite" },
        { id: "running_late", s: t("Perdón, | ingeniero, | pero | voy | tarde.", "Sorry, | ingeniero, | but | I'm going | late.", "I'm sorry, but I'm running late.") },
      ],
    },
    reason: {
      lt: "Explain why you're late",
      items: [
        { id: "r_bus", s: t("Se me fue | el | camión.", "Left on me | the | bus.", "I missed the bus.",
          { flags: { 0: "se me fue: “it left on me”; Spanish puts accidents this way.", 2: "Mexican: camión = city bus. Elsewhere: autobús." },
            neutral: t("Se me fue | el | autobús.", "Left on me | the | bus.", "I missed the bus.", { flags: { 0: "se me fue: “it left on me”; Spanish puts accidents this way." } }), spain: t("He perdido | el | autobús.", "I've missed | the | bus.", "I missed the bus.") }) },
        { id: "r_traffic", s: t("Estoy | {m:atorado|f:atorada} | en | el | tráfico.", "I'm | stuck | in | the | traffic.", "I'm stuck in traffic.",
          { flags: { 1: "Mexican: atorado = stuck. Elsewhere: atrapado." },
            neutral: t("Estoy | {m:atrapado|f:atrapada} | en | el | tráfico.", "I'm | stuck | in | the | traffic.", "I'm stuck in traffic."), spain: t("Estoy | en | un | atasco.", "I'm | in | a | traffic jam.", "I'm stuck in traffic.") }) },
        { id: "r_alarm", s: t("No sonó | mi | despertador.", "Didn't ring | my | alarm clock.", "My alarm didn't go off.", { spain: t("No | me | ha sonado | el | despertador.", "Not | (for) me | has rung | the | alarm clock.", "My alarm didn't go off.") }) },
        { id: "r_overslept", s: t("Me quedé | {m:dormido|f:dormida}.", "I stayed | asleep.", "I overslept.", { spain: t("Me he quedado | {m:dormido|f:dormida}.", "I've stayed | asleep.", "I overslept.") }) },
        { id: "r_rain", s: t("Está | lloviendo | muchísimo.", "It's | raining | very much.", "It's pouring.") },
        { id: "r_train", s: t("El | colectivo | no ha pasado.", "The | shared van | hasn't come by.", "The colectivo hasn't come yet.",
          { flags: { 1: "colectivo: the shared van that runs along the coast road." } }) },
        { id: "r_car", s: t("Se me descompuso | el | carro.", "Broke down on me | the | car.", "My car broke down.",
          { flags: { 2: "Mexican: carro = car; auto is the neutral word." }, neutral: t("Se me descompuso | el | auto.", "Broke down on me | the | car.", "My car broke down."), spain: t("Se me ha averiado | el | coche.", "Has broken down on me | the | car.", "My car broke down.") }) },
        { id: "r_keys", s: t("No encontraba | mis | llaves.", "I couldn't find | my | keys.", "I couldn't find my keys.") },
        { id: "r_kid", s: t("Tuve que | llevar | a | mi | hijo | al | doctor.", "I had to | take | — | my | son | to the | doctor.", "I had to take my son to the doctor.",
          { flags: { 2: "Personal a: Spanish marks a person after the verb; English has no word here." }, spain: t("He tenido que | llevar | a | mi | hijo | al | médico.", "I've had to | take | — | my | son | to the | doctor.", "I had to take my son to the doctor.", { flags: { 2: "Personal a: Spanish marks a person after the verb; English has no word here." } }) }) },
      ],
    },
    eta: {
      lt: "Say when you'll get there",
      items: [
        { id: "eta_in", s: t("Llego | en | 20 | minutos.", "I arrive | in | 20 | minutes.", "I'll be there in 20 minutes.",
          { say: "Llego en veinte minutos.", flags: { 0: "llego: the present tense for something about to happen, very common." } }) },
        { id: "eta_by", s: t("Llego | como | a | las | 9:30.", "I arrive | about | at | — | 9:30.", "I'll be there around 9:30.",
          { say: "Llego como a las nueve y media.", flags: { 1: F_COMO, 3: "las before the hour; English has no word here." }, spain: t("Llego | sobre | las | 9:30.", "I arrive | around | — | 9:30.", "I'll be there around 9:30.", { flags: { 2: "las before the hour; English has no word here." }, say: "Llego sobre las nueve y media." }) }) },
        { id: "eta_halfhour", s: t("En | media | hora, | más o menos.", "In | half an | hour, | more or less.", "In about half an hour.") },
        { id: "eta_away", s: t("Estoy | a | 10 | minutos.", "I'm | at | 10 | minutes.", "I'm 10 minutes away.", { say: "Estoy a diez minutos." }) },
        { id: "eta_soon", s: t("Ya | casi | llego.", "Already | almost | I arrive.", "I'm almost there.") },
      ],
    },
    requests: {
      lt: "Ask them to start without you, or to wait",
      items: [
        { id: "start_without", s: t("Empiecen | sin | mí, | por favor.", "Start | without | me, | please.", "Please start without me.") },
        { id: "dont_wait", s: t("No me esperen.", "Don't wait for me.", "Don't wait for me.") },
        { id: "save_seat", s: t("¿Me | guarda | un | lugar?", "(for) me | will you save | a | seat?", "Could you save me a seat?", { spain: t("¿Me | guarda | un | sitio?", "(for) me | will you save | a | seat?", "Could you save me a seat?") }) },
        { id: "tell_team", s: t("¿Les | puede | avisar | a | los | demás?", "(to) them | can you | let know | — | the | others?", "Could you let the others know?",
          { flags: { 3: "a los demás repeats “les” (them); English has no word here." } }) },
        { id: "join_online", s: t("¿Me | puedo | conectar | en línea?", "(myself) | can I | connect | online?", "Can I join online?") },
      ],
    },
    room: {
      lt: "Check the room and where it is",
      items: [
        { id: "room_got_it", s: t("Ok, | sala | 302. | Entendido.", "Okay, | room | 302. | Got it.", "Okay, room 302. Got it.", { say: "Ok, sala trescientos dos. Entendido.", spain: t("Vale, | sala | 302. | Entendido.", "Okay, | room | 302. | Got it.", "Okay, room 302. Got it.", { say: "Vale, sala trescientos dos. Entendido." }) }) },
        { id: "q_building", s: t("¿Dónde | queda | la | sala | 302?", "Where | is | — | room | 302?", "Where's room 302?",
          { say: "¿Dónde queda la sala trescientos dos?", flags: { 1: "queda: is (located); ¿Dónde queda…? asks where a place is.", 2: "la before sala; English has no article here." }, spain: t("¿Dónde | está | la | sala | 302?", "Where | is | — | room | 302?", "Where's room 302?", { flags: { 2: "la before sala; English has no article here." }, say: "¿Dónde está la sala trescientos dos?" }) }) },
        { id: "q_room", s: t("Perdón, | ¿en | qué | sala?", "Sorry, | in | which | room?", "Sorry, which room?") },
      ],
    },
    apology: {
      lt: "Apologize",
      items: [
        { id: "sorry", s: t("Lo siento | mucho.", "I'm sorry | very much.", "I'm really sorry.") },
        { id: "wont_happen", s: t("No va | a | volver a pasar.", "It's not going | to | happen again.", "It won't happen again.") },
        { id: "sorry_trouble", s: t("Perdón | por | la | tardanza.", "Sorry | for | the | delay.", "Sorry for the delay.", { spain: t("Perdone | por | el | retraso.", "Sorry | for | the | delay.", "Sorry for the delay.") }) },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With your boss, usted is more polite: puede, disculpe, me guarda (puedes and disculpa are for friends).", better: "¿Me puede guardar un lugar?" },
  },

  merges: {
    // Spain's twins (12 Nov 2026)
    "ha pasado": { reason: "grammatical_fusion", split: "ha → has + pasado → happened: Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "han dicho": { reason: "grammatical_fusion", split: "han → have + dicho → told: Spain's present perfect for today's news; one English verb phrase.", minimal: "Auxiliary and participle." },
    "menos mal": { reason: "lexical_expression", split: "menos → less + mal → bad is a fixed phrase = thank goodness.", minimal: "Two words." },
    "se le ha hecho": { reason: "grammatical_fusion", split: "se le ha hecho (tarde) = it has gotten (late) on you; the pronouns and the perfect make one English phrase.", minimal: "Pronouns, auxiliary and participle." },
    "se me ha hecho": { reason: "grammatical_fusion", split: "se me ha hecho (tarde) = it has gotten (late) on me; the pronouns and the perfect make one English phrase.", minimal: "Pronouns, auxiliary and participle." },
    "he perdido": { reason: "grammatical_fusion", split: "he → have + perdido → missed/lost: Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "ha sonado": { reason: "grammatical_fusion", split: "ha → has + sonado → rung: Spain's present perfect for this morning.", minimal: "Auxiliary and participle." },
    "me he quedado": { reason: "grammatical_fusion", split: "me → myself + he → have + quedado → stayed: quedarse dormido = to oversleep, in Spain's present perfect.", minimal: "Pronoun, auxiliary and participle." },
    "se me ha averiado": { reason: "grammatical_fusion", split: "se me ha averiado = it has broken down on me; the pronouns and the perfect make one English phrase.", minimal: "Pronouns, auxiliary and participle." },
    "he tenido que": { reason: "grammatical_fusion", split: "he → have + tenido → had + que: tener que = have to, in the present perfect (I've had to).", minimal: "Auxiliary, participle and que." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time is a literal reading; = on time.", minimal: "Two words." },
    "se me hizo": { reason: "grammatical_fusion", split: "se → itself + me → to me + hizo → made: with tarde, “it got (late) on me”.", minimal: "Pronouns and verb only." },
    "se le hizo": { reason: "grammatical_fusion", split: "se → itself + le → to you + hizo → made: with tarde, “it got (late) on you”.", minimal: "Pronouns and verb only." },
    "se me fue": { reason: "grammatical_fusion", split: "se → itself + me → to me + fue → went: the accidental se is one English verb (left on me = I missed).", minimal: "Pronouns and verb only." },
    "se me descompuso": { reason: "grammatical_fusion", split: "se → itself + me → to me + descompuso → broke down: the accidental se is one English verb phrase.", minimal: "Pronouns and verb only." },
    "me quedé": { reason: "grammatical_fusion", split: "me → myself + quedé → I stayed: the reflexive verb is one English verb (I stayed / I ended up).", minimal: "Two words." },
    "no ha pasado": { reason: "grammatical_fusion", split: "no → not + ha → has + pasado → passed: the negated perfect is one English verb phrase (hasn't come by).", minimal: "Three words." },
    "tuve que": { reason: "grammatical_fusion", split: "tuve → I had + que → that is false; tener que = have to.", minimal: "Two words." },
    "en línea": { reason: "lexical_expression", split: "en → in + línea → line is a literal reading; = online.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is a literal reading; = about, roughly.", minimal: "Three words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; the discourse marker = by the way.", minimal: "Two words." },
    "así es": { reason: "lexical_expression", split: "así → like this + es → it is misreads the reply; = that's right.", minimal: "Two words." },
    "con cuidado": { reason: "lexical_expression", split: "con → with + cuidado → care: with a verb of moving = carefully (drive safe).", minimal: "Two words." },
    "lo peor": { reason: "lexical_expression", split: "lo → it + peor → worse is false; the neuter lo + adjective = the worst (thing).", minimal: "Two words." },
    "no puede ser": { reason: "lexical_expression", split: "no → not + puede → can + ser → be is a literal reading of the exclamation; = no way.", minimal: "Three words." },
    "se le ofrece": { reason: "grammatical_fusion", split: "se → itself + le → to you + ofrece → offers is false; ¿qué se le ofrece? = what do you need.", minimal: "The pronouns and the verb only." },
    "lo sé": { reason: "grammatical_fusion", split: "lo → it + sé → I know: English says “I know” without the object pronoun.", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little: the quantifier = a little.", minimal: "Two words." },
    "volver a pasar": { reason: "grammatical_fusion", split: "volver → to return + a → to + pasar → to happen is false; volver a + verb = do again (happen again).", minimal: "Three words." },
    "de siempre": { reason: "lexical_expression", split: "de → of + siempre → always is a literal reading; = the usual (one).", minimal: "Two words." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → not; = not yet.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say who's calling", step: "who", optional: true },
    { lt: "Say you're running late", done: (c) => !!(c.s.late || c.s.reason || c.s.eta || c.s.cantCome) },
    { lt: "Explain why you're late", step: "reason", optional: true },
    { lt: "Say when you'll get there", done: (c) => !!(c.s.eta || c.s.etaSkipped || c.s.cantCome) },
    { lt: "Say whether to start without you", step: "plan", optional: true, when: (c) => !!c.s.planAsk },
  ],

  steps: [
    { id: "opening", done: (c) => !!c.s.opened,
      ask: (c) => {
        if (!c.s.openAsked) { c.s.openAsked = true; c.say(c.s.callerId ? "hello_id" : "hello"); return; }
        c.say("hello_again");
        // "¿Quién habla?" asks for the name: a bare "Ryan." answers it (at the first "¿Bueno?" a bare word is not
        // read as a name: "Ingeniero", "Tarde")
        if (!c.s.callerId) c.expect({
          id: "who_q", optional: true, hints: ["identify"], suggest: [{ lt: "Say who's calling", hint: "identify" }],
          expects: ["name_ctx", "identify", "greet_harris", "late", "reason", "eta", "on_way", "cant_come", "identify_ctx"],
          on: { name_ctx: (cc, sl, sg) => { runningLate.handlers.name_ctx(cc, sl, sg); } },
        });
      },
      expects: ["identify", "greet_harris", "late", "reason", "eta", "on_way", "cant_come", "identify_ctx"],
      suggest: [
        { lt: "Say hello and who's calling", hint: "identify" },
        { lt: "Say you're running late", hint: "late" },
      ],
      yes: (c) => { c.s.opened = true; },
      no: (c) => { c.s.opened = true; c.s.notOk = true; } },
    { id: "who", when: (c) => !c.s.callerId && !c.s.name, done: (c) => !!c.s.name,
      ask: (c) => { c.say(c.s.whoAsked ? "who_again" : "who"); c.s.whoAsked = true; },
      expects: ["identify", "name_ctx", "identify_ctx"],
      suggest: [{ lt: "Say who's calling", hint: "identify" }] },
    { id: "late", done: (c) => !!(c.s.late || c.s.reason || c.s.eta || c.s.cantCome || c.s.notLate || c.s.ahorita),
      ask: (c) => c.say(c.s.notOk ? "ask_late_wrong" : "ask_late"),
      expects: ["late", "reason", "eta", "cant_come"],
      suggest: [
        { lt: "Say you're running late", hint: "late" },
        { lt: "Explain why", hint: "reason" },
      ] },
    { id: "reason", when: (c) => !!c.s.late && c.s.askReason && !c.s.cantCome, done: (c) => !!c.s.reason || !!c.s.reasonSkipped,
      ask: (c) => c.say("ask_reason"),
      expects: ["reason", "late"],
      suggest: [{ lt: "Explain why you're late", hint: "reason" }],
      yes: (c) => { c.s.reasonSkipped = true; c.say("ack"); },
      no: (c) => { c.say("ask_what"); c.hold(); },
      help: (c) => { c.s.reasonSkipped = true; c.say("react_generic"); } },
    { id: "eta", when: (c) => !!c.s.late && !c.s.cantCome, done: (c) => !!c.s.eta || !!c.s.etaSkipped,
      ask: (c) => {
        // "ahorita llego": how long is ahorita? (asked once; a bare number then means minutes)
        if (c.s.ahorita && !c.s.ahoritaAsked) { c.s.ahoritaAsked = true; c.s.etaAsk = "long"; c.say("ahorita_q"); return; }
        // which question decides what a bare "Diez." means (bareEta)
        c.s.etaAsk = c.s.etaVague || c.chance(1 / 3) ? "long" : "when";
        c.say(c.s.etaVague ? "ask_eta_vague" : c.s.etaAsk === "long" ? "ask_eta_long" : "ask_eta");
      },
      expects: ["eta", "eta_ctx", "late", "on_way", "eta_unknown_ctx", "send_location", "eta_neg_ctx"],
      suggest: [{ lt: "Say when you'll get there", hint: "eta" }],
      help: (c) => { c.s.etaSkipped = true; c.say("ok_fine"); } },
    { id: "plan", when: (c) => !!c.s.late && !c.s.cantCome, done: (c) => !!c.s.planned,
      ask: (c) => {
        maybeComplete(c);
        if (c.s.planAsk) {
          c.say("plan_ask");
          c.expect(planQ());
          return;
        }
        c.s.planned = c.s.planWait ? "wait" : "start";
        c.say(c.s.planWait ? "plan_wait" : "plan_start");
        // the room news follows right away (the room step, so a bare "Trescientos dos" is understood after it)
        if (c.s.roomTwist && !c.s.roomSaid) { c.ask("room"); return; }
        if (c.chance(0.35)) c.say("thanks_letting");
      },
      suggest: [
        { lt: "Ask them to start without you, or to wait", hint: "requests" },
        { lt: "Apologize", hint: "apology" },
      ] },
    { id: "room", when: (c) => !!c.s.roomTwist && !!c.s.planned, done: (c) => !!c.s.roomSaid,
      ask: (c) => { roomNews(c); },
      expects: ["confirm_room", "confirm_room_ctx", "ask_building", "ask_room"],
      suggest: [
        { lt: "Check the room and where it is", hint: "room" },
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
      const first = !c.s.name;
      if (slots.name) c.s.name = slots.name;
      if (!c.s.callerId && c.s.name && first) sayOnce(c, "name_ack");
      else if (c.s.callerId && c.step === "late" && !c.s.late) sayOnce(c, "yes_hi");
    },
    its_me(c) { if (!mark(c)) return; if (c.s.callerId) { c.s.name = c.s.name || "?"; } else { c.say("who_again"); c.hold(); } },
    identify_ctx(c, slots, seg) { runningLate.handlers.identify(c, slots, seg); },
    name_ctx(c, slots) {
      if (!mark(c)) return;
      if (!slots.name) { c.say("who_again"); c.hold(); return; }
      const first = !c.s.name;
      c.s.name = slots.name;
      if (first) sayOnce(c, "name_ack");
    },
    greet_harris(c) { if (!mark(c)) return; },
    is_harris(c) { if (!mark(c)) return; c.say("is_harris"); },
    late(c, slots) {
      if (!mark(c)) return;
      if (turnSegments(c).some((x) => x.intent === "cant_come")) return;
      c.s.late = true;
      // "¿Y qué pasó?" "Nada, se me hizo tarde.": no reason to give
      if (!slots.why && c.step === "reason" && !c.s.reason && !c.s.reasonSkipped) { c.s.reasonSkipped = true; sayOnce(c, "ack"); }
      if (slots.why) doReason(c, slots.why);
      if (typeof slots.number === "number") doEta(c, { number: slots.number, __tags: [] });
      if (slots.eta) doEta(c, slots.eta);
    },
    reason(c, slots) {
      if (!mark(c)) return;
      // "Hoy no puedo ir, estoy enfermo": the reason belongs to the can't-come piece
      if (turnSegments(c).some((x) => x.intent === "cant_come")) return;
      doReason(c, slots.why);
      if (slots.eta) doEta(c, slots.eta);
    },
    eta(c, slots) {
      if (!mark(c)) return;
      const v = slots.eta;
      // a bare "Veinte." read through a missing "a": a count, or an hour by the question (bareEta)
      if (v?.time && !v.time.m && !v.time.ampm && !/\b(la|las|para|antes|despues)\b/.test(plain(c.heard))) { doEta(c, bareEta(c, { time: v.time }, v.__tags || [])); return; }
      if (v) doEta(c, v);
    },
    eta_ctx(c, slots, seg) {
      if (!mark(c)) return;
      const v = bareEta(c, slots, seg?.tags ?? []);
      if (v) doEta(c, v);
    },
    on_way(c) {
      if (!mark(c)) return;
      c.s.late = true;
      if (/\b(camion|autobus|colectivo|taxi|uber|tren|caminando|a pie)\b/.test(plain(c.heard))) c.s.noCar = true;
      // ("Voy manejando, le llamo luego.": no question right before the goodbye)
      if (c.s.eta || leaving(c)) return;
      c.s.etaVague = true;
      // alone, "Ya voy en camino" gets "¿Como en cuánto tiempo?" now; with a time ("Voy caminando, llego en veinte
      // minutos") or a reason ("Estoy en el camión y hay mucho tráfico") in the same breath, the rest of the turn
      // comes first and the steps ask what is still missing, last
      if (turnSegments(c).every((x) => x.intent === "on_way")) c.ask("eta");
    },
    not_late(c, _slots, seg) {
      if (!mark(c)) return;
      // "No voy a llegar tarde" / "No, voy a llegar tarde": after "¿Todo bien?" the "No," reading is the likely one;
      // at "Dígame" Montes asks which
      // "No, no voy a llegar tarde": two noes leave one reading, not late
      const twoNoes = /^\W*no\W+no\b/.test(plain(c.heard));
      if (seg?.tags?.includes("amb") && !c.s.late && !twoNoes) {
        if (c.step === "opening" && c.s.callerId) { c.s.notOk = true; c.s.late = true; return; }
        c.say("amb_late");
        c.expect({
          id: "amb_q", hints: ["late"], suggest: [{ lt: "Say whether you'll be late", hint: "late" }], expects: ["late", "not_late", "amb_ctx"],
          yes: (cc) => { cc.s.late = true; cc.say("ack"); },
          no: (cc) => { cc.s.notLate = true; cc.say("not_late_resp"); },
          on: {
            late: (cc, sl) => {
              // "No, llego a tiempo" without its comma reads "No llego a tiempo": here the answer is "on time"
              if (/^\W*no\W+(llego|voy a llegar|voy a estar ahi|estoy ahi) a tiempo\b/.test(plain(cc.heard))) { cc.s.notLate = true; cc.say("not_late_resp"); return; }
              runningLate.handlers.late(cc, sl, { intent: "late", slots: sl, tags: [] });
            },
            not_late: (cc) => { cc.s.notLate = true; cc.say("not_late_resp"); },
            amb_ctx: (cc, _sl, sg) => {
              if (sg?.tags?.includes("ontime")) { cc.s.notLate = true; cc.say("not_late_resp"); } else { cc.s.late = true; cc.say("ack"); }
            },
          },
          ask: (cc) => cc.say("amb_late"),
        });
        return;
      }
      if (c.s.late) { c.say("ack"); return; }
      c.s.notLate = true;
      c.say("not_late_resp");
    },
    cant_come(c, slots) {
      if (!mark(c)) return;
      const why = slots.why ?? turnSegments(c).find((x) => x.intent === "reason")?.slots?.why;
      if (why) { cantCome(c, why); return; }
      c.say("cant_come_q");
      c.expect({
        id: "cant_q", expects: ["just_late", "just_late_ctx", "late", "cant_ctx"], hints: ["late"],
        suggest: [{ lt: "Say if you're just running late or can't come at all", hint: "late" }],
        yes: (cc) => { cantCome(cc); },
        no: (cc) => { cc.s.late = true; cc.say("just_late"); },
        on: {
          just_late: (cc) => { cc.s.late = true; cc.say("just_late"); },
          just_late_ctx: (cc) => { cc.s.late = true; cc.say("just_late"); },
          cant_come: (cc) => { cantCome(cc); },
          cant_ctx: (cc) => { cantCome(cc); },
          late: (cc, sl) => { runningLate.handlers.late(cc, sl, { intent: "late", slots: sl, tags: [] }); },
          // "No, llego en media hora": coming after all
          eta: (cc, sl, sg) => { runningLate.handlers.eta(cc, sl, sg); },
          on_way: (cc, sl, sg) => { runningLate.handlers.on_way(cc, sl, sg); },
          reason: (cc, sl) => {
            if (ynLead(cc) === "no") { cc.s.late = true; doReason(cc, sl.why); return; }
            cantCome(cc, sl.why);
          },
        },
        ask: (cc) => cc.say("cant_come_q"),
      });
    },
    // outside "¿Entonces hoy va a faltar?" ("Sí voy", "Solo voy tarde"): plain lateness
    just_late(c, slots, seg) { runningLate.handlers.late(c, slots, seg); },
    start_without(c) { if (!mark(c)) return; c.s.late = true; planStart(c); },
    // (the three below are expected only at "¿Empezamos sin usted?", where planQ answers them)
    start_ctx(c) { if (!mark(c)) return; planStart(c); },
    wait_ctx(c) { if (!mark(c)) return; planWait(c); },
    plan_amb_ctx(c) { if (!mark(c)) return; c.say("amb_plan"); },
    wait_for_me(c) { if (!mark(c)) return; c.s.late = true; planWait(c); },
    save_seat(c) { if (!mark(c)) return; c.say("seat_alone"); },
    tell_team(c) { if (!mark(c)) return; c.say("ok_tell"); },
    join_online(c) { if (!mark(c)) return; c.say("ok_link"); },
    will_call(c) { if (!mark(c)) return; c.say("ok_call"); },
    apologize(c) {
      if (!mark(c)) return;
      sayOnce(c, /volver a pasar|vuelve a pasar|volvera a/.test(plain(c.heard)) ? "wont_happen_ok" : "sorry_ok", undefined, "apology");
    },
    ask_room(c) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_usual"); return; }
      if (!roomNews(c)) c.say("room_num");
    },
    ask_ok(c) { if (!mark(c)) return; c.say(/\b(enojad[oa]|enojo|molest[oa])\b/.test(plain(c.heard)) ? "not_angry" : "no_problem"); },
    confirm_room(c, slots) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_usual"); return; }
      if (roomNews(c)) return;
      if (typeof slots.room === "string" && slots.room !== "302") c.say("room_wrong");
      // "Ok, en el otro edificio, sala 302": the building part is corrected (ask_building), not agreed with
      else if (!turnSegments(c).some((x) => x.intent === "ask_building")) c.say("room_right");
    },
    confirm_room_ctx(c, slots, seg) { runningLate.handlers.confirm_room(c, slots, seg); },
    ask_building(c) {
      if (!mark(c)) return;
      if (!c.s.roomTwist) { c.say("room_here"); return; }
      roomNews(c);
      // there is no building across the street: "¿Dónde está el otro edificio?" / "Ok, en el otro edificio" get a no
      sayOnce(c, /\b(otro edificio|enfrente|cruzando)\b/.test(plain(c.heard)) ? "building_no" : "building", undefined, "building");
    },
    ask_mtg_time(c) { if (!mark(c)) return; c.say(/\bnueve\b/.test(plain(c.heard)) ? "mtg_time_yes" : "mtg_time"); },
    ask_started(c) { if (!mark(c)) return; c.say("not_started"); },
    ask_team(c) { if (!mark(c)) return; c.say("team_almost"); },
    send_location(c) { if (!mark(c)) return; c.say(c.s.helpSent ? "ok_call" : "ack"); },
    no_help_ctx(c) { if (!mark(c)) return; c.say("help_any"); },
    eta_neg_ctx(c) {
      if (!mark(c)) return;
      // "No llego en veinte minutos, más bien en media hora": the time after it is the answer
      if (turnSegments(c).some((x) => x.intent === "eta" || x.intent === "eta_ctx")) return;
      c.s.etaVague = true; c.s.etaAsk = "long"; c.say("ask_eta_vague"); c.hold();
    },
    // "No sé, depende del tráfico" at the time question: no time; Montes asks to be told
    eta_unknown_ctx(c) { if (!mark(c)) return; c.s.etaSkipped = true; c.s.late = true; c.say("eta_unknown"); },
    // Situation-level versions of the global how-are-you answers. With caller ID Montes opens with "¿Todo bien?": a
    // "Sí, todo bien, gracias" or "Bien, ¿y usted?" opens the call (no "¿Bueno? ¿Quién habla?" again), and "Más o
    // menos" gets "¡Uy! ¿Qué pasó?"; at the reason question "¿Todo bien?" a "todo bien" skips the reason.
    g_howareyou_answer(c) {
      if (!mark(c)) return;
      if (/\b(usted|tu|ti)\b/.test(plain(c.heard))) c.say("g_asked_back");
      if (c.step === "reason" && !c.s.reason && !c.s.reasonSkipped) { c.s.reasonSkipped = true; sayOnce(c, "ack"); }
    },
    g_howareyou_bad(c) {
      const opening = !c.s.opened;
      if (!mark(c)) return;
      if (opening) c.s.notOk = true;
      else c.say("g_sorry_to_hear");
    },
    // "No sé" to the time or the reason question: Montes takes it and goes on (the global "Bueno, no se preocupe"
    // held the call there); elsewhere as the global one
    g_dontknow(c) {
      if (!mark(c)) return;
      if (c.step === "eta" && !c.s.eta && !c.s.etaSkipped) { c.s.etaSkipped = true; c.s.late = true; c.say("eta_unknown"); return; }
      if (c.step === "reason" && !c.s.reason && !c.s.reasonSkipped) { c.s.reasonSkipped = true; c.say("react_generic"); return; }
      c.say("g_take_time"); c.hold();
    },
    // Situation-level versions of two global skills: a phone call ends with Montes's own goodbye (and never re-asks
    // an open question after it), and a bare "¡Hola!" is answered by the opening step (or, with caller ID, by a short
    // greeting before "Dígame").
    g_bye(c) { bye(c); },
    g_hello(c) {
      if (c.s.callerId && !c.s.opened) { c.s.opened = true; c.say("hi_short"); }
    },
    // "Buena idea" only answers "¿Necesita ayuda?"; elsewhere "Me voy en camión" says the learner is on the way
    taxi_ok(c, slots, seg) { if (c.s.reason === "car") { if (mark(c)) taxiOk(c); } else runningLate.handlers.on_way(c, slots, seg); },
    thanks_info(c) { if (!mark(c)) return; /* Montes goes on to the goodbye */ },
    thanks_understanding(c) { if (!mark(c)) return; c.say("g_welcome"); },
    bye_meeting(c) { bye(c); },
    help_request(c) { if (!mark(c)) return; sendHelp(c); },
    taxi_ok_ctx(c) { if (!mark(c)) return; taxiOk(c); },
    cant_ctx(c) { if (!mark(c)) return; cantCome(c); },
    just_late_ctx(c) { if (!mark(c)) return; c.s.late = true; c.say("just_late"); },
    english_q(c) { if (!mark(c)) return; c.say("english"); },
    amb_ctx(c) { if (!mark(c)) return; c.say("ack"); },
    no_help(c) { if (!mark(c)) return; c.say("help_no"); },
  },

  finish: (c) => {
    maybeComplete(c);
    if (c.s.cantCome) c.say("take_care");
    else if (!c.s.notLate) {
      // traffic or rain on the road: "¡Y maneje con cuidado!", unless the learner isn't driving (the car broke down,
      // a taxi, the bus, a colectivo, on foot)
      const drive = (c.s.reason === "traffic" || c.s.reason === "rain") && !c.s.noCar;
      if (drive) c.s.driveSaid = true;
      c.say(drive ? "closing_drive" : "closing");
    }
    const closing: Pending = {
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => bye(cc),
        g_bye: (cc) => bye(cc),
        apologize: (cc) => { sayOnce(cc, "sorry_ok", undefined, "apology"); bye(cc); },
        g_ok: (cc) => bye(cc),
        bye_meeting: (cc) => bye(cc),
        thanks_info: (cc) => bye(cc),
        thanks_understanding: (cc) => bye(cc),
        // the room news, checked after the goodbye has started: answered, and the goodbye stays open
        confirm_room: (cc, sl, seg) => { runningLate.handlers.confirm_room(cc, sl, seg); cc.expect(closing); },
        confirm_room_ctx: (cc, sl, seg) => { runningLate.handlers.confirm_room(cc, sl, seg); cc.expect(closing); },
        ask_room: (cc, sl, seg) => { runningLate.handlers.ask_room(cc, sl, seg); cc.expect(closing); },
        ask_building: (cc, sl, seg) => { runningLate.handlers.ask_building(cc, sl, seg); cc.expect(closing); },
        // "¿Cómo está?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => bye(cc),
      no: (cc) => bye(cc),
    };
    c.expect(closing);
  },

  tests: [
    // every hint construction
    { say: "Buenos días, ingeniero, habla Ryan.", intent: "identify", slots: { name: "Ryan" } },
    { say: "Ingeniero, soy Ryan.", intent: "identify", slots: { name: "Ryan" } },
    { say: "Voy tarde.", intent: "late" },
    { say: "Voy un poco tarde.", intent: "late" },
    { say: "Se me hizo tarde.", intent: "late" },
    { say: "Voy a llegar como 20 minutos tarde.", intent: "late", slots: { number: 20 } },
    { say: "No voy a llegar a tiempo.", intent: "late", not: ["not_late"] },
    { say: "Le llamo para avisarle que voy a llegar tarde.", intent: "late" },
    { say: "Perdón, ingeniero, pero voy tarde.", intent: "late" },
    { say: "Se me fue el camión.", intent: "reason", step: "reason" },
    { say: "Se me fue el autobús.", intent: "reason", step: "reason" },
    { say: "Estoy atorado en el tráfico.", intent: "reason" },
    { say: "Estoy atrapada en el trafico.", intent: "reason" },
    { say: "No sonó mi despertador.", intent: "reason", not: ["not_late"] },
    { say: "Me quedé dormida.", intent: "reason" },
    { say: "Está lloviendo muchísimo.", intent: "reason" },
    { say: "El colectivo no ha pasado.", intent: "reason" },
    { say: "Se me descompuso el carro.", intent: "reason" },
    { say: "No encontraba mis llaves.", intent: "reason" },
    { say: "Tuve que llevar a mi hijo al doctor.", intent: "reason" },
    { say: "Llego en 20 minutos.", intent: "eta" },
    { say: "Llego como a las 9:30.", intent: "eta", slots: { eta: { time: { h: 9, m: 30 } } } },
    { say: "En media hora, más o menos.", intent: "eta", step: "eta" },
    { say: "Estoy a 10 minutos.", intent: "eta" },
    { say: "Ya casi llego.", intent: "eta" },
    { say: "Empiecen sin mí, por favor.", intent: "start_without" },
    { say: "No me esperen.", intent: "start_without", not: ["wait_for_me"] },
    { say: "¿Me guarda un lugar?", intent: "save_seat" },
    { say: "¿Les puede avisar a los demás?", intent: "tell_team" },
    { say: "¿Me puedo conectar en línea?", intent: "join_online" },
    { say: "Ok, sala 302. Entendido.", intent: "confirm_room", step: "room", slots: { room: "302" } },
    { say: "¿Dónde está el otro edificio?", intent: "ask_building" },
    { say: "Perdón, ¿en qué sala?", intent: "ask_room" },
    { say: "Lo siento mucho.", intent: "apologize" },
    { say: "No va a volver a pasar.", intent: "apologize" },
    { say: "Perdón por la tardanza.", intent: "apologize" },
    // more ways to say it
    { say: "Ingeniero, fíjese que voy a llegar un poco tarde a la junta.", intent: "late" },
    { say: "No creo que llegue a tiempo.", intent: "late", not: ["not_late"] },
    { say: "Me voy a perder el principio de la reunión.", intent: "late" },
    { say: "Hubo un choque en la carretera.", intent: "reason" },
    { say: "Se me ponchó una llanta.", intent: "reason" },
    { say: "Fui a dejar a los niños a la escuela.", intent: "reason" },
    { say: "Amanecí enfermo.", intent: "reason" },
    { say: "Ya mero llego.", intent: "eta" },
    { say: "Me faltan como quince minutos.", intent: "eta", slots: { eta: { number: 15 } } },
    { say: "Entre diez y quince minutos.", intent: "eta", slots: { eta: { number: 10, n2: 15 } } },
    { say: "No sé, creo que en veinte minutos.", intent: "eta" },
    { say: "Veinte.", intent: "eta_ctx", step: "eta", slots: { number: 20 } },
    { say: "Ahorita llego.", intent: "eta", step: "eta" },
    { say: "Ya voy en camino.", intent: "on_way" },
    { say: "Voy manejando.", intent: "on_way" },
    { say: "¿Hablo con el ingeniero Montes?", intent: "is_harris" },
    { say: "Ryan", intent: "name_ctx", step: "who" },
    { say: "Ryan", intent: "none" },
    { say: "Tres cero dos.", intent: "confirm_room_ctx", step: "room", slots: { room: "302" } },
    { say: "Trescientos dos.", intent: "confirm_room_ctx", step: "room", slots: { room: "302" } },
    { say: "Gracias por su comprensión.", intent: "thanks_understanding" },
    { say: "Nos vemos en la junta.", intent: "bye_meeting" },
    { say: "Le aviso cuando esté cerca.", intent: "will_call" },
    { say: "Sí, ¿alguien puede pasar por mí?", intent: "help_request" },
    { say: "No, gracias, ya pedí un taxi.", intent: "taxi_ok" },
    // tú to the boss, Spain forms
    { say: "Te llamo para decirte que llego tarde.", intent: "late" },
    { say: "¿Me puedes guardar un lugar?", intent: "save_seat" },
    { say: "Empezad sin mí.", intent: "start_without" },
    { say: "No me esperéis.", intent: "start_without", not: ["wait_for_me"] },
    { say: "Mi coche no arranca.", intent: "reason" },
    { say: "Me he quedado dormido.", intent: "reason" },
    { say: "Estoy en un atasco.", intent: "reason" },
    // meaning safety
    { say: "No empiecen sin mí.", intent: "wait_for_me", not: ["start_without"] },
    { say: "No, no me esperen.", intent: "start_without", not: ["wait_for_me"] },
    { say: "No es necesario que me esperen.", intent: "start_without", not: ["wait_for_me"] },
    { say: "Prefiero que me esperen.", intent: "wait_for_me", not: ["start_without"] },
    { say: "Voy a llegar a tiempo.", intent: "not_late", not: ["late"] },
    { say: "Hoy no voy a poder ir.", intent: "cant_come", not: ["late"] },
    { say: "No me guarde lugar.", intent: "none", not: ["save_seat"] },
    { say: "No hay tráfico.", intent: "none", not: ["reason"] },
    { say: "No voy en camino.", intent: "none", not: ["on_way"] },
    { say: "No voy a tomar un taxi.", intent: "none", not: ["taxi_ok"] },
    { say: "No necesito un taxi.", intent: "no_help", not: ["taxi_ok"] },
    { say: "¿Habla inglés?", intent: "english_q", not: ["identify", "name_ctx"] },
    { say: "¿Y si empiezan sin mí?", intent: "start_without", not: ["wait_for_me"] },
    { say: "Mejor no me esperen.", intent: "start_without", not: ["wait_for_me"] },
    { say: "Como usted quiera.", intent: "none", not: ["start_without"] },
    { say: "Voy a tardar un poco.", intent: "late" },
    { say: "No voy a llegar.", intent: "none", not: ["not_late", "late"] },
    { say: "No me quedé dormido.", intent: "none", not: ["reason"] },
    // review: hold on, two noes, bare words that are not names, corrections
    { say: "Espere, ¿en qué sala?", intent: "g_wait", not: ["wait_for_me"] },
    { say: "Esperen.", intent: "g_wait", not: ["wait_for_me"] },
    { say: "No, no voy a llegar tarde.", intent: "not_late", not: ["late"] },
    { say: "No llego tarde, voy a tiempo.", intent: "not_late", not: ["late"] },
    { say: "No puedo llegar a tiempo.", intent: "late", not: ["cant_come", "not_late"] },
    { say: "No voy a poder llegar a tiempo a la junta.", intent: "late", not: ["cant_come", "not_late"] },
    { say: "Ingeniero.", intent: "greet_harris", step: "opening", not: ["identify_ctx"] },
    { say: "Voy a llegar unos minutos tarde.", intent: "late", step: "opening", not: ["identify_ctx", "eta"] },
    { say: "¿Y si nadie viene?", intent: "none", step: "opening", not: ["identify_ctx"] },
    { say: "No, mejor empiecen.", intent: "start_without", not: ["wait_for_me"] },
    { say: "No empiecen todavía.", intent: "wait_for_me", not: ["start_without"] },
    { say: "No es por el tráfico, se me fue el camión.", intent: "reason" },
    { say: "Llego tarde porque llovió mucho.", intent: "late", step: "opening", not: ["identify_ctx"] },
    { say: "Tengo gripa.", intent: "reason" },
    { say: "Se descompuso mi carro.", intent: "reason" },
    { say: "No sé, tal vez una hora.", intent: "eta" },
    { say: "En dos horas.", intent: "eta", slots: { eta: { number: 2 } } },
    { say: "¿Hay algún problema?", intent: "ask_ok" },
    // audit (5 Nov 2026): room 302 is on the third floor of this tower (no building across the street)
    { say: "¿Dónde queda la sala 302?", intent: "ask_building", step: "room", not: ["confirm_room"] },
    { say: "¿En qué piso?", intent: "ask_building", not: ["ask_room"] },
    { say: "Ok, sala 302, en el tercer piso.", intent: "confirm_room", step: "room", slots: { room: "302" } },
    { say: "Ok, en el tercer piso.", intent: "confirm_room", step: "room" },
    { say: "En el otro edificio.", intent: "ask_building", step: "room", not: ["confirm_room"] },
    { say: "¿Es en el edificio de enfrente?", intent: "ask_building", not: ["confirm_room"] },
    // audit: the phone asks, side questions, times
    { say: "¿Está el ingeniero Montes?", intent: "is_harris", step: "opening" },
    { say: "¿Con el ingeniero Montes, por favor?", intent: "is_harris", step: "opening" },
    { say: "Habla Ryan, de Línea Clara.", intent: "identify", slots: { name: "Ryan" } },
    { say: "¿Ya llegaron todos?", intent: "ask_team", not: ["eta"] },
    { say: "¿A qué hora es la junta?", intent: "ask_mtg_time", not: ["eta"] },
    { say: "¿La junta es a las nueve?", intent: "ask_mtg_time", not: ["eta"] },
    { say: "¿Ya empezó la junta?", intent: "ask_started" },
    { say: "¿Está enojado?", intent: "ask_ok" },
    { say: "¿Se enojó?", intent: "ask_ok" },
    { say: "¿Me puede mandar un taxi?", intent: "help_request" },
    { say: "Ahorita se la mando.", intent: "send_location", not: ["eta"] },
    { say: "No sé, depende del tráfico.", intent: "eta_unknown_ctx", step: "eta", not: ["eta"] },
    { say: "Menos de diez minutos.", intent: "eta", step: "eta", slots: { eta: { number: 10 } } },
    { say: "Menos de media hora.", intent: "eta", step: "eta" },
    { say: "Llego en la tarde.", intent: "eta" },
    { say: "Voy a llegar tarde.", intent: "late", not: ["eta"] },
    { say: "Con Ryan.", intent: "name_ctx", step: "who", slots: { name: "Ryan" } },
    { say: "Ryan, de su equipo.", intent: "name_ctx", step: "who", slots: { name: "Ryan" } },
    { say: "No llego en veinte minutos.", intent: "eta_neg_ctx", step: "eta", not: ["eta"] },
    { say: "No creo que llegue antes de las diez.", intent: "eta", step: "eta", slots: { eta: { time: { h: 10, m: 0 } } } },
    { say: "Llegaré tarde.", intent: "late", not: ["eta"] },
    { say: "Llego hasta las diez.", intent: "eta", slots: { eta: { time: { h: 10, m: 0 } } } },
    // must not be understood
    { say: "Quiero una pizza con piña.", intent: "none" },
    { say: "El perro azul canta en la playa.", intent: "none" },
    { say: "Mi gato come tortillas.", intent: "none" },
  ],

  sims: [
    // Montes asks why (the reason is scripted) and decides about the meeting himself
    { name: "happy path", setup: (s) => { s.askReason = true; s.planAsk = false; s.roomTwist = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. Voy tarde.", "Se me fue el camión.", "Llego como en veinte minutos.", "Gracias, ¡hasta luego!"],
      expect: { complete: true, state: { reason: "bus", late: true } }, auto: AUTO },
    // "¿Empezamos sin usted?" on every seed: the apology first, then the seat request answers it
    { name: "all at once", setup: (s) => { s.planAsk = true; s.roomTwist = false; },
      turns: ["Buenos días, ingeniero. Habla Ryan. Estoy atorado en el tráfico, llego como a las nueve y media.", "Lo siento mucho. No va a volver a pasar.", "¿Me guarda un lugar?", "¡Hasta luego!"],
      expect: { complete: true, state: { reason: "traffic", planned: "start" } }, auto: AUTO },
    // no caller ID (Montes asks who's calling), Montes asks why, and "¿Empezamos sin usted?" gets a short "Sí, por favor."
    { name: "short answers and questions", setup: (s) => { s.callerId = false; s.askReason = true; s.planAsk = true; s.roomTwist = false; },
      turns: ["¡Hola!", "Voy un poco tarde.", "Ryan Miller.", "No sonó mi despertador.", "Ya voy en camino.", "Diez minutos.", "¿En qué sala es la junta?", "Sí, por favor.", "Ok, gracias. ¡Adiós!"],
      expect: { complete: true, state: { name: "Ryan Miller", reason: "alarm", planned: "start", eta: { min: 10 } } }, auto: AUTO },
    { name: "car trouble, then wait for me", setup: (s) => { s.planAsk = true; s.roomTwist = false; },
      turns: ["Hola, ingeniero, soy Ryan. Se me descompuso el carro.", "No, voy a tomar un taxi.", "Llego en cuarenta minutos.", "¿Me pueden esperar?", "Gracias, ¡hasta luego!"],
      expect: { complete: true, state: { reason: "car", planned: "wait" } }, auto: AUTO },
    { name: "hanging up while driving", setup: (s) => { s.planAsk = false; s.roomTwist = false; },
      turns: ["Hola, ingeniero, habla Ryan. Estoy atorada en el tráfico.", "Como en veinte minutos.", "Empiecen sin mí, por favor.", "Perdón, me tengo que ir, voy manejando."],
      expect: { complete: true, state: { planned: "start" } }, auto: AUTO },
    // "Ahorita llego": Montes asks how long ahorita is, and a bare number is minutes
    { name: "ahorita, then a bare number", setup: (s) => { s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. Se me hizo tarde.", "Ahorita llego.", "Como quince.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { ahoritaAsked: true, eta: { min: 15 } } }, auto: AUTO },
    // the twist: the meeting is in room 302, on the third floor (not the usual 204)
    { name: "room 302 on the third floor (twist forced)", setup: (s) => { s.roomTwist = true; s.planAsk = false; s.callerId = true; s.askReason = true; },
      turns: ["Ingeniero, habla Ryan. Voy tarde, hay mucho tráfico.", "En media hora.", "¿Dónde queda la sala 302?", "Ok, sala 302, en el tercer piso. Entendido.", "Gracias, nos vemos en la junta."],
      expect: { complete: true, state: { roomSaid: true, eta: { min: 30 } } }, auto: AUTO },
    // audit: a learner who expects the English original's other building is told no, and "¿En qué piso?" gets the floor
    { name: "the other building? No, the third floor (twist forced)", setup: (s) => { s.roomTwist = true; s.planAsk = false; s.callerId = true; s.askReason = false; },
      turns: ["Ingeniero, voy tarde. Llego en veinte minutos.", "Ok, en el otro edificio, sala 302.", "¿En qué piso?", "Gracias, hasta luego."],
      expect: { complete: true, state: { roomSaid: true, eta: { min: 20 } } }, auto: AUTO },
    { name: "room twist, a wrong number and a bare number (twist forced)", setup: (s) => { s.roomTwist = true; s.planAsk = true; s.askReason = false; },
      turns: ["Hola, soy Ryan. Voy a llegar tarde.", "Llego en quince minutos.", "No me esperen.", "Sala doscientos tres.", "Tres cero dos.", "Gracias por avisarme. Hasta luego."],
      expect: { complete: true, state: { roomSaid: true, planned: "start" } }, auto: AUTO },
    { name: "can't come today, sick", setup: (s) => { s.roomTwist = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. Hoy no voy a poder ir, amanecí enfermo.", "Gracias por su comprensión."],
      expect: { complete: true, state: { cantCome: true, reason: "sick" } }, auto: AUTO },
    { name: "can't come? No, just late", setup: (s) => { s.roomTwist = false; s.planAsk = false; s.askReason = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. No voy a poder llegar a la junta.", "No, voy a llegar más tarde.", "Como a las diez.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { cantCome: undefined, late: true } }, auto: AUTO },
    // "No, voy a llegar tarde" after "¿Todo bien?": the "No," reading
    { name: "\"No, voy a llegar tarde\" after \"¿Todo bien?\"", setup: (s) => { s.callerId = true; s.askReason = true; s.planAsk = false; s.roomTwist = false; },
      turns: ["No voy a llegar tarde.", "Está lloviendo muchísimo.", "En una hora.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { late: true, reason: "rain", notLate: undefined } }, auto: (({ opening: _o, ...rest }) => rest)(AUTO) },
    // "Así está bien" at "¿Empezamos sin usted?" could be either: Montes asks again
    { name: "\"Así está bien\" at the plan question, then a clear answer", setup: (s) => { s.planAsk = true; s.roomTwist = false; s.askReason = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. Voy a llegar como diez minutos tarde.", "Así está bien.", "Mejor espérenme, por favor.", "Gracias por su comprensión."],
      expect: { complete: true, state: { planned: "wait", planAmb: true } }, auto: AUTO },
    // "Dígame" → "No voy a llegar tarde": Montes asks which; "No, llego a tiempo" (its comma lost) is on time
    // review: "¿Entonces hoy va a faltar?" "Hoy no." = just late (a yes/no question without a negation)
    { name: "can't come? Not today, just late", setup: (s) => { s.roomTwist = false; s.planAsk = false; s.askReason = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. No voy a poder llegar a la junta.", "Hoy no, nada más voy tarde.", "Dos horas.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { cantCome: undefined, late: true, eta: { min: 120 } } }, auto: AUTO },
    // review: "Espere, ¿en qué sala?" is "hold on", not "wait for me"; then "Como usted quiera" leaves it to Montes
    { name: "hold on, which room? Then as you like", setup: (s) => { s.planAsk = true; s.roomTwist = false; s.askReason = false; s.callerId = true; },
      turns: ["Ingeniero, habla Ryan, voy tarde.", "En veinte minutos.", "Espere, ¿en qué sala es?", "Como usted quiera.", "Gracias, hasta luego."],
      expect: { complete: true, state: { planned: "start" } }, auto: AUTO },
    // review: "No pueden empezar sin mí" (its comma lost) gets the question again; a "Sí, gracias" to "¿Necesita ayuda?" is a yes
    { name: "car trouble, help please, and start or wait?", setup: (s) => { s.planAsk = true; s.roomTwist = false; s.askReason = false; s.callerId = true; },
      turns: ["Ingeniero, habla Ryan. Se me descompuso el carro.", "Sí, gracias.", "Como en cuarenta minutos.", "No pueden empezar sin mí.", "Espérenme, por favor.", "Gracias, hasta luego."],
      expect: { complete: true, state: { helpSent: true, planAmb: true, planned: "wait" } }, auto: AUTO },
    // review: no caller ID, "¿Quién habla?" after a bare "¡Hola!" takes a bare name
    { name: "a bare name after \"¿Quién habla?\"", setup: (s) => { s.callerId = false; s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["¡Hola!", "Ryan.", "Voy un poco tarde, llego en quince minutos.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { name: "Ryan", eta: { min: 15 } } }, auto: AUTO },
    { name: "late or on time? Montes asks", setup: (s) => { s.callerId = false; s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["Habla Ryan.", "No voy a llegar tarde.", "Tarde.", "En veinte minutos.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { late: true, notLate: undefined } }, auto: (({ late: _l, ...rest }) => rest)(AUTO) },
    // audit (5 Nov 2026): caller ID's "¿Todo bien?" answered "Sí, todo bien, gracias" opens the call ("Dígame", not
    // "¿Bueno? ¿Quién habla?" again)
    { name: "caller ID: «¿Todo bien?» «Sí, todo bien, gracias»", setup: (s) => { s.callerId = true; s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["Sí, todo bien, gracias.", "Le llamo para avisarle que voy a llegar tarde.", "Llego en veinte minutos.", "Gracias, hasta luego."],
      expect: { complete: true, state: { opened: true, late: true, notOk: undefined, eta: { min: 20 } } }, auto: (({ opening: _o, late: _l, ...rest }) => rest)(AUTO) },
    // "Más o menos" gets "¡Uy! ¿Qué pasó?"; the car broke down and a taxi is coming: no "¡Y maneje con cuidado!"
    { name: "«Más o menos», then car trouble and a taxi", setup: (s) => { s.callerId = true; s.askReason = true; s.planAsk = false; s.roomTwist = false; },
      turns: ["Más o menos.", "Se me descompuso el carro.", "No, gracias, voy a tomar un taxi.", "Como en cuarenta minutos.", "Gracias, hasta luego."],
      expect: { complete: true, state: { notOk: true, reason: "car", noCar: true, eta: { min: 40 } } }, auto: (({ opening: _o, late: _l, reason: _r, need_help: _n, ...rest }) => rest)(AUTO) },
    // the reason question answered with the time: Montes doesn't ask the reason again
    { name: "the reason skipped for the time", setup: (s) => { s.callerId = true; s.askReason = true; s.planAsk = false; s.roomTwist = false; },
      turns: ["Ingeniero, habla Ryan. Voy tarde.", "Llego en veinte minutos.", "Gracias, hasta luego."],
      expect: { complete: true, state: { reasonSkipped: true, reason: undefined, eta: { min: 20 } } }, auto: (({ reason: _r, ...rest }) => rest)(AUTO) },
    // "No sé, depende del tráfico" at the time question
    { name: "no time yet: it depends on the traffic", setup: (s) => { s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["Buenos días, ingeniero, habla Ryan. Voy tarde.", "No sé, depende del tráfico.", "Gracias, hasta luego."],
      expect: { complete: true, state: { etaSkipped: true, eta: undefined } }, auto: AUTO },
    // side questions on the way: the time of the meeting, who is there, is he angry
    { name: "side questions: the time, the team, angry?", setup: (s) => { s.callerId = true; s.askReason = false; s.planAsk = true; s.roomTwist = false; },
      turns: ["Ingeniero, voy tarde.", "¿A qué hora es la junta?", "Llego en veinte minutos.", "¿Ya llegaron todos?", "Empiecen sin mí, por favor.", "¿Está enojado?", "Gracias, hasta luego."],
      expect: { complete: true, state: { planned: "start", eta: { min: 20 } } }, auto: AUTO },
    // a negated time ("No llego en veinte minutos") is no answer; the right one follows
    { name: "a negated time, then the right one", setup: (s) => { s.callerId = true; s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["Ingeniero, voy tarde.", "No llego en veinte minutos.", "Más bien en media hora.", "Gracias, hasta luego."],
      expect: { complete: true, state: { eta: { min: 30 } } }, auto: AUTO },
    // "¿Está el ingeniero Montes?" (the Mexican phone ask) after "¿Bueno? Buenos días.", and "menos de media hora"
    { name: "«¿Está el ingeniero Montes?», ahorita, less than half an hour", setup: (s) => { s.callerId = false; s.askReason = false; s.planAsk = false; s.roomTwist = false; },
      turns: ["¿Está el ingeniero Montes?", "Habla Ryan. Voy un poco tarde.", "Ahorita llego.", "Menos de media hora.", "Gracias. Hasta luego."],
      expect: { complete: true, state: { name: "Ryan", ahoritaAsked: true, eta: { min: 30 } } }, auto: AUTO },
  ],
};

export default runningLate;
