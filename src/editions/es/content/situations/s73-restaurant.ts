// Song 73 "This Isn't What I Ordered" → Puerto Colibrí: "Esto no es lo que pedí".
// Dinner at La Cocina de Lucía, a Yucatecan restaurant downtown (the red awning on avenida Juárez, between Café La Ceiba
// and Boutique Hilos, across from Información Turística: TOWN.md). Lucía
// (npc marco_host) greets and seats the learner (reservation or walk-in, party size, a wait, inside or the terrace);
// Luis, the waiter (npc marco), takes the drinks (aguas frescas, limonada natural o mineral) and the food (sopa de
// lima, panuchos, cochinita pibil, poc chuc, tikin xic, arrachera with its término), serves, checks back, offers
// dessert, brings the check only when asked, cobra junto o separado, brings the terminal and asks for the tip
// (propina, 10–15 %, never included here). Built on the English edition's s73: the same steps, intents and handlers.
// Twists (visits ≥ 1): the wrong dish arrives; the sopa de lima is cold; "¿Va a requerir factura?" (a new small step,
// from the brief). Other variation: a wait for walk-ins, the window tables taken, the day's special, "¿Cómo está?".
// The waiter says usted to one guest and ustedes to a group (sayP: a line's "_pl" twin when the party is 2 or more).
//
// NEEDS (engine, as in the English file): the NLU gives the expected-intent bonus to every segment, so one answer is
// sometimes cut in two ("la sopa" + "de lima"); freshItems() drops such bare tails and doneFromText() reads the término
// from the heard text.
// NEEDS (global.ts): the global goodbye can answer "¡Que tenga buen día!" at this dinner; a time-neutral variant (or
// "buena noche" in the evening) would fit. (s69-local's "Trattoria Lucía" is La Cocina de Lucía since its rewrite.)
// NEEDS (tools/es-voices/lines-es.ts, 5 Nov audit): its step 1 binds an item line to `{ X: id }`, so the dishes that are
// always plural here (attrs.plural: los panuchos, los papadzules, los caballeros pobres; B() gives them qty 2) are
// voiced "el papadzules" and the plural form only when a run reaches it; and a line heard from one speaker only is
// voiced in that voice only (Luis's side answers heard at Lucía's stand). The sims "side questions at the table" and
// "a full table: the fifteen percent worked out" make Luis say his side answers and tip_amount.

import type { Ctx, EntityDef, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Menu (prices in cents of a peso; a sit-down place downtown: dishes $160–320, El Muelle is about $300 in s69). Every
// price is a multiple of $10, so every bill is too: the voiced lists of totals and cash step by $10 (domains below). The
// room's menu board (interiors.ts cocina()) shows the same prices.

const DRINKS: EntityDef[] = [
  ent("water", "agua", "water", "f", { art: "", def: "el", forms: ["un agua", "vaso de agua", "un vaso de agua", "solo agua", "agua simple"], chip: "agua",
    attrs: { generic: "water", price: 4000 } }),
  ent("still_water", "agua | natural", "water | still", "f", { art: "", def: "el",
    forms: ["agua natural", "agua sin gas", "agua de la llave", "agua del grifo", "agua purificada", "botella de agua", "agua embotellada", "una botella de agua natural"],
    chip: "agua natural", attrs: { family: "water", price: 4000, nat: "still water", desc: "desc_mineral", spain: "agua | sin gas" } }),
  ent("sparkling_water", "agua | mineral", "water | sparkling", "f", { art: "", def: "el",
    forms: ["agua mineral", "agua con gas", "agua mineralizada", "una mineral", "agua gasificada", "soda"], chip: "agua mineral", attrs: { family: "water", price: 4000, nat: "sparkling water", desc: "desc_mineral", spain: "agua | con gas" } }),
  ent("fresca", "agua | fresca", "water | fresh", "f", { art: "un", def: "el", pl: "aguas | frescas", ltPl: "waters | fresh",
    forms: ["agua fresca", "aguas frescas", "agua del dia", "agua de sabor", "un agua de sabor", "agua natural de fruta"], chip: "agua fresca",
    attrs: { generic: "fresca", price: 4000, nat: "agua fresca (fruit drink)", desc: "desc_fresca" } }),
  ent("horchata", "horchata", "horchata", "f", { pl: "horchatas", forms: ["orchata", "horchatas", "agua de horchata", "de horchata"],
    attrs: { family: "fresca", price: 4000, nat: "horchata (rice and cinnamon drink)", desc: "desc_horchata" } }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "un", def: "el", pl: "aguas | de | jamaica", ltPl: "waters | of | hibiscus",
    forms: ["jamaica", "agua de jamaica", "aguas de jamaica", "de jamaica"], chip: "agua de jamaica", attrs: { family: "fresca", price: 4000, nat: "hibiscus water", desc: "desc_jamaica" } }),
  ent("chaya", "agua | de | chaya", "water | of | chaya", "f", { art: "un", def: "el", pl: "aguas | de | chaya", ltPl: "waters | of | chaya",
    forms: ["chaya", "chaya con pina", "agua de chaya", "agua de chaya con pina", "de chaya", "de chaya con pina", "aguas de chaya"], chip: "agua de chaya",
    attrs: { family: "fresca", price: 4000, nat: "chaya and pineapple drink", desc: "desc_chaya" } }),
  ent("lemonade", "limonada", "lemonade", "f", { pl: "limonadas", forms: ["limonadas", "limonada de limon", "una limonada"], attrs: { generic: "lemonade", price: 5000 } }),
  ent("lemonade_still", "limonada | natural", "lemonade | still", "f", { pl: "limonadas | naturales", ltPl: "lemonades | still",
    forms: ["limonada natural", "limonada sin gas", "limonadas naturales"], chip: "limonada natural", attrs: { family: "lemonade", price: 5000, nat: "lemonade with still water", desc: "desc_mineral", spain: "limonada | sin gas", spainPl: "limonadas | sin gas" } }),
  ent("lemonade_soda", "limonada | mineral", "lemonade | sparkling", "f", { pl: "limonadas | minerales", ltPl: "lemonades | sparkling",
    forms: ["limonada mineral", "limonada con gas", "limonada con agua mineral", "limonadas minerales"], chip: "limonada mineral",
    attrs: { family: "lemonade", price: 5000, nat: "lemonade with sparkling water", desc: "desc_mineral", spain: "limonada | con gas", spainPl: "limonadas | con gas" } }),
  ent("orange_juice", "jugo | de | naranja", "juice | of | orange", "m", { pl: "jugos | de | naranja", ltPl: "juices | of | orange",
    forms: ["jugo de naranja", "jugo", "un jugo", "jugo natural", "naranjada", "jugo de naranja natural", "zumo de naranja natural", "zumo natural"], chip: "jugo de naranja", attrs: { price: 5000, nat: "orange juice", spain: "zumo | de | naranja", spainPl: "zumos | de | naranja" } }),
  ent("soda", "refresco", "soda", "m", { pl: "refrescos", ltPl: "sodas", forms: ["refrescos", "un refresco", "soda de sabor"], attrs: { generic: "soda", price: 4000 } }),
  ent("coke", "refresco | de | cola", "soda | of | cola", "m", { pl: "refrescos | de | cola", ltPl: "sodas | of | cola",
    forms: ["coca", "coca cola", "cocacola", "cola", "una coca", "una coca cola", "pepsi", "refresco de cola", "cocas"], chip: "refresco de cola",
    attrs: { family: "soda", price: 4000, nat: "cola" } }),
  ent("diet_coke", "cola | light", "cola | diet", "f", { pl: "colas | light", ltPl: "colas | diet",
    forms: ["coca light", "coca cola light", "cola light", "coca zero", "refresco light", "coca sin azucar", "cola de dieta", "coca de dieta"], chip: "cola light",
    attrs: { family: "soda", price: 4000, nat: "diet cola" } }),
  ent("grapefruit_soda", "refresco | de | toronja", "soda | of | grapefruit", "m", { pl: "refrescos | de | toronja", ltPl: "sodas | of | grapefruit",
    forms: ["refresco de toronja", "de toronja", "toronja", "squirt", "fresca de toronja", "refresco de pomelo", "de pomelo", "pomelo"], chip: "refresco de toronja",
    attrs: { family: "soda", price: 4000, nat: "grapefruit soda", spain: "refresco | de | pomelo", spainPl: "refrescos | de | pomelo" } }),
  ent("red_wine", "vino | tinto", "wine | red", "m", { pl: "vinos | tintos", ltPl: "wines | red",
    forms: ["vino tinto", "tinto", "copa de tinto", "vinos tintos", "vino rojo", "merlot", "cabernet"], chip: "vino tinto", attrs: { family: "wine", wine: true, price: 12000, nat: "red wine" } }),
  ent("white_wine", "vino | blanco", "wine | white", "m", { pl: "vinos | blancos", ltPl: "wines | white",
    forms: ["vino blanco", "blanco", "vinos blancos", "chardonnay", "sauvignon blanc"], chip: "vino blanco", attrs: { family: "wine", wine: true, price: 12000, nat: "white wine" } }),
  ent("wine", "vino", "wine", "m", { pl: "vinos", ltPl: "wines", forms: ["vinos", "vino de la casa", "copa de vino", "una copa de vino", "vinito"], attrs: { generic: "wine", wine: true, price: 12000 } }),
  ent("beer", "cerveza", "beer", "f", { pl: "cervezas", ltPl: "beers",
    forms: ["cervezas", "chela", "chelas", "cervecita", "cerveza clara", "cerveza oscura", "una bien fria", "cerveza de barril", "birra"], attrs: { price: 6000 } }),
  ent("na_beer", "cerveza | sin | alcohol", "beer | without | alcohol", "f", { pl: "cervezas | sin | alcohol", ltPl: "beers | without | alcohol",
    forms: ["cerveza sin alcohol", "cervezas sin alcohol", "una sin alcohol"], chip: "cerveza sin alcohol", attrs: { price: 6000, nat: "non-alcoholic beer" } }),
  ent("coffee", "café", "coffee", "m", { pl: "cafés", ltPl: "coffees", forms: ["cafes", "cafecito", "un cafecito", "taza de cafe"], attrs: { generic: "coffee", price: 4000 } }),
  ent("americano", "americano", "americano", "m", { pl: "americanos", forms: ["cafe americano", "americanos", "cafe normal", "cafe negro"], attrs: { family: "coffee", price: 4000 } }),
  ent("cafe_de_olla", "café | de | olla", "coffee | from | pot", "m", { pl: "cafés | de | olla", ltPl: "coffees | from | pot",
    forms: ["cafe de olla", "de olla", "cafecito de olla", "cafes de olla"], chip: "café de olla", attrs: { family: "coffee", price: 5000, nat: "café de olla (spiced coffee)", desc: "desc_olla" } }),
  ent("decaf", "descafeinado", "decaf", "m", { pl: "descafeinados", ltPl: "decafs", forms: ["cafe descafeinado", "descafeinados", "sin cafeina", "cafe sin cafeina"],
    attrs: { family: "coffee", price: 4000 } }),
  ent("espresso", "expreso", "espresso", "m", { pl: "expresos", ltPl: "espressos", forms: ["espresso", "expresso", "expresos", "cafe expreso"], attrs: { family: "coffee", price: 4000 } }),
  ent("cappuccino", "capuchino", "cappuccino", "m", { pl: "capuchinos", ltPl: "cappuccinos", forms: ["cappuccino", "capuccino", "capuchinos", "capucino"], attrs: { family: "coffee", price: 6000 } }),
  ent("tea", "té", "tea", "m", { pl: "tés", ltPl: "teas", forms: ["tecito", "te de manzanilla", "te de hierbabuena", "manzanilla", "infusion", "te caliente"], attrs: { price: 4000 } }),
];

const STARTERS: EntityDef[] = [
  ent("sopa_lima", "sopa | de | lima", "soup | of | lime", "f", { pl: "sopas | de | lima", ltPl: "soups | of | lime",
    forms: ["sopa de lima", "sopa", "la sopa", "sopita", "sopita de lima", "sopas de lima", "caldo de lima", "una sopa"], chip: "sopa de lima",
    attrs: { price: 11000, soup: true, meat: true, desc: "desc_sopa", nat: "sopa de lima (lime soup)", natPl: "sopas de lima (lime soups)" } }),
  ent("panuchos", "panuchos", "panuchos", "m", { pl: "panuchos", ltPl: "panuchos",
    forms: ["panucho", "unos panuchos", "orden de panuchos", "una orden de panuchos", "panuchos de cochinita", "panuchos de pollo"],
    attrs: { plural: true, price: 12000, meat: true, desc: "desc_panuchos", nat: "panuchos (stuffed fried tortillas)", natPl: "panuchos (stuffed fried tortillas)" } }),
  ent("salbutes", "salbutes", "salbutes", "m", { pl: "salbutes", ltPl: "salbutes",
    forms: ["salbut", "salbute", "unos salbutes", "orden de salbutes", "una orden de salbutes", "salvutes", "salbutes de pollo"],
    attrs: { plural: true, price: 12000, meat: true, desc: "desc_salbutes", nat: "salbutes (puffed fried tortillas)", natPl: "salbutes (puffed fried tortillas)" } }),
  ent("guacamole", "guacamole", "guacamole", "m", { pl: "guacamoles", ltPl: "guacamoles", forms: ["guacamole con totopos", "guacamoles", "guaca", "wacamole"],
    attrs: { price: 13000, veg: true, desc: "desc_guacamole" } }),
];

const MAINS: EntityDef[] = [
  ent("cochinita", "cochinita | pibil", "pork | pibil", "f", { pl: "cochinitas | pibil", ltPl: "porks | pibil",
    forms: ["cochinita", "cochinita pibil", "cochinita pivil", "la cochinita", "puerco pibil", "cochinitas"], chip: "cochinita pibil",
    attrs: { family: "pibil", price: 22000, comes: "tortillas", meat: true, desc: "desc_cochinita", nat: "cochinita pibil (slow-roasted pork)" } }),
  ent("pollo_pibil", "pollo | pibil", "chicken | pibil", "m", { pl: "pollos | pibil", ltPl: "chickens | pibil",
    forms: ["pollo pibil", "pollo pivil", "pollo", "el pollo"], chip: "pollo pibil",
    attrs: { family: "pibil", price: 19000, comes: "tortillas", meat: true, desc: "desc_pollo", nat: "pollo pibil (achiote chicken)" } }),
  ent("pibil", "pibil", "pibil", "m", { forms: ["el pibil", "algo pibil", "pivil"], attrs: { generic: "pibil", desc: "desc_pibil" } }),
  ent("poc_chuc", "poc chuc", "poc chuc", "m", { pl: "poc chucs", ltPl: "poc chucs",
    forms: ["poc chuc", "pok chuk", "poc chuk", "pok chuc", "poc shuc", "poc", "cerdo asado", "puerco asado"], chip: "poc chuc",
    attrs: { price: 21000, side: true, meat: true, desc: "desc_poc_chuc", nat: "poc chuc (grilled pork)" } }),
  ent("tikin_xic", "pescado | tikin xic", "fish | tikin xic", "m", { pl: "pescados | tikin xic", ltPl: "fishes | tikin xic",
    forms: ["tikin xic", "tikinxic", "tikin chic", "tiquin xic", "tikin shic", "pescado tikin xic", "pescado", "el pescado", "pescado del dia", "pescado asado", "el especial", "el especial del dia"],
    chip: "tikin xic", attrs: { price: 29000, side: true, gf: true, meat: true, desc: "desc_tikin", nat: "tikin xic (achiote fish)" } }),
  ent("arrachera", "arrachera", "flank steak", "f", { pl: "arracheras", ltPl: "flank steaks",
    forms: ["arracheras", "carne asada", "filete", "bistec", "steak", "carne de res", "arrachera de res"], chip: "arrachera",
    attrs: { price: 32000, side: true, doneness: true, gf: true, meat: true, desc: "desc_arrachera" } }),
  ent("papadzules", "papadzules", "papadzules", "m", { pl: "papadzules", ltPl: "papadzules",
    forms: ["papadzul", "unos papadzules", "papatzules", "papadzules de huevo", "papa dzules"],
    attrs: { plural: true, price: 16000, veg: true, desc: "desc_papadzules", nat: "papadzules (egg tacos in pumpkin-seed sauce)", natPl: "papadzules (egg tacos in pumpkin-seed sauce)" } }),
];

const SIDES: EntityDef[] = [
  ent("rice", "arroz", "rice", "m", { art: "", forms: ["arroz blanco", "arroz rojo", "arrocito", "un arroz"], attrs: { price: 4000 } }),
  ent("beans", "frijoles", "beans", "m", { art: "", pl: "frijoles", ltPl: "beans",
    forms: ["frijol", "frijoles refritos", "frijol colado", "frijoles colados", "frijolitos", "frijoles negros", "judias"], attrs: { plural: true, price: 4000 } }),
  ent("salad", "ensalada", "salad", "f", { art: "", forms: ["una ensalada", "ensaladita", "ensalada verde", "ensalada de la casa", "verduras", "ensalada mixta"], attrs: { price: 4000 } }),
  ent("fries", "papas | fritas", "potatoes | fried", "f", { art: "", pl: "papas | fritas", ltPl: "potatoes | fried",
    forms: ["papas", "papas fritas", "papas a la francesa", "papitas", "unas papas", "papa frita", "french fries"], chip: "papas fritas", attrs: { plural: true, price: 4000, nat: "fries", spain: "patatas | fritas", spainPl: "patatas | fritas" } }),
];

// Feminine: only the arrachera has a término.
const DONENESS: EntityDef[] = [
  ent("rare", "roja", "rare", "f", { forms: ["rojo", "termino rojo", "a la inglesa", "poco cocida", "poco cocido", "jugosa", "casi cruda", "termino rojo", "poco hecha", "poco hecho", "vuelta y vuelta"], chip: "roja", attrs: { spain: "poco hecha" } }),
  ent("medium_rare", "medio roja", "medium-rare", "f", { forms: ["medio roja", "medio rojo", "termino medio rojo", "entre roja y termino medio", "rosada", "medio hecha", "medio hecho"], chip: "medio roja", attrs: { spain: "medio hecha" } }),
  ent("medium", "término medio", "medium", "m", { forms: ["termino medio", "medio", "a termino medio", "en termino medio", "normal", "al punto", "en su punto"], chip: "término medio", attrs: { spain: "al punto" } }),
  ent("medium_well", "tres cuartos", "medium-well", "m", { forms: ["tres cuartos", "3/4", "termino tres cuartos", "a tres cuartos", "3 cuartos", "hecha", "hecho", "al punto tirando a hecha"], chip: "tres cuartos", attrs: { spain: "hecha", spainG: "f" } }),
  ent("well_done", "bien cocida", "well-done", "f", { forms: ["bien cocida", "bien cocido", "bien asada", "bien asado", "bien hecha", "bien hecho", "bien cocinada", "bien cocinado", "cocida", "sin sangre", "muy hecha", "muy hecho"], chip: "bien cocida", attrs: { spain: "muy hecha" } }),
];

const DESSERTS: EntityDef[] = [
  ent("flan", "flan", "flan", "m", { pl: "flanes", ltPl: "flans", forms: ["flanes", "flan napolitano", "un flan", "flancito"], attrs: { price: 7000, desc: "desc_flan" } }),
  ent("caballeros", "caballeros pobres", "caballeros pobres", "m", { pl: "caballeros pobres", ltPl: "caballeros pobres",
    forms: ["caballeros pobres", "caballero pobre", "unos caballeros pobres", "caballeros"],
    attrs: { plural: true, price: 8000, nuts: true, desc: "desc_caballeros", nat: "caballeros pobres (bread pudding in syrup)", natPl: "caballeros pobres (bread pudding in syrup)" } }),
  ent("papaya", "dulce | de | papaya", "candy | of | papaya", "m", { pl: "dulces | de | papaya", ltPl: "candies | of | papaya",
    forms: ["dulce de papaya", "papaya", "papaya con queso", "dulce de papaya con queso de bola", "papaya en almibar"], chip: "dulce de papaya",
    attrs: { price: 7000, desc: "desc_papaya", nat: "candied papaya" } }),
  ent("helado", "helado | de | coco", "ice cream | of | coconut", "m", { pl: "helados | de | coco", ltPl: "ice creams | of | coconut",
    forms: ["helado", "helado de coco", "nieve", "nieve de coco", "un helado", "helados", "una bola de helado", "nievecita"], chip: "helado de coco",
    attrs: { price: 7000, desc: "desc_helado", nat: "coconut ice cream" } }),
];

const ALL = [...DRINKS, ...STARTERS, ...MAINS, ...SIDES, ...DONENESS, ...DESSERTS];
const byId = (id: string) => ALL.find((e) => e.id === id)!;
/** The cheapest thing on the menu: no bill is smaller. */
const MIN_PRICE = Math.min(...ALL.map((e) => e.attrs?.price as number | undefined).filter((p): p is number => !!p));

// ---------------------------------------------------------------------------
// State helpers (as in the English edition)

type Cat = "drink" | "starter" | "main" | "side" | "dessert";
interface Item { cat: Cat; id: string; qty: number; done?: string; side?: string; bare?: boolean }

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const items = (c: Ctx) => c.s.items as Item[];
const drinks = (c: Ctx) => items(c).filter((i) => i.cat === "drink");
const food = (c: Ctx) => items(c).filter((i) => i.cat !== "drink");
const mains = (c: Ctx) => items(c).filter((i) => i.cat === "main");
const starters = (c: Ctx) => items(c).filter((i) => i.cat === "starter");
const desserts = (c: Ctx) => items(c).filter((i) => i.cat === "dessert");
const generic = (it: Item) => byId(it.id).attrs?.generic as string | undefined;
/** The kinds the waiter asks about after a generic drink ("¿La limonada natural o mineral?"): the chips, and the
 *  examples of that kind's own hint group (drink_kind_<generic>), so the guide names the kind instead of repeating
 *  "Una limonada, por favor", which only makes the waiter ask again. */
const KIND_OPTS: Record<string, string[]> = {
  water: ["still_water", "sparkling_water"], lemonade: ["lemonade_still", "lemonade_soda"], wine: ["red_wine", "white_wine"],
  soda: ["coke", "diet_coke", "grapefruit_soda"], fresca: ["horchata", "jamaica", "chaya"], coffee: ["americano", "cafe_de_olla", "decaf", "espresso", "cappuccino"],
};
const family = (id: string) => (byId(id).attrs?.generic ?? byId(id).attrs?.family) as string | undefined;
const needsSide = (it: Item) => it.cat === "main" && !!byId(it.id).attrs?.side;
const needsDone = (it: Item) => it.cat === "main" && !!byId(it.id).attrs?.doneness;
const soupItem = (c: Ctx) => starters(c).find((i) => byId(i.id).attrs?.soup);
const mainDish = (c: Ctx) => mains(c).find((i) => !generic(i));
const party = (c: Ctx) => (c.s.party as number | undefined) ?? 1;
/** A dish bound to a line: the plural dishes (los panuchos, los papadzules) take a plural article and agreement. */
const B = (id: string) => ({ id, mods: [] as string[], qty: byId(id).attrs?.plural ? 2 : 1 });
/** The line's "_pl" twin (ustedes) when the party is two or more. */
const sayP = (c: Ctx, id: string, vars: Record<string, unknown> = {}) =>
  c.say(party(c) >= 2 && (restaurant.lines as Record<string, unknown>)[id + "_pl"] ? id + "_pl" : id, vars as any);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function fromSlot(v: any): Item | null {
  if (!v) return null;
  const tags: string[] = v.__tags || [];
  const qty = tags.includes("q4") ? 4 : tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1;
  const bare = !tags.length;
  if (v.drink) return { cat: "drink", id: v.drink, qty, bare };
  if (v.starter) return { cat: "starter", id: v.starter, qty, bare };
  if (v.main) return { cat: "main", id: v.main, qty, done: Array.isArray(v.doneness) ? v.doneness[0] : v.doneness, side: v.side, bare };
  if (v.side) return { cat: "side", id: v.side, qty, bare };
  if (v.dessert) return { cat: "dessert", id: v.dessert, qty, bare };
  return null;
}

// The NLU may cut one answer into several segments ("la sopa" + "de lima"). A bare tail that only repeats the
// previous item of the same utterance is dropped.
function freshItems(c: Ctx, list: Item[]): Item[] {
  const seen: Item[] = ((c as any).__uttItems ??= []);
  const out: Item[] = [];
  for (const it of list) {
    const prev = seen[seen.length - 1];
    if (prev && it.bare) {
      const pe = byId(prev.id);
      const lastWord = fold(pe.en.split(" | ").at(-1)!);
      const e = byId(it.id);
      const forms = [e.en.split(" | ").join(" "), ...(e.forms || [])].map(fold);
      if (it.id === prev.id || (generic(it) && family(prev.id) === generic(it)) || forms.includes(lastWord)) continue;
    }
    out.push(it);
    seen.push(it);
  }
  return out;
}

/** The término from the words actually said ("término medio" may reach us as two segments). */
function doneFromText(txt: string): string | undefined {
  const s = fold(txt);
  // "ni muy roja ni muy cocida", "no muy cocida": in between, never "roja" or "cocida" out of it
  if (/\bni (muy |tan )?(roj|crud)[oa]\b|\b(no|ni) (muy |tan |demasiado )?(cocid|asad|hech|cocinad)[oa]\b/.test(s)) return "medium";
  if (/\bmedio roj[oa]\b|\btermino medio rojo\b/.test(s)) return "medium_rare";
  if (/\btres cuartos\b|\b3\/4\b|\b3 cuartos\b/.test(s)) return "medium_well";
  if (/\bbien (cocid|asad|hech|cocinad)[oa]\b|\bsin sangre\b/.test(s)) return "well_done";
  if (/\bno (muy |tan )?roj[oa]\b|\bque no (este|sea) (roj[oa]|crud[oa])\b/.test(s)) return /\bmedio\b/.test(s) ? "medium" : undefined;
  if (/\btermino medio\b|\bmedio\b/.test(s)) return "medium";
  if (/\broj[oa]\b|\ba la inglesa\b|\bpoco cocid[oa]\b|\bjugos[oa]\b/.test(s)) return "rare";
  return undefined;
}
function dishOf(v: any): string | undefined {
  if (!v) return undefined;
  return v.main ?? v.starter ?? v.dessert ?? v.side ?? v.drink;
}

function addItems(c: Ctx, list: Item[]) {
  for (const it of list) {
    // Answering "¿Natural o mineral?" / "¿Cuál?": the specific item replaces the generic one.
    if (!generic(it)) {
      const g = items(c).find((x) => x.cat === it.cat && generic(x) && generic(x) === family(it.id));
      if (g) { Object.assign(g, { ...it, qty: g.qty }); continue; }
    }
    // A side on its own belongs to the main dish that still needs one.
    if (it.cat === "side") {
      const m = mains(c).find((x) => needsSide(x) && !x.side);
      if (m) { m.side = it.id; continue; }
    }
    items(c).push(it);
  }
}

function itemPrice(it: Item): number {
  const p = byId(it.id).attrs?.price ?? 0;
  return (p as number) * it.qty;
}
const total = (c: Ctx) => items(c).reduce((a, it) => a + itemPrice(it), 0);

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With staff, usted is more polite: “¿Me trae…?”, “¿Me da…?” (me traes / me das is for friends).", better: "¿Me trae la cuenta, por favor?" },
  tipping: { key: "tipping", lt: "In Mexico a 10–15% tip (propina) is usual at a restaurant. Some places in tourist areas add “servicio” to the bill: check it, so you don't tip twice.", better: "El quince por ciento, por favor." },
  mesero: { key: "mesero", lt: "Understood! In Mexico a waiter is “mesero” (camarero is the Spain word); to call him, “¡Joven!” or “Disculpe”.", better: "Disculpe, ¿nos trae la cuenta?" },
};

// Automatic answers the simulation uses when Lucía or Luis asks an optional question.
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const AUTO: Record<string, string> = {
  resv: "Sí, tengo una reservación.", resv_name: "A nombre de Miller.", party: "Somos dos.", wait: "Sí, está bien.",
  seatpref: "Adentro, por favor.", drinks: "Una limonada, por favor.", drink_kind: "Natural, por favor.", drinks_ack: "¡Gracias!",
  order: "Voy a querer la cochinita pibil.", food_kind: "La cochinita, por favor.", doneness: "Término medio, por favor.", side: "Con arroz, por favor.",
  main_q: "No, es todo, gracias.", soup_offer: "No, gracias.", placed: "¡Gracias!", serve_wrong: "¡Gracias!",
  serve: "¡Gracias!", checkback_soup: "Está un poco fría. ¿Me la puede calentar?",
  checkback: "Todo está delicioso, gracias.", enjoy: "¡Gracias!", fix: "¡Gracias!", box: "No, gracias.",
  dessert: "No, gracias, estoy lleno.", dessert_ack: "¡Gracias!", dessert_serve: "¡Gracias!", check: "La cuenta, por favor.",
  check_coming: "¡Gracias!", split: "Todo junto, por favor.", pay: "Con tarjeta, por favor.", factura: "No, gracias.",
  tip: "El quince por ciento.", change: "Quédese con el cambio.",
};

// ---------------------------------------------------------------------------

export const restaurant: SituationDef = {
  id: "s73-restaurant",
  song: 73,
  songTitle: "This Isn't What I Ordered",
  title: { en: "Esto no es lo que pedí", lt: "This isn't what I ordered" },
  topic: { en: "Una cena en el restaurante", lt: "Dinner at a restaurant" },
  chapter: 2,
  order: 5,
  location: "trattoria",
  npc: "marco_host",
  npcs: ["marco"],
  goal: "Have dinner at a restaurant: get a table, order, speak up if something is wrong, ask for the check and pay, with a tip.",
  intro: "La Cocina de Lucía is a Yucatecan restaurant downtown, the one with the red awning. Lucía greets guests at the door; Luis is the waiter. In Mexico the waiter brings the check only when you ask for it, and the tip (10–15%) is usually not included. Prices are in pesos.",
  entities: { drink: DRINKS, starter: STARTERS, main: MAINS, side: SIDES, doneness: DONENESS, dessert: DESSERTS },

  grammar: {
    macros: {
      order_prefix: [
        "quisiera #h:id_like", "me gustaria", "quisiera pedir", "quisiera ordenar", "me gustaria pedir", "quisieramos", "nos gustaria",
        "voy a querer #h:ill_have", "vamos a querer", "voy a pedir", "vamos a pedir", "voy a tomar", "vamos a tomar", "le pido", "yo quiero", "quiero", "queremos",
        "me da #h:could_i_have", "nos da", "deme", "denos", "me puede dar", "me podria dar", "nos puede dar", "me das #tip:tu_staff", "dame #tip:tu_staff",
        "me trae #h:can_i_get", "nos trae", "traigame", "traiganos", "me puede traer", "me podria traer", "nos puede traer", "nos podria traer",
        "me traes #tip:tu_staff", "traeme #tip:tu_staff",
        "me pone", "pongame", "ponme", "me pones", "me sirve", "me regala",
        "para mi #h:for_me", "y para mi", "para (el | ella | mi esposa | mi esposo | mi amigo | mi amiga | mi hijo | mi hija | el senor | la senora)",
        "creo que voy a (pedir | querer) #h:think_ill", "creo que (quiero | pido)", "se me antoja", "me antoja",
        "(de | para) entrada #h:start_with", "de primero", "(de | como) segundo [quisiera | voy a tomar]", "y de segundo", "de entrada (quisiera | voy a querer | me da | nos da | queremos)", "para empezar [quisiera | nos trae | me trae | vamos a querer]",
        "(de | como) plato fuerte [quisiera | voy a querer]", "y (luego | despues) [quisiera | voy a querer]", "y de plato fuerte",
        "de postre [quisiera | voy a querer | me trae]", "(de | para) tomar [quisiera | voy a querer | me trae]",
        "(puedo | podria | podemos | podriamos) (pedir | ordenar)", "tomo #blunt", "yo tomo #blunt", "para compartir",
      ],
      qty: "(un #q1 | una #q1 | uno #q1 | unos #q1 | unas #q1 | el #q1 | la #q1 | los #q1 | las #q1 | dos #q2 | tres #q3 | cuatro #q4 | otro #q1 | otra #q1 | una copa de #glass #h:glass_wine | dos copas de #q2 #glass | una botella de #bottle | otra copa de #glass | un vaso de #q1 | una taza de #q1 | una orden de #q1 | dos ordenes de #q2 | un plato de #q1 | solo #q1 | solo un #q1 | solo una #q1 | solo el #q1 | solo la #q1 | nada mas #q1 | nomas #q1)",
      drink_post: "(con hielo | sin hielo | bien fria | bien frio | sin azucar | con azucar | con leche | sin leche | de la casa | para (mi | ella | el | la mesa | compartir | mi esposa | mi esposo))",
      done: "({doneness} | a {doneness} | en {doneness} | termino {doneness})",
      mods: "[pero] (sin (cebolla | chile | salsa | cilantro | frijol | frijoles | picante | lechuga | tomate | crema | queso) | que no pique | con poca salsa | con la salsa aparte) #mod",
      main_post: "(con {side} | con guarnicion de {side} | y de guarnicion {side} | @mods | para compartir | para (mi | el | ella | mi esposa | mi esposo))",
      dessert_post: "(con (dos | 2) cucharas #h:dessert_share | y dos cucharas | para compartir | con helado)",
      det: "[un | una | unos | unas | el | la | los | las]",
    },
    slots: {
      item: { pattern: [
        "[@qty] {drink} [@drink_post] [@drink_post]",
        "[@qty] {starter} [(para compartir #h:to_share | para empezar | de entrada | de primero)] [@mods]",
        "[@qty] {main} [@done] [@main_post] [@main_post]",
        "[@qty] {main} @main_post [@main_post] @done",
        "[@qty] {side} [aparte | de guarnicion]",
        "[@qty] {dessert} [@dessert_post] [@dessert_post]",
      ] },
      items: { pattern: "{item} [(y | y un | y una | y unos | y el | y la | y los | con | mas | y tambien | y luego | y despues | y de plato fuerte | y de segundo | y para mi | y para ella | y para el | y para mi esposa | y para mi esposo) {item}] [(y | y un | y una | y el | y la | mas | y para mi | y para ella | y para el) {item}]" },
      dish: { pattern: "({starter} | {main} | {side} | {dessert} | {drink})" },
      party: { pattern: [
        "{number} [personas | adultos | gentes]",
        "(solo | nada mas | nomas | solamente) (yo | uno | una persona) #p1",
        "(una persona | yo solo | yo sola) #p1",
        "(nosotros dos | los dos | las dos | una pareja) #p2",
        "[yo y] mi (esposa | esposo | pareja | novia | novio | amigo | amiga | hijo | hija | mama | papa | colega) [y yo] #p2",
      ] },
      req: { lexicon: [
        { id: "tortillas", forms: ["tortillas", "tortilla", "tortillitas", "pan", "totopos"] },
        { id: "water", forms: ["agua", "agua natural", "un vaso de agua", "mas agua"] },
        { id: "napkins", forms: ["servilleta", "servilletas"] },
        { id: "salt", forms: ["sal", "sal y pimienta", "pimienta"] },
        { id: "salsa", forms: ["salsa", "salsa picante", "salsita", "chile", "chiles", "habanero", "salsa de habanero", "xnipec", "chile habanero"] },
        { id: "limes", forms: ["limon", "limones", "limoncitos", "unos limones"] },
        { id: "cup", forms: ["vaso", "vaso limpio", "otro vaso", "copa", "otra copa", "taza", "vaso con hielo"] },
        { id: "fork", forms: ["tenedor", "cuchillo", "cuchara", "cubiertos", "cuchillo para la carne", "cucharita"] },
        { id: "ice", forms: ["hielo", "hielos", "popote", "popotes", "pajita", "pajilla", "sorbete"] },
        { id: "high_chair", forms: ["periquera", "silla para nino", "silla alta", "silla para bebe"] },
      ] },
      thing: { pattern: "({drink} | {starter} | {main} | {side} | {dessert} | (algo | platillos | platos | opciones | comida) sin gluten #gf | (menu | comida) (infantil | para ninos) #kids | (algo | platillos | platos | opciones | comida) (vegetariano | vegetariana | vegetarianos | vegetarianas | vegano | vegana | sin carne) #veg | carta de vinos #winelist | (periquera | silla para nino | silla alta) #chair)" },
    },
  },

  intents: {
    // --- Host
    resv_yes: { patterns: [
      "[si] (tengo | tenemos) [una] (reservacion | reserva) [para {party}] [(a | para) {time}] #h:resv_have",
      "[si] (tengo | tenemos) [una] (reservacion | reserva) a nombre de {name} [para {party}] [(a | para) {time}] #h:resv_have",
      "[si] (tengo | tenemos) [una] (reservacion | reserva) para {party} [(a | para) {time}] a nombre de {name}",
      "(reservé | reservamos | hice | hicimos) (una mesa | una reservacion | una reserva | la reservacion | mesa) [para {party}] [(a | para) {time}] [a nombre de {name}] #h:resv_booked",
      "(reservé | reservamos) [una mesa] para {time}", "(reservé | reservamos | hice la reservacion) a nombre de {name} [para {party}] [(a | para) {time}]",
      "(mi (esposa | esposo | amigo | amiga | pareja | jefe) | alguien) (reservó | hizo la reservacion | hizo la reserva)",
      "(reservé | reservamos | hice la reservacion | hicimos la reservacion) (por telefono | por internet | en linea | en su pagina | por whatsapp | ayer | esta manana)",
      "(mi (esposa | esposo | amigo | amiga | pareja | jefe | hijo | hija) | alguien) (hizo | reservó) (la | una) (reservacion | reserva | mesa) [para nosotros]",
      "(llamé | llamamos) (antes | en la manana | hace rato | para reservar | ayer)",
      "[una | la] mesa para {party} a nombre de {name}", "[la] (reservacion | reserva) (esta)? a nombre de {name} #h:resv_under",
      "(una | la) (reservacion | reserva) para {party} [a nombre de {name}]", "[si] [esta] a nombre de {name} [para {party}]", "[si] a nombre de {name} {letters}", "(tengo | tenemos) mesa reservada [para {party}] [(a | para) {time}]",
    ] },
    // "Sí, para dos a las ocho" / "A las ocho": only as an answer to "¿Tiene reservación?"
    resv_time_ctx: { patterns: ["[si] para {party} (a | para) {time}", "[si] a {time} [para {party}]", "[si] para {time} [para {party}]"] },
    resv_no: { patterns: [
      "no (tengo | tenemos) [una] (reservacion | reserva) #h:no_resv",
      "no (reservé | reservamos | hice reservacion | hicimos reservacion | hice una reservacion | hicimos una reservacion)",
      "sin (reservacion | reserva)", "no (hice | hicimos) (reserva | reservacion)",
      "(venimos | vengo) sin (reservacion | reserva)", "(acabamos | acabo) de llegar",
    ] },
    // "No, no tenemos." to "¿Tiene reservación?"
    resv_no_ctx: { patterns: ["[no] no (tengo | tenemos)", "[no] no (reservé | reservamos)", "[no] no hicimos", "[no] no hice"] },
    table_for: { patterns: [
      "(una | la) mesa para {party} [ahorita | esta noche] #h:table_for",
      "(tiene | tienen | hay) [una] mesa [libre | disponible] [para {party}] [ahorita | esta noche] #h:table_can",
      "(tiene | tienen | hay) lugar para {party}", "(tienes | teneis) [una] mesa [libre] [para {party}] #tip:tu_staff",
      "mesa para {party}", "para {party} personas",
      "(quisiera | quisieramos | queremos | quiero | necesitamos | necesito) una mesa [para {party}] [ahorita | esta noche]",
      "(venimos | vengo | venimos a | vengo a) cenar", "(quisieramos | queremos | quisiera | quiero) cenar [aqui] [para {party}]",
      // "No tenemos reservación. ¿Tiene una mesa para dos?" as one answer
      "no (tengo | tenemos) (reservacion | reserva) #noresv [pero] (tiene | tienen | hay) [una] mesa para {party} [(junto a la ventana | cerca de la ventana) #window | (afuera | en la terraza) #patio | adentro #inside]",
      "no (tengo | tenemos) (reservacion | reserva) #noresv [pero] (somos | seremos) {party}",
      "(una | la) mesa para {party} (junto a la ventana #window | cerca de la ventana #window | afuera #patio | en la terraza #patio | adentro #inside | tranquila #quiet)",
      "(podemos | puedo) tener una mesa para {party} [(junto a la ventana | cerca de la ventana) #window | (afuera | en la terraza) #patio | adentro #inside]",
    ] },
    party_ctx: { patterns: [
      "(solo | nada mas | nomas | solamente) (yo | una persona | uno) [gracias] #h:party_just_me",
      "{party} [esta noche] #h:party_two",
      "(somos | seremos | vamos a ser) {party} [personas] #h:party_two",
      "para {party} [personas]", "(es | seria) para {party}",
      "(somos | seriamos) (yo | nosotros) [dos]",
      // "No somos dos, somos tres": the second number is the answer
      "no (somos | seremos) {number} (somos | seremos | sino) {party}",
      // "Somos cuatro adultos y dos niños": everybody at the table
      "(somos | seremos) {party} y (un nino #k1 | una nina #k1 | {number} (ninos | ninas | menores) #kn)",
    ] },
    // "¡Muy bien, y con hambre!" to the host's greeting
    hungry: { patterns: [
      "[estoy | estamos] (bien | muy bien | super bien) [gracias] y [con] [mucha] hambre",
      "(tengo | tenemos) [mucha | muchisima] hambre",
      "(con | y con) [mucha] hambre", "(me muero | nos morimos) de hambre",
    ] },
    name_ctx: { patterns: [
      "[esta] a nombre de {name} #h:resv_under", "[es | soy] {name}", "(me llamo | mi nombre es | mi apellido es | el apellido es) {name} #h:name_is",
      "[es | esta a nombre de | a nombre de] {name} {letters}", "[esta] a mi nombre",
      "[creo que] [esta] a nombre de mi (esposa | esposo | pareja | amigo | amiga | jefe) [{name}]",
      "[si] [la reservacion esta | la reserva esta | esta] a nombre de {name}",
    ] },
    ask_wait: { patterns: [
      "cuanto (hay que | tenemos que | tengo que) esperar #h:q_wait", "cuanto tiempo (hay que | tenemos que | tengo que) esperar #h:q_wait",
      "cuanto (tiempo)? (es | seria) la espera", "(hay | tienen) que esperar", "cuanto tiempo", "cuantos minutos", "(tarda | tardan) mucho",
      "(es | va a ser) mucho tiempo",
    ] },
    wait_ok_ctx: { patterns: ["[si] (podemos | puedo) esperar #h:wait_can", "[si] (esperamos | espero)", "[si] no (nos | me) importa esperar", "no hay problema [podemos esperar]",
      "[esta bien] (esperamos | espero) [aqui | afuera | en la barra]", "{number} minutos (esta bien | no es problema)", "(podemos | puedo) esperar (aqui | afuera | en la barra)", "no (hay | tenemos | tengo) prisa"] },
    wait_no_ctx: { patterns: ["no (podemos | puedo) esperar [tanto | mucho]", "(es | eso es) (mucho | demasiado) [tiempo]", "(tenemos | tengo) [mucha] prisa #h:wait_hurry", "(vamos | voy) con prisa",
      "no (tenemos | tengo) tiempo", "[mejor] (regresamos | volvemos | vuelvo | regreso | venimos | vengo) [mejor] (luego | despues | mas tarde | otro dia | manana | en otra ocasion)", "mejor (otro dia | en otra ocasion | otra vez)",
      "no (queremos | quiero) esperar"] },
    seat_req: { patterns: [
      "(podemos | puedo | podriamos) (sentarnos | sentarme | tener una mesa) (junto a | cerca de | en) la ventana #window #h:seat_window",
      "(podemos | puedo | podriamos) (sentarnos | sentarme | estar) (afuera #patio | en la terraza #patio | al aire libre #patio | adentro #inside | en un lugar tranquilo #quiet | al fondo #quiet) #h:seat_patio",
      "(hay | tiene | tienen) (una | alguna) mesa (junto a la ventana #window | cerca de la ventana #window | afuera #patio | en la terraza #patio | tranquila #quiet)",
      "(una mesa tranquila | un lugar tranquilo | donde no haya ruido) #quiet",
      "(quisieramos | quisiera | preferimos | prefiero) (una mesa)? (junto a la ventana #window | cerca de la ventana #window | afuera #patio | en la terraza #patio | adentro #inside | en un lugar tranquilo #quiet)",
      "(una mesa | mesa) junto a la ventana #window",
    ] },
    seat_ans: { patterns: [
      "(adentro | dentro | aqui adentro) [esta bien | por favor | mejor] #inside #h:seat_inside",
      "(afuera | en la terraza | la terraza | terraza | al aire libre) [esta bien | por favor | mejor] #patio #h:seat_patio_ans",
      "(junto a | cerca de) la ventana [esta bien] #window", "cualquier mesa [esta bien] #any",
      "[mejor] adentro (hace | con este) (mucho)? calor #inside", "(con | donde haya) aire acondicionado #inside", "(afuera | en la terraza) no #inside", "adentro no #patio",
      // "Afuera no, adentro": the second one is the answer (rule 10)
      "(afuera | en la terraza) no [mejor] adentro #inside", "adentro no [mejor] (afuera | en la terraza) #patio",
    ] },
    // "Donde sea" / "Me da igual": only while inside or the terrace is asked
    seat_any_ctx: { patterns: ["(cualquiera | cualquier lugar | donde sea | en cualquier lado | donde usted diga | como usted quiera | lo que tenga) [esta bien] #any",
      "(nos da | me da) igual #any", "(no nos importa | no me importa) #any"] },
    // --- Ordering
    order: { patterns: [
      "@order_prefix {items}",
      "[solo | nada mas | nomas] {items} #h:please_only",
      "{items} (esta bien | estaria bien | seria perfecto | por favor esta bien)",
      "solo agua natural #h:tap_water",
      "{items} para (mi | ella | el | mi esposa | mi esposo | todos | la mesa | compartir)",
      "(para mi | yo) nada [y] @order_prefix {items}",
    ] },
    order_unknown: { patterns: ["(quisiera | voy a querer | me trae | me da | deme | quiero | me pone | ponme | para mi | traigame | nos trae | de tomar) {w:any}"] },
    // "¿Natural o mineral?" – "Natural." / "¿De cola, light o de toronja?" – "Light." (only while the kind is asked)
    kind_ctx: { patterns: [
      "[la | el | una | un] (natural #still | sin gas #still | normal #still | mineral #sparkling | con gas #sparkling | con agua mineral #sparkling) [por favor | esta bien]",
      "[la | el | una] (light #diet | de dieta #diet | sin azucar #diet) [por favor | esta bien]",
      "(de pollo #chicken | de cerdo #pork | de puerco #pork) [por favor | esta bien]",
      "mineral no [mejor] natural #still", "natural no [mejor] mineral #sparkling", "[no] mineral no #still", "[no] natural no #sparkling", "(cualquiera | la que sea | el que sea | me da igual | lo que sea) #any",
    ] },
    ready_yes: { patterns: [
      "[si] [ya] (estoy | estamos) (listo | lista | listos | listas) [para ordenar | para pedir] #h:ready", "[si] ya (sé | sabemos) (que | lo que) (quiero | queremos) [pedir]",
      "[si] ya (decidí | decidimos | he decidido | hemos decidido | lo he decidido | lo hemos decidido)", "[si] ya lo (tengo | tenemos)", "[si] ya (podemos | puedo) (ordenar | pedir)", "(queremos | quiero | quisieramos) (ordenar | pedir) [ya]",
    ] },
    same: { patterns: [
      "lo mismo [para mi | por favor] #h:same", "(yo | para mi) lo mismo", "(quiero | quisiera | voy a querer | me da | me trae) lo mismo [que (ella | el | mi esposa | mi esposo)]",
      "(que sean | mejor) dos", "dos de esos", "otro igual", "otra igual", "(una | uno | otra | otro) mas [igual] [por favor]",
    ] },
    // "Dos cervezas" – "Perdón, solo una": the quantity of the last thing ordered (only while it can still change)
    // (never a bare "mejor una": "Mejor una limonada" is a change of drink)
    qty_ctx: { patterns: [
      "[no] [perdon] [mejor] (solo | nada mas | nomas | solamente) (una | uno) [por favor] #n1",
      "(que sea | mejor que sea) [solo] (una | uno) [nada mas] #n1", "no (son | eran) dos (son | sino)? (una | uno) #n1",
      "(que sean | mejor que sean) (tres #n3 | cuatro #n4)", "no (son | eran) (dos | tres | cuatro) (son | sino)? (dos #n2 | tres #n3 | cuatro #n4)",
    ] },
    need_time: { patterns: [
      "(nos | me) (da | puede dar | podria dar) (unos | un par de) minutos [mas] #h:need_minutes",
      "(necesitamos | necesito) (unos | un par de) minutos [mas]", "(necesitamos | necesito) (mas | un poco mas de) tiempo", "(necesitamos | necesito) un momento [mas]",
      "todavia (estoy | estamos) (viendo | decidiendo | pensando) [el menu | la carta] #h:still_deciding", "(estoy | estamos) (viendo | decidiendo) [todavia]",
      "todavia no [estamos listos | estoy listo | estoy lista]", "(no estamos | no estoy) (listos | listo | lista | listas) [todavia]", "(no hemos | no he) decidido [todavia]",
      "(todavia | aun) no (sé | sabemos) [que pedir]", "deme un momento", "denos un momento", "(un momento | un minuto) mas",
      "todavia no [nos | me] (da | puede dar) unos minutos", "[ya] casi",
    ] },
    drinks_no: { patterns: [
      "(nada | nada de tomar) [para mi | para nosotros] [por ahora | ahorita] #h:drinks_none", "(por ahora | ahorita) nada", "luego [pedimos | pido]",
      "no (quiero | queremos) nada [de tomar] [por ahora]", "(asi | asi estamos) bien [por ahora]", "(mas tarde | despues) [gracias]",
    ] },
    more_no: { patterns: [
      "(es | seria | eso es | eso seria) todo [por ahora]", "nada mas [por ahora]", "(con eso | asi) (esta bien | es suficiente)",
      "(estoy | estamos) bien [asi] [por ahora]", "no (tengo | tenemos) [mucha] hambre", "(solo | nada mas | nomas) el plato fuerte", "con eso (estoy | estamos) bien", "(sin | no quiero | no queremos) (entrada | plato fuerte)", "solo (eso | la {dish})", "no [gracias] (solo | nada mas | nomas) (eso | [el | la | los | las] {dish})", "no [quiero] (nada mas | otra cosa)", "es suficiente", "ya no",
    ] },
    its_ok: { patterns: ["(no hay problema | no pasa nada | no se preocupe | no te preocupes | esta bien | no importa | sin problema | ni modo | pasa | sucede)"] },
    ask_menu: { patterns: [
      "(me | nos) (da | trae | puede dar | puede traer | deja ver) (el menu | la carta)", "(puedo | podemos) ver (el menu | la carta)",
      "(me | nos) (da | trae | puede traer) la carta de (postres #dessert | vinos #wine | bebidas #drinks) #h:dessert_menu",
      "que (tiene | tienen | teneis | hay) (de tomar #drinks | para tomar #drinks | de beber #drinks | para beber #drinks | de postre #dessert | para empezar #starters | de entrada #starters | de guarnicion #sides | de plato fuerte #mains) #h:q_drinks",
      "que (bebidas #drinks | aguas #drinks | aguas frescas #drinks | refrescos #drinks | vinos #wine | cervezas #drinks | postres #dessert | entradas #starters | sopas #starters | guarniciones #sides | platillos #mains | platos fuertes #mains) (tiene | tienen | hay)",
      "que (tipo | tipos | clase) de (vino #wine | cerveza #drinks | refresco #drinks | bebidas #drinks | agua #drinks | postre #dessert | postres #dessert | guarnicion #sides) (tiene | tienen | hay)",
      "que hay en el menu", "que (tiene | tienen | hay)", "cuales son las opciones", "(algo | que tienen) sin alcohol #drinks", "no (quiero | tomo | bebo) [nada de] alcohol #drinks",
      "cuales son (los postres #dessert | las guarniciones #sides | las entradas #starters | los platillos #mains)",
    ] },
    ask_specials: { patterns: [
      "(tiene | tienen | hay) (algun | algo de | un) especial [hoy | esta noche] #h:q_specials", "cual es el especial [del dia | de hoy]",
      "(que | cual es) (el especial | la especialidad) (de hoy | del dia)", "(hay | tienen) especiales [hoy]", "que hay de especial [hoy]",
      "cual es el platillo del dia", "cual es la sugerencia del chef",
    ] },
    ask_recommend: { patterns: [
      "que (me | nos) recomienda [de postre #dessert | para cenar | hoy] #h:q_recommend", "que (me | nos) recomiendas #tip:tu_staff",
      "que (me | nos) (sugiere | aconseja)", "(cual | que) es (la especialidad | lo mas rico | lo mejor | su favorito | lo mas pedido | lo tipico) [de la casa | de aqui]",
      "(alguna | tiene alguna) recomendacion", "que (deberia | debemos | debo) (pedir | probar)", "que es (lo mas | el mas) (rico | popular | famoso) [aqui]",
      "que (platillos | platos | comida) (son | es) (tipicos | tipica | de aqui) [de aqui]", "que es lo tipico [de aqui]", "que pediria usted",
      "(esta | estan) (bueno | buena | buenos | buenas | rico | rica | ricos | ricas) (el | la | los | las) {dish}", "(el | la | los | las) {dish} (esta | estan) (rico | rica | ricos | ricas | bueno | buena | buenos | buenas)",
      "que (postre #dessert | bebida | vino) (me | nos) recomienda", "(que | cual) es mas (rico | sabroso | recomendable | popular) [el | la | los | las] {dish} o [el | la | los | las] {dish}",
      "(que | cual) (me | nos) recomienda [el | la | los | las] {dish} o [el | la | los | las] {dish}",
    ] },
    ask_desc: { patterns: [
      "que (es | son) (el | la | los | las | un | una) {dish} #h:q_what_is", "que (es | son) {dish}", "que (lleva | llevan | tiene | tienen) (el | la | los | las) {dish}",
      "(me | nos) (explica | puede explicar) (que es | que son | que lleva) (el | la | los | las) {dish}", "(como | con que) (es | son | se hace | se hacen) (el | la | los | las) {dish}",
      "de que es (el | la) {dish}", "(el | la | los | las) {dish} (es | son | lleva | llevan) (de)? (cerdo | puerco | pollo | res | carne | pescado | huevo)", "que (es | son) eso de {dish}",
    ] },
    ask_spicy: { patterns: [
      "(pica | pican) [mucho] #h:q_spicy", "(es | son) [muy] picante[s]", "(es | son) [muy] (picante | picantes)", "(el | la | los | las) {dish} (pica | pican | es picante | son picantes) [mucho]",
      "(pica | pican | es picante | son picantes) (el | la | los | las) {dish}", "que tan picante (es | son) [el | la | los | las] [{dish}]",
      "(tiene | tienen | hay) algo picante", "(que | cual) (platillo | plato) (pica | es picante)", "(la salsa | esa salsa | el habanero | la salsa de habanero) (pica | es picante) #salsa",
      "lleva chile", "no (quiero | puedo comer | como) (nada)? (picante | muy picante | chile) #nospicy", "(algo | nada) que no pique #nospicy", "no me gusta (el | lo)? (picante | chile) #nospicy",
    ] },
    ask_comes: { patterns: [
      "con que (viene | vienen) [el | la | los | las] [{dish}] #h:q_comes_with", "(que | que guarnicion) (trae | traen | lleva | incluye) [el | la | los | las] {dish}",
      "(viene | vienen) con (algo | guarnicion | tortillas | {side})", "(el | la | los | las) {dish} (viene | vienen | trae | traen) (con)? (algo | guarnicion | tortillas | {side})", "(trae | incluye) guarnicion", "con que se sirve [el | la] [{dish}]",
    ] },
    ask_veg: { patterns: [
      "(tiene | tienen | hay) [algun | algunos | alguna | algunas] (platillos | platos | opciones | algo) (vegetarianos | vegetarianas | vegetariano | vegetariana | veganos | vegano | sin carne) #h:q_veg",
      "(soy | somos | es) (vegetariano | vegetariana | vegetarianos | vegano | vegana | veganos)", "(no como | no comemos) carne", "que (es | hay) vegetariano",
      "(tiene | hay) algo sin carne", "(es | son) [el | la | los | las] [{dish}] (vegetariano | vegetariana | vegetarianos)",
      "(lleva | llevan | tiene | tienen) carne [el | la | los | las] [{dish}]", "(el | la | los | las) {dish} (lleva | llevan | tiene | tienen) carne",
    ] },
    ask_allergy: { patterns: [
      "(soy | es) (alergico | alergica) (a las nueces #nuts | a la nuez #nuts | a los cacahuates #nuts | al cacahuate #nuts | a las almendras #nuts | al gluten #gluten | al trigo #gluten | a la lactosa #dairy | a los lacteos #dairy | a los mariscos #shellfish | al huevo #eggs | al pescado #fish | a los frutos secos #nuts) #h:allergy_nuts",
      "(tengo | tiene) alergia (a las nueces #nuts | a la nuez #nuts | al cacahuate #nuts | a los cacahuates #nuts | al gluten #gluten | a la lactosa #dairy | a los mariscos #shellfish | al huevo #eggs | a los frutos secos #nuts)",
      "(tiene | lleva | tienen | llevan) [el | la | los | las] [{dish}] (nueces #nuts | nuez #nuts | almendras #nuts | cacahuate #nuts | gluten #gluten | lacteos #dairy | leche #dairy | huevo #eggs) #h:q_nuts",
      "(el | la | los | las) {dish} (tiene | lleva | tienen | llevan) (nueces #nuts | nuez #nuts | almendras #nuts | cacahuate #nuts | gluten #gluten | lacteos #dairy | leche #dairy | huevo #eggs)",
      "(es | son) [el | la | los | las] [{dish}] sin gluten #gluten #h:q_gluten",
      "(tiene | tienen | hay) (algo | platillos | opciones) sin (gluten #gluten | nueces #nuts | lactosa #dairy)",
      "no (puedo | puede) comer (nueces #nuts | gluten #gluten | lacteos #dairy | huevo #eggs | mariscos #shellfish)",
      "(soy | es) (celiaco #gluten | celiaca #gluten | intolerante a la lactosa #dairy | intolerante al gluten #gluten)",
    ] },
    ask_price: { patterns: [
      "cuanto (cuesta | cuestan | es | sale | salen) (el | la | los | las | un | una) {dish} #h:q_price", "cuanto (cuesta | sale) [eso]", "cuanto (es | seria | sale | va a ser) [eso] #total",
      // "¿Cuánto es todo?": the whole bill so far, at any time
      "cuanto (es | seria | sale | va a ser | llevamos | llevo) (todo | en total | todo junto | la cuenta | hasta ahorita | hasta ahora) #total #all", "cual es el total [hasta ahorita | hasta ahora] #total #all", "(son | es | serian | seria) {price} [pesos] [en total] (verdad | cierto | no) #total #all",
      // "¿Cuánto cuestan dos cervezas?": that many
      "cuanto (cuestan | cuesta | son | salen | serian | seria) (dos #q2 | tres #q3 | cuatro #q4) {dish}",
      // "¿Cuesta algo la factura?" / "¿Cobran el recipiente?" (both free)
      "(cuesta | cobran | cobra) algo [extra] [la factura | eso | el recipiente | la cajita | el contenedor] #extra", "(la factura | el recipiente | la cajita) (cuesta | tiene costo) [algo] #extra",
      "(tiene | hay) (algun)? (costo | cargo) [extra] [la factura | por la factura | el recipiente | por el recipiente] #extra", "(es | la factura es | el recipiente es) gratis #extra",
      "(cobran | cobra) (la factura | por la factura | el recipiente | por el recipiente | la cajita) #extra",
      "a como (esta | estan | sale) (el | la | los | las) {dish}", "que precio tiene (el | la | los | las) {dish}", "cual es el precio de (el | la | los | las) {dish}",
      "(el | la | los | las) {dish} cuanto (cuesta | cuestan | es)",
    ] },
    ask_have: { patterns: ["(tiene | tienen | hay) [algun | alguna] {thing}", "(sirven | hacen) {thing}", "(teneis | tienes) {thing} #tip:tu_staff"] },
    ask_have_unknown: { patterns: ["(tiene | tienen | hay | sirven | teneis) {w:any}"] },
    ask_restroom: { patterns: [
      "donde (esta | estan | queda) (el bano | los banos | el sanitario | los sanitarios | el servicio | el aseo) #h:q_restroom",
      "(tiene | tienen | hay) (bano | banos | sanitario)", "(puedo | podria) (usar | pasar a) el bano", "el bano por favor",
    ] },
    doneness_ans: { patterns: [
      "{doneness} #h:done_short", "{doneness} (esta bien | por favor)", "(la | lo) (quiero | prefiero) {doneness} #h:done_please",
      "(me la | me lo) (puede | podria) (hacer | dar | traer) {doneness} #h:done_can", "(a | en) {doneness}", "termino {doneness}",
      "(que | mejor que) (este | quede | sea) {doneness}", "(mejor | que sea) {doneness}",
      // "Término medio, no muy roja": never "roja" out of "no muy roja"
      "[{doneness}] [pero] (que)? no (muy | tan | demasiado)? (roja | rojo | cruda | crudo | jugosa) #notrare",
      // "No muy cocida": less than well-done
      "(no | que no este | pero no) (muy | tan | demasiado) (cocida | cocido | asada | asado | hecha | hecho) #notwell",
      // "Ni muy roja ni muy cocida": in between (never "roja" out of it)
      "ni (muy | tan)? (roja | rojo | cruda | crudo) ni (muy | tan)? (cocida | cocido | asada | asado | hecha | hecho) #between",
      // "Roja no, término medio": the second one is the answer
      "{doneness} no [mejor] {doneness} #second", "{doneness} no #neg", "no (la | lo) quiero {doneness} #neg",
    ] },
    side_ans: { patterns: [
      "@det {side} #h:side_short", "con @det {side} #h:side_with", "@det {side} [de guarnicion | aparte]",
      "(quisiera | quiero | voy a querer | prefiero) @det {side} #h:side_please", "(me | nos) (da | trae) @det {side}",
      "(puede | podria) ser (con)? @det {side} #h:side_can", "(mejor | que sea) [con] @det {side}",
      "@det {side} (esta bien | por favor)",
      // "Arroz no, ensalada": the second one is the answer
      "{side} no [mejor] [con] {side} #second", "sin guarnicion #noside", "(no quiero | no necesito) guarnicion #noside",
    ] },
    // --- During the meal
    all_good: { patterns: [
      "(todo | la comida | esto | la cena | el {dish} | la {dish} | los {dish} | mi {dish}) (esta | estan | estuvo | estaba) [muy | super | bien | riquisimo | delicioso]? (delicioso | deliciosa | deliciosos | rico | rica | ricos | buenisimo | buenisima | excelente | perfecto | perfecta | sabroso | sabrosa | bueno | buena | riquisimo | riquisima | muy bueno | muy rico) #h:all_good",
      "(felicidades | felicitaciones | mis felicitaciones | mis felicidades) (al chef | a la cocina | a la cocinera | al cocinero) #h:compliments",
      "todo (bien | muy bien | perfecto | excelente)", "(esta | estan) (delicioso | deliciosa | riquisimo | riquisima | buenisimo | buenisima | muy rico | muy rica | muy bueno | muy buena | sabroso | sabrosa | excelente)",
      "(que | muy | super) (rico | rica | sabroso | sabrosa | delicioso | deliciosa)", "(delicioso | deliciosa | riquisimo | buenisimo)",
      "(me | nos) (encanta | encantó | gusta mucho | gustó mucho)", "no (esta | estuvo | estan) [nada] mal", 
      // "No está fría" / "No, está fría" read the same once the comma is gone: Luis asks again (rule 10)
      "no (esta | estan) [muy | nada]? (fria | frio | frias | frios | salado | salada | salados | quemado | quemada | seco | seca | duro | dura | crudo | cruda) #amb", "(todo | esto) (se ve | luce) (delicioso | muy bien | riquisimo)",
    ] },
    all_good_ctx: { patterns: ["(bien | muy bien | rico | rica | excelente | perfecto | bueno | buena | sabroso | sabrosa | muy bueno | muy buena | muy rica | muy rico | bastante bien)", "[si] (todo bien | esta bien | estan bien)"] },
    complain_cold: { patterns: [
      "(mi | la | esta | el | este) (sopa | comida | {dish}) (esta | estan) [un poco | un poquito | algo | muy | medio] (fria | frio | frias | frios | tibia | tibio) #h:cold",
      "(esta | estan) [un poco | un poquito | algo | medio | muy] (fria | frio | frias | frios | tibia | tibio) #h:cold_little",
      "(me | nos) (la | lo) (puede | podria) calentar [un poco] #h:warm_up", "(puede | podria) calentar(la | lo)? [un poco] [la sopa | mi sopa | el {dish} | la {dish}]",
      "(puede | podria) calentar (la sopa | mi sopa | el {dish} | la {dish} | esto)", "[la sopa] no (esta | estan) [muy | tan | lo suficientemente]? (caliente | calientes)",
      "(esta | estan) [rica | rico | buena | bueno] pero [un poco | un poquito | algo | medio]? (fria | frio | tibia | tibio)", "(le | la | lo) falta calentar",
      "[un poco | un poquito | algo | medio | muy] (fria | frio | tibia | tibio)", "(la sopa | mi sopa | esto) (deberia | podria) estar mas caliente",
    ] },
    complain_other: { patterns: [
      "(esto | el {dish} | la {dish} | mi {dish} | la comida | la carne) (esta | estan) [un poco | muy | demasiado | bien]? (salado | salada | quemado | quemada | crudo | cruda | seco | seca | duro | dura | picoso | picosa | muy picante | demasiado picante | pasado | pasada)",
      "(la | mi) arrachera (esta | quedó | vino) (muy roja | cruda | muy cocida | muy seca | demasiado cocida | dura | muy dura) [y | pero] [(la | yo la) (pedí | pedimos) {doneness}]",
      "(esto | esta | este) (sabe | esta) (raro | rara | mal | feo | fea | extrano | extrana)",
      // "No está muy rico": a complaint, never "rico"
      "(esto | el {dish} | la {dish} | la comida | todo)? no (esta | estan | estuvo | sabe) [muy | tan | nada]? (rico | rica | bueno | buena | bien | sabroso | sabrosa | fresco | fresca | caliente)",
      "no (me | nos) (gusta | gustó | gustan | gustaron) [mucho | nada] [el | la | los | las | mi] [{dish}]", "(esto | el {dish}) no (esta | quedo) bien",
    ] },
    complain_wrong: { patterns: [
      "[disculpe | perdon | perdona | disculpa] (esto | eso) no es lo que (pedí | pedimos | he pedido | hemos pedido) #h:not_ordered", "[disculpe | perdon | perdona | disculpa] (yo | nosotros)? no (pedí | pedimos | he pedido | hemos pedido) (esto | eso | {dish} | el {dish} | la {dish} | los {dish}) #h:didnt_order",
      "(yo | nosotros)? (pedí | pedimos | he pedido | hemos pedido) (el | la | los | las | un | una) {dish} #h:i_ordered", "(yo | nosotros)? (pedí | pedimos | he pedido | hemos pedido) {dish}",
      "(pedí | pedimos | he pedido | hemos pedido) [el | la | los | las] {dish} (no | y no) [el | la | los | las] {dish}", "(yo | nosotros)? (pedí | pedimos | he pedido | hemos pedido) [el | la | los | las | un | una] {dish} (no | y no) (esto | eso | este | esta | ese | esa)", "(pedí | pedimos | he pedido | hemos pedido) [el | la | los | las] {dish} pero (esto | este | esta) es [el | la | los | las] {dish}",
      "creo que (hay | hubo) un (error | equivoco) #h:wrong_dish", "(se | usted se) equivocó", "(se equivocaron | hay un error) [con mi (orden | pedido | platillo)]",
      "(esto | este | esta | eso) no es (mio | mia | mi orden | mi pedido | mi platillo | nuestro | lo mio)", "creo que (me | nos) (trajo | trajeron) (otra cosa | otro platillo | el platillo equivocado | lo de otra mesa)",
      "(este | esta) no es (el | la | los | las) {dish}", "(esto | eso) es de otra mesa", "(esto | eso) (es | sera) (para | de) otra mesa", "(esto | este | esta) es (el | la | los | las) {dish}", "(donde esta | y) (mi | el | la) {dish}",
      "(esto | este | esta) (es | son) [un | una | el | la] {dish} y (yo | nosotros)? (pedí | pedimos | he pedido | hemos pedido) [el | la | los | las | un | una] {dish}",
      "(esto | eso) no (lo pedí | lo pedimos | lo he pedido | lo hemos pedido)", "no es lo que (pedí | pedimos | he pedido | hemos pedido)",
    ] },
    request: { patterns: [
      "(me | nos) (trae | puede traer | podria traer | da | puede dar | regala) (mas | otro | otra | unos | unas | un | una | el | la | los | las) {req} #h:more_tortillas",
      "(me | nos) (trae | puede traer | da) {req}", "(mas | otro | otra | unos | unas | un poco de | un poco mas de) {req}",
      "(me | nos) (sirve | puede servir) mas (agua #water) #h:refill",
      "(necesito | necesitamos | quisiera | quisieramos) (mas | otro | otra | unos | unas | un | una) {req}",
      "(tiene | tienen) (mas)? {req}", "(le | les) (falta | faltan) [un poco de] {req}",
      // "¿Hay chile habanero?": the habanero salsa (never "eso no lo tenemos")
      "(hay | habra | tendra | tendran) [algo de] (salsa | salsita | salsa picante | chile | chiles | habanero | chile habanero | salsa de habanero | xnipec) #salsa", "(dos | tres) {req}", "un vaso con hielo", "(me | nos) (trae | da) un vaso con hielo", "(me traes | traeme) [mas] {req} #tip:tu_staff",
    ] },
    box_ask: { patterns: [
      "(me | nos) (lo | la | los | las) (pone | puede poner | pueden poner | podria poner) para llevar #h:box", "(me lo | me la) (empaca | puede empacar) [para llevar]",
      "(me | nos) (puedo | podemos) llevar (lo que sobró | lo que quedó | esto | el resto) #h:box_take", "(puede | podria) poner(lo | la)? para llevar [lo que sobró | el resto | esto]",
      "(quiero | quisiera) llevarme (esto | lo que sobró | el resto)", "para llevar (lo que sobró | el resto | esto)", "(tiene | tienen) (un recipiente | una cajita | un contenedor) para llevar",
      "(me | nos) da (un recipiente | una cajita | un contenedor | una bolsa) para llevar",
    ] },
    dessert_no: { patterns: [
      "(nada de | sin) postre [para mi | para nosotros] [hoy | gracias]", "[ya] (estoy | estamos) (lleno | llena | llenos | llenas | satisfecho | satisfecha | satisfechos | llenisimo | llenisima) #h:im_full",
      "ya no (puedo | podemos) (mas | comer mas | comer nada)", "no (quiero | queremos) (postre | nada de postre | nada dulce)",
      "(estoy | estamos) a dieta", "no como (dulce | dulces | postre | azucar)", "(hoy | ahorita) no [gracias]", "no [quiero] {dessert} [gracias]",
      "(no cabe | ya no cabe) (nada | nada mas)",
      // "Postre no, gracias" / "No, postre no": no dessert (never "postre")
      "[no] [el] postre no [gracias]",
    ] },
    // "Todavía no la cuenta": not yet (never the check)
    check_not_yet: { patterns: ["todavia no [la cuenta]", "(la cuenta)? (todavia | aun) no", "no (quiero | queremos) la cuenta [todavia]", "(todavia | aun) no (nos vamos | terminamos | he terminado | hemos terminado)"] },
    // --- Paying
    check_ask: { patterns: [
      "(me | nos) (trae | puede traer | podria traer | da | puede dar) la cuenta #h:check_can", "la cuenta #h:check_please",
      "(me | nos) cobra #h:check_can2", "(me | nos) (puede | podria) cobrar", "cobrenos", "cobreme", "(me traes | traeme) la cuenta #tip:tu_staff", "me cobras #tip:tu_staff",
      "(quiero | quisiera | queremos | quisieramos) pagar [ya]", "(puedo | podemos) pagar [ya]", "(estamos | estoy) (listos | listo | lista) para pagar",
      "solo la cuenta #h:just_check", "nada mas la cuenta #h:just_check", "cuanto (le debo | le debemos | es todo | es en total)", "cual es el total",
      "(me | nos) (trae | da) la cuenta cuando pueda", "la cuenta cuando pueda", "(ya)? (terminamos | terminé | acabamos)", "ya (nos vamos | me voy)",
      "(camarero | mesero | joven) la cuenta #tip:mesero", "la (dolorosa)",
    ] },
    split_ans: { patterns: [
      "[todo] junto #together #h:split_together", "todo junto [esta bien]", "(una sola | una) cuenta #together", "todo en una (cuenta | sola cuenta) #together",
      "[cuentas] (separadas | separado | por separado) #separate #h:split_sep", "(separado | separada | separadas | aparte) [por favor] #separate", "(dos | 2) cuentas #separate",
      "(podemos | podriamos | puede | podria) (dividir | dividirla | partir) la cuenta [a la mitad | en dos | entre dos] #split #h:split_it",
      "(vamos a | queremos | podemos) pagar (a medias | mitad y mitad) #split #h:split_half", "pagamos (a medias | mitad y mitad) #split", "(a medias | mitad y mitad | cincuenta y cincuenta) #split",
      "(podemos | podriamos | queremos) pagar (por separado | separado) #separate", "cada (quien | uno | una) paga [lo suyo] #separate", "cada quien (lo suyo | su parte) #separate",
      "(yo | lo) (invito | pago yo | pago todo) #together", "yo pago [todo | por los dos | por todos] #together", "(es | va) (por mi cuenta | a mi cuenta) #together",
      "(vamos a pagar | pagamos) (junto | juntos | todo junto) #together",
      // "No separada, junta" / "Separado no, junto": the second one is the answer (rule 10)
      "(no separado | no separada | separado no | separada no | separadas no) (junto | junta | todo junto) #together",
      "(no junto | no junta | junto no | junta no) (separado | separada | separadas | por separado) #separate",
      "no (separado | separada | separadas | junto | junta | juntos) #amb",
    ] },
    pay_card: { patterns: ["no (en | con)? efectivo [mejor] con tarjeta", "(mejor | prefiero) [pagar] con tarjeta", "(es | va a ser | seria) con tarjeta",
      "[puedo | podemos] pagar con tarjeta #h:pay_card", "(con)? tarjeta [de credito | de debito] #h:pay_card_short",
      "(aceptan | acepta | reciben | toman) tarjeta[s]? [de credito | de debito]", "(aceptan | acepta) (tarjeta | visa | mastercard | american express | amex)",
      "(pago | voy a pagar | le pago | vamos a pagar) con tarjeta", "con (mi | la) tarjeta", "(aqui tiene | aqui esta) mi tarjeta", "(visa | mastercard | amex)",
      "(me | nos) trae la terminal", "con la terminal",
    ] },
    // "No con tarjeta" / "No, con tarjeta": the comma is lost, so Luis asks again (rule 10); "No con tarjeta, en efectivo" is cash
    pay_amb: { patterns: ["no (con | en) (tarjeta | efectivo) #amb", "no (tarjeta | efectivo) #amb"] },
    pay_cash: { patterns: ["no (tengo | traigo | tenemos | traemos) tarjeta", "no (quiero | queremos | puedo | podemos) pagar con tarjeta", "no (con tarjeta | tarjeta) [mejor] (en | con)? efectivo","[puedo | podemos] pagar en efectivo", "(en | con) efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago | vamos a pagar) en efectivo #h:pay_cash",
      "(mejor | prefiero) [pagar] (en | con) efectivo", "(es | va a ser | seria) (en | con) efectivo",
      "[mejor] (pago | le pago | voy a pagar | vamos a pagar | prefiero pagar) todo (en | con) efectivo"] },
    // "No traigo efectivo": so it's the card (never read as "efectivo")
    no_cash: { patterns: ["no (tengo | traigo | tenemos | traemos) [suficiente | mas] efectivo", "sin efectivo", "no (puedo | podemos) pagar en efectivo", "no (quiero | queremos) pagar en efectivo"] },
    // "¿Y si pago con tarjeta?": a what-if answers, never pays (rule 17)
    pay_whatif: { patterns: ["(y si | que pasa si | que tal si) (pago | pagamos | le pago) (con tarjeta | en efectivo | con efectivo | con el celular | con dolares)",
      "(se puede | puedo | podemos) pagar con (dolares | euros) #dollars", "(aceptan | acepta | reciben | toman) (dolares | euros) #dollars"] },
    pay_phone: { patterns: ["(puedo | podemos) pagar con (el | mi)? (celular | telefono)", "(aceptan | acepta) (apple pay | google pay)", "apple pay", "google pay", "con (el | mi) (celular | telefono)"] },
    here_you_go: { patterns: ["aqui tiene #h:here_you_go", "aqui esta", "tenga", "aqui le dejo [el dinero]", "aqui tiene {price}", "aqui (tiene | estan | le dejo) [los] {price}",
      // "Tenga, doscientos", "Le doy quinientos", "Con un billete de quinientos", "Aquí tiene cien más" (the rest)
      "(aqui tiene | tenga | tome | le doy | aqui le doy | ahi le van | ahi van) {price} [pesos] [mas]", "(aqui tiene | tenga | aqui estan | aqui le doy) (los | otros) {price} [pesos] [que faltan | que faltaban]",
      "[le pago] con un billete de {price} [pesos]", "(aqui tiene | tenga) un billete de {price} [pesos]", "(aqui tiene | aqui esta | tenga) (el resto | lo que falta | lo que faltaba)"] },
    // "¿Tiene cambio de quinientos?": a question before handing a big bill (cash, nothing counted yet)
    change_q: { patterns: ["(tiene | trae | tendra | tienen) cambio [de {price}] [pesos]", "(me puede | puede | podria) cambiar un billete de {price} [pesos]", "(tiene | trae) cambio para un billete de {price} [pesos]"] },
    // "El cambio, por favor": the change is brought
    want_change: { patterns: ["no se quede con el cambio", "[quiero | me da | me trae | me puede dar] [mi | el | su] cambio [por favor]", "(espero | esperamos) el cambio", "(me | nos) (trae | da) el cambio"] },
    keep_change: { patterns: ["quedese con el cambio #h:keep_change", "el cambio es para usted", "no (necesito | quiero) [el] cambio", "(asi | asi esta) bien #asi", "(asi | asi esta) bien quedese con el cambio", "quedate con el cambio #tip:tu_staff"] },
    ask_tip: { patterns: [
      "(esta | va) incluida la propina #h:q_tip_included", "(la propina | el servicio) (esta | va) incluid[ao]", "(esta | va) incluido el servicio", "(la cuenta | el total) (incluye | ya incluye) (la propina | el servicio)",
      "(ya)? (viene | va) (incluida la propina | incluido el servicio)", "cuanto se (deja | da) de propina #h:q_tip_how #how", "cuanto se (deja | da | acostumbra) [aqui] [normalmente] [de propina] #how", "cuanto (de propina | es la propina | se acostumbra) #how",
      "cuanto (dejo | dejamos | doy | damos) [de propina] [normalmente] #how", "(hay que | se debe | debo | debemos) dejar propina #how", "que propina es normal [aqui] #how", "(es | cuanto es lo) normal [aqui] #how",
      "(se deja | se da) propina [aqui] #how", "normalmente cuanto se deja [de propina] #how",
    ] },
    tip_ctx: { patterns: [
      "[el] {number} por ciento #h:tip_percent", "[el] {number} [por ciento] (esta bien | por favor) #h:tip_percent", "{number}",
      "(pongale | agreguele | ponga | agregue | ponle | agregale) [el] {number} [por ciento] #h:tip_pesos", "(le dejo | le pongo | dejo | pongo | le doy) [el] {number} por ciento",
      "es normal [dejar] el {number} [por ciento] #q", "(esta bien | es suficiente) [con] el {number} [por ciento] #qok", "(es mucho | es poco | es demasiado | no es mucho) [dejar] [con] el {number} [por ciento] #q #much",
      "(pongale | agreguele | ponga | agregue | le dejo | le pongo | le doy) {price} [de propina] #pesos", "{price} de propina #pesos", "{price} pesos [de propina] [por favor] #pesos",
      "[el] {number} por ciento de propina",
      // "Quiero dejar el diez por ciento" / "Le voy a dejar cien pesos"
      "(quiero | quisiera | voy a | le voy a | vamos a | le quiero) (dejar | dejarle | poner | ponerle | dar | darle | agregar | agregarle) [el] {number} [por ciento] [de propina]",
      "(quiero | quisiera | voy a | le voy a | vamos a | le quiero) (dejar | dejarle | poner | ponerle | dar | darle | agregar | agregarle) {price} pesos [de propina] #pesos",
      // "¿Cuánto es el diez por ciento?": the amount, nothing paid
      "cuanto (es | seria | serian | sale | queda | da) [con] [el] {number} por ciento [de propina] #howmuch", "cuanto (es | seria | serian | sale | queda) [con] el {number} [de propina] #howmuch", "cuanto (es | seria) (la propina | de propina) (con | del) [el] {number} [por ciento] #howmuch",
      // "No el quince, el diez" / "Quince no, diez": the second number is the tip
      "no [el] {number} [por ciento] [sino] [el] {number} [por ciento] #second", "[el] {number} no [mejor] [el] {number} [por ciento] #second",
    ] },
    tip_give: { patterns: [
      "(esto | esto es) para usted", "aqui (tiene | le dejo) (la | su | una) propina", "(le dejo | le voy a dejar | voy a dejar) (una)? propina",
      "(quiero | quisiera) dejar (una)? propina",
      // with cash: "Le dejo cincuenta de propina" (the rest of the change comes back)
      "(le dejo | le voy a dejar | voy a dejar | dejo | le doy) {price} [pesos] de propina", "(le dejo | le voy a dejar | voy a dejar | dejo | le doy) el {number} por ciento [de propina]",
    ] },
    // "Sí, estoy seguro" to "¿$1,000 de propina? ¿Está seguro?"
    sure_ctx: { patterns: ["[si] (estoy | estamos) (seguro | segura | seguros | seguras) [gracias]", "[si] (seguro | segura | seguros | seguras)", "[si] (se lo | se la) (merece | ganó)", "[si] (son | es) para usted"] },
    // "Nada." / "Ninguna." to "¿Cuánto le agrego de propina?"
    tip_none_ctx: { patterns: ["(nada | ninguna | cero | nada gracias) [de propina]"] },
    tip_none: { patterns: ["sin propina", "no (quiero | voy a) dejar propina", "no (le pongo | pongo | dejo | le dejo) propina", "nada de propina", "(cero | 0) [por ciento] [de propina]", "no (quiero | queremos) dar propina"] },
    // The brief's small twist: "¿Va a requerir factura?"
    factura_ask: { patterns: ["(me | nos) (da | puede dar | hace | puede hacer) (factura | la factura) #h:q_factura", "(necesito | quiero | quisiera) (factura | la factura)",
      "(dan | hacen | puede hacer) factura", "la factura [por favor]"] },
    factura_yes_ctx: { patterns: ["[si] (la | lo) necesito", "[si] (necesito | quiero) [la] factura", "[si] (la | lo) (quiero | requiero)", "[si] factura [por favor]"] },
    factura_no_ctx: { patterns: ["[no] no (la | lo) necesito", "[no] no (necesito | quiero | requiero) [la] factura", "[no] sin factura", "[no] no hace falta", "[no] no es necesario", "solo el (ticket | recibo)"] },
    // --- Changes of mind
    reject: { patterns: [
      "[mejor] no (quiero | voy a querer | vamos a querer) [el | la | los | las | un | una] {item}", "[mejor] no {item}", "(cancele | quite | olvide) [el | la | los | las] {item}",
      "[mejor] ya no (lo | la | los | las) (quiero | queremos)", "[mejor] ya no (quiero | queremos | voy a querer) [el | la | los | las | un | una] {item}", "cambié de opinion", "olvidelo", "no tomo {item}", "no (como | comemos) {item}",
      "no me gusta [el | la | los | las] {item}", "sin {item}", "nada de {item}", "[el | la | los | las] {item} no [gracias]", "[el | la | los | las] {item} no (me | nos) (gusta | gustan | convence)",
    ] },
    change: { patterns: [
      "[mejor] (puede | podria) cambiar(lo | la | los)? (por | a) {item}", "[mejor] (me | nos) (lo | la) cambia (por | a) {item}", "mejor {item}",
      "{item} en (vez | lugar) [de eso]", "(mejor | quiero | quisiera) {item} en (vez | lugar) [de eso]", "@order_prefix {item} en (vez | lugar) [de eso]", "mejor (quiero | quisiera | voy a querer | me da | me trae) {item}",
      // "No, mejor el poc chuc": a change, never "no poc chuc"
      "no [gracias | perdon] mejor {item}", "no [no | perdon] mejor (quiero | quisiera | voy a querer | me da | me trae | traigame) {item}",
    ] },
    // "No la cochinita, el poc chuc": the second item replaces the first (never an order for the first)
    correction: { patterns: ["[no | ya] no (quiero | voy a querer) {item} [sino | mejor] [quiero | voy a querer | me trae | me da] {item}", "[no] no {item} sino {item}", "[no] no {item} [mejor] {item}", "[no] {item} no [mejor] {item}", "[mejor] {item} en (vez | lugar) de {item}", "dije {item}",
      // "Quiero el poc chuc en lugar de la cochinita", "En vez de la cochinita, el poc chuc", "Cámbieme la cochinita por el poc chuc"
      "@order_prefix {item} en (vez | lugar) de {item}", "en (vez | lugar) de {item} [mejor] [quiero | quisiera | voy a querer | me trae | me da | traigame] {item}",
      "(cambieme | cambiame | me cambia | me puede cambiar | me podria cambiar | puede cambiar | podria cambiar | cambie) {item} por {item}"] },
    // "Un postre, por favor" / "Sí, un postre" / "Postre." to "¿Le traigo un postre o un cafecito?": which one?
    dessert_some_ctx: { patterns: [
      "[si] (un | algun | algo de) postre", "postre", "[si] (quiero | quisiera | queremos | quisieramos | voy a querer | vamos a querer) (un | algun | algo de)? postre",
      "[si] (me | nos) (trae | da | puede traer | podria traer) (un | algun | algo de) postre", "[si] algo dulce", "[si] (puedo | podemos | quiero | queremos) ver los postres",
      "mejor (un | algun | algo de) postre",
    ] },
    // "La propina se la dejo en efectivo": the card pays the check, the tip is left in cash (common in Mexico)
    tip_cash: { patterns: [
      "(le dejo | le doy | se la dejo | se la doy | dejo | doy | le voy a dejar | voy a dejar | se la voy a dejar) la propina en efectivo #h:tip_cash",
      "[y] la propina (se la dejo | se la doy | la dejo | se la pago | la pago | le dejo | va | es | se la doy aparte) en efectivo #h:tip_cash",
      "(puedo | podemos | se puede) (dejar | dejarle | dar | darle | pagar) la propina en efectivo", "[y] la propina en efectivo",
      "(la propina | propina) aparte [en efectivo]", "la propina se la (dejo | doy) aparte", "sin propina en la tarjeta [se la dejo en efectivo]",
    ] },
    // "Sí, una" to "¿Gusta una (sopa) para empezar?"
    soup_yes_ctx: { patterns: ["si (una | uno) [por favor] [para empezar | para mi]", "si (traigame | me trae | traiganos | nos trae) una [por favor]", "[si] una para (compartir | los dos | empezar)"] },
  },

  lines: {
    // --- Lucía, the host
    greet: [
      t("¡Buenas noches! | ¡{m:Bienvenido|f:Bienvenida} | a | La Cocina de Lucía! | ¿Tiene | reservación?", "Good evening! | Welcome | to | La Cocina de Lucía! | Do you have | a reservation?",
        "Good evening! Welcome to La Cocina de Lucía! Do you have a reservation?",
        { spain: t("¡Buenas noches! | ¡{m:Bienvenido|f:Bienvenida} | a | La Cocina de Lucía! | ¿Tienes | reserva?", "Good evening! | Welcome | to | La Cocina de Lucía! | Do you have | a reservation?", "Good evening! Welcome to La Cocina de Lucía! Do you have a reservation?") }),
      t("¡Buenas noches, | {m:bienvenido|f:bienvenida}! | ¿Tiene | reservación | con | nosotros?", "Good evening, | welcome! | Do you have | a reservation | with | us?",
        "Good evening, welcome! Do you have a reservation with us?",
        { spain: t("¡Buenas noches, | {m:bienvenido|f:bienvenida}! | ¿Tienes | reserva | con | nosotros?", "Good evening, | welcome! | Do you have | a reservation | with | us?", "Good evening, welcome! Do you have a reservation with us?") }),
      t("¡Hola, | buenas noches! | Pase. | ¿Tiene | reservación?", "Hi, | good evening! | Come in. | Do you have | a reservation?", "Hi, good evening! Come on in. Do you have a reservation?",
        { spain: t("¡Hola, | buenas noches! | Pasa. | ¿Tienes | reserva?", "Hi, | good evening! | Come in. | Do you have | a reservation?", "Hi, good evening! Come on in. Do you have a reservation?") }),
    ],
    greet_back: [
      t("¡Qué | gusto | {m:verlo|f:verla} | otra vez! | ¿Tiene | reservación | esta | noche?", "How | nice | to see you | again! | Do you have | a reservation | this | evening?",
        "So nice to see you again! Do you have a reservation tonight?", { flags: { 2: "verlo / verla: “to see you”, with lo for a man and la for a woman (usted)." },
        spain: t("¡Qué | alegría | verte | otra vez! | ¿Tienes | reserva | esta | noche?", "How | nice | to see you | again! | Do you have | a reservation | this | evening?", "So nice to see you again! Do you have a reservation tonight?") }),
    ],
    right_place: [
      t("¡Ja! | Pues | llegó | al | lugar | indicado.", "Ha! | Well | you-came | to the | place | right.", "Ha! Well, you've come to the right place!",
        { spain: t("¡Ja! | Pues | has llegado | al | sitio | indicado.", "Ha! | Well | you've come | to the | place | right.", "Ha! Well, you've come to the right place!") }),
    ],
    ask_resv: [
      t("¿Tiene | reservación?", "Do you have | a reservation?", "Do you have a reservation?",
        { spain: t("¿Tienes | reserva?", "Do you have | a reservation?", "Do you have a reservation?") }),
      t("¿Y | tiene | reservación?", "And | do you have | a reservation?", "And do you have a reservation?",
        { spain: t("¿Y | tienes | reserva?", "And | do you have | a reservation?", "And do you have a reservation?") }),
    ],
    ask_resv_name: [
      t("¡Perfecto! | ¿A nombre de | quién?", "Perfect! | Under the name of | whom?", "Great! What's the name?"),
      t("Muy | bien. | ¿A nombre de | quién | está?", "Very | good. | Under the name of | whom | is it?", "Okay. What name is it under?"),
    ],
    resv_found: [
      t("Perfecto, | aquí | está | su | reservación.", "Perfect, | here | is | your | reservation.", "Perfect, here's your reservation.",
        { spain: t("Perfecto, | aquí | está | tu | reserva.", "Perfect, | here | is | your | reservation.", "Perfect, here's your reservation.") }),
      t("Muy | bien, | ya | la | encontré.", "Very | good, | already | it | I-found.", "Great, I found it.", { flags: { 3: "la: “it”, the reservation (la reservación)." },
        spain: t("Muy | bien, | ya | la | he encontrado.", "Very | good, | already | it | I've-found.", "Great, I found it.", { flags: { 3: "la: “it”, the reservation (la reserva)." } }) }),
    ],
    ask_party: [
      t("¿Para | cuántas | personas?", "For | how many | people?", "How many people?"),
      t("¿Mesa | para | cuántos?", "Table | for | how many?", "A table for how many?"),
      t("Muy | bien. | ¿Cuántas | personas | son?", "Very | good. | How many | people | are you?", "Okay! How many of you are there?"),
    ],
    ask_just_one: [
      t("¿Mesa | para | uno?", "Table | for | one?", "A table for one?"),
      t("¿Nada más | usted?", "Just | you?", "Just you tonight?",
        { spain: t("¿Solo | tú?", "Just | you?", "Just you tonight?") }),
    ],
    wait_10: [
      t("Ahorita | no hay | mesas | libres. | Son | unos | diez | minutos | de | espera. | ¿Está bien?", "Right now | there aren't | tables | free. | It's | about | ten | minutes | of | wait. | Is that okay?",
        "We don't have a free table right now. It'll be about a ten-minute wait. Is that okay?",
        { flags: { 0: "Mexican: ahorita = right now.", 5: "“unos” before a number: “about”." },
          neutral: t("En | este | momento | no hay | mesas | libres. | Son | unos | diez | minutos | de | espera. | ¿Está bien?",
            "At | this | moment | there aren't | tables | free. | It's | about | ten | minutes | of | wait. | Is that okay?",
            "We don't have a free table right now. It'll be about a ten-minute wait. Is that okay?", { flags: { 7: "“unos” before a number: “about”." } }) }),
    ],
    wait_15: [
      t("Esta | noche | hay | mucha | gente. | La | espera | es | de | unos | quince | minutos. | ¿Le | parece | bien?",
        "This | evening | there are | many | people. | The | wait | is | of | about | fifteen | minutes. | (To) you | does it seem | fine?",
        "We're pretty busy tonight. It'll be about fifteen minutes. Is that okay?", { flags: { 9: "“unos” before a number: “about”." },
        spain: t("Esta | noche | hay | mucha | gente. | La | espera | es | de | unos | quince | minutos. | ¿Te | parece | bien?", "This | evening | there are | many | people. | The | wait | is | of | about | fifteen | minutes. | (To) you | does it seem | fine?", "We're pretty busy tonight. It'll be about fifteen minutes. Is that okay?", { flags: { 9: "“unos” before a number: “about”." } }) }),
    ],
    wait_15_pl: [
      t("Esta | noche | hay | mucha | gente. | La | espera | es | de | unos | quince | minutos. | ¿Les | parece | bien?",
        "This | evening | there are | many | people. | The | wait | is | of | about | fifteen | minutes. | (To) you | does it seem | fine?",
        "We're pretty busy tonight. It'll be about fifteen minutes. Is that okay?", { flags: { 9: "“unos” before a number: “about”.", 12: "les: “(to) you”, all of you (ustedes)." },
        spain: t("Esta | noche | hay | mucha | gente. | La | espera | es | de | unos | quince | minutos. | ¿Os | parece | bien?", "This | evening | there are | many | people. | The | wait | is | of | about | fifteen | minutes. | (To) you (all) | does it seem | fine?", "We're pretty busy tonight. It'll be about fifteen minutes. Is that okay?", { flags: { 9: "“unos” before a number: “about”.", 12: "os: “(to) you”, all of you (vosotros)." } }) }),
    ],
    wait_again: [t("¿Está bien | si | espera | un | poco?", "Is it okay | if | you-wait | a | little?", "Is it okay to wait a little?",
        { spain: t("¿Está bien | si | esperas | un | poco?", "Is it okay | if | you-wait | a | little?", "Is it okay to wait a little?") })],
    wait_again_pl: [t("¿Está bien | si | esperan | un | poco?", "Is it okay | if | you-wait | a | little?", "Is it okay to wait a little?",
        { spain: t("¿Está bien | si | esperáis | un | poco?", "Is it okay | if | you (all) wait | a | little?", "Is it okay to wait a little?") })],
    wait_is_10: [t("Unos | diez | minutos, | más o menos.", "About | ten | minutes, | more or less.", "About ten minutes.", { flags: { 0: "“unos” before a number: “about”." } })],
    wait_is_15: [t("Unos | quince | minutos, | más o menos.", "About | fifteen | minutes, | more or less.", "About fifteen minutes.", { flags: { 0: "“unos” before a number: “about”." } })],
    no_wait: [
      t("No tiene | que | esperar: | hay | mesas | libres.", "You don't have | to | wait: | there are | tables | free.", "There's no wait right now: we have free tables.",
        { spain: t("No tienes | que | esperar: | hay | mesas | libres.", "You don't have | to | wait: | there are | tables | free.", "There's no wait right now: we have free tables.") }),
    ],
    wait_ok: [
      t("Perfecto. | No tarda | mucho.", "Perfect. | It won't take | long.", "Great. It won't be long."),
    ],
    table_ready: [
      t("¡Listo, | ya | está | su | mesa!", "Ready, | already | is | your | table!", "Okay, your table is ready!",
        { spain: t("¡Perfecto, | ya | está | tu | mesa!", "Perfect, | already | is | your | table!", "Okay, your table is ready!") }),
    ],
    table_opened: [
      t("¡Ah, | espere! | Se acaba | de | desocupar | una | mesa.", "Oh, | wait! | It just | — | got free | a | table.", "Oh, wait, a table just opened up!",
        { flags: { 3: "acabar de + infinitive = to have just done something; de has no word of its own here." },
        spain: t("¡Ah, | espera! | Se acaba | de | quedar libre | una | mesa.", "Oh, | wait! | It just | — | became free | a | table.", "Oh, wait, a table just opened up!", { flags: { 3: "acabar de + infinitive = to have just done something; de has no word of its own here." } }) }),
    ],
    ask_seat: [
      t("¿Prefiere | adentro | o | en | la | terraza?", "Do you prefer | inside | or | on | the | terrace?", "Would you like to sit inside or on the terrace?",
        { spain: t("¿Prefieres | dentro | o | en | la | terraza?", "Do you prefer | inside | or | on | the | terrace?", "Would you like to sit inside or on the terrace?") }),
      t("¿Adentro | o | afuera?", "Inside | or | outside?", "Inside or outside?",
        { spain: t("¿Dentro | o | fuera?", "Inside | or | outside?", "Inside or outside?") }),
    ],
    ask_seat_pl: [
      t("¿Prefieren | adentro | o | en | la | terraza?", "Do you prefer | inside | or | on | the | terrace?", "Would you like to sit inside or on the terrace?",
        { flags: { 0: "prefieren: the ustedes form, for a group." },
        spain: t("¿Preferís | dentro | o | en | la | terraza?", "Do you (all) prefer | inside | or | on | the | terrace?", "Would you like to sit inside or on the terrace?", { flags: { 0: "preferís: the vosotros form, for a group." } }) }),
      t("¿Adentro | o | afuera?", "Inside | or | outside?", "Inside or outside?",
        { spain: t("¿Dentro | o | fuera?", "Inside | or | outside?", "Inside or outside?") }),
    ],
    seat_window_ok: [
      t("¡Claro! | Tenemos | una | mesa | muy | bonita | junto | a | la | ventana.", "Sure! | We have | a | table | very | nice | next | to | the | window.", "Of course! We have a really nice table by the window."),
    ],
    seat_window_full: [
      t("Lo siento, | las | mesas | junto | a | la | ventana | están | ocupadas. | Pero | tengo | una | mesa | tranquila | al fondo.",
        "I'm sorry, | the | tables | next | to | the | window | are | taken. | But | I have | a | table | quiet | at the back.",
        "I'm sorry, the window tables are all taken right now. But I have a nice quiet table in the back."),
    ],
    seat_can_do: [t("Claro, | sí | se puede.", "Sure, | yes | it's possible.", "Sure, we can do that.")],
    seat_patio_ok: [t("¡Claro! | La | terraza | está | muy | agradable | esta | noche.", "Sure! | The | terrace | is | very | nice | this | evening.", "Sure! The terrace is lovely tonight.")],
    seat_quiet_ok: [t("Claro. | Tengo | una | mesa | tranquila | al fondo.", "Sure. | I have | a | table | quiet | at the back.", "Of course. I have a quiet table in the back.")],
    seat_any_ok: [t("Muy | bien.", "Very | well.", "Alright.")],
    seating: [
      t("Pase | por | aquí, | por favor. | Aquí tiene | el | menú. | Luis | {m:lo|f:la} | atiende | en | un | momento.",
        "Come | through | here, | please. | Here's | the | menu. | Luis | you | serves | in | a | moment.", "Right this way, please. Here's the menu. Luis will be right with you.",
        { flags: { 8: "lo / la: “you”, lo for a man and la for a woman (usted)." },
        spain: t("Pasa | por | aquí, | por favor. | Aquí tienes | la | carta. | Luis | te | atiende | en | un | momento.", "Come | through | here, | please. | Here's | the | menu. | Luis | you | serves | in | a | moment.", "Right this way, please. Here's the menu. Luis will be right with you.", { flags: { 6: "Spain: la carta = the menu (el menú is a set meal).", 8: "te: “you” (tú)." } }) }),
      t("Sígame, | por favor. | Esta | es | su | mesa. | Su | mesero | viene | enseguida.", "Follow me, | please. | This | is | your | table. | Your | waiter | is coming | right away.",
        "Follow me, please. Here's your table. Your waiter will be right with you.",
        { spain: t("Sígueme, | por favor. | Esta | es | tu | mesa. | Tu | camarero | viene | enseguida.", "Follow me, | please. | This | is | your | table. | Your | waiter | is coming | right away.", "Follow me, please. Here's your table. Your waiter will be right with you.") }),
    ],
    seating_pl: [
      t("Pasen | por | aquí, | por favor. | Aquí tienen | los | menús. | Luis | los | atiende | en | un | momento.",
        "Come | through | here, | please. | Here are | the | menus. | Luis | you | serves | in | a | moment.", "Right this way, please. Here are your menus. Luis will be right with you.",
        { flags: { 8: "los: “you”, all of you (ustedes)." },
        spain: t("Pasad | por | aquí, | por favor. | Aquí tenéis | las | cartas. | Luis | os | atiende | en | un | momento.", "Come (all) | through | here, | please. | Here are | the | menus. | Luis | you (all) | serves | in | a | moment.", "Right this way, please. Here are your menus. Luis will be right with you.", { flags: { 0: "pasad: the vosotros command, for a group.", 8: "os: “you”, all of you (vosotros)." } }) }),
      t("Síganme, | por favor. | Esta | es | su | mesa. | Su | mesero | viene | enseguida.", "Follow me, | please. | This | is | your | table. | Your | waiter | is coming | right away.",
        "Follow me, please. Here's your table. Your waiter will be right with you.",
        { spain: t("Seguidme, | por favor. | Esta | es | vuestra | mesa. | Vuestro | camarero | viene | enseguida.", "Follow me (all), | please. | This | is | your | table. | Your | waiter | is coming | right away.", "Follow me, please. Here's your table. Your waiter will be right with you.") }),
    ],
    host_order: [
      t("¡Claro! | Se lo | paso | a | su | mesero.", "Sure! | It to him | I'll-pass | to | your | waiter.", "Sure! I'll pass it on to your server.",
        { spain: t("¡Claro! | Se lo | paso | al | camarero.", "Sure! | It to him | I'll-pass | to the | waiter.", "Sure! I'll pass it on to your server.") }),
    ],
    // --- Luis, the waiter
    m_greet: [
      t("Buenas noches, | soy | Luis | y | voy | a | ser | su | mesero | esta | noche.", "Good evening, | I'm | Luis | and | I'm going | to | be | your | waiter | this | evening.",
        "Good evening, I'm Luis, and I'll be your server tonight.",
        { spain: t("Buenas noches, | soy | Luis | y | voy | a | ser | el | camarero | de | esta | mesa.", "Good evening, | I'm | Luis | and | I'm going | to | be | the | waiter | of | this | table.", "Good evening, I'm Luis, and I'll be your server tonight.") }),
      t("¡Hola, | buenas noches! | Soy | Luis, | su | mesero.", "Hi, | good evening! | I'm | Luis, | your | waiter.", "Hi, good evening! I'm Luis, your server.",
        { spain: t("¡Hola, | buenas noches! | Soy | Luis, | el | camarero.", "Hi, | good evening! | I'm | Luis, | the | waiter.", "Hi, good evening! I'm Luis, your server.") }),
    ],
    m_greet_hay: [
      t("Buenas noches, | soy | Luis, | su | mesero. | ¿Cómo | está | esta | noche?", "Good evening, | I'm | Luis, | your | waiter. | How | are you | this | evening?",
        "Good evening, I'm Luis, your server. How are you doing tonight?",
        { spain: t("Buenas noches, | soy | Luis, | tu | camarero. | ¿Qué tal | estás | esta | noche?", "Good evening, | I'm | Luis, | your | waiter. | How | are you | this | evening?", "Good evening, I'm Luis, your server. How are you doing tonight?") }),
    ],
    m_greet_hay_pl: [
      t("Buenas noches, | soy | Luis, | su | mesero. | ¿Cómo | están | esta | noche?", "Good evening, | I'm | Luis, | your | waiter. | How | are you | this | evening?",
        "Good evening, I'm Luis, your server. How are you all doing tonight?",
        { spain: t("Buenas noches, | soy | Luis, | vuestro | camarero. | ¿Qué tal | estáis | esta | noche?", "Good evening, | I'm | Luis, | your | waiter. | How | are you (all) | this | evening?", "Good evening, I'm Luis, your server. How are you all doing tonight?") }),
    ],
    ask_drinks: [
      t("¿Qué | le | traigo | de | tomar?", "What | (to) you | I-bring | to | drink?", "What can I get you to drink?", { flags: { 1: "le: “(to) you” (usted)." },
        spain: t("¿Qué | te | traigo | de | beber?", "What | (to) you | I-bring | to | drink?", "What can I get you to drink?", { flags: { 1: "te: “(to) you” (tú)." } }) }),
      t("¿Le | traigo | algo | de | tomar?", "(To) you | I-bring | something | to | drink?", "Can I get you something to drink?",
        { spain: t("¿Te | traigo | algo | de | beber?", "(To) you | I-bring | something | to | drink?", "Can I get you something to drink?") }),
      t("¿Algo | de | tomar | para | empezar?", "Something | to | drink | to | start?", "Something to drink to start?"),
    ],
    ask_drinks_pl: [
      t("¿Qué | les | traigo | de | tomar?", "What | (to) you | I-bring | to | drink?", "What can I get you to drink?", { flags: { 1: "les: “(to) you”, all of you (ustedes)." },
        spain: t("¿Qué | os | traigo | de | beber?", "What | (to) you (all) | I-bring | to | drink?", "What can I get you to drink?", { flags: { 1: "os: “(to) you”, all of you (vosotros)." } }) }),
      t("¿Les | traigo | algo | de | tomar?", "(To) you | I-bring | something | to | drink?", "Can I get you something to drink?",
        { spain: t("¿Os | traigo | algo | de | beber?", "(To) you (all) | I-bring | something | to | drink?", "Can I get you something to drink?") }),
      t("¿Algo | de | tomar | para | empezar?", "Something | to | drink | to | start?", "Something to drink to start?"),
    ],
    ask_drinks_again: [t("¿Y | algo | de | tomar?", "And | something | to | drink?", "And anything to drink?")],
    what_drink: [t("¡Claro! | ¿Qué | le | traigo?", "Sure! | What | (to) you | I-bring?", "Sure! What would you like?",
        { spain: t("¡Claro! | ¿Qué | te | traigo?", "Sure! | What | (to) you | I-bring?", "Sure! What would you like?") })],
    what_drink_pl: [t("¡Claro! | ¿Qué | les | traigo?", "Sure! | What | (to) you | I-bring?", "Sure! What would you like?",
        { spain: t("¡Claro! | ¿Qué | os | traigo?", "Sure! | What | (to) you (all) | I-bring?", "Sure! What would you like?") })],
    ask_water_kind: [
      t("¿Natural | o | mineral?", "Still | or | sparkling?", "Still or sparkling?", { flags: { 0: "In Mexico agua natural is still water and agua mineral is sparkling." },
        neutral: t("¿Sin | gas | o | con | gas?", "Without | gas | or | with | gas?", "Still or sparkling?", { flags: { 0: "sin gas = still, con gas = sparkling." } }) }),
      t("Claro. | ¿La | quiere | natural | o | mineral?", "Sure. | It | do you want | still | or | sparkling?", "Sure. Still or sparkling?", { flags: { 1: "la: “it”, the water (el agua is feminine)." },
        neutral: t("Claro. | ¿La | quiere | sin | gas | o | con | gas?", "Sure. | It | do you want | without | gas | or | with | gas?", "Sure. Still or sparkling?", { flags: { 1: "la: “it”, the water (el agua is feminine)." } }),
        spain: t("Claro. | ¿La | quieres | sin | gas | o | con | gas?", "Sure. | It | do you want | without | gas | or | with | gas?", "Sure. Still or sparkling?", { flags: { 1: "la: “it”, the water (el agua is feminine)." } }) }),
    ],
    ask_lemonade_kind: [
      t("¿Natural | o | mineral?", "Still | or | sparkling?", "Made with still or sparkling water?", { flags: { 0: "A limonada mineral is made with sparkling water: very Mexican." },
        neutral: t("¿Sin | gas | o | con | gas?", "Without | gas | or | with | gas?", "Made with still or sparkling water?", { flags: { 0: "sin gas = still, con gas = sparkling." } }) }),
      t("¿La | limonada | natural | o | mineral?", "The | lemonade | still | or | sparkling?", "Would you like the lemonade with still water or sparkling?",
        { neutral: t("¿La | limonada | sin | gas | o | con | gas?", "The | lemonade | without | gas | or | with | gas?", "Would you like the lemonade with still water or sparkling?") }),
    ],
    ask_wine_kind: [
      t("¿Tinto | o | blanco?", "Red | or | white?", "Red or white?"),
      t("Claro. | ¿Vino | tinto | o | blanco?", "Sure. | Wine | red | or | white?", "Sure. Red or white?"),
    ],
    ask_soda_kind: [
      t("Tenemos | refresco | de | cola, | cola | light | y | de | toronja.", "We have | soda | of | cola, | cola | diet | and | of | grapefruit.", "We have cola, diet cola and grapefruit soda.",
        { spain: t("Tenemos | refresco | de | cola, | cola | light | y | de | pomelo.", "We have | soda | of | cola, | cola | diet | and | of | grapefruit.", "We have cola, diet cola and grapefruit soda.") }),
      t("Claro. | ¿De | cola, | cola | light | o | de | toronja?", "Sure. | Of | cola, | cola | diet | or | of | grapefruit?", "Sure. Cola, diet cola or grapefruit?",
        { spain: t("Claro. | ¿De | cola, | cola | light | o | de | pomelo?", "Sure. | Of | cola, | cola | diet | or | of | grapefruit?", "Sure. Cola, diet cola or grapefruit?") }),
    ],
    ask_fresca_kind: [
      t("¿De | qué? | Hay | de | horchata, | de | jamaica | y | de | chaya | con | piña.", "Of | what? | There's | of | horchata, | of | hibiscus | and | of | chaya | with | pineapple.",
        "What flavor? There's horchata, hibiscus, and chaya with pineapple.", { flags: { 4: "horchata: a cold, sweet rice drink with cinnamon.", 9: "Chaya: a leafy green from Yucatán, blended with pineapple into a cool drink." } }),
    ],
    ask_coffee_kind: [
      t("¿Americano | o | de | olla?", "Americano | or | from | pot?", "Americano or café de olla?", { flags: { 3: "Café de olla: coffee brewed in a clay pot with cinnamon and piloncillo sugar." } }),
    ],
    ask_pibil_kind: [
      t("¿Cuál? | Tenemos | cochinita | pibil | y | pollo | pibil.", "Which one? | We have | pork | pibil | and | chicken | pibil.", "Which one? We have cochinita pibil and chicken pibil.",
        { flags: { 6: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves.", 3: "Pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves." } }),
    ],
    drinks_ack: [
      t("Muy | bien, | ahorita | se lo | traigo.", "Very | good, | right away | it to you | I'll-bring.", "Great, I'll bring that right out.",
        { flags: { 2: "Mexican: ahorita = right now, in a moment." },
          neutral: t("Muy | bien, | enseguida | se lo | traigo.", "Very | good, | right away | it to you | I'll-bring.", "Great, I'll bring that right out."),
        spain: t("Muy | bien, | enseguida | te lo | traigo.", "Very | good, | right away | it to you | I'll-bring.", "Great, I'll bring that right out.") }),
      t("¡Enseguida!", "Right away!", "Coming right up!"),
    ],
    drinks_ack_pl: [
      t("Muy | bien, | ahorita | se los | traigo.", "Very | good, | right away | them to you | I'll-bring.", "Great, I'll bring those right out.",
        { flags: { 2: "Mexican: ahorita = right now, in a moment." },
          neutral: t("Muy | bien, | enseguida | se los | traigo.", "Very | good, | right away | them to you | I'll-bring.", "Great, I'll bring those right out."),
        spain: t("Muy | bien, | enseguida | os los | traigo.", "Very | good, | right away | them to you (all) | I'll-bring.", "Great, I'll bring those right out.") }),
      t("¡Enseguida!", "Right away!", "Coming right up!"),
    ],
    drinks_served: [t("Aquí | están | sus | bebidas.", "Here | are | your | drinks.", "Here are your drinks.",
        { spain: t("Aquí | están | las | bebidas.", "Here | are | the | drinks.", "Here are your drinks.") })],
    drink_served: [t("Aquí tiene | su | {X}.", "Here's | your | {X}.", "Here's your {X}.",
        { spain: t("Aquí tienes | tu | {X}.", "Here's | your | {X}.", "Here's your {X}.") })],
    specials: [
      t("Hoy | tenemos | de | especial | el | tikin xic, | con | pescado | fresco | del | día.", "Today | we have | as | special | the | tikin xic, | with | fish | fresh | of the | day.",
        "Today's special is the tikin xic, made with fresh fish of the day.", { flags: { 5: "Tikin xic (Mayan): fish in achiote, grilled in a banana leaf." } }),
      t("Hoy | le | recomiendo | el | tikin xic: | el | pescado | llegó | esta | mañana.", "Today | (to) you | I-recommend | the | tikin xic: | the | fish | arrived | this | morning.",
        "Tonight I recommend the tikin xic: the fish came in this morning.",
        { flags: { 4: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán)." }, spain: t("Hoy | recomiendo | el | tikin xic: | el | pescado | ha llegado | esta | mañana.", "Today | I-recommend | the | tikin xic: | the | fish | has arrived | this | morning.", "Tonight I recommend the tikin xic: the fish came in this morning.", { flags: { 3: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán)." } }) }),
    ],
    ask_ready: [
      t("¿Ya | está | {m:listo|f:lista} | para | ordenar?", "Yet | are you | ready | to | order?", "Are you ready to order?", { flags: { 0: "Ya in a question: “yet”, “already”." },
        spain: t("¿Ya | estás | {m:listo|f:lista} | para | pedir?", "Yet | are you | ready | to | order?", "Are you ready to order?", { flags: { 0: "Ya in a question: “yet”, “already”." } }) }),
      t("¿Ya | sabe | qué | va | a | pedir?", "Yet | do you know | what | you're going | to | order?", "Do you know what you'd like?",
        { spain: t("¿Ya | sabes | qué | vas | a | pedir?", "Yet | do you know | what | you're going | to | order?", "Do you know what you'd like?") }),
      t("¿Ya | decidió, | o | necesita | unos | minutos | más?", "Yet | did you decide, | or | do you need | a few | minutes | more?", "Have you decided, or do you need a few more minutes?",
        { spain: t("¿Ya | lo has decidido, | o | necesitas | unos | minutos | más?", "Yet | have you decided, | or | do you need | a few | minutes | more?", "Have you decided, or do you need a few more minutes?") }),
    ],
    ask_ready_pl: [
      t("¿Ya | están | listos | para | ordenar?", "Yet | are you | ready | to | order?", "Are you ready to order?", { flags: { 0: "Ya in a question: “yet”, “already”." },
        spain: t("¿Ya | estáis | listos | para | pedir?", "Yet | are you (all) | ready | to | order?", "Are you ready to order?", { flags: { 0: "Ya in a question: “yet”, “already”." } }) }),
      t("¿Ya | saben | qué | van | a | pedir?", "Yet | do you know | what | you're going | to | order?", "Do you know what you'd like?",
        { spain: t("¿Ya | sabéis | qué | vais | a | pedir?", "Yet | do you (all) know | what | you're going | to | order?", "Do you know what you'd like?") }),
      t("¿Ya | decidieron, | o | necesitan | unos | minutos | más?", "Yet | did you decide, | or | do you need | a few | minutes | more?", "Have you decided, or do you need a few more minutes?",
        { spain: t("¿Ya | lo habéis decidido, | o | necesitáis | unos | minutos | más?", "Yet | have you (all) decided, | or | do you need | a few | minutes | more?", "Have you decided, or do you need a few more minutes?") }),
    ],
    ask_order: [
      t("¿Qué | le | traigo?", "What | (to) you | I-bring?", "What can I get you?",
        { spain: t("¿Qué | te | traigo?", "What | (to) you | I-bring?", "What can I get you?") }),
      t("Entonces, | ¿qué | va | a | pedir?", "So, | what | are you going | to | order?", "So, what will you have tonight?",
        { spain: t("Entonces, | ¿qué | vas | a | pedir?", "So, | what | are you going | to | order?", "So, what will you have tonight?") }),
    ],
    ask_order_pl: [
      t("¿Qué | les | traigo?", "What | (to) you | I-bring?", "What can I get you?",
        { spain: t("¿Qué | os | traigo?", "What | (to) you (all) | I-bring?", "What can I get you?") }),
      t("Entonces, | ¿qué | van | a | pedir?", "So, | what | are you going | to | order?", "So, what will you have tonight?",
        { spain: t("Entonces, | ¿qué | vais | a | pedir?", "So, | what | are you (all) going | to | order?", "So, what will you have tonight?") }),
    ],
    ready_ok: [t("¡Perfecto! | ¿Qué | le | traigo?", "Perfect! | What | (to) you | I-bring?", "Great! What can I get you?",
        { spain: t("¡Perfecto! | ¿Qué | te | traigo?", "Perfect! | What | (to) you | I-bring?", "Great! What can I get you?") })],
    ready_ok_pl: [t("¡Perfecto! | ¿Qué | les | traigo?", "Perfect! | What | (to) you | I-bring?", "Great! What can I get you?",
        { spain: t("¡Perfecto! | ¿Qué | os | traigo?", "Perfect! | What | (to) you (all) | I-bring?", "Great! What can I get you?") })],
    take_time: [
      t("Claro, | tómese su tiempo. | Cuando | esté | {m:listo|f:lista}, | me | avisa.", "Sure, | take your time. | When | you're | ready, | (to) me | you-let-know.",
        "Of course, take your time. Just let me know when you're ready.",
        { spain: t("Claro, | tómate tu tiempo. | Cuando | estés | {m:listo|f:lista}, | me | avisas.", "Sure, | take your time. | When | you're | ready, | (to) me | you-let-know.", "Of course, take your time. Just let me know when you're ready.") }),
      t("¡Sin prisa!", "No rush!", "No rush!"),
    ],
    take_time_pl: [
      t("Claro, | tómense | su | tiempo. | Cuando | estén | listos, | me | avisan.", "Sure, | take | your | time. | When | you're | ready, | (to) me | you-let-know.",
        "Of course, take your time. Just let me know when you're ready.",
        { spain: t("Claro, | tomaos | vuestro | tiempo. | Cuando | estéis | listos, | me | avisáis.", "Sure, | take (all) | your | time. | When | you're | ready, | (to) me | you (all) let know.", "Of course, take your time. Just let me know when you're ready.") }),
      t("¡Sin prisa!", "No rush!", "No rush!"),
    ],
    ack_order: [
      t("¡Excelente | elección!", "Excellent | choice!", "Great choice!"),
      t("¡Buena | elección!", "Good | choice!", "Good choice!"),
      t("Muy | bien.", "Very | good.", "Sounds good."),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Entendido.", "Got it.", "Got it."), t("Perfecto.", "Perfect.", "Perfect.")],
    ask_doneness: [
      t("¿En | qué | término | quiere | la | arrachera?", "In | what | doneness | do you want | the | flank steak?", "How would you like your steak cooked?",
        { flags: { 2: "término: how well a steak is cooked." },
        spain: t("¿En | qué | punto | quieres | la | arrachera?", "In | what | doneness | do you want | the | flank steak?", "How would you like your steak cooked?", { flags: { 2: "Spain: el punto = how well a steak is cooked." } }) }),
      t("¿Y | qué | término | le | damos?", "And | what | doneness | (to) it | we-give?", "And how would you like it cooked?",
        { spain: t("¿Y | qué | punto | le | damos?", "And | what | doneness | (to) it | we-give?", "And how would you like it cooked?") }),
    ],
    doneness_options: [
      t("¿Roja, | término medio, | tres cuartos | o | bien cocida?", "Rare, | medium, | medium-well | or | well-done?", "Rare, medium, medium-well or well-done?",
        { spain: t("¿Poco hecha, | al punto | o | muy hecha?", "Rare, | medium | or | well-done?", "Rare, medium or well-done?") }),
    ],
    doneness_list: [
      t("Se la | podemos | hacer | roja, | medio roja, | término medio, | tres cuartos | o | bien cocida.", "For you it | we-can | make | rare, | medium-rare, | medium, | medium-well | or | well-done.",
        "We can do rare, medium-rare, medium, medium-well or well-done.",
        { spain: t("Te la | podemos | hacer | poco hecha, | medio hecha, | al punto, | hecha | o | muy hecha.", "For you it | we-can | make | rare, | medium-rare, | medium, | medium-well | or | well-done.", "We can do rare, medium-rare, medium, medium-well or well-done.") }),
    ],
    doneness_ok: [t("Muy | bien, | {X}.", "Very | good, | {X}.", "Okay, {X}.")],
    for_which: [t("Perdón, | ¿para | cuál?", "Sorry, | for | which one?", "Sorry, for which dish?")],
    ask_side: [
      t("¿Con | qué | {lo@X} | acompaña? | ¿Arroz, | frijoles, | ensalada | o | papas?", "With | what | it | you-accompany? | Rice, | beans, | salad | or | fries?",
        "What would you like with it? Rice, beans, salad or fries?", { flags: { 2: "lo / la: “it”, agreeing with the dish (el poc chuc → lo, la arrachera → la)." },
        spain: t("¿Con | qué | {lo@X} | acompañas? | ¿Arroz, | frijoles, | ensalada | o | patatas?", "With | what | it | you-accompany? | Rice, | beans, | salad | or | fries?", "What would you like with it? Rice, beans, salad or fries?", { flags: { 2: "lo / la: “it”, agreeing with the dish (el poc chuc → lo, la arrachera → la)." } }) }),
      t("¿Y | de | guarnición? | Tenemos | arroz, | frijoles, | ensalada | o | papas.", "And | as | a side? | We have | rice, | beans, | salad | or | fries.", "And for your side? We have rice, beans, salad or fries.",
        { spain: t("¿Y | de | guarnición? | Tenemos | arroz, | frijoles, | ensalada | o | patatas.", "And | as | a side? | We have | rice, | beans, | salad | or | fries.", "And for your side? We have rice, beans, salad or fries.") }),
    ],
    side_list: [t("Tenemos | arroz, | frijoles, | ensalada | y | papas | fritas.", "We have | rice, | beans, | salad | and | potatoes | fried.", "We have rice, beans, salad and fries.",
        { spain: t("Tenemos | arroz, | frijoles, | ensalada | y | patatas | fritas.", "We have | rice, | beans, | salad | and | potatoes | fried.", "We have rice, beans, salad and fries.") })],
    side_changed: [t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem.")],
    ask_main: [
      t("¿Y | de | plato fuerte?", "And | as | main course?", "And for your main course?",
        { spain: t("¿Y | de | segundo?", "And | as | main course?", "And for your main course?", { flags: { 3: "Spain: de primero, de segundo = as a starter, as a main course." } }) }),
      t("¿Y | qué | le | traigo | de | plato fuerte?", "And | what | (to) you | I-bring | as | main course?", "And what would you like for your main course?",
        { spain: t("¿Y | qué | te | traigo | de | segundo?", "And | what | (to) you | I-bring | as | main course?", "And what would you like for your main course?") }),
    ],
    ask_main_pl: [
      t("¿Y | de | plato fuerte?", "And | as | main course?", "And for your main course?",
        { spain: t("¿Y | de | segundo?", "And | as | main course?", "And for your main course?", { flags: { 3: "Spain: de primero, de segundo = as a starter, as a main course." } }) }),
      t("¿Y | qué | les | traigo | de | plato fuerte?", "And | what | (to) you | I-bring | as | main course?", "And what would you like for your main course?",
        { spain: t("¿Y | qué | os | traigo | de | segundo?", "And | what | (to) you (all) | I-bring | as | main course?", "And what would you like for your main course?") }),
    ],
    soup_offer: [
      t("Tenemos | sopa | de | lima | casera, | a | {$price}. | ¿Gusta | una | para | empezar?", "We have | soup | of | lime | homemade, | at | {$price}. | Would you like | one | to | start?",
        "We have homemade sopa de lima for {$price}. Would you like one to start?", { flags: { 7: "Mexican and very polite: “¿Gusta…?” = would you like…?" },
          neutral: t("Tenemos | sopa | de | lima | casera, | a | {$price}. | ¿Quiere | una | para | empezar?", "We have | soup | of | lime | homemade, | at | {$price}. | Do you want | one | to | start?",
            "We have homemade sopa de lima for {$price}. Would you like one to start?"),
        spain: t("Tenemos | sopa | de | lima | casera, | a | {$price}. | ¿Quieres | una | para | empezar?", "We have | soup | of | lime | homemade, | at | {$price}. | Do you want | one | to | start?", "We have homemade sopa de lima for {$price}. Would you like one to start?") }),
    ],
    soup_offer_again: [t("¿Le | traigo | una | sopa | para | empezar?", "(To) you | I-bring | a | soup | to | start?", "Shall I bring you a soup to start?",
        { spain: t("¿Te | traigo | una | sopa | para | empezar?", "(To) you | I-bring | a | soup | to | start?", "Shall I bring you a soup to start?") })],
    placed: [
      t("¡Perfecto! | Ahorita | paso | su | orden | a | la | cocina.", "Perfect! | Right now | I-pass | your | order | to | the | kitchen.", "Perfect! I'll put your order in right away.",
        { flags: { 1: "Mexican: ahorita = right now." },
          neutral: t("¡Perfecto! | Enseguida | paso | su | orden | a | la | cocina.", "Perfect! | Right away | I-pass | your | order | to | the | kitchen.", "Perfect! I'll put your order in right away."),
        spain: t("¡Perfecto! | Enseguida | paso | el | pedido | a | la | cocina.", "Perfect! | Right away | I-pass | the | order | to | the | kitchen.", "Perfect! I'll put your order in right away.") }),
      t("Excelente | elección. | No tarda | mucho.", "Excellent | choice. | It won't take | long.", "Excellent choice. It won't take long."),
    ],
    serve: [
      t("Aquí tiene: | {X.the}. | ¡Buen provecho!", "Here you go: | {X.the}. | Enjoy your meal!", "Here you go: {X.the}. Enjoy!",
        { spain: t("Aquí tienes: | {X.the}. | ¡Que aproveche!", "Here you go: | {X.the}. | Enjoy your meal!", "Here you go: {X.the}. Enjoy!") }),
      t("Y | {X.the}, | ¡provecho!", "And | {X.the}, | enjoy!", "And {X.the}. Enjoy your meal!"),
    ],
    serve_starter: [t("Para | empezar, | {X.the}.", "To | start, | {X.the}.", "Here's {X.the} to start.")],
    wrong_sorry: [
      t("¡Ay, | perdóneme! | Eso | es | de | otra | mesa. | Enseguida | le | traigo | {X.the}.", "Oh, | forgive me! | That | is | for | another | table. | Right away | (to) you | I'll-bring | {X.the}.",
        "Oh, I'm so sorry! That's for another table. I'll bring you {X.the} right away.",
        { spain: t("¡Ay, | perdóname! | Eso | es | de | otra | mesa. | Enseguida | te | traigo | {X.the}.", "Oh, | forgive me! | That | is | for | another | table. | Right away | (to) you | I'll-bring | {X.the}.", "Oh, I'm so sorry! That's for another table. I'll bring you {X.the} right away.") }),
      t("¡Disculpe! | Ahorita | lo | arreglo.", "Sorry! | Right now | it | I'll-fix.", "I'm so sorry about that! Let me fix it right away.",
        { flags: { 1: "Mexican: ahorita = right now." }, neutral: t("¡Disculpe! | Ahora mismo | lo | arreglo.", "Sorry! | Right now | it | I'll-fix.", "I'm so sorry about that! Let me fix it right away."),
        spain: t("¡Perdona! | Ahora mismo | lo | arreglo.", "Sorry! | Right now | it | I'll-fix.", "I'm so sorry about that! Let me fix it right away.") }),
    ],
    wrong_noticed: [
      t("Un | momento... | usted | pidió | {X.the}, | ¿verdad? | ¡Perdón! | Esto | es | de | otra | mesa.", "One | moment... | you | ordered | {X.the}, | right? | Sorry! | This | is | for | another | table.",
        "Wait, you ordered {X.the}, didn't you? I'm so sorry! This is for another table.",
        { spain: t("Un | momento... | tú | has pedido | {X.the}, | ¿verdad? | ¡Perdona! | Esto | es | de | otra | mesa.", "One | moment... | you | ordered | {X.the}, | right? | Sorry! | This | is | for | another | table.", "Wait, you ordered {X.the}, didn't you? I'm so sorry! This is for another table.") }),
    ],
    serve_fixed: [t("Aquí tiene | {X.the}. | ¡Disculpe | la | espera!", "Here's | {X.the}. | Excuse | the | wait!", "Here's {X.the}. Sorry about the wait!",
        { spain: t("Aquí tienes | {X.the}. | ¡Perdona | la | espera!", "Here's | {X.the}. | Excuse | the | wait!", "Here's {X.the}. Sorry about the wait!") })],
    ordered_coming: [t("No se preocupe, | su | orden | ya | viene.", "Don't worry, | your | order | already | is coming.", "Don't worry, your order is on its way!",
        { spain: t("No te preocupes, | tu | pedido | ya | viene.", "Don't worry, | your | order | already | is coming.", "Don't worry, your order is on its way!") })],
    ask_checkback: [
      t("¿Qué tal | todo?", "How's | everything?", "How is everything?"),
      t("¿Todo | bien | por | aquí?", "Everything | fine | around | here?", "Is everything okay here?"),
      t("¿Cómo | está | todo?", "How | is | everything?", "How's everything tonight?"),
    ],
    ask_checkback_soup: [t("¿Qué tal | la | sopa?", "How's | the | soup?", "How's the soup?")],
    all_good_reply: [
      t("¡Qué | bueno! | ¡Provecho!", "How | good! | Enjoy!", "Glad to hear it! Enjoy!",
        { spain: t("¡Cuánto | me alegro! | ¡Que aproveche!", "How much | I'm glad! | Enjoy!", "Glad to hear it! Enjoy!") }),
      t("¡Me | da | gusto! | Cualquier | cosa, | me | dice.", "(To) me | it-gives | pleasure! | Any | thing, | (to) me | you-tell.", "Glad to hear it! If you need anything, just let me know.",
        { spain: t("¡Me | alegro | mucho! | Cualquier | cosa, | me | dices.", "(I) | am glad | a lot! | Any | thing, | (to) me | you-tell.", "Glad to hear it! If you need anything, just let me know.") }),
    ],
    compliments_reply: [t("¡Muchas | gracias! | Se lo | digo | a | la | cocinera.", "Many | thanks! | It to her | I'll-say | to | the | cook.", "Thank you so much! I'll tell the cook.")],
    amb_food: [t("Perdón, | ¿todo | bien, | o | hay | algún | problema | con | la | comida?", "Sorry, | everything | fine, | or | is there | some | problem | with | the | food?", "Sorry, is everything okay, or is there a problem with the food?")],
    amb_again: [t("Perdón, | ¿cuál | de | los | dos?", "Sorry, | which | of | the | two?", "Sorry, which one?")],
    what_wrong: [t("¡Ay, | no! | ¿Qué | pasó?", "Oh, | no! | What | happened?", "Oh no! What's wrong?",
        { spain: t("¡Ay, | no! | ¿Qué | ha pasado?", "Oh, | no! | What | happened?", "Oh no! What's wrong?") })],
    cold_sorry: [
      t("¡Ay, | perdón! | Enseguida | se | {lo@X} | caliento.", "Oh, | sorry! | Right away | for you | it | I'll-warm-up.", "Oh, I'm so sorry! I'll warm it up right away.",
        { flags: { 4: "lo / la: “it”, agreeing with the dish (la sopa → la)." },
        spain: t("¡Ay, | perdona! | Enseguida | te | {lo@X} | caliento.", "Oh, | sorry! | Right away | for you | it | I'll-warm-up.", "Oh, I'm so sorry! I'll warm it up right away.", { flags: { 4: "lo / la: “it”, agreeing with the dish (la sopa → la)." } }) }),
    ],
    cold_fixed: [
      t("Aquí tiene, | bien | {calientito@X}.", "Here you go, | nice and | hot.", "Here you go, nice and hot.", { flags: { 2: "calientito: a diminutive of caliente, warm and friendly." },
        spain: t("Aquí tienes, | bien | {calentito@X}.", "Here you go, | nice and | hot.", "Here you go, nice and hot.", { flags: { 2: "calentito: a diminutive of caliente, warm and friendly." } }) }),
    ],
    other_sorry: [
      t("Lo siento | mucho. | Ahorita | {lo@X} | llevo | a | la | cocina.", "I'm sorry | a lot. | Right now | it | I'll-take | to | the | kitchen.", "I'm so sorry about that. Let me take it back to the kitchen.",
        { flags: { 2: "Mexican: ahorita = right now." },
          neutral: t("Lo siento | mucho. | Ahora mismo | {lo@X} | llevo | a | la | cocina.", "I'm sorry | a lot. | Right now | it | I'll-take | to | the | kitchen.", "I'm so sorry about that. Let me take it back to the kitchen."),
        spain: t("Lo siento | mucho. | Ahora mismo | {lo@X} | llevo | a | la | cocina.", "I'm sorry | a lot. | Right now | it | I'll-take | to | the | kitchen.", "I'm so sorry about that. Let me take it back to the kitchen.") }),
    ],
    other_fixed: [t("Aquí tiene, | recién | {hecho@X}. | ¡Disculpe | otra vez!", "Here you go, | freshly | made. | Sorry | again!", "Here you go, freshly made. Sorry again!",
        { spain: t("Aquí tienes, | recién | {hecho@X}. | ¡Perdona | otra vez!", "Here you go, | freshly | made. | Sorry | again!", "Here you go, freshly made. Sorry again!") })],
    request_ok: [
      t("¡Claro, | enseguida!", "Sure, | right away!", "Sure, coming right up!"),
      t("Por supuesto, | ahorita | se lo | traigo.", "Of course, | right away | it to you | I'll-bring.", "Of course! I'll bring that right over.",
        { flags: { 1: "Mexican: ahorita = right now." }, neutral: t("Por supuesto, | enseguida | se lo | traigo.", "Of course, | right away | it to you | I'll-bring.", "Of course! I'll bring that right over."),
        spain: t("Por supuesto, | enseguida | te lo | traigo.", "Of course, | right away | it to you | I'll-bring.", "Of course! I'll bring that right over.") }),
    ],
    tortillas_ok: [t("¡Claro! | Le | traigo | más | tortillas | calientitas.", "Sure! | (To) you | I'll-bring | more | tortillas | warm.", "Sure! I'll bring you some more warm tortillas.",
        { spain: t("¡Claro! | Te | traigo | más | tortillas | calentitas.", "Sure! | (To) you | I'll-bring | more | tortillas | warm.", "Sure! I'll bring you some more warm tortillas.") })],
    water_ok: [t("¡Claro! | Enseguida | le | sirvo | más | agua.", "Sure! | Right away | (to) you | I-serve | more | water.", "Sure! I'll get you more water right away.",
        { spain: t("¡Claro! | Enseguida | te | sirvo | más | agua.", "Sure! | Right away | (to) you | I-serve | more | water.", "Sure! I'll get you more water right away.") })],
    recommend: [
      t("La | cochinita | pibil | es | la | especialidad | de | la | casa.", "The | pork | pibil | is | the | specialty | of | the | house.", "The cochinita pibil is our house specialty.", { flags: { 2: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves." } }),
      t("El | tikin xic | está | muy | rico | hoy; | el | pescado | es | fresco.", "The | tikin xic | is | very | tasty | today; | the | fish | is | fresh.", "The tikin xic is really good today; the fish is fresh.", { flags: { 1: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán)." } }),
      t("A | todos | les encanta | nuestro | poc chuc.", "To | everyone | they love | our | poc chuc.", "Everyone loves our poc chuc.", { flags: { 4: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic." } }),
    ],
    rec_cochinita: [t("La | cochinita, | sin | duda. | Es | la | especialidad | de | la | casa.", "The | cochinita, | without | doubt. | It's | the | specialty | of | the | house.", "The cochinita, no question. It's our house specialty.", { flags: { 1: "cochinita pibil: Yucatán's slow-roasted pork in achiote." } })],
    rec_tikin: [t("Hoy, | el | tikin xic: | el | pescado | está | muy | fresco.", "Today, | the | tikin xic: | the | fish | is | very | fresh.", "Today, the tikin xic: the fish is really fresh.", { flags: { 2: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán)." } })],
    rec_poc: [t("El | poc chuc | está | muy | rico; | a | todos | les encanta.", "The | poc chuc | is | very | tasty; | — | everyone | they love (it).", "The poc chuc is really good; everybody loves it.",
      { flags: { 1: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic.", 5: "a todos les encanta: “everyone loves it”; a marks who is pleased, with no word of its own here." } })],
    rec_any: [t("Los | dos | están | muy | ricos. | Pida | el | que | se le antoje.", "The | two | are | very | tasty. | Order | the one | that | you feel like.", "They're both really good. Order whichever you're in the mood for.",
        { spain: t("Los | dos | están | muy | ricos. | Pide | el | que | te apetezca.", "The | two | are | very | tasty. | Order | the one | that | you feel like.", "They're both really good. Order whichever you're in the mood for.") })],
    recommend_dessert: [
      t("Los | caballeros pobres | son | muy | yucatecos. | ¡Pruébelos!", "The | caballeros pobres | are | very | Yucatecan. | Try them!", "The caballeros pobres are a real Yucatán classic. Try them!",
        { flags: { 1: "caballeros pobres: literally “poor gentlemen”: bread fried in egg and soaked in cinnamon syrup, a Yucatán dessert." }, spain: t("Los | caballeros pobres | son | muy | yucatecos. | ¡Pruébalos!", "The | caballeros pobres | are | very | Yucatecan. | Try them!", "The caballeros pobres are a real Yucatán classic. Try them!", { flags: { 1: "caballeros pobres: literally “poor gentlemen”: bread fried in egg and soaked in cinnamon syrup, a Yucatán dessert." } }) }),
    ],
    menu_line: [
      t("Tenemos | comida | yucateca: | cochinita, | poc chuc, | pescado | y | arrachera.", "We have | food | Yucatecan: | cochinita, | poc chuc, | fish | and | flank steak.",
        "We have Yucatecan food: cochinita, poc chuc, fish and steak.", { flags: { 4: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic.", 3: "cochinita pibil: Yucatán's slow-roasted pork in achiote." } }),
    ],
    drinks_list: [
      t("Tenemos | aguas | frescas, | limonada, | refrescos, | cerveza, | vino | y | café.", "We have | waters | fresh, | lemonade, | sodas, | beer, | wine | and | coffee.",
        "We have aguas frescas, lemonade, sodas, beer, wine and coffee.", { flags: { 1: "Aguas frescas: cold drinks made with fruit, flowers or rice (horchata)." } }),
    ],
    starters_list: [
      t("De | entrada | tenemos | sopa | de | lima, | panuchos, | salbutes | y | guacamole.", "As | appetizer | we have | soup | of | lime, | panuchos, | salbutes | and | guacamole.",
        "For appetizers, we have sopa de lima, panuchos, salbutes and guacamole.", { flags: { 7: "salbutes: puffy fried tortillas topped with shredded turkey or chicken, lettuce and pickled onion (Yucatán).", 6: "panuchos: small fried tortillas stuffed with black beans, topped with shredded turkey or chicken (Yucatán)." } }),
    ],
    mains_list: [
      t("De | plato fuerte | hay | cochinita | pibil, | pollo | pibil, | poc chuc, | tikin xic, | arrachera | y | papadzules.",
        "As | main course | there's | pork | pibil, | chicken | pibil, | poc chuc, | tikin xic, | flank steak | and | papadzules.",
        "For the main course there's cochinita pibil, chicken pibil, poc chuc, tikin xic, steak and papadzules.",
        { flags: { 11: "papadzules: corn tortillas rolled around chopped hard-boiled egg, in a pumpkin-seed sauce (Yucatán).", 8: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán).", 7: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic.", 6: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves.", 4: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves." }, spain: t("De | segundo | hay | cochinita | pibil, | pollo | pibil, | poc chuc, | tikin xic, | arrachera | y | papadzules.", "As | main course | there's | pork | pibil, | chicken | pibil, | poc chuc, | tikin xic, | flank steak | and | papadzules.", "For the main course there's cochinita pibil, chicken pibil, poc chuc, tikin xic, steak and papadzules.", { flags: { 11: "papadzules: corn tortillas rolled around chopped hard-boiled egg, in a pumpkin-seed sauce (Yucatán).", 8: "tikin xic: fish rubbed with achiote and sour orange, grilled in a banana leaf (Yucatán).", 7: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic.", 6: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves.", 4: "pibil: Mayan for “cooked underground”: marinated in achiote and slow-roasted in banana leaves." } }) }),
    ],
    dessert_list: [
      t("De | postre | hay | flan, | caballeros pobres, | dulce | de | papaya | y | helado | de | coco.", "For | dessert | there's | flan, | caballeros pobres, | candy | of | papaya | and | ice cream | of | coconut.",
        "For dessert there's flan, caballeros pobres, candied papaya and coconut ice cream.", { flags: { 4: "caballeros pobres: literally “poor gentlemen”: bread fried in egg and soaked in cinnamon syrup, a Yucatán dessert." } }),
    ],
    desc_sopa: [
      t("Es | un | caldo | de | pollo | con | lima | y | tiras | de | tortilla | frita.", "It's | a | broth | of | chicken | with | lime | and | strips | of | tortilla | fried.",
        "It's a chicken broth with lime and strips of fried tortilla.", { flags: { 6: "Lima: a fragrant Yucatán citrus (lima agria), not the green limón." } }),
    ],
    desc_panuchos: [
      t("Son | tortillas | rellenas | de | frijol, | fritas, | con | cochinita | o | pollo | encima.", "They're | tortillas | stuffed | with | beans, | fried, | with | cochinita | or | chicken | on top.",
        "They're fried tortillas stuffed with beans, topped with cochinita or chicken.", { flags: { 7: "cochinita pibil: Yucatán's slow-roasted pork in achiote." } }),
    ],
    desc_salbutes: [
      t("Son | tortillas | infladas | y | fritas, | con | pollo, | lechuga, | tomate | y | cebolla | morada.", "They're | tortillas | puffed | and | fried, | with | chicken, | lettuce, | tomato | and | onion | red.",
        "They're puffed-up fried tortillas with chicken, lettuce, tomato and red onion."),
    ],
    desc_guacamole: [
      t("Es | aguacate | machacado | con | cebolla, | cilantro | y | limón, | con | totopos.", "It's | avocado | mashed | with | onion, | cilantro | and | lime, | with | tortilla chips.",
        "It's mashed avocado with onion, cilantro and lime, with tortilla chips."),
    ],
    desc_cochinita: [
      t("Es | cerdo | marinado | en | achiote | y | naranja agria, | cocido | en | hoja | de | plátano.", "It's | pork | marinated | in | achiote | and | sour orange, | cooked | in | leaf | of | banana.",
        "It's pork marinated in achiote and sour orange, slow-cooked in banana leaves.", { flags: { 4: "Achiote: a red seed paste, the taste of Yucatán." } }),
    ],
    desc_pollo: [
      t("Es | pollo | marinado | en | achiote, | cocido | en | hoja | de | plátano.", "It's | chicken | marinated | in | achiote, | cooked | in | leaf | of | banana.",
        "It's chicken marinated in achiote, cooked in banana leaves.", { flags: { 4: "achiote: a red paste of annatto seeds, the base of Yucatecan cooking." } }),
    ],
    desc_poc_chuc: [
      t("Es | cerdo | asado | a | la | parrilla, | marinado | en | naranja agria.", "It's | pork | grilled | on | the | grill, | marinated | in | sour orange.",
        "It's grilled pork marinated in sour orange."),
    ],
    desc_tikin: [
      t("Es | pescado | con | achiote, | asado | en | hoja | de | plátano.", "It's | fish | with | achiote, | grilled | in | leaf | of | banana.", "It's fish with achiote, grilled in a banana leaf.", { flags: { 3: "achiote: a red paste of annatto seeds, the base of Yucatecan cooking." } }),
    ],
    desc_arrachera: [
      t("Es | carne | de | res | asada, | muy | suave.", "It's | meat | of | beef | grilled, | very | tender.", "It's grilled flank steak, very tender."),
    ],
    desc_papadzules: [
      t("Son | tacos | de | huevo | duro | con | salsa | de | pepita | de | calabaza.", "They're | tacos | of | egg | hard-boiled | with | sauce | of | seed | of | pumpkin.",
        "They're hard-boiled egg tacos in a pumpkin-seed sauce."),
    ],
    desc_flan: [t("Es | un | flan | de | vainilla, | hecho | en | casa.", "It's | a | flan | of | vanilla, | made | at | home.", "It's a homemade vanilla flan.")],
    desc_caballeros: [
      t("Es | pan | bañado | en | almíbar | con | canela, | pasas | y | almendras.", "It's | bread | soaked | in | syrup | with | cinnamon, | raisins | and | almonds.",
        "It's bread soaked in syrup with cinnamon, raisins and almonds."),
    ],
    desc_papaya: [
      t("Es | papaya | cocida | en | almíbar, | con | queso | de | bola.", "It's | papaya | cooked | in | syrup, | with | cheese | of | ball.", "It's papaya cooked in syrup, served with Edam cheese.",
        { flags: { 6: "Queso de bola: Edam cheese, much loved in Yucatán." } }),
    ],
    desc_helado: [t("Es | helado | de | coco, | hecho | aquí.", "It's | ice cream | of | coconut, | made | here.", "It's coconut ice cream, made here.")],
    desc_pibil: [
      t("Es | carne | con | achiote, | cocida | en | hoja | de | plátano. | Hay | de | cerdo | y | de | pollo.",
        "It's | meat | with | achiote, | cooked | in | leaf | of | banana. | There's | of | pork | and | of | chicken.",
        "It's meat with achiote, cooked in banana leaves. We have it with pork or chicken.", { flags: { 3: "Achiote: a red seed paste, the taste of Yucatán." } }),
    ],
    desc_horchata: [t("Es | agua | de | arroz | con | canela, | bien | fría.", "It's | water | of | rice | with | cinnamon, | nice and | cold.", "It's a cold rice drink with cinnamon.")],
    desc_jamaica: [
      t("Es | agua | de | flor | de | jamaica: | fresca | y | un | poco | ácida.", "It's | water | of | flower | of | hibiscus: | refreshing | and | a | little | tart.",
        "It's made from hibiscus flowers: refreshing and a little tart."),
    ],
    desc_chaya: [
      t("Es | chaya, | una | hoja | verde | de | aquí, | licuada | con | piña.", "It's | chaya, | a | leaf | green | from | here, | blended | with | pineapple.",
        "It's chaya, a local leafy green, blended with pineapple.", { flags: { 1: "chaya: a leafy green from Yucatán, blended with pineapple into a cool drink." } }),
    ],
    desc_fresca: [
      t("Es | agua | con | fruta, | flores | o | arroz, | bien | fría.", "It's | water | with | fruit, | flowers | or | rice, | nice and | cold.",
        "It's water blended with fruit, flowers or rice, served cold."),
    ],
    desc_olla: [t("Es | café | hecho | en | olla | de | barro, | con | canela.", "It's | coffee | made | in | pot | of | clay, | with | cinnamon.", "It's coffee brewed in a clay pot, with cinnamon.")],
    desc_mineral: [
      t("La | natural | es | sin | gas, | y | la | mineral | es | con | gas.", "The | natural (one) | is | without | gas, | and | the | mineral (one) | is | with | gas.",
        "Natural is still, and mineral is sparkling.", { flags: { 1: "In Mexico agua natural is still water and agua mineral is sparkling." },
        spain: t("La | natural | es | sin | gas, | y | la | mineral | es | con | gas.", "The | natural (one) | is | without | gas, | and | the | mineral (one) | is | with | gas.", "Natural is still, and mineral is sparkling.", { flags: { 1: "In Mexico agua natural is still water and agua mineral is sparkling (in Spain, agua natural is water that isn't chilled)." } }) }),
    ],
    desc_generic: [t("Es | de | lo | más | pedido | aquí.", "It's | among | the | most | ordered | here.", "People order it a lot here.")],
    comes_side: [t("Viene | con | guarnición: | arroz, | frijoles, | ensalada | o | papas.", "It comes | with | a side: | rice, | beans, | salad | or | fries.", "It comes with a side: rice, beans, salad or fries.",
        { spain: t("Viene | con | guarnición: | arroz, | frijoles, | ensalada | o | patatas.", "It comes | with | a side: | rice, | beans, | salad | or | fries.", "It comes with a side: rice, beans, salad or fries.") })],
    comes_tortillas: [
      t("Viene | con | tortillas | hechas | a | mano | y | cebolla | morada.", "It comes | with | tortillas | made | by | hand | and | onion | red.", "It comes with handmade tortillas and pickled red onion."),
    ],
    comes_alone: [t("Así | se sirve, | sin | guarnición.", "Like that | it's served, | without | a side.", "That one comes on its own, without a side.")],
    spicy_yes: [t("¡Sí, | esa | sí | pica | mucho! | Es | de | habanero.", "Yes, | that one | really | is spicy | a lot! | It's | of | habanero.", "Yes, that one's really hot! It's made with habanero.", { flags: { 7: "habanero: the very hot chili of the Yucatán peninsula." } })],
    spicy_no: [t("No, | no pica. | La | salsa | de | habanero | viene | aparte.", "No, | it's not spicy. | The | sauce | of | habanero | comes | separately.", "No, it isn't spicy. The habanero salsa comes on the side.", { flags: { 5: "habanero: the very hot chili of the Yucatán peninsula." } })],
    spicy_which: [
      t("Casi | nada | pica. | Lo | picante | es | la | salsa | de | habanero, | y | viene | aparte.", "Almost | nothing | is spicy. | The | spicy (part) | is | the | sauce | of | habanero, | and | it comes | separately.",
        "Almost nothing is spicy. The hot part is the habanero salsa, and it comes on the side.", { flags: { 9: "habanero: the very hot chili of the Yucatán peninsula." } }),
    ],
    veg_list: [t("¡Sí! | Los | papadzules | y | el | guacamole | son | vegetarianos.", "Yes! | The | papadzules | and | the | guacamole | are | vegetarian.", "Yes! The papadzules and the guacamole are vegetarian.", { flags: { 2: "papadzules: corn tortillas rolled around chopped hard-boiled egg, in a pumpkin-seed sauce (Yucatán)." } })],
    veg_yes: [t("Sí, | no lleva | carne.", "Yes, | it doesn't have | meat.", "Yes, there's no meat in it.")],
    veg_no: [t("No, | no es | {vegetariano@X}.", "No, | it's not | vegetarian.", "No, it isn't vegetarian.")],
    veg_no_pl: [t("No, | no son | vegetarianos.", "No, | they're not | vegetarian.", "No, they aren't vegetarian.")],
    allergy_check: [t("Déjeme | preguntar | en | la | cocina.", "Let me | ask | in | the | kitchen.", "Let me check with the kitchen.",
        { spain: t("Déjame | preguntar | en | la | cocina.", "Let me | ask | in | the | kitchen.", "Let me check with the kitchen.") })],
    nuts_ok: [t("No se preocupe, | no lleva | nueces.", "Don't worry, | it doesn't have | nuts.", "Good news: there are no nuts in it.",
        { spain: t("No te preocupes, | no lleva | nueces.", "Don't worry, | it doesn't have | nuts.", "Good news: there are no nuts in it.") })],
    nuts_bad: [t("Perdón, | los | caballeros pobres | llevan | almendras.", "Sorry, | the | caballeros pobres | have | almonds.", "Sorry, the caballeros pobres have almonds.", { flags: { 2: "caballeros pobres: literally “poor gentlemen”: bread fried in egg and soaked in cinnamon syrup, a Yucatán dessert." } })],
    nuts_general: [
      t("Casi | nada | lleva | nueces. | Solo | los | caballeros pobres | llevan | almendras.", "Almost | nothing | has | nuts. | Only | the | caballeros pobres | have | almonds.",
        "Almost nothing has nuts. Only the caballeros pobres have almonds.", { flags: { 6: "caballeros pobres: literally “poor gentlemen”: bread fried in egg and soaked in cinnamon syrup, a Yucatán dessert." } }),
    ],
    gluten_info: [
      t("Las | tortillas | son | de | maíz, | y | casi | todo | es | sin | gluten.", "The | tortillas | are | of | corn, | and | almost | everything | is | without | gluten.",
        "Our tortillas are corn, and almost everything is gluten-free."),
    ],
    allergy_noted: [t("Gracias | por | avisarme. | Lo | anoto | para | la | cocina.", "Thanks | for | telling me. | It | I'll-note | for | the | kitchen.", "Thanks for telling me. I'll let the kitchen know.")],
    its_yours: [t("Sí, | es | {X.the}. | ¡Provecho!", "Yes, | it's | {X.the}. | Enjoy!", "Yes, that's {X.the}. Enjoy!")],
    its_yours_pl: [t("¡Sí, | esos | son! | ¡Provecho!", "Yes, | those | they-are! | Enjoy!", "Yes, that's them! Enjoy!")],
    price_is: [t("Son | {$price}.", "It's | {$price}.", "It's {$price}.")],
    not_long: [t("No tarda | mucho.", "It won't take | long.", "It won't take long.")],
    which_item: [t("¿Cuál?", "Which one?", "Which one?")],
    have_yes: [t("¡Sí, | claro!", "Yes, | sure!", "Yes, we do!")],
    have_no: [t("Perdón, | eso | no lo tenemos.", "Sorry, | that | we don't have it.", "Sorry, we don't have that.")],
    unknown_order: [t("Mmm, | perdón, | eso | no lo tenemos | aquí.", "Hmm, | sorry, | that | we don't have it | here.", "Hmm, sorry, we don't have that here.")],
    restroom: [t("Está | al fondo, | a la derecha.", "It's | at the back, | on the right.", "It's at the back, on the right.")],
    reject_ok: [t("¡No hay problema! | ¿Qué | le | traigo | entonces?", "No problem! | What | (to) you | I-bring | then?", "No problem! What would you like instead?",
        { spain: t("¡No hay problema! | ¿Qué | te | traigo | entonces?", "No problem! | What | (to) you | I-bring | then?", "No problem! What would you like instead?") })],
    reject_ok_pl: [t("¡No hay problema! | ¿Qué | les | traigo | entonces?", "No problem! | What | (to) you | I-bring | then?", "No problem! What would you like instead?",
        { spain: t("¡No hay problema! | ¿Qué | os | traigo | entonces?", "No problem! | What | (to) you (all) | I-bring | then?", "No problem! What would you like instead?") })],
    removed: [t("Muy | bien, | sin | {X}.", "Very | good, | without | {X}.", "Okay, no {X}.")],
    changed: [t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem."), t("Listo, | ya | lo | cambié.", "Done, | already | it | I-changed.", "Okay, I changed it.",
        { spain: t("Hecho, | ya | lo | he cambiado.", "Done, | already | it | I've-changed.", "Okay, I changed it.") })],
    no_problem: [t("No hay problema.", "No problem.", "No problem."), t("Sin problema.", "No problem.", "No problem.")],
    ask_box: [
      t("¿Se lo | pongo | para llevar?", "For you it | I-put | to go?", "Would you like me to box that up?",
        { spain: t("¿Te lo | pongo | para llevar?", "For you it | I-put | to go?", "Would you like me to box that up?") }),
      t("¿Le | pongo | lo que | sobró | para llevar?", "(For) you | I-put | what | was left | to go?", "Can I pack up the rest for you?",
        { spain: t("¿Te | pongo | lo que | ha sobrado | para llevar?", "(For) you | I-put | what | was left | to go?", "Can I pack up the rest for you?") }),
    ],
    box_free: [t("No cuesta | nada.", "It doesn't cost | anything.", "There's no charge for that.")],
    box_ok: [t("Claro, | enseguida | se lo | pongo | para llevar.", "Sure, | right away | it for you | I-put | to go.", "Sure, I'll box it up for you.",
        { spain: t("Claro, | enseguida | te lo | pongo | para llevar.", "Sure, | right away | it for you | I-put | to go.", "Sure, I'll box it up for you.") })],
    ask_dessert: [
      t("¿Gusta | algo | de | postre?", "Would you like | something | for | dessert?", "Would you like some dessert?", { flags: { 0: "Mexican and very polite: “¿Gusta…?” = would you like…?" },
        neutral: t("¿Quiere | algo | de | postre?", "Do you want | something | for | dessert?", "Would you like some dessert?"),
        spain: t("¿Quieres | algo | de | postre?", "Do you want | something | for | dessert?", "Would you like some dessert?") }),
      t("¿Le | traigo | la | carta | de | postres?", "(To) you | I-bring | the | menu | of | desserts?", "Would you like to see the dessert menu?",
        { spain: t("¿Te | traigo | la | carta | de | postres?", "(To) you | I-bring | the | menu | of | desserts?", "Would you like to see the dessert menu?") }),
      t("¿Le | traigo | un | postre | o | un | cafecito?", "(To) you | I-bring | a | dessert | or | a | little coffee?", "Can I get you some dessert or coffee?", { flags: { 6: "cafecito: “a little coffee”, a friendly diminutive." },
        spain: t("¿Te | traigo | un | postre | o | un | cafecito?", "(To) you | I-bring | a | dessert | or | a | little coffee?", "Can I get you some dessert or coffee?", { flags: { 6: "cafecito: “a little coffee”, a friendly diminutive." } }) }),
    ],
    ask_dessert_pl: [
      t("¿Gustan | algo | de | postre?", "Would you like | something | for | dessert?", "Would you like some dessert?", { flags: { 0: "Mexican and very polite: “¿Gustan…?” = would you (all) like…?" },
        neutral: t("¿Quieren | algo | de | postre?", "Do you want | something | for | dessert?", "Would you like some dessert?", { flags: { 0: "quieren: the ustedes form, for a group." } }),
        spain: t("¿Queréis | algo | de | postre?", "Do you (all) want | something | for | dessert?", "Would you like some dessert?", { flags: { 0: "queréis: the vosotros form, for a group." } }) }),
      t("¿Les | traigo | la | carta | de | postres?", "(To) you | I-bring | the | menu | of | desserts?", "Would you like to see the dessert menu?",
        { spain: t("¿Os | traigo | la | carta | de | postres?", "(To) you (all) | I-bring | the | menu | of | desserts?", "Would you like to see the dessert menu?") }),
      t("¿Les | traigo | un | postre | o | un | cafecito?", "(To) you | I-bring | a | dessert | or | a | little coffee?", "Can I get you some dessert or coffee?",
        { spain: t("¿Os | traigo | un | postre | o | un | cafecito?", "(To) you (all) | I-bring | a | dessert | or | a | little coffee?", "Can I get you some dessert or coffee?") }),
    ],
    dessert_ack: [
      t("¡Enseguida!", "Right away!", "Coming right up!"),
      t("¡Buena | elección! | Ahorita | se | {lo@X} | traigo.", "Good | choice! | Right away | to you | it | I'll-bring.", "Great choice! I'll bring it right out.",
        { flags: { 2: "Mexican: ahorita = right now." }, neutral: t("¡Buena | elección! | Enseguida | se | {lo@X} | traigo.", "Good | choice! | Right away | to you | it | I'll-bring.", "Great choice! I'll bring it right out."),
        spain: t("¡Buena | elección! | Enseguida | te | {lo@X} | traigo.", "Good | choice! | Right away | to you | it | I'll-bring.", "Great choice! I'll bring it right out.") }),
    ],
    serve_dessert: [t("Aquí tiene | {X.the}. | ¡Que | {lo@X} | disfrute!", "Here's | {X.the}. | (I hope) | it | you-enjoy!", "Here's {X.the}. Enjoy!",
        { spain: t("Aquí tienes | {X.the}. | ¡Que | {lo@X} | disfrutes!", "Here's | {X.the}. | (I hope) | it | you-enjoy!", "Here's {X.the}. Enjoy!") })],
    ask_check_else: [
      t("¿Se le ofrece | algo | más?", "Can I get you | something | more?", "Can I get you anything else?", { flags: { 0: "Very Mexican service phrase: “is anything offered to you?”" },
        spain: t("¿Te | traigo | algo | más?", "(To) you | I-bring | something | more?", "Can I get you anything else?") }),
      t("¿Algo | más | que | le | traiga?", "Something | more | that | (to) you | I-bring?", "Anything else I can get for you tonight?",
        { spain: t("¿Algo | más | que | te | traiga?", "Something | more | that | (to) you | I-bring?", "Anything else I can get for you tonight?") }),
    ],
    ask_check_else_pl: [
      t("¿Se les ofrece | algo | más?", "Can I get you | something | more?", "Can I get you anything else?", { flags: { 0: "Very Mexican service phrase: “is anything offered to you (all)?”" },
        spain: t("¿Os | traigo | algo | más?", "(To) you (all) | I-bring | something | more?", "Can I get you anything else?") }),
      t("¿Algo | más | que | les | traiga?", "Something | more | that | (to) you | I-bring?", "Anything else I can get for you tonight?",
        { spain: t("¿Algo | más | que | os | traiga?", "Something | more | that | (to) you (all) | I-bring?", "Anything else I can get for you tonight?") }),
    ],
    which_dessert: [t("¿Cuál | le | traigo?", "Which one | (to) you | I-bring?", "Which one can I get you?",
        { spain: t("¿Cuál | te | traigo?", "Which one | (to) you | I-bring?", "Which one can I get you?") })],
    which_dessert_pl: [t("¿Cuál | les | traigo?", "Which one | (to) you | I-bring?", "Which one can I get you?",
        { spain: t("¿Cuál | os | traigo?", "Which one | (to) you (all) | I-bring?", "Which one can I get you?") })],
    what_else: [t("¡Claro! | ¿Qué | más | le | traigo?", "Sure! | What | else | (to) you | I-bring?", "Sure! What else can I get you?",
        { spain: t("¡Claro! | ¿Qué | más | te | traigo?", "Sure! | What | else | (to) you | I-bring?", "Sure! What else can I get you?") })],
    what_else_pl: [t("¡Claro! | ¿Qué | más | les | traigo?", "Sure! | What | else | (to) you | I-bring?", "Sure! What else can I get you?",
        { spain: t("¡Claro! | ¿Qué | más | os | traigo?", "Sure! | What | else | (to) you (all) | I-bring?", "Sure! What else can I get you?") })],
    check_coming: [
      t("¡Claro! | Ahorita | se la | traigo.", "Sure! | Right away | it to you | I'll-bring.", "Sure! I'll bring the check right over.",
        { flags: { 1: "Mexican: ahorita = right now. La is the check (la cuenta)." },
          neutral: t("¡Claro! | Enseguida | se la | traigo.", "Sure! | Right away | it to you | I'll-bring.", "Sure! I'll bring the check right over."),
        spain: t("¡Claro! | Enseguida | te la | traigo.", "Sure! | Right away | it to you | I'll-bring.", "Sure! I'll bring the check right over.", { flags: { 2: "la: the check (la cuenta)." } }) }),
      t("Con gusto, | enseguida | le | traigo | la | cuenta.", "My pleasure, | right away | (to) you | I-bring | the | check.", "Of course. I'll get your check.",
        { spain: t("Claro, | enseguida | te | traigo | la | cuenta.", "Sure, | right away | (to) you | I-bring | the | check.", "Of course. I'll get your check.") }),
    ],
    check_coming_pl: [
      t("¡Claro! | Ahorita | se la | traigo.", "Sure! | Right away | it to you | I'll-bring.", "Sure! I'll bring the check right over.",
        { flags: { 1: "Mexican: ahorita = right now. La is the check (la cuenta)." },
          neutral: t("¡Claro! | Enseguida | se la | traigo.", "Sure! | Right away | it to you | I'll-bring.", "Sure! I'll bring the check right over."),
        spain: t("¡Claro! | Enseguida | os la | traigo.", "Sure! | Right away | it to you (all) | I'll-bring.", "Sure! I'll bring the check right over.", { flags: { 2: "la: the check (la cuenta)." } }) }),
      t("Con gusto, | enseguida | les | traigo | la | cuenta.", "My pleasure, | right away | (to) you | I-bring | the | check.", "Of course. I'll get your check.",
        { spain: t("Claro, | enseguida | os | traigo | la | cuenta.", "Sure, | right away | (to) you (all) | I-bring | the | check.", "Of course. I'll get your check.") }),
    ],
    check_later: [t("¡Claro! | Se la | traigo | después | de | la | cena.", "Sure! | It to you | I'll-bring | after | — | the | dinner.", "Of course! I'll bring it after your meal.",
      { flags: { 4: "después de = after; de has no word of its own here." },
        spain: t("¡Claro! | Te la | traigo | después | de | la | cena.", "Sure! | It to you | I'll-bring | after | — | the | dinner.", "Of course! I'll bring it after your meal.", { flags: { 4: "después de = after; de has no word of its own here." } }) })],
    check_whenever: [
      t("Muy | bien. | Cuando | quiera | la | cuenta, | nada más | me | dice.", "Very | good. | When | you want | the | check, | just | (to) me | you-tell.", "Alright. Just let me know when you want the check.",
        { spain: t("Muy | bien. | Cuando | quieras | la | cuenta, | solo | me | lo dices.", "Very | good. | When | you want | the | check, | just | (to) me | you-tell (it).", "Alright. Just let me know when you want the check.") }),
    ],
    check_whenever_pl: [
      t("Muy | bien. | Cuando | quieran | la | cuenta, | nada más | me | dicen.", "Very | good. | When | you want | the | check, | just | (to) me | you-tell.", "Alright. Just let me know when you want the check.",
        { spain: t("Muy | bien. | Cuando | queráis | la | cuenta, | solo | me | lo decís.", "Very | good. | When | you (all) want | the | check, | just | (to) me | you (all) tell (it).", "Alright. Just let me know when you want the check.") }),
    ],
    ask_split: [
      t("¿Les | cobro | todo | junto | o | por separado?", "(From) you | I-charge | everything | together | or | separately?", "Will this be together or separate?",
        { spain: t("¿Os | cobro | todo | junto | o | por separado?", "(From) you (all) | I-charge | everything | together | or | separately?", "Will this be together or separate?") }),
      t("¿Una | sola | cuenta, | o | cuentas | separadas?", "One | single | check, | or | checks | separate?", "Is this all on one check, or separate?"),
    ],
    split_together_ok: [t("Perfecto, | una | sola | cuenta.", "Perfect, | one | single | check.", "Perfect, one check.")],
    split_sep_ok: [t("Sin problema, | se las | separo.", "No problem, | for you them | I'll-separate.", "No problem, I'll split it for you.", { flags: { 1: "se las: “them for you”, the checks (las cuentas)." },
        spain: t("Sin problema, | os las | separo.", "No problem, | for you them | I'll-separate.", "No problem, I'll split it for you.", { flags: { 1: "os las: “them for you (all)”, the checks (las cuentas)." } }) })],
    bring_check: [
      t("Aquí tiene | su | cuenta.", "Here's | your | check.", "Here's your check.",
        { spain: t("Aquí tienes | la | cuenta.", "Here's | the | check.", "Here's your check.") }),
      t("Aquí | le | dejo | la | cuenta.", "Here | (for) you | I-leave | the | check.", "Here you go, here's your check.",
        { spain: t("Aquí | te | dejo | la | cuenta.", "Here | (for) you | I-leave | the | check.", "Here you go, here's your check.") }),
    ],
    bring_check_pl: [
      t("Aquí tienen | su | cuenta.", "Here's | your | check.", "Here's your check.",
        { spain: t("Aquí tenéis | la | cuenta.", "Here's (for you all) | the | check.", "Here's your check.") }),
      t("Aquí | les | dejo | la | cuenta.", "Here | (for) you | I-leave | the | check.", "Here you go, here's your check.",
        { spain: t("Aquí | os | dejo | la | cuenta.", "Here | (for) you (all) | I-leave | the | check.", "Here you go, here's your check.") }),
    ],
    total_is: [t("Son | {$total} | en | total.", "It's | {$total} | in | total.", "Your total is {$total}."), t("Su | total | es | de | {$total}.", "Your | total | is | of | {$total}.", "Your total comes to {$total}.",
        { spain: t("En total | son | {$total}.", "In total | it's | {$total}.", "Your total comes to {$total}.") })],
    no_rush: [t("Sin prisa.", "No rush.", "No rush."), t("No se preocupe, | sin prisa.", "Don't worry, | no rush.", "Take your time, no rush.",
        { spain: t("No te preocupes, | sin prisa.", "Don't worry, | no rush.", "Take your time, no rush.") })],
    bring_checks: [t("Aquí tienen | sus | cuentas. | Sin prisa.", "Here are | your | checks. | No rush.", "Here are your checks. No rush.",
        { spain: t("Aquí tenéis | vuestras | cuentas. | Sin prisa.", "Here are (for you all) | your | checks. | No rush.", "Here are your checks. No rush.") })],
    ask_pay_method: [
      t("¿Va | a | pagar | con | tarjeta | o | en efectivo?", "Are you going | to | pay | with | card | or | in cash?", "Will you be paying by card or cash?",
        { spain: t("¿Vas | a | pagar | con | tarjeta | o | en efectivo?", "Are you going | to | pay | with | card | or | in cash?", "Will you be paying by card or cash?") }),
      t("¿Tarjeta | o | efectivo?", "Card | or | cash?", "Card or cash?"),
    ],
    ask_pay_method_pl: [
      t("¿Van | a | pagar | con | tarjeta | o | en efectivo?", "Are you going | to | pay | with | card | or | in cash?", "Will you be paying by card or cash?",
        { spain: t("¿Vais | a | pagar | con | tarjeta | o | en efectivo?", "Are you (all) going | to | pay | with | card | or | in cash?", "Will you be paying by card or cash?") }),
      t("¿Tarjeta | o | efectivo?", "Card | or | cash?", "Card or cash?"),
    ],
    pay_options: [t("Como | usted | prefiera: | aceptamos | tarjeta | y | efectivo.", "As | you | prefer: | we accept | card | and | cash.", "Whichever you prefer: we take card and cash.",
        { spain: t("Como | prefieras: | aceptamos | tarjeta | y | efectivo.", "As | you prefer: | we accept | card | and | cash.", "Whichever you prefer: we take card and cash.") })],
    pay_dollars: [t("Solo | aceptamos | pesos, | tarjeta | o | efectivo.", "Only | we accept | pesos, | card | or | cash.", "We only take pesos, by card or in cash.")],
    card_ok: [t("Claro, | le | traigo | la | terminal.", "Sure, | (to) you | I'll-bring | the | card machine.", "Sure, I'll bring the card machine.",
        { spain: t("Claro, | te | traigo | el | datáfono.", "Sure, | (to) you | I'll-bring | the | card machine.", "Sure, I'll bring the card machine.", { flags: { 4: "Spain: el datáfono = the card machine." } }) })],
    card_reader: [
      t("Aquí | está | la | terminal. | ¿Cuánto | le | agrego | de | propina?", "Here | is | the | card machine. | How much | (for) you | I-add | as | tip?",
        "Here's the card machine. How much would you like to add for the tip?",
        { spain: t("Aquí | está | el | datáfono. | ¿Cuánto | te | pongo | de | propina?", "Here | is | the | card machine. | How much | (for) you | I-put | as | tip?", "Here's the card machine. How much would you like to add for the tip?") }),
    ],
    reader_here: [
      t("Le | traje | la | terminal. | ¿Cuánto | le | pongo | de | propina?", "(For) you | I-brought | the | card machine. | How much | (for) you | I-put | as | tip?",
        "I brought the card machine. How much should I put for the tip?",
        { spain: t("Te | he traído | el | datáfono. | ¿Cuánto | te | pongo | de | propina?", "(For) you | I've-brought | the | card machine. | How much | (for) you | I-put | as | tip?", "I brought the card machine. How much should I put for the tip?") }),
    ],
    tip_screen: [
      t("¿Cuánto | le | agrego | de | propina?", "How much | (for) you | I-add | as | tip?", "How much would you like to add for the tip?",
        { spain: t("¿Cuánto | te | pongo | de | propina?", "How much | (for) you | I-put | as | tip?", "How much would you like to add for the tip?") }),
      t("¿Y | de | propina, | cuánto | le | pongo?", "And | as | tip, | how much | (for) you | I-put?", "And how much for the tip?",
        { spain: t("¿Y | de | propina, | cuánto | te | pongo?", "And | as | tip, | how much | (for) you | I-put?", "And how much for the tip?") }),
    ],
    tip_included_no: [
      t("No, | la | propina | no está | incluida. | Normalmente | se deja | entre | diez | y | quince | por ciento.", "No, | the | tip | isn't | included. | Usually | people leave | between | ten | and | fifteen | percent.",
        "No, the tip isn't included. People usually leave between ten and fifteen percent."),
      t("No, | aquí | no se incluye. | Casi | todos | dejan | del | diez | al | quince | por ciento.", "No, | here | it's not included. | Almost | everyone | leaves | from | ten | to | fifteen | percent.",
        "No, it's not included here. Most people leave ten to fifteen percent."),
    ],
    tip_normal_yes: [t("Sí, | es | lo normal. | Casi | todos | dejan | del | diez | al | quince | por ciento.", "Yes, | it's | the normal (thing). | Almost | everyone | leaves | from | ten | to | fifteen | percent.",
      "Yes, that's normal. Most people leave ten to fifteen percent.")],
    tip_fine: [t("No, | está | bien. | Se acostumbra | del | diez | al | quince | por ciento.", "No, | it's | fine. | It's customary | from | ten | to | fifteen | percent.",
      "No, that's fine. People usually leave ten to fifteen percent.")],
    tip_big: [t("¿{$amount} | de | propina? | ¿Está | {m:seguro|f:segura}?", "{$amount} | of | tip? | Are you | sure?", "{$amount} as a tip? Are you sure?",
        { spain: t("¿{$amount} | de | propina? | ¿Estás | {m:seguro|f:segura}?", "{$amount} | of | tip? | Are you | sure?", "{$amount} as a tip? Are you sure?") })],
    tip_again: [t("Ah, | perdón. | ¿Cuánto | le | pongo, | entonces?", "Oh, | sorry. | How much | (for) you | I-put, | then?", "Oh, sorry. How much should I put, then?",
        { spain: t("Ah, | perdona. | ¿Cuánto | te | pongo, | entonces?", "Oh, | sorry. | How much | (for) you | I-put, | then?", "Oh, sorry. How much should I put, then?") })],
    tip_amount: [t("Serían | como | {$amount} | de | propina.", "It'd-be | about | {$amount} | as | tip.", "That'd be about {$amount} for the tip.", { flags: { 1: "como before an amount: “about”." } })],
    tip_normal_range: [t("Se acostumbra | del | diez | al | quince | por ciento.", "It's customary | from | ten | to | fifteen | percent.", "People usually leave ten to fifteen percent.")],
    confirm_keep: [t("¿Entonces | me quedo | con | el | cambio?", "So | I keep | with | the | change?", "So I can keep the change?", { flags: { 1: "me quedo con = I keep (quedarse con)." } })],
    tip_thanks: [
      t("Perfecto, | muchas | gracias.", "Perfect, | many | thanks.", "Perfect, thank you very much."),
      t("¡Muy | amable! | Listo, | ya | quedó.", "Very | kind! | Done, | already | it's-settled.", "That's very kind. You're all set!",
        { spain: t("¡Muy | amable! | Pues | ya | está.", "Very | kind! | Well, | all | done.", "That's very kind. You're all set!") }),
    ],
    tip_none_ok: [t("Ah... | muy | bien. | Listo.", "Oh... | very | well. | Done.", "Oh... okay. You're all set.",
      { spain: t("Ah... | muy | bien. | Pues | ya está.", "Oh... | very | well. | Well, | that's it.", "Oh... okay. You're all set.") })],
    tip_cash_ok: [t("¡Claro! | Entonces | le | cobro | solo | la | cuenta.", "Sure! | Then | (from) you | I-charge | only | the | check.", "Sure! Then I'll just charge the check.",
        { spain: t("¡Claro! | Entonces | te | cobro | solo | la | cuenta.", "Sure! | Then | (from) you | I-charge | only | the | check.", "Sure! Then I'll just charge the check.") })],
    cash_ok: [t("Muy | bien, | enseguida | le | traigo | su | cambio.", "Very | good, | right away | (to) you | I-bring | your | change.", "Great, I'll bring your change right over.",
        { spain: t("Muy | bien, | enseguida | te | traigo | el | cambio.", "Very | good, | right away | (to) you | I-bring | the | change.", "Great, I'll bring your change right over.") })],
    cash_short: [t("Perdón, | son | {$total}.", "Sorry, | it's | {$total}.", "Sorry, it's {$total}.")],
    cash_missing: [t("Faltan | {$price}.", "They're-missing | {$price}.", "You're {$price} short.", { flags: { 0: "faltan: “are missing”, the pesos still to pay." } })],
    cash_still: [t("Todavía | faltan | {$price}.", "Still | they're-missing | {$price}.", "You're still {$price} short.")],
    cash_exact: [t("Gracias, | está | completo.", "Thanks, | it's | complete.", "Thanks, that's exactly right.")],
    change_back: [t("Y | aquí tiene | su | cambio.", "And | here's | your | change.", "And here's your change.",
        { spain: t("Y | aquí tienes | el | cambio.", "And | here's | the | change.", "And here's your change.") }), t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change.",
        { spain: t("Aquí tienes | el | cambio.", "Here's | the | change.", "Here's your change.") })],
    thanks_tip: [t("¡Ay, | muchas | gracias! | Muy | amable.", "Oh, | many | thanks! | Very | kind.", "Oh, thank you! That's very generous.")],
    ask_factura: [
      t("¿Va | a | requerir | factura?", "Are you going | to | need | an invoice?", "Will you need a factura, a tax invoice?",
        { flags: { 3: "factura: the official tax invoice, for people who deduct the cost. Most guests say no." },
        spain: t("¿Vas | a | necesitar | factura?", "Are you going | to | need | an invoice?", "Will you need a factura, a tax invoice?", { flags: { 3: "factura: the official tax invoice, for people who deduct the cost. Most guests say no." } }) }),
      t("¿Necesita | factura?", "Do you need | an invoice?", "Do you need a tax invoice?",
        { spain: t("¿Necesitas | factura?", "Do you need | an invoice?", "Do you need a tax invoice?") }),
    ],
    factura_yes: [
      t("Muy | bien. | En | el | ticket | viene | la | página | para | hacer | su | factura | en | línea.", "Very | good. | On | the | receipt | comes | the | page | to | make | your | invoice | on | line.",
        "Okay. The receipt has the web page where you can make your invoice online.", { flags: { 4: "Mexican: a receipt is a ticket. Elsewhere: recibo." },
          neutral: t("Muy | bien. | En | el | recibo | viene | la | página | para | hacer | su | factura | en | línea.", "Very | good. | On | the | receipt | comes | the | page | to | make | your | invoice | on | line.",
            "Okay. The receipt has the web page where you can make your invoice online."),
        spain: t("Muy | bien. | En | el | ticket | viene | la | página | para | hacer | tu | factura | en | línea.", "Very | good. | On | the | receipt | comes | the | page | to | make | your | invoice | on | line.", "Okay. The receipt has the web page where you can make your invoice online.", { flags: { 4: "Spain and Mexico: a receipt is a ticket." } }) }),
    ],
    factura_no: [t("Perfecto, | sin | factura.", "Perfect, | without | invoice.", "Okay, no invoice.")],
    bye_marco: [
      t("¡Que | tenga | buena | noche!", "(I hope) | you have | good | night!", "Have a great night!",
        { neutral: t("¡Que | tenga | una | buena | noche!", "(I hope) | you have | a | good | night!", "Have a great night!"), spain: t("¡Que | pases | buena | noche!", "(I hope) | you spend | good | night!", "Have a great night!") }),
      t("¡Gracias | por | venir! | ¡Vuelva | pronto!", "Thanks | for | coming! | Come back | soon!", "Thanks for coming! Come back soon!",
        { spain: t("¡Gracias | por | venir! | ¡Vuelve | pronto!", "Thanks | for | coming! | Come back | soon!", "Thanks for coming! Come back soon!") }),
    ],
    bye_marco_pl: [
      t("¡Que | tengan | buena | noche!", "(I hope) | you have | good | night!", "Have a great night!",
        { neutral: t("¡Que | tengan | una | buena | noche!", "(I hope) | you have | a | good | night!", "Have a great night!"), spain: t("¡Que | paséis | buena | noche!", "(I hope) | you (all) spend | good | night!", "Have a great night!") }),
      t("¡Gracias | por | venir! | ¡Vuelvan | pronto!", "Thanks | for | coming! | Come back | soon!", "Thanks for coming! Come back soon!",
        { spain: t("¡Gracias | por | venir! | ¡Volved | pronto!", "Thanks | for | coming! | Come back (all) | soon!", "Thanks for coming! Come back soon!") }),
    ],
    bye_lucia: [
      t("¡Buenas noches! | ¡Gracias | por | su | visita!", "Good night! | Thanks | for | your | visit!", "Good night! Thanks for coming!",
        { spain: t("¡Buenas noches! | ¡Gracias | por | venir!", "Good night! | Thanks | for | coming!", "Good night! Thanks for coming!") }),
      t("¡Que | le | vaya | bien! | Aquí | {m:lo|f:la} | esperamos.", "(I hope) | (for) you | it-goes | well! | Here | you | we-await.", "Have a lovely evening! Come again!",
        { flags: { 5: "lo / la: “you”, lo for a man and la for a woman (usted)." },
        spain: t("¡Que | te | vaya | bien! | Aquí | te | esperamos.", "(I hope) | (for) you | it-goes | well! | Here | you | we-await.", "Have a lovely evening! Come again!", { flags: { 5: "te: “you” (tú)." } }) }),
    ],
    bye_lucia_pl: [
      t("¡Buenas noches! | ¡Gracias | por | su | visita!", "Good night! | Thanks | for | your | visit!", "Good night! Thanks for coming!",
        { spain: t("¡Buenas noches! | ¡Gracias | por | venir!", "Good night! | Thanks | for | coming!", "Good night! Thanks for coming!") }),
      t("¡Que | les | vaya | bien! | Aquí | los | esperamos.", "(I hope) | (for) you | it-goes | well! | Here | you | we-await.", "Have a lovely evening! Come again!", { flags: { 5: "los: “you”, all of you (ustedes); here a pronoun, not an article." },
        spain: t("¡Que | os | vaya | bien! | Aquí | os | esperamos.", "(I hope) | (for) you (all) | it-goes | well! | Here | you (all) | we-await.", "Have a lovely evening! Come again!", { flags: { 5: "os: “you”, all of you (vosotros)." } }) }),
    ],
  },

  // Every price is a multiple of $10 (the menu above), so every bill and every cash sum in bills is too.
  domains: {
    // a dish (or its kind) × 1–4 (price_is, cut by reach-es.ts), the soup's price, and the cash still missing
    // (cash_missing, cash_still): every $10 up to $3,000
    price: () => Array.from({ length: 300 }, (_, i) => (i + 1) * 1000),
    // the bill (total_is, cash_short): every $10 from the cheapest item up to $3,000 (about twelve dishes)
    total: () => Array.from({ length: 300 }, (_, i) => (i + 1) * 1000).filter((p) => p >= MIN_PRICE),
    // a tip: worked out for "¿Cuánto es el diez por ciento?" (tipAmount: whole pesos up to $200, then every $5), or one
    // the learner names that looks too big (tip_big: "¿$1,000 de propina?", any round sum)
    amount: () => {
      const s = new Set<number>();
      for (let c = 100; c <= 20000; c += 100) s.add(c);
      for (let c = 20500; c <= 100000; c += 500) s.add(c);
      for (let c = 110000; c <= 300000; c += 10000) s.add(c);
      return [...s];
    },
  },

  hints: {
    ...Object.fromEntries(Object.entries(KIND_OPTS).map(([g, ids]) => [`drink_kind_${g}`, {
      lt: "Say which one", slot: "drink", examples: ids,
      items: [
        { id: "please_only", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "id_like", s: t("Quisiera | {X.np}, | por favor.", "I'd like | {X.np}, | please.", "I'd like {X.np}, please."), register: "polite" },
      ],
    }])),
    resv: {
      lt: "Say you have a reservation",
      items: [
        { id: "resv_have", s: t("Tengo | una | reservación.", "I have | a | reservation.", "I have a reservation.",
        { spain: t("Tengo | una | reserva.", "I have | a | reservation.", "I have a reservation.") }) },
        { id: "resv_under", s: t("A nombre de | {$surname}.", "Under the name of | {$surname}.", "It's under {$surname}.") },
        { id: "no_resv", s: t("No tenemos | reservación.", "We don't have | a reservation.", "No, we don't have a reservation.",
        { spain: t("No tenemos | reserva.", "We don't have | a reservation.", "No, we don't have a reservation.") }) },
        { id: "resv_booked", s: t("Reservamos | una | mesa | para | las | ocho.", "We booked | a | table | for | — | eight.", "We booked a table for eight o'clock.",
          { flags: { 4: "las: the article Spanish puts before clock times (las ocho = eight o'clock)." } }) },
      ],
    },
    resv_name: {
      lt: "Give the name",
      items: [
        { id: "resv_under", s: t("A nombre de | {$surname}.", "Under the name of | {$surname}.", "It's under {$surname}.") },
        { id: "name_is", s: t("Está | a nombre de | {$surname}.", "It's | under the name of | {$surname}.", "The name is {$surname}.") },
      ],
    },
    party: {
      lt: "Say how many you are",
      items: [
        { id: "party_two", s: t("Somos | dos.", "We are | two.", "There are two of us.") },
        { id: "party_just_me", s: t("Nada más | yo.", "Just | me.", "Just me, thanks.") },
        { id: "table_for", s: t("Una | mesa | para | dos, | por favor.", "A | table | for | two, | please.", "A table for two, please.") },
      ],
    },
    wait: {
      lt: "Wait or not",
      items: [
        { id: "wait_fine", s: t("Está bien.", "That's fine.", "That's fine.") },
        { id: "wait_can", s: t("Sí, | podemos | esperar.", "Yes, | we can | wait.", "Sure, we can wait.") },
        { id: "wait_hurry", s: t("Lo siento, | tenemos | prisa.", "I'm sorry, | we have | hurry.", "Sorry, we're in a hurry.") },
      ],
    },
    seat: {
      lt: "Choose where to sit",
      items: [
        { id: "seat_inside", s: t("Adentro, | por favor.", "Inside, | please.", "Inside, please.",
        { spain: t("Dentro, | por favor.", "Inside, | please.", "Inside, please.") }) },
        { id: "seat_patio_ans", s: t("En | la | terraza, | por favor.", "On | the | terrace, | please.", "On the terrace, please.") },
        { id: "seat_window", s: t("¿Podemos | sentarnos | junto | a | la | ventana?", "Can we | sit down | next | to | the | window?", "Could we sit by the window?") },
      ],
    },
    table: {
      lt: "Ask for a table",
      items: [
        { id: "table_for", s: t("Una | mesa | para | dos, | por favor.", "A | table | for | two, | please.", "A table for two, please.") },
        { id: "table_can", s: t("¿Tiene | una | mesa | para | dos?", "Do you have | a | table | for | two?", "Do you have a table for two?",
        { spain: t("¿Tenéis | una | mesa | para | dos?", "Do you (all) have | a | table | for | two?", "Do you have a table for two?") }) },
        { id: "party_just_me", s: t("Nada más | yo.", "Just | me.", "Just me, thanks.") },
        { id: "q_wait", s: t("¿Cuánto | tiempo | hay que | esperar?", "How much | time | do we have to | wait?", "How long is the wait?") },
        { id: "seat_window", s: t("¿Podemos | sentarnos | junto | a | la | ventana?", "Can we | sit down | next | to | the | window?", "Could we sit by the window?") },
        { id: "seat_patio", s: t("¿Podemos | sentarnos | afuera?", "Can we | sit down | outside?", "Could we sit outside?",
        { spain: t("¿Podemos | sentarnos | fuera?", "Can we | sit down | outside?", "Could we sit outside?") }) },
      ],
    },
    drink: {
      lt: "Order a drink", slot: "drink", examples: ["lemonade", "horchata", "jamaica", "beer"],
      items: [
        { id: "please_only", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
        { id: "ill_have", s: t("Voy | a | querer | {X.np}.", "I'm going | to | want | {X.np}.", "I'll have {X.np}.",
        { spain: t("Voy | a | tomar | {X.np}.", "I'm going | to | have | {X.np}.", "I'll have {X.np}.") }), note: "How Mexicans often order: “Voy a querer…” (I'll have…)." },
        { id: "id_like", s: t("Quisiera | {X.np}, | por favor.", "I'd like | {X.np}, | please.", "I'd like {X.np}, please."), register: "polite" },
        { id: "can_i_get", s: t("¿Me | trae | {X.np}?", "(To) me | you-bring | {X.np}?", "Could you bring me {X.np}?",
        { spain: t("¿Me | traes | {X.np}?", "(To) me | you-bring | {X.np}?", "Could you bring me {X.np}?") }), note: "Very common with waiters: “¿Me trae…?” (will you bring me…?)." },
        { id: "could_i_have", s: t("¿Me | da | {X.np}, | por favor?", "(To) me | you-give | {X.np}, | please?", "Could I have {X.np}, please?",
        { spain: t("¿Me | pones | {X.np}, | por favor?", "(For) me | you-put | {X.np}, | please?", "Could I have {X.np}, please?") }) },
        { id: "glass_wine", s: t("Una | copa | de | {X}, | por favor.", "A | glass | of | {X}, | please.", "A glass of {X}, please."), only: (e) => !!e.attrs?.wine && !e.attrs?.generic },
        { id: "tap_water", s: t("Solo | agua | natural, | por favor.", "Just | water | still, | please.", "Just still water, please.",
          { neutral: t("Solo | agua | sin | gas, | por favor.", "Just | water | without | gas, | please.", "Just still water, please.") }), note: "In Mexico tap water isn't for drinking; agua natural (agua sin gas) is bottled or purified." },
        { id: "drinks_none", s: t("Nada | para | mí, | gracias.", "Nothing | for | me, | thanks.", "Nothing for me, thanks.") },
        { id: "q_drinks", s: t("¿Qué | tienen | de | tomar?", "What | do you have | to | drink?", "What do you have to drink?",
        { spain: t("¿Qué | tenéis | de | beber?", "What | do you (all) have | to | drink?", "What do you have to drink?") }) },
      ],
    },
    starter: {
      lt: "Order an appetizer", slot: "starter", examples: ["sopa_lima", "panuchos", "guacamole"],
      items: [
        { id: "start_with", s: t("De | entrada, | {X.the}.", "As | an appetizer, | {X.the}.", "To start, {X.the}.") },
        { id: "to_share", s: t("¿Nos | trae | {X.the} | para | compartir?", "(To) us | you-bring | {X.the} | to | share?", "Could we get {X.the} to share?",
        { spain: t("¿Nos | traes | {X.the} | para | compartir?", "(To) us | you-bring | {X.the} | to | share?", "Could we get {X.the} to share?") }) },
        { id: "ill_have", s: t("Voy | a | querer | {X.the}.", "I'm going | to | want | {X.the}.", "I'll have {X.the}.",
        { spain: t("Voy | a | tomar | {X.the}.", "I'm going | to | have | {X.the}.", "I'll have {X.the}.") }) },
      ],
    },
    order_food: {
      lt: "Order your dinner", slot: "main", examples: ["cochinita", "poc_chuc", "tikin_xic", "arrachera"],
      items: [
        { id: "ill_have", s: t("Voy | a | querer | {X.the}, | por favor.", "I'm going | to | want | {X.the}, | please.", "I'll have {X.the}, please.",
        { spain: t("Voy | a | tomar | {X.the}, | por favor.", "I'm going | to | have | {X.the}, | please.", "I'll have {X.the}, please.") }) },
        { id: "id_like", s: t("Quisiera | {X.the}.", "I'd like | {X.the}.", "I'd like {X.the}."), register: "polite" },
        { id: "can_i_get", s: t("¿Me | trae | {X.the}?", "(To) me | you-bring | {X.the}?", "Could I get {X.the}?",
        { spain: t("¿Me | traes | {X.the}?", "(To) me | you-bring | {X.the}?", "Could I get {X.the}?") }) },
        { id: "could_i_have", s: t("¿Me | da | {X.the}, | por favor?", "(To) me | you-give | {X.the}, | please?", "Can I have {X.the}, please?",
        { spain: t("¿Me | pones | {X.the}, | por favor?", "(For) me | you-put | {X.the}, | please?", "Can I have {X.the}, please?") }) },
        { id: "for_me", s: t("Para | mí, | {X.the}, | por favor.", "For | me, | {X.the}, | please.", "For me, {X.the}, please."), register: "casual" },
        { id: "think_ill", s: t("Creo | que | voy | a | pedir | {X.the}.", "I think | that | I'm going | to | order | {X.the}.", "I think I'll go with {X.the}.") },
        { id: "same", s: t("Lo | mismo | para | mí.", "The | same | for | me.", "I'll have the same.") },
      ],
    },
    doneness: {
      lt: "Say how you want your steak", slot: "doneness", examples: ["medium", "medium_well", "well_done", "rare"],
      items: [
        { id: "done_short", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "done_please", s: t("La | quiero | {X}.", "It | I-want | {X}.", "I'd like it {X}.", { flags: { 0: "la: “it”, the arrachera (feminine); a pronoun, not an article." } }) },
        { id: "done_can", s: t("¿Me la | puede | hacer | {X}?", "It for me | can you | make | {X}?", "Could you make it {X}?",
        { spain: t("¿Me la | puedes | hacer | {X}?", "It for me | can you | make | {X}?", "Could you make it {X}?") }) },
      ],
    },
    side: {
      lt: "Choose a side", slot: "side", examples: ["rice", "beans", "salad", "fries"],
      items: [
        { id: "side_short", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "side_with", s: t("Con | {X}, | por favor.", "With | {X}, | please.", "With {X}, please.") },
        { id: "side_please", s: t("Quisiera | {X}.", "I'd like | {X}.", "I'd like {X}.") },
        { id: "side_can", s: t("¿Puede | ser | con | {X}?", "Can | it be | with | {X}?", "Could I get it with {X}?") },
      ],
    },
    ask_food: {
      lt: "Ask about the food",
      items: [
        { id: "q_recommend", s: t("¿Qué | me | recomienda?", "What | (to) me | you-recommend?", "What do you recommend?",
        { spain: t("¿Qué | me | recomiendas?", "What | (to) me | you-recommend?", "What do you recommend?") }) },
        { id: "q_specials", s: t("¿Tienen | algún | especial | hoy?", "Do you have | some | special | today?", "Do you have any specials today?",
        { spain: t("¿Tenéis | algún | plato del día?", "Do you (all) have | some | dish of the day?", "Do you have any specials today?") }) },
        { id: "q_what_is", s: t("¿Qué | es | el | poc chuc?", "What | is | the | poc chuc?", "What's poc chuc?", { flags: { 3: "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic." } }) },
        { id: "q_spicy", s: t("¿Pica?", "Is it spicy?", "Is it spicy?"), note: "What Mexicans ask: “¿Pica?” – does it sting?" },
        { id: "q_comes_with", s: t("¿Con | qué | viene?", "With | what | does it come?", "What comes with it?") },
        { id: "q_veg", s: t("¿Tienen | algo | vegetariano?", "Do you have | something | vegetarian?", "Do you have anything vegetarian?",
        { spain: t("¿Tenéis | algo | vegetariano?", "Do you (all) have | something | vegetarian?", "Do you have anything vegetarian?") }) },
        { id: "allergy_nuts", s: t("Soy | {m:alérgico|f:alérgica} | a | las | nueces.", "I'm | allergic | to | the | nuts.", "I'm allergic to nuts.") },
        { id: "q_nuts", s: t("¿Lleva | nueces?", "Does it have | nuts?", "Does it have nuts?") },
        { id: "q_gluten", s: t("¿Es | sin | gluten?", "Is it | without | gluten?", "Is it gluten-free?") },
        { id: "q_price", s: t("¿Cuánto | cuesta | la | arrachera?", "How much | costs | the | flank steak?", "How much is the steak?") },
      ],
    },
    meal: {
      lt: "During the meal",
      items: [
        { id: "all_good", s: t("Todo | está | delicioso, | gracias.", "Everything | is | delicious, | thanks.", "Everything is delicious, thank you!") },
        { id: "compliments", s: t("¡Felicidades | a | la | cocinera!", "Congratulations | to | the | cook!", "My compliments to the chef!") },
        { id: "more_tortillas", s: t("¿Nos | trae | más | tortillas?", "(To) us | you-bring | more | tortillas?", "Could we get some more tortillas?",
        { spain: t("¿Nos | traes | más | tortillas?", "(To) us | you-bring | more | tortillas?", "Could we get some more tortillas?") }) },
        { id: "refill", s: t("¿Me | sirve | más | agua?", "(To) me | you-serve | more | water?", "Could I get some more water?",
        { spain: t("¿Me | pones | más | agua?", "(For) me | you-put | more | water?", "Could I get some more water?") }) },
        { id: "more_tortillas", s: t("¿Me | trae | más | salsa?", "(To) me | you-bring | more | salsa?", "Could I get some more salsa?",
        { spain: t("¿Me | traes | más | salsa?", "(To) me | you-bring | more | salsa?", "Could I get some more salsa?") }) },
        { id: "q_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?") },
      ],
    },
    complain: {
      lt: "Say it's the wrong dish", slot: "main", examples: ["cochinita", "poc_chuc", "tikin_xic"],
      items: [
        { id: "not_ordered", s: t("Disculpe, | esto | no es | lo que | pedí.", "Excuse me, | this | isn't | what | I-ordered.", "Excuse me, this isn't what I ordered.",
        { spain: t("Perdona, | esto | no es | lo que | he pedido.", "Excuse me, | this | isn't | what | I-ordered.", "Excuse me, this isn't what I ordered.") }) },
        { id: "i_ordered", s: t("Yo | pedí | {X.the}.", "I | ordered | {X.the}.", "I ordered {X.the}.",
        { spain: t("Yo | he pedido | {X.the}.", "I | ordered | {X.the}.", "I ordered {X.the}.") }) },
        { id: "didnt_order", s: t("Perdón, | yo | no pedí | esto.", "Sorry, | I | didn't order | this.", "Sorry, I didn't order this.",
        { spain: t("Perdona, | yo | no he pedido | esto.", "Sorry, | I | didn't order | this.", "Sorry, I didn't order this.") }) },
        { id: "wrong_dish", s: t("Creo | que | hay | un | error.", "I think | that | there is | a | mistake.", "I think there's a mistake.") },
      ],
    },
    cold: {
      lt: "Say the soup is cold",
      items: [
        { id: "cold", s: t("Mi | sopa | está | fría.", "My | soup | is | cold.", "My soup is cold.") },
        { id: "warm_up", s: t("¿Me la | puede | calentar, | por favor?", "It for me | can you | warm up, | please?", "Could you warm it up, please?",
        { spain: t("¿Me la | puedes | calentar, | por favor?", "It for me | can you | warm up, | please?", "Could you warm it up, please?") }) },
        { id: "cold_little", s: t("Está | un | poco | fría.", "It's | a | little | cold.", "It's a little cold.") },
      ],
    },
    check: {
      lt: "Ask for the check",
      items: [
        { id: "check_can", s: t("¿Nos | trae | la | cuenta, | por favor?", "(To) us | you-bring | the | check, | please?", "Could we get the check, please?",
        { spain: t("¿Nos | traes | la | cuenta, | por favor?", "(To) us | you-bring | the | check, | please?", "Could we get the check, please?") }) },
        { id: "check_please", s: t("La | cuenta, | por favor.", "The | check, | please.", "Check, please!") },
        { id: "check_can2", s: t("¿Me | cobra, | por favor?", "(From) me | you-charge, | please?", "Can I pay, please?",
        { spain: t("¿Me | cobras, | por favor?", "(From) me | you-charge, | please?", "Can I pay, please?") }), note: "Very Mexican: “¿Me cobra?” – will you charge me?", noteSpain: "¿Me cobras?: will you charge me? Spain also says “La cuenta, por favor”." },
        { id: "just_check", s: t("Nada más | la | cuenta, | gracias.", "Just | the | check, | thanks.", "Just the check, thanks.") },
      ],
    },
    split: {
      lt: "Together or separate",
      items: [
        { id: "split_together", s: t("Todo | junto, | por favor.", "All | together, | please.", "Together, please.") },
        { id: "split_sep", s: t("Separado, | por favor.", "Separate, | please.", "Separate checks, please.") },
        { id: "split_it", s: t("¿Podemos | dividir | la | cuenta?", "Can we | split | the | check?", "Could we split the check?") },
        { id: "split_half", s: t("Vamos | a | pagar | a medias.", "We're going | to | pay | half and half.", "We'll split it in half.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Pago | en efectivo.", "I'll-pay | in cash.", "I'll pay in cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.",
        { spain: t("Aquí tienes.", "Here you go.", "Here you go.") }) },
      ],
    },
    tip: {
      lt: "Choose the tip (usually 10–15%)",
      items: [
        { id: "tip_percent", s: t("Quince | por ciento, | por favor.", "Fifteen | percent, | please.", "Fifteen percent, please.") },
        { id: "tip_percent", s: t("Diez | por ciento.", "Ten | percent.", "Ten percent.") },
        { id: "tip_pesos", s: t("Póngale | cien | pesos.", "Put (for it) | a hundred | pesos.", "Add a hundred pesos.",
        { spain: t("Ponle | cien | pesos.", "Put (for it) | a hundred | pesos.", "Add a hundred pesos.") }) },
        { id: "tip_cash", s: t("La | propina | se la | dejo | en efectivo.", "The | tip | it to you | I'll-leave | in cash.", "I'll leave the tip in cash.",
        { spain: t("La | propina | te la | dejo | en efectivo.", "The | tip | it to you | I'll-leave | in cash.", "I'll leave the tip in cash.") }),
          note: "Common in Mexico: pay the check by card and leave the tip in cash." },
        { id: "q_tip_included", s: t("¿Está | incluida | la | propina?", "Is | included | the | tip?", "Is the tip included?") },
      ],
    },
    tip_ask: {
      lt: "Ask about the tip",
      items: [
        { id: "q_tip_included", s: t("¿Está | incluida | la | propina?", "Is | included | the | tip?", "Is the tip included?") },
        { id: "q_tip_how", s: t("¿Cuánto | se deja | de | propina?", "How much | does one leave | as | tip?", "How much do people tip?") },
      ],
    },
    change: {
      lt: "Leave the change or wait for it",
      items: [
        { id: "keep_change", s: t("Quédese | con | el | cambio.", "Keep | with | the | change.", "Keep the change.",
        { spain: t("Quédate | con | el | cambio.", "Keep | with | the | change.", "Keep the change.") }) },
        { id: "s_thanks", s: t("¡Gracias!", "Thanks!", "Thank you!") },
      ],
    },
    dessert: {
      lt: "Order dessert or coffee", slot: "dessert", examples: ["flan", "caballeros", "papaya", "helado"],
      items: [
        { id: "ill_have", s: t("Voy | a | querer | {X.the}.", "I'm going | to | want | {X.the}.", "I'll have {X.the}.",
        { spain: t("Voy | a | tomar | {X.the}.", "I'm going | to | have | {X.the}.", "I'll have {X.the}.") }) },
        { id: "im_full", s: t("No, | gracias, | estoy | {m:lleno|f:llena}.", "No, | thanks, | I'm | full.", "No, thanks, I'm full.") },
        { id: "dessert_menu", s: t("¿Nos | trae | la | carta | de | postres?", "(To) us | you-bring | the | menu | of | desserts?", "Could we see the dessert menu?",
        { spain: t("¿Nos | traes | la | carta | de | postres?", "(To) us | you-bring | the | menu | of | desserts?", "Could we see the dessert menu?") }) },
        { id: "dessert_share", s: t("¿Nos | trae | {X.the} | con | dos | cucharas?", "(To) us | you-bring | {X.the} | with | two | spoons?", "Could we get {X.the} with two spoons?",
        { spain: t("¿Nos | traes | {X.the} | con | dos | cucharas?", "(To) us | you-bring | {X.the} | with | two | spoons?", "Could we get {X.the} with two spoons?") }) },
      ],
    },
    box: {
      lt: "Take the leftovers home",
      items: [
        { id: "box", s: t("¿Me lo | pone | para llevar?", "It for me | you-put | to go?", "Could you box this up for me?",
        { spain: t("¿Me lo | pones | para llevar?", "It for me | you-put | to go?", "Could you box this up for me?") }) },
        { id: "box_take", s: t("¿Me | puedo | llevar | lo que | sobró?", "(For) myself | can I | take | what | was left?", "Can I take the rest with me?",
        { spain: t("¿Me | puedo | llevar | lo que | ha sobrado?", "(For) myself | can I | take | what | was left?", "Can I take the rest with me?") }) },
      ],
    },
    ready: {
      lt: "Ready to order?",
      items: [
        { id: "ready", s: t("Sí, | ya | estamos | listos.", "Yes, | already | we are | ready.", "Yes, we're ready.") },
        { id: "need_minutes", s: t("¿Nos | da | unos | minutos | más?", "(To) us | you-give | a few | minutes | more?", "Could we have a few more minutes?",
        { spain: t("¿Nos | das | unos | minutos | más?", "(To) us | you-give | a few | minutes | more?", "Could we have a few more minutes?") }) },
        { id: "still_deciding", s: t("Todavía | estoy | viendo | el | menú.", "Still | I'm | looking at | the | menu.", "I'm still deciding.",
        { spain: t("Todavía | estoy | mirando | la | carta.", "Still | I'm | looking at | the | menu.", "I'm still deciding.") }) },
      ],
    },
    factura: {
      lt: "Say if you need a tax invoice",
      items: [
        { id: "fac_no", s: t("No, | gracias.", "No, | thanks.", "No, thanks."), note: "A factura is for businesses and people who deduct the cost; a visitor usually says no." },
        { id: "fac_yes", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "q_factura", s: t("¿Me | da | factura?", "(To) me | you-give | an invoice?", "Can I get a tax invoice?",
        { spain: t("¿Me | das | factura?", "(To) me | you-give | an invoice?", "Can I get a tax invoice?") }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    // Spain twins (docs/es/STYLE.md "Spain Spanish")
    "has llegado": { reason: "grammatical_fusion", split: "has → you have + llegado → arrived; = you've come.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "he encontrado": { reason: "grammatical_fusion", split: "he → I have + encontrado → found; = I've found.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha llegado": { reason: "grammatical_fusion", split: "ha → has + llegado → arrived; = came in.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "has pedido": { reason: "grammatical_fusion", split: "has → you have + pedido → ordered; = you ordered.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "he pedido": { reason: "grammatical_fusion", split: "he → I have + pedido → ordered; = I ordered.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "no he pedido": { reason: "grammatical_fusion", split: "no → not + he → I have + pedido → ordered; = I didn't order.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha pasado": { reason: "grammatical_fusion", split: "ha → has + pasado → happened; = happened.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "he cambiado": { reason: "grammatical_fusion", split: "he → I have + cambiado → changed; = I've changed.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "ha sobrado": { reason: "grammatical_fusion", split: "ha → has + sobrado → been left over; = was left.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "he traído": { reason: "grammatical_fusion", split: "he → I have + traído → brought; = I've brought.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "lo has decidido": { reason: "grammatical_fusion", split: "lo → it + has → you have + decidido → decided; = have you decided.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "lo habéis decidido": { reason: "grammatical_fusion", split: "lo → it + habéis → you (all) have + decidido → decided; = have you (all) decided.", minimal: "Spain's perfect: the auxiliary and the participle are one English verb." },
    "os los": { reason: "grammatical_fusion", split: "os → (to) you (all) + los → them; = them to you (all).", minimal: "Two object pronouns before the verb are glossed together." },
    "os la": { reason: "grammatical_fusion", split: "os → (to) you (all) + la → it; = it to you (all).", minimal: "Two object pronouns before the verb are glossed together." },
    "os las": { reason: "grammatical_fusion", split: "os → (to) you (all) + las → them; = them for you (all).", minimal: "Two object pronouns before the verb are glossed together." },
    "lo dices": { reason: "grammatical_fusion", split: "lo → it + dices → you say; = you tell (it).", minimal: "Two object pronouns before the verb are glossed together." },
    "lo decís": { reason: "grammatical_fusion", split: "lo → it + decís → you (all) say; = you (all) tell (it).", minimal: "Two object pronouns before the verb are glossed together." },
    "quedar libre": { reason: "lexical_expression", split: "quedar → to remain + libre → free; = to become free.", minimal: "All words form the expression." },
    "aquí tenéis": { reason: "lexical_expression", split: "aquí → here + tenéis → you (all) have; handing something over = here you go.", minimal: "All words form the expression." },
    "poco hecha": { reason: "lexical_expression", split: "poco → little + hecha → done; a steak = rare.", minimal: "All words form the expression." },
    "medio hecha": { reason: "lexical_expression", split: "medio → half + hecha → done; a steak = medium-rare.", minimal: "All words form the expression." },
    "al punto": { reason: "lexical_expression", split: "al → to the + punto → point; a steak = medium.", minimal: "All words form the expression." },
    "muy hecha": { reason: "lexical_expression", split: "muy → very + hecha → done; a steak = well-done.", minimal: "All words form the expression." },
    "que aproveche": { reason: "lexical_expression", split: "que → that + aproveche → it may benefit; Spain, at a meal = enjoy (your meal).", minimal: "All words form the expression." },
    "te apetezca": { reason: "lexical_expression", split: "te → (to) you + apetezca → it may appeal; = you feel like.", minimal: "All words form the expression." },
    "en total": { reason: "lexical_expression", split: "en → in + total → total; = altogether.", minimal: "All words form the expression." },
    "plato del día": { reason: "lexical_expression", split: "plato → dish + del → of the + día → day; = the day's special.", minimal: "All words form the expression." },
    "la cocina de lucía": { reason: "lexical_expression", split: "The restaurant's name: la → the, cocina → kitchen, de → of, Lucía would translate a proper name word by word.", minimal: "The four-word name." },
    "tikin xic": { reason: "lexical_expression", split: "A Mayan dish name; tikin → dry, xic → chili is not how English names the dish.", minimal: "Two words, one name." },
    "poc chuc": { reason: "lexical_expression", split: "A Mayan dish name (poc → to toast, chuc → charcoal); English uses the name.", minimal: "Two words, one name." },
    "caballeros pobres": { reason: "lexical_expression", split: "caballeros → gentlemen + pobres → poor names no dessert; a Yucatán bread pudding.", minimal: "Two words, one name." },
    "naranja agria": { reason: "lexical_expression", split: "naranja → orange + agria → sour reads as a description; it is one fruit (sour orange, Seville orange).", minimal: "Two words, one fruit." },
    "plato fuerte": { reason: "lexical_expression", split: "plato → dish + fuerte → strong is false; = the main course.", minimal: "Two words." },
    "término medio": { reason: "lexical_expression", split: "término → term + medio → middle is false; a steak's doneness = medium.", minimal: "Two words." },
    "medio roja": { reason: "lexical_expression", split: "medio → half + roja → red is false; a steak's doneness = medium-rare.", minimal: "Two words." },
    "tres cuartos": { reason: "lexical_expression", split: "tres → three + cuartos → quarters is false; a steak's doneness = medium-well.", minimal: "Two words." },
    "bien cocida": { reason: "lexical_expression", split: "bien → well + cocida → cooked is a word-for-word reading of the doneness term well-done.", minimal: "Two words." },
    "aquí tienen": { reason: "lexical_expression", split: "aquí → here + tienen → you have is literal; handing over = here you are / here are (ustedes).", minimal: "Two words." },
    "se le ofrece": { reason: "lexical_expression", split: "se → —, le → to you, ofrece → offers: a fixed service formula = can I get you.", minimal: "Three words form the formula." },
    "se les ofrece": { reason: "lexical_expression", split: "se → —, les → to you (all), ofrece → offers: a fixed service formula = can I get you.", minimal: "Three words form the formula." },
    "tómese su tiempo": { reason: "lexical_expression", split: "tómese → take + su → your + tiempo → time: one formula.", minimal: "Three words." },
    "se le antoje": { reason: "lexical_expression", split: "se → —, le → to you, antoje → craves: antojarse = to feel like (having).", minimal: "Three words." },
    "lo normal": { reason: "lexical_expression", split: "lo → the + normal → normal: a noun phrase = the usual thing.", minimal: "Two words." },
    "se acostumbra": { reason: "grammatical_fusion", split: "Impersonal se + acostumbra: English says “people usually / it's customary”.", minimal: "Two words." },
    "me quedo": { reason: "grammatical_fusion", split: "me → myself + quedo → I stay: quedarse con = to keep.", minimal: "Two words." },
    "se acaba": { reason: "grammatical_fusion", split: "Impersonal se + acaba (acabar de = to have just); English says “just”.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more, o → or, menos → less: here = about, roughly.", minimal: "Three words." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same is false; = right now.", minimal: "Two words." },
    "hay que": { reason: "lexical_expression", split: "hay → there is + que → that is false; impersonal obligation = do we have to / one has to.", minimal: "Two words." },
    "a medias": { reason: "lexical_expression", split: "a → to + medias → halves (or socks) is false; = half and half.", minimal: "Two words." },
    "por ciento": { reason: "lexical_expression", split: "por → for + ciento → hundred is the literal source of one English word: percent.", minimal: "Two words." },
    "por separado": { reason: "lexical_expression", split: "por → by + separado → separated; one adverb = separately.", minimal: "Two words." },
    "lo picante": { reason: "lexical_expression", split: "lo → the + picante → spicy: a noun phrase = the spicy part.", minimal: "Two words." },
  },

  mission: [
    { step: "resv", lt: "Say if you have a reservation" },
    { step: "drinks", lt: "Order a drink" },
    { step: "order", lt: "Order your dinner" },
    { lt: "Speak up if something is wrong", optional: true, when: (c) => twistShown(c), done: (c) => twistSettled(c) },
    { lt: "Ask for the check", done: (c) => !!c.s.checkAsked },
    { lt: "Pay (with a tip)", done: (c) => !!c.s.paid },
  ],

  // -------------------------------------------------------------------------
  // Handlers only record what the learner said (and answer side questions); the steps below do the talking, one step
  // per turn, so a pause ("Ahorita se lo traigo") is a real turn.

  steps: [
    // Host: reservation, party, wait, table
    { id: "resv", when: (c) => !c.s.seated, done: (c) => c.s.resv !== undefined,
      ask: (c) => {
        if (!c.s.greeted) { c.s.greeted = true; c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet"); return; }
        c.say("ask_resv");
      },
      expects: ["resv_yes", "resv_no", "resv_no_ctx", "table_for", "party_ctx", "resv_time_ctx", "hungry"],
      suggest: [
        { lt: "Say you booked a table (and the name)", hint: "resv" },
        { lt: "Say you have no reservation and ask for a table", hint: "table" },
      ],
      yes: (c) => { c.s.resv = true; },
      no: (c) => { c.s.resv = false; } },
    { id: "resv_name", when: (c) => c.s.resv === true && !c.s.seated, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_resv_name"), expects: ["name_ctx", "resv_yes", "hungry"],
      suggest: [{ lt: "Give the name on the reservation", hint: "resv_name" }] },
    { id: "party", when: (c) => c.s.resv === false && !c.s.seated, done: (c) => c.s.party !== undefined,
      ask: (c) => {
        if (!c.s.partyAsked && c.chance(0.3)) { c.s.partyAsked = true; c.s.justOne = true; c.say("ask_just_one"); return; }
        c.s.partyAsked = true; c.s.justOne = false; c.say("ask_party");
      },
      expects: ["party_ctx", "table_for"],
      suggest: [{ lt: "Say how many you are", hint: "party" }],
      yes: (c) => { if (c.s.justOne) c.s.party = 1; },
      no: (c) => { c.s.justOne = false; } },
    { id: "wait", when: (c) => c.s.resv === false && c.s.waitTwist && !c.s.seated, done: (c) => !!c.s.waitDone,
      ask: (c) => {
        if (c.s.waitOk === undefined) {
          if (c.s.waitAsked) { sayP(c, "wait_again"); return; }
          c.s.waitAsked = true; c.twist("wait"); sayP(c, c.s.waitLine); return;
        }
        c.s.waitDone = true;
        c.say("table_ready");
        c.ask("seat");
      },
      expects: ["wait_ok_ctx", "wait_no_ctx", "ask_wait", "its_ok"],
      suggest: [{ lt: "Agree to wait, or say you're in a hurry", hint: "wait" }],
      yes: (c) => { waitAnswer(c, true); },
      no: (c) => { waitAnswer(c, false); } },
    { id: "seatpref", when: (c) => c.s.askSeat && !c.s.seated, done: (c) => !!c.s.seatPref,
      ask: (c) => sayP(c, "ask_seat"), expects: ["seat_ans", "seat_req", "seat_any_ctx"],
      suggest: [{ lt: "Choose: inside or on the terrace", hint: "seat" }],
      help: (c) => { sayP(c, "ask_seat"); } },
    { id: "seat", when: (c) => !c.s.seated, done: (c) => !!c.s.seated,
      ask: (c) => {
        sayP(c, "seating");
        c.s.seated = true;
        c.speaker("marco");
        if (c.s.hay) { c.s.marcoGreeted = true; sayP(c, "m_greet_hay"); expectHowAreYou(c); return; }
        // Something was ordered at the host stand: Luis knows it and goes on from there.
        if (items(c).length) {
          c.s.marcoGreeted = true; c.say("m_greet");
          const next = restaurant.steps.find((st) => (!st.when || st.when(c)) && !st.done(c));
          if (next) c.ask(next.id);
          return;
        }
        c.ask("drinks");
      } },
    // Luis: drinks
    { id: "drinks", when: (c) => !!c.s.seated, done: (c) => !!c.s.drinksDone || drinks(c).length > 0,
      ask: (c) => {
        if (!c.s.marcoGreeted) { c.s.marcoGreeted = true; c.say("m_greet"); sayP(c, "ask_drinks"); return; }
        if (food(c).length) c.say("ask_drinks_again"); else sayP(c, "ask_drinks");
      },
      // "reject" too, so "No quiero cerveza" is read as a whole (not as "no" + an order)
      expects: ["order", "drinks_no", "ask_menu", "more_no", "reject", "correction", "ask_price", "ask_desc", "ask_allergy"],
      suggest: [
        { lt: "Order a drink", hint: "drink", options: ["lemonade", "horchata", "jamaica", "chaya", "still_water", "sparkling_water", "coke", "beer", "red_wine"] },
        { lt: "Ask what they have to drink", hint: "drink" },
      ],
      yes: (c) => { sayP(c, "what_drink"); c.hold(); },
      no: (c) => { c.s.drinksDone = true; c.say("no_problem"); },
      help: (c) => { c.say("drinks_list"); } },
    { id: "drink_kind", when: (c) => drinks(c).some((d) => generic(d)), done: () => false,
      ask: (c) => {
        const g = generic(drinks(c).find((d) => generic(d))!);
        c.say(g === "water" ? "ask_water_kind" : g === "lemonade" ? "ask_lemonade_kind" : g === "wine" ? "ask_wine_kind" : g === "soda" ? "ask_soda_kind" : g === "fresca" ? "ask_fresca_kind" : "ask_coffee_kind");
      },
      expects: ["order", "kind_ctx"],
      suggest: (c) => {
        const g = generic(drinks(c).find((d) => generic(d)) ?? { cat: "drink", id: "water", qty: 1 });
        const kind = g && KIND_OPTS[g] ? g : "water";
        return [{ lt: "Say which one", hint: `drink_kind_${kind}`, options: KIND_OPTS[kind] }];
      },
      help: (c) => { c.say("drinks_list"); } },
    { id: "drinks_ack", when: (c) => !!c.s.drinksDone && drinks(c).length > 0 && !food(c).length && !c.s.served, done: (c) => !!c.s.drinksAcked,
      ask: (c) => { c.s.drinksAcked = true; c.say(drinks(c).length > 1 || drinks(c)[0].qty > 1 ? "drinks_ack_pl" : "drinks_ack"); },
      expects: ["qty_ctx"],
      suggest: [{ lt: "Say thank you", hint: "g_social" }, { lt: "Ask about the food", hint: "ask_food" }] },
    // Food
    { id: "order", when: (c) => !!c.s.seated && !!c.s.drinksDone, done: (c) => food(c).length > 0,
      ask: (c) => {
        if (drinks(c).length && !c.s.drinksServed) {
          c.s.drinksServed = true;
          const d = drinks(c);
          if (d.length === 1 && d[0].qty === 1) c.say("drink_served", { X: d[0].id }); else c.say("drinks_served");
        }
        if (c.s.specials && !c.s.specialsSaid) { c.s.specialsSaid = true; c.say("specials"); }
        if (c.s.readyNow) { c.s.readyNow = false; sayP(c, "ready_ok"); return; }
        // After a side question the waiter does not re-ask every time.
        c.s.orderAsks = (c.s.orderAsks ?? 0) + 1;
        if (c.s.orderAsks > 1 && c.s.orderAsks % 2 === 0) return;
        sayP(c, c.s.moreTime ? "ask_order" : "ask_ready");
      },
      expects: ["order", "ready_yes", "need_time", "ask_recommend", "ask_specials", "ask_menu", "reject", "correction", "change",
        "ask_spicy", "ask_desc", "ask_comes", "ask_veg", "ask_allergy", "ask_price"],
      suggest: [
        { lt: "Order a main course", hint: "order_food", options: "main" },
        { lt: "Order an appetizer", hint: "starter", options: "starter" },
        { lt: "Ask about the dishes (recommendations, spicy, allergies)", hint: "ask_food" },
        { lt: "Ask for a few more minutes", hint: "ready" },
      ],
      yes: (c) => { c.s.readyNow = true; },
      no: (c) => { c.s.moreTime = true; sayP(c, "take_time"); c.hold(); },
      help: (c) => { c.say("recommend"); } },
    { id: "food_kind", when: (c) => food(c).some((i) => generic(i)), done: () => false,
      ask: (c) => c.say("ask_pibil_kind"), expects: ["order", "kind_ctx"],
      suggest: [{ lt: "Choose the dish", hint: "order_food", options: ["cochinita", "pollo_pibil"] }] },
    { id: "doneness", when: (c) => mains(c).some((m) => needsDone(m) && !m.done), done: () => false,
      ask: (c) => { c.say("ask_doneness"); if (c.chance(0.4)) c.say("doneness_options"); },
      expects: ["doneness_ans", "order", "qty_ctx"],
      suggest: [{ lt: "Say how you want your steak", hint: "doneness", options: "doneness" }],
      help: (c) => { c.say("doneness_list"); } },
    { id: "side", when: (c) => mains(c).some((m) => needsSide(m) && !m.side), done: () => false,
      ask: (c) => c.say("ask_side", { X: B(mains(c).find((m) => needsSide(m) && !m.side)!.id) }),
      expects: ["side_ans", "order", "reject", "qty_ctx"],
      suggest: [{ lt: "Choose a side", hint: "side", options: "side" }],
      help: (c) => { c.say("side_list"); } },
    { id: "main_q", when: (c) => starters(c).length > 0 && !mains(c).length && !c.s.noMain && !c.s.placed, done: () => false,
      ask: (c) => sayP(c, "ask_main"), expects: ["order", "more_no"],
      suggest: [{ lt: "Order a main course (or say that's all)", hint: "order_food", options: "main" }],
      no: (c) => { c.s.noMain = true; } },
    { id: "soup_offer", when: (c) => c.s.soupTwist && !soupItem(c) && c.s.soupOffer === undefined && mains(c).length > 0 && !c.s.placed, done: () => false,
      ask: (c) => { if (c.s.soupAsked) { c.say("soup_offer_again"); return; } c.s.soupAsked = true; c.say("soup_offer", { price: byId("sopa_lima").attrs!.price }); },
      expects: ["order", "more_no", "ask_price", "ask_desc", "soup_yes_ctx"],
      suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.soupOffer = true; items(c).push({ cat: "starter", id: "sopa_lima", qty: 1 }); },
      no: (c) => { c.s.soupOffer = false; } },
    { id: "placed", when: (c) => food(c).length > 0, done: (c) => !!c.s.placed,
      ask: (c) => {
        c.s.placed = true;
        c.say("placed");
        if (drinks(c).length && !c.s.drinksServed) { c.s.drinksServed = true; c.say("drinks_served"); }
      },
      expects: ["qty_ctx"],
      suggest: [
        { lt: "Say thank you and wait", hint: "g_social" },
        { lt: "Ask for something (tortillas, water)", hint: "meal" },
      ] },
    // The food arrives (twist: the wrong dish)
    { id: "serve_wrong", when: (c) => c.s.wrongTwist && !!mainDish(c) && !!c.s.placed && !c.s.served, done: () => false,
      ask: (c) => {
        const main = mainDish(c)!;
        if (!c.s.wrongPhase) {
          c.s.wrongPhase = 1;
          c.s.wrongDish = main.id === "poc_chuc" ? "cochinita" : "poc_chuc";
          c.twist("wrong_dish");
          const st = starters(c)[0]; // the starter comes too (it was never served on this path)
          if (st) c.say("serve_starter", { X: B(st.id) });
          c.say("serve", { X: B(c.s.wrongDish) });
          return;
        }
        if (c.s.wrongPhase === 1) { c.s.wrongPhase = 2; c.say(c.s.wrongComplained ? "wrong_sorry" : "wrong_noticed", { X: B(main.id) }); return; }
        c.s.served = true;
        c.say("serve_fixed", { X: B(main.id) });
      },
      expects: ["complain_wrong", "its_ok"],
      suggest: [
        { lt: "Say they brought the wrong dish", hint: "complain", options: "main" },
      ] },
    { id: "serve", when: (c) => !!c.s.placed && !c.s.served, done: (c) => !!c.s.served,
      ask: (c) => {
        c.s.served = true;
        const st = starters(c)[0];
        const main = mainDish(c);
        if (st && main) c.say("serve_starter", { X: B(st.id) });
        c.say("serve", { X: B((main ?? st ?? food(c)[0]).id) });
      },
      suggest: [
        { lt: "Say thank you", hint: "g_social" },
        { lt: "Ask for more tortillas or a drink", hint: "meal" },
      ] },
    // Checking back (twist: cold soup)
    { id: "checkback_soup", when: (c) => c.s.soupTwist && !!soupItem(c) && !!c.s.served && !c.s.cb, done: (c) => !!c.s.cb,
      ask: (c) => { c.twist("cold_soup"); c.say("ask_checkback_soup"); },
      expects: ["complain_cold", "all_good", "all_good_ctx", "complain_other", "request", "more_no", "order"],
      suggest: [
        { lt: "Say the soup is cold and ask to warm it up", hint: "cold" },
        { lt: "Say it's delicious", hint: "meal" },
      ],
      yes: (c) => { c.s.cb = "good"; },
      no: (c) => { c.say("what_wrong"); c.hold(); } },
    { id: "checkback", when: (c) => !!c.s.served && !c.s.cb, done: (c) => !!c.s.cb,
      ask: (c) => c.say("ask_checkback"),
      expects: ["all_good", "all_good_ctx", "complain_cold", "complain_other", "request", "more_no", "order"],
      suggest: [
        { lt: "Say everything is delicious", hint: "meal" },
        { lt: "Ask for more tortillas or a drink", hint: "meal" },
        { lt: "Complain if something is wrong", hint: "cold" },
      ],
      yes: (c) => { c.s.cb = "good"; },
      no: (c) => { c.say("what_wrong"); c.hold(); } },
    { id: "enjoy", when: (c) => !!c.s.cb && c.s.cb !== "fix" && !c.s.enjoyed, done: (c) => !!c.s.enjoyed,
      ask: (c) => {
        c.s.enjoyed = true;
        const cb = c.s.cb as string;
        if (cb === "compliments") c.say("compliments_reply");
        else if (cb.startsWith("request:")) c.say(requestLine(cb.slice(8)));
        else c.say("all_good_reply");
      },
      suggest: [{ lt: "Say thank you", hint: "g_social" }, { lt: "Ask for something", hint: "meal" }] },
    { id: "fix", when: (c) => !!c.s.fixing && (c.s.fixPhase ?? 0) < 2, done: (c) => (c.s.fixPhase ?? 0) >= 2,
      ask: (c) => {
        const x = B(c.s.fixing as string);
        if (!c.s.fixPhase) { c.s.fixPhase = 1; c.say(c.s.fixKind === "cold" ? "cold_sorry" : "other_sorry", { X: x }); return; }
        c.s.fixPhase = 2;
        c.say(c.s.fixKind === "cold" ? "cold_fixed" : "other_fixed", { X: x });
      },
      expects: ["its_ok"],
      suggest: [{ lt: "Say thank you", hint: "g_social" }] },
    { id: "box", when: (c) => c.s.askBox && mealOver(c) && c.s.box === undefined && !c.s.checkAsked, done: () => false,
      ask: (c) => c.say("ask_box"),
      expects: ["box_ask"],
      suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }, { lt: "Ask to take the rest home", hint: "box" }],
      yes: (c) => { c.s.box = true; c.say("box_ok"); },
      no: (c) => { c.s.box = false; c.say("no_problem"); } },
    // Dessert
    { id: "dessert", when: (c) => c.s.askDessert && mealOver(c) && !c.s.checkAsked, done: (c) => !!c.s.dessertDone,
      ask: (c) => sayP(c, c.s.dessertMenu ? "which_dessert" : "ask_dessert"),
      // "change" / "correction" too: "No, mejor un flan" is a flan, never "no flan"
      expects: ["order", "dessert_no", "check_ask", "ask_menu", "ask_recommend", "more_no", "reject", "ask_price", "ask_desc", "ask_allergy", "change", "correction", "dessert_some_ctx"],
      suggest: [
        { lt: "Order dessert or coffee", hint: "dessert", options: ["flan", "caballeros", "papaya", "helado", "cafe_de_olla", "americano"] },
        { lt: "Say no and ask for the check", hint: "check" },
      ],
      yes: (c) => { c.s.dessertMenu = true; c.say("dessert_list"); c.hold(); },
      no: (c) => { c.s.dessertDone = true; c.s.dessertDeclined = true; },
      help: (c) => { c.say("dessert_list"); } },
    { id: "dessert_ack", when: (c) => !!c.s.dessertOrdered && !c.s.dessertAcked, done: (c) => !!c.s.dessertAcked,
      ask: (c) => { c.s.dessertAcked = true; const d = desserts(c).at(-1) ?? drinks(c).at(-1); c.say("dessert_ack", { X: B(d?.id ?? "flan") }); },
      suggest: [{ lt: "Say thank you", hint: "g_social" }] },
    { id: "dessert_serve", when: (c) => !!c.s.dessertAcked && !c.s.dessertServed, done: (c) => !!c.s.dessertServed,
      ask: (c) => {
        c.s.dessertServed = true;
        const d = desserts(c).at(-1) ?? drinks(c).at(-1) ?? food(c).at(-1);
        if (d) c.say("serve_dessert", { X: B(d.id) }); else c.say("no_problem");
      },
      suggest: [{ lt: "Say thank you", hint: "g_social" }] },
    // The check (never brought unasked)
    { id: "check", when: (c) => mealOver(c) && !c.s.checkAsked && (!c.s.dessertOrdered || !!c.s.dessertServed), done: (c) => !!c.s.checkAsked,
      ask: (c) => {
        if (c.s.dessertDeclined && !c.s.wheneverSaid) { c.s.wheneverSaid = true; sayP(c, "check_whenever"); return; }
        sayP(c, "ask_check_else");
      },
      expects: ["check_ask", "more_no", "order", "ask_menu", "box_ask", "dessert_no", "check_not_yet", "dessert_some_ctx"],
      suggest: [
        { lt: "Ask for the check", hint: "check" },
        { lt: "Order a dessert", hint: "dessert", options: "dessert" },
      ],
      yes: (c) => { sayP(c, "what_else"); c.hold(); },
      no: (c) => { noMoreAtCheck(c); } },
    { id: "check_coming", when: (c) => !!c.s.checkAsked && mealOver(c) && !c.s.checkComing, done: (c) => !!c.s.checkComing,
      ask: (c) => {
        c.s.checkComing = true;
        sayP(c, "check_coming");
        if (needSplit(c)) { c.s.splitAsked = true; c.ask("split"); } // the split question comes with it
      },
      expects: ["split_ans"],
      suggest: [{ lt: "Say thank you", hint: "g_social" }] },
    { id: "split", when: (c) => !!c.s.checkComing && needSplit(c), done: () => false,
      ask: (c) => c.say("ask_split"), expects: ["split_ans"],
      suggest: [{ lt: "Say: together or separate", hint: "split" }] },
    { id: "pay", when: (c) => !!c.s.checkComing && !c.s.payMethod, done: (c) => !!c.s.payMethod,
      ask: (c) => {
        if (!c.s.checkBrought) {
          c.s.checkBrought = true;
          if (c.s.split === "separate") c.say("bring_checks");
          else { c.speaker("marco"); sayP(c, "bring_check"); if (!c.s.totalSaid) c.say("total_is", { total: total(c) }); c.s.totalSaid = true; }
          if (c.s.wantPay) {
            c.s.payMethod = c.s.wantPay;
            // the card was chosen before the check came: Luis brings the terminal with it
            if (c.s.payMethod === "card") c.ask(needFactura(c) ? "factura" : "tip");
            else {
              // cash handed over before the check came is counted against it now (rule 18)
              if (cashShort(c)) c.say("cash_missing", { price: total(c) - (c.s.cashGiven as number) });
              if (needFactura(c)) c.ask("factura");
            }
            return;
          }
          if (c.s.split !== "separate" && c.chance(0.5)) c.say("no_rush");
          return;
        }
        sayP(c, "ask_pay_method");
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "ask_tip", "no_cash", "factura_ask", "pay_whatif", "ask_price", "pay_amb", "change_q", "tip_cash"],
      suggest: [
        { lt: "Pay by card or in cash", hint: "pay" },
        { lt: "Ask if the tip is included", hint: "tip_ask" },
      ] },
    // Twist (the brief): "¿Va a requerir factura?"
    { id: "factura", when: (c) => needFactura(c), done: (c) => c.s.factura !== undefined,
      ask: (c) => { c.twist("factura"); c.say("ask_factura"); },
      // "¿Cuesta algo (la factura)?" is a question: "No cuesta nada" (never a yes)
      expects: ["factura_yes_ctx", "factura_no_ctx", "factura_ask", "ask_price"],
      suggest: [{ lt: "Say if you need a tax invoice", hint: "factura" }],
      yes: (c) => { c.s.factura = true; c.say("factura_yes"); },
      no: (c) => { c.s.factura = false; c.say("factura_no"); } },
    { id: "tip", when: (c) => c.s.payMethod === "card" && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.readerSaid) { c.s.readerSaid = true; c.say(c.s.wantPay ? "reader_here" : "card_reader"); return; }
        c.say("tip_screen");
      },
      // "Mejor en efectivo": nothing is paid yet, so the other way is still open (rule 18)
      expects: ["tip_ctx", "tip_give", "tip_none", "ask_tip", "tip_none_ctx", "pay_cash", "pay_card", "no_cash", "pay_phone", "tip_cash"],
      suggest: [{ lt: "Choose the tip (usually 10–15%)", hint: "tip" }],
      no: (c) => { restaurant.handlers.tip_none(c, {}, { intent: "tip_none", slots: {}, tags: [] } as any); } },
    { id: "change", when: (c) => c.s.payMethod === "cash" && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        // short of the total: the rest first, whatever else was said (rule 18)
        if (cashShort(c)) { c.say("cash_still", { price: total(c) - (c.s.cashGiven as number) }); return; }
        if (!c.s.changeOffered) {
          c.s.changeOffered = true;
          if (counted(c) && c.s.cashGiven === total(c)) { payCash(c); c.say("cash_exact"); return; } // handed before the check, exact
          c.say("cash_ok"); return;
        }
        payCash(c); c.say("change_back");
      },
      expects: ["keep_change", "tip_give", "want_change", "here_you_go", "pay_card", "no_cash", "pay_phone"],
      suggest: [{ lt: "Leave the change as a tip, or wait for it", hint: "change" }] },
  ],

  init: (c) => {
    c.s.items = [];
    c.s.askSeat = c.chance(0.3);
    c.s.waitTwist = c.chance(0.4);
    c.s.waitLine = c.chance(0.5) ? "wait_10" : "wait_15";
    c.s.windowFull = c.chance(0.4);
    c.s.specials = c.chance(0.5);
    c.s.hay = c.chance(0.35);
    c.s.askDessert = c.chance(0.7);
    c.s.askBox = c.chance(0.25);
    c.s.askSplit = c.chance(0.7);
    c.s.wrongTwist = c.visits >= 1 && c.chance(0.45);
    c.s.soupTwist = c.visits >= 1 && !c.s.wrongTwist && c.chance(0.55);
    c.s.facturaTwist = c.visits >= 1 && c.chance(0.35);
  },

  start: (c) => {
    c.speaker("marco_host");
  },

  handlers: {
    // --- Host
    resv_yes(c, slots) {
      c.s.resv = true;
      // "Reservamos para cuatro" is four people, not four o'clock (rule 4)
      if (timeIsParty(c, slots)) slots = { ...slots, party: { number: (slots.time as { h: number }).h }, time: undefined };
      const p = partyOf(slots.party);
      if (p) c.s.party = p;
      if (slots.time) c.s.time = slots.time;
      if (slots.name && !c.s.name) { c.s.name = slots.name; c.s.party ??= 2; c.say("resv_found"); }
    },
    resv_no(c) { c.s.resv = false; },
    // "Sí, para dos" is two people, not two o'clock (resv_yes reads it, rule 4)
    resv_time_ctx(c, slots, seg) { restaurant.handlers.resv_yes(c, slots, seg); },
    resv_no_ctx(c) { if (c.s.resv === undefined) c.s.resv = false; },
    table_for(c, slots, seg) {
      const p = partyOf(slots.party);
      if (p) c.s.party = p;
      if (seg.tags.includes("noresv")) c.s.resv = false;
      if (c.s.resv === undefined && c.step !== "resv") c.s.resv = false;
      if (c.s.resv === undefined && c.step === "resv") c.s.resv = false; // asking for a table = no reservation
      if (["window", "patio", "inside", "quiet"].some((x) => seg.tags.includes(x))) seatPref(c, seg.tags);
    },
    party_ctx(c, slots, seg) {
      const p0 = partyOf(slots.party) ?? (seg.tags.includes("h:party_just_me") ? 1 : undefined);
      // "Somos cuatro adultos y dos niños": the children sit at the table too
      const kids = seg.tags.includes("k1") ? 1 : seg.tags.includes("kn") ? Number(toArr(slots.number).at(-1) ?? 0) : 0;
      const p = p0 ? p0 + kids : undefined;
      if (p) c.s.party = p;
      else if (/\b(yo|nosotros)\b/.test(fold(c.heard))) c.s.party = /\bnosotros\b/.test(fold(c.heard)) ? 2 : 1;
    },
    // "¡Muy bien, y con hambre!": a smile back, once; the open question comes again
    hungry(c) { if (!c.s.hungrySaid) { c.s.hungrySaid = true; c.say("right_place"); } },
    name_ctx(c, slots) {
      if (c.s.name) return;
      const txt = fold(c.heard);
      if (!slots.name && !/a (mi|nombre de mi)/.test(txt)) { c.say("ask_resv_name"); c.hold(); return; }
      c.s.resv = true;
      c.s.name = slots.name ?? "(su nombre)";
      c.s.party ??= 2;
      c.say("resv_found");
    },
    ask_wait(c) {
      if (c.s.seated) { c.say("not_long"); return; }
      if (c.s.waitTwist && c.s.resv === false) { c.say(c.s.waitLine === "wait_10" ? "wait_is_10" : "wait_is_15"); return; }
      c.say("no_wait");
    },
    wait_ok_ctx(c) { waitAnswer(c, true); },
    wait_no_ctx(c) { waitAnswer(c, false); },
    seat_req(c, _slots, seg) { seatPref(c, seg.tags); },
    seat_ans(c, _slots, seg) { seatPref(c, seg.tags); },
    seat_any_ctx(c) { seatPref(c, ["any"]); },
    // --- Ordering
    order(c, slots, seg) {
      // "¿Poc chuc? Yo pedí la cochinita": naming a dish while the wrong one is on the table is not a new order
      if (c.step === "serve_wrong" && c.s.wrongPhase === 1) { restaurant.handlers.complain_wrong(c, {}, seg); return; }
      // "¿Qué es más rico, el poc chuc o la cochinita?": a question never orders
      if (/\?/.test(c.heard) && /^\W*(y\s+)?(que|cual|cuales|como|cuanto|cuanta|cuantos|donde|es|son|esta|estan|lleva|llevan|viene|vienen|pica|pican)\b/.test(fold(c.heard))) return;
      // "¿La horchata lleva leche?" / "¿El flan cuánto cuesta?": a question about the dish, not an order
      if (/\b(lleva|llevan|pica|pican|cuesta|cuestan|cuanto|trae carne|tiene carne)\b/.test(fold(c.heard)) && !/@?\b(me trae|nos trae|me da|nos da|quiero|quisiera|voy a querer)\b/.test(fold(c.heard))) return;
      const fresh = freshItems(c, toArr(slots.items?.item).map(fromSlot).filter(Boolean) as Item[]);
      if (!fresh.length) return;
      for (const it of fresh) if (it.cat === "main" && byId(it.id).attrs?.doneness) it.done = doneFromText(c.heard) ?? it.done;
      // "Sí, la cochinita" after "Ahorita paso su orden", "La arrachera término medio" at "¿En qué término…?": the same
      // dish said again (in an earlier turn) is that dish, never a second one on the bill; "otra", "una más", "también"
      // or another diner ("para ella") orders one more, and "Dos cochinitas" makes it two in all. At a table of two or
      // more a plain "La cochinita" may be the next diner's: only a "Sí, …" or the dish's own follow-up question
      // (término, side, which one) keeps it the same dish. After the meal is served a drink named again is another one.
      const h = fold(c.heard);
      const followUp = ["doneness", "side", "drink_kind", "food_kind"].includes(c.step ?? "");
      const more = /\b(otr[oa]s?|tambien|igual)\b|(?<!\bnada )\bmas\b|\bpara (el|ella|ellos|todos|mi (esposa|esposo|pareja|amig[oa]|hij[oa]|novi[oa]))\b/.test(h);
      const nextDiner = party(c) >= 2 && !followUp && !/^\W*(si|eso|exacto|correcto|asi es)\b/.test(h);
      const thisTurn: Item[] = (c as any).__uttItems ?? [];
      const list = fresh.filter((it) => {
        if (c.s.served || more) return true;
        const old = items(c).find((x) => x.id === it.id && x.cat === it.cat && !thisTurn.includes(x));
        if (!old || (nextDiner && it.qty <= 1)) return true;
        if (it.done) old.done = it.done;
        if (it.side) old.side = it.side;
        if (it.qty > old.qty) old.qty = it.qty;
        return false;
      });
      if (!list.length) { if (c.s.placed && !c.s.served) c.say("ack"); return; }
      addItems(c, list);
      if (!c.s.seated) {
        // A drink ordered at the host stand is the drink order: Lucía passes it on, and Luis brings it.
        if (list.some((i) => i.cat === "drink") && !drinks(c).some((d) => generic(d))) { c.s.drinksDone = true; c.s.drinksAcked = true; }
        if (!c.s.hostOrderSaid) { c.s.hostOrderSaid = true; c.say("host_order"); }
        return;
      }
      // After the meal: dessert, coffee or another drink.
      if (c.s.served) {
        if (drinks(c).some((d) => generic(d))) return; // "¿Americano o de olla?" first
        // "Otra limonada, por favor" during the meal: brought like any request, the check-back is answered
        if (!mealOver(c) && list.every((i) => i.cat === "drink")) {
          if (!c.s.cb && !c.s.fixing) c.s.cb = "request:drink"; else c.say("request_ok");
          return;
        }
        c.s.dessertOrdered = true; c.s.dessertDone = true; c.s.dessertAcked = false; c.s.dessertServed = false;
        return;
      }
      if (list.some((i) => i.cat === "drink") && !drinks(c).some((d) => generic(d))) c.s.drinksDone = true;
      const fd = list.filter((i) => i.cat !== "drink");
      if (!fd.length) return;
      if (c.s.placed) { c.say("ack_order"); return; }
      if (mains(c).some((m) => (needsDone(m) && !m.done) || (needsSide(m) && !m.side)) && c.chance(0.6)) c.say("ack_order");
    },
    order_unknown(c) { c.say("unknown_order"); c.say("menu_line"); },
    kind_ctx(c, _slots, seg) {
      const tags = seg.tags;
      const pib = food(c).find((i) => generic(i) === "pibil");
      if (pib && (tags.includes("chicken") || tags.includes("pork"))) { pib.id = tags.includes("chicken") ? "pollo_pibil" : "cochinita"; return; }
      const g = drinks(c).find((d) => generic(d));
      if (!g) return;
      const kind = generic(g);
      const still = tags.includes("still"), sparkling = tags.includes("sparkling");
      if (kind === "water" && (still || sparkling)) g.id = still ? "still_water" : "sparkling_water";
      else if (kind === "lemonade" && (still || sparkling)) g.id = still ? "lemonade_still" : "lemonade_soda";
      else if (kind === "soda" && tags.includes("diet")) g.id = "diet_coke";
      else if (kind === "coffee" && still) g.id = "americano";
      else if (tags.includes("any")) g.id = ({ water: "still_water", lemonade: "lemonade_still", soda: "coke", wine: "red_wine", fresca: "horchata", coffee: "americano" } as Record<string, string>)[kind ?? "water"] ?? g.id;
      else { c.say("which_item"); c.hold(); return; }
      if (!drinks(c).some((d) => generic(d)) && !c.s.served) c.s.drinksDone = true;
      if (c.s.served && !drinks(c).some((d) => generic(d))) { c.s.dessertOrdered = true; c.s.dessertDone = true; c.s.dessertAcked = false; c.s.dessertServed = false; }
    },
    ready_yes(c) { if (c.step === "order" || c.step === "drinks") c.s.readyNow = true; },
    need_time(c) { c.s.moreTime = true; sayP(c, "take_time"); c.hold(); },
    drinks_no(c) { if (!c.s.drinksDone) { c.s.drinksDone = true; c.say("no_problem"); } },
    more_no(c, slots, seg) {
      // "No, gracias, solo un café" once the meal is served (the check-back, the dessert, "¿Algo más?"): the coffee is
      // ordered (never "that's all")
      const named = dishOf(slots.dish);
      if (named && c.s.served && !items(c).some((i) => i.id === named)) {
        restaurant.handlers.order(c, { items: { item: { ...slots.dish, __tags: ["q1"] } } }, seg);
        return;
      }
      switch (c.step) {
        case "main_q": c.s.noMain = true; return;
        case "dessert": c.s.dessertDone = true; c.s.dessertDeclined = true; return;
        case "check": noMoreAtCheck(c); return;
        case "drinks": if (!c.s.drinksDone) { c.s.drinksDone = true; c.say("no_problem"); } return;
        case "checkback": case "checkback_soup": c.s.cb ??= "good"; return;
        case "soup_offer": c.s.soupOffer = false; return;
      }
    },
    its_ok(c) {
      // "No hay problema / está bien": accepting a wait, but a polite "no, thanks" to an offer.
      if (c.step === "wait") { waitAnswer(c, true); return; }
      if (c.step === "box" || c.step === "dessert" || c.step === "soup_offer") restaurant.steps.find((x) => x.id === c.step)?.no?.(c);
    },
    ask_menu(c, _slots, seg) {
      const tags = seg.tags;
      if (tags.includes("dessert")) { c.s.dessertMenu = true; if (c.s.box === undefined) c.s.askBox = false; c.say("dessert_list"); }
      else if (tags.includes("drinks") || tags.includes("wine")) c.say("drinks_list");
      else if (tags.includes("starters")) c.say("starters_list");
      else if (tags.includes("sides")) { c.say("side_list"); if (c.step === "side") c.hold(); }
      else if (tags.includes("mains")) c.say("mains_list");
      else if (c.step === "drinks" || c.step === "drink_kind") c.say("drinks_list");
      else if (c.step === "dessert" || c.step === "check") { c.s.dessertMenu = true; c.say("dessert_list"); }
      else { c.say("menu_line"); c.say("mains_list"); }
    },
    ask_specials(c) { c.s.specialsSaid = true; c.say("specials"); },
    ask_recommend(c, slots, seg) {
      const named = toArr(slots.dish).map(dishOf).filter(Boolean) as string[];
      if (named.length) {
        const pick = ["cochinita", "tikin_xic", "poc_chuc", "caballeros"].find((x) => named.includes(x));
        c.say(pick === "cochinita" ? "rec_cochinita" : pick === "tikin_xic" ? "rec_tikin" : pick === "poc_chuc" ? "rec_poc" : pick === "caballeros" ? "recommend_dessert" : "rec_any");
        return;
      }
      if (seg.tags.includes("dessert") || c.step === "dessert" || c.s.served) c.say("recommend_dessert");
      else c.say("recommend");
    },
    same(c) {
      const last = items(c).filter((i) => i.cat !== "side").at(-1);
      if (!last || c.s.placed) { c.say("which_item"); return; }
      // "Que sean dos" / "Dos de esos" makes it two (never three after "Dos cervezas"); "Lo mismo para mí" is one more
      last.qty = /\b(que sean|mejor) dos\b|\bdos de esos\b/.test(fold(c.heard)) ? Math.max(last.qty, 2) : last.qty + 1;
      c.say("ack");
    },
    qty_ctx(c, _slots, seg) {
      const n = seg.tags.includes("n1") ? 1 : seg.tags.includes("n3") ? 3 : seg.tags.includes("n4") ? 4 : 2;
      const pool = items(c).filter((i) => i.cat !== "side");
      const it = (n === 1 ? pool.filter((i) => i.qty > 1).at(-1) : undefined) ?? pool.at(-1);
      if (!it || c.s.served) { c.say("which_item"); return; }
      it.qty = n;
      c.say("ack");
    },
    ask_desc(c, slots) {
      const id = dishOf(slots.dish);
      if (!id) { c.say("which_item"); return; }
      c.s.mentioned = id;
      c.say((byId(id).attrs?.desc as string | undefined) ?? "desc_generic");
    },
    ask_spicy(c, slots, seg) {
      if (seg.tags.includes("salsa")) { c.say("spicy_yes"); return; }
      if (seg.tags.includes("nospicy")) { c.say("spicy_which"); return; }
      const id = dishOf(slots.dish) ?? lastDish(c);
      if (!id) { c.say("spicy_which"); return; }
      c.s.mentioned = id;
      c.say("spicy_no");
    },
    ask_comes(c, slots) {
      const id = dishOf(slots.dish) ?? lastDish(c);
      if (!id) { c.say("which_item"); return; }
      c.s.mentioned = id;
      const a = byId(id).attrs || {};
      c.say(a.side ? "comes_side" : a.comes === "tortillas" ? "comes_tortillas" : "comes_alone");
    },
    ask_veg(c, slots) {
      const id = dishOf(slots.dish) ?? (/\b(es|son|lleva|llevan|tiene|tienen)\b/.test(fold(c.heard)) && !/vegetarian[oa]s? (opciones|platillos)|\bsoy\b|\bsomos\b|\bhay\b|\btienen (algo|algun|platillos|opciones)/.test(fold(c.heard)) ? lastDish(c) : undefined);
      if (id && /\b(es|son|lleva|llevan|tiene|tienen)\b/.test(fold(c.heard))) {
        c.say(byId(id).attrs?.meat ? (byId(id).attrs?.plural ? "veg_no_pl" : "veg_no") : "veg_yes", { X: B(id) });
        return;
      }
      c.say("veg_list");
    },
    ask_allergy(c, slots, seg) {
      const tags = seg.tags;
      const id = dishOf(slots.dish) ?? (/\b(lleva|llevan|tiene|tienen|es|son)\b/.test(fold(c.heard)) ? lastDish(c) : undefined);
      if (tags.includes("nuts")) {
        c.s.allergy = "nuts";
        if (id) { c.say("allergy_check"); c.say(byId(id).attrs?.nuts ? "nuts_bad" : "nuts_ok"); }
        else c.say("nuts_general");
        return;
      }
      if (tags.includes("gluten")) { c.s.allergy = "gluten"; c.say("gluten_info"); return; }
      // "¿La horchata lleva leche?": a question about one dish; "Soy alérgico al huevo": noted
      if (dishOf(slots.dish) && /\b(lleva|llevan|tiene|tienen)\b/.test(fold(c.heard))) { c.say("allergy_check"); return; }
      c.say("allergy_noted");
    },
    ask_price(c, slots, seg) {
      const tags = seg.tags;
      // "¿Cuánto es el diez por ciento?" at the terminal: the tip answers it (tip_ctx)
      if (c.step === "tip" && /\bpor ciento\b|%/.test(fold(c.heard))) return;
      // "¿Cuánto es?" at an open offer gets that offer's price (rule 17)
      if (!slots.dish && c.step === "soup_offer") { c.say("price_is", { price: byId("sopa_lima").attrs!.price }); return; }
      // the to-go box and the factura cost nothing ("¿Cuesta algo la factura?")
      if (!slots.dish && (c.step === "box" || c.step === "factura" || (tags.includes("extra") && /\b(factura|recipiente|cajita|contenedor)\b/.test(fold(c.heard))))) { c.say("box_free"); return; }
      if (!slots.dish && tags.includes("extra")) { c.say("which_item"); return; } // "¿Tiene costo?" about something else
      // at Lucía's stand the bill is Luis's: "¡Claro! Se la traigo después de la cena" (the totals are voiced in his voice)
      if (!slots.dish && !c.s.seated && items(c).length && (tags.includes("all") || tags.includes("total"))) { c.say("check_later"); return; }
      // "¿Cuánto es todo?" at any time, "¿Cuánto es?" once the check is asked or on the table: the (one) total so far
      if (!slots.dish && items(c).length && c.s.split !== "separate" && (tags.includes("all") || c.s.checkBrought || (tags.includes("total") && (c.s.checkAsked || mealOver(c))))) {
        if (c.s.checkAsked || c.s.checkBrought) c.s.totalSaid = true;
        // the bill is Luis's, also after Lucía's goodbye, when she has the floor (the voice list: 1,186 clips in her voice)
        c.speaker("marco");
        c.say("total_is", { total: total(c) }); return;
      }
      if (!slots.dish && (tags.includes("total") || tags.includes("extra")) && !items(c).length) { c.say("which_item"); return; }
      const id = dishOf(slots.dish) ?? lastDish(c);
      if (!id) { c.say("which_item"); return; }
      // a kind not chosen yet ("¿Cuánto cuesta el agua?"): its price when every kind costs the same, else the plain
      // one's ("¿Cuánto cuesta el café?": an americano); "¿Cuál?" only for the pibil, which has no plain one
      const kinds = byId(id).attrs?.generic ? ALL.filter((e) => e.attrs?.family === byId(id).attrs!.generic) : [];
      const mixed = kinds.length > 0 && kinds.some((e) => e.attrs!.price !== kinds[0].attrs!.price);
      if (mixed && !byId(id).attrs?.price) { c.say("which_item"); return; }
      const qty = tags.includes("q4") ? 4 : tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1;
      c.s.mentioned = id;
      c.say("price_is", { price: ((((mixed ? undefined : kinds[0]) ?? byId(id)).attrs?.price as number | undefined) ?? 0) * qty });
    },
    ask_have(c, slots) {
      const th = slots.thing || {};
      const tags: string[] = th.__tags || [];
      if (tags.includes("winelist")) { c.say("have_yes"); c.say("drinks_list"); return; }
      if (tags.includes("gf")) { c.say("gluten_info"); return; }
      if (tags.includes("veg")) { c.say("veg_list"); return; }
      if (tags.includes("kids") || tags.includes("chair")) { c.say("have_yes"); return; }
      c.say(dishOf(th) ? "have_yes" : "have_no");
    },
    ask_have_unknown(c) { c.say("have_no"); c.say("menu_line"); },
    ask_restroom(c) { c.say("restroom"); },
    doneness_ans(c, slots, seg) {
      if ((c as any).__doneSet) return;
      (c as any).__doneSet = true;
      const steak = mains(c).find((m) => needsDone(m) && !m.done) ?? mains(c).find((m) => needsDone(m));
      if (!steak) { c.say("for_which"); c.hold(); return; }
      const said = doneFromText(c.heard);
      if (seg.tags.includes("neg")) { (c as any).__doneSet = false; c.say("doneness_options"); c.hold(); return; }
      if (seg.tags.includes("notwell") || seg.tags.includes("between")) steak.done = "medium";
      else if (seg.tags.includes("second")) steak.done = toArr(slots.doneness).at(-1) ?? said;
      else if (seg.tags.includes("notrare")) steak.done = said ?? (slots.doneness && slots.doneness !== "rare" ? slots.doneness : "medium");
      else steak.done = said ?? slots.doneness;
      if (c.chance(0.5)) c.say("doneness_ok", { X: steak.done });
    },
    side_ans(c, slots, seg) {
      if (seg.tags.includes("noside")) { const m0 = mains(c).find((x) => needsSide(x) && !x.side); if (m0) { m0.side = "none"; c.say("ack"); } return; }
      const side = (seg.tags.includes("second") ? toArr(slots.side).at(-1) : toArr(slots.side)[0]) as string;
      const m = mains(c).find((x) => needsSide(x) && !x.side);
      if (m) { m.side = side; return; }
      const withSide = mains(c).find((x) => needsSide(x));
      if (withSide) { if (withSide.side !== side) { withSide.side = side; c.say("side_changed"); } return; }
      if (!items(c).some((i) => i.id === side)) { items(c).push({ cat: "side", id: side, qty: 1 }); c.say("ack"); }
    },
    // --- During the meal
    all_good(c, _slots, seg) {
      if (!c.s.served) return;
      // asked once already: no complaint was made, so it's fine
      if (seg.tags.includes("amb")) { if (!c.s.cb) { if (c.s.ambAsked) c.s.cb = "good"; else { c.s.ambAsked = true; c.say("amb_food"); c.hold(); } } return; }
      const kind = seg.tags.includes("h:compliments") ? "compliments" : "good";
      if (!c.s.cb || (c.s.cb === "good" && kind === "compliments" && !c.s.enjoyed)) c.s.cb = kind;
    },
    all_good_ctx(c) { if (c.s.served && !c.s.cb) c.s.cb = "good"; },
    complain_cold(c, slots) {
      const id = dishOf(slots.dish) ?? soupItem(c)?.id ?? mainDish(c)?.id ?? food(c)[0]?.id;
      if (!c.s.served || !id) { c.say("no_problem"); return; }
      if (c.s.fixing) return;
      c.s.cb ??= "fix";
      c.s.fixing = id; c.s.fixKind = "cold";
    },
    complain_other(c, slots) {
      const id = dishOf(slots.dish) ?? mainDish(c)?.id ?? food(c)[0]?.id;
      if (!c.s.served || !id) { c.say("no_problem"); return; }
      if (c.s.fixing) return;
      c.s.cb ??= "fix";
      c.s.fixing = id; c.s.fixKind = "other";
    },
    complain_wrong(c, slots) {
      const main = mainDish(c);
      if (c.s.wrongPhase === 1) { c.s.wrongComplained = true; return; }
      if (c.s.wrongPhase) return; // already being fixed
      // "Pedí el tikin xic" while it is still on its way.
      const said = toArr(slots.dish).map(dishOf).find(Boolean) as string | undefined;
      if (!c.s.served && (said || main)) { c.say("ordered_coming"); return; }
      // "¿Esta es la cochinita?" / "Yo pedí la cochinita" with the cochinita in front of you: yes, it is
      if (c.s.served && main && said === main.id && !/\bno\b/.test(fold(c.heard))) { if (byId(main.id).attrs?.plural) c.say("its_yours_pl"); else c.say("its_yours", { X: B(main.id) }); return; }
      if (c.s.served && main && !c.s.fixing) { c.s.cb ??= "fix"; c.s.fixing = main.id; c.s.fixKind = "other"; return; }
      c.say("no_problem");
    },
    request(c, slots, seg) {
      const req = (slots.req as string | undefined) ?? (seg.tags.includes("water") ? "water" : seg.tags.includes("salsa") ? "salsa" : "other");
      if (c.s.served && !c.s.cb) { c.s.cb = "request:" + req; return; }
      c.say(requestLine(req));
    },
    box_ask(c) { if (!c.s.box) { c.s.box = true; c.say("box_ok"); } },
    dessert_no(c) {
      c.s.dessertDone = true;
      c.s.dessertDeclined = true;
      if (c.step === "check") noMoreAtCheck(c);
    },
    // --- Paying
    check_not_yet(c) {
      if (c.s.checkAsked) return;
      if (c.step === "check" || c.step === "dessert") {
        c.s.dessertDone = true;
        if (c.s.wheneverSaid) c.say("no_rush"); else { c.s.wheneverSaid = true; sayP(c, "check_whenever"); }
        c.hold();
      }
      else c.say("no_problem");
    },
    check_ask(c) {
      c.s.dessertDone = true;
      if (c.s.checkAsked) return;
      c.s.checkAsked = true;
      if (!c.s.served) c.say("check_later");
    },
    split_ans(c, _slots, seg) {
      if (c.s.split) return;
      if (seg.tags.includes("amb")) { c.say("amb_again"); c.say("ask_split"); c.hold(); return; }
      if (seg.tags.includes("separate") || seg.tags.includes("split")) { c.s.split = "separate"; c.say("split_sep_ok"); }
      else { c.s.split = "together"; if (party(c) >= 2) c.say("split_together_ok"); }
      if (!c.s.checkAsked) c.s.checkAsked = true;
    },
    pay_card(c) { if (!payTalk(c, "card")) choosePay(c, "card"); },
    pay_amb(c) { if (!c.s.payMethod) { c.say("amb_again"); sayP(c, "ask_pay_method"); c.hold(); } },
    pay_whatif(c, _slots, seg) { c.say(seg.tags.includes("dollars") ? "pay_dollars" : "pay_options"); },
    pay_phone(c) { if (!payTalk(c, "card")) choosePay(c, "card"); },
    pay_cash(c) { if (!payTalk(c, "cash")) choosePay(c, "cash"); },
    no_cash(c) { if (!payTalk(c, "card")) choosePay(c, "card"); },
    here_you_go(c, slots) {
      const amount = typeof slots.price === "number" ? (slots.price as number) : undefined;
      // "Aquí tiene 500 pesos": cash; before the check comes, it is counted when the check comes
      if (amount !== undefined && !c.s.payMethod) {
        choosePay(c, "cash");
        if (!c.s.payMethod && c.s.wantPay === "cash") { c.s.cashGiven = ((c.s.cashGiven as number | undefined) ?? 0) + amount; return; }
        if (c.s.payMethod !== "cash") return;
      }
      if (c.s.payMethod === "cash" && !c.s.paid) {
        // An amount is counted: short asks for the rest, exact needs no change (rule 18); one check for everybody only
        if (amount !== undefined && c.s.split !== "separate") {
          const given = ((c.s.cashGiven as number | undefined) ?? 0) + amount;
          const due = total(c);
          c.s.cashGiven = given;
          if (given < due) { (c as any).__shortSaid = true; c.say("cash_short", { total: due }); c.say("cash_missing", { price: due - given }); c.hold(); return; }
          if (keepsChange(c)) return; // "…, quédese con el cambio": keep_change, later in this turn, takes it as the tip
          if (given === due) { payCash(c); c.say("cash_exact"); return; }
        }
        if (keepsChange(c)) return;
        payCash(c); c.say("change_back"); return;
      }
      if (c.s.checkBrought && !c.s.payMethod) choosePay(c, "card");
    },
    // "¿Tiene cambio de quinientos?": yes; with the check on the table it means cash (nothing counted until it is handed over)
    change_q(c) {
      c.say("have_yes");
      if (c.s.checkBrought && !c.s.payMethod && !c.s.paid) choosePay(c, "cash");
    },
    want_change(c) {
      if (c.s.payMethod !== "cash" || c.s.paid) return;
      if (shortReminder(c)) return;
      payCash(c); c.say("change_back");
    },
    keep_change(c, slots, seg) {
      if (c.s.paid) return;
      // short of the total, there is no change to keep: the rest first (rule 18)
      if (c.s.payMethod === "cash" && shortReminder(c)) return;
      // "Así está bien" alone could also be a polite "that's all": Luis asks before he keeps anything (rule 17)
      if (seg.tags.includes("asi") && c.s.payMethod === "cash") {
        c.say("confirm_keep");
        c.expect({ id: "keep_confirm", hints: ["g_yesno", "change"], suggest: [{ lt: "Say yes or no", hint: "g_yesno" }], expects: ["keep_change"],
          yes: (cc) => { restaurant.handlers.keep_change(cc, {}, { intent: "keep_change", slots: {}, tags: [] } as any); },
          no: (cc) => { cc.s.paid = true; cc.complete(); cc.say("change_back"); cc.event("pay", { method: "cash" }); },
          ask: (cc) => cc.say("confirm_keep") });
        return;
      }
      if (c.s.payMethod === "card") { c.say("tip_screen"); c.hold(); return; }
      if (!c.s.checkBrought) { c.say("no_problem"); return; }
      c.s.payMethod = "cash"; c.s.paid = true; c.complete(); c.s.tip = true;
      c.event("pay", { method: "cash", tip: true });
      c.say("thanks_tip");
    },
    ask_tip(c, _slots, seg) { c.say(seg.tags.includes("how") ? "tip_normal_range" : "tip_included_no"); c.tip(TIPS.tipping); },
    tip_ctx(c, slots, seg) {
      if (c.s.payMethod !== "card" || c.s.paid) return;
      const nums = toArr(slots.number).map(Number);
      const n0 = (seg.tags.includes("second") ? nums.at(-1) : nums[0]) ?? 0;
      // "Cincuenta", "Cien", "No, quinientos" (no "por ciento"): above 30 a bare number is pesos, never 50 % (rule 20)
      const bigBare = !seg.tags.includes("pesos") && n0 > 30 && !/\bpor ciento\b|%/.test(fold(c.heard)) && !seg.tags.includes("howmuch")
        && !seg.tags.includes("q") && !/\?\s*$/.test(c.heard);
      if (bigBare) slots = { ...slots, price: n0 * 100 };
      const pesos = (seg.tags.includes("pesos") || bigBare) && typeof slots.price === "number";
      const n = pesos ? 0 : n0;
      // "¿Cuánto es el diez por ciento?": the amount, nothing paid (rule 11)
      if (seg.tags.includes("howmuch")) {
        if (n >= 1 && n <= 30) c.say("tip_amount", { amount: tipAmount(c, n) }); else c.say("tip_normal_range");
        c.hold(); return;
      }
      // "¿Es normal el diez?" is a question: answered, nothing paid; "¿Es mucho el quince?" gets "No, está bien"
      if (!pesos && (seg.tags.includes("q") || (seg.tags.includes("qok") && /\?\s*$/.test(c.heard)) || /\?\s*$/.test(c.heard))) {
        if (seg.tags.includes("much")) c.say(n >= 10 && n <= 15 ? "tip_fine" : "tip_normal_range");
        else c.say(n >= 10 && n <= 15 ? "tip_normal_yes" : "tip_normal_range"); // "¿Es normal el veinte?": the usual range, never "Sí"
        c.hold(); return;
      }
      if (!pesos && n > 30) { c.say("tip_normal_range"); c.hold(); return; }
      // "Póngale mil pesos" on a $270 check: Luis checks once (a misheard amount is not charged unasked); "Sí" charges
      // it, "No" asks again (never "no tip"), another amount is the tip
      if (pesos && (slots.price as number) > total(c) / 2 && !c.s.bigTipChecked) {
        const big = { pesos: (slots.price as number) / 100 };
        c.s.bigTipChecked = true; c.say("tip_big", { amount: slots.price as number });
        const on = (intent: string) => (cc: Ctx, sl: any, sg: any) => { restaurant.handlers[intent](cc, sl, sg); };
        c.expect({ id: "tip_big", hints: ["tip"], suggest: [{ lt: "Say yes, or give another amount", hint: "tip" }],
          yes: (cc) => { chargeTip(cc, big); },
          no: (cc) => { cc.say("tip_again"); cc.hold(); },
          on: { sure_ctx: (cc) => { chargeTip(cc, big); }, tip_ctx: on("tip_ctx"), tip_none: on("tip_none"), tip_none_ctx: on("tip_none"),
            pay_cash: on("pay_cash"), no_cash: on("no_cash"), pay_card: on("pay_card") },
          ask: (cc) => cc.say("tip_screen") });
        return;
      }
      chargeTip(c, pesos ? { pesos: (slots.price as number) / 100 } : n);
    },
    sure_ctx() { /* only inside the big-tip check (pending "tip_big") */ },
    tip_give(c) {
      if (c.s.paid) return;
      if (c.s.payMethod === "cash" && shortReminder(c)) return;
      c.s.tip = true;
      if (c.s.payMethod === "card") { c.say("tip_screen"); c.hold(); return; }
      if (c.s.payMethod) { c.s.paid = true; c.complete(); c.event("pay", { method: c.s.payMethod, tip: true }); }
      c.say("thanks_tip");
    },
    tip_none(c) {
      c.tip(TIPS.tipping);
      if (c.s.payMethod === "card" && !c.s.paid) chargeTip(c, 0);
    },
    tip_none_ctx(c, slots, seg) { restaurant.handlers.tip_none(c, slots, seg); },
    // "Un postre, por favor" at the dessert offer or at "¿Se le ofrece algo más?": the desserts, then "¿Cuál le traigo?"
    dessert_some_ctx(c) {
      if (c.s.dessertOrdered && !c.s.dessertServed) return;
      Object.assign(c.s, { askDessert: true, dessertDone: false, dessertDeclined: false, dessertMenu: true });
      if (c.s.box === undefined) c.s.askBox = false;
      c.say("dessert_list");
    },
    // "La propina se la dejo en efectivo": at the terminal the card pays the check alone; before, "¡Sí, claro!"
    tip_cash(c) {
      if (c.s.paid) return;
      if (c.s.payMethod === "card") { c.s.tip = "cash"; c.s.paid = true; c.complete(); c.event("pay", { method: "card", tip: "cash" }); c.say("tip_cash_ok"); return; }
      if (c.s.payMethod === "cash") { c.say("no_problem"); return; } // in cash the tip goes with the money anyway
      c.say("have_yes");
    },
    // "Sí, una" to the soup offer: the offer's own yes
    soup_yes_ctx(c) { if (c.step === "soup_offer") restaurant.steps.find((x) => x.id === "soup_offer")!.yes!(c); },
    factura_ask(c) {
      if (c.s.factura) { c.say("factura_yes"); return; }
      c.s.factura = true;
      if (c.s.checkBrought) c.say("factura_yes"); else c.say("no_problem");
    },
    factura_yes_ctx(c) { if (c.s.factura === undefined) { c.s.factura = true; c.say("factura_yes"); } },
    factura_no_ctx(c) { if (c.s.factura === undefined) { c.s.factura = false; c.say("factura_no"); } },
    // --- Changes of mind
    reject(c, slots) {
      const it = fromSlot(slots.item);
      // until the food is on the table, a change of mind still counts (the kitchen just got the order)
      if (c.s.served) {
        // "Ya no quiero el flan" before it comes: it is taken off the bill (and the dessert question is not asked again)
        const waiting = c.s.dessertOrdered && !c.s.dessertServed ? items(c).at(-1) : undefined;
        if (it && waiting && (waiting.id === it.id || generic(it) === family(waiting.id))) {
          items(c).pop();
          Object.assign(c.s, { dessertOrdered: false, dessertAcked: false, dessertServed: false, dessertDone: true });
          c.say("removed", { X: B(waiting.id) });
          return;
        }
        noProblemOnce(c); return;
      }
      // "No quiero papas" at "¿Con qué la acompaña?": the side question comes again
      if (c.step === "side" && it?.cat === "side") return;
      if (it) {
        const idx = items(c).findIndex((i) => i.id === it.id || (generic(i) && family(it.id) === generic(i)));
        if (idx >= 0) {
          items(c).splice(idx, 1);
          c.say("removed", { X: B(it.id) });
          if (!food(c).length && c.s.drinksDone) { sayP(c, "reject_ok"); c.hold(); }
          return;
        }
        // "No quiero cerveza" before anything was ordered: nothing to remove, the question stays open
        if (c.step === "drinks" || c.step === "dessert") { c.say("no_problem"); c.hold(); return; }
      }
      sayP(c, "reject_ok"); c.hold();
    },
    change(c, slots, seg) {
      const it = fromSlot(slots.item);
      // "Mejor un flan", "No, gracias, mejor un café" after the meal: the dessert (or coffee) is ordered or swapped
      if (it && dessertTime(c, it)) { dessertChange(c, undefined, it, slots.item, seg); return; }
      if (!it || c.s.served) { noProblemOnce(c); return; }
      const last = items(c).filter((i) => i.cat === it.cat).at(-1);
      if (last) { Object.assign(last, { ...it, done: it.done ?? doneFromText(c.heard) }); c.say("changed"); drinksSettled(c); return; }
      addItems(c, [it]);
      drinksSettled(c);
    },
    correction(c, slots, seg) {
      const raws = toArr(slots.item).filter((r) => fromSlot(r));
      const list = raws.map(fromSlot) as Item[];
      const txt = fold(c.heard);
      // "no la cochinita, (sino) el poc chuc" / "la cochinita no, el poc chuc" / "cámbieme la cochinita por el poc chuc":
      // the first is the wrong one; "el poc chuc en vez de la cochinita": the second, but "en vez de la cochinita, el
      // poc chuc": the first again; "dije el poc chuc": only the good one
      const enVez = /\ben (vez|lugar) de\b/.exec(txt);
      const [bad, good] = enVez ? (named(txt.slice(0, enVez.index), list[0]) ? [list[1], list[0]] : [list[0], list[1]])
        : /^\s*dije\b/.test(txt) ? [undefined, list[0]] : [list[0], list[1]];
      // "No el flan, el helado" after the meal: the dessert (or coffee) still to come is swapped
      if (good && dessertTime(c, good)) { dessertChange(c, bad, good, raws[list.indexOf(good)], seg); return; }
      if (c.s.served) { noProblemOnce(c); return; }
      if (bad) { const idx = items(c).findIndex((i) => i.id === bad.id); if (idx >= 0) items(c).splice(idx, 1); }
      if (good) {
        const same = items(c).filter((i) => i.cat === good.cat).at(-1);
        if (same && !bad) Object.assign(same, good); else addItems(c, [good]);
      }
      c.say("changed");
      drinksSettled(c);
    },
  },

  finish: (c) => {
    c.complete();
    const m = mainDish(c);
    if (m) c.remember({ lastMain: m.id });
    sayP(c, "bye_marco");
    if (c.chance(0.5)) { c.speaker("marco_host"); sayP(c, "bye_lucia"); }
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    // the host
    { say: "Buenas noches, tengo una reservación", intent: "resv_yes", step: "resv" },
    { say: "Tenemos una reservación a nombre de Miller", intent: "resv_yes", step: "resv", slots: { name: "Miller" } },
    { say: "Reservamos una mesa para las ocho", intent: "resv_yes", step: "resv" },
    { say: "No tenemos reservación", intent: "resv_no", step: "resv", not: ["resv_yes"] },
    { say: "No, no tenemos", intent: "resv_no_ctx", step: "resv" },
    { say: "Una mesa para dos, por favor", intent: "table_for", step: "resv", slots: { party: { number: 2 } } },
    { say: "¿Tenéis mesa para dos?", intent: "table_for", step: "resv" },
    { say: "A nombre de Miller", intent: "name_ctx", step: "resv_name", slots: { name: "Miller" } },
    { say: "Somos dos", intent: "party_ctx", step: "party" },
    { say: "Nada más yo", intent: "party_ctx", step: "party" },
    { say: "Mi esposa y yo", intent: "party_ctx", step: "party" },
    { say: "Sí, podemos esperar", intent: "wait_ok_ctx", step: "wait" },
    { say: "Lo siento, tenemos prisa", intent: "wait_no_ctx", step: "wait" },
    { say: "No queremos esperar", intent: "wait_no_ctx", step: "wait", not: ["wait_ok_ctx"] },
    { say: "En la terraza, por favor", intent: "seat_ans", step: "seatpref" },
    { say: "¿Podemos sentarnos junto a la ventana?", intent: "seat_req" },
    // drinks
    { say: "Una limonada, por favor", intent: "order", step: "drinks", slots: { items: { item: { drink: "lemonade" } } } },
    { say: "Voy a querer una horchata", intent: "order", step: "drinks", slots: { items: { item: { drink: "horchata" } } } },
    { say: "¿Me trae un agua de jamaica?", intent: "order", step: "drinks", slots: { items: { item: { drink: "jamaica" } } } },
    { say: "Quisiera un agua de chaya con piña", intent: "order", step: "drinks", slots: { items: { item: { drink: "chaya" } } } },
    { say: "Una copa de vino tinto", intent: "order", step: "drinks", slots: { items: { item: { drink: "red_wine" } } } },
    { say: "Ponme una cerveza", intent: "order", step: "drinks", slots: { items: { item: { drink: "beer" } } } },
    { say: "Una coca, por favor", intent: "order", step: "drinks", slots: { items: { item: { drink: "coke" } } } },
    { say: "Nada para mí, gracias", intent: "drinks_no", step: "drinks" },
    { say: "No quiero cerveza", intent: "reject", step: "drinks", not: ["order"] },
    { say: "¿Qué tienen de tomar?", intent: "ask_menu", step: "drinks" },
    // ordering
    { say: "Voy a querer la cochinita pibil, por favor", intent: "order", step: "order", slots: { items: { item: { main: "cochinita" } } } },
    { say: "Quisiera el poc chuc", intent: "order", step: "order", slots: { items: { item: { main: "poc_chuc" } } } },
    { say: "¿Me trae el tikin xic?", intent: "order", step: "order", slots: { items: { item: { main: "tikin_xic" } } } },
    { say: "Para mí, la arrachera término medio", intent: "order", step: "order", slots: { items: { item: { main: "arrachera" } } } },
    { say: "De entrada, la sopa de lima", intent: "order", step: "order", slots: { items: { item: { starter: "sopa_lima" } } } },
    { say: "¿Nos trae los panuchos para compartir?", intent: "order", step: "order", slots: { items: { item: { starter: "panuchos" } } } },
    { say: "Creo que voy a pedir los papadzules", intent: "order", step: "order", slots: { items: { item: { main: "papadzules" } } } },
    { say: "Lo mismo para mí", intent: "same", step: "order" },
    { say: "Sí, ya estamos listos", intent: "ready_yes", step: "order" },
    { say: "¿Nos da unos minutos más?", intent: "need_time", step: "order" },
    { say: "No estoy listo todavía", intent: "need_time", step: "order", not: ["ready_yes"] },
    { say: "No quiero la cochinita", intent: "reject", step: "order", not: ["order"] },
    { say: "No la cochinita, el poc chuc", intent: "correction", step: "order", not: ["order"] },
    { say: "Mejor el pollo pibil", intent: "change", step: "order" },
    { say: "Término medio", intent: "doneness_ans", step: "doneness", slots: { doneness: "medium" } },
    { say: "La quiero bien cocida", intent: "doneness_ans", step: "doneness", slots: { doneness: "well_done" } },
    { say: "Con arroz, por favor", intent: "side_ans", step: "side", slots: { side: "rice" } },
    { say: "Patatas fritas", intent: "side_ans", step: "side", slots: { side: "fries" } },
    // questions about the food
    { say: "¿Qué me recomienda?", intent: "ask_recommend" },
    { say: "¿Qué es el poc chuc?", intent: "ask_desc", slots: { dish: { main: "poc_chuc" } } },
    { say: "¿Pica?", intent: "ask_spicy" },
    { say: "¿Con qué viene la cochinita?", intent: "ask_comes" },
    { say: "¿Tienen algo vegetariano?", intent: "ask_veg" },
    { say: "No como carne", intent: "ask_veg", not: ["order"] },
    { say: "Soy alérgica a las nueces", intent: "ask_allergy" },
    { say: "¿Cuánto cuesta la arrachera?", intent: "ask_price" },
    { say: "¿Tienen algún especial hoy?", intent: "ask_specials" },
    { say: "¿Dónde está el baño?", intent: "ask_restroom" },
    { say: "¿Tienen hamburguesas?", intent: "ask_have_unknown" },
    // during the meal
    { say: "Disculpe, esto no es lo que pedí", intent: "complain_wrong" },
    { say: "Yo pedí la cochinita", intent: "complain_wrong", step: "serve_wrong", not: ["order"] },
    { say: "Perdón, yo no pedí esto", intent: "complain_wrong" },
    { say: "Todo está delicioso, gracias", intent: "all_good", step: "checkback" },
    { say: "¡Felicidades a la cocinera!", intent: "all_good", step: "checkback" },
    { say: "Mi sopa está fría", intent: "complain_cold", step: "checkback" },
    { say: "¿Me la puede calentar, por favor?", intent: "complain_cold", step: "checkback" },
    { say: "No está muy rico", intent: "complain_other", step: "checkback", not: ["all_good"] },
    { say: "¿Nos trae más tortillas?", intent: "request", step: "checkback" },
    { say: "¿Me lo pone para llevar?", intent: "box_ask" },
    { say: "No, gracias, estoy llena", intent: "dessert_no", step: "dessert" },
    { say: "Nada de postre", intent: "dessert_no", step: "dessert", not: ["order"] },
    { say: "Un flan, por favor", intent: "order", step: "dessert", slots: { items: { item: { dessert: "flan" } } } },
    // the check and paying
    { say: "La cuenta, por favor", intent: "check_ask", step: "check" },
    { say: "¿Me cobra, por favor?", intent: "check_ask", step: "check" },
    { say: "¿Me traes la cuenta?", intent: "check_ask", step: "check" },
    { say: "Todo junto, por favor", intent: "split_ans", step: "split" },
    { say: "Cuentas separadas", intent: "split_ans", step: "split" },
    { say: "No separada, junta", intent: "split_ans", step: "split" },
    { say: "Con tarjeta", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "¿Está incluida la propina?", intent: "ask_tip", step: "pay" },
    { say: "¿Puedo pagar con el móvil?", intent: "pay_phone", step: "pay" },
    { say: "El quince por ciento", intent: "tip_ctx", step: "tip", slots: { number: 15 } },
    { say: "Póngale cien pesos", intent: "tip_ctx", step: "tip" },
    { say: "Sin propina", intent: "tip_none", step: "tip", not: ["tip_ctx"] },
    { say: "Quédese con el cambio", intent: "keep_change", step: "change" },
    { say: "No necesito factura", intent: "factura_no_ctx", step: "factura", not: ["factura_yes_ctx"] },
    { say: "Sí, la necesito", intent: "factura_yes_ctx", step: "factura" },
    // meaning safety: corrections, questions and negations never order, pay or complain the wrong way
    { say: "No el quince, el diez", intent: "tip_ctx", step: "tip", not: ["tip_none"] },
    { say: "No con tarjeta", intent: "pay_amb", step: "pay", not: ["pay_card"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "Todavía no la cuenta", intent: "check_not_yet", step: "check", not: ["check_ask"] },
    { say: "No está salado", intent: "all_good", step: "checkback", not: ["complain_other"] },
    { say: "La cochinita no me gusta", intent: "reject", step: "order", not: ["order"] },
    { say: "¿Qué es más rico, el poc chuc o la cochinita?", intent: "ask_recommend", step: "order", not: ["order"] },
    { say: "No quiero dejar propina", intent: "tip_none", step: "tip", not: ["tip_ctx", "tip_give"] },
    { say: "No tenemos prisa", intent: "wait_ok_ctx", step: "wait", not: ["wait_no_ctx"] },
    { say: "¿Y si pago con tarjeta?", intent: "pay_whatif", step: "pay", not: ["pay_card"] },
    { say: "Roja no, término medio", intent: "doneness_ans", step: "doneness" },
    // the review's traps: questions never order, a refusal never pays, corrections in one answer
    { say: "No, gracias, mejor regresamos otro día", intent: "wait_no_ctx", step: "wait", not: ["wait_ok_ctx"] },
    { say: "No, gracias, ya estoy lleno", intent: "dessert_no", step: "dessert", not: ["order"] },
    { say: "Disculpe, yo pedí el poc chuc, no esto", intent: "complain_wrong", step: "serve_wrong", not: ["order"] },
    { say: "No quiero pagar con tarjeta", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "¿Cuánto se deja de propina?", intent: "ask_tip", step: "pay", not: ["tip_ctx"] },
    { say: "Cien pesos", intent: "tip_ctx", step: "tip", not: ["tip_none"] },
    { say: "¿La horchata lleva leche?", intent: "ask_allergy", step: "drinks", not: ["order"] },
    { say: "¿Cuánto cuesta el flan?", intent: "ask_price", step: "dessert", not: ["order"] },
    { say: "Una cerveza no, mejor una limonada", intent: "correction", step: "drinks", not: ["reject"] },
    { say: "No quiero cerveza, una limonada natural", intent: "correction", step: "drinks", not: ["order"] },
    { say: "¿Me da mi cambio, por favor?", intent: "want_change", step: "change", not: ["keep_change"] },
    { say: "¿Es mucho el quince por ciento?", intent: "tip_ctx", step: "tip", not: ["tip_none"] },
    // the lead's check: cash counted, a big tip checked, the other way at the terminal, the same dish said twice
    { say: "Tenga, doscientos pesos", intent: "here_you_go", step: "change", slots: { price: 20000 } },
    { say: "Le doy quinientos", intent: "here_you_go", step: "change", slots: { price: 50000 } },
    { say: "Ah, perdón, aquí tiene cien más", intent: "here_you_go", step: "change", slots: { price: 10000 } },
    { say: "Le dejo cincuenta de propina", intent: "tip_give", step: "change", not: ["here_you_go"] },
    { say: "No traigo más efectivo", intent: "no_cash", step: "change", not: ["pay_cash", "keep_change"] },
    { say: "Mejor con tarjeta", intent: "pay_card", step: "change", not: ["keep_change", "want_change"] },
    { say: "Mejor en efectivo", intent: "pay_cash", step: "tip", not: ["tip_ctx", "tip_none", "tip_none_ctx"] },
    { say: "Quiero dejar el diez por ciento", intent: "tip_ctx", step: "tip", slots: { number: 10 }, not: ["order_unknown"] },
    { say: "¿Cuánto es el diez por ciento?", intent: "tip_ctx", step: "tip", not: ["ask_price", "tip_none"] },
    { say: "¿Tiene cambio de quinientos?", intent: "change_q", step: "pay", not: ["here_you_go", "ask_have_unknown"] },
    { say: "¿Cuesta algo la factura?", intent: "ask_price", step: "factura", not: ["factura_ask", "factura_yes_ctx"] },
    { say: "No, mejor el poc chuc", intent: "change", step: "placed", not: ["reject", "order"] },
    { say: "Mejor una limonada natural", intent: "change", step: "drinks_ack", not: ["qty_ctx", "order"] },
    { say: "Ya no quiero la cerveza", intent: "reject", step: "drinks_ack", not: ["order"] },
    { say: "En vez de la cochinita, el poc chuc", intent: "correction", step: "placed", not: ["order"] },
    { say: "Cámbieme la cochinita por el poc chuc", intent: "correction", step: "placed", not: ["order"] },
    { say: "Perdón, solo una", intent: "qty_ctx", step: "placed", not: ["order", "party_ctx"] },
    { say: "¿Cuánto es todo?", intent: "ask_price", step: "placed", not: ["check_ask"] },
    { say: "Ni muy roja ni muy cocida", intent: "doneness_ans", step: "doneness" },
    { say: "Sí, una, por favor", intent: "soup_yes_ctx", step: "soup_offer" },
    { say: "No, mejor un flan", intent: "change", step: "dessert", not: ["dessert_no", "reject"] },
    { say: "No, gracias, mejor un café americano", intent: "change", step: "dessert", not: ["dessert_no", "more_no"] },
    // the 5 Nov audit: "Un postre" at the offer, the tip in cash, the habanero asked for, a price question never orders
    { say: "Un postre, por favor", intent: "dessert_some_ctx", step: "dessert", not: ["order", "dessert_no"] },
    { say: "Sí, un postre", intent: "dessert_some_ctx", step: "dessert" },
    { say: "No quiero postre", intent: "dessert_no", step: "dessert", not: ["dessert_some_ctx"] },
    { say: "La propina se la dejo en efectivo", intent: "tip_cash", step: "tip", not: ["tip_none", "tip_ctx", "pay_cash"] },
    { say: "¿Puedo dejar la propina en efectivo?", intent: "tip_cash", step: "tip", not: ["pay_cash"] },
    { say: "¿Hay chile habanero?", intent: "request", step: "checkback", not: ["ask_have_unknown"] },
    { say: "¿Cuánto cuesta el agua?", intent: "ask_price", step: "drinks", not: ["order"] },
    { say: "¿Qué es la chaya?", intent: "ask_desc", step: "drinks", not: ["order"] },
    { say: "Agua con gas", intent: "order", step: "drinks", slots: { items: { item: { drink: "sparkling_water" } } } },
    // Spain forms (correct answers too): vosotros, ponme, patatas, móvil, vale
    { say: "Vale, una limonada", intent: "order", step: "drinks" },
    // not understood
    { say: "La lavadora de mi tía es azul", intent: "none" },
    { say: "Mañana voy a la playa", intent: "none" },
    { say: "Miller", intent: "none" },
  ],

  sims: [
    { name: "reservation, cochinita, card and tip",
      turns: ["¡Buenas noches! Tengo una reservación para dos a las ocho.", "A nombre de Miller.", "Una limonada y una horchata, por favor.", "Natural, por favor.",
        "Voy a querer la cochinita pibil, por favor.", "La cuenta, por favor.", "Con tarjeta.", "El quince por ciento."],
      // the plain dinner: the complaint twists have their own sims
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "drink_kind", "order", "check", "pay", "tip"]), expect: { complete: true } },
    // the voice list (5 Nov 2026): a bill question after the goodbye is Luis's, also when Lucía said goodbye last
    { name: "the total asked after the goodbye is Luis's",
      turns: ["¡Buenas noches! Tengo una reservación para dos a las ocho.", "A nombre de Miller.", "Una limonada y una horchata, por favor.", "Natural, por favor.",
        "Voy a querer la cochinita pibil, por favor.", "La cuenta, por favor.", "Con tarjeta.", "El quince por ciento.", "Perdón, ¿cuánto fue en total?", "Gracias."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "drink_kind", "order", "check", "pay", "tip"]), expect: { complete: true } },
    { name: "walk-in, questions, arrachera with a side, dessert",
      turns: ["Hola, no tenemos reservación. ¿Tiene una mesa para dos junto a la ventana?", "¿Qué tienen de tomar?", "Solo agua, por favor.",
        "Mineral.", "¿Qué me recomienda?", "¿El poc chuc pica?", "Quisiera la arrachera, por favor.", "Tres cuartos.", "Con frijoles.",
        "Está riquísimo. ¡Felicidades a la cocinera!", "¿Nos trae la carta de postres?", "Los caballeros pobres, por favor.", "¿Nos trae la cuenta?",
        "Separado, por favor.", "¿Está incluida la propina?", "Con tarjeta.", "Diez por ciento."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; s.askDessert = true; s.askSplit = true; },
      auto: omit(AUTO, ["resv", "drinks", "drink_kind", "order", "doneness", "side", "check", "split", "pay", "tip"]), expect: { complete: true } },
    { name: "wrong dish (twist), then cash",
      turns: ["Buenas noches, tenemos una reservación a nombre de Miller.", "Nada por ahora, gracias.", "Quisiera la sopa de lima y el tikin xic.",
        "Con arroz.", "Disculpe, esto no es lo que pedí. Yo pedí el tikin xic.", "No hay problema.", "La sopa está fría. ¿Me la puede calentar?", "No pasa nada.",
        "En efectivo.", "Quédese con el cambio."],
      // the wrong-dish twist on every seed; the cold soup is the learner's own complaint at the check-back
      setup: (s) => { s.wrongTwist = true; s.soupTwist = false; s.facturaTwist = false; s.askSplit = true; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "side", "pay", "change"]), expect: { complete: true, state: { split: "together" } } },
    { name: "cold soup twist: soup offered, warmed up",
      turns: ["Buenas noches, tenemos una reservación a nombre de Miller.", "Un agua de jamaica, por favor.", "Voy a querer los papadzules.", "Sí, por favor.",
        "Está un poco fría.", "Nada más la cuenta, gracias.", "Con tarjeta, por favor.", "Quince por ciento."],
      setup: (s) => { s.soupTwist = true; s.wrongTwist = false; s.facturaTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "soup_offer", "checkback_soup", "check", "pay", "tip"]), expect: { complete: true } },
    { name: "factura twist and short answers",
      turns: ["Mesa para uno.", "Adentro.", "Una limonada.", "Mineral.", "El pibil.", "De pollo.", "Muy rico.", "No, gracias.", "La cuenta.", "Tarjeta.",
        "No, gracias.", "Diez por ciento."],
      setup: (s) => { s.facturaTwist = true; s.wrongTwist = false; s.soupTwist = false; s.waitTwist = false; s.askSeat = true; s.askDessert = true; s.askBox = false; },
      auto: omit(AUTO, ["party", "seatpref", "drinks", "drink_kind", "order", "food_kind", "checkback", "dessert", "check", "pay", "factura", "tip"]),
      expect: { complete: true, state: { party: 1, factura: false } } },
    { name: "walk-in with a wait (twist), party of three",
      turns: ["Buenas noches.", "No, no tenemos.", "Somos tres.", "¿Cuánto tiempo hay que esperar?", "Sí, podemos esperar.", "Afuera, por favor.", "Tres horchatas, por favor.",
        "Quisiera los salbutes y el pollo pibil.", "Todo muy rico, gracias.", "No, gracias, estamos llenos.", "La cuenta, por favor.", "Todo junto.", "En efectivo.", "¡Gracias!"],
      setup: (s) => { s.waitTwist = true; s.askSeat = true; s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.askDessert = true; s.askBox = false; s.askSplit = true; s.hay = false; },
      auto: omit(AUTO, ["resv", "party", "wait", "seatpref", "drinks", "order", "checkback", "dessert", "check", "split", "pay"]),
      expect: { complete: true, state: { party: 3, seatPref: "patio", split: "together", paid: true } } },
    { name: "changes of mind and Spain forms",
      turns: ["Hola, buenas noches.", "No, no tengo.", "Nada más yo.", "Ponme una cerveza.", "Todavía estoy viendo el menú.", "Ya estoy listo. Quiero el poc chuc.",
        "Mejor no, no quiero el poc chuc.", "¿Me trae la cochinita en vez de eso?", "Vale, la cuenta, por favor.", "¿Puedo pagar con el móvil?", "El quince por ciento", "¡Adiós!"],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "party", "drinks", "order", "side", "check", "pay", "tip"]), expect: { complete: true, state: { items: { 1: { id: "cochinita" } } } } },
    // the review's money checks: the soup's own price at its offer, cash short of the total asks for the rest
    { name: "the soup's price, then cash in two parts",
      turns: ["Buenas noches, tenemos una reservación a nombre de Miller.", "Nada por ahora, gracias.", "Quiero la cochinita.", "¿Cuánto es?", "No, gracias.",
        "La cuenta, por favor.", "Aquí tiene cien pesos.", "Aquí tiene doscientos."],
      setup: (s) => { s.soupTwist = true; s.wrongTwist = false; s.facturaTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "soup_offer", "check", "pay", "change"]),
      expect: { complete: true, state: { soupOffer: false, paid: true, payMethod: "cash", cashGiven: 30000 } } },
    { name: "tip questions and an amount in pesos",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "Quiero el pollo pibil.", "La cuenta, por favor.", "Con tarjeta.", "¿Cuánto se deja?", "¿Es mucho el quince?",
        "Póngale mil pesos.", "Cien pesos."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "check", "pay", "tip"]), expect: { complete: true, state: { party: 1, tip: { pesos: 100 } } } },
    // the lead's check: a big tip is charged only on a yes, and a "No" asks again (never "no tip")
    { name: "a big tip, confirmed",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "Quiero el pollo pibil.", "La cuenta, por favor.", "Con tarjeta.", "Póngale quinientos pesos.", "Sí, estoy seguro."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "check", "pay", "tip"]), expect: { complete: true, state: { party: 1, tip: { pesos: 500 }, paid: true } } },
    { name: "a big tip, then no: asked again",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "Quiero el pollo pibil.", "La cuenta, por favor.", "Con tarjeta.", "Póngale mil pesos.", "No.", "Quince por ciento."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "check", "pay", "tip"]), expect: { complete: true, state: { tip: 15, paid: true } } },
    // cash short of the total: the rest first, whatever else is said; then the change is kept as the tip
    { name: "cash short, the rest, keep the change",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "Quiero el pollo pibil.", "La cuenta, por favor.", "En efectivo.", "Tenga, doscientos pesos.",
        "Quédese con el cambio.", "Ah, perdón. Le doy cincuenta más, quédese con el cambio."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "check", "pay", "change"]), expect: { complete: true, state: { paid: true, tip: true, cashGiven: 25000 } } },
    // one beer instead of two; the steak named again at its término and after the order is the same steak
    { name: "one instead of two, the same dish said again",
      turns: ["Mesa para uno.", "Dos cervezas.", "Perdón, solo una.", "La arrachera.", "La arrachera término medio.", "Con papas.", "Sí, la arrachera, gracias.",
        "La cuenta, por favor.", "Con tarjeta.", "El diez por ciento."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "drinks_ack", "order", "doneness", "side", "placed", "check", "pay", "tip"]),
      expect: { complete: true, state: { items: { length: 2, 0: { id: "beer", qty: 1 }, 1: { id: "arrachera", qty: 1, done: "medium", side: "fries" } }, tip: 10 } } },
    // "No, mejor…" and "Cámbieme… por…" change the order; "No, gracias, solo un café" orders the coffee
    { name: "changes after ordering, a coffee instead of dessert",
      turns: ["Mesa para uno.", "Una cerveza.", "No, mejor una limonada natural.", "Quiero la cochinita.", "Cámbieme la cochinita por el poc chuc.", "Con arroz.",
        "Todo muy rico.", "No, gracias, solo un café americano.", "La cuenta, por favor.", "En efectivo.", "Aquí tiene quinientos, quédese con el cambio."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; s.askDessert = true; },
      auto: omit(AUTO, ["resv", "drinks", "drinks_ack", "order", "placed", "side", "checkback", "dessert", "check", "pay", "change"]),
      expect: { complete: true, state: { items: { length: 3, 0: { id: "lemonade_still" }, 1: { id: "poc_chuc", side: "rice" }, 2: { id: "americano" } }, paid: true, tip: true, cashGiven: 50000 } } },
    // a dessert swapped before it comes: the bill has the new one only
    { name: "a dessert swapped before it comes",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "Quiero el pollo pibil.", "Todo muy rico.", "¿Este es el pollo pibil?", "Un flan.", "No el flan, el helado.", "La cuenta, por favor.",
        "Con tarjeta.", "Diez por ciento."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; s.facturaTwist = false; s.waitTwist = false; s.askDessert = true; },
      auto: omit(AUTO, ["resv", "drinks", "order", "checkback", "dessert", "dessert_ack", "check", "pay", "tip"]),
      expect: { complete: true, state: { items: { length: 3, 2: { id: "helado" } }, tip: 10, paid: true } } },
    // the 5 Nov audit: the side questions at the table get Luis's answers (and his voice in the line list), a dish not on
    // the menu, the card asked about while ordering (no check, the dessert still offered), "Un postre" at the offer, the
    // factura free, a comma lost twice, the ten percent worked out, the tip left in cash
    { name: "side questions at the table",
      turns: ["Buenas noches, una mesa para dos, por favor.", "¿Dónde está el baño?", "¿Qué es la chaya?", "¿Aceptan tarjeta?", "¿Tienen hamburguesas?", "Quiero una hamburguesa.",
        "Dos aguas de chaya, por favor.", "¿Nos da unos minutos?", "¿Qué es el poc chuc?", "¿Con qué viene la cochinita?", "¿Los panuchos vienen con algo?",
        "No como nada picante.", "¿El flan lleva nueces?", "¿Los caballeros pobres llevan nueces?", "Soy alérgico a las nueces.", "¿El tikin xic es sin gluten?",
        "La arrachera y el poc chuc, por favor.", "Término medio.", "Con arroz.", "Con frijoles.", "Más salsa, por favor.",
        "Un postre, por favor.", "El flan.", "La cuenta, por favor.", "No separado.", "Todo junto.", "No con tarjeta.", "¿Y si pago con tarjeta?", "Con tarjeta.",
        "¿Cuesta algo la factura?", "No, gracias.", "¿Cuánto es el diez por ciento?", "La propina se la dejo en efectivo."],
      setup: (s) => { Object.assign(s, { wrongTwist: false, soupTwist: false, facturaTwist: true, waitTwist: false, askSeat: false, hay: false, specials: false, askBox: false, askDessert: true, askSplit: true }); },
      auto: omit(AUTO, ["resv", "drinks", "order", "doneness", "side", "checkback", "dessert", "check", "split", "pay", "factura", "tip"]),
      expect: { complete: true, state: { party: 2, split: "together", factura: false, tip: "cash", paid: true,
        items: { length: 4, 0: { id: "chaya", qty: 2 }, 1: { id: "arrachera", done: "medium", side: "rice" }, 2: { id: "poc_chuc", side: "beans" }, 3: { id: "flan" } } } } },
    { name: "a full table: the fifteen percent worked out",
      turns: ["Buenas noches, tenemos una reservación a nombre de Miller para cuatro.", "Cuatro cervezas, por favor.", "Cuatro arracheras término medio con papas.",
        "La cuenta, por favor.", "Todo junto.", "Con tarjeta.", "¿Cuánto es el quince por ciento?", "Está bien, el quince por ciento."],
      setup: (s) => { Object.assign(s, { wrongTwist: false, soupTwist: false, facturaTwist: false, waitTwist: false, askSeat: false, askBox: false, askDessert: false, askSplit: true }); },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "check", "split", "pay", "tip"]),
      expect: { complete: true, state: { party: 4, tip: 15, paid: true, items: { length: 2, 0: { id: "beer", qty: 4 }, 1: { id: "arrachera", qty: 4, done: "medium", side: "fries" } } } } },
    { name: "the card asked about while ordering, no more at the end, the tip in cash",
      turns: ["Mesa para uno.", "Una horchata, por favor.", "¿Aceptan tarjeta?", "Quiero los papadzules.", "Todo muy rico.",
        "No, gracias.", "La cuenta, por favor.", "Con tarjeta.", "La propina se la dejo en efectivo."],
      setup: (s) => { Object.assign(s, { wrongTwist: false, soupTwist: false, facturaTwist: false, waitTwist: false, askSeat: false, askBox: false, askDessert: false }); },
      auto: omit(AUTO, ["resv", "drinks", "order", "checkback", "check", "pay", "tip"]),
      expect: { complete: true, state: { wheneverSaid: true, checkAsked: true, tip: "cash", paid: true, payMethod: "card" } } },
  ],
};

/** "Para cuatro" / "Sí, para dos" is a party, not a clock time: a time says "las cuatro", "la una" or "4:00" (rule 4).
 *  The number itself is looked for, so "Reservamos para cuatro a las 8:30" is four people at 8:30. */
const NUM_WORDS = ["", "una|uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece",
  "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte"];
function timeIsParty(c: Ctx, slots: any): boolean {
  const t0 = slots.time as { h?: number; m?: number } | undefined;
  const h = t0?.h ?? 0;
  if (!t0 || slots.party || t0.m || h < 1 || h > 20) return false;
  return !new RegExp(`\\b(las|la) (${NUM_WORDS[h]}|${h})\\b|\\b${h}:\\d`).test(fold(c.heard));
}

/** Is a dish named in this piece of text? (its Spanish name or one of its forms) */
function named(txt: string, it: Item | undefined): boolean {
  if (!it) return false;
  const e = byId(it.id);
  return [e.en.split(" | ").join(" "), ...(e.forms || [])].map(fold)
    .some((f) => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\b`).test(txt));
}

// --- Cash: what was handed over, counted against the one check (separate checks are each guest's own business)
const counted = (c: Ctx) => typeof c.s.cashGiven === "number" && c.s.split !== "separate";
const cashShort = (c: Ctx) => counted(c) && (c.s.cashGiven as number) < total(c);
/** "…, quédese con el cambio" in the same turn as the money: keep_change takes the change as the tip. */
const keepsChange = (c: Ctx) => /\b(quedese|quedate) con (el|su) cambio\b|\bel cambio es para (usted|ti)\b|\bno (necesito|quiero) (el |mi |su )?cambio\b/.test(fold(c.heard));
function payCash(c: Ctx) { c.s.paid = true; c.complete(); c.event("pay", { method: "cash" }); }
/** Short of the total: "Todavía faltan $35" (once a turn: here_you_go may have just said it). */
function shortReminder(c: Ctx): boolean {
  if (!cashShort(c)) return false;
  if (!(c as any).__shortSaid) { (c as any).__shortSaid = true; c.say("cash_still", { price: total(c) - (c.s.cashGiven as number) }); }
  c.hold();
  return true;
}

// --- Card: the tip is the last step
function chargeTip(c: Ctx, tip: number | { pesos: number }) {
  c.s.tip = tip; c.s.paid = true; c.complete();
  c.event("pay", { method: "card", tip });
  c.say((typeof tip === "number" ? tip : tip.pesos) > 0 ? "tip_thanks" : "tip_none_ok");
  if (typeof tip === "number" && tip < 10) c.tip(TIPS.tipping);
}
/** n % of the check, said as "como $35": whole pesos up to $200, then the nearest $5 (the amount list). */
const tipAmount = (c: Ctx, n: number) => {
  const p = Math.max(1, Math.round((total(c) * n) / 10000));
  return (p <= 200 ? p : Math.round(p / 5) * 5) * 100;
};

function partyOf(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v.number === "number" && v.number > 0 && v.number <= 20) return v.number;
  const tags: string[] = v.__tags || [];
  if (tags.includes("p1")) return 1;
  if (tags.includes("p2")) return 2;
  return undefined;
}

function waitAnswer(c: Ctx, ok: boolean) {
  if (c.s.waitOk !== undefined) return; // already answered: the wait step moves on
  c.s.waitOk = ok;
  if (ok) { c.say("wait_ok"); c.hold(); return; }
  c.s.waitDone = true;
  c.say("table_opened");
}

function seatPref(c: Ctx, tags: string[]) {
  if (c.s.seated) { if (tags.includes("window") && !c.s.seatPref) { c.s.seatPref = "window"; c.say("seat_window_full"); } return; }
  if (c.s.seatPref) return;
  if (tags.includes("window")) {
    c.s.seatPref = "window";
    if (c.s.resv === false && c.s.waitTwist && c.s.waitOk === undefined) c.say("seat_can_do"); // a window table after the wait
    else if (c.s.windowFull) { c.twist("window_full"); c.say("seat_window_full"); }
    else c.say("seat_window_ok");
    return;
  }
  if (tags.includes("patio")) { c.s.seatPref = "patio"; c.say("seat_patio_ok"); return; }
  if (tags.includes("quiet")) { c.s.seatPref = "quiet"; c.say("seat_quiet_ok"); return; }
  c.s.seatPref = tags.includes("inside") ? "inside" : "any";
  c.say("seat_any_ok");
}

/** "it" = the dish the learner last asked about, or the last dish ordered. */
function lastDish(c: Ctx): string | undefined {
  if (c.s.mentioned) return c.s.mentioned;
  const f = food(c);
  return f.length ? f[f.length - 1].id : undefined;
}

/** A complaint twist is on the table: the wrong dish was served, or the cold soup is being asked about. */
const twistShown = (c: Ctx) => !!c.s.wrongPhase || (!!c.s.soupTwist && !!soupItem(c) && !!c.s.served);
const twistSettled = (c: Ctx) =>
  (!c.s.wrongPhase || c.s.wrongPhase >= 2) && (!(c.s.soupTwist && soupItem(c) && c.s.served) || !!c.s.cb);

const mealOver = (c: Ctx) => !!c.s.enjoyed || (c.s.fixPhase ?? 0) >= 2;
const needSplit = (c: Ctx) => party(c) >= 2 && !!c.s.askSplit && c.s.split === undefined && !c.s.payMethod;
const needFactura = (c: Ctx) => !!c.s.facturaTwist && !!c.s.payMethod && c.s.factura === undefined && !c.s.paid;

/** A drink named in a change or a correction is the drink order (a generic one is asked about first). */
function drinksSettled(c: Ctx) {
  if (c.s.seated && !c.s.served && drinks(c).length && !drinks(c).some((d) => generic(d))) c.s.drinksDone = true;
}

/** After the meal (or once a dessert is ordered) and before the dessert or the coffee comes, a change of mind about
 *  it still counts. */
const dessertTime = (c: Ctx, it: Item) => !!c.s.served && (mealOver(c) || !!c.s.dessertOrdered) && !c.s.dessertServed && (it.cat === "dessert" || it.cat === "drink");

/** At dessert time: the dessert ordered last and not served yet is swapped for the new one; with none, it is ordered. */
function dessertChange(c: Ctx, bad: Item | undefined, good: Item, goodSlot: any, seg: any) {
  const waiting = c.s.dessertOrdered && !c.s.dessertServed ? items(c).at(-1) : undefined;
  if (waiting && (waiting.cat === "dessert" || waiting.cat === "drink") && (!bad || bad.id === waiting.id)) {
    Object.assign(waiting, { ...good, qty: waiting.qty, bare: false });
    c.say("changed");
    return;
  }
  restaurant.handlers.order(c, { items: { item: { ...goodSlot, __tags: goodSlot?.__tags?.length ? goodSlot.__tags : ["q1"] } } }, seg);
}

/** "No hay problema" once per turn, when two pieces of one answer (a reject and a change) reach it. */
function noProblemOnce(c: Ctx) {
  if ((c as any).__noProblem) return;
  (c as any).__noProblem = true;
  c.say("no_problem");
}

function requestLine(req: string): string {
  return req === "tortillas" ? "tortillas_ok" : req === "water" ? "water_ok" : "request_ok";
}

/** "¿Aceptan tarjeta?" ("¡Sí, claro!"), "No traigo efectivo" ("No hay problema") while ordering or eating: answered, and
 *  a way said plainly is kept for the check, nothing more: the check comes only when it is asked for, and the dessert
 *  is still offered (the brief). */
function payTalk(c: Ctx, method: "card" | "cash"): boolean {
  if (c.s.payMethod || c.s.checkBrought || c.s.checkAsked || mealOver(c)) return false;
  if ((c as any).__payTalk) return true; // "No traigo efectivo, ¿puedo pagar con tarjeta?": one answer
  (c as any).__payTalk = true;
  const question = /\?/.test(c.heard) || /^\W*(acepta|aceptan|reciben|toman|puedo|podemos|se puede)\b/.test(fold(c.heard));
  c.say(question ? "have_yes" : "no_problem");
  if (!question) c.s.wantPay = method;
  return true;
}

/** "No, gracias" / "Es todo" at "¿Se le ofrece algo más?": the waiter never brings the check unasked (the brief), so
 *  first "Cuando quiera la cuenta, nada más me dice"; a second no brings it. */
function noMoreAtCheck(c: Ctx) {
  if (!c.s.wheneverSaid) { c.s.wheneverSaid = true; c.s.dessertDone = true; sayP(c, "check_whenever"); c.hold(); return; }
  c.s.checkAsked = true;
}

function choosePay(c: Ctx, method: "card" | "cash") {
  if (c.s.payMethod) {
    // "Mejor en efectivo" at the terminal, "Mejor con tarjeta" before the change: nothing is paid yet, so the other
    // way is still open (rule 18); the tip or the change step takes it from there
    if (c.s.payMethod !== method && !c.s.paid && c.s.checkBrought) {
      c.s.payMethod = method; c.s.readerSaid = false; c.s.changeOffered = false; c.s.cashGiven = undefined;
      c.say("no_problem");
    }
    return;
  }
  if (!c.s.checkBrought) {
    // Once the check was asked for (or after the meal: payTalk answers before), "¿Puedo pagar con tarjeta?" is the way
    // to pay: "Claro, le traigo la terminal" while the meal or the check is on its way; after the meal "Ahorita se la
    // traigo" answers it.
    if (!c.s.wantPay && (!mealOver(c) || c.s.checkComing)) c.say(method === "card" ? "card_ok" : "no_problem");
    c.s.wantPay = method; c.s.checkAsked = true; c.s.dessertDone = true;
    return;
  }
  c.s.payMethod = method;
}

export default restaurant;
