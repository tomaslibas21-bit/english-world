// NEEDS: (engine, src/editions/es/convo/lang.ts) "la", "lo", "las", "los" are correctionStarters, so "No la tire, me la
// tomo" is read as "No," + "la tire" (throw it) + "me la tomo": a clitic right before a verb should keep the "no" as the
// verb's negation, as "me" does. Worked around here (`negated`, the bottle handlers), but every conversation with
// "No lo/la + verb" has the same flip.
// Song 64 "Window or Aisle?" (part 2 of 3) → Puerto Colibrí airport, the security checkpoint ("el filtro"),
// Oficial Torres (m, usted). Keeps the English agenda: documents → (a look at the face) → laptop, liquids, belt and
// jacket in the tray → the scanner or the walk-through arch → (twist) the bag check with a water bottle → the bag back.
// Changes for Mexico: "pase de abordar e identificación", the tray is "la charola" (M: bandeja), the jacket "la
// chamarra" (M: chaqueta), the gate "la sala" (M: puerta); the arch ("el arco"). Pockets are "los bolsillos" in his
// lines ("las bolsas" is understood): "bolsa" is already the clear liquids bag and the learner's bag;
// liquids in containers of 100 ml or less in a clear bag (the 1-liter bag isn't sized in lines); "tomársela"
// (drink it). The camera step is the officer comparing the ID photo: "Mire hacia acá".
// Twists, as in English: the alarm (pockets → belt or watch → shoes off), and the bag check (a water bottle).
// Research (2 Nov 2026): general Mexican and international screening guides (100 ml containers in a clear resealable
// bag; laptops out of the case; belts, keys, coins in the tray; shoes only if the officer asks). Kept vague where
// unsure: whether shoes come off (they stay on unless the arch keeps beeping), and the free plastic bags at the
// checkpoint. Every bag Torres checks is "la maleta" (one word for one thing), so the pronoun is "la" throughout.

import type { Ctx, Pending, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const AUTO: Record<string, string> = {
  docs: "Aquí tiene.",
  docs_more: "Está en mi celular.",
  camera: "Claro.",
  divest: "Listo.",
  walk: "Listo.",
  pockets: "Solo mis llaves.",
  belt_watch: "Ah, sí, mi cinturón.",
  shoes_off: "Claro.",
  again: "Listo.",
  check_pockets: "¡Ay, mi celular!",
  bag_q: "Sí, es mía.",
  bottle_found: "Ay, perdón, se me olvidó.",
  bottle: "La puede tirar.",
  bottle_keep: "Bueno, la vacío.",
  collect: "¿Me da mi maleta?",
};

const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "No la tire", "No la vacío", "No me la tomo" said in the same turn as another choice: the engine reads the "no"
 *  as an answer and the rest as the choice it refuses (NEEDS above), so the refused choice must not act. */
const NEG_CHOICE: Record<string, RegExp> = {
  throw: /\bno\s+(?:se\s+|me\s+)?(?:la|lo)\s+(?:tir|bot)\w*/,
  drink: /\bno\s+(?:me\s+|se\s+)?(?:la|lo)\s+(?:tom|beb)\w*/,
  empty: /\bno\s+(?:la|lo)\s+vac\w*/,
};
const negated = (c: Ctx, k: string) => NEG_CHOICE[k].test(fold(c.heard));
/** "No traigo cinturón, pero sí reloj": a "nothing" piece next to a "but yes" piece is not a no. */
const butYes = (c: Ctx) => /\b(pero|aunque)\b.*\bsi\b|\b(cinturon|reloj|celular|llaves|cartera)\s+si\b|\bsi\s+(traigo|tengo)\b/.test(fold(c.heard));

// ---------------------------------------------------------------------------

/** c.expect() that also takes "Sí, es mía" / "No es mía" (affirm / deny) as its yes / no. */
function ask(c: Ctx, p: Pending) {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.affirm) on.affirm = (cc) => { p.yes!(cc); };
  if (p.no && !on.deny) on.deny = (cc) => { p.no!(cc); };
  c.expect({ ...p, on });
}

function docsGiven(c: Ctx, tags: string[]) {
  const both = tags.includes("both") || (!tags.includes("id") && !tags.includes("bp"));
  if (both || tags.includes("id")) c.s.id = true;
  if (both || tags.includes("bp")) c.s.bp = true;
  if (tags.includes("phone")) { c.s.bp = true; c.say("phone_scan"); }
  if (c.s.id && c.s.bp) { c.s.docsDone = true; if (!c.s.camera) c.say("docs_ok"); return; }
  c.say(c.s.id ? "docs_need_bp" : "docs_need_id");
  ask(c, {
    id: "docs_more", expects: ["give_docs"], hints: ["docs"],
    suggest: [{ lt: "Hand over the missing document", hint: "docs" }],
    on: { give_docs: (cc, _sl, sg) => { docsGiven(cc, sg.tags.includes("both") || sg.tags.includes("id") || sg.tags.includes("bp") ? sg.tags : [cc.s.id ? "bp" : "id"]); } },
    yes: (cc) => { docsGiven(cc, [cc.s.id ? "bp" : "id"]); },
    ask: (cc) => cc.say(cc.s.id ? "docs_need_bp" : "docs_need_id"),
  });
}

function walkThrough(c: Ctx) {
  if (c.s.alarm && !c.s.alarmDone) {
    c.twist("alarm");
    c.s.alarmDone = true;
    c.say(c.s.scanner ? "alarm_scanner" : "alarm_beep");
    c.say("ask_pockets");
    expectPockets(c);
    return;
  }
  c.s.walked = true;
  c.say(c.s.scanner ? "scan_done" : "walk_clear");
}

function expectPockets(c: Ctx) {
  ask(c, {
    id: "pockets", expects: ["pockets_item", "pockets_nothing"], hints: ["pockets"],
    suggest: [{ lt: "Say what's in your pockets (or nothing)", hint: "pockets" }],
    on: {
      pockets_item: (cc) => { removeItem(cc); },
      pockets_nothing: (cc) => { if (butYes(cc)) return false; askBeltWatch(cc); },
      g_dontknow: (cc) => { cc.say("check_pockets"); expectCheckPockets(cc); },
    },
    yes: (cc) => { cc.say("what_is_it"); expectPockets(cc); },
    no: (cc) => { askBeltWatch(cc); },
    ask: (cc) => cc.say("ask_pockets"),
  });
}

function expectCheckPockets(c: Ctx) {
  ask(c, {
    id: "check_pockets", expects: ["pockets_item", "pockets_nothing"], hints: ["pockets"],
    suggest: [{ lt: "Say what you found in your pockets", hint: "pockets" }],
    on: {
      pockets_item: (cc) => { removeItem(cc); },
      pockets_nothing: (cc) => { if (butYes(cc)) return false; askBeltWatch(cc); },
    },
    yes: (cc) => { cc.say("what_is_it"); expectPockets(cc); },
    no: (cc) => { askBeltWatch(cc); },
    ask: (cc) => cc.say("check_pockets"),
  });
}

function removeItem(c: Ctx) {
  c.say("put_it_bin");
  expectAgain(c);
}

function askBeltWatch(c: Ctx) {
  c.say("ask_belt_watch");
  ask(c, {
    id: "belt_watch", expects: ["pockets_item", "pockets_nothing"], hints: ["beltwatch"],
    suggest: [{ lt: "Answer about a belt or a watch", hint: "beltwatch" }],
    on: {
      pockets_item: (cc) => { cc.say("put_it_bin_too"); expectAgain(cc); },
      pockets_nothing: (cc) => { if (butYes(cc)) return false; shoesOff(cc); },
    },
    yes: (cc) => { cc.say("put_it_bin_too"); expectAgain(cc); },
    no: (cc) => { shoesOff(cc); },
    ask: (cc) => cc.say("ask_belt_watch"),
  });
}

function shoesOff(c: Ctx) {
  c.twist("shoes_off");
  c.s.shoesAsked = true;
  c.say("shoes_alarm");
  const off = (cc: Ctx) => { cc.s.shoesOff = true; cc.say("again_ask"); expectAgain(cc); };
  ask(c, {
    id: "shoes_off", expects: ["ack_done"], hints: ["ok_short"],
    suggest: [{ lt: "Take off your shoes", hint: "ok_short" }],
    on: { ack_done: off, g_ok: off },
    yes: off,
    no: (cc) => { cc.say("shoes_must"); shoesOff(cc); },
    ask: (cc) => cc.say("shoes_alarm"),
  });
}

function expectAgain(c: Ctx) {
  const clear = (cc: Ctx) => { cc.s.walked = true; cc.say("walk_clear"); };
  ask(c, {
    id: "again", expects: ["ack_done"], hints: ["walk"],
    suggest: [{ lt: "Walk through again", hint: "walk" }],
    on: { ack_done: clear, g_ok: clear, pockets_item: clear },
    yes: clear,
    no: (cc) => { cc.say("g_take_time"); expectAgain(cc); },
    ask: (cc) => cc.say("again_ask"),
  });
}

function startBottle(c: Ctx) {
  c.twist("bag_check");
  c.s.bagHeld = true;
  c.say("need_check");
  c.say("found_bottle");
  // An optional reaction ("Ay, perdón, se me olvidó"); the "bottle" step then explains the rule and the options.
  ask(c, {
    id: "bottle_found", optional: true, expects: ["forgot", "bottle_drink", "bottle_throw", "bottle_empty", "bottle_keep"], hints: ["bottle_sorry", "bottle"],
    suggest: [{ lt: "Say sorry: you forgot", hint: "bottle_sorry" }, { lt: "Say what to do with the bottle", hint: "bottle" }],
    on: {
      forgot: (cc) => { cc.say("no_worries"); },
      g_sorry: (cc) => { cc.say("no_worries"); },
      g_ok: () => {},
      ask_what: () => {},
    },
    yes: () => {},
    no: () => {},
  });
}

function bottleDone(c: Ctx, line: string) {
  c.s.bagChecked = true;
  c.s.bottleChoice = line;
  c.say(line);
}

const stepOf = (c: Ctx) => security.steps.find((x) => x.id === c.step);
/** A question while he waits for the tray: he answers and keeps waiting (no "Avíseme…" after every answer). */
const waitOn = (c: Ctx) => { if (c.step === "divest") c.hold(); };


/** "¿Me puedo quedar con la botella?" → "Agua no; la botella sí, vacía." and the choice is open again. */
function expectBottleKeep(c: Ctx) {
  ask(c, {
    id: "bottle_keep", expects: ["bottle_empty", "bottle_throw", "bottle_drink", "bottle_neg"], hints: ["bottle"],
    suggest: [{ lt: "Empty it, drink it or throw it away", hint: "bottle" }],
    on: {
      bottle_empty: (cc) => { if (negated(cc, "empty")) return false; bottleDone(cc, "empty_ok"); },
      bottle_throw: (cc) => { if (negated(cc, "throw")) return false; bottleDone(cc, "toss_ok"); },
      bottle_drink: (cc) => { if (negated(cc, "drink")) return false; bottleDone(cc, "drink_ok"); },
    },
    // "Sí" agrees to the empty bottle; a bare "No" chooses nothing, so the options come again
    yes: (cc) => { bottleDone(cc, "empty_ok"); },
    no: (cc) => { cc.say("bottle_options"); expectBottleKeep(cc); },
    ask: (cc) => cc.say("bottle_options"),
  });
}

// ---------------------------------------------------------------------------

export const security: SituationDef = {
  id: "s64b-security",
  song: 64,
  songTitle: "Window or Aisle?",
  title: { en: "Saque la laptop, por favor", lt: "Laptops out, please" },
  topic: { en: "Seguridad del aeropuerto", lt: "Airport security" },
  chapter: 6,
  order: 6,
  location: "airport",
  npc: "grant",
  goal: "Get through airport security: show your documents, put your things in the tray and walk through the scanner.",
  intro: "Puerto Colibrí's airport, the security checkpoint (in Mexico, “el filtro”). Oficial Torres checks your boarding pass and ID. Laptops and liquids come out of your bag; liquids go in containers of 100 ml or less, in a clear bag. Your belt and jacket go in the tray (“la charola”); shoes usually stay on.",

  grammar: {
    macros: {
      bp: "(pase de abordar | pase de abordaje | pase | tarjeta de embarque | boleto | boarding pass)",
      id: "(pasaporte | identificacion | licencia | licencia de manejo | licencia de conducir | credencial | ine | id)",
      comp: "(laptop | lap | computadora | compu | computadora portatil | portatil | tablet | tableta | ipad | kindle)",
      tray: "(charola | charolas | bandeja | bandejas | caja | cajas | contenedor)",
      pockets: "(bolsillos | bolsillo | bolsas | bolsa del pantalon | bolsas del pantalon)",
      liq: "(liquidos | liquido | shampoo | champu | perfume | crema | cremas | pasta de dientes | gel | desodorante | locion | bloqueador | protector solar | maquillaje | enjuague)",
      jacket: "(chamarra | chaqueta | sudadera | sueter | abrigo | saco | jersey | chaleco | gorra | cachucha | sombrero | gorro)",
      shoes: "(zapatos | tenis | botas | sandalias | huaraches | zapatillas)",
      tq: "(tengo que | debo | necesito | hay que | tengo | se tiene que)",
      bag: "(maleta | mochila | bolsa | maletita | backpack)",
    },
    slots: {
      pocket: { lexicon: [
        { id: "keys", forms: ["llaves", "llave", "llavero", "las llaves"], tags: ["pl"] },
        { id: "phone", forms: ["celular", "telefono", "cel", "iphone", "smartphone", "telefono celular"] },
        { id: "wallet", forms: ["cartera", "billetera", "monedero"] },
        { id: "coins", forms: ["monedas", "moneda", "cambio", "morralla", "unas monedas"], tags: ["pl"] },
        { id: "belt", forms: ["cinturon", "cinto"] },
        { id: "watch", forms: ["reloj", "smartwatch", "reloj inteligente"] },
        { id: "lighter", forms: ["encendedor", "mechero"] },
        { id: "pen", forms: ["pluma", "boligrafo", "lapicero", "lapiz"] },
        { id: "earbuds", forms: ["audifonos", "airpods", "auriculares"], tags: ["pl"] },
        { id: "gum", forms: ["chicle", "chicles"] },
        { id: "tissue", forms: ["panuelo", "panuelos", "kleenex", "papel", "papelito", "servilleta", "ticket", "recibo"] },
        { id: "money", forms: ["dinero", "efectivo", "billetes", "lana"] },
        { id: "glasses", forms: ["lentes", "lentes de sol", "lentes oscuros", "anteojos"], tags: ["pl"] },
        { id: "jewelry", forms: ["anillo", "pulsera", "collar", "aretes", "arete", "cadena", "joyas", "esclava"] },
      ] },
    },
  },

  intents: {
    // "¿Esta maleta es suya?" → "Sí, es mía"
    affirm: { patterns: [
      "[si] es mia #h:bq_mine", "[si] es mio", "[si] (esa es | esta es) (mia | mi maleta | mi mochila)", "(es | esa es | esta es) mi @bag",
      "[si] (es mia | es mio) [que] (hay algun problema | pasa algo | por que | que pasa | algun problema)",
      "si (hay algun problema | pasa algo | algun problema) #h:bq_yes", "si por que",
      "[si] (la | el) (negra | negro | azul | roja | rojo | gris | verde | cafe | chica | chico | grande | pequena | morada | rosa) es (mia | mio)",
      "[si] (mia | mio | es mia si)", "si si es mia", "[si] es la mia", "cual [ah] [si] es (mia | mio)",
    ] },
    // "No es mía" (spelled out: the engine reads "No, no …" as "No, no" plus the rest)
    deny: { patterns: [
      "no es mia #h:bq_not", "no no es mia", "no es mio", "no no es mio", "(esa | esta) no es mia", "(esa | esta) no es mi @bag", "no es mi @bag", "no no es mi @bag",
      "no esa no es mia", "mia no", "no la conozco", "no se de quien es",
      "[no] [esa no] la mia es (la | una) (negra | azul | roja | gris | verde | cafe | chica | grande | pequena | morada | rosa | otra)",
      "[no] la (negra | azul | roja | gris | verde | cafe | chica | grande | pequena | morada | rosa) no es mia",
    ] },
    // "No sé si es mía": he lets the learner look again
    bag_unsure_ctx: { patterns: [
      "no (se | estoy seguro | estoy segura) si es (mia | mio | mi maleta | mi mochila)", "no se cual es la mia", "(cual | cual maleta)",
      "(a lo mejor | puede ser | tal vez | quiza) [sea mia]",
    ] },
    give_docs: { patterns: [
      "aqui tiene #h:docs_here #both", "(tenga | tome) #both", "aqui (estan | esta) #both", "aqui (los | las) tiene #both", "(aqui | tome | tenga) los dos #both", "(aqui tiene | aqui estan | tenga) (mis | los) documentos #both",
      "(aqui tiene | aqui esta | aqui estan | tenga | tome) [mi | el] @id y [mi | el] @bp #h:docs_both #both",
      "(aqui tiene | aqui esta | aqui estan | tenga | tome) [mi | el] @bp y [mi | el] @id #both",
      "(aqui tiene | aqui esta | tenga | tome) (mi | el) @id #id", "(aqui tiene | aqui esta | tenga | tome) (mi | el) @bp #bp",
      "(mi | el) @bp (esta | lo tengo) en (mi | el) (celular | telefono) #h:docs_phone #bp #phone",
      "(lo | la) tengo en (mi | el) (celular | telefono) #bp #phone", "(esta | lo tengo) en (mi | el) (celular | telefono) #bp #phone",
      "(esta | lo tengo) en la (app | aplicacion) #bp #phone", "tengo (el | mi) @bp en (el | mi) (celular | telefono | la app) #bp #phone",
      "tengo (el | un) @bp (electronico | digital) #bp #phone",
      "(este | esta) es mi @id #id", "(este | esta) es mi @bp #bp", "mi @id y mi @bp #both", "mi @bp y mi @id #both",
      "(aqui tiene | aqui esta) mi @id y (mi @bp esta | el @bp esta) en (mi | el) celular #both #phone",
    ] },
    docs_q: { patterns: [
      "(necesita | quiere | ocupa) (mi | el | la) (pasaporte | identificacion | pase de abordar | pase | licencia) #h:docs_q #need",
      "(necesitas | quieres) (mi | el | la) (pasaporte | identificacion | pase de abordar | pase) #tip:tu_staff #need",
      "(le doy | le muestro | le enseno) (mi | el | la) (@id | @bp) #need", "(necesita | quiere) ver (mi | el | la) (@id | @bp) #need",
      "(sirve | esta bien) (mi | el | la) (@id | @bp)  #okq", "(mi | el | la) (@id | @bp) (sirve | esta bien) #okq",
      "(puedo | se puede) (mostrarlo | ensenarlo | mostrarla | ensenarla | usar el celular | usar mi celular) [en (el | mi) celular] #okq",
      "(lo | la) puedo (mostrar | ensenar) en (el | mi) celular #okq", "(esta bien | sirve) en (el | mi) celular #okq",
      "(cual | que) (identificacion | documento | documentos) (necesita | quiere | le doy) #which",
      "(cual | que) (identificacion | documento) (necesitas | quieres | te doy) #tip:tu_staff #which",
      "(necesita | quiere) (el | mi) pasaporte o (la | mi) licencia #which",
    ] },
    is_this_line: { patterns: [
      "(es | esta es) la (fila | cola) (para | de) (seguridad | el filtro | el filtro de seguridad | la revision | revision) #h:line_q",
      "(es aqui | aqui es) (la fila | la cola | el filtro | seguridad | la revision)", "(es | esta es) la (fila | cola)",
      "donde (esta | es) la (fila | cola) [para seguridad | del filtro | de seguridad]", "(es aqui | aqui es) el filtro de seguridad",
      "(este | esto) es (el filtro | seguridad)",
    ] },
    // The short replies to a command ("Pase por el arco" → "Listo")
    ack_done: { patterns: [
      "(listo | lista) #h:div_done", "ya (esta | estoy | termine | quedo)", "(ya esta | listo) todo", "ya (estoy | quedo) (listo | lista)",
      "(estoy | ya estoy) (listo | lista)", "listo ya esta [todo]",
      "ya (puse | meti | deje) todo en (la | las) @tray", "todo (esta | va) en (la | las) @tray", "(puse | meti) todo en (la | las) @tray",
      "(mi | la) @comp (esta | ya esta) en (la | una) @tray",
      "asi #h:walk_like_this", "(asi esta bien | esta bien asi | asi esta bien)", "(aqui | aca)",
      "(paso | puedo pasar | ya paso | ya puedo pasar | entro | ya entro) [ahora | ya]", "(paso | puedo pasar | vuelvo a pasar) otra vez",
      "(los | las) (brazos | manos) arriba", "ahi voy", "(lo intento | lo hago) otra vez", "(ok | bueno | va | sale | esta bien | claro) otra vez",
      "ya me (los | las | lo | la) quite", "(ya) me quite los @shoes", "ya (saque | puse) (la | mi | el) @comp", "ya (saque | puse) todo",
      "(levanto | subo) (los brazos | las manos)", "ahora",
    ] },
    // "No estoy listo todavía": he waits
    not_ready: { patterns: [
      "no estoy (listo | lista) [todavia | aun]", "(todavia | aun) no estoy (listo | lista)", "(todavia | aun) no (termino | acabo)",
      "(espere | un momento | un segundo) (todavia | aun) no", "no he terminado [todavia]", "no (termino | acabo) todavia",
      "[un momento | un segundo | espere] (lo | la | los) estoy buscando", "(un momento | un segundo | espere) (dejeme | deje) (buscarlo | buscarla | buscar)",
      "ya (casi | merito) [termino | acabo | estoy]",
    ] },
    // "¿Qué tengo que sacar?": he lists it again
    ask_what_out: { patterns: [
      "que (tengo que | hay que | debo | necesito) (sacar | poner en la @tray)", "que (saco | pongo en la @tray)", "que (va | tiene que ir | cosas van) en (la | las) @tray",
    ] },
    where_stand: { patterns: [
      "donde (me paro | me pongo | pongo los pies | me coloco | piso)", "que (hago | tengo que hacer) [ahora]", "(y | ahora) que [hago]",
      "(como | que) (hago | le hago)", "(es | esta bien) aqui", "por donde (paso | voy)", "por (aqui | aca)", "(pongo | dejo) los pies aqui", "(aqui | aca) (me paro | me pongo)",
    ] },
    ask_shoes: { patterns: [
      "@tq quitarme los @shoes #h:div_shoes", "(me quito | me tengo que quitar | me debo quitar) los @shoes", "(y | que hay de) (mis | los) @shoes",
      "(puedo | me puedo) (dejar | dejarme | quedar con) los @shoes [puestos]", "puedo dejarme los @shoes [puestos]", "(los @shoes | @shoes) tambien",
      "(los | mis) @shoes (se quedan | los dejo) [puestos]", "no @tq quitarme los @shoes [verdad]", "no me quito los @shoes [verdad]",
      "(me los quito | me las quito)", "(tengo que | debo | hay que) (quitarmelos | quitarmelas)", "(me los | me las) (tengo que | debo) quitar",
    ] },
    ask_laptop: { patterns: [
      "@tq sacar (mi | la | el) @comp #h:div_laptop", "saco (mi | la | el) @comp", "(y | que hay de) (mi | la | el) @comp",
      "(puedo | se puede) dejar (mi | la | el) @comp en (la | mi) @bag #leave", "(la | el | mi) @comp (tambien | igual)", "tambien (la | el | mi) @comp",
      "(mi | la | el) @comp va (aparte | sola | solo | en otra @tray | afuera)", "pongo (mi | la | el) @comp en (otra | una | la) @tray [aparte]",
      "no @tq sacar (mi | la | el) @comp [verdad]", "(mi | la | el) @comp (sale | se saca)",
    ] },
    no_laptop: { patterns: [
      "no (tengo | traigo) (laptop | computadora | compu) #h:div_no_laptop", "no (tengo | traigo) (ninguna | una) (laptop | computadora | tablet)",
      "no (tengo | traigo) @comp [conmigo]", "no (tengo | traigo) (aparatos | nada electronico | electronicos)", "sin (laptop | computadora)",
      "[no] (la laptop | la computadora | laptop | computadora) no (la traigo | la tengo | traigo | tengo)",
    ] },
    ask_liquids: { patterns: [
      "(y | que hay de) (mis | los) liquidos", "donde (pongo | meto) (mis | los) liquidos",
      "(los | mis) liquidos (van | tienen que ir | deben ir | tienen que estar | deben estar) en una bolsa [transparente] #h:div_liquids",
      "@tq sacar (mis | los) liquidos", "saco (mis | los) liquidos", "(@tq sacar | saco) (mi | el | la | los | las | mis) @liq", "cuanto liquido (puedo | se puede) (llevar | pasar)",
      "(el | la | mi | este | esta) @liq (es | cuenta como) liquido #count", "(los | las | mis) (cremas | geles) (son | cuentan como) liquidos #count",
      "(y | que hay de) (mi | el | la) @liq #item", "(puedo | se puede) (llevar | pasar) (mi | el | la | un | una) @liq #item",
      "no @tq sacar (mis | los) liquidos [verdad]", "(puedo | se puede) dejar (mis | los) liquidos en (la | mi) @bag #leave", "(mis | los) liquidos (se quedan | los dejo) en (la | mi) @bag #leave",
    ] },
    no_liquids: { patterns: [
      "no (tengo | traigo) liquidos #h:div_no_liquids", "no (tengo | traigo) (ningun liquido | nada liquido | nada de liquidos)", "sin liquidos",
      "(mis | los) liquidos ya (estan | van) en (una | la) bolsa [transparente]", "(mis | los) liquidos (estan | van) en (una | la) bolsa transparente",
      "ya (los | las) tengo en (una | la) bolsa [transparente]", "(mis | los) liquidos (estan | van) en (la | mi) maleta (documentada | grande)",
    ] },
    no_plastic_bag: { patterns: [
      "no (tengo | traigo) (bolsa | bolsita | bolsa transparente | bolsa de plastico | bolsa ziploc | ziploc)", "donde (consigo | hay) una (bolsa | bolsita) [transparente]", "hay (bolsas | bolsitas) [transparentes | de plastico]",
      "(tiene | me da | me regala | me puede dar) una (bolsa | bolsita) [transparente]", "(tienes | me das) una (bolsa | bolsita) #tip:tu_staff",
    ] },
    ask_phone: { patterns: [
      "donde (pongo | dejo) (mi | el | la | mis | las) (celular | telefono | cartera | llaves | monedas) #h:div_phone",
      "(y | que hay de) (mi | el | la | mis | las) (celular | telefono | cartera | llaves | monedas)",
      "saco (mi | el | la | mis | las | los) (celular | telefono | cartera | llaves | monedas)", "(mi | el | la | mis | las | los) (celular | telefono | cartera | llaves | monedas) (va | van) en (la | una) @tray",
      "@tq (sacar todo de | vaciar) (mis | los | las) @pockets #empty", "(vacio | saco todo de) (mis | los | las) @pockets #empty",
    ] },
    ask_jacket: { patterns: [
      "@tq quitarme (la | mi | el) @jacket", "(me quito | me tengo que quitar) (la | mi | el) @jacket", "(y | que hay de) (mi | la | el) @jacket",
      "(la | mi | el) @jacket tambien", "puedo (dejarme | quedarme con) (la | mi | el) @jacket", "donde (dejo | pongo) (mi | la | el) @jacket",
    ] },
    ask_belt: { patterns: ["@tq quitarme (el | mi) cinturon", "me quito (el | mi) cinturon", "(y | que hay de) (mi | el) cinturon", "(el | mi) cinturon tambien", "puedo dejarme (el | mi) cinturon"] },
    ask_watch: { patterns: ["(y | que hay de) (mi | el) reloj", "@tq quitarme (el | mi) reloj", "me quito (el | mi) reloj", "puedo dejarme (el | mi) reloj", "(el | mi) reloj tambien"] },
    ask_glasses: { patterns: ["me quito (los | mis) (lentes | anteojos) #h:cam_glasses", "@tq quitarme (los | mis) (lentes | anteojos)", "(y | que hay de) (mis | los) (lentes | anteojos)", "sin (lentes | anteojos)"] },
    ask_bins: { patterns: [
      "donde (estan | hay) (las | unas) @tray #h:div_bins", "(me da | me pasa | puedo tomar | tomo | agarro) una @tray", "(me das | me pasas) una @tray #tip:tu_staff",
      "donde (pongo | dejo) (mis cosas | mi maleta | mi mochila | todo | las cosas)", "donde (pongo | dejo) (mi | la | el) @comp",
      "(la | mi) @bag [tambien] va en (la | una) @tray #bag", "(pongo | meto) (la | mi) @bag en (la | una) @tray #bag", "(la | mi) @bag tambien #bag",
    ] },
    ask_food: { patterns: [
      "(puedo | se puede) (pasar | llevar) (comida | botanas | un sandwich | una torta | fruta | galletas | un sandwich)", "(la | mi) comida (esta bien | se puede | puede pasar)",
      "(y | que hay de) (mi | la) (comida | torta | fruta | botana | sandwich)",
    ] },
    ask_water: { patterns: [
      "(puedo | se puede) (pasar | llevar) [con] (mi | una) (botella de agua | botella | botellita | botellita de agua)", "(puedo | se puede) (pasar | llevar) agua",
      "(y | que hay de) (mi | el | la) (agua | botella | botellita)", "(solo | nomas | nada mas) (traigo | tengo) una (botellita | botella) [de agua]",
      "no (puedo | se puede) (pasar | llevar) agua", "(esta bien | se puede) (mi | una) botella de agua",
    ] },
    pockets_item: { patterns: [
      "(solo | nomas | nada mas) (mis | las | los | mi | el | la) {pocket} #h:pk_keys", "(ah | oh | ay) (mi | mis | el | la | las | los) {pocket} #h:pk_phone",
      "(tengo | traigo) (mi | mis | unas | unos | un | una | el | la | las | los) {pocket} [en (la bolsa | el bolsillo | las bolsas | los bolsillos)]",
      "creo que (es | son) (mi | mis | el | la | las | los) {pocket} #h:pk_belt", "si (mi | mis | un | una | unas | unos | el | la) {pocket} #h:pk_yes_my",
      "{pocket}", "(es | son) (mi | mis | el | la | las | los) {pocket}", "se me (olvido | olvidaron) (mi | mis | el | la | las | los) {pocket}",
      "(olvide | olvide sacar) (mi | mis | el | la | las | los) {pocket}", "se me olvido sacar (mi | mis | el | la | las | los) {pocket}", "(un | una | unas | unos) {pocket}", "(tal vez | a lo mejor | quiza | quizas) (mi | mis | el | la | las | los) {pocket}",
      "(mi | mis) {pocket} (esta | estan) en (la bolsa | el bolsillo | las bolsas | los bolsillos)", "(ah | ay) si (mi | mis | el | la) {pocket}",
      "traigo (puesto | puesta) (mi | el | la) {pocket}",
    ] },
    pockets_nothing: { patterns: [
      "no nada #h:pk_nothing", "nada", "no (traigo | tengo | hay) nada [en (los | las | mis) @pockets]", "no no (traigo | tengo) [nada | ninguno]", "no no traigo #h:pk_no",
      "(mis | los | las) @pockets (estan | ya estan) (vacios | vacias)", "nada en (los | las | mis) @pockets", "no hay nada", "[nada] (estan | ya estan) (vacios | vacias)",
      "no (traigo | tengo | llevo) (cinturon | reloj) [ni (reloj | cinturon)]", "ni (cinturon | reloj) ni (reloj | cinturon)", "no {pocket} ni {pocket}",
      "no (traigo | tengo) [mis | las | los | mi | el | la] {pocket} [ni {pocket}]", "(ninguno | ninguna) [de los dos]", "nada de eso",
    ] },
    forgot: { patterns: [
      "se me olvido #h:bt_forgot", "se me olvido (que la traia | sacarla | la botella | el agua | tirarla)", "(olvide | me olvide de) (sacarla | la botella | el agua)",
      "[si] es (solo | nomas | nada mas) agua", "si es agua", "no sabia [que no se podia]", "no me acorde", "(que pena | una disculpa) [se me olvido]", "fue mi culpa",
    ] },
    ask_what: { patterns: [
      "(cual | que) es el problema", "(hay | pasa) algo", "hay algun problema", "que (encontro | vio | paso | hay)", "por que", "que (tiene | pasa) (mi maleta | con mi maleta)",
    ] },
    bottle_drink: { patterns: [
      "me la tomo [aqui | ahorita | ya | ahora] #h:bt_drink", "(me la voy a tomar | la voy a tomar | me la puedo tomar) [aqui | ahorita]", "(puedo | podria) tomarmela [aqui | ahorita]",
      "me la (tomo | voy a tomar) (rapido | rapidito)", "(dejeme | dejame) tomarmela", "(me la bebo | la bebo | me la voy a beber | puedo bebermela) [aqui | ahora]",
      "(voy a | quiero | prefiero) tomarmela", "(me la tomo | la tomo) de una vez", "[no] mejor me la (tomo | voy a tomar)",
      "no la (tire | tiren | tires | tiro | tiramos) [mejor] me la (tomo | voy a tomar | bebo)", "no la (vacio | voy a vaciar) [mejor] me la (tomo | voy a tomar | bebo)",
    ] },
    bottle_throw: { patterns: [
      "(la puede | la pueden | puede | pueden) (tirar | tirarla) [no hay problema] #h:bt_throw", "tirela", "(quedesela | quedese con ella)", "no la (necesito | quiero)",
      "(esta bien | bueno) tirela", "tirela (no hay problema | esta bien)", "(a la basura | tirela a la basura)", "(tirala | quedatela) #tip:tu_staff", "mejor tirela", "(no hay problema | esta bien) (tirela | quedesela)",
      "no me la quiero quedar", "no quiero quedarme con (ella | la botella)", "no me la (tomo | quiero tomar | voy a tomar) [mejor] (tirela | la puede tirar | la tiro)", "no la (vacio | voy a vaciar) [mejor] (tirela | la puede tirar | la tiro)",
      "[mejor] la tiro [yo]", "prefiero tirarla", "no tirela", "mejor (tirela | tirarla)",
    ] },
    bottle_empty: { patterns: [
      "(puedo | podria) vaciarla #h:bt_empty", "la vacio [aqui | ahi]", "(dejeme | dejame) vaciarla", "(voy a | mejor) vaciarla", "[no] mejor la vacio",
      "no la (tire | tiren | tires | tiro | tiramos) [mejor] la (vacio | voy a vaciar)", "no me la (tomo | voy a tomar) [mejor] la (vacio | voy a vaciar)",
      "(puedo | podria) tirar el agua [y quedarme con la botella]", "tiro el agua [y me quedo con la botella]", "la vacio y me quedo con (ella | la botella)",
    ] },
    bottle_keep: { patterns: [
      "(me puedo | puedo) quedar con (la | mi) botella #h:bt_keep", "puedo quedarme con (la | mi) botella", "(quiero | me gustaria) quedarme con (la | mi) botella",
      "me la (puedo | quiero) quedar", "me quiero quedar con (la | mi) botella",
    ] },
    // "No la tire", "No quiero tomármela": a refusal, never the option itself
    bottle_neg: { patterns: [
      "no (la tire | la tiren | la tires | quiero tirarla | la quiero tirar)", "no (quiero tomarmela | me la quiero tomar | me la tomo | quiero beberla)",
      "no (quiero vaciarla | la quiero vaciar | la vacio)", "no (puedo | quiero) (tomarla | tomarmela)",
    ] },
    bag_back: { patterns: [
      "(me da | me puede dar | me regresa | me devuelve | me pasa) mi (maleta | mochila | bolsa | cosas) #h:bag_back", "(me das | me regresas) mi (maleta | mochila) #tip:tu_staff",
      "(ya | ahora) (puedo | me puedo) (llevar | llevarme | tomar | agarrar) (mi | mis) (maleta | mochila | cosas)", "(me puedo llevar | puedo llevarme) (mi | mis) (maleta | mochila | cosas)",
      "(ya) (me puedo ir | puedo irme) #h:all_set", "(ya) (es todo | eso es todo)", "donde (esta | estan) (mi | mis) (maleta | mochila | cosas)",
      "(esta todo bien | todo bien)", "(entonces) ya me voy", "[ya] (me la puedo llevar | me la llevo | me la da | me la puede dar | me la regresa | me la devuelve)",
    ] },
    shoes_on: { patterns: [
      "donde (me pongo | puedo ponerme | me puedo poner) los @shoes #h:shoes_bench",
      "(hay | donde hay) (un lugar | una banca | un banco | una silla) para sentarme", "donde me puedo sentar",
    ] },
    ask_gate: { patterns: [
      "donde (esta | queda) la (sala | puerta) [numero] {number} #h:gate_dir", "como llego a (la sala | la puerta) [numero] {number}",
      "como llego a (mi sala | las salas | mi puerta | las puertas)", "(por donde | hacia donde) (esta | estan | queda | quedan) (la sala | las salas | las puertas)", "(por donde | hacia donde) (esta | queda) la (sala | puerta) [numero] {number}",
      "donde (estan | quedan) las (salas | puertas)", "donde (esta | queda) (la | mi) (sala | puerta) (de embarque | de abordar)",
    ] },
    ask_restroom: { patterns: [
      "donde (esta | estan | hay) (el bano | los banos | un bano | el sanitario | los sanitarios)", "hay (bano | banos) [adelante | despues del filtro | por aqui]",
      "donde (esta | estan) (el aseo | los aseos | el servicio | los servicios)",
    ] },
  },

  lines: {
    greet_docs: [
      t("¡Siguiente! | Pase de abordar | e | identificación, | por favor.", "Next! | Boarding pass | and | ID, | please.", "Next! Boarding pass and ID, please.",
        { flags: { 1: "Mexican: pase de abordar = boarding pass (tarjeta de embarque elsewhere).", 2: "e: y (and) becomes e before an i sound." },
          neutral: t("¡Siguiente! | Tarjeta de embarque | e | identificación, | por favor.", "Next! | Boarding pass | and | ID, | please.", "Next! Boarding pass and ID, please.", { flags: { 2: "e: y (and) becomes e before an i sound." } }) }),
      t("Buenos días. | Sus | documentos, | por favor.", "Good morning. | Your | documents, | please.", "Good morning. Your documents, please."),
      t("Buenas tardes. | ¿Me | permite | su | identificación | y | su | pase de abordar?", "Good afternoon. | (To) me | you-allow | your | ID | and | your | boarding pass?", "Good afternoon. May I see your ID and your boarding pass?",
        { flags: { 7: "Mexican: pase de abordar = boarding pass (tarjeta de embarque elsewhere)." },
          neutral: t("Buenas tardes. | ¿Me | permite | su | identificación | y | su | tarjeta de embarque?", "Good afternoon. | (To) me | you-allow | your | ID | and | your | boarding pass?", "Good afternoon. May I see your ID and your boarding pass?") }),
    ],
    ask_docs: [
      t("Sus | documentos, | por favor.", "Your | documents, | please.", "Your documents, please."),
      t("¿Me | muestra | sus | documentos?", "(To) me | you-show | your | documents?", "Can I see your documents?"),
    ],
    docs_need_bp: [
      t("¿Y | su | pase de abordar?", "And | your | boarding pass?", "And your boarding pass?",
        { flags: { 2: "Mexican: pase de abordar = boarding pass (tarjeta de embarque elsewhere)." }, neutral: t("¿Y | su | tarjeta de embarque?", "And | your | boarding pass?", "And your boarding pass?") }),
    ],
    docs_need_id: [t("¿Y | su | identificación?", "And | your | ID?", "And your ID?")],
    phone_scan: [t("Claro, | póngalo | aquí, | en | el | lector.", "Sure, | put it | here, | on | the | scanner.", "Sure, just scan it here.")],
    docs_yes: [t("Sí, | por favor.", "Yes, | please.", "Yes, please.")],
    docs_okq: [t("Sí, | está bien.", "Yes, | it's fine.", "Yes, that's fine.")],
    docs_which: [t("Su | pasaporte, | por favor.", "Your | passport, | please.", "Your passport, please.")],
    docs_done_already: [t("Ya | los | revisé, | gracias.", "Already | them | I-checked, | thanks.", "I've already checked them, thanks.", { flags: { 1: "los: them, the pronoun for los documentos (not the article)." } })],
    line_yes: [t("Es | aquí.", "It's | here.", "Right here.")],
    camera: [
      t("Mire | hacia | acá | un | momento, | por favor.", "Look | toward | here | a | moment, | please.", "Look this way for a second, please."),
      t("Un | momento. | Mire | hacia | acá, | por favor.", "One | moment. | Look | toward | here, | please.", "One moment. Look this way, please."),
    ],
    glasses_moment: [t("Sí, | un | momentito, | por favor.", "Yes, | a | quick moment, | please.", "Yes, just for a second, please.", { flags: { 2: "momentito: the diminutive of momento, very common in Mexico." } })],
    glasses_keep: [t("Puede | dejarse | los | lentes | puestos.", "You-can | keep (on yourself) | the | glasses | on.", "You can keep your glasses on.")],
    docs_ok: [
      t("Gracias.", "Thanks.", "Thank you."),
      t("Muy | bien, | gracias.", "Very | good, | thanks.", "All right, thanks."),
      t("Gracias, | todo | en | orden.", "Thanks, | all | in | order.", "Thanks, everything's in order."),
    ],
    divest: [
      t("Saque | la | laptop | y | los | líquidos, | por favor.", "Take out | the | laptop | and | the | liquids, | please.", "Laptops and liquids out, please."),
      t("Laptop | y | líquidos | afuera, | por favor.", "Laptop | and | liquids | out, | please.", "Laptop and liquids out, please."),
    ],
    divest2: [
      t("El | cinturón | y | la | chamarra | van | en | la | charola.", "The | belt | and | the | jacket | go | in | the | tray.", "Belts and jackets go in the tray.",
        { flags: { 4: "Mexican: chamarra = jacket (chaqueta elsewhere).", 8: "Mexican: charola = tray (bandeja elsewhere)." },
          neutral: t("El | cinturón | y | la | chaqueta | van | en | la | bandeja.", "The | belt | and | the | jacket | go | in | the | tray.", "Belts and jackets go in the tray.") }),
      t("Quítese | el | cinturón | y | vacíe | sus | bolsillos, | por favor.", "Take off | the | belt | and | empty | your | pockets, | please.", "Please take off your belt and empty your pockets."),
    ],
    shoes_stay: [t("Puede | dejarse | los | zapatos | puestos.", "You-can | keep (on yourself) | the | shoes | on.", "You can keep your shoes on.")],
    divest_ask: [
      t("Avíseme | cuando | esté | {m:listo|f:lista}.", "Let me know | when | you're | ready.", "Let me know when you're ready."),
      t("Ponga | todo | en | la | charola, | por favor.", "Put | everything | in | the | tray, | please.", "Put everything in the tray, please.",
        { flags: { 4: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("Ponga | todo | en | la | bandeja, | por favor.", "Put | everything | in | the | tray, | please.", "Put everything in the tray, please.") }),
    ],
    shoes_on_ok: [
      t("Aquí | no hace falta | quitarse | los | zapatos.", "Here | there's no need | to take off | the | shoes.", "You don't need to take off your shoes here."),
      t("Los | zapatos | se quedan | puestos.", "The | shoes | stay | on.", "Shoes stay on."),
    ],
    laptop_out: [
      t("La | laptop | va | afuera, | aparte.", "The | laptop | goes | out, | separately.", "Your laptop comes out, on its own."),
      t("Sí, | sáquela | y | póngala | aparte.", "Yes, | take it out | and | put it | separately.", "Yes, take it out and put it on its own."),
    ],
    what_out: [t("La | laptop, | los | líquidos | y | lo | que | traiga | en | los | bolsillos.", "The | laptop, | the | liquids | and | what | — | you-have | in | the | pockets.", "Your laptop, your liquids, and whatever's in your pockets.", { flags: { 6: "lo que: what (whatever); que needs no word of its own here." } })],
    tablet_no_stay: [t("No, | la | tableta | también | tiene | que | salir.", "No, | the | tablet | also | has | to | come out.", "Sorry, tablets have to come out too.")],
    tablet_out: [t("Sí, | las | tabletas | también | van | afuera.", "Yes, | the | tablets | also | go | out.", "Yes, tablets come out too.")],
    laptop_no_stay: [t("No, | aquí | la | laptop | tiene | que | salir.", "No, | here | the | laptop | has | to | come out.", "Sorry, not here. Laptops have to come out.")],
    no_problem: [
      t("Muy | bien, | no hay problema.", "Very | good, | no problem.", "Okay, no problem."),
      t("Está bien.", "That's fine.", "That's fine."),
    ],
    no_problem_q: [t("No, | ningún | problema.", "No, | no | problem.", "No, no problem at all.")],
    liquids_info: [t("Los | líquidos | van | en | una | bolsa | transparente.", "The | liquids | go | in | a | bag | clear.", "Liquids go in a clear bag.")],
    liquids_no_stay: [t("No, | los | líquidos | tienen | que | salir, | en | una | bolsa | transparente.", "No, | the | liquids | have | to | come out, | in | a | bag | clear.", "No, liquids have to come out, in a clear bag.")],
    liquids_info2: [t("En | envases | de | 100 | mililitros | o | menos.", "In | containers | of | 100 | milliliters | or | less.", "In containers of 100 milliliters or less.", { say: "En envases de cien mililitros o menos." })],
    gel_too: [t("Sí, | cremas | y | geles | también | cuentan.", "Yes, | creams | and | gels | also | count.", "Yes, creams and gels count too.")],
    item_liquid: [t("Sí, | si | es | de | 100 | mililitros | o | menos, | en | la | bolsa.", "Yes, | if | it's | of | 100 | milliliters | or | less, | in | the | bag.", "Yes, if it's 100 milliliters or less, in the bag.",
      { say: "Sí, si es de cien mililitros o menos, en la bolsa." })],
    plastic_bags: [t("Aquí | hay | bolsitas. | Tome | una.", "Here | there are | little bags. | Take | one.", "There are bags right here. Take one.")],
    phone_where: [
      t("En | la | charola, | con | sus | llaves | y | su | cartera.", "In | the | tray, | with | your | keys | and | your | wallet.", "In the tray, with your keys and wallet.",
        { flags: { 2: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("En | la | bandeja, | con | sus | llaves | y | su | cartera.", "In | the | tray, | with | your | keys | and | your | wallet.", "In the tray, with your keys and wallet.") }),
    ],
    pockets_yes: [t("Sí, | por favor, | todo | afuera.", "Yes, | please, | everything | out.", "Yes, please. Everything out.")],
    jacket_yes: [t("Quítesela | y | póngala | con | lo | demás, | por favor.", "Take it off | and | put it | with | the | rest, | please.", "Please take it off and put it with the rest.")],
    jacket_yes_m: [t("Quíteselo | y | póngalo | con | lo | demás, | por favor.", "Take it off | and | put it | with | the | rest, | please.", "Please take it off and put it with the rest.")],
    watch_yes: [t("El | reloj | también, | con | lo | demás.", "The | watch | too, | with | the | rest.", "Your watch too, with the rest.")],
    bins_here: [
      t("Aquí | están | las | charolas. | Tome | las | que | necesite.", "Here | are | the | trays. | Take | the ones | that | you-need.", "The trays are right here. Take as many as you need.",
        { flags: { 3: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("Aquí | están | las | bandejas. | Tome | las | que | necesite.", "Here | are | the | trays. | Take | the ones | that | you-need.", "The trays are right here. Take as many as you need.") }),
    ],
    bag_no_tray: [t("La | maleta | va | así, | sin | charola.", "The | bag | goes | like this, | without | a tray.", "Your bag goes on as it is, no tray.",
      { flags: { 5: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("La | maleta | va | así, | sin | bandeja.", "The | bag | goes | like this, | without | a tray.", "Your bag goes on as it is, no tray.") })],
    food_ok: [t("La | comida | sólida | sí | puede | pasar.", "The | food | solid | yes | can | go through.", "Solid food is fine.", { flags: { 3: "sí before a verb stresses it: it can." } })],
    water_rule: [t("Agua | no; | la | botella | sí, | vacía.", "Water | no; | the | bottle | yes, | empty.", "No water, but an empty bottle is fine.")],
    gate_dir: [
      t("Las | salas | están | por | allá, | pasando | las | tiendas.", "The | gates | are | over | there, | past | the | shops.", "The gates are that way, past the shops.",
        { flags: { 1: "Mexican: la sala (de abordar) = the gate (la puerta elsewhere)." }, neutral: t("Las | puertas | están | por | allá, | pasando | las | tiendas.", "The | gates | are | over | there, | past | the | shops.", "The gates are that way, past the shops.") }),
    ],
    restroom: [t("Hay | baños | aquí | adelante, | a la derecha.", "There are | restrooms | here | ahead, | on the right.", "There are restrooms just ahead, on the right.")],
    scanner: [
      t("Pase | al | escáner, | por favor.", "Step | into the | scanner, | please.", "Step into the scanner, please."),
      t("Ahora | pase | aquí, | por favor.", "Now | step | here, | please.", "Now step in here, please."),
    ],
    scanner2: [
      t("Párese | en | las | huellas | y | levante | los | brazos.", "Stand | on | the | footprints | and | raise | the | arms.", "Stand on the footprints and raise your arms."),
      t("Los | pies | en | las | huellas | y | las | manos | arriba.", "The | feet | on | the | footprints | and | the | hands | up.", "Feet on the footprints, hands up."),
    ],
    walkthrough: [
      t("Pase | por | el | arco, | por favor.", "Go | through | the | arch, | please.", "Walk through the metal detector, please.", { flags: { 3: "el arco: the walk-through metal detector (it's an arch)." } }),
      t("Adelante, | pase | por | aquí.", "Go ahead, | come | through | here.", "Go ahead, come through here."),
    ],
    walk_ask: [
      t("Pase, | por favor.", "Go through, | please.", "Go ahead, please."),
      t("Cuando | quiera, | pase.", "Whenever | you-want, | go through.", "Whenever you're ready, go ahead."),
    ],
    scan_done: [t("Muy | bien. | No se mueva... | Listo, | puede | salir.", "Very | good. | Don't move... | Done, | you-can | step out.", "Good. Hold still... Okay, you can step out.")],
    walk_clear: [
      t("Todo | bien. | Gracias.", "All | good. | Thanks.", "All clear. Thank you."),
      t("Listo, | todo | bien.", "Done, | all | good.", "Okay, you're good."),
    ],
    alarm_scanner: [t("Mmm, | el | escáner | marcó | algo.", "Hmm, | the | scanner | flagged | something.", "Hmm, the scanner picked something up.")],
    alarm_beep: [t("Uy, | sonó.", "Oops, | it beeped.", "Oops, it beeped.")],
    ask_pockets: [
      t("¿Trae | algo | en | los | bolsillos?", "Are you carrying | anything | in | the | pockets?", "Do you have anything in your pockets?"),
      t("¿Tiene | algo | en | los | bolsillos?", "Do you have | anything | in | the | pockets?", "Anything in your pockets?"),
    ],
    what_is_it: [t("¿Qué | es?", "What | is it?", "What is it?")],
    check_pockets: [t("¿Puede | revisar | sus | bolsillos, | por favor?", "Can you | check | your | pockets, | please?", "Could you check your pockets, please?")],
    item_tray: [t("Deje | eso | en | la | charola, | por favor.", "Leave | that | in | the | tray, | please.", "Put that in the tray, please.",
      { flags: { 4: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("Deje | eso | en | la | bandeja, | por favor.", "Leave | that | in | the | tray, | please.", "Put that in the tray, please.") })],
    put_it_bin: [
      t("Bueno, | deje | eso | en | la | charola | y | pase | otra vez.", "Okay, | leave | that | in | the | tray | and | go through | again.", "Okay, put that in the tray and walk through again.",
        { flags: { 5: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("Bueno, | deje | eso | en | la | bandeja | y | pase | otra vez.", "Okay, | leave | that | in | the | tray | and | go through | again.", "Okay, put that in the tray and walk through again.") }),
      t("No hay problema. | Deje | eso | aquí | y | pase | otra vez.", "No problem. | Leave | that | here | and | go through | again.", "No problem. Leave that here and walk through again."),
    ],
    ask_belt_watch: [t("¿Trae | cinturón | o | reloj?", "Are you wearing | a belt | or | a watch?", "Are you wearing a belt or a watch?", { flags: { 0: "traer: to carry, and in Mexico also to wear." } })],
    put_it_bin_too: [t("Eso | también, | por favor. | Y | pase | otra vez.", "That | too, | please. | And | go through | again.", "That too, please. Then walk through again.")],
    shoes_yes: [t("Sí, | los | zapatos | también, | por favor.", "Yes, | the | shoes | too, | please.", "Yes, your shoes too, please.")],
    shoes_alarm: [t("Pueden | ser | los | zapatos. | Quíteselos, | por favor.", "They could | be | the | shoes. | Take them off, | please.", "It might be your shoes. Please take them off.")],
    shoes_must: [t("Lo siento, | es | necesario | para | pasar.", "I'm sorry, | it's | necessary | to | go through.", "Sorry, I need you to do it to go through.")],
    again_ask: [t("Muy | bien, | pase | otra vez, | por favor.", "Very | good, | go through | again, | please.", "Okay, walk through again, please.")],
    ask_your_bag: [
      t("¿Esta | maleta | es | suya?", "This | bag | is | yours?", "Is this your bag?"),
      t("Disculpe, | ¿es | suya | esta | maleta?", "Excuse me, | is it | yours | this | bag?", "Excuse me, is this your bag?"),
    ],
    bag_which: [t("Perdón, | ¿es | suya | o | no?", "Sorry, | is it | yours | or | not?", "Sorry, is it yours or not?")],
    bag_look: [t("Mírela | bien, | por favor. | ¿Es | suya?", "Look at it | well, | please. | Is it | yours?", "Take a good look, please. Is it yours?")],
    bag_just_check: [t("Solo | necesito | revisarla | un | momento.", "Only | I-need | to check it | a | moment.", "I just need to check it quickly.")],
    need_check: [
      t("Necesito | revisarla.", "I need | to check it.", "I need to check it."),
      t("Permítame | revisarla | un | momento.", "Allow me | to check it | a | moment.", "Let me take a quick look inside."),
    ],
    found_bottle: [
      t("Trae | una | botella | de | agua.", "You're carrying | a | bottle | of | water.", "You have a water bottle in here."),
      t("Aquí | hay | una | botella | de | agua.", "Here | there's | a | bottle | of | water.", "There's a water bottle in here."),
    ],
    no_worries: [
      t("No se preocupe.", "Don't worry.", "No worries."),
      t("Pasa | mucho.", "It happens | a lot.", "It happens all the time."),
    ],
    bottle_rule: [t("Los | líquidos | de | más de | 100 | mililitros | no pueden | pasar.", "The | liquids | of | more than | 100 | milliliters | can't | go through.", "Liquids over 100 milliliters can't go through.",
      { say: "Los líquidos de más de cien mililitros no pueden pasar." })],
    bottle_options: [
      t("Puede | tomársela | aquí | o | la | tiramos.", "You can | drink it | here | or | it | we-throw away.", "You can drink it here, or we'll throw it out.",
        { flags: { 1: "tomar: Latin America's everyday verb for drink (beber is more formal).", 4: "la: it, the pronoun for la botella (not the article)." } }),
      t("Puede | tomársela, | vaciarla | o | dejármela.", "You can | drink it, | empty it | or | leave it with me.", "You can drink it, empty it, or leave it with me."),
    ],
    bottle_then: [t("Bueno, | entonces...", "Okay, | then...", "Okay, then...")],
    drink_ok: [t("Claro, | adelante.", "Sure, | go ahead.", "Sure, go ahead.")],
    toss_ok: [
      t("Bueno, | yo | la | tiro.", "Okay, | I | it | throw away.", "Okay, I'll toss it.", { flags: { 2: "la: it, the pronoun for la botella (not the article)." } }),
      t("No hay problema, | aquí | se queda.", "No problem, | here | it stays.", "No problem, I'll take care of it."),
    ],
    empty_ok: [t("Claro. | Vacíela | ahí | y | la | botella | es | suya.", "Sure. | Empty it | there | and | the | bottle | is | yours.", "Sure. Empty it over there and you can keep the bottle.")],
    not_mine_ok: [t("Ah, | perdón, | es | de | otra | persona.", "Oh, | sorry, | it's | of | another | person.", "Oh, sorry, it's someone else's.")],
    rest_fine: [t("Todo | lo | demás | está | bien.", "All | the | rest | is | fine.", "Everything else looks fine.")],
    bag_back: [
      t("Claro, | aquí tiene | su | maleta.", "Sure, | here's | your | bag.", "Sure, here's your bag."),
      t("Listo, | puede | llevársela.", "Done, | you-can | take it.", "All done, you can take it."),
    ],
    all_set: [
      t("Ya | puede | continuar.", "Now | you-can | go on.", "You're all set."),
      t("Es | todo. | Puede | continuar.", "That's | all. | You-can | go on.", "That's it. You're good to go."),
    ],
    bag_later: [t("Su | maleta | sale | del | otro | lado.", "Your | bag | comes out | on the | other | side.", "Your bag comes out on the other side.")],
    bags_end_belt: [t("Sus | cosas | salen | del | otro | lado.", "Your | things | come out | on the | other | side.", "Your things come out on the other side.")],
    shoes_bench: [t("Ahí | hay | una | banca | para | ponerse | los | zapatos.", "There | there's | a | bench | to | put on | the | shoes.", "There's a bench over there to put your shoes back on.")],
    shoes_bench_again: [t("Ahí, | en | la | banca.", "There, | on | the | bench.", "Over there, on the bench.")],
    bye: [
      t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"),
      t("¡Que | tenga | buen | vuelo!", "(I hope) | you-have | a good | flight!", "Have a good flight!"),
    ],
    ack: [t("Bien.", "Good.", "Okay."), t("Gracias.", "Thanks.", "Thank you.")],
  },

  hints: {
    docs: { lt: "Hand over your documents", items: [
      { id: "docs_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "docs_both", s: t("Aquí tiene | mi | pasaporte | y | mi | pase de abordar.", "Here's | my | passport | and | my | boarding pass.", "Here's my passport and boarding pass.",
        { neutral: t("Aquí tiene | mi | pasaporte | y | mi | tarjeta de embarque.", "Here's | my | passport | and | my | boarding pass.", "Here's my passport and boarding pass.") }) },
      { id: "docs_phone", s: t("Mi | pase de abordar | está | en | mi | celular.", "My | boarding pass | is | on | my | phone.", "My boarding pass is on my phone.",
        { neutral: t("Mi | tarjeta de embarque | está | en | mi | celular.", "My | boarding pass | is | on | my | phone.", "My boarding pass is on my phone.") }) },
      { id: "docs_q", s: t("¿Necesita | mi | pasaporte?", "Do you need | my | passport?", "Do you need my passport?") },
      { id: "line_q", s: t("¿Esta | es | la | fila | para | seguridad?", "This | is | the | line | for | security?", "Is this the line for security?") },
    ] },
    ok_cmd: { lt: "Say okay", items: [
      { id: "ok_okay", s: t("Está bien.", "Okay.", "Okay.") },
      { id: "ok_sure", s: t("Claro.", "Sure.", "Sure.") },
      { id: "div_done", s: t("Listo.", "Done.", "All done."), note: "Listo: the everyday “done / ready” in Mexico." },
    ] },
    ok_short: { lt: "Say okay", items: [
      { id: "ok_okay", s: t("Está bien.", "Okay.", "Okay.") },
      { id: "ok_sure", s: t("Claro.", "Sure.", "Sure.") },
    ] },
    camera: { lt: "Look at the officer", items: [
      { id: "ok_sure", s: t("Claro.", "Sure.", "Sure.") },
      { id: "cam_glasses", s: t("¿Me | quito | los | lentes?", "(Myself) | I-take off | the | glasses?", "Should I take off my glasses?", { flags: { 0: "quitarse: take off (your own clothes, glasses); me = myself." } }) },
    ] },
    divest: { lt: "Ask about shoes, the laptop or liquids", items: [
      { id: "div_shoes", s: t("¿Tengo | que | quitarme | los | zapatos?", "Do I have | to | take off | the | shoes?", "Do I need to take off my shoes?") },
      { id: "div_laptop", s: t("¿Tengo | que | sacar | la | laptop?", "Do I have | to | take out | the | laptop?", "Should I take out my laptop?") },
      { id: "div_no_laptop", s: t("No traigo | laptop.", "I don't have | a laptop.", "I don't have a laptop.", { flags: { 0: "traer: to bring, to have with you." } }) },
      { id: "div_liquids", s: t("¿Los | líquidos | van | en | una | bolsa?", "The | liquids | go | in | a | bag?", "Do liquids go in a bag?") },
      { id: "div_no_liquids", s: t("No traigo | líquidos.", "I don't have | liquids.", "I don't have any liquids.") },
      { id: "div_phone", s: t("¿Dónde | pongo | mi | celular?", "Where | do I put | my | phone?", "Where do I put my phone?") },
      { id: "div_bins", s: t("¿Dónde | están | las | charolas?", "Where | are | the | trays?", "Where are the trays?",
        { flags: { 3: "Mexican: charola = tray (bandeja elsewhere)." }, neutral: t("¿Dónde | están | las | bandejas?", "Where | are | the | trays?", "Where are the trays?") }) },
    ] },
    walk: { lt: "Walk through the scanner", items: [
      { id: "div_done", s: t("Listo.", "Done.", "Done.") },
      { id: "walk_like_this", s: t("¿Así?", "Like this?", "Like this?") },
      { id: "ok_sure", s: t("Claro.", "Sure.", "Sure.") },
    ] },
    beltwatch: { lt: "Answer about a belt or a watch", items: [
      { id: "pk_yes_my", s: t("Ah, | sí, | mi | cinturón.", "Oh, | yes, | my | belt.", "Oh, yes, my belt.") },
      { id: "pk_no", s: t("No, | no traigo.", "No, | I'm not wearing any.", "No, I'm not.") },
    ] },
    bag_q: { lt: "Say whether it's your bag", items: [
      { id: "bq_mine", s: t("Sí, | es | mía.", "Yes, | it's | mine.", "Yes, it's mine.") },
      { id: "bq_yes", s: t("Sí. | ¿Hay | algún | problema?", "Yes. | Is there | any | problem?", "Yes. Is there a problem?") },
      { id: "bq_not", s: t("No es | mía.", "It's not | mine.", "It's not mine.") },
    ] },
    bottle_sorry: { lt: "Say sorry: you forgot", items: [
      { id: "bt_forgot", s: t("Ay, | perdón, | se me olvidó.", "Oh, | sorry, | I forgot.", "Oh, sorry, I forgot.", { flags: { 2: "se me olvidó: it slipped my mind (literally: it forgot itself on me)." } }) },
    ] },
    pockets: { lt: "Say what's in your pockets", items: [
      { id: "pk_keys", s: t("Solo | mis | llaves.", "Only | my | keys.", "Just my keys.") },
      { id: "pk_phone", s: t("¡Ay, | mi | celular!", "Oh, | my | phone!", "Oh, my phone!") },
      { id: "pk_nothing", s: t("No, | nada.", "No, | nothing.", "No, nothing.") },
      { id: "pk_belt", s: t("Creo | que | es | mi | cinturón.", "I think | that | it's | my | belt.", "I think it's my belt.") },
    ] },
    bottle: { lt: "Say what to do with the bottle", items: [
      { id: "bt_throw", s: t("La | puede | tirar.", "It | you-can | throw away.", "You can throw it away.", { flags: { 0: "La: it, the pronoun for la botella (not the article)." } }) },
      { id: "bt_drink", s: t("Me | la | tomo | aquí.", "(Myself) | it | I-drink | here.", "I'll drink it here.", { flags: { 0: "tomarse: me adds “all of it”, as in drink it up.", 1: "la: it, the pronoun for la botella (not the article)." } }) },
      { id: "bt_empty", s: t("¿Puedo | vaciarla?", "Can I | empty it?", "Can I just empty it?") },
      { id: "bt_keep", s: t("¿Me | puedo | quedar | con | la | botella?", "(Myself) | can I | keep | — | the | bottle?", "Can I keep the bottle?", { flags: { 0: "quedarse con: to keep; me goes with the verb.", 3: "con: quedarse con = keep; English needs no word." } }) },
    ] },
    after: { lt: "Get your things and ask where to go", items: [
      { id: "bag_back", s: t("¿Me | da | mi | maleta?", "(To) me | you-give | my | bag?", "Can I have my bag back?") },
      { id: "all_set", s: t("¿Ya | me | puedo | ir?", "Already | (myself) | can I | go?", "Am I all set?") },
      { id: "gate_dir", s: t("¿Dónde | está | la | sala | 8?", "Where | is | the | gate | 8?", "Where's gate 8?", { say: "¿Dónde está la sala ocho?",
        flags: { 3: "Mexican: la sala (de abordar) = the gate (la puerta elsewhere)." },
        neutral: t("¿Dónde | está | la | puerta | 8?", "Where | is | the | gate | 8?", "Where's gate 8?", { say: "¿Dónde está la puerta ocho?" }) }) },
      { id: "shoes_bench", s: t("¿Dónde | me | pongo | los | zapatos?", "Where | (myself) | I-put on | the | shoes?", "Where can I put my shoes back on?") },
    ] },
  },
  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With an officer, usted is more polite: necesita, me da, tírela (necesitas, me das, tírala are for friends).", better: "¿Necesita mi pasaporte?" },
  },
  merges: {
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board misreads the document's name: boarding pass.", minimal: "The three-word noun only." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding misreads the document's name: boarding pass.", minimal: "The three-word noun only." },
    "no hace falta": { reason: "lexical_expression", split: "no → no + hace → makes + falta → lack misreads the idiom: there's no need.", minimal: "Three words." },
    "se quedan": { reason: "grammatical_fusion", split: "se → themselves + quedan → remain gives a false reflexive; quedarse = stay.", minimal: "Only the pronoun and verb." },
    "se queda": { reason: "grammatical_fusion", split: "se → itself + queda → remains gives a false reflexive; quedarse = stay.", minimal: "Only the pronoun and verb." },
    "más de": { reason: "lexical_expression", split: "más → more + de → of misreads the comparison with a number: more than.", minimal: "Two words." },
    "no se mueva": { reason: "grammatical_fusion", split: "no → no + se → yourself + mueva → move gives a false reflexive object; = don't move.", minimal: "The negated pronominal command only." },
    "no se preocupe": { reason: "grammatical_fusion", split: "no → no + se → yourself + preocupe → worry gives a false reflexive object; = don't worry.", minimal: "The negated pronominal command only." },
    "se me olvidó": { reason: "grammatical_fusion", split: "se → itself + me → me + olvidó → forgot gives a false subject; = I forgot.", minimal: "The pronouns and the verb." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "docs", lt: "Show your boarding pass and ID" },
    { step: "camera", lt: "Look at the officer", optional: true },
    { step: "divest", lt: "Put your things in the tray" },
    { step: "walk", lt: "Walk through the scanner" },
    { step: "bottle", lt: "Say what to do with the bottle", optional: true },
    { step: "collect", lt: "Get your bag back", optional: true },
  ],

  steps: [
    { id: "docs", done: (c) => !!c.s.docsDone,
      ask: (c) => c.say("ask_docs"),
      expects: ["give_docs", "docs_q"],
      suggest: [{ lt: "Hand over your boarding pass and passport", hint: "docs" }],
      yes: (c) => { docsGiven(c, ["both"]); } },
    { id: "camera", when: (c) => !!c.s.camera, done: (c) => !!c.s.cameraDone,
      ask: (c) => c.say("camera"),
      expects: ["ack_done", "ask_glasses"],
      suggest: [{ lt: "Look at the officer", hint: "camera" }],
      yes: (c) => { c.s.cameraDone = true; c.say("docs_ok"); } },
    { id: "divest", done: (c) => !!c.s.divested,
      ask: (c) => {
        if (!c.s.divestAsked) {
          c.s.divestAsked = true;
          c.say("divest");
          c.say("divest2");
          if (c.s.shoesNote) c.say("shoes_stay");
        } else c.say("divest_ask");
      },
      expects: ["ack_done", "not_ready", "ask_what_out", "ask_shoes", "ask_laptop", "no_laptop", "ask_liquids", "no_liquids", "no_plastic_bag", "ask_phone", "ask_jacket", "ask_belt", "ask_watch", "ask_bins", "ask_food", "ask_water"],
      suggest: [{ lt: "Say okay and put your things in the tray", hint: "ok_cmd" }, { lt: "Ask about shoes, the laptop or liquids", hint: "divest" }],
      yes: (c) => { c.s.divested = true; },
      no: (c) => { c.say("g_take_time"); c.hold(); } },
    { id: "walk", done: (c) => !!c.s.walked,
      ask: (c) => {
        if (!c.s.walkAsked) {
          c.s.walkAsked = true;
          if (c.s.scanner) { c.say("scanner"); c.say("scanner2"); } else c.say("walkthrough");
        } else c.say("walk_ask");
      },
      expects: ["ack_done", "not_ready", "where_stand"],
      suggest: [{ lt: "Walk through the scanner", hint: "walk" }],
      yes: (c) => { walkThrough(c); },
      no: (c) => { c.say("g_take_time"); c.hold(); } },
    { id: "bag_q", when: (c) => !!c.s.bagCheck, done: (c) => !!c.s.bagChecked || !!c.s.bagHeld,
      ask: (c) => c.say("ask_your_bag"),
      expects: ["affirm", "deny", "bag_unsure_ctx"],
      suggest: [{ lt: "Say whether it's your bag", hint: "bag_q" }],
      yes: (c) => { startBottle(c); },
      no: (c) => { c.s.bagChecked = true; c.say("not_mine_ok"); } },
    { id: "bottle", when: (c) => !!c.s.bagHeld, done: (c) => !!c.s.bagChecked,
      ask: (c) => {
        if (!c.s.bottleExplained) { c.s.bottleExplained = true; c.say("bottle_rule"); }
        c.say("bottle_options");
      },
      expects: ["bottle_drink", "bottle_throw", "bottle_empty", "bottle_keep", "bottle_neg"],
      suggest: [{ lt: "Say what to do with the bottle", hint: "bottle" }] },
    { id: "collect", when: (c) => !!c.s.bagHeld && !!c.s.bagChecked, done: (c) => !!c.s.collected,
      ask: (c) => c.say("rest_fine"),
      expects: ["bag_back"],
      suggest: [{ lt: "Ask for your bag back", hint: "after" }],
      yes: (c) => { c.s.collected = true; c.say("bag_back"); },
      no: (c) => { c.s.collected = true; c.say("bag_back"); } },
  ],

  init: (c) => {
    c.s.camera = c.chance(0.4);
    c.s.shoesNote = c.chance(0.5);
    c.s.scanner = c.chance(0.5);
    c.s.alarm = c.visits >= 1 ? c.chance(0.55) : c.chance(0.35);
    c.s.bagCheck = c.visits >= 1 ? c.chance(0.6) : c.chance(0.3);
  },

  start: (c) => {
    c.say("greet_docs");
    c.hold(); // the greeting asks for the documents; the "docs" step is the one being answered
  },

  handlers: {
    affirm(c) { const st = stepOf(c); if (st?.yes && !st.done(c)) st.yes(c); else c.say("ack"); },
    deny(c) {
      // "No, es mía" (typed with its comma) contradicts itself; without the comma it is "No es mía"
      if (c.step === "bag_q" && /^\W*no\s*[,.;:]\s*es (mia|mio)\b/.test(fold(c.heard))) { c.say("bag_which"); c.hold(); return; }
      const st = stepOf(c); if (st?.no) st.no(c);
    },
    bag_unsure_ctx(c) { if (c.step === "bag_q") { c.say("bag_look"); c.hold(); return; } c.say("ack"); },
    g_bye(c) { c.say("g_bye"); c.end(); c.hold(); },
    give_docs(c, _slots, seg) {
      if (c.s.docsDone) { c.say("ack"); return; }
      docsGiven(c, seg.tags);
    },
    docs_q(c, _slots, seg) {
      if (c.s.docsDone) { c.say("docs_done_already"); return; }
      // a foreign driver's license isn't the ID for a flight: he asks for the passport (kept vague, rule 14)
      const lic = /\b(licencia|credencial)\b/.test(fold(c.heard));
      c.say(seg.tags.includes("which") || (lic && seg.tags.includes("okq")) ? "docs_which" : seg.tags.includes("okq") ? "docs_okq" : "docs_yes");
      c.hold();
    },
    is_this_line(c) { c.say("line_yes"); },
    ack_done(c) {
      if (c.s.__finished) { c.say("all_set"); return; }
      const st = stepOf(c);
      // "Listo", "¿Puedo pasar?" never hand over the documents or answer "¿Esta maleta es suya?" (the step asks again)
      if (st?.yes && !st.done(c) && c.step !== "bag_q" && c.step !== "docs") st.yes(c);
    },
    not_ready(c) { c.say("g_take_time"); c.hold(); },
    g_ok(c) {
      const st = stepOf(c);
      if (st?.yes && !st.done(c) && c.step !== "bag_q") st.yes(c);
    },
    ask_shoes(c) {
      // during the alarm twist the shoes do come off ("¿Los zapatos también?" → yes)
      if (c.s.shoesAsked && !c.s.shoesOff) { c.say("shoes_yes"); c.hold(); return; }
      c.say("shoes_on_ok"); waitOn(c);
    },
    ask_laptop(c, _slots, seg) {
      const h = fold(c.heard);
      if (seg.tags.includes("leave")) c.say(/\b(tablet|tableta|ipad|kindle)\b/.test(h) ? "tablet_no_stay" : "laptop_no_stay");
      else if (/\b(tablet|tableta|ipad|kindle)\b/.test(h)) c.say("tablet_out");
      else c.say("laptop_out");
      waitOn(c);
    },
    no_laptop(c) { c.say("no_problem"); },
    ask_what_out(c) { c.say("what_out"); waitOn(c); },
    ask_liquids(c, _slots, seg) {
      if (seg.tags.includes("leave")) { c.say("liquids_no_stay"); c.say("liquids_info2"); waitOn(c); return; }
      if (seg.tags.includes("count")) { c.say("gel_too"); c.say("liquids_info2"); waitOn(c); return; }
      if (seg.tags.includes("item")) { c.say("item_liquid"); waitOn(c); return; }
      c.say("liquids_info"); c.say("liquids_info2");
      waitOn(c);
    },
    no_liquids(c) { c.say("no_problem"); },
    no_plastic_bag(c) { c.say("plastic_bags"); waitOn(c); },
    ask_phone(c, _slots, seg) {
      // "Mi cartera y mi celular" after the alarm: the item answer already said where it goes
      if (c.s.alarmDone && !c.s.walked) return;
      c.say(seg.tags.includes("empty") ? "pockets_yes" : "phone_where"); waitOn(c); },
    ask_jacket(c) { c.say(/\b(sueter|saco|abrigo|jersey|chaleco|sombrero|gorro)\b/.test(fold(c.heard)) ? "jacket_yes_m" : "jacket_yes"); waitOn(c); },
    ask_belt(c) { c.say("jacket_yes_m"); waitOn(c); },
    ask_watch(c) { c.say("watch_yes"); waitOn(c); },
    ask_glasses(c) {
      if (c.step === "camera" && !c.s.cameraDone) { c.say("glasses_moment"); c.hold(); return; }
      c.say("glasses_keep");
    },
    ask_bins(c, _slots, seg) { c.say(seg.tags.includes("bag") ? "bag_no_tray" : "bins_here"); waitOn(c); },
    ask_food(c) { c.say("food_ok"); waitOn(c); },
    ask_water(c) { c.say("water_rule"); waitOn(c); },
    pockets_item(c) { if (c.s.__finished) c.say("all_set"); else if (c.step === "walk" || c.step === "divest") { c.say("item_tray"); c.hold(); } },
    pockets_nothing(c) { if (c.s.__finished) c.say("all_set"); },
    forgot(c) { c.say("no_worries"); },
    g_thanks(c) {
      if (c.step === "collect" && !c.s.collected) { c.s.collected = true; c.say("bag_back"); return; }
      c.say("g_welcome");
    },
    ask_what(c) {
      if (c.step === "bag_q" && !c.s.bagHeld) { c.say("bag_just_check"); return; }
      c.say(c.s.bagHeld && !c.s.bagChecked ? "found_bottle" : "no_problem_q");
    },
    where_stand(c) { c.say(c.s.scanner ? "scanner2" : "walkthrough"); c.hold(); },
    bottle_drink(c) { if (negated(c, "drink")) return; if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "drink_ok"); else c.say(c.s.__finished ? "all_set" : "ack"); },
    bottle_throw(c) { if (negated(c, "throw")) return; if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "toss_ok"); else c.say(c.s.__finished ? "all_set" : "ack"); },
    bottle_empty(c) { if (negated(c, "empty")) return; if (c.s.bagHeld && !c.s.bagChecked) bottleDone(c, "empty_ok"); else c.say("water_rule"); },
    bottle_neg(c) { if (c.s.bagHeld && !c.s.bagChecked) c.say("bottle_then"); else c.say("ack"); },
    bottle_keep(c) {
      if (!c.s.bagHeld || c.s.bagChecked) { c.say("water_rule"); return; }
      c.say("water_rule");
      expectBottleKeep(c);
    },
    bag_back(c) {
      if (c.s.bagHeld && !c.s.bagChecked) { c.say("found_bottle"); return; }
      if (c.s.bagHeld && !c.s.collected) { c.s.collected = true; c.say("bag_back"); return; }
      if (c.s.walked) { c.say("bags_end_belt"); return; }
      c.say("bag_later");
    },
    shoes_on(c) { if (c.s.benchSaid) { c.say("shoes_bench_again"); return; } c.s.benchSaid = true; c.say("shoes_bench"); },
    ask_gate(c) { c.say("gate_dir"); },
    ask_restroom(c) { c.say("restroom"); },
  },

  finish: (c) => {
    c.complete();
    if (!c.s.bagHeld) { c.say("all_set"); c.say("bags_end_belt"); }
    else c.say("all_set");
    if (c.s.shoesOff) { c.s.benchSaid = true; c.say("shoes_bench"); }
    c.say("bye");
    ask(c, { id: "closing", hints: ["g_social", "after"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask where your gate is", hint: "after" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // Every hint construction
    { say: "Aquí tiene.", intent: "give_docs", step: "docs" },
    { say: "Aquí tiene mi pasaporte y mi pase de abordar.", intent: "give_docs", step: "docs" },
    { say: "Mi pase de abordar está en mi celular.", intent: "give_docs" },
    { say: "¿Necesita mi pasaporte?", intent: "docs_q" },
    { say: "¿Esta es la fila para seguridad?", intent: "is_this_line" },
    { say: "Listo.", intent: "ack_done", step: "divest" },
    { say: "¿Me quito los lentes?", intent: "ask_glasses", step: "camera" },
    { say: "¿Tengo que quitarme los zapatos?", intent: "ask_shoes" },
    { say: "¿Tengo que sacar la laptop?", intent: "ask_laptop" },
    { say: "No traigo laptop.", intent: "no_laptop", not: ["ask_laptop"] },
    { say: "¿Los líquidos van en una bolsa?", intent: "ask_liquids" },
    { say: "No traigo líquidos.", intent: "no_liquids", not: ["ask_liquids"] },
    { say: "¿Dónde pongo mi celular?", intent: "ask_phone" },
    { say: "¿Dónde están las charolas?", intent: "ask_bins" },
    { say: "¿Así?", intent: "ack_done", step: "walk" },
    { say: "Ah, sí, mi cinturón.", intent: "pockets_item", slots: { pocket: "belt" } },
    { say: "Solo mis llaves.", intent: "pockets_item", slots: { pocket: "keys" } },
    { say: "¡Ay, mi celular!", intent: "pockets_item", slots: { pocket: "phone" } },
    { say: "Creo que es mi cinturón.", intent: "pockets_item", slots: { pocket: "belt" } },
    { say: "No, nada.", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "Sí, es mía.", intent: "affirm", step: "bag_q" },
    { say: "Sí. ¿Hay algún problema?", intent: "affirm", step: "bag_q" },
    { say: "No es mía.", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "Ay, perdón, se me olvidó.", intent: "forgot" },
    { say: "La puede tirar.", intent: "bottle_throw", step: "bottle" },
    { say: "Me la tomo aquí.", intent: "bottle_drink", step: "bottle" },
    { say: "¿Puedo vaciarla?", intent: "bottle_empty", step: "bottle" },
    { say: "¿Me puedo quedar con la botella?", intent: "bottle_keep", step: "bottle" },
    { say: "¿Me da mi maleta?", intent: "bag_back" },
    { say: "¿Ya me puedo ir?", intent: "bag_back" },
    { say: "¿Dónde está la sala 8?", intent: "ask_gate", slots: { number: 8 } },
    { say: "¿Dónde me pongo los zapatos?", intent: "shoes_on" },
    // Natural alternatives, tú to staff, no accents, Mexican and neutral words
    { say: "Tenga", intent: "give_docs", step: "docs" },
    { say: "aqui esta mi pasaporte", intent: "give_docs", step: "docs" },
    { say: "¿Necesitas mi pasaporte?", intent: "docs_q" },
    { say: "¿Qué identificación necesita?", intent: "docs_q" },
    { say: "¿Me quito los tenis?", intent: "ask_shoes" },
    { say: "¿Puedo dejar la laptop en la mochila?", intent: "ask_laptop" },
    { say: "¿El bloqueador cuenta como líquido?", intent: "ask_liquids" },
    { say: "¿Me quito la chamarra?", intent: "ask_jacket" },
    { say: "¿Tengo que quitarme la chaqueta?", intent: "ask_jacket" },
    { say: "¿Dónde están las bandejas?", intent: "ask_bins" },
    { say: "¿Me da una bolsita?", intent: "no_plastic_bag" },
    { say: "¿Y mi torta?", intent: "ask_food" },
    { say: "Solo traigo una botellita de agua", intent: "ask_water" },
    { say: "¿Ya puedo pasar?", intent: "ack_done", step: "walk" },
    { say: "¿Dónde me paro?", intent: "where_stand", step: "walk" },
    { say: "Unas monedas", intent: "pockets_item", slots: { pocket: "coins" } },
    { say: "Ni cinturón ni reloj", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "Esa es mi maleta", intent: "affirm", step: "bag_q" },
    { say: "Tírela, por favor", intent: "bottle_throw", step: "bottle" },
    { say: "Tírala", intent: "bottle_throw", step: "bottle" },
    { say: "Tiro el agua y me quedo con la botella", intent: "bottle_empty", step: "bottle" },
    { say: "¿Cómo llego a la puerta 12?", intent: "ask_gate", slots: { number: 12 } },
    // Spain forms are correct answers
    { say: "Tengo el pase en el móvil", intent: "give_docs", step: "docs" },
    { say: "¿Tengo que sacar el ordenador?", intent: "ask_laptop" },
    { say: "Me la bebo ahora", intent: "bottle_drink", step: "bottle" },
    { say: "¿Dónde están los aseos?", intent: "ask_restroom" },
    { say: "Vale, ya está", intent: "ack_done", step: "divest" },
    // Meaning safety: no refusal may be read as the thing refused
    { say: "No tengo computadora", intent: "no_laptop", step: "divest", not: ["ask_laptop"] },
    { say: "No traigo nada en los bolsillos", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "No traigo llaves", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "No, no es mía", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "Esa no es mi maleta", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "No sé si es mía", intent: "bag_unsure_ctx", step: "bag_q", not: ["affirm", "deny"] },
    { say: "No la tire", intent: "bottle_neg", step: "bottle", not: ["bottle_throw"] },
    { say: "No quiero tomármela", intent: "bottle_neg", step: "bottle", not: ["bottle_drink"] },
    { say: "No quiero quedarme con la botella", intent: "bottle_throw", step: "bottle", not: ["bottle_keep"] },
    { say: "No estoy listo todavía", intent: "not_ready", step: "walk", not: ["ack_done"] },
    { say: "No tengo mi pasaporte", intent: "none", step: "docs" },
    { say: "No tengo que quitarme los zapatos, ¿verdad?", intent: "ask_shoes", step: "divest" },
    // review: traps from the blind set and the probes (the refused choice never acts)
    { say: "No la tire, por favor, me la tomo", intent: "bottle_drink", step: "bottle", not: ["bottle_throw"] },
    { say: "No la tiro, me la tomo", intent: "bottle_drink", step: "bottle", not: ["bottle_throw"] },
    { say: "No la tire, la vacío", intent: "bottle_empty", step: "bottle", not: ["bottle_throw"] },
    { say: "No la vacío, tírela", intent: "bottle_throw", step: "bottle", not: ["bottle_empty"] },
    { say: "No me la tomo, la vacío", intent: "bottle_empty", step: "bottle", not: ["bottle_drink"] },
    { say: "No, mejor me la tomo", intent: "bottle_drink", step: "bottle", not: ["bottle_neg"] },
    { say: "No quiero tirarla", intent: "bottle_neg", step: "bottle", not: ["bottle_throw"] },
    { say: "Tírela, no hay problema", intent: "bottle_throw", step: "bottle" },
    { say: "No traigo cinturón ni reloj", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "No traigo nada en las bolsas", intent: "pockets_nothing", not: ["pockets_item"] },
    { say: "No, nada más mis llaves", intent: "pockets_item", slots: { pocket: "keys" }, not: ["pockets_nothing"] },
    { say: "No, esa no es mía", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "No, la mía es la negra", intent: "deny", step: "bag_q", not: ["affirm"] },
    { say: "Todavía no estoy listo", intent: "not_ready", step: "divest", not: ["ack_done"] },
    { say: "Un momento, lo estoy buscando", intent: "not_ready", step: "docs", not: ["give_docs"] },
    { say: "No, la laptop no la traigo", intent: "no_laptop", step: "divest", not: ["ask_laptop"] },
    { say: "¿Qué tengo que sacar?", intent: "ask_what_out", step: "divest" },
    { say: "¿Saco el celular?", intent: "ask_phone", step: "divest" },
    { say: "¿Tengo que quitármelos?", intent: "ask_shoes" },
    { say: "¿Mi licencia sirve?", intent: "docs_q", step: "docs" },
    { say: "¿Por dónde está la sala 12?", intent: "ask_gate", slots: { number: 12 } },
    // Must not be understood
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
    { say: "botella zapato azul cielo", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["Buenos días, aquí tiene mi pasaporte y mi pase de abordar.", "Está bien.", "Listo.", "Gracias."],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = false; } },
    { name: "one document at a time, questions and a change of mind", turns: ["Aquí está mi pasaporte.", "Está en mi celular.", "¿Tengo que quitarme los zapatos?", "¿Tengo que sacar la laptop?", "¿Puedo dejar la laptop en la mochila?", "¿El bloqueador cuenta como líquido?", "¿Dónde pongo mi celular?", "No estoy lista todavía.", "Listo, ya está todo.", "¿Así?", "¿Dónde está la sala ocho?", "Gracias."],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = false; } },
    { name: "the alarm: nothing in the pockets, no belt, shoes off (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "No, nada.", "No, no traigo.", "Claro.", "Listo.", "¿Dónde me pongo los zapatos?", "Gracias."],
      expect: { complete: true, state: { shoesOff: true, walked: true } }, auto: AUTO, setup: (s) => { s.alarm = true; s.camera = false; s.bagCheck = false; } },
    { name: "the alarm: keys in a pocket (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "Solo mis llaves.", "Listo.", "Gracias."],
      expect: { complete: true, state: { walked: true } }, auto: AUTO, setup: (s) => { s.alarm = true; s.camera = false; s.bagCheck = false; } },
    { name: "the alarm: I don't know, then the phone (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "No sé.", "¡Ay, mi celular!", "Listo.", "Gracias."],
      expect: { complete: true, state: { walked: true } }, auto: AUTO, setup: (s) => { s.alarm = true; s.camera = false; s.bagCheck = false; } },
    { name: "bag check: forgot the water, throw it away (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "Sí, es mía.", "Ay, perdón, se me olvidó.", "No la tire.", "La puede tirar.", "¿Me da mi maleta?", "Gracias."],
      expect: { complete: true, state: { bagChecked: true, collected: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = true; } },
    { name: "bag check: keep the bottle, then empty it (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "Sí. ¿Hay algún problema?", "¿Me puedo quedar con la botella?", "Bueno, la vacío.", "¿Ya me puedo ir?", "Gracias."],
      expect: { complete: true, state: { bagChecked: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = true; } },
    { name: "bag check: not sure, then not my bag (twist forced)", turns: ["Aquí tiene.", "No traigo laptop.", "Listo.", "Listo.", "No sé si es mía.", "No, es mía.", "No, no es mía.", "Gracias."],
      expect: { complete: true, state: { bagChecked: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = true; } },
    // review: a "but yes" next to a no, the shoes question during the twist, refusals said with another choice
    { name: "the alarm: no belt, but a watch (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "No, nada.", "No traigo cinturón pero sí reloj.", "Listo.", "Gracias."],
      expect: { complete: true, state: { walked: true, shoesOff: undefined } }, auto: AUTO, setup: (s) => { s.alarm = true; s.camera = false; s.bagCheck = false; } },
    { name: "the alarm: the shoes too? (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "No, nada.", "No, ninguno.", "¿Los zapatos también?", "Claro.", "Listo.", "Gracias."],
      expect: { complete: true, state: { walked: true, shoesOff: true } }, auto: AUTO, setup: (s) => { s.alarm = true; s.camera = false; s.bagCheck = false; } },
    { name: "bag check: don't throw it, I'll drink it (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "Sí, es mía.", "No la tire, por favor, me la tomo.", "¿Ya me puedo ir?", "Gracias."],
      expect: { complete: true, state: { bottleChoice: "drink_ok", collected: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = true; } },
    { name: "bag check: keep it? a bare no, then empty it (twist forced)", turns: ["Aquí tiene.", "Listo.", "Listo.", "Sí, es mía.", "¿Me puedo quedar con la botella?", "No.", "No la tire, la vacío.", "¿Me da mi maleta?", "Gracias."],
      expect: { complete: true, state: { bottleChoice: "empty_ok", collected: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = false; s.bagCheck = true; } },
    { name: "short answers, the look at the camera", turns: ["Tenga.", "¿Me quito los lentes?", "Listo.", "Va.", "Listo.", "Gracias."],
      expect: { complete: true, state: { cameraDone: true } }, auto: AUTO, setup: (s) => { s.alarm = false; s.camera = true; s.bagCheck = false; } },
  ],
};

export default security;
