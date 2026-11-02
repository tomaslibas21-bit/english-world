// Song 63 "So, Where Are You From?" → Puerto Colibrí: "¿Y tú de dónde eres?"
// A Saturday carne asada in Ximena's backyard. Ximena opens ("¡Qué bueno que viniste! Ven, te presento a Marcos"),
// may offer a drink ("¿Te sirvo algo de tomar?": cerveza, refresco, agua de jamaica, limonada… "¡Salud!"), then
// Marcos and the learner get to know each other, all in tú as people do at a party: names, how they know Ximena,
// where they're from, what they do, how long they've been here and "¿Qué te trae por aquí?", whether they like it
// (the heat!), what they do for fun, another drink or a taco, "¡Uy, mira qué hora es!", swapping numbers ("¿Me pasas
// tu número?") and goodbye ("¿Ya te vas? ¡Llévate unos taquitos!"). Reciprocity matters, as in the English: Marcos
// asks, the learner answers and can ask back ("¿Y tú?"), and Marcos answers about himself. If the learner never asks
// anything, Marcos says "¡Oye, yo nada más te hago preguntas! Te toca."
// Marcos: a chef from Mexico City who moved here in May; he met Ximena at a salsa class and can't dance.
// Twists (returning visits, as in the English): with the music on, Marcos mishears the country (Irlanda → Islandia,
// Australia → Austria, Suecia ↔ Suiza, Canadá → Granada); "¿Ya fuiste al café nuevo del malecón?".
// New here (the brief): "¿Qué te trae por aquí?" (step `why`), "¡Salud!" (intent `cheers`), food at the second offer.
// Facts kept vague where unsure: no real phone number is said by a character (Marcos writes his on a napkin); the new
// café and Marcos's restaurant have no names; "casi las once" is only Marcos's clock.
// Mexican-only words have a neutral twin (¡va!, ¡qué padre!, buena onda, chamba, ahorita).
//
// NEEDS: global.ts g_bye takes "igualmente" and "tú también", so "¿Y tú?" never means them here; global yes could
// take "¡muchísimo!" (handled here in confirm_yes).

import type { Ctx, EntityDef, Pending, SituationDef } from "@/content/types";
import type { SlotFn, SlotResult } from "@/convo/grammar";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";
import { nameSlot, readInt } from "@/convo/slots";

const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------------------
// Entities

/** The learner's country. fact: what Marcos asks about it (cold / rain); mishear: what he hears with the music on. */
const C = (id: string, es: string, en: string, g: "m" | "f", forms: string[] = [], attrs: Record<string, any> = {}) =>
  ent(id, es, en, g, { art: "", forms: [...new Set([fold(es), ...forms])], attrs });
const COUNTRIES: EntityDef[] = [
  C("usa", "Estados Unidos", "the United States", "m", ["los estados unidos", "eeuu", "ee uu", "eu", "eua", "usa", "america", "norteamerica", "united states", "the states"]),
  C("canada", "Canadá", "Canada", "m", [], { fact: "cold", mishear: "granada" }),
  C("uk", "Inglaterra", "England", "f", ["el reino unido", "reino unido", "gran bretana", "england", "uk", "britain"], { fact: "rain" }),
  C("scotland", "Escocia", "Scotland", "f", ["scotland"], { fact: "rain" }),
  C("wales", "Gales", "Wales", "m", ["el pais de gales", "pais de gales"], { fact: "rain" }),
  C("ireland", "Irlanda", "Ireland", "f", ["ireland", "irlanda del norte"], { fact: "rain", mishear: "iceland" }),
  C("australia", "Australia", "Australia", "f", [], { mishear: "austria" }),
  C("nz", "Nueva Zelanda", "New Zealand", "f", ["nueva zelandia", "new zealand"]),
  C("south_africa", "Sudáfrica", "South Africa", "f", ["africa del sur", "south africa"]),
  C("germany", "Alemania", "Germany", "f"),
  C("france", "Francia", "France", "f"),
  C("spain", "España", "Spain", "f"),
  C("italy", "Italia", "Italy", "f"),
  C("portugal", "Portugal", "Portugal", "m"),
  C("netherlands", "Holanda", "the Netherlands", "f", ["paises bajos", "los paises bajos"]),
  C("belgium", "Bélgica", "Belgium", "f"),
  C("sweden", "Suecia", "Sweden", "f", [], { mishear: "switzerland" }),
  C("switzerland", "Suiza", "Switzerland", "f", [], { mishear: "sweden" }),
  C("austria", "Austria", "Austria", "f", [], { mishear: "australia" }),
  C("iceland", "Islandia", "Iceland", "f", [], { mishear: "ireland" }),
  C("norway", "Noruega", "Norway", "f"),
  C("denmark", "Dinamarca", "Denmark", "f"),
  C("poland", "Polonia", "Poland", "f"),
  C("lithuania", "Lituania", "Lithuania", "f"),
  C("brazil", "Brasil", "Brazil", "m"),
  C("argentina", "Argentina", "Argentina", "f"),
  C("colombia", "Colombia", "Colombia", "f"),
  C("china", "China", "China", "f"),
  C("japan", "Japón", "Japan", "m"),
  C("korea", "Corea", "Korea", "f", ["corea del sur"]),
  C("india", "India", "India", "f", ["la india"]),
  C("israel", "Israel", "Israel", "m"),
];

/** Nationality words ("Soy canadiense"): a lexicon, so a bare "Soy" + adjective never becomes a country by accident. */
const NATIONALITIES = Object.entries({
  usa: ["estadounidense", "estadounidenses", "americano", "americana", "americanos", "norteamericano", "norteamericana", "gringo", "gringa", "gringos"],
  canada: ["canadiense", "canadienses"], uk: ["ingles", "inglesa", "ingleses", "britanico", "britanica"], scotland: ["escoces", "escocesa"],
  wales: ["gales", "galesa"], ireland: ["irlandes", "irlandesa", "irlandeses"], australia: ["australiano", "australiana"],
  nz: ["neozelandes", "neozelandesa"], south_africa: ["sudafricano", "sudafricana"], germany: ["aleman", "alemana"], france: ["frances", "francesa"],
  spain: ["espanol", "espanola"], italy: ["italiano", "italiana"], portugal: ["portugues", "portuguesa"], netherlands: ["holandes", "holandesa"],
  belgium: ["belga"], sweden: ["sueco", "sueca"], switzerland: ["suizo", "suiza"], austria: ["austriaco", "austriaca"], iceland: ["islandes", "islandesa"],
  norway: ["noruego", "noruega"], denmark: ["danes", "danesa"], poland: ["polaco", "polaca"], lithuania: ["lituano", "lituana"],
  brazil: ["brasileno", "brasilena"], argentina: ["argentino", "argentina"], colombia: ["colombiano", "colombiana"], china: ["chino", "china"],
  japan: ["japones", "japonesa"], korea: ["coreano", "coreana"], india: ["indio", "india", "hindu"], israel: ["israeli"],
}).map(([id, forms]) => ({ id, forms }));

/** Cities. known: Marcos knows where it is; otherwise he asks ("¿Y eso dónde queda?"). */
const CI = (id: string, es: string, en: string, country: string, known: boolean, forms: string[] = []) =>
  ent(id, es, en, "m", { art: "", forms: [...new Set([fold(es), ...forms])], attrs: { country, known } });
const CITIES: EntityDef[] = [
  CI("toronto", "Toronto", "Toronto", "canada", true), CI("vancouver", "Vancouver", "Vancouver", "canada", true, ["vancuver"]),
  CI("montreal", "Montreal", "Montreal", "canada", true), CI("quebec", "Quebec", "Quebec", "canada", true, ["quebec"]),
  CI("halifax", "Halifax", "Halifax", "canada", false), CI("calgary", "Calgary", "Calgary", "canada", false), CI("winnipeg", "Winnipeg", "Winnipeg", "canada", false),
  CI("ottawa", "Ottawa", "Ottawa", "canada", false),
  CI("new_york", "Nueva York", "New York", "usa", true, ["new york"]), CI("los_angeles", "Los Ángeles", "Los Angeles", "usa", true),
  CI("chicago", "Chicago", "Chicago", "usa", true), CI("miami", "Miami", "Miami", "usa", true), CI("texas", "Texas", "Texas", "usa", true, ["tejas"]),
  CI("california", "California", "California", "usa", true), CI("florida", "Florida", "Florida", "usa", true), CI("boston", "Boston", "Boston", "usa", true),
  CI("san_francisco", "San Francisco", "San Francisco", "usa", true), CI("seattle", "Seattle", "Seattle", "usa", true), CI("houston", "Houston", "Houston", "usa", true),
  CI("denver", "Denver", "Denver", "usa", false), CI("portland", "Portland", "Portland", "usa", false), CI("minnesota", "Minnesota", "Minnesota", "usa", false),
  CI("ohio", "Ohio", "Ohio", "usa", false), CI("michigan", "Michigan", "Michigan", "usa", false), CI("oregon", "Oregon", "Oregon", "usa", false),
  CI("london", "Londres", "London", "uk", true), CI("manchester", "Manchester", "Manchester", "uk", true), CI("liverpool", "Liverpool", "Liverpool", "uk", true),
  CI("leeds", "Leeds", "Leeds", "uk", false), CI("bristol", "Bristol", "Bristol", "uk", false),
  CI("edinburgh", "Edimburgo", "Edinburgh", "scotland", true), CI("glasgow", "Glasgow", "Glasgow", "scotland", false),
  CI("dublin", "Dublín", "Dublin", "ireland", true), CI("cork", "Cork", "Cork", "ireland", false), CI("galway", "Galway", "Galway", "ireland", false),
  CI("sydney", "Sídney", "Sydney", "australia", true, ["sidney", "sydney"]), CI("melbourne", "Melbourne", "Melbourne", "australia", true),
  CI("brisbane", "Brisbane", "Brisbane", "australia", false), CI("perth", "Perth", "Perth", "australia", false),
  CI("auckland", "Auckland", "Auckland", "nz", false), CI("wellington", "Wellington", "Wellington", "nz", false),
  CI("berlin", "Berlín", "Berlin", "germany", true), CI("paris", "París", "Paris", "france", true), CI("madrid", "Madrid", "Madrid", "spain", true),
  CI("barcelona", "Barcelona", "Barcelona", "spain", true),
  // only what Marcos mishears with the music on ("¿Canadá? … ¿De Granada?")
  CI("granada", "Granada", "Granada", "spain", true),
];

/** Jobs: masculine Spanish units, feminine units, English gloss units, synonyms (and the natural English name). */
const J = (id: string, m: string, f: string, en: string, forms: string[] = [], nat?: string) =>
  ent(id, m, en, "m", { enF: f, gF: "f", forms: [...new Set([fold(f.replace(/ \| /g, " ")), ...forms])], attrs: nat ? { nat } : {} });
const JOBS: EntityDef[] = [
  J("contador", "contador", "contadora", "accountant", ["contable", "contador publico", "contadora publica"]),
  J("enfermero", "enfermero", "enfermera", "nurse", ["auxiliar de enfermeria"]),
  J("maestro", "maestro", "maestra", "teacher", ["profesor", "profesora", "docente", "maestro de primaria", "maestra de primaria", "maestro de ingles", "maestra de ingles", "profesor de ingles", "profesora de ingles", "maestro de espanol", "maestra de espanol", "maestro de idiomas", "maestra de idiomas", "profe"]),
  J("ingeniero", "ingeniero", "ingeniera", "engineer", ["ingeniero civil", "ingeniera civil", "ingeniero industrial", "ingeniera industrial"]),
  J("programador", "programador", "programadora", "programmer", ["desarrollador", "desarrolladora", "desarrollador web", "desarrolladora web", "ingeniero de software", "ingeniera de software"]),
  J("disenador", "diseñador", "diseñadora", "designer", ["disenador grafico", "disenadora grafica", "disenador web", "disenadora web"]),
  J("gerente", "gerente", "gerente", "manager", ["jefe", "jefa", "supervisor", "supervisora", "coordinador", "coordinadora", "gerente de ventas", "gerente de proyectos", "director", "directora"]),
  J("vendedor", "vendedor", "vendedora", "salesperson", ["ejecutivo de ventas", "ejecutiva de ventas", "agente de ventas", "asesor de ventas", "asesora de ventas"]),
  J("chofer", "chofer", "chofer", "driver", ["conductor", "conductora", "taxista", "repartidor", "repartidora", "camionero", "camionera"]),
  J("mecanico", "mecánico", "mecánica", "mechanic", []),
  J("chef", "chef", "chef", "chef", ["chef de cocina"]),
  J("cocinero", "cocinero", "cocinera", "cook", []),
  J("mesero", "mesero", "mesera", "waiter", ["camarero", "camarera"]),
  J("bartender", "bartender", "bartender", "bartender", ["cantinero", "cantinera", "barman"]),
  J("cajero", "cajero", "cajera", "cashier", []),
  J("recepcionista", "recepcionista", "recepcionista", "receptionist", ["secretario", "secretaria", "asistente", "asistente administrativo", "asistente administrativa"]),
  J("traductor", "traductor", "traductora", "translator", ["interprete"]),
  J("abogado", "abogado", "abogada", "lawyer", []),
  J("medico", "médico", "médica", "doctor", ["doctor", "doctora", "cirujano", "cirujana"]),
  J("dentista", "dentista", "dentista", "dentist", []),
  J("veterinario", "veterinario", "veterinaria", "vet", []),
  J("arquitecto", "arquitecto", "arquitecta", "architect", []),
  J("guia", "guía | de | turistas", "guía | de | turistas", "guide | of | tourists", ["guia", "guia turistico", "guia turistica", "guia de turismo"], "tour guide"),
  J("instructor_buceo", "instructor | de | buceo", "instructora | de | buceo", "instructor | of | diving", ["instructor de snorkel", "instructora de snorkel"], "diving instructor"),
  J("instructor_yoga", "instructor | de | yoga", "instructora | de | yoga", "instructor | of | yoga", ["maestro de yoga", "maestra de yoga", "profesor de yoga", "profesora de yoga"], "yoga instructor"),
  J("fotografo", "fotógrafo", "fotógrafa", "photographer", []),
  J("periodista", "periodista", "periodista", "journalist", ["reportero", "reportera"]),
  J("escritor", "escritor", "escritora", "writer", ["autor", "autora"]),
  J("artista", "artista", "artista", "artist", ["pintor", "pintora"]),
  J("musico", "músico", "música", "musician", []),
  J("electricista", "electricista", "electricista", "electrician", []),
  J("plomero", "plomero", "plomera", "plumber", ["fontanero", "fontanera"]),
  J("carpintero", "carpintero", "carpintera", "carpenter", []),
  J("albanil", "albañil", "albañil", "bricklayer", ["obrero", "obrera", "trabajador de la construccion", "trabajadora de la construccion"]),
  J("panadero", "panadero", "panadera", "baker", ["pastelero", "pastelera"]),
  J("estilista", "estilista", "estilista", "hairdresser", ["peluquero", "peluquera", "barbero"]),
  J("farmaceutico", "farmacéutico", "farmacéutica", "pharmacist", []),
  J("policia", "policía", "policía", "police officer", ["oficial de policia"]),
  J("bombero", "bombero", "bombera", "firefighter", []),
  J("piloto", "piloto", "piloto", "pilot", []),
  J("analista", "analista", "analista", "analyst", ["analista de datos", "analista financiero", "analista financiera", "economista"]),
  J("consultor", "consultor", "consultora", "consultant", ["asesor", "asesora"]),
  J("psicologo", "psicólogo", "psicóloga", "psychologist", ["terapeuta"]),
  J("cientifico", "científico", "científica", "scientist", ["investigador", "investigadora", "biologo", "biologa"]),
  J("agente_inmobiliario", "agente | inmobiliario", "agente | inmobiliaria", "agent | real-estate", ["agente de bienes raices", "corredor de bienes raices", "corredora de bienes raices", "realtor"], "real estate agent"),
  J("ninera", "niñero", "niñera", "nanny", ["babysitter"]),
  J("estudiante", "estudiante", "estudiante", "student", ["universitario", "universitaria"]),
];
const jobIds = new Set(JOBS.map((e) => e.id));

/** Workplaces and fields ("Trabajo en un hospital / en turismo"): Marcos asks what the learner does there. */
const FL = (id: string, es: string, en: string, g: "m" | "f", forms: string[] = []) => ent(id, es, en, g, { art: "", forms: [...new Set([fold(es), ...forms])] });
const FIELDS: EntityDef[] = [
  FL("hospital", "hospital", "hospital", "m", ["una clinica", "clinica", "un consultorio"]), FL("banco", "banco", "bank", "m"), FL("escuela", "escuela", "school", "f", ["colegio", "una primaria", "una secundaria"]),
  FL("oficina", "oficina", "office", "f"), FL("restaurante", "restaurante", "restaurant", "m", ["un restaurant"]), FL("hotel", "hotel", "hotel", "m", ["un hostal", "hostal", "un resort"]),
  FL("fabrica", "fábrica", "factory", "f"), FL("tienda", "tienda", "store", "f", ["un supermercado", "supermercado"]), FL("universidad", "universidad", "university", "f"),
  FL("agencia", "agencia | de | viajes", "agency | of | travel", "f", ["agencia de viajes"]), FL("laboratorio", "laboratorio", "lab", "m"),
  FL("turismo", "turismo", "tourism", "m", ["el turismo"]), FL("ventas", "ventas", "sales", "f"), FL("mercadotecnia", "mercadotecnia", "marketing", "f", ["marketing", "el marketing", "publicidad"]),
  FL("informatica", "informática", "IT", "f", ["sistemas", "tecnologia", "computacion", "software"]), FL("finanzas", "finanzas", "finance", "f"),
  FL("salud", "salud", "healthcare", "f", ["la salud", "medicina"]), FL("educacion", "educación", "education", "f", ["la educacion"]),
  FL("construccion", "construcción", "construction", "f", ["la construccion"]), FL("gobierno", "gobierno", "government", "m", ["el gobierno"]),
  FL("ong", "ONG", "NGO", "f", ["una ong", "una fundacion", "fundacion", "una organizacion"]),
];

/** What the learner does ("Doy clases de inglés", "Manejo un taxi") → the job. */
const DUTIES = [
  { id: "maestro", forms: ["doy clases", "doy clases de ingles", "doy clases de espanol", "enseno ingles", "enseno en una escuela", "me dedico a la ensenanza"] },
  { id: "chofer", forms: ["manejo un taxi", "manejo un camion", "manejo para uber", "hago entregas"] },
  { id: "mecanico", forms: ["reparo carros", "arreglo carros", "arreglo motores"] },
  { id: "cocinero", forms: ["cocino en un restaurante", "me dedico a la cocina"] },
  { id: "vendedor", forms: ["vendo ropa", "vendo carros", "vendo casas", "vendo seguros", "vendo productos"] },
  { id: "programador", forms: ["programo", "hago paginas web", "hago apps", "hago aplicaciones", "desarrollo software", "escribo codigo"] },
  { id: "disenador", forms: ["diseno paginas web", "diseno logos", "diseno ropa", "hago disenos"] },
  { id: "traductor", forms: ["traduzco", "traduzco documentos", "traduzco libros"] },
  { id: "enfermero", forms: ["cuido pacientes", "cuido a pacientes", "atiendo pacientes", "atiendo a pacientes"] },
  { id: "guia", forms: ["doy tours", "llevo turistas", "llevo a turistas"] },
  { id: "instructor_buceo", forms: ["doy clases de buceo", "enseno buceo", "enseno a bucear"] },
  { id: "instructor_yoga", forms: ["doy clases de yoga", "enseno yoga"] },
  { id: "fotografo", forms: ["tomo fotos", "hago fotos", "me dedico a la fotografia"] },
  { id: "escritor", forms: ["escribo libros", "escribo novelas", "me dedico a escribir"] },
  { id: "periodista", forms: ["escribo articulos", "escribo para un periodico"] },
  { id: "panadero", forms: ["hago pan", "hago pasteles"] },
  { id: "artista", forms: ["pinto cuadros", "me dedico al arte", "me dedico a la pintura"] },
  { id: "musico", forms: ["toco en una banda", "me dedico a la musica"] },
];

/** Hobbies. kind: inf ("Me gusta correr"), play ("Juego fútbol"), instr ("Toco la guitarra"), do ("Hago yoga"), noun. */
type HobRow = [string, string, string, "m" | "f", "inf" | "play" | "instr" | "do" | "noun", string[], string[], string?];
const HOB_ROWS: HobRow[] = [
  ["running", "correr", "running", "m", "inf", ["salir a correr", "el running", "running", "trotar"], ["corro", "troto", "salgo a correr"]],
  ["reading", "leer", "reading", "m", "inf", ["la lectura", "lectura", "libros", "leer libros"], ["leo"]],
  ["cooking", "cocinar", "cooking", "m", "inf", ["la cocina"], ["cocino"]],
  ["baking", "hornear", "baking", "m", "inf", ["reposteria", "la reposteria", "hacer pasteles"], ["horneo"]],
  ["walking", "caminar", "walking", "m", "inf", ["pasear", "salir a caminar", "pasear al perro", "pasear a mi perro", "caminar por la playa"], ["camino", "paseo", "paseo a mi perro"]],
  ["hiking", "senderismo", "hiking", "m", "do", ["hacer senderismo", "ir de excursion", "excursiones", "hiking"], []],
  ["swimming", "nadar", "swimming", "m", "inf", ["natacion", "la natacion", "nadar en el mar"], ["nado"]],
  ["diving", "bucear", "diving", "m", "inf", ["buceo", "el buceo", "hacer buceo", "snorkel", "esnorquel", "hacer snorkel", "los cenotes", "ir a los cenotes", "nadar en los cenotes"], ["buceo"]],
  ["surfing", "surf", "surfing", "m", "do", ["surfear", "el surf", "hacer surf", "kitesurf", "paddle", "kayak"], ["surfeo"]],
  ["cycling", "andar | en | bici", "riding | a | bike", "m", "inf", ["andar en bicicleta", "ciclismo", "el ciclismo", "la bici", "la bicicleta", "bici", "bicicleta"], ["ando en bici", "ando en bicicleta"], "biking"],
  ["dancing", "bailar", "dancing", "m", "inf", ["baile", "el baile", "salsa", "bachata", "ir a bailar", "salir a bailar"], ["bailo"]],
  ["yoga", "yoga", "yoga", "m", "do", ["el yoga", "pilates"], []],
  ["gym", "ejercicio", "exercise", "m", "do", ["el gimnasio", "gimnasio", "ir al gimnasio", "el gym", "gym", "ir al gym", "deporte", "deportes", "hacer deporte", "pesas", "crossfit", "entrenar"], ["entreno", "voy al gimnasio", "voy al gym"]],
  ["fishing", "pescar", "fishing", "m", "inf", ["la pesca", "pesca", "ir a pescar"], ["pesco"]],
  ["gardening", "jardinería", "gardening", "f", "noun", ["jardineria", "la jardineria", "el jardin", "las plantas", "cuidar mis plantas"], []],
  ["painting", "pintar", "painting", "m", "inf", ["la pintura", "pintura"], ["pinto"]],
  ["drawing", "dibujar", "drawing", "m", "inf", ["el dibujo"], ["dibujo"]],
  ["photography", "tomar | fotos", "taking | photos", "m", "inf", ["fotografia", "la fotografia", "sacar fotos", "hacer fotos", "las fotos"], ["tomo fotos", "saco fotos"], "taking photos"],
  ["music", "escuchar | música", "listening to | music", "m", "inf", ["musica", "la musica", "oir musica"], ["escucho musica"], "listening to music"],
  ["singing", "cantar", "singing", "m", "inf", ["el canto", "karaoke", "el karaoke"], ["canto"]],
  ["traveling", "viajar", "traveling", "m", "inf", ["los viajes", "viajes", "conocer lugares", "conocer lugares nuevos"], ["viajo"]],
  ["camping", "acampar", "camping", "m", "inf", ["ir de campamento"], ["acampo"]],
  ["knitting", "tejer", "knitting", "m", "inf", [], ["tejo"]],
  ["writing", "escribir", "writing", "m", "inf", [], ["escribo"]],
  ["movies", "ver | películas", "watching | movies", "m", "inf", ["peliculas", "el cine", "ir al cine", "series", "ver series", "ver la tele", "ver tele", "netflix", "ver netflix"], ["veo peliculas", "veo series", "voy al cine"], "watching movies"],
  ["beach", "ir | a | la | playa", "going | to | the | beach", "m", "inf", ["la playa", "estar en la playa"], ["voy a la playa"], "going to the beach"],
  ["video_games", "videojuegos", "video games", "m", "play", ["los videojuegos", "juegos de video", "jugar videojuegos", "xbox", "playstation", "nintendo"], []],
  ["board_games", "juegos | de | mesa", "games | of | board", "m", "play", ["juegos de mesa"], [], "board games"],
  ["chess", "ajedrez", "chess", "m", "play", ["el ajedrez"], []],
  ["soccer", "fútbol", "soccer", "m", "play", ["futbol", "futbol soccer", "el futbol", "fut", "futbolito", "soccer"], []],
  ["basketball", "básquetbol", "basketball", "m", "play", ["basquetbol", "basquet", "baloncesto", "basket"], []],
  ["tennis", "tenis", "tennis", "m", "play", ["el tenis", "ping pong", "tenis de mesa", "padel", "el padel", "pickleball"], []],
  ["volleyball", "voleibol", "volleyball", "m", "play", ["voleibol de playa", "voley", "volibol", "volei"], []],
  ["golf", "golf", "golf", "m", "play", ["el golf"], []],
  ["hockey", "hockey", "hockey", "m", "play", ["hockey sobre hielo", "el hockey"], []],
  ["guitar", "guitarra", "guitar", "f", "instr", [], []],
  ["piano", "piano", "piano", "m", "instr", ["teclado"], []],
  ["violin", "violín", "violin", "m", "instr", [], []],
  ["ukulele", "ukulele", "ukulele", "m", "instr", [], []],
];
/** Marcos's own pastimes: a shared one gets "¡Yo también!". */
const MARCOS_HOBBIES = ["running", "reading", "cooking"];
const HOBBIES: EntityDef[] = HOB_ROWS.map(([id, es, en, g, kind, forms, , nat]) =>
  ent(id, es, en, g, { art: "", forms: [...new Set([fold(es.replace(/ \| /g, " ")), ...forms])], attrs: { kind, ...(nat ? { nat } : {}) } }));
const HOBBY_VERBS = HOB_ROWS.filter((r) => r[6].length).map(([id, , , , , , verbs]) => ({ id, forms: verbs }));

/** Drinks (Ximena's cooler) and the food on the grill. alc: an alcoholic drink. */
const DRINKS: EntityDef[] = [
  ent("water", "agua", "water", "f", { art: "un", def: "el", forms: ["agua natural", "agua simple", "un vaso de agua", "vaso de agua", "agua de garrafon"] }),
  ent("sparkling", "agua | mineral", "water | sparkling", "f", { art: "un", def: "el", forms: ["agua mineral", "agua con gas", "mineral", "agua gasificada"], attrs: { nat: "sparkling water" } }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "un", def: "el", forms: ["jamaica", "agua de flor de jamaica", "agua fresca de jamaica"], attrs: { nat: "hibiscus water" } }),
  ent("horchata", "horchata", "horchata", "f", { forms: ["agua de horchata", "orchata"] }),
  ent("lemonade", "limonada", "lemonade", "f", { forms: ["agua de limon", "limonada mineral", "limonada natural"] }),
  ent("juice", "jugo", "juice", "m", { forms: ["jugo de naranja", "jugo natural", "jugos"] }),
  ent("soda", "refresco", "soda", "m", { forms: ["refrescos", "coca", "coca cola", "una coca", "soda", "gaseosa", "sprite", "refresco de toronja", "refresco de cola"] }),
  ent("beer", "cerveza", "beer", "f", { forms: ["chela", "chelas", "chelita", "cervecita", "cheve", "birra", "cervezas"], attrs: { alc: true } }),
  ent("michelada", "michelada", "michelada", "f", { forms: ["chelada", "michela"], attrs: { alc: true } }),
  ent("tequila", "tequila", "tequila", "m", { forms: ["tequilita", "un caballito", "caballito de tequila", "shot de tequila"], attrs: { alc: true } }),
  ent("mezcal", "mezcal", "mezcal", "m", { forms: ["mezcalito"], attrs: { alc: true } }),
  ent("wine", "vino", "wine", "m", { forms: ["vino tinto", "vino blanco", "una copa de vino", "copa de vino", "vinito"], attrs: { alc: true } }),
];
const FOOD: EntityDef[] = [
  ent("taco", "taco", "taco", "m", { forms: ["tacos", "taquito", "taquitos", "taco de carne asada", "tacos de carne asada"] }),
  ent("carne", "carne | asada", "meat | grilled", "f", { art: "", forms: ["carne", "carnita asada", "un poco de carne"], attrs: { nat: "carne asada" } }),
  ent("guacamole", "guacamole", "guacamole", "m", { art: "", forms: ["guacamol"] }),
  ent("quesadilla", "quesadilla", "quesadilla", "f", { forms: ["quesadillas"] }),
  ent("elote", "elote", "corn", "m", { forms: ["elotes", "esquites"] }),
];

// ---------------------------------------------------------------------------
// A duration ("dos años", "año y medio", "unos meses", "seis semanas"): the value is in months.

const UNIT_MONTHS: Record<string, number> = { ano: 12, anos: 12, mes: 1, meses: 1, semana: 0.25, semanas: 0.25, dia: 0.03, dias: 0.03 };
const APPROX = new Set(["como", "casi", "unos", "unas", "apenas", "solo", "nomas", "ya", "aproximadamente", "mas", "menos", "poco", "alrededor"]);
const durSlot: SlotFn = (toks, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  while (i < pos + 3 && (APPROX.has(toks[i] ?? "") || (toks[i] === "de" && i > pos))) i++;
  const qs: { end: number; v: number }[] = [];
  const t0 = toks[i];
  if (t0 === "un" || t0 === "una") {
    if (toks[i + 1] === "par" && toks[i + 2] === "de") qs.push({ end: i + 3, v: 2 });
    else qs.push({ end: i + 1, v: 1 });
  }
  if (t0 === "medio") qs.push({ end: i + 1, v: 0.5 });
  if (t0 === "varios" || t0 === "varias" || t0 === "algunos" || t0 === "algunas" || t0 === "unos" || t0 === "unas") qs.push({ end: i + 1, v: 3 });
  if (t0 === "muchos" || t0 === "muchas") qs.push({ end: i + 1, v: 10 });
  if (t0 && UNIT_MONTHS[t0]) qs.push({ end: i, v: 1 });
  for (const r of readInt(toks, i)) if (r.value > 0 && r.value < 80) qs.push({ end: r.end, v: r.value });
  for (const q of qs) {
    const mult = UNIT_MONTHS[toks[q.end] ?? ""];
    if (!mult) continue;
    const v = q.v * mult;
    out.push({ end: q.end + 1, value: v });
    if (toks[q.end + 1] === "y" && (toks[q.end + 2] === "medio" || toks[q.end + 2] === "media")) out.push({ end: q.end + 3, value: v + 0.5 * mult });
  }
  return out;
};

/** A bare name at the name step: one or two words, or the learner's own name ("teclado banana martes" is no name). */
const pnameSlot: SlotFn = (toks, pos, prefix) => nameSlot(toks, pos, prefix).filter((r) => r.end - pos <= 2 || !!r.tags?.includes("known_name"));

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** The town's "now" for "desde mayo" (Marcos came in May). */
const NOW_MONTH = 11;

// ---------------------------------------------------------------------------
// Flags used more than once

const PADRE = "Mexican: ¡qué padre! = how cool!";
const VA = "Mexican: ¡va! = okay, sure.";
const AHORITA = "Mexican: ahorita = right now, in a moment.";
const CHAMBA = "Mexican, casual: chamba = work, a job.";
const ONDA = "Mexican: buena onda = nice, easygoing.";
const PERS_A = "Personal a: Spanish puts a before a person who is the object; no English word.";
const MALECON = "malecón: the seafront promenade.";
const ART_TIME = "The article before a clock time has no English word.";
const LLEVAS = "llevar + time = to have been somewhere for that long.";

// ---------------------------------------------------------------------------
// Helpers (as the English edition: one reaction per learner turn, Marcos answers before he asks)

const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let n = turnIds.get(c); if (n === undefined) { n = ++turnSeq; turnIds.set(c, n); } return `${n}:${c.heard}`; };
const SO = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("sophie"); c.say(line, vars); };
const M = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("mark"); c.say(line, vars); };
const live = (c: Ctx) => !c.s.byeSaid;
const once = (c: Ctx, key: string) => { const n = turn(c); if (c.s["__once_" + key] === n) return false; c.s["__once_" + key] = n; return true; };
/** Someone already reacted to this utterance (one answer can arrive as several segments). */
const quiet = (c: Ctx) => c.s.__spokeFor === turn(c) && !!c.heard;
const heard = (c: Ctx) => fold(c.heard);
/** The learner answered and asked back in one breath ("Soy de Canadá. ¿Y tú?"). */
const askedBackToo = (c: Ctx) =>
  /\by (tu|usted|a ti)\b|\b(de donde eres|a que te dedicas|en que trabajas|que haces|cuanto tiempo llevas|te gusta (vivir )?aqui|donde vives|de donde (la )?conoces|que te trajo)\b/.test(heard(c));
/** Marcos's follow-up question waits until he has answered the learner's question. */
function deferOrAsk(c: Ctx, q: (cc: Ctx) => void) {
  if (askedBackToo(c) && !c.s.__deferHeard) { c.s.__deferHeard = c.heard; c.s.deferQ = q; return; }
  q(c);
}
function runDeferred(c: Ctx) {
  const q = c.s.deferQ as ((cc: Ctx) => void) | null;
  if (!q) return;
  c.s.deferQ = null; c.s.__deferHeard = null;
  q(c);
}

type Topic = "name" | "know" | "from" | "job" | "time" | "why" | "like" | "fun" | "reading" | "cafe" | "live";

/** Marcos tells the learner about himself (asked directly, or "¿Y tú?"). */
function markAbout(c: Ctx, topic: Topic) {
  c.s.askedBack = (c.s.askedBack || 0) + 1;
  if (!once(c, "mark_" + topic)) return;
  c.s.told = c.s.told || {};
  c.s.told[topic] = true;
  const line: Record<Topic, string> = {
    name: "mark_name", know: "mark_know", from: "mark_from", job: "mark_job", time: "mark_time", why: "mark_why", like: "mark_like",
    fun: "mark_fun", reading: "mark_reading", cafe: "mark_cafe", live: "mark_live",
  };
  if (topic === "know") c.s.danceTold = true;
  M(c, line[topic]);
  if (c.s.deferQ) { runDeferred(c); return; }
  // asked first by the learner: Marcos asks the same question back
  const stepFor: Partial<Record<Topic, string>> = { know: "know", from: "from", job: "job", time: "time", why: "why", like: "like", fun: "fun" };
  const st = stepFor[topic];
  if (st && !c.s.done?.[topic] && c.s.lastTopic !== topic && planned(c, st) && (st !== "job" || isDone(c, "from"))) {
    c.s.backTopic = topic;
    c.ask(st);
  }
}
/** A topic the learner has answered (and when: "¿Y tú?" in the same breath asks about it). */
const done = (c: Ctx, topic: Topic) => { c.s.done = c.s.done || {}; c.s.done[topic] = true; c.s.__toldNow = { t: turn(c), topic }; };
const isDone = (c: Ctx, topic: Topic) => !!c.s.done?.[topic];
const planned = (c: Ctx, step: string) => !!c.s.plan?.includes(step) || ["from", "job"].includes(step);
/** The goal (the mission checklist): named, from, job (+ Ximena / free time when asked), asked back, numbers settled. */
function maybeComplete(c: Ctx) {
  if (!c.s.named || !isDone(c, "from") || !isDone(c, "job")) return;
  if ((c.s.plan.includes("know") && !isDone(c, "know")) || (c.s.plan.includes("fun") && !isDone(c, "fun"))) return;
  if (!(c.s.askedBack || c.s.turnSkipped) || !c.s.numbersDone) return;
  c.complete();
}
/** A Marcos question step: "¿Y tú?" if the learner just asked him the same thing. */
function askTopic(c: Ctx, topic: Topic, line: string) {
  c.s.lastTopic = topic;
  if (c.s.backTopic === topic) { c.s.backTopic = null; M(c, "and_you"); return; }
  M(c, line);
}

const countryOf = (id: string): string => CITIES.find((e) => e.id === id)?.attrs?.country ?? id;
const factOf = (id: string): string | undefined => COUNTRIES.find((e) => e.id === countryOf(id))?.attrs?.fact;

/** Marcos reacts to where the learner is from (a country or a city he knows). */
function reactCountry(c: Ctx, id: string, corrected = false) {
  c.s.country = countryOf(id);
  done(c, "from");
  const fact = factOf(id);
  if (fact) {
    if (!corrected) M(c, "country_short", { X: id });
    const later = askedBackToo(c) && !c.s.__deferHeard;
    const ctry = countryOf(id);
    const q = (cc: Ctx) => {
      M(cc, (fact === "cold" ? "cold_q" : "rain_q") + (later ? "_named" : ""), { X: ctry });
      cc.expect({
        id: "sea_q", optional: true, expects: ["visit_invite", "confirm_yes"], hints: ["sea"],
        suggest: [{ lt: "Say yes, or invite him to visit", hint: "sea" }],
        yes: (x) => M(x, fact === "cold" ? "cold_yes" : "rain_yes"),
        no: (x) => M(x, "bad_geography"),
        on: { visit_invite: (x) => M(x, "id_love_to"), confirm_yes: (x) => M(x, fact === "cold" ? "cold_yes" : "rain_yes") },
      });
    };
    deferOrAsk(c, q);
    return;
  }
  if (!corrected) M(c, "country_react", { X: id });
}

const AUTO: Record<string, string> = {
  name: "Hola, soy Ryan. Mucho gusto.",
  drink: "Sí, una limonada, por favor.",
  know: "Trabajamos juntos.",
  from: "Soy de Estados Unidos.",
  sea_q: "¡Sí, muchísimo!",
  city_q: "Está en Canadá.",
  mishear: "No, de Irlanda.",
  job: "Soy maestro.",
  field_q: "Soy enfermero.",
  time: "Como un año.",
  why: "Por el trabajo.",
  like: "Sí, me encanta.",
  fun: "Me gusta nadar.",
  reading: "Una novela de misterio.",
  basketball_q: "¡Claro!",
  cafe: "Todavía no.",
  cafe_go: "¡Me encantaría!",
  your_turn: "¿Y tú qué haces en tu tiempo libre?",
  drink2: "No, gracias, estoy bien.",
  numbers: "¡Claro! Es el 998 123 4567.",
  ask_number: "Es el 998 123 4567.",
  closing: "¡Igualmente! ¡Nos vemos!",
  howareyou: "Bien, gracias, ¿y tú?",
};

// ---------------------------------------------------------------------------

export const party: SituationDef = {
  id: "s63-party",
  song: 63,
  songTitle: "So, Where Are You From?",
  title: { en: "¿Y tú de dónde eres?", lt: "So, Where Are You From?" },
  topic: { en: "Conocer gente nueva", lt: "Meeting new people" },
  chapter: 5,
  order: 1,
  location: "sophies-house",
  npc: "sophie",
  npcs: ["mark"],
  goal: "Meet Marcos at Ximena's carne asada: introduce yourself, tell him about you, ask him about himself and swap numbers.",
  intro: "Saturday afternoon, a carne asada in Ximena's backyard. Ximena wants you to meet her friend Marcos. At a party everyone says tú. Tell him about yourself, and don't forget to ask him too (“¿Y tú?”).",
  entities: { country: COUNTRIES, city: CITIES, job: JOBS, field: FIELDS, hobby: HOBBIES, drink: DRINKS, food: FOOD },

  grammar: {
    macros: {
      greet0: "(hola | que onda | que tal | buenas | buenas tardes | buenas noches | hola que tal | mucho gusto | encantado | encantada | un gusto | igualmente)",
      nice: "(mucho gusto | encantado | encantada | un gusto | un placer | igualmente)",
      art: "[el | la | los | las | un | una | unos | unas | mi | mis]",
      freq: "[(los fines de semana | el fin de semana | todos los fines de semana | todos los dias | todas las mananas | todas las tardes | cada manana | diario | a diario | en las mananas | en las tardes | a veces | seguido | mucho | cuando puedo | cuando tengo tiempo | en mi tiempo libre | aqui | en la playa | en el malecon)]",
      when_pre: "(en mi tiempo libre | los fines de semana | el fin de semana | en las tardes | en las mananas | despues del trabajo | cuando puedo | cuando tengo tiempo)",
      with_who: "[con (mis amigos | mis amigas | mi familia | mis hijos | mi pareja | mi esposo | mi esposa | mi novio | mi novia | mi perro)]",
      tu: "[y] [tu | a ti]",
      here: "[aqui | en puerto colibri | en el pueblo | en mexico]",
      amigo: "(amigo | amiga | amigos | amigas | buena amiga | gran amiga | vieja amiga | mejor amiga | buen amigo | gran amigo | viejo amigo | mejor amigo)",
      reason_sea: "(el mar | la playa | el clima | el calor | el sol | la naturaleza | los cenotes | la tranquilidad | la gente | la comida | la cultura | el ambiente | todo)",
      tel: "(numero | cel | celular | whatsapp | telefono | numero de telefono | numero de celular | wasap)",
    },
    slots: {
      dur: { fn: durSlot },
      pname: { fn: pnameSlot },
      hv: { lexicon: HOBBY_VERBS },
      duty: { lexicon: DUTIES },
      nat: { lexicon: NATIONALITIES },
      month: { lexicon: MONTHS.map((m, i) => ({ id: String(i + 1), forms: [m] })) },
      cls: { lexicon: [
        { id: "dance", forms: ["baile", "salsa", "bachata", "cumbia", "danza", "tango"] }, { id: "yoga", forms: ["yoga", "pilates"] },
        { id: "cooking", forms: ["cocina"] }, { id: "language", forms: ["espanol", "ingles", "idiomas"] },
        { id: "art", forms: ["arte", "pintura", "ceramica", "dibujo"] }, { id: "fitness", forms: ["spinning", "crossfit", "zumba", "box"] },
        { id: "music", forms: ["musica", "guitarra", "canto"] }, { id: "swimming", forms: ["natacion", "buceo", "surf"] },
      ] },
      hobbies: { pattern: "@art {hobby} [(y | e | o) @art {hobby}] [(y | e) @art {hobby}]" },
    },
  },

  intents: {
    // --- names -------------------------------------------------------------------------------
    // A bare "Soy …" is a name only with a greeting around it (or at the name step, name_ctx): "Soy enfermera" is a job.
    intro_name: { patterns: [
      "@greet0 [marcos] (soy | yo soy | me llamo | mi nombre es) {name} [@nice] #h:i_im",
      "[marcos] (me llamo | mi nombre es) {name} [@nice | y tu | y tu como te llamas] #h:i_name",
      "(me llamo | soy) {name} [y] (mucho gusto | encantado | encantada | un placer | un gusto)",
      "[@greet0] (me llamo | soy) {name} [y] [soy | vengo] de ({country} | {city}) #from",
      "[@greet0] (dime | me dicen | puedes decirme | llamame) {name}",
    ] },
    name_ctx: { patterns: ["{name:pname}", "(soy | yo soy) {name}", "[yo] soy {name} [y tu]", "{name} [@nice]"] },
    nice_meet: { patterns: [
      "[hola] [marcos] @nice [marcos] #h:i_nice", "(mucho gusto | encantado | encantada | un gusto | un placer) [de] conocerte", "(que | me da) gusto conocerte",
      "igualmente mucho gusto", "el gusto es mio", "hola [marcos] (mucho gusto | que tal | como estas)",
    ] },
    ask_name: { patterns: ["[perdon] (como te llamas | como se llama usted | cual es tu nombre | como dijiste que te llamas)", "y tu eres", "[perdon] como dijiste"] },

    // --- drinks and food ------------------------------------------------------------------------
    drink_ans: { patterns: [
      "[si] (me das | me puedes dar | me pasas | me sirves | me traes | dame | ponme | me pone | me pones) [un vaso de | una copa de | otra | otro] {drink} #h:d_can",
      "[si] (quiero | quisiera | me gustaria | me encantaria | voy a querer | prefiero | mejor | se me antoja) [un vaso de | una copa de | otra | otro] {drink}",
      "[si] [solo | nada mas | nomas] [un | una | otra | otro | un vaso de | una copa de] {drink} [porfa] #h:d_just",
      "[si] [un | una] {drink} (estaria | esta) (bien | muy bien | perfecto | perfecta | genial) #h:d_would",
      "[si] (tienes | tienen | hay | tendras) {drink}",
      "[si] (lo que sea | lo que tengas | lo que haya | cualquier cosa | lo mismo que tu | lo mismo que ustedes | lo que tu estes tomando | lo que tu tomes | lo que tomes | lo mismo que tu tomas | sorprendeme) #any",
      "no (tomo | bebo) [alcohol] [asi que | entonces] [mejor] [un | una] {drink}",
      "no (tomo | bebo | quiero) {neg:drink} [pero] [mejor] [(me das | tienes | hay | quiero)] [un | una] {drink}",
      "[un | una] {neg:drink} no [mejor | pero | sino] [un | una] {drink}", "no {neg:drink} (sino | mejor) [un | una] {drink}",
      "[si] (me das | dame | quiero | se me antoja | un | una | unos | unas) {food} #food",
      "[si] (tienes | hay) {food} #food", "[si] [solo | nada mas] (un | una | unos | unas) {food} [porfa] #food",
    ] },
    drink_menu: { patterns: ["(tienes | tienen | hay) algo sin alcohol #soft", "(que | cual) (tienes | tienen | hay) sin alcohol #soft", "que (tienes | tienen | hay) [de tomar | para tomar | de beber | para beber]", "que (bebidas | cosas) (tienes | hay)", "que me recomiendas", "que estan tomando"] },
    drink_no: { patterns: [
      "[no] [gracias] [ahorita | por ahora | ahora] (estoy bien | asi estoy bien | todo bien | ya tengo | ya tengo algo | todavia tengo | ya estoy servido | ya estoy servida) #h:d_no",
      "[no] [gracias] ya tengo mi (cerveza | bebida | vaso | refresco | agua | trago)",
      "(ahorita | ahora | por ahora | por el momento) no [gracias]", "mejor no [gracias]",
      "[no] [gracias] no (tomo | bebo) [alcohol | nada de alcohol] #noalc",
      "no (puedo | debo) tomar [hoy | ahorita] #noalc", "(vengo | voy | ando) manejando [y] [no puedo tomar] #noalc",
      "no (quiero | tomo) {drink} #noalc", "no quiero (otra | otro | mas | nada [mas] | nada de tomar)", "[no] [gracias] ya (tomé | bebí) (mucho | suficiente | bastante)", "[no] [gracias] (estoy | ya estoy) (lleno | llena | satisfecho | satisfecha)", "[no] [gracias] ya (comí | cené) [mucho | bastante | suficiente]",
    ] },
    drink2_yes: { patterns: ["[si] (otra | otro | otra igual | lo mismo | la misma | otra ronda | otra por favor) [porfa]", "[si] otra (cerveza | chela | igual) [porfa]"] },
    cheers: { patterns: ["(salud | salucita | chin chin | arriba abajo al centro y pa dentro)"] },

    // --- how they know Ximena --------------------------------------------------------------------
    know_ans: { patterns: [
      "trabajamos (juntos | juntas) #work #h:k_work", "[ella | ximena] (es | era) mi (companera | jefa | colega | companera de trabajo) [de trabajo] #work",
      "(trabajo | trabajaba) con (ella | ximena) #work", "[nos conocemos] del (trabajo | la oficina) #work", "(nos conocimos | la conocí) en el trabajo #work",
      "somos (companeros | companeras | colegas) [de trabajo] #work",
      "trabajamos en (la misma empresa | el mismo lugar | la misma oficina | el mismo hotel | el mismo restaurante | la misma escuela | el mismo hospital) #work",
      "somos (vecinos | vecinas) #neigh #h:k_neigh", "(es | ella es) mi (vecina | vecinita) #neigh", "(vivo | vivimos) (al lado | enfrente | en la misma calle | en el mismo edificio | cerca | a la vuelta) #neigh",
      "(ella | ximena) vive (al lado | enfrente | cerca | en mi calle) #neigh", "del (barrio | vecindario | edificio) #neigh", "le (rento | rentamos) [un departamento | un cuarto] #neigh",
      "(nos conocimos | la conocí) en (una | la) clase de {cls} #class #h:k_class", "de (la | una) clase de {cls} #class", "en (la | una) clase de {cls} #class",
      "(vamos | estamos) (a | en) (la misma | una) clase de {cls} [juntos | juntas] #class", "(tomamos | hacemos) (clase de)? {cls} (juntos | juntas) #class",
      "(es | ella es) (mi | una) @amigo [de hace anos | de la escuela | de la universidad] #friends #h:k_friend", "somos @amigo [desde hace (anos | mucho tiempo) | de hace anos | desde la escuela | desde ninos] #friends",
      "(nos conocemos | la conozco) (desde | de) (hace anos | hace mucho | la escuela | la universidad | la prepa | ninos | chicos) #friends", "desde (la escuela | la universidad | la prepa | ninos | chicos) #friends",
      "(una amiga | un amigo | mi esposo | mi esposa | mi pareja | mi novio | mi novia) me (invitó | trajo) #friends", "(ella | ximena) me invitó #friends",
      "(nuestros hijos | nuestros ninos) van a la misma escuela #friends", "(del | de el) gimnasio #friends", "de la iglesia #friends",
      "(nos conocimos | la conocí) en (una fiesta | el gimnasio | la playa | un bar | el mercado | la iglesia | un concierto | la escuela | un viaje | internet) #friends",
      "por (una amiga | un amigo | mi esposo | mi esposa | mi pareja | un amigo en comun | una amiga en comun) #friends",
      "es amiga de (mi esposo | mi esposa | mi pareja | una amiga | un amigo) #friends", "soy [su | un | una] @amigo [de (ximena | ella)] #friends",
      "soy [su] (vecino | vecina) [de (ximena | ella)] #neigh", "soy [su] (companero | companera | colega) [de trabajo] [de (ximena | ella)] #work",
      "[la verdad] no la conozco [muy bien | mucho | bien | todavia] #none", "la acabo de conocer #none", "(apenas | hoy) la conocí #none", "nos acabamos de conocer #none",
      "no conozco a nadie [aqui] [todavia] #none", "(es | esta es) mi primera vez aqui #none",
    ] },

    // --- where from ------------------------------------------------------------------------------
    from_ans: { patterns: [
      "(soy | somos) [originalmente] de {country} [pero (vivo | vivia | vivi) en {c2:country}] #h:fr_from", "(vengo | venimos) de {country} #h:fr_come",
      "(naci | nacimos) en {country} [pero (vivo | vivia | vivi | creci) en ({c2:country} | {c2city:city})]", "(naci | nacimos) en {country} [pero (vivo | vivia | vivi | creci) en] {city}",
      "(creci | vivia) en {country}",
      "(soy | somos) [originalmente] de {city} [en {country} | {country}] #h:fr_city", "(soy | somos) de {city} (que esta | esta) en {country}",
      "(soy | somos | vengo) de un (pueblo | pueblito | pueblo pequeno | pueblo chico | lugar | ciudad) [pequeno | pequena | chico | chica | grande] (en | cerca de | de) ({country} | {city})",
      "(soy | somos) de {country} de {city}", "(soy | somos) {country:nat}", "mi pais [de origen] es {country}",
      "no soy de {bad:country} (soy | sino | vengo) de {country}", "(vivo | vivimos) aqui pero (soy | somos) de {country}",
    ] },
    from_ctx: { patterns: ["[de] {country}", "[de] {city}", "de {country} de {city}", "{city} {country}", "{country:nat}"] },
    city_country: { patterns: [
      "[esta | queda] (en | cerca de) {country} #h:city_in", "[esta | queda] cerca de {city}", "[es] (la capital | una ciudad | un pueblo | una ciudad grande | una ciudad pequena) (de | en) {country}",
      "[esta | queda] en el (norte | sur | este | oeste | centro) de {country}", "es una ciudad (en | de) el (norte | sur | este | oeste | centro) de {country}",
    ] },
    correct_country: { patterns: [
      "[no] no de {bad:country} [sino] de {country} #h:mh_not", "no [no] [soy] de {country} #h:mh_no", "no {country} [no {bad:country}]", "{country} no {bad:country}",
      "no [no] [de] {bad:country} no [sino] [de] {country}", "[no] dije {country}", "(ja | jaja | jeje) no [no] [soy] [de] {country} [no [de] {bad:country}]", "[no] [de] {country} no [de] {bad:country}", "[perdon] (dije | soy de) {country} no {bad:country}",
    ] },
    confirm_yes: { patterns: [
      "[si] (eso | asi) es", "[si] exacto", "[si] (correcto | de ahi | de alli)", "[si] (mucho | muchisimo | demasiado | bastante | un poco) [frio] #h:sea_yes",
      "[si] (llueve | hace frio) [mucho | muchisimo | todo el tiempo | casi siempre]", "[si] tienes razon", "[si] (mucho | muchisima) lluvia", "[si] hace (mucho | muchisimo | un) frio [en invierno]", "[si] en [el] invierno [si | mucho | muchisimo]", "(mas o menos | depende | a veces)",
    ] },
    visit_invite: { patterns: [
      "[si] tienes que (ir | visitar | conocer) [algun dia | un dia | en verano | en invierno] #h:sea_visit", "(deberias | tendrias que) (ir | visitar | conocerlo | conocerla)",
      "(ven | vente) a visitarme [algun dia]", "es muy (bonito | bonita | lindo | linda) [alla]", "te va a encantar", "vas a tener que ir [algun dia]",
    ] },

    // --- work -----------------------------------------------------------------------------------
    job_ans: { patterns: [
      "[yo] soy {job} [de profesion] [aqui | ahora | ahorita | aqui en el pueblo] #h:j_im", "soy (un | una) {job} #tip:job_article",
      "(trabajo | estoy trabajando) (como | de) {job} [aqui] #h:j_work_as",
      "(soy | trabajo como | trabajo de) {job} (en | para) [un | una | el | la] ({field} | empresa | compania) [de {country} | estadounidense | canadiense | grande | pequena | chica | de aqui]",
      "mi (trabajo | profesion) es [de] {job}", "de profesion soy {job}",
      "(trabajo | estoy trabajando) en [un | una | el | la] {field} [aqui | en el centro] #field #h:j_field", "(me dedico a | trabajo en) [el | la] {field} #field",
      "[yo] {duty} [en [un | una] {field}]", "(mi trabajo es | me dedico a) {duty}",
      "(trabajo | estoy trabajando) (desde casa | en casa | en linea | por internet | de forma remota | remoto | a distancia | desde aqui) [para (una empresa | un cliente | clientes) [de {country} | estadounidense | canadiense | extranjera | de alla]] #remote #h:j_remote",
      "(trabajo | estoy trabajando) para (una empresa | un cliente | clientes | una compania) [de {country} | estadounidense | canadiense | extranjera | de alla | americana | inglesa] (desde casa | en linea | de forma remota | remoto | por internet) #remote", "soy nomada digital #remote", "(trabajo | puedo trabajar) desde cualquier (lugar | parte) #remote", "tengo un trabajo remoto #remote", "soy freelance #remote",
      "soy {job} y trabajo (desde casa | en linea | de forma remota | por internet) #remote", "[no] no soy {neg:job} [sino] [que] [soy] {job}", "ya no soy {neg:job} (ahora | ahorita) soy {job}",
      "(estoy | ya estoy) (jubilado | jubilada | retirado | retirada | pensionado | pensionada) #retired #h:j_retired",
      "(soy | ya soy) (jubilado | jubilada | pensionado | pensionada | retirado | retirada) #retired", "ya no trabajo [estoy (jubilado | jubilada)] #retired", "[ya] me (jubilé | retiré) [el ano pasado | hace {dur}] #retired",
      "(ya no soy | antes era | antes fui) {neg:job} [ahora | pero ya] (estoy | soy) (jubilado | jubilada | pensionado | pensionada | retirado | retirada) #retired",
      "(estoy | ando) buscando (trabajo | chamba | empleo | un trabajo nuevo | un trabajo aqui) #looking #h:j_looking",
      "(ahorita | ahora | por ahora | por el momento) no (trabajo | tengo trabajo) #looking", "no tengo trabajo [ahorita | ahora | todavia] #looking",
      "estoy (desempleado | desempleada | sin trabajo | entre trabajos) #looking", "no trabajo [ahorita | ahora] #looking",
      "soy ama de casa #home", "me dedico (al hogar | a mi casa | a mi familia | a mis hijos) #home", "(cuido | me encargo de) (a mis hijos | a mis ninos | la casa | a mi familia) #home",
      "tengo (mi propio negocio | mi negocio | una empresa | mi propia empresa | una tienda | un restaurante | un hotel | un hostal | una cafeteria | un bar) [aqui | en el centro | en la playa] #own",
      "soy (dueno | duena) de (un | una) (negocio | tienda | restaurante | hotel | hostal | cafe | bar) #own", "trabajo por mi cuenta #own", "soy (emprendedor | emprendedora | empresario | empresaria) #own",
      "estudio [espanol | en la universidad | medicina | arquitectura | ingles] #student", "estoy estudiando [espanol | en la universidad] #student",
      "trabajo con (computadoras | gente | ninos | numeros | clientes | turistas | pacientes | animales | datos) #generic",
      "hago (marketing | mercadotecnia | ventas | diseno | contabilidad | investigacion) #generic",
    ] },
    job_ctx: { patterns: ["[un | una] {job}", "[en] [un | una | el | la] {field}", "{duty}"] },

    // --- how long here, why ---------------------------------------------------------------------
    time_ans: { patterns: [
      "[ya] (llevo | tengo) {dur} [aqui | en puerto colibri | viviendo aqui | en mexico] #h:t_dur", "{dur} [aqui]",
      "(hace | desde hace) {dur} [que (vivo | estoy) aqui]", "(vivo | estoy) aqui (desde hace | hace) {dur}",
      "(llegué | me mudé | vine | llegamos | nos mudamos) [aqui | a puerto colibri] hace {dur}",
      "(llegué | me mudé | vine | llegamos | nos mudamos) [aqui] en {month} #since", "desde {month} #since #h:t_since",
      "desde (el ano pasado | el verano pasado | el invierno pasado) #y1", "(llegué | me mudé | vine) (el ano pasado | el verano pasado) #y1",
      "(acabo de | acabamos de) (llegar | mudarme | mudarnos) [aqui] #short #h:t_just", "(apenas | recien) (llegué | me mudé | llegamos | nos mudamos) #short",
      "(poco tiempo | no mucho | muy poco | muy poco tiempo | no mucho tiempo | no tanto) [{dur}] #short",
      "(llegué | me mudé) (la semana pasada | ayer | este mes | hace poco | hace unos dias) #short", "hace poco [tiempo] #short", "toda mi vida #life", "(mucho tiempo | muchos anos) #yfew",
      "(nada mas | solo | nomas) (estoy | vine) de (visita | vacaciones) [(por | unos) {dur}] #visit", "estoy (de visita | de vacaciones) [(por | unos) {dur}] #visit", "(vine | estoy aqui) de (vacaciones | visita) [(por | unos) {dur}] #visit",
      "(voy a estar | me quedo) [aqui] {dur} #visit", "(he estado | estoy) aqui por {dur} #tip:llevo",
    ] },
    why_ans: { patterns: [
      "(por | vine por) (el | mi) trabajo #work #h:w_work", "(vine | me mudé) (a | para) trabajar [aqui] #work", "me (ofrecieron | dieron) (un | una)? (trabajo | chamba | puesto) [aqui] #work",
      "(mi empresa | mi trabajo) me (mandó | trajo) [aqui] #work", "por (la | mi) chamba #work",
      "por @reason_sea [y @reason_sea] [y @reason_sea] #sea #h:w_sea", "(me gustó | me encantó) [mucho] [el pueblo | el lugar | aqui | cuando vine | la primera vez] #sea", "me (encanta | gusta | encantan | gustan) @reason_sea [y @reason_sea] [y @reason_sea] #sea",
      "(queria | quiero) vivir (cerca del mar | en la playa | en un lugar tranquilo | en un lugar calido | aqui) #sea", "aqui es muy (tranquilo | bonito) #sea",
      "(no me gusta | odio | estaba (cansado | cansada) de) (el frio | el invierno) #sea",
      "por amor #love #h:w_love", "por (mi esposo | mi esposa | mi pareja | mi novio | mi novia | mi familia | mis hijos) #love", "(mi esposo | mi esposa | mi pareja | mi novio | mi novia) es (de aqui | mexicano | mexicana) #love",
      "(vine | me mudé) con (mi esposo | mi esposa | mi pareja | mi familia | mi novio | mi novia) #love", "(mi familia | mis hijos | mi hija | mi hijo) (vive | viven) aqui #love",
      "(vine | estoy aqui) (a | para) (aprender | estudiar | practicar) espanol #spanish #h:w_spanish", "(quiero | queria) aprender espanol #spanish", "para aprender espanol #spanish",
      "me (jubilé | retiré) [y (queria | quiero) vivir (cerca del mar | en la playa | en un lugar tranquilo | aqui)] #retire #h:w_retire",
      "(queria | necesitaba | buscaba) un cambio [de vida] #change #h:w_change", "(por | para) (cambiar de vida | un cambio | una aventura) #change",
      "(queria | quise) (una aventura | algo diferente | vivir en otro pais) #change",
      "(puedo | podia) trabajar desde cualquier (lugar | parte) #remote", "por el trabajo remoto #remote",
      "(nada mas | solo) (estoy | vine) de (vacaciones | visita) #visit", "de (vacaciones | visita) #visit",
    ] },

    // --- liking it ----------------------------------------------------------------------------------
    like_yes: { patterns: [
      "[si] [me] (encanta | gusta | gusta mucho | encanta mucho | fascina) [mucho] [vivir aqui | el pueblo | puerto colibri | aqui | todo] [hasta ahora] #h:l_love",
      "[si] (es | esta) [muy | super | bien] (bonito | lindo | tranquilo | padre | padrisimo | hermoso | precioso | agradable | relajado | increible | genial) [aqui | el pueblo]",
      "[si] (la comida | el mar | la playa | el pueblo | la gente | todo) (es | esta) [muy | super] (deliciosa | deliciosa | rica | riquisima | increible | hermosa | hermoso | preciosa | precioso | bonita | bonito | amable | buenisima | buena onda)",
      "[si] la gente es [muy | super | bien | tan] (amable | buena onda | linda | simpatica | agradable) [aqui] #h:l_people",
      "[si] (estoy | me siento) [muy | super] (feliz | contento | contenta | a gusto | como en casa) [aqui]", "[si] (hasta ahora | por ahora) (todo bien | muy bien | me encanta)",
      "[si] (me encanta | me gusta) [mucho] (el mar | la playa | la comida | la gente | el clima | el pueblo) [de aqui]", "mejor de lo que (pensaba | esperaba)",
      "[si] (me encanta | me gusta) [mucho] [es] (muy)? (tranquilo | bonito)",
    ] },
    like_mixed: { patterns: [
      "[si] [me gusta | me encanta | es bonito] pero (extrano | echo de menos) (a mi familia | mi casa | a mis amigos | mi pais | mi familia | mi ciudad) #h:l_miss",
      "(extrano | echo de menos) (a mi familia | mi casa | a mis amigos | mi pais | mi familia | mi ciudad)",
      "[si] [me gusta | me encanta | es bonito | esta bonito] (pero | aunque) (que calor | hace (mucho | demasiado | un) calor | el calor | hay muchos mosquitos | los mosquitos) #heat #h:l_heat",
      "[me gusta pero] (hace | es) demasiado calor [para mi] #heat",
      "(es | esta) (un poco | algo) caro", "no me encanta",
      "todavia me estoy acostumbrando", "(es | todo es) (diferente | muy diferente | un cambio grande)", "[si] (pero | aunque) (todo es caro | es caro | el sargazo | hay mucho sargazo | el ruido)",
    ] },
    // the like step's short answers ("Muchísimo", "Más o menos"): they mean something else elsewhere
    like_ctx: { patterns: ["[si] (mucho | muchisimo | bastante | claro | por supuesto) [me gusta] #pos", "(mas o menos | asi asi | regular | no esta mal | no esta tan mal | ahi va | ahi vamos) #mixed"] },
    like_no: { patterns: [
      "no me gusta [mucho | tanto | nada] [vivir aqui | aqui | el pueblo]", "(es | esta) muy (caro | aburrido | dificil) [aqui | para mi]", "(todo es | la vida es) (muy | demasiado)? caro [aqui]",
      "no me (acostumbro | puedo acostumbrar)", "(quiero | me quiero) (regresar | ir) [a mi pais | a casa]",
    ] },

    // --- free time ----------------------------------------------------------------------------------
    fun_ans: { patterns: [
      "(me gusta | me encanta | me gusta mucho | disfruto | me fascina | amo) {hobbies} @freq @with_who #h:f_like",
      "(juego | practico) {hobbies} @freq @with_who #h:f_play", "toco {hobbies} @freq #h:f_instr", "hago {hobbies} @freq @with_who #h:f_do",
      "@when_pre [me gusta | me encanta] {hobbies} @freq", "@when_pre [yo] {hv} [y {hv}] [y {hv}] @freq", "@when_pre (juego | hago | toco) {hobbies} @freq",
      "[yo] {hv} [y | e] {hv} [[y | e] {hv}] @freq #h:f_verbs", "[yo] {hv} @with_who (los fines de semana | todos los fines de semana | todos los dias | todas las mananas | todas las tardes | diario | en las mananas | en las tardes | seguido | mucho)",
      "mi (pasatiempo | hobby) [favorito] es {hobbies}", "mis (pasatiempos | hobbies) son {hobbies}",
      "me gusta (pasar tiempo | estar) con (mi familia | mis hijos | mis amigos | mi pareja | mi perro | mis nietos) #other",
      "me gusta (estar en casa | la naturaleza | estar al aire libre | conocer gente) #other",
    ] },
    fun_ctx: { patterns: ["{hobbies}", "[yo] {hv} [y {hv}]"] },
    fun_none: { patterns: [
      "(nada especial | nada en especial) [la verdad]", "no tengo (mucho | nada de)? tiempo libre", "trabajo mucho",
      "no tengo (pasatiempos | hobbies | tiempo [para nada])", "(solo | nada mas | nomas) (trabajo | duermo | descanso)", "me gusta descansar",
    ] },
    fun_none_ctx: { patterns: ["(nada | no mucho) [la verdad]"] },
    book_ctx: { patterns: [
      "[es | estoy leyendo] (una | un | unos) [novela | libro | historia | cuento | thriller | biografia] [de (misterio | viajes | amor | historia | terror | ciencia ficcion | fantasia | detectives | autoayuda | cocina) | policiaca | romantica | historica | en espanol #es | en ingles | muy buena | muy bueno | interesante | divertida | divertido]",
      "nada (ahorita | ahora | por ahora | en este momento) #h:r_book", "uno de (misterio | viajes | amor | historia)", "(un | una) (libro | novela) (sobre | de) {w:any}",
    ] },

    // --- asking Marcos -----------------------------------------------------------------------------
    ask_back: { patterns: ["(y tu | y a ti | y usted | y tu que tal) [marcos] #h:b_and_you", "y tu que (me cuentas | dices)", "y tu marcos"] },
    q_from: { patterns: ["@tu de donde (eres | es usted) [tu] [originalmente] #h:b_from", "@tu eres de aqui", "de donde vienes", "y tu de donde", "de que parte (de mexico | eres)", "eres (mexicano | de aqui)"] },
    q_job: { patterns: [
      "@tu (a que te dedicas | en que trabajas | de que trabajas | donde trabajas | cual es tu trabajo) [tu] #h:b_job", "@tu que haces [tu] (de trabajo | para vivir)",
      "(tu | usted) (a que se dedica | en que trabaja)", "y tu que haces",
    ] },
    q_know: { patterns: [
      "@tu (de donde | como) (conoces | conociste) a ximena #h:b_know", "@tu de donde la conoces", "como (la | se) conocieron", "[y] ustedes (de donde | como) se conocen",
      "(como | de que) os (conoceis | conocisteis)",
    ] },
    q_time: { patterns: [
      "@tu cuanto tiempo (llevas | tienes) [aqui | en puerto colibri]", "@tu hace cuanto (vives | estas | llegaste) aqui", "cuando (llegaste | te mudaste | viniste) [aqui | a puerto colibri]",
      "(tu tambien | tambien) eres nuevo [aqui]", "llevas mucho [tiempo] aqui", "cuanto llevas [aqui | en puerto colibri]",
    ] },
    q_why: { patterns: [
      "@tu que te (trajo | trae) (aqui | por aqui | a puerto colibri) #h:b_why", "@tu por que (viniste | te mudaste) [aqui | a puerto colibri]", "[y] tu por que (estas | vives) aqui",
    ] },
    q_like: { patterns: ["@tu te gusta (vivir aqui | aqui | puerto colibri | el pueblo)", "y a ti te gusta", "que tal (vivir aqui | el pueblo)", "te gusta vivir aqui"] },
    q_fun: { patterns: [
      "@tu que (haces | te gusta hacer) (en tu tiempo libre | para divertirte | los fines de semana) #h:b_fun", "@tu que te gusta hacer",
      "(tienes | cuales son tus) (pasatiempos | hobbies)", "cual es tu (pasatiempo | hobby) [favorito]",
    ] },
    q_reading: { patterns: ["que (estas leyendo | lees)", "te gusta leer", "que libro (estas leyendo | lees)"] },
    q_live: { patterns: ["@tu donde vives", "vives (cerca | por aqui | lejos)", "en que (parte | colonia | calle) vives"] },
    q_chef: { patterns: [
      "te gusta (ser chef | tu trabajo | cocinar)", "que (cocinas | tipo de comida cocinas | haces en el restaurante)", "(cual | que) restaurante", "donde (esta | queda) (el | tu) restaurante",
      "como se llama (el | tu) restaurante", "cual es tu (comida | platillo | plato) favorito #fav", "(tu hiciste | hiciste tu) (la salsa | los tacos | la carne) #salsa", "(tu cocinaste | cocinaste tu) [la carne | los tacos] #salsa",
    ] },
    q_dance: { patterns: ["(sabes | te gusta) bailar", "bailas [salsa]"] },
    q_lithuania: { patterns: ["(has | haz) (ido | estado) (a | en) {country}", "conoces {country}", "(has | haz) viajado a {country}", "(has | haz) salido de mexico"] },

    // --- the new café ------------------------------------------------------------------------------
    cafe_ans_no: { patterns: [
      "[no] todavia no [he ido] #h:c_not_yet", "[no] (no he ido | no lo conozco | no sabia | nunca he ido | no fui) [todavia]", "[no] no sabia que habia (un | otro | uno) [cafe] nuevo",
      "[no] (todavia no | aun no) pero (quiero ir | me gustaria ir | tengo ganas)",
    ] },
    cafe_ans_yes: { patterns: [
      "[si] ya (fui | lo conozco | estuve ahi | fui una vez | fui la semana pasada) #h:c_yes", "[si] (fui | estuve) (ayer | la semana pasada | el fin de semana | una vez | dos veces)",
      "[si] (el | su) (tres leches | pastel | cafe | pan) (esta | estaba) (buenisimo | muy bueno | delicioso | riquisimo | rico)", "[si] [ya fui y] me (encantó | gustó) [mucho]",
      "[si] (fui | estuve | ya fui) (ayer | el sabado | el domingo | la semana pasada | el fin de semana | una vez | dos veces | hace (unos dias | poco))",
    ] },
    cafe_which: { patterns: ["(cual | que) cafe #h:c_which", "donde (esta | queda) (el cafe | ese cafe | el nuevo)"] },
    cafe_where_ctx: { patterns: ["donde (esta | queda)", "cual [de todos]"] },
    agree_go: { patterns: [
      "[si] [claro] me encantaria #h:c_love_to", "(si | claro) vamos", "(suena | se oye) [muy] (bien | padre | genial) #h:c_sounds", "(buena | excelente) idea #h:c_idea",
      "cuando quieras", "(si | claro) [vamos] (el sabado | el domingo | manana | el fin de semana | la proxima semana | un dia de estos | cuando quieras)", "por que no", "me gustaria [mucho] [ir]",
      "(tal vez | quizas | a lo mejor) [algun dia | un dia | otro dia] #maybe",
    ] },

    cafe_no_ctx: { patterns: ["no puedo [esta semana | ahorita | por ahora | estos dias] [lo siento]", "(esta semana | ahorita) no puedo", "mejor otro dia"] },

    // --- numbers -------------------------------------------------------------------------------------
    swap_propose: { patterns: [
      "[oye] (me pasas | me das | me puedes pasar | me puedes dar | me compartes | pasame | dame) tu @tel #h:n_can", "(intercambiamos | nos pasamos | nos damos) (numeros | los numeros | el numero | whatsapp) #h:n_swap",
      "(tienes | usas) (whatsapp | wasap | instagram | facebook)", "(dame | pasame) tu @tel [y te (mando | escribo) (un mensaje | un whatsapp)]", "(cual es | como es) tu @tel", "(te | le) (paso | doy) mi @tel #mine", "(quieres | te paso) mi numero #mine",
      "(te puedo | puedo) agregar (en | a) (instagram | facebook | whatsapp)", "hay que seguir en contacto", "mejor (dame | pasame) (el tuyo | tu numero)",
    ] },
    number_give: { patterns: [
      "[claro] [si] (es el | mi numero es [el] | mi cel es [el] | mi celular es [el] | apuntalo | anota | es) {digits} #h:n_mine", "[claro] (aqui esta | este es) mi @tel {digits}",
      "(me puedes | puedes) (marcar | escribir | mandar mensaje) al {digits}",
    ] },
    number_ctx: { patterns: ["[el] {digits}"] },
    decline_number: { patterns: [
      "(prefiero no | mejor no) (dar | darte | compartir) (mi | el) numero", "no (te | le) (doy | paso) mi numero", "no (doy | comparto) mi numero [a nadie]",
      "[todavia | aun] no tengo (numero | celular | cel | telefono | numero mexicano | numero de aqui | numero de mexico | linea) [mexicano | de aqui | todavia | aun] [pero tengo whatsapp #wa]",
      "(mejor | tal vez) (otro dia | la proxima)", "no me (lo se | se mi numero) [de memoria]", "(mi celular | mi telefono) no (sirve | funciona) aqui",
    ] },

    // --- goodbye and asides ---------------------------------------------------------------------------
    bye_nice: { patterns: [
      "(me dio | que) [mucho] gusto conocerte [tambien] #h:b_great", "(fue | ha sido) un (gusto | placer) [conocerte | platicar contigo]",
      "nos vemos (pronto | luego | despues | un dia de estos | por ahi) #h:b_around", "(espero | ojala) (verte | vernos) (pronto | otra vez | de nuevo)",
      "(gracias | muchas gracias) por (la platica | la conversacion | la invitacion | invitarme)", "(fue | estuvo) [muy] (padre | bonito | agradable) platicar contigo",
      "(igualmente | lo mismo digo) (fue un gusto | que gusto) [conocerte]",
    ] },
    me_neither: { patterns: ["yo tampoco [se bailar]", "(no se | no sé | tampoco se) bailar [nada]"] },
    cute_mark: { patterns: ["(que | ay que) (chistoso | gracioso | curioso | interesante)", "(en serio | de veras | no manches | no inventes)", "(wow | guau)"] },
  },

  lines: {
    // --- Ximena ---------------------------------------------------------------------------------------
    sophie_open: [
      t("¡Hola! | ¡Qué | bueno | que | viniste! | Ven, | te | presento | a | Marcos.", "Hi! | How | good | that | you-came! | Come, | (to) you | I-introduce | — | Marcos.",
        "Hi! So glad you came! Come meet Marcos.", { flags: { 8: PERS_A } }),
    ],
    drink_q: [
      t("¿Te | sirvo | algo | de | tomar?", "(For) you | I-serve | something | of | to-drink?", "Can I get you something to drink?"),
      t("¿Qué | te | sirvo? | Hay | cerveza, | refresco | y | agua | de | jamaica.", "What | (for) you | I-serve? | There's | beer, | soda | and | water | of | hibiscus.",
        "What can I get you? There's beer, soda and hibiscus water."),
    ],
    drink_menu: [
      t("Hay | cerveza, | refresco, | limonada | y | agua | de | jamaica. | ¡Y | tequila, | claro!", "There's | beer, | soda, | lemonade | and | water | of | hibiscus. | And | tequila, | of course!",
        "We have beer, soda, lemonade and hibiscus water. And tequila, of course!"),
    ],
    drink_ok: [
      t("¡Va! | Aquí tienes | {X.np}. | ¡Salud!", "Okay! | Here you go: | {X.np}. | Cheers!", "Sure! Here's {X.np}. Cheers!",
        { flags: { 0: VA }, neutral: t("¡Claro! | Aquí tienes | {X.np}. | ¡Salud!", "Sure! | Here you go: | {X.np}. | Cheers!", "Sure! Here's {X.np}. Cheers!") }),
      t("¡Claro! | Aquí tienes | {X.np}. | ¡Salud!", "Sure! | Here you go: | {X.np}. | Cheers!", "Of course! Here's {X.np}. Cheers!"),
    ],
    drink_pick: [
      t("¡Claro! | Te | traigo | un | agua | de | jamaica. | ¡La | hice | yo!", "Sure! | (For) you | I-bring | a | water | of | hibiscus. | It | made | I!",
        "Sure! I'll get you some hibiscus water. I made it myself!", { flags: { 7: "la = the agua (feminine); Spanish can put the subject (yo) last for emphasis." } }),
    ],
    drink_soft: [
      t("¡Claro! | También | hay | refresco, | limonada | y | agua | de | jamaica. | ¿Qué | te | sirvo?", "Sure! | Also | there's | soda, | lemonade | and | water | of | hibiscus. | What | (for) you | I-serve?",
        "Sure! There's also soda, lemonade and hibiscus water. What can I get you?"),
    ],
    drink_no: [
      t("¡Está bien! | Si | quieres | algo, | nada más | me | dices.", "Okay! | If | you-want | something, | just | (to) me | you-tell.", "Okay! If you want anything, just let me know."),
    ],
    sophie_bye: [
      t("¿Ya | te vas? | ¡Gracias | por | venir!", "Already | you're-leaving? | Thanks | for | coming!", "Leaving already? Thanks for coming!"),
      t("¿Ya | te vas? | ¡Llévate | unos | taquitos | para | el | camino!", "Already | you're-leaving? | Take | some | little tacos | for | the | road!",
        "Leaving already? Take some tacos for the road!", { flags: { 4: "taquitos: a diminutive, warm and friendly (little tacos)." } }),
    ],

    // --- Marcos: hello ---------------------------------------------------------------------------------
    mark_hi: [
      t("¡Hola! | Soy | Marcos.", "Hi! | I'm | Marcos.", "Hi! I'm Marcos."),
      t("¡Hola, | qué tal! | Yo | soy | Marcos.", "Hi, | how's it going! | I | am | Marcos.", "Hey, how's it going! I'm Marcos."),
    ],
    nice: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!"), t("¡Encantado!", "Delighted!", "Great to meet you!")],
    nice_too: [t("¡Igualmente!", "Likewise!", "Nice to meet you, too!")],
    whats_name: [
      t("Perdón, | ¿cómo | te llamas?", "Sorry, | how | are-you-called?", "Sorry, what's your name?"),
      t("¿Y | tú | eres…?", "And | you | are…?", "And you are…?"),
    ],
    mark_name: [t("¡Soy | Marcos!", "I'm | Marcos!", "I'm Marcos!")],
    cheers_back: [t("¡Salud!", "Cheers!", "Cheers!")],

    // --- how they know Ximena -----------------------------------------------------------------------------
    know_q: [
      t("¿Y | tú | de | dónde | conoces | a | Ximena?", "And | you | from | where | you-know | — | Ximena?", "So how do you know Ximena?", { flags: { 6: PERS_A } }),
      t("¿Y | cómo | conociste | a | Ximena?", "And | how | did-you-meet | — | Ximena?", "So how did you meet Ximena?", { flags: { 4: PERS_A } }),
    ],
    and_you: [t("¿Y | tú?", "And | you?", "And you?")],
    know_work: [t("¡Ah, | qué | bien! | Entonces | trabajan | {m:juntos|f:juntas}.", "Oh, | how | nice! | So | you-work | together.", "Oh, nice! So you work together.")],
    know_neigh: [t("¡Ah, | mira! | ¡Son | {m:vecinos|f:vecinas}!", "Oh, | look! | You're | neighbors!", "Oh, cool! Neighbors!")],
    know_dance: [
      t("¡No te creo! | ¡Nosotros | también | nos conocimos | en | una | clase | de | baile!", "No way! | We | also | met | in | a | class | of | dance!", "No way! We met at a dance class too!"),
    ],
    know_class: [t("¡Ah, | qué | divertido!", "Oh, | how | fun!", "Oh, fun!")],
    know_friends: [t("¡Ah, | qué | bien!", "Oh, | how | nice!", "Oh, nice."), t("¡Ah, | mira!", "Oh, | look!", "Oh, cool!")],
    know_none: [t("¡Ja! | Bueno, | ¡ahora | ya | me | conoces!", "Ha! | Well, | now | already | me | you-know!", "Ha! Well, now you know me!")],
    mark_know: [
      t("Ximena | y | yo | nos conocimos | en | una | clase | de | salsa, | ¡pero | yo | no sé | bailar | nada!", "Ximena | and | I | met | in | a | class | of | salsa, | but | I | don't know-how | to-dance | at all!",
        "Ximena and I met at a salsa class, but I can't dance at all!"),
    ],
    here_to_dancing: [t("¡Ja! | ¡Salud | por | los | que | no sabemos | bailar!", "Ha! | Cheers | to | those | who | don't know-how | to-dance!", "Ha! Here's to those of us who can't dance!", { flags: { 3: "los que = those who." } })],

    // --- where from --------------------------------------------------------------------------------------
    from_q: [
      t("¿Y | tú | de | dónde | eres?", "And | you | from | where | are-you?", "So where are you from?"),
      t("Cuéntame, | ¿de | dónde | eres?", "Tell me, | from | where | are-you?", "So tell me, where are you from?"),
    ],
    country_react: [
      t("¡Ah, | de | {X}! | ¡Qué | padre! | Nunca | he | ido.", "Oh, | from | {X}! | How | cool! | Never | I-have | gone.", "Oh, {X}! Cool! I've never been.",
        { flags: { 4: PADRE }, neutral: t("¡Ah, | de | {X}! | ¡Qué | bien! | Nunca | he | ido.", "Oh, | from | {X}! | How | nice! | Never | I-have | gone.", "Oh, {X}! Nice! I've never been.") }),
      t("¡De | {X}! | Me encantaría | conocer | algún | día.", "From | {X}! | I'd love | to-visit | some | day.", "{X}! I'd love to go someday.",
        { flags: { 3: "conocer a place = to visit it, to see it." } }),
    ],
    country_short: [t("¡Ah, | {X}!", "Oh, | {X}!", "Oh, {X}!")],
    cold_q: [t("Allá | hace | muchísimo | frío, | ¿no?", "There | it-makes | very much | cold, | right?", "It's really cold there, isn't it?",
      { flags: { 1: "hacer + frío / calor: weather is “made” in Spanish (hace frío = it's cold)." } })],
    rain_q: [t("Allá | llueve | mucho, | ¿verdad?", "There | it-rains | a lot, | right?", "It rains a lot there, right?")],
    // after Marcos has said where he is from, "allá" would point at Mexico City: the country is named
    cold_q_named: [t("¿Y | en | {X} | hace | muchísimo | frío?", "And | in | {X} | it-makes | very much | cold?", "And it's really cold in {X}, isn't it?",
      { flags: { 3: "hacer + frío / calor: weather is “made” in Spanish (hace frío = it's cold)." } })],
    rain_q_named: [t("¿Y | en | {X} | llueve | mucho?", "And | in | {X} | it-rains | a lot?", "And it rains a lot in {X}, right?")],
    cold_yes: [t("¡Uf! | Pues | aquí | nunca | vas | a | pasar | frío.", "Phew! | Well, | here | never | you're-going | to | feel | cold.", "Wow! Well, you'll never be cold here.")],
    rain_yes: [t("¡Ja! | Aquí | también | llueve, | pero | la | lluvia | es | calientita.", "Ha! | Here | also | it-rains, | but | the | rain | is | nice and warm.",
      "Ha! It rains here too, but the rain is warm.", { flags: { 9: "calientita: a diminutive of caliente, “nice and warm”." } })],
    bad_geography: [t("¿Ah, | no? | ¡Ja, | perdón, | no sé | nada | de | geografía!", "Oh, | no? | Ha, | sorry, | I don't know | anything | about | geography!", "Oh, no? Ha, sorry, I'm terrible at geography!")],
    id_love_to: [t("¡Me encantaría!", "I'd love to!", "I'd love to!")],
    city_where: [t("¿Ah, | sí? | ¿Y | eso | dónde | queda?", "Oh, | yes? | And | that | where | is-it?", "Oh yeah? Where's that?",
      { flags: { 5: "quedar = to be (located) somewhere." } })],
    mishear: [t("¿De | {X}? | ¡Qué | interesante!", "From | {X}? | How | interesting!", "{X}? Interesting!")],
    mishear_fix: [
      t("¡Ay, | perdón! | De | {X}. | Con | la | música | no oigo | nada.", "Oh, | sorry! | From | {X}. | With | the | music | I can't hear | anything.", "Oh, sorry! {X}. I can't hear a thing with this music."),
    ],
    mishear_again: [t("Perdón, | ¿de | dónde?", "Sorry, | from | where?", "Sorry, where?")],
    mark_from: [t("Yo | soy | de | la Ciudad de México.", "I | am | from | Mexico City.", "I'm from Mexico City.")],

    // --- work ----------------------------------------------------------------------------------------------
    job_q: [
      t("¿Y | a | qué | te dedicas?", "And | to | what | you-devote-yourself?", "So what do you do?"),
      t("¿Y | tú | en | qué | trabajas?", "And | you | in | what | you-work?", "And what do you do for work?"),
    ],
    job_react: [
      t("¿Ah, | eres | {X}? | ¡Qué | bien!", "Oh, | you-are | {X}? | How | nice!", "Oh, you're {X.np}? Nice!"),
      t("¡Ah, | {X}! | Ha | de | ser | interesante.", "Oh, | {X}! | It-has | to | be | interesting.", "Oh, {X.np}! That must be interesting."),
    ],
    job_chef: [t("¡No te creo! | ¡Yo | también | soy | chef!", "No way! | I | also | am | chef!", "No way! I'm a chef too!")],
    field_q: [t("¡Ah, | qué | bien! | ¿Y | qué | haces | exactamente?", "Oh, | how | nice! | And | what | you-do | exactly?", "Oh, nice! And what do you do exactly?")],
    student_react: [t("¡Ah, | qué | bien! | ¡La | vida | de | estudiante!", "Oh, | how | nice! | The | life | of | student!", "Oh, nice! Student life!")],
    retired_react: [t("¡Qué | bien! | ¡A disfrutar!", "How | nice! | Time to enjoy it!", "Nice! Time to enjoy life!")],
    looking_react: [t("Seguro | que | pronto | encuentras | algo.", "Sure | that | soon | you-find | something.", "I'm sure you'll find something soon.")],
    home_react: [t("¡Eso | es | trabajo | de | tiempo completo!", "That | is | work | of | full time!", "That's a full-time job!")],
    own_react: [t("¡Qué | bien, | tu | propio | negocio!", "How | nice, | your | own | business!", "Wow, your own business! That's great.")],
    remote_react: [t("¡Qué | suerte! | Trabajar | con | vista | al | mar.", "How | lucky! | To-work | with | view | to-the | sea.", "Lucky you! Working with an ocean view.")],
    mark_job: [t("Yo | soy | chef | en | un | restaurantito | del | centro.", "I | am | chef | in | a | little restaurant | of-the | downtown.", "I'm a chef at a little restaurant downtown.",
      { flags: { 6: "-ito: a diminutive (a small, nice place)." } })],
    mark_chef: [
      t("Me encanta, | pero | es | mucha | chamba.", "I love it, | but | it's | a lot of | work.", "I love it, but it's a lot of work.",
        { flags: { 4: CHAMBA }, neutral: t("Me encanta, | pero | es | mucho | trabajo.", "I love it, | but | it's | a lot of | work.", "I love it, but it's a lot of work.") }),
    ],
    mark_salsa: [t("¡Sí, | la | salsa | es | mía! | Es | receta | de | mi | abuela.", "Yes, | the | salsa | is | mine! | It's | recipe | of | my | grandmother.", "Yes, the salsa's mine! It's my grandma's recipe.")],
    mark_fav: [t("¡La | cochinita pibil! | Es | de | aquí, | de | la | península.", "The | cochinita pibil! | It's | from | here, | from | the | peninsula.",
      "Cochinita pibil! It's from here, from the Yucatán.", { flags: { 1: "cochinita pibil: slow-roasted pork in achiote, a Yucatán dish." } })],

    // --- how long, why -------------------------------------------------------------------------------------
    time_q: [
      t("¿Y | cuánto | tiempo | llevas | aquí?", "And | how much | time | you've-been | here?", "And how long have you been here?", { flags: { 4: LLEVAS } }),
      t("¿Y | hace | cuánto | que | vives | en | Puerto Colibrí?", "And | it-makes | how much | that | you-live | in | Puerto Colibrí?", "And how long have you lived in Puerto Colibrí?",
        { flags: { 1: "hace cuánto que…: how long (it has been) since…" } }),
    ],
    time_long: [t("¡Ah, | entonces | llevas | más | que | yo! | Yo | llegué | en | mayo.", "Oh, | so | you've-been-here | more | than | me! | I | arrived | in | May.", "Oh, so you've been here longer than me! I only got here in May.",
      { flags: { 2: LLEVAS } })],
    time_same: [t("¡Como | yo! | Yo | llegué | en | mayo.", "Like | me! | I | arrived | in | May.", "About the same as me! I got here in May.")],
    time_short: [t("¡Ah, | entonces | también | eres | {m:nuevo|f:nueva}! | Yo | llegué | en | mayo.", "Oh, | so | also | you-are | new! | I | arrived | in | May.", "Oh, so you're new too! I got here in May.")],
    time_life: [t("¡Ah, | entonces | eres | de | aquí!", "Oh, | so | you-are | from | here!", "Oh, so you're a local!")],
    time_visit: [t("¡Ah, | nada más | de | visita! | Pues | aprovecha | mucho.", "Oh, | just | on | a visit! | Well, | make-the-most | a lot.", "Oh, just visiting! Well, make the most of it.")],
    mark_time: [t("Yo | apenas | llegué | en | mayo.", "I | only just | arrived | in | May.", "I only got here in May.")],
    why_q: [
      t("¿Y | qué | te | trae | por | aquí?", "And | what | you | it-brings | around | here?", "So what brings you here?"),
      t("¿Y | por qué | Puerto Colibrí?", "And | why | Puerto Colibrí?", "And why Puerto Colibrí?"),
    ],
    why_work: [t("¡Ah, | por | el | trabajo! | Como | yo.", "Oh, | for | the | work! | Like | me.", "Oh, for work! Same as me.")],
    why_sea: [t("¡Te | entiendo! | Con | este | mar, | ¿quién | no?", "(To) you | I-understand! | With | this | sea, | who | not?", "I get it! With this ocean, who wouldn't?")],
    why_love: [t("¡Ay, | el | amor! | ¡Qué | bonito!", "Aw, | the | love! | How | lovely!", "Aw, love! How sweet!")],
    why_spanish: [t("¡Pues | ya | lo | hablas | muy | bien!", "Well | already | it | you-speak | very | well!", "Well, you already speak it really well!")],
    why_retire: [t("¡Qué | buen | lugar | para | descansar!", "What | good | place | for | to-rest!", "What a great place to relax!")],
    why_change: [t("¡Pues | qué | buen | cambio!", "Well | what | good | change!", "Well, what a nice change!")],
    why_visit: [t("¡Qué | bien! | Hay | mucho | que | ver | aquí.", "How | nice! | There's | a lot | to | see | here.", "Nice! There's a lot to see here.")],
    mark_why: [t("Me | ofrecieron | trabajo | aquí… | ¡y | pues, | el | mar!", "(To) me | they-offered | work | here… | and | well, | the | sea!", "I got a job offer here… and, well, the ocean!")],

    // --- liking it -------------------------------------------------------------------------------------------
    like_q: [
      t("¿Y | qué tal? | ¿Te gusta | Puerto Colibrí?", "And | how's it going? | Do you like | Puerto Colibrí?", "So how is it? Do you like Puerto Colibrí?"),
      t("¿Y | te gusta | vivir | aquí?", "And | you like | to-live | here?", "And do you like living here?"),
    ],
    like_yes: [
      t("¡A mí también! | La | gente | es | muy | buena onda.", "Me too! | The | people | are | very | nice.", "Me too! People here are so nice.",
        { flags: { 5: ONDA }, neutral: t("¡A mí también! | La | gente | es | muy | amable.", "Me too! | The | people | are | very | kind.", "Me too! People here are so nice.") }),
    ],
    like_mixed: [t("Te | entiendo. | Yo | también | extraño | la Ciudad de México | a veces.", "(To) you | I-understand. | I | also | miss | Mexico City | sometimes.", "I get it. I miss Mexico City sometimes, too.")],
    like_heat: [t("¡Uf, | sí! | Al | calor | nadie | se acostumbra.", "Phew, | yes! | To-the | heat | nobody | gets-used.", "Ugh, yes! Nobody ever gets used to the heat.")],
    like_no: [t("¡Ay, | no! | Dale | tiempo. | ¡Luego | te acostumbras!", "Oh, | no! | Give-it | time. | Later | you-get-used-to-it!", "Oh no! Give it time. You'll get used to it!")],
    mark_like: [t("¡Me encanta! | Y | el | mar | está | increíble.", "I love it! | And | the | sea | is | amazing.", "I love it! And the ocean is amazing.")],

    // --- free time --------------------------------------------------------------------------------------------
    fun_q: [
      t("¿Y | qué | te gusta | hacer | en | tu | tiempo | libre?", "And | what | you like | to-do | in | your | time | free?", "So what do you like to do in your free time?"),
      t("¿Y | qué | haces | para | divertirte?", "And | what | you-do | for | to-have-fun?", "And what do you do for fun?"),
    ],
    fun_running: [t("¡Qué | bien! | Yo | también | corro, | en | el | malecón.", "How | nice! | I | also | run, | on | the | malecón.", "Nice! I run too, on the malecón.", { flags: { 7: MALECON } })],
    fun_reading: [t("¡A mí también! | Me encanta | leer.", "Me too! | I love | to-read.", "Me too! I love reading.")],
    fun_cooking: [t("¡Ja! | ¡A mí también! | Bueno, | es | mi | trabajo.", "Ha! | Me too! | Well, | it's | my | job.", "Ha! Me too! Well, it's my job.")],
    fun_dancing: [t("¿Bailar? | ¡Qué | valor! | Yo | no sé | bailar | nada.", "To-dance? | What | courage! | I | don't know-how | to-dance | at all.", "Dancing? You're braver than me! I can't dance at all.")],
    fun_hockey: [t("¡Claro! | En | Canadá | todos | juegan | hockey, | ¿verdad?", "Of course! | In | Canada | everyone | they-play | hockey, | right?", "Of course! Everyone in Canada plays hockey, right?")],
    knew_it: [t("¡Lo | sabía!", "It | I-knew!", "I knew it!")],
    fun_diving: [t("¿Bucear? | ¡Aquí | hay | cenotes | increíbles!", "To-dive? | Here | there-are | cenotes | amazing!", "Diving? There are amazing cenotes here!",
      { flags: { 3: "cenote: a natural sinkhole pool, typical of the Yucatán." } })],
    fun_soccer: [t("¡Aquí | el | fútbol | es | casi | una | religión!", "Here | the | soccer | is | almost | a | religion!", "Soccer is almost a religion here!")],
    fun_generic: [
      t("¡Ah, | qué | bien! | Suena | divertido.", "Oh, | how | nice! | It-sounds | fun.", "Oh, cool! That sounds fun."),
      t("¡Qué | bien! | Siempre | he | querido | intentarlo.", "How | nice! | Always | I-have | wanted | to-try-it.", "Nice! I've always wanted to try that."),
    ],
    fun_none: [t("¡Ja, | te | entiendo!", "Ha, | (to) you | I-understand!", "Ha, I know the feeling!")],
    mark_fun: [
      t("Corro | y | cocino, | ¡claro! | Pero | en | mi | casa | nada más | como | quesadillas.", "I-run | and | I-cook, | of course! | But | in | my | house | only | I-eat | quesadillas.",
        "I run, and I cook, of course! But at home I mostly eat quesadillas."),
    ],
    reading_q: [
      t("¿Y | qué | estás leyendo | ahora?", "And | what | are-you-reading | now?", "So what are you reading right now?"),
      t("¿Y | qué | libro | estás leyendo?", "And | what | book | are-you-reading?", "And what book are you reading?"),
    ],
    reading_react: [t("¡Suena | bien!", "It-sounds | good!", "Sounds good!")],
    reading_spanish: [t("¡En | español! | ¡Qué | bien!", "In | Spanish! | How | great!", "In Spanish! Good for you!")],
    mark_reading: [t("Una | novela | de | misterio. | ¡Está | buenísima!", "A | novel | of | mystery. | It-is | really good!", "A mystery novel. It's really good!")],
    mark_live: [t("Cerca | del | mercado, | a | dos | cuadras | del | zócalo.", "Near | of-the | market, | at | two | blocks | from-the | zócalo.", "Near the market, two blocks from the zócalo.",
      { flags: { 7: "zócalo: the main square." } })],
    mark_dance: [t("¡Para nada! | Por eso | me quedo | aquí, | junto | al | asador.", "Not at all! | That's why | I'm-staying | here, | next | to-the | grill.", "Not at all! That's why I'm staying here by the grill.")],
    mark_lithuania: [t("¿Yo? | No, | nunca. | Pero | me encantaría | ir | algún | día.", "Me? | No, | never. | But | I'd love | to-go | some | day.", "Me? No, never. But I'd love to go someday.")],

    // --- the new café (twist) --------------------------------------------------------------------------------
    cafe_q: [t("Oye, | ¿ya | fuiste | al | café | nuevo | del | malecón?", "Hey, | already | did-you-go | to-the | café | new | of-the | malecón?", "Hey, have you been to the new café on the malecón?",
      { flags: { 1: "ya in a question: “yet” / “already”.", 7: MALECON } })],
    cafe_try: [t("¡Tienes | que | ir! | Su | pastel | de | tres leches | está | buenísimo.", "You-have | to | go! | Its | cake | of | tres leches | is | really good.", "You have to go! Their tres leches cake is amazing.",
      { flags: { 6: "tres leches: a sponge cake soaked in three kinds of milk." } })],
    cafe_great: [t("Su | tres leches | está | buenísimo, | ¿verdad?", "Its | tres leches | is | really good, | right?", "Their tres leches is amazing, right?")],
    cafe_which: [t("El | chiquito, | junto | a | la | panadería.", "The | little one, | next | to | the | bakery.", "The little one next to the bakery.")],
    cafe_go_q: [t("¿Y | si | vamos | juntos | un | día | de | estos?", "And | if | we-go | together | one | day | of | these?", "Maybe we could go together sometime?")],
    cafe_go_yes: [t("¡Perfecto! | ¡Vamos!", "Perfect! | Let's go!", "Awesome! Let's do it!")],
    cafe_go_no: [t("No te preocupes.", "Don't worry.", "No worries.")],
    cafe_go_maybe: [t("¡Bueno, | cuando | quieras!", "Well, | whenever | you-want!", "Sure, whenever you like!")],
    mark_cafe_which: [t("¿Un | café | nuevo? | No sé | cuál.", "A | café | new? | I don't know | which.", "A new café? I don't know which one.")],
    mark_cafe: [t("¡Sí, | voy | a cada rato!", "Yes, | I-go | all the time!", "Yes, I go there all the time!")],

    // --- your turn, another drink ------------------------------------------------------------------------------
    your_turn: [t("¡Oye, | yo | nada más | te | hago | preguntas! | Te toca.", "Hey, | I | only | (to) you | I-make | questions! | Your turn.", "Hey, I've been asking all the questions! Your turn.")],
    ask_me: [t("¡Pregúntame | algo!", "Ask me | something!", "Ask me something!")],
    just_tell: [
      t("¡Ja! | Bueno, | te | cuento: | soy | de | la Ciudad de México | y | soy | chef.", "Ha! | Okay, | (to) you | I-tell: | I'm | from | Mexico City | and | I'm | chef.",
        "Ha! Okay, I'll tell you. I'm from Mexico City, and I'm a chef."),
    ],
    drink2_q: [t("¿Te | traigo | otra | cosa | de | tomar? | ¿O | un | taquito?", "(For) you | I-bring | another | thing | of | to-drink? | Or | a | little taco?", "Can I get you another drink? Or a taco?")],
    drink2_ok: [t("¡Claro, | ya | vengo!", "Sure, | right | I'm-back!", "Sure, be right back!", { flags: { 1: "ya vengo: “I'll be right back”." } })],
    food_ok: [
      t("¡Claro! | Ahorita | te | traigo. | ¡Cuidado, | la | salsa | pica!", "Sure! | Right away | (for) you | I-bring. | Careful, | the | salsa | is-spicy!", "Sure! I'll get you some right away. Careful, the salsa's hot!",
        { flags: { 1: AHORITA }, neutral: t("¡Claro! | Ahora | te | traigo. | ¡Cuidado, | la | salsa | pica!", "Sure! | Now | (for) you | I-bring. | Careful, | the | salsa | is-spicy!", "Sure! I'll get you some right away. Careful, the salsa's hot!") }),
    ],
    decline_ok: [t("¡Claro, | no pasa nada!", "Sure, | no problem!", "Sure, no worries!")],

    // --- numbers and goodbye -------------------------------------------------------------------------------------
    time_late: [t("¡Uy, | mira | qué | hora | es! | Ya | casi | son | las | once.", "Oops, | look | what | time | it-is! | Already | almost | it-is | — | eleven.", "Oh, look at the time! It's almost eleven.",
      { flags: { 8: ART_TIME } })],
    get_going: [t("Mañana | trabajo | temprano.", "Tomorrow | I-work | early.", "I have work early tomorrow.")],
    swap_q: [t("Oye, | ¿me | pasas | tu | número? | Hay que | vernos | pronto.", "Hey, | (to) me | you-pass | your | number? | We-should | see-each-other | soon.",
      "Hey, can I get your number? We should get together soon.")],
    swap_reask: [t("Entonces, | ¿me | pasas | tu | número?", "So, | (to) me | you-pass | your | number?", "So, can I get your number?")],
    swap_sure: [t("¡Claro! | ¡Buena | idea!", "Sure! | Good | idea!", "Sure! Good idea.")],
    ask_number: [t("¡Perfecto! | ¿Cuál | es | tu | número?", "Great! | What | is | your | number?", "Great! What's your number?")],
    number_got: [t("¡Listo! | Te | mando | un | mensaje | y | así | tienes | el mío.", "Done! | (To) you | I-send | a | message | and | that way | you-have | mine.", "Got it! I'll text you so you have mine.")],
    mark_number: [t("Mira, | aquí | te lo | apunto | en | una | servilleta.", "Look, | here | it for you | I-write-down | on | a | napkin.", "Here, I'll write it down for you on a napkin.")],
    great_meet: [
      t("¡Qué | gusto | conocerte!", "What | pleasure | to-meet-you!", "It was great to meet you!"),
      t("¡Me | dio | mucho | gusto | conocerte!", "(To) me | it-gave | much | pleasure | to-meet-you!", "It was really nice to meet you!"),
    ],
    see_around: [t("¡Nos vemos!", "See you!", "See you around!"), t("¡Nos vemos | pronto!", "See you | soon!", "See you soon!")],
    howareyou_reply: [t("¡Muy | bien, | gracias!", "Very | well, | thanks!", "Great, thanks!")],
    ha: [t("¡Ja!", "Ha!", "Ha!"), t("¿Verdad?", "Right?", "Right?")],
    ok: [t("¡Qué | bien!", "How | nice!", "Cool."), t("Ah, | mira.", "Oh, | look.", "Oh, nice.")],
  },

  hints: {
    intro: {
      lt: "Introduce yourself",
      items: [
        { id: "i_im", s: t("¡Hola! | Soy | {$name}. | ¡Mucho gusto!", "Hi! | I'm | {$name}. | Nice to meet you!", "Hi, I'm {$name}. Nice to meet you!") },
        { id: "i_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
        { id: "i_nice", s: t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!") },
        { id: "i_nice", s: t("¡Igualmente!", "Likewise!", "Nice to meet you, too!") },
      ],
    },
    drink: {
      lt: "Choose a drink, or say no thanks", slot: "drink", examples: ["beer", "jamaica", "soda", "lemonade"],
      items: [
        { id: "d_can", s: t("¿Me | das | {X.np}?", "(To) me | you-give | {X.np}?", "Can I have {X.np}?"), note: "Very common in Mexico: “¿Me das…?” (to a friend)." },
        { id: "d_just", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "d_would", s: t("{X.np} | estaría | muy | bien, | gracias.", "{X.np} | would-be | very | good, | thanks.", "{X.np} would be great, thanks.") },
        { id: "d_no", s: t("No, | gracias, | estoy | bien.", "No, | thanks, | I-am | fine.", "No, thanks, I'm fine.") },
      ],
    },
    know: {
      lt: "Say how you know Ximena",
      items: [
        { id: "k_work", s: t("Trabajamos | {m:juntos|f:juntas}.", "We-work | together.", "We work together.") },
        { id: "k_neigh", s: t("Somos | {m:vecinos|f:vecinas}.", "We-are | neighbors.", "We're neighbors.") },
        { id: "k_class", s: t("Nos conocimos | en | una | clase | de | baile.", "We-met | in | a | class | of | dance.", "We met at a dance class.") },
        { id: "k_friend", s: t("Es | mi | amiga.", "She-is | my | friend.", "She's a friend of mine.") },
      ],
    },
    from: {
      lt: "Say where you're from", slot: "country", examples: ["usa", "canada", "uk", "ireland"],
      items: [
        { id: "fr_from", s: t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.") },
        { id: "fr_come", s: t("Vengo | de | {X}.", "I-come | from | {X}.", "I'm from {X}.") },
        { id: "fr_city", s: t("Soy | de | Toronto, | en | Canadá.", "I'm | from | Toronto, | in | Canada.", "I'm from Toronto, in Canada.") },
      ],
    },
    sea: {
      lt: "Say yes, or invite him to visit",
      items: [
        { id: "sea_yes", s: t("¡Sí, | muchísimo!", "Yes, | very much!", "Yes, a lot!") },
        { id: "sea_visit", s: t("¡Sí! | ¡Tienes | que | ir!", "Yes! | You-have | to | go!", "Yes! You should go!") },
      ],
    },
    city: {
      lt: "Say where that city is", slot: "country", examples: ["canada", "usa", "uk"],
      items: [
        { id: "city_in", s: t("Está | en | {X}.", "It-is | in | {X}.", "It's in {X}.") },
        { id: "city_in", s: t("En | {X}.", "In | {X}.", "In {X}.") },
        { id: "city_in", s: t("Es | una | ciudad | de | {X}.", "It's | a | city | of | {X}.", "It's a city in {X}.") },
      ],
    },
    back: {
      lt: "Ask him the same",
      items: [
        { id: "b_and_you", s: t("¿Y | tú?", "And | you?", "And you?") },
        { id: "b_from", s: t("¿Y | tú | de | dónde | eres?", "And | you | from | where | are-you?", "Where are you from?") },
        { id: "b_job", s: t("¿Y | tú | a | qué | te dedicas?", "And | you | to | what | you-devote-yourself?", "And what do you do?") },
        { id: "b_know", s: t("¿Y | tú | de | dónde | conoces | a | Ximena?", "And | you | from | where | you-know | — | Ximena?", "How do you know Ximena?", { flags: { 6: PERS_A } }) },
        { id: "b_fun", s: t("¿Y | tú | qué | haces | en | tu | tiempo | libre?", "And | you | what | you-do | in | your | time | free?", "What do you do for fun?") },
      ],
    },
    job: {
      lt: "Say what you do", slot: "job", examples: ["maestro", "enfermero", "programador", "ingeniero"],
      items: [
        { id: "j_im", s: t("Soy | {X}.", "I'm | {X}.", "I'm {X.np}."), note: "No un/una after soy with a job: “Soy enfermera.”" },
        { id: "j_work_as", s: t("Trabajo | como | {X}.", "I-work | as | {X}.", "I work as {X.np}.") },
        { id: "j_field", s: t("Trabajo | en | un | hospital.", "I-work | in | a | hospital.", "I work at a hospital.") },
        { id: "j_remote", s: t("Trabajo | desde | casa.", "I-work | from | home.", "I work from home.") },
        { id: "j_retired", s: t("Estoy | {m:jubilado|f:jubilada}.", "I-am | retired.", "I'm retired.") },
        { id: "j_looking", s: t("Estoy buscando | trabajo.", "I'm-looking-for | work.", "I'm looking for a job.") },
      ],
    },
    ask_mark: {
      lt: "Ask Marcos about himself",
      items: [
        { id: "b_from", s: t("¿De | dónde | eres?", "From | where | are-you?", "Where are you from?") },
        { id: "b_job", s: t("¿A | qué | te dedicas?", "To | what | you-devote-yourself?", "What do you do?") },
        { id: "b_fun", s: t("¿Qué | haces | en | tu | tiempo | libre?", "What | you-do | in | your | time | free?", "What do you do for fun?") },
        { id: "b_why", s: t("¿Qué | te | trajo | aquí?", "What | you | it-brought | here?", "What brought you here?") },
        { id: "b_know", s: t("¿De | dónde | conoces | a | Ximena?", "From | where | you-know | — | Ximena?", "How do you know Ximena?", { flags: { 3: PERS_A } }) },
      ],
    },
    time: {
      lt: "Say how long you've been here",
      items: [
        { id: "t_dur", s: t("Como | un | año.", "About | a | year.", "About a year.") },
        { id: "t_dur", s: t("Llevo | dos | meses | aquí.", "I've-been | two | months | here.", "I've been here two months.", { flags: { 0: LLEVAS } }) },
        { id: "t_since", s: t("Desde | mayo.", "Since | May.", "Since May.") },
        { id: "t_just", s: t("Acabo de | llegar.", "I just | arrived.", "I just got here.") },
      ],
    },
    why: {
      lt: "Say what brought you here",
      items: [
        { id: "w_work", s: t("Por | el | trabajo.", "For | the | work.", "For work.") },
        { id: "w_sea", s: t("Por | el | mar | y | el | clima.", "For | the | sea | and | the | weather.", "The ocean and the weather.") },
        { id: "w_spanish", s: t("Vine | a | aprender | español.", "I-came | to | to-learn | Spanish.", "I came to learn Spanish.") },
        { id: "w_retire", s: t("Me jubilé.", "I retired.", "I retired.") },
        { id: "w_love", s: t("Por | amor.", "For | love.", "For love.") },
        { id: "w_change", s: t("Quería | un | cambio.", "I-wanted | a | change.", "I wanted a change.") },
      ],
    },
    like: {
      lt: "Say if you like it here",
      items: [
        { id: "l_love", s: t("¡Sí, | me encanta!", "Yes, | I love it!", "Yes, I love it!") },
        { id: "l_people", s: t("La | gente | es | muy | amable.", "The | people | are | very | kind.", "People are so nice.") },
        { id: "l_heat", s: t("Sí, | ¡pero | qué | calor!", "Yes, | but | what | heat!", "Yes, but it's so hot!") },
        { id: "l_miss", s: t("Me gusta, | pero | extraño | a | mi | familia.", "I like it, | but | I-miss | — | my | family.", "I like it, but I miss my family.", { flags: { 3: PERS_A } }) },
      ],
    },
    fun: {
      lt: "Say what you do for fun", slot: "hobby", examples: ["running", "diving", "soccer", "guitar", "yoga"],
      items: [
        { id: "f_like", s: t("Me gusta | {X}.", "I like | {X}.", "I like {X}."), only: (e) => e.attrs?.kind === "inf" },
        { id: "f_like", s: t("Me encanta | {X}.", "I love | {X}.", "I love {X}."), only: (e) => e.attrs?.kind === "inf" },
        { id: "f_play", s: t("Juego | {X}.", "I-play | {X}.", "I play {X}."), only: (e) => e.attrs?.kind === "play", note: "Mexico: “Juego fútbol”; Spain often “juego al fútbol”." },
        { id: "f_instr", s: t("Toco | {X.the}.", "I-play | {X.the}.", "I play {X.the}."), only: (e) => e.attrs?.kind === "instr" },
        { id: "f_do", s: t("Hago | {X}.", "I-do | {X}.", "I do {X}."), only: (e) => e.attrs?.kind === "do" },
        { id: "f_verbs", s: t("Corro, | leo | y | cocino.", "I-run, | I-read | and | I-cook.", "I run, I read, I cook.") },
      ],
    },
    reading: {
      lt: "Say what you're reading",
      items: [
        { id: "r_book", s: t("Una | novela | de | misterio.", "A | novel | of | mystery.", "A mystery novel.") },
        { id: "r_book", s: t("Un | libro | de | viajes.", "A | book | of | travel.", "A travel book.") },
        { id: "r_book", s: t("Nada | por ahora.", "Nothing | for now.", "Nothing right now.") },
      ],
    },
    agree: {
      lt: "Agree",
      items: [
        { id: "ag_course", s: t("¡Claro!", "Of course!", "Of course!") },
        { id: "sea_yes", s: t("¡Sí, | así | es!", "Yes, | so | it-is!", "Yes, that's right!") },
      ],
    },
    mishear: {
      lt: "Correct Marcos", slot: "country", examples: ["ireland", "australia"],
      items: [
        { id: "mh_no", s: t("No, | ¡de | {X}!", "No, | from | {X}!", "No, {X}!") },
        { id: "mh_not", s: t("No | de | Islandia, | ¡de | Irlanda!", "Not | from | Iceland, | from | Ireland!", "Not Iceland, Ireland!") },
      ],
    },
    cafe: {
      lt: "Answer about the new café",
      items: [
        { id: "c_not_yet", s: t("Todavía | no.", "Yet | not.", "Not yet!") },
        { id: "c_yes", s: t("Sí, | ya | fui.", "Yes, | already | I-went.", "Yes, I've been.") },
        { id: "c_which", s: t("¿Cuál | café?", "Which | café?", "Which café?") },
      ],
    },
    cafe_go: {
      lt: "Agree to go together",
      items: [
        { id: "c_love_to", s: t("¡Claro, | me encantaría!", "Sure, | I'd love to!", "Sure, I'd love to!") },
        { id: "c_sounds", s: t("¡Suena | muy | bien!", "It-sounds | very | good!", "Sounds great!") },
        { id: "c_idea", s: t("¡Buena | idea!", "Good | idea!", "Good idea!") },
      ],
    },
    numbers: {
      lt: "Swap phone numbers",
      items: [
        { id: "n_mine", s: t("¡Claro! | Es | el | 998 | 123 | 4567.", "Sure! | It's | the | 998 | 123 | 4567.", "Sure! It's 998 123 4567.",
          { say: "¡Claro! Es el nueve nueve ocho, uno dos tres, cuarenta y cinco, sesenta y siete.", flags: { 2: "el before a phone number: no English word (“it's the number…”)." } }) },
        { id: "n_can", s: t("¿Me | pasas | tu | número?", "(To) me | you-pass | your | number?", "Can I get your number?") },
        { id: "n_swap", s: t("¿Nos pasamos | los | números?", "Shall-we-swap | the | numbers?", "Shall we swap numbers?") },
      ],
    },
    my_number: {
      lt: "Say your number",
      items: [
        { id: "n_mine", s: t("Es | el | 998 | 123 | 4567.", "It's | the | 998 | 123 | 4567.", "It's 998 123 4567.",
          { say: "Es el nueve nueve ocho, uno dos tres, cuarenta y cinco, sesenta y siete.", flags: { 1: "el before a phone number: no English word (“it's the number…”)." } }) },
        { id: "n_mine", s: t("¡Claro! | Es | el | 998 | 123 | 4567.", "Sure! | It's | the | 998 | 123 | 4567.", "Sure! It's 998 123 4567.",
          { say: "¡Claro! Es el nueve nueve ocho, uno dos tres, cuarenta y cinco, sesenta y siete.", flags: { 2: "el before a phone number: no English word (“it's the number…”)." } }) },
      ],
    },
    bye: {
      lt: "Say goodbye",
      items: [
        { id: "b_great", s: t("¡Me | dio | mucho | gusto | conocerte!", "(To) me | it-gave | much | pleasure | to-meet-you!", "It was great to meet you!") },
        { id: "b_great", s: t("¡Igualmente! | ¡Nos vemos!", "Likewise! | See you!", "You too! See you around!") },
        { id: "b_around", s: t("¡Nos vemos | pronto!", "See you | soon!", "See you soon!") },
      ],
    },
  },

  tips: {
    job_article: { key: "job_article", lt: "Understood! With a job, Spanish leaves out un/una after soy.", better: "Soy enfermero." },
    llevo: { key: "llevo", lt: "Understood! To say how long you've been here, Spanish uses llevar: “Llevo dos años aquí.”", better: "Llevo dos años aquí." },
  },

  merges: {
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → harbor + colibrí → hummingbird; the town's name.", minimal: "Two words." },
    "la ciudad de méxico": { reason: "lexical_expression", split: "la → the + ciudad → city + de → of + méxico → Mexico; = Mexico City.", minimal: "Four words." },
    "nueva york": { reason: "lexical_expression", split: "nueva → new + york; the city's name.", minimal: "Two words." },
    "los ángeles": { reason: "lexical_expression", split: "los → the + ángeles → angels is false; the city's name.", minimal: "Two words." },
    "san francisco": { reason: "lexical_expression", split: "san → saint + francisco; the city's name.", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "nos conocimos": { reason: "grammatical_fusion", split: "nos → each other + conocimos → we knew; conocerse (past) = to meet.", minimal: "Two words." },
    "te vas": { reason: "grammatical_fusion", split: "te → yourself + vas → you go; irse = to leave.", minimal: "Two words." },
    "te dedicas": { reason: "grammatical_fusion", split: "te → yourself + dedicas → you devote; dedicarse a = to do for a living.", minimal: "Two words." },
    "tiempo completo": { reason: "lexical_expression", split: "tiempo → time + completo → complete; = full time.", minimal: "Two words." },
    "a disfrutar": { reason: "lexical_expression", split: "a → to + disfrutar → to enjoy; = time to enjoy it.", minimal: "Two words." },
    "a mí también": { reason: "lexical_expression", split: "a mí → to me + también → also; with gustar/encantar = me too.", minimal: "Three words." },
    "buena onda": { reason: "lexical_expression", split: "buena → good + onda → wave is false; = nice, easygoing.", minimal: "Two words." },
    "te acostumbras": { reason: "grammatical_fusion", split: "te → yourself + acostumbras → you accustom; acostumbrarse = get used to it.", minimal: "Two words." },
    "estás leyendo": { reason: "grammatical_fusion", split: "estás → you are + leyendo → reading; one progressive verb.", minimal: "Two words." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "por eso": { reason: "lexical_expression", split: "por → for + eso → that; = that's why.", minimal: "Two words." },
    "me quedo": { reason: "grammatical_fusion", split: "me → myself + quedo → I remain; quedarse = to stay.", minimal: "Two words." },
    "a cada rato": { reason: "lexical_expression", split: "a → at + cada → each + rato → while; = all the time.", minimal: "Three words." },
    "tres leches": { reason: "lexical_expression", split: "tres → three + leches → milks; the cake's name.", minimal: "Two words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = we should.", minimal: "Two words." },
    "el mío": { reason: "grammatical_fusion", split: "el → the + mío → my; the possessive pronoun = mine.", minimal: "Two words." },
    "te lo": { reason: "grammatical_fusion", split: "te → for you + lo → it; two object pronouns glossed together.", minimal: "Two words." },
    "acabo de": { reason: "lexical_expression", split: "acabo → I finish + de → of is false; acabar de + verb = to have just done.", minimal: "Two words." },
    "me jubilé": { reason: "grammatical_fusion", split: "me → myself + jubilé → I retired; jubilarse = to retire.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now; = for now.", minimal: "Two words." },
    "estoy buscando": { reason: "grammatical_fusion", split: "estoy → I am + buscando → looking for; one progressive verb.", minimal: "Two words." },
    "nos pasamos": { reason: "grammatical_fusion", split: "nos → each other + pasamos → we pass; = shall we swap.", minimal: "Two words." },
    "cochinita pibil": { reason: "lexical_expression", split: "cochinita → little pig + pibil → pit-cooked (Maya); the dish's name.", minimal: "Two words." },
  },

  mission: [
    { lt: "Introduce yourself to Marcos", step: "name" },
    { lt: "Say how you know Ximena", optional: true, when: (c) => !!c.s.plan?.includes("know"), done: (c) => isDone(c, "know") },
    { lt: "Say where you're from", done: (c) => isDone(c, "from") },
    { lt: "Say what you do", done: (c) => isDone(c, "job") },
    { lt: "Talk about your free time", optional: true, when: (c) => !!c.s.plan?.includes("fun"), done: (c) => isDone(c, "fun") },
    { lt: "Ask him something back", done: (c) => !!(c.s.askedBack || c.s.turnSkipped) },
    { lt: "Swap numbers", optional: true, when: (c) => c.s.numbersDone !== "declined", done: (c) => c.s.numbersDone === true },
  ],

  steps: [
    { id: "name", done: (c) => !!c.s.named,
      ask: (c) => M(c, "whats_name"),
      expects: ["intro_name", "nice_meet", "name_ctx"],
      suggest: [{ lt: "Introduce yourself to Marcos", hint: "intro" }] },
    { id: "drink", when: (c) => !!c.s.plan.includes("drink") && !!c.s.named, done: (c) => !!c.s.drinkDone,
      ask: (c) => { SO(c, "drink_q"); },
      expects: ["drink_ans", "drink_menu", "drink_no", "cheers"],
      suggest: [{ lt: "Choose a drink, or say no thanks", hint: "drink", options: "drink" }],
      yes: (c) => { c.s.drinkDone = true; SO(c, "drink_pick"); },
      no: (c) => { c.s.drinkDone = true; SO(c, "drink_no"); } },
    { id: "know", when: (c) => !!c.s.plan.includes("know") && !!c.s.named, done: (c) => isDone(c, "know"),
      ask: (c) => askTopic(c, "know", "know_q"),
      expects: ["know_ans", "ask_back", "q_know"],
      suggest: [{ lt: "Say how you know Ximena", hint: "know" }, { lt: "Ask him the same", hint: "back" }] },
    { id: "from", when: (c) => !!c.s.named, done: (c) => isDone(c, "from"),
      ask: (c) => askTopic(c, "from", "from_q"),
      expects: ["from_ans", "from_ctx", "ask_back", "q_from"],
      suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }, { lt: "Ask him the same", hint: "back" }] },
    { id: "job", when: (c) => !!c.s.named && isDone(c, "from"), done: (c) => isDone(c, "job"),
      ask: (c) => askTopic(c, "job", "job_q"),
      expects: ["job_ans", "job_ctx", "ask_back", "q_job"],
      suggest: [{ lt: "Say what you do", hint: "job", options: "job" }, { lt: "Ask him the same", hint: "back" }],
      help: (c) => { done(c, "job"); M(c, "ok"); } },
    { id: "time", when: (c) => !!c.s.plan.includes("time") && isDone(c, "job"), done: (c) => isDone(c, "time"),
      ask: (c) => askTopic(c, "time", "time_q"),
      expects: ["time_ans", "ask_back", "q_time"],
      suggest: [{ lt: "Say how long you've been here", hint: "time" }, { lt: "Ask him the same", hint: "back" }],
      help: (c) => { done(c, "time"); M(c, "ok"); } },
    { id: "why", when: (c) => !!c.s.plan.includes("why") && isDone(c, "job"), done: (c) => isDone(c, "why"),
      ask: (c) => askTopic(c, "why", "why_q"),
      expects: ["why_ans", "ask_back", "q_why"],
      suggest: [{ lt: "Say what brought you here", hint: "why" }, { lt: "Ask him the same", hint: "back" }],
      help: (c) => { done(c, "why"); M(c, "ok"); } },
    { id: "like", when: (c) => !!c.s.plan.includes("like") && isDone(c, "job"), done: (c) => isDone(c, "like"),
      ask: (c) => askTopic(c, "like", "like_q"),
      expects: ["like_yes", "like_mixed", "like_ctx", "like_no", "ask_back", "q_like"],
      suggest: [{ lt: "Say if you like it here", hint: "like" }, { lt: "Ask him the same", hint: "back" }],
      yes: (c) => { done(c, "like"); M(c, "like_yes"); },
      no: (c) => { done(c, "like"); M(c, "like_no"); } },
    { id: "fun", when: (c) => !!c.s.plan.includes("fun") && isDone(c, "job"), done: (c) => isDone(c, "fun"),
      ask: (c) => askTopic(c, "fun", "fun_q"),
      expects: ["fun_ans", "fun_ctx", "fun_none", "fun_none_ctx", "ask_back", "q_fun"],
      suggest: [{ lt: "Say what you do for fun", hint: "fun", options: "hobby" }, { lt: "Ask him the same", hint: "back" }],
      help: (c) => { done(c, "fun"); M(c, "fun_none"); } },
    { id: "reading", when: (c) => !!c.s.readsBooks, done: (c) => isDone(c, "reading"),
      ask: (c) => askTopic(c, "reading", "reading_q"),
      expects: ["book_ctx", "ask_back", "q_reading"],
      suggest: [{ lt: "Say what you're reading", hint: "reading" }, { lt: "Ask him the same", hint: "back" }],
      help: (c) => { done(c, "reading"); M(c, "ok"); } },
    { id: "cafe", when: (c) => !!c.s.cafeTwist && isDone(c, "job"), done: (c) => isDone(c, "cafe"),
      ask: (c) => { c.twist("new_cafe"); askTopic(c, "cafe", "cafe_q"); },
      expects: ["cafe_ans_no", "cafe_ans_yes", "cafe_which", "cafe_where_ctx"],
      suggest: [{ lt: "Answer about the new café", hint: "cafe" }],
      yes: (c) => cafeYes(c),
      no: (c) => cafeNo(c) },
    { id: "your_turn", when: (c) => !c.s.askedBack && isDone(c, "job"), done: (c) => !!c.s.askedBack || !!c.s.turnSkipped,
      ask: (c) => { c.s.lastTopic = null; M(c, "your_turn"); M(c, "ask_me"); },
      expects: ["q_from", "q_job", "q_know", "q_time", "q_why", "q_like", "q_fun", "q_live", "q_chef", "q_dance", "q_reading", "q_lithuania", "ask_back"],
      suggest: [{ lt: "Ask Marcos about himself", hint: "ask_mark" }],
      help: (c) => { c.s.turnSkipped = true; M(c, "just_tell"); } },
    { id: "drink2", when: (c) => !!c.s.plan.includes("drink2") && isDone(c, "job"), done: (c) => !!c.s.drink2Done,
      ask: (c) => M(c, "drink2_q"),
      expects: ["drink_ans", "drink2_yes", "drink_no"],
      suggest: [{ lt: "Say yes, or no thanks", hint: "drink", options: "drink" }],
      yes: (c) => { c.s.drink2Done = true; M(c, "drink2_ok"); },
      no: (c) => { c.s.drink2Done = true; M(c, "decline_ok"); } },
    { id: "numbers", when: (c) => isDone(c, "job"), done: (c) => !!c.s.numbersDone,
      ask: (c) => {
        if (!c.s.lateSaid) { c.s.lateSaid = true; M(c, "time_late"); M(c, "get_going"); M(c, "swap_q"); return; }
        M(c, "swap_reask");
      },
      expects: ["swap_propose", "number_give", "number_ctx", "decline_number"],
      suggest: [{ lt: "Swap phone numbers", hint: "numbers" }],
      yes: (c) => { M(c, "ask_number"); expectNumber(c); },
      no: (c) => { c.s.numbersDone = "declined"; M(c, "decline_ok"); maybeComplete(c); } },
  ],

  init: (c) => {
    const plan = ["from", "job", "numbers"];
    if (c.chance(0.45)) plan.push("drink");
    if (c.chance(0.7)) plan.push("know");
    if (c.chance(0.6)) plan.push("time");
    if (c.chance(0.5)) plan.push("why");
    if (c.chance(0.5)) plan.push("like");
    if (c.chance(0.8)) plan.push("fun");
    if (c.chance(0.4)) plan.push("drink2");
    c.s.plan = plan;
    c.s.mishearTwist = c.visits >= 1 && c.chance(0.4);
    c.s.cafeTwist = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    SO(c, "sophie_open");
    M(c, "mark_hi");
    c.hold();
  },

  handlers: {
    intro_name(c, slots, seg) {
      if (!live(c)) return;
      if (!c.s.named) { c.s.named = true; M(c, "nice"); }
      if (seg.tags.includes("from") && (slots.country || slots.city)) fromAnswer(c, slots);
    },
    name_ctx(c) {
      if (!live(c)) return;
      if (c.s.named) return;
      c.s.named = true;
      M(c, "nice");
    },
    nice_meet(c) {
      if (!live(c)) return;
      if (c.s.named) { if (!quiet(c) && once(c, "nice")) M(c, "nice_too"); return; }
      // "Hola, ¿cómo estás? Soy Ryan": the name in the same breath answers it
      if (/\b(soy|me llamo|mi nombre es)\b/.test(heard(c))) return;
      M(c, "whats_name"); c.hold();
    },
    ask_name(c) { if (!live(c)) return; M(c, "mark_name"); },
    drink_ans(c, slots, seg) {
      if (!live(c)) return;
      const second = c.step === "drink2" || (!!c.s.drinkDone && c.s.plan.includes("drink2") && !c.s.drink2Done && c.step !== "drink");
      if (second) {
        if (!once(c, "drink")) return;
        c.s.drink2Done = true;
        M(c, seg.tags.includes("food") ? "food_ok" : "drink2_ok");
        return;
      }
      if (c.s.drinkDone && !c.s.plan.includes("drink")) { /* asked without an offer: Ximena serves anyway */ }
      if (!once(c, "drink")) return;
      c.s.drinkDone = true;
      if (seg.tags.includes("food")) { SO(c, "food_ok"); return; }
      if (seg.tags.includes("any") || !slots.drink) { SO(c, "drink_pick"); return; }
      c.s.drink = slots.drink;
      SO(c, "drink_ok", { X: slots.drink });
    },
    drink_menu(c, _slots, seg) { if (!live(c)) return; c.s.softOffered = c.s.softOffered || seg.tags.includes("soft"); SO(c, seg.tags.includes("soft") ? "drink_soft" : "drink_menu"); c.hold(); },
    drink_no(c, _slots, seg) {
      if (!live(c)) return;
      if (!once(c, "drink_no")) return;
      if (c.step === "drink2" || (c.s.drinkDone && c.s.plan.includes("drink2") && !c.s.drink2Done && c.step !== "drink")) { c.s.drink2Done = true; M(c, "decline_ok"); return; }
      // "No tomo alcohol", "Vengo manejando": Ximena offers the soft drinks (once)
      if (seg.tags.includes("noalc") && !c.s.softOffered && !c.s.drinkDone) { c.s.softOffered = true; SO(c, "drink_soft"); c.hold(); return; }
      if (c.step === "drink" || !c.s.drinkDone) { c.s.drinkDone = true; SO(c, "drink_no"); return; }
      M(c, "ok");
    },
    drink2_yes(c) { if (!live(c)) return; c.s.drink2Done = true; M(c, "drink2_ok"); },
    cheers(c) { if (!live(c)) return; if (!once(c, "cheers")) return; M(c, c.s.cheered ? "ha" : "cheers_back"); c.s.cheered = true; },
    know_ans(c, slots, seg) {
      if (!live(c)) return;
      if (!once(c, "know")) return;
      done(c, "know");
      const tg = seg.tags;
      if (tg.includes("class") && slots.cls === "dance") { M(c, "know_dance"); c.s.told = { ...(c.s.told || {}), know: true }; c.s.danceTold = true; return; }
      M(c, tg.includes("work") ? "know_work" : tg.includes("neigh") ? "know_neigh" : tg.includes("class") ? "know_class" : tg.includes("none") ? "know_none" : "know_friends");
    },
    from_ans(c, slots) { if (!live(c)) return; fromAnswer(c, slots); },
    from_ctx(c, slots) { if (!live(c)) return; fromAnswer(c, slots); },
    city_country(c, slots) { if (!live(c)) return; const r = slots.country ?? (slots.city ? countryOf(slots.city) : undefined); if (r) reactCountry(c, r); },
    correct_country(c, slots) {
      if (!live(c)) return;
      // "No, Islandia no, Irlanda" / "Irlanda, no Islandia": without commas the order can't tell; the misheard one is the wrong one
      const named = [...([] as string[]).concat(slots.country ?? []), ...([] as string[]).concat(slots.bad ?? [])];
      const right = named.find((x) => x !== c.s.country) ?? named[0];
      if (!right) return;
      const fixed = !!c.s.country && c.s.country !== right;
      if (fixed) M(c, "mishear_fix", { X: right });
      reactCountry(c, right, fixed);
    },
    visit_invite(c) { if (!live(c)) return; M(c, "id_love_to"); },
    confirm_yes(c) { if (!live(c)) return; if (!quiet(c)) M(c, "ha"); },
    job_ans(c, slots, seg) { if (!live(c)) return; jobAnswer(c, slots, seg.tags); },
    job_ctx(c, slots) { if (!live(c)) return; jobAnswer(c, slots, slots.field ? ["field"] : []); },
    time_ans(c, slots, seg) {
      if (!live(c)) return;
      if (!once(c, "time")) return;
      done(c, "time");
      const tg = seg.tags;
      if (tg.includes("visit")) { M(c, "time_visit"); return; }
      const m = monthsFrom(slots, tg);
      M(c, m === Infinity ? "time_life" : m >= 9 ? "time_long" : m >= 4 ? "time_same" : "time_short");
      c.s.told = { ...(c.s.told || {}), time: true };
    },
    why_ans(c, _slots, seg) {
      if (!live(c)) return;
      if (!once(c, "why")) return;
      done(c, "why");
      const tg = seg.tags;
      const line = tg.includes("work") || tg.includes("remote") ? "why_work" : tg.includes("love") ? "why_love" : tg.includes("spanish") ? "why_spanish"
        : tg.includes("retire") ? "why_retire" : tg.includes("change") ? "why_change" : tg.includes("visit") ? "why_visit" : "why_sea";
      M(c, line);
    },
    like_yes(c) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, "like_yes"); },
    like_mixed(c, _slots, seg) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, seg.tags.includes("heat") ? "like_heat" : "like_mixed"); },
    like_no(c) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, "like_no"); },
    like_ctx(c, _slots, seg) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, seg.tags.includes("mixed") ? "like_mixed" : "like_yes"); },
    fun_ans(c, slots, seg) { if (!live(c)) return; funAnswer(c, slots, seg.tags); },
    fun_ctx(c, slots) { if (!live(c)) return; funAnswer(c, slots); },
    fun_none(c) { if (!live(c)) return; done(c, "fun"); if (once(c, "fun_none")) M(c, "fun_none"); },
    fun_none_ctx(c) { if (!live(c)) return; done(c, "fun"); if (once(c, "fun_none")) M(c, "fun_none"); },
    book_ctx(c, _slots, seg) { if (!live(c)) return; if (!once(c, "book")) return; done(c, "reading"); M(c, seg.tags.includes("es") ? "reading_spanish" : "reading_react"); },
    ask_back(c) {
      if (!live(c)) return;
      // "Trabajamos juntos. ¿Y tú?": about what the learner has just told, else about Marcos's last question
      const now = c.s.__toldNow?.t === turn(c) ? (c.s.__toldNow.topic as Topic) : null;
      const tp = now ?? (c.s.lastTopic as Topic | null) ?? (isDone(c, "from") ? "job" : "from");
      markAbout(c, tp);
    },
    q_from(c) { if (live(c)) markAbout(c, "from"); },
    q_job(c) { if (live(c)) markAbout(c, "job"); },
    q_know(c) { if (live(c)) markAbout(c, "know"); },
    q_time(c) { if (live(c)) markAbout(c, "time"); },
    q_why(c) { if (live(c)) markAbout(c, "why"); },
    q_like(c) { if (live(c)) markAbout(c, "like"); },
    q_fun(c) { if (live(c)) markAbout(c, "fun"); },
    q_reading(c) { if (live(c)) markAbout(c, "reading"); },
    q_live(c) { if (live(c)) markAbout(c, "live"); },
    q_chef(c, _slots, seg) {
      if (!live(c)) return;
      c.s.askedBack = (c.s.askedBack || 0) + 1;
      const h = heard(c);
      M(c, seg.tags.includes("salsa") ? "mark_salsa" : seg.tags.includes("fav") ? "mark_fav" : /\brestaurante\b/.test(h) ? "mark_job" : "mark_chef");
    },
    q_dance(c) { if (!live(c)) return; c.s.askedBack = (c.s.askedBack || 0) + 1; c.s.danceTold = true; M(c, "mark_dance"); },
    q_lithuania(c) { if (!live(c)) return; c.s.askedBack = (c.s.askedBack || 0) + 1; M(c, "mark_lithuania"); },
    cafe_ans_no(c) { if (!live(c)) return; cafeNo(c); },
    cafe_ans_yes(c) { if (!live(c)) return; cafeYes(c); },
    cafe_which(c) { if (!live(c)) return; if (!c.s.cafeTwist) { M(c, "mark_cafe_which"); return; } M(c, "cafe_which"); },
    cafe_where_ctx(c) { if (!live(c)) return; M(c, "cafe_which"); },
    // only the café invitation is agreed to (the pending answers it); elsewhere it says nothing
    agree_go() { /* answered by the cafe_go question */ },
    cafe_no_ctx() { /* answered by the cafe_go question */ },
    swap_propose(c, _slots, seg) {
      if (!live(c)) return;
      if (!once(c, "swap")) return;
      if (c.s.numbersDone === true) { M(c, "ok"); return; }
      if (seg.tags.includes("mine")) { M(c, "swap_sure"); M(c, "ask_number"); expectNumber(c); return; }
      if (!c.s.lateSaid) M(c, "swap_sure");
      M(c, "mark_number");
      c.s.markGaveNumber = true;
      c.s.numbersDone = true;
      maybeComplete(c);
    },
    number_give(c) { if (!live(c)) return; numberGiven(c); },
    number_ctx(c) { if (!live(c)) return; numberGiven(c); },
    decline_number(c, _slots, seg) {
      if (!live(c)) return;
      if (seg.tags.includes("wa")) { M(c, "ask_number"); expectNumber(c); return; }
      c.s.numbersDone = "declined"; M(c, "decline_ok"); maybeComplete(c);
    },
    bye_nice(c) { if (!live(c)) return; goodbye(c); },
    me_neither(c) { if (!live(c)) return; M(c, c.s.danceTold ? "here_to_dancing" : "ha"); },
    cute_mark(c) { if (!live(c)) return; M(c, "ha"); },
    g_bye(c) { if (!live(c)) return; goodbye(c); },
  },

  finish: (c) => {
    maybeComplete(c);
    M(c, "great_meet");
    const closing: Pending = {
      id: "closing", expects: ["bye_nice"], hints: ["bye"],
      suggest: [{ lt: "Say goodbye", hint: "bye" }],
      on: {
        bye_nice: (cc) => goodbye(cc, true),
        g_bye: (cc) => goodbye(cc, true),
        g_thanks: (cc) => goodbye(cc, true),
        nice_meet: (cc) => goodbye(cc, true),
        // "¿Cómo estás?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { M(cc, "howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => goodbye(cc, true),
      no: (cc) => goodbye(cc, true),
    };
    c.expect(closing);
  },

  tests: [
    // names
    { say: "Hola, soy Ryan. Mucho gusto.", intent: "intro_name", step: "name" },
    { say: "Me llamo Ryan", intent: "intro_name" },
    { say: "Ryan", intent: "name_ctx", step: "name" },
    { say: "Ryan", intent: "none" },
    { say: "¡Mucho gusto!", intent: "nice_meet", step: "name" },
    { say: "¿Cómo te llamas?", intent: "ask_name" },
    { say: "Soy enfermera", intent: "job_ans", step: "name", not: ["name_ctx", "intro_name"] },
    { say: "Hola, soy de Canadá", intent: "from_ans", step: "name", not: ["intro_name", "name_ctx"] },
    // drinks
    { say: "Sí, una cerveza, por favor", intent: "drink_ans", step: "drink", slots: { drink: "beer" } },
    { say: "¿Me das un agua de jamaica?", intent: "drink_ans", step: "drink", slots: { drink: "jamaica" } },
    { say: "Una chela", intent: "drink_ans", step: "drink", slots: { drink: "beer" } },
    { say: "Ponme una cerveza", intent: "drink_ans", step: "drink", slots: { drink: "beer" } },
    { say: "Vale, un zumo de naranja", intent: "drink_ans", step: "drink", slots: { drink: "juice" } },
    { say: "¿Tenéis agua mineral?", intent: "drink_ans", step: "drink", slots: { drink: "sparkling" } },
    { say: "¿Qué hay de tomar?", intent: "drink_menu", step: "drink" },
    { say: "No, gracias, estoy bien", intent: "drink_no", step: "drink" },
    { say: "No tomo alcohol", intent: "drink_no", step: "drink", not: ["drink_ans"] },
    { say: "No quiero cerveza", intent: "drink_no", step: "drink", not: ["drink_ans"] },
    { say: "Cerveza no, mejor un refresco", intent: "drink_ans", step: "drink", slots: { drink: "soda" } },
    { say: "Un taco, por favor", intent: "drink_ans", step: "drink2" },
    { say: "¡Salud!", intent: "cheers" },
    // how they know Ximena
    { say: "Trabajamos juntos", intent: "know_ans", step: "know" },
    { say: "Somos vecinos", intent: "know_ans", step: "know" },
    { say: "Nos conocimos en una clase de baile", intent: "know_ans", step: "know", slots: { cls: "dance" } },
    { say: "Es mi amiga", intent: "know_ans", step: "know" },
    { say: "No trabajamos juntos", intent: "none", step: "know", not: ["know_ans"] },
    // where from
    { say: "Soy de Canadá", intent: "from_ans", step: "from", slots: { country: "canada" } },
    { say: "Vengo de Australia", intent: "from_ans", slots: { country: "australia" } },
    { say: "Soy irlandesa", intent: "from_ans", slots: { country: "ireland" } },
    { say: "Soy de Toronto", intent: "from_ans", slots: { city: "toronto" } },
    { say: "Inglaterra", intent: "from_ctx", step: "from", slots: { country: "uk" } },
    { say: "No soy de Estados Unidos, soy de Canadá", intent: "from_ans", slots: { country: "canada" } },
    { say: "Está en Canadá", intent: "city_country", slots: { country: "canada" } },
    { say: "No, Islandia no, Irlanda", intent: "correct_country" },
    { say: "Irlanda, no Islandia", intent: "correct_country", slots: { country: "ireland" } },
    // work
    { say: "Soy maestro", intent: "job_ans", step: "job", slots: { job: "maestro" } },
    { say: "Soy una enfermera", intent: "job_ans", step: "job", slots: { job: "enfermero" } },
    { say: "Trabajo como programador", intent: "job_ans", slots: { job: "programador" } },
    { say: "Trabajo en un hospital", intent: "job_ans", slots: { field: "hospital" } },
    { say: "Estoy jubilado", intent: "job_ans", step: "job" },
    { say: "Trabajo desde casa", intent: "job_ans", step: "job" },
    { say: "Estoy buscando trabajo", intent: "job_ans", step: "job" },
    { say: "Soy camarera", intent: "job_ans", slots: { job: "mesero" } },
    { say: "No soy enfermera, soy maestra", intent: "job_ans", step: "job", slots: { job: "maestro" } },
    // how long, why
    { say: "Llevo dos meses aquí", intent: "time_ans", step: "time" },
    { say: "Desde mayo", intent: "time_ans", step: "time" },
    { say: "Acabo de llegar", intent: "time_ans", step: "time" },
    { say: "Tengo un año y medio aquí", intent: "time_ans", step: "time" },
    { say: "Por el trabajo", intent: "why_ans", step: "why" },
    { say: "Vine a aprender español", intent: "why_ans", step: "why" },
    // liking it
    { say: "Sí, me encanta", intent: "like_yes", step: "like" },
    { say: "Sí, pero hace mucho calor", intent: "like_mixed", step: "like", not: ["like_yes"] },
    { say: "No me gusta mucho", intent: "like_no", step: "like", not: ["like_yes"] },
    { say: "No me encanta", intent: "like_mixed", step: "like", not: ["like_yes"] },
    // free time
    { say: "Me gusta correr y leer", intent: "fun_ans", step: "fun" },
    { say: "Juego fútbol", intent: "fun_ans", step: "fun" },
    { say: "Toco la guitarra", intent: "fun_ans", step: "fun" },
    { say: "No me gusta correr", intent: "none", step: "fun", not: ["fun_ans", "fun_ctx"] },
    { say: "No sé bailar", intent: "me_neither", step: "fun", not: ["fun_ans", "fun_ctx"] },
    // asking Marcos
    { say: "¿Y tú?", intent: "ask_back" },
    { say: "¿Y tú de dónde eres?", intent: "q_from" },
    { say: "¿A qué te dedicas?", intent: "q_job" },
    { say: "¿Qué te trajo aquí?", intent: "q_why" },
    { say: "¿Sabes bailar?", intent: "q_dance" },
    { say: "¿Tú hiciste la salsa?", intent: "q_chef" },
    // the café
    { say: "Todavía no", intent: "cafe_ans_no", step: "cafe" },
    { say: "Sí, ya fui", intent: "cafe_ans_yes", step: "cafe" },
    { say: "No he ido", intent: "cafe_ans_no", step: "cafe", not: ["cafe_ans_yes"] },
    // numbers
    { say: "¿Me pasas tu número?", intent: "swap_propose", step: "numbers" },
    { say: "¿Me das tu móvil?", intent: "swap_propose", step: "numbers" },
    { say: "Mi número es el 998 123 4567", intent: "number_give", step: "numbers" },
    { say: "Prefiero no dar mi número", intent: "decline_number", step: "numbers", not: ["number_give"] },
    { say: "No te doy mi número", intent: "decline_number", step: "numbers", not: ["number_give", "swap_propose"] },
    // goodbye
    { say: "Me dio mucho gusto conocerte", intent: "bye_nice" },
    // short answers that mean something else elsewhere
    { say: "Más o menos", intent: "like_ctx", step: "like" },
    { say: "Más o menos", intent: "confirm_yes", step: "sea_q", not: ["like_ctx", "like_mixed"] },
    { say: "Sí, hace mucho frío", intent: "confirm_yes", step: "sea_q", not: ["drink_ans", "know_ans"] },
    { say: "Nada", intent: "fun_none_ctx", step: "fun" },
    { say: "¿Tienes algo sin alcohol?", intent: "drink_menu", step: "drink", not: ["drink_ans"] },
    { say: "Me encantaría una limonada", intent: "drink_ans", step: "drink", slots: { drink: "lemonade" }, not: ["agree_go"] },
    { say: "Soy amigo de Ximena", intent: "know_ans", step: "know", not: ["name_ctx"] },
    { say: "Ja, no, de Irlanda", intent: "correct_country", step: "mishear" },
    { say: "Ya me jubilé", intent: "job_ans", step: "job" },
    { say: "Por mi esposa", intent: "why_ans", step: "why" },
    { say: "Corro todas las mañanas", intent: "fun_ans", step: "fun" },
    { say: "¿Cuál es tu comida favorita?", intent: "q_chef" },
    // not understood
    { say: "El elefante morado come teclados", intent: "none" },
    { say: "Mi tía vive en Guadalajara", intent: "none" },
    { say: "teclado banana martes", intent: "none" },
  ],

  sims: [
    // the optional topics are pinned to the ones the script answers; no drink, no twists
    { name: "reciprocal small talk",
      turns: ["Hola, soy Ryan. Mucho gusto.", "Trabajamos juntos. ¿Y tú?", "Soy de Canadá. ¿Y tú de dónde eres?", "¡Sí, muchísimo!", "Soy maestro. ¿Y tú a qué te dedicas?", "Como un año.",
        "Por el trabajo.", "¡Sí, me encanta! La gente es muy amable.", "Me gusta correr y leer.", "Una novela de misterio.", "¡Claro! Es el 998 123 4567.", "¡Igualmente! ¡Nos vemos!"],
      expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "know", "time", "why", "like", "fun"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // every topic answered short, then "¡Te toca!" (nothing asked back yet), "No, gracias." to another drink
    { name: "short answers, Marcos prompts",
      turns: ["¡Mucho gusto!", "Ryan.", "Canadá.", "Sí.", "Maestro.", "Dos meses.", "Más o menos.", "Bucear.", "¿Y tú qué haces en tu tiempo libre?", "No, gracias.", "¡Claro!", "998 123 4567", "¡Adiós!"],
      expect: { complete: true, state: { numbersDone: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "time", "like", "fun", "drink2"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // the learner leads: asks first, a city Marcos doesn't know, a workplace, a drink with a change of mind
    { name: "learner leads, a change of mind",
      turns: ["Hola Marcos, soy Ryan. ¿De dónde eres?", "Soy de Halifax.", "Está en Canadá.", "¡Tienes que ir algún día!", "Una cerveza… no, mejor una limonada.", "Trabajo en un hospital.",
        "Soy enfermero.", "Desde mayo.", "¿Me pasas tu número?", "¡Nos vemos!"],
      expect: { complete: true, state: { drink: "lemonade", markGaveNumber: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "drink", "time"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // "Trabajo con Ximena. ¿Y tú?" before Marcos asks: "¿Y tú?" is about how Marcos knows Ximena
    { name: "volunteers a fact and asks back",
      turns: ["Hola, soy Ryan. Trabajo con Ximena. ¿Y tú?", "Soy de Estados Unidos. ¿Y tú?", "Soy programador. ¿Y tú?", "Me gusta bucear. ¿Y tú?", "¡Claro! Es el 998 123 4567.", "¡Igualmente! ¡Nos vemos!"],
      expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "know", "fun"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // no alcohol, then hibiscus water; why, the heat; the learner declines the number
    { name: "no alcohol, the heat, no number",
      turns: ["Hola, me llamo Ryan, mucho gusto.", "No tomo alcohol.", "Un agua de jamaica, por favor.", "¡Salud!", "Soy de Inglaterra.", "Sí, mucho.", "Estoy jubilado.",
        "Me jubilé y quería vivir cerca del mar.", "Sí, pero hace mucho calor.", "¿Y a ti te gusta vivir aquí?", "Todavía no tengo número de aquí.", "¡Hasta pronto!"],
      expect: { complete: true, state: { numbersDone: "declined", drink: "jamaica", softOffered: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "drink", "why", "like"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // Spain forms are right answers too
    { name: "Spain forms",
      turns: ["Hola, soy Ryan, encantado.", "Vale, ponme una cerveza.", "Soy de Escocia.", "Sí, muchísimo.", "Soy camarero.", "¿Y tú, qué haces en tu tiempo libre?", "¿Me das tu móvil?", "¡Adiós!"],
      expect: { complete: true, state: { drink: "beer", markGaveNumber: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "drink"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // the twist on every seed: "¿De Islandia?" and the learner corrects Marcos
    { name: "twist: Marcos mishears the country",
      turns: ["Hola, soy Ryan. Mucho gusto.", "Somos vecinos.", "Soy de Irlanda.", "No, Islandia no, Irlanda.", "Sí, mucho.", "Soy maestro.", "¿Y tú de dónde eres?", "¡Claro! Es el 998 123 4567.", "¡Nos vemos!"],
      expect: { complete: true, state: { country: "ireland", misheard: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "know"]; s.mishearTwist = true; s.cafeTwist = false; } },
    // the café twist on every seed
    { name: "twist: the new café",
      turns: ["Hola, soy Ryan. Mucho gusto.", "Soy de Australia.", "Trabajo desde casa.", "Todavía no.", "¡Me encantaría!", "¿Y tú dónde vives?", "¡Claro! Es el 998 123 4567.", "¡Nos vemos pronto!"],
      expect: { complete: true, state: { cafeGo: true } }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers"]; s.mishearTwist = false; s.cafeTwist = true; } },
  ],
};

// ---------------------------------------------------------------------------
// Answer helpers (after the object so they can call party.*)

function fromAnswer(c: Ctx, slots: any) {
  if (!once(c, "from")) return;
  const ctry = ([] as string[]).concat(slots.country ?? [])[0];
  const city = ([] as string[]).concat(slots.city ?? [])[0];
  if (!ctry && city) {
    const known = !!CITIES.find((e) => e.id === city)?.attrs?.known;
    if (known) { reactAfterMishear(c, city); return; }
    c.s.city = city;
    deferOrAsk(c, (cx) => cityQ(cx));
    return;
  }
  if (!ctry) return;
  reactAfterMishear(c, ctry);
}

/** The mishearing twist (music on): once, for a country with a sound-alike. */
function reactAfterMishear(c: Ctx, id: string) {
  const ctry = countryOf(id);
  const wrong = COUNTRIES.find((e) => e.id === ctry)?.attrs?.mishear as string | undefined;
  if (c.s.mishearTwist && wrong && !c.s.misheard && id === ctry) {
    c.s.misheard = true;
    c.twist("mishear");
    c.s.country = wrong;
    M(c, "mishear", { X: wrong });
    deferOrAsk(c, (cx) => mishearQ(cx, ctry));
    return;
  }
  reactCountry(c, id);
}

function cityQ(c: Ctx) {
  M(c, "city_where");
  c.expect({
    id: "city_q", expects: ["city_country", "from_ctx", "from_ans"], hints: ["city"],
    suggest: [{ lt: "Say where that city is", hint: "city", options: "country" }],
    on: {
      city_country: (cc, sl) => { const r = sl.country ?? (sl.city ? countryOf(sl.city) : undefined); if (r) reactCountry(cc, r); },
      from_ctx: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) reactCountry(cc, r); },
      from_ans: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) reactCountry(cc, r); },
    },
    ask: (cc) => M(cc, "city_where"),
  });
}

function mishearQ(c: Ctx, ctry: string) {
  c.expect({
    id: "mishear", expects: ["correct_country", "from_ctx", "from_ans"], hints: ["mishear"],
    suggest: [{ lt: "Correct Marcos", hint: "mishear", options: "country" }],
    // "Sí" to "¿De Islandia?": the learner lets it pass
    yes: (cc) => { done(cc, "from"); },
    no: (cc) => { M(cc, "mishear_again"); cc.hold(); cc.s.misheardNo = true; },
    on: {
      correct_country: (cc, sl, sg) => party.handlers.correct_country(cc, sl, sg),
      from_ctx: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) fixCountry(cc, r); },
      from_ans: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) fixCountry(cc, r); },
      confirm_yes: (cc) => { done(cc, "from"); },
    },
    ask: (cc) => M(cc, "mishear_again"),
  });
  void ctry;
}

function fixCountry(c: Ctx, right: string) {
  if (c.s.country !== right) { M(c, "mishear_fix", { X: right }); reactCountry(c, right, true); return; }
  reactCountry(c, right);
}

function jobAnswer(c: Ctx, slots: any, tags: string[]) {
  if (!once(c, "job")) return;
  // "Doy clases de inglés": the job comes from what the learner does
  const job: string | undefined = slots.job ?? (slots.duty && jobIds.has(slots.duty) ? slots.duty : undefined);
  const say = (line: string) => { done(c, "job"); M(c, line); };
  if (tags.includes("retired")) return say("retired_react");
  if (tags.includes("looking")) return say("looking_react");
  if (tags.includes("home")) return say("home_react");
  if (tags.includes("own")) return say("own_react");
  if (tags.includes("remote")) return say("remote_react");
  if (tags.includes("generic") && !job) return say("ok");
  if (tags.includes("student") || job === "estudiante") return say("student_react");
  if (job) {
    done(c, "job");
    if (job === "chef" || job === "cocinero") { M(c, "job_chef"); return; }
    M(c, "job_react", { X: job });
    return;
  }
  if (slots.field || tags.includes("field")) deferOrAsk(c, (cx) => fieldQ(cx));
}

function fieldQ(c: Ctx) {
  M(c, "field_q");
  c.expect({
    id: "field_q", expects: ["job_ans", "job_ctx"], hints: ["job"],
    suggest: [{ lt: "Say what you do", hint: "job", options: "job" }],
    on: {
      job_ans: (cc, sl, sg) => { cc.s["__once_job"] = null; jobAnswer(cc, sl, sg.tags.filter((x) => x !== "field")); if (!isDone(cc, "job")) { done(cc, "job"); M(cc, "ok"); } },
      job_ctx: (cc, sl) => { cc.s["__once_job"] = null; if (sl.job || sl.duty) jobAnswer(cc, sl, []); if (!isDone(cc, "job")) { done(cc, "job"); M(cc, "ok"); } },
    },
    no: (cc) => { done(cc, "job"); M(cc, "ok"); },
    yes: (cc) => { done(cc, "job"); M(cc, "ok"); },
  });
}

function funAnswer(c: Ctx, slots: any, tags: string[] = []) {
  const list: string[] = [];
  const hb = slots.hobbies?.hobby ?? slots.hobby;
  for (const h of ([] as any[]).concat(hb ?? [])) if (typeof h === "string") list.push(h);
  for (const v of ([] as any[]).concat(slots.hv ?? [])) if (typeof v === "string") list.push(v);
  // "Me gusta pasar tiempo con mi familia": a pastime that is not on the list
  if (!list.length && tags.includes("other") && once(c, "fun")) { done(c, "fun"); M(c, "fun_generic"); return; }
  if (!list.length) return;
  c.s.hobbies = [...new Set([...(c.s.hobbies || []), ...list])];
  if (list.includes("reading")) c.s.readsBooks = true;
  if (!once(c, "fun")) return;
  done(c, "fun");
  if (list.includes("cooking")) { M(c, "fun_cooking"); return; }
  if (list.includes("hockey") && c.s.country === "canada") {
    M(c, "fun_hockey");
    c.expect({ id: "basketball_q", optional: true, expects: ["confirm_yes"], hints: ["agree"], suggest: [{ lt: "Agree", hint: "agree" }],
      yes: (cc) => M(cc, "knew_it"), no: (cc) => M(cc, "ha"), on: { confirm_yes: (cc) => M(cc, "knew_it") } });
    return;
  }
  if (list.includes("diving") || list.includes("swimming")) { M(c, "fun_diving"); return; }
  if (list.includes("dancing")) { M(c, "fun_dancing"); return; }
  if (list.includes("soccer")) { M(c, "fun_soccer"); return; }
  if (list.includes("running")) { M(c, "fun_running"); return; }
  if (list.includes("reading")) { M(c, "fun_reading"); return; }
  void MARCOS_HOBBIES;
  M(c, "fun_generic");
}

/** Months since the learner arrived (Infinity = all their life). */
function monthsFrom(slots: any, tg: string[]): number {
  if (tg.includes("life")) return Infinity;
  if (tg.includes("short")) return 0;
  if (tg.includes("y1")) return 12;
  if (tg.includes("yfew")) return 36;
  if (tg.includes("since")) { const m = Number(slots.month) || NOW_MONTH; return ((NOW_MONTH - m) + 12) % 12; }
  if (typeof slots.dur === "number") return slots.dur;
  return 6;
}

function cafeNo(c: Ctx) {
  if (c.step !== "cafe" && !c.s.cafeTwist) { M(c, "ok"); return; }
  if (!once(c, "cafe")) return;
  done(c, "cafe"); M(c, "cafe_try"); M(c, "cafe_go_q"); expectCafeGo(c);
}
function cafeYes(c: Ctx) {
  if (c.step !== "cafe" && !c.s.cafeTwist) { M(c, "ok"); return; }
  if (!once(c, "cafe")) return;
  done(c, "cafe"); M(c, "cafe_great"); M(c, "cafe_go_q"); expectCafeGo(c);
}

function expectCafeGo(c: Ctx) {
  c.expect({
    id: "cafe_go", expects: ["agree_go", "cafe_no_ctx"], hints: ["cafe_go"],
    suggest: [{ lt: "Agree to go together", hint: "cafe_go" }],
    yes: (cc) => { cc.s.cafeGo = true; M(cc, "cafe_go_yes"); },
    no: (cc) => { cc.s.cafeGo = false; M(cc, "cafe_go_no"); },
    on: {
      agree_go: (cc, _sl, sg) => { cc.s.cafeGo = true; M(cc, sg.tags.includes("maybe") ? "cafe_go_maybe" : "cafe_go_yes"); },
      cafe_no_ctx: (cc) => { cc.s.cafeGo = false; M(cc, "cafe_go_no"); },
    },
  });
}

function numberGiven(c: Ctx) {
  if (!once(c, "number")) return;
  if (c.s.numbersDone === true) { M(c, "ok"); return; }
  c.s.numbersDone = true;
  M(c, "number_got");
  maybeComplete(c);
}

function expectNumber(c: Ctx) {
  c.expect({
    id: "ask_number", expects: ["number_give", "number_ctx", "decline_number", "swap_propose"], hints: ["my_number"],
    suggest: [{ lt: "Say your number", hint: "my_number" }],
    on: {
      number_give: (cc) => numberGiven(cc),
      number_ctx: (cc) => numberGiven(cc),
      decline_number: (cc, sl, sg) => party.handlers.decline_number(cc, sl, sg),
      // "Mejor dame el tuyo": Marcos writes his down instead
      swap_propose: (cc) => { cc.s.markGaveNumber = true; cc.s.numbersDone = true; M(cc, "mark_number"); maybeComplete(cc); },
    },
    ask: (cc) => M(cc, "ask_number"),
  });
}

function goodbye(c: Ctx, afterFinish = false) {
  if (c.s.byeSaid) return;
  maybeComplete(c);
  c.s.byeSaid = true;
  if (!afterFinish) M(c, "great_meet");
  M(c, "see_around");
  if (c.chance(0.5)) SO(c, "sophie_bye");
  c.hold();
  c.end();
}

export default party;
