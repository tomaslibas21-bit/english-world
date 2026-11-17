// NEEDS: tools/gen-index.ts picks only /^[sp]\d\d/ files, so x01-surf is left out of index.ts: its filter needs an x
//   (/^[spx]\d\d[a-z]?-.+\.ts$/), then rerun it (51 situations). The voice casting has no role for "surf" yet
//   (tests/es/voices.test.ts "casts every character"). The Lithuanian layer's word notes (es-lt) lack the new notes.
//   global g_bye's usted variant: this file says its own tú goodbye ("bye"), as s35 does.
// x01 "¿Probamos una ola?" · La Ola, a thatched palapa on the beach just west of Restaurante El Muelle's pier (no English
// twin: the first conversation that exists only in Puerto Colibrí). Nayeli, the surf instructor (about 28, from Puerto
// Escondido on the Pacific: she grew up surfing Zicatela), says tú to everyone; the learner may say tú or usted.
// A rack of boards, paddleboards, a kayak and snorkel gear; the chalkboard reads "Olas: 1 m · Marea baja · Viento suave".
// Two things to do, in either order, one is enough to finish:
//  - rent something by the hour: la tabla de surf $200, el paddle $250, el kayak $250 (doble $350), el equipo de
//    snorkel $150; an ID or a $500 deposit left at the palapa; cash or card; the gear handed over with a safety word.
//  - a beginner lesson: one hour, $600, the soft board and the lycra included; the board, paddling, standing up and
//    safety in short lines; questions (is it hard, deep, what if I fall, sharks); then "¿Probamos una ola?", whose yes
//    starts the surf game: c.event("surf", { level: "beginner" | "advanced" }).
// A learner who already surfs hears the truth: the Caribbean's waves here are small; real surf is on the Pacific, in
// Puerto Escondido (Zicatela for experts, La Punta for intermediates, May to August; a flight from Mexico City, or the
// new highway from Oaxaca city, about two and a half hours), and is invited to try a wave here anyway (on the house).
// Twists: the card terminal has no signal on the beach today (cash only; the ATM by the door of Banco del Puerto on
// avenida Juárez, across from the zócalo: TOWN.md); she asks for an ID first and the learner has none (the deposit).
// Town facts kept: the reef toward the lighthouse at the beach's east end (TOWN.md: on its rocks offshore); open 8 to 6,
// the last rental at 5 (this palapa's own, invented); pesos only (as every cashier in town says).
// Mexican-only words with a neutral twin: rentar / la renta (alquilar / el alquiler: CONTENT-14NOV), ¡qué padre!, ¡va!,
// pizarrón. The surf game's own lines (src/editions/es/content/surf-lines.ts) are spread into `lines` and `merges`.

import type { Ctx, EntityDef, Segment, SituationDef, Suggestion } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { SURF_LINES, SURF_MERGES } from "../surf-lines";

// ---------------------------------------------------------------------------
// Prices (cents of a peso)

const PRICE: Record<string, number> = { board: 20000, paddle: 25000, kayak: 25000, kayak2: 35000, snorkel: 15000 };
const LESSON = 60000;
const DEPOSIT = 50000;
const LATE = 10000;
const HOURS = [1, 2, 3];

// ---------------------------------------------------------------------------
// Entities

const GEAR: EntityDef[] = [
  ent("board", "tabla | de | surf", "board | for | surfing", "f", { pl: "tablas | de | surf", ltPl: "boards | for | surfing",
    forms: ["tabla", "la tabla", "una tabla", "tablas", "tabla de surf", "la tabla de surf", "una tabla de surf", "tabla de surfear", "tabla para surfear", "surfboard", "tabla de olas", "tabla blanda", "una tabla blanda"],
    chip: "tabla de surf", attrs: { nat: "surfboard" } }),
  ent("paddle", "paddle", "paddleboard", "m", { pl: "paddles", ltPl: "paddleboards",
    forms: ["el paddle", "un paddle", "tabla de paddle", "la tabla de paddle", "una tabla de paddle", "paddleboard", "paddle board", "sup", "stand up paddle", "tabla de remo", "una tabla de remo", "padel", "paddle surf", "el paddle surf", "tabla de paddle surf", "una tabla de paddle surf"],
    chip: "paddle", attrs: { spain: "paddle surf" } }),
  ent("kayak", "kayak", "kayak", "m", { pl: "kayaks", ltPl: "kayaks",
    forms: ["el kayak", "un kayak", "kayac", "cayac", "caiac", "kayak sencillo", "un kayak sencillo", "kayak individual", "kayak para uno", "un kayak para uno", "kayak para una persona", "canoa", "una canoa"],
    chip: "kayak" }),
  ent("kayak2", "kayak | doble", "kayak | double", "m", { pl: "kayaks | dobles", ltPl: "kayaks | double",
    forms: ["kayak doble", "el kayak doble", "un kayak doble", "kayak para dos", "un kayak para dos", "kayak de dos", "kayak para dos personas", "un kayak para dos personas", "kayak tandem", "kayac doble"],
    chip: "kayak doble", attrs: { nat: "double kayak" } }),
  ent("snorkel", "equipo | de | snorkel", "gear | for | snorkeling", "m", { pl: "equipos | de | snorkel", ltPl: "sets | of | snorkel gear",
    forms: ["snorkel", "el snorkel", "un snorkel", "esnorkel", "snorquel", "esnorquel", "equipo de snorkel", "el equipo de snorkel", "un equipo de snorkel", "equipo para snorkel", "kit de snorkel", "visor y aletas", "el visor y las aletas", "careta y aletas", "mascara y aletas", "gafas y tubo", "las gafas y el tubo", "aletas", "unas aletas", "un visor"],
    chip: "snorkel", attrs: { nat: "snorkel gear" } }),
];
const GEAR_IDS = GEAR.map((g) => g.id);

/** What the learner may leave at the palapa (agreement: "te lo devuelvo" / "te la devuelvo"). */
const DOCS: EntityDef[] = [
  ent("passport", "pasaporte", "passport", "m", { forms: ["el pasaporte", "mi pasaporte", "un pasaporte", "pasaportes"] }),
  ent("id", "identificación", "ID", "f", { forms: ["la identificacion", "mi identificacion", "una identificacion", "identificacion oficial", "una identificacion oficial", "credencial", "mi credencial", "ine", "mi ine", "id", "mi id", "documento", "un documento", "documento de identidad", "mi documento de identidad", "un documento de identidad", "dni", "mi dni", "carnet", "mi carnet", "carne", "mi carne"] }),
  ent("license", "licencia", "driver's license", "f", { forms: ["la licencia", "mi licencia", "licencia de manejo", "mi licencia de manejo", "licencia de conducir", "mi licencia de conducir", "permiso de conducir", "carnet de conducir", "mi carnet de conducir", "carne de conducir", "mi carne de conducir"] }),
  ent("residence", "tarjeta | de | residente", "card | of | resident", "f", { forms: ["tarjeta de residente", "mi tarjeta de residente", "la tarjeta de residente", "tarjeta de residencia", "mi tarjeta de residencia", "mi residencia"], attrs: { nat: "residence card" } }),
];

// ---------------------------------------------------------------------------
// Flags and helpers

const F_VA = "Mexican: ¡va! = okay, deal.";
const F_RENTAR = "Mexican: rentar = to rent. Elsewhere: alquilar.";
const F_RENTA = "Mexican: la renta = the rental. Elsewhere: el alquiler.";
const F_PADRE = "Mexican: ¡qué padre! = how cool!";
const F_PIZARRON = "Mexican: el pizarrón = the chalkboard. Elsewhere: la pizarra.";
const F_LYCRA = "la lycra: a rash guard, the stretchy surf shirt (from the brand name Lycra).";
const F_QUILLAS = "las quillas: the fins under the tail of a surfboard (a ship's keel is a quilla too).";
const F_CORREA = "la correa: the leash that ties the board to your ankle.";
const F_INVENTO = "el invento: “the invention”: Spain's surfers' word for the leash.";
const F_PUERTO = "Puerto Escondido: “Hidden Port”, a surf town on the Pacific coast of Oaxaca.";
const F_ZICATELA = "Zicatela: Puerto Escondido's big-wave beach, the “Mexican Pipeline”.";
const F_PUNTA = "La Punta: “the point”, the gentler break at Zicatela's south end.";
const F_ARRECIFE = "el arrecife: the reef; along this coast it's coral, full of fish.";
const F_REVOLCON = "revolcón: revolcar (to tumble) + -ón, the augmentative: a wipeout, being rolled by the wave.";
const F_ZOCALO = "zócalo: the main square of a Mexican town.";
const F_TOLERANCIA = "tolerancia: in Mexico, the grace period before you count as late.";
const F_A_AWAY = "a before a distance: away.";
const F_TERMINAL = "la terminal: the card machine.";
const F_DATAFONO = "el datáfono: Spain's word for the card machine.";
const F_FIANZA = "la fianza: Spain's usual word for a deposit you get back.";
const F_TE_ANIMAS = "¿Te animas?: “do you cheer yourself up to it?” = are you up for it?";

const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const heard = (c: Ctx) => fold(c.heard);
const seg0 = (intent: string, slots: Record<string, unknown> = {}): Segment => ({ intent, slots, tags: [] });

const gearPrice = (c: Ctx) => PRICE[c.s.gear as string] ?? 0;
const rentSub = (c: Ctx) => gearPrice(c) * ((c.s.hours as number | undefined) ?? 1);
const rentTotal = (c: Ctx) => rentSub(c) + (c.s.deposit ? DEPOSIT : 0);
/** The level the surf game starts at: advanced only when the learner said they already surf. */
const level = (c: Ctx) => (c.s.surfer ? "advanced" : "beginner");
/** "Está bien, gracias": a yes or a polite no; never a payment (rule 17). */
const politeClosing = (c: Ctx) => /^(esta bien|ok|okay|vale|bueno|asi esta bien)\b.*\bgracias\b/.test(heard(c));
/** The card handed over ("Aquí tienes mi tarjeta"), unless it's "no ... tarjeta". */
const saysCard = (c: Ctx) => /\btarjeta\b/.test(heard(c).replace(/\b(no|sin)\s+(\w+\s+){0,2}tarjeta\b/g, " "));
/** Which payment is open now: the rental's or the lesson's, once its total was said. */
const payable = (c: Ctx): "rent" | "lesson" | undefined =>
  c.step === "rent_pay" && c.s.rentTotalSaid && !c.s.rentPaid ? "rent" : c.step === "lesson_pay" && c.s.lessonTotalSaid && !c.s.lessonPaid ? "lesson" : undefined;
/** The last topic was Puerto Escondido: "¿Es peligroso?" means there. */
const peTopic = (c: Ctx) => c.s.topic === "pe" || /\b(puerto escondido|zicatela|la punta|alla|oaxaca|pacifico)\b/.test(heard(c));

const AUTO: Record<string, string> = {
  what: "Quiero rentar una tabla", gear: "Una tabla de surf", hours: "Una hora", deposit: "Aquí tienes mi pasaporte", rent_pay: "En efectivo",
  deposit_offer: "Sí, está bien", experience: "No, nunca", lesson_offer: "Sí, me animo", lesson_pay: "En efectivo", board: "Sí, te sigo",
  moves: "Todo claro", safety: "No, ninguna", pe_been: "No, nunca he ido", invite: "¡Vamos!",
};

// ---------------------------------------------------------------------------

export const surf: SituationDef = {
  id: "x01-surf",
  song: "",
  songTitle: "",
  title: { en: "¿Probamos una ola?", lt: "Shall we try a wave?" },
  topic: { en: "Renta de equipo y escuela de surf", lt: "Gear rental and surf school" },
  chapter: 6,
  order: 8,
  location: "surf-palapa",
  npc: "surf",
  goal: "Rent something for the beach, or book a beginner surf lesson: ask the price and what's included, leave an ID or a deposit, and pay. Then say yes (or not today) to your first wave.",
  intro: "La Ola, a thatched palapa on the beach just west of El Muelle's pier: surfboards, paddleboards, a kayak and snorkel gear. The chalkboard says “Olas: 1 m · Marea baja · Viento suave” (waves 1 m, low tide, light wind). Nayeli, the surf instructor, grew up surfing on Mexico's Pacific coast; she'll call you tú. Prices are in pesos.",
  entities: { gear: GEAR, doc: DOCS },

  grammar: {
    macros: {
      rent_v: "(rentar | alquilar | rentarme | alquilarme)",
      want: "(quiero | quisiera | me gustaria | necesito | busco | vengo a | vengo por | queria)",
      hand: "(aqui tienes | aqui tiene | aqui esta | ten | toma | tenga | tome)",
      leave: "(te dejo | le dejo | dejo | te puedo dejar | puedo dejar | prefiero dejar | prefiero dejarte | mejor te dejo | puedo dejarte)",
      lesson_n: "(una clase | la clase | clases | una leccion | clase | lecciones)",
      surf_v: "(surfear | hacer surf | el surf | surf)",
    },
  },

  intents: {
    // --- what the learner is looking for ---------------------------------------------------------
    want_rent: { patterns: [
      "@want @rent_v {gear} #h:r_want", "@want @rent_v {gear} (por | para) {n:number} (horas | hora)", "@want @rent_v (algo | equipo | un equipo | cosas)",
      "(me rentas | me alquilas | me renta | me alquila | me puedes rentar | me puedes alquilar | me puede rentar | me puede alquilar | me prestas | me presta) {gear} #h:r_me",
      "(me rentas | me alquilas | me puedes rentar | me puedes alquilar) {gear} (por | para) {n:number} (horas | hora)",
      "(me llevo | quiero | me das | dame | me da | deme | ponme | me pones | voy a querer) {gear} #h:r_take", "(me llevo | quiero | me das | dame) {gear} (por | para) {n:number} (horas | hora)",
      "{gear} (por | para) {n:number} (horas | hora) #h:r_hours", "{gear} (por | para) (una | 1) hora", "{gear} #h:r_please", "mejor {gear}", "{gear} mejor",
      "no {wrong:gear} [sino] [mejor] {gear}", "(rentan | alquilan | rentas | alquilas | tienes | tienen | hay) {gear} [para rentar | para alquilar]",
      "(que | que cosas) (rentas | rentan | alquilas | alquilan | tienes para rentar | tienes para alquilar | tienen para rentar | hay para rentar | se puede rentar | se puede alquilar) [aqui]",
      "(vengo por | busco) (la renta de equipo | el alquiler de equipo | equipo)", "(la)? (renta | el alquiler) de equipo",
    ] },
    gear_no: { patterns: ["no (quiero | necesito | voy a querer) [@rent_v] {gear}", "{gear} no", "sin {gear}", "(no)? mejor no [quiero] {gear}"] },
    want_lesson: { patterns: [
      "@want [tomar | hacer] @lesson_n [de surf] #h:l_want", "@want @lesson_n (de surf | para principiantes)", "@want aprender [a] @surf_v #h:l_learn", "@want aprender",
      "@want (probar | intentar) @surf_v", "[tambien] (das | dan | tienes | tienen | hay | ofreces | ofrecen) [tambien] @lesson_n [de surf]", "(y)? (las clases | la clase) (tambien)?", "(me ensenas | me puedes ensenar | me ensena | me puede ensenar) [a] [@surf_v]",
      "@lesson_n [de surf] [por favor]", "(una)? clase para principiantes", "(me apunto | me anoto | me inscribo) [a | en] [la clase | una clase]",
      "(la clase | una clase) de surf", "(quiero | quisiera) (la clase | una clase) [de surf] [por favor]",
    ] },
    lesson_no: { patterns: ["no (quiero | necesito | voy a tomar) @lesson_n", "(sin | nada de) clase", "(clase | la clase) no", "no (quiero | voy a) aprender"] },
    // already surfs: the honest talk (advanced)
    surf_yes: { patterns: [
      "(ya)? (surfeo | se surfear | se hacer surf | hago surf | ya hago surf) [bien | desde hace (anos | mucho | tiempo)] #h:s_yes",
      "(soy | ya soy) surfista", "tengo (experiencia | mucha experiencia | nivel | buen nivel)", "(llevo | tengo) (anos | mucho tiempo | varios anos) (surfeando | haciendo surf)",
      "(surfeo | hago surf) (desde hace anos | hace anos | desde nino | desde nina | desde chico | desde chica)", "(si)? ya (he surfeado | surfeé | he hecho surf) (mucho | muchas veces | bastante | anos)",
      "(si)? (surfeo | hago surf) (seguido | mucho | bastante | cada semana)", "(no)? (soy | ya no soy) principiante (ya)? (surfeo | se surfear)",
    ] },
    surf_some: { patterns: [
      "(si)? (una vez | un par de veces | pocas veces | dos veces) [nada mas | nomas | solo]", "(si)? (un poco | poquito | un poquito) [nada mas | nomas]",
      "(si)? (he surfeado | surfeé | he hecho surf | probé | lo probé | ya lo probé | lo intenté) (una vez | un par de veces | un poco | pocas veces | dos veces) #h:l_some",
      "(si)? (surfeo | se surfear | hago surf) (un poco | un poquito | poquito | muy poco | mas o menos)",
    ] },
    surf_none: { patterns: [
      "(no)? (nunca | jamas) (he surfeado | he hecho surf | surfeé | me he subido a una tabla | lo he intentado | lo he hecho | he probado)", "(no)? es mi primera vez #h:l_first",
      "(no)? (soy | yo soy) principiante", "no se (surfear | hacer surf | nada de surf)", "(no)? (es la | seria mi) primera vez",
      "(no)? nunca (he surfeado | lo he hecho) en mi vida",
    ] },
    surf_none_ctx: { patterns: ["no nunca #h:ex_never", "(no)? nunca", "(no)? ninguna vez", "(no)? jamas", "(no)? (cero | nada)", "(no)? nunca en mi vida"] },
    just_looking: { patterns: ["(solo | nomas | nada mas) (estoy viendo | ando viendo | veo | estoy mirando | miro | pregunto)", "(estoy | ando) (viendo | mirando | echando un vistazo)", "(solo | nomas) (queria | quería | quiero) (ver | preguntar | saber)"] },

    // --- rental: hours, ID or deposit -----------------------------------------------------------
    hours: { patterns: [
      "[por | para] {n:number} (horas | hora) #h:h_n", "(solo | nada mas | nomas | nomas por) (una | 1) hora #h:h_one", "[por | para] (una | 1) hora",
      "(mejor | no mejor) [por | para] {n:number} (horas | hora)", "(son | serian | seria) {n:number} (horas | hora)",
    ] },
    hours_ctx: { patterns: ["{n:number}", "(la | una) hora", "(solo | nomas | nada mas) {n:number}", "{n:number} (nada mas | nomas | solamente)"] },
    hours_half_ctx: { patterns: ["(media hora | hora y media | una hora y media | dos horas y media | dos y media)", "(solo | nomas) media hora"] },
    hours_long_ctx: { patterns: ["(todo el dia | toda la tarde | toda la manana | el dia completo | medio dia | cuatro horas | cinco horas | seis horas)"] },
    id_give: { patterns: [
      "@hand (mi | el | la | una) {doc} #h:dp_id", "@leave (mi | el | la | una) {doc}", "(si)? (traigo | tengo) (mi | el | la)? {doc} [aqui]", "{doc}", "con (mi | el | la)? {doc}",
      "mejor (mi | el | la)? {doc}", "(te dejo | le dejo) (mi | la | una) identificacion", "(te sirve | le sirve | sirve) (mi | el | la)? {doc}",
    ] },
    dep_give: { patterns: [
      "@leave (el | un) deposito #h:dp_dep", "(el | un)? deposito [mejor]", "(prefiero | mejor) (el)? deposito", "@leave (la | una) fianza", "(la)? fianza [mejor]", "(prefiero | mejor) (la)? fianza",
      "@leave (los | el) quinientos [pesos]", "@leave quinientos [pesos]",
    ] },
    no_id: { patterns: [
      "no (traigo | tengo | llevo | cargo) (mi | la | el | ninguna | ningun)? (identificacion | {doc} | papeles | documentos | identificaciones) [aqui | conmigo | encima] #h:dp_noid",
      "(dejé | olvidé | deje | olvide) (mi | el | la)? {doc} (en el hotel | en el departamento | en casa | en el cuarto)", "(se me olvidó | se me quedó) (mi | el | la)? {doc} [en el hotel | en casa]",
      "no (quiero | puedo) dejar (mi | el | la)? {doc}", "(mi | el) {doc} (esta | lo tengo | la tengo) en (el hotel | casa | el departamento)",
      "no (traigo | tengo | llevo) [nada] [(lo | la)] (dejé | olvidé | deje | olvide) en (el hotel | casa | el departamento | el cuarto)",
      "(lo | la) (dejé | olvidé) en (el hotel | casa | el departamento | el cuarto)",
    ] },
    // "No traigo", "No la tengo" at "¿Me dejas una identificación?" (elsewhere it could be the cash)
    no_id_ctx: { patterns: ["no (lo | la)? (traigo | tengo | llevo | cargo) [aqui | conmigo | ahorita | encima]", "no (traigo | tengo | llevo) (nada | ninguna)"] },
    no_dep: { patterns: ["no (quiero | puedo) dejar (deposito | un deposito | el deposito | fianza | la fianza | dinero)", "no (tengo | traigo) para el deposito", "(sin | nada de) (deposito | fianza)"] },
    ask_deposit: { patterns: [
      "(hay que | tengo que | necesito | debo) dejar (algo | deposito | un deposito | identificacion | una identificacion | mi pasaporte | fianza | una fianza)",
      "(cuanto es | de cuanto es | de cuanto) (el deposito | la fianza)", "(piden | pides | cobran | cobras | hay) (deposito | fianza)", "(necesitas | necesita | ocupas) (mi | una)? (identificacion | pasaporte | {doc})",
      "(que | que cosa) (te dejo | tengo que dejar | dejo)",
    ] },
    dep_back_q: { patterns: ["(me lo | me la) (devuelves | devuelve | regresas | regresa) [despues | al final | cuando regrese | cuando vuelva] #h:dp_back", "(me devuelves | me regresas) (el deposito | la fianza | mi pasaporte | mi identificacion | el dinero)", "(el deposito | la fianza) (se devuelve | me lo devuelves | me la devuelves)"] },
    two_people: { patterns: ["(somos | vamos) (dos | dos personas)", "para dos (personas)?", "(es | seria) para dos", "(mi pareja | mi esposo | mi esposa | mi amigo | mi amiga | mi novio | mi novia) y yo"] },

    // --- paying ------------------------------------------------------------------------------
    pay_cash: { patterns: ["(en | con)? efectivo #h:p_cash", "mejor (en | con)? efectivo #h:pc_cash", "no (con | en) tarjeta [sino] [mejor] (en | con)? efectivo", "(en | con)? efectivo (no | y no) (con)? tarjeta", "(pago | te pago | le pago | voy a pagar | prefiero pagar) (en | con) efectivo", "(con | en) (billetes | pesos)", "(tengo | traigo) efectivo", "(en | con) efectivo mejor"] },
    pay_card: { patterns: ["(con)? tarjeta #h:p_card", "(perfecto | muy bien | genial | bueno | vale | ok | listo) [entonces] (con)? tarjeta [entonces] #h:pc_ok", "(pago | te pago | le pago) con tarjeta entonces #h:pc_then", "@hand (la | mi) tarjeta #h:pc_here", "no (en | con)? efectivo [sino] [mejor] con tarjeta", "con tarjeta (no | y no) (en)? efectivo", "(pago | te pago | le pago | voy a pagar | prefiero pagar) con tarjeta", "@hand (mi)? tarjeta", "(con | en) tarjeta mejor", "(con)? tarjeta de (credito | debito)"] },
    ask_card: { patterns: ["(aceptas | aceptan | acepta | tomas | toman | reciben | recibes) tarjeta #h:p_askcard", "(y si | que pasa si) (pago | te pago) con tarjeta", "(puedo | se puede) pagar con tarjeta", "(hay | tienes | tienen) (terminal | datafono)", "(aceptas | aceptan | acepta) (tarjeta de credito | tarjeta de debito | pago con tarjeta | apple pay)"] },
    hand_over: { patterns: [
      "@hand #h:p_here", "@hand [son] {price} [pesos] [exactos | justos]", "(te doy | te pago con | le doy | le pago con) {price} [pesos]", "(te doy | tengo | traigo) un billete de {price}",
      "@hand (el dinero | tu dinero | los pesos)", "listo @hand", "ya regresé @hand", "ya volvi @hand",
    ] },
    no_cash: { patterns: ["no (tengo | traigo | llevo | cargo) (efectivo | dinero | pesos | cash | nada de efectivo)", "(solo | nomas | nada mas) (tengo | traigo) tarjeta", "no me alcanza [el efectivo]"] },
    ask_atm: { patterns: ["(donde | por donde) (hay | esta | queda) (un | el)? cajero #h:p_atm", "(hay | sabes si hay) (un)? cajero (cerca | por aqui)", "(donde | en donde) (puedo | se puede) sacar dinero", "necesito (sacar dinero | un cajero)"] },
    atm_go: { patterns: ["(voy | ahorita voy | voy rapido | ya voy) (al | a un) cajero", "(voy | ahorita voy) (por | a sacar) (dinero | efectivo)", "(ahorita | ya | enseguida) (regreso | vuelvo)", "(esperame | me esperas) [un momento | tantito] [voy al cajero]"] },
    back_ctx: { patterns: ["ya (regresé | volvi | estoy aqui | estoy de vuelta | llegué)", "(aqui | ya) estoy [de vuelta]", "ya (tengo | traigo) (el)? (efectivo | dinero)"] },

    // --- questions about the rental, the sea and the place -----------------------------------------
    ask_price: { patterns: [
      "cuanto (cuesta | es | sale | cobras | cobran | cobra | vale) [la hora | por hora | rentar | alquilar] [{gear}] #h:q_price",
      "cuanto (cuesta | es | sale | cobras) (la renta | el alquiler | rentar | alquilar) (de)? {gear}", "(que precio tiene | cual es el precio de | a como sale | a como esta) {gear}",
      "(cual es el precio | que precio tiene | los precios | precios)", "cuanto (cuesta | es | sale) [la] (hora | por hora | una hora)", "cuanto (cuesta | sale | es) {gear} (por hora | la hora)",
      "cuanto (es | seria | sale) (en total | todo | por todo)", "(es | esta) (muy | un poco)? (caro | cara | barato | barata)", "cuanto (cobras | cobran | cobra | es | sale) (por | por una | por un | por el | por la) {gear} [por hora | la hora]", "(y)? {gear} (cuanto | cuanto cuesta | cuanto sale)",
    ] },
    ask_lesson_price: { patterns: ["cuanto (cuesta | es | sale | cobras | cobran | vale) (la clase | una clase | las clases) [de surf]", "(precio | cual es el precio) de (la clase | las clases)", "(y)? (la clase | una clase) (cuanto | cuanto cuesta | cuanto sale)", "cuanto dura (la clase | una clase)"] },
    ask_included: { patterns: [
      "que (incluye | trae | lleva | viene con | va con | me das con) [{gear} | la clase | la renta | el precio] #h:q_incl",
      "(incluye | trae | lleva | viene con) [el | la | un | una]? (chaleco | salvavidas | chaleco salvavidas | remo | remos | correa | leash | invento | aletas | lycra | licra | tabla | visor)",
      "(el | la)? (chaleco | remo | correa | lycra | tabla) (esta | va | viene) incluid(o | a)", "(esta | va | viene) incluid(o | a) (el chaleco | el remo | la correa | la lycra | la tabla)",
      "(esta incluido | va incluido | viene incluido) (el chaleco | el remo)", "(me das | me prestas | me presta) (un | el)? (chaleco | remo)",
    ] },
    ask_vest: { patterns: [
      "(es | el chaleco es) obligatorio [el chaleco] #h:q_vest", "(tengo que | hay que | debo) (usar | ponerme | llevar) (el | un)? chaleco", "(necesito | ocupo) (el | un)? chaleco [salvavidas]",
      "(el)? chaleco es obligatorio",
    ] },
    ask_hours: { patterns: [
      "(a que hora | cuando) (abres | abren | abre | abris | cierras | cierran | cierra | cerrais) #h:q_hours", "(hasta que hora | hasta cuando) (estas | estan | abren | abres | rentan | alquilan | esta abierto)",
      "(cual es | que) (el)? horario [tienen | tienes]", "(a que hora | hasta que hora) (es | puedo) (la ultima renta | el ultimo alquiler | rentar | alquilar)", "(cual es)? (su | tu)? horario",
      "(estas | estan | abres | abren) (todos los dias | manana | el domingo | los domingos)",
    ] },
    ask_current: { patterns: [
      "(hay | hace | tiene) (mucha)? corriente [hoy] #h:q_current", "(esta | el mar esta) (tranquilo | picado | agitado | bravo) [el mar] [hoy]", "(es | esta) (seguro | peligroso) [aqui | el mar | hoy | nadar]",
      "(hay | es de) peligro", "(como esta | que tal esta) el mar [hoy]",
    ] },
    ask_reef: { patterns: [
      "(donde | por donde) (esta | queda | hay) (el | un)? arrecife #h:q_reef", "(donde | a donde) (puedo | se puede | me recomiendas) (hacer snorkel | snorkelear | ir a snorkelear | ver peces)",
      "(hay | se ven) (peces | tortugas | coral | corales)", "(esta | queda) (lejos | cerca) el arrecife", "(donde | a donde) (voy | vamos | puedo ir) con (el kayak | el paddle | el snorkel)",
      "(hasta | a) donde (puedo ir | puedo llegar | se puede ir)",
    ] },
    ask_late: { patterns: [
      "(y si | que pasa si) (llego | regreso | vuelvo | me tardo | me paso) [un poco | un poquito] (tarde | mas tarde | de la hora | de tiempo) #h:q_late", "(y si | que pasa si) me tardo [mas]",
      "(cobras | cobran) (extra | mas) si (llego | regreso | vuelvo) tarde", "(hay | tienen | dan | das) (tolerancia | tiempo de tolerancia | minutos de tolerancia)",
    ] },
    ask_waves: { patterns: [
      "(como | que tal) (estan | son | vienen) las olas [hoy] #h:q_waves", "(hay | tienes | tienen) (olas | buenas olas) [hoy]", "(que tan grandes | de que tamano) (son | estan) las olas [hoy]",
      "(que dice | que significa) (el pizarron | la pizarra | el letrero)", "(las olas)? (son | estan) (grandes | buenas | altas) [hoy] [las olas]", "(como esta | que tal esta) el (surf | swell) [hoy]",
    ] },
    ask_big: { patterns: [
      "(hay | aqui hay | tienen) olas (grandes | de verdad | fuertes | mas grandes)", "(donde | a donde) (hay | puedo encontrar | encuentro) (olas grandes | buenas olas | mejores olas | olas de verdad)",
      "(se ponen | son) (mas)? grandes [las olas]", "(las olas)? (son | estan) (muy)? (chiquitas | pequenas | chicas)", "(donde | a donde) (puedo | se puede) surfear (de verdad | olas grandes)",
    ] },
    ask_hard: { patterns: ["(es | esta) (dificil | muy dificil | complicado | facil) [aprender]", "(cuesta | cuesta mucho) (aprender | trabajo)", "(voy a poder | podre | puedo aprender) [en una hora]", "(es)? (dificil | facil) pararse"] },
    ask_deep: { patterns: ["(esta | es) (hondo | profundo | muy hondo | muy profundo) [el agua | ahi]", "(que tan | cuanta) (hondo | profundo | profundidad | agua) [hay | es | esta]", "(toco | se toca | alcanzo) (el)? (fondo | piso)", "(cubre | me cubre) [mucho | el agua]"] },
    ask_fall: { patterns: ["(y si | que pasa si) me caigo #h:lq_fall", "(y si | que pasa si) me caigo de la tabla", "(me voy a caer | me puedo caer) [mucho]", "(y)? cuando me caiga (que hago)?", "(que hago | que tengo que hacer) si me caigo"] },
    ask_sharks: { patterns: ["(hay | se ven | han visto) (tiburones | tiburon | animales peligrosos) [aqui] #h:lq_sharks", "(hay | se ven) (medusas | aguamalas | aguas malas)", "(me puede | me va a) (morder | picar) algo"] },
    swim: { patterns: ["no se nadar [bien | muy bien | mucho]", "(nado | yo nado) (mal | muy mal | poco | regular)", "(necesito | tengo que | hay que) saber nadar", "no nado (bien | muy bien)"] },
    ask_from: { patterns: ["(de donde | tu de donde | y tu de donde | usted de donde) (eres | es)", "(eres | tu eres | usted es) de aqui", "(donde | como) aprendiste [a surfear | surf]", "(eres | tu eres) (mexicana | de mexico)"] },
    ask_name: { patterns: ["como te llamas", "(cual es | como es) tu nombre", "(eres | tu eres) (la)? instructora"] },

    // --- the lesson -----------------------------------------------------------------------------
    lesson_yes_ctx: { patterns: ["(si)? (me animo | va | vamos | claro | dale | la tomo | la quiero | perfecto | orale | sale | vale | de una | por supuesto) [me animo]", "(si)? (quiero | tomo) la clase", "(si)? (me apunto | me anoto)"] },
    brief_ok_ctx: { patterns: ["(si)? todo claro #h:fl_clear", "si te sigo #h:lq_ok", "(si)? (entendido | entiendo | claro | te sigo | si te sigo | todo claro | listo | lista | perfecto | va | de acuerdo | vale | ok | entendi | ya entendi) [te sigo]", "(si)? (todo | todo bien | muy claro)"] },
    no_more_ctx: { patterns: ["(no)? ninguna [pregunta] [gracias] #h:rd_none", "(si)? vamos al agua #h:rd_go", "(no)? (ninguna | ninguna pregunta | nada | todo claro | todo bien | nada mas) [gracias]", "(no)? (estoy | ya estoy) (listo | lista) [vamos]", "(no)? (listo | lista) vamos", "(no)? (ya)? (vamos | al agua)"] },
    one_q_ctx: { patterns: ["(si)? (una | tengo una | una pregunta | tengo una pregunta | tengo una duda | una duda)"] },

    // --- Puerto Escondido ------------------------------------------------------------------------
    pe_when: { patterns: [
      "(cual es | cuando es) la (mejor)? (epoca | temporada) [para ir | para surfear] [alla | en puerto escondido] #h:pe_when", "(cuando | en que meses | en que epoca) (es mejor ir | conviene ir | hay olas | hay mas olas | es mejor) [alla | a puerto escondido]",
      "cuando (voy | me recomiendas ir | es mejor ir) [a puerto escondido | alla]", "(que | cual) (temporada | epoca) (es mejor | me recomiendas)",
    ] },
    pe_where: { patterns: [
      "(que | cual) playa (me recomiendas | recomiendas | es mejor) [alla | para mi] #h:pe_where", "(donde | en que playa) (surfeo | puedo surfear | es mejor surfear) [alla | en puerto escondido]",
      "(que es | como es) zicatela", "(y | que tal) (zicatela | la punta)", "(zicatela | la punta) es (para mi | dificil | buena)",
    ] },
    pe_stay: { patterns: ["(donde | en donde) (me quedo | me puedo quedar | me hospedo | duermo | me recomiendas quedarme) [alla | en puerto escondido] #h:pe_stay", "(hay | conoces) (hoteles | hostales | un hotel | un hostal | donde quedarse) [alla | baratos]"] },
    pe_how: { patterns: [
      "(como | por donde) (llego | se llega | voy | puedo ir | puedo llegar) [alla | a puerto escondido] #h:pe_how", "(hay | tiene) (vuelos | aeropuerto) [a puerto escondido | alla]",
      "(cuanto | cuanto tiempo) (se hace | tarda | es | se tarda) (de | desde) oaxaca", "(esta | queda) (lejos | cerca) puerto escondido",
    ] },
    pe_safe: { patterns: ["(es | esta) (peligroso | seguro) (puerto escondido | alla | zicatela) #h:pe_safe", "(puerto escondido | zicatela) es (peligroso | seguro)", "(es | esta) peligroso alla"] },
    been_yes_ctx: { patterns: ["(si)? ya (fui | he ido | estuve | lo conozco | conozco)", "(si)? (fui | estuve | he ido | he estado) (una vez | el ano pasado | hace anos | varias veces | dos veces)", "(si)? lo conozco"] },
    been_no_ctx: { patterns: ["(no)? (nunca | todavia no | aun no) (he ido | fui | lo conozco)", "(no)? (todavia no | aun no | nunca)", "no lo conozco"] },

    // --- the invitation ------------------------------------------------------------------------
    invite_yes_ctx: { patterns: [
      "(vamos | si vamos | claro | me animo | si me animo | va | orale | andale | dale | vale | sale | de una | con gusto | por supuesto | listo | lista) [vamos] #h:iv_yes",
      "(si)? (probemos | probamos | vamos a probar) [una ola]", "si claro #h:iv_sure", "(si)? (vamos | vamonos) al agua", "(si)? (claro que si | obvio)",
    ] },
    invite_no_ctx: { patterns: [
      "(otro dia | mejor otro dia | mejor manana | manana | hoy no | ahorita no | ahora no | en otro momento | luego | despues | la proxima | otra vez sera) [mejor] [gracias] [vale] #h:iv_no",
      "(hoy)? no (puedo | tengo tiempo)", "[hoy no] (estoy | me siento) (cansado | cansada | muy cansado | muy cansada)", "(mejor)? (regreso | vuelvo) (manana | otro dia)",
    ] },
  },

  lines: {
    ...SURF_LINES,
    // --- arriving ----------------------------------------------------------------------------------
    greet: [
      t("¡Hola! | Bienvenid{m:o|f:a} | a | La Ola. | ¿Qué | buscas?", "Hi! | Welcome | to | La Ola. | What | are you looking for?", "Hi! Welcome to La Ola. What are you looking for?",
        { flags: { 3: "La Ola: “the wave”, the palapa's name." } }),
      t("¡Buenas! | ¿Vienes | a | rentar | algo | o | por | una | clase | de | surf?", "Hi there! | You-come | to | rent | something | or | for | a | lesson | of | surfing?", "Hi there! Here to rent something, or for a surf lesson?",
        { flags: { 3: F_RENTAR }, neutral: t("¡Buenas! | ¿Vienes | a | alquilar | algo | o | por | una | clase | de | surf?", "Hi there! | You-come | to | rent | something | or | for | a | lesson | of | surfing?", "Hi there! Here to rent something, or for a surf lesson?"),
          spain: t("¡Hola! | ¿Vienes | a | alquilar | algo | o | a | por | una | clase | de | surf?", "Hi! | You-come | to | rent | something | or | — | for | a | lesson | of | surfing?", "Hi! Here to rent something, or for a surf lesson?",
            { flags: { 6: "ir a por: Spain's “to go for” (something); a por = for." } }) }),
    ],
    what_again: [
      t("¿Entonces? | ¿Algo | para | el | agua | o | una | clase?", "So? | Something | for | the | water | or | a | lesson?", "So? Something for the water, or a lesson?"),
    ],
    what_short: [t("Tú | dime.", "You | tell me.", "Just let me know.")],
    what_rent: [
      t("¿Quieres | rentar | algo, | entonces?", "Do you want | to rent | something, | then?", "Want to rent something, then?",
        { flags: { 1: F_RENTAR }, neutral: t("¿Quieres | alquilar | algo, | entonces?", "Do you want | to rent | something, | then?", "Want to rent something, then?") }),
    ],
    looking_ok: [
      t("Claro, | con | calma. | Los | precios | están | en | el | pizarrón.", "Sure, | with | calm. | The | prices | are | on | the | chalkboard.", "Sure, take your time. The prices are on the chalkboard.",
        { flags: { 8: F_PIZARRON }, neutral: t("Claro, | con | calma. | Los | precios | están | en | la | pizarra.", "Sure, | with | calm. | The | prices | are | on | the | chalkboard.", "Sure, take your time. The prices are on the chalkboard.") }),
    ],

    // --- rental ------------------------------------------------------------------------------------
    gear_ask: [
      t("Tengo | tablas | de | surf, | paddle, | kayak | y | equipo | de | snorkel. | ¿Qué | te | llevas?", "I-have | boards | for | surfing, | paddleboards, | kayak | and | gear | for | snorkeling. | What | (for) yourself | you-take?",
        "I've got surfboards, paddleboards, a kayak and snorkel gear. What'll it be?",
        { spain: t("Tengo | tablas | de | surf, | de | paddle surf, | kayak | y | equipo | de | snorkel. | ¿Qué | te | llevas?", "I-have | boards | for | surfing, | for | paddleboarding, | kayak | and | gear | for | snorkeling. | What | (for) yourself | you-take?",
          "I've got surfboards, paddleboards, a kayak and snorkel gear. What'll it be?") }),
    ],
    gear_which: [t("¿Cuál | te | llevas?", "Which one | (for) yourself | you-take?", "Which one would you like?")],
    price_hour: [
      t("{X.the} | es | {$price} | la | hora.", "{X.the} | is | {$price} | the | hour.", "{X.the} is {$price} an hour."),
    ],
    price_list: [
      t("Por | hora: | la | tabla | de | surf, | {$price}; | el | paddle | o | el | kayak, | {$amount}; | el | snorkel, | {$fare}.", "Per | hour: | the | board | for | surfing, | {$price}; | the | paddleboard | or | the | kayak, | {$amount}; | the | snorkel, | {$fare}.",
        "By the hour: a surfboard is {$price}, a paddleboard or the kayak {$amount}, snorkel gear {$fare}.",
        { spain: t("Por | hora: | la | tabla | de | surf, | {$price}; | el | paddle surf | o | el | kayak, | {$amount}; | el | snorkel, | {$fare}.", "Per | hour: | the | board | for | surfing, | {$price}; | the | paddleboarding | or | the | kayak, | {$amount}; | the | snorkel, | {$fare}.",
          "By the hour: a surfboard is {$price}, a paddleboard or the kayak {$amount}, snorkel gear {$fare}.") }),
    ],
    two_double: [t("Para | dos, | el | kayak | doble: | {$price} | la | hora.", "For | two, | the | kayak | double: | {$price} | the | hour.", "For two, there's the double kayak: {$price} an hour.")],
    hours_ask: [t("¿Por | cuántas | horas?", "For | how many | hours?", "For how many hours?"), t("¿Por | cuánto | tiempo?", "For | how much | time?", "For how long?")],
    hours_reask: [t("¿Una | hora, | dos | o | tres?", "One | hour, | two | or | three?", "One hour, two or three?")],
    hours_whole: [t("Se cobra | por | hora | completa: | ¿una | o | dos?", "It's charged | by | hour | whole: | one | or | two?", "We charge by the full hour: one or two?")],
    hours_max: [t("Lo | máximo | son | tres | horas.", "The | most | is | three | hours.", "Three hours is the most.")],
    hours_help: [t("Casi | todos | empiezan | con | una | hora.", "Almost | everyone | starts | with | one | hour.", "Most people start with an hour.")],
    deposit_ask: [
      t("Me | dejas | una | identificación | o | un | depósito | de | {$deposit}.", "(To) me | you-leave | an | ID | or | a | deposit | of | {$deposit}.", "I'll need an ID or a {$deposit} deposit.",
        { spain: t("Me | dejas | un | documento de identidad | o | una | fianza | de | {$deposit}.", "(To) me | you-leave | an | ID | or | a | deposit | of | {$deposit}.", "I'll need an ID or a {$deposit} deposit.", { flags: { 6: F_FIANZA } }) }),
    ],
    deposit_id_only: [
      t("¿Me | dejas | una | identificación? | Te | la | devuelvo | cuando | regreses.", "(To) me | you-leave | an | ID? | (To) you | it | I-return | when | you-come-back.", "Can you leave me an ID? You'll get it back when you return.",
        { flags: { 5: "la: “it” (la identificación), an object pronoun." }, spain: t("¿Me | dejas | un | documento de identidad? | Te | lo | devuelvo | cuando | vuelvas.", "(To) me | you-leave | an | ID? | (To) you | it | I-return | when | you-come-back.", "Can you leave me an ID? You'll get it back when you return.") }),
    ],
    deposit_one: [
      t("Necesito | una | de | las | dos: | identificación | o | depósito.", "I-need | one | of | the | two: | ID | or | deposit.", "I need one or the other: an ID or the deposit.",
        { spain: t("Necesito | una | de | las | dos | cosas: | documento | o | fianza.", "I-need | one | of | the | two | things: | ID | or | deposit.", "I need one or the other: an ID or the deposit.") }),
    ],
    deposit_which: [t("¿Cuál | prefieres?", "Which one | do you prefer?", "Which would you rather?")],
    no_id_deposit: [
      t("No pasa nada: | me | dejas | un | depósito | de | {$deposit} | y | te | lo | devuelvo | cuando | regreses. | ¿Te | parece?", "No problem: | (to) me | you-leave | a | deposit | of | {$deposit} | and | (to) you | it | I-return | when | you-come-back. | (To) you | does it seem (okay)?",
        "No problem: leave me a {$deposit} deposit and you'll get it back when you return. Okay?",
        { spain: t("No pasa nada: | me | dejas | una | fianza | de | {$deposit} | y | te | la | devuelvo | cuando | vuelvas. | ¿Te | parece?", "No problem: | (to) me | you-leave | a | deposit | of | {$deposit} | and | (to) you | it | I-return | when | you-come-back. | (To) you | does it seem (okay)?",
          "No problem: leave me a {$deposit} deposit and you'll get it back when you return. Okay?", { flags: { 4: F_FIANZA, 9: "la: “it” (la fianza), an object pronoun." } }) }),
    ],
    id_instead: [
      t("Entonces | me | dejas | una | identificación.", "Then | (to) me | you-leave | an | ID.", "Then leave me an ID.",
        { spain: t("Entonces | me | dejas | un | documento de identidad.", "Then | (to) me | you-leave | an | ID.", "Then leave me an ID.") }),
    ],
    id_ok: [
      t("Gracias. | Te | {lo@X} | devuelvo | cuando | regreses.", "Thanks. | (To) you | it | I-return | when | you-come-back.", "Thanks. You'll get it back when you return.",
        { spain: t("Gracias. | Te | {lo@X} | devuelvo | cuando | vuelvas.", "Thanks. | (To) you | it | I-return | when | you-come-back.", "Thanks. You'll get it back when you return.") }),
    ],
    deposit_ok: [
      t("Perfecto: | el | depósito | va | con | la | renta.", "Perfect: | the | deposit | goes | with | the | rental.", "Great: the deposit goes with the rental.",
        { flags: { 6: F_RENTA }, neutral: t("Perfecto: | el | depósito | va | con | el | alquiler.", "Perfect: | the | deposit | goes | with | the | rental.", "Great: the deposit goes with the rental."),
          spain: t("Perfecto: | la | fianza | va | con | el | alquiler.", "Perfect: | the | deposit | goes | with | the | rental.", "Great: the deposit goes with the rental.", { flags: { 2: F_FIANZA } }) }),
    ],
    deposit_info: [
      t("Sí: | una | identificación | o | un | depósito | de | {$deposit}; | te | lo | devuelvo | al | final.", "Yes: | an | ID | or | a | deposit | of | {$deposit}; | (to) you | it | I-return | at the | end.", "Yes: an ID or a {$deposit} deposit; you get it back at the end.",
        { spain: t("Sí: | un | documento de identidad | o | una | fianza | de | {$deposit}; | te | lo | devuelvo | al | final.", "Yes: | an | ID | or | a | deposit | of | {$deposit}; | (to) you | it | I-return | at the | end.", "Yes: an ID or a {$deposit} deposit; you get it back at the end.", { flags: { 5: F_FIANZA } }) }),
    ],
    dep_back: [
      t("Claro, | cuando | regreses | con | el | equipo.", "Sure, | when | you-come-back | with | the | gear.", "Of course, when you bring the gear back.",
        { spain: t("Claro, | cuando | vuelvas | con | el | equipo.", "Sure, | when | you-come-back | with | the | gear.", "Of course, when you bring the gear back.") }),
    ],
    no_deal: [
      t("Lo siento: | sin | identificación | ni | depósito | no puedo | rentarte | nada.", "I'm sorry: | without | ID | or | deposit | I can't | rent-you | anything.", "Sorry: without an ID or a deposit, I can't rent you anything.",
        { flags: { 6: F_RENTAR }, neutral: t("Lo siento: | sin | identificación | ni | depósito | no puedo | alquilarte | nada.", "I'm sorry: | without | ID | or | deposit | I can't | rent-you | anything.", "Sorry: without an ID or a deposit, I can't rent you anything."),
          spain: t("Lo siento: | sin | documento | ni | fianza | no puedo | alquilarte | nada.", "I'm sorry: | without | ID | or | deposit | I can't | rent-you | anything.", "Sorry: without an ID or a deposit, I can't rent you anything.") }),
    ],

    // --- paying ------------------------------------------------------------------------------------
    total_one: [t("Por | una | hora | son | {$total}.", "For | one | hour | it's | {$total}.", "For one hour, that's {$total}.")],
    total_two: [t("Por | dos | horas | son | {$total}.", "For | two | hours | it's | {$total}.", "For two hours, that's {$total}.")],
    total_three: [t("Por | tres | horas | son | {$total}.", "For | three | hours | it's | {$total}.", "For three hours, that's {$total}.")],
    total_dep: [
      t("Con | el | depósito, | son | {$total} | en | total.", "With | the | deposit, | it's | {$total} | in | total.", "With the deposit, that's {$total} altogether.",
        { spain: t("Con | la | fianza, | son | {$total} | en | total.", "With | the | deposit, | it's | {$total} | in | total.", "With the deposit, that's {$total} altogether.") }),
    ],
    total_lesson: [t("Por | la | clase | son | {$total}.", "For | the | lesson | it's | {$total}.", "For the lesson, that's {$total}.")],
    pay_how: [t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?"), t("¿Cómo | vas | a | pagar?", "How | are you going | to | pay?", "How would you like to pay?")],
    pay_again: [t("Son | {$total}, | entonces.", "It's | {$total}, | then.", "So that's {$total}.")],
    pay_confirm: [t("¿Te | cobro?", "(To) you | I-charge?", "Shall I ring you up?")],
    card_yes: [t("Sí, | claro.", "Yes, | of course.", "Sure.")],
    no_signal: [
      t("Uy, | hoy | la | terminal | no tiene | señal | aquí | en | la | playa. | Solo | efectivo.", "Oh, | today | the | card machine | doesn't have | signal | here | on | the | beach. | Only | cash.",
        "Oh no, the card machine has no signal out here on the beach today. Cash only.",
        { flags: { 3: F_TERMINAL }, spain: t("Uy, | hoy | el | datáfono | no tiene | cobertura | aquí | en | la | playa. | Solo | efectivo.", "Oh, | today | the | card machine | doesn't have | coverage | here | on | the | beach. | Only | cash.",
          "Oh no, the card machine has no signal out here on the beach today. Cash only.", { flags: { 3: F_DATAFONO } }) }),
    ],
    no_signal_again: [t("Hoy | solo | efectivo, | lo siento.", "Today | only | cash, | I'm sorry.", "Cash only today, sorry.")],
    atm: [
      t("Hay | un | cajero | en | el | Banco del Puerto, | en | avenida | Juárez, | frente | al | zócalo: | a | cinco | minutos.", "There's | an | ATM | at | the | Banco del Puerto, | on | avenue | Juárez, | across from | the | zócalo: | — | five | minutes.",
        "There's an ATM at Banco del Puerto, on avenida Juárez across from the zócalo: five minutes from here.", { flags: { 11: F_ZOCALO, 12: F_A_AWAY } }),
    ],
    wait_here: [t("Aquí | te | espero.", "Here | (for) you | I-wait.", "I'll wait for you here.")],
    welcome_back: [t("¡Qué | rápido!", "How | fast!", "That was quick!")],
    card_ok: [t("Listo, | pasó.", "Done, | it-went-through.", "Okay, it went through.", { spain: t("Perfecto, | ya está.", "Perfect, | it's done.", "Okay, all done.") })],
    cash_ok: [t("¡Gracias!", "Thanks!", "Thanks!")],
    change: [t("Gracias. | Aquí tienes | tu | cambio.", "Thanks. | Here's | your | change.", "Thanks. Here's your change.")],
    short: [t("Son | {$total}; | te faltan | unos | pesos.", "It's | {$total}; | you're short | a few | pesos.", "It's {$total}; you're a little short.")],
    pay_first: [t("Primero | te | digo | el | total.", "First | (to) you | I-tell | the | total.", "Let me tell you the total first.")],
    paid_already: [t("Ya | está | pagado.", "Already | it-is | paid.", "That's already paid.")],

    // --- handing over ------------------------------------------------------------------------------
    hand_board: [
      t("Aquí tienes | tu | tabla | y | la | correa.", "Here's | your | board | and | the | leash.", "Here's your board and the leash.",
        { flags: { 5: F_CORREA }, spain: t("Aquí tienes | tu | tabla | y | el | invento.", "Here's | your | board | and | the | leash.", "Here's your board and the leash.", { flags: { 5: F_INVENTO } }) }),
    ],
    hand_paddle: [
      t("Aquí tienes | {X.the}, | el | remo | y | el | chaleco.", "Here's | {X.the}, | the | paddle | and | the | life jacket.", "Here's {X.the}, the paddle and the life jacket."),
    ],
    hand_kayak2: [
      t("Aquí tienes | el | kayak, | los | dos | remos | y | los | chalecos.", "Here's | the | kayak, | the | two | paddles | and | the | life jackets.", "Here's the kayak, two paddles and the life jackets."),
    ],
    hand_snorkel: [
      t("Aquí tienes | el | visor, | el | tubo | y | las | aletas.", "Here's | the | mask, | the | snorkel | and | the | fins.", "Here's the mask, the snorkel and the fins.",
        { spain: t("Aquí tienes | las | gafas, | el | tubo | y | las | aletas.", "Here's | the | goggles, | the | snorkel | and | the | fins.", "Here's the mask, the snorkel and the fins.") }),
    ],
    safety_word: [
      t("¡Disfruta! | Y | no pases | de | las | boyas.", "Enjoy! | And | don't go | past | the | buoys.", "Enjoy! And don't go past the buoys."),
      t("¡Que | te | diviertas! | No | te | alejes | de | las | boyas.", "(I hope) | yourself | you-have-fun! | Don't | yourself | go far | from | the | buoys.", "Have fun! Stay close to the buoys.",
        { flags: { 4: "No te alejes: “don't take yourself far”: the te goes before the verb in a “don't”." } }),
    ],

    // --- questions about the rental ----------------------------------------------------------------
    inc_board: [
      t("Con | la | tabla | va | la | correa, | y | un | chaleco | si | lo | quieres.", "With | the | board | goes | the | leash, | and | a | life jacket | if | it | you-want.", "The leash comes with the board, and a life jacket if you want one.",
        { flags: { 5: F_CORREA }, spain: t("Con | la | tabla | va | el | invento, | y | un | chaleco | si | lo | quieres.", "With | the | board | goes | the | leash, | and | a | life jacket | if | it | you-want.", "The leash comes with the board, and a life jacket if you want one.", { flags: { 5: F_INVENTO } }) }),
    ],
    inc_paddle: [t("Incluye | el | remo | y | el | chaleco salvavidas.", "It-includes | the | paddle | and | the | life jacket.", "It comes with the paddle and the life jacket.")],
    inc_snorkel: [
      t("Incluye | el | visor, | el | tubo | y | las | aletas.", "It-includes | the | mask, | the | snorkel | and | the | fins.", "It comes with a mask, a snorkel and fins.",
        { spain: t("Incluye | las | gafas, | el | tubo | y | las | aletas.", "It-includes | the | goggles, | the | snorkel | and | the | fins.", "It comes with a mask, a snorkel and fins.") }),
    ],
    inc_lesson: [t("Incluye | la | tabla | blanda | y | la | lycra.", "It-includes | the | board | soft | and | the | rash guard.", "It includes the soft board and the rash guard.", { flags: { 6: F_LYCRA } })],
    inc_general: [t("El | chaleco | va | incluido | en | todo, | y | el | remo | con | el | paddle | y | el | kayak.", "The | life jacket | goes | included | in | everything, | and | the | paddle | with | the | paddleboard | and | the | kayak.",
      "A life jacket comes with everything, and a paddle with the paddleboard and the kayak.",
      { spain: t("El | chaleco | va | incluido | en | todo, | y | el | remo | con | el | paddle surf | y | el | kayak.", "The | life jacket | goes | included | in | everything, | and | the | paddle | with | the | paddleboarding | and | the | kayak.",
        "A life jacket comes with everything, and a paddle with the paddleboard and the kayak.") })],
    vest: [
      t("En | el | kayak | y | en | el | paddle, | sí: | es | obligatorio, | y | va | incluido.", "On | the | kayak | and | on | the | paddleboard, | yes: | it's | mandatory, | and | it-goes | included.", "On the kayak and the paddleboard, yes: it's mandatory, and it's included.",
        { spain: t("En | el | kayak | y | en | el | paddle surf, | sí: | es | obligatorio, | y | va | incluido.", "On | the | kayak | and | on | the | paddleboarding, | yes: | it's | mandatory, | and | it-goes | included.", "On the kayak and the paddleboard, yes: it's mandatory, and it's included.") }),
    ],
    open_hours: [
      t("Abrimos | a | las | ocho; | la | última | renta | es | a | las | cinco | y | cerramos | a | las | seis.", "We-open | at | the | eight; | the | last | rental | is | at | the | five | and | we-close | at | the | six.",
        "We open at eight; the last rental goes out at five, and we close at six.",
        { flags: { 6: F_RENTA }, neutral: t("Abrimos | a | las | ocho; | el | último | alquiler | es | a | las | cinco | y | cerramos | a | las | seis.", "We-open | at | the | eight; | the | last | rental | is | at | the | five | and | we-close | at | the | six.",
          "We open at eight; the last rental goes out at five, and we close at six.") }),
    ],
    current: [t("Hoy | casi | no hay | corriente; | solo | no pases | de | las | boyas.", "Today | almost | there isn't | current; | just | don't go | past | the | buoys.", "There's hardly any current today; just don't go past the buoys.")],
    safe_here: [t("No, | hoy | está | tranquilo: | casi | no hay | corriente. | Solo | no pases | de | las | boyas.", "No, | today | it's | calm: | almost | there isn't | current. | Just | don't go | past | the | buoys.",
      "No, it's calm today: hardly any current. Just don't go past the buoys.")],
    reef: [
      t("El | arrecife | está | hacia | el | faro, | al | final | de | la | playa: | unos | diez | minutos | remando. | Es | lo | mejor | para | hacer | snorkel.",
        "The | reef | is | toward | the | lighthouse, | at the | end | of | the | beach: | about | ten | minutes | paddling. | It's | the | best | for | doing | snorkeling.",
        "The reef is out toward the lighthouse, at the end of the beach: about ten minutes' paddle. It's the best spot for snorkeling.", { flags: { 1: F_ARRECIFE, 11: "unos before a number: about." } }),
    ],
    late: [
      t("Tienes | diez | minutos | de | tolerancia; | después | se cobra | la | otra | media hora: | {$price}.", "You-have | ten | minutes | of | grace; | after | is charged | the | next | half hour: | {$price}.",
        "You get ten minutes' grace; after that, the next half hour is {$price}.",
        { flags: { 4: F_TOLERANCIA }, spain: t("Tienes | diez | minutos | de | cortesía; | después | se cobra | la | otra | media hora: | {$price}.", "You-have | ten | minutes | of | courtesy; | after | is charged | the | next | half hour: | {$price}.",
          "You get ten minutes' grace; after that, the next half hour is {$price}.") }),
    ],
    waves_today: [t("Hoy | hay | olas | de | un | metro, | marea | baja | y | viento | suave: | perfecto | para | empezar.", "Today | there are | waves | of | one | meter, | tide | low | and | wind | light: | perfect | for | starting.",
      "Today the waves are about a meter, low tide and a light wind: perfect for starting out.")],
    swim: [t("No pasa nada: | con | el | chaleco | flotas. | Y | quédate | cerca | de | la | orilla.", "No problem: | with | the | life jacket | you-float. | And | stay | near | to | the | shore.", "That's okay: you float with the life jacket. And stay close to the shore.")],
    nayeli_from: [t("Soy | de | Puerto Escondido, | en | Oaxaca, | del | lado | del | Pacífico.", "I'm | from | Puerto Escondido, | in | Oaxaca, | on the | side | of the | Pacific.", "I'm from Puerto Escondido, in Oaxaca, on the Pacific side.", { flags: { 2: F_PUERTO } })],
    nayeli_name: [t("Soy | Nayeli, | la | instructora.", "I'm | Nayeli, | the | instructor.", "I'm Nayeli, the instructor.")],
    ok: [t("¡Va!", "Okay!", "Okay!", { flags: { 0: F_VA }, neutral: t("¡Perfecto!", "Perfect!", "Great!"), spain: t("¡Vale!", "Okay!", "Okay!") }), t("Muy | bien.", "Very | good.", "Okay.")],
    ack: [t("¡Perfecto!", "Perfect!", "Great!"), t("Muy | bien.", "Very | good.", "Okay.")],
    no_problem: [t("Sin problema.", "No problem.", "No problem.")],

    // --- the lesson ----------------------------------------------------------------------------
    exp_ask: [
      t("¿Has surfeado | alguna vez?", "Have you surfed | ever?", "Have you ever surfed?",
        { spain: t("¿Has hecho | surf | alguna vez?", "Have you done | surfing | ever?", "Have you ever surfed?") }),
    ],
    exp_none: [t("¡Perfecto! | Las | olas | de | hoy | son | ideales | para | empezar.", "Perfect! | The | waves | of | today | are | ideal | for | starting.", "Perfect! Today's waves are just right for starting out.")],
    exp_some: [t("¡Qué | bien! | Entonces | la | clase | te | sirve | para | repasar.", "How | nice! | Then | the | lesson | (for) you | it-serves | for | reviewing.", "Great! Then the lesson's a good refresher.")],
    lesson_info: [
      t("La | clase | para | principiantes | es | de | una | hora: | {$price}, | con | la | tabla | blanda | y | la | lycra.", "The | lesson | for | beginners | is | of | one | hour: | {$price}, | with | the | board | soft | and | the | rash guard.",
        "The beginner lesson is one hour, {$price}, with the soft board and the rash guard.", { flags: { 15: F_LYCRA } }),
    ],
    lesson_price_again: [t("Son | {$price} | por | una | hora, | con | todo | incluido.", "It's | {$price} | for | one | hour, | with | everything | included.", "It's {$price} for an hour, everything included.")],
    dep_confirm: [
      t("¿Entonces | me | dejas | el | depósito?", "Then | (to) me | you-leave | the | deposit?", "So you'll leave the deposit?",
        { spain: t("¿Entonces | me | dejas | la | fianza?", "Then | (to) me | you-leave | the | deposit?", "So you'll leave the deposit?", { flags: { 4: F_FIANZA } }) }),
    ],
    lesson_q: [t("¿Te animas?", "Are you up for it?", "Are you in?", { flags: { 0: F_TE_ANIMAS } })],
    lesson_yes: [t("¡Eso!", "That's it!", "Awesome!")],
    lesson_declined: [t("Sin problema.", "No problem.", "No problem."), t("Como | quieras.", "As | you-like.", "Whatever you like.")],
    lesson_board_too: [t("La | clase | ya | incluye | la | tabla.", "The | lesson | already | includes | the | board.", "The lesson already includes a board.")],
    lesson_paid: [t("Ponte | la | lycra | y | vamos | a | la | arena.", "Put on | the | rash guard | and | let's go | to | the | sand.", "Put on the rash guard and let's head to the sand.", { flags: { 2: F_LYCRA } })],
    board_1: [
      t("Mira: | esta | es | la | punta | y | esta | es | la | cola; | abajo | están | las | quillas.", "Look: | this | is | the | nose | and | this | is | the | tail; | underneath | are | the | fins.",
        "Look: this is the nose and this is the tail; the fins are underneath.", { flags: { 13: F_QUILLAS } }),
    ],
    board_2: [
      t("La | correa | va | en | el | pie | de | atrás.", "The | leash | goes | on | the | foot | of | behind.", "The leash goes on your back foot.",
        { flags: { 1: F_CORREA }, spain: t("El | invento | va | en | el | pie | de | atrás.", "The | leash | goes | on | the | foot | of | behind.", "The leash goes on your back foot.", { flags: { 1: F_INVENTO } }) }),
    ],
    board_q: [t("¿Me | sigues?", "Me | you-follow?", "With me so far?")],
    paddle_1: [
      t("Para | remar, | te | acuestas | en | la | tabla, | el | pecho | arriba, | y | das | brazadas | largas.", "To | paddle, | yourself | you-lie-down | on | the | board, | the | chest | up, | and | you-give | strokes | long.",
        "To paddle, you lie on the board with your chest up and take long strokes.",
        { spain: t("Para | remar, | te | tumbas | en | la | tabla, | el | pecho | arriba, | y | das | brazadas | largas.", "To | paddle, | yourself | you-lie-down | on | the | board, | the | chest | up, | and | you-give | strokes | long.",
          "To paddle, you lie on the board with your chest up and take long strokes.") }),
    ],
    stand_1: [
      t("Para | pararte: | las | manos | junto | al | pecho | y, | de | un | salto, | los | pies | de | lado.", "To | stand up: | the | hands | next | to the | chest | and, | with | one | jump, | the | feet | on | side.",
        "To stand up: hands next to your chest and, in one jump, feet sideways.",
        { flags: { 1: "pararte: in Latin America pararse = to stand up (in Spain, to stop)." },
          spain: t("Para | levantarte: | las | manos | junto | al | pecho | y, | de | un | salto, | los | pies | de | lado.", "To | get up: | the | hands | next | to the | chest | and, | with | one | jump, | the | feet | on | side.",
            "To stand up: hands next to your chest and, in one jump, feet sideways.") }),
    ],
    stand_2: [t("Las | rodillas | dobladas | y | la | mirada | al | frente, | nunca | a | los | pies.", "The | knees | bent | and | the | gaze | to the | front, | never | at | the | feet.", "Knees bent and eyes forward, never at your feet.",
      { flags: { 0: "Spanish uses the (el, la, los, las) for your own body parts, where English says your." } })],
    moves_q: [t("¿Todo | claro?", "Everything | clear?", "Got it?")],
    safety_1: [t("Si | te | caes, | cae | plano | y | cúbrete | la | cabeza | con | los | brazos.", "If | yourself | you-fall, | fall | flat | and | cover | the | head | with | the | arms.", "If you fall, fall flat and cover your head with your arms.")],
    safety_2: [t("Nunca | sueltes | la | tabla, | y | respeta | a | los | demás | en | el | agua.", "Never | let go of | the | board, | and | respect | — | the | others | in | the | water.", "Never let go of your board, and respect the other people in the water.",
      { flags: { 6: "a before a person who is the object (the personal a): no English word." } })],
    safety_q: [t("¿Alguna | pregunta?", "Any | question?", "Any questions?")],
    safety_more: [t("¿Algo | más?", "Something | more?", "Anything else?"), t("¿Otra | pregunta?", "Another | question?", "Any other questions?")],
    tell_me: [t("A ver, | dime.", "Let's see, | tell me.", "Sure, go ahead.")],
    simple_again: [t("Te | lo | digo | fácil: | la | punta | adelante, | la | cola | atrás.", "(To) you | it | I-say | easy: | the | nose | forward, | the | tail | back.", "Let me put it simply: nose in front, tail behind.")],
    hard: [
      t("Al | principio | cuesta | un | poco, | pero | en | una | hora | casi | todos | se paran.", "At the | beginning | it-costs | a | little, | but | in | one | hour | almost | everyone | stands up.",
        "It's a bit tough at first, but in an hour almost everyone stands up.",
        { spain: t("Al | principio | cuesta | un | poco, | pero | en | una | hora | casi | todos | consiguen | levantarse.", "At the | beginning | it-costs | a | little, | but | in | one | hour | almost | everyone | manage | to get up.",
          "It's a bit tough at first, but in an hour almost everyone stands up.") }),
    ],
    deep: [t("No: | aprendemos | donde | el | agua | te | llega | a | la | cintura.", "No: | we-learn | where | the | water | (to) you | it-reaches | to | the | waist.", "No: we learn where the water comes up to your waist.")],
    fall: [t("¡Te | vas | a | caer, | y | está bien! | Algún | revolcón | es | parte | del | surf.", "Yourself | you're going | to | fall, | and | it's fine! | Some | wipeout | is | part | of the | surf.",
      "You're going to fall, and that's fine! A wipeout or two is part of surfing.", { flags: { 7: F_REVOLCON } })],
    sharks: [t("No, | tranquil{m:o|f:a}: | lo | más | que | vas | a | ver | son | peces | y | alguna | tortuga.", "No, | relax: | the | most | that | you're going | to | see | are | fish | and | some | turtle.",
      "No, don't worry: the most you'll see is fish and maybe a turtle.")],

    // --- the honest talk: the Caribbean and the Pacific ----------------------------------------------
    adv_honest: [
      t("Te | voy | a | ser | honesta: | aquí | en | el | Caribe | las | olas | son | chiquitas, | de | un | metro | si | hay | viento.", "(To) you | I'm going | to | be | honest: | here | in | the | Caribbean | the | waves | are | tiny, | of | one | meter | if | there's | wind.",
        "I'll be honest with you: here in the Caribbean the waves are small, about a meter when it's windy.",
        { flags: { 12: "chiquitas: chicas (small) + -itas, the diminutive: tiny." },
          spain: t("Te | voy | a | ser | sincera: | aquí | en | el | Caribe | las | olas | son | pequeñas, | de | un | metro | si | hay | viento.", "(To) you | I'm going | to | be | honest: | here | in | the | Caribbean | the | waves | are | small, | of | one | meter | if | there's | wind.",
            "I'll be honest with you: here in the Caribbean the waves are small, about a meter when it's windy.") }),
    ],
    adv_pacific: [t("Las | olas | de verdad | están | en | el | Pacífico, | en | Puerto Escondido. | Yo | soy | de | allá.", "The | waves | real | are | in | the | Pacific, | in | Puerto Escondido. | I | am | from | there.",
      "The real waves are on the Pacific, in Puerto Escondido. That's where I'm from.", { flags: { 8: F_PUERTO },
        spain: t("Las | olas | de verdad | están | en | el | Pacífico, | en | Puerto Escondido. | Yo | soy | de | allí.", "The | waves | real | are | in | the | Pacific, | in | Puerto Escondido. | I | am | from | there.",
          "The real waves are on the Pacific, in Puerto Escondido. That's where I'm from.", { flags: { 8: F_PUERTO } }) })],
    small_here: [t("Aquí | no: | un | metro, | cuando | hay | viento. | Para | aprender | es | perfecto.", "Here | no: | one | meter, | when | there's | wind. | For | learning | it's | perfect.", "Not here: about a meter when it's windy. For learning, it's perfect.")],
    adv_no_lesson: [t("Con | tu | nivel | no necesitas | clase.", "With | your | level | you don't need | a lesson.", "At your level, you don't need a lesson.")],
    pe_been_q: [
      t("¿Ya | fuiste?", "Already | you-went?", "Have you been?", { spain: t("¿Has ido | alguna vez?", "Have you gone | ever?", "Have you been?") }),
    ],
    pe_been_yes: [
      t("¡Qué | padre! | Entonces | ya | conoces | Zicatela.", "How | cool! | Then | already | you-know | Zicatela.", "How cool! Then you know Zicatela.",
        { flags: { 1: F_PADRE, 5: F_ZICATELA }, neutral: t("¡Qué | bien! | Entonces | ya | conoces | Zicatela.", "How | nice! | Then | already | you-know | Zicatela.", "Nice! Then you know Zicatela.", { flags: { 5: F_ZICATELA } }) }),
    ],
    pe_been_no: [t("¡Tienes | que | ir! | Es | otro | mundo.", "You-have | to | go! | It's | another | world.", "You have to go! It's another world.")],
    pe_when: [t("De | mayo | a | agosto: | es | cuando | llegan | las | olas | grandes | del | sur.", "From | May | to | August: | it's | when | arrive | the | waves | big | from the | south.", "From May to August: that's when the big swells come in from the south.")],
    pe_where: [
      t("Zicatela | es | para | expertos: | la | llaman | el | Pipeline | mexicano. | Para | un | nivel | intermedio, | La Punta, | que | es | más | tranquila.",
        "Zicatela | is | for | experts: | it | they-call | the | Pipeline | Mexican. | For | a | level | intermediate, | La Punta, | which | is | more | calm.",
        "Zicatela is for experts: they call it the Mexican Pipeline. For an intermediate level, La Punta, which is calmer.", { flags: { 0: F_ZICATELA, 4: "la: “it” (Zicatela, la playa), an object pronoun.", 13: F_PUNTA } }),
    ],
    pe_stay: [t("Quédate | cerca | de | La Punta: | hay | hostales | y | cabañas | frente | al | mar.", "Stay | near | to | La Punta: | there are | hostels | and | cabins | facing | the | sea.", "Stay near La Punta: there are hostels and cabins right on the beach.", { flags: { 3: F_PUNTA } })],
    pe_how: [t("Hay | vuelos | desde | la | Ciudad de México, | o | por | la | carretera | nueva | desde | Oaxaca: | unas | dos | horas | y | media.", "There are | flights | from | — | Mexico City, | or | by | the | highway | new | from | Oaxaca: | about | two | hours | and | a half.",
      "There are flights from Mexico City, or the new highway from Oaxaca: about two and a half hours.", { flags: { 3: "la Ciudad de México: Spanish says “the City of Mexico”, with the article.", 12: "unas before a number: about." } })],
    pe_safe: [t("El | pueblo | es | tranquilo. | El | mar | en | Zicatela, | no: | es | fuerte | y | no es | para | principiantes.", "The | town | is | calm. | The | sea | at | Zicatela, | no: | it's | strong | and | it isn't | for | beginners.",
      "The town is easygoing. The sea at Zicatela isn't: it's powerful, and it's not for beginners.", { flags: { 7: F_ZICATELA } })],

    // --- the invitation ----------------------------------------------------------------------------
    invite: [t("¿Probamos | una | ola?", "We-try | a | wave?", "Shall we try a wave?")],
    invite_again: [t("¿Y? | ¿Probamos | una | ola?", "So? | We-try | a | wave?", "So? Shall we try a wave?")],
    invite_rent: [t("Antes | de | irte, | ¿probamos | una | ola? | La | primera | va | por mi cuenta.", "Before | — | you-go, | we-try | a | wave? | The | first | goes | on me.", "Before you go, shall we try a wave? The first one's on me.")],
    go_lend: [t("¡Vamos! | Te | presto | una | tabla | blanda.", "Let's go! | (To) you | I-lend | a | board | soft.", "Let's go! I'll lend you a soft board.")],
    boards_anytime: [t("Las | tablas | están | en | la | orilla: | vuelve | cuando | quieras.", "The | boards | are | at | the | shore: | come back | whenever | you-want.", "The boards are down by the water: come back anytime.")],
    invite_adv: [t("Pero | hoy, | ¿probamos | una | ola | aquí? | La | primera | va | por mi cuenta.", "But | today, | we-try | a | wave | here? | The | first | goes | on me.", "But today, shall we try a wave here? The first one's on me.")],
    go: [
      t("¡Vamos! | Agarra | tu | tabla | y | al | agua.", "Let's go! | Grab | your | board | and | to the | water.", "Let's go! Grab your board and into the water.",
        { spain: t("¡Vamos! | Coge | tu | tabla | y | al | agua.", "Let's go! | Grab | your | board | and | to the | water.", "Let's go! Grab your board and into the water.") }),
    ],
    another_day: [
      t("¡Va, | otro | día! | Aquí | estoy | todos | los | días.", "Okay, | another | day! | Here | I-am | all | the | days.", "Okay, another day! I'm here every day.",
        { flags: { 0: F_VA }, neutral: t("¡Bueno, | otro | día! | Aquí | estoy | todos | los | días.", "Okay, | another | day! | Here | I-am | all | the | days.", "Okay, another day! I'm here every day."),
          spain: t("¡Vale, | otro | día! | Aquí | estoy | todos | los | días.", "Okay, | another | day! | Here | I-am | all | the | days.", "Okay, another day! I'm here every day.") }),
    ],
    bye: [
      t("¡Nos vemos | en | el | agua!", "See you | in | the | water!", "See you in the water!"),
      t("¡Que | te | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "Take care!"),
    ],
  },

  merges: {
    ...SURF_MERGES,
    "la ola": { reason: "lexical_expression", split: "la → the + ola → wave would translate the palapa's name instead of naming it.", minimal: "The two-word name." },
    "banco del puerto": { reason: "lexical_expression", split: "banco → bank + del → of the + puerto → port would translate the bank's name.", minimal: "One name of three words." },
    "puerto escondido": { reason: "lexical_expression", split: "puerto → port + escondido → hidden would translate a town's name.", minimal: "One name of two words." },
    "la punta": { reason: "lexical_expression", split: "la → the + punta → point would translate the beach's name.", minimal: "One name of two words." },
    "ciudad de méxico": { reason: "lexical_expression", split: "ciudad → city + de → of + méxico → Mexico would translate the capital's name.", minimal: "One name of three words." },
    "alguna vez": { reason: "lexical_expression", split: "alguna → some + vez → time misreads the set phrase: ever.", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth misreads the set phrase: real.", minimal: "Two words." },
    "media hora": { reason: "lexical_expression", split: "media → half + hora → hour: one English noun phrase, half an hour.", minimal: "Two words." },
    "chaleco salvavidas": { reason: "lexical_expression", split: "chaleco → vest + salvavidas → lifesaver: one thing, a life jacket.", minimal: "Two words." },
    "por mi cuenta": { reason: "lexical_expression", split: "por → for + mi → my + cuenta → account misreads the set phrase: on me (I'm paying).", minimal: "Three words." },
    "paddle surf": { reason: "lexical_expression", split: "Spain's name for stand-up paddleboarding, an English loan.", minimal: "Two words of one name." },
    "te faltan": { reason: "grammatical_fusion", split: "te → to you + faltan → are missing: one English verb phrase, you're short.", minimal: "Two words." },
    "te animas": { reason: "grammatical_fusion", split: "te → yourself + animas → you encourage: the reflexive animarse = to be up for it.", minimal: "Pronoun and verb." },
    "has ido": { reason: "grammatical_fusion", split: "has → have + ido → gone: haber + participle, Spain's perfect, one English verb.", minimal: "Auxiliary and participle." },
    "y si": { reason: "lexical_expression", split: "y → and + si → if: the what-if opener, what if.", minimal: "Two words." },
    "has surfeado": { reason: "grammatical_fusion", split: "has → have + surfeado → surfed: haber + participle, one English verb.", minimal: "Auxiliary and participle." },
  },

  domains: {
    // per hour, the lesson and the late half hour; the subtotals; the totals with and without the deposit
    price: () => [...new Set([...Object.values(PRICE), LESSON, LATE])].sort((a, b) => a - b),
    amount: () => [PRICE.paddle],
    fare: () => [PRICE.snorkel],
    deposit: () => [DEPOSIT],
    total: () => {
      const s = new Set<number>([LESSON]);
      for (const p of Object.values(PRICE)) for (const h of HOURS) { s.add(p * h); s.add(p * h + DEPOSIT); }
      return [...s].sort((a, b) => a - b);
    },
  },

  hints: {
    rent: {
      lt: "Rent something", slot: "gear", examples: ["board", "paddle", "kayak", "snorkel"],
      items: [
        { id: "r_want", s: t("Quiero | rentar | {X.np}.", "I want | to rent | {X.np}.", "I'd like to rent {X.np}.",
          { flags: { 1: F_RENTAR }, neutral: t("Quiero | alquilar | {X.np}.", "I want | to rent | {X.np}.", "I'd like to rent {X.np}.") }) },
        { id: "r_me", s: t("¿Me | rentas | {X.np}?", "(To) me | you-rent | {X.np}?", "Can I rent {X.np}?",
          { flags: { 1: F_RENTAR }, neutral: t("¿Me | alquilas | {X.np}?", "(To) me | you-rent | {X.np}?", "Can I rent {X.np}?") }) },
        { id: "r_take", s: t("Me llevo | {X.np}.", "I'll take | {X.np}.", "I'll take {X.np}.") },
        { id: "r_please", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "r_hours", s: t("{X.np} | por | dos | horas, | por favor.", "{X.np} | for | two | hours, | please.", "{X.np} for two hours, please.") },
      ],
    },
    lesson: {
      lt: "Ask for a surf lesson",
      items: [
        { id: "l_want", s: t("Quiero | una | clase | de | surf.", "I want | a | lesson | of | surfing.", "I'd like a surf lesson.") },
        { id: "l_learn", s: t("Quiero | aprender | a | surfear.", "I want | to learn | to | surf.", "I want to learn to surf.",
          { spain: t("Quiero | aprender | a | hacer | surf.", "I want | to learn | to | do | surfing.", "I want to learn to surf.") }) },
        { id: "s_yes", s: t("Ya | surfeo.", "Already | I-surf.", "I already surf.", { spain: t("Ya | hago | surf.", "Already | I-do | surfing.", "I already surf.") }) },
      ],
    },
    // "¿Has surfeado alguna vez?": answers to her question, not a request for the lesson again
    exp: {
      lt: "Say whether you've surfed before",
      items: [
        { id: "l_first", s: t("Es | mi | primera | vez.", "It's | my | first | time.", "It's my first time.") },
        { id: "ex_never", s: t("No, | nunca.", "No, | never.", "No, never.") },
        { id: "l_some", s: t("Surfeé | un | par | de | veces.", "I-surfed | a | couple | of | times.", "I've surfed a couple of times.",
          { spain: t("He hecho | surf | un | par | de | veces.", "I've done | surfing | a | couple | of | times.", "I've surfed a couple of times.") }) },
      ],
    },
    ask: {
      lt: "Ask about prices and the sea",
      items: [
        { id: "q_price", s: t("¿Cuánto | cuesta | la | hora?", "How much | does it cost | the | hour?", "How much is it per hour?") },
        { id: "q_incl", s: t("¿Qué | incluye?", "What | does it include?", "What's included?") },
        { id: "q_vest", s: t("¿Es | obligatorio | el | chaleco?", "Is it | mandatory | the | life jacket?", "Do I have to wear a life jacket?") },
        { id: "q_hours", s: t("¿A | qué | hora | cierras?", "At | what | time | do you close?", "What time do you close?") },
        { id: "q_current", s: t("¿Hay | corriente?", "Is there | current?", "Is there a current?") },
        { id: "q_reef", s: t("¿Dónde | está | el | arrecife?", "Where | is | the | reef?", "Where's the reef?", { flags: { 3: F_ARRECIFE } }) },
        { id: "q_late", s: t("¿Y si | regreso | tarde?", "And if | I-come-back | late?", "What if I come back late?",
          { spain: t("¿Y si | vuelvo | tarde?", "And if | I-come-back | late?", "What if I come back late?") }) },
        { id: "q_waves", s: t("¿Cómo | están | las | olas?", "How | are | the | waves?", "How are the waves?") },
      ],
    },
    hours: {
      lt: "Say for how long",
      items: [
        { id: "h_n", s: t("Por | dos | horas.", "For | two | hours.", "For two hours.") },
        { id: "h_one", s: t("Solo | una | hora.", "Just | one | hour.", "Just one hour.") },
      ],
    },
    deposit: {
      lt: "Leave an ID or a deposit",
      items: [
        { id: "dp_id", s: t("Aquí tienes | mi | pasaporte.", "Here's | my | passport.", "Here's my passport.") },
        { id: "dp_dep", s: t("Te | dejo | el | depósito.", "(To) you | I-leave | the | deposit.", "I'll leave the deposit.",
          { spain: t("Te | dejo | la | fianza.", "(To) you | I-leave | the | deposit.", "I'll leave the deposit.", { flags: { 3: F_FIANZA } }) }) },
        { id: "dp_noid", s: t("No traigo | identificación.", "I don't have | ID.", "I don't have any ID on me.",
          { spain: t("No llevo | documentación.", "I don't carry | ID.", "I don't have any ID on me.") }) },
        { id: "dp_back", s: t("¿Me lo | devuelves | después?", "It to me | you-return | after?", "Do I get it back afterward?") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "p_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "p_card", s: t("Con | tarjeta.", "With | card.", "By card.") },
        { id: "p_askcard", s: t("¿Aceptas | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "p_here", s: t("Aquí tienes.", "Here you go.", "Here you go.") },
        { id: "p_atm", s: t("¿Dónde | hay | un | cajero?", "Where | is there | an | ATM?", "Where's an ATM?") },
      ],
    },
    // after her "Sí, claro." to "¿Aceptas tarjeta?": the card, not the question again (owner, 16 Nov 2026)
    paycard: {
      lt: "Pay by card",
      items: [
        { id: "pc_ok", s: t("Perfecto, | con | tarjeta.", "Perfect, | with | card.", "Great, by card then.") },
        { id: "pc_then", s: t("Pago | con | tarjeta, | entonces.", "I-pay | with | card, | then.", "I'll pay by card, then.") },
        { id: "pc_here", s: t("Aquí tienes | la | tarjeta.", "Here you have | the | card.", "Here's my card.") },
        { id: "pc_cash", s: t("Mejor | en efectivo.", "Better | in cash.", "Actually, cash.") },
      ],
    },
    lessonq: {
      lt: "Ask about the lesson",
      items: [
        { id: "lq_hard", s: t("¿Es | difícil?", "Is it | hard?", "Is it hard?") },
        { id: "lq_deep", s: t("¿Está | hondo?", "Is it | deep?", "Is it deep?", { spain: t("¿Cubre | mucho?", "Does it cover | much?", "Is it deep?") }) },
        { id: "lq_fall", s: t("¿Y si | me | caigo?", "And if | myself | I-fall?", "What if I fall?") },
        { id: "lq_sharks", s: t("¿Hay | tiburones?", "Are there | sharks?", "Are there sharks?") },
        { id: "lq_swim", s: t("No sé | nadar | muy | bien.", "I don't know | to swim | very | well.", "I'm not a very good swimmer.") },
      ],
    },
    // "¿Me sigues?" / "¿Todo claro?"
    follow: {
      lt: "Say you're following",
      items: [
        { id: "lq_ok", s: t("Sí, | te | sigo.", "Yes, | you | I-follow.", "Yes, I'm with you.") },
        { id: "fl_clear", s: t("Sí, | todo | claro.", "Yes, | everything | clear.", "Yes, got it.") },
      ],
    },
    // "¿Alguna pregunta?": none, and into the water
    ready: {
      lt: "Say you're ready to go in",
      items: [
        { id: "rd_none", s: t("No, | ninguna.", "No, | none.", "No, none.") },
        { id: "rd_go", s: t("¡Vamos | al | agua!", "Let's go | to the | water!", "Let's get in the water!") },
      ],
    },
    pe: {
      lt: "Ask about Puerto Escondido",
      items: [
        { id: "pe_when", s: t("¿Cuál | es | la | mejor | época?", "Which | is | the | best | season?", "When's the best time to go?") },
        { id: "pe_where", s: t("¿Qué | playa | me | recomiendas?", "What | beach | (to) me | you-recommend?", "Which beach do you recommend?") },
        { id: "pe_stay", s: t("¿Dónde | me | quedo?", "Where | myself | I-stay?", "Where should I stay?") },
        { id: "pe_how", s: t("¿Cómo | llego | allá?", "How | I-get | there?", "How do I get there?", { spain: t("¿Cómo | llego | allí?", "How | I-get | there?", "How do I get there?") }) },
        { id: "pe_safe", s: t("¿Es | peligroso | allá?", "Is it | dangerous | there?", "Is it dangerous there?", { spain: t("¿Es | peligroso | allí?", "Is it | dangerous | there?", "Is it dangerous there?") }) },
      ],
    },
    go: {
      lt: "Say yes, or not today",
      items: [
        { id: "iv_yes", s: t("¡Sí, | vamos!", "Yes, | let's go!", "Yes, let's go!") },
        { id: "iv_sure", s: t("Sí, | claro.", "Yes, | of course.", "Sure.") },
        { id: "iv_no", s: t("Mejor | otro | día.", "Better | another | day.", "Maybe another day.") },
      ],
    },
  },

  tips: {},

  // -------------------------------------------------------------------------

  mission: [
    { step: "what", lt: "Say what you're looking for" },
    { lt: "Choose the gear or the lesson", done: (c) => !!(c.s.gear || c.s.lessonOk || c.s.advanced) },
    { lt: "Pay", done: (c) => !!(c.s.rentPaid || c.s.lessonPaid), when: (c) => !c.s.advanced || !!c.s.gear, optional: true },
    { lt: "Answer: shall we try a wave?", done: (c) => c.s.invited !== undefined, when: (c) => !!(c.s.lessonOk || c.s.advanced), optional: true },
  ],

  steps: [
    { id: "what", done: (c) => !!(c.s.wantRent || c.s.wantLesson || c.s.advanced),
      ask: (c) => { c.s.whatN = ((c.s.whatN as number) ?? 0) + 1; c.say(c.s.lessonNo ? "what_rent" : c.s.whatN > 1 ? "what_short" : "what_again"); },
      expects: ["want_rent", "want_lesson", "surf_yes", "surf_none", "surf_some", "just_looking", "ask_price", "ask_lesson_price", "ask_waves", "ask_big", "two_people"],
      suggest: [{ lt: "Rent something", hint: "rent", options: GEAR_IDS }, { lt: "Ask for a surf lesson", hint: "lesson" }, { lt: "Ask about prices and the sea", hint: "ask" }],
      yes: (c) => { if (c.s.lessonNo) { c.s.wantRent = true; return; } c.say("what_again"); c.hold(); },
      no: (c) => { c.say("looking_ok"); c.hold(); },
      help: (c) => { c.say("price_list", { price: PRICE.board, amount: PRICE.paddle, fare: PRICE.snorkel }); } },
    { id: "gear", when: (c) => !!c.s.wantRent, done: (c) => !!c.s.gear,
      ask: (c) => c.say(c.s.gearAsked ? "gear_which" : "gear_ask"),
      expects: ["want_rent", "ask_price", "ask_included", "two_people", "gear_no"],
      suggest: [{ lt: "Choose what to rent", hint: "rent", options: GEAR_IDS }, { lt: "Ask about prices and the sea", hint: "ask" }],
      yes: (c) => { c.s.gearAsked = true; c.say("gear_which"); c.hold(); },
      no: (c) => { c.s.gearAsked = true; c.say("gear_which"); c.hold(); },
      help: (c) => { c.say("price_list", { price: PRICE.board, amount: PRICE.paddle, fare: PRICE.snorkel }); } },
    { id: "hours", when: (c) => !!c.s.wantRent && !!c.s.gear, done: (c) => !!c.s.hours,
      ask: (c) => { c.say(c.s.hoursAsked ? "hours_reask" : "hours_ask"); c.s.hoursAsked = true; },
      expects: ["hours", "hours_ctx", "hours_half_ctx", "hours_long_ctx", "want_rent", "ask_price", "ask_late", "ask_hours"],
      suggest: [{ lt: "Say for how long", hint: "hours" }],
      yes: (c) => { c.say("hours_reask"); c.hold(); },
      no: (c) => { c.say("hours_reask"); c.hold(); },
      help: (c) => { c.say("hours_help"); } },
    { id: "deposit", when: (c) => !!c.s.wantRent && !!c.s.gear && !!c.s.hours, done: (c) => !!c.s.depositDone,
      ask: (c) => {
        if (c.s.depAsked) { c.say(c.s.idFirst ? "id_instead" : "deposit_which"); return; }
        c.s.depAsked = true; c.say(c.s.idFirst ? "deposit_id_only" : "deposit_ask", { deposit: DEPOSIT });
      },
      expects: ["id_give", "dep_give", "no_id", "no_id_ctx", "no_dep", "ask_deposit", "dep_back_q", "hand_over"],
      suggest: [{ lt: "Leave an ID or a deposit", hint: "deposit" }],
      // "Sí" to "¿Me dejas una identificación?" is no ID in her hand yet
      yes: (c) => { c.say(c.s.idFirst ? "id_instead" : "deposit_which"); c.hold(); },
      // after the deposit was offered, a no refuses it; at "¿Me dejas una identificación?", it's no ID
      no: (c) => {
        if (c.s.depOffered) { c.s.noDep = true; refuseBoth(c); return; }
        if (c.s.idFirst) { surf.handlers.no_id(c, {}, seg0("no_id")); return; }
        refuseBoth(c);
      } },
    { id: "rent_pay", when: (c) => !!c.s.wantRent && !!c.s.depositDone, done: (c) => !!c.s.rentPaid,
      ask: (c) => askPay(c, "rent"),
      expects: ["pay_cash", "pay_card", "ask_card", "hand_over", "no_cash", "ask_atm", "atm_go", "back_ctx", "ask_price"],
      suggest: paySuggest,
      yes: (c) => payYes(c), no: (c) => { c.say("pay_how"); c.hold(); } },
    { id: "experience", when: (c) => !!c.s.wantLesson && !c.s.advanced, done: (c) => c.s.exp !== undefined,
      ask: (c) => c.say("exp_ask"),
      expects: ["surf_none", "surf_none_ctx", "surf_some", "surf_yes"],
      suggest: [{ lt: "Say whether you've surfed before", hint: "exp" }],
      yes: (c) => { c.s.exp = "some"; c.say("exp_some"); },
      no: (c) => { c.s.exp = "none"; c.say("exp_none"); } },
    { id: "lesson_offer", when: (c) => !!c.s.wantLesson && !c.s.advanced && c.s.exp !== undefined, done: (c) => !!c.s.lessonOk,
      ask: (c) => {
        if (!c.s.lessonPriceSaid) { c.s.lessonPriceSaid = true; c.say("lesson_info", { price: LESSON }); }
        c.say("lesson_q");
      },
      expects: ["lesson_yes_ctx", "want_lesson", "lesson_no", "invite_no_ctx", "ask_lesson_price", "ask_included", "ask_hard", "ask_deep", "ask_fall", "ask_sharks", "swim"],
      suggest: [{ lt: "Say yes, or not today", hint: "go" }, { lt: "Ask about the lesson", hint: "lessonq" }],
      yes: (c) => { if (politeClosing(c)) { c.say("lesson_q"); c.hold(); return; } takeLesson(c); },
      no: (c) => declineLesson(c) },
    { id: "lesson_pay", when: (c) => !!c.s.lessonOk, done: (c) => !!c.s.lessonPaid,
      ask: (c) => askPay(c, "lesson"),
      expects: ["pay_cash", "pay_card", "ask_card", "hand_over", "no_cash", "ask_atm", "atm_go", "back_ctx", "ask_lesson_price", "ask_price"],
      suggest: paySuggest,
      yes: (c) => payYes(c), no: (c) => { c.say("pay_how"); c.hold(); } },
    { id: "board", when: (c) => !!c.s.lessonPaid, done: (c) => !!c.s.boardDone,
      ask: (c) => { if (!c.s.boardSaid) { c.s.boardSaid = true; c.say("board_1"); c.say("board_2"); } c.say("board_q"); },
      expects: ["brief_ok_ctx", "ask_hard", "ask_deep", "ask_fall", "ask_sharks", "swim", "ask_included"],
      suggest: [{ lt: "Say you're following", hint: "follow" }, { lt: "Ask about the lesson", hint: "lessonq" }],
      yes: (c) => { c.s.boardDone = true; },
      no: (c) => { c.s.boardDone = true; c.say("simple_again"); } },
    { id: "moves", when: (c) => !!c.s.boardDone, done: (c) => !!c.s.movesDone,
      ask: (c) => { if (!c.s.movesSaid) { c.s.movesSaid = true; c.say("paddle_1"); c.say("stand_1"); c.say("stand_2"); } c.say("moves_q"); },
      expects: ["brief_ok_ctx", "ask_hard", "ask_deep", "ask_fall", "ask_sharks", "swim"],
      suggest: [{ lt: "Say you've got it", hint: "follow" }, { lt: "Ask about the lesson", hint: "lessonq" }],
      yes: (c) => { c.s.movesDone = true; },
      no: (c) => { c.s.movesDone = true; c.say("stand_2"); } },
    { id: "safety", when: (c) => !!c.s.movesDone, done: (c) => !!c.s.safetyDone,
      ask: (c) => {
        if (!c.s.safetySaid) { c.s.safetySaid = true; c.say("safety_1"); c.say("safety_2"); c.say("safety_q"); return; }
        c.say("safety_more");
      },
      expects: ["no_more_ctx", "one_q_ctx", "ask_hard", "ask_deep", "ask_fall", "ask_sharks", "swim", "ask_current", "ask_waves"],
      suggest: [{ lt: "Say you're ready to go in", hint: "ready" }, { lt: "Ask about the lesson", hint: "lessonq" }],
      yes: (c) => { c.say("tell_me"); c.hold(); },
      no: (c) => { c.s.safetyDone = true; } },
    { id: "pe_been", when: (c) => !!c.s.advanced && !c.s.peTalked, done: (c) => !!c.s.peTalked,
      ask: (c) => c.say("pe_been_q"),
      expects: ["been_yes_ctx", "been_no_ctx", "pe_when", "pe_where", "pe_stay", "pe_how", "pe_safe"],
      suggest: [{ lt: "Say whether you've been", hint: "g_yesno" }, { lt: "Ask about Puerto Escondido", hint: "pe" }],
      yes: (c) => { c.s.peTalked = true; c.say("pe_been_yes"); },
      no: (c) => { c.s.peTalked = true; c.say("pe_been_no"); } },
    // every way through ends at the wave: after the lesson, after the surfer's talk, and after a rental (owner, 16 Nov 2026:
    // he talked to Nayeli and never found the lesson); not after a lesson said no to
    { id: "invite", when: (c) => !!((c.s.lessonPaid && c.s.safetyDone) || (c.s.advanced && c.s.peTalked && (!c.s.wantRent || c.s.rentPaid)) || renterInvite(c)), done: (c) => c.s.invited !== undefined,
      ask: (c) => {
        if (c.s.inviteAsked) { c.say("invite_again"); return; }
        c.s.inviteAsked = true;
        c.say(c.s.advanced && !c.s.lessonPaid ? "invite_adv" : renterInvite(c) && c.s.gear !== "board" ? "invite_rent" : "invite");
      },
      expects: ["invite_yes_ctx", "invite_no_ctx", "pe_when", "pe_where", "pe_stay", "pe_how", "pe_safe"],
      suggest: [{ lt: "Say yes, or not today", hint: "go" }],
      yes: (c) => { if (politeClosing(c)) { c.say("invite_again"); c.hold(); return; } goSurf(c); },
      no: (c) => notToday(c) },
  ],

  init: (c) => {
    // twists (never on the first visit): the card machine has no signal; she asks for an ID first
    c.s.noSignal = c.visits >= 1 && c.chance(0.35);
    c.s.idFirst = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    c.say("greet");
    c.hold();
  },

  handlers: {
    // --- what the learner wants ------------------------------------------------------------------
    want_rent(c, slots) {
      c.s.wantRent = true;
      const g = slots.gear as string | undefined;
      if (g) chooseGear(c, g);
      else if (c.step === "what" || c.step === null) { c.s.gearAsked = true; c.say("gear_ask"); c.hold(); }
      const n = slots.n as number | undefined;
      if (g && n !== undefined) setHours(c, n);
    },
    gear_no(c, slots) {
      if (c.s.rentPaid) { c.say("ack"); return; }
      if (c.s.gear && c.s.gear === slots.gear) { c.s.gear = undefined; c.s.hours = undefined; }
      c.say("ok");
    },
    want_lesson(c) {
      if (c.s.advanced) { c.say("adv_no_lesson"); return; }
      if (c.s.lessonPaid) { c.say("ack"); return; }
      c.s.wantLesson = true; c.s.lessonNo = false;
      // "Sí, quiero la clase" right after the price: a present yes
      if (c.step === "lesson_offer" && c.s.lessonPriceSaid) takeLesson(c);
      else if (c.s.gear === "board" && !c.s.rentPaid) { c.say("lesson_board_too"); }
    },
    lesson_no(c) { if (c.s.lessonPaid) { c.say("ack"); return; } declineLesson(c); },
    surf_yes(c) {
      c.s.surfer = true;
      // already paid for the lesson: it starts at their level
      if (c.s.lessonOk) { c.say("exp_some"); return; }
      if (c.s.advanced) { c.say("ack"); return; }
      c.s.advanced = true; c.s.wantLesson = false; c.s.exp = "surfer";
      if (c.step === "experience" || c.step === "lesson_offer") c.say("adv_no_lesson");
      honest(c);
    },
    surf_some(c) {
      if (c.s.exp !== undefined) { c.say("ack"); return; }
      c.s.exp = "some";
      if (!c.s.wantLesson && !c.s.wantRent && !c.s.advanced) c.s.wantLesson = true;
      c.say("exp_some");
    },
    surf_none(c) {
      if (c.s.exp !== undefined) { c.say("ack"); return; }
      c.s.exp = "none";
      // "Es mi primera vez" at "¿Qué buscas?": the lesson is offered
      if (!c.s.wantLesson && !c.s.wantRent && !c.s.advanced) c.s.wantLesson = true;
      c.say("exp_none");
    },
    surf_none_ctx(c) { surf.handlers.surf_none(c, {}, seg0("surf_none")); },
    just_looking(c) { c.say("looking_ok"); c.hold(); },

    // --- rental --------------------------------------------------------------------------------
    hours(c, slots) {
      if (!c.s.wantRent || !c.s.gear) { if (c.s.wantLesson) lessonPrice(c); else { c.s.wantRent = true; c.say("gear_ask"); c.hold(); } return; }
      if (c.s.rentPaid) { c.say("paid_already"); return; }
      const n = (slots.n as number | undefined) ?? 1;
      setHours(c, n);
    },
    hours_ctx(c, slots) { surf.handlers.hours(c, { n: (slots.n as number | undefined) ?? 1 }, seg0("hours")); },
    hours_half_ctx(c) { c.say("hours_whole"); c.hold(); },
    hours_long_ctx(c) { c.say("hours_max"); c.say("hours_reask"); c.hold(); },
    id_give(c, slots) {
      if (c.step !== "deposit" || c.s.depositDone) { c.say("ack"); return; }
      c.s.depositDone = true; c.s.doc = (slots.doc as string | undefined) ?? "id";
      c.say("id_ok", { X: c.s.doc });
    },
    dep_give(c) {
      if (c.step !== "deposit" && !c.s.depOffered) { c.say("ack"); return; }
      if (c.s.depositDone) { c.say("ack"); return; }
      c.s.depositDone = true; c.s.deposit = true;
      c.say("deposit_ok");
    },
    no_id(c) {
      if (!c.s.wantRent || c.s.depositDone) { c.say("ack"); return; }
      c.s.noId = true; c.twist("no_id");
      if (c.s.noDep) { refuseBoth(c); return; }
      offerDeposit(c);
    },
    no_id_ctx(c) { surf.handlers.no_id(c, {}, seg0("no_id")); },
    no_dep(c) {
      if (!c.s.wantRent || c.s.depositDone) { c.say("ack"); return; }
      c.s.noDep = true;
      if (c.s.noId) { refuseBoth(c); return; }
      c.say("id_instead"); c.hold();
    },
    ask_deposit(c) { c.s.asked = true; c.say("deposit_info", { deposit: DEPOSIT }); if (c.step === "deposit") c.hold(); },
    dep_back_q(c) { c.s.asked = true; c.say("dep_back"); },
    two_people(c) {
      if (c.s.wantLesson && !c.s.wantRent) { c.say("ack"); return; }
      if (c.s.rentPaid) { c.say("ack"); return; }
      c.s.wantRent = true;
      chooseGear(c, "kayak2", true);
    },

    // --- paying ----------------------------------------------------------------------------------
    pay_cash(c) { method(c, "cash"); },
    pay_card(c) { method(c, "card"); },
    ask_card(c) {
      if (c.s.noSignal) { signalTwist(c); return; }
      c.say("card_yes");
      if (c.step === "rent_pay" || c.step === "lesson_pay") { c.s.cardOk = true; c.s.method = "card"; c.hold(); }
    },
    hand_over(c, slots) {
      // at the deposit: the ID in her hand
      if (c.step === "deposit" && !c.s.depositDone) {
        c.s.depositDone = true; c.s.doc = c.s.doc ?? "id";
        c.say("id_ok", { X: c.s.doc }); return;
      }
      const which = payable(c);
      if (!which) { c.say(c.s.rentPaid || c.s.lessonPaid ? "ack" : "pay_first"); if (!c.s.rentPaid && !c.s.lessonPaid) c.hold(); return; }
      pay(c, which, saysCard(c) ? "card" : (c.s.method === "card" && !/\b(efectivo|billete|pesos)\b/.test(heard(c)) ? "card" : "cash"), slots.price as number | undefined);
    },
    no_cash(c) {
      if (c.s.noSignal || !(c.step === "rent_pay" || c.step === "lesson_pay")) {
        if (c.s.noSignal) c.twist("no_signal");
        c.say("atm"); c.say("wait_here"); c.s.atmSaid = true; c.s.method = undefined;
        if (c.step === "rent_pay" || c.step === "lesson_pay") c.hold();
        return;
      }
      c.s.method = "card"; c.say("card_yes"); c.say("pay_confirm"); c.hold();
    },
    ask_atm(c) { c.s.asked = true; c.s.atmSaid = true; c.say("atm"); },
    atm_go(c) { c.say("wait_here"); c.hold(); },
    back_ctx(c) { c.say("welcome_back"); },

    // --- questions -------------------------------------------------------------------------------
    ask_price(c, slots) {
      c.s.asked = true;
      const g = slots.gear as string | undefined;
      // at the payment: what's owed
      const w = c.step === "rent_pay" ? "rent" : c.step === "lesson_pay" ? "lesson" : undefined;
      if (w && !g) { sayTotal(c, w); c.hold(); return; }
      if (g) { quote(c, g); c.say("price_hour", { X: g, price: PRICE[g] }); return; }
      if (c.s.gear) { c.say("price_hour", { X: c.s.gear, price: gearPrice(c) }); return; }
      if (c.s.wantLesson && !c.s.wantRent) { lessonPrice(c); return; }
      c.say("price_list", { price: PRICE.board, amount: PRICE.paddle, fare: PRICE.snorkel });
    },
    ask_lesson_price(c) {
      c.s.asked = true;
      if (c.step === "lesson_pay") { sayTotal(c, "lesson"); c.hold(); return; }
      lessonPrice(c);
      // asked at "¿Qué buscas?": the lesson is what they're after (nothing is booked: she still asks "¿Te animas?")
      if (c.step === "what" && !c.s.wantRent && !c.s.advanced) c.s.wantLesson = true;
    },
    ask_included(c, slots) {
      c.s.asked = true;
      const g = (slots.gear as string | undefined) ?? (c.s.wantLesson && !c.s.gear ? "lesson" : c.s.gear);
      const h = heard(c);
      if (/\bclase\b/.test(h) || g === "lesson") { c.say("inc_lesson"); return; }
      if (g === "board") c.say("inc_board");
      else if (g === "paddle" || g === "kayak" || g === "kayak2") c.say("inc_paddle");
      else if (g === "snorkel") c.say("inc_snorkel");
      else c.say("inc_general");
    },
    ask_vest(c) { c.s.asked = true; c.say("vest"); },
    ask_hours(c) { c.s.asked = true; c.say("open_hours"); },
    ask_current(c) {
      c.s.asked = true;
      if (peTopic(c) && /\b(peligroso|seguro|peligro)\b/.test(heard(c))) { surf.handlers.pe_safe(c, {}, seg0("pe_safe")); return; }
      c.say(/\b(peligroso|seguro|peligro)\b/.test(heard(c)) ? "safe_here" : "current");
    },
    ask_reef(c) { c.s.asked = true; c.say("reef"); },
    ask_late(c) { c.s.asked = true; c.say("late", { price: LATE }); },
    ask_waves(c) { c.s.asked = true; c.say("waves_today"); },
    ask_big(c) {
      c.s.asked = true;
      c.s.topic = "pe";
      if (!c.s.advanced) c.say("small_here");
      if (!c.s.pacificSaid) { c.s.pacificSaid = true; c.say("adv_pacific"); }
    },
    ask_hard(c) { c.s.asked = true; c.say("hard"); },
    ask_deep(c) { c.s.asked = true; c.say("deep"); },
    ask_fall(c) { c.s.asked = true; c.say("fall"); },
    ask_sharks(c) { c.s.asked = true; c.say("sharks"); },
    swim(c) { c.s.asked = true; c.say("swim"); },
    ask_from(c) { c.s.asked = true; c.s.topic = "pe"; c.say("nayeli_from"); },
    ask_name(c) { c.say("nayeli_name"); },

    // --- the lesson ------------------------------------------------------------------------------
    lesson_yes_ctx(c) { if (c.step === "lesson_offer") takeLesson(c); else c.say("ack"); },
    brief_ok_ctx(c) {
      if (c.step === "board") c.s.boardDone = true;
      else if (c.step === "moves") c.s.movesDone = true;
      else if (c.step === "safety") c.s.safetyDone = true;
    },
    no_more_ctx(c) { if (c.step === "safety") c.s.safetyDone = true; },
    one_q_ctx(c) { c.say("tell_me"); c.hold(); },

    // --- Puerto Escondido --------------------------------------------------------------------------
    pe_when(c) { peAnswer(c, "pe_when"); },
    pe_where(c) { peAnswer(c, "pe_where"); },
    pe_stay(c) { peAnswer(c, "pe_stay"); },
    pe_how(c) { peAnswer(c, "pe_how"); },
    pe_safe(c) { peAnswer(c, "pe_safe"); },
    been_yes_ctx(c) { c.s.peTalked = true; c.say("pe_been_yes"); },
    been_no_ctx(c) { c.s.peTalked = true; c.say("pe_been_no"); },

    // --- the invitation ----------------------------------------------------------------------------
    invite_yes_ctx(c) { if (c.step === "invite") goSurf(c); else if (c.step === "lesson_offer") takeLesson(c); else c.say("ack"); },
    invite_no_ctx(c) { if (c.step === "invite") notToday(c); else if (c.step === "lesson_offer") declineLesson(c); else c.say("ok"); },
  },

  finish: (c) => {
    if (!c.s.done) { c.s.done = true; c.complete(); }
    // the surf game starts: nothing more to say here
    if (c.s.surfing) { c.end(); c.hold(); return; }
    if (!c.s.byeSaid) { c.s.byeSaid = true; if (!c.s.notToday) c.say("bye"); }
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("bye"); cc.end(); },
        // "¿También das clases?" after a rental, "¿Y me rentas un snorkel?" after the lesson: the other half, then the
        // goodbye again (the engine runs finish once: its flag is reset here)
        want_lesson: (cc, sl, sg) => { if (cc.s.lessonOk || cc.s.advanced) return false; reopen(cc); surf.handlers.want_lesson(cc, sl, sg); return true; },
        want_rent: (cc, sl, sg) => { if (cc.s.rentPaid) return false; reopen(cc); surf.handlers.want_rent(cc, sl, sg); return true; },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // what they're looking for
    { say: "Quiero rentar una tabla de surf", intent: "want_rent", slots: { gear: "board" } },
    { say: "Quiero alquilar un kayak", intent: "want_rent", slots: { gear: "kayak" } },
    { say: "¿Me rentas un paddle?", intent: "want_rent", slots: { gear: "paddle" } },
    { say: "Me llevo el equipo de snorkel", intent: "want_rent", slots: { gear: "snorkel" } },
    { say: "Un kayak doble, por favor", intent: "want_rent", slots: { gear: "kayak2" } },
    { say: "Una tabla por dos horas, por favor", intent: "want_rent", slots: { gear: "board", n: 2 } },
    { say: "¿Me renta una tabla?", intent: "want_rent", slots: { gear: "board" } },
    { say: "¿Qué rentan?", intent: "want_rent" },
    { say: "Quiero una clase de surf", intent: "want_lesson" },
    { say: "Quiero aprender a surfear", intent: "want_lesson" },
    { say: "¿Dan clases?", intent: "want_lesson" },
    { say: "Es mi primera vez", intent: "surf_none" },
    { say: "Ya surfeo desde hace años", intent: "surf_yes" },
    { say: "Soy surfista", intent: "surf_yes" },
    { say: "Surfeé un par de veces", intent: "surf_some" },
    { say: "No, nunca he surfeado", intent: "surf_none" },
    { say: "Solo estoy viendo", intent: "just_looking" },
    // Spain forms: alquilar, vale, hacer surf, ponme, la fianza
    { say: "Quiero aprender a hacer surf", intent: "want_lesson" },
    { say: "Ponme una tabla de paddle surf", intent: "want_rent", slots: { gear: "paddle" } },
    { say: "Te dejo la fianza", intent: "dep_give", step: "deposit" },
    { say: "Vale, vamos", intent: "invite_yes_ctx", step: "invite" },
    { say: "Ya hago surf", intent: "surf_yes" },
    // hours, ID, deposit
    { say: "Por dos horas", intent: "hours", slots: { n: 2 } },
    { say: "Solo una hora", intent: "hours" },
    { say: "Tres", intent: "hours_ctx", step: "hours", slots: { n: 3 } },
    { say: "Aquí tienes mi pasaporte", intent: "id_give", step: "deposit", slots: { doc: "passport" } },
    { say: "Te dejo mi licencia", intent: "id_give", step: "deposit", slots: { doc: "license" } },
    { say: "Te dejo el depósito", intent: "dep_give", step: "deposit" },
    { say: "No traigo identificación", intent: "no_id", step: "deposit" },
    { say: "Dejé mi pasaporte en el hotel", intent: "no_id", step: "deposit" },
    { say: "¿Me lo devuelves después?", intent: "dep_back_q" },
    // paying
    { say: "En efectivo", intent: "pay_cash", step: "rent_pay" },
    { say: "Con tarjeta", intent: "pay_card", step: "rent_pay" },
    { say: "¿Aceptas tarjeta?", intent: "ask_card", step: "rent_pay" },
    { say: "Aquí tienes", intent: "hand_over", step: "rent_pay" },
    { say: "¿Dónde hay un cajero?", intent: "ask_atm" },
    { say: "No traigo efectivo", intent: "no_cash", step: "rent_pay" },
    // questions
    { say: "¿Cuánto cuesta la hora?", intent: "ask_price" },
    { say: "¿Cuánto cuesta el kayak?", intent: "ask_price", slots: { gear: "kayak" } },
    { say: "¿Cuánto cuesta la clase?", intent: "ask_lesson_price" },
    { say: "¿Qué incluye?", intent: "ask_included" },
    { say: "¿Incluye el chaleco?", intent: "ask_included" },
    { say: "¿Es obligatorio el chaleco?", intent: "ask_vest" },
    { say: "¿A qué hora cierras?", intent: "ask_hours" },
    { say: "¿Hay corriente?", intent: "ask_current" },
    { say: "¿Dónde está el arrecife?", intent: "ask_reef" },
    { say: "¿Y si regreso tarde?", intent: "ask_late" },
    { say: "¿Cómo están las olas?", intent: "ask_waves" },
    { say: "¿Hay olas grandes?", intent: "ask_big" },
    { say: "¿Es difícil?", intent: "ask_hard" },
    { say: "¿Está hondo?", intent: "ask_deep" },
    { say: "¿Y si me caigo?", intent: "ask_fall" },
    { say: "¿Hay tiburones?", intent: "ask_sharks" },
    { say: "No sé nadar muy bien", intent: "swim" },
    { say: "¿De dónde eres?", intent: "ask_from" },
    { say: "¿Cuál es la mejor época?", intent: "pe_when" },
    { say: "¿Qué playa me recomiendas?", intent: "pe_where" },
    { say: "¿Dónde me quedo?", intent: "pe_stay" },
    { say: "¿Cómo llego allá?", intent: "pe_how" },
    { say: "¿Es peligroso allá?", intent: "pe_safe" },
    { say: "Sí, te sigo", intent: "brief_ok_ctx", step: "board" },
    { say: "Mejor otro día", intent: "invite_no_ctx", step: "invite" },
    { say: "¡Sí, vamos!", intent: "invite_yes_ctx", step: "invite" },
    // usted to her works too
    { say: "¿Me puede rentar un kayak?", intent: "want_rent", slots: { gear: "kayak" } },
    // never flip the meaning
    { say: "No quiero rentar un kayak", intent: "gear_no", not: ["want_rent"] },
    { say: "No quiero una clase", intent: "lesson_no", not: ["want_lesson"] },
    { say: "No traigo identificación", step: "deposit", intent: "no_id", not: ["id_give"] },
    { say: "No quiero dejar el depósito", step: "deposit", intent: "no_dep", not: ["dep_give"] },
    { say: "No tengo tarjeta", step: "rent_pay", intent: "none", not: ["pay_card"] },
    { say: "No traigo efectivo", step: "rent_pay", intent: "no_cash", not: ["pay_cash"] },
    { say: "¿Cuánto es?", step: "rent_pay", intent: "ask_price", not: ["hand_over", "pay_cash"] },
    { say: "¿Aceptas tarjeta?", step: "rent_pay", intent: "ask_card", not: ["pay_card"] },
    { say: "No, nunca he ido", step: "pe_been", intent: "been_no_ctx", not: ["been_yes_ctx"] },
    // not understood
    { say: "Mi perro se llama Max", intent: "none" },
    { say: "tabla banana ventana", intent: "none" },
    { say: "Quiero un taco de pescado", intent: "none" },
  ],

  sims: [
    { name: "a surfboard for two hours, passport, cash", turns: ["¡Hola! Quiero rentar una tabla de surf", "Por dos horas", "Aquí tienes mi pasaporte", "En efectivo", "¡Sí, vamos!"],
      expect: { complete: true, state: { gear: "board", hours: 2, rentPaid: true, doc: "passport", invited: true, surfing: true } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = false; } },
    { name: "a lesson with questions, then the first wave", turns: ["Buenas, ¿cuánto cuesta la clase de surf?", "Quiero una clase", "No, nunca he surfeado", "¿Es difícil?", "Sí, me animo", "Con tarjeta",
      "¿Y si me caigo?", "Sí, te sigo", "¿Está hondo?", "Todo claro", "¿Hay tiburones?", "No, ninguna", "¡Sí, vamos!"],
      expect: { complete: true, state: { lessonPaid: true, invited: true, surfing: true, exp: "none" } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = false; } },
    { name: "a surfer: the Pacific, Puerto Escondido, a wave on the house", turns: ["Hola, ya surfeo desde hace años. ¿Hay olas grandes?", "No, nunca he ido", "¿Cuál es la mejor época?", "¿Qué playa me recomiendas?", "¿Cómo llego allá?", "¿Es peligroso?", "¡Claro, vamos!"],
      expect: { complete: true, state: { advanced: true, surfer: true, invited: true, surfing: true } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = false; } },
    { name: "twist: no signal for the card, the ATM", turns: ["Quiero rentar el kayak", "¿Qué incluye?", "Una hora", "Aquí tienes mi licencia", "Con tarjeta", "No traigo efectivo", "Ya regresé. Aquí tienes", "Hoy no, gracias", "Gracias"],
      expect: { complete: true, state: { gear: "kayak", rentPaid: true, paidWith: "cash", invited: false } }, auto: AUTO, setup: (s) => { s.noSignal = true; s.idFirst = false; } },
    { name: "twist: no ID, the deposit", turns: ["¿Me rentas un equipo de snorkel?", "¿Dónde está el arrecife?", "Dos horas", "No traigo, la dejé en el hotel", "Sí, está bien", "Aquí tienes", "Mejor otro día", "Adiós"],
      expect: { complete: true, state: { gear: "snorkel", deposit: true, rentPaid: true, noId: true } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = true; } },
    { name: "short answers: a lesson, not today", turns: ["Una clase", "Nunca", "Sí", "Efectivo", "Sí", "Sí", "No", "Mañana"],
      expect: { complete: true, state: { lessonPaid: true, invited: false } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = false; } },
    { name: "questions first, rental and lesson in one visit", turns: ["¿A qué hora cierras?", "Solo estoy viendo", "¿Cuánto cuesta el paddle?", "Me llevo el paddle", "¿Es obligatorio el chaleco?", "¿Y si regreso tarde?", "Una hora", "Te dejo el depósito", "¿Aceptas tarjeta?", "Perfecto, con tarjeta", "¿También das clases?", "Surfeé un par de veces", "Sí, la tomo", "Aquí tienes", "Te sigo", "Sí", "No, estoy lista", "Hoy no, gracias", "Gracias"],
      expect: { complete: true, state: { gear: "paddle", rentPaid: true, lessonPaid: true, exp: "some", deposit: true } }, auto: AUTO, setup: (s) => { s.noSignal = false; s.idFirst = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Helpers

/** The gear chosen: its price said once (rule 3), then the hours. */
function chooseGear(c: Ctx, g: string, two = false) {
  if (c.s.rentPaid) { c.say("paid_already"); return; }
  const changed = c.s.gear && c.s.gear !== g;
  c.s.gear = g;
  if (changed) { c.s.rentTotalSaid = false; }
  if (!quoted(c, g)) { quote(c, g); c.say(two ? "two_double" : "price_hour", { X: g, price: PRICE[g] }); }
  if (g === "board" && c.s.wantLesson && !c.s.lessonPaid) c.say("lesson_board_too");
}

/** The gear whose hourly price was said (never twice). */
const quoted = (c: Ctx, g: string) => ((c.s.quoted as string | undefined) ?? "").split(",").includes(g);
const quote = (c: Ctx, g: string) => { if (!quoted(c, g)) c.s.quoted = [c.s.quoted, g].filter(Boolean).join(","); };

function setHours(c: Ctx, n: number) {
  if (!Number.isInteger(n) || n < 1) { c.say("hours_whole"); c.hold(); return; }
  if (n > 3) { c.say("hours_max"); c.say("hours_reask"); c.hold(); return; }
  if (c.s.hours !== n) c.s.rentTotalSaid = false;
  c.s.hours = n;
}

function sayTotal(c: Ctx, which: "rent" | "lesson") {
  if (which === "lesson") { c.s.lessonTotalSaid = true; c.say("total_lesson", { total: LESSON }); return; }
  c.s.rentTotalSaid = true;
  const h = (c.s.hours as number) ?? 1;
  c.say(h === 1 ? "total_one" : h === 2 ? "total_two" : "total_three", { total: rentSub(c) });
  if (c.s.deposit) c.say("total_dep", { total: rentTotal(c) });
}

/** The step's question: the total once, then how to pay (or whether to charge the way already chosen). */
/** A rental paid, no lesson taken or said no to: Nayeli still offers the first wave. */
const renterInvite = (c: Ctx) => !!(c.s.rentPaid && !c.s.lessonOk && !c.s.lessonNo && !c.s.advanced);

/** The payment's suggestions: after her "Sí, claro." to the card question, the card itself. */
function paySuggest(c: Ctx): Suggestion[] {
  return c.s.cardOk ? [{ lt: "Pay by card", hint: "paycard" }] : [{ lt: "Pay", hint: "pay" }];
}

function askPay(c: Ctx, which: "rent" | "lesson") {
  const said = which === "rent" ? c.s.rentTotalSaid : c.s.lessonTotalSaid;
  if (!said) { sayTotal(c, which); c.say(c.s.method ? "pay_confirm" : "pay_how"); return; }
  if (c.s.atmSaid && !c.s.method) { c.say("pay_again", { total: which === "rent" ? rentTotal(c) : LESSON }); return; }
  c.say(c.s.method ? "pay_confirm" : "pay_how");
}

/** A bare yes at the payment: only a way already chosen pays (rule 17). */
function payYes(c: Ctx) {
  const which = payable(c);
  if (which && c.s.method && !politeClosing(c)) { pay(c, which, c.s.method); return; }
  c.say("pay_how"); c.hold();
}

/** Cash or card said: at the payment it pays; before it, it's remembered. */
function method(c: Ctx, m: "cash" | "card") {
  if (m === "card" && c.s.noSignal) { signalTwist(c); return; }
  const which = payable(c);
  if (which) { pay(c, which, m); return; }
  if (c.s.rentPaid && (!c.s.lessonOk || c.s.lessonPaid)) { c.say("paid_already"); return; }
  c.s.method = m; c.say("ok");
}

function signalTwist(c: Ctx) {
  c.twist("no_signal"); c.s.method = undefined;
  if (c.s.signalSaid) { c.say("no_signal_again"); }
  else { c.s.signalSaid = true; c.say("no_signal"); }
  if (c.step === "rent_pay" || c.step === "lesson_pay") c.hold();
}

function pay(c: Ctx, which: "rent" | "lesson", m: "cash" | "card", amt?: number) {
  if (m === "card" && c.s.noSignal) { signalTwist(c); return; }
  const total = which === "rent" ? rentTotal(c) : LESSON;
  if (m === "cash" && amt !== undefined && amt < total) { c.say("short", { total }); c.hold(); return; }
  // the way used is recorded; the next payment (the other half of the visit) asks again
  c.s.method = undefined; c.s.cardOk = false; c.s.paidWith = m;
  c.event("pay", { method: m, amount: total });
  if (m === "card") c.say("card_ok"); else c.say(amt !== undefined && amt > total ? "change" : "cash_ok");
  if (which === "rent") { c.s.rentPaid = true; handOver(c); }
  else { c.s.lessonPaid = true; c.say("lesson_paid"); }
}

/** Paid: the gear, and a word about the buoys. */
function handOver(c: Ctx) {
  const g = c.s.gear as string;
  if (g === "board") c.say("hand_board");
  else if (g === "kayak2") c.say("hand_kayak2");
  else if (g === "snorkel") c.say("hand_snorkel");
  else c.say("hand_paddle", { X: g });
  c.event("give", { item: g });
  // the wave is offered next: her "¡Disfruta! Y no pases de las boyas." comes after the answer
  if (!renterInvite(c)) c.say("safety_word");
}

function offerDeposit(c: Ctx, again = false) {
  c.s.depOffered = true;
  c.say(again ? "dep_confirm" : "no_id_deposit", { deposit: DEPOSIT });
  c.expect({ id: "deposit_offer", expects: ["dep_give", "no_dep", "id_give"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Leave an ID or a deposit", hint: "deposit" }],
    // "Está bien, gracias" could be either: the question again (rule 17)
    yes: (cc) => { if (politeClosing(cc)) { offerDeposit(cc, true); return; } surf.handlers.dep_give(cc, {}, seg0("dep_give")); },
    no: (cc) => { cc.s.noDep = true; refuseBoth(cc); } });
  c.hold();
}

function refuseBoth(c: Ctx) {
  if (!c.s.oneAsked && !(c.s.noId && c.s.noDep)) { c.s.oneAsked = true; c.say("deposit_one"); c.hold(); return; }
  c.say("no_deal"); c.s.wantRent = false; c.end(); c.hold();
}

/** The conversation goes on after its goodbye: finish will run again at the end. */
/** The lesson's price: in full the first time, then short. */
function lessonPrice(c: Ctx) {
  if (c.s.lessonPriceSaid) { c.say("lesson_price_again", { price: LESSON }); return; }
  c.s.lessonPriceSaid = true; c.say("lesson_info", { price: LESSON });
}

function reopen(c: Ctx) { c.s.__finished = false; c.s.byeSaid = false; }

function takeLesson(c: Ctx) {
  if (c.s.lessonOk) return;
  // never a yes to a price not said yet (rule 3)
  if (!c.s.lessonPriceSaid) { c.s.lessonPriceSaid = true; c.say("lesson_info", { price: LESSON }); c.say("lesson_q"); c.hold(); return; }
  c.s.lessonOk = true; c.s.wantLesson = true; c.say("lesson_yes");
}

function declineLesson(c: Ctx) {
  c.s.wantLesson = false; c.s.lessonNo = true; c.s.lessonOk = false;
  c.say("lesson_declined");
  c.say("boards_anytime");
}

/** The honest talk for a surfer: small waves here, the real ones in Puerto Escondido. */
function honest(c: Ctx) {
  c.s.topic = "pe";
  c.say("adv_honest");
  if (!c.s.pacificSaid) { c.s.pacificSaid = true; c.say("adv_pacific"); }
}

function peAnswer(c: Ctx, line: string) {
  c.s.asked = true; c.s.topic = "pe";
  c.say(line);
  if (c.s.advanced) c.s.peTalked = true;
  // "¿Probamos una ola?" is still open: no reminder after every answer about the trip
  if (c.step === "invite") c.hold();
}

function goSurf(c: Ctx) {
  // answered already ("Mejor otro día, ¿vale?" is no yes after the no)
  if (c.s.invited !== undefined) return;
  c.say(renterInvite(c) && c.s.gear !== "board" ? "go_lend" : "go");
  c.s.invited = true; c.s.surfing = true;
  c.event("surf", { level: level(c) });
}

function notToday(c: Ctx) {
  if (c.s.invited !== undefined) return;
  const renter = renterInvite(c);
  c.s.invited = false; c.s.notToday = true; c.s.inviteDone = true;
  // a renter is going out now: no "otro día", the gear and the boards for later
  if (renter) { c.say("lesson_declined"); c.say("boards_anytime"); c.say("safety_word"); return; }
  c.say("another_day");
  c.say("boards_anytime");
}

export default surf;
