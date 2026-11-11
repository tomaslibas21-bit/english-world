// Song 32 "Unexpected Item" → Puerto Colibrí: "¿A cómo el kilo?"
// Doña Licha's fruit and vegetable stall in the Mercado Municipal (the English edition's supermarket checkout becomes a
// Mexican market stall: docs/es/STYLE.md, docs/es/reviews/s32-mercado.md). The model for numbers: prices by the kilo,
// by the piece and by the bunch, weights (un kilo, medio kilo, kilo y medio, un cuarto), pieces of what is sold by the
// kilo ("tres aguacates": Licha weighs them), buying "veinte pesos de limón", the total, cash and change. Mexican market
// talk: "¿Qué le damos, joven?", "¿Cuánto le doy?", "¿Para hoy o para mañana?" (how ripe), the pilón (a little extra
// for free). Lines with a Mexican-only word ("jitomate", "pilón", "nomás", "ahorita") have a neutral twin.

import type { Ctx, EntityDef, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// The stall. price: cents of a peso per unit; unit: kg (sold by weight), pza (by the piece), manojo (by the bunch);
// pc: about what one piece weighs, in grams (for "tres aguacates", "un kilo de mangos"). The kilo prices are multiples
// of $20, so a quarter kilo is a whole five pesos and every total is a multiple of $5 (the values the totals are voiced
// with: `domains.price`).

const P = (id: string, es: string, en: string, g: "m" | "f", unit: "kg" | "pza" | "manojo", price: number, pc: number,
  extra: { pl?: string; ltPl?: string; forms?: string[]; ripe?: boolean; nat?: string; natPl?: string; chip?: string; neutral?: string; art?: "" } = {}) =>
  ent(id, es, en, g, { pl: extra.pl, ltPl: extra.ltPl, forms: extra.forms, chip: extra.chip, art: extra.art,
    attrs: { unit, price, pc, ripe: !!extra.ripe, nat: extra.nat, natPl: extra.natPl, neutral: extra.neutral } });

export const PRODUCTS: EntityDef[] = [
  P("aguacate", "aguacate", "avocado", "m", "kg", 6000, 250, { pl: "aguacates", ltPl: "avocados", forms: ["aguacates", "aguacatito", "palta", "paltas"], ripe: true }),
  // Mexican "jitomate" (a red tomato; "tomate" is the green tomatillo there): understood as "tomate" too
  P("jitomate", "jitomate", "tomato", "m", "kg", 4000, 150, { pl: "jitomates", ltPl: "tomatoes", forms: ["jitomates", "tomate", "tomates", "tomate rojo", "tomates rojos"], neutral: "tomate" }),
  P("limon", "limón", "lime", "m", "kg", 4000, 50, { pl: "limones", ltPl: "limes", forms: ["limones", "limoncito", "limon verde", "lima", "limas"] }),
  P("platano", "plátano", "banana", "m", "kg", 2000, 150, { pl: "plátanos", ltPl: "bananas", forms: ["platanos", "banana", "bananas", "banano", "bananos"] }),
  P("mango", "mango", "mango", "m", "pza", 1500, 350, { pl: "mangos", ltPl: "mangoes", forms: ["mangos", "manguito"], ripe: true }),
  P("papaya", "papaya", "papaya", "f", "kg", 4000, 1500, { pl: "papayas", forms: ["papayas"], ripe: true }),
  P("pina", "piña", "pineapple", "f", "pza", 4000, 1500, { pl: "piñas", ltPl: "pineapples", forms: ["pinas", "pina", "anana"] }),
  P("cebolla", "cebolla", "onion", "f", "kg", 4000, 250, { pl: "cebollas", ltPl: "onions", forms: ["cebollas", "cebolla blanca"] }),
  P("papa", "papa", "potato", "f", "kg", 4000, 200, { pl: "papas", ltPl: "potatoes", forms: ["papas", "patata", "patatas"] }),
  P("naranja", "naranja", "orange", "f", "kg", 2000, 250, { pl: "naranjas", ltPl: "oranges", forms: ["naranjas", "naranja para jugo", "naranjas para jugo"] }),
  P("habanero", "chile | habanero", "chili | habanero", "m", "kg", 8000, 10, { pl: "chiles | habaneros", ltPl: "chilis | habanero", forms: ["habanero", "habaneros", "chile habanero", "chiles habaneros", "chile", "chiles"], nat: "habanero peppers", natPl: "habanero peppers" }),
  // a mass noun: "un manojo de cilantro", "sin cilantro", "veinte pesos de cilantro" (never "cilantros")
  P("cilantro", "cilantro", "cilantro", "m", "manojo", 1000, 0, { pl: "cilantro", ltPl: "cilantro", art: "", forms: ["un manojo de cilantro", "cilantrito"] }),
];

const byId = (id: string) => PRODUCTS.find((e) => e.id === id)!;
const unitOf = (id: string) => byId(id).attrs!.unit as "kg" | "pza" | "manojo";
const priceOf = (id: string) => byId(id).attrs!.price as number;
const pieceG = (id: string) => (byId(id).attrs!.pc as number) || 200;
const ripens = (id: string) => !!byId(id).attrs?.ripe;

// ---------------------------------------------------------------------------
// The bag of things bought

interface Buy {
  id: string;
  /** grams (by weight), pieces or bunches; null until said */
  qty: number | null;
  /** pieces of something sold by weight ("tres aguacates"): Licha weighs them (qty holds their grams) */
  pcs?: number;
  /** "20 pesos of limes": an amount of money instead of a weight */
  money?: number;
  ripe?: "today" | "later" | "mix";
}
const buys = (c: Ctx) => c.s.buys as Buy[];
const cost = (b: Buy) => {
  if (b.money) return b.money;
  if (b.qty == null) return 0;
  if (unitOf(b.id) !== "kg") return priceOf(b.id) * b.qty;
  const exact = (priceOf(b.id) * b.qty) / 1000;
  // pieces are weighed and rounded to five pesos (at least five), as Licha does; a weight's price is exact
  return b.pcs ? Math.max(500, Math.round(exact / 500) * 500) : Math.round(exact / 50) * 50;
};
const total = (c: Ctx) => buys(c).reduce((a, b) => a + cost(b), 0);
const pending = (c: Ctx) => buys(c).find((b) => b.qty == null && !b.money);
/** One piece of something (a papaya, a mango): "¿La quiere…?", "se la escojo". */
const single = (b: Buy) => (b.pcs ?? (unitOf(b.id) === "pza" ? b.qty : 0)) === 1;

/** Grams from the weight tags of an amount ("medio kilo" → #g500), or from "dos kilos" ({kilos}): `v` holds both, as
 *  the `item` slot does (or { __tags: seg.tags, kilos } for an answer to "¿Cuánto le doy?"). */
function grams(v: any): number | null {
  const tags: string[] = v?.__tags || [];
  const g = tags.find((x) => /^g\d+$/.test(x));
  if (g) return parseInt(g.slice(1), 10);
  if (typeof v?.kilos === "number") return v.kilos * 1000 + (tags.includes("half") ? 500 : 0);
  return null;
}

/** An amount as said: money ("veinte pesos"), a weight ("medio kilo"), a count ("tres") or "un / una". */
interface Amount { money?: number; g?: number | null; count?: number; one?: boolean }

/** Sets a bought thing's amount; false if nothing usable was said. A count of something sold by weight is pieces (Licha
 *  weighs them), a weight of something sold by the piece is the pieces it makes ("un kilo de mangos": three). */
function setAmount(b: Buy, a: Amount): boolean {
  const u = unitOf(b.id);
  if (typeof a.money === "number" && a.money > 0) { b.money = a.money; b.qty = null; b.pcs = undefined; return true; }
  if (a.g != null && a.g > 0) {
    b.money = undefined; b.pcs = undefined;
    b.qty = u === "kg" ? a.g : u === "pza" ? Math.max(1, Math.round(a.g / pieceG(b.id))) : Math.max(1, Math.round(a.g / 1000));
    return true;
  }
  const n = typeof a.count === "number" ? a.count : a.one ? 1 : null;
  if (n == null || n < 1) return false;
  b.money = undefined;
  if (u === "kg") { b.pcs = n; b.qty = n * pieceG(b.id); } else { b.pcs = undefined; b.qty = n; }
  return true;
}

const ripeTag = (tags: string[]): Buy["ripe"] => (tags.includes("mix") ? "mix" : tags.includes("later") ? "later" : tags.includes("today") ? "today" : undefined);

/** One bought thing from an `item` slot. */
function fromItem(v: any): Buy | null {
  if (!v?.product) return null;
  const tags: string[] = v.__tags || [];
  const b: Buy = { id: v.product as string, qty: null };
  setAmount(b, { money: v.money, g: grams(v), count: v.count, one: tags.includes("one") });
  const r = ripeTag(tags);
  if (r) b.ripe = r;
  return b;
}
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** Into the bag; the same thing said again takes its new amount ("Mejor medio kilo de jitomate"). */
function addBuy(c: Ctx, b: Buy): Buy {
  const prev = buys(c).find((x) => x.id === b.id);
  if (!prev) { buys(c).push(b); return b; }
  if (b.qty != null || b.money) { prev.qty = b.qty; prev.pcs = b.pcs; prev.money = b.money; }
  if (b.ripe) prev.ripe = b.ripe;
  return prev;
}

/** "Medio kilo de aguacates…" as Licha says it back while she weighs. */
function amountSay(b: Buy): { line: string; vars: Record<string, any> } {
  if (b.money) return { line: "got_money", vars: { X: { id: b.id, qty: 2 }, price: b.money } };
  const u = unitOf(b.id);
  if (u === "manojo") return (b.qty ?? 1) > 1 ? { line: "got_bunches", vars: { X: { id: b.id, qty: 1 }, num: b.qty } } : { line: "got_bunch", vars: { X: { id: b.id, qty: 1 } } };
  if (u === "pza" || b.pcs) return { line: "got_pieces", vars: { X: { id: b.id, qty: b.pcs ?? b.qty ?? 1 } } };
  const g = b.qty ?? 1000, X = { id: b.id, qty: 2 };
  if (g === 250) return { line: "got_quarter", vars: { X } };
  if (g === 500) return { line: "got_half", vars: { X } };
  if (g === 750) return { line: "got_3q", vars: { X } };
  if (g === 1000) return { line: "got_kilo", vars: { X } };
  if (g === 1500) return { line: "got_kilo_half", vars: { X } };
  if (g % 1000 === 500) return { line: "got_kilos_half", vars: { X, num: Math.floor(g / 1000) } };
  return { line: "got_kilos", vars: { X, num: Math.max(2, Math.round(g / 1000)) } };
}

const MERCADO_AUTO: Record<string, string> = {
  order: "Un kilo de jitomate, por favor", qty: "Un kilo", ripe: "Para hoy", more: "Es todo", bag: "Sí, traigo bolsa",
  pay: "Aquí tiene", bill: "No, perdón, solo tengo de quinientos", pilon: "¡Muchas gracias!",
};

// ---------------------------------------------------------------------------

export const mercado: SituationDef = {
  id: "s32-mercado",
  song: 32,
  songTitle: "Unexpected Item",
  title: { en: "¿A cómo el kilo?", lt: "How much a kilo?" },
  topic: { en: "En el mercado", lt: "At the market" },
  chapter: 2,
  order: 5,
  location: "market",
  npc: "marcus",
  goal: "Buy fruit and vegetables for the week: ask the price, say how much you want (by the kilo or by the piece), and pay.",
  intro: "The Mercado Municipal is a covered market hall off the zócalo. Doña Licha has sold fruit and vegetables here for thirty years. Prices are per kilo (el kilo) or per piece (la pieza); most people pay in cash.",
  entities: { product: PRODUCTS },

  grammar: {
    macros: {
      order_prefix: [
        "me da #h:me_da", "deme #h:deme", "me pone", "pongame", "me despacha", "me vende", "vendame", "me puede dar #h:me_da", "me regala",
        "quiero #h:quiero", "quisiera #h:quisiera", "voy a llevar #h:llevo", "me llevo #h:llevo", "llevo #h:llevo", "voy a querer",
        "me das #tip:tu_staff", "dame #tip:tu_staff", "necesito", "tambien (me da | quiero | quisiera)", "y (tambien)? (me da | deme)",
      ],
      // a weight: tagged in grams
      amount: "(un kilo #g1000 | kilo #g1000 | el kilo #g1000 | medio kilo #g500 | medio #g500 | un cuarto [de kilo] #g250 | cuarto de kilo #g250 | kilo y medio #g1500 | un kilo y medio #g1500 | {kilos:number} kilos [y medio #half] | como un kilo #g1000 | como medio kilo #g500 | tres cuartos [de kilo] #g750)",
      // how ripe: for today, for later, or some of each
      ripe: "((para hoy | para comer hoy | para hoy mismo | para ahorita | para (hacer)? guacamole [hoy] | maduros | maduras | bien maduros | bien maduras | maduritos | maduritas | que esten maduros | que esten maduras) #today | (para manana | para comer manana | para pasado manana | para el fin de semana | para el (sabado | domingo | lunes | martes | miercoles | jueves | viernes) | para unos dias | para la semana | para toda la semana | que aguanten unos dias | no tan maduros | no tan maduras | no muy maduros | no muy maduras | verdes | verdecitos | verdecitas | firmes) #later | ((unos | unas) para hoy y (otros | otras) para (manana | el fin de semana | despues) | mitad y mitad | la mitad para hoy y la mitad para manana) #mix)",
    },
    slots: {
      // "un kilo de aguacate", "medio de jitomate", "tres aguacates", "una piña", "veinte pesos de limón", "un manojo de cilantro"
      item: { pattern: [
        "@amount de {product} [@ripe]",
        "{count:number} {product} [@ripe]",
        "(un | una) #one {product} [@ripe]",
        "{money:price} de {product}",
        "un manojo de {product} #one",
        "[unos | unas | algunos | algunas] {product} [@ripe]",
        "(el | la | los | las) {product} [@ripe]",
      ] },
      items: { pattern: "{item} [(y | y tambien | y un | y una | tambien) {item}] [(y | tambien) {item}]" },
    },
  },

  intents: {
    order: { patterns: ["@order_prefix {items}", "{items}", "@order_prefix @amount de {product} y @amount de {product}", "mejor [@order_prefix] {items}"] },
    // "¿Cuánto le doy?" – "Un kilo." / "Medio." / "Tres." / "Veinte pesos." / "Como un kilo."
    qty_ctx: { patterns: ["@amount #h:qty_kilo", "{count:number} [por favor] #h:qty_pcs", "{count:number} nada mas #h:qty_pcs", "(solo | nomas | nada mas) {count:number}",
      "(un | una) #one", "(uno | una) nada mas #one", "{money:price} [nada mas] #h:qty_money", "@order_prefix @amount", "@order_prefix {count:number}",
      "(como | unos | unas) {count:number}", "@amount (esta bien | nada mas)", "{count:number} manojos", "(entonces | bueno | ok) @amount"] },
    // an amount without a product, anywhere: "Deme medio kilo", "Me llevo uno", "Mejor dos kilos" (for the thing being
    // weighed, the one just priced or recommended, or the last one bought)
    order_amount: { patterns: ["[mejor] @order_prefix @amount", "[mejor] @order_prefix {count:number}", "[mejor] @order_prefix (uno | una) #one",
      "mejor [solo | nomas | nada mas] @amount", "mejor [solo | nomas | nada mas] {count:number}", "mejor (solo | nomas | nada mas)? (uno | una) #one"] },
    ripe_ans: { patterns: ["@ripe #h:ripe", "(los | las) quiero @ripe", "(mejor)? @ripe", "son @ripe"] },
    // "Me da igual": at "¿Los quiere para hoy o para mañana?" Licha picks them; elsewhere just "Muy bien."
    ripe_any: { patterns: ["(me da | da) igual", "no importa", "como sea", "como (usted | tu) (quiera | quieras | diga | digas)", "lo que usted (diga | quiera)",
      "(usted | tu) (escoja | escoge | elija | elige | decida | decide)", "(los | las) que sean", "cualquiera", "como (los | las) tenga", "como vengan"] },
    ask_price: { patterns: [
      "a como (esta | estan | sale | salen) [el | la | los | las] {product} #h:q_a_como", "cuanto (cuesta | cuestan | vale | valen | esta | estan) [el | la | los | las] {product} #h:q_cuanto",
      "a como el kilo [de {product}] #h:q_a_como", "a como (esta | sale) el kilo [de {product}]", "cuanto (cuesta | esta) el kilo [de {product}]", "a como (la pieza | cada uno | cada una)", "cuanto (cuesta | es) (la pieza | cada uno | cada una)",
      "y [el | la | los | las] {product} (a como | cuanto)", "[y] a como [el | la | los | las] {product}",
      "cuanto (cuesta | vale | sale | es) cada {product}", "a como (sale | esta)? cada {product}", "cuanto (cuesta | cuestan | vale) (un | una) {product}",
      "a cuanto (esta | estan | sale | salen) [el kilo de] [el | la | los | las] {product}", "a cuanto el kilo [de {product}]",
      "en cuanto (esta | estan | sale | salen) [el kilo de] [el | la | los | las] {product}", "que precio (tiene | tienen) [el kilo de] [el | la | los | las] {product}",
      // "¿Cuánto es medio kilo?", "¿Cuánto cuestan tres mangos?": a question, never an order
      "cuanto (es | sale | cuesta | seria | son | cuestan | salen) @amount [de {product}]", "cuanto (es | son | cuestan | salen | serian) {count:number} [{product}]",
    ] },
    // "¿Y el jitomate?" right after a price: that one's price
    price_next_ctx: { patterns: ["y [el | la | los | las] {product}", "y (de | del) {product}"] },
    // "¿De cuál?" – "Del aguacate."
    which_ctx: { patterns: ["[de | del | el | la | los | las] {product} [por favor]", "(de la | de los | de las) {product}"] },
    ask_total: { patterns: ["cuanto (es | seria | le debo | va a ser) [todo]", "cuanto (es | son) en total", "cuanto le debo", "cuanto le doy", "cuanto llevo", "cuanto (va | van) [hasta ahorita | hasta ahora]"] },
    more_no: { patterns: ["(es | seria | eso es | eso seria | ya es) todo #h:more_all", "nada mas #h:more_nothing", "(con eso | ya con eso) [es todo]", "(solo | nomas) eso", "es todo por hoy", "ya no gracias", "no gracias es todo",
      "no (necesito | quiero | ocupo) nada mas", "ya estuvo", "(con eso | ya con eso) (es suficiente | basta)"] },
    more_yes: { patterns: ["(si | ah si) (algo mas | otra cosa)", "otra cosa", "algo mas"] },
    bag_yes: { patterns: ["[si] (traigo | tengo) [mi | una] bolsa #h:bag_yes", "[si] aqui (traigo | tengo) [mi bolsa]", "[si] traigo", "[si] [aqui] (traigo | tengo) (una | la mia | mi propia bolsa)", "(traigo | tengo) la mia"] },
    // handing the bag over at "¿Trae bolsa?" (elsewhere "Aquí tiene" pays)
    bag_yes_ctx: { patterns: ["(aqui tiene | aqui esta | tome | tenga) [mi bolsa | la bolsa]", "aqui esta mi bolsa"] },
    bag_no: { patterns: ["no (traigo | tengo) [bolsa]", "me (da | vende | regala) una (bolsa | bolsita) #h:bag_no", "(una | la) (bolsa | bolsita) [por favor]", "(deme | me da) una (bolsa | bolsita)"] },
    // "¿Me da una?" at "¿Trae bolsa?": a bag
    bag_no_ctx: { patterns: ["[no] me (da | vende | regala) una", "[no] (deme | me puede dar) una"] },
    // "No necesito bolsa": no bag at all (a bare "no" gets one)
    bag_none_ctx: { patterns: ["no (necesito | ocupo | quiero) [una] (bolsa | bolsita)", "no hace falta [la bolsa]", "asi esta bien", "asi (me lo llevo | me los llevo | me las llevo)", "no se preocupe",
      "no gracias asi esta bien", "no (necesito | ocupo) bolsa gracias", "no es necesario"] },
    pay_cash: { patterns: ["aqui tiene #h:here_you_go", "tenga", "tome", "aqui esta", "aqui le pago", "le pago", "(le pago | pago) en efectivo", "en efectivo", "aqui esta el dinero"] },
    // "Tengo de quinientos" / "¿Tiene cambio de quinientos?" / "Le doy cien": the bill handed over
    big_bill: { patterns: ["(tengo | traigo) (un billete)? de {bill:price} #h:big_bill", "(solo | nomas) (tengo | traigo) (billete)? de {bill:price}", "(tiene | trae) cambio de {bill:price} #h:q_change",
      "(le pago | pago) con (uno | un billete) de {bill:price}", "aqui tiene (uno | un billete)? de {bill:price}", "(le doy | aqui le doy | tome) {bill:price}",
      "(le doy | aqui le doy | tome) (uno | un billete) de {bill:price}", "(tenga | tome) [uno | un billete] de {bill:price}", "(tiene | trae) cambio"] },
    // "Quédese con el cambio": no change to give
    keep_change: { patterns: ["[aqui tiene | tenga | tome] (quedese | quede) con (el cambio | lo que sobra)", "no me de cambio", "(quedate | quedese) con el cambio #tip:tu_staff"] },
    // "¿Me da un recibo?": a market stall gives none
    ask_receipt: { patterns: ["(me da | deme | me puede dar | me regala) (un | el)? (recibo | ticket | comprobante | nota | factura)", "(tiene | da | dan) (recibo | ticket | nota | factura)", "(un | el) (recibo | ticket) [por favor]"] },
    no_smaller: { patterns: ["no (tengo | traigo) (mas chico | mas pequeno | cambio | otro)", "(solo | nomas) (tengo | traigo) ese", "no perdon solo (tengo | traigo) de {bill:price}"] },
    pay_card: { patterns: ["(acepta | aceptan) tarjeta #h:q_card", "puedo pagar con tarjeta", "con tarjeta", "le pago con tarjeta"] },
    pay_transfer: { patterns: ["(le puedo hacer | puedo hacer | acepta | aceptan) (una)? transferencia", "por transferencia", "(se puede | puedo | le puedo) pagar (con | por) transferencia",
      "(le puedo | puedo) transferir", "le transfiero", "con transferencia", "(se la | le) hago (la | una)? transferencia"] },
    // "Sí, se la hago" while she waits for a transfer
    transfer_yes_ctx: { patterns: ["[si] (se la | se lo | le) (hago | mando | paso)", "[si] ahorita (se la | le) (hago | mando)"] },
    pay_dollars: { patterns: ["(acepta | aceptan | toma | toman | recibe | reciben) dolares", "(puedo | le puedo | se puede) pagar (con | en) dolares", "(le pago | pago) (con | en) dolares"] },
    no_cash: { patterns: ["no (traigo | tengo) (efectivo | dinero | nada de efectivo)", "(solo | nomas | nada mas) (traigo | tengo) tarjeta"] },
    haggle: { patterns: ["(me lo | me la | me los | me las) deja en {price}", "(me hace | hay) (un)? descuento", "(me lo | me la | lo | la) (deja | da) mas barato", "esta caro",
      "que (caro | cara | caros | caras)", "(esta | estan) muy (caro | cara | caros | caras)", "(estan | esta) (caros | caras | cara)"] },
    reject: { patterns: ["[mejor] no (quiero | voy a llevar) [el | la | los | las] {product}", "no {product}", "(quite | quiteme | olvide) [el | la | los | las] {product}", "[mejor] ya no (lo | la | los | las) quiero",
      "sin [el | la | los | las] {product}", "[mejor] ya no (quiero | voy a llevar) [el | la | los | las] {product}"] },
    product_unknown: { patterns: ["(tiene | hay | vende) {w:any}", "@order_prefix {w:any}"] },
    ask_have: { patterns: ["(tiene | hay | vende) {product} #h:q_have", "(tiene | hay) {product} (maduros | maduras | para hoy)"] },
    ask_recommend: { patterns: ["que me recomienda", "que (esta | estan) (bueno | buena | buenos | buenas | rico | ricos) hoy", "que (fruta | verdura) (esta | es) de temporada"] },
    // "¿Qué tiene?": what the stall sells
    ask_what: { patterns: ["que (tiene | hay | vende) [hoy]", "que (frutas | verduras | fruta | verdura | cosas) (tiene | hay | vende)"] },
    // "¿Están maduros los aguacates?"
    // ("frescas" / "fresca" left out: one slip from "fresas", which she doesn't sell)
    ask_quality: { patterns: ["(estan | son) (frescos | maduros | maduras | buenos | buenas | dulces) [los | las] [{product}]", "[los | las] {product} (estan | son) (frescos | maduros | maduras | buenos | buenas | dulces)",
      "(esta | es) (fresco | maduro | madura | bueno | buena | dulce) [el | la] [{product}]", "[el | la] {product} (esta | es) (fresco | maduro | madura | bueno | buena | dulce)", "son de aqui"] },
  },

  lines: {
    greet: [
      t("¡Pásele, | {m:joven|f:joven}! | ¿Qué | le | damos?", "Come in, | {m:young man|f:young lady}! | What | (to) you | we-give?", "Come on in! What can I get you?",
        { flags: { 0: "Mexican markets: “pásele” = come on in, have a look." },
          neutral: t("¡Adelante, | {m:joven|f:joven}! | ¿Qué | le | damos?", "Come in, | {m:young man|f:young lady}! | What | (to) you | we-give?", "Come on in! What can I get you?") }),
      t("¡Buenos días! | ¿Qué | se | le | ofrece?", "Good morning! | What | (itself) | (to) you | offers?", "Good morning! What can I do for you?",
        { flags: { 2: "se le ofrece: “is offered to you” – a set, polite shop question." } }),
      t("¡Buenas, | {m:marchante|f:marchanta}! | ¿Qué | va | a | llevar?", "Hi, | customer! | What | are you going | to | take?", "Hi there! What are you getting today?",
        { flags: { 1: "Mexican markets: marchante / marchanta = a regular customer, said warmly." },
          neutral: t("¡Buenas, | {m:joven|f:joven}! | ¿Qué | va | a | llevar?", "Hi, | {m:young man|f:young lady}! | What | are you going | to | take?", "Hi there! What are you getting today?") }),
    ],
    greet_howareyou: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?"),
    ],
    ask_order: [
      t("¿Qué | le | damos?", "What | (to) you | we-give?", "What can I get you?"),
      t("¿Qué | va | a | llevar?", "What | are you going | to | take?", "What are you getting?"),
    ],
    ask_qty: [
      t("¿Cuánto | le | doy?", "How much | (to) you | I-give?", "How much would you like?"),
      t("¿Cuánto | le | pongo?", "How much | (for) you | I-put?", "How much should I put in?"),
    ],
    // things sold by the piece: "¿Cuántos le doy?" (mangos), "¿Cuántas le doy?" (piñas)
    ask_qty_pcs: [
      t("¿{cuánto@X:pl} | le | doy?", "How many | (to) you | I-give?", "How many would you like?"),
      t("¿{cuánto@X:pl} | le | pongo?", "How many | (for) you | I-put?", "How many should I put in?"),
    ],
    ask_qty_kg: [
      t("¿Cuánto | le | doy? | ¿Un | kilo, | medio | kilo?", "How much | (to) you | I-give? | A | kilo, | half | kilo?", "How much would you like? A kilo, half a kilo?"),
    ],
    ask_ripe: [
      t("¿{lo@X:pl} | quiere | para | hoy | o | para | mañana?", "Them | you-want | for | today | or | for | tomorrow?", "Do you want them ripe for today, or for tomorrow?",
        { flags: { 0: "Market question: how ripe? For today = ripe now; for tomorrow = still firm." } }),
    ],
    // one piece: "Una papaya… ¿La quiere para hoy o para mañana?"
    ask_ripe_one: [
      t("¿{lo@X} | quiere | para | hoy | o | para | mañana?", "It | you-want | for | today | or | for | tomorrow?", "Do you want it ripe for today, or for tomorrow?",
        { flags: { 0: "Market question: how ripe? For today = ripe now; for tomorrow = still firm." } }),
    ],
    ack_ripe: [t("Muy | bien.", "Very | good.", "Okay."), t("Ahorita | se | {lo@X:pl} | escojo.", "Right now | for you | them | I-pick.", "I'll pick them out for you.",
      { flags: { 0: "Mexican: ahorita = right now, in a moment.", 2: "los / las: “them” (a pronoun here, not the article)." },
        neutral: t("Ya | se | {lo@X:pl} | escojo.", "Now | for you | them | I-pick.", "I'll pick them out for you.", { flags: { 2: "los / las: “them” (a pronoun here, not the article)." } }) })],
    ack_ripe_one: [t("Muy | bien.", "Very | good.", "Okay."), t("Ahorita | se | {lo@X} | escojo.", "Right now | for you | it | I-pick.", "I'll pick a good one for you.",
      { flags: { 0: "Mexican: ahorita = right now, in a moment.", 2: "lo / la: “it” (a pronoun here, not the article)." },
        neutral: t("Ya | se | {lo@X} | escojo.", "Now | for you | it | I-pick.", "I'll pick a good one for you.", { flags: { 2: "lo / la: “it” (a pronoun here, not the article)." } }) })],
    // what Licha says as she weighs (X = the product, in the plural)
    got_kilo: [t("Un | kilo | de | {X.pl}...", "A | kilo | of | {X.pl}...", "A kilo of {X.pl}…")],
    got_half: [t("Medio | kilo | de | {X.pl}...", "Half | kilo | of | {X.pl}...", "Half a kilo of {X.pl}…")],
    got_quarter: [t("Un | cuarto | de | {X.pl}...", "A | quarter | of | {X.pl}...", "A quarter kilo of {X.pl}…")],
    got_3q: [t("Tres | cuartos | de | {X.pl}...", "Three | quarters | of | {X.pl}...", "Three quarters of a kilo of {X.pl}…")],
    got_kilo_half: [t("Kilo | y | medio | de | {X.pl}...", "Kilo | and | half | of | {X.pl}...", "A kilo and a half of {X.pl}…")],
    got_kilos: [t("{$num} | kilos | de | {X.pl}...", "{$num} | kilos | of | {X.pl}...", "{$num} kilos of {X.pl}…")],
    got_kilos_half: [t("{$num} | kilos | y | medio | de | {X.pl}...", "{$num} | kilos | and | half | of | {X.pl}...", "{$num} and a half kilos of {X.pl}…")],
    got_pieces: [t("{X.np}...", "{X.np}...", "{X.np}…")],
    got_bunch: [t("Un | manojo | de | {X}...", "A | bunch | of | {X}...", "A bunch of {X}…")],
    got_bunches: [t("{$num} | manojos | de | {X}...", "{$num} | bunches | of | {X}...", "{$num} bunches of {X}…")],
    got_money: [t("{$price} | de | {X.pl}...", "{$price} | of | {X.pl}...", "{$price}' worth of {X.pl}…")],
    price_kg_pl: [
      t("{X.the} | están | a | {$price} | el | kilo.", "{X.the} | are | at | {$price} | the | kilo.", "{X.the} are {$price} a kilo."),
    ],
    price_piece: [
      t("{X.the} | a | {$price} | cada una.", "{X.the} | at | {$price} | each.", "{X.the} are {$price} each."),
    ],
    price_piece_m: [
      t("{X.the} | a | {$price} | cada uno.", "{X.the} | at | {$price} | each.", "{X.the} are {$price} each."),
    ],
    price_bunch: [
      t("El | manojo, | a | {$price}.", "The | bunch, | at | {$price}.", "{$price} a bunch."),
    ],
    which_product: [t("¿De | cuál?", "Of | which one?", "Which one?")],
    ask_more: [
      t("¿Qué | más | le | damos?", "What | else | (to) you | we-give?", "What else can I get you?"),
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Qué | más | va | a | llevar?", "What | else | are you going | to | take?", "What else are you getting?"),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Ándale.", "Okay then.", "Okay!", { flags: { 0: "Mexican: ándale = okay, there you go." }, neutral: t("Muy | bien.", "Very | good.", "Okay.") })],
    have_yes: [t("¡Sí, | claro! | Están | muy | {bueno@X:pl}.", "Yes, | sure! | They're | very | good.", "Yes, of course! They're very good today.")],
    // cilantro, sold by the bunch
    have_yes_sg: [t("¡Sí, | claro! | Está | muy | fresco.", "Yes, | sure! | It's | very | fresh.", "Yes, of course! It's nice and fresh.")],
    // "¿Qué tiene?"
    stock: [t("Hay | de | todo: | aguacate, | jitomate, | limón, | mango, | papaya, | piña...", "There is | of | everything: | avocado, | tomato, | lime, | mango, | papaya, | pineapple...",
      "I've got a bit of everything: avocados, tomatoes, limes, mangoes, papayas, pineapples…",
      { flags: { 4: "Mexican: jitomate = a (red) tomato; neutral Spanish says tomate." },
        neutral: t("Hay | de | todo: | aguacate, | tomate, | limón, | mango, | papaya, | piña...", "There is | of | everything: | avocado, | tomato, | lime, | mango, | papaya, | pineapple...",
          "I've got a bit of everything: avocados, tomatoes, limes, mangoes, papayas, pineapples…") })],
    recommend_mango: [t("Los | mangos | están | buenísimos | hoy.", "The | mangoes | are | really good | today.", "The mangoes are wonderful today.")],
    recommend_papaya: [t("Llévese | una | papaya, | está | dulcecita.", "Take | a | papaya, | it's | nice and sweet.", "Take a papaya, it's nice and sweet.", { flags: { 4: "-ita: a fond diminutive, “nice and sweet”." } })],
    removed: [t("Muy | bien, | sin | {X.pl}.", "Very | good, | without | {X.pl}.", "Okay, no {X.pl}.")],
    ask_bag: [
      t("¿Trae | bolsa?", "Do you bring | bag?", "Did you bring a bag?"),
      t("¿Trae | su | bolsa?", "Do you bring | your | bag?", "Have you got your bag?"),
    ],
    bag_ok: [t("Muy | bien, | aquí | se | lo | pongo.", "Very | good, | here | for you | it | I-put.", "Great, I'll put it in here.")],
    bag_give: [t("Aquí | le | pongo | una | bolsita.", "Here | (for) you | I-put | a | little bag.", "Here, I'll put it in a bag for you.")],
    say_total: [
      t("Son | {$price}.", "That's | {$price}.", "That's {$price}."),
      t("Serían | {$price}, | {m:joven|f:joven}.", "That would be | {$price}, | {m:young man|f:young lady}.", "That'll be {$price}."),
      t("Todo | junto | son | {$price}.", "All | together | are | {$price}.", "All together, that's {$price}."),
    ],
    sum_so_far: [t("Hasta | ahorita | van | {$price}.", "Until | now | they-go | {$price}.", "So far it's {$price}.",
      { flags: { 1: "Mexican: ahorita = (right) now; hasta ahorita = so far." }, neutral: t("Hasta | ahora | van | {$price}.", "Until | now | they-go | {$price}.", "So far it's {$price}.") })],
    // she takes cash or a bank transfer, not cards
    cash_only: [
      t("Tarjeta | no, | {m:joven|f:joven}. | Nomás | efectivo | o | transferencia.", "Card | no, | {m:young man|f:young lady}. | Only | cash | or | transfer.", "No cards, I'm afraid. Just cash or a bank transfer.",
        { flags: { 3: "Mexican: nomás = only, just." },
          neutral: t("Tarjeta | no, | {m:joven|f:joven}. | Solo | efectivo | o | transferencia.", "Card | no, | {m:young man|f:young lady}. | Only | cash | or | transfer.", "No cards, I'm afraid. Just cash or a bank transfer.") }),
    ],
    transfer_ok: [t("Sí, | también | por | transferencia.", "Yes, | also | by | transfer.", "Yes, a bank transfer is fine too.")],
    // "No traigo efectivo"
    transfer_offer: [t("Me | puede | pagar | por | transferencia, | si | quiere.", "(To) me | you-can | pay | by | transfer, | if | you-want.", "You can pay me by bank transfer, if you want.")],
    // "¿Acepta dólares?"
    dollars_no: [t("Dólares | no, | {m:joven|f:joven}. | Solo | pesos.", "Dollars | no, | {m:young man|f:young lady}. | Only | pesos.", "No dollars, I'm afraid. Pesos only.")],
    no_change: [
      t("¿No trae | más | chico?", "Don't you have | more | small?", "Don't you have a smaller bill?",
        { flags: { 2: "Mexican: más chico = a smaller bill." }, neutral: t("¿No tiene | un | billete | más | pequeño?", "Don't you have | a | bill | more | small?", "Don't you have a smaller bill?") }),
    ],
    change_ok: [t("Déjeme | ver... | sí, | aquí | está | su | cambio.", "Let me | see... | yes, | here | is | your | change.", "Let me see… yes, here's your change.")],
    change_back: [
      t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change."),
      t("Y | su | cambio.", "And | your | change.", "And your change."),
    ],
    paid_exact: [t("¡Exacto! | Gracias.", "Exact! | Thanks.", "Exactly right! Thank you.")],
    // "Quédese con el cambio"
    thanks_tip: [t("¡Ay, | muchas | gracias, | {m:joven|f:joven}!", "Oh, | many | thanks, | {m:young man|f:young lady}!", "Oh, thank you so much!")],
    // "¿Me da un recibo?"
    no_receipt: [t("Aquí | no doy | recibo, | {m:joven|f:joven}.", "Here | I don't give | receipt, | {m:young man|f:young lady}.", "I don't do receipts here, I'm afraid.")],
    haggle_no: [
      t("Ya | está | en | buen | precio, | pero | le | pongo | un | pilón.", "Already | it's | at | good | price, | but | (for) you | I-put | a | little extra.", "It's already a good price, but I'll throw in a little extra.",
        { flags: { 9: "Mexican: el pilón = a little extra the seller adds for free." },
          neutral: t("Ya | está | en | buen | precio, | pero | le | pongo | algo | de | regalo.", "Already | it's | at | good | price, | but | (for) you | I-put | something | as | a gift.", "It's already a good price, but I'll throw in a little extra.") }),
    ],
    // a second "¿Me hace descuento?"
    haggle_again: [t("Más | barato | no se puede, | {m:joven|f:joven}.", "More | cheap | it can't be done, | {m:young man|f:young lady}.", "I can't go any lower, I'm afraid.")],
    pilon: [
      t("Le | puse | un | pilón | de | cilantro.", "(For) you | I-put | a | little extra | of | cilantro.", "I put in some cilantro for you, on the house.",
        { flags: { 3: "Mexican: el pilón = a little extra the seller adds for free." },
          neutral: t("Le | puse | un | poco | de | cilantro | de | regalo.", "(For) you | I-put | a | little | of | cilantro | as | a gift.", "I put in some cilantro for you, on the house.") }),
    ],
    closing: [
      t("¡Gracias, | {m:joven|f:joven}! | ¡Vuelva | pronto!", "Thanks, | {m:young man|f:young lady}! | Come back | soon!", "Thank you! Come back soon!"),
      t("¡Que | le | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "All the best!"),
    ],
    unknown: [t("Mmm, | eso | no lo vendo | aquí.", "Hmm, | that | I don't sell it | here.", "Hmm, I don't sell that here.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      for (let c = 500; c <= 50000; c += 500) s.add(c);
      for (const p of PRODUCTS) s.add(p.attrs!.price as number);
      return [...s];
    },
    num: () => [2, 3, 4, 5],
  },

  hints: {
    order: {
      lt: "Ask for fruit or vegetables", slot: "product", examples: ["aguacate", "jitomate", "limon", "mango"],
      items: [
        { id: "me_da", s: t("¿Me | da | un | kilo | de | {X.pl}?", "(To) me | you-give | a | kilo | of | {X.pl}?", "Can I have a kilo of {X.pl}?"), only: (e) => e.attrs?.unit === "kg" },
        { id: "deme", s: t("Deme | medio | kilo | de | {X.pl}, | por favor.", "Give me | half | kilo | of | {X.pl}, | please.", "Half a kilo of {X.pl}, please."), only: (e) => e.attrs?.unit === "kg" },
        { id: "quiero", s: t("Quiero | tres | {X.pl}.", "I want | three | {X.pl}.", "I'd like three {X.pl}."), only: (e) => e.attrs?.unit === "pza" },
        { id: "llevo", s: t("Me llevo | {X.np}.", "I'll take | {X.np}.", "I'll take {X.np}."), only: (e) => e.attrs?.unit !== "kg" },
        { id: "quisiera", s: t("Quisiera | {X.pl}, | por favor.", "I'd like | {X.pl}, | please.", "I'd like some {X.pl}, please.") },
        { id: "money", s: t("Deme | veinte | pesos | de | {X}.", "Give me | twenty | pesos | of | {X}.", "Twenty pesos' worth of {X}, please."), only: (e) => e.attrs?.unit === "kg" },
      ],
    },
    ask_price: {
      lt: "Ask the price", slot: "product", examples: ["aguacate", "mango", "pina"],
      items: [
        { id: "q_a_como", s: t("¿A cómo | está | {X.the}?", "At how much | is | {X.the}?", "How much is {X.the}?"), note: "Market Spanish: “¿A cómo…?” = how much (per kilo)?" },
        { id: "q_cuanto", s: t("¿Cuánto | cuesta | el | kilo | de | {X}?", "How much | costs | the | kilo | of | {X}?", "How much is a kilo of {X}?"), only: (e) => e.attrs?.unit === "kg" },
        { id: "q_cuanto", s: t("¿Cuánto | cuesta | {X.the}?", "How much | costs | {X.the}?", "How much is {X.the}?"), only: (e) => e.attrs?.unit !== "kg" },
      ],
    },
    qty: {
      lt: "Say how much",
      items: [
        { id: "qty_kilo", s: t("Un | kilo, | por favor.", "A | kilo, | please.", "A kilo, please.") },
        { id: "qty_kilo", s: t("Medio | kilo.", "Half | kilo.", "Half a kilo.") },
        { id: "qty_kilo", s: t("Kilo | y | medio.", "Kilo | and | half.", "A kilo and a half.") },
        { id: "qty_kilo", s: t("Un | cuarto.", "A | quarter.", "A quarter kilo.") },
        { id: "qty_money", s: t("Veinte | pesos, | nada más.", "Twenty | pesos, | just that.", "Just twenty pesos' worth.") },
      ],
    },
    // things sold by the piece or the bunch
    qty_pcs: {
      lt: "Say how many",
      items: [
        { id: "qty_pcs", s: t("Tres, | por favor.", "Three, | please.", "Three, please.") },
        { id: "qty_pcs", s: t("Dos, | nada más.", "Two, | just that.", "Just two.") },
      ],
    },
    ripe: {
      lt: "Say how ripe",
      items: [
        { id: "ripe", s: t("Para | hoy, | por favor.", "For | today, | please.", "Ripe for today, please.") },
        { id: "ripe", s: t("Para | el | fin | de | semana.", "For | the | end | of | week.", "For the weekend.") },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [
        { id: "more_all", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.") },
        { id: "more_nothing", s: t("Nada más.", "That's all.", "Nothing else.") },
      ],
    },
    bag: {
      lt: "Your bag",
      items: [
        { id: "bag_yes", s: t("Sí, | traigo | bolsa.", "Yes, | I-bring | bag.", "Yes, I brought a bag.") },
        { id: "bag_no", s: t("¿Me | da | una | bolsa?", "(To) me | you-give | a | bag?", "Could I have a bag?") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "big_bill", s: t("Solo | tengo | de | quinientos.", "Only | I-have | of | five hundred.", "I've only got a 500.") },
        { id: "q_change", s: t("¿Tiene | cambio | de | quinientos?", "Do you have | change | of | five hundred?", "Do you have change for a 500?") },
        { id: "q_card", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a stallholder, usted is more polite: “¿Me da…?”, “Deme…” (me das / dame is for friends).", better: "¿Me da un kilo de aguacate?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "order", lt: "Ask for something" },
    { step: "qty", lt: "Say how much", optional: true },
    { step: "ripe", lt: "Ripe for today or later?", optional: true },
    { step: "more", lt: "Buy at least two things, then say that's all", done: (c) => !!c.s.moreDone },
    { step: "bag", lt: "Your bag", optional: true },
    { step: "pay", lt: "Pay" },
  ],
  steps: [
    { id: "order", done: (c) => buys(c).length > 0, ask: (c) => c.say("ask_order"), expects: ["order", "ask_price", "reject", "ask_have", "ask_quality"],
      suggest: [
        { lt: "Ask for fruit or vegetables", hint: "order", options: "product" },
        { lt: "Ask the price first", hint: "ask_price", options: "product" },
      ],
      help: (c) => { recommend(c); c.say("ask_order"); } },
    { id: "qty", when: (c) => !!pending(c), done: () => false,
      ask: (c) => { const id = pending(c)!.id, u = unitOf(id); c.say(u === "kg" ? "ask_qty_kg" : u === "pza" ? "ask_qty_pcs" : "ask_qty", { X: { id, qty: 2 } }); },
      expects: ["qty_ctx", "order", "ask_price"],
      suggest: (c) => [{ lt: unitOf(pending(c)?.id ?? "aguacate") === "kg" ? "Say how much" : "Say how many", hint: unitOf(pending(c)?.id ?? "aguacate") === "kg" ? "qty" : "qty_pcs" },
        { lt: "Ask the price", hint: "ask_price", options: "product" }] },
    { id: "ripe", when: (c) => buys(c).some((b) => ripens(b.id) && !b.ripe && b.qty != null) && !c.s.ripeAsked, done: () => false,
      ask: (c) => {
        c.s.ripeAsked = true;
        const b = buys(c).find((x) => ripens(x.id) && !x.ripe && x.qty != null)!;
        c.say(single(b) ? "ask_ripe_one" : "ask_ripe", { X: { id: b.id, qty: single(b) ? 1 : 2 } });
      },
      expects: ["ripe_ans", "ripe_any"], suggest: [{ lt: "Say how ripe", hint: "ripe" }] },
    { id: "more", when: (c) => buys(c).length > 0 && !pending(c), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "order", "more_yes", "ask_price", "ask_have", "ask_quality"],
      suggest: (c) => buys(c).length < 2
        ? [{ lt: "Buy something else", hint: "order", options: "product" }, { lt: "Say that's all", hint: "more" }]
        : [{ lt: "Say that's all", hint: "more" }, { lt: "Buy something else", hint: "order", options: "product" }],
      yes: (c) => { c.say("ask_order"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    { id: "bag", when: (c) => !!c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => c.say("ask_bag"), expects: ["bag_yes", "bag_no", "bag_yes_ctx", "bag_no_ctx", "bag_none_ctx"], suggest: [{ lt: "Say whether you have a bag", hint: "bag" }],
      yes: (c) => { c.s.bag = "own"; c.say("bag_ok"); },
      no: (c) => { c.s.bag = "theirs"; c.say("bag_give"); } },
    { id: "pay", done: (c) => !!c.s.paid,
      ask: (c) => { c.s.totalSaid = true; c.say("say_total", { price: total(c) }); },
      expects: ["pay_cash", "big_bill", "pay_card", "pay_transfer", "ask_total", "no_cash", "pay_dollars", "keep_change"],
      suggest: [{ lt: "Pay", hint: "pay" }] },
  ],

  init: (c) => {
    c.s.buys = [];
    c.s.askBag = c.chance(0.6);
    c.s.bigBill = c.chance(0.35);
    c.s.pilon = c.visits >= 1 && c.chance(0.5);
  },

  start: (c) => {
    if (c.chance(0.3)) { c.say("greet_howareyou"); expectHowAreYou(c); return; }
    c.say("greet");
    c.hold();
  },

  handlers: {
    order(c, slots) {
      const list = toArr(slots.items?.item).map(fromItem).filter(Boolean) as Buy[];
      c.s.whichAmt = undefined;
      for (const b0 of list) {
        const b = addBuy(c, b0);
        if (b.qty != null || b.money) { const a = amountSay(b); c.say(a.line, a.vars); }
      }
      if (c.step === "more" && list.length) c.s.moreDone = false;
    },
    qty_ctx(c, slots, seg) { amountFor(c, slots, seg); },
    order_amount(c, slots, seg) { amountFor(c, slots, seg); },
    ripe_ans(c, _slots, seg) { setRipe(c, ripeTag(seg.tags) ?? "today"); },
    ripe_any(c) { if (c.step === "ripe") setRipe(c, "today"); else c.say("ack"); },
    ask_price(c, slots) { askPrice(c, slots.product as string | undefined); },
    price_next_ctx(c, slots) { askPrice(c, slots.product as string); },
    which_ctx(c, slots) {
      const id = slots.product as string;
      const amt = c.s.whichAmt as Amount | undefined;
      // "Deme medio kilo." – "¿De cuál?" – "Del aguacate.": the amount was for that one
      if (amt) {
        c.s.whichAmt = undefined;
        const b = addBuy(c, { id, qty: null });
        if (setAmount(b, amt)) { const a = amountSay(b); c.say(a.line, a.vars); }
        return;
      }
      askPrice(c, id);
    },
    ask_total(c) {
      if (!buys(c).length) { c.say("ask_order"); c.hold(); return; }
      const t = total(c);
      if (!t) return; // nothing weighed yet: the step asks how much
      if (c.step === "pay" || c.s.moreDone) { c.say("say_total", { price: t }); c.s.totalSaid = true; c.hold(); return; }
      c.say("sum_so_far", { price: t });
    },
    more_no(c) { c.s.moreDone = true; },
    more_yes(c) { c.say("ask_order"); c.hold(); },
    bag_yes(c) { c.s.bag = "own"; c.say("bag_ok"); },
    bag_yes_ctx(c) { c.s.bag = "own"; c.say("bag_ok"); },
    bag_no(c) { c.s.bag = "theirs"; c.say("bag_give"); },
    bag_no_ctx(c) { c.s.bag = "theirs"; c.say("bag_give"); },
    bag_none_ctx(c) { c.s.bag = "none"; c.say("ack"); },
    pay_cash(c) {
      if (c.s.paid) return;
      if (!c.s.totalSaid) { c.say("ack"); return; }
      if (c.s.bigBill && !c.s.billTalk) { c.s.billTalk = true; c.twist("big_bill"); c.say("no_change");
        c.expect({ id: "bill", expects: ["no_smaller", "big_bill", "pay_cash"], hints: ["pay"], suggest: [{ lt: "Say you only have a big bill", hint: "pay" }],
          no: (cc) => { if (!cc.s.paid) paidCash(cc, "change_ok"); },
          yes: (cc) => { if (!cc.s.paid) paidCash(cc, "change_back"); },
          on: {
            no_smaller: (cc) => { if (!cc.s.paid) paidCash(cc, "change_ok"); return true; },
            big_bill: (cc) => { if (!cc.s.paid) paidCash(cc, "change_ok"); return true; },
            pay_cash: (cc) => { if (!cc.s.paid) paidCash(cc, "paid_exact"); return true; },
          },
          ask: (cc) => cc.say("no_change") });
        return;
      }
      paidCash(c, "change_back");
    },
    big_bill(c, slots) {
      // "¿Tiene cambio de quinientos?" / "Solo tengo de quinientos" / "Le doy cien": Licha finds change
      const t = total(c);
      if (c.s.paid) return;
      if (!t) { c.say("ack"); return; }
      const said = c.s.totalSaid;
      c.s.totalSaid = true;
      const bill = slots.bill as number | undefined;
      // less than the total ("Tengo de cincuenta" for $65): the total again
      if (bill != null && bill < t) { c.say("say_total", { price: t }); c.hold(); return; }
      if (!said) c.say("say_total", { price: t });
      paidCash(c, bill === t ? "paid_exact" : "change_ok");
    },
    no_smaller(c) { if (!c.s.paid) paidCash(c, "change_ok"); },
    keep_change(c) {
      if (c.s.paid) { c.say("thanks_tip"); return; }
      const t = total(c);
      if (!t) { c.say("ack"); return; }
      if (!c.s.totalSaid) { c.s.totalSaid = true; c.say("say_total", { price: t }); }
      paidCash(c, "thanks_tip");
    },
    ask_receipt(c) { c.say("no_receipt"); },
    pay_card(c) { c.twist("cash_only"); c.say("cash_only"); },
    pay_transfer(c) { if (c.s.paid) return; c.say("transfer_ok"); paidTransfer(c); },
    transfer_yes_ctx(c) { if (!c.s.paid) { c.say("ack"); paidTransfer(c); } },
    pay_dollars(c) { c.say("dollars_no"); },
    no_cash(c) {
      if (c.s.paid) return;
      c.say("transfer_offer");
      c.expect({ id: "transfer", expects: ["pay_transfer", "transfer_yes_ctx", "pay_cash", "big_bill"], hints: ["pay"], suggest: [{ lt: "Say you'll pay by transfer", hint: "pay" }],
        yes: (cc) => { cc.say("ack"); paidTransfer(cc); },
        no: () => {},
        on: { pay_transfer: (cc) => { cc.say("ack"); paidTransfer(cc); return true; } } });
    },
    haggle(c) {
      if (c.s.haggled) { c.say("haggle_again"); return; }
      c.s.haggled = true; c.s.pilon = true; c.say("haggle_no");
    },
    reject(c, slots) {
      const id = slots.product as string | undefined;
      const i = id ? buys(c).findIndex((b) => b.id === id) : -1;
      if (i >= 0) { buys(c).splice(i, 1); c.say("removed", { X: { id: id!, qty: 2 } }); }
      else c.say("ack");
    },
    product_unknown(c) { c.say("unknown"); },
    ask_have(c, slots) {
      const id = slots.product as string;
      sayGood(c, id);
      if (!buys(c).some((b) => b.id === id)) buys(c).push({ id, qty: null });
    },
    ask_recommend(c) { recommend(c); },
    ask_what(c) { c.say("stock"); },
    ask_quality(c, slots) {
      const id = (slots.product as string | undefined) ?? pending(c)?.id ?? notBought(c, c.s.lastAsked) ?? buys(c).at(-1)?.id;
      if (!id) { recommend(c); return; }
      sayGood(c, id);
      if (!buys(c).some((b) => b.id === id)) interested(c, id);
    },
  },

  finish: (c) => {
    if (!c.s.done) { c.s.done = true; c.complete(); }
    c.say("closing");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: { g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("g_bye"); cc.end(); } },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // asking for things: every hint pattern, and the amounts
    { say: "¿Me da un kilo de aguacates?", intent: "order", slots: { items: { item: { product: "aguacate" } } } },
    { say: "Deme medio kilo de jitomates, por favor", intent: "order", slots: { items: { item: { product: "jitomate" } } } },
    { say: "Quiero tres mangos", intent: "order", slots: { items: { item: { product: "mango", count: 3 } } } },
    { say: "Me llevo una piña", intent: "order", slots: { items: { item: { product: "pina" } } } },
    { say: "Quisiera limones, por favor", intent: "order", slots: { items: { item: { product: "limon" } } } },
    { say: "Deme veinte pesos de limón", intent: "order", slots: { items: { item: { product: "limon", money: 2000 } } } },
    { say: "Un kilo de jitomate y medio de cebolla", intent: "order" },
    { say: "Kilo y medio de naranjas para jugo", intent: "order", slots: { items: { item: { product: "naranja" } } } },
    { say: "Un cuarto de chile habanero", intent: "order", slots: { items: { item: { product: "habanero" } } } },
    { say: "Dos kilos de papas", intent: "order", slots: { items: { item: { product: "papa", kilos: 2 } } } },
    { say: "Un manojo de cilantro", intent: "order", slots: { items: { item: { product: "cilantro" } } } },
    { say: "Aguacates para hoy", intent: "order", slots: { items: { item: { product: "aguacate" } } } },
    { say: "Me pone un kilo de plátanos", intent: "order" },
    { say: "Tres aguacates", intent: "order", slots: { items: { item: { product: "aguacate", count: 3 } } } },
    { say: "Dos manojos de cilantro", intent: "order", slots: { items: { item: { product: "cilantro", count: 2 } } } },
    // the neutral words and other countries' words are understood too
    { say: "Un kilo de tomates", intent: "order", slots: { items: { item: { product: "jitomate" } } } },
    { say: "Medio kilo de bananas", intent: "order", slots: { items: { item: { product: "platano" } } } },
    { say: "Dame un kilo de limones", intent: "order" },
    // "¿Cuánto le doy?"
    { say: "Un kilo", intent: "qty_ctx", step: "qty" },
    { say: "Medio", intent: "qty_ctx", step: "qty" },
    { say: "Tres, por favor", intent: "qty_ctx", step: "qty", slots: { count: 3 } },
    { say: "Dos, nada más", intent: "qty_ctx", step: "qty", slots: { count: 2 } },
    { say: "Veinte pesos", intent: "qty_ctx", step: "qty", slots: { money: 2000 } },
    { say: "Como medio kilo", intent: "qty_ctx", step: "qty" },
    // an amount without a product: for the one just named
    { say: "Deme tres", intent: "order_amount" },
    { say: "Mejor medio kilo", intent: "order_amount" },
    // how ripe
    { say: "Para hoy", intent: "ripe_ans", step: "ripe" },
    { say: "Para el fin de semana", intent: "ripe_ans", step: "ripe" },
    { say: "Que estén maduros", intent: "ripe_ans", step: "ripe" },
    { say: "Unos para hoy y otros para mañana", intent: "ripe_ans", step: "ripe" },
    { say: "Me da igual", intent: "ripe_any", step: "ripe", not: ["product_unknown"] },
    // prices
    { say: "¿A cómo está el aguacate?", intent: "ask_price", slots: { product: "aguacate" } },
    { say: "¿A cómo los mangos?", intent: "ask_price", slots: { product: "mango" } },
    { say: "¿Cuánto cuesta la piña?", intent: "ask_price", slots: { product: "pina" } },
    { say: "¿A cómo el kilo?", intent: "ask_price", step: "qty" },
    { say: "¿Cuánto cuesta cada mango?", intent: "ask_price", slots: { product: "mango" }, not: ["order"] },
    { say: "¿Cuánto le debo?", intent: "ask_total", step: "more" },
    // what she has
    { say: "¿Qué tiene?", intent: "ask_what" },
    { say: "¿Están maduros los aguacates?", intent: "ask_quality", slots: { product: "aguacate" } },
    { say: "¿Me da un kilo de fresas?", intent: "product_unknown" },
    // that's all, the bag, paying
    { say: "Es todo", intent: "more_no", step: "more" },
    { say: "Nada más, gracias", intent: "more_no", step: "more" },
    { say: "No necesito nada más", intent: "more_no", step: "more", not: ["order"] },
    { say: "Sí, traigo bolsa", intent: "bag_yes", step: "bag" },
    { say: "Sí, aquí tengo una", intent: "bag_yes", step: "bag", not: ["big_bill"] },
    { say: "No traigo", intent: "bag_no", step: "bag" },
    { say: "¿Me da una bolsa?", intent: "bag_no", step: "bag" },
    { say: "No, ¿me da una?", intent: "bag_no_ctx", step: "bag", not: ["product_unknown"] },
    { say: "No necesito bolsa", intent: "bag_none_ctx", step: "bag", not: ["bag_no"] },
    { say: "Aquí tiene", intent: "pay_cash", step: "pay" },
    { say: "Tome", intent: "pay_cash", step: "pay" },
    { say: "Solo tengo de quinientos", intent: "big_bill", step: "pay", slots: { bill: 50000 } },
    { say: "¿Tiene cambio de quinientos?", intent: "big_bill", step: "pay", slots: { bill: 50000 } },
    { say: "¿Tiene cambio?", intent: "big_bill", step: "pay", not: ["product_unknown"] },
    { say: "Le pago con un billete de doscientos", intent: "big_bill", step: "pay", slots: { bill: 20000 } },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "¿Le puedo hacer una transferencia?", intent: "pay_transfer", step: "pay" },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay" },
    { say: "¿Acepta dólares?", intent: "pay_dollars", step: "pay" },
    { say: "¿Me lo deja en cien?", intent: "haggle" },
    // never flip the meaning
    { say: "No quiero cebolla", intent: "reject", not: ["order"] },
    { say: "No, mejor no quiero los mangos", intent: "reject", not: ["order"] },
    { say: "No cilantro", intent: "reject", not: ["order"] },
    { say: "Sin jitomate", intent: "reject", slots: { product: "jitomate" }, not: ["order"] },
    // learners' Spain forms are correct answers too: patata, vosotros, vale
    { say: "¿Me pone un kilo de patatas?", intent: "order", slots: { items: { item: { product: "papa" } } } },
    { say: "¿Tenéis aguacates?", intent: "ask_have", slots: { product: "aguacate" } },
    { say: "Vale, es todo", intent: "more_no", step: "more" },
    // not understood
    { say: "kilo", intent: "none" },
    { say: "mi hermano trabaja en un banco", intent: "none" },
  ],

  sims: [
    { name: "two things, cash", turns: ["¡Buenos días!", "¿A cómo está el aguacate?", "Deme medio kilo, por favor", "Para hoy", "Y un kilo de jitomate", "Es todo", "Sí, traigo bolsa", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = true; } },
    { name: "amounts said after: ¿cuánto le doy?", turns: ["Quisiera limones", "Veinte pesos", "Y unos mangos", "Tres", "Para mañana", "Nada más", "Aquí tiene", "¡Adiós!"],
      expect: { complete: true, state: { buys: { 0: { id: "limon", money: 2000 }, 1: { id: "mango", qty: 3, ripe: "later" } } } }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
    { name: "a big bill (twist)", turns: ["Un kilo de naranjas y una piña", "Es todo", "No traigo", "Aquí tiene", "No, perdón, solo tengo de quinientos", "¡Muchas gracias!"],
      expect: { complete: true }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = true; s.askBag = true; } },
    { name: "a card first, then cash; asking for a discount", turns: ["Dos kilos de papas", "Y un manojo de cilantro", "¿Me lo deja en ochenta?", "Es todo", "¿Acepta tarjeta?", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
    { name: "changed my mind", turns: ["Medio kilo de cebolla y un kilo de jitomate", "No, mejor no quiero cebolla", "Y un cuarto de chile habanero", "Es todo", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true, state: { buys: { 0: { id: "jitomate", qty: 1000 }, 1: { id: "habanero", qty: 250 } } } }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
    { name: "pieces of what is sold by the kilo; a correction", turns: ["Tres aguacates", "Para mañana", "Y cinco limones", "Mejor medio kilo", "Es todo", "No necesito bolsa", "Le doy cien", "¡Gracias!"],
      expect: { complete: true, state: { bag: "none", buys: { 0: { id: "aguacate", pcs: 3, qty: 750, ripe: "later" }, 1: { id: "limon", qty: 500 } } } }, auto: MERCADO_AUTO,
      setup: (s) => { s.bigBill = false; s.askBag = true; } },
    { name: "¿de cuál?, then a question about the fruit", turns: ["¿A cómo el kilo?", "Del aguacate", "¿Están maduros?", "Medio kilo", "Me da igual", "¿Qué tiene?", "Dos manojos de cilantro", "Es todo", "¿Tiene cambio?", "¡Gracias!"],
      expect: { complete: true, state: { buys: { 0: { id: "aguacate", qty: 500, ripe: "today" }, 1: { id: "cilantro", qty: 2 } } } }, auto: MERCADO_AUTO,
      setup: (s) => { s.bigBill = false; s.askBag = false; } },
    { name: "a tip; no cash, so a transfer", turns: ["¿Qué me recomienda?", "Bueno, deme dos", "Para hoy", "Es todo", "¿Acepta dólares?", "¿Acepta tarjeta?", "No traigo efectivo", "Sí, por favor", "¡Gracias!"],
      expect: { complete: true }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
  ],
};

/** The amount said without a product ("Medio kilo.", "Deme tres.", "Uno."): for the thing being weighed, the one just
 *  priced or recommended, or the last one bought; with none, "¿De cuál?". */
function amountFor(c: Ctx, slots: any, seg: { tags: string[] }) {
  const a: Amount = { money: slots.money, g: grams({ __tags: seg.tags, kilos: slots.kilos }), count: slots.count, one: seg.tags.includes("one") };
  if (a.money == null && a.g == null && a.count == null && !a.one) return; // no amount heard
  let b = pending(c);
  const asked = notBought(c, c.s.lastAsked);
  if (!b && asked) b = addBuy(c, { id: asked, qty: null });
  b ??= buys(c).at(-1);
  if (!b) { c.s.whichAmt = a; c.say("which_product"); expectWhich(c); return; }
  if (setAmount(b, a)) { const s = amountSay(b); c.say(s.line, s.vars); }
}

/** A product id that isn't in the bag yet. */
const notBought = (c: Ctx, id: unknown) => (typeof id === "string" && !buys(c).some((b) => b.id === id) ? id : undefined);

/** "¿De cuál?": the learner names the product. */
function expectWhich(c: Ctx) {
  c.expect({ id: "which", optional: true, expects: ["which_ctx", "order", "ask_price"], hints: ["ask_price"], suggest: [{ lt: "Say which one", hint: "ask_price", options: "product" }] });
}

/** After a price, a tip or "¿Están maduros?": "Deme medio kilo" / "Tres" is for that product. */
function interested(c: Ctx, id: string, pendingId = "after_price") {
  c.s.lastAsked = id;
  const hint = unitOf(id) === "kg" ? "qty" : "qty_pcs";
  c.expect({ id: pendingId, optional: true, expects: ["qty_ctx", "order", "price_next_ctx", "ask_price", "reject"], hints: [hint],
    suggest: [{ lt: unitOf(id) === "kg" ? "Say how much" : "Say how many", hint }, { lt: "Ask for something else", hint: "order", options: "product" }],
    // "Sí": she asks how much; "No, gracias": nothing bought
    yes: (cc) => { if (!buys(cc).some((b) => b.id === id)) buys(cc).push({ id, qty: null }); },
    no: () => {} });
}

function askPrice(c: Ctx, product: string | undefined) {
  const id = product ?? pending(c)?.id ?? notBought(c, c.s.lastAsked) ?? buys(c).at(-1)?.id;
  if (!id) { c.say("which_product"); expectWhich(c); return; }
  const e = byId(id), X = { id, qty: 2 };
  if (unitOf(id) === "kg") c.say("price_kg_pl", { X, price: priceOf(id) });
  else if (unitOf(id) === "manojo") c.say("price_bunch", { price: priceOf(id) });
  else c.say(e.g === "f" ? "price_piece" : "price_piece_m", { X, price: priceOf(id) });
  // "¿A cómo está el aguacate?" – "A sesenta el kilo." – "Deme medio kilo.": the amount is for that product
  if (!buys(c).some((b) => b.id === id)) interested(c, id);
}

/** "¡Sí, claro! Están muy buenas." (the cilantro: "Está muy fresco.") */
function sayGood(c: Ctx, id: string) {
  if (unitOf(id) === "manojo") c.say("have_yes_sg");
  else c.say("have_yes", { X: { id, qty: 2 } });
}

/** Licha recommends the mangoes or a papaya; "Sí, deme tres" is for that one. */
function recommend(c: Ctx) {
  const id = c.chance(0.5) ? "mango" : "papaya";
  c.say(id === "mango" ? "recommend_mango" : "recommend_papaya");
  if (!buys(c).some((b) => b.id === id)) interested(c, id, "after_tip");
}

/** How ripe, for everything that ripens and has no answer yet ("los" / "las" / "lo" / "la" agree with it). */
function setRipe(c: Ctx, r: NonNullable<Buy["ripe"]>) {
  const set = buys(c).filter((b) => ripens(b.id) && !b.ripe);
  for (const b of set) b.ripe = r;
  if (!set.length) { c.say("ack"); return; }
  const one = set.length === 1 && single(set[0]);
  const fem = set.every((b) => byId(b.id).g === "f");
  const x = set.find((b) => (byId(b.id).g === "f") === fem) ?? set[0];
  c.say(one ? "ack_ripe_one" : "ack_ripe", { X: { id: x.id, qty: one ? 1 : 2 } });
}

function paidCash(c: Ctx, line: string) {
  c.s.paid = true; c.s.moreDone = true;
  c.event("pay", { method: "cash" });
  c.say(line);
  pilon(c);
}

function paidTransfer(c: Ctx) {
  c.s.paid = true; c.s.moreDone = true;
  c.event("pay", { method: "transfer" });
  pilon(c);
}

/** The pilón: on some visits Licha adds a little cilantro for free (or after a request for a discount). */
function pilon(c: Ctx) {
  if (!c.s.pilon || c.s.pilonGiven) return;
  c.s.pilonGiven = true;
  c.twist("pilon");
  c.say("pilon");
}

export default mercado;
