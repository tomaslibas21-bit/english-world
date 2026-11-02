// Song 87 "Why Should We Hire You?" → Puerto Colibrí: a job interview at Línea Clara (the office). Licenciada Salinas,
// the HR manager (gerente de recursos humanos), interviews the learner in usted, as a Mexican interview is held:
// arrival ("Tengo una entrevista a las nueve y media"), name, a little small talk ("¿Nos encontró bien?" / "¿Le
// ofrezco algo de tomar?"), "Cuénteme un poco de usted" (job, field and years of experience are filled from whatever
// the learner says; she asks only for what is still missing), why here, strengths ("fortalezas"), then a different
// selection of the classic questions on each visit (weaknesses / "áreas de oportunidad", why a new job, teamwork, five
// years, languages, the work permit "¿Tiene permiso para trabajar en México?", the salary "¿Cuáles son sus
// pretensiones salariales?" in pesos a month, the start date, "¿Por qué deberíamos contratarlo?"), the learner's own
// questions (hours, training, start date, the team, home office, prestaciones, a typical day, next steps, dress code,
// parking …) and the goodbye ("Le avisamos a más tardar el viernes"). She reacts briefly and never judges whether an
// answer is true.
// Twists (returning visits), as in the English edition: a phone call interrupts the interview; the job is offered on
// the spot.
//
// Keeps the English file's id, steps, intents, twists and handler logic. Changes for Mexico (brief + research):
// - Salary expectations are said per month in pesos ("dieciocho mil al mes", "veinte mil mensuales"); the range she
//   gives is $14,000–$17,000 a month "según la experiencia" (a plausible office salary in a Caribbean beach town in
//   2026; unsure, kept as one figure in one line).
// - Benefits are "las prestaciones de ley": seguro social (IMSS), aguinaldo (the December bonus the law requires) and
//   vacaciones; no number of vacation days is given (the law's minimum changed in 2023; kept vague on purpose).
// - The work permit: a residente permanente, or a residente temporal with permission to work; "en trámite" = pending.
// - "Home office" is what Mexican offices say for working from home (neutral twin: "trabajar desde casa").
// - The learner is a newcomer from an English-speaking country: "¿De dónde es?" answers are Canada, the US, the UK…;
//   the "English is my weakness" answer became "Mi español todavía no es perfecto".
// - Working hours nine to six with an hour for lunch (a common Mexican office day); no Saturday is promised.
// - She never says her first name (npcs.ts gives only "Licenciada Salinas"): asked, she says "Soy la licenciada
//   Salinas, para servirle".
// NEEDS: (npcs.ts) a first name for Licenciada Salinas would let her introduce herself as Mexicans do ("Soy Mariana
//   Salinas, gerente de recursos humanos"); until then she gives her role only.
// NEEDS: (engine, lang.ts `newPart`) a piece may begin with "fue" ("Gracias por la oportunidad. | Fue un gusto conocerla"):
//   thanks_time carries the whole sentence in its own pattern (#nice) and her goodbye answers both.

import type { Ctx, EntityDef, Pending, SituationDef, Suggestion } from "@/content/types";
import type { SlotFn, SlotResult } from "@/convo/grammar";
import { ent, t } from "@/content/dsl";
import { priceSlot, readInt } from "@/convo/slots";

// ---------------------------------------------------------------------------
// Entities

const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Jobs: masculine Spanish units, feminine units, English gloss units, synonyms (and the natural English name). */
const J = (id: string, m: string, f: string, en: string, forms: string[] = [], nat?: string) =>
  ent(id, m, en, "m", { enF: f, gF: "f", forms: [...new Set([fold(f.replace(/ \| /g, " ")), ...forms])], attrs: nat ? { nat } : {} });
const JOBS: EntityDef[] = [
  J("contador", "contador", "contadora", "accountant", ["contable", "contador publico", "contadora publica"]),
  J("enfermero", "enfermero", "enfermera", "nurse", ["auxiliar de enfermeria"]),
  J("maestro", "maestro", "maestra", "teacher", ["profesor", "profesora", "docente", "maestro de primaria", "maestra de primaria"]),
  J("maestro_ingles", "maestro | de | inglés", "maestra | de | inglés", "teacher | of | English",
    ["profesor de ingles", "profesora de ingles", "maestro de idiomas", "maestra de idiomas", "profe de ingles"], "English teacher"),
  J("ingeniero", "ingeniero", "ingeniera", "engineer", ["ingeniero civil", "ingeniera civil", "ingeniero industrial", "ingeniera industrial"]),
  J("programador", "programador", "programadora", "programmer", ["desarrollador", "desarrolladora", "desarrollador web", "desarrolladora web", "ingeniero de software", "ingeniera de software"]),
  J("disenador", "diseñador", "diseñadora", "designer", ["disenador grafico", "disenadora grafica", "disenador web", "disenadora web"]),
  J("gerente", "gerente", "gerente", "manager", ["jefe", "jefa", "supervisor", "supervisora", "coordinador", "coordinadora", "lider de equipo", "gerente de ventas", "gerente de tienda"]),
  J("vendedor", "vendedor", "vendedora", "salesperson", ["ejecutivo de ventas", "ejecutiva de ventas", "agente de ventas", "asesor de ventas", "asesora de ventas"]),
  J("chofer", "chofer", "chofer", "driver", ["conductor", "conductora", "taxista", "repartidor", "repartidora", "trailero"]),
  J("mecanico", "mecánico", "mecánica", "mechanic", []),
  J("cocinero", "cocinero", "cocinera", "cook", ["chef"]),
  J("mesero", "mesero", "mesera", "waiter", ["camarero", "camarera"]),
  J("bartender", "bartender", "bartender", "bartender", ["cantinero", "cantinera", "barman"]),
  J("cajero", "cajero", "cajera", "cashier", []),
  J("recepcionista", "recepcionista", "recepcionista", "receptionist", []),
  J("asistente", "asistente | administrativo", "asistente | administrativa", "assistant | administrative",
    ["asistente", "secretario", "secretaria", "auxiliar administrativo", "auxiliar administrativa", "administrativo", "administrativa"], "administrative assistant"),
  J("traductor", "traductor", "traductora", "translator", ["interprete"]),
  J("abogado", "abogado", "abogada", "lawyer", []),
  J("medico", "médico", "médica", "doctor", ["doctor", "doctora"]),
  J("dentista", "dentista", "dentista", "dentist", []),
  J("arquitecto", "arquitecto", "arquitecta", "architect", []),
  J("guia", "guía | de | turistas", "guía | de | turistas", "guide | of | tourists", ["guia", "guia turistico", "guia turistica", "guia de turismo"], "tour guide"),
  J("instructor_buceo", "instructor | de | buceo", "instructora | de | buceo", "instructor | of | diving", ["instructor de buzos", "buzo", "instructor de snorkel"], "diving instructor"),
  J("fotografo", "fotógrafo", "fotógrafa", "photographer", []),
  J("periodista", "periodista", "periodista", "journalist", ["reportero", "reportera"]),
  J("electricista", "electricista", "electricista", "electrician", []),
  J("plomero", "plomero", "plomera", "plumber", ["fontanero", "fontanera"]),
  J("carpintero", "carpintero", "carpintera", "carpenter", []),
  J("albanil", "albañil", "albañil", "bricklayer", ["obrero", "obrera", "trabajador de la construccion", "trabajadora de la construccion"]),
  J("panadero", "panadero", "panadera", "baker", ["pastelero", "pastelera"]),
  J("estilista", "estilista", "estilista", "hairdresser", ["peluquero", "peluquera"]),
  J("farmaceutico", "farmacéutico", "farmacéutica", "pharmacist", ["quimico farmaceutico"]),
  J("policia", "policía", "policía", "police officer", ["oficial de policia"]),
  J("analista", "analista", "analista", "analyst", ["analista de datos", "analista financiero", "analista financiera"]),
  J("economista", "economista", "economista", "economist", []),
  J("psicologo", "psicólogo", "psicóloga", "psychologist", []),
  J("administrador", "administrador", "administradora", "administrator", ["administrador de empresas", "administradora de empresas"]),
  J("estudiante", "estudiante", "estudiante", "student", ["universitario", "universitaria"]),
];

/** Fields of work ("Trabajo en ventas"): Spanish units, English gloss units, gender, synonyms, natural English. */
const FL = (id: string, es: string, en: string, g: "m" | "f", forms: string[] = [], nat?: string) => ent(id, es, en, g, { art: "", forms, attrs: nat ? { nat } : {} });
const FIELDS: EntityDef[] = [
  FL("ventas", "ventas", "sales", "f", ["venta", "el area comercial", "area comercial", "comercio"]),
  FL("mercadotecnia", "mercadotecnia", "marketing", "f", ["marketing", "publicidad", "mercadeo", "el marketing", "la mercadotecnia", "redes sociales"]),
  FL("contabilidad", "contabilidad", "accounting", "f", ["la contabilidad", "contaduria"]),
  FL("finanzas", "finanzas", "finance", "f", ["las finanzas", "banca", "la banca", "un banco", "bancos", "economia"]),
  FL("turismo", "turismo", "tourism", "m", ["el turismo", "viajes", "una agencia de viajes", "agencia de viajes"]),
  FL("hoteleria", "hotelería", "hospitality", "f", ["la hoteleria", "la industria hotelera", "industria hotelera", "la industria restaurantera", "hoteles", "un hotel", "restaurantes", "un restaurante", "hospitalidad", "gastronomia"]),
  FL("salud", "salud", "healthcare", "f", ["la salud", "medicina", "un hospital", "una clinica", "hospitales", "enfermeria", "el sector salud"]),
  FL("educacion", "educación", "education", "f", ["la educacion", "ensenanza", "la ensenanza", "una escuela", "escuelas", "docencia", "la docencia", "una universidad"]),
  FL("informatica", "informática", "IT", "f", ["sistemas", "tecnologia", "la tecnologia", "tecnologias de la informacion", "software", "computacion", "la informatica"]),
  FL("atencion", "atención | a | clientes", "service | to | customers", "f",
    ["atencion al cliente", "servicio al cliente", "un call center", "call center", "la atencion a clientes"], "customer service"),
  FL("rh", "recursos | humanos", "resources | human", "m", ["rh", "rrhh", "reclutamiento"], "human resources"),
  FL("logistica", "logística", "logistics", "f", ["la logistica", "transporte", "un almacen", "almacen", "importaciones", "exportaciones"]),
  FL("construccion", "construcción", "construction", "f", ["la construccion", "obras"]),
  FL("diseno", "diseño", "design", "m", ["el diseno", "diseno grafico", "diseno web"]),
  FL("administracion", "administración", "administration", "f", ["la administracion", "administracion de empresas", "oficina", "una oficina", "trabajo de oficina"]),
  FL("comunicacion", "comunicación", "communications", "f", ["comunicaciones", "periodismo", "medios", "los medios"]),
  FL("derecho", "derecho", "law", "m", ["el derecho", "leyes", "un despacho de abogados", "un despacho"]),
  FL("ingenieria", "ingeniería", "engineering", "f", ["la ingenieria"]),
  FL("seguros", "seguros", "insurance", "m", ["una aseguradora", "los seguros"]),
  FL("gobierno", "gobierno", "government", "m", ["el gobierno", "el sector publico", "sector publico"]),
];

/** Strengths: adjectives that agree with the learner ("Soy organizada"), with the nouns learners use for them. */
const SA = (id: string, m: string, f: string, en: string, forms: string[] = []) =>
  ent(id, m, en, "m", { enF: f, gF: "f", art: "", forms: [...new Set([fold(f), ...forms])] });
const STRENGTHS: EntityDef[] = [
  SA("organized", "organizado", "organizada", "organized", ["ordenado", "ordenada", "organizacion", "la organizacion", "el orden"]),
  SA("hardworking", "trabajador", "trabajadora", "hardworking", ["chambeador", "chambeadora", "dedicado", "dedicada", "esforzado", "esforzada", "trabajo duro", "muy trabajador", "muy trabajadora"]),
  SA("responsible", "responsable", "responsable", "responsible", ["responsabilidad", "la responsabilidad"]),
  SA("punctual", "puntual", "puntual", "punctual", ["puntualidad", "la puntualidad"]),
  SA("patient", "paciente", "paciente", "patient", ["paciencia", "la paciencia"]),
  SA("flexible", "flexible", "flexible", "flexible", ["flexibilidad", "la flexibilidad", "adaptable"]),
  SA("creative", "creativo", "creativa", "creative", ["creatividad", "la creatividad"]),
  SA("friendly", "amable", "amable", "friendly", ["sociable", "simpatico", "simpatica", "amigable", "buena onda", "la amabilidad", "amabilidad"]),
  SA("honest", "honesto", "honesta", "honest", ["honestidad", "la honestidad", "honrado", "honrada", "sincero", "sincera", "la sinceridad"]),
  SA("reliable", "confiable", "confiable", "reliable", ["cumplido", "cumplida", "de confianza"]),
  SA("proactive", "proactivo", "proactiva", "proactive", ["iniciativa", "la iniciativa", "con iniciativa"]),
  SA("positive", "positivo", "positiva", "positive", ["optimista", "actitud positiva", "una actitud positiva"]),
  SA("calm", "tranquilo", "tranquila", "calm", ["calmado", "calmada", "tranquilidad", "la calma"]),
  SA("detail_oriented", "detallista", "detallista", "detail-oriented", ["cuidadoso", "cuidadosa", "meticuloso", "meticulosa"]),
  SA("committed", "comprometido", "comprometida", "committed", ["compromiso", "el compromiso"]),
  SA("motivated", "motivado", "motivada", "motivated", ["entusiasta", "motivacion", "la motivacion", "el entusiasmo"]),
  SA("independent", "independiente", "independiente", "independent", ["autonomo", "autonoma"]),
  SA("efficient", "eficiente", "eficiente", "efficient", ["productivo", "productiva", "eficiencia", "la eficiencia"]),
  SA("curious", "curioso", "curiosa", "curious", ["curiosidad"]),
  SA("loyal", "leal", "leal", "loyal", ["lealtad", "la lealtad"]),
  SA("helpful", "servicial", "servicial", "helpful", ["atento", "atenta"]),
  SA("persistent", "perseverante", "perseverante", "persistent", ["constante", "perseverancia"]),
  SA("respectful", "respetuoso", "respetuosa", "respectful", ["respeto", "el respeto"]),
  SA("disciplined", "disciplinado", "disciplinada", "disciplined", ["disciplina", "la disciplina"]),
];

const LANGUAGES: EntityDef[] = ([
  ["ingles", "inglés", "English", []], ["espanol", "español", "Spanish", ["castellano"]], ["frances", "francés", "French", []],
  ["aleman", "alemán", "German", []], ["italiano", "italiano", "Italian", []], ["portugues", "portugués", "Portuguese", []],
  ["chino", "chino", "Chinese", ["mandarin"]], ["japones", "japonés", "Japanese", []], ["coreano", "coreano", "Korean", []],
  ["ruso", "ruso", "Russian", []], ["arabe", "árabe", "Arabic", []], ["holandes", "holandés", "Dutch", []],
] as [string, string, string, string[]][]).map(([id, es, en, forms]) => ent(id, es, en, "m", { art: "", forms }));

// ---------------------------------------------------------------------------
// Grammar lexicons (never echoed)

const COUNTRIES = [
  { id: "us", forms: ["estados unidos", "eu", "eeuu", "eua", "usa", "estadounidense", "americano", "americana", "norteamericano", "norteamericana", "texas", "california", "nueva york", "chicago"] },
  { id: "canada", forms: ["canada", "canadiense", "toronto", "vancouver", "montreal"] },
  { id: "uk", forms: ["inglaterra", "ingles", "inglesa", "reino unido", "londres", "escocia", "escoces", "escocesa", "gales", "britanico", "britanica"] },
  { id: "ireland", forms: ["irlanda", "irlandes", "irlandesa", "dublin"] },
  { id: "australia", forms: ["australia", "australiano", "australiana", "sidney"] },
  { id: "nz", forms: ["nueva zelanda", "neozelandes", "neozelandesa"] },
  { id: "mexico", forms: ["mexico", "mexicano", "mexicana", "aqui"] },
  { id: "other", forms: ["alemania", "aleman", "alemana", "francia", "frances", "francesa", "espana", "espanol", "espanola", "italia", "italiano", "italiana", "holanda", "polonia", "india", "sudafrica", "jamaica"] },
];

/** What the learner does ("Doy clases de inglés", "Manejo un taxi") → the job. */
const DUTIES = [
  { id: "maestro_ingles", forms: ["doy clases de ingles", "daba clases de ingles", "enseno ingles", "ensenaba ingles", "dar clases de ingles", "ensenar ingles"] },
  { id: "maestro", forms: ["doy clases", "daba clases", "doy clases a ninos", "doy clases de matematicas", "enseno en una escuela", "trabajo con ninos en una escuela", "dar clases", "ensenar"] },
  { id: "chofer", forms: ["manejo un taxi", "manejo un camion", "manejo un trailer", "manejo una camioneta", "manejaba un taxi", "manejaba un camion", "hago entregas", "reparto paquetes", "manejo para uber", "manejar un taxi"] },
  { id: "mecanico", forms: ["reparo carros", "arreglo carros", "reparaba carros", "arreglaba carros", "arreglo motores", "reparar carros", "arreglar carros"] },
  { id: "cocinero", forms: ["cocino", "cocino en un restaurante", "cocinaba", "cocinaba en un restaurante", "cocinar"] },
  { id: "vendedor", forms: ["vendo ropa", "vendo carros", "vendo casas", "vendo productos", "vendo seguros", "vendia ropa", "vendia carros", "vendo", "vender"] },
  { id: "albanil", forms: ["construyo casas", "construia casas", "construir casas"] },
  { id: "estilista", forms: ["corto el pelo", "corto el cabello", "cortaba el pelo", "cortar el pelo"] },
  { id: "programador", forms: ["programo", "hago paginas web", "hago apps", "hago aplicaciones", "desarrollo software", "desarrollo aplicaciones", "programar", "escribo codigo", "hacer paginas web"] },
  { id: "disenador", forms: ["diseno paginas web", "diseno logos", "diseno ropa", "hago disenos", "disenar paginas web"] },
  { id: "traductor", forms: ["traduzco", "traduzco documentos", "traduzco textos", "traducia", "traducir", "traducir documentos"] },
  { id: "enfermero", forms: ["cuido pacientes", "cuido a pacientes", "cuido enfermos", "atiendo pacientes", "atiendo a pacientes", "cuidaba pacientes", "cuidar pacientes"] },
  { id: "contador", forms: ["llevo la contabilidad", "hago la contabilidad", "hago impuestos", "hago declaraciones de impuestos", "llevaba la contabilidad", "llevar la contabilidad"] },
  { id: "guia", forms: ["doy tours", "daba tours", "guio turistas", "llevo turistas", "llevo a turistas", "dar tours"] },
  { id: "instructor_buceo", forms: ["doy clases de buceo", "enseno buceo", "dar clases de buceo"] },
  { id: "fotografo", forms: ["tomo fotos", "hago fotos", "tomaba fotos", "tomar fotos"] },
  { id: "periodista", forms: ["escribo articulos", "escribo para un periodico", "escribo noticias", "escribir articulos"] },
  { id: "panadero", forms: ["hago pan", "horneo pan", "hago pasteles", "hacer pan"] },
  { id: "mesero", forms: ["sirvo mesas", "atiendo mesas", "atender mesas"] },
  { id: "recepcionista", forms: ["contesto el telefono", "atiendo la recepcion", "trabajo en la recepcion"] },
  { id: "gerente", forms: ["dirijo un equipo", "coordino un equipo", "superviso un equipo", "superviso a un equipo", "dirigia un equipo", "coordinaba un equipo", "dirigir un equipo"] },
];

// ---------------------------------------------------------------------------
// Value slots

const THIS_YEAR = 2026;
const UNIT_YEARS: Record<string, number> = { ano: 1, anos: 1, anito: 1, anitos: 1, mes: 1 / 12, meses: 1 / 12, semana: 1 / 52, semanas: 1 / 52 };
const APPROX1 = new Set(["como", "unos", "unas", "casi", "aproximadamente", "apenas", "solo", "nomas", "ya", "exactamente"]);
const APPROX2 = new Set(["mas de", "menos de", "alrededor de", "cerca de", "un poco mas", "poco mas", "mas o", "un poquito"]);
/** Time in years: "diez años", "como diez años", "un año y medio", "año y medio", "seis meses", "un par de años",
 *  "varios años", "muchos años" (#many). */
const durSlot: SlotFn = (toks, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  const two = `${toks[i]} ${toks[i + 1]}`;
  if (two === "mas o" && toks[i + 2] === "menos") i += 3;
  else if (APPROX2.has(two)) i += toks[i + 2] === "de" ? 3 : 2;
  else if (APPROX1.has(toks[i] ?? "")) i += 1;
  const qs: { end: number; v: number; tag?: string }[] = [];
  const t0 = toks[i];
  if (t0 === "un" || t0 === "una") {
    if (toks[i + 1] === "par" && toks[i + 2] === "de") qs.push({ end: i + 3, v: 2 });
    else qs.push({ end: i + 1, v: 1 });
  }
  if (t0 === "medio") qs.push({ end: i + 1, v: 0.5 });
  if (t0 === "varios" || t0 === "algunos" || (t0 === "unos" && (toks[i + 1] === "cuantos" || toks[i + 1] === "pocos"))) qs.push({ end: t0 === "unos" ? i + 2 : i + 1, v: 3 });
  if (t0 === "muchos" || t0 === "muchisimos" || t0 === "bastantes") qs.push({ end: i + 1, v: 10, tag: "many" });
  if (t0 && UNIT_YEARS[t0]) qs.push({ end: i, v: 1 });
  for (const r of readInt(toks, i)) if (r.value > 0 && r.value < 80) qs.push({ end: r.end, v: r.value });
  for (const q of qs) {
    const mult = UNIT_YEARS[toks[q.end] ?? ""];
    if (!mult) continue;
    const v = q.v * mult;
    out.push({ end: q.end + 1, value: v, tags: q.tag ? [q.tag] : [] });
    if (toks[q.end + 1] === "y" && (toks[q.end + 2] === "medio" || toks[q.end + 2] === "media")) out.push({ end: q.end + 3, value: v + 0.5 * mult });
  }
  return out;
};

/** A monthly salary in pesos: "dieciocho mil", "18 mil", "$18,000", "20000" (never a bare small number: "Cinco" at the
 *  years question is no salary). Cents, as {price}. */
const salarySlot: SlotFn = (toks, pos, prefix) => priceSlot(toks, pos, prefix).filter((r) => typeof r.value === "number" && r.value >= 300000 && r.value <= 20000000);

/** A short free-form story (the teamwork example): 3–16 words without a negation. Costly, only where it is asked for. */
const NEG = new Set(["no", "nunca", "jamas", "nada", "ningun", "ninguno", "ninguna", "ni", "nadie", "tampoco", "sin"]);
const storySlot: SlotFn = (toks, pos) => {
  const out: SlotResult[] = [];
  for (let len = 3; len <= 16 && pos + len <= toks.length; len++) {
    if (toks.slice(pos, pos + len).some((w) => NEG.has(w))) break;
    out.push({ end: pos + len, value: toks.slice(pos, pos + len).join(" "), cost: 3 + 0.1 * len });
  }
  return out;
};

// ---------------------------------------------------------------------------
// State helpers

interface Me { job?: string; field?: string; years?: number; noExp?: boolean; grad?: boolean; between?: boolean; own?: boolean; student?: boolean; from?: string }
const me = (c: Ctx) => c.s.me as Me;
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const heard = (c: Ctx) => fold(c.heard);

/** Per-turn scratch: one answer may arrive as several segments. */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
/** Say one short reaction per turn. */
function ackOnce(c: Ctx, line: string, vars?: Record<string, any>) {
  const d = turn(c);
  if (d.acked) return;
  d.acked = true;
  d.aboutAck = null;
  c.say(line, vars);
}

const aboutKnown = (c: Ctx) => !!(me(c).job || me(c).field || me(c).own || me(c).student);
const aboutDone = (c: Ctx) => {
  const m = me(c);
  if (c.s.aboutAsks >= 5 || (c.s.aboutStall >= 2 && c.s.aboutInfo === c.s.aboutInfoAtAsk)) return true;
  if (aboutKnown(c)) return m.years != null || !!m.noExp || !!m.student;
  // no experience yet: a new graduate is asked what they studied, the others are not pressed
  return !!m.noExp && (!m.grad || !!c.s.studiedAsked);
};
const qOn = (id: string) => (c: Ctx) => c.s.qs.includes(id) && !!c.s.named;
const done = (id: string) => (c: Ctx) => !!c.s.done[id] || asked(c, id) >= 3;
/** How many times a question was asked (every question gives up after a few tries). */
const asked = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string) { c.s.asks = c.s.asks || {}; c.s.asks[id] = asked(c, id) + 1; }

// Suggestions

const S_ARRIVE: Suggestion = { lt: "Say you're here for an interview (and give your name)", hint: "arrive" };
const S_NAME: Suggestion = { lt: "Say your full name", hint: "name" };
const S_YEARS: Suggestion = { lt: "Say how many years you've worked", hint: "years" };
const S_STUDIED: Suggestion = { lt: "Say what you studied", hint: "studied" };
const S_FIELD: Suggestion = { lt: "Say what field you work in (and for how long)", hint: "about_field", options: "field" };
const S_ABOUT_MORE: Suggestion = { lt: "Tell her more about yourself", hint: "about_more" };
const S_JOB: Suggestion = { lt: "Say what you do (and for how long)", hint: "about_job", options: "job" };
const S_STRENGTH: Suggestion = { lt: "Name your strengths", hint: "strengths", options: "strength" };
const S_STRENGTH_MORE: Suggestion = { lt: "Say what you do well", hint: "strengths_more" };
const S_SIDE: Suggestion = { lt: "Say you're nervous, or ask her to repeat", hint: "side" };
const S_ASK: Suggestion = { lt: "Ask about the job: hours, training, start date", hint: "ask_them" };
const S_NO_Q: Suggestion = { lt: "Say you have no more questions", hint: "no_q" };
const Q_INTENTS = ["q_hours", "q_training", "q_start", "q_team", "q_remote", "q_benefits", "q_day", "q_next", "q_dress", "q_parking", "q_like",
  "salary_range_q", "no_questions", "no_questions_ctx", "can_ask", "q_other_ctx"];
/** Model questions in sets of three (hint group, the answer keys it covers, the suggestion). */
const Q_SETS: [string, string[], string][] = [
  ["ask_them", ["hours", "training", "start"], "Ask about the job: hours, training, start date"],
  ["ask_them2", ["team", "remote", "benefits"], "Ask about the team, home office, benefits"],
  ["ask_them3", ["day", "next", "dress"], "Ask about a typical day and the next steps"],
];

const ABOUT_INTENTS = ["job_is", "job_ctx", "job_does", "field_is", "field_ctx", "experience", "years_ctx", "no_exp", "no_exp_ctx", "between_jobs",
  "own_business", "from", "moved", "family", "age", "about_name_ctx", "about_end", "what_know", "intro_name"];
const STRENGTH_INTENTS = ["strength", "strength_ctx", "not_strength", "hire_ans"];

/** The interview time she has written down (9:30 a.m.). */
const T930 = { h: 9, m: 30 };

/** Answers the simulations give to her optional questions (the core questions are scripted). */
const AUTO: Record<string, string> = {
  found: "Sí, fue muy fácil.", drink: "No, gracias, estoy bien.", leaving: "Me mudé aquí con mi familia.",
  weakness: "A veces trabajo demasiado.", improve: "Estoy aprendiendo a decir que no.", future: "Me gustaría dirigir un equipo.",
  teamwork: "En mi último trabajo terminamos un proyecto grande a tiempo.", languages: "Hablo inglés, francés y un poco de español.",
  authorized: "Sí, soy residente permanente.", salary: "Alrededor de dieciocho mil pesos al mes.", range: "Sí, me parece bien.",
  start: "Puedo empezar el próximo lunes.", hire: "Tengo la experiencia que buscan y aprendo rápido.", phone: "Claro, no hay problema.",
  offer: "¡Muchas gracias! ¡Acepto!", closing: "¡Muchas gracias por su tiempo!",
};

// ---------------------------------------------------------------------------

export const interview: SituationDef = {
  id: "s87-interview",
  song: 87,
  songTitle: "Why Should We Hire You?",
  title: { en: "¿Por qué deberíamos contratarlo?", lt: "Why should we hire you?" },
  topic: { en: "Una entrevista de trabajo", lt: "A job interview" },
  chapter: 4,
  order: 1,
  location: "office",
  npc: "brooks",
  goal: "Get through a job interview in Spanish: talk about your work, your strengths and why you want the job, and ask your own questions.",
  intro: "Línea Clara's office, 9:30 a.m. Licenciada Salinas, the HR manager, is expecting you for a job interview. Tell her about yourself and your experience, say why you want to work here, and don't forget to ask about the job. Salaries are in pesos a month.",
  entities: { job: JOBS, field: FIELDS, strength: STRENGTHS, language: LANGUAGES },

  mission: [
    { lt: "Introduce yourself", done: (c) => !!c.s.arrived && (!!c.s.named || c.s.nameAsked >= 3) },
    { step: "about", lt: "Talk about your work" },
    { step: "why", lt: "Say why you want to work here" },
    { step: "strengths", lt: "Name your strengths" },
    { lt: "Answer her other questions", optional: true, when: (c) => (c.s.qs || []).length > 0, done: (c) => extrasDone(c) },
    { step: "questions", lt: "Ask about the job" },
  ],

  grammar: {
    macros: {
      lic: "(licenciada salinas | la licenciada salinas | la licenciada | licenciada | la senora salinas | senora salinas | la senorita salinas | la gerente de recursos humanos | alguien de recursos humanos | recursos humanos)",
      entrev: "(entrevista [de trabajo] | cita)",
      at_time: "(a | de | para) {time}",
      very: "[muy | bastante | super | sumamente | realmente | siempre]",
      exp_tail: [
        "[con] {dur} de experiencia", "(desde hace | hace) {dur}", "desde [el] {year}", "con (mucha | bastante | harta) experiencia #many",
        "(ya | ahora) (tengo | llevo) {dur}", "(por | durante) {dur}", "{dur} (ya | ahora)",
      ],
      workplace_noun: "[un | una | el | la | mi] [pequeno | pequena | gran] (hospital | clinica | escuela | colegio | universidad | banco | hotel | restaurante | cafe | fabrica | empresa | compania | tienda | supermercado | almacen | oficina | despacho | call center | farmacia | aeropuerto | agencia [de viajes])",
      co: "(su empresa | la empresa | esta empresa | linea clara | ustedes | su compania | la compania | este lugar)",
      bc: "[porque | creo que | pienso que | porque creo que | la verdad]",
      money: "[unos | unas | alrededor de | como | mas o menos | aproximadamente | por lo menos | al menos | minimo] {sal} [pesos] [al mes | mensuales | mensual | por mes | a la quincena] [netos | brutos | libres | mas prestaciones]",
      sal_pre: "[(busco | espero | estoy buscando | pienso en | quisiera | me gustaria | aspiro a | pretendo | quiero | necesito) [ganar] | mis (pretensiones | expectativas) (son | serian) [de] | mi expectativa es [de] | creo que]",
      wk_pre: "[mi (mayor | principal | unica | peor) (debilidad | defecto) (es | seria) [que] | mi [principal | mayor] area de oportunidad (es | seria) [que] | (creo | diria | pienso) que | la verdad [es que] | (siendo | para ser) (honesto | honesta | sincero | sincera)]",
      hobby: "(leer | nadar | bucear | cocinar | correr | viajar | la musica | el deporte | el futbol | caminar | pintar | la fotografia | el yoga | bailar | la playa | el surf | hacer ejercicio)",
      lang_spoken: "(hablo | se | domino | tambien hablo | ademas hablo | hablo un poco de | se un poco de)",
      soon: "(de inmediato | inmediatamente | ya | ya mismo | ahora mismo | manana mismo | hoy mismo | desde hoy | desde manana | cuando ustedes quieran | cuando usted quiera | lo antes posible | cuanto antes | manana | hoy | desde ya | luego luego)",
      later: "(la proxima semana | la semana que entra | la semana que viene | el proximo mes | el mes que entra | el mes que viene | en (una | dos | tres) semanas | en quince dias | en un mes | en {number} (dias | semanas) | el primero [del proximo mes | del mes que entra | de mes] | a principios del (proximo mes | mes que entra) | el {date} | a partir del {day} | a partir del {date})",
    },
    slots: {
      dur: { fn: durSlot },
      sal: { fn: salarySlot },
      story: { fn: storySlot },
      duty: { lexicon: DUTIES },
      country: { lexicon: COUNTRIES },
    },
  },

  intents: {
    // --- arriving -------------------------------------------------------------------------------
    arrive: { patterns: [
      "(tengo | traigo) [una | la | mi] @entrev [hoy] [@at_time] [con @lic] [@at_time] #h:have_interview",
      "(vengo | vine | estoy aqui) (a | para | por) [una | la | mi] @entrev [@at_time] [con @lic] [@at_time] #h:here_for",
      "(vengo | vine) a (ver | buscar) a @lic [@at_time] #lic #h:here_see",
      "(busco | estoy buscando) a @lic #lic", "(tengo | traigo) (una cita | cita | una reunion | una junta) con @lic [@at_time] #lic",
      "[vengo | vine] (por | para) (la vacante | el puesto | lo del puesto | lo de la vacante | lo del trabajo | el trabajo | el empleo) [de {job}]",
      "[vengo | vine] (por | para) (el anuncio | lo del anuncio | la oferta de trabajo)",
      "(soy | vengo como) [el | la] (candidato | candidata) [para el puesto | para la vacante | de la entrevista | a la entrevista]",
      "me (citaron | invitaron | llamaron) (a | para) [una] entrevista [hoy] [@at_time]", "me (dijeron | pidieron) que viniera [hoy] [@at_time]",
      "(es usted | usted es) @lic #lic", "(eres tu | tu eres) @lic #lic #tip:tu_staff", "(esta | se encuentra) @lic #lic",
      "mi (entrevista | cita) es (@at_time | hoy | ahorita | con @lic)",
      "(llegué | vine | vengo) [un poco | unos minutos | muy] temprano [para la entrevista] #early", "(estoy | ando) [un poco | algo] temprano #early",
      "donde es la entrevista", "(aqui es | es aqui) la entrevista",
      "[vengo] a la entrevista (para el puesto de {job} | de {job} | para {job})",
      "[si] (a | para) [la | una] entrevista [de trabajo] [@at_time]", "[si] soy yo", "(quiero | quisiera | necesito) (hablar con | ver a) @lic #lic",
      "(llegué | vengo | voy) [un poco | unos minutos] tarde [perdon | disculpe] #early",
    ] },
    intro_name: { patterns: [
      "[mucho gusto | encantado | encantada] me llamo {name} #h:my_name", "[mucho gusto | encantado | encantada] mi nombre es {name} #h:my_name_is",
      "me llamo {name} y (tengo una entrevista | vengo a la entrevista | vengo a una entrevista | vengo por la vacante) #arrive",
      "(me llamo | mi nombre es) {name} (mucho gusto | encantado | encantada)",
      "me llamo {name} y mi apellido es {surname:name}", "mi (apellido | primer apellido) es {name}", "mi nombre completo es {name}",
    ] },
    intro_ctx: { patterns: ["[yo] soy {name} #h:intro_full", "{name}", "es {name}", "a nombre de {name}", "(mucho gusto | encantado | encantada) [soy] {name}", "{name} (mucho gusto | encantado | encantada)"] },

    // --- small talk -----------------------------------------------------------------------------
    found_ok: { patterns: [
      "[si] (fue | estuvo) [muy | bien | super] (facil | sencillo) [llegar | encontrarlos | encontrar la oficina] #h:found_easy",
      "[si] (sin | sin ningun) problema #h:found_no_problem", "[si] llegué (bien | sin problema | rapido | rapidito | facil)",
      "[si] los encontré [muy] (facil | rapido | bien | sin problema)",
      "[si] (use | con) (el gps | google maps | waze | el mapa | mi celular)", "[si] (tomé | agarré) un (taxi | uber | colectivo | camion)",
      "[si] (vine | llegué) (caminando | en taxi | en carro | en camion | en colectivo | en bici | en uber)", "[si] (esta | queda) (cerca | muy cerca) de mi casa",
      "[si] no (tuve | hubo) (problema | ningun problema)", "[si] [la] (oficina | direccion) es (facil | muy facil) de encontrar",
    ] },
    found_hard: { patterns: [
      "[no | la verdad] me perdí [un poco | un poquito] [pero ya (estoy | llegué) aqui] #h:found_lost", "[no] (fue | estuvo) [un poco | algo | muy | bastante] (dificil | complicado) [llegar | encontrarlos]",
      "[no] no (encontraba | encontré) (la oficina | el edificio | la entrada | la direccion) [al principio]", "[no] (habia | hubo) mucho trafico #h:found_traffic",
      "[no] me costó [un poco de | algo de] trabajo [encontrarlos | llegar]", "[no] no (fue | estuvo) [tan | muy] facil",
    ] },
    // bare "Todo bien" / "Más o menos" answer "¿Nos encontró bien?" only (elsewhere they mean other things)
    found_ctx: { patterns: ["[si] (todo bien | muy bien gracias | bien gracias | muy bien) #ok", "[no] (no muy | mas o menos)", "[no] [un poco | algo | muy] (dificil | complicado)"] },
    want_drink: { patterns: [
      "[si] (un vaso de | un vasito de | una botella de) agua [esta bien | estaria bien] #h:water", "[si] agua [esta bien | estaria bien | nada mas | nomas]",
      "[si] (solo | nomas) agua", "[si] (un cafe | cafe | un cafecito) #coffee [estaria bien | seria genial | esta bien] [con leche | negro | americano | con azucar | sin azucar] #h:coffee",
      "[si] (me da | me puede dar | me regala | me podria dar | ponme | me pone) (un vaso de agua | un vasito de agua | agua | un cafe #coffee | cafe #coffee | un cafecito #coffee)",
      "(quiero | quisiera | me gustaria | me encantaria | me tomo) (agua | un vaso de agua | un cafe #coffee | cafe #coffee | un cafecito #coffee)",
    ] },
    no_drink: { patterns: [
      "[no] (asi | por ahora) estoy bien #h:no_fine", "[no] nada (para mi | por ahora | gracias)", "no (quiero | necesito) nada [por ahora | por el momento]",
      "[no] no (quiero | tomo) (cafe | agua) [ahorita | por ahora]", "[no] (sin | nada de) (cafe | agua)",
    ] },

    // --- about you ------------------------------------------------------------------------------
    job_is: { patterns: [
      "soy {job} [@exp_tail] #h:job_im", "(trabajo | he trabajado | estoy trabajando) (como | de) {job} [@exp_tail] #h:job_work_as",
      "(tengo | llevo) {dur} (trabajando | de) [como | de] {job} #h:job_been", "(tengo | llevo) {dur} de {job}", "(soy | he sido) {job} (desde hace {dur} | desde [el] {year})",
      "(antes | en mi pais | en canada | en estados unidos | en inglaterra) (era | fui | trabajaba como | trabajaba de | trabajé como | trabajé de) {job} [@exp_tail] #h:job_was",
      "(era | fui | trabajaba como | trabajaba de | trabajé como | trabajé de | estuve trabajando como) {job} [antes | en mi pais] [@exp_tail]",
      "mi (trabajo | profesion | puesto) (es | era) [de] {job}", "de profesion soy {job}", "soy {job} de profesion",
      "(actualmente | ahorita | ahora | ahora mismo | hoy en dia) (soy | trabajo como | trabajo de) {job} [@exp_tail]",
      "(soy | trabajo como | trabajo de | trabajaba como | trabajé como) {job} (en | para) @workplace_noun [@exp_tail]",
      "soy {job} y (tengo | llevo) {dur} (de experiencia | trabajando | en esto)",
      "(trabajé | trabajo | he trabajado | estuve) {dur} (como | de) {job}", "(soy | era | fui | trabajaba como | trabajé como) {job} (de | en) @workplace_noun",
      "soy {job} y trabajo (desde casa | en casa | por mi cuenta | de forma remota | en linea)",
      // "No soy enfermero, soy maestro": the second job is the answer
      "no soy {neg:job} [sino] [que] [soy] {job} [@exp_tail]", "ya no soy {neg:job} (ahora | ahorita) soy {job} [@exp_tail]",
    ] },
    job_ctx: { patterns: ["[un | una] {job} [@exp_tail]", "todavia soy {job}", "(de | como) {job} [@exp_tail]"] },
    job_does: { patterns: [
      "[y] [tambien | normalmente | ahora | todavia | antes] {duty} [todos los dias | en @workplace_noun | en mi pais] [@exp_tail]",
      "(mi trabajo es | me dedico a) {duty}", "(tengo | llevo) {dur} (dando clases | ensenando) [de ingles #ingles]",
    ] },
    field_is: { patterns: [
      "trabajo en {field} [@exp_tail] #h:f_work_in", "(he trabajado | trabajé | estuve trabajando | trabajaba | estoy trabajando) en {field} [@exp_tail]",
      "(tengo | llevo) {dur} (en | trabajando en) {field} #h:f_years", "mi experiencia es en {field} #h:f_background", "(tengo experiencia | toda mi experiencia es) en {field}",
      "(estudié | soy licenciado en | soy licenciada en | tengo una licenciatura en | me gradué de | me gradué en | tengo un titulo en) {field}",
      "mi (area | campo) es {field}", "me dedico a {field} #h:f_dedico", "(estoy | trabajo | trabajaba) en el (area | sector | ramo) de {field} [@exp_tail]",
      "(trabajo | trabajaba | trabajé) en {field} en (mi pais | canada | estados unidos | inglaterra) [@exp_tail]",
    ] },
    field_ctx: { patterns: ["[en] {field} [@exp_tail]", "(mas que nada | sobre todo | principalmente) en {field}"] },
    experience: { patterns: [
      "tengo {dur} de experiencia [en {field} | como {job} | en (esto | este campo | el area | este trabajo | el ramo)] #h:f_exp",
      "llevo {dur} (trabajando | en esto | en este campo | en el area | en el ramo)", "tengo {dur} trabajando [en esto]",
      "(he trabajado | trabajo) (desde hace | hace) {dur}", "tengo (mucha | bastante | harta) experiencia [en {field} | como {job}] #many",
      "tengo (algo de | un poco de) experiencia [en {field} | como {job}] #some", "{dur} de experiencia [en {field} | como {job}]",
      "(trabajé | he trabajado | estuve trabajando | estuve) {dur} en (@workplace_noun | {field})", "(trabajé | he trabajado | estuve) en (@workplace_noun | {field}) (por | durante) {dur}",
    ] },
    years_ctx: { patterns: [
      "[ya] {dur} [ya | mas o menos | mas o menos ya | mas o menos en total | en total]", "desde [el] {year}", "(desde hace | hace) {dur}",
      "(mucho tiempo | muchos anos | bastante tiempo) #many", "(poco tiempo | poquito | no mucho) #few",
      "[como | unos | casi | ya] {number} [mas o menos | ya]",
      // "No son diez años, son cinco": the second figure is the answer
      "no (son | tengo) {neg:dur} [sino] [que] (son | tengo) ({dur} | {number}) [de experiencia]", "no {neg:dur} (sino | son) ({dur} | {number})",
    ] },
    no_exp: { patterns: [
      "no tengo (mucha | nada de | ninguna) experiencia [todavia | aun] [en {field}] #h:no_exp", "(todavia | aun) no tengo [mucha] experiencia [en {field}]",
      "[todavia | aun] no tengo [mucha | nada de | ninguna] experiencia (como | de) {neg:job}",
      "tengo (poca | muy poca) experiencia [en {field}]", "no tengo experiencia [todavia | aun] [en {field}]",
      "(este | este seria | seria | es) mi primer trabajo [aqui | en mexico | formal]",
      "(acabo de | recien) (terminar | salir de) (la universidad | la carrera | la escuela | la prepa) #grad",
      "(terminé | acabé) (la universidad | la carrera | mis estudios | la escuela | la prepa) [el ano pasado | este ano | hace {dur} | en {year}] #grad",
      "(soy | estoy) (recien egresado | recien egresada | recien graduado | recien graduada) #grad", "(soy | estoy) (nuevo | nueva) en (esto | este campo | el area)",
    ] },
    age: { patterns: ["tengo {number} anos [de edad]"] },
    not_job: { patterns: [
      "no soy {job} [ya]", "ya no soy {job}", "no (trabajo | trabajé | he trabajado) (en {field} | como {job} | de {job})", "nunca (he trabajado | trabajé) (en {field} | como {job} | de {job})",
      "no tengo {dur} [de experiencia]", "nunca (he sido | fui) {job}", "[antes] (fui | era) {job} pero ya no",
    ] },
    studied_unknown: { patterns: ["estudié {w:any}", "soy (licenciado | licenciada) en {w:any}"] },
    about_name_ctx: { patterns: ["soy {name}"] },
    no_exp_ctx: { patterns: ["(no mucha | poca | muy poca | casi nada | ninguna) [experiencia] [todavia | aun]"] },
    between_jobs: { patterns: [
      "[ahorita | ahora | en este momento] (estoy | ando) buscando (trabajo | empleo | chamba)", "(ahorita | ahora | en este momento) no (estoy trabajando | trabajo | tengo trabajo)",
      "(estoy | ando) sin (trabajo | empleo | chamba) [ahorita]", "(estoy | ando) (desempleado | desempleada)", "(perdí | dejé) mi (trabajo | empleo) [anterior]",
      "(soy | era | fui) (ama de casa | amo de casa) [{dur}]", "(estuve | estaba) en casa con mis hijos [{dur}]", "(estoy | soy) (jubilado | jubilada | retirado | retirada)",
      "renuncié [a mi trabajo] [para (mudarme | venir) (aqui | a mexico)]", "no (trabajo | he trabajado) desde hace {dur}",
    ] },
    own_business: { patterns: [
      "(tengo | tenia | tuve) (mi propio | un) (negocio | restaurante | cafe | despacho) [propio]", "(tengo | tenia | tuve) (mi propia | una) (empresa | tienda | agencia) [propia]",
      "(soy | era | trabajo como | trabajaba como) (independiente | freelance | emprendedor | emprendedora)", "trabajo por mi cuenta",
    ] },
    from: { patterns: ["soy [originalmente] de {country} #h:from_us", "vengo de {country}", "(naci | nací) en {country}", "soy {country}"] },
    moved: { patterns: [
      "[me] (mudé | vine) (aqui | a puerto colibri | a mexico) [hace {dur} | el ano pasado | el mes pasado | este ano | recientemente] [con mi familia] #h:moved",
      "me mudé hace {dur} [con mi familia]", "(llegué | vine) (aqui | a mexico | a puerto colibri) hace {dur}",
      "(vivo | estoy viviendo) (aqui | en puerto colibri | en mexico) desde hace {dur}", "llevo {dur} (aqui | en mexico | en puerto colibri | viviendo aqui)",
      "nos mudamos (aqui | a mexico | a puerto colibri) [hace {dur} | el ano pasado]", "(acabo de | recien) (llegar | mudarme) [a mexico | aqui | a puerto colibri]",
    ] },
    family: { patterns: [
      "(soy | estoy) (casado | casada) [y tengo {number} (hijos | hijas | ninos)]", "tengo (un hijo | una hija | {number} hijos | {number} hijas | {number} ninos)",
      "(soy | estoy) (soltero | soltera | divorciado | divorciada | viudo | viuda | comprometido | comprometida)", "vivo con mi (familia | esposa | esposo | pareja | novio | novia)",
      "soy (mama | papa | madre | padre) de {number} [hijos]",
    ] },
    free_time_unknown: { patterns: [
      "en mi tiempo libre me (gusta | encanta) {w:any}", "mis pasatiempos son {w:any}",
      "me (gusta | encanta) @hobby [y @hobby]",
    ] },
    about_end: { patterns: ["(eso es | eso seria) todo sobre mi", "eso es (basicamente | mas o menos) todo", "(y ya | eso es todo) eso soy yo"] },
    what_know: { patterns: [
      "que (quiere | le gustaria | necesita) (saber | que le diga | que le cuente)", "(que | por donde) (le digo | le cuento | empiezo)",
      "sobre (mi trabajo | mi experiencia | mi vida)", "que (quieres | te gustaria) saber #tip:tu_staff",
      "no se (que decir | que contarle | por donde empezar | que le digo)",
    ] },

    // --- why a new job ----------------------------------------------------------------------------
    leaving_ans: { patterns: [
      "[porque] (me mudé | nos mudamos) (aqui | a mexico | a puerto colibri) [con mi familia] #h:l_moved",
      "[porque] (busco | estoy buscando | quiero) (un nuevo reto | nuevos retos | algo nuevo | un cambio | mas responsabilidades | nuevas oportunidades | un mejor trabajo | un trabajo estable | mas estabilidad | crecer) #h:l_challenge",
      "[porque] (quiero | me gustaria) (crecer | aprender [cosas nuevas] | cambiar de area | trabajar en {field} | usar mi espanol | practicar mi espanol) [profesionalmente | mas]",
      "[porque] mi (trabajo | empleo) anterior (estaba | quedaba) (muy lejos | lejos) [de mi casa]",
      "[porque] (se terminó | terminó | se acabó) mi (contrato | proyecto)", "[porque] (la empresa | mi empresa | la compania) (cerró | quebró | se fue a otra ciudad)",
      "[porque] (quiero | necesito) ganar mas [dinero] #tip:neg_money", "[porque] (el sueldo | el salario | la paga) era (muy bajo | poco | bajo) #tip:neg_money",
      "[porque] no me gustaba mi (jefe | jefa | trabajo | empresa) #tip:neg_boss", "[porque] me (corrieron | despidieron) #tip:neg_boss", "[porque] tuve problemas con mi (jefe | jefa) #tip:neg_boss",
      "[porque] (ya no habia | no habia) (oportunidades | oportunidad | posibilidad) de crecer", "[porque] (quiero | busco) trabajar (mas cerca de mi casa | cerca de mi casa | en puerto colibri)",
      "[porque] renuncié para (mudarme | venir) (aqui | a mexico)",
      "[porque] (mi esposo | mi esposa | mi pareja | mi novio | mi novia | mi marido) (consiguió | encontró | tiene) (trabajo | un trabajo | chamba) aqui",
      "[porque] (quiero | me gustaria | busco) un (trabajo nuevo | nuevo trabajo | trabajo diferente)", "[porque] mi (contrato | proyecto) (terminó | se terminó | se acabó)",
      "[porque] (queria | quiero | busco | buscaba) algo (diferente | distinto | nuevo)",
    ] },

    // --- why here ---------------------------------------------------------------------------------
    why_ans: { patterns: [
      "@bc me (gusta | encanta | interesa) [mucho] (su empresa | la empresa | lo que hacen | su trabajo | su equipo | linea clara | el puesto) #h:w_like",
      "@bc (he oido | he escuchado | escuché | me han dicho | me dijeron | lei) (cosas muy buenas | muchas cosas buenas | cosas buenas | maravillas | puras cosas buenas) (de | sobre) @co #h:w_heard",
      "@bc @co (es | parece) una (gran | buena | muy buena | excelente) empresa #h:w_company", "@bc (es | parece) un (buen | gran | excelente) lugar para trabajar",
      "[porque] @co tiene (buena | muy buena | excelente) (reputacion | fama) #h:w_reputation",
      "[porque] (quiero | me gustaria) (crecer | aprender | desarrollarme) [profesionalmente | con ustedes | aqui | mucho] [y aprender cosas nuevas] #h:w_grow",
      "[porque] (estoy listo | estoy lista) para un (nuevo reto | reto nuevo) #h:w_challenge",
      "[porque] (quiero | me gustaria) (usar | aplicar | aprovechar) mi experiencia aqui #h:w_use",
      "[porque] me gusta (trabajar con la gente | trabajar con gente | trabajar con personas | ayudar a la gente | atender a los clientes | el trato con la gente) #h:w_people",
      "[porque] (es una buena oportunidad | es una gran oportunidad | es una excelente oportunidad) [para mi]",
      "[porque] (necesito | busco) (trabajo | un trabajo | empleo | chamba) #tip:need_job",
      "[porque] (esta | queda) cerca de mi casa", "[porque] (el puesto | el trabajo) es (perfecto | ideal) para mi",
      "[porque] (quiero | me gustaria) (formar parte | ser parte) de (su | este | el) equipo", "[porque] @co esta creciendo [y quiero ser parte]",
      "[porque] me (gusta | encanta) (puerto colibri | el pueblo | la ciudad | mexico | la zona | vivir aqui) [y quiero (quedarme | vivir) aqui]",
      "@bc @co (es | parece) una empresa (muy buena | excelente | buena | importante | seria | solida | muy seria)",
      "[porque] (quiero | me gustaria | me encantaria) trabajar (aqui | con ustedes | en linea clara | en su empresa)", "[porque] tengo experiencia en (esto | este campo | el area | {field})",
      "[porque] (quiero | me gustaria) (vivir | quedarme) (aqui | en mexico | en puerto colibri) [y trabajar aqui]",
    ] },
    why_neg: { patterns: [
      "no me (gusta | interesa) (su empresa | la empresa | el puesto)", "no (se | conozco) (mucho | nada) (de | sobre) @co",
      "no (he oido | he escuchado | escuché) nada de @co", "no (conozco | conocia) [mucho | bien] @co",
    ] },

    // --- strengths --------------------------------------------------------------------------------
    strength: { patterns: [
      "[porque | pero] soy @very {strength} [y {strength}] [y {strength}] #h:s_very",
      "(yo diria que | diria que | creo que) soy @very {strength} [y {strength}] #h:s_say",
      "(la gente | mis companeros | mis amigos | mi jefe | mi jefa) (dice | dicen) que soy @very {strength} [y {strength}] #h:s_people",
      "mi (mayor | principal | mejor) (fortaleza | virtud | cualidad) es [que soy | ser] [la] {strength} [y {strength}]", "mis fortalezas son [que soy | la | el] {strength} [y [la | el] {strength}]",
      "[porque | pero] aprendo (rapido | muy rapido | rapidamente) #fast_learner #h:learn_fast",
      "[porque] soy (bueno | buena) (con | para) (la gente | las personas | los clientes | los numeros | las computadoras | los ninos | las ventas) #good_with #h:good_people",
      "[porque] (trabajo bien | se trabajar) en equipo #team #h:team_well", "me gusta trabajar en equipo #team",
      "[porque] (nunca llego tarde | siempre llego a tiempo) #punctual #h:never_late",
      "[porque] (mantengo | conservo) la calma [bajo presion | en situaciones dificiles] #calm #h:pressure", "trabajo bien bajo presion #calm",
      "[porque] hablo (dos | tres | cuatro | varios) idiomas #langs #h:langs",
      "no tengo miedo (de preguntar | a preguntar | de aprender | al trabajo | a los retos) #h:not_afraid",
      "[porque] le echo (ganas | muchas ganas) [a todo] #h:s_ganas", "trabajo con (muchas | mucha) ganas",
      "[porque] [siempre] (termino | entrego) (mi trabajo | todo) a tiempo", "me (gusta | encanta) (aprender | resolver problemas | ayudar a la gente)",
      "soy (bueno | buena) para (resolver problemas | organizar | los numeros | vender)", "pongo [mucha] atencion a los detalles", "nunca me rindo",
      "[porque] (soy | me considero) (una persona | alguien) @very {strength} [y {strength}]",
      // "No sé, soy muy responsable": the "no" is the "no sé"'s, never the strength's
      "no (se | lo se) [pero | creo que] soy @very {strength} [y {strength}]",
      "me llevo bien con (todos | todo el mundo | la gente | mis companeros | los clientes) #good_with", "se escuchar", "tengo (mucha | bastante) {strength}",
      "me adapto (rapido | facil | facilmente | bien) [a los cambios]", "tengo (buena | muy buena) (comunicacion | actitud | disposicion)",
    ] },
    strength_ctx: { patterns: ["@very {strength} [y {strength}] [y {strength}]", "[la | el] {strength} [y [la | el] {strength}] [y [la | el] {strength}]", "(creo que | diria que) [la | el] {strength}"] },
    not_strength: { patterns: [
      "[a veces] no soy @very {strength}", "no (trabajo bien | se trabajar) (en equipo | bajo presion)", "no (aprendo | aprendo muy) rapido",
      "no soy (bueno | buena) (con | para) (la gente | los clientes | las personas | los numeros | las computadoras | esto)", "no me gusta (trabajar en equipo | trabajar con gente)",
      "no me llevo bien con (la gente | todos | mis companeros | los clientes)", "(nunca llego | no llego) a tiempo", "no tengo [mucha] {strength}",
    ] },

    // --- weaknesses -------------------------------------------------------------------------------
    weakness: { patterns: [
      "@wk_pre [a veces] trabajo (demasiado | de mas | mucho) [a veces] #h:wk_hard",
      "@wk_pre [a veces] (acepto | tomo | hago) (demasiado | demasiadas cosas | demasiados proyectos) [a la vez] #h:wk_take_on",
      "@wk_pre soy [un poco | muy | demasiado | algo] perfeccionista #h:wk_perfectionist",
      "no se [pero] a veces (soy | me pongo) [un poco | muy | algo | demasiado] (impaciente | nervioso | nerviosa | timido | timida | terco | terca | desorganizado | desorganizada | distraido | distraida | olvidadizo | olvidadiza | exigente | perfeccionista | directo | directa)",
      "@wk_pre [a veces] (soy | me pongo) [un poco | muy | algo | demasiado] (impaciente | nervioso | nerviosa | timido | timida | terco | terca | desorganizado | desorganizada | distraido | distraida | olvidadizo | olvidadiza | exigente | directo | directa) [a veces] #h:wk_impatient",
      "@wk_pre mi espanol (todavia no es | no es | aun no es) [muy | tan] (perfecto | bueno) [todavia] [pero (estoy tomando clases | estoy aprendiendo | estoy mejorando)] #h:wk_spanish",
      "@wk_pre (necesito | quiero) mejorar mi espanol", "@wk_pre no hablo (bien | muy bien | perfecto) [el] espanol [todavia]",
      "@wk_pre [a veces] me cuesta [trabajo] (decir que no | hablar en publico | delegar | pedir ayuda | organizarme) #h:wk_public",
      "@wk_pre (hablar en publico | las presentaciones) (no es facil | no son faciles | es dificil | me cuesta [trabajo]) [para mi]",
      "@wk_pre me (preocupo | estreso) (demasiado | mucho) [por (los detalles | todo)]",
      "@wk_pre [a veces] llego tarde", "@wk_pre hablo (mucho | demasiado)", "@wk_pre no se decir que no", "@wk_pre no me gusta (delegar | pedir ayuda | hablar en publico)",
      "mi [principal | mayor] area de oportunidad es (la | el | mi) (paciencia | puntualidad | organizacion | espanol | ingles | perfeccionismo | tiempo) #h:wk_area",
      "@wk_pre (la impaciencia | el perfeccionismo | la puntualidad | mi espanol | la timidez | el estres)",
    ] },
    working_on_it: { patterns: [
      "[pero] (estoy trabajando en eso | estoy mejorando | estoy aprendiendo | voy mejorando | cada vez estoy mejor | ya estoy mejorando) #h:wk_better",
      "[pero] (estoy tomando | tomo) clases [de espanol] #h:wk_classes", "[pero] (hago | uso) (listas | una agenda | un calendario | una lista [de pendientes]) [cada dia | todos los dias] #h:wk_lists",
      "[pero] estoy aprendiendo a (decir que no | pedir ayuda | delegar | relajarme | organizarme) #h:wk_say_no", "[pero] practico (todos los dias | mucho)",
      "[pero] (estudio | practico) espanol (todos los dias | en linea | con un maestro | en casa)", "[pero] (trato de | intento) (ser mas paciente | relajarme | delegar | organizarme mejor)",
    ] },
    no_weakness: { patterns: [
      "no tengo (debilidades | ninguna debilidad | defectos | areas de oportunidad)", "no (se me ocurre | encuentro) (ninguna | nada)", "no creo (tener | que tenga) debilidades",
      "no tengo (grandes | muchas) debilidades",
    ] },
    no_weakness_ctx: { patterns: ["(ninguna | nada) [la verdad]", "no tengo (ninguna | nada)"] },

    // --- five years -------------------------------------------------------------------------------
    future_ans: { patterns: [
      "(aqui | aqui mismo) [con ustedes] #h:fu_here", "(aqui | en linea clara | en esta empresa | con ustedes) con (mas responsabilidades | un mejor puesto | un puesto mas alto)",
      "(me gustaria | quiero | espero) (dirigir | coordinar | liderar) un equipo #h:fu_lead", "(liderando | dirigiendo | coordinando) un equipo",
      "(me gustaria | quiero | espero) (crecer | desarrollarme) (con | en) la empresa #h:fu_grow", "(creciendo | aprendiendo) [con la empresa | aqui]",
      "en un puesto (de gerente | gerencial | de liderazgo | de mas responsabilidad) #h:fu_management",
      "(me gustaria | quiero | espero) (ser | llegar a ser) (lider de equipo | gerente | jefe | jefa | supervisor | supervisora | coordinador | coordinadora) #h:fu_become",
      "[en cinco anos] (me veo | me imagino) (aqui | en la empresa | con ustedes | como gerente | dirigiendo un equipo | con mas responsabilidades)",
      "[en cinco anos] (me veo | me imagino | espero estar | quiero estar | me gustaria estar) [aqui] [como | de] (gerente | lider | jefe | jefa | supervisor | supervisora | coordinador | coordinadora | {job}) [de [un | mi] equipo | del (area | departamento)] [aqui | en la empresa | con ustedes]",
      "en cinco anos (quiero | me gustaria | espero) (dirigir | coordinar | liderar | tener) [un | mi propio] equipo",
      "(como | de) (gerente | lider de equipo | supervisor | supervisora | jefe | jefa | coordinador | coordinadora)",
      "(me gustaria | quiero | espero) (un ascenso | tener mas responsabilidades | ser (experto | experta) en {field})",
      "(aqui | en la empresa | en linea clara | con ustedes) [en la empresa | con ustedes] [con (mas responsabilidades | un mejor puesto)]", "con (mas responsabilidades | un mejor puesto | un puesto mas alto)",
      "(quiero | me gustaria | espero) seguir (aprendiendo | creciendo) [aqui | con ustedes]", "(liderando | dirigiendo | coordinando) (mi propio | mi) equipo",
      "(me gustaria | quiero | espero) (crecer | desarrollarme) (aqui | con ustedes | en la empresa | dentro de la empresa)",
    ] },
    future_away: { patterns: [
      "[no se] (quiza | tal vez | a lo mejor) (en otro pais | de regreso en mi pais | en otro lugar)", "(me gustaria | quiero) (tener | abrir | poner) mi propio negocio",
      "no (quiero | me interesa | pienso) (ser jefe | ser jefa | dirigir un equipo | ser gerente | quedarme mucho tiempo)", "no me (veo | imagino) (aqui | en la empresa | en esta empresa) [en cinco anos]", "(quiza | tal vez | a lo mejor) regrese a mi pais",
    ] },

    // --- teamwork ---------------------------------------------------------------------------------
    teamwork_ans: { patterns: [
      "en mi (ultimo | anterior | otro | primer) trabajo (terminamos | hicimos | entregamos | organizamos | lanzamos) un (gran proyecto | proyecto | evento | pedido) [grande | muy grande | importante | dificil] [a tiempo] #h:tw_project",
      "(terminamos | hicimos | entregamos | organizamos | lanzamos | preparamos) un (gran proyecto | proyecto | evento) [grande | importante | dificil] [juntos] [a tiempo]",
      "(trabajamos | siempre trabajamos | trabajabamos) (juntos | en equipo) [en un proyecto [grande]] #h:tw_together",
      "trabajé en un equipo de {number} [personas] #h:tw_team_of", "(dirigí | coordiné) un equipo de {number} [personas]",
      "(ayudé | capacité | apoyé | entrené) a (un companero nuevo | una companera nueva | mis companeros | un nuevo companero | los nuevos) #h:tw_helped",
      "nos (ayudabamos | ayudamos) (mucho | entre todos | unos a otros) #h:tw_each_other", "(organicé | coordiné | dirigí) (el proyecto | el equipo | un evento | la junta)",
      "(siempre | normalmente) trabajo en equipo", "(nos repartimos | dividimos) (el trabajo | las tareas)",
      "en mi trabajo (anterior | pasado) (terminamos | hicimos | entregamos | organizamos | lanzamos) un (gran proyecto | proyecto | evento | pedido) [grande | muy grande | importante | dificil] [a tiempo]",
      "trabajé (con | en) un equipo [en un proyecto [importante | grande | dificil]]", "[una vez] (ayudé | apoyé) a (una companera | un companero) [con un proyecto [dificil | grande | importante]]",
    ] },
    story_ctx: { patterns: ["{story}"] },
    no_team: { patterns: ["no (me gusta | trabajo bien | trabajamos) [trabajar] en equipo", "(casi siempre | normalmente | siempre) trabajo (solo | sola)", "nunca he trabajado en equipo", "no tengo (un | ningun) ejemplo", "no se me ocurre (un | ningun) ejemplo"] },
    example_q: { patterns: ["(me puede | puede | podria) dar un ejemplo", "(que | cual) tipo de ejemplo", "como que", "un ejemplo de que"] },

    // --- languages --------------------------------------------------------------------------------
    languages_ans: { patterns: [
      "@lang_spoken {language} [y {language}] [y [un poco de] {language}] #h:l_speak", "hablo {language} [y {language}] y un poco de {language}",
      "mi (lengua materna | idioma materno | idioma nativo) es [el] {language} #h:l_native", "(tambien | ademas) hablo un poco de {language} #h:l_little",
      "hablo (dos | tres | cuatro | varios) idiomas",
    ] },
    languages_ctx: { patterns: ["{language} [y {language}] [y {language}]", "(solo | nomas) {language} [y {language}]"] },

    // --- work authorization -----------------------------------------------------------------------
    auth_yes: { patterns: [
      "[si] (tengo | ya tengo) [la | mi] residencia [permanente | temporal] [con permiso para trabajar] #h:a_res_card",
      "[si] (soy | ya soy) residente (permanente | temporal) [con permiso para trabajar] #h:a_res",
      "[si] (tengo | traigo) (permiso de trabajo | permiso para trabajar | mi tarjeta de residente | tarjeta de residente | visa de trabajo | mis papeles en orden | mis papeles) #h:a_permit",
      "[si] (todo esta | mis papeles estan) en orden", "[si] tengo (visa de residente | visa de trabajo) [temporal | permanente]", "[si] tengo (doble nacionalidad | la nacionalidad mexicana)",
    ] },
    auth_pending: { patterns: [
      "[todavia no | aun no | no] (mi residencia | mi permiso | mis papeles | el permiso | mi tarjeta) (esta | estan | sigue | siguen) en (tramite | proceso) #h:a_waiting",
      "[todavia no | aun no | no] (estoy | ando) tramitando (mi residencia | el permiso | mi permiso | mis papeles | la residencia)",
      "[no] no tengo (permiso | permiso de trabajo | permiso para trabajar | residencia | visa de trabajo | papeles) [todavia | aun]",
      "[todavia no | aun no] (estoy esperando | espero) (mi residencia | mi tarjeta | el permiso | mi permiso)",
      "[no] [solo | nomas] tengo (visa de turista | visa de visitante | pasaporte) [nada mas | todavia]",
      "[si | no] [pero] (mi residencia | mi permiso | mis papeles | el permiso | mi tarjeta) (todavia | aun) (esta | estan | sigue | siguen) en (tramite | proceso)", "[todavia no | aun no] (estoy | sigo) en (tramite | proceso)", "[todavia | aun] no (soy residente | tengo [la] residencia) [permanente | temporal]", "[no] (soy | estoy como) turista [por ahora | todavia]",
    ] },

    // --- salary -----------------------------------------------------------------------------------
    salary_ans: { patterns: [
      "@sal_pre @money #h:s_amount", "[algo] entre ({number} | {sal}) y {max:sal} [pesos] [al mes | mensuales] #h:s_range",
      "lo mismo que (ganaba | gano) [ahora | antes]", "no (quiero | puedo) ganar menos de {sal} [pesos] [al mes | mensuales]", "(mis pretensiones son | busco) (algo | un sueldo) (justo | competitivo)",
    ] },
    salary_flexible: { patterns: [
      "(soy | estoy) (flexible | abierto | abierta) [a negociar | a escuchar su oferta] #h:s_flexible", "es negociable #h:s_negotiable",
      "lo (podemos | pudieramos) (negociar | platicar | hablar)", "lo que (ustedes | usted) (consideren | considere) justo", "depende de las prestaciones",
      "lo que (ofrezcan | ofrezca) [esta bien]",
    ] },
    salary_more: { patterns: ["(esperaba | pensaba en | buscaba) [un poco | algo] mas #h:range_more", "[es] (un poco | algo) bajo [para mi]", "(un poco | algo) mas"] },
    // only at the salary question and "¿Le parece bien?": "Más o menos", "Me parece poco"
    range_ctx: { patterns: ["[no] mas o menos", "[no] [me] (parece | es) [un poco | algo | muy] (poco | bajo)", "[no] (no mucho | no tanto)"] },
    salary_range_q: { patterns: [
      "cual es el (rango | sueldo | salario) (para | de) (este puesto | el puesto) #h:s_range_q", "cuanto (paga | pagan | se paga) [el puesto | este puesto]",
      "cuanto es el (sueldo | salario)", "(que | cuanto) (sueldo | salario) (ofrecen | manejan | tienen)", "cual es el (sueldo | salario | rango)",
      "cuanto (pagas | ofreces) #tip:tu_staff", "y el (sueldo | salario) [cuanto es]", "cuanto (voy a ganar | ganaria | se gana) [aqui | en este puesto | al mes]",
    ] },

    // --- start date -------------------------------------------------------------------------------
    start_ans: { patterns: [
      "(puedo | podria) (empezar | comenzar | iniciar) @soon",
      "(puedo | podria) (empezar | comenzar | iniciar) [el] {day} #h:st_monday",
      "(puedo | podria) (empezar | comenzar | iniciar) @later",
      "(tengo que | necesito) (avisar | dar aviso | renunciar) [en mi trabajo | a mi jefe | a mi jefa | en mi trabajo actual] [con (quince dias | dos semanas) de anticipacion] [primero] #notice #h:st_notice",
      "(estoy | quedo) disponible (@soon | a partir del {day} | a partir del {date} | @later)",
      "no puedo (empezar | comenzar) (antes del | hasta el) (proximo mes | {day} | {date} | primero) #later",
      "no puedo [empezar | comenzar] (la proxima semana | manana | tan pronto | esta semana | el {day} | de inmediato | ya) #cant",
      "(necesito | tengo) (una semana | dos semanas | quince dias | un mes) para (terminar en mi trabajo | dejar mi trabajo | avisar) #notice",
      "puedo (venir | empezar a trabajar) (@soon | {day} | @later)",
      // "No puedo el lunes, mejor el primero de diciembre": the second date is the answer
      "no puedo [empezar | comenzar] (la proxima semana | manana | esta semana | el {neg:day} | este {neg:day} | tan pronto | de inmediato | ya) [pero] (mejor | puedo | podria | prefiero) [empezar | comenzar] (@later | [el] {day} | a partir del {day} | @soon)",
    ] },
    // a bare time ("Ya", "Mañana", "El lunes", "En dos semanas") answers "¿Cuándo podría empezar?" only
    start_ctx: { patterns: [
      "@soon #h:st_asap", "[el] {day}", "@later #h:st_weeks", "desde el {day}", "{day} (esta bien | me queda bien) [para mi]",
      "(cuando | lo que) (ustedes | usted) (quieran | quiera | necesiten | necesite | digan | diga)", "mejor (@later | [el] {day} | @soon)",
    ] },

    // --- why hire you -----------------------------------------------------------------------------
    hire_ans: { patterns: [
      "[porque] tengo la experiencia (necesaria | que buscan | que necesitan | correcta) [para el puesto] #h:h_experience",
      "[porque] soy (la persona | el candidato | la candidata) (indicada | indicado | correcta | correcto | ideal | perfecta | perfecto) [para (este puesto | el puesto | este trabajo)] #h:h_right",
      "(deme | denme) una oportunidad [y (va a ver | van a ver | no se va a arrepentir | no se van a arrepentir)] #h:h_chance", "no se (va | van) a arrepentir",
      "(puedo | voy a) (aportar | ayudar) mucho [a la empresa | al equipo]", "[porque] (tengo | cumplo con) (el perfil | todo lo que piden | los requisitos)",
      "[porque] (soy | seria) (un buen elemento | una buena eleccion)", "[porque] tengo [mucha | bastante] experiencia [en esto | en {field} | en el area] [y (soy @very {strength} [y {strength}] | aprendo rapido)]", "[porque] (tengo | traigo) (las habilidades | la preparacion) [que buscan | necesarias]",
    ] },

    // --- the learner's questions ------------------------------------------------------------------
    can_ask: { patterns: ["(puedo | le puedo | podria) (hacerle | hacer) (una pregunta | unas preguntas | algunas preguntas)", "[si] tengo (una | unas | algunas | un par de | dos) (pregunta | preguntas | dudas | duda)", "(si | la verdad) de hecho si", "[si] (una pregunta | una duda | tengo una duda | otra pregunta)", "te puedo hacer una pregunta #tip:tu_staff"] },
    q_hours: { patterns: [
      "cual es el horario [de trabajo] #h:q_hours", "(cual | que) horario (tienen | manejan | es | seria)", "a que hora (se entra | se sale | entraria | saldria | entro | salgo | empieza | termina) [el trabajo | la jornada]",
      "de que hora a que hora (es | se trabaja | seria)", "cuantas horas (al dia | a la semana | por dia | por semana | se trabaja | trabajaria)",
      "(es | el trabajo es | el puesto es) [de] tiempo completo #full", "(es | el trabajo es | el puesto es) [de] medio tiempo #part",
      "(se trabaja | hay que trabajar | trabajaria | tendria que trabajar) (los sabados | los fines de semana | de noche) #weekend",
      "(se trabajan | hay que trabajar | trabajaria | tendria que trabajar) horas extra #extra", "(hay | tienen) horas extra #extra", "(hay | tienen) hora de comida",
    ] },
    q_training: { patterns: [
      "(hay | dan | tienen | me darian | habra | hay alguna) (capacitacion | entrenamiento | induccion) [para la gente nueva | para los nuevos] #h:q_training",
      "quien me (va a capacitar | capacitaria | va a ensenar) #who", "(hay | tendria) (un mentor | alguien que me ensene)", "como (voy a aprender | aprendo) el trabajo #who",
    ] },
    q_start: { patterns: ["cuando (empezaria | podria empezar | empiezo | inicio | iniciaria | comenzaria) #h:q_start", "cual (seria | es) la fecha de (inicio | ingreso)", "cuando (es | seria) (el | mi) primer dia"] },
    q_team: { patterns: [
      "de cuantas personas es el equipo #h:q_team", "(de que tamano | que tan grande) es el equipo", "cuantas personas (hay | son | trabajan) en el equipo",
      "con quien (trabajaria | voy a trabajar)", "quien seria mi (jefe | jefa | supervisor | supervisora) #boss", "cuantas personas trabajan (aqui | en la empresa | en linea clara)", "como es el equipo",
    ] },
    q_remote: { patterns: [
      "(puedo | se puede | podria) (hacer home office | trabajar desde casa | trabajar en casa | trabajar a distancia) [algunos dias | a veces] #h:q_remote",
      "(hay | tienen | manejan | dan) (home office | trabajo remoto | trabajo hibrido | esquema hibrido)", "es (presencial | remoto | hibrido) [el trabajo | el puesto]",
      "(el trabajo | el puesto) es (presencial | remoto | hibrido)", "cuantos dias (de home office | de trabajo remoto | desde casa) (hay | dan | tienen | puedo)",
    ] },
    q_benefits: { patterns: [
      "(que | cuales) prestaciones (tiene el puesto | tienen | ofrecen | hay | dan) #h:q_benefits", "cuales son las prestaciones", "(hay | tienen | dan) prestaciones [de ley]",
      "(hay | tienen | dan) (seguro medico | seguro de gastos medicos | seguro social | vales de despensa | aguinaldo)",
      "cuantos dias de vacaciones (tengo | tendria | dan | son | hay | tienen) #vac", "(cuantas | cuanto) vacaciones (tengo | dan | tendria | hay) #vac",
      "y (las prestaciones | con prestaciones)",
    ] },
    q_day: { patterns: [
      "como es un dia (normal | tipico) [de trabajo] [aqui] #h:q_day", "que (haria | voy a hacer | tendria que hacer) (todos los dias | en el puesto | aqui)",
      "cuales (serian | son) mis (funciones | actividades | responsabilidades | tareas)", "en que consiste el (puesto | trabajo)",
    ] },
    q_next: { patterns: [
      "cuales son los siguientes pasos #h:q_next", "cual es el siguiente paso", "cuando (me avisan | me llaman | sabre | me dan una respuesta | tendre una respuesta | deciden)",
      "que sigue [ahora | despues]", "cuando (sabria | voy a saber) (algo | la respuesta | el resultado)",
    ] },
    q_dress: { patterns: ["(hay | tienen) (codigo de vestimenta | dress code | uniforme) #h:q_dress", "como (hay que | tengo que | debo) vestirme", "(que | como) ropa (uso | hay que usar | se usa)", "como me tengo que vestir", "como (hay que | tengo que | debo) venir (vestido | vestida)"] },
    q_parking: { patterns: ["(hay | tienen) (estacionamiento | donde estacionarse | lugar para estacionar)", "donde (me estaciono | puedo estacionarme | estaciono)", "[y] el estacionamiento (es gratis | tiene costo | se paga | cuesta) #cost"] },
    q_like: { patterns: ["que es lo que mas le gusta de trabajar aqui", "[a usted] le gusta trabajar aqui", "que le gusta [mas] de (la empresa | linea clara | trabajar aqui)", "que te gusta de trabajar aqui #tip:tu_staff"] },
    q_restroom: { patterns: ["donde (esta | estan | queda) el (bano | sanitario | aseo | servicio)", "puedo (usar | pasar a) el bano"] },
    her_name: { patterns: ["como se llama [usted]", "cual es su nombre", "(quien es usted | y usted es)", "usted es la (gerente | jefa | de recursos humanos)", "como te llamas #tip:tu_staff"] },
    q_other_ctx: { patterns: ["(hay | tengo | tendria) (posibilidades | oportunidades | oportunidad) de (crecer | crecimiento | ascender) [en la empresa | aqui] #grow", "(que | como | cuando | donde | quien | por que | hay | tienen | puedo | voy a | se puede) {w:any}"] },
    no_questions: { patterns: [
      "[no] [creo que] ya (me resolvió | me contestó | me respondió | resolvió | contestó) (todo | todas mis dudas | mis preguntas) #h:q_none",
      "[no] [creo que] (es todo | eso es todo | seria todo | eso seria todo | era todo | eso era todo | solo eso) [por ahora | por el momento] #h:q_none_all", "[no] no tengo [mas | otras | ninguna] (preguntas | pregunta | dudas | duda) [por ahora | por el momento]",
      "[no] (todo | todo esta) [muy] claro", "[no] ya no tengo (nada | mas preguntas)",
    ] },
    // bare "Nada más", "Ya no", "Ya" close her questions only ("Fui contador, pero ya no" is no answer to them)
    no_questions_ctx: { patterns: ["[no] (ninguna | nada) [mas] [por ahora]", "[no] ya [no] [es todo | seria todo]"] },

    // --- closing --------------------------------------------------------------------------------
    thanks_time: { patterns: [
      "[muchas | mil] gracias por su tiempo [hoy] #h:c_thanks_time", "[muchas | mil] gracias por (la oportunidad | esta oportunidad | la entrevista | recibirme | atenderme) #h:c_opportunity",
      "le agradezco (su tiempo | la oportunidad | mucho)",
      // "Gracias por la oportunidad, fue un gusto conocerla" in one breath (a piece can't start with "fue"): the goodbye too
      "[muchas | mil] gracias por (su tiempo | la oportunidad | esta oportunidad | la entrevista) [y] (fue | ha sido) un (gusto | placer) [conocerla | platicar con usted | hablar con usted] #nice",
    ] },
    look_forward: { patterns: [
      "quedo (atento | atenta) a su (llamada | respuesta | correo) #h:c_look_forward", "espero (su llamada | su respuesta | noticias suyas | saber de ustedes) [pronto]",
      "ojala (me llamen | me llame | tengamos noticias)", "espero que me (llamen | llame | avisen)",
    ] },
    nice_meet: { patterns: [
      "(fue | ha sido) un (gusto | placer) (conocerla | platicar con usted | hablar con usted) #h:c_nice_meet", "mucho gusto en conocerla", "(encantado | encantada) de conocerla",
      "fue un (gusto | placer)", "(mucho gusto | un placer | todo un placer | el gusto es mio)",
    ] },

    // --- the job offer (twist) ----------------------------------------------------------------------
    accept_job: { patterns: [
      "[si] (acepto | claro que acepto | con gusto acepto | si acepto) [con (mucho | todo) gusto] #h:o_accept",
      "(me encantaria | con mucho gusto) (acepto | me uno al equipo)", "[si] [claro] acepto el (trabajo | puesto) [con (mucho | todo) gusto]",
      "(estoy | me siento) [muy | super] (feliz | contento | contenta | emocionado | emocionada) de (aceptar | unirme al equipo)",
      "[si] [claro] quiero el (trabajo | puesto)", "[muchisimas | muchas | mil] gracias acepto",
    ] },
    // at the offer only: "¡Qué buena noticia!", "Me encantaría", "¡Con mucho gusto!" (elsewhere they accept nothing)
    accept_ctx: { patterns: [
      "(que | es una) (buena noticia | excelente noticia | gran noticia | maravilla) #h:o_wonderful", "[si] me encantaria [aceptar | trabajar con ustedes | trabajar aqui]",
      "[si] con (mucho | todo) gusto",
    ] },
    surprise_ctx: { patterns: ["(en serio | de verdad | no lo puedo creer | no puedo creerlo | no me lo puedo creer | que emocion | increible | no lo creo | wow | guau)"] },
    think_offer: { patterns: [
      "(puedo | podria) pensarlo [unos dias | un par de dias | un poco | bien]", "(tengo que | necesito | quisiera | quiero | me gustaria) pensarlo [bien] [un poco | unos dias | un par de dias]",
      "lo (voy a | quiero | tengo que | necesito) pensar [bien]", "(dejeme | permitame) pensarlo [unos dias | un poco]", "(deme | me da) (unos dias | un dia | tiempo) [para pensarlo]",
      "(lo puedo | puedo) pensar #h:o_think", "(me permite | me da) (unos dias | un dia | tiempo) para pensarlo", "(necesito | quisiera) (pensarlo | unos dias para pensarlo | tiempo para pensarlo)",
      "(le puedo | puedo) (avisar | contestar | contestarle | confirmar | confirmarle) (manana | despues | el {day})", "(todavia | aun) no (puedo | se si) (aceptar | aceptarlo)", "(lo tengo que | tengo que | necesito) (hablarlo | platicarlo | consultarlo) con mi (familia | esposa | esposo | pareja) [primero]",
    ] },
    decline_offer: { patterns: ["no (acepto | lo acepto)", "[ya] no (quiero | me interesa) el (puesto | trabajo)", "[ya] acepté otra (oferta | propuesta)", "(tengo | ya tengo) otro (trabajo | empleo)", "no me interesa", "[ya] acepté otro (trabajo | puesto | empleo)", "[no] no (puedo | quiero) (aceptar | aceptarlo)", "(lo siento | perdon) [pero] no puedo (aceptar | aceptarlo)", "(tengo | ya tengo) otra (oferta | propuesta)", "(decidí | ya decidí) aceptar otro trabajo"] },

    // --- side moves -------------------------------------------------------------------------------
    nervous: { patterns: ["[perdon] (estoy | ando) [un poco | algo | muy] (nervioso | nerviosa) #h:x_nervous"] },
    resume: { patterns: [
      "(aqui | le) (tiene | esta | traigo | dejo) (mi cv | mi curriculum | mi curriculo | mi hoja de vida | mi solicitud) #h:x_resume",
      "(le traje | traje) (mi cv | mi curriculum | una copia de mi cv | una copia de mi curriculum)", "(necesita | quiere) (mi cv | mi curriculum | una copia de mi cv)",
    ] },
    no_problem: { patterns: [
      "(no hay | sin) problema", "no se preocupe", "(adelante | conteste | contestele)", "(aqui | yo) (espero | la espero)", "(tomese | tome) su tiempo",
      "claro (adelante | no hay problema)", "no pasa nada", "no te preocupes #tip:tu_staff",
    ] },
  },

  lines: {
    // Arriving
    greet_help: [
      t("Buenos días. | ¿En | qué | le | puedo | ayudar?", "Good morning. | In | what | you | I-can | help?", "Good morning. How can I help you?", { flags: { 3: "le: you (usted), the one being helped." } }),
      t("¡Hola, | buenos días! | ¿Le | ayudo | en | algo?", "Hi, | good morning! | You | I-help | with | something?", "Hi there, good morning! Can I help you with anything?"),
    ],
    greet_interview: [
      t("Buenos días. | ¿Viene | a | la | entrevista?", "Good morning. | Are you coming | to | the | interview?", "Good morning. Are you here for the interview?"),
      t("¡Hola! | Usted | viene | a | la | entrevista | de | {$time}, | ¿verdad?", "Hi! | You | are coming | to | the | interview | at | {$time}, | right?", "Hi! You must be here for the {$time} interview."),
    ],
    purpose_again: [t("¿Viene | a | una | entrevista?", "Are you coming | to | an | interview?", "Are you here for an interview?")],
    how_help: [t("¡Ay, | perdón! | ¿En | qué | le | puedo | ayudar?", "Oh, | sorry! | In | what | you | I-can | help?", "Oh, sorry! How can I help you?")],
    early_ok: [
      t("¡No hay problema!", "No problem!", "No problem at all!"),
      t("Está bien, | no se preocupe.", "That's fine, | don't worry.", "That's fine, don't worry."),
    ],
    thats_me: [t("Sí, | soy yo.", "Yes, | it's me.", "Yes, that's me!")],
    other_time: [t("{m:Lo|f:La} | tengo | {m:anotado|f:anotada} | a | {$time}, | pero | no hay problema.", "You | I-have | written down | at | {$time}, | but | no problem.",
      "I have you down for {$time}, but that's no problem.", { flags: { 0: "lo / la: you (usted); it agrees with your gender, as anotado / anotada does." } })],
    ask_name: [
      t("¡Muy | bien! | ¿Y | su | nombre, | por favor?", "Very | good! | And | your | name, | please?", "Great! And your name, please?"),
      t("Perfecto. | ¿Me | da | su | nombre?", "Perfect. | (To) me | you-give | your | name?", "Perfect. Could I have your name?"),
    ],
    name_again: [t("Perdón, | ¿cuál | es | su | nombre?", "Sorry, | what | is | your | name?", "Sorry, what was your name?")],
    welcome: [
      t("Mucho gusto. | Yo | soy | la | gerente | de | recursos humanos.", "Nice to meet you. | I | am | the | manager | of | human resources.", "Nice to meet you. I'm the HR manager."),
      t("Mucho gusto. | Gracias | por | venir.", "Nice to meet you. | Thanks | for | coming.", "Nice to meet you. Thank you for coming in."),
    ],
    sit: [
      t("Pase, | por favor. | Tome | asiento.", "Come in, | please. | Take | a seat.", "Please come in and have a seat."),
      t("Siéntese, | por favor.", "Sit down, | please.", "Please, have a seat."),
    ],
    // Small talk
    ask_found: [
      t("¿Nos | encontró | bien?", "Us | you-found | well?", "Did you find us okay?"),
      t("¿Fue | fácil | llegar?", "Was it | easy | to get here?", "Was it easy to get here?"),
    ],
    found_good: [t("¡Qué | bueno!", "How | good!", "Good!"), t("Me alegro.", "I'm glad.", "Great.")],
    found_bad: [t("¡Ay, | no! | Bueno, | ya | está | aquí.", "Oh, | no! | Well, | now | you-are | here.", "Oh no! Well, you're here now.")],
    offer_drink: [
      t("¿Le | ofrezco | algo | de | tomar? | ¿Agua? | ¿Café?", "(To) you | I-offer | something | — | to drink? | Water? | Coffee?", "Can I get you anything? Water? Coffee?",
        { flags: { 3: "algo de tomar: de links algo to the verb; = something to drink." } }),
      t("¿Gusta | un | vaso | de | agua | o | un | café?", "Would you like | a | glass | of | water | or | a | coffee?", "Would you like some water or coffee?", {
        flags: { 0: "Mexican: ¿Gusta…? = would you like…? (very polite)." },
        neutral: t("¿Quiere | un | vaso | de | agua | o | un | café?", "Do you want | a | glass | of | water | or | a | coffee?", "Would you like some water or coffee?") }),
    ],
    here_water: [t("Aquí tiene.", "Here you go.", "Here you go."), t("Claro, | aquí tiene.", "Sure, | here you go.", "Sure, here you go.")],
    here_coffee: [t("¡Claro! | Aquí está | su | café.", "Sure! | Here is | your | coffee.", "Sure! Here's your coffee.")],
    no_drink_ok: [t("Está bien, | como | guste.", "That's fine, | as | you-like.", "Okay, sure.")],
    // About you
    ask_about: [
      t("Bueno, | cuénteme | un | poco | de | usted.", "Well, | tell me | a | little | about | yourself.", "So, tell me a little about yourself."),
      t("Hábleme | de | usted.", "Tell me | about | yourself.", "Tell me about yourself."),
      t("Para | empezar, | platíqueme | un | poco | de | usted.", "To | start, | tell me | a | little | about | yourself.", "First, could you tell me a little about yourself?", {
        flags: { 2: "Mexican: platicar = to chat, to tell." },
        neutral: t("Para | empezar, | cuénteme | un | poco | de | usted.", "To | start, | tell me | a | little | about | yourself.", "First, could you tell me a little about yourself?") }),
    ],
    ask_about_again: [
      t("Cuénteme | un | poco | de | usted.", "Tell me | a | little | about | yourself.", "Tell me a little about yourself."),
      t("Solo | cuénteme | un | poco | de | usted: | su | trabajo | y | su | experiencia.", "Just | tell me | a | little | about | yourself: | your | work | and | your | experience.",
        "Just tell me a little about yourself: your work and your experience."),
    ],
    ask_job_more: [
      t("¿Y | a | qué | se dedica?", "And | to | what | do you devote yourself?", "And what do you do?", { flags: { 1: "dedicarse a: to do for a living; a links it to qué." } }),
      t("¿Y | en | qué | trabaja | ahora?", "And | in | what | do you work | now?", "So, what do you do now?"),
    ],
    not_job_ack: [t("Ah, | ya veo.", "Oh, | I see.", "Oh, I see.")],
    why_neg_ack: [t("Muy | bien, | gracias | por | su | sinceridad.", "Very | good, | thanks | for | your | honesty.", "Okay, thanks for being honest.")],
    ask_start_when: [t("No hay problema. | Entonces, | ¿cuándo | podría | empezar?", "No problem. | Then, | when | could you | start?", "No problem. When could you start, then?")],
    a_restroom: [t("Está | al fondo | del | pasillo, | a la izquierda.", "It's | at the end | of the | hall, | on the left.", "It's down the hall, on the left.")],
    brooks_name: [t("Soy | la | licenciada | Salinas, | para servirle.", "I'm | — | Licenciada | Salinas, | at your service.", "I'm Ms. Salinas, at your service.", {
      flags: { 1: "Spanish puts la before a title.", 2: "Licenciada: the title of a university graduate, used a lot in Mexican offices." } })],
    ask_studied: [t("¿Y | qué | estudió?", "And | what | did you study?", "And what did you study?")],
    ask_job_before: [t("¿Y | qué | hacía | antes?", "And | what | did you do | before?", "And what did you do before?")],
    ask_years_job: [
      t("¿Cuánto | tiempo | tiene | trabajando | como | {X}?", "How much | time | do you have | working | as | {X}?", "How long have you worked as {X.np}?", {
        flags: { 2: "Mexican: tiene … trabajando = have you been working." },
        neutral: t("¿Cuánto | tiempo | lleva | trabajando | como | {X}?", "How much | time | have you spent | working | as | {X}?", "How long have you worked as {X.np}?") }),
      t("¿Y | cuántos | años | de | experiencia | tiene | como | {X}?", "And | how many | years | of | experience | do you have | as | {X}?", "And how many years of experience do you have as {X.np}?"),
    ],
    ask_years_field: [t("¿Y | cuánto | tiempo | lleva | en | {X}?", "And | how much | time | have you spent | in | {X}?", "And how long have you worked in {X}?")],
    ask_years_generic: [t("¿Y | cuántos | años | de | experiencia | tiene?", "And | how many | years | of | experience | do you have?", "And how many years of experience do you have?")],
    job_echo: [
      t("¡Ah, | {X}! | ¡Qué | interesante!", "Oh, | {X}! | How | interesting!", "Oh, {X.np}! Interesting."),
      t("¡Ah, | {X}! | ¡Qué | bien!", "Oh, | {X}! | How | nice!", "Oh, {X.np}! That's great."),
    ],
    about_ack: [t("Interesante.", "Interesting.", "Interesting."), t("Muy | bien.", "Very | good.", "Great."), t("Ah, | qué | bien.", "Ah, | how | nice.", "Okay, great.")],
    exp_lot: [t("¡Uy, | es | mucha | experiencia!", "Wow, | it's | a lot of | experience!", "Wow, that's a lot of experience!"), t("¡Cuánta | experiencia!", "How much | experience!", "That's a lot of experience!")],
    exp_good: [t("Es | muy | buena | experiencia.", "It's | very | good | experience.", "That's great experience."), t("¡Excelente!", "Excellent!", "Great.")],
    no_exp_ok: [t("No se preocupe. | Aquí | damos | capacitación | a | la | gente | nueva.", "Don't worry. | Here | we-give | training | to | the | people | new.", "That's okay. We train new people here.",
      { flags: { 5: "la gente: Spanish uses the article for people in general." } })],
    from_lt: [t("¡Qué | bien! | {m:Bienvenido|f:Bienvenida} | a | Puerto Colibrí.", "How | nice! | Welcome | to | Puerto Colibrí.", "Oh, nice! Welcome to Puerto Colibrí!")],
    nice: [
      t("¡Qué | padre!", "How | cool!", "Oh, nice!", { flags: { 1: "Mexican: padre = cool, great." }, neutral: t("¡Qué | bien!", "How | nice!", "Oh, nice!") }),
      t("¡Ah, | qué | bonito!", "Oh, | how | lovely!", "Oh, that's lovely."),
    ],
    moved_ack: [t("¡Ah, | {m:bienvenido|f:bienvenida}!", "Oh, | welcome!", "Oh, welcome!")],
    english_good: [t("¡Habla | muy | bien | español!", "You speak | very | well | Spanish!", "Your Spanish is very good!")],
    what_know_help: [t("Lo | básico: | a | qué | se dedica | y | su | experiencia.", "The | basics: | to | what | you devote yourself | and | your | experience.", "Just the basics: what you do and your experience.",
      { flags: { 0: "lo básico: lo turns an adjective into a noun = the basics." } })],
    // Why a new job, why here
    ask_leaving: [
      t("¿Y | por qué | busca | un | nuevo | trabajo?", "And | why | are you looking for | a | new | job?", "So, why are you looking for a new job?"),
      t("¿Por qué | dejó | su | último | trabajo?", "Why | did you leave | your | last | job?", "Why did you leave your last job?"),
    ],
    leaving_ack: [t("Ya veo.", "I see.", "I see."), t("Claro, | tiene | sentido.", "Sure, | it has | sense.", "That makes sense.")],
    ask_why: [
      t("¿Y | por qué | quiere | trabajar | aquí?", "And | why | do you want | to work | here?", "So, why do you want to work here?"),
      t("¿Por qué | le interesa | trabajar | en | Línea Clara?", "Why | are you interested | in working | at | Línea Clara?", "Why do you want to work at Línea Clara?"),
    ],
    why_ack: [
      t("¡Qué | gusto | oír | eso!", "What | pleasure | to hear | that!", "That's great to hear."),
      t("Entiendo, | gracias.", "I understand, | thanks.", "I see. Thank you."),
      t("Me alegra | escuchar | eso.", "It makes me glad | to hear | that.", "I'm glad to hear that."),
    ],
    // Strengths
    ask_strengths: [
      t("¿Cuáles | son | sus | principales | fortalezas?", "What | are | your | main | strengths?", "What are your greatest strengths?"),
      t("Bueno, | ¿y | cuáles | son | sus | fortalezas?", "Well, | and | what | are | your | strengths?", "So, what are your strengths?"),
    ],
    strength_ack: [
      t("Eso | es | muy | importante | aquí.", "That | is | very | important | here.", "That's really important here."),
      t("Son | muy | buenas | cualidades.", "They are | very | good | qualities.", "Those are great qualities."),
      t("Excelente.", "Excellent.", "Great."),
    ],
    s_team: [t("Qué | bueno, | porque | aquí | trabajamos | mucho | en equipo.", "How | good, | because | here | we-work | a lot | as a team.", "Good, because we work in teams a lot here.")],
    s_fast: [t("¡Qué | bueno! | Aquí | hay | mucho | que | aprender.", "How | good! | Here | there is | a lot | — | to learn.", "Good! There's a lot to learn here.", { flags: { 5: "que: links mucho to the verb (a lot to learn)." } })],
    s_people: [t("Eso | es | importante. | Va | a | trabajar | con | muchos | clientes.", "That | is | important. | You're going | to | work | with | many | clients.", "That's important. You'll work with a lot of clients.")],
    s_organized: [t("¡Aquí | nos encanta | la | gente | organizada!", "Here | we love | — | people | organized!", "We love organized people here!", { flags: { 2: "la gente: Spanish uses the article for people in general." } })],
    strength_help: [t("Por | ejemplo: | ¿es | {m:organizado|f:organizada}? | ¿Es | {m:bueno|f:buena} | con | la | gente?", "For | example: | are you | organized? | Are you | good | with | — | people?",
      "For example: are you organized? Good with people?", { flags: { 7: "la gente: Spanish uses the article for people in general." } })],
    not_strength_ack: [t("Muy | bien. | ¿Y | en | qué | es | {m:bueno|f:buena}?", "Very | good. | And | at | what | are you | good?", "Okay. And what are you good at?")],
    // Weaknesses
    ask_weakness: [
      t("¿Y | sus | debilidades?", "And | your | weaknesses?", "And your weaknesses?"),
      t("¿Y | cuál | diría | que | es | su | mayor | debilidad?", "And | which | would you say | — | is | your | greatest | weakness?", "And what would you say is your greatest weakness?",
        { flags: { 3: "que: that, which English can leave out." } }),
      t("¿Y | cuáles | son | sus | áreas | de | oportunidad?", "And | what | are | your | areas | of | opportunity?", "And what are your areas for improvement?", {
        flags: { 4: "Mexican office Spanish: área de oportunidad = something you can improve, a polite word for weakness." },
        neutral: t("¿Y | cuáles | son | sus | debilidades?", "And | what | are | your | weaknesses?", "And what are your weaknesses?") }),
    ],
    weakness_ack: [
      t("Gracias | por | su | honestidad.", "Thanks | for | your | honesty.", "Thank you for being honest."),
      t("Le | agradezco | la | sinceridad.", "You | I-thank-for | the | sincerity.", "I appreciate your honesty."),
      t("Muy | bien, | gracias | por | compartirlo.", "Very | good, | thanks | for | sharing it.", "Okay, thank you for sharing that."),
    ],
    english_ack: [t("¡Pues | habla | muy | bien! | Y | aquí | va | a | mejorar | todavía | más.", "Well | you speak | very | well! | And | here | it's going | to | improve | even | more.",
      "Your Spanish is very good! And it'll only get better here.")],
    ask_improve: [t("¿Y | cómo | está | trabajando | en | eso?", "And | how | are you | working | on | that?", "And how are you working on that?")],
    improve_ack: [t("Muy | buena | idea.", "Very | good | idea.", "Good idea."), t("¡Excelente!", "Excellent!", "That's great.")],
    no_weak_1: [t("¡Ja! | Todos | tenemos | por lo menos | una.", "Ha! | Everyone | we-have | at least | one.", "Ha! Everyone has at least one.")],
    ask_improve_what: [t("¿Qué | le gustaría | mejorar?", "What | would you like | to improve?", "What's something you'd like to improve?")],
    no_weak_2: [t("¡Bueno, | está bien!", "Well, | that's fine!", "Fair enough!")],
    // Five years
    ask_future: [
      t("¿Dónde | se | ve | en | cinco | años?", "Where | yourself | you-see | in | five | years?", "Where do you see yourself in five years?"),
      t("¿Y | cómo | se | imagina | en | cinco | años?", "And | how | yourself | you-picture | in | five | years?", "And how do you picture yourself in five years?"),
    ],
    future_ack: [t("Me gusta | eso.", "I like | that.", "I like that."), t("Suena | muy | bien.", "It sounds | very | good.", "That sounds great.")],
    future_away_ack: [t("Entiendo. | Gracias | por | ser | {m:sincero|f:sincera}.", "I understand. | Thanks | for | being | honest.", "I see. Thanks for being honest.")],
    future_help: [t("No se preocupe. | ¿Qué | le gustaría | hacer | aquí?", "Don't worry. | What | would you like | to do | here?", "That's okay. What would you like to do here?")],
    // Teamwork
    ask_teamwork: [
      t("¿Me | puede | contar | de | alguna | vez | que | trabajó | en equipo?", "(To) me | can you | tell | about | some | time | that | you worked | as a team?", "Can you tell me about a time you worked on a team?"),
      t("¿Me | da | un | ejemplo | de | trabajo | en equipo?", "(To) me | you-give | an | example | of | work | as a team?", "Can you give me an example of teamwork?"),
    ],
    teamwork_ack: [
      t("Es | un | muy | buen | ejemplo.", "It's | a | very | good | example.", "That's a great example."),
      t("¡Suena | a | un | gran | equipo!", "It sounds | like | a | great | team!", "Sounds like a great team!"),
      t("Gracias, | eso | me | ayuda | mucho.", "Thanks, | that | me | it-helps | a lot.", "Thank you, that's really helpful."),
    ],
    no_team_ack: [t("Está bien. | Gracias.", "That's okay. | Thanks.", "That's okay. Thank you.")],
    example_help: [t("Por | ejemplo, | un | proyecto | que | hizo | con | su | equipo.", "For | example, | a | project | that | you did | with | your | team.", "For example, a project you did with your team.")],
    // Languages
    ask_languages: [t("¿Qué | idiomas | habla?", "What | languages | do you speak?", "What languages do you speak?")],
    languages_ack: [t("¡Qué | bien! | Eso | nos | puede | servir | mucho.", "How | nice! | That | us | it-can | help | a lot.", "That's great! That could be really useful here.")],
    languages_wow: [t("¡Uy, | qué | impresionante!", "Wow, | how | impressive!", "Wow, that's impressive!")],
    // Work permit
    ask_authorized: [t("¿Tiene | permiso | para | trabajar | en | México?", "Do you have | permission | to | work | in | Mexico?", "Are you authorized to work in Mexico?")],
    auth_yes_ack: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you.")],
    auth_pending_ack: [t("Muy | bien, | gracias | por | avisarme.", "Very | good, | thanks | for | letting me know.", "Okay, thanks for letting me know.")],
    // Salary
    ask_salary: [
      t("¿Cuáles | son | sus | pretensiones | salariales?", "What | are | your | expectations | salary?", "What are your salary expectations?",
        { flags: { 3: "pretensiones salariales: the usual words in Mexican job ads and interviews." } }),
      t("¿Y | cuánto | le gustaría | ganar?", "And | how much | would you like | to earn?", "And what salary are you looking for?"),
    ],
    salary_noted: [
      t("Muy | bien, | gracias. | Lo | anoto.", "Very | good, | thanks. | It | I'll-write-down.", "Okay, thank you. I'll note that down."),
      t("Perfecto, | eso | me | sirve. | Gracias.", "Perfect, | that | me | it-helps. | Thanks.", "Okay, that's helpful. Thank you."),
    ],
    salary_range: [t("Para | este | puesto, | el | rango | es | de | $14,000 | a | $17,000 | al mes, | según | la | experiencia.",
      "For | this | position, | the | range | is | from | 14,000 pesos | to | 17,000 pesos | a month, | depending on | the | experience.",
      "The range for this position is 14,000 to 17,000 pesos a month, depending on experience.",
      { say: "Para este puesto, el rango es de catorce mil a diecisiete mil pesos al mes, según la experiencia." })],
    range_ok_q: [t("¿Le parece | bien?", "Does it seem to you | good?", "Does that work for you?")],
    range_later: [t("Está bien, | lo | podemos | hablar | más adelante.", "That's fine, | it | we-can | discuss | later.", "Okay, we can talk about it later.")],
    good_to_know: [t("Muy | bien, | es | bueno | saberlo.", "Very | good, | it's | good | to know it.", "Okay, good to know.")],
    // Start date
    ask_start: [
      t("¿Cuándo | podría | empezar?", "When | could you | start?", "When can you start?"),
      t("Y | si | le | ofrecemos | el | puesto, | ¿cuándo | podría | empezar?", "And | if | you | we-offer | the | position, | when | could you | start?", "And if we offer you the job, when could you start?"),
    ],
    start_ack: [t("Perfecto.", "Perfect.", "Perfect."), t("Muy | bien, | eso | nos | funciona.", "Very | good, | that | us | it-works.", "Great, that works for us.")],
    notice_ack: [t("Claro, | es | completamente | normal.", "Of course, | it's | completely | normal.", "Of course, that's completely normal.")],
    // Why hire you
    ask_hire: [
      t("Bueno, | ¿y | por qué | deberíamos | {m:contratarlo|f:contratarla}?", "Well, | and | why | should we | hire you?", "So, why should we hire you?"),
      t("Y | para | terminar: | ¿por qué | deberíamos | {m:contratarlo|f:contratarla}?", "And | to | finish: | why | should we | hire you?", "And finally: why should we hire you?"),
    ],
    ask_hire_again: [t("Entonces, | ¿por qué | deberíamos | {m:contratarlo|f:contratarla}?", "So, | why | should we | hire you?", "So, why should we hire you?")],
    hire_ack: [t("Gracias, | muy | clara | su | respuesta.", "Thanks, | very | clear | your | answer.", "Thank you. That's very clear."), t("Me gusta | esa | respuesta.", "I like | that | answer.", "I like that answer.")],
    // The learner's questions
    ask_questions: [
      t("¿Tiene | alguna | pregunta | para | mí?", "Do you have | any | question | for | me?", "Do you have any questions for me?"),
      t("Bueno, | ¿qué | preguntas | tiene | para | mí?", "Well, | what | questions | do you have | for | me?", "So, what questions do you have for me?"),
    ],
    ask_questions_other: [t("¿Tiene | alguna | otra | pregunta | para | mí?", "Do you have | any | other | question | for | me?", "Do you have any other questions for me?")],
    ask_more_q: [
      t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?"),
      t("¿Qué | más | le gustaría | saber?", "What | else | would you like | to know?", "What else would you like to know?"),
      t("¿Algo | más?", "Something | more?", "Anything else?"),
    ],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead."), t("¡Por supuesto!", "Of course!", "Of course!")],
    a_hours: [t("Trabajamos | de | nueve | a | seis, | de | lunes | a | viernes.", "We-work | from | nine | to | six, | from | Monday | to | Friday.", "We work nine to six, Monday to Friday.")],
    a_lunch: [t("Y | tiene | una | hora | para | comer.", "And | you have | an | hour | to | eat.", "And you get an hour for lunch.")],
    a_training: [t("¡Sí! | Tiene | dos | semanas | de | capacitación | con | un | compañero.", "Yes! | You have | two | weeks | of | training | with | a | colleague.", "Yes! You'll have two weeks of training with a colleague.")],
    a_start: [t("Probablemente | el | primero | del | próximo | mes.", "Probably | the | first | of the | next | month.", "Probably on the first of next month.")],
    a_team: [t("En | el | equipo | somos | ocho | personas.", "In | the | team | we-are | eight | people.", "There are eight people on the team.")],
    a_team2: [t("Trabajaría | con | María | y | otros | compañeros.", "You would work | with | María | and | other | colleagues.", "You'd work with María and a few others.")],
    a_remote: [t("Puede | hacer | home office | dos | días | a la semana.", "You can | do | home office | two | days | a week.", "You can work from home two days a week.", {
      flags: { 2: "Mexican: home office, from English, is what Mexican offices say for working from home." },
      neutral: t("Puede | trabajar | desde | casa | dos | días | a la semana.", "You can | work | from | home | two | days | a week.", "You can work from home two days a week.") })],
    a_benefits: [t("Tiene | todas | las | prestaciones | de ley: | seguro social, | aguinaldo | y | vacaciones.", "You have | all | the | benefits | by law: | social security, | Christmas bonus | and | vacation.",
      "You get all the benefits the law requires: social security, a Christmas bonus and paid vacation.", { flags: { 6: "aguinaldo: the yearly bonus Mexican law requires, paid in December." } })],
    a_day: [t("Contestaría | correos | y | llamadas | de | clientes, | y | ayudaría | al | equipo | con | los | proyectos.",
      "You would answer | emails | and | calls | from | clients, | and | you would help | the | team | with | the | projects.", "You'd answer client emails and calls, and help the team with projects.",
      { flags: { 8: "al = a + el: a marks the team as the one being helped." } })],
    a_next: [t("Esta | semana | vamos | a | entrevistar | a | otros | candidatos.", "This | week | we're going | to | interview | — | other | candidates.", "We're interviewing a few other candidates this week.",
      { flags: { 5: "Personal a: Spanish marks people as the object; English needs no word." } })],
    a_touch: [t("Le | avisamos | a más tardar | el | viernes.", "You | we'll-let-know | at the latest | on | Friday.", "We'll let you know by Friday.", { flags: { 3: "el before a day: English says on." } })],
    a_dress: [t("Casual de negocios. | Y | los | viernes, | más | casual.", "Business casual. | And | on | Fridays, | more | casual.", "Business casual. And on Fridays, more casual.", { flags: { 2: "los before a day: every (Friday); English says on." } })],
    a_parking: [t("Sí, | hay | estacionamiento | atrás | del | edificio, | sin | costo.", "Yes, | there is | parking | behind | the | building, | without | cost.", "Yes, there's free parking behind the building.")],
    a_like: [t("¡La | gente! | Aquí | todos | son | muy | amables.", "The | people! | Here | everyone | is | very | nice.", "The people! Everyone here is really friendly.")],
    a_unknown: [t("¡Buena | pregunta! | Lo | reviso | y | le | aviso.", "Good | question! | It | I'll-check | and | you | I'll-let-know.", "Good question! I'll check and let you know.")],
    a_grow: [t("¡Claro! | Aquí | buscamos | que | la | gente | crezca | con | nosotros.", "Of course! | Here | we-try | that | the | people | grow | with | us.",
      "Of course! We want our people to grow with us.", { flags: { 3: "buscar que + a verb: to try to make something happen.", 4: "la gente: Spanish uses the article for people in general." } })],
    a_training_who: [t("Un | compañero | del | equipo, | durante | las | primeras | dos | semanas.", "A | colleague | from the | team, | during | the | first | two | weeks.",
      "A colleague from the team, for the first two weeks.")],
    a_fulltime: [t("Sí, | es | de tiempo completo.", "Yes, | it's | full-time.", "Yes, it's full-time.")],
    a_not_part: [t("No, | es | de tiempo completo.", "No, | it's | full-time.", "No, it's full-time.")],
    a_weekend: [t("No, | solo | de | lunes | a | viernes, | de | nueve | a | seis.", "No, | only | from | Monday | to | Friday, | from | nine | to | six.", "No, just Monday to Friday, nine to six.")],
    a_overtime: [t("Casi | nunca, | la verdad.", "Almost | never, | honestly.", "Hardly ever, to be honest.")],
    a_boss: [t("Su | jefe | sería | el | ingeniero | Montes.", "Your | boss | would be | — | Ingeniero | Montes.", "Your boss would be Mr. Montes.", {
      flags: { 3: "Spanish puts el before a title.", 4: "Ingeniero: an engineering graduate's title, used to address him in Mexican offices." } })],
    a_parking_free: [t("Es | sin | costo. | Está | atrás | del | edificio.", "It's | without | cost. | It's | behind | the | building.", "It's free. It's behind the building.")],
    a_vacation: [t("Las | que | marca | la | ley. | Todo | viene | en | el | contrato.", "The ones | that | sets | the | law. | Everything | comes | in | the | contract.",
      "Whatever the law requires. It's all in the contract.")],
    a_next_hired: [t("Primero | firma | el | contrato, | y | después | empieza | la | capacitación.", "First | you-sign | the | contract, | and | then | starts | the | training.",
      "First you sign the contract, and then your training starts.")],
    a_next_offered: [t("Usted | me | avisa | el | viernes, | y | si | acepta, | le | mando | el | contrato.",
      "You | me | let-know | on | Friday, | and | if | you-accept, | you | I'll-send | the | contract.", "You let me know by Friday, and if you say yes, I'll send you the contract.",
      { flags: { 3: "el before a day: English says on." } })],
    great_questions: [t("¡Muy | buenas | preguntas!", "Very | good | questions!", "Great questions!")],
    // Closing
    closing: [
      t("Bueno, | muchas | gracias | por | venir | hoy.", "Well, | many | thanks | for | coming | today.", "Well, thank you so much for coming in today."),
      t("Muchas | gracias | por | su | tiempo.", "Many | thanks | for | your | time.", "Thank you so much for your time today."),
    ],
    closing_next: [
      t("Le | avisamos | pronto.", "You | we'll-let-know | soon.", "We'll be in touch soon."),
      t("Le | llamamos | en | unos | días.", "You | we'll-call | in | a few | days.", "We'll call you in a few days."),
    ],
    closing_reply: [
      t("Al contrario. | ¡Mucha | suerte | y | que | tenga | buen día!", "Thank you. | Much | luck | and | (I hope) | you have | a good day!", "Thank you! Good luck, and have a great day!",
        { flags: { 0: "al contrario: on the contrary, the polite answer to “thank you for your time”." } }),
      t("Con mucho gusto. | ¡Que | tenga | buen día!", "With great pleasure. | (I hope) | you have | a good day!", "My pleasure. Have a great day!"),
    ],
    closing_bye: [t("Fue | un | gusto | {m:conocerlo|f:conocerla}. | ¡Que | tenga | buen día!", "It was | a | pleasure | to meet you. | (I hope) | you have | a good day!", "It was nice to meet you. Have a great day!")],
    closing_nice: [t("Igualmente, | fue | un | gusto. | ¡Que | tenga | buen día!", "Likewise, | it was | a | pleasure. | (I hope) | you have | a good day!", "It was nice to meet you too. Have a great day!")],
    // The job offer (twist)
    offer: [t("¿Sabe | qué? | No necesito | esperar. | Nos gustaría | ofrecerle | el | puesto.", "You know | what? | I don't need | to wait. | We'd like | to offer you | the | position.",
      "You know what? I don't need to wait. We'd like to offer you the job!")],
    offer_yes: [t("¡Excelente! | ¡{m:Bienvenido|f:Bienvenida} | al | equipo!", "Excellent! | Welcome | to the | team!", "Wonderful! Welcome to the team!")],
    offer_contract: [t("Hoy mismo | le | mando | el | contrato.", "Today | you | I'll-send | the | contract.", "I'll send you the contract today.")],
    offer_think: [t("Claro. | Tómese su tiempo | y | me | avisa | el | viernes.", "Of course. | Take your time | and | me | you-let-know | on | Friday.", "Of course. Take your time, and let me know by Friday.", { flags: { 5: "el before a day: English says on." } })],
    offer_no: [t("Ah, | entiendo. | Bueno, | gracias | por | su | tiempo.", "Oh, | I understand. | Well, | thanks | for | your | time.", "Oh, I see. Well, thank you for your time.")],
    offer_really: [t("¡Sí, | en serio! | ¿Acepta | el | puesto?", "Yes, | really! | Do you accept | the | position?", "Yes, really! Will you take the job?")],
    offer_again: [t("Entonces, | ¿acepta | el | puesto?", "So, | do you accept | the | position?", "So, will you take the job?")],
    // The phone (twist)
    phone: [t("Ay, | perdóneme, | tengo | que | contestar | esta | llamada. | Ahorita | regreso.", "Oh, | forgive me, | I have | to | answer | this | call. | In a moment | I'm-back.",
      "Oh, I'm so sorry, I need to take this call. I'll be right back.", {
        flags: { 7: "Mexican: ahorita = in a moment." },
        neutral: t("Ay, | perdóneme, | tengo | que | contestar | esta | llamada. | Enseguida | regreso.", "Oh, | forgive me, | I have | to | answer | this | call. | Right away | I'm-back.",
          "Oh, I'm so sorry, I need to take this call. I'll be right back.") })],
    phone_back: [
      t("Gracias | por | esperar. | ¡Perdón | por | la | interrupción!", "Thanks | for | waiting. | Sorry | for | the | interruption!", "Thank you for waiting. Sorry about that!"),
      t("¡Perdón! | ¿En | qué | íbamos?", "Sorry! | In | what | were we going?", "Sorry about that! Where were we?"),
    ],
    // Side moves
    nervous_ok: [
      t("No se preocupe, | lo | está | haciendo | muy | bien.", "Don't worry, | it | you're | doing | very | well.", "Don't worry, you're doing great!"),
      t("Es | normal. | Va | muy | bien.", "It's | normal. | You're going | very | well.", "That's totally normal. You're doing great."),
    ],
    resume_thanks: [t("¡Gracias! | Aquí | lo | tengo.", "Thanks! | Here | it | I-have.", "Thank you! I have it right here.")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Ya veo.", "I see.", "I see.")],
  },
  domains: { time: () => [T930] },

  hints: {
    arrive: { lt: "Say you're here for an interview", items: [
      { id: "have_interview", s: t("Buenos días, | tengo | una | entrevista | a | las | nueve | y media.", "Good morning, | I-have | an | interview | at | — | nine | thirty.", "Good morning, I have an interview at 9:30.",
        { flags: { 5: "a las nueve: Spanish says the hour with la / las." } }) },
      { id: "here_for", s: t("Vengo | a | una | entrevista | de | trabajo.", "I'm coming | to | an | interview | for | work.", "I'm here for a job interview.") },
      { id: "here_see", s: t("Vengo | a | ver | a | la | licenciada | Salinas.", "I'm coming | to | see | — | — | Licenciada | Salinas.", "I'm here to see Ms. Salinas.",
        { flags: { 3: "Personal a: Spanish marks a person as the object.", 4: "Spanish puts la before a title.", 5: "Licenciada: the title of a university graduate." } }) },
      { id: "intro_full", s: t("Mucho gusto, | soy | {$name} | {$surname}.", "Nice to meet you, | I'm | {$name} | {$surname}.", "Nice to meet you, I'm {$name} {$surname}.") },
      { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
    ] },
    name: { lt: "Say your name", items: [
      { id: "intro_full", s: t("Soy | {$name} | {$surname}.", "I'm | {$name} | {$surname}.", "I'm {$name} {$surname}.") },
      { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
      { id: "my_name_is", s: t("Mi | nombre | es | {$name} | {$surname}.", "My | name | is | {$name} | {$surname}.", "My name is {$name} {$surname}.") },
    ] },
    found: { lt: "Say whether it was easy to find", items: [
      { id: "found_no_problem", s: t("Sí, | sin problema.", "Yes, | no problem.", "Yes, no problem.") },
      { id: "found_easy", s: t("Sí, | fue | muy | fácil.", "Yes, | it was | very | easy.", "Yes, it was easy to find.") },
      { id: "found_lost", s: t("Me perdí | un | poco.", "I got lost | a | little.", "I got a little lost.") },
      { id: "found_traffic", s: t("Había | mucho | tráfico.", "There was | a lot of | traffic.", "There was a lot of traffic.") },
    ] },
    drink: { lt: "Say whether you'd like water or coffee", items: [
      { id: "water", s: t("Un | vaso | de | agua, | por favor.", "A | glass | of | water, | please.", "Some water, please.") },
      { id: "no_fine", s: t("No, | gracias, | así | estoy | bien.", "No, | thanks, | like this | I'm | fine.", "No, I'm fine, thanks."), note: "A polite no: “I'm fine as I am.”" },
      { id: "coffee", s: t("Un | café, | gracias.", "A | coffee, | thanks.", "Coffee would be great, thanks.") },
    ] },
    years: { lt: "Say how long you've worked", items: [
      { id: "years_about", s: t("Como | diez | años.", "About | ten | years.", "About ten years.") },
      { id: "years_for", s: t("Desde hace | cinco | años.", "For | five | years.", "For five years.") },
      { id: "years_since", s: t("Desde | el | 2015.", "Since | — | 2015.", "Since 2015.", { say: "Desde el dos mil quince.", flags: { 1: "Mexicans often say a year with el: desde el 2015." } }) },
    ] },
    studied: { lt: "Say what you studied", items: [
      { id: "studied", s: t("Estudié | mercadotecnia.", "I studied | marketing.", "I studied marketing.") },
      { id: "studied", s: t("Estudié | administración.", "I studied | business administration.", "I studied business administration.") },
    ] },
    phone: { lt: "Say it's no problem", items: [
      { id: "np_sure", s: t("Claro, | no hay problema.", "Sure, | no problem.", "Sure, no problem.") },
      { id: "np_go", s: t("¡Adelante!", "Go ahead!", "Go ahead!") },
      { id: "np_worry", s: t("No se preocupe.", "Don't worry.", "Don't worry about it.") },
    ] },
    improve: { lt: "Say how you're working on it", items: [
      { id: "wk_classes", s: t("Estoy | tomando | clases.", "I'm | taking | classes.", "I'm taking classes.") },
      { id: "wk_lists", s: t("Hago | listas.", "I-make | lists.", "I make lists.") },
      { id: "wk_say_no", s: t("Estoy | aprendiendo | a | decir | que | no.", "I'm | learning | to | say | — | no.", "I'm learning to say no.", { flags: { 4: "decir que no: que links the verb to what is said." } }) },
    ] },
    range: { lt: "Say whether the range works for you", items: [
      { id: "range_yes", s: t("Sí, | me parece | bien.", "Yes, | it seems to me | good.", "Yes, that works for me.") },
      { id: "range_more", s: t("Esperaba | un | poco | más.", "I was hoping for | a | little | more.", "I was hoping for a little more.") },
    ] },
    no_q: { lt: "Say you have no more questions", items: [
      { id: "q_none", s: t("No, | todo | está | muy | claro.", "No, | everything | is | very | clear.", "No, everything's very clear.") },
      { id: "q_none_all", s: t("No, | es | todo. | Gracias.", "No, | it's | all. | Thanks.", "No, that's all. Thank you.") },
    ] },
    about_job: {
      lt: "Say what you do", slot: "job", examples: ["contador", "enfermero", "maestro_ingles", "ingeniero", "chofer"],
      items: [
        { id: "job_im", s: t("Soy | {X}.", "I'm | {X}.", "I'm {X.np}."), note: "No article after soy with a job: “Soy enfermera”." },
        { id: "job_work_as", s: t("Trabajo | como | {X}.", "I work | as | {X}.", "I work as {X.np}.") },
        { id: "job_im", s: t("Soy | {X} | con | diez | años | de | experiencia.", "I'm | {X} | with | ten | years | of | experience.", "I'm {X.np} with ten years of experience.") },
        { id: "job_been", s: t("Tengo | cinco | años | trabajando | como | {X}.", "I-have | five | years | working | as | {X}.", "I've been working as {X.np} for five years.", {
          flags: { 0: "Mexican: tengo cinco años trabajando = I've been working for five years." },
          neutral: t("Llevo | cinco | años | trabajando | como | {X}.", "I've-spent | five | years | working | as | {X}.", "I've been working as {X.np} for five years.") }) },
        { id: "job_was", s: t("Antes | trabajaba | como | {X}.", "Before | I-worked | as | {X}.", "I used to work as {X.np}.") },
      ],
    },
    about_field: {
      lt: "Say what field you work in", slot: "field", examples: ["ventas", "turismo", "contabilidad", "atencion", "informatica"],
      items: [
        { id: "f_work_in", s: t("Trabajo | en | {X}.", "I work | in | {X}.", "I work in {X}.") },
        { id: "f_exp", s: t("Tengo | diez | años | de | experiencia | en | {X}.", "I-have | ten | years | of | experience | in | {X}.", "I have ten years of experience in {X}.") },
        { id: "f_years", s: t("Llevo | veinte | años | en | {X}.", "I've-spent | twenty | years | in | {X}.", "I've been in {X} for twenty years.") },
        { id: "f_background", s: t("Mi | experiencia | es | en | {X}.", "My | experience | is | in | {X}.", "My background is in {X}.") },
      ],
    },
    about_more: { lt: "Tell her more about yourself", items: [
      { id: "from_us", s: t("Soy | de | Canadá.", "I'm | from | Canada.", "I'm from Canada.") },
      { id: "moved", s: t("Me mudé | aquí | hace | dos | meses.", "I moved | here | ago | two | months.", "I moved here two months ago.", { flags: { 2: "hace + a time = ago (English puts ago after)." } }) },
      { id: "no_exp", s: t("Todavía | no tengo | mucha | experiencia.", "Yet | I don't have | much | experience.", "I don't have much experience yet.") },
      { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
    ] },
    leaving: { lt: "Say why you're looking for a new job", items: [
      { id: "l_moved", s: t("Me mudé | aquí | con | mi | familia.", "I moved | here | with | my | family.", "I moved here with my family.") },
      { id: "l_challenge", s: t("Busco | un | nuevo | reto.", "I'm looking for | a | new | challenge.", "I'm looking for a new challenge.") },
    ] },
    why: { lt: "Say why you want to work here", items: [
      { id: "w_like", s: t("Me gusta | mucho | su | empresa.", "I like | a lot | your | company.", "I really like your company.") },
      { id: "w_grow", s: t("Quiero | crecer | y | aprender | cosas | nuevas.", "I want | to grow | and | to learn | things | new.", "I want to grow and learn new things.") },
      { id: "w_challenge", s: t("Estoy | {m:listo|f:lista} | para | un | nuevo | reto.", "I'm | ready | for | a | new | challenge.", "I'm ready for a new challenge.") },
      { id: "w_heard", s: t("He escuchado | cosas | muy | buenas | de | Línea Clara.", "I've heard | things | very | good | about | Línea Clara.", "I've heard great things about Línea Clara.") },
      { id: "w_use", s: t("Quiero | aplicar | mi | experiencia | aquí.", "I want | to apply | my | experience | here.", "I'd like to use my experience here.") },
      { id: "w_people", s: t("Me gusta | trabajar | con | la | gente.", "I like | to work | with | — | people.", "I enjoy working with people.", { flags: { 3: "la gente: Spanish uses the article for people in general." } }) },
      { id: "w_reputation", s: t("Su | empresa | tiene | muy | buena | reputación.", "Your | company | has | very | good | reputation.", "Your company has a great reputation.") },
    ] },
    strengths: {
      lt: "Name your strengths", slot: "strength", examples: ["organized", "responsible", "punctual", "patient", "hardworking"],
      items: [
        { id: "s_very", s: t("Soy | muy | {X}.", "I'm | very | {X}.", "I'm very {X}.") },
        { id: "learn_fast", s: t("Aprendo | rápido.", "I-learn | fast.", "I learn fast.") },
        { id: "s_say", s: t("Diría | que | soy | {X}.", "I'd say | that | I'm | {X}.", "I'd say I'm {X}.") },
        { id: "s_people", s: t("La | gente | dice | que | soy | {X}.", "— | People | say | that | I'm | {X}.", "People say I'm {X}.", { flags: { 0: "la gente: Spanish uses the article for people in general." } }) },
      ],
    },
    strengths_more: { lt: "Say what you do well", items: [
      { id: "learn_fast", s: t("Aprendo | rápido.", "I-learn | fast.", "I learn fast.") },
      { id: "good_people", s: t("Soy | {m:bueno|f:buena} | con | los | clientes.", "I'm | good | with | the | customers.", "I'm good with customers.") },
      { id: "team_well", s: t("Trabajo | bien | en equipo.", "I work | well | as a team.", "I work well in a team.") },
      { id: "never_late", s: t("Nunca | llego | tarde.", "Never | I-arrive | late.", "I'm never late.") },
      { id: "s_very", s: t("Soy | {m:organizado|f:organizada} | y | aprendo | rápido.", "I'm | organized | and | I-learn | fast.", "I'm organized, and I learn fast.") },
      { id: "pressure", s: t("Mantengo | la | calma | bajo | presión.", "I-keep | — | calm | under | pressure.", "I stay calm under pressure.", { flags: { 1: "Spanish says la calma (the calm)." } }) },
      { id: "s_ganas", s: t("Le | echo | muchas | ganas.", "(To) it | I-throw | lots of | eagerness.", "I always give it my all.", {
        flags: { 1: "Mexican: echarle ganas = to put your heart into it (le goes with it)." },
        neutral: t("Trabajo | con | muchas | ganas.", "I-work | with | lots of | eagerness.", "I always give it my all.") }) },
      { id: "not_afraid", s: t("No tengo | miedo | de | preguntar.", "I don't have | fear | of | asking.", "I'm not afraid to ask.") },
      { id: "langs", s: t("Hablo | tres | idiomas.", "I-speak | three | languages.", "I speak three languages.") },
    ] },
    weakness: { lt: "Name a weakness (and how you're working on it)", items: [
      { id: "wk_hard", s: t("A veces | trabajo | demasiado.", "Sometimes | I-work | too much.", "Sometimes I work too hard.") },
      { id: "wk_perfectionist", s: t("Soy | un | poco | perfeccionista.", "I'm | a | little | perfectionist.", "I'm a bit of a perfectionist.") },
      { id: "wk_impatient", s: t("A veces | soy | un | poco | impaciente.", "Sometimes | I'm | a | little | impatient.", "I can be a little impatient.") },
      { id: "wk_spanish", s: t("Mi | español | todavía | no es | perfecto, | pero | estoy | tomando | clases.", "My | Spanish | yet | isn't | perfect, | but | I'm | taking | classes.",
        "My Spanish isn't perfect yet, but I'm taking classes.") },
      { id: "wk_public", s: t("Me cuesta | hablar | en | público.", "It's hard for me | to speak | in | public.", "Public speaking isn't easy for me.") },
      { id: "wk_area", s: t("Mi | área | de | oportunidad | es | la | paciencia.", "My | area | of | opportunity | is | — | patience.", "Patience is something I'm working on.", {
        flags: { 1: "Mexican office Spanish: área de oportunidad = something you can improve.", 5: "Spanish uses the article with qualities: la paciencia." },
        neutral: t("Mi | debilidad | es | la | paciencia.", "My | weakness | is | — | patience.", "Patience is my weakness.", { flags: { 3: "Spanish uses the article with qualities: la paciencia." } }) }) },
      { id: "wk_better", s: t("Pero | estoy | mejorando.", "But | I'm | improving.", "But I'm getting better.") },
    ] },
    future: { lt: "Say where you see yourself in five years", items: [
      { id: "fu_here", s: t("Aquí mismo, | con | ustedes.", "Right here, | with | you.", "Right here, with you.") },
      { id: "fu_lead", s: t("Me gustaría | dirigir | un | equipo.", "I'd like | to lead | a | team.", "I'd like to lead a team.") },
      { id: "fu_grow", s: t("Espero | crecer | con | la | empresa.", "I hope | to grow | with | the | company.", "I hope to grow with the company.") },
      { id: "fu_management", s: t("En | un | puesto | de | gerente.", "In | a | position | of | manager.", "In a management position.") },
      { id: "fu_become", s: t("Me gustaría | ser | líder | de | equipo.", "I'd like | to be | leader | of | team.", "I'd like to become a team leader.") },
    ] },
    teamwork: { lt: "Tell her about working on a team", items: [
      { id: "tw_project", s: t("En | mi | último | trabajo | terminamos | un | proyecto | grande | a tiempo.", "In | my | last | job | we-finished | a | project | big | on time.",
        "At my last job, we finished a big project on time.") },
      { id: "tw_together", s: t("Trabajábamos | en equipo.", "We-worked | as a team.", "We worked together as a team.") },
      { id: "tw_each_other", s: t("Nos | ayudábamos | mucho.", "Each other | we-helped | a lot.", "We helped each other a lot.") },
      { id: "tw_helped", s: t("Ayudé | a | un | compañero | nuevo.", "I helped | — | a | colleague | new.", "I helped a new colleague.", { flags: { 1: "Personal a: Spanish marks a person as the object." } }) },
      { id: "tw_team_of", s: t("Trabajé | en | un | equipo | de | cinco | personas.", "I worked | in | a | team | of | five | people.", "I worked in a team of five people.") },
    ] },
    languages: {
      lt: "Say what languages you speak", slot: "language", examples: ["frances", "aleman", "portugues", "chino"],
      items: [
        { id: "l_speak", s: t("Hablo | inglés | y | {X}.", "I-speak | English | and | {X}.", "I speak English and {X}."), only: (e) => !["ingles", "espanol", "italiano"].includes(e.id) },
        { id: "l_native", s: t("Mi | idioma | materno | es | el | {X}.", "My | language | native | is | — | {X}.", "My native language is {X}.", { flags: { 4: "Spanish uses the article with a language here: el inglés." } }) },
        { id: "l_little", s: t("También | hablo | un | poco | de | {X}.", "Also | I-speak | a | little | of | {X}.", "I also speak a little {X}.") },
      ],
    },
    authorized: { lt: "Say whether you can work in Mexico", items: [
      { id: "a_res", s: t("Sí, | soy | residente | permanente.", "Yes, | I'm | resident | permanent.", "Yes, I'm a permanent resident.") },
      { id: "a_permit", s: t("Sí, | tengo | permiso | para | trabajar.", "Yes, | I-have | permission | to | work.", "Yes, I have a work permit.") },
      { id: "a_waiting", s: t("Todavía no. | Mi | permiso | está | en trámite.", "Not yet. | My | permit | is | in process.", "Not yet. My work permit is still being processed.") },
    ] },
    salary: { lt: "Say what salary you're hoping for (or ask the range)", items: [
      { id: "s_amount", s: t("Alrededor de | dieciocho | mil | pesos | al mes.", "Around | eighteen | thousand | pesos | a month.", "Around eighteen thousand pesos a month.") },
      { id: "s_flexible", s: t("Estoy | {m:abierto|f:abierta} | a | negociar.", "I'm | open | to | negotiating.", "I'm open to negotiating.") },
      { id: "s_range_q", s: t("¿Cuál | es | el | rango | para | este | puesto?", "What | is | the | range | for | this | position?", "What's the range for this position?") },
      { id: "s_range", s: t("Entre | quince | y | dieciocho | mil | pesos.", "Between | fifteen | and | eighteen | thousand | pesos.", "Something between 15,000 and 18,000 pesos.") },
      { id: "s_negotiable", s: t("Es | negociable.", "It's | negotiable.", "It's negotiable.") },
    ] },
    start: { lt: "Say when you could start", items: [
      { id: "st_monday", s: t("Puedo | empezar | el | próximo | lunes.", "I-can | start | — | next | Monday.", "I can start next Monday.", { flags: { 2: "el before a day: English says on (or nothing, with next)." } }) },
      { id: "st_asap", s: t("Lo antes posible.", "As soon as possible.", "As soon as possible.") },
      { id: "st_weeks", s: t("En | dos | semanas.", "In | two | weeks.", "In two weeks.") },
      { id: "st_notice", s: t("Tengo | que | avisar | en | mi | trabajo | actual.", "I-have | to | give notice | at | my | job | current.", "I need to give notice at my current job.") },
    ] },
    hire: { lt: "Say why they should hire you", items: [
      { id: "h_experience", s: t("Tengo | la | experiencia | que | buscan.", "I-have | the | experience | that | you're looking for.", "I have the experience you're looking for.") },
      { id: "s_very", s: t("Porque | soy | {m:organizado|f:organizada} | y | aprendo | rápido.", "Because | I'm | organized | and | I-learn | fast.", "Because I'm organized, and I learn fast.") },
      { id: "h_right", s: t("Soy | la | persona | indicada | para | este | puesto.", "I'm | the | person | right | for | this | position.", "I'm the right person for this job.") },
      { id: "h_chance", s: t("Deme | una | oportunidad | y | va a ver.", "Give me | a | chance | and | you'll see.", "Give me a chance, and you'll see!") },
    ] },
    ask_them: { lt: "Ask about the job: hours, training, start date", items: [
      { id: "q_hours", s: t("¿Cuál | es | el | horario?", "What | is | the | schedule?", "What are the working hours?") },
      { id: "q_training", s: t("¿Hay | capacitación?", "Is there | training?", "Is there any training?") },
      { id: "q_start", s: t("¿Cuándo | empezaría?", "When | would I start?", "When would I start?") },
    ] },
    ask_them2: { lt: "Ask about the team, home office, benefits", items: [
      { id: "q_team", s: t("¿De | cuántas | personas | es | el | equipo?", "Of | how many | people | is | the | team?", "How big is the team?") },
      { id: "q_remote", s: t("¿Se puede | hacer | home office?", "Can one | do | home office?", "Can I work from home?", {
        flags: { 2: "Mexican: home office, from English, = working from home." },
        neutral: t("¿Se puede | trabajar | desde | casa?", "Can one | work | from | home?", "Can I work from home?") }) },
      { id: "q_benefits", s: t("¿Qué | prestaciones | tiene | el | puesto?", "What | benefits | does it have | the | position?", "What are the benefits?"), note: "Prestaciones: the benefits that come with a job in Mexico (social security, aguinaldo, vacation…)." },
    ] },
    ask_them3: { lt: "Ask about a typical day and the next steps", items: [
      { id: "q_day", s: t("¿Cómo | es | un | día | normal | aquí?", "How | is | a | day | normal | here?", "What does a typical day look like?") },
      { id: "q_next", s: t("¿Cuáles | son | los | siguientes | pasos?", "What | are | the | next | steps?", "What are the next steps?") },
      { id: "q_dress", s: t("¿Hay | código | de | vestimenta?", "Is there | a code | of | dress?", "Is there a dress code?") },
    ] },
    closing: { lt: "Say thank you and goodbye", items: [
      { id: "c_thanks_time", s: t("Muchas | gracias | por | su | tiempo.", "Many | thanks | for | your | time.", "Thank you for your time.") },
      { id: "c_nice_meet", s: t("Fue | un | gusto | conocerla.", "It was | a | pleasure | to meet you.", "It was nice to meet you.") },
      { id: "c_opportunity", s: t("Gracias | por | la | oportunidad.", "Thanks | for | the | opportunity.", "Thank you for the opportunity.") },
      { id: "c_look_forward", s: t("Quedo | {m:atento|f:atenta} | a | su | llamada.", "I-remain | attentive | to | your | call.", "I look forward to hearing from you."), note: "Very common in Mexican business: “Quedo atento / atenta…”." },
    ] },
    offer: { lt: "Answer the job offer", items: [
      { id: "o_accept", s: t("¡Muchas | gracias! | ¡Acepto!", "Many | thanks! | I accept!", "Thank you! I accept!") },
      { id: "o_wonderful", s: t("¡Qué | buena | noticia!", "What | good | news!", "That's wonderful news!") },
      { id: "o_think", s: t("¿Lo | puedo | pensar?", "It | can I | think over?", "Can I think about it?") },
    ] },
    side: { lt: "Say you're nervous, or ask her to repeat", items: [
      { id: "x_nervous", s: t("Perdón, | estoy | un | poco | {m:nervioso|f:nerviosa}.", "Sorry, | I'm | a | little | nervous.", "Sorry, I'm a little nervous.") },
      { id: "c_say_again", s: t("¿Me | puede | repetir | la | pregunta?", "(To) me | can you | repeat | the | question?", "Could you repeat the question, please?") },
      { id: "x_resume", s: t("Aquí tiene | mi | currículum.", "Here's | my | résumé.", "Here's my résumé.") },
    ] },
  },
  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! In an interview, usted is more polite: ¿Puede…?, ¿Cómo se llama? (tú forms are for friends and colleagues).", better: "¿Cómo se llama usted?" },
    need_job: { key: "need_job", lt: "Understood! In an interview, say what attracts you: “Me interesa mucho el puesto”.", better: "Me interesa mucho el puesto." },
    neg_boss: { key: "neg_boss", lt: "Understood! A tip: in an interview, don't speak badly of your old job or boss. Talk about what you're looking for.", better: "Busco un nuevo reto." },
    neg_money: { key: "neg_money", lt: "Understood! A tip: in an interview, put growth before money: “Quiero crecer profesionalmente”.", better: "Quiero crecer profesionalmente." },
  },
  merges: {
    "soy yo": { reason: "lexical_expression", split: "soy → I am + yo → I misreads the set reply: it's me.", minimal: "Two words." },
    "recursos humanos": { reason: "lexical_expression", split: "recursos → resources + humanos → human reverses the department's name: human resources.", minimal: "Two words." },
    "me perdí": { reason: "grammatical_fusion", split: "me → myself + perdí → I lost gives a false object; perderse = get lost.", minimal: "The pronoun and the verb." },
    "me mudé": { reason: "grammatical_fusion", split: "me → myself + mudé → I moved gives a false object; mudarse = to move house.", minimal: "The pronoun and the verb." },
    "me cuesta": { reason: "grammatical_fusion", split: "me → to me + cuesta → it costs misreads the verb: it's hard for me.", minimal: "The pronoun and the verb." },
    "me alegra": { reason: "grammatical_fusion", split: "me → me + alegra → it gladdens is a word-for-word reading: I'm glad.", minimal: "The pronoun and the verb." },
    "he escuchado": { reason: "grammatical_fusion", split: "he → I have + escuchado → heard: the perfect tense is one English verb (I've heard).", minimal: "The auxiliary and the participle." },
    "línea clara": { reason: "lexical_expression", split: "línea → line + clara → clear would translate the company's name.", minimal: "The two-word name only." },
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → port + colibrí → hummingbird would translate the town's proper name.", minimal: "The two-word name only." },
    "en equipo": { reason: "lexical_expression", split: "en → in + equipo → team misreads the phrase: as a team.", minimal: "Two words." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time misreads the phrase: on time.", minimal: "Two words." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → it + menos → less misreads the phrase: at least.", minimal: "Three words." },
    "alrededor de": { reason: "lexical_expression", split: "alrededor → around + de → of misreads the approximation: around (a number).", minimal: "Two words." },
    "al mes": { reason: "lexical_expression", split: "al → to the + mes → month misreads the rate: a month.", minimal: "Two words." },
    "a la semana": { reason: "lexical_expression", split: "a → to + la → the + semana → week misreads the rate: a week.", minimal: "Three words." },
    "más adelante": { reason: "lexical_expression", split: "más → more + adelante → ahead misreads the time: later.", minimal: "Two words." },
    "lo antes posible": { reason: "lexical_expression", split: "lo → it + antes → before + posible → possible misreads the phrase: as soon as possible.", minimal: "Three words." },
    "va a ver": { reason: "lexical_expression", split: "va → goes + a → to + ver → see is a motion reading of the future: you'll see.", minimal: "Three words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → no misreads the answer: not yet.", minimal: "Two words." },
    "en trámite": { reason: "lexical_expression", split: "en → in + trámite → procedure misreads the phrase: being processed.", minimal: "Two words." },
    "desde hace": { reason: "lexical_expression", split: "desde → since + hace → it makes misreads the duration: for (a time).", minimal: "Two words." },
    "para servirle": { reason: "lexical_expression", split: "para → for + servirle → to serve you misreads the courtesy: at your service.", minimal: "Two words." },
    "al contrario": { reason: "lexical_expression", split: "al → to the + contrario → contrary misreads the reply: no, thank you (on the contrary).", minimal: "Two words." },
    "con mucho gusto": { reason: "lexical_expression", split: "con → with + mucho → much + gusto → pleasure; one courtesy = my pleasure.", minimal: "Three words." },
    "hoy mismo": { reason: "lexical_expression", split: "hoy → today + mismo → same misreads the emphasis: this very day.", minimal: "Two words." },
    "a más tardar": { reason: "lexical_expression", split: "a → to + más → more + tardar → to take long misreads the deadline: at the latest.", minimal: "Three words." },
    "de ley": { reason: "lexical_expression", split: "de → of + ley → law misreads the phrase: required by law.", minimal: "Two words." },
    "seguro social": { reason: "lexical_expression", split: "seguro → insurance/sure + social → social; one institution = social security.", minimal: "Two words." },
    "casual de negocios": { reason: "lexical_expression", split: "casual → casual + de → of + negocios → business reverses the dress code's name: business casual.", minimal: "Three words." },
    "tómese su tiempo": { reason: "lexical_expression", split: "tómese → take (usted) + su → your + tiempo → time; one set phrase = take your time.", minimal: "Three words." },
    "aquí mismo": { reason: "lexical_expression", split: "aquí → here + mismo → same misreads the emphasis: right here.", minimal: "Two words." },
    "de tiempo completo": { reason: "lexical_expression", split: "de → of + tiempo → time + completo → complete misreads the phrase: full-time.", minimal: "Three words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious misreads the phrase: really.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth misreads the hedge: honestly.", minimal: "Two words." },
    "home office": { reason: "lexical_expression", split: "A loan from English used as one Spanish term (working from home).", minimal: "Two words." },
  },

  steps: [
    { id: "arrive", done: (c) => !!c.s.arrived,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "interview" ? "greet_interview" : "greet_help", { time: T930 }); }
        else { c.s.lastQ = "interview"; c.say("purpose_again"); }
      },
      expects: ["arrive", "intro_name", "intro_ctx"],
      suggest: [S_ARRIVE, S_SIDE],
      yes: (c) => {
        if (c.s.lastQ === "interview") { arrived(c); return; }
        c.s.lastQ = "interview"; c.say("purpose_again"); c.hold();
      },
      no: (c) => { c.s.lastQ = "help"; c.say("how_help"); c.hold(); } },
    { id: "name", when: (c) => !!c.s.arrived, done: (c) => !!c.s.named || c.s.nameAsked >= 3,
      ask: (c) => c.say(c.s.nameAsked++ ? "name_again" : "ask_name"),
      expects: ["intro_name", "intro_ctx"], suggest: [S_NAME] },
    { id: "found", when: (c) => !!c.s.named && c.s.small === "found", done: (c) => !!c.s.smallDone || asked(c, "found") >= 2,
      ask: (c) => { bump(c, "found"); c.say("ask_found"); },
      expects: ["found_ok", "found_hard", "found_ctx"],
      suggest: [{ lt: "Say whether it was easy to find the office", hint: "found" }],
      yes: (c) => { c.s.smallDone = true; c.say("found_good"); },
      no: (c) => { c.s.smallDone = true; c.say("found_bad"); } },
    { id: "drink", when: (c) => !!c.s.named && c.s.small === "drink", done: (c) => !!c.s.smallDone || asked(c, "drink") >= 2,
      ask: (c) => { bump(c, "drink"); c.say("offer_drink"); },
      expects: ["want_drink", "no_drink"],
      suggest: [{ lt: "Say whether you'd like water or coffee", hint: "drink" }],
      yes: (c) => { c.s.smallDone = true; giveDrink(c, false); },
      no: (c) => { c.s.smallDone = true; c.say("no_drink_ok"); } },
    { id: "about", when: (c) => !!c.s.named, done: aboutDone,
      ask: (c) => askAbout(c),
      expects: ABOUT_INTENTS,
      suggest: [S_JOB, S_FIELD, S_ABOUT_MORE],
      help: (c) => { c.say("what_know_help"); } },
    { id: "leaving", when: (c) => qOn("leaving")(c) && !me(c).noExp && !me(c).student, done: done("leaving"), ask: (c) => { bump(c, "leaving"); c.say("ask_leaving"); },
      expects: ["leaving_ans", "moved", "between_jobs"], suggest: [{ lt: "Say why you're looking for a new job", hint: "leaving" }],
      help: (c) => { c.say("ack"); c.s.done.leaving = true; } },
    { id: "why", when: (c) => !!c.s.named, done: done("why"),
      ask: (c) => { bump(c, "why"); c.say("ask_why"); },
      expects: ["why_ans", "strength", "hire_ans"], suggest: [{ lt: "Say why you want to work here", hint: "why" }],
      help: (c) => { c.say("why_ack"); c.s.done.why = true; } },
    // Twist: the phone rings (returning visits). Asked once; any answer moves on.
    { id: "phone", when: (c) => !!c.s.phoneTwist && !!c.s.named && !!c.s.done.why, done: (c) => !!c.s.phoneAsked,
      ask: (c) => { c.s.phoneAsked = true; c.twist("phone"); c.say("phone"); },
      expects: ["no_problem"], suggest: [{ lt: "Say it's no problem", hint: "phone" }],
      yes: (c) => { c.say("phone_back"); }, no: (c) => { c.say("phone_back"); } },
    { id: "strengths", when: (c) => !!c.s.named, done: done("strengths"),
      ask: (c) => { bump(c, "strengths"); c.say("ask_strengths"); },
      expects: STRENGTH_INTENTS, suggest: [S_STRENGTH, S_STRENGTH_MORE],
      help: (c) => { c.say("strength_help"); } },
    { id: "weakness", when: qOn("weakness"), done: done("weakness"), ask: (c) => { bump(c, "weakness"); c.say("ask_weakness"); },
      expects: ["weakness", "working_on_it", "no_weakness", "no_weakness_ctx", "not_strength"], suggest: [{ lt: "Name a weakness (and how you're working on it)", hint: "weakness" }] },
    { id: "teamwork", when: qOn("teamwork"), done: done("teamwork"), ask: (c) => { bump(c, "teamwork"); c.say("ask_teamwork"); },
      expects: ["teamwork_ans", "story_ctx", "no_team", "strength"], suggest: [{ lt: "Tell her briefly about working on a team", hint: "teamwork" }],
      help: (c) => { c.say("example_help"); } },
    { id: "future", when: qOn("future"), done: done("future"),
      ask: (c) => { bump(c, "future"); c.say("ask_future"); },
      expects: ["future_ans", "future_away"], suggest: [{ lt: "Say where you see yourself in five years", hint: "future" }],
      help: (c) => { c.say("future_help"); } },
    { id: "languages", when: qOn("languages"), done: done("languages"), ask: (c) => { bump(c, "languages"); c.say("ask_languages"); },
      expects: ["languages_ans", "languages_ctx"], suggest: [{ lt: "Say what languages you speak", hint: "languages", options: "language" }] },
    { id: "authorized", when: qOn("authorized"), done: done("authorized"), ask: (c) => { bump(c, "authorized"); c.say("ask_authorized"); },
      expects: ["auth_yes", "auth_pending"], suggest: [{ lt: "Say whether you can work in Mexico", hint: "authorized" }],
      yes: (c) => { c.s.done.authorized = true; c.say("auth_yes_ack"); },
      no: (c) => { c.s.done.authorized = true; c.say("auth_pending_ack"); } },
    { id: "salary", when: qOn("salary"), done: done("salary"), ask: (c) => { bump(c, "salary"); c.say("ask_salary"); },
      expects: ["salary_ans", "salary_flexible", "salary_range_q", "salary_more", "range_ctx"], suggest: [{ lt: "Say what salary you're hoping for (or ask the range)", hint: "salary" }],
      help: (c) => { interview.handlers.salary_range_q(c, {}, { intent: "salary_range_q", slots: {}, tags: [] }); } },
    { id: "start", when: qOn("start"), done: done("start"), ask: (c) => { bump(c, "start"); c.say("ask_start"); },
      expects: ["start_ans", "start_ctx"], suggest: [{ lt: "Say when you could start", hint: "start" }] },
    { id: "hire", when: qOn("hire"), done: done("hire"),
      ask: (c) => { bump(c, "hire"); c.say(asked(c, "hire") > 1 ? "ask_hire_again" : "ask_hire"); },
      expects: ["hire_ans", ...STRENGTH_INTENTS], suggest: [{ lt: "Say why they should hire you", hint: "hire" }, S_STRENGTH] },
    { id: "questions", when: (c) => !!c.s.named, done: (c) => !!c.s.qDone || asked(c, "questions") >= 6,
      ask: (c) => {
        bump(c, "questions");
        if (!c.s.qAsked) { c.s.qAsked = true; c.say(c.s.qCount ? "ask_questions_other" : "ask_questions"); }
        else c.say("ask_more_q");
        // the model questions move on to ones the learner hasn't asked yet
        const [set, , label] = Q_SETS.find(([, keys]) => keys.every((k) => !c.s.asked[k])) ?? Q_SETS.find(([, keys]) => keys.some((k) => !c.s.asked[k])) ?? Q_SETS[2];
        const sg: Suggestion[] = [{ lt: label, hint: set }, S_NO_Q];
        c.expect({ id: "questions", optional: true, expects: Q_INTENTS, suggest: sg, hints: [set, "no_q"],
          on: {
            g_bye: (cc) => { cc.s.qDone = true; cc.s.byeNow = true; },
            g_thanks: (cc) => (/\b(adios|hasta luego|hasta pronto|nos vemos|que (tenga|le vaya))\b/.test(heard(cc)) ? undefined : false),
          } });
      },
      expects: Q_INTENTS,
      suggest: [S_ASK, S_NO_Q],
      yes: (c) => {
        // "Sí (tengo una)" invites the question; "Bueno." after "¿Algo más?" closes the round
        const first = asked(c, "questions") <= 1 && !c.s.qCount;
        if (first || /\b(si|claro|de hecho|tengo|una pregunta|otra)\b/.test(heard(c))) { c.say("go_ahead"); c.hold(); return; }
        c.s.qDone = true;
      },
      no: (c) => { c.s.qDone = true; } },
  ],

  init: (c) => {
    c.s.me = {} as Me;
    c.s.done = {};
    c.s.aboutAsks = 0;
    c.s.nameAsked = 0;
    c.s.qCount = 0;
    c.s.asked = {};
    c.s.greetKind = c.chance(0.5) ? "interview" : "help";
    c.s.small = c.chance(0.55) ? (c.chance(0.5) ? "found" : "drink") : null;
    // A different selection of the classic questions on each visit (at most three).
    const pool: [string, number][] = [["weakness", 0.8], ["start", 0.55], ["salary", 0.45], ["future", 0.45], ["hire", 0.45],
      ["teamwork", 0.35], ["leaving", 0.3], ["languages", 0.3], ["authorized", 0.2]];
    const picked = pool.filter(([, p]) => c.chance(p)).map(([id]) => id);
    while (picked.length > 3) picked.splice(picked.indexOf(c.pick(picked.slice(1))), 1);
    c.s.qs = picked;
    c.s.improveQ = c.chance(0.35);
    // Twists (returning visits only)
    c.s.phoneTwist = c.visits >= 1 && c.chance(0.3);
    c.s.offerTwist = c.visits >= 1 && c.chance(0.35);
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- arriving ---
    arrive(c, slots, seg) {
      const tm = slots.time as { h: number; m: number } | undefined;
      if (seg.tags.includes("lic") && !c.s.meSaid) { c.s.meSaid = true; c.say("thats_me"); }
      if (tm && !(tm.h % 12 === 9 && tm.m === 30) && !c.s.timeSaid) { c.s.timeSaid = true; c.say("other_time", { time: T930 }); }
      if (seg.tags.includes("early") && !c.s.earlySaid) { c.s.earlySaid = true; c.say("early_ok"); }
      if (!c.s.arrived) arrived(c);
    },
    intro_name(c, slots, seg) { named(c, slots.name); if (seg.tags.includes("arrive") && !c.s.arrived) arrived(c); },
    intro_ctx(c, slots) {
      named(c, slots.name);
      if (!c.s.arrived && c.s.lastQ === "interview") arrived(c);
      else if (!c.s.arrived) { c.s.lastQ = "interview"; c.say("purpose_again"); c.hold(); }
    },

    // --- small talk ---
    found_ok(c) { if (c.s.small === "found" && !c.s.smallDone) { c.s.smallDone = true; c.say("found_good"); } else c.say("ack"); },
    found_hard(c) { if (c.s.small === "found" && !c.s.smallDone) { c.s.smallDone = true; c.say("found_bad"); } else c.say("ack"); },
    found_ctx(c, s, seg) { if (seg.tags.includes("ok")) interview.handlers.found_ok(c, s, seg); else interview.handlers.found_hard(c, s, seg); },
    want_drink(c, _s, seg) { c.s.smallDone = true; giveDrink(c, seg.tags.includes("coffee")); },
    no_drink(c) { c.s.smallDone = true; c.say("no_drink_ok"); },

    // --- about you ---
    job_is(c, slots, seg) { if (slots.job) setJob(c, slots.job); readExp(c, slots, seg); aboutAck(c, slots); },
    job_ctx(c, slots, seg) { if (slots.job) setJob(c, slots.job); readExp(c, slots, seg); aboutAck(c, slots); },
    job_does(c, slots, seg) {
      // "Doy clases de inglés" names the job unless the learner already said it ("Soy enfermera, cuido pacientes")
      const known = !!me(c).job;
      const duty = slots.duty ?? (seg.tags.includes("ingles") ? "maestro_ingles" : slots.dur ? "maestro" : undefined);
      if (!known && duty) setJob(c, duty);
      readExp(c, slots, seg);
      aboutAck(c, known ? { dur: slots.dur, year: slots.year } : { ...slots, job: duty });
    },
    field_is(c, slots, seg) { if (slots.field) me(c).field = slots.field; readExp(c, slots, seg); aboutAck(c, slots); },
    field_ctx(c, slots, seg) { if (slots.field) me(c).field = slots.field; readExp(c, slots, seg); aboutAck(c, slots); },
    experience(c, slots, seg) {
      if (slots.job) setJob(c, slots.job);
      if (slots.field) me(c).field = slots.field;
      readExp(c, slots, seg);
      if (me(c).years == null) me(c).years = seg.tags.includes("some") ? 2 : 10;
      aboutAck(c, slots);
    },
    years_ctx(c, slots, seg) {
      // a bare figure ("Cinco.") answers "¿Cuántos años…?"
      if (typeof slots.number === "number" && slots.number > 0 && slots.number < 60 && slots.dur == null) me(c).years = slots.number;
      readExp(c, slots, seg);
      if (me(c).years == null) me(c).years = seg.tags.includes("few") ? 1 : 10;
      aboutAck(c, slots);
    },
    no_exp(c, slots, seg) {
      if (slots.field) me(c).field = slots.field;
      me(c).noExp = true;
      c.s.aboutInfo = (c.s.aboutInfo || 0) + 1;
      if (seg.tags.includes("grad")) me(c).grad = true;
      if (c.step === "weakness") { markWeakness(c); return; }
      ackOnce(c, "no_exp_ok");
    },
    no_exp_ctx(c) { me(c).noExp = true; ackOnce(c, "no_exp_ok"); },
    between_jobs(c) { me(c).between = true; if (c.step === "leaving") { c.s.done.leaving = true; } ackOnce(c, "leaving_ack"); },
    own_business(c) { me(c).own = true; ackOnce(c, "about_ack"); },
    from(c, slots) { me(c).from = slots.country; ackOnce(c, slots.country === "mexico" ? "nice" : "from_lt"); },
    moved(c) {
      if (c.step === "leaving") { c.s.done.leaving = true; ackOnce(c, "leaving_ack"); return; }
      if (turn(c).acked) return;
      ackOnce(c, "moved_ack");
      if (!c.s.englishSaid && c.chance(0.5)) { c.s.englishSaid = true; c.say("english_good"); }
    },
    family(c) { ackOnce(c, "nice"); },
    age(c) { ackOnce(c, "about_ack"); },
    studied_unknown(c) { c.s.aboutInfo = (c.s.aboutInfo || 0) + 1; ackOnce(c, "about_ack"); },
    about_name_ctx(c) { /* "Soy Ryan": the name is already known */ },
    not_job(c) { c.s.aboutInfo = (c.s.aboutInfo || 0) + 1; ackOnce(c, "not_job_ack"); },
    why_neg(c) { if (c.step === "why") c.s.done.why = true; ackOnce(c, "why_neg_ack"); },
    q_restroom(c) { c.say("a_restroom"); },
    her_name(c) { c.say("brooks_name"); },
    free_time_unknown(c) { ackOnce(c, "nice"); },
    about_end(c) { if (c.step === "about" && !aboutKnown(c)) return; c.s.aboutAsks = 3; },
    what_know(c) { if (c.step !== "about") { c.say("ack"); return; } c.say("what_know_help"); c.hold(); },

    // --- why a new job / why here ---
    // "¿Por qué busca un nuevo trabajo?" and "¿Por qué aquí?" are often answered with each other's reasons: count them
    // for the question asked
    leaving_ans(c) { if (c.step === "why") { c.s.done.why = true; ackOnce(c, "why_ack"); return; } c.s.done.leaving = true; ackOnce(c, "leaving_ack"); },
    why_ans(c) { if (c.step === "leaving") { c.s.done.leaving = true; ackOnce(c, "leaving_ack"); return; } c.s.done.why = true; ackOnce(c, "why_ack"); },

    // --- strengths ---
    strength(c, slots, seg) { strengthAnswer(c, toArr(slots.strength), seg.tags); },
    strength_ctx(c, slots, seg) { strengthAnswer(c, toArr(slots.strength), seg.tags); },
    not_strength(c) {
      if (c.step === "weakness") { markWeakness(c); return; }
      if (c.step === "strengths" || c.step === "hire") { c.say("not_strength_ack"); c.hold(); return; }
      ackOnce(c, "ack");
    },

    // --- weaknesses ---
    weakness(c) {
      if (/\bespanol\b/.test(heard(c))) { c.s.spanishWeak = true; }
      markWeakness(c);
    },
    working_on_it(c) {
      turn(c).improving = true;
      if (c.s.done.weakness || c.step === "weakness") { c.s.done.weakness = true; ackOnce(c, c.s.spanishWeak ? "english_ack" : "improve_ack"); return; }
      ackOnce(c, "improve_ack");
    },
    no_weakness(c) { noWeakness(c); },
    no_weakness_ctx(c) { noWeakness(c); },

    // --- five years ---
    future_ans(c) { c.s.done.future = true; ackOnce(c, "future_ack"); },
    future_away(c) { c.s.done.future = true; ackOnce(c, "future_away_ack"); },

    // --- teamwork ---
    teamwork_ans(c) { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); },
    story_ctx(c) { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); },
    no_team(c) { c.s.done.teamwork = true; ackOnce(c, "no_team_ack"); },
    example_q(c) { c.say("example_help"); c.hold(); },

    // --- languages ---
    languages_ans(c, slots) { languages(c, toArr(slots.language).length, /\b(tres|cuatro|cinco|varios|muchos)\b/.test(heard(c))); },
    languages_ctx(c, slots) { languages(c, toArr(slots.language).length, false); },

    // --- work permit ---
    auth_yes(c) { if (c.step !== "authorized") { c.say("ack"); return; } c.s.done.authorized = true; c.say("auth_yes_ack"); },
    auth_pending(c) { if (c.step !== "authorized") { c.say("ack"); return; } c.s.done.authorized = true; c.say("auth_pending_ack"); },

    // --- salary ---
    salary_ans(c) { c.s.done.salary = true; ackOnce(c, "salary_noted"); },
    salary_flexible(c) { c.s.done.salary = true; ackOnce(c, "good_to_know"); },
    salary_more(c) { c.s.done.salary = true; ackOnce(c, "range_later"); },
    range_ctx(c) { c.s.done.salary = true; ackOnce(c, "range_later"); },
    salary_range_q(c) {
      if (turn(c).rangeSaid) return;
      turn(c).rangeSaid = true;
      c.s.asked.salary = true;
      c.say("salary_range");
      if (c.step === "salary" && !c.s.done.salary) {
        c.say("range_ok_q");
        c.expect({ id: "range", expects: ["salary_ans", "salary_flexible", "salary_more", "range_ctx"], hints: ["range", "salary"],
          suggest: [{ lt: "Say whether it works for you", hint: "range" }, { lt: "Say your own figure", hint: "salary" }],
          yes: (cc) => { cc.s.done.salary = true; cc.say("good_to_know"); },
          no: (cc) => { cc.s.done.salary = true; cc.say("range_later"); },
          on: {
            salary_more: (cc) => { cc.s.done.salary = true; cc.say("range_later"); },
            range_ctx: (cc) => { cc.s.done.salary = true; cc.say("range_later"); },
            salary_ans: (cc) => { cc.s.done.salary = true; cc.say("salary_noted"); },
            salary_flexible: (cc) => { cc.s.done.salary = true; cc.say("good_to_know"); },
          },
          ask: (cc) => cc.say("range_ok_q") });
      } else countQuestion(c);
    },

    // --- start date ---
    start_ans(c, _s, seg) {
      // "¿Puedo empezar el lunes?" among her questions or after the goodbye began is a question about the start
      if (c.step === "questions" || c.s.__finished) { answerQ(c, "start", () => c.say("a_start")); return; }
      if (seg.tags.includes("cant")) { if (c.step === "start") { c.say("ask_start_when"); c.hold(); } else c.say("ack"); return; }
      if (c.step !== "start" && c.s.done.start) { c.say("ack"); return; }
      c.s.done.start = true;
      ackOnce(c, seg.tags.includes("notice") ? "notice_ack" : "start_ack");
    },
    start_ctx(c, s, seg) { interview.handlers.start_ans(c, s, seg); },

    // --- why hire you ---
    hire_ans(c) {
      if (c.step === "why") { c.s.done.why = true; ackOnce(c, "why_ack"); return; }
      c.s.done.hire = true;
      if (c.step === "strengths") c.s.done.strengths = true;
      ackOnce(c, "hire_ack");
    },

    // --- the learner's questions ---
    can_ask(c) { c.say("go_ahead"); c.hold(); },
    q_hours(c, _s, seg) {
      const tg = seg.tags;
      answerQ(c, "hours", () => {
        if (tg.includes("weekend")) { c.say("a_weekend"); return; }
        if (tg.includes("extra")) { c.say("a_overtime"); return; }
        if (tg.includes("full")) c.say("a_fulltime"); else if (tg.includes("part")) c.say("a_not_part");
        c.say("a_hours");
        if (!tg.includes("full") && !tg.includes("part")) c.say("a_lunch");
      });
    },
    q_training(c, _s, seg) { answerQ(c, "training", () => c.say(seg.tags.includes("who") ? "a_training_who" : "a_training")); },
    q_start(c) { answerQ(c, "start", () => c.say("a_start")); },
    q_team(c, _s, seg) { answerQ(c, "team", () => { if (seg.tags.includes("boss")) { c.say("a_boss"); return; } c.say("a_team"); c.say("a_team2"); }); },
    q_remote(c) { answerQ(c, "remote", () => c.say("a_remote")); },
    q_benefits(c, _s, seg) { answerQ(c, "benefits", () => c.say(seg.tags.includes("vac") ? "a_vacation" : "a_benefits")); },
    q_day(c) { answerQ(c, "day", () => c.say("a_day")); },
    q_next(c) {
      // after the offer the next steps are the contract's, not other candidates'
      if (c.s.offerState === "hired") { c.say("a_next_hired"); return; }
      if (c.s.offerState === "think") { c.say("a_next_offered"); return; }
      answerQ(c, "next", () => { c.say("a_next"); c.say("a_touch"); });
    },
    q_dress(c) { answerQ(c, "dress", () => c.say("a_dress")); },
    q_parking(c, _s, seg) { answerQ(c, "parking", () => c.say(seg.tags.includes("cost") ? "a_parking_free" : "a_parking")); },
    q_like(c) { answerQ(c, "like", () => c.say("a_like")); },
    q_other_ctx(c, _s, seg) {
      if (seg.tags.includes("grow")) { answerQ(c, "grow", () => c.say("a_grow")); return; }
      answerQ(c, "unknown", () => c.say("a_unknown"));
    },
    no_questions(c) { if (c.step === "questions") c.s.qDone = true; else if (!c.s.__finished) c.say("ack"); },
    no_questions_ctx(c) { interview.handlers.no_questions(c, {}, { intent: "no_questions", slots: {}, tags: [] }); },

    // --- closing (before the end: a polite answer) ---
    // said while she waits for the learner's questions, these close the round ("no more questions")
    thanks_time(c) { if (c.step === "questions" && !c.s.qDone) { c.s.qDone = true; return; } if (!c.s.__finished) c.say("g_welcome"); },
    // After the offer was accepted in the same turn ("Gracias por la oportunidad. Fue un gusto conocerla."), the rest of
    // the sentence is the goodbye.
    look_forward(c) { if (c.s.closeOpen) { closingReply(c, "closing_bye"); return; } if (c.step === "questions" && !c.s.qDone) { c.s.qDone = true; return; } c.say("ack"); },
    nice_meet(c) { if (c.s.closeOpen) { closingReply(c, "closing_nice"); return; } if (!c.s.named || turn(c).namedNow) return; c.say("ack"); },

    // --- job offer (outside the offer moment) ---
    accept_job(c) { c.say("ack"); },
    accept_ctx(c) { c.say("ack"); },
    surprise_ctx(c) { c.say("ack"); },
    think_offer(c) { c.say("ack"); },
    decline_offer(c) { c.say("ack"); },

    // --- side moves ---
    nervous(c) { c.say("nervous_ok"); },
    resume(c) { c.say("resume_thanks"); },
    no_problem(c) { c.say(c.step === "phone" ? "phone_back" : "ack"); },
  },

  finish: (c) => {
    flush(c);
    if (c.s.offerTwist) {
      c.s.byeNow = false;
      c.twist("offer");
      c.say("offer");
      c.expect(offerPending());
      return;
    }
    c.say("closing");
    c.say("closing_next");
    closeUp(c, false);
    if (c.s.byeNow) { c.s.byeNow = false; closingReply(c, "g_bye"); }
  },

  tests: [
    // Every hint construction
    { say: "Buenos días, tengo una entrevista a las nueve y media", intent: "arrive", slots: { time: { h: 9, m: 30 } } },
    { say: "Vengo a una entrevista de trabajo", intent: "arrive" },
    { say: "Vengo a ver a la licenciada Salinas", intent: "arrive" },
    { say: "Mucho gusto, soy Ryan Miller", intent: "intro_ctx", step: "name" },
    { say: "Me llamo Ryan", intent: "intro_name" },
    { say: "Mi nombre es Ryan Miller", intent: "intro_name", step: "name" },
    { say: "Sí, sin problema", intent: "found_ok", step: "found" },
    { say: "Sí, fue muy fácil", intent: "found_ok", step: "found" },
    { say: "Me perdí un poco", intent: "found_hard", step: "found" },
    { say: "Había mucho tráfico", intent: "found_hard", step: "found" },
    { say: "Un vaso de agua, por favor", intent: "want_drink", step: "drink" },
    { say: "Un café, gracias", intent: "want_drink", step: "drink" },
    { say: "Como diez años", intent: "years_ctx", step: "about", slots: { dur: 10 } },
    { say: "Desde hace cinco años", intent: "years_ctx", step: "about", slots: { dur: 5 } },
    { say: "Desde el 2015", intent: "years_ctx", step: "about" },
    { say: "Estudié mercadotecnia", intent: "field_is", step: "about", slots: { field: "mercadotecnia" } },
    { say: "Soy contador", intent: "job_is", slots: { job: "contador" } },
    { say: "Trabajo como enfermera", intent: "job_is", slots: { job: "enfermero" } },
    { say: "Soy maestro de inglés con diez años de experiencia", intent: "job_is", slots: { job: "maestro_ingles", dur: 10 } },
    { say: "Tengo cinco años trabajando como programador", intent: "job_is", slots: { job: "programador", dur: 5 } },
    { say: "Llevo cinco años trabajando como chofer", intent: "job_is", slots: { job: "chofer", dur: 5 } },
    { say: "Antes trabajaba como mesera", intent: "job_is", slots: { job: "mesero" } },
    { say: "Trabajo en ventas", intent: "field_is", slots: { field: "ventas" } },
    { say: "Tengo diez años de experiencia en turismo", intent: "experience", slots: { dur: 10, field: "turismo" } },
    { say: "Llevo veinte años en contabilidad", intent: "field_is", slots: { field: "contabilidad", dur: 20 } },
    { say: "Mi experiencia es en atención a clientes", intent: "field_is", slots: { field: "atencion" } },
    { say: "Soy de Canadá", intent: "from", slots: { country: "canada" } },
    { say: "Me mudé aquí hace dos meses", intent: "moved" },
    { say: "Todavía no tengo mucha experiencia", intent: "no_exp", not: ["experience"] },
    { say: "Busco un nuevo reto", intent: "leaving_ans", step: "leaving" },
    { say: "Me gusta mucho su empresa", intent: "why_ans", step: "why" },
    { say: "Quiero crecer y aprender cosas nuevas", intent: "why_ans", step: "why" },
    { say: "Estoy lista para un nuevo reto", intent: "why_ans", step: "why" },
    { say: "He escuchado cosas muy buenas de Línea Clara", intent: "why_ans", step: "why" },
    { say: "Quiero aplicar mi experiencia aquí", intent: "why_ans", step: "why" },
    { say: "Su empresa tiene muy buena reputación", intent: "why_ans", step: "why" },
    { say: "Soy muy organizada", intent: "strength", step: "strengths", slots: { strength: "organized" } },
    { say: "Diría que soy paciente", intent: "strength", step: "strengths", slots: { strength: "patient" } },
    { say: "La gente dice que soy responsable", intent: "strength", step: "strengths" },
    { say: "Aprendo rápido", intent: "strength", step: "strengths" },
    { say: "Soy buena con los clientes", intent: "strength", step: "strengths" },
    { say: "Mantengo la calma bajo presión", intent: "strength", step: "strengths" },
    { say: "Le echo muchas ganas", intent: "strength", step: "strengths" },
    { say: "No tengo miedo de preguntar", intent: "strength", step: "strengths" },
    { say: "A veces trabajo demasiado", intent: "weakness", step: "weakness" },
    { say: "Soy un poco perfeccionista", intent: "weakness", step: "weakness" },
    { say: "Mi español todavía no es perfecto, pero estoy tomando clases", intent: "weakness", step: "weakness" },
    { say: "Me cuesta hablar en público", intent: "weakness", step: "weakness" },
    { say: "Mi área de oportunidad es la paciencia", intent: "weakness", step: "weakness" },
    { say: "Pero estoy mejorando", intent: "working_on_it", step: "weakness" },
    { say: "Me gustaría dirigir un equipo", intent: "future_ans", step: "future" },
    { say: "Aquí mismo, con ustedes", intent: "future_ans", step: "future" },
    { say: "Me gustaría ser líder de equipo", intent: "future_ans", step: "future" },
    { say: "En mi último trabajo terminamos un proyecto grande a tiempo", intent: "teamwork_ans", step: "teamwork" },
    { say: "Trabajé en un equipo de cinco personas", intent: "teamwork_ans", step: "teamwork" },
    { say: "Hablo inglés y francés", intent: "languages_ans", step: "languages" },
    { say: "Mi idioma materno es el inglés", intent: "languages_ans", step: "languages" },
    { say: "Sí, soy residente permanente", intent: "auth_yes", step: "authorized" },
    { say: "Todavía no. Mi permiso está en trámite.", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Alrededor de dieciocho mil pesos al mes", intent: "salary_ans", step: "salary" },
    { say: "Estoy abierta a negociar", intent: "salary_flexible", step: "salary" },
    { say: "¿Cuál es el rango para este puesto?", intent: "salary_range_q", step: "salary" },
    { say: "Esperaba un poco más", intent: "salary_more", step: "salary" },
    { say: "Puedo empezar el próximo lunes", intent: "start_ans", step: "start" },
    { say: "Lo antes posible", intent: "start_ctx", step: "start" },
    { say: "Tengo que avisar en mi trabajo actual", intent: "start_ans", step: "start" },
    { say: "Tengo la experiencia que buscan", intent: "hire_ans", step: "hire" },
    { say: "Soy la persona indicada para este puesto", intent: "hire_ans", step: "hire" },
    { say: "Deme una oportunidad y va a ver", intent: "hire_ans", step: "hire" },
    { say: "¿Cuál es el horario?", intent: "q_hours" },
    { say: "¿Hay capacitación?", intent: "q_training" },
    { say: "¿Cuándo empezaría?", intent: "q_start" },
    { say: "¿De cuántas personas es el equipo?", intent: "q_team" },
    { say: "¿Se puede hacer home office?", intent: "q_remote" },
    { say: "¿Se puede trabajar desde casa?", intent: "q_remote" },
    { say: "¿Qué prestaciones tiene el puesto?", intent: "q_benefits" },
    { say: "¿Cómo es un día normal aquí?", intent: "q_day" },
    { say: "¿Cuáles son los siguientes pasos?", intent: "q_next" },
    { say: "¿Hay código de vestimenta?", intent: "q_dress" },
    { say: "No, todo está muy claro", intent: "no_questions", step: "questions" },
    { say: "Muchas gracias por su tiempo", intent: "thanks_time" },
    { say: "Fue un gusto conocerla", intent: "nice_meet" },
    { say: "Quedo atento a su llamada", intent: "look_forward" },
    { say: "Sí, acepto con mucho gusto", intent: "accept_job" },
    { say: "¿Lo puedo pensar?", intent: "think_offer" },
    { say: "Perdón, estoy un poco nerviosa", intent: "nervous" },
    { say: "Aquí tiene mi currículum", intent: "resume" },
    { say: "Claro, no hay problema", intent: "no_problem", step: "phone" },
    // Natural alternatives, short answers, slips, no accents, tú to staff
    { say: "Tengo cita con la licenciada Salinas", intent: "arrive" },
    { say: "¿Es usted la licenciada Salinas?", intent: "arrive" },
    { say: "Vengo por la vacante", intent: "arrive" },
    { say: "Ryan Miller", intent: "intro_ctx", step: "name" },
    { say: "Contador", intent: "job_ctx", step: "about", slots: { job: "contador" } },
    { say: "soy disenador grafico", intent: "job_is", slots: { job: "disenador" } },
    { say: "Doy clases de inglés", intent: "job_does", slots: { duty: "maestro_ingles" } },
    { say: "Manejo un taxi", intent: "job_does", slots: { duty: "chofer" } },
    { say: "Año y medio", intent: "years_ctx", step: "about", slots: { dur: 1.5 } },
    { say: "Acabo de terminar la universidad", intent: "no_exp", step: "about" },
    { say: "Ahorita estoy buscando trabajo", intent: "between_jobs", step: "about" },
    { say: "Necesito trabajo", intent: "why_ans", step: "why" },
    { say: "Creativa y trabajadora", intent: "strength_ctx", step: "strengths" },
    { say: "La puntualidad y la honestidad", intent: "strength_ctx", step: "strengths" },
    { say: "No tengo debilidades", intent: "no_weakness", step: "weakness", not: ["weakness"] },
    { say: "Ninguna", intent: "no_weakness_ctx", step: "weakness" },
    { say: "Estoy aprendiendo a decir que no", intent: "working_on_it" },
    { say: "Casi siempre trabajo sola", intent: "no_team", step: "teamwork", not: ["teamwork_ans"] },
    { say: "Inglés y español", intent: "languages_ctx", step: "languages" },
    { say: "Entre quince y dieciocho mil", intent: "salary_ans", step: "salary" },
    { say: "Es negociable", intent: "salary_flexible", step: "salary" },
    { say: "¿Qué sueldo manejan?", intent: "salary_range_q" },
    { say: "En dos semanas", intent: "start_ctx", step: "start" },
    { say: "No puedo empezar la próxima semana", intent: "start_ans", step: "start" },
    { say: "¿De qué hora a qué hora se trabaja?", intent: "q_hours" },
    { say: "¿Cuándo me avisan?", intent: "q_next" },
    { say: "¿Dan aguinaldo?", intent: "q_benefits" },
    { say: "¿Hay gimnasio?", intent: "q_other_ctx", step: "questions" },
    { say: "¿Cómo te llamas?", intent: "her_name" },
    { say: "¿Dónde está el baño?", intent: "q_restroom" },
    { say: "Necesito unos días para pensarlo", intent: "think_offer" },
    { say: "Lo tengo que platicar con mi esposa", intent: "think_offer" },
    // Spain forms are correct answers
    { say: "¿Cuántos días de vacaciones tenéis?", intent: "q_benefits" },
    { say: "¿Hay aparcamiento?", intent: "q_parking" },
    { say: "Ponme un café", intent: "want_drink", step: "drink" },
    { say: "Soy bueno con los ordenadores", intent: "strength", step: "strengths" },
    { say: "Trabajaba de camarera", intent: "job_is", slots: { job: "mesero" } },
    // Meaning safety: no job, strength, offer or permit may come from a negation
    { say: "No soy contador", intent: "not_job", step: "about", not: ["job_is", "job_ctx"] },
    { say: "Ya no soy maestra", intent: "not_job", step: "about", not: ["job_is", "job_ctx"] },
    { say: "No trabajo en ventas", intent: "not_job", step: "about", not: ["field_is"] },
    { say: "No tengo diez años de experiencia", intent: "not_job", step: "about", not: ["experience", "years_ctx"] },
    { say: "No soy muy organizado", intent: "not_strength", step: "strengths", not: ["strength", "strength_ctx"] },
    { say: "No trabajo bien bajo presión", intent: "not_strength", step: "strengths", not: ["strength"] },
    { say: "No me gusta su empresa", intent: "why_neg", step: "why", not: ["why_ans"] },
    { say: "No quiero ser jefe", intent: "future_away", step: "future", not: ["future_ans"] },
    { say: "No tengo permiso de trabajo", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Lo siento, no puedo aceptar", intent: "decline_offer", not: ["accept_job"] },
    { say: "Nunca he trabajado en equipo", intent: "no_team", step: "teamwork", not: ["teamwork_ans", "strength"] },
    { say: "No quiero nada, gracias", intent: "no_drink", step: "drink", not: ["want_drink"] },
    { say: "No fue tan fácil", intent: "found_hard", step: "found", not: ["found_ok"] },
    { say: "No tengo una entrevista", intent: "none", step: "arrive" },
    { say: "No soy impaciente", intent: "none", step: "weakness" },
    { say: "No quiero hacer home office", intent: "none", step: "questions" },
    { say: "Ryan Miller, mucho gusto", intent: "intro_ctx", step: "name", not: ["accept_job"] },
    { say: "Cinco", intent: "years_ctx", step: "about", not: ["salary_ans"] },
    { say: "No sé, soy muy responsable", intent: "strength", step: "strengths", not: ["not_strength"] },
    { say: "No tengo experiencia como contador", intent: "no_exp", step: "about", not: ["job_ctx", "job_is"] },
    { say: "No soy enfermero, soy maestro", intent: "job_is", step: "about", slots: { job: "maestro" } },
    { say: "No soy residente", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "No me interesa", intent: "decline_offer", not: ["accept_job"] },
    { say: "Perdón, llegué tarde", intent: "arrive", step: "arrive", not: ["intro_ctx"] },
    // Review (2 Nov 2026): corrections, bare answers kept to their question, the offer's terms
    { say: "Fui contador pero ya no", intent: "not_job", step: "about", not: ["job_is", "no_questions"] },
    { say: "No son diez años, son cinco", intent: "years_ctx", step: "about", slots: { number: 5 } },
    { say: "Trabajé diez años en un banco", intent: "experience", step: "about", slots: { dur: 10, field: "finanzas" } },
    { say: "Ya no quiero el puesto", intent: "decline_offer", not: ["start_ans", "accept_job"] },
    { say: "Ya, gracias", intent: "no_questions_ctx", step: "questions", not: ["start_ans", "start_ctx"] },
    { say: "Mañana", intent: "start_ctx", step: "start" },
    { say: "No puedo el lunes, mejor el primero de diciembre", intent: "start_ans", step: "start", slots: { date: { day: 1, month: 12 } } },
    { say: "¿Quién me va a capacitar?", intent: "q_training" },
    { say: "¿El estacionamiento tiene costo?", intent: "q_parking" },
    { say: "¿Se trabaja los sábados?", intent: "q_hours" },
    { say: "¿Quién sería mi jefe?", intent: "q_team" },
    { say: "¿Cuánto voy a ganar?", intent: "salary_range_q" },
    { say: "En cinco años me veo como gerente de un equipo", intent: "future_ans", step: "future" },
    { say: "Porque tengo experiencia y soy muy responsable", intent: "hire_ans", step: "hire" },
    { say: "No sé, a veces soy impaciente", intent: "weakness", step: "weakness" },
    { say: "Sí, pero mi permiso todavía está en trámite", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Tengo visa de turista", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Me parece poco", intent: "range_ctx", step: "salary", not: ["salary_ans"] },
    { say: "Más o menos", intent: "found_ctx", step: "found", not: ["found_ok"] },
    { say: "Lo siento, ya acepté otra oferta", intent: "decline_offer", not: ["accept_job"] },
    { say: "¿Puedo pensarlo un par de días?", intent: "think_offer", not: ["accept_job"] },
    { say: "¿Cuándo empiezo?", intent: "q_start", not: ["accept_job"] },
    { say: "Me encantaría trabajar aquí", intent: "why_ans", step: "why", not: ["accept_job"] },
    // Must not be understood
    { say: "Mi perro come pizza los martes", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
    { say: "bicicleta ventana elefante", intent: "none" },
  ],

  // Generic "No, es todo." / "Nada más, gracias." / "No, gracias." answer the last "¿Alguna otra pregunta?" in these
  // sims: the optional "¿Tiene permiso para trabajar en México?" (a yes/no question) is off where they need it.
  sims: [
    { name: "classic interview", turns: ["¡Buenos días! Tengo una entrevista a las nueve y media.", "Ryan Miller.", "Soy contador, con diez años de experiencia.",
      "Me gusta mucho su empresa y estoy listo para un nuevo reto.", "Soy muy organizado y aprendo rápido.", "¿Cuál es el horario?",
      "No, creo que ya me resolvió todo.", "¡Muchas gracias por su tiempo!"], expect: { complete: true }, auto: AUTO },
    { name: "short answers and questions", setup: (s) => { s.qs = (s.qs as string[]).filter((q) => q !== "authorized"); }, turns: ["¡Hola!", "Vengo a una entrevista.", "Me llamo Ryan.", "Soy enfermero.", "Quince años.",
      "He escuchado cosas muy buenas de Línea Clara.", "Paciente y responsable.", "¿Hay capacitación?", "¿Se puede hacer home office?", "No, es todo.",
      "Gracias por la oportunidad. Fue un gusto conocerla."], expect: { complete: true }, auto: AUTO },
    // its last turn closes the interview: no job offer on the spot here ("job offer on the spot" tests it)
    { name: "side moves: wrong time, résumé, nervous, early questions", setup: (s) => { s.qs = (s.qs as string[]).filter((q) => q !== "authorized"); s.offerTwist = false; },
      turns: ["¡Hola! ¿Es usted la licenciada Salinas?", "Tengo una entrevista a las diez.", "Soy Ryan Miller.",
        "Aquí tiene mi currículum.", "Perdón, estoy un poco nervioso.", "Trabajo en ventas.", "Ocho años.", "Quiero crecer y aprender cosas nuevas.",
        "¿Cuál es el rango para este puesto?", "Trabajo bien en equipo.", "¿Cuándo empezaría?", "¿Cómo es un día normal aquí?", "Nada más, gracias.",
        "Quedo atento a su llamada."], expect: { complete: true }, auto: AUTO },
    { name: "no experience yet", setup: (s) => { s.qs = (s.qs as string[]).filter((q) => q !== "authorized"); }, turns: ["¡Hola!", "Sí.", "Ryan.",
      "Acabo de terminar la universidad. Estudié mercadotecnia.", "Me gusta trabajar con la gente.", "Soy amable y nunca llego tarde.",
      "¿Cuáles son los siguientes pasos?", "No, gracias.", "¡Gracias, adiós!"], expect: { complete: true }, auto: AUTO },
    // the job offer (twist) on every seed: the thanks accepts it, and "Fue un gusto conocerla" gets the goodbye
    { name: "job offer on the spot (twist forced)", setup: (s) => { s.offerTwist = true; s.phoneTwist = false; }, turns: ["¡Buenos días! Tengo una entrevista a las nueve y media.", "Ryan Miller.",
      "Soy contador, con diez años de experiencia.", "Me gusta mucho su empresa y estoy listo para un nuevo reto.", "Soy muy organizado y aprendo rápido.",
      "No, creo que ya me resolvió todo.", "¡Muchas gracias!", "¡Sí, acepto!", "Fue un gusto conocerla."], expect: { complete: true, state: { offerThanked: true, closeOpen: true } }, auto: AUTO },
    { name: "the offer: think it over (twist forced)", setup: (s) => { s.offerTwist = true; s.phoneTwist = false; s.qs = []; s.small = null; },
      turns: ["Vengo a una entrevista de trabajo.", "Me llamo Ryan Miller.", "Soy maestro de inglés. Tengo ocho años de experiencia.", "Su empresa tiene muy buena reputación.",
        "Soy responsable y puntual.", "No tengo más preguntas.", "¿Lo puedo pensar? Lo tengo que platicar con mi esposa.", "¡Gracias, hasta luego!"],
      expect: { complete: true }, auto: AUTO },
    { name: "the phone rings (twist forced)", setup: (s) => { s.phoneTwist = true; s.offerTwist = false; s.qs = []; s.small = null; },
      turns: ["Buenos días, vengo a ver a la licenciada Salinas.", "Ryan Miller.", "Trabajo en turismo desde hace seis años.", "Quiero aplicar mi experiencia aquí.",
        "No se preocupe.", "Soy creativo y trabajador.", "¿Qué prestaciones tiene el puesto?", "No, es todo, gracias.", "Muchas gracias por su tiempo."],
      expect: { complete: true, state: { phoneAsked: true } }, auto: AUTO },
    { name: "salary: asks the range, then hoped for more", setup: (s) => { s.qs = ["salary"]; s.small = null; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Tengo una entrevista.", "Ryan Miller.", "Soy programador con cinco años de experiencia.", "Me interesa mucho el puesto.", "Soy proactivo y aprendo rápido.",
        "¿Cuál es el rango para este puesto?", "Esperaba un poco más.", "No, gracias.", "Gracias, que tenga buen día."],
      expect: { complete: true, state: { done: { salary: true } } }, auto: AUTO },
    { name: "a weakness: none, then Spanish", setup: (s) => { s.qs = ["weakness"]; s.improveQ = false; s.small = null; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Vengo a la entrevista.", "Ryan Miller.", "Soy chef. Tengo doce años de experiencia.", "Me encanta lo que hacen.", "Trabajo bien bajo presión.",
        "No tengo debilidades.", "Mi español todavía no es perfecto, pero estoy tomando clases.", "Nada más, gracias.", "Muchas gracias."],
      expect: { complete: true, state: { done: { weakness: true } } }, auto: AUTO },
    { name: "a weakness, then how she is working on it", setup: (s) => { s.qs = ["weakness"]; s.improveQ = true; s.small = "drink"; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Buenos días, vengo a la entrevista de las nueve y media.", "Me llamo Ryan Miller, mucho gusto.", "Un café, por favor.", "Trabajo en atención a clientes.",
        "Como cuatro años.", "Me encanta trabajar con clientes.", "Me llevo bien con todos y tengo mucha paciencia.", "Me cuesta decir que no.",
        "Estoy aprendiendo a decir que no.", "¿Cómo me tengo que vestir?", "No, ya no, gracias.", "Fue un gusto conocerla."],
      expect: { complete: true, state: { done: { weakness: true }, improveAsked: true } }, auto: AUTO },
    { name: "permit pending, start later (questions forced)", setup: (s) => { s.qs = ["authorized", "start"]; s.small = null; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Hola, tengo cita con la licenciada Salinas.", "Me llamo Ryan.", "Trabajo como recepcionista en un hotel.", "Tres años.", "Busco un trabajo estable.",
        "Soy amable y muy paciente.", "Todavía no, mi residencia está en trámite.", "No puedo empezar la próxima semana.", "El primero del próximo mes.",
        "No, todo está muy claro.", "Gracias, hasta luego."],
      expect: { complete: true, state: { done: { authorized: true, start: true } } }, auto: AUTO },
    // the offer's terms are asked, then the job is turned down: nothing is accepted
    { name: "the offer: when do I start, then no thanks (twist forced)", setup: (s) => { s.offerTwist = true; s.phoneTwist = false; s.qs = []; s.small = null; },
      turns: ["Vengo a una entrevista.", "Ryan Miller.", "Soy contadora. Tengo diez años de experiencia.", "Me gusta mucho su empresa.", "Soy muy organizada.",
        "No, es todo.", "¿En serio? ¿Cuándo empiezo?", "¿Y cuánto pagan?", "No, gracias.", "Gracias, adiós."],
      expect: { complete: true, state: { offerState: "no" } }, auto: AUTO },
    { name: "the offer: I'd love to, but I need to think (twist forced)", setup: (s) => { s.offerTwist = true; s.phoneTwist = false; s.qs = []; s.small = null; },
      turns: ["Tengo una entrevista a las nueve y media.", "Ryan Miller.", "Trabajo en ventas desde hace cinco años.", "Quiero crecer y aprender cosas nuevas.",
        "Soy responsable.", "Nada más, gracias.", "Me encantaría, pero tengo que pensarlo.", "¿Cuáles son los siguientes pasos?", "Gracias, hasta luego."],
      expect: { complete: true, state: { offerState: "think" } }, auto: AUTO },
    { name: "a goodbye while she waits for questions", setup: (s) => { s.qs = []; s.small = null; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Vengo a una entrevista.", "Ryan Miller.", "Fui contador, pero ya no.", "Ahora trabajo como vendedor.", "Ya, como tres años.", "Me encantaría trabajar aquí.",
        "Soy trabajador.", "¿Se trabaja los sábados?", "Gracias, que tenga buen día."],
      expect: { complete: true, state: { me: { job: "vendedor", years: 3 } } }, auto: AUTO },
    { name: "corrections: not a teacher any more, then the job", setup: (s) => { s.qs = []; s.small = null; s.offerTwist = false; s.phoneTwist = false; },
      turns: ["Vengo por la vacante.", "Ryan Miller.", "Ya no soy maestro.", "Ahora trabajo como guía de turistas.", "Desde hace dos años.", "Me gusta trabajar con la gente.",
        "No soy muy organizado.", "Pero soy muy amable y aprendo rápido.", "No, gracias.", "¡Adiós!"],
      expect: { complete: true, state: { me: { job: "guia", years: 2 } } }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function arrived(c: Ctx) {
  c.s.arrived = true;
  if (c.s.named) welcome(c);
}

function named(c: Ctx, name?: string) {
  if (!name) return;
  const first = !c.s.named;
  c.s.named = true;
  turn(c).namedNow = true;
  if (first && c.s.arrived) welcome(c);
}

function welcome(c: Ctx) {
  if (c.s.welcomed) return;
  c.s.welcomed = true;
  c.say("welcome");
  c.say("sit");
}

function giveDrink(c: Ctx, coffee: boolean) {
  if (coffee) { c.say("here_coffee"); c.event("give", { item: "coffee" }); }
  else { c.say("here_water"); c.event("give", { item: "water" }); }
}

function setJob(c: Ctx, id: string) {
  me(c).job = id;
  if (id === "estudiante") me(c).student = true;
}

/** Years of experience from a {dur} or "desde el {year}" slot. */
function readExp(c: Ctx, slots: any, seg: { tags: string[] }) {
  const d = toArr(slots.dur)[0];
  if (typeof d === "number") me(c).years = d;
  else if (typeof slots.year === "number" && slots.year <= THIS_YEAR) me(c).years = THIS_YEAR - slots.year;
  else if (seg.tags.includes("many")) me(c).years = 10;
}

/** What the learner said about themselves: the best reaction of the turn is said before the next question
 *  (one answer often arrives in several segments: "Trabajo en logística. Como doce años."). */
function aboutAck(c: Ctx, slots: any) {
  c.s.aboutInfo = (c.s.aboutInfo || 0) + 1;
  const d = turn(c);
  const yrs = toArr(slots.dur)[0] ?? (slots.year ? THIS_YEAR - slots.year : undefined);
  const cand: [number, string, Record<string, any>?][] = [];
  if (typeof yrs === "number" && yrs >= 10) cand.push([4, "exp_lot"]);
  if (slots.job && slots.job !== "estudiante") cand.push([3, "job_echo", { X: slots.job }]);
  if (typeof yrs === "number" && yrs >= 2) cand.push([2, "exp_good"]);
  cand.push([1, "about_ack"]);
  const best = cand[0];
  if (!d.aboutAck || d.aboutAck[0] < best[0]) d.aboutAck = best;
}
/** All the extra questions picked for this visit are answered (or no longer apply after "about"). */
function extrasDone(c: Ctx): boolean {
  return (c.s.qs || []).every((id: string) => {
    const st = interview.steps.find((x) => x.id === id);
    if (!st) return true;
    if (st.done(c)) return true;
    return aboutDone(c) && !!st.when && !st.when(c);
  });
}

/** Say the reaction collected this turn (called before every question and at the end). */
function flush(c: Ctx) {
  const d = turn(c);
  if (d.aboutAck && !d.acked) { d.acked = true; c.say(d.aboutAck[1], d.aboutAck[2]); }
  d.aboutAck = null;
}

/** "Cuénteme de usted", then only what is still missing. */
function askAbout(c: Ctx) {
  const m = me(c);
  const n = c.s.aboutAsks++;
  const kind = n === 0 ? "open" : !aboutKnown(c) && m.grad ? "studied" : !aboutKnown(c) ? (c.s.aboutKind === "open" && !c.s.aboutInfo ? "open" : "job") : "years";
  // the same question again (after a side move) is a stall; new information resets it
  c.s.aboutStall = kind === c.s.aboutKind && c.s.aboutInfo === c.s.aboutInfoAtAsk ? (c.s.aboutStall || 0) + 1 : 0;
  c.s.aboutKind = kind;
  c.s.aboutInfoAtAsk = c.s.aboutInfo;
  if (kind === "open") {
    c.say(n === 0 ? "ask_about" : "ask_about_again");
  } else if (kind === "studied") {
    c.s.studiedAsked = true;
    c.say("ask_studied");
  } else if (kind === "job") {
    c.say(m.between ? "ask_job_before" : "ask_job_more");
  } else {
    if (m.job) c.say("ask_years_job", { X: m.job });
    else if (m.field) c.say("ask_years_field", { X: m.field });
    else c.say("ask_years_generic");
  }
  // the corridor follows the question just asked (a one-turn pending question carries it)
  const sg = kind === "years" ? [S_YEARS, S_JOB] : kind === "studied" ? [S_STUDIED, S_ABOUT_MORE] : kind === "job" ? [S_JOB, S_FIELD] : [S_JOB, S_FIELD, S_ABOUT_MORE];
  c.expect({ id: "about", optional: true, expects: ABOUT_INTENTS, suggest: sg, hints: sg.map((x) => x.hint!) });
}

function strengthAnswer(c: Ctx, ids: string[], tags: string[]) {
  c.s.strengths = [...(c.s.strengths || []), ...ids];
  const step = c.step;
  // "¿Por qué aquí?" → "Soy trabajador y bueno con la gente": the strengths are told too (no second question)
  if (step === "why") { c.s.done.why = true; if (ids.length) c.s.done.strengths = true; ackOnce(c, "why_ack"); return; }
  if (step === "hire") { c.s.done.hire = true; ackOnce(c, "hire_ack"); return; }
  if (step === "teamwork") { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); return; }
  if (step === "strengths" || step === "about") c.s.done.strengths = true;
  const first = ids[0];
  if (turn(c).acked) return;
  if (tags.includes("team")) ackOnce(c, "s_team");
  else if (tags.includes("fast_learner")) ackOnce(c, "s_fast");
  else if (tags.includes("good_with") || first === "friendly") ackOnce(c, "s_people");
  else if (first === "organized") ackOnce(c, "s_organized");
  else ackOnce(c, "strength_ack");
}

function markWeakness(c: Ctx) {
  c.s.done.weakness = true;
  const d = turn(c);
  if (d.acked) return;
  // The follow-up ("¿Y cómo está trabajando en eso?") comes only when the learner didn't say it already.
  const improving = /\b(pero|trabajando en eso|aprendiendo|mejorando|tomando|practico|estudio|trato de|intento)\b/.test(heard(c));
  if (c.s.spanishWeak && improving) { ackOnce(c, "english_ack"); return; }
  if (c.s.improveQ && !improving && !c.s.improveAsked) {
    c.s.improveAsked = true;
    d.acked = true;
    c.say("ask_improve");
    c.expect({ id: "improve", optional: true, expects: ["working_on_it"], hints: ["improve"],
      suggest: [{ lt: "Say how you're working on it", hint: "improve" }],
      on: { working_on_it: (cc) => { cc.say(cc.s.spanishWeak ? "english_ack" : "improve_ack"); }, g_dontknow: (cc) => { cc.say("no_team_ack"); } } });
    return;
  }
  ackOnce(c, c.s.spanishWeak ? "english_ack" : "weakness_ack");
}

function noWeakness(c: Ctx) {
  if (c.step !== "weakness") { c.say("ack"); return; }
  if (c.s.done.weakness) { c.say("no_team_ack"); return; }
  if (!c.s.noWeakOnce) {
    c.s.noWeakOnce = true;
    c.say("no_weak_1");
    c.say("ask_improve_what");
    c.hold();
    return;
  }
  c.s.done.weakness = true;
  c.say("no_weak_2");
}

function languages(c: Ctx, n: number, many: boolean) {
  c.s.done.languages = true;
  ackOnce(c, n >= 3 || many ? "languages_wow" : "languages_ack");
}

function countQuestion(c: Ctx) {
  c.s.qCount = (c.s.qCount || 0) + 1;
  if (c.s.qAsked && c.s.qCount >= 4 && !c.s.qDone) { c.s.qDone = true; c.say("great_questions"); }
}

function answerQ(c: Ctx, key: string, say: () => void) {
  if (c.s.asked[key] && key !== "unknown") { say(); return; }
  c.s.asked[key] = true;
  say();
  countQuestion(c);
}

/** The job offer (twist). Taking the job is binding: only a yes or an acceptance takes it; a thank-you alone
 *  ("¡Muchas gracias!", "Gracias por la oportunidad") gets "Entonces, ¿acepta el puesto?", and a second one leaves the
 *  answer for Friday (rule 17). */
function offerPending(): Pending {
  return {
    id: "offer", expects: ["accept_job", "accept_ctx", "surprise_ctx", "think_offer", "decline_offer"], hints: ["offer"],
    suggest: [{ lt: "Answer the job offer", hint: "offer" }],
    on: {
      accept_job: (cc) => { offerAccept(cc); },
      accept_ctx: (cc) => { offerAccept(cc); },
      // "¿En serio?", "¡No lo puedo creer!": she asks again (an "¡acepto!" in the same breath answers it)
      surprise_ctx: (cc) => {
        // said alone; with anything else ("¿En serio? ¿Cuándo empiezo?") the rest answers
        const rest = heard(cc).replace(/\b(en serio|de verdad|no (me )?lo puedo creer|no puedo creerlo|que emocion|increible|no lo creo|wow|guau)\b/g, "").replace(/[^a-z]/g, "");
        if (rest || turn(cc).offerDone) return;
        if (!turn(cc).askedAgain) { turn(cc).askedAgain = true; cc.say("offer_really"); cc.expect(offerPending()); }
      },
      // "¿Cuándo empiezo?" / "¿Cuánto pagan?" are questions about the terms: answered, then asked again
      q_start: (cc) => { cc.say("a_start"); offerAgain(cc); },
      g_thanks: (cc) => { offerThanks(cc); },
      thanks_time: (cc) => { offerThanks(cc); },
      nice_meet: (cc) => { offerThanks(cc); },
      what_know: (cc) => { offerThanks(cc); }, // "No sé qué decir, ¡muchas gracias!"
      // "No sé, ¿puedo pensarlo?": the "pensarlo" answers (no second "tómese su tiempo")
      g_dontknow: (cc) => (/\bpens|\bconsult|\bplatic/.test(heard(cc)) ? undefined : false),
      // leaving without an answer leaves it for Friday
      g_bye: (cc) => { if (!turn(cc).offerThanks && !turn(cc).offerDone) offerThink(cc); closingReply(cc, "g_bye"); },
      think_offer: (cc) => { offerThink(cc); },
      decline_offer: (cc) => { offerNo(cc); },
    },
    yes: (cc) => { offerAccept(cc); },
    no: (cc) => { offerNo(cc); },
    ask: (cc) => cc.say("offer_again"),
  };
}
function offerAgain(c: Ctx) { if (turn(c).askedAgain) return; turn(c).askedAgain = true; c.say("offer_again"); c.expect(offerPending()); }
/** A yes takes the job, unless a "pero" or a "pensarlo" in the same breath holds it ("Me encantaría, pero tengo que pensarlo"). */
function offerAccept(c: Ctx) {
  if (turn(c).offerDone) return;
  if (/\bpero\b|\bpensar|\bconsultar|\bplaticar|\bhablarlo/.test(heard(c))) { offerThink(c); return; }
  offerYes(c);
}
function offerThink(c: Ctx) { if (turn(c).offerDone) return; turn(c).offerDone = true; c.s.offerState = "think"; c.say("offer_think"); closeUp(c, false); }
function offerNo(c: Ctx) { if (turn(c).offerDone) return; turn(c).offerDone = true; c.s.offerState = "no"; c.say("offer_no"); closeUp(c, false); }
function offerThanks(c: Ctx) {
  const T = turn(c);
  if (T.offerThanks || T.offerDone) return;
  T.offerThanks = true;
  const h = heard(c);
  // "No, gracias" turns the job down ("No sé…", "No lo puedo creer" don't)
  if (/^no\b/.test(h) && !/^no (se|lo se|lo puedo|puedo creer|me lo)\b/.test(h)) { offerNo(c); return; }
  const leaving = /\b(adios|hasta luego|hasta pronto|hasta manana|nos vemos|bye|chao)\b/.test(h);
  if (!c.s.offerThanked && !leaving) { c.s.offerThanked = true; offerAgain(c); return; }
  offerThink(c);
  if (leaving) closingReply(c, "g_bye");
}

function offerYes(c: Ctx) {
  turn(c).offerDone = true;
  c.s.offerState = "hired";
  c.say("offer_yes");
  c.say("offer_contract");
  c.remember({ hired: true });
  closeUp(c, true);
}

/** Her goodbye (said once per turn); it ends the interview. */
function closingReply(cc: Ctx, line = "closing_reply") { if (!turn(cc).closed) { turn(cc).closed = true; cc.say(line); } cc.end(); }

function closeUp(c: Ctx, hired: boolean) {
  void hired;
  c.complete();
  c.s.closeOpen = true;
  const reply = closingReply;
  c.expect({ id: "closing", hints: ["closing"], suggest: [{ lt: "Say thank you and goodbye", hint: "closing" }],
    on: {
      thanks_time: (cc, _s, seg) => reply(cc, seg?.tags?.includes("nice") ? "closing_nice" : "closing_reply"), look_forward: (cc) => reply(cc, "closing_bye"), nice_meet: (cc) => reply(cc, "closing_nice"),
      g_thanks: (cc) => reply(cc), accept_job: (cc) => reply(cc), g_bye: (cc) => reply(cc, "g_bye"),
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

// Every question first says the reaction collected from the learner's last answer.
for (const st of interview.steps) { const ask = st.ask; st.ask = (c) => { flush(c); ask(c); }; }

export default interview;
