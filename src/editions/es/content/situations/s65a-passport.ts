// Resolved in the engine (2 Nov 2026): "vengo", "vine", "estoy" start a new piece after a negative one ("No vengo de
//   vacaciones. | Vengo a una conferencia."), never right after a "no"; not "voy" ("No voy a Cancún, voy a Mérida" is one
//   correction in s67a). The correction patterns in `purpose` stay.
// NEEDS: (engine) a piece may not begin with "está" after a filler piece ("Un momento. | Está en mi mochila"): find_it
//   takes the filler in its own pattern.
// NEEDS: (engine, lang.ts `noLead`) the lead "no no" swallows the verb's own "no": "No, no lo compré" was read as
//   "No, no" + "lo compré" (a yes) wherever no pattern spells out the negative sentence. Worked around here with the
//   negative pronoun forms (return_no_ctx, address_dunno_ctx, find_it); every conversation with "lo tengo / lo compré"
//   patterns has the same hole.
// Song 65 "Business or Pleasure?" (part 1) → Puerto Colibrí airport, the immigration desk. Oficial Ramírez (usted).
// Keeps the English agenda: passport → purpose (business kind / who / visa) → how long → where (address) → one extra
// question (return ticket, first time, job, alone, money) → biometrics. Changes for Mexico (brief):
// - Most visitors get a stamp with the days allowed (up to 180); the officer writes the days of the trip.
// - New twist "fewer_days" (visits ≥ 1): she gives fewer days than asked; the learner asks politely for more
//   and shows the return ticket (or accepts the fewer days). The return-ticket twist "show_ticket" stays.
// - Movers ("vine a vivir aquí", "voy a trabajar aquí") are asked for a resident visa; with one, no days are stamped.
// - Dropped: the customs declaration and the beagle (an INM officer doesn't ask about food: customs, with its own
//   officers and dogs, is after the baggage hall). The cash question became the INM question about money for the trip.
// Research (1 Nov 2026): reports from Cancún airport (traveloffpath.com, thecancunsun.com, mexiconewsdaily.com):
// the 180 days are not automatic, officers often give 7–30 days based on the return flight shown; read the stamp.
// No airport's procedure is copied: fingerprints are rare here and phrased vaguely ("el lector").

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities: the people the learner visits or travels with.

const R = (id: string, es: string, en: string, g: "m" | "f", forms: string[], pl = false) => ent(id, es, en, g, { forms, attrs: { pl } });
const RELS: EntityDef[] = [
  R("familia", "familia", "family", "f", ["familiares", "parientes", "mi gente"], false),
  R("amigos", "amigos", "friends", "m", ["amigas", "unos amigos", "unas amigas", "amistades"], true),
  R("amigo", "amigo", "friend", "m", ["amiga", "novio", "novia", "pareja"]),
  R("hermana", "hermana", "sister", "f", ["hermanas"]),
  R("hermano", "hermano", "brother", "m", ["hermanos"]),
  R("hijo", "hijo", "son", "m", []),
  R("hija", "hija", "daughter", "f", []),
  R("hijos", "hijos", "children", "m", ["hijas", "ninos", "nietos", "nietas", "nieto", "nieta"], true),
  R("padres", "papás", "parents", "m", ["padres", "papas"], true),
  R("mama", "mamá", "mom", "f", ["mama", "madre", "mami"]),
  R("papa", "papá", "dad", "m", ["papa", "padre", "papi"]),
  R("primo", "primo", "cousin", "m", ["prima", "primos", "primas"]),
  R("tia", "tía", "aunt", "f", ["tia", "tias"]),
  R("tio", "tío", "uncle", "m", ["tio", "tios"]),
];
const FRIENDLY = new Set(["amigos", "amigo"]);

// ---------------------------------------------------------------------------
// Grammar lexicons (the officer never echoes them, so no English forms are needed).

const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

const PURPOSES = [
  L("vacation", ["placer", "por placer"], ["h:p_pleasure"]),
  L("vacation", ["vacaciones", "unas vacaciones", "turismo", "paseo", "descanso", "un viaje de placer", "viaje de placer", "una visita", "unos dias de vacaciones", "viaje de turismo", "luna de miel", "mi luna de miel",
    "un retiro", "un retiro de yoga", "retiro de yoga", "un retiro de meditacion"], ["h:p_vac"]),
  L("business", ["negocios", "un viaje de negocios", "viaje de negocios", "asuntos de negocios"], ["h:p_business"]),
  L("business", ["trabajo", "un viaje de trabajo", "viaje de trabajo", "asuntos de trabajo", "cosas de trabajo", "mi trabajo", "mi empresa", "la empresa"], ["h:p_work_trip"]),
  L("business", ["una visita de trabajo", "visita de trabajo", "una visita de negocios", "visita de negocios"]),
  L("business", ["una conferencia", "conferencia", "un congreso", "congreso", "una convencion", "un evento de trabajo", "un evento"], ["ev:conference", "h:bz_conf"]),
  L("business", ["una reunion", "reuniones", "unas reuniones", "una junta", "juntas", "unas juntas", "reuniones de trabajo", "una reunion de trabajo", "unas reuniones de trabajo", "juntas de trabajo", "unas juntas de trabajo", "juntas con clientes", "unas juntas con clientes", "reuniones con clientes", "unas reuniones con clientes", "una reunion con un cliente", "una junta con un cliente"], ["ev:meeting", "h:bz_meet"]),
  L("business", ["una entrevista de trabajo", "entrevista de trabajo", "una entrevista"], ["ev:interview", "h:bz_interview"]),
  L("business", ["una capacitacion", "capacitacion", "un curso de trabajo", "un taller", "un seminario"], ["ev:training"]),
  L("business", ["una feria", "una expo", "una exposicion", "una feria de negocios"], ["ev:fair"]),
  L("study", ["estudios", "un curso de espanol", "un curso", "clases de espanol", "un intercambio", "la universidad"]),
];

const HOTELS = [
  L("marazul", ["hotel mar azul", "mar azul", "el mar azul", "el hotel mar azul", "hotel mar"]),
  L("other_hotel", ["hotel casa colibri", "casa colibri", "posada del sol", "hotel playa dorada", "playa dorada", "hotel el faro", "hotel la ceiba", "hotel las palmas", "las palmas"]),
];
/** Only after "en": "en un hotel" is vague and gets "¿En qué hotel?". */
const HOTELS_ANY = [L("hotel_generic", ["hotel", "hotelito", "hotel en el centro", "hotel cerca de la playa", "hotel en la playa", "hotel del centro"])];

const STREETS = [
  L("ceiba", ["ceiba", "la ceiba", "ceibas"]), L("flamboyan", ["flamboyan", "flamboyanes", "los flamboyanes"]), L("mar", ["del mar"]),
  L("coral", ["coral", "corales", "los corales"]), L("gaviotas", ["gaviotas", "las gaviotas"]), L("juarez", ["juarez", "benito juarez"]),
  L("hidalgo", ["hidalgo"]), L("colibri", ["colibri", "colibries"]), L("palmas", ["las palmas", "palmas"]), L("cinco", ["cinco de mayo"]),
  L("tulum", ["tulum"]), L("principal", ["principal"]), L("morelos", ["morelos"]), L("caracol", ["caracol"]),
];

const JOB_LIST = [
  "maestro", "maestra", "profesor", "profesora", "ingeniero", "ingeniera", "enfermero", "enfermera", "doctor", "doctora", "medico", "medica",
  "chofer", "conductor", "conductora", "contador", "contadora", "gerente", "programador", "programadora", "desarrollador", "desarrolladora",
  "disenador", "disenadora", "albanil", "electricista", "mecanico", "mecanica", "plomero", "plomera", "cocinero", "cocinera", "chef",
  "agricultor", "agricultora", "vendedor", "vendedora", "cajero", "cajera", "oficinista", "abogado", "abogada", "farmaceutico", "farmaceutica",
  "dentista", "policia", "musico", "musica", "fotografo", "fotografa", "periodista", "traductor", "traductora", "estilista", "mesero", "mesera",
  "camarero", "camarera", "carpintero", "carpintera", "arquitecto", "arquitecta", "cientifico", "cientifica", "investigador", "investigadora",
  "economista", "empresario", "empresaria", "consultor", "consultora", "estudiante", "veterinario", "veterinaria", "psicologo", "psicologa",
  "panadero", "panadera", "piloto", "azafata", "sobrecargo", "escritor", "escritora", "artista", "funcionario", "funcionaria", "trabajador social",
  "trabajadora social", "agente de bienes raices", "maestro de ingles", "maestra de ingles", "profesor de ingles", "profesora de ingles",
];
const JOBS = JOB_LIST.map((j) => L(j.replace(/ /g, "_"), [j]));

const FIELDS = [
  "un banco", "una escuela", "un hospital", "una fabrica", "una oficina", "una tienda", "un restaurante", "un hotel", "una universidad",
  "una empresa", "una compania", "una clinica", "una farmacia", "un supermercado", "una panaderia", "el gobierno", "un despacho",
  "ventas", "marketing", "finanzas", "educacion", "salud", "turismo", "construccion", "tecnologia", "informatica", "sistemas",
  "logistica", "transporte", "la banca", "una aerolinea", "un call center", "atencion al cliente",
].map((f) => L(f.replace(/ /g, "_"), [f]));

const COMPANIONS = [
  "esposa", "esposo", "pareja", "familia", "hijos", "hijo", "hija", "hijas", "amigo", "amiga", "amigos", "amigas", "novio", "novia",
  "colega", "colegas", "companero de trabajo", "companera de trabajo", "companeros de trabajo", "jefe", "jefa", "mama", "papa", "papas",
  "padres", "hermana", "hermano", "hermanos", "nietos", "nieto", "nieta", "grupo", "equipo", "marido", "mujer", "familiares",
].map((x) => L(x.replace(/ /g, "_"), [x]));

const DOCS = [
  L("passport", ["pasaporte", "pasaportes"]),
  L("visa", ["visa", "visa de residente", "visa de residente temporal", "visa de residente permanente", "visa de trabajo", "tarjeta de residente", "residencia", "tarjeta de residencia", "mi residencia"]),
  L("boarding", ["pase de abordar", "pase de abordaje", "tarjeta de embarque", "boarding pass"]),
  L("ticket", ["boleto", "boleto de regreso", "boleto de vuelta", "boleto de avion", "vuelo de regreso", "billete", "billete de vuelta", "reservacion", "reserva", "itinerario"]),
  L("form", ["formulario", "forma", "forma migratoria", "fmm"]),
  L("phone", ["celular", "telefono"]), L("address", ["direccion"]),
];

/** "¿Se refiere a…?": the topic and the step it belongs to. */
const TOPICS = [
  L("job", ["mi trabajo", "mi profesion", "a que me dedico", "en que trabajo", "mi ocupacion", "mi chamba"], ["h:m_job"]),
  L("stay", ["donde me voy a quedar", "donde me quedo", "donde me hospedo", "donde me voy a hospedar", "el hotel", "mi hotel", "la direccion", "mi direccion"], ["h:m_stay"]),
  L("length", ["cuantos dias", "cuanto tiempo", "las fechas", "cuantos dias me quedo", "cuanto tiempo me quedo", "cuantos dias me voy a quedar", "cuanto tiempo voy a estar"], ["h:m_days"]),
  L("purpose", ["el motivo", "el motivo de mi viaje", "motivo", "motivo de mi viaje", "motivo del viaje", "el motivo del viaje", "por que vine", "por que vengo", "la razon", "la razon de mi viaje", "por que estoy aqui"], ["h:m_why"]),
  L("return", ["mi boleto", "mi boleto de regreso", "mi vuelo de regreso", "cuando regreso", "cuando me voy", "el boleto de regreso"]),
  L("first", ["si es mi primera vez", "si ya vine antes", "si he venido antes", "si ya habia venido"]),
  L("alone", ["si viajo solo", "si viajo sola", "con quien viajo", "si vengo solo", "si vengo sola"]),
  L("cash", ["el dinero", "dinero", "cuanto dinero traigo", "mi dinero", "el efectivo"]),
];
const TOPIC_STEP: Record<string, string> = { job: "job", stay: "stay", length: "length", purpose: "purpose", return: "return", first: "first", alone: "alone", cash: "cash" };

/** Words from the officer's questions that learners ask about. */
const WORDS = [
  L("purpose", ["motivo", "el motivo"]), L("stay", ["hospedar", "hospedarse", "hospeda", "hospedaje", "hospedarme"]),
  L("job", ["dedica", "se dedica", "dedicarse"]), L("return", ["boleto de regreso", "regreso"]), L("scanner", ["lector", "el lector"]),
  L("cash", ["efectivo", "en efectivo"]), L("stamp", ["sello", "el sello"]), L("index", ["indice", "dedo indice", "el indice"]),
];
const WORD_LINE: Record<string, string> = { purpose: "mean_purpose", stay: "mean_stay", job: "mean_job", return: "mean_return", scanner: "mean_scanner", cash: "mean_cash", stamp: "mean_stamp", index: "right_hand_answer" };

// ---------------------------------------------------------------------------
// Helpers

const toArr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const tagVal = (tags: string[], prefix: string) => tags.find((x) => x.startsWith(prefix))?.slice(prefix.length);
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};

/** Per-turn scratch state: one answer may arrive as several segments, each running its handler with the same ctx. */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function ack(c: Ctx, p = 0.5) { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say("ack"); }
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }

/** The days she stamps: the trip rounded up to a usual figure (up to 180). */
const DAY_STEPS = [7, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180];
const grantOf = (days: number) => DAY_STEPS.find((x) => x >= days) ?? 180;
/** The twist: fewer days than asked (two usual figures lower); none for a week or less. */
function shortOf(c: Ctx): number | undefined {
  if (c.s.length === "until") return 15;
  if (typeof c.s.days !== "number") return undefined;
  const i = DAY_STEPS.indexOf(grantOf(c.s.days));
  if (i < 1) return undefined;
  return DAY_STEPS[Math.max(0, i - 2)];
}
/** A mover with a resident visa: no days, no "how long". */
const resident = (c: Ctx) => (c.s.purpose === "live" || c.s.purpose === "work") && !!c.s.visaOk;

/** Days from the {dur} slot: a number, "until" or "vague". */
function daysFrom(slots: any): number | "until" | "vague" | undefined {
  const d = slots?.dur;
  if (!d) return undefined;
  const tags: string[] = allTags(d);
  if (tags.includes("vague")) return "vague";
  if (tags.includes("until")) return "until";
  const FIXED: Record<string, number> = { n3: 3, n4: 4, n10: 10, n14: 14, n15: 15, n45: 45, n60: 60, n180: 180 };
  const fixed = tags.map((x) => FIXED[x]).find((x) => x) ?? 0;
  if (fixed) return fixed;
  const n = typeof d.max === "number" ? d.max : typeof d.number === "number" ? d.number : tags.includes("n2") ? 2 : 1;
  const unit = tagVal(tags, "u:");
  return Math.round((n + (tags.includes("half") ? 0.5 : 0)) * (unit === "w" ? 7 : unit === "m" ? 30 : unit === "y" ? 365 : 1));
}

function givePassport(c: Ctx) {
  if (c.s.passport) { c.say("already_have"); return; }
  c.s.passport = true;
  if (c.chance(0.6)) c.say("thank_you");
}

function setPurpose(c: Ctx, p: string, ev?: string) {
  if (p === "both") p = "business";
  c.s.purpose = p;
  c.s.purposeRetry = false;
  c.s.touristQ = false;
  if (ev) c.s.event = ev;
  if (ev === "interview") c.say("good_luck");
  else if (p !== "work" && p !== "live") ack(c, 0.4);
}

/** No resident visa: as a tourist only; the purpose is asked again ("Entonces, ¿viene de turista?"). The rule
 *  ("Sin visa de residente, no puede…") is said once, even if "¿Necesito visa?" brought it first. */
function noVisa(c: Ctx) {
  c.s.purpose = undefined; c.s.purposeRetry = true; c.s.touristQ = true;
  visaRule(c); c.say("tourist_can");
}
function visaRule(c: Ctx) { if (c.s.visaInfo) return; c.s.visaInfo = true; c.say("no_visa_work"); }
function visaOk(c: Ctx) {
  if (c.s.visaOk) { c.say("ack"); return; }
  c.s.visaOk = true; c.say("visa_ok_res");
}

/** What can show a return flight: a ticket, a boarding pass, the phone, or nothing named ("Aquí está"). The passport
 *  again ("Aquí está mi pasaporte") is declined, so the main handler says "Ya lo tengo" and the question is asked again. */
const showsTicket = (slots: any) => { const d = toArr(slots?.doc); return !d.length || d.some((x) => x === "ticket" || x === "boarding" || x === "phone"); };

function retYes(c: Ctx) {
  c.s.ret = true;
  if (c.s.showTicket && !c.s.ticketShown) {
    c.s.ticketShown = true;
    c.twist("show_ticket");
    c.say("show_ticket");
    const ok = (cc: Ctx) => { cc.say("ticket_ok"); };
    c.expect({
      id: "show_ticket", expects: ["hand_over", "return_yes", "return_date", "return_no_ctx"], hints: ["show"],
      suggest: [{ lt: "Show your ticket (on your phone)", hint: "show" }],
      on: { hand_over: (cc, sl) => (showsTicket(sl) ? ok(cc) : false), return_yes: ok, return_date: ok, return_no_ctx: (cc) => { cc.s.ret = false; cc.say("leave_days"); } },
      yes: ok,
      no: (cc) => { cc.s.ret = false; cc.say("leave_days"); },
      ask: (cc) => cc.say("show_ticket"),
    });
    return;
  }
  ack(c, 0.6);
}

function retNo(c: Ctx) {
  c.s.ret = false;
  // "Todavía no lo compro", "Es de ida", "No sé cuándo regreso": nothing to look up in the email, only a reminder
  const h = fold(c.heard);
  if (/\b(compr\w*|ida|no se cuando)\b/.test(h) && !/\bida y vuelta\b/.test(h)) { c.say("leave_days"); return; }
  c.say("return_needed");
  c.say("check_email");
  const found = (cc: Ctx) => { cc.s.ret = true; cc.say("ticket_ok"); };
  const none = (cc: Ctx) => { cc.say("leave_days"); };
  c.expect({
    id: "ticket_check", expects: ["hand_over", "return_yes", "return_date", "return_no", "return_no_ctx"], hints: ["show", "return"],
    suggest: [{ lt: "Show your ticket or say you don't have one", hint: "show" }],
    on: { hand_over: (cc, sl) => (showsTicket(sl) ? found(cc) : false), return_yes: found, return_date: found, return_no: none, return_no_ctx: none },
    yes: found,
    no: none,
    ask: (cc) => cc.say("check_email"),
  });
}

/** The return-ticket question: "¿Trae su boleto de regreso?" (yes / on my phone) or "¿Cuándo regresa?" (a date). */
function returnPending(kind: "ticket" | "when"): Pending {
  const when = kind === "when";
  return {
    id: "return", expects: ["return_yes", "return_date", "return_no", "return_no_ctx", "hand_over", "ask_mean"],
    hints: [when ? "fly_back" : "return", "show"],
    suggest: [when ? { lt: "Say when you fly back", hint: "fly_back" } : { lt: "Say whether you have a return ticket", hint: "return" }],
    on: {
      return_yes: (cc) => retYes(cc), return_date: (cc) => retYes(cc), return_no: (cc) => retNo(cc), return_no_ctx: (cc) => retNo(cc),
      hand_over: (cc, sl) => (showsTicket(sl) ? retYes(cc) : false),
    },
    yes: (cc) => retYes(cc), no: (cc) => retNo(cc),
    ask: (cc) => cc.say(when ? "ask_fly_back" : "ask_return_ticket"),
  };
}

function showAddressPending(line: string): Pending {
  const ok = (cc: Ctx) => { cc.s.address = true; once(cc, "ty", "thank_you"); };
  return {
    id: "show_address", expects: ["hand_over", "address_ctx"], hints: ["show", "address"],
    suggest: [{ lt: "Show the address on your phone", hint: "show" }],
    on: { hand_over: ok, address_ctx: ok },
    yes: ok,
    no: (cc) => { cc.s.address = "none"; cc.say("address_none"); },
    ask: (cc) => cc.say(line),
  };
}

const fold = (x: string) => (x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const noCard = (c: Ctx) => /\bno (traigo|tengo|uso|cargo) (\w+ )?tarjetas?\b/.test(fold(c.heard)) && !/\bpero\b/.test(fold(c.heard));
/** "¿Y trae tarjeta?" after "No" to the money question. */
function cardPending(): Pending {
  return {
    id: "cash_card", expects: ["cash_no", "cash_amount", "card_ctx", "both_ctx"], hints: ["g_yesno", "cash"],
    suggest: [{ lt: "Say whether you have a card", hint: "g_yesno" }],
    on: {
      // "No traigo tarjeta" folds like "No, traigo tarjeta": at this question it is the plain no
      cash_no: (cc) => { if (noCard(cc)) { cc.s.cash = "none"; cc.say("cash_none"); return; } cc.s.cash = "card"; ack(cc, 1); },
      cash_amount: (cc) => { cc.s.cash = "yes"; ack(cc, 1); },
      // "Tarjeta de crédito.", "Débito.", "Las dos."
      card_ctx: (cc) => { cc.s.cash = "card"; ack(cc, 1); },
      both_ctx: (cc) => { cc.s.cash = "card"; ack(cc, 1); },
    },
    yes: (cc) => { cc.s.cash = "card"; ack(cc, 1); },
    no: (cc) => { cc.s.cash = "none"; cc.say("cash_none"); },
    ask: (cc) => cc.say("cash_card_q"),
  };
}

/** Biometrics: right index finger (→ left), each confirmed with "Listo." / "¿Así?". */
const BIO_TASK = {
  right: "Put your finger on the scanner and say “Listo”",
  left: "Put your left index finger on and say “Listo”",
};
function bioPending(stage: "right" | "left"): Pending {
  const next = (cc: Ctx) => {
    if (stage === "right" && cc.s.leftHand) { cc.say("bio_good"); cc.say("left_hand"); cc.expect(bioPending("left")); return; }
    cc.s.fingersDone = true;
    once(cc, "ty", "thank_you");
  };
  return {
    id: stage === "right" ? "fingers" : "left", hints: ["bio_fingers"],
    suggest: [{ lt: BIO_TASK[stage], hint: "bio_fingers" }],
    on: {
      bio_ok_ctx: (cc) => next(cc),
      g_ok: (cc) => next(cc),
      like_this_ctx: (cc) => { cc.say("like_that_yes"); next(cc); },
      which_hand_ctx: (cc) => { cc.say(stage === "left" ? "left_hand_answer" : "right_hand_answer"); cc.expect(bioPending(stage)); },
      glasses: (cc) => { cc.say("glasses_later"); cc.expect(bioPending(stage)); },
    },
    yes: (cc) => next(cc),
    no: (cc) => { cc.say("bio_please"); cc.expect(bioPending(stage)); },
    ask: (cc) => cc.say(stage === "right" ? "fingers" : "left_hand"),
  };
}

function photoPending(): Pending {
  const done = (cc: Ctx) => { cc.s.photoDone = true; cc.say("photo_ok"); };
  return {
    id: "photo", hints: ["bio_photo"], suggest: [{ lt: "Look at the camera and say “Listo”", hint: "bio_photo" }],
    on: {
      bio_ok_ctx: done, g_ok: done, like_this_ctx: (cc) => { cc.say("like_that_yes"); done(cc); },
      glasses: (cc) => { cc.say("glasses_yes"); cc.expect(photoPending()); },
    },
    yes: done,
    no: (cc) => { cc.say("bio_please"); cc.expect(photoPending()); },
    ask: (cc) => cc.say("camera"),
  };
}

function glassesPending(): Pending {
  const done = (cc: Ctx) => { cc.say("camera"); cc.expect(photoPending()); };
  return {
    id: "glasses", hints: ["bio_glasses"], suggest: [{ lt: "Take off your glasses and say “Claro”", hint: "bio_glasses" }],
    on: { bio_ok_ctx: done, g_ok: done, g_sorry: done, like_this_ctx: done },
    yes: done, no: (cc) => { cc.say("glasses_need"); cc.expect(glassesPending()); },
    ask: (cc) => cc.say("take_off_glasses"),
  };
}

/** The twist: more days once she has seen the return ticket. */
function grantMore(c: Ctx) {
  c.s.daysDone = true; c.s.daysResult = "more";
  if (c.s.length === "until") c.say("stamp_more_until"); else c.say("stamp_more", { num: grantOf(c.s.days) });
}
function keepShort(c: Ctx, line = "stamp_keep") { c.s.daysDone = true; c.s.daysResult = "short"; c.say(line, { num: c.s.short }); }
function acceptShort(c: Ctx) { c.s.daysDone = true; c.s.daysResult = "short"; ack(c, 1); }
function daysTicketPending(): Pending {
  return {
    id: "days_ticket", expects: ["hand_over", "return_yes", "return_date", "return_no", "return_no_ctx", "accept_days_ctx"], hints: ["show", "return"],
    suggest: [{ lt: "Show your return ticket", hint: "show" }],
    on: {
      // Taking her days here closes the ticket question (a later "Sí" must not show a ticket). "No necesito más días"
      // and "No, necesito más días" both end in her days: without a ticket she keeps them. A bigger figure ("Treinta
      // días está bien") goes to the main handler, which asks for the ticket again.
      accept_days_ctx: (cc, sl, seg) => {
        if (typeof sl?.number === "number" && sl.number > (cc.s.short ?? 0)) return false;
        if (seg.tags.includes("amb")) keepShort(cc); else acceptShort(cc);
      },
      hand_over: (cc, sl) => { if (!showsTicket(sl)) return false; cc.s.ret = true; grantMore(cc); }, return_yes: (cc) => { cc.s.ret = true; grantMore(cc); },
      return_date: (cc) => { cc.s.ret = true; grantMore(cc); }, return_no: (cc) => { keepShort(cc); }, return_no_ctx: (cc) => { keepShort(cc); },
    },
    yes: (cc) => { cc.s.ret = true; grantMore(cc); },
    no: (cc) => { keepShort(cc); },
    ask: (cc) => cc.say("days_ticket_q"),
  };
}
/** "Quince días más", "una semana más": the figure is added to the days she gave ("más o menos" is not). */
const addsToHers = (c: Ctx) => /\b(dias?|semanas?|mes|meses)\s+mas\b(?!\s+o\s+menos)/.test(fold(c.heard));
/** "¿Me puede dar treinta días?": a new figure counts if it's more than she gave; then the ticket, unless already seen. */
function moreDays(c: Ctx, want?: number | "until" | "vague") {
  const T = turn(c);
  if (T.moreDone) return;
  T.moreDone = true;
  if (typeof want === "number" && addsToHers(c)) want += c.s.short ?? 0;
  // "Diez días" when she gives fifteen asks for nothing more
  if (typeof want === "number" && want < (c.s.short ?? 0) && !/\bno\b/.test(fold(c.heard))) { acceptShort(c); return; }
  if (typeof want === "number" && want > (c.s.short ?? 0)) c.s.days = Math.min(want, 180);
  if (want === "until") c.s.length = "until";
  if (c.s.ret === true) { grantMore(c); return; }
  c.s.ticketQ = true;
  c.say("days_ticket_q");
  c.expect(daysTicketPending());
}
/** The days on the stamp ("¿Cuántos días me dio?"): her figure, "until", or undefined (a resident gets none). */
function stampOf(c: Ctx): number | "until" | undefined {
  if (resident(c)) return undefined;
  if (c.s.daysResult === "short") return c.s.short;
  if (c.s.length === "until") return "until";
  return typeof c.s.days === "number" ? grantOf(c.s.days) : undefined;
}

function simpleAsk(c: Ctx, step: string | null) {
  switch (step) {
    case "passport": c.say("simple_passport"); break;
    case "purpose": c.say("simple_purpose"); break;
    case "biz_kind": c.say("biz_kind"); break;
    case "who": c.say("who_visit"); break;
    case "visa": c.say("visa_q"); break;
    case "length": c.say("length_help"); break;
    case "stay": c.say(c.s.stay === "hotel_generic" ? "ask_which_hotel" : "stay_help"); break;
    case "address": c.say("ask_address"); break;
    case "return": c.s.retQ = "ticket"; c.say("simple_return"); c.expect(returnPending("ticket")); break;
    case "first": c.s.firstQ = "first"; c.say("ask_first"); break;
    case "job": c.say("simple_job"); break;
    case "alone": c.say("simple_alone"); break;
    case "cash": c.say("simple_cash"); break;
    case "days": c.say("days_remind", { num: c.s.short }); break;
    default: c.say("simple_nothing");
  }
}

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
/** Sims about the stamp: no extra question or biometrics, so a turn about the days waits for her stamp line. */
const quiet = (s: Record<string, any>) => {
  s.askBizKind = false; s.askWho = false; s.askReturn = false; s.showTicket = false; s.askFirst = false; s.askJob = false;
  s.askAlone = false; s.askCash = false; s.fingers = false; s.photo = false; s.askAddress = false;
};

// Mission checklist helpers: a follow-up question keeps its main item open.
const stepDef = (id: string) => passport.steps.find((x) => x.id === id)!;
const applies = (c: Ctx, id: string) => { const st = stepDef(id); return !st.when || !!st.when(c); };
const stepOpen = (c: Ctx, id: string) => applies(c, id) && !stepDef(id).done(c);
const EXTRA = ["return", "first", "job", "alone", "cash"];

// Answers the simulation gives when Oficial Ramírez asks an optional question; each fits every wording of it.
const PP_AUTO: Record<string, string> = {
  passport: "Aquí tiene.", purpose: "Vengo de vacaciones.", biz_kind: "Una conferencia.", who: "A mi hermana.", visa: "Sí, aquí está mi visa.",
  length: "Dos semanas.", stay: "En el Hotel Mar Azul.", address: "Calle Flamboyán número veintitrés.", show_address: "Aquí está.",
  return: "Regreso el veinte de junio.", show_ticket: "Claro, aquí está.", ticket_check: "Ah, aquí está.",
  first: "Es mi primera vez.", job: "Soy maestro.", alone: "Sí, viajo solo.",
  cash: "Traigo unos mil dólares.", cash_card: "Sí.", fingers: "Listo.", left: "Listo.", photo: "Listo.", glasses: "Claro.",
  days: "Está bien, gracias.", days_ticket: "Sí, aquí está.",
};

// ---------------------------------------------------------------------------

export const passport: SituationDef = {
  id: "s65a-passport",
  song: 65,
  songTitle: "Business or Pleasure?",
  title: { en: "¿Negocios o placer?", lt: "Business or pleasure?" },
  topic: { en: "En migración", lt: "Passport control" },
  chapter: 1,
  order: 1,
  location: "airport",
  npc: "diaz",
  goal: "Get through immigration: answer the officer's questions about your trip, and check how many days she gives you.",
  intro: "Puerto Colibrí's little airport. You've just landed and you're in line at immigration. Oficial Ramírez will ask why you're here, how long you're staying and where. She stamps your passport with the number of days you may stay.",
  entities: { rel: RELS },

  grammar: {
    macros: {
      vengo: "(vengo | vine | venimos | vinimos | he venido | estoy aqui | estamos aqui | estoy | estamos | voy | vamos)",
      my: "(mi | mis | unos | unas | a mi | a mis | a unos | a unas)",
      stay_verb: "(me voy a hospedar | me hospedo | me voy a quedar | me quedo | nos vamos a quedar | nos quedamos | nos hospedamos | voy a quedarme | voy a hospedarme | voy a estar | vamos a estar | estoy | me estoy quedando | me estoy hospedando | voy a dormir)",
      sights: "(mexico | la playa | las playas | los cenotes | el cenote | las ruinas | la zona | el pueblo | puerto colibri | tulum | playa del carmen | cancun | el caribe | la costa | la selva | la peninsula)",
      unit: "(dia #u:d | dias #u:d | noche #u:d | noches #u:d | semana #u:w | semanas #u:w | mes #u:m | meses #u:m | ano #u:y | anos #u:y)",
      approx: "(como | unos | unas | mas o menos | aproximadamente | alrededor de | solo | solamente | nomas | casi | exactamente | maximo | apenas | nada mas)",
      in_mx: "(aqui | en mexico | en el pais | en puerto colibri)",
      staff: "(me puede | me podria | puede | podria | me da | me pone | me podria dar | me puede dar | me puedes #tip:tu_staff | puedes #tip:tu_staff | me das #tip:tu_staff)",
      ticket: "(boleto | billete | vuelo | pasaje)",
    },
    slots: {
      purpose: { lexicon: PURPOSES },
      hotel: { lexicon: HOTELS },
      hotel_any: { lexicon: HOTELS_ANY },
      street: { lexicon: STREETS },
      job: { lexicon: JOBS },
      field: { lexicon: FIELDS },
      comp: { lexicon: COMPANIONS },
      doc: { lexicon: DOCS },
      topic: { lexicon: TOPICS },
      word: { lexicon: WORDS },
      dur: { pattern: [
        "[@approx] (un #n1 | una #n1 | {number}) @unit",
        "[@approx] {number} @unit y (media | medio) #half",
        "(del | desde el) {number} (al | hasta el) {date} #until",
        "[@approx] un par de #n2 @unit",
        "[@approx] (unos #vague | unas #vague | algunos #vague | algunas #vague | varios #vague | varias #vague | pocos #vague | pocas #vague) @unit",
        "[@approx] una semana y media #n10", "[@approx] una semana o dos #n14", "[@approx] un mes o dos #n60", "[@approx] (un | el) fin de semana #n3", "[@approx] (un | el) puente #n4", "[@approx] una quincena #n15", "[@approx] un mes y medio #n45", "[@approx] medio ano #n180",
        "[@approx] {number} o {max:number} @unit", "[@approx] {number} @unit o {max:number}", "[@approx] entre {number} y {max:number} @unit",
        // "Más de un mes": how much more is unknown, so she asks again
        "mas de (un #n1 | una #n1 | {number}) @unit #vague",
        "hasta [el] {date} #until", "hasta (el | este) {day} #until", "hasta el {number} [de este mes] #until",
        "(del | desde el) {from:date} (al | hasta el) {date} #until",
        "hasta (fin | finales) de mes #until", "hasta (fin | finales) de (enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | octubre | noviembre | diciembre) #until",
        // "Hasta diciembre", "Hasta mediados de enero"
        "hasta [principios de | mediados de] (enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | octubre | noviembre | diciembre) #until",
      ] },
    },
  },

  intents: {
    // Handing over a document ("Aquí tiene", "Aquí está mi pasaporte")
    hand_over: { patterns: [
      "aqui tiene #h:pp_here", "aqui esta #h:r_here", "tenga", "tome", "aqui lo tiene", "aqui la tiene", "si aqui (tiene | esta)", "claro aqui (tiene | esta)",
      "(aqui tiene | aqui esta | tenga | tome) (mi | el | la | los) {doc} [y (mi | el | la) {doc}] #h:pp_heres", "(este | esta) es (mi | el | la) {doc}", "mi {doc}",
      "[aqui] (lo | la) tengo en (mi | el) celular", "lo encontré [aqui esta]", "ya lo encontré", "aqui (esta | lo tiene) en (mi | el) celular",
      "(le doy | le entrego | le muestro | le enseno) (mi | el | la) {doc}", "(se lo | se la) (muestro | enseno | doy)",
    ] },
    // Looking for the passport ("Está en mi mochila…")
    find_it: { patterns: [
      "(dejeme | permitame | dejame) (buscarlo | buscarla | encontrarlo | sacarlo)", "(esta | lo tengo | mi pasaporte esta) en (mi | la) (mochila | bolsa | bolso | chamarra | chaqueta | bolsillo | maleta | cartera)",
      "donde (esta | dejé | puse) mi pasaporte", "(un momento | un segundo | un momentito | perdon | espere) (esta | lo tengo | lo traigo) en (mi | la) (mochila | bolsa | bolso | chamarra | chaqueta | bolsillo | maleta | cartera)", "no encuentro (mi pasaporte | el pasaporte | mi boleto | mi visa)", "ahorita lo (busco | saco)", "[un momento] lo estoy buscando", "no (lo | la) encuentro",
      "[no] no (lo | la) (tengo | traigo) (aqui | conmigo | a la mano)",
    ] },
    // "Fue un vuelo muy largo" (to "¿Qué tal el vuelo?")
    long_flight: { patterns: [
      "[estoy] [un poco | muy | algo | bien] (cansado | cansada) [fue] [un] vuelo (muy | bastante | super) largo", "fue un vuelo (muy | bastante | super) largo",
      "[bien] (pero | aunque) [un poco | muy] (cansado | cansada)", "(largo | muy largo | cansado) pero bien",
      // one piece with its "Bien, gracias" ("Bien, gracias. Fue un vuelo muy largo." was not understood)
      "[muy] bien [gracias] [pero | aunque] fue un vuelo (muy | bastante | super) largo", "[muy] bien [gracias] (pero | aunque) [un poco | muy] (largo | pesado)",
    ] },
    // "¿Qué tal el vuelo?" → "Muy largo." (only at the opener: a bare "largo" means nothing elsewhere)
    long_flight_ctx: { patterns: ["[fue] [un vuelo] [muy | bastante | super | un poco] (largo | pesado)", "(cansado | cansada) [fue] [un vuelo] [muy | bastante] largo"] },
    purpose: { patterns: [
      // #bare: a lone word ("Trabajo.", "Turismo.") changes a purpose already given only at the purpose question
      "{purpose} #bare",
      "(de | por | en | para) {purpose} #bare", "(tengo | tenemos) {purpose} [aqui]",
      // corrections in one breath ("No vengo de vacaciones, vengo a una conferencia")
      "no (@vengo | es | estoy) (de | por | en | para | a) {neg:purpose} [sino] [que] [@vengo] (de | por | en | para | a) {purpose}",
      "no soy turista [sino que] [@vengo] (de | por | en | para | a) {purpose}",
      "no @vengo a (trabajar | vivir | estudiar) [aqui] [sino que] [@vengo] (de | por | en | para | a) {purpose}",
      "@vengo (de | por | en | para | a) {purpose} #h:p_here",
      "(es | este es) un viaje de {purpose}", "(es | estoy) (de | por) {purpose}", "es (por | para) {purpose}",
      "(soy | somos) (turista | turistas) #pv:vacation #h:p_tourist", "turista #pv:vacation", "[@vengo] (a | para) hacer turismo #pv:vacation",
      "(@vengo | vine) a @sights #pv:vacation",
      // "Vacaciones, no negocios" and "Negocios no, vacaciones" fold to the same words: #amb asks again
      "{neg:purpose} no [@vengo] [de | por | en | para | a] {purpose} #amb", "{neg:purpose} no sino [@vengo] [de | por | en | para | a] {purpose}",
      "(vengo | estoy | vine) como (turista | turistas) #pv:vacation",
      "[@vengo] [a | por | para] (una | un) (conferencia #ev:conference | congreso #ev:conference | convencion #ev:conference | feria #ev:fair | expo #ev:fair | seminario #ev:training | taller #ev:training | capacitacion #ev:training) (de | sobre) {w:any} #pv:business",
      "(@vengo | vine) a (descansar | pasear | relajarme | disfrutar | bucear | nadar | vacacionar | conocer) #pv:vacation",
      "[@vengo] a (conocer | ver | visitar | recorrer) @sights [y @sights] #pv:vacation",
      "[@vengo] a estudiar [espanol] #pv:study #h:p_study", "(voy a | quiero) estudiar espanol [aqui] #pv:study",
      "[@vengo] a trabajar (aqui | en mexico | en puerto colibri) #pv:work #h:p_work", "[@vengo] a trabajar #pv:work",
      "(tengo | consegui) (un | una) (trabajo | chamba) (aqui | en mexico | en puerto colibri) #pv:work", "voy a trabajar (aqui | en mexico | en puerto colibri) #pv:work",
      "(vine | vengo | venimos | vinimos) a vivir (aqui | a mexico | en mexico | a puerto colibri | en puerto colibri) #pv:live #h:p_live", "[@vengo] a vivir [aqui] #pv:live",
      "[@vengo] a (jubilarme | retirarme) [aqui | a mexico | en mexico | a puerto colibri | en puerto colibri] #pv:live",
      "me (mudé | mudo | estoy mudando | voy a mudar | vengo a mudar) [a mexico | a puerto colibri | aqui] #pv:live", "nos (mudamos | estamos mudando | vamos a mudar) [a mexico | a puerto colibri | aqui] #pv:live",
      "(ahora | ya) (vivo | vivimos) aqui #pv:live", "(vivo | vivimos) (aqui | en puerto colibri | en mexico) #pv:live",
      // a bare "Los dos" / "Ambos" is `both_ctx` (the purpose only where the question is about it: at the money question it is
      // cash and cards, at "¿crédito o débito?" both cards)
      "negocios y (placer | turismo | vacaciones) #pv:both", "(vacaciones | placer | turismo) y [un poco de | algo de] (negocios | trabajo) #pv:both",
      // a wedding here is a tourist's trip ("Vengo a casarme", "Nos vamos a casar aquí")
      "[@vengo] a (casarme | casarnos) [aqui | en mexico | en puerto colibri] #pv:vacation", "(me voy a casar | nos vamos a casar | me caso | nos casamos) [aqui | en mexico | en puerto colibri] #pv:vacation",
      "[@vengo] (a | para) (mi | nuestra) boda #pv:vacation",
      "[@vengo] (de | por) {purpose} con (mi | mis) (esposa | esposo | familia | hijos | amigos | pareja | novia | novio | marido)",
      "[@vengo] (a | para) (la | una) boda [de (mi | mis | unos | unas) {rel}] #pv:vacation", "(a | para) la boda de (mi | mis) {rel} #pv:vacation",
      "(perdon | no) (quise decir | queria decir) {purpose}",
    ] },
    purpose_visit: { patterns: [
      "@vengo a (visitar | ver) [a] (mi | mis | unos | unas) {rel} #h:p_visit",
      "(visito | estoy visitando | voy a visitar | vamos a visitar | vengo a ver) [a] (mi | mis | unos | unas) {rel} #h:p_friends",
      "(a | para) (visitar | ver) [a] (mi | mis | unos | unas) {rel} #h:v_to_visit", "visita [a] (mi | mis | unos | unas) {rel}",
      "(una visita | visita) familiar #fam", "(visitar | ver) a la familia #fam",
      "(mi | mis) {rel} (vive | viven) aqui [y vengo a (verla | verlo | verlos | verlas | visitarla | visitarlo | visitarlos)]",
      "(quiero | voy a | queremos | vamos a) (visitar | ver) [a] (mi | mis | unos | unas) {rel}",
    ] },
    purpose_neg: { patterns: [
      "no @vengo (de | por | en | para | a) {purpose}", "no (es | estoy) (de | por | para) {purpose}", "no es [un] viaje de {purpose}", "no (es | son) {purpose}",
      "no soy turista #pv:vacation", "{purpose} no", "(ni | no) {purpose} ni {purpose}", "no @vengo como turista #pv:vacation",
      "no @vengo a (trabajar #pv:work | vivir #pv:live | estudiar #pv:study) [aqui | a mexico | en mexico | a puerto colibri | en puerto colibri]", "no voy a (trabajar #pv:work | vivir #pv:live) aqui",
      "no me (mudo | voy a mudar) #pv:live",
    ] },
    // No resident visa: just a tourist with a passport (the English edition's "only an ESTA")
    have_esta: { patterns: [
      "[no] no (tengo | traigo) [ninguna] visa [todavia]", "[no] (solo | nomas | nada mas) (tengo | traigo) (mi | el) pasaporte #h:vs_no",
      "[no] (solo | nomas | nada mas) (mi | el) pasaporte",
      "[no] (vengo | estoy | entro) como turista [nada mas | nomas]", "[no] (solo | nomas) soy turista", "[no] (todavia | aun) no tengo [la] visa",
      "[no] no tengo (residencia | tarjeta de residente | visa de residente | visa de trabajo)", "[no] (todavia | aun) no la (tengo | traigo)",
      // a visa "en trámite" (still being processed) is no visa yet
      "[no] (mi | la) (visa | residencia) [todavia | aun] (esta | sigue | va) en (tramite | proceso)",
      "[no] (tengo | traigo) (mi | la) (visa | residencia) en (tramite | proceso)", "[no] (todavia | aun) (esta | estoy) en (tramite | proceso)",
      "[no] (estoy | la estoy | todavia la estoy | todavia estoy) tramitando [mi | la] [visa | residencia]",
      "[si] pero (esta | sigue | va) en (tramite | proceso)",
      // a tourist's visa, an expired one, or one left at home is no resident visa today
      "[no] [solo | nomas | nada mas] (tengo | traigo) [una | la | mi] visa de (turista | turismo | visitante)",
      "[no] no (tengo | traigo) visa de residente [solo | nomas | nada mas] [la | una] [visa] de (turista | turismo | visitante)",
      "[no] ya no la tengo", "[no] (mi | la) visa (esta vencida | se vencio | ya se vencio | ya vencio | ya no sirve)",
      "(tenia | tuve) [una] visa pero (se vencio | ya se vencio | ya no la tengo)",
      "[no] la (dejé | olvidé) [en (casa | mi casa | mi pais | el hotel)]", "[si] [la] tengo pero no la (traigo | tengo aqui | tengo conmigo)",
    ] },
    have_visa: { patterns: [
      "[si] (tengo | traigo) [mi | la | una] visa [de residente [temporal | permanente] | de trabajo] #h:vs_yes",
      "[si] (tengo | traigo) (residencia | mi residencia | tarjeta de residente | mi tarjeta de residente) [temporal | permanente]",
      "[si] soy residente [temporal | permanente]", "[si] (la | mi) visa (esta | va) en (mi | el) pasaporte",
      "[si] (residente | residencia) (temporal | permanente)",
    ] },
    who_ctx: { patterns: ["[a] (mi | mis | unos | unas) {rel} #h:v_my", "[a] {rel}", "(visito | veo) [a] (mi | mis | unos | unas) {rel}"] },
    length: { patterns: [
      "{dur} #h:d_short", "(por | durante) {dur} #h:d_for",
      "(voy a estar | vamos a estar | estoy | estare | voy a quedarme | me voy a quedar | nos vamos a quedar | me quedo | nos quedamos | pienso quedarme | planeo quedarme | voy a pasar | me quedare | estaremos) [@in_mx] [por | durante] {dur} #h:d_staying",
      "(son | es | seran | sera) {dur}", "{dur} (mas o menos | nada mas | nomas | maximo | como maximo | creo)",
      "(no mas de | maximo | menos de | como maximo) {dur}",
      "(necesito | quisiera | quiero | me gustaria) {dur}",
      // a correction in one breath: "Un mes no, dos semanas" (the second figure counts)
      // "Un mes no, dos semanas" and "Dos semanas, no un mes" fold to the same words: #amb asks again
      "{neg:dur} no {dur} #amb", "{neg:dur} no sino [mejor] {dur}", "no {neg:dur} sino {dur}",
      // "Un mes, mejor dos semanas", "Dos semanas, no, mejor un mes": mejor / digo marks the second as the answer
      "{neg:dur} [no] (mejor | digo | perdon | perdon mejor | bueno mejor) {dur}",
      "no (se | lo se) [pero] [creo que] {dur}",
    ] },
    length_vague: { patterns: [
      "[por] (un tiempo | un rato | poco tiempo | no mucho tiempo | una temporada | un buen tiempo | un tiempito)", "(todo | todo el) (verano | invierno | ano)",
      "no (se | lo se | estoy seguro | estoy segura) (cuanto tiempo | cuantos dias) [todavia]",
    ] },
    stay: { patterns: [
      "(en | al) {hotel} #h:w_hotel", "{hotel}", "(es | se llama) [el] {hotel}",
      "@stay_verb (en | al) {hotel} #h:w_staying", "(tengo | tenemos) (una reservacion | una reserva | un cuarto | una habitacion) en {hotel}", "(reservé | reservamos) en {hotel}",
      "[@stay_verb] (en | al) (un | el) {hotel:hotel_any}", "(tengo | tenemos) (una reservacion | una reserva) en un {hotel:hotel_any}",
      "[@stay_verb] [en] {hotel} (en el centro | cerca de la playa | en la playa)",
    ] },
    stay_with: { patterns: [
      "con (mi | mis | unos | unas) {rel} #h:w_family", "@stay_verb con (mi | mis | unos | unas) {rel}",
      "[@stay_verb] en [la] casa de (mi | mis | unos | unas) {rel} #h:w_friend",
      "[@stay_verb] (con (ella | el | ellos | ellas) | en su casa) #pron",
      "[@stay_verb] en [la] casa de (mi | mis | unos | unas) {rel} [en] [la] (calle | avenida) {street} [numero] {number} #addr",
    ] },
    stay_airbnb: { patterns: [
      "[@stay_verb] en (un | una) (airbnb | air bnb | departamento | apartamento | depa | departamento rentado | casa rentada | cuarto rentado | casa | casita | cabana | villa) #h:w_airbnb",
      "(renté | reservé | alquilé | rentamos | alquilamos) (un | una) (departamento | apartamento | casa | cuarto | airbnb | casita | cabana) [por airbnb] #h:w_apartment",
      "[@stay_verb] en [la] (calle | avenida) {street} [numero] {number} #addr",
    ] },
    hotel_other_ctx: { patterns: [
      "[@stay_verb] en (el | un) (hotel | hostal | hostel | posada | hotelito) {w:any}",
      "[@stay_verb] en (un | una) (hostal | hostel | posada | casa de huespedes | bed and breakfast)",
    ] },
    // Only a town or an area ("En Tulum", "En el centro"): she asks "¿En un hotel? ¿Con familiares?"
    stay_town_ctx: { patterns: [
      "[@stay_verb] (en | por) (tulum | playa del carmen | cancun | puerto colibri | puerto morelos | cozumel | isla mujeres | holbox | bacalar | merida | valladolid | el centro | la zona hotelera | la playa | el pueblo)",
      "[@stay_verb] (aqui | aqui en puerto colibri | cerca de la playa | cerca del centro | cerca del zocalo)",
    ] },
    address_ctx: { patterns: [
      "[es | la direccion es | esta en | queda en] [en] [la] (calle | avenida) {street} [numero] {number} [entre {street} y {street} | esquina [con] {street}] #h:a_its",
      "[es | esta en | queda en] {street} [numero] {number}",
      "[es | esta en | queda en] [la] (calle | avenida) {number} [numero] {number}",
      "[es | esta en | queda en] [la] (calle | avenida) {w:any} numero {number}",
    ] },
    address_phone: { patterns: [
      "(la | lo) tengo en (mi | el) (celular | telefono | correo) #h:a_phone", "(esta | la tengo) en (mi | el) (celular | telefono | correo)",
      "(dejeme | dejame | permitame) (ver | revisar | buscar) [en] (mi | el) (celular | telefono | correo)", "se la (muestro | enseno) [en (mi | el) (celular | telefono)]",
    ] },
    // "La tengo aquí" is the address only at "¿Me da la dirección?" ("No, no lo tengo aquí" elsewhere read as it)
    address_phone_ctx: { patterns: ["la tengo (aqui | apuntada | escrita | en un papel)"] },
    // only as an answer to "¿Me da la dirección?": "Ahorita la busco." / "Se la muestro."
    address_show_ctx: { patterns: ["ahorita la (busco | reviso | veo)", "(se la | le) (muestro | enseno)", "(dejeme | permitame) buscarla"] },
    address_dunno: { patterns: [
      "no (me acuerdo | recuerdo) [de] la direccion [exacta] #h:a_dunno", "no (se | tengo | conozco) la direccion [exacta]", "no se (la | el) (direccion | calle | numero) [exacta | exacto]",
      "se me olvidó la direccion",
    ] },
    // only at "¿Me da la dirección?": "No lo tengo aquí" at the passport or the ticket is not the address
    address_dunno_ctx: { patterns: [
      "no (me acuerdo | recuerdo | la recuerdo) [bien]", "no me la se [de memoria]", "no la (se | tengo) de memoria", "se me olvidó",
      // each spelled out: with optional parts the engine's reading "No, no" + "la tengo en el celular" (a yes) cost less
      "no (la | lo) (tengo | traigo)", "no (la | lo) (tengo | traigo) (aqui | conmigo)", "no (la | lo) (tengo | traigo) en (mi | el) (celular | telefono | correo)",
      // only the area, or the street without its number: she asks to look it up
      "[es | esta | queda] (en el centro | por el centro | cerca del centro | cerca de la playa | cerca del zocalo | en el pueblo)",
      "[es] [en] [la] (calle | avenida) {street} [pero] no (se | me se | recuerdo | me acuerdo de) el numero",
    ] },
    return_yes: { patterns: [
      "[si] (lo | la) (tengo | traigo) en (el | mi) (celular | telefono | correo) #h:r_yes", "[si] (esta | lo tengo) en (mi | el) (celular | telefono | correo)",
      "[si] (tengo | traigo) [mi | el] @ticket [de regreso | de vuelta] [aqui]", "[si] (tengo | ya tengo) (vuelo | boleto | billete) de (regreso | vuelta)",
      "[si] es (viaje | boleto | vuelo) redondo", "[si] (ya lo compré | lo compré)", "[si] (es | tengo) [de] (ida y vuelta | viaje redondo)", "[si] (tengo | es) [un | mi] (boleto | vuelo) (de ida y vuelta | redondo)",
    ] },
    return_date: { patterns: [
      "[si] [el] {date} #h:r_date", "[si] el {day}",
      "[si] (regreso | me regreso | vuelvo | me voy | salgo | vuelo) [a casa | a mi pais] [el] {date} #h:r_date",
      "[si] (mi vuelo [de regreso] | el vuelo de regreso | mi regreso) es [el] {date} #h:r_fly",
      "[si] (regreso | me regreso | vuelvo | me voy | salgo) [el] {day}", "[si] (mi vuelo [de regreso] | mi regreso) es [el] {day} #h:r_fly",
      "(en | dentro de) {dur} #h:r_in", "[si] (regreso | me regreso | vuelvo | me voy) (en | dentro de) {dur}",
      "[si] (regreso | me voy) (la proxima semana | el proximo mes | el mes que viene | a fin de mes)",
    ] },
    return_no: { patterns: [
      "[no] todavia no (lo compro | lo he comprado | lo tengo | tengo boleto | tengo el boleto) #h:r_no", "[no] no (tengo | traigo) [el | mi] @ticket [de regreso | de vuelta] [todavia]",
      "[no] (lo voy a comprar | voy a comprarlo | lo compro) (despues | aqui | luego | mas tarde)", "[no] no se cuando (regreso | me voy)",
      "[no] (es | tengo | compré) (solo | nomas) (de ida | ida | el vuelo de ida)", "[no] no he comprado [el @ticket de regreso]",
      "[es] [un | mi] [boleto | vuelo] de ida [nomas | nada mas | solamente]", "[pero] (lo voy a comprar | voy a comprarlo) [despues | aqui | luego | mas tarde]",
      // one piece, so "tengo boleto" is never a yes on its own
      "[no] (tengo | traigo | compré) [un | mi | el] (boleto | vuelo | pasaje) [solo | nomas | nada mas] de ida [nomas | nada mas | solamente]",
    ] },
    // Only where a ticket is asked for ("No, no lo tengo aquí", "No, no lo compré"). Spelled out because the engine
    // reads "No, no …" as the answer "No, no" plus the rest: without these, "no lo compré" became "lo compré" (a yes)
    // and "no lo tengo en el celular" a ticket shown.
    return_no_ctx: { patterns: [
      "no (lo | la) (tengo | traigo)", "no (lo | la) (tengo | traigo) (aqui | conmigo | impreso | ahorita | todavia)",
      "no (lo | la) (tengo | traigo) en (mi | el) (celular | telefono | correo)", "no (lo | la) (compré | he comprado)", "no (lo | la) (compré | he comprado) (todavia | aun)",
    ] },
    first_yes: { patterns: [
      "[si] es mi primera vez [en mexico | aqui] #h:f_first", "[si] (la | mi) primera vez", "[si] primera vez [aqui | en mexico]",
      "[si] nunca (he venido | habia venido | he estado | vine | habia estado) [a mexico | aqui | en mexico] [antes]", "[si] nunca", "[si] es la primera vez", "[si] (es | esta es) la primera", "[si] es (mi | la) primera vez que (vengo | estoy aqui | vengo a mexico | estoy en mexico)",
    ] },
    first_no: { patterns: [
      "[no] ya (vine | he venido | estuve | habia venido) [aqui | a mexico | en mexico] [antes | una vez | dos veces | muchas veces | varias veces | el ano pasado | hace {number} anos | hace unos anos | en {year}] #h:f_before",
      "[no] (es | esta es) mi (segunda | tercera | cuarta | quinta) vez #h:f_second",
      "[no] (vine | estuve) [aqui | en mexico | a mexico] (el ano pasado | hace {number} anos | en {year} | antes | una vez | hace unos anos | hace (un | dos | tres) anos)",
      "[no] (muchas | varias | dos | tres) veces", "[no] no es (mi | la) primera vez", "[si] (una | otra) vez [antes]",
      "[no] (es | esta es) la (segunda | tercera | cuarta | quinta) [vez]",
    ] },
    // "Sí, el año pasado" (to "¿Ya había venido?"): a bare time only at that question
    first_no_ctx: { patterns: [
      "[si] (el ano pasado | hace {number} anos | hace unos anos | hace (un | dos | tres) anos | hace (mucho | mucho tiempo | tiempo | poco) | en {year})",
    ] },
    job: { patterns: [
      "soy {job} #h:j_im", "trabajo (como | de) {job} #h:j_as", "{job}", "(soy | trabajo como | trabajo de) {job} (en | para) [un | una | el | la] {field}",
      "trabajo (en | para) {field} #h:j_field", "me dedico a {field}",
      "(estoy | soy) (jubilado | jubilada | retirado | retirada | pensionado | pensionada) #j:retired #h:j_retired", "(jubilado | jubilada | retirado | retirada) #j:retired",
      "(tengo | tengo mi propio | tengo mi propia | tengo un | tengo una) (negocio | empresa | restaurante | tienda) [propio | propia] #j:self #h:j_own",
      "(soy | trabajo como) (independiente | freelance | autonomo | autonoma) #j:self",
      "[ahorita | ahora | por ahora] no trabajo #j:none", "(estoy | ando) (desempleado | desempleada | sin trabajo | buscando trabajo) #j:none",
      "(soy | me dedico a ser) (ama de casa | amo de casa) #j:home",
    ] },
    job_other_ctx: { patterns: ["soy {w:any}", "trabajo (de | como | en) {w:any}"] },
    // "En ventas.", "Turismo.", "En un banco." to "¿A qué se dedica?"
    job_field_ctx: { patterns: ["[en | al | a la | a] {field}"] },
    alone_yes: { patterns: [
      "[si] (viajo | vengo | estoy | vine) (solo | sola) #h:al_alone", "[si] (viajo | vengo) por mi cuenta",
    ] },
    // a bare "Solo." only at "¿Viaja solo?": elsewhere solo is "only" ("No, solo mi pasaporte")
    alone_yes_ctx: { patterns: ["[si] (solo | sola | yo solo | yo sola | nada mas yo | solo yo | nomas yo)"] },
    alone_with: { patterns: [
      "[no] (viajo | vengo | estoy | vine | voy | estamos | venimos) con (mi | mis | unos | unas) {comp} [y (mi | mis) {comp}] #h:al_with",
      "[no] con (mi | mis | unos | unas) {comp} [y (mi | mis) {comp}]", "[no] (mi | mis) {comp} (viene | vienen | esta | estan) conmigo",
      "[no] (somos | venimos) (un grupo | una familia | en grupo)", "[no] (somos | venimos) {number} [personas]", "[no] (vengo | viajo | venimos) en (grupo | familia | pareja)",
      "no (viajo | vengo | estoy) (solo | sola) #notalone",
    ] },
    cash_amount: { patterns: [
      "[si] (traigo | tengo | llevo) [como | unos | unas | mas o menos | alrededor de] {number} (dolares | dolares canadienses | euros | libras | pesos) [en efectivo] #h:c_about",
      "[si] [como | unos | mas o menos | alrededor de] {number} (dolares | dolares canadienses | euros | libras | pesos) [en efectivo]",
      "[si] (traigo | tengo) (suficiente | lo suficiente | bastante) [dinero]", "(suficiente | lo suficiente | bastante) [dinero]", "[si] (traigo | tengo) (dinero | efectivo) y (tarjeta | tarjetas)",
    ] },
    cash_no: { patterns: [
      "[no] (pago | voy a pagar) con tarjeta #h:c_card", "[no] (traigo | tengo | uso) (tarjeta | tarjetas | mi tarjeta) [de credito | de debito]",
      "[no] no (traigo | tengo) mucho (efectivo | dinero) [pero] [(traigo | tengo) (tarjeta | tarjetas)]",
      "[no] (casi nada | poquito | muy poco) [efectivo] [pero] [(traigo | tengo) (tarjeta | tarjetas)]",
      "[no] no (traigo | tengo) [dinero] [en] efectivo [pero] (traigo | tengo | uso) (tarjeta | tarjetas)",
    ] },
    // At "¿Y trae tarjeta de crédito o débito?" and "¿Trae dinero en efectivo o tarjetas?": the card named
    card_ctx: { patterns: [
      "[si] [una | la | mi] (tarjeta | tarjetas) [de credito | de debito] [y [de] (credito | debito)]",
      "[si] [una | mi] [tarjeta] de (credito | debito) [y [de] (credito | debito)]", "[si] (credito | debito) [y (credito | debito)]",
    ] },
    // At "¿Trae dinero en efectivo o tarjetas?": cash
    cash_yes_ctx: { patterns: [
      "[si] [dinero] [en] efectivo [y (tarjeta | tarjetas)]", "[si] (tarjeta | tarjetas) y efectivo",
    ] },
    // "No traigo efectivo" at the money question: then the card question
    cash_none_ctx: { patterns: [
      "[no] no (traigo | tengo | llevo) [nada de] [dinero] [en] efectivo", "[no] no (traigo | tengo | llevo) (dinero | nada de dinero)",
    ] },
    // "Los dos", "Ambos": the purpose at "¿Negocios o placer?", cash and cards at the money question, both cards at
    // "¿crédito o débito?" (only where one of those is asked)
    both_ctx: { patterns: [
      "[un poco de | de] (los dos | las dos | ambos | ambas | las dos cosas)", "(son | es) (los dos | las dos cosas | ambos)",
    ] },
    like_this_ctx: { patterns: ["asi #h:b_like", "(asi esta bien | esta bien asi)", "(aqui | este | este dedo)", "lo hago bien"] },
    // The short replies to a command ("Mire a la cámara." → "Listo.")
    bio_ok_ctx: { patterns: [
      "(listo | ya | ya esta | okey) #h:b_okay", "claro #h:b_sure", "(si claro | claro que si | con gusto)", "(perdon | ay perdon)", "ya lo puse", "(ya | listo) (ya esta | listo)",
    ] },
    which_hand_ctx: { patterns: ["(cual | que) (mano | dedo) #h:b_which", "(la | mi) [mano] (derecha | izquierda)", "(derecha | izquierda) o (derecha | izquierda)", "el (indice | pulgar | dedo indice)", "(todos | cuatro) (los dedos | dedos)", "con (cual | que) (mano | dedo)", "(cual | que) (mano | dedo) (pongo | uso)"] },
    word_meaning: { patterns: [
      "que (significa | quiere decir) [la palabra] {word} #h:c_meaning", "no (entiendo | conozco) [la palabra] {word}", "que es [eso de] {word}",
    ] },
    glasses: { patterns: [
      "(me quito | tengo que quitarme | debo quitarme | me tengo que quitar) (los lentes | las gafas | los anteojos) #h:b_glasses",
      "(y | que hay de) (mis | los) (lentes | anteojos)", "(con | sin) (lentes | anteojos)",
    ] },
    q_esta: { patterns: [
      "(necesito | se necesita) visa [para entrar]", "(necesita | quiere) (ver | revisar) mi visa", "tengo que (mostrar | ensenar) [mi] visa", "(no necesito | no se necesita) visa verdad",
      "[pero] (no necesito | no se necesita) visa [para entrar]",
    ] },
    // Customs moved to the baggage hall (s65b): "¿Dónde está la aduana?", "¿Tengo que declarar algo?"
    q_customs: { patterns: [
      "donde (esta | queda) la aduana", "(y | que hay de) la aduana", "(tengo | hay) que declarar (algo | algo aqui)", "(donde | aqui) (declaro | se declara) [algo]",
      "(tengo que | hay que | debo) llenar la (declaracion | forma) de aduana",
    ] },
    // After the stamp, "¿Cuántos días me dio?" wants her figure, not the rule
    days_given: { patterns: [
      "cuantos dias (me dio | me puso | me dieron | me pusieron | tengo | son)", "(cuanto tiempo | cuantos dias) me (dio | puso)",
    ] },
    q_boarding: { patterns: [
      "(necesita | quiere) [ver] [tambien] (mi | el) (pase de abordar | pase de abordaje | tarjeta de embarque | boleto) [tambien] #h:pp_boarding",
      "le (doy | muestro | enseno) [tambien] (mi | el) (pase de abordar | boleto | tarjeta de embarque)",
    ] },
    q_form: { patterns: [
      "(tengo que | hay que | debo) llenar (algun | un | algo | una) [formulario | forma | papel | documento] #h:q_form", "(hay | necesito) (algun | un | una) (formulario | forma) [migratoria]",
      "(y | que hay de) la forma migratoria",
    ] },
    q_baggage: { patterns: [
      "donde (esta | queda) (el equipaje | mi equipaje | mi maleta | la banda | el reclamo de equipaje) #h:q_baggage",
      "donde (recojo | puedo recoger | estan) (mi | mis | el | las) (maleta | maletas | equipaje)",
    ] },
    q_restroom: { patterns: ["donde (esta | estan | hay) (el bano | los banos | un bano | el sanitario) #h:q_restroom", "(hay | tienen) (bano | banos) [aqui | cerca]"] },
    q_taxi: { patterns: ["donde (puedo tomar | tomo | consigo | encuentro) un taxi #h:q_taxi", "donde (estan | hay) [los] taxis", "donde esta (el sitio | la parada) de taxis"] },
    q_limit: { patterns: ["cuanto tiempo (puedo | me puedo) (quedarme | estar | quedar) [@in_mx] #h:q_how_long", "cuantos dias (puedo quedarme | me puedo quedar | puedo estar | me puede dar | me da)", "cual es el maximo [de dias]"] },
    ask_mean: { patterns: ["[perdon] (se refiere a | quiere decir | me pregunta) {topic}", "[perdon] (te refieres a | quieres decir | me preguntas) {topic} #tip:tu_staff", "[perdon] (es | pregunta) (por | sobre) {topic}", "[perdon] (se refiere | quiere decir) al {topic}", "[perdon] (te refieres | quieres decir) al {topic} #tip:tu_staff"] },
    // The twist: fewer days than asked
    more_days: { patterns: [
      "@staff (dar | poner) (mas dias | mas tiempo | {number} dias | {dur}) #h:dy_more",
      "(puede | podria | me puede | me podria) (darme | ponerme) (mas dias | mas tiempo | {number} [dias] | {dur})", "(puedes | podrias) (darme | ponerme) (mas dias | {number} [dias] | {dur}) #tip:tu_staff",
      "(me da | me pone) (mas dias | {number} dias | {dur})", "no me (puede | podria) (dar | poner) {number} [dias]",
      "por que (solo | nomas | nada mas)? {number} [dias]",
      "(necesito | quisiera | me gustaria | quiero) (mas dias | mas tiempo)", "prefiero (mas dias | {number} dias | {dur})",
      "(es que | pero) (voy a estar | me quedo | necesito | voy a quedarme) {dur} #h:dy_more2",
      "(puedo tener | podria tener) (mas dias | {dur})", "son (pocos | muy pocos) dias", "(yo) (pedi | dije) {dur}",
      "no me (alcanza | alcanzan) [con] [{number} dias | los dias]", "no (es | son) (suficiente | suficientes) [{number} dias]",
    ] },
    accept_days_ctx: { patterns: [
      "(con | son) {number} [dias] esta bien #h:dy_ok", "{number} [dias] (esta bien | estan bien | me alcanzan | es suficiente | son suficientes)",
      "(esta bien | no hay problema | de acuerdo) con {number} dias", "(es suficiente | me alcanza | me alcanzan | son suficientes)",
      // "No necesito más días" folds like "No, necesito más días" (the opposite): the handler reads a typed comma or asks
      "no (necesito | quiero) mas (dias | tiempo) #amb",
      // "Así está bien" is the engine's built-in no at an offer; to her days it accepts them as they are
      "(asi esta bien | esta bien asi | dejelo asi | asi dejelo | asi lo dejamos | asi me alcanza | con eso esta bien | con eso me alcanza | con eso es suficiente)",
    ] },
    // A bare figure ("¿Cuántos días?" → "Quince."): only at the length question and at the stamp
    length_num_ctx: { patterns: ["[@approx] {number} [mas o menos | nada mas | nomas | maximo | creo]"] },
    // "¿Y si me quedo más tiempo?" at the stamp: a what-if asks nothing ("Recuerde que tiene que salir a tiempo")
    what_if_more_ctx: { patterns: ["(y si | que pasa si) (me quedo | nos quedamos | necesito | quiero quedarme) (mas | mas tiempo | mas dias)"] },
    // "¿Por qué?" to one of her questions
    why_ctx: { patterns: ["[y] [eso] por que", "por que (me pregunta | lo pregunta | quiere saber | pregunta) [eso]", "para que [es eso | lo necesita | quiere saber]"] },
  },

  lines: {
    next: [
      t("¡Siguiente!", "Next!", "Next!"),
      t("¡El | siguiente, | por favor!", "The | next, | please!", "Next, please!"),
    ],
    greet_passport: [
      t("Buenas tardes. | Su | pasaporte, | por favor.", "Good afternoon. | Your | passport, | please.", "Good afternoon. Passport, please."),
      t("Buenas. | ¿Me | permite | su | pasaporte?", "Hello. | (To) me | you-allow | your | passport?", "Hello. May I see your passport?", { flags: { 0: "Buenas: short for buenas tardes, a common hello in Mexico." } }),
      t("¡Hola! | Pasaporte, | por favor.", "Hi! | Passport, | please.", "Hi! Passport, please."),
    ],
    greet_howareyou: [
      t("Buenas tardes. | ¿Cómo | está?", "Good afternoon. | How | are you?", "Good afternoon. How are you?"),
      t("Buenas tardes. | ¿Qué tal | el | vuelo?", "Good afternoon. | How was | the | flight?", "Good afternoon. How was your flight?"),
    ],
    ask_passport: [
      t("Su | pasaporte, | por favor.", "Your | passport, | please.", "Your passport, please."),
      t("¿Me | da | su | pasaporte?", "(To) me | you-give | your | passport?", "Could I have your passport?"),
    ],
    already_have: [t("Ya | lo | tengo, | gracias.", "Already | it | I-have, | thanks.", "I already have it, thanks.")],
    thank_you: [t("Gracias.", "Thank you.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thanks a lot.")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Bien.", "Good.", "All right."), t("De acuerdo.", "Okay.", "Got it.")],
    // Purpose
    ask_purpose: [
      t("¿Cuál | es | el | motivo | de | su | viaje?", "What | is | the | reason | for | your | trip?", "What's the purpose of your trip?"),
      t("¿Motivo | de | su | viaje?", "Reason | for | your | trip?", "Purpose of your trip?"),
      t("¿Viene | por | negocios | o | de | vacaciones?", "Are you coming | for | business | or | on | vacation?", "Are you here on business or on vacation?"),
      t("¿Negocios | o | placer?", "Business | or | pleasure?", "Business or pleasure?"),
    ],
    purpose_retry: [t("Entonces, | ¿cuál | es | el | motivo | de | su | viaje?", "So, | what | is | the | reason | for | your | trip?", "So what's the purpose of your trip?")],
    purpose_which: [t("Perdón, | ¿cuál | de | los | dos?", "Sorry, | which | of | the | two?", "Sorry, which one is it?")],
    purpose_retry_tourist: [t("Entonces, | ¿viene | como | turista?", "Then, | are you coming | as | a tourist?", "So are you here as a tourist?")],
    purpose_help: [t("¿Vacaciones? | ¿Negocios? | ¿Visita | a | familiares?", "Vacation? | Business? | A visit | to | relatives?", "Vacation? Business? Visiting family?")],
    simple_purpose: [t("¿Por qué | viene | a | México? | ¿Vacaciones? | ¿Trabajo?", "Why | are you coming | to | Mexico? | Vacation? | Work?", "Why are you coming to Mexico? Vacation? Work?")],
    biz_kind: [
      t("¿Qué | tipo | de | negocios?", "What | kind | of | business?", "What kind of business?"),
      t("¿Es | una | reunión | o | una | conferencia?", "Is it | a | meeting | or | a | conference?", "Is it a meeting or a conference?"),
    ],
    good_luck: [t("¡Mucha | suerte | con | su | entrevista!", "Much | luck | with | your | interview!", "Good luck with your interview!")],
    who_visit: [t("¿A | quién | visita?", "— | Whom | are you visiting?", "Who are you visiting?", { flags: { 0: "Personal a: Spanish marks a person as the object; English needs no word." } })],
    visa_q: [t("¿Tiene | visa | de | residente?", "Do you have | a visa | as a | resident?", "Do you have a resident visa?")],
    visa_again: [t("Gracias. | ¿Y | su | visa | de | residente?", "Thanks. | And | your | visa | as a | resident?", "Thanks. And your resident visa?")],
    visa_ok_res: [t("Muy | bien. | Tiene | treinta | días | para | tramitar | su | tarjeta | de | residente | en | una | oficina | de | migración.", "Very | good. | You have | thirty | days | to | apply for | your | card | of | resident | at | an | office | of | immigration.", "All right. You have thirty days to get your resident card at an immigration office.")],
    no_visa_work: [t("Sin | visa | de | residente, | no puede | trabajar | ni | vivir | aquí.", "Without | a visa | as a | resident, | you can't | work | or | live | here.", "Without a resident visa, you can't work or live here.")],
    tourist_can: [t("Como | turista, | puede | entrar | de | vacaciones | o | por | negocios.", "As | a tourist, | you can | come in | on | vacation | or | for | business.", "As a tourist, you can come on vacation or on business.")],
    ans_visa: [t("Para | turismo | no necesita | visa, | solo | su | pasaporte.", "For | tourism | you don't need | a visa, | only | your | passport.", "You don't need a visa for tourism, just your passport.")],
    // Length of stay
    ask_length: [
      t("¿Cuántos | días | se va a quedar?", "How many | days | are you going to stay?", "How many days are you staying?"),
      t("¿Cuánto | tiempo | va | a | estar | en | México?", "How much | time | are you going | to | be | in | Mexico?", "How long will you be in Mexico?"),
      t("¿Cuántos | días | va | a | estar | aquí?", "How many | days | are you going | to | be | here?", "How many days will you be here?"),
    ],
    ask_length_again: [t("¿Cuántos | días, | entonces?", "How many | days, | then?", "So how many days?")],
    length_help: [t("¿Una | semana? | ¿Dos | semanas? | ¿Un | mes?", "One | week? | Two | weeks? | One | month?", "A week? Two weeks? A month?")],
    vague_length: [t("¿Cuántos | días, | más o menos?", "How many | days, | more or less?", "Roughly how many days?")],
    max_180: [t("Como | turista, | el | máximo | son | 180 | días.", "As | a tourist, | the | maximum | is | 180 | days.", "As a tourist, the maximum is 180 days.", { say: "Como turista, el máximo son ciento ochenta días." })],
    // Where
    ask_where: [
      t("¿Dónde | se va a hospedar?", "Where | are you going to stay?", "Where are you staying?"),
      t("¿Dónde | se va a quedar?", "Where | are you going to stay?", "Where will you be staying?"),
    ],
    ask_where_live: [t("¿Dónde | va | a | vivir?", "Where | are you going | to | live?", "Where are you going to live?")],
    ask_which_hotel: [t("¿En | qué | hotel?", "In | which | hotel?", "Which hotel?")],
    stay_help: [t("¿En | un | hotel? | ¿Con | familiares?", "In | a | hotel? | With | relatives?", "At a hotel? With family?")],
    ask_address: [
      t("¿Me | da | la | dirección?", "(To) me | you-give | the | address?", "What's the address?"),
      t("¿Tiene | la | dirección?", "Do you have | the | address?", "Do you have the address?"),
    ],
    address_show: [t("Muéstremela, | por favor.", "Show it to me, | please.", "Please show me.")],
    address_check: [t("¿La | puede | buscar | en | su | celular?", "It | can you | look for | on | your | phone?", "Could you look it up on your phone?", { flags: { 0: "la: it, the pronoun for la dirección (not the article)." } })],
    address_none: [t("Bueno, | no importa.", "Well, | it doesn't matter.", "Okay, never mind.")],
    // Return ticket
    ask_return_ticket: [t("¿Trae | su | boleto | de | regreso?", "Are you carrying | your | ticket | of | return?", "Do you have your return ticket?")],
    ask_fly_back: [t("¿Cuándo | regresa | a | su | país?", "When | do you return | to | your | country?", "When are you going back home?")],
    simple_return: [t("¿Tiene | boleto | de | regreso?", "Do you have | a ticket | of | return?", "Do you have a return ticket?")],
    show_ticket: [t("¿Me | muestra | su | boleto | de | regreso, | por favor?", "(To) me | you-show | your | ticket | of | return, | please?", "Could you show me your return ticket, please?")],
    ticket_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you.")],
    return_needed: [t("Necesitamos | ver | que | va | a | salir | del | país.", "We need | to see | that | you're going | to | leave | from the | country.", "We need to see that you'll be leaving the country.")],
    check_email: [t("¿Lo | puede | buscar | en | su | correo?", "It | can you | look for | in | your | email?", "Could you look for it in your email?")],
    leave_days: [t("Bueno. | Recuerde | que | tiene | que | salir | a | tiempo.", "Okay. | Remember | that | you have | to | leave | on | time.", "Okay. Remember you have to leave on time.")],
    // Extra questions
    ask_first: [t("¿Es | su | primera | vez | en | México?", "Is it | your | first | time | in | Mexico?", "Is this your first time in Mexico?")],
    ask_before: [t("¿Ya | había | venido | a | México?", "Already | had you | come | to | Mexico?", "Have you been to Mexico before?")],
    first_welcome: [t("¡Pues | {m:bienvenido|f:bienvenida}!", "Well | welcome!", "Well, welcome!")],
    welcome_back: [t("¡Qué | bueno | que | regresó!", "How | good | that | you came back!", "Nice to have you back!")],
    ask_job: [t("¿A | qué | se dedica?", "To | what | do you devote yourself?", "What do you do for a living?")],
    simple_job: [t("¿Cuál | es | su | trabajo?", "What | is | your | job?", "What's your job?")],
    retired_ack: [t("¡Qué | bien! | A | descansar.", "How | nice! | To | rest.", "How nice! Time to relax.")],
    ask_alone: [t("¿Viaja | {m:solo|f:sola}?", "Are you traveling | alone?", "Are you traveling alone?")],
    // the same yes/no as "¿Viaja solo?" ("¿Viene con alguien?" turned the learner's "Sí" into "alone")
    simple_alone: [t("¿Viene | {m:solo|f:sola}, | sin | familia | ni | amigos?", "Are you coming | alone, | without | family | or | friends?", "Are you here on your own, without family or friends?", { flags: { 4: "ni: nor; after sin (without), English says or." } })],
    ask_cash: [t("¿Cuánto | dinero | trae | para | su | viaje, | más o menos?", "How much | money | are you carrying | for | your | trip, | more or less?", "Roughly how much money do you have for your trip?")],
    simple_cash: [t("¿Trae | dinero | en efectivo | o | tarjetas?", "Are you carrying | money | in cash | or | cards?", "Do you have cash or cards?")],
    cash_howmuch: [t("¿Cuánto, | más o menos?", "How much, | more or less?", "About how much?")],
    cash_card_q: [t("¿Y | trae | tarjeta | de | crédito | o | débito?", "And | are you carrying | a card | of | credit | or | debit?", "And do you have a credit or debit card?")],
    cash_none: [t("Bueno. | Le | recomiendo | llevar | algo | de | dinero.", "Okay. | (To) you | I-recommend | to carry | some | — | money.", "Okay. I'd recommend carrying some money.", { flags: { 5: "algo de: some; de links algo to the noun." } })],
    // Biometrics
    fingers: [t("Ponga | el | dedo | índice | derecho | en | el | lector, | por favor.", "Put | the | finger | index | right | on | the | scanner, | please.", "Please put your right index finger on the scanner.")],
    left_hand: [t("Ahora | el | índice | izquierdo.", "Now | the | index | left.", "Now your left index finger.")],
    right_hand_answer: [t("El | índice | derecho, | este.", "The | index | right, | this one.", "Your right index finger, this one.")],
    left_hand_answer: [t("El | índice | izquierdo.", "The | index | left.", "Your left index finger.")],
    bio_good: [t("Eso | es.", "That | is it.", "That's it.")],
    like_that_yes: [t("Sí, | así.", "Yes, | like that.", "Yes, like that.")],
    bio_please: [t("Es | necesario, | por favor.", "It's | necessary, | please.", "I need you to do it, please.")],
    camera: [
      t("Mire | a | la | cámara, | por favor.", "Look | at | the | camera, | please.", "Please look at the camera."),
      t("Ahora | una | foto. | Mire | aquí.", "Now | a | photo. | Look | here.", "Now a photo. Look here."),
    ],
    photo_ok: [t("Ya está, | gracias.", "That's it, | thanks.", "That's it, thanks.")],
    take_off_glasses: [t("Quítese | los | lentes, | por favor.", "Take off | the | glasses, | please.", "Please take off your glasses.", { flags: { 1: "Spanish says the glasses where English says your glasses." } })],
    glasses_yes: [t("Sí, | quíteselos, | por favor.", "Yes, | take them off, | please.", "Yes, take them off, please.")],
    glasses_later: [t("Todavía no. | Primero | el | dedo.", "Not yet. | First | the | finger.", "Not yet. Your finger first.")],
    glasses_need: [t("Sí, | por favor, | para | la | foto.", "Yes, | please, | for | the | photo.", "Yes, please, for the photo.")],
    // Clarifying
    simple_passport: [t("Su | pasaporte, | por favor. | Para | revisarlo.", "Your | passport, | please. | To | check it.", "Your passport, please. I need to check it.")],
    simple_nothing: [t("No se preocupe.", "Don't worry.", "Don't worry.")],
    mean_yes: [t("Sí, | exacto.", "Yes, | exactly.", "Yes, exactly.")],
    mean_no: [t("Mmm, | no. | Le | pregunto | otra vez.", "Hmm, | no. | (To) you | I-ask | again.", "Hmm, not quite. Let me ask again.")],
    mean_purpose: [t("Motivo | es | la | razón: | ¿por qué | viene?", "“Motivo” | is | the | reason: | why | are you coming?", "“Motivo” means the reason: why are you here?")],
    mean_stay: [t("Hospedarse | es | quedarse | a | dormir: | ¿en | qué | lugar?", "“Hospedarse” | is | to stay | to | sleep: | in | what | place?", "“Hospedarse” means where you'll sleep: what place?")],
    mean_job: [t("Dedicarse | es | trabajar: | ¿cuál | es | su | trabajo?", "“Dedicarse” | is | to work: | what | is | your | job?", "“Dedicarse” here means work: what's your job?")],
    mean_return: [t("El | boleto | de | regreso | es | el | boleto | para | volver | a | su | país.", "The | ticket | of | return | is | the | ticket | to | go back | to | your | country.", "A return ticket is the ticket to go back home.")],
    mean_scanner: [t("El | lector | es | esta | maquinita, | para | el | dedo.", "The | scanner | is | this | little machine, | for | the | finger.", "The scanner is this little machine, for your finger.")],
    mean_cash: [t("Efectivo | son | billetes | y | monedas.", "Cash | is | bills | and | coins.", "Cash means bills and coins.")],
    mean_stamp: [t("El | sello | va | en | su | pasaporte, | con | sus | días.", "The | stamp | goes | in | your | passport, | with | your | days.", "The stamp goes in your passport, with your days.")],
    // Side questions
    ans_boarding: [t("No, | solo | su | pasaporte.", "No, | only | your | passport.", "No, just your passport.")],
    ans_form: [t("No, | no hay | que | llenar | nada. | Solo | le | pongo | un | sello.", "No, | there's no need | to | fill out | anything. | Just | (for) you | I-put | a | stamp.", "No, there's nothing to fill out. I'll just stamp your passport.")],
    ans_baggage: [t("El | equipaje | está | saliendo | de | aquí, | a la derecha.", "The | baggage | is | as you leave | — | here, | on the right.", "Baggage claim is just past here, on the right.", { flags: { 3: "saliendo de aquí: right after you leave here, a common way to give directions in Mexico." } })],
    ans_restroom: [t("Hay | baños | después de | migración.", "There are | restrooms | after | immigration.", "There are restrooms right after immigration.")],
    ans_taxi: [t("Los | taxis | están | afuera, | a la salida.", "The | taxis | are | outside, | at the exit.", "Taxis are outside, by the exit.")],
    ans_limit: [t("Como | visitante, | hasta | 180 | días. | Yo | le | pongo | los | días | de | su | viaje.", "As | a visitor, | up to | 180 | days. | I | (for) you | I-put | the | days | of | your | trip.", "As a visitor, up to 180 days. I give you the days for your trip.", { say: "Como visitante, hasta ciento ochenta días. Yo le pongo los días de su viaje." })],
    ans_customs: [t("La | aduana | está | después | del | equipaje.", "The | customs | is | after | the | baggage.", "Customs is right after baggage claim.", { flags: { 4: "del = de + el; después de: after." } })],
    routine_q: [t("Es | solo | una | pregunta | de | rutina.", "It's | just | a | question | of | routine.", "It's just a routine question.")],
    // The stamp
    stamp_days: [
      t("Le | doy | {$num} | días.", "(To) you | I-give | {$num} | days.", "I'm giving you {$num} days."),
      t("Le | pongo | {$num} | días.", "(For) you | I-put | {$num} | days.", "I'm putting down {$num} days."),
    ],
    stamp_until: [t("Le | pongo | los | días | hasta | su | regreso.", "(For) you | I-put | the | days | until | your | return.", "I'm giving you the days until your return.")],
    stamp_short: [t("Le | voy | a | dar | {$num} | días.", "(To) you | I'm going | to | give | {$num} | days.", "I'm going to give you {$num} days.")],
    days_remind: [t("Entonces, | ¿le | pongo | {$num} | días?", "So, | (for) you | I-put | {$num} | days?", "So, should I put down {$num} days?")],
    days_ticket_q: [t("¿Tiene | su | boleto | de | regreso? | ¿Me | lo | muestra?", "Do you have | your | ticket | of | return? | (To) me | it | you-show?", "Do you have your return ticket? Can you show me?")],
    stamp_more: [t("Muy | bien, | entonces | le | doy | {$num} | días.", "Very | good, | then | (to) you | I-give | {$num} | days.", "All right, then I'll give you {$num} days.")],
    stamp_more_until: [t("Muy | bien, | le | pongo | los | días | hasta | su | regreso.", "Very | good, | (for) you | I-put | the | days | until | your | return.", "All right, I'll give you the days until your return.")],
    stamp_keep: [t("Sin | boleto | de | regreso, | le | dejo | {$num} | días.", "Without | a ticket | of | return, | (to) you | I-leave | {$num} | days.", "Without a return ticket, I'll leave it at {$num} days.")],
    // Closing
    welcome: [
      t("Aquí tiene | su | pasaporte. | ¡{m:Bienvenido|f:Bienvenida} | a | México!", "Here's | your | passport. | Welcome | to | Mexico!", "Here's your passport. Welcome to Mexico!"),
      t("Aquí tiene | su | pasaporte. | ¡Que | disfrute | su | estancia!", "Here's | your | passport. | May | you enjoy | your | stay!", "Here's your passport. Enjoy your stay!"),
    ],
    here_passport: [t("Aquí tiene | su | pasaporte. | ¡Que | disfrute | su | estancia!", "Here's | your | passport. | May | you enjoy | your | stay!", "Here's your passport. Enjoy your stay!")],
    welcome_res: [t("Aquí tiene | su | pasaporte. | {m:Bienvenido|f:Bienvenida} | a | Puerto Colibrí.", "Here's | your | passport. | Welcome | to | Puerto Colibrí.", "Here's your passport. Welcome to Puerto Colibrí.")],
    closing_reply: [t("De nada. | ¡Que | le | vaya | bien!", "You're welcome. | (I hope) | (for) you | it-goes | well!", "You're welcome. Take care!")],
    you_too: [t("¡Igualmente! | ¡Que | le | vaya | bien!", "Likewise! | (I hope) | (for) you | it-goes | well!", "You too! Take care!")],
  },
  domains: { num: () => DAY_STEPS },

  hints: {
    passport: { lt: "Hand over your passport", items: [
      { id: "pp_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "pp_heres", s: t("Aquí está | mi | pasaporte.", "Here is | my | passport.", "Here's my passport.") },
      { id: "pp_boarding", s: t("¿Necesita | mi | pase de abordar?", "Do you need | my | boarding pass?", "Do you need my boarding pass?",
        { flags: { 2: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¿Necesita | mi | tarjeta de embarque?", "Do you need | my | boarding pass?", "Do you need my boarding pass?") }) },
      { id: "q_form", s: t("¿Tengo | que | llenar | algún | formulario?", "Do I have | to | fill out | any | form?", "Do I need to fill out a form?") },
    ] },
    purpose: { lt: "Say why you're here", items: [
      { id: "p_vac", s: t("Vengo | de | vacaciones.", "I'm coming | on | vacation.", "I'm here on vacation.") },
      { id: "p_business", s: t("Vengo | por | negocios.", "I'm coming | for | business.", "I'm here on business.") },
      { id: "p_work_trip", s: t("Vengo | por | trabajo.", "I'm coming | for | work.", "I'm here for work."), note: "Por trabajo = a work trip. To take a job here you need a resident visa." },
      { id: "p_pleasure", s: t("Placer.", "Pleasure.", "Pleasure."), note: "The short answer to “¿Negocios o placer?”." },
      { id: "p_tourist", s: t("Soy | turista.", "I'm | a tourist.", "I'm a tourist.") },
      { id: "p_here", s: t("Vengo | a | una | conferencia.", "I'm coming | to | a | conference.", "I'm here for a conference.") },
      { id: "p_visit", s: t("Vengo | a | visitar | a | mi | familia.", "I'm coming | to | visit | — | my | family.", "I'm here to visit my family.", { flags: { 3: "Personal a: Spanish marks a person as the object; English needs no word." } }) },
      { id: "p_friends", s: t("Visito | a | unos | amigos.", "I'm visiting | — | some | friends.", "I'm visiting friends.", { flags: { 1: "Personal a: Spanish marks a person as the object; English needs no word." } }) },
      { id: "p_study", s: t("Vengo | a | estudiar | español.", "I'm coming | to | study | Spanish.", "I'm here to study Spanish.") },
      { id: "p_live", s: t("Vine | a | vivir | aquí.", "I came | to | live | here.", "I've moved here."), note: "Moving here takes a resident visa from a Mexican consulate." },
    ] },
    biz: { lt: "Say what kind of business", items: [
      { id: "bz_conf", s: t("Una | conferencia.", "A | conference.", "A conference.") },
      { id: "bz_meet", s: t("Unas | reuniones | de | trabajo.", "Some | meetings | of | work.", "Some business meetings.") },
      { id: "bz_interview", s: t("Una | entrevista | de | trabajo.", "An | interview | for | work.", "A job interview.") },
    ] },
    who: { lt: "Say who you're visiting", slot: "rel", examples: ["hermana", "familia", "hija", "hermano", "hijo"], items: [
      { id: "v_my", s: t("A | mi | {X}.", "— | My | {X}.", "My {X}.", { flags: { 0: "Personal a: Spanish marks a person as the object; English needs no word." } }), only: (e) => !e.attrs?.pl },
      { id: "p_visit", s: t("Vengo | a | ver | a | mi | {X}.", "I'm coming | to | see | — | my | {X}.", "I'm here to see my {X}.", { flags: { 3: "Personal a: Spanish marks a person as the object; English needs no word." } }), only: (e) => !e.attrs?.pl },
    ] },
    visit: { lt: "Say who you're visiting", slot: "rel", examples: ["hermana", "familia", "hija", "hermano", "hijo"], items: [
      { id: "p_visit", s: t("Vengo | a | visitar | a | mi | {X}.", "I'm coming | to | visit | — | my | {X}.", "I'm here to visit my {X}.", { flags: { 3: "Personal a: Spanish marks a person as the object; English needs no word." } }), only: (e) => !e.attrs?.pl },
      { id: "v_to_visit", s: t("A | visitar | a | mi | {X}.", "To | visit | — | my | {X}.", "To visit my {X}.", { flags: { 2: "Personal a: Spanish marks a person as the object; English needs no word." } }), only: (e) => !e.attrs?.pl },
    ] },
    visa: { lt: "Say whether you have a resident visa", items: [
      { id: "vs_yes", s: t("Sí, | tengo | visa | de | residente.", "Yes, | I have | a visa | as a | resident.", "Yes, I have a resident visa.") },
      { id: "r_here", s: t("Sí, | aquí está | mi | visa.", "Yes, | here is | my | visa.", "Yes, here's my visa.") },
      { id: "vs_no", s: t("Solo | tengo | mi | pasaporte.", "Only | I have | my | passport.", "I only have my passport.") },
    ] },
    length: { lt: "Say how long you're staying", items: [
      { id: "d_short", s: t("Dos | semanas.", "Two | weeks.", "Two weeks.") },
      { id: "d_short", s: t("Quince | días.", "Fifteen | days.", "Fifteen days.") },
      { id: "d_short", s: t("Un | mes.", "A | month.", "A month.") },
      { id: "d_staying", s: t("Voy | a | estar | diez | días.", "I'm going | to | be | ten | days.", "I'll be here ten days.") },
      { id: "d_for", s: t("Por | una | semana.", "For | a | week.", "For a week.") },
      { id: "d_short", s: t("Hasta | el | veinte | de | junio.", "Until | the | twentieth | of | June.", "Until June 20th.") },
    ] },
    stay: { lt: "Say where you're staying", items: [
      { id: "w_hotel", s: t("En | el | Hotel | Mar Azul.", "At | the | Hotel | Mar Azul.", "At Hotel Mar Azul.") },
      { id: "w_staying", s: t("Me voy a hospedar | en | el | Hotel | Mar Azul.", "I'm going to stay | at | the | Hotel | Mar Azul.", "I'm staying at Hotel Mar Azul.") },
      { id: "w_family", s: t("Me quedo | con | mi | hermana.", "I'm staying | with | my | sister.", "I'm staying with my sister.") },
      { id: "w_friend", s: t("En | casa | de | unos | amigos.", "At | the house | of | some | friends.", "At some friends' place.") },
      { id: "w_airbnb", s: t("En | un | Airbnb.", "In | an | Airbnb.", "At an Airbnb.") },
      { id: "w_apartment", s: t("Renté | un | departamento.", "I rented | an | apartment.", "I rented an apartment.", { flags: { 2: "Mexican: departamento = apartment; apartamento elsewhere." }, neutral: t("Renté | un | apartamento.", "I rented | an | apartment.", "I rented an apartment.") }) },
    ] },
    address: { lt: "Give the address (or show it on your phone)", items: [
      { id: "a_its", s: t("Calle | Flamboyán, | número | veintitrés.", "Street | Flamboyán, | number | twenty-three.", "23 Flamboyán Street.") },
      { id: "a_phone", s: t("La | tengo | en | mi | celular.", "It | I-have | on | my | phone.", "I have it on my phone.", { flags: { 0: "la: it, the pronoun for la dirección (not the article)." } }) },
      { id: "a_dunno", s: t("No me acuerdo | de | la | dirección.", "I don't remember | — | the | address.", "I don't remember the address.", { flags: { 1: "acordarse de: de links the verb to what you remember." } }) },
    ] },
    return: { lt: "Say whether you have a return ticket", items: [
      { id: "r_yes", s: t("Sí, | lo | tengo | en | mi | celular.", "Yes, | it | I-have | on | my | phone.", "Yes, I have it on my phone.") },
      { id: "r_date", s: t("Regreso | el | veinte | de | junio.", "I return | on | the twentieth | of | June.", "I fly back on June 20th.", { flags: { 1: "el before a date: English says on." } }) },
      { id: "r_no", s: t("Todavía | no lo compro.", "Still | I haven't bought it.", "I haven't bought it yet.", { flags: { 1: "Mexican Spanish often uses the present here: todavía no lo compro = I haven't bought it yet." } }) },
    ] },
    fly_back: { lt: "Say when you fly back", items: [
      { id: "r_date", s: t("Regreso | el | veinte | de | junio.", "I return | on | the twentieth | of | June.", "I fly back on June 20th.", { flags: { 1: "el before a date: English says on." } }) },
      { id: "r_fly", s: t("Mi | vuelo | de | regreso | es | el | sábado.", "My | flight | of | return | is | on | Saturday.", "My return flight is on Saturday.", { flags: { 5: "el before a day: English says on." } }) },
      { id: "r_in", s: t("En | dos | semanas.", "In | two | weeks.", "In two weeks.") },
    ] },
    show: { lt: "Show it", items: [
      { id: "r_here", s: t("Aquí está.", "Here it is.", "Here it is.") },
      { id: "pp_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
    ] },
    first: { lt: "Say whether it's your first time", items: [
      { id: "f_first", s: t("Sí, | es | mi | primera | vez.", "Yes, | it's | my | first | time.", "Yes, it's my first time.") },
      { id: "f_before", s: t("No, | ya | vine | antes.", "No, | already | I-came | before.", "No, I've been here before.") },
      { id: "f_second", s: t("Es | mi | segunda | vez.", "It's | my | second | time.", "It's my second time.") },
    ] },
    job: { lt: "Say what you do", items: [
      { id: "j_im", s: t("Soy | {m:maestro|f:maestra}.", "I'm | a teacher.", "I'm a teacher.") },
      { id: "j_as", s: t("Trabajo | como | {m:enfermero|f:enfermera}.", "I work | as | a nurse.", "I work as a nurse.") },
      { id: "j_field", s: t("Trabajo | en | un | banco.", "I work | in | a | bank.", "I work at a bank.") },
      { id: "j_retired", s: t("Estoy | {m:jubilado|f:jubilada}.", "I'm | retired.", "I'm retired.") },
      { id: "j_own", s: t("Tengo | mi | propio | negocio.", "I have | my | own | business.", "I have my own business.") },
    ] },
    alone: { lt: "Say whether you're traveling alone", items: [
      { id: "al_alone", s: t("Sí, | viajo | {m:solo|f:sola}.", "Yes, | I'm traveling | alone.", "Yes, I'm traveling alone.") },
      { id: "al_with", s: t("Vengo | con | mi | familia.", "I'm coming | with | my | family.", "I'm here with my family.") },
    ] },
    cash: { lt: "Answer about money", items: [
      { id: "c_about", s: t("Traigo | unos | mil | dólares.", "I have | about | a thousand | dollars.", "I have about a thousand dollars.", { flags: { 1: "unos before a number: about." } }) },
      { id: "c_card", s: t("Pago | con | tarjeta.", "I pay | by | card.", "I'll pay by card.") },
    ] },
    bio_fingers: { lt: "Follow the instructions", items: [
      { id: "b_okay", s: t("Listo.", "Done.", "Done.") },
      { id: "b_like", s: t("¿Así?", "Like this?", "Like this?") },
      { id: "b_which", s: t("¿Cuál | dedo?", "Which | finger?", "Which finger?") },
    ] },
    bio_photo: { lt: "Look at the camera", items: [
      { id: "b_okay", s: t("Listo.", "Done.", "Done.") },
      { id: "b_glasses", s: t("¿Me quito | los | lentes?", "Do I take off | the | glasses?", "Should I take off my glasses?") },
    ] },
    bio_glasses: { lt: "Take off your glasses", items: [
      { id: "b_sure", s: t("Claro.", "Sure.", "Sure.") },
    ] },
    days: { lt: "Ask politely for more days", items: [
      { id: "dy_more", s: t("¿Me | puede | dar | treinta | días, | por favor?", "(To) me | can you | give | thirty | days, | please?", "Could you give me thirty days, please?") },
      { id: "dy_more2", s: t("Disculpe, | es que | voy | a | estar | un | mes.", "Excuse me, | it's just that | I'm going | to | be | a | month.", "Excuse me, but I'll be here for a month.") },
      { id: "r_fly", s: t("Mi | vuelo | de | regreso | es | el | veinte | de | junio.", "My | flight | of | return | is | on | the twentieth | of | June.", "My return flight is on June 20th.", { flags: { 5: "el before a date: English says on." } }) },
      { id: "dy_ok", s: t("Con | quince | días | está bien.", "With | fifteen | days | it's fine.", "Fifteen days is fine.") },
    ] },
    clarify: { lt: "Check what she means", items: [
      { id: "m_job", s: t("¿Se refiere | a | mi | trabajo?", "Are you referring | to | my | job?", "Do you mean my job?") },
      { id: "m_why", s: t("¿Se refiere | al | motivo | de | mi | viaje?", "Are you referring | to the | reason | for | my | trip?", "Do you mean why I'm here?") },
      { id: "m_days", s: t("¿Se refiere | a | cuántos | días?", "Are you referring | to | how many | days?", "Do you mean how many days?") },
      { id: "c_meaning", s: t("¿Qué | significa | hospedarse?", "What | does it mean | hospedarse?", "What does “hospedarse” mean?") },
      { id: "q_how_long", s: t("¿Cuánto | tiempo | puedo | quedarme?", "How much | time | can I | stay?", "How long can I stay?") },
    ] },
  },
  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With an officer, usted is more polite: puede, se refiere (puedes and te refieres are for friends).", better: "¿Me puede dar treinta días?" },
  },
  merges: {
    "se va a quedar": { reason: "grammatical_fusion", split: "se → himself + va → goes + a → to + quedar → remain gives a false reflexive and a motion verb; = are you going to stay.", minimal: "The pronominal periphrastic future only." },
    "se va a hospedar": { reason: "grammatical_fusion", split: "se → himself + va → goes + a → to + hospedar → lodge gives a false reflexive and a motion verb; = are you going to stay.", minimal: "The pronominal periphrastic future only." },
    "me voy a hospedar": { reason: "grammatical_fusion", split: "me → myself + voy → I go + a → to + hospedar → lodge gives a false reflexive and a motion verb; = I'm going to stay.", minimal: "The pronominal periphrastic future only." },
    "me quedo": { reason: "grammatical_fusion", split: "me → myself + quedo → I remain gives a false reflexive; quedarse = stay.", minimal: "Only the pronoun and verb." },
    "me quito": { reason: "grammatical_fusion", split: "me → myself + quito → I remove gives a false reflexive object; quitarse = take off (clothes, glasses).", minimal: "Only the pronoun and verb." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is literal but reads as a comparison; = roughly.", minimal: "Three words." },
    "después de": { reason: "lexical_expression", split: "después → afterwards + de → of misreads the preposition: after.", minimal: "Two words." },
    "a la salida": { reason: "lexical_expression", split: "a → to + la → the + salida → exit misreads the location: at the exit.", minimal: "Three words." },
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → port + colibrí → hummingbird would translate the town's proper name.", minimal: "The two-word name only." },
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name.", minimal: "Only the two-word name; Hotel stays separate." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → no misreads the answer: not yet.", minimal: "Two words." },
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board misreads the document's name: boarding pass.", minimal: "The three-word noun only." },
    "es que": { reason: "lexical_expression", split: "es → is + que → that misreads the softener that introduces a reason: it's just that.", minimal: "Two words." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding is the compound noun boarding pass.", minimal: "Three words, one noun." },
  },

  // The learner's plan: a follow-up question (who? which hotel? the address?) keeps its main item open.
  mission: [
    { step: "passport", lt: "Hand over your passport" },
    { lt: "Say why you're here", done: (c) => !!c.s.purpose && !["biz_kind", "who", "visa"].some((id) => stepOpen(c, id)) },
    { lt: "Say how long you're staying", optional: true, when: (c) => !resident(c), done: (c) => !resident(c) && !!c.s.length },
    { lt: "Say where you're staying", done: (c) => stepDef("stay").done(c) && !stepOpen(c, "address") },
    { lt: "Answer an extra question", optional: true, when: (c) => EXTRA.some((id) => applies(c, id)),
      done: (c) => EXTRA.some((id) => applies(c, id)) && !EXTRA.some((id) => stepOpen(c, id)) },
    { lt: "Finger on the scanner, look at the camera", optional: true, when: (c) => !!c.s.fingers, done: (c) => !!c.s.fingersDone && !!c.s.photoDone },
    { lt: "Look at the camera", optional: true, when: (c) => !!c.s.photo && !c.s.fingers, done: (c) => !c.s.fingers && !!c.s.photoDone },
    { step: "days", lt: "Ask for the days you need", optional: true },
  ],

  steps: [
    { id: "passport", done: (c) => !!c.s.passport,
      ask: (c) => { c.say(c.s.askedPassport ? "ask_passport" : "greet_passport"); c.s.askedPassport = true; },
      expects: ["hand_over", "find_it", "q_boarding", "q_form", "long_flight_ctx"],
      suggest: [{ lt: "Hand over your passport", hint: "passport" }, { lt: "Say hello", hint: "g_greet" }],
      yes: (c) => givePassport(c),
      help: (c) => c.say("simple_passport") },
    { id: "purpose", done: (c) => !!c.s.purpose,
      ask: (c) => c.say(c.s.touristQ ? "purpose_retry_tourist" : c.s.purposeRetry ? "purpose_retry" : "ask_purpose"),
      expects: ["purpose", "purpose_visit", "purpose_neg", "ask_mean", "both_ctx", "why_ctx"],
      suggest: [
        { lt: "Say why you're here", hint: "purpose" },
        { lt: "Say who you're visiting", hint: "visit", options: ["familia", "hermana", "hermano", "hijo", "hija", "amigos", "padres", "primo"] },
        { lt: "Check what she means", hint: "clarify" },
      ],
      yes: (c) => { if (c.s.touristQ) { setPurpose(c, "vacation"); return; } c.say("purpose_help"); c.hold(); },
      // "No" to "Entonces, ¿viene como turista?": the open question again, not the same line twice
      no: (c) => { if (c.s.touristQ) { c.s.touristQ = false; c.s.purposeRetry = true; } },
      help: (c) => c.say("purpose_help") },
    { id: "biz_kind", when: (c) => c.s.purpose === "business" && c.s.askBizKind && !c.s.event, done: (c) => !!c.s.bizAsked,
      ask: (c) => { c.s.bizAsked = true; c.say("biz_kind"); },
      expects: ["purpose", "both_ctx"],
      suggest: [{ lt: "Say what kind of business", hint: "biz" }],
      help: (c) => c.say("biz_kind") },
    { id: "who", when: (c) => (c.s.purpose === "family" || c.s.purpose === "friends") && !c.s.visitRel && c.s.askWho, done: (c) => !!c.s.visitRel,
      ask: (c) => c.say("who_visit"),
      expects: ["who_ctx", "purpose_visit"],
      suggest: [{ lt: "Say who you're visiting", hint: "who", options: ["hermana", "hermano", "hijo", "hija", "padres", "amigos", "primo", "tia"] }],
      help: (c) => c.say("who_visit") },
    { id: "visa", when: (c) => c.s.purpose === "work" || c.s.purpose === "live", done: (c) => !!c.s.visaOk,
      ask: (c) => c.say("visa_q"),
      expects: ["hand_over", "have_visa", "have_esta", "why_ctx"],
      suggest: [{ lt: "Say whether you have a resident visa", hint: "visa" }],
      yes: (c) => visaOk(c),
      no: (c) => noVisa(c) },
    { id: "length", when: (c) => !resident(c), done: (c) => !!c.s.length,
      ask: (c) => c.say("ask_length"),
      expects: ["length", "length_vague", "ask_mean", "q_limit", "length_num_ctx", "why_ctx"],
      suggest: [{ lt: "Say how long you're staying", hint: "length" }, { lt: "Check what she means", hint: "clarify" }],
      help: (c) => c.say("length_help") },
    { id: "stay", done: (c) => !!c.s.stay && c.s.stay !== "hotel_generic",
      ask: (c) => c.say(c.s.stay === "hotel_generic" ? "ask_which_hotel" : resident(c) ? "ask_where_live" : "ask_where"),
      expects: ["stay", "stay_with", "stay_airbnb", "hotel_other_ctx", "stay_town_ctx", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Say where you're staying", hint: "stay" }, { lt: "Check what she means", hint: "clarify" }],
      help: (c) => c.say("stay_help") },
    { id: "address", when: (c) => ["family", "friend", "airbnb"].includes(c.s.stay) && c.s.askAddress, done: (c) => !!c.s.address,
      ask: (c) => c.say("ask_address"),
      expects: ["address_ctx", "address_phone", "address_phone_ctx", "address_show_ctx", "address_dunno", "address_dunno_ctx", "hand_over", "why_ctx"],
      suggest: [{ lt: "Give the address (or show it on your phone)", hint: "address" }],
      yes: (c) => { c.say("address_show"); c.expect(showAddressPending("address_show")); },
      no: (c) => { c.say("address_check"); c.expect(showAddressPending("address_check")); },
      help: (c) => { c.say("address_check"); c.expect(showAddressPending("address_check")); } },
    { id: "return", when: (c) => c.s.askReturn && !resident(c), done: (c) => c.s.ret !== undefined,
      ask: (c) => {
        if (c.s.retQ === undefined) c.s.retQ = c.chance(0.3) ? "when" : "ticket";
        c.say(c.s.retQ === "when" ? "ask_fly_back" : "ask_return_ticket");
        c.expect(returnPending(c.s.retQ));
      },
      expects: ["return_yes", "return_date", "return_no", "return_no_ctx", "hand_over", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Say whether you have a return ticket", hint: "return" }],
      yes: (c) => retYes(c), no: (c) => retNo(c),
      help: (c) => simpleAsk(c, "return") },
    { id: "first", when: (c) => c.s.askFirst, done: (c) => c.s.first !== undefined,
      ask: (c) => {
        if (c.s.firstQ === undefined) c.s.firstQ = c.chance(0.65) ? "first" : "before";
        c.say(c.s.firstQ === "first" ? "ask_first" : "ask_before");
      },
      expects: ["first_yes", "first_no", "first_no_ctx", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Say whether it's your first time", hint: "first" }],
      yes: (c) => { c.s.first = c.s.firstQ === "first"; c.say(c.s.first ? "first_welcome" : "welcome_back"); },
      no: (c) => { c.s.first = c.s.firstQ !== "first"; c.say(c.s.first ? "first_welcome" : "ack"); } },
    { id: "job", when: (c) => c.s.askJob, done: (c) => !!c.s.job,
      ask: (c) => c.say("ask_job"),
      expects: ["job", "job_other_ctx", "job_field_ctx", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Say what you do", hint: "job" }, { lt: "Check what she means", hint: "clarify" }],
      help: (c) => c.say("simple_job") },
    { id: "alone", when: (c) => c.s.askAlone, done: (c) => c.s.alone !== undefined,
      ask: (c) => c.say("ask_alone"),
      expects: ["alone_yes", "alone_yes_ctx", "alone_with", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Say whether you're traveling alone", hint: "alone" }],
      yes: (c) => { c.s.alone = true; ack(c, 0.6); },
      no: (c) => { c.s.alone = false; ack(c, 0.6); } },
    { id: "cash", when: (c) => c.s.askCash, done: (c) => c.s.cash !== undefined,
      ask: (c) => c.say("ask_cash"),
      expects: ["cash_no", "cash_amount", "card_ctx", "cash_yes_ctx", "cash_none_ctx", "both_ctx", "ask_mean", "why_ctx"],
      suggest: [{ lt: "Answer about money", hint: "cash" }],
      yes: (c) => { c.say("cash_howmuch"); c.hold(); },
      no: (c) => { c.say("cash_card_q"); c.expect(cardPending()); },
      help: (c) => c.say("simple_cash") },
    { id: "bio_fingers", when: (c) => c.s.fingers, done: (c) => !!c.s.fingersDone, expects: ["bio_ok_ctx", "like_this_ctx", "which_hand_ctx"],
      ask: (c) => { c.say("fingers"); c.expect(bioPending("right")); },
      suggest: [{ lt: BIO_TASK.right, hint: "bio_fingers" }] },
    { id: "bio_photo", when: (c) => !!c.s.photo, done: (c) => !!c.s.photoDone, expects: ["bio_ok_ctx", "like_this_ctx"],
      ask: (c) => {
        if (c.s.glasses && !c.s.glassesAsked) { c.s.glassesAsked = true; c.say("take_off_glasses"); c.expect(glassesPending()); return; }
        c.say("camera"); c.expect(photoPending());
      },
      suggest: [{ lt: "Look at the camera and say “Listo”", hint: "bio_photo" }] },
    // The twist: she gives fewer days than asked
    { id: "days", when: (c) => !!c.s.shortTwist && !resident(c) && !!c.s.length && shortOf(c) !== undefined, done: (c) => !!c.s.daysDone,
      ask: (c) => {
        if (c.s.shortSaid) { c.say("days_remind", { num: c.s.short }); return; }
        c.s.shortSaid = true; c.s.short = shortOf(c);
        c.twist("fewer_days");
        c.say("stamp_short", { num: c.s.short });
      },
      expects: ["more_days", "accept_days_ctx", "length", "return_date", "hand_over", "q_limit", "days_given", "length_num_ctx", "what_if_more_ctx", "why_ctx"],
      suggest: [{ lt: "Ask politely for more days", hint: "days" }, { lt: "Accept the days", hint: "g_yesno" }],
      yes: (c) => acceptShort(c),
      no: (c) => moreDays(c) },
  ],

  init: (c) => {
    // A short, clear corridor: passport → purpose → how long → where, plus at most one extra question per visit.
    const extra = c.pick(["none", "none", "first", "job", "return", "bizkind", "who", "alone", "cash"] as const);
    c.s.askBizKind = extra === "bizkind";
    c.s.askWho = extra === "who";
    c.s.askAddress = c.chance(0.35);
    c.s.showTicket = c.visits >= 1 && c.chance(0.3);
    c.s.askReturn = c.s.showTicket || extra === "return";
    c.s.askFirst = extra === "first";
    c.s.askJob = extra === "job";
    c.s.askAlone = extra === "alone";
    c.s.askCash = extra === "cash";
    c.s.shortTwist = c.visits >= 1 && c.chance(0.35);
    // Biometrics only now and then, so the conversation stays about the questions
    c.s.fingers = c.chance(0.2);
    c.s.photo = c.s.fingers || c.chance(0.4);
    c.s.leftHand = c.chance(0.3);
    c.s.glasses = c.chance(0.2);
  },

  start: (c) => {
    c.say("next");
    if (c.chance(0.3)) {
      c.say("greet_howareyou");
      c.s.askedPassport = true;
      // the passport is asked after the whole answer (the next step), so "Bien, pero un poco cansada" asks it once and
      // "¡Ay, lo siento!" never comes after "Su pasaporte, por favor"
      expectHowAreYou(c, (cc) => { turn(cc).greetReply = true; });
      return;
    }
  },

  handlers: {
    hand_over(c, slots) {
      const docs = toArr(slots.doc);
      const mover = c.s.purpose === "work" || c.s.purpose === "live";
      if (!c.s.passport && (!docs.length || docs.includes("passport") || c.step === "passport")) {
        // "Aquí está mi boleto" at "Su pasaporte, por favor" is not the passport (a visa is inside one, so it counts)
        if (docs.length && !docs.includes("passport") && !docs.includes("visa")) { c.say("ans_boarding"); c.hold(); return; }
        givePassport(c); if (docs.includes("visa") && mover) visaOk(c); return;
      }
      if (c.step === "visa") {
        // only the visa answers "¿Tiene visa de residente?" (a sticker inside the passport): a ticket or a boarding pass
        // doesn't; "Sí, está en mi pasaporte" is a yes, "No, solo mi pasaporte" a no, the passport alone gets "¿Y su visa?"
        const h = fold(c.heard);
        if (docs.includes("visa") || !docs.length) { visaOk(c); return; }
        if (docs.includes("passport") && (/^\W*si\b/.test(h) || /\besta en (mi|el) pasaporte\b/.test(h))) { visaOk(c); return; }
        if (/^\W*no\b/.test(h) || /\b(solo|nomas|nada mas)\b/.test(h)) { noVisa(c); return; }
        c.say("visa_again"); c.hold(); return;
      }
      if (docs.includes("visa") && mover) { visaOk(c); return; }
      if (c.step === "address") { c.s.address = true; once(c, "ty", "thank_you"); return; }
      // the passport again where a return ticket is asked for: she has it already (the question stays open)
      if ((c.step === "return" || c.step === "days") && !showsTicket(slots)) { c.say("already_have"); return; }
      if (c.step === "return") { retYes(c); return; }
      if (c.step === "days") { c.s.ret = true; grantMore(c); return; }
      if (docs.includes("visa")) { c.say("ans_visa"); return; }
      if (docs.includes("boarding") || docs.includes("form") || docs.includes("ticket")) { c.say("ans_boarding"); return; }
      c.say("already_have");
    },
    find_it(c) { if (!/\b(momento|segundo|minuto)\b/i.test(c.heard)) c.say("g_take_time"); c.hold(); },
    // (the how-are-you reply may have answered this turn already)
    long_flight(c) { if (!turn(c).greetReply) c.say("g_sorry_to_hear"); },
    long_flight_ctx(c) { if (!turn(c).greetReply) c.say("g_sorry_to_hear"); },
    purpose(c, slots, seg) {
      const tags = allTags(slots, seg);
      const p = (slots.purpose as string | undefined) ?? tagVal(tags, "pv:");
      if (!p) { c.say("purpose_help"); c.hold(); return; }
      // "Trabajo." or "Turismo." to "¿A qué se dedica?" (or any later question) is no new purpose: the question again
      if (tags.includes("bare") && c.s.purpose && !["purpose", "biz_kind", "visa"].includes(c.step ?? "")) { simpleAsk(c, c.step); c.hold(); return; }
      // "Vacaciones no negocios": which one is meant depends on a comma the engine never sees
      if (tags.includes("amb") && slots.neg && slots.neg !== p) { c.say("purpose_which"); c.hold(); return; }
      // "No vengo a una conferencia, vengo de vacaciones": an event there belongs to the refused purpose
      setPurpose(c, p, slots.neg === "business" ? undefined : tagVal(tags, "ev:"));
    },
    purpose_visit(c, slots) {
      const rel = slots.rel as string | undefined;
      c.s.purpose = rel ? (FRIENDLY.has(rel) ? "friends" : "family") : /amig/i.test(c.heard) ? "friends" : "family";
      c.s.purposeRetry = false; c.s.touristQ = false;
      if (rel && rel !== "familia" && rel !== "amigos") c.s.visitRel = rel;
      ack(c, 0.4);
    },
    purpose_neg(c, slots, seg) {
      const neg = (slots.purpose as string | undefined) ?? tagVal(allTags(slots, seg), "pv:");
      // "No, vengo de vacaciones" at "¿Tiene visa de residente?" folds like "No vengo de vacaciones": there it is
      // the visa's no and the tourist's purpose
      if (c.step === "visa" && typeof neg === "string" && neg !== "work" && neg !== "live" && /^\W*no\b/.test(fold(c.heard))) {
        visaRule(c); setPurpose(c, neg); return;
      }
      if (neg && c.s.purpose === neg) c.s.purpose = undefined;
      // asked again as "Entonces, ¿cuál es el motivo…?", never "¿Negocios o placer?" right after "No vengo de vacaciones"
      c.s.purposeRetry = true; c.s.touristQ = false;
    },
    have_esta(c) {
      if (c.s.purpose === "work" || c.s.purpose === "live") { noVisa(c); return; }
      if (c.step === "purpose" && c.s.touristQ) { setPurpose(c, "vacation"); return; }
      c.say("ans_visa");
    },
    have_visa(c, slots, seg) {
      // "Tengo la residencia en trámite": not yet a visa
      if (/\b(en tramite|en proceso|tramitando)\b/.test(fold(c.heard))) { passport.handlers.have_esta(c, slots, seg); return; }
      if (c.step === "visa" || c.s.purpose === "work" || c.s.purpose === "live") { visaOk(c); return; }
      c.say("ack");
    },
    who_ctx(c, slots) { c.s.visitRel = slots.rel || "familia"; ack(c, 0.6); },
    length(c, slots, seg) {
      let d = daysFrom(slots);
      // At the stamp (twist), a figure is a request for more days
      if (c.step === "days") { moreDays(c, d); return; }
      if (d === undefined) return;
      if (allTags(slots, seg).includes("amb") && slots.neg) { c.say("ask_length_again"); c.hold(); return; }
      // "Un mes o dos semanas" comes as two figures: with "o" between them the longer one counts
      const T = turn(c);
      if (typeof d === "number" && typeof T.len === "number" && /\bo\b/.test(fold(c.heard))) d = Math.max(d, T.len);
      if (typeof d === "number") T.len = d;
      if (d === "vague") { c.say("vague_length"); c.hold(); return; }
      if (d === "until") { c.s.length = "until"; ack(c, 0.5); return; }
      if (d > 180) { c.say("max_180"); c.say("ask_length_again"); c.hold(); return; }
      c.s.length = d; c.s.days = d;
      ack(c, 0.5);
    },
    length_vague(c) { c.say("vague_length"); c.hold(); },
    stay(c, slots) {
      const h = slots.hotel as string;
      const T = turn(c);
      if (h === "hotel_generic") { if (!T.named && c.s.stay !== "hotel") c.s.stay = "hotel_generic"; return; }
      T.named = true;
      c.s.stay = "hotel"; c.s.hotel = h;
      ack(c, 0.5);
    },
    stay_with(c, slots, seg) {
      const rel = slots.rel as string | undefined;
      if (seg.tags.includes("addr")) c.s.address = true;
      if (rel) c.s.stay = FRIENDLY.has(rel) ? "friend" : "family";
      else if (seg.tags.includes("pron")) c.s.stay = c.s.purpose === "friends" ? "friend" : "family";
      else c.s.stay = /amig/i.test(c.heard) ? "friend" : "family";
      ack(c, 0.4);
    },
    stay_airbnb(c, _slots, seg) {
      if (seg.tags.includes("addr")) { c.s.stay = "friend"; c.s.address = true; ack(c, 0.6); return; }
      c.s.stay = "airbnb"; ack(c, 0.4);
    },
    hotel_other_ctx(c) { c.s.stay = "hotel"; c.s.hotel = "other"; ack(c, 0.6); },
    address_ctx(c) { c.s.address = true; once(c, "ty", "thank_you"); },
    address_phone(c) { c.say("address_show"); c.expect(showAddressPending("address_show")); },
    address_phone_ctx(c) { c.say("address_show"); c.expect(showAddressPending("address_show")); },
    address_show_ctx(c) { c.say("address_show"); c.expect(showAddressPending("address_show")); },
    address_dunno(c) { c.say("address_check"); c.expect(showAddressPending("address_check")); },
    address_dunno_ctx(c) { c.say("address_check"); c.expect(showAddressPending("address_check")); },
    return_yes(c) { if (c.step === "days") { moreDays(c); return; } retYes(c); },
    return_date(c, slots) {
      if (c.step === "days") { moreDays(c, daysFrom(slots)); return; }
      // "En dos semanas" at the length question is a length
      if (c.step === "length" && slots.dur) { passport.handlers.length(c, slots, { intent: "length", slots, tags: [] }); return; }
      // "Me voy el 20 de junio" at the length question: the days until that date
      if (c.step === "length") { c.s.length = "until"; ack(c, 0.5); return; }
      retYes(c);
    },
    return_no(c) {
      const T = turn(c);
      if (T.retNo) return;
      T.retNo = true;
      if (c.step === "days") { keepShort(c); return; }
      // "Todavía no la tengo" at "¿Tiene visa de residente?" is about the visa, not a ticket
      if (c.step === "visa") { noVisa(c); return; }
      retNo(c);
    },
    return_no_ctx(c, slots, seg) { passport.handlers.return_no(c, slots, seg); },
    first_yes(c) { c.s.first = true; if (c.chance(0.6)) c.say("first_welcome"); },
    first_no(c) {
      // "No, es mi primera vez" (to "¿Ya había venido?") folds like "No es mi primera vez" (to "¿Es su primera vez?")
      // (and "No, primera vez", "No, la primera")
      if (c.s.firstQ === "before" && /^no (es |esta es )?(mi |la )?primera\b/.test(fold(c.heard).replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim())) { passport.handlers.first_yes(c, {}, { intent: "first_yes", slots: {}, tags: [] }); return; }
      c.s.first = false; c.say(c.chance(0.5) ? "welcome_back" : "ack");
    },
    job(c, slots, seg) {
      c.s.job = (slots.job as string | undefined) ?? tagVal(seg.tags, "j:") ?? (slots.field ? "field" : "other");
      if (c.s.job === "retired" && c.chance(0.5)) c.say("retired_ack"); else ack(c, 0.6);
    },
    job_other_ctx(c) { c.s.job = "other"; ack(c, 0.8); },
    job_field_ctx(c) { c.s.job = "field"; ack(c, 0.8); },
    alone_yes(c) {
      // "¿Qué significa solo?" asks about the word (the global g_meaning answers it): no answer yet
      if (/\b(significa|quiere decir)\b/.test(fold(c.heard))) return;
      c.s.alone = true; ack(c, 0.6);
    },
    alone_yes_ctx(c, slots, seg) { passport.handlers.alone_yes(c, slots, seg); },
    alone_with(c) { c.s.alone = false; ack(c, 0.6); },
    cash_no(c) { c.s.cash = "card"; ack(c, 0.7); },
    cash_amount(c) { c.s.cash = "yes"; ack(c, 0.7); },
    like_this_ctx(c) { c.say("like_that_yes"); },
    bio_ok_ctx(c) { ack(c, 0.3); },
    which_hand_ctx(c) { c.say("right_hand_answer"); },
    word_meaning(c, slots) {
      const line = WORD_LINE[slots.word as string];
      if (!line) { c.say("g_meaning"); c.hold(); return; }
      c.say(line);
      if (line !== "right_hand_answer") simpleAsk(c, c.step);
      c.hold();
    },
    glasses(c) { c.say(c.step === "bio_photo" ? "glasses_yes" : "glasses_later"); },
    q_esta(c) {
      // "¿Necesito visa?" at "¿Tiene visa de residente?": to live or work here, yes (the rule once; the question stays open)
      if (c.step === "visa") { if (c.s.visaInfo) c.say("visa_q"); else visaRule(c); c.hold(); return; }
      c.say("ans_visa");
    },
    q_customs(c) { c.say("ans_customs"); },
    days_given(c) {
      // "¿Cuántos días me dio?": after the stamp her figure again; at the stamp the days she offers; before it the rule
      if (!c.s.stamped) {
        if (c.step === "days" && c.s.short) { c.say("stamp_short", { num: c.s.short }); c.hold(); return; }
        c.say("ans_limit"); return;
      }
      if (resident(c)) { c.say("visa_ok_res"); return; }
      const st = stampOf(c);
      if (st === "until") c.say("stamp_until"); else if (typeof st === "number") c.say("stamp_days", { num: st }); else c.say("ans_limit");
    },
    why_ctx(c) {
      // "¿Por qué?": at the stamp a request for more days (she asks for the ticket), at a ticket question the reason, at
      // the visa the rule; elsewhere a routine question (it stays open)
      if (c.step === "days") { if (c.s.ticketQ) { c.say("return_needed"); return; } moreDays(c); return; }
      if (c.step === "return") { c.say("return_needed"); return; }
      if (c.step === "visa") { if (c.s.visaInfo) c.say("visa_q"); else visaRule(c); c.hold(); return; }
      c.say("routine_q"); c.hold();
    },
    length_num_ctx(c, slots) {
      const n = slots.number;
      if (typeof n !== "number") return;
      // at the stamp her own figure is asked back, a smaller one accepts it, a bigger one asks for more
      if (c.step === "days") {
        if (n === c.s.short) { c.say("days_remind", { num: c.s.short }); c.hold(); return; }
        if (n < (c.s.short ?? 0)) { acceptShort(c); return; }
        moreDays(c, n); return;
      }
      // "¿Cuántos días?" → "Quince.": days. A bare "dos" or "tres" could be weeks or months: she offers the choices
      if (n < 5) { c.say("length_help"); c.hold(); return; }
      if (n > 180) { c.say("max_180"); c.say("ask_length_again"); c.hold(); return; }
      c.s.length = n; c.s.days = n;
      ack(c, 0.5);
    },
    what_if_more_ctx(c) { c.say("leave_days"); c.hold(); },
    stay_town_ctx(c) { c.say("stay_help"); c.hold(); },
    first_no_ctx(c) { c.s.first = false; c.say(c.chance(0.5) ? "welcome_back" : "ack"); },
    card_ctx(c) { c.s.cash = "card"; ack(c, 1); },
    cash_yes_ctx(c) { c.s.cash = "yes"; ack(c, 1); },
    cash_none_ctx(c) { c.say("cash_card_q"); c.expect(cardPending()); },
    both_ctx(c) {
      // "Los dos": both purposes at "¿Negocios o placer?" (business), both kinds at "¿Reunión o conferencia?", cash and cards
      // at the money question
      if (c.step === "cash") { c.s.cash = "yes"; ack(c, 1); return; }
      if (c.step === "biz_kind") { ack(c, 1); return; }
      setPurpose(c, "both");
    },
    q_boarding(c) { c.say("ans_boarding"); },
    q_form(c) { c.say("ans_form"); },
    q_baggage(c) { c.say("ans_baggage"); },
    q_restroom(c) { c.say("ans_restroom"); },
    q_taxi(c) { c.say("ans_taxi"); },
    q_limit(c) { c.say("ans_limit"); },
    more_days(c, slots) {
      if (c.step !== "days") { c.say("ans_limit"); return; }
      const want = typeof slots.number === "number" ? slots.number : daysFrom(slots);
      moreDays(c, want);
    },
    accept_days_ctx(c, slots, seg) {
      if (c.step !== "days") { ack(c, 1); return; }
      // "No necesito más días" = "No, necesito más días" once folded: a typed "No," decides, else she asks once
      // ("Entonces, ¿le pongo quince días?"); said again after that question, it answers it: no, more days
      if (seg.tags.includes("amb")) {
        if (/^\W*no\s*[,.;:!]/i.test(c.heard) || c.s.daysAmb) { moreDays(c); return; }
        c.s.daysAmb = true; c.say("days_remind", { num: c.s.short }); c.hold(); return;
      }
      // "Treinta días está bien" when she gives fifteen names more days than hers: a request, not a yes
      if (typeof slots.number === "number" && slots.number > (c.s.short ?? 0)) { moreDays(c, slots.number); return; }
      acceptShort(c);
    },
    ask_mean(c, slots, seg) {
      let topic = slots.topic as string | undefined;
      if (!topic) {
        const h = seg.tags.find((x) => x.startsWith("h:"))?.slice(2);
        topic = h === "m_job" ? "job" : h === "m_stay" ? "stay" : h === "m_days" ? "length" : h === "m_why" ? "purpose" : undefined;
      }
      const cur = c.step;
      const match = topic && (TOPIC_STEP[topic] === cur || (topic === "purpose" && cur === "biz_kind") || (topic === "stay" && cur === "address") || (topic === "length" && cur === "days"));
      c.say(match ? "mean_yes" : "mean_no");
      simpleAsk(c, cur);
      c.hold();
    },
  },

  finish: (c) => {
    c.complete();
    c.s.stamped = true;
    if (resident(c)) c.say("welcome_res");
    else {
      if (!c.s.daysDone) {
        if (c.s.length === "until") c.say("stamp_until");
        else if (typeof c.s.days === "number") c.say("stamp_days", { num: grantOf(c.s.days) });
      }
      // after "¡Pues bienvenido!" (first time) no second welcome
      if (c.s.first === true) c.say("here_passport"); else c.say("welcome");
    }
    c.event("give", { item: "passport" });
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "closing_reply"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "you_too"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    // Every hint construction
    { say: "Aquí tiene", intent: "hand_over", step: "passport" },
    { say: "Aquí está mi pasaporte", intent: "hand_over", step: "passport" },
    { say: "¿Necesita mi pase de abordar?", intent: "q_boarding" },
    { say: "¿Tengo que llenar algún formulario?", intent: "q_form" },
    { say: "Vengo de vacaciones", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "Vengo por negocios", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "Vengo por trabajo", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "Placer", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "Soy turista", intent: "purpose", step: "purpose" },
    { say: "Vengo a una conferencia", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "Vengo a visitar a mi familia", intent: "purpose_visit", step: "purpose" },
    { say: "Visito a unos amigos", intent: "purpose_visit", step: "purpose" },
    { say: "Vengo a estudiar español", intent: "purpose", step: "purpose" },
    { say: "Vine a vivir aquí", intent: "purpose", step: "purpose" },
    { say: "Una conferencia", intent: "purpose", step: "biz_kind" },
    { say: "Unas reuniones de trabajo", intent: "purpose", step: "biz_kind" },
    { say: "Una entrevista de trabajo", intent: "purpose", step: "biz_kind" },
    { say: "A mi hermana", intent: "who_ctx", step: "who", slots: { rel: "hermana" } },
    { say: "Vengo a ver a mi hijo", intent: "purpose_visit", step: "who" },
    { say: "A visitar a mi hija", intent: "purpose_visit", step: "purpose" },
    { say: "Sí, tengo visa de residente", intent: "have_visa", step: "visa" },
    { say: "Sí, aquí está mi visa", intent: "hand_over", step: "visa" },
    { say: "Solo tengo mi pasaporte", intent: "have_esta", step: "visa", not: ["hand_over"] },
    { say: "Dos semanas", intent: "length", step: "length" },
    { say: "Quince días", intent: "length", step: "length" },
    { say: "Un mes", intent: "length", step: "length" },
    { say: "Voy a estar diez días", intent: "length", step: "length" },
    { say: "Por una semana", intent: "length", step: "length" },
    { say: "Hasta el veinte de junio", intent: "length", step: "length" },
    { say: "En el Hotel Mar Azul", intent: "stay", step: "stay", slots: { hotel: "marazul" } },
    { say: "Me voy a hospedar en el Hotel Mar Azul", intent: "stay", step: "stay" },
    { say: "Me quedo con mi hermana", intent: "stay_with", step: "stay" },
    { say: "En casa de unos amigos", intent: "stay_with", step: "stay" },
    { say: "En un Airbnb", intent: "stay_airbnb", step: "stay" },
    { say: "Renté un departamento", intent: "stay_airbnb", step: "stay" },
    { say: "Renté un apartamento", intent: "stay_airbnb", step: "stay" },
    { say: "Calle Ceiba, número quince", intent: "address_ctx", step: "address" },
    { say: "La tengo en mi celular", intent: "address_phone", step: "address" },
    { say: "No me acuerdo de la dirección", intent: "address_dunno", step: "address" },
    { say: "Sí, lo tengo en mi celular", intent: "return_yes", step: "return" },
    { say: "Regreso el veinte de junio", intent: "return_date", step: "return" },
    { say: "Todavía no lo compro", intent: "return_no", step: "return", not: ["return_yes"] },
    { say: "Mi vuelo de regreso es el sábado", intent: "return_date", step: "return" },
    { say: "En dos semanas", intent: "return_date", step: "return" },
    { say: "Sí, es mi primera vez", intent: "first_yes", step: "first" },
    { say: "No, ya vine antes", intent: "first_no", step: "first" },
    { say: "Es mi segunda vez", intent: "first_no", step: "first" },
    { say: "Soy maestra", intent: "job", step: "job" },
    { say: "Trabajo como enfermero", intent: "job", step: "job" },
    { say: "Trabajo en un banco", intent: "job", step: "job" },
    { say: "Estoy jubilada", intent: "job", step: "job" },
    { say: "Tengo mi propio negocio", intent: "job", step: "job" },
    { say: "Sí, viajo sola", intent: "alone_yes", step: "alone" },
    { say: "Vengo con mi familia", intent: "alone_with", step: "alone" },
    { say: "Traigo unos mil dólares", intent: "cash_amount", step: "cash" },
    { say: "Pago con tarjeta", intent: "cash_no", step: "cash" },
    { say: "¿Así?", intent: "like_this_ctx", step: "bio_fingers" },
    { say: "¿Cuál dedo?", intent: "which_hand_ctx", step: "bio_fingers" },
    { say: "¿Me quito los lentes?", intent: "glasses" },
    { say: "¿Me puede dar treinta días, por favor?", intent: "more_days", step: "days" },
    { say: "Disculpe, es que voy a estar un mes", intent: "more_days", step: "days" },
    { say: "Con quince días está bien", intent: "accept_days_ctx", step: "days", not: ["more_days"] },
    { say: "¿Se refiere a mi trabajo?", intent: "ask_mean", step: "job" },
    { say: "¿Se refiere al motivo de mi viaje?", intent: "ask_mean", step: "purpose" },
    { say: "¿Se refiere a cuántos días?", intent: "ask_mean", step: "length" },
    { say: "¿Qué significa hospedarse?", intent: "word_meaning", step: "stay" },
    { say: "¿Cuánto tiempo puedo quedarme?", intent: "q_limit", step: "length", not: ["length"] },
    // Natural alternatives, short answers, tú to staff, slips, no accents
    { say: "Turismo", intent: "purpose", step: "purpose" },
    { say: "Es un viaje de negocios", intent: "purpose", step: "purpose" },
    { say: "Tengo unas juntas con clientes", intent: "purpose", step: "purpose" },
    { say: "Vine a conocer la playa y los cenotes", intent: "purpose", step: "purpose" },
    { say: "Me mudé a Puerto Colibrí", intent: "purpose", step: "purpose" },
    { say: "Un poco de los dos", intent: "both_ctx", step: "purpose" },
    { say: "Vengo a la boda de mi prima", intent: "purpose", step: "purpose" },
    { say: "Más o menos un mes", intent: "length", step: "length" },
    { say: "Me quedo tres semanas", intent: "length", step: "length" },
    { say: "Una semana y media", intent: "length", step: "length" },
    { say: "Unos días", intent: "length", step: "length" },
    { say: "Me quedo en el Mar Azul", intent: "stay", step: "stay" },
    { say: "En un hotel", intent: "stay", step: "stay" },
    { say: "En un hostal", intent: "hotel_other_ctx", step: "stay" },
    { say: "Es en la avenida del Mar 230", intent: "address_ctx", step: "address" },
    { say: "Nunca he venido a México", intent: "first_yes", step: "first" },
    { say: "No traigo mucho efectivo, pero tengo tarjeta", intent: "cash_no", step: "cash" },
    { say: "aqui esta mi pasaporte", intent: "hand_over", step: "passport" },
    { say: "vengo de vacasiones", intent: "purpose", step: "purpose" },
    { say: "¿Me puedes dar más días?", intent: "more_days", step: "days" },
    { say: "Te refieres a mi trabajo", intent: "ask_mean", step: "job" },
    { say: "Un momento, está en mi mochila", intent: "find_it", step: "passport" },
    // Spain forms are correct answers
    { say: "Está en mi móvil", intent: "address_phone", step: "address" },
    { say: "¿Me quito las gafas?", intent: "glasses" },
    { say: "¿Tenéis baños aquí?", intent: "q_restroom" },
    { say: "¿Dónde puedo coger un taxi?", intent: "q_taxi" },
    { say: "Vale, dos semanas", intent: "length", step: "length" },
    // Meaning safety: no purpose, ticket, stay or extra days may be invented from a negation
    { say: "No vengo de vacaciones", intent: "purpose_neg", step: "purpose", not: ["purpose"] },
    { say: "No vengo a trabajar", intent: "purpose_neg", step: "purpose", not: ["purpose"] },
    { say: "No soy turista", intent: "purpose_neg", step: "purpose", not: ["purpose"] },
    { say: "No vengo a vivir aquí", intent: "purpose_neg", step: "purpose", not: ["purpose"] },
    { say: "No tengo boleto de regreso", intent: "return_no", step: "return", not: ["return_yes"] },
    { say: "No es mi primera vez", intent: "first_no", step: "first", not: ["first_yes"] },
    { say: "No viajo solo", intent: "alone_with", step: "alone", not: ["alone_yes"] },
    { say: "No necesito más días", intent: "accept_days_ctx", step: "days", not: ["more_days"] },
    { say: "No me voy a quedar en un hotel", intent: "none", step: "stay" },
    { say: "No tengo mi pasaporte", intent: "none", step: "passport" },
    { say: "No visito a mi familia", intent: "none", step: "purpose" },
    { say: "Negocios no, vacaciones", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "No es por trabajo, es por placer", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "Un mes no, dos semanas", intent: "length", step: "length", slots: { dur: { number: 2 } } },
    { say: "No quiero quince días", intent: "none", step: "days" },
    { say: "No regreso el veinte de junio", intent: "none", step: "return" },
    { say: "No sé", intent: "g_dontknow", step: "purpose", not: ["address_dunno"] },
    { say: "Tengo unas juntas con clientes", intent: "purpose", step: "purpose", not: ["hand_over", "cash_amount"] },
    { say: "¿Puede darme treinta días?", intent: "more_days", step: "days", slots: { number: 30 } },
    { say: "Vengo a la playa", intent: "purpose", step: "purpose" },
    { say: "El domingo", intent: "return_date", step: "return" },
    // The review's traps and gaps
    { say: "Todavía no la tengo", intent: "have_esta", step: "visa", not: ["return_no"] },
    { say: "Sí, la visa está en mi pasaporte", intent: "have_visa", step: "visa" },
    { say: "Una visita de trabajo", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "Vine a vivir", intent: "purpose", step: "purpose" },
    { say: "Vengo a jubilarme aquí", intent: "purpose", step: "purpose" },
    { say: "Una conferencia de medicina", intent: "purpose", step: "biz_kind" },
    { say: "¿Con qué mano?", intent: "which_hand_ctx", step: "bio_fingers" },
    { say: "Prefiero treinta días", intent: "more_days", step: "days", slots: { number: 30 } },
    { say: "Sí, tengo boleto de ida y vuelta", intent: "return_yes", step: "return" },
    { say: "Es de ida nomás", intent: "return_no", step: "return", not: ["return_yes"] },
    { say: "Sí, es la primera", intent: "first_yes", step: "first" },
    { say: "Tres semanas y media", intent: "length", step: "length", not: ["job"] },
    { say: "Del cinco al veinte de junio", intent: "length", step: "length" },
    { say: "Quince días no son suficientes", intent: "length", step: "days", not: ["accept_days_ctx"] },
    { say: "No me alcanza", intent: "more_days", step: "days", not: ["accept_days_ctx"] },
    // The lead's check: flips and gaps
    { say: "Tengo la residencia en trámite", intent: "have_esta", step: "visa", not: ["have_visa"] },
    { say: "Mi visa todavía está en trámite", intent: "have_esta", step: "visa", not: ["have_visa"] },
    { say: "No, solo mi pasaporte", intent: "have_esta", step: "visa", not: ["alone_yes", "alone_yes_ctx", "have_visa"] },
    { say: "No, no lo compré", intent: "return_no_ctx", step: "return", not: ["return_yes"] },
    { say: "No, no lo tengo en el celular", intent: "return_no_ctx", step: "return", not: ["hand_over", "return_yes"] },
    { say: "No me acuerdo", intent: "g_dontknow", step: "return", not: ["return_no_ctx", "return_yes"] },
    { say: "No, no lo tengo aquí", intent: "find_it", step: "passport", not: ["address_phone_ctx", "address_dunno_ctx", "hand_over"] },
    { say: "No, no la tengo en el celular", intent: "address_dunno_ctx", step: "address", not: ["address_phone"] },
    { say: "Solo yo", intent: "alone_yes_ctx", step: "alone" },
    { say: "¿Me puede dar quince días más?", intent: "more_days", step: "days", slots: { number: 15 }, not: ["accept_days_ctx"] },
    { say: "Quince está bien", intent: "accept_days_ctx", step: "days", not: ["more_days"] },
    { say: "Entre dos y tres semanas", intent: "length", step: "length", slots: { dur: { number: 2, max: 3 } } },
    { say: "Dos semanas o tres", intent: "length", step: "length", slots: { dur: { number: 2, max: 3 } } },
    { say: "Un mes, mejor dos semanas", intent: "length", step: "length", slots: { dur: { number: 2 } } },
    { say: "Hasta el veinte", intent: "length", step: "length" },
    { say: "Del cinco de junio al veinte de julio", intent: "length", step: "length" },
    { say: "Es de ida", intent: "return_no", step: "return", not: ["return_yes"] },
    { say: "Es de ida y vuelta", intent: "return_yes", step: "return", not: ["return_no"] },
    { say: "Sí, una vez", intent: "first_no", step: "first", not: ["first_yes"] },
    // The 5 Nov audit: answers that were not understood or meant something else
    { say: "Quince", intent: "length_num_ctx", step: "length" },
    { say: "Unos diez", intent: "length_num_ctx", step: "length" },
    { say: "Hasta diciembre", intent: "length", step: "length" },
    { say: "En Tulum", intent: "stay_town_ctx", step: "stay", not: ["stay"] },
    { say: "Calle Flamboyán, número veintitrés", intent: "address_ctx", step: "address" },
    { say: "Calle Flamboyán número 23, entre Hidalgo y Juárez", intent: "address_ctx", step: "address" },
    { say: "Es en el centro", intent: "address_dunno_ctx", step: "address", not: ["address_ctx"] },
    { say: "¿Necesita mi tarjeta de embarque?", intent: "q_boarding" },
    { say: "Tarjeta de crédito", intent: "card_ctx", step: "cash" },
    { say: "Débito", intent: "card_ctx", step: "cash" },
    { say: "Efectivo", intent: "cash_yes_ctx", step: "cash" },
    { say: "No traigo efectivo", intent: "cash_none_ctx", step: "cash", not: ["cash_no", "cash_amount"] },
    { say: "No traigo efectivo, pero tengo tarjeta", intent: "cash_no", step: "cash", not: ["cash_none_ctx"] },
    { say: "Las dos", intent: "both_ctx", step: "cash", not: ["purpose"] },
    { say: "Vengo a casarme", intent: "purpose", step: "purpose" },
    { say: "Vengo a un retiro de yoga", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "Vacaciones y un poco de trabajo", intent: "purpose", step: "purpose" },
    { say: "Tengo visa de turista", intent: "have_esta", step: "visa", not: ["have_visa", "hand_over"] },
    { say: "No tengo visa de residente, solo de turista", intent: "have_esta", step: "visa", not: ["have_visa"] },
    { say: "Sí, pero está en trámite", intent: "have_esta", step: "visa", not: ["have_visa"] },
    { say: "Sí tengo, pero no la traigo", intent: "have_esta", step: "visa", not: ["have_visa"] },
    { say: "Sí, residente temporal", intent: "have_visa", step: "visa" },
    { say: "¿Necesito visa?", intent: "q_esta", step: "visa", not: ["have_visa", "have_esta"] },
    { say: "No, es la segunda", intent: "first_no", step: "first", not: ["first_yes"] },
    { say: "Sí, el año pasado", intent: "first_no_ctx", step: "first", not: ["first_yes"] },
    { say: "Así está bien", intent: "accept_days_ctx", step: "days", not: ["more_days"] },
    { say: "Está bien así", intent: "accept_days_ctx", step: "days", not: ["more_days"] },
    { say: "¿Y si me quedo más tiempo?", intent: "what_if_more_ctx", step: "days", not: ["more_days", "length"] },
    { say: "¿Por qué?", intent: "why_ctx", step: "days" },
    { say: "¿Por qué?", intent: "why_ctx", step: "cash" },
    { say: "¿Por qué solo quince días?", intent: "more_days", step: "days", not: ["why_ctx"] },
    { say: "Treinta", intent: "length_num_ctx", step: "days" },
    { say: "¿Cuántos días me dio?", intent: "days_given", not: ["q_limit"] },
    { say: "¿Dónde está la aduana?", intent: "q_customs" },
    { say: "¿Tengo que declarar algo?", intent: "q_customs" },
    { say: "Bien, gracias. Fue un vuelo muy largo", intent: "long_flight", step: "passport" },
    { say: "Muy largo", intent: "long_flight_ctx", step: "passport" },
    { say: "En ventas", intent: "job_field_ctx", step: "job" },
    { say: "Turismo", intent: "job_field_ctx", step: "job", not: ["purpose"] },
    // Must not be understood
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
    { say: "bicicleta pasaporte azul", intent: "none" },
  ],
  sims: [
    { name: "happy path: vacation at the hotel", turns: ["Hola, aquí está mi pasaporte.", "Vengo de vacaciones.", "Dos semanas.", "En el Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 14, stay: "hotel" } }, auto: PP_AUTO, setup: (s) => { s.shortTwist = false; s.askAddress = false; } },
    { name: "several facts at once, a side question, the address", turns: ["Buenas tardes. Aquí tiene. ¿Necesita mi pase de abordar?", "Vengo a visitar a mi hermana por diez días.", "Me quedo con ella.", "Calle Ceiba número quince.", "Muchas gracias."],
      expect: { complete: true, state: { purpose: "family", stay: "family", address: true } }, auto: PP_AUTO, setup: (s) => { s.askAddress = true; s.shortTwist = false; } },
    { name: "questions, a negation and changes of mind", turns: ["Aquí tiene.", "No vengo de vacaciones. Vengo a una conferencia.", "¿Se refiere a cuántos días?", "Ocho meses.", "Perdón, dos meses.", "En un hotel.", "El Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { purpose: "business", event: "conference", days: 60, hotel: "marazul" } }, auto: omit(PP_AUTO, ["purpose", "length", "stay"]), setup: (s) => { s.shortTwist = false; } },
    { name: "a job here without a visa, then a tourist", turns: ["Aquí está mi pasaporte.", "Vengo a trabajar aquí.", "No, no tengo visa.", "Sí, de vacaciones.", "Una semana.", "En un Airbnb.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 7, stay: "airbnb" } }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay"]), setup: (s) => { s.shortTwist = false; s.askAddress = false; } },
    { name: "visiting family: who, and a side question", turns: ["Aquí tiene.", "Visito a mi familia.", "A mi hermana.", "Tres semanas.", "¿Dónde recojo mi maleta?", "Con mi hermana.", "Gracias."],
      expect: { complete: true, state: { purpose: "family", visitRel: "hermana", stay: "family" } }, auto: omit(PP_AUTO, ["who"]),
      setup: (s) => { quiet(s); s.askWho = true; s.shortTwist = false; } },
    { name: "business: what kind, and not alone", turns: ["Aquí tiene.", "Por negocios.", "Unas juntas con clientes.", "Diez días.", "En el Hotel Mar Azul.", "No, vengo con mi esposa.", "Gracias."],
      expect: { complete: true, state: { purpose: "business", event: "meeting", alone: false } }, auto: omit(PP_AUTO, ["biz_kind", "alone"]),
      setup: (s) => { quiet(s); s.askBizKind = true; s.askAlone = true; s.shortTwist = false; } },
    { name: "a mover with a resident visa", turns: ["Aquí tiene.", "Vine a vivir aquí.", "Sí, tengo visa de residente.", "En un departamento en la calle Flamboyán número ocho.", "Gracias."],
      expect: { complete: true, state: { purpose: "live", visaOk: true, address: true } }, auto: omit(PP_AUTO, ["purpose", "visa", "stay"]), setup: (s) => { s.shortTwist = false; } },
    { name: "fewer days: ask politely and show the ticket (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "Disculpe, voy a estar un mes. ¿Me puede dar treinta días?", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { daysResult: "more", days: 30, short: 15 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: accept them (twist forced)", turns: ["Aquí tiene.", "Por negocios.", "Tres semanas.", "En el Hotel Mar Azul.", "Con quince días está bien.", "Gracias."],
      expect: { complete: true, state: { daysResult: "short", short: 15 } }, auto: omit(PP_AUTO, ["days"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days, no return ticket (twist forced)", turns: ["Aquí tiene.", "Turismo.", "Hasta el veinte de junio.", "En casa de unos amigos.", "¿Me puede dar más días, por favor?", "No tengo boleto de regreso.", "Gracias."],
      expect: { complete: true, state: { daysResult: "short", short: 15, stay: "friend" } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "return ticket shown on request (twist forced)", turns: ["Aquí tiene.", "Vengo de vacaciones.", "Dos semanas.", "En el Hotel Mar Azul.", "Sí, lo tengo en mi celular.", "Claro, aquí está.", "Gracias."],
      expect: { complete: true, state: { ret: true, ticketShown: true } }, auto: omit(PP_AUTO, ["return", "show_ticket"]),
      setup: (s) => { s.askReturn = true; s.retQ = "ticket"; s.showTicket = true; s.shortTwist = false; s.askAddress = false; } },
    { name: "short answers at every question", turns: ["Tenga.", "Placer.", "Quince días.", "Mar Azul.", "Listo.", "Listo.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", fingersDone: true, photoDone: true } }, auto: PP_AUTO,
      setup: (s) => { s.shortTwist = false; s.fingers = true; s.photo = true; s.leftHand = false; s.glasses = false; s.askAddress = false; } },
    { name: "the other wordings: when do you fly back, been here before, job", turns: ["Aquí tiene.", "Vengo de vacaciones.", "Dos semanas.", "En el Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { ret: true, first: true } }, auto: PP_AUTO,
      setup: (s) => { s.askReturn = true; s.retQ = "when"; s.askFirst = true; s.firstQ = "before"; s.askJob = true; s.shortTwist = false; s.showTicket = false; } },
    // The review: folds that mean two things, and answers that must not flip
    { name: "the passport is not a visa; no visa yet means a tourist", turns: ["Aquí tiene.", "Vengo a vivir aquí.", "Aquí está mi pasaporte.", "Todavía no la tengo.", "Sí.", "Dos semanas.", "En el Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 14 } }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay"]),
      setup: (s) => { quiet(s); s.shortTwist = false; } },
    { name: "a contrast without its comma is asked again", turns: ["Aquí tiene.", "Vacaciones, no negocios.", "Vacaciones.", "Un mes, no dos semanas.", "Dos semanas.", "En el Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 14 } }, auto: omit(PP_AUTO, ["purpose", "length", "stay"]),
      setup: (s) => { quiet(s); s.shortTwist = false; } },
    { name: "no cash, and no card either", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "No.", "No tengo tarjeta.", "Gracias."],
      expect: { complete: true, state: { cash: "none" } }, auto: omit(PP_AUTO, ["cash", "cash_card"]),
      setup: (s) => { quiet(s); s.askCash = true; s.shortTwist = false; } },
    { name: "been here before? No, it's my first time", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "No, es mi primera vez.", "Gracias."],
      expect: { complete: true, state: { first: true } }, auto: omit(PP_AUTO, ["first"]),
      setup: (s) => { quiet(s); s.askFirst = true; s.firstQ = "before"; s.shortTwist = false; } },
    { name: "fewer days: thanks first, then a month in one breath (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "Gracias.", "Está bien, pero voy a estar un mes.", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { daysResult: "more", days: 30 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    // The lead's check: the stamp, the visa, and answers the engine's folds turned around
    { name: "fewer days: fifteen days MORE is added to hers (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Dos meses.", "En el Hotel Mar Azul.", "¿Me puede dar quince días más?", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { daysResult: "more", short: 30, days: 45 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: 'No necesito más días' is asked again, then No (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "No necesito más días.", "No.", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { daysResult: "more", days: 30 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: a typed 'No, necesito más días' (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "No, necesito más días.", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { daysResult: "more", days: 30 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: 'No necesito más días' at the ticket question keeps her days (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "¿Me puede dar treinta días?", "No necesito más días.", "Gracias."],
      expect: { complete: true, state: { daysResult: "short", short: 15 } }, auto: omit(PP_AUTO, ["days"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: the passport is not the return ticket (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "¿Me puede dar treinta días?", "Aquí está mi pasaporte.", "No, no lo tengo en el celular.", "Gracias."],
      expect: { complete: true, state: { daysResult: "short", short: 15 } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "a boarding pass is no visa, and one in process is none yet", turns: ["Aquí tiene.", "Vine a vivir aquí.", "Aquí está mi pase de abordar.", "Tengo la residencia en trámite.", "Sí.", "Dos semanas.", "En el Hotel Mar Azul.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 14 } }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay"]),
      setup: (s) => { quiet(s); s.shortTwist = false; } },
    { name: "no resident visa: 'No, vengo de vacaciones' at the visa question", turns: ["Aquí tiene.", "Vengo a trabajar aquí.", "No, vengo de vacaciones.", "Dos semanas.", "En un Airbnb.", "Gracias."],
      expect: { complete: true, state: { purpose: "vacation", days: 14, stay: "airbnb" } }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay"]),
      setup: (s) => { quiet(s); s.shortTwist = false; } },
    { name: "traveling alone: what 'solo' means, then No", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "¿Qué significa solo?", "¿Se refiere a si viajo solo?", "No.", "Gracias."],
      expect: { complete: true, state: { alone: false } }, auto: omit(PP_AUTO, ["alone"]),
      setup: (s) => { quiet(s); s.askAlone = true; s.shortTwist = false; } },
    { name: "been here before? 'No, primera vez'", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "No, primera vez.", "Gracias."],
      expect: { complete: true, state: { first: true } }, auto: omit(PP_AUTO, ["first"]),
      setup: (s) => { quiet(s); s.askFirst = true; s.firstQ = "before"; s.shortTwist = false; } },
    // (since the 5 Nov audit "No, no lo compré" first gets only the reminder, so "No, no lo tengo" comes first here)
    { name: "a month or two weeks counts as a month; 'No, no lo compré' is no return ticket", turns: ["Aquí tiene.", "De vacaciones.", "Un mes o dos semanas.", "En el Hotel Mar Azul.", "No, no lo tengo.", "No, no lo compré.", "Gracias."],
      expect: { complete: true, state: { days: 30, ret: false } }, auto: omit(PP_AUTO, ["length", "return", "ticket_check"]),
      setup: (s) => { quiet(s); s.askReturn = true; s.retQ = "ticket"; s.shortTwist = false; } },
    // The 5 Nov audit
    { name: "a bare figure for the days; 'Así está bien' takes hers (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Treinta.", "En el Hotel Mar Azul.", "Así está bien.", "Gracias."],
      expect: { complete: true, state: { days: 30, short: 15, daysResult: "short" } }, auto: omit(PP_AUTO, ["length", "days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: 'No, gracias, está bien así' and a what-if ask for nothing (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "¿Y si me quedo más tiempo?", "No, gracias, está bien así.", "Gracias."],
      expect: { complete: true, state: { days: 30, short: 15, daysResult: "short" } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "fewer days: '¿Por qué?' asks for more; the ticket shown (twist forced)", turns: ["Aquí tiene.", "De vacaciones.", "Un mes.", "En el Hotel Mar Azul.", "¿Por qué?", "Sí, aquí está.", "Gracias."],
      expect: { complete: true, state: { days: 30, daysResult: "more" } }, auto: omit(PP_AUTO, ["days", "days_ticket"]),
      setup: (s) => { quiet(s); s.shortTwist = true; } },
    { name: "a return ticket not bought yet: a reminder, nothing to look up", turns: ["Aquí tiene.", "De vacaciones.", "Dos semanas.", "En el Hotel Mar Azul.", "Todavía no lo compro.", "¿Cuántos días me dio?", "Gracias."],
      expect: { complete: true, state: { ret: false, days: 14 } }, auto: PP_AUTO,
      setup: (s) => { quiet(s); s.askReturn = true; s.retQ = "ticket"; s.shortTwist = false; } },
    { name: "money: no cash, a credit card", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "No traigo efectivo.", "Tarjeta de crédito.", "Gracias."],
      expect: { complete: true, state: { cash: "card", purpose: "vacation" } }, auto: omit(PP_AUTO, ["cash", "cash_card"]),
      setup: (s) => { quiet(s); s.askCash = true; s.shortTwist = false; } },
    { name: "money: 'Las dos' is cash and cards, not the purpose", turns: ["Aquí tiene.", "De vacaciones.", "Diez días.", "En el Hotel Mar Azul.", "¿Por qué?", "¿Se refiere a mi trabajo?", "Las dos.", "Gracias."],
      expect: { complete: true, state: { cash: "yes", purpose: "vacation" } }, auto: omit(PP_AUTO, ["cash"]),
      setup: (s) => { quiet(s); s.askCash = true; s.shortTwist = false; } },
    { name: "a business trip: 'Trabajo' and 'Turismo' at the job question keep the purpose", turns: ["Aquí tiene.", "Por negocios.", "Diez días.", "En el Hotel Mar Azul.", "Trabajo.", "Turismo.", "Gracias."],
      expect: { complete: true, state: { purpose: "business", job: "field" } }, auto: omit(PP_AUTO, ["job"]),
      setup: (s) => { quiet(s); s.askJob = true; s.shortTwist = false; } },
    { name: "a job here: '¿Necesito visa?', then not a tourist either, then a visit", turns: ["Aquí tiene.", "Vengo a trabajar aquí.", "¿Necesito visa?", "No.", "No.", "Vengo a visitar a mi hermana.", "Quince.", "En Tulum.", "Con mi hermana.", "Gracias."],
      expect: { complete: true, state: { purpose: "family", days: 15, stay: "family" } }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay", "who"]),
      setup: (s) => { quiet(s); s.shortTwist = false; } },
  ],
};

export default passport;
