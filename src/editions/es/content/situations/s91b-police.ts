// NEEDS: None. The wallet, places, colors and contents are local (the Spanish s91a-lost-wallet doesn't exist yet; when
//   it does, the two files could share ITEMS / PLACES / COLORS as the English edition does).
// Song 91 "Can You Help Me, Please?" (part 2) → Puerto Colibrí: "Quiero levantar una denuncia".
// Oficial Reyes at the Policía Municipal across from the zócalo, next to the museum (s62) (usted). He takes a police report (un reporte) about a stolen or
// lost wallet: what happened, where and when, what it looks like, what was in it (cards → "¿Ya llamó a su banco?"; a
// passport → the consulate), the learner's name (spelled), a phone number, a signature, and the report number (el
// folio). The learner may ask for a copy "para el seguro".
// Keeps the English agenda, steps, intents and both twists: someone turns in a wallet during the report (turned_in), and
// "¿Trae alguna identificación?". New twist from the brief (visits ≥ 1, a theft): "ministerio": the officer explains
// that this is a police report, not a denuncia; a formal denuncia is filed at the Ministerio Público (the state
// prosecutor's office), and the learner can ask where it is, what to bring, whether it can be done online.
// Research (2 Nov 2026), kept vague where unsure: in Mexico a formal criminal complaint (denuncia) is filed with the
// Ministerio Público of the state Fiscalía, not with the municipal police; insurers usually ask for that denuncia.
// No office address, opening hours, online procedure or fee is taught: the lines say "aquí cerca", "le anoto la
// dirección", "algunos trámites se pueden hacer en línea".

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";
import { numberSlot } from "@/convo/slots";

// ---------------------------------------------------------------------------
// Entities

const ITEMS: EntityDef[] = [
  ent("wallet", "cartera", "wallet", "f", { pl: "carteras", ltPl: "wallets", chip: "cartera",
    forms: ["billetera", "monedero", "carterita", "mi cartera", "cartera de piel", "billetera de piel"] }),
  ent("phone", "celular", "phone", "m", { pl: "celulares", ltPl: "phones", chip: "celular",
    forms: ["telefono", "cel", "telefono celular", "iphone", "smartphone", "celu", "un iphone", "un samsung", "samsung"] }),
  ent("bag", "bolsa", "purse", "f", { pl: "bolsas", ltPl: "purses", chip: "bolsa", forms: ["bolso", "bolsa de mano", "bolsita"] }),
  ent("backpack", "mochila", "backpack", "f", { pl: "mochilas", ltPl: "backpacks", chip: "mochila", forms: ["morral", "backpack", "mochilita"] }),
];

/** Places where it happened; prep = the English preposition of "En el …" ("At the market", "On the bus", "In a taxi"). */
const P = (id: string, es: string, en: string, g: "m" | "f", prep: "at" | "on" | "in", forms: string[] = []) =>
  ent(id, es, en, g, { forms, chip: es, attrs: { prep } });
const PLACES: EntityDef[] = [
  P("market", "mercado", "market", "m", "at", ["mercado municipal", "mercadito"]),
  P("square", "zócalo", "main square", "m", "at", ["zocalo", "plaza", "plaza principal", "kiosco", "tianguis", "centro", "jardin principal"]),
  P("cafe", "café", "café", "m", "at", ["cafe la ceiba", "la ceiba", "cafeteria"]),
  P("bakery", "panadería", "bakery", "f", "at", ["panaderia"]),
  P("bank", "banco", "bank", "m", "at", ["banco del puerto"]),
  P("atm", "cajero", "ATM", "m", "at", ["cajero automatico", "atm"]),
  P("pharmacy", "farmacia", "pharmacy", "f", "at", ["farmacia del puerto"]),
  P("post_office", "correo", "post office", "m", "at", ["oficina de correos", "correos"]),
  P("supermarket", "súper", "supermarket", "m", "at", ["super", "supermercado", "tienda", "tiendita", "abarrotes"]),
  P("museum", "museo", "museum", "m", "at"),
  P("restaurant", "restaurante", "restaurant", "m", "at", ["el muelle", "restaurante el muelle", "fonda", "taqueria", "puesto de tacos"]),
  P("beach", "playa", "beach", "f", "at"),
  P("malecon", "malecón", "boardwalk", "m", "on", ["malecon"]),
  P("park", "parque", "park", "m", "at"),
  P("bench", "banca", "bench", "f", "on", ["banca del parque", "banquita"]),
  P("station", "terminal", "bus station", "f", "at", ["terminal de autobuses", "central de autobuses", "central camionera"]),
  P("bus", "autobús", "bus", "m", "on", ["camion", "autobus", "bus", "colectivo", "combi", "camion urbano"]),
  P("taxi", "taxi", "taxi", "m", "in", ["uber", "un uber"]),
  P("cenote", "cenote", "cenote", "m", "at"),
  P("hotel", "hotel", "hotel", "m", "at", ["hotel mar azul", "mar azul", "mi hotel"]),
  P("street", "calle", "street", "f", "on", ["banqueta", "acera"]),
  P("church", "iglesia", "church", "f", "at", ["la iglesia del zocalo", "parroquia"]),
  P("bus_stop", "parada", "bus stop", "f", "at", ["parada del camion", "parada de camion", "parada del autobus", "parada de autobus", "parada de taxis"]),
];

// Adjectives in the masculine: the composer makes them agree ("una cartera negra", "un celular negro").
const C = (id: string, es: string, en: string, forms: string[] = []) => ent(id, es, en, "m", { chip: es, forms });
const COLORS: EntityDef[] = [
  C("black", "negro", "black", ["negra", "negrito", "negrita"]),
  C("brown", "café", "brown", ["marron", "cafe oscuro", "cafe claro", "cafecito", "color cafe", "chocolate"]),
  C("red", "rojo", "red", ["roja", "guinda", "vino", "rojo oscuro", "roja oscura"]),
  C("blue", "azul", "blue", ["azul claro", "azul oscuro", "azul marino", "marino", "celeste", "azulito"]),
  C("green", "verde", "green", ["verde oscuro", "verde claro", "verde olivo"]),
  C("gray", "gris", "gray", ["gris oscuro", "gris claro", "plateado", "plateada", "plata"]),
  C("white", "blanco", "white", ["blanca"]),
  C("pink", "rosa", "pink", ["rosita", "rosa mexicano", "fucsia", "color rosa"]),
  C("yellow", "amarillo", "yellow", ["amarilla"]),
  C("purple", "morado", "purple", ["morada", "lila", "violeta"]),
  C("beige", "beige", "beige", ["beis", "crema"]),
  C("orange", "naranja", "orange", ["anaranjado", "anaranjada"]),
];
const MATERIALS: EntityDef[] = [
  ent("leather", "de piel", "leather", "m", { chip: "de piel", forms: ["piel", "de cuero", "cuero", "de piel sintetica", "piel sintetica", "de piel genuina"] }),
  ent("fabric", "de tela", "fabric", "m", { chip: "de tela", forms: ["tela", "de lona", "lona", "de nylon", "nylon", "de mezclilla", "mezclilla"] }),
];
const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { chip: "chico", forms: ["chica", "chiquito", "chiquita", "pequeno", "pequena", "delgado", "delgada", "chiquitita"] }),
  ent("medium", "mediano", "medium-sized", "m", { chip: "mediano", forms: ["mediana", "de tamano normal"] }),
  ent("big", "grande", "big", "m", { chip: "grande", forms: ["grandota", "grandote", "muy grande"] }),
];

/** What was in it. attrs.pl: a plural noun ("Traía mis tarjetas"); art "": no article. */
const CONTENTS: EntityDef[] = [
  ent("cards", "tarjetas", "cards", "f", { art: "", chip: "tarjetas", forms: ["mis tarjetas", "tarjetas del banco", "tarjetas bancarias", "todas mis tarjetas", "unas tarjetas"], attrs: { cards: true, pl: true } }),
  ent("credit_card", "tarjeta de crédito", "credit card", "f", { pl: "tarjetas de crédito", ltPl: "credit cards", chip: "tarjeta de crédito",
    forms: ["tarjeta de credito", "tarjetas de credito", "visa", "mastercard", "american express", "amex"], attrs: { cards: true } }),
  ent("debit_card", "tarjeta de débito", "debit card", "f", { pl: "tarjetas de débito", ltPl: "debit cards", chip: "tarjeta de débito",
    forms: ["tarjeta de debito", "tarjetas de debito", "tarjeta del banco", "tarjeta bancaria", "tarjeta de nomina"], attrs: { cards: true } }),
  ent("license", "licencia de manejo", "driver's license", "f", { chip: "licencia de manejo",
    forms: ["licencia", "licencia de conducir", "licencia de conductor", "carnet de conducir", "carne de conducir", "permiso de conducir", "licencia para manejar"], attrs: { id: true } }),
  ent("id_card", "identificación", "ID", "f", { chip: "identificación",
    forms: ["identificacion", "credencial", "ine", "credencial de elector", "documentos", "mis documentos", "papeles", "mis papeles", "tarjeta de residente", "residencia", "dni", "cedula"], attrs: { id: true } }),
  ent("passport", "pasaporte", "passport", "m", { chip: "pasaporte", attrs: { id: true, passport: true } }),
  ent("cash", "efectivo", "cash", "m", { art: "", chip: "efectivo", forms: ["dinero", "lana", "billetes", "mi dinero", "dolares", "pesos"], attrs: { cash: true } }),
  ent("photos", "fotos", "photos", "f", { art: "", chip: "fotos", forms: ["foto", "fotografias", "fotos de mis hijos", "foto de mis hijos", "fotos de mi familia", "foto de mi familia", "fotos de mis nietos"], attrs: { pl: true } }),
  ent("keys", "llaves", "keys", "f", { art: "", chip: "llaves", forms: ["llave", "llaves de mi casa", "llaves de la casa", "llave del hotel", "llave del cuarto", "llaves del carro", "llaves del departamento"], attrs: { pl: true } }),
  ent("insurance_card", "tarjeta del seguro", "insurance card", "f", { chip: "tarjeta del seguro", forms: ["tarjeta de seguro", "tarjeta del seguro medico", "poliza", "mi poliza"] }),
  ent("student_id", "credencial de estudiante", "student ID", "f", { chip: "credencial de estudiante", forms: ["credencial de la escuela", "credencial de la universidad"], attrs: { id: true } }),
  ent("gift_card", "tarjeta de regalo", "gift card", "f", { chip: "tarjeta de regalo", forms: ["tarjetas de regalo"] }),
  ent("receipts", "recibos", "receipts", "m", { art: "", chip: "recibos", forms: ["recibo", "tickets", "ticket", "notas", "comprobantes"], attrs: { pl: true } }),
  // what a purse or a backpack carries
  ent("wallet_in", "cartera", "wallet", "f", { chip: "cartera", forms: ["billetera", "monedero", "carterita", "mi cartera", "mi billetera"] }),
  ent("cellphone", "celular", "phone", "m", { chip: "celular", forms: ["telefono", "cel", "iphone", "telefono celular"], attrs: { phone: true } }),
  ent("clothes", "ropa", "clothes", "f", { art: "", chip: "ropa", forms: ["mi ropa", "una playera", "un traje de bano", "una toalla"] }),
  ent("sunglasses", "lentes de sol", "sunglasses", "m", { art: "", chip: "lentes de sol", forms: ["lentes", "mis lentes", "lentes oscuros"], attrs: { pl: true } }),
  ent("laptop", "computadora", "laptop", "f", { chip: "computadora", forms: ["laptop", "lap", "compu", "computadora portatil", "tablet", "ipad"] }),
  ent("camera", "cámara", "camera", "f", { chip: "cámara", forms: ["camara", "camara de fotos"] }),
];

const ALL = [...ITEMS, ...PLACES, ...COLORS, ...MATERIALS, ...SIZES, ...CONTENTS];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// Helpers

const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const item = (c: Ctx) => (c.s.item as string) || "wallet";
/** The echo: color with a material ("una cartera negra de piel"), else the color, else the material or the size.
 *  Never color + size: English would say "a black small wallet". */
const itemNp = (c: Ctx, color?: string | null) => {
  const col = color === undefined ? c.s.color : color;
  return { id: item(c), mods: (col ? [col, c.s.material] : [c.s.material ?? c.s.size]).filter(Boolean) as string[] };
};

/** Per-turn scratch state: one answer may arrive as several segments, each running its handler with the same ctx. */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }

/** Queue a reaction; the next step (or finish) says it once. A later segment of the same answer overwrites an earlier
 *  one of its group, so the echo has the whole answer. */
function react(c: Ctx, group: string, line: string, vars: Record<string, any> = {}) {
  c.s.react = c.s.react || {};
  c.s.react[group] = { line, vars };
}
function flush(c: Ctx) {
  const r = c.s.react as Record<string, { line: string; vars: any }> | null;
  if (!r) return;
  c.s.react = null;
  for (const { line, vars } of Object.values(r)) c.say(line, vars);
}

function bye(c: Ctx, thanked = false) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; c.say(thanked ? "closing_welcome" : gotIt(c) ? "closing_care" : "closing", { X: item(c) }); }
  c.hold();
  c.end();
}
const live = (c: Ctx) => !c.s.byeSaid;

function describeFrom(c: Ctx, slots: any) {
  for (const p of ([] as any[]).concat(slots.dp ?? [])) {
    if (p?.color) c.s.color = p.color;
    if (p?.material) c.s.material = p.material;
    if (p?.size) c.s.size = p.size;
  }
  if (slots.item) c.s.item = slots.item;
}

/** The cash amounts the officer can say back (pesos, in cents). */
function cashDomain(): number[] {
  const s: number[] = [];
  for (let p = 10; p <= 1000; p += 10) s.push(p * 100);
  for (let p = 1050; p <= 5000; p += 50) s.push(p * 100);
  for (let p = 5500; p <= 20000; p += 500) s.push(p * 100);
  return s;
}
const CASH = cashDomain();
/** He says an amount back only as it was said: one he has no recording of ($45, $85.50) or a bound ("menos de
 *  cien") gets "Bien, ya lo anoté" instead of a different number. */
const cashSays = (c: Ctx) => typeof c.s.cashAmount === "number" && !c.s.cashBound && CASH.includes(c.s.cashAmount);

const COUNT_WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20 };
const COUNT_NOUN = /^(tarjetas?|fotos?|fotografias?|llaves?|recibos?|tickets?|notas|comprobantes|credenciales?|identificaciones?|licencias?|documentos?|papeles|pasaportes?|monedas?|tarjetitas?)$/;
const words = (heard: string) => fold(heard).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
/** "Tenía dos tarjetas", "12 tarjetas de regalo", "una foto": the numbers said right before a thing are counts. */
function countsIn(heard: string): number[] {
  const w = words(heard);
  const out: number[] = [];
  for (let i = 0; i + 1 < w.length; i++) {
    const n = COUNT_WORDS[w[i]] ?? (/^\d+$/.test(w[i]) ? parseInt(w[i], 10) : undefined);
    if (n !== undefined && COUNT_NOUN.test(w[i + 1])) out.push(n);
  }
  return out;
}
/** "En la calle 12", "En el camión veinticinco": a street's or a bus route's number, neither a time nor cash. */
function placeNumbers(heard: string): number[] {
  const w = words(heard);
  const out: number[] = [];
  for (let i = 0; i + 1 < w.length; i++) {
    if (!/^(calle|avenida|av|ruta|camion|autobus|combi|colectivo|numero|num)$/.test(w[i])) continue;
    const r = numberSlot(w, i + 1, false).sort((a, b) => b.end - a.end)[0];
    if (r && typeof r.value === "number") out.push(r.value);
  }
  return out;
}
const MONEY_WORD = /\b(pesos?|efectivo|dinero|billetes?|varos?|lana|dolares?|centavos?|euros?|libras?)\b/;

/** "Traía mis tarjetas pero no el pasaporte", "ni el pasaporte", "el pasaporte no estaba", "el pasaporte lo dejé en el
 *  hotel": that thing wasn't in it. A typed "No, el pasaporte" (the comma) is an answer, not a negation. */
function negatedIn(heard: string, id: string): boolean {
  const e = byId(id);
  const h = " " + fold(heard).replace(/[^a-z0-9,.;:\s]/g, " ").replace(/\s+/g, " ") + " ";
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const art = "(?:(?:mi|mis|el|la|los|las|un|una|unos|unas)\\s+)?";
  const verb = "(?:(?:traia|tenia|llevaba|habia|traje|lleve|venia|estaba|estaban|iba|iban)\\s+)?";
  for (const n of [e.en, e.pl, ...(e.forms || [])].filter(Boolean).map((x) => esc(fold(x as string)))) {
    if (new RegExp(`\\s(?:no|ni|sin)\\s+${verb}${art}${n}[\\s,.;:]`).test(h)) return true;
    if (new RegExp(`\\s${n}\\s+(?:no\\s+(?:estaba|estaban|venia|venian|iba|iban|(?:lo|la|los|las)\\s+(?:traia|tenia|llevaba|traje|lleve))|(?:lo|la|los|las)\\s+(?:deje|tengo|traigo|guarde|dejo))\\s`).test(h)) return true;
    // "…y el pasaporte, no, perdón, el pasaporte no": a "no" ending the answer
    if (new RegExp(`\\s${n}\\s+no[\\s,.;:]*$`).test(h)) return true;
  }
  return false;
}

function addContents(c: Ctx, slots: any) {
  const list: string[] = c.s.contents || [];
  const counts = countsIn(c.heard), places = placeNumbers(c.heard);
  const pesosSaid = /\bpesos?\b/.test(fold(c.heard));
  const cis = ([] as any[]).concat(slots.ci ?? []).filter(Boolean);
  // a lone number before he asks what was inside ("En el camión 25", a phone number said early) is no cash
  const strayNumber = !cis.some((x) => x.content) && !MONEY_WORD.test(fold(c.heard)) && !/\b(traia|tenia|llevaba|habia|adentro)\b/.test(fold(c.heard)) && !["contents", "cash_amount"].includes(c.step ?? "");
  for (const ci of cis) {
    const tags: string[] = ci.__tags || [];
    // "dos billetes de quinientos": two bills of $500
    const cents = typeof ci.price === "number" ? ci.price * (tags.includes("bills") && typeof ci.number === "number" ? ci.number : 1) : undefined;
    if (cents !== undefined && !tags.includes("bills")) {
      // "Tenía dos tarjetas", "Traía 500 pesos y dos tarjetas": a count before a noun reads as a price; it isn't cash
      const k = counts.indexOf(cents / 100);
      if (k >= 0) { counts.splice(k, 1); continue; }
      if (strayNumber || places.includes(cents / 100)) continue;
      // "una pregunta": under 10 pesos with no "pesos" said isn't cash, except as the answer to "¿Cuánto efectivo?"
      if (cents < 1000 && !pesosSaid && c.step !== "cash_amount") continue;
    }
    if (ci.content && negatedIn(c.heard, ci.content)) continue;
    if (ci.content && !list.includes(ci.content)) list.push(ci.content);
    if (tags.includes("cash") && !list.includes("cash")) list.push("cash");
    // dollars said too: he doesn't say back only the pesos
    if (tags.includes("usd")) { c.s.cashAmount = "other"; turn(c).usd = true; }
    else if (cents !== undefined) { c.s.cashAmount = cents; c.s.cashBound = tags.includes("bound"); }
    else if (tags.includes("few") && c.s.cashAmount === undefined) c.s.cashAmount = "few";
  }
  // nothing taken from a stray number: the contents question is still to come
  if (list.length || c.s.contents) c.s.contents = list;
  if (list.includes("cash") && c.s.cashAmount === undefined && c.s.noCashAmount === undefined) c.s.needCash = true;
}
const has = (c: Ctx, pred: (e: EntityDef) => boolean) => ((c.s.contents || []) as string[]).some((id) => pred(byId(id)));

/** Collect a name said in one or several segments of the same answer ("Ryan Miller"). */
function addName(c: Ctx, name: string | undefined) {
  if (!name) return;
  c.s.nameWords = [...(c.s.nameWords || []), ...name.split(" ")];
  c.s.name = true;
  if ((c.s.nameWords as string[]).length >= 2) c.s.lastName = true;
}

/** Mission predicates (they mirror the steps' when/done, so a finished report ticks them all). */
const toldWhat = (c: Ctx) => !!c.s.item && c.s.kind !== "unsure" && (!!c.s.happened || !(c.s.askHappened && c.s.kind !== "lost"));
const cardsQ = (c: Ctx) => !!c.s.askBank && has(c, (e) => !!e.attrs?.cards) && !c.s.found;
const spellQ = (c: Ctx) => !!c.s.askSpell && c.s.found !== "mine";
const gotIt = (c: Ctx) => c.s.found === "mine" || c.s.found === "partial";

/** "No me acuerdo" / "No sé": the step's own help, then the next question (none when the help leaves the same question
 *  open, as "Revise bien, por favor"). Returns false when the report has nothing left to ask: it goes on to its end. */
function helpHere(c: Ctx): boolean {
  const st = police.steps.find((s) => s.id === c.step);
  if (!st?.help) { c.say("no_worry"); return true; }
  st.help(c);
  const next = police.steps.find((s) => (!s.when || s.when(c)) && !s.done(c));
  if (next && next.id !== c.step) c.ask(next.id);
  return !!next;
}

/** After the report: "¿Algo más en que le pueda ayudar?" (with the Ministerio Público questions once he has said it).
 *  Built again at each re-ask, so a Ministerio Público mentioned on the way (the copy for the insurance) opens them. */
function anythingElse(c: Ctx, id: "anything_else" | "ask_away" = "anything_else"): Pending {
  const mp = !!(c.s.mpSaid || c.s.mpInfo);
  // "Sí, gracias" / "Está bien" close; only a thanks gets "De nada"
  const closing = (cc: Ctx) => /\b(gracias|amable|esta bien|vale)\b/.test(fold(cc.heard));
  const thanked = (cc: Ctx) => /\b(gracias|amable)\b/.test(fold(cc.heard));
  const again = (cc: Ctx) => { cc.say("anything_more"); cc.expect(anythingElse(cc)); };
  const p: Pending = {
    id, hints: ["thanks", "questions", ...(mp ? ["mp"] : [])],
    expects: ["thats_all", "thanks_officer", "one_question_ctx", ...(mp ? ["mp_where", "mp_where_ctx", "mp_bring", "mp_today", "mp_online", "mp_why", "mp_ok"] : [])],
    suggest: id === "ask_away"
      ? [{ lt: "Ask what you want to know", hint: "questions" }, { lt: "Say thank you and goodbye", hint: "thanks" }]
      : [{ lt: "Say thank you and goodbye", hint: "thanks" }, { lt: "Ask something else", hint: "questions" },
        ...(mp ? [{ lt: "Ask about the Ministerio Público", hint: "mp" }] : [])],
    ask: again,
    on: {
      thats_all: (cc) => bye(cc, thanked(cc)),
      g_thanks: (cc) => bye(cc, true),
      thanks_officer: (cc) => bye(cc, true),
      g_bye: (cc) => bye(cc, thanked(cc)),
      one_question_ctx: (cc) => { cc.say("ask_away"); cc.expect(anythingElse(cc, "ask_away")); },
      // "Voy para allá, gracias" is a goodbye too
      ...(mp ? { mp_ok: (cc: Ctx) => { cc.say("mp_good"); if (thanked(cc)) bye(cc, true); else again(cc); } } : {}),
      // "How are you?" at the very end: answer it, then back to "Anything else?"
      g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(anythingElse(x))); },
    },
    no: (cc) => bye(cc, thanked(cc)),
    // "Sí, una pregunta" opens a question; "Sí, gracias" / "Está bien, gracias" closes
    yes: (cc) => { if (closing(cc)) { bye(cc, thanked(cc)); return; } cc.say("ask_away"); cc.expect(anythingElse(cc, "ask_away")); },
  };
  return p;
}

/** The copy of the report. For the insurance, after a theft, he points to the Ministerio Público (once). */
function giveCopy(c: Ctx, seguro: boolean) {
  if (!seguro) { c.say("copy"); return; }
  if (c.s.kind === "stolen" && !c.s.mpSaid && !c.s.mpInfo) { c.s.mpInfo = true; c.say("copy_mp"); return; }
  c.say("copy_seguro");
}

const F_ME = "me: from me. Spanish says “they stole me the wallet”, with the where English says my.";
const F_HACE = "hace + a length of time = … ago.";
const F_MP = "Ministerio Público (the MP): the state prosecutor's office, where formal criminal complaints are filed.";

// Answers the simulation gives when Oficial Reyes asks an optional question; each fits every wording of it.
const AUTO: Record<string, string> = {
  report: "Quiero reportar el robo de mi cartera.",
  what_item: "Mi cartera.",
  stolen_q: "No estoy seguro.",
  happened: "Cuando quise pagar, ya no estaba.",
  where: "En el mercado.",
  when: "Como a las once.",
  describe: "Es negra.",
  contents: "Mis tarjetas.",
  cash_amount: "Como quinientos pesos.",
  bank: "Sí, ya llamé.",
  found: "¡Sí, es mía!",
  id_q: "No, estaba en mi cartera.",
  name: "Ryan Miller.",
  last_name: "Miller.",
  spell: "eme, i, ele, ele, e, erre",
  phone: "Es el 984 123 4567.",
  sign: "Claro.",
  check_all: "Sí, está todo.",
  anything_else: "No, es todo, gracias.",
  ask_away: "No, es todo, gracias.",
};
const omit = (keys: string[]) => Object.fromEntries(Object.entries(AUTO).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const police: SituationDef = {
  id: "s91b-police",
  song: 91,
  songTitle: "Can You Help Me, Please?",
  title: { en: "Quiero levantar una denuncia", lt: "I'd like to report a crime" },
  topic: { en: "En la Policía Municipal", lt: "At the police station" },
  chapter: 7,
  order: 2,
  location: "police",
  npc: "reyes",
  goal: "Report your stolen or lost wallet to the police: say what happened, where and when, what it looks like and what was in it.",
  intro: "The Policía Municipal, across from the zócalo next to the museum. Oficial Reyes is at the front desk taking reports. Tell him what happened to your wallet, where and when, what it looks like and what was inside. Amounts are in pesos.",
  entities: { item: ITEMS, place: PLACES, color: COLORS, material: MATERIALS, size: SIZES, content: CONTENTS },

  grammar: {
    macros: {
      art: "(mi | la | el | una | un)",
      gone: "[y] [de repente | luego | despues | al rato | cuando (quise | fui a | iba a) pagar | cuando (la | lo) (busqué | quise sacar) | cuando (regresé | volví | me di cuenta)] (ya no (estaba | la tenia | lo tenia | la traia | lo traia | la encontré | lo encontré) | no (estaba | la encontré | lo encontré | la tenia | lo tenia) | desaparecio | ya no (tenia | traia) @art {item} | @art {item} ya no estaba)",
      person: "(alguien | un hombre | una mujer | un senor | una senora | un muchacho | una muchacha | un chavo | un joven | unos hombres | dos hombres | un nino | unos ninos | un tipo | un ladron)",
      pocket: "(la bolsa [de atras | trasera | del pantalon] | el bolsillo [de atras | trasero | del pantalon] | mi bolsa | mi bolsillo | la mochila | mi mochila | la chamarra | mi chamarra | mi bolso | el bolso)",
      at: "(en | en la entrada de | en la entrada del | en la puerta de | en la puerta del | a la salida de | a la salida del | saliendo de | saliendo del | cerca de | cerca del | afuera de | afuera del | junto a | junto al | por | enfrente de | enfrente del | frente a | frente al | al lado de | al lado del | adentro de | adentro del)",
      unsure: "(creo que | no estoy seguro pero | no estoy segura pero | tal vez | quizas | a lo mejor | probablemente | seguramente)",
      want: "(quiero | quisiera | necesito | vengo a | vine a | me gustaria | puedo)",
    },
    slots: {
      whenp: { pattern: [
        "[a | como a | como a eso de | a eso de | mas o menos a | alrededor de | casi a] {time}",
        "hace [como | unos | unas | mas o menos | casi | apenas] (una hora | media hora | una hora y media | hora y media | un rato | un ratito | poco | poquito | unos minutos | {number} (minutos | horas) | un par de horas | un momento)",
        "(hoy | ayer) [en la | por la] (manana | tarde | noche)", "(esta | en la | por la) (manana | tarde | noche)",
        "(hoy | ayer | anoche | antier | hoy temprano | temprano | hace rato | ahorita | hace un momento)",
        "entre {time} y {time}", "[como] (al | a) mediodia", "[como] a la hora de la comida",
        "(antes | despues) de (comer | la comida | desayunar | el desayuno)",
      ] },
      dp: { pattern: [
        "[es | era] [un | una] [muy | bastante | medio] {color} [claro | oscuro | clarito | oscurito]",
        "[es | era] [de] {material}",
        "[es | era] [muy | bastante | algo | medio | mas bien] {size}",
        "(tiene | tenia | con) (un | una) (cierre | broche | logo | correa | llavero | estampado | dibujo | boton) #feature",
        "(tiene | tenia | con) (mis iniciales | mi nombre) #feature",
        "(con | en) una funda [{color}] #feature", "(con | tiene) (rayas | flores | cuadros | puntitos | un dibujo | un estampado) [{color}] #feature",
        "[es | era] (vieja | viejo | nueva | nuevo | sencilla | sencillo | barata | barato | cara | caro | de marca | gastada | gastado) #feature",
      ] },
      ci: { pattern: [
        "[mi | mis | un | una | unos | unas | el | la | los | las | todas mis | algunas | tambien | y | solo | nomas | nada mas] {content}",
        "[como | unos | unas | mas o menos | aproximadamente | casi | solo | nomas | alrededor de] {price} [en efectivo | de efectivo | en billetes] #cash",
        // "dos billetes de quinientos" is $1,000
        "[como | unos | unas | solo | nomas] {number} (billete | billetes) de {price} [pesos] #cash #bills",
        "[como | unos | unas | mas o menos | casi | solo | nomas] {number} (dolares | dolares americanos | dolares canadienses | euros | libras) [en efectivo] #cash #usd",
        "(algo de | un poco de | un poquito de | mucho | bastante | poco) (efectivo | dinero) #cash",
        "(poquito | muy poquito | casi nada | no mucho) [como | unos | solo] [{price}] #cash #few",
        "(menos de | mas de) {price} #cash #bound",
      ] },
    },
  },

  intents: {
    report: { patterns: [
      "@want (levantar | poner | hacer | presentar) una denuncia [formal] #theft #h:rep_denuncia",
      "@want (hacer | levantar) un reporte #vague",
      "@want (reportar | denunciar) (un robo | un asalto) #theft #h:rep_theft",
      "@want (reportar | denunciar) el robo de @art {item} #stolen #h:rep_item",
      "@want reportar (que me robaron | que perdí | que se me perdió | la perdida de) @art {item}",
      "@want (reportar | denunciar) [una | un | mi] {item} (robada | robado | perdida | perdido)",
      "[creo que] me (robaron | han robado | quitaron | bolsearon) @art {item} [@at [el | la] {place}] #stolen #h:rep_stolen",
      "[creo que] @person me (robó | quitó | sacó | arrebató | jaló) @art {item} [de @pocket | del bolsillo] [@at [el | la] {place}] #stolen #h:rep_someone",
      "(perdí | he perdido) @art {item} [@at [el | la] {place}] #lost #h:rep_lost",
      "[creo que] se me (perdió | cayó) @art {item} [@at [el | la] {place}] #lost #h:rep_lost2",
      "creo que perdí @art {item} [@at [el | la] {place}] #lost",
      "no encuentro @art {item} #unsure #h:rep_cantfind",
      "[creo que] me acaban de (robar | quitar) @art {item} [@at [el | la] {place}] #stolen", "me (jalaron | arrebataron) @art {item} [@at [el | la] {place}] #stolen",
      "[creo que] @person se (llevó | robó) @art {item} [@at [el | la] {place}] #stolen", "se (llevaron | robaron) @art {item} [@at [el | la] {place}] #stolen",
      "(mi | la | el) {item} (desapareció | ya no esta | no aparece) #unsure",
      "(mi | la | el) {item} (fue | ha sido) (robada | robado) #stolen", "(mi | la | el) {item} (esta | se ha) (perdida | perdido) #lost",
      "me (asaltaron | robaron | han robado | han asaltado | bolsearon) #theft",
      "me (robaron | quitaron | han robado) todo #theft",
      "(fui | he sido) victima de un (robo | asalto) #theft",
      "(puedo | se puede) (reportar | denunciar) (un robo #theft | [una | un] {item} (robada | robado | perdida | perdido)) [aqui]",
      "(estoy aqui | vine | vengo) porque (me robaron | alguien me robó) @art {item} #stolen",
      "(estoy aqui | vine | vengo) porque (perdí | se me perdió) @art {item} #lost",
      // corrections in one breath
      "no (la | lo) perdí [alguien] me (la | lo) (robaron | robó) #theft #stolen",
      "no perdí @art {item} [alguien] me (la | lo) (robaron | robó) #stolen",
      "no me robaron @art {item} (la | lo) perdí #lost",
      // "No sé si me la robaron o la perdí": he asks what it was, then whether it was stolen
      "no se si (me (la | lo) robaron | (la | lo) perdí) o (me (la | lo) robaron | (la | lo) perdí | se me cayó) #vague",
      "no se si me robaron @art {item} o (la | lo) (perdí | dejé) #unsure", "no se si perdí @art {item} o me (la | lo) robaron #unsure",
    ] },
    // "Tengo un problema" / "Necesito ayuda": he asks what happened
    problem: { patterns: [
      "tengo un problema [grande | muy grande | serio]", "(necesito | quiero) (ayuda | su ayuda)",
      "(me puede | me podria | puede | podria) ayudar", "(puede | podria) ayudarme",
      "(me puedes | puedes | me podrias | podrias) ayudar #tip:tu_staff", "(puedes | podrias) ayudarme #tip:tu_staff",
    ] },
    no_cash: { patterns: [
      "[no] no (traia | tenia | habia | llevaba) [nada de] (efectivo | dinero) [solo {ci} [y] [{ci}]] #h:no_cash",
      "(sin | nada de) (efectivo | dinero) [solo {ci} [y] [{ci}]]",
      "(efectivo | dinero) no [solo {ci} [y] [{ci}]]",
    ] },
    what_item_ctx: { patterns: [
      "[mi | la | el | una | un] {item} [{color}] #h:wh_mine",
      "[mi | la | el] {item} con (todas mis cosas | mis tarjetas | mi dinero | todo | mis documentos | todos mis documentos | todo adentro)",
      "(se llevaron | me quitaron | me sacaron) @art {item}", "(fue | era) @art {item}",
      "[estaba | estaban | lo traia | los traia] en (mi | la | una) {item} [{color}]",
      // "Mi celular no, mi cartera" and "Mi celular, no mi cartera" fold to the same words: #amb asks again
      "[mi | la | el] {neg:item} no [mi | la | el] {item} #amb", "no [mi | la | el] {neg:item} sino [mi | la | el] {item}",
      "no (fue | es | era) [mi | la | el] {neg:item} (fue | es | era) [mi | la | el] {item}",
    ] },
    happened: { patterns: [
      "(estaba | andaba) en [el | la] {place} [y] [@gone] #h:h_was_at",
      // "No estaba en el mercado, estaba en la playa": the second place counts
      "no (estaba | andaba) en [el | la] {neg:place} [sino] [que] [(estaba | andaba)] en [el | la] {place} [y] [@gone]",
      "(estaba | andaba | iba) (comprando | pagando | viendo | tomando fotos | hablando por telefono | caminando | platicando | comiendo | esperando | sacando dinero | paseando) [{w:any}] [(en | por | de | del) [el | la] {place}] [y] [@gone | @person (chocó conmigo | me empujó | se me acercó) | @person me (la | lo) (quitó | sacó | robó | arrebató | jaló)]",
      "[@person] me (la | lo) (arrebató | jaló | quitó | sacó | robó | arrebataron | jalaron | quitaron | sacaron | robaron) [@at [el | la] {place}]",
      "@person (chocó conmigo | me empujó | me dio un empujon | se me acercó | me tocó | me jaló) [en [el | la] {place}] [y] [@gone] #h:h_bumped",
      "@person (chocó conmigo | se me acercó | me tocó) [en [el | la] {place}] y (me empujó | me jaló | me tocó | chocó conmigo | me distrajo) [y] [@gone]",
      "@person (chocó conmigo | me empujó | se me acercó) [en [el | la] {place}] [y] (se (la | lo) llevó | me (la | lo) (quitó | sacó | robó))",
      "(la | lo) (traia | tenia | llevaba) en @pocket [y] [@gone] #h:h_pocket",
      "(estaba | iba | venia) en @pocket [y] [@gone]",
      "(la | lo) (dejé | puse) en (la | una) (mesa | banca | barra | mostrador | silla | arena | toalla) [(de | del | de la) {place}] [y] [@gone]",
      "[creo que] @person (la | lo) (sacó | tomó | agarró | robó | quitó) de @pocket",
      "(fui | me fui) (al bano | a pagar | a nadar | al mar | a comprar {w:any}) [y] @gone",
      "@gone #h:h_gone",
      "(me distraje | me volteé | me di la vuelta | me descuidé) [un momento | un segundo | tantito] [y] [@gone]",
      "no se (que pasó | como pasó | como fue) [@gone]",
      "estaba en [el | la] {place} [y] (habia mucha gente | iba lleno | estaba lleno | estaba llenisimo) [y] [@gone]",
      "habia mucha gente [y] [@gone]",
      "(me abrieron | alguien abrio | abrieron) (la | mi) (mochila | bolsa | bolso) [y] [@gone]",
      "@person (estaba | estaban) muy (cerca | pegado | pegados) [de mi]",
      "(la | lo) (saqué | usé) para pagar [y] [despues | luego] [@gone]",
      "creo que se me cayó [@at [el | la] {place}]",
    ] },
    where_when: { patterns: [
      "[fue | pasó | (la | lo) tenia] @at [el | la] {place} [{whenp}] #h:where",
      "[fue | pasó] {whenp} [@at [el | la] {place}] #h:when",
      "@unsure [fue | pasó] (en | cerca de | cerca del | por) [el | la] {place} [{whenp}]",
      "@unsure [fue] {whenp}",
      "en algun lugar (de | del | en) [el | la] {place}",
      "@at [el | la] {place} [y] @at [el | la] {near:place} [{whenp}]",
      // "No fue en el mercado, fue en el café": the second place counts
      "no (fue | pasó) (en | cerca de | cerca del) [el | la] {neg:place} [sino] [que] [fue] @at [el | la] {place} [{whenp}]",
      "no (en | cerca de | cerca del) [el | la] {neg:place} [sino] @at [el | la] {place} [{whenp}]",
    ] },
    // a bare place ("El mercado.") only at "¿Dónde pasó?"
    where_ctx: { patterns: ["[el | la] {place} [{whenp}]"] },
    dont_remember: { patterns: [
      "no me acuerdo [bien | exactamente]", "no (recuerdo | lo recuerdo) [bien | exactamente]",
      "no (se | recuerdo | me acuerdo de) (donde | cuando | a que hora | la hora | el lugar | donde fue | cuando fue | a que hora fue) [exactamente]",
      "no se exactamente", "no (se | estoy seguro | estoy segura) (de la hora | del lugar)", "no tengo idea (de la hora | de donde)",
      "(no se | no lo se | ni idea | no tengo idea | no sabria decirle)",
    ] },
    describe: { patterns: [
      "[es | era] [un | una] [{item}] {dp} [y] [{dp}] [y] [{dp}] [y] [{dp}] #h:describe",
      "[mi | la | el] {item} es {dp} [y] [{dp}] [y] [{dp}]",
      "[es | era] [un | una] {item} (normal | comun | cualquiera | comun y corriente) [{dp}] [y] [{dp}]",
      "no es {neg:dp} [sino] [es] {dp} [y] [{dp}]",
    ] },
    contents: { patterns: [
      "[traia | tenia | habia | llevaba | adentro (habia | traia | tenia) | (traia | tenia) adentro] {ci} [y] [{ci}] [y] [{ci}] [y] [{ci}] [y] [{ci}] [y] [{ci}] [(eso es | es) todo | nada mas] #h:contents",
      "{ci} [y] [{ci}] [y] [{ci}] (estaba | estaban | iba | iban) (adentro | ahi | ahi adentro | en la cartera | en ella)",
      "(toda mi vida | todo lo importante | todas mis cosas importantes)",
      "nada (importante | de valor) [solo {ci} [y] [{ci}]] #nothing",
      // "Mis tarjetas no, solo dinero": the refused one is never written down
      "{neg:ci} no (solo | nada mas | nomas | sino) {ci} [y] [{ci}]", "no {neg:ci} (solo | sino) {ci} [y] [{ci}]",
      "no (traia | tenia | llevaba | habia) {neg:ci} (solo | nada mas | nomas | sino) {ci} [y] [{ci}]",
      // "Traía mis tarjetas pero no el pasaporte", "El pasaporte no estaba, solo dinero", "Solo dinero, el pasaporte lo
      // dejé en el hotel", "Ni el pasaporte ni dinero, solo tarjetas" (handlers also drop a negated one: negatedIn)
      "[traia | tenia | llevaba] {ci} [y] [{ci}] [y] [{ci}] pero no [traia | tenia | llevaba] {neg:ci}",
      "{neg:ci} no (estaba | estaban | venia | venian | iba | iban) [ahi | adentro] (solo | nada mas | nomas | pero si) {ci} [y] [{ci}]",
      "(solo | nada mas | nomas) {ci} [y] [{ci}] {neg:ci} (lo | la | los | las) (dejé | tengo | traigo) [en (el | mi) (hotel | casa | departamento | cuarto)]",
      "ni {neg:ci} ni {neg:ci} (solo | nada mas | nomas) {ci} [y] [{ci}]",
      "(no se | no estoy seguro | no estoy segura) [exactamente] [creo que] [como] {ci}",
    ] },
    stolen_yes: { patterns: [
      "[si] [creo que] (fue | fue un) robo #h:stolen_yes",
      "[si] [creo que | seguro que | estoy seguro de que | estoy segura de que | seguramente] alguien [me] (la | lo) (robó | quitó | sacó | llevó | tomó | agarró)",
      "[si] [creo que | seguro que | seguramente | estoy seguro de que | estoy segura de que] me (la | lo) (robaron | quitaron | sacaron | bolsearon)",
      "[si] (seguro | seguramente | definitivamente | probablemente) [que si] fue (un robo | robo)",
      "[si] estoy (seguro | segura) de que me (la | lo) robaron",
    ] },
    // "Sí, estoy seguro", "Sí, seguro": at "¿Cree que se la robaron?" a theft, at "¿Es suya?" / "¿Está seguro? …" (the
    // turned-in wallet) it's theirs; nowhere else (at the signature "Sí, seguro" is a yes)
    sure_ctx: { patterns: ["[si] estoy (seguro | segura)", "[si] (segurisimo | segurisima | completamente seguro | completamente segura)",
      "[si] (seguro | segura | seguramente | definitivamente | probablemente) [que si]"] },
    // "Tal vez", "Puede ser" at "¿Cree que se la robaron?": he can't tell either
    maybe_ctx: { patterns: ["(tal vez | quizas | quiza | puede ser | a lo mejor | posiblemente) [si]"] },
    stolen_no: { patterns: [
      "[no] creo que se me (cayó | perdió) [en algun lado | por ahi] #h:stolen_no",
      "[no] creo que (la | lo) (perdí | tiré | dejé) [en algun lado | en algun lugar | por ahi]",
      "[no] [nada mas | solo] (la | lo) (perdí | dejé) [en algun lado | en algun lugar | por ahi]",
      "[no] se me (cayó | perdió) [en algun lado | por ahi]", "[no] (la | lo) perdí yo", "[no] yo (la | lo) perdí",
      "[no] no me (la | lo) robaron [(la | lo) perdí | se me cayó]",
      "[no] no (creo | pienso) [que me (la | lo) (hayan robado | robaran | robaron)]",
      "[no] no creo que alguien me (la | lo) (haya robado | robara | robó)",
      "[no] no fue (un robo | robo)",
      "[no] [no se] @unsure se me (cayó | perdió) [en algun lado | por ahi]", "[no] [no se] @unsure (la | lo) (perdí | dejé | tiré) [en algun lado | en algun lugar | por ahi]",
    ] },
    name_ctx: { patterns: [
      "[me llamo | mi nombre es | soy | es | mi nombre completo es] {name} #h:name_mine",
      "(mi apellido es | el apellido es | apellido | mi apellido) {name} #h:last_mine",
      "(me llamo | mi nombre es) {name} [y] mi apellido es {last:name}",
    ] },
    spell_ctx: { patterns: ["[se escribe | es | se deletrea] {letters} #h:spell_it"] },
    phone_ctx: { patterns: [
      "[es] [el] [mas] {digits}",
      "mi (numero | celular | telefono | cel | whatsapp | numero de celular | numero de telefono) es [el] [mas] {digits} #h:phone_its",
      "(puede | pueden) (llamarme | marcarme | localizarme | escribirme) al [mas] {digits}",
      "(me puede | me pueden) (llamar | marcar | localizar) al [mas] {digits}",
      "(puedes | me puedes) (llamarme | llamar | marcarme) al [mas] {digits} #tip:tu_staff",
      "[el] numero es [el] [mas] {digits}",
      // his "¿El de su hotel, por ejemplo?"
      "[si] (el del | el de mi) hotel [mar azul] (es | seria) [el] [mas] {digits}",
    ] },
    no_phone: { patterns: [
      "[no] no tengo (numero | telefono | celular) [mexicano | de aqui | local | aqui | conmigo] #h:no_phone",
      "[no] (mi | el) (celular | telefono) (estaba | iba | venia) en (la | mi) {item} #stolen_phone",
      "[no] (tambien | igual) me robaron el (celular | telefono) #stolen_phone", "[no] me robaron el (celular | telefono) (tambien | igual) #stolen_phone",
      "[no] (mi | el) (celular | telefono) no (funciona | sirve) (aqui | en mexico)",
      "[no] no tengo (linea | chip) [mexicano | mexicana]", "[no] no tengo (otro | ningun otro) (numero | telefono)", "[no] no me (se | acuerdo de) (mi | el) numero [de memoria]",
    ] },
    // a bare "No tengo otro" / "No me lo sé" only at the phone question ("No, no tengo otra" at the ID question is no ID)
    no_phone_ctx: { patterns: ["[no] no tengo (otro | ningun otro | ninguno)", "[no] no me lo se [de memoria]"] },
    cancel_cards: { patterns: [
      "(tengo que | debo | hay que | necesito) (cancelar | bloquear | reportar) (mis | las) tarjetas #h:q_cancel",
      "(tengo que | debo) (llamar | hablar) (al | a mi) banco",
      "(y | que hago con | que pasa con) (mis | las) tarjetas",
      "(cancelo | bloqueo) (mis | las) tarjetas", "(tengo que | debo) (cancelarlas | bloquearlas | reportarlas)",
      "ya (bloqueé | cancelé | reporté) (mis | las) tarjetas #done_cards",
    ] },
    what_now: { patterns: [
      "que (hago | tengo que hacer | debo hacer | necesito hacer) (ahora | despues | ahorita) #h:q_what_now",
      "y ahora que [hago]", "que sigue [ahora]", "(cual es el siguiente paso | cuales son los siguientes pasos)",
      "que (pasa | va a pasar) (ahora | despues)", "hay algo mas que (tenga | deba | necesite) hacer",
      "que (hacen | van a hacer) (ustedes | ahora)", "que hago",
    ] },
    how_long: { patterns: [
      "cuanto tiempo (tarda | se tarda | tardan | se tardan | va a tardar) #h:q_how_long",
      "cuando (me avisan | me van a avisar | voy a saber [algo] | me llaman | me van a llamar)", "cuanto (tarda | se tarda | tardan)",
    ] },
    chances: { patterns: [
      "(cree | piensa) que (la | lo) (encuentren | van a encontrar | encuentran)", "(la | lo) van a encontrar",
      "hay (posibilidades | alguna posibilidad | esperanza)", "(y si | que pasa si) no ((la | lo) (encuentran | encuentra nadie | entrega nadie) | aparece) #ifnot", "(me van a llamar | me llaman | me avisan) si (la | lo) (encuentran | encuentra alguien | entregan)", "(la gente | alguien) (devuelve | entrega) (las carteras | las cosas)",
    ] },
    copy: { patterns: [
      "(me puede dar | me da | me podria dar | puedo tener | necesito | quiero | quisiera) una copia [del reporte] [para (el | mi) seguro #seguro] #h:q_copy",
      "(me das | me puedes dar) una copia [del reporte] [para (el | mi) seguro #seguro] #tip:tu_staff",
      "(necesito | me dan | me da) (el reporte | un comprobante | un papel) para (el | mi) seguro #seguro",
      "me (dan | llevo) una copia [del reporte]",
    ] },
    q_cost: { patterns: ["(tengo que | hay que | debo) pagar [algo] [por el reporte]", "cuanto (cuesta | es) [el reporte]", "(cuesta | se paga) [algo]", "(es | el reporte es) gratis",
      "(es | sera) gratis (el reporte | esto)", "(el reporte | esto) (cuesta | tiene costo | sale gratis) [algo]", "(cobran | se cobra) [algo] [por el reporte]",
      // the denuncia's cost: "Ni el reporte ni la denuncia cuestan nada"
      "cuanto (cuesta | es | cobran por) (la denuncia | levantar la denuncia | poner la denuncia) #den", "(es | sera) gratis (la denuncia | levantar la denuncia) #den",
      "(la denuncia | levantar la denuncia) (cuesta | tiene costo | es gratis) [algo] #den", "(tengo que | hay que | debo) pagar [algo] (por la denuncia | en el ministerio publico | en la fiscalia) #den"] },
    q_search: { patterns: ["(me pueden | pueden | me puede | puede) ayudar a (buscarla | buscarlo)", "(la | lo) (pueden | van a) buscar", "(pueden | van a) (revisar | ver) las camaras"] },
    // "¿Esto es una denuncia?", "¿Necesito una denuncia para el seguro?"
    q_denuncia: { patterns: [
      "(esto | este reporte | el reporte | eso) es [una] denuncia #h:q_denuncia",
      "(necesito | tengo que levantar | tengo que hacer | debo levantar | hay que levantar | necesito levantar) una denuncia [formal] [para (el | mi) seguro]",
      "(sirve | me sirve | vale) (para el seguro | para mi seguro | como denuncia)",
      "(mi | el) seguro (me pide | pide | necesita | me va a pedir) (una denuncia | el reporte | un reporte)",
      "(cual es la diferencia | que diferencia hay) entre (un | el) reporte y (una | la) denuncia",
    ] },
    pen: { patterns: [
      "con que firmo",
      "(tiene | me presta | me da | me puede prestar | me podria prestar) (una pluma | un boligrafo | una lapicera | un lapicero | algo para escribir) #h:pen",
      "(me prestas | tienes) (una pluma | un boligrafo | un lapicero) #tip:tu_staff", "necesito (una pluma | un boligrafo)", "no tengo (pluma | boligrafo)",
    ] },
    signed: { patterns: ["ya (firmé | lo firmé)", "(listo | ya | ok) ya firmé", "ya esta firmado"] },
    // a bare "Listo." / "Ya está." / "Aquí tiene." only when asked to sign
    signed_ctx: { patterns: ["listo #h:signed", "ya (esta | quedó)", "(ok | listo) ya esta", "(aqui tiene | aqui esta | tenga)", "[listo] ya (lo | la) hice"] },
    // "No quiero firmar todavía" / "Primero lo leo": not a signature; "¿Tengo que firmar?" gets the same "Es necesario…"
    no_sign_ctx: { patterns: ["no (quiero | voy a | puedo) firmar [todavia | ahorita | nada]", "(todavia | aun) no (firmo | lo firmo)", "(primero | antes) (lo quiero leer | quiero leerlo | lo leo | lo voy a leer)", "no lo (firmo | voy a firmar)",
      "(un momento | espere | permitame) [(primero | antes)] [(lo | la) (voy a leer | leo | reviso | voy a revisar)]",
      "(y si | que pasa si) no (firmo | lo firmo | quiero firmar)", "no firmo nada sin (leerlo | leer)",
      "(tengo que | hay que | debo) firmar [esto | el reporte]", "(es necesario | es obligatorio) firmar [esto | el reporte]", "(para que | por que) (firmo | tengo que firmar)"] },
    // a bare "¿Dónde?" or "¿Aquí?" only when asked to sign
    sign_where_ctx: { patterns: ["(donde | en donde) [exactamente]", "(aqui | aqui abajo | aca)"] },
    sign_where: { patterns: ["(donde | en donde) (firmo | tengo que firmar | hay que firmar | pongo mi firma) #h:sign_where", "(firmo | tengo que firmar) aqui", "(donde | en donde) (le | lo) firmo"] },
    fill_form: { patterns: [
      "(tengo que | hay que | debo) (llenar | rellenar | completar) (algo | un formulario | una forma | un formato | un papel)",
      "(hay | tienen) (un formulario | una forma | un formato) [para llenar]",
    ] },
    its_mine: { patterns: [
      "[si] es (mia | mio) #h:its_mine", "[si] (esa | ese | esta | este) es (mi {item} | la mia | el mio)", "[si] (es esa | es ese | es esta | es este)",
      "(gracias a dios | que alivio | que suerte) [si] [es (mia | mio)]", "[si] creo que (si es | es) (mia | mio)",
    ] },
    not_mine: { patterns: [
      "[no] no es (mia | mio | la mia | el mio) #h:not_mine", "[no] (la mia | el mio) es {dp} [y] [{dp}] #h:not_mine2",
      "[no] (la mia | el mio) es (mas grande | mas chica | mas chico | diferente | distinta | distinto | otra | otro)",
      "[creo que] no es (mia | mio | la mia | el mio)", "si no [perdon | espere] no es (mia | mio | la mia | el mio)", "[es parecida | es parecido | se parece] pero no es (mia | mio | la mia | el mio)",
    ] },
    // "No es esa" only at "¿Es suya?"
    not_mine_ctx: { patterns: [
      "no (es esa | es ese | es esta | es este)", "(esa | ese) no es", "[no] (esa | ese | esta | este) [{item}] no es (mia | mio | la mia | el mio | mi {item})",
      "[no] mi {item} es (mas grande | mas chica | mas chico | diferente | distinta | distinto | otra | otro)", "no mi {item} es {dp} [y] [{dp}]",
    ] },
    // "No sé si es mía", "Se parece a la mía": he asks the learner to take a good look
    unsure_mine_ctx: { patterns: ["no se si (es | sea) (mia | mio | la mia | el mio)", "no estoy (seguro | segura) (si | de que) (es | sea) (mia | mio)", "(tal vez | a lo mejor | puede ser) [sea (mia | mio)]",
      "(se parece | es [muy] parecida | es [muy] parecido | es igual | es identica | es identico) a (la mia | el mio)",
      "[no estoy (seguro | segura)] [me deja | puedo] (verla | verlo | revisarla | revisarlo | la puedo ver | lo puedo ver | la puedo revisar)"] },
    all_there: { patterns: [
      "[si] (esta todo | todo esta) (aqui | ahi | bien | completo) [gracias]", "[si] (esta completa | esta completo | esta todo completo) [aqui | ahi | bien]",
      "[si] no falta nada", "[si] todo (esta | sigue) (aqui | ahi | completo | en su lugar | bien)",
      "[si] (estan | siguen) [aqui] (mis | todas mis) {content} [y] [(mi | mis) {content}] [y] [(mi | mis) {content}]",
      "[si] no se llevaron nada",
    ] },
    // a bare "Sí, está todo" only at "Revise que esté todo"
    all_there_ctx: { patterns: ["[si] (esta todo | todo esta) #h:all_there"] },
    missing_some: { patterns: [
      "[no] (falta | faltan) [el | mi] (dinero | efectivo) #h:missing_some",
      "[no] (el | mi) (dinero | efectivo) no (esta | estan)",
      "[no] (falta | faltan) [mi | mis | el | la | los | las] {content}",
      "[no] (mi | mis | el | la | los | las) {content} no (esta | estan)",
      "[no] (esta | esta todo) menos (el | mi | la | mis | los | las) ((dinero | efectivo) | {content})",
      // "Está todo menos los trescientos pesos", "Solo faltan doscientos pesos", "Falta el dinero, todo lo demás está"
      "[esta] todo menos [el | mi | la | mis | los | las] {ci}", "[solo | nada mas | nomas] (falta | faltan) {ci} [y] [{ci}] [pero] [todo lo demas (esta | si esta | esta bien)]",
      "[si] (estan | esta) (mis | mi) {content} pero (falta | no esta) (el | mi) (dinero | efectivo)",
      "[no] no esta todo", "(se llevaron | sacaron | le sacaron) (el | mi) (dinero | efectivo)",
      "[mis | las | mi | la] {content} si [pero] (el | mi) (dinero | efectivo) no",
    ] },
    bank_called: { patterns: [
      "[si] ya (llamé | hablé) [al banco | a mi banco | con el banco | con mi banco] #h:bank_called",
      "[si] ya (las | los) (bloqueé | cancelé | reporté) [en la app | en la aplicacion]",
      "[si] ya (bloqueé | cancelé | reporté) (mis | las) tarjetas [en la app | en la aplicacion]",
      "[si] (mis | las) tarjetas ya (estan | quedaron) (bloqueadas | canceladas)", "[si] ya (estan | quedaron) (bloqueadas | canceladas)",
      "[si] (las | los) (bloqueé | cancelé) (en | con) la (app | aplicacion)",
    ] },
    // a bare "Ya lo hice" only at "¿Ya llamó a su banco?" (at the signature it's the signature)
    bank_called_ctx: { patterns: ["[si] ya (lo | la) hice"] },
    bank_not_yet: { patterns: [
      "[no] (todavia | aun) no (llamo | he llamado | las bloqueo | las he bloqueado | las cancelo | las he cancelado | hablo con el banco) [al banco | a mi banco | con el banco]",
      "[no] no he (llamado | podido llamar | hablado) (al banco | a mi banco | con el banco | con mi banco) [todavia | aun]",
      "[no] no (las | los) he (bloqueado | cancelado | reportado) [todavia | aun]",
      "[no] voy a llamar al banco [ahorita | despues | luego | mas tarde | saliendo de aqui | hoy]",
    ] },
    // bare "Todavía no", "Se me olvidó", "Ahorita llamo" only at the bank question ("Se me olvidó en el hotel" at the
    // ID question is no ID)
    bank_not_yet_ctx: { patterns: [
      "[no] todavia no #h:bank_not_yet", "[no] aun no",
      "[no] no he (llamado | podido | podido llamar | tenido tiempo) [todavia | aun]",
      "[no] (ahorita | ahora | despues | luego | mas tarde | saliendo de aqui) (llamo | les llamo | las bloqueo)",
      "[no] voy a llamar (ahorita | despues | luego | mas tarde | saliendo de aqui | hoy)",
      "[no] se me olvidó",
    ] },
    no_id: { patterns: [
      "[no] (estaba | estaban | iba | venia | venian) en (la | mi) {item} #h:no_id",
      "[no] (todo | todos mis documentos | mis documentos | mi identificacion | mi pasaporte | mi licencia | todo eso) (estaba | estaban | iba | iban) en (la | mi) {item}",
      "[no] no (traigo | tengo | cargo) [ninguna] (identificacion | documentos | ningun documento) [conmigo | aqui]",
      "[no] no (traigo | tengo) (mi | el) (pasaporte | licencia)",
      "[no] (lo | la) (tengo | traigo | dejé) en (el | mi) (hotel | casa | departamento | cuarto)",
      "[no] (tengo | traigo | dejé) (mi | el | la) (pasaporte | identificacion | licencia) en (el | mi) (hotel | casa | departamento | cuarto)",
      "[no] (mi | el | la) (pasaporte | identificacion | licencia) (esta | se quedó) en (el | mi) (hotel | casa | departamento | cuarto)",
      "(mi | el | la) (pasaporte | identificacion | licencia | credencial | ine) no [(lo | la) (traigo | tengo)] [(lo | la) (dejé | tengo) en (el | mi) (hotel | casa | departamento | cuarto)]",
    ] },
    // "No traigo nada" only at "¿Trae alguna identificación?"
    no_id_ctx: { patterns: ["[no] no (traigo | tengo) nada [conmigo | aqui]", "[no] [no (tengo | traigo) nada] [porque] (me robaron | se llevaron) todo", "[no] no (tengo | traigo) [porque] (me robaron | se llevaron) todo",
      "[si] [pero] [(lo | la) (tengo | dejé)] en (el | mi) (hotel | casa | departamento | cuarto)",
      // "¿Trae alguna otra identificación?" "No, no tengo otra."
      "[no] no (tengo | traigo | cargo) (otra | ninguna | ninguna otra | otra identificacion | otra mas) [conmigo | aqui]",
      "[no] se me olvidó [en (el | mi) (hotel | casa | departamento | cuarto)]"] },
    have_id: { patterns: [
      "[si] (traigo | tengo) (mi | el | la) (pasaporte | licencia | identificacion | credencial | ine | licencia de manejo) [conmigo | aqui] #h:have_id",
      "[si] aqui (esta | tiene) (mi | el | la) (pasaporte | licencia | identificacion | credencial)",
      "[si] (tengo | traigo) una (copia | foto) de mi pasaporte [en el celular | en mi celular]",
    ] },
    // a bare "Aquí tiene" or "Mi pasaporte" only at the ID question
    have_id_ctx: { patterns: ["(aqui tiene | aqui esta | tenga | tome)", "[si] [mi] (pasaporte | licencia | identificacion | credencial | ine)"] },
    thanks_officer: { patterns: [
      "(usted | usted fue | fue | ha sido) muy amable [oficial] #h:thanks_officer", "le agradezco [mucho] su ayuda", "gracias por todo oficial",
    ] },
    // "Sí, una pregunta" at "¿Algo más?"
    one_question_ctx: { patterns: ["[si] (una pregunta | tengo una pregunta | otra pregunta | tengo otra pregunta | una cosa mas | otra cosa)",
      "[no] (solo | nada mas | nomas) (una pregunta | una cosa | otra cosa | otra pregunta)", "[si] (quiero | quisiera) (preguntar | hacer una pregunta) [algo]"] },
    thats_all: { patterns: [
      "[no] [eso] (es | seria) todo [gracias] [por ahora] #h:thats_all", "[no] nada mas [gracias]", "[no] (estoy bien | asi estoy bien) [gracias]",
      "[no] por ahora (es | seria) todo", "[no] ya es todo", "no nada [gracias]",
    ] },
    // The twist: the Ministerio Público
    mp_where: { patterns: [
      "(donde | en donde) (esta | queda) (el ministerio publico | la fiscalia | el mp | esa oficina) #h:mp_where",
      "como llego (al ministerio publico | a la fiscalia | al mp)", "(el ministerio publico | la fiscalia) (esta | queda) (lejos | cerca)",
    ] },
    mp_where_ctx: { patterns: ["(donde | en donde) (esta | queda)", "(esta | queda) (lejos | cerca)", "como llego [alla | ahi]"] },
    mp_bring: { patterns: [
      "que (tengo que | debo | necesito | hay que) llevar [al ministerio publico | a la fiscalia] #h:mp_bring",
      "(necesito | tengo que) llevar (algo | algun documento | el reporte | este papel | la copia | el folio | mi pasaporte)",
      "(llevo | me llevo) (el reporte | este papel | la copia | el folio)",
    ] },
    mp_today: { patterns: [
      "(tengo que | debo | puedo) ir (hoy [mismo] | manana | otro dia | despues | mas tarde)", "(a que hora | hasta que hora) (abren | cierran | abre | cierra | atienden) #hours",
      "(que horario tienen | cual es el horario | cual es su horario) #hours",
      "(esta | estan) (abierto | abiertos | abierta) (hoy | ahorita | ahora)",
    ] },
    mp_online: { patterns: [
      "(lo | la) (puedo | podria) (hacer | levantar | poner) (en linea | por internet)",
      "(se puede | hay) (denuncia en linea | hacer por internet | hacerlo por internet | hacerlo en linea)",
    ] },
    mp_why: { patterns: [
      "por que (tengo que ir | debo ir) [alla | al ministerio publico]", "[por que] no (puedo | se puede) (levantarla | hacerla | ponerla | levantar la denuncia | hacer la denuncia) aqui",
      "(para que | por que) (necesito | es) la denuncia",
    ] },
    mp_ok: { patterns: ["[esta bien] (voy | ire | me voy) (para alla | ahorita | mas tarde | manana | hoy | despues) [entonces] #h:mp_ok"] },
  },

  lines: {
    greet: [
      t("Buenas tardes. | ¿En | qué | le | puedo | ayudar?", "Good afternoon. | With | what | (to) you | can I | help?", "Good afternoon. How can I help you?"),
      t("Buenas. | ¿Qué se le ofrece?", "Hello. | What can I do for you?", "Hello. What can I do for you?",
        { flags: { 0: "Buenas: short for buenas tardes, a common hello in Mexico.", 1: "¿Qué se le ofrece?: a polite way to ask what someone needs, common in Mexico." } }),
      t("Pase, | por favor. | ¿En | qué | le | ayudo?", "Come in, | please. | With | what | (to) you | I-help?", "Come on in. How can I help?"),
    ],
    ask_help: [t("¿En | qué | le | puedo | ayudar?", "With | what | (to) you | can I | help?", "How can I help you?")],
    tell_me: [t("Claro, | dígame. | ¿Qué | pasó?", "Sure, | tell me. | What | happened?", "Sure, tell me. What happened?")],
    sorry_hear: [
      t("Lo siento | mucho.", "I'm sorry | a lot.", "I'm so sorry."),
      t("¡Qué | mala | suerte! | Lo siento.", "What | bad | luck! | I'm sorry.", "What bad luck! I'm sorry."),
    ],
    ask_what_stolen: [t("¿Qué | le | robaron?", "What | (from) you | did they steal?", "What was stolen?", { flags: { 1: "le: from you. Spanish marks the person something was stolen from." } })],
    ask_what_vague: [t("Claro. | ¿Qué | perdió, | o | qué | le | robaron?", "Sure. | What | did you lose, | or | what | (from) you | did they steal?", "Sure. What did you lose, or what was stolen?")],
    what_again: [t("¿Y | qué | era? | ¿Una | cartera, | una | bolsa…?", "And | what | was it? | A | wallet, | a | purse…?", "And what was it? A wallet, a purse…?")],
    which_one: [t("Perdón, | ¿cuál | de | los | dos?", "Sorry, | which | of | the | two?", "Sorry, which one was it?")],
    ask_what_in: [t("¿Lo | traía | en | una | cartera, | una | bolsa | o | una | mochila?", "It | were you carrying | in | a | wallet, | a | purse | or | a | backpack?", "Was it in a wallet, a purse or a backpack?")],
    ask_stolen_q: [
      t("¿Cree | que | se | {lo@X} | robaron?", "Do you think | that | (from) you | it | they-stole?", "Do you think someone stole it?",
        { flags: { 2: "se: from you (le becomes se before lo / la)." } }),
    ],
    ask_happened: [
      t("¿Me | puede | contar | qué | pasó?", "(To) me | can you | tell | what | happened?", "Can you tell me what happened?"),
      t("A ver, | ¿qué | pasó?", "Let's see, | what | happened?", "Okay, what happened?"),
    ],
    ack: [t("Ya veo.", "I see.", "I see."), t("Entiendo.", "I understand.", "I understand."), t("De acuerdo.", "Okay.", "Okay.")],
    no_worry: [t("No se preocupe.", "Don't worry.", "That's all right.")],
    ask_where: [
      t("¿Dónde | pasó?", "Where | did it happen?", "Where did it happen?"),
      t("¿Dónde | estaba | cuando | pasó?", "Where | were you | when | it happened?", "Where were you when it happened?"),
    ],
    where_again: [t("Entonces, | ¿dónde | fue?", "So, | where | was it?", "So where was it?")],
    when_again: [t("¿Y | a | qué | hora, | más o menos?", "And | at | what | time, | more or less?", "And roughly what time?")],
    describe_again: [t("Entonces, | ¿cómo | es | {X.the}?", "So, | how | is | {X.the}?", "So what does {X.the} look like?")],
    contents_again: [t("¿Y | qué | traía | adentro?", "And | what | did it have | inside?", "And what was in it?")],
    phone_again: [t("¿Y | su | teléfono?", "And | your | phone number?", "And your phone number?")],
    ask_when: [
      t("¿Y | a | qué | hora | fue?", "And | at | what | time | was it?", "And what time was that?"),
      t("¿Cuándo | fue | esto?", "When | was | this?", "When was this?"),
    ],
    ask_describe: [
      t("¿Me | puede | describir | {X.the}?", "(To) me | can you | describe | {X.the}?", "Can you describe {X.the}?"),
      t("¿Cómo | es?", "How | is it?", "What does it look like?"),
    ],
    describe_echo: [
      t("Muy | bien, | {X.np}.", "Very | good, | {X.np}.", "Okay, {X.np}."),
      t("Entonces, | {X.np}.", "So, | {X.np}.", "So, {X.np}."),
    ],
    ask_contents: [
      t("¿Qué | traía | adentro?", "What | did it have | inside?", "What was in it?"),
      t("¿Y | qué | había | adentro?", "And | what | was there | inside?", "And what was inside?"),
    ],
    ask_cash: [t("¿Cuánto | efectivo, | más o menos?", "How much | cash, | more or less?", "Roughly how much cash?")],
    cash_echo: [t("Unos | {$price} | en efectivo. | Muy | bien.", "About | {$price} | in cash. | Very | good.", "About {$price} in cash. Okay.", { flags: { 0: "unos before a number: about." } })],
    contents_ok: [
      t("Bien, | ya | lo | anoté.", "Okay, | already | it | I-wrote-down.", "Okay, I've written that down."),
      t("De acuerdo, | lo | anoto.", "Okay, | it | I-write-down.", "All right, I'm noting that."),
    ],
    passport_embassy: [
      t("Por | el | pasaporte, | avise | también | a | su | consulado.", "About | the | passport, | notify | also | — | your | consulate.",
        "About your passport: let your consulate know as well.", { flags: { 5: "a: avisar a = notify; English has no word here." } }),
    ],
    ask_bank: [
      t("¿Ya | llamó | a | su | banco?", "Already | did you call | — | your | bank?", "Have you called your bank yet?", { flags: { 2: "a: llamar a = call; English has no word here." } }),
      t("¿Ya | reportó | sus | tarjetas | al | banco?", "Already | did you report | your | cards | to the | bank?", "Have you reported your cards to the bank yet?"),
    ],
    bank_good: [t("Muy | bien.", "Very | good.", "Good."), t("Perfecto.", "Perfect.", "Great.")],
    block_cards: [
      t("Llame | al | banco | lo antes posible | para | bloquear | sus | tarjetas.", "Call | the | bank | as soon as possible | to | block | your | cards.",
        "Call the bank as soon as you can to block your cards.", { flags: { 1: "al = a + el: llamar a = call, so English only says the." } }),
    ],
    ask_id: [t("¿Trae | alguna | identificación?", "Are you carrying | any | ID?", "Do you have any ID on you?")],
    ask_id_other: [t("¿Trae | alguna | otra | identificación?", "Are you carrying | any | other | ID?", "Do you have any other ID on you?")],
    id_of_course: [t("Claro, | no se preocupe.", "Of course, | don't worry.", "Of course, don't worry.")],
    id_thanks: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you.")],
    details: [t("Bueno, | necesito | unos | datos | para | el | reporte.", "Okay, | I-need | some | details | for | the | report.", "Okay, I need a few details for the report.")],
    ask_name: [
      t("¿Me | da | su | nombre | completo?", "(To) me | you-give | your | name | full?", "Could I have your full name?"),
      t("¿Cuál | es | su | nombre | completo?", "What | is | your | name | full?", "What's your full name?"),
    ],
    ask_last_name: [t("¿Y | su | apellido?", "And | your | last name?", "And your last name?")],
    ask_spell: [
      t("¿Me | puede | deletrear | su | apellido?", "(To) me | can you | spell | your | last name?", "Could you spell your last name for me?"),
      t("¿Cómo | se escribe | su | apellido?", "How | is spelled | your | last name?", "How do you spell your last name?"),
    ],
    spell_ok: [t("Gracias.", "Thanks.", "Thank you."), t("Listo, | gracias.", "Done, | thanks.", "Got it, thanks.")],
    spell_again: [t("Perdón, | letra | por | letra, | por favor.", "Sorry, | letter | by | letter, | please.", "Sorry, letter by letter, please.")],
    ask_phone: [
      t("¿Y | un | teléfono | para | {m:localizarlo|f:localizarla}?", "And | a | phone number | to | reach you?", "And a phone number where we can reach you?"),
      t("¿A | qué | número | le | podemos | llamar?", "At | what | number | (to) you | can we | call?", "What's the best number to call you?"),
    ],
    ask_phone_other: [t("¿Tiene | otro | número | para | {m:localizarlo|f:localizarla}? | ¿El | de | su | hotel, | por ejemplo?", "Do you have | another | number | to | reach you? | The one | of | your | hotel, | for example?",
      "Is there another number where we can reach you? Your hotel's, for example?", { flags: { 5: "El de: the one of; Spanish leaves out the noun (el número de su hotel)." } })],
    phone_ok: [t("Gracias, | ya | lo | tengo.", "Thanks, | already | it | I-have.", "Thanks, got it.")],
    no_phone_ok: [t("No se preocupe. | Usted | nos | puede | llamar, | o | venir | a | preguntar.", "Don't worry. | You | us | can | call, | or | come | to | ask.", "That's all right. You can call us, or come by and ask.")],
    sign: [
      t("Revise | el | reporte | y | firme | aquí, | por favor.", "Check | the | report | and | sign | here, | please.", "Please check the report and sign here."),
      t("Lea | el | reporte | y | fírmelo | abajo, | por favor.", "Read | the | report | and | sign it | at the bottom, | please.", "Please read the report and sign it at the bottom."),
    ],
    sign_remind: [t("Entonces, | firme | aquí, | por favor.", "So, | sign | here, | please.", "So, please sign here.")],
    sign_need: [t("Es | necesario | para | el | reporte. | Revíselo | con | calma.", "It's | necessary | for | the | report. | Check it | with | calm.", "It's needed for the report. Take your time to check it.")],
    sign_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you."), t("Gracias.", "Thanks.", "Thank you.")],
    sign_where: [t("Aquí | abajo, | en | la | línea.", "Here | below, | on | the | line.", "Down here, on the line.")],
    sign_where_yes: [t("Sí, | ahí, | en | la | línea.", "Yes, | there, | on | the | line.", "Yes, right there, on the line.")],
    pen: [
      t("Claro, | aquí tiene | una | pluma.", "Sure, | here you go | a | pen.", "Sure, here's a pen.",
        { flags: { 3: "Mexican: pluma = pen (bolígrafo elsewhere)." }, neutral: t("Claro, | aquí tiene | un | bolígrafo.", "Sure, | here you go | a | pen.", "Sure, here's a pen.") }),
    ],
    form_yes: [t("No, | yo | lleno | el | reporte. | Usted | solo | lo | revisa | y | firma.", "No, | I | fill out | the | report. | You | only | it | check | and | sign.", "No, I'll fill out the report. You just check it and sign.")],
    case_number: [
      t("Su | número | de | folio | es | el | 4471.", "Your | number | of | reference | is | — | 4471.", "Your report number is 4471.",
        { say: "Su número de folio es el cuatro, cuatro, siete, uno.", write: "Folio: 4471 · Policía Municipal de Puerto Colibrí",
          flags: { 3: "folio: the reference number on an official paper.", 5: "el before a number: English has no word here." } }),
    ],
    will_call: [
      t("Si | alguien | {lo@X} | entrega, | le | llamamos.", "If | someone | it | turns in, | (to) you | we-call.", "If someone turns it in, we'll call you."),
      t("Si | aparece, | le | avisamos.", "If | it turns up, | (to) you | we-let-know.", "If it turns up, we'll let you know."),
    ],
    will_call_partial: [t("Si | sabemos | algo, | le | avisamos.", "If | we-know | something, | (to) you | we-let-know.", "If we hear anything, we'll let you know.")],
    cards_yes: [
      t("Sí, | llame | a | su | banco | y | bloquéelas | cuanto antes.", "Yes, | call | — | your | bank | and | block them | as soon as possible.",
        "Yes, call your bank and block them as soon as you can.", { flags: { 2: "a: llamar a = call; English has no word here." } }),
    ],
    cards_done: [t("Muy | bien. | Eso | es | lo | más | importante.", "Very | good. | That | is | the | most | important (thing).", "Good. That's the most important thing.")],
    what_now: [
      t("Llame | a | su | banco | para | bloquear | las | tarjetas, | y | si | {lo@X} | entregan, | le | llamamos.",
        "Call | — | your | bank | to | block | the | cards, | and | if | it | they-turn-in, | (to) you | we-call.",
        "Call your bank to block your cards, and if someone turns it in, we'll call you.", { flags: { 1: "a: llamar a = call; English has no word here." } }),
    ],
    how_long: [t("Es | difícil | saber. | A veces | tarda | unos | días.", "It's | hard | to know. | Sometimes | it takes | a few | days.", "It's hard to say. Sometimes it takes a few days.")],
    chances: [t("Ojalá. | Muchas | veces | las | cosas | aparecen.", "Hopefully. | Many | times | the | things | turn up.", "I hope so. Things often turn up.")],
    cost_ans: [t("El | reporte | es | gratis, | no cuesta | nada.", "The | report | is | free, | it doesn't cost | anything.", "The report is free, it doesn't cost anything.")],
    // asked about the denuncia, or once the Ministerio Público has come up
    cost_both: [t("Ni | el | reporte | ni | la | denuncia | cuestan | nada.", "Neither | the | report | nor | the | complaint | cost | anything.",
      "Neither the report nor the formal complaint costs anything.", { flags: { 0: "ni… ni…: neither… nor…; the verb is plural (cuestan)." } })],
    search_ans: [t("Les | voy | a | avisar | a | las | patrullas | de | la | zona.", "(To) them | I'm going | to | notify | — | the | patrols | of | the | area.",
      "I'll let the patrols in the area know.", { flags: { 4: "a: personal a before people; English has no word here (les and a las patrullas name the same people)." } })],
    chances_not: [t("Para | eso | es | el | reporte: | con | él | puede | hacer | sus | trámites.", "For | that | is | the | report: | with | it | you-can | do | your | paperwork.",
      "That's what the report is for: you can use it for the paperwork.")],
    copy: [t("Claro. | Aquí tiene | una | copia.", "Sure. | Here you go | a | copy.", "Sure. Here's a copy.")],
    copy_later: [t("Claro, | al | terminar | el | reporte | le | doy | una | copia.", "Sure, | on | finishing | the | report | (to) you | I-give | a | copy.",
      "Sure, I'll give you a copy when we finish the report.", { flags: { 1: "al + infinitive: when (doing something)." } })],
    copy_seguro: [t("Claro, | aquí tiene | una | copia | para | su | seguro.", "Sure, | here you go | a | copy | for | your | insurance.", "Sure, here's a copy for your insurance.")],
    copy_mp: [
      t("Aquí tiene | una | copia. | Pero | para | el | seguro | normalmente | piden | la | denuncia | del | Ministerio Público.",
        "Here you go | a | copy. | But | for | the | insurance | usually | they-ask-for | the | complaint | from the | prosecutor's office.",
        "Here's a copy. But for insurance they usually ask for the formal complaint from the Ministerio Público.", { flags: { 12: F_MP } }),
    ],
    q_denuncia_ans: [
      t("Esto | es | el | reporte | de | la | policía. | Si | su | seguro | pide | una | denuncia, | se levanta | en | el | Ministerio Público.",
        "This | is | the | report | of | the | police. | If | your | insurance | asks for | a | complaint, | it's filed | at | the | prosecutor's office.",
        "This is the police report. If your insurance asks for a formal complaint, you file that at the Ministerio Público.", { flags: { 16: F_MP } }),
    ],
    mp_send: [
      t("Ojo: | esto | es | un | reporte, | no | una | denuncia. | La | denuncia | formal | se levanta | en | el | Ministerio Público.",
        "Careful: | this | is | a | report, | not | a | complaint. | The | complaint | formal | is filed | at | the | prosecutor's office.",
        "Just so you know, this is a police report, not a formal complaint. You file that at the Ministerio Público.",
        { flags: { 0: "Ojo (eye): watch out, note this.", 14: F_MP } }),
    ],
    mp_send2: [
      t("Si | su | seguro | se la | pide, | vaya | con | una | identificación | y | este | folio.", "If | your | insurance | it (of) you | asks, | go | with | an | ID | and | this | reference number.",
        "If your insurance asks for it, go there with your ID and this report number."),
    ],
    mp_where_ans: [
      t("Está | aquí | cerca. | Le | anoto | la | dirección.", "It's | here | near. | (For) you | I-write-down | the | address.",
        "It's close by. I'll write down the address for you.", { write: "Ministerio Público · Fiscalía del Estado" }),
    ],
    mp_where_early: [
      t("Está | aquí | cerca. | Al | terminar | el | reporte, | le | anoto | la | dirección.", "It's | here | near. | On | finishing | the | report, | (for) you | I-write-down | the | address.",
        "It's close by. When we finish the report, I'll write down the address for you.", { flags: { 3: "al + infinitive: when (doing something)." } }),
    ],
    mp_bring_ans: [t("Una | identificación | y | el | número | de | folio | del | reporte.", "An | ID | and | the | number | of | reference | of the | report.", "Some ID and the report number.")],
    mp_hours_ans: [t("No | sé | el | horario | exacto. | Mejor | vaya | hoy | mismo.", "Not | I-know | the | hours | exact. | Better | go | today | itself.",
      "I don't know their exact hours. Better go today.")],
    mp_today_ans: [t("Mejor | hoy | mismo, | si | puede.", "Better | today | itself, | if | you can.", "Today if you can.")],
    mp_online_ans: [
      t("Algunos | trámites | se pueden | hacer | en línea, | pero | para | un | robo | mejor | vaya | en persona.",
        "Some | procedures | can be | done | online, | but | for | a | theft | better | go | in person.", "Some things can be done online, but for a theft it's better to go in person."),
    ],
    mp_why_ans: [
      t("Aquí | solo | hacemos | el | reporte. | Las | denuncias | las | recibe | el | Ministerio Público.",
        "Here | only | we-make | the | report. | The | complaints | them | receives | the | prosecutor's office.",
        "We only take the report here. Formal complaints go to the Ministerio Público.", { flags: { 7: "las: them, the complaints again (Spanish repeats the object before the verb).", 10: F_MP } }),
    ],
    mp_good: [t("Muy | bien. | Ahí | le | van | a | ayudar.", "Very | good. | There | (to) you | they-go | to | help.", "All right. They'll help you there.")],
    found: [
      t("Ah, | espere | un | momento. | Alguien | acaba de | entregar | {X.np}.", "Oh, | wait | a | moment. | Someone | has just | turned in | {X.np}.", "Oh, wait a moment. Someone just turned in {X.np}."),
    ],
    found_ask: [t("¿Es | {suyo@X}?", "Is it | yours?", "Is it yours?")],
    found_reask: [t("Entonces, | ¿es | {suyo@X} | o | no?", "So, | is it | yours | or | not?", "So, is it yours or not?")],
    found_sure: [t("¿Está | {m:seguro|f:segura}? | Usted | dijo | que | era | {X.np}.", "Are you | sure? | You | said | that | it was | {X.np}.", "Are you sure? You said it was {X.np}.")],
    found_verify: [t("¡Qué | bien! | ¿Me | dice | su | nombre, | para | ver | que | coincida?", "How | nice! | (To) me | you-tell | your | name, | to | see | that | it matches?", "Great! Can you tell me your name, so I can check it matches?")],
    found_match: [t("Perfecto, | coincide. | Aquí tiene. | Revise | que | esté | todo, | por favor.", "Perfect, | it matches. | Here you go. | Check | that | is-there | everything, | please.", "Perfect, it matches. Here you go. Please check that everything's there.")],
    look_closely: [t("Revise | bien, | por favor.", "Check | well, | please.", "Take a good look, please.")],
    lucky: [t("¡Qué | suerte | tuvo!", "What | luck | you had!", "You were lucky!")],
    not_yours: [t("Bueno, | entonces | seguimos | con | el | reporte.", "Okay, | then | we-continue | with | the | report.", "Okay, then let's go on with the report.")],
    missing_which: [t("Perdón, | ¿falta | algo | o | está | todo?", "Sorry, | is missing | something | or | is-there | everything?", "Sorry, is something missing, or is everything there?")],
    missing_some: [t("Lo siento. | Entonces | hacemos | el | reporte | de todos modos.", "I'm sorry. | Then | we-make | the | report | anyway.", "I'm sorry. Then let's file the report anyway.")],
    anything_else: [
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Something | more | with | which | (to) you | I-may | help?", "Anything else I can help you with?"),
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | with | something | more?", "Can I help you with anything else?"),
    ],
    anything_more: [t("¿Algo | más?", "Something | more?", "Anything else?")],
    ask_away: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    closing: [t("Ojalá | aparezca | su | {X}. | Que | le | vaya | bien.", "Hopefully | turns up | your | {X}. | May | (for) you | it-go | well.", "I hope your {X} turns up. Take care.")],
    closing_welcome: [t("De nada. | Que | le | vaya | bien.", "You're welcome. | May | (for) you | it-go | well.", "You're welcome. Take care.")],
    closing_care: [t("Que | le | vaya | bien.", "May | (for) you | it-go | well.", "Take care.")],
    welcome: [t("Para | servirle.", "To | serve you.", "Happy to help."), t("De nada.", "You're welcome.", "You're welcome.")],
  },

  domains: { price: () => CASH },

  hints: {
    report: { lt: "Say what happened", slot: "item", examples: ["wallet"], items: [
      { id: "rep_denuncia", s: t("Quiero | levantar | una | denuncia.", "I want | to file | a | complaint.", "I'd like to report a crime."),
        note: "Levantar una denuncia: to file a formal complaint about a crime. “Quiero hacer un reporte” works too." },
      { id: "rep_theft", s: t("Quiero | reportar | un | robo.", "I want | to report | a | theft.", "I'd like to report a theft.") },
      { id: "rep_item", s: t("Quiero | reportar | el | robo | de | mi | {X}.", "I want | to report | the | theft | of | my | {X}.", "I'd like to report my stolen {X}.") },
      { id: "rep_stolen", s: t("Me | robaron | {X.the}.", "(From) me | they-stole | {X.the}.", "My {X} was stolen.", { flags: { 0: F_ME } }) },
      { id: "rep_someone", s: t("Alguien | me | robó | {X.the}.", "Someone | (from) me | stole | {X.the}.", "Someone stole my {X}.", { flags: { 1: F_ME } }) },
      { id: "rep_lost", s: t("Perdí | mi | {X}.", "I lost | my | {X}.", "I lost my {X}.") },
      { id: "rep_lost2", s: t("Se me perdió | {X.the}.", "I lost | {X.the}.", "I've lost my {X}.", { flags: { 0: "se me perdió: it got lost on me, the everyday way to say you lost something." } }) },
      { id: "rep_cantfind", s: t("No encuentro | mi | {X}.", "I can't find | my | {X}.", "I can't find my {X}.") },
    ] },
    what: { lt: "Say what was stolen", slot: "item", examples: ["wallet"], items: [
      { id: "wh_mine", s: t("Mi | {X}.", "My | {X}.", "My {X}.") },
      { id: "rep_stolen", s: t("Me | robaron | {X.the}.", "(From) me | they-stole | {X.the}.", "My {X} was stolen.", { flags: { 0: F_ME } }) },
    ] },
    stolen: { lt: "Say whether someone took it", items: [
      { id: "stolen_yes", s: t("Sí, | creo | que | fue | un | robo.", "Yes, | I think | that | it was | a | theft.", "Yes, I think it was stolen.") },
      { id: "stolen_no", s: t("No, | creo | que | se me cayó.", "No, | I think | that | I dropped it.", "No, I think I dropped it.", { flags: { 3: "se me cayó: it fell from me, the everyday way to say you dropped something." } }) },
      { id: "not_sure", s: t("No estoy | {m:seguro|f:segura}.", "I'm not | sure.", "I'm not sure.") },
    ] },
    happened: { lt: "Say what happened", items: [
      { id: "h_was_at", s: t("Estaba | en | el | mercado.", "I-was | at | the | market.", "I was at the market.") },
      { id: "h_gone", s: t("Cuando | quise | pagar, | ya | no estaba.", "When | I wanted | to pay, | anymore | it wasn't there.", "When I went to pay, it was gone.") },
      { id: "h_bumped", s: t("Alguien | chocó | conmigo.", "Someone | bumped | into me.", "Someone bumped into me.") },
      { id: "h_pocket", s: t("Estaba | en | mi | bolsillo | de atrás.", "It-was | in | my | pocket | back.", "It was in my back pocket.",
        { flags: { 4: "de atrás: back (literally from behind). In Mexico a pocket is also la bolsa." } }) },
    ] },
    where: { lt: "Say where it happened", slot: "place", examples: ["market", "square", "bus"], items: [
      { id: "where", s: t("En | {X.the}.", "At | {X.the}.", "At {X.the}."), only: (e) => e.attrs?.prep === "at" },
      { id: "where", s: t("En | {X.the}.", "On | {X.the}.", "On {X.the}."), only: (e) => e.attrs?.prep === "on" },
      { id: "where", s: t("En | {X.np}.", "In | {X.np}.", "In {X.np}."), only: (e) => e.attrs?.prep === "in" },
      { id: "where", s: t("Cerca | de | {X.the}.", "Close | to | {X.the}.", "Near {X.the}."), only: (e) => e.attrs?.prep !== "in" },
      { id: "h_was_at", s: t("Estaba | en | {X.the}.", "I-was | at | {X.the}.", "I was at {X.the}."), only: (e) => e.attrs?.prep === "at" },
    ] },
    when: { lt: "Say when it happened", items: [
      { id: "when", s: t("Como | a | las | once.", "About | at | — | eleven.", "At about eleven.", { flags: { 2: "las: hours take la / las in Spanish (las once = eleven o'clock)." } }) },
      { id: "when", s: t("Hace | una | hora.", "Ago | an | hour.", "An hour ago.", { flags: { 0: F_HACE } }) },
      { id: "when", s: t("Esta | mañana.", "This | morning.", "This morning.") },
      { id: "when", s: t("Hace | un | rato.", "Ago | a | while.", "A little while ago.", { flags: { 0: F_HACE } }) },
      { id: "where", s: t("En | el | mercado, | como | a | las | once.", "At | the | market, | about | at | — | eleven.", "At the market, at about eleven.",
        { flags: { 5: "las: hours take la / las in Spanish (las once = eleven o'clock)." } }) },
    ] },
    describe: { lt: "Describe it", items: [
      { id: "describe", s: t("Es | café, | de piel | y | chica.", "It's | brown, | leather | and | small.", "It's brown, leather and small.") },
      { id: "describe", s: t("Es | una | cartera | negra | de piel.", "It's | a | wallet | black | leather.", "It's a black leather wallet.") },
      { id: "describe", s: t("Es | chica | y | roja.", "It's | small | and | red.", "It's small and red."), note: "Colors and sizes agree with the thing: una cartera negra, un celular negro." },
    ] },
    contents: { lt: "Say what was inside", slot: "content", examples: ["license", "credit_card", "cash"], items: [
      { id: "contents", s: t("Mis | tarjetas | y | algo de | efectivo.", "My | cards | and | some | cash.", "My cards and some cash.") },
      { id: "contents", s: t("Traía | mi | {X}.", "I-had | my | {X}.", "My {X} was in it."), only: (e) => !e.attrs?.pl && e.art !== "" },
      { id: "contents", s: t("Traía | mis | {X}.", "I-had | my | {X}.", "My {X} were in it."), only: (e) => !!e.attrs?.pl },
      { id: "contents", s: t("Solo | efectivo.", "Only | cash.", "Just cash."), only: (e) => e.id === "cash" },
      { id: "contents", s: t("Mis | tarjetas, | mi | licencia | y | como | $500 | en efectivo.", "My | cards, | my | license | and | about | 500 pesos | in cash.",
        "My cards, my license and about 500 pesos in cash.", { say: "Mis tarjetas, mi licencia y como quinientos pesos en efectivo." }) },
    ] },
    cash: { lt: "Say how much cash", items: [
      { id: "contents", s: t("Como | $500.", "About | 500 pesos.", "About 500 pesos.", { say: "Como quinientos pesos." }) },
      { id: "contents", s: t("Unos | $200.", "About | 200 pesos.", "About 200 pesos.", { say: "Unos doscientos pesos.", flags: { 0: "unos before a number: about." } }) },
      { id: "contents", s: t("Como | 40 | dólares.", "About | 40 | dollars.", "About 40 dollars.", { say: "Como cuarenta dólares." }) },
      { id: "no_cash", s: t("No traía | efectivo.", "I wasn't carrying | cash.", "There was no cash in it.") },
    ] },
    bank: { lt: "Say whether you've called your bank", items: [
      { id: "bank_called", s: t("Sí, | ya | llamé.", "Yes, | already | I-called.", "Yes, I already called.") },
      { id: "bank_not_yet", s: t("No, | todavía no.", "No, | not yet.", "No, not yet.") },
      { id: "q_cancel", s: t("¿Tengo | que | bloquear | mis | tarjetas?", "Do I have | to | block | my | cards?", "Should I block my cards?") },
    ] },
    id: { lt: "Say whether you have ID", slot: "item", examples: ["wallet"], items: [
      { id: "no_id", s: t("No, | estaba | en | mi | {X}.", "No, | it-was | in | my | {X}.", "No, it was in my {X}.") },
      { id: "have_id", s: t("Sí, | traigo | mi | pasaporte.", "Yes, | I'm carrying | my | passport.", "Yes, I have my passport.") },
    ] },
    name: { lt: "Give your full name", items: [
      { id: "name_mine", s: t("Me llamo | {$name} | {$surname}.", "My name is | {$name} | {$surname}.", "My name is {$name} {$surname}.") },
      { id: "name_mine", s: t("{$name} | {$surname}.", "{$name} | {$surname}.", "{$name} {$surname}.") },
    ] },
    last_name: { lt: "Give your last name", items: [
      { id: "last_mine", s: t("Mi | apellido | es | {$surname}.", "My | last name | is | {$surname}.", "My last name is {$surname}.") },
      { id: "name_mine", s: t("{$surname}.", "{$surname}.", "{$surname}.") },
    ] },
    spell: { lt: "Spell your last name", items: [
      { id: "spell_it", s: t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}."),
        note: "Say the letters by their Spanish names: a, be, ce, de, e, efe, ge, hache, i, jota, ka, ele, eme…" },
    ] },
    phone: { lt: "Give your phone number", items: [
      { id: "phone_its", s: t("Mi | número | es | el | 984 | 123 | 4567.", "My | number | is | — | 984 | 123 | 4567.", "My number is 984 123 4567.",
        { say: "Mi número es el nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete.", flags: { 3: "el (número): Spanish puts an article before a phone number; English has no word here." } }),
        note: "Mexicans often read the last digits in pairs: cuarenta y cinco, sesenta y siete." },
      { id: "no_phone", s: t("No tengo | número | mexicano.", "I don't have | number | Mexican.", "I don't have a Mexican number.") },
    ] },
    sign: { lt: "Sign the report (or ask where)", items: [
      { id: "sign_where", s: t("¿Dónde | firmo?", "Where | do I sign?", "Where do I sign?") },
      { id: "pen", s: t("¿Me | presta | una | pluma?", "(To) me | you-lend | a | pen?", "Could I borrow a pen?",
        { flags: { 3: "Mexican: pluma = pen (bolígrafo elsewhere)." }, neutral: t("¿Me | presta | un | bolígrafo?", "(To) me | you-lend | a | pen?", "Could I borrow a pen?") }) },
      { id: "signed", s: t("Listo.", "Done.", "Done.") },
    ] },
    questions: { lt: "Ask what happens next", items: [
      { id: "q_what_now", s: t("¿Qué | hago | ahora?", "What | do I do | now?", "What should I do now?") },
      { id: "q_how_long", s: t("¿Cuánto | tiempo | tarda?", "How much | time | does it take?", "How long does it take?") },
      { id: "q_copy", s: t("¿Me | da | una | copia | para | el | seguro?", "(To) me | you-give | a | copy | for | the | insurance?", "Could I have a copy for my insurance?") },
      { id: "q_denuncia", s: t("¿Esto | es | una | denuncia?", "This | is | a | complaint?", "Is this a formal complaint?") },
      { id: "q_cancel", s: t("¿Tengo | que | bloquear | mis | tarjetas?", "Do I have | to | block | my | cards?", "Should I block my cards?") },
    ] },
    found: { lt: "Say whether it's yours", slot: "item", examples: ["wallet"], items: [
      { id: "its_mine", s: t("¡Sí, | es | {mío@X}!", "Yes, | it's | mine!", "Yes, that's mine!") },
      { id: "not_mine", s: t("No, | no es | {mío@X}.", "No, | it's not | mine.", "No, that's not mine.") },
      { id: "not_mine2", s: t("No, | {el@X} | {mío@X} | es | café.", "No, | — | mine | is | brown.", "No, mine is brown.",
        { flags: { 1: "la mía / el mío: mine; Spanish puts the article before it." } }) },
    ] },
    all_there: { lt: "Say whether everything's there", items: [
      { id: "all_there", s: t("Sí, | está | todo.", "Yes, | is-here | everything.", "Yes, everything's here.") },
      { id: "missing_some", s: t("Falta | el | dinero.", "Is missing | the | money.", "The money's missing.") },
    ] },
    thanks: { lt: "Say thank you and goodbye", items: [
      { id: "thats_all", s: t("No, | es | todo, | gracias.", "No, | it's | all, | thanks.", "No, that's all, thanks.") },
      { id: "thanks_officer", s: t("Usted | fue | muy | amable.", "You | were | very | kind.", "You've been very kind.") },
      { id: "thats_all", s: t("No, | gracias. | ¡Hasta luego!", "No, | thanks. | See you later!", "No, thanks. Bye!") },
    ] },
    mp: { lt: "Ask about the Ministerio Público", items: [
      { id: "mp_where", s: t("¿Dónde | está | el | Ministerio Público?", "Where | is | the | prosecutor's office?", "Where's the Ministerio Público?", { flags: { 3: F_MP } }) },
      { id: "mp_bring", s: t("¿Qué | tengo | que | llevar?", "What | do I have | to | bring?", "What do I need to bring?") },
      { id: "mp_ok", s: t("Está bien, | voy | para allá.", "All right, | I'm going | there.", "Okay, I'll go there.") },
    ] },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a police officer, usted is more polite: ¿Me puede ayudar? (puedes is for friends).", better: "¿Me puede ayudar?" },
  },

  merges: {
    "qué se le ofrece": { reason: "lexical_expression", split: "qué → what + se → itself + le → to you + ofrece → offers is word salad; = what can I do for you.", minimal: "The four-word formula." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is literal but reads as a comparison; = roughly.", minimal: "Three words." },
    "lo antes posible": { reason: "lexical_expression", split: "lo → it + antes → before + posible → possible is word salad; = as soon as possible.", minimal: "Three words." },
    "cuanto antes": { reason: "lexical_expression", split: "cuanto → how much + antes → before misreads the phrase; = as soon as possible.", minimal: "Two words." },
    "se me perdió": { reason: "grammatical_fusion", split: "se → itself + me → on me + perdió → lost gives a false reflexive; = I lost (it got lost on me).", minimal: "The pronouns and verb." },
    "se me cayó": { reason: "grammatical_fusion", split: "se → itself + me → on me + cayó → fell gives a false reflexive; = I dropped it.", minimal: "The pronouns and verb." },
    "de atrás": { reason: "lexical_expression", split: "de → of + atrás → behind misreads the modifier; bolsillo de atrás = back pocket.", minimal: "Two words." },
    "de piel": { reason: "lexical_expression", split: "de → of + piel → skin describes the material: leather.", minimal: "Two words." },
    "de tela": { reason: "lexical_expression", split: "de → of + tela → fabric describes the material: fabric.", minimal: "Two words." },
    "algo de": { reason: "lexical_expression", split: "algo → something + de → of misreads the quantifier; = some.", minimal: "Two words." },
    "todavía no": { reason: "lexical_expression", split: "todavía → still + no → no misreads the answer: not yet.", minimal: "Two words." },
    "acaba de": { reason: "grammatical_fusion", split: "acaba → finishes + de → of misreads the recent past; acabar de + infinitive = has just.", minimal: "Two words; the infinitive stays outside." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways is word salad; = anyway.", minimal: "Three words." },
    "ministerio público": { reason: "lexical_expression", split: "ministerio → ministry + público → public misnames the institution: the public prosecutor's office.", minimal: "The two-word name." },
    "para allá": { reason: "lexical_expression", split: "para → for + allá → over there misreads the direction; = there (toward that place).", minimal: "Two words." },
    "en línea": { reason: "lexical_expression", split: "en → in + línea → line misreads the phrase; = online.", minimal: "Two words." },
    "en persona": { reason: "lexical_expression", split: "en → in + persona → person is literal but one adverb; = in person.", minimal: "Two words." },
    "tarjeta de crédito": { reason: "lexical_expression", split: "tarjeta → card + de → of + crédito → credit: one noun, credit card.", minimal: "The three-word noun." },
    "tarjeta de débito": { reason: "lexical_expression", split: "tarjeta → card + de → of + débito → debit: one noun, debit card.", minimal: "The three-word noun." },
    "tarjetas de crédito": { reason: "lexical_expression", split: "One noun: credit cards.", minimal: "The three-word noun." },
    "tarjetas de débito": { reason: "lexical_expression", split: "One noun: debit cards.", minimal: "The three-word noun." },
    "licencia de manejo": { reason: "lexical_expression", split: "licencia → license + de → of + manejo → driving: one noun, driver's license (Mexico).", minimal: "The three-word noun." },
    "tarjeta del seguro": { reason: "lexical_expression", split: "tarjeta → card + del → of the + seguro → insurance: one noun, insurance card.", minimal: "The three-word noun." },
    "credencial de estudiante": { reason: "lexical_expression", split: "credencial → card + de → of + estudiante → student: one noun, student ID.", minimal: "The three-word noun." },
    "lentes de sol": { reason: "lexical_expression", split: "lentes → lenses + de → of + sol → sun: one noun, sunglasses.", minimal: "The three-word noun." },
    "tarjeta de regalo": { reason: "lexical_expression", split: "tarjeta → card + de → of + regalo → gift: one noun, gift card.", minimal: "The three-word noun." },
    "por ejemplo": { reason: "lexical_expression", split: "por → by + ejemplo → example misreads the phrase: for example.", minimal: "Two words." },
    "se la": { reason: "grammatical_fusion", split: "se (= le, to/of you) + la (it): two object pronouns before the verb, glossed together.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say what happened", done: toldWhat },
    { lt: "Say where and when it happened", done: (c) => !!(c.s.place || c.s.placeSkipped) && !!(c.s.time || c.s.timeSkipped) },
    { lt: "Describe it", done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped) },
    { lt: "Say what was inside", optional: true, when: (c) => item(c) !== "phone",
      done: (c) => !!(c.s.contents || c.s.contentsSkipped) && (!c.s.needCash || c.s.cashAmount !== undefined || !!c.s.noCashAmount) && (!cardsQ(c) || !!c.s.bankDone) },
    { lt: "Say whether it's yours", optional: true, when: (c) => !!c.s.foundAsked, done: (c) => !!c.s.foundAsked && !!c.s.found },
    { lt: "Give your name", done: (c) => !!c.s.lastName && (!spellQ(c) || !!c.s.spelled) },
    { lt: "Give your phone number", optional: true, when: (c) => c.s.found !== "mine", done: (c) => !!c.s.phone },
  ],

  steps: [
    { id: "report", done: (c) => !!(c.s.item || c.s.theft),
      ask: (c) => c.say(c.s.problem ? "tell_me" : "ask_help"),
      expects: ["report", "problem"],
      suggest: [{ lt: "Report a stolen or lost wallet", hint: "report", options: "item" }] },
    { id: "what_item", when: (c) => !!c.s.theft && !c.s.item, done: (c) => !!c.s.item,
      // "Me robaron el pasaporte": what was it in?
      ask: (c) => { c.say(c.s.askedWhat ? "what_again" : c.s.contents?.length ? "ask_what_in" : c.s.vague ? "ask_what_vague" : "ask_what_stolen"); c.s.askedWhat = true; },
      expects: ["what_item_ctx", "report"],
      suggest: [{ lt: "Say what was stolen", hint: "what", options: "item" }] },
    { id: "stolen_q", when: (c) => !!c.s.item && c.s.kind === "unsure", done: (c) => c.s.kind !== "unsure",
      ask: (c) => c.say("ask_stolen_q", { X: item(c) }),
      expects: ["stolen_yes", "stolen_no", "sure_ctx", "maybe_ctx", "happened", "dont_remember"],
      suggest: [{ lt: "Say whether someone took it", hint: "stolen" }],
      yes: (c) => { c.s.kind = "stolen"; c.say("ack"); },
      no: (c) => { c.s.kind = "lost"; c.say("ack"); },
      help: (c) => { c.s.kind = "maybe"; c.say("ack"); } },
    { id: "happened", when: (c) => !!c.s.item && !!c.s.askHappened && c.s.kind !== "lost", done: (c) => !!c.s.happened,
      ask: (c) => c.say("ask_happened"),
      expects: ["happened", "where_when", "dont_remember"],
      suggest: [{ lt: "Say what happened", hint: "happened" }],
      help: (c) => { c.s.happened = true; c.say("no_worry"); } },
    { id: "where", when: (c) => !!c.s.item, done: (c) => !!c.s.place || !!c.s.placeSkipped,
      ask: (c) => { c.say(c.s.askedWhere ? "where_again" : "ask_where"); c.s.askedWhere = true; },
      expects: ["where_when", "where_ctx", "happened", "dont_remember"],
      suggest: [{ lt: "Say where it happened", hint: "where", options: "place" }],
      help: (c) => { c.s.placeSkipped = true; c.say("no_worry"); } },
    { id: "when", when: (c) => !!c.s.item, done: (c) => !!c.s.time || !!c.s.timeSkipped,
      ask: (c) => { c.say(c.s.askedWhen ? "when_again" : "ask_when"); c.s.askedWhen = true; },
      expects: ["where_when", "dont_remember"],
      suggest: [{ lt: "Say when it happened", hint: "when" }],
      help: (c) => { c.s.timeSkipped = true; c.say("no_worry"); } },
    { id: "describe", when: (c) => !!c.s.item, done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      ask: (c) => { c.say(c.s.askedDescribe ? "describe_again" : "ask_describe", { X: item(c) }); c.s.askedDescribe = true; },
      expects: ["describe", "dont_remember"],
      suggest: [{ lt: "Describe it", hint: "describe" }],
      help: (c) => { c.s.describeSkipped = true; c.say("ack"); } },
    { id: "contents", when: (c) => !!c.s.item && item(c) !== "phone", done: (c) => !!c.s.contents || !!c.s.contentsSkipped,
      ask: (c) => { c.say(c.s.askedContents ? "contents_again" : "ask_contents", { X: item(c) }); c.s.askedContents = true; },
      expects: ["contents", "no_cash", "dont_remember"],
      suggest: [{ lt: "Say what was inside", hint: "contents", options: "content" }],
      help: (c) => { c.s.contentsSkipped = true; c.say("no_worry"); } },
    { id: "cash_amount", when: (c) => !!c.s.needCash, done: (c) => c.s.cashAmount !== undefined || !!c.s.noCashAmount,
      ask: (c) => c.say("ask_cash"),
      expects: ["contents", "no_cash", "dont_remember"],
      suggest: [{ lt: "Say how much cash", hint: "cash" }],
      help: (c) => { c.s.noCashAmount = true; c.say("no_worry"); } },
    { id: "bank", when: cardsQ, done: (c) => !!c.s.bankDone,
      ask: (c) => c.say("ask_bank"),
      expects: ["cancel_cards", "bank_called", "bank_not_yet", "bank_called_ctx", "bank_not_yet_ctx"],
      suggest: [{ lt: "Say whether you've called your bank", hint: "bank" }],
      yes: (c) => { c.s.bankDone = true; c.say("bank_good"); },
      no: (c) => { c.s.bankDone = true; c.say("block_cards"); } },
    { id: "found", when: (c) => !!c.s.foundTwist && (!!c.s.contents || !!c.s.contentsSkipped || item(c) === "phone") && !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      done: (c) => !!c.s.found,
      ask: (c) => {
        if (c.s.foundAsked) { c.say("found_reask", { X: item(c) }); return; }
        c.s.foundAsked = true;
        c.twist("turned_in");
        c.say("found", { X: itemNp(c, c.s.foundColor ?? null) }); c.say("found_ask", { X: item(c) });
      },
      expects: ["its_mine", "not_mine", "not_mine_ctx", "unsure_mine_ctx", "sure_ctx"],
      suggest: [{ lt: "Say whether it's yours", hint: "found" }],
      // "No sé": "Revise bien, por favor."
      help: (c) => c.say("look_closely"),
      yes: (c) => police.handlers.its_mine(c, {}, { intent: "its_mine", slots: {}, tags: [] } as Segment),
      no: (c) => police.handlers.not_mine(c, {}, { intent: "not_mine", slots: {}, tags: [] } as Segment) },
    { id: "id_q", when: (c) => !!c.s.askId && !c.s.found && !!c.s.contents, done: (c) => !!c.s.idDone,
      // an ID that was in the wallet: "¿Trae alguna otra identificación?"
      ask: (c) => c.say(has(c, (e) => !!e.attrs?.id) ? "ask_id_other" : "ask_id"),
      expects: ["no_id", "no_id_ctx", "have_id", "have_id_ctx"],
      suggest: [{ lt: "Say whether you have ID", hint: "id", options: "item" }],
      yes: (c) => { c.s.idDone = true; c.say("id_thanks"); },
      no: (c) => { c.s.idDone = true; c.say("id_of_course"); } },
    { id: "name", when: (c) => !!c.s.item && (c.s.found === "mine" || !c.s.foundTwist || c.s.found === "no"), done: (c) => !!c.s.name,
      ask: (c) => {
        if (c.s.found === "mine") { c.say("found_verify"); return; }
        if (!c.s.detailsSaid) { c.s.detailsSaid = true; c.say("details"); }
        c.say("ask_name");
      },
      expects: ["name_ctx"],
      suggest: [{ lt: "Give your full name", hint: "name" }] },
    { id: "last_name", when: (c) => !!c.s.name && !c.s.lastName, done: (c) => !!c.s.lastName,
      ask: (c) => c.say("ask_last_name"),
      expects: ["name_ctx", "spell_ctx"],
      suggest: [{ lt: "Give your last name", hint: "last_name" }] },
    { id: "spell", when: (c) => !!c.s.lastName && spellQ(c), done: (c) => !!c.s.spelled,
      ask: (c) => c.say(c.s.spellAsked ? "spell_again" : "ask_spell"),
      expects: ["spell_ctx"],
      suggest: [{ lt: "Spell your last name", hint: "spell" }] },
    { id: "check_all", when: (c) => c.s.found === "mine" && !!c.s.name, done: (c) => !!c.s.checkedInside,
      // asked again: the short "¿falta algo o está todo?", not the hand-over again
      ask: (c) => { c.say(c.s.checkAsked ? "missing_which" : "found_match"); c.s.checkAsked = true; },
      expects: ["all_there", "all_there_ctx", "missing_some"],
      suggest: [{ lt: "Check it and say whether everything's there", hint: "all_there" }],
      help: (c) => c.say("look_closely"),
      yes: (c) => { c.s.checkedInside = true; c.say("lucky"); c.complete(); },
      no: (c) => { c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some"); } },
    { id: "phone", when: (c) => !!c.s.lastName && c.s.found !== "mine", done: (c) => !!c.s.phone,
      // the phone itself was stolen: another number (the hotel's) or none
      ask: (c) => { c.say(c.s.askedPhone ? "phone_again" : item(c) === "phone" || has(c, (e) => !!e.attrs?.phone) ? "ask_phone_other" : "ask_phone"); c.s.askedPhone = true; },
      expects: ["phone_ctx", "no_phone", "no_phone_ctx"],
      suggest: [{ lt: "Give your phone number", hint: "phone" }],
      // "No sé" / "No me acuerdo": no number to call
      help: (c) => { c.s.phone = "none"; once(c, "phone", "no_phone_ok"); } },
    { id: "sign", when: (c) => !!c.s.phone && !!c.s.askSign && c.s.found !== "mine", done: (c) => !!c.s.signed,
      ask: (c) => { c.say(c.s.signAsked ? "sign_remind" : "sign"); c.s.signAsked = true; },
      expects: ["sign_where", "pen", "signed", "signed_ctx", "sign_where_ctx", "fill_form", "no_sign_ctx"],
      suggest: [{ lt: "Sign the report (or ask where)", hint: "sign" }],
      yes: (c) => { c.s.signed = true; c.say("sign_ok"); },
      // "Todavía no" / "No quiero firmar": he explains, and asks again next turn
      no: (c) => { c.say("sign_need"); c.hold(); },
      // "No sé": where (it isn't a signature)
      help: (c) => c.say("sign_where") },
  ],

  init: (c) => {
    c.s.askHappened = c.chance(0.55);
    c.s.askSpell = c.chance(0.75);
    c.s.askSign = c.chance(0.5);
    c.s.askBank = c.chance(0.55);
    c.s.askId = c.chance(0.25);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.4);
    c.s.foundDifferent = c.chance(0.3) ? c.pick(["black", "red", "blue"]) : null;
    // The Ministerio Público: only after a theft, on a later visit, never with a turned-in wallet
    c.s.mpTwist = c.visits >= 1 && !c.s.foundTwist && c.chance(0.5);
  },

  start: (c) => {
    c.say("greet");
    c.hold();
  },

  handlers: {
    report(c, slots, seg) {
      if (!live(c)) return;
      const first = !c.s.item && !c.s.theft;
      // Later in the report a sentence like "Me robaron el celular" adds nothing new: the phone question takes it
      // as "no phone"; elsewhere he only acknowledges it.
      if (c.s.item) {
        if (c.step === "phone" && slots.item === "phone") { police.handlers.no_phone(c, slots, seg); return; }
        once(c, "rep", "ack");
        return;
      }
      if (slots.item) c.s.item = slots.item;
      if (slots.place) c.s.place = slots.place;
      const tags = seg.tags;
      if (tags.includes("theft") || tags.includes("vague")) c.s.theft = true;
      if (tags.includes("vague")) c.s.vague = true;
      if (tags.includes("lost")) c.s.kind = "lost";
      else if (tags.includes("stolen") || tags.includes("theft")) c.s.kind = "stolen";
      else if (tags.includes("unsure")) c.s.kind = "unsure";
      else if (tags.includes("vague")) c.s.kind = undefined;
      else c.s.kind = /\b(robaron|robo|robado|robada|asalt\w*|bolsearon)\b/.test(fold(c.heard)) ? "stolen" : "lost";
      if (first) once(c, "sorry", "sorry_hear");
    },
    problem(c) { if (!c.s.item && !c.s.theft) c.s.problem = true; },
    what_item_ctx(c, slots, seg) {
      if (!live(c)) return;
      if (seg.tags.includes("amb") && slots.neg && slots.neg !== slots.item) { c.say("which_one"); c.hold(); return; }
      if (slots.item) c.s.item = slots.item;
      if (slots.color && !c.s.color) c.s.color = slots.color;
      if (!c.s.kind) c.s.kind = c.s.vague ? "unsure" : "stolen";
    },
    happened(c, slots) {
      if (!live(c)) return;
      c.s.happened = true;
      if (slots.place) c.s.place = slots.place;
      const h = fold(c.heard);
      if (/\b(choco|empujo|empujon|acerco|abrieron|abrio|jalo|toco|robo|quito|saco)\b/.test(h)) c.s.kind = "stolen";
      // "Creo que se me cayó en el camión" after "Me robaron…": the learner now thinks it was lost
      else if (/\bse me (cayo|perdio)\b/.test(h)) c.s.kind = "lost";
      once(c, "happened", "ack");
    },
    where_when(c, slots) {
      if (!live(c)) return;
      // said out of turn (at the ID, the name or at the end: "Sí, en el hotel"): acknowledged, and the place and
      // time of the theft stay as they were
      if (c.step && !["report", "what_item", "stolen_q", "happened", "where", "when", "describe", "contents", "cash_amount", "bank"].includes(c.step)) { once(c, "ww", "ack"); return; }
      if (c.step === "happened") c.s.happened = true;
      if (slots.place) c.s.place = slots.place;
      // "En la calle 12" is a street, not twelve o'clock
      const tm = slots.whenp?.time;
      const streetNo = tm && !Array.isArray(tm) && tm.m === 0 && placeNumbers(c.heard).includes(tm.h) && !/\b(a las|a la|las|como a|eso de|hace)\b/.test(fold(c.heard));
      if (slots.whenp && !streetNo) c.s.time = true;
    },
    where_ctx(c, slots) {
      // "Es de cuero café": café is the color there, not the place
      if (slots.place === "cafe" && !/\b(el|un|al|del|en) cafe\b|cafeteria|ceiba/.test(fold(c.heard))) return;
      police.handlers.where_when(c, slots, { intent: "where_when", slots, tags: [] } as Segment);
    },
    dont_remember(c) { if (!live(c)) return; if (helpHere(c)) c.hold(); },
    maybe_ctx(c, slots, seg) { police.handlers.dont_remember(c, slots, seg); },
    describe(c, slots) {
      if (!live(c)) return;
      describeFrom(c, slots);
      if (!c.s.color && !c.s.material && !c.s.size) { c.s.describeSkipped = true; react(c, "describe", "ack"); return; }
      react(c, "describe", "describe_echo", { X: itemNp(c) });
      if (c.s.foundDifferent === c.s.color) c.s.foundDifferent = null;
      // a turned-in wallet of another color only makes sense when the learner named a color
      c.s.foundColor = c.s.color ? c.s.foundDifferent ?? c.s.color : null;
    },
    contents(c, slots, seg) {
      if (!live(c)) return;
      if (c.s.reportDone) { once(c, "late", "ack"); return; }
      const before = JSON.stringify([c.s.contents, c.s.cashAmount]);
      addContents(c, slots);
      // only a stray number, before he asks what was inside: nothing to note
      if (JSON.stringify([c.s.contents, c.s.cashAmount]) === before && !slots.neg && !["contents", "cash_amount"].includes(c.step ?? "")) return;
      // "No traía efectivo, solo mis tarjetas": the cash said with "no" is the no-cash answer
      if (([] as any[]).concat(slots.neg ?? []).some((n) => n?.content === "cash" || n?.__tags?.includes("cash"))) {
        c.s.noCashAmount = true; c.s.needCash = false;
        c.s.contents = ((c.s.contents || []) as string[]).filter((x) => x !== "cash");
      }
      if (seg.tags.includes("nothing") && !(c.s.contents || []).length) c.s.contentsSkipped = true;
      if (cashSays(c) && !turn(c).usd && c.step === "cash_amount") react(c, "contents", "cash_echo", { price: c.s.cashAmount });
      else react(c, "contents", "contents_ok");
      if (has(c, (e) => !!e.attrs?.passport) && !c.s.embassySaid) { c.s.embassySaid = true; react(c, "passport", "passport_embassy"); }
    },
    no_cash(c, slots) {
      if (!live(c)) return;
      if (c.s.reportDone) { once(c, "late", "ack"); return; }
      c.s.noCashAmount = true; c.s.needCash = false;
      addContents(c, slots);
      c.s.contents = ((c.s.contents || []) as string[]).filter((x) => x !== "cash");
      if (c.s.cashAmount !== undefined) c.s.cashAmount = undefined;
      if (!c.s.contents.length) c.s.contentsSkipped = true;
      react(c, "contents", "contents_ok");
    },
    stolen_yes(c) { if (!live(c)) return; c.s.kind = "stolen"; c.say("ack"); },
    sure_ctx(c, slots, seg) {
      if (c.step === "found") { police.handlers.its_mine(c, slots, seg); return; }
      police.handlers.stolen_yes(c, slots, seg);
    },
    stolen_no(c) {
      if (!live(c)) return;
      // "No, me la robaron" typed with its comma: no (it wasn't lost), they stole it. Said aloud it reads as "No me la
      // robaron" (the likelier answer to "¿Cree que se la robaron?"), so the comma decides only in typed text.
      const typedNo = /^\W*no\s*,/i.test(c.heard), rest = fold(c.heard).replace(/^\W*no\W+/, "");
      if (typedNo && /^(creo que )?(me (la|lo) robaron|alguien (me )?(la|lo) robo)\b/.test(rest)) { c.s.kind = "stolen"; c.say("ack"); return; }
      c.s.kind = "lost"; c.say("ack");
    },
    name_ctx(c, slots) {
      if (!live(c)) return;
      addName(c, slots.name);
      addName(c, slots.last);
    },
    spell_ctx(c, _slots, seg) {
      if (!live(c)) return;
      if (c.step === "last_name") c.s.lastName = true;
      // "Miller" said as a word reaches {letters} as one "joined" token: it's the last name, not a spelling. When he
      // asks for the spelling on this visit, only letters count: at "¿Y su apellido?" the spelling question comes next,
      // and at the spelling question itself he asks for it letter by letter.
      if (seg.tags.includes("joined") && spellQ(c)) {
        if (c.step === "spell") c.s.spellAsked = true;
        return;
      }
      c.s.spelled = true;
      once(c, "spell", "spell_ok");
    },
    phone_ctx(c) { if (!live(c)) return; c.s.phone = true; once(c, "phone", "phone_ok"); },
    no_phone(c, _slots, seg) {
      if (!live(c)) return;
      // "Mi celular estaba en la bolsa" before the phone question: the phone goes on the list (the phone question then
      // asks for another number)
      if (seg.tags.includes("stolen_phone") && c.step !== "phone" && !c.s.reportDone && c.s.item && item(c) !== "phone") {
        addContents(c, { ci: { content: "cellphone", __tags: [] } });
        react(c, "contents", "contents_ok");
        return;
      }
      c.s.phone = "none"; once(c, "phone", "no_phone_ok");
    },
    no_phone_ctx(c, slots, seg) { police.handlers.no_phone(c, slots, seg); },
    cancel_cards(c, _slots, seg) {
      if (!live(c)) return;
      c.s.bankDone = true;
      c.say(seg.tags.includes("done_cards") ? "cards_done" : "cards_yes");
    },
    // "Llame a su banco…" only for cards nobody has talked about (his own bank question comes later)
    what_now(c) { if (!live(c)) return; c.say(has(c, (e) => !!e.attrs?.cards) && !c.s.bankDone && !cardsQ(c) ? "what_now" : "will_call", { X: item(c) }); },
    how_long(c) { if (!live(c)) return; c.say("how_long"); },
    chances(c, _slots, seg) { if (!live(c)) return; c.say(seg.tags.includes("ifnot") ? "chances_not" : "chances"); },
    copy(c, _slots, seg) {
      if (!live(c)) return;
      const seguro = seg.tags.includes("seguro");
      // before the report is written: he hands it over with the folio
      if (!c.s.reportDone) { c.s.copyAsked = seguro ? "seguro" : c.s.copyAsked || "plain"; c.say("copy_later"); return; }
      giveCopy(c, seguro);
    },
    // a question about the denuncia, or one once the Ministerio Público has come up, is answered for both
    q_cost(c, _slots, seg) { if (!live(c)) return; c.say(seg.tags.includes("den") || c.s.mpSaid || c.s.mpInfo ? "cost_both" : "cost_ans"); },
    q_search(c) { if (!live(c)) return; c.say("search_ans"); },
    q_denuncia(c) {
      if (!live(c)) return;
      if (c.s.mpSaid || c.s.mpInfo) { c.say("mp_why_ans"); return; }
      c.s.mpInfo = true; c.say("q_denuncia_ans");
    },
    signed(c) { if (!live(c)) return; c.s.signed = true; c.say("sign_ok"); },
    signed_ctx(c, slots, seg) { police.handlers.signed(c, slots, seg); },
    no_sign_ctx(c) { if (!live(c)) return; c.say("sign_need"); c.hold(); },
    pen(c) { if (!live(c)) return; c.s.signed = true; c.say("pen"); },
    sign_where(c) { if (!live(c)) return; c.s.signed = true; c.say("sign_where"); },
    sign_where_ctx(c) { if (!live(c)) return; c.s.signed = true; c.say(/\b(aqui|aca)\b/.test(fold(c.heard)) ? "sign_where_yes" : "sign_where"); },
    fill_form(c) { if (!live(c)) return; c.say("form_yes"); },
    its_mine(c) {
      if (!live(c)) return;
      if (!c.s.foundAsked) { c.say("ack"); return; }
      if (c.s.color && c.s.foundColor && c.s.foundColor !== c.s.color && !c.s.sureAsked) {
        c.s.sureAsked = true;
        c.say("found_sure", { X: itemNp(c) });
        c.hold();
        return;
      }
      c.s.found = "mine";
      if (c.s.name) c.s.nameVerified = true;
    },
    not_mine(c, slots, seg) {
      if (!live(c)) return;
      if (!c.s.foundAsked) { c.say("ack"); return; }
      // "Sí, la mía es negra" about the black one he holds is a yes: with no "no" said, a description that matches the
      // wallet turned in (and nothing in it that doesn't) is theirs; "Sí, …" with nothing against it too
      if (!/\bno\b/.test(fold(c.heard))) {
        let same = false, other = false;
        const was: Record<string, any> = { color: c.s.foundColor, material: c.s.material, size: c.s.size };
        for (const p of ([] as any[]).concat(slots.dp ?? [])) for (const k of ["color", "material", "size"]) {
          if (!p?.[k] || !was[k]) continue;
          if (p[k] === was[k]) same = true; else other = true;
        }
        if (!other && (same || /^\W*si\b/.test(fold(c.heard)))) { police.handlers.its_mine(c, {}, seg); return; }
      }
      describeFrom(c, slots);
      c.s.found = "no";
      c.s.detailsSaid = true;
      c.say("not_yours");
    },
    not_mine_ctx(c, slots, seg) { police.handlers.not_mine(c, slots, seg); },
    unsure_mine_ctx(c) { if (!live(c)) return; c.say("look_closely"); c.hold(); },
    all_there(c, slots, seg) {
      if (!live(c)) return;
      if (c.s.found !== "mine" || !c.s.lastName) { c.say("ack"); return; }
      // "Está todo menos los trescientos pesos", "Todo bien, pero falta mi licencia": something is missing
      const h = fold(c.heard);
      if (/\b(menos|excepto|salvo)\b/.test(h) || (/\bfaltan?\b/.test(h) && !/\bno (me )?faltan?\b/.test(h))) { police.handlers.missing_some(c, slots, seg); return; }
      c.s.checkedInside = true; c.say("lucky"); c.complete();
    },
    all_there_ctx(c, slots, seg) { police.handlers.all_there(c, slots, seg); },
    missing_some(c, slots, seg) {
      if (!live(c)) return;
      if (c.s.found !== "mine" || !c.s.lastName) { c.say("ack"); return; }
      // Said aloud, "No falta el dinero" is also "No, falta el dinero", and "No está todo" / "No todo está bien" are also
      // "No, está todo" / "No, todo está bien" (rule 10): one reading is "all there", the other "missing". Typed with
      // its comma the "No," is its own answer; without, he asks.
      const h = fold(c.heard), typedNo = /^\W*no\s*,/i.test(c.heard);
      if (/^no (falta|esta todo|todo)\b/.test(h.replace(/^\W+/, "").replace(/,/g, ""))) {
        if (!typedNo) { c.say("missing_which"); c.hold(); return; }
        if (!/^\W*no\s*,\s*(me\s+)?faltan?\b/i.test(fold(c.heard))) { c.s.checkedInside = true; c.say("lucky"); c.complete(); return; }
      }
      c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some");
    },
    bank_called(c) { if (!live(c)) return; c.s.bankDone = true; c.say("bank_good"); },
    bank_called_ctx(c, slots, seg) { police.handlers.bank_called(c, slots, seg); },
    bank_not_yet(c) { if (!live(c)) return; c.s.bankDone = true; c.say("block_cards"); },
    bank_not_yet_ctx(c, slots, seg) { police.handlers.bank_not_yet(c, slots, seg); },
    no_id(c) {
      if (!live(c)) return;
      if (c.step !== "id_q") { c.say("ack"); return; }
      turn(c).noId = true;
      if (turn(c).haveId) return;
      c.s.idDone = true; c.say("id_of_course");
    },
    no_id_ctx(c, slots, seg) { police.handlers.no_id(c, slots, seg); },
    have_id(c) {
      if (!live(c)) return;
      if (c.step !== "id_q") { c.say("ack"); return; }
      if (turn(c).noId) return;
      turn(c).haveId = true; c.s.idDone = true; c.say("id_thanks");
    },
    have_id_ctx(c, slots, seg) { police.handlers.have_id(c, slots, seg); },
    thanks_officer(c) { if (!live(c)) return; c.say("welcome"); },
    // "No, nada" at "Revise que esté todo" could be either answer: he asks
    thats_all(c) { if (!live(c)) return; if (c.step === "check_all") { c.say("missing_which"); c.hold(); return; } c.say("ack"); },
    one_question_ctx(c) { if (!live(c)) return; c.say("ask_away"); },
    // asking about the Ministerio Público opens its follow-ups ("¿Dónde queda?") at "¿Algo más?"
    mp_where(c) { if (!live(c)) return; c.s.mpInfo = true; c.say(c.s.reportDone ? "mp_where_ans" : "mp_where_early"); },
    mp_where_ctx(c, slots, seg) { police.handlers.mp_where(c, slots, seg); },
    mp_bring(c) { if (!live(c)) return; c.s.mpInfo = true; c.say("mp_bring_ans"); },
    mp_today(c, _slots, seg) { if (!live(c)) return; c.say(seg.tags.includes("hours") ? "mp_hours_ans" : "mp_today_ans"); },
    mp_online(c) { if (!live(c)) return; c.say("mp_online_ans"); },
    mp_why(c) { if (!live(c)) return; c.say("mp_why_ans"); },
    mp_ok(c) { if (!live(c)) return; c.say("mp_good"); },
    g_bye(c) { bye(c); },
  },

  finish: (c) => {
    flush(c);
    c.s.reportDone = true;
    if (c.s.found === "mine") {
      c.complete();
    } else {
      c.say("case_number");
      if (c.s.copyAsked) giveCopy(c, c.s.copyAsked === "seguro");
      if (c.s.mpTwist && c.s.kind === "stolen" && !c.s.mpInfo) {
        c.s.mpSaid = true;
        c.twist("ministerio");
        c.say("mp_send"); c.say("mp_send2");
      } else c.say(c.s.found === "partial" ? "will_call_partial" : "will_call", { X: item(c) });
      c.complete();
    }
    c.say("anything_else");
    c.expect(anythingElse(c));
  },

  tests: [
    // Every hint construction
    { say: "Quiero levantar una denuncia.", intent: "report" },
    { say: "Quiero reportar un robo.", intent: "report" },
    { say: "Quiero reportar el robo de mi cartera.", intent: "report", slots: { item: "wallet" } },
    { say: "Me robaron la cartera.", intent: "report", slots: { item: "wallet" } },
    { say: "Alguien me robó el celular.", intent: "report", slots: { item: "phone" } },
    { say: "Perdí mi mochila.", intent: "report", slots: { item: "backpack" } },
    { say: "Se me perdió la cartera.", intent: "report" },
    { say: "No encuentro mi cartera.", intent: "report" },
    { say: "Mi cartera.", intent: "what_item_ctx", step: "what_item", slots: { item: "wallet" } },
    { say: "Sí, creo que fue un robo.", intent: "stolen_yes", step: "stolen_q" },
    { say: "No, creo que se me cayó.", intent: "stolen_no", step: "stolen_q", not: ["stolen_yes"] },
    { say: "Estaba en el mercado.", intent: "happened", step: "happened" },
    { say: "Cuando quise pagar, ya no estaba.", intent: "happened", step: "happened" },
    { say: "Alguien chocó conmigo.", intent: "happened", step: "happened" },
    { say: "Estaba en mi bolsillo de atrás.", intent: "happened", step: "happened" },
    { say: "En el mercado.", intent: "where_when", step: "where", slots: { place: "market" } },
    { say: "Cerca del zócalo.", intent: "where_when", step: "where", slots: { place: "square" } },
    { say: "En el autobús.", intent: "where_when", step: "where", slots: { place: "bus" } },
    { say: "Como a las once.", intent: "where_when", step: "when" },
    { say: "Hace una hora.", intent: "where_when", step: "when" },
    { say: "En el mercado, como a las once.", intent: "where_when", step: "where", slots: { place: "market" } },
    { say: "Es café, de piel y chica.", intent: "describe", step: "describe" },
    { say: "Es una cartera negra de piel.", intent: "describe", step: "describe" },
    { say: "Mis tarjetas y algo de efectivo.", intent: "contents", step: "contents" },
    { say: "Traía mi licencia de manejo.", intent: "contents", step: "contents" },
    { say: "Como 500 pesos.", intent: "contents", step: "cash_amount" },
    { say: "No traía efectivo.", intent: "no_cash", step: "contents", not: ["contents"] },
    { say: "Sí, ya llamé.", intent: "bank_called", step: "bank" },
    { say: "No, todavía no.", intent: "bank_not_yet_ctx", step: "bank", not: ["bank_called"] },
    { say: "¿Tengo que bloquear mis tarjetas?", intent: "cancel_cards" },
    { say: "No, estaba en mi cartera.", intent: "no_id", step: "id_q", not: ["have_id"] },
    { say: "Sí, traigo mi pasaporte.", intent: "have_id", step: "id_q" },
    { say: "Me llamo Ryan Miller.", intent: "name_ctx", step: "name" },
    { say: "Mi apellido es Miller.", intent: "name_ctx", step: "last_name" },
    { say: "Se escribe eme, i, ele, ele, e, erre.", intent: "spell_ctx", step: "spell" },
    { say: "Mi número es el 984 123 4567.", intent: "phone_ctx", step: "phone" },
    { say: "No tengo número mexicano.", intent: "no_phone", step: "phone", not: ["phone_ctx"] },
    { say: "¿Dónde firmo?", intent: "sign_where", step: "sign" },
    { say: "¿Me presta una pluma?", intent: "pen", step: "sign" },
    { say: "¿Me presta un bolígrafo?", intent: "pen", step: "sign" },
    { say: "¿Qué hago ahora?", intent: "what_now" },
    { say: "¿Cuánto tiempo tarda?", intent: "how_long" },
    { say: "¿Me da una copia para el seguro?", intent: "copy" },
    { say: "¿Esto es una denuncia?", intent: "q_denuncia" },
    { say: "¡Sí, es mía!", intent: "its_mine", step: "found" },
    { say: "No, no es mía.", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "No, la mía es café.", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "Sí, está todo.", intent: "all_there_ctx", step: "check_all" },
    { say: "No, falta el dinero.", intent: "missing_some", step: "check_all", not: ["all_there"] },
    { say: "No, es todo, gracias.", intent: "thats_all" },
    { say: "Usted fue muy amable.", intent: "thanks_officer" },
    { say: "¿Dónde está el Ministerio Público?", intent: "mp_where" },
    { say: "¿Qué tengo que llevar?", intent: "mp_bring" },
    // Natural alternatives, short answers, tú to staff, no accents
    { say: "Me asaltaron", intent: "report" },
    { say: "Un hombre me sacó la cartera de la bolsa", intent: "report", slots: { item: "wallet" } },
    { say: "Me robaron la cartera en el mercado", intent: "report", slots: { item: "wallet", place: "market" } },
    { say: "Tengo un problema", intent: "problem" },
    { say: "¿Puedes ayudarme?", intent: "problem" },
    { say: "Mi billetera", intent: "what_item_ctx", step: "what_item", slots: { item: "wallet" } },
    { say: "Un hombre me empujó y se llevó mi cartera", intent: "happened", step: "happened" },
    { say: "Estaba en el camión y había mucha gente", intent: "happened", step: "happened" },
    { say: "Hace como media hora", intent: "where_when", step: "when" },
    { say: "Ayer en la noche", intent: "where_when", step: "when" },
    { say: "No me acuerdo", intent: "dont_remember", step: "where" },
    { say: "Negra y chiquita", intent: "describe", step: "describe" },
    { say: "Es un iPhone negro con una funda azul", intent: "describe", step: "describe" },
    { say: "Mi tarjeta de credito y mi licencia", intent: "contents", step: "contents" },
    { say: "Unos quinientos", intent: "contents", step: "cash_amount" },
    { say: "No, ahorita llamo", intent: "bank_not_yet_ctx", step: "bank" },
    { say: "Ya las bloqueé en la aplicación", intent: "bank_called", step: "bank" },
    { say: "Aquí tiene", intent: "have_id_ctx", step: "id_q" },
    { say: "Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "eme i ele ele e erre", intent: "spell_ctx", step: "spell" },
    { say: "984 123 4567", intent: "phone_ctx", step: "phone" },
    { say: "Me robaron el celular también", intent: "no_phone", step: "phone", not: ["phone_ctx"] },
    { say: "¿Aquí?", intent: "sign_where_ctx", step: "sign" },
    { say: "¿Cree que la encuentren?", intent: "chances" },
    { say: "¿Me das una copia del reporte?", intent: "copy" },
    { say: "¿Necesito una denuncia para el seguro?", intent: "q_denuncia" },
    { say: "Alguien se llevó mi cartera", intent: "report", slots: { item: "wallet" }, not: ["its_mine", "stolen_yes"] },
    { say: "Me robaron todo", intent: "report", not: ["thats_all", "all_there"] },
    { say: "¿Tengo que pagar algo?", intent: "q_cost" },
    { say: "Sí, estoy seguro", intent: "sure_ctx", step: "found", not: ["stolen_yes"] },
    { say: "¿Y si no la encuentran?", intent: "chances" },
    { say: "¿Me pueden ayudar a buscarla?", intent: "q_search" },
    { say: "En la parada del camión", intent: "where_when", step: "where", slots: { place: "bus_stop" } },
    { say: "Iba caminando por el malecón y alguien me empujó", intent: "happened", step: "happened" },
    // Spain forms are correct answers
    { say: "Me han robado el móvil", intent: "report", slots: { item: "phone" } },
    { say: "Mi carné de conducir", intent: "contents", step: "contents" },
    { say: "Mi móvil es el 984 123 4567", intent: "phone_ctx", step: "phone" },
    { say: "Vale, ¿dónde firmo?", intent: "sign_where", step: "sign" },
    // Meaning safety: no theft, place, cash, call, ID, wallet or signature from a negation
    { say: "No me la robaron, la perdí", intent: "stolen_no", step: "stolen_q", not: ["stolen_yes"] },
    { say: "No creo que me la hayan robado", intent: "stolen_no", step: "stolen_q", not: ["stolen_yes"] },
    { say: "No me robaron la cartera, la perdí", intent: "report", not: ["stolen_yes"] },
    { say: "No fue en el mercado, fue en el café", intent: "where_when", step: "where", slots: { place: "cafe" } },
    { say: "No es negra, es café", intent: "describe", step: "describe", slots: { dp: { color: "brown" } } },
    { say: "No es grande, es chica", intent: "describe", step: "describe", slots: { dp: { size: "small" } } },
    { say: "No había nada de dinero", intent: "no_cash", step: "contents", not: ["contents"] },
    { say: "No he llamado al banco", intent: "bank_not_yet", step: "bank", not: ["bank_called"] },
    { say: "Todavía no las bloqueo", intent: "bank_not_yet", step: "bank", not: ["bank_called"] },
    { say: "Esa no es mi cartera", intent: "not_mine_ctx", step: "found", not: ["its_mine"] },
    { say: "No traigo mi pasaporte", intent: "no_id", step: "id_q", not: ["have_id", "have_id_ctx"] },
    { say: "No tengo teléfono", intent: "no_phone", step: "phone", not: ["phone_ctx"] },
    { say: "No falta nada", intent: "all_there", step: "check_all", not: ["missing_some"] },
    { say: "Mis tarjetas no están", intent: "missing_some", step: "check_all", not: ["all_there"] },
    { say: "No en el mercado, en la playa", intent: "where_when", step: "where", slots: { place: "beach" } },
    { say: "Tengo mi pasaporte en el hotel", intent: "no_id", step: "id_q", not: ["have_id", "have_id_ctx"] },
    { say: "Mis tarjetas no, solo dinero", intent: "contents", step: "contents", slots: { ci: { content: "cash" }, neg: { content: "cards" } } },
    { say: "No quiero firmar todavía", intent: "no_sign_ctx", step: "sign", not: ["signed", "signed_ctx"] },
    { say: "Mi cartera fue robada", intent: "report", not: ["describe"] },
    { say: "No sé si es mía", intent: "unsure_mine_ctx", step: "found", not: ["its_mine"] },
    { say: "No es mi cartera, es mi celular", intent: "what_item_ctx", step: "what_item", slots: { item: "phone" } },
    { say: "No, esa cartera no es mía", intent: "not_mine_ctx", step: "found", not: ["its_mine"] },
    { say: "No quiero levantar una denuncia", intent: "none" },
    { say: "No fue en el mercado", intent: "none", step: "where" },
    { say: "No es negra", intent: "none", step: "describe" },
    { say: "No necesito una copia", intent: "none" },
    { say: "Mi pasaporte no estaba ahí", intent: "none", step: "contents" },
    // Review (blind set and probes): traps and gaps
    { say: "No sé, a lo mejor se me cayó", intent: "stolen_no", step: "stolen_q", not: ["stolen_yes"] },
    { say: "No sé si me la robaron o la perdí", intent: "report", not: ["stolen_yes", "stolen_no"] },
    { say: "Un señor se me acercó y me empujó, y luego ya no la tenía", intent: "happened", step: "happened" },
    { say: "No estaba en el mercado, estaba en la playa", intent: "happened", step: "happened", slots: { place: "beach" } },
    { say: "Todavía no he llamado al banco", intent: "bank_not_yet", step: "bank", not: ["bank_called"] },
    { say: "No tenía tarjetas, solo efectivo", intent: "contents", step: "contents", slots: { ci: { content: "cash" }, neg: { content: "cards" } } },
    { say: "Ropa y mi celular", intent: "contents", step: "contents" },
    { say: "No estoy seguro, ¿puedo verla?", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "not_mine"] },
    { say: "Mi pasaporte no, lo dejé en el hotel", intent: "no_id", step: "id_q", not: ["have_id", "have_id_ctx"] },
    { say: "Sí, en el hotel", intent: "no_id_ctx", step: "id_q", not: ["have_id", "have_id_ctx", "where_when"] },
    { say: "Las tarjetas sí, pero el dinero no", intent: "missing_some", step: "check_all", not: ["all_there", "all_there_ctx"] },
    { say: "No, no tengo otro", intent: "no_phone_ctx", step: "phone", not: ["phone_ctx"] },
    { say: "¿Y si no firmo?", intent: "no_sign_ctx", step: "sign", not: ["signed", "signed_ctx"] },
    { say: "Un momento, lo voy a leer", intent: "no_sign_ctx", step: "sign", not: ["signed", "signed_ctx"] },
    { say: "¿Es gratis el reporte?", intent: "q_cost" },
    { say: "¿A qué hora abren?", intent: "mp_today" },
    { say: "¿Por qué no puedo levantarla aquí?", intent: "mp_why" },
    // Lead's check: a bare answer belongs to its own question; negated contents; counts and amounts
    { say: "No, no tengo otra", intent: "no_id_ctx", step: "id_q", not: ["no_phone", "no_phone_ctx", "have_id"] },
    { say: "Se me olvidó en el hotel", intent: "no_id_ctx", step: "id_q", not: ["bank_not_yet", "bank_not_yet_ctx"] },
    { say: "Ya lo hice", intent: "signed_ctx", step: "sign", not: ["bank_called", "bank_called_ctx"] },
    { say: "Ya lo hice", intent: "bank_called_ctx", step: "bank" },
    { say: "Sí, seguro", intent: "sure_ctx", step: "found", not: ["stolen_yes", "not_mine"] },
    { say: "¿Tengo que firmar?", intent: "no_sign_ctx", step: "sign", not: ["signed", "signed_ctx", "sign_where"] },
    { say: "Traía mis tarjetas pero no el pasaporte", intent: "contents", step: "contents", slots: { ci: { content: "cards" }, neg: { content: "passport" } } },
    { say: "El pasaporte no estaba, solo dinero", intent: "contents", step: "contents", slots: { ci: { content: "cash" }, neg: { content: "passport" } } },
    { say: "Solo dinero, el pasaporte lo dejé en el hotel", intent: "contents", step: "contents", slots: { ci: { content: "cash" }, neg: { content: "passport" } }, not: ["no_id"] },
    { say: "Mi celular, mi cartera y una toalla", intent: "contents", step: "contents", not: ["its_mine"] },
    { say: "Está todo menos los trescientos pesos", intent: "missing_some", step: "check_all", not: ["all_there", "all_there_ctx"] },
    { say: "Solo faltan doscientos pesos", intent: "missing_some", step: "check_all", slots: { ci: { price: 20000 } }, not: ["all_there"] },
    { say: "Dos billetes de quinientos", intent: "contents", step: "cash_amount", slots: { ci: { number: 2, price: 50000 } } },
    { say: "El del hotel es el 984 876 5432", intent: "phone_ctx", step: "phone", slots: { digits: "9848765432" } },
    { say: "No me lo sé de memoria", intent: "no_phone_ctx", step: "phone", not: ["phone_ctx"] },
    { say: "¿Cuánto cuesta la denuncia?", intent: "q_cost" },
    { say: "Tal vez", intent: "maybe_ctx", step: "stolen_q", not: ["stolen_yes", "stolen_no"] },
    { say: "Se parece a la mía", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "not_mine"] },
    { say: "¿Y si no aparece?", intent: "chances" },
    // Must not be understood
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
    { say: "bicicleta tortuga luna", intent: "none" },
  ],

  sims: [
    // The report sims go through the whole report: no turned-in wallet there; "found wallet" tests it.
    { name: "full report", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askSpell = true; },
      turns: ["Buenas tardes. Quiero reportar el robo de mi cartera.", "En el mercado, como a las once.", "Es café, de piel y chica.",
        "Mis tarjetas, mi licencia de manejo y como quinientos pesos en efectivo.", "Ryan Miller.", "eme, i, ele, ele, e, erre",
        "Es el 984 123 4567.", "No, es todo. Usted fue muy amable."],
      expect: { complete: true, state: { item: "wallet", kind: "stolen", place: "market", color: "brown", material: "leather", cashAmount: 50000, spelled: true } }, auto: AUTO },
    { name: "a denuncia, step by step", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = true; s.askSign = true; s.askBank = false; s.askId = false; },
      turns: ["Quiero levantar una denuncia.", "Mi cartera.", "Alguien chocó conmigo.", "En el mercado.", "Hace una hora.", "Negra y chica.",
        "Algo de efectivo y mi identificación.", "Como doscientos pesos.", "Me llamo Ryan.", "Miller.", "Es el 984 123 4567.", "¿Dónde firmo?", "Gracias, adiós."],
      expect: { complete: true, state: { kind: "stolen", happened: true, cashAmount: 20000, signed: true } }, auto: omit(["sign"]) },
    { name: "lost, questions and a change of mind", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askSpell = true; s.askBank = false; s.askId = false; },
      turns: ["Perdí mi cartera.", "Creo que se me cayó en el café.", "Esta mañana.", "¿Tengo que cancelar mis tarjetas?", "Es roja y chica.", "No es roja, es café.",
        "Solo mis tarjetas.", "Ryan Miller.", "eme i ele ele e erre", "984 123 4567", "¿Cuánto tiempo tarda?", "¿Me da una copia del reporte para el seguro?", "No, es todo, gracias."],
      expect: { complete: true, state: { kind: "lost", place: "cafe", color: "brown", bankDone: true } }, auto: omit(["describe"]) },
    // The last name said as a word is the name, not the spelling: the spelling question comes next, and a word there
    // gets "Perdón, letra por letra".
    { name: "last name as a word, then spelled", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askSpell = true; },
      turns: ["Perdí mi cartera.", "En el mercado, como a las once.", "Es negra y chica.", "Solo mis tarjetas.", "Mi nombre es Ryan.", "Miller.", "Miller.",
        "eme i ele ele e erre", "Es el 984 123 4567.", "No, es todo, gracias."],
      expect: { complete: true, state: { lastName: true, spellAsked: true, spelled: true } }, auto: AUTO },
    // twist on every seed: someone brings the wallet in during the report
    { name: "found wallet (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = null; },
      turns: ["Buenas tardes. Me robaron la cartera.", "En el zócalo, hace como media hora.", "Es café, de piel.", "Mis tarjetas y unos mil pesos.", "¡Sí, es mía!",
        "Ryan Miller.", "Sí, está todo.", "Muchas gracias, oficial."],
      expect: { complete: true, state: { found: "mine", checkedInside: true } }, auto: AUTO },
    { name: "found wallet of another color: not mine (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = "black"; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado.", "Hace un rato.", "Es café.", "Mis tarjetas.", "No, no es mía. La mía es café.", "Ryan Miller.", "Es el 984 123 4567.", "No, es todo, gracias."],
      expect: { complete: true, state: { found: "no", color: "brown" } }, auto: AUTO },
    { name: "found wallet of another color, but it is mine (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = "black"; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es café.", "Mis tarjetas.", "Sí, es mía.", "Sí, estoy seguro.", "Ryan Miller.", "Sí, no falta nada, gracias.", "No, gracias."],
      expect: { complete: true, state: { found: "mine", sureAsked: true, checkedInside: true } }, auto: AUTO },
    { name: "found wallet, but the money's gone (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = null; s.askSpell = true; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas y como trescientos pesos.", "Sí, es mía.", "Ryan Miller.", "No, falta el dinero.",
        "eme i ele ele e erre", "Es el 984 123 4567.", "Gracias, adiós."],
      expect: { complete: true, state: { found: "partial" } }, auto: AUTO },
    // the Ministerio Público twist, forced: a theft gets a police report and the advice to file a denuncia
    { name: "Ministerio Público (twist)", setup: (s) => { s.foundTwist = false; s.mpTwist = true; s.askSpell = true; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el zócalo, hace como media hora.", "Es negra, de piel.", "Mis tarjetas y unos mil pesos.", "Ryan Miller.", "eme i ele ele e erre",
        "Mi número es 984 123 4567.", "¿Dónde está el Ministerio Público?", "¿Qué tengo que llevar?", "Está bien, voy para allá.", "Muchas gracias, oficial."],
      expect: { complete: true, state: { mpSaid: true, kind: "stolen" } }, auto: AUTO },
    { name: "ID asked, bank not called yet", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askId = true; s.askBank = true; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas y mi pasaporte.", "No, todavía no.", "No, estaba en mi cartera.",
        "Ryan Miller.", "Es el 984 123 4567.", "No, es todo, gracias."],
      expect: { complete: true, state: { bankDone: true, idDone: true, embassySaid: true } }, auto: AUTO },
    { name: "short answers: the phone was stolen", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = false; },
      turns: ["Me robaron el celular.", "En el camión.", "Hace un rato.", "Negro.", "Ryan Miller.", "No tengo teléfono.", "Gracias."],
      expect: { complete: true, state: { item: "phone", place: "bus", color: "black", phone: "none" } }, auto: AUTO },
    // "No falta el dinero" said aloud is also "No, falta el dinero" (rule 10): he asks, and the answer counts
    { name: "found wallet: the lost comma at check_all (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = null; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas y como trescientos pesos.", "Sí, es mía.", "Ryan Miller.",
        "No falta el dinero", "Falta el dinero.", "Es el 984 123 4567.", "No, gracias."],
      expect: { complete: true, state: { found: "partial", checkedInside: true } }, auto: AUTO },
    // Answers said out of turn keep the report as it was: the time and place in the first sentence, café as a color,
    // "dos tarjetas" (not two pesos), "Sí, en el hotel" at the ID question, "una pregunta" at the end
    { name: "out-of-turn answers and a copy asked early", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = false; s.askId = true; s.askBank = false; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera hace una hora en el mercado.", "Es de cuero café.", "Tenía dos tarjetas y mi licencia.", "Sí, en el hotel.", "¿Me da una copia para el seguro?",
        "Ryan Miller.", "Es el 984 123 4567.", "No, solo una pregunta.", "¿Dónde queda el Ministerio Público?", "No, gracias."],
      expect: { complete: true, state: { place: "market", time: true, color: "brown", material: "leather", idDone: true, copyAsked: "seguro", mpInfo: true } }, auto: AUTO },
    // Lead's check: a bus route is no cash nor a time; "dos tarjetas" is a count, the $500 stays
    { name: "a bus route, and a count with the cash", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = false; s.askBank = false; s.askId = false; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el camión 25.", "Hace una hora.", "Es negra.", "Traía 500 pesos y dos tarjetas.", "Ryan Miller.", "Es el 984 123 4567.", "No, es todo, gracias."],
      expect: { complete: true, state: { place: "bus", time: true, cashAmount: 50000, contents: { 0: "cash", 1: "cards", length: 2 } } }, auto: AUTO },
    // the passport said with "no" is never written down (no consulate line); "No, no tengo otra" is no ID, not no phone
    { name: "not the passport, and no other ID", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = false; s.askBank = false; s.askId = true; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas y mi licencia, pero no el pasaporte.", "No, no tengo otra.", "Ryan Miller.", "Es el 984 123 4567.", "No, gracias."],
      expect: { complete: true, state: { idDone: true, phone: true, embassySaid: undefined, contents: { 0: "cards", 1: "license", length: 2 } } }, auto: AUTO },
    // "Sí, la mía es negra" about the black wallet he holds is a yes; "Está todo menos los trescientos pesos" is missing
    { name: "found wallet: same color, money missing (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = null; s.askHappened = false; s.askBank = false; s.askId = false; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas y como trescientos pesos.", "Sí, la mía es negra.", "Ryan Miller.",
        "Está todo menos los trescientos pesos.", "Es el 984 123 4567.", "No, gracias."],
      expect: { complete: true, state: { found: "partial", checkedInside: true } }, auto: AUTO },
    // "No todo está bien" said aloud is also "No, todo está bien" (rule 10): he asks
    { name: "found wallet: 'no todo está bien' aloud (twist)", setup: (s) => { s.foundTwist = true; s.mpTwist = false; s.foundDifferent = null; s.askHappened = false; s.askBank = false; s.askId = false; s.askSpell = false; s.askSign = false; },
      turns: ["Me robaron la cartera.", "En el mercado, como a las once.", "Es negra.", "Mis tarjetas.", "Sí, es mía.", "Ryan Miller.", "No todo está bien", "Sí, está todo.", "No, gracias."],
      expect: { complete: true, state: { found: "mine", checkedInside: true } }, auto: AUTO },
    { name: "can't find it: lost or stolen? and no cash", setup: (s) => { s.foundTwist = false; s.mpTwist = false; s.askHappened = false; s.askBank = false; s.askId = false; },
      turns: ["No encuentro mi cartera.", "No, creo que se me cayó.", "No me acuerdo.", "Esta mañana.", "Es azul.", "No traía efectivo, solo mis tarjetas.", "Ryan Miller.", "Es el 984 123 4567.", "No, nada más, gracias."],
      expect: { complete: true, state: { kind: "lost", placeSkipped: true, noCashAmount: true } }, auto: AUTO },
  ],
};

// Every step first says the reaction queued by the handlers of the learner's last answer.
police.steps = police.steps.map((st) => ({ ...st, ask: (c: Ctx) => { flush(c); st.ask(c); } }));

export default police;
