// Song 77 "Just a Trim" → Puerto Colibrí: "Nada más las puntas"
// Estética Tijeras, a small hair salon downtown (the 3D town, docs/es/TOWN.md: on avenida Juárez's south side, on the
// corner of calle Ceiba, the bank across Ceiba); the stylist Paty (usted), chatty, loves her cat Canela. Built on the English edition's s77-salon: the same
// steps, intents, handlers and twists, with what a Mexican estética does: "¿Tiene cita?" / "¿Atienden sin cita?",
// "¿A nombre de quién?", "¿Qué se va a hacer hoy?", "nada más despuntar / las puntas", "el fleco", lengths in
// centimeters ("dos dedos" works too; inches are converted), "más corto de los lados" → "¿Con máquina o con tijera?"
// (the clipper guard: "del dos"), "¿Le dejo las capas?", "¿Le lavo el cabello?", "¿Cómo está el agua?", small talk,
// "¿Se lo seco?" (lacio o con ondas), "¿Cómo lo ve?", "¿Cuánto le debo?", pesos, card (the card reader asks about
// a tip), cash or a bank transfer, a tip ("¿Cuánto se deja de propina?"), "¿Le agendo su próxima cita?".
// Twists (visits ≥ 1): Paty took off more than agreed (the learner reacts politely; she takes $50 off); a walk-in
// waits about fifteen minutes for a client before them.
// Guide: small-talk questions have their own answer groups per topic; the twist suggests a polite reaction first;
// leaving ("Mejor regreso más tarde") is offered as the alternative, not a model answer.
//
// Added for Mexico (not in the English file): tool_ans / tool_ctx (clippers or scissors), tip_howmuch, no_card /
// no_cash (the other way to pay), drink_no_ctx, appt_time_ctx (a bare "A las tres" only at "¿Tiene cita?") and
// fine_ctx ("Así está bien" as a yes where the question wants one: the water, the result, a change of length).
// Added by the audit (5 Nov 2026): water_ok_ctx (a bare "Está bien" / "Mejor" is the water only at the water), extra_q
// ("¿Está incluido?"), paty_name, howlong_q, dollars_q, atm_q, change_q, style_any_ctx, nothing_ctx, short_much_ctx,
// book_time_ctx; rule 17 at the paid extras ("Está bien, gracias" at the wash, the blow-dry, the card reader's tip: asked
// once); the twist's bare yes/no (an apology and the discount, or "No, está bien" accepted).

import type { Ctx, Pending, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";
import { WORLD_COUNTRIES, WORLD_NATIONALITIES } from "../countries";

// ---------------------------------------------------------------------------
// Prices (cents of a peso)

const CUT = 20000, WASH = 5000, DRY = 5000, BANGS = 6000, SORRY_OFF = 5000;

function total(c: Ctx): number {
  let p = c.s.service === "bangs" ? BANGS : CUT;
  if (c.s.wash) p += WASH;
  if (c.s.blowdry) p += DRY;
  if (c.s.discount) p -= SORRY_OFF;
  return p;
}

/** Inches (a visitor's habit), converted to centimeters. */
const inchesFromTags = (tags: string[]): number | undefined => {
  if (tags.includes("in05")) return 0.5;
  if (tags.includes("in1")) return 1;
  if (tags.includes("in15")) return 1.5;
  if (tags.includes("in2")) return 2;
  if (tags.includes("in3")) return 3;
  return undefined;
};

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** What the learner said, folded, letters and spaces only ("¡Está bien, gracias!" → "esta bien gracias"). */
const plain = (c: Ctx) => fold(c.heard).replace(/[^a-zñ ]+/g, " ").replace(/\s+/g, " ").trim();
/** Rule 17: "Está bien, gracias" (ok / vale / bueno + gracias) at a paid offer may be a polite no. */
const politeClosing = (c: Ctx) => /^(pues |ah )?(esta bien|ok|okay|vale|bueno|muy bien|perfecto) (muchas |mil )?gracias$/.test(plain(c));
/** At the twist, words that accept it ("No, está bien", "Sí, no hay problema") rather than agree it's too short. */
const saidFine = (c: Ctx) => /\b(bien|gracias|problema|importa|preocupe|pasa nada|crece|crecera|vale|ok)\b/.test(plain(c));
/** "¿Qué significa máquina?": a question about Paty's word, never its answer (the global g_meaning explains it). */
const asksMeaning = (c: Ctx) => /\b(que significa|que quiere decir|que es eso)\b/.test(plain(c));
/** A paid extra (the wash, the blow-dry, a tip on the card reader) answered with a polite closing: "Perdón, ¿entonces sí?" once. */
function askedAgain(c: Ctx, key: string): boolean {
  if (!politeClosing(c) || c.s["yesChecked_" + key]) return false;
  c.s["yesChecked_" + key] = true;
  c.say("yes_check");
  return true;
}

const FLAG_LOLA = "lo / la: “you” (lo for a man, la for a woman).";
const FLAG_FLECO = "el fleco: bangs (Mexico); el flequillo in Spain and elsewhere.";

// Automatic answers for the simulation when Paty asks an optional question.
const AUTO: Record<string, string> = {
  appt: "Sí, tengo cita a las tres.", name: "A nombre de Ryan.", wait_q: "Sí, puedo esperar.", drink: "No, gracias.",
  service: "Nada más despuntar, por favor.", service_q: "Nada más despuntar.", length: "Dos centímetros, por favor.", cm_q: "Sí, está bien.",
  tool_q: "Con tijera, por favor.", layers: "Sí, por favor.", bangs_q: "No, gracias.", wash: "Sí, por favor.", water: "Está perfecta.",
  chat: "¡Qué chistoso!", chat_weekend: "Nada especial, voy a descansar.", chat_from: "Soy de Canadá.", chat_vacation: "Quiero ir a Oaxaca.",
  chat_pets: "Tengo un perro.", blowdry: "Sí, por favor.", style: "Lacio, por favor.", reveal: "¡Me encanta!", more_q: "¡Perfecto, gracias!",
  fix_q: "No pasa nada.", pay: "Con tarjeta, por favor.", tip_q: "El diez por ciento, por favor.", book: "No, gracias.", book_when: "En seis semanas está bien.",
};

// ---------------------------------------------------------------------------

export const salon: SituationDef = {
  id: "s77-salon",
  song: 77,
  songTitle: "Just a Trim",
  title: { en: "Nada más las puntas", lt: "Just a trim" },
  topic: { en: "En la estética", lt: "At the hair salon" },
  chapter: 3,
  order: 7,
  location: "salon",
  npc: "jessie",
  goal: "Tell the stylist what you'd like done, answer her questions and pay.",
  intro: "Estética Tijeras is a small hair salon downtown, on the corner of avenida Juárez and calle Ceiba. Your appointment is at three. Paty, the stylist, loves to chat, especially about her cat, Canela. Prices are in pesos.",

  merges: {
    // Spain twins (docs/es/STYLE.md "Spain Spanish")
    "has dicho": { reason: "grammatical_fusion", split: "has → you have + dicho → said; Spain's perfect for what was just said = you said.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha tirado": { reason: "grammatical_fusion", split: "ha → has + tirado → knocked; Spain's perfect for this morning = knocked.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha aprendido": { reason: "grammatical_fusion", split: "ha → has + aprendido → learned; = has learned.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "he cortado": { reason: "grammatical_fusion", split: "he → I have + cortado → cut; = I cut.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha llegado": { reason: "grammatical_fusion", split: "ha → has + llegado → arrived; a transfer = it's come in.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same; = right now.", minimal: "All words form the expression." },
    "hace falta": { reason: "lexical_expression", split: "hace → it makes + falta → lack; = it's needed.", minimal: "All words form the expression." },
    "qué bien": { reason: "lexical_expression", split: "qué → how + bien → well; = how nice.", minimal: "All words form the expression." },
    "estética tijeras": { reason: "lexical_expression", split: "estética → beauty salon + Tijeras → scissors would translate the salon's name word by word.", minimal: "The two-word name." },
    "a las tres": { reason: "lexical_expression", split: "a → to + las → the + tres → three: a clock time, = at three.", minimal: "Three words (S-TIME)." },
    "de las tres": { reason: "lexical_expression", split: "de → of + las → the + tres → three: the booked hour, = at three (my three o'clock).", minimal: "Three words (S-TIME)." },
    "tome asiento": { reason: "lexical_expression", split: "tome → take + asiento → seat is a calque; the courtesy formula = have a seat.", minimal: "Two words." },
    "por aquí": { reason: "lexical_expression", split: "por → by + aquí → here: leading a customer, = this way.", minimal: "Two words." },
    "en un momento": { reason: "lexical_expression", split: "en → in + un → a + momento → moment: the service formula = in a moment.", minimal: "Three words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little: the degree adverb = a little, a bit.", minimal: "Two words." },
    "un poquito": { reason: "lexical_expression", split: "un → a + poquito → tiny little: the degree adverb = a little bit.", minimal: "Two words." },
    "todas las noches": { reason: "lexical_expression", split: "todas → all + las → the + noches → nights: = every night.", minimal: "Three words." },
    "en fin": { reason: "lexical_expression", split: "en → in + fin → end misreads the connector: anyway.", minimal: "Two words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week: = weekend.", minimal: "Three words." },
    "y medio": { reason: "lexical_expression", split: "y → and + medio → half: after a number, = and a half.", minimal: "Two words." },
    "aun así": { reason: "lexical_expression", split: "aun → even + así → so misreads the connector: still, even so.", minimal: "Two words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → no reads backwards in English: = not yet.", minimal: "Two words." },
    "por ciento": { reason: "lexical_expression", split: "por → for + ciento → hundred: = percent.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now: = for now.", minimal: "Two words." },
    "acabo de": { reason: "lexical_expression", split: "acabo → I finish + de → of misreads acabar de + infinitive: I just (did).", minimal: "Two words; the verb stays separate." },
    "qué bueno": { reason: "lexical_expression", split: "qué → what + bueno → good: the exclamation = great, I'm glad.", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight is a word-for-word reading of one English verb phrase: I'd love (to).", minimal: "Two words." },
  },

  grammar: {
    macros: {
      hair: "(el pelo | el cabello | mi pelo | mi cabello | pelo | cabello)",
      deg: "(un poco | un poquito | un poquitito | poquito | algo | muy | bastante | demasiado | super | tantito | un tantito | medio)",
      cm: "{c:number} (centimetros | centimetro | cm | centimetros mas o menos) #cm",
      inch: "(media pulgada #in05 | una pulgada #in1 | pulgada y media #in15 | una pulgada y media #in15 | dos pulgadas #in2 | tres pulgadas #in3 | {n:number} pulgadas #inN)",
      finger: "(un dedo #dedo1 | un dedito #dedo1 | dos dedos #dedo2 | dos deditos #dedo2 | tres dedos #dedo3)",
      little: "(un poco | un poquito | un poquitito | poquito | poquitito | tantito | un tantito | muy poco | poco)",
      // any country (../countries.ts, owner 14 Nov 2026): its names, cities and nationalities
      country: `(${[...new Set(["estados unidos", "canada", "inglaterra", "irlanda", "escocia", "gales", "australia", "nueva zelanda", "el reino unido", "reino unido", "londres", "texas", "california", "florida", "nueva york", "toronto", "vancouver", "chicago", "dublin", "sidney", "alemania", "francia", "holanda", ...WORLD_COUNTRIES.flatMap((e) => e.forms ?? [])])].join(" | ")})`,
      nation: `(${[...new Set(WORLD_NATIONALITIES.flatMap((n) => n.forms))].join(" | ")})`,
      place: "(oaxaca | merida | la ciudad de mexico | cdmx | bacalar | holbox | cuba | guatemala | belice | chiapas | cancun | tulum | europa | mi pais | estados unidos | canada | la playa | las piramides | puebla | guadalajara | san cristobal)",
      trip: "(oaxaca | merida | la ciudad de mexico | cdmx | bacalar | holbox | cuba | guatemala | belice | chiapas | cancun | tulum | europa | las piramides | puebla | guadalajara | san cristobal)",
      when_trip: "(en diciembre | en verano | en navidad | en semana santa | en unos meses | este ano | el proximo mes | el ano que viene | pronto)",
    },
  },

  intents: {
    // --- check-in ------------------------------------------------------------------------------
    appt_have: { patterns: [
      "[si] tengo [una] cita [a {time}] [con usted | con paty] #h:appt_at", "[si] tengo cita (para hoy | esta tarde | hoy) [a {time}]",
      "[si] (hice | agendé | reservé | saqué | pedí) [una | la | mi] cita [a {time} | para {time} | para hoy] [por telefono | ayer | la semana pasada | por internet | en linea | por mensaje | por whatsapp]",
      "[si] (mi | la) cita es a {time} [con usted]", "[si] (soy | yo soy) (su | la) cita de {time}", "[si] mi cita es con usted [a {time}]",
      "[si] (vengo | estoy aqui) (a | por | para) (mi cita | la cita | una cita) [de {time} | a {time}]", "[si] (tengo | hice) (una)? (reservacion | reserva) [a {time}]",
      // "¿Usted es mi cita de las tres?" – "No, tengo cita a las cuatro" (its comma lost: the likelier reading)
      "no (tengo | tenia) (cita | mi cita | la cita) a {time} #notat",
    ] },
    // a bare "A las tres" / "Sí, soy yo": only at "¿Tiene cita?"
    appt_time_ctx: { patterns: ["[si] (a | para) {time}", "[si] soy yo", "[si] (a | para) {time} con usted"] },
    appt_none: { patterns: [
      "[no] no tengo [una | ninguna] cita #h:no_appt", "[no] sin cita", "[no] no (hice | agendé | reservé | saqué) [una | la | ninguna] cita", "[no] no (he pedido | he reservado | he cogido) [una | la | ninguna] cita", "[no] no tengo (reservacion | reserva)",
      "[no] vengo sin cita", "[no] no hice ninguna", "[no] no tengo cita no",
    ] },
    walkin: { patterns: [
      "(atienden | atiende | aceptan | acepta | atendeis | aceptais) sin cita #h:walkin", "(puedo | se puede) (venir | pasar) sin cita",
      "(tiene | tienen | hay) (lugar | espacio | tiempo | chance | un espacio | un lugar | hueco) [ahorita | ahora | hoy | en este momento] [para (un corte | cortarme el pelo | cortarme el cabello | mi | un despunte)]",
      "(me puede | me podria | puede | podria) (atender | cortar el pelo | cortar el cabello | cortarme el pelo | cortarme el cabello) (ahorita | ahora | hoy | en este momento) [sin cita]",
      "(tiene | hay) tiempo para (un corte | un despunte | cortarme el pelo) [ahorita | ahora | hoy]", "(esta | estan) (libre | libres | disponible | disponibles) [ahorita | ahora]",
      "(tienes | tienes tiempo | tienes lugar) [para un corte] [ahorita | ahora] #tip:tu_staff", "tienes tiempo para un corte #tip:tu_staff",
      "(puedo | podria) (cortarme | despuntarme) [el pelo | el cabello] (ahorita | ahora | hoy) [sin cita]",
      "(ahorita | ahora) (puede | tiene tiempo | me puede atender)", "(puedo | se puede) (cortarme | despuntarme) [el pelo | el cabello] [ahorita | ahora | hoy] sin cita",
      "(quiero | quisiera) (hacer | sacar) una cita [para hoy | para ahorita | para ahora]", "(tiene | hay) (un espacio | lugar | espacio) para mi",
    ] },
    name_ctx: { patterns: [
      "[si] [tengo cita | la cita esta | esta | debe estar] a nombre de {name} #h:name_its", "(me llamo | mi nombre es) {name} #h:name_mine",
      "[es | soy] {name}", "(mi | la) cita (esta | debe estar) a nombre de {name}", "[si] (es | esta) a nombre de {name}",
    ] },
    wait_ok: { patterns: [
      "[si] (puedo | la puedo | lo puedo) esperar #h:wait_ok", "[si] (la | lo | le) espero", "[si] (espero | aqui espero | me espero | yo espero)",
      "[no] no me importa esperar #h:wait_fine", "[no] no tengo prisa", "[si] (no hay problema | esta bien) (espero | la espero | aqui espero | puedo esperar)",
      "[si] (quince minutos | eso) esta bien", "[si] me espero [aqui | un rato]",
    ] },
    wait_no: { patterns: [
      "[no] no puedo esperar", "[no] no tengo tiempo [de esperar | para esperar]",
      // (it was understood only through a bare "un" read as one o'clock, fixed in slots.ts)
      "[no] no tengo tiempo para (un corte | el corte | un corte de pelo | cortarme el pelo) [ahora | ahorita | hoy]", "[no] [mejor] (regreso | vuelvo | paso) (mas tarde | despues | otro dia | manana | luego) #h:wait_later",
      "[no] es (mucho | demasiado) tiempo", "[no] (tengo | traigo) prisa", "[no] voy a (regresar | volver) (mas tarde | despues | otro dia | manana)",
    ] },
    // "¿Usted es Paty?", "¿Cómo se llama usted?" (a bare "¿Cómo se llama?" is the cat's name once she's come up: ask_cat)
    paty_name: { patterns: ["(como se llama | cual es su nombre) usted", "[y] usted como se llama", "cual es su nombre", "(usted es | es usted | eres | tu eres) paty", "usted se llama paty",
      "(como te llamas | cual es tu nombre) #tip:tu_staff"] },
    // "¿Cuánto tarda?", "¿Cuánto falta?", "¿Cuánto tiempo tengo que esperar?"
    howlong_q: { patterns: [
      "cuanto (tiempo)? (tarda | se tarda | dura | lleva | toma | va a tardar | se va a tardar | tardaria | tarda usted) [el corte | todo | mas o menos]", "cuanto tiempo (es | son | va a ser | seria) [mas o menos]",
      "cuanto (falta | le falta | nos falta)", "(cuanto | cuanto tiempo) (tengo que | hay que) esperar", "cuanto tiempo", "(falta mucho | tarda mucho | va a tardar mucho)",
    ] },

    // --- drink offer -------------------------------------------------------------------------
    drink_ans: { patterns: [
      "[si] (un vaso de agua | un vasito de agua | agua | un poco de agua | agua natural) [por favor] #h:drink_water", "[si] (un cafe | un cafecito | cafe) [por favor] [gracias] #h:drink_coffee",
      // tea only with a word that can't be the pronoun "te"
      "[si] (un tecito | una taza de te | te verde | te helado | un te helado | un te verde)", "[si] (agua | un cafe | un cafecito | un vaso de agua) (esta bien | estaria bien | me caeria bien)",
      "[si] (me da | me regala | quiero | quisiera | me gustaria) (agua | un vaso de agua | un cafe | un cafecito | un vasito de agua)", "(tiene | hay) (cafe | agua | te | tecito | te verde)",
      "[si] (agua | un cafe | cafe | un cafecito) (con hielo | sin azucar | con azucar | con leche | fria | negro | americano | de olla | descafeinado)", "(dame | me das) (agua | un cafe | un vaso de agua) #tip:tu_staff",
      "(cafe | agua) no [mejor] (agua | un vaso de agua | un vasito de agua | cafe | un cafe | un cafecito) [por favor]",
    ] },
    // "No quiero nada, gracias" at "¿Le ofrezco agua o un cafecito?"
    drink_no_ctx: { patterns: ["[no] no quiero nada [gracias]", "[no] nada [gracias]", "[no] no gracias acabo de tomar (cafe | agua | un cafe)", "[no] no quiero (cafe | agua | nada de tomar)"] },

    // --- what we're doing today ----------------------------------------------------------------
    trim: { patterns: [
      "[nada mas | solo | solamente | nomas] (despuntar | despuntarme | un despunte | despuntarlo | despuntar el pelo | despuntar el cabello | despuntarme el pelo | despuntarme el cabello) #h:just_trim",
      "(quiero | quisiera | necesito | me gustaria | vengo a) (despuntar | despuntarme | un despunte) [el pelo | el cabello | las puntas] [nada mas]",
      "[nada mas | solo | solamente | nomas] las puntas #ends #h:just_ends", "[nada mas | solo] (cortar | cortarme | recortar | emparejar | emparejarme | sanear | sanearme) [nada mas | solo] las puntas #ends",
      "(nada mas | solo) (emparejar | recortar | emparejarlo) [un poco | un poquito]", "(quiero | quisiera) (mantener | conservar | dejar) el largo",
      "(lo mismo | igual) (que | como) (la ultima vez | siempre | la vez pasada)", "lo de siempre", "(un | nada mas un) (recorte | retoque)",
      "(quiero | quisiera) el mismo corte [pero] [un poco | un poquito] mas corto", "(mantener | dejar) el mismo (corte | estilo | largo)", "un corte (pequeno | ligero | chiquito)",
      "(quiero | quisiera) (despuntarme | cortarme) las puntas", "(sanear | sanearme) [las puntas]", "(despunte | despuntar) por favor",
      "(quiero | quisiera) que me (corte | quite | despunte | empareje) [nada mas | solo] las puntas [abiertas] #ends", "(nada mas | solo) (quiero | quisiera) (despuntarme | despuntar | emparejar | un despunte)",
      "(tengo | traigo) las puntas (abiertas | maltratadas | resecas) #ends", "(quiero | quisiera) que me (deje | mantenga) el mismo largo", "(igual | lo mismo) pero [un poco | un poquito] mas corto",
      "(quitar | quiteme | cortar) las puntas abiertas #ends", "[solo | nada mas] (emparejar | emparejarlo | emparejarme)",
    ] },
    haircut: { patterns: [
      "(quiero | quisiera | necesito | me gustaria) (un corte | cortarme el pelo | cortarme el cabello | un corte de pelo | un corte de cabello) #h:haircut",
      "(un corte | corte) [de pelo | de cabello]", "vengo a (cortarme | que me corte) [el pelo | el cabello]", "(me puede | me podria | puede) cortar (el pelo | el cabello)",
      "(un | quiero un) corte de (hombre | caballero | dama | mujer | nino | nina)", "me quiero cortar (el pelo | el cabello)", "(cortarme | cortar) (el pelo | el cabello)",
      "(me cortas | me puedes cortar) (el pelo | el cabello) #tip:tu_staff",
    ] },
    go_short: { patterns: [
      "(quiero | quisiera | me gustaria) (un cambio de look | un cambio | un look nuevo | un nuevo look | cambiar de look | cambiar mi look) #h:new_look",
      "(quiero | quisiera | me gustaria) (algo diferente | algo nuevo | cambiar mi corte | cambiar de estilo | un cambio radical | un estilo nuevo | algo distinto)",
      "(quiero | quisiera | me gustaria) (un corte | algo)? (mas corto | corto | mucho mas corto | bien corto | cortito)", "(lo quiero | lo quisiera) (corto | mas corto | cortito | bien corto | mucho mas corto)",
      "(cortelo | corte) (corto | mas corto | bien corto)", "(cortalo) (corto | mas corto) #tip:tu_staff", "algo (mas corto | corto | cortito | fresco | mucho mas corto | bien corto) [para el calor]",
      "(quiero | quisiera | me gustaria) (un cambio | algo diferente | algo nuevo | un cambio de look) [y | algo] (mas corto | mucho mas corto | bien corto | corto | cortito)",
      "(un | quiero un | quisiera un)? (degradado | fade | bob | pixie | corte bob | corte pixie | corte militar | rapado | casquete corto | undercut)",
      "(cortarme | me quiero cortar) [el pelo | el cabello] (corto | bien corto | mucho)", "estoy (listo | lista) para un cambio", "[mucho] mas corto",
      "(quiero | quisiera) (cortarme | cortar) (el pelo | el cabello) (muy | bien | mas)? (corto | cortito)", "(quiero | quisiera | lo quiero) (el pelo | el cabello) (corto | mas corto | cortito | bien corto)",
    ] },
    bangs_only: { patterns: [
      "[nada mas | solo] (el | mi) (fleco | flequillo) #bangs", "(me puede | me podria | puede | podria) (cortar | despuntar | recortar | emparejar) (el | mi) (fleco | flequillo) #h:bangs_trim #bangs",
      "(quiero | quisiera | necesito) (cortarme | despuntarme | arreglarme | cortar | arreglar) (el | mi) (fleco | flequillo) #bangs", "(me cortas | me puedes cortar) (el | mi) (fleco | flequillo) #bangs #tip:tu_staff",
      "[si] (el | mi) (fleco | flequillo) (tambien | igual) #bangs", "(un | nada mas un) (corte | despunte) de (fleco | flequillo) #bangs", "[si] (cortarme | despuntarme) (el fleco | el flequillo) #bangs", "[nada mas | solo] (el | mi) (fleco | flequillo) [y] no (las puntas | el resto | lo demas) #bangs",
    ] },
    photo: { patterns: [
      "(me lo | lo) (puede | podria) cortar como (en)? (esta | la) foto #h:photo", "(lo | me lo) quiero (como | asi como) (en)? (esta | la) foto",
      "(quiero | quisiera) algo (asi | como esto | como en la foto | como esta foto) [mire | vea] [la foto | esta foto]", "(traigo | tengo) una foto", "(mire | vea) (esta | la) foto",
      "como (en)? (esta | la) foto", "(algo)? asi como en la foto", "(puede | podria) hacerme (este | ese) (corte | estilo)", "(quiero | quisiera) (este | ese) (corte | estilo)",
      "algo asi [mire] [la foto]", "(quiero | quisiera)? (un corte | algo) como (el | lo) de (la | esta) foto",
    ] },
    not_short: { patterns: [
      "no (muy | tan | demasiado) corto #h:not_short", "no (me lo | lo) (deje | corte) (muy | tan | demasiado)? corto", "no (lo quiero | quiero que quede | quiero que me quede) (muy | tan | demasiado)? corto",
      "no (mucho | tanto | demasiado)", "no (le corte | me corte | corte) (mucho | demasiado)", "(no quiero | no lo quiero) (mas)? corto", "[pero] (cuidado con | cuide) el largo", "no (quiero | quisiera) (mucho | tanto)", "no (quiero | quisiera) que (me corte | le corte | corte) (mucho | demasiado)",
      "que no (quede | me quede | lo deje | me lo deje | me lo corte | lo corte) (muy | tan | demasiado)? corto", "no (mas | mucho mas) corto", "(no tan | no muy) corto [por favor]",
    ] },

    // --- how much off --------------------------------------------------------------------------
    length: { patterns: [
      "[nada mas | solo | como | unos | mas o menos | aproximadamente] @cm [nada mas | mas o menos] #h:cm",
      "(corte | cortele | quite | quitele | cortar | quitar | me corta | me quita) [nada mas | solo | como | unos] @cm",
      "[como | unos | mas o menos] {c:number} o {c2:number} (centimetros | cm) #cm", "entre {c:number} y {c2:number} (centimetros | cm) #cm",
      "[nada mas | solo | como] @inch", "(corte | quite) [nada mas | solo] @inch",
      "[nada mas | solo | como | unos] @finger #h:finger", "(corte | quite) [nada mas | solo | como] @finger",
      "[nada mas | solo | nomas] @little [nada mas] #small #h:a_little", "(corte | quite | cortele | quitele) @little #small",
      "(mas corto | cortito) (de | a) los lados [y (arriba | de arriba) (largo | mas largo | un poquito | un poco | nada mas un poquito | igual)] #sides #h:sides",
      "(de | a) los lados (mas corto | cortito | corto) [y arriba (largo | mas largo | un poquito | un poco)] #sides",
      "(corte | quite) [un poco | un poquito] (de | a) los lados #sides", "(los lados | de los lados) (cortos | corto | mas cortos | mas corto) #sides",
      "(no mas de | maximo | como maximo) (@cm | @inch | @finger)", "[mejor] (como | unos | nada mas)? {f:number} dedos #dedoN",
      "(lo minimo | lo menos posible | muy poquito | casi nada) #small", "(hasta | a | arriba de | a la altura de) (los hombros | el hombro | la barbilla | las orejas) #shoulders",
      "no se [como | unos | mas o menos] {c:number} o {c2:number} (centimetros | cm) #cm", "no se [como | unos | mas o menos] @cm", "no mucho [nada mas | como | unos] @cm", "no mucho [como] @finger",
      "mejor [como | unos | nada mas] @cm", "no {w:number} [centimetros] sino {c:number} [centimetros] #cm", "no (son | es) {w:number} [centimetros] (son | es | sino) {c:number} [centimetros] #cm", "{w:number} no [mejor] {c:number} centimetros #cm",
      "corto (de | a) los lados [y] (largo | mas largo) (arriba | de arriba) #sides",
      // halves: "Medio centímetro" (a little), "Un centímetro y medio", "Dos centímetros y medio"
      "[nada mas | solo | como | unos] medio (centimetro | cm) [nada mas] #small", "[nada mas | solo | como | unos] [un] centimetro y medio [nada mas] #cm15",
      "[nada mas | solo | como | unos | mas o menos] {c:number} (centimetros | cm) y medio [nada mas] #cmhalf",
    ] },
    confirm_yes: { patterns: ["[si] (esta | me parece) (perfecto | muy bien) [gracias] #h:conf_perfect", "[si] (eso | asi) esta perfecto", "[si] (eso | dos centimetros) esta bien #h:conf_fine"] },
    // "Así está bien" where the question wants it as a yes (the water, a length, the result)
    fine_ctx: { patterns: ["[si] asi (esta | esta bien | esta perfecto | me gusta | quedó bien | esta perfecta)", "[si] (dejelo | dejemoslo) asi", "[si] asi esta bien gracias", "[si] asi",
      // "No, está bien así" / "No está bien así": its comma lost, it could be either
      "no esta bien asi #amb", "no asi esta bien"] },
    // "Nada, así está bien" at "¿Qué quiere que le cambie?" / "¿le gusta así, o le cambio algo?": nothing to change
    nothing_ctx: { patterns: ["[no] nada [nada] [asi esta bien | esta bien | asi me gusta | gracias | asi dejelo]", "no (le cambie | cambie | me cambie) nada", "no quiero que (le cambie | cambie) nada"] },
    // "¿Cuánto más?" after "creo que le corté un poquito más de lo que dijimos"
    short_much_ctx: { patterns: ["[y] cuanto mas [me cortó | le cortó | cortó]", "cuantos centimetros [mas | me cortó | cortó | de mas]", "cuanto (me cortó | cortó) de mas"] },
    // "No, menos" at "¿Le parece bien?" after a length
    less_ctx: { patterns: ["[no] (menos | un poco menos | mejor menos | menos que eso | es mucho | es demasiado)"] },
    // "Un poquito nada más" at "¿Le despunto también el fleco?": yes, a little
    bangs_yes_ctx: { patterns: ["[si] (un poquito | un poco | poquito | tantito) [nada mas]", "[si] nada mas (un poquito | las puntas)"] },
    // "Sí, el quince" at the card reader's tip question
    tip_num_ctx: { patterns: ["[si] [el] {p:number} [por favor]"] },
    wash_request: { patterns: [
      "(me puede | me podria | puede) lavar (el pelo | el cabello) [tambien | primero]", "(quiero | quisiera) (lavado | que me lave el cabello | que me lave el pelo) [tambien | primero]",
      "(lavado | un lavado) y (corte | despunte) #trim", "(corte | despunte) y lavado #trim", "(quiero | quisiera) (lavado y corte | corte y lavado | lavado y despunte | despunte y lavado) #trim",
      "[si] (un lavado | lavado) (estaria bien | tambien)", "[si] (lavemelo | lavelo) [primero]", "[si] (con | quiero) lavado",
      // "Quiero un corte y que me lave el pelo": the wash as the second piece
      "[y] que me lave (el pelo | el cabello) [tambien | primero]",
    ] },

    // --- extras --------------------------------------------------------------------------------
    keep_layers: { patterns: ["[si] (dejeme | deje | dejele) las capas", "[si] (quiero | me gustan) (las | mis) capas", "[si] (con capas | unas capas)", "[si] (quiero | quisiera) (unas | algunas)? capas",
      "[si] (mantenga | conserve) las capas", "[si] (dejelas | dejalas)"] },
    no_layers: { patterns: ["[no] sin capas", "[no] no (quiero | me gustan | necesito) (las)? capas", "[no] (todo | todo el pelo) parejo", "[no] (parejo | todo al mismo largo | del mismo largo)",
      "[no] (quite | quiteme) las capas", "[no] no (me deje | deje | me haga | haga) capas", "[no] capas no [gracias]", "[no] no (tengo | traigo) capas"] },

    // --- wash and water ------------------------------------------------------------------------
    water_temp: { patterns: [
      "[el agua] (esta | la siento) [@deg] (caliente | hirviendo) #hot #h:too_hot", "[el agua] (esta | la siento) [@deg] (fria | helada) #cold #h:too_cold",
      "(me quema | quema) #hot", "[un poco | un poquito] mas (caliente | calientita | tibia) [por favor] #cold", "[un poco | un poquito] mas (fria | fresca) [por favor] #hot",
      "(la puede | me la puede | puede) (poner | hacer) [un poco | un poquito] mas (caliente | tibia | calientita) #cold", "(la puede | me la puede | puede) (poner | hacer) [un poco | un poquito] mas (fria | fresca) #hot",
      "demasiado (caliente #hot | fria #cold)", "(muy | super) (caliente #hot | fria #cold)",
    ] },
    water_ok: { patterns: ["el agua esta (perfecta | bien | rica | muy bien | super bien | agradable | tibia | muy rica) [gracias]", "el agua (perfecta | rica | muy rica | bien)"] },
    // without "el agua": only at "¿Cómo está el agua?" (elsewhere "Está bien, gracias" or "Mucho mejor" is no water)
    water_ok_ctx: { patterns: [
      "esta (perfecta | bien | rica | muy bien | super bien | agradable | tibia | muy rica) [gracias] #h:water_ok", "(perfecta | rica | muy rica | deliciosa)",
      "[si] (asi | ahora | ya) esta (perfecta | mejor | muy bien | rica)", "[si] (ahora | ya) (si)? esta (perfecta | bien | mejor)", "(mucho)? mejor [gracias]",
      "esta tibia esta bien",
    ] },
    no_wash: { patterns: [
      "[no] (me lo lavé | ya me lo lavé | lo lavé | me lavé el pelo | me lavé el cabello | ya me bañé | me bañé | me lo he lavado | ya me lo he lavado | me he lavado el pelo | me he duchado | ya me he duchado) [en la manana | hoy | esta manana | antes de venir | en casa]",
      "[no] (ya)? (lo traigo | lo tengo | tengo el pelo | traigo el pelo | tengo el cabello | traigo el cabello) limpio", "[no] sin lavado",
      "[no] no (hace falta | es necesario) (lavarlo | lavarmelo | el lavado)", "[no] no quiero (lavado | que me lave el pelo | que me lave el cabello)",
    ] },

    // --- clippers or scissors ------------------------------------------------------------------
    tool_ans: { patterns: [
      "[mejor] con (maquina | la maquina) [del {n:number} | del numero {n:number} | numero {n:number}] [mejor] #machine #h:tool_machine",
      "[mejor] (con | con la | con las) (tijera | tijeras) [mejor] #scissors #h:tool_scissors",
      "(los lados | a los lados | de los lados) con maquina [del {n:number}] y (arriba | lo de arriba | la parte de arriba) con (tijera | tijeras) #both #h:tool_both",
      "con maquina [del {n:number}] (a | de) los lados [y arriba con (tijera | tijeras)] #both", "(con)? maquina no [mejor] con (tijera | tijeras) #scissors",
      "(tijera | tijeras) no [mejor] con maquina #machine", "(con)? (maquina | tijera) (por favor | esta bien) #scissors", "maquina del {n:number} #machine",
      "[con] maquina [del {n:number}] (a | de) los lados y [con] (tijera | tijeras) (arriba | en la parte de arriba) #both",
    ] },
    // a bare guard number or "lo que usted diga": only at "¿Con máquina o con tijera?"
    tool_ctx: { patterns: ["(del | el | con el) {n:number} #machine", "(lo que | como) usted (diga | recomiende | me recomiende | quiera | crea mejor) #any", "(maquina #machine | tijera #scissors | tijeras #scissors)",
      "como (quiera | guste) #any", "usted (decida | sabe) #any", "(no importa | me da igual | da igual | cualquiera | la que sea) #any"] },

    // --- blow-dry and style ------------------------------------------------------------------
    style: { patterns: [
      "[nada mas] (lacio | planchado | liso) #straight #h:straight", "con ondas #waves #h:waves", "(con | unas) (ondas | rizos | chinos) #waves", "(ondulado | rizado | chino) #waves",
      "con (volumen | un poco de volumen | mucho volumen) #volume #h:volume", "[al] natural #nodry",
      "(lo quiero | quisiera | prefiero | me gusta) (lacio #straight | con ondas #waves | ondulado #waves | con volumen #volume | natural #nodry | al natural #nodry)",
      "que se seque solo #nodry #h:no_blowdry", "(dejelo | lo dejo) (secar solo | que se seque solo | al aire) #nodry", "[no] sin (secadora | secar | secado) #nodry",
      "(se seca | lo dejo secar) (solo | al aire) #nodry", "(lacio #straight | con ondas #waves) esta bien", "(sequelo | secarlo) (lacio #straight | con ondas #waves)", "(normal | como siempre | asi nomas | sencillo) #natural",
      "[no] no (quiero que me lo seque | lo seque | hace falta secarlo | necesito secadora) #nodry",
    ] },
    // "Como usted quiera" at "¿Lacio o con ondas?": Paty picks straight
    style_any_ctx: { patterns: ["(como | lo que) usted (quiera | diga | prefiera | recomiende | guste)", "como (quiera | guste)", "(no importa | me da igual | da igual | cualquiera)", "usted (decida | sabe)"] },

    // --- the result ----------------------------------------------------------------------------
    love_it: { patterns: [
      "me encanta #h:love_it", "me (encanta | encantó | gusta mucho | gusta muchisimo | fascina) (como quedó | el corte | mucho)?", "[si] me gusta [mucho | el corte | como quedó]",
      "(quedó | queda | se ve) (muy | super | bien)? (bien | bonito | padre | precioso | perfecto | increible | genial | hermoso) [gracias] #h:looks_great",
      "(esta | quedó) (perfecto | precioso | padrisimo | divino | genial)", "(perfecto | precioso | hermoso | genial | excelente | increible | divino | padrisimo | bellisimo)",
      "(que | muy) (bonito | bien | padre | lindo) [quedó | se ve | me queda]", "me veo (muy)? (bien | joven | mas joven | guapo | guapa | diferente | increible)",
      "(buen | excelente) (trabajo | corte)", "(estoy | quedé) (muy | super)? (contento | contenta | feliz) [con el corte]", "es (justo | exactamente) lo que queria",
      "(wow | guau | orale)", "no esta mal", "me (queda | quedó) (muy | super)? (bien | bonito | padre)", "no se ve mal",
      // "¿Y ahora, qué tal?" – "Mucho mejor, gracias"
      "mucho mejor [asi] [gracias]", "(asi | ahora | ya) (si | esta mejor | quedó mejor) [gracias]",
    ] },
    more_off: { patterns: [
      "(me puede | me podria | puede | podria) (cortar | quitar | cortarle) (un poco | un poquito | un poquitito | tantito)? mas [de (atras | los lados | arriba | adelante)] #h:more_off",
      "[un poco | un poquito | tantito] mas corto [de (atras | los lados | arriba | adelante)]", "(un poco | un poquito | tantito) mas", "(cortele | quitele | corte) (un poco | un poquito) mas",
      "(puede | podria | me puede) (emparejar | arreglar) (atras | los lados | arriba | la parte de atras) [un poquito]", "(le falta | falta) [un poco | un poquito] (de atras | de los lados | arriba)",
    ] },
    shorter_than: { patterns: [
      "(esta | quedó | lo veo) [@deg] mas corto de lo que (pensaba | queria | esperaba | dijimos | le pedi) #h:shorter", "(me | lo) cortó (demasiado | de mas | mucho | muy corto)", "(me | lo | me lo) (has cortado | ha cortado) (demasiado | de mas | mucho | muy corto)",
      "(esta | quedó) (muy | demasiado | super | bien) corto", "es (mas | mucho mas) de lo que dijimos", "no es lo que (queria | pedi | esperaba)", "(esta | quedó) (diferente | distinto)",
      "creo que (cortó | me cortó) (mucho | demasiado | de mas)", "(esta | quedó) [un poco | un poquito] corto",
      "(me lo | lo | me) (dejó | cortó) (muy | demasiado | super | bien) corto", "(me | le)? (cortó | quitó) (mas de lo que | mas de lo que le) (pedi | dije | dijimos)", "(esta | quedó) (mas corto | muy corto) de lo que (pedi | dije)",
      // "Sí, está más corto" agrees (a statement, never "cut more": more_off's "Más corto" is a request)
      "(esta | quedó | quedo) [un poco | un poquito | bastante | mucho] mas corto",
    ] },
    // "No está muy corto" / "No, está muy corto", "No me cortó demasiado" / "No, me cortó demasiado": the comma decides, so Paty asks
    short_amb_ctx: { patterns: ["no (esta | quedó | se ve | lo veo) [@deg] corto #amb", "no (me | le | lo | me lo)? cortó (mucho | demasiado | tanto | de mas) #amb", "no (me | me lo)? (has cortado | ha cortado) (mucho | demasiado | tanto | de mas) #amb", "no (me | lo | me lo)? dejó (muy | demasiado | tan | bien) corto #amb"] },
    polite_ok: { patterns: [
      "no pasa nada #h:grow_back", "ya crecerá #h:grow_back", "(el pelo | el cabello)? (crece | va a crecer | ya crece | vuelve a crecer) [rapido]", "(no se preocupe | no te preocupes) [ya crecerá | el pelo crece]",
      "aun asi me gusta #h:still_like", "(de todos modos | igual | aun asi) me gusta", "(igual | aun asi) se ve bien", "(esta bien | no importa) (me gusta | ya crecerá | crece rapido)",
      "no importa", "esta bien no importa", "[si] (un poco | un poquito) pero (esta bien | no pasa nada | no importa | me gusta | se ve bien)",
    ] },
    dont_like: { patterns: ["no me gusta #blunt", "no me (gusta | encanta | convence | gustó) [mucho | nada | el corte | como quedó]", "(lo odio | esta horrible | esta feo | quedó feo | quedó horrible | esta fatal) #blunt",
      "no (se ve | quedó) (bien | bonito)"] },

    // --- small talk ----------------------------------------------------------------------------
    react_funny: { patterns: [
      "[jaja | jajaja | ay] que (chistoso #h:funny | chistosa #h:funny | gracioso | graciosa | lindo | linda #h:cute | tierno | tierna | bonito | bonita | lista | inteligente | risa | divertido | loca | barbaro | mala | traviesa | tremenda | ocurrente)",
      "(jaja | jajaja | ja ja | no manches | no puede ser | en serio | de verdad | que risa | ay no | pobrecita | pobre gatita | wow | guau)",
      "(su gata | ella | canela) (es | parece) (muy | super | bien)? (lista | linda | chistosa | graciosa | traviesa | inteligente | tierna)", "los gatos son (muy | bien)? (chistosos | listos | locos | lindos | traviesos)",
      "(que | ay que) gata tan (lista | linda | chistosa | traviesa)",
    ] },
    ask_cat: { patterns: [
      "como se llama (su | tu | la) (gata | gatita | michi) #h:cat_name", "[y] como se llama #bare", "(cuantos anos tiene | que edad tiene) [su gata | canela | ella] #age",
      "(es | su gata es) (gato | gata | macho | hembra) #sex", "es (gato o gata | macho o hembra) #sex",
    ] },
    pets_ans: { patterns: [
      "[si] tengo (un perro | una perrita | un perrito | dos perros | perros) [tambien] #dog #h:pet", "[si] tengo (una gata | un gato | gatos | dos gatos) [tambien] #cat #h:pet_cat",
      "[si] tengo (un pez | peces | un perico | un loro | un conejo | un hamster | una tortuga) [tambien] #other", "[si] (un perro | una perrita | dos perros) #dog", "[si] (un gato | una gata | dos gatos) #cat",
      "yo tambien tengo (una gata | un gato | gatos) #cat", "[no] no tengo (mascotas | ninguna mascota | animales | perro | gato) #nopet #h:no_pets", "[no] (sin mascotas | ninguna) #nopet",
      "[no] ya no tengo (mascotas | perro | gato) #nopet", "(mis hijos tienen | tenemos | en casa tenemos) (un perro #dog | una gata #cat | un gato #cat | un hamster #other | un pez #other)",
      "[si] (un perro #dog | una gata #cat | un gato #cat) que se llama {name}", "(mi gato | mi gata) hace lo mismo #cat",
    ] },
    // "Ya no" (no pets any more): only at "¿Usted tiene mascotas?"
    pets_none_ctx: { patterns: ["[no] ya no", "[no] ya no tengo"] },
    weekend_ctx: { patterns: [
      "[si] voy a (una fiesta | una boda | un cumpleanos | una fiesta de cumpleanos | bailar) [el sabado | el domingo | este fin de semana | hoy en la noche | manana] #party #h:party",
      "[si] voy a (ir | salir) (a la playa | al cenote | a un cenote | a cenar | a tulum | a bucear) [con (unos | mis) amigos] [el sabado | el domingo | este fin de semana | manana]",
      "[si] voy a salir con (unos | mis) amigos #h:friends", "[si] voy a ver a (unos | mis) amigos", "[si] voy a (la playa | un concierto | el cenote | un cenote) [con (unos | mis) amigos]",
      "(nada especial | nada | nada en especial) [voy a descansar | me voy a quedar en casa] #relax #h:relax", "voy a descansar #relax", "(me voy a quedar | me quedo) en (casa | mi casa) #relax",
      "(tengo que | voy a) trabajar [el sabado | todo el fin de semana] #relax", "[si] tengo (una boda #party | una fiesta #party | una cena | planes) [el sabado | este fin de semana | el domingo]",
      "(mi | la) (hija | hijo | amiga | amigo | hermana | hermano | mama) (tiene | cumple) (una fiesta | una boda | su cumpleanos | anos) #party",
      "(vamos | voy) a (pescar | bucear | nadar | caminar | hacer snorkel | andar en bici) [el fin de semana]", "(viene | vienen) (mi familia | unos amigos) a visitarme", "(no se todavia | todavia no se | aun no se | no se que voy a hacer | no se que hacer) #unsure",
    ] },
    weekend_unknown: { patterns: ["[si] voy a {w:any}", "(quiero | me gustaria) ir a {w:any}", "voy a visitar a {w:any}"] },
    from_ans: { patterns: [
      "soy de estados unidos #far #h:from_us", "soy de canada #far #h:from_ca", "[soy] [de] @country #far", "(vengo de | soy originario de | soy originaria de | naci en) @country #far",
      "soy (estadounidense | americano | americana | canadiense | ingles | inglesa | irlandes | irlandesa | escoces | escocesa | australiano | australiana | neozelandes | neozelandesa | britanico | britanica | gringo | gringa) #far", "soy @nation #far",
      "no soy de aqui", "no soy de aqui soy de @country #far", "(me acabo de mudar | acabo de mudarme | me mudé) (aqui | a puerto colibri | al pueblo | hace poco) [de @country] #moved #h:from_moved",
      "(vivo | ya vivo) aqui [desde hace {n:number} (meses | anos)] #moved", "[soy de] @country pero vivo aqui #moved",
    ] },
    vacation_ctx: { patterns: [
      "[si] (quiero | me gustaria | pienso) ir a @place [@when_trip] #h:vacation", "[si] (voy | vamos) a (ir a)? @place [@when_trip]",
      "[si] voy a visitar a (mi familia | mis papas | mis padres | mis hijos | unos amigos) [en @country] [@when_trip] #h:vac_family",
      "(todavia no | aun no | no todavia) [lo se | tengo planes] #unsure #h:vac_not_yet", "[no] no tengo planes [todavia | este ano] #unsure", "[no] este ano no #relax",
      "(voy | regreso | vuelvo) a (casa | mi pais) [@when_trip]", "[si] [a] @trip [@when_trip] [tal vez | creo]", "[si] @when_trip [a] @trip", "(no se todavia | todavia no se | aun no se | no se a donde) #unsure",
    ] },
    // "¿Y usted?" answers the topic Paty asked; asked outright, the topic asked ("¿Usted es de aquí?")
    ask_jessie: { patterns: ["[y] usted [que va a hacer | que hace | que planes tiene | tiene planes]", "y usted que", "(que | y que) va a hacer usted", "y tu #tip:tu_staff",
      "[y] usted de donde es #from", "[y] de donde es usted #from", "(usted es | es usted) de aqui #from", "usted nacio aqui #from",
      "[y] usted tiene (mascotas | perro | perros | gato | gatos | otra mascota) #pets", "[y] usted (va a viajar | tiene planes de viajar | piensa viajar | viaja mucho) #vacation",
      "[y] usted que va a hacer (este fin de semana | el fin de semana) #weekend"] },

    // --- paying, tip, next time ----------------------------------------------------------------
    ask_owe: { patterns: [
      "cuanto le debo #h:owe", "cuanto (es | seria | va a ser | sale | cuesta) [todo | el corte | en total]", "(cuanto cuesta | que precio tiene | cuanto cobra) (el | un) (corte | despunte | lavado | secado | corte de fleco)",
      "cuanto (cuesta | cobra) (cortar | despuntar) (el fleco | el pelo | el cabello)", "cual es el (total | precio)", "cuanto", "cuanto te debo #tip:tu_staff", "cuanto (le doy | le pago)",
    ] },
    // "¿Tiene costo extra?", "¿Está incluido?", "¿Es aparte?": what an extra costs, never a yes to it
    extra_q: { patterns: [
      "(tiene | lleva) [algun] (costo | cargo) [extra | adicional | aparte]", "(cuesta | cobra | se cobra | se paga | es) (extra | aparte | adicional)", "(cuesta | cobra) (mas | algo mas)",
      "(esta | va | viene) incluido [en el corte | en el precio]", "(el lavado | el secado | eso | el fleco | el cafe | el agua) (esta | va | viene) incluido [en el corte | en el precio]",
      "(esta | va | viene) incluido (el lavado | el secado | el fleco | eso) [en el corte | en el precio]", "[el corte | el precio] incluye (el lavado | el secado | lavado | secado)",
      "(es | sale) gratis", "hay que pagar (extra | aparte | mas | algo mas)", "(lo cobra | me lo cobra | se cobra) aparte", "es (con | sin) costo",
    ] },
    // "¿Aceptan dólares?" (pesos only, the card), "¿Hay un cajero cerca?" (the bank across calle Ceiba)
    dollars_q: { patterns: ["(acepta | aceptan | toma | toman | recibe | reciben) (dolares | dolar)", "(puedo | se puede) pagar (en | con) dolares", "(en | con) dolares", "(le | se lo) (pago | puedo pagar) en dolares"] },
    atm_q: { patterns: ["(hay | sabe si hay) (un | algun)? cajero [automatico] [cerca | por aqui]", "donde (hay | esta) (un | el)? cajero [automatico] [mas cercano]"] },
    // "¿Tiene cambio de quinientos?"
    change_q: { patterns: ["(tiene | tendra) cambio [de {price} | de un billete de {price} | para {price}]", "(me puede | puede) cambiar un billete de {price}"] },
    // "¿Qué me recomienda?" at the service question
    recommend_q: { patterns: ["[no se] que me (recomienda | sugiere | aconseja)", "que (corte | estilo) me (recomienda | queda | quedaria)", "usted que (me recomienda | piensa | opina)"] },
    // "¿Cuánto se deja de propina?": a question, never a tip left
    tip_howmuch: { patterns: ["cuanto (se deja | se da | se acostumbra dejar | dejo | doy | le dejo) de propina", "(se deja | se acostumbra | se da) propina [aqui]", "cuanto es la propina [normalmente]", "cuanto (es | seria | sale | queda) con (la)? propina [incluida]",
      "(es normal | se acostumbra) dejar propina", "cuanto (se deja | se acostumbra | se acostumbra dejar | se da | le dejo | dejo) [normalmente | aqui]",
      "(la propina | el servicio) (esta | va | viene) (incluida | incluido)", "(esta | va | viene) incluida la propina"] },
    pay_card: { patterns: [
      "(puedo | se puede) pagar con tarjeta #h:pay_card", "con tarjeta #h:pay_card_short", "tarjeta", "(acepta | aceptan | toma | toman | recibe | reciben) tarjeta",
      "(pago | voy a pagar | le pago) con tarjeta", "(con)? tarjeta de (credito | debito)", "con (mi | la) tarjeta", "(aceptas | tomas) tarjeta #tip:tu_staff", "efectivo no [mejor] [con] tarjeta", "no (acepta | aceptan) tarjeta",
      "(tiene | tienen) terminal", "(acepta | aceptan) pago con tarjeta", "(puedo | se puede) pagar con (la)? terminal",
      "no (tengo | traigo) efectivo [pero] (acepta | aceptan | toma | toman | puedo pagar con) tarjeta",
      "no (en | con)? efectivo [no] [sino | mejor] (con)? tarjeta", "en efectivo no [sino | mejor] (con)? tarjeta",
    ] },
    // "¿Y si pago con tarjeta?" (a what-if) and "Ya pagué" (a past): never a payment
    pay_whatif: { patterns: ["(y si | que pasa si | que tal si) (pago | le pago | pagara | pagamos) (con tarjeta #card | en efectivo #cash | con efectivo #cash | con transferencia #transfer | por transferencia #transfer)"] },
    already_paid: { patterns: ["ya (pagué | le pagué | pagamos)", "ya (esta | quedó) pagado", "(pagué | le pagué) (con tarjeta | en efectivo | ya)"] },
    // "¿Me da un recibo?" / "¿Me da factura?"
    receipt_q: { patterns: ["(me da | me puede dar | me regala | tiene | me dan) (un | el | su)? (recibo | ticket | comprobante | nota)", "(necesito | quiero | quisiera) (un | el)? (recibo | ticket | comprobante)"] },
    no_receipt: { patterns: ["[no] no (necesito | quiero | ocupo) (el | un)? (recibo | ticket | comprobante)", "[no] sin (recibo | ticket)"] },
    invoice_q: { patterns: ["(me da | me puede dar | me puede hacer | dan | da | hacen | hace) factura", "(necesito | quiero | quisiera) (una)? factura", "(me | lo | se puede) facturar", "factura"] },
    no_card: { patterns: ["no (quiero | puedo) pagar con tarjeta", "no pago con tarjeta", "no (tengo | traigo) tarjeta", "sin tarjeta"] },
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] efectivo", "sin efectivo", "no (puedo | quiero) pagar en efectivo"] },
    pay_cash: { patterns: ["[puedo] pagar en efectivo", "en efectivo", "efectivo", "(pago | voy a pagar | le pago) en efectivo #h:pay_cash", "con efectivo", "tarjeta no [mejor] [en] efectivo",
      // "No con tarjeta, en efectivo": one pattern, so the card half never pays
      "no (con)? tarjeta [no] [sino | mejor] (en | con)? efectivo", "con tarjeta no [sino | mejor] (en | con)? efectivo"] },
    pay_phone: { patterns: [
      "(puedo | le puedo | se puede) (hacer | mandar) (una)? transferencia #h:pay_transfer", "(por | con) transferencia", "(acepta | aceptan) transferencia", "(le | se lo) (transfiero | deposito)",
      "(puedo | se puede) pagar con (el | mi)? (celular | telefono)", "con (el | mi)? (celular | telefono)", "(apple pay | google pay)", "(le pago | pago) (por | con) transferencia", "transferencia",
      "no (tengo | traigo) (tarjeta | efectivo) [pero] (acepta | aceptan | puedo hacer | le hago | le puedo hacer) [una] transferencia",
      "no (con tarjeta | en efectivo | con efectivo) [sino | mejor] (por | con) transferencia",
    ] },
    here_you_go: { patterns: ["aqui tiene #h:here_you_go", "aqui (esta | le dejo | le doy)", "tenga", "aqui tiene (mi tarjeta | el dinero)", "(aqui tiene | tenga | le doy | aqui le dejo) {price}",
      "tenga son {price}", "aqui (estan | tiene) los {price}"] },
    keep_change: { patterns: ["quedese con el cambio #h:keep_change", "(el cambio | el resto) es para usted", "(es | esto es) para usted #h:for_you", "(quedese con | quedate con) (el cambio | el resto | la feria)",
      "(tenga | aqui tiene) (su | la | una) propina", "(es | esto es) (su | la) propina"] },
    add_tip: { patterns: [
      "(puedo | le puedo) dejar (propina | una propina) #h:add_tip", "(quiero | quisiera | voy a) (dejar | dejarle | agregar | agregarle | poner) [una | la] propina",
      "le (dejo | agrego | pongo) [el] {p:number} por ciento [de propina] #h:tip_percent", "[el] {p:number} por ciento [de propina] #h:tip_10", "{p:number} por ciento (esta bien | esta perfecto) #h:tip_15",
      "(le dejo | le agrego | agregue | ponga) {price} (de propina | para usted)", "{price} de propina", "le (dejo | doy) [una] propina", "(tenga | aqui tiene) para su propina", "(agregue | agreguele | ponga | pongale) [la | una] propina",
    ] },
    no_tip: { patterns: ["[no] sin propina [esta vez | hoy]", "[no] no quiero [dejar] propina", "[no] no (voy a dejar | quiero dejar | dejo | quiero agregar) propina", "[no] (esta vez | hoy) no"] },
    book_when: { patterns: [
      "[si] en (seis semanas | un mes | dos meses | mes y medio | un mes y medio | cuatro semanas | tres semanas | {n:number} semanas | {n:number} meses) [a la misma hora | el mismo dia] [esta bien] #h:six_weeks",
      "[si] (dentro de | como en) (un mes | seis semanas | {n:number} semanas | dos meses)", "[si] (el mismo dia | a la misma hora) (el proximo mes | en un mes | en seis semanas)",
      "[si] (quiero | quisiera | puedo) agendar (mi proxima | otra | la proxima) cita #h:book_next", "[si] (agendeme | apunteme) [para] [dentro de] [un mes | seis semanas]", "agendame #tip:tu_staff",
      "mejor en (dos meses | un mes | seis semanas | {n:number} semanas)", "[si] (de una vez | si de una vez) (la agendo | agendamos)",
      "[si] [mejor] (el proximo mes | el mes que entra | el otro mes)",
    ] },
    // "Sí, pero más temprano" / "¿Puede ser a las once?" at "¿En seis semanas, a la misma hora?": booked, at another hour
    book_time_ctx: { patterns: [
      "[si] [en seis semanas | en un mes | ese dia | el mismo dia] [pero] [mejor] (mas temprano | un poco mas temprano | un poco mas tarde | en la manana | por la manana | en la tarde | por la tarde | temprano | a otra hora | a las {time})",
      "(puede ser | se puede | podria ser) (mas temprano | mas tarde | en la manana | en la tarde | a las {time})",
    ] },
    book_later: { patterns: [
      "[no] por ahora no #h:book_later", "[no] (despues | luego | mas tarde) (le llamo | le mando un mensaje | le escribo | le marco | agendo)",
      "[no] (le llamo | le marco | le escribo | le mando (un)? (mensaje | whatsapp)) (despues | luego | mas tarde | para agendar)", "[no] (tengo que | necesito) (revisar | ver | checar) mi (agenda | calendario | horario)",
      "[no] no se (mi horario | cuando puedo)", "[no] (le llamo | le marco | le escribo | le mando un mensaje | yo le aviso | le aviso)", "[no] no quiero agendar [todavia | ahorita | por ahora | otra cita]", "[no] (mejor)? (despues | luego) (agendo | veo)", "(puedo | se puede) agendar por (mensaje | whatsapp | telefono)",
      "(ahorita | ahora | hoy) no [gracias] [yo] [le (llamo | marco | escribo | aviso | mando un mensaje)] [despues | luego | mas tarde]", "[no] yo le (llamo | marco | escribo | aviso | mando un mensaje) [despues | luego | mas tarde | para agendar]",
    ] },
    // "¡Nos vemos en un mes!" at the end
    see_you: { patterns: ["[gracias] nos vemos (en un mes | en seis semanas | la proxima | pronto | el proximo mes)", "[gracias] hasta (la proxima | el proximo mes)"] },
    no_bangs: { patterns: [
      "[no] no (quiero | me corte | me toque | toque | corte) (el | mi)? (fleco | flequillo)", "[no] (el | mi) (fleco | flequillo) no", "[no] sin (fleco | flequillo)",
      "[no] (lo | el fleco | el flequillo) (estoy dejando | quiero dejar | dejo) crecer", "[no] (deje | dejeme) (el fleco | el flequillo) (asi | como esta)", "[no] no (lo toque | me lo toque | lo corte)",
      "[no] no quiero que me (corte | toque) el (fleco | flequillo)", "[no] no (tengo | traigo) (fleco | flequillo)",
      "[no] (el | mi) (fleco | flequillo) (dejelo | dejemelo | dejalo | lo dejamos) (asi | como esta | igual)",
    ] },
  },

  lines: {
    // --- check-in ------------------------------------------------------------------------------
    greet: [
      t("¡{m:Bienvenido|f:Bienvenida} | a | Estética Tijeras!", "Welcome | to | Tijeras Salon!", "Welcome to Tijeras Salon!"),
      t("¡Hola, | buenas! | ¡Pásele!", "Hello, | good (afternoon)! | Come in!", "Hi there! Come on in!",
        { flags: { 1: "buenas: short for buenas tardes, a friendly hello.", 2: "Mexican: pásele = come in." },
          neutral: t("¡Hola, | buenas! | ¡Adelante!", "Hello, | good (afternoon)! | Come in!", "Hi there! Come on in!", { flags: { 1: "buenas: short for buenas tardes, a friendly hello." } }),
        spain: t("¡Hola, | buenas! | ¡Pasa!", "Hello, | good (afternoon)! | Come in!", "Hi there! Come on in!") }),
    ],
    greet_back: [t("¡Qué | gusto | {m:verlo|f:verla} | otra vez!", "What a | pleasure | to see you | again!", "So nice to see you again!", { flags: { 2: "verlo / verla: to see you (a man / a woman)." },
        spain: t("¡Qué | alegría | verte | otra vez!", "How | nice | to see you | again!", "So nice to see you again!") })],
    greet_howareyou_line: [t("¡Hola, | buenas tardes! | ¿Cómo | está?", "Hello, | good afternoon! | How | are you?", "Hi, good afternoon! How are you?",
        { spain: t("¡Hola, | buenas tardes! | ¿Cómo | estás?", "Hello, | good afternoon! | How | are you?", "Hi, good afternoon! How are you?") })],
    ask_appt: [
      t("¿Tiene | cita?", "Do you have | (an) appointment?", "Do you have an appointment?",
        { spain: t("¿Tienes | cita?", "Do you have | (an) appointment?", "Do you have an appointment?") }),
      t("¿Usted | es | mi | cita | de las tres?", "You | are | my | appointment | at three?", "Are you my three o'clock?",
        { spain: t("¿Tú | eres | mi | cita | de las tres?", "You | are | my | appointment | at three?", "Are you my three o'clock?") }),
    ],
    ask_name: [
      t("¡Perfecto! | ¿A nombre de | quién?", "Perfect! | Under the name of | whom?", "Great! What's the name?"),
      t("Muy | bien. | ¿Me | da | su | nombre?", "Very | good. | (To) me | you-give | your | name?", "Okay. Can I get your name?",
        { spain: t("Muy | bien. | ¿Me | dices | tu | nombre?", "Very | good. | (To) me | you-give | your | name?", "Okay. Can I get your name?") }),
    ],
    name_again: [t("Perdón, | ¿a nombre de | quién | me | dijo?", "Sorry, | under the name of | whom | (to) me | you-said?", "Sorry, what was the name?",
        { spain: t("Perdona, | ¿a nombre de | quién | me | has dicho?", "Sorry, | under the name of | whom | (to) me | you-said?", "Sorry, what was the name?") })],
    appt_found: [
      t("Perfecto, | aquí | está | en | la | agenda.", "Perfect, | here | it-is | in | the | appointment book.", "Perfect, I've got you right here."),
      t("¡Listo! | Ya | {m:lo|f:la} | tengo | {m:anotado|f:anotada}.", "All set! | Already | you | I-have | written down.", "All set! I've got you down.", { flags: { 2: FLAG_LOLA },
        spain: t("¡Perfecto! | Ya | te | tengo | {m:apuntado|f:apuntada}.", "All set! | Already | you | I-have | written down.", "All set! I've got you down.") }),
    ],
    appt_other_time: [t("Ah, | yo | la | tenía | a las tres, | pero | no hay problema.", "Oh, | I | it | had | at three, | but | no problem.",
      "Oh, I had you down for three, but no problem!", { flags: { 2: "la = the appointment (la cita)." } })],
    no_appt_ok: [t("¡No hay problema!", "No problem!", "No problem!")],
    walkin_ok: [t("¡Qué | suerte! | En | este | momento | tengo | un | espacio.", "What | luck! | At | this | moment | I-have | a | slot.", "You're in luck! I have an opening right now.")],
    walkin_wait: [t("Tengo | una | clienta | antes. | Son | como | quince | minutos. | ¿Me | espera?", "I-have | a | client | before (you). | It's | about | fifteen | minutes. | (For) me | you-wait?",
      "I have a client before you. It'll be about fifteen minutes. Can you wait?",
        { spain: t("Tengo | una | clienta | antes. | Son | como | quince | minutos. | ¿Me | esperas?", "I-have | a | client | before (you). | It's | about | fifteen | minutes. | (For) me | you-wait?", "I have a client before you. It'll be about fifteen minutes. Can you wait?") })],
    wait_ok_line: [t("¡Perfecto! | Tome asiento, | ahorita | {m:lo|f:la} | atiendo.", "Perfect! | Have a seat, | in a moment | you | I-attend.", "Great! Have a seat, I'll be right with you.",
      { flags: { 2: "Mexican: ahorita = in a moment.", 3: FLAG_LOLA },
        neutral: t("¡Perfecto! | Tome asiento, | en un momento | {m:lo|f:la} | atiendo.", "Perfect! | Have a seat, | in a moment | you | I-attend.", "Great! Have a seat, I'll be right with you.", { flags: { 3: FLAG_LOLA } }),
        spain: t("¡Perfecto! | Siéntate, | ahora mismo | te | atiendo.", "Perfect! | Have a seat, | right now | you | I'll-see-to.", "Great! Have a seat, I'll be right with you.") })],
    come_back_now: [t("¡Listo, | ya | me | desocupé! | Pase | por aquí.", "Ready, | already | (myself) | I-got-free! | Come | this way.", "Okay, I'm free now! Come on back.",
      { flags: { 2: "desocuparse: to get free (from a job, a client)." },
        spain: t("¡Bueno, | ya | estoy | libre! | Pasa | por aquí.", "Okay, | now | I'm | free! | Come | this way.", "Okay, I'm free now! Come on through.") })],
    wait_no_line: [t("No se preocupe. | ¡Será | la | próxima!", "Don't worry. | It-will-be | the | next (time)!", "Don't worry. Maybe next time!",
        { spain: t("No te preocupes. | ¡Será | la | próxima!", "Don't worry. | It-will-be | the | next (time)!", "Don't worry. Maybe next time!") })],
    have_seat: [t("Siéntese | aquí, | por favor.", "Sit down | here, | please.", "Have a seat right here.",
        { spain: t("Siéntate | aquí, | por favor.", "Sit down | here, | please.", "Have a seat right here.") })],
    // "¿Usted es Paty?" / "¿Cómo se llama usted?"
    paty_name: [t("Soy | Paty, | ¡mucho gusto!", "I'm | Paty, | nice to meet you!", "I'm Paty. Nice to meet you!")],
    // "¿Cuánto tarda?": waiting for the client before, before the haircut, during it
    wait_mins: [t("Como | quince | minutos, | nada más.", "About | fifteen | minutes, | that's all.", "About fifteen minutes, that's all.")],
    cut_time: [t("Como | media | hora.", "About | half (an) | hour.", "About half an hour.")],
    almost_done: [t("¡Ya | casi | termino!", "Already | almost | I-finish!", "I'm almost done!")],

    // --- drink offer -------------------------------------------------------------------------
    offer_drink: [t("¿Le | ofrezco | un | vasito | de | agua | o | un | cafecito?", "(To) you | I-offer | a | little glass | of | water | or | a | little coffee?", "Can I get you some water or a coffee?",
      { flags: { 3: "Diminutives (vasito, cafecito) sound friendly here, not small." },
        spain: t("¿Te | ofrezco | un | vasito | de | agua | o | un | cafecito?", "(To) you | I-offer | a | little glass | of | water | or | a | little coffee?", "Can I get you some water or a coffee?") })],
    drink_again: [t("¿Y | le | traigo | algo | de | tomar?", "And | (for) you | I-bring | something | to | drink?", "And can I get you something to drink?",
        { spain: t("¿Y | te | traigo | algo | de | beber?", "And | (for) you | I-bring | something | to | drink?", "And can I get you something to drink?") })],
    drink_ok: [
      t("¡Claro, | ahorita | se lo | traigo!", "Sure, | right away | it to you | I-bring!", "Sure, coming right up!",
        { flags: { 1: "Mexican: ahorita = right away." }, neutral: t("¡Claro, | enseguida | se lo | traigo!", "Sure, | right away | it to you | I-bring!", "Sure, coming right up!"),
        spain: t("¡Claro, | enseguida | te lo | traigo!", "Sure, | right away | it to you | I-bring!", "Sure, coming right up!") }),
      t("¡Con gusto!", "With pleasure!", "Sure thing!"),
    ],
    // "¿Cuánto cuesta?" at the drink offer
    drink_free: [t("¡Es | cortesía | de | la | casa!", "It's | courtesy | of | the | house!", "It's on the house!", { flags: { 1: "cortesía (de la casa): free, on the house." } })],

    // --- service -------------------------------------------------------------------------------
    ask_service: [
      t("A ver, | ¿qué | se | va | a | hacer | hoy?", "Let's see, | what | (for yourself) | you-are-going | to | have done | today?", "Okay, so what are we doing today?",
        { flags: { 2: "hacerse algo: to have something done (to yourself): the salon's usual question." },
        spain: t("A ver, | ¿qué | te | hacemos | hoy?", "Let's see, | what | (for) you | we-do | today?", "So, what are we doing today?") }),
      t("¿Qué | le | hacemos | hoy?", "What | (for) you | we-do | today?", "What can I do for you today?",
        { spain: t("¿Qué | te | hacemos | hoy?", "What | (for) you | we-do | today?", "What can I do for you today?") }),
    ],
    what_in_mind: [t("¡Claro! | ¿Y | cómo | lo | quiere?", "Sure! | And | how | it | you-want?", "Sure! And what did you have in mind?", { flags: { 3: "lo = the haircut (el corte)." },
        spain: t("¡Claro! | ¿Y | cómo | lo | quieres?", "Sure! | And | how | it | you-want?", "Sure! And what did you have in mind?") })],
    trim_ok: [t("Claro, | nada más | despuntar.", "Sure, | just | trim the ends.", "Sure, just a trim.",
        { spain: t("Claro, | solo | despuntar.", "Sure, | just | trim the ends.", "Sure, just a trim.") }), t("¡Muy | fácil!", "Very | easy!", "Easy!")],
    wash_trim_ok: [t("¡Claro! | Lavado | y | despunte.", "Sure! | Wash | and | trim.", "Sure! A wash and a trim.")],
    short_ok: [t("¡Ay, | un | cambio | de | look! | Me encanta.", "Ooh, | a | change | of | look! | I love it.", "Ooh, a new look! I love it.")],
    photo_ok: [t("¡Ay, | qué | bonito! | Sí | se lo | puedo | hacer.", "Oh, | how | pretty! | Yes | it for you | I-can | do.", "Oh, that's cute! I can do that.",
        { spain: t("¡Ay, | qué | bonito! | Sí | te lo | puedo | hacer.", "Oh, | how | pretty! | Yes | it for you | I-can | do.", "Oh, that's cute! I can do that.") })],
    bangs_ok: [t("¡Claro! | Nada más | el | fleco.", "Sure! | Just | the | bangs.", "Sure! Just the bangs.", { flags: { 3: FLAG_FLECO },
      neutral: t("¡Claro! | Nada más | el | flequillo.", "Sure! | Just | the | bangs.", "Sure! Just the bangs."),
        spain: t("¡Claro! | Solo | el | flequillo.", "Sure! | Just | the | bangs.", "Sure! Just the bangs.") })],
    not_short_ok: [t("No se preocupe, | no le corto | mucho.", "Don't worry, | I won't cut (you) | much.", "Don't worry, I won't take too much off.",
        { spain: t("No te preocupes, | no te corto | mucho.", "Don't worry, | I won't cut (you) | much.", "Don't worry, I won't take too much off.") })],

    // --- how much off ------------------------------------------------------------------------
    ask_length: [
      t("¿Cuánto | le | corto?", "How much | (for) you | I-cut?", "How much should I take off?",
        { spain: t("¿Cuánto | te | corto?", "How much | (for) you | I-cut?", "How much should I take off?") }),
      t("¿Y | cuánto | le | quito | de | largo?", "And | how much | (from) you | I-take-off | of | length?", "And how much are we taking off?",
        { spain: t("¿Y | cuánto | te | quito | de | largo?", "And | how much | (from) you | I-take-off | of | length?", "And how much are we taking off?") }),
    ],
    len_ends: [t("Muy | bien, | nada más | las | puntas.", "Very | good, | just | the | ends.", "Okay, just the ends.",
        { spain: t("Muy | bien, | solo | las | puntas.", "Very | good, | just | the | ends.", "Okay, just the ends.") })],
    len_little: [t("Muy | bien, | nada más | un poquito.", "Very | good, | just | a little.", "Okay, just a little.",
        { spain: t("Muy | bien, | solo | un poquito.", "Very | good, | just | a little.", "Okay, just a little.") })],
    len_cm: [t("Muy | bien, | {$cm} | centímetros.", "Very | good, | {$cm} | centimeters.", "Okay, {$cm} centimeters.")],
    len_cm1: [t("Muy | bien, | nada más | un | centímetro.", "Very | good, | just | one | centimeter.", "Okay, just one centimeter.",
        { spain: t("Muy | bien, | solo | un | centímetro.", "Very | good, | just | one | centimeter.", "Okay, just one centimeter.") })],
    len_cm15: [t("Muy | bien, | un | centímetro | y medio.", "Very | good, | one | centimeter | and a half.", "Okay, a centimeter and a half.")],
    len_cm_half: [t("Muy | bien, | {$num} | centímetros | y medio.", "Very | good, | {$num} | centimeters | and a half.", "Okay, {$num} and a half centimeters.")],
    len_dedo: [t("Muy | bien, | como | un | dedo.", "Very | good, | like | one | finger.", "Okay, about a finger's width.")],
    len_dedo_n: [t("Muy | bien, | como | {$num} | dedos.", "Very | good, | like | {$num} | fingers.", "Okay, about {$num} fingers' width.")],
    len_shoulders: [t("Muy | bien, | a | los | hombros.", "Very | good, | to | the | shoulders.", "Okay, to your shoulders.")],
    less_line: [t("Muy | bien, | ¿cuánto | le | corto, | entonces?", "Very | good, | how much | (for) you | I-cut, | then?", "Okay, how much should I take off, then?",
        { spain: t("Muy | bien, | ¿cuánto | te | corto, | entonces?", "Very | good, | how much | (for) you | I-cut, | then?", "Okay, how much should I take off, then?") })],
    recommend: [t("Con | este | calor, | algo | fresco | queda | muy | bien. | ¿Le | despunto | nada más, | o | algo | más | corto?",
      "With | this | heat, | something | cool | looks | very | good. | (For) you | I-trim | just, | or | something | more | short?",
      "With this heat, something light looks great. Just a trim, or something shorter?",
        { spain: t("Con | este | calor, | algo | fresco | queda | muy | bien. | ¿Te | despunto | solo, | o | algo | más | corto?", "With | this | heat, | something | cool | looks | very | good. | (For) you | I-trim | just, | or | something | more | short?", "With this heat, something light looks great. Just a trim, or something shorter?") })],
    len_sides: [t("Claro, | más | corto | de | los | lados.", "Sure, | more | short | on | the | sides.", "Sure, shorter on the sides.")],
    inch_1: [t("¿Una | pulgada? | Son | como | dos | centímetros | y medio.", "One | inch? | It's | about | two | centimeters | and a half.", "An inch? That's about two and a half centimeters.")],
    inch_half: [t("¿Media | pulgada? | Es | como | un | centímetro.", "Half | inch? | It's | about | one | centimeter.", "Half an inch? That's about one centimeter.")],
    inch_15: [t("¿Una | pulgada | y media? | Son | como | cuatro | centímetros.", "One | inch | and a half? | It's | about | four | centimeters.", "An inch and a half? That's about four centimeters.")],
    inch_n: [t("¿{$num} | pulgadas? | Son | como | {$cm} | centímetros.", "{$num} | inches? | It's | about | {$cm} | centimeters.", "{$num} inches? That's about {$cm} centimeters.")],
    cm_note: [t("Aquí | medimos | en | centímetros.", "Here | we-measure | in | centimeters.", "We use centimeters here.")],
    cm_big: [t("¿{$cm} | centímetros? | ¡Va | a | ser | un | cambio | grande!", "{$cm} | centimeters? | It's going | to | be | a | change | big!", "{$cm} centimeters? That's a big change!")],
    // more than 20 cm (or 8 inches): no number Paty could misquote
    cm_huge: [t("¿Tanto? | ¡Va | a | ser | un | cambio | grande!", "That much? | It's going | to | be | a | change | big!", "That much? That's a big change!")],
    cm_confirm: [t("¿Le | parece | bien?", "(To) you | it-seems | good?", "Is that okay?",
        { spain: t("¿Te | parece | bien?", "(To) you | it-seems | good?", "Is that okay?") })],
    ask_tool: [t("¿Con | máquina | o | con | tijera?", "With | clippers | or | with | scissors?", "Clippers or scissors?",
      { flags: { 1: "la máquina: hair clippers; its guard is a number (“del dos” = a number two)." } })],
    tool_machine: [t("Muy | bien, | con | máquina.", "Very | good, | with | clippers.", "Okay, clippers.")],
    tool_number: [t("Muy | bien, | máquina | del | {$num}.", "Very | good, | clippers | of the | {$num}.", "Okay, a number {$num} guard.", { flags: { 3: "del dos: the clipper guard's number (a higher number leaves it longer)." } })],
    tool_scissors: [t("Muy | bien, | con | tijera.", "Very | good, | with | scissors.", "Okay, scissors.")],
    tool_both: [t("Perfecto: | los | lados | con | máquina | y | arriba | con | tijera.", "Perfect: | the | sides | with | clippers | and | on top | with | scissors.", "Perfect: clippers on the sides and scissors on top.")],
    tool_choose: [t("Entonces | con | tijera, | queda | más | natural.", "Then | with | scissors, | it-turns-out | more | natural.", "Scissors, then: it looks more natural.")],
    ask_layers: [t("¿Le | dejo | las | capas?", "(For) you | I-leave | the | layers?", "Do you want to keep your layers?",
        { spain: t("¿Te | dejo | las | capas?", "(For) you | I-leave | the | layers?", "Do you want to keep your layers?") })],
    ask_bangs: [t("¿Le | despunto | también | el | fleco?", "(For) you | I-trim | also | the | bangs?", "Should I trim your bangs too?", { flags: { 4: FLAG_FLECO },
      neutral: t("¿Le | despunto | también | el | flequillo?", "(For) you | I-trim | also | the | bangs?", "Should I trim your bangs too?"),
        spain: t("¿Te | despunto | también | el | flequillo?", "(For) you | I-trim | also | the | bangs?", "Should I trim your bangs too?") })],
    ack: [t("Perfecto.", "Perfect.", "Got it."), t("Claro.", "Sure.", "Sure."), t("De acuerdo.", "Agreed.", "Okay.")],
    // "¿Cuánto cuesta?" / "¿Tiene costo?" at "¿Le despunto también el fleco?": the bangs come with the haircut
    bangs_included: [t("Va | incluido | en | el | corte.", "It-goes | included | in | the | haircut.", "That's included with the haircut.",
      { flags: { 0: "ir + a participle: “va incluido” = it comes included." } })],
    // rule 17: "Está bien, gracias" at the wash, the blow-dry, the card reader's tip (and the drink offer)
    yes_check: [t("Perdón, | ¿entonces | sí?", "Sorry, | so | yes?", "Sorry, is that a yes?",
        { spain: t("Perdona, | ¿entonces | sí?", "Sorry, | so | yes?", "Sorry, is that a yes?") })],

    // --- wash ---------------------------------------------------------------------------------
    ask_wash: [t("¿Le | lavo | el | cabello | primero?", "(For) you | I-wash | the | hair | first?", "Would you like a wash first?",
        { spain: t("¿Te | lavo | el | pelo | primero?", "(For) you | I-wash | the | hair | first?", "Would you like a wash first?") })],
    wash_start: [t("Vamos | al | lavabo.", "Let's go | to the | sink.", "Let's start at the sink."), t("Bueno, | empezamos | con | el | lavado.", "Well, | we-start | with | the | wash.", "Great, let's start with a wash.")],
    ask_water: [t("¿Cómo | está | el | agua?", "How | is | the | water?", "How's the water temperature?"),
      t("¿Está | bien | el | agua?", "Is | good | the | water?", "Is the water okay?")],
    water_fix_hot: [t("¡Ay, | perdón! | ¿Y | así?", "Oh, | sorry! | And | like this?", "Oops, sorry! Is that better?",
        { spain: t("¡Ay, | perdona! | ¿Y | así?", "Oh, | sorry! | And | like this?", "Oops, sorry! Is that better?") })],
    water_fix_cold: [t("¡Ay, | perdón! | Se la | pongo | más | calientita.", "Oh, | sorry! | It for you | I-make | more | warm.", "Oh, sorry! I'll make it warmer.",
      { flags: { 2: "se la: la = the water (el agua is feminine).", 5: "calientita: diminutive of caliente, nice and warm." },
        spain: t("¡Ay, | perdona! | Te la | pongo | más | calentita.", "Oh, | sorry! | It for you | I-make | more | warm.", "Oh, sorry! I'll make it warmer.") })],
    water_good: [t("¡Qué bueno!", "Great!", "Great!",
        { spain: t("¡Qué bien!", "Great!", "Great!") }), t("¡Ah, | perfecto!", "Oh, | perfect!", "Oh, perfect!")],
    no_wash_ok: [t("No hay problema, | nada más | se lo | mojo | un poco.", "No problem, | just | it (for you) | I-wet | a little.", "No problem, I'll just dampen it a little.",
        { spain: t("No hay problema, | solo | te lo | mojo | un poco.", "No problem, | just | it (for you) | I-wet | a little.", "No problem, I'll just dampen it a little.") })],

    // --- small talk ----------------------------------------------------------------------------
    cat_story: [
      t("¡Mi | gata | tiró | mi | café | de | la | mesa | esta | mañana!", "My | cat | knocked | my | coffee | off | the | table | this | morning!", "My cat knocked my coffee off the table this morning!",
        { spain: t("¡Mi | gata | ha tirado | mi | café | de | la | mesa | esta | mañana!", "My | cat | knocked | my | coffee | off | the | table | this | morning!", "My cat knocked my coffee off the table this morning!") }),
      t("¡Mi | gata | aprendió | a | abrir | el | refrigerador!", "My | cat | learned | to | open | the | fridge!", "My cat learned how to open the fridge!",
        { spain: t("¡Mi | gata | ha aprendido | a | abrir | la | nevera!", "My | cat | learned | to | open | the | fridge!", "My cat learned how to open the fridge!") }),
      t("¡Mi | gata | se duerme | en | mi | cabeza | todas las noches!", "My | cat | sleeps | on | my | head | every night!", "My cat sleeps on my head every night!"),
    ],
    cat_anyway: [t("Bueno, | en fin.", "Well, | anyway.", "Anyway!")],
    cat_name: [t("¡Canela! | Es | bien | traviesa.", "Canela! | She's | really | naughty.", "Canela! She's a little troublemaker.",
      { flags: { 0: "Canela: “Cinnamon”, the cat's name.", 2: "bien before an adjective: “really” (very common in Mexico)." },
        spain: t("¡Canela! | Es | muy | traviesa.", "Canela! | She's | really | naughty.", "Canela! She's a little troublemaker.") })],
    cat_age: [t("Tiene | tres | años. | ¡Y | es | bien | traviesa!", "She-has | three | years. | And | she's | really | naughty!", "She's three. And she's a little troublemaker!",
      { flags: { 0: "Age with tener: “she has three years”." },
        spain: t("Tiene | tres | años. | ¡Y | es | muy | traviesa!", "She-has | three | years. | And | she's | really | naughty!", "She's three. And she's a little troublemaker!") })],
    cat_sex: [t("Es | gata. | Se llama | Canela.", "She's | (a) female cat. | Her name is | Canela.", "She's a girl. Her name's Canela.")],
    cat_laugh: [t("¿Verdad | que | sí?", "Right | that | yes?", "I know, right?"), t("¡Sí, | es | tremenda!", "Yes, | she's | a handful!", "I know, she's a handful!")],
    ask_pets: [t("¿Usted | tiene | mascotas?", "You | have | pets?", "Do you have any pets?",
        { spain: t("¿Tú | tienes | mascotas?", "You | have | pets?", "Do you have any pets?") })],
    react_dog: [t("¡Ay, | me encantan | los | perros!", "Oh, | I love | — | dogs!", "Aw, I love dogs!", { flags: { 2: "Spanish uses the article for things in general (los perros = dogs)." } })],
    react_cat: [t("¡Ah, | también | le gustan | los | gatos! | ¡Lo | sabía!", "Oh, | also | you like | — | cats! | It | I-knew!", "A cat person! I knew it!", { flags: { 3: "Spanish uses the article for things in general (los gatos = cats)." },
        spain: t("¡Ah, | también | te gustan | los | gatos! | ¡Lo | sabía!", "Oh, | also | you like | — | cats! | It | I-knew!", "A cat person! I knew it!", { flags: { 3: "Spanish uses the article for things in general (los gatos = cats)." } }) })],
    react_nopet: [t("¡Debería | tener | un | gatito!", "You-should | have | a | kitten!", "You should get a cat!",
        { spain: t("¡Deberías | tener | un | gatito!", "You-should | have | a | kitten!", "You should get a cat!") })],
    ask_weekend: [t("¿Y | qué | va | a | hacer | este | fin de semana?", "And | what | you-are-going | to | do | this | weekend?", "So, are you doing anything fun this weekend?",
        { spain: t("¿Y | qué | vas | a | hacer | este | fin de semana?", "And | what | you-are-going | to | do | this | weekend?", "So, are you doing anything fun this weekend?") })],
    ask_from: [t("¿Y | usted | de | dónde | es?", "And | you | from | where | are?", "So, where are you from?",
        { spain: t("¿Y | tú | de | dónde | eres?", "And | you | from | where | are?", "So, where are you from?") })],
    ask_vacation: [t("¿Y | tiene | planes | de | viajar | este | año?", "And | do you have | plans | to | travel | this | year?", "Any travel plans this year?",
        { spain: t("¿Y | tienes | planes | de | viajar | este | año?", "And | do you have | plans | to | travel | this | year?", "Any travel plans this year?") })],
    react_fun: [
      t("¡Ay, | qué | padre!", "Oh, | how | cool!", "Oh, fun!", { flags: { 2: "Mexican: padre = cool, great." }, neutral: t("¡Ay, | qué | bien!", "Oh, | how | nice!", "Oh, nice!") }),
      t("¡Qué | bonito!", "How | lovely!", "That sounds nice!"),
      t("¡Ah, | qué | bien!", "Oh, | how | good!", "Oh, cool!"),
    ],
    react_party: [t("¡Uy, | qué | divertido! | Con | este | corte | va | a | ir | {m:guapísimo|f:guapísima}.", "Ooh, | how | fun! | With | this | haircut | you're-going | to | go | very good-looking.",
      "Ooh, fun! You'll look great with this haircut.",
        { spain: t("¡Uy, | qué | divertido! | Con | este | corte | vas | a | ir | {m:guapísimo|f:guapísima}.", "Ooh, | how | fun! | With | this | haircut | you're-going | to | go | very good-looking.", "Ooh, fun! You'll look great with this haircut.") })],
    react_relax: [t("¿A | descansar? | ¡Eso | también | se vale!", "To | rest? | That | also | counts!", "Just relaxing? That sounds nice too!",
      { flags: { 4: "se vale: “that's fair, that counts”, very common in Mexico." },
        spain: t("¿A | descansar? | ¡Eso | también | hace falta!", "To | rest? | That | also | is needed!", "Some rest? You need that too!") })],
    react_unsure: [t("Bueno, | ¡todavía | hay | tiempo!", "Well, | still | there-is | time!", "Well, there's still time!")],
    react_far: [t("¡Ah, | qué | bien! | Yo | nunca | he | ido.", "Oh, | how | nice! | I | never | have | gone.", "Oh, cool! I've never been there.")],
    react_moved: [t("¡Ah, | {m:bienvenido|f:bienvenida} | al | pueblo!", "Oh, | welcome | to the | town!", "Oh, welcome to town!")],
    jessie_from: [t("¿Yo? | Soy | de | aquí. | Nací | en | el | pueblo.", "Me? | I'm | from | here. | I-was-born | in | the | town.", "Me? I'm from here. I was born in this town.")],
    jessie_vacation: [t("¿Yo? | Me encantaría | ir | a | Bacalar, | pero | no sé | cuándo.", "Me? | I'd love | to go | to | Bacalar, | but | I don't know | when.", "Me? I'd love to go to Bacalar, but I don't know when.",
      { flags: { 1: "me encantaría: I'd love to (encantar works like gustar)." } })],
    jessie_pets: [t("¿Yo? | Nada más | tengo | a | Canela, | ¡y | con | ella | basta!", "Me? | Just | I-have | — | Canela, | and | with | her | it's enough!", "Me? Just Canela, and she's plenty!",
      { flags: { 3: "Personal a: Spanish puts a before a pet it treats as a person." },
        spain: t("¿Yo? | Solo | tengo | a | Canela, | ¡y | con | ella | basta!", "Me? | Just | I-have | — | Canela, | and | with | her | it's enough!", "Me? Just Canela, and she's plenty!") })],
    jessie_weekend: [t("¿Yo? | Nada más | voy | a | estar | en | mi | casa | con | mi | gata.", "Me? | Just | I'm-going | to | be | at | my | house | with | my | cat.",
      "Me? I'm just hanging out at home with my cat.",
        { spain: t("¿Yo? | Solo | voy | a | estar | en | mi | casa | con | mi | gata.", "Me? | Just | I'm-going | to | be | at | my | house | with | my | cat.", "Me? I'm just hanging out at home with my cat.") })],

    // --- blow-dry and style ------------------------------------------------------------------
    ask_blowdry: [
      t("¿Se lo | seco?", "It for you | I-dry?", "Should I blow-dry it?", { flags: { 0: "se lo: lo = your hair (el cabello)." },
        spain: t("¿Te lo | seco?", "It for you | I-dry?", "Should I blow-dry it?") }),
      t("¿Quiere | que | se lo | seque?", "You-want | that | it for you | I-dry?", "Do you want me to blow-dry it?",
        { spain: t("¿Quieres | que | te lo | seque?", "You-want | that | it for you | I-dry?", "Do you want me to blow-dry it?") }),
    ],
    ask_style: [t("¿Lacio | o | con | ondas?", "Straight | or | with | waves?", "Straight, or with some waves?", { flags: { 0: "lacio: straight (of hair)." },
        spain: t("¿Liso | o | con | ondas?", "Straight | or | with | waves?", "Straight, or with some waves?") })],
    style_ok: [t("¡Claro que sí!", "Of course!", "You got it!"), t("¡Con gusto!", "With pleasure!", "Sure thing!")],
    no_dry_ok: [t("Muy | bien, | al | natural.", "Very | good, | — | natural.", "Okay, natural it is.", { flags: { 2: "al natural: “natural”, left to dry by itself (al has no word of its own here)." } })],

    // --- the result ----------------------------------------------------------------------------
    reveal: [
      t("¡Listo! | Mírese. | ¿Qué | le | parece?", "Done! | Look at yourself. | What | (to) you | it-seems?", "All done! Take a look. What do you think?",
        { spain: t("¡Ya | estás! | Mírate. | ¿Qué | te | parece?", "Now | you're-done! | Look at yourself. | What | (to) you | it-seems?", "All done! Take a look. What do you think?") }),
      t("Ya | quedó. | ¿Cómo | lo | ve?", "Already | it-turned-out. | How | it | you-see?", "Okay, all done! How do you like it?",
        { flags: { 1: "quedar: to turn out (“¿Cómo quedó?” = how did it turn out?).", 3: "lo = the haircut (el corte)." },
        spain: t("Ya | está. | ¿Cómo | lo | ves?", "Already | it-is (done). | How | it | you-see?", "Okay, all done! How do you like it?") }),
    ],
    reveal_short: [t("Ay... | creo | que | le | corté | un poquito | más | de | lo que | dijimos.", "Oh… | I-think | that | (for) you | I-cut | a little | more | than | what | we-said.",
      "Oh… I think I took off a bit more than we said.",
        { spain: t("Ay... | creo | que | te | he cortado | un poquito | más | de | lo que | dijimos.", "Oh… | I-think | that | (for) you | I-cut | a little | more | than | what | we-said.", "Oh… I think I took off a bit more than we said.") })],
    // "¿Cuánto más?"
    short_more: [t("Como | un | centímetro | más. | ¡Perdóneme!", "About | one | centimeter | more. | Forgive me!", "About a centimeter more. I'm so sorry!",
        { spain: t("Como | un | centímetro | más. | ¡Perdóname!", "About | one | centimeter | more. | Forgive me!", "About a centimeter more. I'm so sorry!") })],
    love_reply: [t("¡Qué bueno! | Me | da | mucho | gusto.", "Great! | (To) me | it-gives | much | pleasure.", "Yay! I'm so glad!",
        { spain: t("¡Qué bien! | Me | alegro | mucho.", "How nice! | (I) | am glad | a lot.", "I'm so glad!") }),
      t("¡Le queda | muy | bien!", "It suits you | very | well!", "It really suits you!",
        { spain: t("¡Te queda | muy | bien!", "It suits you | very | well!", "It really suits you!") })],
    reveal_again: [t("¿Y | qué | le | parece | el | corte?", "And | what | (to) you | it-seems | the | haircut?", "So, what do you think of the haircut?",
        { spain: t("¿Y | qué | te | parece | el | corte?", "And | what | (to) you | it-seems | the | haircut?", "So, what do you think of the haircut?") })],
    pay_how: [t("¿Cómo | va | a | pagar?", "How | you-are-going | to | pay?", "How would you like to pay?",
        { spain: t("¿Cómo | vas | a | pagar?", "How | you-are-going | to | pay?", "How would you like to pay?") })],
    not_paid_yet: [t("Todavía | no me ha | pagado: | son | {$price}.", "Still | you haven't | paid (me): | it's | {$price}.", "You haven't paid yet: it's {$price}.",
        { spain: t("Todavía | no me has | pagado: | son | {$price}.", "Still | you haven't | paid (me): | it's | {$price}.", "You haven't paid yet: it's {$price}.") })],
    pay_later: [t("Primero | terminamos | y | luego | me | paga.", "First | we-finish | and | then | me | you-pay.", "Let's finish first, then you can pay.",
        { spain: t("Primero | terminamos | y | luego | me | pagas.", "First | we-finish | and | then | me | you-pay.", "Let's finish first, then you can pay.") })],
    more_ok: [t("¡Claro! | Un poquito | más.", "Sure! | A little | more.", "Sure! Just a little more.")],
    more_done: [t("¿Y | ahora, | qué tal?", "And | now, | how's that?", "How's that?")],
    amb_result: [t("Perdón, | ¿le gusta | así, | o | le | cambio | algo?", "Sorry, | do you like it | like this, | or | (for) you | I-change | something?",
      "Sorry, do you like it like this, or should I change something?",
        { spain: t("Perdona, | ¿te gusta | así, | o | te | cambio | algo?", "Sorry, | do you like it | like this, | or | (for) you | I-change | something?", "Sorry, do you like it like this, or should I change something?") })],
    sorry_short: [t("¡Ay, | no, | perdóneme!", "Oh, | no, | forgive me!", "Oh no, I'm so sorry!",
        { spain: t("¡Ay, | no, | perdóname!", "Oh, | no, | forgive me!", "Oh no, I'm so sorry!") })],
    grows_fast: [t("Crece | rápido, | se lo | prometo.", "It-grows | fast, | it to you | I-promise.", "It'll grow back fast, I promise.",
        { spain: t("Crece | rápido, | te lo | prometo.", "It-grows | fast, | it to you | I-promise.", "It'll grow back fast, I promise.") })],
    discount: [t("Le | hago | un | descuento | de | {$amount}.", "(For) you | I-make | a | discount | of | {$amount}.", "Let me take {$amount} off.",
        { spain: t("Te | hago | un | descuento | de | {$amount}.", "(For) you | I-make | a | discount | of | {$amount}.", "Let me take {$amount} off.") })],
    polite_reply: [t("¡Ay, | qué | amable!", "Oh, | how | kind!", "Aw, you're so sweet!"),
      t("Gracias | por | ser | tan | {m:comprensivo|f:comprensiva}.", "Thanks | for | being | so | understanding.", "Thank you for being so nice about it.")],
    dont_like_reply: [t("¡Ay, | no! | ¿Qué | quiere | que | le | cambie?", "Oh, | no! | What | you-want | that | (for) you | I-change?", "Oh no! What would you like me to change?",
        { spain: t("¡Ay, | no! | ¿Qué | quieres | que | te | cambie?", "Oh, | no! | What | you-want | that | (for) you | I-change?", "Oh no! What would you like me to change?") })],

    // --- paying ------------------------------------------------------------------------------------
    price_cut: [t("El | corte | cuesta | {$price}.", "The | haircut | costs | {$price}.", "A haircut is {$price}.")],
    price_bangs: [t("Cortar | el | fleco | cuesta | {$price}.", "To cut | the | bangs | costs | {$price}.", "A bangs trim is {$price}.", { flags: { 2: FLAG_FLECO },
      neutral: t("Cortar | el | flequillo | cuesta | {$price}.", "To cut | the | bangs | costs | {$price}.", "A bangs trim is {$price}.") })],
    price_extras: [t("El | lavado | y | el | secado | son | cincuenta | pesos | más | cada uno.", "The | wash | and | the | blow-dry | are | fifty | pesos | more | each.",
      "A wash or a blow-dry is fifty pesos extra.")],
    tip_later: [t("Claro, | la | puede | dejar | cuando | pague.", "Sure, | it | you-can | leave | when | you-pay.", "Sure, you can add it when you pay.", { flags: { 1: "la = la propina (the tip)." },
        spain: t("Claro, | la | puedes | dejar | cuando | pagues.", "Sure, | it | you-can | leave | when | you-pay.", "Sure, you can add it when you pay.", { flags: { 1: "la = la propina (the tip)." } }) })],
    tip_info: [t("Lo que | usted | guste. | Mucha | gente | deja | un | diez | por ciento.", "What | you | like. | Many | people | leave | a | ten | percent.",
      "Whatever you like. A lot of people leave about ten percent.",
        { spain: t("Lo que | tú | quieras. | Mucha | gente | deja | un | diez | por ciento.", "What | you | like. | Many | people | leave | a | ten | percent.", "Whatever you like. A lot of people leave about ten percent.") })],
    book_first: [t("Claro, | eso | lo | vemos | al | final.", "Sure, | that | it | we-see | at the | end.", "Sure, let's do that at the end.")],
    total_full: [t("Son | {$price}, | con | el | lavado | y | el | secado.", "It's | {$price}, | with | the | wash | and | the | blow-dry.", "That'll be {$price}, with the wash and blow-dry.")],
    total_plain: [t("Son | {$price}.", "It's | {$price}.", "That'll be {$price}."), t("Serían | {$price}.", "It would be | {$price}.", "That comes to {$price}.")],
    short_cash: [t("Perdón, | son | {$total}.", "Sorry, | it's | {$total}.", "Sorry, it's {$total}.")],
    card_tip: [t("Acerque | su | tarjeta | aquí. | La | terminal | le | pregunta | si | quiere | dejar | propina.", "Bring close | your | card | here. | The | card reader | (to) you | asks | if | you-want | to leave | (a) tip.",
      "Just tap your card here. The card reader will ask about a tip.",
        { spain: t("Acerca | tu | tarjeta | aquí. | El | datáfono | te | pregunta | si | quieres | dejar | propina.", "Bring close | your | card | here. | The | card reader | (to) you | asks | if | you-want | to leave | (a) tip.", "Just tap your card here. The card reader will ask about a tip.") })],
    receipt_line: [t("Claro, | aquí tiene | su | recibo.", "Sure, | here you have | your | receipt.", "Sure, here's your receipt.",
        { spain: t("Claro, | aquí tienes | tu | recibo.", "Sure, | here you have | your | receipt.", "Sure, here's your receipt.") })],
    receipt_after: [t("Claro, | cuando | pague | se lo | doy.", "Sure, | when | you-pay | it to you | I-give.", "Sure, I'll give you one when you pay.",
        { spain: t("Claro, | cuando | pagues | te lo | doy.", "Sure, | when | you-pay | it to you | I-give.", "Sure, I'll give you one when you pay.") })],
    invoice_line: [t("Claro. | Mándeme | sus | datos | fiscales | por | mensaje | y | se la | hago.", "Sure. | Send me | your | details | tax | by | message | and | it for you | I-make.",
      "Sure. Send me your tax details by message and I'll make it out.", { flags: { 3: "datos fiscales: the details a Mexican tax invoice (factura) needs, like the RFC (tax ID)." },
        spain: t("Claro. | Mándame | tus | datos | fiscales | por | mensaje | y | te la | hago.", "Sure. | Send me | your | details | tax | by | message | and | it for you | I-make.", "Sure. Send me your tax details by message and I'll make it out.") })],
    no_cash_line: [t("No hay problema. | Puede | pagar | con | tarjeta | o | con | transferencia.", "No problem. | You-can | pay | with | card | or | by | transfer.", "No problem. You can pay by card or bank transfer.",
        { spain: t("No hay problema. | Puedes | pagar | con | tarjeta | o | con | transferencia.", "No problem. | You-can | pay | with | card | or | by | transfer.", "No problem. You can pay by card or bank transfer.") })],
    card_later: [t("Claro, | aceptamos | tarjeta.", "Sure, | we-accept | card.", "Sure, card is fine.")],
    no_card_line: [t("No hay problema. | Puede | pagar | en efectivo | o | con | transferencia.", "No problem. | You-can | pay | in cash | or | by | transfer.", "No problem. You can pay cash or by bank transfer.",
        { spain: t("No hay problema. | Puedes | pagar | en efectivo | o | con | transferencia.", "No problem. | You-can | pay | in cash | or | by | transfer.", "No problem. You can pay cash or by bank transfer.") })],
    cash_ok: [t("Claro, | en efectivo | está | bien.", "Sure, | in cash | is | fine.", "Sure, cash is fine.")],
    phone_later: [t("Claro, | también | aceptamos | transferencia.", "Sure, | also | we-accept | transfer.", "Sure, a bank transfer is fine too.")],
    transfer_data: [t("Aquí tiene | mis | datos | para | la | transferencia.", "Here you have | my | details | for | the | transfer.", "Here are my details for the transfer.",
        { spain: t("Aquí tienes | mis | datos | para | la | transferencia.", "Here you have | my | details | for | the | transfer.", "Here are my details for the transfer.") })],
    transfer_done: [t("¡Listo, | ya | me | llegó!", "Done, | already | (to) me | it-arrived!", "Great, it came through!",
        { spain: t("¡Perfecto, | ya | me | ha llegado!", "Great, | already | (to) me | it-arrived!", "Great, it came through!") })],
    change_back: [t("Y | aquí está | su | cambio.", "And | here is | your | change.", "And here's your change.",
        { spain: t("Y | aquí está | tu | cambio.", "And | here is | your | change.", "And here's your change.") })],
    // "¿Tiene cambio de quinientos?"
    change_yes: [t("Sí, | sí | tengo.", "Yes, | (I) do | have.", "Yes, I do.", { flags: { 1: "sí before a verb stresses it: “I do have”." } })],
    // "¿Aceptan dólares?": pesos only (as Café La Ceiba); "¿Hay un cajero cerca?": the bank across calle Ceiba (docs/es/TOWN.md)
    dollars_no: [t("Perdón, | nada más | pesos. | Pero | aceptamos | tarjeta | o | transferencia.", "Sorry, | only | pesos. | But | we-accept | card | or | transfer.",
      "Sorry, pesos only. But we take cards or bank transfers.",
        { spain: t("Perdona, | solo | pesos. | Pero | aceptamos | tarjeta | o | transferencia.", "Sorry, | only | pesos. | But | we-accept | card | or | transfer.", "Sorry, pesos only. But we take cards or bank transfers.") })],
    atm_line: [t("En | el | banco, | aquí | cruzando | la | calle.", "At | the | bank, | here | crossing | the | street.", "At the bank, right across the street.")],
    thanks_tip: [t("¡Ay, | muchas | gracias!", "Oh, | many | thanks!", "Aw, thank you so much!"), t("¡Qué | detalle, | muchas | gracias!", "What a | kind gesture, | many | thanks!", "That's so nice of you! Thank you!")],
    paid: [t("¡Gracias!", "Thanks!", "Thank you!"), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks!")],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],

    // --- next appointment and goodbye -----------------------------------------------------------
    ask_book: [t("¿Le | agendo | su | próxima | cita?", "(For) you | I-schedule | your | next | appointment?", "Would you like to book your next appointment?",
        { spain: t("¿Te | apunto | tu | próxima | cita?", "(For) you | I-schedule | your | next | appointment?", "Would you like to book your next appointment?") })],
    book_offer: [t("¡Muy | bien! | ¿En | seis | semanas, | a | la | misma | hora?", "Very | good! | In | six | weeks, | at | the | same | time?", "Great! Same time in six weeks?")],
    book_done: [t("¡Listo, | ya | quedó | agendada!", "Done, | already | it-is | scheduled!", "You're all set!", { flags: { 3: "agendada agrees with la cita (the appointment)." },
        spain: t("¡Perfecto, | ya | está | apuntada!", "Great, | already | it's | booked!", "Done, you're all booked!") })],
    book_amb: [t("Perdón, | ¿entonces | se la | agendo?", "Sorry, | so | it for you | I-schedule?", "Sorry, so should I book it?", { flags: { 2: "se la: la = la cita (the appointment)." },
        spain: t("Perdona, | ¿entonces | te la | apunto?", "Sorry, | so | it for you | I-schedule?", "Sorry, so should I book it?") })],
    book_later_ok: [t("No hay problema. | Nada más | mándeme | un | mensaje.", "No problem. | Just | send me | a | message.", "No problem. Just send me a message.",
        { spain: t("No hay problema. | Solo | mándame | un | mensaje.", "No problem. | Just | send me | a | message.", "No problem. Just send me a message.") })],
    closing: [t("¡Gracias | por | venir!", "Thanks | for | coming!", "Thanks for coming in!"), t("¡Que | disfrute | su | corte | nuevo!", "May | you-enjoy | your | haircut | new!", "Enjoy your new look!",
        { spain: t("¡Que | disfrutes | tu | corte | nuevo!", "May | you-enjoy | your | haircut | new!", "Enjoy your new look!") })],
    bye_after: [t("¡Que | tenga | buen | fin de semana!", "May | you-have | good | weekend!", "Have a great weekend!",
        { neutral: t("¡Que | tenga | un | buen | fin de semana!", "May | you-have | a | good | weekend!", "Have a great weekend!"), spain: t("¡Que | tengas | un | buen | fin de semana!", "May | you-have | a | good | weekend!", "Have a great weekend!") }), t("¡Hasta | la | próxima!", "Until | the | next (time)!", "See you next time!")],
  },

  domains: {
    price: () => {
      const out = new Set<number>([CUT, BANGS]);
      for (const base of [CUT, BANGS]) for (const w of [0, WASH]) for (const d of [0, DRY]) for (const off of base === CUT ? [0, SORRY_OFF] : [0]) out.add(base + w + d - off);
      return [...out];
    },
    total: () => {
      const out = new Set<number>();
      for (const base of [CUT, BANGS]) for (const w of [0, WASH]) for (const d of [0, DRY]) for (const off of base === CUT ? [0, SORRY_OFF] : [0]) out.add(base + w + d - off);
      return [...out];
    },
    amount: () => [SORRY_OFF],
    num: () => [2, 3, 4, 5, 6, 7, 8],
    cm: () => Array.from({ length: 19 }, (_, i) => i + 2),
  },

  hints: {
    checkin: {
      lt: "Say whether you have an appointment",
      items: [
        { id: "appt_at", s: t("Tengo | cita | a las tres.", "I-have | (an) appointment | at three.", "I have an appointment at three.") },
        { id: "no_appt", s: t("No tengo | cita.", "I don't have | (an) appointment.", "I don't have an appointment.") },
        { id: "walkin", s: t("¿Atienden | sin | cita?", "Do you take (customers) | without | appointment?", "Do you take walk-ins?",
        { spain: t("¿Atendéis | sin | cita?", "Do you take (customers) | without | appointment?", "Do you take walk-ins?") }) },
      ],
    },
    name: {
      lt: "Say your name",
      items: [
        { id: "name_its", s: t("A nombre de | {$name}.", "Under the name of | {$name}.", "It's under {$name}.") },
        { id: "name_mine", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
      ],
    },
    drink: {
      lt: "Say if you'd like water or coffee",
      items: [
        { id: "drink_water", s: t("Un | vaso | de | agua, | por favor.", "A | glass | of | water, | please.", "A glass of water, please.") },
        { id: "drink_coffee", s: t("Un | cafecito, | gracias.", "A | little coffee, | thanks.", "A coffee, thanks.", { flags: { 1: "cafecito: a friendly diminutive of café." } }) },
        { id: "drink_no", s: t("No, | gracias.", "No, | thanks.", "No, thanks.") },
      ],
    },
    service: {
      lt: "Say what you'd like done",
      items: [
        { id: "just_trim", s: t("Nada más | despuntar, | por favor.", "Just | trim the ends, | please.", "Just a trim, please.",
        { spain: t("Solo | despuntar, | por favor.", "Just | trim the ends, | please.", "Just a trim, please.") }), note: "despuntar = to trim the ends; un despunte = a trim." },
        { id: "just_ends", s: t("Nada más | las | puntas.", "Just | the | ends.", "Just the ends.",
        { spain: t("Solo | las | puntas.", "Just | the | ends.", "Just the ends.") }) },
        { id: "haircut", s: t("Quisiera | un | corte | de | cabello.", "I'd like | a | cut | of | hair.", "I'd like a haircut.",
        { spain: t("Quisiera | un | corte | de | pelo.", "I'd like | a | cut | of | hair.", "I'd like a haircut.") }) },
        { id: "bangs_trim", s: t("¿Me | puede | cortar | el | fleco?", "(For) me | can you | cut | the | bangs?", "Could you trim my bangs?",
          { neutral: t("¿Me | puede | cortar | el | flequillo?", "(For) me | can you | cut | the | bangs?", "Could you trim my bangs?"),
        spain: t("¿Me | puedes | cortar | el | flequillo?", "(For) me | can you | cut | the | bangs?", "Could you trim my bangs?") }),
          note: "Bangs are “el fleco” in Mexico (“el flequillo” elsewhere).", noteSpain: "El flequillo: bangs (Mexico: el fleco)." },
        { id: "photo", s: t("¿Me | lo | puede | cortar | como | en | esta | foto?", "(For) me | it | can you | cut | like | in | this | photo?", "Could you cut it like in this photo?",
          { flags: { 1: "lo = my hair (el cabello)." },
        spain: t("¿Me | lo | puedes | cortar | como | en | esta | foto?", "(For) me | it | can you | cut | like | in | this | photo?", "Could you cut it like in this photo?") }) },
        { id: "not_short", s: t("No | muy | corto, | por favor.", "Not | very | short, | please.", "Not too short, please.") },
        { id: "new_look", s: t("Quiero | un | cambio | de | look.", "I-want | a | change | of | look.", "I want a new look.") },
      ],
    },
    // "Un corte." → "¿Y cómo lo quiere?"
    service_what: {
      lt: "Say how you'd like it",
      items: [
        { id: "just_trim", s: t("Nada más | despuntar, | por favor.", "Just | trim the ends, | please.", "Just a trim, please.",
        { spain: t("Solo | despuntar, | por favor.", "Just | trim the ends, | please.", "Just a trim, please.") }) },
        { id: "not_short", s: t("No | muy | corto, | por favor.", "Not | very | short, | please.", "Not too short, please.") },
        { id: "photo", s: t("¿Me | lo | puede | cortar | como | en | esta | foto?", "(For) me | it | can you | cut | like | in | this | photo?", "Could you cut it like in this photo?",
          { flags: { 1: "lo = my hair (el cabello)." },
        spain: t("¿Me | lo | puedes | cortar | como | en | esta | foto?", "(For) me | it | can you | cut | like | in | this | photo?", "Could you cut it like in this photo?") }) },
        { id: "new_look", s: t("Quiero | un | cambio | de | look.", "I-want | a | change | of | look.", "I want a new look.") },
      ],
    },
    length: {
      lt: "Say how much to cut",
      items: [
        { id: "cm", s: t("Dos | centímetros, | por favor.", "Two | centimeters, | please.", "Two centimeters, please."), note: "Mexico measures in centimeters (1 inch ≈ 2.5 cm)." },
        { id: "a_little", s: t("Nada más | un poquito.", "Just | a little.", "Just a little.",
        { spain: t("Solo | un poquito.", "Just | a little.", "Just a little.") }) },
        { id: "finger", s: t("Como | dos | dedos.", "Like | two | fingers.", "About two fingers' width."), note: "Showing it with your fingers is very common: “como un dedo”." },
        { id: "sides", s: t("Más | corto | de | los | lados.", "More | short | on | the | sides.", "Shorter on the sides.") },
      ],
    },
    // "¿Con máquina o con tijera?"
    tool: {
      lt: "Say clippers or scissors",
      items: [
        { id: "tool_scissors", s: t("Con | tijera, | por favor.", "With | scissors, | please.", "Scissors, please.") },
        { id: "tool_machine", s: t("Con | máquina | del | dos.", "With | clippers | of the | two.", "Clippers, a number two."), note: "The number is the clipper guard: del uno is very short." },
        { id: "tool_both", s: t("Los | lados | con | máquina | y | arriba | con | tijera.", "The | sides | with | clippers | and | on top | with | scissors.", "Clippers on the sides, scissors on top.") },
      ],
    },
    // "¿Una pulgada? Son como dos centímetros y medio. ¿Le parece bien?"
    confirm: {
      lt: "Say if that's okay",
      items: [
        { id: "conf_fine", s: t("Sí, | eso | está bien.", "Yes, | that | is fine.", "Yes, that's fine.") },
        { id: "conf_perfect", s: t("Me | parece | perfecto, | gracias.", "(To) me | it-seems | perfect, | thanks.", "That's perfect, thanks.") },
      ],
    },
    water: {
      lt: "Say how the water is",
      items: [
        { id: "water_ok", s: t("Está | perfecta, | gracias.", "It's | perfect, | thanks.", "It's perfect, thanks.", { flags: { 1: "perfecta agrees with el agua (feminine)." } }) },
        { id: "too_hot", s: t("Está | un poco | caliente.", "It's | a little | hot.", "It's a little too hot.") },
        { id: "too_cold", s: t("Está | un poco | fría.", "It's | a little | cold.", "It's a little cold.") },
      ],
    },
    style: {
      lt: "Say how to dry it",
      items: [
        { id: "straight", s: t("Lacio, | por favor.", "Straight, | please.", "Straight, please.", { flags: { 0: "lacio: straight (of hair)." },
        spain: t("Liso, | por favor.", "Straight, | please.", "Straight, please.") }) },
        { id: "waves", s: t("Con | ondas, | por favor.", "With | waves, | please.", "With some waves, please.") },
        { id: "volume", s: t("Con | volumen, | por favor.", "With | volume, | please.", "With some volume, please.") },
        { id: "no_blowdry", s: t("Que | se seque | solo.", "That | it-dries | by itself.", "I'll let it air-dry.") },
      ],
    },
    // Reactions to the cat story
    chat: {
      lt: "React or ask about the cat",
      items: [
        { id: "funny", s: t("¡Qué | chistoso!", "How | funny!", "That's so funny!",
        { spain: t("¡Qué | gracioso!", "How | funny!", "That's so funny!") }) },
        { id: "cute", s: t("¡Qué | linda!", "How | cute!", "That's so cute!", { flags: { 1: "linda agrees with la gata (the cat)." },
        spain: t("¡Qué | mona!", "How | cute!", "That's so cute!") }) },
        { id: "cat_name", s: t("¿Cómo | se llama | su | gata?", "How | is called | your | cat?", "What's your cat's name?",
        { spain: t("¿Cómo | se llama | tu | gata?", "How | is called | your | cat?", "What's your cat's name?") }) },
      ],
    },
    // Answers to Paty's small-talk question (one topic per visit)
    talk_weekend: {
      lt: "Talk about your weekend plans",
      items: [
        { id: "party", s: t("Voy | a | una | fiesta | el | sábado.", "I'm-going | to | a | party | on | Saturday.", "I'm going to a party on Saturday.", { flags: { 4: "el sábado: “on Saturday” (days take el, not a preposition)." } }) },
        { id: "relax", s: t("Nada | especial. | Voy | a | descansar.", "Nothing | special. | I'm-going | to | rest.", "Nothing special. Just relaxing.") },
        { id: "friends", s: t("Voy | a | salir | con | unos | amigos.", "I'm-going | to | go out | with | some | friends.", "I'm going out with some friends.") },
      ],
    },
    talk_from: {
      lt: "Say where you're from",
      items: [
        { id: "from_us", s: t("Soy | de | Estados Unidos.", "I'm | from | the United States.", "I'm from the US.") },
        { id: "from_ca", s: t("Soy | de | Canadá.", "I'm | from | Canada.", "I'm from Canada.") },
        { id: "from_moved", s: t("Acabo de | mudarme | aquí.", "I just | moved | here.", "I just moved here.") },
      ],
    },
    talk_vacation: {
      lt: "Talk about your travel plans",
      items: [
        { id: "vacation", s: t("Quiero | ir | a | Oaxaca.", "I-want | to go | to | Oaxaca.", "I want to go to Oaxaca.") },
        { id: "vac_family", s: t("Voy | a | visitar | a | mi | familia.", "I'm-going | to | visit | — | my | family.", "I'm visiting my family.",
          { flags: { 3: "Personal a: Spanish puts a before a person who is the object." } }) },
        { id: "vac_not_yet", s: t("Todavía no.", "Not yet.", "Not yet.") },
      ],
    },
    talk_pets: {
      lt: "Say whether you have pets",
      items: [
        { id: "pet", s: t("Tengo | un | perro.", "I-have | a | dog.", "I have a dog.") },
        { id: "pet_cat", s: t("Tengo | una | gata.", "I-have | a | (female) cat.", "I have a cat.") },
        { id: "no_pets", s: t("No, | no tengo | mascotas.", "No, | I don't have | pets.", "No, I don't have any pets.") },
      ],
    },
    result: {
      lt: "Say how you like it",
      items: [
        { id: "love_it", s: t("¡Me encanta!", "I love it!", "I love it!") },
        { id: "looks_great", s: t("Quedó | muy | bien, | gracias.", "It-turned-out | very | well, | thanks.", "It looks great, thank you!") },
        { id: "more_off", s: t("¿Me | puede | cortar | un poquito | más?", "(For) me | can you | cut | a little | more?", "Could you take a little more off?",
        { spain: t("¿Me | puedes | cortar | un poquito | más?", "(For) me | can you | cut | a little | more?", "Could you take a little more off?") }) },
        { id: "shorter", s: t("Está | un poco | más | corto | de | lo que | pensaba.", "It's | a little | more | short | than | what | I-thought.", "It's a little shorter than I expected."),
          register: "polite", note: "A polite way to say it's too short." },
        { id: "grow_back", s: t("No pasa nada. | Ya | crecerá.", "It's okay. | (Soon) | it'll-grow.", "It's okay. It'll grow back."), register: "polite" },
      ],
    },
    // The twist: "Ay… creo que le corté un poquito más de lo que dijimos."
    short: {
      lt: "React politely",
      items: [
        { id: "grow_back", s: t("No pasa nada. | Ya | crecerá.", "It's okay. | (Soon) | it'll-grow.", "It's okay. It'll grow back."), register: "polite" },
        { id: "shorter", s: t("Está | un poco | más | corto | de | lo que | pensaba.", "It's | a little | more | short | than | what | I-thought.", "It's a little shorter than I expected."),
          register: "polite", note: "A polite way to say it's too short." },
        { id: "still_like", s: t("Aun así | me gusta, | gracias.", "Still | I like it, | thanks.", "I still like it, thanks.") },
      ],
    },
    // "¿Qué quiere que le cambie?"
    fix: {
      lt: "Say what to change",
      items: [
        { id: "more_off", s: t("¿Me | puede | cortar | un poquito | más?", "(For) me | can you | cut | a little | more?", "Could you take a little more off?",
        { spain: t("¿Me | puedes | cortar | un poquito | más?", "(For) me | can you | cut | a little | more?", "Could you take a little more off?") }) },
        { id: "grow_back", s: t("No pasa nada. | Ya | crecerá.", "It's okay. | (Soon) | it'll-grow.", "It's okay. It'll grow back."), register: "polite" },
      ],
    },
    pay: {
      lt: "Pay (and leave a tip)",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Le | pago | en efectivo.", "(To) you | I-pay | in cash.", "I'll pay cash.",
        { spain: t("Te | pago | en efectivo.", "(To) you | I-pay | in cash.", "I'll pay cash.") }) },
        { id: "pay_transfer", s: t("¿Le | puedo | hacer | una | transferencia?", "(To) you | can I | make | a | transfer?", "Can I pay you by bank transfer?",
        { spain: t("¿Te | puedo | hacer | una | transferencia?", "(To) you | can I | make | a | transfer?", "Can I pay you by bank transfer?") }), note: "Bank transfers are very common in Mexico." },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.",
        { spain: t("Aquí tienes.", "Here you go.", "Here you go.") }) },
        { id: "owe", s: t("¿Cuánto | le | debo?", "How much | (to) you | I-owe?", "How much do I owe you?",
        { spain: t("¿Cuánto | te | debo?", "How much | (to) you | I-owe?", "How much do I owe you?") }) },
        { id: "add_tip", s: t("¿Le | puedo | dejar | propina?", "(To) you | can I | leave | (a) tip?", "Can I leave you a tip?",
        { spain: t("¿Te | puedo | dejar | propina?", "(To) you | can I | leave | (a) tip?", "Can I leave you a tip?") }), note: "Tipping a stylist is usual in Mexico, often in cash." },
        { id: "tip_percent", s: t("Le | dejo | el | diez | por ciento.", "(To) you | I-leave | the | ten | percent.", "I'll leave ten percent.",
        { spain: t("Te | dejo | el | diez | por ciento.", "(To) you | I-leave | the | ten | percent.", "I'll leave ten percent.") }) },
        { id: "keep_change", s: t("Quédese | con | el | cambio.", "Keep (yourself) | with | the | change.", "Keep the change!",
        { spain: t("Quédate | con | el | cambio.", "Keep (yourself) | with | the | change.", "Keep the change!") }) },
        { id: "for_you", s: t("Esto | es | para | usted.", "This | is | for | you.", "This is for you.",
        { spain: t("Esto | es | para | ti.", "This | is | for | you.", "This is for you.") }) },
      ],
    },
    // The card reader asks about a tip
    tip: {
      lt: "Choose a tip",
      items: [
        { id: "tip_10", s: t("El | diez | por ciento, | por favor.", "The | ten | percent, | please.", "Ten percent, please.") },
        { id: "tip_percent", s: t("Le | dejo | el | diez | por ciento.", "(To) you | I-leave | the | ten | percent.", "I'll leave ten percent.",
        { spain: t("Te | dejo | el | diez | por ciento.", "(To) you | I-leave | the | ten | percent.", "I'll leave ten percent.") }) },
        { id: "tip_15", s: t("Quince | por ciento | está bien.", "Fifteen | percent | is fine.", "Fifteen percent is fine.") },
      ],
    },
    book: {
      lt: "Book your next visit",
      items: [
        { id: "six_weeks", s: t("Sí, | en | seis | semanas.", "Yes, | in | six | weeks.", "Yes, in six weeks.") },
        { id: "book_later", s: t("Por ahora | no, | gracias.", "For now | no, | thanks.", "Not right now, thanks.") },
        { id: "book_next", s: t("¿Puedo | agendar | mi | próxima | cita?", "Can I | schedule | my | next | appointment?", "Can I book my next appointment?",
        { spain: t("¿Puedo | pedir | mi | próxima | cita?", "Can I | schedule | my | next | appointment?", "Can I book my next appointment?") }) },
      ],
    },
    // A walk-in: "Son como quince minutos. ¿Me espera?"
    wait: {
      lt: "Say you'll wait",
      items: [
        { id: "wait_ok", s: t("Sí, | puedo | esperar.", "Yes, | I-can | wait.", "Sure, I can wait.") },
        { id: "wait_fine", s: t("No me importa | esperar.", "I don't mind | to wait.", "I don't mind waiting.") },
      ],
    },
    // Leaving instead (in the phrase list, not among the guide's model answers)
    wait_later: {
      lt: "Say you'll come back later",
      items: [
        { id: "wait_later", s: t("No, | mejor | regreso | más | tarde.", "No, | better | I-come-back | more | late.", "No, I'll come back later.",
        { spain: t("No, | mejor | vuelvo | más | tarde.", "No, | better | I-come-back | more | late.", "No, I'll come back later.") }) },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a stylist you've just met, usted is more polite: puede, tiene, ¿me corta…? (tú forms are for friends).", better: "¿Me puede cortar el pelo?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say whether you have an appointment", done: (c) => c.s.appt !== undefined || !!c.s.checkedIn },
    { lt: "Say your name", optional: true, when: (c) => !c.s.walkin, done: (c) => !!c.s.checkedIn && !c.s.walkin },
    // what to do and how much to take off
    { lt: "Say how you'd like your hair cut", done: (c) => !!c.s.service && c.s.service !== "vague" && (!!c.s.lengthSet || c.s.service === "bangs") },
    // tools, layers, bangs, wash and water, small talk, blow-dry: ticked when the haircut is done
    { lt: "Answer the stylist's questions", done: (c) => !!c.s.cutDone },
    { lt: "Say how you like it", done: (c) => !!c.s.revealed },
    { lt: "Pay", done: (c) => !!c.s.paid },
  ],

  steps: [
    { id: "appt", done: (c) => !!c.s.checkedIn || c.s.appt !== undefined,
      ask: (c) => c.say("ask_appt"), expects: ["appt_have", "appt_time_ctx", "appt_none", "walkin", "name_ctx"],
      suggest: [{ lt: "Say whether you have an appointment", hint: "checkin" }, { lt: "Say your name", hint: "name" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.appt = true; },
      no: (c) => { salon.handlers.appt_none(c, {}, { intent: "appt_none", slots: {}, tags: [] }); } },
    { id: "name", when: (c) => !!c.s.appt && !c.s.walkin, done: (c) => !!c.s.checkedIn,
      ask: (c) => c.say(c.s.nameAsked ? "name_again" : "ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Say your name", hint: "name" }] },
    { id: "drink", when: (c) => !!c.s.checkedIn && c.s.askDrink, done: (c) => c.s.drink !== undefined,
      // asked again after a side question: "Siéntese aquí" only the first time
      ask: (c) => {
        if (c.s.drinkAsked) { c.say("drink_again"); return; }
        c.s.drinkAsked = true;
        if (!c.s.seated) { c.s.seated = true; c.say("have_seat"); }
        c.say("offer_drink");
      }, expects: ["drink_ans", "drink_no_ctx"],
      suggest: [{ lt: "Say if you'd like water or coffee", hint: "drink" }],
      // "Está bien, gracias" is as often "I'm fine, thanks" here: asked once
      yes: (c) => { if (askedAgain(c, "drink")) { c.hold(); return; } c.s.drink = "water"; c.say("drink_ok"); },
      no: (c) => { c.s.drink = "none"; c.say("no_problem"); } },
    { id: "service", when: (c) => !!c.s.checkedIn, done: (c) => !!c.s.service,
      ask: (c) => c.say("ask_service"), expects: ["trim", "haircut", "go_short", "bangs_only", "photo", "length", "not_short", "wash_request", "tool_ans", "recommend_q"],
      suggest: [{ lt: "Say what you'd like done", hint: "service" }],
      help: (c) => { c.say("what_in_mind"); } },
    { id: "length", when: (c) => !!c.s.service && c.s.service !== "bangs" && c.s.service !== "vague" && !c.s.lengthSet, done: (c) => !!c.s.lengthSet,
      ask: (c) => c.say("ask_length"), expects: ["length", "not_short", "trim", "tool_ans"],
      suggest: [{ lt: "Say how much to cut", hint: "length" }],
      help: (c) => { c.s.lengthSet = true; c.s.cm = 2; c.say("len_cm", { cm: 2 }); } },
    { id: "layers", when: (c) => !!c.s.lengthSet && c.s.askLayers && c.s.service !== "bangs" && c.s.service !== "short", done: (c) => c.s.layers !== undefined,
      ask: (c) => c.say("ask_layers"), expects: ["keep_layers", "no_layers"],
      suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.layers = true; c.say("ack"); },
      no: (c) => { c.s.layers = false; c.say("ack"); } },
    { id: "bangs_q", when: (c) => !!c.s.lengthSet && c.s.askBangs && c.s.service !== "bangs", done: (c) => c.s.bangs !== undefined,
      ask: (c) => c.say("ask_bangs"), expects: ["bangs_only", "no_bangs", "bangs_yes_ctx"],
      suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.bangs = true; c.say("ack"); },
      no: (c) => { c.s.bangs = false; c.say("ack"); } },
    { id: "wash", when: (c) => !!c.s.service && (!!c.s.lengthSet || c.s.service === "bangs") && c.s.askWash, done: (c) => c.s.wash !== undefined,
      ask: (c) => { if (c.s.wantWash) { startWash(c); return; } c.say("ask_wash"); }, expects: ["wash_request", "no_wash"],
      suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
      // the wash is $50 more: "Está bien, gracias" may be a polite no (rule 17)
      yes: (c) => { if (askedAgain(c, "wash")) { c.hold(); return; } startWash(c); },
      no: (c) => { c.s.wash = false; c.say("no_wash_ok"); } },
    { id: "chat", when: (c) => !!c.s.service && (!!c.s.lengthSet || c.s.service === "bangs") && (c.s.wash !== undefined || !c.s.askWash),
      done: (c) => !!c.s.chatDone,
      ask: (c) => {
        c.s.chatDone = true;
        if (c.s.catFirst) { c.s.catTold = true; c.say("cat_story"); c.expect(catPending(c)); return; }
        askSmallTalk(c);
      },
      expects: ["react_funny", "ask_cat", "weekend_ctx", "vacation_ctx", "from_ans", "pets_ans"] },
    { id: "blowdry", when: (c) => !!c.s.chatDone && c.s.askDry, done: (c) => c.s.blowdry !== undefined,
      ask: (c) => c.say("ask_blowdry"), expects: ["style", "ask_cat"],
      suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Say how to dry it", hint: "style" }],
      // "Sí, lacio, por favor": the style comes in the same turn, so Paty doesn't ask for it; the blow-dry is $50 more, so
      // "Está bien, gracias" may be a polite no (rule 17)
      yes: (c) => {
        if (askedAgain(c, "blowdry")) { c.hold(); return; }
        c.s.blowdry = true; if (/lacio|liso|planch|onda|volumen|natural|chino|rizo/.test(fold(c.heard))) return; c.say("ask_style"); c.expect(stylePending(c));
      },
      no: (c) => { c.s.blowdry = false; c.say("no_dry_ok"); } },
    { id: "reveal", when: (c) => !!c.s.chatDone && (c.s.blowdry !== undefined || !c.s.askDry), done: (c) => !!c.s.revealed,
      ask: (c) => {
        c.s.cutDone = true;
        if (c.s.tooShort && !c.s.shortSaid && c.s.service !== "bangs") {
          c.s.shortSaid = true; c.s.revealAsked = true; c.twist("too_short"); c.say("reveal"); c.say("reveal_short");
          c.expect(twistPending());
          return;
        }
        // asked again after a side question: a short reminder
        c.say(c.s.revealAsked ? "reveal_again" : "reveal");
        c.s.revealAsked = true;
      },
      expects: ["love_it", "more_off", "shorter_than", "polite_ok", "dont_like", "ask_cat", "fine_ctx", "short_amb_ctx"],
      suggest: [{ lt: "Say how you like it", hint: "result" }],
      yes: (c) => { c.s.revealed = true; c.say("love_reply"); },
      // "No, está bien" / "No está bien": its comma lost, it could be either (rule 10): Paty asks
      no: (c) => { if (saidFine(c)) { askAmbResult(c); return; } salon.handlers.dont_like(c, {}, { intent: "dont_like", slots: {}, tags: [] }); } },
    { id: "pay", when: (c) => !!c.s.revealed, done: (c) => !!c.s.paid,
      ask: (c) => {
        // asked again after a side question: the way to pay (or, once it's chosen, the amount to hand over)
        if (c.s.totalSaid && !c.s.payMethod) { c.say("pay_how"); return; }
        const p = total(c);
        if (c.s.wash && c.s.blowdry && !c.s.discount && !c.s.totalSaid) c.say("total_full", { price: p }); else c.say("total_plain", { price: p });
        c.s.totalSaid = true;
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "keep_change", "add_tip", "ask_owe", "no_card", "no_cash", "tip_howmuch", "receipt_q", "invoice_q", "pay_whatif", "already_paid"],
      suggest: [{ lt: "Pay (and leave a tip)", hint: "pay" }] },
    { id: "book", when: (c) => !!c.s.paid && (c.s.askBook || c.s.wantBook), done: (c) => c.s.booked !== undefined,
      ask: (c) => c.say("ask_book"), expects: ["book_when", "book_later"],
      suggest: [{ lt: "Book your next visit (or not)", hint: "book" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => {
        c.say("book_offer");
        c.expect(bookWhenPending());
      },
      no: (c) => { c.s.booked = false; c.say("book_later_ok"); } },
  ],

  init: (c) => {
    c.s.askDrink = c.chance(0.4);
    c.s.askLayers = c.chance(0.3);
    c.s.askBangs = c.chance(0.35);
    c.s.askWash = c.chance(0.75);
    c.s.askDry = c.chance(0.8);
    c.s.askBook = c.chance(0.6);
    c.s.catFirst = c.chance(0.6);
    c.s.talkAfterCat = c.chance(0.5);
    c.s.talkTopic = c.pick(["weekend", "from", "vacation", "pets"]);
    c.s.tooShort = c.visits >= 1 && c.chance(0.4);
    c.s.walkinWait = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.chance(0.25)) {
      c.say("greet_howareyou_line");
      expectHowAreYou(c);
      return;
    }
    c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet");
    c.ask("appt");
  },

  handlers: {
    appt_have(c, slots, seg) {
      c.s.appt = true;
      const tm = slots.time;
      // "No tengo cita a las tres": the three o'clock is someone else's, so no appointment (at another hour: "No, tengo cita a las cuatro")
      if (seg.tags.includes("notat") && (!tm || tm.h === 3 || tm.h === 15)) { salon.handlers.appt_none(c, {}, { intent: "appt_none", slots: {}, tags: [] }); return; }
      if (tm && tm.h !== 3 && tm.h !== 15) { c.s.otherTime = true; }
      if (c.s.name) { checkIn(c); return; }
    },
    appt_time_ctx(c, slots, seg) { salon.handlers.appt_have(c, slots, seg); },
    appt_none(c) {
      if (c.s.walkin) return; // "No tengo cita, ¿tiene lugar?": one answer
      c.s.appt = false;
      c.s.walkin = true;
      c.say("no_appt_ok");
      walkIn(c);
    },
    walkin(c) {
      if (c.s.walkin) return;
      c.s.appt = false;
      c.s.walkin = true;
      walkIn(c);
    },
    name_ctx(c, slots) {
      if (!slots.name) { c.s.nameAsked = true; c.say("name_again"); c.hold(); return; }
      c.s.name = slots.name;
      if (c.s.appt === undefined) c.s.appt = true;
      checkIn(c);
    },
    wait_ok(c) { if (c.s.waiting) finishWait(c); else c.say("ack"); },
    wait_no(c) { if (c.s.waiting) { c.s.waiting = false; c.s.gaveUp = true; c.say("wait_no_line"); c.end(); } else c.say("ack"); },
    drink_ans(c) { c.s.drink = "yes"; c.say("drink_ok"); },
    drink_no_ctx(c) { c.s.drink = "none"; c.say("no_problem"); },
    trim(c, _slots, seg) {
      if (asksMeaning(c)) return; // "¿Qué significa despuntar?"
      firstThisTurn(c, "service"); // the wash asked in the same turn needs no "Perfecto." of its own
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "trim";
      if (seg.tags.includes("ends")) { c.s.lengthSet = true; c.s.cm = 1; c.say("len_ends"); return; }
      c.say("trim_ok");
    },
    haircut(c) {
      firstThisTurn(c, "service"); // the wash asked in the same turn needs no "Perfecto." of its own
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "vague";
      c.say("what_in_mind");
      c.expect({ id: "service_q", expects: ["trim", "go_short", "bangs_only", "photo", "length", "not_short", "tool_ans"], hints: ["service_what", "length", "service"],
        suggest: [{ lt: "Say how you'd like it", hint: "service_what" }, { lt: "Say how much to cut", hint: "length" }],
        on: {
          trim: (cc, sl, sg) => { salon.handlers.trim(cc, sl, sg); },
          go_short: (cc, sl, sg) => { salon.handlers.go_short(cc, sl, sg); },
          bangs_only: (cc, sl, sg) => { salon.handlers.bangs_only(cc, sl, sg); },
          photo: (cc, sl, sg) => { salon.handlers.photo(cc, sl, sg); },
          length: (cc, sl, sg) => { cc.s.service = "trim"; salon.handlers.length(cc, sl, sg); },
          not_short: (cc, sl, sg) => { cc.s.service = "trim"; salon.handlers.not_short(cc, sl, sg); },
          tool_ans: (cc, sl, sg) => { salon.handlers.tool_ans(cc, sl, sg); },
        },
        ask: (cc) => cc.say("what_in_mind") });
    },
    go_short(c) {
      firstThisTurn(c, "service"); // the wash asked in the same turn needs no "Perfecto." of its own
      if (!c.s.checkedIn) autoCheckIn(c);
      if (c.s.cutDone) { salon.handlers.more_off(c, {}, { intent: "more_off", slots: {}, tags: [] }); return; }
      c.s.service = "short";
      c.say("short_ok");
    },
    bangs_only(c) {
      if (asksMeaning(c)) return; // "¿Qué significa fleco?"
      firstThisTurn(c, "service"); // the wash asked in the same turn needs no "Perfecto." of its own
      if (!c.s.checkedIn) autoCheckIn(c);
      if (c.s.service && c.s.service !== "bangs" && c.s.service !== "vague") { c.s.bangs = true; c.say("ack"); return; }
      c.s.service = "bangs";
      c.say("bangs_ok");
    },
    photo(c) {
      firstThisTurn(c, "service"); // the wash asked in the same turn needs no "Perfecto." of its own
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "short";
      c.s.lengthSet = true;
      c.say("photo_ok");
      maybeAskTool(c);
    },
    not_short(c) {
      if (!c.s.service || c.s.service === "vague") c.s.service = "trim";
      c.say("not_short_ok");
      // "No muy corto" as the answer to "¿Cuánto le corto?": a little, unless a length follows.
      const saysLength = /centim|\bcm\b|dedo|pulgad|punta|poco|poquit|tantito/.test(fold(c.heard));
      if (!c.s.lengthSet && c.step === "length" && !saysLength) { c.s.lengthSet = true; c.s.cm = 1; c.say("len_little"); }
    },
    length(c, slots, seg) {
      // after the haircut a length is no new length (never "Muy bien, nada más un poquito." at the result): at the twist
      // "Sí, un poco" agrees it's shorter (an apology and the discount); otherwise "Un poquito más" asks for more off
      if (c.s.cutDone) {
        if (c.s.shortSaid && !c.s.revealed && !c.s.discount && !/\bmas\b/.test(plain(c))) { salon.handlers.shorter_than(c, {}, { intent: "shorter_than", slots: {}, tags: [] }); return; }
        salon.handlers.more_off(c, {}, { intent: "more_off", slots: {}, tags: [] });
        return;
      }
      if (!c.s.checkedIn) autoCheckIn(c);
      if (!c.s.service || c.s.service === "vague") c.s.service = "trim";
      const tags = seg.tags;
      // more than Paty's figures go (20 cm, 8 inches, 5 fingers): "¿Tanto?", never a figure the learner didn't say
      const huge = (cm: number) => { c.s.cm = cm; c.s.lengthSet = true; c.say("cm_huge"); c.say("cm_confirm"); c.expect(cmPending()); };
      let inches = inchesFromTags(tags);
      if (inches === undefined && tags.includes("inN") && typeof slots.n === "number") inches = slots.n;
      if (inches !== undefined) {
        // a visitor's inches: Paty converts them and checks
        if (inches > 8) { huge(Math.round(inches * 2.5)); return; }
        const cm = clamp(Math.round(inches * 2.5), 1, 20);
        c.s.cm = cm; c.s.lengthSet = true;
        if (inches === 0.5) c.say("inch_half");
        else if (inches === 1) c.say("inch_1");
        else if (inches === 1.5) c.say("inch_15"); // not "¿2 pulgadas?"
        else c.say("inch_n", { num: clamp(Math.round(inches), 2, 8), cm: clamp(cm, 2, 20) });
        c.say("cm_note");
        c.say("cm_confirm");
        c.expect(cmPending());
        return;
      }
      if (tags.includes("cm") || tags.includes("cm15") || tags.includes("cmhalf")) {
        // halves are said as halves ("dos centímetros y medio"): "2.5 centímetros" has no voice
        let raw = tags.includes("cm15") ? 1.5 : Number(slots.c) || 2;
        if (tags.includes("cmhalf")) raw += 0.5;
        const half = raw % 1 !== 0;
        if (raw > 20 || (half && raw >= 9)) { huge(raw); return; }
        const cm = half ? raw : clamp(Math.round(raw), 1, 20);
        c.s.cm = cm; c.s.lengthSet = true;
        if (cm >= 10) { c.say("cm_big", { cm }); c.say("cm_confirm"); c.expect(cmPending()); return; }
        if (cm < 1) { c.s.cm = 1; c.say("len_little"); }
        else if (cm === 1) c.say("len_cm1");
        else if (cm === 1.5) c.say("len_cm15");
        else if (half) c.say("len_cm_half", { num: Math.floor(cm) });
        else c.say("len_cm", { cm });
        maybeAskTool(c);
        return;
      }
      if (tags.includes("dedoN") && typeof slots.f === "number" && slots.f > 5) { huge(Math.round(slots.f) * 2); return; }
      c.s.lengthSet = true;
      if (tags.includes("dedo1")) { c.s.cm = 2; c.say("len_dedo"); maybeAskTool(c); return; }
      if (tags.includes("dedo2") || tags.includes("dedo3")) { const n = tags.includes("dedo3") ? 3 : 2; c.s.cm = n * 2; c.say("len_dedo_n", { num: n }); maybeAskTool(c); return; }
      if (tags.includes("dedoN") && typeof slots.f === "number") {
        const n = clamp(Math.round(slots.f), 1, 5); c.s.cm = n * 2;
        if (n === 1) c.say("len_dedo"); else c.say("len_dedo_n", { num: n });
        maybeAskTool(c); return;
      }
      // to the shoulders: a scissors cut, so no "¿Con máquina o con tijera?"
      if (tags.includes("shoulders")) { c.s.cm = 10; c.say("len_shoulders"); return; }
      if (tags.includes("sides")) { c.s.cm = 2; c.s.sides = true; c.say("len_sides"); maybeAskTool(c); return; }
      c.s.cm = 1;
      c.say("len_little");
      maybeAskTool(c);
    },
    confirm_yes(c) { c.say("ack"); },
    paty_name(c) { c.say("paty_name"); },
    // "¿Cuánto tarda?": the client before, the haircut, or "¡Ya casi termino!" once it's under way
    howlong_q(c) {
      if (c.s.waiting) { c.say("wait_mins"); c.hold(); return; }
      if (c.s.cutDone) return; // done already: the result's question again
      c.say(c.s.service && c.s.service !== "vague" ? "almost_done" : "cut_time");
      if (c.step === "pay") c.hold();
    },
    // "¿Tiene costo extra?", "¿Está incluido?": the drink is free, the bangs come with the haircut, the wash and the blow-dry cost $50 each
    extra_q(c) {
      const h = plain(c);
      if (c.step === "drink" && !/lavad|secad|corte|fleco|flequillo/.test(h)) { c.say("drink_free"); return; }
      if (c.step === "bangs_q" || (/fleco|flequillo/.test(h) && c.s.service && c.s.service !== "bangs" && c.s.service !== "vague")) { c.say("bangs_included"); return; }
      if (/fleco|flequillo/.test(h)) { c.say("price_bangs", { price: BANGS }); return; }
      c.say("price_extras");
      if (c.step === "pay") c.hold();
    },
    dollars_q(c) { c.say("dollars_no"); if (c.step === "pay") c.hold(); },
    atm_q(c) { c.say("atm_line"); if (c.step === "pay") c.hold(); },
    change_q(c) { c.say("change_yes"); if (c.step === "pay") c.hold(); },
    water_ok_ctx(c) { c.say("water_good"); },
    style_any_ctx(c) { if (c.s.revealed) { c.say("ack"); return; } c.s.blowdry = true; c.s.style = "straight"; c.say("style_ok"); },
    // "Nada, así está bien": nothing to change, so the learner accepts the haircut (the discount, at the twist)
    nothing_ctx(c) { if (c.s.cutDone && !c.s.revealed) acceptCut(c); else c.say("ack"); },
    short_much_ctx(c) { c.say("short_more"); c.expect(twistPending()); },
    book_time_ctx(c) { if (!c.s.paid) { c.s.wantBook = true; c.say("book_first"); return; } c.s.booked = true; c.say("book_done"); },
    short_amb_ctx(c) { if (c.s.cutDone && !c.s.revealed) askAmbResult(c); else c.say("ack"); },
    less_ctx(c) { c.s.lengthSet = false; c.say("less_line"); c.hold(); },
    bangs_yes_ctx(c) { c.s.bangs = true; c.say("ack"); },
    tip_num_ctx(c, slots, seg) { salon.handlers.add_tip(c, slots, seg); },
    recommend_q(c) { c.say("recommend"); if (!c.s.service) c.hold(); },
    receipt_q(c) { c.say(c.s.paid ? "receipt_line" : "receipt_after"); if (c.step === "pay") c.hold(); },
    no_receipt(c) { c.say("ack"); if (c.step === "pay") c.hold(); },
    invoice_q(c) { c.say("invoice_line"); if (c.step === "pay") c.hold(); },
    fine_ctx(c, _slots, seg) {
      // "Así está bien" at the result: the learner is happy with it (or polite about the twist)
      if (c.s.cutDone && !c.s.revealed) {
        if (seg.tags.includes("amb")) { askAmbResult(c); return; }
        if (c.s.shortSaid) salon.handlers.polite_ok(c, {}, { intent: "polite_ok", slots: {}, tags: [] });
        else salon.handlers.love_it(c, {}, { intent: "love_it", slots: {}, tags: [] });
        return;
      }
      c.say("ack");
    },
    tool_ans(c, slots, seg) {
      // "¿Qué significa máquina?": the question stays open while the word is explained
      if (asksMeaning(c)) { if (!c.s.tool && c.s.toolAsked) c.expect(toolPending()); return; }
      if (!c.s.checkedIn) autoCheckIn(c);
      if (!c.s.service || c.s.service === "vague") c.s.service = "short";
      const tags = seg.tags;
      const n = typeof slots.n === "number" ? slots.n : undefined;
      c.s.toolAsked = true;
      c.s.tool = tags.includes("both") ? "both" : tags.includes("machine") ? "machine" : "scissors";
      if (tags.includes("any")) c.say("tool_choose");
      else if (c.s.tool === "both") c.say("tool_both");
      else if (c.s.tool === "machine" && n !== undefined && n >= 2 && n <= 8) c.say("tool_number", { num: n });
      else c.say(c.s.tool === "machine" ? "tool_machine" : "tool_scissors");
      if (n !== undefined) c.s.guard = n;
      // clippers set the length on the sides
      if (c.s.tool !== "scissors" && !c.s.lengthSet) { c.s.lengthSet = true; c.s.sides = true; c.s.cm = 2; }
    },
    tool_ctx(c, slots, seg) { salon.handlers.tool_ans(c, slots, seg); },
    wash_request(c, _slots, seg) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.wantWash = true; c.s.askWash = true;
      if (seg.tags.includes("trim") && (!c.s.service || c.s.service === "vague")) { c.s.service = "trim"; c.say("wash_trim_ok"); return; }
      // "Quiero un corte y que me lave el pelo": Paty's answer to the haircut says it all
      if (firstThisTurn(c, "service")) c.say("ack");
    },
    keep_layers(c) { c.s.layers = true; c.say("ack"); },
    no_wash(c) { if (c.s.wash !== undefined) { c.say("ack"); return; } c.s.wash = false; c.say("no_wash_ok"); },
    no_tip(c) { c.say(c.s.paid ? "paid" : "ack"); },
    see_you(c) { c.say("g_bye"); c.end(); },
    no_bangs(c) { c.s.bangs = false; c.say("ack"); },
    no_layers(c) { c.s.layers = false; c.say("ack"); },
    water_temp(c, _slots, seg) {
      if (!c.s.wash) { c.say("ack"); return; }
      if (seg.tags.includes("cold")) c.say("water_fix_cold"); else c.say("water_fix_hot");
      c.expect(waterPending(c));
    },
    water_ok(c) { c.say("water_good"); },
    style(c, _slots, seg) {
      if (c.s.revealed) { c.say("ack"); return; } // the haircut is finished: no blow-dry to add
      // "¿Qué significa lacio?": the question stays open while the word is explained
      if (asksMeaning(c)) { if (c.s.blowdry && !c.s.style) c.expect(stylePending(c)); return; }
      if (seg.tags.includes("nodry")) { c.s.blowdry = false; c.say("no_dry_ok"); return; }
      c.s.blowdry = true;
      c.s.style = seg.tags.includes("waves") ? "waves" : seg.tags.includes("volume") ? "volume" : seg.tags.includes("natural") ? "natural" : "straight";
      c.say("style_ok");
    },
    love_it(c) {
      if (!firstThisTurn(c, "love")) return;
      if (!c.s.cutDone) { c.say("ack"); return; }
      // "¡Me encanta!" after Paty admitted she took off too much: "¡Ay, qué amable!"
      if (c.s.shortSaid && !c.s.revealed) { c.s.revealed = true; c.say("polite_reply"); return; }
      if (!c.s.revealed && c.s.chatDone) { c.s.revealed = true; c.say("love_reply"); return; }
      c.say("love_reply");
    },
    more_off(c) {
      if (!c.s.cutDone) { c.say("ack"); return; }
      // at the twist "Sí, un poquito más corto" agrees it's shorter: an apology and the discount, never more off
      // ("¿Me puede cortar un poquito más de los lados?" still asks)
      if (c.s.shortSaid && !c.s.revealed && !c.s.discount && !/puede|podria|corte|cortar|quite|quitar|cortele|quitele|emparej|arregl|atras|lados|arriba|adelante|falta/.test(plain(c))) {
        salon.handlers.shorter_than(c, {}, { intent: "shorter_than", slots: {}, tags: [] }); return;
      }
      c.say("more_ok");
      c.say("more_done");
      c.expect({ id: "more_q", expects: ["love_it", "more_off", "polite_ok", "fine_ctx", "short_amb_ctx"], hints: ["result"], suggest: [{ lt: "Say how you like it", hint: "result" }],
        on: {
          love_it: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          polite_ok: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          fine_ctx: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          g_ok: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          more_off: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); return false; },
        },
        yes: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
        no: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); },
        ask: (cc) => cc.say("more_done") });
    },
    shorter_than(c) {
      if (!c.s.cutDone) { c.say("not_short_ok"); return; }
      c.say("sorry_short");
      c.say("grows_fast");
      if (!c.s.discount && c.s.service !== "bangs") { c.s.discount = true; c.say("discount", { amount: SORRY_OFF }); }
      c.s.revealed = true;
    },
    polite_ok(c) {
      if (!firstThisTurn(c, "polite")) return;
      if (!c.s.cutDone) { c.say("ack"); return; }
      if (c.s.shortSaid && !c.s.discount) { c.s.discount = true; c.say("polite_reply"); c.say("discount", { amount: SORRY_OFF }); c.s.revealed = true; return; }
      c.say("polite_reply");
      c.s.revealed = true;
    },
    dont_like(c) {
      if (!c.s.cutDone) { c.say("ack"); return; }
      c.say("dont_like_reply");
      // "No, así está bien" / "Nada" / "No": nothing to change, accepted politely (at the twist with the discount, as "No pasa nada")
      c.expect({ id: "fix_q", expects: ["more_off", "shorter_than", "love_it", "polite_ok", "fine_ctx", "short_amb_ctx", "nothing_ctx"], hints: ["fix", "result"], suggest: [{ lt: "Say what to change", hint: "fix" }],
        on: {
          more_off: (cc, sl, sg) => { salon.handlers.more_off(cc, sl, sg); },
          shorter_than: (cc, sl, sg) => { salon.handlers.shorter_than(cc, sl, sg); },
          love_it: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          polite_ok: (cc, sl, sg) => { salon.handlers.polite_ok(cc, sl, sg); },
          fine_ctx: (cc) => { politeAccept(cc); },
          nothing_ctx: (cc) => { politeAccept(cc); },
          g_ok: (cc) => { politeAccept(cc); },
        },
        yes: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); },
        no: (cc) => { politeAccept(cc); },
        ask: (cc) => cc.say("dont_like_reply") });
    },
    react_funny(c) {
      if (!firstThisTurn(c, "react")) return;
      // "¡Ay, no!", "¿En serio?" at the result: dismay at the twist (an apology and the discount), unclear otherwise
      if (c.s.cutDone && !c.s.revealed) {
        if (c.s.shortSaid && !c.s.discount) { salon.handlers.shorter_than(c, {}, { intent: "shorter_than", slots: {}, tags: [] }); return; }
        askAmbResult(c); return;
      }
      c.say(c.s.catTold ? "cat_laugh" : "ack");
    },
    ask_cat(c, _slots, seg) { sayCat(c, seg.tags); },
    pets_ans(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("dog")) c.say("react_dog");
      else if (seg.tags.includes("cat")) c.say("react_cat");
      else if (seg.tags.includes("nopet")) c.say("react_nopet");
      else c.say("react_fun");
    },
    weekend_ctx(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("unsure")) c.say("react_unsure");
      else if (seg.tags.includes("party")) c.say("react_party");
      else if (seg.tags.includes("relax")) c.say("react_relax");
      else c.say("react_fun");
    },
    weekend_unknown(c) { if (firstThisTurn(c, "react")) c.say("react_fun"); },
    from_ans(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("moved")) c.say("react_moved"); else if (seg.tags.includes("far")) c.say("react_far"); else c.say("react_fun");
    },
    vacation_ctx(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("unsure")) c.say("react_unsure"); else if (seg.tags.includes("relax")) c.say("react_relax"); else c.say("react_fun");
    },
    ask_jessie(c, _slots, seg) { sayJessie(c, seg.tags); },
    pets_none_ctx(c) { c.say("react_nopet"); },
    ask_owe(c) {
      if (!c.s.cutDone) {
        const h = plain(c);
        // the price of what is on offer (rule 17): the drink is free, the bangs come with the haircut, the wash and the
        // blow-dry are $50 each; "¿Cuánto cuesta cortar el fleco?" is the bangs' price, not the haircut's
        if (c.step === "drink" && !/lavad|secad|lavar|secar|corte|cortar|fleco|flequillo/.test(h)) { c.say("drink_free"); return; }
        if (c.step === "bangs_q" && !/lavad|secad|lavar|secar/.test(h)) { c.say("bangs_included"); return; }
        if (/fleco|flequillo/.test(h) && !/lavad|secad/.test(h)) {
          if (c.s.service && c.s.service !== "bangs" && c.s.service !== "vague") c.say("bangs_included"); else c.say("price_bangs", { price: BANGS });
          return;
        }
        if ((/lavad|secad|lavar|secar/.test(h) && !/corte|cortar/.test(h)) || ((c.step === "wash" || c.step === "blowdry") && !/corte|cortar/.test(h))) { c.say("price_extras"); return; }
        c.say(c.s.service === "bangs" ? "price_bangs" : "price_cut", { price: c.s.service === "bangs" ? BANGS : CUT });
        c.say("price_extras");
        return;
      }
      const p = total(c);
      // asked again: the amount only
      if (c.s.wash && c.s.blowdry && !c.s.discount && !c.s.totalSaid) c.say("total_full", { price: p }); else c.say("total_plain", { price: p });
      c.s.totalSaid = true;
      if (c.step === "pay") c.hold();
    },
    tip_howmuch(c) { c.say("tip_info"); if (c.step === "pay") c.hold(); },
    pay_card(c) {
      if (c.s.paid) { c.say("paid"); return; }
      skipToPay(c);
      if (!c.s.revealed) { c.say("card_later"); c.s.payMethod = "card"; return; }
      c.s.totalSaid = true;
      c.say("card_tip");
      markPaid(c); c.s.payMethod = "card"; c.event("pay", { method: "card" });
      c.expect(tipPending());
    },
    no_card(c) { if (c.s.paid) { c.say("paid"); return; } c.s.payMethod = undefined; c.say("no_card_line"); if (c.step === "pay") c.hold(); },
    pay_whatif(c, _slots, seg) {
      const tags = seg.tags;
      c.say(tags.includes("cash") ? "cash_ok" : tags.includes("transfer") ? "phone_later" : "card_later");
      if (c.step === "pay") c.hold();
    },
    already_paid(c) {
      if (c.s.paid) { c.say("paid"); return; }
      if (c.s.cutDone) { c.say("not_paid_yet", { price: total(c) }); if (c.step === "pay") c.hold(); return; }
      c.say("pay_later");
    },
    // "No traigo efectivo": the other ways, nothing charged until the learner picks one (rule 18)
    no_cash(c) { if (c.s.paid) { c.say("paid"); return; } c.s.payMethod = undefined; c.say("no_cash_line"); if (c.step === "pay") c.hold(); },
    pay_phone(c) {
      if (c.s.paid) { c.say("paid"); return; }
      skipToPay(c);
      if (!c.s.revealed) { c.say("phone_later"); c.s.payMethod = "transfer"; return; }
      c.s.totalSaid = true;
      c.say("transfer_data");
      markPaid(c); c.s.payMethod = "transfer"; c.event("pay", { method: "transfer" });
      c.say("transfer_done");
    },
    pay_cash(c) {
      if (c.s.paid) { if (firstThisTurn(c, "thanks")) c.say("paid"); return; }
      skipToPay(c);
      c.say("cash_ok"); c.s.payMethod = "cash";
      // the total was said: Paty waits for the money (no total again)
      if (c.s.revealed) { if (c.s.totalSaid && c.step === "pay") c.hold(); c.s.totalSaid = true; }
    },
    here_you_go(c, slots, seg) {
      skipToPay(c);
      if (!c.s.revealed) { c.say("pay_later"); return; }
      if (c.s.paid) { c.say("paid"); return; }
      // "Aquí tiene mi tarjeta": a card payment
      if (/tarjeta/.test(fold(c.heard)) && typeof slots.price !== "number") { salon.handlers.pay_card(c, slots, seg); return; }
      const given = typeof slots.price === "number" ? slots.price : undefined;
      // less than the total: Paty says the total again, nothing is paid
      if (given !== undefined && given < total(c)) { c.say("short_cash", { total: total(c) }); c.hold(); return; }
      markPaid(c); c.event("pay", { method: c.s.payMethod || "cash" });
      if (/quede|propina|para usted|el resto/.test(fold(c.heard))) return; // "Tenga, quédese con el cambio": no change to give back
      if (c.s.payMethod === "card") c.say("paid");
      else if (c.s.tip && given !== undefined && given > total(c)) c.say("thanks_tip"); // the tip promised before: the rest is hers
      else c.say("change_back");
    },
    keep_change(c) {
      skipToPay(c);
      if (!c.s.revealed) { c.say("pay_later"); return; }
      if (!c.s.paid) { markPaid(c); c.event("pay", { method: "cash" }); }
      c.s.tip = true;
      c.say("thanks_tip");
    },
    add_tip(c) {
      if (!c.s.cutDone || !c.s.revealed) { c.say("tip_later"); return; }
      c.s.tip = true;
      firstThisTurn(c, "thanks"); // "¿Puedo dejar la propina en efectivo?": one thank-you, not two
      c.say("thanks_tip");
      if (c.s.revealed && !c.s.paid) { c.s.tipLater = true; }
    },
    book_when(c) { if (!c.s.paid) { c.s.wantBook = true; c.say("book_first"); return; } c.s.booked = true; c.say("book_done"); },
    book_later(c) { if (!c.s.paid) { c.say("ack"); return; } c.s.booked = false; c.say("book_later_ok"); },
  },

  finish: (c) => {
    if (c.s.gaveUp) return;
    if (c.s.paid) {
      c.complete();
      c.event("serve", { haircut: true });
      c.say("closing");
    }
    c.say("bye_after");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thanks and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        see_you: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns
    { say: "Tengo cita a las tres.", intent: "appt_have" },
    { say: "No tengo cita.", intent: "appt_none", not: ["appt_have"] },
    { say: "¿Atienden sin cita?", intent: "walkin" },
    { say: "Me llamo Ryan.", intent: "name_ctx", step: "name" },
    { say: "A nombre de Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "Nada más despuntar, por favor.", intent: "trim" },
    { say: "Nada más las puntas.", intent: "trim" },
    { say: "Quisiera un corte de cabello.", intent: "haircut" },
    { say: "¿Me puede cortar el fleco?", intent: "bangs_only" },
    { say: "¿Me lo puede cortar como en esta foto?", intent: "photo" },
    { say: "No muy corto, por favor.", intent: "not_short", not: ["go_short"] },
    { say: "Quiero un cambio de look.", intent: "go_short" },
    { say: "Dos centímetros, por favor.", intent: "length", step: "length", slots: { c: 2 } },
    { say: "Nada más un poquito.", intent: "length", step: "length" },
    { say: "Como dos dedos.", intent: "length", step: "length" },
    { say: "Más corto de los lados.", intent: "length" },
    { say: "Con máquina del dos.", intent: "tool_ans", slots: { n: 2 } },
    { say: "Los lados con máquina y arriba con tijera.", intent: "tool_ans" },
    { say: "Está un poco caliente.", intent: "water_temp" },
    { say: "El agua está perfecta, gracias.", intent: "water_ok" },
    { say: "Lacio, por favor.", intent: "style" },
    { say: "Que se seque solo.", intent: "style" },
    { say: "¡Me encanta!", intent: "love_it" },
    { say: "Quedó muy bien, gracias.", intent: "love_it" },
    { say: "¿Me puede cortar un poquito más?", intent: "more_off" },
    { say: "Está un poco más corto de lo que pensaba.", intent: "shorter_than" },
    { say: "Aun así me gusta, gracias.", intent: "polite_ok", step: "reveal", not: ["dont_like"] },
    { say: "¿Cuánto le debo?", intent: "ask_owe" },
    { say: "¿Le puedo dejar propina?", intent: "add_tip" },
    { say: "Le dejo el diez por ciento.", intent: "add_tip", slots: { p: 10 } },
    { say: "Quédese con el cambio.", intent: "keep_change" },
    { say: "¿Le puedo hacer una transferencia?", intent: "pay_phone", step: "pay" },
    { say: "Sí, en seis semanas.", intent: "book_when", step: "book" },
    { say: "¿Cómo se llama su gata?", intent: "ask_cat" },
    { say: "¡Qué chistoso!", intent: "react_funny" },
    { say: "Voy a una fiesta el sábado.", intent: "weekend_ctx", step: "chat" },
    { say: "Soy de Estados Unidos.", intent: "from_ans" },
    { say: "Soy de Lituania.", intent: "from_ans" },
    { say: "Soy lituano.", intent: "from_ans" },
    { say: "Vengo de Japón.", intent: "from_ans" },
    { say: "Acabo de mudarme aquí.", intent: "from_ans" },
    { say: "Quiero ir a Oaxaca.", intent: "vacation_ctx", step: "chat" },
    { say: "Sí, puedo esperar.", intent: "wait_ok" },
    { say: "No me importa esperar.", intent: "wait_ok", not: ["wait_no"] },
    { say: "No, mejor regreso más tarde.", intent: "wait_no", not: ["wait_ok"] },
    // natural alternatives and short answers
    { say: "Ryan", intent: "name_ctx", step: "name" },
    { say: "A las tres", intent: "appt_time_ctx", step: "appt" },
    { say: "Hice la cita por teléfono", intent: "appt_have", step: "appt" },
    { say: "No, tengo cita a las cuatro", intent: "appt_have", step: "appt", not: ["appt_none"] },
    { say: "Una pulgada", intent: "length", step: "length" },
    { say: "Unos tres centimetros mas o menos", intent: "length", step: "length", slots: { c: 3 } },
    { say: "Con tijera", intent: "tool_ans" },
    { say: "Con ondas", intent: "style" },
    { say: "Tarjeta", intent: "pay_card", step: "pay" },
    { say: "Tenga, son trescientos", intent: "here_you_go", step: "pay" },
    { say: "Ya lo traigo limpio", intent: "no_wash", step: "wash", not: ["wash_request"] },
    { say: "Lo mismo que la última vez", intent: "trim", step: "service" },
    { say: "Un degradado, por favor", intent: "go_short", step: "service" },
    { say: "Corte y lavado", intent: "wash_request", step: "service" },
    { say: "¿Cuántos años tiene?", intent: "ask_cat", step: "chat" },
    { say: "Tengo un perro", intent: "pets_ans", step: "chat" },
    // tú to staff, Spain forms (vosotros, Spain words, vale): understood
    { say: "¿Me cortas el flequillo?", intent: "bangs_only" },
    { say: "¿Tenéis hueco ahora?", intent: "walkin", step: "appt" },
    { say: "¿Puedo pagar con el móvil?", intent: "pay_phone", step: "pay" },
    { say: "Vale, con tarjeta", intent: "pay_card", step: "pay" },
    { say: "Solo sanear las puntas", intent: "trim", step: "service" },
    // negation and meaning safety
    { say: "No quiero que me corte el fleco", intent: "no_bangs", step: "bangs_q", not: ["bangs_only"] },
    { say: "No quiero capas", intent: "no_layers", step: "layers", not: ["keep_layers"] },
    { say: "No me gusta", intent: "dont_like", step: "reveal", not: ["love_it"] },
    { say: "No me gusta mucho", intent: "dont_like", step: "reveal", not: ["love_it"] },
    { say: "No está mal", intent: "love_it", step: "reveal", not: ["dont_like"] },
    // the reviewer's traps: lost commas, the other way to pay, a past, a what-if, "al natural"
    { say: "No, está muy caliente", intent: "water_temp", not: ["water_ok"] },
    { say: "Tengo cita", intent: "appt_have", step: "appt", not: ["appt_none"] },
    { say: "Tengo cita, sí", intent: "appt_have", step: "appt", not: ["appt_none"] },
    { say: "No, está demasiado corto", intent: "short_amb_ctx", step: "reveal", not: ["love_it"] },
    { say: "No me cortó demasiado", intent: "short_amb_ctx", step: "reveal", not: ["love_it"] },
    { say: "Me lo dejó demasiado corto", intent: "shorter_than", step: "reveal", not: ["love_it"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No en efectivo, con tarjeta", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "No, al natural", intent: "style", step: "blowdry" },
    { say: "Que no quede muy corto, por favor", intent: "not_short", step: "service", not: ["go_short"] },
    { say: "No más corto", intent: "not_short", step: "service", not: ["go_short"] },
    { say: "Quiero un cambio, algo mucho más corto", intent: "go_short", step: "service" },
    { say: "Ahorita no, yo le llamo", intent: "book_later", step: "book", not: ["book_when"] },
    { say: "¿Y si le dejo propina?", intent: "none", step: "pay" },
    { say: "Café no, agua", intent: "drink_ans", step: "drink" },
    { say: "No quiero pagar con tarjeta", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Efectivo no, con tarjeta", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "No voy a dejar propina", intent: "no_tip", not: ["add_tip"] },
    { say: "¿Cuánto se deja de propina?", intent: "tip_howmuch", step: "pay", not: ["add_tip", "here_you_go"] },
    { say: "No quiero un cambio de look", intent: "none", step: "service", not: ["go_short"] },
    { say: "No quiero agendar todavía", intent: "book_later", step: "book", not: ["book_when"] },
    { say: "No tengo tiempo para un corte ahora", intent: "wait_no", step: "appt", not: ["walkin", "appt_have"] },
    { say: "Así está bien", intent: "fine_ctx", step: "reveal", not: ["dont_like"] },
    { say: "No, está bien así", intent: "fine_ctx", step: "reveal", not: ["dont_like"] },
    { say: "¿Cuánto es con propina?", intent: "tip_howmuch", step: "pay", not: ["add_tip"] },
    { say: "¿Y si pago con tarjeta?", intent: "pay_whatif", step: "pay", not: ["pay_card"] },
    { say: "Ya pagué", intent: "already_paid", step: "pay", not: ["here_you_go", "pay_card", "pay_cash"] },
    { say: "Quisiera un corte de cabello", intent: "haircut", step: "drink", not: ["drink_ans"] },
    { say: "No quiero que me lo seque", intent: "style", step: "blowdry" },
    { say: "Aquí tiene mi tarjeta", intent: "here_you_go", step: "pay" },
    { say: "¿Me da factura?", intent: "invoice_q", step: "pay" },
    { say: "¿Me da un recibo?", intent: "receipt_q", step: "pay" },
    { say: "No sé, ¿qué me recomienda?", intent: "recommend_q", step: "service" },
    { say: "Tengo las puntas abiertas", intent: "trim", step: "service" },
    { say: "Hasta los hombros", intent: "length", step: "length" },
    // the audit (5 Nov 2026): "Está bien, gracias" is no water; side questions; halves; "Sí, está más corto" agrees
    { say: "Está bien, gracias", intent: "yn:yes", step: "wash", not: ["water_ok", "water_ok_ctx", "wash_request"] },
    { say: "Está bien, gracias", intent: "yn:yes", step: "reveal", not: ["water_ok", "water_ok_ctx", "dont_like"] },
    { say: "Mucho mejor, gracias", intent: "love_it", step: "reveal", not: ["water_ok", "water_ok_ctx"] },
    { say: "¿Tiene costo extra?", intent: "extra_q", step: "wash", not: ["wash_request"] },
    { say: "¿El lavado está incluido?", intent: "extra_q", step: "wash", not: ["wash_request"] },
    { say: "¿Usted es Paty?", intent: "paty_name", step: "appt", not: ["appt_have"] },
    { say: "¿Cómo se llama usted?", intent: "paty_name", not: ["ask_cat", "ask_jessie"] },
    { say: "¿Cuánto tarda?", intent: "howlong_q", step: "service" },
    { say: "¿Aceptan dólares?", intent: "dollars_q", step: "pay", not: ["pay_card", "pay_cash"] },
    { say: "¿Hay un cajero cerca?", intent: "atm_q", step: "pay" },
    { say: "¿Tiene cambio de quinientos?", intent: "change_q", step: "pay", not: ["here_you_go"] },
    { say: "¿Tiene terminal?", intent: "pay_card", step: "pay" },
    { say: "¿La propina está incluida?", intent: "tip_howmuch", step: "pay", not: ["add_tip"] },
    { say: "No tengo capas", intent: "no_layers", step: "layers", not: ["keep_layers"] },
    { say: "No tengo fleco", intent: "no_bangs", step: "bangs_q", not: ["bangs_only"] },
    { say: "Sí, está más corto", intent: "shorter_than", step: "reveal", not: ["more_off"] },
    { say: "Dos centímetros y medio", intent: "length", step: "length", slots: { c: 2 } },
    { say: "Medio centímetro", intent: "length", step: "length" },
    { say: "El próximo mes", intent: "book_when", step: "book" },
    { say: "¿Usted es de aquí?", intent: "ask_jessie" },
    // not understood
    { say: "Mi perro come mucho", intent: "none" },
    { say: "El avión sale a las tres", intent: "none" },
    { say: "tijeras plátano luna", intent: "none" },
  ],

  sims: [
    // The two generic "Sí, por favor." answer the wash and the blow-dry: no layers or bangs question takes them first.
    { name: "appointment, trim, wash, card with tip", turns: ["¡Hola! Tengo cita a las tres.", "A nombre de Ryan.", "Nada más despuntar, por favor.", "Dos centímetros.", "Sí, por favor.", "Está perfecta.",
      "¡Qué chistoso!", "Sí, por favor.", "Lacio, por favor.", "¡Me encanta!", "Con tarjeta, por favor.", "El diez por ciento.", "Gracias, ¡hasta luego!"], expect: { complete: true, state: { paid: true, wash: true, blowdry: true, tip: true } }, auto: AUTO,
      setup: (s) => { s.askLayers = false; s.askBangs = false; s.askWash = true; s.askDry = true; s.catFirst = true; s.talkAfterCat = false; } },
    // The cat story comes first (the learner asks the cat's name); "¡Adiós!" at the booking question: paid, so the task is done.
    { name: "walk-in, wash, inches, water, cash tip", turns: ["Hola, ¿atienden sin cita?", "Lavado y despunte, por favor.", "Una pulgada.", "Sí, está bien.",
      "Está muy caliente.", "Ahora sí, está perfecta.", "¿Cómo se llama su gata?", "¡Quedó muy bien, gracias!", "¿Cuánto le debo?", "Tenga, quédese con el cambio.", "¡Adiós!"],
      expect: { complete: true, state: { paid: true, tip: true, cm: 3 } }, auto: AUTO, setup: (s) => { s.catFirst = true; s.askBook = true; s.walkinWait = false; } },
    { name: "bangs only, flequillo, cash", turns: ["Hola, no tengo cita.", "¿Me puede cortar el flequillo?", "¡Me encanta!", "En efectivo.", "Aquí tiene.", "Por ahora no, gracias.", "¡Adiós!"],
      expect: { complete: true, state: { service: "bangs", paid: true, payMethod: "cash", booked: false } }, auto: { ...AUTO, blowdry: "No, gracias, que se seque solo." }, setup: (s) => { s.askBook = true; s.walkinWait = false; } },
    // The twist on every seed: Paty took off more than agreed.
    { name: "shorter than expected (twist): polite reaction", turns: ["Tengo cita a las tres.", "Ryan.", "Quisiera un corte de cabello.", "No muy corto, por favor.", "Unos tres centímetros.",
      "Está un poco más corto de lo que pensaba.", "No pasa nada. Ya crecerá.", "¿Puedo pagar con tarjeta?", "¡Gracias!"], expect: { complete: true, state: { discount: true, paid: true } }, auto: AUTO,
      setup: (s) => { s.tooShort = true; } },
    { name: "shorter than expected (twist): a polite yes right away", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "Aun así me gusta, gracias.", "En efectivo.", "Tenga.", "Adiós."],
      expect: { complete: true, state: { discount: true, paid: true } }, auto: AUTO, setup: (s) => { s.tooShort = true; s.askBook = false; } },
    // Paty asks about the weekend (the party answer) and offers a blow-dry; the photo brings "¿Con máquina o con tijera?".
    { name: "photo, clippers and small talk", turns: ["¡Hola! Sí, tengo cita. A nombre de Ryan.", "¿Me lo puede cortar como en esta foto?", "Los lados con máquina del dos y arriba con tijera.",
      "Voy a una boda el sábado.", "Con volumen, por favor.", "¿Me puede cortar un poquito más?", "¡Perfecto, gracias!", "Con tarjeta.", "En un mes, por favor.", "¡Gracias!"],
      expect: { complete: true, state: { tool: "both", style: "volume", booked: true } },
      auto: { ...AUTO, blowdry: "Sí, por favor." },
      setup: (s) => { s.catFirst = false; s.talkTopic = "weekend"; s.askDry = true; s.askBook = true; s.tooShort = false; } },
    // Questions and changes of mind: the price first, a new look, scissors, no wash, the cat, "¿Y usted?", no blow-dry, "Así está bien".
    { name: "questions and changes of mind", turns: ["Hola, tengo cita a las tres.", "A nombre de Ryan.", "¿Cuánto cuesta el corte?", "Quiero un cambio de look.", "Más corto de los lados.",
      "Con tijera, por favor.", "No, ya lo traigo limpio.", "¿Cuántos años tiene?", "Nada especial, voy a descansar.", "¿Y usted?", "No, gracias, que se seque solo.", "Así está bien.",
      "¿Cuánto se deja de propina?", "No traigo efectivo.", "Con tarjeta.", "Sin propina, gracias.", "Por ahora no, gracias.", "¡Hasta luego!"],
      expect: { complete: true, state: { service: "short", tool: "scissors", wash: false, blowdry: false, paid: true, booked: false } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = true; s.askDry = true; s.catFirst = true; s.talkAfterCat = true; s.talkTopic = "weekend"; s.askBook = true; } },
    // Doesn't like it: what to change, a little more off the sides, then happy.
    { name: "not happy: a fix", turns: ["Sí, tengo cita.", "Me llamo Ryan.", "Nada más las puntas.", "No me gusta mucho.", "Un poquito más corto de los lados.", "Así está perfecto.", "¿Le puedo hacer una transferencia?", "Gracias, adiós."],
      expect: { complete: true, state: { revealed: true, paid: true, payMethod: "transfer" } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; s.askBook = false; s.tooShort = false; } },
    { name: "short answers", turns: ["Sí.", "Ryan.", "Las puntas.", "No.", "Sí.", "Perfecta.", "Un perro.", "¡Me encanta!", "Efectivo.", "Tenga.", "No, gracias.", "Adiós."],
      expect: { complete: true, state: { bangs: false, wash: true, paid: true, booked: false } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = true; s.askWash = true; s.askDry = false; s.catFirst = false; s.talkTopic = "pets"; s.askBook = true; s.tooShort = false; } },
    // The walk-in waits (twist): a client before them.
    { name: "walk-in waits fifteen minutes (twist)", turns: ["¿Tienen lugar ahorita?", "Sí, puedo esperar.", "Nada más las puntas.", "¡Me encanta!", "Con tarjeta.", "Gracias, adiós."],
      expect: { complete: true, state: { walkin: true, paid: true } }, auto: AUTO, setup: (s) => { s.walkinWait = true; s.askDrink = false; } },
    // The reviewer's money and comma checks: no cash (nothing charged), a transfer, "Así está bien" at the booking offer (asked again).
    { name: "no cash, transfer, booking asked again", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "¡Qué chistoso!", "¡Me encanta!", "No traigo efectivo.", "Con transferencia.", "Sí.", "Así está bien.", "Sí, por favor.", "Adiós."],
      expect: { complete: true, state: { paid: true, payMethod: "transfer", booked: true } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; s.askBook = true; s.tooShort = false; } },
    // The twist with its comma lost: "No, está demasiado corto" could be "No está demasiado corto"; Paty asks, then the discount.
    { name: "shorter than expected (twist): lost comma", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "¡Qué chistoso!", "No, está demasiado corto.", "Me lo dejó muy corto.", "En efectivo.", "Tenga.", "Adiós."],
      expect: { complete: true, state: { discount: true, paid: true } }, auto: AUTO,
      setup: (s) => { s.tooShort = true; s.askBook = false; s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; } },
    { name: "walk-in won't wait (twist)", turns: ["No tengo cita.", "Mejor regreso más tarde."], expect: { complete: false, state: { gaveUp: true } }, auto: AUTO, setup: (s) => { s.walkinWait = true; } },
    // The audit (5 Nov 2026), rule 17: "Está bien, gracias" at the wash, the blow-dry and the card reader's tip is asked again
    // ("Perdón, ¿entonces sí?"); then a no, a yes and a no: no wash, a blow-dry, no tip.
    { name: "polite closings at the paid extras", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "Está bien, gracias.", "No, gracias.", "¡Qué chistoso!",
      "Está bien, gracias.", "Sí, por favor.", "Lacio.", "¡Me encanta!", "Con tarjeta.", "Está bien, gracias.", "No, gracias.", "Adiós."],
      expect: { complete: true, state: { wash: false, blowdry: true, paid: true, tip: undefined, yesChecked_wash: true, yesChecked_blowdry: true, yesChecked_tip: true } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = true; s.askDry = true; s.catFirst = true; s.talkAfterCat = false; s.askBook = false; s.tooShort = false; } },
    // The twist: a bare "Sí" agrees she cut too much (an apology and the discount), never "¡Le queda muy bien!" at full price.
    { name: "shorter than expected (twist): a bare yes", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "¡Qué chistoso!", "Sí.", "En efectivo.", "Tenga.", "Adiós."],
      expect: { complete: true, state: { discount: true, paid: true } }, auto: AUTO,
      setup: (s) => { s.tooShort = true; s.askBook = false; s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; } },
    // The twist: "No, está bien" accepts it ("¡Ay, qué amable!" and the discount), never "¿Qué quiere que le cambie?"; "¿Cuánto más?" first.
    { name: "shorter than expected (twist): no, it's fine", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más las puntas.", "¡Qué chistoso!", "¿Cuánto más?", "No, está bien.", "Con tarjeta.", "No, gracias.", "Adiós."],
      expect: { complete: true, state: { discount: true, paid: true } }, auto: AUTO,
      setup: (s) => { s.tooShort = true; s.askBook = false; s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; } },
    // Side questions: Paty's name, how long, the bangs' price at "¿Le despunto también el fleco?" (included), an extra's cost, dollars, change.
    { name: "side questions: name, time, prices, dollars, change", turns: ["Hola, ¿usted es Paty?", "Sí, tengo cita a las tres.", "Ryan.", "¿Cuánto tarda?", "Nada más las puntas.", "¿Cuánto cuesta?", "Sí, por favor.",
      "¿Tiene costo extra?", "No, gracias.", "¡Qué chistoso!", "¡Me encanta!", "¿Aceptan dólares?", "¿Tiene cambio de quinientos?", "Tenga, quinientos.", "Adiós."],
      expect: { complete: true, state: { bangs: true, wash: false, paid: true } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = true; s.askWash = true; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; s.askBook = false; s.tooShort = false; } },
    // Halves are said as halves ("dos centímetros y medio"); the next visit at another hour.
    { name: "a length in halves, booked earlier in the day", turns: ["Tengo cita a las tres.", "Ryan.", "Nada más despuntar.", "Dos centímetros y medio.", "¡Qué chistoso!", "¡Me encanta!", "Con tarjeta.",
      "No, gracias.", "Sí.", "Sí, pero más temprano.", "Adiós."],
      expect: { complete: true, state: { cm: 2.5, paid: true, booked: true } }, auto: AUTO,
      setup: (s) => { s.askDrink = false; s.askLayers = false; s.askBangs = false; s.askWash = false; s.askDry = false; s.catFirst = true; s.talkAfterCat = false; s.askBook = true; s.tooShort = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Flow helpers

/** True the first time `key` comes up in this learner turn (a sentence can be split into two segments): the engine gives every turn its own
 *  context object, so the same words said again in a later turn count again. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** Paid: the task is done. Booking the next visit is optional, so "Gracias, adiós" at that question still counts. */
function markPaid(c: Ctx) {
  c.s.paid = true;
  c.complete();
}

/** Paying at "¿Qué le parece?" (the haircut is done): the learner is happy with it, so the payment goes ahead. */
function skipToPay(c: Ctx) {
  if (c.s.cutDone && !c.s.revealed) c.s.revealed = true;
}

function checkIn(c: Ctx) {
  c.s.checkedIn = true;
  if (c.s.otherTime) c.say("appt_other_time");
  else c.say("appt_found");
}

function autoCheckIn(c: Ctx) {
  // The learner went straight to the haircut: treat them as checked in.
  c.s.checkedIn = true;
  if (c.s.appt === undefined) c.s.appt = true;
}

function walkIn(c: Ctx) {
  if (c.s.walkinWait) {
    c.twist("walkin_wait");
    c.s.waiting = true;
    c.say("walkin_wait");
    c.expect({ id: "wait_q", expects: ["wait_ok", "wait_no"], hints: ["wait", "wait_later", "g_yesno"], suggest: [{ lt: "Say you'll wait", hint: "wait" }, { lt: "Say you'll come back later", hint: "wait_later" }],
      on: { wait_ok: (cc) => { finishWait(cc); }, wait_no: (cc) => { cc.s.waiting = false; cc.s.gaveUp = true; cc.say("wait_no_line"); cc.end(); } },
      yes: (cc) => { finishWait(cc); },
      no: (cc) => { cc.s.waiting = false; cc.s.gaveUp = true; cc.say("wait_no_line"); cc.end(); },
      ask: (cc) => cc.say("walkin_wait") });
    return;
  }
  c.say("walkin_ok");
  c.s.checkedIn = true;
}

function finishWait(c: Ctx) {
  c.s.waiting = false;
  c.say("wait_ok_line");
  c.say("come_back_now");
  c.s.checkedIn = true;
}

function startWash(c: Ctx) {
  c.s.wash = true;
  c.say("wash_start");
  c.say("ask_water");
  c.expect(waterPending(c));
}

function waterPending(_c: Ctx): Pending {
  return { id: "water", expects: ["water_temp", "water_ok", "water_ok_ctx", "fine_ctx"], hints: ["water"], suggest: [{ lt: "Say how the water is", hint: "water" }],
    on: {
      water_temp: (cc, sl, sg) => { salon.handlers.water_temp(cc, sl, sg); },
      water_ok: (cc) => { cc.say("water_good"); },
      water_ok_ctx: (cc) => { cc.say("water_good"); },
      fine_ctx: (cc) => { cc.say("water_good"); },
      g_ok: (cc) => { cc.say("water_good"); },
      confirm_yes: (cc) => { cc.say("water_good"); },
    },
    yes: (cc) => { cc.say("water_good"); },
    no: (cc) => { cc.say("water_fix_hot"); cc.expect(waterPending(cc)); },
    ask: (cc) => cc.say("ask_water") };
}

/** "¿Una pulgada? Son como dos centímetros y medio. ¿Le parece bien?" (also after a big length). */
function cmPending(): Pending {
  return { id: "cm_q", optional: true, hints: ["confirm", "length", "g_yesno"], expects: ["confirm_yes", "fine_ctx", "length", "less_ctx"],
    suggest: [{ lt: "Say if that's okay", hint: "confirm" }, { lt: "Say how much to cut", hint: "length" }],
    on: { confirm_yes: (cc) => { cc.say("ack"); maybeAskTool(cc); }, fine_ctx: (cc) => { cc.say("ack"); maybeAskTool(cc); },
      less_ctx: (cc, sl, sg) => { salon.handlers.less_ctx(cc, sl, sg); } },
    yes: (cc) => { cc.say("ack"); maybeAskTool(cc); }, no: (cc) => { cc.s.lengthSet = false; cc.ask("length"); }, ask: (cc) => cc.say("cm_confirm") };
}

/** "¿Con máquina o con tijera?": once, for a short haircut or shorter sides. */
function maybeAskTool(c: Ctx) {
  if (c.s.toolAsked || c.s.tool || !(c.s.service === "short" || c.s.sides)) return;
  c.s.toolAsked = true;
  c.say("ask_tool");
  c.expect(toolPending());
}

function toolPending(): Pending {
  return { id: "tool_q", optional: true, expects: ["tool_ans", "tool_ctx"], hints: ["tool"], suggest: [{ lt: "Say clippers or scissors", hint: "tool" }],
    on: { tool_ans: (cc, sl, sg) => { salon.handlers.tool_ans(cc, sl, sg); }, tool_ctx: (cc, sl, sg) => { salon.handlers.tool_ans(cc, sl, sg); },
      // "No sé" to clippers or scissors: Paty picks scissors
      g_dontknow: (cc) => { cc.s.tool = "scissors"; cc.say("tool_choose"); } },
    // a bare yes or no to an either-or question: scissors
    yes: (cc) => { cc.s.tool = "scissors"; cc.say("tool_choose"); },
    no: (cc) => { cc.s.tool = "scissors"; cc.say("tool_choose"); },
    ask: (cc) => cc.say("ask_tool") };
}

/** "No está bien así" (or "No, está bien así") at the result: Paty asks which. */
function askAmbResult(c: Ctx) {
  c.say("amb_result");
  c.expect({ id: "amb_q", optional: true, expects: ["love_it", "more_off", "polite_ok", "shorter_than", "dont_like", "fine_ctx", "nothing_ctx"], hints: ["result", "fix"],
    suggest: [{ lt: "Say how you like it", hint: "result" }, { lt: "Say what to change", hint: "fix" }],
    on: { fine_ctx: (cc) => { acceptCut(cc); }, nothing_ctx: (cc) => { acceptCut(cc); } },
    yes: (cc) => { acceptCut(cc); },
    no: (cc) => { if (saidFine(cc)) { acceptCut(cc); return; } salon.handlers.dont_like(cc, {}, { intent: "dont_like", slots: {}, tags: [] }); },
    ask: (cc) => cc.say("amb_result") });
}

/** The learner accepts the haircut politely ("No pasa nada", "No, así está bien"): at the twist with the discount. */
function politeAccept(c: Ctx) { salon.handlers.polite_ok(c, {}, { intent: "polite_ok", slots: {}, tags: [] }); }

/** "Así está bien" / "Nada" when Paty asked which: at the twist the discount (politeAccept), otherwise she's glad. */
function acceptCut(c: Ctx) {
  if (c.s.shortSaid && !c.s.discount) { politeAccept(c); return; }
  c.s.revealed = true; c.say("love_reply");
}

/** The twist: "Ay… creo que le corté un poquito más de lo que dijimos." The guide suggests a polite reaction first. A bare yes
 *  agrees it's shorter (an apology and the discount), or accepts it ("Sí, está bien": thanks and the discount); "No, está bien"
 *  accepts it and a bare "No" is unclear (Paty asks); "¿Cuánto más?" gets an answer. */
function twistPending(): Pending {
  const st = salon.steps.find((x) => x.id === "reveal")!;
  return { id: "reveal", optional: true, expects: [...(st.expects ?? []), "short_much_ctx"],
    on: { short_much_ctx: (cc) => { cc.say("short_more"); cc.expect(twistPending()); } },
    yes: (cc) => { if (saidFine(cc)) politeAccept(cc); else salon.handlers.shorter_than(cc, {}, { intent: "shorter_than", slots: {}, tags: [] }); },
    no: (cc) => { if (saidFine(cc)) politeAccept(cc); else askAmbResult(cc); },
    suggest: [{ lt: "React politely", hint: "short" }, { lt: "Say how you like it", hint: "result" }], hints: ["short", "result"] };
}

/** The card reader's tip question. "Está bien, gracias" may be a polite no: asked once (rule 17). */
function tipPending(): Pending {
  return { id: "tip_q", optional: true, expects: ["add_tip", "no_tip", "tip_num_ctx", "tip_howmuch"], hints: ["tip", "pay"], suggest: [{ lt: "Choose a tip", hint: "tip" }],
    on: {
      add_tip: (cc, sl, sg) => { salon.handlers.add_tip(cc, sl, sg); },
      tip_num_ctx: (cc, sl, sg) => { salon.handlers.add_tip(cc, sl, sg); },
      no_tip: (cc) => { cc.say("paid"); },
      tip_howmuch: (cc) => { cc.say("tip_info"); cc.expect(tipPending()); },
    },
    yes: (cc) => { if (askedAgain(cc, "tip")) { cc.expect(tipPending()); return; } cc.s.tip = true; cc.say("thanks_tip"); },
    no: (cc) => { cc.say("paid"); } };
}

function stylePending(_c: Ctx): Pending {
  return { id: "style", expects: ["style", "style_any_ctx"], hints: ["style"], suggest: [{ lt: "Say how to dry it", hint: "style" }],
    on: { style: (cc, sl, sg) => { salon.handlers.style(cc, sl, sg); }, style_any_ctx: (cc, sl, sg) => { salon.handlers.style_any_ctx(cc, sl, sg); } },
    yes: (cc) => { cc.s.style = "straight"; cc.say("style_ok"); },
    no: (cc) => { cc.s.blowdry = false; cc.say("no_dry_ok"); },
    ask: (cc) => cc.say("ask_style") };
}

/** The answer to a question about the cat: her age, whether she's a girl, or her name. A bare "¿Cómo se llama?" before
 *  the cat has come up asks Paty's own name. */
function sayCat(c: Ctx, tags: string[]) {
  if (tags.includes("bare") && !c.s.catTold) { c.say("paty_name"); return; }
  c.s.catTold = true;
  if (tags.includes("age")) c.say("cat_age");
  else if (tags.includes("sex")) c.say("cat_sex");
  else c.say("cat_name");
}

function catPending(_c: Ctx): Pending {
  return { id: "chat", optional: true, expects: ["react_funny", "ask_cat", "pets_ans", "weekend_ctx", "vacation_ctx", "from_ans", "love_it"], hints: ["chat"], suggest: [{ lt: "React or ask about the cat", hint: "chat" }],
    on: {
      react_funny: (cc) => { if (firstThisTurn(cc, "react")) { cc.say("cat_laugh"); endChat(cc); } },
      ask_cat: (cc, _sl, sg) => { sayCat(cc, sg.tags); endChat(cc); },
      g_ok: (cc) => { if (firstThisTurn(cc, "react")) { cc.say("cat_laugh"); endChat(cc); } },
      // "¡Me encanta!" to the cat story: a reaction, not the haircut
      love_it: (cc) => { if (firstThisTurn(cc, "react")) { cc.say("cat_laugh"); endChat(cc); } },
      pets_ans: (cc, sl, sg) => { salon.handlers.pets_ans(cc, sl, sg); endChat(cc); },
      weekend_ctx: (cc, sl, sg) => { salon.handlers.weekend_ctx(cc, sl, sg); },
      vacation_ctx: (cc, sl, sg) => { salon.handlers.vacation_ctx(cc, sl, sg); },
      from_ans: (cc, sl, sg) => { salon.handlers.from_ans(cc, sl, sg); },
    },
    yes: (cc) => { cc.say("cat_laugh"); endChat(cc); },
    no: (cc) => { cc.say("cat_anyway"); endChat(cc); } };
}

/** "¿Y usted?": Paty answers the question she asked (the weekend when no topic came up); "¿Usted es de aquí?", "¿Usted tiene
 *  mascotas?": the topic asked. */
function sayJessie(c: Ctx, tags: string[] = []) {
  const topic = ["from", "vacation", "pets", "weekend"].find((x) => tags.includes(x)) ?? (c.s.askedTalk ? (c.s.talkTopic as string) : "weekend");
  if (topic === "pets" || topic === "weekend") c.s.catTold = true;
  c.say(topic === "from" ? "jessie_from" : topic === "vacation" ? "jessie_vacation" : topic === "pets" ? "jessie_pets" : "jessie_weekend");
}

/** "¿En seis semanas, a la misma hora?" */
function bookWhenPending(): Pending {
  return { id: "book_when", optional: true, expects: ["book_when", "book_later", "fine_ctx", "book_time_ctx"], hints: ["book", "g_yesno"],
    suggest: [{ lt: "Agree or suggest another time", hint: "book" }],
    on: { book_when: (cc) => { cc.s.booked = true; cc.say("book_done"); }, book_later: (cc) => { cc.s.booked = false; cc.say("book_later_ok"); },
      // "Sí, pero más temprano", "¿Puede ser a las once?": booked at another hour
      book_time_ctx: (cc) => { cc.s.booked = true; cc.say("book_done"); },
      // "Así está bien": "that works" or "I'm fine, thanks"? Paty asks again (rule 17)
      fine_ctx: (cc) => { cc.say("book_amb"); cc.expect(bookWhenPending()); } },
    yes: (cc) => { cc.s.booked = true; cc.say("book_done"); },
    no: (cc) => { cc.s.booked = false; cc.say("book_later_ok"); },
    ask: (cc) => cc.say("book_offer") };
}

function endChat(c: Ctx) {
  // After the cat story, Paty sometimes asks one small-talk question (decided in init).
  if (!c.s.askedTalk && c.s.talkAfterCat) askSmallTalk(c);
}

function askSmallTalk(c: Ctx) {
  c.s.askedTalk = true;
  const topic = c.s.talkTopic as string;
  const line = topic === "weekend" ? "ask_weekend" : topic === "from" ? "ask_from" : topic === "vacation" ? "ask_vacation" : "ask_pets";
  c.say(line);
  c.expect({ id: "chat_" + topic, optional: true, expects: ["weekend_ctx", "from_ans", "vacation_ctx", "pets_ans", "weekend_unknown", "ask_cat", "ask_jessie", ...(topic === "pets" ? ["pets_none_ctx"] : [])], hints: ["talk_" + topic, "chat"],
    suggest: [{ lt: "Answer the stylist", hint: "talk_" + topic }],
    on: {
      weekend_ctx: (cc, sl, sg) => { salon.handlers.weekend_ctx(cc, sl, sg); },
      weekend_unknown: (cc) => { if (firstThisTurn(cc, "react")) cc.say("react_fun"); },
      from_ans: (cc, sl, sg) => { salon.handlers.from_ans(cc, sl, sg); },
      vacation_ctx: (cc, sl, sg) => { salon.handlers.vacation_ctx(cc, sl, sg); },
      pets_ans: (cc, sl, sg) => { salon.handlers.pets_ans(cc, sl, sg); },
      ask_jessie: (cc, _sl, sg) => { sayJessie(cc, sg.tags); },
      ask_cat: (cc, _sl, sg) => { sayCat(cc, sg.tags); },
      pets_none_ctx: (cc) => { cc.say("react_nopet"); },
    },
    yes: (cc) => { cc.say("react_fun"); },
    no: (cc) => { cc.say(topic === "pets" ? "react_nopet" : topic === "from" ? "cat_anyway" : topic === "vacation" ? "react_unsure" : "react_relax"); },
    ask: (cc) => cc.say(line) });
}

export default salon;
