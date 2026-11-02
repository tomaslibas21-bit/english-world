// Song 72 "Eat In or Take Away?" → Puerto Colibrí: "¿Para aquí o para llevar?"
// Café La Ceiba on the zócalo, barista Mariana (usted). The Spanish edition's reference situation: it shows every
// feature an executor needs (docs/es/STYLE.md, docs/es/AUTHORING-ES.md). Built on the English edition's café
// (src/content/situations/s72-cafe.ts): the same steps, intents and handlers, with a Mexican menu (café de olla,
// horchata, agua de jamaica, conchas), pesos, usted, and two lines with a neutral twin ("ahorita", "ticket").

import type { Ctx, EntityDef, SituationDef, Suggestion } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Menu (prices in cents of a peso)

export const DRINKS: EntityDef[] = [
  ent("americano", "americano", "americano", "m", { pl: "americanos", forms: ["cafe americano", "americanos"],
    attrs: { sized: true, iced: true, price: [3500, 4000, 4500], cup: true } }),
  ent("cappuccino", "capuchino", "cappuccino", "m", { pl: "capuchinos", ltPl: "cappuccinos",
    forms: ["cappuccino", "capuccino", "capuchinos", "capucchino", "capucino", "cappuccinos"], attrs: { sized: true, milky: true, price: [4500, 5000, 5500] } }),
  ent("latte", "latte", "latte", "m", { pl: "lattes", forms: ["late", "lattes", "cafe latte", "lates"],
    attrs: { sized: true, milky: true, iced: true, price: [4500, 5000, 5500] } }),
  ent("espresso", "expreso", "espresso", "m", { pl: "expresos", ltPl: "espressos", forms: ["espresso", "expresso", "expres", "espressos", "expresos"], attrs: { price: 3500 } }),
  ent("cafe_de_olla", "café | de | olla", "coffee | from | pot", "m", { pl: "cafés | de | olla", ltPl: "coffees | from | pot",
    forms: ["cafe de olla", "cafes de olla", "de olla", "cafecito de olla"], chip: "café de olla",
    attrs: { sized: true, price: [3500, 4000, 4500], cup: true, nat: "café de olla (spiced pot coffee)", natPl: "cafés de olla (spiced pot coffee)" } }),
  ent("mocha", "moka", "mocha", "m", { pl: "mokas", ltPl: "mochas", forms: ["mocha", "mocca", "moca", "mokas", "cafe moka"],
    attrs: { sized: true, milky: true, iced: true, price: [5000, 5500, 6000] } }),
  ent("coffee", "café", "coffee", "m", { pl: "cafés", ltPl: "coffees", forms: ["cafecito", "cafes"], attrs: { generic: "coffee", sized: true, cup: true } }),
  ent("chocolate", "chocolate", "hot chocolate", "m", { pl: "chocolates", ltPl: "hot chocolates", forms: ["chocolate caliente", "chocolates", "chocolate de leche"],
    attrs: { sized: true, price: [4000, 4500, 5000], cup: true } }),
  ent("tea", "té", "tea", "m", { pl: "tés", ltPl: "teas", forms: ["tecito", "infusion", "tes"], attrs: { generic: "tea", price: 3000, cup: true } }),
  ent("chamomile_tea", "té | de | manzanilla", "tea | of | chamomile", "m", { forms: ["manzanilla", "te de manzanilla"], chip: "té de manzanilla",
    attrs: { price: 3000, cup: true, nat: "chamomile tea" } }),
  ent("mint_tea", "té | de | hierbabuena", "tea | of | mint", "m", { forms: ["hierbabuena", "yerbabuena", "te de yerbabuena", "te de menta", "menta"], chip: "té de hierbabuena",
    attrs: { price: 3000, cup: true, nat: "mint tea" } }),
  ent("green_tea", "té | verde", "tea | green", "m", { forms: ["te verde"], attrs: { price: 3000, iced: true, cup: true, nat: "green tea" } }),
  ent("black_tea", "té | negro", "tea | black", "m", { forms: ["te negro", "te ingles", "earl grey"], attrs: { price: 3000, iced: true, cup: true, nat: "black tea" } }),
  ent("horchata", "horchata", "horchata", "f", { pl: "horchatas", forms: ["orchata", "horchatas", "agua de horchata"],
    attrs: { sized: true, cold: true, price: [3500, 4000, 4500], nat: "horchata (rice and cinnamon drink)" } }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "un", def: "el", pl: "aguas | de | jamaica", ltPl: "waters | of | hibiscus",
    forms: ["jamaica", "agua de jamaica", "aguas de jamaica", "de jamaica"], chip: "agua de jamaica",
    attrs: { sized: true, cold: true, price: [3500, 4000, 4500], nat: "hibiscus water", natPl: "hibiscus waters" } }),
];

export const FOODS: EntityDef[] = [
  ent("concha", "concha", "concha", "f", { pl: "conchas", forms: ["conchita", "conchas"], attrs: { kind: "pan", price: 2500, nat: "concha (sweet bun)", natPl: "conchas (sweet buns)" } }),
  ent("croissant", "cuernito", "croissant", "m", { pl: "cuernitos", ltPl: "croissants", forms: ["croissant", "cruasan", "cuerno", "cuernitos", "croissants"], attrs: { kind: "pan", price: 3000 } }),
  ent("donut", "dona", "doughnut", "f", { pl: "donas", ltPl: "doughnuts", forms: ["donas", "donut", "dona de chocolate"], attrs: { kind: "pan", price: 2500 } }),
  ent("pan", "pan", "pastry", "m", { pl: "panes", ltPl: "pastries", forms: ["pan dulce", "panes", "panecito", "pancito", "pan de dulce"], attrs: { generic: "pan" } }),
  ent("cookie", "galleta", "cookie", "f", { pl: "galletas", ltPl: "cookies", forms: ["galletas", "galletita", "galleta de chocolate"], attrs: { price: 2000 } }),
  ent("muffin", "mantecada", "muffin", "f", { pl: "mantecadas", ltPl: "muffins", forms: ["mantecadas", "muffin", "panque", "panquecito", "magdalena"], attrs: { price: 2500 } }),
  ent("torta", "torta | de | jamón", "sandwich | of | ham", "f", { pl: "tortas | de | jamón", ltPl: "sandwiches | of | ham",
    forms: ["torta", "tortas", "torta de jamon", "sandwich", "sandwich de jamon", "emparedado"], attrs: { price: 6500, warm: true, nat: "ham torta (sandwich)", natPl: "ham tortas (sandwiches)" } }),
];

const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { forms: ["chica", "chiquito", "chiquita", "pequeno", "pequena", "corto", "tall", "el mas chico", "la mas chica"], chip: "chico" }),
  ent("medium", "mediano", "medium", "m", { forms: ["mediana", "regular", "normal", "medio"], chip: "mediano" }),
  ent("large", "grande", "large", "m", { forms: ["grandes", "grandote", "grandota", "el mas grande", "la mas grande", "extra grande", "venti"], chip: "grande" }),
];

const MILKS: EntityDef[] = [
  ent("whole", "leche | entera", "milk | whole", "f", { art: "", forms: ["entera", "leche normal", "leche regular", "leche de vaca"], chip: "leche entera", attrs: { nat: "whole milk" } }),
  ent("lactose_free", "leche | deslactosada", "milk | lactose-free", "f", { art: "", forms: ["deslactosada", "sin lactosa", "leche sin lactosa"], chip: "deslactosada", attrs: { nat: "lactose-free milk" } }),
  ent("light", "leche | light", "milk | skim", "f", { art: "", forms: ["light", "descremada", "leche descremada", "baja en grasa", "leche baja en grasa"], chip: "light", attrs: { nat: "skim milk" } }),
  ent("oat", "leche | de | avena", "milk | of | oat", "f", { art: "", forms: ["avena", "de avena"], chip: "de avena", attrs: { extra: 1000, nat: "oat milk" } }),
  ent("almond", "leche | de | almendra", "milk | of | almond", "f", { art: "", forms: ["almendra", "de almendra", "almendras", "leche de almendras"], chip: "de almendra", attrs: { extra: 1000, nat: "almond milk" } }),
  ent("soy", "leche | de | soya", "milk | of | soy", "f", { art: "", forms: ["soya", "de soya", "soja", "de soja", "leche de soja"], chip: "de soya", attrs: { extra: 1000, nat: "soy milk" } }),
];

const TEMPS: EntityDef[] = [
  ent("hot", "caliente", "hot", "m", { forms: ["calientito", "calientita"], chip: "caliente" }),
  ent("iced", "frío", "iced", "m", { forms: ["fria", "frios", "frias", "con hielo", "helado", "helada", "en las rocas"], chip: "frío" }),
];

const byId = (id: string) => [...DRINKS, ...FOODS, ...SIZES, ...MILKS, ...TEMPS].find((e) => e.id === id)!;
const SIZE_IDX: Record<string, number> = { small: 0, medium: 1, large: 2 };

// ---------------------------------------------------------------------------
// State helpers (as in the English edition's café)

interface Item {
  cat: "drink" | "food";
  id: string;
  qty: number;
  size?: string;
  milk?: string;
  noMilk?: boolean;
  temp?: string;
  extraShot?: boolean;
  decaf?: boolean;
  cupOf?: boolean;
}

function itemPrice(it: Item): number {
  const e = byId(it.id);
  const p = e.attrs?.price;
  let base = Array.isArray(p) ? p[SIZE_IDX[it.size || "medium"]] : (p ?? 3000);
  if (it.milk) base += byId(it.milk).attrs?.extra ?? 0;
  if (it.temp === "iced" && !e.attrs?.cold) base += 1000;
  if (it.extraShot) base += 1500;
  return base * it.qty;
}
const total = (c: Ctx) => (c.s.items as Item[]).reduce((a, it) => a + itemPrice(it), 0);

function fromSlot(v: any): Item | null {
  if (!v) return null;
  const tags: string[] = v.__tags || [];
  const qty = tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1;
  if (v.drink) {
    let id = v.drink as string;
    if (id === "coffee" && (tags.includes("cupof") || v.kind === "plain")) id = "americano";
    const it: Item = { cat: "drink", id, qty, size: v.size, milk: v.milk, temp: v.temp, cupOf: tags.includes("cupof") };
    if (tags.includes("nomilk")) it.noMilk = true;
    if (tags.includes("extra_shot")) it.extraShot = true;
    if (tags.includes("decaf")) it.decaf = true;
    if (tags.includes("iced")) it.temp = "iced";
    return it;
  }
  if (v.food) return { cat: "food", id: v.food, qty };
  return null;
}
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const items = (c: Ctx) => c.s.items as Item[];
const drinks = (c: Ctx) => items(c).filter((i) => i.cat === "drink");
const foods = (c: Ctx) => items(c).filter((i) => i.cat === "food");
const generic = (it: Item) => byId(it.id).attrs?.generic as string | undefined;
// size after the noun, "frío" only for a drink that is also served hot ("un latte grande frío"; a horchata is always cold)
const np = (it: Item) => ({ id: it.id, mods: [it.size && byId(it.id).attrs?.sized ? it.size : null, it.temp === "iced" && !byId(it.id).attrs?.cold ? "iced" : null].filter(Boolean) as string[], qty: it.qty });

/** Adds the ordered items; returns how many already-ordered items only changed their number. */
function addItems(c: Ctx, list: Item[], tags: string[]): number {
  const only = tags.includes("only") && !tags.includes("another");
  const qtySaid = tags.some((x) => /^q\d$/.test(x));
  let fixed = 0;
  for (const it of list) {
    // Answering "¿Qué café?" / "¿Qué té?" / "¿Qué pan?": replace the generic item, keep its details
    const g = items(c).find((x) => generic(x) && byId(x.id).attrs?.generic === (byId(it.id).attrs?.generic ?? kindOf(it.id)));
    if (g && !generic(it)) {
      Object.assign(g, { ...it, size: it.size ?? g.size, milk: it.milk ?? g.milk, temp: it.temp ?? g.temp, qty: g.qty });
      continue;
    }
    const prev = only ? items(c).find((x) => x.id === it.id) : undefined;
    if (prev) {
      if (qtySaid && prev.qty !== it.qty) { prev.qty = it.qty; fixed++; } else if (c.step === "more") c.s.moreDone = true;
      for (const k of ["size", "milk", "temp"] as const) if (it[k]) prev[k] = it[k];
      continue;
    }
    const same = !tags.includes("another") && items(c).find((x) => x.id === it.id && !it.size && !it.milk && it.qty === 1 && x === items(c)[items(c).length - 1] && c.step !== "more");
    if (same) { Object.assign(same, { ...same, ...Object.fromEntries(Object.entries(it).filter(([, v]) => v != null)) }); continue; }
    items(c).push(it);
  }
  if (tags.includes("togo")) c.s.dine = "togo";
  if (tags.includes("here")) c.s.dine = "here";
  return fixed;
}
function kindOf(id: string): string | undefined {
  if (["americano", "cappuccino", "latte", "espresso", "cafe_de_olla", "mocha"].includes(id)) return "coffee";
  if (id.endsWith("_tea")) return "tea";
  if (byId(id)?.attrs?.kind === "pan") return "pan";
  return undefined;
}

function applyDetail(c: Ctx, key: "size" | "milk" | "temp", value: string | null, extra: Partial<Item> = {}) {
  const target = key === "size"
    ? drinks(c).find((d) => !d.size && byId(d.id).attrs?.sized) ?? drinks(c).at(-1)
    : key === "milk"
      ? drinks(c).find((d) => !d.milk && !d.noMilk && (byId(d.id).attrs?.milky || c.step === "milk")) ?? drinks(c).at(-1)
      : drinks(c).find((d) => !d.temp) ?? drinks(c).at(-1);
  if (!target) return false;
  if (key === "size" && !byId(target.id).attrs?.sized) { c.say("one_size"); return true; }
  if (value) (target as any)[key] = value;
  Object.assign(target, extra);
  return true;
}

/** Out of oat milk (twist): Mariana offers almond or soy. A yes/no question that also takes another milk. */
function offerAltMilk(c: Ctx) {
  c.twist("out_of_oat");
  c.s.oatOut = true;
  c.say("out_of_oat"); c.say("offer_alt_milk");
  c.expect({ id: "alt_milk", expects: ["milk_ans"], hints: ["milk"], suggest: [{ lt: "Choose another milk", hint: "milk", options: ["almond", "soy", "whole"] }],
    yes: (cc) => { applyDetail(cc, "milk", "almond"); cc.say("ack"); },
    no: (cc) => { cc.ask("milk"); },
    on: { milk_ans: (cc, sl, sg) => { cafe.handlers.milk_ans(cc, sl, sg); } },
    ask: (cc) => cc.say("offer_alt_milk") });
}

/** "¿Tienen conchas?" – "¡Sí, tenemos! ¿Le doy una concha?" (a yes adds one). */
function offerFood(c: Ctx, id: string) {
  const X = { id, mods: [], qty: 1 };
  c.s.offered = id;
  c.say("offer_food", { X });
  c.expect({ id: "food_offer", optional: true, expects: ["order", "offer_ctx", "change"], hints: ["g_yesno", "order_food"],
    suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Order something else", hint: "order_food", options: "food" }],
    yes: (cc) => { if (cc.s.offered) cafe.handlers.offer_ctx(cc, {}, { intent: "offer_ctx", slots: {}, tags: [] }); },
    on: { change: (cc, sl, sg) => { if (!sl.item) return false; cc.s.offered = undefined; cafe.handlers.order(cc, { items: { item: sl.item } }, sg); return true; } },
    no: (cc) => { cc.s.offered = undefined; cc.s.foodDeclined = true; cc.say("no_problem"); },
    ask: (cc) => cc.say("offer_food", { X }) });
}

const kindAsked = (c: Ctx) => generic(items(c).find((i) => generic(i)) ?? items(c)[0] ?? { cat: "drink", id: "coffee", qty: 1 });
// "¿Qué té?" – "De manzanilla." / "Hierbabuena."; "¿Qué pan?" – "Una concha." / "Concha."; "¿Qué café?" – "Negro."
const KIND_CHOICE: Record<string, Record<string, string>> = {
  tea: { manzanilla: "chamomile_tea", hierbabuena: "mint_tea", verde: "green_tea", negro: "black_tea" },
  pan: { concha: "concha", cuernito: "croissant", dona: "donut" },
  coffee: { negro: "americano", americano: "americano", olla: "cafe_de_olla" },
};
const KIND_SUGGEST: Record<string, Suggestion[]> = {
  tea: [{ lt: "Choose a tea", hint: "kind_tea", options: ["chamomile_tea", "mint_tea", "green_tea", "black_tea"] }],
  pan: [{ lt: "Choose a pastry", hint: "kind_pan", options: ["concha", "croissant", "donut"] }],
  coffee: [{ lt: "Choose a coffee", hint: "order_drink", options: ["americano", "cafe_de_olla", "latte", "cappuccino", "espresso", "mocha"] }],
};
function kindList(c: Ctx) {
  const g = kindAsked(c);
  c.say(g === "tea" ? "ask_kind_tea" : g === "pan" ? "ask_kind_pan" : "coffee_list");
}

/** The order is complete: Mariana serves it. */
function serve(c: Ctx) {
  if (c.s.served) return;
  c.s.served = true;
  c.complete();
  if (drinks(c)[0]) c.remember({ lastDrink: drinks(c)[0] });
  c.say(c.s.dine === "here" ? "closing_here" : "closing_togo");
  c.event("serve", { items: items(c), dine: c.s.dine });
}

// Automatic answers the simulation uses when Mariana asks one of her optional questions.
const CAFE_AUTO: Record<string, string> = {
  order: "Un latte, por favor", kind: "Un americano", size: "Mediano", milk: "Leche entera", whole_ok: "Sí", alt_milk: "Sí, está bien",
  temp: "Caliente, por favor", warm: "Sí, por favor", more: "Es todo", dine: "Para llevar", name: "Ryan", pay: "Con tarjeta",
  receipt: "No, gracias", usual: "Sí, por favor",
};

// ---------------------------------------------------------------------------

export const cafe: SituationDef = {
  id: "s72-cafe",
  song: 72,
  songTitle: "Eat In or Take Away?",
  title: { en: "¿Para aquí o para llevar?", lt: "For here or to go?" },
  topic: { en: "En la cafetería", lt: "At the café" },
  chapter: 2,
  order: 2,
  location: "sunny-cup",
  npc: "mia",
  goal: "Order a drink (and something to eat, if you like), say whether it's for here or to go, and pay.",
  intro: "Café La Ceiba is on the zócalo, under a big ceiba tree. Mariana is behind the counter; the menu is on the board behind her. Prices are in pesos: $45 means 45 pesos.",
  entities: { drink: DRINKS, food: FOODS, size: SIZES, milk: MILKS, temp: TEMPS },

  grammar: {
    macros: {
      order_prefix: [
        "quisiera #h:quisiera", "me gustaria #h:quisiera", "quisiera pedir", "quisiera ordenar", "me gustaria pedir",
        "me da #h:me_da", "me das #h:me_da #tip:tu_staff", "deme #h:deme", "dame #tip:tu_staff",
        "me puede dar #h:me_puede_dar", "me podria dar #h:me_puede_dar", "me puedes dar #tip:tu_staff", "me podrias dar #tip:tu_staff",
        "me regala", "me trae", "me sirve", "sirvame", "me pone", "pongame", "ponme #tip:tu_staff", "me pones #tip:tu_staff",
        "quiero #h:quiero", "quiero pedir", "quiero ordenar", "queremos", "quisieramos",
        "voy a querer #h:voy_a_querer", "vamos a querer", "voy a pedir", "voy a tomar", "le pido",
        "para mi #h:para_mi", "a mi me da", "tambien (quisiera | quiero | me da) #h:food_also", "y tambien (quisiera | me da)",
        "(puedo | podria) (pedir | tener | ordenar)", "se puede pedir", "se me antoja", "tomo #blunt", "yo tomo #blunt",
        "(mejor)? (deme | me da)",
      ],
      qty: "(un #q1 | una #q1 | uno #q1 | dos #q2 | tres #q3 | otro #q1 #another | otra #q1 #another | una taza de #cupof | un vaso de #cupof | solo un #q1 #only | solo una #q1 #only | nomas un #q1 #only | nomas una #q1 #only | nada mas un #q1 #only | nada mas una #q1 #only | solamente un #q1 #only | solo #only)",
      dine: "(para llevar #togo | para aqui #here | para tomar aqui #here | para comer aqui #here | aqui #here | para aca #here | para llevarmelo #togo | para ir #togo #tip:para_llevar | para irme #togo #tip:para_llevar)",
      // English word order ("un grande latte") is understood too
      drink_pre: "({size} | {temp} | descafeinado #decaf | doble #extra_shot)",
      drink_post: "({size} | de tamano {size} | tamano {size} | {temp} | con {milk} | con leche | sin leche #nomilk | negro #nomilk | sin azucar | con azucar | descafeinado #decaf | doble #extra_shot | con carga extra #extra_shot | con shot extra #extra_shot | extra caliente | bien caliente | con hielo #iced | sin hielo | @dine | con (canela | vainilla | crema batida | crema) | para (mi | mi esposa | mi esposo | mi hijo | mi hija | mi amigo | mi amiga | mi novio | mi novia))",
    },
    slots: {
      kind: { lexicon: [{ id: "plain", forms: ["normal", "regular", "de la casa", "del dia", "de grano"] }] },
      // a short answer to "¿Qué té / qué pan / qué café?" (see KIND_CHOICE)
      choice: { lexicon: [
        { id: "manzanilla", forms: ["manzanilla", "de manzanilla"] }, { id: "hierbabuena", forms: ["hierbabuena", "yerbabuena", "de hierbabuena", "menta", "de menta"] },
        { id: "verde", forms: ["verde"] }, { id: "negro", forms: ["negro"] }, { id: "olla", forms: ["de olla"] }, { id: "americano", forms: ["americano"] },
        { id: "concha", forms: ["concha", "conchita"] }, { id: "cuernito", forms: ["cuernito", "cuerno"] }, { id: "dona", forms: ["dona"] },
      ] },
      item: { pattern: [
        "[@qty] [@drink_pre] {drink} [@drink_post] [@drink_post] [@drink_post]",
        "[@qty] {food} [calientita | caliente | @dine]",
      ] },
      items: { pattern: "{item} [(y | y un | y una | mas | con | y tambien | y luego | tambien) {item}] [(y | mas) {item}]" },
      thing: { pattern: "({drink} | {food} | {milk} | descafeinado #decaf | azucar #sugar)" },
    },
  },

  intents: {
    order: { patterns: ["@order_prefix {items} [@dine]", "[solo #only | nomas #only | nada mas #only] {items} [@dine]", "@dine {items}",
      "{items} (esta bien | estaria bien | seria perfecto | me parece bien)"] },
    size_ans: { patterns: [
      "[el | la | uno | una] {size}", "de tamano {size}", "tamano {size}", "@order_prefix [el | la | uno | una] {size}",
      "(mejor | que sea) [el | la | uno | una] {size} #h:make_it", "[el | la] {size} (esta bien | me parece bien | es suficiente) #h:size_fine",
      "no tan grande [[el | la | uno | una] {size}] #small",
    ] },
    milk_ans: { patterns: [
      "[solo] {milk} #h:milk_please", "con {milk} #h:milk_with", "@order_prefix {milk} #h:milk_can",
      "(sin | no) leche #nomilk #h:milk_none", "negro #nomilk", "nada de leche #nomilk", "sin leche y sin azucar #nomilk", "sin azucar y sin leche #nomilk",
      "[solo] leche (normal | regular) #regular #h:milk_regular", "(con)? un poco de leche #regular", "(cualquiera | la que sea | la que tenga) #regular",
      "{milk} (esta bien | me parece bien | estaria bien)", "(entonces | mejor) [con] {milk}",
      // a change of milk later on: "Mejor con leche de avena", "¿Me la puede cambiar a leche de soya?"
      "[mejor] (puede | podria | me puede | me podria) (cambiar | cambiarla | cambiarlo) (a | por) {milk}", "{milk} en (vez | lugar) [de eso]",
      "[mejor] (lo | la) quiero con {milk}",
    ] },
    temp_ans: { patterns: ["{temp}", "(lo | la) quiero {temp}", "(mejor)? {temp}", "{temp} (esta bien | mejor)"] },
    dine_ans: { patterns: [
      "@dine #h:dine_short", "es @dine #h:dine_its", "(me lo | me la) (tomo | como) aqui #here #h:dine_have_here",
      "(me lo | me la | lo | la) llevo #togo #h:dine_take", "(me lo | me la) (da | puede dar) @dine #h:dine_can",
      "me quedo aqui #here", "voy a (tomarlo | tomarla | comerlo | comerla) aqui #here", "(me lo | me la | lo | la) voy a llevar #togo",
      "para (tomar | comer) aqui #here", "(voy | ando) con prisa #togo", "aqui esta bien #here",
    ] },
    more_no: { patterns: [
      "(es | seria | eso es | eso seria) todo #h:more_all", "nada mas #h:more_nothing", "(asi | asi esta) bien #h:more_good",
      "(solo | nomas) (eso | el cafe | la bebida)", "no quiero nada mas", "no necesito nada mas", "(con eso | asi) es suficiente",
      "nada de comer", "no tengo hambre", "no quiero nada de comer", "es suficiente", "no gracias asi esta bien",
    ] },
    more_yes: { patterns: ["(si | ah si) (algo mas | otra cosa)", "otra cosa", "algo mas", "una cosa mas", "si quisiera algo mas"] },
    pay_card: { patterns: [
      "(puedo | se puede) pagar con tarjeta #h:pay_card", "con tarjeta #h:pay_card_short", "tarjeta", "(aceptan | acepta | toman) tarjeta #h:take_cards",
      "(pago | voy a pagar | le pago) con tarjeta", "(con)? (tarjeta)? de (credito | debito)", "(con)? (la | mi) tarjeta", "con tarjeta esta bien",
    ] },
    // "No traigo efectivo": so it's the card (never read as "efectivo")
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] efectivo", "sin efectivo", "no puedo pagar en efectivo"] },
    pay_cash: { patterns: ["[puedo] pagar en efectivo", "en efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago) en efectivo #h:pay_cash", "con efectivo"] },
    pay_phone: { patterns: ["(puedo | se puede) pagar con (el | mi)? (celular | telefono)", "con (el | mi)? (celular | telefono)",
      "(aceptan | acepta) (apple pay | google pay) #h:apple_pay", "apple pay", "google pay"] },
    here_you_go: { patterns: ["aqui tiene #h:here_you_go", "aqui esta", "tenga", "aqui le dejo", "aqui tiene mi tarjeta", "aqui tiene {price}", "aqui (tiene | estan) los {price}"] },
    keep_change: { patterns: ["quedese con el cambio #h:keep_change", "el cambio es para usted", "asi esta bien quedese con el cambio"] },
    ask_price: { patterns: [
      "cuanto (cuesta | es | vale | sale) [el | la | un | una] {item} #h:q_price", "cuanto (cuesta | es | sale) [eso]", "a como (esta | sale) [el | la] {item}",
      "cuanto le debo", "cuanto (es | seria) [todo]", "cual es el precio de [el | la | un | una] {item}", "que precio tiene [el | la] {item}",
      "cuanto cuesta el {size}", "[el | la] {item} cuanto (cuesta | es)",
    ] },
    ask_menu: { patterns: [
      "que (tiene | tienen | hay) #h:q_menu", "que (tipos | clases) de (cafe | bebidas | te | pan | leche) (tiene | tienen | hay) #h:q_kinds",
      "(me | nos) (deja | puede dar) [ver] el menu", "(tiene | tienen) menu", "que hay en el menu", "que opciones hay",
      "que tamanos (tiene | tienen | hay) #h:q_sizes", "que (leches | tipo de leche) (tiene | tienen | hay)",
    ] },
    ask_recommend: { patterns: [
      "que me recomienda #h:q_recommend", "que (es | esta) (bueno | rico) [aqui]", "que me (sugiere | aconseja)", "cual es (el mas popular | su favorito | la especialidad)",
      "que me recomienda para (comer | tomar)", "alguna recomendacion", "que me recomiendas #tip:tu_staff",
    ] },
    want_food: { patterns: [
      "(quisiera | quiero | me gustaria) algo (de comer | para comer) #h:want_food", "algo (de comer | para comer)", "tengo hambre",
      "que (tiene | tienen | hay) (de comer | para comer)", "que (pan | comida) (tiene | tienen | hay)", "(tiene | tienen) algo (de comer | dulce | para comer)",
      "algo dulce", "y de comer", "(tiene | tienen | hay) pan dulce",
      "@order_prefix (pan | pan dulce | un pan | algo dulce | un postre) #pick", "[y | tambien] [un] (pan | pan dulce | postre) #pick",
    ] },
    ask_have: { patterns: ["(tiene | tienen | hay) {thing} #h:q_have", "(puedo | podria) (pedir | tener) {thing} (en vez | en lugar) [de eso] #get"] },
    ask_have_unknown: { patterns: ["(tiene | tienen | hay) {w:any}"] },
    ask_wifi: { patterns: ["(tiene | tienen | hay) (wifi | internet) #h:q_wifi", "cual es la (contrasena | clave) del (wifi | internet) #h:q_password",
      "(la)? (contrasena | clave) del wifi", "me (da | puede dar) la (contrasena | clave) del wifi", "el wifi es gratis"] },
    ask_restroom: { patterns: ["donde (esta | queda) el bano #h:q_restroom", "(tiene | tienen | hay) bano", "puedo (usar | pasar a) el bano", "me presta el bano", "donde estan los banos"] },
    ask_water: { patterns: ["(me da | me puede dar | me regala | quisiera) [un vaso de] agua #h:q_water", "un vaso de agua", "agua natural"] },
    ask_sugar: { patterns: ["(me da | me puede dar) [un poco de] azucar", "donde esta el azucar", "(tiene | tienen) azucar", "(servilletas | popotes | pajitas | tapas)"] },
    change: { patterns: [
      "[mejor] (puede | podria) cambiar(lo | la)? (por | a) {item} #h:change", "mejor {item}", "{item} en (vez | lugar) [de eso]", "mejor que sea [un | una] {size}",
      "[mejor] @order_prefix {item} en (vez | lugar) [de eso]",
    ] },
    reject: { patterns: [
      "[mejor] no (quiero | voy a querer) {item}", "no {item}", "(cancele | quite | olvide) [el | la] {item}", "no tomo {item}",
      "[mejor] ya no (lo | la) quiero", "cambié de opinion", "olvidelo",
    ] },
    // "No un capuchino, un latte": the second item replaces the first (never an order for the first)
    correction: { patterns: ["no {item} sino {item}", "no {item} [mejor] {item}", "{item} no {item}", "[mejor] {item} en (vez | lugar) de {item}", "dije {item}"] },
    // "¿Le doy una concha?" – "Sí, me encantaría." / "Dos, por favor." (only while that is asked)
    offer_ctx: { patterns: ["@order_prefix (uno | una | eso | esa | ese | unos | unas)", "@order_prefix (dos #q2 | tres #q3)",
      "(uno | una | dos #q2 | tres #q3)", "me encantaria"] },
    // "¿Qué té?" – "De manzanilla." (only while the kind is asked)
    kind_ctx: { patterns: ["[el | la] {choice}", "@order_prefix [el | la | un | una] {choice}", "{choice} (esta bien | por favor)"] },
    qty_one: { patterns: ["(solo | nomas | nada mas) (uno | una)", "mejor (solo)? (uno | una)", "con (uno | una) (es suficiente | basta)", "(solo | nomas) (necesito | quiero) (uno | una)"] },
    order_unknown: { patterns: ["@order_prefix {w:any}"] },
    order_partial: { patterns: ["@order_prefix {items} (y | con | mas) {w:any}", "{items} (y | con) {w:any}"] },
    name_ctx: { patterns: ["[es | soy | me llamo | mi nombre es | a nombre de] {name} #h:name_its", "(me llamo | mi nombre es) {name} #h:name_mine",
      "(a nombre de | para) {name}", "[es | soy] {name} [se escribe] {letters}"] },
    no_receipt: { patterns: ["no (necesito | quiero) [el | un] (ticket | recibo)", "sin (ticket | recibo)"] },
    // "No, no lo necesito" (to "¿Quiere su ticket?")
    no_receipt_ctx: { patterns: ["[no] no (lo | la) necesito", "[no] no es necesario", "[no] (asi | asi esta) bien"] },
    receipt_yes_ctx: { patterns: ["[si] (lo | la) (necesito | quiero)", "[si] (deme | me lo da)"] },
    want_receipt: { patterns: ["(me | nos) (da | puede dar) [el | un | mi] (ticket | recibo)", "(quisiera | quiero | necesito) [el | un | mi] (ticket | recibo)", "[el | mi] (ticket | recibo)"] },
    togo_bag: { patterns: ["(me da | me puede dar | tiene) [una | un] (bolsa | tapa | popote | servilleta | portavasos)"] },
  },

  lines: {
    food_menu: [
      t("De | comer | tenemos | conchas, | cuernitos, | donas | y | galletas.", "To | eat | we have | conchas, | croissants, | doughnuts | and | cookies.", "To eat, we have conchas, croissants, doughnuts and cookies."),
      t("Tenemos | pan dulce, | galletas | y | tortas | de | jamón.", "We have | sweet bread, | cookies | and | sandwiches | of | ham.", "We have Mexican pastries, cookies and ham tortas."),
    ],
    rec_food: [
      t("¡Las | conchas | están | recién | hechas!", "The | conchas | are | just | made!", "The conchas are freshly baked!"),
      t("Pruebe | una | concha. | Están | muy | ricas.", "Try | a | concha. | They're | very | tasty.", "Try a concha. They're really good."),
    ],
    food_pick: [
      t("¿Qué | le | gustaría?", "What | (to) you | would please?", "What would you like?", { flags: { 2: "gustaría: “would please” – le gustaría = would you like (usted)." } }),
    ],
    ask_food_more: [
      t("¿Gusta | algo | de | comer?", "Would you like | something | of | eat?", "Would you like something to eat?", { flags: { 0: "Mexican and very polite: “¿Gusta…?” = would you like…?" } }),
    ],
    greet_howareyou: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?"),
      t("¡Buenas! | ¿Cómo | le | va?", "Hi! | How | (for) you | it-goes?", "Hi! How's it going?"),
      t("¡Hola! | ¿Qué tal | su | día?", "Hi! | How's | your | day?", "Hi! How's your day going?"),
    ],
    greet_order: [
      t("¡Buenos días! | ¿Qué | le | sirvo?", "Good morning! | What | (to) you | I-serve?", "Good morning! What can I get you?",
        { flags: { 2: "le: “(to) you” – the polite usted (tú: te)." } }),
      t("¡Buenas! | ¿Qué | va | a | tomar?", "Hi! | What | are you going | to | drink?", "Hi! What would you like to drink?"),
      t("¡{m:Bienvenido|f:Bienvenida}! | ¿Qué | le | preparo?", "Welcome! | What | (for) you | I-prepare?", "Welcome! What can I make for you?"),
      t("¡Hola! | ¿Qué | le | sirvo | hoy?", "Hi! | What | (to) you | I-serve | today?", "Hi! What can I get you today?"),
    ],
    greet_back: [
      t("¡Qué | gusto | {m:verlo|f:verla} | otra vez! | ¿Qué | le | sirvo?", "How | nice | to see you | again! | What | (to) you | I-serve?", "So nice to see you again! What can I get you?",
        { flags: { 2: "verlo / verla: “to see you”, with lo for a man and la for a woman (usted)." } }),
      t("¡{m:Bienvenido|f:Bienvenida} | de nuevo! | ¿Qué | va | a | querer | hoy?", "Welcome | back! | What | are you going | to | want | today?", "Welcome back! What would you like today?"),
    ],
    usual: [
      t("¡Hola | otra vez! | ¿Lo de siempre? | ¿{X.np}?", "Hi | again! | The usual? | {X.np}?", "Hi again! The usual? {X.np}?"),
    ],
    ask_order: [
      t("¿Qué | le | sirvo?", "What | (to) you | I-serve?", "What can I get you?"),
      t("¿Qué | va | a | querer?", "What | are you going | to | want?", "What would you like?"),
      t("Entonces, | ¿qué | le | preparo?", "So, | what | (for) you | I-prepare?", "So, what can I make for you?"),
    ],
    ask_what_else: [
      t("¡Claro! | ¿Qué | más | le | sirvo?", "Sure! | What | else | (to) you | I-serve?", "Sure! What else can I get you?"),
      t("Por supuesto. | ¿Qué | más | va | a | querer?", "Of course. | What | else | are you going | to | want?", "Of course. What else would you like?"),
    ],
    ask_kind_coffee: [
      t("¡Claro! | ¿Qué | café | le gustaría?", "Sure! | What | coffee | would you like?", "Sure! What kind of coffee would you like?"),
      t("¿Qué | tipo | de | café?", "What | kind | of | coffee?", "What kind of coffee?"),
    ],
    coffee_list: [
      t("Tenemos | americano, | latte, | capuchino | y | café | de | olla.", "We have | americano, | latte, | cappuccino | and | coffee | from | pot.", "We have americano, latte, cappuccino and café de olla."),
    ],
    ask_kind_tea: [
      t("¿Qué | té? | Tenemos | de | manzanilla, | de | hierbabuena, | verde | y | negro.", "Which | tea? | We have | of | chamomile, | of | mint, | green | and | black.",
        "Which tea? We have chamomile, mint, green and black."),
    ],
    ask_kind_pan: [
      t("¿Qué | pan | le | doy? | Hay | conchas, | cuernitos | y | donas.", "Which | pastry | (to) you | I-give? | There are | conchas, | croissants | and | doughnuts.",
        "Which pastry would you like? There are conchas, croissants and doughnuts."),
    ],
    ask_size: [
      t("¿De | qué | tamaño?", "Of | what | size?", "What size?"),
      t("¿Chico, | mediano | o | grande?", "Small, | medium | or | large?", "Small, medium or large?"),
      t("¿Y | de | qué | tamaño | lo | quiere?", "And | of | what | size | it | you-want?", "And what size would you like?"),
    ],
    ask_milk: [
      t("¿Con | qué | leche?", "With | what | milk?", "What kind of milk?"),
      t("¿Qué | leche | le | pongo? | Tenemos | entera, | deslactosada, | light | y | de | avena.", "What | milk | (for) you | I-put? | We have | whole, | lactose-free, | skim | and | of | oat.",
        "What milk would you like? We have whole, lactose-free, skim and oat."),
    ],
    milk_which: [
      t("¿Qué | leche | prefiere?", "What | milk | do you prefer?", "Which milk would you prefer?"),
    ],
    ask_whole_ok: [
      t("¿Con | leche | entera | está bien?", "With | milk | whole | is it okay?", "Is whole milk okay?"),
    ],
    ask_temp: [
      t("¿Caliente | o | frío?", "Hot | or | iced?", "Hot or iced?"),
      t("¿{lo@X} | quiere | caliente | o | {frío@X}?", "It | you-want | hot | or | cold?", "Would you like it hot or iced?",
        { flags: { 0: "lo / la: “it”, agreeing with the drink (el latte → lo, la moka → la)." } }),
    ],
    ask_more: [
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Le | sirvo | algo | más?", "(To) you | I-serve | something | more?", "Can I get you anything else?"),
      t("¿Sería todo?", "Would that be all?", "Will that be all?", { flags: { 0: "Mexican: what staff ask to close an order." } }),
    ],
    ask_dine: [
      t("¿Para aquí | o | para llevar?", "For here | or | to go?", "For here or to go?"),
      t("¿Es | para | tomar | aquí | o | para llevar?", "Is it | for | drinking | here | or | to go?", "Will you have it here or take it with you?"),
    ],
    ask_name: [
      t("¿A nombre de | quién?", "Under the name of | who?", "What's the name for the order?"),
      t("¿Me | da | su | nombre | para | el | pedido?", "(To) me | you-give | your | name | for | the | order?", "Can I get a name for the order?"),
    ],
    name_thanks: [
      t("¡Gracias! | Lo | escribo | en | el | vaso.", "Thanks! | It | I'll-write | on | the | cup.", "Thanks! I'll write it on the cup."),
      t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thanks!"),
    ],
    name_again: [
      t("Perdón, | ¿cómo | dijo | que | se llama?", "Sorry, | how | did you say | that | you're called?", "Sorry, what was the name?"),
    ],
    ack_order: [
      t("¡Claro!", "Sure!", "Sure!"),
      t("¡Buena | elección!", "Good | choice!", "Great choice!"),
      t("Perfecto.", "Perfect.", "Perfect."),
      t("¡Con gusto!", "My pleasure!", "My pleasure!"),
    ],
    ack: [
      t("Muy | bien.", "Very | good.", "Okay."),
      t("Entendido.", "Got it.", "Got it."),
      t("Perfecto.", "Perfect.", "Perfect."),
    ],
    one_size: [
      t("Ese | solo | lo | tenemos | de | un | tamaño.", "That one | only | it | we-have | in | one | size.", "That one only comes in one size."),
    ],
    say_total: [
      t("Son | {$price}.", "That's | {$price}.", "That's {$price}."),
      t("Serían | {$price}.", "That would be | {$price}.", "That'll be {$price}."),
      t("Su | total | es | de | {$price}.", "Your | total | is | of | {$price}.", "Your total is {$price}."),
    ],
    pre_total: [
      t("Muy | bien.", "Very | good.", "Alright."),
      t("Perfecto.", "Perfect.", "Perfect."),
      t("Listo.", "All set.", "All set."),
    ],
    ask_pay_method: [
      t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?"),
      t("¿Cómo | va | a | pagar?", "How | are you going | to | pay?", "How would you like to pay?"),
    ],
    card_tap: [
      t("Claro, | acerque | su | tarjeta | aquí.", "Sure, | bring close | your | card | here.", "Sure, just tap your card here."),
      t("Por supuesto. | Acerque | la | tarjeta | a | la | terminal.", "Of course. | Bring close | the | card | to | the | terminal.", "Of course. Tap your card on the card reader."),
    ],
    card_later: [
      t("Claro, | con | tarjeta | sí | se puede.", "Sure, | with | card | yes | it's possible.", "Sure, card is fine."),
    ],
    phone_ok: [
      t("¡Claro! | Acerque | su | celular | aquí.", "Sure! | Bring close | your | phone | here.", "Of course! Just hold your phone here."),
    ],
    cash_ok: [
      t("Claro, | en efectivo | está bien.", "Sure, | in cash | is fine.", "Sure, cash is fine."),
    ],
    change_back: [
      t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change."),
      t("Y | aquí tiene | su | cambio.", "And | here's | your | change.", "And here's your change."),
    ],
    thanks_tip: [
      t("¡Ay, | muchas | gracias!", "Oh, | many | thanks!", "Oh, thank you so much!"),
    ],
    paid: [
      t("¡Gracias!", "Thanks!", "Thank you!"),
      t("¡Perfecto, | gracias!", "Perfect, | thanks!", "Perfect, thanks!"),
    ],
    ask_receipt: [
      t("¿Quiere | su | ticket?", "Do you want | your | receipt?", "Would you like a receipt?",
        { flags: { 2: "Mexican: a receipt is a ticket. Elsewhere: recibo." }, neutral: t("¿Quiere | su | recibo?", "Do you want | your | receipt?", "Would you like a receipt?") }),
      t("¿Le | doy | su | ticket?", "(To) you | I-give | your | receipt?", "Do you need a receipt?",
        { flags: { 3: "Mexican: a receipt is a ticket. Elsewhere: recibo." }, neutral: t("¿Le | doy | su | recibo?", "(To) you | I-give | your | receipt?", "Do you need a receipt?") }),
    ],
    receipt_here: [t("Aquí tiene | su | ticket.", "Here's | your | receipt.", "Here's your receipt.", { neutral: t("Aquí tiene | su | recibo.", "Here's | your | receipt.", "Here's your receipt.") })],
    no_problem: [t("No hay problema.", "No problem.", "No problem."), t("Sin problema.", "No problem.", "No problem.")],
    closing_here: [
      t("¡Perfecto! | Siéntese | y | se lo | llevo.", "Perfect! | Have a seat | and | it to you | I'll-bring.", "Perfect! Have a seat, and I'll bring it over."),
      t("¡Muy | bien! | Se lo | llevo | a | su | mesa.", "Very | good! | It to you | I'll-bring | to | your | table.", "Great! I'll bring it to your table."),
    ],
    closing_togo: [
      t("¡Ahorita | sale! | Se lo | entrego | en | la | barra.", "Right now | it-comes-out! | It to you | I'll-hand | at | the | counter.", "Coming right up! I'll hand it to you at the counter.",
        { flags: { 0: "Mexican: ahorita = right now (or in a little while)." },
          neutral: t("¡Enseguida | sale! | Se lo | entrego | en | la | barra.", "Right away | it-comes-out! | It to you | I'll-hand | at | the | counter.", "Coming right up! I'll hand it to you at the counter.") }),
      t("¡Perfecto! | En | un | momento | se lo | entrego.", "Perfect! | In | a | moment | it to you | I'll-hand.", "Perfect! It'll be ready in a moment."),
    ],
    bye_after: [
      t("¡Que | lo | disfrute!", "(I hope) | it | you-enjoy!", "Enjoy!"),
      t("¡Buen provecho!", "Enjoy your meal!", "Enjoy!"),
      t("¡Que | tenga | buen día!", "(I hope) | you have | a good day!", "Have a great day!"),
    ],
    menu_line: [
      t("Tenemos | café, | té, | chocolate | y | pan dulce.", "We have | coffee, | tea, | hot chocolate | and | sweet bread.", "We have coffee, tea, hot chocolate and Mexican pastries."),
      t("El | menú | está | en | el | pizarrón.", "The | menu | is | on | the | board.", "The menu is on the board.",
        { flags: { 5: "Mexican: pizarrón = the board. Elsewhere: pizarra." }, neutral: t("El | menú | está | en | la | pizarra.", "The | menu | is | on | the | board.", "The menu is on the board.") }),
    ],
    size_list: [
      t("Tenemos | chico, | mediano | y | grande.", "We have | small, | medium | and | large.", "We have small, medium and large."),
    ],
    milk_list: [
      t("Tenemos | leche | entera, | deslactosada, | light, | de | avena, | de | almendra | y | de | soya.", "We have | milk | whole, | lactose-free, | skim, | of | oat, | of | almond | and | of | soy.",
        "We have whole, lactose-free, skim, oat, almond and soy milk."),
    ],
    food_list: [
      t("Tenemos | conchas, | cuernitos, | donas, | galletas | y | tortas | de | jamón.", "We have | conchas, | croissants, | doughnuts, | cookies | and | sandwiches | of | ham.",
        "We have conchas, croissants, doughnuts, cookies and ham tortas."),
    ],
    recommend: [
      t("Nuestro | café | de | olla | es | muy | famoso.", "Our | coffee | from | pot | is | very | famous.", "Our café de olla is very popular."),
      t("¡Pruebe | la | horchata! | Es | mi | favorita.", "Try | the | horchata! | It's | my | favorite.", "Try the horchata! It's my favorite."),
      t("Las | conchas | están | recién | hechas.", "The | conchas | are | just | made.", "The conchas are fresh out of the oven."),
    ],
    price_is: [
      t("{X.np} | cuesta | {$price}.", "{X.np} | costs | {$price}.", "{X.np} is {$price}."),
    ],
    which_item: [
      t("¿Cuál?", "Which one?", "Which one?"),
    ],
    have_yes: [
      t("¡Sí, | claro!", "Yes, | sure!", "Yes, we do!"),
      t("¡Sí | tenemos!", "Yes | we have!", "Sure do!"),
    ],
    offer_food: [
      t("¿Le | doy | {X.np}?", "(To) you | I-give | {X.np}?", "Would you like {X.np}?"),
    ],
    have_no: [
      t("Perdón, | eso | no lo tenemos.", "Sorry, | that | we don't have it.", "Sorry, we don't have that."),
    ],
    unknown_order: [
      t("Mmm, | perdón, | eso | no lo tenemos | aquí.", "Hmm, | sorry, | that | we don't have it | here.", "Hmm, sorry, we don't have that here."),
    ],
    wifi: [
      t("¡Sí! | La | contraseña | es | ceiba2026.", "Yes! | The | password | is | ceiba2026.", "Yes! The password is ceiba2026.",
        { say: "¡Sí! La contraseña es ceiba dos mil veintiséis.", spell: "ceiba2026", write: "Wi-Fi: CafeLaCeiba · contraseña: ceiba2026" }),
      t("Claro, | es | gratis. | La | contraseña | está | en | el | pizarrón: | ceiba2026.", "Sure, | it's | free. | The | password | is | on | the | board: | ceiba2026.",
        "Sure, it's free. The password is on the board: ceiba2026.",
        { say: "Claro, es gratis. La contraseña está en el pizarrón: ceiba dos mil veintiséis.", spell: "ceiba2026", write: "Wi-Fi: CafeLaCeiba · contraseña: ceiba2026",
          neutral: t("Claro, | es | gratis. | La | contraseña | está | en | la | pizarra: | ceiba2026.", "Sure, | it's | free. | The | password | is | on | the | board: | ceiba2026.",
            "Sure, it's free. The password is on the board: ceiba2026.",
            { say: "Claro, es gratis. La contraseña está en la pizarra: ceiba dos mil veintiséis.", spell: "ceiba2026", write: "Wi-Fi: CafeLaCeiba · contraseña: ceiba2026" }) }),
    ],
    restroom: [
      t("Está | al fondo, | a la izquierda.", "It's | at the back, | on the left.", "It's at the back, on the left."),
      t("Ahí, | junto | a | la | ventana.", "There, | next | to | the | window.", "Right there, by the window."),
    ],
    water: [
      t("¡Claro! | Aquí tiene | un | vaso | de | agua.", "Sure! | Here's | a | glass | of | water.", "Sure! Here's a glass of water."),
    ],
    sugar: [
      t("El | azúcar | está | en | la | barra, | junto | a | la | ventana.", "The | sugar | is | on | the | counter, | next | to | the | window.", "The sugar is on the counter by the window."),
    ],
    reject_ok: [
      t("¡No hay problema! | ¿Qué | le | sirvo | entonces?", "No problem! | What | (to) you | I-serve | then?", "No problem! What would you like instead?"),
    ],
    removed: [
      t("Muy | bien, | sin | {X}.", "Very | good, | without | {X}.", "Okay, no {X}."),
    ],
    changed: [
      t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem."),
      t("Listo, | ya | lo | cambié.", "Done, | already | it | I-changed.", "Okay, I changed it."),
    ],
    out_of_oat: [
      t("¡Ay, | perdón! | Hoy | se nos acabó | la | leche | de | avena.", "Oh, | sorry! | Today | we ran out of | the | milk | of | oat.", "Oh, sorry, we're out of oat milk today."),
    ],
    offer_alt_milk: [
      t("¿Le parece | bien | de | almendra | o | de | soya?", "Does it seem to you | fine | of | almond | or | of | soy?", "Would almond or soy milk be okay?"),
    ],
    card_down: [
      t("Perdón, | la | terminal | no funciona | ahorita.", "Sorry, | the | card reader | doesn't work | right now.", "Sorry, our card machine is down right now.",
        { flags: { 4: "Mexican: ahorita = right now." },
          neutral: t("Perdón, | la | terminal | no funciona | en | este | momento.", "Sorry, | the | card reader | doesn't work | at | this | moment.", "Sorry, our card machine is down right now.") }),
    ],
    card_back: [
      t("¡Ah, | espere, | ya | funciona!", "Oh, | wait, | already | it-works!", "Oh wait, it's working again!"),
    ],
    ask_warm: [
      t("¿Se la | caliento?", "For you it | I-warm-up?", "Would you like it warmed up?", { flags: { 0: "se la: “it for you” – la is the torta." } }),
    ],
    bag: [
      t("Claro, | aquí tiene.", "Sure, | here you go.", "Sure, here you go."),
    ],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      for (let c = 2000; c <= 50000; c += 500) s.add(c);
      return [...s];
    },
  },

  hints: {
    order_drink: {
      lt: "Order a drink", slot: "drink", examples: ["latte", "cafe_de_olla", "horchata", "cappuccino"],
      items: [
        { id: "quisiera", s: t("Quisiera | {X.np}, | por favor.", "I'd like | {X.np}, | please.", "I'd like {X.np}, please."), register: "polite" },
        { id: "me_da", s: t("¿Me | da | {X.np}, | por favor?", "(To) me | you-give | {X.np}, | please?", "Can I have {X.np}, please?"),
          note: "Very common in Mexico: “¿Me da…?” – literally “do you give me…?”" },
        { id: "quiero", s: t("Quiero | {X.np}, | por favor.", "I want | {X.np}, | please.", "I'd like {X.np}, please."), note: "With “por favor” this is perfectly polite in Spanish." },
        { id: "please_only", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "voy_a_querer", s: t("Voy | a | querer | {X.np}.", "I'm going | to | want | {X.np}.", "I'll have {X.np}."), note: "How Mexicans often order: “Voy a querer…” (I'll have…)." },
        { id: "me_puede_dar", s: t("¿Me | puede | dar | {X.np}?", "(To) me | can you | give | {X.np}?", "Could I have {X.np}?"), register: "polite" },
        { id: "para_mi", s: t("Para | mí, | {X.np}.", "For | me, | {X.np}.", "For me, {X.np}."), register: "casual" },
        { id: "deme", s: t("Deme | {X.np}, | por favor.", "Give me | {X.np}, | please.", "I'll take {X.np}, please."), note: "Fine with “por favor”; dame is the tú form, for friends." },
        { id: "cup_of", s: t("Quisiera | una | taza | de | {X}, | por favor.", "I'd like | a | cup | of | {X}, | please.", "I'd like a cup of {X}, please."),
          only: (e) => !!e.attrs?.cup && !e.en.includes(" | ") },
      ],
    },
    order_food: {
      lt: "Order something to eat", slot: "food", examples: ["concha", "croissant", "torta"],
      items: [
        { id: "food_also", s: t("¿Me | da | también | {X.np}?", "(To) me | you-give | also | {X.np}?", "Can I also get {X.np}?") },
        { id: "food_and", s: t("Y | {X.np}, | por favor.", "And | {X.np}, | please.", "And {X.np}, please.") },
        { id: "food_id_also", s: t("También | quisiera | {X.np}.", "Also | I'd like | {X.np}.", "I'd also like {X.np}.") },
        { id: "voy_a_querer", s: t("Voy | a | querer | {X.np}.", "I'm going | to | want | {X.np}.", "I'll have {X.np}.") },
      ],
    },
    kind_tea: {
      lt: "Choose a tea", slot: "drink", examples: ["chamomile_tea", "mint_tea", "green_tea"],
      items: [
        { id: "kind_please", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please."), only: (e) => /_tea$/.test(e.id) },
        { id: "quisiera", s: t("Quisiera | {X}, | por favor.", "I'd like | {X}, | please.", "I'd like {X}, please."), only: (e) => /_tea$/.test(e.id) },
      ],
    },
    kind_pan: {
      lt: "Choose a pastry", slot: "food", examples: ["concha", "croissant", "donut"],
      items: [
        { id: "kind_please", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please."), only: (e) => e.attrs?.kind === "pan" },
        { id: "me_da", s: t("¿Me | da | {X.np}?", "(To) me | you-give | {X.np}?", "Can I have {X.np}?"), only: (e) => e.attrs?.kind === "pan" },
      ],
    },
    more_food: {
      lt: "Order something to eat", slot: "food", examples: ["concha", "croissant", "torta"],
      items: [
        { id: "food_yes", s: t("Sí, | {X.np}, | por favor.", "Yes, | {X.np}, | please.", "Yes, {X.np}, please.") },
        { id: "food_id_also", s: t("También | quisiera | {X.np}.", "Also | I'd like | {X.np}.", "I'd also like {X.np}.") },
        { id: "food_also", s: t("¿Me | da | también | {X.np}?", "(To) me | you-give | also | {X.np}?", "Can I also get {X.np}?") },
      ],
    },
    size: {
      lt: "Choose the size", slot: "size", examples: ["large", "medium", "small"],
      items: [
        { id: "size_please", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "size_fine", s: t("{X} | está bien.", "{X} | is fine.", "{X} is fine.") },
        { id: "make_it", s: t("Mejor | {X}.", "Better | {X}.", "Make it {X}."), register: "casual" },
        { id: "q_sizes", s: t("¿Qué | tamaños | tiene?", "What | sizes | do you have?", "What sizes do you have?") },
      ],
    },
    milk: {
      lt: "Choose the milk", slot: "milk", examples: ["oat", "whole", "lactose_free"],
      items: [
        { id: "milk_please", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "milk_with", s: t("Con | {X}, | por favor.", "With | {X}, | please.", "With {X}, please.") },
        { id: "q_have", s: t("¿Tiene | {X}?", "Do you have | {X}?", "Do you have {X}?") },
        { id: "milk_none", s: t("Sin | leche, | gracias.", "Without | milk, | thanks.", "No milk, thanks.") },
        { id: "milk_regular", s: t("Leche | normal.", "Milk | regular.", "Just regular milk.") },
      ],
    },
    temp: {
      lt: "Hot or iced", slot: "temp", examples: ["hot", "iced"],
      items: [
        { id: "temp_please", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
      ],
    },
    dine: {
      lt: "Say: for here or to go",
      items: [
        { id: "dine_short", s: t("Para aquí, | por favor.", "For here, | please.", "For here, please.") },
        { id: "dine_short", s: t("Para llevar, | por favor.", "To go, | please.", "To go, please.") },
        { id: "dine_its", s: t("Es | para llevar.", "It's | to go.", "It's to go.") },
        { id: "dine_have_here", s: t("Me lo | tomo | aquí.", "It (for me) | I'll-drink | here.", "I'll have it here.") },
        { id: "dine_take", s: t("Me lo | llevo.", "It (for me) | I'll-take.", "I'll take it with me.") },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [
        { id: "more_all", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.") },
        { id: "more_nothing", s: t("Nada más, | gracias.", "That's all, | thanks.", "Nothing else, thanks.") },
        { id: "more_good", s: t("Así | está | bien, | gracias.", "Like this | it's | fine, | thanks.", "I'm good, thanks."), note: "A polite no: “it's fine like this”." },
      ],
    },
    name: {
      lt: "Say your name",
      items: [
        { id: "name_its", s: t("A nombre de | {$name}.", "Under the name of | {$name}.", "It's for {$name}.") },
        { id: "name_mine", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_cash", s: t("Pago | en efectivo.", "I'll-pay | in cash.", "I'll pay in cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "apple_pay", s: t("¿Aceptan | Apple Pay?", "Do you accept | Apple Pay?", "Do you take Apple Pay?") },
        { id: "keep_change", s: t("Quédese | con | el | cambio.", "Keep | with | the | change.", "Keep the change.") },
      ],
    },
    ask: {
      lt: "Ask about the menu and the café",
      items: [
        { id: "q_recommend", s: t("¿Qué | me | recomienda?", "What | (to) me | you-recommend?", "What do you recommend?") },
        { id: "q_kinds", s: t("¿Qué | tipos | de | café | tienen?", "What | kinds | of | coffee | do you have?", "What kinds of coffee do you have?") },
        { id: "q_menu", s: t("¿Qué | tienen?", "What | do you have?", "What do you have?") },
        { id: "q_wifi", s: t("¿Tienen | wifi?", "Do you have | Wi-Fi?", "Do you have Wi-Fi?") },
        { id: "q_password", s: t("¿Cuál | es | la | contraseña | del | wifi?", "What | is | the | password | of the | Wi-Fi?", "What's the Wi-Fi password?") },
        { id: "q_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?") },
        { id: "q_water", s: t("¿Me | da | un | vaso | de | agua?", "(To) me | you-give | a | glass | of | water?", "Could I get a glass of water?") },
      ],
    },
    ask_price: {
      lt: "Ask the price", slot: "drink", examples: ["latte", "cafe_de_olla"],
      items: [
        { id: "q_price", s: t("¿Cuánto | cuesta | {X.np}?", "How much | costs | {X.np}?", "How much is {X.np}?") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With staff, usted is more polite: “¿Me da…?”, “¿Me puede dar…?” (me das / me puedes is for friends).", better: "¿Me puede dar un latte?" },
    para_llevar: { key: "para_llevar", lt: "Understood! In Spanish “to go” is “para llevar” (literally “to carry”).", better: "Para llevar, por favor." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "order", lt: "Order a drink" },
    { step: "kind", lt: "Choose the kind", optional: true },
    { step: "size", lt: "Choose the size", optional: true },
    { step: "milk", lt: "Choose the milk", optional: true },
    { step: "temp", lt: "Hot or iced?", optional: true },
    { step: "warm", lt: "Warmed up or not?", optional: true },
    { step: "more", lt: "Finish the order (a snack if you like)" },
    { step: "dine", lt: "For here or to go?" },
    { step: "name", lt: "Give your name", optional: true },
    { step: "pay", lt: "Pay" },
  ],
  steps: [
    { id: "order", done: (c) => items(c).length > 0, ask: (c) => c.say("ask_order"),
      // "reject" too, so "No quiero café" is read as a whole (never "no" + an order)
      expects: ["order", "reject"],
      suggest: [
        { lt: "Order a coffee or another drink", hint: "order_drink", options: "drink" },
        { lt: "Order something to eat", hint: "order_food", options: "food" },
        { lt: "Ask what they have or what they recommend", hint: "ask" },
        { lt: "Ask how much it is", hint: "ask_price", options: "drink" },
      ],
      help: (c) => { c.say("menu_line"); c.say("ask_order"); } },
    { id: "kind", when: (c) => items(c).some((i) => generic(i)), done: () => false,
      ask: (c) => {
        const g = generic(items(c).find((i) => generic(i))!);
        if (g === "coffee") { c.say("ask_kind_coffee"); if (c.chance(0.6)) c.say("coffee_list"); }
        else if (g === "tea") c.say("ask_kind_tea");
        else c.say("ask_kind_pan");
      },
      expects: ["order", "kind_ctx"],
      suggest: (c) => KIND_SUGGEST[kindAsked(c) ?? "coffee"] ?? KIND_SUGGEST.coffee,
      help: (c) => { kindList(c); } },
    { id: "size", when: (c) => drinks(c).some((d) => byId(d.id).attrs?.sized && !d.size && !generic(d)), done: () => false,
      ask: (c) => c.say("ask_size"), expects: ["size_ans", "order"],
      suggest: [{ lt: "Choose the size", hint: "size", options: "size" }, { lt: "Ask the price", hint: "ask_price", options: "drink" }],
      help: (c) => { c.say("size_list"); } },
    { id: "milk", when: (c) => c.s.askMilk && drinks(c).some((d) => byId(d.id).attrs?.milky && !d.milk && !d.noMilk && !generic(d)), done: () => false,
      ask: (c) => {
        if (c.chance(0.3)) {
          c.say("ask_whole_ok");
          c.expect({ id: "whole_ok", expects: ["milk_ans"], hints: ["milk"], suggest: [{ lt: "Say yes or choose another milk", hint: "milk", options: "milk" }],
            yes: (cc) => { applyDetail(cc, "milk", "whole"); },
            no: (cc) => { cc.say(cc.s.oatOut ? "milk_which" : "ask_milk"); cc.hold(); },
            on: { milk_ans: (cc, sl, seg) => { cafe.handlers.milk_ans(cc, sl, seg); } },
            ask: (cc) => cc.say("ask_whole_ok") });
        } else c.say(c.s.oatOut ? "milk_which" : "ask_milk");
      },
      expects: ["milk_ans"],
      suggest: [{ lt: "Choose the milk (or no milk)", hint: "milk", options: "milk" }],
      help: (c) => { c.say("milk_list"); } },
    { id: "temp", when: (c) => c.s.askTemp && drinks(c).some((d) => byId(d.id).attrs?.iced && !d.temp && !generic(d)), done: () => false,
      ask: (c) => {
        const d = drinks(c).find((x) => byId(x.id).attrs?.iced && !x.temp);
        c.say("ask_temp", d ? { X: d.id } : {});
      },
      expects: ["temp_ans"],
      suggest: [{ lt: "Hot or iced", hint: "temp", options: "temp" }] },
    { id: "warm", when: (c) => items(c).some((i) => i.id === "torta") && c.s.warm === undefined, done: () => false,
      ask: (c) => {
        c.say("ask_warm");
        c.expect({ id: "warm", hints: ["g_yesno"], yes: (cc) => { cc.s.warm = true; cc.say("ack"); }, no: (cc) => { cc.s.warm = false; cc.say("ack"); }, ask: (cc) => cc.say("ask_warm") });
      } },
    { id: "more", when: (c) => items(c).length > 0, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say(!foods(c).length && !c.s.foodDeclined && c.chance(0.5) ? "ask_food_more" : "ask_more"), expects: ["more_no", "order", "more_yes", "want_food"],
      suggest: (c) => foods(c).length
        ? [{ lt: "Say that's all", hint: "more" }, { lt: "Order something else", hint: "order_food", options: "food" }]
        : [{ lt: "Order something to eat", hint: "more_food", options: "food" }, { lt: "Say that's all", hint: "more" }],
      yes: (c) => { c.say("ask_what_else"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    { id: "dine", done: (c) => !!c.s.dine, ask: (c) => c.say("ask_dine"), expects: ["dine_ans"],
      suggest: [{ lt: "Say whether it's for here or to go", hint: "dine" }] },
    { id: "name", when: (c) => c.s.dine === "togo" && c.s.askName, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Say your name", hint: "name" }] },
    { id: "pay", done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          if (c.chance(0.5)) c.say("pre_total");
          c.say("say_total", { price: total(c) });
          if (c.s.cardDown) { c.say("card_down"); c.twist("card_down"); }
          else if (c.chance(0.35)) c.say("ask_pay_method");
        } else c.say("say_total", { price: total(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash"],
      suggest: [{ lt: "Pay by card, in cash or with your phone", hint: "pay" }] },
    { id: "receipt", when: (c) => c.s.askReceipt, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["no_receipt", "no_receipt_ctx", "want_receipt", "receipt_yes_ctx"],
      suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
      no: (c) => { c.s.receipt = false; c.say("no_problem"); } },
  ],

  init: (c) => {
    c.s.items = [];
    c.s.askMilk = c.chance(0.75);
    c.s.askTemp = c.chance(0.3);
    c.s.askName = c.chance(0.55);
    c.s.askReceipt = c.chance(0.45);
    c.s.outOfOat = c.visits >= 1 && c.chance(0.35);
    c.s.cardDown = c.visits >= 2 && c.chance(0.15);
  },

  start: (c) => {
    const last = c.memory.lastDrink as Item | undefined;
    if (c.visits >= 3 && last && c.chance(0.6)) {
      c.say("usual", { X: np(last) });
      c.twist("usual");
      c.expect({
        id: "usual", optional: true, hints: ["g_yesno", "order_drink"], expects: ["order"],
        suggest: [{ lt: "Say yes or order something else", hint: "order_drink", options: "drink" }],
        yes: (cc) => { items(cc).push({ ...last, qty: 1 }); cc.say("ack_order"); },
        no: (cc) => { cc.say("ask_order"); cc.hold(); },
        ask: (cc) => cc.say("usual", { X: np(last) }),
      });
      return;
    }
    if (c.chance(0.4)) {
      c.say("greet_howareyou");
      expectHowAreYou(c);
      return;
    }
    c.say(c.visits >= 1 && c.chance(0.5) ? "greet_back" : "greet_order");
    c.hold();
    c.s.__askedOrder = true;
  },

  handlers: {
    order(c, slots, seg) {
      const list = toArr(slots.items?.item).map(fromSlot).filter(Boolean) as Item[];
      const before = items(c).length;
      const oat = list.find((i) => i.milk === "oat");
      const fixed = addItems(c, list, [...seg.tags, ...toArr(slots.items?.item).flatMap((x: any) => x.__tags || [])]);
      if (fixed) c.say("changed");
      if (oat && c.s.outOfOat) {
        const d = items(c).find((i) => i.milk === "oat");
        if (d) d.milk = undefined;
        offerAltMilk(c);
        return;
      }
      const added = items(c).slice(before);
      if (added.length && added.every((i) => !generic(i)) && c.chance(0.7)) c.say("ack_order");
      if (c.step === "more" && items(c).length > before) c.s.moreDone = false;
    },
    size_ans(c, slots, seg) {
      if (!drinks(c).length) { c.say("ask_order"); c.hold(); return; }
      applyDetail(c, "size", slots.size ?? (seg.tags.includes("small") ? "small" : null));
    },
    milk_ans(c, slots, seg) {
      if (!drinks(c).length) { c.say("ask_order"); c.hold(); return; }
      // "Negro" to "¿Qué café?": a black americano
      if (seg.tags.includes("nomilk") && c.step === "kind") { const g = drinks(c).find((d) => d.id === "coffee"); if (g) { g.id = "americano"; g.noMilk = true; return; } }
      if (seg.tags.includes("nomilk")) { applyDetail(c, "milk", null, { noMilk: true }); return; }
      let m = slots.milk as string | undefined;
      if (!m && seg.tags.includes("regular")) m = "whole";
      if (m === "oat" && c.s.outOfOat) { offerAltMilk(c); return; }
      const change = drinks(c).every((d) => d.milk || d.noMilk);
      applyDetail(c, "milk", m ?? "whole");
      if (change) c.say("changed");
    },
    temp_ans(c, slots) { applyDetail(c, "temp", slots.temp); },
    dine_ans(c, _slots, seg) {
      c.s.dine = seg.tags.includes("togo") ? "togo" : "here";
    },
    more_no(c) { c.s.moreDone = true; },
    more_yes(c) { c.say("ask_what_else"); c.hold(); },
    pay_card(c) {
      if (!c.s.totalSaid) { c.say("card_later"); c.s.payMethod = "card"; return; }
      if (c.s.cardDown) { c.say("card_back"); c.s.cardDown = false; }
      c.say("card_tap"); c.s.paid = true; c.s.payMethod = "card"; c.event("pay", { method: "card" }); c.say("paid");
    },
    no_cash(c, slots, seg) { cafe.handlers.pay_card(c, slots, seg); },
    pay_phone(c) {
      if (c.s.cardDown) { c.say("card_back"); c.s.cardDown = false; }
      c.say("phone_ok"); c.s.paid = !!c.s.totalSaid; c.s.payMethod = "phone"; if (c.s.paid) { c.event("pay", { method: "phone" }); c.say("paid"); }
    },
    pay_cash(c) {
      if (c.s.paid) { c.say("paid"); return; }
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); }
    },
    here_you_go(c) {
      if (!c.s.totalSaid) { c.say("no_problem"); return; }
      if (c.s.paid) { c.say("paid"); return; }
      c.s.paid = true; c.event("pay", { method: c.s.payMethod || "cash" });
      if (c.s.payMethod === "card") c.say("paid"); else c.say("change_back");
    },
    keep_change(c) { c.s.paid = true; c.s.tip = true; c.say("thanks_tip"); },
    ask_price(c, slots) {
      const it = fromSlot(slots.item);
      if (it) {
        const e = byId(it.id);
        if (e.attrs?.generic) { c.say("which_item"); c.hold(); return; }
        c.say("price_is", { X: np({ ...it, size: it.size ?? (e.attrs?.sized ? "medium" : undefined) }), price: itemPrice({ ...it, qty: 1, size: it.size ?? "medium" }) });
        return;
      }
      if (slots.size && drinks(c).length) {
        const d = drinks(c).at(-1)!;
        c.say("price_is", { X: np({ ...d, size: slots.size }), price: itemPrice({ ...d, size: slots.size, qty: 1 }) });
        return;
      }
      if (items(c).length) {
        c.say("say_total", { price: total(c) });
        if (c.step === "pay") { c.s.totalSaid = true; c.hold(); }
        return;
      }
      c.say("which_item"); c.hold();
    },
    ask_menu(c) {
      const txt = c.heard.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (/taman/.test(txt)) c.say("size_list");
      else if (/leche/.test(txt)) c.say("milk_list");
      else if (/\bte\b/.test(txt)) c.say("ask_kind_tea");
      else if (/\bpan\b|comer|comida/.test(txt) || c.step === "more") { c.say("food_list"); c.say("food_pick"); c.hold(); }
      else if (/cafe/.test(txt)) c.say("coffee_list");
      else if (c.step === "kind") kindList(c);
      else c.say("menu_line");
    },
    ask_recommend(c) { c.say(/comer|hambre|\bpan\b|dulce/i.test(c.heard.normalize("NFD").replace(/[̀-ͯ]/g, "")) ? "rec_food" : "recommend"); },
    want_food(c, _slots, seg) {
      if (seg.tags.includes("pick")) { c.say("food_list"); c.say("which_item"); c.hold(); return; }
      c.say("food_menu"); c.say(items(c).length ? "food_pick" : "ask_order"); c.hold();
    },
    offer_ctx(c, _slots, seg) {
      const id = c.s.offered as string | undefined;
      if (!id) { c.say("ack"); return; }
      const qty = seg.tags.includes("q3") ? 3 : seg.tags.includes("q2") ? 2 : 1;
      items(c).push({ cat: "food", id, qty });
      c.s.offered = undefined;
      c.say("ack_order");
      if (c.step === "more") c.s.moreDone = false;
    },
    kind_ctx(c, slots) {
      const g = items(c).find((i) => generic(i));
      const kind = g ? generic(g)! : undefined;
      const id = kind ? KIND_CHOICE[kind]?.[slots.choice as string] : undefined;
      // "Concha." to "¿Qué té?": not a tea (the question comes again)
      if (!g || !id) { c.say("have_no"); return; }
      g.id = id;
      if (g.cat === "drink" && byId(id).attrs?.kind === "pan") g.cat = "food";
      if (kind === "pan") g.cat = "food";
      if (kind === "coffee" && slots.choice === "negro") g.noMilk = true;
    },
    order_partial(c, slots, seg) {
      c.say("unknown_order");
      cafe.handlers.order(c, slots, seg);
    },
    ask_have(c, slots, seg) {
      const thing = slots.thing || {};
      if (thing.milk && seg.tags.includes("get") && drinks(c).length) { cafe.handlers.milk_ans(c, { milk: thing.milk }, { ...seg, tags: [] }); return; }
      if (thing.drink || thing.food || thing.milk || (thing.__tags || []).some((x: string) => ["decaf", "sugar", "wifi"].includes(x))) {
        if (thing.milk === "oat" && c.s.outOfOat) { c.say("out_of_oat"); return; }
        if ((thing.__tags || []).includes("wifi")) { c.say("wifi"); return; }
        c.say("have_yes");
        if (thing.food && !c.s.paid && !items(c).some((i) => i.id === thing.food) && !byId(thing.food).attrs?.generic) offerFood(c, thing.food);
      } else c.say("have_no");
    },
    ask_have_unknown(c) { c.say("have_no"); c.say("menu_line"); },
    ask_wifi(c) { c.say("wifi"); },
    ask_restroom(c) { c.say("restroom"); },
    ask_water(c) { c.say("water"); c.event("give", { item: "water" }); },
    ask_sugar(c) { c.say("sugar"); },
    change(c, slots, seg) {
      const it = fromSlot(slots.item);
      if (it && !items(c).length) { cafe.handlers.order(c, { items: { item: slots.item } }, seg); return; }
      if (it && items(c).length) {
        const last = items(c).filter((i) => i.cat === it.cat).at(-1) ?? items(c).at(-1)!;
        Object.assign(last, { ...it, size: it.size ?? last.size, milk: it.milk ?? last.milk });
        c.say("changed");
        return;
      }
      if (slots.size) { applyDetail(c, "size", slots.size); c.say("changed"); return; }
      c.say("ask_order"); c.hold();
    },
    reject(c, slots) {
      const it = fromSlot(slots.item);
      if (it) {
        const idx = items(c).findIndex((i) => i.id === it.id || (generic(i) && kindOf(it.id) === generic(i)));
        if (idx >= 0) { items(c).splice(idx, 1); c.say("removed", { X: it.id }); if (!items(c).length) { c.say("reject_ok"); c.hold(); } return; }
      }
      c.say("reject_ok"); c.hold();
    },
    correction(c, slots) {
      const [first, second] = toArr(slots.item).map(fromSlot) as Item[];
      const txt = c.heard.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      // "no un capuchino, (sino) un latte": the first is the wrong one; "un latte en vez de un capuchino": the second
      const [bad, good] = /\b(en vez|en lugar)\b/.test(txt) ? [second, first] : /^\s*dije\b/.test(txt) ? [undefined, first] : [first, second];
      if (bad) { const idx = items(c).findIndex((i) => i.id === bad.id); if (idx >= 0) items(c).splice(idx, 1); }
      if (good) addItems(c, [good], []);
      c.say("changed");
    },
    qty_one(c) {
      const it = items(c).filter((i) => i.qty > 1).at(-1);
      if (it) { it.qty = 1; c.say("changed"); } else c.say("ack");
    },
    order_unknown(c) { c.say("unknown_order"); c.say("menu_line"); c.hold(); },
    name_ctx(c, slots) {
      if (!slots.name) { c.say("name_again"); c.hold(); return; }
      c.s.name = slots.name; c.say("name_thanks");
    },
    no_receipt(c) { c.s.receipt = false; c.say("no_problem"); },
    no_receipt_ctx(c) { c.s.receipt = false; c.say("no_problem"); },
    receipt_yes_ctx(c, slots, seg) { cafe.handlers.want_receipt(c, slots, seg); },
    want_receipt(c) { if (c.s.receipt !== true) { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); } },
    togo_bag(c) { c.say("bag"); },
    // Paid, then "¡Gracias, adiós!" to "¿Quiere su ticket?": no receipt, and the order is still served
    g_bye(c) {
      if (c.s.paid && !c.s.served) { if (c.s.receipt === undefined) c.s.receipt = false; serve(c); }
      c.say("g_bye"); c.end(); c.hold();
    },
  },

  finish: (c) => {
    serve(c);
    c.say("bye_after");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // ordering, with every hint pattern
    { say: "Quisiera un latte, por favor", intent: "order", slots: { items: { item: { drink: "latte" } } } },
    { say: "¿Me da un café de olla?", intent: "order", slots: { items: { item: { drink: "cafe_de_olla" } } } },
    { say: "Quiero una horchata grande", intent: "order", slots: { items: { item: { drink: "horchata", size: "large" } } } },
    { say: "Un capuchino, por favor.", intent: "order", slots: { items: { item: { drink: "cappuccino" } } } },
    { say: "Voy a querer un americano", intent: "order", slots: { items: { item: { drink: "americano" } } } },
    { say: "¿Me puede dar un latte grande con leche de avena para llevar?", intent: "order", slots: { items: { item: { drink: "latte", size: "large", milk: "oat" } } } },
    { say: "Para mí, un expreso", intent: "order", slots: { items: { item: { drink: "espresso" } } } },
    { say: "Deme una concha, por favor", intent: "order", slots: { items: { item: { food: "concha" } } } },
    { say: "Quisiera una taza de té", intent: "order", slots: { items: { item: { drink: "tea" } } } },
    { say: "Un café", intent: "order", slots: { items: { item: { drink: "coffee" } } } },
    { say: "Dos capuchinos y un cuernito", intent: "order" },
    // natural alternatives that aren't hints
    { say: "Se me antoja un chocolate caliente", intent: "order", slots: { items: { item: { drink: "chocolate" } } } },
    { say: "Me regala un agua de jamaica", intent: "order", slots: { items: { item: { drink: "jamaica" } } } },
    { say: "Una moka fría", intent: "order", slots: { items: { item: { drink: "mocha", temp: "iced" } } } },
    { say: "Un latte con hielo", intent: "order", slots: { items: { item: { drink: "latte" } } } },
    { say: "Yo quiero un latte", intent: "order" },
    { say: "Un grande latte", intent: "order", slots: { items: { item: { drink: "latte", size: "large" } } } },
    { say: "Un café de olla para mi esposa y un latte para mí", intent: "order" },
    // learners mixing tú and usted, gender slips, English word order
    { say: "¿Me das un capuchino?", intent: "order" },
    { say: "Quisiera una latte", intent: "order", slots: { items: { item: { drink: "latte" } } } },
    { say: "Me da una café americano", intent: "order" },
    // accents and spellings speech or typing may give
    { say: "quisiera un cafe de oya", intent: "order", slots: { items: { item: { drink: "cafe_de_olla" } } } },
    { say: "una orchata por favor", intent: "order", slots: { items: { item: { drink: "horchata" } } } },
    // never flip the meaning
    { say: "No quiero café", intent: "reject", step: "order", not: ["order"] },
    { say: "No quiero un capuchino", intent: "reject", not: ["order"] },
    { say: "No capuchino", intent: "reject" },
    { say: "No un capuchino, un latte", intent: "correction", step: "more", not: ["order"] },
    { say: "Un latte en vez de un capuchino", intent: "correction", step: "more", not: ["order"] },
    { say: "No tomo café", intent: "reject", step: "order", not: ["order"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    // short answers
    { say: "Grande", intent: "size_ans", step: "size", slots: { size: "large" } },
    { say: "Mediano, por favor", intent: "size_ans", step: "size", slots: { size: "medium" } },
    { say: "El más grande", intent: "size_ans", step: "size", slots: { size: "large" } },
    { say: "Uno chico", intent: "size_ans", step: "size", slots: { size: "small" } },
    { say: "Con leche de avena", intent: "milk_ans", step: "milk", slots: { milk: "oat" } },
    { say: "Deslactosada", intent: "milk_ans", step: "milk", slots: { milk: "lactose_free" } },
    { say: "Sin leche", intent: "milk_ans", step: "milk" },
    { say: "No leche", intent: "milk_ans", step: "milk", not: ["order"] },
    { say: "Leche normal", intent: "milk_ans", step: "milk", slots: { milk: "whole" } },
    { say: "Frío", intent: "temp_ans", step: "temp", slots: { temp: "iced" } },
    { say: "Con hielo", intent: "temp_ans", step: "temp", slots: { temp: "iced" } },
    { say: "Para llevar, por favor", intent: "dine_ans", step: "dine" },
    { say: "Para aquí", intent: "dine_ans", step: "dine" },
    { say: "Me lo llevo", intent: "dine_ans", step: "dine" },
    { say: "Para ir", intent: "dine_ans", step: "dine" },
    { say: "Es todo, gracias", intent: "more_no", step: "more" },
    { say: "Nada más", intent: "more_no", step: "more" },
    { say: "Sería todo", intent: "more_no", step: "more" },
    { say: "No, así está bien", intent: "more_no", step: "more" },
    { say: "No tengo hambre, gracias", intent: "more_no", step: "more" },
    { say: "De manzanilla", intent: "kind_ctx", step: "kind", slots: { choice: "manzanilla" } },
    { say: "Hierbabuena, por favor", intent: "kind_ctx", step: "kind", slots: { choice: "hierbabuena" } },
    { say: "Concha", intent: "kind_ctx", step: "kind", slots: { choice: "concha" } },
    { say: "Ryan", intent: "name_ctx", step: "name" },
    { say: "A nombre de Ryan", intent: "name_ctx", step: "name" },
    { say: "Me llamo Ryan", intent: "name_ctx", step: "name" },
    // paying
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "Con tarjeta", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene", intent: "here_you_go", step: "pay" },
    { say: "Aquí tiene 100 pesos", intent: "here_you_go", step: "pay" },
    { say: "Quédese con el cambio", intent: "keep_change", step: "pay" },
    { say: "¿Aceptan Apple Pay?", intent: "pay_phone", step: "pay" },
    // questions
    { say: "¿Cuánto cuesta un latte grande?", intent: "ask_price" },
    { say: "¿A cómo está la horchata?", intent: "ask_price" },
    { say: "¿Qué me recomienda?", intent: "ask_recommend" },
    { say: "¿Tienen wifi?", intent: "ask_wifi" },
    { say: "¿Cuál es la contraseña del wifi?", intent: "ask_wifi" },
    { say: "¿Dónde está el baño?", intent: "ask_restroom" },
    { say: "¿Tienen leche de avena?", intent: "ask_have", slots: { thing: { milk: "oat" } } },
    { say: "¿Tienen conchas?", intent: "ask_have", step: "more", slots: { thing: { food: "concha" } } },
    { say: "¿Tienen pizza?", intent: "ask_have_unknown" },
    { say: "¿Qué tamaños tienen?", intent: "ask_menu" },
    { say: "Quisiera algo de comer", intent: "want_food" },
    { say: "¿Qué tienen de comer?", intent: "want_food", step: "more" },
    { say: "Quisiera un pan dulce", intent: "order", step: "order", slots: { items: { item: { food: "pan" } } } },
    { say: "Quisiera algo dulce", intent: "want_food", step: "more" },
    { say: "Un latte y una pizza", intent: "order_partial" },
    { say: "¿Me da una hamburguesa?", intent: "order_unknown" },
    // receipt (the Mexican "ticket" and the neutral "recibo")
    { say: "No necesito el ticket", intent: "no_receipt", step: "receipt" },
    { say: "Sin recibo, gracias", intent: "no_receipt", step: "receipt" },
    { say: "Sí, lo necesito", intent: "receipt_yes_ctx", step: "receipt" },
    // the shared skills, in Spanish
    { say: "¿Mande?", intent: "g_repeat" },
    { say: "¿Puede repetir, por favor?", intent: "g_repeat" },
    { say: "Más despacio, por favor", intent: "g_slower" },
    { say: "Estoy aprendiendo español", intent: "g_learning" },
    // not understood
    // learners' Spain forms are correct answers too (owner, 1 Nov 2026): vosotros, ponme, vale, móvil
    { say: "¿Me pones un capuchino?", intent: "order", slots: { items: { item: { drink: "cappuccino" } } } },
    { say: "¿Tenéis leche de avena?", intent: "ask_have", slots: { thing: { milk: "oat" } } },
    { say: "Vale, para llevar", intent: "dine_ans", step: "dine" },
    { say: "¿Puedo pagar con el móvil?", intent: "pay_phone", step: "pay" },
    { say: "Ryan", intent: "none" },
    { say: "la máquina banana bicicleta", intent: "none" },
    { say: "Ayer fui a la playa con mi perro", intent: "none" },
  ],

  sims: [
    { name: "full order, card", turns: ["¡Hola!", "¿Me da un latte grande con leche de avena?", "Es todo, gracias", "Para llevar, por favor", "Con tarjeta", "¡Gracias!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.outOfOat = false; } },
    // the milk and hot-or-iced questions are pinned on (their short answers are in the script)
    { name: "short answers", turns: ["Un café, por favor.", "Un latte", "Mediano", "Leche entera", "Caliente", "No, es todo", "Para aquí", "Aquí tiene", "¡Gracias, adiós!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.askMilk = true; s.askTemp = true; } },
    { name: "tea and a concha, questions first", turns: ["¿Qué me recomienda?", "¿Tienen wifi?", "Quisiera una taza de té", "De manzanilla, por favor", "Y un pan dulce", "Concha", "Es todo", "Para llevar", "A nombre de Ryan", "¿Puedo pagar con tarjeta?", "No, gracias", "¡Adiós!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.askName = true; s.askReceipt = true; } },
    { name: "change of mind", turns: ["Voy a querer un capuchino", "Mejor no, no quiero un capuchino", "¿Me da una moka?", "Chico", "Leche de avena", "Fría", "Nada más", "Para aquí", "En efectivo", "¡Gracias!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.askMilk = true; s.askTemp = true; s.outOfOat = false; } },
    { name: "two, then just one", turns: ["Dos capuchinos, por favor.", "Solo uno", "Es todo, gracias.", "Para aquí.", "En efectivo.", "¡Gracias, adiós!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.askMilk = false; } },
    { name: "out of oat milk (twist)", turns: ["¡Hola! ¿Me da un latte grande con leche de avena?", "De soya está bien.", "Es todo.", "Para aquí.", "Con tarjeta.", "¡Gracias!"],
      expect: { complete: true }, auto: CAFE_AUTO, setup: (s) => { s.outOfOat = true; } },
    { name: "a pastry: the list, then a concha offered", turns: ["Un latte, por favor.", "Mediano.", "Quisiera algo dulce.", "¿Tienen conchas?", "Sí, dos, por favor.", "Es todo.", "Para aquí.", "Con tarjeta.", "¡Gracias!"],
      expect: { complete: true, state: { items: { 0: { id: "latte" }, 1: { id: "concha", qty: 2 } } } }, auto: CAFE_AUTO, setup: (s) => { s.askMilk = false; s.askTemp = false; } },
    { name: "horchata and a torta, warmed up", turns: ["Una horchata grande, por favor.", "Y una torta de jamón.", "Sí, por favor.", "Es todo.", "Para llevar.", "Ryan", "En efectivo.", "¡Gracias!"],
      expect: { complete: true, state: { items: { 0: { id: "horchata", size: "large" }, 1: { id: "torta" } }, warm: true } }, auto: CAFE_AUTO, setup: (s) => { s.askName = true; } },
  ],
};

export default cafe;
