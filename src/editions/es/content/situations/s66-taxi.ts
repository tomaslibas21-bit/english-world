// Song 66 "Keep the Change" → Puerto Colibrí: "¿Cuánto me cobra?"
// Don Rigo's taxi at the sitio (the taxi stand). Taxis here have no meter: you say where you're going and agree the
// fare before you get in, as on Mexico's Caribbean coast. The model for prices that are agreed (a fixed fare, a
// request for less), places ("al centro", "a la terminal" – the composer joins "a el" into "al"), where to stop,
// paying cash and keeping the change. Small talk: where are you from, is it your first time. After paying, the taxi
// takes the learner there (c.event("taxi-ride", { to: <location id> })). Mexican-only words have a neutral twin
// ("ahorita", "nomás", "prender el aire").
// Audit (5 Nov 2026): every place in town he drives to (the chips show the first eleven), places out of town (he
// doesn't go that far: the bus station, or a colectivo), the airport (the sitio stands next to it, at the east end of
// avenida Juárez: docs/es/TOWN.md "Getting around"), a second request for less, the bag, the change, dollars, no cash,
// paying before the ride, asking him back where he's from (docs/es/reviews/s66-taxi.md).

import type { Ctx, EntityDef, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";

// ---------------------------------------------------------------------------
// Places: Spanish head, English gloss, gender, location id, fare (cents of a peso). `def`: the definite article when it
// isn't el / la ("los Departamentos"); `more`: understood when said, but not one of the chips; `here`: no ride, it's
// right here (the airport, next to the sitio in the 3D town).

const D = (id: string, es: string, en: string, g: "m" | "f", loc: string, fare: number, forms: string[], extra: { def?: string; nat?: string; more?: boolean; here?: boolean; spain?: string; spainG?: "m" | "f" } = {}) =>
  // (the composer takes any article as `def`: "los", or "" for none; the type names only el / la)
  ent(id, es, en, g, { forms, art: "", ...(extra.def !== undefined ? { def: extra.def as EntityDef["def"] } : {}),
    attrs: { loc, fare, nat: extra.nat, ...(extra.more ? { more: true } : {}), ...(extra.here ? { here: true } : {}), ...(extra.spain ? { spain: extra.spain, spainG: extra.spainG } : {}) } });

const DESTS: EntityDef[] = [
  D("centro", "centro", "center", "m", "town-square", 10000, ["el centro", "zocalo", "el zocalo", "la plaza", "plaza principal", "la plaza principal", "centro del pueblo", "el centro del pueblo", "el kiosco", "kiosco"], { nat: "town center" }),
  D("hotel", "Hotel | Mar Azul", "Hotel | Blue Sea", "m", "hotel", 12000, ["hotel mar azul", "el hotel mar azul", "mar azul", "el mar azul", "hotel", "el hotel", "mi hotel"], { nat: "Hotel Mar Azul" }),
  D("aeropuerto", "aeropuerto", "airport", "m", "airport", 0, ["el aeropuerto", "aeropuerto de puerto colibri", "el aeropuerto de puerto colibri", "la terminal aerea"], { here: true }),
  D("terminal", "terminal", "bus station", "f", "station", 10000, ["la terminal", "terminal de autobuses", "la terminal de autobuses", "terminal de camiones", "la terminal de camiones", "la central", "central de autobuses", "la central de autobuses", "central camionera", "la central camionera", "la estacion", "estacion de autobuses", "la estacion de autobuses"]),
  D("playa", "playa", "beach", "f", "the-pier", 12000, ["la playa", "el malecon", "malecon"]),
  D("mercado", "mercado", "market", "m", "market", 10000, ["el mercado", "mercado municipal", "el mercado municipal"]),
  D("museo", "museo", "museum", "m", "museum", 12000, ["el museo", "museo de la costa maya", "el museo de la costa maya"]),
  D("cafe", "Café | La Ceiba", "Café | The Ceiba", "m", "sunny-cup", 10000, ["cafe la ceiba", "el cafe la ceiba", "la ceiba", "cafe", "el cafe", "la cafeteria", "cafeteria"], { nat: "Café La Ceiba" }),
  D("banco", "banco", "bank", "m", "bank", 10000, ["el banco", "banco del puerto", "el banco del puerto"]),
  D("farmacia", "farmacia", "pharmacy", "f", "pharmacy", 10000, ["la farmacia", "farmacia del puerto", "la farmacia del puerto"]),
  D("clinica", "clínica", "clinic", "f", "clinic", 12000, ["la clinica", "hospital", "el hospital", "clinica familiar", "la clinica familiar", "el doctor", "el medico", "centro de salud", "el centro de salud"]),
  D("renta", "renta | de | autos", "rental | of | cars", "f", "car-rental", 12000, ["la renta de autos", "renta de carros", "la renta de carros", "alquiler de autos", "el alquiler de autos", "alquiler de carros", "el alquiler de carros", "renta de autos colibri", "la renta de autos colibri"], { nat: "car rental", spain: "alquiler | de | coches", spainG: "m" }),
  // the rest of the town: he knows every corner
  D("correos", "oficina | de | correos", "office | of | mail", "f", "post-office", 10000, ["oficina de correos", "la oficina de correos", "correos", "el correo", "correo", "oficina postal", "la oficina postal"], { nat: "post office", more: true }),
  D("policia", "policía", "police", "f", "police", 10000, ["la policia", "policia municipal", "la policia municipal", "estacion de policia", "la estacion de policia", "comandancia", "la comandancia", "la delegacion", "delegacion"], { nat: "police station", more: true }),
  D("turismo", "oficina | de | turismo", "office | of | tourism", "f", "visitor-center", 10000, ["oficina de turismo", "la oficina de turismo", "informacion turistica", "la informacion turistica", "modulo de informacion", "el modulo de informacion", "modulo de informacion turistica", "el modulo de informacion turistica", "centro de visitantes", "el centro de visitantes"], { nat: "visitor center", more: true }),
  D("lucia", "Cocina | de | Lucía", "Kitchen | of | Lucía", "f", "trattoria", 10000, ["la cocina de lucia", "cocina de lucia", "el restaurante de lucia", "restaurante de lucia", "lucia"], { nat: "Cocina de Lucía", more: true }),
  D("muelle", "restaurante | El Muelle", "restaurant | The Pier", "m", "the-pier", 12000, ["restaurante el muelle", "el restaurante el muelle", "el muelle", "muelle", "el restaurante del muelle", "restaurante", "el restaurante"], { nat: "El Muelle restaurant", more: true }),
  D("palmas", "Departamentos | Las Palmas", "Apartments | The Palms", "m", "apartments", 12000, ["departamentos las palmas", "los departamentos las palmas", "las palmas", "edificio las palmas", "el edificio las palmas", "apartamentos las palmas", "los apartamentos las palmas", "mi departamento", "mi apartamento", "mi depa", "calle flamboyan", "la calle flamboyan"], { def: "los", nat: "Las Palmas apartments", more: true }),
  D("linea", "oficina | de | Línea Clara", "office | of | Línea Clara", "f", "office", 10000, ["linea clara", "oficina de linea clara", "la oficina de linea clara", "las oficinas de linea clara", "mi oficina", "mi trabajo"], { nat: "Línea Clara office", more: true }),
  D("gimnasio", "gimnasio", "gym", "m", "gym", 12000, ["el gimnasio", "gimnasio colibri", "el gimnasio colibri", "gym", "el gym"], { more: true }),
  D("iglesia", "iglesia", "church", "f", "town-square", 10000, ["la iglesia", "la parroquia", "parroquia", "el templo", "templo"], { more: true }),
  D("hilos", "Boutique | Hilos", "Boutique | Threads", "f", "threads", 10000, ["boutique hilos", "la boutique hilos", "hilos", "la tienda de ropa", "tienda de ropa", "la boutique"], { nat: "Boutique Hilos", more: true }),
  D("estetica", "estética", "salon", "f", "salon", 10000, ["la estetica", "estetica tijeras", "la estetica tijeras", "salon de belleza", "el salon de belleza", "la peluqueria", "peluqueria"], { nat: "hair salon", more: true }),
  D("gasolinera", "gasolinera", "gas station", "f", "gas-station", 10000, ["la gasolinera", "gasolinera el faro", "la gasolinera el faro"], { nat: "gas station", more: true }),
  D("brotecito", "oficina | de | Brotecito", "office | of | Brotecito", "f", "sproutly", 10000, ["brotecito", "el brotecito", "oficina de brotecito", "la oficina de brotecito"], { nat: "Brotecito office", more: true }),
];
/** The places shown as chips (the others are understood when said). */
const CHIPS = DESTS.filter((d) => !d.attrs?.more && !d.attrs?.here).map((d) => d.id);

/** Out of town: he doesn't go that far. A city: the bus station (s67a sells the tickets); the cenote, the ruins and the
 *  beaches up the highway: a colectivo (s62, s69). */
const FAR: EntityDef[] = [
  ent("tulum", "Tulum", "Tulum", "m", { forms: ["tulum"], attrs: { bus: true } }),
  ent("playadc", "Playa del Carmen", "Playa del Carmen", "f", { forms: ["playa del carmen", "playa carmen"], attrs: { bus: true } }),
  ent("cancun", "Cancún", "Cancún", "m", { forms: ["cancun"], attrs: { bus: true } }),
  ent("merida", "Mérida", "Mérida", "f", { forms: ["merida"], attrs: { bus: true } }),
  ent("chetumal", "Chetumal", "Chetumal", "m", { forms: ["chetumal"], attrs: { bus: true } }),
  ent("bacalar", "Bacalar", "Bacalar", "m", { forms: ["bacalar"], attrs: { bus: true } }),
  ent("valladolid", "Valladolid", "Valladolid", "m", { forms: ["valladolid"], attrs: { bus: true } }),
  ent("chichen", "Chichén Itzá", "Chichén Itzá", "m", { forms: ["chichen itza", "chichen"], attrs: { bus: true } }),
  ent("cenote", "cenote", "cenote", "m", { forms: ["el cenote", "cenote kaan", "el cenote kaan", "los cenotes"] }),
  // the ruins on the point past the beach: half an hour on foot along the beach (s69)
  ent("ruinas", "ruinas", "ruins", "f", { forms: ["las ruinas", "zona arqueologica", "la zona arqueologica"], attrs: { walk: true } }),
  ent("xcacel", "Xcacel", "Xcacel", "f", { forms: ["xcacel", "la playa de xcacel"] }),
  ent("chemuyil", "Chemuyil", "Chemuyil", "m", { forms: ["chemuyil"] }),
  ent("akumal", "Akumal", "Akumal", "m", { forms: ["akumal"] }),
];

/** Where the learner may say they're from (small talk). */
const COUNTRIES: EntityDef[] = [
  ent("usa", "Estados Unidos", "the United States", "m", { forms: ["los estados unidos", "usa", "eu", "e u", "america"], attrs: { far: true } }),
  ent("canada", "Canadá", "Canada", "m", { forms: ["canada"] }),
  ent("uk", "Inglaterra", "England", "f", { forms: ["inglaterra", "el reino unido", "reino unido", "londres", "escocia", "gales"] }),
  ent("ireland", "Irlanda", "Ireland", "f", { forms: ["irlanda"] }),
  ent("australia", "Australia", "Australia", "f", { forms: ["australia"] }),
  ent("nz", "Nueva Zelanda", "New Zealand", "f", { forms: ["nueva zelanda", "nueva zelandia"] }),
  ent("lithuania", "Lituania", "Lithuania", "f", { forms: ["lituania"] }),
];
/** "Soy inglesa": the nationality's tag names the country. */
const NATIONALITY_TAGS = ["usa", "canada", "uk", "ireland", "australia", "nz", "lithuania"];

const byId = (id: string) => DESTS.find((e) => e.id === id);
const baseFare = (c: Ctx) => (byId(c.s.dest)?.attrs?.fare ?? 0) as number;
const fareOf = (c: Ctx) => (c.s.price ?? baseFare(c)) as number;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** A place said with words around it that no pattern covers ("Al aeropuerto, ya voy tarde"): the longest name in it. */
function placeIn(heard: string): { id: string; far: boolean } | undefined {
  const h = ` ${fold(heard)} `;
  let best: { id: string; far: boolean; n: number } | undefined;
  for (const [list, far] of [[DESTS, false], [FAR, true]] as const) for (const e of list) {
    for (const name of [e.en.split(" | ").join(" "), ...(e.forms ?? [])]) {
      const n = fold(name);
      if (n.length >= 4 && h.includes(` ${n} `) && (!best || n.length > best.n)) best = { id: e.id, far, n: n.length };
    }
  }
  return best;
}
/** Words after "a / al / a la" that are no place ("al final", "a la vuelta"). */
const NOT_PLACES = new Set(["final", "rato", "ratito", "llegar", "ver", "vuelta", "derecha", "izquierda", "orden", "mejor", "lo mejor", "tiempo", "fin", "menos", "mismo", "lado", "contrario", "rato mas"]);
/** "¿Y usted?" after where they're from: he answers it. */
const askedBack = (heard: string) => /\b(y usted|usted de donde|y tu)\b/.test(fold(heard));
const seg0 = (intent: string, slots: Record<string, unknown> = {}): Segment => ({ intent, slots, tags: [] });

const TAXI_AUTO: Record<string, string> = {
  dest: "Al centro, por favor", fare: "Sí, está bien", haggle: "Está bien", from: "Soy de Estados Unidos", first: "Sí, es mi primera vez",
  ac: "Sí, por favor", stop: "Aquí está bien", pay: "Aquí tiene", far_terminal: "Sí, por favor",
};

// ---------------------------------------------------------------------------

export const taxi: SituationDef = {
  id: "s66-taxi",
  song: 66,
  songTitle: "Keep the Change",
  title: { en: "¿Cuánto me cobra?", lt: "How much do you charge?" },
  topic: { en: "En taxi", lt: "Taking a taxi" },
  chapter: 1,
  order: 3,
  location: "taxi-stand",
  npc: "vinnie",
  goal: "Tell the driver where you're going, agree the fare before you get in, say where to stop, and pay.",
  intro: "The taxi stand (el sitio) at the east end of the main street, by the airport. Taxis here have no meter: you say where you're going and agree the price first. Don Rigo knows every corner of town.",
  entities: { dest: DESTS, far: FAR, country: COUNTRIES },

  grammar: {
    macros: {
      to: "(a | al | a la | hasta | hacia)",
      take_me: "(me lleva | me puede llevar | me podria llevar | lleveme | me llevas #tip:tu_staff | llevame #tip:tu_staff | voy | quiero ir | necesito ir | quisiera ir | tengo que ir | vamos | voy para)",
      // "¿y usted?" after where they're from
      back: "(y usted | y usted de donde es | usted de donde es | y tu #tip:tu_staff)",
      cash_word: "(efectivo | pesos | dinero | billetes)",
    },
  },

  intents: {
    dest: { patterns: [
      "@to {dest} #h:d_to", "@take_me @to {dest} #h:d_take", "@take_me {dest}", "(voy | vamos | necesito ir | quiero ir) @to {dest} #h:d_need",
      "[es] @to {dest}", "{dest}", "para {dest}", "(al | a la) {dest} por favor", "(quiero | necesito) (tomar | agarrar) un taxi @to {dest}",
      // a change of mind or a correction: the place after "mejor" / "sino" is the answer
      "mejor @to {dest}", "@to {dest} mejor", "(mejor | siempre no) (me lleva | lleveme | vamos) @to {dest}",
      "no @to {wrong:dest} [sino] [mejor] @to {dest}", "(cambie de opinion | cambié de opinion) @to {dest}",
    ] },
    dest_far: { patterns: [
      "@to {far}", "@take_me @to {far}", "@take_me {far}", "{far}", "para {far}", "mejor @to {far}",
      "cuanto (me cobra | cobra | es | seria | cuesta | sale) (@to | hasta) {far}", "(me lleva | me puede llevar) hasta {far}",
    ] },
    ask_free: { patterns: [
      "(esta | anda) (libre | disponible | desocupado | trabajando)", "(me | nos) (lleva | puede llevar | podria llevar)",
      "(necesito | quiero | busco) un taxi", "taxi", "(puedo | podemos) (subir | subirme | subirnos)",
    ] },
    ask_fare: { patterns: [
      "cuanto (me cobra | cobra | es | seria | sera | cuesta | sale | va a ser | me va a cobrar) [@to {dest}] #h:f_cuanto", "cuanto (me cobra | cobra | es | cuesta | sale) hasta {dest}",
      "en cuanto (me lleva | sale | me deja) [@to {dest}]", "cuanto (es | cuesta | sale) (el viaje | el taxi | la tarifa | ir) [@to {dest}]",
      "@take_me @to {dest} cuanto (me cobra | es | seria | cuesta)", "que precio [tiene | es] [@to {dest}]", "cual es el precio [@to {dest}]",
      "cuanto me cobras #tip:tu_staff", "cuanto (le debo | le doy | le pago | es todo)", "cuanto (me dijo | dijo)",
      "(son | es | eran | dijo) {price} [pesos] (verdad | no | cierto)", "cuanto cobra por llevarme @to {dest}",
    ] },
    ask_fixed: { patterns: [
      "(es | tiene) (tarifa fija | precio fijo)", "(el precio | la tarifa) es (fijo | fija)", "(es | son) (precio fijo | tarifa fija)",
      "(usa | tiene | trae | pone | prende) [el] taximetro", "(no)? hay taximetro", "(se puede | puedo) (regatear | negociar) [el precio]",
    ] },
    accept: { patterns: [
      "(esta bien | de acuerdo | perfecto | va | sale | ok | orale | andale | vale | bueno) #h:f_ok", "(si | ok | va | sale | bueno | perfecto) vamos",
      "(esta bien | de acuerdo) vamos #h:f_ok", "vamonos", "me parece (bien | justo | razonable)", "si esta bien", "(si | ok) me parece bien",
      "(esta bien | me parece bien) el precio", "trato hecho",
    ] },
    // "Así está bien" at the fare: it's fine as it is (elsewhere a polite no, or keep the change)
    accept_ctx: { patterns: [
      "asi esta bien", "esta bien asi", "asi esta perfecto",
      "[en | por] {price} [pesos] (esta bien | me parece bien | va | sale | perfecto | de acuerdo)", "(esta bien | va | sale | perfecto | de acuerdo) [en | por] {price} [pesos]",
    ] },
    // a bare price at the fare: the learner names one (less is asking for less)
    price_ctx: { patterns: ["[y] [en | por] {price} [pesos]"] },
    haggle: { patterns: [
      "(me lo | me la) deja (mas barato | en menos | mas baratito) #h:f_haggle",
      "(me lo | me la | lo | la) (deja | puede dejar | podria dejar | da | puede dar) (en | por) {price} [pesos]",
      "(no)? (me lo | me la | lo | la) (deja | puede dejar | podria dejar | da | puede dar) (mas barato | en menos | un poco mas barato | mas baratito)",
      "(me hace | hay | me da | me puede hacer | me podria hacer | no me hace) [un | algun] (descuento | descuentito)",
      "(es | esta) (muy | demasiado | un poco)? (caro | mucho)", "(que | muy) caro", "(por que | porque) (tan | es tan | esta tan) caro", "es mucho [dinero]",
      "(mas barato | menos | un poco menos | mas baratito)", "(no hay | no tiene) [algo] mas barato",
      "(que tal | y) {price} [pesos]", "(y si | que tal si) le doy {price} [pesos]", "le ofrezco {price} [pesos]",
      // "No está bien" at "¿Le parece bien?" is no "No. Está bien." (the price isn't okay)
      "no (esta bien | me parece bien | me parece) [el precio]",
      // "Es mucho, ¿me lo deja en ochenta?" is one request (two would get two answers)
      "[es | esta] [muy | demasiado] (caro | mucho) (me lo | me la | lo | la) (deja | puede dejar | podria dejar | da) (en | por) {price} [pesos]",
      "(que | muy) caro (me lo | me la | lo | la) (deja | puede dejar | podria dejar | da) (en | por) {price} [pesos]",
      "[es | esta] [muy | demasiado] (caro | mucho) (que tal | y) {price} [pesos]",
    ] },
    refuse: { patterns: [
      "(mejor | entonces) no [gracias]", "no gracias (busco otro | mejor otro | busco otro taxi | voy a buscar otro)", "es mucho no gracias",
      "(busco | voy a buscar | mejor busco | mejor tomo) otro [taxi]", "(mejor | entonces) (me voy | voy) (caminando | a pie)", "(mejor | prefiero) (camino | caminar)",
      "no gracias es (muy caro | mucho)",
    ] },
    from_ans: { patterns: [
      "(soy | yo soy | vengo | somos | venimos) de {country} [@back] #h:st_from", "de {country} [@back]", "{country} [@back]",
      "(soy | yo soy | somos) (estadounidense | estadounidenses | americano | americana | americanos | gringo | gringa | norteamericano | norteamericana) [@back] #usa",
      "(soy | yo soy | somos) (canadiense | canadienses) [@back] #canada",
      "(soy | yo soy | somos) (ingles | inglesa | ingleses | britanico | britanica | britanicos | escoces | escocesa | gales | galesa) [@back] #uk",
      "(soy | yo soy | somos) (irlandes | irlandesa | irlandeses) [@back] #ireland",
      "(soy | yo soy | somos) (australiano | australiana | australianos) [@back] #australia",
      "(soy | yo soy | somos) (neozelandes | neozelandesa | neozelandeses) [@back] #nz",
      "(soy | yo soy | somos) (lituano | lituana | lituanos) [@back] #lithuania",
      "(vivo | ya vivo | ahora vivo) aqui [pero] (soy | vengo) de {country} #lives", "(soy | vengo) de {country} [pero] (vivo | ya vivo | ahora vivo) aqui #lives",
    ] },
    // a city or a state the list doesn't have ("Soy de Chicago"), at "¿De dónde es usted?"
    from_other_ctx: { patterns: ["(soy | yo soy | vengo | somos | venimos) de {w:any}", "de {w:any}"] },
    first_yes: { patterns: [
      "(si | si si) (es | es mi) (primera vez | la primera vez | la primera)", "(es | es mi) primera vez #h:st_first", "si primera vez", "(es | es mi) la primera vez",
      "es la primera vez que vengo", "(si)? (acabo de llegar | apenas llegué | llegué hoy | llegué ayer)",
      "(si)? (me acabo de mudar | me mudé hace poco | acabo de mudarme) [aqui]", "(si)? (soy nuevo | soy nueva) [aqui | en el pueblo]",
      "nunca (habia venido | he venido) [antes]",
    ] },
    first_no: { patterns: [
      "no ya (vine | estuve | he venido) [antes | aqui]", "(ya | no ya) (vine | he venido | estuve) [antes | aqui] #h:st_before", "(no)? ya conozco [el pueblo]",
      "(no)? (es | es mi) la (segunda | tercera | cuarta) vez", "(no)? es mi (segunda | tercera) vez", "vengo (cada ano | seguido | todos los anos | muy seguido)",
      "(no)? ya he venido (dos | tres | varias | muchas) veces", "(no)? (vivo | ya vivo | ahora vivo) aqui #lives", "(no)? (vivo | ya vivo) en puerto colibri #lives",
    ] },
    ask_rigo: { patterns: [
      "(usted | y usted)? es de aqui", "(usted | y usted) de donde es", "(es | usted es) de (puerto colibri | por aqui)", "(usted | y usted)? (vive | nacio) aqui",
    ] },
    ask_far: { patterns: [
      "(esta | queda) (lejos | cerca) #h:e_far", "(esta | queda) (muy)? (lejos | cerca) [de aqui] [{dest}]", "(esta | queda) (muy)? (lejos | cerca) @to {dest}",
      "cuanto (tiempo)? (se hace | tarda | tardamos | hacemos | se tarda | nos tardamos | nos hacemos) [de aqui] [@to {dest}] #h:e_long",
      "cuanto (falta | nos falta) [para llegar]", "ya (casi | mero)? llegamos", "(falta | nos falta) mucho", "(cuantos minutos | cuanto tiempo) (son | es | se hace | hacemos | tarda)",
    ] },
    ac_on: { patterns: [
      "(puede | podria) (prender | encender | poner | subir) el (aire | clima | aire acondicionado) #h:c_ac", "(hace | tengo) (mucho)? calor", "que calor",
      "(prenda | ponga | encienda | pongame) el (aire | clima | aire acondicionado)", "(tiene | hay) (aire | clima | aire acondicionado)",
    ] },
    ac_off: { patterns: [
      "(puede | podria) (apagar | quitar | bajar | bajarle) [a] el (aire | clima | aire acondicionado)", "(apague | quite | bajele) [a] el (aire | clima | aire acondicionado)",
      "(hace | tengo) (mucho | un poco)? frio", "que frio",
    ] },
    window: { patterns: [
      "(puedo | se puede) (abrir | bajar) la ventana #h:c_window", "(mejor)? (abro | bajo) la ventana", "mejor (la | con la) ventana [abierta]",
      "(puede | podria) (abrir | bajar) la ventana", "(abra | baje) la ventana", "prefiero (la ventana | la ventana abierta | abrir la ventana)",
    ] },
    stop: { patterns: [
      "aqui (esta bien | por favor | esta perfecto) #h:s_here", "(me puede dejar | dejeme | me deja | bajeme | me baja) (aqui | ahi | aca) #h:s_leave",
      "(me bajo | bajo | nos bajamos) (aqui | ahi)", "(en | a) la esquina [por favor] #h:s_corner", "(en | a) la (siguiente | proxima | otra) esquina",
      "(me puede dejar | dejeme | me deja) (en | a) la (esquina | siguiente esquina | proxima esquina)", "[un poco | un poquito] mas (adelante | alla)",
      "(enfrente | adelante | alla | aca) [por favor]", "(enfrente | frente | delante | afuera) (de | del | de la | al | a la) {dest}",
      "(me puede dejar | dejeme | me deja) (enfrente | frente | afuera) (de | del | de la | al | a la) {dest}",
      "(pare | pareme | se puede parar | puede parar) (aqui | ahi)", "(aqui | ahi) (nomas | mismo | mero)", "aqui", "(ahi | aca) esta bien",
      "(aqui | ahi) [a la] (derecha | izquierda) [esta bien]", "a la (derecha | izquierda) [esta bien]", "(aqui | ahi)? donde (pueda | se pueda | guste)",
    ] },
    pay_cash: { patterns: [
      "aqui tiene #h:p_here", "tenga", "tome", "aqui esta", "le pago en efectivo", "(aqui | ahi) le (pago | doy)",
      "(aqui tiene | tenga | aqui esta | tome) [son] {price} [pesos] [exactos | justos]", "(le doy | le pago con | le pago) {price} [pesos] [exactos | justos]",
      "(le doy | le pago con | tengo) un billete de {price}", "(aqui tiene | tenga) (el dinero | su dinero)",
    ] },
    keep_change: { patterns: [
      "quedese con el cambio #h:p_keep", "(asi esta | asi) bien", "el cambio es para usted", "no me de (cambio | el cambio)",
      "(aqui tiene | tenga | aqui esta) [{price} [pesos]] [y] (quedese con el cambio | el cambio es para usted | no me de cambio)",
      "le dejo (la | una)? propina", "(dejelo | dejelo asi) [esta bien]",
    ] },
    pay_card: { patterns: [
      "(acepta | aceptan) tarjeta #h:p_card", "(puedo pagar | pago | le pago | se puede pagar) con (tarjeta | el celular | mi celular | transferencia)", "con (tarjeta | el celular)",
      "(acepta | aceptan) (transferencia | tarjeta de credito | tarjeta de debito | pago con tarjeta | apple pay | google pay)",
      "(le transfiero | le hago una transferencia | le puedo transferir)", "tiene terminal",
    ] },
    pay_dollars: { patterns: [
      "(acepta | aceptan | toma | agarra) dolares", "(puedo pagar | le pago | pago) (en | con) dolares", "(tengo | traigo) (solo | nomas)? dolares", "le doy dolares",
    ] },
    no_cash: { patterns: [
      "no (tengo | traigo | llevo) @cash_word", "no (tengo | traigo | llevo) nada de efectivo", "(solo | nomas) (tengo | traigo) tarjeta", "(hay | donde hay) (un)? cajero [por aqui | cerca]",
    ] },
    ask_change: { patterns: [
      "(tiene | trae) cambio [de {price} [pesos]] #h:p_change", "(tiene | trae) cambio para (un billete de)? {price}", "no (tengo | traigo) cambio",
      "(solo | nomas) (tengo | traigo) (billetes grandes | un billete de {price})",
    ] },
    pay_when: { patterns: [
      "(le pago | pago) (ahora | ahorita | antes | al llegar | al final | despues | cuando lleguemos)", "(cuando | en que momento) (le pago | pago)",
      "le pago (ahora | ahorita) o (al llegar | despues | al final | cuando lleguemos)", "se paga (antes | al final | al llegar)",
    ] },
    ask_receipt: { patterns: [
      "(me da | me puede dar | me podria dar) (un)? (recibo | comprobante | ticket) [al final | despues | cuando lleguemos]",
      "(necesito | quisiera) (un)? (recibo | comprobante | ticket) [al final | despues | cuando lleguemos]",
    ] },
    bag: { patterns: [
      "(me ayuda | me puede ayudar | me podria ayudar) con (la | mi | las | mis) (maleta | maletas | equipaje | mochila | bolsa | cosas)",
      "(puedo | se puede) (subir | meter | poner) (la | mi | las | mis) (maleta | maletas | equipaje) [en la cajuela | en el maletero | atras]",
      "(me abre | puede abrir | abra) (la cajuela | el maletero | la cajuela por favor)", "(cabe | caben) (mi | mis) (maleta | maletas)",
      "(traigo | tengo) (una | dos | mucho)? (maleta | maletas | equipaje)",
    ] },
    hurry: { patterns: [
      "tengo (mucha)? prisa", "(voy | vamos | ando) (tarde | con prisa | de prisa)", "es (urgente | una emergencia)", "[lo mas] rapido (que pueda | posible)",
      "rapido", "se me hace tarde", "(voy a perder | no quiero perder) (mi | el) (vuelo | autobus | camion)", "apurese",
    ] },
    recommend: { patterns: [
      "(que | a donde | adonde) me recomienda [ir | visitar | conocer]", "no se (a donde | adonde) ir", "(a donde | adonde) (puedo | se puede) ir",
      "que (hay | se puede) (que ver | para ver | visitar)", "(conoce | sabe de) (un | algun) lugar bonito",
    ] },
    // "A ver…" (let me think) is no "a" + a place
    a_ver: { patterns: ["a ver", "a ver a ver", "mmm a ver", "a ver este"] },
    dest_unknown: { patterns: ["@to {w:any}", "@take_me @to {w:any}"] },
  },

  lines: {
    greet: [
      t("¡Buenas! | ¿A | dónde | {m:lo|f:la} | llevo?", "Hi! | To | where | you | I-take?", "Hi! Where can I take you?",
        { flags: { 3: "lo / la: “you” (usted) – lo for a man, la for a woman." } }),
      t("¡Buenas | tardes! | ¿A | dónde | vamos?", "Good | afternoon! | To | where | we-go?", "Good afternoon! Where to?"),
      t("¡Súbase! | ¿A | dónde | va?", "Get in! | To | where | you-go?", "Hop in! Where are you going?"),
    ],
    which_place: [
      t("¿A | qué | parte | {m:lo|f:la} | llevo?", "To | what | place | you | I-take?", "So where to?", { flags: { 3: "lo / la: “you” (usted), for a man / a woman." } }),
    ],
    fare_is: [
      t("¿A | {X.the}? | Son | {$fare}.", "To | {X.the}? | That's | {$fare}.", "To {X.the}? That's {$fare}."),
      t("{X.the}, | {$fare}.", "{X.the}, | {$fare}.", "{X.the}: {$fare}."),
    ],
    fare_ok_q: [
      t("¿Le | parece | bien?", "(To) you | seems | good?", "Is that okay?"),
      t("¿Nos | vamos?", "(Ourselves) | we-go?", "Shall we go?"),
    ],
    /** The price again, once it's been said (after asking for less, during the ride). */
    fare_again: [t("Son | {$fare}.", "That's | {$fare}.", "That's {$fare}.")],
    fare_fixed: [
      t("Es | tarifa | fija, | {m:joven|f:joven}.", "It's | fare | fixed, | {m:young man|f:young lady}.", "It's a fixed fare, I'm afraid."),
    ],
    fare_lower: [
      t("Ándele | pues, | se lo | dejo | en | {$fare}.", "Go on | then, | it to you | I-leave | at | {$fare}.", "Oh, all right, {$fare}.",
        { flags: { 0: "Mexican: ándele pues = oh, all right then." }, neutral: t("Bueno, | se lo | dejo | en | {$fare}.", "Okay, | it to you | I-leave | at | {$fare}.", "Okay then, {$fare}.") }),
    ],
    /** Asked for less a second time. */
    haggle_again: [t("Más | barato | no se puede, | {m:joven|f:joven}.", "More | cheap | it can't be done, | {m:young man|f:young lady}.", "I can't go any lower, I'm afraid.")],
    lets_go: [
      t("¡Vámonos!", "Let's go!", "Let's go!"),
      t("Perfecto. | Súbase.", "Perfect. | Get in.", "Perfect. Hop in."),
    ],
    refused: [t("Como | guste.", "As | you-like.", "As you like.")],
    far_no: [t("Hasta | allá | no voy, | {m:joven|f:joven}.", "Up to | there | I don't go, | {m:young man|f:young lady}.", "I don't go that far, I'm afraid.")],
    far_bus: [t("¿{m:Lo|f:La} | llevo | a | la | terminal?", "You | I-take | to | the | bus station?", "Want me to take you to the bus station?",
      { flags: { 0: "lo / la: “you” (usted), for a man / a woman." } })],
    far_colectivo: [t("Mejor | tome | un | colectivo.", "Better | take | a | colectivo.", "You'd better take a colectivo.",
      { flags: { 3: "colectivo: a shared van that runs along the highway." }, spain: t("Mejor | coja | un | colectivo.", "Better | take | a | colectivo.", "You'd better take a colectivo.", {flags: {3: "colectivo: a shared van that runs along the highway."}}) })],
    ruins_walk: [t("A | las | ruinas | se llega | caminando | por | la | playa.", "To | the | ruins | you get there | walking | along | the | beach.", "You get to the ruins on foot, along the beach.", { spain: t("A | las | ruinas | se llega | andando | por | la | playa.", "To | the | ruins | you get there | walking | along | the | beach.", "You get to the ruins on foot, along the beach.") })],
    /** The sitio stands next to the airport. */
    airport_here: [t("El | aeropuerto | está | aquí | al lado, | {m:joven|f:joven}.", "The | airport | is | here | next door, | {m:young man|f:young lady}.", "The airport's right next door.")],
    ask_from: [
      t("¿Y | de | dónde | es | usted?", "And | from | where | are | you?", "So where are you from?"),
    ],
    from_reply: [
      t("¡Ah, | qué | bien! | ¿Es | su | primera | vez | en | Puerto | Colibrí?", "Oh, | how | nice! | Is it | your | first | time | in | Puerto | Colibrí?", "Oh, how nice! Is it your first time in Puerto Colibrí?"),
    ],
    from_far: [
      t("¡Uy, | de | muy | lejos! | ¿Es | su | primera | vez | aquí?", "Wow, | from | very | far! | Is it | your | first | time | here?", "Wow, that's a long way! Is it your first time here?"),
    ],
    /** Asked back where he's from, or the learner said where they're from before he asked. */
    rigo_from: [t("Yo | soy | de | aquí, | de toda la vida.", "I | am | from | here, | all my life.", "I'm from here, born and raised.")],
    first_q: [t("¿Y | es | su | primera | vez | aquí?", "And | is it | your | first | time | here?", "Is this your first time here?")],
    first_reply: [
      t("¡Bienvenid{m:o|f:a}! | Le | va | a | encantar.", "Welcome! | (To) you | it's going | to | delight.", "Welcome! You're going to love it."),
    ],
    again_reply: [
      t("¡Qué | gusto! | Ya | conoce | el | pueblo | entonces.", "How | nice! | Already | you-know | the | town | then.", "Great! So you know the town already."),
    ],
    ask_ac: [
      t("¿Le | prendo | el | aire?", "(For) you | I-turn-on | the | AC?", "Want me to turn on the AC?",
        { flags: { 1: "Mexican: prender = turn on. Elsewhere: encender." }, neutral: t("¿Le | enciendo | el | aire?", "(For) you | I-turn-on | the | AC?", "Want me to turn on the AC?"), spain: t("¿Le | pongo | el | aire?", "(For) you | I-put-on | the | AC?", "Want me to turn on the AC?") }),
    ],
    ac_done: [t("Listo.", "Done.", "There you go.", { spain: t("Ya está.", "Done.", "There you go.") })],
    window_ok: [t("Sí, | claro.", "Yes, | sure.", "Sure.")],
    far: [
      t("Son | como | cinco | minutos.", "It's | about | five | minutes.", "About five minutes."),
    ],
    /** On the way. */
    far_ride: [
      t("Está | cerca, | ahorita | llegamos.", "It's | close, | in a moment | we-arrive.", "It's close, we'll be there in a minute.",
        { flags: { 2: "Mexican: ahorita = in a moment." }, neutral: t("Está | cerca, | ya | casi | llegamos.", "It's | close, | now | almost | we-arrive.", "It's close, we're almost there.") }),
    ],
    arrived: [
      t("Ya | llegamos. | ¿Dónde | {m:lo|f:la} | dejo?", "Already | we-arrived. | Where | you | I-leave?", "Here we are. Where should I drop you off?", { flags: { 3: "lo / la: “you” (usted), for a man / a woman." }, spain: t("Ya | hemos llegado. | ¿Dónde | {m:lo|f:la} | dejo?", "Already | we've arrived. | Where | you | I-leave?", "Here we are. Where should I drop you off?", {flags: {3: "lo / la: “you” (usted), for a man / a woman."}}) }),
      t("Aquí | es. | ¿Le | paro | aquí?", "Here | it-is. | (For) you | I-stop | here?", "This is it. Should I stop here?"),
    ],
    /** "No" to stopping here. */
    where_stop: [t("¿Dónde | {m:lo|f:la} | dejo, | entonces?", "Where | you | I-leave, | then?", "Where should I drop you off, then?", { flags: { 1: "lo / la: “you” (usted), for a man / a woman." } })],
    stopping: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto, | aquí | le | paro.", "Perfect, | here | (for) you | I-stop.", "Sure, I'll stop here.")],
    say_fare: [
      t("Son | {$fare}, | por favor.", "That's | {$fare}, | please.", "That's {$fare}, please."),
      t("Serían | {$fare}.", "That would be | {$fare}.", "That'll be {$fare}."),
    ],
    /** Money offered before the ride. */
    pay_later: [t("Me | paga | al | llegar.", "(To) me | you-pay | upon | arriving.", "You can pay me when we get there.")],
    cash_only: [
      t("Perdón, | nomás | efectivo.", "Sorry, | only | cash.", "Sorry, cash only.",
        { flags: { 1: "Mexican: nomás = only." }, neutral: t("Perdón, | solo | efectivo.", "Sorry, | only | cash.", "Sorry, cash only.") }),
    ],
    dollars_no: [t("Dólares | no, | {m:joven|f:joven}. | Solo | pesos.", "Dollars | no, | {m:young man|f:young lady}. | Only | pesos.", "No dollars, I'm afraid. Pesos only.")],
    no_cash: [t("Aquí | cerca | hay | un | cajero; | {m:lo|f:la} | espero.", "Here | near | there's | an | ATM; | you | I-wait.", "There's an ATM near here. I'll wait for you.",
      { flags: { 5: "lo / la: “you” (usted), for a man / a woman." } })],
    change_yes: [t("Sí, | traigo | cambio.", "Yes, | I-carry | change.", "Yes, I've got change.", { spain: t("Sí, | tengo | cambio.", "Yes, | I-have | change.", "Yes, I've got change.") })],
    change_back: [t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change.")],
    exact: [t("¡Justo! | Gracias.", "Exact! | Thanks.", "Exactly right, thanks!")],
    thanks_tip: [t("¡Ay, | muchas | gracias!", "Oh, | many | thanks!", "Oh, thank you so much!")],
    receipt: [t("Claro, | aquí | tiene | su | recibo.", "Sure, | here | you-have | your | receipt.", "Sure, here's your receipt.")],
    bag_ok: [t("Claro, | yo | le | ayudo.", "Sure, | I | (to) you | I-help.", "Sure, I'll give you a hand.")],
    hurry_ok: [t("No se preocupe, | llegamos | rápido.", "Don't worry, | we-arrive | fast.", "Don't worry, we'll get there fast.")],
    recommend: [t("El | centro | está | muy | bonito, | y | la | playa | también.", "The | center | is | very | pretty, | and | the | beach | too.", "The town center is really nice, and so is the beach.")],
    bye: [t("¡Que | le | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "Take care!")],
    bye_enjoy: [t("¡Disfrute | Puerto | Colibrí!", "Enjoy | Puerto | Colibrí!", "Enjoy Puerto Colibrí!")],
    unknown_place: [t("Mmm, | no conozco | ese | lugar. | ¿Me | dice | otro?", "Hmm, | I don't know | that | place. | (To) me | you-tell | another?", "Hmm, I don't know that place. Somewhere else?")],
    ok: [t("Muy | bien.", "Very | good.", "Okay.")],
  },

  merges: {
    // Spain's twins (11 Nov 2026)
    "hemos llegado": { reason: "grammatical_fusion", split: "hemos → have/has + llegado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "he venido": { reason: "grammatical_fusion", split: "he → have/has + venido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name instead of identifying it.", minimal: "Only the two-word name; Hotel stays separate." },
    "la ceiba": { reason: "lexical_expression", split: "la → the + ceiba → ceiba would split the café's proper name.", minimal: "Only the two-word name; Café stays separate." },
    "el muelle": { reason: "lexical_expression", split: "el → the + muelle → pier would translate the restaurant's proper name.", minimal: "Only the two-word name; restaurante stays separate." },
    "las palmas": { reason: "lexical_expression", split: "las → the + palmas → palms would translate the building's proper name.", minimal: "Only the two-word name; Departamentos stays separate." },
    "al lado": { reason: "lexical_expression", split: "al → to the + lado → side misreads the place phrase: next door, beside.", minimal: "Two words." },
    "de toda la vida": { reason: "lexical_expression", split: "de → of + toda → all + la → the + vida → life misreads the set phrase: all my life, born and raised.", minimal: "The four-word phrase only." },
    "línea clara": { reason: "lexical_expression", split: "línea → line + clara → clear would translate the company's name.", minimal: "One name of two words." },
    "playa del carmen": { reason: "lexical_expression", split: "playa → beach + del → of the + carmen → Carmen would translate a town's name.", minimal: "One name of three words." },
    "chichén itzá": { reason: "lexical_expression", split: "Two words of one name (the Maya city).", minimal: "One name of two words." },
  },

  domains: {
    // every fare and every price he may come down to: 5 pesos at a time, at most 20 below the fare
    fare: () => {
      const s = new Set<number>();
      for (const d of DESTS) { if (d.attrs?.here) continue; const f = d.attrs!.fare as number; for (let x = f - 2000; x <= f; x += 500) s.add(x); }
      return [...s].sort((a, b) => a - b);
    },
  },

  hints: {
    dest: {
      lt: "Say where you're going", slot: "dest", examples: ["centro", "hotel", "playa", "mercado"],
      items: [
        { id: "d_to", s: t("A | {X.the}, | por favor.", "To | {X.the}, | please.", "To the {X}, please."), only: (e) => CHIPS.includes(e.id) },
        { id: "d_take", s: t("¿Me | lleva | a | {X.the}?", "Me | you-take | to | {X.the}?", "Could you take me to the {X}?"), only: (e) => CHIPS.includes(e.id) },
        { id: "d_need", s: t("Voy | a | {X.the}.", "I'm going | to | {X.the}.", "I'm going to the {X}."), only: (e) => CHIPS.includes(e.id) },
      ],
    },
    fare: {
      lt: "Ask the price and agree it",
      items: [
        { id: "f_cuanto", s: t("¿Cuánto | me | cobra?", "How much | (to) me | you-charge?", "How much do you charge?"), note: "Ask before you get in: taxis here have no meter." },
        { id: "f_ok", s: t("Está bien, | vamos.", "Okay, | let's go.", "Okay, let's go.") },
        { id: "f_haggle", s: t("¿Me | lo | deja | más | barato?", "(To) me | it | you-leave | more | cheap?", "Could you make it a little cheaper?"), note: "Asking for less is fine; a fixed fare is fixed." },
      ],
    },
    talk: {
      lt: "Small talk",
      items: [
        { id: "st_from", s: t("Soy | de | Estados Unidos.", "I'm | from | the United States.", "I'm from the United States.") },
        { id: "st_first", s: t("Sí, | es | mi | primera | vez.", "Yes, | it's | my | first | time.", "Yes, it's my first time.") },
        { id: "st_before", s: t("No, | ya | vine | antes.", "No, | already | I-came | before.", "No, I've been here before.", { spain: t("No, | ya | he venido | antes.", "No, | already | I've come | before.", "No, I've been here before.") }) },
        { id: "e_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
        { id: "e_long", s: t("¿Cuánto | se hace?", "How much | does it take?", "How long does it take?",
          { flags: { 1: "Mexican: hacerse = take (time). Elsewhere: tardar." }, neutral: t("¿Cuánto | se tarda?", "How much | does it take?", "How long does it take?") }) },
        { id: "c_ac", s: t("¿Puede | prender | el | aire?", "Can you | turn on | the | AC?", "Could you turn on the AC?",
          { flags: { 1: "Mexican: prender = turn on. Elsewhere: encender." }, neutral: t("¿Puede | encender | el | aire?", "Can you | turn on | the | AC?", "Could you turn on the AC?"), spain: t("¿Puede | poner | el | aire?", "Can you | put on | the | AC?", "Could you turn on the AC?") }) },
        { id: "c_window", s: t("¿Puedo | abrir | la | ventana?", "Can I | open | the | window?", "Can I open the window?") },
      ],
    },
    stop: {
      lt: "Say where to stop",
      items: [
        { id: "s_here", s: t("Aquí | está bien, | gracias.", "Here | is fine, | thanks.", "Right here is fine, thanks.") },
        { id: "s_leave", s: t("Déjeme | aquí, | por favor.", "Leave me | here, | please.", "You can drop me off here, please.") },
        { id: "s_corner", s: t("En | la | esquina, | por favor.", "At | the | corner, | please.", "At the corner, please.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "p_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "p_keep", s: t("Quédese | con | el | cambio.", "Keep | with | the | change.", "Keep the change.") },
        { id: "p_card", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "p_change", s: t("¿Tiene | cambio?", "Do you have | change?", "Do you have change?"), note: "Drivers often have no change for a $500 bill: ask before you pay." },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a driver, usted is more polite: “¿Me lleva…?”, “¿Cuánto me cobra?” (llevas / cobras is for friends).", better: "¿Me lleva al centro?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Say where you're going" },
    { step: "fare", lt: "Agree the fare before you go" },
    { step: "stop", lt: "Say where to stop" },
    { step: "pay", lt: "Pay" },
  ],
  steps: [
    { id: "dest", done: (c) => !!c.s.dest, ask: (c) => c.say("which_place"), expects: ["dest", "ask_fare", "dest_far", "pay_when"],
      help: (c) => c.say("recommend"),
      suggest: [{ lt: "Say where you're going", hint: "dest", options: CHIPS }, { lt: "Ask the price", hint: "fare" }] },
    { id: "fare", when: (c) => !!c.s.dest, done: (c) => !!c.s.agreed,
      ask: (c) => { if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { X: c.s.dest, fare: fareOf(c) }); } c.say("fare_ok_q"); },
      // pay_when: "¿Cuándo le pago?" is one letter from "¿Cuánto le pago?"
      expects: ["accept", "accept_ctx", "price_ctx", "haggle", "refuse", "ask_fare", "dest", "pay_when"],
      suggest: [{ lt: "Agree the price (or ask for less)", hint: "fare" }],
      yes: (c) => { taxi.handlers.accept(c, {}, seg0("accept")); },
      no: (c) => { taxi.handlers.refuse(c, {}, seg0("refuse")); } },
    { id: "from", when: (c) => !!c.s.agreed && !!c.s.askTalk && !c.s.arrived, done: (c) => !!c.s.talked,
      ask: (c) => c.say("ask_from"), expects: ["from_ans", "from_other_ctx"], suggest: [{ lt: "Say where you're from", hint: "talk", options: "country" }] },
    { id: "first", when: (c) => !!c.s.agreed && !!c.s.askTalk && !!c.s.talked && c.s.first === undefined && !c.s.arrived, done: (c) => c.s.first !== undefined,
      // asked with the answer to "¿De dónde es usted?"; asked here when the learner said it before he asked
      ask: (c) => { if (!c.s.firstAsked) { c.s.firstAsked = true; c.say("first_q"); } },
      expects: ["first_yes", "first_no"], suggest: [{ lt: "Say whether it's your first time", hint: "talk" }],
      yes: (c) => { c.s.first = true; c.say("first_reply"); }, no: (c) => { c.s.first = false; c.say("again_reply"); } },
    { id: "ac", when: (c) => !!c.s.agreed && !!c.s.askAc && c.s.ac === undefined && !c.s.arrived, done: (c) => c.s.ac !== undefined,
      ask: (c) => c.say("ask_ac"), expects: ["ac_on", "ac_off", "window"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.ac = true; c.say("ac_done"); }, no: (c) => { c.s.ac = false; c.say("ok"); } },
    { id: "stop", when: (c) => !!c.s.agreed, done: (c) => !!c.s.stopped,
      ask: (c) => { c.s.arrived = true; c.say("arrived"); }, expects: ["stop"], suggest: [{ lt: "Say where to stop", hint: "stop" }],
      yes: (c) => { c.s.stopped = true; c.say("stopping"); },
      no: (c) => { c.say("where_stop"); c.hold(); } },
    { id: "pay", when: (c) => !!c.s.stopped, done: (c) => !!c.s.paid,
      // "stop": "Aquí está bien" said again is no "Aquí está" handing over the money
      ask: (c) => c.say("say_fare", { fare: fareOf(c) }), expects: ["pay_cash", "keep_change", "pay_card", "ask_fare", "ask_change", "pay_dollars", "no_cash", "stop", "pay_when"],
      suggest: [{ lt: "Pay", hint: "pay" }] },
  ],

  init: (c) => {
    c.s.askTalk = c.chance(0.6);
    c.s.askAc = c.chance(0.35);
    c.s.haggleOk = c.chance(0.5);
    c.s.roundUp = c.chance(0.5);
  },

  start: (c) => {
    c.say("greet");
    c.hold();
  },

  handlers: {
    dest(c, slots) {
      const id = slots.dest as string;
      if (!byId(id)) { c.say("unknown_place"); c.hold(); return; }
      // no ride to the airport from here: it's next door
      if (byId(id)!.attrs?.here) { c.say("airport_here"); c.hold(); return; }
      const changed = c.s.dest && c.s.dest !== id;
      c.s.dest = id;
      // a new place is a new ride: its fare (said now, also while "¿Nos vamos?" is open after asking for less), then
      // the way there
      if (changed) {
        c.s.agreed = false; c.s.price = undefined; c.s.haggled = false; c.s.arrived = false; c.s.stopped = false;
        c.s.fareSaid = true; c.say("fare_is", { X: id, fare: fareOf(c) });
      }
      // "Sí, al centro" at "¿Le parece bien?": the same place, and a yes
      else yesAlso(c);
    },
    dest_far(c, slots) {
      const e = FAR.find((x) => x.id === slots.far);
      if (e?.attrs?.walk) { c.say("ruins_walk"); return; }
      c.say("far_no");
      if (!e?.attrs?.bus) { c.say("far_colectivo"); return; }
      c.say("far_bus");
      c.expect({ id: "far_terminal", optional: true, expects: ["dest"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
        yes: (cc) => taxi.handlers.dest(cc, { dest: "terminal" }, seg0("dest")),
        no: (cc) => { cc.say("ok"); } });
      c.hold();
    },
    ask_free(c) { c.say("window_ok"); },
    ask_fare(c, slots) {
      const before = c.s.dest;
      if (placeFirst(c, slots) === "here") return;
      // another place: its fare was just said
      if (before && c.s.dest !== before) return;
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      // at the end of the ride: what's owed
      if (c.s.stopped) { c.say("say_fare", { fare: fareOf(c) }); c.hold(); return; }
      // the fare and the place, the first time; once a price is agreed or lowered, the price
      if (c.s.price === undefined && !c.s.agreed) { c.s.fareSaid = true; c.say("fare_is", { X: c.s.dest, fare: fareOf(c) }); }
      else c.say("fare_again", { fare: fareOf(c) });
    },
    ask_fixed(c) {
      if (c.s.haggled) { c.say("fare_again", { fare: fareOf(c) }); return; }
      // said fixed, it stays fixed
      c.s.haggleOk = false; c.s.fixedSaid = true;
      c.say("fare_fixed");
    },
    accept(c) {
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      // never a yes to a fare not said yet: the fare, and the question again
      if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { X: c.s.dest, fare: fareOf(c) }); c.say("fare_ok_q"); c.hold(); return; }
      if (!c.s.agreed) { c.s.agreed = true; c.say("lets_go"); return; }
      // agreed already: "Está bien" answers what he asks now (stop here? the AC?)
      const st = taxi.steps.find((s) => s.id === c.step);
      if (st && (st.id === "stop" || st.id === "ac") && st.yes) st.yes(c);
    },
    accept_ctx(c, slots, seg) {
      if (typeof slots.price === "number" && slots.price < fareOf(c)) { taxi.handlers.haggle(c, slots, seg); return; }
      taxi.handlers.accept(c, {}, seg);
    },
    price_ctx(c, slots, seg) {
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      // the price he said (or more): is that okay, then?
      if (typeof slots.price === "number" && slots.price >= fareOf(c)) { c.say("fare_ok_q"); c.hold(); return; }
      taxi.handlers.haggle(c, slots, seg);
    },
    haggle(c, slots) {
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      if (c.s.agreed) { c.say("haggle_again"); return; }
      const fare = baseFare(c), cur = fareOf(c);
      const asked = slots.price as number | undefined;
      // the price already on the table (or more): agreed
      if (asked !== undefined && asked >= cur) { taxi.handlers.accept(c, {}, seg0("accept")); return; }
      if (c.s.haggleOk && !c.s.haggled && !c.s.fixedSaid) {
        c.s.haggled = true; c.s.fareSaid = true; c.twist("haggle");
        // a little less, never below what was asked or by more than 20 pesos, in steps of 5 pesos
        const want = asked === undefined ? fare - 2000 : Math.ceil(asked / 500) * 500;
        c.s.price = Math.min(Math.max(want, fare - 2000), fare - 500);
        c.say("fare_lower", { fare: c.s.price });
      } else {
        // asked for less before he said the fare ("Al centro, ¿me lo deja en ochenta?"): the fare first
        if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { X: c.s.dest, fare: fareOf(c) }); }
        if (c.s.haggled || c.s.fixedSaid) c.say("haggle_again");
        else { c.s.fixedSaid = true; c.say("fare_fixed"); }
      }
      c.expect({ id: "haggle", expects: ["accept", "accept_ctx", "price_ctx", "refuse"], hints: ["fare"], suggest: [{ lt: "Agree (or say no)", hint: "fare" }],
        yes: (cc) => { taxi.handlers.accept(cc, {}, seg0("accept")); }, no: (cc) => { taxi.handlers.refuse(cc, {}, seg0("refuse")); },
        on: {
          accept: (cc) => { taxi.handlers.accept(cc, {}, seg0("accept")); return true; },
          refuse: (cc) => { taxi.handlers.refuse(cc, {}, seg0("refuse")); return true; },
        },
        ask: (cc) => cc.say("fare_ok_q") });
    },
    refuse(c) { c.say("refused"); c.end(); c.hold(); },
    from_ans(c, slots, seg) {
      c.s.talked = true;
      const id = (slots.country as string | undefined) ?? NATIONALITY_TAGS.find((x) => seg.tags.includes(x));
      if (id) c.s.from = id;
      if (seg.tags.includes("lives")) { c.s.lives = true; if (c.s.first === undefined) c.s.first = false; }
      // asked back: he answers, then asks about the town
      if (askedBack(c.heard)) {
        c.s.rigoSaid = true; c.say("rigo_from");
        if (c.s.first === undefined && c.step === "from") { c.s.firstAsked = true; c.say("first_q"); }
        return;
      }
      if (c.step !== "from" || c.s.first !== undefined) { c.say("g_glad"); return; }
      c.s.firstAsked = true;
      c.say(id === "lithuania" || id === "australia" || id === "nz" ? "from_far" : "from_reply");
    },
    // "Soy de los Estados Unidos, de Texas": one answer
    from_other_ctx(c, slots, seg) { if (!c.s.talked) taxi.handlers.from_ans(c, slots, seg); },
    first_yes(c) { c.s.first = true; c.say("first_reply"); },
    first_no(c, _slots, seg) { c.s.first = false; if (seg.tags.includes("lives")) c.s.lives = true; c.say("again_reply"); },
    ask_rigo(c) { if (!c.s.rigoSaid) { c.s.rigoSaid = true; c.say("rigo_from"); } },
    ask_far(c, slots) {
      if (placeFirst(c, slots) === "here") return;
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      // there already: "Ya llegamos / Aquí es" (the question that follows) answers it
      if (c.s.arrived) return;
      c.say(c.s.agreed && c.chance(0.5) ? "far_ride" : "far");
    },
    ac_on(c) { c.s.ac = true; c.say("ac_done"); },
    ac_off(c) { c.s.ac = false; c.say("ac_done"); },
    window(c) { if (c.step === "ac" && c.s.ac === undefined) c.s.ac = false; c.say("window_ok"); },
    stop(c, slots) {
      if (!c.s.dest) {
        // "Frente al banco" before anything else: that's where they're going
        if (slots.dest) taxi.handlers.dest(c, { dest: slots.dest }, seg0("dest"));
        else { c.say("which_place"); c.hold(); }
        return;
      }
      if (!c.s.agreed) { c.say("fare_ok_q"); c.hold(); return; }
      if (c.s.stopped) return;
      c.s.arrived = true; c.s.stopped = true;
      // a spot further on ("más adelante", "en la esquina") is no "aquí le paro"
      c.say(/\b(adelante|alla|esquina|enfrente|frente|delante|afuera|derecha|izquierda|pueda|guste)\b/.test(fold(c.heard)) ? "ok" : "stopping");
    },
    pay_cash(c, slots) {
      if (c.s.paid) return;
      const amt = slots.price as number | undefined;
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      // before the ride: a price offered is asking for less; money is paid at the end
      if (!c.s.agreed && amt !== undefined && amt < fareOf(c)) { taxi.handlers.haggle(c, slots, seg0("haggle")); return; }
      if (!c.s.agreed || !c.s.arrived) { c.say("pay_later"); return; }
      // paying at "¿Dónde lo dejo?": here is fine
      c.s.stopped = true;
      const fare = fareOf(c);
      if (amt !== undefined && amt < fare) { c.say("say_fare", { fare }); c.hold(); return; }
      c.s.paid = true; c.event("pay", { method: "cash", amount: fare });
      c.say(amt === fare ? "exact" : "change_back");
      if (c.s.wantReceipt) giveReceipt(c);
      ride(c);
    },
    keep_change(c, slots) {
      if (c.s.paid) return;
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      if (!c.s.agreed || !c.s.arrived) { c.say("pay_later"); return; }
      c.s.stopped = true;
      const amt = slots.price as number | undefined;
      if (amt !== undefined && amt < fareOf(c)) { c.say("say_fare", { fare: fareOf(c) }); c.hold(); return; }
      c.s.paid = true; c.s.tip = true; c.event("pay", { method: "cash", amount: fareOf(c) });
      c.say("thanks_tip");
      if (c.s.wantReceipt) giveReceipt(c);
      ride(c);
    },
    pay_card(c) { c.twist("cash_only"); c.say("cash_only"); },
    pay_dollars(c) { c.say("dollars_no"); },
    // at the end of the ride he waits; the fare isn't said again right away
    no_cash(c) { c.say("no_cash"); if (c.s.stopped) c.hold(); },
    ask_change(c) { c.say("change_yes"); },
    pay_when(c) {
      if (c.s.stopped) { c.say("say_fare", { fare: fareOf(c) }); c.hold(); return; }
      c.say("pay_later");
    },
    ask_receipt(c) {
      if (c.s.paid) { giveReceipt(c); return; }
      // given with the change
      c.s.wantReceipt = true; c.say("ok");
    },
    bag(c) { c.say("bag_ok"); yesAlso(c); },
    hurry(c) {
      // "Al aeropuerto, tengo prisa": the airport is next door
      if (byId(placeIn(c.heard)?.id ?? "")?.attrs?.here) return;
      if (!c.s.hurrySaid) { c.s.hurrySaid = true; c.say("hurry_ok"); }
      yesAlso(c);
    },
    recommend(c) { c.say("recommend"); },
    a_ver(c) { c.say("g_take_time"); c.hold(); },
    dest_unknown(c, slots) {
      // "al final", "al rato", "a la vuelta": no place; the question again
      if (NOT_PLACES.has(fold(String(slots.w ?? "")))) return;
      // a known place with words no pattern covers: the place
      const found = placeIn(c.heard);
      if (found?.far) { taxi.handlers.dest_far(c, { far: found.id }, seg0("dest_far")); return; }
      if (found) {
        // "Al centro, es urgente" (no piece starts with "es"): the hurry too
        if (/\b(urgente|emergencia|prisa|rapido)\b/.test(fold(c.heard))) taxi.handlers.hurry(c, {}, seg0("hurry"));
        taxi.handlers.dest(c, { dest: found.id }, seg0("dest"));
        return;
      }
      c.say("unknown_place"); c.hold();
    },
  },

  finish: (c) => {
    if (!c.s.done) { c.s.done = true; c.complete(); }
    // no "Enjoy Puerto Colibrí!" to someone who lives here
    c.say(c.s.lives || c.chance(0.5) ? "bye" : "bye_enjoy");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: { g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("g_bye"); cc.end(); } },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // where to: every hint pattern and more
    { say: "Al centro, por favor", intent: "dest", slots: { dest: "centro" } },
    { say: "¿Me lleva al aeropuerto?", intent: "dest", slots: { dest: "aeropuerto" } }, // (next door: no ride)
    { say: "Voy a la terminal", intent: "dest", slots: { dest: "terminal" } },
    { say: "A la playa", intent: "dest", slots: { dest: "playa" } },
    { say: "Al Hotel Mar Azul, por favor", intent: "dest", slots: { dest: "hotel" } },
    { say: "Al hotel", intent: "dest", slots: { dest: "hotel" } },
    { say: "Lléveme al mercado", intent: "dest", slots: { dest: "mercado" } },
    { say: "¿Me puede llevar a la clínica?", intent: "dest", slots: { dest: "clinica" } },
    { say: "Al zócalo", intent: "dest", slots: { dest: "centro" } },
    { say: "Necesito ir a la renta de autos", intent: "dest", slots: { dest: "renta" } },
    { say: "a el centro", intent: "dest", slots: { dest: "centro" } },
    { say: "¿Me llevas al centro?", intent: "dest" },
    // the rest of the town
    { say: "A la oficina de correos, por favor", intent: "dest", slots: { dest: "correos" } },
    { say: "¿Me lleva a la policía?", intent: "dest", slots: { dest: "policia" } },
    { say: "A la estación de policía", intent: "dest", slots: { dest: "policia" } },
    { say: "A información turística", intent: "dest", slots: { dest: "turismo" } },
    { say: "A La Cocina de Lucía", intent: "dest", slots: { dest: "lucia" } },
    { say: "Al restaurante El Muelle", intent: "dest", slots: { dest: "muelle" } },
    { say: "A los Departamentos Las Palmas", intent: "dest", slots: { dest: "palmas" } },
    { say: "A Línea Clara", intent: "dest", slots: { dest: "linea" } },
    { say: "Al gimnasio", intent: "dest", slots: { dest: "gimnasio" } },
    { say: "A la iglesia", intent: "dest", slots: { dest: "iglesia" } },
    { say: "A la Boutique Hilos", intent: "dest", slots: { dest: "hilos" } },
    { say: "A la estética", intent: "dest", slots: { dest: "estetica" } },
    { say: "A la gasolinera", intent: "dest", slots: { dest: "gasolinera" } },
    { say: "A Brotecito", intent: "dest", slots: { dest: "brotecito" } },
    { say: "Mejor al mercado", intent: "dest", slots: { dest: "mercado" } },
    { say: "A las ruinas", intent: "dest_far", slots: { far: "ruinas" } },
    { say: "A Tulum, por favor", intent: "dest_far", slots: { far: "tulum" } },
    { say: "¿Me lleva a Playa del Carmen?", intent: "dest_far", slots: { far: "playadc" } },
    { say: "Al cenote", intent: "dest_far", slots: { far: "cenote" } },
    { say: "Buenas tardes, ¿está libre?", intent: "ask_free" },
    { say: "¿Me ayuda con la maleta?", intent: "bag" },
    // the fare
    { say: "¿Cuánto me cobra?", intent: "ask_fare", step: "fare" },
    { say: "¿Cuánto me cobra al museo?", intent: "ask_fare", slots: { dest: "museo" } },
    { say: "¿Cuánto me cobra al aeropuerto?", intent: "ask_fare", slots: { dest: "aeropuerto" } },
    { say: "¿Cuánto es hasta el centro?", intent: "ask_fare", slots: { dest: "centro" } },
    { say: "¿En cuánto me lleva a la playa?", intent: "ask_fare", slots: { dest: "playa" } },
    { say: "¿Cuánto le debo?", intent: "ask_fare", step: "pay" },
    { say: "Está bien, vamos", intent: "accept", step: "fare" },
    { say: "Va", intent: "accept", step: "fare" },
    { say: "Así está bien", intent: "accept_ctx", step: "fare" },
    { say: "¿Me lo deja en cien?", intent: "haggle", step: "fare", slots: { price: 10000 } },
    { say: "¿Me lo deja más barato?", intent: "haggle", step: "fare" },
    { say: "Es muy caro", intent: "haggle", step: "fare" },
    { say: "¡Qué caro!", intent: "haggle", step: "fare" },
    { say: "¿Es tarifa fija?", intent: "ask_fixed", step: "fare" },
    { say: "Mejor no, gracias", intent: "refuse", step: "fare" },
    { say: "¿Le pago ahora?", intent: "pay_when", step: "fare" },
    // small talk
    { say: "Soy de Estados Unidos", intent: "from_ans", step: "from", slots: { country: "usa" } },
    { say: "De Canadá", intent: "from_ans", step: "from", slots: { country: "canada" } },
    { say: "Soy americana", intent: "from_ans", step: "from" },
    { say: "Soy inglesa", intent: "from_ans", step: "from" },
    { say: "Soy de Chicago", intent: "from_other_ctx", step: "from" },
    { say: "Sí, es mi primera vez", intent: "first_yes", step: "first" },
    { say: "No, ya vine antes", intent: "first_no", step: "first" },
    { say: "No, vivo aquí", intent: "first_no", step: "first" },
    { say: "¿Usted es de aquí?", intent: "ask_rigo" },
    { say: "¿Está lejos?", intent: "ask_far" },
    { say: "¿Puede prender el aire?", intent: "ac_on" },
    { say: "Hace mucho calor", intent: "ac_on" },
    { say: "Hace frío", intent: "ac_off" },
    { say: "Mejor abro la ventana", intent: "window", step: "ac" },
    // stopping and paying
    { say: "Aquí está bien", intent: "stop", step: "stop" },
    { say: "Déjeme aquí, por favor", intent: "stop", step: "stop" },
    { say: "En la esquina", intent: "stop", step: "stop" },
    { say: "Me bajo aquí", intent: "stop", step: "stop" },
    { say: "Un poco más adelante", intent: "stop", step: "stop" },
    { say: "Aquí a la derecha", intent: "stop", step: "stop" },
    { say: "Aquí tiene", intent: "pay_cash", step: "pay" },
    { say: "Tenga, cien pesos", intent: "pay_cash", step: "pay" },
    { say: "Le doy doscientos", intent: "pay_cash", step: "pay", slots: { price: 20000 } },
    { say: "Quédese con el cambio", intent: "keep_change", step: "pay" },
    { say: "Así está bien", intent: "keep_change", step: "pay" },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "¿Tiene cambio de quinientos?", intent: "ask_change", step: "pay" },
    { say: "¿Acepta dólares?", intent: "pay_dollars", step: "pay" },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay" },
    // never flip the meaning
    { say: "No voy al centro", intent: "none" },
    { say: "No quiero ir al aeropuerto", intent: "none" },
    { say: "Aquí está bien", step: "pay", intent: "stop", not: ["pay_cash"] },
    { say: "¿Está libre?", step: "dest", intent: "ask_free", not: ["dest"] },
    { say: "¿Cuánto es?", step: "pay", intent: "ask_fare", not: ["pay_cash", "keep_change"] },
    { say: "A Playa del Carmen", intent: "dest_far", not: ["dest"] },
    // learners' Spain forms are correct answers too: coger un taxi, vale, el móvil
    { say: "Quiero coger un taxi al centro", intent: "dest", slots: { dest: "centro" } },
    { say: "Vale, vamos", intent: "accept", step: "fare" },
    { say: "Pago con el móvil", intent: "pay_card", step: "pay" },
    // not understood
    { say: "aeropuerto banana ventana", intent: "none" },
    { say: "Mi perro se llama Max", intent: "none" },
  ],

  sims: [
    { name: "the center, agreed, cash", turns: ["Buenas tardes", "Al centro, por favor", "Está bien, vamos", "Aquí está bien", "Aquí tiene", "¡Gracias, adiós!"],
      expect: { complete: true, state: { dest: "centro", paid: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.askAc = false; } },
    { name: "price first, a lower fare, small talk", turns: ["¿Cuánto me cobra al Hotel Mar Azul?", "¿Me lo deja en cien?", "Está bien", "Soy de Canadá", "No, ya vine antes", "Déjeme aquí, por favor", "Quédese con el cambio", "¡Adiós!"],
      expect: { complete: true, state: { dest: "hotel", price: 10000, first: false } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = true; s.haggleOk = true; s.askAc = false; } },
    { name: "a fixed fare, the AC, a card first", turns: ["¿Me lleva a la playa?", "¿Me lo deja en cien?", "Va", "¿Está lejos?", "Sí, por favor", "En la esquina", "¿Acepta tarjeta?", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true, state: { dest: "playa", ac: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.haggleOk = false; s.askAc = true; } },
    { name: "out of town, the bag, a change of mind, change for a big bill", turns: ["Buenas tardes, ¿está libre?", "¿Me ayuda con la maleta?", "¿Cuánto me cobra al aeropuerto?", "A Tulum, por favor", "Sí", "¿Es tarifa fija?", "Mejor al Hotel Mar Azul", "Va", "Aquí está bien", "¿Tiene cambio de quinientos?", "Tenga, quinientos", "¿Me da un recibo?", "¡Adiós!"],
      expect: { complete: true, state: { dest: "hotel", paid: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.askAc = false; s.haggleOk = true; } },
    { name: "asking for less twice, asked back, a resident, too little cash", turns: ["¿Cuánto me cobra a la clínica?", "¡Qué caro! ¿Me lo deja en ochenta?", "¿Y en noventa?", "Bueno, va", "Soy de Chicago, ¿y usted?", "No, vivo aquí", "No, gracias, mejor abro la ventana", "No, un poco más adelante", "¿Cuánto le debo?", "Tenga, cincuenta", "Tenga, doscientos", "Gracias"],
      expect: { complete: true, state: { dest: "clinica", price: 10000, first: false, ac: false, paid: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = true; s.askAc = true; s.haggleOk = true; } },
    { name: "short answers, when to pay, dollars, no cash", turns: ["A la oficina de correos", "¿Le pago ahora?", "Sí", "Aquí", "¿Acepta dólares?", "No traigo efectivo", "Aquí tiene", "Adiós"],
      expect: { complete: true, state: { dest: "correos", paid: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.askAc = false; } },
  ],
};

/** "Sí, …" with something else at "¿Le parece bien?" ("Sí, rápido, por favor"): the yes counts too. */
function yesAlso(c: Ctx) {
  if (c.step === "fare" && c.s.dest && !c.s.agreed && /^(si|ok|va|sale|claro|esta bien)\b/.test(fold(c.heard))) taxi.handlers.accept(c, {}, seg0("accept"));
}

/** "¿Cuánto se hace al centro?" read as two pieces: the place first, so the answer is about it ("here": the airport,
 *  next door, already answered). */
function placeFirst(c: Ctx, slots: Record<string, unknown>): "here" | undefined {
  const id = (slots.dest as string | undefined) ?? (c.s.dest ? undefined : placeIn(c.heard)?.id);
  if (!id || !byId(id)) return undefined;
  taxi.handlers.dest(c, { dest: id }, seg0("dest"));
  return byId(id)!.attrs?.here ? "here" : undefined;
}

/** The receipt asked for. */
function giveReceipt(c: Ctx) {
  if (c.s.receiptGiven) return;
  c.s.receiptGiven = true;
  c.say("receipt"); c.event("give", { item: "receipt" });
}

/** Paid: the ride (the town takes the learner there). */
function ride(c: Ctx) {
  const loc = DESTS.find((d) => d.id === c.s.dest)?.attrs?.loc;
  if (loc) c.event("taxi-ride", { to: loc });
}

export default taxi;
