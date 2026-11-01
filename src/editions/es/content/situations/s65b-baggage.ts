// NEEDS: None. Vocabulary, merges, the airline-code slot and the reference-number spelling are local.
// Song 65 "Business or Pleasure?" (part 2) → Puerto Colibrí: "Mi maleta no llegó".
// Itzel at the baggage services desk of Puerto Colibrí's small airport (usted). The belt has stopped and the bag
// isn't there: she files a delayed-bag report (reporte de equipaje): the flight (a number, or letters and digits:
// "PC 482" = "pe, ce, cuatrocientos ochenta y dos"), the claim tag (comprobante / etiqueta, stuck to the boarding
// pass), a description of the bag (maleta, mochila, bolsa de viaje; color, size, rígida / de tela, "con ruedas",
// marks, brand), what's inside, delivery to the hotel (or "paso por ella"), an address in the Yucatán style
// ("calle Hidalgo 15, entre Juárez y Morelos"), a phone number (Mexicans read it in pairs), a courtesy kit, and the
// report number, which the learner can ask to spell or write down.
// Twist (visits ≥ 1): the bag is found in the system: it stayed in Cancún (or the connecting city) and comes tomorrow
// on the first flight.
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
const col = (id: string, es: string, en: string, forms: string[] = []) =>
  ent(id, es, en, "f", { chip: es, forms: [...(es.endsWith("a") && !["rosa", "naranja"].includes(es) ? [es.slice(0, -1) + "o"] : []), ...forms] });
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
  col("brown", "café", "brown", ["marron", "cafe oscuro", "cafe claro", "cafecita"]),
  col("beige", "beige", "beige", ["beis", "crema", "color arena", "camel"]),
];

const SIZES: EntityDef[] = [
  ent("small", "chica", "small", "f", { chip: "chica", forms: ["chico", "pequena", "pequeno", "chiquita", "chiquito", "de mano", "de cabina", "chiquitita"] }),
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
};

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
  goal: "Report that your bag didn't arrive, describe it, and arrange for it to be delivered to where you're staying.",
  intro: "The baggage claim hall at Puerto Colibrí's little airport. The belt has stopped, everyone has left, and your suitcase isn't there. You go to the baggage services desk, where Itzel can help. (Your bag: a large blue suitcase with a red stripe on the side.)",
  entities: { bagtype: BAG_TYPES, color: COLORS, size: SIZES, material: MATERIALS, city: CITIES },

  grammar: {
    macros: {
      bag: "(maleta | maletas | equipaje | mochila | mochilas | valija | petaca | bolsa | bolsas | maleta de viaje | bolsa de viaje | maletin)",
      my_bag: "(mi | mis | nuestra | nuestras | nuestro | la | el | las | una de mis | mi otra) @bag",
      // "…no llegó", "…nunca salió", "…se perdió" (after @my_bag)
      not_came: "(no llego | no llegaron | no ha llegado | no han llegado | no salio | no salieron | no ha salido | no vino | no vinieron | no aparece | no aparecio | no ha aparecido | no esta | no estaba | no sale | no viene | no llega | nunca llego | nunca salio | nunca aparecio | se perdio | se perdieron | esta perdida | esta perdido | se extravio | se extraviaron | no la veo | no lo veo | no la encuentro | no lo encuentro)",
      came_verb: "(llego | ha llegado | salio | ha salido | vino | aparece | aparecio | sale | viene | esta | estaba)",
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
    },
    slots: {
      bignum: { fn: bigNumber },
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
    },
  },

  intents: {
    problem: { patterns: [
      "@my_bag [todavia | aun | otra vez] @not_came [@belt_tail] [pero (mi | la | el) @bag si [llego]] #h:pr_didnt",
      "no (llego | ha llegado | salio | ha salido | vino | aparece | aparecio | esta | sale | llegaron | salieron) (mi | mis | una de mis | nuestra | nuestras) @bag [@belt_tail]",
      "no (encuentro | puedo encontrar | veo | hallo) (mi | mis | nuestra | nuestras | una de mis) @bag [por ningun lado | en la banda] #h:pr_cant_find",
      "creo que @my_bag (se perdio | esta perdida | esta perdido | se extravio | se quedo) #h:pr_lost",
      "@my_bag (se perdio | esta perdida | esta perdido | se extravio | esta extraviada) [@belt_tail]",
      "[creo que] (perdieron | extraviaron | ustedes perdieron | la aerolinea perdio | se perdio | se extravio) (mi | mis | nuestra) @bag",
      "(quiero | quisiera | necesito | me gustaria | vengo a) (reportar | hacer un reporte de | levantar un reporte de | reclamar) (una | mi | un) @bag (perdida | perdido | extraviada | extraviado | que no llego | demorada | retrasada) #h:pr_report",
      "(quiero | quisiera | necesito | vengo a) (reportar | hacer un reporte | levantar un reporte) (de | por) (equipaje perdido | una maleta perdida | mi maleta)",
      "[yo] (perdi | se me perdio) (mi | mis) @bag",
      "donde (esta | estan) (mi | mis) @bag",
      "no (recibi | tengo | vi | recogi) (mi | mis | una de mis) @bag",
      "(me falta | falta | me faltan | faltan) (una | mi | una de mis | dos | un) @bag",
      "(estoy | estaba | estuve) esperando (mi | mis) @bag [y | pero] [no (llega | llego | sale | salio)]",
      "@waited [y | pero] @my_bag [todavia | aun] @not_came",
      "(todos | todo el mundo | los demas) (recogieron | sacaron | tienen | agarraron) (sus maletas | su equipaje) (menos yo | pero yo no | y yo no)",
      "donde (reporto | puedo reportar | se reporta) (una | mi | un) @bag (perdida | perdido | extraviada | que no llego)",
      "(tengo | hay) (una maleta | un equipaje | equipaje | una mochila) (perdida | perdido | extraviada | demorado | demorada | retrasada | retrasado)",
      "busco (mi | mis) @bag [y no (la | lo | las | los) encuentro]",
      "@my_bag no (salio | llego) (en | con) mi vuelo",
    ] },
    need_help: { patterns: [
      "(me puede | me podria | puede | podria | me puedes #tip:tu_staff) ayudar", "(puede | podria) ayudarme", "ayudeme", "(necesito | ocupo) ayuda",
      "tengo un problema", "tengo una pregunta", "(tengo | hay) un problema con (mi | mis) @bag",
    ] },
    flight: { patterns: [
      "(era | fue | vine en | llegue en | vengo en | vole en | tome) [el] vuelo {fnum} [(de | desde) {city}] [con escala en {via:city}] #h:f_num",
      "[el] vuelo {fnum} [(de | desde) {city}] [con escala en {via:city}] #h:f_short",
      "[el] vuelo {code} {fnum} #h:f_code", "{code} {fnum} [(de | desde) {city}]",
      "[el] numero [de vuelo] (es | era) {fnum}", "mi numero de vuelo (es | era) {fnum}", "es el vuelo {fnum} [(de | desde) {city}]",
      "(era | fue) el vuelo (de | desde) {city} #h:f_from_short",
      "(vengo | vine | llegue | vole | volamos | venimos | llegamos | viajo | viaje) (de | desde) {city} [@country] [(con escala en | via | por) {via:city}] #h:f_from",
      "(de | desde) {city} [@country] [(con escala en | via) {via:city}] #h:f_from_city",
      "(hice | tuve | hicimos) (escala | una escala | conexion | una conexion) en {via:city} #h:f_conn",
      "(con escala en | via) {via:city}",
      "[era] el vuelo de {city} [de {time}]", "mi vuelo (era | fue | venia | vino | salio) (de | desde) {city} [con escala en {via:city}]",
      "(vine | llegue) en el vuelo (de la manana | de la tarde | de la noche) [(de | desde) {city}]",
      "(vine | vole | llegue) (con | por) {airline} [(de | desde) {city}] [con escala en {via:city}]",
    ] },
    via_ctx: { patterns: [
      "[si] en {via:city} #h:cn_in", "[si] (hice | hicimos | tuve) (escala | una escala | conexion | una conexion | transbordo) en {via:city}", "[si] {via:city}",
      "[si] (una | solo una) (escala | conexion) en {via:city}", "[si] la (escala | conexion) (fue | era) en {via:city}",
      "[si] (cambie | cambiamos) de avion en {via:city}", "[si] (dos escalas | dos conexiones) en {via:city} y {via2:city}", "[si] en {via:city} [en] @country",
    ] },
    flight_num_ctx: { patterns: ["{fnum}", "[el] numero es {fnum}", "es el {fnum}", "el {fnum}"] },
    city_ctx: { patterns: ["{city}", "creo que (de | desde) {city}", "{city} [en] @country", "creo que {city}"] },
    no_connection: { patterns: [
      "[no] (fue | era) (un vuelo directo | directo | sin escalas) #h:cn_direct", "[no] (directo | vuelo directo | sin escalas | sin escala | ninguna escala | ninguna conexion)",
      "no (hice | tuve | hicimos) (escala | escalas | conexion | ninguna escala | ninguna conexion) [en {city}]", "[no] (vole | vine | volamos) directo [desde {city}]",
      "[no] (solo | nada mas) un vuelo", "no cambie de avion", "[no] (ninguna | ninguna escala | ninguna conexion | ni una)",
    ] },
    dunno_ctx: { patterns: [
      "no (me acuerdo | recuerdo) [del | de la | el | la] [numero de vuelo | numero | nombre | marca | numero del vuelo] #h:f_dunno", "no estoy (seguro | segura) #h:b_dunno",
      "no (lo | la) (recuerdo | se)", "no se [el numero | la marca]", "ni idea", "no tengo idea", "se me olvido [el numero | la marca]", "olvide el numero",
      "tampoco (me acuerdo | lo se | se)",
      // no brand at all: "No tiene marca, es una maleta barata"
      "(no tiene | sin) marca [es una (maleta | mochila | bolsa) (barata | sencilla | generica | normal | cualquiera)]",
      "(es | es una) (maleta | mochila | bolsa) (barata | sencilla | generica | cualquiera) [sin marca | no tiene marca]",
      "no creo que tenga marca", "no me acuerdo de la marca",
    ] },
    hand_over: { patterns: [
      "aqui (esta | tiene | lo tiene | la tiene) #h:t_here", "tenga", "tome", "aqui", "[si] aqui (lo | la) tengo", "[si] (lo | la) tengo [aqui]",
      "aqui (esta | tiene) (mi | el) (talon | comprobante | pase de abordar | tarjeta de embarque | boleto | etiqueta | ticket) #h:t_heres",
      "(esta | el talon esta | la etiqueta esta | el comprobante esta | viene) (pegado | pegada) [en] (mi | el) (pase de abordar | tarjeta de embarque | boleto | pasaporte)",
      "(esta | viene) en (mi | el) (pase de abordar | tarjeta de embarque | boleto | pasaporte) #h:t_on_bp",
      "[si] tengo (el talon | la etiqueta | el comprobante | mi pase de abordar | mi tarjeta de embarque) [aqui]",
    ] },
    tag_lost: { patterns: [
      "[no] creo que (perdi | se me perdio) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante)", "no (tengo | traigo | encuentro) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante | ningun talon)",
      "(perdi | tire | deje en el avion) (el talon | la etiqueta | el comprobante | mi talon | mi comprobante)",
      "no me (dieron | dio) (ningun | el | un | una | ninguna) (talon | comprobante | etiqueta)", "nunca me dieron (talon | etiqueta | comprobante)",
    ] },
    // "Creo que lo perdí", "No lo encuentro": "lo" is the claim tag only at the tag question
    tag_lost_ctx: { patterns: [
      "[no] creo que (lo | la) perdi #h:t_lost", "[no] (lo | la) perdi", "[no] no (lo | la) encuentro", "no se donde (esta | lo deje | la deje | quedo)",
      "(lo | la) (tire | deje en el avion)", "[no] ya no (lo | la) tengo", "[no] no (lo | la) tengo",
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
      "no (muy | tan) (grande | chica) [es] {size}", "[es] [como | mas o menos | aproximadamente | unos] [de] {cm:number} (centimetros | cm)",
      "[es] [como | mas o menos] de {inch:number} pulgadas"] },
    material_ctx: { patterns: ["{material} #h:mt_short", "(una | uno) {material}", "{material} @with_feats", "es (una | uno) {material}", "[es] {material} [y] no {wrong:material}", "[no] no es {wrong:material} [(es | sino)] {material}", "(esta hecha | hecha) {material}"] },
    // a bare "Nada." / "Ninguna." means "no marks" only at the marks question
    marks_bare_ctx: { patterns: ["[no] (nada | ninguna | ninguno | nada de eso)"] },
    // the answer to "¿Tiene algo que la distinga?" without a verb: "Una franja roja", "Muchas calcomanías"
    marks_ctx: { patterns: ["[solo | nada mas] {feat_phrase} [y {feat_phrase}]"] },
    marks_none: { patterns: [
      "[no] nada especial #h:m_none", "[no] (nada en particular | nada raro)", "[no] no tiene nada [especial | en particular]",
      "[no] no tiene (listones | liston | calcomanias | etiquetas | etiqueta | marcas | ninguna etiqueta | ningun liston | ninguna marca | nada de eso | stickers)",
      "[no] no tiene [ningun | ninguna | un | una] (etiqueta | liston | calcomania | sticker | franja | candado | marca) (con mi nombre | de colores | especial | de ningun tipo)",
      "[no] es (una maleta | una mochila | una bolsa) (normal | sencilla | lisa | comun)", "(sin | ni) (listones | calcomanias | etiquetas | marcas | stickers) [ni (listones | calcomanias | etiquetas | marcas | stickers)]",
    ] },
    brand: { patterns: ["@it_is (una | un) {brand} #h:b_its", "{brand} #h:b_short", "la marca es {brand}", "creo que es [una | un] {brand}", "es [de] marca {brand}", "es [de] la marca {brand}", "marca {brand}"] },
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
      "[si] [pero] (no al hotel | al hotel no | no a mi hotel | no a el hotel) [a otra direccion | a otro lugar] #to_home",
      "[si] (llevenla | mandenla | llevenmela | me la pueden llevar | me la llevan) (a | al) {hotel}",
      "[si] (quiero | prefiero | quisiera | me gustaria) que (me la lleven | la lleven | la manden | me la manden | me la entreguen) [@to_hotel #to_hotel]",
      "[si] (que me la lleven | entrega a domicilio | que la lleven) [@to_hotel #to_hotel]",
      "[si] (me la pueden | pueden | puede | podrian) (llevar | mandar | entregar) a (la casa de (mi amiga | mi amigo | unos amigos | mi hermana | mi hermano | mi familia) | mi casa | mi departamento | mi airbnb | esta direccion) #to_home",
      "[si] (llevenla | mandenla) a (la casa de (mi amiga | mi amigo | unos amigos | mi hermana) | mi departamento | mi airbnb | esta direccion) #to_home",
    ] },
    pickup: { patterns: [
      "[yo] (paso por ella | vengo por ella | la recojo | regreso por ella | vuelvo por ella | vengo a recogerla) [aqui | manana | despues | mas tarde | yo] #h:dl_pickup",
      "(prefiero | quiero | quisiera) (recogerla | pasar por ella | venir por ella) [yo] [aqui | manana | en el aeropuerto]",
      "(puedo | podria) (recogerla | pasar por ella | venir por ella) [aqui | manana | en el aeropuerto | yo]",
      "[no] no (me la lleven | la lleven | la manden | me la manden | necesito que la lleven | quiero que la lleven | quiero que me la lleven | hace falta) [al hotel] [yo (la recojo | paso por ella | vengo por ella)]",
      "[no] mejor (la recojo | paso por ella | vengo por ella) [yo] [aqui | manana]",
      "la recojo (aqui | en el aeropuerto | en el mostrador) [manana]",
    ] },
    stay: { patterns: [
      "(en | al) [el] {hotel} [@hotel_tail] #h:h_at", "@stay_verb (en | con) [el] {hotel} [@hotel_tail] #h:h_hotel", "[el] {hotel} [@hotel_tail]",
      "[@stay_verb] (en casa de | con) (una amiga | un amigo | mi amiga | mi amigo | mi hermana | mi hermano | mi familia | unos amigos | mi hija | mi hijo) [@hotel_tail] #fam",
      "[@stay_verb] en (un airbnb | un departamento | una casa | un hostal | una posada | una cabana | un hotel) [@hotel_tail]",
      "[@stay_verb] en [la] (calle | avenida) {street} [numero] [{number}] [@between]",
      "[en] [la] (calle | avenida) {street} [numero] {number} [@between] #h:h_addr",
      "mi direccion es [la] [calle | avenida] {street} [numero] {number} [@between]",
      "[en] [la] calle {number} [numero {number2:number}] [@between]",
    ] },
    phone: { patterns: [
      "mi (numero | celular | telefono | cel | whatsapp | numero de celular | numero de telefono) es [el] [mas] {digits} #h:ph_mine",
      "es el [mas] {digits} #h:ph_its", "(puede | pueden) (llamarme | marcarme | escribirme) al [mas] {digits}",
      "(llameme | marqueme | me pueden llamar | me puede llamar | me pueden marcar | me puede marcar) al [mas] {digits}", "[el] numero es [el] [mas] {digits}",
    ] },
    phone_ctx: { patterns: ["[el] [mas] {digits}"] },
    phone_none: { patterns: [
      "no tengo (numero | celular | telefono | chip | linea) (mexicano | de aqui | local | de mexico | mexicana) [todavia | aun] #h:ph_none",
      "[no] no tengo (telefono | celular | numero) aqui", "mi (celular | telefono) no (funciona | sirve | jala) [aqui | en mexico]",
      "solo tengo (un numero | numero | celular | un celular) (extranjero | de estados unidos | de canada | americano | de fuera)",
      "[mejor] (llamen | llame | pueden llamar | puede llamar) al hotel", "no tengo (chip | sim | linea) [mexicano | mexicana | de aqui]",
    ] },
    q_when: { patterns: ["cuando (me la entregan | me la traen | me la llevan | llega | va a llegar | la tengo | la voy a tener | la recibo) #h:q_when",
      "cuanto (tarda | tardan | se tarda | va a tardar | tiempo tarda | tiempo tardan)", "en cuanto tiempo (llega | me la entregan | la tengo)", "para cuando (llega | la tienen)"] },
    q_meantime: { patterns: [
      "que hago (mientras | mientras tanto | esta noche | hoy | ahora | por mientras) [sin (mi ropa | mis cosas | mi maleta)] #h:q_meantime",
      "que (puedo | debo) hacer (mientras tanto | esta noche | hoy | por mientras)", "y (esta noche | hoy | mientras tanto) que hago", "y ahora que [hago]",
      "no tengo (nada | ropa | mi cepillo de dientes | mis cosas) [para (hoy | esta noche)]",
      "(me pueden dar | me dan | tienen | hay) (un kit | algo para la noche | un cepillo de dientes | una playera | una camiseta)",
    ] },
    q_reimburse: { patterns: [
      "(me van a | van a | me pueden) @reimb (la ropa | lo que compre | las cosas | un cepillo de dientes | lo que gaste | los gastos) [que (compre | necesite)] #h:q_reimburse",
      "(ustedes | la aerolinea) (paga | pagan | cubre | cubren | reembolsa | reembolsan) (lo que compre | la ropa | los gastos | eso)",
      "quien (paga | cubre) (la ropa | lo que compre | los gastos | eso)", "(me reembolsan | me reponen | me pagan) (lo que compre | los gastos | la ropa | eso) [hoy]",
      "puedo comprar (ropa | cosas | lo basico) y (me lo pagan | me lo reembolsan | ustedes me lo pagan)", "(hay | dan) (reembolso | compensacion)",
    ] },
    // the courtesy kit (answers to "¿Le doy un kit de cortesía?")
    kit_yes_ctx: { patterns: [
      "[si] (me sirve | me serviria) [mucho]", "[si] (lo | la) (quiero | necesito | acepto)", "[si] (un kit | el kit | un cepillo | una playera | una camiseta) (me serviria | estaria bien | seria genial)",
      "[si] necesito (un cepillo de dientes | una playera | una camiseta | algo para esta noche)",
    ] },
    kit_no_ctx: { patterns: [
      "[no] no (lo | la) necesito", "[no] no necesito (el kit | nada | un kit)", "[no] (tengo | traigo) (todo | mis cosas | mi cepillo | lo necesario) [en mi (mochila | equipaje de mano | maleta de mano | bolsa)]",
      "[no] (estoy bien | asi estoy bien)",
    ] },
    q_call: { patterns: ["(me van a | me va a | me pueden) (llamar | avisar | mandar un mensaje) #h:q_call", "como (voy a saber | me entero)", "(me avisan | me llaman | me escriben) [cuando llegue] [por (whatsapp | mensaje | telefono | correo)]"] },
    q_track: { patterns: ["(puedo | se puede) (rastrearla | rastrear | seguirla | consultarla | consultar | ver donde esta) [en linea | por internet] #h:q_track",
      "hay (una pagina | un sitio web | una pagina web)", "como (la rastreo | puedo saber donde esta | consulto)"] },
    q_free: { patterns: ["(la entrega | el envio) (es gratis | tiene costo | cuesta) #h:q_free", "(tengo que | hay que | debo) pagar [la entrega | el envio | algo]", "cuanto cuesta (la entrega | el envio)", "es gratis [la entrega]"] },
    q_what_if: { patterns: ["y si no la (encuentran | encuentra | encontramos) #h:q_what_if", "que pasa si no (la encuentran | aparece | llega)", "(se perdio | esta perdida) para siempre"] },
    q_copy: { patterns: ["(me da | me puede dar | me dan | puedo tener | me pueden dar) una copia [del reporte] #h:q_copy", "me dan copia"] },
    q_taxi: { patterns: ["donde (hay | estan | tomo | encuentro | puedo tomar) [un | los] (taxi | taxis)", "donde esta (el sitio | el sitio de taxis | la parada de taxis)"] },
    q_shop: { patterns: ["donde (puedo comprar | compro | venden) (un cepillo de dientes | ropa | cosas | una playera)", "hay (una tienda | una tiendita) [por aqui | cerca]"] },
    q_ref: { patterns: ["(me dan | hay | tiene) (un numero de reporte | un folio | numero de folio)", "cual es mi (numero de reporte | folio | numero de folio)",
      "cual (era | es) el (numero | folio) [otra vez]", "(me repite | puede repetir) el (numero | folio)"] },
    g_spell: { patterns: [...GLOBAL_INTENTS.g_spell.patterns, "me lo (deletrea | puede deletrear | podria deletrear)", "(deletreemelo | deletreelo)"] },
    g_write: { patterns: [...GLOBAL_INTENTS.g_write.patterns, "(me lo | lo) (puede | podria) (anotar | apuntar)", "me lo (anota | apunta)"] },
  },

  lines: {
    greet: [
      t("¡Buenas tardes! | ¿En | qué | le | puedo | ayudar?", "Good afternoon! | In | what | (to) you | can I | help?", "Good afternoon! How can I help you?"),
      t("¡Hola! | ¿Qué | se le ofrece?", "Hi! | What | do you need?", "Hi! What can I do for you?", { flags: { 2: "se le ofrece: the shopkeeper's polite formula, literally is offered to you." } }),
      t("¡Siguiente, | por favor! | ¿En | qué | le | ayudo?", "Next, | please! | In | what | (to) you | I-help?", "Next, please! How can I help?"),
    ],
    ask_help: [t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?")],
    problem_help: [t("¿Es | por | una | maleta | que | no llegó?", "Is it | about | a | suitcase | that | didn't arrive?", "Is it about a bag that didn't arrive?")],
    what_happened: [t("Claro. | ¿Qué | pasó?", "Sure. | What | happened?", "Of course. What happened?")],
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
      t("¿En | qué | vuelo | llegó?", "On | what | flight | did you arrive?", "What flight were you on?"),
      t("¿Me | da | su | número | de | vuelo?", "(To) me | you-give | your | number | of | flight?", "Can I have your flight number?"),
    ],
    flight_help: [t("Viene | en | su | pase de abordar.", "It comes | on | your | boarding pass.", "It's on your boarding pass.",
      { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
        neutral: t("Viene | en | su | tarjeta de embarque.", "It comes | on | your | boarding pass.", "It's on your boarding pass.") })],
    ask_from: [t("Está bien. | ¿De | qué | ciudad | venía?", "That's fine. | From | what | city | were you coming?", "That's okay. Which city did you fly in from?")],
    ask_connection: [
      t("¿Hizo | escala?", "Did you make | a stopover?", "Did you have a connection?", { flags: { 1: "hacer escala: to stop over; Spanish needs no article here." } }),
      t("¿Tuvo | alguna | conexión?", "Did you have | any | connection?", "Did you have a connecting flight?"),
    ],
    ask_tag: [
      t("¿Tiene | el | comprobante | de | su | equipaje?", "Do you have | the | claim tag | of | your | luggage?", "Do you have your baggage claim tag?"),
      t("¿Me | permite | su | comprobante | de | equipaje? | Normalmente | viene | pegado | en | su | pase de abordar.", "(To) me | you-allow | your | claim tag | of | luggage? | Usually | it comes | stuck | on | your | boarding pass.",
        "Can I see your baggage claim tag? It's usually stuck to your boarding pass.",
        { flags: { 12: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." },
          neutral: t("¿Me | permite | su | comprobante | de | equipaje? | Normalmente | viene | pegado | en | su | tarjeta de embarque.", "(To) me | you-allow | your | claim tag | of | luggage? | Usually | it comes | stuck | on | your | boarding pass.",
            "Can I see your baggage claim tag? It's usually stuck to your boarding pass.") }),
    ],
    tag_thanks: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you.")],
    tag_none: [t("No hay problema. | Puedo | buscarla | con | su | nombre | y | su | vuelo.", "No problem. | I can | look for it | with | your | name | and | your | flight.", "No problem. I can find it with your name and flight.",
      { flags: { 2: "buscarla: la is the bag (la maleta)." } })],
    checking: [
      t("Déjeme | revisar | en | el | sistema.", "Let me | check | in | the | system.", "Let me check the system."),
      t("Un | momento, | déjeme | ver.", "One | moment, | let me | see.", "One moment, let me look."),
    ],
    not_in_system: [
      t("Mmm, | todavía | no aparece | en | el | sistema. | Vamos | a | hacer | un | reporte.", "Hmm, | still | it doesn't show up | in | the | system. | We're going | to | make | a | report.", "Hmm, it's not showing up in the system yet. Let's file a report."),
      t("Todavía | no aparece, | así que | vamos | a | hacer | un | reporte.", "Still | it doesn't show up, | so | we're going | to | make | a | report.", "It's not in the system yet, so let's file a report."),
    ],
    found_it: [
      t("¡Buenas | noticias! | Ya | la | encontramos.", "Good | news! | Already | it | we-found.", "Good news! We found it.", { flags: { 3: "la: it, the bag (la maleta)." } }),
      t("Ah, | buenas | noticias: | ya | aparece | en | el | sistema.", "Oh, | good | news: | now | it shows up | in | the | system.", "Oh, good news: I can see it in the system."),
    ],
    still_in: [t("Se quedó | en | {X}.", "It stayed | in | {X}.", "It's still in {X}.")],
    next_flight: [t("Llega | mañana | en | el | primer | vuelo.", "It arrives | tomorrow | on | the | first | flight.", "It's coming tomorrow on the first flight.")],
    // Description
    ask_describe: [
      t("¿Me | puede | describir | su | equipaje?", "(To) me | can you | describe | your | luggage?", "Can you describe your bag?"),
      t("¿Cómo | es | su | equipaje?", "How | is | your | luggage?", "What does your bag look like?"),
    ],
    ask_type: [t("¿Es | una | maleta, | una | mochila | o | una | bolsa | de | viaje?", "Is it | a | suitcase, | a | backpack | or | a | bag | for | travel?", "Is it a suitcase, a backpack, or a duffel bag?")],
    ask_color: [t("¿De | qué | color | es?", "Of | what | color | is it?", "What color is it?"), t("¿Y | de | qué | color?", "And | of | what | color?", "And what color?")],
    ask_size: [
      t("¿De | qué | tamaño | es? | ¿Chica, | mediana | o | grande?", "Of | what | size | is it? | Small, | medium | or | large?", "What size is it? Small, medium, or large?"),
      t("¿Qué tan | grande | es?", "How | big | is it?", "How big is it?"),
    ],
    ask_material: [t("¿Es | rígida | o | de | tela?", "Is it | hard-shell | or | of | fabric?", "Is it hard-shell or soft-sided?")],
    ask_marks: [
      t("¿Tiene | algo | que | la | distinga? | ¿Un | listón, | calcomanías, | una | etiqueta | con | su | nombre?",
        "Does it have | something | that | it | sets apart? | A | ribbon, | stickers, | a | tag | with | your | name?",
        "Is there anything that makes it stand out? A ribbon, stickers, a name tag?",
        { flags: { 3: "la: it, the bag (la maleta).", 6: "Mexican: listón = ribbon; elsewhere cinta." },
          neutral: t("¿Tiene | algo | que | la | distinga? | ¿Una | cinta, | calcomanías, | una | etiqueta | con | su | nombre?",
            "Does it have | something | that | it | sets apart? | A | ribbon, | stickers, | a | tag | with | your | name?",
            "Is there anything that makes it stand out? A ribbon, stickers, a name tag?", { flags: { 3: "la: it, the bag (la maleta)." } }) }),
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
    ask_contents: [t("¿Qué | lleva | adentro, | más o menos?", "What | does it carry | inside, | more or less?", "What's in it, roughly?")],
    ask_valuable: [t("¿Lleva | algo | de | valor | adentro?", "Does it carry | something | of | value | inside?", "Is there anything valuable in it?")],
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
    delivery_ok: [
      t("Perfecto. | Se la | llevamos | en | menos | de | 24 | horas.", "Perfect. | It to you | we-take | in | less | than | 24 | hours.", "Great. We'll deliver it within 24 hours.",
        { say: "Perfecto. Se la llevamos en menos de veinticuatro horas." }),
      t("Muy | bien. | Normalmente | tarda | menos | de | un | día.", "Very | good. | Usually | it takes | less | than | a | day.", "Great. It usually takes less than a day."),
    ],
    delivery_ok_found: [t("Perfecto. | Se la | llevamos | en cuanto | llegue.", "Perfect. | It to you | we-take | as soon as | it arrives.", "Great. We'll bring it to you as soon as it gets here.")],
    pickup_ok: [t("Muy | bien, | puede | recogerla | aquí, | en | este | mostrador.", "Very | good, | you can | pick it up | here, | at | this | counter.", "Okay, you can pick it up here, at this desk.")],
    ask_hotel: [
      t("¿Dónde | se está | hospedando?", "Where | are you | staying?", "Where are you staying?"),
      t("¿Y | dónde | se hospeda?", "And | where | are you staying?", "And where are you staying?"),
    ],
    ask_deliver_where: [t("¿A | qué | dirección | se la | llevamos?", "To | what | address | it to you | do we take?", "What address should we deliver it to?")],
    ask_phone: [
      t("¿Me | da | un | número | de | teléfono | para | {m:localizarlo|f:localizarla}?", "(To) me | you-give | a | number | of | telephone | to | reach you?", "What's the best phone number to reach you?",
        { flags: { 7: "localizarlo / localizarla: reach you; lo for a man, la for a woman." } }),
      t("¿Y | un | teléfono, | por favor?", "And | a | phone, | please?", "And a phone number, please?"),
    ],
    phone_ok: [t("Listo, | gracias.", "Done, | thanks.", "Got it, thank you.")],
    phone_none_ok: [t("No se preocupe. | Llamamos | al | hotel.", "Don't worry. | We'll call | the | hotel.", "That's okay. We'll call your hotel.")],
    phone_none_call_us: [t("No se preocupe. | Usted | nos | puede | llamar | con | su | número | de | reporte.", "Don't worry. | You | us | can | call | with | your | number | of | report.",
      "That's okay. You can call us with your report number.")],
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
    buy_basics: [t("Puede | comprar | lo | indispensable | para | hoy.", "You can | buy | the | essentials | for | today.", "You can buy the basics for tonight.")],
    receipts: [t("Guarde | sus | recibos | y | le | reembolsamos | lo que | gaste.", "Keep | your | receipts | and | (to) you | we-refund | what | you spend.", "Keep your receipts, and we'll pay you back for what you spend.")],
    // Report number
    ref_a: [t("Este | es | su | número | de | reporte: | PC-47219.", "This | is | your | number | of | report: | PC-47219.", "Here's your report number: PC-47219.",
      { say: "Este es su número de reporte: pe, ce, cuatro, siete, dos, uno, nueve.", write: "Reporte de equipaje: PC-47219" })],
    ref_b: [t("Este | es | su | número | de | reporte: | PC-58306.", "This | is | your | number | of | report: | PC-58306.", "Here's your report number: PC-58306.",
      { say: "Este es su número de reporte: pe, ce, cinco, ocho, tres, cero, seis.", write: "Reporte de equipaje: PC-58306" })],
    ref_track: [
      t("Con | ese | número | puede | consultar | el | estado | en línea.", "With | that | number | you can | check | the | status | online.", "You can check the status online with that number."),
      t("Viene | en | esta | copia | del | reporte.", "It comes | on | this | copy | of the | report.", "It's on this copy of the report."),
    ],
    spell_a: [t("Claro: | P-C, | 4-7-2-1-9.", "Sure: | P-C, | 4-7-2-1-9.", "Sure: P-C, 4-7-2-1-9.", { say: "Claro: pe, ce, cuatro, siete, dos, uno, nueve." })],
    spell_b: [t("Claro: | P-C, | 5-8-3-0-6.", "Sure: | P-C, | 5-8-3-0-6.", "Sure: P-C, 5-8-3-0-6.", { say: "Claro: pe, ce, cinco, ocho, tres, cero, seis." })],
    write_ref: [t("Claro, | aquí | se lo | anoto | en | esta | tarjeta.", "Sure, | here | it for you | I-write-down | on | this | card.", "Sure, I'll write it on this card for you.")],
    ref_soon: [t("En | un | momento | se lo | doy.", "In | a | moment | it to you | I-give.", "I'll give it to you in a minute.")],
    // Closing
    anything_else: [
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | else?", "Can I help you with anything else?"),
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Something | else | in | which | (to) you | I can | help?", "Is there anything else I can do for you?"),
    ],
    closing: [
      t("De nuevo, | disculpe | las | molestias.", "Again, | excuse | the | inconvenience.", "Again, I'm sorry for the trouble."),
      t("¡Que | tenga | buena | tarde!", "May | you have | good | afternoon!", "Have a good afternoon!"),
    ],
    you_welcome: [t("De nada. | ¡Que | tenga | buena | tarde!", "You're welcome. | May | you have | good | afternoon!", "You're welcome. Have a good afternoon!")],
    // Answers to the learner's questions
    ans_when: [t("Normalmente | en | menos | de | 24 | horas.", "Usually | in | less | than | 24 | hours.", "Usually within 24 hours.", { say: "Normalmente en menos de veinticuatro horas." })],
    ans_when_found: [t("Mañana, | en cuanto | llegue | el | primer | vuelo.", "Tomorrow, | as soon as | arrives | the | first | flight.", "Tomorrow, as soon as the first flight gets in.")],
    ans_call: [t("Sí, | le | llamamos | o | le | mandamos | un | mensaje | cuando | llegue.", "Yes, | (to) you | we-call | or | (to) you | we-send | a | message | when | it arrives.",
      "Yes, we'll call or text you when it arrives.")],
    ans_track: [t("Sí, | en línea, | con | su | número | de | reporte.", "Yes, | online, | with | your | number | of | report.", "Yes, online, with your report number.")],
    ans_free: [t("Sí, | la | entrega | no tiene | costo.", "Yes, | the | delivery | doesn't have | cost.", "Yes, delivery is free.")],
    ans_what_if: [t("No se preocupe. | Casi | todas | las | maletas | aparecen | en | unos | días.", "Don't worry. | Almost | all | the | bags | turn up | in | a few | days.",
      "Don't worry. Almost all bags turn up within a few days.")],
    ans_copy: [t("Claro, | le | doy | una | copia | del | reporte.", "Sure, | (to) you | I-give | a | copy | of the | report.", "Sure, I'll give you a copy of the report.")],
    ans_taxi: [t("Los | taxis | están | a | la | salida, | a la izquierda.", "The | taxis | are | at | the | exit, | on the left.", "The taxis are by the exit, on the left.")],
    ans_shop: [t("Hay | una | tiendita | junto | a | la | salida.", "There is | a | little shop | next | to | the | exit.", "There's a little shop next to the exit.")],
  },

  domains: {},

  hints: {
    problem: {
      lt: "Say your bag didn't arrive",
      items: [
        { id: "pr_didnt", s: t("Mi | maleta | no llegó.", "My | suitcase | didn't arrive.", "My bag didn't arrive.") },
        { id: "pr_didnt", s: t("Mi | maleta | no salió.", "My | suitcase | didn't come out.", "My suitcase didn't come out.") },
        { id: "pr_cant_find", s: t("No encuentro | mi | equipaje.", "I can't find | my | luggage.", "I can't find my luggage.") },
        { id: "pr_lost", s: t("Creo | que | mi | maleta | se perdió.", "I think | that | my | suitcase | got lost.", "I think my bag is lost.") },
        { id: "pr_report", s: t("Quisiera | reportar | una | maleta | perdida.", "I'd like | to report | a | suitcase | lost.", "I'd like to report a missing bag.") },
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
        { id: "f_from", s: t("Llegué | de | {X}.", "I arrived | from | {X}.", "I flew in from {X}.") },
        { id: "f_conn", s: t("Hice | escala | en | {X}.", "I made | a stopover | in | {X}.", "I had a connection in {X}.") },
      ],
    },
    // "Está bien. ¿De qué ciudad venía?"
    from: {
      lt: "Say which city you flew from", slot: "city", examples: ["houston", "toronto", "new_york", "cdmx"],
      items: [
        { id: "f_from_city", s: t("De | {X}.", "From | {X}.", "From {X}.") },
        { id: "f_from", s: t("Llegué | de | {X}.", "I arrived | from | {X}.", "I flew in from {X}.") },
      ],
    },
    // "¿Hizo escala?"
    connection: {
      lt: "Say whether you had a connection", slot: "city", examples: ["cancun", "cdmx", "houston", "monterrey"],
      items: [
        { id: "cn_in", s: t("Sí, | en | {X}.", "Yes, | in | {X}.", "Yes, in {X}.") },
        { id: "cn_direct", s: t("No, | fue | un | vuelo | directo.", "No, | it was | a | flight | direct.", "No, it was a direct flight.") },
        { id: "f_conn", s: t("Hice | escala | en | {X}.", "I made | a stopover | in | {X}.", "I had a connection in {X}.") },
      ],
    },
    tag: {
      lt: "Show your claim tag",
      items: [
        { id: "t_here", s: t("Aquí está.", "Here it is.", "Here it is.") },
        { id: "t_on_bp", s: t("Está | en | mi | pase de abordar.", "It's | on | my | boarding pass.", "It's on my boarding pass.",
          { flags: { 3: "Mexican: pase de abordar = boarding pass; elsewhere tarjeta de embarque." }, neutral: t("Está | en | mi | tarjeta de embarque.", "It's | on | my | boarding pass.", "It's on my boarding pass.") }) },
        { id: "t_heres", s: t("Aquí | tiene | mi | comprobante.", "Here | you have | my | claim tag.", "Here's my claim tag.") },
        { id: "t_lost", s: t("Creo | que | lo | perdí.", "I think | that | it | I-lost.", "I think I lost it.", { flags: { 2: "lo: it, el comprobante." } }) },
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
          { flags: { 2: "Mexican: listón = ribbon; elsewhere cinta." }, neutral: t("Lleva | una | cinta | amarilla | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.") }) },
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
          { flags: { 2: "Mexican: listón = ribbon; elsewhere cinta." }, neutral: t("Lleva | una | cinta | amarilla | en | la | manija.", "It carries | a | ribbon | yellow | on | the | handle.", "There's a yellow ribbon on the handle.") }) },
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
        { id: "c_in", s: t("Traigo | unos | regalos.", "I carry | some | gifts.", "There are some gifts in it.") },
        { id: "c_med", s: t("Mis | medicinas | están | adentro.", "My | medicines | are | inside.", "My medicine is in it.") },
        { id: "c_nothing", s: t("Nada | de | valor.", "Nothing | of | value.", "Nothing valuable.") },
      ],
    },
    delivery: {
      lt: "Accept delivery, pick it up, or ask",
      items: [
        { id: "dl_deliver", s: t("¿Me | la | pueden | llevar | a | mi | hotel?", "(To) me | it | can you | take | to | my | hotel?", "Could you deliver it to my hotel?",
          { flags: { 1: "la: it, la maleta.", 2: "pueden: you, plural (the airline)." } }) },
        { id: "dl_yes", s: t("Sí, | llévenla | al | hotel, | por favor.", "Yes, | take it | to the | hotel, | please.", "Yes, please deliver it to my hotel.") },
        { id: "dl_pickup", s: t("Paso | por | ella | aquí.", "I'll stop by | for | it | here.", "I'll pick it up here.", { flags: { 0: "pasar por: to come by and pick something up." } }) },
        { id: "q_when", s: t("¿Cuándo | me | la | entregan?", "When | (to) me | it | do you deliver?", "When will I get it?", { flags: { 2: "la: it, la maleta (an object pronoun, not an article)." } }) },
        { id: "q_free", s: t("¿La | entrega | es | gratis?", "The | delivery | is | free?", "Is delivery free?") },
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
          { say: "Mi número es el nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete." }), note: "Mexicans often read the last digits in pairs: cuarenta y cinco, sesenta y siete." },
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
        { id: "q_track", s: t("¿Puedo | rastrearla | en línea?", "Can I | track it | online?", "Can I track it online?") },
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
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With airport staff, usted is more polite: puede (puedes is for friends).", better: "¿Me puede ayudar?" },
  },

  merges: {
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → offers misreads the service formula: what can I do for you.", minimal: "Three words; qué stays separate." },
    "pase de abordar": { reason: "lexical_expression", split: "pase → pass + de → of + abordar → to board would hide the compound noun: boarding pass.", minimal: "Three words, one noun." },
    "tarjeta de embarque": { reason: "lexical_expression", split: "tarjeta → card + de → of + embarque → boarding is the compound noun boarding pass.", minimal: "Three words, one noun." },
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
    { lt: "Give your address and phone number", done: (c) => !!c.s.hotel && !!c.s.phone },
    { lt: "Get your report number", done: (c) => !!c.s.refGiven },
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
      expects: ["hand_over", "tag_lost", "tag_lost_ctx"],
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
      ask: (c) => c.say("ask_delivery"),
      expects: ["delivery", "pickup"],
      suggest: [{ lt: "Accept delivery to your hotel", hint: "g_yesno" }, { lt: "Pick it up yourself, or ask", hint: "delivery" }],
      yes: (c) => { c.s.delivery = "deliver"; c.s.dlTo = "hotel"; once(c, "dl", c.s.found ? "delivery_ok_found" : "delivery_ok"); turn(c).said_when = true; },
      no: (c) => { c.s.delivery = "pickup"; c.say("pickup_ok"); } },
    { id: "hotel", done: (c) => !!c.s.hotel,
      // Only what's missing: to the hotel → which one ("¿Dónde se está hospedando?"); to a friend's place → the address
      ask: (c) => {
        c.s.hotelQ = c.s.dlTo === "hotel" ? "ask_hotel" : c.s.dlTo === "home" ? "ask_deliver_where"
          : c.s.delivery === "deliver" && c.chance(0.5) ? "ask_deliver_where" : "ask_hotel";
        c.say(c.s.hotelQ);
      },
      expects: ["stay"],
      suggest: [{ lt: "Say where you're staying", hint: "hotel" }] },
    { id: "phone", done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"),
      expects: ["phone", "phone_ctx", "phone_none"],
      suggest: [{ lt: "Give your phone number", hint: "phone" }] },
    { id: "kit", when: (c) => c.s.offerKit && !c.s.kitDone, done: (c) => !!c.s.kitDone,
      ask: (c) => c.say("offer_kit"),
      expects: ["q_reimburse", "q_meantime", "kit_yes_ctx", "kit_no_ctx"],
      suggest: [{ lt: "Accept the kit (yes / no)", hint: "g_yesno" }, { lt: "Ask about the costs", hint: "kit" }],
      yes: (c) => { c.s.kitDone = true; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
      no: (c) => { c.s.kitDone = true; c.say("no_problem"); } },
    { id: "ref", done: (c) => !!c.s.refAck,
      ask: (c) => {
        // the number and the tracking line once; after a side question she just waits for the learner
        if (!c.s.refGiven) {
          c.s.refGiven = true; c.complete(); c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); c.event("give", { item: "baggage report", text: REFS[c.s.ref].write });
          c.say("ref_track");
        }
        c.expect(refPending());
      },
      suggest: [{ lt: "Say thank you", hint: "g_social" }, { lt: "Ask to spell it or write it down", hint: "spell_write" }] },
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
      if (c.step === "tag" || (c.s.tag === undefined && c.s.askTag)) { c.s.tag = true; once(c, "tag", "tag_thanks"); return; }
      c.say("thank_you");
    },
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
      if (turn(c).said_when) once(c, "dl", "ack"); else { once(c, "dl", c.s.found ? "delivery_ok_found" : "delivery_ok"); turn(c).said_when = true; }
    },
    pickup(c) { c.s.delivery = "pickup"; once(c, "dl", "pickup_ok"); },
    stay(c, slots, seg) { c.s.hotel = slots.hotel ?? (seg.tags.includes("fam") ? "friend" : "address"); ack(c, 0.6); },
    phone(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    phone_ctx(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    // no local number: Itzel calls the hotel, or (staying with friends, at an address) the learner calls the desk
    phone_none(c) { c.s.phone = "none"; once(c, "ph", ["mar_azul", "other_hotel"].includes(c.s.hotel) ? "phone_none_ok" : "phone_none_call_us"); },
    q_when(c) { once(c, "when", c.s.found ? "ans_when_found" : "ans_when"); },
    q_meantime(c) {
      c.s.kitDone = true;
      if (!c.s.kitGiven) { c.s.kitGiven = true; c.say("offer_kit"); c.expect(kitPending()); return; }
      c.say("buy_basics"); c.say("receipts");
    },
    q_reimburse(c) { if (c.step === "kit") c.s.kitDone = true; c.say("buy_basics"); c.say("receipts"); },
    kit_yes_ctx(c) { c.s.kitDone = true; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
    kit_no_ctx(c) { c.s.kitDone = true; c.say("no_problem"); },
    q_call(c) { c.say("ans_call"); },
    q_track(c) { c.say("ans_track"); },
    q_free(c) { c.say("ans_free"); },
    q_what_if(c) { c.say("ans_what_if"); },
    q_copy(c) { c.say("ans_copy"); },
    q_taxi(c) { c.say("ans_taxi"); },
    q_shop(c) { c.say("ans_shop"); },
    q_ref(c) { if (c.s.refGiven) c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); else c.say("ref_soon"); },
    g_spell(c) {
      if (c.s.refGiven) { c.say(c.s.ref === "a" ? "spell_a" : "spell_b"); c.hold(); return; }
      GLOBAL_HANDLERS.g_spell(c as any, {});
    },
    g_write(c) {
      if (c.s.refGiven) {
        c.say("write_ref");
        (c as any).conv?.addNote?.({ en: REFS[c.s.ref].write });
        c.hold();
        return;
      }
      GLOBAL_HANDLERS.g_write(c as any, {});
    },
  },

  finish: (c) => {
    c.complete();
    c.say("anything_else");
    c.expect({
      id: "closing", hints: ["g_social", "ask"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask something else", hint: "ask" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "you_welcome"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "you_welcome"); cc.end(); },
      },
      no: (cc) => { cc.say("closing"); cc.end(); },
      yes: (cc) => { cc.say("what_happened"); cc.hold(); },
      ask: (cc) => cc.say("anything_else"),
    });
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
    { say: "No sé el nombre del hotel", intent: "none", step: "hotel" },
    { say: "No tengo WhatsApp", intent: "none", step: "phone" },
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
      g_bye: (cc) => { cc.s.refAck = true; once(cc, "close", "you_welcome"); cc.end(); },
      g_spell: (cc) => { cc.say(cc.s.ref === "a" ? "spell_a" : "spell_b"); cc.expect(refPending()); },
      g_write: (cc) => { cc.say("write_ref"); (cc as any).conv?.addNote?.({ en: REFS[cc.s.ref].write }); cc.expect(refPending()); },
    },
    yes: ok, no: ok,
  };
}

function kitPending(): Pending {
  return {
    id: "kit", expects: ["q_reimburse", "kit_yes_ctx", "kit_no_ctx"], hints: ["g_yesno", "kit"], suggest: [{ lt: "Accept the kit (yes / no)", hint: "g_yesno" }, { lt: "Ask about the costs", hint: "kit" }],
    on: {
      q_reimburse: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("buy_basics"); cc.say("receipts"); },
      kit_yes_ctx: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
      kit_no_ctx: (cc) => { cc.say("buy_basics"); cc.say("receipts"); },
    },
    yes: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
    no: (cc) => { cc.say("buy_basics"); cc.say("receipts"); },
    ask: (cc) => cc.say("offer_kit"),
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

export default baggage;
