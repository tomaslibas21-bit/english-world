// NEEDS: None. All vocabulary, merges, the guarantor (aval) questions and their grammar are local.
// Song 81 "Are the Bills Included?" → Departamentos Las Palmas, Puerto Colibrí. Don Ernesto, the landlord (usted),
// shows a one-bedroom departamento on the first floor (one flight up; he lives on the planta baja). The learner asks
// about the rent, the servicios (utilities), the deposit, the lease, pets, parking and laundry, answers his questions
// (move-in date, how many people, pets) and decides: take it (ID and proof of income, the aval, sign, keys) or think.
// Keeps the English situation's steps, intents and twists: tenant mode (a returning tenant reports a problem: the AC,
// a dripping faucet, no hot water → someone comes tomorrow at ten) and someone_else (another person comes tomorrow).
// The brief adds the aval twist: a guarantor with a home in town, a real hurdle for newcomers; without one, two months'
// deposit, or a póliza jurídica (a rental guarantee policy), or no deal for now.
// Research (Nov 2026): Mexican rentals usually ask one month's deposit plus the first month, a one-year contract, ID
// and proof of income, and an aval (a local property owner) or, failing that, a póliza jurídica or a bigger deposit.
// Electricity (la luz) is billed every two months; gas is often an estacionario tank refilled by the pipa; water is
// often included in small buildings. Rent $14,000 a month (STYLE.md: $12,000–20,000 in a beach town). Figures that
// vary (the póliza's price, the electricity bill) stay vague on purpose. Invented for the town: a laundry area on the
// azotea, water and maintenance included, the deposit lost if the tenant leaves before the year. The brief's "CFE bill"
// is el recibo de luz here (STYLE.md: no real companies). Directions follow the 3D town (docs/es/TOWN.md "Getting
// around", audit 5 Nov): Las Palmas is on calle Hidalgo at calle Flamboyán; the centro and the beach five minutes away
// (the beach straight up Flamboyán), the colectivos waved down on avenida Juárez a block up, the city bus stop a block
// east in front of the gym, Farmacia del Puerto on Juárez, the mercado two blocks up. The apartment is "1B" on the sign;
// Don Ernesto owns the building and Don Gilberto (p24) is its administrador. The scene pictures (shown instead of the
// 3D room) have the kitchen on the left and the sea from the balcony: the lines name no side, and the sea is "se alcanza
// a ver" (at the end of calle Flamboyán).

import type { Ctx, EntityDef, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import type { ConvCtx } from "@/convo/dialogue";

// ---------------------------------------------------------------------------
// Entities (Don Ernesto's answers about utilities and appliances)

const UTILITIES: EntityDef[] = [
  ent("water", "agua", "water", "f", { art: "un", def: "el", forms: ["el agua", "agua potable", "el recibo del agua"], chip: "agua" }),
  ent("electricity", "luz", "electricity", "f", { forms: ["la luz", "electricidad", "la electricidad", "el recibo de luz", "recibo de luz", "recibo de la luz", "la corriente", "corriente"], chip: "luz" }),
  ent("gas", "gas", "gas", "m", { forms: ["el gas", "gas estacionario", "el tanque de gas", "tanque de gas", "el cilindro", "cilindro de gas"], chip: "gas" }),
  ent("internet", "internet", "internet", "m", { forms: ["el internet", "wifi", "wi fi", "el wifi", "cable", "el cable"], chip: "internet" }),
  ent("maintenance", "mantenimiento", "maintenance", "m", { forms: ["el mantenimiento", "cuota de mantenimiento", "la cuota de mantenimiento"], chip: "mantenimiento" }),
  ent("trash", "basura", "trash pickup", "f", { forms: ["la basura", "recoleccion de basura", "la recoleccion de basura"], chip: "basura" }),
];
const INCLUDED = ["water", "maintenance", "trash"];

const APPLIANCES: EntityDef[] = [
  ent("fridge", "refrigerador", "fridge", "m", { forms: ["refri", "el refri", "refrigerador", "nevera", "frigorifico", "heladera"], attrs: { kitchen: true } }),
  ent("stove", "estufa", "stove", "f", { forms: ["la estufa", "estufa de gas", "horno", "el horno", "cocina de gas", "parrilla"], attrs: { kitchen: true } }),
  ent("microwave", "microondas", "microwave", "m", { pl: "microondas", forms: ["horno de microondas", "el microondas"], attrs: { none: true } }),
  ent("dishwasher", "lavaplatos", "dishwasher", "m", { pl: "lavaplatos", forms: ["lavavajillas", "el lavaplatos"], attrs: { none: true } }),
  ent("washer", "lavadora", "washing machine", "f", { forms: ["la lavadora", "lavadoras", "lavarropas"] }),
  ent("dryer", "secadora", "dryer", "f", { forms: ["la secadora", "secadoras"] }),
  ent("ac", "aire | acondicionado", "air | conditioning", "m", { forms: ["clima", "el clima", "climas", "aire", "el aire", "minisplit", "mini split", "el aire acondicionado"], attrs: { nat: "AC" } }),
  ent("fan", "ventilador", "fan", "m", { forms: ["ventiladores", "ventilador de techo", "abanico"] }),
  ent("heater", "calentador", "water heater", "m", { forms: ["boiler", "el boiler", "calentador de agua", "el calentador"] }),
];

// ---------------------------------------------------------------------------
// State helpers

type Topic = "rent" | "utilities" | "deposit" | "furnished" | "pets" | "lease" | "movein" | "parking" | "laundry"
  | "quiet" | "bus" | "floor" | "smoking" | "size" | "see" | "payrent" | "apply" | "landlord" | "lower" | "aval";
const CORE: Topic[] = ["rent", "utilities", "deposit", "lease"];
const CORE_LINE: Record<string, string> = { rent: "rent_full", utilities: "utilities_all", deposit: "deposit_full", lease: "lease_full" };
const RENT = 1400000;

const view = (c: Ctx) => c.s.mode === "view";
// ¡ and ¿ go too: typed "¡Está bien, gracias!" is the same polite closing as the spoken one (never a yes)
const heard = (c: Ctx) => (c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¡¿]/g, "").toLowerCase();
/** "Si me lo quedo, ¿cuándo me puedo mudar?": an if (si without its accent, no comma after it, and a clause after the
 *  take), never a yes. "Sí, me lo quedo", "Si, me lo quedo" and "Si me lo quedo, gracias" stay a take. */
function ifTake(c: Ctx): boolean {
  if (!/^si\b/i.test((c.heard || "").trim().replace(/^["'«¡¿\s]+/, ""))) return false;
  const m = heard(c).match(/^\s*["'«]*si\s+(?:me lo quedo|lo rento|lo rentamos|lo tomo|lo quiero|lo alquilo|me quedo con el|me lo llevo|me interesa)\b(.*)$/);
  if (!m) return false;
  const rest = m[1].replace(/[^a-zñ ]+/g, " ")
    .replace(/\b(muchas gracias|gracias|por favor|don ernesto|senor|entonces|por un ano|de una vez|hoy mismo|ahora mismo|ahorita|hoy|ya)\b/g, " ").trim();
  return rest.length > 0;
}

/** The learner asked about a topic: note it (and, if they skipped the greeting, let them in). */
function asked(c: Ctx, topic: Topic) {
  if (view(c) && !c.s.purpose) { c.s.purpose = true; c.say("come_in"); }
  if (!c.s.asked[topic]) c.s.qCount++;
  c.s.asked[topic] = true;
  if (c.s.qCount >= 2 && c.chance(0.15)) c.say("good_q");
}

/** Don Ernesto mentions the key terms the learner did not ask about. `plain`: "Ah, y por cierto:", because the line
 *  that follows starts with "Para que sepa" (the someone-else twist). */
function volunteer(c: Ctx, plain = false) {
  const missing = CORE.filter((k) => !c.s.asked[k]);
  if (!missing.length) return;
  if (plain) (c as ConvCtx).conv.pushLine("fyi", 0, {}); else c.say("fyi");
  for (const k of missing) { c.say(CORE_LINE[k], { rent: RENT }); c.s.asked[k] = true; }
}

/** The terms were just said by "terms_first" in this same sentence ("Me interesa, ¿cuánto es la renta?"). */
const termsJustSaid = (c: Ctx) => !!c.s.termsHeard && c.s.termsHeard === c.heard;

/** "Sí, …" / "No, …" at the start of what the learner said. */
function ynLead(c: Ctx): "yes" | "no" | null {
  const h = heard(c);
  if (/^\s*(si|claro|ok|okay|va|sale|vale|por supuesto|exacto|asi es)\b/.test(h)) return "yes";
  if (/^\s*no\b/.test(h)) return "no";
  return null;
}

const AUTO: Record<string, string> = {
  purpose: "Hola, vengo a ver el departamento.", movein_q: "El primero del mes, si se puede.", movein_take: "El primero del mes, si se puede.",
  people_q: "Solo yo.", how_many: "Solo yo.", pets_q: "No, no tengo mascotas.", pet_which: "Un gato.", questions: "No, es todo, gracias.",
  decision: "¡Me lo quedo!", docs: "Aquí tiene mi pasaporte.", aval: "No, no tengo aval.", extra_deposit: "Sí, está bien.", poliza: "Sí, me parece bien.",
  sign: "Claro. ¿Dónde firmo?", hurry: "Sí, le llamo hoy en la noche.",
  problem: "El aire acondicionado no funciona.", visit: "Sí, voy a estar en casa.", key_ok: "Sí, está bien.", other_time: "Después de las cinco, por favor.",
};

const F_CLOCK = "Spanish uses an article before clock times; English has no separate word.";
const F_RECAMARA = "Mexican: recámara = bedroom; habitación is more widely used.";
const F_DEPA = "departamento: the usual word for an apartment in Mexico; apartamento is more widely used.";
const F_NOMAS = "Mexican: nomás = just, only.";
const F_AL = "al = a + el: Spanish marks a person as the object with a; English needs no extra word.";
const F_UNOS = "unos before a number means about, roughly.";
const F_DE_AMOUNT = "de before an amount: Spanish says the rent is “of” a sum; English needs no word.";
const F_COLECTIVO = "colectivo: a shared van on a fixed route; you pay the driver in cash.";
const F_LA_MANO = "la mano: with a body part Spanish says the (la), where English says your.";
const F_POLIZA = "póliza jurídica: a rental guarantee from a legal firm, common in Mexico when there's no guarantor.";

const omit = (keys: string[]) => Object.fromEntries(Object.entries(AUTO).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const apartment: SituationDef = {
  id: "s81-apartment",
  song: 81,
  songTitle: "Are the Bills Included?",
  title: { en: "¿Están incluidos los servicios?", lt: "Are utilities included?" },
  topic: { en: "Rentar un departamento", lt: "Renting an apartment" },
  chapter: 3,
  order: 1,
  location: "apartments",
  npc: "patel",
  goal: "Look at the apartment and find out the terms: the rent, the utilities, the deposit and the lease. Then decide whether to take it.",
  intro: "Departamentos Las Palmas, a small building in Puerto Colibrí. Don Ernesto, the landlord, is showing a one-bedroom apartment one floor up. Prices are in Mexican pesos.",
  entities: { utility: UTILITIES, appliance: APPLIANCES },

  grammar: {
    macros: {
      apt: "(departamento | depa | departamentito | apartamento | piso)",
      the_apt: "[el | este | ese | su] @apt [que (renta | se renta | esta en renta | anuncio) | en renta | de la renta | de arriba]",
      incl: "(incluido | incluida | incluidos | incluidas | incluido en la renta | incluidos en la renta | en la renta | dentro de la renta)",
      util_all: "(los servicios | servicios | los gastos | los recibos | las cuentas | los pagos de servicios | los gastos comunes)",
      per_month: "(al mes | por mes | mensual | mensuales | cada mes | el mes)",
      rent_w: "(renta | alquiler)",
      dep: "(deposito | fianza | garantia)",
      staff: "(puede | podria | me puede | me podria | puedes #tip:tu_staff | me puedes #tip:tu_staff)",
      month: "(enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | setiembre | octubre | noviembre | diciembre)",
      fam: "(esposa | esposo | pareja | novia | novio | hijo | hija | hijos | hijas | familia | amigo | amiga | bebe | mama | papa | hermana | hermano | dos hijos | tres hijos | perro | gato)",
      broken: "(no funciona | no sirve | no prende | no enciende | no enfria | no calienta | no jala | ya no funciona | ya no sirve | ya no enfria | esta descompuesto | esta descompuesta | se descompuso | dejó de funcionar | esta roto | esta rota | se rompió | no esta funcionando)",
      where_when: "(en la cocina | en el bano | en la recamara | en el cuarto | en el departamento | desde ayer | desde anoche | desde hoy en la manana | desde la manana | otra vez | de nuevo | todavia)",
      when_mv: [
        "(lo antes posible | lo mas pronto posible | cuanto antes | lo mas rapido posible | lo mas pronto que se pueda) #h:asap",
        "(ya | ahorita | ahora | de inmediato | hoy | hoy mismo | manana | manana mismo | luego luego | esta semana | este fin de semana | este mes)",
        "(el | al) (proximo | siguiente) mes #h:next_month", "(la | a la) (proxima | siguiente) semana", "el mes que (entra | viene)", "la semana que (entra | viene)",
        "[el | para el | desde el | a partir del] primero [del mes | de mes | de @month | del proximo mes | del mes que entra] #h:movein_first",
        "[el | para el | desde el | a partir del] {date}",
        "[a | para] (principios | fin | fines | finales | mediados) de (mes | este mes | @month | diciembre | enero)",
        "[en | para | desde | a partir de] @month", "en (una semana | un mes | dos semanas | unos dias | quince dias | {number} (dias | semanas | meses))",
        "[el | este | el proximo | el otro] {day}", "(este | el) fin de mes", "a fin de mes",
      ],
      like_pre: "(me (gusta | encanta) [mucho | muchisimo] | (esta | es) (muy bonito | muy lindo | precioso | perfecto | bonito | lindo | padrisimo | muy padre))",
      think_core: [
        "(lo | la) (voy a | tengo que | necesito | quiero) pensar [un poco | bien] #h:think", "(tengo que | necesito | quiero | voy a) pensarlo [un poco | bien]",
        "(dejeme | deje | dejame #tip:tu_staff) pensarlo [un poco]", "lo pienso [y le aviso]",
        "(le | te #tip:tu_staff) puedo (avisar | contestar | decir | confirmar) (manana | luego | despues | mas tarde | el {day} | en unos dias) #h:let_know",
        "(le | te) (aviso | llamo | marco | hablo | escribo | confirmo) (manana | luego | despues | el {day} | en unos dias | la proxima semana)",
        "(necesito | tengo que | quiero) (hablarlo | platicarlo | consultarlo | hablar | platicar | consultar) con mi @fam [primero]",
        "(lo | tengo que) (consultar | platicar | hablar) con mi @fam [y le aviso]", "(manana | el {day} | luego) le (aviso | digo | llamo | confirmo)",
        "(tengo | voy a ver | todavia tengo) otros (departamentos | lugares) [que ver | por ver]",
        "(necesito | quiero) ver otros (departamentos | lugares) [primero]",
        "(necesito | quiero) (mas tiempo | un dia mas | unos dias | un poco de tiempo) [para (pensarlo | decidir | decidirme)]",
        "todavia no (estoy | me siento) (seguro | segura)", "no estoy (seguro | segura) todavia", "todavia no me decido",
        "lo consulto con la almohada", "(voy a | tengo que) pensarlo bien",
        "no se si (me lo quedo | me lo voy a quedar | lo rento | lo voy a rentar | lo tomo | lo quiero | rentarlo | me interesa | me conviene | es para mi)",
        "no estoy (seguro | segura) (si | de) (me lo quedo | rentarlo | quedarmelo | que me interese)", "no se (dejeme | deje) pensarlo", "no se (lo voy a | lo tengo que | tengo que) (pensar | pensarlo)",
      ],
    },
    slots: {
      pet: { lexicon: [
        { id: "cat", forms: ["gato", "gatos", "gatito", "gatita", "gatitos", "gata", "gatos chiquitos"] },
        { id: "dog", forms: ["perro", "perros", "perrito", "perrita", "perritos", "perra", "perro chico", "perro chiquito", "perro pequeno", "chihuahua", "perrito chiquito"] },
        { id: "bigdog", forms: ["perro grande", "perrote", "perros grandes", "pastor aleman", "labrador", "perra grande"] },
        { id: "other", forms: ["pajaro", "pajaros", "perico", "pericos", "pez", "peces", "pececito", "pececitos", "hamster", "conejo", "tortuga", "iguana", "loro", "canario"] },
      ] },
      room: { lexicon: [
        { id: "bedroom", forms: ["recamara", "recamaras", "cuarto", "dormitorio", "habitacion"] },
        { id: "bathroom", forms: ["bano", "banos"] },
        { id: "kitchen", forms: ["cocina"] },
        { id: "living", forms: ["sala", "comedor", "sala comedor"] },
        { id: "closet", forms: ["closet", "closets", "ropero", "armario"] },
        { id: "balcony", forms: ["balcon", "terraza"] },
        { id: "roof", forms: ["azotea", "area de lavado"] },
        { id: "rest", forms: ["resto", "resto del departamento", "los demas cuartos", "todo"] },
      ] },
      fix: { lexicon: [
        { id: "ac", forms: ["clima", "aire acondicionado", "aire", "minisplit", "mini split", "el aire"] },
        { id: "hotwater", forms: ["agua caliente", "calentador", "boiler", "calentador de agua"] },
        { id: "faucet", forms: ["llave", "llave de la cocina", "llave del bano", "llave del agua", "grifo", "grifo de la cocina", "tarja", "fregadero", "lavabo", "tubo", "tuberia", "lavamanos"] },
        { id: "toilet", forms: ["bano", "escusado", "excusado", "inodoro", "taza del bano", "wc"] },
        { id: "shower", forms: ["regadera", "ducha"] },
        { id: "appliance", forms: ["refri", "refrigerador", "estufa", "lavadora", "horno", "microondas", "secadora"] },
        { id: "lights", forms: ["luz", "luces", "electricidad", "contacto", "contactos", "enchufe", "enchufes", "apagador"] },
        { id: "window", forms: ["ventana", "ventanas", "puerta", "chapa", "cerradura", "puerta de entrada"] },
        { id: "fan", forms: ["ventilador", "ventiladores"] },
      ] },
    },
  },

  intents: {
    // --- arriving -----------------------------------------------------------
    see_apartment: { patterns: [
      "(vengo | vine | venimos) a ver @the_apt #h:here_see",
      "(vengo | vine | venimos) (por | para) @the_apt #h:here_about",
      "(me gustaria | quisiera | queria) ver @the_apt #h:like_see", "(me gustaria | quisiera) verlo",
      "quiero ver @the_apt #blunt", "(quiero | quisiera | queria | me gustaria) (rentar | alquilar) @the_apt",
      "(puedo | podemos | se puede) ver @the_apt",
      "(estoy | estamos) (interesado | interesada | interesados) en @the_apt", "me interesa @the_apt",
      "(estoy | ando | estamos) buscando (un | una) @apt [para (rentar | alquilar) | en renta]",
      "(hablamos | platicamos) por telefono [ayer | hoy | el {day} | esta manana] #h:spoke_phone", "(hablamos | platicamos) (ayer | hoy | el {day} | esta manana) por telefono",
      "le (llamé | hablé | escribí) [por telefono | por whatsapp] [ayer | hoy | el {day} | esta manana] [por @the_apt]",
      "le mandé un mensaje [ayer | hoy | por whatsapp]",
      "(tengo | tenemos) una cita [para ver @the_apt] [a {time}]",
      "(vi | vimos) (su | el | un) anuncio [(del | de un | de) @apt [en renta | que se renta]] [en internet | en facebook | en la pagina | en marketplace | en el periodico]",
      "(vengo | vine) por el anuncio",
      "(todavia | aun) esta disponible @the_apt #h:still_avail", "@the_apt (todavia | aun | sigue) (esta disponible | disponible)",
      "(sigue | todavia esta | aun esta) (disponible | libre) [@the_apt]",
      "(este | aqui) es @the_apt [que se renta | en renta]",
      "[si] (por | para) @the_apt", "[si] (por | para) el anuncio", "[el] @apt [que se renta | en renta]",
      "(aqui | aca) (rentan | renta | se renta | alquilan | se alquila) (un | el) @apt", "busco (un | el)? @apt [para rentar | en renta]",
      "me (dijeron | comentaron) que (renta | rentan | tiene) un @apt [disponible]", "(quisiera | quiero | me da) informacion (sobre | del | de) @the_apt",
      "es aqui [donde (rentan | se renta)] @the_apt", "me interesa (rentar | alquilar | ver) @the_apt", "(vengo | vine) a verlo",
    ] },
    my_name: { patterns: ["(me llamo | mi nombre es) {name} #h:my_name", "[si] soy yo me llamo {name}", "[si] (me llamo | mi nombre es) {name} vengo a ver @the_apt"] },
    intro_name_ctx: { patterns: ["soy {name}", "yo soy {name}"] },
    vocative: { patterns: ["don ernesto", "senor"] },

    // --- the learner's questions --------------------------------------------
    ask_rent: { patterns: [
      "cuanto es la @rent_w [@per_month] #h:q_rent", "cual es la @rent_w", "cuanto (cuesta | sale | es) [@the_apt] @per_month",
      "cuanto (cuesta | sale | cobra | es) [@the_apt | la @rent_w]", "(en | por) cuanto (lo renta | lo rentan | se renta | lo alquila | se alquila)",
      "cuanto (pago | tengo que pagar | hay que pagar | se paga) [de @rent_w] [@per_month]", "que precio tiene [@the_apt]",
      "cual es el precio [de la @rent_w | de @the_apt]", "y la @rent_w", "(la @rent_w | el precio) es de {price} [@per_month]",
      "son {price} @per_month", "cuanto (pide | cobra) de @rent_w", "cuanto es de @rent_w", "de cuanto es la @rent_w",
    ] },
    ask_utilities: { patterns: [
      "(estan | van | vienen) @incl @util_all #h:q_util", "@util_all (estan | van | vienen) @incl",
      "(la @rent_w | el precio) incluye (@util_all | [el | la] {utility} [y [el | la] {utility}])", "incluye (@util_all | [el | la] {utility})",
      "(esta | va | viene) (incluido | incluida) [el | la] {utility}", "[el | la] {utility} (esta | va | viene) @incl #h:q_util2",
      // "¿El agua no está incluida?": the replies fit a negative question too ("Sí, el agua está incluida")
      "[el | la] {utility} no (esta | va | viene) @incl",
      "[el | la] {utility} (es | va | se paga) aparte", "(tengo que | hay que) pagar [el | la] {utility} [aparte]", "(pago | se paga | yo pago) [el | la] {utility} [aparte]",
      "quien paga [el | la] {utility}", "(y | que pasa con) [el | la] {utility}",
      "cuanto (sale | cuesta | se paga | es | pago) [de] [el | la] {utility} [@per_month | al bimestre | mas o menos]",
      "que (incluye | esta incluido en) (la @rent_w | el precio)", "que (incluye | esta incluido)",
      "(y | que pasa con) @util_all", "cuanto (salen | cuestan | son) @util_all [@per_month]", "@util_all (se pagan | van | son) aparte",
      "(tengo que | hay que) pagar @util_all [aparte]", "(pago | se pagan) @util_all aparte",
      "(estan | van) @incl @util_all o no", "@util_all (estan | van) @incl o no",
      // "¿Hay internet?" / "¿Hay gas?": what there is, not just whether it's in the rent (handler)
      "(tiene | hay) (internet | wifi) #has_net", "(tiene | hay) (gas | gas estacionario | tanque de gas) #has_gas", "(como | donde) (se compra | compro | pido) el gas #has_gas",
    ] },
    ask_deposit: { patterns: [
      "cuanto es (el | la) @dep #h:q_deposit", "de cuanto es (el | la) @dep",
      "(hay | hay que dejar | tengo que dejar | se deja | pide | piden | hay que pagar | tengo que pagar) [un | una] @dep",
      "(y | que pasa con) (el | la) @dep", "(me | se) (devuelve | regresa) (el | la) @dep", "(el | la) @dep (se devuelve | me lo devuelve | es reembolsable)",
      "cuanto (tengo que | hay que) pagar (al principio | para entrar | para mudarme | al firmar | por adelantado)",
      // "¿Cuánto es en total?": the deposit and the first month (handler)
      "cuanto (es | seria | sale | saldria) [todo] en total [para entrar | al principio | al firmar]",
      "cuantos meses de @dep [son | pide | piden | hay que dejar]", "(pide | piden) @dep",
      "cuanto (hay que | tengo que | se tiene que) (dejar | pagar | dar) de @dep", "cuanto (se deja | dejo | pido) de @dep",
      // "¿Son dos meses de depósito?" (never "$2 a month"), "¿El depósito es de catorce mil?", "¿El depósito no se devuelve?"
      "[son | es] (un mes | dos meses | tres meses) de @dep", "(el | la) @dep es de ({price} | un mes | dos meses)",
      "(el | la) @dep no (se devuelve | me lo devuelve | es reembolsable)",
    ] },
    ask_furnished: { patterns: [
      "(esta | viene) (amueblado | amueblada) [@the_apt] #h:q_furnished", "@the_apt (esta | viene) (amueblado | amueblada)",
      "(tiene | trae | viene con) muebles", "(esta | viene) (vacio | vacia | sin muebles | semiamueblado)",
      "(hay | tiene) (muebles | cama | sofa | sillon | mesa | sillas | comedor | ropero)", "(tengo que | necesito) traer (mis | mis propios) muebles",
      "los muebles (estan incluidos | se quedan | vienen incluidos)", "y los muebles",
    ] },
    ask_appliance: { patterns: [
      "(hay | tiene | trae | viene con) [un | una] {appliance} [en la cocina | en el cuarto | en la recamara]", "(y | que tal) [el | la] {appliance}",
      "[el | la] {appliance} (esta incluido | esta incluida | se queda | viene incluido | viene incluida)", "la cocina tiene [un | una] {appliance}", "hay agua caliente #heater",
    ] },
    ask_pets: { patterns: [
      "(se aceptan | acepta | aceptan | se permiten | permite | se admiten) (mascotas | animales | {pet}) #h:q_pets",
      "(puedo | se puede | podemos) tener (mascotas | una mascota | animales | [un | una | dos | tres] {pet})",
      "(puedo | se puede) (traer | llevar) (a mi {pet} | a mis {pet} | mi mascota | mis mascotas | mascotas | [un | una | dos | tres] {pet})", "(y | que tal) las mascotas",
      "(esta bien | hay problema) si tengo [un | una] {pet}", "(esta bien | hay problema) si tengo (mascotas | una mascota)",
      "(se vale | se permite) tener (mascotas | {pet})",
    ] },
    have_pet: { patterns: [
      "[si] tengo (un | una | dos | tres) {pet} [esta bien | hay problema] #h:have_cat", "[si] (solo | nomas) (un | una) {pet}",
      "[si] (un | una | dos | tres) {pet} #h:have_dog", "(tenemos | traigo) (un | una | dos | tres) {pet}", "(mi | mis) {pet}",
      "[si] tengo (un | una) {pet} pero (es | esta) [muy] (tranquilo | tranquila | chiquito | chiquita | chico | chica | limpio | limpia | viejito | viejita | educado | educada)",
    ] },
    no_pets: { patterns: [
      "[no] no tengo (mascotas | animales | ninguna mascota | ningun animal) #h:no_pets", "[no] ninguna [mascota]", "[no] no tenemos (mascotas | animales)",
      "[no] (soy | somos) (alergico | alergica | alergicos) [a los (gatos | perros | animales)]", "sin mascotas", "[no] no tengo (perro | gato | perros | gatos)",
      "[no] no (traigo | tengo) [ninguna] mascota",
    ] },
    ask_lease: { patterns: [
      "(por | de) cuanto tiempo es el contrato #h:q_lease", "cuanto (dura | tiempo dura) el contrato", "el contrato es por (un ano | seis meses | {number} meses)",
      "cual es el (minimo | plazo minimo | tiempo minimo)", "(puedo | se puede) (rentarlo | rentar | firmar | alquilarlo | alquilar) (por | solo por) (seis | tres | {number}) meses",
      "(puedo | se puede) (rentar | alquilar) por mes", "(hay que | tengo que) firmar [un] contrato", "(y | que tal) el contrato",
      "(por cuanto tiempo | cuanto tiempo) (tengo que | hay que) quedarme", "es (un contrato | contrato) (de | por) un ano",
      // "¿Seis meses?": a lease length, never "$6 a month"
      "[y] [por] (seis | tres | {number}) meses",
      // "Quiero rentarlo por seis meses" / "Lo rento por seis meses": a shorter lease asked for, never a take (the minimum)
      "(quiero | quisiera | me gustaria) (rentarlo | alquilarlo | rentar @the_apt) (por | solo por) (seis | tres | {number}) (meses | mes)",
      "(lo rento | lo rentaria | lo tomo | me lo quedo | lo quiero) (por | solo por) (seis | tres | {number}) (meses | mes)",
    ] },
    ask_movein: { patterns: [
      "cuando (puedo mudarme | me puedo mudar) #h:q_movein", "cuando (puedo entrar | me puedo cambiar | me dan las llaves | puedo cambiarme)",
      "(desde cuando | cuando | para cuando) esta disponible", "esta disponible (ya | ahora | desde ahora | de inmediato)",
      "(puedo | me puedo) (mudar | mudarme) @when_mv", "a partir de cuando (esta disponible | me puedo mudar)",
    ] },
    ask_parking: { patterns: [
      "(hay | tiene) estacionamiento #h:q_parking", "(donde | en donde) (puedo | se puede) (estacionar | estacionarme | dejar el carro | dejar mi carro | poner el carro)",
      "(tiene | hay | incluye) (cajon | lugar | plaza) de estacionamiento", "(hay | tiene) lugar para (estacionar | estacionarme | el carro)", "(y | que tal) el estacionamiento", "el estacionamiento (es gratis | esta incluido)",
      "(puedo | se puede) estacionar [el carro] (en la calle | aqui | enfrente | atras)", "(donde | en donde) (puedo | se puede) estacionar [el | mi] carro",
    ] },
    ask_laundry: { patterns: [
      "(donde | en donde) (puedo lavar | lavo | se lava) [la | mi] ropa #h:q_laundry", "(hay | tiene) (area de lavado | cuarto de lavado | lavanderia | lavadero)",
      "(hay | hay una) lavanderia cerca", "(y | que tal) la ropa", "(donde | en donde) (tiendo | seco | se tiende) la ropa",
    ] },
    ask_quiet: { patterns: [
      "es (un edificio | una zona | una colonia | una calle) (tranquilo | tranquila) #h:q_quiet", "es tranquilo [el edificio | aqui | en la noche]",
      "hay mucho ruido [en la noche]", "es (ruidoso | ruidosa)", "(como son | que tal) los vecinos", "los vecinos son (tranquilos | ruidosos | amables | buena onda)",
      "(es | esta) (segura | seguro) (la colonia | la zona | el barrio | aqui | la calle)", "(la colonia | la zona | el barrio | la calle) es (segura | tranquila | ruidosa)",
      "(que tal | como es) (la colonia | la zona | el barrio)", "es seguro [aqui | en la noche]",
    ] },
    ask_bus: { patterns: [
      "hay una parada [de (camion | colectivo | autobus)] cerca #h:q_bus", "(donde | en donde) (pasa | se toma | tomo) el (camion | colectivo | autobus)",
      "(esta | queda) (lejos | cerca) (del centro | del zocalo | del mar | de la playa | del mercado)",
      "(que tan lejos | a cuanto | a cuantas cuadras | a cuantos minutos) (esta | queda) (el centro | la playa | el zocalo | el mar | el mercado)",
      "(como | por donde) (llego | me voy | se llega | se va) (al centro | al zocalo | a la playa | al mar | al mercado)",
      "(hay | pasa) (transporte | camion | colectivo) [publico] cerca", "(esta | queda) cerca la parada",
      "(donde | en donde) (esta | queda) la parada [del (camion | colectivo | autobus)]",
    ] },
    ask_floor: { patterns: [
      "en que piso (esta | queda) [@the_apt] #h:q_floor", "(que | cual) piso es", "(hay | tiene) (elevador | ascensor) #h:q_elevator",
      "(esta | es) en (planta baja | el primer piso | el segundo piso | el ultimo piso)", "es (el primer | el segundo | el ultimo) piso", "en que piso estamos",
    ] },
    ask_balcony: { patterns: ["(tiene | hay) (balcon | terraza | balconcito)", "(y | que tal) el balcon", "(tiene | hay) vista al mar", "se ve el mar [desde (el balcon | aqui)]"] },
    ask_shops: { patterns: ["(hay | tiene) (tiendas | una tienda | una tiendita | un super | un supermercado | farmacia | una farmacia | un mercado) cerca", "(donde | en donde) (compro | hago) (la despensa | el super | comida)", "(esta | queda) cerca el (mercado | super | supermercado)",
      "(donde | en donde) (esta | queda | hay) (el | un | una | la) (super | supermercado | tienda | tiendita | mercado | farmacia) [mas cercano | mas cercana | por aqui]"] },
    // "¿Puedo cancelar el contrato antes?" / "¿Qué pasa si me voy antes?": what breaking the lease costs (nothing binding)
    ask_break: { patterns: [
      "(puedo | se puede) (cancelar | terminar | romper) el contrato [antes | antes de tiempo | antes del ano]",
      "(y si | que pasa si) me (voy | tengo que ir | quiero ir | cambio) antes [del ano | de tiempo | de un ano]",
      "(y si | que pasa si) (cancelo | termino | rompo) el contrato [antes | antes de tiempo | antes del ano]",
      "(puedo | se puede) (irme | salirme) antes [del ano | de tiempo | de un ano]",
      "(y si | que pasa si) no me gusta [el departamento] [puedo | se puede] (cancelar | terminar | romper) el contrato [antes]",
    ] },
    ask_smoke: { patterns: [
      "(puedo | se puede) fumar [aqui | adentro | en el departamento | en el balcon]", "(se permite | esta permitido) fumar", "(acepta | aceptan) fumadores",
    ] },
    ask_size: { patterns: [
      "cuantas (recamaras | habitaciones) (tiene | hay | son)", "cuantos (cuartos | banos | metros [cuadrados]) (tiene | hay)",
      "(que tan grande | de que tamano) es [@the_apt | la {room} | el {room}]", "cuantos metros cuadrados (tiene | son | mide)", "es de (una | dos) (recamaras | recamara)",
    ] },
    ask_see: { patterns: [
      "(puedo | podria) ver (la | el) {room} #h:q_see", "(me | me puede) (ensena | muestra | ensenar | mostrar) (la | el) {room}",
      "(donde | en donde) esta (la | el) {room}", "(puedo | podria) ver el resto", "(puedo | podria) (ver todo | dar una vuelta | echar un vistazo)",
    ] },
    ask_payrent: { patterns: [
      "cuando (se paga | pago | hay que pagar) la @rent_w #h:q_payrent", "como (pago | se paga | le pago) la @rent_w",
      "(puedo | se puede) pagar [la @rent_w] (por transferencia | en efectivo | con tarjeta | por deposito)", "(que dia | cada cuando) (se paga | pago) [la @rent_w]",
      "(acepta | aceptan) transferencia", "le pago (en efectivo | por transferencia) [cada mes]",
    ] },
    ask_apply: { patterns: [
      "que (documentos | papeles) (necesita | necesito | pide | piden | hay que traer)", "que (mas)? necesita (de mi | para rentarlo)",
      "(necesita | necesito) (referencias | comprobante de ingresos | una carta [de trabajo])", "(como | que) (hago | tengo que hacer) para rentarlo",
      "(hay | piden | hacen) (un estudio | investigacion | estudio de credito)",
    ] },
    ask_aval: { patterns: [
      "(necesito | pide | piden | hace falta | se necesita) [un] (aval | fiador) #h:q_aval", "que es (un | el) aval #h:aval_q",
      "(tengo que | hay que) tener (aval | fiador)", "(y | que tal) el aval", "(es | el) aval es obligatorio",
    ] },
    ask_poliza: { patterns: [
      "que es (una | la) poliza [juridica] #h:poliza_q", "cuanto (cuesta | sale | es) la poliza [juridica]", "(hay | tiene) otra (opcion | alternativa | forma) #h:q_poliza",
      "(como | que) funciona la poliza", "quien paga la poliza", "que otra opcion (hay | tengo)", "[y | pero] quien la paga",
    ] },
    ask_landlord: { patterns: [
      "usted vive (aqui | en el edificio)", "(a quien | a quien le) (llamo | hablo | aviso) si (algo se descompone | hay un problema | se descompone algo)",
      "quien (arregla | se encarga de) (las reparaciones | lo que se descompone | el mantenimiento | las cosas) [si se descomponen]",
    ] },
    ask_lower: { patterns: [
      "(me | nos) (puede | podria) (bajar | rebajar) [un poco] (la @rent_w | el precio) #h:q_lower", "@staff bajar [un poco] (la @rent_w | el precio)",
      "(el precio | la @rent_w) es (negociable | fijo)", "es negociable", "(me lo | lo | me) (deja | dejaria | puede dejar) en {price}", "(acepta | aceptaria) {price}",
      "(hay | habria) [algun] descuento", "(se puede | podemos) (negociar | hablar) (el precio | la @rent_w)", "(puede | podria) (hacerme | darme) un descuento",
      "que tal {price}", "(me | lo) (puede | podria) dejar (mas barato | en menos)", "hay chance de (bajarle | un descuento)", "(me hace | me da | me puede hacer | me puede dar) un descuento",
    ] },
    too_x: { patterns: [
      "(esta | es) [un poco | algo | muy | bastante | demasiado] (caro | cara | chico | chica | pequeno | pequena | lejos | oscuro | oscura) [para mi | para nosotros] #h:too_expensive",
      "se (sale | pasa) de mi presupuesto", "(es | son) mucho dinero [para mi]", "no me alcanza", "(busco | prefiero | necesito) algo (mas barato | mas grande | mas cerca | mas economico)",
      "@like_pre pero (esta | es) [un poco | muy | demasiado] (caro | chico | lejos) [de mi trabajo | del centro | de la playa | para mi]", "es mas de lo que (queria | puedo) pagar",
    ] },
    // "No está caro." at the decision: not a complaint
    price_ok: { patterns: ["no (esta | es) [tan | muy | demasiado] (caro | cara | chico | chica | pequeno | pequena | lejos | oscuro | oscura)", "el precio (esta | es) bien", "(esta | es) (un buen precio | barato | razonable)"] },
    ask_unknown: { patterns: ["(hay | tiene) [un | una] {w:any}", "(puedo | se puede) (tener | traer | usar) [un | una | mi] {w:any}"] },

    // --- deciding -------------------------------------------------------------
    no_more: { patterns: [
      "[no] (eso es todo | es todo) [por ahora] #h:no_more_q", "[no] creo que (es todo | eso es todo) #h:that_all",
      "[no] (no tengo | ya no tengo) (mas | otras) preguntas", "[no] nada mas", "ya me (explico | dijo) todo", "[no] (ya | asi) estoy bien",
      "[no] todo (esta | quedo) claro", "(eso | esto) seria todo", "por ahora (es todo | nada mas)", "[no] (ninguna | ninguna otra) [pregunta]",
      "[no] ya (se | entendi) todo", "[no] creo que ya (es todo | se todo)",
    ] },
    take: { patterns: [
      "[si] me lo quedo #h:take_it", "[si] (lo rento | lo tomo | lo quiero | me quedo con el | me lo llevo | lo alquilo)",
      "[si] (me lo quedo | lo rento | lo tomo | lo quiero) por un ano",
      "(quiero | quisiera | me gustaria) (rentarlo | alquilarlo | rentar @the_apt | firmar el contrato) #h:like_to_rent",
      "[si] me interesa", "vamos a hacerlo", "(estoy | estamos) (listo | lista | listos) para firmar", "[si] lo rentamos",
      "@like_pre (lo tomo | lo rento | me lo quedo | lo quiero)", "[si] ya me decidi", "trato hecho",
      "[sabe que] (mejor | bueno) me lo quedo [de una vez] #h:take_now", "[sabe que] me lo quedo de una vez", "sabe que me lo quedo",
      "(pensandolo bien | ya lo pensé | ya lo pense | lo pensé bien) [mejor] (me lo quedo | lo rento | lo tomo | si lo quiero)",
    ] },
    like_it: { patterns: [
      "me (gusta | encanta) [mucho | muchisimo]", "(esta | es) (precioso | bonito | muy bonito | lindo | muy lindo | padrisimo | muy padre)",
      "que (bonito | lindo | padre) [departamento | lugar]", "me (gusta | encanta) (la cocina | la recamara | el balcon | la luz | el departamento)",
      "se ve (muy bien | bien | bonito)",
    ] },
    think: { patterns: ["@think_core", "@like_pre pero @think_core", "me interesa pero @think_core"] },
    decline: { patterns: [
      "creo que no es para mi #h:not_for_me", "no es (para mi | lo que busco | lo que necesito)", "no me lo (voy a quedar | quedo)", "no lo voy a (rentar | tomar)",
      "no me interesa", "no (lo quiero | quiero rentarlo | lo quiero rentar)", "no lo (rento | tomo)", "[no gracias] sigo buscando", "no me gusta", "(voy a | mejor voy a) seguir buscando", "voy a buscar otra cosa",
    ] },
    // "Sí, tengo unas preguntas." (to "¿Tiene alguna pregunta?")
    have_questions: { patterns: ["[si] tengo (unas | algunas | un par de | varias | muchas | dos | tres) preguntas", "[si] tengo una pregunta",
      // "No es todo, tengo otra pregunta.": the comma is lost, so "no es todo" + a question is never "that's all"
      "[no es todo] (tengo | todavia tengo | me falta) (otra | una) pregunta [mas]", "una pregunta mas"] },
    // "Tal vez." / "Lo estoy pensando." only as an answer to "¿Qué le parece?"
    think_ctx: { patterns: ["(tal vez | quizas | quiza | a lo mejor | puede ser)", "(lo | todavia lo) estoy pensando", "(todavia | aun) no (me decido | estoy (seguro | segura) | lo se)", "(todavia | aun) no"] },
    call_back: { patterns: [
      "[si] le (llamo | hablo | marco | aviso | escribo | confirmo | mando un mensaje | mando mensaje) (hoy | hoy en la noche | esta noche | en la noche | en la tarde | mas tarde | al rato | en un rato | en una hora | antes de la noche | hoy mismo) #h:call_tonight",
      "[si] (le prometo | se lo prometo)", "(hoy | esta noche | en la noche) le (aviso | llamo | marco | hablo)",
    ] },

    // --- Don Ernesto's questions ----------------------------------------------
    movein_ans_ctx: { patterns: [
      "@when_mv [si (es posible | se puede | puedo)]", "(me gustaria | quisiera | quiero | necesito | queremos | pienso | me quiero) (mudarme | mudarnos | entrar | cambiarme) @when_mv",
      "lo (necesito | quiero) @when_mv", "soy flexible", "no (estoy | se) [seguro | segura] [todavia] (tal vez | quizas) @when_mv",
      "(idealmente | de preferencia | ojala | tal vez | quizas | mas o menos) @when_mv", "@when_mv (estaria | seria) (bien | perfecto | ideal)",
      "cuando (usted | le) (diga | quede bien | convenga)", "(cuando sea | en cualquier momento)",
    ] },
    people_ans: { patterns: [
      "[si] (solo | nomas | solamente) yo #h:just_me", "[si] (voy a vivir | vivo | viviria) (solo | sola)", "[si] (solo | nomas) para mi",
      "[no] (con | yo y) mi @fam [y (mi | mis) [dos | tres] @fam] #h:with_family", "mi @fam y yo", "(los | las) dos",
      "(vamos a ser | somos | seriamos) mi @fam y yo", "[no] (voy a vivir | vivo | viviria) con mi @fam [y (mi | mis) [dos | tres] @fam]",
    ] },
    people_num_ctx: { patterns: ["(dos | tres | cuatro | cinco) [personas]", "{number} [personas]", "(somos | seriamos | vamos a ser) (dos | tres | cuatro | cinco | {number}) [personas] #h:people_two", "(dos | tres) adultos"] },

    // --- documents and the lease ------------------------------------------------
    here_you_go: { patterns: [
      "aqui (tiene | esta | lo tiene) #h:here_you_go", "tenga", "tome",
      "aqui (tiene | esta) mi (pasaporte | identificacion | ine | credencial | tarjeta de residente | carta | carta de trabajo | contrato de trabajo | estado de cuenta | estados de cuenta | comprobante de ingresos) #h:here_passport",
      "(tenga | tome) mi (pasaporte | identificacion | carta | tarjeta de residente)", "(le doy | le paso | le entrego) mi (pasaporte | identificacion | carta | tarjeta de residente)", "(listo | ya esta)", "(listo | ya esta) ya (firmé | lo firmé)", "ya (firmé | lo firmé)",
      "aqui (esta | tiene) el contrato [firmado]",
    ] },
    passport_ok: { patterns: [
      "(le sirve | sirve | esta bien) (mi | el | un) pasaporte #h:passport_ok", "(puedo | le puedo) (mostrar | ensenar | dar) mi pasaporte",
      "(solo | nomas) tengo (mi | el) pasaporte", "(tengo | traigo) (mi | la) (tarjeta de residente | identificacion | pasaporte)", "(necesita | quiere | ocupa) mi (pasaporte | identificacion)",
      "(le sirve | sirve) mi (identificacion | licencia | credencial | tarjeta de residente)",
    ] },
    // "No traigo identificación." / "Se me olvidó el pasaporte.": he takes it later (the lease goes on)
    no_id: { patterns: [
      "no (traigo | tengo) [mi | la | una | el] (identificacion | pasaporte | ine | credencial | tarjeta de residente) [aqui | conmigo | ahorita | ahora]",
      "no (la | lo) (traigo | tengo) [aqui | conmigo | ahorita | ahora]",
      "(se me olvidó | olvidé | dejé) (mi | la | el) (identificacion | pasaporte | ine | credencial | tarjeta de residente) [en (casa | el hotel)]",
    ] },
    have_job: { patterns: [
      "tengo una carta (de mi trabajo | de mi empresa | de mi jefe) #h:job_letter", "(tengo | ya tengo) (trabajo | un trabajo | chamba | una oferta de trabajo | contrato de trabajo) [aqui]",
      "trabajo (en | para) (brotecito | linea clara | una empresa)", "(le puedo | puedo) (mostrar | ensenar | mandar | traer) (mis estados de cuenta | mi contrato [de trabajo] | mi carta | mis recibos de nomina | una carta de mi trabajo)",
      "tengo (mis estados de cuenta | recibos de nomina | mis recibos de nomina)", "(le mando | le paso | le traigo) (mis estados de cuenta | mi contrato [de trabajo] | mi carta | mis recibos de nomina) [por correo | manana]",
    ] },
    no_job: { patterns: [
      "(todavia | aun) no tengo (trabajo | chamba)", "no tengo (trabajo | chamba | carta [de trabajo] | recibos de nomina | comprobante de ingresos) [aqui | en mexico] [todavia | aun]",
      "(estoy | ando) buscando (trabajo | chamba)", "no estoy trabajando [todavia | ahorita]",
    ] },
    where_sign: { patterns: [
      "(donde | en donde) (firmo | tengo que firmar | hay que firmar | firmamos | pongo mi firma) #h:where_sign", "firmo (aqui | en cada hoja | en todas las hojas | abajo)",
      "(tengo que | hay que) firmar (cada hoja | todas las hojas | las dos copias | aqui)", "donde exactamente",
    ] },
    // just the document's name while handing it over ("Pasaporte.")
    id_ctx: { patterns: ["[mi] (pasaporte | identificacion | ine | credencial | licencia | tarjeta de residente)"] },
    // a bare "¿Aquí?" only while Don Ernesto holds out the lease
    sign_here_ctx: { patterns: ["(aqui | aca) [abajo]", "(aqui | aca) mero"] },
    // "Todavía no firmo." / "No voy a firmar todavía." / "No quiero firmar.": not now (nothing signed), without refusing
    // the apartment
    sign_later: { patterns: ["no (voy a | quiero | puedo) firmar [todavia | ahorita | hoy | ahora]", "todavia no (firmo | voy a firmar | quiero firmar)", "no (firmo | lo firmo) [todavia | ahorita | hoy | ahora]",
      "(prefiero | quiero) firmar (despues | manana | luego | otro dia)", "(puedo | podria) firmar (despues | manana | luego | otro dia)"] },
    read_first: { patterns: [
      "(lo | la) puedo leer (primero | antes) #h:read_first", "(puedo | me deja) leerlo (primero | antes [de firmar])",
      "(quisiera | me gustaria | quiero | necesito) leerlo (primero | antes [de firmar])", "dejeme leerlo [primero]", "(me lo puedo | puedo) llevar para leerlo",
      "primero (quiero | quisiera | me gustaria | necesito) leerlo", "(no quiero | prefiero no) firmar sin leerlo [primero]",
    ] },
    copy: { patterns: [
      "(me da | me puede dar | puedo tener | me quedo con) una copia [del contrato] #h:copy", "(me | me puede) (manda | mandar | envia | enviar) una copia [por correo]",
      "(puedo | le puedo) tomar una foto [al contrato | del contrato]", "(voy a tener | me toca) una copia",
    ] },
    pen: { patterns: ["(tiene | me presta | me da) (una pluma | un boligrafo | un boli | algo para escribir)", "necesito una pluma"] },

    // --- the guarantor (aval) ------------------------------------------------
    aval_none: { patterns: [
      "[no] no tengo (aval | fiador | garante) [aqui] #h:aval_none", "[no] no tengo quien sea mi aval", "(y si | que pasa si) no tengo aval", "[no] no conozco a nadie que (sea | pueda ser) mi aval",
      "[no] no tengo a nadie que (sea | pueda ser) mi (aval | fiador)",
    ] },
    aval_none_ctx: { patterns: [
      "no tengo", "no tengo a nadie [aqui] [que (firme | pueda firmar)]", "no conozco a nadie [aqui | en el pueblo | en puerto colibri]", "acabo de llegar [no (tengo | conozco) a nadie [aqui]]",
      "soy nuevo aqui", "soy nueva aqui",
    ] },
    aval_yes: { patterns: [
      "[si] tengo [un] (aval | fiador) #h:aval_have", "mi (jefe | jefa | empresa | amigo | amiga | esposa | esposo) [de aqui] (puede ser | va a ser | es) mi aval",
      "tengo un (amigo | conocido) que (puede ser | quiere ser) mi aval",
    ] },
    aval_yes_ctx: { patterns: ["si tengo", "mi (jefe | jefa | empresa) [puede firmar]", "un amigo (puede firmar | de aqui)"] },
    // "¿Qué es eso?" / "¿Cómo funciona?" right after "¿tiene aval?" or the póliza: what it is
    what_ctx: { patterns: ["(que es | como funciona) [eso]", "y eso que es", "que (es | significa) eso"] },
    // "¿Cuánto es?" / "¿Cuánto sería en total?" while an amount is on the table
    // also the amount echoed back ("¿Dos meses?", "¿Veintiocho mil?", "¿Veinte mil?"): the amount is said again, nothing agreed
    amount_q_ctx: { patterns: ["cuanto (es | seria | serian | son | sale | cuesta | costaria) [en total | entonces | todo]", "cuanto (tengo que | hay que) (pagar | dejar) [en total | entonces]", "de cuanto (es | seria) [el deposito]",
      "[son | serian] (dos meses | los dos meses) [de deposito]", "[son | serian] {price} [pesos]"] },
    // a no to the extra deposit: refused, too much, or a what-if about the money
    aval_deposit_no_ctx: { patterns: [
      "no (quiero | puedo) (dejar | pagar) (dos meses | tanto | mas | eso) [de @dep]", "(es | son) (mucho | demasiado) dinero", "no tengo (tanto dinero | ese dinero | tanto)",
      "(y si | que pasa si) no tengo (tanto | ese | el) dinero", "(es | esta) muy caro", "no me alcanza",
      "[(es | son) (mucho | demasiado) [dinero] [para mi]] no (puedo | me alcanza) [pagar (eso | tanto | dos meses)]",
    ] },
    poliza_yes_ctx: { patterns: ["(esta bien | prefiero | mejor | si) [la] poliza", "(acepto | contrato) la poliza"] },
    poliza_no_ctx: { patterns: ["no (quiero | necesito) [la] poliza", "(prefiero | mejor) no", "no gracias [la] poliza no"] },
    aval_deposit: { patterns: [
      "(puedo | prefiero | quiero) (dejar | pagar) (dos meses de @dep | mas @dep | un mes mas de @dep) [en vez del aval] #h:aval_dep", "[si] puedo (dejar | pagar) (dos meses | los dos meses)",
      "(mejor | entonces) (dejo | pago) (los dos meses | dos meses de @dep | un mes mas de @dep)", "(dejo | pago) los dos meses [de @dep]",
      "le dejo (dos meses | un mes mas) de @dep",
      // an amount ("Sí, puedo pagar los veintiocho mil"): agreed only if it is the amount he asked (aval_deposit handler)
      "[si] (puedo | le puedo) (dejar | pagar | dar) [los | esos] {price} [pesos] [de @dep]", "[si] (dejo | pago | le dejo | le pago) [los | esos] {price} [pesos] [de @dep]",
    ] },

    // --- tenant mode: reporting a problem --------------------------------------
    report_problem: { patterns: [
      "[pero | nomas que | solo que] [el | la | mi] {fix} [de la cocina | del bano] @broken [@where_when] #h:not_working",
      "[pero | nomas que | solo que] [el | la | mi] {fix} [de la cocina | del bano] (gotea | esta goteando | tira agua | pierde agua | tiene una fuga) [@where_when] #h:leaking",
      "[pero | nomas que | solo que] [el | la | mi] {fix} [de la cocina | del bano] esta (tapado | tapada) [@where_when]",
      "[pero] no hay (agua caliente | agua | luz) [@where_when] #h:no_hot", "[pero] no (tengo | sale) (agua caliente | agua | luz) [@where_when]", "se fue la luz",
      "[pero] (hay | tengo) un problema con (el | la | mi) {fix} [de la cocina | del bano] #h:problem_with",
      "hay una fuga [de agua] [en la cocina | en el bano | abajo del fregadero | debajo del fregadero]", "sale agua (de la | del) {fix}",
      "hace mucho calor [en el departamento | adentro | en la recamara | en el cuarto]", "algo (le pasa | anda mal) (al | a la) {fix}",
      "[el | la] {fix} no (cierra | abre)", "hay agua en el piso", "(el | la) {fix} hace (un ruido raro | mucho ruido | ruido)",
      "[el | la] {fix} no tiene (agua caliente | agua | presion)", "se tapó [el | la] {fix}", "hay una gotera [en el techo | en la recamara | en el cuarto | en la sala] #roof",
      "[pero] no (funciona | sirve | prende | enfria | calienta | jala) [el | la] {fix} [@where_when]", "se (descompuso | rompió) [el | la] {fix}",
      "[pero] (gotea | tira agua) [el | la] {fix} [de la cocina | del bano]", "[pero] no hay gas #gas",
    ] },
    all_good: { patterns: [
      "todo (esta | anda | va) (bien | muy bien | perfecto | de maravilla | excelente)", "todo funciona [bien | perfecto]", "no hay [ningun] problema",
      "[el | la] {fix} (funciona | sirve | esta) bien", "me encanta [el departamento | aqui | vivir aqui]", "(estoy | estamos) muy (contento | contenta | contentos)",
      "nada esta descompuesto",
    ] },
    have_problem: { patterns: [
      "(no muy bien | no tan bien | mas o menos | regular) [la verdad]", "(hay | tengo) un (problema | problemita) [con el departamento]",
      "algo (no funciona | esta descompuesto | se descompuso)",
    ] },
    // "No, nada." / "Solo pasaba a saludar." to "¿En qué le puedo ayudar?" in tenant mode: all good
    nothing_ctx: { patterns: ["[no] nada [mas] [gracias]", "[no] [nada] solo (pasaba | vine | queria) [a] saludar"] },
    sorry_bother: { patterns: ["(perdon | disculpe) (que lo moleste | por molestarlo | la molestia) #h:sorry_bother", "siento molestarlo", "perdon que lo moleste"] },
    fix_request: { patterns: [
      "@staff mandar a alguien [a (arreglarlo | revisarlo | verlo)] #h:fix", "(lo | la) (puede | podria) (arreglar | revisar)", "(puede | podria) (arreglarlo | arreglarla | revisarlo)",
      "necesito (un | al) (plomero | tecnico | electricista)", "@staff (llamar | hablarle) (a un | al) (plomero | tecnico | electricista)",
    ] },
    home_yes: { patterns: [
      "[si] (voy a estar | estoy | estare) (en casa | aqui | ahi) [todo el dia | toda la manana | manana] #h:home_yes", "[si] trabajo desde casa",
      "[si] (estoy | voy a estar) libre [manana] [en la manana]", "[si] manana estoy aqui", "[si] (ahi | aqui) (estoy | voy a estar | estare) [manana]", "[si] a esa hora (estoy | voy a estar) [en casa | aqui]", "[si] manana (estoy | voy a estar) (en casa | aqui)",
    ] },
    at_work: { patterns: [
      "[no] (voy a estar | estoy | estare) (trabajando | en el trabajo) [manana | todo el dia | hasta {time} | en la manana] #h:at_work",
      "[no] no (voy a estar | estoy | estare) [en casa | aqui] [manana | en la manana | a las diez]", "[manana] trabajo [manana] [todo el dia | en la manana] [hasta {time}]",
      "[no] tengo que trabajar [manana]", "[no] (estoy | voy a estar) (ocupado | ocupada) [manana] [en la manana]", "[no] manana no estoy",
    ] },
    time_pref: { patterns: [
      "(puede | podria) venir (despues de | a | antes de) {time} #h:after_five", "(puede | podria) venir (en la tarde | en la noche | mas tarde | el {day} | {day} | el fin de semana)",
      "(mejor | prefiero) (en la tarde | en la noche | mas tarde | el {day} | {day} | despues de {time} | a {time})", "(despues de | a partir de) {time}",
      "(en | por) la (tarde | noche) [mejor] #h:afternoon", "[el] {day} (es mejor | seria mejor | me queda mejor) #h:saturday",
      "que tal (a {time} | en la tarde | el {day})", "mas tarde (es mejor | me queda mejor)",
    ] },
    use_key: { patterns: [
      "[si] (puede | usted puede) (usar su llave | entrar con su llave | abrirle | dejarlo pasar | abrir con su llave) #h:use_key", "(abrale | dejelo pasar | dejelo entrar)",
      "usted tiene llave", "[si] le puede abrir [usted]", "[si] [claro] (use su llave | usa tu llave #tip:tu_staff)",
    ] },
    // "A las diez no puedo." → Don Ernesto asks for another time
    time_bad: { patterns: [
      // "Mañana a las diez no puedo" / "A las diez no está bien": the time he offered, refused (never booked)
      "(a las diez | las diez | manana | manana a las diez | en la manana | manana en la manana | a esa hora | esa hora) no (puedo | me queda | me queda bien | me conviene | esta bien | me parece bien | me sirve)",
      "no puedo (a las diez | manana | manana a las diez | a esa hora | en la manana)", "(a las diez | esa hora) es muy temprano [para mi]",
      "(a las diez | manana | en la manana | a esa hora) no (estoy | voy a estar) [en casa | aqui]", "(prefiero | mejor) (otro dia | otra hora | otro horario)", "prefiero estar (yo | en casa | presente)",
    ] },
    time_ok: { patterns: ["(manana a las diez | a las diez | las diez | manana | en la manana) (esta bien | me queda bien | me parece bien | perfecto) #h:ten_fine", "(a las diez | manana) si (puedo | estoy)"] },
    // a bare time or day ("A las seis.", "El sábado.") only where a time for the repair is asked
    time_ctx: { patterns: ["[a] {time} [por favor | esta bien | mejor]", "[el] {day} [a {time} | en la (manana | tarde | noche) | por la (manana | tarde | noche)] [por favor | mejor]"] },
  },

  lines: {
    greet_must_be: [
      t("¡Buenas tardes! | Viene | por | el | departamento, | ¿verdad?", "Good afternoon! | You've come | about | the | apartment, | right?", "Good afternoon! You're here about the apartment, right?",
        { flags: { 4: F_DEPA }, neutral: t("¡Buenas tardes! | Viene | por | el | apartamento, | ¿verdad?", "Good afternoon! | You've come | about | the | apartment, | right?", "Good afternoon! You're here about the apartment, right?") }),
      t("¡Hola! | ¿Viene | a | ver | el | departamento?", "Hi! | Have you come | to | see | the | apartment?", "Hi! Are you here to see the apartment?",
        { flags: { 5: F_DEPA }, neutral: t("¡Hola! | ¿Viene | a | ver | el | apartamento?", "Hi! | Have you come | to | see | the | apartment?", "Hi! Are you here to see the apartment?") }),
    ],
    greet_help: [
      t("¡Buenas tardes! | ¿Le | puedo | ayudar | en | algo?", "Good afternoon! | (To) you | can I | help | in | something?", "Good afternoon! Can I help you with something?"),
      t("¡Hola! | ¿En | qué | le | puedo | ayudar?", "Hi! | In | what | (to) you | can I | help?", "Hi! How can I help you?"),
    ],
    purpose_again: [t("¿Viene | por | el | departamento?", "Have you come | about | the | apartment?", "Are you here about the apartment?",
      { flags: { 3: F_DEPA }, neutral: t("¿Viene | por | el | apartamento?", "Have you come | about | the | apartment?", "Are you here about the apartment?") })],
    how_help: [t("¡Ah, | perdón! | ¿En | qué | le | puedo | ayudar?", "Oh, | sorry! | In | what | (to) you | can I | help?", "Oh, sorry! How can I help you?")],
    come_in: [
      t("¡Pase, | pase!", "Come in, | come in!", "Come on in!"),
      t("¡Qué | bueno! | Pase, | por favor.", "How | good! | Come in, | please.", "Great, come on in!"),
      t("Sí, | claro. | ¡Pase!", "Yes, | of course. | Come in!", "Yes, of course. Come on in!"),
    ],
    still_yes: [t("¡Sí, | todavía | está | disponible! | Pase.", "Yes, | still | it's | available! | Come in.", "Yes, it's still available! Come on in.")],
    tour: [
      // no side named: the 3D room has the kitchen ahead on the right, the pictures (shown instead of it) on the left
      t("Mire, | esta | es | la | sala, | y | ahí | está | la | cocina.", "Look, | this | is | the | living room, | and | there | is | the | kitchen.", "So, this is the living room, and there's the kitchen."),
      t("Esta | es | la | sala. | La | recámara | está | al fondo | del | pasillo.", "This | is | the | living room. | The | bedroom | is | at the back | of the | hallway.", "This is the living room. The bedroom is at the end of the hall.",
        { flags: { 5: F_RECAMARA }, neutral: t("Esta | es | la | sala. | La | habitación | está | al fondo | del | pasillo.", "This | is | the | living room. | The | bedroom | is | at the back | of the | hallway.", "This is the living room. The bedroom is at the end of the hall.") }),
    ],
    tour_extra: [
      t("Es | muy | fresco | y | tiene | mucha | luz.", "It's | very | cool | and | it has | a lot of | light.", "It stays nice and cool, and it gets lots of light."),
      t("La | cocina | es | nueva.", "The | kitchen | is | new.", "The kitchen is brand new."),
    ],
    nice_to_meet: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!"), t("¡Mucho gusto! | Yo | soy | Ernesto.", "Nice to meet you! | I | am | Ernesto.", "Nice to meet you! I'm Ernesto.")],
    ask_movein_q: [
      t("¿Para | cuándo | lo | necesita?", "For | when | it | do you need?", "So, when do you need it?"),
      t("¿Cuándo | quiere | mudarse?", "When | do you want | to move in?", "When would you like to move in?"),
    ],
    movein_ack: [t("Sí, | se puede.", "Yes, | that's possible.", "That works."), t("Perfecto.", "Perfect.", "Perfect.")],
    movein_info: [t("Está | disponible | desde | el | primero | del | mes.", "It's | available | from | the | first | of the | month.", "It's available from the first of the month.")],
    ask_people: [
      t("¿Va | a | vivir | {m:solo|f:sola}?", "Are you going | to | live | alone?", "Will it be just you?"),
      t("¿Es | solo | para | usted?", "Is it | just | for | you?", "Is it just for you?"),
    ],
    ask_how_many: [t("Entonces, | ¿cuántas | personas?", "Then, | how many | people?", "How many people, then?")],
    people_ack: [t("Muy | bien.", "Very | good.", "Okay, great."), t("Perfecto.", "Perfect.", "Perfect.")],
    // four or more ("Somos cinco", "Mi esposa, mis dos hijos y yo"): no number in the line, so it never says the wrong one
    people_small: [t("Mmm, | tiene | una | sola | recámara; | para | tantas | personas | puede | quedar | un poco | chico.", "Hmm, | it has | one | single | bedroom; | for | so many | people | it may | turn out | a little | small.", "Hmm, it's a one-bedroom, so it might be a little small for that many people.",
      { flags: { 4: F_RECAMARA }, neutral: t("Mmm, | tiene | una | sola | habitación; | para | tantas | personas | puede | quedar | un poco | chico.", "Hmm, | it has | one | single | bedroom; | for | so many | people | it may | turn out | a little | small.", "Hmm, it's a one-bedroom, so it might be a little small for that many people.") })],
    ask_pets_q: [t("¿Tiene | mascotas?", "Do you have | pets?", "Do you have any pets?"), t("¿Trae | alguna | mascota?", "Are you bringing | any | pet?", "Any pets?")],
    ask_pet_which: [t("Ah, | ¿qué | mascota | tiene?", "Oh, | what | pet | do you have?", "Oh, what pet do you have?")],
    pets_policy: [t("Se aceptan | gatos | y | perros | chicos.", "Are allowed | cats | and | dogs | small.", "Cats are allowed, and small dogs too.")],
    pet_cat_ok: [t("Un | gato, | no hay | problema.", "A | cat, | there's no | problem.", "A cat is fine.")],
    pet_dog_ok: [t("Un | perro | chico | también | está bien.", "A | dog | small | also | is fine.", "A small dog is fine too.")],
    // two or more ("Tengo dos gatos", "¿Se aceptan perros?"): never "Un gato…"
    pet_cats_ok: [t("Con | gatos | no hay | problema.", "With | cats | there's no | problem.", "Cats are no problem.")],
    pet_dogs_ok: [t("Con | perros | chicos | no hay | problema.", "With | dogs | small | there's no | problem.", "Small dogs are no problem.")],
    pet_bigdog: [t("Lo siento, | solo | se aceptan | perros | chicos.", "I'm sorry, | only | are allowed | dogs | small.", "Sorry, only small dogs are allowed.")],
    pet_other_ok: [t("No hay | problema.", "There's no | problem.", "That's no problem.")],
    ask_questions_first: [
      t("Bueno, | ¿qué | le gustaría | saber?", "Well, | what | would you like | to know?", "So, what would you like to know?"),
      t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Do you have any questions?"),
    ],
    ask_questions_more: [
      t("¿Qué | más | le gustaría | saber?", "What | else | would you like | to know?", "Anything else you'd like to know?"),
      t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?"),
      t("¿Qué | más | le | puedo | decir?", "What | else | (to) you | can I | tell?", "What else can I tell you?"),
    ],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    good_q: [t("Buena | pregunta.", "Good | question.", "Good question.")],
    rent: [
      t("La | renta | es | de | {$rent} | al mes.", "The | rent | is | — | {$rent} | a month.", "The rent is {$rent} a month.", { flags: { 3: F_DE_AMOUNT } }),
      t("Son | {$rent} | al mes.", "It's | {$rent} | a month.", "It's {$rent} a month."),
    ],
    rent_full: [t("La | renta | es | de | {$rent} | al mes.", "The | rent | is | — | {$rent} | a month.", "The rent is {$rent} a month.", { flags: { 3: F_DE_AMOUNT } })],
    deposit_full: [t("El | depósito | es | de | un | mes | de | renta.", "The | deposit | is | — | one | month | of | rent.", "The security deposit is one month's rent.", { flags: { 3: F_DE_AMOUNT } })],
    lease_full: [t("El | contrato | es | por | un | año.", "The | lease | is | for | one | year.", "The lease is for one year.")],
    rent_due: [t("La | renta | se paga | los | primeros | cinco | días | de | cada | mes.", "The | rent | is paid | the | first | five | days | of | each | month.", "Rent is due in the first five days of each month.")],
    rent_pay_how: [t("Me | puede | pagar | por | transferencia | o | en efectivo.", "(To) me | you can | pay | by | transfer | or | in cash.", "You can pay me by bank transfer or in cash.")],
    rent_firm: [
      t("Lo siento, | la | renta | es | fija. | Pero | el | agua | y | el | mantenimiento | están | incluidos.", "I'm sorry, | the | rent | is | fixed. | But | the | water | and | the | maintenance | are | included.", "Sorry, the rent is firm. But water and maintenance are included."),
      t("La verdad, | el | precio | es | fijo. | Pero | el | agua | y | el | mantenimiento | están | incluidos.", "Honestly, | the | price | is | fixed. | But | the | water | and | the | maintenance | are | included.", "Honestly, the price is firm. But water and maintenance are included."),
    ],
    utilities_all: [
      t("El | agua | y | el | mantenimiento | están | incluidos. | Usted | paga | la | luz, | el | gas | y | el | internet.", "The | water | and | the | maintenance | are | included. | You | pay | the | electricity, | the | gas | and | the | internet.", "Water and building maintenance are included. You'd pay for electricity, gas and internet.",
        { flags: { 10: "la luz (the light): the everyday Mexican word for electricity and its bill." } }),
      t("Agua | y | mantenimiento, | sí. | Luz, | gas | e | internet, | no.", "Water | and | maintenance, | yes. | Electricity, | gas | and | internet, | no.", "Water and maintenance, yes. Electricity, gas and internet, no.", { flags: { 6: "e: y (and) becomes e before a word starting with an i sound." } }),
    ],
    util_yes: [t("Sí, | {X.the} | está | {incluido@X}.", "Yes, | {X.the} | is | included.", "Yes, {X} is included.")],
    util_no: [t("No, | {X.the} | no está | {incluido@X}.", "No, | {X.the} | isn't | included.", "No, {X} isn't included.")],
    // "¿Tengo que pagar el agua?" / "¿El agua se paga aparte?": no, it's included
    util_incl_no: [t("No, | {X.the} | ya | está | {incluido@X} | en | la | renta.", "No, | {X.the} | already | is | included | in | the | rent.", "No, {X} is already included in the rent.")],
    // "¿Quién paga el agua?" / "¿Cuánto cuesta el agua?": no yes or no
    util_incl: [t("{X.the} | ya | está | {incluido@X} | en | la | renta.", "{X.the} | already | is | included | in | the | rent.", "{X} is already included in the rent.")],
    util_depends: [t("Eso | se paga | aparte; | depende | de | cuánto | use.", "That | is paid | separately; | it depends | on | how much | you use.", "That's extra, and it depends on how much you use.")],
    util_separate: [t("Eso | se paga | aparte.", "That | is paid | separately.", "You'd pay for that separately.")],
    util_internet: [t("Casi | todos | los | vecinos | tienen | NetWave.", "Almost | all | the | neighbors | have | NetWave.", "Most of the neighbors use NetWave.")],
    util_cost: [t("La | luz | depende | de | cuánto | use | el | aire | acondicionado. | El | recibo | llega | cada | dos | meses.", "The | electricity | depends | on | how much | you use | the | air | conditioning. | The | bill | comes | every | two | months.", "Electricity depends on how much you use the AC. The bill comes every two months.")],
    util_gas: [t("El | gas | viene | de | un | tanque | en | la | azotea. | Cuando | se acaba, | usted | pide | la | pipa.", "The | gas | comes | from | a | tank | on | the | roof. | When | it runs out, | you | order | the | gas truck.", "The gas comes from a tank on the roof. When it runs out, you call the gas truck.",
      { flags: { 8: "azotea: the flat roof of a Mexican building, used for water and gas tanks and laundry.", 14: "Mexican: la pipa = the tanker truck that refills gas tanks." },
        neutral: t("El | gas | viene | de | un | tanque | en | la | azotea. | Cuando | se acaba, | usted | llama | al | camión | del | gas.", "The | gas | comes | from | a | tank | on | the | roof. | When | it runs out, | you | call | the | truck | of the | gas.", "The gas comes from a tank on the roof. When it runs out, you call the gas truck.") })],
    deposit: [
      t("El | depósito | es | de | un | mes | de | renta.", "The | deposit | is | — | one | month | of | rent.", "The security deposit is one month's rent.", { flags: { 3: F_DE_AMOUNT } }),
      t("Es | un | mes | de | renta: | {$deposit}.", "It's | one | month | of | rent: | {$deposit}.", "It's one month's rent, so {$deposit}."),
    ],
    // after two months' deposit was agreed (no guarantor)
    deposit_two: [t("Son | {$deposit} | de | depósito: | dos | meses | de | renta.", "It's | {$deposit} | of | deposit: | two | months | of | rent.", "It's {$deposit} for the deposit: two months' rent.")],
    deposit_first: [t("Y | el | primer | mes | de | renta, | al | firmar | el | contrato.", "And | the | first | month | of | rent, | upon | signing | the | lease.", "And the first month's rent when you sign the lease.")],
    deposit_back: [t("Se lo | devuelvo | cuando | se vaya, | si | todo | está | en orden.", "It to you | I'll return | when | you leave, | if | everything | is | in order.", "You get it back when you move out, if everything's in order.")],
    furnished_semi: [t("Está | semiamueblado: | tiene | estufa, | refrigerador | y | clósets, | pero | no tiene | muebles.", "It's | semi-furnished: | it has | stove, | fridge | and | closets, | but | it doesn't have | furniture.", "It's semi-furnished: it has a stove, a fridge and closets, but no furniture.",
      { flags: { 1: "semiamueblado: in Mexico, kitchen appliances and closets, but no furniture." } })],
    furnished: [
      t("Está | semiamueblado: | tiene | estufa, | refrigerador | y | clósets, | pero | no tiene | muebles.", "It's | semi-furnished: | it has | stove, | fridge | and | closets, | but | it doesn't have | furniture.", "It's semi-furnished: it has a stove, a fridge and closets, but no furniture.",
        { flags: { 1: "semiamueblado: in Mexico, kitchen appliances and closets, but no furniture." } }),
      t("No, | no está | amueblado, | pero | la | cocina | tiene | estufa | y | refrigerador | nuevos.", "No, | it isn't | furnished, | but | the | kitchen | has | stove | and | fridge | new.", "No, it's unfurnished, but the kitchen has a new stove and fridge."),
    ],
    app_kitchen: [t("Sí, | hay | {X.np} | en | la | cocina.", "Yes, | there's | {X.np} | in | the | kitchen.", "Yes, there's {X.np} in the kitchen.")],
    app_yes: [t("Sí, | hay | {X.np}.", "Yes, | there's | {X.np}.", "Yes, there's {X.np}.")],
    app_none: [t("No, | no hay | {X}, | lo siento.", "No, | there's no | {X}, | I'm sorry.", "No, there's no {X}, sorry.")],
    app_ac: [t("Sí, | hay | aire | acondicionado | en | la | recámara, | y | ventiladores | de techo | en | los | demás | cuartos.", "Yes, | there's | air | conditioning | in | the | bedroom, | and | fans | ceiling | in | the | other | rooms.", "Yes, there's AC in the bedroom and ceiling fans in the other rooms.",
      { flags: { 6: F_RECAMARA }, neutral: t("Sí, | hay | aire | acondicionado | en | la | habitación, | y | ventiladores | de techo | en | los | demás | cuartos.", "Yes, | there's | air | conditioning | in | the | bedroom, | and | fans | ceiling | in | the | other | rooms.", "Yes, there's AC in the bedroom and ceiling fans in the other rooms.") })],
    lease: [
      t("El | contrato | es | por | un | año.", "The | lease | is | for | one | year.", "The lease is for one year."),
      t("Es | un | contrato | de | un | año.", "It's | a | lease | of | one | year.", "It's a one-year lease."),
    ],
    lease_min: [t("El | mínimo | es | un | año, | lo siento.", "The | minimum | is | one | year, | I'm sorry.", "The minimum is one year, sorry.")],
    // "¿Puedo cancelar el contrato antes?" / "¿Qué pasa si me voy antes?"
    lease_break: [t("Si | se va | antes | del | año, | pierde | el | depósito.", "If | you leave | before | the | year, | you lose | the | deposit.", "If you move out before the year is up, you lose the deposit.")],
    parking: [
      t("Tiene | un | cajón | de | estacionamiento | atrás | del | edificio.", "It has | a | space | of | parking | behind | the | building.", "You get one parking space behind the building.",
        { flags: { 2: "Mexican: cajón (de estacionamiento) = a parking space; lugar is more widely used." }, neutral: t("Tiene | un | lugar | de | estacionamiento | atrás | del | edificio.", "It has | a | space | of | parking | behind | the | building.", "You get one parking space behind the building.") }),
      t("Hay | estacionamiento | gratis | atrás | del | edificio.", "There's | parking | free | behind | the | building.", "There's free parking behind the building."),
    ],
    laundry: [
      t("En | la | azotea | hay | un | área | de | lavado | con | lavadora.", "On | the | roof | there's | an | area | for | washing | with | washing machine.", "There's a laundry area with a washing machine up on the roof.",
        { flags: { 2: "azotea: the flat roof of a Mexican building, used for water and gas tanks and laundry." } }),
      t("La | lavadora | está | en | la | azotea, | con | un | tendedero | para | la | ropa.", "The | washing machine | is | on | the | roof, | with | a | clothesline | for | the | clothes.", "The washing machine is up on the roof, with a clothesline for drying."),
    ],
    quiet: [
      t("Sí, | es | un | edificio | muy | tranquilo.", "Yes, | it's | a | building | very | quiet.", "Yes, it's a very quiet building."),
      t("Muy | tranquilo. | Casi | todos | los | vecinos | son | jubilados.", "Very | quiet. | Almost | all | the | neighbors | are | retired.", "Very quiet. Most of the neighbors are retired."),
    ],
    quiet_noise: [t("No, | es | un | edificio | muy | tranquilo.", "No, | it's | a | building | very | quiet.", "No, it's a very quiet building.")],
    quiet_neighbors: [t("Muy | tranquilos: | casi | todos | son | jubilados.", "Very | quiet: | almost | all | are | retired.", "Very quiet. Most of them are retired.")],
    quiet_area: [t("Es | una | zona | tranquila | y | segura.", "It's | an | area | quiet | and | safe.", "It's a quiet, safe neighborhood.")],
    safe: [t("Sí, | es | una | zona | segura.", "Yes, | it's | an | area | safe.", "Yes, it's a safe neighborhood.")],
    // TOWN.md "Getting around": Las Palmas is on calle Hidalgo at calle Flamboyán; the colectivos are waved down on
    // avenida Juárez, a block up Flamboyán (no stop of their own); the city bus stop is a block east on Hidalgo, in front
    // of the gym; the zócalo and the beach five minutes away; Farmacia del Puerto on Juárez at the top of Flamboyán
    bus: [
      t("Los | colectivos | pasan | por | la | avenida | Juárez, | aquí | a | una | cuadra: | nomás | levante | la | mano.", "The | colectivos | go | along | the | avenue | Juárez, | here | at | one | block: | just | raise | your | hand.", "The colectivos go along Avenida Juárez, a block from here: just wave one down.",
        { flags: { 1: F_COLECTIVO, 11: F_NOMAS, 13: F_LA_MANO },
          neutral: t("Los | colectivos | pasan | por | la | avenida | Juárez, | aquí | a | una | cuadra: | solo | levante | la | mano.", "The | colectivos | go | along | the | avenue | Juárez, | here | at | one | block: | just | raise | your | hand.", "The colectivos go along Avenida Juárez, a block from here: just wave one down.", { flags: { 1: F_COLECTIVO, 13: F_LA_MANO } }) }),
      t("En | la | avenida | Juárez, | a | una | cuadra, | pasan | colectivos | cada rato.", "On | the | avenue | Juárez, | at | one | block, | come by | colectivos | all the time.", "Colectivos come by all the time on Avenida Juárez, a block away.",
        { flags: { 8: F_COLECTIVO } }),
    ],
    // "¿Hay una parada de camión cerca?": the city bus
    bus_city: [t("La | parada | del | camión | está | aquí | a | una | cuadra, | enfrente | del | gimnasio.", "The | stop | of the | bus | is | here | at | one | block, | in front | of the | gym.", "The bus stop is a block from here, in front of the gym.",
      { flags: { 3: "Mexican: camión = a city bus (and a truck); autobús is more widely used." },
        neutral: t("La | parada | del | autobús | está | aquí | a | una | cuadra, | enfrente | del | gimnasio.", "The | stop | of the | bus | is | here | at | one | block, | in front | of the | gym.", "The bus stop is a block from here, in front of the gym.") })],
    bus_downtown: [t("El | centro | está | a | unos | cinco | minutos | caminando.", "The | downtown | is | at | about | five | minutes | walking.", "Downtown is about a five-minute walk.", { flags: { 4: F_UNOS } })],
    // "¿Cómo llego al centro?": the way (up Flamboyán to Juárez, then right to the zócalo)
    bus_downtown_way: [t("Por | la | calle | Flamboyán | hasta | la | avenida | Juárez, | y | ahí | a la derecha: | unos | cinco | minutos.", "Along | the | street | Flamboyán | to | the | avenue | Juárez, | and | there | to the right: | about | five | minutes.", "Take Calle Flamboyán up to Avenida Juárez, then turn right: about five minutes.",
      { flags: { 11: F_UNOS } })],
    beach: [t("La | playa | está | a | dos | cuadras, | derecho | por | la | calle | Flamboyán: | unos | cinco | minutos | caminando.", "The | beach | is | at | two | blocks, | straight | along | the | street | Flamboyán: | about | five | minutes | walking.", "The beach is two blocks away, straight down Calle Flamboyán: about a five-minute walk.", { flags: { 11: F_UNOS } })],
    floor: [t("Está | en | el | primer | piso; | yo | vivo | en | la | planta baja.", "It's | on | the | first | floor; | I | live | on | the | ground floor.", "It's one floor up; I live on the ground floor.",
      { flags: { 3: "In Mexico the ground floor is la planta baja, so el primer piso is one floor up (an American second floor)." } })],
    elevator: [t("No hay | elevador, | solo | escaleras.", "There's no | elevator, | just | stairs.", "There's no elevator, just the stairs.")],
    balcony: [t("Sí, | tiene | un | balcón | chico | que | da | a | la | calle.", "Yes, | it has | a | balcony | small | that | faces | onto | the | street.", "Yes, it has a small balcony facing the street.")],
    // the pictures show the sea from the balcony; in the town it's at the end of calle Flamboyán, two blocks away
    sea_view: [t("Sí, | desde | el | balcón | se alcanza a ver | el | mar, | y | la | playa | está | cerca.", "Yes, | from | the | balcony | you can just see | the | sea, | and | the | beach | is | close.", "Yes, you can see a bit of the ocean from the balcony, and the beach is close.")],
    // no "Sí,": it also answers "¿Dónde hago la despensa?"
    shops: [t("Hay | una | tiendita | en | la | esquina, | y | el | mercado | está | a | dos | cuadras.", "There's | a | little store | on | the | corner, | and | the | market | is | at | two | blocks.", "There's a little corner store, and the market is two blocks away.",
      { flags: { 2: "Mexican: tiendita = a small neighborhood store; the -ita makes it small and friendly." },
        neutral: t("Hay | una | tienda | en | la | esquina, | y | el | mercado | está | a | dos | cuadras.", "There's | a | store | on | the | corner, | and | the | market | is | at | two | blocks.", "There's a store on the corner, and the market is two blocks away.") })],
    shops_pharmacy: [t("Hay | una | farmacia | aquí | a | una | cuadra, | en | la | avenida | Juárez.", "There's | a | pharmacy | here | at | one | block, | on | the | avenue | Juárez.", "There's a pharmacy a block from here, on Avenida Juárez.")],
    smoking: [t("Lo siento, | adentro | no se puede | fumar.", "I'm sorry, | inside | you can't | smoke.", "Sorry, smoking isn't allowed inside.")],
    size: [t("Tiene | una | recámara, | un | baño, | sala, | comedor | y | cocina: | unos | sesenta | metros | cuadrados.", "It has | one | bedroom, | a | bathroom, | living room, | dining room | and | kitchen: | about | sixty | meters | square.", "It has one bedroom, a bathroom, a living room, a dining area and a kitchen: about sixty square meters.",
      { flags: { 2: F_RECAMARA, 9: F_UNOS }, neutral: t("Tiene | una | habitación, | un | baño, | sala, | comedor | y | cocina: | unos | sesenta | metros | cuadrados.", "It has | one | bedroom, | a | bathroom, | living room, | dining room | and | kitchen: | about | sixty | meters | square.", "It has one bedroom, a bathroom, a living room, a dining area and a kitchen: about sixty square meters.", { flags: { 9: F_UNOS } }) })],
    see_room: [
      t("¡Claro! | Venga, | por | aquí.", "Of course! | Come, | through | here.", "Of course! Follow me."),
      t("Claro, | véalo | con | calma.", "Sure, | look at it | with | calm.", "Sure, take your time."),
    ],
    apply_info: [t("Necesito | una | identificación | y | un | comprobante | de | ingresos.", "I need | an | ID | and | a | proof | of | income.", "I'll need your ID and proof of income.")],
    landlord_here: [t("Yo | vivo | en | la | planta baja; | si | algo | se descompone, | toque | mi | puerta.", "I | live | on | the | ground floor; | if | something | breaks, | knock on | my | door.", "I live on the ground floor, so if anything breaks, just knock on my door.")],
    unknown_q: [t("Mmm, | buena | pregunta. | Déjeme | revisar | y | le | aviso.", "Hmm, | good | question. | Let me | check | and | (to) you | I'll let know.", "Hmm, good question. Let me check and get back to you.")],
    like_it_ack: [t("¡Qué | bueno | que | le gusta!", "How | good | that | you like it!", "I'm glad you like it!")],
    what_can_do: [t("Entonces, | ¿en | qué | le | puedo | ayudar?", "Then, | in | what | (to) you | can I | help?", "So, what can I do for you?")],
    price_fair: [t("Sí, | es | un | buen | precio | para | la | zona.", "Yes, | it's | a | good | price | for | the | area.", "Yes, it's a good price for the area.")],
    understand: [t("Entiendo.", "I understand.", "I understand.")],
    fyi: [t("Ah, | y | por cierto:", "Oh, | and | by the way:", "Oh, and by the way:"), t("Para | que | sepa:", "So | that | you know:", "Just so you know:")],
    decision_ask: [
      t("Entonces, | ¿qué | le parece?", "So, | what | do you think?", "So, what do you think?"),
      t("¿Qué | dice? | ¿Le interesa?", "What | do you say? | Are you interested?", "So, are you interested?"),
    ],
    // "No me lo quedo" said without its comma to another question, or "Está bien, gracias" at "¿Le interesa?": either
    // way, so he asks
    take_or_not: [
      t("Perdón, | ¿entonces | se lo queda | o | no?", "Sorry, | so | you'll take it | or | not?", "Sorry, so are you taking it or not?"),
      t("Entonces, | ¿se lo queda?", "So, | you'll take it?", "So, are you taking it?"),
    ],
    // "Me gusta mucho." at the decision: liking it isn't taking it, so he asks
    take_q: [t("Entonces, | ¿se lo queda?", "So, | you'll take it?", "So, are you taking it?")],
    // "Me lo quedo" before the terms were said: the terms first, then the question again
    terms_first: [t("¡Qué | bueno! | Antes, | para | que | sepa:", "How | good! | First, | so | that | you know:", "Great! But first, just so you know:")],
    take_ok: [
      t("¡Excelente! | Creo | que | aquí | va | a | estar | muy | a gusto.", "Excellent! | I think | that | here | you're going | to | be | very | comfortable.", "Wonderful! I think you'll be very happy here."),
      t("¡Qué | bueno | que | le gustó!", "How | good | that | you liked it!", "Great! I'm glad you like it."),
    ],
    docs_ask: [
      t("Necesito | una | identificación | y | un | comprobante | de | ingresos.", "I need | an | ID | and | a | proof | of | income.", "I'll need your ID and proof of income."),
      t("Primero, | ¿me | presta | su | identificación?", "First, | (to) me | you lend | your | ID?", "First, can I see your ID, please?", { flags: { 2: "¿Me presta…?: a polite request to see it briefly; he gives it back." } }),
    ],
    docs_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you."), t("Muy | bien, | gracias.", "Very | good, | thanks.", "That's great, thanks.")],
    passport_ok: [t("El | pasaporte | sirve.", "The | passport | works.", "A passport is fine.")],
    // "¿Le sirve mi tarjeta de residente / mi licencia?"
    id_ok: [t("Sí, | esa | sirve.", "Yes, | that one | works.", "Yes, that works.")],
    // "No traigo identificación.": later, without a pronoun that would have to agree with el pasaporte or la credencial
    id_later: [t("No se preocupe, | eso | lo | vemos | después.", "Don't worry, | that | it | we'll see to | later.", "Don't worry, we'll sort that out later.")],
    no_job_ok: [t("No hay | problema. | Sus | estados de cuenta | también | sirven.", "There's no | problem. | Your | bank statements | also | work.", "That's okay. Your bank statements work too.")],
    sign_ask: [
      t("Aquí | está | el | contrato. | Firme | abajo, | por favor.", "Here | is | the | lease. | Sign | at the bottom, | please.", "Here's the lease. Please sign at the bottom."),
      t("Bueno, | este | es | el | contrato. | Firme | aquí, | por favor.", "Well, | this | is | the | lease. | Sign | here, | please.", "So, here's the lease. Just sign here, please."),
    ],
    sign_remind: [t("Entonces, | firme | aquí, | por favor.", "So, | sign | here, | please.", "So, just sign here, please.")],
    sign_where: [t("Aquí, | abajo.", "Here, | at the bottom.", "Right here, at the bottom.")],
    sign_soon: [t("Enseguida. | Antes, | una | pregunta:", "Right away. | Before that, | one | question:", "In a moment. First, one question:")],
    no_rush: [t("Sin | problema, | tómese su tiempo.", "No | problem, | take your time.", "No problem, take your time."), t("Claro, | no hay | prisa. | Léalo | con | calma | y | firme | cuando | esté | {m:listo|f:lista}.", "Sure, | there's no | rush. | Read it | with | calm | and | you sign | when | you're | ready.", "Sure, no rush. Read it through and sign when you're ready.")],
    // (a second "not yet" gets a different reply)
    read_ok: [t("Claro. | Léalo | con | calma.", "Of course. | Read it | with | calm.", "Of course. Take your time.")],
    copy_ok: [t("Claro. | Le | doy | una | copia | firmada.", "Of course. | (To) you | I'll give | a | copy | signed.", "Of course. I'll give you a signed copy.")],
    pen_ok: [t("Sí, | tome.", "Yes, | take it.", "Sure, here you go.")],
    keys: [t("Y | aquí | están | sus | llaves. | ¡{m:Bienvenido|f:Bienvenida} | a | su | casa!", "And | here | are | your | keys. | Welcome | to | your | home!", "And here are your keys. Welcome home!")],
    think_ok: [
      t("Claro, | piénselo | con | calma.", "Sure, | think it over | with | calm.", "Of course. Take your time."),
      t("Sí, | no hay | problema. | Aquí | está | mi | número.", "Yes, | there's no | problem. | Here | is | my | number.", "Sure, no problem. Here's my number."),
      t("Está bien. | Nomás | avíseme | antes | del | viernes.", "That's fine. | Just | let me know | before | — | Friday.", "That's fine. Just let me know by Friday.",
        { flags: { 1: F_NOMAS, 4: "del = de + el: Spanish puts el before a day of the week; English has no article." },
          neutral: t("Está bien. | Solo | avíseme | antes | del | viernes.", "That's fine. | Just | let me know | before | — | Friday.", "That's fine. Just let me know by Friday.", { flags: { 4: "del = de + el: Spanish puts el before a day of the week; English has no article." } }) }),
    ],
    someone_else: [t("Para | que | sepa, | mañana | viene | otra | persona | a | verlo.", "So | that | you know, | tomorrow | is coming | another | person | to | see it.", "Just so you know, someone else is coming to see it tomorrow.")],
    hurry: [t("¿Me | puede | avisar | hoy | en la noche?", "(To) me | can you | let know | today | in the evening?", "Could you let me know by tonight?")],
    wait_call: [t("Muy | bien. | Espero | su | llamada.", "Very | good. | I'll wait for | your | call.", "Great. I'll wait for your call.")],
    decline_ok: [
      t("No hay | problema. | ¡Suerte | con | la | búsqueda!", "There's no | problem. | Luck | with | the | search!", "No problem. Good luck with your search!"),
      t("Entiendo. | ¡Gracias | por | venir!", "I understand. | Thank you | for | coming!", "I understand. Thanks for coming!"),
    ],
    bye_take: [t("Si | necesita | algo, | vivo | en | la | planta baja.", "If | you need | anything, | I live | on | the | ground floor.", "If you need anything, I live on the ground floor.")],
    bye_think: [t("¡Gracias | por | venir!", "Thank you | for | coming!", "Thanks for coming!")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],

    // --- the guarantor (aval) ---
    aval_ask: [t("Una | cosa | más: | ¿tiene | aval?", "One | thing | more: | do you have | a guarantor?", "One more thing: do you have a guarantor?",
      { flags: { 4: "aval: a guarantor, usually someone with a home in the same town who co-signs the lease. Most Mexican landlords ask for one." } })],
    aval_explain: [t("Un | aval | es | una | persona | con | casa | propia | aquí | que | firma | el | contrato | con | usted. | Si | usted | no paga, | paga | el | aval.", "A | guarantor | is | a | person | with | house | own | here | who | signs | the | lease | with | you. | If | you | don't pay, | pays | the | guarantor.", "A guarantor is someone who owns a home here and co-signs the lease with you. If you don't pay, they do.")],
    aval_needed: [t("Sí, | normalmente | pido | un | aval.", "Yes, | normally | I ask for | a | guarantor.", "Yes, I usually ask for a guarantor.")],
    aval_not_needed: [t("No hace falta; | con | el | depósito | es | suficiente.", "It's not needed; | with | the | deposit | it's | enough.", "You don't need one; the deposit is enough.")],
    aval_yes_ok: [t("Perfecto. | Antes de | la | mudanza, | tráigame | los | datos | de | su | aval | y | una | copia | de | sus | escrituras.", "Perfect. | Before | the | move, | bring me | the | details | of | your | guarantor | and | a | copy | of | their | deeds.", "Perfect. Before you move in, bring me your guarantor's details and a copy of their property deed.",
      { flags: { 14: "sus: here their (the guarantor's); su/sus can mean his, her, their or your." } })],
    aval_none_ok: [t("Entiendo; | mucha | gente | que | llega | de fuera | no tiene.", "I understand; | many | people | who | arrive | from elsewhere | don't have one.", "I understand. A lot of people who move here from somewhere else don't have one.")],
    aval_deposit_q: [t("Sin | aval, | le | pido | dos | meses | de | depósito | en vez de | uno: | {$deposit}. | ¿Está | de acuerdo?", "Without | a guarantor, | (from) you | I ask | two | months | of | deposit | instead of | one: | {$deposit}. | Are you | in agreement?", "Without a guarantor, I'd ask for two months' deposit instead of one: {$deposit}. Is that okay?")],
    aval_deposit_reask: [t("Entonces, | ¿le parecen | bien | los | dos | meses | de | depósito?", "So, | do they seem to you | fine | the | two | months | of | deposit?", "So, are two months' deposit okay with you?")],
    aval_deposit_ok: [t("Muy | bien: | dos | meses | de | depósito | y | listo.", "Very | good: | two | months | of | deposit | and | done.", "All right: two months' deposit, and we're all set.")],
    aval_deposit_amount: [t("Serían | {$deposit} | de | depósito: | dos | meses | de | renta.", "It would be | {$deposit} | of | deposit: | two | months | of | rent.", "That would be {$deposit} for the deposit: two months' rent.")],
    aval_deposit_fine: [t("No hace falta; | con | un | mes | es | suficiente.", "It's not needed; | with | one | month | it's | enough.", "No need; one month is enough.")],
    poliza_offer: [t("Entonces | puede | contratar | una | póliza | jurídica: | una | empresa | revisa | sus | datos | y | responde | por | usted. | Usted | la | paga | una | sola | vez. | ¿Le parece?", "Then | you can | take out | a | policy | legal: | a | company | checks | your | details | and | answers | for | you. | You | it | pay | one | single | time. | Does that work for you?", "Then you can take out a rental guarantee policy: a company checks your details and vouches for you. You pay for it once. Would that work?",
      { flags: { 4: "póliza jurídica: a rental guarantee from a legal firm, common in Mexico when there's no guarantor.", 16: "la before a verb is a pronoun: it (the policy)." } })],
    poliza_info: [t("Usted | paga | la | póliza | una | sola | vez. | El | precio | depende | de | la | empresa.", "You | pay | the | policy | one | single | time. | The | price | depends | on | the | company.", "You pay for the policy once. The price depends on the company.")],
    poliza_price: [t("El | precio | depende | de | la | empresa.", "The | price | depends | on | the | company.", "The price depends on the company.")],
    // "¿Qué es una póliza jurídica?" / "¿Cómo funciona?"
    poliza_what: [t("Es | como | un | aval, | pero | de | una | empresa: | revisan | sus | datos | y | responden | por | usted.", "It's | like | a | guarantor, | but | from | a | company: | they check | your | details | and | they vouch | for | you.", "It's like a guarantor, but it's a company: they check your details and vouch for you.")],
    // "¿Qué pasa si no tengo aval?" / "No tengo aval." before the lease: the options, nothing recorded or quoted yet
    aval_options: [t("Sin | aval, | le | pido | dos | meses | de | depósito, | o | puede | contratar | una | póliza | jurídica.", "Without | a guarantor, | (from) you | I ask | two | months | of | deposit, | or | you can | take out | a | policy | legal.", "Without a guarantor, I ask for two months' deposit, or you can take out a rental guarantee policy.",
      { flags: { 12: F_POLIZA } })],
    // "¿Hay otra opción?" with nothing to choose between (after the one-year minimum, the firm rent)
    only_option: [t("Mmm, | la verdad, | es | lo | único | que | le | puedo | ofrecer.", "Hmm, | honestly, | it's | the | only thing | that | (to) you | I can | offer.", "Hmm, honestly, that's all I can offer.")],
    poliza_reask: [t("¿Entonces | le parece | bien | la | póliza?", "So | does it seem to you | fine | the | policy?", "So, does the policy work for you?")],
    poliza_ok: [t("Perfecto. | Le | paso | el | contacto | de | la | empresa.", "Perfect. | (To) you | I'll pass | the | contact | of | the | company.", "Perfect. I'll give you the company's contact.")],
    aval_no_deal: [t("Entiendo. | Piénselo | con | calma | y | me | avisa.", "I understand. | Think it over | with | calm | and | (to) me | you let know.", "I understand. Think it over and let me know.")],
    aval_reask: [t("Entonces, | ¿tiene | aval?", "So, | do you have | a guarantor?", "So, do you have a guarantor?")],

    // --- tenant mode ---
    howis: [
      t("¡Hola! | ¿Qué tal | todo | en | el | departamento?", "Hi! | How's | everything | in | the | apartment?", "Oh, hi! How's everything with the apartment?",
        { flags: { 5: F_DEPA }, neutral: t("¡Hola! | ¿Qué tal | todo | en | el | apartamento?", "Hi! | How's | everything | in | the | apartment?", "Oh, hi! How's everything with the apartment?") }),
      t("¡Buenas! | ¿Cómo | va | todo | en | su | casa | nueva?", "Hi! | How | is going | everything | in | your | home | new?", "Hi there! How are you settling in?"),
    ],
    problem_reask: [t("¿Todo | funciona | bien?", "Everything | works | well?", "Is everything working okay?")],
    problem_what: [t("¡Ay, | no! | ¿Qué | pasó?", "Oh, | no! | What | happened?", "Oh no! What's wrong?")],
    all_good_ack: [t("¡Qué | bueno! | Si | algo | se descompone, | nomás | avíseme.", "How | good! | If | something | breaks, | just | let me know.", "Good to hear! If anything breaks, just let me know.",
      { flags: { 5: F_NOMAS }, neutral: t("¡Qué | bueno! | Si | algo | se descompone, | solo | avíseme.", "How | good! | If | something | breaks, | just | let me know.", "Good to hear! If anything breaks, just let me know.") })],
    no_bother: [t("¡No es | ninguna | molestia!", "It isn't | any | bother!", "Not at all!")],
    sorry_problem: [t("Ay, | lo siento | mucho.", "Oh, | I'm sorry | very much.", "Oh no, sorry about that!"), t("Uy, | qué pena.", "Oh, | what a shame.", "Oh, I'm sorry to hear that.")],
    plan_repairman: [t("Llamo | al | técnico | enseguida.", "I'll call | the | repairman | right away.", "I'll call the repairman right away.", { flags: { 1: F_AL } })],
    plan_plumber: [t("Llamo | al | plomero | enseguida.", "I'll call | the | plumber | right away.", "I'll call the plumber right away.", { flags: { 1: F_AL } })],
    plan_electrician: [t("Llamo | al | electricista | enseguida.", "I'll call | the | electrician | right away.", "I'll call the electrician right away.", { flags: { 1: F_AL } })],
    plan_someone: [t("Mando | a | alguien | a | revisarlo.", "I'll send | — | someone | to | check it.", "I'll send someone to look at it.", { flags: { 1: "Personal a marks the person being sent; English needs no word." } })],
    visit_time: [
      t("Puede | venir | mañana | a | las | diez. | ¿Va | a | estar | en casa?", "He can | come | tomorrow | at | — | ten. | Are you going | to | be | at home?", "He can come tomorrow at ten. Will you be home?", { flags: { 4: F_CLOCK } }),
      t("Mañana | a | las | diez | tiene | tiempo. | ¿Va | a | estar | en casa?", "Tomorrow | at | — | ten | he has | time. | Are you going | to | be | at home?", "He's free tomorrow at ten. Will you be home?", { flags: { 2: F_CLOCK } }),
    ],
    meantime_heat: [t("Mientras tanto, | le | presto | un | ventilador.", "In the meantime, | (to) you | I'll lend | a | fan.", "In the meantime, I can lend you a fan.")],
    meantime_leak: [t("Mientras tanto, | cierre | la | llave de paso | del | agua.", "In the meantime, | close | the | shutoff valve | of the | water.", "In the meantime, you can turn off the water at the shutoff valve.")],
    home_yes_ok: [t("Perfecto. | Llega | a | las | diez.", "Perfect. | He arrives | at | — | ten.", "Perfect. He'll be there at ten.", { flags: { 3: F_CLOCK } })],
    home_no: [t("No se preocupe, | yo | le | abro | con | mi | llave.", "Don't worry, | I | (for) him | will open | with | my | key.", "No problem. I can let him in with my key.")],
    key_ok_q: [t("¿Le parece | bien?", "Does it seem to you | good?", "Is that okay with you?")],
    other_time_q: [t("¿A | qué | hora | le | queda | bien?", "At | what | time | (to) you | suits | well?", "What time works for you?")],
    time_noted: [t("Muy | bien, | le | digo | que | venga | a | esa | hora.", "Very | good, | (to) him | I'll tell | that | he come | at | that | time.", "Okay, I'll ask him to come then.")],
    day_noted: [t("Muy | bien, | le | digo | que | venga | ese | día.", "Very | good, | (to) him | I'll tell | that | he come | that | day.", "Okay, I'll ask him to come that day.")],
    key_done: [t("Perfecto. | Yo | le | abro | a | las | diez.", "Perfect. | I | (for) him | will open | at | — | ten.", "Great. I'll let him in at ten.", { flags: { 5: F_CLOCK } })],
    also_check: [t("Muy | bien, | que | revise | eso | también.", "Very | good, | — | he should check | that | too.", "Okay, he'll check that too.", { flags: { 2: "que + a subjunctive verb: let him / he should." } })],
    works_here: [t("No se preocupe, | aquí | todo | funciona.", "Don't worry, | here | everything | works.", "Don't worry, everything here works.")],
    thanks_telling: [t("¡Gracias | por | avisarme!", "Thank you | for | letting me know!", "Thanks for telling me!")],
    what_problem: [t("Claro. | ¿Cuál | es | el | problema?", "Sure. | What | is | the | problem?", "Of course. What's the problem?")],
  },
  domains: { rent: () => [RENT], deposit: () => [RENT, RENT * 2] },

  hints: {
    purpose: { lt: "Say you're here to see the apartment", items: [
      { id: "here_see", s: t("Vengo | a | ver | el | departamento.", "I've come | to | see | the | apartment.", "I'm here to see the apartment.", { neutral: t("Vengo | a | ver | el | apartamento.", "I've come | to | see | the | apartment.", "I'm here to see the apartment.") }) },
      { id: "here_about", s: t("Vengo | por | el | departamento | que | se renta.", "I've come | about | the | apartment | that | is for rent.", "I'm here about the apartment for rent.", { neutral: t("Vengo | por | el | apartamento | que | se renta.", "I've come | about | the | apartment | that | is for rent.", "I'm here about the apartment for rent.") }) },
      { id: "like_see", s: t("Me gustaría | ver | el | departamento, | por favor.", "I'd like | to see | the | apartment, | please.", "I'd like to see the apartment, please.", { neutral: t("Me gustaría | ver | el | apartamento, | por favor.", "I'd like | to see | the | apartment, | please.", "I'd like to see the apartment, please.") }), register: "polite" },
      { id: "spoke_phone", s: t("Hablamos | por | teléfono | ayer.", "We spoke | on | the phone | yesterday.", "We spoke on the phone yesterday.") },
      { id: "still_avail", s: t("¿Todavía | está | disponible | el | departamento?", "Still | is | available | the | apartment?", "Is the apartment still available?", { neutral: t("¿Todavía | está | disponible | el | apartamento?", "Still | is | available | the | apartment?", "Is the apartment still available?") }) },
      { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
    ] },
    ask_terms: { lt: "Ask about the rental terms", items: [
      { id: "q_rent", s: t("¿Cuánto | es | la | renta?", "How much | is | the | rent?", "How much is the rent?") },
      { id: "q_util", s: t("¿Están | incluidos | los | servicios?", "Are | included | the | utilities?", "Are utilities included?"), note: "Los servicios: water, electricity, gas and the like." },
      { id: "q_util2", s: t("¿La | luz | está | incluida?", "The | electricity | is | included?", "Is electricity included?"), note: "In Mexico, la luz (the light) is the everyday word for electricity." },
      { id: "q_deposit", s: t("¿Cuánto | es | el | depósito?", "How much | is | the | deposit?", "How much is the security deposit?") },
      { id: "q_lease", s: t("¿Por | cuánto | tiempo | es | el | contrato?", "For | how much | time | is | the | lease?", "How long is the lease?") },
      { id: "q_furnished", s: t("¿Está | amueblado?", "Is it | furnished?", "Is it furnished?") },
      { id: "q_pets", s: t("¿Se aceptan | mascotas?", "Are allowed | pets?", "Are pets allowed?") },
      { id: "q_movein", s: t("¿Cuándo | puedo | mudarme?", "When | can I | move in?", "When can I move in?") },
      { id: "q_aval", s: t("¿Necesito | aval?", "Do I need | a guarantor?", "Do I need a guarantor?"), note: "Most Mexican landlords ask for an aval, a local guarantor. Ask early." },
      { id: "q_lower", s: t("¿Me | puede | bajar | un poco | la | renta?", "(For) me | can you | lower | a little | the | rent?", "Could you lower the rent a little?") },
    ] },
    ask_more: { lt: "Ask about the building and the area", items: [
      { id: "q_parking", s: t("¿Hay | estacionamiento?", "Is there | parking?", "Is there parking?") },
      { id: "q_laundry", s: t("¿Dónde | puedo | lavar | la | ropa?", "Where | can I | wash | the | clothes?", "Where can I do laundry?") },
      { id: "q_quiet", s: t("¿Es | un | edificio | tranquilo?", "Is it | a | building | quiet?", "Is it a quiet building?") },
      { id: "q_bus", s: t("¿Hay | una | parada | de | colectivo | cerca?", "Is there | a | stop | of | colectivo | nearby?", "Is there a colectivo stop nearby?"), note: "A colectivo is a shared van on a fixed route." },
      { id: "q_floor", s: t("¿En | qué | piso | está?", "On | what | floor | is it?", "What floor is it on?") },
      { id: "q_elevator", s: t("¿Hay | elevador?", "Is there | an elevator?", "Is there an elevator?") },
      { id: "q_see", s: t("¿Puedo | ver | la | recámara?", "Can I | see | the | bedroom?", "Can I see the bedroom?", { flags: { 3: F_RECAMARA }, neutral: t("¿Puedo | ver | la | habitación?", "Can I | see | the | bedroom?", "Can I see the bedroom?") }) },
      { id: "q_payrent", s: t("¿Cuándo | se paga | la | renta?", "When | is paid | the | rent?", "When is the rent due?") },
    ] },
    done_asking: { lt: "Say you have no more questions", items: [
      { id: "that_all", s: t("Creo | que | es | todo.", "I think | that | it's | all.", "I think that's all.") },
      { id: "no_more_q", s: t("No, | es | todo, | gracias.", "No, | it's | all, | thanks.", "No, that's all, thanks.") },
    ] },
    decide: { lt: "Decide", items: [
      { id: "take_it", s: t("¡Me lo quedo!", "I'll take it!", "I'll take it!") },
      { id: "like_to_rent", s: t("Me gustaría | rentarlo.", "I'd like | to rent it.", "I'd like to rent it."), register: "polite" },
      { id: "think", s: t("Lo | tengo | que | pensar.", "It | I have | to | think over.", "I need to think about it.") },
      { id: "let_know", s: t("¿Le | puedo | avisar | mañana?", "(To) you | can I | let know | tomorrow?", "Can I let you know tomorrow?") },
      { id: "too_expensive", s: t("Está | un poco | caro | para | mí.", "It's | a little | expensive | for | me.", "It's a little too expensive for me.") },
      { id: "not_for_me", s: t("Creo | que | no es | para | mí.", "I think | that | it isn't | for | me.", "I don't think it's right for me.") },
    ] },
    hurry: { lt: "Promise an answer by tonight", items: [
      { id: "call_tonight", s: t("Sí, | le | llamo | hoy | en la noche.", "Yes, | (to) you | I'll call | today | in the evening.", "Sure, I'll call you tonight.") },
      { id: "take_now", s: t("Mejor | me lo quedo | de una vez.", "Better | I'll take it | right now.", "Actually, I'll take it now.") },
    ] },
    movein: { lt: "Say when you'd like to move in", items: [
      { id: "movein_first", s: t("El | primero | del | mes, | si | se puede.", "The | first | of the | month, | if | it's possible.", "On the first, if possible.") },
      { id: "next_month", s: t("El | próximo | mes.", "The | next | month.", "Next month.") },
      { id: "asap", s: t("Lo antes posible.", "As soon as possible.", "As soon as possible.") },
    ] },
    people: { lt: "Say who will live there", items: [
      { id: "just_me", s: t("Solo | yo.", "Just | me.", "Just me.") },
      { id: "with_family", s: t("Con | mi | familia.", "With | my | family.", "Me and my family.") },
      { id: "people_two", s: t("Somos | dos.", "We are | two.", "There are two of us.") },
    ] },
    pets: { lt: "Say whether you have pets", items: [
      { id: "no_pets", s: t("No, | no tengo | mascotas.", "No, | I don't have | pets.", "No, I don't have any pets.") },
      { id: "have_cat", s: t("Tengo | un | gato.", "I have | a | cat.", "I have a cat.") },
      { id: "have_dog", s: t("Un | perro | chico.", "A | dog | small.", "A small dog.") },
    ] },
    pet_kind: { lt: "Say what pet you have", items: [
      { id: "have_cat", s: t("Tengo | un | gato.", "I have | a | cat.", "I have a cat.") },
      { id: "have_dog", s: t("Un | perro | chico.", "A | dog | small.", "A small dog.") },
    ] },
    docs: { lt: "Show your ID and proof of income", items: [
      { id: "here_passport", s: t("Aquí | tiene | mi | pasaporte.", "Here | you have | my | passport.", "Here's my passport.") },
      { id: "passport_ok", s: t("¿Le sirve | mi | pasaporte?", "Does it work for you | my | passport?", "Is my passport okay?") },
      { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "job_letter", s: t("Tengo | una | carta | de | mi | trabajo.", "I have | a | letter | from | my | work.", "I have a letter from my employer.") },
    ] },
    aval: { lt: "Answer about a guarantor", items: [
      { id: "aval_none", s: t("No, | no tengo | aval.", "No, | I don't have | a guarantor.", "No, I don't have a guarantor.") },
      { id: "aval_have", s: t("Sí, | tengo | aval.", "Yes, | I have | a guarantor.", "Yes, I have a guarantor.") },
      { id: "aval_q", s: t("¿Qué | es | un | aval?", "What | is | a | guarantor?", "What's an aval?") },
      { id: "aval_dep", s: t("¿Puedo | dejar | dos | meses | de | depósito?", "Can I | leave | two | months | of | deposit?", "Can I pay two months' deposit instead?") },
    ] },
    extra_dep: { lt: "Ask about other options", items: [
      { id: "q_poliza", s: t("¿Hay | otra | opción?", "Is there | another | option?", "Is there another option?") },
      { id: "poliza_q", s: t("¿Qué | es | una | póliza | jurídica?", "What | is | a | policy | legal?", "What's a rental guarantee policy?") },
    ] },
    sign: { lt: "Sign the lease", items: [
      { id: "where_sign", s: t("Claro. | ¿Dónde | firmo?", "Sure. | Where | do I sign?", "Sure. Where do I sign?") },
      { id: "read_first", s: t("¿Lo | puedo | leer | primero?", "It | can I | read | first?", "Can I read it first?") },
      { id: "copy", s: t("¿Me | da | una | copia?", "(To) me | you give | a | copy?", "Could I get a copy?") },
    ] },
    problem: { lt: "Report a problem", items: [
      { id: "not_working", s: t("El | aire | acondicionado | no funciona.", "The | air | conditioning | doesn't work.", "The AC isn't working.") },
      { id: "leaking", s: t("La | llave | de | la | cocina | gotea.", "The | faucet | of | the | kitchen | drips.", "The kitchen faucet is leaking.", { flags: { 1: "llave: a faucet in Mexico (and a key); grifo is more widely used." } }) },
      { id: "no_hot", s: t("No hay | agua | caliente.", "There's no | water | hot.", "There's no hot water.") },
      { id: "sorry_bother", s: t("Perdón | que | lo | moleste, | pero | no hay | agua | caliente.", "Sorry | that | you | I bother, | but | there's no | water | hot.", "Sorry to bother you, but there's no hot water.") },
      { id: "problem_with", s: t("Hay | un | problema | con | el | baño.", "There's | a | problem | with | the | bathroom.", "There's a problem with the bathroom.") },
    ] },
    repair: { lt: "Say whether you'll be home", items: [
      { id: "home_yes", s: t("Sí, | voy | a | estar | en casa.", "Yes, | I'm going | to | be | at home.", "Yes, I'll be home.") },
      { id: "at_work", s: t("No, | voy | a | estar | trabajando.", "No, | I'm going | to | be | working.", "No, I'll be at work.") },
      { id: "ten_fine", s: t("Mañana | a | las | diez | está bien.", "Tomorrow | at | — | ten | is fine.", "Tomorrow at ten is fine.", { flags: { 2: F_CLOCK } }) },
      { id: "fix", s: t("¿Puede | mandar | a | alguien | a | arreglarlo?", "Can you | send | — | someone | to | fix it?", "Could you send someone to fix it?", { flags: { 2: "Personal a marks the person being sent; English needs no word." } }) },
    ] },
    key_ok: { lt: "Agree to let him in", items: [
      { id: "use_key", s: t("Sí, | puede | usar | su | llave.", "Yes, | you can | use | your | key.", "Sure, you can use your key.") },
    ] },
    other_time: { lt: "Suggest another time", items: [
      { id: "after_five", s: t("¿Puede | venir | después de | las | cinco?", "Can he | come | after | — | five?", "Could he come after five?", { flags: { 3: F_CLOCK } }) },
      { id: "saturday", s: t("El | sábado | es | mejor.", "— | Saturday | is | better.", "Saturday would be better.", { flags: { 0: "Spanish puts el before a day of the week; English has no article." } }) },
      { id: "afternoon", s: t("En la tarde, | por favor.", "In the afternoon, | please.", "In the afternoon, please.") },
    ] },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a landlord you've just met, usted is more polite: puede or tiene (puedes and tienes are for friends).", better: "¿Me puede bajar un poco la renta?" },
  },

  merges: {
    "al mes": { reason: "lexical_expression", split: "al → to the + mes → month misreads the rate: a month / per month.", minimal: "Two words; the amount stays separate." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little reads as a noun phrase; the degree adverb = a little.", minimal: "Two words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; the discourse marker = by the way.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as a sentence opener = honestly, to be honest.", minimal: "Two words." },
    "a gusto": { reason: "lexical_expression", split: "a → to + gusto → taste is false; estar a gusto = be comfortable, happy.", minimal: "Two words." },
    "en orden": { reason: "lexical_expression", split: "en → in + orden → order is close but the set phrase = in order (in good condition).", minimal: "Two words." },
    "se vaya": { reason: "grammatical_fusion", split: "se → oneself + vaya → you go; irse = to leave (move out).", minimal: "Pronoun and verb." },
    "planta baja": { reason: "lexical_expression", split: "planta → plant/floor + baja → low misreads the building term: the ground floor.", minimal: "Two words." },
    "de techo": { reason: "lexical_expression", split: "de → of + techo → ceiling gives “fans of ceiling”; the noun modifier = ceiling (fans).", minimal: "Two words." },
    "estados de cuenta": { reason: "lexical_expression", split: "estados → states + de → of + cuenta → account misreads the banking term: bank statements.", minimal: "Three words." },
    "en la noche": { reason: "lexical_expression", split: "en → in + la → the + noche → night; the time phrase = in the evening / tonight.", minimal: "Three words." },
    "en la tarde": { reason: "lexical_expression", split: "en → in + la → the + tarde → afternoon; one time phrase = in the afternoon.", minimal: "Three words." },
    "en casa": { reason: "lexical_expression", split: "en → in + casa → house; the set phrase = at home.", minimal: "Two words." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much misreads the adverb: in the meantime.", minimal: "Two words." },
    "llave de paso": { reason: "lexical_expression", split: "llave → key + de → of + paso → step misreads the plumbing term: the shutoff valve.", minimal: "Three words." },
    "no hace falta": { reason: "grammatical_fusion", split: "no → not + hace → makes + falta → lack is a word salad; = it's not needed.", minimal: "Three words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of leaves a stray of; the preposition = before.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → afterward + de → of leaves a stray of; the preposition = after.", minimal: "Two words." },
    "en vez de": { reason: "lexical_expression", split: "en → in + vez → time + de → of misreads the preposition: instead of.", minimal: "Three words." },
    "de fuera": { reason: "lexical_expression", split: "de → from + fuera → outside; said of people = from elsewhere (not from here).", minimal: "Two words." },
    "le gustó": { reason: "grammatical_fusion", split: "le → to you + gustó → it pleased is a word-for-word reading of one English verb: you liked it.", minimal: "Pronoun and verb." },
    "le sirve": { reason: "grammatical_fusion", split: "le → to you + sirve → serves suggests service; the question means does it work for you.", minimal: "Pronoun and verb." },
    "le parecen": { reason: "grammatical_fusion", split: "le → to you + parecen → they seem is one English question: do they seem okay to you.", minimal: "Pronoun and verb." },
    "qué pena": { reason: "lexical_expression", split: "qué → what + pena → sorrow; the exclamation = what a shame / I'm sorry.", minimal: "Two words." },
    "me lo quedo": { reason: "lexical_expression", split: "me → myself + lo → it + quedo → I stay is a false literal; the set phrase = I'll take it.", minimal: "Three words." },
    "se lo queda": { reason: "lexical_expression", split: "se → yourself + lo → it + queda → you stay is a false literal; quedarse con algo = to take it (you'll take it).", minimal: "Three words." },
    "lo antes posible": { reason: "lexical_expression", split: "lo → it + antes → before + posible → possible is a word salad; = as soon as possible.", minimal: "Three words." },
    "de una vez": { reason: "lexical_expression", split: "de → of + una → one + vez → time misreads the adverb: right now, once and for all.", minimal: "Three words." },
    "cada rato": { reason: "lexical_expression", split: "cada → each + rato → while reads oddly; the adverb = all the time, every few minutes.", minimal: "Two words." },
    "se alcanza a ver": { reason: "lexical_expression", split: "se → itself + alcanza → reaches + a → to + ver → see is a word salad; alcanzar a ver = to (just) be able to see.", minimal: "Four words." },
  },

  // The learner's plan (viewing, or the tenant's problem visit): items of the other mode stay hidden.
  mission: [
    { lt: "Say you're here about the apartment", optional: true, when: view, done: (c) => view(c) && !!c.s.purpose },
    { lt: "Ask about the rental terms", optional: true, when: view, done: (c) => view(c) && (c.s.qCount > 0 || !!c.s.qDone) },
    { lt: "Decide: take it or not", optional: true, when: view, done: (c) => view(c) && !!c.s.decision },
    { lt: "Say when you'll move in", optional: true, when: (c) => taking(c), done: (c) => taking(c) && !!c.s.moveinKnown },
    { lt: "Show your ID", optional: true, when: (c) => taking(c) && c.s.askDocs, done: (c) => !!c.s.docsOk },
    { lt: "Sort out the guarantor", optional: true, when: (c) => view(c) && !!c.s.avalTwist && (c.s.decision === "take" || !!c.s.aval), done: (c) => !!c.s.aval },
    { lt: "Sign the lease", optional: true, when: (c) => taking(c), done: (c) => !!c.s.signed },
    { lt: "Promise an answer by tonight", optional: true, when: (c) => view(c) && c.s.decision === "think" && c.s.otherApplicant, done: (c) => !!c.s.hurryDone },
    // tenant mode (twist)
    { lt: "Report the problem", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.problem },
    { lt: "Say whether you'll be home", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.visitAnswered || !!c.s.visitOk },
    { lt: "Agree on a time for the repair", optional: true, when: (c) => c.s.mode === "problem", done: (c) => !!c.s.visitOk },
  ],

  steps: [
    // Tenant mode (returning players): report a problem and arrange a repair visit.
    { id: "problem", when: (c) => c.s.mode === "problem", done: (c) => !!c.s.problem,
      ask: (c) => { if (!c.s.howisSaid) { c.s.howisSaid = true; c.say("howis"); } else c.say("problem_reask"); },
      // "Bien, gracias." answers "¿Qué tal todo en el departamento?" (all good)
      expects: ["report_problem", "all_good", "sorry_bother", "fix_request", "have_problem", "g_howareyou_answer", "nothing_ctx"],
      suggest: [{ lt: "Report a problem: the AC, a dripping faucet…", hint: "problem" }],
      yes: (c) => { apartment.handlers.all_good(c, {}, { intent: "all_good", slots: {}, tags: [] }); },
      no: (c) => { c.say("problem_what"); c.hold(); } },
    { id: "visit", when: (c) => c.s.mode === "problem" && !!c.s.problem, done: (c) => !!c.s.visitOk,
      ask: (c) => c.say("visit_time"), expects: ["home_yes", "at_work", "time_pref", "use_key", "time_ok", "time_bad", "time_ctx"],
      suggest: [{ lt: "Say whether you'll be home, or suggest another time", hint: "repair" }],
      yes: (c) => { c.say("home_yes_ok"); c.s.visitOk = true; },
      no: (c) => homeNo(c) },

    // Viewing mode
    { id: "purpose", when: view, done: (c) => !!c.s.purpose,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "must" ? "greet_must_be" : "greet_help"); }
        else { c.s.lastQ = "must"; c.say("purpose_again"); }
      },
      expects: ["see_apartment", "intro_name_ctx", "my_name"],
      suggest: [{ lt: "Say you're here to see the apartment", hint: "purpose" }],
      // "Sí" to "¿Le puedo ayudar en algo?" → he asks whether it's about the apartment; otherwise it confirms.
      yes: (c) => { if (c.s.lastQ !== "help") enter(c); },
      no: (c) => { c.s.lastQ = "help"; c.say("how_help"); c.hold(); } },
    // Don Ernesto's own questions: asked once; dropped if the learner moves on to something else.
    { id: "movein_q", when: (c) => view(c) && c.s.purpose && c.s.askMovein, done: (c) => !!c.s.moveinAsked || !!c.s.moveinKnown,
      ask: (c) => { c.s.moveinAsked = true; askMovein(c, true); }, expects: ["movein_ans_ctx", "ask_movein"],
      suggest: [{ lt: "Say when you'd like to move in", hint: "movein" }],
      help: (c) => { c.say("movein_info"); } },
    { id: "people_q", when: (c) => view(c) && c.s.purpose && c.s.askPeople, done: (c) => !!c.s.peopleAsked || !!c.s.peopleKnown,
      ask: (c) => {
        c.s.peopleAsked = true;
        c.say("ask_people");
        c.expect({ id: "people_q", optional: true, expects: ["people_ans", "people_num_ctx"], hints: ["people"],
          suggest: [{ lt: "Say who will live there", hint: "people" }],
          on: { people_ans: (cc, sl, sg) => { apartment.handlers.people_ans(cc, sl, sg); }, people_num_ctx: (cc, sl, sg) => { apartment.handlers.people_num_ctx(cc, sl, sg); } },
          yes: (cc) => { cc.s.peopleKnown = true; cc.say("people_ack"); },
          no: (cc) => {
            cc.say("ask_how_many");
            cc.expect({ id: "how_many", optional: true, expects: ["people_ans", "people_num_ctx"], hints: ["people"],
              suggest: [{ lt: "Say how many people will live there", hint: "people" }],
              on: { people_ans: (c3, sl, sg) => { apartment.handlers.people_ans(c3, sl, sg); }, people_num_ctx: (c3, sl, sg) => { apartment.handlers.people_num_ctx(c3, sl, sg); } } });
          } });
      },
      expects: ["people_ans", "people_num_ctx"] },
    { id: "pets_q", when: (c) => view(c) && c.s.purpose && c.s.askPets, done: (c) => !!c.s.petsAsked || !!c.s.petsKnown,
      ask: (c) => {
        c.s.petsAsked = true;
        c.say("ask_pets_q");
        c.expect({ id: "pets_q", optional: true, expects: ["have_pet", "no_pets"], hints: ["pets"],
          suggest: [{ lt: "Say whether you have pets", hint: "pets" }],
          on: { have_pet: (cc, sl, sg) => { apartment.handlers.have_pet(cc, sl, sg); }, no_pets: (cc, sl, sg) => { apartment.handlers.no_pets(cc, sl, sg); } },
          yes: (cc) => {
            cc.say("ask_pet_which");
            cc.expect({ id: "pet_which", optional: true, expects: ["have_pet"], hints: ["pet_kind"],
              suggest: [{ lt: "Say what pet you have", hint: "pet_kind" }],
              on: { have_pet: (c3, sl, sg) => { apartment.handlers.have_pet(c3, sl, sg); } },
              yes: (c3) => { c3.s.petsKnown = true; c3.say("pets_policy"); }, no: (c3) => { c3.s.petsKnown = true; c3.say("ack"); } });
          },
          no: (cc) => { cc.s.petsKnown = true; cc.say("ack"); } });
      },
      expects: ["have_pet", "no_pets"] },
    { id: "questions", when: view, done: (c) => !!c.s.qDone,
      ask: (c) => c.say(c.s.qCount ? "ask_questions_more" : "ask_questions_first"),
      expects: ["ask_rent", "ask_utilities", "ask_deposit", "ask_furnished", "ask_appliance", "ask_pets", "ask_lease", "ask_movein", "ask_parking",
        "ask_laundry", "ask_quiet", "ask_bus", "ask_balcony", "ask_shops", "ask_floor", "ask_smoke", "ask_size", "ask_see", "ask_payrent", "ask_apply", "ask_aval", "ask_landlord", "ask_lower", "ask_break",
        "no_more", "take", "think", "decline", "have_questions"],
      suggest: [
        { lt: "Ask about the rent, utilities, deposit or lease", hint: "ask_terms" },
        { lt: "Ask about the floor, the colectivo or the neighbors", hint: "ask_more" },
        { lt: "Say you have no more questions", hint: "done_asking" },
      ],
      yes: (c) => { c.say("go_ahead"); c.hold(); },
      no: (c) => { c.s.qDone = true; volunteer(c); } },
    { id: "decision", when: (c) => view(c) && !!c.s.qDone, done: (c) => !!c.s.decision,
      // ask_lease: "Quiero rentarlo por seis meses" is a shorter lease asked for (the minimum is a year), never take + a question
      ask: (c) => c.say("decision_ask"), expects: ["take", "think", "decline", "like_it", "too_x", "call_back", "think_ctx", "price_ok", "ask_lease"],
      suggest: [{ lt: "Decide: take it, or think it over", hint: "decide" }],
      help: (c) => { apartment.handlers.think(c, {}, { intent: "think", slots: {}, tags: [] }); },
      // "Está bien, gracias" / "Ok, gracias" could be a yes or a polite no (rule 17): he asks again
      yes: (c) => { if (politeClosing(c)) { c.say("take_or_not"); c.hold(); return; } take(c); }, no: (c) => decline(c) },
    { id: "movein_take", when: (c) => view(c) && c.s.decision === "take", done: (c) => !!c.s.moveinKnown,
      ask: (c) => askMovein(c, false), expects: ["movein_ans_ctx", "ask_movein"],
      suggest: [{ lt: "Say when you'd like to move in", hint: "movein" }],
      help: (c) => { c.say("movein_info"); c.s.moveinKnown = true; } },
    { id: "docs", when: (c) => view(c) && c.s.decision === "take" && c.s.askDocs, done: (c) => !!c.s.docsOk,
      ask: (c) => c.say("docs_ask"), expects: ["here_you_go", "passport_ok", "have_job", "no_job", "sign_here_ctx", "id_ctx", "no_id"],
      suggest: [{ lt: "Show your ID", hint: "docs" }],
      yes: (c) => { c.s.docsOk = true; c.say("docs_ok"); },
      // "No." / "No la traigo.": later
      no: (c) => { apartment.handlers.no_id(c, {}, { intent: "no_id", slots: {}, tags: [] }); } },
    // The brief's twist: the aval (guarantor). Without one, two months' deposit, a póliza jurídica, or no deal for now.
    { id: "aval", when: (c) => view(c) && c.s.decision === "take" && !!c.s.avalTwist, done: (c) => !!c.s.aval,
      ask: (c) => {
        if (!c.s.avalTwistShown) { c.s.avalTwistShown = true; c.twist("aval"); }
        if (c.s.avalNoneSaid) { avalNone(c); return; }
        if (c.s.avalAsked) { c.say("aval_reask"); return; }
        c.s.avalAsked = true; c.say("aval_ask");
      },
      // "No, prefiero la póliza": the póliza is explained (who pays) and asked
      expects: ["aval_none", "aval_none_ctx", "aval_yes", "aval_yes_ctx", "ask_aval", "aval_deposit", "ask_poliza", "poliza_yes_ctx", "what_ctx"],
      suggest: [{ lt: "Say whether you have a guarantor", hint: "aval" }],
      yes: (c) => avalYes(c), no: (c) => avalNone(c) },
    { id: "sign", when: (c) => view(c) && c.s.decision === "take", done: (c) => !!c.s.signed,
      ask: (c) => { c.say(c.s.signAsked ? "sign_remind" : "sign_ask"); c.s.signAsked = true; }, expects: ["where_sign", "here_you_go", "read_first", "copy", "sign_here_ctx", "pen", "sign_later"],
      suggest: [{ lt: "Sign the lease", hint: "sign" }],
      // a polite closing never signs (rule 17): the reminder; a no ("No, gracias", "Todavía no") signs nothing either
      yes: (c) => { if (politeClosing(c)) { c.say("sign_remind"); c.hold(); return; } sign(c); },
      no: (c) => { apartment.handlers.sign_later(c, {}, { intent: "sign_later", slots: {}, tags: [] }); } },
  ],

  init: (c) => {
    c.s.asked = {};
    c.s.qCount = 0;
    c.s.mode = c.visits >= 1 && c.chance(0.45) ? "problem" : "view";
    c.s.greetKind = c.chance(0.5) ? "must" : "help";
    c.s.tourExtra = c.chance(0.5);
    c.s.askMovein = c.chance(0.55);
    c.s.askPeople = c.chance(0.35);
    c.s.askPets = c.chance(0.45);
    c.s.askDocs = c.chance(0.6);
    c.s.otherApplicant = c.visits >= 1 && c.chance(0.4);
    c.s.avalTwist = c.visits >= 1 && c.chance(0.4);
    c.s.depositMonths = 1;
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- arriving ---
    see_apartment(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (c.s.purpose) { c.say("ack"); return; }
      enter(c, /disponible|libre/.test(heard(c)) ? "still_yes" : "come_in");
    },
    my_name(c) {
      if (!c.s.metSaid) { c.s.metSaid = true; c.say("nice_to_meet"); }
      // "Sí, soy yo. Me llamo Ryan." to "Viene por el departamento, ¿verdad?": the yes counts too
      if (view(c) && !c.s.purpose && (/\b(vengo|vine|departamento|apartamento)\b/.test(heard(c)) || (c.s.lastQ === "must" && ynLead(c) === "yes"))) enter(c);
    },
    intro_name_ctx(c) {
      if (!c.s.metSaid) { c.s.metSaid = true; c.say("nice_to_meet"); }
      if (view(c) && !c.s.purpose && c.s.lastQ === "must" && ynLead(c) === "yes") enter(c);
    },
    vocative(c) {
      if (/^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(heard(c)) && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
    },

    // --- the learner's questions ---
    ask_rent(c) { asked(c, "rent"); if (!termsJustSaid(c)) c.say("rent", { rent: RENT }); },
    ask_utilities(c, slots, seg) {
      asked(c, "utilities");
      // "¿Hay gas?": where it comes from; "¿Hay internet?": not in the rent, and the company the neighbors use (a bare
      // "internet, no" from the full list would sound like there's none)
      if (seg.tags.includes("has_gas")) { c.say("util_gas"); return; }
      if (seg.tags.includes("has_net")) { c.say("util_no", { X: "internet" }); c.say("util_internet"); return; }
      // two utilities in one question ("¿La renta incluye el agua y la luz?"): the full answer
      const u = Array.isArray(slots.utility) ? undefined : slots.utility as string | undefined;
      const h = heard(c);
      if (/\bcuanto\b/.test(h) && (!u || u === "electricity")) {
        if (!u && !c.s.utilSaid) c.say("utilities_all");
        c.s.utilSaid = true;
        c.say("util_cost");
        return;
      }
      c.s.utilSaid = true;
      if (!u) { if (!termsJustSaid(c)) c.say("utilities_all"); return; }
      // every reply answers its question: "¿Tengo que pagar el agua?" → "No, ya está incluida"; "¿Quién paga…?",
      // "¿Cuánto cuesta…?" get no yes or no
      const payQ = /\bpag|aparte/.test(h);
      const whQ = /\b(quien|cuanto|cuanta)\b/.test(h);
      if (INCLUDED.includes(u)) { c.say(whQ ? "util_incl" : payQ ? "util_incl_no" : "util_yes", { X: u }); return; }
      if (/\bcuanto\b/.test(h)) c.say("util_depends");
      else if (/\bquien\b/.test(h) || payQ) c.say("util_separate"); else c.say("util_no", { X: u });
      if (u === "gas") c.say("util_gas");
      else if (u === "internet" && c.chance(0.7)) c.say("util_internet");
      else if (u === "electricity" && c.chance(0.5)) c.say("util_cost");
    },
    ask_deposit(c) {
      asked(c, "deposit");
      const h = heard(c);
      if (/devuelve|regresa|reembolsable/.test(h)) { c.say("deposit_back"); return; }
      // without a guarantor the deposit is two months: agreed ($28,000), or quoted (still open, or no deal yet)
      if (c.s.depositMonths === 2) c.say("deposit_two", { deposit: RENT * 2 });
      else if (c.s.depositQuoted && ((avalOpen(c) && !c.s.polizaOffered) || c.s.aval === "none")) c.say("aval_deposit_amount", { deposit: RENT * 2 });
      else if (!termsJustSaid(c)) c.say("deposit", { deposit: RENT });
      if (/al principio|para entrar|para mudarme|al firmar|por adelantado|en total/.test(h) || c.chance(0.4)) c.say("deposit_first");
    },
    ask_furnished(c) { asked(c, "furnished"); c.say(/vaci|sin muebles|semiamueblad/.test(heard(c)) ? "furnished_semi" : "furnished"); },
    ask_appliance(c, slots, seg) {
      asked(c, "furnished");
      const a = (seg.tags.includes("heater") ? "heater" : slots.appliance) as string;
      const e = APPLIANCES.find((x) => x.id === a);
      // "¿Hay ventiladores?": ceiling fans in the other rooms, the AC in the bedroom (never "hay un ventilador")
      if (a === "ac" || a === "fan") c.say("app_ac");
      else if (a === "washer" || a === "dryer") c.say("laundry");
      else if (e?.attrs?.none) c.say("app_none", { X: a });
      else if (e?.attrs?.kitchen) c.say("app_kitchen", { X: a });
      else c.say("app_yes", { X: a });
    },
    ask_pets(c, slots) { asked(c, "pets"); c.s.petsKnown = true; petAnswer(c, slots.pet, petPlural(c, slots.pet)); },
    have_pet(c, slots) { c.s.petsKnown = true; petAnswer(c, slots.pet ?? "cat", petPlural(c, slots.pet ?? "cat")); },
    no_pets(c) { c.s.petsKnown = true; c.say("ack"); },
    ask_lease(c, slots) {
      asked(c, "lease");
      // "¿Puedo rentarlo por ocho meses?", "…por un mes?", "¿Seis meses?": less than a year gets the minimum
      const h = heard(c);
      const months = typeof slots.number === "number" ? slots.number : undefined;
      if (/\bpor mes\b|\bmedio ano\b/.test(h) || (/\bmes(es)?\b/.test(h) && (months === undefined || months < 12))) c.say("lease_min");
      else if (!termsJustSaid(c)) c.say("lease");
    },
    ask_movein(c) { asked(c, "movein"); c.say("movein_info"); },
    ask_parking(c) { asked(c, "parking"); c.say("parking"); },
    ask_laundry(c) { asked(c, "laundry"); c.say("laundry"); },
    ask_quiet(c) {
      asked(c, "quiet");
      const h = heard(c);
      // "¿Hay mucho ruido?" gets a no; "¿Cómo son los vecinos?" / "¿Qué tal la colonia?" get no yes or no
      c.say(/ruid/.test(h) ? "quiet_noise" : /vecinos/.test(h) ? "quiet_neighbors" : /\b(que tal|como es)\b/.test(h) ? "quiet_area" : /segur/.test(h) ? "safe" : "quiet");
    },
    ask_bus(c) {
      asked(c, "bus");
      const h = heard(c);
      const way = /\b(como|por donde) (llego|me voy|se llega|se va)\b/.test(h);
      c.say(/playa|\bmar\b/.test(h) ? "beach" : /centro|zocalo/.test(h) ? (way ? "bus_downtown_way" : "bus_downtown")
        : /mercado/.test(h) ? "shops" : /camion|autobus/.test(h) ? "bus_city" : "bus");
    },
    ask_floor(c) {
      asked(c, "floor");
      if (/elevador|ascensor/.test(heard(c))) { c.say("elevator"); return; }
      c.say("floor");
      if (c.chance(0.4)) c.say("elevator");
    },
    ask_balcony(c) { asked(c, "see"); c.say(/mar/.test(heard(c)) ? "sea_view" : "balcony"); },
    ask_shops(c) { asked(c, "bus"); c.say(/farmacia/.test(heard(c)) ? "shops_pharmacy" : "shops"); },
    ask_break(c) { asked(c, "lease"); c.say("lease_break"); },
    ask_smoke(c) { asked(c, "smoking"); c.say("smoking"); },
    ask_size(c) { asked(c, "size"); c.say("size"); },
    ask_see(c) { asked(c, "see"); c.say("see_room"); },
    ask_payrent(c) {
      asked(c, "payrent");
      const h = heard(c);
      c.say(/\b(como|transferencia|efectivo|tarjeta|deposito)\b/.test(h) && !/\bcuando\b/.test(h) ? "rent_pay_how" : "rent_due");
    },
    ask_apply(c) { asked(c, "apply"); c.say("apply_info"); },
    ask_aval(c) {
      asked(c, "aval");
      if (/que es/.test(heard(c))) { c.s.avalExplained = true; c.say("aval_explain"); return; }
      c.say(c.s.avalTwist ? "aval_needed" : "aval_not_needed");
      if (c.s.avalTwist && !c.s.avalExplained) { c.s.avalExplained = true; c.say("aval_explain"); }
    },
    ask_poliza(c) {
      // "¿Hay otra opción?" right after the extra-deposit quote → the póliza; otherwise what it is, its price, who pays
      if (avalOpen(c) && c.s.depositQuoted && !c.s.polizaOffered) { offerPoliza(c); return; }
      // "¿Hay otra opción?" with no póliza in sight: the options without an aval (once it came up), or nothing else
      if (!c.s.polizaOffered && /\botra (opcion|alternativa|forma)\b/.test(heard(c))) {
        c.say(c.s.avalTwist && (c.s.asked.aval || c.s.avalNoneSaid) ? "aval_options" : "only_option");
        return;
      }
      polizaAnswer(c);
      if (avalOpen(c) && c.s.polizaOffered) c.expect(polizaPending());
    },
    ask_landlord(c) { asked(c, "landlord"); c.say("landlord_here"); },
    ask_lower(c) { asked(c, "lower"); c.say("rent_firm"); },
    too_x(c) {
      // "Está un poco caro, ¿me puede bajar la renta?": haggling, not a refusal (ask_lower answers it)
      if (/bajar|rebajar|descuento|negocia|dejar en|deja en/.test(heard(c))) return;
      if (view(c) && c.step === "decision") { decline(c); return; }
      if (/caro|dinero|presupuesto|alcanza|barato|economico|pagar/.test(heard(c))) { asked(c, "lower"); c.say("rent_firm"); return; }
      c.say("understand");
    },
    price_ok(c) { c.say(view(c) && /caro|precio|barato|razonable/.test(heard(c)) ? "price_fair" : "ack"); },
    ask_unknown(c) { c.say("unknown_q"); },

    // --- deciding ---
    no_more(c) {
      if (!view(c)) { c.say("ack"); return; }
      // "No es todo, tengo otra pregunta": the comma is lost; the question that follows decides
      if (/\b(tengo|me falta) (otra|una) pregunta\b/.test(heard(c)) && !/\bno (tengo|me falta)\b/.test(heard(c))) { c.say("go_ahead"); c.hold(); return; }
      c.s.qDone = true; volunteer(c);
    },
    take(c) { take(c); },
    like_it(c) {
      // "Me gusta mucho." to "¿Qué le parece?": liking it isn't renting it; he asks (nothing is taken on a compliment)
      if (view(c) && c.step === "decision" && !c.s.decision) {
        // "Sí, me gusta." to "Entonces, ¿se lo queda?": the yes answers the question
        if (c.s.likeAcked && ynLead(c) === "yes") { dropPending(c); take(c); return; }
        if (!c.s.likeAcked) { c.s.likeAcked = true; c.say("like_it_ack"); takeOrNot(c, "take_q"); } else takeOrNot(c);
        return;
      }
      c.say("like_it_ack");
    },
    think(c) {
      if (!view(c)) { c.say("ack"); return; }
      // already thinking it over and asked to call back by tonight: don't start again
      if (c.s.decision === "think" && c.s.hurryAsked && !c.s.hurryDone) { hurryAnswer(c); return; }
      if (c.s.decision === "think") { c.say("ack"); return; }
      c.s.qDone = true; c.s.decision = "think";
      volunteer(c, !!c.s.otherApplicant);
      // someone else is coming: no "Nomás avíseme antes del viernes." before "¿Me puede avisar hoy en la noche?"
      if (!c.s.otherApplicant) c.say("think_ok");
      if (c.s.otherApplicant) {
        c.twist("someone_else");
        c.s.hurryAsked = true;
        c.say("someone_else"); c.say("hurry");
        c.expect({ id: "hurry", expects: ["call_back", "take"], hints: ["hurry"],
          suggest: [{ lt: "Promise to call by tonight", hint: "hurry" }],
          on: { call_back: (cc) => { cc.s.hurryDone = true; cc.say("wait_call"); },
            // "Lo quiero, pero tengo que hablarlo con mi esposa": the part after "pero" answers
            take: (cc) => { if (takeButNot(cc)) return false; cc.s.hurryDone = true; cc.s.decision = null; take(cc); },
            think: (cc) => { hurryAnswer(cc); },
            // a decline closes this question too ("No, mejor me lo quedo" takes it; "No me lo quedo" is asked again)
            decline: (cc) => { cc.s.hurryDone = true; declineSaid(cc, true); } },
          yes: (cc) => { cc.s.hurryDone = true; cc.say("wait_call"); }, no: (cc) => { cc.s.hurryDone = true; cc.say("understand"); },
          ask: (cc) => cc.say("hurry") });
      }
    },
    decline(c) { if (!view(c)) { c.say("ack"); return; } declineSaid(c, c.step === "questions" && !c.s.qDone); },
    think_ctx(c, slots, seg) { apartment.handlers.think(c, slots, seg); },
    have_questions(c) { c.say("go_ahead"); c.hold(); },
    id_ctx(c, slots, seg) { apartment.handlers.here_you_go(c, slots, seg); },
    call_back(c) {
      // "Le aviso hoy en la noche" before deciding = "Lo voy a pensar"
      if (view(c) && !c.s.decision) { apartment.handlers.think(c, {}, { intent: "think", slots: {}, tags: [] }); return; }
      if (c.s.decision === "think") c.s.hurryDone = true;
      c.say(c.s.decision === "think" ? "wait_call" : "ack");
    },

    // --- Don Ernesto's questions ---
    movein_ans_ctx(c) {
      c.s.moveinKnown = true;
      // "Hoy mismo." / "Ya." / "Mañana.": it's free only from the first of the month, so no "Sí, se puede"
      if (/\b(ya|ahorita|ahora|de inmediato|hoy|manana|luego luego|esta semana|este fin de semana|lo antes posible|lo mas pronto|cuanto antes|lo mas rapido)\b/.test(heard(c))
        && !/\bprimero\b/.test(heard(c))) { c.say("movein_info"); return; }
      c.say("movein_ack"); if (c.chance(0.5)) c.say("movein_info");
    },
    people_ans(c) {
      c.s.peopleKnown = true;
      peopleAnswer(c, headCount(heard(c)));
    },
    people_num_ctx(c, slots) {
      c.s.peopleKnown = true;
      const w: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };
      const n = typeof slots.number === "number" ? slots.number : w[heard(c).match(/dos|tres|cuatro|cinco/)?.[0] ?? "dos"];
      peopleAnswer(c, n);
    },

    // --- documents and the lease ---
    here_you_go(c) {
      // "Aquí tiene mi pasaporte." / "…mi carta de trabajo.": the documents, never the signature
      // (Don Ernesto takes them, and the lease still needs signing)
      const h = heard(c);
      if (/\b(pasaporte|identificacion|ine|credencial|licencia|residente|carta|estado|estados|comprobante|trabajo)\b/.test(h) && !/\b(contrato|firm)/.test(h)) {
        if (c.s.decision === "take" && !c.s.signed && !c.s.docsOk) { c.s.docsOk = true; c.say("docs_ok"); return; }
        c.say("ack"); return;
      }
      // "Aquí tiene." while the guarantor question is open: the question again, not "Enseguida"
      if (avalOpen(c) && c.step === "aval") { c.say("ack"); return; }
      if (c.step === "sign" || (c.s.decision === "take" && (!c.s.askDocs || c.s.docsOk) && !c.s.signed)) { sign(c); return; }
      if (c.s.decision === "take" && !c.s.docsOk) { c.s.docsOk = true; c.say("docs_ok"); return; }
      c.say("ack");
    },
    passport_ok(c) {
      const h = heard(c);
      c.say(!/pasaporte/.test(h) && /\b(identificacion|licencia|credencial|ine|residente)\b/.test(h) ? "id_ok" : "passport_ok");
      if (c.s.decision === "take") c.s.docsOk = true;
    },
    no_id(c) {
      if (view(c) && c.s.decision === "take" && !c.s.docsOk && !c.s.signed) { c.s.docsOk = true; c.say("id_later"); return; }
      c.say("ack");
    },
    have_job(c) { c.say("docs_ok"); if (c.s.decision === "take") c.s.docsOk = true; },
    no_job(c) { c.say("no_job_ok"); if (c.s.decision === "take") c.s.docsOk = true; },
    where_sign(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (c.s.decision !== "take") { take(c); return; }
      if ((c.s.askDocs && !c.s.docsOk) || c.s.signed) { c.say("ack"); return; }
      if (avalOpen(c)) { c.say("sign_soon"); return; }
      c.say("sign_where"); sign(c);
    },
    // "¿Aquí?" while signing / "Aquí." while handing over the ID
    sign_here_ctx(c, slots, seg) {
      if (c.step === "sign") apartment.handlers.where_sign(c, slots, seg);
      else apartment.handlers.here_you_go(c, slots, seg);
    },
    read_first(c) { c.say("read_ok"); c.hold(); },
    sign_later(c) { if (!view(c) || c.s.decision !== "take" || c.s.signed) { c.say("ack"); return; } c.say("no_rush"); c.hold(); },
    copy(c) { c.say("copy_ok"); },
    pen(c) { c.say("pen_ok"); if (c.step === "sign") c.hold(); },

    // --- the guarantor ---
    aval_none(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (guarantorAfterAll(c)) return; // the aval_yes(_ctx) part of the same sentence answers
      if (!c.s.avalTwist) { c.say("aval_not_needed"); return; }
      if (avalOpen(c)) { avalNone(c); return; }
      // "¿Qué pasa si no tengo aval?" before the lease: the options (nothing recorded; he still asks at the lease)
      if (/\b(y si|que pasa si)\b/.test(heard(c))) { c.say("aval_options"); return; }
      // "No tengo aval." before the lease: remembered, and the extra deposit is quoted when it's time
      c.s.avalNoneSaid = true;
      if (!c.s.avalNoneAck) { c.s.avalNoneAck = true; c.say("aval_none_ok"); }
      c.say("aval_options");
    },
    aval_none_ctx(c) { if (guarantorAfterAll(c)) return; if (avalOpen(c)) avalNone(c); else c.say("ack"); },
    aval_yes(c) {
      if (!view(c)) { c.say("ack"); return; }
      if (!c.s.avalTwist) { c.say("aval_not_needed"); return; }
      if (avalOpen(c) || !c.s.aval) { avalYes(c); return; }
      c.say("ack");
    },
    aval_yes_ctx(c) { if (avalOpen(c)) avalYes(c); else c.say("ack"); },
    // "¿Qué es eso?" to "¿tiene aval?": what an aval is, and the question again (the step asks it)
    what_ctx(c) { if (avalOpen(c) && !c.s.depositQuoted) { c.s.avalExplained = true; c.say("aval_explain"); } else c.say("ack"); },
    amount_q_ctx(c) { c.say("rent", { rent: RENT }); },
    poliza_yes_ctx(c) { if (avalOpen(c) && !c.s.polizaOffered) offerPoliza(c); else c.say("ack"); },
    poliza_no_ctx(c) { c.say("ack"); },
    aval_deposit_no_ctx(c) { if (avalOpen(c) && c.s.depositQuoted && !c.s.polizaOffered) offerPoliza(c); else c.say("understand"); },
    aval_deposit(c, slots) {
      if (!view(c)) { c.say("ack"); return; }
      if (!c.s.avalTwist) { c.say("aval_not_needed"); return; }
      // an amount that isn't the two months ("Puedo dejar veinte mil"): never agreed; the amount and the question again
      if (wrongAmount(slots) && avalOpen(c)) { c.s.avalAsked = true; quoteDeposit(c, c.s.depositQuoted ? "aval_deposit_amount" : "aval_deposit_q"); return; }
      if (wrongAmount(slots) && c.s.aval === "none") { c.say("aval_deposit_amount", { deposit: RENT * 2 }); return; }
      // back after no deal ("Bueno, dejo los dos meses."): the amount was quoted, so it's a yes now
      if (c.s.aval === "none" && c.s.depositQuoted) { c.s.decision = "take"; acceptDeposit(c); resume(c); return; }
      if (c.s.aval) { c.say("ack"); return; }
      // the learner offers it: the amount is said (and agreed to) before anything is recorded
      if (!c.s.depositQuoted || !avalOpen(c)) { c.s.avalAsked = true; quoteDeposit(c); return; }
      acceptDeposit(c);
    },

    // --- tenant mode ---
    report_problem(c, slots, seg) {
      if (view(c)) { c.say("works_here"); return; }
      if (c.s.problem) { c.say("also_check"); return; }
      const h = heard(c);
      const kind: string = seg.tags.includes("gas") ? "gas" : seg.tags.includes("roof") ? "roof" : slots.fix ?? (/agua caliente/.test(h) ? "hotwater" : /calor|aire|clima/.test(h) ? "ac" : /\bluz\b|electric/.test(h) ? "lights" : "faucet");
      c.s.problem = kind;
      c.twist("problem");
      c.say("sorry_problem");
      c.say(kind === "ac" || kind === "fan" ? "plan_repairman" : ["hotwater", "faucet", "toilet", "shower"].includes(kind) ? "plan_plumber" : kind === "lights" ? "plan_electrician" : "plan_someone");
      if (kind === "ac" && c.chance(0.55)) c.say("meantime_heat");
      if (kind === "faucet" && c.chance(0.55)) c.say("meantime_leak");
    },
    all_good(c) {
      if (view(c)) { c.say("like_it_ack"); return; }
      if (c.s.problem) { c.say("ack"); return; }
      if (!c.s.goodOnce) { c.s.goodOnce = true; c.say("g_glad"); c.say("what_can_do"); c.hold(); return; }
      c.say("all_good_ack"); c.say("g_bye"); c.end();
    },
    sorry_bother(c) { c.say("no_bother"); },
    nothing_ctx(c, slots, seg) { apartment.handlers.all_good(c, slots, seg); },
    have_problem(c) {
      if (view(c) || c.s.problem) { c.say("ack"); return; }
      if (/problema|descompu|no funciona/.test(heard(c))) c.say("what_problem"); else c.say("problem_what");
      c.hold();
    },
    fix_request(c) {
      if (view(c)) { c.say("works_here"); return; }
      if (!c.s.problem) { c.say("what_problem"); c.hold(); return; }
      c.say("ack");
    },
    home_yes(c) { if (repairOpen(c)) { c.say("home_yes_ok"); c.s.visitOk = true; } else c.say("ack"); },
    // "No, mañana no puedo, estoy en el trabajo" (time_bad + at_work) asks one question; "…pero puede usar su llave" is a yes
    at_work(c) { if (repairOpen(c)) { if (keyOffered(c) || c.s.visitQ === c.heard) return; homeNo(c); } else c.say("ack"); },
    time_pref(c, slots) { if (repairOpen(c)) { timeNoted(c, slots); c.s.visitOk = true; } else c.say("ack"); },
    use_key(c) { if (repairOpen(c)) { c.say("key_done"); c.s.visitOk = true; dropPending(c); } else c.say("ack"); },
    time_ok(c) { if (repairOpen(c)) { c.say("home_yes_ok"); c.s.visitOk = true; } else c.say("ack"); },
    // "A las diez no puedo, ¿puede venir a las cinco?": the other time answers (time_pref)
    time_bad(c) { if (repairOpen(c)) { if (keyOffered(c) || c.s.visitQ === c.heard || timeOffered(c)) return; askOtherTime(c); } else c.say("ack"); },
    // the time he offered, inside a refusal ("Mañana a las diez no puedo", "A las diez no está bien"): never booked
    time_ctx(c, slots, seg) {
      if (refusedTime(c, slots)) { if (repairOpen(c) && c.s.visitQ !== c.heard) askOtherTime(c); return; }
      apartment.handlers.time_pref(c, slots, seg);
    },

    // --- small talk overrides ---
    g_howareyou_answer(c) {
      // "Bien, pero el clima no funciona": the problem that follows is the answer, not "all good"
      if (c.s.mode === "problem" && !c.s.problem && c.s.howisSaid && !/\bpero\b/.test(heard(c))) { apartment.handlers.all_good(c, {}, { intent: "all_good", slots: {}, tags: [] }); return; }
      if (/\b(usted|tu|ti)\b/.test(heard(c))) c.say("g_asked_back");
    },
    g_howareyou_bad(c) {
      if (c.s.mode === "problem" && !c.s.problem) { c.say("problem_what"); c.hold(); return; }
      c.say("g_sorry_to_hear");
    },
  },

  finish: (c) => {
    c.complete();
    if (c.s.mode === "problem") c.say("thanks_telling");
    else if (c.s.decision === "take") { c.say("rent_due"); c.say("bye_take"); }
    else if (c.s.decision === "think") c.say("bye_think");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint constructions
    { say: "Vengo a ver el departamento", intent: "see_apartment" },
    { say: "Vengo por el departamento que se renta", intent: "see_apartment" },
    { say: "Me gustaría ver el departamento, por favor", intent: "see_apartment" },
    { say: "Hablamos por teléfono ayer", intent: "see_apartment" },
    { say: "¿Todavía está disponible el departamento?", intent: "see_apartment" },
    { say: "Me llamo Ryan", intent: "my_name" },
    { say: "¿Cuánto es la renta?", intent: "ask_rent" },
    { say: "¿Están incluidos los servicios?", intent: "ask_utilities" },
    { say: "¿La luz está incluida?", intent: "ask_utilities", slots: { utility: "electricity" } },
    { say: "¿Cuánto es el depósito?", intent: "ask_deposit" },
    { say: "¿Por cuánto tiempo es el contrato?", intent: "ask_lease" },
    { say: "¿Está amueblado?", intent: "ask_furnished" },
    { say: "¿Se aceptan mascotas?", intent: "ask_pets" },
    { say: "¿Cuándo puedo mudarme?", intent: "ask_movein" },
    { say: "¿Necesito aval?", intent: "ask_aval" },
    { say: "¿Me puede bajar un poco la renta?", intent: "ask_lower" },
    { say: "¿Hay estacionamiento?", intent: "ask_parking" },
    { say: "¿Dónde puedo lavar la ropa?", intent: "ask_laundry" },
    { say: "¿Es un edificio tranquilo?", intent: "ask_quiet" },
    { say: "¿Hay una parada de colectivo cerca?", intent: "ask_bus" },
    { say: "¿En qué piso está?", intent: "ask_floor" },
    { say: "¿Hay elevador?", intent: "ask_floor" },
    { say: "¿Puedo ver la recámara?", intent: "ask_see" },
    { say: "¿Cuándo se paga la renta?", intent: "ask_payrent" },
    { say: "Creo que es todo", intent: "no_more", step: "questions" },
    { say: "No, es todo, gracias", intent: "no_more", step: "questions" },
    { say: "¡Me lo quedo!", intent: "take" },
    { say: "Me gustaría rentarlo", intent: "take" },
    { say: "Lo tengo que pensar", intent: "think" },
    { say: "¿Le puedo avisar mañana?", intent: "think" },
    { say: "Está un poco caro para mí", intent: "too_x", step: "decision" },
    { say: "Creo que no es para mí", intent: "decline", not: ["take"] },
    { say: "Sí, le llamo hoy en la noche", intent: "call_back" },
    { say: "Mejor me lo quedo de una vez", intent: "take" },
    { say: "El primero del mes, si se puede", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "El próximo mes", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "Lo antes posible", intent: "movein_ans_ctx", step: "movein_take" },
    { say: "Solo yo", intent: "people_ans", step: "people_q" },
    { say: "Con mi familia", intent: "people_ans", step: "people_q" },
    { say: "Somos dos", intent: "people_num_ctx", step: "people_q" },
    { say: "No, no tengo mascotas", intent: "no_pets", not: ["have_pet"] },
    { say: "Tengo un gato", intent: "have_pet", slots: { pet: "cat" } },
    { say: "Un perro chico", intent: "have_pet", step: "pets_q", slots: { pet: "dog" } },
    { say: "Aquí tiene mi pasaporte", intent: "here_you_go", step: "docs" },
    { say: "¿Le sirve mi pasaporte?", intent: "passport_ok" },
    { say: "Aquí tiene", intent: "here_you_go", step: "docs" },
    { say: "Tengo una carta de mi trabajo", intent: "have_job" },
    { say: "No, no tengo aval", intent: "aval_none", not: ["aval_yes"] },
    { say: "Sí, tengo aval", intent: "aval_yes" },
    { say: "¿Qué es un aval?", intent: "ask_aval" },
    { say: "¿Puedo dejar dos meses de depósito?", intent: "aval_deposit" },
    { say: "¿Hay otra opción?", intent: "ask_poliza" },
    { say: "¿Qué es una póliza jurídica?", intent: "ask_poliza" },
    { say: "Claro. ¿Dónde firmo?", intent: "where_sign", step: "sign" },
    { say: "¿Lo puedo leer primero?", intent: "read_first" },
    { say: "¿Me da una copia?", intent: "copy" },
    { say: "El aire acondicionado no funciona", intent: "report_problem", slots: { fix: "ac" } },
    { say: "La llave de la cocina gotea", intent: "report_problem", slots: { fix: "faucet" } },
    { say: "No hay agua caliente", intent: "report_problem" },
    { say: "Hay un problema con el baño", intent: "report_problem" },
    { say: "¿Puede mandar a alguien a arreglarlo?", intent: "fix_request" },
    { say: "Sí, voy a estar en casa", intent: "home_yes", step: "visit" },
    { say: "No, voy a estar trabajando", intent: "at_work", step: "visit", not: ["home_yes"] },
    { say: "Mañana a las diez está bien", intent: "time_ok", step: "visit" },
    { say: "Sí, puede usar su llave", intent: "use_key" },
    { say: "¿Puede venir después de las cinco?", intent: "time_pref" },
    { say: "El sábado es mejor", intent: "time_pref", step: "visit" },
    { say: "En la tarde, por favor", intent: "time_pref", step: "visit" },
    // natural alternatives, short answers, tú to the landlord, no accents
    { say: "Vi su anuncio en internet", intent: "see_apartment" },
    { say: "Quiero rentar el departamento", intent: "see_apartment", step: "purpose" },
    { say: "Soy Ryan", intent: "intro_name_ctx", step: "purpose" },
    { say: "cuanto cuesta al mes", intent: "ask_rent" },
    { say: "¿Tengo que pagar el gas?", intent: "ask_utilities", slots: { utility: "gas" } },
    { say: "¿Incluye internet?", intent: "ask_utilities", slots: { utility: "internet" } },
    { say: "¿Tiene clima?", intent: "ask_appliance", slots: { appliance: "ac" } },
    { say: "¿Hay microondas?", intent: "ask_appliance", slots: { appliance: "microwave" } },
    { say: "¿Me puedes bajar la renta?", intent: "ask_lower" },
    { say: "¿Me lo deja en trece mil?", intent: "ask_lower", slots: { price: 1300000 } },
    { say: "¿Puedo rentarlo por seis meses?", intent: "ask_lease" },
    { say: "¿Está lejos del centro?", intent: "ask_bus" },
    { say: "¿Cuántos metros cuadrados tiene?", intent: "ask_size" },
    { say: "Sí, tengo unas preguntas", intent: "have_questions", step: "questions" },
    { say: "No tengo más preguntas", intent: "no_more", step: "questions" },
    { say: "Me gusta, pero lo tengo que pensar", intent: "think", step: "decision", not: ["take", "like_it"] },
    { say: "Necesito hablar con mi esposa", intent: "think" },
    { say: "Tal vez", intent: "think_ctx", step: "decision" },
    { say: "Tal vez", intent: "none" },
    { say: "Para diciembre", intent: "movein_ans_ctx", step: "movein_q" },
    { say: "Mi esposo y yo", intent: "people_ans", step: "people_q" },
    { say: "Tres personas", intent: "people_num_ctx", step: "people_q" },
    { say: "Pasaporte", intent: "id_ctx", step: "docs" },
    { say: "Todavía no tengo trabajo", intent: "no_job", not: ["have_job"] },
    { say: "No conozco a nadie aquí", intent: "aval_none_ctx", step: "aval" },
    { say: "Mi jefe puede ser mi aval", intent: "aval_yes" },
    { say: "El clima no enfría", intent: "report_problem", slots: { fix: "ac" } },
    { say: "Se fue la luz", intent: "report_problem" },
    { say: "Más o menos", intent: "have_problem", step: "problem" },
    { say: "A las diez no puedo", intent: "time_bad", step: "visit", not: ["time_ok"] },
    // Spain forms are correct (no tip)
    { say: "¿Cuánto es el alquiler?", intent: "ask_rent" },
    { say: "¿Cuánto es la fianza?", intent: "ask_deposit" },
    { say: "¿Dónde puedo aparcar el coche?", intent: "ask_parking" },
    { say: "Vengo a ver el piso", intent: "see_apartment" },
    { say: "Vale, me lo quedo", intent: "take", step: "decision" },
    // meaning must not flip
    { say: "No me lo quedo", intent: "decline", step: "decision", not: ["take"] },
    { say: "No quiero rentarlo", intent: "decline", not: ["take"] },
    { say: "No me interesa", intent: "decline", step: "decision", not: ["take"] },
    { say: "No tengo gato", intent: "no_pets", step: "pets_q", not: ["have_pet"] },
    { say: "Soy alérgica a los gatos", intent: "no_pets", not: ["have_pet"] },
    { say: "No voy a estar en casa", intent: "at_work", step: "visit", not: ["home_yes", "time_pref"] },
    { say: "El clima funciona bien", intent: "all_good", step: "problem", not: ["report_problem"] },
    { say: "No hay ningún problema", intent: "all_good", step: "problem", not: ["report_problem", "have_problem"] },
    { say: "No tengo carta de trabajo", intent: "no_job", not: ["have_job"] },
    { say: "No tengo fiador", intent: "aval_none", not: ["aval_yes"] },
    { say: "No quiero dejar dos meses de depósito", intent: "none", not: ["aval_deposit"] },
    { say: "No necesito estacionamiento", intent: "none", not: ["ask_parking"] },
    { say: "No está caro", intent: "price_ok", step: "decision", not: ["too_x", "decline"] },
    { say: "No voy a firmar todavía", intent: "sign_later", step: "sign", not: ["here_you_go", "where_sign"] },
    { say: "La llave no gotea", intent: "none", step: "problem", not: ["report_problem"] },
    // "¿Cómo va todo?" answered like "¿Cómo está?"
    { say: "Bien, gracias", intent: "g_howareyou_answer", step: "problem" },
    // review: replies, hedges and corrections (blind set and probes)
    { say: "No sé si me lo quedo", intent: "think", step: "decision", not: ["take"] },
    { say: "No sé si me interesa", intent: "think", step: "decision", not: ["take"] },
    { say: "No es todo, tengo otra pregunta", intent: "have_questions", step: "questions", not: ["no_more"] },
    { say: "No, es todo", intent: "no_more", step: "questions", not: ["have_questions"] },
    { say: "¿Cuánto hay que dejar de depósito?", intent: "ask_deposit" },
    { say: "Vi el anuncio del departamento en renta", intent: "see_apartment" },
    { say: "Sí, hablamos ayer por teléfono", intent: "see_apartment", step: "purpose" },
    { say: "Primero quiero leerlo", intent: "read_first", step: "sign", not: ["where_sign", "here_you_go"] },
    { say: "No quiero firmar sin leerlo", intent: "read_first", step: "sign", not: ["where_sign", "here_you_go"] },
    { say: "No tengo trabajo aquí todavía", intent: "no_job", step: "docs", not: ["have_job"] },
    { say: "No, nada", intent: "nothing_ctx", step: "problem", not: ["report_problem"] },
    { say: "¿Hay mucho ruido?", intent: "ask_quiet" },
    { say: "¿Está vacío?", intent: "ask_furnished" },
    { say: "¿Quién paga el agua?", intent: "ask_utilities", slots: { utility: "water" } },
    // lead's check: numbers, money and refusals
    { say: "¿Son dos meses de depósito?", intent: "ask_deposit", not: ["ask_rent"] },
    { say: "¿Seis meses?", intent: "ask_lease", not: ["ask_rent"] },
    { say: "Quiero rentarlo por seis meses", intent: "ask_lease", step: "decision", not: ["take"] },
    { say: "Me lo quedo por un año", intent: "take", step: "decision" },
    { say: "¿El agua no está incluida?", intent: "ask_utilities", slots: { utility: "water" } },
    { say: "¿Puedo tener dos gatos?", intent: "ask_pets", slots: { pet: "cat" } },
    { say: "Tengo tres gatos", intent: "have_pet", step: "pets_q", slots: { pet: "cat" } },
    { say: "No tengo a nadie que pueda ser mi aval", intent: "aval_none", step: "aval", not: ["aval_yes", "aval_yes_ctx"] },
    { say: "Mi jefe no puede ser mi aval", intent: "none", step: "aval", not: ["aval_yes", "aval_yes_ctx"] },
    { say: "No, prefiero la póliza", intent: "poliza_yes_ctx", step: "aval", not: ["aval_yes", "aval_deposit"] },
    { say: "Sí, puedo pagar los veintiocho mil", intent: "aval_deposit", step: "aval", slots: { price: 2800000 } },
    { say: "¿Quién la paga?", intent: "ask_poliza" },
    { say: "No quiero firmar", intent: "sign_later", step: "sign", not: ["where_sign", "here_you_go", "sign_here_ctx"] },
    { say: "¿Puedo firmar mañana?", intent: "sign_later", step: "sign", not: ["where_sign", "here_you_go"] },
    { say: "Mañana a las diez no puedo", intent: "time_bad", step: "visit", not: ["time_ctx", "time_pref", "time_ok", "home_yes"] },
    { say: "A las diez no está bien", intent: "time_bad", step: "visit", not: ["time_ctx", "time_ok"] },
    // audit (5 Nov): the town, side questions, the póliza, a compliment and an if at the decision
    { say: "¿Cómo llego al centro?", intent: "ask_bus" },
    { say: "¿A cuántas cuadras está la playa?", intent: "ask_bus" },
    { say: "¿Dónde pasa el camión?", intent: "ask_bus" },
    { say: "¿Hay una farmacia cerca?", intent: "ask_shops" },
    { say: "¿Dónde está el súper?", intent: "ask_shops" },
    { say: "¿Se ve el mar?", intent: "ask_balcony" },
    { say: "No se ve el mar", intent: "none", not: ["ask_balcony"] },
    { say: "¿Hay gas?", intent: "ask_utilities", not: ["ask_unknown"] },
    { say: "¿Hay ventiladores?", intent: "ask_appliance", slots: { appliance: "fan" } },
    { say: "¿Cuánto es?", intent: "ask_rent", step: "questions" },
    { say: "¿Cuánto es en total para entrar?", intent: "ask_deposit", step: "questions" },
    { say: "¿Puedo cancelar el contrato antes?", intent: "ask_break" },
    { say: "¿Qué pasa si me voy antes del año?", intent: "ask_break", not: ["decline"] },
    { say: "¿Qué pasa si no tengo aval?", intent: "aval_none", step: "questions", not: ["aval_yes"] },
    { say: "¿Cómo funciona la póliza?", intent: "ask_poliza" },
    { say: "No firmo", intent: "sign_later", step: "sign", not: ["where_sign", "here_you_go"] },
    { say: "No traigo identificación", intent: "no_id", step: "docs", not: ["here_you_go", "id_ctx", "passport_ok"] },
    { say: "Se me olvidó el pasaporte", intent: "no_id", step: "docs", not: ["here_you_go", "id_ctx"] },
    { say: "¿Le sirve mi tarjeta de residente?", intent: "passport_ok", step: "docs" },
    { say: "Me encanta", intent: "like_it", step: "decision", not: ["take"] },
    { say: "¿Qué es eso?", intent: "what_ctx", step: "aval", not: ["aval_yes", "aval_none"] },
    // not understood
    { say: "Mi perro toca la guitarra", intent: "none" },
    { say: "plátano ventana azul", intent: "none" },
    { say: "Ayer comí tacos en la playa", intent: "none" },
    { say: "Ryan", intent: "none" },
  ],

  sims: [
    // A viewing on every seed. With no ID request, "Aquí tiene mi pasaporte." comes while Don Ernesto holds out the
    // lease: he takes it, and the lease is signed only at "¿Dónde firmo?".
    { name: "view, ask the key terms, take it", turns: ["Hola, vengo a ver el departamento.", "¿Cuánto es la renta?", "¿Están incluidos los servicios?", "¿Hay estacionamiento?",
      "No, es todo, gracias.", "¡Me lo quedo!", "Aquí tiene mi pasaporte.", "¿Dónde firmo?", "¡Gracias, hasta luego!"], expect: { complete: true, state: { decision: "take", signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; } },
    // The someone-else twist: "Sí, le llamo hoy en la noche." answers "¿Me puede avisar hoy en la noche?"
    { name: "many questions, then think about it (someone else is coming)", turns: ["¡Hola! ¿Todavía está disponible el departamento?", "¿Está amueblado?", "¿Se aceptan mascotas?", "¿La luz está incluida?",
      "¿Por cuánto tiempo es el contrato?", "¿Me puede bajar un poco la renta?", "Lo tengo que pensar.", "Sí, le llamo hoy en la noche.", "Gracias, hasta luego."], expect: { complete: true, state: { decision: "think", hurryDone: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.otherApplicant = true; s.avalTwist = false; } },
    // Don Ernesto asks all his questions (move-in, people, pets) and for an ID: each short answer has its question.
    { name: "short answers", turns: ["¡Hola!", "Sí.", "El próximo mes.", "No.", "Dos.", "Sí.", "Un gato.", "¿Cuánto cuesta?", "¿Y el depósito?", "Es todo.", "Me lo quedo.", "Sí.", "Tome.", "Listo.", "¡Adiós!"],
      expect: { complete: true, state: { signed: true, petsKnown: true, peopleKnown: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.greetKind = "must"; s.askMovein = true; s.askPeople = true; s.askPets = true; s.askDocs = true; s.avalTwist = false; } },
    // No ID request: the passport handed over at the lease is taken, and the bare "Sí." signs.
    { name: "passport offered at the lease", turns: ["Hola, vengo a ver el departamento.", "¿Cuánto es la renta?", "No, es todo, gracias.", "¡Me lo quedo!", "El próximo mes.", "Aquí tiene mi pasaporte.",
      "Sí.", "Gracias, hasta luego."], expect: { complete: true, state: { signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.askMovein = false; s.askPeople = false; s.askPets = false; s.askDocs = false; s.avalTwist = false; } },
    // Questions and a change of mind: think first, then take it after all, read the lease and get a copy.
    { name: "questions, a change of mind, read the lease first", turns: ["Buenas tardes, vi su anuncio en internet.", "¿Tengo que pagar el gas?", "¿Tiene clima?", "¿Dónde puedo lavar la ropa?",
      "¿Está lejos del centro?", "Lo voy a pensar.", "¿Sabe qué? Mejor me lo quedo de una vez.", "Para diciembre.", "¿Lo puedo leer primero?", "¿Me da una copia?", "Claro. ¿Dónde firmo?", "Muchas gracias."],
      expect: { complete: true, state: { decision: "take", signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.otherApplicant = false; s.avalTwist = false; s.askDocs = false; } },
    // The aval twist: no guarantor, two months' deposit accepted.
    { name: "no guarantor: two months' deposit (aval twist)", turns: ["Hola, vengo a ver el departamento.", "¿Cuánto es la renta?", "No, es todo, gracias.", "¡Me lo quedo!", "El primero del mes, si se puede.",
      "Aquí tiene mi pasaporte.", "No, no tengo aval.", "Sí, está bien.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { aval: "deposit", depositMonths: 2, signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // The aval twist: what's an aval, no to the extra deposit, the póliza after asking about it.
    { name: "no guarantor: the póliza jurídica (aval twist)", turns: ["Vengo por el departamento que se renta.", "No, es todo.", "Me lo quedo.", "Lo antes posible.", "Aquí tiene.",
      "¿Qué es un aval?", "No tengo, acabo de llegar.", "No, es mucho dinero.", "¿Cuánto cuesta la póliza?", "Sí, me parece bien.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { aval: "poliza", depositMonths: 1, signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // The aval twist: neither the extra deposit nor the póliza: no lease for now.
    { name: "no guarantor, no deal for now (aval twist)", turns: ["Vengo a ver el departamento.", "No, es todo.", "Me lo quedo.", "El próximo mes.", "Aquí tiene mi pasaporte.", "No, no tengo aval.",
      "No quiero dejar dos meses de depósito.", "No, gracias.", "Gracias, hasta luego."],
      expect: { complete: true, state: { aval: "none", decision: "think", depositMonths: 1 } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; s.otherApplicant = false; } },
    // The aval twist with a guarantor (said early, while asking questions).
    { name: "a guarantor of her own (aval twist)", turns: ["Vengo a ver el departamento.", "¿Necesito aval?", "Sí, tengo aval.", "Es todo.", "Me lo quedo.", "El próximo mes.", "Aquí tiene mi pasaporte.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { aval: "yes", signed: true } }, auto: omit(["questions", "decision", "movein_take", "docs", "sign"]),
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // "¡Me lo quedo!" before the terms: he says the rent, deposit and lease first and asks again.
    { name: "takes it before hearing the terms", turns: ["Hola, vengo a ver el departamento.", "¡Me lo quedo!", "Sí, me lo quedo.", "El próximo mes.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { decision: "take", signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // Haggling at the decision is not a refusal; "No tengo aval, pero mi jefe puede firmar" is a guarantor.
    { name: "haggles, then a guarantor after all (aval twist)", turns: ["Vengo a ver el departamento.", "Es todo.", "Está un poco caro, ¿me puede bajar la renta?", "Bueno, me lo quedo.",
      "El próximo mes.", "Aquí tiene mi pasaporte.", "No tengo aval, pero mi jefe puede firmar.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { decision: "take", aval: "yes", depositMonths: 1, signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // The tenant twist: at work and ten doesn't suit in one sentence (one question back), then the key.
    { name: "tenant: at work, then the landlord's key", turns: ["El aire no enfría.", "No, mañana no puedo, estoy en el trabajo.", "Puede usar su llave.", "Gracias."],
      expect: { complete: true, state: { problem: "ac", visitOk: true } }, auto: AUTO, setup: (s) => { s.mode = "problem"; } },
    // The tenant twist: a returning tenant reports a leak.
    { name: "tenant reports a leak", turns: ["¡Hola, Don Ernesto!", "Perdón que lo moleste, pero la llave de la cocina gotea.", "No, voy a estar trabajando.", "Sí, está bien.", "¡Gracias!"],
      expect: { complete: true, state: { problem: "faucet", visitOk: true } }, auto: AUTO, setup: (s) => { s.mode = "problem"; } },
    // The tenant twist: the AC, ten doesn't work, another time.
    { name: "tenant: the AC, another time for the repair", turns: ["Bien, pero el clima no enfría.", "A las diez no puedo.", "Después de las cinco, por favor.", "Muchas gracias."],
      expect: { complete: true, state: { problem: "ac", visitOk: true } }, auto: AUTO, setup: (s) => { s.mode = "problem"; } },
    // Lead's check. "Mañana a las diez no puedo" is never booked for tomorrow: he asks for another time.
    { name: "tenant: tomorrow at ten refused, Saturday instead", turns: ["El aire no enfría.", "Mañana a las diez no puedo.", "Mejor el sábado.", "Gracias."],
      expect: { complete: true, state: { problem: "ac", visitOk: true, visitAnswered: true } }, auto: AUTO, setup: (s) => { s.mode = "problem"; } },
    // "No, me lo quedo." (typed with its comma) to "¿Alguna otra pregunta?" takes it, after the terms.
    { name: "no more questions, I'll take it", turns: ["Vengo a ver el departamento.", "¿Cuánto es la renta?", "No, me lo quedo.", "Sí.", "El próximo mes.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { decision: "take", signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // Said aloud, "No me lo quedo" to "¿Alguna otra pregunta?" could be either: he asks, and the no declines.
    { name: "no me lo quedo said aloud: asked, then no", turns: ["Vengo a ver el departamento.", "¿Cuánto es la renta?", "No me lo quedo", "No.", "Gracias."],
      expect: { complete: true, state: { decision: "no" } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // A polite closing at "¿Le interesa?" takes nothing (asked again); a haggle inside "Me lo quedo" commits nothing.
    { name: "polite closing and a haggle at the decision", turns: ["Vengo a ver el departamento.", "No, es todo.", "Está bien, gracias.", "Me lo quedo, pero ¿me puede bajar la renta?",
      "No, gracias.", "Gracias."], expect: { complete: true, state: { decision: "no" } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // Audit (5 Nov): the town as the 3D town has it (five minutes to the centro, the way there, the pharmacy a block up,
    // the city bus in front of the gym), then thinking it over.
    { name: "the neighborhood: the centro, the pharmacy, the bus", turns: ["Vengo a ver el departamento.", "¿Está lejos del centro?", "¿Cómo llego al centro?", "¿Hay una farmacia cerca?",
      "¿Hay una parada de camión cerca?", "¿Tiene vista al mar?", "No, es todo.", "Lo voy a pensar.", "Gracias."], expect: { complete: true, state: { decision: "think" } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.otherApplicant = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // "Me gusta mucho." is a compliment, not a yes: he asks, and the yes takes it.
    { name: "a compliment at the decision, then yes", turns: ["Vengo a ver el departamento.", "No, es todo.", "Me gusta mucho.", "Sí.", "El próximo mes.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { decision: "take", signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // An if ("Si me lo quedo, ¿…?") and a typed "¡Está bien, gracias!" rent nothing; then thinking it over.
    { name: "an if and a typed polite closing take nothing", turns: ["Vengo a ver el departamento.", "No, es todo.", "Si me lo quedo, ¿cuándo me puedo mudar?", "¡Está bien, gracias!",
      "Lo voy a pensar.", "Gracias."], expect: { complete: true, state: { decision: "think", signed: undefined } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.otherApplicant = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // The aval twist: the options asked about before deciding (nothing recorded), then the póliza explained and priced.
    { name: "the aval options early, the póliza explained (aval twist)", turns: ["Vengo a ver el departamento.", "¿Qué pasa si no tengo aval?", "No, es todo.", "Me lo quedo.", "El próximo mes.",
      "Aquí tiene mi pasaporte.", "No, no tengo aval.", "No, es mucho dinero.", "¿Qué es una póliza jurídica?", "¿Cuánto cuesta?", "Sí, está bien.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { aval: "poliza", depositMonths: 1, signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = true; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // No ID with them: he sees to it later, and the lease is signed.
    { name: "no ID today", turns: ["Vengo a ver el departamento.", "No, es todo.", "Me lo quedo.", "El próximo mes.", "No traigo identificación.", "¿Dónde firmo?", "Gracias."],
      expect: { complete: true, state: { decision: "take", docsOk: true, signed: true } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = true; s.askMovein = false; s.askPeople = false; s.askPets = false; } },
    // A polite closing or a no at the lease signs nothing; thinking it over after all.
    { name: "nothing signed on a polite closing", turns: ["Vengo a ver el departamento.", "No, es todo.", "Me lo quedo.", "El próximo mes.", "Está bien, gracias.", "No, gracias.",
      "Lo voy a pensar.", "Gracias."], expect: { complete: true, state: { decision: "think", signed: undefined } }, auto: AUTO,
      setup: (s) => { s.mode = "view"; s.avalTwist = false; s.askDocs = false; s.askMovein = false; s.askPeople = false; s.askPets = false; s.otherApplicant = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function enter(c: Ctx, first = "come_in") {
  c.s.purpose = true;
  c.say(first);
  c.say("tour");
  if (c.s.tourExtra) c.say("tour_extra");
}

/** "¿Para cuándo lo necesita?" (optional before the questions, required after "Me lo quedo"). */
function askMovein(c: Ctx, optional: boolean) {
  c.say("ask_movein_q");
  c.expect({ id: optional ? "movein_q" : "movein_take", optional, expects: ["movein_ans_ctx", "ask_movein"], hints: ["movein"],
    suggest: [{ lt: "Say when you'd like to move in", hint: "movein" }],
    on: {
      movein_ans_ctx: (cc, sl, sg) => { apartment.handlers.movein_ans_ctx(cc, sl, sg); },
      ask_movein: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
      g_dontknow: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
    },
    yes: (cc) => { cc.s.moveinKnown = true; cc.say("movein_info"); },
    ask: optional ? undefined : (cc) => cc.say("ask_movein_q") });
}

function petAnswer(c: Ctx, pet?: string, plural = false) {
  if (pet === "cat") c.say(plural ? "pet_cats_ok" : "pet_cat_ok");
  else if (pet === "dog") c.say(plural ? "pet_dogs_ok" : "pet_dog_ok");
  else if (pet === "bigdog") c.say("pet_bigdog");
  else if (pet === "other") c.say("pet_other_ok");
  else c.say("pets_policy");
}

/** "Tengo dos gatos", "¿Se aceptan perros?": more than one of that pet ("Un perro y dos gatos": one dog, two cats). */
const petPlural = (c: Ctx, pet?: string) => {
  const stem = pet === "cat" ? "gat" : pet === "dog" ? "perr" : null;
  return !!stem && new RegExp(`\\b((dos|tres|cuatro|[2-4]) ${stem}|${stem}(os|itos|as)\\b)`).test(heard(c));
};

function peopleAnswer(c: Ctx, n: number) {
  if (n >= 4) c.say("people_small");
  else c.say("people_ack");
}

/** Who will live there, counted from the answer: "Mi esposa, mis dos hijos y yo" is four, "Con mi esposa y mis tres
 *  hijos" five, "Solo yo" one; "Con mi familia" (no number) counts as three. */
function headCount(h: string): number {
  const NUM: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  let n = 1; // the learner
  let family = false;
  for (const m of h.matchAll(/\b(?:(un|una|dos|tres|cuatro|cinco|[1-5])\s+)?(hijos|hijas|ninos|ninas|hijo|hija|bebe|esposa|esposo|pareja|novia|novio|amigo|amiga|mama|papa|hermana|hermano|familia)\b/g)) {
    const [, num, who] = m;
    if (who === "familia") { family = true; continue; }
    n += num ? NUM[num] ?? Number(num) : /s$/.test(who) ? 2 : 1;
  }
  if (/\b(los|las) dos\b/.test(h)) n = Math.max(n, 2);
  return family ? Math.max(n, 3) : n;
}

/** "Me lo quedo, pero ¿me puede bajar la renta?", "Lo quiero, pero tengo que hablarlo con mi esposa", "Me interesa, pero
 *  está un poco caro": a haggle or a hedge after "pero" never commits; that part's own piece answers. ("Me lo quedo,
 *  pero no tengo aval" or "…, pero primero quiero leer el contrato" still take it.) Nor does a shorter lease than the
 *  year ("Quiero rentarlo por seis meses": ask_lease says the minimum, and the question comes again). */
const takeButNot = (c: Ctx) => {
  const h = heard(c);
  return /\bpero\b.*\b(bajar\w*|rebaja\w*|descuento|negocia\w*|deja en|dejaria en|menos|caro|cara|chico|chica|pequen[oa]|lejos|dinero|presupuesto|alcanza|pensar\w*|hablar\w*|platicar\w*|consultar\w*|segur[oa]|decid\w*|otros)\b/.test(h)
    || /\bpor (un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|[1-9]|1[01]) mes(es)?\b|\bpor mes\b|\bmedio ano\b/.test(h)
    // "Si me lo quedo, ¿cuándo me puedo mudar?": the question after the if answers; nothing is taken
    || ifTake(c);
};

function take(c: Ctx) {
  if (!view(c)) { c.say("ack"); return; }
  if (c.s.decision === "take") { c.say("ack"); return; }
  // "Sí, me interesa." / "Quiero rentarlo." at the door: he shows the apartment first
  if (!c.s.purpose) { enter(c); return; }
  if (takeButNot(c)) return;
  // "Lo voy a pensar… ¿Sabe qué? Me lo quedo.": after no deal on the guarantor, the options are offered again
  if (c.s.aval === "none") { c.s.aval = undefined; c.s.depositQuoted = false; c.s.polizaOffered = false; c.s.avalNoneSaid = true; }
  c.s.purpose = true;
  c.s.qDone = true;
  // "¡Me lo quedo!" before the rent, deposit and lease were said: nothing binding before its terms (rule 3).
  // He says them, and the decision step asks again.
  if (!c.s.decision && CORE.some((k) => !c.s.asked[k])) {
    c.say("terms_first");
    c.s.termsHeard = c.heard; // "Me interesa, ¿cuánto es la renta?": the question's own answer isn't said twice
    for (const k of CORE.filter((x) => !c.s.asked[x])) { c.say(CORE_LINE[k], { rent: RENT }); c.s.asked[k] = true; }
    resume(c);
    return;
  }
  c.s.decision = "take";
  // after "¡Qué bueno que le gusta!" (the compliment, then the yes) never "¡Qué bueno que le gustó!" again
  if (c.s.likeAcked) (c as ConvCtx).conv.pushLine("take_ok", 0, {}); else c.say("take_ok");
  volunteer(c);
  resume(c);
}

/** A change of mind after the goodbye began ("Lo voy a pensar." → finish → "Mejor me lo quedo."): drop the closing
 *  question and ask the next open step again. */
function resume(c: Ctx) {
  if (!c.s.__finished) return;
  c.s.__finished = false;
  (c.expect as (p: unknown) => void)(null);
  for (const st of apartment.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

function decline(c: Ctx) {
  c.s.qDone = true;
  c.s.decision = "no";
  c.say("decline_ok");
}

/** A decline phrase heard. "No, me lo quedo" (its comma typed) and "No, mejor me lo quedo" take it. Said aloud, the
 *  comma is lost (rule 10): to another question ("¿Alguna otra pregunta?", "¿Me puede avisar hoy en la noche?") "No me
 *  lo quedo" could be "No, I'll take it" or "I won't take it", so he asks (`ambiguous`); at "¿Le interesa?" it's a no. */
function declineSaid(c: Ctx, ambiguous: boolean) {
  const h = heard(c);
  if (/^[\s¡¿]*no\s*([,.;!]\s*(mejor\s+)?|\s+mejor\s+)(si\s+)?me lo quedo\b/.test(h)) { take(c); return; }
  if (ambiguous && /^[\s¡¿]*no me lo quedo\b/.test(h)) { takeOrNot(c); return; }
  decline(c);
}

function takeOrNot(c: Ctx, line = "take_or_not") {
  c.s.qDone = true;
  c.say(line);
  c.expect({ id: "take_or_not", expects: ["take", "decline", "think", "think_ctx"], hints: ["decide"],
    suggest: [{ lt: "Say whether you'll take it", hint: "decide" }],
    on: {
      take: (cc) => { if (takeButNot(cc)) return false; take(cc); },
      decline: (cc) => { declineSaid(cc, false); },
      think: (cc) => { apartment.handlers.think(cc, {}, { intent: "think", slots: {}, tags: [] }); },
      think_ctx: (cc) => { apartment.handlers.think(cc, {}, { intent: "think", slots: {}, tags: [] }); },
    },
    yes: (cc) => { if (politeClosing(cc)) { takeOrNot(cc); return; } take(cc); },
    no: (cc) => decline(cc),
    ask: (cc) => cc.say("take_or_not") });
}

/** The aval question is open: the twist is on, the learner is taking it and hasn't settled it. */
const avalOpen = (c: Ctx) => view(c) && c.s.decision === "take" && !!c.s.avalTwist && !c.s.aval;

function sign(c: Ctx) {
  if (c.s.signed) { c.say("ack"); return; } // signed already: no second set of keys
  if (avalOpen(c)) { c.say("sign_soon"); return; } // the guarantor first
  c.s.signed = true;
  c.s.docsOk = true;
  c.event("sign", { doc: "lease" });
  c.say("keys");
  c.event("give", { item: "keys" });
}

function avalYes(c: Ctx) {
  c.s.avalAsked = true;
  c.s.aval = "yes";
  dropPending(c); // no open question about the deposit or the póliza is left
  c.say("aval_yes_ok");
}

/** No guarantor: first the extra month of deposit (quoted, then a yes), then the póliza. */
function avalNone(c: Ctx) {
  c.s.avalAsked = true;
  if (!c.s.avalNoneAck) { c.s.avalNoneAck = true; c.say("aval_none_ok"); }
  if (c.s.depositQuoted && !c.s.polizaOffered) { offerPoliza(c); return; }
  if (c.s.polizaOffered) { noDeal(c); return; }
  quoteDeposit(c);
}

function quoteDeposit(c: Ctx, line = "aval_deposit_q") {
  c.s.depositQuoted = true;
  c.say(line, { deposit: RENT * 2 });
  c.expect(depositPending());
}

/** An amount said with the extra deposit that isn't the two months ($28,000): "Puedo dejar veinte mil". */
const wrongAmount = (slots: Record<string, any>) => typeof slots.price === "number" && slots.price !== RENT * 2;

/** A yes to the extra deposit with its amount: only the amount he asked for agrees (rule 18). */
function depositAnswer(c: Ctx, slots: Record<string, any>) {
  if (wrongAmount(slots)) { c.say("aval_deposit_amount", { deposit: RENT * 2 }); c.expect(depositPending()); return; }
  acceptDeposit(c);
}

/** "Está bien, gracias" / "Ok, gracias" at a paid offer could be a yes or a polite no: the question again. */
const politeClosing = (c: Ctx) => /^\s*(esta bien|ok|okay|vale|bueno|asi esta bien)\b.*\bgracias\b/.test(heard(c));

function depositPending(): import("@/content/types").Pending {
  return { id: "extra_deposit", expects: ["aval_deposit", "aval_deposit_no_ctx", "amount_q_ctx", "ask_poliza", "poliza_yes_ctx", "aval_yes", "aval_yes_ctx"], hints: ["g_yesno", "extra_dep"],
    suggest: [{ lt: "Accept two months' deposit, or decline", hint: "g_yesno" }, { lt: "Ask about other options", hint: "extra_dep" }],
    on: {
      aval_deposit: (cc, sl) => depositAnswer(cc, sl), aval_deposit_no_ctx: (cc) => offerPoliza(cc), ask_poliza: (cc) => offerPoliza(cc),
      // "No, mejor la póliza.": the póliza is explained (who pays) and asked, never recorded unexplained
      poliza_yes_ctx: (cc) => offerPoliza(cc),
      amount_q_ctx: (cc) => { cc.say("aval_deposit_amount", { deposit: RENT * 2 }); cc.expect(depositPending()); },
      aval_yes: (cc) => avalYes(cc), aval_yes_ctx: (cc) => avalYes(cc),
    },
    yes: (cc) => { if (politeClosing(cc)) { cc.say("aval_deposit_reask"); cc.expect(depositPending()); return; } acceptDeposit(cc); },
    no: (cc) => offerPoliza(cc),
    ask: (cc) => cc.say("aval_deposit_reask") };
}

function acceptDeposit(c: Ctx) {
  c.s.aval = "deposit";
  c.s.depositMonths = 2;
  c.say("aval_deposit_ok");
}

function polizaPending(): import("@/content/types").Pending {
  return { id: "poliza", expects: ["ask_poliza", "amount_q_ctx", "aval_deposit", "aval_yes", "aval_yes_ctx", "poliza_yes_ctx", "poliza_no_ctx", "what_ctx"], hints: ["g_yesno", "extra_dep"],
    suggest: [{ lt: "Accept the policy, or decline", hint: "g_yesno" }],
    on: {
      ask_poliza: (cc) => { polizaAnswer(cc); cc.expect(polizaPending()); },
      what_ctx: (cc) => { cc.say("poliza_what"); cc.expect(polizaPending()); },
      amount_q_ctx: (cc) => { cc.say("poliza_price"); cc.expect(polizaPending()); },
      aval_deposit: (cc, sl) => depositAnswer(cc, sl), aval_yes: (cc) => avalYes(cc), aval_yes_ctx: (cc) => avalYes(cc),
      poliza_yes_ctx: (cc) => { cc.s.aval = "poliza"; cc.say("poliza_ok"); }, poliza_no_ctx: (cc) => noDeal(cc),
    },
    yes: (cc) => { if (politeClosing(cc)) { cc.say("poliza_reask"); cc.expect(polizaPending()); return; } cc.s.aval = "poliza"; cc.say("poliza_ok"); },
    no: (cc) => noDeal(cc),
    ask: (cc) => cc.say("poliza_reask") };
}

/** "¿Qué es una póliza jurídica?" / "¿Cómo funciona?" → what it is; "¿Cuánto cuesta?" → the price (it was just said
 *  that it's paid once); "¿Quién la paga?" and the rest → who pays and how often. */
function polizaAnswer(c: Ctx) {
  const h = heard(c);
  c.say(/\b(que es|como funciona)\b/.test(h) ? "poliza_what" : /\bcuanto\b/.test(h) ? "poliza_price" : "poliza_info");
}

function offerPoliza(c: Ctx) {
  c.s.polizaOffered = true;
  c.say("poliza_offer");
  c.expect(polizaPending());
}

/** Neither the extra deposit nor the póliza: no lease for now (nothing signed, nothing charged). */
function noDeal(c: Ctx) {
  c.s.aval = "none";
  c.s.avalNoneSaid = true;
  c.s.decision = "think";
  c.say("aval_no_deal");
}

function repairOpen(c: Ctx) { return c.s.mode === "problem" && !!c.s.problem && !c.s.visitOk; }

/** Close an open question without holding the turn (c.expect(null) would hold it, and the next step wouldn't be asked). */
function dropPending(c: Ctx) { const conv = (c as ConvCtx).conv; if (conv) conv.pending = null; }

/** "A las diez no estoy, pero puede usar su llave": the key part answers (use_key). */
const keyOffered = (c: Ctx) => /\b(llave|abrale|abrirle|dejelo (pasar|entrar))\b/.test(heard(c));

/** A refusal of a time: "no puedo", "no me queda", "no está bien"… */
const timeRefused = (c: Ctx) => /\bno (puedo|me queda|me conviene|estoy|voy a estar|estare|esta bien|me parece bien|me sirve)\b|\bmuy temprano\b/.test(heard(c));

/** The time he offered (tomorrow at ten) inside a refusal: "Mañana a las diez no puedo" heard as "Mañana" + "a las diez
 *  no puedo", "A las diez no está bien" as "A las diez" + …. */
const refusedTime = (c: Ctx, slots: Record<string, any> = {}) => timeRefused(c)
  && ((slots.time?.h === 10 && !slots.time?.m) || (slots.day === "tomorrow" && !slots.time) || (!slots.time && !slots.day));

/** Another time or day than tomorrow at ten: "…, ¿puede venir a las cinco?", "…, mejor el sábado". */
const timeOffered = (c: Ctx) => /\b(las|la) (?!diez\b|10\b)(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|once|doce|\d)|\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|pasado manana|fin de semana|mas tarde)\b|\b(en|por) la (tarde|noche)\b/.test(heard(c));

/** "No tengo aval, pero mi jefe puede firmar": a guarantor after all. */
const guarantorAfterAll = (c: Ctx) => /\bpero\b.*\b(jefe|jefa|empresa|amigo|amiga|conocido|conocida|puede firmar|puede ser mi aval)\b/.test(heard(c));

/** "¿Me puede avisar hoy en la noche?" answered with a think-phrase ("Le aviso mañana"): a promise for today is a
 *  yes, a later day is understood. */
function hurryAnswer(c: Ctx) {
  c.s.hurryDone = true;
  c.say(/\bmanana\b|\blunes\b|\bmartes\b|\bmiercoles\b|\bjueves\b|\bviernes\b|\bsabado\b|\bdomingo\b|proxima semana/.test(heard(c)) ? "understand" : "wait_call");
}

const taking = (c: Ctx) => view(c) && c.s.decision === "take";

function homeNo(c: Ctx) {
  c.s.visitAnswered = true;
  c.s.visitQ = c.heard;
  c.say("home_no"); c.say("key_ok_q");
  c.expect({ id: "key_ok", expects: ["use_key", "time_pref", "time_ctx", "time_bad"], hints: ["g_yesno", "key_ok"],
    suggest: [{ lt: "Agree to let him in", hint: "key_ok" }],
    on: {
      use_key: (cc) => { cc.say("key_done"); cc.s.visitOk = true; },
      time_pref: (cc, sl) => { timeNoted(cc, sl); cc.s.visitOk = true; },
      time_ctx: (cc, sl) => { if (refusedTime(cc, sl)) return false; timeNoted(cc, sl); cc.s.visitOk = true; },
      time_bad: (cc) => { if (timeOffered(cc)) return false; askOtherTime(cc); },
    },
    yes: (cc) => { cc.say("key_done"); cc.s.visitOk = true; },
    no: (cc) => { askOtherTime(cc); },
    ask: (cc) => cc.say("key_ok_q") });
}

/** "Muy bien, le digo que venga a esa hora / ese día." */
function timeNoted(c: Ctx, slots: Record<string, any> = {}) {
  c.say(slots.day && !slots.time && !/\b(tarde|noche|las|la una)\b/.test(heard(c)) ? "day_noted" : "time_noted");
}

/** "¿A qué hora le queda bien?" */
function askOtherTime(c: Ctx) {
  c.s.visitAnswered = true;
  c.s.visitQ = c.heard;
  c.say("other_time_q");
  c.expect({ id: "other_time", expects: ["time_pref", "time_ok", "time_ctx", "use_key"], hints: ["other_time"],
    suggest: [{ lt: "Suggest another time", hint: "other_time" }],
    on: {
      use_key: (c3) => { c3.say("key_done"); c3.s.visitOk = true; },
      time_pref: (c3, sl) => { timeNoted(c3, sl); c3.s.visitOk = true; },
      time_ok: (c3) => { if (timeRefused(c3)) return false; c3.say("home_yes_ok"); c3.s.visitOk = true; },
      time_ctx: (c3, sl) => { if (refusedTime(c3, sl)) return false; timeNoted(c3, sl); c3.s.visitOk = true; },
    },
    ask: (c3) => c3.say("other_time_q") });
}

export default apartment;
