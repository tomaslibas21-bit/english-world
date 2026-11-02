// NEEDS: global.ts g_bye[3] "¡Hasta luego! ¡Que le vaya bien!" is usted only ({u:le|t:te} would fit tú NPCs); this file
//   says its own tú goodbye (bye_tu) at the closing. All vocabulary, merges and the kilos tip are local.
// Song 35 "One More Rep" → Puerto Colibrí: "¡Una más!" · Gimnasio Colibrí, a small neighborhood gym. Mónica, a personal
// trainer (tú both ways: Mexican gyms use tú), meets a first-timer at the front desk: the membership (la mensualidad
// $600 a month, or la visita $100 for one day; this month no inscripción, the sign-up fee most Mexican gyms charge;
// no contract, you just stop paying), the ficha (sign-up form) and an ID, cash, card, the phone or a bank transfer, the
// vestidores (locker rooms: bring a candado, they sell them at the front desk; bring a towel for the machines; drinking
// water by the locker rooms), the warm-up (five minutes on the caminadora or the bici), "¿Está libre esta máquina?" /
// "¿Te falta mucho?", "¿Cuántas series hago?" ("Tres series de diez"), "¡Una más!", "¿Me ayudas con la barra?" on
// the press de banca (spotting), "¡Me falta el aire!" ("Descansa y toma agua") and "¿Mañana a la misma hora?".
// Mexico counts weights in kilos (a question in libras gets a short tip: one kilo is about two pounds).
// Keeps the English situation's steps, intents and twists: the leg press (la prensa) is out of order, so they use the
// other one (and ask whether it's free); after the leg press Mónica asks "¡Uy! ¿Estás bien?" and the learner's knee or
// back hurts ("Para ahí. Vamos a probar algo más ligero."). Pain said at any point stops the exercise.
// Rule 10: "No me duele la rodilla" said aloud could be "No, me duele la rodilla"; at "¿Estás bien?" Mónica asks.
// Research (Nov 2026) and what stays vague: small-town gyms in Quintana Roo charge a mensualidad of roughly $400–900
// and a visita of $50–150, often with an inscripción; $600 / $100 and the no-fee month are this gym's (made up). The
// hours (Monday to Saturday 6 a.m.–10 p.m., Sunday mornings), the classes (zumba, spinning, box), no sauna or pool,
// street parking and the wifi password at the desk are invented for the town. Lock prices and towel rental stay vague.

import type { Ctx, EntityDef, Pending, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const MONTHLY = 60000;
const VISIT = 10000;

const PLANS: EntityDef[] = [
  ent("monthly", "mensualidad", "monthly membership", "f", {
    forms: ["mensualidad", "la mensualidad", "una mensualidad", "membresia", "la membresia", "membresia mensual", "la membresia mensual", "mensual", "la mensual",
      "plan mensual", "el plan mensual", "cuota mensual", "abono mensual", "el abono", "suscripcion mensual", "el mes", "un mes", "todo el mes", "pago mensual", "inscripcion mensual"],
    chip: "mensualidad", attrs: { price: MONTHLY } }),
  ent("day_pass", "visita", "day pass", "f", {
    forms: ["visita", "la visita", "una visita", "visita de un dia", "pase de un dia", "un pase de un dia", "pase de dia", "pase diario", "pase por dia", "el pase de un dia",
      "un dia", "un solo dia", "solo un dia", "el dia", "entrada de un dia", "una entrada", "visita sencilla", "pase del dia"],
    chip: "visita", attrs: { price: VISIT } }),
];

const CARDIO: EntityDef[] = [
  ent("treadmill", "caminadora", "treadmill", "f", { forms: ["caminadoras", "la caminadora", "cinta", "la cinta", "cinta de correr", "la cinta de correr", "cinta para correr", "trotadora", "corredora", "banda", "banda de correr", "treadmill"], chip: "caminadora" }),
  ent("bike", "bici", "bike", "f", { forms: ["bicicleta", "la bicicleta", "bicicleta fija", "bicicleta estatica", "bici fija", "bici estatica", "bicis", "bicicletas", "la bici"], chip: "bici" }),
  ent("elliptical", "elíptica", "elliptical", "f", { forms: ["eliptica", "la eliptica", "maquina eliptica", "elipticas", "la maquina eliptica"], chip: "elíptica" }),
];

// The machine for the first strength exercise (the chest machine when the learner's knee or back hurts)
const EXERCISES: EntityDef[] = [
  ent("leg_press", "prensa", "leg press", "f", { forms: ["prensa de piernas", "prensa de pierna", "la prensa"] }),
  ent("chest_press", "máquina | de | pecho", "machine | for | chest", "f", { forms: ["maquina de pecho", "press de pecho"], attrs: { nat: "chest press" } }),
];

// Things Mónica hands over (the world's toast names them from these forms)
const PROPS: EntityDef[] = [
  ent("membership_card", "credencial", "membership card", "f"),
  ent("wristband", "pulsera", "wristband", "f"),
];

const WEEKDAYS: EntityDef[] = [
  ent("monday", "lunes", "Monday", "m"), ent("tuesday", "martes", "Tuesday", "m"), ent("wednesday", "miércoles", "Wednesday", "m"),
  ent("thursday", "jueves", "Thursday", "m"), ent("friday", "viernes", "Friday", "m"), ent("saturday", "sábado", "Saturday", "m"),
  ent("sunday", "domingo", "Sunday", "m"),
];
const DAY_IDS = WEEKDAYS.map((d) => d.id);
const DAY_RE = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|fin de semana|proxima semana|semana que viene)\b/;

// ---------------------------------------------------------------------------
// Flags and helpers

const F_DE_AMOUNT = "de before an amount: Spanish says the price is “of” a sum; English needs no word.";
const F_VISITA = "visita: in a Mexican gym, one visit (a day pass).";
const F_EL_DAY = "el before a weekday = on.";
const F_DUELE = "me duele: Spanish says “the knee hurts me”, with la (the) where English says my.";
const F_ME_FALTA = "me falta: “it's missing to me” = I'm short of.";

const heard = (c: Ctx) => (c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ID_RE = /\b(identificacion|ine|pasaporte|licencia|credencial)\b/;
/** What the learner hands over at the total, when the words say it: "Aquí está mi tarjeta", "Ten, en efectivo". A
 *  way said with "no" or "sin" is not the one handed over ("No tengo tarjeta, aquí tienes" is cash). */
const handedMethod = (c: Ctx): string | undefined => {
  const h = heard(c).replace(/\b(no|sin)\s+(\w+\s+){0,2}(tarjeta|efectivo|billetes?|dinero|cambio)\b/g, " ");
  return /\btarjeta\b/.test(h) ? "card" : /\b(efectivo|billete|dinero|cambio)\b/.test(h) ? "cash" : undefined;
};
/** The two prices said as amounts ("¿Seiscientos?", "¿Cien pesos por un día?"). */
const AMOUNT_RE = /\b(cien|seiscientos|100|600)\b/;
/** A question about a plan ("La mensualidad, ¿qué incluye?", "¿La mensualidad tiene contrato?"): never a choice. */
const PLAN_Q_RE = /\b(incluye|incluyen|incluid[oa]s?|cobran|cobras|inscripcion(?! mensual)|contrato|cancelar|permanencia|plazo|horarios?|descuentos?|promocion(es)?)\b/;
/** "¿Puedo pagar con tarjeta o en efectivo?", "¿Aceptas tarjeta o solo efectivo?": a question about two ways. */
const METHODS = [/\b(tarjeta|debito|credito)\b/, /\befectivo\b/, /\b(celular|telefono|movil|transferencia|apple pay|google pay)\b/];
const bothMethods = (c: Ctx) => { const h = heard(c); return /\bo\b/.test(h) && !/\bno\b/.test(h) && METHODS.filter((r) => r.test(h)).length >= 2; };
/** "Estoy bien, pero me duele un poco la rodilla": the pain piece of the turn answers. */
const painToo = (c: Ctx) => /\bme (duele|duelen|lastime)\b/.test(heard(c)) && !/\bno me (duele|duelen|lastime)\b/.test(heard(c));
const planPrice = (c: Ctx) => (c.s.plan === "monthly" ? MONTHLY : VISIT);
/** The warm-up can start: paid, and the learner has changed (or didn't need to). */
const warmupOpen = (c: Ctx) => !!c.s.paid && !!c.s.changeDone;
const exercise = (c: Ctx) => (c.s.pain ? "chest_press" : "leg_press");
const allTags = (slots: any, seg: { tags: string[] }): string[] => {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
};

// Automatic answers the simulation uses when Mónica asks an optional question (random ones and the twists).
const AUTO: Record<string, string> = {
  lock_q: "Sí, traigo uno.", feel_q: "¡Me siento muy bien!", broken: "¿Está libre la otra?", okay_q: "Me duele la rodilla.", where_hurt: "La rodilla.",
  changing: "¡Ya volví!",
};

// ---------------------------------------------------------------------------

export const gym: SituationDef = {
  id: "s35-gym",
  song: 35,
  songTitle: "One More Rep",
  title: { en: "¡Una más!", lt: "One more!" },
  topic: { en: "En el gimnasio", lt: "At the gym" },
  chapter: 3,
  order: 10,
  location: "gym",
  npc: "jordan",
  goal: "Sign up at the gym and do your first workout with the trainer.",
  intro: "Gimnasio Colibrí, a small neighborhood gym in Puerto Colibrí. It's your first time here. Mónica, a personal trainer, greets you at the front desk. Prices are in Mexican pesos, and weights are in kilos.",
  entities: { plan: PLANS, cardio: CARDIO, exercise: EXERCISES, weekday: WEEKDAYS, prop: PROPS },

  merges: {
    "gimnasio colibrí": { reason: "lexical_expression", split: "The gym's name; gimnasio → gym + colibrí → hummingbird would translate a proper name word by word.", minimal: "Proper name (S-NAME)." },
    "al mes": { reason: "lexical_expression", split: "al → to the + mes → month misreads the rate: a month / per month.", minimal: "Two words; the amount stays separate." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little reads as a noun phrase; the degree adverb = a little.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is a word salad before a number; = about.", minimal: "Three words." },
    "junto a": { reason: "lexical_expression", split: "junto → together + a → to is false; the preposition = next to.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of leaves a stray of; the preposition = before.", minimal: "Two words." },
    "hay que": { reason: "lexical_expression", split: "hay → there is + que → that is false; the impersonal obligation = you have to.", minimal: "Two words." },
    "me quedo con": { reason: "lexical_expression", split: "me → myself + quedo → I stay + con → with is a false literal; quedarse con = to go with, take (a choice).", minimal: "Three words." },
    "me quedo": { reason: "grammatical_fusion", split: "me → myself + quedo → I stay: the reflexive verb quedarse = I'll stay.", minimal: "Pronoun and verb." },
    "te quedas": { reason: "grammatical_fusion", split: "te → yourself + quedas → you stay: the reflexive verb quedarse = will you stay.", minimal: "Pronoun and verb." },
    "me inscribo": { reason: "grammatical_fusion", split: "me → myself + inscribo → I enroll: the reflexive verb inscribirse = do I sign up.", minimal: "Pronoun and verb." },
    "me cambio": { reason: "grammatical_fusion", split: "me → myself + cambio → I change: the reflexive verb cambiarse = do I get changed.", minimal: "Pronoun and verb." },
    "se me olvidó": { reason: "lexical_expression", split: "se → itself + me → to me + olvidó → it forgot is a false literal; = I forgot (it).", minimal: "Three words." },
    "entré en calor": { reason: "lexical_expression", split: "entré → I entered + en → in + calor → heat is false; entrar en calor = to warm up.", minimal: "Three words." },
    "te sientes": { reason: "grammatical_fusion", split: "te → yourself + sientes → you feel: the reflexive verb sentirse = do you feel.", minimal: "Pronoun and verb." },
    "me siento": { reason: "grammatical_fusion", split: "me → myself + siento → I feel: the reflexive verb sentirse = I feel.", minimal: "Pronoun and verb." },
    "press de banca": { reason: "lexical_expression", split: "press → press + de → of + banca → bench names a bench; the exercise = bench press.", minimal: "Three words, one noun." },
    "por si acaso": { reason: "lexical_expression", split: "por → for + si → if + acaso → perhaps is a word salad; = just in case.", minimal: "Three words." },
    "claro que": { reason: "lexical_expression", split: "claro → clear + que → that is false; the emphatic opener = of course.", minimal: "Two words; the verb stays outside." },
    "cambias de opinión": { reason: "lexical_expression", split: "cambias → you change + de → of + opinión → opinion leaves a stray of; = you change your mind.", minimal: "Three words." },
    "dejas de": { reason: "lexical_expression", split: "dejas → you leave + de → of is false before a verb; dejar de = to stop (doing).", minimal: "Two words; the verb stays outside." },
    "échale ganas": { reason: "lexical_expression", split: "échale → throw at it + ganas → desire is a false literal; the Mexican cheer = give it your all.", minimal: "Two words." },
    "en calor": { reason: "lexical_expression", split: "en → in + calor → heat is false; = warm (after exercise).", minimal: "Two words." },
    "con calma": { reason: "lexical_expression", split: "con → with + calma → calm; the manner phrase = nice and easy.", minimal: "Two words." },
    "mucho gusto": { reason: "lexical_expression", split: "mucho → much + gusto → pleasure; the greeting = nice to meet you.", minimal: "Two words." },
  },

  grammar: {
    macros: {
      inscr: "(inscribirme | registrarme | apuntarme | hacerme socio | hacerme socia | hacerme miembro | darme de alta | unirme | inscribirme al gimnasio | entrar al gimnasio)",
      gym_w: "(gimnasio | gym | gimnasio colibri)",
      this_m: "(esta | esa | la | la otra | esta maquina | esa maquina | la maquina | la prensa | la otra maquina | la maquina de pecho | este aparato | ese aparato | el aparato | la de pecho)",
      free_w: "(libre | desocupada | desocupado | disponible | ocupada | ocupado | en uso)",
      part: "(rodilla #knee | rodillas #knee | espalda #back | espalda baja #back | cintura #back | hombro #shoulder | hombros #shoulder | brazo #arm | brazos #arm | muneca #arm | codo #arm | pierna #leg | piernas #leg | tobillo #leg | cadera #leg | pie #leg | cuello #neck)",
      art: "(el | la | los | las | mi | mis)",
      much: "(mucho | un poco | un poquito | poquito | bastante | horrible | muchisimo)",
      ok_w: "(bien | muy bien | super bien | excelente | genial | increible | de maravilla | perfecto | perfecta | padre | muy padre | con energia | con mucha energia | fuerte | listo | lista)",
      tired_w: "(cansado | cansada | cansadisimo | cansadisima | agotado | agotada | muerto | muerta | sudado | sudada | rendido | rendida | molido | molida | reventado | reventada)",
      // "Pensándolo bien, la visita." / "Cambié de opinión: la mensualidad."
      mind_: "(pensandolo bien | (cambié | ya cambié) de (opinion | idea) | mejor dicho)",
      dia: "(lunes | martes | miercoles | jueves | viernes | sabado | domingo)",
    },
    slots: {
      amenity: { lexicon: [
        { id: "showers", forms: ["regaderas", "regadera", "duchas", "ducha"] },
        { id: "sauna", forms: ["sauna", "vapor", "bano de vapor", "sauna de vapor"] },
        { id: "pool", forms: ["alberca", "albercas", "piscina", "piscinas", "pileta"] },
        { id: "towels", forms: ["toallas", "toalla"] },
        { id: "lockers", forms: ["lockers", "locker", "casilleros", "casillero", "vestidores", "vestidor"] },
        { id: "parking", forms: ["estacionamiento", "parking", "aparcamiento", "donde estacionarme", "lugar para estacionarme"] },
        { id: "classes", forms: ["clases", "clase", "clases de grupo", "clases grupales", "zumba", "clases de zumba", "spinning", "clases de spinning", "yoga", "clases de yoga",
          "pilates", "box", "boxeo", "clases de box", "crossfit", "baile", "aerobics", "aerobicos"] },
        { id: "wifi", forms: ["wifi", "wi fi", "internet"] },
        { id: "water", forms: ["agua", "agua purificada", "bebedero", "garrafon", "agua para tomar"] },
        // what any gym has: "¿Tienen pesas?", "¿Hay baños?", "¿Tienen aire acondicionado?" (never "eso no lo tenemos")
        { id: "basics", forms: ["pesas", "mancuernas", "barras", "discos", "maquinas", "aparatos", "maquinas de cardio", "caminadoras", "bicis", "bicicletas",
          "elipticas", "remadora", "banos", "bano", "sanitarios", "aire acondicionado", "clima", "espejos", "musica"] },
        { id: "trainer", forms: ["entrenador", "entrenadora", "entrenador personal", "entrenadores", "entrenadora personal", "coach", "instructor", "instructora"] },
      ] },
    },
  },

  intents: {
    // --- arriving --------------------------------------------------------------------------------
    im_new: { patterns: [
      "soy (nuevo | nueva) [aqui | en el gimnasio | en esto | en el gym] #h:new_here",
      "(es | esta es) mi primera vez [aqui | en un gimnasio | en el gimnasio | en este gimnasio] #h:first_time",
      "[si] (es la | es mi) primera vez [que vengo | aqui | que vengo aqui | que vengo a un gimnasio]", "[si] primera vez [aqui]",
      "[si] nunca (he venido | vine | habia venido) [aqui | a un gimnasio | a este gimnasio]", "nunca he (ido | estado) en un gimnasio",
      "no soy (socio | socia | miembro) [todavia | aun]", "(apenas | recien) (empiezo | voy a empezar)", "soy principiante", "(es | seria) mi primer dia [aqui]",
    ] },
    not_new: { patterns: [
      "[no] no soy (nuevo | nueva) [aqui]", "[no] ya vine (antes | aqui | una vez)", "[no] ya (he venido | estuve | habia venido) [antes | aqui | una vez]", "[no] ya soy (socio | socia | miembro) [aqui]",
      "[no] no es mi primera vez [aqui]", "[no] vengo (seguido | mucho | diario | todos los dias | cada semana)",
      "no soy (nuevo | nueva) ya (vine | he venido | estuve) (antes | aqui)",
    ] },
    want_join: { patterns: [
      "(quiero | necesito | vengo a) @inscr [aqui | hoy] #h:join", "(quisiera | me gustaria) @inscr [aqui | hoy]", "me (quiero | quisiera) (hacer socio | hacer socia | hacer miembro | apuntar | registrar | dar de alta) [aqui | hoy]", "como me (apunto | registro | hago miembro)", "me (quiero | quisiera | gustaria) inscribir [al gimnasio | aqui | hoy]",
      "(quiero | quisiera | me gustaria) (hacerme | ser) (socio | socia | miembro) [del gimnasio] #h:become_member",
      "como (me inscribo | me puedo inscribir | me registro | me hago socio | me hago socia | le hago para inscribirme | puedo inscribirme) #h:how_join",
      "(puedo | me puedo | se puede) (inscribir | inscribirme | inscribirse) [hoy | aqui]", "(donde | en donde) me inscribo",
      "(quiero | quisiera | me gustaria | me das | me da) informacion [del gimnasio | de las membresias | de los precios]",
      "me interesa (inscribirme | el gimnasio | hacerme socio | hacerme socia)",
      "(quiero | quisiera | me gustaria) (hacer ejercicio | entrenar | empezar a hacer ejercicio | ponerme en forma | bajar de peso | empezar a entrenar | hacer pesas) [aqui]",
      "(quiero | quisiera) (conocer | ver) el @gym_w", "es posible inscribirse [hoy]",
      // "Quiero una membresía." at the door: the membership (the plan step chooses it)
      "(quiero | quisiera | me gustaria) (una membresia | membresia)",
    ] },
    ask_trial: { patterns: [
      "(puedo | se puede) (probar | entrenar | venir) [un dia] (gratis | primero | sin pagar | antes de inscribirme)", "(puedo | se puede) probar [el gimnasio] [primero]",
      "(hay | tienen | dan) [una] (clase | dia | visita | semana | sesion) (de prueba | gratis | de cortesia)", "la primera (clase | sesion | vez | visita) es gratis",
      "(es | sale) gratis la primera (clase | sesion | vez | visita)",
    ] },
    nice_meet: { patterns: ["(mucho gusto | un gusto | encantado | encantada | el gusto es mio | igualmente mucho gusto)", "(me llamo | mi nombre es) {name}", "(mucho gusto | encantado | encantada) [yo] soy {name}"] },

    // --- the membership --------------------------------------------------------------------------
    choose_plan: { patterns: [
      "[@mind_] me quedo con [la | el | una | un] {plan} [mejor | entonces] #h:take_plan",
      "[@mind_] (quiero | quisiera) [la | el | una | un] {plan} [mejor | entonces] #h:like_plan",
      "[@mind_] [la | el | una | un] {plan} [mejor | entonces] #h:plan_short",
      "[@mind_] (voy a querer | voy a tomar | me gustaria | prefiero | dame | me das | me da | deme | ponme | me pones | me pone | escojo | elijo | tomo | me llevo | voy a pagar) [la | el | una | un] {plan} [mejor | entonces]",
      "[@mind_] creo que (me quedo con | quiero | prefiero | tomo) [la | el | una | un] {plan}", "[@mind_] (mejor | entonces) [la | el | una | un] {plan}",
      // corrections: in "X no, Y" and "no X, Y" the second one is the answer
      "[la | el | una | un] {not:plan} no [mejor] [la | el | una | un] {plan}", "no [la | el | una | un] {not:plan} (sino | mejor) [la | el | una | un] {plan}",
      "no [la | el | una | un] {not:plan} [la | el | una | un] {plan}", "no (quiero | necesito) [la | el | una | un] {not:plan} (quiero | prefiero | mejor) [la | el | una | un] {plan}",
      "[mejor] [la | el | una | un] {plan} en vez de [la | el | una | un] {not:plan}",
      "(puedo | podria | me puedo) (cambiar | cambiarme) (a | por) [la | el | una | un] {plan}", "(mejor | entonces) (cambiame | me cambias) a [la | el] {plan}",
      "[la | el | una | un] {plan} (esta bien | me parece bien | me conviene | esta mejor | es mejor) [para mi]", "creo que [la | el] {plan} (me conviene | es mejor) [para mi]",
      "[mejor] (solo | nomas | nada mas | solamente) (por hoy | para hoy | hoy | por un dia | un dia) #day #h:just_today",
      "(solo | nomas | nada mas) (quiero | vengo a) probar [hoy | un dia | el gimnasio] #day",
      "(voy a | pienso | quiero) venir (seguido | diario | todos los dias | mucho | cada semana | tres veces por semana | varias veces a la semana) #monthly",
      "(por | para) (un mes | el mes | todo el mes) #monthly", "pago (el mes | por mes) #monthly",
      "[mejor] [la | el] (mas barata | mas barato | barata | economica) #day", "[mejor] [la | el] de (cien | 100) [pesos] #day", "[mejor] [la | el] de (seiscientos | 600) [pesos] #monthly",
    ] },
    plan_no: { patterns: [
      "[no] no (quiero | necesito) [la | el | una | un] {plan} [tampoco | todavia | por ahora | gracias]", "[no] tampoco [quiero] [la | el | una | un] {plan}",
      "[no] [la | el | una | un] {plan} no [gracias]", "[no] [la | el | una | un] {plan} tampoco",
      "[no] no (quiero | me quiero) (inscribir | inscribirme | hacerme socio | hacerme socia | pagar cada mes | pagar mensualidad) [todavia | por ahora | hoy] #monthly",
      "[no] (solo | nomas | nada mas) (estoy viendo | vengo a ver | estoy mirando | queria ver | queria informacion) #monthly",
      "[la | el] {plan} (es | esta | sale) [muy | demasiado | un poco] (cara | caro) [para mi]",
      "(es | esta) [muy | demasiado | un poco] caro [para mi]", "(seiscientos | 600) (es | son) (mucho | demasiado) #monthly",
      // "No, tampoco." / "No quiero esa tampoco." (the other option Mónica just offered)
      "[no] tampoco #either", "[no] no quiero (esa | ese | eso) [tampoco] #either", "[no] (esa | ese) tampoco #either",
      "[no] no (quiero | me interesa) (ninguna | ninguno | ninguna de las dos | ninguna opcion | ninguna de esas) #both", "[no] ninguna [de las dos] #both",
      "lo voy a pensar", "(tengo que | necesito | dejame | dejeme) pensarlo", "lo pienso",
    ] },
    // "Cambié de opinión." (on its own)
    change_mind: { patterns: ["(cambié | ya cambié) de (opinion | idea)", "pensandolo bien", "(puedo | podria) cambiar (de plan | mi plan | la membresia | de opcion)"] },
    ask_price: { patterns: [
      "cuanto (cuesta | es | sale | cobran | vale) [la | el | una | un] {plan} [al mes | por mes | por dia] #h:q_price",
      "cuanto (cuesta | es | sale | cobran | cobras | vale) (el gimnasio | el gym | al mes | por mes | por dia | el dia | la entrada | por visita | entrar)",
      "cuanto (cuesta | es | sale | cobran | vale) (por | para) [la | el | una | un] {plan}", "cuanto (cuesta | es | sale | cobran)", "(cuales son | que) (los precios | precios | costos | tarifas) [tienen | manejan | hay]",
      "(cual es | que) precio tiene [la | el] {plan}", "es caro", "(es | sale) (caro | cara) [la | el] {plan}", "a como (esta | sale) [la | el] {plan}", "(puedo | se puede) pagar (por mes | mes por mes | cada mes)",
      // lead's check: "¿Cuántos pesos son?" (never "pesos" ~ "peso", the weight), "¿Son seiscientos al mes?"
      "cuantos pesos (son | es | cobran)", "(son | es | cuesta | sale) {price} (al mes | por mes | por dia | el dia | la visita | la mensualidad | por la visita | por la mensualidad)",
    ] },
    ask_included: { patterns: [
      "que incluye [la | el] {plan} #h:q_included", "que (incluye | entra | viene) (en | con) [la | el] {plan}", "que incluye [el precio]",
      "(incluye | entran | estan incluidas | vienen) (las clases | clases | el entrenador | entrenador | la entrenadora | las toallas | las regaderas | el entrenamiento)",
      "(puedo | se puede) usar (todo | todas las maquinas | las clases | las maquinas)", "que puedo usar [con la mensualidad | con la visita]",
    ] },
    ask_fee: { patterns: [
      "(hay que | tengo que) pagar [la] inscripcion", "(cobran | cobras) [la] inscripcion #h:q_fee", "(hay | tiene costo | cuanto es | cuanto cuesta | cuanto sale) [la] inscripcion",
      "(hay | tienen) (algun | otro) (costo | cargo | pago) [extra | adicional | aparte]", "(tengo que | hay que) pagar (algo | otra cosa) (mas | aparte | extra)",
      "es todo o hay que pagar algo mas", "cuanto (cuesta | es | sale) (inscribirse | inscribirme | la inscripcion)",
    ] },
    ask_cancel: { patterns: [
      "(puedo | se puede) (cancelar | dejar de venir | darme de baja | salirme) cuando (quiera | sea) #h:q_cancel", "(hay que | tengo que) firmar [un] contrato",
      "(hay | es con) [un] (contrato | plazo minimo | permanencia)", "como (cancelo | me doy de baja)", "(y si | que pasa si) (quiero cancelar | ya no vengo | dejo de venir)",
      "(puedo | se puede) cancelar",
      // "¿La mensualidad tiene contrato?" asks; it never chooses the plan
      "[la | el] [{plan}] (tiene | lleva) [un] (contrato | plazo minimo | permanencia)",
    ] },
    ask_hours: { patterns: [
      "(que | cual es el) horario (tienen | tiene | manejan | es) #h:q_hours", "a que hora (abren | cierran | abre | cierra | abres)", "(que | cuales) (son los | son sus) horarios",
      "(abren | estan abiertos | abre) (los domingos | el domingo | los sabados | el sabado | los fines de semana | todos los dias | en la noche | temprano)",
      "hasta que hora (abren | estan abiertos | cierran)", "cual es el horario", "que horario",
    ] },
    ask_have: { patterns: [
      "(tienen | hay | tiene | tienes) [un | una | unos | unas] {amenity} [aqui] #h:q_have", "(puedo | se puede) usar (el | la | las | los) {amenity}",
      "(el | la | las | los) {amenity} (es | son | esta | estan) (gratis | incluido | incluida | incluidos | incluidas)",
      "(hay | tienen) clases de {amenity}",
    ] },
    ask_discount: { patterns: [
      "(hay | tienen | dan | manejan | tiene) (descuento | descuentos | promocion | promociones | algun descuento | alguna promocion) [para (estudiantes | adultos mayores | parejas | maestros)]",
      "(me puedes | puedes | me puede) (hacer | dar) [un] descuento", "(hay | tienen) precio (de estudiante | especial)",
    ] },
    ask_have_unknown: { patterns: ["(tienen | hay) [un | una | unos | unas] {w:any}"] },
    ask_jordan: { patterns: [
      "(cuanto tiempo | cuantos anos) (llevas | tienes | lleva) (de entrenadora | aqui | trabajando aqui | entrenando | de coach | en el gimnasio)",
      "(tu | usted) (entrenas | entrena) (diario | todos los dias)", "(entrenas | entrena) (diario | todos los dias)",
      "(te | le) gusta (tu trabajo | trabajar aqui | ser entrenadora | tu chamba)", "(tu | usted)? (eres | es) [mi | la] (entrenadora | coach | instructora)",
    ] },

    // --- the form and paying ---------------------------------------------------------------------
    here_you_go: { patterns: [
      "aqui (tienes | tiene | esta | lo tienes | la tienes) #h:here_you_go", "(ten | tenga | toma | tome)", "(ahi | aqui) va",
      "aqui (esta | tienes | tiene) (mi | la) (tarjeta | identificacion | ine | pasaporte | ficha | hoja | credencial | licencia)",
      "(te | le) (doy | paso) (mi | la) (tarjeta | identificacion | pasaporte | ficha)",
      // cash with its amount (rule 18): less than the total asks for it, more gets change
      "(aqui tienes | aqui tiene | ahi va | ahi van | aqui van | ten | tenga | toma | tome) [son] {price}", "(te | le) (doy | pago con) {price}",
      "(aqui tienes | aqui tiene | ten | tenga | toma | tome | te doy | le doy | te pago con | le pago con) (un billete de | uno de) {price}",
      "(solo | nomas | nada mas) (tengo | traigo) [un billete de | uno de] {price}",
    ] },
    form_done: { patterns: [
      "listo ya (esta | la firmé | la llené | firmé | terminé) #h:form_done", "ya (esta | la llené | la firmé | firmé | terminé | acabé | quedó)", "(terminé | acabé)",
      "(la | lo) (firmé | llené)", "(la | lo) voy a (llenar | firmar) [ahorita | ahora]",
    ] },
    sign_q: { patterns: [
      "(donde | en donde) (firmo | tengo que firmar | pongo mi firma | hay que firmar) #h:q_sign", "(firmo | tengo que firmar) aqui", "aqui firmo",
      "(donde | en donde) (pongo | va) mi (nombre | firma)", "tengo que firmar",
    ] },
    pen_q: { patterns: [
      "(me prestas | me presta | tienes | tiene | me das | me da | me pasas) (una pluma | un boligrafo | un lapiz | una lapicera | un boli | algo para escribir) #h:q_pen",
      "(no tengo | necesito) (pluma | boligrafo | lapiz | con que escribir)",
    ] },
    form_what: { patterns: [
      "(que es | para que es) (esto | esta hoja | esta ficha | este papel | este formato | este formulario | la hoja) #h:q_form", "que (pongo | escribo) aqui", "que (es | dice) esto",
    ] },
    pay_card: { patterns: [
      "[mejor] (con | en) tarjeta [de credito | de debito] #h:pay_card_short", "tarjeta", "(puedo | se puede) pagar con tarjeta [de credito | de debito] #h:pay_card",
      "(aceptas | aceptan | acepta | reciben | recibes) tarjeta [de credito | de debito]", "[mejor] (pago | voy a pagar | te pago | le pago | quiero pagar) con tarjeta",
      "(visa | mastercard | amex | american express)", "se puede con tarjeta", "(aceptas | aceptan | acepta) (visa | mastercard | amex)", "(puedo | se puede) pagar con (visa | mastercard | amex)",
      // "Efectivo no, tarjeta" / "No en efectivo, con tarjeta": the second one is the answer
      "[en] efectivo no [con] tarjeta", "no [en] efectivo [con] tarjeta", "(con | en) (debito | credito)",
    ] },
    no_cash: { patterns: ["no (traigo | tengo | cargo) (efectivo | cash | dinero en efectivo | suficiente efectivo)", "sin efectivo",
      "no (puedo | quiero) pagar (en | con) efectivo", "[no] en efectivo no", "no en efectivo",
      // "No tengo efectivo ni tarjeta": the phone or a transfer (nothing on file)
      "no (traigo | tengo) [ni] (efectivo | tarjeta) ni (tarjeta | efectivo) #both"] },
    no_card: { patterns: [
      "no (traigo | tengo) (tarjeta | mi tarjeta)", "no (puedo | quiero) pagar con tarjeta", "[no] con tarjeta no", "no con tarjeta",
      // "No con tarjeta, en efectivo." (the comma is lost): cash
      "no con tarjeta (en | con) efectivo",
    ] },
    pay_cash: { patterns: [
      "[mejor] (pago | voy a pagar | te pago | le pago | quiero pagar) en efectivo #h:pay_cash", "[con] tarjeta no [en] efectivo", "(puedo | se puede) pagar en efectivo", "[mejor] [en] efectivo",
      // "No tengo tarjeta, pero tengo efectivo" (never "¿Tienen efectivo?")
      "[pero] (tengo | traigo) efectivo",
    ] },
    pay_phone: { patterns: [
      "(puedo | se puede) pagar con (el celular | mi celular | el telefono | apple pay | google pay) #h:pay_phone",
      "(aceptas | aceptan | acepta) (apple pay | google pay | transferencia | transferencias)", "[mejor] (con | por) (transferencia | el celular | mi celular | apple pay | google pay)",
      "(te | le) (hago | mando) una transferencia", "[mejor] (pago | te pago | le pago) (con el celular | por transferencia | con transferencia)", "(puedo | se puede) pagar (por | con) transferencia",
      "(te | le) transfiero",
    ] },

    // --- the locker room -------------------------------------------------------------------------
    lockers_q: { patterns: [
      "(donde | en donde) (estan | quedan) los (vestidores | lockers | casilleros) #h:where_lockers", "(donde | en donde) (esta | queda) el (vestidor | locker | casillero)",
      "(donde | en donde) (me cambio | me puedo cambiar | puedo cambiarme) #h:where_change",
      "(donde | en donde) (dejo | puedo dejar | pongo | guardo) (mi | mis) (mochila | maleta | cosas | ropa | bolsa) #h:where_bag",
      "(hay | tienen) (vestidores | lockers | casilleros)", "[si] (me quiero | quiero | quisiera) cambiar [primero]", "[si] quiero cambiarme [primero]",
      "[si] necesito un (locker | casillero)", "[si] los (vestidores | lockers | casilleros)",
    ] },
    change_no: { patterns: [
      "[no] ya (vengo | vine | estoy) (cambiado | cambiada | con ropa de deporte | con ropa deportiva)", "[no] ya (me cambié | me cambie) [en casa]",
      "[no] no (necesito | tengo que) cambiarme", "[no] (asi estoy bien | asi vengo bien)",
      "[no] ya traigo [la] ropa (de deporte | de gimnasio | deportiva)", "[no] vengo (listo | lista | cambiado | cambiada)",
    ] },
    // "No, estoy bien." / "No hace falta." to "¿Te quieres cambiar primero?"
    change_no_ctx: { patterns: ["[no] estoy bien [asi] [gracias]", "no hace falta", "[no] asi"] },
    ready: { patterns: [
      "[si | no] ya estoy (listo | lista) [para empezar] #h:ready", "[si] estoy (listo | lista) [para empezar]", "[ya] (listo | lista)", "vamos [a empezar | a darle | pues]", "(empecemos | empezamos | dale)",
      "[no] no tengo [mas | ninguna | otra] (pregunta | preguntas)", "[no] ninguna [pregunta | mas]",
      // never "[no]" before these: "No entiendo" / "No entendí" / "No todo está claro" are the opposite
      "(todo | ya) (claro | esta claro)", "(ya)? (entendi | entiendo) [todo]", "no ya (entendi | entiendo | esta claro | quedo claro)",
    ] },
    // "Tengo una pregunta" (never "¿Tienen preguntas?": eso no lo tenemos)
    have_q: { patterns: [
      "[si] (tengo | traigo) (una pregunta | otra pregunta | una duda | otra duda | dudas | preguntas)", "[si] (una | otra) (pregunta | duda) [mas]",
      "(te | le)? puedo preguntar (algo | otra cosa)", "[no] (solo | nomas | nada mas) (tengo)? una (pregunta | duda)",
    ] },
    lock_have: { patterns: ["[si] (traigo | traje | tengo) (uno | el mio | mi candado | candado | un candado) #h:lock_have", "[si] (lo | aqui lo) traigo", "[si] esta en mi mochila"] },
    lock_none: { patterns: [
      "[no] (se me olvidó | lo olvidé | lo dejé | se me quedó) [en casa] #h:lock_forgot", "[no] no (traigo | traje | tengo) [candado | uno | el candado | mi candado | un candado]",
      "[no] sin candado",
    ] },
    // back from the locker room
    im_back: { patterns: ["ya (volví | regresé | estoy aqui | estoy de vuelta | me cambié) #h:im_back", "(aqui | ya) estoy", "listo ya (me cambié | volví | regresé)", "ya (vine | llegué)"] },
    lock_need: { patterns: ["(necesito | hace falta | se necesita | tengo que traer) [un] candado", "(hay que | tengo que) (traer | tener) candado"] },
    lock_borrow: { patterns: [
      "(me prestas | me presta | me puedes prestar | puedo pedir prestado) [un] (candado | uno)", "(donde | en donde) (compro | consigo) [un] (candado | uno) #h:lock_borrow",
      "(venden | vendes | rentan | tienen) candados", "(puedo | se puede) (comprar | rentar) [un] candado [aqui]",
    ] },
    towel_q: { patterns: ["(me prestas | me das | me presta | me da | puedo tener) una toalla", "(necesito | hay que traer | tengo que traer) [mi] toalla", "(donde | en donde) (hay | estan) [las] toallas"] },
    water_q: { patterns: [
      "(donde | en donde) (hay | puedo tomar | consigo) agua [purificada] #h:q_water", "(donde | en donde) esta el (bebedero | garrafon | agua)",
      "(puedo | me dejas) tomar [un poco de] agua #h:water_please", "(me das | me da) [un poco de] agua", "(quiero | necesito) [tomar] agua",
    ] },
    restroom_q: { patterns: ["(donde | en donde) (esta | estan | queda) (el bano | los banos | el sanitario | los sanitarios | el aseo)", "(puedo | me dejas) (ir | pasar) al bano"] },

    // --- the warm-up -----------------------------------------------------------------------------
    warm_choice: { patterns: [
      "[la | el] {cardio} #h:warm_the", "voy a usar [la | el] {cardio} #h:warm_take", "prefiero [la | el] {cardio} #h:warm_prefer",
      "(me quedo con | quiero | quisiera | escojo | elijo | tomo | uso | voy a hacer | voy en | puedo usar | puedo ir en) [la | el] {cardio}", "(mejor | entonces) [la | el] {cardio}",
      "[la | el] {cardio} (esta bien | me gusta | me parece bien)", "me gusta [la | el] {cardio}",
      "no [la | el] {not:cardio} [sino | mejor] [la | el] {cardio}", "[la | el] {not:cardio} no [mejor] [la | el] {cardio}",
      "(quiero | voy a | prefiero | puedo) (correr | caminar | trotar) [en la caminadora] #tread",
      "(quiero | voy a | prefiero | puedo) (pedalear | andar en bici | hacer bici) #bike",
    ] },
    warm_not: { patterns: [
      "[no] no (quiero | me gusta) [la | el] {cardio}", "[no] [la | el] {cardio} no", "[no] no (me gusta | quiero | puedo) (correr | trotar) #tread",
      "[no] no (me gusta | quiero) (pedalear | andar en bici) #bike",
    ] },
    warm_any: { patterns: [
      "(cualquiera | la que sea | cualquiera de las dos) [esta bien]", "me da (igual | lo mismo)", "(tu | usted)? (escoge | escoges | eliges | decides | decide)",
      "lo que (tu | usted)? (digas | diga | recomiendes | quieras)", "la que (tu | usted)? (quieras | digas | recomiendes)", "no importa",
    ] },
    recommend_q: { patterns: [
      "(cual | que) me (recomiendas | recomienda | sugieres | sugiere | conviene)", "(cual | que) (es | seria) mejor [para mi]", "que (recomiendas | recomienda)",
      "(cual | que) (escojo | tomo | elijo)", "tu que (harias | me recomiendas)",
    ] },
    warm_q: { patterns: [
      "[por | durante] cuanto tiempo [le doy | camino | corro]", "cuanto tiempo #h:q_how_long", "cuantos minutos", "(que tan rapido | a que velocidad | que velocidad) [corro | camino | voy]",
      "por que (hay que | tengo que) calentar", "(solo | nada mas)? cinco minutos [nada mas | nomas]",
    ] },

    // --- how are you feeling ---------------------------------------------------------------------
    feel_good: { patterns: [
      "(me siento | estoy) @ok_w [ya | ahora] #h:feel_great", "me siento muy bien", "ya entré en calor #h:feel_warm", "ya (calenté | estoy caliente)",
      "(estuvo | fue | esta) (divertido | facil | padre | bien | genial | super)", "me (gustó | encantó)",
      "(mucho | un poco | bastante)? mejor [ya | ahora] [gracias] #h:better", "(ya)? (me siento | estoy) (mucho | un poco | bastante)? mejor [gracias]",
      "estoy bien gracias", "todo bien [gracias]",
    ] },
    tired: { patterns: [
      "[estoy] [un poco | muy | bien | super | algo | bastante] @tired_w #h:feel_tired", "estoy (super | bien | muy) @tired_w",
      // "Estoy bien, nada más un poco cansada." (to "¿Estás bien?")
      "[si] estoy bien [pero] [nada mas | solo | nomas] [estoy] [un poco | algo | muy] @tired_w", "[si] (nada mas | solo | nomas | solamente) [estoy] [un poco | algo | muy] @tired_w",
      "me siento [un poco | muy | algo] (cansado | cansada | mareado | mareada | debil)",
      "(necesito | quiero | ocupo) (un descanso | descansar | un minuto | sentarme | un break) #h:need_break", "(puedo | podemos) descansar [un poco | un minuto]",
      "(ya)? me (muero | estoy muriendo)", "[uf | uff | ay | uy] (estuvo | fue) (pesado | dificil | duro | intenso) [eh]", "estoy sudando [mucho]",
    ] },
    out_breath: { patterns: [
      "me falta (el aire | aire | la respiracion) #h:out_of_breath", "(no puedo | ya no puedo) respirar", "(estoy | quedé | me quedé) sin (aire | aliento)",
      "me (ahogo | estoy ahogando)", "[ya] no tengo aire", "necesito (respirar | recuperar el aire | aire)", "(dejame | dejeme) (respirar | recuperar el aire)",
    ] },
    not_tired: { patterns: [
      "no estoy (cansado | cansada) [para nada | nada]", "no necesito [un] descanso", "[no] no (quiero | necesito) agua", "(estoy | sigo) con (energia | mucha energia)",
      "puedo (hacer | seguir) mas", "para nada (cansado | cansada)", "no me (siento | siento nada) (cansado | cansada)",
    ] },

    // --- the machine -----------------------------------------------------------------------------
    machine_free_q: { patterns: [
      "(esta | sigue) @free_w (esta | esa) (maquina | prensa | banca) #h:machine_free", "(esta | sigue) @free_w @this_m [ahorita]",
      "@this_m (esta | sigue) @free_w [ahorita]", "y @this_m (esta | sigue) @free_w",
      "alguien (la | lo) (esta usando | usa | ocupa | esta ocupando) [ahorita] #h:anyone_using", "alguien (esta usando | usa | ocupa) @this_m [ahorita]",
      "(la | lo) (estas | esta | estan) usando [ahorita] #h:you_using", "(estas | esta) usando @this_m", "(la | lo) (ocupas | ocupa | vas a usar | va a usar)", "(ocupas | ocupa) @this_m",
      "(te | le) falta mucho #h:much_left", "cuantas series (te | le) faltan", "ya (terminaste | termino | acabaste | acabo) [con @this_m]",
      "(puedo | podria) usar @this_m #h:can_use", "(la | lo) (puedo | podria) usar", "(puedo | podria) usarla", "(me | nos) (dejas | deja) usarla",
      "(podemos | puedo) (alternar | intercalar | turnarnos) [contigo | con usted]",
    ] },
    // "¿Está libre?", "¿Puedo?": only while Mónica points at the machine
    machine_free_ctx: { patterns: ["(esta | sigue) @free_w [ahorita]", "libre", "(puedo | podria) (usarla | usarlo)", "ya (terminaste | termino)", "puedo"] },
    machine_taken: { patterns: ["creo que (esta | sigue) (ocupada | ocupado)", "no esta (libre | desocupada | desocupado)", "hay (alguien | una toalla | una botella) [ahi | encima]"] },
    broken_q: { patterns: [
      "que le (pasó | pasa) #h:q_broken", "que tiene", "(esta | se) (descompuesta | descompuso | rompió | rompio)", "por que no (funciona | sirve)",
      "(cuando | para cuando) (la arreglan | la van a arreglar | va a estar lista)", "no funciona", "(hay | tienen) otra",
    ] },

    // --- sets, reps, weight ----------------------------------------------------------------------
    ask_sets: { patterns: [
      "cuantas series (hago | tengo que hacer | debo hacer | hacemos | son | vamos a hacer) #h:how_many_sets", "cuantas series [y cuantas repeticiones]",
      "cuantas (repeticiones | reps | veces) [hago | son | por serie | tengo que hacer] #h:how_many_reps", "cuantas series y repeticiones",
      "cuantas (hago | hacemos | son | debo hacer)",
    ] },
    sets_ctx: { patterns: ["cuantas [veces]", "cuanto"] },
    ask_weight: { patterns: [
      "cuanto peso (le pongo | uso | levanto | pongo | cargo | es | tiene) #h:q_weight", "cuanto (pesa | es) [la barra | esto | eso | la maquina | la prensa]", "cuanto pesa la barra #h:q_bar",
      "cuantos (kilos | kilogramos | kg) [son | le pongo | pongo | es | pesa | tiene]", "cuantas (libras | lb) [son | le pongo | es | pesa | tiene] #lb #tip:libras",
      "(es | esta) (ligero | ligera | pesado | pesada)", "(le puedes | puedes) (poner | quitar) (mas | menos) peso", "(le pongo | pongo) (mas | menos) peso", "con cuanto peso empiezo",
    ] },
    ask_rest: { patterns: [
      "cuanto (descanso | descansas | tiempo descanso | debo descansar | tengo que descansar) [entre series] #h:q_rest", "(descanso | se descansa) entre series",
      "cuanto (tiempo)? de descanso",
    ] },
    ask_how: { patterns: [
      "como (funciona | se usa | la uso | se hace | lo hago | uso) [esta maquina | esto | la maquina | esta | la prensa] #h:q_how", "(me | me puedes) (ensenas | ensenar | explicas | explicar) [como (se usa | funciona | se hace)]",
      "que hago [ahora]", "como me (siento | pongo | acomodo)", "no (entiendo | entendi) como (funciona | se usa | se hace | la uso)",
    ] },
    not_ready: { patterns: ["[todavia | aun] no estoy (listo | lista) [todavia]", "todavia no [termino]", "(esperame | espérame | aguanta) [un momento | tantito | un segundo]", "no he terminado"] },
    // "¿Así está bien?" about the form (signs it) or the exercise (Mónica checks it)
    check_ok: { patterns: ["asi esta bien", "(lo | la) estoy haciendo bien", "(esta | estoy) bien asi", "(lo hago | se hace) asi", "asi (esta | es) correcto", "voy bien", "asi"] },

    // "¡Una más!": the learner's reaction (only right after Mónica's count)
    rep_done_ctx: { patterns: [
      "[y] diez", "(listo | ya | ya esta | terminé | ya terminé | acabé | ya acabé)", "[listo] lo (logré | hice) #h:done_it", "listo lo logré",
      "[va | bueno | ok | si | vamos | dale] una mas [repeticion] #h:one_more", "(uf | uff | ufff | fiu | wow | ay | uy)",
      "[uf | uff | ay | uy] (estuvo | fue | esta) (pesado | pesadisimo | dificil | duro | facil | bien | padre | tranquilo) #h:was_hard", "que (dificil | pesado | duro)",
      "(si | claro que) (puedo | se puede)", "vamos", "me tiemblan (las piernas | los brazos)", "la ultima", "(dale | vamos) con todo",
    ] },
    cant: { patterns: [
      "[ya] no puedo [mas | hacerlo | otra | una mas | levantarla | empujarla | con esto]", "(esta | es) [muy | demasiado | super] (pesado | pesada) [para mi]",
      "(muy | demasiado) pesado", "me rindo", "ya no mas", "no aguanto [mas]",
    ] },

    // --- pain (the twist, or said at any time) ---------------------------------------------------
    pain: { patterns: [
      "me duele [@much] [@art] (rodilla | rodillas) [@much] #knee #h:knee_hurts", "me duele [@much] [@art] (espalda | espalda baja) [@much] #back #h:back_hurts",
      "me (duele | duelen) [@much] [@art] @part [@much]", "(tengo | siento) [un] dolor (en | de) [@art] @part", "me (lastimé | jalé | torcí) [@art] @part",
      "[@art] @part me (duele | duelen)", "[ay] me duele [@much]", "(ay | auch) [@art] @part", "algo me duele", "siento dolor",
      "(todavia | aun) me (duele | duelen) [@much] [@art] @part #h:still_hurts", "me sigue doliendo [@art] @part", "(todavia | aun) me duele [@much]",
      "(nada mas | solo | nomas) me (duele | duelen) [@much] [@art @part] [@much]",
    ] },
    // "La rodilla." as the answer to "¿Qué te duele?"
    pain_ctx: { patterns: ["[@much] [@art] @part", "[@art] @part y [@art] @part", "es [@art] @part"] },
    // "No me duele la rodilla" said aloud could be "No, me duele la rodilla" (rule 10): #amb, Mónica asks
    no_pain: { patterns: [
      "[no] no me duele nada", "[no] ya no me duele [nada | @art @part]", "[no] nada me duele", "[no] no tengo dolor", "[no] no siento dolor", "no estoy (lastimado | lastimada)",
      "no me lastimé", "[no] no me (duele | duelen) [@art] @part [ya] #amb",
      // "No me duele" (= "No, me duele" aloud) asks too; "No, no me duele" is clear
      "no me (duele | duelen) #amb", "no no me (duele | duelen) [@art @part]",
      // lead's check: the part first ("La rodilla no me duele", "La espalda está bien") is never "the knee" + pain
      "[@art] @part no me (duele | duelen) [nada | ya]", "[@art] @part ya no me (duele | duelen) [nada]", "[@art] @part (esta | estan) bien [gracias]",
      // "No me duele mucho" said aloud is also "No, me duele mucho": she asks
      "no me (duele | duelen) (mucho | tanto) #amb",
    ] },

    // --- spotting ----------------------------------------------------------------------------------
    spot_q: { patterns: [
      "(me ayudas | me puedes ayudar | me podrias ayudar | me ayuda | me puede ayudar) con la barra #h:spot_me", "(me ayudas | me ayuda)", "(me puedes | me podrias | me puede | me podria) ayudar",
      "me (echas | puedes echar | podrias echar | echa) (la | una) mano", "me (cuidas | asistes | puedes cuidar | puedes asistir | cuida | asiste)",
      "(te quedas | te puedes quedar | puedes quedarte | quedate | se queda) (cerca | aqui | conmigo | atras de mi | junto a mi) #h:stay_close",
      "necesito (ayuda | que me ayudes | un spotter) [con la barra]", "ayudame [con la barra]", "(y si | que pasa si) (no puedo | esta muy pesada | se me cae)",
      "(me | me puedes) (detienes | detener | agarras | agarrar) la barra",
    ] },
    no_spot: { patterns: [
      "no necesito (ayuda | que me ayudes | que me cuides) [(puedo | lo puedo hacer) (solo | sola)]", "(lo | la) puedo hacer (solo | sola)", "puedo (solo | sola)",
      "no hace falta que me (ayudes | cuides | asistas)",
    ] },

    // --- next time ---------------------------------------------------------------------------------
    next_same: { patterns: [
      "[si | claro | va | sale | ok | perfecto] manana a la misma hora #h:same_time", "[si | claro | va | sale] nos vemos manana [a la misma hora] #h:see_tomorrow",
      "[si] manana (esta bien | me queda bien | perfecto | me parece bien | puedo)", "[si] a la misma hora (esta bien | me queda bien)",
      "[si] (aqui estoy | aqui estare | vengo | regreso | vuelvo) manana [a la misma hora]", "[si] manana (vengo | regreso | vuelvo) [a la misma hora]", "[si] manana a {time}",
      "(puedo | podemos) (venir | vernos | entrenar) manana [a la misma hora]", "hasta manana", "[si] manana si (puedo | vengo | me queda)",
    ] },
    next_day: { patterns: [
      "(que tal | y si | como ves | mejor) el {day} [a la misma hora] #h:how_about_day", "(puedo | podemos) (venir | vernos | entrenar)? el {day}",
      "[el] {day} (esta | estaria | me queda | seria) (mejor | bien)", "[si | claro] nos vemos el {weekday} #h:see_you_day", "(vengo | regreso | vuelvo) el {day}",
      "puede ser el {day}", "[si] el {day} si [puedo | me queda]", "el {day} a la misma hora", "mejor {day}", "[el] {not:day} no [mejor] el {day}",
      // "Mañana no puedo, ¿el jueves?" in one piece: never "mañana" + "no puedo el jueves" (that booked tomorrow)
      "[no] manana no (puedo | me queda | se puede) [pero] [que tal | mejor | y | puede ser | como ves] el {day} [a la misma hora]",
      "[no] no puedo manana [pero] [que tal | mejor | y | puede ser | como ves] el {day} [a la misma hora]", "[no] manana no [mejor] el {day} [a la misma hora]",
    ] },
    next_no: { patterns: [
      "[no] manana no (puedo | me queda | me queda bien | vengo | se puede) #h:cant_tomorrow", "[no] no puedo manana",
      "[no] manana (trabajo | tengo trabajo | estoy ocupado | estoy ocupada | tengo que trabajar)", "[no] manana no", "[no] no (tengo tiempo | estoy libre) manana",
      // lead's check: the time doesn't suit ("A la misma hora no puedo", "Mañana a las seis no puedo"): never "mañana" + a no
      "[no] [manana] a (la misma hora | esa hora | {time}) no (puedo | me queda | se puede) #time", "[no] no puedo [manana] a (la misma hora | esa hora | {time}) #time",
    ] },
    // "El jueves no puedo", "Tampoco el viernes"
    // "No puedo el jueves" is also "No puedo, ¿el jueves?" aloud (rule 10): #amb, she asks when nothing else was offered
    day_no: { patterns: ["[no] el {day} no (puedo | me queda | se puede)", "[no] el {day} no", "[no] no puedo el {day} #amb", "[no] el {day} tampoco", "[no] tampoco el {day}",
      "[no] el {day} a (la misma hora | esa hora | {time}) no (puedo | me queda | se puede)"] },
    next_later: { patterns: [
      "(te | le) (aviso | escribo | confirmo | mando un mensaje) [luego | despues | mas tarde | manana | por whatsapp]",
      "(tengo que | necesito) (ver | revisar | checar) mi (agenda | horario | calendario)", "(luego | despues) (te | le) (digo | aviso)",
      "(tal vez | quizas) (otro dia | luego | la otra semana | la proxima semana)",
    ] },
    // "Todavía no sé": only as the answer to "¿Mañana a la misma hora?"
    later_ctx: { patterns: ["(todavia | aun) no (se | estoy seguro | estoy segura)", "no se (todavia | cuando | si puedo)", "no estoy (seguro | segura) [todavia]",
      // lead's check: unsure is "send me a message", never a booking ("Mañana no sé" booked tomorrow)
      "no se", "[y] manana no se", "no se si manana [puedo]", "[no se] (tal vez | quizas | a lo mejor) manana", "manana (tal vez | quizas | a lo mejor)"] },
    next_time_q: { patterns: ["a que hora [manana | el {day}]", "a que hora (vengo | es | nos vemos)", "(cuando | a que hora) (vengo | regreso)"] },
    // bare answers to "¿Cuándo quieres regresar?" / "¿Qué tal el jueves?"
    when_ctx: { patterns: ["[el] {day} [a la misma hora]", "a la misma hora"] },
    see_you_ctx: { patterns: ["[va | sale | ok | si | claro | perfecto] nos vemos (entonces | pronto | ahi)"] },
  },

  lines: {
    // --- arriving --------------------------------------------------------------------------------
    greet_help: [
      t("¡Hola! | {m:Bienvenido|f:Bienvenida} | al | Gimnasio Colibrí. | ¿En | qué | te | ayudo?", "Hi! | Welcome | to the | Colibrí Gym. | In | what | (to) you | I-help?",
        "Hi! Welcome to Gimnasio Colibrí. How can I help you?"),
      t("¡Hola! | {m:Bienvenido|f:Bienvenida} | al | Gimnasio Colibrí. | ¿Cómo | te | puedo | ayudar?", "Hi! | Welcome | to the | Colibrí Gym. | How | (to) you | can I | help?",
        "Hi! Welcome to Gimnasio Colibrí. What can I do for you?"),
    ],
    greet_first: [
      t("¡Hola! | {m:Bienvenido|f:Bienvenida} | al | Gimnasio Colibrí. | ¿Es | tu | primera | vez | aquí?", "Hi! | Welcome | to the | Colibrí Gym. | Is it | your | first | time | here?",
        "Hi! Welcome to Gimnasio Colibrí. Is this your first time here?"),
      t("¡Hola! | ¿Es | la | primera | vez | que | vienes?", "Hi! | Is it | the | first | time | that | you come?", "Hi there! Is this your first time here?"),
    ],
    greet_hay: [
      t("¡Hola! | ¿Cómo | estás?", "Hi! | How | are you?", "Hi! How are you?"),
      t("¡Hola! | ¿Qué tal | tu | día?", "Hi! | How's | your | day?", "Hi! How's your day going?"),
    ],
    ask_help: [
      t("Bueno, | ¿en | qué | te | ayudo?", "Well, | in | what | (to) you | I-help?", "So, how can I help you?"),
      t("Y | dime, | ¿qué | necesitas?", "And | tell me, | what | do you need?", "So, what can I do for you?"),
    ],
    welcome_back: [
      t("¡Ah, | qué | bueno | verte | otra vez! | ¿En | qué | te | ayudo?", "Oh, | how | nice | to see you | again! | In | what | (to) you | I-help?", "Oh, good to see you again! What can I do for you?"),
    ],
    intro_jordan: [
      t("¡Qué | padre! | Soy | Mónica, | una | de | las | entrenadoras.", "How | cool! | I am | Mónica, | one | of | the | trainers.",
        "Awesome! I'm Mónica, one of the trainers here.",
        { flags: { 1: "Mexican: qué padre = how cool, great." },
          neutral: t("¡Qué | bien! | Soy | Mónica, | una | de | las | entrenadoras.", "How | nice! | I am | Mónica, | one | of | the | trainers.",
            "Great! I'm Mónica, one of the trainers here.") }),
      t("¡Perfecto! | Yo | soy | Mónica | y | voy | a | ser | tu | entrenadora.", "Perfect! | I | am | Mónica | and | I'm going | to | be | your | trainer.", "Great! I'm Mónica, and I'll be your trainer."),
    ],
    nice_meet: [t("¡Igualmente!", "Likewise!", "Nice to meet you too!"), t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!")],

    // --- the membership --------------------------------------------------------------------------
    plan_offer: [
      t("Tenemos | dos | opciones: | la | mensualidad, | de | {$price}, | o | la | visita, | de | {$amount}, | por | un | solo | día.",
        "We have | two | options: | the | monthly membership, | — | {$price}, | or | the | visit, | — | {$amount}, | for | one | single | day.",
        "We have two options: the monthly membership for {$price}, or a single visit for {$amount}, just for the day.",
        { flags: { 5: F_DE_AMOUNT, 9: F_VISITA, 10: F_DE_AMOUNT } }),
      t("Hay | dos | opciones: | mensualidad, | {$price} | al mes, | o | visita, | {$amount} | el | día.", "There are | two | options: | monthly membership, | {$price} | a month, | or | visit, | {$amount} | a | day.",
        "There are two options: monthly, {$price} a month, or a single visit, {$amount} for the day.", { flags: { 7: F_VISITA } }),
    ],
    plan_trainer_note: [
      t("Y | con | cualquiera | de | las | dos, | tu | primera | sesión | conmigo | es | gratis.", "And | with | either | of | the | two, | your | first | session | with me | is | free.",
        "And either way, your first session with me is free."),
    ],
    plan_which: [
      t("¿Cuál | quieres?", "Which | do you want?", "Which one would you like?"),
      t("¿Cuál | prefieres?", "Which | do you prefer?", "Which one sounds good?"),
    ],
    plan_which2: [t("¡Claro! | ¿La | mensualidad | o | una | visita?", "Sure! | The | monthly membership | or | a | visit?", "Sure! The monthly membership or a single visit?")],
    plan_recommend: [
      t("Si | vas | a | venir | seguido, | te | conviene | la | mensualidad.", "If | you're going | to | come | often, | (for) you | is the better deal | the | monthly membership.",
        "If you're going to come often, the monthly membership is the better deal."),
    ],
    plan_ok_monthly: [t("¡Excelente | elección!", "Excellent | choice!", "Great choice!"), t("¡Muy | bien, | la | mensualidad!", "Very | good, | the | monthly membership!", "Awesome, the monthly membership!")],
    plan_ok_day: [t("Claro, | una | visita.", "Sure, | a | visit.", "Sure, a single visit."), t("Perfecto, | solo | por | hoy.", "Perfect, | just | for | today.", "Perfect, just for today.")],
    free_session: [t("¡Y | tu | primera | sesión | conmigo | es | gratis!", "And | your | first | session | with me | is | free!", "And your first session with me is free!")],
    trial_info: [t("¡Tu | primera | sesión | con | una | entrenadora | es | gratis!", "Your | first | session | with | a | trainer | is | free!", "Your first session with a trainer is free!")],
    plan_alt_day: [
      t("¡No hay problema! | ¿Qué tal | una | visita? | Son | solo | {$amount}.", "No problem! | How about | a | visit? | It's | just | {$amount}.",
        "No problem! How about a single visit? It's just {$amount}."),
    ],
    plan_alt_monthly: [t("Bueno. | Entonces, | ¿qué tal | la | mensualidad?", "Okay. | Then, | how about | the | monthly membership?", "Okay! Then how about the monthly membership?")],
    both_no: [t("¡No hay problema! | Si | cambias de opinión, | me | avisas.", "No problem! | If | you change your mind, | (to) me | you let know.", "No problem! If you change your mind, just let me know.")],
    plan_think: [t("Sin problema. | Tómate tu tiempo.", "No problem. | Take your time.", "No problem. Take your time.")],
    price_monthly: [
      t("La | mensualidad | es | de | {$price} | al mes.", "The | monthly membership | is | — | {$price} | a month.", "The monthly membership is {$price} a month.", { flags: { 3: F_DE_AMOUNT } }),
    ],
    // the plan named before the options were said: its price (rule 3)
    price_chosen_monthly: [t("Son | {$price} | al mes.", "It's | {$price} | a month.", "It's {$price} a month.")],
    price_chosen_day: [t("Cuesta | {$price}.", "It costs | {$price}.", "It's {$price}.")],
    // "¿Es caro?"
    price_fair: [t("Para | la | zona, | es | un | buen | precio.", "For | the | area, | it's | a | good | price.", "It's a good price for the area.")],
    // "Está bien, gracias" to "¿Qué tal una visita?": a yes or a polite no, so she asks
    alt_reask: [t("Entonces, | ¿quieres | {X.the}?", "So, | do you want | {X.the}?", "So, would you like {X.the}?")],
    price_day: [t("La | visita | cuesta | {$price}.", "The | visit | costs | {$price}.", "A single visit is {$price}.", { flags: { 1: F_VISITA } })],
    included_monthly: [
      t("Incluye | todas | las | máquinas, | las | clases | y | una | sesión | gratis | conmigo.", "It includes | all | the | machines, | the | classes | and | a | session | free | with me.",
        "It includes all the machines, the classes, and a free session with me."),
    ],
    included_day: [t("Puedes | usar | todas | las | máquinas | todo | el | día.", "You can | use | all | the | machines | all | the | day.", "You can use all the machines for the whole day.")],
    // "¿La visita incluye las clases?" (the classes are free for members: classes_info)
    included_day_classes: [t("Con | la | visita, | solo | las | máquinas. | Las | clases | son | para | los | socios.", "With | the | visit, | only | the | machines. | The | classes | are | for | the | members.",
      "A single visit is just the machines. The classes are for members.", { flags: { 2: F_VISITA } })],
    // "¿Seiscientos?" / "¿Cien pesos?" once a plan is chosen: the price on file, yes or no (rule 20)
    price_yes: [t("Sí, | son | {$price}.", "Yes, | it's | {$price}.", "Yes, it's {$price}.")],
    price_not: [t("No, | son | {$price}.", "No, | it's | {$price}.", "No, it's {$price}.")],
    no_fee: [t("¡Este | mes | no cobramos | inscripción!", "This | month | we don't charge | a sign-up fee!", "No sign-up fee this month!",
      { flags: { 3: "inscripción: the one-time sign-up fee most Mexican gyms charge." } })],
    cancel_info: [
      t("No hay | contrato. | Pagas | mes | por | mes | y | dejas de | pagar | cuando | quieras.", "There's no | contract. | You pay | month | by | month | and | you stop | paying | when | you want.",
        "There's no contract. You pay month to month and can stop whenever you want."),
    ],
    hours_info: [
      t("Abrimos | de | lunes | a | sábado, | de | seis | de la mañana | a | diez | de la noche. | El | domingo, | solo | en | la | mañana.",
        "We're open | from | Monday | to | Saturday, | from | six | a.m. | to | ten | p.m. | On | Sunday, | only | in | the | morning.",
        "We're open Monday to Saturday, from six a.m. to ten p.m. On Sundays, just in the morning.", { flags: { 11: F_EL_DAY } }),
    ],
    have_yes: [t("¡Sí, | claro!", "Yes, | of course!", "Yes, we do!")],
    no_discount: [
      t("Ahorita | no hay | promociones, | pero | este | mes | no cobramos | inscripción.", "Right now | there are no | deals, | but | this | month | we don't charge | a sign-up fee.",
        "There aren't any deals right now, but there's no sign-up fee this month.",
        { flags: { 0: "Mexican: ahorita = right now." },
          neutral: t("Ahora | no hay | promociones, | pero | este | mes | no cobramos | inscripción.", "Now | there are no | deals, | but | this | month | we don't charge | a sign-up fee.",
            "There aren't any deals right now, but there's no sign-up fee this month.") }),
    ],
    have_no: [t("Perdón, | eso | no lo tenemos.", "Sorry, | that | we don't have it.", "Sorry, we don't have that.")],
    showers_info: [
      t("¡Sí! | Hay | regaderas | en | los | vestidores.", "Yes! | There are | showers | in | the | locker rooms.", "Yes! There are showers in the locker rooms.",
        { flags: { 2: "Mexican: regadera = shower; ducha is more widely used.", 5: "vestidores: the locker rooms (changing rooms)." },
          neutral: t("¡Sí! | Hay | duchas | en | los | vestidores.", "Yes! | There are | showers | in | the | locker rooms.", "Yes! There are showers in the locker rooms.") }),
    ],
    sauna_info: [t("No, | no tenemos | sauna, | perdón.", "No, | we don't have | a sauna, | sorry.", "No, we don't have a sauna, sorry.")],
    pool_info: [
      t("No tenemos | alberca, | ¡pero | la | playa | está | muy | cerca!", "We don't have | a pool, | but | the | beach | is | very | close!", "We don't have a pool, but the beach is really close!",
        { flags: { 1: "Mexican: alberca = swimming pool; piscina is more widely used." },
          neutral: t("No tenemos | piscina, | ¡pero | la | playa | está | muy | cerca!", "We don't have | a pool, | but | the | beach | is | very | close!", "We don't have a pool, but the beach is really close!") }),
    ],
    towels_info: [
      t("Hay que | traer | toalla | para | las | máquinas. | Si | no traes, | en | la | recepción | te | prestan | una.",
        "You have to | bring | a towel | for | the | machines. | If | you don't bring one, | at | the | front desk | (to) you | they lend | one.",
        "You need to bring a towel for the machines. If you didn't bring one, the front desk can lend you one."),
    ],
    parking_info: [t("Estacionamiento | no tenemos, | pero | puedes | estacionarte | en | la | calle.", "Parking | we don't have, | but | you can | park | on | the | street.", "We don't have a parking lot, but you can park on the street.")],
    classes_info: [t("¡Sí! | Zumba, | spinning | y | box. | Para | los | socios | son | gratis.", "Yes! | Zumba, | spinning | and | boxing. | For | the | members | they're | free.", "Yes! Zumba, spinning and boxing. They're free for members.")],
    classes_other: [t("Esa | clase | no, | perdón. | Tenemos | zumba, | spinning | y | box.", "That | class | no, | sorry. | We have | Zumba, | spinning | and | boxing.", "Sorry, not that class. We have Zumba, spinning, and boxing.")],
    wifi_info: [t("Sí, | la | contraseña | está | en | la | recepción.", "Yes, | the | password | is | at | the | front desk.", "Yes, the password is at the front desk.")],
    water_info: [t("Hay | agua | purificada | junto a | los | vestidores.", "There's | water | purified | next to | the | locker rooms.", "There's drinking water next to the locker rooms.",
      { flags: { 2: "agua purificada: drinking water; in Mexico you don't drink tap water." } })],
    trainer_info: [t("¡Sí! | ¡Soy | yo!", "Yes! | It's | me!", "Yes! That's me!")],
    restroom_info: [t("Los | baños | están | en | los | vestidores.", "The | restrooms | are | in | the | locker rooms.", "The restrooms are in the locker rooms.")],
    jordan_years: [t("¡Ocho | años! | Me encanta.", "Eight | years! | I love it.", "Eight years! I love it.")],
    jordan_every_day: [t("¡Casi | todos | los | días!", "Almost | all | the | days!", "Almost every day!")],

    // --- the form and paying ---------------------------------------------------------------------
    ask_form: [
      t("Ahora | llena | esta | ficha | y | fírmala | abajo.", "Now | fill out | this | form | and | sign it | at the bottom.", "Now just fill out this form and sign at the bottom."),
      t("Nada más | firma | esta | ficha | abajo, | por favor.", "Just | sign | this | form | at the bottom, | please.", "Just sign this form at the bottom, please."),
    ],
    form_reask: [t("Firma | abajo | cuando | estés | {m:listo|f:lista}.", "Sign | at the bottom | when | you're | ready.", "Just sign at the bottom when you're ready.")],
    ask_id: [t("Y | ¿me | prestas | una | identificación?", "And | (to) me | you lend | an | ID?", "And could I see your ID?",
      { flags: { 2: "¿Me prestas…?: a polite request to see it briefly; she gives it back." } })],
    sign_where: [t("Aquí, | abajo.", "Here, | at the bottom.", "Right here, at the bottom.")],
    pen_here: [
      t("Claro, | aquí tienes | una | pluma.", "Sure, | here's | a | pen.", "Sure, here's a pen.",
        { flags: { 3: "Mexican: pluma = pen; bolígrafo is more widely used." }, neutral: t("Claro, | aquí tienes | un | bolígrafo.", "Sure, | here's | a | pen.", "Sure, here's a pen.") }),
    ],
    form_is: [t("Es | la | ficha | de | inscripción: | tus | datos | y | tu | firma.", "It's | the | form | for | signing up: | your | details | and | your | signature.", "It's the sign-up form: your details and your signature.")],
    form_ok: [t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"), t("Listo, | ¡gracias!", "Done, | thanks!", "All set, thanks!")],
    need_sign: [t("Perdón, | necesito | tu | firma | antes de | empezar.", "Sorry, | I need | your | signature | before | starting.", "Sorry, I need your signature before we start.")],
    total_monthly: [t("Son | {$price} | del | primer | mes.", "It's | {$price} | for the | first | month.", "That's {$price} for the first month.")],
    total_day: [t("Son | {$price}.", "It's | {$price}.", "That'll be {$price}.")],
    // "¿Cuánto es?" right after the total
    total_again: [t("Serían | {$price}, | por favor.", "It would be | {$price}, | please.", "That's {$price}, please.")],
    // the total was said already (a side question in between)
    pay_reask: [t("Entonces, | ¿cómo | vas | a | pagar?", "So, | how | are you going | to | pay?", "So, how would you like to pay?")],
    ask_pay_method: [t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?")],
    card_tap: [t("¡Perfecto! | Acerca | tu | tarjeta | a | la | terminal.", "Perfect! | Bring close | your | card | to | the | terminal.", "Great! Just tap your card on the terminal.")],
    card_later: [t("Claro, | con | tarjeta | no hay problema.", "Sure, | with | card | no problem.", "Sure, card is fine.")],
    cash_ok: [t("Claro, | en efectivo | no hay problema.", "Sure, | in cash | no problem.", "Sure, cash is fine.")],
    phone_later: [t("Claro, | con | el | celular | también | se puede.", "Sure, | with | the | phone | also | it's possible.", "Sure, you can pay with your phone too.")],
    transfer_later: [t("Claro, | también | aceptamos | transferencia.", "Sure, | also | we accept | transfer.", "Sure, we take bank transfers too.")],
    // "No tengo tarjeta" / "No traigo efectivo" at the total: the other way is offered, nothing is charged yet
    // no card and no cash
    pay_alt: [t("Bueno, | también | puedes | pagar | con | el | celular | o | por | transferencia.", "Okay, | also | you can | pay | with | the | phone | or | by | transfer.",
      "Okay, you can also pay with your phone or by bank transfer.")],
    cash_then: [t("Claro, | entonces | en efectivo.", "Sure, | then | in cash.", "Sure, cash then.")],
    card_then: [t("No hay problema, | con | tarjeta | entonces.", "No problem, | with | card | then.", "No problem, card then.")],
    phone_ok: [t("¡Claro! | Acerca | tu | celular | a | la | terminal.", "Sure! | Bring close | your | phone | to | the | terminal.", "Sure! Just hold your phone to the terminal.")],
    transfer_ok: [t("Claro. | Te | paso | la | cuenta | y | me | enseñas | el | comprobante.", "Sure. | (To) you | I give | the | account | and | (to) me | you show | the | confirmation.",
      "Sure. I'll give you the account number, and you show me the confirmation.")],
    // "¿Puedo pagar con tarjeta o en efectivo?": a question about both, never a payment
    pay_both: [t("Sí, | aceptamos | las | dos.", "Yes, | we accept | the | two.", "Yes, we take both.")],
    // cash with an amount (rule 18): less than the total, or more (change)
    cash_short: [t("Perdón, | son | {$price}.", "Sorry, | it's | {$price}.", "Sorry, it's {$price}.")],
    your_change: [t("Y | tu | cambio.", "And | your | change.", "And here's your change.")],
    // the ID handed over at the total (asked for at the form): it goes back, nothing is paid
    id_back: [t("Gracias. | Aquí | te | la | regreso.", "Thanks. | Here | (to) you | it | I give back.", "Thanks. Here's your ID back.",
      { flags: { 3: "la: it (la identificación)." } })],
    paid: [t("¡Gracias!", "Thanks!", "Thank you!"), t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!")],
    member_card: [
      t("Aquí está | tu | credencial. | La | pasas | por | el | lector | en | la | entrada.", "Here's | your | membership card. | It | you swipe | through | the | reader | at | the | entrance.",
        "Here's your membership card. Just scan it at the entrance.", { flags: { 3: "La before a verb is a pronoun: it (the card)." } }),
    ],
    wristband: [t("Aquí tienes | tu | pulsera | de | hoy.", "Here's | your | wristband | for | today.", "Here's your wristband for today.")],

    // --- the locker room -------------------------------------------------------------------------
    ask_change: [
      t("¡Muy | bien! | ¿Te | quieres | cambiar | primero?", "Very | good! | (Yourself) | you want | to change | first?", "Great! Do you want to change first?",
        { flags: { 2: "te: cambiarse (to change your clothes) takes a pronoun for the person." } }),
      t("¿Necesitas | cambiarte | antes de | empezar?", "Do you need | to change | before | starting?", "Do you need to change before we start?"),
    ],
    // asked again after a side question
    change_reask: [t("Entonces, | ¿te | cambias | primero?", "So, | (yourself) | you change | first?", "So, are you changing first?", { flags: { 1: "te: cambiarse (to change your clothes) takes a pronoun for the person." } })],
    lockers_info: [
      t("Los | vestidores | están | al fondo, | a la derecha.", "The | locker rooms | are | at the back, | on the right.", "The locker rooms are at the back, on the right."),
      t("Los | vestidores | están | ahí, | a la izquierda.", "The | locker rooms | are | there, | on the left.", "The locker rooms are right over there, on the left."),
    ],
    bring_lock: [t("¿Trajiste | candado?", "Did you bring | a lock?", "Did you bring a lock?")],
    lock_yes: [t("¡Perfecto!", "Perfect!", "Perfect!")],
    lock_buy: [t("¡No hay problema! | En | la | recepción | venden | candados.", "No problem! | At | the | front desk | they sell | locks.", "No problem! They sell locks at the front desk.")],
    lock_need_info: [
      t("Sí, | para | los | lockers. | En | la | recepción | venden.", "Yes, | for | the | lockers. | At | the | front desk | they sell (them).", "Yes, for the lockers. You can buy one at the front desk.",
        { flags: { 3: "Mexican: lockers (from English); casilleros is more widely used." },
          neutral: t("Sí, | para | los | casilleros. | En | la | recepción | venden.", "Yes, | for | the | lockers. | At | the | front desk | they sell (them).", "Yes, for the lockers. You can buy one at the front desk.") }),
    ],
    lock_borrow_ok: [t("¡Claro! | Pregunta | en | la | recepción.", "Sure! | Ask | at | the | front desk.", "Sure! Just ask at the front desk.")],
    towels_water_tip: [
      t("Trae | toalla | para | las | máquinas, | y | el | agua | está | junto a | los | vestidores.", "Bring | a towel | for | the | machines, | and | the | water | is | next to | the | locker rooms.",
        "Bring a towel for the machines, and there's drinking water next to the locker rooms."),
    ],
    lets_go: [t("¡Perfecto, | vamos!", "Perfect, | let's go!", "Great, let's go!")],
    see_you_back: [
      t("¡Aquí | te | espero!", "Here | (for) you | I'll wait!", "I'll wait for you here!"),
      t("Tómate tu tiempo. | Aquí | estoy.", "Take your time. | Here | I am.", "Take your time. I'll be right here."),
    ],

    // --- the warm-up -----------------------------------------------------------------------------
    warmup: [
      t("¡Bueno, | empezamos! | Primero, | calentamos: | cinco | minutos | en | la | caminadora | o | en | la | bici.",
        "Okay, | we start! | First, | we warm up: | five | minutes | on | the | treadmill | or | on | the | bike.",
        "Okay, let's start! Warm up first: five minutes on the treadmill or the bike."),
      t("¡Empezamos! | Primero, | calentamos: | cinco | minutos | en | la | bici | o | en | la | caminadora.",
        "We start! | First, | we warm up: | five | minutes | on | the | bike | or | on | the | treadmill.",
        "Let's start! Warm up first: five minutes on the bike or the treadmill."),
    ],
    warmup_which: [t("¿Cuál | prefieres?", "Which | do you prefer?", "Which one do you prefer?"), t("¿Cuál | quieres?", "Which | do you want?", "Which one?")],
    warm_reask: [t("Entonces, | ¿la | caminadora | o | la | bici?", "So, | the | treadmill | or | the | bike?", "So, the treadmill or the bike?")],
    warm_ok: [
      t("¡Muy | bien! | Con calma, | no | muy | rápido.", "Very | good! | Nice and easy, | not | too | fast.", "Great! Nice and easy, not too fast."),
      t("¡Perfecto! | Empieza | despacio, | con calma.", "Perfect! | Start | slowly, | nice and easy.", "Perfect! Start slow, nice and easy."),
    ],
    warm_pick_bike: [t("Entonces, | la | bici: | es | suave | para | las | rodillas.", "Then, | the | bike: | it's | gentle | for | the | knees.", "Then let's do the bike. It's easy on the knees.")],
    warm_pick_tread: [t("Entonces, | la | caminadora. | Nada más | camina.", "Then, | the | treadmill. | Just | walk.", "Then let's do the treadmill. Just walk.")],
    warm_other_ok: [t("Claro, | la | elíptica | también | está | muy | bien.", "Sure, | the | elliptical | also | is | very | good.", "Sure, the elliptical is great too.")],
    warm_how_long: [t("Nada más | cinco | minutos.", "Just | five | minutes.", "Just five minutes.")],
    warm_how_fast: [
      t("Con calma. | Tienes | que | poder | platicar.", "Nice and easy. | You have | to | be able | to chat.", "Nice and easy. You should be able to talk.",
        { flags: { 4: "Mexican: platicar = to chat; hablar is more widely used." },
          neutral: t("Con calma. | Tienes | que | poder | hablar.", "Nice and easy. | You have | to | be able | to talk.", "Nice and easy. You should be able to talk.") }),
    ],
    warm_why: [t("Prepara | los | músculos.", "It prepares | the | muscles.", "It gets your muscles ready.")],
    warmed_up: [
      t("¡Listo, | cinco | minutos! | Ya | calentaste.", "Done, | five | minutes! | Already | you warmed up.", "Okay, that's five minutes! You're warmed up."),
      t("¡Tiempo! | Ya | estás | {m:listo|f:lista}.", "Time! | Now | you're | ready.", "Time's up! You're warmed up."),
    ],
    feel_q: [
      t("¿Cómo | te sientes?", "How | do you feel?", "How do you feel?"),
      t("¿Qué tal? | ¿Cómo | vas?", "How's it going? | How | are you doing?", "How are you feeling?"),
    ],
    feel_good_reply: [t("¡Eso! | Vas | muy | bien.", "That's it! | You're going | very | well.", "Awesome! You're doing great."), t("¡Excelente!", "Excellent!", "Great!")],
    feel_tired_reply: [t("Es | normal. | ¡Vas | muy | bien!", "It's | normal. | You're going | very | well!", "That's normal. You're doing great!")],

    // --- the machine -----------------------------------------------------------------------------
    machine_intro: [
      t("Ahora, | {X.the}. | Mmm, | tiene | una | toalla | encima.", "Now, | {X.the}. | Hmm, | it has | a | towel | on top.", "Next: {X.the}. Hmm, there's a towel on it."),
      t("Vamos | a | {X.the}. | Ay, | alguien | dejó | una | botella | de | agua | ahí.", "Let's go | to | {X.the}. | Oh, | someone | left | a | bottle | of | water | there.",
        "Let's try {X.the}. Oh, someone left a water bottle on it."),
    ],
    machine_next: [t("Ahora, | {X.the}.", "Now, | {X.the}.", "Next: {X.the}.")],
    out_of_order: [
      t("¡Ay, | no! | Hoy | no funciona. | Usamos | {el@X} | otra, | junto a | la | pared.", "Oh, | no! | Today | it isn't working. | We'll use | the | other one, | by | the | wall.",
        "Oh no, it's out of order today. Let's use the other one, by the wall."),
    ],
    other_towel: [t("Pero | tiene | una | toalla | encima.", "But | it has | a | towel | on top.", "But there's a towel on it.")],
    machine_nudge: [t("Anda, | pregunta | si | está | libre.", "Go on, | ask | if | it's | free.", "Go ahead and ask if it's free.")],
    machine_ok_asked: [
      t("A ver... | ¡Está | libre! | Adelante.", "Let's see... | It's | free! | Go ahead.", "Let me check... It's free! Go ahead."),
      t("¡Buena | pregunta! | Ya | terminó. | La | máquina | es | toda | tuya.", "Good | question! | Already | he's finished. | The | machine | is | all | yours.",
        "Good question! He's done. It's all yours!"),
    ],
    machine_ok: [t("A ver... | ¡Está | libre! | Adelante.", "Let's see... | It's | free! | Go ahead.", "Let me check... It's free! Go ahead.")],
    this_is_x: [t("Esta | es | {X.the}.", "This | is | {X.the}.", "This is {X.the}.")],
    machine_nudge_other: [t("Anda, | pregunta | si | la | otra | está | libre.", "Go on, | ask | if | the | other one | is | free.", "Go ahead and ask if the other one is free.")],
    broken_info: [t("Está | descompuesta. | Mañana | la | arreglan.", "It's | broken. | Tomorrow | it | they fix.", "It's broken. They're fixing it tomorrow.", { flags: { 3: "la before a verb is a pronoun: it (the machine)." } })],
    not_broken: [t("Nada, | funciona | bien.", "Nothing, | it works | fine.", "Nothing, it works fine!")],

    // --- sets, reps, weight ----------------------------------------------------------------------
    sets_explain_leg: [
      t("Siéntate | aquí, | pon | los | pies | en | la | plataforma | y | empuja | despacio.", "Sit down | here, | put | the | feet | on | the | platform | and | push | slowly.",
        "Sit here, put your feet on the platform, and push slowly.", { flags: { 3: "los (the): Spanish uses the article for your own body parts." } }),
    ],
    sets_explain_chest: [t("Siéntate | aquí, | agarra | las | manijas | y | empuja | despacio.", "Sit down | here, | grab | the | handles | and | push | slowly.", "Sit here, hold the handles, and push slowly.")],
    any_questions: [
      t("¿Alguna | pregunta?", "Any | question?", "Any questions?"),
      t("¿Alguna | pregunta | antes de | empezar?", "Any | question | before | starting?", "Any questions before you start?"),
    ],
    any_other: [t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?")],
    ask_away: [t("¡Claro! | Dime.", "Sure! | Tell me.", "Sure! Go ahead.")],
    sets_answer: [
      t("Tres | series | de | diez | repeticiones.", "Three | sets | of | ten | reps.", "Three sets of ten reps."),
      t("Tres | series | de | diez. | ¡Yo | las | cuento | contigo!", "Three | sets | of | ten. | I | them | count | with you!", "Three sets of ten! I'll count them with you!", { flags: { 5: "las before a verb is a pronoun: them (the sets)." } }),
      t("Vamos | a | hacer | tres | series | de | diez.", "We're going | to | do | three | sets | of | ten.", "Let's do three sets of ten."),
    ],
    rest_tip: [t("Descansa | más o menos | un | minuto | entre | series.", "Rest | about | one | minute | between | sets.", "Rest about a minute between sets.")],
    rest_answer: [t("Más o menos | un | minuto | entre | series.", "About | one | minute | between | sets.", "About a minute between sets.")],
    weight_leg: [t("Empezamos | ligero: | cuarenta | kilos.", "We start | light: | forty | kilos.", "Let's start light: forty kilos.")],
    weight_chest: [t("Empezamos | ligero: | quince | kilos.", "We start | light: | fifteen | kilos.", "Let's start light: fifteen kilos.")],
    // "¿Es muy pesado?" (a question, not "I can't")
    light_answer: [t("No, | es | ligero. | Vamos | despacio.", "No, | it's | light. | We're going | slowly.", "No, it's light. We'll take it slow.")],
    bar_weight: [t("Es | nada más | la | barra: | veinte | kilos.", "It's | just | the | bar: | twenty | kilos.", "It's just the bar: twenty kilos.")],
    lb_note: [
      t("Aquí | hablamos | en | kilos. | Un | kilo | son | como | dos | libras.", "Here | we talk | in | kilos. | One | kilo | is | about | two | pounds.",
        "We use kilos here. One kilo is about two pounds.", { flags: { 7: "como before a number = about, roughly." } }),
    ],
    how_right: [t("¡Sí, | perfecto! | Despacio | y | con | control.", "Yes, | perfect! | Slowly | and | with | control.", "Yes, perfect! Nice and slow.")],
    rep_count: [
      t("¡Vamos! | ¡Última | serie! | Ocho, | nueve… | ¡Una | más!", "Let's go! | Last | set! | Eight, | nine… | One | more!", "Let's go! Last set! Eight, nine… One more rep!"),
      t("Y | ahora, | ¡la | última | serie! | Ocho, | nueve… | ¡Una | más!", "And | now, | the | last | set! | Eight, | nine… | One | more!", "And now the last set! Eight, nine… One more rep!"),
      t("¡Empuja! | Ocho, | nueve… | ¡Una | más! | ¡Tú | puedes!", "Push! | Eight, | nine… | One | more! | You | can!", "Push! Eight, nine… One more rep! You can do it!"),
      t("¡Ándale! | Ocho, | nueve… | ¡Una | más!", "Come on! | Eight, | nine… | One | more!", "Come on! Eight, nine… One more rep!",
        { flags: { 0: "Mexican: ¡ándale! = come on, go!" }, neutral: t("¡Vamos! | Ocho, | nueve… | ¡Una | más!", "Come on! | Eight, | nine… | One | more!", "Come on! Eight, nine… One more rep!") }),
    ],
    one_more_again: [
      t("¡Vamos! | ¡Una | más!", "Come on! | One | more!", "Come on! One more rep!"),
      t("¡Échale ganas! | ¡Una | más!", "Give it your all! | One | more!", "You've got this! One more rep!",
        { flags: { 0: "Mexican: échale ganas = give it your all." }, neutral: t("¡Ánimo! | ¡Una | más!", "Come on! | One | more!", "You've got this! One more rep!") }),
    ],
    good_job: [t("¡Muy | bien! | ¡Tres | series!", "Very | good! | Three | sets!", "Good job! That's three sets!"), t("¡Eso! | ¡Excelente!", "That's it! | Excellent!", "Yes! Nice work!")],
    cant_reply: [t("¡Sí | puedes! | ¡Empuja! | ¡Eso! | ¡Muy | bien!", "Yes | you can! | Push! | That's it! | Very | good!", "Yes, you can! Push! Yes! Good job!")],
    cant_general: [t("¡Claro que | puedes! | Aquí | estoy.", "Of course | you can! | Here | I am.", "Sure you can! I'm right here.")],

    // --- pain ------------------------------------------------------------------------------------------
    okay_q: [t("¡Uy! | ¿Estás | bien?", "Whoa! | Are you | okay?", "Whoa, are you okay?")],
    pain_reply: [t("Para | ahí. | Vamos | a | probar | algo | más | ligero.", "Stop | there. | We're going | to | try | something | more | light.", "Stop right there. Let's try something easier.")],
    arms_instead: [t("Mejor | trabajamos | los | brazos.", "Better | we work | the | arms.", "Let's work on your arms instead.")],
    pain_stop: [t("Bueno, | aquí | paramos.", "Okay, | here | we stop.", "Okay, let's stop here.")],
    easy_tonight: [t("¡Ay, | no! | Descansa | esta | noche, | ¿sí?", "Oh, | no! | Rest | this | night, | okay?", "Oh no! Rest up tonight, okay?")],
    feel_now_q: [
      t("Bueno. | ¿Cómo | te sientes | ahora?", "Okay. | How | do you feel | now?", "Okay. How do you feel now?"),
      t("Con calma. | ¿Y | ahora | cómo | te sientes?", "Nice and easy. | And | now | how | do you feel?", "Nice and easy. How do you feel now?"),
    ],
    stretch_instead: [t("Mejor | hacemos | unos | estiramientos | suaves.", "Better | we do | some | stretches | gentle.", "Let's do some easy stretching instead.")],
    easy_today: [t("Bueno, | hoy | nada | pesado.", "Okay, | today | nothing | heavy.", "Okay, nothing heavy today.")],
    fine_reply: [t("¡Qué | bueno! | Pero | si | algo | te duele, | me | dices.", "How | good! | But | if | something | hurts you, | (to) me | you tell.", "Great! But tell me if anything hurts.")],
    okay_tired: [t("¡Es | normal! | Pero | si | algo | te duele, | me | dices.", "It's | normal! | But | if | something | hurts you, | (to) me | you tell.", "That's normal! But tell me if anything hurts.")],
    what_hurts: [t("¡Ay, | no! | ¿Qué | te duele?", "Oh, | no! | What | hurts you?", "Oh no! What hurts?")],
    // "No me duele la rodilla" said aloud: "No, me duele…" or "It doesn't hurt"? (rule 10)
    pain_amb: [t("Perdón, | ¿entonces | te duele | o | no?", "Sorry, | so | does it hurt | or | not?", "Sorry, so does it hurt or not?")],

    // --- spotting --------------------------------------------------------------------------------
    spot_intro: [
      t("¡Ahora, | el | press de banca! | Acuéstate | en | la | banca.", "Now, | the | bench press! | Lie down | on | the | bench.", "Now, the bench press! Lie down on the bench."),
      t("Vamos | a | probar | el | press de banca. | Acuéstate | en | la | banca.", "We're going | to | try | the | bench press. | Lie down | on | the | bench.", "Let's try the bench press. Lie down on the bench."),
    ],
    // after "Mejor trabajamos los brazos." (never a second "Vamos a probar…")
    spot_intro_now: [t("¡Ahora, | el | press de banca! | Acuéstate | en | la | banca.", "Now, | the | bench press! | Lie down | on | the | bench.", "Now, the bench press! Lie down on the bench.")],
    bar_only: [t("Hoy, | nada más | la | barra: | veinte | kilos.", "Today, | just | the | bar: | twenty | kilos.", "Just the bar today: twenty kilos.")],
    spot_ready: [t("¿{m:Listo|f:Lista}?", "Ready?", "Ready?")],
    spot_yes: [
      t("¡Claro! | Aquí | me quedo.", "Of course! | Here | I'll stay.", "Of course! I'll stay right here."),
      t("¡Claro! | Yo | te | cuido.", "Sure! | I | you | will watch.", "Sure thing! I'll spot you.", { flags: { 3: "cuidar (to look after) = to spot someone in the gym." } }),
    ],
    spot_offer: [t("No te preocupes, | yo | te | cuido. | Aquí | estoy.", "Don't worry, | I | you | will watch. | Here | I am.", "Don't worry, I'll spot you. I'm right here.",
      { flags: { 3: "cuidar (to look after) = to spot someone in the gym." } })],
    bench_go: [
      t("Baja | la | barra | despacio… | ¡y | empuja! | ¡Muy | bien!", "Lower | the | bar | slowly… | and | push! | Very | good!", "Lower the bar slowly… and push! Good job!"),
      t("¡Empuja! | ¡Empuja! | ¡Una | más! | ¡Eso! | ¡Excelente!", "Push! | Push! | One | more! | That's it! | Excellent!", "Push! Push! One more rep! Yes! Great job!"),
    ],
    no_spot_reply: [t("Bueno, | pero | me quedo | cerca, | por si acaso.", "Okay, | but | I'll stay | close, | just in case.", "Okay, but I'll stay close, just in case.")],

    // --- out of breath ---------------------------------------------------------------------------
    finisher: [
      t("El | último: | un | minuto | en | la | remadora. | ¡Dale, | dale, | dale!", "The | last one: | one | minute | on | the | rowing machine. | Go, | go, | go!",
        "Last one: one minute on the rowing machine. Go, go, go!"),
    ],
    finisher_easy: [t("El | último: | un | minuto | suave | en | la | bici.", "The | last one: | one | minute | easy | on | the | bike.", "Last one: one easy minute on the bike.")],
    time_feel: [t("¡Tiempo! | ¿Cómo | te sientes?", "Time! | How | do you feel?", "Time! How do you feel?")],
    break_water: [
      t("Descansa | y | toma | agua.", "Rest | and | drink | water.", "Take a break and grab some water."),
      t("¡Es | normal! | Descansa | y | toma | agua.", "It's | normal! | Rest | and | drink | water.", "That's normal! Take a break and grab some water."),
    ],
    earned_it: [t("¡Te lo | ganaste!", "It (for yourself) | you earned!", "You earned it!")],
    ok_water: [t("¡Bien! | Toma | agua.", "Good! | Drink | water.", "Good! Grab some water.")],
    great_shape: [
      t("¡Uy, | estás | en | muy | buena | forma! | Igual, | toma | agua.", "Wow, | you're | in | very | good | shape! | Still, | drink | water.", "Wow, you're in great shape! Still, grab some water."),
    ],

    // --- next time -------------------------------------------------------------------------------
    same_time_q: [
      t("¡Muy | buen | trabajo | hoy! | ¿Mañana | a | la | misma | hora?", "Very | good | work | today! | Tomorrow | at | the | same | time?", "Great work today! Same time tomorrow?"),
      t("¡Lo | hiciste | muy | bien! | ¿Mañana | a | la | misma | hora?", "It | you did | very | well! | Tomorrow | at | the | same | time?", "You did great! Same time tomorrow?"),
    ],
    same_time_short: [t("¿Mañana | a | la | misma | hora?", "Tomorrow | at | the | same | time?", "Same time tomorrow?")],
    great_workout: [t("¡Excelente | entrenamiento!", "Excellent | workout!", "Great workout!")],
    when_short: [t("Y | ¿cuándo | quieres | regresar?", "And | when | do you want | to come back?", "So, when do you want to come back?")],
    see_tomorrow: [
      t("¡Perfecto! | ¡Nos vemos | mañana!", "Perfect! | See you | tomorrow!", "Awesome! See you tomorrow!"),
      t("¡Excelente! | Mañana, | a | la | misma | hora.", "Excellent! | Tomorrow, | at | the | same | time.", "Perfect! See you tomorrow, same time!"),
    ],
    see_tomorrow_plain: [t("¡Perfecto! | ¡Nos vemos | mañana!", "Perfect! | See you | tomorrow!", "Awesome! See you tomorrow!")],
    see_day: [t("¿El | {X}? | ¡Claro! | ¡Nos vemos | el | {X}!", "On | {X}? | Sure! | See you | on | {X}!", "{X}? Sure! See you {X}!", { flags: { 0: F_EL_DAY, 4: F_EL_DAY } })],
    // the day she offered herself ("¿Qué tal el jueves?" → "Sí"): no "¿El jueves?" back
    see_day_plain: [t("¡Perfecto! | ¡Nos vemos | el | {X}!", "Perfect! | See you | on | {X}!", "Great! See you {X}!", { flags: { 2: F_EL_DAY } })],
    offer_thursday: [t("¡No hay problema! | ¿Qué tal | el | jueves?", "No problem! | How about | — | Thursday?", "No problem! How about Thursday?", { flags: { 2: F_EL_DAY } })],
    // "No puedo el jueves" at "¿Mañana a la misma hora?": "can't on Thursday" or "can't; Thursday?" (rule 10)
    day_amb: [t("Perdón, | ¿entonces | el | {X}?", "Sorry, | so | — | {X}?", "Sorry, so {X}, then?", { flags: { 2: F_EL_DAY } })],
    see_then: [t("¡Perfecto! | ¡Nos vemos!", "Perfect! | See you!", "Sounds good! See you then!")],
    book_later_ok: [t("¡No hay problema! | Nada más | me | mandas | un | mensaje.", "No problem! | Just | (to) me | you send | a | message.", "No problem! Just send me a message.")],
    same_as_today: [t("A | la | misma | hora | que | hoy.", "At | the | same | time | as | today.", "Same time as today!")],
    closing: [
      t("¡Y | no olvides | estirar!", "And | don't forget | to stretch!", "And don't forget to stretch!"),
      t("Lo | hiciste | muy | bien | hoy. | ¡Toma | mucha | agua!", "It | you did | very | well | today. | Drink | a lot of | water!", "You did great today. Drink lots of water!"),
    ],

    // --- general ---------------------------------------------------------------------------------
    ack: [t("¡Bueno!", "Okay!", "Okay!"), t("Entendido.", "Got it.", "Got it."), t("¡Perfecto!", "Perfect!", "Sounds good.")],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    // the closing goodbye in tú (global g_bye has an usted variant)
    bye_tu: [
      t("¡Nos vemos!", "See you!", "See you!"),
      t("¡Cuídate!", "Take care!", "Take care!"),
      t("¡Hasta luego! | ¡Que | te | vaya | bien!", "See you later! | (I hope) | (for) you | it-goes | well!", "See you! Take care!"),
    ],
  },

  domains: {
    price: () => [MONTHLY, VISIT],
    amount: () => [VISIT],
  },

  hints: {
    new: {
      lt: "Say it's your first time here",
      items: [
        { id: "new_here", s: t("¡Hola, | soy | {m:nuevo|f:nueva} | aquí!", "Hi, | I am | new | here!", "Hi, I'm new here!") },
        { id: "first_time", s: t("Es | mi | primera | vez | aquí.", "It's | my | first | time | here.", "It's my first time here.") },
        { id: "join", s: t("Quiero | inscribirme.", "I want | to sign up.", "I'd like to sign up."), note: "With a trainer, tú is normal: Mexican gyms are casual." },
        { id: "become_member", s: t("Quisiera | hacerme | {m:socio|f:socia}.", "I'd like | to become | a member.", "I'd like to become a member.") },
        { id: "how_join", s: t("¿Cómo | me inscribo?", "How | do I sign up?", "How do I sign up?") },
      ],
    },
    plan: {
      lt: "Choose a membership", slot: "plan", examples: ["monthly", "day_pass"],
      items: [
        { id: "take_plan", s: t("Me quedo con | {X.the}.", "I'll go with | {X.the}.", "I'll go with {X.the}.") },
        { id: "like_plan", s: t("Quiero | {X.the}, | por favor.", "I want | {X.the}, | please.", "I'd like {X.the}, please."), note: "With “por favor” this is perfectly polite." },
        { id: "plan_short", s: t("{X.the}, | por favor.", "{X.the}, | please.", "{X.the}, please.") },
        { id: "just_today", s: t("Solo | por | hoy, | por favor.", "Just | for | today, | please.", "Just for today, please."), note: "Say this if you only want a single visit." },
      ],
    },
    plan_ask: {
      lt: "Ask about the membership",
      items: [
        { id: "q_price", s: t("¿Cuánto | cuesta | la | mensualidad?", "How much | costs | the | monthly membership?", "How much is the monthly membership?") },
        { id: "q_included", s: t("¿Qué | incluye?", "What | does it include?", "What's included?") },
        { id: "q_fee", s: t("¿Cobran | inscripción?", "Do you charge | a sign-up fee?", "Is there a sign-up fee?"), note: "La inscripción: a one-time fee most Mexican gyms charge." },
        { id: "q_cancel", s: t("¿Puedo | cancelar | cuando | quiera?", "Can I | cancel | when | I want?", "Can I cancel anytime?") },
        { id: "q_hours", s: t("¿Qué | horario | tienen?", "What | hours | do you have?", "What are your hours?"), note: "Tienen (ustedes): you're asking about the whole gym." },
        { id: "q_have", s: t("¿Tienen | clases?", "Do you have | classes?", "Do you have classes?") },
        { id: "q_have", s: t("¿Tienen | regaderas?", "Do you have | showers?", "Do you have showers?",
          { flags: { 1: "Mexican: regadera = shower; ducha is more widely used." }, neutral: t("¿Tienen | duchas?", "Do you have | showers?", "Do you have showers?") }) },
      ],
    },
    form: {
      lt: "Fill out and sign the form",
      items: [
        { id: "here_you_go", s: t("Aquí tienes.", "Here you go.", "Here you go.") },
        { id: "form_done", s: t("Listo, | ya está.", "Done, | that's it.", "Okay, all done.") },
        { id: "q_sign", s: t("¿Dónde | firmo?", "Where | do I sign?", "Where do I sign?") },
        { id: "q_pen", s: t("¿Me | prestas | una | pluma?", "(To) me | you lend | a | pen?", "Can I borrow a pen?",
          { flags: { 3: "Mexican: pluma = pen; bolígrafo is more widely used." }, neutral: t("¿Me | prestas | un | bolígrafo?", "(To) me | you lend | a | pen?", "Can I borrow a pen?") }) },
        { id: "q_form", s: t("¿Para | qué | es | esta | hoja?", "For | what | is | this | sheet?", "What's this form for?") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Pago | en efectivo.", "I'll pay | in cash.", "I'll pay in cash.") },
        { id: "here_you_go", s: t("Aquí tienes.", "Here you go.", "Here you go.") },
        { id: "pay_phone", s: t("¿Puedo | pagar | con | el | celular?", "Can I | pay | with | the | phone?", "Can I pay with my phone?") },
      ],
    },
    lockers: {
      lt: "Ask about the locker room",
      items: [
        { id: "where_lockers", s: t("¿Dónde | están | los | vestidores?", "Where | are | the | locker rooms?", "Where are the locker rooms?") },
        { id: "where_change", s: t("¿Dónde | me cambio?", "Where | do I change?", "Where can I change?") },
        { id: "where_bag", s: t("¿Dónde | dejo | mi | mochila?", "Where | do I leave | my | backpack?", "Where can I leave my bag?") },
        { id: "q_have", s: t("¿Tienen | toallas?", "Do you have | towels?", "Do you have towels?") },
        { id: "q_water", s: t("¿Dónde | hay | agua?", "Where | is there | water?", "Where can I get water?") },
        { id: "ready", s: t("No, | ya | estoy | {m:listo|f:lista}.", "No, | already | I'm | ready.", "No, I'm ready!") },
      ],
    },
    lock: {
      lt: "Say whether you have a lock",
      items: [
        { id: "lock_have", s: t("Sí, | traigo | uno.", "Yes, | I've got | one.", "Yes, I brought one.", { flags: { 1: "traer: here, to have with you." } }) },
        { id: "lock_forgot", s: t("No, | se me olvidó.", "No, | I forgot it.", "No, I forgot it.") },
        { id: "lock_borrow", s: t("¿Dónde | compro | uno?", "Where | do I buy | one?", "Where can I get one?") },
      ],
    },
    warmup: {
      lt: "Choose how to warm up", slot: "cardio", examples: ["bike", "treadmill"],
      items: [
        { id: "warm_the", s: t("{X.the}, | por favor.", "{X.the}, | please.", "{X.the}, please.") },
        { id: "warm_take", s: t("Voy | a | usar | {X.the}.", "I'm going | to | use | {X.the}.", "I'll take {X.the}.") },
        { id: "warm_prefer", s: t("Prefiero | {X.the}.", "I prefer | {X.the}.", "I'd rather do {X.the}.") },
        { id: "q_how_long", s: t("¿Cuánto | tiempo?", "How much | time?", "For how long?") },
      ],
    },
    feel: {
      lt: "Say how you feel",
      items: [
        { id: "feel_great", s: t("¡Me siento | muy | bien!", "I feel | very | good!", "I feel great!") },
        { id: "feel_warm", s: t("Ya | entré en calor.", "Already | I warmed up.", "I'm warm now.") },
        { id: "feel_tired", s: t("Un poco | {m:cansado|f:cansada}.", "A little | tired.", "A little tired.") },
      ],
    },
    machine: {
      lt: "Ask if the machine is free",
      items: [
        { id: "machine_free", s: t("¿Está | libre | esta | máquina?", "Is | free | this | machine?", "Is this machine free?") },
        { id: "anyone_using", s: t("¿Alguien | la | está | usando?", "Someone | it | is | using?", "Is anyone using this?", { flags: { 1: "la before a verb is a pronoun: it (la máquina)." } }) },
        { id: "you_using", s: t("Perdón, | ¿la | estás | usando?", "Excuse me, | it | are you | using?", "Excuse me, are you using this?", { flags: { 1: "la before a verb is a pronoun: it (la máquina)." } }), note: "Ask the person sitting at the machine." },
        { id: "much_left", s: t("¿Te falta | mucho?", "Do you have left | much?", "Are you almost done?"), note: "The polite way to ask someone who's using it." },
        { id: "can_use", s: t("¿Puedo | usar | esta | máquina?", "Can I | use | this | machine?", "Can I use this machine?") },
      ],
    },
    broken: {
      lt: "Ask what happened",
      items: [
        { id: "q_broken", s: t("¿Qué | le | pasó?", "What | (to) it | happened?", "What's wrong with it?") },
      ],
    },
    sets: {
      lt: "Ask how to do the exercise",
      items: [
        { id: "how_many_sets", s: t("¿Cuántas | series | hago?", "How many | sets | do I do?", "How many sets should I do?") },
        { id: "how_many_reps", s: t("¿Cuántas | repeticiones?", "How many | reps?", "How many reps?"), note: "Una repetición = one rep; una serie = one set." },
        { id: "q_weight", s: t("¿Cuánto | peso | le | pongo?", "How much | weight | (on) it | do I put?", "How much weight should I use?") },
        { id: "q_rest", s: t("¿Cuánto | descanso?", "How much | do I rest?", "How long should I rest?") },
        { id: "q_how", s: t("¿Cómo | funciona | esta | máquina?", "How | works | this | machine?", "How does this machine work?") },
        { id: "ready", s: t("¡Estoy | {m:listo|f:lista}!", "I'm | ready!", "I'm ready!") },
      ],
    },
    rep: {
      lt: "Do the last rep",
      items: [
        { id: "one_more", s: t("¡Bueno, | una | más!", "Okay, | one | more!", "Okay, one more!") },
        { id: "done_it", s: t("¡Listo! | ¡Lo | logré!", "Done! | It | I managed!", "Done! I did it!") },
        { id: "was_hard", s: t("¡Uf! | ¡Estuvo | pesado!", "Phew! | It was | heavy!", "Phew! That was hard!"), note: "Pesado (heavy) also means hard, tough." },
      ],
    },
    pain: {
      lt: "Say that something hurts",
      items: [
        { id: "knee_hurts", s: t("Me duele | la | rodilla.", "Hurts (me) | the | knee.", "My knee hurts.", { flags: { 0: F_DUELE } }) },
        { id: "back_hurts", s: t("Me duele | un poco | la | espalda.", "Hurts (me) | a little | the | back.", "My back hurts a little.", { flags: { 0: F_DUELE } }) },
        { id: "im_fine", s: t("Estoy | bien, | gracias.", "I'm | fine, | thanks.", "I'm fine, thanks.") },
      ],
    },
    spot: {
      lt: "Ask the trainer to spot you",
      items: [
        { id: "spot_me", s: t("¿Me | ayudas | con | la | barra?", "(To) me | you help | with | the | bar?", "Can you spot me?"), note: "To spot: stand by and help if the bar gets too heavy." },
        { id: "stay_close", s: t("¿Te quedas | cerca?", "Will you stay | close?", "Can you stay close?") },
        { id: "q_bar", s: t("¿Cuánto | pesa | la | barra?", "How much | weighs | the | bar?", "How much does the bar weigh?") },
      ],
    },
    // back from the locker room ("¡Aquí te espero!")
    changed: {
      lt: "Say you're back",
      items: [
        { id: "im_back", s: t("¡Ya | volví!", "Already | I came back!", "I'm back!") },
        { id: "ready", s: t("Ya | estoy | {m:listo|f:lista}.", "Now | I'm | ready.", "Okay, I'm ready!") },
      ],
    },
    // after the stretches: "¿Cómo te sientes ahora?"
    feel_now: {
      lt: "Say how you feel after stretching",
      items: [
        { id: "better", s: t("Mucho | mejor, | gracias.", "Much | better, | thanks.", "Much better, thanks.") },
        { id: "still_hurts", s: t("Todavía | me duele | la | rodilla.", "Still | hurts (me) | the | knee.", "My knee still hurts.", { flags: { 1: F_DUELE } }) },
        { id: "im_fine", s: t("Estoy | bien, | gracias.", "I'm | fine, | thanks.", "I'm fine, thanks.") },
      ],
    },
    breath: {
      lt: "Say how you feel",
      items: [
        { id: "out_of_breath", s: t("¡Me falta | el | aire!", "I'm short of | the | air!", "I'm out of breath!", { flags: { 0: F_ME_FALTA } }) },
        { id: "need_break", s: t("Necesito | un | descanso.", "I need | a | break.", "I need a break.") },
        { id: "water_please", s: t("¿Puedo | tomar | agua?", "Can I | drink | water?", "Can I get some water?") },
        { id: "feel_great", s: t("¡Me siento | muy | bien!", "I feel | very | good!", "I feel great!") },
      ],
    },
    next: {
      lt: "Plan the next workout", slot: "weekday", examples: ["thursday", "friday", "monday"],
      items: [
        { id: "same_time", s: t("¿Mañana | a | la | misma | hora?", "Tomorrow | at | the | same | time?", "Same time tomorrow?") },
        { id: "see_tomorrow", s: t("¡Claro! | ¡Nos vemos | mañana!", "Sure! | See you | tomorrow!", "Sure! See you tomorrow!") },
        { id: "cant_tomorrow", s: t("Mañana | no puedo.", "Tomorrow | I can't.", "I can't tomorrow.") },
        { id: "how_about_day", s: t("¿Qué tal | el | {X}?", "How about | — | {X}?", "How about {X}?", { flags: { 1: F_EL_DAY } }) },
        { id: "see_you_day", s: t("¡Nos vemos | el | {X}!", "See you | on | {X}!", "See you {X}!", { flags: { 1: F_EL_DAY } }) },
      ],
    },
  },

  tips: {
    libras: { key: "libras", lt: "Understood! In Mexico weight is usually counted in kilos: 1 kilo is about 2.2 pounds.", better: "¿Cuántos kilos son?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say it's your first time here", done: (c) => !!c.s.introduced },
    { step: "plan", lt: "Choose a membership" },
    { lt: "Sign the form and pay", done: (c) => !!c.s.signed && !!c.s.paid },
    { lt: "Warm up", done: (c) => !!c.s.warm },
    { lt: "Work out with the trainer", done: (c) => !!c.s.breathDone },
    { step: "next", lt: "Plan the next workout" },
  ],

  steps: [
    { id: "new", done: (c) => !!c.s.introduced,
      ask: (c) => c.say("ask_help"),
      expects: ["im_new", "want_join", "choose_plan", "not_new", "ask_price", "ask_trial"],
      suggest: [{ lt: "Say it's your first time here", hint: "new" }, { lt: "Ask about the membership", hint: "plan_ask" }],
      yes: (c) => { if (c.s.firstQ && !c.s.notFirst) introduce(c); else { c.say("ask_help"); c.hold(); } },
      no: (c) => {
        if (c.s.firstQ && !c.s.notFirst) { c.s.notFirst = true; c.say("welcome_back"); c.hold(); return; }
        c.say("ask_help"); c.hold();
      } },
    { id: "plan", when: (c) => !!c.s.introduced, done: (c) => !!c.s.plan,
      ask: (c) => {
        if (!c.s.optionsSaid) {
          c.s.optionsSaid = true;
          c.say("plan_offer", { price: MONTHLY, amount: VISIT });
          if (c.s.trainerNote && !c.s.freeSaid) { c.s.freeSaid = true; c.say("plan_trainer_note"); }
        }
        c.say("plan_which");
      },
      expects: ["choose_plan", "plan_no", "want_join", "ask_price", "ask_included", "ask_fee", "ask_cancel", "ask_hours", "ask_have", "ask_trial", "recommend_q", "ask_discount"],
      suggest: [{ lt: "Choose a membership", hint: "plan", options: "plan" }, { lt: "Ask about the membership", hint: "plan_ask" }],
      yes: (c) => { c.say("plan_which2"); c.hold(); },
      no: (c) => { c.say("plan_think"); c.hold(); },
      help: (c) => { c.say("plan_recommend"); } },
    { id: "form", when: (c) => !!c.s.plan, done: (c) => !!c.s.signed,
      ask: (c) => {
        if (c.s.formAsked) { c.say("form_reask"); return; }
        c.s.formAsked = true;
        c.say("ask_form");
        if (c.s.askId) c.say("ask_id");
      },
      expects: ["here_you_go", "form_done", "sign_q", "pen_q", "form_what", "check_ok", "ready"],
      suggest: [{ lt: "Fill out and sign the form", hint: "form" }],
      yes: (c) => sign(c),
      no: (c) => { c.say("need_sign"); c.hold(); },
      help: (c) => { c.say("sign_where"); } },
    { id: "pay", when: (c) => !!c.s.signed, done: (c) => !!c.s.paid,
      ask: (c) => {
        // "No tengo tarjeta": the other way is offered here, after the total, so that a piece paying in the same turn
        // ("No traigo efectivo, ¿puedo pagar con tarjeta?") pays alone, with no question left open
        const other = c.s.otherOffer as string | undefined;
        c.s.otherOffer = undefined;
        if (c.s.totalSaid && !other) { c.say("pay_reask"); return; }
        if (!c.s.totalSaid) {
          c.say(c.s.plan === "monthly" ? "total_monthly" : "total_day", { price: planPrice(c) });
          c.s.totalSaid = true;
        }
        if (other) { offerOther(c, other); return; }
        if (c.s.askPayMethod && !c.s.methodAsked) { c.s.methodAsked = true; c.say("ask_pay_method"); }
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card"],
      suggest: [{ lt: "Pay", hint: "pay" }],
      // "Está bien, gracias" could be a yes or a polite no: never a payment (rule 17)
      yes: (c) => { if (c.s.payMethod && !politeClosing(c)) { pay(c, c.s.payMethod, true); return; } c.say(c.s.payMethod || c.s.payAltSaid ? "pay_reask" : "ask_pay_method"); c.hold(); },
      no: (c) => { c.say("ask_pay_method"); c.hold(); },
      help: (c) => { c.say("ask_pay_method"); } },
    { id: "lockers", when: (c) => !!c.s.paid, done: (c) => !!c.s.changeDone,
      // the way to the lockers is already known: no "¿Te quieres cambiar primero?" again, just the pause while the
      // learner changes
      ask: (c) => {
        if (c.s.lockersDone) { afterLockers(c); return; }
        c.say(c.s.changeAsked ? "change_reask" : "ask_change");
        c.s.changeAsked = true;
      },
      expects: ["lockers_q", "change_no", "change_no_ctx", "ready", "towel_q", "water_q", "ask_have", "restroom_q", "lock_need", "lock_borrow"],
      suggest: [{ lt: "Ask where the locker rooms are", hint: "lockers" }],
      yes: (c) => tellLockers(c),
      no: (c) => { c.s.changeDone = true; c.say("lets_go"); },
      help: (c) => tellLockers(c) },
    { id: "warmup", when: (c) => warmupOpen(c), done: (c) => !!c.s.warm,
      ask: (c) => {
        if (c.s.warmAsked) { c.say("warm_reask"); return; }
        c.s.warmAsked = true;
        c.say("warmup");
        // the learner already said which one ("La bici" at the front desk)
        if (c.s.warmPref) { chooseWarm(c, c.s.warmPref, false); return; }
        c.say("warmup_which");
      },
      expects: ["warm_choice", "warm_not", "warm_any", "warm_q", "recommend_q"],
      suggest: [{ lt: "Choose how to warm up", hint: "warmup", options: "cardio" }],
      yes: (c) => chooseWarm(c, "bike", true),
      no: (c) => chooseWarm(c, "treadmill", true),
      help: (c) => chooseWarm(c, "bike", true) },
    { id: "machine", when: (c) => !!c.s.warm, done: (c) => !!c.s.machineOk,
      ask: (c) => {
        if (c.s.machineAsked) { c.say("machine_nudge"); return; }
        c.s.machineAsked = true;
        if (!c.s.warmedSaid) { c.s.warmedSaid = true; c.say("warmed_up"); }
        const X = exercise(c);
        if (c.s.outOfOrder) {
          c.twist("out_of_order");
          c.say("machine_next", { X }); c.say("out_of_order", { X }); c.say("other_towel");
          c.expect(brokenPending());
          return;
        }
        c.say("machine_intro", { X });
      },
      expects: ["machine_free_q", "machine_free_ctx", "machine_taken", "broken_q"],
      suggest: [{ lt: "Ask if the machine is free", hint: "machine" }],
      yes: (c) => machineOk(c, false),
      no: (c) => machineOk(c, false),
      help: (c) => machineOk(c, false) },
    { id: "sets", when: (c) => !!c.s.machineOk, done: (c) => !!c.s.setsDone,
      ask: (c) => {
        if (c.s.explained) { c.say("any_other"); return; }
        c.s.explained = true;
        c.say(exercise(c) === "leg_press" ? "sets_explain_leg" : "sets_explain_chest");
        c.say("any_questions");
      },
      expects: ["ask_sets", "sets_ctx", "ask_weight", "ask_rest", "ask_how", "check_ok", "ready"],
      suggest: [{ lt: "Ask how many sets to do", hint: "sets" }],
      yes: (c) => { c.say("ask_away"); c.hold(); },
      no: (c) => startSets(c),
      help: (c) => startSets(c) },
    // "¡Una más!" and "¡Uy! ¿Estás bien?" are pending questions set by startSets.
    { id: "spot", when: (c) => !!c.s.repDone, done: (c) => !!c.s.spotDone,
      ask: (c) => {
        if (c.s.spotAsked) { c.say("spot_ready"); return; }
        c.s.spotAsked = true;
        c.say(c.s.pain ? "spot_intro_now" : "spot_intro");
        if (c.s.pain) c.say("bar_only");
        // "¿Me ayudas con la barra?" was asked earlier: Mónica spots without being asked again
        if (c.s.spotAgreed) spotGo(c, false);
      },
      expects: ["spot_q", "no_spot", "ask_weight", "ready"],
      suggest: [{ lt: "Ask the trainer to spot you", hint: "spot" }],
      yes: (c) => spotGo(c, false),
      no: (c) => spotGo(c, false),
      help: (c) => spotGo(c, false) },
    { id: "breath", when: (c) => !!c.s.spotDone, done: (c) => !!c.s.breathDone,
      ask: (c) => {
        // after the stretches Mónica only asks how it feels; otherwise one last (easy) minute first
        if (c.s.stretched) c.say("feel_now_q");
        else { c.say(c.s.pain ? "finisher_easy" : "finisher"); c.say("time_feel"); }
        c.expect(breathPending(c));
      },
      expects: ["out_breath", "tired", "feel_good", "not_tired", "water_q"],
      suggest: [{ lt: "Say how you feel", hint: "breath" }] },
    { id: "next", when: (c) => !!c.s.breathDone, done: (c) => !!c.s.next,
      ask: (c) => {
        // the learner already proposed a day ("¿Mañana a la misma hora?" during the workout)
        if (c.s.nextPref && !c.s.nextAsked) { c.s.nextAsked = true; c.say("great_workout"); nextDay(c, c.s.nextPref); return; }
        const again = !!c.s.nextAsked;
        c.s.nextAsked = true;
        if (c.s.nextAsk === "same") c.say(again ? "same_time_short" : "same_time_q");
        else { if (!again) c.say("great_workout"); c.say("when_short"); }
      },
      expects: ["next_same", "next_day", "next_no", "day_no", "next_later", "later_ctx", "next_time_q", "when_ctx", "see_you_ctx"],
      suggest: [{ lt: "Plan the next workout", hint: "next", options: "weekday" }],
      yes: (c) => {
        if (c.s.nextAsk === "same") { setNext(c, "tomorrow"); return; }
        c.s.nextAsk = "same"; c.say("same_time_short"); c.hold();
      },
      no: (c) => offerThursday(c),
      help: (c) => { c.s.nextAsk = "same"; c.say("same_time_short"); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.25);
    c.s.firstQ = c.chance(0.5);
    c.s.trainerNote = c.chance(0.5);
    c.s.askId = c.chance(0.4);
    c.s.askPayMethod = c.chance(0.5);
    c.s.askLock = c.chance(0.5);
    c.s.tellTowels = c.chance(0.5);
    c.s.askFeel = c.chance(0.5);
    c.s.restTip = c.chance(0.4);
    c.s.nextAsk = c.chance(0.65) ? "same" : "when";
    // twists (never on the first visit)
    c.s.outOfOrder = c.visits >= 1 && c.chance(0.35);
    c.s.painTwist = c.visits >= 1 && !c.s.outOfOrder && c.chance(0.45);
  },

  start: (c) => {
    if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
    c.say(c.s.firstQ ? "greet_first" : "greet_help");
    c.hold();
  },

  handlers: {
    // --- arriving
    im_new(c) { if (!c.s.introduced) introduce(c); },
    not_new(c) {
      if (c.s.introduced) { c.say("ack"); return; }
      c.s.notFirst = true; c.say("welcome_back"); c.hold();
    },
    want_join(c) {
      // "Quiero una membresía" while Mónica offers the two options
      if (c.step === "plan" && !c.s.plan && /membres/.test(heard(c))) { choosePlan(c, "monthly"); return; }
      if (!c.s.introduced) introduce(c);
    },
    ask_trial(c) { c.say("trial_info"); c.s.freeSaid = true; if (!c.s.introduced) c.s.introduced = true; },
    nice_meet(c) { c.say("nice_meet"); },

    // --- the membership
    choose_plan(c, slots, seg) {
      // the price was checked this turn ("¿Cien pesos por un día?" is two pieces), or the money was just handed over
      if (turnSeen(c, "amount") || (c.s.paid && turnSeen(c, "paid"))) return;
      const tags = allTags(slots, seg);
      const h = heard(c);
      const typedQ = /\?/.test(c.heard || "");
      const plan = (slots.plan as string | undefined) ?? (tags.includes("day") ? "day_pass" : tags.includes("monthly") ? "monthly" : undefined);
      // "¿Cuánto es por un mes?": a price question in the same turn never chooses (rule 17); ask_price answers it
      if (/\b(cuanto|cuesta|precio|costo)\b/.test(h)) { gym.handlers.ask_price(c, slots, seg); return; }
      // an amount (lead's check): "¿Seiscientos?" once a plan is chosen checks the price on file and never changes the
      // plan (rule 20); "¿Cien pesos por un día?" before choosing asks the price, by voice too ("cien pesos por un dia").
      // "La de cien" and "Seiscientos está bien" still choose.
      if (AMOUNT_RE.test(h) && !/\b(la|el) de (cien|seiscientos|100|600)\b/.test(h) && !(slots.plan && slots.plan !== c.s.plan)) {
        if (c.s.plan && !c.s.paid && !turnSeen(c, "chose")) { firstThisTurn(c, "amount"); checkAmount(c); return; }
        if (!c.s.plan && (typedQ || /\b(por|al|el) (un )?(dia|mes)\b/.test(h))) { firstThisTurn(c, "amount"); gym.handlers.ask_price(c, slots, seg); return; }
      }
      // a question about the plan just named ("La mensualidad, ¿qué incluye?", "¿La mensualidad tiene contrato?", "¿Y la
      // visita?", by voice "y la visita" too: no "?" in speech): the question piece answers, nothing is chosen (rule 17)
      if (seg.tags.includes("h:plan_short")) {
        if (PLAN_Q_RE.test(h)) return;
        if (/^\W*y\b/.test(h) && !/\b(por favor|quiero|me quedo)\b/.test(h)) { gym.handlers.ask_price(c, slots, seg); return; }
      }
      if (!plan) { c.say("plan_which2"); c.hold(); return; }
      choosePlan(c, plan);
    },
    plan_no(c, slots, seg) {
      if (c.s.paid) { c.say("ack"); return; }
      const tags = allTags(slots, seg);
      c.s.introduced = true;
      if (tags.includes("both")) { refusePlan(c, "monthly"); refusePlan(c, "day_pass"); return; }
      const which = (slots.plan as string | undefined) ?? (tags.includes("monthly") ? "monthly" : tags.includes("day") ? "day_pass"
        : tags.includes("either") ? (c.s.offered as string | undefined) : undefined);
      if (!which) { c.say("plan_think"); c.hold(); return; }
      refusePlan(c, which);
    },
    change_mind(c) {
      // "Cambié de opinión: la visita.": the plan in the same sentence answers it
      if (c.s.paid || /\b(mensual\w*|membres\w*|visita|dia|hoy|mes)\b/.test(heard(c))) { if (c.s.paid) c.say("ack"); return; }
      c.say("plan_which2"); c.hold();
    },
    ask_price(c, slots) {
      if (!firstThisTurn(c, "price")) return;
      const h = heard(c);
      // the plan asked about: named, or by its amount ("¿Seiscientos?"), or the one chosen, or the one just offered
      // ("¿Qué tal una visita?" → "¿Cuánto cuesta?": that offer's price, rule 17)
      const offered = c.s.offered && !((c.s.refused as string[] | undefined) ?? []).includes(c.s.offered) ? c.s.offered as string : undefined;
      const plan = (slots.plan as string | undefined) ?? (/\b(visita|dia|hoy|entrada)\b/.test(h) ? "day_pass" : /\b(mes|mensual\w*)\b/.test(h) ? "monthly"
        : /\b(seiscientos|600)\b/.test(h) ? "monthly" : /\b(cien|100)\b/.test(h) ? "day_pass" : c.s.plan ?? offered);
      // "¿Es caro?" gets an answer, never the options again (rule 11)
      if (/\b(caro|cara)\b/.test(h)) { c.say("price_fair"); if (c.step === "pay") c.hold(); return; }
      if (c.step === "pay" && c.s.plan && plan === c.s.plan) { c.say(c.s.totalSaid ? "total_again" : c.s.plan === "monthly" ? "total_monthly" : "total_day", { price: planPrice(c) }); c.hold(); return; }
      // before the options were said: both options with their prices (the plan step then only asks which)
      if (!c.s.optionsSaid && !c.s.plan) { c.s.optionsSaid = true; c.s.introduced = true; c.say("plan_offer", { price: MONTHLY, amount: VISIT }); return; }
      if (plan === "monthly") c.say("price_monthly", { price: MONTHLY });
      else if (plan === "day_pass") c.say("price_day", { price: VISIT });
      else { c.s.optionsSaid = true; c.say("plan_offer", { price: MONTHLY, amount: VISIT }); }
      if (!c.s.introduced) c.s.introduced = true;
      if (c.step === "pay") c.hold();
    },
    ask_included(c, slots) {
      const h = heard(c);
      if (/\b(entrenador\w*|sesion|entrenamiento)\b/.test(h)) { c.say("trial_info"); c.s.freeSaid = true; return; }
      const plan = (slots.plan as string | undefined) ?? (/\b(visita|dia|hoy)\b/.test(h) ? "day_pass" : c.s.plan ?? "monthly");
      if (plan !== "day_pass") c.s.freeSaid = true;
      // "¿La visita incluye las clases?": no, the classes are for members (rule 11)
      if (plan === "day_pass" && /\bclases?\b/.test(h)) { c.say("included_day_classes"); return; }
      c.say(plan === "day_pass" ? "included_day" : "included_monthly");
    },
    ask_fee(c) { c.say("no_fee"); },
    ask_cancel(c) { c.say("cancel_info"); },
    ask_hours(c) { c.say("hours_info"); },
    ask_have(c, slots) {
      switch (slots.amenity) {
        case "showers": c.say("showers_info"); break;
        case "sauna": c.say("sauna_info"); break;
        case "pool": c.say("pool_info"); break;
        case "towels": c.s.towelsSaid = true; c.say("towels_info"); break;
        case "lockers": tellLockers(c); break;
        case "parking": c.say("parking_info"); break;
        // only zumba, spinning and box: "¿Tienen yoga?" is not a yes
        case "classes": c.say(/\b(yoga|pilates|crossfit|baile|aerobic\w*)\b/.test(heard(c)) ? "classes_other" : "classes_info"); break;
        case "wifi": c.say("wifi_info"); break;
        case "water": c.say("water_info"); break;
        case "trainer": c.say("trainer_info"); break;
        case "basics": c.say(/\b(banos?|sanitarios)\b/.test(heard(c)) ? "restroom_info" : "have_yes"); break;
        default: c.say("have_yes");
      }
    },
    // "Tengo X" is a statement, not "¿Tienen X?" (the engine forgives the person): never "eso no lo tenemos"
    ask_have_unknown(c) { if (/\btengo\b/.test(heard(c))) return; c.say("have_no"); },
    have_q(c) { c.say("ask_away"); c.hold(); },
    ask_discount(c) { c.say("no_discount"); },
    ask_jordan(c) {
      const h = heard(c);
      c.say(/\b(diario|todos los dias)\b/.test(h) ? "jordan_every_day" : /\b(eres|es)\b.*\b(entrenadora|coach|instructora)\b/.test(h) ? "trainer_info" : "jordan_years");
    },

    // --- the form and paying
    here_you_go(c, slots) {
      if (c.s.plan && !c.s.signed) { sign(c); return; }
      // handing over a card or the money: just thanks. "Aquí está mi tarjeta" is the card; the ID she asked for
      // at the form ("Aquí está mi identificación") pays nothing.
      if (c.s.signed && !c.s.paid) {
        if (ID_RE.test(heard(c))) { c.say("id_back"); c.hold(); return; }
        // cash with its amount (rule 18): less than the total pays nothing and she says the total; more gets change
        const amount = typeof slots?.price === "number" ? slots.price as number : undefined;
        if (amount !== undefined && amount < planPrice(c)) { c.say("cash_short", { price: planPrice(c) }); c.hold(); return; }
        if (amount !== undefined) { pay(c, "cash", true, amount > planPrice(c)); return; }
        pay(c, handedMethod(c) ?? (c.s.payMethod as string | undefined) ?? "cash", true); return;
      }
      if (c.s.paid && turnSeen(c, "paid")) return;
      c.say("ack");
    },
    form_done(c) { if (c.s.plan && !c.s.signed) sign(c); else c.say("ack"); },
    sign_q(c) {
      c.say("sign_where");
      if (c.s.plan && !c.s.signed) { c.s.signed = true; c.event("sign"); }
    },
    pen_q(c) { c.say("pen_here"); if (c.step === "form") c.hold(); },
    form_what(c) { c.say("form_is"); },
    pay_card(c) {
      if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
      if (bothMethods(c)) { askedBoth(c); return; }
      if (!c.s.signed) { c.s.payMethod = "card"; sayOnce(c, "card_later"); return; }
      pay(c, "card");
    },
    // "No traigo efectivo" / "No tengo tarjeta": the other way is offered; nothing is charged until the learner pays
    no_cash(c, _slots, seg) {
      // "No tengo efectivo ni tarjeta": the phone or a transfer, and no way on file
      if (seg?.tags?.includes("both")) {
        if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
        if (c.s.signed) { c.s.otherOffer = undefined; noCashNoCard(c); return; }
        c.s.payMethod = undefined; c.s.payAltSaid = true; c.say("pay_alt"); return;
      }
      otherMethod(c, "card");
    },
    pay_cash(c) {
      if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
      if (bothMethods(c)) { askedBoth(c); return; }
      if (!c.s.signed) { c.s.payMethod = "cash"; sayOnce(c, "cash_ok"); return; }
      pay(c, "cash");
    },
    // "No tengo tarjeta" / "No quiero pagar con tarjeta": cash (nothing is charged to a card)
    no_card(c) { otherMethod(c, "cash"); },
    pay_phone(c) {
      if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
      if (bothMethods(c)) { askedBoth(c); return; }
      const method = /transferencia|transfiero/.test(heard(c)) ? "transfer" : "phone";
      if (!c.s.signed) { c.s.payMethod = method; c.say(method === "transfer" ? "transfer_later" : "phone_later"); return; }
      pay(c, method);
    },

    // --- the locker room
    lockers_q(c) { tellLockers(c); },
    im_back(c) { c.say("ack"); },
    change_no_ctx(c, slots, seg) { gym.handlers.change_no(c, slots, seg); },
    change_no(c) {
      if (c.step === "lockers" && !c.s.changeDone) { c.s.changeDone = true; c.say("lets_go"); return; }
      c.say("ack");
    },
    ready(c) {
      switch (c.step) {
        case "form": if (c.s.plan && !c.s.signed) { sign(c); return; } break;
        case "lockers": if (!c.s.changeDone) { c.s.changeDone = true; c.say("lets_go"); return; } break;
        case "warmup": if (!c.s.warm) { chooseWarm(c, "bike", true); return; } break;
        case "machine": if (!c.s.machineOk) { machineOk(c, false); return; } break;
        case "sets": if (!c.s.setsDone) { startSets(c); return; } break;
        case "spot": if (!c.s.spotDone) { spotGo(c, false); return; } break;
      }
      c.say("ack");
    },
    lock_have(c) { c.say("lock_yes"); },
    lock_none(c) { c.say("lock_buy"); },
    lock_borrow(c) { c.say("lock_borrow_ok"); },
    lock_need(c) { c.say("lock_need_info"); },
    towel_q(c) { c.s.towelsSaid = true; c.say("towels_info"); },
    water_q(c) { c.say("water_info"); },
    restroom_q(c) { c.say("restroom_info"); },

    // --- the warm-up
    warm_choice(c, slots, seg) {
      const tags = allTags(slots, seg);
      const id = (slots.cardio as string | undefined) ?? (tags.includes("tread") ? "treadmill" : tags.includes("bike") ? "bike" : undefined);
      if (!id) { c.say("warmup_which"); c.hold(); return; }
      // "No quiero correr, prefiero la bici": warm_not already chose it this turn
      if (c.s.warm) { if (c.s.warm !== id) c.say("ack"); return; }
      if (!warmupOpen(c)) { c.s.warmPref = id; c.say("ack"); return; }
      chooseWarm(c, id, false);
    },
    warm_not(c, slots, seg) {
      if (!warmupOpen(c) || c.s.warm) { c.say("ack"); return; }
      const tags = allTags(slots, seg);
      const no = (slots.cardio as string | undefined) ?? (tags.includes("tread") ? "treadmill" : tags.includes("bike") ? "bike" : "treadmill");
      chooseWarm(c, no === "bike" ? "treadmill" : "bike", true);
    },
    warm_any(c) { if (warmupOpen(c) && !c.s.warm) chooseWarm(c, "bike", true); else c.say("ack"); },
    recommend_q(c, slots, seg) {
      if (!c.s.plan) { c.s.introduced = true; c.say("plan_recommend"); return; }
      if (warmupOpen(c) && !c.s.warm) { gym.handlers.warm_any(c, slots, seg); return; }
      c.say("ack");
    },
    warm_q(c) {
      const h = heard(c);
      if (/\b(rapido|velocidad)\b/.test(h)) c.say("warm_how_fast");
      else if (/\bpor que\b/.test(h)) c.say("warm_why");
      else if (c.step === "sets" || c.step === "spot") c.say("rest_answer");
      else c.say("warm_how_long");
    },

    // --- how are you feeling (outside the questions that ask it)
    // a bare "mejor" before the workout is "rather" ("Mejor la de cien"), never "I feel better"
    feel_good(c, _slots, seg) { if (!c.s.warm && seg.tags.includes("h:better")) return; c.say("feel_good_reply"); },
    not_tired(c) { c.say("feel_good_reply"); },
    // before the workout ("Bien, nada más un poco cansado" at the door): no "Descansa" yet
    tired(c) { c.say(c.s.warm ? "break_water" : "easy_today"); },
    out_breath(c) { c.say("break_water"); },
    g_howareyou_bad(c, slots) {
      if (/cansad/.test(heard(c))) { gym.handlers.tired(c, slots, { intent: "tired", slots: {}, tags: [] }); return; }
      c.say("g_sorry_to_hear");
    },

    // --- the machine
    machine_free_q(c) { if (c.s.warm && !c.s.machineOk) machineOk(c, true); else c.say("machine_ok"); },
    machine_free_ctx(c, slots, seg) { gym.handlers.machine_free_q(c, slots, seg); },
    machine_taken(c) { if (c.s.warm && !c.s.machineOk) machineOk(c, false); else c.say("ack"); },
    broken_q(c) { c.say(c.s.outOfOrder ? "broken_info" : "not_broken"); },

    // --- sets, reps, weight
    ask_sets(c) {
      if (c.s.machineOk && !c.s.setsDone) { startSets(c); return; }
      c.s.setsSaid = true;
      c.say("sets_answer");
    },
    sets_ctx(c, slots, seg) {
      if (/\bcuanto\b/.test(heard(c))) { gym.handlers.ask_weight(c, slots, seg); return; }
      gym.handlers.ask_sets(c, slots, seg);
    },
    ask_weight(c, slots, seg) {
      // "¿Cuántos pesos son?": money ("pesos" sounds like "peso"), never a weight
      if (/\bpesos\b/.test(heard(c))) { gym.handlers.ask_price(c, slots, seg); return; }
      if (/\b(es|esta) (liger|pesad)/.test(heard(c))) { c.say("light_answer"); return; }
      c.say(c.step === "spot" || c.s.repDone ? "bar_weight" : exercise(c) === "leg_press" ? "weight_leg" : "weight_chest");
      if (seg.tags.includes("lb")) c.say("lb_note");
    },
    ask_rest(c) { c.say("rest_answer"); },
    ask_how(c) { c.say(exercise(c) === "leg_press" ? "sets_explain_leg" : "sets_explain_chest"); },
    not_ready(c) { c.say("g_take_time"); c.hold(); },
    check_ok(c) {
      if (c.s.plan && !c.s.signed) { sign(c); return; }
      c.say(c.s.machineOk ? "how_right" : "ack");
    },
    rep_done_ctx(c) { repDone(c, false); },
    cant(c, slots, seg) {
      // "¿Cien pesos por un día?": "pesos" sounds like "pesado"; a price is never "I can't"
      if (/\bpesos\b/.test(heard(c))) return;
      if (c.step === "next") { gym.handlers.next_no(c, slots, seg); return; }
      // "¿Es muy pesado?" is a question about the weight, not "I can't"
      if (/\?/.test(c.heard || "")) { c.say("light_answer"); return; }
      c.say("cant_general");
    },

    // --- pain
    pain(c, _slots, seg) { hurt(c, seg.tags); },
    pain_ctx(c, _slots, seg) { hurt(c, seg.tags); },
    no_pain(c) { c.say(c.s.painAsked ? "fine_reply" : "ack"); },

    // --- spotting
    spot_q(c) {
      if (c.step === "spot" && !c.s.spotDone) { spotGo(c, true); return; }
      c.s.spotAgreed = true;
      c.say("spot_yes");
    },
    no_spot(c) {
      if (c.step === "spot" && !c.s.spotDone) { c.s.spotDone = true; c.say("no_spot_reply"); c.say("bench_go"); return; }
      c.say("ack");
    },

    // --- next time
    next_same(c) {
      if (!c.s.breathDone) { c.s.nextPref = "tomorrow"; c.say("ack"); return; }
      if (bareBookingBlocked(c)) return;
      setNext(c, "tomorrow");
    },
    next_day(c, slots) {
      const d = (slots.day ?? slots.weekday) as string | undefined;
      nextDay(c, d);
    },
    next_no(c, _slots, seg) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      if (DAY_RE.test(heard(c))) return; // "Mañana no puedo, ¿qué tal el viernes?": the day answers it
      // another day is already booked; tomorrow, booked and now refused ("Ah, no, mañana no puedo" at the goodbye), is
      // undone, so the Thursday she offers can be booked (a "Sí" kept tomorrow before the lead's check)
      if (c.s.next && c.s.next !== "tomorrow") { c.say("ack"); return; }
      if (c.s.next) { c.s.next = undefined; keepNext(c); }
      // "A la misma hora no puedo": another time is arranged by message
      if (seg?.tags?.includes("time")) { bookLater(c); return; }
      offerThursday(c);
    },
    next_later(c) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      bookLater(c);
    },
    later_ctx(c, slots, seg) { gym.handlers.next_later(c, slots, seg); },
    day_no(c, slots, seg) {
      if (slots.day === "tomorrow") { gym.handlers.next_no(c, slots, seg); return; }
      if (!c.s.breathDone) { c.say("ack"); return; }
      // the day booked doesn't suit after all ("El jueves no puedo" after "¡Nos vemos el jueves!"): undone
      if (c.s.next && c.s.next === slots.day) { c.s.next = undefined; keepNext(c); }
      if (c.s.next) { c.say("ack"); return; }
      if (seg?.tags?.includes("amb") && DAY_IDS.includes(slots.day as string)) { askDay(c, slots.day as string); return; }
      bookLater(c);
    },
    next_time_q(c) { c.say("same_as_today"); },
    when_ctx(c, slots) {
      if (c.s.breathDone && bareBookingBlocked(c)) return;
      if (slots.day) nextDay(c, slots.day as string); else setNext(c, "tomorrow");
    },
    see_you_ctx(c) {
      if (!c.s.breathDone) { c.say("ack"); return; }
      if (c.s.nextAsk === "same") setNext(c, "tomorrow");
      else { c.s.next = "soon"; c.say("see_then"); }
    },
  },

  finish: (c) => {
    c.complete();
    c.remember({ lastPlan: c.s.plan, next: c.s.next });
    c.event("serve", { workout: true });
    c.say("closing");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("bye_tu"); cc.end(); },
        next_same: (cc) => { cc.say("bye_tu"); cc.end(); },
        // "¡Nos vemos el jueves!" after "¡Nos vemos mañana!": that day is booked instead (lead's check)
        next_day: (cc, sl) => {
          const d = (sl.day ?? sl.weekday) as string | undefined;
          if (d && DAY_IDS.includes(d) && d !== cc.s.next) { cc.s.next = undefined; nextDay(cc, d); cc.end(); return; }
          cc.say("bye_tu"); cc.end();
        },
        see_you_ctx: (cc) => { cc.say("bye_tu"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns
    { say: "¡Hola, soy nuevo aquí!", intent: "im_new", step: "new" },
    { say: "Es mi primera vez aquí.", intent: "im_new", step: "new" },
    { say: "Quiero inscribirme.", intent: "want_join", step: "new" },
    { say: "Quisiera hacerme socia.", intent: "want_join", step: "new" },
    { say: "¿Cómo me inscribo?", intent: "want_join", step: "new" },
    { say: "Me quedo con la mensualidad.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "Quiero la visita, por favor.", intent: "choose_plan", step: "plan", slots: { plan: "day_pass" } },
    { say: "La mensualidad, por favor.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "Solo por hoy, por favor.", intent: "choose_plan", step: "plan" },
    { say: "¿Cuánto cuesta la mensualidad?", intent: "ask_price", slots: { plan: "monthly" } },
    { say: "¿Qué incluye?", intent: "ask_included", step: "plan" },
    { say: "¿Cobran inscripción?", intent: "ask_fee" },
    { say: "¿Puedo cancelar cuando quiera?", intent: "ask_cancel" },
    { say: "¿Qué horario tienen?", intent: "ask_hours" },
    { say: "¿Tienen clases?", intent: "ask_have", slots: { amenity: "classes" } },
    { say: "¿Tienen regaderas?", intent: "ask_have", slots: { amenity: "showers" } },
    { say: "Aquí tienes.", intent: "here_you_go", step: "form" },
    { say: "Listo, ya está.", intent: "form_done", step: "form" },
    { say: "¿Dónde firmo?", intent: "sign_q" },
    { say: "¿Me prestas una pluma?", intent: "pen_q" },
    { say: "¿Para qué es esta hoja?", intent: "form_what" },
    { say: "Con tarjeta, por favor.", intent: "pay_card", step: "pay" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card" },
    { say: "Pago en efectivo.", intent: "pay_cash", step: "pay" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_phone" },
    { say: "¿Dónde están los vestidores?", intent: "lockers_q" },
    { say: "¿Dónde me cambio?", intent: "lockers_q" },
    { say: "¿Dónde dejo mi mochila?", intent: "lockers_q" },
    { say: "¿Tienen toallas?", intent: "ask_have", slots: { amenity: "towels" } },
    { say: "¿Dónde hay agua?", intent: "water_q" },
    { say: "No, ya estoy listo.", intent: "ready", step: "lockers" },
    { say: "¿Dónde compro uno?", intent: "lock_borrow" },
    { say: "¡Ya volví!", intent: "im_back" },
    { say: "La bici, por favor.", intent: "warm_choice", step: "warmup", slots: { cardio: "bike" } },
    { say: "Voy a usar la caminadora.", intent: "warm_choice", step: "warmup", slots: { cardio: "treadmill" } },
    { say: "Prefiero la bici.", intent: "warm_choice", step: "warmup", slots: { cardio: "bike" } },
    { say: "¿Cuánto tiempo?", intent: "warm_q", step: "warmup" },
    { say: "¡Me siento muy bien!", intent: "feel_good" },
    { say: "Ya entré en calor.", intent: "feel_good" },
    { say: "¿Está libre esta máquina?", intent: "machine_free_q", step: "machine" },
    { say: "¿Alguien la está usando?", intent: "machine_free_q", step: "machine" },
    { say: "Perdón, ¿la estás usando?", intent: "machine_free_q", step: "machine" },
    { say: "¿Te falta mucho?", intent: "machine_free_q", step: "machine" },
    { say: "¿Puedo usar esta máquina?", intent: "machine_free_q", step: "machine" },
    { say: "¿Qué le pasó?", intent: "broken_q" },
    { say: "¿Cuántas series hago?", intent: "ask_sets", step: "sets" },
    { say: "¿Cuántas repeticiones?", intent: "ask_sets", step: "sets" },
    { say: "¿Cuánto peso le pongo?", intent: "ask_weight", step: "sets" },
    { say: "¿Cuánto descanso?", intent: "ask_rest", step: "sets" },
    { say: "¿Cómo funciona esta máquina?", intent: "ask_how", step: "sets" },
    { say: "¡Estoy lista!", intent: "ready", step: "sets" },
    { say: "Me duele la rodilla.", intent: "pain" },
    { say: "Me duele un poco la espalda.", intent: "pain" },
    { say: "¿Me ayudas con la barra?", intent: "spot_q", step: "spot" },
    { say: "¿Te quedas cerca?", intent: "spot_q", step: "spot" },
    { say: "¿Cuánto pesa la barra?", intent: "ask_weight", step: "spot" },
    { say: "Todavía me duele la rodilla.", intent: "pain" },
    { say: "Mucho mejor, gracias.", intent: "feel_good", step: "breath" },
    { say: "¡Me falta el aire!", intent: "out_breath", step: "breath" },
    { say: "Necesito un descanso.", intent: "tired", step: "breath" },
    { say: "¿Puedo tomar agua?", intent: "water_q" },
    { say: "¿Mañana a la misma hora?", intent: "next_same", step: "next" },
    { say: "¡Claro! ¡Nos vemos mañana!", intent: "next_same", step: "next" },
    { say: "Mañana no puedo.", intent: "next_no", step: "next", not: ["next_same"] },
    { say: "¿Qué tal el jueves?", intent: "next_day", step: "next" },
    { say: "¡Nos vemos el viernes!", intent: "next_day", step: "next" },
    // natural alternatives, short answers, no accents, usted to the trainer
    { say: "como me inscribo", intent: "want_join", step: "new" },
    { say: "Primera vez.", intent: "im_new", step: "new" },
    { say: "Una visita.", intent: "choose_plan", step: "plan", slots: { plan: "day_pass" } },
    { say: "La mensualidad no, la visita.", intent: "choose_plan", step: "plan", slots: { plan: "day_pass" } },
    { say: "Voy a venir seguido.", intent: "choose_plan", step: "plan" },
    { say: "¿Cuál me recomienda?", intent: "recommend_q", step: "plan" },
    { say: "¿Tienen alberca?", intent: "ask_have", slots: { amenity: "pool" } },
    { say: "Efectivo.", intent: "pay_cash", step: "pay" },
    { say: "¿Aceptan transferencia?", intent: "pay_phone" },
    { say: "No, se me olvidó.", intent: "lock_none", not: ["lock_have"] },
    { say: "Me da igual.", intent: "warm_any", step: "warmup" },
    { say: "¿Te falta mucho?", intent: "machine_free_q" },
    { say: "¿Cuántas libras son?", intent: "ask_weight", step: "sets" },
    { say: "¡Uf! ¡Estuvo pesado!", intent: "tired" },
    { say: "La rodilla.", intent: "none" },
    { say: "¿Me echas la mano?", intent: "spot_q", step: "spot" },
    { say: "¿Me puede ayudar con la barra?", intent: "spot_q", step: "spot" },
    { say: "Mejor el viernes.", intent: "next_day", step: "next" },
    { say: "Te aviso después.", intent: "next_later", step: "next" },
    // Spain forms are correct (no tip)
    { say: "Vale, la mensualidad.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "Ponme la mensualidad.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "¿Tenéis descuentos?", intent: "ask_discount" },
    { say: "Con el móvil.", intent: "pay_phone", step: "pay" },
    { say: "Prefiero la cinta de correr.", intent: "warm_choice", step: "warmup", slots: { cardio: "treadmill" } },
    { say: "Me gustaría apuntarme al gimnasio.", intent: "want_join", step: "new" },
    // meaning must not flip
    { say: "No quiero la mensualidad.", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "Tampoco quiero la visita.", intent: "plan_no", step: "plan", not: ["choose_plan"] },
    { say: "No quiero inscribirme.", intent: "plan_no", step: "new", not: ["want_join", "choose_plan"] },
    { say: "No es mi primera vez.", intent: "not_new", step: "new", not: ["im_new"] },
    { say: "No traigo efectivo.", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "No tengo tarjeta.", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "No traje candado.", intent: "lock_none", not: ["lock_have"] },
    { say: "No me gusta correr.", intent: "warm_not", step: "warmup", not: ["warm_choice"] },
    { say: "No la bici, la caminadora.", intent: "warm_choice", step: "warmup", slots: { cardio: "treadmill" } },
    { say: "No estoy cansada.", intent: "not_tired", step: "breath", not: ["tired"] },
    { say: "No está libre.", intent: "machine_taken", step: "machine", not: ["machine_free_q", "machine_free_ctx"] },
    { say: "No necesito ayuda.", intent: "no_spot", step: "spot", not: ["spot_q"] },
    { say: "No me duele nada.", intent: "no_pain", not: ["pain"] },
    { say: "Ya no me duele.", intent: "no_pain", not: ["pain"] },
    { say: "No me duele la rodilla.", intent: "no_pain", not: ["pain"] },
    { say: "Todavía no estoy listo.", intent: "not_ready", step: "sets", not: ["ready"] },
    { say: "El jueves no puedo.", intent: "day_no", step: "next", not: ["next_day", "when_ctx"] },
    { say: "Ya no puedo.", intent: "cant" },
    { say: "Efectivo no, tarjeta.", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "No quiero la visita, quiero la mensualidad.", intent: "choose_plan", step: "plan", slots: { plan: "monthly" } },
    { say: "Mañana sí puedo.", intent: "next_same", step: "next", not: ["next_no"] },
    { say: "No me siento bien.", intent: "g_howareyou_bad", not: ["feel_good"] },
    { say: "No me falta el aire.", intent: "none", step: "breath", not: ["out_breath"] },
    // review: meaning safety and breadth
    { say: "No entiendo.", intent: "g_dont_understand", step: "sets", not: ["ready"] },
    { say: "No entendí.", intent: "g_dont_understand", step: "sets", not: ["ready"] },
    { say: "No, ya entendí.", intent: "ready", step: "sets" },
    { say: "No entiendo cómo funciona.", intent: "ask_how", step: "sets", not: ["ready"] },
    { say: "No quiero pagar en efectivo.", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "No en efectivo.", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Aquí está mi tarjeta.", intent: "here_you_go", step: "pay" },
    { say: "¿Cuánto es por un mes?", intent: "ask_price", step: "plan", slots: { plan: "monthly" }, not: ["choose_plan"] },
    { say: "¿Es cara la mensualidad?", intent: "ask_price", step: "plan", not: ["plan_no", "choose_plan"] },
    { say: "¿Tienen clases de yoga?", intent: "ask_have", slots: { amenity: "classes" } },
    { say: "¿Hay baños?", intent: "ask_have", slots: { amenity: "basics" }, not: ["ask_have_unknown"] },
    { say: "¿Tienen pesas?", intent: "ask_have", slots: { amenity: "basics" }, not: ["ask_have_unknown"] },
    { say: "¿Tienen aire acondicionado?", intent: "ask_have", slots: { amenity: "basics" }, not: ["ask_have_unknown"] },
    { say: "¿Puedo usar la bici?", intent: "warm_choice", step: "warmup", slots: { cardio: "bike" } },
    { say: "Mañana no puedo, ¿el jueves?", intent: "next_day", step: "next", slots: { day: "thursday" }, not: ["next_same", "when_ctx"] },
    { say: "No puedo mañana, ¿qué tal el viernes?", intent: "next_day", step: "next", slots: { day: "friday" }, not: ["next_same", "when_ctx"] },
    { say: "No me duele.", intent: "no_pain", not: ["pain"] },
    { say: "No, no me duele.", intent: "no_pain", not: ["pain"] },
    // lead's check: cash amounts, money words, plan questions, unsure or refused times, the part that doesn't hurt
    { say: "Aquí tienes quinientos.", intent: "here_you_go", step: "pay", slots: { price: 50000 }, not: ["ask_have_unknown"] },
    { say: "Te doy mil.", intent: "here_you_go", step: "pay", slots: { price: 100000 } },
    { say: "¿Cuántos pesos son?", intent: "ask_price", step: "pay", not: ["ask_weight"] },
    { say: "Mejor en efectivo.", intent: "pay_cash", step: "pay", not: ["feel_good"] },
    { say: "No tengo efectivo ni tarjeta.", intent: "no_cash", step: "pay", not: ["pay_cash", "pay_card"] },
    { say: "No tengo tarjeta, pero tengo efectivo.", intent: "no_card", step: "pay", not: ["pay_card", "ask_have_unknown"] },
    { say: "Pago con transferencia.", intent: "pay_phone", step: "pay" },
    { say: "¿La mensualidad tiene contrato?", intent: "ask_cancel", step: "plan", not: ["choose_plan"] },
    { say: "¿Son seiscientos al mes?", intent: "ask_price", step: "plan", not: ["choose_plan"] },
    { say: "Mañana no sé.", intent: "later_ctx", step: "next", not: ["next_same", "when_ctx"] },
    { say: "Mañana tal vez.", intent: "later_ctx", step: "next", not: ["next_same", "when_ctx"] },
    { say: "A la misma hora no puedo.", intent: "next_no", step: "next", not: ["when_ctx", "next_same"] },
    { say: "Mañana a las seis no puedo.", intent: "next_no", step: "next", not: ["next_same"] },
    { say: "El jueves a la misma hora no puedo.", intent: "day_no", step: "next", not: ["next_day", "when_ctx"] },
    { say: "La rodilla no me duele.", intent: "no_pain", not: ["pain", "pain_ctx"] },
    { say: "La rodilla está bien.", intent: "no_pain", not: ["pain", "pain_ctx"] },
    { say: "No me duele mucho.", intent: "no_pain", not: ["pain"] },
    { say: "Tengo una pregunta.", intent: "have_q", step: "sets", not: ["ask_have_unknown", "ready"] },
    // not understood
    { say: "Mi perro toca la guitarra", intent: "none" },
    { say: "plátano ventana azul", intent: "none" },
    { say: "Ayer comí tacos en la playa", intent: "none" },
    { say: "Ryan", intent: "none" },
  ],

  sims: [
    // Optional moments pinned with `setup` where a scripted turn needs them one way: "¿Cómo te sientes?" after the
    // warm-up (askFeel) and the pain twist after the leg press (painTwist). The twist sims force their twist.
    { name: "new member: monthly, card, the full first workout", turns: ["¡Hola, soy nuevo aquí!", "Me quedo con la mensualidad.", "Aquí tienes.", "Con tarjeta, por favor.",
      "Sí. ¿Dónde están los vestidores?", "La bici, por favor.", "¿Está libre esta máquina?", "¿Cuántas series hago?", "¡Listo! ¡Lo logré!", "¿Me ayudas con la barra?",
      "¡Me falta el aire!", "¡Claro! ¡Nos vemos mañana!", "¡Gracias, adiós!"], expect: { complete: true, state: { plan: "monthly", paid: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "short answers: a visit, cash", turns: ["Primera vez.", "Una visita.", "Listo.", "Efectivo.", "No, ya estoy listo.", "Caminadora.", "¡Bien!", "¿Está libre?", "¿Cuántas?", "¡Diez!",
      "¿Me ayudas?", "Estoy muerto.", "Sí.", "Sí."], expect: { complete: true, state: { plan: "day_pass", payMethod: "cash" } }, auto: AUTO,
      setup: (s) => { s.askFeel = true; s.painTwist = false; } },
    { name: "questions first, then Thursday", turns: ["¡Hola! ¿Cuánto cuesta la mensualidad?", "¿Cobran inscripción?", "¿Puedo cancelar cuando quiera?", "¿Tienen regaderas?",
      "Quiero la mensualidad, por favor.", "¿Para qué es esta hoja?", "¿Dónde firmo?", "¿Puedo pagar con tarjeta?", "¿Qué horario tienen?", "¿Dónde me cambio?", "¿Tienen alberca?",
      "Voy a usar la caminadora.", "¿Alguien la está usando?", "¿Cuánto peso le pongo?", "¿Cuántas series hago?", "¡No puedo!", "¿Cuánto pesa la barra?",
      "¿Me ayudas con la barra?", "Necesito un descanso.", "¿Podemos el jueves?", "¡Gracias!"], expect: { complete: true, state: { next: "thursday" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "no monthly, no running, back hurts, not tomorrow", turns: ["¡Hola! Quiero inscribirme.", "No quiero la mensualidad.", "Sí, por favor.", "Listo, ya está.",
      "Aquí tienes.", "No, ya vengo cambiado.", "No me gusta correr.", "Perdón, ¿la estás usando?", "Estoy listo.", "Me duele la espalda.", "Bueno.", "Mucho mejor, gracias.",
      "Mañana no puedo.", "Sí, el jueves está bien.", "¡Adiós!"], expect: { complete: true, state: { plan: "day_pass", warm: "bike", pain: "back", next: "thursday" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "Spain forms, libras, no spot", turns: ["¡Hola! Es mi primera vez aquí.", "¿Qué incluye?", "Vale, la mensualidad.", "¿Tienes un bolígrafo?", "Aquí tienes.",
      "Pago en efectivo.", "¿Dónde están los casilleros?", "Prefiero la cinta de correr.", "Perdón, ¿está libre esta máquina?", "¿Cuántas libras son?",
      "¿Cuántas series hago?", "¡Bueno, una más!", "No necesito ayuda, puedo sola.", "¡Me falta el aire!", "¿Mañana a la misma hora?", "¡Gracias!"],
      expect: { complete: true, state: { plan: "monthly", warm: "treadmill", next: "tomorrow" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    { name: "how are you, then not okay: the knee; I'll let you know", turns: ["Bien, gracias. ¿Y tú?", "Soy nueva aquí. ¿Cómo me inscribo?", "Solo por hoy, por favor.", "¿Dónde firmo?",
      "¿Puedo pagar con el celular?", "¿Tienen toallas?", "Sí, por favor.", "La que tú quieras.", "Un poco cansada.", "¿La estás usando?", "No, ninguna pregunta.", "¡Uf! ¡Estuvo pesado!",
      "No.", "La rodilla.", "¿Me ayudas con la barra?", "¡Estoy muerta!", "Todavía no sé. Te aviso.", "¡Muchas gracias!"],
      expect: { complete: true, state: { pain: "knee", next: "later" } }, auto: AUTO,
      // the twist on every seed: "¿Cómo estás?" first, "¿Cómo te sientes?" after the warm-up and "¡Uy! ¿Estás bien?" after the leg press
      setup: (s) => { s.hay = true; s.askFeel = true; s.outOfOrder = false; s.painTwist = true; } },
    // a change of plan, the locker-room pause, "¡Ay, me duele la rodilla!" (arms instead, then the light bench press)
    { name: "a visit instead, lockers pause, knee: arms instead", turns: ["¡Hola, soy nuevo aquí!", "La mensualidad, por favor.", "Pensándolo bien, mejor una visita.",
      "Aquí tienes.", "Efectivo.", "¿Dónde están los vestidores?", "¡Ya volví!", "La bici, por favor.", "¿Está libre esta máquina?", "¿Cuántas series?", "¡Ay, me duele la rodilla!",
      "¿Me ayudas con la barra?", "¡Me falta el aire!", "¡Nos vemos mañana!", "¡Gracias!"], expect: { complete: true, state: { plan: "day_pass", pain: "knee" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.askLock = false; } },
    // both options refused, then the visit; back pain on the bench: stretching, then "¿Cómo te sientes ahora?"
    { name: "neither, then the visit; back hurts on the bench", turns: ["¡Hola, soy nueva aquí!", "No, gracias, no quiero inscribirme.", "No, tampoco quiero la visita.",
      "Pensándolo bien, la visita.", "Listo.", "Tarjeta.", "No, ya estoy lista.", "Caminadora.", "¿Está libre?", "¿Cuántas?", "¡Diez!", "Me duele un poco la espalda.", "Bueno.",
      "Mucho mejor, gracias.", "¿Mañana a la misma hora?", "¡Adiós!"], expect: { complete: true, state: { plan: "day_pass", pain: "back", stretched: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; } },
    // twist on every seed: the leg press is out of order, so the learner asks what happened and whether the other one is free
    { name: "twist: the leg press is out of order", turns: ["¡Hola! Es mi primera vez aquí.", "Una visita, por favor.", "Aquí tienes.", "Tarjeta.", "No, ya estoy listo.",
      "La bici, por favor.", "¿Qué le pasó?", "¿Está libre la otra?", "¿Cuántas series hago?", "¡Listo! ¡Lo logré!", "¿Me ayudas con la barra?", "¡Me falta el aire!",
      "¡Nos vemos mañana!", "¡Adiós!"], expect: { complete: true, state: { machineOk: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.outOfOrder = true; s.painTwist = false; } },
    // twist on every seed: "¡Uy! ¿Estás bien?" after the leg press, and the learner is just tired (the workout goes on)
    { name: "twist: are you okay? just tired", turns: ["¡Hola! Quisiera hacerme socia.", "La mensualidad, por favor.", "Aquí tienes.", "¿Puedo pagar con el celular?",
      "No, ya vengo cambiada.", "La caminadora, por favor.", "¿Está libre esta máquina?", "Estoy lista.", "¡Listo!", "Estoy bien, nada más un poco cansada.", "¿Me ayudas con la barra?",
      "Necesito un descanso.", "¿Mañana a la misma hora?", "¡Gracias, adiós!"], expect: { complete: true, state: { pain: undefined, painAsked: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.outOfOrder = false; s.painTwist = true; } },
    // rule 22: "No tengo tarjeta" at the total charges nothing; cash is offered and paid on the hand-over. "Está bien,
    // gracias" at the other plan is asked again.
    { name: "no card at the total: cash, then the money", turns: ["Hola, soy nuevo aquí.", "No quiero la mensualidad.", "Está bien, gracias.", "Sí, la visita.", "Listo.",
      "No tengo tarjeta.", "Aquí tienes.", "No, ya estoy listo.", "La bici.", "¿Está libre?", "Estoy listo.", "¡Listo!", "¿Me ayudas?", "¡Me falta el aire!", "¡Nos vemos mañana!", "¡Adiós!"],
      expect: { complete: true, state: { plan: "day_pass", payMethod: "cash", paid: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.outOfOrder = false; } },
    // rule 10: "No me duele la rodilla" said aloud could be "No, me duele la rodilla": Mónica asks, and the no settles it
    { name: "twist: it doesn't hurt (asked again)", turns: ["Hola, soy nuevo aquí.", "La visita.", "Listo.", "Efectivo.", "No, ya estoy listo.", "La bici.", "¿Está libre?", "Estoy listo.",
      "¡Listo!", "No me duele la rodilla.", "No.", "¿Me ayudas con la barra?", "¡Me falta el aire!", "¡Nos vemos mañana!", "¡Adiós!"],
      expect: { complete: true, state: { pain: undefined, painAsked: true } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.outOfOrder = false; s.painTwist = true; } },
    // review (rule 22): the card handed over is a card payment, the ID handed back pays nothing; "No entiendo" never
    // starts the sets; "Mañana no puedo, ¿el jueves?" books Thursday, not tomorrow
    { name: "hand-overs at the total, no entiendo, not tomorrow", turns: ["Hola, soy nueva aquí.", "La mensualidad.", "¿Dónde firmo?", "Aquí está mi identificación.",
      "Aquí está mi tarjeta.", "No, ya estoy lista.", "La bici.", "¿Está ocupada esta máquina?", "No entiendo.", "No, ya entendí.", "¡Listo!", "¿Me ayudas?", "¡Me falta el aire!",
      "Mañana no puedo, ¿el jueves?", "¡Adiós!"], expect: { complete: true, state: { plan: "monthly", payMethod: "card", paid: true, next: "thursday" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.outOfOrder = false; } },
    // no card and no cash: nothing is paid on a "Sí"; the phone pays
    { name: "no card, no cash: the phone", turns: ["Hola, soy nuevo aquí.", "La visita.", "Listo.", "No tengo tarjeta.", "No traigo efectivo.", "Sí.", "Con el celular.",
      "No, ya estoy listo.", "La bici.", "¿Está libre?", "Estoy listo.", "¡Listo!", "¿Me ayudas?", "¡Me falta el aire!", "Mañana a las siete.", "¡Adiós!"],
      expect: { complete: true, state: { plan: "day_pass", payMethod: "phone", paid: true, next: "tomorrow" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.outOfOrder = false; } },
    // lead's check (rule 22): a question about both ways pays nothing; "¿Cien pesos?" at the $600 total checks the price
    // and keeps the plan; $500 handed over pays nothing, $1,000 pays with change; "Mañana no sé" books nothing
    { name: "lead's check: amounts at the total, unsure about tomorrow", turns: ["Hola, soy nueva aquí.", "La mensualidad.", "Listo.",
      "¿Puedo pagar con tarjeta o en efectivo?", "¿Cien pesos?", "Aquí tienes quinientos.", "Aquí tienes mil.", "No, ya estoy lista.", "La bici.", "¿Está libre?",
      "Tengo una pregunta.", "¿Cuántas series hago?", "¡Listo!", "¿Me ayudas?", "¡Me falta el aire!", "Mañana no sé.", "¡Adiós!"],
      expect: { complete: true, state: { plan: "monthly", payMethod: "cash", paid: true, next: "later" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.outOfOrder = false; } },
    // lead's check: "Con tarjeta no, con el celular" pays once, by phone (a "Sí" after it paid cash a second time); "La
    // rodilla está bien" is no pain; "A la misma hora no puedo" books nothing (it booked tomorrow and offered Thursday)
    { name: "lead's check: the phone instead, the knee is fine, not the same time", turns: ["Hola, soy nuevo aquí.", "La visita.", "Listo.",
      "Con tarjeta no, con el celular.", "Sí.", "¡Ya volví!", "La caminadora.", "¿Está libre?", "Estoy listo.", "¡Listo!", "La rodilla está bien.", "¿Me ayudas?",
      "¡Me falta el aire!", "A la misma hora no puedo.", "¡Adiós!"],
      expect: { complete: true, state: { plan: "day_pass", payMethod: "phone", paid: true, pain: undefined, painAsked: true, next: "later" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = true; s.outOfOrder = false; s.askLock = false; } },
    // lead's check: questions about a plan choose nothing; no cash but the card pays once; "No puedo, ¿el jueves?" (aloud
    // "No puedo el jueves") is asked again, and a yes books Thursday
    { name: "lead's check: plan questions, card instead of cash, which Thursday", turns: ["Hola, soy nueva aquí.", "¿La mensualidad tiene contrato?",
      "La mensualidad, ¿qué incluye?", "Va, la mensualidad.", "Listo.", "No traigo efectivo, ¿puedo pagar con tarjeta?", "No, ya estoy lista.", "La bici.",
      "¿Está libre?", "Estoy lista.", "¡Listo!", "¿Me ayudas?", "¡Me falta el aire!", "No puedo, ¿el jueves?", "Sí.", "¡Adiós!"],
      expect: { complete: true, state: { plan: "monthly", payMethod: "card", paid: true, next: "thursday" } }, auto: AUTO,
      setup: (s) => { s.askFeel = false; s.painTwist = false; s.outOfOrder = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Flow helpers

function introduce(c: Ctx) {
  c.s.introduced = true;
  if (!c.s.jordanSaid) { c.s.jordanSaid = true; c.say("intro_jordan"); }
}

function choosePlan(c: Ctx, plan: string) {
  if (c.s.paid) { c.say("ack"); return; }
  const first = !c.s.plan;
  firstThisTurn(c, "chose");
  // changing one's mind ("Pensándolo bien, mejor una visita"): fine before paying, and the new total is said again
  if (!first && c.s.plan !== plan) { c.say("no_problem"); c.s.totalSaid = false; }
  // named at the door ("Quiero la mensualidad."): Mónica says who she is first
  if (!c.s.introduced) introduce(c);
  c.s.plan = plan;
  c.s.introduced = true;
  c.s.refused = ((c.s.refused as string[] | undefined) ?? []).filter((x) => x !== plan);
  c.say(plan === "monthly" ? "plan_ok_monthly" : "plan_ok_day");
  // chosen before the options were said: its price first (nothing binding before its price, rule 3)
  if (!c.s.optionsSaid) { c.s.optionsSaid = true; c.say(plan === "monthly" ? "price_chosen_monthly" : "price_chosen_day", { price: plan === "monthly" ? MONTHLY : VISIT }); }
  if (first && !c.s.freeSaid) { c.s.freeSaid = true; c.say("free_session"); }
}

/** "No quiero la mensualidad": Mónica offers the other option; when both are refused she leaves it open. */
function refusePlan(c: Ctx, which: string) {
  const refused: string[] = c.s.refused ?? (c.s.refused = []);
  if (!refused.includes(which)) refused.push(which);
  if (c.s.plan === which) c.s.plan = undefined;
  const other = which === "monthly" ? "day_pass" : "monthly";
  if (refused.includes(other)) {
    if (!firstThisTurn(c, "both_no")) return;
    c.say("both_no"); c.hold(); return;
  }
  c.s.offered = other;
  c.say(which === "monthly" ? "plan_alt_day" : "plan_alt_monthly", { amount: VISIT });
  c.expect(altPending(which, other));
}

function altPending(which: string, other: string): Pending {
  return { id: "alt_plan", optional: true, expects: ["choose_plan", "plan_no"], hints: ["plan", "g_yesno"],
    suggest: [{ lt: "Accept, or choose the other option", hint: "plan", options: "plan" }],
    on: { choose_plan: (cc, sl, sg) => { gym.handlers.choose_plan(cc, sl, sg); } },
    yes: (cc) => { if (politeClosing(cc)) { cc.say("alt_reask", { X: other }); cc.expect(altPending(which, other)); return; } choosePlan(cc, other); },
    // "No." to the other option too
    no: (cc) => refusePlan(cc, other),
    ask: (cc) => cc.say(which === "monthly" ? "plan_alt_day" : "plan_alt_monthly", { amount: VISIT }) };
}

/** "Está bien, gracias" / "Ok, gracias": a yes or a polite no (rule 17). */
const politeClosing = (c: Ctx) => /^\s*(esta bien|ok|okay|vale|bueno|asi esta bien)\b.*\bgracias\b/.test(heard(c));

/** "No tengo tarjeta" at the total: cash is offered and nothing is charged; a yes or the money pays. The offer is said
 *  by the pay step's ask (lead's check), after the turn's other pieces: one that pays in the same turn ("No traigo
 *  efectivo, ¿puedo pagar con tarjeta?", "Con tarjeta no, con el celular", "No tengo tarjeta, aquí tienes") pays alone,
 *  and no "¿entonces en efectivo?" is left open to take a second payment. */
function otherMethod(c: Ctx, method: string) {
  if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
  c.s.payMethod = method;
  if (!c.s.signed) { sayOnce(c, method === "cash" ? "cash_ok" : "card_later"); return; }
  c.s.otherOffer = method;
}

function offerOther(c: Ctx, method: string) {
  c.say(method === "cash" ? "cash_then" : "card_then");
  c.expect({ id: "pay_other", expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card"], hints: ["pay"],
    suggest: [{ lt: "Pay", hint: "pay" }],
    on: {
      g_ok: (cc) => pay(cc, method, true),
      here_you_go: (cc, sl, sg) => { gym.handlers.here_you_go(cc, sl, sg); },
      pay_cash: (cc) => pay(cc, "cash"), pay_card: (cc) => pay(cc, "card"),
      pay_phone: (cc, sl, sg) => { gym.handlers.pay_phone(cc, sl, sg); },
      // neither card nor cash: the phone or a transfer; the stored method is gone, so a later "Sí" pays nothing
      no_cash: (cc, _sl, sg) => { if (method === "cash" || sg.tags.includes("both")) { noCashNoCard(cc); return; } pay(cc, method, true); },
      no_card: (cc) => { if (method === "card") { noCashNoCard(cc); return; } pay(cc, method, true); },
    },
    yes: (cc) => { if (politeClosing(cc)) { cc.say("pay_reask"); cc.hold(); return; } pay(cc, method, true); },
    no: (cc) => { cc.say("pay_reask"); cc.hold(); },
    ask: (cc) => cc.say("pay_reask") });
}

function noCashNoCard(c: Ctx) {
  c.s.payMethod = undefined;
  c.s.payAltSaid = true;
  c.say("pay_alt");
  c.hold();
}

function sign(c: Ctx) {
  if (c.s.signed) return;
  c.s.signed = true;
  c.event("sign");
  c.say("form_ok");
}

function pay(c: Ctx, method: string, handed = false, change = false) {
  // never twice (a question left open after paying took a second payment before the lead's check)
  if (c.s.paid) { if (!turnSeen(c, "paid")) c.say("ack"); return; }
  c.s.paid = true;
  c.s.payMethod = method;
  c.s.otherOffer = undefined;
  firstThisTurn(c, "paid");
  c.event("pay", { method, amount: planPrice(c) });
  c.say(handed ? "paid" : method === "card" ? "card_tap" : method === "phone" ? "phone_ok" : method === "transfer" ? "transfer_ok" : "paid");
  if (change) c.say("your_change");
  if (c.s.plan === "monthly") { c.say("member_card"); c.event("give", { item: "membership_card" }); }
  else { c.say("wristband"); c.event("give", { item: "wristband" }); }
}

function tellLockers(c: Ctx) {
  c.say("lockers_info");
  const first = !c.s.lockersDone;
  c.s.lockersDone = true;
  if (first && c.s.askLock && !c.s.lockAsked) {
    c.s.lockAsked = true;
    c.say("bring_lock");
    c.expect(lockPending());
    return;
  }
  afterLockers(c);
}

function afterLockers(c: Ctx) {
  if (c.s.tellTowels && !c.s.towelsSaid) { c.s.towelsSaid = true; c.say("towels_water_tip"); }
  // after paying, before the warm-up: the learner goes to change, Mónica waits, and the warm-up starts when they're back
  if (c.s.paid && !c.s.warm) {
    c.s.changeDone = true;
    c.say("see_you_back");
    c.expect(changingPending());
  }
}

function changingPending(): Pending {
  const back = () => { /* back from the locker room: the warm-up follows */ };
  return { id: "changing", optional: true, expects: ["im_back", "ready"], hints: ["changed"],
    suggest: [{ lt: "Say you're back", hint: "changed" }],
    on: { im_back: back, ready: back, g_ok: back, g_thanks: back, g_bye: back, g_hello: back },
    yes: back, no: back };
}

function lockPending(): Pending {
  return { id: "lock_q", optional: true, expects: ["lock_have", "lock_none", "lock_borrow", "lock_need"], hints: ["lock"],
    suggest: [{ lt: "Say whether you have a lock", hint: "lock" }],
    on: {
      lock_have: (cc) => { cc.say("lock_yes"); afterLockers(cc); },
      lock_none: (cc) => { cc.say("lock_buy"); afterLockers(cc); },
      lock_borrow: (cc) => { cc.say("lock_borrow_ok"); afterLockers(cc); },
      lock_need: (cc) => { cc.say("lock_need_info"); afterLockers(cc); },
    },
    yes: (cc) => { cc.say("lock_yes"); afterLockers(cc); },
    no: (cc) => { cc.say("lock_buy"); afterLockers(cc); },
    ask: (cc) => cc.say("bring_lock") };
}

function chooseWarm(c: Ctx, id: string, monicaPicks: boolean) {
  c.s.warm = id;
  if (monicaPicks) c.say(id === "bike" ? "warm_pick_bike" : "warm_pick_tread");
  else if (id === "elliptical") c.say("warm_other_ok");
  c.say("warm_ok");
  if (c.s.askFeel && !c.s.feelAsked) {
    c.s.feelAsked = true;
    c.s.warmedSaid = true;
    c.say("warmed_up");
    c.say("feel_q");
    c.expect(feelPending());
  }
}

function feelPending(): Pending {
  const good = (cc: Ctx) => { cc.say("feel_good_reply"); };
  const tiredR = (cc: Ctx) => { cc.say("feel_tired_reply"); };
  return { id: "feel_q", optional: true, expects: ["feel_good", "tired", "out_breath", "not_tired"], hints: ["feel"],
    suggest: [{ lt: "Say how you feel", hint: "feel" }],
    on: { feel_good: good, not_tired: good, g_ok: good, g_howareyou_answer: good, tired: tiredR, out_breath: tiredR, g_howareyou_bad: tiredR },
    yes: good, no: tiredR, ask: (cc) => cc.say("feel_q") };
}

function brokenPending(): Pending {
  return { id: "broken", expects: ["machine_free_q", "machine_free_ctx", "machine_taken", "broken_q"], hints: ["machine", "broken"],
    suggest: [{ lt: "Ask if the other one is free", hint: "machine" }, { lt: "Ask what happened", hint: "broken" }],
    on: {
      machine_free_q: (cc) => { machineOk(cc, true); },
      machine_free_ctx: (cc) => { machineOk(cc, true); },
      machine_taken: (cc) => { machineOk(cc, false); },
      broken_q: (cc) => { cc.say("broken_info"); cc.say("machine_nudge_other"); cc.expect(brokenPending()); },
    },
    yes: (cc) => machineOk(cc, false),
    no: (cc) => machineOk(cc, false),
    ask: (cc) => cc.say("machine_nudge_other") };
}

function machineOk(c: Ctx, asked: boolean) {
  if (c.s.machineOk) { c.say("machine_ok"); return; }
  c.s.machineOk = true;
  // "Ya terminó" only fits once Mónica has pointed at the machine (with a towel or a bottle on it)
  c.say(asked && c.s.machineAsked ? "machine_ok_asked" : "machine_ok");
  // asked about a machine before Mónica pointed at one: she names it
  if (!c.s.machineAsked) { c.s.machineAsked = true; c.s.warmedSaid = true; c.say("this_is_x", { X: exercise(c) }); }
}

function startSets(c: Ctx) {
  c.s.setsDone = true;
  if (!c.s.setsSaid) { c.s.setsSaid = true; c.say("sets_answer"); if (c.s.restTip) c.say("rest_tip"); }
  c.say("rep_count");
  c.expect(repPending());
}

function repPending(): Pending {
  const done = (cc: Ctx) => repDone(cc, false);
  const cantR = (cc: Ctx) => repDone(cc, true);
  return { id: "rep", expects: ["rep_done_ctx", "cant", "tired", "out_breath"], hints: ["rep"],
    suggest: [{ lt: "Do the last rep", hint: "rep" }],
    on: {
      rep_done_ctx: done, g_ok: done, feel_good: done, g_howareyou_answer: done, tired: done, out_breath: done, not_tired: done, ready: done,
      cant: cantR,
      pain: (cc, _sl, sg) => { hurt(cc, sg.tags); },
      pain_ctx: (cc, _sl, sg) => { hurt(cc, sg.tags); },
    },
    yes: done, no: cantR, ask: (cc) => cc.say("one_more_again") };
}

function repDone(c: Ctx, couldnt: boolean) {
  if (c.s.repDone) { c.say("ack"); return; }
  c.s.repDone = true;
  c.say(couldnt ? "cant_reply" : "good_job");
  // twist: something hurts after the leg press
  if (c.s.painTwist && !c.s.painAsked && !c.s.pain) {
    c.s.painAsked = true;
    c.twist("hurts");
    c.say("okay_q");
    c.expect(okayPending());
  }
}

function okayPending(): Pending {
  // "Estoy bien, pero me duele un poco la rodilla": the pain piece answers, never "¡Qué bueno!" first
  const fine = (cc: Ctx) => { if (painToo(cc)) return; cc.say("fine_reply"); };
  // just tired or out of breath: normal after the leg press
  const tiredO = (cc: Ctx) => { if (painToo(cc)) return; cc.say("okay_tired"); };
  // "Me duele un poco" names no part: she asks which, never assumes the knee (lead's check); asked once
  const painH = (cc: Ctx, _sl: any, sg: { tags: string[] }) => {
    if (!cc.s.pain && !cc.s.whereAsked && !partNamed(cc, sg.tags)) { if (firstThisTurn(cc, "pain")) askWhere(cc); return; }
    hurt(cc, sg.tags);
  };
  return { id: "okay_q", expects: ["pain", "pain_ctx", "no_pain", "feel_good", "tired", "out_breath"], hints: ["pain"],
    suggest: [{ lt: "Say that your knee or back hurts", hint: "pain" }],
    on: {
      pain: painH, pain_ctx: painH, no_pain: (cc, _sl, sg) => noPainAnswer(cc, sg.tags), feel_good: fine, not_tired: fine, g_ok: fine, g_howareyou_answer: fine,
      tired: tiredO, out_breath: tiredO,
      g_howareyou_bad: (cc) => { askWhere(cc); },
    },
    yes: fine,
    no: (cc) => { askWhere(cc); },
    ask: (cc) => cc.say("okay_q") };
}

function whereHurtPending(): Pending {
  const painH = (cc: Ctx, _sl: any, sg: { tags: string[] }) => { hurt(cc, sg.tags); };
  return { id: "where_hurt", optional: true, expects: ["pain", "pain_ctx", "no_pain"], hints: ["pain"],
    suggest: [{ lt: "Say what hurts", hint: "pain" }],
    on: { pain: painH, pain_ctx: painH, no_pain: (cc, _sl, sg) => noPainAnswer(cc, sg.tags) },
    yes: (cc) => { cc.say("fine_reply"); }, no: (cc) => { cc.say("fine_reply"); },
    ask: (cc) => cc.say("what_hurts") };
}

/** "No me duele la rodilla" said aloud could be "No, me duele la rodilla" (rule 10): Mónica asks; any other
 *  "no pain" answer is fine. */
function noPainAnswer(c: Ctx, tags: string[]) {
  if (!tags.includes("amb")) { c.say("fine_reply"); return; }
  // "No me duele" names no part: a "Sí" then asks which
  c.s.ambPart = PARTS.some((x) => tags.includes(x)) || /\b(rodilla|espalda|cintura|pierna|tobillo|cadera|pie|hombro|brazo|muneca|codo|cuello)s?\b/.test(heard(c)) ? hurtPart(c, tags) : undefined;
  c.say("pain_amb");
  const painH = (cc: Ctx, _sl: any, sg: { tags: string[] }) => { hurt(cc, sg.tags); };
  c.expect({ id: "pain_amb", expects: ["pain", "pain_ctx", "no_pain"], hints: ["g_yesno", "pain"],
    suggest: [{ lt: "Say whether it hurts", hint: "pain" }],
    // "Sí, me duele." names no part: the one just said
    on: { pain: (cc, _sl, sg) => { if (!cc.s.ambPart && !PARTS.some((x) => sg.tags.includes(x))) { askWhere(cc); return; }
      hurt(cc, PARTS.some((x) => sg.tags.includes(x)) ? sg.tags : [cc.s.ambPart as string]); }, pain_ctx: painH, no_pain: (cc) => { cc.say("fine_reply"); } },
    yes: (cc) => { if (!cc.s.ambPart) { askWhere(cc); return; } hurt(cc, [cc.s.ambPart as string]); },
    no: (cc) => { cc.say("fine_reply"); },
    ask: (cc) => cc.say("pain_amb") });
}

/** True the first time `key` comes up in this learner turn (the engine gives every turn its own context
 *  object): "¡Ay, me duele la rodilla!" is one complaint, not two. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
/** Has `key` come up in this learner turn (without marking it)? */
const turnSeen = (c: Ctx, key: string) => !!TURN.get(c)?.has(key);
/** A line said once per turn ("No traigo efectivo, ¿puedo pagar con tarjeta?" before the form: one "con tarjeta no hay
 *  problema"). */
function sayOnce(c: Ctx, line: string) { if (firstThisTurn(c, `line:${line}`)) c.say(line); }

/** "¿Seiscientos?" with the visit chosen: "No, son $100." (rule 20); the plan never changes on an amount. */
function checkAmount(c: Ctx) {
  const said = /\b(seiscientos|600)\b/.test(heard(c)) ? MONTHLY : VISIT;
  c.say(said === planPrice(c) ? "price_yes" : "price_not", { price: planPrice(c) });
  // at the total the price is the answer (no "¿cómo vas a pagar?" again right after it)
  if (c.step === "pay") c.hold();
}

/** "¿Puedo pagar con tarjeta o en efectivo?": both are fine, nothing is paid; the pay step then asks how. */
function askedBoth(c: Ctx) { if (firstThisTurn(c, "both")) c.say("pay_both"); }

/** A bare "mañana" or "a la misma hora" in a turn that says "no puedo" or "no sé" books nothing (lead's check): "A la
 *  misma hora no puedo" is answered by its "no puedo"; "Mañana no sé", "Mañana tal vez" are "send me a message". */
function bareBookingBlocked(c: Ctx): boolean {
  const h = heard(c);
  if (/\b(no se(?! puede)|tal vez|quizas?|a lo mejor|no estoy segur[oa])\b/.test(h)) { bookLater(c); return true; }
  return /\bno (puedo|me queda|se puede)\b/.test(h);
}

/** Which part hurts: the piece's own tag, else the whole sentence ("¡Ay, la espalda!"). */
const PARTS = ["knee", "back", "leg", "shoulder", "arm", "neck"];
/** Is a body part named ("Me duele la rodilla", "¡Ay, la espalda!")? */
const partNamed = (c: Ctx, tags: string[]) => PARTS.some((x) => tags.includes(x))
  || /\b(rodillas?|espalda|cintura|piernas?|tobillos?|caderas?|pies?|hombros?|brazos?|munecas?|codos?|cuello)\b/.test(heard(c));

/** "¡Ay, no! ¿Qué te duele?" (asked once: a second part-less answer takes the likeliest part, the knee). */
function askWhere(c: Ctx) {
  c.s.whereAsked = true;
  c.say("what_hurts");
  c.expect(whereHurtPending());
}

function hurtPart(c: Ctx, tags: string[]): string {
  for (const x of PARTS) if (tags.includes(x)) return x === "shoulder" || x === "neck" ? "arm" : x;
  const h = heard(c);
  if (/\brodillas?\b/.test(h)) return "knee";
  if (/\b(espalda|cintura)\b/.test(h)) return "back";
  if (/\b(piernas?|tobillos?|caderas?|pies?)\b/.test(h)) return "leg";
  if (/\b(hombros?|brazos?|munecas?|codos?|cuello)\b/.test(h)) return "arm";
  return "knee";
}

/** Something hurts: Mónica reacts once per turn and takes one easier path. A sore knee or leg during the leg press:
 *  upper body instead (the bench press with just the bar comes next). Anything else, or pain during the bench press:
 *  easy stretching and no more weights; she waits, then asks how it feels. At the end: stop there. Before the
 *  workout: everything easy (the bike, the chest machine). */
function hurt(c: Ctx, tags: string[]) {
  if (!firstThisTurn(c, "pain")) return;
  const part = hurtPart(c, tags);
  const first = !c.s.pain;
  if (first) { c.s.pain = part; c.twist("hurts"); }
  if (c.s.breathDone) { c.say("easy_tonight"); return; }
  if (c.step === "breath") { c.s.breathDone = true; c.say("pain_stop"); c.say("break_water"); return; }
  if (c.step === "spot" && !c.s.spotDone) { c.say("pain_reply"); stretchInstead(c); return; }
  if (!c.s.warm) {
    c.say("easy_today");
    if (c.step === "warmup") chooseWarm(c, "bike", true);
    return;
  }
  if (!c.s.spotDone) {
    // the leg press (or right after it: "¡Uy! ¿Estás bien?")
    const started = !!c.s.setsDone;
    c.s.machineOk = true; c.s.setsDone = true; c.s.repDone = true;
    c.say(started ? "pain_reply" : "easy_today");
    if (first && (part === "knee" || part === "leg")) { c.say("arms_instead"); return; }
    stretchInstead(c);
    return;
  }
  c.say("easy_today");
}

/** Easy stretches instead of weights: no bench press. The learner answers ("Bueno"), then Mónica asks how it feels. */
function stretchInstead(c: Ctx) {
  c.s.stretched = true;
  c.s.machineOk = true; c.s.setsDone = true; c.s.repDone = true; c.s.spotDone = true;
  c.say("stretch_instead");
  const go = () => { /* the stretches are done: "¿Cómo te sientes ahora?" follows */ };
  c.expect({ id: "stretch", optional: true, expects: [], hints: ["g_yesno"], suggest: [{ lt: "Agree", hint: "g_yesno" }],
    on: { g_ok: go, g_thanks: go }, yes: go, no: go });
}

function spotGo(c: Ctx, asked: boolean) {
  if (c.s.spotDone) { c.say("ack"); return; }
  c.s.spotDone = true;
  // she already said "¡Claro! Yo te cuido." when asked earlier: no second "yo te cuido" (rule 13)
  if (asked || !c.s.spotAgreed) c.say(asked ? "spot_yes" : "spot_offer");
  c.say("bench_go");
}

function breathPending(c: Ctx): Pending {
  const tiredB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say("break_water"); if (cc.chance(0.5)) cc.say("earned_it"); };
  const goodB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say(cc.s.pain ? "ok_water" : "great_shape"); };
  const okB = (cc: Ctx) => { if (cc.s.breathDone) return; cc.s.breathDone = true; cc.say("ok_water"); };
  const hint = c.s.stretched ? "feel_now" : "breath";
  return { id: "breath_q", expects: ["out_breath", "tired", "feel_good", "not_tired", "water_q"], hints: [hint],
    suggest: [{ lt: c.s.stretched ? "Say how you feel after stretching" : "Say how you feel", hint }],
    on: {
      out_breath: tiredB, tired: tiredB, water_q: tiredB, g_howareyou_bad: tiredB,
      feel_good: goodB, not_tired: goodB, g_ok: okB, g_howareyou_answer: goodB,
      pain: (cc, _sl, sg) => { hurt(cc, sg.tags); },
    },
    yes: okB, no: tiredB, ask: (cc) => cc.say("feel_q") };
}

function setNext(c: Ctx, value: string) {
  if (c.s.next) { c.say("ack"); return; }
  c.s.next = value;
  keepNext(c);
  // "Mañana a las siete": another time, so never "Mañana, a la misma hora"
  // (and "Mañana en la tarde", "más temprano": lead's check)
  const h = heard(c);
  c.say(/\b(a (las|la) \w+|en la (manana|tarde|noche)|por la (manana|tarde|noche)|temprano|mas tarde)\b/.test(h) && !/misma hora/.test(h) ? "see_tomorrow_plain" : "see_tomorrow");
}

function nextDay(c: Ctx, day: string | undefined) {
  if (!c.s.breathDone) { if (day) c.s.nextPref = day; c.say("ack"); return; }
  if (!day || day === "tomorrow") { setNext(c, "tomorrow"); return; }
  if (c.s.next) { c.say("ack"); return; }
  if (day === "today") { c.s.nextAsk = "same"; c.say("same_time_short"); c.hold(); return; }
  c.s.next = day;
  keepNext(c);
  if (DAY_IDS.includes(day)) c.say(day === c.s.offeredDay ? "see_day_plain" : "see_day", { X: day });
  else c.say("see_then");
}

/** "Te aviso." / "Todavía no sé.": book later. Said once ("Todavía no sé. Te aviso." is two pieces). */
function bookLater(c: Ctx) {
  if (c.s.next === "later") return;
  c.s.next = "later";
  keepNext(c);
  c.say("book_later_ok");
}

/** A change after the goodbye started (finish already remembered the old day): remember the new one. */
function keepNext(c: Ctx) { if (c.s.__finished) c.remember({ next: c.s.next }); }

/** "No puedo el jueves" (aloud also "No puedo, ¿el jueves?"): "¿Entonces el jueves?" A yes books that day, a no is
 *  "send me a message". */
function askDay(c: Ctx, day: string) {
  c.s.offeredDay = day;
  c.say("day_amb", { X: day });
  c.expect({ id: "day_amb", expects: ["next_day", "when_ctx", "day_no", "next_no", "next_later", "later_ctx", "cant", "next_same"], hints: ["next", "g_yesno"],
    suggest: [{ lt: "Say whether that day works", hint: "next", options: "weekday" }],
    on: {
      next_day: (cc, sl) => { nextDay(cc, ((sl.day ?? sl.weekday) as string | undefined) ?? day); },
      when_ctx: (cc, sl) => { if (bareBookingBlocked(cc)) return; nextDay(cc, (sl.day as string | undefined) ?? day); },
      next_same: (cc) => { if (bareBookingBlocked(cc)) return; setNext(cc, "tomorrow"); },
      day_no: (cc) => bookLater(cc), next_no: (cc) => bookLater(cc), cant: (cc) => bookLater(cc),
      next_later: (cc) => bookLater(cc), later_ctx: (cc) => bookLater(cc),
    },
    yes: (cc) => nextDay(cc, day),
    no: (cc) => bookLater(cc),
    ask: (cc) => cc.say("day_amb", { X: day }) });
}

function offerThursday(c: Ctx) {
  c.s.offeredDay = "thursday";
  c.say("offer_thursday");
  c.expect({ id: "thursday_q", expects: ["next_day", "next_later", "later_ctx", "next_same", "when_ctx", "see_you_ctx", "cant", "day_no"], hints: ["next", "g_yesno"],
    suggest: [{ lt: "Agree, or suggest another day", hint: "next", options: "weekday" }],
    on: {
      next_day: (cc, sl) => { nextDay(cc, (sl.day ?? sl.weekday) as string | undefined); },
      when_ctx: (cc, sl) => { if (bareBookingBlocked(cc)) return; nextDay(cc, (sl.day as string | undefined) ?? "thursday"); },
      next_same: (cc) => { if (bareBookingBlocked(cc)) return; setNext(cc, "tomorrow"); },
      see_you_ctx: (cc) => { nextDay(cc, "thursday"); },
      next_later: (cc) => bookLater(cc),
      later_ctx: (cc) => bookLater(cc),
      // "No, tampoco puedo." to "¿Qué tal el jueves?"
      cant: (cc) => bookLater(cc),
      next_no: (cc) => bookLater(cc),
      day_no: (cc) => bookLater(cc),
    },
    yes: (cc) => nextDay(cc, "thursday"),
    no: (cc) => bookLater(cc),
    ask: (cc) => cc.say("offer_thursday") });
}

export default gym;
