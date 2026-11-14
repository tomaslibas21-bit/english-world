// NEEDS: (slots.ts) {number} reads "diez mil" as 10 + "mil" (1000) while "dos mil" is 2000; the local `amount` slot
// reads it whole here.
// NEEDS: (lang.ts, optional) "traigo", "llevo", "traje" in PART_VERBS, so "No traigo fruta, | traigo chocolates" splits
// like "No tengo efectivo, | tengo tarjeta"; until then a whole pattern in declare_items reads it.
// Everything else (vocabulary, merges, the airline-code slot, the reference-number spelling) is local.
// Song 65 "Business or Pleasure?" (part 2) → Puerto Colibrí: "Mi maleta no llegó".
// Itzel at the baggage services desk of Puerto Colibrí's small airport (usted). The belt has stopped and the bag
// isn't there: she files a delayed-bag report (reporte de equipaje): the flight (a number, or letters and digits:
// "PC 482" = "pe, ce, cuatrocientos ochenta y dos"), the claim tag (comprobante / etiqueta, stuck to the boarding
// pass), a description of the bag (maleta, mochila, bolsa de viaje; color, size, rígida / de tela, "con ruedas",
// marks, brand), what's inside, delivery to the hotel (or "paso por ella"), an address in the Yucatán style
// ("calle Flamboyán 23, entre Hidalgo y Juárez"), a phone number (Mexicans read it in pairs), a courtesy kit, and the
// report number, which the learner can ask to spell or write down.
// Twist (visits ≥ 1): the bag is found in the system: it stayed in Cancún (or the connecting city) and comes tomorrow
// on the first flight.
// Customs at the end (the owner's choice, 2 Nov 2026: customs left the passport conversation s65a): after Itzel's
// goodbye the learner walks out with the carry-on past Agente Medina (`aduana`, usted): "¿Trae algo que declarar?",
// sometimes a food question, fruit and food from the plane, gifts and the 500-dollar allowance, and her questions
// (form, the red/green button, cash). Twist (visits ≥ 1): the SENASICA sniffer dog sits by the backpack, which has an
// apple or a ham sandwich from the plane; owning up hands it over, "No" gets the backpack checked.
// Research (2 Nov 2026), sources in docs/es/reviews/s65b-baggage.md: Cancún's terminals (T2 since 25 May 2024, T3 and T4
// earlier) and Tulum use ANAM's "Nuevo Modelo de Atención a Pasajeros Internacionales": a "Nada que declarar" lane and an
// "Auto declaración" lane where duties are paid, no D2 form and no red/green button (RGCE 3.2.6, Boletín 10/2024); the
// allowance is 500 US dollars besides personal luggage (air); cash over 10,000 dollars is declared. SENASICA bars fresh
// fruit and vegetables, fresh meat and sandwiches with meat or cheese; its dogs mark ("marcar") bags with fruit, apples,
// pork and beef, and sit when they find food. Taught only as far as the sources go: no fines, no figures beyond these.
// Every bag type is feminine (la maleta, la mochila, la bolsa), so Itzel says "la" for the bag and the colors and
// sizes are written in the feminine ("negra", "chica"); the masculine forms are accepted.
// Research (1 Nov 2026), kept vague where unsure: Mexican airlines file a delayed-bag report (PIR) at the baggage
// desk, give a report number ("folio"), deliver found bags to the hotel at no cost, and may reimburse essentials
// against receipts; no figures or legal limits are taught here. The flight code "PC" is invented, no real airline.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import type { SlotFn } from "@/convo/grammar";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS, GLOBAL_INTENTS } from "@/content/global";
import { lettersSlot, numberSlot } from "@/convo/slots";

/** A number of 10 or more ("el cuatrocientos ochenta y dos"), never a bare "una" or "dos". */
const bigNumber: SlotFn = (toks, pos, prefix) => numberSlot(toks, pos, prefix).filter((r) => !r.cost && typeof r.value === "number" && r.value >= 10);
/** An amount of money: a number, with "diez mil" read whole (the shared slot gives "diez" + "mil"). */
const amount: SlotFn = (toks, pos, prefix) => {
  const out = numberSlot(toks, pos, prefix).filter((r) => !r.cost);
  for (const r of [...out]) if (typeof r.value === "number" && r.value < 1000 && toks[r.end] === "mil") out.push({ ...r, end: r.end + 1, value: r.value * 1000 });
  return out;
};
/** Two words that are never an airline code. */
const CODE_STOP = new Set("de el la en es un mi su se te me lo le al no si ya yo tu ni da di va vi ha he os ok".split(" "));
/** An airline code before a flight number: two spelled letters ("pe ce", "a eme") or one short token ("pc", "y4"). */
const codeSlot: SlotFn = (toks, pos, prefix) => {
  const out = lettersSlot(toks, pos, prefix)
    .filter((r) => typeof r.value === "string" && r.value.length === 2 && !(r.tags || []).includes("joined"))
    .map((r) => ({ end: r.end, value: r.value, cost: 0 }));
  const w = toks[pos];
  if (w && /^([a-z]{2}|[a-z]\d|\d[a-z])$/.test(w) && !CODE_STOP.has(w)) out.push({ end: pos + 1, value: w, cost: 0.2 });
  return out;
};
/** A code and a number typed together: "pc482". */
const joinedFlight: SlotFn = (toks, pos) => {
  const w = toks[pos];
  return w && /^[a-z]{2}\d{2,4}$/.test(w) ? [{ end: pos + 1, value: w, cost: 0 }] : [];
};

// ---------------------------------------------------------------------------
// Entities (every bag type is feminine; colors, sizes and materials are written in the feminine)

const BAG_TYPES: EntityDef[] = [
  ent("suitcase", "maleta", "suitcase", "f", { pl: "maletas", ltPl: "suitcases", chip: "maleta",
    forms: ["maletas", "valija", "petaca", "maleta de viaje", "maleta con ruedas"] }),
  ent("backpack", "mochila", "backpack", "f", { pl: "mochilas", ltPl: "backpacks", chip: "mochila", forms: ["mochilas", "morral", "backpack"] }),
  ent("duffel", "bolsa | de | viaje", "bag | for | travel", "f", { pl: "bolsas | de | viaje", ltPl: "bags | for | travel", chip: "bolsa de viaje",
    forms: ["maleta deportiva", "maleta de lona", "bolso de viaje", "bolsa deportiva", "bolsa de lona", "duffel", "maletin de viaje"],
    attrs: { nat: "duffel bag", natPl: "duffel bags" } }),
  ent("bag", "bolsa", "bag", "f", { pl: "bolsas", ltPl: "bags", chip: "bolsa", forms: ["bolso", "bulto"], attrs: { generic: true } }),
];

/** A color in the feminine (it describes la maleta / la mochila / la bolsa); the masculine form is accepted too. */
const col = (id: string, es: string, en: string, forms: string[] = [], spain?: string) =>
  ent(id, es, en, "f", { chip: es, forms: [...(es.endsWith("a") && !["rosa", "naranja"].includes(es) ? [es.slice(0, -1) + "o"] : []), ...forms], ...(spain ? { attrs: { spain } } : {}) });
const COLORS: EntityDef[] = [
  col("black", "negra", "black"),
  col("blue", "azul", "blue", ["azul claro", "celeste", "azul cielo", "azulito"]),
  col("navy", "azul marino", "navy blue", ["azul oscuro", "marino", "azul fuerte"]),
  col("red", "roja", "red", ["rojo oscuro", "guinda", "vino", "color vino", "tinto", "roja oscura"]),
  col("green", "verde", "green", ["verde oscuro", "verde olivo", "verde militar", "verde claro"]),
  col("gray", "gris", "gray", ["gris oscuro", "gris claro", "gris plomo", "plomo"]),
  col("silver", "plateada", "silver", ["plata", "color plata"]),
  col("white", "blanca", "white"),
  col("yellow", "amarilla", "yellow"),
  col("orange", "naranja", "orange", ["anaranjada", "anaranjado"]),
  col("purple", "morada", "purple", ["violeta", "lila", "morado"]),
  col("pink", "rosa", "pink", ["rosada", "rosado", "rosa mexicano", "fucsia", "rosita"]),
  col("brown", "café", "brown", ["marron", "cafe oscuro", "cafe claro", "cafecita"], "marrón"), // Spain: marrón
  col("beige", "beige", "beige", ["beis", "crema", "color arena", "camel"]),
];

const SIZES: EntityDef[] = [
  ent("small", "chica", "small", "f", { chip: "chica", attrs: { spain: "pequeña" }, forms: ["chico", "pequena", "pequeno", "chiquita", "chiquito", "de mano", "de cabina", "chiquitita"] }),
  ent("medium", "mediana", "medium", "f", { chip: "mediana", forms: ["mediano", "normal", "regular", "estandar", "de tamano normal", "ni grande ni chica"] }),
  ent("large", "grande", "large", "f", { chip: "grande", forms: ["grandota", "grandote", "muy grande", "enorme", "extra grande", "gigante", "de las grandes"] }),
];

const MATERIALS: EntityDef[] = [
  ent("hard", "rígida", "hard-shell", "f", { chip: "rígida", forms: ["rigido", "dura", "duro", "de plastico", "de plastico duro", "de pasta", "de pasta dura",
    "de policarbonato", "de aluminio", "de metal", "plastico duro", "plastico", "de material duro"] }),
  ent("soft", "de tela", "soft-sided", "f", { chip: "de tela", forms: ["tela", "blanda", "blando", "suave", "de lona", "lona", "de nylon", "nylon", "de nailon",
    "flexible", "de tela suave", "de material suave"] }),
  ent("leather", "de piel", "leather", "f", { chip: "de piel", forms: ["piel", "de cuero", "cuero", "de piel genuina"] }),
];

const CITIES: EntityDef[] = [
  ent("cancun", "Cancún", "Cancún", "m", { forms: ["el aeropuerto de cancun"] }),
  ent("cdmx", "Ciudad de México", "Mexico City", "f", { forms: ["la ciudad de mexico", "cdmx", "el df", "df", "mexico", "la capital", "el aeropuerto de la ciudad de mexico"] }),
  ent("monterrey", "Monterrey", "Monterrey", "m"),
  ent("guadalajara", "Guadalajara", "Guadalajara", "f"),
  ent("merida", "Mérida", "Mérida", "f"),
  ent("houston", "Houston", "Houston", "m"),
  ent("dallas", "Dallas", "Dallas", "m"),
  ent("chicago", "Chicago", "Chicago", "m"),
  ent("new_york", "Nueva York", "New York", "f", { forms: ["new york", "nueva yor", "nueva york city"] }),
  ent("los_angeles", "Los Ángeles", "Los Angeles", "m", { forms: ["los angeles"] }),
  ent("miami", "Miami", "Miami", "m"),
  ent("atlanta", "Atlanta", "Atlanta", "f"),
  ent("toronto", "Toronto", "Toronto", "m"),
  ent("montreal", "Montreal", "Montreal", "m"),
  ent("vancouver", "Vancouver", "Vancouver", "m"),
  ent("london", "Londres", "London", "m", { forms: ["london"] }),
  ent("madrid", "Madrid", "Madrid", "m"),
];

// Customs (Agente Medina, after the baggage desk): what the learner may bring. `bad`: SENASICA's list of what a
// traveler may not bring in (fresh fruit and vegetables, fresh meat, sandwiches with meat or cheese); everything else
// is only "declared and checked" (no rule taught for it).
const GOODS: EntityDef[] = [
  ent("apple", "manzana", "apple", "f", { pl: "manzanas", ltPl: "apples", chip: "manzana", forms: ["manzanas", "manzanita", "manzana verde", "manzana roja"], attrs: { bad: "fruit" } }),
  ent("banana", "plátano", "banana", "m", { pl: "plátanos", ltPl: "bananas", chip: "plátano", forms: ["platanos", "banana", "bananas", "banano", "guineo"], attrs: { bad: "fruit" } }),
  ent("orange", "naranja", "orange", "f", { pl: "naranjas", ltPl: "oranges", chip: "naranja", forms: ["naranjas", "mandarina", "mandarinas"], attrs: { bad: "fruit" } }),
  ent("mango", "mango", "mango", "m", { pl: "mangos", ltPl: "mangoes", chip: "mango", forms: ["mangos"], attrs: { bad: "fruit" } }),
  ent("fruit", "fruta", "fruit", "f", { art: "", pl: "frutas", ltPl: "fruit", chip: "fruta", forms: ["frutas", "fruta fresca", "fruta picada", "frutita", "uvas", "fresas"], attrs: { bad: "fruit" } }),
  ent("vegetables", "verdura", "vegetables", "f", { art: "", pl: "verduras", ltPl: "vegetables", chip: "verdura", forms: ["verduras", "vegetales", "zanahorias", "jitomates", "tomates"], attrs: { bad: "fruit" } }),
  ent("sandwich", "sándwich", "sandwich", "m", { pl: "sándwiches", ltPl: "sandwiches", chip: "sándwich", forms: ["sandwich", "sandwiches", "sanduche", "bocadillo", "bocadillos", "bocadillo de jamon", "sandwich de jamon",
    "sandwich de queso", "sandwich de pavo", "sandwich de jamon y queso", "torta", "una torta", "emparedado", "bocadillo"], attrs: { bad: "sandwich" } }),
  ent("meat", "carne", "meat", "f", { art: "", chip: "carne", forms: ["carne fresca", "carne cruda", "bistec", "bistecs", "pollo crudo"], attrs: { bad: "meat" } }),
  // SENASICA bars cured or dried pork only from some countries and fresh cheese only: its inspectors look at them
  ent("cured", "jamón", "ham", "m", { art: "", chip: "jamón", forms: ["jamon", "salami", "chorizo", "salchichas", "embutidos", "carne seca", "tocino", "cecina", "jerky", "beef jerky"], attrs: { inspect: true } }),
  ent("cheese", "queso", "cheese", "m", { art: "", pl: "quesos", ltPl: "cheeses", chip: "queso", forms: ["quesos"], attrs: { inspect: true } }),
  ent("chocolate", "chocolate", "chocolate", "m", { art: "", pl: "chocolates", ltPl: "chocolates", chip: "chocolate", forms: ["chocolates", "barra de chocolate", "barras de chocolate"] }),
  ent("cookies", "galleta", "cookie", "f", { pl: "galletas", ltPl: "cookies", chip: "galletas", forms: ["galletas", "galletitas"] }),
  ent("packaged", "algo empacado", "something packaged", "m", { art: "", chip: "algo empacado", attrs: { spain: "algo envasado" }, forms: ["algo empacado", "comida empacada", "algo envasado", "comida envasada", "algo sellado", "algo cerrado", "papitas", "papas fritas", "cacahuates", "nueces", "almendras", "barritas", "barras de granola", "una barra de granola", "pretzels", "galletas saladas"] }),
  ent("candy", "dulce", "candy", "m", { pl: "dulces", ltPl: "candies", chip: "dulces", attrs: { spain: "caramelo", spainPl: "caramelos" }, forms: ["dulces", "caramelos", "golosinas", "chicles", "chicle", "paletas"] }),
  ent("gifts", "regalo", "gift", "m", { pl: "regalos", ltPl: "gifts", chip: "regalos", forms: ["regalos", "recuerdos", "souvenirs", "regalitos"], attrs: { gift: true } }),
  ent("food", "comida", "food", "f", { art: "", chip: "comida", forms: ["algo de comer", "alimentos", "un snack", "snacks", "botana", "botanas"], attrs: { generic: true } }),
];
const goodById = (id?: string) => GOODS.find((g) => g.id === id);

const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

const BRANDS = ["samsonite", "american tourister", "delsey", "travelpro", "rimowa", "tumi", "swiss gear", "swissgear", "victorinox", "nike",
  "adidas", "puma", "under armour", "the north face", "north face", "jansport", "totto", "kipling", "herschel", "high sierra", "wenger",
  "calvin klein", "tommy hilfiger", "guess", "lacoste", "away", "osprey", "eastpak", "ferrari", "polo"].map((b) => L(b.replace(/ /g, "_"), [b]));
BRANDS.push(L("samsonite", ["samsonait", "samsonay", "sam sonite", "samsonit"]));

const AIRLINES = [L("airline", ["aeromexico", "volaris", "viva", "vivaaerobus", "viva aerobus", "american", "american airlines", "united", "delta",
  "air canada", "westjet", "southwest", "jetblue", "spirit", "british airways", "iberia", "la aerolinea"])];

const CONTENTS = [
  L("clothes", ["ropa", "mi ropa", "camisas", "playeras", "camisetas", "pantalones", "vestidos", "un vestido", "cosas personales", "mis cosas",
    "articulos personales", "chamarra", "una chamarra", "chaqueta", "sueteres", "un sueter", "calcetines", "ropa interior", "un traje", "trajes",
    "traje de bano", "mi traje de bano", "trajes de bano", "shorts", "pijama", "ropa de playa", "cosas"]),
  L("shoes", ["zapatos", "mis zapatos", "tenis", "sandalias", "huaraches", "botas", "chanclas"]),
  L("gifts", ["regalos", "recuerdos", "souvenirs", "un regalo", "regalitos", "unos regalos", "artesanias"]),
  L("toiletries", ["cosmeticos", "maquillaje", "mi cepillo de dientes", "cepillo de dientes", "shampoo", "champu", "perfume", "articulos de aseo",
    "cosas de bano", "bloqueador", "protector solar", "pasta de dientes", "mis cremas", "cremas"]),
  L("medicine", ["medicinas", "medicina", "mis medicinas", "mi medicina", "medicamentos", "mis medicamentos", "pastillas", "mis pastillas",
    "insulina", "vitaminas"], ["valuable:med"]),
  L("laptop", ["laptop", "mi laptop", "una laptop", "computadora", "mi computadora", "una computadora", "camara", "una camara", "mi camara", "joyas",
    "mis joyas", "alhajas", "una tableta", "tableta", "un ipad", "ipad", "audifonos", "dinero", "efectivo", "un reloj", "reloj", "aparatos electronicos",
    "electronicos", "una consola", "un dron"], ["valuable:yes"]),
  L("documents", ["documentos", "papeles", "mis documentos", "documentos importantes", "papeles del trabajo", "mi pasaporte"], ["valuable:yes"]),
  L("books", ["libros", "un libro", "mis libros"]),
  L("gear", ["equipo de buceo", "snorkel", "aletas", "visor", "una toalla", "toallas"]),
  L("food", ["comida", "dulces", "chocolates", "galletas", "queso", "botanas"]),
];

const HOTELS = [
  L("mar_azul", ["hotel mar azul", "mar azul", "el mar azul", "el hotel mar azul"]),
  L("other_hotel", ["hilton", "marriott", "holiday inn", "fiesta americana", "city express", "hyatt", "best western", "posada colibri", "hotel colibri",
    "hotel del mar", "hotel la ceiba", "hotel paraiso", "hotel playa", "hotel central", "hostal del centro"]),
];
const STREETS = [L("ceiba", ["ceiba", "la ceiba"]), L("flamboyan", ["flamboyan", "flamboyanes"]), L("hidalgo", ["hidalgo", "miguel hidalgo"]),
  L("juarez", ["juarez", "benito juarez"]), L("morelos", ["morelos"]), L("malecon", ["del malecon", "malecon"]), L("tulum", ["tulum"]),
  L("colibri", ["colibri", "los colibries"]), L("principal", ["principal"]), L("zapata", ["zapata", "emiliano zapata"]), L("palmas", ["las palmas", "palmas"])];

// ---------------------------------------------------------------------------
// Helpers

const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function ack(c: Ctx, p = 0.5, line = "ack") { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say(line); }
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};
const pickFirst = (v: any, key: string): string | undefined => {
  const walk = (o: any): string | undefined => {
    if (!o || typeof o !== "object") return undefined;
    if (Array.isArray(o)) { for (const x of o) { const r = walk(x); if (r) return r; } return undefined; }
    if (typeof o[key] === "string") return o[key];
    for (const [k, x] of Object.entries(o)) if (k !== "__tags") { const r = walk(x); if (r) return r; }
    return undefined;
  };
  return walk(v);
};

const REFS: Record<string, { write: string }> = { a: { write: "Reporte de equipaje: PC-47219" }, b: { write: "Reporte de equipaje: PC-58306" } };

/** Fold everything the learner said about the bag into the state (several segments may arrive in one turn). */
function takeDescription(c: Ctx, slots: any, seg: Segment) {
  const tags = allTags(slots, seg);
  const type = pickFirst(slots, "bagtype");
  const color = pickFirst(slots, "color");
  const size = pickFirst(slots, "size");
  const material = pickFirst(slots, "material");
  const brand = pickFirst(slots, "brand");
  const feats = tags.filter((x) => x.startsWith("f:")).map((x) => x.slice(2));
  if (type && !(type === "bag" && c.s.type && c.s.type !== "bag")) c.s.type = type;
  if (color) c.s.color = color;
  if (size) c.s.size = size;
  if (material) c.s.material = material;
  if (brand) c.s.brand = brand;
  if (feats.length) { c.s.marks = [...new Set([...(c.s.marks || []), ...feats])]; turn(c).newMarks = true; }
  turn(c).described = true;
}

/** After a description turn: echo the bag and its color once ("Entonces, una maleta azul."), or a short acknowledgement. */
function echoDescription(c: Ctx) {
  const T = turn(c);
  if (T.echoed) return;
  T.echoed = true;
  if (c.s.type && c.s.type !== "bag" && c.s.color && !c.s.echoedOnce) {
    c.s.echoedOnce = true;
    sayEcho(c);
  } else if (T.newMarks) c.say("helpful");
  else if (c.chance(0.6)) c.say("ack");
}

/** "Entonces, una maleta azul." ("azul marino" is invariant, so it isn't passed to the composer's agreement). */
function sayEcho(c: Ctx) {
  if (c.s.color === "navy") c.say("echo_navy", { X: c.s.type });
  else c.say("echo", { X: { id: c.s.type, mods: [c.s.color] } });
}

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Answers the simulation gives when Itzel asks an optional question.
const BG_AUTO: Record<string, string> = {
  problem: "Mi maleta no llegó.", flight: "Era el vuelo 482 de Houston.", from_city: "De Houston.", connection: "Sí, en Cancún.", tag: "Sí, aquí está.",
  describe: "Es una maleta azul grande.", type: "Una maleta.", color: "Azul.", size: "Grande.", material: "Rígida.", marks: "Tiene una franja roja a un lado.",
  brand: "No sé la marca.", contents: "Solo ropa y zapatos.", delivery: "Sí, llévenla a mi hotel, por favor.",
  hotel: "En el Hotel Mar Azul.", phone: "Mi número es 984 123 4567.", kit: "Sí, por favor.", ref: "Gracias.",
  // customs
  itzel_bye: "No, es todo. Muchas gracias.", declare: "No, nada que declarar.", food: "No, no traigo comida.", dog: "Ah, sí, perdón. Traigo una manzana del avión.",
  declare_what: "Una manzana.", gift_value: "No, menos de quinientos dólares.",
};

// A short desk visit for the customs sims: report, flight, a black suitcase, delivery to the hotel, phone, report number.
const DESK = ["Mi maleta no llegó.", "Vuelo 482 de Houston.", "Es una maleta negra.", "Sí, por favor.", "En el Hotel Mar Azul.", "984 123 4567", "Gracias."];
const DESK_AUTO = omit(BG_AUTO, ["describe", "delivery", "hotel", "phone", "ref"]);
const deskSetup = (s: Record<string, any>) => {
  s.foundTwist = false; s.askTag = false; s.askConnection = false; s.askSize = false; s.askMaterial = false; s.askMarks = false; s.askBrand = false;
  s.askContents = false; s.offerKit = false;
};
const CUSTOMS_KEYS = ["itzel_bye", "declare", "food", "dog", "declare_what", "gift_value"];

// ---------------------------------------------------------------------------

export const baggage: SituationDef = {
  id: "s65b-baggage",
  song: 65,
  songTitle: "Business or Pleasure?",
  title: { en: "Mi maleta no llegó", lt: "My bag didn't arrive" },
  topic: { en: "Equipaje perdido", lt: "Lost luggage" },
  chapter: 1,
  order: 2,
  location: "airport",
  npc: "priya",
  // customs after the baggage desk: Agente Medina stands at her post there (interiors.ts arrivalsMx)
  npcs: ["aduana"],
  goal: "Report that your bag didn't arrive, describe it, and arrange for it to be delivered to where you're staying. Then go through customs.",
  intro: "The baggage claim hall at Puerto Colibrí's little airport. The belt has stopped, everyone has left, and your suitcase isn't there. You go to the baggage services desk, where Itzel can help. (Your bag: a large blue suitcase with a red stripe on the side.) Then customs is on your way out, with your backpack.",
  entities: { bagtype: BAG_TYPES, color: COLORS, size: SIZES, material: MATERIALS, city: CITIES, good: GOODS },

  grammar: {
    macros: {
      bag: "(maleta | maletas | equipaje | mochila | mochilas | valija | petaca | bolsa | bolsas | maleta de viaje | bolsa de viaje | maletin)",
      my_bag: "(mi | mis | nuestra | nuestras | nuestro | la | el | las | una de mis | mi otra) @bag",
      // "…no llegó", "…nunca salió", "…se perdió" (after @my_bag)
      not_came: "(no llegó | no llegaron | no ha llegado | no han llegado | no salio | no salieron | no ha salido | no vino | no vinieron | no aparece | no aparecio | no ha aparecido | no esta | no estaba | no sale | no viene | no llega | nunca llegó | nunca salio | nunca aparecio | se perdio | se perdieron | esta perdida | esta perdido | se extravio | se extraviaron | no la veo | no lo veo | no la encuentro | no lo encuentro)",
      came_verb: "(llegó | ha llegado | salio | ha salido | vino | aparece | aparecio | sale | viene | esta | estaba)",
      belt_tail: "(en la banda | en la cinta | en el carrusel | en la banda de equipaje | con mi vuelo | en mi vuelo | en el avion | en el vuelo | todavia | aun | para nada | por ningun lado)",
      waited: "(espere | estuve esperando | llevo esperando | he esperado | estoy esperando | esperamos) [aqui] [por | como] (una hora | mucho tiempo | mucho rato | media hora | dos horas | un buen rato | horas | treinta minutos | un rato | mucho | casi una hora)",
      country: "(estados unidos | los estados unidos | canada | inglaterra | el reino unido | irlanda | australia | mexico | texas | california | florida)",
      col: "[de color | color] {color} [(y | con) {color2:color}]",
      with_feats: "con {feat_phrase} [y {feat_phrase}]",
      wheels: "de (ruedas | rueditas | llantitas) #f:wheels",
      where: "(en (la manija | el asa | la agarradera | un lado | el costado | el frente | la parte de arriba | medio | el mango) | a un lado | al lado | de un lado | adelante | arriba)",
      it_is: "(es | era | mi maleta es | la maleta es | mi mochila es | es solo)",
      stay_verb: "(me estoy quedando | me quedo | estoy | me hospedo | me estoy hospedando | voy a estar | nos quedamos | nos estamos quedando | me voy a quedar | nos hospedamos)",
      hotel_tail: "(en el centro | cerca de la playa | por el malecon | junto a la playa | en la playa | por el zocalo | cerca del zocalo | en la habitacion {number} | en el cuarto {number} | habitacion {number} | cuarto {number} | por {number} noches | por una semana | hasta el {day})",
      between: "entre {street} y {street2:street}",
      to_hotel: "(a mi hotel | al hotel | a el hotel | a mi hotel por favor)",
      cont_tail: "([y] (la | las | lo | los) necesito [hoy | esta noche | diario] | (es | son) [muy | bastante] (cara | caro | caras | caros | importante | importantes | valiosa | valioso | nueva | nuevo))",
      reimb: "(pagar | reembolsar | reponer | cubrir | regresar)",
      // customs
      bring: "(traigo | tengo | llevo | traje | cargo | vengo con | tengo aqui | traigo aqui)",
      good_tail: "([pero] (es | son) del avion | del avion | que me dieron en el avion | de mi casa | para mi familia | para regalar | de regalo | para el camino | para mis amigos | en mi mochila | en la mochila)",
      // what "No traigo…" denies (food, and the classic alcohol and tobacco: "No traigo alcohol ni tabaco")
      no_food: "(comida | alimentos | fruta | frutas | carne | verdura | verduras | nada de comida | ningun alimento | ninguna fruta | nada de eso | plantas | animales | queso | alcohol | tabaco | cigarros | tequila | vino | licor)",
      personal: "(ropa | mi ropa | cosas personales | mis cosas personales | mi equipaje personal | equipaje personal | mi ropa y mis cosas | ropa y cosas personales | cosas de uso personal | mis cosas | mis cosas personales y mi ropa | mi laptop | mi computadora | mi celular | mi camara | mi tableta | mis medicinas | mi ropa y mi laptop)",
      // "Llegué hace una hora…"
      ago: "hace (una hora | un rato | media hora | dos horas | unos minutos | poco)",
      // personal luggage by ANAM's list (Equipaje y franquicia): laptops, phones, cameras, medicines for personal use, and
      // for adults up to 3 liters of liquor, 6 of wine and 20 packs of cigarettes (one to three bottles stay inside it).
      // Vapes are left out on purpose: Mexico bans bringing them in.
      liquor: "((botella | botellas | botellita) de (tequila | vino | whisky | ron | mezcal | licor | vodka) | tequila | vino | whisky | ron | mezcal | licor | vodka | alcohol)",
      tobacco: "(cigarros | cigarrillos | (cajetilla | cajetillas) [de cigarros] | puros | tabaco)",
      pers_item: "(laptop | computadora | compu | celular | telefono | tableta | ipad | camara | medicinas | medicina | medicamentos | pastillas | ropa | zapatos | perfume | @liquor | @tobacco)",
    },
    slots: {
      bignum: { fn: bigNumber },
      amount: { fn: amount },
      code: { fn: codeSlot },
      fjoined: { fn: joinedFlight },
      airline: { lexicon: AIRLINES },
      brand: { lexicon: BRANDS },
      content: { lexicon: CONTENTS },
      hotel: { lexicon: HOTELS },
      street: { lexicon: STREETS },
      fnum: { pattern: ["{digits}", "{bignum}", "{fjoined}", "{code} ({digits} | {bignum})"] },
      np_desc: { pattern: [
        "[una | la | mi | un] {bagtype} [@col] [{size}] [{material}] [@with_feats | @wheels]",
        "[una | la | mi | un] {bagtype} [@wheels] [{size}] [@col] [{material}] [@with_feats]",
        "[una | la | mi | un] {bagtype} {size} y @col [y {material}] [@with_feats]",
        "[una | la | mi | un] {bagtype} @col y {size} [@with_feats]",
        "[una | la | mi | un] {bagtype} {material} [@col] [{size}] [@with_feats]",
        "[una | un] {brand} [@col] [{size}] [@with_feats]",
      ] },
      feat_phrase: { pattern: [
        "(ruedas | rueditas | llantitas | cuatro ruedas | dos ruedas | cuatro rueditas) #f:wheels",
        "(una | dos | unas) (franja | franjas | raya | rayas | linea | lineas | banda) [{fcolor:color}] #f:stripe [@where]",
        "(un | unos | dos | una) (liston | listones | mono | lazo | paliacate | panuelo | cinta | listoncito) [{fcolor:color}] #f:ribbon [@where]",
        "(una | mi) etiqueta [{fcolor:color}] [con mi nombre | de identificacion | con mis datos | con mi nombre y mi telefono] #f:nametag [@where]",
        "mi nombre [y (mi telefono | mi direccion)] #f:nametag",
        "(una | unas | muchas | varias | un monton de | puras) (calcomania | calcomanias | estampa | estampas | sticker | stickers | pegatina | pegatinas) #f:sticker",
        "(una | un) (correa | cinturon | cincho) [{fcolor:color}] #f:strap [alrededor]",
        "(un candado | un candadito | candado) #f:lock",
        "(la manija | el asa | la agarradera | una rueda) (rota | descompuesta | quebrada) #f:handle",
      ] },
      // "ropa, zapatos y unos regalos", "mi laptop y mi cámara", "regalos para mi familia"
      cont_item: { pattern: "[mi | mis | unos | unas | un | una | algo de | algunos | algunas | puros | pura | toda mi | todos mis] {content} [para (mi familia | mis hijos | mi esposa | mi esposo | mis amigos | mi mama | el trabajo | mis papas | la playa)]" },
      cont_list: { pattern: "{cont_item} [[y | tambien | y tambien] {cont_item}] [[y] {cont_item}] [[y] {cont_item}]" },
      good_item: { pattern: "[un | una | unos | unas | dos | tres | algo de | un poco de | unas cuantas | unos cuantos | mi | mis | el | la | los | las] {good} [@good_tail]" },
      goods: { pattern: "{good_item} [[y | tambien | y tambien] {good_item}] [[y] {good_item}]" },
    },
  },

  intents: {
    problem: { patterns: [
      "@my_bag [todavia | aun | otra vez] @not_came [@belt_tail] [pero (mi | la | el) @bag si [llegó]] #h:pr_didnt",
      "no (llegó | ha llegado | salio | ha salido | vino | aparece | aparecio | esta | sale | llegaron | salieron) (mi | mis | una de mis | nuestra | nuestras) @bag [@belt_tail]",
      "no (encuentro | puedo encontrar | veo | hallo) (mi | mis | nuestra | nuestras | una de mis) @bag [por ningun lado | en la banda] #h:pr_cant_find",
      "creo que se ha perdido @my_bag", "creo que @my_bag (se perdio | se ha perdido | esta perdida | esta perdido | se extravio | se quedó) #h:pr_lost",
      "@my_bag (se perdio | se ha perdido | esta perdida | esta perdido | se extravio | esta extraviada) [@belt_tail]",
      "[creo que] (perdieron | extraviaron | ustedes perdieron | la aerolinea perdio | se perdio | se extravio) (mi | mis | nuestra) @bag",
      "(quiero | quisiera | necesito | me gustaria | vengo a) (reportar | hacer un reporte de | levantar un reporte de | reclamar | hacer una reclamacion por | poner una reclamacion por) (una | mi | un) @bag (perdida | perdido | extraviada | extraviado | que no llegó | demorada | retrasada) #h:pr_report",
      "(quiero | quisiera | necesito | vengo a) (reportar | hacer un reporte | levantar un reporte) (de | por) (equipaje perdido | una maleta perdida | mi maleta)",
      "[yo] (perdi | se me perdio) (mi | mis) @bag",
      "donde (esta | estan) (mi | mis) @bag",
      "no (recibi | tengo | vi | recogi) (mi | mis | una de mis) @bag",
      "(me falta | falta | me faltan | faltan) (una | mi | una de mis | dos | un) @bag",
      "(estoy | estaba | estuve) esperando (mi | mis) @bag [y | pero] [no (llega | llegó | sale | salio)]",
      "@waited [y | pero] @my_bag [todavia | aun] @not_came",
      "(todos | todo el mundo | los demas) (recogieron | sacaron | tienen | agarraron) (sus maletas | su equipaje) (menos yo | pero yo no | y yo no)",
      "donde (reporto | puedo reportar | se reporta) (una | mi | un) @bag (perdida | perdido | extraviada | que no llegó)",
      "(tengo | hay) (una maleta | un equipaje | equipaje | una mochila) (perdida | perdido | extraviada | demorado | demorada | retrasada | retrasado)",
      "busco (mi | mis) @bag [y no (la | lo | las | los) encuentro]",
      "@my_bag no (salio | llegó) (en | con) mi vuelo",
      "(aqui | donde) se (reporta | reportan | puede reportar) (una maleta perdida | las maletas perdidas | el equipaje perdido | equipaje perdido | una maleta que no llegó)",
      "@my_bag si llegó pero (mi | la | el) @bag no [@belt_tail]",
    ] },
    need_help: { patterns: [
      "(me puede | me podria | puede | podria | me puedes #tip:tu_staff) ayudar", "(puede | podria) ayudarme", "ayudeme", "(necesito | ocupo) ayuda",
      "tengo un problema", "tengo una pregunta", "(tengo | hay) un problema con (mi | mis) @bag",
    ] },
    flight: { patterns: [
      "(era | fue | vine en | llegué en | vengo en | volé en | tomé) [el] vuelo {fnum} [(de | desde) {city}] [con escala en {via:city}] #h:f_num",
      "[el] vuelo {fnum} [(de | desde) {city}] [con escala en {via:city}] #h:f_short",
      "[el] vuelo {code} {fnum} #h:f_code", "{code} {fnum} [(de | desde) {city}]",
      "[el] numero [de vuelo] (es | era) {fnum}", "mi numero de vuelo (es | era) {fnum}", "es el vuelo {fnum} [(de | desde) {city}]",
      "(era | fue) el vuelo (de | desde) {city} #h:f_from_short",
      "(vengo | vine | llegué | volé | volamos | venimos | llegamos | viajo | viaje) [@ago] (de | desde) {city} [@country] [(con escala en | via | por) {via:city}] #h:f_from",
      // whole sentences: "Llegué hace una hora en el vuelo de Houston", "Mi vuelo fue el 482 de Houston"
      "(vine | llegué | vengo | volé | volamos | venimos | llegamos) [@ago] en el vuelo (de | desde) {city} [@country] [con escala en {via:city}]",
      "mi vuelo (es | era | fue) [el] [vuelo] {fnum} [(de | desde) {city}] [con escala en {via:city}]",
      "(de | desde) {city} [@country] [(con escala en | via) {via:city}] #h:f_from_city",
      "(hice | tuve | hicimos) (escala | una escala | conexion | una conexion) en {via:city} #h:f_conn",
      "(con escala en | via) {via:city}",
      "[era] el vuelo de {city} [de {time}]", "mi vuelo (era | fue | venia | vino | salio) (de | desde) {city} [con escala en {via:city}]",
      "(vine | llegué) en el vuelo (de la manana | de la tarde | de la noche) [(de | desde) {city}]",
      "(vine | volé | llegué) (con | por) {airline} [(de | desde) {city}] [con escala en {via:city}]",
    ] },
    via_ctx: { patterns: [
      "[si] en {via:city} #h:cn_in", "[si] (hice | hicimos | tuve | he hecho | hemos hecho) (escala | una escala | conexion | una conexion | transbordo) en {via:city}", "[si] {via:city}",
      "[si] (una | solo una) (escala | conexion) en {via:city}", "[si] la (escala | conexion) (fue | era) en {via:city}",
      "[si] (cambié | cambiamos) de avion en {via:city}", "no (fue | era) [un vuelo] directo (hice | tuvimos | hicimos | tuve) (escala | una escala | conexion) en {via:city}", "[si] (dos escalas | dos conexiones) en {via:city} y {via2:city}", "[si] en {via:city} [en] @country",
    ] },
    flight_num_ctx: { patterns: ["{fnum}", "[el] numero es {fnum}", "es el {fnum}", "el {fnum}"] },
    city_ctx: { patterns: ["{city}", "creo que (de | desde) {city}", "{city} [en] @country", "creo que {city}"] },
    no_connection: { patterns: [
      "[no] (fue | era) (un vuelo directo | directo | sin escalas) #h:cn_direct", "[no] (directo | vuelo directo | sin escalas | sin escala | ninguna escala | ninguna conexion)",
      "no (hice | tuve | hicimos) (escala | escalas | conexion | ninguna escala | ninguna conexion) [en {city}]", "[no] (volé | vine | volamos) directo [desde {city}]",
      "[no] (solo | nada mas) un vuelo", "no cambié de avion", "[no] (ninguna | ninguna escala | ninguna conexion | ni una)",
    ] },
    dunno_ctx: { patterns: [
      "no (me acuerdo | recuerdo) [del | de la | el | la] [numero de vuelo | numero | nombre | marca | numero del vuelo] #h:f_dunno", "no estoy (seguro | segura) #h:b_dunno",
      "no (lo | la) (recuerdo | se)", "no se [el numero | la marca]", "ni idea", "no tengo idea", "se me olvidó [el numero | la marca]", "olvidé el numero",
      "tampoco (me acuerdo | lo se | se)",
      // no brand at all: "No tiene marca, es una maleta barata"
      "(no tiene | sin) marca [es una (maleta | mochila | bolsa) (barata | sencilla | generica | normal | cualquiera)]",
      "(es | es una) (maleta | mochila | bolsa) (barata | sencilla | generica | cualquiera) [sin marca | no tiene marca]",
      "no creo que tenga marca", "no me acuerdo de la marca",
    ] },
    hand_over: { patterns: [
      "aqui (esta | tiene | lo tiene | la tiene) #h:t_here", "[si] aqui (lo | la) tengo",
      "aqui (esta | tiene) (mi | el) (talon | comprobante | pase de abordar | tarjeta de embarque | boleto | etiqueta | ticket) #h:t_heres",
      "(esta | el talon esta | la etiqueta esta | el comprobante esta | viene) (pegado | pegada) [en] (mi | el) (pase de abordar | tarjeta de embarque | boleto | pasaporte)",
      "(esta | viene) en (mi | el) (pase de abordar | tarjeta de embarque | boleto | pasaporte) #h:t_on_bp",
      "[si] tengo (el talon | la etiqueta | el comprobante | mi pase de abordar | mi tarjeta de embarque) [aqui]",
    ] },
    // a bare "Aquí", "Tome", "Lo tengo" hands the tag over only at the tag question
    hand_over_ctx: { patterns: ["aqui", "tenga", "tome", "[si] (lo | la) tengo [aqui]"] },
    tag_lost: { patterns: [
      "[no] creo que (lo he perdido | la he perdido)", "[no] creo que (perdi | se me perdio | he perdido | se me ha perdido) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante)", "no (tengo | traigo | encuentro) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante | ningun talon)",
      "(perdi | tire | dejé en el avion) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante)",
      "no me (dieron | dio) (ningun | el | un | una | ninguna) (talon | comprobante | etiqueta)", "nunca me dieron (talon | etiqueta | comprobante)",
    ] },
    // "Creo que lo perdí", "No lo encuentro": "lo" is the claim tag only at the tag question
    tag_lost_ctx: { patterns: [
      "[no] creo que (lo | la) perdi #h:t_lost", "[no] (lo | la) perdi", "[no] no (lo | la) encuentro", "no se donde (esta | lo dejé | la dejé | quedó)",
      "(lo | la) (tire | dejé en el avion)", "[no] ya no (lo | la) tengo", "[no] no (lo | la) tengo",
    ] },
    describe: { patterns: [
      "@it_is {np_desc} #h:d_its", "[@it_is] {np_desc} [y] [muy | bastante] {size}",
      "@it_is @col #h:d_color", "@it_is @col @with_feats", "@it_is [muy | bastante] {size}", "@it_is (una | uno) {size}", "@it_is (una | uno) {color}",
      "@it_is {material} #h:mt_its", "@it_is {material} @with_feats",
      "(tiene | trae) {feat_phrase} [y {feat_phrase}] #h:d_has", "lleva {feat_phrase} [y {feat_phrase}] #h:d_there", "(hay | tiene) {feat_phrase} [y {feat_phrase}] [@where]",
      "@col @with_feats",
      // lists of adjectives without a noun: "Grande, azul, de plástico duro"
      "[@it_is] [muy | bastante] {size} [y] @col [[y] {material}] [@with_feats]",
      "[@it_is] @col [y] [muy | bastante] {size} [[y] {material}] [@with_feats]",
      "(el color es | su color es) {color} [y {color2:color}]", "@it_is (hecha | hecho) {material}",
    ] },
    // a bare noun phrase ("Una mochila negra") describes the bag only while Itzel asks about it
    describe_ctx: { patterns: ["{np_desc}"] },
    describe_fix: { patterns: [
      "[no] no es (una | un) {wrong:bagtype} [(es | sino) (una | un) {bagtype}]", "no (una | un) {wrong:bagtype} [(es | sino) (una | un) {bagtype}]",
      "[no] no es {wrong:color} [(es | sino) {color}]", "[no] {wrong:color} no [es] {color}", "no {wrong:color} [sino] {color}",
    ] },
    color_ctx: { patterns: ["{color} [y {color2:color}] #h:c_short", "(una | uno) {color}", "[de] color {color} [y {color2:color}]", "{color} con {color2:color}", "es de color {color}"] },
    type_ctx: { patterns: ["[una | un] {bagtype} #h:tp_short", "es (una | un) {bagtype} #h:tp_its", "(la primera | la primera opcion) [una {bagtype}]"] },
    size_ctx: { patterns: ["{size} #h:sz_short", "(muy | bastante) {size}", "(una | uno | la) {size}", "es {size} #h:sz_its", "[de] tamano {size}", "de las {size}",
      "no (muy | tan) (grande | chica) [es] {size}", "[no] no es {wrong:size} [(es | sino)] {size}", "[es] [como | mas o menos | aproximadamente | unos] [de] {cm:number} (centimetros | cm)",
      "[es] [como | mas o menos] de {inch:number} pulgadas"] },
    material_ctx: { patterns: ["{material} #h:mt_short", "(una | uno) {material}", "{material} @with_feats", "es (una | uno) {material}", "[es] {material} [y] no {wrong:material}", "[no] no es {wrong:material} [(es | sino)] {material}", "(esta hecha | hecha) {material}"] },
    // a bare "Nada." / "Ninguna." means "no marks" only at the marks question
    marks_bare_ctx: { patterns: ["[no] (nada | ninguna | ninguno | nada de eso)", "[no] no tiene nada"] },
    // the answer to "¿Tiene algo que la distinga?" without a verb: "Una franja roja", "Muchas calcomanías"
    marks_ctx: { patterns: ["[solo | nada mas] {feat_phrase} [y {feat_phrase}]"] },
    marks_none: { patterns: [
      "[no] nada especial #h:m_none", "[no] (nada en particular | nada raro)", "[no] no tiene nada (especial | en particular)",
      "[no] no tiene (listones | liston | calcomanias | etiquetas | etiqueta | marcas | ninguna etiqueta | ningun liston | ninguna marca | nada de eso | stickers)",
      "[no] no tiene [ningun | ninguna | un | una] (etiqueta | liston | calcomania | sticker | franja | candado | marca) (con mi nombre | de colores | especial | de ningun tipo)",
      "[no] es (una maleta | una mochila | una bolsa) (normal | sencilla | lisa | comun)", "(sin | ni) (listones | calcomanias | etiquetas | marcas | stickers) [ni (listones | calcomanias | etiquetas | marcas | stickers)]",
    ] },
    brand: { patterns: ["@it_is (una | un) {brand} #h:b_its", "{brand} #h:b_short", "la marca es {brand}", "creo que es [una | un] {brand}", "[no se] creo que [una | un] {brand}", "es [de] marca {brand}", "es [de] la marca {brand}", "marca {brand}"] },
    contents: { patterns: [
      "[solo | nada mas | puro | pura | mas que nada | sobre todo] {cont_list} [@cont_tail] #h:c_clothes",
      "(hay | tengo | traigo | lleva | trae | llevo | viene) [solo | nada mas] {cont_list} [adentro | en (ella | la maleta)] [@cont_tail] #h:c_in",
      "{cont_list} (esta | estan) (adentro | ahi | en la maleta | en ella) #h:c_med",
      "[no] nada de valor [solo {cont_list}] #h:c_nothing", "[no] nada (caro | importante | especial | valioso) [solo {cont_list}]",
      "[no] no (traigo | tengo | lleva | hay | llevo | trae) nada (de valor | valioso | caro | importante)",
    ] },
    delivery: { patterns: [
      // #to_hotel: to the hotel, not named yet ("¿Dónde se está hospedando?" asks which); #to_home: somewhere else
      "[si] (me la pueden | me la puede | me la podrian | me la podria | pueden | puede | podrian | podria) (llevar | mandar | entregar | enviar | traer) [@to_hotel #to_hotel] #h:dl_deliver",
      "[si] (pueden | puede | podrian | podria) (llevarla | mandarla | entregarla | llevarmela | mandarmela | enviarla) [@to_hotel #to_hotel]",
      "[si] (llevenla | mandenla | entreguenla | llevenmela | mandenmela | me la llevan | me la mandan) [@to_hotel #to_hotel] #h:dl_yes",
      "[si] @to_hotel #to_hotel",
      // "Sí, pero no al hotel": delivered, but somewhere else (Itzel asks for the address)
      "(si | si pero | pero) (no al hotel | al hotel no | no a mi hotel | no a el hotel) [a otra direccion | a otro lugar] #to_home",
      "[no] (no al hotel | al hotel no | no a mi hotel) (a otra direccion | a otro lugar | a otra parte) #to_home",
      "[si] (llevenla | mandenla | llevenmela | me la pueden llevar | me la llevan) (a | al) {hotel}",
      "[si] (quiero | prefiero | quisiera | me gustaria) que (me la lleven | la lleven | la manden | me la manden | me la entreguen) [@to_hotel #to_hotel]",
      "[si] (que me la lleven | entrega a domicilio | que la lleven) [@to_hotel #to_hotel]",
      "[si] (me la pueden | pueden | puede | podrian) (llevar | mandar | entregar) a (la casa de (mi amiga | mi amigo | unos amigos | mi hermana | mi hermano | mi familia) | mi casa | mi departamento | mi airbnb | esta direccion) #to_home",
      "[si] (llevenla | mandenla) a (la casa de (mi amiga | mi amigo | unos amigos | mi hermana) | mi departamento | mi airbnb | esta direccion) #to_home",
    ] },
    // "Mejor a la casa de mi amiga", "A otra dirección": the destination without a verb, only where Itzel asks where to
    delivery_ctx: { patterns: [
      "[no] [mejor] a (la casa de | casa de) (mi amiga | mi amigo | una amiga | un amigo | unos amigos | mi hermana | mi hermano | mi familia) [por favor] #to_home #h:dl_friend",
      "[no] [mejor] a (mi casa | mi departamento | mi airbnb | otra direccion | otro lugar | esta direccion | donde me estoy quedando | donde me quedo) [por favor] #to_home",
    ] },
    // "No, al hotel no", "No estoy en un hotel": not the hotel, but a pickup or another address? Itzel asks (rule 10)
    not_hotel_ctx: { patterns: ["[no] (no al hotel | al hotel no | no a mi hotel | a mi hotel no | no a el hotel) [gracias]", "[no] no (estoy | me quedo | me hospedo | me estoy quedando) en (un | ningun) hotel"] },
    // "Aquí", "Recogerla aquí": the pickup side of "¿Prefiere recogerla aquí, o…?" (that question only)
    pick_ctx: { patterns: ["[mejor] (aqui | recogerla | recogerla aqui | aqui en el aeropuerto | yo paso | yo vengo | yo la recojo | paso yo)"] },
    pickup: { patterns: [
      "[yo] (paso por ella | vengo por ella | la recojo | regreso por ella | vuelvo por ella | vengo a recogerla) [aqui | manana | despues | mas tarde | yo] #h:dl_pickup",
      "(prefiero | quiero | quisiera) (recogerla | pasar por ella | venir por ella) [yo] [aqui | manana | en el aeropuerto]",
      "(puedo | podria) (recogerla | pasar por ella | venir por ella) [aqui | manana | en el aeropuerto | yo]",
      "[no] no (me la lleven | la lleven | la manden | me la manden | necesito que la lleven | quiero que la lleven | quiero que me la lleven) [al hotel] [yo (la recojo | paso por ella | vengo por ella)]",
      "[no] no hace falta (que me la lleven | que la lleven | que la manden | llevarla | mandarla) [al hotel] [yo (la recojo | paso por ella | vengo por ella)]",
      // "No al hotel, prefiero recogerla": not delivered, picked up
      "[no] (no al hotel | al hotel no) [gracias] [mejor | prefiero] (la recojo | paso por ella | vengo por ella | recogerla | pasar por ella) [yo] [aqui | manana]",
      "[no] mejor (la recojo | paso por ella | vengo por ella) [yo] [aqui | manana]",
      "la recojo (aqui | en el aeropuerto | en el mostrador) [manana]",
    ] },
    stay: { patterns: [
      "(en | al) [el] {hotel} [@hotel_tail] #h:h_at", "@stay_verb (en | con) [el] {hotel} [@hotel_tail] #h:h_hotel", "[el] {hotel} [@hotel_tail]",
      "[@stay_verb] (en casa de | con) (una amiga | un amigo | mi amiga | mi amigo | mi hermana | mi hermano | mi familia | unos amigos | mi hija | mi hijo) [@hotel_tail] #fam",
      "no (estoy | me quedo | me hospedo | me estoy quedando) en (un | ningun) hotel [@stay_verb] (en casa de | con) (una amiga | un amigo | mi amiga | mi amigo | mi hermana | mi hermano | mi familia | unos amigos) #fam",
      "[@stay_verb] en (un airbnb | un departamento | una casa | un hostal | una posada | una cabana | un hotel) [@hotel_tail]",
      "[@stay_verb] en [la] (calle | avenida) {street} [numero] [{number}] [@between]",
      "[en] [la] (calle | avenida) {street} [numero] {number} [@between] #h:h_addr",
      "mi direccion es [la] [calle | avenida] {street} [numero] {number} [@between]",
      "[en] [la] calle {number} [numero {number2:number}] [@between]",
    ] },
    // "No sé la dirección", "Todavía no tengo hotel": at the address question only
    addr_dunno_ctx: { patterns: [
      "no (se | recuerdo | me se | tengo | me acuerdo de) [bien] (la direccion | la calle | el numero | el nombre del hotel | el nombre | su direccion | la direccion de mi amiga | la direccion del hotel) [exacta] [de memoria]",
      "no me (la | lo) se [de memoria]", "(todavia | aun) no (tengo | se) (hotel | donde me voy a quedar | la direccion)", "no tengo hotel [todavia | aun]",
      "no se donde me voy a quedar",
    ] },
    phone: { patterns: [
      "mi (numero | celular | telefono | cel | whatsapp | numero de celular | numero de telefono) es [el] [mas] {digits} #h:ph_mine",
      "(le doy | apunte | anote) [mi | el] (numero | celular | telefono | whatsapp) [es] [el] [mas] {digits}",
      "es el [mas] {digits} #h:ph_its", "(puede | pueden) (llamarme | marcarme | escribirme) al [mas] {digits}",
      "(llameme | marqueme | me pueden llamar | me puede llamar | me pueden marcar | me puede marcar) al [mas] {digits}", "[el] numero es [el] [mas] {digits}",
    ] },
    phone_ctx: { patterns: ["[el] [mas] {digits}"] },
    phone_none: { patterns: [
      "no tengo (numero | celular | telefono | chip | linea) (mexicano | de aqui | local | de mexico | mexicana) [todavia | aun] #h:ph_none",
      "[no] no tengo (telefono | celular | numero) aqui", "[no] no tengo (telefono | celular | cel) [aqui | en mexico]", "mi (celular | telefono) no (funciona | sirve | jala) [aqui | en mexico]",
      "solo tengo (un numero | numero | celular | un celular) (extranjero | de estados unidos | de canada | americano | de fuera)",
      "[mejor] (llamen | llame | pueden llamar | puede llamar) al hotel", "no tengo (chip | sim | linea) [mexicano | mexicana | de aqui]",
    ] },
    q_when: { patterns: ["cuando (me la entregan | me la traen | me la llevan | llega | va a llegar | la tengo | la voy a tener | la recibo) #h:q_when",
      "cuanto (tarda | tardan | se tarda | va a tardar | tiempo tarda | tiempo tardan)", "en cuanto tiempo (llega | me la entregan | la tengo)", "para cuando (llega | la tienen)", "cuando (llega | va a llegar | me (entregan | traen | llevan)) (mi maleta | mi equipaje | mi mochila | mi bolsa)",
      "a que hora (me la traen | me la llevan | me la entregan | la traen | la llevan | llega | va a llegar)", "(me la traen | me la entregan | llega) (hoy | manana | esta noche)"] },
    q_meantime: { patterns: [
      "que hago (mientras | mientras tanto | esta noche | hoy | ahora | por mientras) [sin (mi ropa | mis cosas | mi maleta)] #h:q_meantime",
      "que (puedo | debo) hacer (mientras tanto | esta noche | hoy | por mientras)", "y (esta noche | hoy | mientras tanto) que hago", "y ahora que [hago]",
      "no tengo (ropa | mi cepillo de dientes | mis cosas) [para (hoy | esta noche)]", "no tengo nada (para (hoy | esta noche) | que ponerme)",
      "(me pueden dar | me dan | tienen | hay) (un kit | algo para la noche | un cepillo de dientes | una playera | una camiseta)",
    ] },
    q_reimburse: { patterns: [
      "(me van a | van a | me pueden) @reimb (la ropa | lo que compré | las cosas | un cepillo de dientes | lo que gasté | los gastos) [que (compré | necesité)] #h:q_reimburse",
      "(ustedes | la aerolinea) (paga | pagan | cubre | cubren | reembolsa | reembolsan) (lo que compré | la ropa | los gastos | eso)",
      "quien (paga | cubre) (la ropa | lo que compré | los gastos | eso)", "(me reembolsan | me reponen | me pagan) (lo que compré | los gastos | la ropa | eso) [hoy]",
      "puedo comprar (ropa | cosas | lo basico) y (me lo pagan | me lo reembolsan | ustedes me lo pagan)", "(hay | dan) (reembolso | compensacion)",
    ] },
    // the courtesy kit (answers to "¿Le doy un kit de cortesía?")
    kit_yes_ctx: { patterns: [
      "[si] (me sirve | me serviria) [mucho]", "[si] (lo | la) (quiero | necesito | acepto)", "[si] (un kit | el kit | un cepillo | una playera | una camiseta) (me serviria | estaria bien | seria genial)",
      "[si] necesito (un cepillo de dientes | una playera | una camiseta | algo para esta noche)",
    ] },
    kit_no_ctx: { patterns: [
      "[no] no (lo | la) necesito", "[no] no necesito (el kit | nada | un kit)", "[no] (tengo | traigo) (todo | lo necesario) [en mi (mochila | equipaje de mano | maleta de mano | bolsa)]",
      "[no] (tengo | traigo) (mis cosas | mi cepillo | mi ropa) en mi (mochila | equipaje de mano | maleta de mano | bolsa)", "[no] no hace falta",
      "[no] (estoy bien | asi estoy bien)",
    ] },
    q_call: { patterns: ["(me van a | me va a | me pueden) (llamar | avisar | mandar un mensaje) #h:q_call", "como (voy a saber | me entero)", "(me avisan | me llaman | me escriben) [cuando llegue] [por (whatsapp | mensaje | telefono | correo)]"] },
    q_track: { patterns: ["(puedo | se puede) (rastrearla | rastrear | seguirla | consultarla | consultar | ver donde esta) [en linea | por internet] #h:q_track",
      "(puedo | se puede) (consultar | ver | revisar) (el estado | su estado | el reporte) [de mi maleta | del reporte] [en linea | por internet]",
      "hay (una pagina | un sitio web | una pagina web)", "como (la rastreo | puedo saber donde esta | consulto)"] },
    q_free: { patterns: ["(la entrega | el envio) (es gratis | tiene costo | cuesta) #h:q_free", "(tengo que | hay que | debo) pagar [la entrega | el envio | algo]", "cuanto (tengo que | hay que) pagar", "cuanto cuesta (la entrega | el envio)", "es gratis [la entrega]",
      // "¿Tiene costo?", "¿Me cobran algo?": whatever is on offer (the delivery, or the kit while it is offered)
      "(tiene | tendra) [algun] (costo | coste | cargo) [la entrega | el envio | el kit]", "cuesta algo [la entrega | el envio | el kit]", "el kit (es gratis | tiene costo | cuesta)",
      "(me | nos) (cobran | cobra | van a cobrar) [algo] [por (la entrega | el envio | llevarla | el kit)]", "cuanto (me | nos) (cobran | cobra | van a cobrar) [por (la entrega | el envio | llevarla | el kit)]"] },
    // a bare "¿Cuánto cuesta?" / "¿Cuánto es?" at an offer: that offer's price (rule 17)
    price_ctx: { patterns: ["[y] cuanto (cuesta | es | sale | seria | va a costar | me va a costar)"] },
    // "¿Cuál es su teléfono?": the desk's number comes on the report
    q_contact: { patterns: ["cual es (su | el) (telefono | numero de telefono | numero de contacto) [de (ustedes | aqui | la oficina)] [para (llamarles | llamarlos)]",
      "(a que | a cual) numero (les | le) (llamo | hablo | marco)", "como (los | las) (contacto | localizo)", "(tienen | hay) (un | algun) (telefono | numero de telefono | numero de contacto) [para llamarles | para llamarlos]"] },
    q_what_if: { patterns: ["y si no la (encuentran | encuentra | encontramos) #h:q_what_if", "que pasa si no (la encuentran | aparece | llega)", "(se perdio | esta perdida) para siempre"] },
    q_copy: { patterns: ["(me da | me puede dar | me dan | puedo tener | me pueden dar) una copia [del reporte | del parte | de la reclamacion] #h:q_copy", "me dan copia"] },
    q_taxi: { patterns: ["donde (hay | estan | tomo | encuentro | puedo tomar) [un | los] (taxi | taxis)", "donde esta (el sitio | el sitio de taxis | la parada de taxis)"] },
    q_shop: { patterns: ["donde (puedo comprar | compro | venden) (un cepillo de dientes | ropa | cosas | una playera)", "hay (una tienda | una tiendita) [por aqui | cerca]"] },
    q_ref: { patterns: ["(me dan | hay | tiene) (un numero de reporte | un folio | numero de folio)", "cual es mi (numero de reporte | folio | numero de folio)",
      "cual (era | es) el (numero | folio) [otra vez]", "(me repite | puede repetir) el (numero | folio)"] },
    // ---- Customs (Agente Medina) ----
    // "Nada que declarar", "Solo ropa", "No traigo comida ni fruta": nothing to declare (a bare "Nada" is the _ctx one)
    declare_none: { patterns: [
      "[no] nada (que | para) declarar #h:dc_nothing", "[no] no (traigo | tengo | llevo) nada (que | para) declarar #h:dc_nothing",
      "[no] (solo | nada mas | nomas | solamente) [traigo | tengo | llevo] @personal #h:dc_personal",
      "[no] no (traigo | tengo | llevo | traje) @no_food [ni @no_food] [ni @no_food] #h:dc_no_food",
      "[no] no (traigo | tengo | llevo | traje) (ningun | ninguna | nada de) {good} [ni {good2:good}]",
      "[no] no (traigo | tengo | llevo | traje) {good} [ni {good2:good}]",
      "[no] nada de (comida | fruta | eso) [ni de (fruta | carne)]", "[no] (ninguna fruta | ninguna comida | ningun alimento)",
      "[no] (de verdad | en serio | se lo juro | le juro que) no (traigo | tengo) (nada | comida | fruta | nada de comida)",
      // "Me comí la manzana en el avión": nothing left
      "[no] [ya] me (comí | lo comí | la comí) [el | la | mi | un | una] ({good} | @no_food) [en el avion]",
      "(tenia | traia | tenía | traía) [un | una | unos | unas] {good} pero (ya me la comí | ya me lo comí | me la comí | me lo comí | ya no)",
    ] },
    // a bare "Nada", "No traigo nada": only where Medina asks (in the bag report "No tengo nada" means something else)
    declare_none_ctx: { patterns: [
      "[no] nada [mas] #h:dc_none", "[no] no (traigo | tengo | llevo | traje) nada [de nada] #h:dc_none", "[no] (nada de nada | absolutamente nada | nada en absoluto)",
      "[no] (el perro se equivocó | se equivocó el perro | se equivocó)",
      "[no] (ninguno | ninguna)", "[no se] creo que no [traigo nada]",
    ] },
    declare_items: { patterns: [
      "[si] @bring {goods} #h:dc_have", "[si] (solo | nada mas | nomas | solamente) @bring {goods}",
      "[si] (solo | nada mas | nomas | solamente) {goods} #h:dc_only",
      "[si] (se me olvidó | se me ha olvidado | olvidé | perdon se me olvidó) [[que] (traigo | tengo | traia | tenia | traje | llevo | llevaba)] {goods} #h:dg_forgot",
      "[si] (perdon | perdone | disculpe) [se me olvidó] @bring {goods} #h:dg_admit",
      "(me dieron | compré | guardé) {goods} en el avion", "[si] (quiero | tengo que | necesito | debo) declarar {goods} #h:dc_declare",
      "[si] (es | era | son | eran) {goods} del avion",
      // "No traigo fruta, (pero) traigo chocolates": one answer, the chocolates are declared
      "no (traigo | tengo | llevo) [nada de | ningun | ninguna] ({good} | @no_food) [ni ({good} | @no_food)] [pero | solo | sino | nada mas] @bring {goods}",
      "no (traigo | tengo | llevo) [nada de | ningun | ninguna] ({good} | @no_food) [ni ({good} | @no_food)] (solo | nada mas | nomas | sino | pero si) {goods}",
      "(pero | y) @bring {goods}",
      // "No traigo nada, solo una manzana": the apple is declared
      "[no] no (traigo | tengo | llevo) nada (pero | solo | nada mas | mas que | excepto | salvo | nomas) [@bring] {goods}", "[no] nada (mas que | excepto | salvo | solo | nomas) {goods}",
      // "No es una manzana, es un plátano"
      "no (es | era) [un | una] {wrong:good} (es | sino | era) {goods}",
      "@bring [un | una | unos | unas] {wrong:good} [no] (perdon | mejor dicho | digo) {goods}",
      // the gifts and their value in one answer: "Traigo unos regalos, pero valen menos de quinientos dólares"
      "[si] @bring {goods} [pero | y] (valen | cuestan | costaron | son) (menos de | no mas de) {gnum:amount} [dolares] [en total] #lt",
      "[si] @bring {goods} [pero | y] (valen | cuestan | costaron | son) mas de {gnum:amount} [dolares] [en total] #gt",
      "[si] @bring {goods} [pero | y] (valen | cuestan | costaron | son) [como | unos | mas o menos | aproximadamente | casi] {gnum:amount} [dolares] [en total]",
      "[si] @bring {goods} de menos de {gnum:amount} [dolares] #lt", "[si] @bring {goods} de mas de {gnum:amount} [dolares] #gt",
      "[si] @bring {goods} de [como | unos] {gnum:amount} dolares",
    ] },
    // "Una manzana", "Sí, unos chocolates": the bare answer, at Medina's questions only
    declare_items_ctx: { patterns: ["[si] {goods}"] },
    declare_q: { patterns: [
      "(puedo | se puede | se pueden) (traer | pasar con | entrar con | meter | ingresar | introducir | pasar) {goods} [a mexico | al pais] #h:dc_can",
      "{good} (esta | estan) (permitido | permitida | permitidos | permitidas | prohibido | prohibida | prohibidos | prohibidas)",
      "(hay | habra) [algun] problema (con | si traigo) {goods}",
      "(y si | que pasa si) (traigo | tengo | llevo | trajera) {goods}",
      "no (se | estoy seguro | estoy segura) si (tengo que | hay que | debo) declarar (algo | esto | eso | {goods})",
    ] },
    // "Traigo dos mil dólares en efectivo": cash is declared only over 10,000 dollars (the money declaration form)
    declare_cash: { patterns: [
      "[si] (traigo | tengo | llevo) [como | unos | unas | mas de | menos de | casi] {number:amount} (dolares | pesos | euros) [en efectivo] #h:dc_cash",
      "[si] (traigo | tengo | llevo) (dinero | efectivo | dinero en efectivo | dolares | algo de efectivo | algo de dinero)",
    ] },
    // a bare amount ("Dos mil dólares en efectivo") only where Medina asks what the learner brings
    declare_cash_ctx: { patterns: ["[si] [como | unos | unas | mas de | menos de | casi] {number:amount} (dolares | pesos | euros) [en efectivo]"] },
    q_form: { patterns: [
      "(tengo que | hay que | debo | necesito) (llenar | rellenar) (algun | un | el | una | la | alguna) (formulario | forma | formato | declaracion | papel | documento) [de aduana | de la aduana] #h:q_form",
      "(hay | necesito | ocupo) (algun | un | una) (formulario | formato | forma | declaracion) [de aduana]", "donde (esta | estan) (el formulario | la forma | la declaracion | los formularios)",
    ] },
    q_button: { patterns: [
      "(tengo que | hay que | debo) (apretar | presionar | picar | oprimir) el boton [del semaforo] #h:q_button", "donde (esta | queda) el (semaforo | boton)",
      "(hay | no hay) (semaforo | boton)", "(y | donde esta) el semaforo",
    ] },
    q_allowance: { patterns: [
      "cuanto (puedo | se puede) (traer | pasar | ingresar | meter) [sin pagar [impuestos] | libre de impuestos | sin impuestos] #h:q_allowance",
      "cual es (la franquicia | el limite)", "(hay | tienen) (un limite | una franquicia)",
    ] },
    q_cash: { patterns: [
      "(tengo que | hay que | debo) declarar (el | mi) (dinero | efectivo) [en efectivo] #h:q_cash", "(tengo que | hay que | debo) declarar (el efectivo | dolares | dinero | el dinero que traigo)",
    ] },
    // "¿Qué tengo que declarar?"
    q_what_declare: { patterns: ["que (tengo que | hay que | debo | se tiene que | se debe | necesito) declarar", "que (cosas | productos) (tengo que | hay que | se tienen que | se deben) declarar", "que se declara"] },
    // "¿Puedo traer mi laptop?", "¿Tengo que declarar el tequila?": personal luggage, nothing to declare
    q_personal: { patterns: [
      "(puedo | se puede | se pueden) (traer | pasar | pasar con | entrar con | meter | ingresar | ingresar con) [mi | mis | una | un | unos | unas | dos | tres | el | la | los | las] @pers_item [a mexico | al pais]",
      "(tengo que | hay que | debo | necesito) declarar [mi | mis | una | un | unos | unas | dos | tres | el | la | los | las] @pers_item",
      "[mi | mis | el | la | los | las] @pers_item (se declara | se declaran | hay que declararlo | hay que declararla | hay que declararlos | hay que declararlas)",
    ] },
    // "Traigo una botella de tequila", "Traigo cigarros": inside the personal luggage (at customs only)
    personal_ctx: { patterns: ["[si] [@bring] [mi | mis | una | un | unos | unas | dos | tres] (@liquor | @tobacco) [del duty free | del free shop | para mi]",
      "[no] (solo | nada mas | nomas | solamente) [@bring] [mi | mis | una | un | unos | unas | dos | tres] (@liquor | @tobacco) [del duty free | del free shop | para mi]"] },
    // "No sé cuánto valen": she helps with a rough estimate (the gifts' question only)
    gift_dunno_ctx: { patterns: ["no (se | estoy seguro | estoy segura) (cuanto | cuanto dinero) (valen | cuestan | costaron | me costaron)", "ni idea [de cuanto (valen | cuestan | costaron)]", "no me acuerdo (cuanto | de cuanto) (costaron | me costaron)"] },
    // "No, solo una pregunta" answers Itzel's "¿Algo más?" without ending her part
    one_more_q_ctx: { patterns: ["[no] [solo | nada mas | nomas] (una pregunta | otra pregunta | una duda | otra duda | una cosa | otra cosa) [mas | nada mas]", "[si] (tengo | tenia) (una pregunta | otra pregunta | una duda | otra duda)"] },
    q_cash_amount: { patterns: ["cuanto (dinero | efectivo) (puedo | se puede) (traer | pasar | entrar con | ingresar)", "hay (un | algun) limite (de | para el) (dinero | efectivo)"] },
    // why fresh fruit can't come in
    q_why: { patterns: [
      "por que no (puede | puedo | se puede | pueden) (pasar | entrar | traer | traerla | traerlo) [la | una | el | un | esa | ese] [fruta | manzana | comida | carne | sandwich | eso] #h:q_why",
      "por que (no se puede | esta prohibido | esta prohibida | me la quitan | me lo quitan | se la quedan | se lo quedan)",
    ] },
    q_why_ctx: { patterns: ["por que", "que pasa", "que tiene de malo", "cual es el problema"] },
    // "Perdón, no me acordaba" after the fruit is found (at the dog's question or Medina's "Puede pasar")
    sorry_ctx: { patterns: ["[perdon | lo siento | disculpe | una disculpa] (no me acordaba | no me acordé | se me olvidó | lo olvidé | no lo sabia | no sabia)"] },
    // "¿Y si valen más de quinientos?": a what-if, never a value
    gift_whatif_ctx: { patterns: ["(y si | que pasa si) (valen | cuestan | son) menos [de {number} [dolares]]", "(y si | que pasa si) (valen | cuestan | son) mas [de {number} [dolares]]", "(y si | que pasa si) (me paso | paso de [los] {number} [dolares])"] },
    // "¿Valen más de quinientos dólares?"
    gift_value_ctx: { patterns: [
      "[no] [son | valen | es | seran | creo que] (menos de | no mas de | ni) {number:amount} [dolares] #lt #h:gv_under", "[si] [son | valen | es | creo que] mas de {number:amount} [dolares] #gt #h:gv_over",
      "[no] [son | valen | es | seran | creo que] [como | unos | unas | mas o menos | aproximadamente | casi] {number:amount} [dolares] [exactos | exactamente | justos | en total]",
      "[no] (menos | mucho menos | menos de eso | no tanto | no llegan | no tanto como eso) #lt",
      "(me costaron | costaron | me costó | pagué | me salieron | salieron) [como | unos | mas o menos | casi] {number:amount} [dolares]",
      "[no] no (valen | cuestan | son | costaron) tanto #lt", "[no] no (pasan | llegan) (de | a) [los] {number:amount} [dolares] #lt", "[si] (valen | cuestan | costaron) mas [de eso | de quinientos] #gt", "[si] (mas | un poco mas | mucho mas | mas de eso | algo mas) #gt",
    ] },
    g_spell: { patterns: [...GLOBAL_INTENTS.g_spell.patterns, "me lo (deletrea | puede deletrear | podria deletrear)", "(deletreemelo | deletreelo)"] },
    g_write: { patterns: [...GLOBAL_INTENTS.g_write.patterns, "(me lo | lo) (puede | podria) (anotar | apuntar)", "me lo (anota | apunta)"] },
  },

  lines: {
    greet: [
      t("¡Buenas tardes! | ¿En | qué | le | puedo | ayudar?", "Good afternoon! | In | what | (to) you | can I | help?", "Good afternoon! How can I help you?"),
      t("¡Hola! | ¿Qué | se le ofrece?", "Hi! | What | do you need?", "Hi! What can I do for you?", { flags: { 2: "se le ofrece: the polite formula of shop and service staff, literally is offered to you." } }),
      t("¡Siguiente, | por favor! | ¿En | qué | le | ayudo?", "Next, | please! | In | what | (to) you | I-help?", "Next, please! How can I help?"),
    ],
    ask_help: [t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?")],
    problem_help: [t("¿Es | por | una | maleta | que | no llegó?", "Is it | about | a | suitcase | that | didn't arrive?", "Is it about a bag that didn't arrive?", { spain: t("¿Es | por | una | maleta | que | no ha llegado?", "Is it | about | a | suitcase | that | hasn't arrived?", "Is it about a bag that didn't arrive?") })],
    what_happened: [t("Claro. | ¿Qué | pasó?", "Sure. | What | happened?", "Of course. What happened?", { spain: t("Claro. | ¿Qué | ha | pasado?", "Sure. | What | has | happened?", "Of course. What happened?") })],
    sorry_bag: [
      t("Ay, | lo siento | mucho.", "Oh, | I'm sorry | very much.", "Oh, I'm so sorry."),
      t("Lamento | escuchar | eso. | Vamos | a | ver | qué | podemos | hacer.", "I regret | to hear | that. | We're going | to | see | what | we can | do.", "I'm sorry to hear that. Let's see what we can do."),
      t("¡Ay, | no! | No se preocupe, | lo | vamos | a | resolver.", "Oh, | no! | Don't worry, | it | we're going | to | sort out.", "Oh no! Don't worry, we'll sort it out.",
        { flags: { 3: "lo: it, the problem in general." } }),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Entendido.", "Understood.", "Got it."), t("De acuerdo.", "Agreed.", "All right.")],
    thank_you: [t("Gracias.", "Thank you.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thanks a lot.")],
    // Flight and tag
    ask_flight: [
      t("¿En | qué | vuelo | llegó?", "On | what | flight | did you arrive?", "What flight were you on?", { spain: t("¿En | qué | vuelo | ha | llegado?", "On | what | flight | have you | arrived?", "What flight were you on?") }),
      t("¿Me | da | su | número | de | vuelo?", "(To) me | you-give | your | number | of | flight?", "Can I have your flight number?"),
    ],
    flight_help: [t("Viene | en | su | pase de abordar.", "It comes | on | your | boarding pass.", "It's on your boarding pass.",
      { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
        neutral: t("Viene | en | su | tarjeta de embarque.", "It comes | on | your | boarding pass.", "It's on your boarding pass.") })],
    ask_from: [t("Está bien. | ¿De | qué | ciudad | venía?", "That's fine. | From | what | city | were you coming?", "That's okay. Which city did you fly in from?")],
    ask_connection: [
      t("¿Hizo | escala?", "Did you make | a stopover?", "Did you have a connection?", { flags: { 1: "hacer escala: to stop over; Spanish needs no article here." }, spain: t("¿Ha | hecho | escala?", "Have you | made | a stopover?", "Did you have a connection?", {flags: {2: "hacer escala: to stop over; Spanish needs no article here."}}) }),
      t("¿Tuvo | alguna | conexión?", "Did you have | any | connection?", "Did you have a connecting flight?"),
    ],
    ask_tag: [
      t("¿Tiene | el | comprobante | de | su | equipaje?", "Do you have | the | claim tag | of | your | luggage?", "Do you have your baggage claim tag?"),
      t("¿Me | permite | su | comprobante | de | equipaje? | Normalmente | viene | pegado | en | su | pase de abordar.", "(To) me | you-allow | your | claim tag | of | luggage? | Usually | it comes | stuck | on | your | boarding pass.",
        "Can I see your baggage claim tag? It's usually stuck to your boarding pass.",
        { flags: { 11: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¿Me | permite | su | comprobante | de | equipaje? | Normalmente | viene | pegado | en | su | tarjeta de embarque.", "(To) me | you-allow | your | claim tag | of | luggage? | Usually | it comes | stuck | on | your | boarding pass.",
            "Can I see your baggage claim tag? It's usually stuck to your boarding pass."), spain: t("¿Me | deja | su | comprobante | de | equipaje? | Normalmente | viene | pegado | en | su | tarjeta de embarque.", "(To) me | you-let-have | your | claim tag | of | luggage? | Usually | it comes | stuck | on | your | boarding pass.", "Can I see your baggage claim tag? It's usually stuck to your boarding pass.") }),
    ],
    tag_thanks: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you.")],
    tag_none: [t("No hay problema. | Puedo | buscarla | con | su | nombre | y | su | vuelo.", "No problem. | I can | look for it | with | your | name | and | your | flight.", "No problem. I can find it with your name and flight.",
      { flags: { 2: "buscarla: la is the bag (la maleta)." } })],
    checking: [
      t("Déjeme | revisar | en | el | sistema.", "Let me | check | in | the | system.", "Let me check the system."),
      t("Un | momento, | déjeme | ver.", "One | moment, | let me | see.", "One moment, let me look."),
    ],
    not_in_system: [
      t("Mmm, | todavía | no aparece | en | el | sistema. | Vamos | a | hacer | un | reporte.", "Hmm, | still | it doesn't show up | in | the | system. | We're going | to | make | a | report.", "Hmm, it's not showing up in the system yet. Let's file a report.", { spain: t("Mmm, | todavía | no aparece | en | el | sistema. | Vamos | a | hacer | un | parte.", "Hmm, | still | it doesn't show up | in | the | system. | We're going | to | make | a | report.", "Hmm, it's not showing up in the system yet. Let's file a report.") }),
      t("Todavía | no aparece, | así que | vamos | a | hacer | un | reporte.", "Still | it doesn't show up, | so | we're going | to | make | a | report.", "It's not in the system yet, so let's file a report.", { spain: t("Todavía | no aparece, | así que | vamos | a | hacer | un | parte.", "Still | it doesn't show up, | so | we're going | to | make | a | report.", "It's not in the system yet, so let's file a report.") }),
    ],
    found_it: [
      t("¡Buenas | noticias! | Ya | la | encontramos.", "Good | news! | Already | it | we-found.", "Good news! We found it.", { flags: { 3: "la: it, the bag (la maleta)." }, spain: t("¡Buenas | noticias! | Ya | la | hemos | encontrado.", "Good | news! | Already | it | we-have | found.", "Good news! We found it.", {flags: {3: "la: it, the bag (la maleta)."}}) }),
      t("Ah, | buenas | noticias: | ya | aparece | en | el | sistema.", "Oh, | good | news: | now | it shows up | in | the | system.", "Oh, good news: I can see it in the system."),
    ],
    still_in: [t("Se quedó | en | {X}.", "It stayed | in | {X}.", "It's still in {X}.", { spain: t("Se ha quedado | en | {X}.", "It has stayed | in | {X}.", "It's still in {X}.") })],
    next_flight: [t("Llega | mañana | en | el | primer | vuelo.", "It arrives | tomorrow | on | the | first | flight.", "It's coming tomorrow on the first flight.")],
    // Description
    ask_describe: [
      t("¿Me | puede | describir | su | equipaje?", "(To) me | can you | describe | your | luggage?", "Can you describe your bag?"),
      t("¿Cómo | es | su | equipaje?", "How | is | your | luggage?", "What does your bag look like?"),
    ],
    ask_type: [t("¿Es | una | maleta, | una | mochila | o | una | bolsa | de | viaje?", "Is it | a | suitcase, | a | backpack | or | a | bag | for | travel?", "Is it a suitcase, a backpack, or a duffel bag?")],
    ask_color: [t("¿De | qué | color | es?", "Of | what | color | is it?", "What color is it?"), t("¿Y | de | qué | color?", "And | of | what | color?", "And what color?")],
    ask_size: [
      t("¿De | qué | tamaño | es? | ¿Chica, | mediana | o | grande?", "Of | what | size | is it? | Small, | medium | or | large?", "What size is it? Small, medium, or large?", { spain: t("¿De | qué | tamaño | es? | ¿Pequeña, | mediana | o | grande?", "Of | what | size | is it? | Small, | medium | or | large?", "What size is it? Small, medium, or large?") }),
      t("¿Qué tan | grande | es?", "How | big | is it?", "How big is it?", { spain: t("¿Cómo de | grande | es?", "How | big | is it?", "How big is it?") }),
    ],
    ask_material: [t("¿Es | rígida | o | de | tela?", "Is it | hard-shell | or | of | fabric?", "Is it hard-shell or soft-sided?")],
    ask_marks: [
      t("¿Tiene | algo | que | la | distinga? | ¿Un | listón, | calcomanías, | una | etiqueta | con | su | nombre?",
        "Does it have | something | that | it | sets apart? | A | ribbon, | stickers, | a | tag | with | your | name?",
        "Is there anything that makes it stand out? A ribbon, stickers, a name tag?",
        { flags: { 3: "la: it, the bag (la maleta).", 6: "Mexican: listón = ribbon; elsewhere cinta." },
          neutral: t("¿Tiene | algo | que | la | distinga? | ¿Una | cinta, | calcomanías, | una | etiqueta | con | su | nombre?",
            "Does it have | something | that | it | sets apart? | A | ribbon, | stickers, | a | tag | with | your | name?",
            "Is there anything that makes it stand out? A ribbon, stickers, a name tag?", { flags: { 3: "la: it, the bag (la maleta)." } }), spain: t("¿Tiene | algo | que | la | distinga? | ¿Una | cinta, | pegatinas, | una | etiqueta | con | su | nombre?", "Does it have | something | that | it | sets apart? | A | ribbon, | stickers, | a | tag | with | your | name?", "Is there anything that makes it stand out? A ribbon, stickers, a name tag?", {flags: {3: "la: it, the bag (la maleta)."}}) }),
      t("¿Tiene | alguna | seña | particular?", "Does it have | any | mark | distinctive?", "Does it have any distinguishing marks?"),
    ],
    ask_brand: [t("¿Sabe | de | qué | marca | es?", "Do you know | of | what | brand | it is?", "Do you know the brand?")],
    echo: [
      t("Entonces, | {X.np}.", "So, | {X.np}.", "So, {X.np}."),
      t("Muy | bien, | {X.np}. | Anotado.", "Very | good, | {X.np}. | Noted.", "Okay, {X.np}. Got it."),
    ],
    // "azul marino" doesn't agree (never "azul marina"): it follows the noun phrase instead
    echo_navy: [t("Entonces, | {X.np} | azul marino.", "So, | {X.np} | navy blue.", "So, {X.np} in navy blue.")],
    helpful: [
      t("Perfecto, | eso | ayuda | mucho.", "Perfect, | that | helps | a lot.", "Great, that helps a lot."),
      t("Muy | bien, | eso | nos | sirve | mucho.", "Very | good, | that | (to) us | is useful | a lot.", "Great, that's very helpful."),
    ],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    marks_what: [t("¿Qué | tiene?", "What | does it have?", "What's on it?")],
    brand_which: [t("¿De | qué | marca?", "Of | what | brand?", "Which brand?")],
    fix_ok: [t("Ah, | perdón. | Lo | corrijo.", "Oh, | sorry. | It | I-correct.", "Oh, sorry. Let me fix that.")],
    // Contents
    ask_contents: [t("¿Qué | lleva | adentro, | más o menos?", "What | does it carry | inside, | more or less?", "What's in it, roughly?", { spain: t("¿Qué | lleva | dentro, | más o menos?", "What | does it carry | inside, | more or less?", "What's in it, roughly?") })],
    ask_valuable: [t("¿Lleva | algo | de | valor | adentro?", "Does it carry | something | of | value | inside?", "Is there anything valuable in it?", { spain: t("¿Lleva | algo | de | valor | dentro?", "Does it carry | something | of | value | inside?", "Is there anything valuable in it?") })],
    contents_what: [t("¿Qué | lleva?", "What | does it carry?", "What's in it?")],
    contents_ok: [t("Muy | bien, | lo | anoto.", "Very | good, | it | I-note-down.", "Okay, I'll note that.")],
    contents_valuables: [
      t("Lo | anoto. | Para | la | próxima, | lleve | los | objetos | de | valor | en | su | equipaje | de | mano.",
        "It | I-note-down. | For | the | next (time), | carry | the | items | of | value | in | your | luggage | of | hand.",
        "I'll note that. Next time, keep valuables in your carry-on."),
    ],
    advice_valuables: [t("Para | la | próxima, | lleve | los | objetos | de | valor | en | su | equipaje | de | mano.",
      "For | the | next (time), | carry | the | items | of | value | in | your | luggage | of | hand.", "Next time, keep valuables in your carry-on.")],
    advice_medicine: [t("Y | si | necesita | sus | medicinas | hoy, | cómprelas | en | una | farmacia.", "And | if | you need | your | medicines | today, | buy them | at | a | pharmacy.",
      "And if you need your medicine today, buy some at a pharmacy.")],
    contents_medicine: [t("Si | necesita | sus | medicinas | hoy, | cómprelas | en | una | farmacia | y | guarde | el | recibo.",
      "If | you need | your | medicines | today, | buy them | at | a | pharmacy | and | keep | the | receipt.", "If you need your medicine today, buy some at a pharmacy and keep the receipt.")],
    // Delivery, hotel, phone
    ask_delivery: [
      t("Se la | podemos | llevar | a | su | hotel. | ¿Le parece | bien?", "It to you | we can | take | to | your | hotel. | Does it seem to you | good?", "We can deliver it to your hotel. Would you like that?"),
      t("¿Quiere | que | se la | llevemos | a | su | hotel?", "Do you want | that | it to you | we-take | to | your | hotel?", "Would you like us to deliver it to your hotel?"),
    ],
    // the learner has already said they aren't at a hotel ("Estoy en casa de una amiga")
    ask_delivery_stay: [t("Se la | podemos | llevar | a | donde | se está | quedando. | ¿Le parece | bien?", "It to you | we can | take | to | where | you're | staying. | Does it seem to you | good?",
      "We can deliver it to where you're staying. Would you like that?")],
    // "No, al hotel no": a pickup or another address? (rule 10: ask, don't guess)
    ask_pickup_or_address: [
      t("¿Prefiere | recogerla | aquí, | o | se la | llevamos | a | otra | dirección?", "Do you prefer | to pick it up | here, | or | it to you | we-take | to | another | address?",
        "Would you rather pick it up here, or should we deliver it to another address?"),
      t("Entonces, | ¿la | recoge | aquí | o | se la | llevamos | a | otra | dirección?", "Then, | it | you-pick-up | here | or | it to you | we-take | to | another | address?",
        "So, will you pick it up here, or should we deliver it somewhere else?", { flags: { 1: "la: it, the bag (an object pronoun, not an article)." } }),
    ],
    delivery_ok: [
      // the bag isn't found yet: the time stays "usually" (as in ans_when), never a promise
      t("Perfecto. | Normalmente | se la | llevamos | en | menos | de | 24 | horas.", "Perfect. | Usually | it to you | we-take | in | less | than | 24 | hours.", "Great. We usually deliver within 24 hours.",
        { say: "Perfecto. Normalmente se la llevamos en menos de veinticuatro horas." }),
      t("Muy | bien. | Normalmente | tarda | menos | de | un | día.", "Very | good. | Usually | it takes | less | than | a | day.", "Great. It usually takes less than a day."),
    ],
    delivery_ok_found: [t("Perfecto. | Se la | llevamos | en cuanto | llegue.", "Perfect. | It to you | we-take | as soon as | it arrives.", "Great. We'll bring it to you as soon as it gets here.")],
    pickup_ok: [t("Muy | bien, | puede | recogerla | aquí, | en | este | mostrador.", "Very | good, | you can | pick it up | here, | at | this | counter.", "Okay, you can pick it up here, at this desk.")],
    ask_hotel: [
      t("¿Dónde | se está | hospedando?", "Where | are you | staying?", "Where are you staying?"),
      t("¿Y | dónde | se hospeda?", "And | where | are you staying?", "And where are you staying?"),
    ],
    ask_deliver_where: [t("¿A | qué | dirección | se la | llevamos?", "To | what | address | it to you | do we take?", "What address should we deliver it to?")],
    // "No sé la dirección" when the bag is to be delivered
    addr_later: [t("No se preocupe: | le | llamamos | para | pedirle | la | dirección.", "Don't worry: | (to) you | we-call | to | ask you for | the | address.",
      "Don't worry, we'll call you to get the address.")],
    ask_phone: [
      t("¿Me | da | un | número | de | teléfono | para | {m:localizarlo|f:localizarla}?", "(To) me | you-give | a | number | of | telephone | to | reach you?", "What's the best phone number to reach you?",
        { flags: { 7: "localizarlo / localizarla: reach you; lo for a man, la for a woman." } }),
      t("¿Y | un | teléfono, | por favor?", "And | a | phone, | please?", "And a phone number, please?"),
    ],
    phone_ok: [t("Listo, | gracias.", "Done, | thanks.", "Got it, thank you.", { spain: t("Perfecto, | gracias.", "Perfect, | thanks.", "Got it, thank you.") })],
    phone_none_ok: [t("No se preocupe. | Llamamos | al | hotel.", "Don't worry. | We'll call | the | hotel.", "That's okay. We'll call your hotel.")],
    phone_none_call_us: [t("No se preocupe. | Usted | nos | puede | llamar: | el | teléfono | viene | en | el | reporte.", "Don't worry. | You | us | can | call: | the | phone number | comes | on | the | report.",
      "That's okay. You can call us; our number is on the report.", { spain: t("No se preocupe. | Usted | nos | puede | llamar: | el | teléfono | viene | en | el | parte.", "Don't worry. | You | us | can | call: | the | phone number | comes | on | the | report.", "That's okay. You can call us; our number is on the report.") })],
    // Courtesy kit and reimbursement
    offer_kit: [
      t("¿Le | doy | un | kit | de | cortesía? | Tiene | cepillo | de | dientes, | pasta | y | una | playera.",
        "(To) you | I-give | a | kit | of | courtesy? | It has | brush | of | teeth, | toothpaste | and | a | T-shirt.",
        "Would you like a free overnight kit? It has a toothbrush, toothpaste, and a T-shirt.",
        { flags: { 13: "Mexican: playera = T-shirt; elsewhere camiseta." },
          neutral: t("¿Le | doy | un | kit | de | cortesía? | Tiene | cepillo | de | dientes, | pasta | y | una | camiseta.",
            "(To) you | I-give | a | kit | of | courtesy? | It has | brush | of | teeth, | toothpaste | and | a | T-shirt.",
            "Would you like a free overnight kit? It has a toothbrush, toothpaste, and a T-shirt.") }),
    ],
    kit_here: [t("Aquí tiene.", "Here you go.", "Here you go."), t("Tenga.", "Take it.", "Here you are.")],
    // "¿Cuánto cuesta?" while the kit is offered; then the offer again, in short
    ans_kit_free: [t("No tiene | costo, | es | de | cortesía.", "It doesn't have | cost, | it's | of | courtesy.", "It's free; it's complimentary.", { spain: t("No tiene | coste, | es | de | cortesía.", "It doesn't have | cost, | it's | of | courtesy.", "It's free; it's complimentary.") })],
    kit_again: [t("¿Entonces | se lo | doy?", "So | it to you | I-give?", "So, shall I give you one?")],
    buy_basics: [t("Puede | comprar | lo | indispensable | para | hoy.", "You can | buy | the | essentials | for | today.", "You can buy the basics for tonight.")],
    receipts: [t("Guarde | sus | recibos: | le | reembolsamos | los | gastos | básicos.", "Keep | your | receipts: | (to) you | we-refund | the | expenses | basic.", "Keep your receipts, and we'll reimburse basic expenses.")],
    // Report number
    ref_a: [t("Este | es | su | número | de | reporte: | PC-47219.", "This | is | your | number | of | report: | PC-47219.", "Here's your report number: PC-47219.",
      { say: "Este es su número de reporte: pe, ce, cuatro, siete, dos, uno, nueve.", write: "Reporte de equipaje: PC-47219", spain: t("Este | es | su | número | de | referencia: | PC-47219.", "This | is | your | number | of | reference: | PC-47219.", "Here's your reference number: PC-47219.", {say: "Este es su número de referencia: pe, ce, cuatro, siete, dos, uno, nueve."}) })],
    ref_b: [t("Este | es | su | número | de | reporte: | PC-58306.", "This | is | your | number | of | report: | PC-58306.", "Here's your report number: PC-58306.",
      { say: "Este es su número de reporte: pe, ce, cinco, ocho, tres, cero, seis.", write: "Reporte de equipaje: PC-58306", spain: t("Este | es | su | número | de | referencia: | PC-58306.", "This | is | your | number | of | reference: | PC-58306.", "Here's your reference number: PC-58306.", {say: "Este es su número de referencia: pe, ce, cinco, ocho, tres, cero, seis."}) })],
    ref_track: [
      // the brief teaches "reclamo de equipaje" (the hall's sign): her desk is in it (the lead's decision, 5 Nov 2026)
      t("Con | ese | número | puede | consultar | el | estado | en línea, | o | preguntar | aquí, | en | reclamo de equipaje.",
        "With | that | number | you can | check | the | status | online, | or | ask | here, | at | baggage claim.",
        "You can check the status online with that number, or ask here at baggage claim.",
        { flags: { 12: "reclamo de equipaje: baggage claim, the hall where the bags come out (and this desk)." },
          spain: t("Con | ese | número | puede | consultar | el | estado | por internet, | o | preguntar | aquí, | en | la | recogida de equipajes.",
            "With | that | number | you can | check | the | status | online, | or | ask | here, | at | the | baggage claim.",
            "You can check the status online with that number, or ask here at baggage claim.",
            { flags: { 13: "recogida de equipajes: baggage claim (Spain's name for the hall where the bags come out)." } }) }),
      t("Viene | en | esta | copia | del | reporte.", "It comes | on | this | copy | of the | report.", "It's on this copy of the report.", { spain: t("Viene | en | esta | copia | del | parte.", "It comes | on | this | copy | of the | report.", "It's on this copy of the report.") }),
    ],
    spell_a: [t("Claro: | P-C, | 4-7-2-1-9.", "Sure: | P-C, | 4-7-2-1-9.", "Sure: P-C, 4-7-2-1-9.", { say: "Claro: pe, ce, cuatro, siete, dos, uno, nueve." })],
    spell_b: [t("Claro: | P-C, | 5-8-3-0-6.", "Sure: | P-C, | 5-8-3-0-6.", "Sure: P-C, 5-8-3-0-6.", { say: "Claro: pe, ce, cinco, ocho, tres, cero, seis." })],
    write_ref: [t("Claro, | aquí | se lo | anoto | en | esta | tarjeta.", "Sure, | here | it for you | I-write-down | on | this | card.", "Sure, I'll write it on this card for you.")],
    ref_soon: [t("En | un | momento | se lo | doy.", "In | a | moment | it to you | I-give.", "I'll give it to you in a minute.")],
    // "¿Cuál es su teléfono?" once the report is given
    ans_contact: [t("El | teléfono | viene | en | esta | copia | del | reporte.", "The | phone number | comes | on | this | copy | of the | report.", "Our phone number is on this copy of the report.", { spain: t("El | teléfono | viene | en | esta | copia | del | parte.", "The | phone number | comes | on | this | copy | of the | report.", "Our phone number is on this copy of the report.") })],
    // Closing
    anything_else: [
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | else?", "Can I help you with anything else?"),
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Something | else | in | which | (to) you | I can | help?", "Is there anything else I can do for you?"),
    ],
    closing: [
      t("De nuevo, | disculpe | las | molestias.", "Again, | excuse | the | inconvenience.", "Again, I'm sorry for the trouble."),
      t("¡Que | tenga | buena | tarde!", "May | you have | good | afternoon!", "Have a good afternoon!", { neutral: t("¡Que | tenga | una | buena | tarde!", "May | you have | a | good | afternoon!", "Have a good afternoon!") }),
    ],
    you_welcome: [t("De nada. | ¡Que | tenga | buena | tarde!", "You're welcome. | May | you have | good | afternoon!", "You're welcome. Have a good afternoon!", { neutral: t("De nada. | ¡Que | tenga | una | buena | tarde!", "You're welcome. | May | you have | a | good | afternoon!", "You're welcome. Have a good afternoon!") })],
    // Answers to the learner's questions
    ans_when: [t("Normalmente | en | menos | de | 24 | horas.", "Usually | in | less | than | 24 | hours.", "Usually within 24 hours.", { say: "Normalmente en menos de veinticuatro horas." })],
    ans_when_found: [t("Mañana, | en cuanto | llegue | el | primer | vuelo.", "Tomorrow, | as soon as | arrives | the | first | flight.", "Tomorrow, as soon as the first flight gets in.")],
    ans_call: [t("Sí, | le | llamamos | o | le | mandamos | un | mensaje | cuando | llegue.", "Yes, | (to) you | we-call | or | (to) you | we-send | a | message | when | it arrives.",
      "Yes, we'll call or text you when it arrives.")],
    ans_track: [t("Sí, | en línea, | con | su | número | de | reporte.", "Yes, | online, | with | your | number | of | report.", "Yes, online, with your report number.", { spain: t("Sí, | por internet, | con | su | número | de | referencia.", "Yes, | online, | with | your | number | of | reference.", "Yes, online, with your reference number.") })],
    ans_free: [t("La | entrega | es | gratis, | no tiene | ningún | costo.", "The | delivery | is | free, | it doesn't have | any | cost.", "Delivery is free; there's no charge.", { spain: t("La | entrega | es | gratis, | no tiene | ningún | coste.", "The | delivery | is | free, | it doesn't have | any | cost.", "Delivery is free; there's no charge.") })],
    ans_what_if: [t("No se preocupe. | Casi | todas | las | maletas | aparecen | en | unos | días.", "Don't worry. | Almost | all | the | bags | turn up | in | a few | days.",
      "Don't worry. Almost all bags turn up within a few days.")],
    ans_copy: [t("Claro, | le | doy | una | copia | del | reporte.", "Sure, | (to) you | I-give | a | copy | of the | report.", "Sure, I'll give you a copy of the report.", { spain: t("Claro, | le | doy | una | copia | del | parte.", "Sure, | (to) you | I-give | a | copy | of the | report.", "Sure, I'll give you a copy of the report.") })],
    ans_taxi: [t("Los | taxis | están | a | la | salida, | a la izquierda.", "The | taxis | are | at | the | exit, | on the left.", "The taxis are by the exit, on the left.")],
    ans_shop: [t("Hay | una | tiendita | junto | a | la | salida.", "There is | a | little shop | next | to | the | exit.", "There's a little shop next to the exit.", { spain: t("Hay | una | tienda | junto | a | la | salida.", "There is | a | shop | next | to | the | exit.", "There's a little shop next to the exit.") })],
    // ---- Customs: Agente Medina ----
    customs_later: [t("Eso | lo | ve | en | la | aduana, | a | la | salida.", "That | it | you-see (about) | at | — | customs, | at | the | exit.", "You'll deal with that at customs, on the way out.",
      { flags: { 4: "la aduana: Spanish uses the article; English says just customs." } })],
    ask_baggage_desk: [t("Eso | lo | ve | en | el | mostrador | de | equipaje.", "That | it | you-see (about) | at | the | desk | of | baggage.", "You'll need to ask at the baggage desk about that.")],
    customs_greet: [
      t("Buenas tardes. | ¿Trae | algo | que declarar?", "Good afternoon. | Do you bring | anything | to declare?", "Good afternoon. Anything to declare?", { spain: t("Buenas tardes. | ¿Tiene | algo | que declarar?", "Good afternoon. | Do you have | anything | to declare?", "Good afternoon. Anything to declare?") }),
      t("Buenas tardes. | ¿Algo | que declarar?", "Good afternoon. | Anything | to declare?", "Good afternoon. Anything to declare?"),
    ],
    customs_greet_food: [t("Buenas tardes. | ¿Trae | algo | que declarar? | ¿Fruta, | carne, | algún | alimento?", "Good afternoon. | Do you bring | anything | to declare? | Fruit, | meat, | any | food?",
      "Good afternoon. Anything to declare? Any fruit, meat, or other food?", { spain: t("Buenas tardes. | ¿Tiene | algo | que declarar? | ¿Fruta, | carne, | algún | alimento?", "Good afternoon. | Do you have | anything | to declare? | Fruit, | meat, | any | food?", "Good afternoon. Anything to declare? Any fruit, meat, or other food?") })],
    customs_again: [t("¿Trae | algo | que declarar?", "Do you bring | anything | to declare?", "Do you have anything to declare?", { spain: t("¿Tiene | algo | que declarar?", "Do you have | anything | to declare?", "Do you have anything to declare?") })],
    customs_again2: [t("Entonces, | ¿algo | que declarar?", "So, | anything | to declare?", "So, anything to declare?")],
    ask_food: [
      t("¿Trae | fruta, | carne | o | algún | otro | alimento?", "Do you bring | fruit, | meat | or | any | other | food?", "Are you bringing any fruit, meat, or other food?", { spain: t("¿Lleva | fruta, | carne | o | algún | otro | alimento?", "Do you bring | fruit, | meat | or | any | other | food?", "Are you bringing any fruit, meat, or other food?") }),
      t("¿Y | algún | alimento? | ¿Fruta, | carne, | queso?", "And | any | food? | Fruit, | meat, | cheese?", "And any food? Fruit, meat, cheese?"),
    ],
    customs_what: [t("Muy | bien. | ¿Qué | trae?", "Very | good. | What | do you bring?", "Okay. What do you have?", { spain: t("Muy | bien. | ¿Qué | lleva?", "Very | good. | What | do you bring?", "Okay. What do you have?") })],
    customs_what_kind: [t("¿Qué | es? | ¿Fruta, | carne, | algo | empacado?", "What | is it? | Fruit, | meat, | something | packaged?", "What is it? Fruit, meat, something packaged?", { spain: t("¿Qué | es? | ¿Fruta, | carne, | algo | envasado?", "What | is it? | Fruit, | meat, | something | packaged?", "What is it? Fruit, meat, something packaged?") })],
    check_ok: [
      t("Gracias | por | declararlo. | Déjeme | verlo… | Todo | bien.", "Thanks | for | declaring it. | Let me | see it… | All | good.", "Thanks for declaring it. Let me take a look… That's fine."),
      t("Muy | bien, | déjeme | revisarlo… | Listo.", "Very | good, | let me | check it… | Done.", "Okay, let me check it… All set.", { spain: t("Muy | bien, | déjeme | revisarlo… | Ya está.", "Very | good, | let me | check it… | Done.", "Okay, let me check it… All set.") }),
    ],
    not_allowed_fruit: [t("La | fruta | y | la | verdura | frescas | no pueden | entrar | al | país.", "The | fruit | and | the | vegetables | fresh | can't | enter | the | country.",
      "Fresh fruit and vegetables can't come into the country.", { flags: { 0: "la fruta: Spanish uses the article for a kind of thing in general; English doesn't." } })],
    not_allowed_sandwich: [t("Los | sándwiches | con | jamón | o | queso | no pueden | entrar | al | país.", "The | sandwiches | with | ham | or | cheese | can't | enter | the | country.",
      "Sandwiches with ham or cheese can't come into the country.", { flags: { 0: "los sándwiches: the article for a kind of thing in general." } })],
    // SENASICA bars fresh meat; cured meat (ham, salami) goes to its inspectors (check_senasica)
    not_allowed_meat: [t("La | carne | fresca | no puede | entrar | al | país.", "The | meat | fresh | can't | enter | the | country.", "Fresh meat can't come into the country.",
      { flags: { 0: "la carne: the article for a kind of thing in general." } })],
    stays_here: [t("Así que | {ese@X} | {X} | se queda | aquí.", "So | that | {X} | stays | here.", "So that {X} has to stay here.")],
    dog_sat: [
      t("Un | momento. | El | perro | se sentó | junto | a | su | mochila.", "One | moment. | The | dog | sat down | next | to | your | backpack.", "Just a moment. The dog sat down next to your backpack.",
        { flags: { 4: "se sentó: sentarse = to sit down. A sniffer dog sits by a bag when it smells food." }, spain: t("Un | momento. | El | perro | se ha sentado | junto | a | su | mochila.", "One | moment. | The | dog | has sat down | next | to | your | backpack.", "Just a moment. The dog sat down next to your backpack.") }),
      t("Espere, | por favor. | El | perro | marcó | su | mochila.", "Wait, | please. | The | dog | marked | your | backpack.", "Wait, please. The dog has picked out your backpack.",
        { flags: { 4: "marcar: what Mexico's agriculture inspectors say when a sniffer dog points out a bag." }, spain: t("Espere, | por favor. | El | perro | ha | marcado | su | mochila.", "Wait, | please. | The | dog | has | marked | your | backpack.", "Wait, please. The dog has picked out your backpack.") }),
    ],
    dog_q: [
      t("¿Trae | alguna | fruta | o | algo | de comer | del | avión?", "Do you bring | any | fruit | or | something | to eat | from the | plane?", "Do you have any fruit or something to eat from the plane?", { spain: t("¿Lleva | alguna | fruta | o | algo | de comer | del | avión?", "Do you bring | any | fruit | or | something | to eat | from the | plane?", "Do you have any fruit or something to eat from the plane?") }),
      t("¿Lleva | comida | en | la | mochila? | ¿Fruta, | un | sándwich?", "Do you carry | food | in | the | backpack? | Fruit, | a | sandwich?", "Do you have any food in your backpack? Fruit, a sandwich?"),
    ],
    thanks_telling: [t("Gracias | por | decirme.", "Thanks | for | telling me.", "Thanks for telling me.", { spain: t("Gracias | por | decírmelo.", "Thanks | for | telling me.", "Thanks for telling me.") })],
    dog_search: [t("Permítame | revisar | su | mochila, | por favor.", "Allow me | to check | your | backpack, | please.", "Let me check your backpack, please.")],
    found_apple: [t("Mire, | aquí | hay | una | manzana.", "Look, | here | there is | an | apple.", "Look, there's an apple in here.")],
    found_sandwich: [t("Mire, | aquí | hay | un | sándwich | de | jamón.", "Look, | here | there is | a | sandwich | of | ham.", "Look, there's a ham sandwich in here.")],
    next_time: [t("La | próxima | vez, | declare | la | comida, | por favor.", "The | next | time, | declare | the | food, | please.", "Next time, please declare any food.")],
    why_rule: [t("Es | para | evitar | plagas | y | enfermedades | en | el | campo.", "It's | to | avoid | pests | and | diseases | in | the | farmland.", "It's to keep pests and diseases away from farms here.")],
    gift_value_q: [t("¿Cuánto | valen, | más o menos? | ¿Más | de | 500 | dólares?", "How much | are they worth, | roughly? | More | than | 500 | dollars?", "Roughly how much are they worth? More than 500 dollars?",
      { say: "¿Cuánto valen, más o menos? ¿Más de quinientos dólares?" })],
    gift_value_again: [t("¿Pasan de | 500 | dólares?", "Are they over | 500 | dollars?", "Are they over 500 dollars?", { say: "¿Pasan de quinientos dólares?" })],
    gift_value_again2: [t("Entonces, | ¿pasan de | 500 | dólares | o | no?", "So, | are they over | 500 | dollars | or | not?", "So, are they over 500 dollars or not?", { say: "Entonces, ¿pasan de quinientos dólares o no?" })],
    gift_estimate: [t("Más o menos. | ¿Menos | de | 500 | dólares, | o | más?", "Roughly. | Less | than | 500 | dollars, | or | more?", "Just roughly. Under 500 dollars, or more?",
      { say: "Más o menos. ¿Menos de quinientos dólares, o más?" })],
    gift_ok: [t("Entonces | entran | en | su | franquicia.", "Then | they fall | within | your | allowance.", "Then they're within your duty-free allowance.",
      { flags: { 4: "la franquicia: the duty-free allowance (500 US dollars of goods for a traveler arriving by air)." } })],
    gift_over: [t("Entonces | pase | al | carril | de | Auto declaración, | por favor; | ahí | paga | los | impuestos.",
      "Then | go | to the | lane | of | Self-declaration, | please; | there | you-pay | the | duties.", "Then please go to the self-declaration lane; you pay the duties there.")],
    ans_form: [t("No, | aquí | no hace falta | ningún | formulario.", "No, | here | isn't needed | any | form.", "No, you don't need any form here.")],
    ans_button: [t("Aquí | ya no hay | semáforo. | Si | no trae | nada | que declarar, | puede | pasar | directo.", "Here | there's no longer | a traffic light. | If | you don't bring | anything | to declare, | you can | go | straight through.",
      "There's no red-and-green light here anymore. If you have nothing to declare, you can go straight through.",
      { flags: { 2: "el semáforo: the old red/green button at Mexican customs; Cancún's airport doesn't use it anymore." }, spain: t("Aquí | ya no hay | semáforo. | Si | no lleva | nada | que declarar, | puede | pasar | directo.", "Here | there's no longer | a traffic light. | If | you don't bring | anything | to declare, | you can | go | straight through.", "There's no red-and-green light here anymore. If you have nothing to declare, you can go straight through.", {flags: {2: "el semáforo: the old red/green button at Mexican customs; Cancún's airport doesn't use it anymore."}}) })],
    ans_allowance: [t("Además de | su | equipaje | personal, | hasta | 500 | dólares | en | mercancía.", "Besides | your | luggage | personal, | up to | 500 | dollars | in | goods.",
      "Besides your personal luggage, up to 500 dollars in goods.", { say: "Además de su equipaje personal, hasta quinientos dólares en mercancía." })],
    ans_cash: [t("Solo | si | trae | más | de | 10,000 | dólares | en efectivo, | o | su | equivalente.", "Only | if | you bring | more | than | 10,000 | dollars | in cash, | or | its | equivalent.",
      "Only if you're carrying more than 10,000 dollars in cash, or the same amount in another currency.", { say: "Solo si trae más de diez mil dólares en efectivo, o su equivalente.", spain: t("Solo | si | lleva | más | de | 10.000 | dólares | en efectivo, | o | su | equivalente.", "Only | if | you bring | more | than | 10,000 | dollars | in cash, | or | its | equivalent.", "Only if you're carrying more than 10,000 dollars in cash, or the same amount in another currency.", {say: "Solo si lleva más de diez mil dólares en efectivo, o su equivalente."}) })],
    ans_cash_amount: [t("Si | trae | más | de | 10,000 | dólares | en efectivo, | tiene | que | declararlo.", "If | you bring | more | than | 10,000 | dollars | in cash, | you have | to | declare it.",
      "If you have more than 10,000 dollars in cash, you have to declare it.", { say: "Si trae más de diez mil dólares en efectivo, tiene que declararlo.", spain: t("Si | lleva | más | de | 10.000 | dólares | en efectivo, | tiene | que | declararlo.", "If | you bring | more | than | 10,000 | dollars | in cash, | you have | to | declare it.", "If you have more than 10,000 dollars in cash, you have to declare it.", {say: "Si lleva más de diez mil dólares en efectivo, tiene que declararlo."}) })],
    cash_equiv: [t("Si | equivale | a | más | de | 10,000 | dólares, | tiene | que | llenar | la | declaración | de | dinero.", "If | it's equal | to | more | than | 10,000 | dollars, | you have | to | fill out | the | declaration | of | money.",
      "If that comes to more than 10,000 dollars, you have to fill out the cash declaration form.", { say: "Si equivale a más de diez mil dólares, tiene que llenar la declaración de dinero.", spain: t("Si | equivale | a | más | de | 10.000 | dólares, | tiene | que | rellenar | la | declaración | de | dinero.", "If | it's equal | to | more | than | 10,000 | dollars, | you have | to | fill out | the | declaration | of | money.", "If that comes to more than 10,000 dollars, you have to fill out the cash declaration form.", {say: "Si equivale a más de diez mil dólares, tiene que rellenar la declaración de dinero."}) })],
    ans_form_cash: [t("Solo | la | declaración | de | dinero, | por | el | efectivo.", "Only | the | declaration | of | money, | for | the | cash.", "Just the cash declaration form, for the cash.")],
    ans_tell_me: [t("Dígame | qué | trae | y | le | digo.", "Tell me | what | you bring | and | (to) you | I-tell.", "Tell me what you have and I'll let you know.", { spain: t("Dígame | qué | lleva | y | le | digo.", "Tell me | what | you bring | and | (to) you | I-tell.", "Tell me what you have and I'll let you know.") })],
    // ANAM, Equipaje y franquicia: laptops, phones, cameras, medicines, and (adults) liquor and cigarettes within limits
    ans_personal: [t("Eso | es | parte | de | su | equipaje | personal: | no hace falta | declararlo.", "That | is | part | of | your | luggage | personal: | isn't needed | to declare it.",
      "That's part of your personal luggage; you don't need to declare it.")],
    // "¿Qué tengo que declarar?": the three things this conversation teaches (SENASICA's food, ANAM's allowance and cash line)
    ans_what_declare: [t("Comida, | mercancía | de | más | de | 500 | dólares | y | efectivo | de | más | de | 10,000 | dólares.",
      "Food, | goods | of | more | than | 500 | dollars | and | cash | of | more | than | 10,000 | dollars.", "Food, goods worth more than 500 dollars, and more than 10,000 dollars in cash.",
      { say: "Comida, mercancía de más de quinientos dólares y efectivo de más de diez mil dólares." })],
    check_senasica: [t("Eso | lo | revisa | SENASICA. | Pase | por | aquí, | por favor.", "That | it | checks | SENASICA. | Go | through | here, | please.",
      "The agriculture inspectors will check that. This way, please.", { flags: { 3: "SENASICA: Mexico's agricultural health service; its inspectors check food at the airport." } })],
    stays_here_all: [t("Así que | eso | se queda | aquí.", "So | that | stays | here.", "So all of that has to stay here.")],
    no_short: [t("No.", "No.", "No.")],
    ans_can_check: [t("Declárelo | y | lo | revisamos.", "Declare it | and | it | we-check.", "Declare it and we'll check it.")],
    pass_ok: [
      t("Puede | pasar. | ¡{m:Bienvenido|f:Bienvenida} | a | México!", "You can | go through. | Welcome | to | Mexico!", "You can go through. Welcome to Mexico!"),
      t("Muy | bien, | puede | pasar. | ¡Que | disfrute | su | estancia!", "Very | good, | you can | go through. | May | you enjoy | your | stay!", "All right, you can go through. Enjoy your stay!"),
    ],
    pass_after: [t("Ya | puede | pasar. | ¡{m:Bienvenido|f:Bienvenida} | a | México!", "Now | you can | go through. | Welcome | to | Mexico!", "You can go through now. Welcome to Mexico!")],
    customs_bye: [t("¡Que | le | vaya | bien!", "May | (to) you | it go | well!", "Take care!")],
    customs_thanks: [t("A | usted. | ¡Que | le | vaya | bien!", "To | you. | May | (to) you | it go | well!", "Thank you. Take care!")],
    itzel_form: [t("No, | yo | lleno | el | reporte; | usted | solo | me | da | los | datos.", "No, | I | fill out | the | report; | you | only | (to) me | give | the | details.",
      "No, I'll fill out the report; you just give me the details.", { spain: t("No, | yo | relleno | el | parte; | usted | solo | me | da | los | datos.", "No, | I | fill out | the | report; | you | only | (to) me | give | the | details.", "No, I'll fill out the report; you just give me the details.") })],
    cash_ok: [t("Esa | cantidad | no hace falta | declararla: | solo | más | de | 10,000 | dólares.", "That | amount | isn't needed | to declare it: | only | more | than | 10,000 | dollars.",
      "You don't need to declare that amount; only more than 10,000 dollars.", { say: "Esa cantidad no hace falta declararla: solo más de diez mil dólares.", spain: t("Esa | cantidad | no hace falta | declararla: | solo | más | de | 10.000 | dólares.", "That | amount | isn't needed | to declare it: | only | more | than | 10,000 | dollars.", "You don't need to declare that amount; only more than 10,000 dollars.", {say: "Esa cantidad no hace falta declararla: solo más de diez mil dólares."}) })],
    cash_over: [t("Entonces | tiene | que | llenar | la | declaración | de | dinero.", "Then | you have | to | fill out | the | declaration | of | money.",
      "Then you have to fill out the cash declaration form.", { spain: t("Entonces | tiene | que | rellenar | la | declaración | de | dinero.", "Then | you have | to | fill out | the | declaration | of | money.", "Then you have to fill out the cash declaration form.") })],
    ans_pay_depends: [t("Depende | de | cuánto | valgan.", "It depends | on | how much | they're worth.", "That depends on what they're worth.",
      { flags: { 3: "valgan: subjunctive of valer, for a value not known yet." } })],
    gift_whatif: [t("Si | valen | más, | paga | los | impuestos | en | el | carril | de | Auto declaración.", "If | they're worth | more, | you-pay | the | duties | in | the | lane | of | Self-declaration.",
      "If they're worth more, you pay the duties in the self-declaration lane.")],
    gift_whatif_less: [t("Si | valen | menos, | entran | en | su | franquicia | y | no paga | nada.", "If | they're worth | less, | they fall | within | your | allowance | and | you don't pay | anything.",
      "If they're worth less, they're within your allowance and you don't pay anything.")],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    no_worries: [t("No se preocupe.", "Don't worry.", "Don't worry about it.")],
    ans_pay_no: [t("No, | no tiene | que | pagar | nada.", "No, | you don't have | to | pay | anything.", "No, you don't have to pay anything.")],
    ans_pay_lane: [t("Eso | se lo | calculan | en | el | carril | de | Auto declaración.", "That | it for you | they-calculate | in | the | lane | of | Self-declaration.", "They'll work that out for you in the self-declaration lane.")],
  },

  domains: {},

  hints: {
    problem: {
      lt: "Say your bag didn't arrive",
      items: [
        { id: "pr_didnt", s: t("Mi | maleta | no llegó.", "My | suitcase | didn't arrive.", "My bag didn't arrive.", { spain: t("Mi | maleta | no ha llegado.", "My | suitcase | hasn't arrived.", "My bag didn't arrive.") }) },
        { id: "pr_didnt", s: t("Mi | maleta | no salió.", "My | suitcase | didn't come out.", "My suitcase didn't come out.", { spain: t("Mi | maleta | no ha salido.", "My | suitcase | hasn't come out.", "My suitcase didn't come out.") }) },
        { id: "pr_cant_find", s: t("No encuentro | mi | equipaje.", "I can't find | my | luggage.", "I can't find my luggage.") },
        { id: "pr_lost", s: t("Creo | que | mi | maleta | se perdió.", "I think | that | my | suitcase | got lost.", "I think my bag is lost.", { spain: t("Creo | que | mi | maleta | se ha perdido.", "I think | that | my | suitcase | has got lost.", "I think my bag is lost.") }) },
        { id: "pr_report", s: t("Quisiera | reportar | una | maleta | perdida.", "I'd like | to report | a | suitcase | lost.", "I'd like to report a missing bag.", { spain: t("Quisiera | hacer | una | reclamación | por | una | maleta | perdida.", "I'd like | to make | a | claim | for | a | suitcase | lost.", "I'd like to report a missing bag.") }) },
      ],
    },
    flight: {
      lt: "Give your flight", slot: "city", examples: ["houston", "toronto", "new_york", "cdmx"],
      items: [
        { id: "f_short", s: t("Vuelo | 482.", "Flight | 482.", "Flight 482.", { say: "Vuelo cuatrocientos ochenta y dos." }) },
        { id: "f_code", s: t("Vuelo | PC | 482.", "Flight | PC | 482.", "Flight PC 482.", { say: "Vuelo pe ce cuatrocientos ochenta y dos." }),
          note: "Say the letters by their Spanish names: pe, ce. The digits may come one by one or as one number." },
        { id: "f_num", s: t("Era | el | vuelo | 482 | de | {X}.", "It was | the | flight | 482 | from | {X}.", "It was flight 482 from {X}.", { say: "Era el vuelo cuatrocientos ochenta y dos de {X}." }) },
        { id: "f_dunno", s: t("No me acuerdo | del | número | de | vuelo.", "I don't remember | of the | number | of | flight.", "I don't remember the flight number.") },
        { id: "f_from", s: t("Llegué | de | {X}.", "I arrived | from | {X}.", "I flew in from {X}.", { spain: t("Vengo | de | {X}.", "I come | from | {X}.", "I flew in from {X}.") }) },
        { id: "f_conn", s: t("Hice | escala | en | {X}.", "I made | a stopover | in | {X}.", "I had a connection in {X}.", { spain: t("He hecho | escala | en | {X}.", "I've made | a stopover | in | {X}.", "I had a connection in {X}.") }) },
      ],
    },
    // "Está bien. ¿De qué ciudad venía?"
    from: {
      lt: "Say which city you flew from", slot: "city", examples: ["houston", "toronto", "new_york", "cdmx"],
      items: [
        { id: "f_from_city", s: t("De | {X}.", "From | {X}.", "From {X}.") },
        { id: "f_from", s: t("Llegué | de | {X}.", "I arrived | from | {X}.", "I flew in from {X}.", { spain: t("Vengo | de | {X}.", "I come | from | {X}.", "I flew in from {X}.") }) },
      ],
    },
    // "¿Hizo escala?"
    connection: {
      lt: "Say whether you had a connection", slot: "city", examples: ["cancun", "cdmx", "houston", "monterrey"],
      items: [
        { id: "cn_in", s: t("Sí, | en | {X}.", "Yes, | in | {X}.", "Yes, in {X}.") },
        { id: "cn_direct", s: t("No, | fue | un | vuelo | directo.", "No, | it was | a | flight | direct.", "No, it was a direct flight.") },
        { id: "f_conn", s: t("Hice | escala | en | {X}.", "I made | a stopover | in | {X}.", "I had a connection in {X}.", { spain: t("He hecho | escala | en | {X}.", "I've made | a stopover | in | {X}.", "I had a connection in {X}.") }) },
      ],
    },
    tag: {
      lt: "Show your claim tag",
      items: [
        { id: "t_here", s: t("Aquí está.", "Here it is.", "Here it is.") },
        { id: "t_on_bp", s: t("Está | en | mi | pase de abordar.", "It's | on | my | boarding pass.", "It's on my boarding pass.",
          { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." }, neutral: t("Está | en | mi | tarjeta de embarque.", "It's | on | my | boarding pass.", "It's on my boarding pass.") }) },
        { id: "t_heres", s: t("Aquí | tiene | mi | comprobante.", "Here | you have | my | claim tag.", "Here's my claim tag.") },
        { id: "t_lost", s: t("Creo | que | lo | perdí.", "I think | that | it | I-lost.", "I think I lost it.", { flags: { 2: "lo: it, el comprobante." }, spain: t("Creo | que | lo | he perdido.", "I think | that | it | I've lost.", "I think I lost it.", {flags: {2: "lo: it, el comprobante."}}) }) },
      ],
    },
    describe: {
      lt: "Describe your bag", slot: "color", examples: ["blue", "black", "red", "gray", "green"],
      items: [
        { id: "d_its", s: t("Es | una | maleta | {X} | grande.", "It's | a | suitcase | {X} | large.", "It's a large {X} suitcase.") },
        { id: "d_color", s: t("Es | {X}.", "It's | {X}.", "It's {X}.") },
        { id: "d_its", s: t("Es | una | maleta | rígida | con | ruedas.", "It's | a | suitcase | hard-shell | with | wheels.", "It's a hard-shell suitcase with wheels.") },
        { id: "d_its", s: t("Es | una | mochila | {X}.", "It's | a | backpack | {X}.", "It's a {X} backpack.") },
        { id: "d_has", s: t("Tiene | una | franja | roja | a | un | lado.", "It has | a | stripe | red | on | one | side.", "It has a red stripe on the side.") },
        { id: "d_there", s: t("Lleva | un | listón | amarillo | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.",
          { flags: { 2: "Mexican: listón = ribbon; elsewhere cinta." }, neutral: t("Lleva | una | cinta | amarilla | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle."), spain: t("Lleva | una | cinta | amarilla | en | el | asa.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.") }) },
      ],
    },
    // "¿De qué color es?"
    color: {
      lt: "Say the color", slot: "color", examples: ["black", "blue", "red", "gray", "green"],
      items: [
        { id: "d_color", s: t("Es | {X}.", "It's | {X}.", "It's {X}.") },
        { id: "c_short", s: t("{X}.", "{X}.", "{X}.") },
      ],
    },
    bagtype: {
      lt: "Say what kind of bag it is", slot: "bagtype", examples: ["suitcase", "backpack", "duffel"],
      items: [
        { id: "tp_its", s: t("Es | {X.np}.", "It's | {X.np}.", "It's {X.np}.") },
        { id: "tp_short", s: t("{X.np}.", "{X.np}.", "{X.np}.") },
      ],
    },
    size: {
      lt: "Say the size", slot: "size", examples: ["large", "medium", "small"],
      items: [
        { id: "sz_its", s: t("Es | {X}.", "It's | {X}.", "It's {X}.") },
        { id: "sz_short", s: t("{X}.", "{X}.", "{X}."), note: "One word is enough: “Grande.” Chica, mediana and grande agree with la maleta." },
      ],
    },
    material: {
      lt: "Say if it's hard-shell or soft", slot: "material", examples: ["hard", "soft", "leather"],
      items: [
        { id: "mt_its", s: t("Es | {X}.", "It's | {X}.", "It's {X}.") },
        { id: "mt_short", s: t("{X}.", "{X}.", "{X}.") },
      ],
    },
    marks: {
      lt: "Say what makes it stand out",
      items: [
        { id: "d_has", s: t("Tiene | una | etiqueta | con | mi | nombre.", "It has | a | tag | with | my | name.", "It has a name tag.") },
        { id: "d_there", s: t("Lleva | un | listón | amarillo | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.",
          { flags: { 2: "Mexican: listón = ribbon; elsewhere cinta." }, neutral: t("Lleva | una | cinta | amarilla | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle."), spain: t("Lleva | una | cinta | amarilla | en | el | asa.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.") }) },
        { id: "m_none", s: t("No, | nada | especial.", "No, | nothing | special.", "No, nothing special.") },
      ],
    },
    brand: {
      lt: "Give the brand",
      items: [
        { id: "b_its", s: t("Es | una | Samsonite.", "It's | a | Samsonite.", "It's a Samsonite.", { flags: { 1: "una: a brand of suitcase takes la maleta's gender." } }) },
        { id: "b_dunno", s: t("No estoy | {m:seguro|f:segura}.", "I'm not | sure.", "I'm not sure.") },
      ],
    },
    contents: {
      lt: "Say what's inside",
      items: [
        { id: "c_clothes", s: t("Solo | ropa | y | zapatos.", "Only | clothes | and | shoes.", "Just clothes and shoes.") },
        { id: "c_in", s: t("Traigo | unos | regalos.", "I carry | some | gifts.", "There are some gifts in it.", { spain: t("Llevo | unos | regalos.", "I carry | some | gifts.", "There are some gifts in it.") }) },
        { id: "c_med", s: t("Mis | medicinas | están | adentro.", "My | medicines | are | inside.", "My medicine is in it.", { spain: t("Mis | medicinas | están | dentro.", "My | medicines | are | inside.", "My medicine is in it.") }) },
        { id: "c_nothing", s: t("Nada | de | valor.", "Nothing | of | value.", "Nothing valuable.") },
      ],
    },
    delivery: {
      lt: "Accept delivery, pick it up, or ask",
      items: [
        { id: "dl_deliver", s: t("¿Me | la | pueden | llevar | a | mi | hotel?", "(To) me | it | can you | take | to | my | hotel?", "Could you deliver it to my hotel?",
          { flags: { 1: "la: it, la maleta.", 2: "pueden: you, plural (the airline)." } }) },
        { id: "dl_yes", s: t("Sí, | llévenla | al | hotel, | por favor.", "Yes, | take it | to the | hotel, | please.", "Yes, please deliver it to my hotel.") },
        { id: "dl_pickup", s: t("Paso | por | ella | aquí.", "I'll stop by | for | it | here.", "I'll pick it up here.", { flags: { 0: "pasar por: to come by and pick something up." }, spain: t("La | recojo | aquí.", "It | I-pick up | here.", "I'll pick it up here.", {flags: {0: "La = it (la maleta): the object pronoun, not an article."}}) }) },
        { id: "q_when", s: t("¿Cuándo | me | la | entregan?", "When | (to) me | it | do you deliver?", "When will I get it?", { flags: { 2: "la: it, la maleta (an object pronoun, not an article)." } }) },
        { id: "q_free", s: t("¿La | entrega | es | gratis?", "The | delivery | is | free?", "Is delivery free?") },
      ],
    },
    // "¿Prefiere recogerla aquí, o se la llevamos a otra dirección?"
    pick_or_addr: {
      lt: "Pick it up here, or give another address",
      items: [
        { id: "dl_pickup", s: t("Paso | por | ella | aquí.", "I'll stop by | for | it | here.", "I'll pick it up here.", { flags: { 0: "pasar por: to come by and pick something up." }, spain: t("La | recojo | aquí.", "It | I-pick up | here.", "I'll pick it up here.", {flags: {0: "La = it (la maleta): the object pronoun, not an article."}}) }) },
        { id: "dl_friend", s: t("A | la | casa | de | mi | amiga, | por favor.", "To | the | house | of | my | friend, | please.", "To my friend's place, please.") },
      ],
    },
    hotel: {
      lt: "Say where you're staying",
      items: [
        { id: "h_hotel", s: t("Me estoy | quedando | en | el | Hotel | Mar Azul.", "I'm | staying | at | the | Hotel | Blue Sea.", "I'm staying at Hotel Mar Azul.",
          { flags: { 0: "Me estoy quedando: quedarse = to stay; me is reflexive." } }) },
        { id: "h_at", s: t("En | el | Hotel | Mar Azul.", "At | the | Hotel | Blue Sea.", "At Hotel Mar Azul.") },
        { id: "h_addr", s: t("Calle | Flamboyán | número | 23, | entre | Hidalgo | y | Juárez.", "Street | Flamboyán | number | 23, | between | Hidalgo | and | Juárez.",
          "23 Flamboyán Street, between Hidalgo and Juárez.", { say: "Calle Flamboyán número veintitrés, entre Hidalgo y Juárez." }),
          note: "In the Yucatán Peninsula, addresses often name the cross streets: entre… y…" },
      ],
    },
    phone: {
      lt: "Give your phone number",
      items: [
        { id: "ph_mine", s: t("Mi | número | es | 984 | 123 | 4567.", "My | number | is | 984 | 123 | 4567.", "My number is 984 123 4567.",
          { say: "Mi número es nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete." }), note: "Mexicans often read the last digits in pairs: cuarenta y cinco, sesenta y siete." },
        { id: "ph_its", s: t("Es | el | +1 | 512 | 555 | 0142.", "It's | — | +1 | 512 | 555 | 0142.", "It's +1 512 555 0142.",
          { say: "Es el más uno, cinco uno dos, cinco cinco cinco, cero uno, cuarenta y dos.", flags: { 1: "el (número): Spanish puts an article before a phone number; English has no word here." } }) },
        { id: "ph_none", s: t("No tengo | número | mexicano.", "I don't have | number | Mexican.", "I don't have a Mexican number.") },
      ],
    },
    ask: {
      lt: "Ask about your bag",
      items: [
        { id: "q_when", s: t("¿Cuándo | me | la | entregan?", "When | (to) me | it | do you deliver?", "When will I get it?", { flags: { 2: "la: it, la maleta (an object pronoun, not an article)." } }) },
        { id: "q_meantime", s: t("¿Qué | hago | mientras tanto?", "What | do I do | in the meantime?", "What should I do in the meantime?") },
        { id: "q_reimburse", s: t("¿Me | van | a | reembolsar | lo que | compre?", "(To) me | are you going | to | refund | what | I buy?", "Will you pay me back for what I buy?") },
        { id: "q_call", s: t("¿Me | van | a | llamar?", "Me | are you going | to | call?", "Will you call me?") },
        { id: "q_track", s: t("¿Puedo | rastrearla | en línea?", "Can I | track it | online?", "Can I track it online?", { spain: t("¿Puedo | seguirla | por internet?", "Can I | track it | online?", "Can I track it online?") }) },
        { id: "q_what_if", s: t("¿Y | si | no la encuentran?", "And | if | you don't find it?", "What if you can't find it?") },
        { id: "q_copy", s: t("¿Me | da | una | copia?", "(To) me | you-give | a | copy?", "Could I get a copy?") },
      ],
    },
    // The report number: spell it or write it down
    spell_write: {
      lt: "Ask to spell it or write it down",
      items: [
        { id: "c_spell", s: t("¿Cómo | se escribe?", "How | is it written?", "How do you spell that?") },
        { id: "c_write", s: t("¿Me lo | puede | escribir?", "It for me | can you | write?", "Could you write it down, please?") },
      ],
    },
    kit: {
      lt: "Ask about the basics you need",
      items: [
        { id: "q_meantime", s: t("¿Qué | hago | mientras tanto?", "What | do I do | in the meantime?", "What should I do in the meantime?") },
        { id: "q_reimburse", s: t("¿Me | van | a | reembolsar | lo que | compre?", "(To) me | are you going | to | refund | what | I buy?", "Will you pay me back for what I buy?") },
      ],
    },
    // ---- Customs ----
    declare: {
      lt: "Say what you're bringing (or that it's nothing)", slot: "good", examples: ["chocolate", "cheese", "cookies", "gifts"],
      items: [
        { id: "dc_nothing", s: t("No, | nada | que declarar.", "No, | nothing | to declare.", "No, nothing to declare.") },
        { id: "dc_none", s: t("No, | no traigo | nada.", "No, | I don't bring | anything.", "No, I don't have anything.", { spain: t("No, | no llevo | nada.", "No, | I don't bring | anything.", "No, I don't have anything.") }), note: "Spanish says “nada” after a negative verb: no traigo nada." },
        { id: "dc_personal", s: t("Solo | ropa | y | cosas | personales.", "Only | clothes | and | things | personal.", "Just clothes and personal things.") },
        { id: "dc_no_food", s: t("No traigo | comida.", "I don't bring | food.", "I don't have any food.", { spain: t("No llevo | comida.", "I don't bring | food.", "I don't have any food.") }) },
        { id: "dc_have", s: t("Traigo | {X.np}.", "I bring | {X.np}.", "I have {X.np}.", { spain: t("Llevo | {X.np}.", "I bring | {X.np}.", "I have {X.np}.") }), only: (e) => !e.attrs?.bad && !e.attrs?.generic },
        { id: "dc_only", s: t("Solo | unos | regalos.", "Only | some | gifts.", "Just some gifts.") },
        { id: "dc_cash", s: t("Traigo | 2,000 | dólares | en efectivo.", "I bring | 2,000 | dollars | in cash.", "I have 2,000 dollars in cash.", { say: "Traigo dos mil dólares en efectivo.", spain: t("Llevo | 2.000 | dólares | en efectivo.", "I bring | 2,000 | dollars | in cash.", "I have 2,000 dollars in cash.", {say: "Llevo dos mil dólares en efectivo."}) }),
          note: "Cash is declared only over 10,000 US dollars (or the same in other money)." },
        // a mass noun bare ("¿Puedo traer queso?"), a count noun in the plural ("¿Puedo traer manzanas?", never "traer manzana")
        { id: "dc_can", s: t("¿Puedo | traer | {X}?", "Can I | bring | {X}?", "Can I bring {X} in?"), only: (e) => !e.attrs?.generic && !e.attrs?.gift && e.art === "" },
        { id: "dc_can", s: t("¿Puedo | traer | {X.pl}?", "Can I | bring | {X.pl}?", "Can I bring {X.pl} in?"), only: (e) => !e.attrs?.generic && !e.attrs?.gift && e.art !== "" },
      ],
    },
    // "El perro se sentó junto a su mochila. ¿Trae alguna fruta…?"
    dog: {
      lt: "Answer about the food in your backpack", slot: "good", examples: ["apple", "sandwich", "banana"],
      items: [
        { id: "dg_admit", s: t("Ah, | sí, | perdón: | traigo | {X.np} | del | avión.", "Oh, | yes, | sorry: | I bring | {X.np} | from the | plane.", "Oh, yes, sorry: I have {X.np} from the plane.", { spain: t("Ah, | sí, | perdón: | llevo | {X.np} | del | avión.", "Oh, | yes, | sorry: | I bring | {X.np} | from the | plane.", "Oh, yes, sorry: I have {X.np} from the plane.") }),
          only: (e) => e.attrs?.bad === "fruit" || e.attrs?.bad === "sandwich" },
        { id: "dg_forgot", s: t("Se me olvidó: | traigo | {X.np}.", "I forgot: | I bring | {X.np}.", "I forgot: I have {X.np}.", { spain: t("Se me ha olvidado: | llevo | {X.np}.", "I forgot: | I bring | {X.np}.", "I forgot: I have {X.np}.") }), only: (e) => e.attrs?.bad === "fruit" || e.attrs?.bad === "sandwich" },
        { id: "dc_none", s: t("No, | no traigo | nada.", "No, | I don't bring | anything.", "No, I don't have anything.", { spain: t("No, | no llevo | nada.", "No, | I don't bring | anything.", "No, I don't have anything.") }) },
      ],
    },
    customs_q: {
      lt: "Ask the customs officer",
      items: [
        { id: "q_form", s: t("¿Tengo | que | llenar | algún | formulario?", "Do I have | to | fill out | any | form?", "Do I have to fill out a form?", { spain: t("¿Tengo | que | rellenar | algún | formulario?", "Do I have | to | fill out | any | form?", "Do I have to fill out a form?") }) },
        { id: "q_button", s: t("¿Hay | que | apretar | el | botón?", "Is it necessary | to | press | the | button?", "Do I have to press the button?", { spain: t("¿Hay | que | pulsar | el | botón?", "Is it necessary | to | press | the | button?", "Do I have to press the button?") }),
          note: "Mexican customs used a red/green button (el semáforo); Cancún's airport no longer does.", noteSpain: "Pulsar: to press. Mexican customs used a red/green button (el semáforo); Cancún's airport no longer does." },
        { id: "q_allowance", s: t("¿Cuánto | puedo | traer | sin | pagar | impuestos?", "How much | can I | bring | without | paying | duties?", "How much can I bring in duty-free?") },
        { id: "q_cash", s: t("¿Tengo | que | declarar | el | dinero?", "Do I have | to | declare | the | money?", "Do I have to declare my cash?") },
        { id: "q_why", s: t("¿Por qué | no puede | pasar | la | fruta?", "Why | can't | go through | the | fruit?", "Why can't fruit come in?") },
      ],
    },
    gift_value: {
      lt: "Say what the gifts are worth",
      items: [
        { id: "gv_under", s: t("No, | menos | de | 500 | dólares.", "No, | less | than | 500 | dollars.", "No, less than 500 dollars.", { say: "No, menos de quinientos dólares." }) },
        { id: "gv_over", s: t("Sí, | más | de | 500.", "Yes, | more | than | 500.", "Yes, more than 500.", { say: "Sí, más de quinientos." }) },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With airport staff, usted is more polite: puede (puedes is for friends).", better: "¿Me puede ayudar?" },
  },

  merges: {
    // Spain's twins (11 Nov 2026)
    "no ha llegado": { reason: "grammatical_fusion", split: "ha → have/has + llegado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "se ha quedado": { reason: "grammatical_fusion", split: "ha → have/has + quedado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "cómo de": { reason: "lexical_expression", split: "cómo → how + de → of: Spain's cómo de grande = how big.", minimal: "Two words." },
    "por internet": { reason: "lexical_expression", split: "por → by + internet: = online.", minimal: "Two words." },
    "se ha sentado": { reason: "grammatical_fusion", split: "ha → have/has + sentado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "no ha salido": { reason: "grammatical_fusion", split: "ha → have/has + salido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "se ha perdido": { reason: "grammatical_fusion", split: "ha → have/has + perdido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle, with no and the pronoun." },
    "he hecho": { reason: "grammatical_fusion", split: "he → have/has + hecho (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "he perdido": { reason: "grammatical_fusion", split: "he → have/has + perdido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "se me ha olvidado": { reason: "grammatical_fusion", split: "se me → (on) me + ha olvidado → has forgotten: Spain's perfect for se me olvidó = I forgot.", minimal: "Pronouns, auxiliary and participle." },
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → offers misreads the service formula: what can I do for you.", minimal: "Three words; qué stays separate." },
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board would hide the compound noun: boarding pass.", minimal: "Three words, one noun." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding is the compound noun boarding pass.", minimal: "Three words, one noun." },
    "recogida de equipajes": { reason: "lexical_expression", split: "recogida → pickup + de → of + equipajes → luggage is Spain's compound noun for baggage claim.", minimal: "Three words, one place." },
    "reclamo de equipaje": { reason: "lexical_expression", split: "reclamo → claim + de → of + equipaje → luggage is the compound noun baggage claim.", minimal: "Three words, one place." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that misreads the connector: so.", minimal: "Two words." },
    "qué tan": { reason: "lexical_expression", split: "qué → what + tan → so misreads the degree question: how (big).", minimal: "Two words; the adjective stays separate." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is the fixed adverb roughly.", minimal: "Three words." },
    "en línea": { reason: "lexical_expression", split: "en → in + línea → line misreads the adverb: online.", minimal: "Two words." },
    "en cuanto": { reason: "lexical_expression", split: "en → in + cuanto → how much misreads the conjunction: as soon as.", minimal: "Two words." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much misreads the adverb: in the meantime.", minimal: "Two words." },
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name instead of identifying it.", minimal: "Only the two-word name; Hotel stays separate." },
    "ciudad de méxico": { reason: "lexical_expression", split: "ciudad → city + de → of + méxico → Mexico is the city's proper name: Mexico City.", minimal: "The three-word name." },
    "nueva york": { reason: "lexical_expression", split: "nueva → new + york is the city's proper name: New York.", minimal: "The two-word name." },
    "los ángeles": { reason: "lexical_expression", split: "los → the + ángeles → angels is the city's proper name: Los Angeles.", minimal: "The two-word name." },
    "azul marino": { reason: "lexical_expression", split: "azul → blue + marino → marine is one color word: navy blue.", minimal: "Two words." },
    "de tela": { reason: "lexical_expression", split: "de → of + tela → fabric describes the kind of bag: soft-sided.", minimal: "Two words." },
    "de piel": { reason: "lexical_expression", split: "de → of + piel → skin describes the material: leather.", minimal: "Two words." },
    "me estoy": { reason: "grammatical_fusion", split: "me → myself + estoy → I am: the reflexive of quedarse goes with the progressive auxiliary (I'm staying).", minimal: "Pronoun and auxiliary; quedando stays separate." },
    "se está": { reason: "grammatical_fusion", split: "se → yourself + está → you are: the reflexive of hospedarse goes with the progressive auxiliary (are you staying).", minimal: "Pronoun and auxiliary; hospedando stays separate." },
    "pasan de": { reason: "lexical_expression", split: "pasan → they pass + de → of misreads the comparison: are they over (an amount).", minimal: "Two words; the amount stays separate." },
    "que declarar": { reason: "lexical_expression", split: "que → that + declarar → to declare misreads the relative infinitive: (anything) to declare.", minimal: "Two words; algo stays separate." },
    "de comer": { reason: "lexical_expression", split: "de → of + comer → to eat misreads the infinitive phrase: (something) to eat.", minimal: "Two words; algo stays separate." },
    "auto declaración": { reason: "lexical_expression", split: "auto → self + declaración → declaration is the name of the customs lane: Self-declaration.", minimal: "The two-word lane name." },
    "no hace falta": { reason: "lexical_expression", split: "no → not + hace → makes + falta → lack misreads the idiom: isn't needed.", minimal: "Three words." },
    "ya no hay": { reason: "lexical_expression", split: "ya → already + no → not + hay → there is misreads the phrase: there's no longer.", minimal: "Three words; the noun stays separate." },
    "además de": { reason: "lexical_expression", split: "además → moreover + de → of is the preposition besides.", minimal: "Two words." },
    "se me olvidó": { reason: "grammatical_fusion", split: "se → itself + me → to me + olvidó → forgot: Spanish says it got forgotten on me; English says I forgot.", minimal: "Pronouns and verb." },
    "no la encuentran": { reason: "grammatical_fusion", split: "no → not + la → it + encuentran → you find: English puts don't inside the verb phrase (you don't find it).", minimal: "Negation, pronoun and verb." },
  },

  // -------------------------------------------------------------------------

  // The learner's plan: report the bag, identify the flight, describe the bag, arrange delivery, leave contacts.
  mission: [
    { step: "problem", lt: "Say your bag didn't arrive" },
    { lt: "Say which flight you were on", done: (c) => !!c.s.flight && !stepOpen(c, "connection") },
    { step: "tag", lt: "Show your claim tag", optional: true },
    { lt: "Describe your bag", optional: true, when: (c) => !c.s.found, done: (c) => !c.s.found && !DESCRIBE.some((id) => stepOpen(c, id)) },
    { step: "delivery", lt: "Arrange the delivery" },
    { lt: "Give your address and phone number", done: (c) => stepDef("hotel").done(c) && !!c.s.phone },
    { lt: "Get your report number", done: (c) => !!c.s.refGiven },
    { lt: "Go through customs", done: (c) => !!c.s.customsDone },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      expects: ["problem", "need_help"],
      suggest: [{ lt: "Say your bag didn't arrive", hint: "problem" }],
      yes: (c) => { c.s.problem = true; c.say("sorry_bag"); },
      help: (c) => { c.say("problem_help"); } },
    { id: "flight", done: (c) => !!c.s.flight,
      ask: (c) => c.say(c.s.askFrom ? "ask_from" : "ask_flight"),
      expects: ["flight", "flight_num_ctx", "dunno_ctx"],
      suggest: [{ lt: "Give your flight number", hint: "flight", options: "city" }],
      help: (c) => { c.say("flight_help"); } },
    { id: "connection", when: (c) => c.s.askConnection && !c.s.via && c.s.via !== null, done: (c) => c.s.via !== undefined,
      ask: (c) => c.say("ask_connection"),
      expects: ["flight", "no_connection", "via_ctx"],
      suggest: [{ lt: "Say whether you had a connection (and where)", hint: "connection", options: "city" }],
      yes: (c) => { c.s.via = "yes"; ack(c, 0.7); },
      no: (c) => { c.s.via = null; ack(c, 0.7); } },
    { id: "tag", when: (c) => c.s.askTag, done: (c) => c.s.tag !== undefined,
      ask: (c) => c.say("ask_tag"),
      expects: ["hand_over", "hand_over_ctx", "tag_lost", "tag_lost_ctx"],
      suggest: [{ lt: "Show your claim tag", hint: "tag" }],
      yes: (c) => { c.s.tag = true; c.say("tag_thanks"); },
      no: (c) => { c.s.tag = false; c.say("tag_none"); } },
    { id: "lookup", done: (c) => !!c.s.looked,
      ask: (c) => {
        c.s.looked = true;
        c.say("checking");
        if (c.s.foundTwist) {
          c.s.found = true;
          c.twist("found_it");
          c.say("found_it");
          c.say("still_in", { X: c.s.viaCity ?? c.s.fromCity ?? "cancun" });
          c.say("next_flight");
        } else c.say("not_in_system");
        askNext(c);
      } },
    { id: "describe", when: (c) => !c.s.found, done: (c) => !!c.s.type || !!c.s.color,
      ask: (c) => c.say("ask_describe"),
      expects: ["describe", "describe_ctx", "describe_fix", "color_ctx", "type_ctx", "size_ctx", "material_ctx", "brand", "marks_none"],
      suggest: [
        { lt: "Describe your bag: color, size, kind", hint: "describe", options: "color" },
        { lt: "Choose the kind of bag", hint: "bagtype", options: "bagtype" },
      ],
      help: (c) => { c.say("ask_type"); } },
    { id: "type", when: (c) => !c.s.found, done: (c) => !!c.s.type && c.s.type !== "bag",
      ask: (c) => c.say("ask_type"),
      expects: ["describe", "describe_ctx", "type_ctx", "describe_fix"],
      suggest: [{ lt: "Say if it's a suitcase, a backpack or a duffel bag", hint: "bagtype", options: "bagtype" }] },
    { id: "color", when: (c) => !c.s.found, done: (c) => !!c.s.color,
      ask: (c) => c.say("ask_color"),
      expects: ["describe", "describe_ctx", "color_ctx", "describe_fix"],
      suggest: [{ lt: "Say the color", hint: "color", options: "color" }] },
    { id: "size", when: (c) => !c.s.found && c.s.askSize && c.s.type !== "backpack", done: (c) => !!c.s.size,
      ask: (c) => c.say("ask_size"),
      expects: ["describe", "describe_ctx", "size_ctx"],
      suggest: [{ lt: "Say the size", hint: "size", options: "size" }] },
    { id: "material", when: (c) => !c.s.found && c.s.askMaterial && c.s.type === "suitcase", done: (c) => !!c.s.material,
      ask: (c) => c.say("ask_material"),
      expects: ["describe", "describe_ctx", "material_ctx"],
      suggest: [{ lt: "Say if it's hard-shell or soft", hint: "material", options: "material" }] },
    { id: "marks", when: (c) => !c.s.found && c.s.askMarks, done: (c) => c.s.marks !== undefined,
      ask: (c) => c.say("ask_marks"),
      expects: ["describe", "describe_ctx", "marks_none", "marks_bare_ctx", "marks_ctx"],
      suggest: [{ lt: "Say what makes it stand out (a stripe, a ribbon, a name tag)", hint: "marks" }],
      yes: (c) => { c.s.marks = c.s.marks ?? []; c.say("marks_what"); c.hold(); },
      no: (c) => { c.s.marks = []; c.say("no_problem"); } },
    { id: "brand", when: (c) => !c.s.found && c.s.askBrand, done: (c) => c.s.brand !== undefined,
      ask: (c) => c.say("ask_brand"),
      expects: ["brand", "dunno_ctx"],
      suggest: [{ lt: "Give the brand (or say you don't know)", hint: "brand" }],
      yes: (c) => { c.s.brand = "unknown"; c.say("brand_which"); c.hold(); },
      no: (c) => { c.s.brand = "none"; c.say("no_problem"); } },
    { id: "contents", when: (c) => !c.s.found && c.s.askContents, done: (c) => c.s.contents !== undefined,
      ask: (c) => { c.s.contentsQ = c.s.contentsQ ?? (c.chance(0.5) ? "what" : "valuable"); c.say(c.s.contentsQ === "what" ? "ask_contents" : "ask_valuable"); },
      expects: ["contents"],
      suggest: [{ lt: "Say what's inside", hint: "contents" }],
      // "¿Lleva algo de valor?" — Sí / No. A bare "Sí" to "¿Qué lleva adentro?" gets "¿Qué lleva?"
      yes: (c) => { if (c.s.contentsQ === "what") { c.say("contents_what"); c.hold(); return; } c.s.contents = "valuable"; c.say("contents_valuables"); },
      no: (c) => { c.s.contents = "nothing"; c.say("contents_ok"); } },
    { id: "delivery", done: (c) => !!c.s.delivery,
      // "…a su hotel?", unless the learner has already said they aren't at a hotel
      ask: (c) => c.say(c.s.hotel && !inHotel(c) ? "ask_delivery_stay" : "ask_delivery"),
      expects: ["delivery", "pickup", "delivery_ctx", "not_hotel_ctx", "price_ctx"],
      suggest: [{ lt: "Accept delivery to your hotel", hint: "g_yesno" }, { lt: "Pick it up yourself, or ask", hint: "delivery" }],
      yes: (c) => { c.s.delivery = "deliver"; c.s.dlTo = c.s.hotel && !inHotel(c) ? "home" : "hotel"; once(c, "dl", deliveryOk(c)); turn(c).said_when = true; },
      no: (c) => { c.s.delivery = "pickup"; c.say("pickup_ok"); } },
    // done once Itzel knows where to bring the bag: "En casa de una amiga" or "En un Airbnb" is enough for a pickup, but a
    // delivery still needs the street (or the learner's "No sé la dirección": she calls for it)
    { id: "hotel", done: (c) => !!c.s.hotel && !(c.s.delivery === "deliver" && c.s.needAddr),
      // Only what's missing: to the hotel → which one ("¿Dónde se está hospedando?"); to a friend's place → the address
      ask: (c) => {
        c.s.hotelQ = c.s.hotel && c.s.needAddr ? "ask_deliver_where" : c.s.dlTo === "hotel" ? "ask_hotel" : c.s.dlTo === "home" ? "ask_deliver_where"
          : c.s.delivery === "deliver" && c.chance(0.5) ? "ask_deliver_where" : "ask_hotel";
        c.say(c.s.hotelQ);
      },
      expects: ["stay", "addr_dunno_ctx"],
      suggest: [{ lt: "Say where you're staying", hint: "hotel" }] },
    { id: "phone", done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"),
      expects: ["phone", "phone_ctx", "phone_none"],
      suggest: [{ lt: "Give your phone number", hint: "phone" }] },
    { id: "kit", when: (c) => c.s.offerKit && !c.s.kitDone, done: (c) => !!c.s.kitDone,
      ask: (c) => askKit(c),
      expects: ["q_reimburse", "q_meantime", "kit_yes_ctx", "kit_no_ctx", "price_ctx"],
      suggest: [{ lt: "Accept the kit (yes / no)", hint: "g_yesno" }, { lt: "Ask about the costs", hint: "kit" }],
      yes: (c) => { c.s.kitDone = true; c.s.kitGiven = true; c.s.kitOpen = false; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
      no: (c) => { c.s.kitDone = true; c.s.kitGiven = true; c.s.kitOpen = false; c.say("no_problem"); } },
    { id: "ref", done: (c) => !!c.s.refAck,
      ask: (c) => {
        // the number and the tracking line once; after a side question she just waits for the learner
        if (!c.s.refGiven) {
          c.s.refGiven = true; c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); c.event("give", { item: "baggage report", text: REFS[c.s.ref].write });
          c.say("ref_track");
        }
        c.expect(refPending());
      },
      suggest: [{ lt: "Say thank you", hint: "g_social" }, { lt: "Ask to spell it or write it down", hint: "spell_write" }] },
    // Itzel's goodbye; then customs on the way out (Agente Medina, the `aduana` character)
    { id: "bye", when: (c) => !!c.s.refAck, done: (c) => !!c.s.itzelDone,
      ask: (c) => { c.speaker("priya"); c.say("anything_else"); c.expect(byePending()); },
      suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask something else", hint: "ask" }] },
    { id: "declare", when: (c) => !!c.s.itzelDone, done: (c) => c.s.declared !== undefined,
      ask: (c) => {
        c.speaker("aduana");
        // asked again after a side question: a shorter reminder, never the same line twice in a row
        if (c.s.customsGreeted) { c.s.declAsk = (c.s.declAsk ?? 0) + 1; c.say(c.s.declAsk % 2 ? "customs_again" : "customs_again2"); return; }
        c.s.customsGreeted = true;
        c.say(c.s.foodQ ? "customs_greet_food" : "customs_greet");
      },
      expects: ["declare_none", "declare_none_ctx", "declare_items", "declare_items_ctx", "declare_q", "declare_cash", "declare_cash_ctx", "q_form", "q_button", "q_allowance", "q_cash", "q_cash_amount",
        "personal_ctx"],
      suggest: [{ lt: "Say what you're bringing (or that it's nothing)", hint: "declare", options: "good" }, { lt: "Ask the customs officer", hint: "customs_q" }],
      // "Está bien, gracias" is no answer to "¿Trae algo que declarar?": the question comes again
      yes: (c) => { if (politeOnly(c)) return; c.say("customs_what"); c.expect(declareWhatPending()); },
      no: (c) => { declareNothing(c); } },
    { id: "food", when: (c) => !!c.s.itzelDone && c.s.askFood && c.s.declared === "nothing", done: (c) => !!c.s.foodAsked,
      ask: (c) => { c.speaker("aduana"); c.say("ask_food"); },
      expects: ["declare_none", "declare_none_ctx", "declare_items", "declare_items_ctx", "declare_q", "personal_ctx"],
      suggest: [{ lt: "Say whether you have any food", hint: "declare", options: "good" }],
      yes: (c) => { if (politeOnly(c)) return; c.s.foodAsked = true; c.say("customs_what"); c.expect(declareWhatPending()); },
      no: (c) => { declareNothing(c); } },
    // the twist: the sniffer dog sits by the backpack (the snack from the plane)
    { id: "dog", when: (c) => !!c.s.itzelDone && c.s.dogTwist && c.s.declared === "nothing" && (!c.s.askFood || !!c.s.foodAsked), done: (c) => !!c.s.dogDone,
      ask: (c) => { c.speaker("aduana"); if (!c.s.dogAsked) { c.s.dogAsked = true; c.twist("sniffer_dog"); c.say("dog_sat"); } c.say("dog_q"); },
      expects: ["declare_items", "declare_items_ctx", "declare_none", "declare_none_ctx", "hand_over", "q_why_ctx", "declare_q", "sorry_ctx", "personal_ctx"],
      suggest: [{ lt: "Say what food you have (or that you have none)", hint: "dog", options: ["apple", "sandwich", "banana"] }],
      yes: (c) => { if (politeOnly(c)) return; c.say("customs_what"); c.expect(declareWhatPending()); },
      no: (c) => { dogSearch(c); } },
    { id: "gift_value", when: (c) => !!c.s.itzelDone && (c.s.goods || []).includes("gifts"), done: (c) => c.s.giftValue !== undefined,
      ask: (c) => { c.speaker("aduana"); c.s.giftAsk = (c.s.giftAsk ?? 0) + 1; c.say(c.s.giftAsk === 1 ? "gift_value_q" : c.s.giftAsk % 2 ? "gift_value_again2" : "gift_value_again"); },
      expects: ["gift_value_ctx", "gift_whatif_ctx", "gift_dunno_ctx"],
      suggest: [{ lt: "Say what the gifts are worth", hint: "gift_value" }],
      // "Está bien" is no answer to "¿Más de 500 dólares?": never the duties lane on politeness
      yes: (c) => { if (politeOnly(c)) return; giftValue(c, "over"); },
      no: (c) => { giftValue(c, "under"); },
      help: (c) => { c.say("gift_estimate"); } },
  ],

  init: (c) => {
    c.s.askConnection = c.chance(0.35);
    c.s.askTag = c.chance(0.75);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.45);
    c.s.askSize = c.chance(0.6);
    c.s.askMaterial = c.chance(0.4);
    c.s.askMarks = c.chance(0.7);
    c.s.askBrand = c.chance(0.35);
    c.s.askContents = c.chance(0.4);
    c.s.offerKit = c.chance(0.55);
    c.s.ref = c.chance(0.5) ? "a" : "b";
    // customs (drawn last, so the baggage desk's draws stay as they were)
    c.s.foodQ = c.chance(0.4);
    c.s.askFood = !c.s.foodQ && c.chance(0.5);
    c.s.dogTwist = c.visits >= 1 && c.chance(0.4);
    c.s.snack = c.chance(0.5) ? "apple" : "sandwich";
  },

  start: (c) => {
    c.say("greet");
    c.s.greeted = true;
    c.hold();
  },

  handlers: {
    problem(c) {
      if (c.s.problem) { ack(c, 1); return; }
      c.s.problem = true;
      once(c, "sorry", "sorry_bag");
    },
    need_help(c) { if (!c.s.problem) c.say("what_happened"); else c.say("ack"); c.hold(); },
    flight(c, slots) {
      if (slots.city) c.s.fromCity = slots.city;
      if (slots.via) { c.s.viaCity = slots.via; c.s.via = "yes"; }
      if (slots.fnum || slots.city || slots.via || slots.airline) c.s.flight = true;
      ack(c, 0.5);
    },
    flight_num_ctx(c) { c.s.flight = true; ack(c, 0.6); },
    city_ctx(c, slots) { if (slots.city) { c.s.fromCity = slots.city; c.s.flight = true; } ack(c, 0.6); },
    no_connection(c, slots) { if (slots.city && !c.s.fromCity) c.s.fromCity = slots.city; c.s.via = null; ack(c, 0.7); },
    via_ctx(c, slots) { if (slots.via) { c.s.viaCity = slots.via; c.s.via = "yes"; } ack(c, 0.7); },
    dunno_ctx(c) {
      if (c.step === "flight") {
        c.s.askFrom = true;
        if (c.s.askFromDone) { c.s.flight = true; c.say("no_problem"); } else { c.s.askFromDone = true; c.say("ask_from"); c.expect(fromPending()); }
        return;
      }
      if (c.step === "brand") { c.s.brand = "unknown"; c.say("no_problem"); return; }
      c.say("no_problem");
    },
    hand_over(c) {
      // at customs: "Aquí está (la manzana)" hands the snack over at the dog's question
      if (c.s.itzelDone) { if (c.step === "dog" && !c.s.dogDone) admitSnack(c); else c.say("thank_you"); return; }
      if (c.step === "tag" || (c.s.tag === undefined && c.s.askTag)) { c.s.tag = true; once(c, "tag", "tag_thanks"); return; }
      c.say("thank_you");
    },
    hand_over_ctx(c) { baggage.handlers.hand_over(c, {}, { intent: "hand_over", slots: {}, tags: [] } as any); },
    tag_lost(c) { c.s.tag = false; c.say("tag_none"); },
    tag_lost_ctx(c) { c.s.tag = false; c.say("tag_none"); },
    describe(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    describe_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    color_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    type_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    size_ctx(c, slots, seg) {
      // "como de setenta centímetros" / "28 pulgadas": turn a measurement into a size
      if (!slots.size && typeof slots.cm === "number") slots.size = slots.cm >= 70 ? "large" : slots.cm >= 55 ? "medium" : "small";
      if (!slots.size && typeof slots.inch === "number") slots.size = slots.inch >= 27 ? "large" : slots.inch >= 22 ? "medium" : "small";
      takeDescription(c, slots, seg); echoDescription(c);
    },
    material_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    describe_fix(c, slots) {
      if (slots.wrong && (c.s.type === slots.wrong || c.s.color === slots.wrong)) {
        if (c.s.type === slots.wrong) c.s.type = undefined;
        if (c.s.color === slots.wrong) c.s.color = undefined;
        c.s.echoedOnce = false;
      }
      if (slots.bagtype) c.s.type = slots.bagtype;
      if (slots.color) c.s.color = slots.color;
      once(c, "fix", "fix_ok");
      if (c.s.type && c.s.color && c.s.type !== "bag") { c.s.echoedOnce = true; sayEcho(c); }
    },
    marks_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    marks_none(c) { c.s.marks = c.s.marks?.length ? c.s.marks : []; once(c, "np", "no_problem"); },
    marks_bare_ctx(c) { baggage.handlers.marks_none(c, {}, { intent: "marks_none", slots: {}, tags: [] } as any); },
    brand(c, slots) { c.s.brand = slots.brand; ack(c, 0.6); },
    contents(c, slots, seg) {
      // at customs, "Traigo unos chocolates" / "Solo ropa" is a declaration
      if (c.s.itzelDone) {
        const ids = allContent(slots);
        const goods = ids.includes("gifts") ? ["gifts"] : [];
        if (ids.includes("food")) goods.push("food");
        if (goods.length) baggage.handlers.declare_items(c, { good: goods[0], good2: goods[1] }, seg);
        else baggage.handlers.declare_none(c, {}, seg);
        return;
      }
      // A list may arrive split into several segments: speak once, then only add advice if a later part needs it.
      const tags = allTags(slots, seg);
      const level = tags.includes("valuable:med") ? 3 : tags.includes("valuable:yes") ? 2 : 1;
      const T = turn(c);
      c.s.contents = level === 3 ? "medicine" : level === 2 ? "valuable" : (pickFirst(slots, "content") ? "items" : "nothing");
      if (!T.contSaid) { T.contSaid = level; c.say(level === 3 ? "contents_medicine" : level === 2 ? "contents_valuables" : "contents_ok"); return; }
      if (level > T.contSaid) { T.contSaid = level; c.say(level === 3 ? "advice_medicine" : "advice_valuables"); }
    },
    delivery(c, slots, seg) {
      c.s.delivery = "deliver";
      if (slots.hotel) c.s.hotel = slots.hotel;
      // where to: the hotel ("a mi hotel", or a yes to Itzel's "…a su hotel?"), or somewhere else ("a la casa de mi amiga")
      if (seg.tags.includes("to_home")) c.s.dlTo = "home";
      else if (seg.tags.includes("to_hotel") || c.step === "delivery") c.s.dlTo = "hotel";
      if (turn(c).said_when) once(c, "dl", "ack"); else { once(c, "dl", deliveryOk(c)); turn(c).said_when = true; }
    },
    delivery_ctx(c, slots, seg) { baggage.handlers.delivery(c, slots, seg); },
    // "No, al hotel no": pick it up, or deliver it somewhere else?
    not_hotel_ctx(c) { c.say("ask_pickup_or_address"); c.expect(pickupOrAddressPending()); },
    pickup(c) { c.s.delivery = "pickup"; once(c, "dl", "pickup_ok"); },
    pick_ctx(c, slots, seg) { baggage.handlers.pickup(c, slots, seg); },
    stay(c, slots, seg) {
      c.s.hotel = slots.hotel ?? (seg.tags.includes("fam") ? "friend" : "address");
      // "En casa de una amiga", "En un Airbnb": no street yet, so a delivery still needs the address (the hotel step asks it)
      c.s.needAddr = !slots.hotel && !slots.street && !/\b(calle|avenida|numero|entre)\b/.test(plain(c.heard));
      ack(c, 0.6);
    },
    // "No sé la dirección", "Todavía no tengo hotel": for a delivery she calls for it; for a pickup it isn't needed
    addr_dunno_ctx(c) { c.s.hotel = c.s.hotel ?? "unknown"; c.s.needAddr = false; c.s.addrLater = true; c.say(c.s.delivery === "deliver" ? "addr_later" : "no_problem"); },
    phone(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    phone_ctx(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    // no local number: Itzel calls the hotel, or (staying with friends, at an address) the learner calls the desk
    phone_none(c) { c.s.phone = "none"; once(c, "ph", ["mar_azul", "other_hotel"].includes(c.s.hotel) ? "phone_none_ok" : "phone_none_call_us"); },
    q_when(c) { if (turn(c).said_when) return; c.s.whenSaid = true; once(c, "when", c.s.found ? "ans_when_found" : "ans_when"); },
    q_meantime(c) {
      c.s.kitDone = true;
      // the kit offered in full here (it answers "what do I do?"); a later re-ask is the short one
      if (!c.s.kitGiven) { c.s.kitGiven = true; c.s.kitOpen = true; c.s.kitAsked = true; c.say("offer_kit"); c.expect(kitPending()); return; }
      c.say("buy_basics"); c.say("receipts");
    },
    q_reimburse(c) { if (c.step === "kit") { c.s.kitDone = true; c.s.kitOpen = false; } c.say("buy_basics"); c.say("receipts"); },
    kit_yes_ctx(c) { c.s.kitDone = c.s.kitGiven = true; c.s.kitOpen = false; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
    kit_no_ctx(c) { c.s.kitDone = c.s.kitGiven = true; c.s.kitOpen = false; c.say("no_problem"); },
    q_call(c) { c.say("ans_call"); },
    q_track(c) { c.say("ans_track"); },
    q_free(c) {
      if (c.s.itzelDone) {
        const open = (c.s.goods || []).includes("gifts") && c.s.giftValue === undefined;
        c.say(c.s.giftValue === "over" ? "ans_pay_lane" : open ? "ans_pay_depends" : "ans_pay_no");
        return;
      }
      // while the kit is on offer, its price; otherwise the delivery's
      c.say(c.s.kitOpen ? "ans_kit_free" : "ans_free");
    },
    price_ctx(c, slots, seg) { baggage.handlers.q_free(c, slots, seg); },
    q_contact(c) { c.say(c.s.refGiven ? "ans_contact" : "ref_soon"); },
    q_what_if(c) { c.say("ans_what_if"); },
    q_copy(c) { c.say("ans_copy"); },
    q_taxi(c) { c.say("ans_taxi"); },
    q_shop(c) { c.say("ans_shop"); },
    q_ref(c) { if (c.s.refGiven) c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); else c.say("ref_soon"); },
    // ---- Customs ----
    declare_none(c, slots) {
      if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; }
      if (c.step === "dog" && !c.s.dogDone) { dogSearch(c); return; }
      // "Traigo chocolates, pero no fruta": the items stay declared
      if (turn(c).goods) return;
      declareNothing(c);
    },
    declare_none_ctx(c, slots, seg) { baggage.handlers.declare_none(c, slots, seg); },
    declare_items(c, slots, seg) {
      if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; }
      const goods = goodsFrom(slots);
      if (c.step === "dog" && !c.s.dogDone) thanksTelling(c);
      declareGoods(c, goods);
      // "Traigo unos regalos, pero valen menos de quinientos dólares": the value comes with them
      const tags = allTags(slots, seg);
      const n = typeof slots.gnum === "number" ? slots.gnum : undefined;
      if (goods.includes("gifts") && c.s.giftValue === undefined && (tags.includes("lt") || tags.includes("gt") || n !== undefined))
        giftValue(c, tags.includes("gt") ? "over" : tags.includes("lt") ? "under" : n! > 500 ? "over" : "under");
    },
    declare_items_ctx(c, slots, seg) { baggage.handlers.declare_items(c, slots, seg); },
    declare_q(c, slots) {
      if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; }
      const bad = goodsFrom(slots).map((id) => goodById(id)?.attrs?.bad).find(Boolean);
      if (bad) { c.say("no_short"); c.say(bad === "fruit" ? "not_allowed_fruit" : bad === "sandwich" ? "not_allowed_sandwich" : "not_allowed_meat"); }
      else if (!goodsFrom(slots).length) { c.say("ans_tell_me"); c.hold(); }
      else c.say("ans_can_check");
    },
    // at the desk, the form is Itzel's report
    q_form(c) { if (!c.s.itzelDone) { c.say("itzel_form"); return; } c.say(c.s.cash === "over" ? "ans_form_cash" : "ans_form"); },
    q_button(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("ans_button"); },
    q_allowance(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("ans_allowance"); },
    declare_cash(c, slots) {
      if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; }
      const n = typeof slots.number === "number" ? slots.number : 0;
      const h = c.heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const more = /\bmas de\b/.test(h), less = /\bmenos de\b/.test(h);
      // the line is 10,000 US dollars "or the equivalent" (ANAM): other money near it gets the rule, not a verdict
      // (rough rates, about 18 pesos and 0.9 euros to the dollar)
      const usd = /peso/.test(h) ? n / 18 : /euro/.test(h) ? n * 1.1 : n;
      const dollars = usd === n;
      let v: "over" | "under" | "equiv";
      if (dollars) v = n > 10000 || (more && n >= 10000) ? "over" : "under";
      else v = usd > 11500 || (more && usd >= 10000) ? "over" : usd < 8500 || (less && usd <= 10500) ? "under" : "equiv";
      c.s.cash = v === "under" ? "under" : "over";
      if (c.s.declared === undefined) c.s.declared = "nothing";
      c.say(v === "over" ? "cash_over" : v === "equiv" ? "cash_equiv" : "cash_ok");
    },
    declare_cash_ctx(c, slots, seg) { baggage.handlers.declare_cash(c, slots, seg); },
    q_cash(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("ans_cash"); },
    q_what_declare(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("ans_what_declare"); },
    // a question about a laptop, medicines or a bottle: personal luggage (the open question comes again)
    q_personal(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } once(c, "pers", "ans_personal"); },
    // a bottle or cigarettes declared: inside the personal luggage, so nothing to declare (the dog's question stays open)
    personal_ctx(c) {
      once(c, "pers", "ans_personal");
      if (c.step === "dog" && !c.s.dogDone) return;
      turn(c).acked = true;
      declareNothing(c);
    },
    gift_dunno_ctx(c) { c.say("gift_estimate"); c.hold(); },
    one_more_q_ctx(c) { c.say("go_ahead"); },
    q_cash_amount(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("ans_cash_amount"); },
    q_why(c) { if (!c.s.itzelDone) { once(c, "later", "customs_later"); return; } c.say("why_rule"); },
    q_why_ctx(c) { c.say("why_rule"); },
    // at the dog's question it owns up without saying what: "¿Qué trae?"
    sorry_ctx(c) { if (c.step === "dog" && !c.s.dogDone) { c.say("customs_what"); c.expect(declareWhatPending()); return; } c.say("no_worries"); },
    // "¿Y si son menos?" gets the allowance, "¿Y si valen más?" the lane
    gift_whatif_ctx(c) { c.say(/menos/.test(c.heard.toLowerCase()) ? "gift_whatif_less" : "gift_whatif"); },
    gift_value_ctx(c, slots, seg) {
      const tags = allTags(slots, seg);
      const n = typeof slots.number === "number" ? slots.number : undefined;
      const over = tags.includes("gt") ? true : tags.includes("lt") ? false : n !== undefined ? n > 500 : false;
      giftValue(c, over ? "over" : "under");
    },
    g_spell(c) {
      if (c.s.refGiven && !c.s.itzelDone) { c.say(c.s.ref === "a" ? "spell_a" : "spell_b"); c.hold(); return; }
      GLOBAL_HANDLERS.g_spell(c as any, {});
    },
    g_write(c) {
      if (c.s.refGiven && !c.s.itzelDone) {
        c.say("write_ref");
        (c as any).conv?.addNote?.({ en: REFS[c.s.ref].write });
        c.hold();
        return;
      }
      GLOBAL_HANDLERS.g_write(c as any, {});
    },
  },

  // Through customs: "Puede pasar" (after the self-declaration lane or the cash form she has already said what comes next)
  finish: (c) => {
    c.speaker("aduana");
    c.s.customsDone = true;
    if (c.s.giftValue !== "over" && c.s.cash !== "over" && !c.s.inspect) c.say(c.s.confiscated ? "pass_after" : "pass_ok");
    c.complete();
    c.expect(closingPending());
  },

  tests: [
    // Every hint construction
    { say: "Mi maleta no llegó.", intent: "problem" },
    { say: "Mi maleta no salió.", intent: "problem" },
    { say: "No encuentro mi equipaje.", intent: "problem" },
    { say: "Creo que mi maleta se perdió.", intent: "problem" },
    { say: "Quisiera reportar una maleta perdida.", intent: "problem" },
    { say: "Vuelo 482.", intent: "flight", step: "flight" },
    { say: "Vuelo PC 482.", intent: "flight", step: "flight" },
    { say: "Era el vuelo 482 de Houston.", intent: "flight", slots: { city: "houston" } },
    { say: "No me acuerdo del número de vuelo.", intent: "dunno_ctx", step: "flight" },
    { say: "Llegué de Toronto.", intent: "flight", slots: { city: "toronto" } },
    { say: "Hice escala en Cancún.", intent: "flight", slots: { via: "cancun" } },
    { say: "Sí, en Cancún.", intent: "via_ctx", step: "connection", slots: { via: "cancun" } },
    { say: "No, fue un vuelo directo.", intent: "no_connection", step: "connection" },
    { say: "Aquí está.", intent: "hand_over", step: "tag" },
    { say: "Está en mi pase de abordar.", intent: "hand_over", step: "tag" },
    { say: "Está en mi tarjeta de embarque.", intent: "hand_over", step: "tag" },
    { say: "Aquí tiene mi comprobante.", intent: "hand_over", step: "tag" },
    { say: "Creo que lo perdí.", intent: "tag_lost_ctx", step: "tag" },
    { say: "Es una maleta azul grande.", intent: "describe", slots: { np_desc: { bagtype: "suitcase", color: "blue", size: "large" } } },
    { say: "Es una maleta rígida con ruedas.", intent: "describe", step: "describe" },
    { say: "Es una mochila negra.", intent: "describe", step: "describe" },
    { say: "Tiene una franja roja a un lado.", intent: "describe", step: "marks" },
    { say: "Lleva un listón amarillo en la manija.", intent: "describe", step: "marks" },
    { say: "Tiene una etiqueta con mi nombre.", intent: "describe", step: "marks" },
    { say: "Azul.", intent: "color_ctx", step: "color", slots: { color: "blue" } },
    { say: "Una maleta.", intent: "type_ctx", step: "type", slots: { bagtype: "suitcase" } },
    { say: "Grande.", intent: "size_ctx", step: "size", slots: { size: "large" } },
    { say: "Rígida.", intent: "material_ctx", step: "material", slots: { material: "hard" } },
    { say: "No, nada especial.", intent: "marks_none", step: "marks" },
    { say: "Es una Samsonite.", intent: "brand", step: "brand" },
    { say: "Solo ropa y zapatos.", intent: "contents", step: "contents" },
    { say: "Traigo unos regalos.", intent: "contents", step: "contents" },
    { say: "Mis medicinas están adentro.", intent: "contents", step: "contents" },
    { say: "Nada de valor.", intent: "contents", step: "contents" },
    { say: "¿Me la pueden llevar a mi hotel?", intent: "delivery" },
    { say: "Sí, llévenla al hotel, por favor.", intent: "delivery", step: "delivery" },
    { say: "Paso por ella aquí.", intent: "pickup", step: "delivery" },
    { say: "Me estoy quedando en el Hotel Mar Azul.", intent: "stay", step: "hotel", slots: { hotel: "mar_azul" } },
    { say: "En el Hotel Mar Azul.", intent: "stay", step: "hotel" },
    { say: "Calle Flamboyán número 23, entre Hidalgo y Juárez.", intent: "stay", step: "hotel" },
    { say: "Mi número es 984 123 4567.", intent: "phone", step: "phone" },
    { say: "Es el más uno, cinco uno dos, cinco cinco cinco, cero uno, cuarenta y dos.", intent: "phone", step: "phone" },
    { say: "No tengo número mexicano.", intent: "phone_none", step: "phone", not: ["phone"] },
    { say: "¿Cuándo me la entregan?", intent: "q_when" },
    { say: "¿Qué hago mientras tanto?", intent: "q_meantime" },
    { say: "¿Me van a reembolsar lo que compre?", intent: "q_reimburse" },
    { say: "¿Me van a llamar?", intent: "q_call" },
    { say: "¿Puedo rastrearla en línea?", intent: "q_track" },
    { say: "¿Y si no la encuentran?", intent: "q_what_if" },
    { say: "¿Me da una copia?", intent: "q_copy" },
    { say: "¿La entrega es gratis?", intent: "q_free" },
    { say: "¿Cómo se escribe?", intent: "g_spell" },
    { say: "¿Me lo puede escribir?", intent: "g_write" },
    // Natural alternatives, short answers, accentless typing, tú to staff
    { say: "No llegó mi maleta", intent: "problem" },
    { say: "mi maleta no llego", intent: "problem" },
    { say: "Esperé una hora y mi maleta nunca salió", intent: "problem" },
    { say: "Todos recogieron sus maletas menos yo", intent: "problem" },
    { say: "¿Me puedes ayudar?", intent: "need_help" },
    { say: "Cuatro ochenta y dos", intent: "flight_num_ctx", step: "flight" },
    { say: "Pe ce cuatro ocho dos", intent: "flight_num_ctx", step: "flight" },
    { say: "Vengo de Nueva York con escala en Cancún", intent: "flight", slots: { city: "new_york", via: "cancun" } },
    { say: "No me dieron ningún talón", intent: "tag_lost", step: "tag" },
    { say: "Grande, azul, de plástico duro", intent: "describe", step: "describe" },
    { say: "Es una maleta de rueditas negra", intent: "describe", step: "describe" },
    { say: "Azul marino", intent: "color_ctx", step: "color", slots: { color: "navy" } },
    { say: "Negro", intent: "color_ctx", step: "color", slots: { color: "black" } },
    { say: "Como de setenta centímetros", intent: "size_ctx", step: "size" },
    { say: "Muchas calcomanías", intent: "marks_ctx", step: "marks" },
    { say: "No tiene marca, es una maleta barata", intent: "dunno_ctx", step: "brand" },
    { say: "Unos regalos para mi familia", intent: "contents", step: "contents" },
    { say: "Yo vengo por ella", intent: "pickup", step: "delivery" },
    { say: "¿Me la pueden mandar a la casa de mi amiga?", intent: "delivery", step: "delivery" },
    { say: "En casa de una amiga", intent: "stay", step: "hotel" },
    { say: "984 123 4567", intent: "phone_ctx", step: "phone" },
    { say: "Mi celular no funciona aquí", intent: "phone_none", step: "phone" },
    { say: "Sí, me sirve mucho", intent: "kit_yes_ctx", step: "kit" },
    { say: "No, gracias, traigo todo en mi mochila", intent: "kit_no_ctx", step: "kit" },
    { say: "¿Cuál era el número?", intent: "q_ref" },
    { say: "¿Dónde hay taxis?", intent: "q_taxi" },
    // Spain forms are correct answers
    { say: "Mi móvil es el 984 123 4567", intent: "phone", step: "phone" },
    { say: "¿Me la podéis llevar al hotel?", intent: "delivery" },
    { say: "Tiene muchas pegatinas", intent: "describe", step: "marks" },
    { say: "¿Dónde puedo coger un taxi?", intent: "q_taxi" },
    // Meaning safety: no meaning may flip
    { say: "No es una mochila, es una maleta", intent: "describe_fix", step: "describe", not: ["type_ctx"] },
    { say: "No, roja no. Azul", intent: "describe_fix", step: "color" },
    { say: "No, no me la lleven", intent: "pickup", step: "delivery", not: ["delivery"] },
    { say: "No quiero que la lleven al hotel", intent: "pickup", step: "delivery", not: ["delivery"] },
    { say: "No necesito el kit", intent: "kit_no_ctx", step: "kit", not: ["kit_yes_ctx"] },
    { say: "No hice escala en Cancún", intent: "no_connection", step: "connection", not: ["via_ctx"] },
    { say: "No tengo el talón", intent: "tag_lost", step: "tag", not: ["hand_over"] },
    { say: "No tiene listón", intent: "marks_none", step: "marks", not: ["describe", "marks_ctx"] },
    { say: "No tiene etiqueta con mi nombre", intent: "marks_none", step: "marks", not: ["describe", "marks_ctx"] },
    { say: "Sí, pero no al hotel", intent: "delivery", step: "delivery", not: ["pickup"] },
    { say: "Mi maleta no se perdió", intent: "none" },
    { say: "No me quedo en el Hotel Mar Azul", intent: "none", step: "hotel" },
    { say: "No traigo nada de valor", intent: "contents", step: "contents" },
    { say: "Mi maleta sí llegó", intent: "none" },
    { say: "No perdí mi maleta", intent: "none" },
    { say: "No sé el nombre del hotel", intent: "addr_dunno_ctx", step: "hotel", not: ["stay"] },
    { say: "No tengo WhatsApp", intent: "none", step: "phone" },
    // Review traps (s65b review): a bare "no hace falta" is not a pickup, "No, al hotel no" is not a delivery
    { say: "No, no hace falta", intent: "kit_no_ctx", step: "kit", not: ["pickup"] },
    { say: "No hace falta", intent: "yn:no", step: "phone", not: ["pickup"] },
    { say: "No, al hotel no", intent: "not_hotel_ctx", step: "delivery", not: ["delivery", "pickup"] },
    { say: "No al hotel, prefiero recogerla", intent: "pickup", step: "delivery", not: ["delivery"] },
    { say: "¿Tengo que pagar algo?", intent: "q_free", step: "delivery", not: ["delivery"] },
    { say: "No tengo mis cosas", intent: "q_meantime", step: "kit", not: ["kit_no_ctx"] },
    { say: "No tengo nada", intent: "none", step: "phone", not: ["q_meantime", "marks_none"] },
    { say: "No tengo nada", intent: "none", step: "tag", not: ["marks_none", "hand_over"] },
    { say: "Aquí", intent: "hand_over_ctx", step: "tag" },
    { say: "No fue directo, hice escala en Monterrey", intent: "via_ctx", step: "connection", slots: { via: "monterrey" }, not: ["no_connection"] },
    { say: "No es grande, es chica", intent: "size_ctx", step: "size", slots: { size: "small" } },
    { say: "No es grande", intent: "none", step: "size", not: ["size_ctx", "describe"] },
    { say: "No es de tela", intent: "none", step: "material", not: ["material_ctx", "describe"] },
    { say: "No tiene ruedas", intent: "none", step: "marks", not: ["describe", "marks_ctx"] },
    { say: "No estoy en un hotel, estoy con unos amigos", intent: "stay", step: "hotel" },
    { say: "No tengo celular", intent: "phone_none", step: "phone", not: ["phone"] },
    { say: "No sé, creo que Samsonite", intent: "brand", step: "brand" },
    // Customs (Agente Medina): every hint, natural alternatives, short answers
    { say: "No, nada que declarar.", intent: "declare_none", step: "declare" },
    { say: "No, no traigo nada.", intent: "declare_none_ctx", step: "declare" },
    { say: "Solo ropa y cosas personales.", intent: "declare_none", step: "declare", not: ["contents"] },
    { say: "No traigo comida.", intent: "declare_none", step: "food", not: ["declare_items"] },
    { say: "Traigo unos chocolates.", intent: "declare_items", step: "declare", slots: { goods: { good_item: { good: "chocolate" } } } },
    { say: "Solo unos regalos.", intent: "declare_items", step: "declare" },
    { say: "¿Puedo traer queso?", intent: "declare_q", step: "declare", not: ["declare_items"] },
    { say: "Ah, sí, perdón: traigo una manzana del avión.", intent: "declare_items", step: "dog", slots: { goods: { good_item: { good: "apple" } } } },
    { say: "Se me olvidó: traigo un sándwich.", intent: "declare_items", step: "dog" },
    { say: "Una manzana.", intent: "declare_items_ctx", step: "dog" },
    { say: "¿Tengo que llenar algún formulario?", intent: "q_form", step: "declare" },
    { say: "¿Hay que apretar el botón?", intent: "q_button", step: "declare" },
    { say: "¿Dónde está el semáforo?", intent: "q_button", step: "declare" },
    { say: "¿Cuánto puedo traer sin pagar impuestos?", intent: "q_allowance", step: "declare" },
    { say: "¿Tengo que declarar el dinero?", intent: "q_cash", step: "declare" },
    { say: "¿Por qué no puede pasar la fruta?", intent: "q_why" },
    { say: "No, menos de quinientos dólares.", intent: "gift_value_ctx", step: "gift_value" },
    { say: "Sí, más de quinientos.", intent: "gift_value_ctx", step: "gift_value" },
    { say: "Son como doscientos dólares", intent: "gift_value_ctx", step: "gift_value", slots: { number: 200 } },
    { say: "nada que declarar", intent: "declare_none", step: "declare" },
    { say: "Nomás traigo ropa", intent: "declare_none", step: "declare" },
    { say: "Traigo un plátano y una naranja", intent: "declare_items", step: "food" },
    // Spain forms
    { say: "Vale, no llevo nada que declarar", intent: "declare_none", step: "declare" },
    { say: "Llevo un bocadillo del avión", intent: "declare_items", step: "dog" },
    // Customs meaning safety
    { say: "No traigo ninguna manzana", intent: "declare_none", step: "declare", not: ["declare_items", "declare_items_ctx"] },
    { say: "No tengo fruta ni carne", intent: "declare_none", step: "food", not: ["declare_items", "declare_items_ctx"] },
    { say: "No, de verdad no traigo comida", intent: "declare_none", step: "dog", not: ["declare_items", "declare_items_ctx"] },
    { say: "¿Puedo traer una manzana?", intent: "declare_q", step: "dog", not: ["declare_items", "declare_items_ctx"] },
    { say: "Ayer comí una manzana", intent: "declare_none", step: "declare", not: ["declare_items", "declare_items_ctx"] },
    { say: "No traigo nada, solo una manzana", intent: "declare_items", step: "dog", not: ["declare_none", "declare_none_ctx"] },
    { say: "Traigo dos mil dólares en efectivo", intent: "declare_cash", step: "declare", not: ["declare_items"] },
    { say: "No traigo nada", intent: "none", step: "phone", not: ["declare_none_ctx", "declare_items"] },
    { say: "Traigo unos chocolates", intent: "contents", step: "contents", not: ["declare_items"] },
    { say: "¿Y si valen más de quinientos?", intent: "gift_whatif_ctx", step: "gift_value", not: ["gift_value_ctx"] },
    { say: "Perdón, no me acordaba", intent: "sorry_ctx", step: "dog", not: ["declare_items", "declare_none"] },
    // Review (2 Nov 2026): the reviewer's traps and the forms the blind set missed
    { say: "Traigo más de diez mil dólares", intent: "declare_cash", step: "declare", slots: { number: 10000 } },
    { say: "No sé si tengo que declarar algo", intent: "declare_q", step: "declare", not: ["declare_none", "declare_none_ctx", "declare_items", "declare_items_ctx"] },
    { say: "¿Y si traigo una manzana?", intent: "declare_q", step: "declare", not: ["declare_items", "declare_items_ctx"] },
    { say: "No traigo fruta, solo chocolates", intent: "declare_items", step: "declare", not: ["declare_none"], slots: { goods: { good_item: { good: "chocolate" } } } },
    { say: "No traigo fruta ni carne", intent: "declare_none", step: "declare", not: ["declare_items"] },
    { say: "No pasan de quinientos", intent: "gift_value_ctx", step: "gift_value", slots: { number: 500 } },
    { say: "¿Y si son menos?", intent: "gift_whatif_ctx", step: "gift_value", not: ["gift_value_ctx"] },
    { say: "Algo empacado", intent: "declare_items_ctx", step: "declare", slots: { goods: { good_item: { good: "packaged" } } } },
    { say: "Unas papitas", intent: "declare_items_ctx", step: "food" },
    { say: "Tengo una manzana pero es del avión", intent: "declare_items", step: "dog" },
    { say: "Tenía una manzana pero me la comí", intent: "declare_none", step: "dog", not: ["declare_items", "declare_items_ctx"] },
    { say: "No sé, creo que no", intent: "declare_none_ctx", step: "dog", not: ["declare_items", "declare_items_ctx", "hand_over"] },
    { say: "Traigo una manzana, no, perdón, un plátano", intent: "declare_items", step: "declare", slots: { goods: { good_item: { good: "banana" } } } },
    { say: "Traigo jamón", intent: "declare_items", step: "declare", slots: { goods: { good_item: { good: "cured" } } } },
    { say: "¿Cuánto dinero puedo traer?", intent: "q_cash_amount", step: "declare", not: ["declare_cash"] },
    { say: "¿Cuándo llega mi maleta?", intent: "q_when", step: "declare" },
    // Audit (5 Nov 2026): prices at the offers, "not to the hotel", the address, whole sentences, customs questions
    { say: "¿Cuánto cuesta?", intent: "price_ctx", step: "delivery", not: ["delivery", "pickup"] },
    { say: "¿Tiene algún costo?", intent: "q_free", step: "delivery", not: ["delivery"] },
    { say: "¿Tiene costo?", intent: "q_free", step: "kit", not: ["kit_yes_ctx", "kit_no_ctx"] },
    { say: "No estoy en un hotel", intent: "not_hotel_ctx", step: "delivery", not: ["delivery", "pickup"] },
    { say: "Mejor a la casa de mi amiga", intent: "delivery_ctx", step: "delivery", not: ["pickup"] },
    { say: "¿A qué hora me la traen?", intent: "q_when", step: "delivery", not: ["delivery"] },
    { say: "No sé la dirección", intent: "addr_dunno_ctx", step: "hotel", not: ["stay"] },
    { say: "Le doy mi número: 984 123 4567", intent: "phone", step: "phone" },
    { say: "Llegué hace una hora en el vuelo de Houston", intent: "flight", step: "flight", slots: { city: "houston" } },
    { say: "Mi vuelo fue el 482 de Houston", intent: "flight", step: "flight", slots: { city: "houston" } },
    { say: "¿Cuál es su teléfono?", intent: "q_contact" },
    { say: "¿Qué tengo que declarar?", intent: "q_what_declare", step: "declare", not: ["declare_none", "declare_none_ctx", "declare_items"] },
    { say: "¿Puedo traer mi laptop?", intent: "q_personal", step: "declare", not: ["declare_none", "declare_none_ctx", "contents", "delivery"] },
    { say: "¿Puedo traer mi laptop?", intent: "q_personal", step: "delivery", not: ["delivery"] },
    { say: "¿Tengo que declarar mis medicinas?", intent: "q_personal", step: "declare", not: ["declare_none", "declare_none_ctx", "contents"] },
    { say: "Traigo una botella de tequila", intent: "personal_ctx", step: "declare", not: ["declare_items", "declare_none"] },
    { say: "No, solo traigo una botella de vino", intent: "personal_ctx", step: "food" },
    { say: "Traigo unos regalos, pero valen menos de quinientos dólares", intent: "declare_items", step: "declare", slots: { gnum: 500 } },
    { say: "No sé cuánto valen", intent: "gift_dunno_ctx", step: "gift_value", not: ["gift_value_ctx"] },
    { say: "¿Puedo traer manzanas?", intent: "declare_q", step: "declare", not: ["declare_items", "declare_items_ctx"] },
    // Not understood
    { say: "Mi perro baila salsa en la playa", intent: "none" },
    { say: "Quiero un café con leche", intent: "none" },
    { say: "Azul", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
  ],

  sims: [
    // the bag is not in the system (so it is described), and Itzel asks for the tag
    // "…a mi hotel" is used: Itzel asks which hotel ("¿Dónde se está hospedando?"), never the address
    { name: "happy path: report, describe, deliver", turns: ["Hola, mi maleta no llegó.", "Era el vuelo 482 de Houston.", "Sí, aquí está.", "Es una maleta azul grande con una franja roja a un lado.", "Por favor, llévenla a mi hotel.", "En el Hotel Mar Azul.", "Mi número es 984 123 4567."],
      expect: { complete: true, state: { dlTo: "hotel", hotelQ: "ask_hotel", color: "blue", type: "suitcase" } }, auto: BG_AUTO, setup: (s) => { s.foundTwist = false; s.askTag = true; } },
    // a yes to "¿Quiere que se la llevemos a su hotel?" also says where: only the hotel is missing
    { name: "yes to delivery to the hotel", turns: ["Buenas tardes, no llegó mi maleta.", "Vuelo 482 de Toronto.", "Aquí tiene mi comprobante.", "Es una maleta negra rígida con ruedas.", "Sí, por favor.", "Me hospedo en el Hotel Mar Azul.", "Es el 984 123 4567."],
      expect: { complete: true, state: { dlTo: "hotel", hotelQ: "ask_hotel", material: "hard" } }, auto: BG_AUTO,
      setup: (s) => { s.foundTwist = false; s.askTag = true; s.askConnection = false; s.askSize = false; s.askMaterial = false; s.askMarks = false; s.askBrand = false; s.askContents = false; } },
    // to a friend's house: Itzel asks for the address, not where the learner is staying
    { name: "deliver it to a friend's house", turns: ["Mi maleta no llegó.", "Era el vuelo 482 de Houston.", "Sí, aquí está.", "Es una maleta azul grande.", "¿Me la pueden llevar a la casa de mi amiga?", "Calle Flamboyán número 23, entre Hidalgo y Juárez.", "Mi número es 984 123 4567."],
      expect: { complete: true, state: { dlTo: "home", hotelQ: "ask_deliver_where" } }, auto: BG_AUTO, setup: (s) => { s.foundTwist = false; s.askTag = true; } },
    // the bag is described in three short answers (color, type, size), and the courtesy kit is offered
    { name: "short answers, side questions, spelling the report number", turns: ["No encuentro mi equipaje.", "Vuelo 482.", "Azul.", "Una maleta.", "Grande.", "Llévenla al hotel, por favor. ¿Cuándo me la entregan?", "Mar Azul.", "984 123 4567", "Sí, por favor.", "¿Cómo se escribe?", "Gracias, adiós."],
      expect: { complete: true, state: { color: "blue", type: "suitcase", size: "large", kitDone: true } }, auto: omit(BG_AUTO, ["flight", "describe", "type", "size", "delivery", "hotel", "phone", "kit", "ref"]),
      setup: (s) => { s.foundTwist = false; s.askSize = true; s.askMaterial = false; s.askMarks = false; s.askBrand = false; s.askContents = false; s.offerKit = true; } },
    // the twist on every seed: the bag is found in the system (no description): it stayed in Cancún
    { name: "twist: the bag is found in Cancún, deliver it", turns: ["Hola, mi maleta no llegó.", "Era el vuelo 482 de Houston, con escala en Cancún.", "Sí, aquí está.", "¡Qué bien! Sí, llévenla a mi hotel, por favor.", "¿Cuándo me la entregan?", "Al Hotel Mar Azul.", "Es el 984 123 4567.", "¡Muchas gracias!"],
      expect: { complete: true, state: { found: true, viaCity: "cancun", dlTo: "hotel" } }, auto: BG_AUTO, setup: (s) => { s.foundTwist = true; s.askTag = true; } },
    { name: "no tag, no flight number, pick up, write it down", turns: ["Buenas tardes. Creo que mi maleta se perdió.", "No me acuerdo del número de vuelo.", "De Toronto.", "Creo que lo perdí.", "Es una mochila negra.", "Prefiero recogerla aquí.", "Me estoy quedando en el Hotel Mar Azul.", "No tengo número mexicano.", "¿Me lo puede escribir?", "¡Gracias!"],
      expect: { complete: true, state: { delivery: "pickup", tag: false, phone: "none", type: "backpack" } }, auto: omit(BG_AUTO, ["flight", "from_city", "tag", "describe", "delivery", "hotel", "phone"]),
      setup: (s) => { s.askTag = true; s.foundTwist = false; s.offerKit = false; } },
    // questions and changes of mind: the color is corrected, delivery becomes a pickup
    { name: "questions and changes of mind", turns: ["Mi maleta no llegó.", "Vuelo 482 de Toronto.", "Aquí está mi pase de abordar.", "Es una mochila negra.", "No, no es negra, es azul.", "¿Me la pueden llevar a mi hotel?", "¿La entrega es gratis?", "No, mejor paso por ella mañana.", "En el Hotel Mar Azul.", "984 123 4567", "¿Qué hago mientras tanto?", "Sí, por favor.", "¿Me van a llamar?", "Gracias."],
      expect: { complete: true, state: { color: "blue", type: "backpack", delivery: "pickup" } }, auto: omit(BG_AUTO, ["flight", "tag", "describe", "hotel", "phone", "ref"]),
      setup: (s) => { s.foundTwist = false; s.askTag = true; s.askConnection = false; s.askMarks = false; s.askBrand = false; s.askContents = false; s.offerKit = false; } },
    // the bag in pieces: kind, then color, marks, brand and contents; picked up by the learner, staying with a friend
    { name: "the bag in pieces, staying with a friend", turns: ["Mi maleta no llegó.", "Vuelo 482 de Houston.", "Una maleta.", "Azul marino.", "Muchas calcomanías.", "No me acuerdo de la marca.", "Ropa, zapatos y unos regalos.", "Paso por ella mañana.", "En casa de una amiga.", "No tengo número mexicano."],
      expect: { complete: true, state: { type: "suitcase", color: "navy", brand: "unknown", contents: "items", delivery: "pickup", hotel: "friend", phone: "none" } },
      auto: omit(BG_AUTO, ["flight", "describe", "color", "marks", "brand", "contents", "delivery", "hotel", "phone"]),
      setup: (s) => { s.foundTwist = false; s.askSize = false; s.askMarks = true; s.askBrand = true; s.askContents = true; } },
    // the kit is declined with "no hace falta" (the delivery stays), then "¿Qué hago mientras tanto?" isn't answered with the kit again
    { name: "kit declined, then what to do in the meantime", turns: ["Mi maleta no llegó.", "Vuelo 482 de Houston.", "Es una maleta negra.", "Sí, por favor.", "En el Hotel Mar Azul.", "984 123 4567",
      "No, no hace falta, gracias.", "¿Qué hago mientras tanto?", "Gracias."],
      expect: { complete: true, state: { delivery: "deliver", kitGiven: true, kitDone: true } }, auto: omit(BG_AUTO, ["describe", "delivery", "hotel", "phone", "kit", "ref"]),
      setup: (s) => { s.foundTwist = false; s.askTag = false; s.askConnection = false; s.askSize = false; s.askMaterial = false; s.askMarks = false; s.askBrand = false; s.askContents = false; s.offerKit = true; } },
    // Customs (Agente Medina) after Itzel's goodbye
    { name: "customs: nothing to declare, the form and the button", turns: [...DESK, "No, es todo, muchas gracias.", "¿Tengo que llenar algún formulario?", "¿Hay que apretar el botón?",
      "No, nada que declarar.", "Gracias, adiós."],
      expect: { complete: true, state: { itzelDone: true, declared: "nothing", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    { name: "customs: an apple declared, then why", turns: [...DESK, "No, gracias.", "Sí, traigo una manzana del avión.", "¿Por qué no puede pasar la fruta?", "Ah, ok. Gracias."],
      expect: { complete: true, state: { declared: "items", confiscated: "apple", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = true; s.askFood = false; s.dogTwist = false; } },
    // the twist on every seed: the dog sits by the backpack; the learner owns up to the sandwich
    { name: "twist: the sniffer dog, the learner owns up", turns: [...DESK, "No, eso es todo. Gracias.", "No, nada que declarar.", "Ay, sí, perdón. Traigo un sándwich del avión.", "Gracias."],
      expect: { complete: true, state: { dogDone: true, confiscated: "sandwich", searched: undefined } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = true; s.snack = "sandwich"; } },
    // the twist, denied: Medina checks the backpack and finds the apple
    { name: "twist: the sniffer dog, the learner says no", turns: [...DESK, "No, gracias.", "No, no traigo nada.", "No traigo fruta.", "No, de verdad no traigo comida.", "Perdón, no me acordaba.", "Gracias."],
      expect: { complete: true, state: { dogDone: true, searched: true, confiscated: "apple", foodAsked: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = true; s.dogTwist = true; s.snack = "apple"; } },
    // gifts within the 500-dollar allowance, with the learner's short answers
    { name: "customs: short answers, gifts within the allowance", turns: [...DESK, "No.", "Sí.", "Unos regalos.", "¿Cuánto puedo traer sin pagar impuestos?", "No, son como doscientos dólares.", "Gracias."],
      expect: { complete: true, state: { declared: "items", giftValue: "under" } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    // cash: under the 10,000-dollar line nothing is declared (a Spain "vale" closes); over it, the cash form
    { name: "customs: cash under the limit", turns: [...DESK, "No, gracias.", "Sí.", "Dos mil dólares en efectivo.", "Vale, gracias."],
      expect: { complete: true, state: { cash: "under", declared: "nothing", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    { name: "customs: cash over the limit", turns: [...DESK, "No, gracias.", "¿Tengo que declarar el dinero?", "Traigo quince mil dólares en efectivo.", "Muy bien, gracias."],
      expect: { complete: true, state: { cash: "over", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    // review: politeness never answers "¿Algo que declarar?" or "¿Más de 500 dólares?"; "más de diez mil" is over the line
    { name: "review: polite answers, gifts under, cash over", turns: [...DESK, "No, gracias.", "Está bien.", "Traigo unos regalos y más de diez mil dólares.", "Está bien.",
      "No, menos de quinientos.", "Gracias."],
      expect: { complete: true, state: { declared: "items", giftValue: "under", cash: "over", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    // gifts over the allowance: the self-declaration lane; a what-if first changes nothing
    { name: "customs: gifts over the allowance", turns: [...DESK, "No, gracias.", "Traigo unos regalos para mi familia.", "¿Cuánto tengo que pagar?", "¿Y si valen más de quinientos?", "Sí, como ochocientos dólares.", "¿Cuánto tengo que pagar?", "Muy bien, gracias."],
      expect: { complete: true, state: { giftValue: "over", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    // audit (5 Nov 2026): a price question at each offer, "No, al hotel no" (pickup or another address?), the desk's phone
    { name: "audit: prices at the offers, not to the hotel", turns: ["Mi maleta no llegó.", "Vuelo 482 de Houston.", "Es una maleta negra.", "¿Cuánto cuesta?", "No, al hotel no.",
      "A la casa de mi amiga, por favor.", "Calle Flamboyán número 23, entre Hidalgo y Juárez.", "984 123 4567", "¿Tiene costo?", "Sí, por favor.", "¿Cuál es su teléfono?", "Gracias."],
      expect: { complete: true, state: { delivery: "deliver", dlTo: "home", hotel: "address", kitGiven: true } }, auto: omit(BG_AUTO, ["describe", "delivery", "hotel", "phone", "kit", "ref"]),
      setup: (s) => { deskSetup(s); s.offerKit = true; } },
    // a delivery to a friend's house needs the street; "No sé la dirección" gets a call for it
    { name: "audit: staying with a friend, no address yet", turns: ["Mi maleta no llegó.", "Vuelo 482 de Houston.", "Es una maleta negra.", "Sí, por favor.", "En casa de una amiga.", "No sé la dirección.", "984 123 4567", "Gracias."],
      expect: { complete: true, state: { delivery: "deliver", hotel: "friend", addrLater: true } }, auto: omit(BG_AUTO, ["describe", "delivery", "hotel", "phone", "ref"]),
      setup: (s) => { deskSetup(s); } },
    // customs questions (what to declare, a laptop) and the gifts with their value in one answer
    { name: "audit: customs questions, gifts with their value", turns: [...DESK, "No, gracias.", "¿Qué tengo que declarar?", "¿Puedo traer mi laptop?", "Traigo unos regalos, pero valen menos de quinientos dólares.", "Gracias."],
      expect: { complete: true, state: { declared: "items", giftValue: "under", customsDone: true } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = false; } },
    // a bottle of tequila is personal luggage; at the dog "Sí, unos chocolates" still gets the backpack checked
    { name: "audit: tequila, then the dog and the chocolates", turns: [...DESK, "No, gracias.", "Traigo una botella de tequila.", "Sí, traigo unos chocolates.", "Perdón, no me acordaba.", "Gracias."],
      expect: { complete: true, state: { declared: "items", dogDone: true, searched: true, confiscated: "apple" } }, auto: omit(DESK_AUTO, CUSTOMS_KEYS),
      setup: (s) => { deskSetup(s); s.foodQ = false; s.askFood = false; s.dogTwist = true; s.snack = "apple"; } },
  ],
};

/** After the report number: thanks, spell / write requests, or questions; then "¿Algo más?". */
function refPending(): Pending {
  const ok = (cc: Ctx) => { cc.s.refAck = true; };
  return {
    id: "ref", optional: false, hints: ["g_clarify", "ask"],
    suggest: [{ lt: "Say thank you", hint: "g_social" }, { lt: "Ask to spell it or write it down", hint: "spell_write" }],
    on: {
      g_thanks: ok, g_ok: ok,
      // "Gracias, adiós" at the desk: Itzel's goodbye, and on to customs
      g_bye: (cc) => { cc.s.refAck = true; once(cc, "close", "you_welcome"); cc.s.itzelDone = true; },
      g_spell: (cc) => { cc.say(cc.s.ref === "a" ? "spell_a" : "spell_b"); cc.expect(refPending()); },
      g_write: (cc) => { cc.say("write_ref"); (cc as any).conv?.addNote?.({ en: REFS[cc.s.ref].write }); cc.expect(refPending()); },
    },
    yes: ok, no: ok,
  };
}

function kitPending(): Pending {
  // "¿Cuánto cuesta?" isn't handled here: q_free answers it (the kit is free) and the offer comes again, in short
  const shut = (cc: Ctx) => { cc.s.kitOpen = false; };
  return {
    id: "kit", expects: ["q_reimburse", "kit_yes_ctx", "kit_no_ctx", "price_ctx"], hints: ["g_yesno", "kit"], suggest: [{ lt: "Accept the kit (yes / no)", hint: "g_yesno" }, { lt: "Ask about the costs", hint: "kit" }],
    on: {
      q_reimburse: (cc) => { shut(cc); cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("buy_basics"); cc.say("receipts"); },
      kit_yes_ctx: (cc) => { shut(cc); cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
      kit_no_ctx: (cc) => { shut(cc); cc.say("buy_basics"); cc.say("receipts"); },
    },
    yes: (cc) => { shut(cc); cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
    no: (cc) => { shut(cc); cc.say("buy_basics"); cc.say("receipts"); },
    ask: (cc) => askKit(cc),
  };
}

/** The courtesy kit: offered in full once; after a side question, asked again in short ("¿Entonces se lo doy?"). */
function askKit(c: Ctx) {
  c.s.kitOpen = true;
  if (c.s.kitAsked) { c.say("kit_again"); return; }
  c.s.kitAsked = true;
  c.say("offer_kit");
}

/** The yes to the delivery: when it comes ("usually within 24 hours"), unless the learner has just been told. */
const deliveryOk = (c: Ctx) => (c.s.whenSaid ? "ack" : c.s.found ? "delivery_ok_found" : "delivery_ok");

/** At a hotel by name: the delivery question can say "a su hotel". */
const inHotel = (c: Ctx) => ["mar_azul", "other_hotel"].includes(c.s.hotel);

/** "¿Prefiere recogerla aquí, o se la llevamos a otra dirección?" (after "No, al hotel no"). A bare yes or no answers
 *  neither half, so she asks again in her other words; "Llévenla, por favor" here means the other address. */
function pickupOrAddressPending(): Pending {
  const elsewhere = (cc: Ctx, sl: any, sg: Segment) => { baggage.handlers.delivery(cc, sl, sg); if (!sg.tags.includes("to_hotel")) cc.s.dlTo = "home"; };
  const again = (cc: Ctx) => { cc.say("ask_pickup_or_address"); cc.expect(pickupOrAddressPending()); };
  return {
    id: "pickup_or_address", expects: ["pickup", "pick_ctx", "delivery", "delivery_ctx", "price_ctx"], hints: ["pick_or_addr"],
    suggest: [{ lt: "Pick it up here, or give another address", hint: "pick_or_addr" }],
    on: {
      pickup: (cc, sl, sg) => { baggage.handlers.pickup(cc, sl, sg); },
      pick_ctx: (cc, sl, sg) => { baggage.handlers.pickup(cc, sl, sg); },
      delivery: elsewhere,
      delivery_ctx: elsewhere,
    },
    yes: again,
    no: again,
    ask: (cc) => cc.say("ask_pickup_or_address"),
  };
}

/** "Está bien. ¿De qué ciudad venía?" (after "No me acuerdo del número de vuelo"). */
function fromPending(): Pending {
  return {
    id: "from_city", expects: ["flight", "city_ctx", "dunno_ctx"], hints: ["from"],
    suggest: [{ lt: "Say which city you flew from", hint: "from", options: "city" }],
    on: {
      flight: (cc, sl, sg) => { baggage.handlers.flight(cc, sl, sg); },
      city_ctx: (cc, sl, sg) => { baggage.handlers.city_ctx(cc, sl, sg); },
      dunno_ctx: (cc) => { cc.s.flight = true; cc.say("no_problem"); },
    },
    ask: (cc) => cc.say("ask_from"),
  };
}

// Mission checklist helpers: follow-up questions keep their main item open.
const stepDef = (id: string) => baggage.steps.find((x) => x.id === id)!;
const stepOpen = (c: Ctx, id: string) => { const st = stepDef(id); return (!st.when || !!st.when(c)) && !st.done(c); };
/** The description questions (skipped when the bag turns up in the system). */
const DESCRIBE = ["describe", "type", "color", "size", "material", "marks", "brand", "contents"];

/** Ask the next applicable step (used after a statement-only step such as the system lookup). */
function askNext(c: Ctx) {
  for (const st of baggage.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

// ---------------------------------------------------------------------------
// Customs helpers (Agente Medina)

/** The goods named in a declaration ("una manzana y unos chocolates"). */
function goodsFrom(slots: any): string[] {
  const out: string[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const [k, x] of Object.entries(o)) {
      if (k === "__tags") continue;
      if ((k === "good" || k === "good2") && typeof x === "string") { if (!out.includes(x)) out.push(x); }
      else walk(x);
    }
  };
  // the declared list only: in "No traigo fruta, traigo chocolates" the fruit ({good} outside {goods}) is not declared
  walk(slots?.goods ?? slots);
  return out;
}

/** Lowercase, without accents (for reading c.heard). */
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "Unas manzanas", "dos plátanos", "uvas": the learner named more than one, so "eso se queda aquí", not "esa manzana". */
function pluralSaid(c: Ctx, id: string): boolean {
  const e = goodById(id);
  if (!e) return false;
  const h = plain(c.heard);
  return [e.pl, ...(e.forms || [])].filter((f): f is string => !!f).map((f) => plain(f.replace(/ \| /g, " ")))
    .filter((f) => /s$/.test(f)).some((f) => new RegExp(`\\b${f}\\b`).test(h));
}

/** What Medina says about one thing the traveler may not bring in (`found`: the one she found herself). */
function sayNotAllowed(c: Ctx, id: string, found = false) {
  const bad = goodById(id)?.attrs?.bad;
  c.say(bad === "fruit" ? "not_allowed_fruit" : bad === "sandwich" ? "not_allowed_sandwich" : "not_allowed_meat");
  c.say(!found && pluralSaid(c, id) ? "stays_here_all" : "stays_here", { X: id });
}

/** A bare "está bien / vale / ok": politeness, not a yes to "¿Trae algo que declarar?". */
const politeOnly = (c: Ctx) => {
  const h = c.heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /\b(bien|vale|ok|okay|de acuerdo|perfecto|claro)\b/.test(h) && !/\bsi\b/.test(h);
};

/** "Nada que declarar" (at the declaration, the food question or after "¿Qué trae?"). */
function declareNothing(c: Ctx) {
  if (c.step === "food") c.s.foodAsked = true;
  if (c.s.declared !== "items") c.s.declared = "nothing";
  // a short "Muy bien" only before the food question (the dog's "Espere" and "Puede pasar" need none)
  if (c.s.askFood && !c.s.foodAsked && c.s.declared === "nothing") ack(c, 0.6);
}

/** Things declared: what may not come in stays here; the rest is checked ("Todo bien"); a vague "comida" gets "¿Qué es?". */
function declareGoods(c: Ctx, goods: string[]) {
  const T = turn(c);
  const before: string[] = c.s.goods ?? [];
  const all = [...new Set([...before, ...goods])];
  // the dog sat by the backpack: it smelled the snack from the plane
  const atDog = !!c.s.dogTwist && !c.s.dogDone && c.step === "dog";
  T.goods = true;
  c.s.declared = "items";
  c.s.goods = all;
  c.s.foodAsked = true;
  if (c.s.dogTwist && !c.s.dogDone) c.s.dogDone = true;
  const fresh = goods.filter((id) => !before.includes(id));
  const bad = fresh.filter((id) => goodById(id)?.attrs?.bad);
  if (bad.length) {
    // "Una manzana y un sándwich": each rule once, and everything banned stays
    const kinds = [...new Set(bad.map((id) => goodById(id)?.attrs?.bad))];
    if (!c.s.confiscated) c.s.confiscated = bad[0];
    c.s.confiscatedAll = [...new Set([...(c.s.confiscatedAll ?? []), ...bad])];
    if (bad.length === 1) { sayNotAllowed(c, bad[0]); return; }
    for (const k of kinds) c.say(k === "fruit" ? "not_allowed_fruit" : k === "sandwich" ? "not_allowed_sandwich" : "not_allowed_meat");
    c.say("stays_here_all");
    return;
  }
  // ham, salami, cheese: SENASICA's rules depend on the kind and the country, so its inspectors look (no verdict here)
  if (fresh.some((id) => goodById(id)?.attrs?.inspect) && !c.s.inspect) { c.s.inspect = true; c.say("check_senasica"); return; }
  if (fresh.length && fresh.every((id) => goodById(id)?.attrs?.generic) && !T.whatKind && !c.s.askedKind) {
    // at the dog: the answer to "¿Qué es?" is still about what the dog smelled
    if (atDog) c.s.dogDone = false;
    c.s.askedKind = true; T.whatKind = true; c.say("customs_what_kind"); c.expect(declareWhatPending()); return;
  }
  // at the dog, only things that may come in ("Sí, unos chocolates"): the dog smelled something else, so she checks the backpack
  if (atDog) { dogSearch(c); return; }
  // gifts: the value question comes next (the gift_value step)
  if (fresh.some((id) => !goodById(id)?.attrs?.gift) && !T.checked) { T.checked = true; c.say("check_ok"); }
}

/** The dog sat by the backpack and the learner says there's nothing: Medina looks, finds the snack and keeps it. */
function dogSearch(c: Ctx) {
  c.s.dogDone = true;
  c.s.searched = true;
  const snack = c.s.snack === "sandwich" ? "sandwich" : "apple";
  c.say("dog_search");
  c.say(snack === "sandwich" ? "found_sandwich" : "found_apple");
  c.s.goods = [...new Set([...(c.s.goods ?? []), snack])];
  c.s.confiscated = snack;
  sayNotAllowed(c, snack, true);
  c.say("next_time");
}

/** The gifts' value: within the 500-dollar allowance, or over it (the self-declaration lane, where duties are paid). */
function giftValue(c: Ctx, v: "under" | "over") {
  c.s.giftValue = v;
  c.say(v === "over" ? "gift_over" : "gift_ok");
}

/** "¿Le puedo ayudar en algo más?" at the baggage desk; then the learner goes on to customs. */
function byePending(): Pending {
  const done = (cc: Ctx) => { cc.s.itzelDone = true; };
  return {
    id: "itzel_bye", expects: ["one_more_q_ctx"], hints: ["g_social", "ask"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask something else", hint: "ask" }],
    on: {
      g_thanks: (cc) => { once(cc, "close", "you_welcome"); done(cc); },
      g_bye: (cc) => { once(cc, "close", "you_welcome"); done(cc); },
      one_more_q_ctx: (cc) => { cc.say("go_ahead"); cc.hold(); },
    },
    no: (cc) => { cc.say("closing"); done(cc); },
    yes: (cc) => { cc.say("go_ahead"); cc.hold(); },
    ask: (cc) => { cc.speaker("priya"); cc.say("anything_else"); },
  };
}

/** "¿Qué trae?" after a bare yes. */
function declareWhatPending(): Pending {
  return {
    id: "declare_what", expects: ["declare_items", "declare_items_ctx", "declare_none", "declare_none_ctx", "declare_cash", "declare_cash_ctx", "personal_ctx"], hints: ["declare"],
    suggest: [{ lt: "Say what you're bringing", hint: "declare", options: "good" }],
    on: {
      declare_items: (cc, sl, sg) => { baggage.handlers.declare_items(cc, sl, sg); },
      declare_items_ctx: (cc, sl, sg) => { baggage.handlers.declare_items(cc, sl, sg); },
      declare_none: (cc, sl, sg) => { baggage.handlers.declare_none(cc, sl, sg); },
      declare_none_ctx: (cc, sl, sg) => { baggage.handlers.declare_none(cc, sl, sg); },
      hand_over: (cc) => { admitSnack(cc); },
      declare_cash: (cc, sl, sg) => { baggage.handlers.declare_cash(cc, sl, sg); },
      declare_cash_ctx: (cc, sl, sg) => { baggage.handlers.declare_cash(cc, sl, sg); },
      // "Una botella de tequila" after "¿Qué trae?": personal luggage
      personal_ctx: (cc, sl, sg) => { baggage.handlers.personal_ctx(cc, sl, sg); },
    },
    no: (cc) => { if (cc.step === "dog" && !cc.s.dogDone) dogSearch(cc); else declareNothing(cc); },
    ask: (cc) => cc.say("customs_what"),
  };
}

/** "Aquí está" at the dog's question: the snack is handed over. */
function admitSnack(c: Ctx) {
  thanksTelling(c);
  declareGoods(c, [c.s.snack === "sandwich" ? "sandwich" : "apple"]);
}

/** "Gracias por decirme" once, when the learner owns up at the dog (not again after "¿Qué es?"). */
function thanksTelling(c: Ctx) {
  if (c.s.thanked) return;
  c.s.thanked = true;
  c.say("thanks_telling");
}

/** Medina's "Puede pasar": thanks or goodbye ends it; "¿Por qué?" about the fruit is answered and the closing stays. */
function closingPending(): Pending {
  return {
    id: "closing", expects: ["q_why_ctx", "sorry_ctx"], hints: ["g_social", "customs_q"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask the customs officer", hint: "customs_q" }],
    on: {
      g_thanks: (cc) => { once(cc, "close", "customs_thanks"); cc.end(); },
      g_bye: (cc) => { once(cc, "close", "customs_bye"); cc.end(); },
      q_why_ctx: (cc) => { cc.say("why_rule"); cc.expect(closingPending()); },
      sorry_ctx: (cc) => { cc.say("no_worries"); cc.expect(closingPending()); },
    },
    no: (cc) => { cc.say("customs_bye"); cc.end(); },
    yes: (cc) => { cc.say("customs_bye"); cc.end(); },
  };
}

/** Every content id in a contents answer ("ropa, chocolates y unos regalos"). */
function allContent(slots: any): string[] {
  const out: string[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const [k, x] of Object.entries(o)) { if (k === "content" && typeof x === "string") out.push(x); else if (k !== "__tags") walk(x); }
  };
  walk(slots);
  return out;
}

// The baggage desk's own topics: once the learner is at customs, Medina sends them back to the desk.
const DESK_ONLY = ["problem", "need_help", "flight", "flight_num_ctx", "city_ctx", "no_connection", "via_ctx", "dunno_ctx", "tag_lost", "tag_lost_ctx",
  "describe", "describe_ctx", "color_ctx", "type_ctx", "size_ctx", "material_ctx", "describe_fix", "marks_ctx", "marks_none", "marks_bare_ctx", "brand",
  "delivery", "pickup", "stay", "phone", "phone_ctx", "phone_none", "q_when", "q_meantime", "q_reimburse", "kit_yes_ctx", "kit_no_ctx", "q_call",
  "q_track", "q_what_if", "q_copy", "q_ref", "q_contact"];
for (const k of DESK_ONLY) {
  const h = baggage.handlers[k];
  baggage.handlers[k] = (c, sl, sg) => { if (c.s.itzelDone) { once(c, "desk", "ask_baggage_desk"); return; } return h(c, sl, sg); };
}

export default baggage;
