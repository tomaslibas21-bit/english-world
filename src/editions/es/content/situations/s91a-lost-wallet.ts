// NEEDS: g_dontknow has no "No me acuerdo" / "No recuerdo" (local intent dont_remember covers it here).
// Song 91 "Can You Help Me, Please?" (part 1) → Puerto Colibrí: "¿Me puede ayudar?"
// Saturday morning, the tianguis on the zócalo. The learner reaches for the wallet (or phone, bag, backpack) and it
// isn't there. Doña Mari at the flower stall helps (usted; she calls the learner mijo / mija): what happened,
// "¿Ya revisó bien sus bolsas?" (Mexican: bolsas = pockets), when and where they last had it, advice for the place
// (go back and ask; the colectivo drivers, who pass along the avenue; the taxi stand), what it looks like (she'll keep
// an eye out), and the Policía Municipal, "ahí, al otro lado de la plaza, junto a la iglesia" (the 3D town,
// docs/es/TOWN.md "Getting around": her stall is in the tianguis' north-west row; the police is at the square's east
// end, on the corner of Juárez and calle Itzamná, next to the church: across the square, a minute on foot, no street
// to cross). The learner may ask: is it far, how do I get there, show me on the map, should I call 911 (Mexico's
// emergency number is 911: only for emergencies), should I block my cards, what if it isn't there, where the taxi
// stand or the colectivos are, will she let them know.
// Twist (visits ≥ 1, as in the English): a boy found it by the kiosco (the bandstand): is it yours, is everything in
// it. Mrs. Lee's fountain is the kiosco here; the English's 911 and "lost and found" become 911 and the Policía
// Municipal (Mexico has no lost-and-found culture to point to; the police make a report).
// Research (2 Nov 2026), kept vague where unsure: 911 has been Mexico's national emergency number since 2017; a lost
// wallet is reported to the police (or the Ministerio Público for a formal record: s91b); "me bolsearon" (I was
// pickpocketed) is Mexican slang and is understood. No fees, report names or deadlines are taught here.
// Mexican-only words in Doña Mari's lines, each with a neutral twin: ahorita, bolsas (pockets), sitio, nomás, ándele,
// prender. The wallet is "cartera" in Mexico, but in much of South America a cartera is a handbag: the neutral noun is
// "billetera" (attrs.neutral, as s64b's twin; the hint has its twin). Colors agree with the item through the composer
// (una cartera negra, un celular negro).
//
// Commas are lost (rule 10): "No, perdí mi cartera" (the answer to "¿Está bien?") reads like "No perdí mi cartera", so a
// single "no" there gets "Perdón, ¿sí perdió su cartera?"; "En el banco no, en el café" gets "¿En el banco o en el café?".
// Added to the English intents: when_ctx (a bare time), dont_remember, describe_fix, *_ctx forms of the short answers,
// lost_really, where_found, police_open, police_english (vague answers); since the audit (5 Nov 2026) where_stand (the
// sitio, the colectivos, the church), keep_eye, leave_number, saw_someone, her_name, bought_ctx / nothing_ctx (at "¿Compró
// algo…?") and sure_ctx (at "¿Seguro?").
//
// Doña Mari "marks it on your map": c.event("mark-location", { to: "police" }) (handled by the world).

import type { Ctx, EntityDef, HintItem, Pending, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

const A_LO_MEJOR = "a lo mejor: maybe, perhaps; very common in speech. Literally “at the best”, but it doesn't mean “at best” (that's en el mejor de los casos).";

// ---------------------------------------------------------------------------
// Entities

export const ITEMS: EntityDef[] = [
  ent("wallet", "cartera", "wallet", "f", { pl: "carteras", ltPl: "wallets", chip: "cartera",
    forms: ["carteras", "billetera", "billeteras", "cartera de piel", "monedero", "tarjetero", "carterita", "billeterita"],
    attrs: { neutral: "billetera", spain: "cartera" } }),
  ent("phone", "celular", "phone", "m", { pl: "celulares", ltPl: "phones", chip: "celular",
    forms: ["cel", "celulares", "telefono", "telefono celular", "iphone", "smartphone", "telefonito", "celu", "movil", "moviles", "el movil"],
    attrs: { spain: "móvil", spainPl: "móviles" } }),
  ent("bag", "bolsa", "purse", "f", { pl: "bolsas", ltPl: "purses", chip: "bolsa",
    forms: ["bolso", "bolsos", "bolsa de mano", "bolsita", "mi bolsa de mano"], attrs: { spain: "bolso", spainPl: "bolsos", spainG: "m" } }),
  ent("backpack", "mochila", "backpack", "f", { pl: "mochilas", ltPl: "backpacks", chip: "mochila", forms: ["mochilita", "morral"] }),
];

/** Places where the learner last had it. kind: shop (someone to ask), near (a spot: look around it), area (an outdoor
 *  area), here (the tianguis itself), bus (the colectivo), taxi. */
type Kind = "shop" | "near" | "area" | "here" | "bus" | "taxi";
const P = (id: string, es: string, en: string, g: "m" | "f", kind: Kind, forms: string[] = [], extra: Record<string, unknown> = {}) =>
  ent(id, es, en, g, { forms, attrs: { kind, ...extra } });
export const PLACES: EntityDef[] = [
  P("cafe", "café", "café", "m", "shop", ["cafe la ceiba", "el cafe la ceiba", "la ceiba", "la cafeteria", "cafeteria", "el cafecito"]),
  P("bakery", "panadería", "bakery", "f", "shop", ["la panaderia", "el puesto de pan", "donde venden pan"]),
  P("fruit_stand", "puesto | de | fruta", "stall | of | fruit", "m", "shop",
    ["puesto de frutas", "el puesto de la fruta", "la fruteria", "fruteria", "el puesto de mangos", "el de la fruta", "la senora de la fruta", "el senor de la fruta"],
    { nat: "fruit stand" }),
  P("market", "tianguis", "street market", "m", "here", ["el tianguis", "los puestos", "la plaza", "el zocalo", "aqui en la plaza", "el mercadito", "aqui en el tianguis", "aqui en el zocalo"]),
  P("mercado", "mercado", "market", "m", "shop", ["el mercado", "mercado municipal", "el mercado municipal"]),
  P("bank", "banco", "bank", "m", "shop", ["el banco", "banco del puerto", "el banco del puerto"]),
  P("atm", "cajero", "ATM", "m", "near", ["cajero automatico", "el cajero automatico", "el cajero del banco"]),
  P("pharmacy", "farmacia", "pharmacy", "f", "shop", ["la farmacia", "farmacia del puerto"]),
  P("post_office", "oficina | de | correos", "office | of | mail", "f", "shop", ["correos", "el correo", "la oficina de correos"], { nat: "post office" }),
  P("supermarket", "tiendita", "corner store", "f", "shop",
    ["tienda", "la tienda", "la tienda de la esquina", "el super", "super", "el supermercado", "supermercado", "la tienda de abarrotes", "abarrotes"]),
  P("museum", "museo", "museum", "m", "shop", ["el museo", "museo de la costa maya"]),
  P("restaurant", "restaurante", "restaurant", "m", "shop",
    ["la fonda", "fonda", "la taqueria", "taqueria", "el puesto de tacos", "la cocina economica", "el muelle", "la trattoria", "la marisqueria"]),
  P("church", "iglesia", "church", "f", "shop", ["la iglesia", "misa"]),
  P("hotel", "hotel", "hotel", "m", "shop", ["el hotel", "hotel mar azul", "el mar azul", "mi cuarto", "la habitacion"]),
  P("beach", "playa", "beach", "f", "area", ["la playa"]),
  P("malecon", "malecón", "boardwalk", "m", "area", ["el malecon"]),
  P("bench", "banca", "bench", "f", "near", ["la banca", "una banca", "la banca de la plaza", "una banquita"]),
  P("kiosco", "kiosco", "bandstand", "m", "near", ["el kiosco", "quiosco"]),
  P("station", "terminal", "bus station", "f", "shop", ["la terminal", "terminal de autobuses", "la central", "la estacion de autobuses"]),
  P("bus", "colectivo", "colectivo", "m", "bus", ["la combi", "combi", "camion", "el camion", "autobus", "el autobus", "la van", "una van"]),
  P("taxi", "taxi", "taxi", "m", "taxi", ["un taxi"]),
];

/** Colors in the masculine (the composer makes them agree: una cartera negra, un celular negro); feminine forms
 *  are accepted. */
const col = (id: string, es: string, en: string, forms: string[] = []) =>
  ent(id, es, en, "m", { chip: es, forms: [...(es.endsWith("o") ? [es.slice(0, -1) + "a"] : []), ...forms] });
export const COLORS: EntityDef[] = [
  { ...col("brown", "café", "brown", ["marron", "cafe oscuro", "cafe claro", "color cafe", "cafecita", "cafecito"]), attrs: { spain: "marrón" } },
  col("black", "negro", "black", ["negrita", "negrito"]),
  col("red", "rojo", "red", ["guinda", "vino", "color vino", "tinto", "rojita"]),
  col("blue", "azul", "blue", ["azul claro", "celeste", "azulito", "azulita"]),
  col("navy", "azul marino", "navy blue", ["azul oscuro", "marino"]),
  col("green", "verde", "green", ["verde oscuro", "verde claro"]),
  col("gray", "gris", "gray", ["gris oscuro", "gris claro"]),
  col("silver", "plateado", "silver", ["plata", "color plata"]),
  col("white", "blanco", "white"),
  col("pink", "rosa", "pink", ["rosado", "rosada", "rosita", "fucsia"]),
  col("yellow", "amarillo", "yellow"),
  col("purple", "morado", "purple", ["violeta", "lila"]),
  col("beige", "beige", "beige", ["beis", "crema"]),
];
export const MATERIALS: EntityDef[] = [
  ent("leather", "de piel", "leather", "m", { chip: "de piel", forms: ["piel", "de cuero", "cuero", "de piel genuina"] }),
  ent("fabric", "de tela", "fabric", "m", { chip: "de tela", forms: ["tela", "de lona", "lona", "de nylon", "nylon"] }),
  ent("plastic", "de plástico", "plastic", "m", { chip: "de plástico", forms: ["plastico"] }),
];
export const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { chip: "chica", attrs: { spain: "pequeño" }, forms: ["chica", "chiquita", "chiquito", "pequena", "pequeno", "pequenita", "pequenito", "delgada", "delgadita", "delgado", "chiquitita"] }),
  ent("big", "grande", "big", "m", { chip: "grande", forms: ["grandota", "grandote", "muy grande", "gruesa", "grueso"] }),
];

const ALL = [...ITEMS, ...PLACES, ...COLORS, ...MATERIALS, ...SIZES];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// Helpers

const MIJA = "mijo / mija: “dear” (from mi hijo / mi hija), warm, from an older person.";
/** A bunch of flowers at the tianguis ($150). */
const FLOWERS = 15000;

const item = (c: Ctx) => (c.s.item as string) || "wallet";
/** The lost thing as a noun phrase, with the color and material the learner gave ("una cartera café de piel"). */
const itemNp = (c: Ctx) => ({ id: item(c), mods: (c.s.color || c.s.material ? [c.s.color, c.s.material] : [c.s.size]).filter(Boolean) as string[] });

/** The current learner turn (the engine builds a fresh ctx object for every input). */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
/** The wallet is back (the boy found it, or the learner found it themselves). */
const gotBack = (c: Ctx) => c.s.found === "mine" || c.s.found === "self";

const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function mark(c: Ctx) {
  return !c.s.byeSaid;
}

function describeFrom(c: Ctx, slots: any) {
  const parts = ([] as any[]).concat(slots.dp ?? []);
  // "Es rosa con funda azul": the case's color describes the phone only when no other color is given
  const caseOnly = parts.every((p) => !p?.color || (p.__tags || []).includes("case"));
  for (const p of parts) {
    if (p?.color && (caseOnly || !(p.__tags || []).includes("case"))) c.s.color = p.color;
    if (p?.material) c.s.material = p.material;
    if (p?.size) c.s.size = p.size;
  }
  if (slots.color) c.s.color = slots.color;
  if (slots.item) c.s.item = slots.item;
}

function bye(c: Ctx, thanked = false) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; c.say(thanked ? "closing_welcome" : "closing_bye"); }
  c.hold();
  c.end();
}

function lastSeenHelp(c: Ctx) {
  if (!c.s.thinkSaid) { c.s.thinkSaid = true; c.say("think_help"); return; }
  c.s.lastSeen = true; c.s.placeSkipped = true; askNext(c);
}

/** Ask the next applicable step now (after a "no sé" at a step that only informs). */
function askNext(c: Ctx) {
  for (const st of lostWallet.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

// Hint items shared by several groups (the guide shows a group's first items as model answers).
const H_HELP: HintItem = { id: "help_me", s: t("Disculpe, | ¿me | puede | ayudar?", "Excuse me, | (to) me | can you | help?", "Excuse me, can you help me?") };
const H_LOST: HintItem = { id: "lost_item", s: t("Perdí | mi | {X}.", "I lost | my | {X}.", "I lost my {X}.", { spain: t("He perdido | mi | {X}.", "I've lost | my | {X}.", "I lost my {X}.") }) };
const H_SE_ME: HintItem = { id: "lost_item", s: t("Se me perdió | {X.the}.", "I lost | {X.the}.", "I've lost my {X}.", { spain: t("Se me ha perdido | {X.the}.", "I've lost | {X.the}.", "I've lost my {X}.") }),
  note: "Se me perdió…: “it got lost on me”, the commonest way to say it in Mexico.", noteSpain: "Se me ha perdido…: “it got lost on me”, with Spain's perfect for what just happened (Mexico: se me perdió)." };
const H_CANT_FIND: HintItem = { id: "cant_find", s: t("No encuentro | mi | {X}.", "I can't find | my | {X}.", "I can't find my {X}.") };
/** "At the taxi", "I was at the colectivo": a vehicle gets "Tomé un taxi." (H_TOOK) instead. */
const notRide = (e: EntityDef) => e.attrs?.kind !== "bus" && e.attrs?.kind !== "taxi";
export const H_AT_PLACE: HintItem = { id: "ls_place", only: notRide, s: t("En | {X.the}.", "At | {X.the}.", "At {X.the}.") };
export const H_WAS_AT: HintItem = { id: "ls_place", only: notRide, s: t("Estaba | en | {X.the}.", "I was | at | {X.the}.", "I was at {X.the}.") };
export const H_NEAR: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "near",
  s: t("Junto | a | {X.the}.", "Next | to | {X.the}.", "Next to {X.the}.") };
export const H_TOOK: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "bus" || e.attrs?.kind === "taxi",
  s: t("Tomé | {X.np}.", "I took | {X.np}.", "I took {X.np}.", { spain: t("Cogí | {X.np}.", "I took | {X.np}.", "I took {X.np}.") }) };

const AUTO: Record<string, string> = {
  problem: "Perdí mi cartera.",
  what_happened: "Perdí mi cartera.",
  flowers_q: "Perdí mi cartera.",
  pockets: "Sí, ya revisé.",
  last_seen: "En el café, cuando pagué mi café.",
  where_then: "En el café.",
  describe: "Es café, de piel.",
  police: "No, ¿dónde está?",
  found: "¡Sí, es mía!",
  all_there: "Sí, está todo.",
  closing: "¡Muchas gracias! Adiós.",
};

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const lostWallet: SituationDef = {
  id: "s91a-lost-wallet",
  song: 91,
  songTitle: "Can You Help Me, Please?",
  title: { en: "¿Me puede ayudar?", lt: "Can you help me?" },
  topic: { en: "Cartera perdida", lt: "Lost wallet" },
  chapter: 7,
  order: 1,
  location: "town-square",
  npc: "mrs_lee",
  goal: "Ask for help: you've lost your wallet. Say where you last had it, describe it, and find out where the police are.",
  intro: "Saturday morning, the tianguis on the zócalo. You go to pay for some mangoes, reach into your pocket, and your wallet isn't there! Doña Mari, at the flower stall, looks kind. Ask her for help.",
  entities: { item: ITEMS, place: PLACES, color: COLORS, material: MATERIALS, size: SIZES },

  grammar: {
    macros: {
      // "cuando pagué los mangos", "cuando saqué dinero", "cuando fui a pagar los mangos" (the intro's own moment)
      when_paid: "cuando (pagué | le pagué | estaba pagando | compré | estaba comprando | fui a comprar | fui a pagar | iba a pagar | iba a comprar | quise pagar | estaba por pagar | saqué | pagaba | compraba) [algo | dinero | efectivo | un | una | unos | unas | mi | el | la | los | las] [{w:any}]",
      // what's inside: "mis tarjetas", "dos tarjetas", "unos quinientos pesos", "mi licencia de manejo"
      thing: "(mis tarjetas [de credito | de debito | del banco] | mi tarjeta [de credito | de debito | del banco] | (dos | tres | unas | algunas | varias) tarjetas [de credito | de debito] | una tarjeta [de credito | de debito] | tarjetas | mi licencia [de manejo | de conducir] | mi identificacion | mi credencial [de elector] | mis documentos | mi pasaporte | mis llaves | mi celular | dinero | efectivo | mi dinero | [como | unos | mas o menos | casi] {number} (pesos | dolares) | (unos | algunos) (pesos | dolares | billetes) | una foto [de mis hijos | de mi familia | de mi perro | de mis nietos] | fotos)",
      ago: "hace ((una | media) hora | un rato | un ratito | rato | ratito | poco | unos minutos | {number} (minutos | horas | minuto) | como (una | media) hora | como {number} minutos | un buen rato | una hora mas o menos | mas o menos una hora)",
      when_time: "(@ago | esta manana | hoy en la manana | en la manana | hoy temprano | temprano | hace rato | (a | como a | a eso de) {time} | en el desayuno | antes de (comer | desayunar) | ayer)",
      at_place: "(en | por | cerca de | cerca del | junto a | junto al | al lado de | al lado del | afuera de | afuera del | enfrente de | enfrente del | dentro de) [el | la | los | las | un | una | mi] {place}",
      in_place: "(en | a | al | a la) [el | la | un | una | mi] {place}",
      had_it: "(la | lo) (tenia | tuve | traia | usé | saqué | vi | tenia todavia | traia todavia)",
      left_it: "(la | lo) (dejé | perdi | olvidé | puse | tiré | perdí)",
      my_item: "[mi | la | el | una | un | mis] {item}",
      pockets: "(mis | las | todas mis | todas las) (bolsas | bolsillos | bolsas del pantalon)",
      // the answer to "¿Está bien?" before the problem: "No, no estoy bien. Perdí mi cartera."
      not_ok: "[no] (no estoy bien | no muy bien | no mucho | no tanto | la verdad no | mas o menos | no realmente) [la verdad] [es que]",
    },
    slots: {
      seen: { pattern: [
        "[@had_it] [en la mano | en mi bolsa | en la bolsa | en mi bolsillo | en la mesa] @at_place [@when_time] [@when_paid] #h:ls_place",
        "fue @at_place [@when_time] [@when_paid]",
        "(pagué | compré | pagaba) [algo] (con tarjeta | en efectivo | con efectivo | con la tarjeta) @at_place [@when_time]",
        "[@had_it] [como | mas o menos] @when_time [@at_place] [@when_paid] [@at_place] #h:ls_time",
        "@when_paid [@at_place] [@when_time] #h:ls_paid",
        "(creo que | a lo mejor | tal vez | quizas | seguro | seguramente) [@left_it] [aqui | por aqui | ahi] @at_place",
        "@left_it [aqui | por aqui | ahi] @at_place [@when_time]",
        "(pagué | compré) [algo | un | una | unos | unas | mi | el | la | los | las] {w:any} @at_place [@when_time]",
        "(estuve | estaba | fui | pasé) @in_place [@when_time]",
        "(saqué | retiré) (dinero | efectivo | lana | dinero en efectivo) (del | de el | en el | de | en) [la | el] {place} [@when_time]",
        "[@left_it] en (mi casa | casa | la casa) [@when_time] #home", "(creo que | a lo mejor | tal vez | quizas | seguro) @left_it en (mi casa | casa | la casa) #home", "@when_time en (mi casa | casa | la casa) #home",
        "@at_place [@when_time] (compré | pagué | estaba comprando) [algo | un | una | unos | unas] {w:any}",
        "cuando (estaba | estuve | fui) @in_place",
        "estaba (comprando [{w:any}] | comiendo | sentado | sentada | caminando | esperando | tomando un cafe | desayunando | paseando | platicando | viendo las flores) @at_place [@when_time]",
        "(me senté | estuve sentado | estuve sentada) @at_place",
        "(subí | me subí | tomé | agarré | cogí | he cogido | he tomado) [el | la | un | una] {place} [@when_time]",
        "(vengo | vine | venia) (de | del | de la) {place}",
      ] },
      dp: { pattern: [
        "[y] [es | era] [de color | color] {color} [(y | con) {color2:color}]",
        "[y] (tiene | trae | lleva | con | tenia | traia | llevaba) [adentro] @thing [[y] @thing] [[y] @thing] [adentro] #feature",
        "[y] [es] (de hombre | de mujer | de dama | de caballero) #feature",
        "[y] [es | era] [hecha | hecho] {material}",
        "[y] [es | era] [muy | bastante | medio | algo] {size}",
        "[y] (tiene | trae | con) (una foto | fotos | una foto de mis hijos | una foto de mi familia | una foto de mi perro | una foto de mis nietos) #feature",
        "[y] (tiene | trae | con) (mi nombre | un cierre | un logo | un broche | un llavero | una correa | una calcomania | calcomanias | stickers) #feature",
        "[y] (tiene | trae | con) [una | la | su] funda [de color] {color} [{material}] #case",
        "[y] (tiene | trae | con) [una | la | su] funda {material} [{color}] #case",
        "[y] [es | era] (vieja | viejo | nueva | nuevo | normal | sencilla | sencillo | barata | barato | bonita | bonito | comun | de marca | gastada | gastado) #feature",
      ] },
    },
  },

  intents: {
    help_req: { patterns: [
      "(me puede | me podria | puede | podria) ayudar #h:help_me", "(puede | podria) ayudarme", "ayudeme",
      "(me puedes | me podrias | puedes | podrias) ayudar #tip:tu_staff", "(puedes | podrias) ayudarme #tip:tu_staff", "ayudame #tip:tu_staff",
      "(necesito | ocupo) [su | tu | un poco de] ayuda", "necesito que me ayude", "(me ayuda | me ayudas)",
      "tengo un (problema | problemita) [muy grande | grande | serio]", "tengo una pregunta", "no se que hacer",
      "(le puedo | puedo) (preguntar | pedir) algo", "(puedo | podria) preguntarle algo", "(ayuda | auxilio)",
      "[no] no estoy bien [la verdad] [tengo un problema]", "[no] la verdad no [tengo un problema]",
      "[si] (estoy | estoy un poco | estoy muy) (preocupado | preocupada | nervioso | nerviosa)",
      "[si] (las flores | sus flores) (estan | son) (muy | ) (bonitas | lindas) pero tengo un (problema | problemita)",
    ] },
    lost: { patterns: [
      "[creo que] (perdi | perdí) @my_item #h:lost_item",
      "@not_ok [creo que] (perdi | se me perdio | he perdido | no encuentro) @my_item",
      "(dios mio | ay dios mio | ay dios | no puede ser | que horror | ay no) [creo que] (perdi | se me perdio | he perdido | no encuentro | me robaron) @my_item", "@not_ok [creo que] me (robaron | bolsearon) @my_item #stolen", "[creo que] he perdido @my_item", "[creo que] se me (perdio | perdió) @my_item #h:lost_item",
      "[creo que] (perdi | se me perdio) @my_item y (mis | las) llaves #keys", "[creo que] (perdi | se me perdieron) (mis | las) llaves y @my_item #keys",
      "no (encuentro | puedo encontrar | hallo) @my_item [por ningun lado | en ningun lado | en ninguna parte | por ninguna parte] #h:cant_find",
      "(mi | la) {item} (desaparecio | ya no esta | no esta | no aparece | se perdio | esta perdida | esta perdido) [por ningun lado]",
      "(mi | la) {item} no esta (en mi bolsa | en mi bolsillo | en mis bolsas | en mis bolsillos | aqui | en mi mochila | en mi pantalon | donde siempre)",
      "no se que hacer [perdi | se me perdio] [@my_item]",
      "(ya | ) no (tengo | traigo) @my_item", "me falta @my_item",
      "[creo que] me (robaron | volaron | quitaron | bolsearon) @my_item #stolen #h:stolen", "[creo que] me han (robado | quitado | birlado) @my_item #stolen",
      "[creo que] me (robaron | bolsearon | asaltaron) #stolen",
      "[creo que] alguien (se llevó | se robó | me robó | me quitó | robó | tomó) @my_item #stolen",
      "@my_item (fue robada | fue robado | me la robaron | me lo robaron) #stolen",
      "[creo que] se me cayó @my_item [en algun lado | por aqui | en algun lugar]",
      "(estoy buscando | busco | ando buscando) @my_item",
      // "¿No ha visto una cartera negra?": she answers it ("No, mijo, no he visto nada") before she helps
      "[usted] (no ha visto | ha visto | vio | no vio | no habra visto) [usted] (una | un | mi) {item} [{color}] [{material}] [por aqui] #seen",
      "no se donde (esta | quedó | dejé) @my_item", "no (encontré | he encontrado | puedo hallar) @my_item",
      "no me (robaron | la robaron | lo robaron) [nada] (la | lo) perdi", "no (la | lo) perdi me (la | lo) robaron #stolen",
      "(dejé | olvidé) @my_item en (algun lado | algun lugar | alguna parte)",
      "(perdi | se me perdio) (todo mi dinero | mi dinero | mis tarjetas | mis documentos)",
    ] },
    not_lost: { patterns: [
      // "No, perdí mi cartera" (the answer to "¿Está bien?") reads the same as "No perdí mi cartera": she asks (#amb)
      "no (perdi | he perdido) @my_item #amb", "no (perdi | he perdido) nada",
      "@my_item no (se perdio | esta perdida | esta perdido)",
      "[ah | ay | espere | ay espere | ah mire | mire] [ya] (la | lo) (encontré | he encontrado) [aqui esta] [estaba (en mi | en la) (bolsa | mochila | bolsillo | chamarra | pantalon)]", "[ya] encontré @my_item", "@my_item (ya esta aqui | esta aqui | ya aparecio | aparecio) [en mi (bolsa | mochila | bolsillo | chamarra | pantalon)]", "[ah] (ya | aqui | aca) (esta | estaba) [@my_item] (en mi bolsa | en mi mochila | en mi bolsillo | en mi chamarra | en mi pantalon)",
      "no me (robaron | quitaron) nada",
    ] },
    last_seen: { patterns: [
      "{seen}",
      "no (me acuerdo | recuerdo) [bien] [pero] [creo que | tal vez | a lo mejor | quizas] {seen}",
      "no (lo se | se bien | se exactamente) [pero] (creo que | tal vez | a lo mejor | quizas) {seen}",
      "no estoy (seguro | segura) [pero] (creo que | tal vez | a lo mejor | quizas) {seen}",
      "la ultima vez [(que la tuve | que lo tuve | que la vi | que lo vi | que la usé | que lo usé)] fue {seen}",
      "(la | lo) (tuve | vi | usé) por ultima vez {seen}",
      "todavia (la | lo) (tenia | traia) {seen}",
      // corrections: "No estaba en la playa, estaba en el café" / "En el café, no en la playa": the place said as a yes
      "no (estaba | estuve | fue | fui) (en | a | al | por) [el | la] {wrong:place} [sino] {seen}",
      "no (en | a | al | por) [el | la] {wrong:place} [sino] {seen}",
      // "En el café, no en la playa" and "En la playa no, en el café" read the same without commas: she asks which (#amb)
      "{seen} no (en | a | al) [el | la] {wrong:place} #amb",
    ] },
    // a bare time ("Hace una hora", "Esta mañana") answers "¿Cuándo fue la última vez…?" only
    when_ctx: { patterns: ["[fue] [como | mas o menos] @when_time [mas o menos]", "creo que @when_time"] },
    // "No en el banco": not there (a comma-less "No, en el banco" is unlikely after "¿Dónde…?"): "¿Entonces dónde?"
    place_not_ctx: { patterns: ["no (en | a | al | por) [el | la] {place}", "(en | a | al | por) [el | la] {place} no", "no (fue | estaba | estuve) (en | a | al | por) [el | la] {place}"] },
    place_ctx: { patterns: ["[en | el | la | por | junto a | junto al | cerca de | cerca del | al lado del] {place}", "(en | el | la) {place} creo", "creo que (en | el | la) {place}",
      // "Aquí, cuando fui a pagar los mangos": here at the tianguis (or the stall it names)
      "(aqui | aca | aqui mismo | por aqui) [@when_paid] [@when_time] #here", "(aqui | aca | aqui mismo | por aqui) @at_place [@when_paid] [@when_time]"] },
    // "Sí, compré pan" (at "¿Compró algo hoy en la mañana?"): a yes with what, not where: "¿Dónde fue eso?"
    bought_ctx: { patterns: ["[si] (compré | pagué | tomé | me tomé | desayuné | comí | he comprado | he pagado | he tomado | me he tomado | he desayunado | he comido) [algo | un | una | unos | unas | el | la | los | las | mi | mis] {w:any} [{w:any}]"] },
    // "No, nada", "No compré nada": a no
    nothing_ctx: { patterns: ["[no] (nada | no compré nada | no he comprado nada | no compré | todavia no compré nada | no compré ninguna cosa)"] },
    dont_remember: { patterns: ["no (me acuerdo | recuerdo | lo recuerdo | la recuerdo) [bien | donde | cuando | la verdad]", "ya no me acuerdo", "no tengo idea donde"] },
    describe: { patterns: [
      "(es | era) [una | un] [{item}] {dp} [[y] {dp}] [[y] {dp}] [[y] {dp}] #h:describe",
      "(mi | la | el) {item} (es | era) {dp} [[y] {dp}] [[y] {dp}]",
      "(es | era) [una | un] {item} (normal | comun | cualquiera | sencilla | sencillo) [{dp}] [{dp}]",
      "(tiene | trae | lleva) (una foto | fotos | mi nombre | un llavero | un logo) [de mis hijos | de mi familia | de mi perro | de mis nietos] [adentro]",
      "(tiene | trae) (una | la | su) funda [de color] {color} [{material}]",
      "[no] (no tiene nada (especial | en particular) | nada especial | nada en particular) #feature",
      "(tiene | trae | lleva | tenia | traia | llevaba) [adentro] @thing [[y] @thing] [[y] @thing] [adentro]",
      // "Adentro hay dos tarjetas y unos quinientos pesos", "Había mis tarjetas y mi licencia adentro"
      "(adentro | dentro) (hay | tiene | trae | lleva | habia | tenia | traia) @thing [[y] @thing] [[y] @thing]",
      "(hay | habia) @thing [[y] @thing] [[y] @thing] (adentro | dentro)",
    ] },
    // a bare noun phrase or adjective list ("Negra.", "Una cartera roja.") describes it only at the description question
    describe_ctx: { patterns: ["[una | un | mi] [{item}] {dp} [[y] {dp}] [[y] {dp}]"] },
    // "No es negra, es café": the second color is the answer
    describe_fix: { patterns: ["[no] no (es | era) {wrong:color} [es | sino | era] {color}", "no {wrong:color} [sino] {color}", "[no] {wrong:color} no [es] {color}"] },
    police_where: { patterns: [
      "donde (esta | queda | hay) la (policia | estacion de policia | comandancia | policia municipal | delegacion | comisaria) [mas cercana] #h:q_police",
      "(bueno | entonces | ok) [ahorita | ahora] (voy | voy a ir) a la policia", "[entonces] (tengo que | debo | hay que) ir a la policia",
      "(hay | sabe si hay) (una | alguna) (policia | estacion de policia | comisaria | patrulla) (por aqui | cerca | aqui cerca)",
      "como (llego | se llega) a la (policia | estacion de policia)",
      "(me puede | podria | puede | me podria) decir donde (esta | queda) la (policia | estacion de policia)",
      "[no] no (se | conozco) donde (esta | queda) la (policia | estacion de policia)", "[no] no conozco la policia",
      "donde (esta | queda | hay) (la oficina de objetos perdidos | objetos perdidos)", "hay (una oficina de objetos perdidos | objetos perdidos)",
      "(donde | a donde) (puedo | tengo que | debo) (reportarlo | reportarla | ir a reportarlo | ir a reportarla | hacer un reporte | levantar un reporte | levantar una denuncia | poner una denuncia | denunciarlo)",
    ] },
    // a bare "¿Dónde está?" / "No soy de aquí" answers "¿Sabe dónde está (la policía)?" only
    police_where_ctx: { patterns: [
      "[no] donde (esta | queda) [eso] #h:no_where", "[no] no se [donde (esta | queda)]", "[no] (no | ) (soy | somos) de aqui", "[no] (soy | estoy) (nuevo | nueva) aqui", "[no] soy turista", "mas o menos", "[no] no muy bien",
      "[no] ni idea [donde (esta | queda)]",
    ] },
    police_known: { patterns: [
      "[si] [ya] se donde (esta | queda) la (policia | estacion de policia)",
      "[si] la policia (esta | queda) (junto al | al lado del | enfrente del | cerca del | junto a la | cerca de la | al lado de la) {place} [verdad | no]",
    ] },
    // "Sí, ya sé", "Sí, está junto a la iglesia, ¿verdad?", "¿Junto al museo?" answer "¿Sabe dónde está?" only
    police_known_ctx: { patterns: [
      "[si] [ya] se (donde esta | donde queda | cual es) #h:i_know", "[si] (la | lo) conozco", "[si] ya se", "[si] si se", "[si] [ya] (la | lo) vi [cuando llegué | hace rato]",
      "[si] (esta | queda | es la que esta) (junto al | al lado del | enfrente del | cerca del | junto a la | cerca de la | al lado de la) {place} [verdad | no]",
      "(junto al | al lado del | enfrente del | cerca del | junto a la | cerca de la | al lado de la) {place} [verdad | no]",
      // a guess: "¿La iglesia?", "¿En la plaza?"
      "[en | por] (el | la) {place} [verdad | no]",
    ] },
    map: { patterns: [
      "(me (la | lo) puede | me puede | puede | podria | me podria | me (la | lo) podria) (ensenar | mostrar | marcar | senalar) [en (el | mi | su) (mapa | celular)] #h:q_map",
      "(me (la | lo) puedes | me puedes | puedes | me (la | lo) podrias | podrias) (ensenar | mostrar | marcar) [en (el | mi | tu) (mapa | celular)] #tip:tu_staff",
      "(me la | me lo) (marca | ensena | muestra) en (el | mi) mapa", "(tiene | trae) (un | su) mapa",
      "(me puede | puede) (ensenar | mostrar | decir) (el camino | donde esta | por donde es)",
      "(me puede | puede | podria | me podria) (ensenar | mostrar | marcar | senalar) (la policia | donde esta la policia | donde queda la policia) [en (el | mi | su) (mapa | celular)]",
      "(ensenemela | marquemela | ensenemelo) [en el mapa]",
    ] },
    far: { patterns: [
      "(esta | queda) (lejos | muy lejos) [de aqui] #h:q_far", "(esta | queda) (cerca | muy cerca) [de aqui]",
      "(esta | queda) a (cuanto | cuantos minutos)", "cuanto (tiempo | se hace) [caminando | a pie]", "se puede ir (caminando | a pie)",
      "(es | esta) (lejos | cerca) la policia", "(esta | queda) (retirado | muy retirado | lejitos)", "(a | como a) cuantas cuadras [esta | queda]", "cuantas cuadras [son]",
    ] },
    how_get: { patterns: [
      "como llego [alla | ahi] #h:q_get_there", "como (se llega | voy) [alla | ahi]", "por donde (es | queda | me voy)",
      "(para | hacia) donde [es | queda]", "(es | esta) por (esta | esa) calle", "(es | esta | queda) por aqui", "(a la | hacia la) (derecha | izquierda) o (a la | hacia la) (derecha | izquierda)", "que direccion [es]", "(tengo que | hay que) cruzar (la calle | la plaza | la avenida)",
    ] },
    // "¿Dónde está el sitio (de taxis)?", "¿Dónde paran los colectivos?": where she just sent the learner
    where_stand: { patterns: [
      // "¿Ve la iglesia?" → "¿Dónde está la iglesia?"
      "[no] [no la veo] donde (esta | queda) la iglesia #church", "[no] no veo la iglesia #church", "(cual | que) iglesia #church",
      "donde (esta | queda | hay) (el sitio [de taxis] | un sitio [de taxis] | el sitio de los taxis | la parada de taxis | una parada de taxis) #taxi",
      "donde (encuentro | estan | hay) (los taxis | taxis | los taxistas | a los taxistas) #taxi",
      "donde (esta | queda | hay) (la parada [de los colectivos | de colectivos | del colectivo] | una parada [de colectivos])",
      "donde (paran | pasan | se paran | se toman | tomo | agarro | encuentro | estan) (los colectivos | el colectivo | a los choferes [de los colectivos]) #bus",
    ] },
    // "Si la encuentra, ¿me avisa?", "¿Me ayuda a buscarla?": she'll keep an eye out from her stall
    keep_eye: { patterns: [
      "(si | cuando) (la | lo) (encuentra | ve | encuentran | traen) [alguien] [me (avisa | llama | habla | marca)]",
      "(si | por si) alguien (la | lo) (trae | encuentra) [me avisa]",
      "(me avisa | me puede avisar | me podria avisar | me llama | me habla) [(si | cuando) (la | lo) (encuentra | ve | encuentran | traen | trae alguien)]",
      "(puede | podria) estar pendiente", "(me ayuda | me puede ayudar | me podria ayudar) a (buscarla | buscarlo | buscar) #search",
    ] },
    // "¿Usted vio a alguien?": she saw nothing
    saw_someone: { patterns: [
      "[usted] (vio | no vio | ha visto | no ha visto) a (alguien | alguien sospechoso | una persona | un hombre | una mujer | un muchacho | un chavo) [usted] [por aqui]",
      "[usted] (vio | no vio | ha visto | no ha visto) (algo | algo raro | nada | nada raro) [usted] [por aqui]",
    ] },
    // "¿Cómo se llama usted?"
    her_name: { patterns: ["[y] (como se llama usted | usted como se llama | cual es su nombre | como se llama [senora])", "[perdon] como dijo que se llama"] },
    // "¿Le dejo mi número?": better at the police, who take it (s91b)
    leave_number: { patterns: [
      "(le dejo | le doy | le anoto | le apunto) mi (numero | telefono | numero de telefono | celular | numero de celular)",
      "(quiere | necesita) mi (numero | telefono | numero de telefono)", "como me (avisa | va a avisar | localiza)",
    ] },
    call911: { patterns: [
      "(llamo | debo llamar | tengo que llamar | hay que llamar | le llamo | marco | le marco | le hablo | hablo) al (911 | nueve once | nueve uno uno) #h:q_911",
      "(llamo | debo llamar | tengo que llamar | hay que llamar | marco) a la policia",
      "(llamo | debo llamar | tengo que llamar | marco) al (112 | 999 | uno uno dos | nueve nueve nueve) #tip:mx_911",
      "(debo | tengo que | hay que) (llamar | hablar) a (emergencias | la patrulla)",
      "(llamo | llamamos) a (emergencias | una patrulla)",
    ] },
    emergency_number: { patterns: [
      "cual es el numero de (emergencia | emergencias) [aqui | en mexico] #h:q_number",
      "(que | a que) numero (llamo | marco | hablo) [en una emergencia | si hay una emergencia]",
      "[aqui | en mexico] es el (911 | nueve once) [aqui | en mexico]",
      "[aqui | en mexico] es el (112 | 999 | uno uno dos) [aqui | en mexico] #tip:mx_911",
      "cual es el (numero | telefono) de la policia",
    ] },
    cancel_cards: { patterns: [
      "(debo | tengo que | hay que) (cancelar | bloquear | reportar | congelar) (mis | las) tarjetas #h:q_cards",
      "(cancelo | bloqueo | reporto) (mis | las) tarjetas", "(debo | tengo que) (llamar | hablarle) a mi banco", "(llamo | le hablo | le llamo) a mi banco",
      "y mis tarjetas", "que hago con (mis | las) tarjetas",
    ] },
    what_do: { patterns: [
      "que (hago | puedo hacer | debo hacer | me recomienda | me aconseja) [ahora]", "y ahora que [hago]",
      "(y si | que pasa si) no (esta | esta ahi | la encuentro | lo encuentro | aparece | la tienen | lo tienen)",
      "(y si | que pasa si) nadie (la | lo) (encontró | encuentra | tiene | entrega)",
      "que (hago | debo hacer | puedo hacer) si no (la | lo) (encuentro | encuentran | tienen)", "que (hago | debo hacer | puedo hacer) si no (aparece | esta [ahi])",
      "(y si | que pasa si | que hago si) me (la | lo) robaron #stolen",
    ] },
    will_go_back: { patterns: [
      "[si | bueno | ok] (voy a | ahorita voy a | ahora voy a) (regresar | ir | preguntar | buscar | volver) [alla | ahi | a preguntar | a buscar | (a | al | a la) {place} [a (preguntar | buscar)]] [y (pregunto | busco)]",
      "(buena | muy buena) idea", "[si] (ahorita | ya) voy", "[si] voy para (alla | ahi)", "[si | bueno] (regreso | vuelvo) [alla | ahi | a preguntar | (a | al | a la) {place} [a preguntar]]", "[si] voy a ver",
    ] },
    where_found: { patterns: ["donde (la | lo) (encontró | encontraron | halló | ha encontrado | han encontrado) [el nino]", "donde estaba (mi | la | el) {item}"] },
    police_open: { patterns: ["(esta | estara) abierta [ahorita | hoy | ahora | todo el dia | los sabados | en sabado | el sabado | hoy sabado]", "a que hora (abre | abren | cierra | cierran)", "(abren | trabajan) (hoy | los sabados | en sabado)"] },
    police_english: { patterns: ["(hablan | habla | alguien habla) ingles [en la policia | ahi | alla]", "hay alguien que hable ingles"] },
    hope_so: { patterns: ["eso espero", "ojala [que si | que (la | lo) encuentre | sea asi]", "espero que si", "dios quiera"] },
    // "Sí, estoy seguro", "Solo estoy viendo las flores": a yes to "¿Seguro? Parece que busca algo." only
    sure_ctx: { patterns: [
      "[si] [estoy] (seguro | segura | segurisimo | segurisima) [gracias]", "[si] (de verdad | en serio) [estoy bien] [gracias]", "[si] todo (bien | esta bien) [gracias]",
      "[si] (solo | nada mas | nomas) estoy (viendo | mirando) [las flores | los puestos]",
    ] },
    checked: { patterns: [
      "[si] ya (revisé | busqué | me fijé | he mirado | he revisado | he buscado | miré) [en] [@pockets] #h:checked",
      "[si] (revisé | busqué | me fijé en) @pockets", "[si] [ya] (busqué | revisé | he buscado | he mirado | miré) por (todos lados | todas partes) #h:checked2",
      "[si] (dos veces | tres veces | varias veces | mil veces)", "[si] (ya) (revisé | busqué) [y] no (esta | la encuentro | lo encuentro)",
      "[si] [ya] (busqué | revisé) en todas partes",
    ] },
    // "No, no está." / "No está en mis bolsas" answers "¿Ya revisó sus bolsas?" only
    checked_ctx: { patterns: ["[no] no esta", "[no] no esta en @pockets", "[no] no esta en (mi bolsa | mi mochila | mi chamarra | mi pantalon)",
      "[si] en todas [@pockets | partes]", "[no] (ahorita | ahora | deje | dejeme) (reviso | veo | busco | me fijo)"] },
    // "No revisé", "Todavía no busqué": a no to "¿Ya revisó bien sus bolsas?"
    not_checked_ctx: { patterns: ["[no] (no | todavia no | aun no) (revisé | he revisado | busqué | he buscado | me fijé | me he fijado | he mirado | miré) [bien] [en @pockets]"] },
    its_mine: { patterns: [
      "[si] [claro | claro que si] (es | esa es | esta es | ese es | este es) (mia | mio) #h:its_mine", "[si] es (la mia | el mio)",
    ] },
    // "Sí, esa es", "Es mi cartera", "¡Gracias a Dios!": a yes only at "¿Es suya?" (elsewhere "mi cartera…" or "¡Dios mío!" mean other things)
    its_mine_ctx: { patterns: [
      "[si] (es | esa es | esta es | ese es | este es) mi {item}", "[si] (es esa | esa es | es esta | esta es | es ese | ese es | es este | este es)",
      "(gracias a dios | dios mio | que bueno | que alegria | ay que bueno) [si] [es (mia | mio | mi {item})]", "[si] (la mia | el mio)",
    ] },
    // "No sé si es mía", "Se parece a la mía": she asks to look again
    unsure_mine_ctx: { patterns: [
      "no se si es (mia | mio | la mia | el mio | esa | esta | ese | este)", "[no] no estoy (seguro | segura) [si es (mia | mio)]", "(parece | se parece a) (la mia | el mio)",
      "es parecida [pero no se]", "es parecido [pero no se]", "(tal vez | a lo mejor | puede ser | quizas)", "[a ver] (dejeme | deje | puedo | me deja | me la deja | me lo deja) (ver | verla | verlo)",
    ] },
    // "Sí, el dinero": what is missing, only after "¿Sí le falta algo?"
    missing_what_ctx: { patterns: ["[si] [falta | me falta | faltan | me faltan] (el | mi | mis | la | las) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana)"] },
    // "No sé si falta algo": she asks to check
    unsure_all_ctx: { patterns: ["no se si falta (algo | nada)", "no se [todavia] [si] (esta todo | todo esta | falta algo)", "no se [todavia] [tengo que] (revisar | ver)", "(dejeme | deje) (revisar | ver)"] },
    not_mine: { patterns: [
      "[no] no es (mia | mio) #h:not_mine", "[no] (esa | esta) no es (mia | mio | mi {item} | la mia | el mio)", "[no] no es (esa | la mia | el mio | mi {item})",
      "[no] mi {item} es (mas chica | mas chico | mas grande | diferente | de otro color | {color} | {material})",
      "[no] (la mia | el mio) es (diferente | {color} | {material} | mas chica | mas chico | mas grande | de otro color)",
    ] },
    // "Esa no es" / "No es esa": at "¿Es suya?" only
    not_mine_ctx: { patterns: ["[no] (esa | esta | ese | este) no es", "[no] no es (esa | esta | ese | este)"] },
    all_there: { patterns: [
      "[si] (esta todo | todo esta) [aqui | completo | ahi | adentro | bien] #h:all_there",
      "[si] (todo completo | esta completa | esta completo | todo bien | esta perfecto)",
      "[si] [no] no falta nada", "[si] no me falta nada",
      "[si] (mi dinero | mis tarjetas | mi identificacion | mi licencia | mi credencial | mi pasaporte | el dinero | las tarjetas) [y (mi dinero | mis tarjetas | mi identificacion | mi licencia | mi credencial | el dinero | las tarjetas)] (esta | estan) (todavia | aqui | adentro | completo | completas | ahi)",
      "[si] (mi dinero | mis tarjetas | el dinero | las tarjetas) [y (mi dinero | mis tarjetas | el dinero | las tarjetas)] (si esta | si estan | ahi estan | ahi esta | aqui estan | aqui esta)",
      "[si] (si prende | prende | funciona | si funciona | sirve | si sirve) [bien]", "[si] no le pasó nada",
    ] },
    some_missing: { patterns: [
      "(falta | me falta | faltan | me faltan) (el | mi | mis | la | las | ) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana) #h:some_missing",
      "(falta | me falta | faltan | me faltan) (mi | el | mis | las) (pasaporte | celular | llaves | documentos | tarjetas de credito | tarjeta de credito)",
      // "Está todo menos el dinero": the exception is what's missing
      "[esta] todo (menos | excepto | salvo) (el | mi | mis | la | las) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana | pasaporte | celular | llaves | documentos)",
      // "No, falta el dinero" and "No falta el dinero" read the same without the comma: she asks (#amb)
      "no (falta | me falta | faltan | me faltan) (el | mi | mis | la | las | ) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana) #amb",
      "[no] (mis | las) tarjetas (si | si estan | estan) [pero] (el | mi) (dinero | efectivo) no", "[no] (el | mi) (dinero | efectivo) (si | si esta | esta) [pero] (mis | las) tarjetas no",
      "[no] (el | mi) (dinero | efectivo) no esta", "[no] no esta (el | mi) (dinero | efectivo)",
      "[no] (se llevaron | sacaron | me sacaron | me quitaron) (el | mi | todo el) (dinero | efectivo)",
      "(mis | las) tarjetas (estan | si estan) pero (el | mi) (dinero | efectivo) no", "[no] esta vacia",
      "[no] no (esta todo | todo esta) [completo]", "[no] (falta | me falta) algo", "[no] no (esta | estan) (el dinero | mi dinero | mis tarjetas | las tarjetas | mi identificacion | mi licencia)",
      "[no] no (prende | funciona | sirve) [#broken]", "[no] (la pantalla | el celular) esta (rota | roto) #broken",
    ] },
    thanks_kind: { patterns: [
      "(usted | ) es (muy | super | tan) (amable | linda | buena | buena gente) [usted] #h:kind", "que (linda | buena gente) [es usted]",
      "(gracias | muchas gracias) (otra vez | de nuevo)", "no se como agradecerle", "es usted un angel", "dios se lo pague",
      "(fue | ha sido) de mucha ayuda", "me (ha ayudado | ayudó) (muchisimo | un monton)",
      "[muchas | mil] gracias (nino | mijo | joven | chamaco | amiguito) #boy", "(dale | dele) las gracias al nino #boy",
    ] },
    flowers: { patterns: [
      "(me da | quiero | quisiera | me vende | me puede dar | deme | me llevo | ponme | me pone) (unas | un ramo de | una docena de | unos | un ramito de) (flores | rosas | girasoles | tulipanes | margaritas | claveles | nardos | gerberas | alcatraces) #buy",
      "(cuanto | cuantos) (cuestan | cuesta | valen | vale | es) [por] (las | los | el | la | un | una) (flores | rosas | girasoles | ramo | docena | ramito) [de (rosas | flores | girasoles)] #price",
      "a como (estan | da | son) (las | los) (rosas | flores | girasoles) #price",
      "que (flores | rosas) tan (bonitas | lindas | hermosas) #nice", "(sus | las) (flores | rosas) (estan | son) (muy | tan | bien) (bonitas | lindas | hermosas) #nice",
      "que (bonitas | lindas | hermosas) (flores | rosas) #nice", "(estan | son) (muy | bien | tan | ) (bonitas | lindas | hermosas) (sus | las | estas) (flores | rosas) #nice",
    ] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | ¿En | qué | le | ayudo?", "Good morning! | In | what | (to) you | I-help?", "Good morning! How can I help you?"),
      t("¡Buenos días! | ¡Mire | qué | rosas | tan | bonitas!", "Good morning! | Look | what | roses | so | pretty!", "Good morning! Look at these lovely roses!"),
    ],
    greet_worried: [
      t("¡Buenos días, | {m:mijo|f:mija}! | ¿Está | bien? | Se ve | {m:preocupado|f:preocupada}.", "Good morning, | dear! | Are you | okay? | You look | worried.",
        "Good morning, dear! Are you okay? You look worried.", { flags: { 1: MIJA }, spain: t("¡Buenos días, | {m:hijo|f:hija}! | ¿Está | bien? | Se le ve | {m:preocupado|f:preocupada}.", "Good morning, | dear! | Are you | okay? | You look | worried.", "Good morning, dear! Are you okay? You look worried.", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) }),
    ],
    ask_problem: [
      t("¿Qué | le | pasó, | {m:mijo|f:mija}?", "What | (to) you | happened, | dear?", "What happened, dear?", { flags: { 3: MIJA }, spain: t("¿Qué | le | ha pasado, | {m:hijo|f:hija}?", "What | (to) you | has happened, | dear?", "What happened, dear?", { flags: { 3: "hijo / hija: “dear”, warm, from an older person." } }) }),
      t("¿Qué | pasó?", "What | happened?", "What happened?", { spain: t("¿Qué | ha pasado?", "What | has happened?", "What happened?") }),
    ],
    help_ok: [
      t("Claro, | {m:mijo|f:mija}. | ¿Qué | le | pasó?", "Sure, | dear. | What | (to) you | happened?", "Of course, dear. What happened?", { flags: { 1: MIJA }, spain: t("Claro, | {m:hijo|f:hija}. | ¿Qué | le | ha pasado?", "Sure, | dear. | What | (to) you | has happened?", "Of course, dear. What happened?", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) }),
      t("¡Claro! | Dígame.", "Sure! | Tell me.", "Of course! Tell me."),
    ],
    lost_react: [
      t("¡Ay, | no! | Cálmese.", "Oh, | no! | Calm down.", "Oh no! Stay calm."),
      t("¡Ay, | Dios! | No se preocupe.", "Oh, | God! | Don't worry.", "Oh dear! Don't worry."),
      t("¡Ay, | no! | No se preocupe, | ahorita | vemos | qué | hacemos.", "Oh, | no! | Don't worry, | right now | we-see | what | we-do.", "Oh no! Don't worry, we'll figure out what to do.",
        { flags: { 3: "Mexican: ahorita = right now, in a moment." },
          neutral: t("¡Ay, | no! | No se preocupe, | ahora | vemos | qué | hacemos.", "Oh, | no! | Don't worry, | now | we-see | what | we-do.", "Oh no! Don't worry, we'll figure out what to do.") }),
    ],
    stolen_react: [
      t("¡Ay, | no! | ¿Está | {m:seguro|f:segura}? | A lo mejor | nada más | se le cayó.", "Oh, | no! | Are you | sure? | Maybe (lit. at the best) | just | you dropped it.",
        "Oh no! Are you sure? Maybe you just dropped it.", { flags: { 4: A_LO_MEJOR, 6: "se le cayó: it fell from you (se + le: to you), the usual way to say you dropped something." }, spain: t("¡Ay, | no! | ¿Está | {m:seguro|f:segura}? | A lo mejor | solo | se le ha caído.", "Oh, | no! | Are you | sure? | Maybe (lit. at the best) | just | you've dropped it.", "Oh no! Are you sure? Maybe you just dropped it.", { flags: { 4: A_LO_MEJOR, 6: "se le ha caído: it has fallen from you (se + le: to you), the usual way to say you dropped something." } }) }),
    ],
    keys_too: [t("¿Y | las | llaves | también?", "And | the | keys | too?", "Your keys too?")],
    // the answer to "¿No ha visto una cartera negra?"
    not_seen: [t("No, | {m:mijo|f:mija}, | no he visto | nada.", "No, | dear, | I haven't seen | anything.", "No, dear, I haven't seen anything.", { flags: { 1: MIJA }, spain: t("No, | {m:hijo|f:hija}, | no he visto | nada.", "No, | dear, | I haven't seen | anything.", "No, dear, I haven't seen anything.", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) })],
    ask_pockets: [
      t("¿Ya | revisó | bien | sus | bolsas?", "Already | did you check | well | your | pockets?", "Did you check your pockets properly?",
        { flags: { 4: "Mexican: bolsas = pockets (and bags); elsewhere bolsillos." },
          neutral: t("¿Ya | revisó | bien | sus | bolsillos?", "Already | did you check | well | your | pockets?", "Did you check your pockets properly?"), spain: t("¿Ha | mirado | bien | en | los | bolsillos?", "Have | you looked | carefully | in | the | pockets?", "Have you checked your pockets carefully?") }),
    ],
    checked_ok: [t("Ah, | bueno.", "Oh, | okay.", "Oh, okay."), t("Está bien.", "That's fine.", "All right.")],
    check_again: [t("Revise | otra vez, | por si acaso.", "Check | again, | just in case.", "Check again, just in case.")],
    ask_last: [
      t("¿Cuándo | fue | la | última | vez | que | {lo@X} | tuvo?", "When | was | the | last | time | that | it | you-had?", "When did you last have it?"),
      t("¿Dónde | {lo@X} | vio | por última vez?", "Where | it | did you see | for the last time?", "Where did you last see it?"),
      t("A ver, | vamos | a | pensar. | ¿Dónde | {lo@X} | tenía | por última vez?", "Let's see, | we're going | to | think. | Where | it | did you have | for the last time?",
        "Okay, let's think. Where did you last have it?"),
    ],
    where_was_that: [t("¿Ah, | sí? | ¿Dónde | fue | eso?", "Oh, | yes? | Where | was | that?", "Oh? Where was that?")],
    which_place: [t("Perdón, | ¿en | {X.the} | o | en | {Y.the}?", "Sorry, | at | {X.the} | or | at | {Y.the}?", "Sorry, at {X.the} or at {Y.the}?")],
    where_then_ask: [t("¿Entonces | dónde?", "Then | where?", "Where, then?")],
    ask_where_then: [t("¿Y | dónde | estaba | usted | en | ese | momento?", "And | where | were | you | at | that | moment?", "And where were you at the time?")],
    think_help: [
      t("Piense | un | momento. | ¿Compró | algo | hoy | en | la | mañana?", "Think | a | moment. | Did you buy | something | today | in | the | morning?",
        "Think for a moment. Did you buy anything this morning?", { spain: t("Piense | un | momento. | ¿Ha comprado | algo | esta | mañana?", "Think | a | moment. | Have you bought | something | this | morning?", "Think for a moment. Did you buy anything this morning?") }),
    ],
    go_back_shop: [t("Entonces | regrese | a | {X.the} | y | pregunte.", "Then | go back | to | {X.the} | and | ask.", "Then go back to {X.the} and ask.", { spain: t("Entonces | vuelva | a | {X.the} | y | pregunte.", "Then | go back | to | {X.the} | and | ask.", "Then go back to {X.the} and ask.") })],
    go_back_near: [t("Entonces | regrese | a | {X.the} | y | busque | bien.", "Then | go back | to | {X.the} | and | look | carefully.", "Then go back to {X.the} and take a good look.", { spain: t("Entonces | vuelva | a | {X.the} | y | busque | bien.", "Then | go back | to | {X.the} | and | look | carefully.", "Then go back to {X.the} and take a good look.") })],
    go_back_area: [t("Entonces | regrese | a | {X.the} | y | busque | por | ahí.", "Then | go back | to | {X.the} | and | look | around | there.", "Then go back to {X.the} and look around.", { spain: t("Entonces | vuelva | a | {X.the} | y | busque | por | ahí.", "Then | go back | to | {X.the} | and | look | around | there.", "Then go back to {X.the} and look around.") })],
    look_here: [t("Entonces | dé | una | vuelta | por | los | puestos | y | pregunte.", "Then | take | a | walk | around | the | stalls | and | ask.", "Then walk around the stalls and ask.")],
    retrace: [t("Bueno, | piense | por | dónde | anduvo | hoy | y | regrese | a | preguntar.", "Well, | think | through | where | you-went around | today | and | go back | to | ask.",
      "Well, think about where you've been today, and go back and ask.", { flags: { 4: "andar: to go around, to be (somewhere) for a while." }, spain: t("Bueno, | piense | por | dónde | ha estado | hoy | y | vuelva | a | preguntar.", "Well, | think | through | where | you've been | today | and | go back | to | ask.", "Well, think about where you've been today, and go back and ask.") })],
    left_home: [t("¡A lo mejor | {lo@X} | dejó | en | su | casa!", "Maybe (lit. at the best) | it | you-left | at | your | house!", "Maybe you left it at home!", { flags: { 0: A_LO_MEJOR }, spain: t("¡A lo mejor | se | {lo@X} | ha dejado | en | casa!", "Maybe (lit. at the best) | — | it | you've left | at | home!", "Maybe you left it at home!", { flags: { 0: A_LO_MEJOR, 1: "se: dejarse algo = to leave something behind (by mistake); English has no word here." } }) })],
    maybe_found: [
      t("A lo mejor | alguien | {lo@X} | encontró.", "Maybe (lit. at the best) | someone | it | found.", "Maybe someone found it.", { flags: { 0: A_LO_MEJOR }, spain: t("A lo mejor | alguien | {lo@X} | ha encontrado.", "Maybe (lit. at the best) | someone | it | has found.", "Maybe someone found it.", { flags: { 0: A_LO_MEJOR } }) }),
      t("A lo mejor | sigue | en | el | mismo | lugar.", "Maybe (lit. at the best) | it's still | in | the | same | place.", "Maybe it's still in the same place.", { flags: { 0: A_LO_MEJOR } }),
    ],
    // the colectivos have no stop in town: they pass along avenida Juárez and are waved down (s62, s69, TOWN.md)
    call_bus: [
      t("Entonces | pregúnteles | a | los | choferes | de | los | colectivos. | Pasan | por | la | avenida | cada rato.",
        "Then | ask (them) | — | the | drivers | of | the | colectivos. | They-pass | along | the | avenue | every few minutes.",
        "Then ask the colectivo drivers. They come along the main road every few minutes.",
        { flags: { 2: "a: the personal a before people; English has no word here.", 7: "colectivo: the shared van that runs along the coast." }, spain: t("Entonces | pregúnteles | a | los | conductores | de | los | colectivos. | Pasan | por | la | avenida | cada poco.", "Then | ask (them) | — | the | drivers | of | the | colectivos. | They-pass | along | the | avenue | every few minutes.", "Then ask the colectivo drivers. They come along the main road every few minutes.", { flags: { 2: "a: the personal a before people; English has no word here.", 7: "colectivo: the shared van that runs along the coast road." } }) }),
    ],
    bus_keep: [t("A veces | guardan | las | cosas | que | encuentran.", "Sometimes | they-keep | the | things | that | they-find.", "Sometimes they keep things people leave behind.")],
    call_taxi: [
      t("Entonces | vaya | al | sitio | de | taxis | y | pregunte.", "Then | go | to the | stand | of | taxis | and | ask.", "Then go to the taxi stand and ask.",
        { flags: { 3: "Mexican: sitio (de taxis) = taxi stand; elsewhere parada de taxis." },
          neutral: t("Entonces | vaya | a | la | parada | de | taxis | y | pregunte.", "Then | go | to | the | stand | of | taxis | and | ask.", "Then go to the taxi stand and ask.") }),
    ],
    taxi_know: [t("Los | choferes | se conocen | todos.", "The | drivers | know each other | all.", "The drivers all know each other.", { spain: t("Los | taxistas | se conocen | todos.", "The | taxi drivers | know each other | all.", "The drivers all know each other.") })],
    ask_describe: [
      t("¿Cómo | es? | Yo | estoy | pendiente, | por si | alguien | {lo@X} | trae.", "How | is it? | I | am | on the lookout, | in case | someone | it | brings.",
        "What does it look like? I'll keep an eye out, in case someone brings it here."),
      t("¿Y | cómo | es | su | {X}?", "And | how | is | your | {X}?", "And what does your {X} look like?"),
    ],
    describe_echo: [
      t("Muy | bien: | {X.np}. | Si | {lo@X} | veo, | le | aviso.", "Very | good: | {X.np}. | If | it | I-see, | (to) you | I-let-know.", "Okay: {X.np}. If I see it, I'll let you know."),
      t("Entonces, | {X.np}. | Aquí | estoy | pendiente.", "So, | {X.np}. | Here | I-am | on the lookout.", "So, {X.np}. I'll keep an eye out."),
    ],
    fix_echo: [t("Ah, | perdón: | {X.np}.", "Oh, | sorry: | {X.np}.", "Oh, sorry: {X.np}.")],
    describe_noted: [t("Muy | bien. | Si | {lo@X} | veo, | le | aviso.", "Very | good. | If | it | I-see, | (to) you | I-let-know.", "Okay. If I see it, I'll let you know.")],
    describe_again: [t("Y | su | {X}, | ¿cómo | es?", "And | your | {X}, | how | is it?", "And your {X}, what does it look like?")],
    // (the tianguis is on Saturdays from 7 to 2: TOWN.md, s62, s69)
    eye_yes: [t("¡Claro que sí! | Aquí | estoy | hasta | las | dos.", "Of course! | Here | I-am | until | — | two.", "Of course! I'm here until two.",
      { flags: { 4: "las (horas): Spanish puts the article before the hour; English says just two." } })],
    cant_leave: [t("Ay, | {m:mijo|f:mija}, | no puedo | dejar | el | puesto. | Pero | aquí | estoy | pendiente.", "Oh, | dear, | I can't | leave | the | stall. | But | here | I-am | on the lookout.",
      "Oh, dear, I can't leave the stall. But I'll keep an eye out here.", { flags: { 1: MIJA }, spain: t("Ay, | {m:hijo|f:hija}, | no puedo | dejar | el | puesto. | Pero | aquí | estoy | pendiente.", "Oh, | dear, | I can't | leave | the | stall. | But | here | I-am | on the lookout.", "Oh, dear, I can't leave the stall. But I'll keep an eye out here.", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) })],
    number_police: [t("Mejor | deje | su | número | en | la | policía. | Ellos | le | avisan.", "Better | leave | your | number | at | the | police. | They | (to) you | they-let-know.",
      "Better leave your number at the police station. They'll let you know.")],
    no_worry: [t("No se preocupe.", "Don't worry.", "Don't worry.")],
    found_reask: [t("Entonces, | ¿es | {suyo@X}?", "So, | is it | yours?", "So, is it yours?")],
    police_suggest: [t("Y | si | no aparece, | vaya | a | la | Policía Municipal.", "And | if | it doesn't turn up, | go | to | the | town police.", "And if it doesn't turn up, go to the town police.")],
    ask_know_police: [t("¿Sabe | dónde | está?", "Do you know | where | it is?", "Do you know where it is?")],
    police_again2: [t("¿Sabe | cómo | llegar | a | la | policía?", "Do you know | how | to get | to | the | police?", "Do you know how to get to the police station?")],
    police_again: [t("Y | la | policía, | ¿sabe | dónde | está?", "And | the | police, | do you know | where | it is?", "And the police station, do you know where it is?")],
    look_there: [t("Mire, | {m:mijo|f:mija}:", "Look, | dear:", "Look, dear:", { flags: { 1: MIJA }, spain: t("Mire, | {m:hijo|f:hija}:", "Look, | dear:", "Look, dear:", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) })],
    // the 3D town (TOWN.md): from her stall the police is across the square, at its east end, next to the church
    directions: [t("Está | ahí, | al otro lado | de | la | plaza, | junto a | la | iglesia.", "It's | there, | on the other side | of | the | square, | next to | the | church.",
      "It's right over there, across the square, next to the church.")],
    directions2: [
      t("¿Ve | la | iglesia? | La | policía | está | al lado.", "Do you see | the | church? | The | police | is | next to it.", "See the church? The police station is right next to it."),
      t("Nada más | cruce | la | plaza | y | ahí | está.", "Just | cross | the | square | and | there | it is.", "Just cross the square and it's right there.", { spain: t("Solo | tiene | que | cruzar | la | plaza | y | ahí | está.", "Just | you have | to | cross | the | square | and | there | it is.", "Just cross the square and it's right there.") }),
    ],
    where_church: [t("Al fondo | de | la | plaza, | enfrente del | kiosco. | La | policía | está | al lado.", "At the far end | of | the | square, | across from the | bandstand. | The | police | is | next to it.",
      "At the far end of the square, facing the bandstand. The police station is right next to it.")],
    where_sitio: [t("Está | al | final | de | la | avenida | Juárez, | junto al | aeropuerto.", "It's | at the | end | of | the | avenue | Juárez, | next to the | airport.",
      "It's at the end of avenida Juárez, by the airport.")],
    where_colectivos: [t("Pasan | por | la | avenida | Juárez, | al otro lado | de | la | plaza. | Nada más | levante | la | mano.",
      "They-pass | along | the | avenue | Juárez, | on the other side | of | the | square. | Just | raise | your | hand.",
      "They come along avenida Juárez, across the square. Just wave one down.", { flags: { 11: "Spanish says la mano (the hand) for a body part; English says your hand." }, spain: t("Pasan | por | la | avenida | Juárez, | al otro lado | de | la | plaza. | Solo | tiene | que | levantar | la | mano.", "They-pass | along | the | avenue | Juárez, | on the other side | of | the | square. | Just | you have | to | raise | your | hand.", "They come along avenida Juárez, across the square. Just wave one down.", { flags: { 13: "Spanish says la mano (the hand) for a body part; English says your hand." } }) })],
    map_show: [t("Claro, | mire. | Aquí está, | en | mi | celular.", "Sure, | look. | Here it is, | on | my | phone.", "Sure, look. Here it is, on my phone.", { spain: t("Claro, | mire. | Aquí está, | en | mi | móvil.", "Sure, | look. | Here it is, | on | my | phone.", "Sure, look. Here it is, on my phone.") })],
    map_mark: [t("Se la | marco | en | su | mapa.", "It for you | I-mark | on | your | map.", "I'll mark it on your map for you.", { flags: { 0: "se la: it (la policía) for you." } })],
    far: [
      t("Está | aquí | nomás, | cruzando | la | plaza. | Un | minuto | a pie.", "It's | here | just, | crossing | the | square. | One | minute | on foot.",
        "It's right here, just across the square. One minute on foot.",
        { flags: { 2: "Mexican: nomás = just; elsewhere nada más." },
          neutral: t("Está | aquí | mismo, | cruzando | la | plaza. | Un | minuto | a pie.", "It's | here | right, | crossing | the | square. | One | minute | on foot.",
            "It's right here, just across the square. One minute on foot.") }),
    ],
    police_open: [t("Siempre | hay | alguien, | {m:mijo|f:mija}.", "Always | there is | someone, | dear.", "There's always someone there, dear.", { flags: { 3: MIJA }, spain: t("Siempre | hay | alguien, | {m:hijo|f:hija}.", "Always | there is | someone, | dear.", "There's always someone there, dear.", { flags: { 3: "hijo / hija: “dear”, warm, from an older person." } }) })],
    police_english: [t("Ay, | no sé. | Pero | usted | habla | muy | bien | español.", "Oh, | I don't know. | But | you | speak | very | well | Spanish.", "Oh, I don't know. But you speak Spanish very well!")],
    police_correct: [t("No, | está | junto a | la | iglesia, | al otro lado | de | la | plaza.", "No, | it's | next to | the | church, | on the other side | of | the | square.",
      "No, it's next to the church, across the square.")],
    police_known_ok: [t("Ah, | muy | bien.", "Oh, | very | good.", "Oh, good.")],
    police_yes: [t("Sí, | ahí, | junto a | la | iglesia.", "Yes, | there, | next to | the | church.", "Yes, right there, next to the church.")],
    no911: [t("No, | el | 911 | es | solo | para | emergencias.", "No, | the | 911 | is | only | for | emergencies.", "No, 911 is only for emergencies.",
      { say: "No, el nueve once es solo para emergencias.", flags: { 1: "el (número): Spanish puts an article before the number." } })],
    no911b: [t("Un | accidente, | un | incendio... | algo | así.", "An | accident, | a | fire... | something | like that.", "An accident, a fire, something like that.")],
    no911c: [t("Por | algo | perdido, | mejor | vaya | directo | a | la | policía.", "For | something | lost, | better | go | straight | to | the | police.",
      "For something you've lost, you're better off going straight to the police.")],
    number911: [t("Es | el | 911. | Pero | nada más | para | emergencias.", "It's | the | 911. | But | only | for | emergencies.", "It's 911. But only for emergencies.",
      { say: "Es el nueve once. Pero nada más para emergencias.", flags: { 1: "el (número): Spanish puts an article before the number." }, spain: t("Es | el | 911. | Pero | solo | para | emergencias.", "It's | the | 911. | But | only | for | emergencies.", "It's 911. But only for emergencies.", { flags: { 1: "el (número): Spanish puts an article before the number." }, say: "Es el nueve once. Pero solo para emergencias." }) })],
    cards: [t("Yo | de una vez | llamaría | a | su | banco | para | bloquear | las | tarjetas.", "I | right away | would call | — | your | bank | to | block | the | cards.",
      "I'd call your bank right away and have them block your cards.", { flags: { 3: "llamar a: to call (someone or a place); the a has no English word." }, spain: t("Yo | ahora mismo | llamaría | a | su | banco | para | bloquear | las | tarjetas.", "I | right away | would call | — | your | bank | to | block | the | cards.", "I'd call your bank right away and have them block your cards.", { flags: { 3: "llamar a: to call (someone or a place); the a has no English word." } }) })],
    what_do: [t("Primero | regrese | y | pregunte. | Si | no aparece, | vaya | a | la | policía.", "First | go back | and | ask. | If | it doesn't turn up, | go | to | the | police.",
      "First go back and ask. If it doesn't turn up, go to the police.", { spain: t("Primero | vuelva | y | pregunte. | Si | no aparece, | vaya | a | la | policía.", "First | go back | and | ask. | If | it doesn't turn up, | go | to | the | police.", "First go back and ask. If it doesn't turn up, go to the police.") })],
    ok: [
      t("Ándele.", "Okay.", "Okay.", { flags: { 0: "Mexican: ándele = okay, go ahead." }, neutral: t("Muy | bien.", "Very | good.", "Okay.") }),
      t("Está bien.", "That's fine.", "All right."),
      t("Muy | bien.", "Very | good.", "Okay."),
    ],
    found: [t("¡Ay, | espérese! | Este | niño | encontró | {X.np} | junto al | kiosco.", "Oh, | wait! | This | boy | found | {X.np} | next to the | bandstand.",
      "Oh, wait! This boy found {X.np} by the bandstand.", { spain: t("¡Ay, | espere! | Este | niño | ha encontrado | {X.np} | junto al | kiosco.", "Oh, | wait! | This | boy | has found | {X.np} | next to the | bandstand.", "Oh, wait! This boy found {X.np} by the bandstand.") })],
    where_found: [t("Junto al | kiosco, | ahí | {tirado@X} | en | el | suelo.", "Next to the | bandstand, | there | lying | on | the | ground.", "By the bandstand, lying on the ground.",
      { flags: { 1: "kiosco: the bandstand in the middle of the zócalo." } })],
    look_closer: [t("Fíjese | bien. | ¿Es | {suyo@X}?", "Look | carefully. | Is it | yours?", "Take a good look. Is it yours?")],
    check_calm: [t("Revise | con | calma, | {m:mijo|f:mija}.", "Check | with | calm, | dear.", "Take your time and check, dear.", { flags: { 3: MIJA }, spain: t("Mírelo | con | calma, | {m:hijo|f:hija}.", "Check it | with | calm, | dear.", "Take your time and check, dear.", { flags: { 3: "hijo / hija: “dear”, warm, from an older person." } }) })],
    found_ask: [t("¿Es | {suyo@X}?", "Is it | yours?", "Is it yours?")],
    found_yes: [t("¡Ay, | qué bueno! | ¿Está | todo | adentro?", "Oh, | how good! | Is | everything | inside?", "Oh, wonderful! Is everything still in it?", { spain: t("¡Ay, | menos mal! | ¿Está | todo | dentro?", "Oh, | thank goodness! | Is | everything | inside?", "Oh, wonderful! Is everything still in it?") })],
    found_yes_phone: [
      t("¡Ay, | qué bueno! | ¿Y | sí | prende?", "Oh, | how good! | And | really | does it turn on?", "Oh, wonderful! Does it still turn on?",
        { flags: { 3: "sí: stressed, “does it really…”.", 4: "Mexican: prender = to turn on; elsewhere encender." },
          neutral: t("¡Ay, | qué bueno! | ¿Y | sí | enciende?", "Oh, | how good! | And | really | does it turn on?", "Oh, wonderful! Does it still turn on?", { flags: { 3: "sí: stressed, “does it really…”." } }), spain: t("¡Ay, | menos mal! | ¿Y | se | enciende?", "Oh, | thank goodness! | And | — | does it turn on?", "Oh, wonderful! Does it still turn on?", { flags: { 3: "se: encenderse = to turn on (by itself); English has no word here." } }) }),
    ],
    all_there_again: [t("Entonces, | ¿está | todo?", "So, | is | everything (there)?", "So, is everything there?")],
    glad: [t("¡Ay, | qué | gusto!", "Oh, | what | joy!", "Oh, I'm so glad!", { spain: t("¡Ay, | cuánto | me alegro!", "Oh, | how much | I'm glad!", "Oh, I'm so glad!") }), t("¡Qué | alegría!", "What | joy!", "I'm so happy for you!")],
    boy_thanks: [t("¡Agradézcale | a | él, | no | a | mí!", "Thank | — | him, | not | — | me!", "Thank him, not me!",
      { flags: { 1: "a él: the personal a; agradézcale already says “thank him”, a él stresses it.", 4: "a mí: the same personal a." } })],
    not_yours: [t("Ay, | qué | lástima.", "Oh, | what | a pity.", "Oh, too bad.")],
    missing_some: [t("Ay, | no. | Entonces | de todos modos | vaya | a | la | policía.", "Oh, | no. | Then | anyway | go | to | the | police.", "Oh no. Then you should still go to the police.")],
    phone_broken: [t("Ay, | qué | mala | suerte. | Pero | por lo menos | ya | {lo@X} | tiene.", "Oh, | what | bad | luck. | But | at least | now | it | you-have.", "Oh, what bad luck. But at least you've got it back.")],
    missing_really: [t("Perdón, | ¿sí | le | falta | algo?", "Sorry, | really | (to) you | is missing | something?", "Sorry, so is something missing?",
      { flags: { 1: "sí (stressed): “so … really?”, checking a yes." }, spain: t("Perdone, | ¿le | falta | algo?", "Sorry, | (to) you | is missing | something?", "Sorry, so is something missing?") })],
    lost_really: [t("Perdón, | ¿sí | perdió | su | {X}?", "Sorry, | really | did you lose | your | {X}?", "Sorry, so you did lose your {X}?",
      { flags: { 1: "sí (stressed): “so you did…”, checking a yes." }, spain: t("Perdone, | ¿ha perdido | su | {X}?", "Sorry, | have you lost | your | {X}?", "Sorry, so you did lose your {X}?") })],
    not_lost_resp: [t("¡Ah, | qué bueno! | Entonces, | ¿en | qué | le | ayudo?", "Oh, | how good! | Then, | in | what | (to) you | I-help?", "Oh, good! So how can I help you?", { spain: t("¡Ah, | menos mal! | Entonces, | ¿en | qué | le | ayudo?", "Oh, | thank goodness! | Then, | in | what | (to) you | I-help?", "Oh, good! So how can I help you?") })],
    flowers_sure: [t("¡Claro que sí!", "Of course!", "Of course!")],
    flowers_thanks: [t("¡Gracias! | Están | recién | cortadas.", "Thanks! | They're | freshly | cut.", "Thank you! They're freshly cut.")],
    flowers_price: [
      t("El | ramo | está | en | {$price}.", "The | bunch | is | at | {$price}.", "A bunch is {$price}.", { flags: { 3: "estar en + a price: the usual way to give a market price." }, spain: t("El | ramo | cuesta | {$price}.", "The | bunch | costs | {$price}.", "A bunch is {$price}.") }),
    ],
    but_worried: [t("Pero | se ve | {m:preocupado|f:preocupada}, | {m:mijo|f:mija}. | ¿Le | pasó | algo?", "But | you look | worried, | dear. | (To) you | happened | something?",
      "But you look worried, dear. Did something happen?", { flags: { 3: MIJA }, spain: t("Pero | se le ve | {m:preocupado|f:preocupada}, | {m:hijo|f:hija}. | ¿Le | ha pasado | algo?", "But | you look | worried, | dear. | (To) you | has happened | something?", "But you look worried, dear. Did something happen?", { flags: { 3: "hijo / hija: “dear”, warm, from an older person." } }) })],
    really_ok: [t("¿Seguro? | Parece | que | busca | algo.", "Sure? | It seems | that | you're looking for | something.", "Are you sure? It looks like you're looking for something.")],
    if_need: [t("Bueno. | Si | necesita | algo, | aquí | estoy.", "Okay. | If | you-need | something, | here | I-am.", "All right. If you need anything, I'm right here.")],
    good_luck: [
      t("¡Suerte! | Ojalá | {lo@X} | encuentre.", "Good luck! | Hopefully | it | you-find.", "Good luck! I hope you find it."),
      t("¡Mucha | suerte, | {m:mijo|f:mija}!", "Much | luck, | dear!", "Good luck, dear!", { flags: { 2: MIJA }, spain: t("¡Mucha | suerte, | {m:hijo|f:hija}!", "Much | luck, | dear!", "Good luck, dear!", { flags: { 2: "hijo / hija: “dear”, warm, from an older person." } }) }),
    ],
    // (good_luck's second variant, for the wallet that's back without its money)
    luck: [t("¡Mucha | suerte, | {m:mijo|f:mija}!", "Much | luck, | dear!", "Good luck, dear!", { flags: { 2: MIJA }, spain: t("¡Mucha | suerte, | {m:hijo|f:hija}!", "Much | luck, | dear!", "Good luck, dear!", { flags: { 2: "hijo / hija: “dear”, warm, from an older person." } }) })],
    kind_resp: [t("Ay, | no es | nada.", "Oh, | it isn't | anything.", "Oh, it's nothing."), t("Para | eso | estamos.", "For | that | we-are.", "That's what we're here for.")],
    // (only "Mari": María is s88's coworker; the cross-cutting audit's near-clash stays mild)
    her_name: [t("Mari, | {m:mijo|f:mija}, | para servirle.", "Mari, | dear, | at your service.", "Mari, dear. At your service.",
      { flags: { 1: MIJA, 2: "para servirle: “to serve you”, a warm, polite Mexican way to give your name or offer help." }, spain: t("Mari, | {m:hijo|f:hija}, | para servirle.", "Mari, | dear, | at your service.", "Mari, dear. At your service.", { flags: { 1: "hijo / hija: “dear”, warm, from an older person.", 2: "para servirle: “to serve you”, a warm, polite way to give your name or offer help." } }) })],
    closing_welcome: [t("De nada, | {m:mijo|f:mija}. | ¡Que | le | vaya | bien!", "You're welcome, | dear. | May | (to) you | it-go | well!", "You're welcome, dear. Take care!", { flags: { 1: MIJA }, spain: t("De nada, | {m:hijo|f:hija}. | ¡Que | le | vaya | bien!", "You're welcome, | dear. | May | (to) you | it-go | well!", "You're welcome, dear. Take care!", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) })],
    closing_bye: [t("¡Adiós, | {m:mijo|f:mija}! | ¡Que | le | vaya | bien!", "Bye, | dear! | May | (to) you | it-go | well!", "Bye, dear! Take care!", { flags: { 1: MIJA }, spain: t("¡Adiós, | {m:hijo|f:hija}! | ¡Que | le | vaya | bien!", "Bye, | dear! | May | (to) you | it-go | well!", "Bye, dear! Take care!", { flags: { 1: "hijo / hija: “dear”, warm, from an older person." } }) })],
    enjoy_day: [t("¡Cuídese | mucho! | Y | que | disfrute | el | resto | del | día.", "Take care | a lot! | And | may | you-enjoy | the | rest | of the | day.", "Take care! And enjoy the rest of your day.")],
  },

  hints: {
    problem: {
      lt: "Ask for help and say what happened", slot: "item", examples: ["wallet"],
      items: [H_HELP, H_LOST, H_SE_ME, H_CANT_FIND,
        { id: "stolen", s: t("Creo | que | me | robaron | {X.the}.", "I think | that | (from) me | they-stole | {X.the}.", "I think someone stole my {X}.", { spain: t("Creo | que | me | han robado | {X.the}.", "I think | that | (from) me | they've stolen | {X.the}.", "I think someone stole my {X}.") }),
          note: "Spanish uses a “they” with no subject: me robaron = someone stole (from me)." },
      ],
    },
    lost: {
      lt: "Say what you lost", slot: "item", examples: ["wallet"],
      items: [H_LOST, H_SE_ME, H_CANT_FIND],
    },
    pockets: {
      lt: "Say whether you checked your pockets",
      items: [
        { id: "checked", s: t("Sí, | ya | revisé.", "Yes, | already | I-checked.", "Yes, I checked.", { spain: t("Sí, | ya | he mirado.", "Yes, | already | I've-looked.", "Yes, I checked.") }) },
        { id: "checked2", s: t("Sí, | ya | busqué | por todos lados.", "Yes, | already | I-looked | everywhere.", "Yes, I've looked everywhere.", { spain: t("Sí, | ya | he buscado | por todas partes.", "Yes, | already | I've-looked | everywhere.", "Yes, I've looked everywhere.") }) },
      ],
    },
    last_seen: {
      lt: "Say where and when you last had it", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [
        H_AT_PLACE,
        { id: "ls_paid", s: t("Cuando | pagué | mi | café.", "When | I-paid (for) | my | coffee.", "When I paid for my coffee.") },
        { id: "ls_time", s: t("Hace | como | una | hora.", "Ago | about | an | hour.", "About an hour ago.", { flags: { 0: "hace + a time = … ago; it comes first in Spanish." }, spain: t("Hace | una | hora, | más o menos.", "Ago | an | hour, | more or less.", "About an hour ago.", { flags: { 0: "hace + a time = … ago; it comes first in Spanish." } }) }) },
        { id: "ls_time", only: notRide, s: t("Hoy | en | la | mañana, | en | {X.the}.", "Today | in | the | morning, | at | {X.the}.", "This morning, at {X.the}.", { spain: t("Esta | mañana, | en | {X.the}.", "This | morning, | at | {X.the}.", "This morning, at {X.the}.") }) },
        H_WAS_AT, H_NEAR, H_TOOK,
      ],
    },
    where_then: {
      lt: "Say where you were", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [H_AT_PLACE, H_WAS_AT, H_NEAR, H_TOOK],
    },
    describe: {
      lt: "Describe it",
      items: [
        { id: "describe", s: t("Es | una | cartera | negra | de piel.", "It's | a | wallet | black | leather.", "It's a black leather wallet.",
          { neutral: t("Es | una | billetera | negra | de piel.", "It's | a | wallet | black | leather.", "It's a black leather wallet."), spain: t("Es | una | cartera | negra | de piel.", "It's | a | wallet | black | leather.", "It's a black leather wallet.") }),
          note: "Colors agree: una mochila negra, un celular negro." },
        { id: "describe", s: t("Es | café | y | chiquita.", "It's | brown | and | small.", "It's brown and small.", { flags: { 3: "chiquita: little (chica + -ita, a friendly diminutive)." }, spain: t("Es | marrón | y | pequeñita.", "It's | brown | and | small.", "It's brown and small.", { flags: { 3: "pequeñita: little (pequeña + -ita, a friendly diminutive)." } }) }) },
        { id: "describe", s: t("Es | negra | y | tiene | una | foto | de | mis | hijos.", "It's | black | and | it-has | a | photo | of | my | children.", "It's black, and there's a photo of my kids in it.") },
        { id: "describe", s: t("Es | un | celular | negro | con | funda | azul.", "It's | a | phone | black | with | case | blue.", "It's a black phone with a blue case.", { spain: t("Es | un | móvil | negro | con | funda | azul.", "It's | a | phone | black | with | case | blue.", "It's a black phone with a blue case.") }) },
      ],
    },
    police_know: {
      lt: "Say whether you know where it is",
      items: [
        { id: "no_where", s: t("No, | ¿dónde | está?", "No, | where | is it?", "No, where is it?") },
        { id: "q_map", s: t("No. | ¿Me | la | puede | enseñar | en | el | mapa?", "No. | (To) me | it | can you | show | on | the | map?", "No. Could you show me on the map?",
          { flags: { 2: "la: it, la policía." } }) },
        { id: "i_know", s: t("Sí, | ya | sé | dónde | está.", "Yes, | already | I-know | where | it is.", "Yes, I know where it is.") },
      ],
    },
    police: {
      lt: "Ask where the police are and how to get there",
      items: [
        { id: "q_police", s: t("¿Dónde | está | la | policía?", "Where | is | the | police?", "Where's the police station?") },
        { id: "q_map", s: t("¿Me | la | puede | enseñar | en | el | mapa?", "(To) me | it | can you | show | on | the | map?", "Could you show me on the map?", { flags: { 1: "la: it, la policía." } }) },
        { id: "q_get_there", s: t("¿Cómo | llego?", "How | do I get there?", "How do I get there?") },
        { id: "q_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
      ],
    },
    emergency: {
      lt: "Ask about the emergency number and your cards",
      items: [
        { id: "q_911", s: t("¿Llamo | al | 911?", "Do I call | the | 911?", "Should I call 911?", { say: "¿Llamo al nueve once?", flags: { 1: "al (a + el): Spanish puts an article before the number." } }) },
        { id: "q_number", s: t("¿Cuál | es | el | número | de | emergencias?", "Which | is | the | number | of | emergencies?", "What's the emergency number?") },
        { id: "q_cards", s: t("¿Tengo | que | bloquear | mis | tarjetas?", "Do I have | to | block | my | cards?", "Should I block my cards?") },
      ],
    },
    thanks: {
      lt: "Thank her and say goodbye",
      items: [
        { id: "s_thanks_help", s: t("¡Gracias | por | su | ayuda!", "Thanks | for | your | help!", "Thanks for your help!") },
        { id: "kind", s: t("Muchas | gracias. | Es | usted | muy | amable.", "Many | thanks. | Are | you | very | kind.", "Thank you so much. You're very kind.",
          { flags: { 2: "Es usted: the verb before usted sounds warm and polite; usted es also works." } }) },
        { id: "s_bye2", s: t("¡Adiós!", "Goodbye!", "Goodbye!") },
      ],
    },
    found: {
      lt: "Say whether it's yours",
      items: [
        { id: "its_mine", s: t("¡Sí, | es | mía!", "Yes, | it's | mine!", "Yes, that's mine!"), note: "mía for la cartera (or billetera), la bolsa, la mochila; mío for el celular." },
        { id: "not_mine", s: t("No, | no es | mía.", "No, | it isn't | mine.", "No, that's not mine.") },
      ],
    },
    all_there: {
      lt: "Say whether everything's there",
      items: [
        { id: "all_there", s: t("Sí, | está | todo.", "Yes, | is | everything.", "Yes, everything's there.") },
        { id: "all_there", s: t("Sí, | no falta | nada.", "Yes, | isn't missing | anything.", "Yes, nothing's missing.") },
        { id: "some_missing", s: t("Falta | el | dinero.", "Is missing | the | money.", "The money's gone.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With an older stranger, usted is more polite: ¿Me puede ayudar? (puedes is for friends).", better: "¿Me puede ayudar?" },
    mx_911: { key: "mx_911", lt: "Understood! In Mexico the emergency number is 911 (said “nueve once”).", better: "¿Llamo al 911?" },
  },

  merges: {
    // Spain's twins (12 Nov 2026)
    "se le ve": { reason: "grammatical_fusion", split: "se → one + le → (on) you + ve → sees: se le ve preocupado = you look worried; one English verb.", minimal: "Pronouns and verb." },
    "ha pasado": { reason: "grammatical_fusion", split: "ha → has + pasado → happened: Spain's present perfect for what has just happened; one English verb phrase (has happened).", minimal: "Auxiliary and participle." },
    "ha comprado": { reason: "grammatical_fusion", split: "ha → have + comprado → bought: Spain's present perfect for what has just happened; one English verb phrase (have you bought).", minimal: "Auxiliary and participle." },
    "ha estado": { reason: "grammatical_fusion", split: "ha → have + estado → been: Spain's present perfect for what has just happened; one English verb phrase (you've been).", minimal: "Auxiliary and participle." },
    "ha dejado": { reason: "grammatical_fusion", split: "ha → have + dejado → left: Spain's present perfect for what has just happened; one English verb phrase (you've left).", minimal: "Auxiliary and participle." },
    "ha encontrado": { reason: "grammatical_fusion", split: "ha → has + encontrado → found: Spain's present perfect for what has just happened; one English verb phrase (has found).", minimal: "Auxiliary and participle." },
    "ha perdido": { reason: "grammatical_fusion", split: "ha → have + perdido → lost: Spain's present perfect for what has just happened; one English verb phrase (have you lost).", minimal: "Auxiliary and participle." },
    "he perdido": { reason: "grammatical_fusion", split: "he → have + perdido → lost: Spain's present perfect for what has just happened; one English verb phrase (I've lost).", minimal: "Auxiliary and participle." },
    "han robado": { reason: "grammatical_fusion", split: "han → have + robado → stolen: Spain's present perfect for what has just happened; one English verb phrase (they've stolen).", minimal: "Auxiliary and participle." },
    "he mirado": { reason: "grammatical_fusion", split: "he → have + mirado → looked: Spain's present perfect for what has just happened; one English verb phrase (I've looked).", minimal: "Auxiliary and participle." },
    "he buscado": { reason: "grammatical_fusion", split: "he → have + buscado → searched: Spain's present perfect for what has just happened; one English verb phrase (I've looked).", minimal: "Auxiliary and participle." },
    "se le ha caído": { reason: "grammatical_fusion", split: "se → itself + le → from you + ha caído → has fallen: the accidental se = you've dropped it.", minimal: "Pronouns, auxiliary and participle." },
    "se me ha perdido": { reason: "grammatical_fusion", split: "se → itself + me → from me + ha perdido → has got lost: the accidental se = I've lost.", minimal: "Pronouns, auxiliary and participle." },
    "cada poco": { reason: "lexical_expression", split: "cada → each + poco → little: = every few minutes (Spain).", minimal: "Two words." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same = right now.", minimal: "Two words." },
    "menos mal": { reason: "lexical_expression", split: "menos → less + mal → bad is a fixed phrase = thank goodness.", minimal: "Two words." },
    "por todas partes": { reason: "lexical_expression", split: "por → through + todas → all + partes → parts = everywhere.", minimal: "Three words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less = roughly.", minimal: "Three words." },
    "se me perdió": { reason: "grammatical_fusion", split: "se → itself + me → to me + perdió → it lost misreads the construction: “it got lost on me” = I lost.", minimal: "Three words; the object stays outside." },
    "se le cayó": { reason: "grammatical_fusion", split: "se → itself + le → to you + cayó → it fell: the accidental se = you dropped it.", minimal: "Three words." },
    "a lo mejor": { reason: "lexical_expression", split: "a → to + lo → the + mejor → best misreads the adverb: maybe.", minimal: "Three words." },
    "por si acaso": { reason: "lexical_expression", split: "por → for + si → if + acaso → perhaps is the fixed phrase just in case.", minimal: "Three words." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is the conjunction in case.", minimal: "Two words." },
    "por última vez": { reason: "lexical_expression", split: "por → for + última → last + vez → time: the adverb for the last time.", minimal: "Three words." },
    "por todos lados": { reason: "lexical_expression", split: "por → through + todos → all + lados → sides is the adverb everywhere.", minimal: "Three words." },
    "policía municipal": { reason: "lexical_expression", split: "policía → police + municipal → municipal names one institution: the town police.", minimal: "The two-word name." },
    "junto al": { reason: "grammatical_fusion", split: "junto → together + al → to the: junto a is the preposition next to, fused with el.", minimal: "Two words; the noun stays outside." },
    "junto a": { reason: "lexical_expression", split: "junto → together + a → to is false; the preposition = next to.", minimal: "Two words; the noun stays outside." },
    "al otro lado": { reason: "lexical_expression", split: "al → to the + otro → other + lado → side is the adverb on the other side (across).", minimal: "Three words; de and the place stay outside." },
    "no he visto": { reason: "grammatical_fusion", split: "no → not + he → I have + visto → seen; English puts the negation inside: I haven't seen.", minimal: "Three words." },
    "cada rato": { reason: "lexical_expression", split: "cada → each + rato → while is the adverb every little while (every few minutes).", minimal: "Two words." },
    "enfrente del": { reason: "grammatical_fusion", split: "enfrente → in front + del → of the: enfrente de is the preposition across from, fused with el.", minimal: "Two words; the noun stays outside." },
    "para servirle": { reason: "lexical_expression", split: "para → for + servirle → to serve you is the set courtesy at your service.", minimal: "Two words." },
    "al lado": { reason: "lexical_expression", split: "al → to the + lado → side is the adverb next to it.", minimal: "Two words." },
    "a pie": { reason: "lexical_expression", split: "a → to + pie → foot is the adverb on foot.", minimal: "Two words." },
    "de piel": { reason: "lexical_expression", split: "de → of + piel → skin describes the material: leather.", minimal: "Two words." },
    "de una vez": { reason: "lexical_expression", split: "de → of + una → one + vez → time is the adverb right away.", minimal: "Three words." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways is the adverb anyway.", minimal: "Three words." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → the + menos → least is the adverb at least.", minimal: "Three words." },
    "qué bueno": { reason: "lexical_expression", split: "qué → what + bueno → good is the exclamation how wonderful.", minimal: "Two words." },
    "se conocen": { reason: "grammatical_fusion", split: "se → each other + conocen → they know: the reciprocal se is part of the English verb phrase (know each other).", minimal: "Two words." },
    "se la": { reason: "grammatical_fusion", split: "se → to you + la → it: two object pronouns before the verb are glossed together.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say you've lost your wallet", step: "problem" },
    { lt: "Say where you last had it", done: (c) => !!(c.s.place || c.s.placeSkipped) },
    { lt: "Describe it", optional: true,
      when: (c) => !!c.s.askDescribe && !c.s.found && !c.s.policeInfo,
      done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped) },
    { lt: "Say whether it's yours", optional: true, when: (c) => !!c.s.foundAsked, done: (c) => !!c.s.foundAsked && !!c.s.found },
    { lt: "Check that everything's there", optional: true, when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside },
    { lt: "Ask where the police are", optional: true, when: (c) => !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown) },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.lost,
      ask: (c) => c.say("ask_problem"),
      expects: ["help_req", "lost", "not_lost"],
      suggest: [{ lt: "Ask for help and say what you lost", hint: "problem", options: "item" }] },
    { id: "last_seen", when: (c) => !!c.s.lost && !c.s.found, done: (c) => !!c.s.lastSeen,
      ask: (c) => c.say("ask_last", { X: item(c) }),
      expects: ["last_seen", "when_ctx", "place_ctx", "place_not_ctx", "dont_remember", "bought_ctx", "nothing_ctx"],
      suggest: [{ lt: "Say where and when you last had it", hint: "last_seen", options: "place" }],
      yes: (c) => { c.say("where_was_that"); c.hold(); },
      no: (c) => { lastSeenHelp(c); c.hold(); },
      // "No sé" / "No me acuerdo": a hint the first time; the second time she goes on without a place
      help: (c) => { lastSeenHelp(c); } },
    { id: "where_then", when: (c) => !!c.s.lastSeen && !c.s.place && !c.s.found, done: (c) => !!c.s.place || !!c.s.placeSkipped,
      ask: (c) => c.say("ask_where_then"),
      expects: ["last_seen", "place_ctx", "place_not_ctx", "dont_remember"],
      suggest: [{ lt: "Say where you were", hint: "where_then", options: "place" }],
      // "No sé" / "No me acuerdo": she goes on with what she can advise
      help: (c) => { c.s.placeSkipped = true; askNext(c); } },
    { id: "advice", when: (c) => !!c.s.lastSeen && !c.s.found, done: (c) => !!c.s.advised,
      ask: (c) => {
        c.s.advised = true;
        const p = c.s.place ? byId(c.s.place) : null;
        if (c.s.home && !p) c.say("left_home", { X: item(c) }); // (the police line follows: no "si no aparece" twice)
        else if (!p) c.say("retrace");
        else {
          const kind = p.attrs?.kind;
          if (kind === "bus") { c.say("call_bus"); c.say("bus_keep"); }
          else if (kind === "taxi") { c.say("call_taxi"); c.say("taxi_know"); }
          else if (kind === "here") { c.say("look_here"); c.say("maybe_found", { X: item(c) }); }
          else if (kind === "near") { c.say("go_back_near", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
          else if (kind === "area") { c.say("go_back_area", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
          else { c.say("go_back_shop", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
        }
        // (on a found-it visit the boy turns up right after the description)
        if (c.s.askDescribe && !c.s.color && !c.s.material && !c.s.size) c.ask("describe");
        else if (c.s.foundTwist) c.ask("found");
        // nothing else to ask: on to the police, without a silent turn (unless the way there was already given)
        else if (!gotBack(c) && !c.s.policeInfo && !c.s.policeKnown) c.ask("police");
      },
      suggest: [{ lt: "Ask where the police are", hint: "police" }, { lt: "Ask about 911 or your cards", hint: "emergency" }] },
    { id: "found", when: (c) => !!c.s.foundTwist && !!c.s.advised, done: (c) => !!c.s.found,
      ask: (c) => {
        if (c.s.foundAsked) { c.say("found_reask", { X: item(c) }); return; }
        c.s.foundAsked = true;
        c.twist("found_it");
        c.say("found", { X: itemNp(c) }); c.say("found_ask", { X: item(c) });
      },
      expects: ["its_mine", "its_mine_ctx", "not_mine", "not_mine_ctx", "unsure_mine_ctx"],
      suggest: [{ lt: "Say whether it's yours", hint: "found" }],
      yes: (c) => { lostWallet.handlers.its_mine(c, {}, { intent: "its_mine", slots: {}, tags: [] } as any); },
      no: (c) => { lostWallet.handlers.not_mine(c, {}, { intent: "not_mine", slots: {}, tags: [] } as any); } },
    { id: "all_there", when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside,
      ask: (c) => { c.say(c.s.thereAsked ? "all_there_again" : item(c) === "phone" ? "found_yes_phone" : "found_yes"); c.s.thereAsked = true; },
      expects: ["all_there", "some_missing", "unsure_all_ctx"],
      suggest: [{ lt: "Say whether everything's there", hint: "all_there" }],
      yes: (c) => { c.s.checkedInside = true; c.say("glad"); c.complete(); },
      no: (c) => { lostWallet.handlers.some_missing(c, {}, { intent: "some_missing", slots: {}, tags: [] } as any); } },
    { id: "describe", when: (c) => !!c.s.askDescribe && !!c.s.lost && !c.s.found && !c.s.policeInfo, done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      // asked again after a side question: a short reminder
      ask: (c) => { c.say(c.s.describeAsked ? "describe_again" : "ask_describe", { X: item(c) }); c.s.describeAsked = true; },
      expects: ["describe", "describe_ctx", "describe_fix", "dont_remember"],
      suggest: [{ lt: "Describe it: color, size, material", hint: "describe" }],
      help: (c) => { c.s.describeSkipped = true; c.say("no_worry"); askNext(c); } },
    { id: "police", when: (c) => !!c.s.lost && !!c.s.advised && !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown),
      ask: (c) => {
        // asked a fourth time (the learner keeps talking about something else): she just shows the way
        if ((c.s.policeAsked ?? 0) >= 3) { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); return; }
        if (!c.s.policeSuggested) { c.s.policeSuggested = true; c.say("police_suggest"); }
        c.say(["ask_know_police", "police_again", "police_again2"][c.s.policeAsked ?? 0]);
        c.s.policeAsked = (c.s.policeAsked ?? 0) + 1;
      },
      // (where_stand: "¿Dónde está la iglesia?" is the church, not "¿Dónde está?" + a place)
      expects: ["police_where", "police_where_ctx", "police_known", "police_known_ctx", "map", "where_stand"],
      suggest: [{ lt: "Say whether you know where it is", hint: "police_know" }, { lt: "Ask the way", hint: "police" }],
      yes: (c) => { c.s.policeKnown = true; c.say("police_known_ok"); },
      no: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); },
      // "No sé" = no, tell me the way
      help: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); } },
  ],

  init: (c) => {
    c.s.askPockets = c.chance(0.35);
    c.s.askDescribe = c.chance(0.75);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.45);
    c.s.worried = c.chance(0.4);
  },

  start: (c) => {
    c.say(c.s.worried ? "greet_worried" : "greet");
    c.hold();
    // "¿Está bien? Se ve preocupado.": "Sí, estoy bien" gets "¿Seguro?…", "No" gets "¿Qué le pasó?"
    if (c.s.worried) c.expect({
      id: "worried_q", optional: true, expects: ["lost", "help_req", "not_lost"], hints: ["problem"],
      suggest: [{ lt: "Ask for help and say what you lost", hint: "problem", options: "item" }],
      yes: (cc) => { cc.say("really_ok"); cc.expect(reallyPending()); },
      no: (cc) => { cc.say("ask_problem"); cc.hold(); },
      on: {
        lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
        help_req: (cc, sl, sg) => lostWallet.handlers.help_req(cc, sl, sg),
        not_lost: (cc, sl, sg) => lostWallet.handlers.not_lost(cc, sl, sg),
      },
    });
  },

  handlers: {
    help_req(c) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("ok"); return; }
      c.say("help_ok");
      c.expect({
        // optional: "La tenía en el café…" (last seen) also tells the problem; the step takes over
        id: "what_happened", optional: true, expects: ["lost", "not_lost"], hints: ["problem"],
        suggest: [{ lt: "Say what you lost", hint: "lost", options: "item" }],
        on: {
          lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
          not_lost: (cc, sl, sg) => lostWallet.handlers.not_lost(cc, sl, sg),
        },
      });
    },
    lost(c, slots, seg) {
      if (!mark(c)) return;
      const first = !c.s.lost;
      c.s.lost = true;
      if (slots.item) c.s.item = slots.item;
      // "¿No ha visto una cartera negra?": a question, answered first; its color is the description's
      const seen = !!seg?.tags?.includes("seen");
      if (seen && !turn(c).seenSaid) { turn(c).seenSaid = true; c.say("not_seen"); }
      if (seen && !c.s.found && !c.s.color && !c.s.material) { if (slots.color) c.s.color = slots.color; if (slots.material) c.s.material = slots.material; }
      if (!first) { if (!turn(c).lostSaid && !seen) c.say("ok"); return; }
      turn(c).lostSaid = true;
      if (seg.tags.includes("stolen")) { c.s.stolen = true; c.say("stolen_react"); }
      else c.say("lost_react");
      if (seg.tags.includes("keys")) { c.s.keys = true; c.say("keys_too"); }
      if (c.s.askPockets) { c.say("ask_pockets"); c.expect(pocketsPending()); }
      // "¿Y las llaves también?" waits for its yes or no before "¿Dónde la vio…?" (a "Sí" got "¿Ah, sí? ¿Dónde fue eso?")
      else if (c.s.keys) c.expect({ id: "keys_q", optional: true, hints: ["g_yesno"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }], yes: () => {}, no: () => {} });
    },
    not_lost(c, slots, seg) {
      if (!mark(c)) return;
      // one "no" before "perdí mi cartera" may be "No, perdí mi cartera": ask; "No, no perdí…" is a clear no
      const noes = (c.heard.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\bno\b/g) || []).length;
      if (seg?.tags?.includes("amb") && !c.s.lost && noes < 2) {
        if (slots.item) c.s.item = slots.item;
        c.say("lost_really", { X: item(c) });
        c.expect({
          id: "lost_really", expects: ["lost", "not_lost"], hints: ["g_yesno"],
          suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
          yes: (cc) => lostWallet.handlers.lost(cc, {}, { intent: "lost", slots: {}, tags: [] } as any),
          no: (cc) => { cc.say("not_lost_resp"); cc.hold(); },
          on: {
            lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
            // said again with one "no" ("No, perdí mi cartera"): it was lost
            not_lost: (cc, sl, sg) => {
              if (sg.tags.includes("amb")) { lostWallet.handlers.lost(cc, sl, { ...sg, tags: [] }); return; }
              cc.say("not_lost_resp"); cc.hold();
            },
          },
        });
        return;
      }
      if (c.s.lost) { c.say("glad"); if (!c.s.found) c.s.found = "self"; return; }
      c.say("not_lost_resp"); c.hold();
    },
    last_seen(c, slots, seg) {
      if (!mark(c)) return;
      const seen = slots.seen || {};
      if (seg?.tags?.includes("amb") && seen.place && slots.wrong) { c.say("which_place", { X: seen.place, Y: slots.wrong }); c.hold(); return; }
      c.s.lastSeen = true;
      if (seen.place) c.s.place = seen.place;
      if ((seen.__tags || []).includes("home")) c.s.home = true;
      if (!c.s.lost) c.s.lost = true;
      if (!seen.place && (c.s.lastSeenOnce || c.s.home)) c.s.placeSkipped = true;
      c.s.lastSeenOnce = true;
    },
    place_not_ctx(c) { if (!mark(c)) return; c.say("where_then_ask"); c.hold(); },
    when_ctx(c) {
      if (!mark(c)) return;
      c.s.lastSeen = true;
      if (c.s.lastSeenOnce) c.s.placeSkipped = true;
      c.s.lastSeenOnce = true;
    },
    place_ctx(c, slots, seg) {
      if (!mark(c)) return;
      c.s.lastSeen = true;
      c.s.lastSeenOnce = true;
      if (slots.place) c.s.place = slots.place;
      // "Aquí, cuando fui a pagar los mangos": here, at the tianguis
      else if (seg?.tags?.includes("here")) c.s.place = "market";
    },
    // "Sí, compré pan": what, not where
    bought_ctx(c) { if (!mark(c)) return; c.say("where_was_that"); c.hold(); },
    // "No, nada": as a no
    nothing_ctx(c) { if (!mark(c)) return; lastSeenHelp(c); c.hold(); },
    dont_remember(c) {
      if (!mark(c)) return;
      const st = lostWallet.steps.find((x) => x.id === c.step);
      if (st?.help && !(st.done(c))) { st.help(c); c.hold(); return; }
      c.say("no_worry");
    },
    describe(c, slots) {
      if (!mark(c)) return;
      if (c.s.found === "mine" || c.s.found === "partial") { c.say("ok"); return; }
      const looks = () => [c.s.color, c.s.material, c.s.size].join("|");
      const before = looks();
      describeFrom(c, slots);
      const T = turn(c);
      if (T.echoed) return; // one echo per utterance
      T.echoed = true;
      // "Tiene una foto de mis hijos", "Es una cartera normal", or only what's inside after a description
      // ("Adentro hay dos tarjetas…"): noted, without an echo (or the old one again)
      if ((!c.s.color && !c.s.material && !c.s.size) || (before !== "||" && looks() === before)) {
        if (!c.s.color && !c.s.material && !c.s.size) c.s.describeSkipped = true;
        c.say("describe_noted", { X: item(c) }); return;
      }
      c.say("describe_echo", { X: itemNp(c) });
    },
    describe_ctx(c, slots, seg) { lostWallet.handlers.describe(c, slots, seg); },
    describe_fix(c, slots, seg) {
      if (!mark(c)) return;
      if (slots.wrong && c.s.color === slots.wrong) c.s.color = undefined;
      if (slots.color) c.s.color = slots.color;
      turn(c).echoed = true;
      c.say("fix_echo", { X: itemNp(c) });
    },
    police_where(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      if ((c.s.policeAsked ?? 0) >= 3 && c.step === "police") c.say("look_there");
      c.say("directions"); c.say("directions2");
    },
    police_where_ctx(c, slots, seg) { lostWallet.handlers.police_where(c, slots, seg); },
    police_known(c, slots) {
      if (!mark(c)) return;
      // "Está junto al banco (al museo), ¿verdad?": it's next to the church, across the square (the 3D town); by the
      // church, near the kiosco or on the square is right
      if (slots?.place && !["church", "kiosco", "market"].includes(slots.place)) { c.s.policeInfo = true; c.say("police_correct"); return; }
      c.s.policeKnown = true;
      // a right guess ("¿Junto a la iglesia?", "Está en la plaza, ¿no?") gets a yes; "Sí, ya sé" gets "Ah, muy bien"
      c.say(slots?.place && !/^\W*(si|ya)\b/.test(norm(c.heard)) ? "police_yes" : "police_known_ok");
    },
    police_known_ctx(c, slots, seg) { lostWallet.handlers.police_known(c, slots, seg); },
    map(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      c.say("map_show"); c.say("map_mark");
      c.event("mark-location", { to: "police" });
    },
    far(c) { if (!mark(c)) return; c.s.policeInfo = true; c.s.policeSuggested = true; c.say("far"); },
    how_get(c) { if (!mark(c)) return; c.s.policeInfo = true; c.s.policeSuggested = true; c.say("directions2"); },
    call911(c) {
      if (!mark(c)) return;
      c.say("no911"); c.say("no911b"); c.say("no911c");
      c.s.policeSuggested = true;
    },
    where_found(c) {
      if (!mark(c)) return;
      if (c.s.foundAsked && c.s.foundTwist) c.say("where_found", { X: item(c) }); else c.say("ok");
    },
    where_stand(c, _slots, seg) {
      if (!mark(c)) return;
      if (seg?.tags?.includes("church")) { c.say("where_church"); c.s.policeInfo = true; c.s.policeSuggested = true; return; }
      // "la parada" alone: the taxi stand after a taxi, else the colectivos
      const taxi = seg?.tags?.includes("taxi") || (!seg?.tags?.includes("bus") && c.s.place === "taxi");
      c.say(taxi ? "where_sitio" : "where_colectivos");
    },
    saw_someone(c) { if (!mark(c)) return; c.say("not_seen"); },
    her_name(c) { if (!mark(c)) return; c.say("her_name"); },
    keep_eye(c, _slots, seg) { if (!mark(c)) return; c.say(gotBack(c) ? "ok" : seg?.tags?.includes("search") ? "cant_leave" : "eye_yes"); },
    leave_number(c) { if (!mark(c)) return; if (gotBack(c)) { c.say("ok"); return; } c.say("number_police"); c.s.policeSuggested = true; },
    sure_ctx(c) { if (!mark(c)) return; c.say("if_need"); c.hold(); },
    police_open(c) { if (!mark(c)) return; c.say("police_open"); },
    police_english(c) { if (!mark(c)) return; c.say("police_english"); },
    emergency_number(c) { if (!mark(c)) return; c.say("number911"); },
    cancel_cards(c) { if (!mark(c)) return; c.say("cards"); },
    what_do(c, _slots, seg) {
      if (!mark(c)) return;
      // "¿Y si me la robaron?": the police anyway; asked again: the short version
      if (seg?.tags?.includes("stolen")) c.say("missing_some");
      else c.say(c.s.whatDoSaid ? "no911c" : "what_do");
      c.s.whatDoSaid = true; c.s.policeSuggested = true;
    },
    checked(c) { if (!mark(c)) return; c.s.pocketsDone = true; c.say("checked_ok"); },
    checked_ctx(c) { if (!mark(c)) return; c.s.pocketsDone = true; c.say("checked_ok"); },
    not_checked_ctx(c) { if (!mark(c)) return; c.say("check_again"); },
    will_go_back(c) { if (!mark(c)) return; c.say("ok"); },
    hope_so(c) { if (!mark(c)) return; c.say("ok"); },
    some_missing(c, _slots, seg) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      if (seg?.tags?.includes("amb")) {
        // "No, no falta el dinero": nothing is missing; one "no" may be "No, falta el dinero": she asks
        if ((norm(c.heard).match(/\bno\b/g) || []).length >= 2) { lostWallet.handlers.all_there(c, {}, seg); return; }
        c.say("missing_really");
        c.expect({
          id: "missing_really", expects: ["all_there", "some_missing", "missing_what_ctx"], hints: ["all_there"],
          suggest: [{ lt: "Say whether something's missing", hint: "all_there" }],
          yes: (cc) => lostWallet.handlers.some_missing(cc, {}, { intent: "some_missing", slots: {}, tags: [] } as any),
          no: (cc) => lostWallet.handlers.all_there(cc, {}, { intent: "all_there", slots: {}, tags: [] } as any),
          on: {
            all_there: (cc, sl, sg) => lostWallet.handlers.all_there(cc, sl, sg),
            missing_what_ctx: (cc) => lostWallet.handlers.some_missing(cc, {}, { intent: "some_missing", slots: {}, tags: [] } as any),
            // after "¿Sí le falta algo?" a single leading "no" answers it: "No, está todo", "No falta el dinero" = nothing is missing
            some_missing: (cc, sl, sg) => {
              const noes = (norm(cc.heard).match(/\bno\b/g) || []).length;
              if (noes === 1 && /^\W*no\b/.test(norm(cc.heard))) { lostWallet.handlers.all_there(cc, sl, sg); return; }
              lostWallet.handlers.some_missing(cc, sl, { ...sg, tags: [] });
            },
          },
        });
        return;
      }
      c.s.checkedInside = true;
      // the phone: "No, no prende" / "La pantalla está rota" (no police for that)
      if (item(c) === "phone" || seg?.tags?.includes("broken")) { c.say("phone_broken", { X: item(c) }); c.complete(); return; }
      c.s.found = "partial"; c.s.policeSuggested = true; c.say("missing_some");
    },
    its_mine(c) {
      if (!mark(c)) return;
      if (!c.s.foundTwist || !c.s.advised) { c.say("ok"); return; }
      c.s.found = "mine";
    },
    not_mine(c, slots) {
      if (!mark(c)) return;
      if (!c.s.foundTwist || !c.s.foundAsked) { c.say("ok"); return; }
      // "La mía es negra" without a "no": it may be a yes (this one is black too); she asks to look again
      if ((slots?.color || slots?.material) && !/\bno\b/.test(norm(c.heard))) { c.say("look_closer", { X: item(c) }); c.hold(); return; }
      c.s.found = "no"; c.s.foundTwist = false;
      c.say("not_yours");
    },
    its_mine_ctx(c, slots, seg) { lostWallet.handlers.its_mine(c, slots, seg); },
    unsure_mine_ctx(c) { if (!mark(c)) return; c.say("look_closer", { X: item(c) }); c.hold(); },
    // only expected in the "¿Sí le falta algo?" pending, which handles it there
    missing_what_ctx(c) { if (!mark(c)) return; lostWallet.handlers.some_missing(c, {}, { intent: "some_missing", slots: {}, tags: [] } as any); },
    unsure_all_ctx(c) { if (!mark(c)) return; c.say("check_calm"); c.hold(); },
    not_mine_ctx(c, slots, seg) { lostWallet.handlers.not_mine(c, slots, seg); },
    all_there(c) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      c.s.checkedInside = true; c.say("glad"); c.complete();
    },
    thanks_kind(c, slots, seg) {
      if (!mark(c)) return;
      // "¡Gracias, niño!" when the boy holds it out: it's theirs
      if (seg?.tags?.includes("boy") && c.s.foundTwist && c.s.foundAsked && !c.s.found) { c.s.found = "mine"; c.s.boyThanked = true; return; }
      if (c.s.found === "mine" && !c.s.boyThanked) { c.s.boyThanked = true; c.say("boy_thanks"); return; }
      c.say("kind_resp");
    },
    flowers(c, _slots, seg) {
      if (!mark(c)) return;
      if (seg.tags.includes("price")) c.say("flowers_price", { price: FLOWERS });
      else if (seg.tags.includes("nice")) c.say("flowers_thanks");
      else { c.say("flowers_sure"); c.say("flowers_price", { price: FLOWERS }); }
      // after the loss the price is still answered ("¿Cuánto cuestan las rosas?" got "Muy bien."), with no "¿Le pasó algo?"
      if (c.s.lost) return;
      c.say("but_worried");
      c.expect({
        id: "flowers_q", expects: ["lost", "help_req"], hints: ["problem"],
        suggest: [{ lt: "Say what happened", hint: "lost", options: "item" }],
        yes: (cc) => { cc.say("ask_problem"); cc.hold(); },
        no: (cc) => { cc.say("really_ok"); cc.expect(reallyPending()); },
        on: {
          lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
          help_req: (cc, sl, sg) => lostWallet.handlers.help_req(cc, sl, sg),
        },
      });
    },
    g_bye(c) { bye(c); },
  },

  finish: (c) => {
    if (c.s.found === "mine" && c.s.checkedInside) { c.complete(); c.say("enjoy_day"); }
    else if (c.s.found === "self") { if (c.s.place || c.s.placeSkipped) c.complete(); c.say("enjoy_day"); }
    // the wallet is back but the money is gone: no "Ojalá la encuentre"
    else if (c.s.found === "partial") { c.complete(); c.say("luck"); }
    else { if (c.s.lost) c.complete(); c.say("good_luck", { X: item(c) }); }
    const closing: Pending = {
      id: "closing", hints: ["thanks"], suggest: [{ lt: "Thank her and say goodbye", hint: "thanks" }],
      on: {
        g_thanks: (cc) => bye(cc, true),
        thanks_kind: (cc) => bye(cc, true),
        hope_so: (cc) => bye(cc, true),
        g_bye: (cc) => bye(cc),
        g_ok: (cc) => bye(cc),
        // "¿Cómo está?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => bye(cc),
      no: (cc) => bye(cc),
    };
    c.expect(closing);
  },

  tests: [
    // Every hint construction
    { say: "Disculpe, ¿me puede ayudar?", intent: "help_req" },
    { say: "Perdí mi cartera.", intent: "lost", slots: { item: "wallet" } },
    { say: "Se me perdió la cartera.", intent: "lost" },
    { say: "No encuentro mi cartera.", intent: "lost" },
    { say: "Creo que me robaron la cartera.", intent: "lost" },
    { say: "Sí, ya revisé.", intent: "checked" },
    { say: "Sí, ya busqué por todos lados.", intent: "checked" },
    { say: "En el café.", intent: "last_seen", step: "last_seen", slots: { seen: { place: "cafe" } } },
    { say: "El puesto de fruta", intent: "place_ctx", step: "where_then", slots: { place: "fruit_stand" } },
    { say: "Cuando pagué mi café.", intent: "last_seen" },
    { say: "Hace como una hora.", intent: "when_ctx", step: "last_seen" },
    { say: "Hoy en la mañana, en la panadería.", intent: "last_seen", slots: { seen: { place: "bakery" } } },
    { say: "Estaba en el banco.", intent: "last_seen", slots: { seen: { place: "bank" } } },
    { say: "Junto a la banca.", intent: "last_seen", slots: { seen: { place: "bench" } } },
    { say: "Tomé un taxi.", intent: "last_seen", slots: { seen: { place: "taxi" } } },
    { say: "Es una cartera negra de piel.", intent: "describe" },
    { say: "Es café y chiquita.", intent: "describe" },
    { say: "Es negra y tiene una foto de mis hijos.", intent: "describe" },
    { say: "Es un celular negro con funda azul.", intent: "describe", step: "describe" },
    { say: "No, ¿dónde está?", intent: "police_where_ctx", step: "police" },
    { say: "¿Dónde está la policía?", intent: "police_where" },
    { say: "¿Me la puede enseñar en el mapa?", intent: "map" },
    { say: "Sí, ya sé dónde está.", intent: "police_known_ctx", step: "police" },
    { say: "¿Cómo llego?", intent: "how_get" },
    { say: "¿Está lejos?", intent: "far" },
    { say: "¿Llamo al 911?", intent: "call911" },
    { say: "¿Cuál es el número de emergencias?", intent: "emergency_number" },
    { say: "¿Tengo que bloquear mis tarjetas?", intent: "cancel_cards" },
    { say: "Es usted muy amable.", intent: "thanks_kind" },
    { say: "¡Sí, es mía!", intent: "its_mine", step: "found" },
    { say: "No, no es mía.", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "Sí, está todo.", intent: "all_there", step: "all_there" },
    { say: "Sí, no falta nada.", intent: "all_there", step: "all_there", not: ["some_missing"] },
    { say: "Falta el dinero.", intent: "some_missing", step: "all_there", not: ["all_there"] },
    // Natural alternatives, short answers, accentless typing, tú to staff
    { say: "se me perdio mi cartera", intent: "lost" },
    { say: "Me robaron mi celular", intent: "lost", slots: { item: "phone" } },
    { say: "¿No ha visto una cartera negra?", intent: "lost" },
    { say: "Perdí mi cartera y mis llaves", intent: "lost" },
    { say: "Me bolsearon", intent: "lost" },
    { say: "¿Me puedes ayudar?", intent: "help_req" },
    { say: "Saqué dinero del cajero", intent: "last_seen", slots: { seen: { place: "atm" } } },
    { say: "No me acuerdo, tal vez en el tianguis", intent: "last_seen", slots: { seen: { place: "market" } } },
    { say: "Me subí a un colectivo", intent: "last_seen", slots: { seen: { place: "bus" } } },
    { say: "Creo que la dejé en el taxi", intent: "last_seen", slots: { seen: { place: "taxi" } } },
    { say: "Cuando estaba comprando mangos en el tianguis", intent: "last_seen", slots: { seen: { place: "market" } } },
    { say: "No me acuerdo", intent: "dont_remember", step: "where_then" },
    { say: "Negra", intent: "describe_ctx", step: "describe" },
    { say: "Es de piel, café, y tiene una foto de mis hijos", intent: "describe" },
    { say: "No, no soy de aquí", intent: "police_where_ctx", step: "police" },
    { say: "Sí, está junto a la iglesia, ¿verdad?", intent: "police_known_ctx", step: "police", slots: { place: "church" } },
    { say: "Sí, en el café", intent: "last_seen", step: "last_seen", not: ["police_known", "police_known_ctx"] },
    { say: "¿Me lo puedes marcar en el mapa?", intent: "map" },
    { say: "¿Y si no está ahí?", intent: "what_do" },
    { say: "Voy a regresar a preguntar", intent: "will_go_back" },
    { say: "Ojalá", intent: "hope_so" },
    { say: "¡Ay, gracias a Dios! Sí, es mía", intent: "its_mine_ctx", step: "found" },
    { say: "No sé si es mía", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "Mi cartera está aquí", intent: "not_lost", not: ["lost", "its_mine", "its_mine_ctx"] },
    { say: "¡Dios mío! Perdí mi cartera", intent: "lost", not: ["its_mine", "its_mine_ctx"] },
    { say: "No la perdí, me la robaron", intent: "lost", not: ["not_lost"] },
    { say: "Sí, mi dinero y mis tarjetas están aquí", intent: "all_there", step: "all_there" },
    { say: "Dios se lo pague", intent: "thanks_kind" },
    { say: "¿Cuánto cuestan las rosas?", intent: "flowers" },
    // Spain forms are correct answers
    { say: "He perdido mi móvil", intent: "lost", slots: { item: "phone" } },
    { say: "Perdí mi bolso", intent: "lost", slots: { item: "bag" } },
    { say: "¿Me podéis ayudar?", intent: "help_req" },
    { say: "Vale, está todo", intent: "all_there", step: "all_there" },
    { say: "Es marrón", intent: "describe", slots: { dp: { color: "brown" } } },
    // Meaning safety: no meaning may flip
    { say: "No perdí mi cartera", intent: "not_lost", not: ["lost"] },
    { say: "Mi cartera no se perdió", intent: "not_lost", not: ["lost"] },
    { say: "No la dejé en el taxi", intent: "none", step: "last_seen" },
    { say: "No fue en el café", intent: "place_not_ctx", step: "last_seen", not: ["last_seen", "place_ctx"] },
    { say: "No estuve en el banco", intent: "place_not_ctx", step: "where_then", not: ["last_seen", "place_ctx"] },
    { say: "No es negra, es café", intent: "describe_fix", step: "describe", slots: { color: "brown" }, not: ["describe_ctx"] },
    { say: "No es negra", intent: "none", step: "describe" },
    { say: "No es mía", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "No, la mía es café", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "Mis tarjetas están, pero el dinero no", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No falta nada", intent: "all_there", step: "all_there", not: ["some_missing"] },
    { say: "No voy a llamar al 911", intent: "none", step: "police" },
    { say: "No necesito el mapa", intent: "none", step: "police" },
    { say: "No sé dónde está", intent: "police_where_ctx", step: "police", not: ["police_known", "police_known_ctx"] },
    { say: "No sé dónde está", intent: "none", step: "problem" },
    { say: "No revisé", intent: "none", step: "pockets" },
    { say: "No quiero flores", intent: "none" },
    { say: "¿Dónde está la comisaría?", intent: "police_where" },
    { say: "Más o menos", intent: "police_where_ctx", step: "police", not: ["g_howareyou_bad"] },
    { say: "¿Está abierta ahorita?", intent: "police_open" },
    { say: "¿Hablan inglés en la policía?", intent: "police_english" },
    { say: "Gracias, niño", intent: "thanks_kind", step: "found" },
    { say: "¿Dónde la encontró?", intent: "where_found", step: "found" },
    { say: "No, esa no es", intent: "not_mine_ctx", step: "found", not: ["its_mine"] },
    { say: "No estaba en la playa, estaba en el café", intent: "last_seen", step: "where_then", slots: { seen: { place: "cafe" } } },
    { say: "No en el banco, en el café", intent: "last_seen", step: "last_seen", slots: { seen: { place: "cafe" } } },
    { say: "No en el banco", intent: "place_not_ctx", step: "last_seen", not: ["place_ctx", "last_seen"] },
    { say: "No, no está todo", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No prende", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No sé dónde está", intent: "none", step: "found" },
    { say: "Sí, en el café", intent: "last_seen", step: "where_then", not: ["police_known", "police_known_ctx", "its_mine"] },
    { say: "No, no estoy bien. Perdí mi cartera.", intent: "lost", not: ["not_lost"] },
    { say: "La verdad no, me robaron la cartera", intent: "lost", not: ["not_lost"] },
    { say: "No, se me perdió la cartera", intent: "lost", not: ["not_lost"] },
    // Review (2 Nov 2026): flips and gaps found by the blind set and the probes
    { say: "No sé, ¿está todo?", intent: "unsure_all_ctx", step: "all_there", not: ["some_missing", "all_there"] },
    { say: "Las tarjetas sí, pero el dinero no", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "Sí, el dinero", intent: "none", step: "all_there" },
    { say: "A lo mejor la dejé en mi casa", intent: "last_seen", step: "last_seen" },
    { say: "Bueno, voy a regresar al café a preguntar", intent: "will_go_back", slots: { place: "cafe" } },
    { say: "¿Puedo verla?", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "¿Usted la encontró?", intent: "none", step: "found" },
    { say: "¿La encontró el niño?", intent: "none", step: "found" },
    { say: "No la encontré", intent: "none", step: "last_seen" },
    { say: "Ay, espere, ya la encontré, estaba en mi mochila", intent: "not_lost", step: "pockets", not: ["lost"] },
    { say: "¿Está abierta los sábados?", intent: "police_open" },
    { say: "Es una emergencia", intent: "none" },
    { say: "¿Qué hago con mis tarjetas?", intent: "cancel_cards" },
    { say: "La policía está junto al banco, ¿verdad?", intent: "police_known", step: "police", slots: { place: "bank" } },
    { say: "No quiero llamar a la policía", intent: "none", step: "police" },
    { say: "No, esa no es mía", intent: "not_mine", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "No falta nada", intent: "all_there", step: "all_there", not: ["some_missing"] },
    // Audit (5 Nov 2026): the town's police (next to the church), the intro's mangoes, the questions she asks and is asked
    { say: "¿Junto al museo?", intent: "police_known_ctx", step: "police", slots: { place: "museum" } },
    { say: "¿La iglesia?", intent: "police_known_ctx", step: "police", slots: { place: "church" }, not: ["last_seen"] },
    { say: "Sí, está cerca del kiosco, ¿no?", intent: "police_known_ctx", step: "police", slots: { place: "kiosco" } },
    { say: "¿Está retirado?", intent: "far" },
    { say: "¿A cuántas cuadras está?", intent: "far" },
    { say: "Aquí, cuando fui a pagar los mangos", intent: "place_ctx", step: "last_seen", not: ["lost"] },
    { say: "En el puesto de mangos, cuando iba a pagar", intent: "last_seen", step: "last_seen", slots: { seen: { place: "fruit_stand" } } },
    { say: "Disculpe, ¿no ha visto una cartera negra?", intent: "lost", slots: { item: "wallet", color: "black" } },
    { say: "Sí, compré pan", intent: "bought_ctx", step: "last_seen", not: ["last_seen", "place_ctx"] },
    { say: "No compré pan", intent: "none", step: "last_seen" },
    { say: "No, nada", intent: "nothing_ctx", step: "last_seen" },
    { say: "Adentro hay dos tarjetas y unos quinientos pesos", intent: "describe" },
    { say: "Tenía mis tarjetas, mi licencia y como mil pesos", intent: "describe" },
    { say: "Es grande y azul, y tiene mi celular y mi pasaporte", intent: "describe_ctx", step: "describe" },
    { say: "Está todo menos el dinero", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "Falta mi pasaporte", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "¿Dónde está el sitio de taxis?", intent: "where_stand" },
    { say: "¿Dónde paran los colectivos?", intent: "where_stand" },
    { say: "Si la encuentra, ¿me avisa?", intent: "keep_eye" },
    { say: "¿Me ayuda a buscarla?", intent: "keep_eye" },
    { say: "¿Le dejo mi número?", intent: "leave_number" },
    { say: "No le dejo mi número", intent: "none" },
    { say: "¿Dónde está la iglesia?", intent: "where_stand" },
    { say: "¿Qué hago si no la encuentro?", intent: "what_do" },
    { say: "¿Y si me la robaron?", intent: "what_do" },
    { say: "¿Usted vio a alguien?", intent: "saw_someone", not: ["lost"] },
    { say: "¿Cómo se llama usted?", intent: "her_name" },
    { say: "¿Me puede marcar la policía en el mapa?", intent: "map" },
    // Not understood
    { say: "Mi perro come tacos en la luna", intent: "none" },
    { say: "Quiero comprar una pizza grande", intent: "none" },
    { say: "Azul", intent: "none" },
    { say: "Mañana voy a la playa con mis amigos", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["Disculpe, ¿me puede ayudar?", "Perdí mi cartera.", "En el café, cuando pagué mi café.", "Es café, de piel.", "¿Dónde está la policía?", "¡Muchas gracias!"],
      expect: { complete: true, state: { place: "cafe", color: "brown" } }, auto: AUTO, setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = true; } },
    // short answers: a bare time, then the place; the questions about 911 and the map
    { name: "short answers, questions", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Hola. No encuentro mi cartera.", "Hace una hora.", "En la panadería.", "¿Llamo al 911?", "¿Me la puede enseñar en el mapa?", "Gracias, adiós."],
      expect: { complete: true, state: { place: "bakery", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police"]) },
    { name: "stolen, colectivo, cards", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Creo que me robaron la cartera.", "Me subí a un colectivo.", "¿Tengo que bloquear mis tarjetas?", "No, ¿dónde está?", "¿Está lejos?", "Gracias, es usted muy amable."],
      expect: { complete: true, state: { stolen: true, place: "bus" } }, auto: AUTO },
    // questions and a change of mind: the color is corrected, she is asked what to do
    { name: "questions and a change of mind", setup: (s) => { s.foundTwist = false; s.askDescribe = true; s.askPockets = true; },
      turns: ["¡Qué flores tan bonitas!", "Sí, perdí mi celular.", "Sí, ya busqué por todos lados.", "Creo que lo dejé en el taxi.", "Es negro.", "No es negro, es azul.", "¿Qué hago ahora?", "Sí, ya sé dónde está.", "Eso espero, gracias."],
      expect: { complete: true, state: { item: "phone", color: "blue", place: "taxi", policeKnown: true } }, auto: omit(AUTO, ["flowers_q", "pockets", "last_seen", "describe", "police", "closing"]) },
    // the twist on every seed: a boy found it by the kiosco
    { name: "twist: a boy found it", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = true; },
      turns: ["Perdí mi cartera.", "Junto al kiosco, creo.", "Es negra, de piel.", "¡Sí, es mía!", "Sí, está todo.", "¡Muchas gracias!"],
      expect: { complete: true, state: { found: "mine", checkedInside: true, color: "black" } }, auto: omit(AUTO, ["last_seen", "describe", "found", "all_there", "closing"]) },
    // the twist, but the money is gone: still to the police
    { name: "twist: it's mine, but the money is gone", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Se me perdió la cartera.", "En el banco.", "Sí, es mía.", "Mis tarjetas están, pero el dinero no.", "Gracias por su ayuda."],
      expect: { complete: true, state: { found: "partial", checkedInside: true } }, auto: omit(AUTO, ["last_seen", "found", "all_there", "closing"]) },
    // the twist, not mine: the police step comes back
    { name: "twist: not mine", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["No encuentro mi mochila.", "En la playa.", "No, no es mía.", "¿Dónde está la policía?", "Adiós."],
      expect: { complete: true, state: { found: "no", item: "backpack", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "found", "police", "closing"]) },
    // the pockets: not checked yet, then checked
    { name: "pockets: check again", setup: (s) => { s.foundTwist = false; s.askPockets = true; s.askDescribe = false; },
      turns: ["Se me perdió la cartera.", "No, todavía no revisé.", "Ya revisé, no está.", "En la farmacia.", "¿Dónde está la policía?", "Gracias."],
      expect: { complete: true, state: { pocketsDone: true, place: "pharmacy" } }, auto: omit(AUTO, ["pockets", "last_seen", "police", "closing"]) },
    // "¿Está bien?": "No, perdí mi cartera" reads like "No perdí mi cartera" (no commas): she checks, a yes goes on
    { name: "worried: no, I lost it", setup: (s) => { s.worried = true; s.foundTwist = false; s.askDescribe = false; s.askPockets = false; },
      turns: ["No, perdí mi cartera.", "Sí.", "En el café.", "¿Dónde está la policía?", "Gracias."],
      expect: { complete: true, state: { lost: true, place: "cafe" } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    { name: "worried: fine, then the problem", setup: (s) => { s.worried = true; s.foundTwist = false; s.askDescribe = false; s.askPockets = false; },
      turns: ["Sí, estoy bien, gracias.", "Bueno, la verdad no. Se me perdió el celular.", "Hace una hora, en el banco.", "No, ¿dónde está?", "Adiós."],
      expect: { complete: true, state: { item: "phone", place: "bank" } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // "No me acuerdo" twice: no place, she still advises
    { name: "don't remember", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Necesito ayuda.", "Perdí mi cartera.", "Hace como media hora.", "No me acuerdo.", "Bueno, voy a regresar a preguntar.", "No sé.", "Gracias."],
      expect: { complete: true, state: { placeSkipped: true, policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police", "closing"]) },
    // "No falta el dinero" (comma lost): she asks; "No, está todo" then means nothing is missing
    { name: "twist: comma-less no, nothing missing", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "En el banco.", "Sí, es mía.", "No falta el dinero.", "No, está todo.", "Gracias."],
      expect: { complete: true, state: { found: "mine", checkedInside: true } }, auto: omit(AUTO, ["last_seen", "found", "all_there", "closing"]) },
    // "La mía es negra" without a "no" may be a yes: she asks to look again; the police place corrected
    { name: "twist: a color, then a yes; the police next to the bank?", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "No sé.", "No me acuerdo.", "La mía es negra.", "Sí, es mía.", "Sí, el dinero y las tarjetas están aquí.", "Gracias."],
      expect: { complete: true, state: { found: "mine", placeSkipped: true } }, auto: omit(AUTO, ["last_seen", "where_then", "found", "all_there", "closing"]) },
    { name: "don't know twice, police next to the bank?", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "No sé.", "No me acuerdo.", "La policía está junto al banco, ¿verdad?", "Gracias."],
      expect: { complete: true, state: { placeSkipped: true, policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police", "closing"]) },
    // Audit (5 Nov 2026). The intro's moment: "¿No ha visto…?" is answered, "aquí, cuando fui a pagar los mangos" is the
    // tianguis, its color is the description; the police by the church is right
    { name: "have you seen it? here, at the mangoes", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = true; },
      turns: ["Disculpe, ¿no ha visto una cartera negra?", "Aquí, cuando fui a pagar los mangos.", "Sí, está junto a la iglesia, ¿verdad?", "Gracias."],
      expect: { complete: true, state: { place: "market", color: "black", policeKnown: true } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // "¿Junto al museo?": the museum is the other way (the 3D town): corrected, not confirmed
    { name: "police next to the museum? corrected", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Perdí mi celular.", "Lo dejé en un taxi.", "¿Dónde está el sitio de taxis?", "¿Junto al museo?", "Gracias."],
      expect: { complete: true, state: { place: "taxi", policeInfo: true, policeKnown: undefined } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // "¿Seguro?" answered with a yes, then the problem; "¿Compró algo?" answered with what, then where
    { name: "worried: sure, then the problem; bought bread", setup: (s) => { s.worried = true; s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Sí, gracias.", "Sí, estoy seguro.", "Bueno, la verdad perdí mi cartera.", "No sé.", "Sí, compré pan.", "En la panadería.", "¿Dónde paran los colectivos?", "No, ¿dónde está?", "Gracias."],
      expect: { complete: true, state: { place: "bakery", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // what's inside; will she let me know; the number goes to the police
    { name: "contents, her eye, the number", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = true; },
      turns: ["Perdí mi cartera.", "En el café.", "Es negra y tiene mis tarjetas y como quinientos pesos.", "Si la encuentra, ¿me avisa?", "¿Le dejo mi número?", "No, ¿dónde está?", "Gracias."],
      expect: { complete: true, state: { place: "cafe", color: "black", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "describe", "police", "closing"]) },
    // "¿Y las llaves también?" takes its yes before "¿Dónde la vio…?"; did she see anyone; the church; her name
    { name: "keys too; the church; her name", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Perdí mi cartera y mis llaves.", "Sí.", "¿Usted vio a alguien?", "En el café.", "No, ¿dónde está?", "¿Dónde está la iglesia?", "¿Cómo se llama usted?", "Gracias, Doña Mari."],
      expect: { complete: true, state: { keys: true, place: "cafe", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // "Está todo menos el dinero"; the ending is "¡Mucha suerte!", not "Ojalá la encuentre"; the roses' price after the loss
    { name: "twist: everything but the money; roses after", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "En el banco.", "Sí, es mía.", "Está todo menos el dinero.", "Sí, ya sé dónde está.", "¿Cuánto cuestan las rosas?", "Gracias."],
      expect: { complete: true, state: { found: "partial", checkedInside: true, policeKnown: true } }, auto: omit(AUTO, ["last_seen", "found", "all_there", "police", "closing"]) },
  ],
};

/** "¿Seguro? Parece que busca algo." (after "Sí, estoy bien" or "No" to "¿Le pasó algo?"): "Sí, seguro" gets "Bueno. Si
 *  necesita algo, aquí estoy."; a no ("No, la verdad no") gets "¿Qué le pasó?"; the problem itself goes on as usual. */
function reallyPending(): Pending {
  return {
    id: "really_ok", optional: true, expects: ["lost", "help_req", "not_lost", "sure_ctx"], hints: ["problem"],
    suggest: [{ lt: "Ask for help and say what you lost", hint: "problem", options: "item" }],
    yes: (cc) => { cc.say("if_need"); cc.hold(); },
    no: (cc) => { cc.say("ask_problem"); cc.hold(); },
    on: {
      lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
      help_req: (cc, sl, sg) => lostWallet.handlers.help_req(cc, sl, sg),
      not_lost: (cc, sl, sg) => lostWallet.handlers.not_lost(cc, sl, sg),
      sure_ctx: (cc, sl, sg) => lostWallet.handlers.sure_ctx(cc, sl, sg),
    },
  };
}

/** "¿Ya revisó bien sus bolsas?" A no gets "Revise otra vez" and waits once more ("Ya revisé, no está"); a second no
 *  moves on. */
function pocketsPending(again = false): Pending {
  const done = (cc: Ctx) => { cc.s.pocketsDone = true; cc.say("checked_ok"); };
  const notYet = (cc: Ctx) => {
    if (again) { cc.say("ok"); return; }
    cc.say("check_again"); cc.expect(pocketsPending(true));
  };
  return {
    id: "pockets", optional: true, expects: ["checked", "checked_ctx", "not_checked_ctx"], hints: ["pockets"],
    suggest: [{ lt: "Say whether you checked your pockets", hint: "pockets" }],
    yes: done, no: notYet,
    on: { checked: done, checked_ctx: done, not_checked_ctx: notYet },
  };
}

export default lostWallet;
