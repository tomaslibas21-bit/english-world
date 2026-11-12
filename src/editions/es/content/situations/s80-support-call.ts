// NEEDS: None. Days, windows, merges and the reference spelling are local.
// Song 80 "Your Call Is Important to Us" → Puerto Colibrí: "Su llamada es muy importante".
// Calling NetWave (the made-up phone and internet company). First the recorded menu ("Para soporte técnico, diga
// «soporte» o marque 2"; the learner says the option or its number; `silent`: a recording never says "Sorry?"),
// then Karla at customer service (usted): "¿Con quién tengo el gusto?", the account number (or a look-up by the phone
// number on the account), the problem (no internet since yesterday, the modem's light blinking red), "¿Ya reinició el
// módem?" ("Sí, ya lo reinicié"), a line test, a technician's visit window ("el jueves, entre las 9 y las 2" → "a esa
// hora estoy en el trabajo" → "¿Puede haber alguien más en su casa? Tiene que ser mayor de edad." / another window),
// a report number ("número de reporte", also "folio"), "¿Hay algo más en que le pueda ayudar?".
// Phone skills: the line cuts out ("se está cortando"), "¿Puede hablar más fuerte?", "¿Me lo manda por mensaje?".
// Twists: a 20-minute hold (visits ≥ 1), a double charge → refund and a credit ("bonificación") (visits ≥ 1
// suggestion), Karla can't hear the account number (any visit).
// Research (2 Nov 2026), kept vague where unsure: Mexican providers' phone menus say "marque" and "asesor";
// agents open with "Le atiende…" and "¿Con quién tengo el gusto?"; the home router is "el módem" in Mexico (twin:
// el router); a fault on the line gets a technician's visit in a window and a report number; a double charge is
// refunded "en unos días hábiles" (no fixed number of days is taught) and outage days may be credited ("una
// bonificación"). The plan price ($499) is a typical round plan price, not a real company's.

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Days and time windows for the technician

const WDAYS: EntityDef[] = [
  ent("thursday", "jueves", "Thursday", "m", { chip: "jueves" }),
  ent("friday", "viernes", "Friday", "m", { chip: "viernes" }),
  ent("saturday", "sábado", "Saturday", "m", { chip: "sábado" }),
];

interface Win { d: string; en: string; lt: string; say: string; pm: boolean }
// en = the Spanish text, lt = its English gloss, say = spoken Spanish (the edition's field names)
const WINDOWS: Record<string, Win> = {
  thu_am: { d: "thursday", en: "las 9 y las 2", lt: "9 and 2", say: "las nueve y las dos", pm: false },
  thu_pm: { d: "thursday", en: "las 2 y las 6", lt: "2 and 6", say: "las dos y las seis", pm: true },
  fri_am: { d: "friday", en: "las 9 y las 2", lt: "9 and 2", say: "las nueve y las dos", pm: false },
  sat: { d: "saturday", en: "las 9 y la 1", lt: "9 and 1", say: "las nueve y la una", pm: false },
};
const win = (k: string) => ({ en: WINDOWS[k].en, lt: WINDOWS[k].lt, say: WINDOWS[k].say });

/** The day of a window as a value, said with it in one line ("el {$weekday}, entre {$win}"): a line with an item and a
 *  value isn't in the voice line list, so the day is a value too and every day × window is voiced (audit, 5 Nov 2026). */
const WEEKDAY: Record<string, { en: string; lt: string; say: string }> = {
  thursday: { en: "jueves", lt: "Thursday", say: "jueves" },
  friday: { en: "viernes", lt: "Friday", say: "viernes" },
  saturday: { en: "sábado", lt: "Saturday", say: "sábado" },
};

const REFERENCE = { en: "NW-48213", lt: "NW-48213", say: "ene, doble u, cuatro, ocho, dos, uno, tres" };
const REF_NOTE = "Reporte NetWave: NW-48213";
const CHARGE = 49900;

// ---------------------------------------------------------------------------
// State helpers

const internet = (c: Ctx) => ["down", "slow", "drops"].includes(c.s.problem);
/** What the learner said, lowercase and without accents. */
const heard = (c: Ctx) => c.heard.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** A goodbye in the same sentence ("No, es todo. Adiós."). */
const BYE = /\b(adios|hasta luego|nos vemos|bye|chao|cuidese|que tenga)\b/;
/** One-word replies that the {name} slot would swallow: the intent they really are.
 *  "ok" = Karla says "Claro, dígame." and waits. */
const NOT_A_NAME: Record<string, string> = {
  espere: "g_wait", espereme: "g_wait", permitame: "g_wait", aguarde: "g_wait", momentito: "g_wait", segundito: "g_wait",
  okey: "ok", oki: "ok", okay: "ok", listo: "ok", dale: "ok", vale: "ok", perfecto: "ok", exacto: "ok", correcto: "ok", orale: "ok", andale: "ok",
  oiga: "g_hello", alo: "g_hello", diga: "g_repeat", repite: "g_repeat", otra: "g_repeat",
};
function goAhead(c: Ctx) { c.say("go_ahead"); c.hold(); }
/** true = the "name" was one of those words and has been handled as what it really is. */
function notAName(c: Ctx, word: string): boolean {
  const g = NOT_A_NAME[word.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
  if (!g) return false;
  if (g === "ok") goAhead(c);
  else ((support.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
  return true;
}

const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}

/** Said to the recorded menu: the call isn't routed yet, or this very turn routed it ("Soporte técnico. La luz
 *  parpadea en rojo.": the rest went to the recording too). The menu only routes. Anything else said to it (an account
 *  number, a question, "Gracias", "No sé") gets no person's reply: its step asks again ("Lo siento, no le entendí" and
 *  the options), or the problem is noted for Karla's "Veo que tiene problemas con su internet". So the menu never
 *  speaks Karla's lines, and Karla never answers what she didn't hear (audit, 5 Nov 2026). */
const atMenu = (c: Ctx) => !c.s.routed || !!turn(c).routedNow;

/** Karla takes over from the recorded menu (once, and only once the call is routed). */
function claireOn(c: Ctx) {
  if (c.s.claire || !c.s.routed) return false;
  c.s.claire = true;
  c.speaker("claire");
  // after the long hold she thanks the caller for their patience instead of the usual greeting
  c.say(c.s.longHold ? "thanks_patience" : "claire_greet");
  if (c.s.problem && internet(c)) c.say("claire_context");
  return true;
}

function route(c: Ctx, where: "support" | "billing" | "sales" | "agent") {
  if (c.s.routed) return;
  c.s.routed = where;
  turn(c).routedNow = true;
  c.speaker("netwave_bot");
  c.say(where === "billing" ? "bot_connect_billing" : where === "agent" ? "bot_connect_agent" : "bot_connect_support");
  c.say("bot_important");
  if (c.s.longHold) { c.say("bot_wait_long"); c.twist("long_hold"); }
  else if (c.chance(0.5)) c.say("bot_wait");
}

function setProblem(c: Ctx, p: string) {
  if (c.s.problem && internet(c)) return false;
  c.s.problem = p;
  return true;
}

function offerWindow(c: Ctx, k: string, first = false) {
  c.s.window = k;
  c.s.offered = c.s.offered || [];
  if (!c.s.offered.includes(k)) c.s.offered.push(k);
  const w = WINDOWS[k];
  c.say(first ? "tech_offer" : "tech_offer_alt", { weekday: WEEKDAY[w.d], win: win(k) });
}

function bookTech(c: Ctx) {
  const k = c.s.window;
  if (!k || c.s.techBooked) return;
  c.s.techBooked = k;
  const w = WINDOWS[k];
  c.say("tech_booked", { weekday: WEEKDAY[w.d], win: win(k) });
  c.say("tech_call_ahead");
  c.say("reference", { text: REFERENCE });
  c.complete();
}

const SUPPORT_AUTO: Record<string, string> = {
  menu: "Soporte técnico.", since: "Desde ayer.", lights: "La luz parpadea en rojo.", restart: "Sí, ya lo reinicié.",
  restart_now: "Listo, ya lo desconecté.", still_red: "Sí, sigue en rojo.", someone: "Sí, mi esposa puede estar en casa.", account: "Es el 742 9133.",
  hear: "Sí, así está mejor.", problem: "Mi internet no funciona.", problem_bill: "Mi internet no funciona.", tech: "Me queda bien.",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------
// Suggestions

const S_MENU: Suggestion = { lt: "Choose technical support (say “soporte” or “dos”)", hint: "menu" };
const S_PROBLEM: Suggestion = { lt: "Say your internet has been down since yesterday", hint: "problem" };
const S_BILL: Suggestion = { lt: "Say you were charged twice this month", hint: "billing" };
const S_PHONE: Suggestion = { lt: "If you can't hear well, ask her to speak up", hint: "phone" };

const PROBLEM_EXPECTS = ["internet_down", "internet_slow", "internet_drops", "charged_twice", "it_broken_ctx", "slow_ctx"];

function problemStep(id: string, withBill: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.routed && !!c.s.chargeTwist === withBill,
    done: (c) => !!c.s.problem,
    ask: (c) => { claireOn(c); c.say(bump(c, "problem") === 0 ? "ask_problem" : "ask_problem_again"); },
    expects: PROBLEM_EXPECTS,
    suggest: withBill ? [S_PROBLEM, S_BILL, S_PHONE] : [S_PROBLEM, S_PHONE],
  };
}

const FLAG_EL_DAY = "el + day: Spanish says el jueves where English says on Thursday.";
const FLAG_A_CALL = "a: Spanish puts a before the one you call; English has no word here.";
const FLAG_YOU_LO = "lo / la: you (lo for a man, la for a woman).";
const FLAG_MODEM = "Mexican: el módem = the home router; elsewhere el router.";

// ---------------------------------------------------------------------------

export const support: SituationDef = {
  id: "s80-support-call",
  song: 80,
  songTitle: "Your Call Is Important to Us",
  title: { en: "Su llamada es muy importante", lt: "Your Call Is Important to Us" },
  topic: { en: "Llamar a atención a clientes", lt: "Calling customer service" },
  chapter: 3,
  order: 9,
  location: "phone",
  npc: "claire",
  npcs: ["netwave_bot"],
  mode: "phone",
  goal: "Call your internet provider, report the outage, and book a technician's visit.",
  intro: "Your internet has been down since yesterday, and the light on your modem is blinking red. You call NetWave's customer service. A recorded menu answers first. Your account number: 742-9133.",
  entities: { wday: WDAYS },

  grammar: {
    macros: {
      net: "(internet | el internet | mi internet | wifi | el wifi | mi wifi | wi fi | el wi fi | mi wi fi | la conexion | mi conexion | la conexion a internet | el modem | mi modem | el servicio | mi servicio | el servicio de internet | mi servicio de internet | la red | la senal | la red de internet | la linea | mi linea)",
      notw: "(no funciona | no sirve | no jala | no conecta | no se conecta | no esta funcionando | no esta sirviendo | dejó de funcionar | dejó de servir | se cayó | se fue | esta caido | esta caida | no tiene senal | no da senal | ya no funciona | ya no sirve | no funciona para nada | no sirve para nada | no esta conectando | no carga | no anda | no agarra | no prende | no enciende)",
      since_tail: "(desde (ayer | anoche | hoy (en | por) la manana | esta manana | la manana | ayer (en | por) la tarde | ayer (en | por) la noche | el fin de semana | {day} | hace {number} dias | hace unos dias | antier) #since | desde {time} [de (ayer | anoche | hoy)] #since | (ayer | anoche | esta manana | hoy (en | por) la manana | ayer (en | por) la tarde | ayer (en | por) la noche | el {day}) #since)",
      when: "(ayer | esta manana | anoche | hace rato | hace un rato | hoy | hoy (en | por) la manana | hace una hora)",
      times: "(una vez | dos veces | tres veces | muchas veces | varias veces | mil veces | {number} veces | un par de veces | como {number} veces | como mil veces)",
      off_on: "(apagué y (lo prendí | lo encendí | lo volví a prender | lo volví a encender | lo volví a conectar | lo conecté) | desconecté [y (lo volví a conectar | lo conecté | lo conecté otra vez)] | reinicié | he reiniciado | he apagado y (lo he encendido | lo he vuelto a encender | lo he vuelto a conectar) | he desconectado [y (lo he vuelto a conectar | lo he conectado)])",
      who: "(mi esposa | mi esposo | mi pareja | mi novio | mi novia | mi hijo | mi hija | mi mama | mi papa | mi hermano | mi hermana | mi roomie | mi companero de cuarto | mi companera de cuarto | mi companero | mi companera | mi vecina | mi vecino | mi amigo | mi amiga | alguien | mi suegra | mi suegro | mi marido | mi mujer | la senora que me ayuda | mi abuela)",
      boss: "(supervisor | supervisora | gerente | encargado | encargada | jefe | jefa | superior)",
      ref: "(numero de reporte | numero de incidencia | folio | numero de folio | numero de ticket | numero de caso | numero de referencia | numero de seguimiento)",
      by_text: "por (mensaje | whatsapp | sms | correo | mensaje de texto | texto | correo electronico | mail)",
      light: "(luz | lucecita | foquito | foco | lucecita de internet | luz de internet | foquito de internet | foquito del internet | luz del internet | luz del modem | foquito del modem | luz del router)",
      red: "(rojo | roja | naranja | anaranjado | anaranjada | ambar)",
      blink: "(parpadea | esta parpadeando | prende y apaga | esta prendiendo y apagando | titila | esta titilando)",
    },
  },

  intents: {
    // --- the recorded menu
    menu_support: { patterns: [
      "soporte #h:menu_support", "soporte tecnico #h:menu_tech", "(tecnico | asistencia tecnica | servicio tecnico | ayuda tecnica | soporte de internet | soporte para internet)",
      "(reportar | reporte de | levantar un reporte de | reportar una) (falla | fallas)", "(una | la) falla", "fallas [tecnicas]", "(reportar | reporte) [una falla] (de | en) [el | mi] (internet | servicio)",
      "(falla | una falla | problema | un problema | problemas) (con | de | en) (el | mi) (internet | servicio | wifi | modem | conexion)",
      "(tengo | hay) (una falla | fallas) (con | en) (el | mi) (internet | servicio | wifi | modem)",
      "[el | mi] (internet | wifi | wi fi)", "(necesito | quiero | ocupo) (soporte | soporte tecnico | asistencia tecnica)", "(es | tengo) un problema tecnico",
      "(quiero | necesito | vengo a | llamo para) reportar una falla", "(problema | problemas) (tecnico | tecnicos | de internet | con el internet)",
      "(necesito | ocupo | quiero) (un tecnico | que venga un tecnico)",
      "no (quiero | es) (pagos | ventas | facturacion | para pagos) [es] [quiero | necesito] soporte [tecnico]",
      // the menu's own words and the answer to "¿Llama por pagos o por soporte técnico?" (audit, 5 Nov 2026)
      "[es | llamo] (por | para) (soporte | soporte tecnico | el soporte tecnico | asistencia tecnica | una falla | el internet | mi internet | internet | el wifi | mi wifi)",
      "es (de | sobre) (soporte | soporte tecnico | el internet | mi internet)",
    ] },
    menu_billing: { patterns: [
      "pagos #h:menu_billing", "(facturacion | factura | pago | cobros | cobranza | mi recibo | el recibo | mi factura | pagos y facturacion)",
      "(tengo una pregunta | una pregunta | tengo una duda | una duda) (sobre | de | con) (mi recibo | mi factura | un cobro | mi pago | el pago | mi cuenta)",
      "(quiero | necesito) (pagar | hacer un pago)", "[es | llamo] (sobre | por) (mi | el | un) (recibo | factura | pago | cobro)",
      "[es | llamo] (por | para) (pagos | facturacion | pagos y facturacion | el area de pagos)",
    ] },
    menu_sales: { patterns: [
      "ventas", "(contratar | nuevo servicio | nuevos servicios | un servicio nuevo | contratar un servicio | contratar un servicio nuevo)",
      "(una | hacer una) recarga", "recargas", "recargar saldo",
      "(quiero | necesito) (hacer una recarga | recargar [saldo] | contratar [un servicio | internet | otro servicio])",
      "[es | llamo] (por | para) (ventas | contratar | una recarga | recargar saldo)",
    ] },
    menu_agent: { patterns: [
      "[un | una] (asesor | asesora | operador | operadora | ejecutivo | ejecutiva | agente | persona | humano) #h:menu_agent",
      "(quiero | quisiera | necesito | puedo | me gustaria) hablar con (un asesor | una asesora | un operador | una operadora | una persona | alguien | un humano | una persona real | un ejecutivo | un agente)",
      "(comuniqueme | paseme | me comunica | me pasa) con (un asesor | una persona | alguien | un operador | una operadora)",
      "(atencion a clientes | servicio al cliente | atencion al cliente)", "ayuda", "necesito ayuda",
      "(un | una) (persona | humano) (real | de verdad)",
    ] },
    // "Gracias" / "Perdón" to the recording: no person's "¡A la orden!" (the step asks again)
    menu_social_ctx: { patterns: [
      "[ok | okey | bueno] [muchas] gracias [por (todo | la informacion | su ayuda | la ayuda | esperar)]", "(perdon | disculpe | lo siento) [por (eso | la confusion)]",
    ] },
    menu_num_ctx: { patterns: [
      "[marco | marcar | presiono | oprimo | marque] [el | la] [opcion] [numero] (uno #n1 | 1 #n1 | tres #n3 | 3 #n3 | cero #n0 | 0 #n0)",
      "[marco | marcar | presiono | oprimo | marque] [el | la] [opcion] [numero] (dos | 2) #n2 #h:menu_two",
      "la (primera #n1 | segunda #n2 | tercera #n3) [opcion]", "(primera #n1 | segunda #n2 | tercera #n3) opcion",
      "(marco | marque | marcare) el (uno #n1 | dos #n2 | tres #n3 | cero #n0)",
    ] },

    // --- identity
    name_ctx: { patterns: [
      "[me llamo | mi nombre es | soy | habla | con | es | le habla | aqui habla | yo soy] {name} #h:name_mine",
      "mi nombre es {name} y mi apellido [es] {name2:name}",
      "(mi apellido es | apellido) {name} [y] [mi nombre es | nombre] {name2:name}",
    ] },
    account_ans: { patterns: [
      "(mi numero de cuenta es | el numero de cuenta es | mi numero de cliente es | mi cuenta es | el numero es | es) [el] {digits} #h:acct_is",
      "(si | claro | si claro) [es] [el] {digits}",
      "(mi | el) (numero | numero de cuenta | numero de cliente | telefono | numero de telefono | celular | numero de celular | telefono de la cuenta) (es | era) [el] {digits}",
      "[un momento | espere] (aqui lo tengo | ya lo tengo | ya lo encontré) [es] [el] {digits}",
      "(mi | el) numero de cuenta [es] [el] {digits} {digits2:digits}",
    ] },
    account_ctx: { patterns: ["{digits}", "el {digits}"] },
    // "Es este mismo número" to "¿Me da el teléfono registrado en la cuenta?" (only at the account question)
    same_number_ctx: { patterns: [
      // "este" alone is a Mexican filler ("Este… no sé"): never the answer by itself
      "[es] [el] (este | el) mismo [numero | telefono | celular] [de donde (llamo | le llamo | le hablo | le estoy llamando | estoy llamando | le estoy hablando | le marco)]",
      "[es] este (numero | telefono | celular) [de donde (llamo | le llamo | le hablo | le estoy llamando | estoy llamando | le estoy hablando | le marco)]",
      "[es] [el] (numero | telefono | celular) (de donde | del que) (llamo | le llamo | le hablo | le estoy llamando | estoy llamando | le estoy hablando | le marco)",
      "[es] (de donde | del que) (llamo | le llamo | le hablo | le estoy llamando | estoy llamando | le estoy hablando | le marco)",
    ] },
    acct_unknown: { patterns: [
      "[perdon] no (se | tengo | recuerdo | me se | encuentro) (mi | el) numero de (cuenta | cliente) [aqui | a la mano | conmigo] #h:acct_unknown",
      "no (lo | me lo) (se | tengo | recuerdo | encuentro) [aqui | a la mano | conmigo] [perdon | lo siento]", "[perdon] tampoco (lo | me lo) (se | tengo | recuerdo) [perdon]",
      "tampoco (tengo | se) (el telefono | el numero | ese numero)", "no me (acuerdo | lo se) [de mi numero de cuenta | del numero]",
      "(se me olvidó | olvidé) [mi numero de cuenta | el numero | mi numero]", "donde (lo encuentro | encuentro el numero | viene | esta | lo veo) [el numero de cuenta | mi numero de cuenta]",
      "(me puede | puede | me pueden | pueden | me podria | podria) buscar (con | por) (mi telefono | mi numero de telefono | mi nombre | mi direccion | mi celular | mi numero)",
      "(me puede | puede | me puedes #tip:tu_staff) buscar (con | por) (el telefono | el numero de telefono | el nombre)",
      "no tengo (mi recibo | el recibo | el numero de cuenta | mi numero de cuenta | el numero | mi numero | el numero de cliente) [aqui | a la mano | conmigo]",
    ] },

    // --- the problem
    // #since: the answer to "¿Desde cuándo no tiene servicio?" is already in the sentence
    internet_down: { patterns: [
      "[y | tambien | ademas | y ademas] @net @notw [@since_tail] [en (mi casa | la casa)] #h:prob_down",
      "[y | tambien | ademas] @notw @net [@since_tail]", "@since_tail @net @notw", "@since_tail no tengo (internet | wifi | servicio)",
      "[y | ademas] no tengo (internet | wifi | servicio | senal | conexion | linea) [ni (telefono | linea | television | tele | cable)] [@since_tail] [en (mi casa | la casa)] #h:prob_none",
      "(quiero | necesito | vengo a | llamo para) reportar que (no tengo (internet | servicio) | no hay internet | @net @notw)",
      "(llamo | le llamo | hablo | le hablo) (porque | por que) (no tengo (internet | servicio | wifi) | no hay internet | @net @notw)",
      "[mi | el] (internet | wifi) no (es | esta) (lento | lenta) [es que | sino que | simplemente | nada mas] @notw",
      "no (puedo | me puedo) conectar [a | al] [internet | wifi | la red] #h:prob_connect", "no puedo conectarme [a internet | al wifi | a la red]",
      "no puedo (entrar a | abrir) (internet | ninguna pagina | nada | las paginas)",
      "(llamo | le llamo | hablo) (por | porque) (mi internet | el internet) [no (funciona | sirve)]",
      "(mi | el) (modem | router) (parpadea | esta parpadeando | tiene una luz) [en] (rojo | roja) #h:prob_router",
      "(mi | el) (internet | wifi) dejó de funcionar (ayer | anoche | esta manana | hoy (en | por) la manana | el {day}) #h:prob_stopped #since",
      "(tengo | estoy teniendo) (problemas | un problema | fallas | una falla) con (mi | el) (internet | wifi | wi fi | conexion | servicio | modem) #h:prob_trouble",
      "(hay | tengo) (una falla | un problema | problemas | fallas) (con | en) (mi | el) (internet | wifi | servicio | conexion)",
      "nada funciona", "no funciona nada", "(sin | estoy sin | me quedé sin | nos quedamos sin) (internet | servicio | wifi) [@since_tail]",
      "(necesito | ocupo) ayuda con (mi | el) (internet | wifi | modem)", "no hay (internet | servicio | senal | conexion) [@since_tail]",
      "(llamo | hablo) para reportar una falla [de internet | en mi servicio]",
      "no es (un problema de | por | de) (pago | pagos | el pago | el recibo | mi recibo | un cobro | facturacion) [es que | sino que] (no tengo (internet | servicio | wifi) | @net @notw)",
    ] },
    // "La conexión está muy mala." as the answer to "¿En qué le puedo ayudar?" (elsewhere it's about the phone line)
    slow_ctx: { patterns: ["(la conexion | el internet | la senal | el wifi) (esta | anda) [muy | bien | super] (mala | malo | fallando)", "(la conexion | la senal) es (muy | bien) mala"] },
    internet_slow: { patterns: [
      "(mi | el) (internet | wifi | conexion | servicio) (esta | anda | va) [muy | super | demasiado | bien] (lento | lenta)",
      "(el internet | mi internet) es (muy | demasiado) lento", "(esta | anda | va) (muy | super | bien | demasiado) (lento | lenta)",
      "(el internet | mi internet | todo) (esta | va | anda) (lentisimo | lentisima)",
    ] },
    internet_drops: { patterns: [
      "(mi internet | el internet | el wifi | la conexion | la senal) se [me] (corta | va | cae | desconecta) (a cada rato | todo el tiempo | cada rato | mucho | seguido | cada cinco minutos)",
      "se [me] (corta | va | cae | desconecta) [el internet | la conexion | el wifi | la senal] (a cada rato | todo el tiempo | seguido | mucho | cada dos por tres | a menudo)", "(se corta | se va | se cae) y (regresa | vuelve)", "(es | esta) intermitente",
    ] },
    it_broken_ctx: { patterns: ["no (funciona | sirve | jala | conecta | se conecta)", "(ya no) (funciona | sirve)", "dejó de funcionar", "se cayó", "esta (descompuesto | descompuesta | caido)"] },
    charged_twice: { patterns: [
      "me (cobraron | cobró | han cobrado | ha cobrado) dos veces [este mes | el mismo recibo] #h:bill_twice", "(ustedes) me (cobraron | hicieron) (dos veces | doble cargo | un cargo doble | un doble cargo) [este mes]",
      "(me hicieron | tengo | hay | me aparece | me aparecen | veo) (un cargo doble | un doble cargo | dos cargos | doble cobro | un cobro doble | dos cobros) [en mi (tarjeta | cuenta | recibo | estado de cuenta)] [este mes]",
      "(pagué | me cobraron) doble", "(pagué | se pagó) dos veces [este mes]", "creo que (pagué | me cobraron) dos veces", "mi recibo esta mal",
      "me cobraron (doble | de mas | dos veces lo mismo)", "me (han | habeis) cobrado dos veces [este mes]",
    ] },
    since_ans: { patterns: [
      "[no se | no estoy seguro | no estoy segura | no me acuerdo | no recuerdo] [creo que] desde (ayer | anoche | esta manana | hoy (en | por) la manana | ayer (en | por) la tarde | ayer (en | por) la noche | el fin de semana | {day} | hace {number} dias | hace unos dias | hace un rato | antier) [creo] #h:since_y",
      "(dejó de funcionar | se fue | se cayó | se cortó) (ayer | anoche | esta manana | hoy (en | por) la manana | el {day}) [(como a | a eso de | a) {time}]",
      "desde (ayer | anoche | esta manana | el {day}) (a | como a | a eso de) {time}", "(como | mas o menos) (desde ayer | desde anoche | un dia | dos dias)",
      "[creo que] [como | mas o menos] desde {time} [de (ayer | anoche | hoy)] [creo]",
      "(un dia | dos dias | unos dias | {number} dias) [sin internet | sin servicio]", "ayer (a | como a | a eso de) {time}", "creo que desde (ayer | anoche | el {day})",
    ] },
    // a bare time ("Ayer", "El lunes") answers only "¿Desde cuándo no tiene servicio?"
    since_ctx: { patterns: [
      "[no se | no estoy seguro | no estoy segura | no me acuerdo | no recuerdo] [creo que] (ayer | anoche | esta manana | hoy (en | por) la manana | hoy temprano | ayer (en | por) la tarde | ayer (en | por) la noche | antier | hace dos dias | hace unos dias | hace {number} dias | el {day}) [creo] #h:since_when",
    ] },
    lights_ans: { patterns: [
      "(la | una | el | un) @light [de internet | del internet | del modem] (esta | esta prendida | esta encendida | esta prendido) [en] @red #h:lights_red",
      "(la | una | el | un) @light [de internet | del internet | del modem] @blink [en] [@red]",
      "(la | una | el | un) @light [de internet | del internet] (esta | es) @red",
      "hay (una | un) @light @red [que parpadea | parpadeando | prendida | prendido | encendida] #h:lights_there",
      "@blink [en] @red", "(esta parpadeando | parpadea) (la | una) @light [@red]", "(esta | estan) en (@red | verde)", "(esta | esta en) @red parpadeando", "[esta] (en rojo | rojo) y parpadea",
      "no (prende | enciende) (ninguna luz | ningun foquito | nada | ninguna lucecita) #h:lights_none", "(ninguna luz | ningun foquito) (prende | esta prendida)",
      "no (hay | tiene) (luces | ninguna luz) [prendidas]", "(todas las luces | las luces | todos los foquitos | los foquitos) (estan | estan todas | estan todos) (apagadas | apagados | en verde | verdes | prendidas | encendidas)",
      "(estan | estan todas) (apagadas | en verde | verdes)", "(la | una) luz [de internet] (esta | esta en) (apagada | verde)",
      "(veo | tengo) (una | solo una) (luz | lucecita) (@red | que parpadea)", "(mi | el) (modem | router | aparato) tiene (una | un) @light (@red | que parpadea)",
      "(el | mi) (modem | router | aparato) @blink [en] @red", "la (luz | lucecita) @red @blink", "(esta | esta todo) apagado",
      "[la | las] (luz | luces) (verde | verdes) (esta | estan) (prendida | prendidas | encendida | encendidas) (pero | y) la (roja | naranja | de internet) (@blink | esta prendida | esta en rojo)",
    ] },
    // "No está en rojo", "No parpadea": a light that is not red (never the red-light reading)
    lights_neg: { patterns: ["no (esta | estan | es) [en] @red", "no (parpadea | esta parpadeando) [en] [@red]", "no (es | esta) (roja | rojo) (es | esta) (verde | en verde)", "no hay (luz | ninguna luz) @red"] },
    // a bare color or "Ninguna" describes the light only while Karla asks about it
    lights_ctx: { patterns: ["[en] @red [parpadeando]", "(ninguna | ninguna luz | ninguno | nada)", "[todas] (verde | en verde | verdes)", "(apagada | apagadas | todas apagadas)", "@blink", "parpadeando"] },
    restart_yes: { patterns: [
      "[si] ya lo @off_on [@times] [y nada | pero no (sirvió | funcionó | cambió nada)] #h:restart_did",
      "[si] lo @off_on [otra vez | de nuevo] [@times] [ya] [y nada | pero no (sirvió | funcionó)]",
      "[si] (ya | ya lo) (intenté | hice | probé) [eso] [@times] [y nada | pero no (sirvió | funcionó)]",
      "[si | claro | si claro] [que si] @times [y nada | pero no (sirvió | funcionó)]",
      "[si] pero no (sirvió | funcionó | sirvió de nada | cambió nada)", "[si] y (nada | no funcionó | sigue igual)",
      "[si] ya lo @off_on (ayer | esta manana | anoche | hace rato | hace un rato)",
      "[si] ya lo he (reiniciado | apagado | desconectado | intentado) [@times]", "si ya", "[si] lo @off_on @when",
    ] },
    restart_no: { patterns: [
      "[no] (todavia no | aun no | no todavia) [lo he (intentado | hecho | reiniciado)] #h:restart_not",
      "[no] no (lo he intentado | lo he hecho | lo hice | lo intenté | lo reinicié | lo he reiniciado | lo probé | lo apagué | lo desconecté | he intentado | intenté | he probado | lo he apagado)",
      "[no] todavia no lo (he reiniciado | reinicié | he intentado | intenté | hice | he hecho | apagué)", "[no] no se me ocurrió", "[no] nunca lo (reinicié | apagué | desconecté)",
      "[no] no se (como | como hacerlo | como se hace | hacerlo)",
    ] },
    done_ctx: { patterns: [
      "listo #h:done", "(hecho | ya esta) [ya esta]", "(ya | listo ya) (esta | quedó | lo hice)", "[listo] ya lo (desconecté | apagué | hice | he desconectado | he apagado | he hecho) #h:done_unplugged",
      "ya (esta desconectado | lo volví a conectar | lo conecté | lo prendí | esta conectado [otra vez | de nuevo])",
      "(ok | listo) ya lo (desconecté | conecté)", "(ya | ya esta) (desconectado | conectado)", "lo (desconecté | volví a conectar | conecté)", "ya",
    ] },
    // "Ahorita lo hago": doing it now, not done yet (Karla waits)
    doing_ctx: { patterns: [
      "[ok | va | sale | claro | si] (ahorita | ahora | ya) lo (hago | desconecto | estoy haciendo | estoy desconectando)", "lo estoy (haciendo | desconectando) [ahorita]",
      "[ok | si | claro] (ahorita | ahora) (lo hago | voy)", "(deje | dejeme | permitame) (lo desconecto | lo hago)", "[ahorita] lo (hago | desconecto) [ahorita]",
      "[no] [espere] (todavia | aun) no (lo desconecto | lo he desconectado | lo hago | lo he hecho | termino | acabo)",
    ] },
    still_red: { patterns: [
      "[si] (sigue | todavia esta | aun esta | continua) [parpadeando] [en] (@red | igual | parpadeando) [parpadeando] #h:still_red",
      "[si] sigue (igual | parpadeando | sin funcionar | sin servicio | sin internet)", "[no] no (cambió | pasó | ha cambiado | ha pasado) nada #h:still_nothing", "[no] nada (cambió | pasó)",
      "[no] (sigue | esta) igual", "[si] (igual | todo igual | lo mismo | igualito)", "[no] sigue sin (funcionar | servir)", "[no] (todavia | ya | aun) no (funciona | sirve | prende | jala)",
      "[no] no (se puso | esta | se pone) [en] verde", "[si] (todavia | aun) [en] @red", "[si] [en] @red todavia",
    ] },
    green_now: { patterns: [
      "(ya esta | la luz esta | ya se puso | se puso | ahora esta) [en] verde #h:green", "[si] ya (funciona | sirve | jala | hay internet | tengo internet | se conectó)",
      "verde", "(ahora | ya) [en] verde", "[no] ya no (esta | parpadea | esta parpadeando) [en] @red", "[no] ya no parpadea", "[no] ya esta (bien | normal)", "ya volvió [el internet]",
      "no ya (esta | se puso) [en] verde", "no (ahora | ya) (esta | se puso) [en] verde",
    ] },

    // --- technician
    tech_accept: { patterns: [
      "(me queda bien | me queda perfecto | me acomoda | me funciona | me sirve | me viene bien) [el {day}] [a esa hora] #h:tech_ok",
      "[si] [el | ese] {day} [(en | por) la manana | (en | por) la tarde] (me queda bien | me queda perfecto | esta bien | me acomoda | me sirve | me funciona | perfecto | me viene bien)",
      "(voy a estar | estoy | puedo estar) (en casa | ahi | en mi casa) [ese dia | a esa hora | el {day}]",
      "(agendelo | apartelo | reserveme | agendemelo) [por favor]", "entre las {n1:number} y (las | la) {n2:number} (esta bien | me queda bien | me sirve)",
      "(trabajo | estoy trabajando | voy a estar trabajando) desde (casa | mi casa) [ese dia]", "(estoy | voy a estar) en (casa | mi casa) todo el dia", "asi (esta bien | esta perfecto)", "(esta bien | esta perfecto) asi",
    ] },
    tech_busy: { patterns: [
      "[perdon | lo siento] (a esa hora | ese dia | el {day} | (en | por) la manana) (estoy | voy a estar) (en el trabajo | trabajando | en la oficina | fuera) #h:tech_work",
      "(trabajo | tengo trabajo) (a esa hora | ese dia | el {day} | (en | por) la manana | en las mananas | todo el dia)",
      "[no] no (puedo | voy a poder) [estar] [ese dia | a esa hora | el {day} | (en | por) la manana | entonces]",
      "[no] no me (queda | acomoda | sirve | funciona) [bien] [ese dia | esa hora | el {day}]",
      "[no] no (voy a estar | estoy | estare) [en casa | ahi] [ese dia | a esa hora | el {day} | (en | por) la manana]",
      "[no] [el | ese] {day} no [puedo | me queda | voy a estar]", "[no] ese dia no (puedo | estoy)", "[no] a esa hora no (puedo | estoy)",
      "(estoy | voy a estar) (ocupado | ocupada) [ese dia | a esa hora | el {day}]", "(trabajo | estoy en el trabajo) hasta {time}",
      "[no] no (puedo | voy a poder) [ese dia | a esa hora | el {day}] [(porque | es que)] (trabajo | tengo trabajo | estoy trabajando | voy a estar trabajando)",
      "(trabajo | tengo trabajo | estoy trabajando | voy a estar trabajando) [ese dia | a esa hora | el {day} | (en | por) la manana]",
      "(y si | que pasa si) no (estoy | voy a estar | puedo estar) [en casa | ahi] [ese dia | a esa hora]",
    ] },
    someone_yes: { patterns: [
      "[si] @who (puede | podria) estar [en casa | ahi] #h:someone_yes", "[si] @who (esta | va a estar) [en casa | ahi] [ese dia | todo el dia]", "[si] @who",
      "[si] @who (le puede | puede | le podria) abrir [la puerta]", "@who trabaja (desde casa | en casa) [y (le puede abrir | puede estar)]",
      "(el | ella) (puede | podria) (estar | abrir | recibirlo)", "[si] @who se puede quedar",
    ] },
    someone_no: { patterns: [
      "[no] vivo (solo | sola) #h:someone_no", "[no] (nadie | no hay nadie) [puede estar | mas | en casa | ese dia]", "[no] no hay nadie [mas] [en casa]",
      "[no] nadie (puede | va a estar | esta) [en casa | ahi]", "[no] (estoy | vivo) (solo | sola)",
      "[no] @who (tambien trabaja | trabaja | no puede | tampoco puede | no va a estar | tampoco esta | no esta)",
      "[no] @who (no puede | tampoco puede | tampoco) [porque | es que] [tambien] (trabaja | esta trabajando) [todo el dia]",
    ] },
    tech_other: { patterns: [
      "(tiene | hay | tienen) (algo | algun horario | alguna cita | lugar | espacio) (el sabado | el fin de semana | en fin de semana) #h:tech_weekend",
      "(tiene | hay | tienen) (algo | algun horario | espacio) ((en | por) la tarde | por la tarde | mas tarde | (en | por) la noche) #h:tech_afternoon",
      "(puede | podria | pueden | podrian | puedes #tip:tu_staff) (venir | ir | mandarlo | mandar al tecnico) [el] {day} [(en | por) la tarde | (en | por) la manana]",
      "(puede | podria | pueden | podrian) (venir | ir) ((en | por) la tarde | mas tarde | por la tarde | despues | (en | por) la noche | el fin de semana | despues de (las | la) {time})",
      "(y | que tal) [el] {day} [(en | por) la manana | (en | por) la tarde]", "y (el sabado | el fin de semana | (en | por) la tarde | por la tarde | mas tarde)",
      "(mejor | prefiero) [el] {day} [(en | por) la tarde | (en | por) la manana]", "(mejor | prefiero) ((en | por) la tarde | el fin de semana | mas tarde | otro dia)",
      "(se puede | es posible) [el] {day}", "no (tiene | hay) (algo | nada) (mas tarde | (en | por) la tarde | otro dia | el sabado | el fin de semana)",
      "(tiene | hay) (otro horario | otra fecha | otro dia | algo mas tarde | algo otro dia | algo la proxima semana)",
      "(el sabado | el fin de semana | (en | por) la tarde) (seria mejor | me queda mejor | estaria mejor)",
      "(no hay | no tiene | hay | tiene | tienen) (algo | algun horario | espacio) mas temprano", "(puede | podria | pueden) (venir | ir) mas temprano",
      "[no] [el | ese] {wrong:day} no [puedo | me queda] [pero] (mejor | prefiero | que tal | y | puede ser) [el] {day} [(en | por) la manana | (en | por) la tarde]",
      "no [el] {wrong:day} (sino | mejor) [el] {day} [(en | por) la manana | (en | por) la tarde]", "[el] {wrong:day} no [el] {day}",
      "[no] [el | ese] {wrong:day} [(en | por) la manana | (en | por) la tarde] no [puedo | me queda] [pero] [mejor | prefiero | que tal | y] ((en | por) la tarde | por la tarde | mas tarde | (en | por) la manana)",
      "(y si | que tal si) [mejor] (viene | vienen | va) [el] {day} [(en | por) la manana | (en | por) la tarde]", "(y si | que tal si) [mejor] [el] {day} [(en | por) la manana | (en | por) la tarde]",
      "(y si | que tal si) [mejor] ((en | por) la tarde | por la tarde | el fin de semana | otro dia)", "[si] pero ((en | por) la tarde | por la tarde | mas tarde | el fin de semana | otro dia | [el] {day})",
      // "¿No puede venir hoy?": the words (the handler reads hoy / mañana), not {day} (audit, 5 Nov 2026)
      "[y] no (puede | pueden | podria | podrian) (venir | ir | mandarlo | mandar al tecnico) (hoy | hoy mismo | manana)",
    ] },
    // a bare day or part of the day ("¿El sábado?", "No, en la tarde") answers only the technician's offer
    tech_other_ctx: { patterns: ["[el] {day} [(en | por) la manana | (en | por) la tarde | por la tarde]", "((en | por) la tarde | por la tarde | mas tarde | (en | por) la noche | mas temprano | (en | por) la manana | el fin de semana)"] },
    tech_cost_ctx: { patterns: ["cuanto (cuesta | es | cobran | sale | me cobran)"] },
    tech_cost_q: { patterns: [
      "cuanto (cuesta | cobran | me cobran | me va a costar | sale) (la visita | el tecnico | eso)", "(la visita | eso) (tiene costo | es gratis | cuesta | se cobra)",
      "(tengo | hay) que pagar (algo | la visita | el tecnico)", "(es | sera) gratis [la visita]", "me van a cobrar [la visita | algo]",
    ] },
    tech_time_q: { patterns: ["cuanto (tarda | tiempo tarda | se tarda | dura | va a tardar | tiempo se tarda) [la visita | el tecnico | la reparacion | en arreglarlo]"] },
    // the questions a caller asks about the visit (audit, 5 Nov 2026)
    tech_when_q: { patterns: [
      "[y] [sabe | me puede decir] a que hora (llega | viene | va a llegar | va a venir | pasa | van a llegar | van a venir | vienen | llegan) [el tecnico | exactamente]",
      "[y] (a que hora | cuando) exactamente", "(me avisan | me van a avisar | me llaman | me van a llamar | me hablan | me van a hablar) antes [de (llegar | que llegue)]",
    ] },
    home_q: { patterns: [
      "[y] (tengo | necesito) que estar [yo] (en casa | ahi | en mi casa | presente)", "[y] (necesito | tengo que) estar (en casa | ahi | presente)",
      "[y] (alguien | yo) (tiene | tengo) que estar (en casa | ahi)", "[y] (tiene | debe | tendria) que haber alguien [en (casa | mi casa)]",
      "[y] (es necesario | hace falta) que (este | yo este | alguien este) (en casa | ahi)",
      // "No tengo que estar en casa, ¿verdad?": the same answer (you or another adult)
      "no (tengo | necesito) que estar (en casa | ahi | en mi casa) [verdad | o si]", "no necesito estar (en casa | ahi | en mi casa) [verdad | o si]",
    ] },

    // --- other requests
    manager: { patterns: [
      "(puedo | podria) hablar con (un | una | su) @boss #h:manager", "(quiero | quisiera | necesito) hablar con (un | una | su) @boss",
      "(comuniqueme | paseme | me comunica | me pasa | me puede pasar | me puede comunicar | me comunicas #tip:tu_staff | me pasas #tip:tu_staff | me puedes pasar #tip:tu_staff) con (su | un | una) @boss",
      "[un | su] @boss",
    ] },
    wait_complaint: { patterns: [
      "llevo (veinte | 20 | treinta | 30 | cuarenta | media hora | una hora | mucho tiempo | mucho rato | {number}) [minutos] (esperando | en la linea | en espera) #h:waited",
      "(estuve | he estado) (esperando | en la linea | en espera) (veinte | 20 | treinta | media hora | mucho tiempo | mucho rato | {number}) [minutos]",
      "(esperé | tuve que esperar) (mucho | mucho tiempo | mucho rato | veinte minutos | {number} minutos | media hora)",
      "(fue | es) (mucha | demasiada) espera", "por que (tardaron | tardan) tanto [en contestar]", "(tardaron | tardan) (mucho | muchisimo) en (contestar | atender)",
    ] },
    reference_q: { patterns: [
      "(me da | me puede dar | me podria dar | puedo tener | me das #tip:tu_staff) (un | el | su | mi) @ref #h:ref_q", "hay (un | algun) @ref",
      "cual es (mi | el) @ref", "(y) el folio", "(me da | me dan) el folio",
    ] },
    text_me: { patterns: [
      "(me lo | lo) (puede | podria | pueden | puedes #tip:tu_staff) (mandar | enviar) @by_text #h:text_me", "(me lo | me) (manda | envia | mandan) @by_text", "(me | me puede | me podria | puede | podria) (manda | envia | mandar | enviar) (el numero | el folio | el reporte | eso | el numero de reporte) @by_text",
      "(mandemelo | enviemelo | mandamelo #tip:tu_staff) @by_text", "(puede | podria) mandarme (un mensaje | el numero | el folio) [@by_text]",
      "(me puede | me podria) (mandar | enviar) (un mensaje | un sms | un correo | un whatsapp) [con el numero | con el folio]",
    ] },
    refund_q: { patterns: [
      "cuando (me regresan | me devuelven | me reembolsan | voy a ver | recibo | me llega) (el | mi) (dinero | reembolso | cargo | pago) #h:refund_q",
      "cuanto (tarda | tiempo tarda) (el reembolso | la devolucion)", "cuando (me lo regresan | me lo devuelven | se refleja | se ve reflejado | me llega)",
      "cuando (veo | voy a ver) (el | mi) (dinero | reembolso)",
    ] },

    // --- the phone line
    speak_up: { patterns: [
      "[perdon] (puede | podria) hablar (mas fuerte | mas alto | un poco mas fuerte) #h:ph_speak_up", "[perdon] (se esta cortando | se corta | se oye cortado | se escucha cortado | se escucha mal | se oye mal) #h:ph_breaking",
      "[perdon] no (le | la | lo) (escucho | oigo) [bien | nada]", "[perdon] no se (escucha | oye) [bien | nada]", "(hable | hableme) mas fuerte",
      "(bueno | hola | alo) (sigue ahi | esta ahi)", "(sigue | esta) ahi", "la (linea | llamada) (esta | se oye | se escucha) (muy | bien) mala",
    ] },
    hear_me: { patterns: ["(me escucha | me oye) [ahora | bien | ya] #h:ph_hear", "(ya | ahora) me (escucha | oye)", "(bueno | alo) me (escucha | oye)"] },
    hear_ok: { patterns: [
      "[si] (ya | ahora si) (la | lo | le) (escucho | oigo) [bien | perfecto] #h:hear_now", "[si] (asi | ahora) (esta | se oye | se escucha) mejor #h:hear_better",
      "[si] (mucho | ya) mejor", "[si] (ya | ahora) (se escucha | se oye) bien",
    ] },

    // --- general
    more_no: { patterns: [
      "[no] [gracias] (eso es todo | es todo | seria todo) [gracias] #h:more_all", "[no] (ya | ya con eso) (es todo | quedó | estoy)", "[no] (eso | con eso) (seria todo | es suficiente)",
      "[no] (todo bien | estoy bien) gracias", "[no] fue (muy | super) amable", "ya quedó todo",
      "[no] [gracias] [ya] no necesito nada [mas] [gracias]", "[no] nada mas [gracias]",
    ] },
    // "Sí, una cosa más": there is something else (only at "¿Algo más?")
    more_yes_ctx: { patterns: ["[si] (una cosa mas | otra cosa | una pregunta mas | otra pregunta | tengo otra pregunta | tengo una pregunta | una pregunta) [por favor]", "[no] solo una pregunta"] },
    g_spell: { patterns: ["como se escribe [eso | el numero | el folio]", "me lo (deletrea | puede deletrear)"] },
  },

  lines: {
    // the recorded menu (speaker: netwave_bot)
    bot_welcome: [
      t("Gracias | por | llamar | a | NetWave.", "Thanks | for | calling | — | NetWave.", "Thank you for calling NetWave.", { flags: { 3: FLAG_A_CALL } }),
    ],
    bot_recorded: [
      t("Esta | llamada | puede | ser | grabada | con | fines | de | calidad.", "This | call | may | be | recorded | with | purposes | of | quality.",
        "This call may be recorded for quality purposes."),
    ],
    bot_menu: [
      t("Para | pagos | y | facturación, | diga | «pagos» | o | marque | 1. | Para | soporte | técnico, | diga | «soporte» | o | marque | 2.",
        "For | payments | and | billing, | say | “pagos” | or | press | 1. | For | support | technical, | say | “soporte” | or | press | 2.",
        "For payments and billing, say “pagos” or press 1. For technical support, say “soporte” or press 2.",
        { say: "Para pagos y facturación, diga pagos, o marque uno. Para soporte técnico, diga soporte, o marque dos." }),
    ],
    bot_menu_sales: [
      t("Para | contratar | o | hacer | una | recarga, | diga | «ventas» | o | marque | 3.", "For | signing up | or | making | a | top-up, | say | “ventas” | or | press | 3.",
        "To sign up or top up your credit, say “ventas” or press 3.",
        { say: "Para contratar o hacer una recarga, diga ventas, o marque tres.", flags: { 5: "Mexican: una recarga = a prepaid top-up; elsewhere recargar saldo." },
          neutral: t("Para | contratar | o | recargar | saldo, | diga | «ventas» | o | marque | 3.", "For | signing up | or | topping up | credit, | say | “ventas” | or | press | 3.",
            "To sign up or top up your credit, say “ventas” or press 3.", { say: "Para contratar o recargar saldo, diga ventas, o marque tres." }) }),
    ],
    bot_didnt_get: [t("Lo siento, | no le entendí.", "I'm sorry, | I didn't understand you.", "Sorry, I didn't get that.",
        { spain: t("Lo siento, | no le he entendido.", "I'm sorry, | I didn't understand you.", "Sorry, I didn't get that.") })],
    bot_agent: [
      t("Con gusto | le | ayudo. | ¿Llama | por | pagos | o | por | soporte | técnico?", "Gladly | (to) you | I-help. | Are you calling | about | payments | or | about | support | technical?",
        "I can help with that. Are you calling about billing or technical support?", { spain: t("Claro, | le | ayudo. | ¿Llama | por | pagos | o | por | soporte | técnico?", "Sure, | (to) you | I-help. | Are you calling | about | payments | or | about | support | technical?", "I can help with that. Are you calling about billing or technical support?") }),
    ],
    bot_sales: [
      t("Nuestra | área | de | ventas | está | cerrada | en este momento. | {m:Lo|f:La} | comunico | con | atención a clientes.",
        "Our | department | of | sales | is | closed | at the moment. | You | I-connect | with | customer service.",
        "Our sales team is closed right now. I'll connect you to customer service.", { flags: { 7: FLAG_YOU_LO },
        spain: t("Nuestra | área | de | ventas | está | cerrada | en este momento. | Le | paso | con | atención al cliente.", "Our | department | of | sales | is | closed | at the moment. | (To) you | I-put-through | with | customer service.", "Our sales team is closed right now. I'll connect you to customer service.", { flags: { 7: "le: “you” (usted); pasar con = to put you through to." } }) }),
    ],
    bot_connect_support: [
      t("Por favor, | espere | en | la | línea | mientras | {m:lo|f:la} | comunico | con | soporte | técnico.", "Please, | wait | on | the | line | while | you | I-connect | with | support | technical.",
        "Please hold while I connect you to technical support.", { flags: { 6: FLAG_YOU_LO },
        spain: t("Por favor, | espere | en | la | línea | mientras | le | paso | con | el | servicio | técnico.", "Please, | wait | on | the | line | while | (to) you | I-put-through | with | the | service | technical.", "Please hold while I connect you to technical support.", { flags: { 6: "le: “you” (usted); pasar con = to put you through to." } }) }),
    ],
    bot_connect_billing: [
      t("Por favor, | espere | en | la | línea | mientras | {m:lo|f:la} | comunico | con | el | área | de | pagos.", "Please, | wait | on | the | line | while | you | I-connect | with | the | department | of | payments.",
        "Please hold while I connect you to billing.", { flags: { 6: FLAG_YOU_LO, 10: "el área: área is feminine but takes el, like el agua." },
        spain: t("Por favor, | espere | en | la | línea | mientras | le | paso | con | el | área | de | facturación.", "Please, | wait | on | the | line | while | (to) you | I-put-through | with | the | department | of | billing.", "Please hold while I connect you to billing.", { flags: { 6: "le: “you” (usted); pasar con = to put you through to.", 10: "el área: área is feminine but takes el, like el agua." } }) }),
    ],
    bot_connect_agent: [
      t("Por favor, | espere | al | siguiente | asesor | disponible.", "Please, | wait | for the | next | agent | available.", "Please hold for the next available agent.",
        { flags: { 4: "asesor: what Mexican companies call their phone agents." } }),
    ],
    bot_important: [t("Su | llamada | es | muy | importante | para | nosotros.", "Your | call | is | very | important | for | us.", "Your call is very important to us.")],
    bot_wait: [
      t("El | tiempo | de | espera | aproximado | es | de | 5 | minutos.", "The | time | of | wait | approximate | is | — | 5 | minutes.", "The current wait time is about 5 minutes.",
        { say: "El tiempo de espera aproximado es de cinco minutos.", flags: { 6: "de: Spanish puts de before an amount here; English has no word." } }),
    ],
    bot_wait_long: [
      t("Todos | nuestros | asesores | están | ocupados. | El | tiempo | de | espera | aproximado | es | de | 20 | minutos.",
        "All | our | agents | are | busy. | The | time | of | wait | approximate | is | — | 20 | minutes.",
        "All of our agents are busy. The current wait time is about 20 minutes.",
        { say: "Todos nuestros asesores están ocupados. El tiempo de espera aproximado es de veinte minutos.", flags: { 11: "de: Spanish puts de before an amount here; English has no word." } }),
    ],

    // Karla
    claire_greet: [
      t("¡Gracias | por | su | espera! | Le atiende | Karla.", "Thanks | for | your | wait! | You're speaking with | Karla.", "Thanks for holding! This is Karla.",
        { flags: { 4: "Le atiende: the call-center way to say who's helping you, literally attends to you." } }),
      t("Buenas tardes, | gracias | por | llamar | a | NetWave. | Le atiende | Karla.", "Good afternoon, | thanks | for | calling | — | NetWave. | You're speaking with | Karla.",
        "Good afternoon, thanks for calling NetWave. This is Karla.", { flags: { 4: FLAG_A_CALL } }),
      t("Hola, | habla | Karla, | de | NetWave.", "Hello, | speaking | Karla, | from | NetWave.", "Hello, this is Karla at NetWave.",
        { flags: { 1: "habla: on the phone, this is…, literally speaks." } }),
    ],
    thanks_patience: [
      t("¡Gracias | por | su | paciencia! | Le atiende | Karla.", "Thanks | for | your | patience! | You're speaking with | Karla.", "Thank you for your patience! This is Karla.",
        { flags: { 4: "Le atiende: the call-center way to say who's helping you, literally attends to you." } }),
    ],
    claire_context: [
      t("Veo | que | tiene | problemas | con | su | internet.", "I see | that | you have | problems | with | your | internet.", "I see you're having trouble with your internet."),
    ],
    ask_name: [
      t("¿Con | quién | tengo | el | gusto?", "With | whom | do I have | the | pleasure?", "Who am I speaking with?",
        { flags: { 0: "A polite Mexican way to ask your name on the phone." } }),
      t("¿Me | da | su | nombre | completo, | por favor?", "(To) me | you-give | your | name | full, | please?", "Can I have your full name, please?"),
    ],
    name_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thank you.")],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead."), t("Sí, | adelante.", "Yes, | go ahead.", "Yes, go ahead.")],
    ask_account: [
      t("¿Me | proporciona | su | número | de | cuenta?", "(To) me | you-provide | your | number | of | account?", "Could I have your account number?"),
      t("¿Y | cuál | es | su | número | de | cuenta?", "And | which | is | your | number | of | account?", "And what's your account number?"),
    ],
    account_found: [
      t("Listo, | ya | tengo | su | cuenta | aquí.", "Ready, | now | I-have | your | account | here.", "Okay, I have your account here.",
        { spain: t("Ya está, | ya | tengo | su | cuenta | aquí.", "Done, | now | I-have | your | account | here.", "Okay, I have your account here.") }),
      t("Perfecto, | ya | me | aparece | su | cuenta.", "Perfect, | now | (to) me | it-shows-up | your | account.", "Great, I've got your account up."),
    ],
    acct_lookup: [
      t("No se preocupe. | ¿Me | da | el | teléfono | registrado | en | la | cuenta?", "Don't worry. | (To) me | you-give | the | phone number | registered | on | the | account?",
        "That's okay. What's the phone number on the account?"),
    ],
    acct_by_name: [
      t("Está bien, | la | busco | con | su | nombre. | Listo, | ya | la | tengo.", "That's fine, | it | I'll-look-up | with | your | name. | Done, | now | it | I-have.",
        "That's fine, I'll look it up by your name. There, I've got it.", { flags: { 1: "la: it, la cuenta.", 8: "la: it, la cuenta." },
        spain: t("Está bien, | la | busco | con | su | nombre. | Ya está, | ya | la | tengo.", "That's fine, | it | I'll-look-up | with | your | name. | Done, | now | it | I-have.", "That's fine, I'll look it up by your name. There, I've got it.", { flags: { 1: "la: it, la cuenta.", 8: "la: it, la cuenta." } }) }),
    ],
    acct_where: [
      t("Viene | hasta arriba | de | su | recibo.", "It comes | at the very top | of | your | bill.", "It's at the top of your bill.",
        { flags: { 4: "recibo: in Mexico also the monthly bill (el recibo de luz, de teléfono)." },
        spain: t("Viene | arriba del todo | en | su | factura.", "It comes | at the very top | on | your | bill.", "It's at the top of your bill.") }),
    ],
    ask_problem: [
      t("¿En | qué | le | puedo | ayudar | hoy?", "In | what | (to) you | can I | help | today?", "How can I help you today?"),
      t("Cuénteme, | ¿qué | pasó?", "Tell me, | what | happened?", "So, what's going on?",
        { spain: t("Cuénteme, | ¿qué | ha pasado?", "Tell me, | what | has happened?", "So, what's going on?") }),
    ],
    ask_problem_again: [t("Entonces, | ¿en | qué | le | puedo | ayudar?", "So, | in | what | (to) you | can I | help?", "So, how can I help?")],
    sorry_problem: [
      t("Ay, | lo siento | mucho.", "Oh, | I'm sorry | a lot.", "Oh no, I'm so sorry."),
      t("Lamento | escuchar | eso.", "I regret | to hear | that.", "I'm sorry to hear that."),
    ],
    ask_since: [t("¿Desde | cuándo | no tiene | servicio?", "Since | when | you don't have | service?", "How long has it been out?")],
    // asked a second time after another answer: a short reminder
    since_unknown: [t("No se preocupe.", "Don't worry.", "That's okay.")],
    ask_since_again: [t("¿Y | desde | cuándo | está | sin | servicio?", "And | since | when | are you | without | service?", "And how long has it been out?")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Entendido.", "Understood.", "Got it."), t("De acuerdo, | gracias.", "Agreed, | thanks.", "Okay, thanks.")],
    ask_lights: [
      t("¿De | qué | color | está | la | luz | de | internet | en | su | módem?", "Of | what | color | is | the | light | of | internet | on | your | modem?",
        "What color is the internet light on your modem?",
        { flags: { 10: FLAG_MODEM },
          neutral: t("¿De | qué | color | está | la | luz | de | internet | en | su | router?", "Of | what | color | is | the | light | of | internet | on | your | router?",
            "What color is the internet light on your router?") }),
      t("¿Qué | luces | ve | en | el | aparato?", "What | lights | do you see | on | the | device?", "What lights do you see on the box?"),
    ],
    lights_meaning: [
      t("Okey, | eso | normalmente | quiere decir | que | no hay | señal.", "Okay, | that | usually | means | that | there isn't | signal.",
        "Okay, that usually means there's no signal.",
        { spain: t("Vale, | eso | normalmente | quiere decir | que | no hay | señal.", "Okay, | that | usually | means | that | there isn't | signal.", "Okay, that usually means there's no signal.") }),
    ],
    lights_off: [
      t("Mmm, | entonces | no le está llegando | señal.", "Hmm, | so | it's not reaching you | signal.", "Hmm, so no signal is getting through to you."),
    ],
    ask_restart: [
      t("¿Ya | intentó | desconectarlo | y | volverlo a conectar?", "Already | did you try | to unplug it | and | to plug it back in?",
        "Have you tried unplugging it and plugging it back in?", { flags: { 0: "Ya in a question: already, as in English have you … yet." },
        spain: t("¿Ha probado | a | desconectarlo | y | volverlo a conectar?", "Have you tried | — | to unplug it | and | to plug it back in?", "Have you tried unplugging it and plugging it back in?") }),
      t("¿Ya | reinició | el | módem?", "Already | did you restart | the | modem?", "Have you tried restarting the modem?",
        { flags: { 3: FLAG_MODEM }, neutral: t("¿Ya | reinició | el | router?", "Already | did you restart | the | router?", "Have you tried restarting the router?"),
        spain: t("¿Ha reiniciado | ya | el | router?", "Have you restarted | already | the | router?", "Have you tried restarting the router?") }),
    ],
    restart_ok: [t("Gracias | por | intentarlo.", "Thanks | for | trying it.", "Thanks for trying that.")],
    restart_now: [
      t("¿Lo | puede | desconectar | de | la | luz | unos | 30 | segundos? | Aquí | {m:lo|f:la} | espero.",
        "It | can you | unplug | from | the | power | about | 30 | seconds? | Here | (for) you | I-wait.",
        "Could you unplug it for about 30 seconds? I'll wait.",
        { say: "¿Lo puede desconectar de la luz unos treinta segundos? Aquí {m:lo|f:la} espero.",
          flags: { 5: "la luz: also the electricity, the power.", 6: "unos + a number: about, roughly.", 10: FLAG_YOU_LO } }),
    ],
    plug_back: [
      t("Muy | bien. | Ahora | vuelva a conectarlo. | ¿Sigue | en | rojo | la | luz?", "Very | good. | Now | plug it back in. | Is it still | in | red | the | light?",
        "Great. Now plug it back in. Is the light still red?"),
    ],
    // the learner said the light is orange
    plug_back_orange: [
      t("Muy | bien. | Ahora | vuelva a conectarlo. | ¿Sigue | en | naranja | la | luz?", "Very | good. | Now | plug it back in. | Is it still | in | orange | the | light?",
        "Great. Now plug it back in. Is the light still orange?"),
    ],
    still_red_ok: [t("Mmm, | entiendo.", "Hmm, | I understand.", "Hmm, okay.")],
    wait_here: [t("Claro, | sin prisa.", "Sure, | no rush.", "Sure, no rush.")],
    green_ok: [
      t("¡Ah, | qué | bien! | Pero | todavía | veo | una | falla | en | la | línea.", "Oh, | how | good! | But | still | I-see | a | fault | on | the | line.",
        "Oh, good! But I'm still seeing a problem on the line.",
        { spain: t("¡Ah, | qué | bien! | Pero | todavía | veo | una | avería | en | la | línea.", "Oh, | how | good! | But | still | I-see | a | fault | on | the | line.", "Oh, good! But I'm still seeing a problem on the line.") }),
    ],
    line_test: [t("Déjeme | hacer | una | prueba | de | su | línea.", "Let me | do | a | test | of | your | line.", "Let me run a test on your line.")],
    line_problem: [
      t("Ya veo: | hay | una | falla | en | la | línea, | afuera | de | su | casa.", "I see: | there is | a | fault | on | the | line, | outside | of | your | house.",
        "Okay, I see a problem with the line outside your home.", { spain: t("Ya veo: | hay | una | avería | en | la | línea, | fuera | de | su | casa.", "I see: | there is | a | fault | on | the | line, | outside | of | your | house.", "Okay, I see a problem with the line outside your home.") }),
    ],
    need_tech: [
      t("Vamos | a | tener | que | mandarle | un | técnico.", "We're going | to | have | to | send you | a | technician.", "We'll need to send a technician."),
    ],
    tech_offer: [
      t("Le | puedo | agendar | la | visita | el | {$weekday}, | entre | {$win}. | ¿Le queda | bien?",
        "(For) you | I can | schedule | the | visit | on | {$weekday}, | between | {$win}. | Does it suit you | well?",
        "I can book the visit for {$weekday}, between {$win}. Does that work for you?",
        { say: "Le puedo agendar la visita el {$weekday}, entre {$win}. ¿Le queda bien?", flags: { 5: FLAG_EL_DAY },
        spain: t("Le | puedo | programar | la | visita | el | {$weekday}, | entre | {$win}. | ¿Le viene | bien?", "(For) you | I-can | schedule | the | visit | on | {$weekday}, | between | {$win}. | Does it suit you | well?", "I can book the visit for {$weekday}, between {$win}. Does that work for you?") }),
      t("La | primera | cita | disponible | es | el | {$weekday}, | entre | {$win}. | ¿Le queda | bien?",
        "The | first | appointment | available | is | on | {$weekday}, | between | {$win}. | Does it suit you | well?",
        "The earliest appointment is {$weekday}, between {$win}. Does that work for you?",
        { say: "La primera cita disponible es el {$weekday}, entre {$win}. ¿Le queda bien?", flags: { 5: FLAG_EL_DAY },
        spain: t("La | primera | cita | disponible | es | el | {$weekday}, | entre | {$win}. | ¿Le viene | bien?", "The | first | appointment | available | is | on | {$weekday}, | between | {$win}. | Does it suit you | well?", "The earliest appointment is {$weekday}, between {$win}. Does that work for you?") }),
    ],
    tech_offer_alt: [
      t("También | tenemos | el | {$weekday}, | entre | {$win}.", "Also | we-have | — | {$weekday}, | between | {$win}.", "We also have {$weekday}, between {$win}.",
        { say: "También tenemos el {$weekday}, entre {$win}.", flags: { 2: FLAG_EL_DAY } }),
      t("¿Qué tal | el | {$weekday}, | entre | {$win}?", "How about | — | {$weekday}, | between | {$win}?", "How about {$weekday}, between {$win}?",
        { say: "¿Qué tal el {$weekday}, entre {$win}?", flags: { 1: FLAG_EL_DAY } }),
    ],
    no_earlier: [
      t("Lo siento, | es | el | horario | más | temprano | que | tenemos.", "I'm sorry, | it's | the | time slot | most | early | that | we-have.", "Sorry, that's the earliest slot we have."),
    ],
    no_day: [t("Lo siento, | ese | día | ya | no tenemos | lugar.", "I'm sorry, | that | day | anymore | we don't have | room.", "Sorry, we're fully booked that day.",
        { spain: t("Lo siento, | ese | día | ya | no tenemos | hueco.", "I'm sorry, | that | day | anymore | we don't have | an opening.", "Sorry, we're fully booked that day.") })],
    tech_offer_again: [
      t("Entonces, | ¿le queda | bien | el | {D}?", "So, | does it suit you | well | — | {D}?", "So, does {D} work for you?", { flags: { 3: FLAG_EL_DAY },
        spain: t("Entonces, | ¿le viene | bien | el | {D}?", "So, | does it suit you | well | — | {D}?", "So, does {D} work for you?", { flags: { 3: FLAG_EL_DAY } }) }),
    ],
    billing_first: [
      t("Con gusto | le | ayudo. | Primero, | ¿me | da | su | número | de | cuenta?", "Gladly | (to) you | I-help. | First, | (to) me | you-give | your | number | of | account?",
        "I can help with that. First, could I have your account number?", { spain: t("Claro, | le | ayudo. | Primero, | ¿me | da | su | número | de | cuenta?", "Sure, | (to) you | I-help. | First, | (to) me | you-give | your | number | of | account?", "I can help with that. First, could I have your account number?") }),
    ],
    ask_someone: [
      t("¿Puede | haber | alguien | más | en | su | casa? | Tiene | que | ser | mayor de edad.", "Can | there be | someone | else | at | your | home? | It has | to | be | an adult.",
        "Could someone else be home? It has to be an adult, 18 or older."),
    ],
    someone_ok: [t("Perfecto.", "Perfect.", "Perfect.")],
    no_problem_alt: [t("No hay problema.", "No problem.", "No problem.")],
    tech_booked: [
      t("¡Listo! | El | técnico | va | el | {$weekday}, | entre | {$win}.", "Done! | The | technician | is going | on | {$weekday}, | between | {$win}.",
        "All set! The technician will come on {$weekday}, between {$win}.", { say: "¡Listo! El técnico va el {$weekday}, entre {$win}.", flags: { 4: FLAG_EL_DAY },
        spain: t("¡Hecho! | El | técnico | va | el | {$weekday}, | entre | {$win}.", "Done! | The | technician | is going | on | {$weekday}, | between | {$win}.", "All set! The technician will come on {$weekday}, between {$win}.") }),
    ],
    tech_call_ahead: [
      t("Le | van | a | llamar | media | hora | antes de | llegar.", "(To) you | they're going | to | call | half | an hour | before | arriving.",
        "They'll call you half an hour before they arrive."),
    ],
    reference: [
      t("Su | número | de | reporte | es | el | {$text}.", "Your | number | of | report | is | — | {$text}.", "Your report number is {$text}.",
        { say: "Su número de reporte es el {$text}.", write: REF_NOTE, flags: { 5: "el (número): Spanish puts an article before a code or number; English has no word here." }, spain: t("Su | número | de | incidencia | es | el | {$text}.", "Your | number | of | incident | is | — | {$text}.", "Your report number is {$text}.", { flags: { 5: "el (número): Spanish puts an article before a code or number; English has no word here." }, say: "Su número de incidencia es el {$text}." }) }),
    ],
    reference_again: [
      t("Claro. | Es | el | {$text}.", "Sure. | It's | — | {$text}.", "Sure. It's {$text}.",
        { say: "Claro. Es el {$text}.", write: REF_NOTE, flags: { 2: "el (número): Spanish puts an article before a code or number; English has no word here." } }),
    ],
    spell_ref: [
      t("Claro: | N, | W, | 4, | 8, | 2, | 1, | 3.", "Sure: | N, | W, | 4, | 8, | 2, | 1, | 3.", "Sure: N, W, 4, 8, 2, 1, 3.",
        { say: "Claro: ene, doble u, cuatro, ocho, dos, uno, tres.", write: REF_NOTE, flags: { 2: "W: doble u in Mexico and much of Latin America; doble ve in some countries, uve doble in Spain." } }),
    ],
    text_it: [
      t("Claro, | ahorita | se lo | mando | por | mensaje.", "Sure, | right now | it to you | I-send | by | message.", "Sure, I'll text it to you right now.",
        { flags: { 1: "Mexican: ahorita = right now (or in a little while)." },
          neutral: t("Claro, | ahora mismo | se lo | mando | por | mensaje.", "Sure, | right now | it to you | I-send | by | message.", "Sure, I'll text it to you right now.") }),
    ],
    tech_free: [
      t("No tiene | ningún | costo, | porque | la | falla | es | de | nuestro | lado.", "It doesn't have | any | cost, | because | the | fault | is | on | our | side.",
        "There's no charge, since the problem is on our end.",
        { spain: t("No tiene | ningún | coste, | porque | la | avería | es | cosa | nuestra.", "It doesn't have | any | cost, | because | the | fault | is | thing | ours.", "There's no charge, since the problem is on our end.") }),
    ],
    tech_takes: [t("Normalmente | como | una | hora.", "Usually | about | an | hour.", "Usually about an hour.")],
    // "¿Tengo que estar en casa?"
    home_needed: [t("Sí, | usted | o | alguien | mayor de edad.", "Yes, | you | or | someone | adult.", "Yes, you or another adult.")],

    // billing
    billing_check: [t("Déjeme | revisar...", "Let me | check...", "Let me check...")],
    billing_right: [
      // "una disculpa" is Mexico's formula; the neutral twin says "le pido disculpas" (the lead's decision, 5 Nov 2026, as p26)
      t("Tiene | razón, | ¡una | disculpa!", "You have | reason, | an | apology!", "You're right, I'm so sorry about that!",
        { flags: { 0: "Tiene razón: you're right, literally you have reason.", 3: "Mexican: una disculpa (literally, an apology) = I apologize." },
          neutral: t("Tiene | razón, | ¡le | pido | disculpas!", "You have | reason, | (of) you | I-ask | apologies!", "You're right, I'm so sorry about that!",
            { flags: { 0: "Tiene razón: you're right, literally you have reason.", 3: "pedir disculpas: to apologize (literally, to ask for apologies)." } }) }),
    ],
    billing_two: [
      t("Veo | dos | cargos | de | {$amount} | este | mes.", "I see | two | charges | of | {$amount} | this | month.", "I see two charges of {$amount} this month."),
    ],
    refund: [
      t("Le | voy | a | reembolsar | uno. | Lo | va | a | ver | reflejado | en | unos | días | hábiles.",
        "(To) you | I'm going | to | refund | one. | It | you're going | to | see | reflected | in | a few | days | business.",
        "I'll refund one of them. You'll see it in a few business days."),
    ],
    credit: [
      t("Y | le | voy | a | hacer | una | bonificación | por | los | días | sin | internet.", "And | (to) you | I'm going | to | make | a | credit | for | the | days | without | internet.",
        "And I'll add a credit for the days without internet."),
    ],
    refund_none: [
      t("Mmm, | no veo | ningún | cargo | por | reembolsar | en | su | cuenta.", "Hmm, | I don't see | any | charge | to | refund | on | your | account.",
        "Hmm, I don't see any charge to refund on your account."),
    ],
    refund_when: [
      t("En | unos | días | hábiles; | depende | de | su | banco.", "In | a few | days | business; | it depends | on | your | bank.", "In a few business days; it depends on your bank."),
    ],

    // supervisor, waiting
    manager_ok: [
      t("Entiendo. | Puedo | pedirle | a | mi | supervisor | que | le | devuelva | la | llamada.",
        "I understand. | I can | ask | — | my | supervisor | that | (to) you | he-return | the | call.", "I understand. I can ask my supervisor to call you back.",
        { flags: { 3: "a: the personal a before a person who is the object; English has no word." } }),
    ],
    manager_first: [t("Pero | primero | déjeme | intentar | resolverlo.", "But | first | let me | try | to solve it.", "But let me try to fix this for you first.")],
    wait_sorry: [t("Lamento | mucho | la | espera.", "I regret | a lot | the | wait.", "I'm so sorry about the wait.")],

    // the phone line
    breaking_up: [
      t("Perdón, | se está cortando. | ¿Me lo | puede | repetir?", "Sorry, | it's cutting out. | It to me | can you | repeat?", "Sorry, you're breaking up. Could you say that again?"),
      t("Perdón, | no le escuché | bien. | ¿Me | repite | el | número?", "Sorry, | I didn't hear you | well. | (To) me | you-repeat | the | number?",
        "Sorry, I didn't catch that. Could you repeat the number?", { spain: t("Perdón, | no | le | he | oído | bien. | ¿Me | repite | el | número?", "Sorry, | not | you | I-have | heard | well. | (To) me | you-repeat | the | number?", "Sorry, I didn't catch that. Could you repeat the number?") }),
    ],
    speak_up_ok: [
      t("¡Ay, | perdón! | ¿Así | está | mejor?", "Oh, | sorry! | Like this | is it | better?", "Oh, sorry! Is this better?"),
      t("¡Perdón! | ¿Ya | me | escucha?", "Sorry! | Now | me | do you hear?", "Sorry about that! Can you hear me now?",
        { spain: t("¡Perdón! | ¿Ya | me | oye?", "Sorry! | Now | me | do you hear?", "Sorry about that! Can you hear me now?") }),
    ],
    hear_you: [t("Sí, | {m:lo|f:la} | escucho | bien.", "Yes, | you | I-hear | fine.", "Yes, I can hear you fine.", { flags: { 1: FLAG_YOU_LO },
        spain: t("Sí, | {m:lo|f:la} | oigo | bien.", "Yes, | you | I-hear | fine.", "Yes, I can hear you fine.", { flags: { 1: FLAG_YOU_LO } }) })],
    hear_great: [t("¡Qué | bien!", "How | good!", "Great!")],

    anything_else: [
      t("¿Hay | algo | más | en | que | le | pueda | ayudar?", "Is there | something | else | in | which | (to) you | I can | help?", "Is there anything else I can help you with?"),
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | else?", "Can I help you with anything else?"),
    ],
    anything_else_yes: [t("Claro, | ¿qué | más | necesita?", "Sure, | what | else | do you need?", "Sure, what else can I do for you?")],
    bye: [
      t("Gracias | por | llamar | a | NetWave. | ¡Que | tenga | buena | tarde!", "Thanks | for | calling | — | NetWave. | (I hope) | you have | a good | afternoon!",
        "Thanks for calling NetWave. Have a good afternoon!", { flags: { 3: FLAG_A_CALL } }),
      t("Gracias | por | su | paciencia. | ¡Que | tenga | buen | día!", "Thanks | for | your | patience. | (I hope) | you have | a good | day!", "Thanks for your patience. Have a good day!"),
    ],
  },

  domains: {
    weekday: () => Object.values(WEEKDAY),
    win: () => Object.keys(WINDOWS).map(win),
    text: () => [REFERENCE],
    amount: () => [CHARGE],
  },

  hints: {
    menu: {
      lt: "Choose an option in the menu",
      items: [
        { id: "menu_support", s: t("Soporte.", "Support.", "Technical support."), note: "The recording waits for one word: “soporte”." },
        { id: "menu_two", s: t("Dos.", "Two.", "Two (the second option)."), note: "Or just say the number: “dos”." },
        { id: "menu_tech", s: t("Soporte | técnico, | por favor.", "Support | technical, | please.", "Technical support, please.") },
        { id: "menu_billing", s: t("Pagos.", "Payments.", "Billing.") },
        { id: "menu_agent", s: t("Un | asesor, | por favor.", "An | agent, | please.", "An agent, please."),
          note: "If the menu doesn't understand you, “asesor” or “operador” usually gets you a person." },
      ],
    },
    name: {
      lt: "Give your full name",
      items: [{ id: "name_mine", s: t("Me llamo | {$name} | {$surname}.", "My name is | {$name} | {$surname}.", "My name is {$name} {$surname}."),
        note: "On the phone Mexicans also say “Habla…” (this is…)." }],
    },
    account: {
      lt: "Give your account number",
      items: [
        { id: "acct_is", s: t("Mi | número | de | cuenta | es | 742-9133.", "My | number | of | account | is | 742-9133.", "My account number is 742-9133.",
          { say: "Mi número de cuenta es siete cuatro dos, noventa y uno, treinta y tres." }), note: "Digit by digit or in pairs, as Mexicans often say them: both work." },
        { id: "acct_unknown", s: t("Perdón, | no sé | mi | número | de | cuenta.", "Sorry, | I don't know | my | number | of | account.", "Sorry, I don't know my account number.") },
      ],
    },
    problem: {
      lt: "Say what isn't working",
      items: [
        { id: "prob_down", s: t("Mi | internet | no funciona.", "My | internet | doesn't work.", "My internet isn't working.") },
        { id: "prob_none", s: t("No tengo | internet | desde | ayer.", "I don't have | internet | since | yesterday.", "I haven't had internet since yesterday.") },
        { id: "prob_stopped", s: t("Mi | internet | dejó | de | funcionar | ayer.", "My | internet | stopped | — | working | yesterday.", "My internet stopped working yesterday.",
          { flags: { 3: "dejar de + verb: to stop doing it; de has no word in English." } }) },
        { id: "prob_wifi", s: t("El | wifi | no sirve.", "The | Wi-Fi | doesn't work.", "The Wi-Fi isn't working."), note: "No sirve: very common in Mexico for doesn't work." },
        { id: "prob_connect", s: t("No me puedo | conectar | a | internet.", "I can't | connect | to | the internet.", "I can't connect to the internet.") },
        { id: "prob_router", s: t("Mi | módem | parpadea | en | rojo.", "My | modem | is blinking | in | red.", "My modem is blinking red.",
          { flags: { 1: FLAG_MODEM }, neutral: t("Mi | router | parpadea | en | rojo.", "My | router | is blinking | in | red.", "My router is blinking red.") }) },
        { id: "prob_trouble", s: t("Tengo | problemas | con | mi | internet.", "I have | problems | with | my | internet.", "I'm having trouble with my internet.") },
        { id: "lights_red", s: t("La | luz | parpadea | en | rojo.", "The | light | is blinking | in | red.", "The light is blinking red.") },
        { id: "since_y", s: t("Desde | ayer.", "Since | yesterday.", "Since yesterday.") },
      ],
    },
    billing: {
      lt: "Say you were charged twice",
      items: [
        { id: "bill_twice", s: t("Me | cobraron | dos | veces | este | mes.", "(To) me | they-charged | two | times | this | month.", "I was charged twice this month.",
          { flags: { 1: "cobraron: they charged; Spanish says they instead of a passive." },
        spain: t("Me | han cobrado | dos | veces | este | mes.", "(To) me | they-have-charged | two | times | this | month.", "I was charged twice this month.", { flags: { 1: "han cobrado: they have charged; Spanish says they instead of a passive." } }) }) },
      ],
    },
    restart: {
      lt: "Answer about restarting the modem",
      items: [
        { id: "restart_did", s: t("Sí, | ya | lo | reinicié | tres | veces.", "Yes, | already | it | I-restarted | three | times.", "Yes, I already restarted it three times.",
          { flags: { 2: "lo: it, el módem." },
        spain: t("Sí, | ya | lo | he reiniciado | tres | veces.", "Yes, | already | it | I-have-restarted | three | times.", "Yes, I already restarted it three times.", { flags: { 2: "lo: it, el router." } }) }) },
        { id: "restart_not", s: t("No, | todavía no.", "No, | not yet.", "No, not yet.") },
      ],
    },
    tech: {
      lt: "Agree on the technician's visit",
      items: [
        { id: "tech_ok", s: t("Me queda | bien.", "It suits me | well.", "That works for me.",
        { spain: t("Me viene | bien.", "It suits me | well.", "That works for me.") }) },
        { id: "tech_work", s: t("Perdón, | a | esa | hora | estoy | en | el | trabajo.", "Sorry, | at | that | time | I'm | at | — | work.", "Sorry, I'm at work then.",
          { flags: { 6: "el trabajo: Spanish says the work; English has no article." } }) },
        { id: "tech_weekend", s: t("¿Tiene | algo | el | sábado?", "Do you have | something | on | Saturday?", "Do you have anything on Saturday?", { flags: { 2: FLAG_EL_DAY } }) },
        { id: "tech_afternoon", s: t("¿Hay | algo | en la tarde?", "Is there | something | in the afternoon?", "Is there anything in the afternoon?", { spain: t("¿Hay | algo | por la tarde?", "Is there | something | in the afternoon?", "Is there anything in the afternoon?") }),
          note: "Mexico says en la tarde; por la tarde works too." },
        { id: "someone_yes", s: t("Mi | esposa | puede | estar | en casa.", "My | wife | can | be | at home.", "My wife can be home.") },
        { id: "someone_no", s: t("No, | vivo | {m:solo|f:sola}.", "No, | I-live | alone.", "No, I live alone.") },
      ],
    },
    other: {
      lt: "Other requests",
      items: [
        { id: "manager", s: t("¿Puedo | hablar | con | un | supervisor?", "Can I | speak | with | a | supervisor?", "Could I speak to a supervisor?") },
        { id: "waited", s: t("¡Llevo | veinte | minutos | esperando!", "I've been | twenty | minutes | waiting!", "I've been on hold for twenty minutes!",
          { flags: { 0: "llevar + time + -ando: how long you've been doing something." } }) },
        { id: "ref_q", s: t("¿Me | da | un | número | de | reporte?", "(To) me | you-give | a | number | of | report?", "Could I get a reference number?", { spain: t("¿Me | da | un | número | de | incidencia?", "(To) me | you-give | a | number | of | incident?", "Could I get a reference number?") }),
          note: "Mexicans also say el folio." },
        { id: "text_me", s: t("¿Me lo | puede | mandar | por | mensaje?", "It to me | can you | send | by | message?", "Could you text it to me?") },
      ],
    },
    phone: {
      lt: "Manage the phone line",
      items: [
        { id: "ph_speak_up", s: t("Perdón, | ¿puede | hablar | más | fuerte?", "Sorry, | can you | speak | more | loudly?", "Sorry, could you speak up?") },
        { id: "ph_breaking", s: t("Perdón, | se está cortando.", "Sorry, | it's cutting out.", "Sorry, you're breaking up.") },
        { id: "ph_hear", s: t("¿Me | escucha | ahora?", "Me | do you hear | now?", "Can you hear me now?",
        { spain: t("¿Me | oye | ahora?", "Me | do you hear | now?", "Can you hear me now?") }) },
      ],
    },
    since: {
      lt: "Say since when it's been down",
      items: [
        { id: "since_y", s: t("Desde | ayer.", "Since | yesterday.", "Since yesterday.") },
        { id: "since_when", s: t("Ayer | en la tarde.", "Yesterday | in the afternoon.", "Yesterday afternoon.", { spain: t("Ayer | por la tarde.", "Yesterday | in the afternoon.", "Yesterday afternoon.") }) },
      ],
    },
    lights: {
      lt: "Describe the lights",
      items: [
        { id: "lights_red", s: t("La | luz | parpadea | en | rojo.", "The | light | is blinking | in | red.", "The light is blinking red.") },
        { id: "lights_there", s: t("Hay | una | luz | roja.", "There is | a | light | red.", "There's a red light.") },
        { id: "lights_none", s: t("No prende | ninguna | luz.", "Doesn't come on | any | light.", "None of the lights are on.",
          { flags: { 0: "Mexican: prender = to turn on, to come on; elsewhere encender." },
            neutral: t("No enciende | ninguna | luz.", "Doesn't come on | any | light.", "None of the lights are on.") }) },
      ],
    },
    done: {
      lt: "Say you've unplugged it",
      items: [
        { id: "done", s: t("Listo, | ya está.", "Ready, | that's it.", "Okay, done.",
        { spain: t("Hecho, | ya está.", "Done, | that's it.", "Okay, done.") }) },
        { id: "done_unplugged", s: t("Ya | lo | desconecté.", "Already | it | I-unplugged.", "Okay, I unplugged it.",
        { spain: t("Ya | lo | he desconectado.", "Already | it | I-have-unplugged.", "Okay, I unplugged it.") }) },
      ],
    },
    still: {
      lt: "Say whether the light is still red",
      items: [
        { id: "still_red", s: t("Sigue | parpadeando | en | rojo.", "It keeps | blinking | in | red.", "It's still blinking red.") },
        { id: "still_nothing", s: t("No, | no cambió | nada.", "No, | didn't change | nothing.", "No, nothing changed.",
          { flags: { 1: "Spanish uses a double negative: no … nada = nothing." },
        spain: t("No, | no ha cambiado | nada.", "No, | hasn't changed | nothing.", "No, nothing changed.", { flags: { 1: "Spanish uses a double negative: no … nada = nothing." } }) }) },
      ],
    },
    someone: {
      lt: "Say whether someone else can be home",
      items: [
        { id: "someone_yes", s: t("Mi | esposa | puede | estar | en casa.", "My | wife | can | be | at home.", "My wife can be home.") },
        { id: "someone_no", s: t("No, | vivo | {m:solo|f:sola}.", "No, | I-live | alone.", "No, I live alone.") },
      ],
    },
    hear: {
      lt: "Say whether you can hear her now",
      items: [
        { id: "hear_better", s: t("Sí, | así | está | mejor.", "Yes, | like this | it's | better.", "Yes, that's better.") },
        { id: "hear_now", s: t("Sí, | ya | {sm:lo|sf:la} | escucho.", "Yes, | now | you | I-hear.", "Yes, I can hear you now.",
          { flags: { 2: "lo / la: you; la for a woman, as Karla is." },
        spain: t("Sí, | ya | {sm:lo|sf:la} | oigo.", "Yes, | now | you | I-hear.", "Yes, I can hear you now.", { flags: { 2: "lo / la: you; la for a woman, as Karla is." } }) }) },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [{ id: "more_all", s: t("No, | gracias, | es | todo.", "No, | thanks, | it's | all.", "No, thanks, that's everything.") }],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a company's agent, usted is more polite: puede (puedes is for friends).", better: "¿Me puede pasar con un supervisor?" },
  },

  merges: {
    "atención al cliente": { reason: "lexical_expression", split: "atención → attention + al → to the + cliente → customer: one name, customer service.", minimal: "Three words." },
    "arriba del todo": { reason: "lexical_expression", split: "arriba → up + del → of the + todo → all: = at the very top.", minimal: "Three words." },
    "le viene": { reason: "lexical_expression", split: "le → (to) you + viene → comes: venir bien = to suit (Spain, for times and plans).", minimal: "Two words." },
    "me viene": { reason: "lexical_expression", split: "me → (to) me + viene → comes: venir bien = to suit (Spain, for times and plans).", minimal: "Two words." },
    "le atiende": { reason: "lexical_expression", split: "le → (to) you + atiende → attends is the call-center formula: you're speaking with.", minimal: "Two words; the name stays outside." },
    "en este momento": { reason: "lexical_expression", split: "en → in + este → this + momento → moment is the fixed adverb: at the moment.", minimal: "Three words." },
    "atención a clientes": { reason: "lexical_expression", split: "atención → attention + a → to + clientes → customers is the department's name: customer service.", minimal: "Three words, one name." },
    "hasta arriba": { reason: "lexical_expression", split: "hasta → until + arriba → up misreads the place: at the very top.", minimal: "Two words." },
    "quiere decir": { reason: "lexical_expression", split: "quiere → wants + decir → to say is false; = means.", minimal: "Two words." },
    "volverlo a conectar": { reason: "lexical_expression", split: "volver → to return + lo → it + a + conectar → connect: volver a + verb means again; = to plug it back in.", minimal: "The periphrasis." },
    "vuelva a conectarlo": { reason: "lexical_expression", split: "vuelva → return + a + conectarlo → connect it: volver a + verb means again; = plug it back in.", minimal: "The periphrasis." },
    "mayor de edad": { reason: "lexical_expression", split: "mayor → older + de → of + edad → age is the fixed term: an adult (18 or older).", minimal: "Three words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of: de has no English word before a verb; = before.", minimal: "Two words." },
    "se está cortando": { reason: "lexical_expression", split: "se → itself + está → is + cortando → cutting: the phone phrase = it's cutting out (you're breaking up).", minimal: "Three words." },
    "en la tarde": { reason: "lexical_expression", split: "en → in + la → the + tarde → afternoon: Mexico's way to say in the afternoon; the article lines up with English's.", minimal: "Three words." },
    "no le está llegando": { reason: "grammatical_fusion", split: "no → not + le → to you + está → is + llegando → arriving: English puts not inside the verb phrase (it isn't reaching you).", minimal: "Negation, pronoun and the progressive." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → no gives still no; the fixed reply = not yet.", minimal: "Two words." },
    "en casa": { reason: "lexical_expression", split: "en → in + casa → house: the fixed phrase at home.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Choose technical support", done: (c) => !!c.s.routed },
    { lt: "Give your name and account number", done: (c) => !!c.s.name && !!c.s.account },
    { lt: "Say what isn't working", done: internet },
    { lt: "Report the double charge", done: (c) => !!c.s.refunded, when: (c) => !!c.s.billingPending || !!c.s.refunded, optional: true },
    { lt: "Answer the questions about the modem", done: (c) => !!c.s.lights && c.s.restarted !== undefined && !c.s.restartPending },
    { lt: "Book the technician's visit", done: (c) => !!c.s.techBooked },
  ],

  steps: [
    { id: "menu", silent: true, done: (c) => !!c.s.routed,
      ask: (c) => {
        c.speaker("netwave_bot");
        const n = bump(c, "menu");
        if (n === 0) { c.say("bot_welcome"); c.say("bot_recorded"); }
        else c.say("bot_didnt_get");
        c.say("bot_menu");
        if (n === 0 && c.s.menuSales) c.say("bot_menu_sales");
      },
      expects: ["menu_support", "menu_billing", "menu_sales", "menu_agent", "menu_num_ctx", "internet_down", "charged_twice", "menu_social_ctx"],
      suggest: [S_MENU, { lt: "Ask for a real person (an agent)", hint: "menu" }] },
    { id: "name", when: (c) => !!c.s.routed, done: (c) => !!c.s.name,
      ask: (c) => { claireOn(c); c.say("ask_name"); }, expects: ["name_ctx"], yes: goAhead,
      suggest: [{ lt: "Give your full name", hint: "name" }, S_PHONE] },
    { id: "account", when: (c) => !!c.s.name, done: (c) => !!c.s.account,
      ask: (c) => { claireOn(c); c.say(c.s.lookup ? "acct_lookup" : "ask_account"); },
      expects: ["account_ans", "account_ctx", "acct_unknown", "same_number_ctx"], yes: goAhead,
      no: (c) => { support.handlers.acct_unknown(c, {}, { intent: "acct_unknown", slots: {}, tags: [] }); },
      suggest: [{ lt: "Give your account number: 742-9133", hint: "account" }, S_PHONE] },
    problemStep("problem", false),
    problemStep("problem_bill", true),
    // asked at most twice: a learner who answers something else twice is not asked a third time
    { id: "since", when: (c) => c.s.problem === "down" && !!c.s.askSince && (c.s.asked?.since ?? 0) < 2, done: (c) => !!c.s.since,
      ask: (c) => { c.say(bump(c, "since") === 0 ? "ask_since" : "ask_since_again"); }, expects: ["since_ans", "since_ctx"],
      suggest: [{ lt: "Say since when it's been down", hint: "since" }] },
    { id: "lights", when: (c) => internet(c), done: (c) => !!c.s.lights,
      ask: (c) => c.say("ask_lights"), expects: ["lights_ans", "lights_ctx", "lights_neg"],
      suggest: [{ lt: "Describe the lights (blinking red)", hint: "lights" }] },
    { id: "restart", when: (c) => internet(c) && !!c.s.lights, done: (c) => c.s.restarted !== undefined,
      ask: (c) => c.say("ask_restart"), expects: ["restart_yes", "restart_no"],
      suggest: [{ lt: "Say whether you've tried turning it off and on", hint: "restart" }],
      yes: (c) => { c.s.restarted = true; c.say("restart_ok"); },
      no: (c) => { askRestartNow(c); } },
    { id: "tech", when: (c) => internet(c) && c.s.restarted !== undefined && !c.s.restartPending, done: (c) => !!c.s.techBooked,
      ask: (c) => {
        if (!c.s.diagnosed) { c.s.diagnosed = true; c.say("line_test"); c.say("line_problem"); c.say("need_tech"); offerWindow(c, c.s.firstWindow, true); return; }
        const w = WINDOWS[c.s.window];
        c.say("tech_offer_again", { D: w.d, win: win(c.s.window) });
      },
      expects: ["tech_accept", "tech_busy", "tech_other", "tech_other_ctx", "tech_cost_q", "tech_cost_ctx", "tech_time_q", "tech_when_q", "home_q"],
      suggest: [{ lt: "Accept, or ask for another time", hint: "tech" }],
      yes: (c) => { bookTech(c); },
      no: (c) => { support.handlers.tech_busy(c, {}, { intent: "tech_busy", slots: {}, tags: [] }); } },
    { id: "more", when: (c) => !!c.s.techBooked || (!!c.s.refunded && !internet(c)), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"), expects: ["more_no", "more_yes_ctx", "charged_twice", "reference_q", "text_me", "tech_cost_ctx", "tech_when_q"],
      suggest: [{ lt: "Say that's all", hint: "more" }, { lt: "Ask for the number by text, or for a supervisor", hint: "other" }],
      yes: (c) => { c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.longHold = c.visits >= 1 && c.chance(0.5);
    c.s.chargeTwist = c.visits >= 1 && c.chance(0.5);
    c.s.badLine = c.chance(0.35);
    c.s.askSince = c.chance(0.7);
    c.s.menuSales = c.chance(0.5);
    c.s.firstWindow = c.chance(0.7) ? "thu_am" : "fri_am";
  },

  start: (c) => {
    c.ask("menu");
  },

  handlers: {
    // --- menu
    g_hello(c) {
      // "¿Bueno?" / "Hola" to the recorded menu: it simply goes on; Karla answers a greeting normally.
      if (atMenu(c)) return;
      if (!c.s.__greetedBack) { c.say("g_hello"); c.s.__greetedBack = true; }
    },
    menu_support(c) { route(c, "support"); },
    menu_billing(c) { route(c, "billing"); },
    menu_sales(c) { if (c.s.routed) return; c.speaker("netwave_bot"); c.say("bot_sales"); c.s.routed = "sales"; turn(c).routedNow = true; },
    menu_agent(c) {
      if (c.s.routed) {
        if (turn(c).routedNow) return; // "Soporte técnico. Un asesor, por favor.": said to the recording, which has routed
        // talking to Karla: "Necesito ayuda" is for her; only an agent or a person asked for is the supervisor request
        if (!/asesor|operador|ejecutiv|agente|persona|humano/.test(heard(c))) { claireOn(c); goAhead(c); return; }
        support.handlers.manager(c, {}, { intent: "manager", slots: {}, tags: [] }); return;
      }
      if (!c.s.agentAsked) {
        c.s.agentAsked = true;
        c.speaker("netwave_bot");
        c.say("bot_agent");
        c.hold();
        return;
      }
      route(c, "agent");
    },
    menu_social_ctx() { /* the recording plays its options again (the step asks again) */ },
    menu_num_ctx(c, _slots, seg) {
      if (c.s.routed) return;
      const n = seg.tags.includes("n1") ? 1 : seg.tags.includes("n2") ? 2 : seg.tags.includes("n3") ? 3 : seg.tags.includes("n0") ? 0 : -1;
      if (n === 1) route(c, "billing");
      else if (n === 2) route(c, "support");
      else if (n === 3) support.handlers.menu_sales(c, {}, { intent: "menu_sales", slots: {}, tags: [] });
      else if (n === 0) support.handlers.menu_agent(c, {}, { intent: "menu_agent", slots: {}, tags: [] });
    },

    // --- identity
    name_ctx(c, slots) {
      const td = turn(c);
      const part = [slots.name, slots.name2].flat().filter(Boolean).join(" ").trim();
      if (!part) return;
      if (!/\s/.test(part) && !td.name && notAName(c, part)) return;
      if (!td.name) { td.name = true; const had = !!c.s.name; c.s.name = part; if (!had) c.say("name_thanks"); return; }
      c.s.name = `${c.s.name} ${part}`;
    },
    account_ans(c, slots) { setAccount(c, [slots.digits, slots.digits2].filter(Boolean).join("")); },
    account_ctx(c, slots) { setAccount(c, slots.digits); },
    // "No sé" / "No me lo sé" at the account question: the number is what isn't known
    g_dontknow(c) {
      if (atMenu(c)) return;
      // "No sé" at "¿Desde cuándo…?": Karla doesn't need it (asked again, it would be a loop of "Tómese su tiempo")
      if (c.step === "since" && !c.s.since) { c.s.since = "unknown"; c.say("since_unknown"); return; }
      if (c.step === "account" && !c.s.account) { support.handlers.acct_unknown(c, {}, { intent: "acct_unknown", slots: {}, tags: [] }); return; }
      // "No sé" at "¿De qué color está la luz…?": she goes on without it (the line test will show the fault)
      if (c.step === "lights" && !c.s.lights) { c.s.lights = "unknown"; c.say("since_unknown"); return; }
      // "No sé" at "¿Ya reinició el módem?": she asks for it now
      if (c.step === "restart" && c.s.restarted === undefined && !c.s.restartPending) { askRestartNow(c); return; }
      GLOBAL_HANDLERS.g_dontknow?.(c as ConvCtx, {});
    },
    // "Es este mismo número" when Karla asks for the phone on the account: she finds it by the number calling
    same_number_ctx(c) {
      if (atMenu(c) || c.s.account) return;
      c.s.account = "caller";
      c.say("account_found");
      if (c.s.billingPending) support.handlers.charged_twice(c, {}, { intent: "charged_twice", slots: {}, tags: [] });
    },
    acct_unknown(c) {
      if (c.s.account || atMenu(c)) return;
      if (/donde/.test(heard(c))) c.say("acct_where");
      // no number and no phone number either: she finds the account by the name
      if (c.s.lookup) { c.s.account = "by_name"; c.say("acct_by_name"); if (c.s.billingPending) support.handlers.charged_twice(c, {}, { intent: "charged_twice", slots: {}, tags: [] }); return; }
      c.s.lookup = true;
    },

    // --- problem
    internet_down(c, _slots, seg) { if (seg.tags.includes("since") && !atMenu(c)) c.s.since = true; problem(c, "down"); },
    it_broken_ctx(c) { problem(c, "down"); },
    internet_slow(c) { problem(c, "slow"); },
    slow_ctx(c) { problem(c, "slow"); },
    internet_drops(c) { problem(c, "drops"); },
    charged_twice(c) {
      // said to the recorded menu: to payments; Karla takes it up once she has the account
      if (atMenu(c)) { route(c, "billing"); c.s.billingPending = true; return; }
      if (c.s.refunded) { c.say("refund_when"); return; }
      claireOn(c);
      if (!c.s.account) { c.s.billingPending = true; if (c.step !== "account" && c.step !== "name") c.say("billing_first"); return; }
      c.s.billingPending = false;
      c.s.refunded = true;
      c.s.moreDone = false;
      if (!c.s.problem) c.s.problem = "billing";
      c.twist("charged_twice");
      c.say("billing_check");
      c.say("billing_right");
      c.say("billing_two", { amount: CHARGE });
      c.say("refund");
      if (internet(c) || c.s.techBooked) { c.s.creditSaid = true; c.say("credit"); }
    },
    // a time said once the technician is on the table is about the visit, not the outage
    since_ans(c) { if (c.s.window || atMenu(c)) return; if (!c.s.since) { c.s.since = true; c.say("ack"); } },
    since_ctx(c) { support.handlers.since_ans(c, {}, { intent: "since_ans", slots: {}, tags: [] }); },
    lights_ans(c) {
      if (c.s.lights) return;
      // "La luz parpadea en rojo" to the recorded menu: an internet problem (to support); Karla asks about the light
      if (atMenu(c)) { problem(c, "down"); return; }
      c.s.lights = true;
      const h = heard(c);
      c.s.orange = /naranja|anaranjad|ambar/.test(h) && !/roj/.test(h);
      if (!internet(c)) problem(c, "down", true);
      if (/roj|naranja|anaranjad|ambar|parpade|prende y apaga|titila/.test(h)) c.say("lights_meaning");
      else if (/ningun|apagad|no prende|no enciende|nada/.test(h)) c.say("lights_off");
      else c.say("ack");
    },
    lights_neg(c) { if (c.s.lights || atMenu(c)) return; c.s.lights = true; c.s.orange = false; if (!internet(c)) problem(c, "down", true); c.say("ack"); },
    lights_ctx(c) { support.handlers.lights_ans(c, {}, { intent: "lights_ans", slots: {}, tags: [] }); },
    restart_yes(c) { if (atMenu(c) || c.s.restarted !== undefined || c.s.restartPending) return; c.s.restarted = true; c.say("restart_ok"); },
    restart_no(c) {
      if (atMenu(c)) return;
      // "Todavía no" while Karla waits for the unplugging: she keeps waiting (not the same request again)
      if (c.s.restartPending) { c.say("wait_here"); c.expect(restartNowPending()); return; }
      if (c.s.restarted !== undefined) return;
      askRestartNow(c);
    },
    done_ctx() { /* handled by the pending questions */ },
    doing_ctx() { /* handled by the pending question */ },
    still_red(c) { if (c.s.restartPending) stillRed(c); },
    green_now(c) {
      if (c.s.restartPending) { c.s.restartPending = false; c.s.restarted = true; c.say("green_ok"); return; }
      // "Ya funciona" at the technician's offer: the line test still shows the fault
      if (c.s.window && !c.s.techBooked) c.say("green_ok");
    },

    // --- technician
    tech_accept(c, slots) {
      if (!c.s.window || c.s.techBooked) return;
      const d = slots.day as string | undefined;
      const pmWanted = /tarde|noche/.test(heard(c));
      const w = WINDOWS[c.s.window];
      if ((d && d !== w.d) || (d && pmWanted !== w.pm && d === "thursday")) { support.handlers.tech_other(c, slots, { intent: "tech_other", slots, tags: [] }); return; }
      bookTech(c);
    },
    tech_busy(c) {
      if (!c.s.window || c.s.techBooked) return;
      // "No puedo el jueves, ¿y el viernes?": the other day is the answer (one question per turn)
      const alt = altAsked(c);
      if (alt) { support.handlers.tech_other(c, alt, { intent: "tech_other", slots: alt, tags: [] }); turn(c).altDone = true; return; }
      turn(c).busy = true;
      if (!c.s.askedSomeone) {
        c.s.askedSomeone = true;
        c.say("ask_someone");
        c.expect({
          id: "someone", expects: ["someone_yes", "someone_no", "tech_other_ctx"], hints: ["someone", "g_yesno"],
          suggest: [{ lt: "Say whether someone else can be home", hint: "someone" }],
          yes: (cc) => { cc.say("someone_ok"); bookTech(cc); },
          no: (cc) => { cc.say("no_problem_alt"); otherWindow(cc); },
          on: {
            someone_yes: (cc, sl) => { support.handlers.someone_yes(cc, sl, { intent: "someone_yes", slots: sl, tags: [] }); },
            someone_no: (cc) => { cc.say("no_problem_alt"); otherWindow(cc); },
            tech_other: (cc, sl) => { support.handlers.tech_other(cc, sl, { intent: "tech_other", slots: sl, tags: [] }); },
            tech_other_ctx: (cc, sl) => { support.handlers.tech_other(cc, sl, { intent: "tech_other", slots: sl, tags: [] }); },
            // "No sé": nobody sure to be home, so another window
            g_dontknow: (cc) => { cc.say("no_problem_alt"); otherWindow(cc); },
          },
          ask: (cc) => cc.say("ask_someone"),
        });
        return;
      }
      otherWindow(c);
    },
    someone_yes(c) {
      if (!c.s.window || c.s.techBooked) return;
      // "Mi esposo, pero solo en la tarde": not this window; offer the one asked for
      const alt = altAsked(c);
      if (alt) { support.handlers.tech_other(c, alt, { intent: "tech_other", slots: alt, tags: [] }); turn(c).altDone = true; return; }
      c.say("someone_ok"); bookTech(c);
    },
    someone_no(c) { if (c.s.window && !c.s.techBooked) { c.say("no_problem_alt"); otherWindow(c); } },
    tech_other(c, slots) {
      if (!c.s.window || c.s.techBooked || turn(c).altDone) return;
      const h = heard(c);
      // "¿No puede venir hoy?" is matched by its words, not the {day} slot ("Mi esposa no puede venir el jueves" stays a no)
      const d = (slots.day as string | undefined) ?? (/\bhoy\b/.test(h) ? "today" : /\bmanana\b/.test(h) && !/\b(en|por) la manana\b/.test(h) ? "tomorrow" : undefined);
      const notOffered = (ks: string[], other = false) => ks.find((x) => !(c.s.offered || []).includes(x) && x !== c.s.window && (!other || WINDOWS[x].d !== WINDOWS[c.s.window].d));
      let k = /sabado|fin de semana/.test(h) || d === "saturday" ? "sat" : /tarde|noche|despues/.test(h) ? "thu_pm" : d === "friday" ? "fri_am" : d === "thursday" ? "thu_am"
        : /temprano/.test(h) ? notOffered(["thu_am", "fri_am", "sat"]) : /otro dia/.test(h) ? notOffered(["fri_am", "sat", "thu_am", "thu_pm"], true) : undefined;
      // "¿No hay algo más temprano?" when the morning slot is already on offer: it's the earliest
      if (/temprano/.test(h) && !d && !WINDOWS[c.s.window].pm) { c.say("no_earlier"); c.say("tech_offer_again", { D: WINDOWS[c.s.window].d, win: win(c.s.window) }); c.hold(); return; }
      // a day with no visits: another day than the one on offer (the caller may be busy all that day)
      if (d && !["saturday", "friday", "thursday"].includes(d) && !k) { c.say("no_day"); k = notOffered(["sat", "fri_am", "thu_pm"], true) ?? ["thu_pm", "sat", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat"; }
      if (!k) k = ["thu_pm", "sat", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat";
      if (k === c.s.window) { bookTech(c); return; }
      offerWindow(c, k);
      c.hold();
    },
    // "Trabajo en la tarde": the part of the day belongs to the busy answer, not a new request
    tech_other_ctx(c, slots) { if (turn(c).busy) return; support.handlers.tech_other(c, slots, { intent: "tech_other", slots, tags: [] }); },
    // the visit's cost, length and time: answered once a visit is on the table (before that the step asks again)
    tech_cost_q(c) { if (c.s.window || c.s.techBooked) c.say("tech_free"); },
    tech_cost_ctx(c) { if (c.s.window || c.s.techBooked) c.say("tech_free"); },
    tech_time_q(c) { if (c.s.window || c.s.techBooked) c.say("tech_takes"); },
    // "¿A qué hora llega el técnico?": no exact time, but a call half an hour before
    tech_when_q(c) { if (c.s.window || c.s.techBooked) c.say("tech_call_ahead"); },
    // "¿Tengo que estar en casa?": while "¿Puede haber alguien más…?" is open, that question (asked again) answers it
    home_q(c) {
      if (!c.s.window && !c.s.techBooked) return;
      if ((c as ConvCtx).conv?.pending?.id === "someone") return;
      c.say("home_needed");
    },

    // --- other
    manager(c) {
      if (atMenu(c)) { if (!c.s.routed) support.handlers.menu_agent(c, {}, { intent: "menu_agent", slots: {}, tags: [] }); return; }
      claireOn(c);
      c.twist("manager");
      c.say("manager_ok");
      if (!c.s.techBooked) c.say("manager_first");
    },
    wait_complaint(c) { if (atMenu(c)) return; claireOn(c); c.say("wait_sorry"); },
    // the report exists from the start of the call: Karla always gives the number
    reference_q(c) { if (atMenu(c)) return; c.say("reference_again", { text: REFERENCE }); },
    text_me(c) { textIt(c as ConvCtx); },
    g_write(c) { textIt(c as ConvCtx); },
    g_spell(c) {
      if (atMenu(c)) return;
      if (c.s.techBooked) { c.say("spell_ref"); c.hold(); return; }
      GLOBAL_HANDLERS.g_spell(c as ConvCtx, {});
    },
    refund_q(c) {
      // money back, asked of the recorded menu: it goes to payments
      if (atMenu(c)) { route(c, "billing"); return; }
      if (c.s.refunded) { c.say("refund_when"); return; }
      // the double charge is on the account (the twist): asking about the money back reports it
      if (c.s.chargeTwist && c.s.routed) { support.handlers.charged_twice(c, {}, { intent: "charged_twice", slots: {}, tags: [] }); return; }
      claireOn(c); c.say("refund_none");
    },

    // --- the phone line
    speak_up(c) {
      // a recording can't speak up: it plays its options again
      if (atMenu(c)) return;
      c.say("speak_up_ok");
      c.expect({
        id: "hear", optional: true, expects: ["hear_ok"], hints: ["hear"],
        suggest: [{ lt: "Say whether you can hear her now", hint: "hear" }],
        yes: (cc) => { cc.say("hear_great"); },
        no: (cc) => { cc.say("speak_up_ok"); },
        on: { hear_ok: (cc) => { cc.say("hear_great"); } },
      });
    },
    hear_me(c) { if (atMenu(c)) return; c.say("hear_you"); },
    hear_ok(c) { if (atMenu(c)) return; c.say("hear_great"); },

    // --- what the recorded menu does with the global skills: no person's "¡Claro!" or "Sin prisa"; a repeat,
    //     "más despacio" or "¿Qué significa…?" replays its options; anything else gets them again (atMenu).
    //     Not g_thanks, g_sorry, g_ok: a handler here would stop "Sí. Muchas gracias." counting as a plain yes.
    g_repeat(c, slots) { if (atMenu(c)) { (c as ConvCtx).conv.replayLast(false); c.hold(); return; } GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots); },
    g_slower(c, slots) {
      if (atMenu(c)) { const cv = (c as ConvCtx).conv; cv.markSlow(); cv.replayLast(true); c.hold(); return; }
      GLOBAL_HANDLERS.g_slower(c as ConvCtx, slots);
    },
    g_dont_understand(c, slots) {
      if (atMenu(c)) { const cv = (c as ConvCtx).conv; cv.markSlow(); cv.replayLast(true); cv.showMeaning(); c.hold(); return; }
      GLOBAL_HANDLERS.g_dont_understand(c as ConvCtx, slots);
    },
    g_meaning(c, slots) { if (atMenu(c)) { (c as ConvCtx).conv.showMeaning(); c.hold(); return; } GLOBAL_HANDLERS.g_meaning(c as ConvCtx, slots); },
    g_howareyou(c, slots) { if (!atMenu(c)) GLOBAL_HANDLERS.g_howareyou(c as ConvCtx, slots); },
    g_wait(c, slots) { if (!atMenu(c)) GLOBAL_HANDLERS.g_wait(c as ConvCtx, slots); },
    g_learning(c, slots) { if (!atMenu(c)) GLOBAL_HANDLERS.g_learning(c as ConvCtx, slots); },
    // "Adiós" to the recording: the caller hangs up
    g_bye(c, slots) { if (atMenu(c)) { c.end(); c.hold(); return; } GLOBAL_HANDLERS.g_bye(c as ConvCtx, slots); },

    more_yes_ctx(c) { if (c.step === "more" && !c.s.moreDone) { c.say("anything_else_yes"); c.hold(); } },
    more_no(c) {
      if (atMenu(c)) return;
      const st = support.steps.find((x) => x.id === c.step);
      // "No, es todo. Adiós." is a goodbye (the bye handler ends the call), not a "no" to the open question
      if (st && st.id !== "more" && st.no && !st.done(c) && !BYE.test(heard(c))) { st.no(c); return; }
      c.s.moreDone = true;
    },
  },

  finish: (c) => {
    if (c.s.techBooked) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { if (turn(cc).bye) return; turn(cc).bye = true; cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { if (turn(cc).bye) return; turn(cc).bye = true; cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // every hint construction
    { say: "Soporte.", intent: "menu_support", step: "menu" },
    { say: "Dos.", intent: "menu_num_ctx", step: "menu" },
    { say: "Soporte técnico, por favor.", intent: "menu_support", step: "menu" },
    { say: "Pagos.", intent: "menu_billing", step: "menu" },
    { say: "Un asesor, por favor.", intent: "menu_agent", step: "menu" },
    { say: "Me llamo Ryan Miller.", intent: "name_ctx", step: "name" },
    { say: "Mi número de cuenta es 742-9133.", intent: "account_ans", step: "account", slots: { digits: "7429133" } },
    { say: "Perdón, no sé mi número de cuenta.", intent: "acct_unknown", step: "account", not: ["account_ans", "account_ctx"] },
    { say: "Mi internet no funciona.", intent: "internet_down" },
    { say: "No tengo internet desde ayer.", intent: "internet_down" },
    { say: "Mi internet dejó de funcionar ayer.", intent: "internet_down" },
    { say: "El wifi no sirve.", intent: "internet_down" },
    { say: "No me puedo conectar a internet.", intent: "internet_down" },
    { say: "Mi módem parpadea en rojo.", intent: "internet_down" },
    { say: "Mi router parpadea en rojo.", intent: "internet_down" },
    { say: "Tengo problemas con mi internet.", intent: "internet_down" },
    { say: "La luz parpadea en rojo.", intent: "lights_ans", step: "lights" },
    { say: "Desde ayer.", intent: "since_ans", step: "since" },
    { say: "Ayer en la tarde.", intent: "since_ctx", step: "since" },
    { say: "Me cobraron dos veces este mes.", intent: "charged_twice" },
    { say: "Sí, ya lo reinicié tres veces.", intent: "restart_yes", step: "restart" },
    { say: "No, todavía no.", intent: "restart_no", step: "restart", not: ["restart_yes"] },
    { say: "Me queda bien.", intent: "tech_accept", step: "tech" },
    { say: "Perdón, a esa hora estoy en el trabajo.", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "¿Tiene algo el sábado?", intent: "tech_other", step: "tech" },
    { say: "¿Hay algo en la tarde?", intent: "tech_other", step: "tech" },
    { say: "Mi esposa puede estar en casa.", intent: "someone_yes" },
    { say: "No, vivo solo.", intent: "someone_no", not: ["someone_yes"] },
    { say: "¿Puedo hablar con un supervisor?", intent: "manager" },
    { say: "¡Llevo veinte minutos esperando!", intent: "wait_complaint" },
    { say: "¿Me da un número de reporte?", intent: "reference_q" },
    { say: "¿Me lo puede mandar por mensaje?", intent: "text_me" },
    { say: "Perdón, ¿puede hablar más fuerte?", intent: "speak_up" },
    { say: "Perdón, se está cortando.", intent: "speak_up" },
    { say: "¿Me escucha ahora?", intent: "hear_me" },
    { say: "Hay una luz roja.", intent: "lights_ans", step: "lights" },
    { say: "No prende ninguna luz.", intent: "lights_ans", step: "lights" },
    { say: "No enciende ninguna luz.", intent: "lights_ans", step: "lights" },
    { say: "Sigue parpadeando en rojo.", intent: "still_red" },
    { say: "No, no cambió nada.", intent: "still_red" },
    { say: "Sí, así está mejor.", intent: "hear_ok" },
    { say: "Sí, ya la escucho.", intent: "hear_ok" },
    { say: "No, gracias, es todo.", intent: "more_no", step: "more" },
    // natural alternatives, short answers, accentless typing, tú to staff
    { say: "Marco el dos", intent: "menu_num_ctx", step: "menu" },
    { say: "La segunda opción", intent: "menu_num_ctx", step: "menu" },
    { say: "Quiero hablar con una persona", intent: "menu_agent", step: "menu" },
    { say: "Quiero hacer una recarga", intent: "menu_sales", step: "menu" },
    { say: "Habla Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "Setecientos cuarenta y dos, noventa y uno, treinta y tres", intent: "account_ctx", step: "account", slots: { digits: "7429133" } },
    { say: "¿Me puede buscar con mi teléfono?", intent: "acct_unknown", step: "account" },
    { say: "Se fue el internet", intent: "internet_down", step: "problem" },
    { say: "mi internet no funciona desde ayer", intent: "internet_down", step: "problem" },
    { say: "El internet anda bien lento", intent: "internet_slow", step: "problem" },
    { say: "Se corta a cada rato", intent: "internet_drops", step: "problem" },
    { say: "La conexión está muy mala", intent: "slow_ctx", step: "problem" },
    { say: "No sirve", intent: "it_broken_ctx", step: "problem" },
    { say: "Rojo", intent: "lights_ctx", step: "lights" },
    { say: "Está en naranja", intent: "lights_ans", step: "lights" },
    { say: "Sí, pero no sirvió", intent: "restart_yes", step: "restart", not: ["restart_no"] },
    { say: "si ya lo apague y lo prendi", intent: "restart_yes", step: "restart" },
    { say: "Ya está en verde", intent: "green_now" },
    { say: "¿No tiene algo más tarde?", intent: "tech_other", step: "tech" },
    { say: "¿Cuánto cuesta la visita?", intent: "tech_cost_q", step: "tech" },
    { say: "¿Cuánto tarda?", intent: "tech_time_q", step: "tech" },
    { say: "el jueves esta bien", intent: "tech_accept", step: "tech" },
    { say: "Mi vecina le puede abrir", intent: "someone_yes" },
    { say: "¿Me puedes pasar con un supervisor?", intent: "manager" },
    { say: "¿Me lo manda por WhatsApp?", intent: "text_me", step: "more" },
    { say: "¿Cuándo me regresan mi dinero?", intent: "refund_q" },
    // Spain forms are correct answers
    { say: "Vale, el jueves me viene bien", intent: "tech_accept", step: "tech" },
    { say: "Me habéis cobrado dos veces", intent: "charged_twice" },
    { say: "¿Me lo podéis mandar por mensaje?", intent: "text_me", step: "more" },
    { say: "El router parpadea en rojo", intent: "lights_ans", step: "lights" },
    // meaning safety: no meaning may flip
    { say: "No lo reinicié", intent: "restart_no", step: "restart", not: ["restart_yes"] },
    { say: "Todavía no lo he reiniciado", intent: "restart_no", step: "restart", not: ["restart_yes"] },
    { say: "No puedo el jueves", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No me queda bien", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No voy a estar en casa", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No, el jueves no me queda", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No, mi esposa también trabaja", intent: "someone_no", not: ["someone_yes"] },
    { say: "Mi esposa no puede", intent: "someone_no", not: ["someone_yes"] },
    { say: "No, ya no está en rojo", intent: "green_now", not: ["still_red"] },
    { say: "No está en verde", intent: "still_red", not: ["green_now"] },
    { say: "Mi internet no está lento", intent: "none" },
    { say: "No me cobraron dos veces", intent: "none" },
    { say: "No quiero hablar con un supervisor", intent: "none", not: ["manager"] },
    { say: "No quiero pagos, quiero soporte", intent: "menu_support", step: "menu", not: ["menu_billing"] },
    { say: "El jueves no, mejor el viernes", intent: "tech_other", step: "tech", slots: { day: "friday" }, not: ["tech_accept"] },
    { say: "¿Y si no estoy en casa?", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "No puedo, trabajo", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "Así está bien", intent: "tech_accept", step: "tech" },
    { say: "Sí, pero en la tarde", intent: "tech_other", step: "tech" },
    { say: "El sábado", intent: "none", step: "problem" },
    { say: "No está en rojo", intent: "lights_neg", step: "lights", not: ["lights_ans"] },
    { say: "Opción número dos", intent: "menu_num_ctx", step: "menu" },
    { say: "Llamo porque no tengo internet", intent: "internet_down", step: "problem" },
    { say: "Sí, lo reinicié esta mañana", intent: "restart_yes", step: "restart" },
    { say: "Ya no funciona", intent: "still_red", not: ["green_now"] },
    { say: "No, ya está verde", intent: "green_now", not: ["still_red"] },
    // review (2 Nov 2026): traps and forms the blind set found
    { say: "No sé cómo", intent: "restart_no", step: "restart", not: ["restart_yes", "g_howareyou"] },
    { say: "Mi esposa no puede, trabaja todo el día", intent: "someone_no", not: ["someone_yes"] },
    { say: "Mi esposa también trabaja", intent: "someone_no", not: ["someone_yes"] },
    { say: "Estoy en casa todo el día", intent: "tech_accept", step: "tech" },
    { say: "No voy a estar en casa", intent: "tech_busy", step: "tech", not: ["tech_accept"] },
    { say: "¿Y si mejor el sábado?", intent: "tech_other", step: "tech", not: ["tech_accept"] },
    { say: "Jueves no, viernes", intent: "tech_other", step: "tech", slots: { day: "friday" }, not: ["tech_accept"] },
    { say: "El jueves en la mañana no, mejor en la tarde", intent: "tech_other", step: "tech", not: ["tech_accept"] },
    { say: "¿Cuánto cuesta la visita?", intent: "tech_cost_q", step: "tech", not: ["tech_accept"] },
    { say: "Se me cae la conexión a cada rato", intent: "internet_drops" },
    { say: "No es un problema de pago, es que no tengo internet", intent: "internet_down", not: ["charged_twice", "menu_billing"] },
    { say: "Es sobre mi recibo", intent: "menu_billing", step: "menu" },
    { say: "Necesito un técnico", intent: "menu_support", step: "menu" },
    { say: "No hay luz roja", intent: "lights_neg", step: "lights", not: ["lights_ans"] },
    { say: "Ya no necesito nada", intent: "more_no", step: "more" },
    { say: "Sí, una cosa más", intent: "more_yes_ctx", step: "more", not: ["more_no"] },
    { say: "No me acuerdo, creo que ayer", intent: "since_ctx", step: "since" },
    // audit (5 Nov 2026): the menu's own words, the answer to "¿Llama por pagos o por soporte técnico?", side questions
    { say: "Por soporte técnico", intent: "menu_support", step: "menu", not: ["menu_billing"] },
    { say: "Para soporte técnico", intent: "menu_support", step: "menu" },
    { say: "Es por mi internet", intent: "menu_support", step: "menu", not: ["menu_billing"] },
    { say: "Para pagos", intent: "menu_billing", step: "menu" },
    { say: "Gracias", intent: "menu_social_ctx", step: "menu" },
    { say: "Es este mismo número", intent: "same_number_ctx", step: "account", not: ["account_ans", "acct_unknown"] },
    { say: "Está parpadeando", intent: "lights_ctx", step: "lights" },
    { say: "Como desde las ocho de la noche", intent: "since_ans", step: "since" },
    { say: "¿A qué hora llega el técnico?", intent: "tech_when_q", step: "tech", not: ["tech_accept"] },
    { say: "¿Tengo que estar en casa?", intent: "home_q", step: "tech", not: ["tech_accept", "tech_busy"] },
    { say: "¿No puede venir hoy?", intent: "tech_other", step: "tech", not: ["tech_accept", "tech_busy"] },
    { say: "No voy a estar en casa ese día", intent: "tech_busy", step: "tech", not: ["home_q", "tech_accept"] },
    { say: "¿Cuánto cuesta?", intent: "tech_cost_ctx", step: "more" },
    // not understood
    { say: "Me gusta la pizza con piña", intent: "none" },
    { say: "Mi perro baila salsa en la playa", intent: "none" },
    { say: "Quiero comprar un boleto de avión", intent: "none" },
  ],

  sims: [
    { name: "review: can't unplug yet, another day in the same breath, someone only in the afternoon",
      turns: ["Soporte técnico.", "Ryan Miller.", "Es el 742 9133.", "Mi internet no funciona.", "Hay una luz roja.", "No sé cómo.", "Todavía no lo desconecto.",
        "Listo.", "Sigue en rojo.", "No puedo el jueves, ¿y el viernes?", "Trabajo.", "Mi esposo, pero solo en la tarde.", "Sí, me queda bien.",
        "Sí, una cosa más.", "¿Cuándo me regresan mi dinero?", "No, es todo."],
      expect: { complete: true, state: { techBooked: "thu_pm" } }, auto: SUPPORT_AUTO,
      setup: (s) => { s.badLine = false; s.askSince = false; s.chargeTwist = false; s.longHold = false; s.firstWindow = "thu_am"; } },
    { name: "internet down, technician on the first day offered",
      turns: ["Soporte técnico.", "Hola, me llamo Ryan Miller.", "Mi número de cuenta es 742 9133.", "Mi internet dejó de funcionar ayer.", "La luz parpadea en rojo.",
        "Sí, ya lo reinicié tres veces.", "Me queda bien.", "No, gracias, es todo."],
      expect: { complete: true }, auto: SUPPORT_AUTO, setup: (s) => { s.badLine = false; } },
    { name: "no account number, at work: someone else at home",
      turns: ["Dos.", "Ryan Miller.", "Perdón, no sé mi número de cuenta.", "998 145 2233", "Tengo problemas con mi wifi.", "Desde ayer.", "Hay una luz roja.",
        "No, todavía no.", "Listo, ya lo desconecté.", "Sigue parpadeando en rojo.", "Perdón, a esa hora estoy en el trabajo.", "Mi esposa puede estar en casa.",
        "¿Me lo puede mandar por mensaje?", "No, es todo."],
      expect: { complete: true, state: { lookup: true } }, auto: SUPPORT_AUTO, setup: (s) => { s.askSince = true; s.badLine = false; } },
    { name: "an agent first, then the afternoon",
      turns: ["Un asesor, por favor.", "Soporte técnico.", "Me llamo Ryan.", "Es el 742 9133.", "Mi internet no funciona.", "No prende ninguna luz.", "Sí, claro, mil veces.",
        "A esa hora estoy en el trabajo.", "No, vivo solo.", "¿Y en la tarde?", "Sí, el jueves en la tarde me queda bien.", "¿Me da un número de reporte?", "No, es todo, gracias."],
      expect: { complete: true, state: { techBooked: "thu_pm" } }, auto: SUPPORT_AUTO, setup: (s) => { s.badLine = false; s.firstWindow = "thu_am"; } },
    { name: "twist: charged twice too",
      turns: ["Soporte técnico, por favor.", "Ryan Miller.", "Es el 742 9133.", "Mi internet no funciona. Y me cobraron dos veces este mes.", "La luz parpadea en rojo.",
        "Sí, ya lo hice.", "Me queda bien.", "¿Cuándo me regresan el dinero?", "No, es todo. ¡Gracias!"],
      expect: { complete: true, state: { refunded: true } }, auto: SUPPORT_AUTO, setup: (s) => { s.chargeTwist = true; s.badLine = false; } },
    { name: "twists: a long hold and a bad line; a supervisor",
      turns: ["Soporte.", "Me llamo Ryan Miller.", "742 9133", "Perdón, no le escucho bien.", "Sí, así está mejor.", "Es el 742 9133.", "Llevo veinte minutos esperando.",
        "Mi internet no funciona desde anoche.", "Hay una luz roja.", "Sí, ya lo apagué y lo prendí.", "Quiero hablar con un supervisor.", "Está bien, me queda bien.", "No, es todo."],
      expect: { complete: true, state: { badLineDone: true } }, auto: SUPPORT_AUTO, setup: (s) => { s.longHold = true; s.badLine = true; } },
    { name: "short answers",
      turns: ["Dos.", "Ryan Miller.", "742 9133", "No funciona.", "Ayer.", "Rojo.", "Sí.", "Sí.", "No."],
      expect: { complete: true }, auto: omit(SUPPORT_AUTO, ["tech"]), setup: (s) => { s.badLine = false; s.askSince = true; } },
    { name: "questions, the orange light, it turns green",
      turns: ["Soporte técnico.", "Ryan Miller.", "Es el 742 9133.", "No tengo internet desde ayer.", "Está en naranja.", "No, todavía no.", "Listo.", "Ya está en verde.",
        "¿Cuánto cuesta la visita?", "¿Cuánto tarda?", "No puedo a esa hora.", "Sí, mi hijo puede estar.", "¿Me da el folio?", "¿Cómo se escribe?", "Gracias, es todo."],
      expect: { complete: true, state: { orange: true } }, auto: SUPPORT_AUTO, setup: (s) => { s.badLine = false; } },
    { name: "billing first by number, then the internet",
      turns: ["Uno.", "Ryan Miller.", "Es el 742 9133.", "Me cobraron dos veces este mes. Y además mi internet no funciona.", "Desde ayer.", "La luz parpadea en rojo.",
        "Sí, ya lo reinicié.", "Me queda bien.", "No, es todo."],
      expect: { complete: true, state: { refunded: true, routed: "billing" } }, auto: SUPPORT_AUTO, setup: (s) => { s.badLine = false; s.chargeTwist = true; s.askSince = true; } },
    { name: "no number at all, the light isn't red, another day",
      turns: ["Soporte técnico.", "Ryan Miller.", "No lo tengo a la mano.", "Perdón, tampoco lo tengo.", "Mi internet no funciona.", "No está en rojo.", "Sí, ya lo reinicié.",
        "¿No hay algo más temprano?", "Mejor otro día.", "El viernes me queda bien.", "No, es todo."],
      expect: { complete: true, state: { account: "by_name", techBooked: "fri_am" } }, auto: SUPPORT_AUTO,
      setup: (s) => { s.badLine = false; s.askSince = false; s.firstWindow = "thu_am"; } },
    // audit (5 Nov 2026): the recording only routes (each speaker says their own lines); an agent; "Es este mismo
    // número"; "No sé" at the light and the restart questions; the visit's questions; today is full, Saturday booked
    { name: "audit: the menu only routes, an agent, the same number, questions about the visit",
      turns: ["¿Me escucha?", "Operador.", "Operador.", "Ryan Miller.", "No sé mi número de cuenta.", "Es este mismo número.", "Mi internet no funciona.",
        "No sé.", "No sé.", "Listo.", "Ya está en verde.", "¿A qué hora llega el técnico?", "¿Tengo que estar en casa?", "¿No puede venir hoy?",
        "El sábado me queda bien.", "No, es todo."],
      expect: { complete: true, state: { routed: "agent", account: "caller", lights: "unknown", restarted: true, techBooked: "sat" } }, auto: SUPPORT_AUTO,
      setup: (s) => { s.badLine = false; s.askSince = false; s.longHold = false; s.chargeTwist = false; s.firstWindow = "thu_am"; } },
    { name: "audit: sales by the menu's words, where the number is, the charge first, then the internet",
      turns: ["Para ventas.", "Ryan Miller.", "¿Dónde lo encuentro?", "Es el 742 9133.", "Me cobraron dos veces este mes.", "¿Cuándo me regresan mi dinero?",
        "Sí, una cosa más.", "Mi internet no funciona.", "Como desde las ocho de la noche.", "Está parpadeando.", "Sí, ya lo reinicié.", "Me queda bien.", "No, es todo."],
      expect: { complete: true, state: { routed: "sales", refunded: true, creditSaid: true, techBooked: "thu_am" } }, auto: SUPPORT_AUTO,
      setup: (s) => { s.badLine = false; s.askSince = true; s.longHold = false; s.chargeTwist = true; s.firstWindow = "thu_am"; } },
  ],
};

function problem(c: Ctx, p: string, silent = false) {
  // said to the recorded menu: it routes to support, and Karla starts with "Veo que tiene problemas con su internet"
  if (atMenu(c)) { route(c, "support"); if (!c.s.problem || !internet(c)) c.s.problem = p; return; }
  claireOn(c);
  if (!setProblem(c, p)) return;
  if (!silent) c.say("sorry_problem");
  // the double charge came first: the credit for the days without internet follows now
  if (c.s.refunded && internet(c) && !c.s.creditSaid) { c.s.creditSaid = true; c.say("credit"); }
  if (c.s.refunded) c.s.moreDone = false;
}

function setAccount(c: Ctx, digits: string | undefined) {
  const td = turn(c);
  // the number said to the recorded menu: Karla asks for it once she's on
  if (atMenu(c) || td.rejected || !digits) return;
  if (c.s.badLine && !c.s.badLineDone && c.step === "account") {
    c.s.badLineDone = true; td.rejected = true;
    c.twist("bad_line"); c.say("breaking_up"); c.hold(); return;
  }
  td.digits = (td.digits ?? "") + digits;
  if (!td.ack) {
    td.ack = true;
    if (!c.s.account) {
      c.s.account = td.digits;
      c.say("account_found");
      if (c.s.billingPending) support.handlers.charged_twice(c, {}, { intent: "charged_twice", slots: {}, tags: [] });
      return;
    }
  }
  c.s.account = td.digits;
}

function askRestartNow(c: Ctx) {
  c.s.restartPending = true;
  c.say("restart_now");
  c.expect(restartNowPending());
}

/** "¿Lo puede desconectar…?": done (plug it back in), doing it now (Karla waits), or a moment (the global "Tómese su tiempo"). */
function restartNowPending() {
  return {
    id: "restart_now", expects: ["done_ctx", "doing_ctx"], hints: ["done", "g_yesno"],
    suggest: [{ lt: "Say you've unplugged it", hint: "done" }],
    yes: (cc: Ctx) => { plugBack(cc); },
    // a no to "¿Lo puede desconectar…?": not yet (she waits) or can't (she goes on to the line test)
    no: (cc: Ctx) => {
      if (/todavia|aun|espere|momento|ahorita/.test(heard(cc))) { cc.say("wait_here"); cc.expect(restartNowPending()); return; }
      cc.s.restartPending = false; cc.s.restarted = false; cc.say("no_problem_alt");
    },
    on: {
      done_ctx: (cc: Ctx) => { plugBack(cc); }, g_ok: (cc: Ctx) => { plugBack(cc); }, restart_yes: (cc: Ctx) => { plugBack(cc); }, g_wait: () => false,
      doing_ctx: (cc: Ctx) => { cc.say("wait_here"); cc.expect(restartNowPending()); },
      restart_no: (cc: Ctx) => { cc.say("wait_here"); cc.expect(restartNowPending()); },
    },
    ask: (cc: Ctx) => cc.say("restart_now"),
  };
}

function plugBack(c: Ctx) {
  if (turn(c).plug) return;
  turn(c).plug = true;
  c.say(c.s.orange ? "plug_back_orange" : "plug_back");
  c.expect({
    id: "still_red", expects: ["still_red", "green_now"], hints: ["still", "g_yesno"],
    suggest: [{ lt: "Say whether the light is still red", hint: "still" }],
    yes: (cc) => { stillRed(cc); }, no: (cc) => { stillRed(cc); },
    on: { still_red: (cc) => { stillRed(cc); }, green_now: (cc) => { cc.s.restartPending = false; cc.s.restarted = true; cc.say("green_ok"); } },
    ask: (cc) => cc.say(cc.s.orange ? "plug_back_orange" : "plug_back"),
  });
}

function stillRed(c: Ctx) {
  c.s.restartPending = false;
  c.s.restarted = true;
  c.say("still_red_ok");
}

const DAY_KEY: Record<string, string> = {
  lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday",
};
const ALT_RE = /\b(y|mejor|prefiero|que tal|pero|sino|puede|podria|solo|nomas)\s+(?:(?:venir|ir)\s+)?(el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo|fin de semana|otro dia)\b/;
/** A turn that refuses the window and names another one ("No puedo el jueves, ¿y el viernes?", "…, mejor en la tarde"):
 *  the slots for tech_other (the other day only, never the refused one), or null. */
function altAsked(c: Ctx): Record<string, any> | null {
  const h = heard(c);
  const w = WINDOWS[c.s.window];
  const m = h.match(ALT_RE);
  if (m && DAY_KEY[m[3]] !== w.d) return DAY_KEY[m[3]] ? { day: DAY_KEY[m[3]] } : {};
  return !w.pm && /\b(y|mejor|prefiero|que tal|pero|sino|solo|nomas)\s+(en la tarde|por la tarde|mas tarde)\b/.test(h) ? {} : null;
}

function otherWindow(c: Ctx) {
  const k = ["sat", "thu_pm", "fri_am", "thu_am"].find((x) => !(c.s.offered || []).includes(x)) ?? "sat";
  offerWindow(c, k);
  c.hold();
}

/** On the phone "¿Me lo escribe?" = text it: Karla texts the last thing she can write. */
function textIt(c: ConvCtx) {
  if (atMenu(c)) return;
  const lines = c.conv.lastLines;
  let w: string | null = null;
  for (let i = lines.length - 1; i >= 0 && !w; i--) {
    const src = c.conv.sit.lines[lines[i].lineId]?.[lines[i].variant];
    if (src?.write) w = src.write;
  }
  if (!w && (c.s.techBooked || c.s.claire)) w = REF_NOTE;
  if (!w) { c.say("no_problem_alt"); c.hold(); return; }
  c.say("text_it");
  c.conv.addNote({ en: w });
  c.hold();
}

export default support;
