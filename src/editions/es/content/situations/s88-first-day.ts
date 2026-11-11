// Song 88 "Where's the Coffee Machine?" → Puerto Colibrí: "¿Dónde está la cafetera?"
// The learner's first day at Línea Clara. María, a coworker (tú, as Mexican offices use between colleagues),
// welcomes the new colleague: introductions ("Hola, soy … Es mi primer día"), the desk, the laptop and the card with
// the username and password, a short tour (la sala de juntas, the restrooms down the hall), the learner's own
// questions (la cafetera and "¿Cómo funciona?", the kitchen, the fridge and the microwave, the garrafón of drinking
// water, the printer, the dress code with its casual Friday, lunch — "la comida", around two, Mexico's main meal —,
// when people go home, mugs, who is who: la licenciada Salinas from Recursos Humanos; IT is "sistemas"), a first task
// ("¿Me enseñas cómo funciona?", "¿Me mandas el archivo?"), an invitation to lunch at the cocina económica on the
// corner of calle Ceiba (comida corrida, about a hundred pesos, as in s69), and at six "¿Cómo te fue en tu primer
// día?" and "¡Nos vemos mañana!". If the learner never asks about coffee, María shows the cafetera anyway.
// Where things are follows the 3D town and room (docs/es/TOWN.md): Línea Clara is on avenida Juárez between Correos
// and calle Itzamná; the cocina económica is at the other end of the block, on calle Ceiba behind the bank, two
// minutes away; in the office the kitchen (cafetera, fridge, water cooler) is the front east corner, the printer by
// the back window.
// Twists (returning visits, as in the English): the cafetera is broken (instant coffee and tea in the cupboard);
// "¡Esa no, es la taza de Pablo!"; the paper is jammed in the printer; the badge (gafete) isn't ready yet.
// New here: if the learner declines lunch with a plain no, María may urge once ("¿No te animas?"), as Mexicans do;
// the learner can change their mind or say no again. She never urges after a reason (a meeting, work, a diet, lunch
// brought from home, not hungry).
// Facts kept vague where unsure: the office hours (nine to six, lunch two to three) are this company's; the cocina
// económica "creo que" takes cash only. Mexican-only words have a neutral twin (gafete, sala de juntas, nomás,
// garrafón, se atoró, chamba, padrísimo, ándale).
//
// The learner's gender: {m:…|f:…}. María speaks tú (`informal` in the shared cast); g_bye and g_thanks are her own
// (her tú goodbyes, and "¡De nada!" instead of the shop's "¡A la orden!").
//
// NEEDS: Game.ts GIVEN could show "laptop", "password card" and "badge" (the "give" toasts are generic now).

import type { Ctx, Suggestion, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

// ---------------------------------------------------------------------------
// Flags used more than once

const ART_TIME = "The article before a clock time has no English word.";
const GAFETE = "Mexican: gafete = ID badge (elsewhere: credencial).";
const JUNTAS = "Mexican: sala de juntas = meeting room (elsewhere: sala de reuniones).";
const COCINA_EC = "cocina económica: a small family place with cheap home cooking.";
const CORRIDA = "comida corrida: soup, rice, a main dish and a drink for one price.";
const SISTEMAS = "sistemas: what Mexican offices call the IT department.";

// ---------------------------------------------------------------------------
// State helpers

type Topic = "coffee" | "printer" | "system" | "laptop" | "fridge" | "mug" | "badge" | null;
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);

/** Per-turn scratch: one answer may arrive as several segments. */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
function once(c: Ctx, key: string): boolean {
  const d = turn(c);
  if (d[key]) return false;
  d[key] = true;
  return true;
}

// Suggestions
const S_INTRO: Suggestion = { lt: "Introduce yourself and say it's your first day", hint: "intro" };
const S_WHERE: Suggestion = { lt: "Ask where things are (coffee, kitchen, printer)", hint: "where" };
const S_HOW: Suggestion = { lt: "Ask how something works", hint: "how" };
const S_DESK: Suggestion = { lt: "Say thanks, or ask about the laptop and password", hint: "desk" };
const S_TASK: Suggestion = { lt: "Ask her to show you, or to send the file", hint: "task" };
const S_LUNCH: Suggestion = { lt: "Accept the lunch invitation, or say no", hint: "lunch" };
const S_MEET: Suggestion = { lt: "Answer her welcome", hint: "meet" };
const S_DAY: Suggestion = { lt: "Say how your day went", hint: "end" };
const S_NO_MORE: Suggestion = { lt: "Say you have no more questions for now", hint: "no_more" };
/** Model questions in sets of three (hint group, the question keys it covers, label). */
const WHERE_SETS: [string, string[], string][] = [
  ["where", ["coffee", "kitchen", "printer"], "Ask where things are (coffee, kitchen, printer)"],
  ["where2", ["dress", "lunch_time", "fridge"], "Ask about clothes and lunch"],
  ["where3", ["home_time", "who", "meeting"], "Ask something else about the office"],
];

const QUESTION_INTENTS = ["already_know", "q_coffee", "q_how", "q_kitchen", "q_fridge", "q_printer", "q_restroom", "q_meeting", "q_dress", "q_lunch_time",
  "q_home_time", "q_mug", "q_who", "q_parking", "q_help", "q_password", "q_login", "q_badge", "q_wifi", "q_desk", "q_it", "show_me", "q_other_ctx"];

/** "No puedo, tengo una junta", "Gracias, pero traje mi comida", "No tengo hambre": she never urges after a reason. */
const REAL_REASON = /\b(junta|reunion|llamada|cita|trabajo|que hacer|dieta|picante|pica|doctor|dentista|dinero|efectivo|cash|manana|otro dia|proxima|planes|ya comi|ya almorce|traje|traigo|hambre|desayune)\b/;
/** A "yes" piece with a "no" in the same turn ("Gracias por invitarme, pero traje mi comida", "Me gustaría ir otro
 *  día", "No, pero gracias por invitarme"): the turn is a no, never a booked lunch. */
const LUNCH_NOT = /^\s*no\b|\bpero\b.*\bno\b|\bhoy no\b|\bno puedo\b|\b(otro dia|la proxima|proxima vez|manana|traje|me traje|a dieta|ya comi|ya almorce|tengo planes)\b/;
/** "Soy Ryan, no es mi primer día", "…, ya trabajo aquí": a name with it is no "yes, I'm new". */
const NOT_NEW = /\bno (es mi primer|soy nuev)|\bya no soy\b|\bya (trabajo|llevo)\b|\b(solo|nomas|nada mas) (estoy|vengo)\b/;
/** "No sé si puedo", "¿Y si no puedo?": never "Claro, yo lo hago". */
const TASK_NOT = /\bno (se|sé) si\b|\by si no\b|^\s*no\b(?! (hay problema|te preocupes|necesito|hace falta))/;

/** Answers the simulations give to María's optional questions. */
/** Sims without a twist: the twists are off (they come on returning visits). */
const NO_TWISTS = (s: Record<string, any>) => { s.coffeeBroken = false; s.mugTwist = false; s.printerJam = false; s.badgeLate = false; };

const AUTO: Record<string, string> = {
  meet: "¡Mucho gusto!", name: "Soy Ryan.", coffee_show: "Sí, gracias.", lunch: "¡Me encantaría!", lunch_insist: "No, gracias, de verdad.",
  mug: "¡Ups, perdón!", closing: "¡Nos vemos mañana!", howareyou: "Bien, gracias, ¿y tú?",
};

// ---------------------------------------------------------------------------

export const firstDay: SituationDef = {
  id: "s88-first-day",
  song: 88,
  songTitle: "Where's the Coffee Machine?",
  title: { en: "¿Dónde está la cafetera?", lt: "Where's the Coffee Machine?" },
  topic: { en: "El primer día de trabajo", lt: "First day at work" },
  chapter: 4,
  order: 2,
  location: "office",
  npc: "maria",
  goal: "On your first day at work, meet your coworker and find out where everything is.",
  mission: [
    { lt: "Introduce yourself", done: (c) => !!c.s.introduced && (!!c.s.named || (c.s.nameAsks || 0) >= 2) },
    { step: "tour", lt: "Ask where things are" },
    { lt: "Find out where the coffee machine is", done: (c) => !!c.s.coffeeKnown },
    { step: "task", lt: "Do your first task" },
    { step: "lunch", lt: "Answer the lunch invitation" },
    { step: "day", lt: "Say how your day went" },
  ],
  intro: "Your first day at Línea Clara. In the open-plan office your coworker María meets you: she'll show you around and help you settle in. Coworkers in Mexico say tú to each other. Ask away: where things are, how they work and, of course, where the coffee machine is!",

  grammar: {
    macros: {
      donde: "(donde (esta | estan | queda | quedan | hay) | donde (encuentro | puedo encontrar) | no (se | sé) donde (esta | estan | queda | hay) | no encuentro)",
      cafetera: "(cafetera | maquina de cafe | maquina del cafe | cafetera electrica)",
      bano: "(bano | banos | sanitario | sanitarios | servicio | servicios | aseo | aseos | wc | lavabo | lavabos)",
      nuevo: "(nuevo | nueva | nuevos | nuevas)",
      // "el nuevo contador", "tu nueva compañera"
      newbie: "(companero | companera | colega | empleado | empleada | trabajador | trabajadora | contador | contadora | disenador | disenadora | programador | programadora | ingeniero | ingeniera | asistente | secretaria | secretario | recepcionista | vendedor | vendedora | becario | becaria | practicante | analista | gerente | desarrollador | desarrolladora | integrante | miembro)",
      tail: "[hoy | aqui | en la oficina | en el equipo | en la empresa | en linea clara | de trabajo]",
      empresa: "(el equipo | la oficina | la empresa | linea clara)",
      pass: "(contrasena | clave | password)",
      laptop: "(laptop | computadora | compu | portatil | maquina)",
      ropa: "(jeans | mezclilla | pantalon de mezclilla | vaqueros | tenis | zapatillas | shorts | pantalones cortos | playera | camiseta | sandalias | chanclas)",
      lonche: "(comida | lonche | toper | tupper | almuerzo | sandwich | torta)",
      fridge: "(refri | refrigerador | nevera | refrigeradora | heladera)",
      micro: "(microondas | micro | horno de microondas)",
      file: "(archivo | documento | excel | lista | lista de clientes)",
      tired: "(cansado | pesado | largo | intenso | dificil | estresante | agotador | cansada | pesada | intensa | agotadora | mucho | complicado)",
      upbeat: "(bien | bueno | interesante | divertido | padre | me encanta | me gusta | contento | contenta | feliz | me gusto mucho)",
    },
  },

  intents: {
    // --- hello --------------------------------------------------------------
    first_day: { patterns: [
      "[si] (es | hoy es) mi primer dia @tail #h:first_day", "[si] (soy | somos) @nuevo [aqui] #h:im_new",
      "[si] (soy | somos) @nuevo (en | de) @empresa", "[si] (primer dia | mi primer dia) @tail", "[si] (este | hoy) es mi primer dia @tail",
      "[si] (soy | somos) (el | la | tu | su | un | una | los | las) @nuevo @newbie [aqui | de (el equipo | la oficina)]",
      "[si] (soy | somos) (el | la | tu | su | un | una) @newbie @nuevo [aqui]", "(el | la | tu | su) @nuevo @newbie", "[si] (soy | somos) (el | la) @nuevo",
      "[si] [hoy] (empiezo | empecé | comienzo | comencé | entro | entré) (hoy | a trabajar [aqui] [hoy] | aqui [hoy] | esta manana)",
      "[si] hoy (empiezo | comienzo | entro) [a trabajar] [aqui]", "[si] (vengo | vine) a trabajar [aqui] [hoy]",
      "[si] (trabajo | voy a trabajar) aqui (desde hoy | a partir de hoy)", "[si] (soy yo | esa soy yo | ese soy yo | asi es)",
      "[si] (busco | estoy buscando | vengo a ver) a maria", "[si] (tu eres | eres) maria",
      "[si] (vengo | vine) a trabajar [aqui] [y] (es | hoy es) mi primer dia", "[si] (soy @nuevo | soy (el | la) @nuevo [@newbie]) [y] (es | hoy es) mi primer dia",
    ] },
    // "No, no soy nuevo": María asks how she can help (like a "no" to "¿Eres nuevo aquí?")
    not_new: { patterns: ["[no] (solo | nomas | nada mas) (estoy | vengo) (de visita | visitando | a una junta | a una reunion | a una entrevista | a dejar algo | a ver a alguien)","[no] no (soy | somos) @nuevo [aqui]", "[no] no es mi primer dia [aqui | hoy] [es el segundo | ya llevo (unos | dos | tres | varios) dias]", "[no] ya no (soy | somos) @nuevo", "[no] ya (trabajo | llevo tiempo) aqui"] },
    intro_name: { patterns: [
      "me llamo {name} #h:my_name", "mi nombre es {name}", "(me llamo | mi nombre es) {name} y (tu | usted) #back",
      "(me llamo | mi nombre es) {name} [y] (soy @nuevo | es mi primer dia | hoy es mi primer dia | soy (el | la | tu) @nuevo [@newbie]) [aqui | hoy] #first",
    ] },
    intro_ctx: { patterns: ["[yo] soy {name} #h:im_name", "(mucho gusto | encantado | encantada | hola) [yo] soy {name}", "(dime | me dicen | puedes decirme) {name}", "(gracias | muchas gracias) soy {name}", "soy {name} (mucho gusto | encantado | encantada)",
      "soy {name} [y] (es | hoy es) mi (primer | primerito) dia [aqui | hoy] #first", "soy {name} [y] soy (@nuevo | (el | la | tu) @nuevo [@newbie]) [aqui] #first",
      "[yo] soy {name} y (tu | usted) [como te llamas] #back"] },
    // a bare name, only where María asks for it ("¿Y tú eres…?"); "Ryan, ¿y tú?" asks hers back
    bare_name_ctx: { patterns: ["{name}", "{name} y (tu | usted) [como te llamas] #back"] },
    nice_meet: { patterns: [
      "(mucho gusto | encantado | encantada | un placer | igualmente | el gusto es mio | igualmente mucho gusto) #h:nice_meet",
      "(mucho gusto | encantado | encantada | un gusto | un placer) (de | en)? conocerte", "(me da | que) gusto conocerte", "(gracias | muchas gracias) (igualmente | mucho gusto)",
      "(estoy | me siento) (muy | super)? (contento | contenta | feliz | emocionado | emocionada) (de | por) (estar aqui | estar en el equipo | ser parte del equipo | trabajar (aqui | con ustedes | contigo))",
      "(que | me da) gusto estar aqui", "(igualmente | yo tambien) gracias", "igual [gracias]",
      "(encantado | encantada | contento | contenta | feliz) de estar aqui",
    ] },
    her_name: { patterns: ["[y] (como te llamas | cual es tu nombre | tu como te llamas | quien eres | tu quien eres | como se llama usted)"] },

    // --- desk, laptop, card --------------------------------------------------------
    desk_ok: { patterns: [
      "[gracias] que (bonito | bonita | padre | padrisimo | lindo | linda | comodo | comoda | buena | bueno | buen) [escritorio | lugar | vista | laptop | computadora | silla | oficina] #h:desk_great",
      "[gracias] (esta | es) (muy | super | bien)? (padre | padrisimo | bonito | bonita | lindo | linda | comodo | comoda | genial | perfecto | perfecta | increible | excelente | chido | chida)",
      "[gracias] (me gusta | me encanta) [mucho] (el escritorio | mi escritorio | la vista | la @laptop | mi @laptop | el lugar | mi lugar | la ventana | la silla | la oficina)",
      "[gracias] (me gusta | me encanta) [mucho]", "(una | mi) @laptop nueva [que padre | genial | super]", "(que | muy) (buena | bonita) vista",
    ] },
    // "No está muy cómodo", "No me gusta la silla": never "¡Qué bueno que te guste!"
    desk_bad: { patterns: [
      "no (esta | es) (muy | tan | nada)? (bonito | bonita | lindo | linda | comodo | comoda | padre | bueno | buena | bien | grande | limpio | limpia)",
      "no me (gusta | encanta) [mucho | tanto] [el escritorio | mi escritorio | la vista | la @laptop | mi @laptop | el lugar | mi lugar | la silla | la oficina]",
      "(la silla | el escritorio | la @laptop | el lugar) no (es | esta) (muy | tan)? (comoda | comodo | bueno | buena | bien)",
    ] },
    q_password: { patterns: [
      "cual es (mi | la) @pass #h:q_password", "donde (esta | viene) (mi | la) @pass", "(tengo que | debo | hay que | necesito) cambiar (mi | la) @pass #h:q_change",
      "(puedo | se puede) cambiar (mi | la) @pass", "como (cambio | se cambia | puedo cambiar) (mi | la) @pass", "(esta | esa) es mi @pass",
      "(la | mi) @pass (esta | viene) en (la | esta) tarjeta", "y (la | mi) @pass", "me (das | puedes dar | da | pasas) (mi | la) @pass", "(que pasa | que hago) si (olvido | se me olvida | me olvido de) (mi | la) @pass #forgot",
      "(olvidé | olvide | se me olvidó | se me olvido | no recuerdo | no me acuerdo de) (mi | la) @pass #forgot", "no (tengo | se | sé) (mi | la)? @pass",
    ] },
    q_login: { patterns: [
      "como (entro | me conecto | inicio sesion | accedo | ingreso) [al sistema | a la @laptop | al correo] #h:q_login", "cual es mi (usuario | nombre de usuario | correo)",
      "no puedo (entrar | iniciar sesion | conectarme) [al sistema]", "no tengo (usuario | nombre de usuario)", "como (prendo | enciendo) (la @laptop)", "(el | mi) usuario (esta | viene) en (la | esta) tarjeta",
      "(donde | como) (entro | inicio sesion) [en el sistema]",
    ] },
    q_badge: { patterns: [
      "(me dan | me van a dar | tengo | necesito | hay) (un | una)? (gafete | credencial | tarjeta de acceso | tarjeta para entrar) [para entrar] #h:q_badge",
      "donde (esta | queda) mi (gafete | credencial)", "(cuando | como) (me dan | recibo | consigo | tengo) (mi | el | un | la | una)? (gafete | credencial)",
      "como (entro | se entra) al edificio", "[y] como (entro | voy a entrar) [al edificio | a la oficina] (manana | sin (gafete | credencial))", "me (das | puedes dar | da) (mi | el | un | la | una)? (gafete | credencial)", "y (el | mi | la) (gafete | credencial)", "(cuando | como) me van a dar (mi | el | la)? (gafete | credencial)",
    ] },
    q_wifi: { patterns: [
      "cual es la @pass del (wifi | wi fi | internet)", "(hay | tienen | tenemos) (wifi | wi fi | internet) [aqui]", "como me conecto al (wifi | wi fi | internet)",
      "(cual es | como se llama) (el wifi | la red)", "y (el)? (wifi | wi fi | internet)",
      "me (das | puedes dar | da | pasas | podrias dar) la @pass del (wifi | wi fi | internet)", "donde (esta | viene) la @pass del (wifi | internet)",
    ] },
    q_desk: { patterns: [
      "(este | ese) es mi (escritorio | lugar | sitio | portatil | ordenador)", "(esta | esa) es mi (laptop | computadora | silla)", "(esta | este | ese | esa) (@laptop | escritorio | lugar | silla) es (mio | mia | para mi)",
      "(es | son) para mi", "donde me siento #where", "donde (es | esta | queda) mi (lugar | escritorio) #where", "cual es mi (escritorio | lugar | @laptop) #where", "cual es (el mio | la mia) #where",
    ] },
    q_it: { patterns: [
      "a quien (le)? (pregunto | llamo | escribo | aviso) si (la | mi) (@laptop | @pass) (no funciona | falla | se descompone | tiene un problema)",
      "(que hago | que tengo que hacer) si (la | mi) @laptop (no funciona | falla | se descompone | se traba)", "(que hago | que tengo que hacer) si no funciona (la | mi | el) @laptop",
      "(hay | quien es) (alguien de)? (sistemas | soporte | soporte tecnico)", "a quien le (pregunto | pido ayuda) (con | sobre) (la | mi) (@laptop | @pass)",
      "(quien | a quien llamo) si (tengo | hay) un problema con (la | mi) @laptop",
      "no (funciona | sirve | prende) (la | mi | el) @laptop", "(la | mi | el) @laptop no (funciona | sirve | prende)",
      "(que hago | a quien (le)? (pregunto | aviso | llamo)) si no (funciona | sirve | prende) (la | mi | el) @laptop", "y si no (funciona | sirve | prende) (la | mi | el) @laptop",
    ] },

    // --- where things are ---------------------------------------------------------------
    q_coffee: { patterns: [
      "@donde la @cafetera #h:q_coffee", "donde (puedo | se puede) (tomar | hacer | servirme | conseguir) (un)? (cafe | cafecito | te)", "(hay | tienen | tenemos) (cafetera | maquina de cafe | cafe) [aqui | en la oficina]",
      "donde (esta | hay) [el] cafe", "(necesito | quiero | me urge) un (cafe | cafecito) @donde la @cafetera", "donde (toman | toma la gente | tomamos) cafe", "[y] la @cafetera", "y el cafe",
    ] },
    q_kitchen: { patterns: [
      "@donde la (cocina | cocineta | cocinita) #h:q_kitchen", "[y] la (cocina | cocineta)", "(hay | tienen) (cocina | cocineta)", "donde (puedo | se puede) comer", "donde (come | comen | comemos) [la gente | todos | ustedes]",
      "donde (puedo | se puede) (tomar | conseguir) (agua | un vaso de agua | un vaso) #water", "donde hay agua [para tomar | potable] #water", "(hay | tienen) agua (para tomar | potable) #water",
    ] },
    q_fridge: { patterns: [
      "donde (pongo | dejo | guardo | puedo poner | puedo dejar | puedo guardar) (mi | la) @lonche #h:q_fridge", "(hay | tienen) @fridge", "(hay | tienen) @micro #micro",
      "(puedo | se puede) usar (el | la)? @fridge", "(puedo | se puede) usar (el)? @micro #micro",
      "(puedo | se puede) (dejar | poner | guardar) (mi)? @lonche en (el | la)? @fridge", "@donde (el | la) @fridge", "[y] (el | la) @fridge", "@donde (el)? @micro #micro",
      "donde (caliento | puedo calentar | se calienta) (mi | la)? @lonche #micro",
    ] },
    q_printer: { patterns: [
      "@donde la (impresora | fotocopiadora) #h:q_printer", "[y] la impresora", "(hay | tienen) (impresora | fotocopiadora)", "como (imprimo | se imprime | puedo imprimir) [algo | un documento] #how",
      "donde (imprimo | puedo imprimir | se imprime) [algo | documentos | un documento]", "(puedo | se puede) (usar la impresora | imprimir) [aqui]",
      "como (se saca | saco | quito | se quita) el papel #fix", "(se atoro | se atasco) [el papel] [otra vez] #fix",
    ] },
    q_restroom: { patterns: ["@donde [el | los | la | las] @bano #h:q_restroom", "(puedo | se puede) (ir | pasar) al bano", "(hay | tienen) bano", "[y] (el | los) @bano"] },
    q_meeting: { patterns: [
      "@donde la (sala de juntas | sala de reuniones | sala de conferencias | sala de juntas grande) #h:q_meeting", "donde (son | es | hacen | hacemos) (las juntas | las reuniones | la junta | la reunion)",
      "como (aparto | reservo | se reserva | se aparta) (la | una) sala [de juntas | de reuniones]", "(hay | tienen) (sala de juntas | sala de reuniones)",
    ] },
    q_dress: { patterns: [
      "(hay | tienen) (un)? (codigo de vestimenta | dress code | uniforme) #h:q_dress", "(cual | como) es el (codigo de vestimenta | dress code)",
      "como (me tengo que | tengo que | debo | hay que) (vestir | venir vestido | venir vestida | vestirme | venir)", "que (me pongo | ropa uso | ropa me pongo | tengo que usar | tengo que ponerme | ropa hay que usar)",
      "(puedo | se puede) (venir | usar | ir | trabajar) (en | de | con)? @ropa", "(tengo que | hay que | debo) (usar | llevar | ponerme | traer) (traje | corbata | uniforme | saco)",
      "(es | se viste) (formal | casual) [aqui]",
    ] },
    q_lunch_time: { patterns: [
      "a que hora (comen | comemos | come la gente | es la comida | se come | es la hora de la comida | salen a comer | salimos a comer) [aqui] #h:q_lunch_time",
      "a que hora (es el almuerzo | almuerzan | almorzamos | es el lunch) #tip:almuerzo", "(cuando | a que hora) (es | tenemos) (la hora de la comida | la comida | el descanso)",
      "(cuanto tiempo | cuanto) (tenemos | dura | hay) (para comer | de comida | la comida | para la comida | la hora de la comida) #long", "cuanto dura (la comida | el almuerzo | el descanso) #long",
    ] },
    q_home_time: { patterns: [
      "a que hora (salimos | sale la gente | se va la gente | nos vamos | se van | terminamos | acabamos | salen | se sale) [aqui] #h:q_home",
      "(cuando | a que hora) (puedo irme | me puedo ir | termina el dia | se acaba el trabajo | termina la jornada | termina el trabajo)", "(cual es | como es) el horario [de trabajo]",
      "a que hora (entramos | entro | empezamos | se entra | llegamos | llega la gente | hay que llegar | tengo que llegar) [en la manana] #start",
    ] },
    q_mug: { patterns: [
      "(puedo | se puede) (usar | agarrar | tomar) (esta | esa | una | cualquier) taza #h:q_mug", "(cual | que) taza (puedo usar | uso | es mia)", "@donde las tazas #where", "(hay | tienen) tazas #where",
      "(esta | esa) taza (esta libre | es de alguien | se puede usar)", "(tengo que | debo) traer mi (propia)? taza #own",
    ] },
    q_who: { patterns: [
      "quien es (ella | el | esa senora | ese senor | esa persona | la senora (del escritorio | de alla) | esa chica | ese chavo | esa mujer | ese hombre | la de alla | el de alla) #h:q_who",
      "(y | oye) quien es (ella | el)", "quien es la licenciada salinas",
      // after "¡Esa no, es la taza de Pablo!"
      "[y] quien es pablo #pablo", "[y] pablo quien es #pablo", "[y] quien es ese pablo #pablo",
    ] },
    q_parking: { patterns: [
      "donde (me estaciono | estaciono | me puedo estacionar | puedo estacionarme | puedo estacionar | puedo dejar (el | mi) carro | se estaciona | aparco | puedo aparcar) [el | mi] [carro]", "(hay | tienen) estacionamiento [aqui]",
      // "¿Es gratis?" gets "Sí, es gratis…"; "¿Cuánto cuesta?" / "¿Se paga?" get "Atrás del edificio. ¡Y es gratis!", never a "Sí"
      "(es | esta) gratis el estacionamiento #free", "el estacionamiento es gratis #free", "(cuanto cuesta | se paga | hay que pagar | tengo que pagar) el estacionamiento",
    ] },
    q_help: { patterns: [
      "a quien (le)? (pregunto | puedo preguntar) si tengo (dudas | una duda | preguntas | una pregunta | un problema)", "(te | le) puedo preguntar si tengo (dudas | una duda | preguntas)",
      "a quien le pido ayuda",
    ] },
    q_how: { patterns: [
      "como funciona [la cafetera | la maquina | la impresora | el sistema | el programa | esto | eso] #h:q_how", "como (uso | se usa | se hace) (esto | eso | la cafetera | la maquina | la impresora)",
      "como (hago | preparo | me sirvo) (un)? (cafe | te | capuchino)", "(es | esta) (dificil | facil | complicado) [de usar]", "(que | cual) boton (aprieto | presiono | uso)",
    ] },
    show_me: { patterns: [
      "(me | nos) (puedes | podrias | puede | podria) (ensenar | mostrar | explicar) como (funciona | se usa | se hace) [esto | eso | el sistema | el programa | la cafetera]",
      "me (ensenas | muestras | explicas) [como funciona | como se hace | como se usa | como entro] #h:show_me", "(me | nos) (puedes | podrias | puede) ayudar [con esto | con eso | un poco]",
      "(me ayudas | ayudame) [con esto | con eso | un poco]", "[si] (ensename | muestrame | explicame) [como funciona | como se hace]",
      "(que | como) (hago | tengo que hacer | hay que hacer) (esto | eso | primero)", "por donde empiezo", "no entiendo como (funciona | se hace) [esto]", "[si] me gustaria (verlo | ver como funciona)",
      "(me | nos) (puedes | podrias) ensenar [por favor]",
    ] },
    q_other_ctx: { patterns: ["(que | como | cuando | donde | quien | hay | tienen | tenemos) {w:any}", "donde (esta | estan | queda | quedan | hay) [el | la | los | las | un | una] {w:any}"] },
    // "Ya sé dónde está el baño": nothing to answer
    already_know: { patterns: ["ya (se | sé | vi) donde (esta | estan | queda | hay) [el | la | los | las] {w:any}", "ya (lo | la) (vi | conozco | encontré)"] },
    more_q: { patterns: ["[si] (tengo | tengo otra | una | otra) (pregunta | duda) [mas]", "[si] (una cosa mas | otra cosa | una pregunta mas | una ultima pregunta)"] },
    no_more: { patterns: [
      "[no] (es | eso es | seria | eso seria) todo [por ahora | por el momento] #h:q_none", "[no] (por ahora | por el momento | de momento) (es | seria | eso es) todo", "[no] [creo que] (estoy bien | todo bien | todo claro | todo esta claro) [por ahora] #h:q_good",
      "[no] (nada | nada mas) [por ahora | por el momento]", "[no] no tengo (mas | otras | ninguna)? (preguntas | dudas | pregunta | duda) [por ahora]",
      "[no] (ninguna | ni una) [pregunta | duda]", "[no] ya no tengo [mas | otras] (preguntas | dudas)", "[no] (por ahora | de momento) no", "[no] (ya | con eso) (estoy | esta bien)", "[no] (ya | todo) (quedó | quedo) claro",
    ] },

    // --- first task -------------------------------------------------------------------
    send_file: { patterns: [
      "[me] (mandas | envias | pasas | compartes | reenvias) (el | ese | este | la | esa) @file [por correo] #h:send_file",
      "(me)? (puedes | podrias | puede | podria) (mandar | enviar | pasar | compartir | reenviar) (el | ese | este | la | esa) @file [por correo]",
      "(me lo | me la) (mandas | envias | pasas) [por correo]", "(me lo | me la) (puedes | podrias | puede | podria) (mandar | enviar | pasar) [por correo]",
      "(mandamelo | enviamelo | pasamelo | mandamela | enviamela) [por correo]", "(mandame | enviame | pasame) (el | ese | la) @file [por correo]",
      "donde (esta | encuentro | puedo encontrar) (el | ese | la | esa) @file", "(mandalo | envialo) a mi correo", "(que | cual) (archivo | lista) #which",
    ] },
    task_ok: { patterns: [
      "[si] (claro | por supuesto | sin problema | ok | va | sale | perfecto) [yo] lo hago [ahorita | ahora | ya] #h:task_sure", "[si] (puedo hacerlo | lo puedo hacer | si puedo)",
      "[ok | va | sale | claro] (lo intento | lo voy a intentar | voy a intentarlo | hago lo que pueda | hago mi mejor esfuerzo)", "(sin problema | no hay problema)",
      "[ya] (me pongo | empiezo) [a trabajar | ahorita | ahora]", "(ahorita | ahora | ya) (lo hago | empiezo)", "[yo] (ya)? me encargo", "lo hago (ahorita | ahora | ya | ahora mismo)",
      "cuenta conmigo", "no (necesito | hace falta) (ayuda | que me ensenes) [yo lo hago]", "[ok | va | sale | claro] yo lo hago", "[si] lo voy a hacer [ahorita | ahora]",
    ] },
    task_cant: { patterns: [
      "no (puedo | lo puedo) (hacerlo | hacer esto | hacer eso | hacer) [solo | sola | todavia | ahora | ahorita | hoy]", "no (se | sé) usar (excel | el sistema | este programa | el programa | este sistema)", "todavia no (conozco | he usado) (este | ese | el) (sistema | programa)", "no (se | se como) (hacerlo | como se hace | como hacerlo)",
      "nunca (he usado | he hecho | usé | hice) (esto | eso | este sistema | ese programa | este programa | el sistema) [antes]",
      "no (conozco | he usado | sé usar | se usar) (este | ese | el) (sistema | programa)", "todavia no (lo)? (entiendo | sé hacer)",
      "no (se | sé) si (puedo | voy a poder | lo puedo hacer | puedo hacerlo | me sale)", "y si no (puedo | se como | sé como | me sale)", "no estoy (seguro | segura) de (poder | saber) [hacerlo]",
    ] },
    // a bare "No, gracias, ya sé": only where she offers to show something (the cafetera, the task)
    know_ctx: { patterns: ["[no] [gracias] ya (se | sé) [como (funciona | se usa | se hace)] [gracias]"] },
    task_later: { patterns: [
      "(lo hago | lo empiezo | lo veo) (despues | mas tarde | al rato | luego | en la tarde | manana)", "(ahorita | ahora | ahora mismo | hoy) no (puedo | tengo tiempo)", "(despues | mas tarde | al rato) lo hago",
    ] },
    // "¿Para cuándo?", "¿Es urgente?": no rush, she emails the file (as for "Lo hago después")
    task_when: { patterns: [
      "para cuando (es | lo necesitas | la necesitas | lo necesitan | lo quieres | la quieres | lo ocupas | tiene que estar | debe estar) [listo | lista]",
      "para cuando", "(cuando | para cuando) (lo | la) (entrego | tengo que entregar | debo entregar)", "(es | esta) urgente", "(hay | corre) prisa",
      "cuanto tiempo tengo [para hacerlo]",
    ] },
    know_system: { patterns: [
      "[ya] (conozco | he usado | usé | manejo | se usar | se manejar) (este | ese | el | su | tu) (sistema | programa) [antes | muy bien]",
      "[ya] (lo | la) (he usado | usé | conozco) [antes]", "[no] ya (se | sé) (como funciona | hacerlo | como se hace | usarla | usarlo | como se usa)", "[ya] (he hecho | hice) (esto | eso) antes",
      "[ya] (lo | la) (he hecho | hice) [antes]", "no me (ensenes | expliques) ya (se | sé) [como funciona]",
      "[ya] (conozco | manejo | se usar) excel [muy bien]",
    ] },

    // --- lunch ---------------------------------------------------------------------------
    lunch_yes: { patterns: [
      "[si] me encantaria [ir] #h:l_love", "[si] (suena | se oye) (muy)? (bien | padre | genial | rico) #h:l_sounds", "[si] (claro | por supuesto | con gusto | va | sale | orale | vale) (vamos | voy)",
      "[si] (vamos | voy | voy con ustedes | voy contigo | me apunto | yo me apunto | cuenta conmigo | cuentan conmigo)", "[si] (tengo | ya tengo) [mucha] hambre [ya]",
      "[si] (me gustaria | me gustaria mucho) [ir]", "[que] buena idea", "[si] (gracias | muchas gracias) por (la invitacion | invitarme) [si | claro | me encantaria]",
      "[si] (me encanta | me gusta) la comida (casera | mexicana | corrida)", "[bueno | ok | va] [si] (me animo | me convenciste)", "[si] con mucho gusto", "[si] [voy] pero (llego | voy a llegar | los alcanzo) [un poco] (tarde | despues | al rato)", "[si] (los | te) alcanzo [alla | al rato]",
    ] },
    lunch_no: { patterns: [
      "[no] [gracias] [pero] (traje | ya traje | me traje | traigo | me he traido | ya me he traido | he traido) (mi | mi propia | la)? @lonche [de (mi)? casa] [hoy] #h:l_brought", "[lo siento] (hoy)? no puedo [hoy] [lo siento]",
      "(tal vez | quizas | quiza | a lo mejor) (manana | otro dia | la proxima | la proxima vez | otra vez) #h:l_next_time", "(otro dia | la proxima | la proxima vez) [sera | tal vez | mejor]",
      "[no] [no puedo] [lo siento] [es que] [ya] tengo (mucho trabajo | mucho que hacer | una junta | una reunion | una llamada | cita con el doctor | una cita | planes | otros planes | un compromiso) [a esa hora | hoy | a las dos | en la tarde]",
      "[no] [gracias] [pero] [hoy] (traje | ya traje | me traje | traigo) [mi | mi propia] (@lonche | algo de comer | algo) [de (mi)? casa] [hoy]", "[no] [lo siento] [es que] (estoy | ando) a dieta",
      "[no] [gracias] ya (comi | almorce | almorcé | comí)", "(desayune | comi | desayuné | comí) (mucho | muy tarde | tarde) [hoy | en el desayuno]", "[no] (todavia | aun) no tengo hambre",
      "[si] pero (no hoy | hoy no)", "hoy no [pero] (manana | otro dia) (si | me encantaria | me gustaria) [ir]", "[no] no tengo [mucha] hambre [todavia | ahorita]",
      "[no] (estoy | ando) a dieta", "hoy no [gracias | lo siento]", "(me encantaria | me gustaria | gracias) pero (no puedo | tengo (mucho trabajo | una junta | una reunion) | traje (mi)? @lonche) [hoy]",
      "[no] no (como | me gusta) [la] comida (picante | mexicana) #spicy", "[no] no (voy a ir | voy | puedo ir | quiero ir | tengo ganas) [hoy | esta vez]",
      "no (de verdad | en serio) [gracias] [hoy no]", "(de verdad | en serio) (gracias | no gracias | hoy no | no puedo)", "[no] no (tengo | traigo) (dinero | efectivo | cash) [hoy]", "hoy no (puedo | voy) [pero] manana (si)? [puedo]", "no me apetece [mucho] [hoy | ir]", "[no] (de verdad | en serio) no (puedo | gracias)",
    ] },
    // Questions about the lunch, only at the invitation: a bare "¿Dónde está?", "¿Cuánto cuesta?" or "¿Qué es eso?"
    // elsewhere is about something else, never the cocina económica. Each question's piece carries its tag ("¿Está
    // lejos? ¿Cuánto cuesta?" gets both answers).
    lunch_q_ctx: { patterns: [
      "(donde | por donde) (esta | queda | es) [la cocina economica | el lugar | el restaurante | la fonda] #h:l_where #where", "(esta | queda) lejos #far", "(esta | queda) cerca #near",
      "a que hora [vamos | salen | salimos | van | nos vamos] #h:l_time #time", "cuando (vamos | salen | salimos | nos vamos) #time",
      "a que hora (regresamos | volvemos | regresan | vuelven | hay que regresar | tenemos que regresar | hay que volver | estamos de regreso) [a la oficina | al trabajo] #back",
      "(cuanto | cuanto cuesta | cuanto sale | cuanto es | que precio tiene) [la comida | la comida corrida | comer ahi] #price", "(es | esta) [muy] (caro | cara) #dear", "(es | esta) (barato | barata) #cheap",
      "(que | que tipo de) comida (hay | tienen | venden | es | dan) #food", "que (hay | dan | sirven | venden) [de comer | hoy] #food", "(aceptan | se puede pagar con | puedo pagar con) tarjeta #card",
      "(hay | tienen) (comida | algo | opciones) (vegetariana | vegetariano | sin carne | vegana | vegano) #veg",
      "(es | esta) [muy] (picante | picosa | picoso) #spicy", "pica [mucho] #spicy",
      "(quien | quienes) [mas] (va | van | viene | vienen) [a ir] #who", "(vamos | van) todos [juntos] #who", "con (quien | quienes) (vamos | van | vas) #who",
      "que es (una | la) cocina economica #cocina", "que es (una | la) comida corrida #food", "que es eso #what",
      "que (son | es) (los chiles rellenos | un chile relleno) #chiles", "(como | que) son los chiles rellenos #chiles",
    ] },
    // Spain's "¿Te apetece…?" / "Me apetece": a right answer too (no tip)
    // "¿No te animas?" — "De verdad, gracias": still no (only there; elsewhere "de verdad" is no answer)
    insist_no_ctx: { patterns: ["[no] de verdad [gracias | no | hoy no]", "(en serio | de veras) (no | gracias | hoy no)", "[no] (de veras | la verdad no)"] },
    fancy_q: { patterns: ["(te | les) apetece (comer | ir a comer | algo)", "me apetece [mucho] [ir]"] },

    // --- end of the day -----------------------------------------------------------------------
    day_good: { patterns: [
      "[me] (fue | ha ido) (muy | super | bastante)? (bien | genial | increible | padre | padrisimo | excelente | interesante | divertido) #h:d_great",
      "(fue | estuvo | ha sido | ha estado) (muy | super | bastante)? (bueno | genial | increible | padre | padrisimo | excelente | interesante | divertido | bien)",
      "(me encanta | me gusta | me gustó | me encantó) [mucho] [el trabajo | la oficina | el equipo | aqui | todo]", "todos (son | fueron | han sido) (muy | super)? (amables | buena onda | lindos | simpaticos) #h:d_nice",
      "(muchos nombres nuevos | muchas cosas nuevas | mucha gente nueva | muchas caras nuevas) #h:d_lot", "aprendí (mucho | muchas cosas | un monton) [hoy]",
      "mejor de lo que (esperaba | pensaba)", "(estoy | me siento) (muy)? (contento | contenta | feliz) [aqui | con mi nuevo trabajo]", "(un | fue un) (buen | gran | excelente) (dia | primer dia)",
      "(me encanta | me gusta) mi (nuevo trabajo | nueva chamba | chamba nueva | trabajo nuevo | equipo | oficina)", "mi (chamba nueva | nueva chamba | trabajo nuevo | nuevo trabajo) me (encanta | gusta)",
      "(no estoy | no ando) (cansado | cansada) [para nada]", "no (fue | estuvo) (tan | muy)? (pesado | dificil | complicado | cansado | largo)",
      // whole sentences: "Mi primer día fue muy bueno", "Fue un día muy bueno", "Hoy fue un buen día"
      "(mi | el) (primer dia | dia) (fue | estuvo | ha sido) (muy | super | bastante)? (bueno | bien | genial | padre | padrisimo | excelente | increible | interesante | divertido)",
      "[hoy] (fue | ha sido | estuvo) un (dia | primer dia) (muy | super | bastante)? (bueno | padre | padrisimo | genial | increible | excelente | interesante | divertido | bonito)",
      "hoy (fue | ha sido) un (buen | gran | excelente) (dia | primer dia)",
    ] },
    day_ctx: { patterns: ["[muy | super | bastante] (bien | bueno | genial | padre | padrisimo | increible | interesante | excelente | pesado | largo | cansado | cansada | intenso) [gracias]", "no (estuvo | fue) (tan | nada)? mal", "(muy | super)? bien [gracias] y (tu | a ti) #back", "(muy | super)? bien [gracias] (y tu | y a ti) (como te fue | que tal)? #back"] },
    day_tired: { patterns: [
      "[fue | estuvo] [un poco | muy | super | bastante] @tired pero @upbeat #h:d_tiring", "[fue | estuvo] (un poco | muy | super | bastante) @tired",
      "[hoy] (fue | ha sido | estuvo) un dia (muy | bastante | super)? (largo | pesado | intenso | cansado | dificil | complicado | estresante)",
      "(mi | el) (primer dia | dia) (fue | estuvo | ha sido) [un poco | muy | super | bastante] @tired",
      "(mi | el) (primer dia | dia) no (fue | estuvo) (muy | tan)? (bueno | bien | facil | genial | padre)", "(estoy | ando) [un poco | muy | super | bastante] (cansado | cansada | agotado | agotada | muerto | muerta) [pero (contento | contenta | feliz | bien)]",
      "(cansado | cansada) pero (contento | contenta | feliz | bien)", "(demasiada | mucha) informacion [para un dia]", "demasiados nombres [nuevos]", "(tengo | traigo) la cabeza (llena | a mil)",
      "no (fue | estuvo) (facil | tan facil | muy facil | muy bien | tan bien | bien | bueno | muy bueno | tan bueno)", "(nada | no muy | no tan) bien", "fue mucho [para un dia]", "no (fue | estuvo) (genial | increible | excelente | divertido | padre)",
      "@upbeat (pero | aunque) (estoy | ando) [un poco | muy | super] (cansado | cansada | agotado | agotada)", "no me (gustó | encantó) [mucho | tanto]", "(mas o menos | regular | ni bien ni mal)",
      "[fue | estuvo] [un poco | muy | super | bastante] @tired aunque @upbeat", "[muy | bastante] @upbeat aunque [un poco | muy] @tired",
    ] },
    see_you: { patterns: ["nos vemos (manana | luego | al rato | el lunes) #h:see_tomorrow", "hasta manana", "(venga | vale) (nos vemos (manana | luego) | hasta manana)", "que descanses [mucho] #h:bye_evening", "(que tengas | buena) (buena tarde | buenas noches | buena noche | bonita tarde)"] },
    thanks_all: { patterns: [
      "[muchas] gracias por todo #h:thanks_all", "[muchas] gracias por (ensenarme la oficina | todo tu apoyo | mostrarme todo | el recorrido | tu paciencia | toda tu ayuda | ayudarme hoy)",
    ] },

    // --- side moves ---------------------------------------------------------------------------------
    oops: { patterns: [
      "(ups | uy | ay) [perdon | perdona | lo siento] #h:oops", "[ay] no sabia [que era (de pablo | suya | tuya)] #h:oops", "(perdon | lo siento | perdona | disculpa) [no sabia] [que era (de pablo | suya | tuya)]",
      "perdon pablo", "(perdon | ay) (es | era) (la taza | su taza) de pablo",
    ] },
    coffee_want: { patterns: [
      "(necesito | quiero | me urge | me muero por) un (cafe | cafecito) [ya | ahorita]", "[si] (un cafe | cafe) (suena | me cae) (bien | muy bien | perfecto)", "(me encanta | amo) el cafe",
      "(perfecto | que bien | genial) (necesito | me urge) un (cafe | cafecito)",
    ] },
    // the cafetera is broken: "El té está bien"
    tea_ok: { patterns: [
      "[ok | bueno | no pasa nada] [el] te (esta bien | me parece bien | esta perfecto) [para mi]", "[ok | bueno] [entonces] (tomo | me tomo | me hago | me preparo) un te",
      "(prefiero | me gusta mas) [el] te", "[ok | bueno] [el] cafe soluble esta bien", "[ok | bueno] (tomo | me tomo | me hago) un cafe soluble",
      "(hay | tienen | tienes) (te | cafe soluble | algo mas) #q", "[no tomo cafe] [pero] (hay | tienen) te #q", "(y)? (el | donde (esta | hay)) te #q",
    ] },
    coffee_later: { patterns: [
      "[ok] (lo intento | lo pruebo) (despues | luego | mas tarde)", "(luego | despues | mas tarde) (lo intento | lo pruebo | me tomo uno)", "(tal vez | quiza) (luego | despues | mas tarde)",
      "[no] no (tomo | bebo) cafe", "[no] no me gusta [el] (cafe | te)", "[no] no (necesito | quiero) (cafe | un cafe) [ahorita | ahora]",
      "(ahorita | ahora) no [gracias] [(mas tarde | luego | despues)]", "(mas tarde | luego | despues) [gracias]", "(ni modo | que lastima | que mal | que pena | no pasa nada) #shrug",
    ] },
  },

  lines: {
    // --- hello ---------------------------------------------------------------------------------
    greet_new: [
      t("¡Hola! | ¿Eres | {m:nuevo|f:nueva} | aquí?", "Hi! | Are-you | new | here?", "Hi! Are you new here?"),
      t("¡Hola! | Tú | debes | ser | {m:el|f:la} | {m:nuevo|f:nueva}, | ¿verdad?", "Hi! | You | must | be | the | new one, | right?", "Hi! You must be the new one, right?"),
    ],
    greet_help: [
      t("¡Hola! | ¿Te | ayudo | en | algo?", "Hi! | (To) you | I-help | in | something?", "Hi! Can I help you?"),
      t("¡Buenos días! | ¿Te | puedo | ayudar?", "Good morning! | You | I-can | help?", "Good morning! Can I help you?"),
    ],
    new_again: [t("¿Eres | {m:nuevo|f:nueva} | aquí?", "Are-you | new | here?", "Are you new here?")],
    how_help: [t("Ah, | ¡bueno! | ¿En | qué | te | puedo | ayudar?", "Oh, | okay! | In | what | you | I-can | help?", "Oh, okay! How can I help?")],
    welcome_nice: [
      t("¡Bienvenid{m:o|f:a}! | Yo | soy | María. | ¡Mucho gusto!", "Welcome! | I | am | María. | Nice to meet you!", "Welcome! I'm María. Nice to meet you!"),
      t("¡Bienvenid{m:o|f:a} | al | equipo! | Soy | María. | ¡Mucho gusto!", "Welcome | to the | team! | I-am | María. | Nice to meet you!", "Welcome to the team! I'm María. Nice to meet you!"),
    ],
    welcome_team: [
      t("¡Bienvenid{m:o|f:a} | a | Línea Clara! | Soy | María. | Me siento | aquí | a | tu | lado.", "Welcome | to | Línea Clara! | I-am | María. | I sit | here | at | your | side.",
        "Welcome to Línea Clara! I'm María. I sit right next to you."),
    ],
    nice_you: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!")],
    ask_name: [
      t("Perdón, | ¿cómo | te llamas?", "Sorry, | how | are-you-called?", "Sorry, what's your name?"),
      t("¿Y | tú | eres…?", "And | you | are…?", "And you are…?"),
    ],
    nice_too: [t("¡Igualmente!", "Likewise!", "Nice to meet you too!")],
    my_name_is: [t("¡Soy | María! | Me siento | aquí | a | tu | lado.", "I'm | María! | I sit | here | at | your | side.", "I'm María! I sit right next to you.")],
    show_around: [
      t("Ven, | te | enseño | la | oficina. | ¡Por aquí!", "Come, | (to) you | I-show | the | office. | This way!", "Come on, I'll show you around. This way!"),
      t("Déjame | enseñarte | la | oficina.", "Let me | show you | the | office.", "Let me show you around the office."),
    ],

    // --- desk -------------------------------------------------------------------------------------
    desk_show: [
      t("Mira, | este | es | tu | escritorio, | y | esta | es | tu | laptop.", "Look, | this | is | your | desk, | and | this | is | your | laptop.", "So, this is your desk, and here's your laptop.", { spain: t("Mira, | este | es | tu | escritorio, | y | este | es | tu | portátil.", "Look, | this | is | your | desk, | and | this | is | your | laptop.", "So, this is your desk, and here's your laptop.") }),
      t("Aquí | está | tu | lugar, | y | esta | es | tu | laptop.", "Here | is | your | spot, | and | this | is | your | laptop.", "Here's your spot, and this is your laptop.", { spain: t("Aquí | está | tu | sitio, | y | este | es | tu | portátil.", "Here | is | your | spot, | and | this | is | your | laptop.", "Here's your spot, and this is your laptop.") }),
    ],
    card: [
      t("Tu | usuario | y | tu | contraseña | vienen | en | esta | tarjeta.", "Your | username | and | your | password | they-come | on | this | card.",
        "Your username and password are on this card."),
    ],
    dont_worry: [t("No te preocupes, | ¡no es | difícil!", "Don't worry, | it's not | hard!", "Don't worry, it's not hard!")],
    badge_late: [
      t("Ah, | y | tu | gafete | todavía | no está | listo. | Mientras, | yo | te | abro | la | puerta.", "Oh, | and | your | badge | still | isn't | ready. | Meanwhile, | I | (for) you | I'll-open | the | door.",
        "Oh, and your badge isn't ready yet. Until then, I'll let you in.",
        { flags: { 3: GAFETE },
          neutral: t("Ah, | y | tu | credencial | todavía | no está | lista. | Mientras, | yo | te | abro | la | puerta.", "Oh, | and | your | badge | still | isn't | ready. | Meanwhile, | I | (for) you | I'll-open | the | door.",
            "Oh, and your badge isn't ready yet. Until then, I'll let you in."), spain: t("Ah, | y | tu | tarjeta de acceso | todavía | no está | lista. | Mientras, | yo | te | abro | la | puerta.", "Oh, | and | your | badge | still | isn't | ready. | Meanwhile, | I | (for) you | I'll-open | the | door.", "Oh, and your badge isn't ready yet. Until then, I'll let you in.") }),
    ],
    badge_soon: [t("Creo | que | mañana | ya | está | listo.", "I-think | that | tomorrow | already | it-is | ready.", "I think it'll be ready tomorrow.",
      { flags: { 3: "ya with a future time: “by then”." },
        neutral: t("Creo | que | mañana | ya | está | lista.", "I-think | that | tomorrow | already | it-is | ready.", "I think it'll be ready tomorrow.") })],
    desk_bad_reply: [t("¿No? | Bueno, | si | necesitas | algo, | me | dices.", "No? | Well, | if | you-need | something, | (to) me | you-tell.", "No? Well, if you need anything, just tell me.")],
    glad_like: [t("¡Qué | bueno | que | te guste!", "How | good | that | you like it!", "Glad you like it!", { spain: t("¡Qué | bien | que | te guste!", "How | good | that | you like it!", "Glad you like it!") })],
    a_password: [
      t("Viene | en | la | tarjeta. | Te | va | a | pedir | una | nueva | la | primera | vez | que | entres.", "It-comes | on | the | card. | (To) you | it's-going | to | ask (for) | a | new one | the | first | time | that | you-log-in.",
        "It's on the card. It'll ask you for a new one the first time you log in."),
    ],
    a_change: [t("Te | va | a | pedir | una | nueva | la | primera | vez | que | entres.", "(To) you | it's-going | to | ask (for) | a | new one | the | first | time | that | you-log-in.",
      "It'll ask you for a new one the first time you log in.")],
    a_login: [
      t("Entras | con | tu | correo | y | la | contraseña | de | la | tarjeta.", "You-log-in | with | your | email | and | the | password | from | the | card.",
        "Just log in with your email and the password on the card."),
    ],
    a_badge: [t("¡Aquí | está | tu | gafete! | Lo | necesitas | para | entrar.", "Here | is | your | badge! | It | you-need | to | get in.", "Here's your badge! You need it to get in.",
      { flags: { 3: GAFETE },
        neutral: t("¡Aquí | está | tu | credencial! | La | necesitas | para | entrar.", "Here | is | your | badge! | It | you-need | to | get in.", "Here's your badge! You need it to get in."), spain: t("¡Aquí | está | tu | tarjeta de acceso! | La | necesitas | para | entrar.", "Here | is | your | badge! | It | you-need | to | get in.", "Here's your badge! You need it to get in.", { flags: { 4: "La: here the pronoun “it” (la tarjeta)." } }) })],
    a_badge_have: [t("¡Ya | lo | tienes! | Es | el | que | te | di.", "Already | it | you-have! | It's | the one | that | (to) you | I-gave.", "You already have it! It's the one I gave you.",
      { neutral: t("¡Ya | la | tienes! | Es | la | que | te | di.", "Already | it | you-have! | It's | the one | that | (to) you | I-gave.", "You already have it! It's the one I gave you."), spain: t("¡Ya | la | tienes! | Es | la | que | te | he dado.", "Already | it | you-have! | It's | the one | that | (to) you | I've-given.", "You already have it! It's the one I gave you.", { flags: { 1: "la: here the pronoun “it” (la tarjeta)." } }) })],
    a_wifi: [t("La | contraseña | del | wifi | también | viene | en | tu | tarjeta.", "The | password | of the | Wi-Fi | also | it-comes | on | your | card.", "The Wi-Fi password is on your card too.")],
    a_desk: [t("¡Sí, | es | para | ti!", "Yes, | it's | for | you!", "Yes, it's yours!")],
    a_desk_where: [t("Aquí, | en | este | escritorio, | junto | a | la | ventana.", "Here, | at | this | desk, | next | to | the | window.", "Right here, at this desk by the window.")],
    a_it: [
      t("Escríbeles | a | los | de | sistemas, | o | pregúntame.", "Write to them | — | the guys | from | IT, | or | ask me.", "Just email IT, or ask me!",
        { flags: { 1: "a marks the people you write to; English needs no word.", 4: SISTEMAS }, spain: t("Escríbeles | a | los | de | informática, | o | pregúntame.", "Write to them | — | the guys | from | IT, | or | ask me.", "Just email IT, or ask me!", { flags: { 1: "a marks the people you write to; English needs no word." } }) }),
    ],
    show_login: [
      t("¡Claro! | Escribe | tu | correo | y | luego | la | contraseña | de | la | tarjeta. | ¿Ves?", "Sure! | Type | your | email | and | then | the | password | from | the | card. | See?",
        "Sure! Type your email, then the password from the card. See?"),
    ],

    // --- tour ---------------------------------------------------------------------------------------
    tour_rooms: [
      t("La | sala de juntas | está | allá, | la | de | las | paredes | de | vidrio.", "The | meeting room | is | over there, | the one | with | the | walls | of | glass.",
        "The meeting room is over there, the one with the glass walls.",
        { flags: { 1: JUNTAS },
          neutral: t("La | sala de reuniones | está | allá, | la | de | las | paredes | de | vidrio.", "The | meeting room | is | over there, | the one | with | the | walls | of | glass.",
            "The meeting room is over there, the one with the glass walls."), spain: t("La | sala de reuniones | está | allí, | la | de | las | paredes | de | cristal.", "The | meeting room | is | over there, | the one | with | the | walls | of | glass.", "The meeting room is over there, the one with the glass walls.") }),
    ],
    tour_restrooms: [t("Y | los | baños | están | al fondo | del | pasillo, | a la izquierda.", "And | the | restrooms | are | at the end | of the | hall, | on the left.",
      "And the restrooms are down the hall, on the left.")],
    ask_anything: [
      t("Si | tienes | cualquier | duda, | pregúntame.", "If | you-have | any | question, | ask me.", "If you have any questions, just ask!"),
      t("¿Alguna | pregunta | hasta ahora?", "Any | question | so far?", "Any questions so far?"),
    ],
    what_else: [
      t("¿Qué | más?", "What | else?", "What else?"),
      t("¿Algo | más?", "Something | more?", "Anything else?"),
      t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?"),
    ],
    sure_what: [t("¡Claro! | Dime.", "Sure! | Tell me.", "Sure! What's up?")],
    a_coffee: [
      t("Está | en | la | cocina, | junto | al | refrigerador. | ¡La | grande, | la | negra!", "It-is | in | the | kitchen, | next | to the | fridge. | The | big one, | the | black one!",
        "It's in the kitchen, next to the fridge. The big black one!", { spain: t("Está | en | la | cocina, | junto | a | la | nevera. | ¡La | grande, | la | negra!", "It-is | in | the | kitchen, | next | to | the | fridge. | The | big one, | the | black one!", "It's in the kitchen, next to the fridge. The big black one!") }),
    ],
    a_coffee_more: [t("¿Quieres | que | te | enseñe | cómo | funciona?", "Do-you-want | that | (to) you | I-show | how | it-works?", "Want me to show you how it works?")],
    a_how_coffee: [
      t("Nomás | aprietas | este | botón | y | esperas | un | minuto.", "Just | you-press | this | button | and | you-wait | a | minute.", "Just press this button and wait a minute.",
        { flags: { 0: "Mexican: nomás = just." },
          neutral: t("Solo | aprietas | este | botón | y | esperas | un | minuto.", "Just | you-press | this | button | and | you-wait | a | minute.", "Just press this button and wait a minute.") }),
    ],
    a_how_broken: [
      t("Normalmente | aprietas | este | botón. | Pero | hoy | no funciona, | ¡perdón!", "Usually | you-press | this | button. | But | today | it doesn't work, | sorry!",
        "Usually you just press this button. But today it's not working, sorry!"),
    ],
    // (not "¡Bueno!": the first task's "¡Bueno! Tu primera tarea…" / "Bueno, ¡a la chamba!" comes right after it)
    fine_then: [t("¡Sin problema! | Ahí | está | cuando | la | necesites.", "No problem! | There | it-is | whenever | it | you-need.", "No problem! It's there whenever you need it.",
      { flags: { 4: "la here is a pronoun: it (the coffee machine)." } })],
    a_tea: [t("¡Sí! | Hay | té | y | café | soluble | en | la | alacena.", "Yes! | There-is | tea | and | coffee | instant | in | the | cupboard.", "Yes! There's tea and instant coffee in the cupboard.", { spain: t("¡Sí! | Hay | té | y | café | soluble | en | el | armario.", "Yes! | There-is | tea | and | coffee | instant | in | the | cupboard.", "Yes! There's tea and instant coffee in the cupboard.") })],
    shrug_reply: [t("Sí, | ¿verdad?", "Yes, | right?", "I know, right?")],
    a_tea_short: [t("¡Sí, | en | la | alacena!", "Yes, | in | the | cupboard!", "Yes, in the cupboard!", { spain: t("¡Sí, | en | el | armario!", "Yes, | in | the | cupboard!", "Yes, in the cupboard!") })],
    tea_reply: [t("¡Buena | idea!", "Good | idea!", "Good idea!")],
    wash_cup: [t("¡Y | no olvides | lavar | tu | taza!", "And | don't forget | to wash | your | mug!", "And don't forget to wash your mug!")],
    which_one: [t("¿La | cafetera? | ¡Claro!", "The | coffee machine? | Sure!", "The coffee machine? Sure!")],
    // the office's kitchen is its front east corner (interiors.ts `office`), not the back
    a_kitchen: [t("Está | allá, | en | la | esquina.", "It-is | over there, | in | the | corner.", "It's right over there, in the corner.", { spain: t("Está | allí, | en | la | esquina.", "It-is | over there, | in | the | corner.", "It's right over there, in the corner.") })],
    a_water: [
      t("En | la | cocina | hay | un | garrafón | de | agua.", "In | the | kitchen | there-is | a | big jug | of | water.", "There's a big jug of drinking water in the kitchen.",
        { flags: { 5: "Mexican: garrafón = a big jug of drinking water (people don't drink the tap water)." },
          neutral: t("En | la | cocina | hay | un | bidón | de | agua.", "In | the | kitchen | there-is | a | big jug | of | water.", "There's a big jug of drinking water in the kitchen.") }),
    ],
    a_fridge: [t("¡En | el | refrigerador! | Solo | ponle | tu | nombre.", "In | the | fridge! | Just | put on it | your | name.", "In the fridge! Just put your name on it.", { spain: t("¡En | la | nevera! | Solo | ponle | tu | nombre.", "In | the | fridge! | Just | put on it | your | name.", "In the fridge! Just put your name on it.") })],
    a_micro: [t("Sí, | en | la | cocina, | junto | al | refrigerador.", "Yes, | in | the | kitchen, | next | to the | fridge.", "Yes, in the kitchen, next to the fridge.", { spain: t("Sí, | en | la | cocina, | junto | a | la | nevera.", "Yes, | in | the | kitchen, | next | to | the | fridge.", "Yes, in the kitchen, next to the fridge.") })],
    a_printer: [t("La | impresora | está | allá, | junto | a | la | ventana.", "The | printer | is | over there, | next | to | the | window.", "The printer is over there, by the window.", { spain: t("La | impresora | está | allí, | junto | a | la | ventana.", "The | printer | is | over there, | next | to | the | window.", "The printer is over there, by the window.") })],
    a_print_how: [t("Mandas | a | imprimir | desde | tu | laptop | y | listo.", "You-send (it) | to | print | from | your | laptop | and | done.", "Just send it to print from your laptop, and that's it.", { spain: t("Mandas | a | imprimir | desde | tu | portátil | y | ya está.", "You-send (it) | to | print | from | your | laptop | and | done.", "Just send it to print from your laptop, and that's it.") })],
    a_restroom: [t("Al fondo | del | pasillo, | a la izquierda.", "At the end | of the | hall, | on the left.", "Down the hall, on the left.")],
    a_meeting: [
      t("Es | la | de | las | paredes | de | vidrio. | La | reservas | en | el | calendario.", "It's | the one | with | the | walls | of | glass. | It | you-book | in | the | calendar.",
        "It's the one with the glass walls. You book it in the calendar.", { flags: { 7: "La here is a pronoun: it (the room)." } }),
    ],
    a_dress: [
      t("Nada | muy | formal. | Y | los | viernes | son | casuales: | ¡puedes | venir | de | jeans!", "Nothing | very | formal. | And | — | Fridays | are | casual: | you-can | come | in | jeans!",
        "Nothing too formal. And Fridays are casual: you can wear jeans!", { flags: { 4: "los viernes: on Fridays (every Friday)." }, spain: t("Nada | muy | formal. | Y | los | viernes | son | informales: | ¡puedes | venir | en | vaqueros!", "Nothing | very | formal. | And | — | Fridays | are | casual: | you-can | come | in | jeans!", "Nothing too formal. And Fridays are casual: you can wear jeans!", { flags: { 4: "los viernes: on Fridays (every Friday)." } }) }),
    ],
    a_lunch_time: [t("Casi | todos | comemos | como | a | las | dos.", "Almost | everyone | we-eat | around | at | — | two.", "Most of us have lunch around two.",
      { flags: { 2: "comer: in Mexico also “have lunch”: la comida is the big midday meal.", 5: ART_TIME }, spain: t("Casi | todos | comemos | sobre | las | dos.", "Almost | everyone | we-eat | around | — | two.", "Most of us have lunch around two.", { flags: { 2: "comer: here “have lunch”: la comida is the big midday meal.", 4: "The article before a clock time has no English word." } }) })],
    a_lunch_long: [t("Tenemos | una | hora, | de | dos | a | tres.", "We-have | an | hour, | from | two | to | three.", "We get an hour, from two to three.")],
    a_home_time: [t("Casi | todos | se van | como | a | las | seis.", "Almost | everyone | leave | around | at | — | six.", "Most people leave around six.", { flags: { 5: ART_TIME }, spain: t("Casi | todos | se van | sobre | las | seis.", "Almost | everyone | leave | around | — | six.", "Most people leave around six.", { flags: { 4: "The article before a clock time has no English word." } }) })],
    a_start_time: [t("Entramos | a | las | nueve.", "We-start | at | — | nine.", "We start at nine.", { flags: { 2: ART_TIME } })],
    a_mug: [t("¡Claro! | Las | tazas | están | en | la | alacena, | arriba | del | fregadero.", "Sure! | The | mugs | are | in | the | cupboard, | above | the | sink.",
      "Sure! The mugs are in the cupboard above the sink.", { spain: t("¡Claro! | Las | tazas | están | en | el | armario, | encima | del | fregadero.", "Sure! | The | mugs | are | in | the | cupboard, | above | the | sink.", "Sure! The mugs are in the cupboard above the sink.") })],
    a_mug_where: [t("En | la | alacena, | arriba | del | fregadero.", "In | the | cupboard, | above | the | sink.", "In the cupboard above the sink.", { spain: t("En | el | armario, | encima | del | fregadero.", "In | the | cupboard, | above | the | sink.", "In the cupboard above the sink.") })],
    a_mug_own: [t("Si | quieres, | pero | hay | tazas | en | la | alacena.", "If | you-want, | but | there-are | mugs | in | the | cupboard.", "If you like, but there are mugs in the cupboard.", { spain: t("Si | quieres, | pero | hay | tazas | en | el | armario.", "If | you-want, | but | there-are | mugs | in | the | cupboard.", "If you like, but there are mugs in the cupboard.") })],
    a_who: [
      t("Es | la | licenciada | Salinas, | de | Recursos Humanos. | Es | muy | amable.", "That's | — | Ms. | Salinas, | from | HR. | She's | very | nice.",
        "That's Ms. Salinas from HR. She's really nice.",
        { flags: { 1: "The article before a title has no English word.", 2: "licenciada: a title for someone with a college degree; English says Ms." } }),
    ],
    // "¿Quién es Pablo?" after "¡Esa no, es la taza de Pablo!" (Línea Clara's Pablo, s34)
    a_pablo: [t("Es | un | compañero | del | equipo. | ¡Luego | te lo | presento!", "He's | a | coworker | from the | team. | Later | him to you | I'll-introduce!",
      "He's on our team. I'll introduce you later!")],
    a_parking: [t("Atrás | del | edificio. | ¡Y | es | gratis!", "Behind | the | building. | And | it's | free!", "Behind the building. And it's free!", { spain: t("Detrás | del | edificio. | ¡Y | es | gratis!", "Behind | the | building. | And | it's | free!", "Behind the building. And it's free!") })],
    a_parking_free: [t("Sí, | es | gratis. | Está | atrás | del | edificio.", "Yes, | it's | free. | It-is | behind | the | building.", "Yes, it's free. It's behind the building.", { spain: t("Sí, | es | gratis. | Está | detrás | del | edificio.", "Yes, | it's | free. | It-is | behind | the | building.", "Yes, it's free. It's behind the building.") })],
    a_help: [t("¡Pregúntame! | Me siento | aquí | a | tu | lado.", "Ask me! | I sit | here | at | your | side.", "Just ask me! I sit right next to you.")],
    a_unknown: [
      t("Mmm, | no sé. | Pregunto | y | te | aviso.", "Hmm, | I don't know. | I'll-ask | and | (to) you | I'll-let-know.", "Hmm, I don't know. I'll ask and let you know!"),
    ],
    a_unknown_where: [t("¡Luego | te | enseño!", "Later | (to) you | I'll-show!", "I'll show you later!")],
    a_unknown_have: [t("Mmm, | creo | que | no. | Pero | pregunto.", "Hmm, | I-think | that | not. | But | I'll-ask.", "Hmm, I don't think so. But I'll check!")],
    coffee_offer: [
      t("Ah, | y | lo | más | importante: | ¡la | cafetera!", "Oh, | and | the | most | important (thing): | the | coffee machine!", "Oh, and the most important thing: the coffee machine!",
        { flags: { 2: "lo + adjective: “the … thing”." } }),
    ],
    coffee_broken: [t("¡Ay, | no! | Se descompuso | otra vez.", "Oh, | no! | It-broke-down | again.", "Oh no, it's broken again!", { spain: t("¡Ay, | no! | Se ha estropeado | otra vez.", "Oh, | no! | It's broken down | again.", "Oh no, it's broken again!") })],
    coffee_alt: [t("Pero | en | la | alacena | hay | té | y | café | soluble.", "But | in | the | cupboard | there-is | tea | and | coffee | instant.", "But there's tea and instant coffee in the cupboard.", { spain: t("Pero | en | el | armario | hay | té | y | café | soluble.", "But | in | the | cupboard | there-is | tea | and | coffee | instant.", "But there's tea and instant coffee in the cupboard.") })],
    mug_twist: [
      t("¡Ay, | espera! | Esa | no, | es | la | taza | de | Pablo. | Toma, | usa | esta.", "Oh, | wait! | That one | not, | it's | the | mug | of | Pablo. | Here, | use | this one.",
        "Oh, wait! Not that one, that's Pablo's mug. Here, use this one."),
    ],
    no_worries: [
      t("¡Jaja, | no pasa nada!", "Haha, | no worries!", "Ha, no worries!"),
      t("¡No te preocupes! | Ni | se va | a | enterar.", "Don't worry! | Not even | he's-going | to | find out.", "Don't worry! He won't even know."),
    ],
    printer_jam: [
      t("¡Ay, | no! | Se atoró | el | papel | otra vez.", "Oh, | no! | It-got-stuck | the | paper | again.", "Oh no, the paper's jammed again!",
        { flags: { 2: "Mexican: atorarse = get stuck (elsewhere: atascarse)." },
          neutral: t("¡Ay, | no! | Se atascó | el | papel | otra vez.", "Oh, | no! | It-got-stuck | the | paper | again.", "Oh no, the paper's jammed again!"), spain: t("¡Ay, | no! | Se ha atascado | el | papel | otra vez.", "Oh, | no! | It's gotten stuck | the | paper | again.", "Oh no, the paper's jammed again!") }),
    ],
    printer_fix: [t("Abre | la | tapa | de | un | lado | y | saca | el | papel.", "Open | the | cover | of | one | side | and | take out | the | paper.", "Just open the side cover and take out the paper.")],

    // --- first task -----------------------------------------------------------------------------------
    task_intro: [
      t("¡Bueno! | Tu | primera | tarea: | hay que | actualizar | la | lista | de | clientes.", "Okay! | Your | first | task: | we need | to update | the | list | of | clients.",
        "Okay! Your first task: we need to update the client list."),
      t("Bueno, | ¡a | la | chamba! | Hay que | actualizar | la | lista | de | clientes.", "Okay, | to | the | work! | We need | to update | the | list | of | clients.",
        "Okay, let's get to work! We need to update the client list.",
        { flags: { 3: "Mexican, casual: la chamba = work, a job." },
          neutral: t("Bueno, | ¡a | trabajar! | Hay que | actualizar | la | lista | de | clientes.", "Okay, | to | work! | We need | to update | the | list | of | clients.",
            "Okay, let's get to work! We need to update the client list.") }),
    ],
    task_file: [t("Está | en | un | archivo | en | mi | computadora.", "It-is | in | a | file | on | my | computer.", "It's in a file on my computer.", { spain: t("Está | en | un | archivo | en | mi | ordenador.", "It-is | in | a | file | on | my | computer.", "It's in a file on my computer.") })],
    task_later_reply: [t("¡No hay prisa! | Te lo | mando | por | correo | para | cuando | puedas.", "No rush! | It to you | I'll-send | by | email | for | when | you-can.",
      "No rush! I'll email it to you for whenever you can.")],
    a_which_file: [t("La | lista | de | clientes.", "The | list | of | clients.", "The client list.")],
    task_again: [t("Entonces, | ¿lo | puedes | hacer?", "So, | it | you-can | do?", "So, can you do that?")],
    show_system: [
      t("¡Claro! | Entras, | le das clic | a | “Nuevo” | y | luego | a | “Guardar”. | ¿Ves? | ¡Es | fácil!", "Sure! | You-log-in, | you-click | on | “New” | and | then | on | “Save”. | See? | It's | easy!",
        "Sure! Log in, click “New”, then “Save”. See? It's easy!", { say: "¡Claro! Entras, le das clic a Nuevo y luego a Guardar. ¿Ves? ¡Es fácil!", spain: t("¡Claro! | Entras, | haces clic | en | “Nuevo” | y | luego | en | “Guardar”. | ¿Ves? | ¡Es | fácil!", "Sure! | You-log-in, | you-click | on | “New” | and | then | on | “Save”. | See? | It's | easy!", "Sure! Log in, click “New”, then “Save”. See? It's easy!") }),
    ],
    file_sent: [t("¡Listo! | Ya | te lo | mandé | por | correo.", "Done! | Already | it to you | I-sent | by | email.", "Done! I just emailed it to you.", { spain: t("¡Ya está! | Ya | te lo | he mandado | por | correo.", "Done! | Already | it to you | I've-sent | by | email.", "Done! I just emailed it to you.") })],
    which_file: [t("¡Claro! | ¿Cuál | archivo?", "Sure! | Which | file?", "Sure! Which file?", { spain: t("¡Claro! | ¿Qué | archivo?", "Sure! | Which | file?", "Sure! Which file?") })],
    send_offer: [t("Te lo | mando | por | correo.", "It to you | I'll-send | by | email.", "I'll email you the file.")],
    task_ok_reply: [
      t("¡Perfecto! | Si | necesitas | algo, | me | dices.", "Perfect! | If | you-need | something, | (to) me | you-tell.", "Great! If you need anything, just tell me."),
      t("¡Excelente! | Cualquier | cosa, | me | avisas.", "Excellent! | Any | thing, | (to) me | you-let-know.", "Perfect! Anything at all, just let me know."),
    ],
    know_ok: [t("¡Ah, | qué | bien!", "Oh, | how | good!", "Oh, great!")],

    // --- lunch -----------------------------------------------------------------------------------------
    lunch_invite: [
      t("Varios | vamos | a | ir | a | comer | a | la | cocina económica | de | la | esquina. | ¿Vienes?", "Several | we're-going | to | go | to | eat | at | the | diner | on | the | corner. | Are-you-coming?",
        "A few of us are going to lunch at the little diner on the corner. Want to come?", { flags: { 8: COCINA_EC } }),
      t("¿Quieres | venir | a | comer | con | nosotros? | Casi | siempre | vamos | a | la | cocina económica | de | la | esquina.",
        "Do-you-want | to come | to | eat | with | us? | Almost | always | we-go | to | the | diner | on | the | corner.",
        "Do you want to come to lunch with us? We usually go to the little diner on the corner.", { flags: { 11: COCINA_EC } }),
    ],
    // two, so that two questions about the lunch never get the same reminder twice in a row
    lunch_reask: [t("Entonces, | ¿vienes?", "So, | are-you-coming?", "So, are you coming?"),
      t("¿Qué | dices? | ¿Vienes?", "What | do-you-say? | Are-you-coming?", "What do you say? Are you coming?")],
    // the urging, in two lines so that a later "¿Qué es eso?" knows whether the chiles were named
    lunch_insist: [
      t("¿No te animas? | Hoy | hay | chiles rellenos.", "Won't you join us? | Today | there-are | stuffed peppers.", "Come on, won't you come? It's stuffed peppers today."),
    ],
    lunch_urge: [
      t("¡Ándale, | vente! | Es | un | ratito | nada más.", "Come on, | come along! | It's | a | little while | only.", "Oh, come on! It's just for a little while.",
        { flags: { 0: "Mexican: ándale = come on." },
          neutral: t("¡Anda, | vente! | Es | un | ratito | nada más.", "Come on, | come along! | It's | a | little while | only.", "Oh, come on! It's just for a little while."), spain: t("¡Anda, | vente! | Es | solo | un | ratito.", "Come on, | come along! | It's | only | a | little while.", "Oh, come on! It's just for a little while.") }),
    ],
    lunch_yes_reply: [
      t("¡Qué | bien! | Salimos | a | las | dos.", "How | great! | We-leave | at | — | two.", "Great! We leave at two.", { flags: { 4: ART_TIME } }),
      t("¡Padrísimo! | Nos vamos | a | las | dos.", "Awesome! | We're-leaving | at | — | two.", "Awesome! We're heading out at two.",
        { flags: { 0: "Mexican: padrísimo = awesome (from padre, cool).", 3: ART_TIME },
          neutral: t("¡Genial! | Nos vamos | a | las | dos.", "Awesome! | We're-leaving | at | — | two.", "Awesome! We're heading out at two.", { flags: { 3: ART_TIME } }) }),
    ],
    lunch_yes_short: [t("¡Qué | bien! | Te | aviso | cuando | salgamos.", "How | great! | You | I'll-let-know | when | we-leave.", "Great! I'll let you know when we head out.")],
    lunch_no_reply: [
      t("¡No pasa nada! | Será | mañana.", "No worries! | It'll-be | tomorrow.", "No problem! Maybe tomorrow."),
      t("Bueno, | ¡otro | día | será!", "Okay, | another | day | it'll-be!", "Okay, next time!"),
    ],
    // TOWN.md: on calle Ceiba just south of Juárez, behind the bank, at the other end of Línea Clara's block (s69)
    a_place_where: [t("Aquí | en | la | esquina | de | Ceiba, | a | dos | minutos.", "Here | on | the | corner | of | Ceiba, | at | two | minutes.",
      "Right on the corner of Ceiba Street, two minutes away.")],
    a_place_near: [t("¡Sí! | Aquí | en | la | esquina.", "Yes! | Here | on | the | corner.", "Yes! Right here on the corner.")],
    a_place_far: [t("No, | para nada. | Está | aquí | en | la | esquina.", "No, | not at all. | It-is | here | on | the | corner.", "No, not at all. It's right here on the corner.")],
    a_lunch_at: [t("A | las | dos.", "At | — | two.", "At two.", { flags: { 1: ART_TIME } })],
    a_price: [t("La | comida corrida | cuesta | como | cien | pesos.", "The | set lunch | costs | about | a hundred | pesos.", "The set lunch is about a hundred pesos.", { flags: { 1: CORRIDA }, spain: t("El | menú del día | cuesta | unos | cien | pesos.", "The | set lunch | costs | about | a hundred | pesos.", "The set lunch is about a hundred pesos.", { flags: { 1: "menú del día: the set lunch (a first course, a main dish, a drink, dessert or coffee) for one price.", 3: "unos before a number: about." } }) })],
    a_price_dear: [t("No, | es | barato: | la | comida corrida | cuesta | como | cien | pesos.", "No, | it's | cheap: | the | set lunch | costs | about | a hundred | pesos.",
      "No, it's cheap: the set lunch is about a hundred pesos.", { flags: { 4: CORRIDA }, spain: t("No, | es | barato: | el | menú del día | cuesta | unos | cien | pesos.", "No, | it's | cheap: | the | set lunch | costs | about | a hundred | pesos.", "No, it's cheap: the set lunch is about a hundred pesos.", { flags: { 4: "menú del día: the set lunch (a first course, a main dish, a drink, dessert or coffee) for one price.", 6: "unos before a number: about." } }) })],
    a_price_cheap: [t("Sí, | la | comida corrida | cuesta | como | cien | pesos.", "Yes, | the | set lunch | costs | about | a hundred | pesos.", "Yes, the set lunch is about a hundred pesos.",
      { flags: { 2: CORRIDA }, spain: t("Sí, | el | menú del día | cuesta | unos | cien | pesos.", "Yes, | the | set lunch | costs | about | a hundred | pesos.", "Yes, the set lunch is about a hundred pesos.", { flags: { 2: "menú del día: the set lunch (a first course, a main dish, a drink, dessert or coffee) for one price.", 4: "unos before a number: about." } }) })],
    a_food: [t("Comida | casera: | sopa, | arroz, | un | guisado | y | agua fresca.", "Food | homemade: | soup, | rice, | a | main dish | and | fruit water.",
      "Home cooking: soup, rice, a main dish and agua fresca.", { flags: { 5: "guisado: a home-cooked main dish, often a stew.", 7: "agua fresca: water blended with fruit, sugar and ice." } })],
    a_veg: [t("Sí, | casi | siempre | hay | algo | sin | carne.", "Yes, | almost | always | there-is | something | without | meat.", "Yes, there's almost always something without meat.")],
    a_spicy: [t("No | mucho, | y | la | salsa | va | aparte.", "Not | much, | and | the | salsa | it-goes | separately.", "Not really, and the salsa comes on the side.")],
    a_chiles: [t("Son | chiles poblanos | rellenos | de | queso. | ¡Están | riquísimos!", "They're | poblano peppers | stuffed | with | cheese. | They're | delicious!",
      "They're poblano peppers stuffed with cheese. They're delicious!")],
    a_card: [t("Creo | que | solo | aceptan | efectivo.", "I-think | that | only | they-accept | cash.", "I think it's cash only.")],
    // "¿Quiénes van?", "¿Vamos todos juntos?"
    a_lunch_who: [t("Varios | del | equipo. | ¡Así | los | conoces!", "Several | from the | team. | That way | them | you-meet!",
      "A few people from the team. That way you'll get to meet them!", { flags: { 4: "los here is a pronoun: them (your new coworkers)." } })],
    // "¿Qué es una cocina económica?", or "¿Qué es eso?" right after the invitation
    a_cocina: [t("Es | un | lugarcito | de | comida | casera, | ¡y | barato!", "It's | a | little place | of | food | homemade, | and | cheap!",
      "It's a little place with home cooking, and it's cheap!", { flags: { 2: "lugarcito: lugar (place) + -cito, a small, friendly place." }, spain: t("Es | un | sitio | de | comida | casera, | ¡y | barato!", "It's | a | place | of | food | homemade, | and | cheap!", "It's a little place with home cooking, and it's cheap!") })],

    // --- end of the day -----------------------------------------------------------------------------------
    day_ask: [
      t("¡Ya | son | las | seis! | ¿Cómo | te | fue | en | tu | primer | día?", "Already | it's | — | six! | How | (for) you | it-went | on | your | first | day?",
        "It's six already! So, how was your first day?", { flags: { 2: ART_TIME, 5: "te fue: “it went for you” = how was it." }, spain: t("¡Ya | son | las | seis! | ¿Qué tal | te | ha ido | el | primer | día?", "Already | it's | — | six! | How | (for) you | it's gone | the | first | day?", "It's six already! So, how was your first day?", { flags: { 2: "The article before a clock time has no English word.", 5: "te ha ido: “it has gone for you” = how was it." } }) }),
      t("¡Ya | es | hora | de | irnos! | Oye, | ¿qué tal | tu | primer | día?", "Already | it's | time | to | go! | Hey, | how was | your | first | day?",
        "Time to go home! Hey, how was your first day?"),
    ],
    // the question again, without the clock again
    day_reask: [t("Entonces, | ¿qué tal | tu | primer | día?", "So, | how was | your | first | day?", "So, how was your first day?")],
    day_good_reply: [
      t("¡Qué | bueno! | Vas | a | ver | que | te acostumbras | rapidísimo.", "How | good! | You're-going | to | see | that | you-get-used (to it) | super fast.",
        "Glad to hear it! You'll see, you'll get used to everything really fast.", { spain: t("¡Qué | bien! | Ya verás | como | te acostumbras | rapidísimo.", "How | good! | You'll see | how | you-get-used (to it) | super fast.", "Glad to hear it! You'll see, you'll get used to everything really fast.") }),
    ],
    day_tired_reply: [
      t("¡El | primer | día | siempre | es | el | más | pesado! | Ya | te | vas | a | acostumbrar.", "The | first | day | always | is | the | most | tiring! | Soon | (yourself) | you're-going | to | get used.",
        "The first day is always the hardest! You'll get used to it.", { flags: { 8: "ya with a future: “soon”, “you'll see”.", 9: "te belongs to acostumbrarse (get used to); it moves before vas." } }),
    ],
    me_too: [t("¡Muy | bien | también, | gracias!", "Very | well | too, | thanks!", "Pretty good too, thanks!")],
    see_tomorrow: [t("¡Nos vemos | mañana!", "See you | tomorrow!", "See you tomorrow!")],
    bye_reply: [
      t("¡Bye! | ¡Que | descanses!", "Bye! | — | Rest well!", "Bye! Get some rest!", { flags: { 1: "que + verb: a wish (may you rest)." }, spain: t("¡Chao! | ¡Que | descanses!", "Bye! | — | Rest well!", "Bye! Get some rest!", { flags: { 1: "que + verb: a wish (may you rest)." } }) }),
      t("¡Que | te | vaya | bien!", "— | (For) you | may-it-go | well!", "Have a good evening!", { flags: { 0: "que + verb: a wish." } }),
    ],
    bye_early: [t("¡Nos vemos!", "See you!", "See you!")],
    bye_same: [t("¡Igualmente! | ¡Bye!", "Likewise! | Bye!", "You too! Bye!", { spain: t("¡Igualmente! | ¡Hasta mañana!", "Likewise! | See you tomorrow!", "You too! See you tomorrow!") })],
    ack: [t("¡Bueno!", "Okay!", "Okay!", { spain: t("¡Vale!", "Okay!", "Okay!") }), t("¡Claro!", "Sure!", "Sure!")],
    welcome_reply: [t("¡De nada!", "You're welcome!", "You're welcome!"), t("¡Para eso estamos!", "That's what we're here for!", "Anytime!")],
  },

  hints: {
    intro: {
      lt: "Introduce yourself",
      items: [
        { id: "first_day", s: t("¡Hola! | Soy | {$name}. | Es | mi | primer | día.", "Hi! | I'm | {$name}. | It's | my | first | day.", "Hi! I'm {$name}. It's my first day.") },
        { id: "im_new", s: t("Sí, | soy | {m:nuevo|f:nueva} | aquí.", "Yes, | I'm | new | here.", "Yes, I'm new here.") },
        { id: "first_day", s: t("Sí, | hoy | es | mi | primer | día.", "Yes, | today | is | my | first | day.", "Yes, it's my first day today.") },
        { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
      ],
    },
    meet: {
      lt: "Answer her welcome",
      items: [
        { id: "nice_meet", s: t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!") },
        { id: "nice_meet", s: t("¡Igualmente!", "Likewise!", "Nice to meet you too!") },
        { id: "im_name", s: t("¡Gracias! | Soy | {$name}.", "Thanks! | I'm | {$name}.", "Thanks! I'm {$name}.") },
        { id: "s_thanks", s: t("¡Gracias!", "Thanks!", "Thank you!") },
      ],
    },
    name: {
      lt: "Say your name",
      items: [
        { id: "im_name", s: t("Soy | {$name}.", "I'm | {$name}.", "I'm {$name}.") },
        { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
      ],
    },
    desk: {
      lt: "Say thanks, or ask about the laptop",
      items: [
        { id: "desk_great", s: t("¡Gracias! | ¡Qué | bonito!", "Thanks! | How | nice!", "Thanks! This is great.") },
        { id: "q_login", s: t("¿Cómo | entro | al | sistema?", "How | I-log-in | to the | system?", "How do I log in?") },
        { id: "q_password", s: t("¿Cuál | es | mi | contraseña?", "What | is | my | password?", "What's my password?") },
        { id: "q_change", s: t("¿Tengo | que | cambiar | la | contraseña?", "I-have | to | change | the | password?", "Do I need to change the password?") },
        { id: "q_badge", s: t("¿Me | dan | un | gafete?", "(To) me | they-give | a | badge?", "Do I get a badge?", { flags: { 3: GAFETE },
          neutral: t("¿Me | dan | una | credencial?", "(To) me | they-give | a | badge?", "Do I get a badge?"), spain: t("¿Me | dan | una | tarjeta de acceso?", "(To) me | they-give | a | badge?", "Do I get a badge?") }) },
      ],
    },
    where: {
      lt: "Ask where things are",
      items: [
        { id: "q_coffee", s: t("¿Dónde | está | la | cafetera?", "Where | is | the | coffee machine?", "Where's the coffee machine?") },
        { id: "q_kitchen", s: t("¿Dónde | está | la | cocina?", "Where | is | the | kitchen?", "Where's the kitchen?") },
        { id: "q_printer", s: t("¿Dónde | está | la | impresora?", "Where | is | the | printer?", "Where's the printer?") },
      ],
    },
    where2: {
      lt: "Ask about clothes and lunch",
      items: [
        { id: "q_dress", s: t("¿Hay | código | de | vestimenta?", "Is-there | code | of | dress?", "Is there a dress code?") },
        { id: "q_lunch_time", s: t("¿A | qué | hora | comen?", "At | what | time | do-you-all-eat?", "What time do people have lunch?"),
          note: "In Mexico lunch, la comida, is the big meal of the day, around two." },
        { id: "q_fridge", s: t("¿Dónde | pongo | mi | comida?", "Where | I-put | my | lunch?", "Where can I put my lunch?") },
      ],
    },
    where3: {
      lt: "Ask something else about the office",
      items: [
        { id: "q_home", s: t("¿A | qué | hora | salimos?", "At | what | time | we-leave?", "What time do we finish?") },
        { id: "q_who", s: t("¿Quién | es | ella?", "Who | is | she?", "Who's that?") },
        { id: "q_meeting", s: t("¿Dónde | está | la | sala de juntas?", "Where | is | the | meeting room?", "Where's the meeting room?", { flags: { 3: JUNTAS },
          neutral: t("¿Dónde | está | la | sala de reuniones?", "Where | is | the | meeting room?", "Where's the meeting room?") }),
          note: "Mexico says sala de juntas; elsewhere sala de reuniones." },
        { id: "q_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?") },
      ],
    },
    no_more: {
      lt: "Say you have no more questions",
      items: [
        { id: "q_none", s: t("No, | es | todo | por ahora.", "No, | it's | all | for now.", "No, that's all for now.") },
        { id: "q_good", s: t("Creo | que | estoy | bien, | gracias.", "I-think | that | I-am | good, | thanks.", "I think I'm good, thanks.") },
      ],
    },
    coffee: {
      lt: "Say thanks, or ask how it works",
      items: [
        { id: "coffee_great", s: t("¡Genial, | gracias!", "Great, | thanks!", "Great, thanks!") },
        { id: "q_how", s: t("¿Cómo | funciona?", "How | does-it-work?", "How does it work?") },
        { id: "q_mug", s: t("¿Puedo | usar | esta | taza?", "I-can | use | this | mug?", "Can I use this mug?") },
      ],
    },
    oops: {
      lt: "Apologize",
      items: [
        { id: "oops", s: t("¡Ups, | perdón!", "Oops, | sorry!", "Oops, sorry!") },
        { id: "oops", s: t("¡Ay, | no sabía!", "Oh, | I didn't know!", "Oh, I didn't know!") },
      ],
    },
    bye: {
      lt: "Say goodbye",
      items: [
        { id: "see_tomorrow", s: t("¡Nos vemos | mañana!", "See you | tomorrow!", "See you tomorrow!") },
        { id: "thanks_all", s: t("¡Gracias | por | todo!", "Thanks | for | everything!", "Thanks for everything!") },
        { id: "bye_evening", s: t("¡Que | descanses!", "— | Rest well!", "Get some rest!", { flags: { 0: "que + verb: a wish (may you rest)." } }) },
      ],
    },
    how: {
      lt: "Ask how something works",
      items: [
        { id: "q_how", s: t("¿Cómo | funciona?", "How | does-it-work?", "How does it work?") },
        { id: "show_me", s: t("¿Me | enseñas | cómo | funciona?", "(To) me | you-show | how | it-works?", "Could you show me how this works?") },
        { id: "q_mug", s: t("¿Puedo | usar | esta | taza?", "I-can | use | this | mug?", "Can I use this mug?") },
      ],
    },
    task: {
      lt: "Ask her to show you, or to send the file",
      items: [
        { id: "show_me", s: t("¿Me | enseñas | cómo | funciona?", "(To) me | you-show | how | it-works?", "Could you show me how this works?") },
        { id: "send_file", s: t("¿Me | mandas | el | archivo?", "(To) me | you-send | the | file?", "Could you send me that file?") },
        { id: "task_sure", s: t("Claro, | yo | lo | hago.", "Sure, | I | it | I-do.", "Sure, I can do that.") },
        { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thanks a lot!") },
      ],
    },
    lunch: {
      lt: "Accept the invitation, or say no",
      items: [
        { id: "l_love", s: t("¡Me encantaría!", "I'd love to!", "I'd love to!") },
        { id: "l_sounds", s: t("¡Suena | muy | bien!", "It-sounds | very | good!", "Sounds great!") },
        { id: "l_brought", s: t("Gracias, | pero | traje | mi | comida.", "Thanks, | but | I-brought | my | lunch.", "Thanks, but I brought my lunch.", { spain: t("Gracias, | pero | me he traído | la | comida.", "Thanks, | but | I've brought | the | lunch.", "Thanks, but I brought my lunch.") }) },
        { id: "l_next_time", s: t("¡Tal vez | mañana!", "Maybe | tomorrow!", "Maybe tomorrow!") },
        { id: "l_where", s: t("¿Dónde | está?", "Where | is-it?", "Where is it?") },
        { id: "l_time", s: t("¿A | qué | hora?", "At | what | time?", "What time?") },
      ],
    },
    end: {
      lt: "Say how your day went",
      items: [
        { id: "d_great", s: t("¡Me | fue | muy | bien!", "(For) me | it-went | very | well!", "It went really well!", { spain: t("¡Me | ha ido | muy | bien!", "(For) me | it's gone | very | well!", "It went really well!") }) },
        { id: "d_tiring", s: t("Pesado, | ¡pero | me encanta!", "Tiring, | but | I love it!", "Tiring, but I love it here!") },
        { id: "d_nice", s: t("¡Todos | son | muy | amables!", "Everyone | are | very | nice!", "Everyone is so nice!") },
        { id: "d_lot", s: t("¡Muchos | nombres | nuevos!", "Many | names | new!", "A lot of new names!") },
        { id: "see_tomorrow", s: t("¡Nos vemos | mañana!", "See you | tomorrow!", "See you tomorrow!") },
        { id: "thanks_all", s: t("¡Gracias | por | todo!", "Thanks | for | everything!", "Thanks for everything!") },
      ],
    },
  },

  tips: {
    almuerzo: { key: "almuerzo", lt: "Understood! In Mexico lunch is usually “la comida”, around two; “el almuerzo” can mean a late breakfast.", better: "¿A qué hora es la comida?" },
  },

  merges: {
    // Spain's twins (12 Nov 2026)
    "tarjeta de acceso": { reason: "lexical_expression", split: "tarjeta → card + de → of + acceso → access: an office's ID badge.", minimal: "Three words." },
    "he dado": { reason: "grammatical_fusion", split: "he → have + dado (participle): Spain's present perfect for today; one English verb phrase.", minimal: "Auxiliary and participle." },
    "se ha estropeado": { reason: "grammatical_fusion", split: "se → itself + ha → has + estropeado → broken: the reflexive present perfect = it's broken down.", minimal: "Pronoun, auxiliary and participle." },
    "se ha atascado": { reason: "grammatical_fusion", split: "se → itself + ha → has + atascado → jammed: the reflexive present perfect = it's gotten stuck.", minimal: "Pronoun, auxiliary and participle." },
    "haces clic": { reason: "lexical_expression", split: "haces → you do + clic → click: hacer clic = to click.", minimal: "Two words." },
    "he mandado": { reason: "grammatical_fusion", split: "he → have + mandado (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "menú del día": { reason: "lexical_expression", split: "menú → menu + del → of the + día → day names the set lunch.", minimal: "Three words." },
    "ha ido": { reason: "grammatical_fusion", split: "ha → has + ido → gone: (te) ha ido bien = it's gone well (for you), Spain's perfect for today.", minimal: "Auxiliary and participle." },
    "ya verás": { reason: "lexical_expression", split: "ya → already + verás → you will see: = you'll see.", minimal: "Two words." },
    "hasta mañana": { reason: "lexical_expression", split: "hasta → until + mañana → tomorrow = see you tomorrow.", minimal: "Two words." },
    "me he traído": { reason: "grammatical_fusion", split: "me → (for) myself + he → have + traído → brought: the present perfect = I've brought.", minimal: "Pronoun, auxiliary and participle." },
    "línea clara": { reason: "lexical_expression", split: "línea → line + clara → clear; the company's name.", minimal: "Two words." },
    "me siento": { reason: "grammatical_fusion", split: "me → myself + siento → I seat; sentarse = sit.", minimal: "Two words." },
    "por aquí": { reason: "lexical_expression", split: "por → through + aquí → here; = this way.", minimal: "Two words." },
    "te guste": { reason: "grammatical_fusion", split: "te → to you + guste → it pleases; = you like it.", minimal: "Two words." },
    "sala de juntas": { reason: "lexical_expression", split: "sala → room + de → of + juntas → meetings; = meeting room.", minimal: "Three words." },
    "sala de reuniones": { reason: "lexical_expression", split: "sala → room + de → of + reuniones → meetings; = meeting room.", minimal: "Three words." },
    "hasta ahora": { reason: "lexical_expression", split: "hasta → until + ahora → now; = so far.", minimal: "Two words." },
    "recursos humanos": { reason: "lexical_expression", split: "recursos → resources + humanos → human; the department = HR.", minimal: "Two words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = we need to, you have to.", minimal: "Two words." },
    "le das clic": { reason: "lexical_expression", split: "le → (to) it + das → you give + clic → click; = you click.", minimal: "Three words." },
    "cocina económica": { reason: "lexical_expression", split: "cocina → kitchen + económica → cheap; = a small family diner.", minimal: "Two words." },
    "no hay prisa": { reason: "lexical_expression", split: "no hay → there isn't + prisa → hurry; = no rush.", minimal: "Three words." },
    "chiles poblanos": { reason: "lexical_expression", split: "chiles → peppers + poblanos → from Puebla; the pepper = poblano peppers.", minimal: "Two words." },
    "chiles rellenos": { reason: "lexical_expression", split: "chiles → peppers + rellenos → stuffed; the dish = stuffed peppers.", minimal: "Two words." },
    "nos vamos": { reason: "grammatical_fusion", split: "nos → ourselves + vamos → we go; irse = leave.", minimal: "Two words." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "comida corrida": { reason: "lexical_expression", split: "comida → meal + corrida → run is false; = the set lunch.", minimal: "Two words." },
    "agua fresca": { reason: "lexical_expression", split: "agua → water + fresca → fresh is false; = a fruit drink.", minimal: "Two words." },
    "te acostumbras": { reason: "grammatical_fusion", split: "te → yourself + acostumbras → you accustom; acostumbrarse = get used to it.", minimal: "Two words." },
    "para eso estamos": { reason: "lexical_expression", split: "para → for + eso → that + estamos → we are; = that's what we're here for.", minimal: "Three words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now; = for now.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  steps: [
    { id: "hello", done: (c) => !!c.s.introduced,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "new" ? "greet_new" : "greet_help"); }
        else { c.s.lastQ = "new"; c.say("new_again"); }
      },
      expects: ["first_day", "intro_name", "intro_ctx", "nice_meet", "not_new"],
      suggest: [S_INTRO],
      yes: (c) => {
        if (c.s.lastQ === "new") { introduced(c); return; }
        c.s.lastQ = "new"; c.say("new_again"); c.hold();
      },
      no: (c) => {
        // "No" to "¿Eres nuevo aquí?" is "not new"; to "¿Te puedo ayudar?" it's "no, thanks": she asks if they're new
        if (c.s.lastQ === "new") { c.s.lastQ = "help"; c.say("how_help"); c.hold(); return; }
        c.s.lastQ = "new"; c.say("new_again"); c.hold();
      } },
    { id: "name", when: (c) => !!c.s.introduced, done: (c) => !!c.s.named || (c.s.nameAsks || 0) >= 2,
      ask: (c) => { c.s.nameAsks = (c.s.nameAsks || 0) + 1; c.say("ask_name"); },
      expects: ["intro_name", "intro_ctx", "bare_name_ctx"], suggest: [{ lt: "Say your name", hint: "name" }] },
    { id: "desk", when: (c) => !!c.s.introduced, done: (c) => !!c.s.deskDone,
      ask: (c) => {
        if (c.s.deskShown) { c.s.deskDone = true; c.ask("tour"); return; }
        showDesk(c);
        if (c.s.badgeLate) { c.twist("badge_late"); c.say("badge_late"); c.s.badgeLateSaid = true; c.s.badgeDone = true; }
        else if (c.chance(0.4)) c.say("dont_worry");
      },
      expects: ["desk_ok", "desk_bad", "q_password", "q_login", "q_badge", "q_wifi", "q_desk", "q_it", "show_me"],
      suggest: [S_DESK, S_WHERE],
      yes: (c) => { c.s.deskDone = true; }, no: (c) => { c.s.deskDone = true; } },
    { id: "tour", when: (c) => !!c.s.deskDone, done: (c) => !!c.s.tourDone || (c.s.tourAsks || 0) >= 6,
      ask: (c) => {
        c.s.tourAsks = (c.s.tourAsks || 0) + 1;
        if (!c.s.toured) {
          c.s.toured = true;
          // what the learner already asked at the desk isn't told again ("¿Dónde está el baño?")
          if (!c.s.asked.meeting) c.say("tour_rooms");
          if (!c.s.asked.restroom) c.say("tour_restrooms");
          c.say("ask_anything");
        } else c.say("what_else");
        // the model questions move on to ones the learner hasn't asked yet
        const [set, , label] = WHERE_SETS.find(([, keys]) => keys.every((k) => !c.s.asked[k])) ?? WHERE_SETS.find(([, keys]) => keys.some((k) => !c.s.asked[k])) ?? WHERE_SETS[2];
        const sg: Suggestion[] = [{ lt: label, hint: set }, S_HOW, S_NO_MORE];
        c.expect({ id: "tour", optional: true, expects: [...QUESTION_INTENTS, "no_more", "more_q"], suggest: sg, hints: [set, "how", "no_more"] });
      },
      expects: [...QUESTION_INTENTS, "no_more", "more_q"],
      suggest: [S_WHERE, S_HOW, S_NO_MORE],
      yes: (c) => {
        // "Sí" to "¿Alguna pregunta?" is "yes, I have one" (as the English: yes → "Sure! What's up?"); "Perfecto, gracias" moves on
        const h = heard(c);
        if (/^\s*(si|claro|pues si|de hecho)\s*[.!]*\s*$/.test(h) || (/^\s*(si|claro|una|otra|tengo|de hecho)\b/.test(h) && /\b(pregunta|duda|cosa|de hecho)\b/.test(h))) {
          if (!c.s.sureSaid) { c.s.sureSaid = true; c.say("sure_what"); c.hold(); return; } // a second bare "Sí" moves on
        }
        c.s.tourDone = true;
      },
      no: (c) => { c.s.tourDone = true; } },
    { id: "coffee", when: (c) => !!c.s.tourDone, done: (c) => !!c.s.coffeeKnown,
      ask: (c) => { c.say("coffee_offer"); coffeeWhere(c); },
      expects: ["q_how", "show_me", "q_mug", "coffee_want", "oops", "tea_ok", "coffee_later"], suggest: [{ lt: "Say thanks, or ask how it works", hint: "coffee" }] },
    { id: "task", when: (c) => !!c.s.tourDone && !!c.s.coffeeKnown, done: (c) => !!c.s.taskDone || (c.s.taskAsks || 0) >= 3,
      ask: (c) => {
        c.s.taskAsks = (c.s.taskAsks || 0) + 1;
        c.s.topic = "system";
        if (c.s.taskAsks === 1) { c.say("task_intro"); c.say("task_file"); }
        else c.say("task_again");
      },
      expects: ["show_me", "send_file", "task_ok", "know_system", "know_ctx", "q_how", "task_cant", "task_later", "task_when"],
      suggest: [S_TASK],
      yes: (c) => { taskOk(c); }, no: (c) => { c.say("show_system"); c.s.shown = true; c.hold(); } },
    { id: "lunch", when: (c) => !!c.s.taskDone || (c.s.taskAsks || 0) >= 3, done: (c) => c.s.lunch !== undefined || (c.s.lunchAsks || 0) >= 3,
      ask: (c) => {
        c.s.lunchAsks = (c.s.lunchAsks || 0) + 1;
        if (c.s.lunchAsks === 1) c.s.lastDish = "cocina"; // "¿Qué es eso?" now asks about the cocina económica
        c.say(c.s.lunchAsks === 1 ? "lunch_invite" : "lunch_reask");
      },
      expects: ["lunch_yes", "lunch_no", "lunch_q_ctx", "fancy_q"],
      suggest: [S_LUNCH],
      yes: (c) => { lunchYes(c); }, no: (c) => { lunchNo(c); } },
    { id: "day", when: (c) => c.s.lunch !== undefined || (c.s.lunchAsks || 0) >= 3, done: (c) => !!c.s.dayDone || (c.s.dayAsks || 0) >= 2,
      ask: (c) => { c.s.dayAsks = (c.s.dayAsks || 0) + 1; c.say(c.s.dayAsks === 1 ? "day_ask" : "day_reask"); },
      expects: ["day_good", "day_tired", "day_ctx", "thanks_all"],
      suggest: [S_DAY],
      yes: (c) => { dayGood(c); }, no: (c) => { dayTired(c); } },
  ],

  init: (c) => {
    c.s.greetKind = c.chance(0.55) ? "new" : "help";
    c.s.asked = {};
    c.s.qCount = 0;
    // she urges once after a plain "no" to lunch (sometimes)
    c.s.insist = c.chance(0.5);
    c.s.insisted = false;
    // Twists (returning visits only)
    c.s.badgeLate = c.visits >= 1 && c.chance(0.25);
    c.s.coffeeBroken = c.visits >= 1 && c.chance(0.35);
    c.s.mugTwist = c.visits >= 1 && c.chance(0.4);
    c.s.printerJam = c.visits >= 1 && c.chance(0.35);
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- hello ---
    // "Soy nuevo, hoy es mi primer día." (two pieces): one reaction
    first_day(c) { const first = once(c, "first_day"); if (!c.s.introduced) introduced(c); else if (first) c.say("ack"); },
    not_new(c) { if (c.s.introduced) { c.say("ack"); return; } c.s.lastQ = "help"; c.say("how_help"); c.hold(); },
    intro_name(c, slots, seg) {
      named(c, slots.name);
      // "Soy Ryan, no es mi primer día": not_new answers
      if (!NOT_NEW.test(heard(c)) && !c.s.introduced && (c.s.lastQ === "new" || seg.tags.includes("first"))) introduced(c);
      herName(c, seg); // "Me llamo Ryan, ¿y tú?"
    },
    intro_ctx(c, slots, seg) {
      named(c, slots.name);
      // an answer to "¿Eres nuevo aquí?" with a name counts as yes; otherwise the step asks it
      if (!NOT_NEW.test(heard(c)) && !c.s.introduced && (seg.tags.includes("first") || c.s.lastQ === "new")) introduced(c);
      herName(c, seg); // "Soy Ryan, ¿y tú?"
    },
    bare_name_ctx(c, slots, seg) { named(c, slots.name); herName(c, seg); }, // "Ryan, ¿y tú?"
    nice_meet(c) {
      if (!c.s.introduced) { introduced(c); return; }
      if (once(c, "nice") && !c.s.niceSaid) { c.s.niceSaid = true; c.say("nice_too"); }
    },
    her_name(c) { herName(c, { tags: ["back"] }); },

    // --- desk ---
    desk_ok(c) { c.s.deskDone = true; c.say("glad_like"); },
    desk_bad(c) { c.s.deskDone = true; if (once(c, "desk_bad")) c.say("desk_bad_reply"); },
    q_password(c, _slots, seg) {
      deskFirst(c); c.s.topic = "laptop";
      if (seg.tags.includes("forgot")) { c.say("a_it"); return; }
      if (/\bcambi/.test(heard(c))) c.say("a_change"); else c.say("a_password");
    },
    q_login(c) { deskFirst(c); c.s.topic = "laptop"; c.say("a_login"); },
    q_badge(c) {
      deskFirst(c);
      if (c.s.badgeLate) { c.say(c.s.badgeLateSaid ? "badge_soon" : "badge_late"); c.s.badgeLateSaid = true; return; }
      if (c.s.badgeDone) { c.say("a_badge_have"); return; }
      c.s.badgeDone = true; c.s.topic = "badge";
      c.say("a_badge"); c.event("give", { item: "badge" });
    },
    q_wifi(c) { deskFirst(c); c.say("a_wifi"); },
    q_desk(c, _slots, seg) { deskFirst(c); c.say(seg.tags.includes("where") ? "a_desk_where" : "a_desk"); },
    q_it(c) { deskFirst(c); c.say("a_it"); },

    // --- where things are ---
    q_coffee(c) { question(c, "coffee"); coffeeWhere(c); },
    q_kitchen(c, _slots, seg) { question(c, "kitchen"); c.say(seg.tags.includes("water") ? "a_water" : "a_kitchen"); },
    q_fridge(c, _slots, seg) { question(c, "fridge"); c.s.topic = "fridge"; c.say(seg.tags.includes("micro") ? "a_micro" : "a_fridge"); },
    q_printer(c, _slots, seg) {
      question(c, "printer"); c.s.topic = "printer";
      if (seg.tags.includes("fix")) { c.say("printer_fix"); return; }
      c.say(seg.tags.includes("how") ? "a_print_how" : "a_printer");
      if (c.s.printerJam && !c.s.jamSaid) { c.s.jamSaid = true; c.twist("printer_jam"); c.say("printer_jam"); c.say("printer_fix"); }
    },
    q_restroom(c) { question(c, "restroom"); c.say("a_restroom"); },
    q_meeting(c) { question(c, "meeting"); c.say("a_meeting"); },
    q_dress(c) { question(c, "dress"); c.say("a_dress"); },
    q_lunch_time(c, _slots, seg) { question(c, "lunch_time"); c.say(seg.tags.includes("long") ? "a_lunch_long" : "a_lunch_time"); },
    q_home_time(c, _slots, seg) { question(c, "home_time"); c.say(seg.tags.includes("start") ? "a_start_time" : "a_home_time"); },
    q_mug(c, _slots, seg) {
      question(c, "mug"); c.s.topic = "mug";
      if (seg.tags.includes("where")) { c.say("a_mug_where"); return; }
      if (seg.tags.includes("own")) { c.say("a_mug_own"); return; }
      if (c.s.mugTwist && !c.s.mugSaid) { mugTwist(c); return; }
      c.say("a_mug");
    },
    q_who(c, _slots, seg) { question(c, "who"); c.say(seg.tags.includes("pablo") ? "a_pablo" : "a_who"); },
    q_parking(c, _slots, seg) { question(c, "parking"); c.say(seg.tags.includes("free") ? "a_parking_free" : "a_parking"); },
    q_help(c) { question(c, "help"); c.say("a_help"); },
    q_how(c) { howItWorks(c); },
    show_me(c) { howItWorks(c); },
    q_other_ctx(c) {
      question(c, "other");
      const h = heard(c);
      c.say(/^\s*donde\b/.test(h) ? "a_unknown_where" : /^\s*(hay|tienen|tenemos)\b/.test(h) ? "a_unknown_have" : "a_unknown");
    },
    no_more(c) { if (c.step === "tour") c.s.tourDone = true; else ack(c); },
    already_know(c) { ack(c); },
    more_q(c) { c.say("sure_what"); c.hold(); },

    // --- first task ---
    send_file(c, _slots, seg) {
      if (!c.s.taskAsks) { c.say("which_file"); return; }
      if (c.s.sent) { if (!turn(c).sent) c.say("ack"); return; } // "Claro. ¿Dónde está el archivo?" — just offered
      if (seg.tags.includes("which")) c.say("a_which_file");
      c.s.sent = true;
      c.say("file_sent");
      if (c.s.shown || c.step === "task") c.s.taskDone = true;
    },
    task_ok(c) {
      if (TASK_NOT.test(heard(c)) && c.s.taskAsks) { taskCant(c); return; } // "No sé si puedo": never "lo hago"
      if (c.step === "task" || c.s.taskAsks) taskOk(c); else ack(c);
    },
    // "Lo hago después", "Ahorita no puedo": no rush, she emails the file
    task_later(c) {
      if (!c.s.taskAsks) { ack(c); return; }
      if (!once(c, "task")) return;
      c.say("task_later_reply"); c.s.sent = true; c.s.taskDone = true;
    },
    // "¿Para cuándo?", "¿Es urgente?": the same answer ("¡No hay prisa! Te lo mando por correo para cuando puedas"),
    // unless the file has gone already
    task_when(c) {
      if (!c.s.taskAsks || c.s.sent) { ack(c); return; }
      if (!once(c, "task")) return;
      c.say("task_later_reply"); c.s.sent = true; c.s.taskDone = true;
    },
    // "Ya conozco este sistema" at the task; "No, ya sé cómo funciona" at the cafetera
    know_system(c) { knowSystem(c); },
    know_ctx(c) { knowSystem(c); },
    // "No puedo hacerlo" / "No sé cómo": María shows the system (never taken as "lo hago")
    task_cant(c) {
      if (!c.s.taskAsks) { ack(c); return; }
      taskCant(c);
    },

    // --- lunch ---
    lunch_yes(c) { if (c.s.lunchAsks) lunchYes(c); else ack(c); },
    lunch_no(c) { if (c.s.lunchAsks) lunchNo(c); else ack(c); },
    lunch_q_ctx(c, _slots, seg) {
      const tg = seg.tags;
      // "¿Qué es eso?": the last thing she named (the chiles, the comida corrida, or the cocina económica itself)
      const what = c.s.lastDish === "chiles" ? "a_chiles" : c.s.lastDish === "corrida" ? "a_food" : "a_cocina";
      const line = tg.includes("far") ? "a_place_far" : tg.includes("near") ? "a_place_near" : tg.includes("where") ? "a_place_where"
        : tg.includes("dear") ? "a_price_dear" : tg.includes("cheap") ? "a_price_cheap" : tg.includes("price") ? "a_price"
        : tg.includes("card") ? "a_card" : tg.includes("veg") ? "a_veg" : tg.includes("spicy") ? "a_spicy" : tg.includes("back") ? "a_lunch_long"
        : tg.includes("time") ? "a_lunch_at" : tg.includes("who") ? "a_lunch_who" : tg.includes("cocina") ? "a_cocina"
        : tg.includes("what") ? what : tg.includes("chiles") ? "a_chiles" : "a_food";
      if (once(c, "q_" + line)) c.say(line);
      c.s.lastDish = /^a_price/.test(line) ? "corrida" : line === "a_chiles" ? "chiles" : line === "a_food" ? "food" : c.s.lastDish;
      if (line === "a_lunch_at") turn(c).timeSaid = true;
      if (c.step !== "lunch" || c.s.lunch !== undefined) return;
      // "Sí, ¿a qué hora?": the yes is the answer
      const h = heard(c);
      if (/^\s*(si|claro|va|sale|vale|orale|bueno|ok)\b/.test(h)) { lunchYes(c); return; }
      // a question doesn't use up her asking: after all the turn's pieces the step asks "Entonces, ¿vienes?"
      c.s.lunchAsks = 1;
    },
    // only inside the "¿No te animas?" question, which handles it; nowhere else
    insist_no_ctx(c) { if (c.s.insisted && c.s.lunch === undefined) finalLunch(c, false); },
    fancy_q(c) { if (c.step === "lunch" || c.s.lunchAsks) lunchYes(c); else ack(c); },

    // --- end of the day ---
    day_good(c) { if (c.step === "day") dayGood(c); else if (once(c, "good")) c.say("ack"); },
    day_tired(c) { if (c.step === "day") dayTired(c); else if (once(c, "tired")) c.say("ack"); },
    day_ctx(c, _slots, seg) {
      if (c.step !== "day") { ack(c); return; }
      if (seg.tags.includes("back") && !c.s.dayDone && once(c, "back")) c.say("me_too"); // "Bien, ¿y a ti?"
      if (/pesad|larg|cansad|intens/.test(heard(c))) dayTired(c); else dayGood(c);
    },
    see_you(c) { byeBack(c); },
    thanks_all(c) {
      if (c.step === "day" && !c.s.dayDone) { dayGood(c); return; }
      c.say("welcome_reply");
    },

    // "¡Adiós!" before the end: María's own goodbye, one a turn ("Adiós, que descanses" is two pieces)
    g_bye(c) { byeBack(c); c.hold(); },

    // thanks between coworkers: "¡De nada!" / "¡Para eso estamos!" (the shared line has "¡A la orden!", a shop's)
    g_thanks(c) { if (once(c, "thanks")) c.say("welcome_reply"); },

    // --- side moves ---
    oops(c) { c.say("no_worries"); },
    coffee_want(c) { if (!c.s.coffeeKnown) { coffeeWhere(c); return; } howItWorks(c); },
    tea_ok(c, _slots, seg) {
      if (!c.s.coffeeKnown) { coffeeWhere(c); return; }
      if (seg.tags.includes("q")) { if (once(c, "tea")) c.say(c.s.brokenSaid ? "a_tea_short" : "a_tea"); return; } // "¿Hay té?"
      if (!turn(c).answered && once(c, "ack")) c.say(c.s.brokenSaid ? "tea_reply" : "ack");
    },
    // "No tomo café": never "here's the coffee machine" outside the coffee moment; "No, gracias, no tomo café" to her
    // offer to show the cafetera gets one reply (her "¡Sin problema!…"), not an "¡Claro!" after it
    coffee_later(c, _slots, seg) {
      if (!c.s.coffeeKnown && c.step === "coffee") { coffeeWhere(c); return; }
      if (turn(c).answered) return;
      // "Ahorita no", "Luego lo intento" to her offer to show the cafetera: the same reply as to a "No, gracias"
      if (c.s.showOffered && c.step === "coffee" && !seg.tags.includes("shrug")) { c.s.showOffered = false; turn(c).answered = true; c.say("fine_then"); return; }
      if (once(c, "ack")) c.say(seg.tags.includes("shrug") ? "shrug_reply" : "ack"); // "Qué lástima" (the broken cafetera)
    },
  },

  finish: (c) => {
    c.complete();
    c.say("see_tomorrow");
    c.expect({ id: "closing", hints: ["bye"], suggest: [{ lt: "Say goodbye", hint: "bye" }],
      // one goodbye however many pieces ("¡Gracias por todo! ¡Nos vemos mañana!", "Adiós, que descanses")
      on: {
        see_you: (cc) => { byeBack(cc); },
        g_bye: (cc) => { byeBack(cc); },
        g_thanks: (cc) => { if (once(cc, "thanks")) cc.say("welcome_reply"); byeBack(cc); },
        thanks_all: (cc) => { if (once(cc, "thanks")) cc.say("welcome_reply"); byeBack(cc); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hello
    { say: "¡Hola! Soy Ryan. Es mi primer día.", intent: "intro_ctx", step: "hello" },
    { say: "Sí, soy nuevo.", intent: "first_day" },
    { say: "Hoy es mi primer día.", intent: "first_day" },
    { say: "Soy la nueva diseñadora", intent: "first_day" },
    { say: "Me llamo Ryan.", intent: "intro_name" },
    { say: "Ryan", intent: "bare_name_ctx", step: "name" },
    { say: "Ryan", intent: "none" },
    { say: "¡Mucho gusto!", intent: "nice_meet" },
    { say: "No, no soy nuevo", intent: "not_new", step: "hello", not: ["first_day"] },
    { say: "No es mi primer día", intent: "not_new", not: ["first_day"] },
    // desk
    { say: "¡Gracias! ¡Qué bonito!", intent: "desk_ok" },
    { say: "¿Cómo entro al sistema?", intent: "q_login" },
    { say: "¿Tengo que cambiar la contraseña?", intent: "q_password" },
    { say: "¿Me dan un gafete?", intent: "q_badge" },
    { say: "¿Dónde está mi credencial?", intent: "q_badge" },
    { say: "¿Dónde me siento?", intent: "q_desk", step: "desk" },
    { say: "¿Qué hago si no funciona la computadora?", intent: "q_it" },
    { say: "No me gusta el escritorio", intent: "desk_bad", not: ["desk_ok"] },
    { say: "No está muy cómodo", intent: "desk_bad", not: ["desk_ok"] },
    // where things are
    { say: "¿Dónde está la cafetera?", intent: "q_coffee" },
    { say: "¿Cómo funciona?", intent: "q_how" },
    { say: "¿Me enseñas cómo funciona?", intent: "show_me" },
    { say: "¿Dónde está la impresora?", intent: "q_printer" },
    { say: "¿Dónde están los baños?", intent: "q_restroom" },
    { say: "¿Dónde pongo mi comida?", intent: "q_fridge" },
    { say: "¿Hay código de vestimenta?", intent: "q_dress" },
    { say: "¿Puedo venir en jeans?", intent: "q_dress" },
    { say: "¿A qué hora comen?", intent: "q_lunch_time" },
    { say: "¿A qué hora salimos?", intent: "q_home_time", step: "tour" },
    { say: "¿Puedo usar esta taza?", intent: "q_mug" },
    { say: "¿Quién es ella?", intent: "q_who" },
    { say: "¿Dónde está la sala de juntas?", intent: "q_meeting" },
    { say: "No, es todo por ahora.", intent: "no_more", step: "tour" },
    { say: "¿Hay gimnasio?", intent: "q_other_ctx", step: "tour" },
    { say: "Sí, tengo otra pregunta", intent: "more_q", step: "tour" },
    { say: "No quiero café", intent: "coffee_later", not: ["q_coffee", "coffee_want"] },
    { say: "No necesito la impresora", intent: "none", not: ["q_printer"] },
    // first task
    { say: "¿Me mandas el archivo?", intent: "send_file" },
    { say: "Claro, yo lo hago.", intent: "task_ok", step: "task" },
    { say: "No sé cómo hacerlo", intent: "task_cant", step: "task", not: ["task_ok"] },
    { say: "Ya conozco este sistema", intent: "know_system", step: "task" },
    { say: "No conozco este sistema", intent: "task_cant", step: "task", not: ["know_system"] },
    // lunch
    { say: "¡Me encantaría!", intent: "lunch_yes", step: "lunch" },
    { say: "¡Suena muy bien!", intent: "lunch_yes", step: "lunch" },
    { say: "Gracias, pero traje mi comida.", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Me encantaría, pero tengo mucho trabajo", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "No tengo hambre", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "¡Tal vez mañana!", intent: "lunch_no", step: "lunch" },
    { say: "¿Está lejos?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¿Cuánto cuesta?", intent: "lunch_q_ctx", step: "lunch" },
    // end of the day
    { say: "¡Me fue muy bien!", intent: "day_good", step: "day" },
    { say: "Pesado, ¡pero me encanta!", intent: "day_tired", step: "day" },
    { say: "Estoy un poco cansada", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "No fue fácil", intent: "day_tired", step: "day", not: ["day_good", "day_ctx"] },
    { say: "No estuvo tan mal", intent: "day_ctx", step: "day", not: ["day_tired"] },
    { say: "¡Todos son muy amables!", intent: "day_good" },
    { say: "¡Nos vemos mañana!", intent: "see_you" },
    { say: "¡Gracias por todo!", intent: "thanks_all" },
    { say: "¡Ups, perdón!", intent: "oops" },
    // tú or usted: both understood (María says tú)
    { say: "¿Me lo puede enviar por correo?", intent: "send_file" },
    // Spain forms are right answers too: ordenador, aseos, vosotros, vale, apetecer, coger
    { say: "¿Qué hago si no funciona el ordenador?", intent: "q_it" },
    { say: "¿Dónde están los aseos?", intent: "q_restroom" },
    { say: "¿A qué hora coméis?", intent: "q_lunch_time" },
    { say: "¡Vale, vamos!", intent: "lunch_yes", step: "lunch" },
    { say: "¿Puedo coger una taza?", intent: "q_mug" },
    // meaning must not flip
    { say: "No, solo estoy visitando", intent: "not_new", step: "hello", not: ["first_day", "intro_ctx"] },
    { say: "Igual", intent: "nice_meet", not: ["bare_name_ctx"] },
    { say: "Ya sé dónde está el baño", intent: "already_know", step: "tour", not: ["q_restroom"] },
    { say: "No sé dónde está el baño", intent: "q_restroom", step: "tour", not: ["g_dontknow"] },
    { say: "No, ya sé cómo funciona", intent: "know_system", not: ["q_how", "show_me"] },
    { say: "No necesito ayuda", intent: "task_ok", step: "task", not: ["show_me"] },
    { say: "Todavía no conozco el sistema", intent: "task_cant", step: "task", not: ["know_system"] },
    { say: "No me mandes el archivo", intent: "none", not: ["send_file"] },
    { say: "Hoy no puedo, mañana sí", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "No me apetece", intent: "lunch_no", step: "lunch", not: ["lunch_yes", "fancy_q"] },
    { say: "No tengo dinero", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Nada bien", intent: "day_tired", step: "day", not: ["day_good", "day_ctx"] },
    { say: "No fue genial", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "No estoy cansado", intent: "day_good", step: "day", not: ["day_tired"] },
    { say: "Bien, pero estoy cansada", intent: "day_tired", step: "day" },
    { say: "La laptop no prende", intent: "q_it", not: ["desk_ok", "q_login"] },
    // more ways to say it
    { say: "Hola, soy Ryan, el nuevo contador", intent: "intro_ctx", step: "hello" },
    { say: "¿Dónde está el refri?", intent: "q_fridge" },
    { say: "¿Hay microondas?", intent: "q_fridge" },
    { say: "¿Dónde puedo tomar agua?", intent: "q_kitchen" },
    { say: "¿A qué hora entramos?", intent: "q_home_time", step: "tour" },
    { say: "¿Cuánto tiempo tenemos para comer?", intent: "q_lunch_time" },
    { say: "¿A qué hora es el almuerzo?", intent: "q_lunch_time" },
    { say: "¿Me das mi gafete?", intent: "q_badge" },
    { say: "Bueno, sí me animo", intent: "lunch_yes", step: "lunch" },
    { say: "¿Qué hay de comer?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "Todos fueron muy amables", intent: "day_good", step: "day" },
    { say: "Que descanses", intent: "see_you" },
    { say: "¿Dónde aparco el coche?", intent: "q_parking" },
    // review: the blind set's traps and the probes' fixes
    { say: "No, no soy nuevo, nomás vengo a una reunión", intent: "not_new", step: "hello", not: ["first_day"] },
    { say: "No me gusta mucho esta silla", intent: "desk_bad", step: "desk", not: ["desk_ok"] },
    { say: "No necesito el baño, gracias", intent: "none", step: "tour", not: ["q_restroom"] },
    { say: "No tomo café, ¿hay té?", intent: "tea_ok", step: "coffee", not: ["coffee_want"] },
    { say: "¿Hay té?", intent: "tea_ok", step: "coffee" },
    { say: "Ahorita no, gracias, más tarde", intent: "coffee_later", step: "coffee", not: ["coffee_want"] },
    { say: "No sé usar el sistema", intent: "task_cant", step: "task", not: ["know_system", "task_ok"] },
    { say: "No sé si puedo", intent: "task_cant", step: "task", not: ["task_ok"] },
    { say: "¿Y si no puedo?", intent: "task_cant", step: "task", not: ["task_ok"] },
    { say: "Lo hago después", intent: "task_later", step: "task", not: ["task_ok"] },
    { say: "Olvidé mi contraseña", intent: "q_password", step: "desk" },
    { say: "No tengo contraseña", intent: "q_password", step: "desk" },
    { say: "¿Cómo se saca el papel?", intent: "q_printer", step: "tour" },
    { say: "No puedo, tengo una junta a las dos", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Gracias, pero hoy traje mi comida", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Sí, pero no hoy", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "No gracias, ya tengo planes", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "Ya comí", intent: "lunch_no", step: "lunch", not: ["lunch_yes"] },
    { say: "¿Qué son los chiles rellenos?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¡En serio! ¡Me encantan!", intent: "none", step: "lunch", not: ["lunch_no"] },
    { say: "No estuvo nada mal", intent: "day_ctx", step: "day", not: ["day_tired"] },
    { say: "Bastante bien, aunque estoy cansado", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "Bien, gracias, ¿y a ti?", intent: "day_ctx", step: "day", not: ["g_howareyou_answer"] },
    // audit (5 Nov 2026): questions that had no answer, whole sentences, names asked back
    { say: "¿Quiénes van?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¿Vamos todos juntos?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¿Qué es una cocina económica?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¿A qué hora regresamos?", intent: "lunch_q_ctx", step: "lunch" },
    { say: "¿Para cuándo lo necesitas?", intent: "task_when", step: "task", not: ["task_ok"] },
    { say: "¿Es urgente?", intent: "task_when", step: "task" },
    { say: "¿Quién es Pablo?", intent: "q_who", step: "tour" },
    { say: "Mi primer día fue muy bueno", intent: "day_good", step: "day" },
    { say: "Fue un día muy bueno", intent: "day_good", step: "day" },
    { say: "Fue un día muy largo", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "Mi primer día no fue muy bueno", intent: "day_tired", step: "day", not: ["day_good"] },
    { say: "Soy Ryan, ¿y tú?", intent: "intro_ctx", step: "hello" },
    { say: "Ryan, ¿y tú?", intent: "bare_name_ctx", step: "name" },
    // not understood
    { say: "El elefante morado come teclados", intent: "none" },
    { say: "Mi tía vive en Guadalajara", intent: "none" },
    { say: "teclado banana martes", intent: "none" },
  ],

  sims: [
    { name: "classic first day", turns: ["¡Hola! Soy Ryan. Es mi primer día.", "¡Mucho gusto!", "¡Gracias! ¡Qué bonito!", "¿Dónde está la cafetera?",
      "¿Cómo funciona?", "¿Dónde está la impresora?", "No, es todo por ahora.", "¿Me enseñas cómo funciona?", "¿Me mandas el archivo?",
      "¡Me encantaría!", "Pesado, ¡pero me encanta!", "¡Nos vemos mañana!"], expect: { complete: true, state: { lunch: true } }, auto: AUTO, setup: (s) => { NO_TWISTS(s); } },
    { name: "questions first, decline lunch", setup: (s) => { NO_TWISTS(s); s.insist = false; },
      turns: ["¡Hola!", "Sí, hoy es mi primer día.", "Me llamo Ryan.", "¿Cómo entro al sistema?", "¿Hay código de vestimenta?",
        "¿Dónde están los baños?", "¿A qué hora es la comida?", "¿Puedo usar esta taza?", "Nada más, gracias.", "Claro, yo lo hago.",
        "¿Dónde está?", "Gracias, pero traje mi comida.", "¡Me fue muy bien! Todos son muy amables.", "¡Gracias por todo!"], expect: { complete: true, state: { lunch: false } }, auto: AUTO },
    // Short generic answers can't show which question they answer: the opening ("¿Eres nuevo aquí?"), the offer to show
    // the cafetera and the working machine are pinned, so each answer meets the same question on every seed.
    { name: "short answers", setup: (s) => { NO_TWISTS(s); s.greetKind = "new"; s.showCoffee = true; },
      turns: ["Sí.", "Ryan.", "¡Gracias!", "¡Gracias!", "No.", "Sí.", "Ok.", "Sí.", "Bien.", "¡Adiós!"], expect: { complete: true, state: { lunch: true, dayDone: true } }, auto: AUTO },
    // questions about lunch and a change of mind: no, then "¿No te animas?", then yes
    { name: "lunch: questions, no, then a change of mind", setup: (s) => { NO_TWISTS(s); s.insist = true; },
      turns: ["Hola, soy el nuevo diseñador. Me llamo Ryan.", "¿Cuál es la contraseña del wifi?", "No, nada más.", "¿Puedo dejar mi lonche en el refri?",
        "Ya conozco este sistema.", "¿Está lejos?", "¿Cuánto cuesta?", "Hoy no, gracias.", "Bueno, sí me animo.", "Cansada, pero contenta.", "Que descanses."],
      expect: { complete: true, state: { lunch: true, insisted: true } }, auto: AUTO },
    // a refusal after the urging stays a refusal
    { name: "lunch: no twice", setup: (s) => { NO_TWISTS(s); s.insist = true; s.greetKind = "new"; s.showCoffee = false; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan.", "Perfecto, gracias.", "No tengo más preguntas.", "¡Genial, gracias!", "¿Me lo mandas por correo?", "No, gracias.", "No, de verdad, hoy no.",
        "Estuvo un poco pesado.", "¡Hasta mañana!"], expect: { complete: true, state: { lunch: false } }, auto: AUTO },
    // review: a thanks or a "yes" piece with a no in the same turn books no lunch; a yes with a question is a yes
    { name: "lunch: thanks, but no", setup: (s) => { NO_TWISTS(s); s.insist = false; s.greetKind = "new"; s.showCoffee = false; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan.", "Perfecto, gracias.", "No tengo más preguntas.", "¡Genial, gracias!", "No sé si puedo.", "Lo hago después.",
        "Gracias por invitarme, pero hoy traje mi comida.", "Bien, gracias, ¿y a ti?", "¡Hasta mañana!"], expect: { complete: true, state: { lunch: false, dayDone: true, taskDone: true } }, auto: AUTO },
    { name: "lunch: another day", setup: (s) => { NO_TWISTS(s); s.insist = true; s.greetKind = "new"; s.showCoffee = false; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan.", "Gracias.", "Sí", "¿Dónde está el baño?", "No, es todo.", "¡Genial, gracias!", "Claro, yo lo hago.",
        "Me gustaría ir otro día.", "No estuvo nada mal.", "Adiós."], expect: { complete: true, state: { lunch: false, sureSaid: true } }, auto: AUTO },
    { name: "lunch: a yes with a question", setup: (s) => { NO_TWISTS(s); s.insist = false; s.greetKind = "new"; s.showCoffee = true; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan.", "Gracias.", "No, es todo.", "Sí, ¿cómo funciona?", "¿Qué archivo?", "¿Está lejos? ¿Cuánto cuesta?", "Sí, ¿a qué hora?",
        "Bastante bien, aunque estoy cansado.", "¡Nos vemos mañana!"], expect: { complete: true, state: { lunch: true } }, auto: AUTO },
    // Twists, forced on every seed (they happen on returning visits)
    { name: "twist: the cafetera is broken", setup: (s) => { s.coffeeBroken = true; s.mugTwist = false; s.printerJam = false; s.badgeLate = false; s.insist = false; },
      turns: ["Hola, soy Ryan, es mi primer día.", "Mucho gusto.", "¿Dónde está la cafetera?", "Bueno, el té está bien.", "Eso es todo, gracias.", "Sí, puedo hacerlo.",
        "Tal vez mañana.", "Fue genial.", "Nos vemos mañana."], expect: { complete: true, state: { brokenSaid: true } }, auto: AUTO },
    { name: "twist: Pablo's mug", setup: (s) => { s.coffeeBroken = false; s.mugTwist = true; s.printerJam = false; s.badgeLate = false; s.showCoffee = false; },
      turns: ["Hola, soy Ryan, es mi primer día.", "Mucho gusto.", "¿Dónde está la cafetera?", "¿Puedo usar esta taza?", "¡Ay, no sabía!", "No, es todo.",
        "Sin problema, yo lo hago.", "¡Me encantaría!", "Fue un día largo.", "Adiós."], expect: { complete: true, state: { mugSaid: true } }, auto: AUTO },
    { name: "twist: the printer is jammed", setup: (s) => { s.coffeeBroken = false; s.mugTwist = false; s.printerJam = true; s.badgeLate = false; s.showCoffee = false; },
      turns: ["Hola, soy Ryan, es mi primer día.", "Mucho gusto.", "¿Dónde está la impresora?", "¿Cómo imprimo?", "Todo claro, gracias.", "¡Genial, gracias!", "¿Me mandas el archivo?",
        "¡Suena muy bien!", "¡Me fue muy bien!", "¡Nos vemos mañana!"], expect: { complete: true, state: { jamSaid: true } }, auto: AUTO },
    { name: "twist: the badge isn't ready", setup: (s) => { s.coffeeBroken = false; s.mugTwist = false; s.printerJam = false; s.badgeLate = true; s.showCoffee = false; },
      turns: ["Hola, soy Ryan, es mi primer día.", "Mucho gusto.", "¿Y cuándo me dan mi gafete?", "¿Dónde está la cocina?", "No, nada más.", "¡Genial, gracias!", "Claro, yo lo hago.",
        "¡Me encantaría!", "Muy bien.", "¡Nos vemos mañana!"], expect: { complete: true, state: { badgeLateSaid: true } }, auto: AUTO },
    // audit (5 Nov 2026): the hint's polite no ("Gracias, pero traje mi comida") is taken at once, never urged
    { name: "audit: a reason is never urged", setup: (s) => { NO_TWISTS(s); s.insist = true; s.greetKind = "new"; s.showCoffee = false; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan.", "Gracias.", "No, es todo.", "¡Genial, gracias!", "Claro, yo lo hago.", "Gracias, pero traje mi comida.",
        "Muy bien.", "¡Nos vemos mañana!"], expect: { complete: true, state: { lunch: false, insisted: false, byes: 1 } }, auto: AUTO },
    // the lunch questions that had no answer ("¿Qué es eso?" right after the invitation is the cocina económica), the
    // day in a whole sentence, and one goodbye for "¡Gracias por todo! ¡Nos vemos mañana!"
    { name: "audit: who, what and until when", setup: (s) => { NO_TWISTS(s); s.insist = false; s.greetKind = "new"; s.showCoffee = false; },
      turns: ["Sí, soy nuevo.", "¡Mucho gusto!", "Ryan, ¿y tú?", "Gracias.", "No, es todo.", "¡Genial, gracias!", "Claro, yo lo hago.", "¿Qué es eso?", "¿Quiénes van?",
        "¿A qué hora regresamos?", "Sí, voy.", "Mi primer día fue muy bueno.", "¡Gracias por todo! ¡Nos vemos mañana!"],
      expect: { complete: true, state: { lunch: true, lastDish: "cocina", dayDone: true, byes: 1 } }, auto: AUTO },
    // Pablo's mug and "¿Quién es Pablo?", "¿Para cuándo?", the day asked again without the clock, "Adiós, que descanses"
    { name: "audit: Pablo, the deadline, the day asked again", setup: (s) => { NO_TWISTS(s); s.mugTwist = true; s.insist = false; s.showCoffee = false; },
      turns: ["Hola, soy Ryan, es mi primer día.", "Mucho gusto.", "¿Dónde está el baño?", "¿Puedo usar esta taza?", "¿Quién es Pablo?", "Perdón, no sabía.", "No, es todo.",
        "¡Genial, gracias!", "¿Para cuándo lo necesitas?", "Hoy no, gracias.", "¿A qué hora entramos mañana?", "Fue un día muy bueno.", "Adiós, que descanses."],
      expect: { complete: true, state: { mugSaid: true, taskDone: true, lunch: false, dayDone: true, dayAsks: 2, byes: 1 } }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

/** "¡Bueno!" / "¡Claro!" for a remark with nothing to answer: once a turn, and never after her reply to the turn's
 *  yes or no ("No, gracias, no tomo café" to her offer to show the cafetera). */
function ack(c: Ctx) {
  if (!turn(c).answered && once(c, "ack")) c.say("ack");
}

/** "¿Y tú?" / "¿Cómo te llamas?": her name, unless her welcome has just said it this turn. */
function herName(c: Ctx, seg: { tags: string[] }) {
  if (seg.tags.includes("back") && !turn(c).welcomed && once(c, "her_name")) c.say("my_name_is");
}

function introduced(c: Ctx) {
  c.s.introduced = true;
  if (c.s.welcomed) return;
  c.s.welcomed = true;
  turn(c).welcomed = true; // the welcome says "Soy María"
  if (c.s.named) { c.s.niceSaid = true; c.say("welcome_nice"); } else c.say("welcome_team");
  // the learner answers the welcome ("¡Mucho gusto!") before the tour starts
  c.expect({ id: "meet", optional: true, expects: ["nice_meet", "intro_name", "intro_ctx", "bare_name_ctx"], hints: ["meet"], suggest: [S_MEET],
    on: { nice_meet: () => { /* the tour follows */ }, g_thanks: () => { /* the tour follows */ } } });
}

function named(c: Ctx, name?: string) {
  if (!name) return;
  const first = !c.s.named;
  c.s.named = true;
  // a name given after María's welcome
  if (first && c.s.welcomed && !c.s.niceSaid) { c.s.niceSaid = true; c.say("nice_you"); }
}

/** A question during the tour (counted; after a few María moves on). */
function question(c: Ctx, key: string) {
  if (!c.s.asked[key]) { c.s.asked[key] = true; c.s.qCount++; }
  if (c.s.toured && c.s.qCount >= 4 && c.step === "tour") c.s.tourDone = true;
}

/** María shows the desk, the laptop and the card (once). */
function showDesk(c: Ctx) {
  c.s.deskShown = true;
  c.s.topic = "laptop";
  c.say("show_around");
  c.say("desk_show");
  c.event("give", { item: "laptop" });
  c.say("card");
  c.event("give", { item: "password card" });
}

/** A question about the desk, the laptop or the card before she has shown them: she shows them first (the card the
 *  answer talks about must have been given). */
function deskFirst(c: Ctx) {
  if (!c.s.deskShown) showDesk(c);
  c.s.deskDone = true;
}

function coffeeWhere(c: Ctx) {
  c.s.coffeeKnown = true;
  c.s.topic = "coffee";
  c.say("a_coffee");
  if (c.s.coffeeBroken && !c.s.brokenSaid) { c.s.brokenSaid = true; c.twist("coffee_broken"); c.say("coffee_broken"); c.say("coffee_alt"); return; }
  // s.showCoffee lets a sim pin the question; unset, it is decided here
  if (c.step === "coffee" && (c.s.showCoffee ?? c.chance(0.5))) {
    c.say("a_coffee_more");
    c.s.showOffered = true;
    // "¿Quieres que te enseñe cómo funciona?" — a bare "Sí, gracias" gets the demo
    c.expect({ id: "coffee_show", optional: true, expects: ["q_how", "show_me", "coffee_want", "tea_ok", "coffee_later", "q_mug", "know_system", "know_ctx"], hints: ["coffee"],
      suggest: [{ lt: "Say thanks, or ask how it works", hint: "coffee" }],
      yes: (cc) => { cc.s.showOffered = false; turn(cc).answered = true; howItWorks(cc); },
      no: (cc) => { cc.s.showOffered = false; turn(cc).answered = true; cc.say("fine_then"); } });
  }
}

function howItWorks(c: Ctx) {
  if (!once(c, "how")) return; // "Sí, ¿cómo funciona?": one demo, not two
  const h = heard(c);
  const topic: Topic = /cafe|maquina/.test(h) ? "coffee" : /impres|imprim/.test(h) ? "printer" : /sistema|programa/.test(h) ? "system" : c.s.topic ?? "coffee";
  if (topic === "printer") { c.say("a_print_how"); return; }
  if (topic === "system" && c.s.taskAsks) { c.s.shown = true; c.say("show_system"); if (c.s.sent) c.s.taskDone = true; else c.hold(); return; }
  if (topic === "laptop" || topic === "badge") { c.say("show_login"); return; }
  if (topic === "coffee" || topic === "mug" || topic === "fridge") {
    if (c.s.coffeeBroken && c.s.brokenSaid) { c.say("a_how_broken"); return; }
    if (!c.s.coffeeKnown) { c.say("which_one"); coffeeWhere(c); return; }
    c.say("a_how_coffee");
    if (c.s.mugTwist && !c.s.mugSaid) { mugTwist(c); return; }
    c.say("wash_cup");
    return;
  }
  c.say("a_how_coffee");
}

function mugTwist(c: Ctx) {
  c.s.mugSaid = true;
  c.twist("mug");
  c.say("mug_twist");
  c.expect({ id: "mug", optional: true, expects: ["oops"], hints: ["oops"], suggest: [{ lt: "Apologize", hint: "oops" }],
    on: { oops: (cc) => { cc.say("no_worries"); }, g_sorry: (cc) => { cc.say("no_worries"); }, g_thanks: (cc) => { cc.say("no_worries"); } } });
}

function knowSystem(c: Ctx) {
  if (!once(c, "know")) return;
  c.say("know_ok");
  if (c.step === "task" || c.s.taskAsks) { c.s.shown = true; taskOk(c); }
}

function taskCant(c: Ctx) {
  if (!once(c, "task")) return;
  c.s.shown = true; c.say("show_system");
  if (c.s.sent) c.s.taskDone = true; else c.hold();
}

function taskOk(c: Ctx) {
  if (!once(c, "task")) return;
  if (!c.s.sent) { c.s.sent = true; turn(c).sent = true; c.say("send_offer"); }
  c.say("task_ok_reply");
  c.s.taskDone = true;
}

function lunchYes(c: Ctx) {
  if (turn(c).lunchSaid) return; // one answer per turn ("¿A qué hora? Sí, voy", "Hoy no, mejor mañana")
  if (LUNCH_NOT.test(heard(c))) { lunchNo(c); return; }
  turn(c).lunchSaid = true;
  if (c.s.lunch !== undefined) { ack(c); return; }
  c.s.lunch = true;
  c.say(turn(c).timeSaid ? "lunch_yes_short" : "lunch_yes_reply"); // "Sí, ¿a qué hora?": the two o'clock just said
}

function lunchNo(c: Ctx) {
  if (turn(c).lunchSaid) return;
  turn(c).lunchSaid = true;
  if (c.s.lunch !== undefined) { ack(c); return; }
  // she urges once, as Mexicans do, unless the learner gave a reason (a meeting, work, a diet, lunch from home)
  if (c.s.insist && !c.s.insisted && !REAL_REASON.test(heard(c))) {
    c.s.insisted = true;
    if (c.chance(0.5)) { c.s.lastDish = "chiles"; c.say("lunch_insist"); } else c.say("lunch_urge");
    c.expect({ id: "lunch_insist", optional: true, expects: ["lunch_yes", "lunch_no", "lunch_q_ctx", "insist_no_ctx"], hints: ["lunch"], suggest: [S_LUNCH],
      on: {
        insist_no_ctx: (cc) => { finalLunch(cc, false); },
        lunch_yes: (cc) => { finalLunch(cc, true); },
        lunch_no: (cc) => { finalLunch(cc, false); },
      },
      yes: (cc) => { finalLunch(cc, true); }, no: (cc) => { finalLunch(cc, false); } });
    return;
  }
  c.s.lunch = false;
  c.say("lunch_no_reply");
}

function finalLunch(c: Ctx, yes: boolean) {
  if (c.s.lunch !== undefined || turn(c).lunchSaid) return;
  turn(c).lunchSaid = true;
  if (yes && LUNCH_NOT.test(heard(c))) yes = false;
  c.s.lunch = yes;
  c.say(yes ? "lunch_yes_reply" : "lunch_no_reply");
}

/** One goodbye a turn ("¡Gracias por todo! ¡Nos vemos mañana!", "Adiós, que descanses"). "¡Que descanses!" from the
 *  learner gets "¡Igualmente!", not the same wish back; before the end of the day she says just "¡Nos vemos!". */
function byeBack(c: Ctx) {
  if (!once(c, "bye")) return;
  c.s.byes = (c.s.byes || 0) + 1;
  c.say(/descans|que tengas|buena|buenas/.test(heard(c)) ? "bye_same" : c.s.dayAsks ? "bye_reply" : "bye_early");
  c.end();
}

function dayGood(c: Ctx) {
  if (c.s.dayDone) return;
  c.s.dayDone = true;
  c.say("day_good_reply");
}

function dayTired(c: Ctx) {
  if (c.s.dayDone) return;
  c.s.dayDone = true;
  c.say("day_tired_reply");
}

export default firstDay;
