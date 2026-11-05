// NEEDS: global.ts g_bye takes "tú también" / "igualmente" (a goodbye), which on a date are the answer to a compliment
//   or to "Mucho gusto": the greeting steps expect you_too / greet_back here, and at the closing every answer ends the
//   evening anyway. global.ts @greet reads "buenas noches" as a hello; here it is also a goodbye (local g_bye, whose
//   handler treats a bare "buenas noches" before the end of the evening as a hello).
// Song 84 "Can I See You Again?" → Puerto Colibrí: "¿Te puedo volver a ver?"
// A first date at Restaurante El Muelle on the malecón, at sunset. The partner is Santiago (id sam) or Camila (id
// emma), as in the English (settings: player.datePartner; default Camila for a male player, Santiago otherwise). Tú
// both ways: a date of the learner's age. They met online.
// Flow (the English edition's s84-date): hello (someone is late / a compliment / "¡Qué gusto conocerte!") → drinks
// (some visits: margaritas, a michelada, agua de jamaica) → two small-talk topics from the job ("¿A qué te dedicas?"),
// free time, travel in Mexico ("¿Conoces Oaxaca?") and music, each with "¿Y tú?" both ways → quick questions (twist:
// ¿café o té?, ¿perros o gatos?, ¿playa o montaña?) → the check: in Mexico whoever invites usually pays ("Yo invito",
// "Déjame invitarte"); splitting is "¿Dividimos la cuenta?", "¿Pagamos a la mitad?", "cada quien lo suyo" (we accept
// "hacemos cuentas", "nos cooperamos" and Spain's "a medias / a pachas" too) → "La pasé muy bien" → "¿Te puedo volver
// a ver?" and a day (twist: Saturday with the parents) → "Mándame un mensaje cuando llegues". The chilly sea breeze
// (twist: "Ya hace fresco") gets a suéter or a chamarra. A "no" to a second date is accepted kindly.
// Mexican-only words, each with a neutral twin: padre (cool), no manches (no way). The rest is shared Spanish.
// The check is said only when asked: $900 for two ($450 each), a main and a drink each at El Muelle (s69: "como
// trescientos pesos por persona, con bebida"; the date had cocktails); in Mexico one leaves 10–15% on top.
// The partner's own facts (the same for Santiago and Camila; asked or not): a wedding photographer, born here in Puerto
// Colibrí, lives a few blocks from El Muelle ("a la vuelta" on some visits), parents in town, a younger sister, a cat
// called Luna, 31, loves cooking, the cenotes, jazz and cumbia; went to {C} last summer.
// Unsure facts kept vague: the greeting kiss on the cheek is only in the intro ("common"), not a rule.

import type { Ctx, EntityDef, Handler, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS, LEAVING_PATTERNS } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const DRINKS: EntityDef[] = [
  ent("margarita", "margarita", "margarita", "f", { pl: "margaritas", forms: ["margaritas", "margarita de mango", "margarita de fresa", "margarita de tamarindo", "margarita de limon"], chip: "margarita" }),
  ent("white_wine", "vino | blanco", "wine | white", "m", { pl: "vinos | blancos", ltPl: "wines | white",
    forms: ["vino blanco", "blanco", "una copa de vino blanco", "copa de blanco", "vino", "una copa de vino", "copa de vino", "chardonnay", "sauvignon blanc", "una botella de vino", "copita de vino"],
    chip: "vino blanco", attrs: { glass: true, nat: "white wine" } }),
  ent("red_wine", "vino | tinto", "wine | red", "m", { pl: "vinos | tintos", ltPl: "wines | red",
    forms: ["vino tinto", "tinto", "vino rojo", "copa de tinto", "merlot", "cabernet", "malbec"], chip: "vino tinto", attrs: { glass: true, nat: "red wine" } }),
  ent("beer", "cerveza", "beer", "f", { pl: "cervezas", ltPl: "beers",
    forms: ["cervezas", "chela", "chelas", "cervecita", "una cerveza fria", "birra", "cana", "una cana", "cerveza clara", "cerveza oscura", "cerveza de barril", "cerveza artesanal"], chip: "cerveza" }),
  ent("michelada", "michelada", "michelada", "f", { pl: "micheladas", forms: ["micheladas", "chelada", "una chelada"], chip: "michelada",
    attrs: { nat: "michelada (beer with lime and chili)" } }),
  ent("cocktail", "coctel", "cocktail", "m", { pl: "cocteles", ltPl: "cocktails",
    forms: ["cocteles", "coctel", "un trago", "trago", "mojito", "un mojito", "pina colada", "una pina colada", "mezcal", "un mezcal", "tequila", "un tequila", "paloma", "una paloma", "un cuba", "cuba libre"], chip: "coctel" }),
  ent("sparkling_water", "agua | mineral", "water | sparkling", "f", { art: "un", def: "el", forms: ["agua mineral", "mineral", "una mineral", "agua con gas", "agua gasificada"], chip: "agua mineral",
    attrs: { nat: "sparkling water" } }),
  ent("water", "agua", "water", "f", { art: "un", def: "el", forms: ["agua natural", "agua sin gas", "agua simple", "un vaso de agua"], chip: "agua" }),
  ent("lemonade", "limonada", "lemonade", "f", { pl: "limonadas", ltPl: "lemonades", forms: ["limonadas", "limonada natural", "limonada mineral", "naranjada", "naranjada mineral"], chip: "limonada" }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "un", def: "el", forms: ["jamaica", "agua de jamaica", "agua fresca", "un agua fresca", "agua de horchata", "horchata", "agua de tamarindo"],
    chip: "agua de jamaica", attrs: { nat: "hibiscus water" } }),
  ent("soda", "refresco", "soda", "m", { pl: "refrescos", ltPl: "sodas", forms: ["refrescos", "una coca", "coca", "coca cola", "una coca cola", "soda", "un refresco de toronja"], chip: "refresco" }),
  ent("juice", "jugo", "juice", "m", { pl: "jugos", ltPl: "juices", forms: ["jugos", "jugo de naranja", "jugo natural", "jugo de pina", "jugo verde", "juguito", "un juguito"], chip: "jugo" }),
  ent("coconut", "agua | de | coco", "water | of | coconut", "f", { art: "un", def: "el", forms: ["agua de coco", "coco", "un coco", "coco frio", "un coco frio"], chip: "agua de coco",
    attrs: { nat: "coconut water" } }),
  ent("coffee", "café", "coffee", "m", { pl: "cafés", ltPl: "coffees", forms: ["cafecito", "un expreso", "expreso", "capuchino", "un capuchino", "americano", "un americano"], chip: "café" }),
  ent("tea", "té", "tea", "m", { forms: ["tecito", "te caliente", "una taza de te", "te verde", "manzanilla", "te de manzanilla"], chip: "té" }),
];
const OWN_DRINK = "margarita";

// Hobbies: what you like doing ("Me encanta {X}"), so every one is an infinitive phrase.
const HOBBIES: EntityDef[] = [
  ent("cooking", "cocinar", "cooking", "m", { art: "", forms: ["cocino", "la cocina", "hacer de comer", "preparar comida", "guisar"], chip: "cocinar", attrs: { mine: true } }),
  ent("baking", "hornear", "baking", "m", { art: "", forms: ["horneo", "hacer pasteles", "hacer pan", "la reposteria", "reposteria"], chip: "hornear", attrs: { tryable: true } }),
  ent("traveling", "viajar", "traveling", "m", { art: "", forms: ["viajo", "los viajes", "viajes", "conocer lugares nuevos", "conocer otros paises", "conocer lugares"], chip: "viajar", attrs: { mine: true } }),
  ent("hiking", "hacer | senderismo", "doing | hiking", "m", { art: "", forms: ["senderismo", "ir de excursion", "las excursiones", "excursiones", "la montana", "caminar en la montana", "hacer caminata", "ir a la montana"], chip: "hacer senderismo" }),
  ent("reading", "leer", "reading", "m", { art: "", forms: ["leo", "la lectura", "los libros", "libros", "leer libros", "novelas", "leer novelas"], chip: "leer" }),
  ent("walking", "caminar", "walking", "m", { art: "", forms: ["camino", "pasear", "los paseos", "paseos", "salir a caminar", "caminar con mi perro", "pasear a mi perro", "pasear al perro", "caminar por la playa", "caminar en la playa", "dar paseos", "salir a pasear"], chip: "caminar" }),
  // not "tryable": a local who loves cumbia has danced, and every adult has ridden a bike ("Siempre he querido probarlo")
  ent("dancing", "bailar", "dancing", "m", { art: "", forms: ["bailo", "el baile", "ir a bailar", "salir a bailar"], chip: "bailar" }),
  ent("swimming", "nadar", "swimming", "m", { art: "", forms: ["nado", "la natacion", "natacion", "el mar", "la playa", "ir a la playa", "nadar en el mar"], chip: "nadar", attrs: { mine: true } }),
  ent("diving", "bucear", "diving", "m", { art: "", forms: ["buceo", "el buceo", "snorkel", "hacer snorkel", "esnorquel", "nadar en los cenotes", "los cenotes", "ir a los cenotes"], chip: "bucear", attrs: { mine: true } }),
  ent("running", "correr", "running", "m", { art: "", forms: ["corro", "salir a correr", "el running"], chip: "correr" }),
  ent("cycling", "andar | en | bici", "riding | a | bike", "m", { art: "", forms: ["la bici", "bici", "bicicleta", "la bicicleta", "el ciclismo", "ciclismo", "andar en bicicleta", "pasear en bici"], chip: "andar en bici" }),
  ent("yoga", "hacer | yoga", "doing | yoga", "m", { art: "", forms: ["yoga", "el yoga", "hago yoga"], chip: "hacer yoga", attrs: { tryable: true } }),
  ent("photography", "tomar | fotos", "taking | pictures", "m", { art: "", forms: ["la fotografia", "fotografia", "las fotos", "fotos", "sacar fotos", "tomar fotografias"], chip: "tomar fotos", attrs: { tryable: true, mine: true } }),
  ent("painting", "pintar", "painting", "m", { art: "", forms: ["pinto", "la pintura", "dibujar", "dibujo", "el arte"], chip: "pintar", attrs: { tryable: true } }),
  ent("gardening", "cuidar | el | jardín", "taking care of | the | garden", "m", { art: "", forms: ["la jardineria", "jardineria", "el jardin", "mi jardin", "las plantas", "mis plantas", "cuidar mis plantas"], chip: "cuidar el jardín", attrs: { tryable: true } }),
  ent("fishing", "pescar", "fishing", "m", { art: "", forms: ["pesco", "la pesca", "ir a pescar"], chip: "pescar", attrs: { tryable: true } }),
  ent("singing", "cantar", "singing", "m", { art: "", forms: ["canto", "el karaoke", "karaoke"], chip: "cantar", attrs: { tryable: true } }),
  ent("guitar", "tocar | la | guitarra", "playing | the | guitar", "m", { art: "", forms: ["la guitarra", "guitarra", "toco la guitarra"], chip: "tocar la guitarra", attrs: { tryable: true } }),
  ent("movies", "ver | películas", "watching | movies", "m", { art: "", forms: ["el cine", "cine", "las peliculas", "peliculas", "ir al cine", "las series", "series", "ver series", "pelis", "ver pelis"], chip: "ver películas" }),
  ent("soccer", "jugar | futbol", "playing | soccer", "m", { art: "", forms: ["futbol", "el futbol", "jugar al futbol", "soccer"], chip: "jugar futbol" }),
  ent("basketball", "jugar | básquetbol", "playing | basketball", "m", { art: "", forms: ["basquetbol", "el basquetbol", "basquet", "baloncesto", "jugar basquet"], chip: "jugar básquetbol" }),
  ent("tennis", "jugar | tenis", "playing | tennis", "m", { art: "", forms: ["tenis", "el tenis", "padel", "el padel"], chip: "jugar tenis", attrs: { tryable: true } }),
  ent("gym", "hacer | ejercicio", "working | out", "m", { art: "", forms: ["el gym", "gym", "el gimnasio", "gimnasio", "al gimnasio", "al gym", "ir al gimnasio", "ir al gym", "ejercicio", "el ejercicio", "el deporte", "los deportes", "deporte", "hacer deporte"], chip: "hacer ejercicio" }),
];

const GENRES: EntityDef[] = [
  ent("jazz", "jazz", "jazz", "m", { forms: ["el jazz"], chip: "jazz", attrs: { mine: true } }),
  ent("cumbia", "cumbia", "cumbia", "f", { forms: ["la cumbia", "cumbias"], chip: "cumbia", attrs: { mine: true } }),
  ent("rock", "rock", "rock", "m", { forms: ["el rock", "rock en espanol", "rock and roll"], chip: "rock" }),
  ent("pop", "pop", "pop", "m", { forms: ["el pop", "musica pop"], chip: "pop" }),
  ent("classical", "música | clásica", "music | classical", "f", { forms: ["clasica", "musica clasica", "la clasica"], chip: "música clásica", attrs: { nat: "classical music" } }),
  ent("reggaeton", "reguetón", "reggaeton", "m", { forms: ["reggaeton", "regueton", "el reggaeton", "el regueton"], chip: "reguetón" }),
  ent("salsa", "salsa", "salsa", "f", { forms: ["la salsa"], chip: "salsa" }),
  ent("bachata", "bachata", "bachata", "f", { forms: ["la bachata"], chip: "bachata" }),
  ent("banda", "música | de | banda", "music | of | band", "f", { forms: ["banda", "la banda", "regional mexicano", "el regional mexicano", "corridos", "nortenas", "musica nortena", "mariachi", "el mariachi", "rancheras"], chip: "música de banda",
    attrs: { nat: "banda (Mexican brass music)" } }),
  ent("electronic", "música | electrónica", "music | electronic", "f", { forms: ["electronica", "la electronica", "techno", "house", "musica para bailar"], chip: "electrónica", attrs: { nat: "electronic music" } }),
  ent("hiphop", "hip-hop", "hip-hop", "m", { forms: ["hip hop", "el hip hop", "rap", "el rap"], chip: "hip-hop" }),
  ent("blues", "blues", "blues", "m", { forms: ["el blues"], chip: "blues" }),
  ent("country", "country", "country", "m", { forms: ["musica country", "el country"], chip: "country" }),
  ent("trova", "trova", "trova", "f", { forms: ["la trova", "boleros", "los boleros", "bolero"], chip: "trova", attrs: { nat: "trova (Latin ballads)" } }),
];

// Where the partner went last summer (one per visit), and the learner's own country for the learner's questions.
const HOME_FORMS = ["mi pais", "estados unidos", "los estados unidos", "canada", "inglaterra", "el reino unido", "reino unido", "irlanda", "australia",
  "nueva zelanda", "escocia", "gales", "nueva york", "londres", "toronto", "california", "texas"];
const COUNTRIES: EntityDef[] = [
  ent("oaxaca", "Oaxaca", "Oaxaca", "m", { art: "", forms: ["la ciudad de oaxaca"] }),
  ent("chiapas", "Chiapas", "Chiapas", "m", { art: "", forms: ["san cristobal", "san cristobal de las casas", "palenque"] }),
  ent("guanajuato", "Guanajuato", "Guanajuato", "m", { art: "", forms: ["san miguel de allende", "san miguel"] }),
  ent("merida", "Mérida", "Mérida", "f", { art: "", forms: ["merida", "yucatan"] }),
  ent("home", "mi | país", "my | country", "m", { art: "", forms: HOME_FORMS }),
];
const TRIP = ["oaxaca", "chiapas", "guanajuato", "merida"];

// Plans for the next date: verb phrases ("¿Te gustaría {X} el sábado?").
const ACTIVITIES: EntityDef[] = [
  ent("coffee", "tomar | un | café", "have | a | coffee", "m", { art: "", forms: ["un cafe", "por un cafe", "ir por un cafe", "tomar cafe", "tomarnos un cafe", "un cafecito", "ir por un cafecito", "tomar un cafecito"], chip: "tomar un café" }),
  ent("dinner", "cenar", "have dinner", "m", { art: "", forms: ["ir a cenar", "la cena", "una cena", "salir a cenar", "cenar juntos"], chip: "cenar" }),
  ent("movie", "ir | al | cine", "go | to the | movies", "m", { art: "", forms: ["el cine", "al cine", "ver una pelicula", "una pelicula", "ir a ver una pelicula", "ver una peli"], chip: "ir al cine" }),
  ent("beach", "ir | a | la | playa", "go | to | the | beach", "m", { art: "", forms: ["la playa", "a la playa", "caminar por la playa", "una caminata por la playa"], chip: "ir a la playa" }),
  ent("museum", "ir | al | museo", "go | to the | museum", "m", { art: "", forms: ["el museo", "al museo", "visitar el museo"], chip: "ir al museo" }),
  ent("dancing", "bailar", "go dancing", "m", { art: "", forms: ["ir a bailar", "a bailar", "salir a bailar", "bailar salsa"], chip: "bailar" }),
  ent("cenote", "ir | a | un | cenote", "go | to | a | cenote", "m", { art: "", forms: ["un cenote", "al cenote", "a un cenote", "los cenotes", "nadar en un cenote", "ir al cenote"], chip: "ir a un cenote" }),
];

const WDAYS: EntityDef[] = [
  ent("monday", "lunes", "Monday", "m"), ent("tuesday", "martes", "Tuesday", "m"), ent("wednesday", "miércoles", "Wednesday", "m"),
  ent("thursday", "jueves", "Thursday", "m"), ent("friday", "viernes", "Friday", "m"), ent("saturday", "sábado", "Saturday", "m"),
  ent("sunday", "domingo", "Sunday", "m"),
];
const DAY_IDS = new Set([...WDAYS.map((d) => d.id), "tomorrow", "day_after_tomorrow"]);

// Jobs and fields: recognized only (the partner reacts without repeating them).
const JOBS = ("enfermero/enfermera maestro/maestra profesor/profesora ingeniero/ingeniera programador/programadora desarrollador/desarrolladora " +
  "doctor/doctora medico/medica chofer conductor/conductora cocinero/cocinera chef mesero/mesera contador/contadora gerente vendedor/vendedora " +
  "disenador/disenadora fotografo/fotografa mecanico/mecanica electricista estilista peluquero/peluquera estudiante abogado/abogada dentista " +
  "farmaceutico/farmaceutica artista musico escritor/escritora periodista cientifico/cientifica traductor/traductora secretario/secretaria " +
  "asistente recepcionista cajero/cajera carpintero/carpintera plomero/plomera arquitecto/arquitecta pintor/pintora panadero/panadera barista " +
  "bartender consultor/consultora analista terapeuta psicologo/psicologa policia piloto empresario/empresaria emprendedor/emprendedora " +
  "agricultor/agricultora veterinario/veterinaria cuidador/cuidadora ninero/ninera obrero/obrera albanil sobrecargo aeromozo/aeromoza " +
  "maquillista jardinero/jardinera instructor/instructora entrenador/entrenadora").split(" ");
const JOB_PHRASES = ["desarrollador de software", "desarrolladora de software", "ingeniero de software", "ingeniera de software", "disenador grafico",
  "disenadora grafica", "maestro de ingles", "maestra de ingles", "profesor de ingles", "profesora de ingles", "agente de bienes raices",
  "agente inmobiliario", "agente inmobiliaria", "trabajador social", "trabajadora social", "entrenador personal", "entrenadora personal",
  "guia de turistas", "guia turistico", "guia turistica", "instructor de buceo", "instructora de buceo", "maestro de yoga", "maestra de yoga",
  "nomada digital", "ama de llaves", "chef de cocina"];
const FIELDS = ["tecnologia", "informatica", "sistemas", "computacion", "ventas", "marketing", "mercadotecnia", "finanzas", "un hospital", "una clinica",
  "un restaurante", "un hotel", "un banco", "una escuela", "una universidad", "una oficina", "una fabrica", "construccion", "salud", "educacion",
  "turismo", "una tienda", "una empresa", "una cafeteria", "una panaderia", "bienes raices", "una agencia", "una startup", "un despacho",
  "una consultoria", "recursos humanos", "la ensenanza", "la medicina", "la fotografia", "diseno", "una escuela de idiomas", "un kinder"];

// ---------------------------------------------------------------------------
// Helpers

type Topic = "job" | "hobby" | "travel" | "music";
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => norm(c.heard || "");
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open leave the list (their `when` checks goalMet). */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const partnerOf = (c: Ctx) => (c.player.datePartner === "sam" || c.player.datePartner === "emma"
  ? c.player.datePartner : c.player.gender === "m" ? "emma" : "sam");
const askedBack = (seg: Segment) => seg.tags.includes("askback");
/** "…¿y tú?" anywhere in the utterance (a job answer may come in two pieces). */
const backAll = (c: Ctx) => /\b(y tu|y a ti|tu que|que tal tu|y usted|y a usted|tu has ido|has ido tu)\b|(^|\W)tu\W*$/.test(heard(c));
/** The learner pays or splits in the same breath ("No, de verdad, yo pago", "Gracias, pero mejor dividimos"): their
 *  thanks or "¿de verdad?" doesn't accept the partner's offer. "La próxima pago yo" is about next time. */
const paysToo = (c: Ctx) => /\b(yo (pago|invito)|(pago|invito) yo|dejame (pagar|invitar\w*)|insisto|divid\w*|mitad|medias|pachas|cada (quien|uno)|lo mio|mi parte)\b/
  .test(heard(c).replace(/\b(la )?(proxima|siguiente)( vez)?( (yo )?(invito|pago|me toca|invitas|pagas)( yo| tu| a mi)?)?/g, ""));
/** Dinner for two at El Muelle (seafood on the malecón, "un poquito caro"; s69: about $300 a person with a drink),
 *  a main and a cocktail each: only said when asked. */
const CHECK_TOTAL = 90000;
const HALF_TOTAL = 45000;
/** "No quiero volver a verte", "Pensándolo bien, mejor no": a no to the second date itself, never just to a day
 *  (at the day step "No puedo", "Estoy ocupada" and a bare "No" only turn down the day offered). */
const datesOff = (c: Ctx) => /\b(no (quiero|me gustaria) (volver a verte|verte otra vez|verte de nuevo|salir (otra vez|de nuevo|contigo)|vernos (otra vez|de nuevo))|no creo que (sea (una )?buena idea|seamos compatibles|funcione|esto funcione|vaya a funcionar)|prefiero que no|no me interesa|(quedamos|quedemos|seamos) (solo )?(como )?amigos|no (estoy buscando|busco|quiero) (nada serio|una relacion|pareja|algo serio)|no (hay|siento|senti) (quimica|conexion)|me caes (muy )?bien pero no)\b|\bpensandolo bien (mejor )?no( gracias)?\s*$/
  .test(heard(c).replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim());

/** The learner's personal questions (tags of ask_personal) and the partner's answer to each ("live" and "pets" are
 *  picked in the handler: "a la vuelta" on the visits the partner lives right by El Muelle; the cat is qf_cats_yes). */
const PERSONAL = ["from", "always", "live", "pets", "dog", "age", "siblings", "kids", "family", "like_here", "food", "hungry"];
const PERSONAL_LINE: Record<string, string> = {
  from: "own_from", always: "own_always", dog: "pets_dog", age: "own_age", siblings: "own_siblings", kids: "own_kids",
  family: "own_family", like_here: "like_here", food: "own_food", hungry: "hungry",
};

const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };

/** Both small-talk topics of this visit answered (or dropped because the evening is ending). */
const topicsDone = (c: Ctx) => !!c.s.wrapUp || ((c.s.topics || []) as string[]).every((tp) => !!c.s.ans?.[tp] || asked(c, tp) >= 2);

/** Any learner turn counts as having said hello. */
const hi = (c: Ctx) => { c.s.greeted = true; };

/** The learner has ordered a drink: talk about the check is no longer "too early". */
const ordered = (c: Ctx) => !!c.s.drink;
/** Who pays, agreed before the check came ("Dividamos la cuenta" after the drinks): settled at the check. */
function settlePlan(c: Ctx) {
  c.s.checkDone = c.s.checkPlan;
  c.say(c.s.checkPlan === "split" ? "deal" : "thanks_pay");
}

/** The partner answers a topic about themselves. */
function tell(c: Ctx, topic: Topic) {
  if (c.s.told[topic]) return;
  c.s.told[topic] = true;
  c.s.toldTurn = turnId(c);
  if (topic === "job") c.say("own_job");
  else if (topic === "hobby") c.say("own_hobby");
  else if (topic === "travel") c.say("own_travel", { C: c.s.country });
  else c.say("own_music");
}

/** "¡Sí! ¿Tú has ido?", "No, todavía no. ¿Y tú?" at the travel question: the yes/no layer takes the answer and only
 *  the question back is left as a piece, so the answer is handled first. */
function travelYnFirst(c: Ctx) {
  if (c.step !== "travel" || c.s.ans.travel) return;
  const h = heard(c);
  const st = date.steps.find((x) => x.id === "travel");
  if (/^\W*(si|claro|por supuesto|obvio)\b/.test(h)) { st?.yes?.(c); c.s.toldTurn = turnId(c); }
  else if (/^\W*(no|nunca|todavia no|aun no)\b/.test(h)) st?.no?.(c);
}

/** The learner asked a topic question first: answer, then ask back ("¿Y tú?"). */
function askedAbout(c: Ctx, topic: Topic) {
  hi(c);
  if (topic === "travel") travelYnFirst(c);
  c.s.lastTopic = topic;
  const already = c.s.told[topic];
  if (already && c.s.toldTurn !== turnId(c)) c.say("told_you");
  tell(c, topic);
  if (!c.s.ans[topic]) { c.s.askBackShort = topic; c.ask(topic); }
}

/** The learner answered a topic: react (the caller says the reaction line), then tell ours if asked back. */
function answered(c: Ctx, topic: Topic) {
  hi(c);
  c.s.ans[topic] = true;
  c.s.lastTopic = topic;
}
function afterReaction(c: Ctx, topic: Topic, seg: Segment | null) {
  if (seg && askedBack(seg)) tell(c, topic);
}

// Automatic answers the simulation uses for the partner's optional questions.
const AUTO: Record<string, string> = {
  drinks: "Una copa de vino blanco, por favor", job: "Soy enfermero. ¿Y tú?", hobby: "Me encanta cocinar. ¿Y tú?",
  travel: "No, nunca. ¡Pero me encantaría ir!", music: "Sobre todo jazz. ¿Y tú?",
  check: "Déjame invitarte", like_job: "Sí, me encanta", cold: "Toma, ponte mi suéter", closing: "¡Te escribo! ¡Buenas noches!",
  qf: "¡Los dos!", qf2: "¡Los dos!", day: "¡Claro, el domingo me queda bien!",
};

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  intro_ctx(c) { hi(c); },
  voc(c) { hi(c); },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  g_howareyou(c, slots) { hi(c); GLOBAL_HANDLERS.g_howareyou(c as any, slots); },
  no_hobby(c, _slots, seg) { answered(c, "hobby"); if (once(c, "react")) { c.say("busy_life"); afterReaction(c, "hobby", seg); } },
  no_music(c, _slots, seg) { answered(c, "music"); if (once(c, "react")) { c.say("no_music_react"); afterReaction(c, "music", seg); } },
  greet_back(c) {
    hi(c);
    if (c.s.opening === "late" && !c.s.lateOk) { c.s.lateOk = true; }
    // "¡Igualmente!" to "¡Te ves muy bien!" is a compliment back
    if (c.s.complimented && !c.s.complimentBack && /^\W*(igualmente|igual)\b/.test(heard(c))) { c.s.complimentBack = true; c.say("aw"); }
  },
  sorry_late(c) {
    hi(c);
    if (once(c, "late")) c.say(c.s.opening === "late" ? "you_are_fine" : "just_got_here");
  },
  reassure(c) {
    hi(c);
    if (c.s.opening === "late" && !c.s.lateOk) { c.s.lateOk = true; if (once(c, "phew")) c.say("phew"); }
  },
  compliment(c) {
    hi(c);
    if (!once(c, "compliment")) return;
    if (c.s.complimented && !c.s.complimentBack) { c.s.complimentBack = true; c.say("aw"); return; }
    c.s.gotCompliment = true;
    c.say("thanks_compliment");
  },
  you_too(c) {
    hi(c);
    if (c.s.__finished) { c.s.textOk = true; return; }
    if (c.s.complimented && !c.s.complimentBack) { c.s.complimentBack = true; c.say("aw"); }
  },
  view(c) { hi(c); if (once(c, "view")) c.say("view"); },
  come_here_often(c) { hi(c); c.say("not_often"); },
  // drinks
  drink_ans(c, slots) {
    hi(c);
    const d = toArr(slots.drink)[0] ?? (c.s.sameDrink ? OWN_DRINK : undefined);
    c.s.drink = d || "water";
    if (!once(c, "drink")) return;
    c.say(c.s.drink === OWN_DRINK && c.s.toldDrink ? "same_drink" : "good_choice");
  },
  me_too_ctx(c, slots, seg) {
    if (c.step === "drinks") { H.same_drink_ans(c, slots, seg); return; }
    if (c.s.niceSaid && !c.s.niceTime) { H.nice_time(c, slots, seg); return; }
    hi(c);
  },
  same_drink_ans(c) {
    hi(c);
    c.s.drink = OWN_DRINK;
    if (!c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); c.say("same_drink"); } else if (once(c, "drink")) c.say("same_drink");
  },
  no_alcohol(c) { hi(c); c.s.noAlcohol = true; if (once(c, "drink")) c.say("no_alcohol_ok"); },
  no_drink_ctx(c, slots, seg) { H.no_alcohol(c, slots, seg); },
  ask_drink(c) {
    hi(c);
    if (!c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); }
    if (!c.s.drink && !c.s.noAlcohol) { c.s.drinkBack = true; c.ask("drinks"); }
  },
  // topics
  job_ans(c, slots, seg) {
    answered(c, "job");
    // a later piece of the same answer ("…trabajo en un hotel. ¿Y tú?") may still ask back
    if (!once(c, "react")) { afterReaction(c, "job", seg); return; }
    const same = seg.tags.includes("same_job") || toArr(slots.job).some((j: string) => /^fotograf/.test(j));
    if (same) { c.say("same_job"); c.s.told.job = true; c.s.toldTurn = turnId(c); return; }
    c.say("job_react");
    afterReaction(c, "job", seg);
    if (c.s.likeJobQ && !askedBack(seg) && !backAll(c)) likeJob(c);
  },
  // "Estoy un poco nervioso.": said once; the open question comes again after it
  nervous(c) { hi(c); if (!c.s.nervousSaid) { c.s.nervousSaid = true; c.say("nervous_too"); } },
  job_ctx(c, slots, seg) {
    // "Soy un poco tímido", "Trabajo en… perdón": not a job (the question stays open)
    if (/^(poco|poquito|algo|muy|bien|super|nuevo|nueva)\b|\b(tarde|cansad\w*|nervios\w*|hambre|perdon|temprano|timid\w*)\b/.test(norm(String(slots.w || "")))) { hi(c); return; }
    answered(c, "job"); if (once(c, "react")) c.say("job_react");
    afterReaction(c, "job", seg);
  },
  no_job(c, _slots, seg) { answered(c, "job"); if (once(c, "react")) { c.say(seg.tags.includes("retired") || seg.tags.includes("vacation") ? "retired_react" : "no_job_react"); afterReaction(c, "job", seg); } },
  ask_job(c) { askedAbout(c, "job"); },
  ask_like_job(c) {
    hi(c);
    // a bare "¿Y te gusta?" is about the job only right after the job talk
    if (!c.s.told.job) { if (!/\b(trabajo|chamba|foto\w*|bodas?)\b/.test(heard(c)) && c.s.lastTopic !== "job") return; tell(c, "job"); }
    if (once(c, "likeback")) c.say("own_like_job");
  },
  hobby_ans(c, slots, seg) {
    answered(c, "hobby");
    const hs = toArr(slots.hobby) as string[];
    if (!once(c, "react")) { afterReaction(c, "hobby", seg); return; }
    const mine = hs.find((h) => HOBBIES.find((e) => e.id === h)?.attrs?.mine);
    if (mine) { c.say("same_hobby", { H: mine }); c.s.told.hobby = true; c.s.toldTurn = turnId(c); return; }
    const tryable = hs.some((h) => HOBBIES.find((e) => e.id === h)?.attrs?.tryable);
    c.say(tryable ? "hobby_try" : "hobby_react");
    afterReaction(c, "hobby", seg);
  },
  ask_hobby(c) { askedAbout(c, "hobby"); },
  travel_yes_ctx(c) {
    answered(c, "travel");
    if (!once(c, "react")) return;
    c.say("travel_yes_react"); c.s.told.travel = true; c.s.toldTurn = turnId(c); // the reaction already says the partner was there
  },
  travel_no_ctx(c, _slots, seg) { answered(c, "travel"); if (once(c, "react")) { c.say("travel_no_react"); afterReaction(c, "travel", seg); } },
  ask_travel(c, slots) {
    const ctry = toArr(slots.country)[0] as string | undefined;
    if (ctry === "home") { hi(c); if (once(c, "home")) c.say("never_home"); return; }
    askedAbout(c, "travel");
  },
  ask_travel_general(c) { askedAbout(c, "travel"); },
  music_ans(c, slots, seg) {
    answered(c, "music");
    const gs = toArr(slots.genre) as string[];
    if (!once(c, "react")) { afterReaction(c, "music", seg); return; }
    const mine = gs.find((g) => GENRES.find((e) => e.id === g)?.attrs?.mine);
    if (mine) { c.say("same_music", { G: mine }); c.s.told.music = true; c.s.toldTurn = turnId(c); return; }
    c.say(gs.length || seg.tags.includes("anymusic") ? "music_react" : "music_react_all");
    afterReaction(c, "music", seg);
  },
  ask_music(c) { askedAbout(c, "music"); },
  and_you(c) {
    hi(c);
    travelYnFirst(c);
    const tp = c.s.lastTopic as Topic | undefined;
    if (tp && !c.s.told[tp]) { tell(c, tp); return; }
    if (c.s.toldTurn === turnId(c)) return; // a "yo también" already answered it
    if (c.s.drinkBack === false && !c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); return; }
    if (once(c, "andyou")) c.say("me_generic");
  },
  // quick questions (twist)
  qf_ctx() { /* answered through the pending */ },
  like_it_ctx() { /* answered through the like_job pending */ },
  dislike_it_ctx() { /* answered through the like_job pending */ },
  // the check
  // Before the check comes: "¡Si todavía no pedimos nada!" only while nothing is ordered. After the drinks the partner
  // agrees for later, and the check then comes without an offer to pay.
  pay_all(c) {
    hi(c);
    // "Too late, it's paid!" only when the partner paid or it was split; the learner who already paid gets a thank-you
    if (c.s.checkDone) { if (once(c, "pay")) c.say(c.s.checkDone === "learner" ? "aw" : "already_paid"); return; }
    if (!c.s.checkShown && !c.s.wrapUp) {
      if (ordered(c)) { c.s.checkPlan = "learner"; if (once(c, "pay")) c.say("if_you_insist"); }
      else if (once(c, "pay")) c.say("not_ordered_yet");
      return;
    }
    c.s.checkDone = "learner";
    if (once(c, "pay")) c.say(c.s.partnerOffered ? "if_you_insist" : "thanks_pay");
  },
  split(c) {
    hi(c);
    if (c.s.checkDone === "split") return;
    if (!c.s.checkShown && !c.s.wrapUp) {
      if (ordered(c)) { c.s.checkPlan = "split"; if (once(c, "pay")) c.say("when_it_comes"); }
      else if (once(c, "pay")) c.say("not_ordered_yet");
      return;
    }
    c.s.checkDone = "split";
    if (once(c, "pay")) c.say("deal");
  },
  accept_offer(c, slots, seg) {
    hi(c);
    if (paysToo(c)) return;
    if (c.s.partnerOffered && !c.s.checkDone) { c.s.checkDone = "partner"; if (once(c, "pay")) c.say("my_pleasure"); return; }
    if (/^\W*(muchas |mil )?gracias\b/.test(heard(c))) H.g_thanks(c, slots, seg);
  },
  ask_amount(c) {
    hi(c);
    if (!once(c, "amount")) return;
    // after "Yo invito": that is the answer, and the offer stays open (no "¿cómo hacemos con la cuenta?" after it)
    if (c.s.partnerOffered && !c.s.checkDone) { c.say("amount_treat"); c.hold(); return; }
    if (!c.s.checkShown) { c.say("amount_not_yet"); return; }
    if (c.s.checkDone === "partner") { c.say("amount_paid"); return; }
    if (c.s.checkDone === "split") { c.say("amount_half", { total: CHECK_TOTAL, amount: HALF_TOTAL }); return; }
    c.say("amount_total", { total: CHECK_TOTAL });
    if (c.step === "check" && !c.s.checkDone) c.hold(); // the learner answers who pays next
  },
  ask_check(c) { hi(c); if (!c.s.checkShown) { c.s.checkShown = true; c.say("check_here"); } },
  // "Entonces yo dejo la propina": at the partner's offer it accepts the treat; before any offer the partner offers
  tip(c) {
    hi(c);
    if (!c.s.checkShown && !c.s.wrapUp) { if (once(c, "pay")) c.say(ordered(c) ? "when_it_comes" : "not_ordered_yet"); return; }
    c.s.learnerTip = true;
    if (c.s.partnerOffered && !c.s.checkDone) { c.s.checkDone = "partner"; if (once(c, "pay")) c.say("deal"); return; }
    if (!c.s.checkDone && !c.s.checkPlan) { c.ask("check_offer"); return; }
    if (once(c, "pay")) c.say(c.s.checkDone === "learner" ? "aw" : "deal");
  },
  tip_q(c) { hi(c); if (once(c, "tipq")) c.say("tip_usual"); keepOffer(c); },
  card_q(c) { hi(c); if (once(c, "card")) c.say("cards_ok"); keepOffer(c); },
  // "¿Quién paga?", "¿Cómo le hacemos?": the partner offers to treat (or says it's settled)
  who_pays(c) {
    hi(c);
    if (!c.s.checkShown && !c.s.wrapUp) { if (once(c, "pay")) c.say(ordered(c) ? "amount_not_yet" : "not_ordered_yet"); return; }
    if (c.s.checkDone === "partner") { if (once(c, "pay")) c.say("amount_paid"); return; }
    if (c.s.checkDone) { if (once(c, "pay")) c.say("deal"); return; }
    if (c.s.checkPlan) { settlePlan(c); return; }
    if (!c.s.partnerOffered) { c.ask("check_offer"); return; }
    if (once(c, "pay")) c.say("amount_treat");
    c.hold(); // the offer stays open
  },
  // "Como quieras", "Tú decides": at the check the partner treats; to a day or a second date it is a yes
  as_you_like_ctx(c, slots, seg) {
    hi(c);
    if (c.step === "check" || c.step === "check_offer") {
      if (c.s.partnerOffered && !c.s.checkDone) { H.accept_offer(c, slots, seg); return; }
      H.who_pays(c, slots, seg);
      return;
    }
    H.agree_again(c, slots, seg);
  },
  // a bare "¿Segura?" / "¿Seguro?" to "Yo invito, ¿eh?"
  sure_ctx(c, slots, seg) { H.accept_offer(c, slots, seg); },
  // the learner's personal questions ("¿De dónde eres?", "¿Tienes mascotas?"): the partner's own facts, once each
  ask_personal(c, _slots, seg) {
    hi(c);
    const key = PERSONAL.find((k) => seg.tags.includes(k)) ?? "from";
    c.s.personal ||= {};
    if (c.s.personal[key]) { if (once(c, "told")) c.say("told_you"); return; }
    c.s.personal[key] = true;
    if (key === "live") c.say(c.s.livesClose ? "live_corner" : "live_blocks");
    else if (key === "pets") c.say("qf_cats_yes");
    else c.say(PERSONAL_LINE[key]);
    keepOffer(c);
  },
  // "Soy de Canadá", "Soy irlandesa. ¿Y tú?"
  from_ans(c, _slots, seg) {
    hi(c);
    c.s.lastTopic = undefined;
    if (!c.s.fromSaid) { c.s.fromSaid = true; c.say("from_react"); }
    if (askedBack(seg) || backAll(c)) {
      c.s.toldTurn = turnId(c);
      c.s.personal ||= {};
      if (!c.s.personal.from) { c.s.personal.from = true; c.say("own_from"); }
    }
  },
  // the end of the evening
  nice_time(c) {
    hi(c);
    c.s.niceTime = true; c.s.wrapUp = true;
    if (!once(c, "nice")) return;
    if (c.s.niceSaid) c.say("glad");
    else { c.s.niceSaid = true; c.say("me_too_nice"); }
  },
  see_again(c, slots) {
    hi(c);
    c.s.learnerAsked = true; c.s.wrapUp = true;
    if (!c.s.againOk) { c.s.againOk = true; c.say("id_like_that"); }
    proposeDay(c, slots);
  },
  agree_again(c, slots, seg) {
    hi(c);
    // "¿A qué hora?" (#time): the day first, the time later ("La hora la vemos después.")
    const time = !!seg?.tags?.includes("time");
    if (c.step === "again" || (c.s.partnerAsked && !c.s.againOk)) {
      if (!c.s.againOk) { c.s.againOk = true; if (once(c, "agree")) c.say("yay_great"); }
      if (time) timeByText(c);
      proposeDay(c, slots);
      return;
    }
    // "El domingo me queda bien": the day said wins over the one offered
    if (c.step === "day" || c.s.dayOffered) {
      if (toArr(slots?.day).length) { proposeDay(c, slots); if (time) timeByText(c); return; }
      // "Cuando quieras" to "¿Cuándo tienes tiempo?": the partner names a day
      if (!c.s.offerDay && c.step === "day") { if (time) timeByText(c); offerWeekday(c); return; }
      dayYes(c);
      if (time) timeByText(c);
      return;
    }
    if (c.s.againOk) proposeDay(c, slots);
  },
  // "Prefiero que no", "No me interesa", "Mejor como amigos": only where a second date is being asked about
  no_date_ctx(c) { hi(c); declineDate(c); },
  decline_again(c, slots) {
    hi(c);
    if (c.s.declined) return;
    // "No quiero volver a verte" after an earlier yes is still a no to the date, not to the day offered
    if (datesOff(c)) { declineDate(c); return; }
    const said = toArr(slots?.day)[0] as string | undefined;
    if (c.s.againOk) { // a day that doesn't work
      if (once(c, "dayno")) dayNo(c, said);
      c.hold();
      return;
    }
    // "Sí, pero este fin de semana no puedo", "El domingo no puedo": yes to meeting again, not that day
    if (said) {
      c.s.againOk = true; c.s.partnerAsked = true;
      if (once(c, "dayno")) dayNo(c, said, true);
      return;
    }
    c.s.declined = true;
    if (once(c, "decline")) c.say("no_pressure");
  },
  propose_day(c, slots) {
    hi(c);
    c.s.wrapUp = true;
    const concrete = toArr(slots.day).length || toArr(slots.activity).length;
    if (!c.s.againOk) { c.s.againOk = true; c.s.learnerAsked = true; if (!concrete) c.say("id_like_that"); }
    proposeDay(c, slots);
  },
  walk_home(c) {
    hi(c);
    c.s.wrapUp = true;
    if (!once(c, "walk")) return;
    c.s.walk = true;
    c.say(c.s.livesClose ? "live_close" : "id_like_walk");
    (c.s.personal ||= {}).live = true; // where the partner lives is now said ("¿Dónde vives?" → "¡Ja, ya te dije!")
  },
  offer_jacket(c) { hi(c); if (once(c, "jacket")) c.say("so_sweet"); c.s.coldDone = true; },
  cold_q_ctx(c) { hi(c); if (c.s.coldDone || !once(c, "coldq")) return; c.say("a_little_cold"); if (!c.s.coldQ) { c.s.coldQ = true; c.hold(); } },
  day_ctx(c, slots, seg) { H.propose_day(c, slots, seg); },
  thanks_compliment(c) { hi(c); c.s.thankedCompliment = true; },
  text_reply(c) { hi(c); c.s.textOk = true; },
  thanks_evening(c) { hi(c); c.s.niceTime = true; c.s.wrapUp = true; if (once(c, "nice")) c.say("thank_you_too"); },
  g_thanks(c) {
    // "¡Gracias!" after a compliment or a treat needs no "De nada".
    hi(c);
    if (c.s.gotCompliment && !c.s.thankedCompliment) { c.s.thankedCompliment = true; return; }
    if (c.s.partnerOffered && !c.s.checkDone && !paysToo(c)) { c.s.checkDone = "partner"; if (once(c, "pay")) c.say("my_pleasure"); return; }
    // otherwise a smile is enough
  },
  g_ok(c) { hi(c); stepYes(c); },
  hesitate(c) {
    hi(c);
    if ((c.step === "again" || c.s.partnerAsked) && !c.s.againOk) { if (once(c, "hes")) c.say("think_about_it"); c.hold(); return; }
    if (c.step === "day") { c.say("when_free"); c.hold(); }
  },
  no_sorry(c) {
    hi(c);
    if (datesOff(c)) return; // "No, perdón, no creo que sea buena idea": the decline in the same turn answers it
    const st = date.steps.find((x) => x.id === c.step);
    if (st?.no && !st.done(c)) st.no(c);
    else if (c.step === "again" || (c.s.partnerAsked && !c.s.againOk)) H.decline_again(c, {}, { intent: "decline_again", slots: {}, tags: [] });
  },
  agree(c) { hi(c); stepYes(c); },
  react_nice(c) { hi(c); },
  g_bye(c) {
    // "¡Buenas noches!" at the start of the evening is a hello
    if (!c.s.wrapUp && /^\W*(hola\W+)?buenas noches\W*(santiago|santi|camila|cami)?\W*$/.test(heard(c))) { H.g_hello(c, {}, { intent: "g_hello", slots: {}, tags: [] }); return; }
    hi(c);
    // The date may end once the next one is agreed after the chat, or after the learner said no.
    const goal = !!c.s.dayAgreed && topicsDone(c);
    if (!goal && !c.s.declined && !c.s.byeWarned) {
      c.s.byeWarned = true;
      c.say("leaving_already");
      // "Sí, perdón." ends the evening; "¡No, no!" (or any other answer) goes on with it
      c.expect({
        id: "leaving_q", optional: true, hints: ["g_yesno"], suggest: [{ lt: "Say whether you're leaving", hint: "g_yesno" }],
        yes: (cc) => { if (once(cc, "bye")) cc.say("good_night"); cc.end(); },
        no: () => { /* staying: the open question comes again */ },
        on: { g_bye: (cc, sl, sg) => H.g_bye(cc, sl, sg), no_sorry: () => { /* "No, no, perdón": staying */ } },
      });
      return;
    }
    if (goal) win(c);
    if (once(c, "bye")) c.say("good_night");
    c.end();
  },
};

// Quick questions (twist): two of three, each answered with one word.
const QF: { line: string; hint: string; pair: [string, string]; react: Record<string, string> }[] = [
  { line: "qf_coffee", hint: "quick_coffee", pair: ["coffee", "tea"], react: { coffee: "qf_me_too", tea: "qf_tea" } },
  { line: "qf_cats", hint: "quick_pets", pair: ["cats", "dogs"], react: { cats: "qf_cats_yes", dogs: "qf_dogs" } },
  { line: "qf_beach", hint: "quick_beach", pair: ["beach", "mountain"], react: { beach: "qf_beach_yes", mountain: "qf_mountain" } },
];
function quick(c: Ctx, n: number) {
  const q = QF[(c.s.qfOrder as number[])[n]];
  if (n > 0) c.say(q.line);
  const answer = (cc: Ctx, pick?: string) => {
    cc.say(pick && q.react[pick] ? q.react[pick] : "qf_both");
    if (n === 0) quick(cc, 1); else cc.s.qfDone = true;
  };
  c.expect({
    id: n === 0 ? "qf" : "qf2", expects: ["qf_ctx"], hints: [q.hint],
    suggest: [{ lt: "Answer quickly", hint: q.hint }],
    on: {
      // "No me gustan los gatos": the other one of the pair
      qf_ctx: (cc, sl, sg) => {
        const pick = toArr(sl.qf)[0] as string | undefined;
        answer(cc, sg?.tags?.includes("neg") && pick && q.pair.includes(pick) ? q.pair.find((x) => x !== pick) : pick);
      },
      me_too_ctx: (cc) => answer(cc),
    },
    ask: (cc) => cc.say(q.line),
  });
}

function likeJob(c: Ctx) {
  c.s.likeJobQ = false;
  c.say("like_job_q");
  c.expect({
    id: "like_job", expects: ["like_it_ctx", "dislike_it_ctx"], hints: ["like_job"], suggest: [{ lt: "Say whether you like your job", hint: "like_job" }],
    yes: (cc) => cc.say("thats_great"), no: (cc) => cc.say("not_every_job"),
    on: {
      no_sorry: (cc) => cc.say("not_every_job"),
      g_ok: (cc) => cc.say("thats_great"), agree: (cc) => cc.say("thats_great"), like_it_ctx: (cc) => cc.say("thats_great"),
      dislike_it_ctx: (cc) => cc.say("not_every_job"), and_you: (cc, sl, sg) => { H.and_you(cc, sl, sg); },
    },
    ask: (cc) => cc.say("like_job_q"),
  });
}

/** A day in the learner's words ("¿Qué tal el sábado?", "¿Te gustaría ir al cine el domingo?"). */
function proposeDay(c: Ctx, slots: any) {
  const act = toArr(slots?.activity)[0];
  if (act) c.s.activity = act;
  let day = toArr(slots?.day)[0] as string | undefined;
  if (day === "today" || day === "tonight") day = undefined;
  if (!day) return;
  // "¿Este fin de semana?": the partner names the day (the day step asks it); "¿La próxima semana?": which day?
  if (day === "this_weekend" || day === "next_weekend") {
    if (c.s.dayAgreed) return;
    if (c.s.activity && !c.s.loveSaid) { c.s.loveSaid = true; c.say("love_that"); }
    c.s.offerDay = c.s.busySat ? "sunday" : "saturday"; c.s.dayOffered = true;
    return;
  }
  if (day === "next_week") {
    if (c.s.dayAgreed) return;
    c.s.offerDay = undefined;
    c.say("which_day");
    c.expect({ id: "which_day", expects: ["day_ctx", "propose_day", "agree_again", "no_date_ctx", "as_you_like_ctx"], hints: ["day_answer"],
      suggest: [{ lt: "Name a day", hint: "again", options: "activity" }], ask: (cc) => cc.say("which_day"),
      on: {
        day_ctx: (cc, sl, sg) => H.propose_day(cc, sl, sg), propose_day: (cc, sl, sg) => H.propose_day(cc, sl, sg),
        // "Cuando quieras", "El martes no puedo", "Pensándolo bien, mejor no"
        agree_again: (cc, sl, sg) => { if (toArr(sl?.day).length) H.propose_day(cc, sl, sg); else offerWeekday(cc); },
        as_you_like_ctx: (cc) => offerWeekday(cc),
        decline_again: (cc, sl, sg) => H.decline_again(cc, sl, sg), no_date_ctx: (cc) => declineDate(cc),
      } });
    return;
  }
  // Saturday is the parents' day (twist): the day step then asks about Sunday
  if (day === "saturday" && c.s.busySat && !c.s.busySatDone && c.s.offerDay !== "saturday") {
    c.s.busySatDone = true; c.twist("busy_saturday");
    c.say("busy_saturday"); c.s.offerDay = "sunday"; c.s.dayOffered = true;
    return;
  }
  if (DAY_IDS.has(day)) { c.s.day = day; agreeDay(c, day !== c.s.offerDay); }
}
/** byLearner: the learner named the day ("¡El sábado me queda bien!" from the partner);
 *  otherwise the learner accepted the partner's day ("¡Perfecto! ¡Quedamos!"). */
function agreeDay(c: Ctx, byLearner = true) {
  if (c.s.dayAgreed) return;
  c.s.dayAgreed = true;
  if (c.s.activity && !c.s.loveSaid) { c.s.loveSaid = true; c.say("love_that"); }
  if (byLearner) {
    if (c.s.day === "tomorrow") c.say("day_works_tomorrow");
    else if (c.s.day === "day_after_tomorrow") c.say("day_works_after");
    else c.say("day_works", { D: c.s.day });
  }
  else if (!c.s.loveSaid) c.say("perfect");
  c.say("its_a_date");
}
/** The day just named (or the one offered) doesn't work: Sunday instead of Saturday, otherwise "¿Cuándo tienes tiempo?".
 *  fresh: said at "¿Te puedo volver a ver?" (the day step asks next, so nothing is said here). */
function dayNo(c: Ctx, said?: string, fresh = false) {
  const weekend = said === "this_weekend" || said === "next_weekend";
  const refused: string[] = (c.s.noDays ||= []);
  const no = weekend ? undefined : said || c.s.offerDay;
  if (no && !refused.includes(no)) refused.push(no);
  if (weekend) c.s.noWeekend = true;
  const alt = nextWeekendDay(c);
  if (alt) {
    c.s.offerDay = alt; c.s.dayOffered = true;
    if (!fresh) { if (alt === "sunday") c.say("how_about_sunday"); else c.say("are_you_free_on", { D: alt }); }
    return;
  }
  c.s.offerDay = undefined;
  if (fresh) c.s.whenFree = true; else c.say("when_free");
}
/** The weekend day the partner can still offer: not one the learner turned down, not the parents' Saturday (twist). */
const nextWeekendDay = (c: Ctx) => (c.s.noWeekend ? undefined
  : ["saturday", "sunday"].find((d) => !((c.s.noDays || []) as string[]).includes(d) && !(d === "saturday" && c.s.busySat)));
function dayYes(c: Ctx) {
  if (c.s.offerDay) { c.s.day = c.s.offerDay; agreeDay(c, false); }
}
/** "Cuando quieras" with no day on the table: a weekday the learner hasn't turned down ("¿Estás libre el viernes?"). */
function offerWeekday(c: Ctx) {
  const refused = (c.s.noDays || []) as string[];
  const d = nextWeekendDay(c) ?? ["friday", "thursday", "wednesday", "tuesday", "monday"].find((x) => !refused.includes(x));
  if (!d) { c.say("when_free"); c.hold(); return; }
  c.s.offerDay = d; c.s.dayOffered = true;
  c.say("are_you_free_on", { D: d });
  c.hold();
}
/** A side question at "Yo invito, ¿eh?" ("¿Dejamos propina?"): answered, and the offer stays open (never "¿cómo hacemos
 *  con la cuenta?" after it, nor taken as accepted). */
function keepOffer(c: Ctx) { if (c.step === "check_offer" && c.s.partnerOffered && !c.s.checkDone) c.hold(); }
/** "¿A qué hora?": answered once ("La hora la vemos después."). */
function timeByText(c: Ctx) { if (!c.s.timeSaid) { c.s.timeSaid = true; c.say("time_by_text"); } }
/** A no to the second date itself, at any point of the plan: said once, and the evening ends kindly (finish). */
function declineDate(c: Ctx) {
  if (c.s.declined) return;
  c.s.declined = true; c.s.wrapUp = true;
  c.s.offerDay = undefined; c.s.dayOffered = false;
  if (once(c, "decline")) c.say("no_pressure");
}

function stepYes(c: Ctx) {
  const st = date.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

// Flags used more than once
const PADRE = "Mexican: ¡qué padre! = how cool! (elsewhere: ¡qué bien!).";
const MANCHES = "Mexican and casual: ¡no manches! = no way! (elsewhere: ¡no puede ser!).";
const ART_DAY = "The article before a weekday means “on”.";
const INVITAR = "invitar: to treat someone, to pay for them. Whoever invites usually pays.";

// ---------------------------------------------------------------------------

export const date: SituationDef = {
  id: "s84-date",
  song: 84,
  songTitle: "Can I See You Again?",
  title: { en: "¿Te puedo volver a ver?", lt: "Can I see you again?" },
  topic: { en: "Una primera cita", lt: "A first date" },
  chapter: 5,
  order: 5,
  location: "the-pier",
  npc: "sam",
  npcs: ["emma"],
  goal: "Chat on a first date, sort out the check, and agree to meet again.",
  intro: "Restaurante El Muelle, on the malecón at sunset. This is your first date: you met online. People here often greet with one kiss on the cheek, and you talk to each other with tú.",
  entities: { drink: DRINKS, hobby: HOBBIES, genre: GENRES, country: COUNTRIES, activity: ACTIVITIES, wday: WDAYS },
  // the voiced values: the check is one fixed sum (amount_total, amount_half), so both dates say both in their own voice
  domains: { total: () => [CHECK_TOTAL], amount: () => [HALF_TOTAL] },

  grammar: {
    macros: {
      ab: "(y tu | y a ti | y tu que | tu que | que tal tu | y tu que me cuentas | y usted #tip:usted_date | y a usted #tip:usted_date) #askback",
      // "No, nunca. ¿Tú has ido?", "Sí, ya fui. ¿Y tú lo conoces?": the question back after a travel answer
      abt: "((y tu | y a ti | y tu que | y usted #tip:usted_date) | [y] [tu] (has ido | has estado | lo conoces | la conoces | conoces | fuiste) [tu] [ahi | alla]) #askback",
      look: "(te ves | te miras | estas | luces)",
      nice_adj: "(muy bien | bien | super bien | guapo | guapa | bonito | bonita | hermoso | hermosa | lindo | linda | increible | precioso | preciosa | genial | elegante | espectacular | padrisimo | padrisima | guapisimo | guapisima)",
      clothes: "(vestido | camisa | blusa | chamarra | chaqueta | saco | zapatos | aretes | collar | bolsa | pelo | cabello | sonrisa | lentes | reloj | sueter | estilo | ropa | look | outfit | playera | falda)",
      drink_np: "[(un | una | uno | una copa de | un vaso de | una botella de | una copita de | una taza de)] {drink} [bien | muy] [(fria | frio | helada | helado | de mango | de fresa)]",
      have: "(para mi | quiero | quisiera | me gustaria | voy a (pedir | tomar | querer) | [yo] creo que (voy a pedir | quiero | me tomo) | me (pido | tomo) | pido | tomo #blunt | a mi (dame | me traes) | me (da | trae | pone | das | traes) | ponme | dame | se me antoja | yo quiero | mejor | me pides)",
      like: "(me gusta | me gustan | me encanta | me encantan | me gusta mucho | me encanta mucho | me gustan mucho | disfruto | soy fan de | me fascina | me fascinan | amo | adoro)",
      when_d: "{day} [(en la noche | en la tarde | en la manana | por la noche | por la tarde | temprano)]",
      sorry: "[(perdon | perdona | lo siento | ay | uy | desafortunadamente | la verdad | fijate que)]",
      isnice: "(es | esta) [muy] (bonito | bonita | padre | lindo | linda | precioso | preciosa | bueno | buena | interesante)",
      jacket: "(chamarra | chaqueta | sueter | saco | sudadera | chal | rebozo | abrigo)",
      hp: "(en | por | cerca de | junto a) [el | la] (mar | playa | parque | malecon | cenote | cenotes | gimnasio | alberca | piscina | agua)",
    },
    slots: {
      job: { lexicon: [
        ...JOBS.map((j) => { const [m, f] = j.split("/"); return { id: m, forms: [m, m + "s", ...(f ? [f, f + "s"] : [])] }; }),
        ...JOB_PHRASES.map((j) => ({ id: j.replace(/ /g, "_"), forms: [j] })),
      ] },
      field: { lexicon: FIELDS.map((f) => ({ id: f.replace(/^(un|una|la|el) /, "").replace(/ /g, "_"), forms: [f] })) },
      qf: { lexicon: [
        { id: "coffee", forms: ["cafe", "el cafe", "cafecito"] }, { id: "tea", forms: ["te", "el te", "tecito"] },
        { id: "cats", forms: ["gatos", "gato", "los gatos", "gatitos"] }, { id: "dogs", forms: ["perros", "perro", "los perros", "perritos"] },
        { id: "beach", forms: ["playa", "la playa", "el mar"] }, { id: "mountain", forms: ["montana", "la montana", "las montanas", "el bosque"] },
        { id: "both", forms: ["los dos", "las dos", "ambos", "ambas", "las dos cosas", "me gustan los dos", "me gustan las dos"] },
        { id: "neither", forms: ["ninguno", "ninguna", "ninguno de los dos", "ninguna de las dos", "ni uno ni otro"] },
      ] },
      // where the learner is from ("Soy de Canadá"): an English-speaking country or city
      origin: { lexicon: [{ id: "home", forms: HOME_FORMS.filter((f) => f !== "mi pais") }] },
    },
  },

  intents: {
    voc: { patterns: ["(santiago | santi | camila | cami)"] },
    intro_ctx: { patterns: ["[hola] (soy | me llamo | mi nombre es) {name} [mucho gusto | encantado | encantada]", "[hola] soy yo [{name}]"] },
    greet_back: { patterns: [
      "[hola] [que | muy] gusto (conocerte | verte) [por fin] [en persona] #h:gr_nice",
      "[hola] (igualmente | igual) [mucho gusto | que gusto] #h:gr_nice_too", "[hola] mucho gusto [igualmente] #h:gr_nice_too",
      "(encantado | encantada) [de conocerte]", "(que | muy) (bueno | padre | bien | lindo) (conocerte | verte) [por fin] [en persona]",
      "(por fin | al fin)", "el gusto es mio", "me da (mucho | tanto) gusto conocerte [por fin]",
      "[yo tambien] tenia (muchas | tantas) ganas de (conocerte | verte | esto)", "hola de nuevo",
    ] },
    sorry_late: { patterns: [
      "[perdon | perdona | disculpa | lo siento] (por llegar tarde | por la tardanza | por el retraso | por hacerte esperar) #h:gr_sorry_late",
      "(perdon | perdona | disculpa | lo siento) [ya] llegué tarde", "(siento | lamento) llegar tarde", "[perdon | perdona] llego tarde",
      "[perdon | perdona] (llegué | vengo) [un poco | un poquito | muy] tarde", "(perdon | perdona | disculpa) (la demora | la tardanza | la espera)",
      "[perdon | perdona] (habia mucho trafico | me perdi | no encontraba (estacionamiento | donde estacionarme | el lugar | el restaurante))",
      "llegué tarde [perdon]",
    ] },
    reassure: { patterns: [
      "no te preocupes #h:gr_no_worries", "no pasa nada #h:gr_thats_ok", "(no hay problema | no importa | tranquilo | tranquila | no hay bronca) #h:gr_thats_ok",
      "[yo] [tambien] acabo de llegar [tambien | yo tambien]", "(yo | yo tambien) llegué hace (poco | un ratito | un rato | cinco minutos | diez minutos)",
      "llegué hace (cinco | diez | dos | unos | {number}) minutos", "[solo | nomas] (fueron | son) [unos] (cinco | diez | dos | {number}) minutos",
      "llegué [un poco | un poquito] temprano", "(yo | yo tambien) llegué tarde", "no fue nada", "no llegaste tarde", "no es tarde",
      "no tienes que (disculparte | pedir perdon)", "[no pasa nada] (el estacionamiento | estacionarse) [aqui] es (terrible | dificil | un problema | imposible)",
    ] },
    compliment: { patterns: [
      "@look @nice_adj [hoy | esta noche] #h:cm_look", "@look @nice_adj tu tambien", "(wow | guau | orale) @look @nice_adj",
      "me (gusta | encanta) (tu | tus) @clothes #h:cm_love", "(que | muy) (bonito | bonita | lindo | linda | padre | elegante) (tu | tus | ese | esa) @clothes",
      "tienes (una sonrisa muy bonita | una sonrisa preciosa | una sonrisa muy linda | una bonita sonrisa | unos ojos muy bonitos | bonitos ojos)",
      "eres [muy | super | tan] (simpatico | simpatica | divertido | divertida | lindo | linda | amable | interesante | guapo | guapa | bonita | hermosa | hermoso | chistoso | chistosa)",
      "(tu | tus) @clothes (esta | estan) [muy | super] @nice_adj", "te ves [igual | igualito | igualita] (que | como) en (tus | las) fotos",
      "[ay] gracias tu tambien @look @nice_adj", "estas [muy | super] (guapo | guapa | bonita | linda | hermosa)", "que (guapo | guapa | bonita | linda) (estas | te ves)",
    ] },
    you_too: { patterns: ["[gracias] tu tambien #h:cm_you_too", "tu tambien te ves @nice_adj", "[gracias] tu igual"] },
    view: { patterns: [
      "(este lugar | este restaurante | el lugar | el restaurante) (esta | es) [muy | super] (bonito | lindo | padre | increible | precioso | hermoso | genial) #h:cm_place",
      "(la vista | el atardecer | el mar | la puesta de sol) (esta | es) [muy | super] (bonita | bonito | hermosa | hermoso | preciosa | precioso | increible | espectacular) #h:cm_view",
      "que (bonita | linda | hermosa | increible) (vista | puesta de sol)", "que (bonito | lindo | hermoso | increible) (atardecer | lugar | restaurante)",
      "mira (el atardecer | la vista | el mar)", "me encanta (este lugar | la vista | el atardecer | este restaurante)",
    ] },
    come_here_often: { patterns: ["(vienes | sueles venir) [aqui] (seguido | mucho | a menudo) [aqui]", "sueles venir aqui", "ya (habias venido | has venido | conocias) [aqui | este lugar | antes]"] },
    // drinks
    drink_ans: { patterns: [
      "@have @drink_np [para mi] #h:dr_have", "@drink_np [para mi] #h:dr_short", "[@have] una copa de {drink} #h:dr_glass",
      "(solo | nomas | nada mas) @drink_np [para mi]", "creo que @drink_np", "[un | una] {drink} (suena bien | esta bien | me parece bien)",
      "(estoy manejando | voy a manejar | tengo que manejar) [asi que] [solo | nomas] @drink_np", "(pidamos | pedimos | vamos a pedir) @drink_np",
      // "Una cerveza... no, mejor una limonada": the second one counts
      "[@have] [un | una] {nd:drink} [no] (mejor | perdon | bueno no) [@have] @drink_np", "no {nd:drink} no [@have] @drink_np",
    ] },
    same_drink_ans: { patterns: [
      "lo mismo [para mi | que tu] #h:dr_same", "(yo | yo tambien) (quiero | pido | tomo) lo mismo [que tu]", "(que sean | entonces) dos",
      "(yo tambien | a mi tambien) (una margarita | lo mismo)", "igual que tu", "(dame | pideme | pide) lo mismo [para mi]", "otra (para mi | igual)",
      "(yo tambien | tambien) quiero una margarita",
    ] },
    me_too_ctx: { patterns: ["yo tambien #h:nt_me_too", "a mi tambien", "yo igual", "lo mismo digo", "[si] (yo tambien | igual) (la pasé | me la pasé) (muy bien | super bien | increible)"] },
    no_alcohol: { patterns: [
      "no (tomo | bebo) [alcohol]", "nada de alcohol [para mi]", "no voy a tomar [alcohol] [hoy | esta noche]", "(sin | nada con) alcohol [para mi]",
      "(estoy manejando | voy a manejar | tengo que manejar) [hoy | esta noche]", "no (alcohol | vino | cerveza | {drink}) para mi [hoy | esta noche]",
      "no quiero [nada de] (alcohol | vino | cerveza) [hoy | esta noche]", "algo sin alcohol",
    ] },
    // "Nada, gracias", "No quiero cerveza": only an answer to "¿Qué quieres tomar?" (elsewhere "nada" or "no tomo café"
    // answers another question)
    no_drink_ctx: { patterns: [
      "(nada | ahorita nada | por ahora nada | todavia nada | nada por ahora) [para mi] [gracias]", "no (tomo | quiero) {drink} [hoy | esta noche] [gracias]",
      "no (quiero | voy a tomar) nada [por ahora | ahorita] [gracias]",
    ] },
    ask_drink: { patterns: [
      "[y] [tu] que vas a (tomar | pedir) [tu] #h:dr_ask", "que (quieres | te gustaria) (tomar | pedir)", "que (tomas | pides) [tu]",
      "que me recomiendas [tomar | de tomar]", "que (sueles tomar | tomas normalmente)", "que es bueno aqui",
    ] },
    // job
    job_ans: { patterns: [
      "(soy | trabajo como | trabajo de) [un | una] {job} [@ab] #h:job_im", "trabajo (en | para) {field} [@ab] #h:job_field",
      "(soy | trabajo como | trabajo de) [un | una] {job} en {field} [@ab]", "[un | una] {job} [@ab]",
      "[yo] tambien soy (fotografo | fotografa) #same_job", "soy (fotografo | fotografa) tambien #same_job",
      "tengo (mi propio negocio | mi propia empresa | un negocio | una empresa | una tienda | un restaurante | un cafe | una panaderia) [chico | chica | pequeno | pequena] [@ab]",
      "trabajo (desde casa | en casa | en una oficina | en linea | remoto | a distancia | por internet | en el centro | en linea clara) [@ab]",
      "trabajo (en linea | desde casa | remoto) [y] soy {job} [@ab]",
      "trabajo con (computadoras | ninos | gente | carros | animales | pacientes | clientes | turistas) [@ab]",
      "tengo (un trabajo | una chamba | trabajo | chamba) (en | para) {field} [@ab]", "(chambeo | trabajo) en {field} [@ab]",
      "mi (trabajo | profesion) es [ser] {job} [@ab]", "(soy | trabajo como) {job} y me (gusta | encanta) [mucho] [@ab]",
      "trabajo (para | en) una empresa (grande | pequena | chica | internacional | local | americana | canadiense | inglesa) [@ab]",
      "(estoy en | me dedico a) {field} [@ab]", "trabajo (para | en) una (empresa | compania) de {field} [@ab]",
      "(trabajo por mi cuenta | soy freelance | trabajo independiente | soy independiente) [@ab]", "soy (dueno | duena) de (un | una) {w:any} [@ab]", "(estudio | soy estudiante | estoy estudiando) [en la universidad] [@ab]",
      "(doy clases | enseno) [de (ingles | matematicas | musica | arte | historia | ciencias | idiomas | yoga | baile)] [(en | a) (una escuela | la universidad | una preparatoria | un kinder | ninos | adultos)] [@ab]",
    ] },
    job_ctx: { patterns: ["(soy | trabajo como) (un | una) {w:any} [@ab]", "trabajo (como | de) {w:any} [@ab]", "trabajo en {w:any} [@ab]", "me dedico a {w:any} [@ab]"] },
    // "Estoy un poco nervioso." (the partner is too)
    nervous: { patterns: [
      "[perdon] [la verdad] (estoy | me siento) [un poco | un poquito | algo | muy | bien | super | medio] (nervioso | nerviosa | timido | timida) [hoy | ahorita | ahora | esta noche] [la verdad] [@ab]",
      "[perdon] (es | esta es) mi primera cita [en (mucho tiempo | anos | un buen rato | mucho)] [@ab]",
      "hace (mucho tiempo | anos | mucho) que no (tengo | salgo a) una cita",
    ] },
    no_job: { patterns: [
      "(estoy | ya estoy) (jubilado | jubilada | retirado | retirada) #retired [@ab]", "soy (jubilado | jubilada) #retired [@ab]", "ya me jubilé #retired [@ab]",
      "(estoy buscando | busco) (trabajo | chamba | empleo) [@ab]", "(no tengo | ahorita no tengo | todavia no tengo) (trabajo | chamba | empleo) [@ab]",
      "(no trabajo | ahorita no trabajo | ya no trabajo) [por ahora | ahorita | en este momento] [@ab]",
      "estoy (sin trabajo | desempleado | desempleada | entre trabajos) [@ab]", "soy (ama de casa | amo de casa) [@ab]",
      "estoy aprendiendo espanol y buscando (trabajo | chamba) [@ab]",
      "antes (era | trabajaba como | trabajaba de) [un | una] {job} [pero] (ya no | ahora no) [trabajo] [@ab]",
      "(ahorita | ahora | nada) [ahorita] estoy de (vacaciones | viaje) #vacation [@ab]", "estoy de (vacaciones | ano sabatico) #vacation [@ab]", "(me tomé | estoy tomando) un ano sabatico [@ab]",
    ] },
    ask_like_job: { patterns: [
      "[y] (te gusta | te encanta | disfrutas) (tu trabajo | tu chamba | ser fotografo | ser fotografa | la fotografia | tomar fotos | hacer bodas | las bodas)",
      "[y] (te gusta | te encanta) [mucho] [tambien]", "[y] (es | esta) (dificil | divertido | padre | interesante | pesado | cansado) [tu trabajo | ser fotografo | ser fotografa]",
    ] },
    ask_job: { patterns: [
      "[y] [tu] (a que te dedicas | en que trabajas) [tu] #h:job_ask", "cual es tu (trabajo | profesion)", "(donde | en donde) trabajas",
      "que tipo de trabajo (haces | tienes)", "trabajas (por aqui | aqui | cerca)", "y tu trabajo", "[y] de que trabajas [tu]", "y tu que haces",
    ] },
    // hobbies
    hobby_ans: { patterns: [
      "@like {hobby} [y {hobby}] [@ab] #h:hb_like", "[@like] {hobby} {hobby} y {hobby} [@ab]", "(sobre todo | mas que nada | principalmente) {hobby} [y {hobby}] [@ab]", "{hobby} [y {hobby}] [@ab]",
      // "Me gusta leer y caminar por la playa." (never "bye" + nadar)
      "[@like | sobre todo] {hobby} [@hp] [y {hobby} [@hp]] [@ab]",
      "(voy a | suelo ir a | me gusta ir a) {hobby} [y {hobby}] [@ab]", "(juego | hago | practico) {hobby} [@ab]",
      "mi (hobby | pasatiempo | pasatiempo favorito) es {hobby} [y {hobby}] [@ab]", "mis (hobbies | pasatiempos) son {hobby} y {hobby} [@ab]",
      "en mi tiempo libre [me gusta | me encanta] {hobby} [y {hobby}] [@ab] #h:hb_free", "(veo | me gusta ver | me encanta ver) {hobby} [@ab]",
      "{hobby} (mucho | seguido | todos los dias | los fines de semana | a veces) [@ab]",
      "@like {hobby} (en el mar | en la playa | en el parque | en verano | los fines de semana) [@ab]",
      "@like (cocinar | la cocina) (mexicana | italiana | francesa | asiatica | tradicional | saludable | de mi pais) [@ab]",
      "(juego | hago) {hobby} con (amigos | mis amigos | mis hijos | mi familia) [@ab]", "@like (la buena comida | comer bien | comer rico) [@ab]",
      "@like (pasar tiempo | estar) con (mi familia | mis amigos | mis hijos) [@ab]", "@like (la naturaleza | estar al aire libre | estar en la naturaleza) [@ab]",
    ] },
    no_hobby: { patterns: [
      "no tengo [muchos] (hobbies | pasatiempos) [@ab]", "no tengo (mucho | tanto) tiempo libre [@ab]", "(solo | nomas) trabajo [@ab]",
      "(el trabajo | mi trabajo) es mi (hobby | pasatiempo) [@ab]", "[no mucho] trabajo mucho [@ab]",
    ] },
    ask_hobby: { patterns: [
      "que (haces | te gusta hacer) (para divertirte | en tu tiempo libre | los fines de semana | en tus ratos libres) #h:hb_ask",
      "(cuales son | que son) tus (hobbies | pasatiempos)", "tienes (hobbies | pasatiempos | algun hobby | algun pasatiempo)", "que te gusta hacer",
    ] },
    // travel
    travel_yes_ctx: { patterns: [
      "si (ya fui | he ido | lo conozco | la conozco | ya lo conozco | ya la conozco) [@abt] #h:tr_yes",
      "(ya fui | he ido | he estado) [ahi | alla | a {country} | en {country}] [@abt]",
      "si fui [el ano pasado | el verano pasado | hace (dos | unos | tres | {number}) anos] [@abt]",
      "si estuve [ahi | alla] [el ano pasado | el verano pasado | hace (dos | unos | tres | {number}) anos] [@abt]",
      "si (una vez | dos veces | muchas veces | varias veces) [@abt]", "(ya fui | fui | estuve) (una vez | dos veces | varias veces) [@abt]",
      "si me encantó [@abt]", "(claro | si) (fue | es | estuvo) (increible | precioso | hermoso | muy bonito | padrisimo) [@abt]",
      "si [fui] hace (dos | tres | unos | {number}) anos [@abt]", "si (fui | estuve) (de vacaciones | en mi luna de miel | por trabajo) [@abt]", "[si] (fui | estuve) [ahi | alla] con (mi familia | mis amigos | mi esposa | mi esposo | mi pareja | mis papas | mis hijos) [@abt]",
      "fui cuando era (nino | nina | joven | estudiante) [@abt]", "[si] (lo | la) conozco [un poco] [@abt]",
    ] },
    travel_no_ctx: { patterns: [
      "[no] (no he ido | no lo conozco | no la conozco | no he estado) [ahi | alla] [todavia | aun] [@abt] #h:tr_no",
      "[no] nunca [he ido | he estado] [@abt]", "[no] (nunca | jamas) (fui | lo he visitado | la he visitado | he viajado ahi) [@abt]", "[no] no conozco [ahi | alla | {country}] [@abt]", "[no] (todavia | aun) no (he ido | he estado | lo conozco | la conozco) [ahi | alla] [@abt]", "[no] todavia no [@abt] #h:tr_not_yet", "aun no [@abt]",
      "[no] (nunca | todavia no) pero me (encantaria | gustaria) [ir | conocerlo | conocerla] [algun dia] [@abt]",
      "[no] nunca he (ido | estado) (ahi | alla | a {country} | en {country}) [@abt]", "[no] pero me (encantaria | gustaria) [ir] [@abt]",
      "no (fijate | desafortunadamente | lamentablemente) [@abt]",
      "[no] [todavia no] pero (quiero | quisiera | espero | pienso) (ir | conocerlo | conocerla) [algun dia | pronto] [@abt]",
      "[no] no he ido [@isnice] [@abt]", "[no] [todavia no] [pero] (esta | lo tengo) en mi lista [@abt]",
      "[no] [nunca] pero (fui | estuve) (a | en) {country} [@abt]", "[no] no (fui | estuve) [ahi | alla] [@abt]", "[no] no (lo | la) conozco [@isnice] [@abt]",
      "no @isnice [@abt]", "(me | nos) (gustaria | encantaria) ir [algun dia] [@abt]",
    ] },
    ask_travel: { patterns: [
      "(has ido a | conoces | has estado en | fuiste a | ya fuiste a) {country} #h:tr_ask", "te gusta {country}",
    ] },
    ask_travel_general: { patterns: [
      "te gusta viajar", "(a donde | adonde) has (viajado | ido)", "(has ido | ya fuiste) [ahi | alla]", "(has viajado | viajas) mucho", "conoces [otros] paises",
    ] },
    // music
    music_ans: { patterns: [
      "@like {genre} [y {genre}] [@ab] #h:mu_like", "(sobre todo | mas que nada | principalmente | casi siempre) {genre} [y {genre}] [@ab] #h:mu_mostly",
      "{genre} [y {genre}] [@ab]", "(escucho | oigo) [sobre todo | mucho] {genre} [y {genre}] [@ab]",
      "(de todo | un poco de todo | todo tipo de musica | de todo un poco | lo que sea) [@ab] #h:mu_all",
      "me gusta (toda la musica | todo tipo de musica | de todo | un poco de todo) [@ab]", "escucho (de todo | un poco de todo | todo tipo de musica) [@ab]",
      "{genre} (a veces | o | pero tambien | y a veces) {genre} [@ab]", "me gusta de todo pero (sobre todo | mas) {genre} [@ab]",
      "@like {genre} (mexicano | mexicana | americano | americana | clasico | clasica | viejo | vieja | de los ochenta) [@ab]",
      "mi (grupo | banda | cantante | artista) (favorito | favorita) es {w:any} #anymusic [@ab]", "@like [mucho] la musica #anymusic [@ab]",
      "[@like] [la] musica (mexicana | latina | de mi pais | en vivo | vieja | nueva | tranquila | alegre | de los ochenta | de los noventa | americana) #anymusic [@ab]",
    ] },
    no_music: { patterns: ["no me gusta [mucho] la musica [@ab]", "no escucho [mucha] musica [@ab]", "(no mucho | la verdad no mucho) [@ab]"] },
    ask_music: { patterns: [
      "que (musica | tipo de musica) (te gusta | escuchas) #h:mu_ask", "te gusta [la musica] {genre}", "que escuchas [tu]",
      "(cual es | quien es) tu (banda | cantante | grupo | artista) (favorito | favorita)",
    ] },
    and_you: { patterns: [
      "(y tu | y a ti | y tu que | que tal tu) #h:ab_and_you", "tu", "(y el tuyo | y la tuya)", "la misma pregunta",
      "[y] tu (has ido | conoces | tambien)", "(y usted | y a usted) #tip:usted_date",
    ] },
    like_it_ctx: { patterns: [
      "[si] me (gusta | encanta) [mucho] [mi trabajo] #h:lj_love", "[si] me (gusta | encanta) (mi trabajo | mi chamba | la gente | mi equipo | mis companeros)",
      "(es | puede ser) (dificil | cansado | pesado) pero me (gusta | encanta)", "[si] (es | esta) (padre | divertido | bonito | interesante | muy bonito | muy padre)",
      "[pues] esta bien #h:lj_okay", "[si] mucho",
    ] },
    dislike_it_ctx: { patterns: [
      "[no] [la verdad] no me (gusta | encanta) [mucho | tanto] [mi trabajo] [la verdad]", "[no] (es | puede ser) (aburrido | muy pesado | muy cansado | muy dificil | demasiado)", "lo odio",
      "(no mucho | la verdad no | no tanto | mas o menos) [la verdad] #h:lj_not",
    ] },
    // quick questions
    qf_ctx: { patterns: [
      "[obvio | definitivamente | claro | sin duda | uy] {qf} [obvio | definitivamente | sin duda | claro | por supuesto] #h:qf_pick",
      "(soy | yo soy) [mas] de {qf} #h:qf_pick", "prefiero {qf}", "{qf} creo", "me (gusta | gustan) mas {qf}",
      "no me (gusta | gustan) [mucho | tanto] {qf} #neg", "(odio | no soporto) {qf} #neg", "{qf} no #neg", "no (tomo | bebo) {qf} #neg",
    ] },
    // the check
    pay_all: { patterns: [
      "(dejame | deja que yo | permiteme) (pagar | invitarte | pague | invite) [la cuenta | esto | la cena] [a mi | yo] #h:ck_let_me", "(yo | hoy) (invito | pago) [yo] #h:ck_on_me",
      "(invito | pago) yo", "[yo] te invito [yo] [esta vez | hoy]", "(esta | la cuenta | la cena) (va | corre) por mi cuenta", "va por mi cuenta",
      "(esta vez | hoy) (invito | pago) yo", "yo me encargo [de la cuenta]", "insisto",
      "(quiero | me gustaria | me encantaria) (pagar | invitarte) [yo] [la cuenta | la cena | esta vez]", "(puedo | podria) (pagar | invitarte) [yo] [la cuenta | esta vez | hoy]",
      "[no] no (yo pago | yo invito | dejame pagar | dejame invitarte) [a mi | yo]", "es mi invitacion", "yo la pago", "(y si | que tal si) (pago | invito) yo [la cuenta | esta vez]", "(me toca | a mi me toca) [pagar | invitar]", "yo (pago | invito) todo", "la cuenta es mia",
      "[no] (no hace falta | no es necesario | no te preocupes | de verdad | en serio) [yo] (pago | invito) [yo]",
      "[gracias] pero (yo pago | yo invito | pago yo | invito yo | dejame pagar | dejame invitarte)", "[yo] (pago | la pago | lo pago) con tarjeta",
    ] },
    split: { patterns: [
      "(dividimos | dividamos | partimos) la cuenta #h:ck_split", "(podemos | queremos | quieres) dividir la cuenta", "(y si | que tal si) dividimos [la cuenta]", "(y si | que tal si) pagamos [la cuenta] (a la mitad | mitad y mitad | a medias | por separado)",
      "[mejor] (dividimos | dividamos | partimos) la cuenta",
      "(pagamos | paguemos) (a la mitad | mitad y mitad | a medias | a pachas | por separado | cada quien lo suyo | cada uno lo suyo) #h:ck_half",
      "[mejor] (mitad y mitad | a la mitad | a medias)", "cada (quien | uno) (paga lo suyo | lo suyo | paga)", "(nos cooperamos | cooperamos)",
      "cuentas separadas", "(podemos | queremos) pagar (por separado | a la mitad | cada quien lo suyo)", "[mejor] la (dividimos | pagamos a medias)",
      "vamos a medias", "(cincuenta y cincuenta | fifty fifty)", "hacemos cuentas", "(dividimos | compartimos) [la cuenta]",
      // "Yo pago la mitad", "Pago lo mío": my half, not the whole check
      "[yo] (pago | invito) [yo] (la mitad | mi parte | mi mitad | lo mio | lo que me toca | lo que me corresponde)",
      "(la mitad | mitad) cada (uno | quien | una)", "(quieres | te parece) que (paguemos | pagemos | dividamos) [la cuenta] [a la mitad | a medias | por separado]",
      "[no] [gracias] [pero] (seguro | segura | de verdad | en serio) [mejor] (dividimos | dividamos | la dividimos | pagamos a la mitad)",
      "[no] gracias pero (mejor) (dividimos | dividamos | la dividimos | pagamos a la mitad) [la cuenta]", "mejor (dividimos | dividamos | la dividimos)",
      "te (doy | paso) (la mitad | mi parte | lo mio | lo que me toca)", "[yo] pongo (la mitad | mi parte)",
    ] },
    accept_offer: { patterns: [
      "(estas | de verdad estas) (seguro | segura) [gracias] #h:ck_sure", "(de verdad | en serio) [gracias]", "(muchas | mil) gracias #h:ck_thanks",
      "(que | muy) (amable | lindo | linda | generoso | generosa) [de tu parte] [gracias]",
      "[bueno | ok | va] [gracias] la (proxima | siguiente) [vez] (invito yo | yo invito | pago yo | yo pago | me toca [a mi] | va por mi cuenta | te invito yo | te invito)", "gracias por la cena",
      "[ay] gracias eres muy (amable | lindo | linda)", "[muchas] gracias por (invitarme | la invitacion)",
    ] },
    // "¿Cuánto es?": the sum (CHECK_TOTAL) once the check is here; never pays or splits (rule 17)
    ask_amount: { patterns: ["cuanto (es | fue | salio | sale | hay que pagar | te debo | le debo | va a ser | seria)", "cuanto (es | fue) en total", "cuanto cuesta [todo | la cena]"] },
    ask_check: { patterns: [
      "(nos | me) (trae | traes | puede traer | da | das) la cuenta", "la cuenta", "(pedimos | pidamos) la cuenta", "donde esta (la cuenta | el mesero | la mesera)",
    ] },
    // "Entonces yo dejo la propina" (at "Yo invito, ¿eh?" it accepts the treat)
    tip: { patterns: [
      "[entonces | bueno | ok | va] [yo] (dejo | pongo) [yo] la propina #h:ck_tip", "la propina (la dejo | la pongo | va por mi cuenta | corre por mi cuenta) [yo]",
      "yo me encargo de la propina", "(dejame | deja que yo | permiteme) (dejar | poner | deje | ponga) la propina", "[y] [yo] (invito | pago) la propina",
    ] },
    // "¿Dejamos propina?", "¿La propina está incluida?"
    tip_q: { patterns: [
      "[aqui] (dejamos | hay que dejar | se deja | le dejamos | se da | damos) propina [aqui | en mexico]",
      "[aqui] cuanto (dejamos | se deja | le dejamos | se da | damos | dejo | doy) [de] propina [aqui | en mexico]",
      "cuanto (es | seria) la propina", "(esta | viene) incluida la propina", "la propina (esta | viene) incluida", "incluye [la] propina",
    ] },
    card_q: { patterns: ["(aceptan | reciben | toman) (tarjeta | tarjetas | tarjeta de credito)", "(se puede | puedo | podemos) pagar con tarjeta", "(hay | tienen) terminal"] },
    // "¿Quién paga?", "¿Cómo le hacemos con la cuenta?"
    who_pays: { patterns: [
      "quien (paga | va a pagar | invita)", "(como | que) (le hacemos | hacemos) con la cuenta", "como le hacemos", "como (la pagamos | pagamos) [la cuenta]",
    ] },
    // "Como quieras", "Tú decides" (at the check, and to a day or a second date)
    as_you_like_ctx: { patterns: ["[si] [claro] (como | lo que) [tu] (quieras | prefieras)", "[pues] tu (decides | dime)", "lo que tu digas"] },
    // "¿Segura?" to "Yo invito, ¿eh?"
    sure_ctx: { patterns: ["[de verdad | en serio] (seguro | segura) [gracias]"] },
    // the learner's personal questions; the tag picks the answer (PERSONAL)
    ask_personal: { patterns: [
      "[y] [tu] de donde eres [tu] #from", "[y] [tu] eres de (aqui | aca | puerto colibri | por aqui) #from", "[y] [tu] (naciste | creciste) (aqui | aca | en puerto colibri | por aqui) #from",
      "[y] [tu] eres (mexicano | mexicana) #from", "de (que parte | donde) (eres | vienes) #from",
      "(cuanto tiempo | hace cuanto [tiempo]) (llevas | tienes | vives) [viviendo] (aqui | aca | en puerto colibri) #always", "desde cuando vives (aqui | aca | en puerto colibri) #always",
      "siempre has vivido (aqui | aca | en puerto colibri) #always", "(llevas | tienes) mucho tiempo [viviendo] (aqui | aca) #always",
      "(donde | en donde | por donde) vives #live", "vives (por aqui | cerca | aqui cerca | lejos | en el centro | cerca de aqui) #live",
      "tienes (mascotas | mascota | animales | gato | gatos | un gato | una gata | gatito) #pets", "tienes (perro | perros | un perro | perrito | un perrito) #dog",
      "(cuantos anos tienes | que edad tienes) #age",
      "tienes (hermanos | hermanas | hermano | hermana) #siblings", "cuantos hermanos tienes #siblings", "tienes (hijos | hijas | ninos | un hijo | una hija) #kids",
      "(tu familia | tus papas | tus padres) (vive | viven) (aqui | aca | por aqui | cerca | en puerto colibri) #family", "(donde | en donde) (vive | viven) (tu familia | tus papas | tus padres) #family",
      "te gusta (vivir aqui | vivir aca | vivir en puerto colibri | puerto colibri | el pueblo | este pueblo | vivir en el caribe | vivir junto al mar) #like_here",
      "que (vas a | quieres | piensas) (comer | cenar | pedir de comer | pedir para comer | pedir de cenar) #food",
      "que me recomiendas (de comer | para comer | para cenar | de cenar | de la carta | del menu) #food", "(pedimos | quieres pedir | vamos a pedir) algo de (comer | cenar) #food",
      "que es (bueno | rico) [aqui] (de comer | para comer) #food", "cual es tu comida favorita #food", "(cual es | que es) tu (platillo | plato) favorito #food",
      "que (comida te gusta | te gusta comer) #food", "que hay de comer #food", "tienes hambre #hungry",
    ] },
    // "Soy de Canadá", "Soy irlandesa. ¿Y tú?"
    from_ans: { patterns: [
      "[yo] (soy | vengo) de {origin} [@ab]", "[yo] (naci | creci) en {origin} [@ab]",
      "[yo] soy (canadiense | estadounidense | americano | americana | ingles | inglesa | irlandes | irlandesa | australiano | australiana | escoces | escocesa | britanico | britanica | neozelandes | neozelandesa) [@ab]",
    ] },
    // "Prefiero que no", "No me interesa", "Mejor quedamos como amigos": a no to the second date (datesOff)
    no_date_ctx: { patterns: [
      "@sorry prefiero que no [la verdad] [perdon]", "@sorry [la verdad] no me interesa [la verdad] [perdon]", "@sorry [la verdad] [creo que] [mejor] (quedamos | quedemos | seamos) [solo] [como] amigos",
      "@sorry [la verdad] no (estoy buscando | busco | quiero) (nada serio | una relacion | pareja | algo serio) [ahorita | ahora | por ahora | en este momento]",
      "@sorry [no] no creo que (funcione | esto funcione | vaya a funcionar)", "[ay] me caes [muy] bien pero no", "@sorry pensandolo bien [mejor] no [gracias]",
      "@sorry [la verdad] no (hay | siento | senti) (quimica | conexion)",
    ] },
    // the end
    nice_time: { patterns: [
      "[yo tambien] la pasé (muy bien | super bien | increible | genial | padrisimo | muy padre | de maravilla) [esta noche | hoy] [tambien] #h:nt_had",
      "[yo tambien] me la pasé (muy bien | super bien | increible | genial | padrisimo)", "me lo he pasado (genial | muy bien | fenomenal | de maravilla)",
      "(esta noche | la noche | la cena | todo) (fue | estuvo) [muy | super] (bonita | bonito | linda | lindo | increible | perfecta | perfecto | divertida | divertido | padre | maravillosa | genial)",
      "(me diverti | disfruté) (mucho | muchisimo) [esta noche]", "(fue | ha sido) una (noche | cena | cita) (muy | super | tan) (bonita | linda | padre | especial | divertida)", "(me alegra | me da gusto) (haberte conocido | conocerte)",
      "estoy (feliz | contento | contenta) de (haberte conocido | conocerte)", "me encantó (esta noche | la cena | conocerte)", "que bueno que te (gustó | la pasaste bien)",
    ] },
    thanks_evening: { patterns: [
      "gracias por (esta noche | la noche | la cena | la velada | todo) [tan] [bonita | linda | padre | increible] #h:nt_thanks",
      "[yo tambien] gracias por (una noche tan bonita | una noche muy bonita | la compania | tu compania | venir)", "gracias por invitarme",
    ] },
    see_again: { patterns: [
      "te puedo volver a ver #h:ag_see", "(puedo | podemos) volver a vernos", "puedo volver a verte", "puedo verte (otra vez | de nuevo)",
      "(te gustaria | quieres) (volver a verme | salir otra vez | salir de nuevo | vernos otra vez | vernos de nuevo | repetir)",
      "(podemos | podriamos) (vernos | salir) (otra vez | de nuevo)", "me (gustaria | encantaria) volver a verte #h:ag_love_to",
      "(hay que | tenemos que) repetirlo", "repitamos", "cuando te puedo volver a ver", "quiero volver a verte", "(salimos | volvemos a salir) otra vez",
    ] },
    propose_day: { patterns: [
      "(estas libre | tienes tiempo) @when_d #h:ag_free", "(que tal | y si) @when_d", "@when_d (es mejor | seria mejor | seria perfecto | seria genial) [para mi]",
      "(estoy | voy a estar) libre @when_d", "@when_d (suena bien | me parece bien | me late)",
      "@sorry no puedo {nd:day} pero @when_d (si | me queda bien | esta bien | puedo | si puedo)", "@sorry {nd:day} no puedo pero @when_d (si | me queda bien | esta bien | puedo | si puedo)",
      "@when_d me (queda | va) (bien | perfecto) [a mi] #h:ag_works", "@when_d (puedo | si puedo | si)",
      "(te gustaria | quieres | que tal si | podemos | podriamos | vamos a | te invito a) {activity} [@when_d] #h:ag_activity",
      "(que tal | y si) {activity} [@when_d] [conmigo]", "me gustaria {activity} contigo [@when_d]",
      "(me gustaria | quiero | quisiera) invitarte a {activity} [@when_d]", "(te gustaria | quieres) {activity} conmigo [@when_d]",
      "@when_d (esta bien | me parece bien | perfecto | genial)",
      "@sorry no puedo {nd:day} [pero] (que tal | y) @when_d", "@sorry {nd:day} no puedo [pero] (que tal | y) @when_d",
      // "El sábado no, el domingo", "Mejor el viernes", "Tal vez la próxima semana"
      "@sorry [no] {nd:day} no [puedo] [pero] [mejor] @when_d [si | mejor]", "mejor @when_d", "(tal vez | quizas | a lo mejor) @when_d",
      "(que tal si | y si | por que no) (vamos | salimos | vamos a | nos vemos para) {activity} [@when_d]",
    ] },
    agree_again: { patterns: [
      "me encantaria [volver a verte] #h:ag_id_love", "si me (gustaria | encantaria) [mucho] [@when_d] #h:ag_yes", "claro que si", "(si | claro) por supuesto",
      "[si | claro] me queda bien #h:dy_works", "[si] estoy libre [ese dia] #h:dy_free", "(si | claro) (me encantaria | quiero) volver a verte",
      "seria (genial | padre | increible | lindo)", "yo te iba a preguntar lo mismo", "[si | claro] a que hora [nos vemos | quedamos] #time", "[si | claro] cuando [estas libre | tienes tiempo]",
      "claro que quiero", "[vale] {day} me (queda | va) bien a que hora", "[yo] te iba a preguntar [lo mismo | eso]",
      "[si] me (gustaria | encantaria) [mucho] pero no se cuando", "[si] [claro] cuando quieras",
    ] },
    // "¿El domingo en la noche?" (to "¿Qué tal el domingo? ¿Tienes tiempo?")
    day_ctx: { patterns: ["@when_d [(a las | como a las) {time}]"] },
    // "¡Gracias por el cumplido!"
    thanks_compliment: { patterns: ["gracias por el (cumplido | piropo)"] },
    decline_again: { patterns: [
      "@sorry (no creo | creo que no) [que sea buena idea] #h:ag_no", "@sorry no puedo [{day}]", "@sorry (estoy | voy a estar) (ocupado | ocupada) [{day} | ese dia] #h:dy_busy",
      "@sorry (ese dia | {day}) (estoy | voy a estar) (ocupado | ocupada)", "@sorry {day} no [puedo]", "@sorry (tengo | ya tengo) planes [{day}]", "no creo que seamos compatibles",
      "@sorry (trabajo | tengo que trabajar) {day}", "@sorry no estoy (libre | disponible) [{day} | ese dia]", "@sorry ese dia no (puedo | estoy libre)",
      "[no] {day} (no puedo | trabajo | tengo planes)", "@sorry no puedo (ese dia | ese)", "[no] [ese dia | {day}] tampoco [puedo]",
      // "Sí, pero no el sábado": yes to meeting again, not that day
      "[si | claro | claro que si | me encantaria] [pero] no {day} [puedo]", "[no] no quiero (volver a verte | salir otra vez | vernos otra vez | salir contigo)", "@sorry {day} no me (queda | va) [bien]", "@sorry no me (queda | va) [bien] {day}",
    ] },
    walk_home: { patterns: [
      "te acompano [a tu casa | a tu carro | a tu coche] #h:wk_walk", "(quieres | te gustaria) que te acompane [a tu casa]", "(dejame | puedo) acompanarte [a tu casa]",
      "te puedo acompanar [a tu casa]", "te llevo a tu casa",
    ] },
    // "¿Tienes frío?" to "Ya hace fresco": the partner answers, and a sweater may follow
    cold_q_ctx: { patterns: ["[estas bien] (tienes | te da | sientes) [mucho] frio", "(estas bien | todo bien) [no tienes frio]"] },
    offer_jacket: { patterns: [
      "[ten | toma] (ponte | usa) mi @jacket #h:jk_take", "(quieres | te presto) mi @jacket #h:jk_want", "(toma | ten) mi @jacket",
      "puedes (usar | ponerte) mi @jacket", "te (presto | doy) mi @jacket",
    ] },
    text_reply: { patterns: [
      "[si | claro | va | sale] (te escribo | te mando un mensaje | te aviso) [cuando llegue] #h:tx_will", "tu tambien #h:tx_you_too",
      "(mandame | escribeme) (un mensaje | uno) tu tambien", "[si] te lo prometo", "[no] tu (mandame | escribeme) [un mensaje | uno] [tambien]", "te escribo no te preocupes", "(claro | va | si) tu tambien",
    ] },
    hesitate: { patterns: ["(tal vez | quizas | quiza | a lo mejor | puede ser)", "no se (tal vez | quizas | a lo mejor | todavia)", "no estoy (seguro | segura) [todavia]", "lo (voy a pensar | pienso)", "dejame pensarlo", "ya veremos"] },
    no_sorry: { patterns: ["(no | nel) perdon", "perdon no", "lo siento no", "no lo siento"] },
    // "¡Qué interesante!", "¡Órale, qué padre!": a reaction to what the partner said (no yes/no meaning)
    react_nice: { patterns: [
      "[ah | oh | wow | guau | orale] (que | muy) (interesante | padre | bonito | increible | chido | padrisimo)",
      "suena (muy | super) (interesante | padre | divertido)", "(wow | guau | orale | interesante | que interesante)",
    ] },
    agree: { patterns: [
      "(si | claro | va | sale | ok) (por supuesto | definitivamente | por que no | suena bien | me parece bien | perfecto | genial | padre)",
      "suena (bien | genial | perfecto)", "me late",
    ] },
    g_bye: { patterns: [
      "(adios | bye | nos vemos | hasta luego | hasta pronto | cuidate | buenas noches | que descanses | nos hablamos) #h:tx_good_night",
      "que (tengas | pases) (buena noche | buenas noches | linda noche | bonita noche | buen fin de semana)", "(buenas noches | adios) nos vemos {day}",
      // "Perdón, me tengo que ir.", "Te llamo luego.": the shared leaving phrases (global.ts)
      ...LEAVING_PATTERNS,
    ] },
  },

  lines: {
    // hello
    open_late: [
      t("¡Hola! | ¡Perdón | por | llegar | tarde! | No encontraba | dónde | estacionarme.", "Hi! | Sorry | for | arriving | late! | I couldn't find | where | to park.",
        "Hi! Sorry I'm late! I couldn't find a place to park."),
      // the partner lives a few blocks away: held up on the way back from work, never lost in town
      t("¡Hola! | ¡Perdóname, | llegué | tarde! | Había | mucho | tráfico | en | la | carretera.", "Hi! | Forgive me, | I arrived | late! | There was | a lot of | traffic | on | the | highway.",
        "Hi! I'm so sorry I'm late! Traffic on the highway was terrible."),
    ],
    open_early: [
      t("¡Hola! | ¡Aquí | estás! | Oye, | ¡te ves | muy | bien!", "Hi! | Here | you-are! | Hey, | you look | very | good!", "Hi! There you are! Wow, you look great!"),
      t("¡Hola, | ya | llegaste! | ¡Te ves | increíble!", "Hi, | already | you-arrived! | You look | amazing!", "Hey, you made it! You look amazing."),
    ],
    open_meet: [
      t("¡Hola! | ¡Qué | gusto | conocerte | en persona!", "Hi! | What a | pleasure | to meet you | in person!", "Hi! It's so nice to meet you in person!"),
      t("¡Hola! | ¡Por fin! | Mucho gusto.", "Hi! | Finally! | Nice to meet you.", "Hi! Finally! It's great to meet you."),
    ],
    hello_again: [
      t("Bueno... | ¡hola!", "Well... | hi!", "So... hi!"),
    ],
    phew: [
      t("¡Uf! | Gracias | por | esperarme.", "Phew! | Thanks | for | waiting for me.", "Phew! Thanks for waiting."),
      t("Ay, | qué | bueno. | ¡Gracias | por | esperar!", "Oh, | how | good. | Thanks | for | waiting!", "Oh, good. Thanks for waiting!"),
    ],
    you_are_fine: [
      t("¡No, | {sm:el|sf:la} | que | llegó | tarde | soy | yo! | Gracias | por | esperarme.", "No, | the one | who | arrived | late | am | I! | Thanks | for | waiting for me.",
        "No, I'm the one who was late! Thanks for waiting."),
    ],
    just_got_here: [
      t("¡No te preocupes! | Yo | también | acabo de | llegar.", "Don't worry! | I | also | have just | arrived.", "Don't worry! I just got here myself."),
    ],
    thanks_compliment: [
      t("¡Ay, | gracias! | Tú | también | te ves | muy | bien.", "Oh, | thanks! | You | too | look | very | good.", "Aw, thank you! You look great too."),
      t("¡Ay, | qué | lindo! | ¡Gracias!", "Oh, | how | sweet! | Thanks!", "Aw, that's so sweet. Thank you!"),
    ],
    aw: [
      t("¡Ay, | gracias!", "Oh, | thanks!", "Aw, thanks!"),
    ],
    view: [
      t("¿Verdad? | Me encanta | el | atardecer | aquí.", "Right? | I love | the | sunset | here.", "Isn't it? I love the sunset here."),
      t("¡Sí! | La | vista | está | increíble.", "Yes! | The | view | is | amazing.", "I know, right? The view is amazing."),
    ],
    not_often: [
      t("¡Ja! | No | mucho. | Pero | me encanta | la | vista.", "Ha! | Not | much. | But | I love | the | view.", "Ha! Not really. But I love the view."),
    ],
    // drinks
    ask_drinks: [
      t("Bueno, | ¿qué | quieres | tomar?", "So, | what | do you want | to drink?", "So, what would you like to drink?"),
      t("¿Pedimos | algo | de tomar?", "Shall we order | something | to drink?", "Should we get some drinks?"),
    ],
    ask_drinks_back: [
      t("¿Y | tú?", "And | you?", "And you?"),
    ],
    own_drink: [
      t("Yo | creo | que | voy | a | pedir | una | margarita.", "I | think | that | I'm going | to | order | a | margarita.", "I think I'll have a margarita."),
    ],
    good_choice: [
      t("¡Buena | elección!", "Good | choice!", "Good choice!"),
      t("¡Ah, | qué | rico!", "Oh, | how | nice!", "Ooh, nice!"),
    ],
    same_drink: [
      t("¡Perfecto, | entonces | dos | margaritas!", "Perfect, | then | two | margaritas!", "Perfect, two margaritas, then!"),
    ],
    no_alcohol_ok: [
      t("¡Claro, | no hay problema! | Aquí | el | agua | de | jamaica | está | buenísima.", "Sure, | no problem! | Here | the | water | of | hibiscus | is | really good.",
        "Sure, no problem! The hibiscus water here is really good."),
    ],
    // job
    ask_job: [
      t("Bueno, | cuéntame | de | ti. | ¿A qué te dedicas?", "So, | tell me | about | you. | What do you do?", "So, tell me about yourself. What do you do?",
        { flags: { 4: "¿A qué te dedicas? = what do you do (for a living)? Literally: to what do you devote yourself?" } }),
      t("Y | tú, | ¿a qué te dedicas?", "And | you, | what do you do?", "So what do you do?"),
    ],
    ask_back: [
      t("¿Y | tú?", "And | you?", "What about you?"),
      t("¿Y | tú, | qué | me | cuentas?", "And | you, | what | (to) me | you-tell?", "How about you?"),
    ],
    job_react: [
      t("¡Ah, | qué | padre!", "Oh, | how | cool!", "Oh, cool!", { flags: { 2: PADRE }, neutral: t("¡Ah, | qué | bien!", "Oh, | how | nice!", "Oh, cool!") }),
      t("¡Qué | interesante!", "How | interesting!", "That sounds interesting!"),
      t("¡Uy, | qué | bien!", "Ooh, | how | good!", "Wow, that's great!"),
    ],
    same_job: [
      t("¡No manches! | ¡Yo | también!", "No way! | I | too!", "No way! Me too!",
        { flags: { 0: MANCHES }, neutral: t("¡No puede ser! | ¡Yo | también!", "It can't be! | I | too!", "No way! Me too!") }),
    ],
    retired_react: [
      t("¡Ah, | qué | bien! | Entonces | tienes | tiempo | para | cosas | divertidas.", "Oh, | how | nice! | So | you-have | time | for | things | fun.",
        "Oh, nice! So you have time for fun things."),
    ],
    no_job_react: [
      t("¡Mucha | suerte! | Seguro | que | vas | a | encontrar | algo | muy | bueno.", "Lots of | luck! | Surely | that | you're going | to | find | something | very | good.",
        "Good luck! I'm sure you'll find something great."),
    ],
    like_job_q: [
      t("¿Y | te gusta?", "And | do you like it?", "Do you like it?"),
    ],
    thats_great: [
      t("¡Qué | bueno!", "How | good!", "That's great!"),
    ],
    not_every_job: [
      t("Bueno, | no | todos | los | trabajos | son | divertidos.", "Well, | not | all | the | jobs | are | fun.", "Oh well, not every job is fun."),
    ],
    own_like_job: [
      t("¡Me encanta! | Cada | boda | es | diferente.", "I love it! | Each | wedding | is | different.", "I love it! Every wedding is different."),
    ],
    own_job: [
      t("Soy | {sm:fotógrafo|sf:fotógrafa}. | Hago | sobre todo | bodas | en | la | playa.", "I'm | a photographer. | I-do | mostly | weddings | on | the | beach.",
        "I'm a photographer. I mostly do weddings on the beach."),
    ],
    told_you: [
      t("¡Ja, | ya | te | dije!", "Ha, | already | (to) you | I-told!", "Ha, I told you!"),
    ],
    // a topic question asked again (after a side question): a short reminder
    job_again: [
      t("Entonces, | ¿a qué te dedicas?", "So, | what do you do?", "So, what do you do?"),
    ],
    hobby_again: [
      t("Entonces, | ¿qué | te gusta | hacer?", "So, | what | do you like | to do?", "So, what do you like to do?"),
    ],
    travel_again: [
      t("Entonces, | ¿conoces | {C}?", "So, | do you know | {C}?", "So, have you been to {C}?"),
    ],
    music_again: [
      t("Entonces, | ¿qué | música | te gusta?", "So, | what | music | do you like?", "So, what music do you like?"),
    ],
    // hobbies
    ask_hobby: [
      t("¿Qué | te gusta | hacer | en | tu | tiempo | libre?", "What | do you like | to do | in | your | time | free?", "What do you like to do in your free time?"),
      t("Bueno, | ¿y | qué | haces | para | divertirte?", "So, | and | what | do you do | for | to have fun?", "So, what do you do for fun?"),
    ],
    hobby_react: [
      t("¡Ah, | qué | bien! | Suena | divertido.", "Oh, | how | nice! | It sounds | fun.", "Oh, nice! That sounds fun."),
      t("¡Me gusta! | Suena | muy | bien.", "I like it! | It sounds | very | good.", "Cool! I like that."),
    ],
    hobby_try: [
      t("¡Qué | bien! | Siempre | he querido | probarlo.", "How | nice! | Always | I've wanted | to try it.", "Cool! I've always wanted to try that."),
    ],
    same_hobby: [
      t("¡No manches! | ¡A | mí | también | me encanta | {H}!", "No way! | (To) | me | too | I love | {H}!", "No way, I love {H} too!",
        { flags: { 0: MANCHES }, neutral: t("¡No puede ser! | ¡A | mí | también | me encanta | {H}!", "It can't be! | (To) | me | too | I love | {H}!", "No way, I love {H} too!") }),
    ],
    own_hobby: [
      t("Me encanta | cocinar | y | nadar | en | los | cenotes.", "I love | to cook | and | to swim | in | the | cenotes.", "I love cooking and swimming in the cenotes.",
        { flags: { 6: "cenote: a natural limestone pool, all over the Yucatán peninsula." } }),
    ],
    busy_life: [
      t("¡Ja, | te | entiendo! | El | trabajo | no deja | tiempo.", "Ha, | you | I-understand! | The | work | doesn't leave | time.", "Ha, I get it. Work keeps you busy!"),
    ],
    no_music_react: [
      t("¿En serio? | ¡Es | la | primera | vez | que | escucho | eso!", "Seriously? | It's | the | first | time | that | I-hear | that!", "Really? Wow, that's a first!"),
    ],
    // travel
    ask_travel: [
      t("¿Conoces | {C}?", "Do you know | {C}?", "Have you ever been to {C}?", { flags: { 0: "conocer a place: to have been there." } }),
      t("¿Alguna vez | has ido | a | {C}?", "Ever | have you gone | to | {C}?", "Have you ever been to {C}?"),
    ],
    travel_yes_react: [
      t("¡Qué | suerte! | Yo | fui | el | verano | pasado.", "What | luck! | I | went | the | summer | past.", "Lucky you! I went there last summer."),
      t("¡Yo | también! | ¿Verdad | que | es | increíble?", "I | too! | True | that | it's | amazing?", "Me too! Isn't it amazing?"),
    ],
    travel_no_react: [
      t("¡Ay, | tienes que | ir! | Te | va | a | encantar.", "Oh, | you have to | go! | (To) you | it's going | to | delight.", "Oh, you have to go! You'll love it."),
    ],
    own_travel: [
      t("¡Sí! | Fui | a | {C} | el | verano | pasado. | ¡Me encantó!", "Yes! | I went | to | {C} | the | summer | past. | I loved it!", "Yes! I went to {C} last summer. I loved it!"),
    ],
    never_home: [
      t("¡Todavía | no! | A lo mejor | algún | día | me | enseñas | tu | país.", "Still | not! | Maybe | some | day | (to) me | you-show | your | country.",
        "Not yet! Maybe someday you can show me around your country."),
    ],
    // music
    ask_music: [
      t("¿Qué | música | te gusta?", "What | music | do you like?", "What kind of music do you like?"),
      t("¿Y | qué | tipo | de | música | escuchas?", "And | what | kind | of | music | do you listen to?", "What kind of music do you listen to?"),
    ],
    music_react: [
      t("¡Uy, | buen | gusto!", "Ooh, | good | taste!", "Ooh, nice taste!"),
      t("¡Qué | bien!", "How | nice!", "Nice!"),
    ],
    music_react_all: [
      t("¡Ja, | buena | respuesta!", "Ha, | good | answer!", "Ha, good answer!"),
    ],
    same_music: [
      t("¡Yo | también! | Me encanta | {G.the}.", "I | too! | I love | {G}.", "Me too! I love {G}."),
    ],
    own_music: [
      t("Jazz, | sobre todo. | ¡Y | un | poco | de | cumbia!", "Jazz, | mostly. | And | a | little | of | cumbia!", "Mostly jazz. And a bit of cumbia!",
        { flags: { 6: "cumbia: dance music from Colombia, hugely popular in Mexico." } }),
    ],
    me_generic: [
      t("¿Yo? | ¡Me | estoy | divirtiendo | mucho!", "Me? | (Myself) | I'm | having fun | a lot!", "Me? I'm having a great time!"),
    ],
    // quick questions
    qf_intro: [
      t("¡A ver, | preguntas | rápidas!", "Let's see, | questions | quick!", "Okay, quick questions!"),
    ],
    qf_coffee: [
      t("¿Café | o | té?", "Coffee | or | tea?", "Coffee or tea?"),
    ],
    qf_cats: [
      t("¿Perros | o | gatos?", "Dogs | or | cats?", "Dogs or cats?"),
    ],
    qf_beach: [
      t("¿Playa | o | montaña?", "Beach | or | mountains?", "Beach or mountains?"),
    ],
    qf_me_too: [
      t("¡Yo | también!", "I | too!", "Me too!"),
    ],
    qf_tea: [
      t("¿Té? | Bueno, | te lo | perdono.", "Tea? | Well, | it to you | I-forgive.", "Tea? Okay, I'll allow it."),
    ],
    qf_dogs: [
      t("¡Ay, | no...! | ¡Yo | tengo | una | gata | que | se llama | Luna!", "Oh, | no...! | I | have | a | cat | that | is called | Luna!", "Oh no... I have a cat named Luna!"),
    ],
    qf_cats_yes: [
      t("¡Sí! | ¡Yo | tengo | una | gata | que | se llama | Luna!", "Yes! | I | have | a | cat | that | is called | Luna!", "Yes! I have a cat named Luna!"),
    ],
    qf_beach_yes: [
      // "Estamos": the learner may be visiting, not living here
      t("¡Obvio! | Estamos | en | el | Caribe.", "Obviously! | We are | in | the | Caribbean.", "Of course! We're in the Caribbean."),
    ],
    qf_mountain: [
      t("¿Montaña? | ¡Pero | aquí | tenemos | el | mar!", "Mountains? | But | here | we-have | the | sea!", "Mountains? But we have the sea right here!"),
    ],
    qf_both: [
      t("¡Ja, | buena | respuesta!", "Ha, | good | answer!", "Ha, good answer!"),
    ],
    // the check
    not_ordered_yet: [
      t("¡Ja! | ¡Si | todavía | no pedimos | nada!", "Ha! | But | still | we haven't ordered | anything!", "Ha! We haven't even ordered yet!",
        { flags: { 1: "si: here no “if”, but surprise (= but…!)." } }),
    ],
    // "Dividamos la cuenta." after ordering, before the check comes
    when_it_comes: [
      t("¡Claro, | cuando | traigan | la | cuenta!", "Sure, | when | they bring | the | check!", "Sure, when it comes!"),
    ],
    so_check: [
      t("Bueno, | ¿cómo | hacemos | con | la | cuenta?", "So, | how | do we do | with | the | check?", "So, what should we do about the check?"),
    ],
    amount_not_yet: [
      t("Todavía | no nos traen | la | cuenta.", "Still | they haven't brought us | the | check.", "They haven't brought us the check yet."),
    ],
    amount_total: [
      t("A ver... | son | {$total}.", "Let's see... | it's | {$total}.", "Let's see... it's {$total}."),
    ],
    amount_half: [
      t("Son | {$total}, | o sea, | {$amount} | cada quien.", "It's | {$total}, | that is, | {$amount} | each.", "It's {$total}, so {$amount} each."),
    ],
    amount_paid: [
      t("¡Ya | está | pagada! | No te preocupes.", "Already | it's | paid! | Don't worry.", "It's already paid! Don't worry."),
    ],
    amount_treat: [
      t("¡Ni lo pienses! | Yo | invito.", "Don't even think about it! | I | treat.", "Don't even think about it! It's on me.", { flags: { 2: INVITAR } }),
    ],
    check_here: [
      t("Ah, | ya | trajeron | la | cuenta.", "Oh, | already | they-brought | the | check.", "Oh, here's the check."),
    ],
    partner_offers: [
      t("Déjame | invitarte.", "Let me | treat you.", "Let me get this.", { flags: { 1: INVITAR } }),
      t("Yo | invito, | ¿eh?", "I | treat, | okay?", "This one's on me, okay?", { flags: { 1: INVITAR } }),
    ],
    thanks_pay: [
      t("¿{m:Seguro|f:Segura}? | ¡Gracias! | La | próxima | invito | yo.", "Sure? | Thanks! | The | next one | treat | I.", "Are you sure? Thank you! Next time it's on me.",
        { flags: { 4: INVITAR } }),
      t("¡Ay, | gracias! | Entonces | yo | dejo | la | propina.", "Oh, | thanks! | Then | I | leave | the | tip.", "Aw, thank you! Then I'll get the tip."),
    ],
    already_paid: [
      t("¡Muy | tarde, | ya | está | pagada!", "Too | late, | already | it's | paid!", "Too late, it's done!"),
    ],
    deal: [
      t("¡Trato hecho!", "Deal!", "Deal!"),
      t("¡Me parece | justo!", "It seems to me | fair!", "Sounds fair!"),
    ],
    my_pleasure: [
      t("¡Con gusto! | La | próxima | invitas | tú.", "My pleasure! | The | next one | treat | you.", "My pleasure! You can get the next one."),
    ],
    // the end of the evening
    cold: [
      t("Brr, | ya | hace | fresco | con | el | aire | del | mar.", "Brr, | already | it's | cool | with | the | air | of the | sea.", "Brr, it's getting chilly with the sea breeze."),
    ],
    a_little_cold: [
      t("Un | poquito, | sí.", "A | little bit, | yes.", "A little, yeah."),
    ],
    so_sweet: [
      t("¡Ay, | qué | {m:lindo|f:linda} | eres!", "Oh, | how | sweet | you-are!", "Aw, you're so sweet!"),
    ],
    nice_time: [
      t("La pasé | muy | bien | esta | noche.", "I had a time | very | good | this | night.", "I had a really nice time tonight.",
        { flags: { 0: "pasarla bien: to have a good time (la pasé = I had it, the time)." } }),
    ],
    me_too_nice: [
      t("¡Yo | también! | La pasé | súper | bien.", "I | too! | I had a time | super | good.", "Me too! I had a great time."),
    ],
    glad: [
      t("¡Qué | bueno!", "How | good!", "I'm so glad."),
      t("Me da | mucho | gusto.", "It gives me | much | pleasure.", "I'm really glad."),
    ],
    thank_you_too: [
      t("¡Gracias | a | ti! | La pasé | súper | bien.", "Thanks | to | you! | I had a time | super | good.", "Thank you! I had a great time."),
    ],
    can_i_see_you: [
      t("Oye... | ¿te | puedo | volver a | ver?", "Hey... | you | can I | again | see?", "So... can I see you again?",
        { flags: { 3: "volver a + a verb: to do it again." } }),
    ],
    id_like_that: [
      t("Me encantaría. | De verdad, | me encantaría.", "I'd love that. | Really, | I'd love that.", "I'd like that. I'd really like that."),
    ],
    yay_great: [
      t("¡Ay, | qué | bueno!", "Oh, | how | good!", "Yay! Great!"),
      t("¡Qué | emoción!", "What | excitement!", "Yay, how exciting!"),
    ],
    are_you_free_on: [
      t("¿Estás | libre | el | {D}?", "Are you | free | on | {D}?", "Are you free on {D}?", { flags: { 2: ART_DAY } }),
      t("¿Qué tal | el | {D}? | ¿Tienes | tiempo?", "How about | on | {D}? | Do you have | time?", "How about {D}? Are you free?", { flags: { 1: ART_DAY } }),
    ],
    when_free: [
      t("¿Cuándo | tienes | tiempo?", "When | do you have | time?", "When are you free?"),
    ],
    which_day: [
      t("¿Qué | día | te queda | bien?", "What | day | suits you | well?", "What day works for you?"),
    ],
    busy_saturday: [
      t("Ay, | el | sábado | voy | a | ver | a | mis | papás.", "Oh, | on | Saturday | I'm going | to | see | — | my | parents.",
        "Oh, I'm seeing my parents on Saturday.", { flags: { 1: ART_DAY, 6: "Personal a: a person as the object takes “a” (ver a mis papás)." } }),
    ],
    how_about_sunday: [
      t("Mmm, | ¿y | el | domingo, | entonces?", "Hmm, | and | on | Sunday, | then?", "Hmm, how about Sunday, then?", { flags: { 2: ART_DAY } }),
    ],
    day_works: [
      t("¡Perfecto, | el | {D} | me queda | bien!", "Perfect, | — | {D} | suits me | well!", "Great, {D} works for me!",
        { flags: { 1: "The article before a weekday: no English word here." } }),
    ],
    day_works_tomorrow: [
      t("¡Perfecto, | mañana | me queda | bien!", "Perfect, | tomorrow | suits me | well!", "Great, tomorrow works for me!"),
    ],
    day_works_after: [
      t("¡Perfecto, | pasado mañana | me queda | bien!", "Perfect, | the day after tomorrow | suits me | well!", "Great, the day after tomorrow works for me!"),
    ],
    love_that: [
      t("¡Me encantaría!", "I'd love that!", "I'd love that."),
    ],
    its_a_date: [
      t("¡Entonces | quedamos!", "Then | we're-agreed!", "It's a date!", { flags: { 1: "quedar: to agree on a plan (¿quedamos? = shall we meet?)." } }),
      t("¡Es | una | cita!", "It's | a | date!", "It's a date!"),
    ],
    think_about_it: [
      t("Sin | presión. | ¡Piénsalo!", "Without | pressure. | Think about it!", "No pressure. Think about it!"),
    ],
    no_pressure: [
      t("Ah... | está bien. | Sin | presión. | Me dio | gusto | conocerte.", "Oh... | okay. | Without | pressure. | It gave me | pleasure | to meet you.",
        "Oh... okay. No pressure. It was nice to meet you."),
    ],
    id_like_walk: [
      t("Me encantaría. | Vivo | aquí | cerca, | a | unas | cuadras.", "I'd love that. | I live | here | near, | at | some | blocks.", "I'd like that. I live just a few blocks away."),
    ],
    live_close: [
      t("¡Qué | lindo! | Pero | vivo | aquí | a la vuelta.", "How | sweet! | But | I live | here | around the corner.", "That's so sweet! But I live right around the corner."),
    ],
    nervous_too: [
      t("¡Ay, | no te preocupes! | Yo | también | estoy | un poco | {sm:nervioso|sf:nerviosa}.", "Oh, | don't worry! | I | also | am | a little | nervous.",
        "Aw, don't worry! I'm a little nervous too."),
    ],
    leaving_already: [
      t("Oye, | ¿ya | te vas?", "Hey, | already | you're leaving?", "Wait, are you leaving already?"),
    ],
    text_me: [
      t("Mándame | un | mensaje | cuando | llegues | a | tu | casa, | ¿sí?", "Send me | a | message | when | you get | to | your | house, | okay?", "Text me when you get home, okay?"),
    ],
    good_night: [
      t("¡Buenas noches!", "Good night!", "Good night!"),
      t("¡Buenas noches! | Que | llegues | bien.", "Good night! | (I hope) | you-arrive | well.", "Good night! Get home safe."),
    ],
    will_too: [
      t("¡Sí, | yo | te | escribo! | ¡Buenas noches!", "Yes, | I | (to) you | I'll-write! | Good night!", "I will. Good night!"),
    ],
    perfect: [
      t("¡Perfecto!", "Perfect!", "Perfect!"),
      t("¡Súper!", "Great!", "Great!"),
    ],
    if_you_insist: [
      t("Bueno, | si | insistes. | ¡Gracias!", "Okay, | if | you-insist. | Thanks!", "Okay, if you insist! Thank you!"),
    ],
    // the check: the tip, cards ("¿Dejamos propina?", "¿Aceptan tarjeta?")
    tip_usual: [
      t("Aquí | se deja | como | el | diez | o | quince | por ciento.", "Here | one leaves | about | — | ten | or | fifteen | percent.",
        "People here leave about ten or fifteen percent.", { flags: { 1: "se deja: impersonal se, “one leaves” (people leave).", 3: "el before a percentage: no English word." } }),
    ],
    cards_ok: [
      t("Sí, | aquí | aceptan | tarjeta.", "Yes, | here | they-accept | card.", "Yes, they take cards here."),
    ],
    // "¿A qué hora?" (the day agreed or being agreed)
    time_by_text: [
      t("La | hora | la | vemos | después.", "The | time | it | we'll-see | later.", "We can figure out the time later.",
        { flags: { 2: "la: the pronoun for la hora (it), not an article.", 3: "ver here: to work something out (la vemos = we'll sort it out)." } }),
    ],
    // the learner's personal questions: the partner's own facts (the same for Santiago and Camila)
    own_from: [
      t("¡De | aquí! | Nací | en | Puerto Colibrí.", "From | here! | I was born | in | Puerto Colibrí.", "I'm from here! I was born in Puerto Colibrí."),
    ],
    own_always: [
      t("¡Toda la vida! | Nací | aquí.", "My whole life! | I was born | here.", "My whole life! I was born here."),
    ],
    live_blocks: [
      t("Aquí | cerca, | a | unas | cuadras | del | malecón.", "Here | near, | at | some | blocks | from the | waterfront.", "Close by, a few blocks from the waterfront."),
    ],
    live_corner: [
      t("¡Aquí | a la vuelta!", "Here | around the corner!", "Right around the corner!"),
    ],
    pets_dog: [
      t("No, | pero | tengo | una | gata | que | se llama | Luna.", "No, | but | I-have | a | cat | that | is called | Luna.", "No, but I have a cat named Luna."),
    ],
    own_age: [
      t("Tengo | treinta y un | años.", "I have | thirty-one | years.", "I'm thirty-one."),
    ],
    own_siblings: [
      t("Sí, | una | hermana | menor.", "Yes, | a | sister | younger.", "Yes, a younger sister."),
    ],
    own_kids: [
      t("No, | todavía | no.", "No, | still | not.", "No, not yet."),
    ],
    own_family: [
      t("Sí, | mis | papás | viven | aquí | cerca.", "Yes, | my | parents | live | here | near.", "Yes, my parents live nearby."),
    ],
    like_here: [
      t("¡Me encanta! | Tenemos | el | mar | y | los | cenotes.", "I love it! | We-have | the | sea | and | the | cenotes.", "I love it! We've got the sea and the cenotes."),
    ],
    own_food: [
      t("¡El | pescado | a la talla! | Aquí | es | buenísimo.", "The | fish | split and grilled! | Here | it's | really good.", "The pescado a la talla, the grilled fish! It's amazing here.",
        { flags: { 2: "a la talla: a whole fish split open, rubbed with a red chili paste and grilled over coals." } }),
    ],
    hungry: [
      t("¡Un | poquito! | Aquí | el | pescado | a la talla | es | buenísimo.", "A | little bit! | Here | the | fish | split and grilled | is | really good.",
        "A little! The pescado a la talla here is amazing.", { flags: { 5: "a la talla: a whole fish split open, rubbed with a red chili paste and grilled over coals." } }),
    ],
    // "Soy de Canadá"
    from_react: [
      t("¡Ah, | mira! | A lo mejor | algún | día | me | enseñas | tu | país.", "Oh, | look! | Maybe | some | day | (to) me | you-show | your | country.",
        "Oh, nice! Maybe someday you can show me around your country.", { flags: { 1: "¡Mira!: here not “look”, just interest (oh, really?)." } }),
    ],
  },

  hints: {
    hello_late: {
      lt: "Say it's no problem",
      items: [
        { id: "gr_no_worries", s: t("¡No te preocupes!", "Don't worry!", "No worries!") },
        { id: "gr_thats_ok", s: t("¡No pasa nada!", "It's nothing!", "That's okay!") },
        { id: "gr_nice_too", s: t("¡Hola! | Mucho gusto.", "Hi! | Nice to meet you.", "Hi! Nice to meet you!") },
      ],
    },
    hello_early: {
      lt: "Thank them for the compliment",
      items: [
        { id: "cm_you_too", s: t("¡Gracias! | ¡Tú | también!", "Thanks! | You | too!", "Thanks! You too!") },
        { id: "gr_sorry_late", s: t("¡Perdón | por | llegar | tarde!", "Sorry | for | arriving | late!", "Sorry I'm late!") },
        { id: "gr_nice_too", s: t("¡Hola! | Mucho gusto.", "Hi! | Nice to meet you.", "Hi! Nice to meet you!") },
      ],
    },
    hello_meet: {
      lt: "Say hello",
      items: [
        { id: "gr_nice_too", s: t("¡Igualmente!", "Likewise!", "Nice to meet you too!"), note: "The usual answer to “Mucho gusto”." },
        { id: "cm_look", s: t("¡Te ves | muy | bien!", "You look | very | good!", "You look great!") },
        { id: "gr_nice", s: t("¡Qué | gusto | conocerte!", "What a | pleasure | to meet you!", "It's so nice to meet you!") },
      ],
    },
    compliments: {
      lt: "Say something nice",
      items: [
        { id: "cm_look", s: t("¡Te ves | muy | bien!", "You look | very | good!", "You look great!") },
        { id: "cm_love", s: t("Me encanta | tu | camisa.", "I love | your | shirt.", "I love your shirt.") },
        { id: "cm_view", s: t("¡Qué | bonita | vista!", "What a | beautiful | view!", "The view is beautiful!") },
        { id: "cm_place", s: t("¡Este | lugar | está | precioso!", "This | place | is | lovely!", "This place is great!") },
      ],
    },
    drinks: {
      lt: "Choose a drink", slot: "drink", examples: ["margarita", "beer", "white_wine", "jamaica"],
      items: [
        { id: "dr_short", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "dr_have", s: t("Voy | a | pedir | {X.np}.", "I'm going | to | order | {X.np}.", "I'll have {X.np}.") },
        { id: "dr_same", s: t("Lo | mismo | para | mí.", "The | same | for | me.", "Same for me."), note: "Lo mismo = the same thing." },
        { id: "dr_glass", s: t("Una | copa | de | {X}, | por favor.", "A | glass | of | {X}, | please.", "A glass of {X}, please."), only: (e) => !!e.attrs?.glass },
      ],
    },
    job: {
      lt: "Talk about your job",
      items: [
        { id: "job_im", s: t("Soy | {m:enfermero|f:enfermera}.", "I'm | a nurse.", "I'm a nurse."), note: "No article before a job: Soy maestra." },
        { id: "job_field", s: t("Trabajo | en | tecnología.", "I-work | in | tech.", "I work in tech.") },
        { id: "job_im", s: t("Soy | {m:maestro|f:maestra}. | ¿Y | tú?", "I'm | a teacher. | And | you?", "I'm a teacher. And you?") },
        { id: "job_field", s: t("Trabajo | en | un | hotel.", "I-work | in | a | hotel.", "I work at a hotel.") },
      ],
    },
    hobbies: {
      lt: "Talk about your hobbies", slot: "hobby", examples: ["cooking", "swimming", "reading", "yoga"],
      items: [
        { id: "hb_like", s: t("Me encanta | {X}.", "I love | {X}.", "I love {X}.") },
        { id: "hb_like", s: t("Me gusta | mucho | {X}. | ¿Y | a | ti?", "I like | a lot | {X}. | And | to | you?", "I really like {X}. And you?"),
          note: "After “me gusta”, ask back with “¿Y a ti?”." },
        { id: "hb_free", s: t("En | mi | tiempo | libre, | me gusta | {X}.", "In | my | time | free, | I like | {X}.", "In my free time, I like {X}.") },
      ],
    },
    travel: {
      lt: "Answer about travel",
      items: [
        { id: "tr_yes", s: t("¡Sí, | ya | fui! | ¿Y | tú?", "Yes, | already | I-went! | And | you?", "Yes, I have! Have you?") },
        { id: "tr_not_yet", s: t("¡Todavía | no!", "Still | not!", "Not yet!") },
        { id: "tr_no", s: t("No, | nunca. | ¡Pero | me encantaría | ir!", "No, | never. | But | I'd love | to go!", "No, never. But I'd love to go!") },
        { id: "tr_ask", s: t("¿Conoces | Estados Unidos?", "Do you know | the United States?", "Have you ever been to the United States?"),
          note: "Conocer a place = to have been there. Use your own country." },
      ],
    },
    music: {
      lt: "Talk about music", slot: "genre", examples: ["jazz", "rock", "cumbia", "pop"],
      items: [
        { id: "mu_like", s: t("Me encanta | {X.the}.", "I love | {X}.", "I love {X}.") },
        { id: "mu_mostly", s: t("Sobre todo | {X}. | ¿Y | a | ti?", "Mostly | {X}. | And | to | you?", "Mostly {X}. And you?") },
        { id: "mu_all", s: t("De | todo | un | poco.", "Of | everything | a | little.", "A bit of everything.") },
      ],
    },
    ask_back: {
      lt: "Ask the same back",
      items: [
        { id: "ab_and_you", s: t("¿Y | tú?", "And | you?", "And you?") },
        { id: "ab_and_you", s: t("¿Y | a | ti?", "And | to | you?", "What about you?"), note: "After “me gusta / me encanta”." },
        { id: "ab_and_you", s: t("¿Y | tú | qué?", "And | you | what?", "How about you?"), register: "casual" },
      ],
    },
    check: {
      lt: "Sort out the check",
      items: [
        { id: "ck_let_me", s: t("Déjame | invitarte.", "Let me | treat you.", "Let me get this."), note: "In Mexico whoever invites usually pays." },
        { id: "ck_split", s: t("¿Dividimos | la | cuenta?", "Do we split | the | check?", "Should we split the check?") },
        { id: "ck_on_me", s: t("Yo | invito.", "I | treat.", "It's on me.") },
        { id: "ck_half", s: t("¿Pagamos | a | la | mitad?", "Do we pay | at | the | half?", "Should we split it fifty-fifty?") },
        { id: "ck_sure", s: t("¿Estás | {sm:seguro|sf:segura}? | ¡Gracias!", "Are you | sure? | Thanks!", "Are you sure? Thank you!") },
      ],
    },
    nice_time: {
      lt: "Say you had a nice time",
      items: [
        { id: "nt_me_too", s: t("¡Yo | también!", "I | too!", "Me too!") },
        { id: "nt_had", s: t("La pasé | muy | bien.", "I had a time | very | good.", "I had a really nice time.") },
        { id: "nt_thanks", s: t("Gracias | por | esta | noche | tan | bonita.", "Thanks | for | this | night | so | lovely.", "Thank you for a lovely evening.") },
      ],
    },
    again: {
      lt: "Suggest meeting again", slot: "activity", examples: ["coffee", "movie", "dinner", "cenote"],
      items: [
        { id: "ag_see", s: t("¿Te | puedo | volver a | ver?", "You | can I | again | see?", "Can I see you again?") },
        { id: "ag_free", s: t("¿Estás | libre | el | sábado?", "Are you | free | on | Saturday?", "Are you free on Saturday?", { flags: { 2: ART_DAY } }) },
        { id: "ag_activity", s: t("¿Te gustaría | {X} | el | sábado?", "Would you like | to {X} | on | Saturday?", "Would you like to {X} on Saturday?", { flags: { 2: ART_DAY } }) },
        { id: "ag_id_love", s: t("¡Me encantaría!", "I'd love that!", "I'd love that!") },
        { id: "ag_works", s: t("¡El | sábado | me queda | bien!", "— | Saturday | suits me | well!", "Saturday works for me!", { flags: { 0: "The article before a weekday: no English word here." } }),
          note: "Me queda bien = it works for me (a day, a time)." },
      ],
    },
    again_answer: {
      lt: "Say yes to meeting again",
      items: [
        { id: "ag_id_love", s: t("¡Me encantaría!", "I'd love that!", "I'd love that!") },
        { id: "ag_yes", s: t("Sí, | me gustaría.", "Yes, | I'd like that.", "Yes, I'd like that.") },
        { id: "ag_no", s: t("Perdón, | no creo.", "Sorry, | I don't think so.", "Sorry, I don't think so.") },
      ],
    },
    day_answer: {
      lt: "Agree on a day",
      items: [
        { id: "dy_works", s: t("¡Claro, | me queda | bien!", "Sure, | it suits me | well!", "Sure, that works!") },
        { id: "dy_free", s: t("¡Sí, | estoy | libre!", "Yes, | I'm | free!", "Yes, I'm free!") },
        { id: "dy_busy", s: t("Perdón, | ese | día | estoy | {m:ocupado|f:ocupada}.", "Sorry, | that | day | I'm | busy.", "Sorry, I'm busy that day.") },
      ],
    },
    jacket: {
      lt: "Offer your sweater",
      items: [
        { id: "jk_take", s: t("Toma, | ponte | mi | suéter.", "Here, | put on | my | sweater.", "Here, take my sweater.") },
        { id: "jk_want", s: t("¿Quieres | mi | suéter?", "Do you want | my | sweater?", "Do you want my sweater?") },
      ],
    },
    check_offer: {
      lt: "Say thanks or offer to split",
      items: [
        { id: "ck_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you so much!") },
        { id: "ck_sure", s: t("¿Estás | {sm:seguro|sf:segura}? | ¡Gracias!", "Are you | sure? | Thanks!", "Are you sure? Thank you!") },
        { id: "ck_split", s: t("¿Dividimos | la | cuenta?", "Do we split | the | check?", "Should we split the check?") },
        { id: "ck_tip", s: t("Entonces | yo | dejo | la | propina.", "Then | I | leave | the | tip.", "Then I'll get the tip."),
          note: "When your date pays, offering the tip is a nice touch: 10–15% is usual in Mexico." },
      ],
    },
    quick_coffee: {
      lt: "Answer quickly",
      items: [
        { id: "qf_pick", s: t("¡Café!", "Coffee!", "Coffee!") },
        { id: "qf_pick", s: t("¡Té!", "Tea!", "Tea!") },
        { id: "qf_pick", s: t("¡Los | dos!", "The | two!", "Both!") },
      ],
    },
    quick_pets: {
      lt: "Answer quickly",
      items: [
        { id: "qf_pick", s: t("¡Perros!", "Dogs!", "Dogs!") },
        { id: "qf_pick", s: t("¡Gatos!", "Cats!", "Cats!") },
        { id: "qf_pick", s: t("¡Los | dos!", "The | two!", "Both!") },
      ],
    },
    quick_beach: {
      lt: "Answer quickly",
      items: [
        { id: "qf_pick", s: t("¡Playa!", "Beach!", "The beach!") },
        { id: "qf_pick", s: t("¡Montaña!", "Mountains!", "The mountains!") },
        { id: "qf_pick", s: t("Soy | más | de | playa.", "I'm | more | of | beach.", "I'm more of a beach person.") },
      ],
    },
    like_job: {
      lt: "Say whether you like your job",
      items: [
        { id: "lj_love", s: t("¡Sí, | me encanta!", "Yes, | I love it!", "Yes, I love it!") },
        { id: "lj_okay", s: t("Está bien.", "It's okay.", "It's okay.") },
        { id: "lj_not", s: t("No | mucho, | la | verdad.", "Not | much, | the | truth.", "Not really, to be honest.") },
      ],
    },
    walk: {
      lt: "Offer to walk them home",
      items: [
        { id: "wk_walk", s: t("¿Te | acompaño | a | tu | casa?", "You | I-accompany | to | your | house?", "Can I walk you home?") },
        { id: "jk_take", s: t("Toma, | ponte | mi | suéter.", "Here, | put on | my | sweater.", "Here, take my sweater.") },
      ],
    },
    goodbye: {
      lt: "Say goodbye",
      items: [
        { id: "tx_will", s: t("¡Te | escribo!", "(To) you | I'll-write!", "I will!") },
        { id: "tx_you_too", s: t("¡Tú | también!", "You | too!", "You too!") },
        { id: "tx_good_night", s: t("¡Buenas noches!", "Good night!", "Good night!") },
      ],
    },
  },

  tips: {
    usted_date: { key: "usted_date", lt: "Understood! On a date, tú is the natural choice: “¿Y tú?” (usted would sound distant).", better: "¿Y tú?" },
  },

  merges: {
    "no encontraba": { reason: "grammatical_fusion", split: "no → not + encontraba → I-was-finding; = I couldn't find.", minimal: "Two words." },
    "me perdí": { reason: "grammatical_fusion", split: "me → myself + perdí → I lost; perderse = to get lost.", minimal: "Two words." },
    "te ves": { reason: "grammatical_fusion", split: "te → yourself + ves → you see; verse = to look (good, tired…).", minimal: "Two words." },
    "en persona": { reason: "lexical_expression", split: "en → in + persona → person; = in person.", minimal: "Two words." },
    "por fin": { reason: "lexical_expression", split: "por → for + fin → end is false; = finally.", minimal: "Two words." },
    "acabo de": { reason: "grammatical_fusion", split: "acabo → I finish + de → of is false; acabar de + verb = to have just done it.", minimal: "Two words." },
    "de tomar": { reason: "lexical_expression", split: "de → of + tomar → to take; algo de tomar = something to drink.", minimal: "Two words." },
    "a qué te dedicas": { reason: "lexical_expression", split: "a → to + qué → what + te dedicas → you devote yourself; = what do you do (for a living)?", minimal: "The whole question." },
    "sobre todo": { reason: "lexical_expression", split: "sobre → on + todo → all is false; = mostly, above all.", minimal: "Two words." },
    "no manches": { reason: "lexical_expression", split: "no → don't + manches → you stain is false; the Mexican exclamation = no way!", minimal: "Two words." },
    "no puede ser": { reason: "lexical_expression", split: "no puede → it can't + ser → be; the exclamation = no way!", minimal: "Three words." },
    "he querido": { reason: "grammatical_fusion", split: "he → I have + querido → wanted: one English perfect (I've wanted).", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = seriously, really.", minimal: "Two words." },
    "alguna vez": { reason: "lexical_expression", split: "alguna → some + vez → time; in a question = ever.", minimal: "Two words." },
    "has ido": { reason: "grammatical_fusion", split: "has → you have + ido → gone: one English perfect (have you gone).", minimal: "Two words." },
    "tienes que": { reason: "grammatical_fusion", split: "tienes → you have + que → that is false; tener que = have to.", minimal: "Two words." },
    "me encantó": { reason: "grammatical_fusion", split: "me → to me + encantó → it delighted: one English verb (I loved it).", minimal: "Two words." },
    "a lo mejor": { reason: "lexical_expression", split: "a → to + lo → the + mejor → best is false; = maybe.", minimal: "Three words." },
    "no pedimos": { reason: "grammatical_fusion", split: "no → not + pedimos → we ordered; = we haven't ordered.", minimal: "Two words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → done; the exclamation = deal!", minimal: "Two words." },
    "la pasé": { reason: "lexical_expression", split: "la → it + pasé → I spent; pasarla bien = to have a good time.", minimal: "Two words." },
    "me da": { reason: "grammatical_fusion", split: "me → to me + da → it gives; me da gusto = I'm glad.", minimal: "Two words." },
    "me dio": { reason: "grammatical_fusion", split: "me → to me + dio → it gave; me dio gusto = I was glad.", minimal: "Two words." },
    "volver a": { reason: "grammatical_fusion", split: "volver → to return + a → to is false before a verb; volver a + verb = again.", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → it would delight: one English verb (I'd love that).", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth; = really.", minimal: "Two words." },
    "te gustaría": { reason: "grammatical_fusion", split: "te → to you + gustaría → it would please: one English verb (would you like).", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; = a little.", minimal: "Two words." },
    "te vas": { reason: "grammatical_fusion", split: "te → yourself + vas → you go; irse = to leave.", minimal: "Two words." },
    "no deja": { reason: "grammatical_fusion", split: "no → not + deja → it leaves; = doesn't leave.", minimal: "Two words." },
    "qué tal": { reason: "lexical_expression", split: "qué → what + tal → such; before a day or a plan = how about.", minimal: "Two words." },
    "ni lo pienses": { reason: "lexical_expression", split: "ni → not even + lo → it + pienses → you think; = don't even think about it.", minimal: "Three words." },
    "no nos traen": { reason: "grammatical_fusion", split: "no → not + nos → (to) us + traen → they bring; = they haven't brought us.", minimal: "Three words." },
    "cada quien": { reason: "lexical_expression", split: "cada → each + quien → who; = each person (cada uno elsewhere).", minimal: "Two words." },
    "te lo": { reason: "grammatical_fusion", split: "Two object pronouns before the verb are glossed together (it to you).", minimal: "Two words." },
    "puerto colibrí": { reason: "lexical_expression", split: "A town's name (S-NAME); Puerto → harbor + Colibrí → hummingbird would translate a name.", minimal: "The name." },
    "toda la vida": { reason: "lexical_expression", split: "toda → all + la → the + vida → life; = my whole life, forever.", minimal: "Three words." },
    "treinta y un": { reason: "lexical_expression", split: "treinta → thirty + y → and + un → one: one English number (thirty-one).", minimal: "The number." },
    "a la talla": { reason: "lexical_expression", split: "a → to + la → the + talla → size is false; = split and grilled (a dish name).", minimal: "Three words." },
    "por ciento": { reason: "lexical_expression", split: "por → for + ciento → hundred; = percent.", minimal: "Two words." },
    "pasado mañana": { reason: "lexical_expression", split: "pasado → past + mañana → tomorrow; = the day after tomorrow.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say hello", done: (c) => !!c.s.greeted },
    { lt: "Order a drink", optional: true, when: (c) => asked(c, "drinks") > 0 && !c.s.goalMet, done: (c) => asked(c, "drinks") > 0 && (!!c.s.drink || !!c.s.noAlcohol || asked(c, "drinks") >= 2 || !!c.s.wrapUp) },
    { lt: "Talk about yourself", done: (c) => topicsDone(c) },
    { lt: "Answer the quick questions", optional: true, when: (c) => !!c.s.qfStarted && !c.s.goalMet, done: (c) => !!c.s.qfStarted && !!c.s.qfDone },
    { lt: "Sort out the check", optional: true, when: (c) => !!c.s.checkShown && !c.s.goalMet, done: (c) => !!c.s.checkShown && (!!c.s.checkDone || asked(c, "check") >= 2 || !!c.s.checkPlan) },
    { lt: "Agree to meet again", done: (c) => !!c.s.dayAgreed },
  ],
  steps: [
    ...([
      ["late", [{ lt: "Say it's no problem", hint: "hello_late" }, { lt: "Say something nice", hint: "compliments" }]],
      ["early", [{ lt: "Thank them for the compliment", hint: "hello_early" }, { lt: "Say something nice", hint: "compliments" }]],
      ["meet", [{ lt: "Say hello", hint: "hello_meet" }, { lt: "Say something nice", hint: "compliments" }]],
    ] as [string, { lt: string; hint: string }[]][]).map(([o, sug]) => ({
      id: "greet_" + o, when: (c: Ctx) => c.s.opening === o, done: (c: Ctx) => !!c.s.greeted,
      ask: (c: Ctx) => { if (c.s.greetSkip) { c.s.greetSkip = false; return; } c.say("hello_again"); },
      expects: ["greet_back", "compliment", "sorry_late", "reassure", "you_too", "intro_ctx"],
      suggest: sug,
      // "Está bien", "No, no te preocupes" to "¡Perdón por llegar tarde!" reassure; elsewhere they are a hello
      yes: (c: Ctx) => { H.reassure(c, {}, { intent: "reassure", slots: {}, tags: [] }); },
      no: (c: Ctx) => { H.reassure(c, {}, { intent: "reassure", slots: {}, tags: [] }); },
    })),
    { id: "drinks", when: (c) => c.s.askDrinks && !c.s.wrapUp, done: (c) => !!c.s.drink || !!c.s.noAlcohol || asked(c, "drinks") >= 2,
      ask: (c) => { bump(c, "drinks"); if (c.s.drinkBack) { c.s.drinkBack = false; c.say("ask_drinks_back"); } else c.say("ask_drinks"); },
      expects: ["drink_ans", "same_drink_ans", "no_alcohol", "no_drink_ctx", "ask_drink", "me_too_ctx"],
      suggest: [{ lt: "Choose a drink", hint: "drinks", options: "drink" }],
      // "No, gracias" to "¿Pedimos algo de tomar?" is no drink (never "¿qué quieres tomar?" again); "¡Sí!" gets that question
      no: (c) => { H.no_drink_ctx(c, {}, { intent: "no_drink_ctx", slots: {}, tags: [] }); } },
    ...(["job", "hobby", "travel", "music"] as Topic[]).map((tp) => ({
      id: tp,
      when: (c: Ctx) => !c.s.wrapUp && ((c.s.topics as Topic[]).includes(tp) || c.s.askBackShort === tp),
      done: (c: Ctx) => !!c.s.ans[tp] || (asked(c, tp) >= 2 && c.s.askBackShort !== tp),
      ask: (c: Ctx) => {
        bump(c, tp);
        c.s.lastTopic = tp;
        if (c.s.told[tp] || c.s.askBackShort === tp) { c.s.askBackShort = undefined; c.say("ask_back"); return; }
        if (asked(c, tp) > 1) { c.say(tp + "_again", { C: c.s.country }); return; }
        if (tp === "job") c.say("ask_job");
        else if (tp === "hobby") c.say("ask_hobby");
        else if (tp === "travel") c.say("ask_travel", { C: c.s.country });
        else c.say("ask_music");
      },
      expects: tp === "job" ? ["job_ans", "job_ctx", "no_job", "ask_job", "and_you"] : tp === "hobby" ? ["hobby_ans", "no_hobby", "ask_hobby", "and_you"]
        : tp === "travel" ? ["travel_yes_ctx", "travel_no_ctx", "ask_travel", "ask_travel_general", "and_you"] : ["music_ans", "no_music", "ask_music", "and_you"],
      suggest: tp === "job" ? [{ lt: "Talk about your job", hint: "job" }, { lt: "Ask the same back", hint: "ask_back" }]
        : tp === "hobby" ? [{ lt: "Talk about your hobbies", hint: "hobbies", options: "hobby" }, { lt: "Ask the same back", hint: "ask_back" }]
        : tp === "travel" ? [{ lt: "Say whether you've been there", hint: "travel" }, { lt: "Ask the same back", hint: "ask_back" }]
        : [{ lt: "Say what music you like", hint: "music", options: "genre" }, { lt: "Ask the same back", hint: "ask_back" }],
      yes: tp === "travel" ? (c: Ctx) => { answered(c, "travel"); c.s.told.travel = true; c.say("travel_yes_react"); } : undefined,
      no: tp === "travel" ? (c: Ctx) => { answered(c, "travel"); c.say("travel_no_react"); } : undefined,
    })),
    { id: "qf", when: (c) => !!c.s.quick && !c.s.wrapUp, done: (c) => !!c.s.qfDone,
      ask: (c) => { c.s.qfStarted = true; c.twist("quick_questions"); c.say("qf_intro"); c.say(QF[(c.s.qfOrder as number[])[0]].line); quick(c, 0); }, expects: ["qf_ctx"],
      suggest: [{ lt: "Answer quickly", hint: "quick_coffee" }] },
    // With a plan agreed before (checkPlan), the check just comes: no offer, no second ask.
    { id: "check", when: (c) => c.s.askCheck && !(c.s.againOk && !c.s.dayAgreed),
      done: (c) => !!c.s.checkDone || asked(c, "check") >= 2 || (!!c.s.checkPlan && !!c.s.checkShown),
      ask: (c) => {
        bump(c, "check");
        const first = !c.s.checkShown;
        if (first) { c.s.checkShown = true; c.say("check_here"); }
        if (c.s.checkPlan) return;
        // Offers to pay at once on some visits, or when the learner says nothing about the check.
        if ((c.s.partnerPays || !first) && !c.s.partnerOffered) { c.ask("check_offer"); return; }
        if (!first) c.say("so_check");
      },
      expects: ["pay_all", "split", "accept_offer", "as_you_like_ctx"],
      suggest: [{ lt: "Offer to pay or to split", hint: "check" }],
      yes: (c) => {
        if (c.s.partnerOffered) { c.s.checkDone = "partner"; c.say("my_pleasure"); }
        else if (c.s.checkPlan && !c.s.checkDone) settlePlan(c);
      } },
    { id: "check_offer", when: (c) => !!c.s.checkShown && !c.s.checkDone && !c.s.checkPlan && (!!c.s.partnerOffered || c.step === "check"), done: (c) => !!c.s.checkDone,
      ask: (c) => {
        bump(c, "check_offer");
        if (!c.s.partnerOffered) { c.s.partnerOffered = true; c.say("partner_offers"); return; }
        c.s.checkDone = "partner"; c.say("my_pleasure"); // the offer was ignored: the partner pays
      },
      expects: ["accept_offer", "split", "pay_all", "sure_ctx", "as_you_like_ctx"],
      suggest: [{ lt: "Say thanks or offer to split", hint: "check_offer" }],
      yes: (c) => { c.s.checkDone = "partner"; c.say("my_pleasure"); },
      no: (c) => { c.s.checkDone = "split"; c.say("deal"); } },
    { id: "cold", when: (c) => !!c.s.coldTwist, done: (c) => !!c.s.coldAsked,
      ask: (c) => { c.s.coldAsked = true; c.twist("cold"); c.say("cold"); },
      expects: ["offer_jacket", "cold_q_ctx"], suggest: [{ lt: "Offer your sweater", hint: "jacket" }] },
    { id: "nice", done: (c) => !!c.s.niceTime || !!c.s.niceSaid,
      ask: (c) => { c.s.niceSaid = true; c.say("nice_time"); },
      expects: ["nice_time", "thanks_evening", "me_too_ctx"],
      suggest: [{ lt: "Say you had a nice time too", hint: "nice_time" }, { lt: "Ask to see them again", hint: "again", options: "activity" }],
      yes: (c) => { c.s.niceTime = true; } },
    { id: "again", when: (c) => !c.s.declined, done: (c) => !!c.s.againOk || !!c.s.declined,
      ask: (c) => { c.s.partnerAsked = true; c.say("can_i_see_you"); },
      expects: ["agree_again", "decline_again", "see_again", "propose_day", "day_ctx", "me_too_ctx", "hesitate", "no_date_ctx", "as_you_like_ctx"],
      suggest: [{ lt: "Say yes to meeting again", hint: "again_answer" }, { lt: "Suggest what to do", hint: "again", options: "activity" }],
      yes: (c) => { c.s.againOk = true; c.say("yay_great"); },
      no: (c) => declineDate(c),
      help: (c) => { if (!c.s.againOk) c.say("think_about_it"); } },
    { id: "day", when: (c) => !!c.s.againOk && !c.s.declined, done: (c) => !!c.s.dayAgreed,
      ask: (c) => {
        if (c.s.whenFree) { c.s.whenFree = false; c.say("when_free"); return; }
        if (c.s.offerDay) { c.say("are_you_free_on", { D: c.s.offerDay }); return; }
        const d = nextWeekendDay(c);
        if (!d) { c.say("when_free"); return; } // "Este fin de semana no puedo"
        c.s.offerDay = d; c.s.dayOffered = true;
        c.say("are_you_free_on", { D: c.s.offerDay });
      },
      expects: ["propose_day", "agree_again", "decline_again", "day_ctx", "no_date_ctx", "as_you_like_ctx"],
      suggest: [{ lt: "Agree on a day", hint: "day_answer" }, { lt: "Suggest another day or a plan", hint: "again", options: "activity" }],
      yes: (c) => dayYes(c),
      // a bare "No" turns down the day offered; "No, la verdad no me interesa" turns down the date
      no: (c) => { if (datesOff(c)) { declineDate(c); return; } if (once(c, "dayno")) dayNo(c); c.hold(); } },
  ],

  init: (c) => {
    c.s.ans = {}; c.s.told = {};
    c.s.opening = c.chance(0.35) ? "late" : c.chance(0.54) ? "early" : "meet";
    const all: Topic[] = ["job", "hobby", "travel", "music"];
    const first = c.pick(all);
    const second = c.pick(all.filter((x) => x !== first));
    c.s.topics = all.filter((x) => x === first || x === second);
    c.s.country = c.pick(TRIP);
    c.s.askDrinks = c.chance(0.6);
    c.s.likeJobQ = c.chance(0.35);
    c.s.askCheck = c.chance(0.85);
    c.s.partnerPays = c.chance(0.4);
    c.s.quick = c.visits >= 2 && c.chance(0.5);
    c.s.qfOrder = c.pick([[0, 1], [1, 2], [0, 2], [2, 1]]);
    c.s.busySat = c.visits >= 1 && c.chance(0.4);
    c.s.coldTwist = c.visits >= 1 && c.chance(0.3);
    c.s.livesClose = c.chance(0.35);
  },

  start: (c) => {
    c.speaker(partnerOf(c));
    const o = c.s.opening;
    if (o === "late") c.say("open_late");
    else if (o === "early") { c.say("open_early"); c.s.complimented = true; }
    else c.say("open_meet");
    c.s.greetSkip = true;
  },

  handlers: H,

  finish: (c) => {
    if (c.s.declined) { c.say("good_night"); c.end(); return; }
    win(c);
    c.say("text_me");
    const bye = (cc: Ctx) => {
      // "¿A qué hora?" gets its answer; "Pensándolo bien, mejor no" its kind reply, before the goodbye
      if (/\ba que hora\b/.test(heard(cc))) timeByText(cc);
      if (datesOff(cc) && once(cc, "decline")) cc.say("no_pressure");
      if (once(cc, "bye")) cc.say(/\b(tu tambien|mandame uno|escribeme tu|tu me escribes|tu mandame|tu escribeme)\b/.test(heard(cc)) ? "will_too" : "good_night");
      cc.end();
    };
    // The evening is over: any friendly answer ends it with a goodbye. A personal question ("¿Tienes hermanos?") is
    // answered by its own handler and the goodbye waits.
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of Object.keys(date.intents)) if (!k.endsWith("_ctx") && k !== "ask_personal" && k !== "from_ans") on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_ok", "g_hello", "g_howareyou_answer", "g_sorry", "no_date_ctx"]) on[k] = bye;
    c.expect({
      id: "closing", expects: ["text_reply"], hints: ["goodbye"], suggest: [{ lt: "Say goodbye", hint: "goodbye" }],
      on, yes: bye, no: bye,
    });
  },

  tests: [
    // hello
    { say: "¡Qué gusto conocerte!", intent: "greet_back", step: "greet_meet" },
    { say: "¡Hola! Mucho gusto.", intent: "greet_back", step: "greet_meet" },
    { say: "¡Igualmente!", intent: "greet_back", step: "greet_meet", not: ["g_bye"] },
    { say: "¡Te ves muy bien!", intent: "compliment", step: "greet_early" },
    { say: "¡Gracias! ¡Tú también!", intent: "you_too", step: "greet_early", not: ["g_bye"] },
    { say: "¡Perdón por llegar tarde!", intent: "sorry_late", step: "greet_early" },
    { say: "No pasa nada", intent: "reassure", step: "greet_late" },
    { say: "Me encanta tu camisa", intent: "compliment" },
    { say: "¡Qué bonita vista!", intent: "view" },
    { say: "¡Este lugar está precioso!", intent: "view" },
    // drinks
    { say: "Una margarita, por favor", intent: "drink_ans", step: "drinks", slots: { drink: "margarita" } },
    { say: "Voy a pedir una cerveza", intent: "drink_ans", step: "drinks", slots: { drink: "beer" } },
    { say: "Una copa de vino blanco, por favor", intent: "drink_ans", step: "drinks", slots: { drink: "white_wine" } },
    { say: "Quiero una chela", intent: "drink_ans", step: "drinks", slots: { drink: "beer" } },
    { say: "Lo mismo para mí", intent: "same_drink_ans", step: "drinks" },
    { say: "No tomo alcohol", intent: "no_alcohol", step: "drinks", not: ["drink_ans"] },
    { say: "No quiero vino", intent: "no_alcohol", step: "drinks", not: ["drink_ans"] },
    { say: "¿Qué vas a tomar?", intent: "ask_drink", step: "drinks" },
    { say: "Estoy manejando, así que solo una limonada", intent: "drink_ans", step: "drinks", slots: { drink: "lemonade" } },
    // job
    { say: "Soy enfermero. ¿Y tú?", intent: "job_ans", step: "job", slots: { job: "enfermero" } },
    { say: "Soy maestra", intent: "job_ans", step: "job", slots: { job: "maestro" } },
    { say: "Trabajo en tecnología", intent: "job_ans", step: "job" },
    { say: "Trabajo en un hotel", intent: "job_ans", step: "job" },
    { say: "Soy un astronauta", intent: "job_ctx", step: "job" },
    { say: "Estoy jubilada", intent: "no_job", step: "job" },
    { say: "¿A qué te dedicas?", intent: "ask_job" },
    { say: "Trabajo de mesera", intent: "job_ans", step: "job", slots: { job: "mesero" } },
    // "Estoy un poco nervioso" gets a reaction
    { say: "Estoy un poco nervioso", intent: "nervous", step: "job", not: ["job_ctx"] },
    { say: "Perdón, estoy un poco nerviosa", intent: "nervous", step: "greet_early" },
    { say: "Es mi primera cita en años", intent: "nervous", step: "job" },
    { say: "No estoy nervioso", intent: "none", not: ["nervous"] },
    // the shared leaving phrases
    { say: "Perdón, me tengo que ir", intent: "g_bye", step: "job" },
    { say: "No me tengo que ir", intent: "none", not: ["g_bye"] },
    // hobbies
    { say: "Me encanta cocinar", intent: "hobby_ans", step: "hobby", slots: { hobby: "cooking" } },
    { say: "En mi tiempo libre me gusta leer", intent: "hobby_ans", step: "hobby", slots: { hobby: "reading" } },
    { say: "Me gusta leer y caminar por la playa", intent: "hobby_ans", step: "hobby", not: ["g_bye"] },
    { say: "¿Qué haces en tu tiempo libre?", intent: "ask_hobby" },
    { say: "No me gusta cocinar", intent: "none", step: "hobby", not: ["hobby_ans"] },
    // travel
    { say: "No, nunca. ¡Pero me encantaría ir!", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "Todavía no he ido", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "¡Sí, ya fui! ¿Y tú?", intent: "travel_yes_ctx", step: "travel" },
    { say: "No lo conozco", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "Sí, fui hace dos años", intent: "travel_yes_ctx", step: "travel" },
    { say: "¿Has ido a Canadá?", intent: "ask_travel", slots: { country: "home" } },
    { say: "¿Conoces Estados Unidos?", intent: "ask_travel", slots: { country: "home" } },
    // music
    { say: "Sobre todo jazz", intent: "music_ans", step: "music", slots: { genre: "jazz" } },
    { say: "De todo un poco", intent: "music_ans", step: "music" },
    { say: "¿Qué música te gusta?", intent: "ask_music" },
    { say: "No escucho mucha música", intent: "no_music", step: "music", not: ["music_ans"] },
    { say: "¿Y tú?", intent: "and_you" },
    { say: "¿Y usted?", intent: "and_you" },
    // the check
    { say: "Déjame invitarte", intent: "pay_all", step: "check" },
    { say: "Yo invito", intent: "pay_all", step: "check" },
    { say: "¿Dividimos la cuenta?", intent: "split", step: "check" },
    { say: "¿Pagamos a la mitad?", intent: "split", step: "check" },
    { say: "Cada quien lo suyo", intent: "split", step: "check" },
    { say: "¿Y si dividimos la cuenta?", intent: "split", step: "check" },
    { say: "No puedo pagar esta noche", intent: "none", step: "check", not: ["pay_all"] },
    { say: "No quiero dividir la cuenta", intent: "none", step: "check", not: ["split"] },
    { say: "¿Estás segura? ¡Gracias!", intent: "accept_offer", step: "check_offer" },
    { say: "¿Cuánto es?", intent: "ask_amount", step: "check", not: ["pay_all", "split"] },
    { say: "¿Y si pago yo?", intent: "pay_all", step: "check_offer", not: ["split"] },
    { say: "Gracias por invitarme", intent: "accept_offer", step: "check_offer" },
    { say: "Gracias por invitarme", intent: "thanks_evening", step: "nice" },
    { say: "Nada para mí, gracias", intent: "no_drink_ctx", step: "drinks", not: ["drink_ans"] },
    { say: "No, mejor dividimos la cuenta", intent: "split", step: "check_offer", not: ["pay_all"] },
    { say: "¿Te gustaría ir a un cenote este fin de semana?", intent: "propose_day", step: "again", slots: { activity: "cenote", day: "this_weekend" } },
    { say: "No me gustan los gatos", intent: "qf_ctx", step: "qf" },
    { say: "Nunca fui", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    // the end
    { say: "La pasé muy bien esta noche", intent: "nice_time", step: "nice" },
    { say: "Gracias por esta noche tan bonita", intent: "thanks_evening", step: "nice" },
    { say: "No la pasé bien", intent: "none", step: "nice", not: ["nice_time"] },
    { say: "¿Te puedo volver a ver?", intent: "see_again" },
    { say: "¿Te gustaría tomar un café el sábado?", intent: "propose_day", slots: { activity: "coffee", day: "saturday" } },
    { say: "Te invito a cenar el viernes", intent: "propose_day", step: "again", slots: { activity: "dinner", day: "friday" }, not: ["pay_all"] },
    { say: "¡Me encantaría!", intent: "agree_again", step: "again" },
    { say: "Perdón, no creo", intent: "decline_again", step: "again", not: ["agree_again"] },
    { say: "No quiero volver a verte", intent: "decline_again", step: "again", not: ["agree_again", "see_again"] },
    { say: "Perdón, el sábado estoy ocupado", intent: "decline_again", step: "day", not: ["agree_again"] },
    { say: "El sábado me queda bien", intent: "propose_day", step: "day", slots: { day: "saturday" } },
    { say: "No puedo el sábado, pero el domingo sí", intent: "propose_day", step: "day", slots: { day: "sunday" }, not: ["agree_again"] },
    { say: "Estoy libre el domingo", intent: "propose_day", step: "day", slots: { day: "sunday" } },
    { say: "¿El domingo en la noche?", intent: "day_ctx", step: "day", slots: { day: "sunday" } },
    { say: "¿Te acompaño a tu casa?", intent: "walk_home" },
    { say: "Toma, ponte mi suéter", intent: "offer_jacket" },
    { say: "Perros, definitivamente", intent: "qf_ctx", step: "qf" },
    { say: "Soy más de playa", intent: "qf_ctx", step: "qf" },
    { say: "¡Te escribo! ¡Tú también!", intent: "text_reply" },
    { say: "¡Qué interesante!", intent: "react_nice" },
    // learners' Spain forms are correct answers too (owner, 1 Nov 2026)
    { say: "Ponme una caña", intent: "drink_ans", step: "drinks", slots: { drink: "beer" } },
    { say: "Me lo he pasado genial", intent: "nice_time", step: "nice" },
    { say: "¿Pagamos a pachas?", intent: "split", step: "check" },
    { say: "Vale, el domingo me va bien", intent: "propose_day", step: "day", slots: { day: "sunday" } },
    // the review's traps and fixes (2 Nov 2026)
    { say: "Gracias, tú también te ves muy bien", intent: "compliment", step: "greet_early", not: ["g_bye"] },
    { say: "Estoy un poco nerviosa, la verdad", intent: "nervous", step: "greet_meet" },
    { say: "No me gusta la cerveza", intent: "none", step: "drinks", not: ["drink_ans"] },
    { say: "Una cerveza. No, mejor una limonada", intent: "drink_ans", step: "drinks", slots: { drink: "lemonade" } },
    { say: "Nada, estoy de vacaciones", intent: "no_job", step: "job", not: ["no_alcohol", "no_drink_ctx"] },
    { say: "No tomo café", intent: "none", step: "job", not: ["no_alcohol"] },
    { say: "Tengo una chamba en un hotel", intent: "job_ans", step: "job" },
    { say: "Me encanta la música", intent: "music_ans", step: "music" },
    { say: "Yo pago la mitad", intent: "split", step: "check", not: ["pay_all"] },
    { say: "Pago lo mío", intent: "split", step: "check", not: ["pay_all"] },
    { say: "No hace falta, yo pago", intent: "pay_all", step: "check_offer", not: ["accept_offer"] },
    { say: "No, de verdad, yo pago", intent: "pay_all", step: "check_offer", not: ["accept_offer"] },
    { say: "Gracias, pero mejor la dividimos", intent: "split", step: "check_offer", not: ["accept_offer"] },
    { say: "Nada", intent: "none", step: "check", not: ["no_alcohol"] },
    { say: "No sé, tal vez", intent: "hesitate", step: "again", not: ["agree_again"] },
    { say: "¡Claro que no!", intent: "yn:no", step: "again", not: ["hesitate", "agree_again"] },
    { say: "Sí, pero no el sábado", intent: "decline_again", step: "again", slots: { day: "saturday" }, not: ["day_ctx", "agree_again"] },
    { say: "Sí, claro, pero este fin de semana no puedo", intent: "decline_again", step: "again", not: ["agree_again", "propose_day"] },
    { say: "Me gustaría, pero no sé cuándo", intent: "agree_again", step: "again", not: ["decline_again"] },
    { say: "Te iba a preguntar lo mismo", intent: "agree_again", step: "again" },
    { say: "Tal vez la próxima semana", intent: "propose_day", step: "again", slots: { day: "next_week" } },
    { say: "El sábado no, el domingo", intent: "propose_day", step: "day", slots: { day: "sunday" }, not: ["agree_again", "decline_again"] },
    { say: "No puedo ese día", intent: "decline_again", step: "day", not: ["agree_again"] },
    { say: "No, tampoco", intent: "decline_again", step: "day", not: ["agree_again"] },
    { say: "¿Tienes frío?", intent: "cold_q_ctx", step: "cold", not: ["offer_jacket"] },
    { say: "No, tú mándame un mensaje", intent: "text_reply" },
    // the audit (5 Nov 2026): a no to the second date, personal questions, the tip and cards, "¿A qué hora?"
    { say: "Prefiero que no", intent: "no_date_ctx", step: "again", not: ["agree_again", "propose_day"] },
    { say: "Creo que mejor quedamos como amigos", intent: "no_date_ctx", step: "again", not: ["agree_again"] },
    { say: "Me caes muy bien, pero no", intent: "no_date_ctx", step: "again", not: ["agree_again"] },
    { say: "Pensándolo bien, mejor no", intent: "no_date_ctx", step: "day", not: ["agree_again", "propose_day"] },
    { say: "No quiero volver a verte", intent: "decline_again", step: "day", not: ["agree_again", "propose_day"] },
    { say: "No me interesa el fútbol", intent: "none", step: "hobby", not: ["no_date_ctx", "decline_again"] },
    { say: "Cuando quieras", intent: "agree_again", step: "day", not: ["decline_again"] },
    { say: "¿A qué hora?", intent: "agree_again", step: "day" },
    { say: "¿De dónde eres?", intent: "ask_personal", step: "job", not: ["job_ans", "job_ctx"] },
    { say: "¿Tienes mascotas?", intent: "ask_personal", step: "hobby" },
    { say: "¿Cuántos años tienes?", intent: "ask_personal", step: "music" },
    { say: "¿Te gusta vivir aquí?", intent: "ask_personal", step: "music", not: ["ask_like_job"] },
    { say: "¿Qué vas a comer?", intent: "ask_personal", step: "drinks", not: ["ask_drink"] },
    { say: "Soy de Canadá", intent: "from_ans", step: "job", not: ["job_ans", "job_ctx"] },
    { say: "Soy americano", intent: "from_ans", step: "job", not: ["job_ans", "drink_ans"] },
    { say: "Un jugo de naranja", intent: "drink_ans", step: "drinks", slots: { drink: "juice" } },
    { say: "Un agua de coco, por favor", intent: "drink_ans", step: "drinks", slots: { drink: "coconut" } },
    { say: "Entonces yo dejo la propina", intent: "tip", step: "check_offer", not: ["pay_all", "accept_offer"] },
    { say: "No quiero dejar propina", intent: "none", step: "check_offer", not: ["tip"] },
    { say: "¿Dejamos propina?", intent: "tip_q", step: "check", not: ["tip", "pay_all"] },
    { say: "¿Aceptan tarjeta?", intent: "card_q", step: "check", not: ["pay_all"] },
    { say: "Pago con tarjeta", intent: "pay_all", step: "check", not: ["card_q"] },
    { say: "Te doy la mitad", intent: "split", step: "check", not: ["pay_all"] },
    { say: "¿Quién paga?", intent: "who_pays", step: "check", not: ["pay_all", "split"] },
    { say: "¿Segura?", intent: "sure_ctx", step: "check_offer" },
    { say: "Como quieras", intent: "as_you_like_ctx", step: "check_offer", not: ["pay_all", "split"] },
    // not understood
    { say: "la bicicleta azul canta en la luna", intent: "none" },
    { say: "Ayer compré un carro nuevo", intent: "none" },
    { say: "Mi perro se llama Max", intent: "none", step: "check" },
  ],

  sims: [
    { name: "warm first date", turns: [
      "¡Hola! ¡Qué gusto conocerte!", "Dividamos la cuenta", "Yo también la pasé muy bien", "¡Me encantaría!", "¡El sábado me queda bien!", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true }, auto: AUTO, setup: (s) => { s.askCheck = true; } },
    { name: "learner leads and asks back", turns: [
      "¡Te ves muy bien! Perdón por llegar tarde.", "¿Qué quieres tomar?", "Lo mismo para mí", "Déjame invitarte", "Gracias por esta noche tan bonita",
      "¿Te puedo volver a ver?", "¿Te gustaría tomar un café el domingo?", "¡Tú también! ¡Buenas noches!",
    ], expect: { complete: true }, auto: AUTO, setup: (s) => { s.askCheck = true; } },
    // the whole date in short answers: the compliment, the drink, two topics, then the walk home and a plan
    { name: "short answers and a plan", turns: [
      "¡Hola! Gracias, tú también.", "Vino blanco, por favor.", "Soy enfermero.", "No, nunca.", "¿Te acompaño a tu casa?", "Yo invito.", "¡Yo también!", "¡Sí!",
      "¿Qué tal el viernes?", "¡Buenas noches!",
    ], expect: { complete: true, state: { day: "friday", walk: true, checkDone: "learner" } }, auto: AUTO,
      setup: (s) => {
        s.opening = "early"; s.topics = ["job", "travel"]; s.askDrinks = true; s.likeJobQ = false; s.askCheck = true; s.partnerPays = false;
        s.quick = false; s.busySat = false; s.coldTwist = false;
      } },
    { name: "nervous, then almost leaving", turns: [
      "¡Hola! Perdón, estoy un poco nervioso.", "Perdón, me tengo que ir.", "¡No, no, perdón!", "Dividamos la cuenta", "Yo también la pasé muy bien", "¡Me encantaría!",
      "¡El sábado me queda bien!", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true }, auto: AUTO, setup: (s) => { s.askCheck = true; } },
    { name: "questions back on every topic", turns: [
      "¡Hola, mucho gusto!", "¿Qué vas a tomar?", "Una limonada, por favor", "Dividamos la cuenta", "¡Yo también!", "¡Claro que sí!", "¡Claro!", "¡Adiós!",
    ], expect: { complete: true }, setup: (s) => { s.askCheck = true; },
      auto: { ...AUTO, job: "Trabajo en un hotel. ¿Y tú a qué te dedicas?", hobby: "Me encanta hacer yoga. ¿Y tú?", travel: "¡Sí, ya fui! ¿Y tú?", music: "De todo un poco. ¿Y tú?" } },
    // "¡Sí! ¿Tú has ido?": the yes answers the travel question before the question back
    { name: "travel: yes, then a question back", setup: (s) => { s.topics = ["job", "travel"]; s.askDrinks = false; }, turns: [
      "¡Hola! ¡Mucho gusto!", "Soy maestro. ¿Y tú?", "¡Sí! ¿Tú has ido?", "Dividamos la cuenta", "Yo también la pasé muy bien", "¡Me encantaría!",
      "¡El sábado me queda bien!", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { ans: { travel: true } } }, auto: AUTO },
    // Splitting the check after the drinks, before it comes: "¡Claro, cuando traigan la cuenta!", and when it comes the
    // partner doesn't offer to pay. The partner would offer on this visit (partnerPays).
    { name: "the check: splitting it before it comes", turns: [
      "¡Hola! ¡Qué gusto conocerte!", "Una copa de vino blanco, por favor", "¿Dividimos la cuenta?", "Soy maestra. ¿Y tú?", "No, nunca. ¡Pero me encantaría ir!",
      "Mejor la dividimos", "Yo también la pasé muy bien", "¡Me encantaría!", "¡El sábado me queda bien!", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { checkPlan: "split", checkDone: "split", partnerOffered: undefined } }, auto: AUTO,
      setup: (s) => {
        s.topics = ["job", "travel"]; s.askDrinks = true; s.likeJobQ = false; s.askCheck = true; s.partnerPays = true;
        s.quick = false; s.busySat = false; s.coldTwist = false;
      } },
    // Twist: Saturday is the parents' day; the learner takes Sunday
    { name: "busy on Saturday (twist)", turns: [
      "¡Hola! ¡Mucho gusto!", "Dividamos la cuenta", "Yo también la pasé muy bien", "¡Claro que sí! ¿Estás libre el sábado?", "Sí, el domingo me queda bien.",
      "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { day: "sunday", busySatDone: true } }, auto: AUTO,
      setup: (s) => { s.busySat = true; s.askCheck = true; s.quick = false; s.coldTwist = false; } },
    // Twist: the partner gets cold by the sea; the learner offers a sweater, and the partner pays (an offer accepted)
    { name: "a chilly evening and a treat (twist)", turns: [
      "¡Hola! ¡Mucho gusto!", "¿Estás segura? ¡Gracias!", "Toma, ponte mi suéter", "Yo también la pasé muy bien", "¡Claro que sí!", "¡Sí, estoy libre!", "¡Tú también!",
    ], expect: { complete: true, state: { coldDone: true, checkDone: "partner" } }, auto: AUTO,
      setup: (s) => { s.coldTwist = true; s.askCheck = true; s.partnerPays = true; s.quick = false; s.busySat = false; } },
    // Twist: quick questions (coffee or tea, then beach or mountains), and a question about the job
    { name: "quick questions and the job (twist)", turns: [
      "¡Hola! Encantado.", "Soy contador.", "Más o menos.", "Café, obvio.", "Soy más de playa.", "Yo pago.", "Me la pasé increíble.", "Sí, me gustaría mucho.",
      "Perdón, el domingo no puedo, pero el viernes sí.", "¡Buenas noches!",
    ], expect: { complete: true, state: { qfDone: true, day: "friday", checkDone: "learner" } }, auto: AUTO,
      setup: (s) => {
        s.quick = true; s.qfOrder = [0, 2]; s.topics = ["job", "music"]; s.likeJobQ = true; s.askDrinks = false; s.askCheck = true; s.partnerPays = false;
        s.busySat = true; s.coldTwist = false;
      } },
    // hobbies and music, with a change of mind about the drink and a "no" to the first day
    { name: "hobbies, music and a change of plans", turns: [
      "Hola, no te preocupes.", "Una cerveza, por favor.", "Me gusta leer y caminar por la playa. ¿Y a ti?", "Me gusta el reguetón y la salsa.", "¿Pagamos a la mitad?",
      "Gracias por esta noche tan bonita", "¡Sí!", "Perdón, ese día estoy ocupado.", "El domingo me queda bien.", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { drink: "beer", day: "sunday", checkDone: "split" } }, auto: AUTO,
      setup: (s) => {
        s.opening = "late"; s.topics = ["hobby", "music"]; s.askDrinks = true; s.askCheck = true; s.partnerPays = false; s.quick = false; s.busySat = false; s.coldTwist = false;
      } },
    // plans in steps: "¿La próxima semana?" — "¿Qué día te queda bien?" — "El martes"; a price question at the offer
    { name: "next week, then Tuesday", turns: [
      "¡Hola! Mucho gusto.", "¿Cuánto fue?", "Muchas gracias", "La pasé muy bien", "¡Claro que sí!", "¿La próxima semana?", "El martes en la noche", "¡Te escribo!",
    ], expect: { complete: true, state: { day: "tuesday", checkDone: "partner" } }, auto: AUTO,
      setup: (s) => { s.opening = "meet"; s.askCheck = true; s.partnerPays = true; s.quick = false; s.coldTwist = false; s.busySat = false; } },
    // the review: the price asked at the check, my half, and "yes, but not this weekend" (not a no to a second date)
    { name: "the price, my half, not this weekend", turns: [
      "¡Hola! Mucho gusto.", "Soy enfermero. ¿Y tú?", "Sobre todo jazz. ¿Y tú?", "¿Cuánto es?", "Pago lo mío", "La pasé muy bien", "Sí, claro, pero este fin de semana no puedo", "El martes", "¡Te escribo!",
    ], expect: { complete: true, state: { checkDone: "split", day: "tuesday", noWeekend: true } }, auto: AUTO,
      setup: (s) => {
        s.opening = "meet"; s.topics = ["job", "music"]; s.askDrinks = false; s.likeJobQ = false; s.askCheck = true; s.partnerPays = false;
        s.quick = false; s.busySat = false; s.coldTwist = false;
      } },
    // The audit (5 Nov 2026). Every line is said by both dates (Santiago for a female learner, Camila for a male one,
    // unless the settings choose): these sims force the moments random talk rarely reaches, so the voice list hears
    // each line from both (its runs play every sim for both learner genders).
    // The learner's personal questions on the way, the tip at the partner's treat, "¿A qué hora?", "¿Mañana?"
    { name: "personal questions, the tip and tomorrow", turns: [
      "¡Hola! ¿Eres de aquí?", "¿Qué vas a comer?", "Un agua de coco, por favor.", "¿Tienes hambre?", "Soy enfermera. ¿Y tú?", "¿Cuánto tiempo llevas aquí?",
      "No, nunca. ¿Tú has ido?", "¿Dejamos propina?", "¿Cuánto es?", "Entonces yo dejo la propina.", "¿Cuánto fue?", "Yo también la pasé muy bien. ¿Vives por aquí?",
      "¿Tienes mascotas?", "Tal vez.", "Sí, me encantaría. ¿A qué hora?", "¿Mañana?", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { drink: "coconut", checkDone: "partner", learnerTip: true, day: "tomorrow", timeSaid: true,
      personal: { from: true, food: true, hungry: true, always: true, live: true, pets: true } } }, auto: AUTO,
      setup: (s) => {
        s.opening = "meet"; s.topics = ["job", "travel"]; s.askDrinks = true; s.likeJobQ = false; s.askCheck = true; s.partnerPays = true;
        s.quick = false; s.busySat = false; s.coldTwist = false; s.livesClose = false;
      } },
    // The rest of the personal answers, a card question, the offer turned down, half the check, the chilly breeze
    { name: "more personal answers, half the check, a chilly evening", turns: [
      "No te preocupes.", "¿Tienes hermanos?", "Una limonada, por favor.", "¿Tienes perro?", "Estoy buscando trabajo. ¿Y tú?", "¿Cuántos años tienes?",
      "No escucho mucha música.", "¿Aceptan tarjeta?", "¿Cuánto es?", "No, gracias, mejor dividimos.", "¿Tienes frío?", "Toma, ponte mi suéter.",
      "¿Cuánto te debo?", "¿Dónde vives?", "¿Te gusta vivir aquí?", "¿Te acompaño a tu casa?", "Soy de Canadá.", "¡Me encantaría! ¿Estás libre el viernes?",
      "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { drink: "lemonade", checkDone: "split", coldDone: true, walk: true, day: "friday", fromSaid: true,
      personal: { siblings: true, dog: true, age: true, live: true, like_here: true } } }, auto: AUTO,
      setup: (s) => {
        s.opening = "late"; s.topics = ["job", "music"]; s.askDrinks = true; s.likeJobQ = false; s.askCheck = true; s.partnerPays = false;
        s.quick = false; s.busySat = false; s.coldTwist = true; s.livesClose = true;
      } },
    // The same job, the partner's job asked back, no free time, the quick questions' other answers, and a no to the date
    // after a first yes ("Pensándolo bien, mejor no"): the evening ends kindly, never with another day
    { name: "a photographer too, quick answers, and a no after all", turns: [
      "¡Hola! ¿Vienes seguido aquí?", "Soy fotógrafo. ¿Y te gusta tu trabajo?", "¿Tienes hijos?", "No tengo mucho tiempo libre.", "Perros.", "Montaña.",
      "Yo invito.", "Yo también la pasé muy bien. ¿Tu familia vive aquí?", "Sí.", "Pensándolo bien, mejor no.",
    ], expect: { complete: false, state: { declined: true, dayAgreed: undefined, qfDone: true, checkDone: "learner", personal: { kids: true, family: true } } }, auto: AUTO,
      setup: (s) => {
        s.opening = "meet"; s.topics = ["job", "hobby"]; s.askDrinks = false; s.likeJobQ = false; s.askCheck = true; s.partnerPays = false;
        s.quick = true; s.qfOrder = [1, 2]; s.busySat = false; s.coldTwist = false;
      } },
    // The small answers random talk seldom reaches: the learner's own "sorry I'm late", a job the learner likes, "¿Conoces
    // Canadá?", tea, a question already answered, "¿Pasado mañana?"
    { name: "small answers: sorry, tea, already told, the day after tomorrow", turns: [
      "¡Perdón por llegar tarde!", "Soy maestro.", "¡Sí, me encanta!", "¿Conoces Canadá?", "No, todavía no. ¿Y tú?", "Té.", "¡Los dos!",
      "Yo también la pasé muy bien. ¿Eres de aquí?", "¿Naciste aquí?", "¡Claro! ¿Pasado mañana?", "¡Te escribo! ¡Buenas noches!",
    ], expect: { complete: true, state: { day: "day_after_tomorrow", qfDone: true, personal: { from: true } } }, auto: AUTO,
      setup: (s) => {
        s.opening = "late"; s.topics = ["job", "travel"]; s.askDrinks = false; s.likeJobQ = true; s.askCheck = false; s.partnerPays = false;
        s.quick = true; s.qfOrder = [0, 1]; s.busySat = false; s.coldTwist = false;
      } },
  ],
};

export default date;
