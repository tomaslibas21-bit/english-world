// Song 32 "Unexpected Item" → Puerto Colibrí: "¿A cómo el kilo?"
// Doña Lupe's fruit and vegetable stall in the Mercado Municipal (the English edition's supermarket checkout becomes a
// Mexican market stall: docs/es/briefs/s32-mercado.md). The model for numbers: prices by the kilo, by the piece and by
// the bunch, weights (un kilo, medio kilo, kilo y medio, un cuarto), buying "veinte pesos de limón", the total, cash
// and change. Mexican market talk: "¿Qué le damos, joven?", "¿Cuánto le doy?", "¿Para hoy o para mañana?" (how ripe),
// the pilón (a little extra for free). Lines with a Mexican-only word ("jitomate", "pilón", "nomás") have a neutral twin.

import type { Ctx, EntityDef, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// The stall. price: cents of a peso per unit; unit: kg (sold by weight), pza (by the piece), manojo (by the bunch).

const P = (id: string, es: string, en: string, g: "m" | "f", unit: "kg" | "pza" | "manojo", price: number, extra: { pl?: string; ltPl?: string; forms?: string[]; ripe?: boolean; nat?: string; chip?: string; neutral?: string } = {}) =>
  ent(id, es, en, g, { pl: extra.pl, ltPl: extra.ltPl, forms: extra.forms, chip: extra.chip, attrs: { unit, price, ripe: !!extra.ripe, nat: extra.nat, neutral: extra.neutral } });

export const PRODUCTS: EntityDef[] = [
  P("aguacate", "aguacate", "avocado", "m", "kg", 7000, { pl: "aguacates", ltPl: "avocados", forms: ["aguacates", "aguacatito", "palta", "paltas"], ripe: true }),
  // Mexican "jitomate" (a red tomato; "tomate" is the green tomatillo there): understood as "tomate" too
  P("jitomate", "jitomate", "tomato", "m", "kg", 3000, { pl: "jitomates", ltPl: "tomatoes", forms: ["jitomates", "tomate", "tomates", "tomate rojo", "tomates rojos"], neutral: "tomate" }),
  P("limon", "limón", "lime", "m", "kg", 3500, { pl: "limones", ltPl: "limes", forms: ["limones", "limoncito", "limon verde", "lima", "limas"] }),
  P("platano", "plátano", "banana", "m", "kg", 2500, { pl: "plátanos", ltPl: "bananas", forms: ["platanos", "banana", "bananas", "banano", "bananos"] }),
  P("mango", "mango", "mango", "m", "pza", 1500, { pl: "mangos", ltPl: "mangoes", forms: ["mangos", "manguito"], ripe: true }),
  P("papaya", "papaya", "papaya", "f", "kg", 3500, { pl: "papayas", forms: ["papayas"], ripe: true }),
  P("pina", "piña", "pineapple", "f", "pza", 4000, { pl: "piñas", ltPl: "pineapples", forms: ["pinas", "pina", "anana"] }),
  P("cebolla", "cebolla", "onion", "f", "kg", 3000, { pl: "cebollas", ltPl: "onions", forms: ["cebollas", "cebolla blanca"] }),
  P("papa", "papa", "potato", "f", "kg", 3500, { pl: "papas", ltPl: "potatoes", forms: ["papas", "patata", "patatas"] }),
  P("naranja", "naranja", "orange", "f", "kg", 2500, { pl: "naranjas", ltPl: "oranges", forms: ["naranjas", "naranja para jugo", "naranjas para jugo"] }),
  P("habanero", "chile | habanero", "chili | habanero", "m", "kg", 8000, { pl: "chiles | habaneros", ltPl: "chilis | habanero", forms: ["habanero", "habaneros", "chile habanero", "chiles habaneros", "chile", "chiles"], nat: "habanero peppers" }),
  P("cilantro", "cilantro", "cilantro", "m", "manojo", 1000, { forms: ["un manojo de cilantro", "cilantrito"] }),
];

const byId = (id: string) => PRODUCTS.find((e) => e.id === id)!;
const unitOf = (id: string) => byId(id).attrs!.unit as "kg" | "pza" | "manojo";
const priceOf = (id: string) => byId(id).attrs!.price as number;

// ---------------------------------------------------------------------------
// The bag of things bought

interface Buy {
  id: string;
  /** grams (by weight), pieces or bunches; null until said */
  qty: number | null;
  /** "20 pesos of limes": an amount of money instead of a weight */
  money?: number;
  ripe?: "today" | "later";
}
const buys = (c: Ctx) => c.s.buys as Buy[];
const cost = (b: Buy) => (b.money ? b.money : b.qty == null ? 0 : unitOf(b.id) === "kg" ? Math.round((priceOf(b.id) * b.qty) / 1000 / 50) * 50 : priceOf(b.id) * b.qty);
const total = (c: Ctx) => buys(c).reduce((a, b) => a + cost(b), 0);
const pending = (c: Ctx) => buys(c).find((b) => b.qty == null && !b.money);

/** Grams from the weight tags of an amount ("medio kilo" → #g500), or from "dos kilos" ({kilos}): `v` holds both, as
 *  the `item` slot does (or { __tags: seg.tags, kilos } for an answer to "¿Cuánto le doy?"). */
function grams(v: any): number | null {
  const tags: string[] = v?.__tags || [];
  const g = tags.find((x) => /^g\d+$/.test(x));
  if (g) return parseInt(g.slice(1), 10);
  if (typeof v?.kilos === "number") return v.kilos * 1000 + (tags.includes("half") ? 500 : 0);
  return null;
}

/** One bought thing from an `item` slot. */
function fromItem(v: any): Buy | null {
  if (!v?.product) return null;
  const id = v.product as string;
  const b: Buy = { id, qty: null };
  const g = grams(v);
  if (typeof v.money === "number") b.money = v.money;
  else if (g != null) b.qty = unitOf(id) === "kg" ? g : Math.max(1, Math.round(g / 1000));
  else if (typeof v.count === "number") b.qty = unitOf(id) === "kg" ? null : v.count;
  else if ((v.__tags || []).includes("one") && unitOf(id) !== "kg") b.qty = 1;
  // pieces of something sold by weight ("tres aguacates"): Lupe weighs them (about 200 g each)
  if (typeof v.count === "number" && unitOf(id) === "kg") b.qty = v.count * 200;
  const tags: string[] = v.__tags || [];
  if (tags.includes("today")) b.ripe = "today";
  if (tags.includes("later")) b.ripe = "later";
  return b;
}
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** "medio kilo de aguacate" as Lupe says it back: {X} with the amount. */
function amountSay(b: Buy): { line: string; vars: Record<string, any> } {
  const X = { id: b.id, qty: unitOf(b.id) === "kg" ? 1 : b.qty ?? 1 };
  if (b.money) return { line: "got_money", vars: { X: { id: b.id, qty: 2 }, price: b.money } };
  if (unitOf(b.id) !== "kg") return { line: unitOf(b.id) === "manojo" ? "got_bunch" : "got_pieces", vars: { X } };
  const g = b.qty ?? 1000;
  const key = g === 250 ? "got_quarter" : g === 500 ? "got_half" : g === 1000 ? "got_kilo" : g === 1500 ? "got_kilo_half" : "got_kilos";
  return { line: key, vars: { X: { id: b.id, qty: 2 }, num: Math.round(g / 1000) } };
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
  intro: "The Mercado Municipal is a covered market hall off the zócalo. Doña Lupe has sold fruit and vegetables here for thirty years. Prices are per kilo (el kilo) or per piece (la pieza); people pay in cash.",
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
      ripe: "((para hoy | para comer hoy | maduros | maduras | bien maduros | bien maduras | que esten maduros | que esten maduras) #today | (para manana | para el fin de semana | para el sabado | para el domingo | para unos dias | no tan maduros | no tan maduras | verdes | firmes) #later)",
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
      ] },
      items: { pattern: "{item} [(y | y tambien | y un | y una | tambien) {item}] [(y | tambien) {item}]" },
    },
  },

  intents: {
    order: { patterns: ["@order_prefix {items}", "{items}", "@order_prefix @amount de {product} y @amount de {product}"] },
    // "¿Cuánto le doy?" – "Un kilo." / "Medio." / "Tres." / "Veinte pesos." / "Como un kilo."
    qty_ctx: { patterns: ["@amount #h:qty_kilo", "{count:number} [por favor]", "(un | una) #one", "{money:price} [nada mas]", "@order_prefix @amount", "@order_prefix {count:number}",
      "(como | unos | unas) {count:number}", "@amount (esta bien | nada mas)"] },
    ripe_ans: { patterns: ["@ripe #h:ripe", "(los | las) quiero @ripe", "(mejor)? @ripe", "son @ripe"] },
    ask_price: { patterns: [
      "a como (esta | estan | sale | salen) [el | la | los | las] {product} #h:q_a_como", "cuanto (cuesta | cuestan | vale | valen | esta | estan) [el | la | los | las] {product} #h:q_cuanto",
      "a como el kilo [de {product}] #h:q_a_como", "cuanto (cuesta | esta) el kilo [de {product}]", "a como (la pieza | cada uno | cada una)", "cuanto (cuesta | es) (la pieza | cada uno | cada una)",
      "y [el | la | los | las] {product} (a como | cuanto)", "[y] a como [el | la | los | las] {product}",
    ] },
    ask_total: { patterns: ["cuanto (es | seria | le debo | va a ser) [todo]", "cuanto (es | son) en total", "cuanto le debo"] },
    more_no: { patterns: ["(es | seria | eso es | eso seria | ya es) todo #h:more_all", "nada mas #h:more_nothing", "(con eso | ya con eso) [es todo]", "(solo | nomas) eso", "es todo por hoy", "ya no gracias", "no gracias es todo"] },
    more_yes: { patterns: ["(si | ah si) (algo mas | otra cosa)", "otra cosa", "algo mas"] },
    bag_yes: { patterns: ["[si] (traigo | tengo) [mi | una] bolsa #h:bag_yes", "[si] aqui (traigo | tengo) [mi bolsa]", "[si] traigo"] },
    bag_no: { patterns: ["no (traigo | tengo) [bolsa]", "me (da | vende | regala) una bolsa #h:bag_no", "(una | la) bolsa por favor"] },
    pay_cash: { patterns: ["aqui tiene #h:here_you_go", "tenga", "aqui esta", "le pago en efectivo", "en efectivo"] },
    // "Tengo de quinientos" / "¿Tiene cambio de quinientos?": a big bill
    big_bill: { patterns: ["(tengo | traigo) (un billete)? de {bill:price} #h:big_bill", "(solo | nomas) (tengo | traigo) (billete)? de {bill:price}", "(tiene | trae) cambio de {bill:price} #h:q_change",
      "(le pago | pago) con (uno | un billete) de {bill:price}", "aqui tiene (uno | un billete)? de {bill:price}"] },
    no_smaller: { patterns: ["no (tengo | traigo) (mas chico | mas pequeno | cambio | otro)", "(solo | nomas) (tengo | traigo) ese", "no perdon solo (tengo | traigo) de {bill:price}"] },
    pay_card: { patterns: ["(acepta | aceptan) tarjeta #h:q_card", "puedo pagar con tarjeta", "con tarjeta", "le pago con tarjeta"] },
    pay_transfer: { patterns: ["(le puedo hacer | puedo hacer | acepta | aceptan) (una)? transferencia", "por transferencia"] },
    haggle: { patterns: ["(me lo | me la | me los | me las) deja en {price}", "(me hace | hay) (un)? descuento", "(me lo | me la | lo | la) (deja | da) mas barato", "esta caro"] },
    reject: { patterns: ["[mejor] no (quiero | voy a llevar) [el | la | los | las] {product}", "no {product}", "(quite | quiteme | olvide) [el | la | los | las] {product}", "[mejor] ya no (lo | la | los | las) quiero"] },
    product_unknown: { patterns: ["(tiene | hay) {w:any}", "@order_prefix {w:any}"] },
    ask_have: { patterns: ["(tiene | hay) {product} #h:q_have", "(tiene | hay) {product} (maduros | maduras | para hoy)"] },
    ask_recommend: { patterns: ["que me recomienda", "que (esta | estan) (bueno | buena | buenos | buenas | rico | ricos) hoy", "que (fruta | verdura) (esta | es) de temporada"] },
  },

  lines: {
    greet: [
      t("¡Pásele, | {m:joven|f:joven}! | ¿Qué | le | damos?", "Come in, | young man! | What | (to) you | we-give?", "Come on in! What can I get you?",
        { flags: { 0: "Mexican markets: “pásele” = come on in, have a look." },
          neutral: t("¡Adelante, | {m:joven|f:joven}! | ¿Qué | le | damos?", "Come in, | young man! | What | (to) you | we-give?", "Come on in! What can I get you?") }),
      t("¡Buenos días! | ¿Qué | se | le | ofrece?", "Good morning! | What | (itself) | (to) you | offers?", "Good morning! What can I do for you?",
        { flags: { 2: "se le ofrece: “is offered to you” – a set, polite shop question." } }),
      t("¡Buenas, | {m:marchante|f:marchanta}! | ¿Qué | va | a | llevar?", "Hi, | customer! | What | are you going | to | take?", "Hi there! What are you taking today?",
        { flags: { 1: "Mexican markets: marchante / marchanta = a regular customer, said warmly." } }),
    ],
    greet_howareyou: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?"),
    ],
    ask_order: [
      t("¿Qué | le | damos?", "What | (to) you | we-give?", "What can I get you?"),
      t("¿Qué | va | a | llevar?", "What | are you going | to | take?", "What are you taking?"),
    ],
    ask_qty: [
      t("¿Cuánto | le | doy?", "How much | (to) you | I-give?", "How much would you like?"),
      t("¿Cuánto | le | pongo?", "How much | (for) you | I-put?", "How much shall I put in?"),
    ],
    ask_qty_kg: [
      t("¿Cuánto | le | doy? | ¿Un | kilo, | medio | kilo?", "How much | (to) you | I-give? | A | kilo, | half | kilo?", "How much would you like? A kilo, half a kilo?"),
    ],
    ask_ripe: [
      t("¿{lo@X} | quiere | para | hoy | o | para | mañana?", "Them | you-want | for | today | or | for | tomorrow?", "Do you want them ripe for today, or for tomorrow?",
        { flags: { 0: "Market question: how ripe? For today = ripe now; for tomorrow = still firm." } }),
    ],
    ack_ripe: [t("Muy | bien.", "Very | good.", "Okay."), t("Ahorita | se | los | escojo.", "Right now | for you | them | I-pick.", "I'll pick them out for you.",
      { flags: { 2: "los: “them” (a pronoun here, not the article)." }, neutral: t("Ya | se | los | escojo.", "Now | for you | them | I-pick.", "I'll pick them out for you.") })],
    // what Lupe says as she weighs (X = the product, in the plural)
    got_kilo: [t("Un | kilo | de | {X.pl}...", "A | kilo | of | {X.pl}...", "A kilo of {X.pl}…")],
    got_half: [t("Medio | kilo | de | {X.pl}...", "Half | kilo | of | {X.pl}...", "Half a kilo of {X.pl}…")],
    got_quarter: [t("Un | cuarto | de | {X.pl}...", "A | quarter | of | {X.pl}...", "A quarter kilo of {X.pl}…")],
    got_kilo_half: [t("Kilo | y | medio | de | {X.pl}...", "Kilo | and | half | of | {X.pl}...", "A kilo and a half of {X.pl}…")],
    got_kilos: [t("{$num} | kilos | de | {X.pl}...", "{$num} | kilos | of | {X.pl}...", "{$num} kilos of {X.pl}…")],
    got_pieces: [t("{X.np}...", "{X.np}...", "{X.np}…")],
    got_bunch: [t("Un | manojo | de | {X}...", "A | bunch | of | {X}...", "A bunch of {X}…")],
    got_money: [t("{$price} | de | {X.pl}...", "{$price} | of | {X.pl}...", "{$price} worth of {X.pl}…")],
    price_kg: [
      t("{X.the} | está | a | {$price} | el | kilo.", "{X.the} | is | at | {$price} | the | kilo.", "{X.the} is {$price} a kilo."),
      t("A | {$price} | el | kilo.", "At | {$price} | the | kilo.", "{$price} a kilo."),
    ],
    price_kg_pl: [
      t("{X.the} | están | a | {$price} | el | kilo.", "{X.the} | are | at | {$price} | the | kilo.", "{X.the} are {$price} a kilo."),
    ],
    price_piece: [
      t("{X.the} | a | {$price} | cada una.", "{X.the} | at | {$price} | each.", "{X.the} {$price} each."),
    ],
    price_piece_m: [
      t("{X.the} | a | {$price} | cada uno.", "{X.the} | at | {$price} | each.", "{X.the} {$price} each."),
    ],
    price_bunch: [
      t("El | manojo, | a | {$price}.", "The | bunch, | at | {$price}.", "{$price} a bunch."),
    ],
    which_product: [t("¿De | cuál?", "Of | which one?", "Which one?")],
    ask_more: [
      t("¿Qué | más | le | damos?", "What | else | (to) you | we-give?", "What else can I get you?"),
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Qué | más | va | a | llevar?", "What | else | are you going | to | take?", "What else are you taking?"),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Ándale.", "Okay then.", "Okay!", { flags: { 0: "Mexican: ándale = okay, there you go." }, neutral: t("Muy | bien.", "Very | good.", "Okay.") })],
    have_yes: [t("¡Sí, | claro! | Están | muy | buenos.", "Yes, | sure! | They're | very | good.", "Yes, of course! They're very good today.")],
    have_no: [t("No, | eso | no lo tengo, | {m:joven|f:joven}.", "No, | that | I don't have it, | young man.", "No, I don't have that, I'm afraid.")],
    recommend: [
      t("Los | mangos | están | buenísimos | hoy.", "The | mangoes | are | really good | today.", "The mangoes are wonderful today."),
      t("Llévese | una | papaya, | está | dulcecita.", "Take | a | papaya, | it's | nice and sweet.", "Take a papaya, it's nice and sweet.", { flags: { 4: "-ita: a fond diminutive, “nice and sweet”." } }),
    ],
    removed: [t("Muy | bien, | sin | {X.pl}.", "Very | good, | without | {X.pl}.", "Okay, no {X.pl}.")],
    ask_bag: [
      t("¿Trae | bolsa?", "Do you bring | bag?", "Did you bring a bag?"),
      t("¿Trae | su | bolsa?", "Do you bring | your | bag?", "Have you got your bag?"),
    ],
    bag_ok: [t("Muy | bien, | aquí | se | lo | pongo.", "Very | good, | here | for you | it | I-put.", "Great, I'll put it in here.")],
    bag_give: [t("Aquí | le | pongo | una | bolsita.", "Here | (for) you | I-put | a | little bag.", "Here, I'll put it in a bag for you.")],
    say_total: [
      t("Son | {$price}.", "That's | {$price}.", "That's {$price}."),
      t("Serían | {$price}, | {m:joven|f:joven}.", "That would be | {$price}, | young man.", "That'll be {$price}."),
      t("Todo | junto | son | {$price}.", "All | together | are | {$price}.", "All together, that's {$price}."),
    ],
    sum_so_far: [t("Hasta | ahorita | van | {$price}.", "Until | now | they-go | {$price}.", "So far it's {$price}.",
      { neutral: t("Hasta | ahora | van | {$price}.", "Until | now | they-go | {$price}.", "So far it's {$price}.") })],
    cash_only: [
      t("Nomás | efectivo, | {m:joven|f:joven}.", "Only | cash, | young man.", "Cash only, I'm afraid.",
        { flags: { 0: "Mexican: nomás = only, just." }, neutral: t("Solo | efectivo, | {m:joven|f:joven}.", "Only | cash, | young man.", "Cash only, I'm afraid.") }),
    ],
    transfer_ok: [t("Sí, | también | por | transferencia.", "Yes, | also | by | transfer.", "Yes, a bank transfer is fine too.")],
    no_change: [
      t("¿No | trae | más | chico?", "Not | you-bring | more | small?", "Don't you have a smaller bill?",
        { flags: { 3: "Mexican: más chico = a smaller bill." }, neutral: t("¿No | tiene | un | billete | más | pequeño?", "Not | you-have | a | bill | more | small?", "Don't you have a smaller bill?") }),
    ],
    change_ok: [t("Déjeme | ver... | sí, | aquí | está | su | cambio.", "Let me | see... | yes, | here | is | your | change.", "Let me see… yes, here's your change.")],
    change_back: [
      t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change."),
      t("Y | su | cambio.", "And | your | change.", "And your change."),
    ],
    paid_exact: [t("¡Exacto! | Gracias.", "Exact! | Thanks.", "Exactly right! Thank you.")],
    haggle_no: [
      t("Ya | está | en | buen | precio, | pero | le | pongo | un | pilón.", "Already | it's | at | good | price, | but | (for) you | I-put | a | little extra.", "It's already a good price, but I'll throw in a little extra.",
        { flags: { 9: "Mexican: el pilón = a little extra the seller adds for free." },
          neutral: t("Ya | está | en | buen | precio, | pero | le | pongo | algo | de | regalo.", "Already | it's | at | good | price, | but | (for) you | I-put | something | as | a gift.", "It's already a good price, but I'll throw in a little extra.") }),
    ],
    pilon: [
      t("Le | puse | un | pilón | de | cilantro.", "(For) you | I-put | a | little extra | of | cilantro.", "I put in some cilantro for you, on the house.",
        { flags: { 3: "Mexican: el pilón = a little extra the seller adds for free." },
          neutral: t("Le | puse | un | poco | de | cilantro | de | regalo.", "(For) you | I-put | a | little | of | cilantro | as | a gift.", "I put in some cilantro for you, on the house.") }),
    ],
    closing: [
      t("¡Gracias, | {m:joven|f:joven}! | ¡Vuelva | pronto!", "Thanks, | young man! | Come back | soon!", "Thank you! Come back soon!"),
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
    { id: "order", done: (c) => buys(c).length > 0, ask: (c) => c.say("ask_order"), expects: ["order", "ask_price", "reject"],
      suggest: [
        { lt: "Ask for fruit or vegetables", hint: "order", options: "product" },
        { lt: "Ask the price first", hint: "ask_price", options: "product" },
      ],
      help: (c) => { c.say("recommend"); c.say("ask_order"); } },
    { id: "qty", when: (c) => !!pending(c), done: () => false,
      ask: (c) => c.say(unitOf(pending(c)!.id) === "kg" ? "ask_qty_kg" : "ask_qty"), expects: ["qty_ctx", "order", "ask_price"],
      suggest: (c) => [{ lt: "Say how much", hint: unitOf(pending(c)?.id ?? "aguacate") === "kg" ? "qty" : "g_yesno" }, { lt: "Ask the price", hint: "ask_price", options: "product" }] },
    { id: "ripe", when: (c) => buys(c).some((b) => byId(b.id).attrs?.ripe && !b.ripe && b.qty != null) && !c.s.ripeAsked, done: () => false,
      ask: (c) => { c.s.ripeAsked = true; const b = buys(c).find((x) => byId(x.id).attrs?.ripe && !x.ripe)!; c.say("ask_ripe", { X: { id: b.id, qty: 2 } }); },
      expects: ["ripe_ans"], suggest: [{ lt: "Say how ripe", hint: "ripe" }] },
    { id: "more", when: (c) => buys(c).length > 0 && !pending(c), done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "order", "more_yes", "ask_price"],
      suggest: (c) => buys(c).length < 2
        ? [{ lt: "Buy something else", hint: "order", options: "product" }, { lt: "Say that's all", hint: "more" }]
        : [{ lt: "Say that's all", hint: "more" }, { lt: "Buy something else", hint: "order", options: "product" }],
      yes: (c) => { c.say("ask_order"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    { id: "bag", when: (c) => !!c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => c.say("ask_bag"), expects: ["bag_yes", "bag_no"], suggest: [{ lt: "Say whether you have a bag", hint: "bag" }],
      yes: (c) => { c.s.bag = "own"; c.say("bag_ok"); },
      no: (c) => { c.s.bag = "theirs"; c.say("bag_give"); } },
    { id: "pay", done: (c) => !!c.s.paid,
      ask: (c) => { c.s.totalSaid = true; c.say("say_total", { price: total(c) }); },
      expects: ["pay_cash", "big_bill", "pay_card", "pay_transfer", "ask_total"],
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
      for (const b of list) {
        const prev = buys(c).find((x) => x.id === b.id);
        if (prev) Object.assign(prev, Object.fromEntries(Object.entries(b).filter(([, v]) => v != null)));
        else buys(c).push(b);
        if (b.qty != null || b.money) { const a = amountSay(b); c.say(a.line, a.vars); }
      }
      if (c.step === "more" && list.length) c.s.moreDone = false;
    },
    qty_ctx(c, slots, seg) {
      if (!pending(c) && c.s.lastAsked && !buys(c).some((x) => x.id === c.s.lastAsked)) buys(c).push({ id: c.s.lastAsked, qty: null });
      const b = pending(c) ?? buys(c).at(-1);
      if (!b) { c.say("ask_order"); c.hold(); return; }
      const g = grams({ __tags: seg.tags, kilos: slots.kilos });
      if (typeof slots.money === "number") { b.money = slots.money; b.qty = null; }
      else if (g != null) b.qty = unitOf(b.id) === "kg" ? g : Math.max(1, Math.round(g / 1000));
      else if (typeof slots.count === "number") b.qty = unitOf(b.id) === "kg" ? slots.count * 200 : slots.count;
      else if (seg.tags.includes("one")) b.qty = unitOf(b.id) === "kg" ? 200 : 1;
      if (b.qty != null || b.money) { const a = amountSay(b); c.say(a.line, a.vars); }
    },
    ripe_ans(c, _slots, seg) {
      for (const b of buys(c)) if (byId(b.id).attrs?.ripe && !b.ripe) b.ripe = seg.tags.includes("later") ? "later" : "today";
      c.say("ack_ripe");
    },
    ask_price(c, slots) {
      const id = slots.product as string | undefined ?? pending(c)?.id ?? buys(c).at(-1)?.id;
      if (!id) { c.say("which_product"); c.hold(); return; }
      // "¿A cómo está el aguacate?" – "A setenta el kilo." – "Deme medio kilo.": the amount is for that product
      if (!buys(c).some((b) => b.id === id)) {
        c.s.lastAsked = id;
        c.expect({ id: "after_price", optional: true, expects: ["qty_ctx", "order"], hints: ["qty"], suggest: [{ lt: "Say how much", hint: "qty" }, { lt: "Ask for something else", hint: "order", options: "product" }] });
      }
      const e = byId(id), X = { id, qty: 2 };
      if (unitOf(id) === "kg") c.say(e.pl ? "price_kg_pl" : "price_kg", { X, price: priceOf(id) });
      else if (unitOf(id) === "manojo") c.say("price_bunch", { price: priceOf(id) });
      else c.say(e.g === "f" ? "price_piece" : "price_piece_m", { X, price: priceOf(id) });
    },
    ask_total(c) {
      if (!buys(c).length) { c.say("ask_order"); c.hold(); return; }
      if (c.step === "pay" || c.s.moreDone) { c.say("say_total", { price: total(c) }); c.s.totalSaid = true; c.hold(); return; }
      c.say("sum_so_far", { price: total(c) });
    },
    more_no(c) { c.s.moreDone = true; },
    more_yes(c) { c.say("ask_order"); c.hold(); },
    bag_yes(c) { c.s.bag = "own"; c.say("bag_ok"); },
    bag_no(c) { c.s.bag = "theirs"; c.say("bag_give"); },
    pay_cash(c) {
      if (!c.s.totalSaid) { c.say("ack"); return; }
      if (c.s.bigBill && !c.s.billTalk) { c.s.billTalk = true; c.twist("big_bill"); c.say("no_change");
        const noSmaller = (cc: Ctx) => mercado.handlers.no_smaller(cc, {}, { intent: "no_smaller", slots: {}, tags: [] });
        c.expect({ id: "bill", expects: ["no_smaller", "big_bill", "pay_cash"], hints: ["pay"], suggest: [{ lt: "Say you only have a big bill", hint: "pay" }],
          no: (cc) => { if (!cc.s.paid) noSmaller(cc); },
          yes: (cc) => { cc.s.paid = true; cc.event("pay", { method: "cash" }); cc.say("change_back"); pilon(cc); },
          on: {
            no_smaller: (cc) => { if (!cc.s.paid) noSmaller(cc); return true; },
            big_bill: (cc) => { if (!cc.s.paid) noSmaller(cc); return true; },
            pay_cash: (cc) => { cc.s.paid = true; cc.event("pay", { method: "cash" }); cc.say("paid_exact"); pilon(cc); return true; },
          },
          ask: (cc) => cc.say("no_change") });
        return;
      }
      c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); pilon(c);
    },
    big_bill(c, slots) {
      // "¿Tiene cambio de quinientos?" / "Solo tengo de quinientos": Lupe finds change
      if (!c.s.totalSaid) c.say("say_total", { price: total(c) });
      c.s.totalSaid = true;
      if ((slots.bill ?? 0) < total(c)) { c.say("ack"); return; }
      c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_ok"); pilon(c);
    },
    no_smaller(c) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_ok"); pilon(c); },
    pay_card(c) { c.twist("cash_only"); c.say("cash_only"); },
    pay_transfer(c) { c.say("transfer_ok"); c.s.paid = true; c.event("pay", { method: "transfer" }); pilon(c); },
    haggle(c) { c.s.pilon = true; c.say("haggle_no"); },
    reject(c, slots) {
      const id = slots.product as string | undefined;
      const i = id ? buys(c).findIndex((b) => b.id === id) : -1;
      if (i >= 0) { buys(c).splice(i, 1); c.say("removed", { X: { id: id!, qty: 2 } }); }
      else c.say("ack");
    },
    product_unknown(c) { c.say("unknown"); },
    ask_have(c, slots) {
      c.say("have_yes");
      const id = slots.product as string;
      if (!buys(c).some((b) => b.id === id)) { buys(c).push({ id, qty: null }); }
    },
    ask_recommend(c) { c.say("recommend"); },
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
    // the neutral words and other countries' words are understood too
    { say: "Un kilo de tomates", intent: "order", slots: { items: { item: { product: "jitomate" } } } },
    { say: "Medio kilo de bananas", intent: "order", slots: { items: { item: { product: "platano" } } } },
    { say: "Dame un kilo de limones", intent: "order" },
    // "¿Cuánto le doy?"
    { say: "Un kilo", intent: "qty_ctx", step: "qty" },
    { say: "Medio", intent: "qty_ctx", step: "qty" },
    { say: "Tres, por favor", intent: "qty_ctx", step: "qty", slots: { count: 3 } },
    { say: "Veinte pesos", intent: "qty_ctx", step: "qty", slots: { money: 2000 } },
    { say: "Como medio kilo", intent: "qty_ctx", step: "qty" },
    // how ripe
    { say: "Para hoy", intent: "ripe_ans", step: "ripe" },
    { say: "Para el fin de semana", intent: "ripe_ans", step: "ripe" },
    { say: "Que estén maduros", intent: "ripe_ans", step: "ripe" },
    // prices
    { say: "¿A cómo está el aguacate?", intent: "ask_price", slots: { product: "aguacate" } },
    { say: "¿A cómo los mangos?", intent: "ask_price", slots: { product: "mango" } },
    { say: "¿Cuánto cuesta la piña?", intent: "ask_price", slots: { product: "pina" } },
    { say: "¿A cómo el kilo?", intent: "ask_price", step: "qty" },
    { say: "¿Cuánto le debo?", intent: "ask_total", step: "more" },
    // that's all, the bag, paying
    { say: "Es todo", intent: "more_no", step: "more" },
    { say: "Nada más, gracias", intent: "more_no", step: "more" },
    { say: "Sí, traigo bolsa", intent: "bag_yes", step: "bag" },
    { say: "No traigo", intent: "bag_no", step: "bag" },
    { say: "¿Me da una bolsa?", intent: "bag_no", step: "bag" },
    { say: "Aquí tiene", intent: "pay_cash", step: "pay" },
    { say: "Solo tengo de quinientos", intent: "big_bill", step: "pay", slots: { bill: 50000 } },
    { say: "¿Tiene cambio de quinientos?", intent: "big_bill", step: "pay", slots: { bill: 50000 } },
    { say: "Le pago con un billete de doscientos", intent: "big_bill", step: "pay", slots: { bill: 20000 } },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "¿Le puedo hacer una transferencia?", intent: "pay_transfer", step: "pay" },
    { say: "¿Me lo deja en cien?", intent: "haggle" },
    // never flip the meaning
    { say: "No quiero cebolla", intent: "reject", not: ["order"] },
    { say: "No, mejor no quiero los mangos", intent: "reject", not: ["order"] },
    { say: "No cilantro", intent: "reject", not: ["order"] },
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
    { name: "a card first, then cash; asking for a discount", turns: ["Dos kilos de papas", "Y un manojo de cilantro", "¿Me lo deja en cien?", "Es todo", "¿Acepta tarjeta?", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
    { name: "changed my mind", turns: ["Medio kilo de cebolla y un kilo de jitomate", "No, mejor no quiero cebolla", "Y un cuarto de chile habanero", "Es todo", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true, state: { buys: { 0: { id: "jitomate", qty: 1000 }, 1: { id: "habanero", qty: 250 } } } }, auto: MERCADO_AUTO, setup: (s) => { s.bigBill = false; s.askBag = false; } },
  ],
};

/** The pilón: on some visits Lupe adds a little cilantro for free (or after a request for a discount). */
function pilon(c: Ctx) {
  if (!c.s.pilon || c.s.pilonGiven) return;
  c.s.pilonGiven = true;
  c.twist("pilon");
  c.say("pilon");
}

export default mercado;
